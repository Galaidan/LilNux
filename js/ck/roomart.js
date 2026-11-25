/* Colonel Kernel — room art: "computer ruins with corrupted overgrowth".
 * Pale circuit-board plazas float over a dark data void. Giant chips, heat sinks and capacitors stand
 * at the back with white glowing cores, and NullNux corruption (magenta/violet) creeps over everything.
 * Everything static is painted once into canvases here; roomscene.js only animates on top.
 * Original hardware motifs only. Node-safe at load time (canvases are made only when paint() runs). */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});
  const TILE = 16;

  // Neon Circuit plus pale mint/teal tints of its own mint and cyan for the plazas.
  const ART = {
    void0: '#060a1c', void1: '#0d1430', void2: '#14103a', void3: '#1b2a5a',
    slab: '#a9e4d6', slabLo: '#9cd9cb', slabAlt: '#b4ebde', slabHi: '#c8f5ea', seam: '#7fbfb3',
    trace: '#74b3a8', pad: '#e6fff9', via: '#5f9e98', crack: '#6aa79c', rim: '#effffb',
    cliff0: '#5d9fa0', cliff1: '#3a6f80', cliff2: '#1f3d62', cliff3: '#111f44', strata: '#2c5872',
    wallTop: '#c9f3ea', wallTopLo: '#b2e6db', wallFront: '#5c9e9e', wallFrontLo: '#457f86', wallLine: '#2f5f6c',
    body: '#1c2448', bodyTop: '#2b3768', bodyHi: '#3c4a85', bodyLo: '#11183a', pin: '#9fb3d9', pinLo: '#4a5a8a', fin: '#7d8fb8', finHi: '#c9d4ef',
    capEdge: '#2a1a66', capMid: '#4b2fa0', capLit: '#6a48d0', capHi: '#a58bff', capStripe: '#8f7ad8', capTop: '#c9d4ef', capScore: '#8792b5',
    mag: '#ff4fd8', vio: '#8b5cff', magLo: '#9b2f8a', vioLo: '#4b2fa0', magHi: '#ffb3f0', magInk: '#3a0f3f',
    mint: '#6dffb0', cyan: '#38f2ff', coral: '#ff5d73', white: '#ffffff', shadow: 'rgba(20,58,70,0.42)',
  };

  function rngOf(seed) { // mulberry32: same picture every load
    let s = (seed >>> 0) || 1;
    return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hash = (a, b) => ((Math.imul(a + 11, 73856093) ^ Math.imul(b + 7, 19349663)) >>> 0) % 1000 / 1000;

  const tileAt = (room, tx, ty) => (tx < 0 || ty < 0 || tx >= room.cols || ty >= room.rows ? '~' : room.tiles[ty][tx]);
  const isVoid = (room, tx, ty) => tileAt(room, tx, ty) === '~';
  const WALK = { '.': 1, ',': 1, P: 1, m: 1, '%': 1, w: 1, G: 1, K: 1, '>': 1 };
  // Every legend character paint() understands (rooms.js has the meanings).
  const TILES = '#.,DPmo~&%HT=_!tcp*sb>wGK';
  // What paint() draws for each room tile: side doors are bridge ends, a retracted bridge is void,
  // props (terminal, NPC spot, pedestal, crystal, sign, switch, block, gate) stand on plain plaza.
  function artView(room) {
    const tiles = room.tiles.map((row, ty) => row.map((c) => {
      if (c === 'D' && ty > 0) return '=';
      if (c === '_') return '~';
      if ('tcp*s!b>'.includes(c)) return '.';
      return c;
    }));
    return { cols: room.cols, rows: room.rows, w: room.w, h: room.h, tiles, landmarks: room.landmarks || [] };
  }
  const isWall = (c) => c === '#' || c === 'D';

  // Void tiles with ground directly above them: where a plaza's cliff face hangs down.
  function cliffs(room) {
    const out = [];
    for (let ty = 1; ty < room.rows; ty++) for (let tx = 0; tx < room.cols; tx++) if (isVoid(room, tx, ty) && !isVoid(room, tx, ty - 1)) out.push({ tx, ty });
    return out;
  }

  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const dot = (g, x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const box = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

  function paint(room, opts) {
    opts = opts || {};
    room = artView(room);
    const accent = opts.accent || '#ffb347';
    const R = rngOf(opts.seed || 7);
    const ground = canvasOf(room.w, room.h); const g = ground.getContext('2d');
    const props = []; const cores = []; const leds = [];
    const walkPx = (x, y) => x >= 0 && y >= 0 && x < room.w && y < room.h && !!WALK[tileAt(room, Math.floor(x / TILE), Math.floor(y / TILE))];

    // ---- 1. slabs: big pale plates, seams every 3 tiles, a bevel highlight on each seam ----
    for (let ty = 0; ty < room.rows; ty++) for (let tx = 0; tx < room.cols; tx++) {
      const c = tileAt(room, tx, ty); if (c === '~' || isWall(c)) continue;
      const h = hash(Math.floor(tx / 3), Math.floor((ty + 1) / 3));
      box(g, tx * TILE, ty * TILE, TILE, TILE, h < 0.25 ? ART.slabLo : h > 0.8 ? ART.slabAlt : ART.slab);
    }
    for (let ty = 0; ty < room.rows; ty++) for (let tx = 0; tx < room.cols; tx++) {
      const c = tileAt(room, tx, ty); if (c === '~' || isWall(c)) continue;
      const x = tx * TILE; const y = ty * TILE; const ground_ = (a, b) => { const d = tileAt(room, a, b); return d !== '~' && !isWall(d); };
      if (tx % 3 === 0 && ground_(tx - 1, ty)) { box(g, x, y, 1, TILE, ART.seam); box(g, x + 1, y, 1, TILE, ART.slabHi); }
      if ((ty + 1) % 3 === 0 && ground_(tx, ty - 1)) { box(g, x, y, TILE, 1, ART.seam); box(g, x, y + 1, TILE, 1, ART.slabHi); }
    }

    // ---- 2. little surface-mount parts on alt-floor tiles ----
    for (let ty = 0; ty < room.rows; ty++) for (let tx = 0; tx < room.cols; tx++) {
      if (tileAt(room, tx, ty) !== ',') continue;
      const x = tx * TILE + 3 + Math.floor(R() * 5); const y = ty * TILE + 4 + Math.floor(R() * 6);
      if (R() < 0.5) { // small IC: dark body, pins top and bottom
        box(g, x, y + 4, 8, 1, ART.seam); box(g, x, y, 8, 4, ART.body); box(g, x, y, 8, 1, ART.bodyHi); dot(g, x + 1, y + 1, ART.pin);
        for (let i = 1; i < 8; i += 2) { dot(g, x + i, y - 1, ART.pin); dot(g, x + i, y + 4, ART.pinLo); }
      } else { // resistor: two pads and a body
        box(g, x, y + 1, 2, 2, ART.pad); box(g, x + 6, y + 1, 2, 2, ART.pad); box(g, x + 2, y, 4, 4, ART.bodyTop); box(g, x + 2, y + 4, 4, 1, ART.seam); dot(g, x + 3, y + 1, ART.capStripe);
      }
    }

    // ---- 3. traces: right-angle and 45° runs that cross slab seams, pads and vias at the ends ----
    const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const padAt = (x, y) => { if (!walkPx(x - 1, y - 1) || !walkPx(x + 1, y + 1)) return; box(g, x - 1, y - 1, 3, 3, ART.pad); dot(g, x, y, ART.via); };
    function run(x, y, d, steps, off) {
      const pts = [];
      for (const [len, nd] of steps) {
        for (let k = 0; k < len; k++) { x += DIRS[d][0]; y += DIRS[d][1]; pts.push([x, y]); }
        d = nd;
      }
      const [px, py] = DIRS[(d + 2) % 8];
      for (const [ax, ay] of pts) {
        const qx = ax + px * off; const qy = ay + py * off;
        if (!walkPx(qx, qy) || !walkPx(qx, qy + 1)) return pts.length;
        dot(g, qx, qy + 1, ART.slabHi); dot(g, qx, qy, ART.trace);
      }
      return pts.length;
    }
    for (let i = 0; i < 30; i++) {
      const x = 4 + Math.floor(R() * (room.w / 4 - 2)) * 4; const y = 4 + Math.floor(R() * (room.h / 4 - 2)) * 4;
      if (!walkPx(x, y)) continue;
      // each step: run `len` pixels in the current direction, then turn 45° or 90°
      const start = Math.floor(R() * 4) * 2; let d = start; const steps = []; const n = 2 + Math.floor(R() * 3);
      for (let s = 0; s < n; s++) { const turn = R() < 0.35 ? (R() < 0.5 ? 1 : -1) : (R() < 0.5 ? 2 : -2); d = (d + turn + 8) % 8; steps.push([6 + Math.floor(R() * 26), d]); }
      const bus = R() < 0.3 ? [0, 3, 6] : [0]; // sometimes a three-line bus
      for (const off of bus) run(x, y, start, steps, off);
      padAt(x, y);
      let ex = x; let ey = y; let dd = start;
      for (const [l, nd] of steps) { ex += DIRS[dd][0] * l; ey += DIRS[dd][1] * l; dd = nd; }
      if (walkPx(ex, ey)) padAt(ex, ey);
    }

    // ---- 4. cracks: the plaza is old ----
    for (let i = 0; i < 12; i++) {
      let x = Math.floor(R() * room.w); let y = Math.floor(R() * room.h); if (!walkPx(x, y)) continue;
      const horiz = R() < 0.5; const n = 6 + Math.floor(R() * 12);
      for (let k = 0; k < n; k++) {
        if (horiz) { x++; if (R() < 0.4) y += R() < 0.5 ? 1 : -1; } else { y++; if (R() < 0.4) x += R() < 0.5 ? 1 : -1; }
        if (!walkPx(x, y)) break;
        dot(g, x, y, ART.crack); if (walkPx(x + 1, y + 1)) dot(g, x + 1, y + 1, ART.slabHi);
      }
    }

    // ---- 5. walls and the gate ----
    for (let ty = 0; ty < room.rows; ty++) for (let tx = 0; tx < room.cols; tx++) {
      const c = tileAt(room, tx, ty); if (!isWall(c)) continue;
      const x = tx * TILE; const y = ty * TILE; const below = tileAt(room, tx, ty + 1);
      if (isWall(below) || below === '~') { // top face
        box(g, x, y, TILE, TILE, ART.wallTop);
        for (let k = 0; k < 5; k++) dot(g, x + Math.floor(R() * 16), y + Math.floor(R() * 16), ART.wallTopLo);
        continue;
      }
      if (c === 'D') { // gate: a dark port with a cyan frame
        const left = tileAt(room, tx - 1, ty) !== 'D'; const right = tileAt(room, tx + 1, ty) !== 'D';
        box(g, x, y, TILE, TILE, ART.void2); box(g, x, y, TILE, 4, ART.wallTop); box(g, x, y + 4, TILE, 1, accent);
        box(g, x, y + 6, TILE, 1, ART.cyan);
        if (left) { box(g, x, y, 2, TILE, ART.wallTop); box(g, x + 2, y + 6, 1, 10, ART.cyan); }
        if (right) { box(g, x + 14, y, 2, TILE, ART.wallTop); box(g, x + 13, y + 6, 1, 10, ART.cyan); }
        for (let k = 0; k < 3; k++) dot(g, x + 4 + Math.floor(R() * 8), y + 8 + Math.floor(R() * 7), R() < 0.5 ? ART.cyan : ART.vio);
        cores.push({ x: x + (right ? 0 : 16), y: y + 11, r: 16, color: ART.cyan, a: 0.35 });
        continue;
      }
      // front face: pale cap, region accent line, panelled face
      box(g, x, y, TILE, 4, ART.wallTop); box(g, x, y + 4, TILE, 1, accent);
      box(g, x, y + 5, TILE, 11, ART.wallFront); box(g, x, y + 10, TILE, 1, ART.wallFrontLo); box(g, x, y + 15, TILE, 1, ART.wallLine);
      for (let k = 0; k < TILE; k += 8) box(g, x + k, y + 5, 1, 10, ART.wallLine);
      if (isVoid(room, tx - 1, ty)) box(g, x, y, 1, TILE, ART.wallLine);
      if (isVoid(room, tx + 1, ty)) box(g, x + 15, y, 1, TILE, ART.wallLine);
      if (R() < 0.35) vines(x + 2 + Math.floor(R() * 12), y + 4, 3 + Math.floor(R() * 7));
      // contact shadow on the plaza below
      g.fillStyle = ART.shadow; g.fillRect(x, y + TILE, TILE, 3);
    }

    // ---- 6. plaza edges and cliff faces over the void ----
    for (let ty = 0; ty < room.rows; ty++) for (let tx = 0; tx < room.cols; tx++) {
      const c = tileAt(room, tx, ty); if (c === '~' || isWall(c)) continue;
      const x = tx * TILE; const y = ty * TILE;
      if (isVoid(room, tx, ty - 1)) box(g, x, y, TILE, 1, ART.rim);
      if (isVoid(room, tx - 1, ty)) box(g, x, y, 1, TILE, ART.rim);
      if (isVoid(room, tx + 1, ty)) box(g, x + 15, y, 1, TILE, ART.seam);
      if (isVoid(room, tx, ty + 1)) box(g, x, y + 15, TILE, 1, ART.rim);
    }
    for (const { tx, ty } of cliffs(room)) {
      const x = tx * TILE; const y = ty * TILE;
      const deeper = ty + 1 < room.rows && isVoid(room, tx, ty + 1);
      const depth = deeper ? 26 : 16;
      for (let yy = 0; yy < depth; yy++) {
        const col = yy < 4 ? ART.cliff0 : yy < 9 ? ART.cliff1 : yy < 14 ? ART.cliff2 : ART.cliff3;
        if (yy >= 18) { for (let xx = (yy % 2); xx < TILE; xx += 2) dot(g, x + xx, y + yy, col); } else box(g, x, y + yy, TILE, 1, col);
      }
      for (let xx = 0; xx < TILE; xx++) if (hash(x + xx, 3) < 0.18) box(g, x + xx, y + 2, 1, Math.floor(depth * 0.6), ART.strata);
      const endL = !(isVoid(room, tx - 1, ty) && !isVoid(room, tx - 1, ty - 1)); const endR = !(isVoid(room, tx + 1, ty) && !isVoid(room, tx + 1, ty - 1));
      if (endL) box(g, x, y, 1, depth - 4, ART.cliff2);
      if (endR) box(g, x + 15, y, 1, depth - 4, ART.cliff3);
      const bloomAbove = tileAt(room, tx, ty - 1) === '&' || tileAt(room, tx, ty - 1) === '%';
      const nv = bloomAbove ? 3 : R() < 0.4 ? 1 : 0;
      for (let k = 0; k < nv; k++) vines(x + 1 + Math.floor(R() * 14), y, 6 + Math.floor(R() * (depth - 6)));
    }

    // ---- 6b. bridges: narrow walkways of darker board with rails, cables sagging underneath ----
    for (let ty = 0; ty < room.rows; ty++) for (let tx = 0; tx < room.cols; tx++) {
      if (tileAt(room, tx, ty) !== '=') continue;
      const x = tx * TILE; const y = ty * TILE;
      const vert = tileAt(room, tx, ty - 1) === '=' || tileAt(room, tx, ty + 1) === '=' || ty === 0 || ty === room.rows - 1;
      box(g, x, y, TILE, TILE, ART.cliff0);
      for (let k = 2; k < TILE; k += 4) { if (vert) box(g, x + 1, y + k, TILE - 2, 2, ART.slabLo); else box(g, x + k, y + 1, 2, TILE - 2, ART.slabLo); }
      if (vert) { box(g, x, y, 1, TILE, ART.rim); box(g, x + 15, y, 1, TILE, ART.cliff2); }
      else { box(g, x, y, TILE, 1, ART.rim); box(g, x, y + 15, TILE, 1, ART.cliff2); }
    }

    // ---- 7. corruption creep on the floor (and spilling round blooms) ----
    function creep(cx, cy, n, spread) {
      for (let k = 0; k < n; k++) {
        const a = R() * Math.PI * 2; const r = Math.pow(R(), 1.6) * spread; // clumped at the heart, thinning at the edges
        const x = Math.round(cx + Math.cos(a) * r); const y = Math.round(cy + Math.sin(a) * r * 0.8);
        const tx = Math.floor(x / TILE); const ty = Math.floor(y / TILE); const c = tileAt(room, tx, ty);
        if (c === '~' || isWall(c)) continue;
        const p = R(); const col = p < 0.42 ? ART.magLo : p < 0.66 ? ART.mag : p < 0.88 ? ART.vio : ART.magHi;
        const s = R() < 0.25 ? 2 : 1; box(g, x, y, s, s, col);
      }
      for (let v = 0; v < 3; v++) {
        let x = cx; let y = cy; const dx = R() < 0.5 ? 1 : -1;
        for (let k = 0; k < 10 + Math.floor(R() * 12); k++) {
          x += R() < 0.6 ? dx : 0; y += R() < 0.5 ? (R() < 0.5 ? 1 : -1) : 0;
          const c = tileAt(room, Math.floor(x / TILE), Math.floor(y / TILE)); if (c === '~' || isWall(c)) break;
          dot(g, x, y, ART.vioLo); if (R() < 0.15) dot(g, x, y - 1, ART.mag);
        }
      }
    }
    for (let ty = 0; ty < room.rows; ty++) for (let tx = 0; tx < room.cols; tx++) {
      const c = tileAt(room, tx, ty);
      if (c === '%') creep(tx * TILE + 8, ty * TILE + 8, 120, 12);
      if (c === '&') creep(tx * TILE + 8, ty * TILE + 12, 40, 12);
    }

    // hanging cable vines (corruption) — drawn over walls, cliffs and landmarks
    function vines(x, y, len, gg) {
      gg = gg || g;
      const col = R() < 0.5 ? ART.vioLo : ART.magLo;
      for (let k = 0; k < len; k++) { dot(gg, x, y + k, col); if (R() < 0.12) { x += R() < 0.5 ? 1 : -1; } if (R() < 0.12) dot(gg, x + (R() < 0.5 ? 1 : -1), y + k, ART.mag); }
      dot(gg, x, y + len, ART.magHi);
    }

    // ---- 8. props: capacitors, blooms and landmarks (y-sorted by the scene) ----
    function groundShadow(x, y, w, h) { g.fillStyle = ART.shadow; g.fillRect(x + 3, y + 2, w, h); }
    function tint(x, y, r, color, a) {
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1;
    }

    for (let ty = 0; ty < room.rows; ty++) for (let tx = 0; tx < room.cols; tx++) {
      const c = tileAt(room, tx, ty); const x = tx * TILE; const y = ty * TILE;
      if (c === 'o') props.push(capacitor(x, y));
      if (c === '&') props.push(bloom(x, y));
    }
    for (const l of room.landmarks || []) props.push(l.kind === 'chip' ? chip(l) : heatsink(l));

    function capacitor(x, y) {
      const H = 34; const img = canvasOf(16, H); const c = img.getContext('2d');
      g.fillStyle = ART.shadow; g.beginPath(); g.ellipse(x + 10, y + 14, 8, 3, 0, 0, Math.PI * 2); g.fill();
      tint(x + 8, y + 12, 18, ART.mint, 0.22);
      const shade = [ART.capEdge, ART.capMid, ART.capLit, ART.capHi, ART.capLit, ART.capMid, ART.capMid, ART.capMid, ART.capStripe, ART.capStripe, ART.capMid, ART.capEdge];
      for (let i = 0; i < 12; i++) box(c, 2 + i, 8, 1, H - 10, shade[i]);
      for (let k = 12; k < H - 4; k += 4) box(c, 10, k, 2, 1, ART.capEdge); // polarity marks on the stripe
      box(c, 2, H - 3, 12, 1, ART.capEdge); box(c, 3, H - 2, 10, 1, ART.bodyLo);
      c.fillStyle = ART.capTop; c.beginPath(); c.ellipse(8, 8, 6, 3.5, 0, 0, Math.PI * 2); c.fill();
      box(c, 5, 8, 7, 1, ART.capScore); box(c, 8, 5, 1, 7, ART.capScore); dot(c, 8, 8, ART.white);
      box(c, 4, 5, 3, 1, ART.white);
      vines(3 + Math.floor(R() * 2), 12, 10 + Math.floor(R() * 10), c);
      cores.push({ x: x + 8, y: y + 16 - H + 8, r: 10, color: ART.mint, a: 0.5 });
      return { img, x, y: y + 16 - H, sortY: y + 16 };
    }

    function bloom(x, y) {
      const W = 26; const H = 32; const img = canvasOf(W, H); const c = img.getContext('2d');
      const shards = 4 + Math.floor(R() * 3);
      for (let s = 0; s < shards; s++) {
        const sw = 3 + Math.floor(R() * 4); const sh = 8 + Math.floor(R() * 20); const sx = 2 + Math.floor(R() * (W - sw - 4)); const base = H - 2 - Math.floor(R() * 3);
        for (let yy = 0; yy < sh; yy++) {
          const k = yy < 3 ? Math.max(1, Math.round((sw * (yy + 1)) / 4)) : sw; const x0 = sx + Math.floor((sw - k) / 2); const yp = base - sh + yy;
          box(c, x0, yp, k, 1, ART.mag); box(c, x0 + Math.ceil(k / 2), yp, Math.floor(k / 2), 1, ART.magLo);
          dot(c, x0 - 1, yp, ART.magInk); dot(c, x0 + k, yp, ART.magInk);
        }
        box(c, sx + Math.floor(sw / 2) - 1, base - sh + 1, 1, Math.max(2, sh - 4), ART.magHi);
      }
      for (let k = 0; k < 5; k++) { const bx = 2 + Math.floor(R() * (W - 5)); const by = 2 + Math.floor(R() * 12); box(c, bx, by, 2, 2, R() < 0.5 ? ART.mag : ART.vio); dot(c, bx, by, ART.magHi); }
      tint(x + 8, y + 10, 20, ART.mag, 0.28);
      cores.push({ x: x + 8, y: y + 2, r: 9, color: ART.mag, a: 0.45 });
      return { img, x: x - 5, y: y + 16 - H, sortY: y + 15 };
    }

    function chip(l) {
      const fw = l.w * TILE; const fh = l.h * TILE; const H = 10; const pad = 4; // a chip is a flat package: the top face is the show
      const img = canvasOf(fw + pad * 2, fh + H + 6); const c = img.getContext('2d');
      const ox = pad; const top = 2; // top face starts here; front face below it
      const wx = l.tx * TILE - pad; const wy = l.ty * TILE - (top + H);
      groundShadow(l.tx * TILE, l.ty * TILE + fh - 4, fw, 6);
      tint(l.tx * TILE + fw / 2, l.ty * TILE + fh + 6, 40, ART.white, 0.22);
      // top face
      box(c, ox, top, fw, fh, ART.bodyTop); box(c, ox, top, fw, 1, ART.bodyHi); box(c, ox, top, 1, fh, ART.bodyHi);
      // side pins along the top face edges
      for (let k = top + 3; k < top + fh - 2; k += 4) { box(c, ox - 3, k, 3, 2, ART.pin); box(c, ox + fw, k, 3, 2, ART.pinLo); }
      // etched traces running from the die to the edges
      const dx = ox + Math.floor(fw * 0.3); const dw = Math.floor(fw * 0.4); const dy = top + Math.floor(fh * 0.25); const dh = Math.floor(fh * 0.5);
      for (let k = ox + 3; k < ox + fw - 3; k += 5) { box(c, k, top + 2, 1, dy - top - 2, ART.bodyHi); box(c, k, dy + dh + 1, 1, top + fh - dy - dh - 3, ART.bodyHi); }
      // the die: white glowing core in a cyan ring
      box(c, dx - 1, dy - 1, dw + 2, dh + 2, ART.cyan); box(c, dx, dy, dw, dh, ART.white); box(c, dx + 1, dy + dh - 1, dw - 1, 1, '#bff8ff');
      // front face
      box(c, ox, top + fh, fw, H, ART.body); box(c, ox, top + fh, fw, 1, ART.bodyHi); box(c, ox, top + fh + H - 2, fw, 2, ART.bodyLo);
      for (let k = ox + 2; k < ox + fw - 2; k += 4) { box(c, k, top + fh + H - 1, 2, 4, ART.pin); dot(c, k, top + fh + H + 2, ART.pinLo); }
      dot(c, ox + 4, top + fh + 4, ART.mint); leds.push({ x: wx + ox + 4, y: wy + top + fh + 4, color: ART.mint, phase: R() * 6 });
      // ruin damage: a bite out of the top-right corner and a crack across the top
      for (let k = 0; k < 7; k++) c.clearRect(ox + fw - 7 + k, top, 7 - k, 1 + Math.floor((7 - k) * 0.8));
      for (let k = 0; k < 6; k++) { const yy = top + 1 + Math.floor((7 - k) * 0.8); dot(c, ox + fw - 7 + k, yy, ART.bodyLo); }
      let cx = ox + Math.floor(fw * 0.62); let cy = top;
      for (let k = 0; k < fh + 6; k++) { cy++; if (R() < 0.4) cx += R() < 0.5 ? 1 : -1; dot(c, cx, cy, ART.bodyLo); }
      // corruption draped over the front
      for (let k = 0; k < 6; k++) vines(ox + 1 + Math.floor(R() * (fw - 2)), top + fh, 4 + Math.floor(R() * (H - 4)), c);
      for (let k = 0; k < 18; k++) dot(c, ox + Math.floor(R() * 10), top + fh - 3 + Math.floor(R() * 6), R() < 0.5 ? ART.mag : ART.magLo);
      cores.push({ x: wx + dx + dw / 2, y: wy + dy + dh / 2, r: Math.max(dw, dh) + 6, color: ART.white, a: 0.55 });
      return { img, x: wx, y: wy, sortY: (l.ty + l.h) * TILE };
    }

    function heatsink(l) {
      const fw = l.w * TILE; const fh = l.h * TILE; const H = 16; const pad = 2; // kept low so the top stays on screen at the back wall
      const img = canvasOf(fw + pad * 2, fh + H + 4); const c = img.getContext('2d');
      const ox = pad; const top = 2;
      const wx = l.tx * TILE - pad; const wy = l.ty * TILE - (top + H);
      groundShadow(l.tx * TILE, l.ty * TILE + fh - 4, fw, 6);
      tint(l.tx * TILE + fw / 2, l.ty * TILE + fh + 6, 34, ART.white, 0.18);
      // top: fin tops in rows
      box(c, ox, top, fw, fh, ART.pinLo);
      for (let k = ox + 1; k < ox + fw - 1; k += 4) { box(c, k, top, 2, fh, ART.finHi); box(c, k + 2, top, 1, fh, ART.fin); }
      // front face: tall fins over a dark base plate
      box(c, ox, top + fh, fw, H, ART.pinLo);
      for (let k = ox + 1; k < ox + fw - 1; k += 4) { box(c, k, top + fh, 2, H - 8, ART.fin); dot(c, k, top + fh, ART.finHi); box(c, k + 2, top + fh, 1, H - 8, ART.body); }
      box(c, ox, top + fh + H - 8, fw, 8, ART.body); box(c, ox, top + fh + H - 8, fw, 1, ART.bodyHi); box(c, ox, top + fh + H - 1, fw, 1, ART.bodyLo);
      // white-hot slot in the base
      const sx = ox + Math.floor(fw / 2) - 8; const sy = top + fh + H - 5; box(c, sx, sy, 16, 2, ART.white); box(c, sx - 1, sy - 1, 18, 1, ART.cyan);
      dot(c, ox + fw - 4, top + fh + H - 6, ART.coral); leds.push({ x: wx + ox + fw - 4, y: wy + top + fh + H - 6, color: ART.coral, phase: R() * 6 });
      for (let k = 0; k < 5; k++) vines(ox + 1 + Math.floor(R() * (fw - 2)), top + fh, 6 + Math.floor(R() * 18), c);
      cores.push({ x: wx + sx + 8, y: wy + sy + 1, r: 16, color: ART.white, a: 0.5 });
      return { img, x: wx, y: wy, sortY: (l.ty + l.h) * TILE };
    }

    return { ground, props, cores, leds };
  }

  // The data void far below: dark boards, faint traces and distant lights. Painted per buffer size.
  function deep(w, h, seed) {
    const R = rngOf(seed || 3); const img = canvasOf(w, h); const g = img.getContext('2d');
    box(g, 0, 0, w, h, ART.void0);
    const lights = [];
    for (let i = 0; i < Math.ceil((w * h) / 9000); i++) {
      const bw = 50 + Math.floor(R() * 160); const bh = 24 + Math.floor(R() * 70); const bx = Math.floor(R() * (w + 40)) - 20; const by = Math.floor(R() * (h + 20)) - 10;
      box(g, bx, by, bw, bh, ART.void1); box(g, bx, by, bw, 1, ART.void2); box(g, bx, by + bh, bw, 2, '#04071a');
      for (let k = 0; k < 3; k++) { const ty = by + 4 + Math.floor(R() * (bh - 6)); box(g, bx + 3, ty, Math.floor(bw * (0.3 + R() * 0.6)), 1, ART.void2); }
      for (let k = 0; k < 2; k++) { const cw = 6 + Math.floor(R() * 14); box(g, bx + 4 + Math.floor(R() * (bw - cw - 6)), by + 4 + Math.floor(R() * Math.max(1, bh - 12)), cw, 5, '#111a3e'); }
      if (R() < 0.8) lights.push({ x: bx + 3 + Math.floor(R() * (bw - 6)), y: by + 2 + Math.floor(R() * (bh - 4)), color: [ART.cyan, ART.mint, ART.mag, ART.vio][Math.floor(R() * 4)], phase: R() * 6 });
    }
    for (let i = 0; i < w / 6; i++) { const x = Math.floor(R() * w); const y = Math.floor(R() * h); box(g, x, y, 1, 6 + Math.floor(R() * 30), '#0b1230'); }
    return { img, lights };
  }

  // Soft dark edges so the eye sits on the plaza.
  function vignette(w, h) {
    const img = canvasOf(w, h); const g = img.getContext('2d');
    const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.38, w / 2, h / 2, Math.hypot(w, h) * 0.55);
    gr.addColorStop(0, 'rgba(6,10,28,0)'); gr.addColorStop(1, 'rgba(6,10,28,0.62)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    return img;
  }

  CK.RoomArt = { ART, TILES, cliffs, paint, deep, vignette };
})(typeof window !== 'undefined' ? window : globalThis);
