/* Colonel Kernel — original Neon Circuit pixel art, authored as palette-indexed text grids. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const PALETTE = {
    k: '#060a1c', n: '#14103a', c: '#38f2ff', m: '#ff4fd8', v: '#8b5cff', g: '#6dffb0', a: '#ffb347', r: '#ff5d73',
    y: '#ffd166', w: '#e8f1ff', d: '#7f8bb3', s: '#1c2448', S: '#2b3768', W: '#ffffff', b: '#0b0b10', o: '#f5a623',
    B: '#18285a', e: '#0c1430', G: '#c99a2e', L: '#4a5a8a', C: '#1673d6', N: '#0d1430', F: '#161f48', f: '#1b2654',
    V: '#4b2fa0', R: '#a8324a', M: '#9b2f8a',
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
  const CAP = (emblem) => [
    'kkkkkkkk',
    'kkBBBBBBBBkk',
    'kBBBBBBBBBBBBk',
    emblem ? 'kBBBBBBbbBBBBBBk' : 'kBBBBBBBBBBBBBBk',
    emblem ? 'kBBBBBbWWbBBBBBk' : 'kBBBBBBBBBBBBBBk',
    'kyyyyyyyyyyyyyyk',
    'keeeeeeeeeeeeeeeek',
  ];
  const FACE = ['kSSSSSSSSSSSSSSk', 'kSmmmvvvvvvcccSk', 'kSmWWvvvvvvWWcSk', 'kSmmmvvvvvvcccSk', 'kkSSSSSSSSSSSSkk'];
  const BACK_HEAD = ['kSSSSSSSSSSSSSSk', 'kSSSSSSSSSSSSSSk', 'kSSSLSSSSSSLSSSk', 'kSSSSSSSSSSSSSSk', 'kkSSSSSSSSSSSSkk'];
  const BODY = (front) => [
    'kyyykSSSSSSSSkyyyk',
    'kGyGkSSSSSSSSkGyGk',
    front ? 'kssksSSSccSSSskssk' : 'kssksSSSSSSSSskssk',
    front ? 'kssksSScWWcSSskssk' : 'kssksSSSSSSSSskssk',
    front ? 'kssksSScWWcSSskssk' : 'kssksSSSLLSSSskssk',
    front ? 'kssksSSSccSSSskssk' : 'kssksSSSSSSSSskssk',
    'kssksccccccccskssk',
    'kLLksSSSSSSSSskLLk',
    'kkkksssssssssskkkk',
    'kssssssssssk',
  ];
  const LEGS_STAND = ['ksssskkssssk', 'kSSSk..kSSSk', 'kSSSk..kSSSk', 'kSSSk..kSSSk', 'ksssk..ksssk', 'kkkkk..kkkkk'];
  const LEGS_STEP = ['ksssskkssssk', 'kSSSk..kSSSk', 'kSSSk..kSSSk', 'ksssk..kSSSk', 'kkkkk..ksssk', '.......kkkkk'];
  const front = (legs) => centre(CAP(true).concat(FACE, BODY(true), legs), 32, 32, 2);
  const back = (legs) => centre(CAP(false).concat(BACK_HEAD, BODY(false), legs), 32, 32, 2);

  const SIDE_TOP = [
    '.....kkkkkkkk.......',
    '...kkBBBBBBBBkk.....',
    '..kBBBBBBBBBBBBk....',
    '..kBBBBBBBBbbBBk....',
    '..kBBBBBBBbWWbBk....',
    '..kyyyyyyyyyyyyk....',
    '..keeeeeeeeeeeeeeek.',
    '...kSSSSSSSSSSSk....',
    '...kSSSSSSSmmvck....',
    '...kSSSSSSSmvWck....',
    '...kSSSSSSSmmvck....',
    '...kkSSSSSSSSSkk....',
    '....kyyykSSSSSk.....',
    '....kGyGkSSSSSk.....',
    '....ksskSSSSSck.....',
    '....ksskSSSSSWk.....',
    '....ksskSSSSSck.....',
    '....kLLkSSSSSSk.....',
    '....kkkkcccccck.....',
    '.....kSSSSSSSk......',
    '.....ksssssssk......',
  ];
  const SIDE_LEGS_STAND = ['.....ksssksssk......', '.....kSSSkSSSk......', '.....kSSSkSSSk......', '.....kSSSkSSSk......', '.....ksssksssk......', '.....kkkkkkkkkkk....'];
  const SIDE_LEGS_STEP = ['.....ksssksssk......', '....kSSSk.kSSSk.....', '...kSSSk...kSSSk....', '...kSSSk...kSSSk....', '..kkkkk.....kkkkk...', '....................'];
  const side = (legs) => centre(SIDE_TOP.concat(legs), 32, 32, 2);

  const down0 = front(LEGS_STAND); const up0 = back(LEGS_STAND); const side0 = side(SIDE_LEGS_STAND);

  // Attack poses: the arm thrusts out with a bright `kill` energy edge (the swing arc is drawn by the scene).
  const attackDown = patch(down0, 22, 20, ['kLLk', 'kcck', 'kcWk', 'kcWk', '.kk.']);
  const attackUp = patch(up0, 22, 7, ['.kk.', 'kcWk', 'kcWk', 'kcck', 'kLLk', 'kssk']);
  const attackSide = patch(side0, 19, 17, ['kkkkkkk', 'LLcccWWk', 'kkkkkkk']);
  const dash = patch(side(SIDE_LEGS_STEP), 0, 14, ['ccc.....', '........', '.cccc...', '........', 'cc......']);

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

  const SET = {
    colonel_down_0: { rows: down0 }, colonel_down_1: { rows: front(LEGS_STEP) },
    colonel_up_0: { rows: up0 }, colonel_up_1: { rows: back(LEGS_STEP) },
    colonel_side_0: { rows: side0 }, colonel_side_1: { rows: side(SIDE_LEGS_STEP) },
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
