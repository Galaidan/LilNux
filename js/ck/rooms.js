/* Colonel Kernel — rooms: ASCII layouts, tile collision, and the Training Room for the action slice. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const TILE = 16;
  // # wall · . floor · , alt floor · D door (solid for now) · P player start · m Glitch Mite · o capacitor pillar
  // ~ void (the data void under the plaza; solid, no falling yet) · & corruption bloom (solid scenery)
  // % corruption creep (walkable decoration) · H giant chip · T heat sink (landmarks; each block of letters is one landmark)
  // Chapter rooms add: = bridge · _ retracted bridge (solid until openBridge) · ! switch · t terminal · c character spot
  // p pedestal · * memory crystal · s path sign · b corrupt block (kill breaks it) · > exit gate (walkable)
  // spawns: m Glitch Mite · w Loop Wisp · G Corrupt Boot Glitch · K Missing Kernel Wraith
  // D doors are solid unless setDoor(side, 'open' | 'loop'); a door's side is the room edge it sits on.
  const SOLID = { '#': true, o: true, '~': true, '&': true, H: true, T: true, _: true, '!': true, t: true, c: true, p: true, '*': true, s: true, b: true };
  const KNOWN = { '#': 1, '.': 1, ',': 1, D: 1, P: 1, m: 1, o: 1, '~': 1, '&': 1, '%': 1, H: 1, T: 1,
    '=': 1, _: 1, '!': 1, t: 1, c: 1, p: 1, '*': 1, s: 1, b: 1, '>': 1, w: 1, G: 1, K: 1 };
  const SPAWN = { m: 'glitchMite', w: 'loopWisp', G: 'bootGlitch', K: 'kernelWraith' };
  const LANDMARK = { H: 'chip', T: 'heatsink' };
  const PROP = { t: 'terminal', c: 'npc', p: 'pedestal', '*': 'crystal', s: 'sign', '!': 'switch', b: 'block', '>': 'gate' };
  const OPEN_DOOR = { open: 1, loop: 1 };

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
    const H = rows.length;
    const edgeSide = (x, y) => (y === 0 ? 'n' : y === H - 1 ? 's' : x === 0 ? 'w' : x === cols - 1 ? 'e' : null);
    const doors = {};
    tiles.forEach((row, y) => row.forEach((c, x) => {
      if (c !== 'D') return; const side = edgeSide(x, y); if (!side) return;
      (doors[side] = doors[side] || { tiles: [] }).tiles.push([x, y]);
    }));
    const doorKinds = {};
    const room = {
      cols, rows: H, w: cols * TILE, h: H * TILE, tiles, player, spawns, landmarks: landmarksOf(tiles), doors, props: propsOf(tiles),
      solid(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= cols || ty >= H) return true;
        const c = tiles[ty][tx];
        if (c === 'D') { const side = edgeSide(tx, ty); return !(side && OPEN_DOOR[doorKinds[side]]); }
        return !!SOLID[c];
      },
      // projectiles fly over the void and over retracted bridges
      blocksShots(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= cols || ty >= H) return true;
        const c = tiles[ty][tx]; return c === '~' || c === '_' ? false : room.solid(tx, ty);
      },
      setDoor(side, kind) { doorKinds[side] = kind; },
      doorKind(side) { return doorKinds[side] || 'wall'; },
      openBridge() { tiles.forEach((row) => row.forEach((c, x) => { if (c === '_') row[x] = '='; })); },
      clearTile(tx, ty) {
        if (!tiles[ty] || tiles[ty][tx] === undefined) return;
        tiles[ty][tx] = '.'; room.props = room.props.filter((p) => !(p.tx === tx && p.ty === ty));
      },
    };
    return room;
  }

  // Interactable / touchable things, in reading order. A 2x2 gate is one prop.
  function propsOf(tiles) {
    const out = [];
    tiles.forEach((row, ty) => row.forEach((c, tx) => {
      if (!PROP[c]) return;
      if (c === '>' && ((tiles[ty][tx - 1] === '>') || (tiles[ty - 1] && tiles[ty - 1][tx] === '>'))) return;
      let w = 1; let h = 1;
      if (c === '>') { while (row[tx + w] === '>') w++; while (tiles[ty + h] && tiles[ty + h][tx] === '>') h++; }
      out.push({ kind: PROP[c], tx, ty, w, h, x: tx * TILE + (w * TILE) / 2, y: ty * TILE + (h * TILE) / 2 });
    }));
    return out;
  }

  // The open door the point stands in, within 8 px of the room edge.
  function doorAt(room, x, y) {
    const tx = Math.floor(x / TILE); const ty = Math.floor(y / TILE);
    for (const side of Object.keys(room.doors)) {
      if (!OPEN_DOOR[room.doorKind(side)]) continue;
      if (!room.doors[side].tiles.some(([dx, dy]) => dx === tx && dy === ty)) continue;
      const near = side === 'n' ? y <= 8 : side === 's' ? y >= room.h - 8 : side === 'w' ? x <= 8 : x >= room.w - 8;
      if (near) return side;
    }
    return null;
  }
  // Where the Colonel stands after coming in through a door: the door's centre, two tiles inward.
  function entryPoint(room, side) {
    const d = room.doors[side]; if (!d) return { x: room.player.x, y: room.player.y };
    const cx = d.tiles.reduce((a, [x]) => a + x * TILE + TILE / 2, 0) / d.tiles.length;
    const cy = d.tiles.reduce((a, [, y]) => a + y * TILE + TILE / 2, 0) / d.tiles.length;
    const IN = { n: [0, 1], s: [0, -1], w: [1, 0], e: [-1, 0] }[side];
    return { x: cx + IN[0] * TILE * 2, y: cy + IN[1] * TILE * 2 };
  }
  // Nearest prop of the given kinds whose tile rectangle is within `reach` px of the point.
  function nearestProp(room, x, y, reach, kinds) {
    let best = null; let bd = Infinity;
    for (const p of room.props) {
      if (kinds && !kinds.includes(p.kind)) continue;
      const x0 = p.tx * TILE; const y0 = p.ty * TILE; const x1 = x0 + p.w * TILE; const y1 = y0 + p.h * TILE;
      const d = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));
      if (d <= reach && d < bd) { bd = d; best = p; }
    }
    return best;
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

  CK.Rooms = { TILE, parse, collides, moveCircle, doorAt, entryPoint, nearestProp, TRAINING };
})(typeof window !== 'undefined' ? window : globalThis);
