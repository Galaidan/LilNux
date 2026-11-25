/* Colonel Kernel — rooms: ASCII layouts, tile collision, and the Training Room for the action slice. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const TILE = 16;
  // # wall · . floor · , alt floor · D door (solid for now) · P player start · m Glitch Mite · o capacitor pillar
  // ~ void (the data void under the plaza; solid, no falling yet) · & corruption bloom (solid scenery)
  // % corruption creep (walkable decoration) · H giant chip · T heat sink (landmarks; each block of letters is one landmark)
  const SOLID = { '#': true, D: true, o: true, '~': true, '&': true, H: true, T: true };
  const KNOWN = { '#': 1, '.': 1, ',': 1, D: 1, P: 1, m: 1, o: 1, '~': 1, '&': 1, '%': 1, H: 1, T: 1 };
  const SPAWN = { m: 'glitchMite' };
  const LANDMARK = { H: 'chip', T: 'heatsink' };

  // Group touching landmark letters into one bounding rectangle each, in reading order.
  function landmarksOf(tiles) {
    const seen = new Set(); const out = [];
    tiles.forEach((row, ty) => row.forEach((c, tx) => {
      if (!LANDMARK[c] || seen.has(tx + ',' + ty)) return;
      let x0 = tx; let x1 = tx; let y0 = ty; let y1 = ty; const stack = [[tx, ty]]; seen.add(tx + ',' + ty);
      while (stack.length) {
        const [x, y] = stack.pop();
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (tiles[ny] && tiles[ny][nx] === c && !seen.has(nx + ',' + ny)) { seen.add(nx + ',' + ny); stack.push([nx, ny]); }
        }
      }
      out.push({ kind: LANDMARK[c], tx: x0, ty: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }));
    return out;
  }

  function parse(rows) {
    const cols = rows[0].length;
    const tiles = rows.map((row, y) => {
      if (row.length !== cols) throw new Error(`ragged room row ${y}: ${row.length} != ${cols}`);
      return row.split('').map((c, x) => { if (!KNOWN[c]) throw new Error(`unknown tile "${c}" at ${x},${y}`); return c; });
    });
    const centre = (tx, ty) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
    let player = centre(Math.floor(cols / 2), rows.length - 3);
    const spawns = [];
    tiles.forEach((row, y) => row.forEach((c, x) => {
      if (c === 'P') player = centre(x, y);
      if (SPAWN[c]) spawns.push(Object.assign({ kind: SPAWN[c] }, centre(x, y)));
    }));
    const room = {
      cols, rows: rows.length, w: cols * TILE, h: rows.length * TILE, tiles, player, spawns, landmarks: landmarksOf(tiles),
      solid(tx, ty) { return tx < 0 || ty < 0 || tx >= cols || ty >= rows.length || !!SOLID[tiles[ty][tx]]; },
    };
    return room;
  }

  // Does a square of half-size r centred at (x, y) overlap any solid tile?
  function collides(room, x, y, r) {
    const e = 1e-6;
    const x0 = Math.floor((x - r) / TILE); const x1 = Math.floor((x + r - e) / TILE);
    const y0 = Math.floor((y - r) / TILE); const y1 = Math.floor((y + r - e) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (room.solid(tx, ty)) return true;
    return false;
  }

  function moveAxis(room, x, y, r, d, axis) {
    if (!d) return { v: axis === 'x' ? x : y, hit: false };
    const steps = Math.max(1, Math.ceil(Math.abs(d) / (r * 0.5)));
    const sd = d / steps;
    let v = axis === 'x' ? x : y;
    for (let i = 0; i < steps; i++) {
      const nv = v + sd;
      const blocked = axis === 'x' ? collides(room, nv, y, r) : collides(room, x, nv, r);
      if (blocked) {
        v = sd > 0 ? Math.floor((nv + r) / TILE) * TILE - r - 0.001 : (Math.floor((nv - r) / TILE) + 1) * TILE + r + 0.001;
        return { v, hit: true };
      }
      v = nv;
    }
    return { v, hit: false };
  }

  // Axis-separated move so the mover slides along walls; sub-stepped so it never tunnels.
  function moveCircle(room, x, y, r, dx, dy) {
    const mx = moveAxis(room, x, y, r, dx, 'x');
    const my = moveAxis(room, mx.v, y, r, dy, 'y');
    return { x: mx.v, y: my.v, hitX: mx.hit, hitY: my.hit };
  }

  const TRAINING = [
    '~~~~##########DD##########~~~~',
    '~HHHH&....................TTT~',
    '~HHHH.,.............,.....TTT~',
    '~~&...m..............m......~~',
    '~~.....%%................,..~~',
    '~...o..........m.........o..~~',
    '~..%%.......................&~',
    '~&..,.........,.........,....~',
    '~............................~',
    '~.......o............o.......~',
    '~~...........%%%.............~',
    '~&..,.......,.........,....,.~',
    '~~...........................~',
    '~~~............P...........&~~',
    '~~~~&.....,.........,......~~~',
    '~~~~~~~...............~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ];

  CK.Rooms = { TILE, parse, collides, moveCircle, TRAINING };
})(typeof window !== 'undefined' ? window : globalThis);
