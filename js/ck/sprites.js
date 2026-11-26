/* Colonel Kernel — original Neon Circuit pixel art, authored as palette-indexed text grids. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const PALETTE = {
    k: '#060a1c', n: '#14103a', c: '#38f2ff', m: '#ff4fd8', v: '#8b5cff', g: '#6dffb0', a: '#ffb347', r: '#ff5d73',
    y: '#ffd166', w: '#e8f1ff', d: '#7f8bb3', s: '#1c2448', S: '#2b3768', W: '#ffffff', b: '#0b0b10', o: '#f5a623',
    B: '#18285a', e: '#0c1430', G: '#c99a2e', L: '#4a5a8a', C: '#1673d6', N: '#0d1430', F: '#161f48', f: '#1b2654',
    V: '#4b2fa0', R: '#a8324a', M: '#9b2f8a', X: '#6e1c36',
    l: '#b6ff5c', E: '#4f8a1e', O: '#c4721a', A: '#8a5418', T: '#f4f7ff', Q: '#2a0f33',
  };

  // ---- helpers: build rows from centred strings and patches ---------------------------------
  const blank = (w, h) => Array.from({ length: h }, () => '.'.repeat(w));
  function centre(lines, w, h, top) {
    const out = blank(w, h);
    lines.forEach((s, i) => {
      const y = (top || 0) + i; if (y < 0 || y >= h || !s) return;
      const x0 = Math.floor((w - s.length) / 2);
      out[y] = out[y].slice(0, x0) + s + out[y].slice(x0 + s.length);
    });
    return out;
  }
  // Paste patch rows at (x, y); '.' in the patch keeps what's underneath.
  function patch(rows, x, y, lines) {
    const out = rows.slice();
    lines.forEach((s, i) => {
      const r = y + i; if (r < 0 || r >= out.length) return;
      const row = out[r].split('');
      for (let j = 0; j < s.length; j++) if (s[j] !== '.' && x + j >= 0 && x + j < row.length) row[x + j] = s[j];
      out[r] = row.join('');
    });
    return out;
  }
  function grid(w, h, fn) {
    const out = [];
    for (let y = 0; y < h; y++) { let row = ''; for (let x = 0; x < w; x++) row += fn(x, y) || '.'; out.push(row); }
    return out;
  }

  // ---- Colonel Kernel (32x32, feet at row 29) ------------------------------------------------
  // Built from simple shapes (wedge pauldrons, a tapered chest plate, a flared cape) and outlined
  // automatically, so every pose keeps the same angular silhouette. Light comes from the upper left.
  function shapes(w, h, layers) { // later layers paint over earlier ones; returns a grid of palette keys / null
    const g = Array.from({ length: h }, () => Array(w).fill(null));
    for (const f of layers) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = f(x, y); if (c) g[y][x] = c; }
    return g;
  }
  function outline(g) { // a 1 px dark outline round the silhouette
    const out = g.map((r) => r.slice());
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
      if (g[y][x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx])) out[y][x] = 'k';
    }
    return out.map((r) => r.map((c) => c || '.').join(''));
  }
  const inPoly = (pts) => (x, y) => { // pixel centre inside a polygon (continuous coordinates)
    const px = x + 0.5; const py = y + 0.5; let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]; const [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const box = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const flipX = (pts) => pts.map(([x, y]) => [32 - x, y]);
  const layer = (test, paint) => (x, y) => (test(x, y) ? (typeof paint === 'function' ? paint(x, y) : paint) : null);

  // pauldron: a sharp wedge pointing up and out, gold along its top edge, shadowed underneath
  const PAULDRON_L = [[2.5, 11.5], [6, 14.2], [12, 15], [11.5, 17.5], [9, 19], [6, 18.2]];
  const pauldron = (pts) => { const inP = inPoly(pts); return layer(inP, (x, y) => (!inP(x, y - 1) ? 'y' : !inP(x, y + 1) ? 'G' : !inP(x, y - 2) ? 'L' : 'S')); };
  const capeShade = (inC, edgeLining) => (x, y) => {
    if (!inC(x, y)) return null;
    if (y >= 27 && x % 3 === 0) return null; // a ragged hem
    if (edgeLining && y >= 23 && (!inC(x - 1, y) || !inC(x + 1, y))) return 'M'; // the lining shows where it flares
    return x % 4 === 1 && y > 18 ? 'X' : 'R'; // long folds
  };
  // head: an angular visor helmet under a peaked officer cap with the penguin emblem
  const capLayers = (emblem) => [
    layer(box(11, 2, 20, 2), 'B'), layer(box(10, 3, 21, 3), 'B'), layer(box(9, 4, 22, 5), 'B'),
    layer((x, y) => emblem && ((y === 4 && (x === 15 || x === 16)) || (y === 5 && (x === 14 || x === 17))), 'b'),
    layer((x, y) => emblem && y === 5 && (x === 15 || x === 16), 'W'),
    layer(box(9, 6, 22, 6), 'y'), layer(box(7, 7, 24, 7), 'e'),
  ];
  const VISOR = { 9: 'mmvvvvvvcc', 10: 'mWWvvvvWWc', 11: 'mmvvvvvvcc' };
  const faceFront = [
    layer(box(10, 8, 21, 12), 'S'), layer(box(12, 13, 19, 13), 'S'), layer(box(10, 8, 10, 12), 'L'),
    (x, y) => (VISOR[y] && x >= 11 && x <= 20 ? VISOR[y][x - 11] : null),
  ];
  const faceBack = [layer(box(10, 8, 21, 12), 'S'), layer(box(12, 13, 19, 13), 's'), layer((x, y) => y === 10 && (x === 13 || x === 18), 'L')];
  const legsFront = (step) => [
    layer(box(11, 23, 14, step ? 27 : 28), (x, y) => (y >= (step ? 25 : 26) ? 's' : 'S')),
    layer(box(17, 23, 20, 28), (x, y) => (y >= 26 ? 's' : x === 20 ? 's' : 'S')),
    layer((x, y) => y === (step ? 25 : 26) && ((x >= 11 && x <= 14) || (x >= 17 && x <= 20)), 'L'), // boot cuffs
  ];
  const chest = [
    layer(inPoly([[9, 15], [23, 15], [20.5, 23], [11.5, 23]]), (x, y) => (x >= 19 ? 's' : 'S')),
    layer((x, y) => y >= 16 && y <= 20 && (x === 11 + (y - 16) || x === 20 - (y - 16)), 'L'), // V plate edges
    layer((x, y) => (y === 17 || y === 19) && (x === 15 || x === 16), 'c'), layer((x, y) => y === 18 && (x === 15 || x === 16), 'W'), // core
    layer(box(11, 22, 20, 22), 'G'), layer(box(15, 22, 16, 22), 'y'), // belt
  ];
  const armsFront = [layer(box(7, 18, 9, 24), (x, y) => (y === 24 ? 'L' : x === 7 ? 'L' : 'S')), layer(box(22, 18, 24, 24), (x, y) => (y === 24 ? 'L' : x === 24 ? 's' : 'S'))];
  const CAPE_FRONT = [[8, 15], [24, 15], [26.5, 28], [5.5, 28]];
  const CAPE_BACK = [[8, 15], [24, 15], [26.5, 28], [5.5, 28]];

  const front = (step) => outline(shapes(32, 32, [capeShade(inPoly(CAPE_FRONT), true)].concat(legsFront(step), armsFront, chest,
    [pauldron(PAULDRON_L), pauldron(flipX(PAULDRON_L))], faceFront, capLayers(true))));
  const back = (step) => outline(shapes(32, 32, legsFront(step).concat(armsFront, chest, [capeShade(inPoly(CAPE_BACK), false)],
    [pauldron(PAULDRON_L), pauldron(flipX(PAULDRON_L))], faceBack, capLayers(false))));

  // side view (facing right; the game mirrors it for left): the cape trails behind and flares when walking
  const SIDE_CAPE = { stand: [[10, 15], [14, 15], [13, 22], [8, 28.5], [4, 28.5], [8, 20]], step: [[10, 15], [14, 15], [12, 21], [5, 27.5], [1.5, 26], [7, 19]],
    dash: [[10, 15], [14, 15.5], [11, 20], [1, 21], [0.5, 17.5], [6, 16]] };
  const sideLegs = (step) => (step
    ? [layer(inPoly([[10, 23], [14, 23], [12.5, 29], [9, 29]]), (x, y) => (y >= 26 ? 's' : 'S')), layer(inPoly([[15, 23], [19, 23], [21.5, 29], [17.5, 29]]), (x, y) => (y >= 26 ? 's' : 'S'))]
    : [layer(box(13, 23, 18, 28), (x, y) => (y >= 26 ? 's' : x === 15 ? 's' : 'S')), layer(box(19, 28, 19, 28), 's')]);
  const SIDE_PAULDRON = [[8, 12], [11.5, 14.5], [18, 15], [18, 18.5], [15.5, 20.5], [11, 19.5]];
  const sideBody = [
    layer(inPoly([[11.5, 15], [20.5, 15], [19.5, 23], [12.5, 23]]), (x, y) => (x >= 19 ? 'L' : x <= 13 ? 's' : 'S')),
    layer((x, y) => x === 19 && (y === 17 || y === 19), 'c'), layer((x, y) => x === 19 && y === 18, 'W'),
    layer(box(13, 22, 19, 22), 'G'), layer(box(16, 18, 18, 24), (x, y) => (y === 24 ? 'L' : 'S')), // arm
  ];
  const sideHead = [
    layer(box(12, 2, 19, 2), 'B'), layer(box(11, 3, 20, 5), 'B'), layer((x, y) => (y === 4 && (x === 17 || x === 18)) || (y === 5 && (x === 16 || x === 19)), 'b'), layer((x, y) => y === 5 && (x === 17 || x === 18), 'W'),
    layer(box(11, 6, 20, 6), 'y'), layer(box(11, 7, 23, 7), 'e'),
    layer(box(12, 8, 20, 12), 'S'), layer(box(13, 13, 19, 13), 'S'), layer(box(12, 8, 12, 12), 's'),
    (x, y) => ({ 9: 'mmvc', 10: 'mvWc', 11: 'mmvc' }[y] && x >= 17 && x <= 20 ? { 9: 'mmvc', 10: 'mvWc', 11: 'mmvc' }[y][x - 17] : null),
  ];
  const side = (pose) => outline(shapes(32, 32, [capeShade(inPoly(SIDE_CAPE[pose]), false)].concat(sideLegs(pose !== 'stand'), sideBody, [pauldron(SIDE_PAULDRON)], sideHead)));

  const down0 = front(false); const up0 = back(false); const side0 = side('stand');

  // Attack poses: the arm thrusts out with a bright `kill` energy edge (the swing arc is drawn by the scene).
  // His sword: a curved, single-edged blade that widens toward the tip (scimitar) on a gold guard with a
  // knuckle bow (sabre). W/w blade, c the glowing cutting edge on the outer curve, y/G gold, b grip, L hand.
  const attackSide = patch(side0, 19, 11, [ // held out front, curving up
    '...........k.',
    '..........kWk',
    '.........kWck',
    '........kWWck',
    '.......kWWck.',
    '.....kkWWcck.',
    '....kyWWcck..',
    'kkkkkyWcck...',
    'SLbbbykkk....',
    'kLGkkyk......',
    '.kGGGGk......',
    '..kkkk.......',
  ]);
  const attackDown = patch(down0, 23, 17, [ // swept out to his side, curving down
    '.kk......',
    'kyykkk...',
    'kbyWWWkk.',
    'kLyccWWWk',
    '.kGkkccWk',
    '..k..kkcW',
    '.......kc',
    '........k',
  ]);
  const attackUp = patch(up0, 23, 1, [ // raised overhead, curving forward
    '......k.',
    '.....kWk',
    '....kWck',
    '...kWWck',
    '...kWcck',
    '..kWWck.',
    '..kWck..',
    '..kWck..',
    '.kyyyyk.',
    '..kbk...',
    '..kLk...',
    '.kSSk...',
    'kSSk....',
  ]);
  const dash = patch(side('dash'), 0, 13, ['........', 'ccc.....', '........', '.cccc...', '........', 'cc......']);

  // ---- Pip (16x16): one big eye, a little magenta "1" badge ----------------------------------
  const pip = grid(16, 16, (x, y) => {
    const cx = 7, cy = 8.5; const d = Math.hypot(x - cx, y - cy);
    const bd = Math.hypot(x - 13, y - 2.5);
    if (bd < 1.6) return x === 13 ? 'W' : 'm';
    if (bd < 2.5) return 'k';
    if (d > 6.9) return null;
    if (d > 5.9) return 'k';
    const ed = Math.hypot(x - cx, y - (cy - 0.5));
    if (Math.hypot(x - (cx + 0.5), y - cy) < 1.5) return (x === 8 && y === 7) ? 'W' : 'b';
    if (ed < 3.2) return 'W';
    if (Math.hypot(x - 4, y - 5) < 1.3) return 'W';
    return (x - cx) + (y - cy) > 3.5 ? 'C' : 'c';
  });

  // ---- Glitch Mite (16x16, two wiggle frames) ------------------------------------------------
  const MITE_BODY = [
    '................', '................', '................', null, null,
    '....kkkkkkkk....', '...kvvmvvmvvk...', '..kvrrvvvvrrvk..', '..kvrWvvvvrWvk..', '..kvvvvmmvvvvk..',
    '..kvmvvvvvvmvk..', '...kvvvvvvvvk...', null, null, '................', '................',
  ];
  const mite = (a1, a2, l1, l2) => MITE_BODY.map((r, i) => r || [a1, a2][i - 3] || [l1, l2][i - 12]);
  const mite0 = mite('....k......k....', '.....k....k.....', '..k.kkkkkkkk.k..', '.k..k......k..k.');
  const mite1 = mite('...k........k...', '....k......k....', '...kkkkkkkkkk...', '..k.k......k.k..');

  // ---- projectiles ----------------------------------------------------------------------------
  const orb = ['.kkkk.', 'krWWrk', 'kWrrrk', 'krrrrk', 'krrrrk', '.kkkk.'];
  const bolt = ['..kkkkk.', 'kcWWWWck', 'kcWWWWck', '..kkkkk.'];

  // ---- tiles (16x16) ----------------------------------------------------------------------------
  const floor = grid(16, 16, (x, y) => (x === 0 || y === 0 ? 'N' : (x === 8 && y === 8 ? 's' : 'F')));
  const floorAlt = grid(16, 16, (x, y) => {
    if (x === 0 || y === 0) return 'N';
    if (y === 8 && x >= 3 && x <= 12) return (x === 3 || x === 12) ? 'd' : 'S';
    if (x === 12 && y >= 4 && y < 8) return 'S';
    return 'f';
  });
  const wallTop = grid(16, 16, (x, y) => {
    if (y === 0) return 'L';
    if (y === 15) return 'k';
    if ((x === 3 || x === 12) && (y === 4 || y === 11)) return 'n';
    return 'S';
  });
  const wallFront = grid(16, 16, (x, y) => {
    if (y === 0) return 'L';
    if (y === 15) return 'k';
    if (x === 0 || x === 8) return 'k';
    if (y >= 6 && y <= 7 && x >= 3 && x <= 5) return 'C';
    return y < 3 ? 'S' : 's';
  });
  const door = grid(16, 16, (x, y) => {
    if (y === 0) return 'L';
    if (x <= 1 || x >= 14) return 'v';
    if (y === 2 && x >= 3 && x <= 12) return 'c';
    if (y <= 3) return 'V';
    return y === 15 ? 'k' : 'n';
  });

  // ---- Chapter 1 characters (all original) ---------------------------------------------------------
  const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  // Bios (24x28): a guardian chip on two legs, amber visor, pins down both sides.
  const bios = grid(24, 28, (x, y) => {
    if (y >= 24) return (x >= 7 && x <= 9) || (x >= 14 && x <= 16) ? (y === 27 ? 'k' : 'L') : null;
    if (y < 3) return null;
    if ((x === 2 || x === 21) && y >= 7 && y <= 21 && y % 3 === 1) return 'd'; // pins
    if (x < 3 || x > 20) return null;
    if (x === 3 || x === 20 || y === 3 || y === 23) return 'k';
    if (y >= 8 && y <= 11 && x >= 5 && x <= 18) return (y === 8 || y === 11) ? 'A' : (x === 8 || x === 15) ? 'W' : 'a'; // visor
    if (y === 4) return 'S';
    if (y >= 15 && y <= 19 && x >= 9 && x <= 14) return (x + y) % 2 ? 'a' : 'y'; // core
    if ((x === 6 || x === 17) && y >= 14 && y <= 20) return 'L';
    return y < 13 ? 'S' : 's';
  });
  // Grub (24x24): a friendly lime bootloader grub with a tiny dark cap.
  const grubSpr = grid(24, 24, (x, y) => {
    if (y <= 5 && y >= 2 && x >= 9 && x <= 16) return y === 5 ? 'l' : y === 2 && (x === 9 || x === 16) ? null : 'k'; // cap
    if (y === 5 && x >= 16 && x <= 19) return 'k'; // brim
    const segs = [[12, 10, 6, 5], [10, 15, 7, 4], [13, 19, 7, 3.5]];
    let hit = -1; segs.forEach(([cx, cy, rx, ry], i) => { if (hit < 0 && inEll(x, y, cx, cy, rx, ry)) hit = i; });
    if (hit < 0) return y >= 21 && y <= 22 && (x === 8 || x === 12 || x === 16) ? 'E' : null;
    const [cx, cy, rx, ry] = segs[hit];
    if (!inEll(x, y, cx, cy, rx - 1, ry - 1)) return 'k';
    if (hit === 0 && (x === 10 || x === 14) && y === 9) return 'k'; // eyes
    if (hit === 0 && (x === 10 || x === 14) && y === 8) return 'W';
    if (hit === 0 && y === 12 && x >= 11 && x <= 13) return 'E'; // smile
    return y - cy < -1 ? 'l' : 'E';
  });
  // Lil Tux (24x28): a small original penguin, orange beak and feet.
  const liltux = grid(24, 28, (x, y) => {
    if (y >= 25) return (x >= 6 && x <= 10) || (x >= 13 && x <= 17) ? (y === 27 ? 'k' : 'o') : null;
    if (inEll(x, y, 11.5, 15, 9, 10)) {
      if (!inEll(x, y, 11.5, 15, 8, 9)) return 'k';
      if (y >= 9 && y <= 11 && x >= 10 && x <= 13) return y === 11 ? 'O' : 'o'; // beak
      if (y === 7 && (x === 8 || x === 15)) return 'b';
      if (y === 6 && (x === 8 || x === 15)) return 'W';
      if (inEll(x, y, 11.5, 17.5, 5.5, 6.5)) return 'T'; // belly
      return x < 5 || x > 18 ? 'B' : 'b';
    }
    return null;
  });

  // ---- creatures ----------------------------------------------------------------------------------
  // Loop Wisp (24x24): a violet flame curled into a loop, one eye.
  const wisp = (f) => grid(24, 24, (x, y) => {
    const wob = Math.sin((y + f * 3) * 0.9) * 1.4;
    const r = 9 - Math.max(0, (14 - y)) * 0.55;
    const d = Math.abs(x - 12 - wob);
    if (y < 2 || y > 21 || d > r) return null;
    if (y >= 9 && y <= 15 && Math.abs(x - 12 - wob) < 3 && Math.abs(y - 12) < 3) return Math.abs(x - 12 - wob) < 1.5 && Math.abs(y - 12) < 1.5 ? 'W' : 'k'; // loop hole
    if (y === 16 && Math.abs(x - 12) <= 1) return 'c'; // eye
    if (d > r - 1.2) return 'V';
    return y < 8 ? 'm' : d < r * 0.45 ? 'W' : 'v';
  });
  // Corrupt Boot Glitch (48x48): a cracked magenta boot-sector slab with a glitching core.
  const boot = (f) => grid(48, 48, (x, y) => {
    const shift = f && (y % 9 === 2 || y % 9 === 3) ? 2 : 0; x -= shift;
    if (x < 4 || x > 43 || y < 6 || y > 42) return null;
    if (x === 4 || x === 43 || y === 6 || y === 42) return 'k';
    if (x === 5 || y === 7) return 'm';
    if (x === 42 || y === 41) return 'M';
    if (Math.abs((x - 4) - (y - 6) * 1.1) < 0.8 && y < 24) return 'k'; // cracks
    if (Math.abs((44 - x) - (y - 20) * 0.9) < 0.8 && y > 24) return 'k';
    const d = Math.hypot(x - 24, y - 24);
    if (d < 4) return f ? 'm' : 'W';
    if (d < 6.5) return 'm';
    if (d < 8) return 'k';
    if ((y === 13 || y === 35) && x > 9 && x < 39 && x % 4 !== 0) return 'v'; // sector stripes
    return (x + y * 3) % 11 === 0 ? 'M' : 'Q';
  });
  // Missing Kernel Wraith (64x64): a hollow violet robe around a kernel-shaped hole.
  const wraith = (f) => grid(64, 64, (x, y) => {
    if (y < 4 || y > 60) return null;
    const half = y < 18 ? 6 + (y - 4) * 0.7 : 16 + (y - 18) * 0.35;
    const hem = y > 52 && ((x + f * 3) % 6 < 3) && y > 56;
    const d = Math.abs(x - 32);
    if (d > half || hem) return null;
    const hole = Math.abs(x - 32) + Math.abs(y - 32) * 0.8 < 10;
    if (hole) return Math.abs(x - 32) + Math.abs(y - 32) * 0.8 > 8.5 ? 'c' : null;
    if (y >= 12 && y <= 14 && (x === 28 || x === 36)) return f ? 'c' : 'W'; // eyes in the hood
    if (d > half - 1.2) return 'k';
    if (y < 18 && d > half - 3) return 'V';
    return (x + y + f) % 7 === 0 ? 'V' : 'v';
  });

  // ---- props ---------------------------------------------------------------------------------------
  const terminal = (on) => grid(16, 24, (x, y) => {
    if (y >= 18) return x >= 5 && x <= 10 ? (y === 23 ? 'k' : 'L') : null; // stand
    if (y < 2 || x < 1 || x > 14) return null;
    if (x === 1 || x === 14 || y === 2 || y === 17) return 'k';
    if (x === 2 || y === 3 || x === 13 || y === 16) return 'S';
    if (on) return (y === 6 || y === 9 || y === 12) && x >= 4 && x <= 11 - (y % 4) ? 'c' : 'e';
    return Math.abs(x - y + 2) < 1 ? 'm' : 'N';
  });
  const pedestal = grid(16, 16, (x, y) => {
    if (y < 6) return null;
    if (y === 6 || y === 15) return x >= 1 && x <= 14 ? 'k' : null;
    if (y === 7) return x >= 1 && x <= 14 ? 'w' : null;
    if (x >= 3 && x <= 12) return x === 3 || x === 12 ? 'k' : y === 9 ? 'c' : 'S';
    return null;
  });
  const icon = (fn) => grid(12, 12, fn);
  const modRam = icon((x, y) => (y >= 3 && y <= 8 ? (y === 3 || y === 8 || x === 0 || x === 11 ? 'k' : y === 7 ? 'y' : x % 3 === 1 ? 'k' : 'g') : null));
  const modFan = icon((x, y) => { const d = Math.hypot(x - 5.5, y - 5.5); if (d > 5.8) return null; if (d > 4.8) return 'k'; if (d < 1.5) return 'W'; return ((Math.atan2(y - 5.5, x - 5.5) + Math.PI) * 4 / Math.PI) % 2 < 1 ? 'c' : 'B'; });
  const modCpu = icon((x, y) => { if ((x === 0 || x === 11) && y % 2 === 1) return 'd'; if ((y === 0 || y === 11) && x % 2 === 1) return 'd'; if (x < 1 || x > 10 || y < 1 || y > 10) return null; if (x === 1 || x === 10 || y === 1 || y === 10) return 'k'; return x >= 4 && x <= 7 && y >= 4 && y <= 7 ? 'c' : 'S'; });
  const modSsd = icon((x, y) => (y >= 2 && y <= 9 ? (y === 2 || y === 9 || x === 0 || x === 11 ? 'k' : x >= 2 && x <= 4 && y >= 4 && y <= 7 ? 'm' : y === 5 && x > 5 ? 'w' : 'S') : null));
  const bits = icon((x, y) => { const d = Math.abs(x - 5.5) + Math.abs(y - 5.5); if (d > 5.5) return null; if (d > 4.5) return 'k'; return d < 2 ? 'W' : 'g'; });
  const crystal = grid(16, 20, (x, y) => {
    const d = Math.abs(x - 7.5) / 6 + Math.abs(y - 9.5) / 9.5; if (d > 1) return null; if (d > 0.85) return 'k';
    if (d < 0.25) return 'W'; return x < 8 ? 'v' : 'V';
  });
  const sign = grid(16, 24, (x, y) => {
    if (y >= 12) return x >= 7 && x <= 8 ? (y === 23 ? 'k' : 'L') : null;
    if (y < 2) return null;
    if (y === 2 || y === 11 || x === 0 || x === 15) return 'k';
    if (y === 6 && x >= 3 && x <= 12) return x === 12 ? 'l' : 'l';
    if (y === 4 || y === 8) return x >= 3 && x <= 9 ? 'd' : 'S';
    return 'S';
  });
  const switchSpr = (on) => grid(16, 16, (x, y) => {
    if (y < 3 || x < 3 || x > 12) return null;
    if (y === 15 || x === 3 || x === 12 || y === 3) return 'k';
    const d = Math.hypot(x - 7.5, y - 8.5);
    if (d < 2.5) return on ? 'g' : 'r';
    if (d < 3.5) return 'k';
    return y > 12 ? 's' : 'S';
  });
  const crack = grid(16, 16, (x, y) => {
    if (y === 15) return 'k';
    if (Math.abs(x - 8 - Math.sin(y * 0.8) * 3) < 0.8 || (y > 6 && Math.abs(x - 3 - (y - 6) * 0.5) < 0.6)) return 'k';
    return y < 4 ? 'w' : (x + y) % 5 === 0 ? 'L' : 'd';
  });
  const block = grid(16, 16, (x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return 'k';
    if (x === 1 || y === 1) return 'm';
    if ((x * 3 + y * 5) % 7 === 0) return 'W';
    return (x + y) % 4 < 2 ? 'v' : 'M';
  });
  const gate = grid(32, 32, (x, y) => {
    const inner = x >= 8 && x <= 23 && y >= 8;
    if (y < 2 || x < 2 || x > 29) return null;
    if (inner) return Math.abs(x - 15.5) < 6 && y > 10 ? ((x + y) % 3 ? 'c' : 'W') : 'e';
    if (x === 2 || x === 29 || y === 2) return 'k';
    if (x === 7 || x === 24 || (y === 7 && x > 7 && x < 24)) return 'k';
    return y === 4 ? 'a' : 'S';
  });
  const barrier = grid(16, 16, (x, y) => ((x + y) % 4 === 0 ? 'W' : (x + y) % 4 === 1 ? 'm' : (x - y + 32) % 6 === 0 ? 'v' : null));

  const SET = {
    bios: { rows: bios }, grub: { rows: grubSpr }, liltux: { rows: liltux },
    wisp_0: { rows: wisp(0) }, wisp_1: { rows: wisp(1) }, boot_0: { rows: boot(0) }, boot_1: { rows: boot(1) },
    wraith_0: { rows: wraith(0) }, wraith_1: { rows: wraith(1) },
    terminal: { rows: terminal(true) }, terminal_off: { rows: terminal(false) }, pedestal: { rows: pedestal },
    mod_ram: { rows: modRam }, mod_fan: { rows: modFan }, mod_cpu: { rows: modCpu }, mod_ssd: { rows: modSsd }, bits: { rows: bits },
    crystal: { rows: crystal }, sign: { rows: sign }, switch_off: { rows: switchSpr(false) }, switch_on: { rows: switchSpr(true) },
    crack: { rows: crack }, block: { rows: block }, gate: { rows: gate }, barrier: { rows: barrier },
    colonel_down_0: { rows: down0 }, colonel_down_1: { rows: front(true) },
    colonel_up_0: { rows: up0 }, colonel_up_1: { rows: back(true) },
    colonel_side_0: { rows: side0 }, colonel_side_1: { rows: side('step') },
    colonel_attack_down: { rows: attackDown }, colonel_attack_up: { rows: attackUp }, colonel_attack_side: { rows: attackSide },
    colonel_dash: { rows: dash },
    pip: { rows: pip }, mite_0: { rows: mite0 }, mite_1: { rows: mite1 },
    orb: { rows: orb }, bolt: { rows: bolt },
    tile_floor: { rows: floor }, tile_floor_alt: { rows: floorAlt },
    tile_wall_top: { rows: wallTop }, tile_wall_front: { rows: wallFront }, tile_door: { rows: door },
  };

  let builtCache = null;
  function built() {
    if (builtCache) return builtCache;
    builtCache = {};
    for (const [name, s] of Object.entries(SET)) builtCache[name] = CK.Pixel.build(s, PALETTE);
    return builtCache;
  }

  CK.Sprites = { PALETTE, SET, built, centre, patch, grid };
})(typeof window !== 'undefined' ? window : globalThis);
