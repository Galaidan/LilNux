/* Colonel Kernel — original Neon Circuit pixel art, authored as palette-indexed text grids. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const PALETTE = {
    k: '#060a1c', n: '#14103a', c: '#38f2ff', m: '#ff4fd8', v: '#8b5cff', g: '#6dffb0', a: '#ffb347', r: '#ff5d73',
    y: '#ffd166', w: '#e8f1ff', d: '#7f8bb3', s: '#1c2448', S: '#2b3768', W: '#ffffff', b: '#0b0b10', o: '#f5a623',
    B: '#18285a', e: '#0c1430', G: '#c99a2e', L: '#4a5a8a', C: '#1673d6', N: '#0d1430', F: '#161f48', f: '#1b2654',
    V: '#4b2fa0', R: '#a8324a', M: '#9b2f8a',
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
