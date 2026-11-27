/* Colonel Kernel — pure game rules. Functions mutate the state passed in. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});
  const W = () => CK.World;

  const BLOCKING = { problem: 1, circuit: 1, boss: 1 };
  const TOOLS = ['echo', 'ls', 'cd']; // fill loadout slots
  const MOVES = ['kill', 'trap']; // always on, never take a slot
  const SAFE = { start: 1, character: 1 };
  const LOOP_DOORS = { g7: ['e', 's'] }; // GRUB boot loop: these doors loop until the path sign is set
  const REWARDS = { clean: [15, 15], fight: [10, 20], boss: [50, 60], memory: [0, 5], region: [30, 100], puzzle: [10, 10] };

  function stats(state) {
    const s = { slots: 2, cdMul: 1, heatMul: 1, moveMul: 1, dashCdMul: 1, sight: 1 };
    for (const id of state.modules) {
      const m = W().MODULES[id]; if (!m) continue;
      if (m.slots) s.slots += m.slots;
      if (m.cdMul) s.cdMul *= m.cdMul;
      if (m.heatMul) s.heatMul *= m.heatMul;
      if (m.moveMul) s.moveMul *= m.moveMul;
      if (m.dashCdMul) s.dashCdMul *= m.dashCdMul;
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
    reveal(state, to);
    const node = cur(state).nodes[to];
    const first = !isCleared(state, to);
    if (!BLOCKING[node.kind] && node.kind !== 'item') clear(state, to); // an item room counts once its item is taken
    if (isCleared(state, to) || node.kind === 'character') state.checkpoint = { region: state.region, node: to };
    return { ok: true, arrived: node, first };
  }

  function learn(state, skillId) {
    if (!state.learned.includes(skillId)) state.learned.push(skillId);
    if (!state.codex.includes(skillId)) state.codex.push(skillId);
    if (TOOLS.includes(skillId) && !state.equipped.includes(skillId) && state.equipped.length < stats(state).slots) state.equipped.push(skillId);
  }
  function equip(state, skillId) {
    if (!TOOLS.includes(skillId) || !state.learned.includes(skillId) || state.equipped.includes(skillId) || state.equipped.length >= stats(state).slots) return false;
    state.equipped.push(skillId); return true;
  }
  function unequip(state, skillId) {
    const i = state.equipped.indexOf(skillId); if (i < 0) return false;
    state.equipped.splice(i, 1); return true;
  }

  // A cleared problem room: no hits taken = clean (today's clean reward), otherwise the fight reward.
  function clearRoom(state, nodeId, opts) {
    const clean = !!(opts && opts.clean);
    clear(state, nodeId);
    if (clean) state.stats.clean++;
    return Object.assign({ clean }, reward(state, clean ? 'clean' : 'fight'));
  }

  const SIDES = { '1,0': 'e', '-1,0': 'w', '0,1': 's', '0,-1': 'n' };
  function sideOf(reg, a, b) {
    if (!neighbors(reg, a).includes(b) || !reg.cells || !reg.cells[a] || !reg.cells[b]) return null;
    const [ax, ay] = reg.cells[a]; const [bx, by] = reg.cells[b];
    return SIDES[(bx - ax) + ',' + (by - ay)] || null;
  }

  // What each door of a room looks like now: open, sealed, wall (hidden, unknown), crack (hidden, revealed) or loop.
  function doorStates(state, nodeId, opts) {
    const reg = cur(state); const here = reg.nodes[nodeId]; const ex = explored(state); const out = {};
    const blocking = BLOCKING[here.kind] && !isCleared(state, nodeId);
    for (const nb of neighbors(reg, nodeId)) {
      const side = sideOf(reg, nodeId, nb); if (!side) continue;
      const hidden = !!reg.nodes[nb].hidden;
      let kind = 'open';
      if (opts && opts.bossFight) kind = 'sealed';
      else if (hidden && !ex.includes(nb)) kind = 'wall';
      else if (hidden && !isCleared(state, nb)) kind = 'crack';
      else if (!ex.includes(nb)) kind = 'sealed';
      else if (blocking && nb !== state.prev) kind = 'sealed';
      else if (LOOP_DOORS[nodeId] && LOOP_DOORS[nodeId].includes(side) && !(state.signs || []).includes(nodeId)) kind = 'loop';
      out[side] = { to: nb, kind };
    }
    return out;
  }

  // ---- signposting: where to go next, and what each door says -------------------------------------
  // Pathfinding ignores gating (sealed doors open as you play) but never walks through a hidden room you haven't found.
  function steps(state, from) {
    const reg = cur(state); const ex = explored(state); const dist = { [from]: 0 }; const first = {}; const q = [from];
    while (q.length) {
      const id = q.shift();
      for (const nb of neighbors(reg, id)) {
        if (dist[nb] !== undefined || (reg.nodes[nb].hidden && !ex.includes(nb))) continue;
        dist[nb] = dist[id] + 1; first[nb] = id === from ? nb : first[id]; q.push(nb);
      }
    }
    return { dist, first };
  }
  // The room to head for: a teacher you haven't learned from (Pip only for kill; his other lessons happen on the way),
  // else the boss, else the way out of the region.
  function goalNode(state) {
    const reg = cur(state); const { dist } = steps(state, state.node);
    const teaches = (n) => Object.values(W().SKILLS).some((sk) => sk.teacher === n.ref && !state.learned.includes(sk.id) && (n.ref !== 'pip' || sk.id === 'kill'));
    const cands = Object.keys(reg.nodes).filter((id) => reg.nodes[id].kind === 'character' && teaches(reg.nodes[id]));
    if (cands.length) return cands.sort((a, b) => (dist[a] === undefined ? 99 : dist[a]) - (dist[b] === undefined ? 99 : dist[b]))[0];
    if (reg.boss && !isCleared(state, reg.boss)) return reg.boss;
    return reg.exit || reg.home || null;
  }
  function nextStep(state, target, from) {
    from = from || state.node; if (!target || from === target) return null;
    return steps(state, from).first[target] || null;
  }
  function goalSide(state, from) {
    from = from || state.node; const n = nextStep(state, goalNode(state), from);
    return n ? sideOf(cur(state), from, n) : null;
  }
  // Per door: where it leads, whether it is open, why it is shut, and whether it is the way to the goal.
  function doorInfo(state, nodeId, opts) {
    opts = opts || {}; const reg = cur(state); const ex = explored(state); const ds = doorStates(state, nodeId, opts); const goal = goalSide(state, nodeId); const out = {};
    for (const side of Object.keys(ds)) {
      const { to, kind } = ds[side]; let reason = null;
      if (kind === 'wall') { out[side] = { to, kind, name: null, reason: null, goal: false }; continue; }
      if (opts.bossFight) reason = 'Fight!';
      else if (kind === 'sealed') reason = ex.includes(to) ? 'Clear this room first' : 'Not found yet';
      else if (kind === 'crack') reason = 'Hidden crack: ls -a, then kill';
      else if (kind === 'loop') reason = 'Set the path sign: cd /boot';
      else if ((opts.gapSides || []).includes(side)) reason = 'echo the switch';
      out[side] = { to, kind, name: ex.includes(to) ? reg.nodes[to].label : '???', reason, goal: side === goal };
    }
    return out;
  }
  // Power: a room whose job is done (or that never had one) is on; broken problem, circuit and boss rooms are off.
  const isPowered = (state, nodeId) => { const n = cur(state).nodes[nodeId]; return !(n && BLOCKING[n.kind]) || isCleared(state, nodeId); };
  const regionPowered = (state) => { const r = cur(state); return !!r.powerNode && isCleared(state, r.powerNode); };

  // cd fast travel: any visited safe room (start / character) that isn't glitched.
  function travelTargets(state) {
    const reg = cur(state); const glitched = (state.story && state.story.glitched) || [];
    return explored(state).filter((id) => id !== state.node && reg.nodes[id] && SAFE[reg.nodes[id].kind] && isCleared(state, id) && !glitched.includes(id));
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
      return { ok: true, travelTargets: travelTargets(state) };
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
    const ups = Object.values(Wd.SKILLS).filter((s) => s.upgrade).map((s) => s.upgrade.id);
    state.upgrades = state.upgrades.filter((u) => ups.includes(u));
    state.tasksDone = state.tasksDone.filter(known(Wd.TASKS));
    state.equipped = state.equipped.filter((s, i, a) => TOOLS.includes(s) && state.learned.includes(s) && a.indexOf(s) === i).slice(0, stats(state).slots);
    if (!nodeOk(state.checkpoint.region, state.checkpoint.node)) {
      const r = regOk(state.checkpoint.region) ? state.checkpoint.region : regOk(state.region) ? state.region : Wd.REGIONS[0].id;
      state.checkpoint = { region: r, node: region(r).start };
    }
    if (!nodeOk(state.region, state.node)) { state.region = state.checkpoint.region; state.node = state.checkpoint.node; state.prev = null; }
    if (state.prev && !region(state.region).nodes[state.prev]) state.prev = null;
    if (!state.explored[state.region]) state.explored[state.region] = [];
    reveal(state, state.node);
    return state;
  }

  function enterRegion(state, regionId) {
    const reg = region(regionId);
    state.region = regionId; state.node = reg.start; state.prev = null;
    state.checkpoint = { region: regionId, node: reg.start };
    reveal(state, reg.start);
  }

  CK.Rules = { stats, region, neighbors, reveal, canMove, move, isCleared, clear, learn, equip, unequip, installModule, buyUpgrade, reward, useOnMap, fastTravel, taskProgress, claimTasks, enterRegion, sanitize, BLOCKING,
    TOOLS, MOVES, SAFE, LOOP_DOORS, clearRoom, sideOf, doorStates, travelTargets, goalNode, nextStep, goalSide, doorInfo, isPowered, regionPowered };
})(typeof window !== 'undefined' ? window : globalThis);
