/* Colonel Kernel — movement. The ONLY place that decides how the Colonel gets from A to B on the map.
 * Today: tap-to-walk along a route of nodes (straight segments). A future drag/walk mode replaces this
 * file with free movement inside rooms; the rest of the game only uses go(), update(), pos and busy. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});
  const SPEED = 320; // world units per second, divided by the SSD travelMul

  // opts: { nodePos(id) -> {x,y}, onStep(id, isLast) }
  function create(opts) {
    let route = []; let from = null; let target = null; let speed = SPEED;
    const m = {
      pos: { x: 0, y: 0 },
      get busy() { return !!target; },
      place(id) { const p = opts.nodePos(id); m.pos = { x: p.x, y: p.y }; route = []; target = null; },
      go(path, travelMul) {
        if (!path || !path.length) return;
        speed = SPEED / (travelMul || 1);
        route = path.slice(); from = { x: m.pos.x, y: m.pos.y }; target = route.shift();
      },
      stop() { route = []; target = null; },
      // returns the direction of travel (-1 left, 1 right, 0) so the sprite can face the right way
      update(dt) {
        if (!target) return 0;
        const to = opts.nodePos(target);
        const dx = to.x - m.pos.x; const dy = to.y - m.pos.y; const d = Math.hypot(dx, dy); const step = speed * dt;
        if (d <= step) {
          m.pos = { x: to.x, y: to.y };
          const arrived = target; const last = route.length === 0;
          target = last ? null : route.shift(); from = { x: to.x, y: to.y };
          opts.onStep(arrived, last);
          return 0;
        }
        m.pos = { x: m.pos.x + (dx / d) * step, y: m.pos.y + (dy / d) * step };
        return Math.sign(dx);
      },
    };
    return m;
  }

  CK.Mover = { create, SPEED };
})(typeof window !== 'undefined' ? window : globalThis);
