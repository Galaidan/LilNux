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
    const sc = { view: 'map', locked: false, facing: 1 };

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
      for (const id of vis) A.node(ctx, region.nodes[id], t, { cleared: Rules().isCleared(state, id), current: id === state.node && !travel, accent: region.accent, reduced });
      A.colonel(ctx, pos.x, pos.y - 62, 0.9, t, { facing: sc.facing, reduced });
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

  CK.Scenes = { map };
})(typeof window !== 'undefined' ? window : globalThis);
