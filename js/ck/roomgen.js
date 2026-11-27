/* Colonel Kernel — room generator: every Chapter 1 node becomes a 30x17 floating plaza with doors that line up
 * with its grid neighbours. Same picture every load (seeded from the node id). Legend lives in rooms.js. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const COLS = 30; const ROWS = 17;
  const SPAWN_LETTER = { glitchMite: 'm', loopWisp: 'w', bootGlitch: 'G', kernelWraith: 'K' };
  const DOOR = { n: [[14, 0], [15, 0]], s: [[14, 16], [15, 16]], w: [[0, 7], [0, 8]], e: [[29, 7], [29, 8]] };

  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function build(region, nodeId) {
    const node = region.nodes[nodeId];
    const rng = CK.rng(hash(region.id + ':' + nodeId));
    const g = Array.from({ length: ROWS }, () => Array(COLS).fill('~'));
    const at = (x, y) => (g[y] && g[y][x]) || '~';
    const set = (x, y, c) => { if (g[y] && x >= 0 && x < COLS) g[y][x] = c; };
    const isFloor = (x, y) => at(x, y) === '.' || at(x, y) === ',';

    const sides = {};
    for (const nb of CK.Rules.neighbors(region, nodeId)) { const s = CK.Rules.sideOf(region, nodeId, nb); if (s) sides[s] = nb; }
    const gap = nodeId === 'f1'; // Power Rail: the east bridge is retracted; echo the switch across the void
    const right = gap ? 20 : 27;

    // ---- the plaza: rows 1..14, with seeded bites out of the corners and edges ----
    for (let y = 1; y <= 14; y++) {
      let x0 = 2; let x1 = right;
      const top = y <= 3; const bottom = y >= 12;
      if (top || bottom) { const d = top ? 4 - y : y - 11; x0 += Math.floor(rng() * (d + 1)); x1 -= Math.floor(rng() * (d + 1)); }
      else if (y < 6 || y > 9) { if (rng() < 0.3) x0 += 1; if (rng() < 0.3) x1 -= 1; }
      for (let x = x0; x <= x1; x++) set(x, y, rng() < 0.07 ? ',' : '.');
    }
    for (let x = 3; x <= 26; x++) set(x, 0, '#'); // back wall

    // ---- doors and the bridges that reach them ----
    if (sides.n) { set(14, 0, 'D'); set(15, 0, 'D'); set(14, 1, '.'); set(15, 1, '.'); }
    if (sides.s) { set(14, 16, 'D'); set(15, 16, 'D'); for (const x of [14, 15]) { set(x, 15, '='); set(x, 14, '.'); } }
    if (sides.w) { for (const y of [7, 8]) { set(0, y, 'D'); set(1, y, '='); set(2, y, '.'); } }
    if (sides.e) {
      for (const y of [7, 8]) {
        set(29, y, 'D');
        if (gap) { for (let x = right + 1; x <= 28; x++) set(x, y, x >= 23 && x <= 26 ? '_' : x >= 27 ? '.' : '='); }
        else { set(28, y, '='); set(27, y, '.'); }
      }
      if (gap) { for (const y of [6, 9]) set(27, y, '.'); set(28, 9, '.'); set(28, 6, '!'); }
    }
    if (node.kind === 'exit') { for (const y of [7, 8]) { set(28, y, '>'); set(29, y, '>'); set(27, y, '.'); } }

    // ---- landmarks along the back wall, never in front of the north door ----
    const memoryCorner = nodeId === 'f2' || nodeId === 'g2';
    const roll1 = rng() < 0.75; const roll2 = rng() < 0.75 && !gap; // always consumed, so room contents stay the same as before the area looks
    const lm = (letter, x0, x1) => { for (let y = 1; y <= 2; y++) for (let x = x0; x <= x1; x++) if (isFloor(x, y)) set(x, y, letter); };
    const zone = node.zone;
    if (!zone) { // GRUB Gate: a chip and a heat sink at random
      if (roll1) lm('H', 3, 6);
      if (roll2) lm('T', 22, 24);
    } else if (zone === 'power') { // capacitor banks; CMOS Cell gets a giant coin battery
      lm('U', 3, 8);
      if (nodeId === 'f2') lm('V', 21, 24); else if (!gap) lm('U', 20, 25);
    } else if (zone === 'rom') { // rows of ROM chips; the Vault holds the padlocked BIOS chip
      lm('R', 3, 9);
      if (nodeId === 'f3') lm('Z', 19, 24); else lm('R', 19, 25);
    } else if (zone === 'ram') { // rows of RAM sticks
      lm('M', 3, 10); lm('M', 19, 26);
    } else if (zone === 'lanes') { // PCIe slots; Clock Gen has the crystal can
      lm('L', 3, 10);
      if (nodeId === 'f11') lm('Q', 21, 24); else if (nodeId !== 'f9') lm('L', 19, 26);
    } // the boss arena and the gate room are left bare: the floor carries the look

    // ---- interior machines: two per room in the quadrants, so the middle isn't just floor. The cross between the doors stays clear. ----
    const INTERIOR = { power: ['U', 4], rom: ['R', 5], ram: ['M', 5], lanes: ['L', 5] };
    if (zone && INTERIOR[zone] && node.kind !== 'start') {
      const [letter, w] = INTERIOR[zone]; const ir = CK.rng(hash(region.id + ':in:' + nodeId)); // its own stream: the rest of the room is unchanged
      const quads = [[4, 4], [20, 4], [4, 10], [20, 10]].filter(([qx, qy]) => !(node.friend && qx === 20 && qy === 4)); // keep the NPC spot open
      for (let i = quads.length - 1; i > 0; i--) { const j = Math.floor(ir() * (i + 1)); [quads[i], quads[j]] = [quads[j], quads[i]]; }
      for (const [qx, qy] of quads.slice(0, 2)) for (let y = qy; y <= qy + 1; y++) for (let x = qx; x < qx + w; x++) if (isFloor(x, y) && x <= right - 2) set(x, y, letter);
    }

    // ---- what the room is for ----
    const free = (x, y) => isFloor(x, y);
    if (node.kind === 'start' || node.kind === 'character') {
      set(9, 3, 't');
      if (node.kind === 'character' && node.ref !== 'pip') set(19, 4, 'c');
    } else if (node.kind === 'circuit') set(12, 3, 't');
    else if (node.kind === 'item') set(14, 7, 'p');
    else if (node.kind === 'memory') {
      if (memoryCorner) { set(14, 1, '*'); set(13, 1, 'b'); set(15, 1, 'b'); set(14, 2, 'b'); }
      else set(14, 7, '*');
    } else if (node.kind === 'boss') set(14, 7, SPAWN_LETTER[node.ref.creature]);
    if (node.friend) set(19, 4, 'c'); // an optional Firmware neighbour (see world.js FRIENDS)
    if (nodeId === 'g7') set(3, 5, 's');

    // capacitor pillars for cover (not in boss arenas)
    if (node.kind !== 'boss') {
      for (const [x, y] of [[7, 5], [22, 5], [8, 10], [21, 10]]) if (rng() < 0.35 && free(x, y) && x <= right - 2) set(x, y, 'o');
    }

    // problem rooms: creatures well away from every door
    if (node.kind === 'problem') {
      const letter = SPAWN_LETTER[node.ref.creature]; const want = CK.World.CREATURES[node.ref.creature].count;
      const doorTiles = Object.keys(sides).flatMap((s) => DOOR[s]);
      const placed = [];
      const okSpot = (x, y) => free(x, y) && y >= 2 && y <= 10
        && doorTiles.every(([dx, dy]) => Math.max(Math.abs(dx - x), Math.abs(dy - y)) >= 6)
        && placed.every(([px, py]) => Math.max(Math.abs(px - x), Math.abs(py - y)) >= 3)
        && [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].every(([dx, dy]) => !'HTRMVQUZL'.includes(at(x + dx, y + dy)) && !'HTRMVQUZL'.includes(at(x + 2 * dx, y + 2 * dy)));
      for (let tries = 0; placed.length < want && tries < 4000; tries++) {
        const x = 4 + Math.floor(rng() * 22); const y = 2 + Math.floor(rng() * 9);
        if (okSpot(x, y)) { placed.push([x, y]); set(x, y, letter); }
      }
      if (placed.length < want) throw new Error(`room ${nodeId}: no room for ${want} creatures`);
    }

    // corruption: blooms on the plaza rim (solid scenery), creep on the floor (walkable)
    const keep = (x, y) => (y >= 6 && y <= 9 && (x <= 3 || x >= right - 1)) || (x >= 12 && x <= 17 && (y <= 2 || y >= 13));
    for (let i = 0; i < 5; i++) {
      const x = 2 + Math.floor(rng() * (right - 1)); const y = 1 + Math.floor(rng() * 14);
      if (!free(x, y) || keep(x, y)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) === '~')) set(x, y, '&');
    }
    for (let c = 0; c < 3; c++) {
      const cx = 4 + Math.floor(rng() * (right - 6)); const cy = 3 + Math.floor(rng() * 9);
      for (let i = 0; i < 4; i++) { const x = cx + Math.floor(rng() * 3) - 1; const y = cy + Math.floor(rng() * 2); if (free(x, y)) set(x, y, '%'); }
    }

    // the default spot (fast travel and checkpoint arrivals)
    const px = gap ? 10 : 14;
    let spot = null;
    for (let r = 0; r < 8 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
      const x = px + dx; const y = 11 + dy; if ((at(x, y) === '.' || at(x, y) === ',' || at(x, y) === '%')) spot = [x, y];
    }
    set(spot[0], spot[1], 'P');

    return g.map((row) => row.join(''));
  }

  CK.RoomGen = { build, SPAWN_LETTER, hash };
})(typeof window !== 'undefined' ? window : globalThis);
