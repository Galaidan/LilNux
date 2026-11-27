/* Colonel Kernel — pure game rules. Functions mutate the state passed in. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});
  const W = () => CK.World;

  const BLOCKING = { problem: 1, circuit: 1, boss: 1 };
  const REWARDS = { clean: [15, 15], fight: [10, 20], boss: [50, 60], memory: [0, 5], region: [30, 100], puzzle: [10, 10] };

  function stats(state) {
    const s = { slots: 2, cdMul: 1, heatMul: 1, travelMul: 1, sight: 1 };
    for (const id of state.modules) {
      const m = W().MODULES[id]; if (!m) continue;
      if (m.slots) s.slots += m.slots;
      if (m.cdMul) s.cdMul *= m.cdMul;
      if (m.heatMul) s.heatMul *= m.heatMul;
      if (m.travelMul) s.travelMul *= m.travelMul;
    }
    return s;
  }

  const region = (id) => W().REGIONS.find((r) => r.id === id);
  const cur = (state) => region(state.region);
  function neighbors(reg, nodeId) {
    const out = [];
    for (const [a, b] of reg.edges) { if (a === nodeId) out.push(b); else if (b === nodeId) out.push(a); }
    return out;
  }
  const explored = (state) => (state.explored[state.region] = state.explored[state.region] || []);
  const clearedList = (state) => (state.cleared[state.region] = state.cleared[state.region] || []);

  function isCleared(state, nodeId) {
    const node = cur(state).nodes[nodeId];
    if (node && node.kind === 'start') return true;
    return clearedList(state).includes(nodeId);
  }
  function clear(state, nodeId) { if (!clearedList(state).includes(nodeId)) clearedList(state).push(nodeId); }

  function reveal(state, nodeId, radius) {
    if (radius === undefined) radius = stats(state).sight;
    const reg = cur(state); const ex = explored(state); const added = [];
    const add = (id) => { if (!ex.includes(id)) { ex.push(id); added.push(id); } };
    add(nodeId);
    let frontier = [nodeId]; const seen = new Set(frontier);
    for (let d = 0; d < radius; d++) {
      const next = [];
      for (const id of frontier) for (const nb of neighbors(reg, id)) {
        if (seen.has(nb)) continue; seen.add(nb);
        if (reg.nodes[nb].hidden && !ex.includes(nb)) continue;
        add(nb); next.push(nb);
      }
      frontier = next;
    }
    return added;
  }

  // Reveal every (non-hidden) node in a room — entering a room lets you see all of it.
  function revealRoom(state, roomId) {
    const reg = cur(state); const ex = explored(state); const added = [];
    if (!roomId) return added;
    for (const id of Object.keys(reg.nodes)) {
      const nd = reg.nodes[id];
      if (nd.room === roomId && (!nd.hidden || ex.includes(id)) && !ex.includes(id)) { ex.push(id); added.push(id); }
    }
    return added;
  }

  // Doors: where a path crosses from one room into another (the middle of the gap between the rooms).
  function doors(reg) {
    const out = [];
    for (const [a, b] of reg.edges) {
      const A = reg.nodes[a]; const B = reg.nodes[b];
      if (!A.room || !B.room || A.room === B.room) continue;
      const ra = reg.rooms.find((r) => r.id === A.room); const rb = reg.rooms.find((r) => r.id === B.room);
      let x = (A.x + B.x) / 2; let y = (A.y + B.y) / 2;
      if (A.y === B.y) { const [l, r] = A.x < B.x ? [ra, rb] : [rb, ra]; x = (l.x + l.w + r.x) / 2; }
      else if (A.x === B.x) { const [t, bo] = A.y < B.y ? [ra, rb] : [rb, ra]; y = (t.y + t.h + bo.y) / 2; }
      out.push({ a, b, x, y, from: A.room, to: B.room });
    }
    return out;
  }
  function distFromStart(reg) {
    const d = { [reg.start]: 0 }; const q = [reg.start];
    while (q.length) { const n = q.shift(); for (const nb of neighbors(reg, n)) if (!(nb in d)) { d[nb] = d[n] + 1; q.push(nb); } }
    return d;
  }
  // A door is locked while the node on its near side (closer to the start) is an unfinished problem/circuit/boss.
  function doorLock(state, door) {
    const reg = cur(state); const d = distFromStart(reg);
    const near = (d[door.a] || 0) <= (d[door.b] || 0) ? door.a : door.b;
    return BLOCKING[reg.nodes[near].kind] && !isCleared(state, near) ? near : null;
  }

  // Auto-path: route through visible places. In-between stops must be visited/cleared; the last stop may be new.
  function path(state, to) {
    const reg = cur(state); const ex = explored(state);
    if (!reg.nodes[to] || !ex.includes(to)) return { reason: 'fog' };
    if (to === state.node) return { path: [] };
    const here = reg.nodes[state.node];
    const stuck = BLOCKING[here.kind] && !isCleared(state, state.node);
    const prev = { [state.node]: null }; const q = [state.node]; let lock = null;
    while (q.length) {
      const n = q.shift();
      for (const nb of neighbors(reg, n)) {
        if (nb in prev || !ex.includes(nb)) continue;
        if (n === state.node && stuck && nb !== state.prev) { lock = lock || state.node; continue; }
        if (n !== state.node && BLOCKING[reg.nodes[n].kind] && !isCleared(state, n)) continue;
        if (n !== state.node && !isCleared(state, n)) continue;
        prev[nb] = n;
        if (nb === to) { const out = []; let c = to; while (c !== state.node) { out.unshift(c); c = prev[c]; } return { path: out }; }
        q.push(nb);
      }
    }
    // explain why: the nearest unfinished blocking node standing in the way
    if (!lock) {
      const seen = new Set([state.node]); const q2 = [state.node];
      while (q2.length && !lock) {
        const n = q2.shift();
        for (const nb of neighbors(reg, n)) if (!seen.has(nb) && ex.includes(nb)) { seen.add(nb); if (BLOCKING[reg.nodes[nb].kind] && !isCleared(state, nb)) { lock = nb; break; } q2.push(nb); }
      }
    }
    return { reason: 'blocked', lock };
  }

  function objective(state) {
    const reg = cur(state);
    for (const id of reg.goals || []) {
      const k = reg.nodes[id].kind;
      if (k === 'exit' || (reg.home === id)) { if (!(k === 'character' && isCleared(state, id))) return id; continue; }
      if (!isCleared(state, id)) return id;
    }
    return null;
  }

  function canMove(state, to) {
    const reg = cur(state);
    if (!neighbors(reg, state.node).includes(to)) return { ok: false, reason: 'not-adjacent' };
    if (!explored(state).includes(to)) return { ok: false, reason: 'fog' };
    const here = reg.nodes[state.node];
    if (BLOCKING[here.kind] && !isCleared(state, state.node) && to !== state.prev) return { ok: false, reason: 'blocked' };
    return { ok: true };
  }

  // Non-blocking nodes count as cleared once visited (so they become fast-travel targets);
  // `first` tells the caller whether this is the first visit.
  function move(state, to) {
    const c = canMove(state, to);
    if (!c.ok) return c;
    state.prev = state.node; state.node = to;
    reveal(state, to); revealRoom(state, cur(state).nodes[to].room);
    const node = cur(state).nodes[to];
    const first = !isCleared(state, to);
    if (!BLOCKING[node.kind]) clear(state, to);
    if (isCleared(state, to) || node.kind === 'character') state.checkpoint = { region: state.region, node: to };
    return { ok: true, arrived: node, first };
  }

  function learn(state, skillId) {
    if (!state.learned.includes(skillId)) state.learned.push(skillId);
    if (!state.codex.includes(skillId)) state.codex.push(skillId);
    if (!state.equipped.includes(skillId) && state.equipped.length < stats(state).slots) state.equipped.push(skillId);
  }
  function equip(state, skillId) {
    if (!state.learned.includes(skillId) || state.equipped.includes(skillId) || state.equipped.length >= stats(state).slots) return false;
    state.equipped.push(skillId); return true;
  }
  function unequip(state, skillId) {
    const i = state.equipped.indexOf(skillId); if (i < 0) return false;
    state.equipped.splice(i, 1); return true;
  }

  function quickFix(state, nodeId, skillId) {
    const node = cur(state).nodes[nodeId];
    if (!node || node.kind !== 'problem') return 'fight';
    if (state.equipped.includes(skillId) && node.ref.skill === skillId) { clear(state, nodeId); state.stats.clean++; return 'fixed'; }
    return 'fight';
  }

  function installModule(state, moduleId) { state.modules.push(moduleId); }

  function buyUpgrade(state, upgradeId) {
    const skill = Object.values(W().SKILLS).find((s) => s.upgrade && s.upgrade.id === upgradeId);
    if (!skill) return { ok: false, reason: 'unknown' };
    if (state.upgrades.includes(upgradeId)) return { ok: false, reason: 'owned' };
    const u = skill.upgrade;
    if (!state.learned.includes(skill.id) || (u.needs && !state.modules.includes(u.needs))) return { ok: false, reason: 'needs' };
    if (state.bits < u.cost) return { ok: false, reason: 'bits' };
    state.bits -= u.cost; state.upgrades.push(upgradeId);
    return { ok: true };
  }

  function reward(state, kind) {
    const [bits, xp] = REWARDS[kind] || [0, 0];
    state.bits += bits;
    return { bits, xp };
  }

  function useOnMap(state, skillId) {
    if (!state.learned.includes(skillId)) return { ok: false };
    if (skillId === 'ls') {
      const revealed = reveal(state, state.node, stats(state).sight + 1);
      if (state.upgrades.includes('ls-a')) {
        const reg = cur(state); const ex = explored(state);
        let frontier = [state.node]; const seen = new Set(frontier);
        for (let d = 0; d < 2; d++) {
          const next = [];
          for (const id of frontier) for (const nb of neighbors(reg, id)) {
            if (seen.has(nb)) continue; seen.add(nb); next.push(nb);
            if (reg.nodes[nb].hidden && !ex.includes(nb)) { ex.push(nb); revealed.push(nb); }
          }
          frontier = next;
        }
      }
      return { ok: true, revealed };
    }
    if (skillId === 'cd') {
      const travelTargets = explored(state).filter((id) => id !== state.node && isCleared(state, id));
      return { ok: true, travelTargets };
    }
    return { ok: true };
  }

  function fastTravel(state, nodeId) {
    const t = useOnMap(state, 'cd');
    if (!t.ok || !t.travelTargets.includes(nodeId)) return false;
    state.node = nodeId; state.prev = null;
    return true;
  }

  function taskProgress(state, taskId) {
    const t = W().TASKS[taskId]; const g = t.goal;
    let done = 0; let need = 0;
    if (g.type === 'clearKind') {
      const reg = region(g.region); const ids = Object.keys(reg.nodes).filter((id) => reg.nodes[id].kind === g.kind);
      need = ids.length; done = ids.filter((id) => (state.cleared[g.region] || []).includes(id)).length;
    } else if (g.type === 'memories') {
      const reg = region(g.region);
      const lines = Object.values(reg.nodes).filter((nd) => nd.kind === 'memory').map((nd) => nd.ref);
      need = g.count; done = Math.min(need, lines.filter((l) => state.memories.includes(l)).length);
    } else if (g.type === 'clean') {
      need = g.count; done = Math.min(need, state.stats.clean);
    }
    return { done, need, complete: need > 0 && done >= need };
  }

  function claimTasks(state) {
    const got = [];
    for (const id of Object.keys(W().TASKS)) {
      if (state.tasksDone.includes(id) || !taskProgress(state, id).complete) continue;
      state.tasksDone.push(id); state.bits += W().TASKS[id].bits; got.push(id);
    }
    return got;
  }

  // Drop ids the current world doesn't know (corrupt or future-version saves) without losing valid progress.
  function sanitize(state) {
    const Wd = W(); const known = (obj) => (id) => Object.prototype.hasOwnProperty.call(obj, id);
    const regOk = (id) => !!region(id);
    const nodeOk = (r, n) => regOk(r) && !!region(r).nodes[n];
    for (const key of ['explored', 'cleared']) {
      const out = {};
      for (const r of Object.keys(state[key])) if (regOk(r)) out[r] = state[key][r].filter((n) => !!region(r).nodes[n]);
      state[key] = out;
    }
    state.learned = state.learned.filter(known(Wd.SKILLS));
    state.codex = state.codex.filter(known(Wd.SKILLS));
    state.modules = state.modules.filter(known(Wd.MODULES));
    const ups = Object.values(Wd.SKILLS).map((s) => s.upgrade.id);
    state.upgrades = state.upgrades.filter((u) => ups.includes(u));
    state.tasksDone = state.tasksDone.filter(known(Wd.TASKS));
    state.equipped = state.equipped.filter((s) => state.learned.includes(s)).slice(0, stats(state).slots);
    if (!nodeOk(state.checkpoint.region, state.checkpoint.node)) {
      const r = regOk(state.checkpoint.region) ? state.checkpoint.region : regOk(state.region) ? state.region : Wd.REGIONS[0].id;
      state.checkpoint = { region: r, node: region(r).start };
    }
    if (!nodeOk(state.region, state.node)) { state.region = state.checkpoint.region; state.node = state.checkpoint.node; state.prev = null; }
    if (state.prev && !region(state.region).nodes[state.prev]) state.prev = null;
    if (!state.explored[state.region]) state.explored[state.region] = [];
    reveal(state, state.node); revealRoom(state, region(state.region).nodes[state.node].room);
    return state;
  }

  function enterRegion(state, regionId) {
    const reg = region(regionId);
    state.region = regionId; state.node = reg.start; state.prev = null;
    state.checkpoint = { region: regionId, node: reg.start };
    reveal(state, reg.start); revealRoom(state, reg.nodes[reg.start].room);
  }

  CK.Rules = { stats, region, neighbors, reveal, canMove, move, isCleared, clear, learn, equip, unequip, quickFix, installModule, buyUpgrade, reward, useOnMap, fastTravel, taskProgress, claimTasks, enterRegion, sanitize, revealRoom, doors, doorLock, path, objective, BLOCKING };
})(typeof window !== 'undefined' ? window : globalThis);
