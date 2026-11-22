/* Colonel Kernel — scenes: map (navigator), fight, puzzle. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});
  const Art = () => CK.Art;
  const Rules = () => CK.Rules;
  const TRAVEL_SPEED = 320;

  // ------------------------------------------------------------------ map
  function map(o) {
    const engine = o.engine;
    let state = o.state; let region; let pos; let travel = null; let drag = null;
    const pan = { x: 0, y: 0 };
    const parts = [];
    const sc = { view: 'map', locked: false, facing: 1 }; let flickerT = 0;

    function nodePos(id) { const n = region.nodes[id]; return { x: n.x, y: n.y }; }
    function visible() { return state.explored[state.region] || []; }

    sc.setState = function (s) {
      state = s; region = Rules().region(state.region);
      pos = nodePos(state.node); travel = null; pan.x = 0; pan.y = 0;
      engine.camera.x = pos.x; engine.camera.y = pos.y;
    };
    sc.setState(state);
    sc.region = () => region;
    sc.colonelPos = () => ({ x: pos.x, y: pos.y });
    sc.burst = (x, y, color, n) => Art().spawnBurst(parts, x, y, color, n);
    sc.snapTo = function (id) { pos = nodePos(id); travel = null; };

    sc.tapNode = function (id) {
      if (sc.locked || travel || !region.nodes[id]) return;
      if (id === state.node) { o.onArrive({ ok: true, arrived: region.nodes[id], first: false, again: true }); return; }
      const c = Rules().canMove(state, id);
      if (!c.ok) { o.onBlocked(c.reason, id); return; }
      const pts = Art().tracePoints(nodePos(state.node), nodePos(id));
      const stats = Rules().stats(state);
      travel = { pts, len: Art().pathLen(pts), d: 0, to: id, speed: TRAVEL_SPEED / stats.travelMul };
      sc.facing = region.nodes[id].x >= pos.x ? 1 : -1;
      pan.x = 0; pan.y = 0;
    };

    function nodeAt(p) {
      let best = null; let bd = 52;
      for (const id of visible()) { const n = region.nodes[id]; const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < bd) { bd = d; best = id; } }
      return best;
    }

    sc.pointer = function (type, p) {
      if (type === 'cancel') { drag = null; return; }
      if (type === 'down') drag = { sx: p.sx, sy: p.sy, px: pan.x, py: pan.y, moved: false };
      else if (type === 'move' && drag) {
        const dx = p.sx - drag.sx; const dy = p.sy - drag.sy;
        if (Math.hypot(dx, dy) > 10) drag.moved = true;
        if (drag.moved) { pan.x = drag.px - dx / engine.view.s; pan.y = drag.py - dy / engine.view.s; }
      } else if (type === 'up') {
        const wasDrag = drag && drag.moved; drag = null;
        if (!wasDrag) { const id = nodeAt(p); if (id) sc.tapNode(id); }
      }
    };
    sc.pinch = function (f) { engine.camera.zoom = Math.max(0.6, Math.min(1.6, engine.camera.zoom * f)); };

    sc.update = function (dt) {
      if (travel) {
        travel.d += travel.speed * dt;
        pos = Art().pointAlong(travel.pts, travel.d / travel.len);
        if (travel.d >= travel.len) {
          const to = travel.to; travel = null;
          const r = Rules().move(state, to);
          pos = nodePos(state.node);
          Art().spawnBurst(parts, pos.x, pos.y, region.accent, 12, 120);
          o.onArrive(r);
        }
      }
      Art().stepParticles(parts, dt);
      if (state.story && state.story.flicker && !sc.locked) { state.story.flicker = false; flickerT = 1.6; if (o.onFlicker) o.onFlicker(); }
      if (flickerT > 0) flickerT -= dt;
      const cam = engine.camera; const k = Math.min(1, dt * 4);
      cam.x += (pos.x + pan.x - cam.x) * k; cam.y += (pos.y + pan.y - cam.y) * k;
    };

    sc.draw = function (ctx, t, view) {
      const A = Art(); const reduced = engine.reducedMotion; const vis = visible();
      engine.screenTransform(); A.background(ctx, view, t, region.accent);
      engine.worldTransform();
      for (const [a, b] of region.edges) {
        if (!vis.includes(a) || !vis.includes(b)) continue;
        const lit = Rules().isCleared(state, a) && Rules().isCleared(state, b);
        A.trace(ctx, region.nodes[a], region.nodes[b], t, lit, region.accent, reduced);
      }
      const glitched = (state.story && state.story.glitched) || [];
      for (const id of vis) A.node(ctx, region.nodes[id], t, { cleared: Rules().isCleared(state, id), current: id === state.node && !travel, accent: region.accent, reduced, glitched: glitched.includes(id) });
      if (region.home && vis.includes(region.home) && !(state.story && state.story.liltuxTaken)) { const hn = region.nodes[region.home]; A.character(ctx, 'liltux', hn.x + 62, hn.y - 44, 0.9, t); }
      A.colonel(ctx, pos.x, pos.y - 62, 0.9, t, { facing: sc.facing, reduced, redVisor: flickerT > 0 && (reduced || Math.floor(t * 8) % 2 === 0) });
      A.pip(ctx, pos.x - 46 * sc.facing, pos.y - 104, 0.9, t);
      A.burst(ctx, parts);
      engine.screenTransform();
      const holes = vis.map((id) => { const p = engine.toScreen(region.nodes[id].x, region.nodes[id].y); return { x: p.x - engine.canvas.getBoundingClientRect().left, y: p.y - engine.canvas.getBoundingClientRect().top, r: 170 * view.s }; });
      const cp = { x: pos.x * view.s + view.ox, y: pos.y * view.s + view.oy };
      holes.push({ x: cp.x, y: cp.y - 40 * view.s, r: 260 * view.s });
      A.fog(ctx, view, holes, t);
    };

    if (CK.Engine.debug) {
      CK._test.nodeScreenPos = (id) => { const n = region.nodes[id]; return engine.toScreen(n.x, n.y); };
      CK._test.mapScene = sc;
    }
    return sc;
  }

  // ------------------------------------------------------------------ fight (skillshot arena)
  function fontPx(view, px) { return Math.max(px, (px * 0.8) / view.s); }

  function fight(o) {
    const engine = o.engine; const ui = o.ui; const state = o.state; const A = Art();
    const f = CK.Fight.create({ creature: o.creature, state, kid: o.kid, seed: o.seed || 1 });
    const def = f.creature; const W = CK.World;
    const accent = o.accent || (Rules().region(state.region) || {}).accent || A.C.cyan;
    const parts = []; const pops = []; let shake = 0; let aim = null; let endTimer = null; let ended = false; let rings = [];
    const sfx = (type) => { if (o.sfx) o.sfx(type); };
    const sc = { view: 'arena', reserveTop: 64, reserveBottom: 100, fight: f };

    function pop(x, y, text, color) { pops.push({ x, y, text, color: color || '#ffffff', life: 0.9, max: 0.9 }); }
    function feedback(r) {
      if (r.ok) return;
      if (r.reason === 'cooldown') pop(f.colonel.x, f.colonel.y - 90, 'COOLDOWN', A.C.dim);
      else if (r.reason === 'overheat') pop(f.colonel.x, f.colonel.y - 90, 'OVERHEATED', A.C.amber);
    }
    sc.enter = function () {
      ui.combatText = def.weakText;
      ui.skillBar(state, 'fight', f);
      if (o.kid && f.hintAvailable) {
        const bar = document.querySelector('.ck-ui .ck-bar');
        if (bar) {
          const b = document.createElement('button'); b.className = 'ck-btn'; b.dataset.ck = 'fighthint'; b.setAttribute('aria-label', 'Hint'); b.textContent = '💡';
          b.addEventListener('click', () => { f.hintAvailable = false; b.remove(); ui.toast('💡 <b>Pip:</b> ' + def.weakText.replace(/(ls|cd|echo)/g, '<code>$1</code>')); });
          bar.appendChild(b);
        }
      }
    };
    sc.skill = function (id) {
      const sk = W.SKILLS[id];
      if (!sk || !state.equipped.includes(id) || f.outcome) return;
      if (sk.fight.type === 'scan') feedback(f.use(id, 0, 0)); else ui.select(id);
    };
    sc.key = function (e) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 5 && state.equipped[n - 1]) { sc.skill(state.equipped[n - 1]); e.preventDefault(); }
    };
    sc.pointer = function (type, p) {
      if (type === 'move' || type === 'down') aim = { x: p.x, y: p.y, mouse: p.kind === 'mouse' };
      if (type !== 'down' || f.outcome) return;
      if (p.y < -40 || p.y > f.H + 60) return;
      const id = ui.selected; if (!id) return;
      feedback(f.use(id, p.x, p.y));
    };

    sc.update = function (dt) {
      if (ui.pipOpen && ui.pipOpen()) { ui.tick(f); return; } // paused while Pip's panel is open
      f.update(dt);
      for (const e of f.events) {
        if (e.type === 'hit') { A.spawnBurst(parts, e.x, e.y, A.C.coral, 10, 180); pop(e.x, e.y - 30, '-' + W.SKILLS.echo.fight.dmg, '#ffffff'); sfx('hit'); }
        else if (e.type === 'kill') { A.spawnBurst(parts, e.x, e.y, A.C.magenta, 36, 320); A.spawnBurst(parts, e.x, e.y, '#ffffff', 14, 200); shake = Math.max(shake, 6); sfx('kill'); }
        else if (e.type === 'reveal') { rings.push({ x: e.x, y: e.y, r: 20, life: 0.7 }); sfx('reveal'); }
        else if (e.type === 'dash') { A.spawnBurst(parts, e.x, e.y, A.C.cyan, 18, 220); sfx('dash'); }
        else if (e.type === 'hurt') { A.spawnBurst(parts, e.x, e.y - 20, A.C.coral, 20, 240); shake = Math.max(shake, 10); sfx('hurt'); }
        else if (e.type === 'orbPop') { A.spawnBurst(parts, e.x, e.y, A.C.magenta, 10, 160); sfx('pop'); }
        else if (e.type === 'overheat') { pop(e.x, e.y - 100, 'OVERHEAT!', A.C.amber); sfx('hurt'); }
        else if (e.type === 'phase') { pop(e.x, e.y - 90, 'PHASE ' + (f.enemies[0] ? f.enemies[0].phase + 1 : ''), A.C.magenta); shake = Math.max(shake, 8); }
        else if (e.type === 'fire') sfx('fire');
      }
      f.events.length = 0;
      A.stepParticles(parts, dt);
      for (let i = pops.length - 1; i >= 0; i--) { pops[i].y -= 40 * dt; pops[i].life -= dt; if (pops[i].life <= 0) pops.splice(i, 1); }
      rings = rings.filter((r) => { r.r += 900 * dt; r.life -= dt; return r.life > 0; });
      shake = Math.max(0, shake - 30 * dt);
      ui.tick(f);
      if (f.outcome && !ended) { ended = true; endTimer = 1.0; sfx(f.outcome); }
      if (endTimer !== null) { endTimer -= dt; if (endTimer <= 0) { endTimer = null; o.onEnd(f.outcome); } }
    };

    sc.draw = function (ctx, t, view) {
      const reduced = engine.reducedMotion;
      engine.screenTransform(); A.background(ctx, view, t, accent);
      engine.worldTransform();
      if (shake && !reduced) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      // arena
      A.rr(ctx, 0, 0, f.W, f.H, 22);
      const g = ctx.createLinearGradient(0, 0, 0, f.H); g.addColorStop(0, 'rgba(10,14,36,0.55)'); g.addColorStop(1, 'rgba(20,16,58,0.75)');
      ctx.fillStyle = g; ctx.fill();
      A.glow(ctx, accent, 18); ctx.strokeStyle = A.withAlpha(accent, 0.8); ctx.lineWidth = 2.5; ctx.stroke(); A.noGlow(ctx);
      ctx.save(); A.rr(ctx, 0, 0, f.W, f.H, 22); ctx.clip();
      ctx.strokeStyle = 'rgba(56,242,255,0.07)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 0; x <= f.W; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, f.H); }
      for (let y = 0; y <= f.H; y += 50) { ctx.moveTo(0, y); ctx.lineTo(f.W, y); }
      ctx.stroke();
      ctx.strokeStyle = A.withAlpha(A.C.cyan, 0.35); ctx.setLineDash([14, 10]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, f.colonel.y + 34); ctx.lineTo(960, f.colonel.y + 34); ctx.stroke(); ctx.setLineDash([]);
      for (const r of rings) { ctx.strokeStyle = A.withAlpha(A.C.cyan, Math.max(0, r.life)); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke(); }
      for (const e of f.enemies) A.creature(ctx, e.kind, e.x, e.y, e.r, t, { cloaked: e.cloaked, revealed: f.time < e.revealedUntil, hpRatio: e.hp / e.maxHp, phase: e.phase, reduced });
      for (const ob of f.orbs) {
        A.glow(ctx, A.C.magenta, 16); ctx.fillStyle = A.C.magenta; ctx.beginPath(); ctx.arc(ob.x, ob.y, ob.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ob.x, ob.y, ob.r * 0.45, 0, Math.PI * 2); ctx.fill(); A.noGlow(ctx);
      }
      for (const s of f.shots) {
        const len = Math.hypot(s.vx, s.vy) || 1;
        A.glow(ctx, A.C.cyan, 14); ctx.strokeStyle = '#d9fdff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - (s.vx / len) * 26, s.y - (s.vy / len) * 26); ctx.stroke(); A.noGlow(ctx);
      }
      const c = f.colonel;
      A.colonel(ctx, c.x, c.y - 6, 1.05, t, { hurt: shake > 4, reduced });
      A.pip(ctx, c.x - 56, c.y - 66, 0.9, t, c.stability < 35 ? 'worried' : null);
      A.burst(ctx, parts);
      if (aim && aim.mouse && !f.outcome) {
        ctx.strokeStyle = A.withAlpha(A.C.magenta, 0.85); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(aim.x, aim.y, 16, 0, Math.PI * 2); ctx.moveTo(aim.x - 24, aim.y); ctx.lineTo(aim.x - 8, aim.y); ctx.moveTo(aim.x + 8, aim.y); ctx.lineTo(aim.x + 24, aim.y);
        ctx.moveTo(aim.x, aim.y - 24); ctx.lineTo(aim.x, aim.y - 8); ctx.moveTo(aim.x, aim.y + 8); ctx.lineTo(aim.x, aim.y + 24); ctx.stroke();
      }
      ctx.restore();
      // in-arena HUD
      const fs = fontPx(view, 13);
      ctx.font = `800 ${fs}px "Adwaita Sans", Cantarell, system-ui, sans-serif`; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      ctx.fillStyle = '#e8f1ff'; ctx.fillText('STABILITY', 20, 16);
      A.rr(ctx, 20, 20 + fs, 220, 12, 6); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
      const sr = c.stability / c.maxStability;
      A.rr(ctx, 20, 20 + fs, 220 * sr, 12, 6); ctx.fillStyle = sr > 0.35 ? A.C.mint : A.C.coral; ctx.fill();
      const tot = f.enemies.reduce((n, e) => n + Math.max(0, e.hp), 0);
      const max = def.boss ? def.hp : def.hp * (def.count || 1);
      ctx.textAlign = 'right'; ctx.fillStyle = '#e8f1ff';
      ctx.fillText(def.name.toUpperCase() + (def.boss && f.enemies[0] ? `  ·  PHASE ${f.enemies[0].phase + 1}/${def.phases}` : ''), 980, 16);
      A.rr(ctx, 760, 20 + fs, 220, 12, 6); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
      A.rr(ctx, 760 + 220 * (1 - tot / max), 20 + fs, 220 * (tot / max), 12, 6); ctx.fillStyle = A.C.magenta; ctx.fill();
      ctx.textAlign = 'center';
      for (const p of pops) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.font = `900 ${fontPx(view, 16)}px system-ui, sans-serif`; ctx.fillText(p.text, p.x, p.y); }
      ctx.globalAlpha = 1;
      if (f.outcome) {
        ctx.fillStyle = 'rgba(4,6,18,0.45)'; ctx.fillRect(0, 0, f.W, f.H);
        ctx.font = `900 ${fontPx(view, 34)}px system-ui, sans-serif`; ctx.textBaseline = 'middle';
        A.glow(ctx, f.outcome === 'win' ? A.C.mint : A.C.coral, 20); ctx.fillStyle = f.outcome === 'win' ? A.C.mint : A.C.coral;
        ctx.fillText(f.outcome === 'win' ? 'PROBLEM DEFEATED' : 'STABILITY LOST', f.W / 2, f.H / 2); A.noGlow(ctx);
      }
    };

    if (CK.Engine.debug) {
      CK._test.win = () => { f.enemies.length = 0; };
      CK._test.lose = () => { f.colonel.stability = 0; };
      CK._test.fightScene = sc;
    }
    return sc;
  }

  // ------------------------------------------------------------------ puzzle (circuit repair)
  function puzzle(o) {
    const engine = o.engine; const grid = o.grid; const A = Art(); const P = CK.Puzzle;
    const accent = o.accent || A.C.amber;
    const cs = Math.min(110, 440 / grid.rows, 880 / grid.cols);
    const gx = 500 - (cs * grid.cols) / 2; const gy = 340 - (cs * grid.rows) / 2;
    const shown = grid.cells.map((row) => row.map((cell) => cell.r * 90));
    const parts = []; let solved = false; let timer = null;
    const sc = { view: 'arena', reserveTop: 64, reserveBottom: 24, grid };
    const sfx = (type) => { if (o.sfx) o.sfx(type); };

    function cellAt(p) {
      const c = Math.floor((p.x - gx) / cs); const r = Math.floor((p.y - gy) / cs);
      return r >= 0 && c >= 0 && r < grid.rows && c < grid.cols ? [r, c] : null;
    }
    sc.pointer = function (type, p) {
      if (type !== 'down' || solved) return;
      const rc = cellAt(p); if (!rc) return;
      const cell = grid.cells[rc[0]][rc[1]];
      if (cell.t === 'source' || cell.t === 'target' || cell.t === 'empty') return;
      P.rotate(grid, rc[0], rc[1]); sfx('pop');
    };
    sc.update = function (dt) {
      for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) {
        let want = grid.cells[r][c].r * 90; let cur = shown[r][c];
        while (want < cur - 180) want += 360; while (want > cur + 180) want -= 360;
        shown[r][c] = Math.abs(want - cur) < 1 ? want : cur + (want - cur) * Math.min(1, dt * 14);
      }
      if (!solved && P.isSolved(grid)) {
        solved = true; timer = 0.8; sfx('win');
        for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) A.spawnBurst(parts, gx + c * cs + cs / 2, gy + r * cs + cs / 2, accent, 4, 120);
      }
      if (timer !== null) { timer -= dt; if (timer <= 0) { timer = null; o.onSolved(); } }
      A.stepParticles(parts, dt);
    };
    sc.draw = function (ctx, t, view) {
      const on = P.powered(grid);
      engine.screenTransform(); A.background(ctx, view, t, accent);
      engine.worldTransform();
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = `900 ${fontPx(view, 22)}px "Adwaita Sans", Cantarell, system-ui, sans-serif`;
      A.glow(ctx, accent, 14); ctx.fillStyle = accent; ctx.fillText(solved ? 'CIRCUIT RESTORED' : 'REPAIR THE CIRCUIT', 500, 6); A.noGlow(ctx);
      ctx.font = `600 ${fontPx(view, 13)}px "Adwaita Sans", Cantarell, system-ui, sans-serif`; ctx.fillStyle = '#c9d4f2';
      ctx.fillText('Tap tiles to rotate them. Route power from the ⚡ source to the core.', 500, 6 + fontPx(view, 22) * 1.3);
      for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) {
        const cell = grid.cells[r][c]; const x = gx + c * cs; const y = gy + r * cs; const cx = x + cs / 2; const cy = y + cs / 2;
        const lit = on.has(r + ',' + c);
        A.rr(ctx, x + 4, y + 4, cs - 8, cs - 8, 12);
        ctx.fillStyle = lit ? 'rgba(30,26,60,0.95)' : 'rgba(12,16,38,0.92)'; ctx.fill();
        ctx.strokeStyle = lit ? A.withAlpha(accent, 0.7) : 'rgba(56,242,255,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
        if (cell.t === 'empty') continue;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate((shown[r][c] * Math.PI) / 180);
        const base = P.ports({ t: cell.t, r: 0 });
        ctx.lineCap = 'round';
        for (const d of base) {
          const a = (d * Math.PI) / 2 - Math.PI / 2;
          ctx.strokeStyle = '#1b2550'; ctx.lineWidth = cs * 0.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * cs / 2, Math.sin(a) * cs / 2); ctx.stroke();
          if (lit) A.glow(ctx, accent, 14);
          ctx.strokeStyle = lit ? accent : 'rgba(150,170,220,0.55)'; ctx.lineWidth = cs * 0.08;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * cs / 2, Math.sin(a) * cs / 2); ctx.stroke(); A.noGlow(ctx);
        }
        ctx.restore();
        if (cell.t === 'source') {
          A.glow(ctx, A.C.cyan, 18); ctx.fillStyle = A.C.cyan; ctx.beginPath(); ctx.arc(cx, cy, cs * 0.24, 0, Math.PI * 2); ctx.fill(); A.noGlow(ctx);
          ctx.fillStyle = '#05101e'; ctx.beginPath(); ctx.moveTo(cx + 3, cy - 12); ctx.lineTo(cx - 6, cy + 2); ctx.lineTo(cx, cy + 2); ctx.lineTo(cx - 3, cy + 12); ctx.lineTo(cx + 6, cy - 2); ctx.lineTo(cx, cy - 2); ctx.closePath(); ctx.fill();
        } else if (cell.t === 'target') {
          const pulse = 0.85 + 0.15 * Math.sin(t * 5);
          A.glow(ctx, lit ? A.C.mint : A.C.coral, lit ? 26 : 8);
          ctx.fillStyle = lit ? A.C.mint : '#3a1424'; ctx.beginPath(); ctx.arc(cx, cy, cs * 0.26 * (lit ? pulse : 1), 0, Math.PI * 2); ctx.fill(); A.noGlow(ctx);
          ctx.strokeStyle = lit ? '#ffffff' : A.C.coral; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, cs * 0.14, 0, Math.PI * 2); ctx.stroke();
        } else if (lit) {
          ctx.fillStyle = '#ffffff'; A.glow(ctx, '#ffffff', 10); ctx.beginPath(); ctx.arc(cx, cy, cs * 0.06, 0, Math.PI * 2); ctx.fill(); A.noGlow(ctx);
        }
      }
      A.burst(ctx, parts);
    };

    if (CK.Engine.debug) {
      CK._test.cellScreenPos = (r, c) => engine.toScreen(gx + c * cs + cs / 2, gy + r * cs + cs / 2);
      CK._test.solve = () => { if (o.solvedGrid) grid.cells.forEach((row, r) => row.forEach((cell, c) => { cell.r = o.solvedGrid.cells[r][c].r; })); };
      CK._test.puzzleScene = sc;
    }
    return sc;
  }

  CK.Scenes = { map, fight, puzzle };
})(typeof window !== 'undefined' ? window : globalThis);
