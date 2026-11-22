/* Colonel Kernel — "Neon Circuit" art, all drawn in code. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const C = {
    bg0: '#060a1c', bg1: '#14103a', cyan: '#38f2ff', magenta: '#ff4fd8', violet: '#8b5cff', mint: '#6dffb0',
    amber: '#ffb347', coral: '#ff5d73', ink: '#e8f1ff', dim: '#7f8bb3', steel: '#1c2448', steel2: '#2b3768', gold: '#ffd166',
  };
  const TAU = Math.PI * 2;

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function glow(ctx, color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
  function noGlow(ctx) { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }
  function withAlpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---------------------------------------------------------------- background
  const STARS = [];
  (function () { const r = (CK.rng || ((s) => Math.random))(99); for (let i = 0; i < 110; i++) STARS.push([r(), r(), r() * 1.6 + 0.3, r() * TAU]); })();
  function background(ctx, view, t, accent) {
    const { w, h } = view;
    const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
    g.addColorStop(0, C.bg0); g.addColorStop(1, C.bg1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const rg = ctx.createRadialGradient(w * 0.75, h * 0.2, 10, w * 0.75, h * 0.2, Math.max(w, h) * 0.7);
    rg.addColorStop(0, withAlpha(accent || C.violet, 0.12)); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    // circuit grid with gentle parallax
    const step = 46; const ox = ((view.ox * 0.25) % step + step) % step; const oy = ((view.oy * 0.25) % step + step) % step;
    ctx.strokeStyle = 'rgba(56,242,255,0.05)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = ox; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = oy; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    for (const [sx, sy, sz, ph] of STARS) {
      const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + ph));
      ctx.fillStyle = `rgba(200,225,255,${a})`;
      ctx.fillRect(((sx * w + view.ox * 0.08) % w + w) % w, ((sy * h + view.oy * 0.08) % h + h) % h, sz, sz);
    }
  }

  // ---------------------------------------------------------------- traces & nodes
  function tracePoints(a, b) {
    if (Math.abs(a.y - b.y) < 4 || Math.abs(a.x - b.x) < 4) return [a, b];
    const mx = (a.x + b.x) / 2;
    return [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b];
  }
  function pointAlong(pts, f) {
    let total = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(d); total += d; }
    let want = Math.max(0, Math.min(1, f)) * total;
    for (let i = 0; i < seg.length; i++) {
      if (want <= seg[i] || i === seg.length - 1) { const k = seg[i] ? want / seg[i] : 1; return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k }; }
      want -= seg[i];
    }
    return pts[pts.length - 1];
  }
  function pathLen(pts) { let d = 0; for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return d; }
  function strokePts(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); }

  function trace(ctx, a, b, t, lit, accent, reduced) {
    const pts = tracePoints(a, b);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#121a3d'; ctx.lineWidth = 9; strokePts(ctx, pts);
    if (lit) {
      glow(ctx, accent, 14); ctx.strokeStyle = accent; ctx.lineWidth = 3; strokePts(ctx, pts); noGlow(ctx);
      if (!reduced) for (let k = 0; k < 2; k++) {
        const p = pointAlong(pts, ((t * 0.35 + k * 0.5 + (a.x + b.y) * 0.001) % 1));
        glow(ctx, '#ffffff', 12); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, TAU); ctx.fill(); noGlow(ctx);
      }
    } else {
      ctx.setLineDash([10, 9]); ctx.strokeStyle = 'rgba(56,242,255,0.32)'; ctx.lineWidth = 2; strokePts(ctx, pts); ctx.setLineDash([]);
    }
  }

  const KIND = {
    start: { color: C.cyan }, character: { color: C.cyan }, problem: { color: C.coral }, item: { color: C.mint },
    memory: { color: C.violet }, circuit: { color: C.amber }, boss: { color: C.magenta }, exit: { color: '#ffffff' }, empty: { color: C.dim },
  };
  function icon(ctx, kind, x, y, color, done) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (done && (kind === 'problem' || kind === 'boss' || kind === 'circuit')) { ctx.moveTo(x - 8, y); ctx.lineTo(x - 2, y + 6); ctx.lineTo(x + 9, y - 7); ctx.stroke(); return; }
    switch (kind) {
      case 'start': ctx.arc(x, y + 1, 8, -Math.PI * 0.3, Math.PI * 1.3); ctx.moveTo(x, y - 10); ctx.lineTo(x, y); ctx.stroke(); break;
      case 'character': rr(ctx, x - 10, y - 8, 20, 13, 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 4, y + 5); ctx.lineTo(x - 7, y + 10); ctx.lineTo(x + 1, y + 5); ctx.stroke(); break;
      case 'problem': ctx.moveTo(x, y - 10); ctx.lineTo(x + 10, y + 8); ctx.lineTo(x - 10, y + 8); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y + 5.5, 1.2, 0, TAU); ctx.fill(); break;
      case 'item': rr(ctx, x - 8, y - 7, 16, 14, 3); ctx.stroke(); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 5, y + 7); ctx.lineTo(x + i * 5, y + 11); ctx.stroke(); } break;
      case 'memory': ctx.moveTo(x, y - 11); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 11); ctx.lineTo(x - 8, y); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.stroke(); break;
      case 'circuit': ctx.moveTo(x - 11, y + 4); ctx.lineTo(x - 5, y + 4); ctx.lineTo(x - 2, y - 6); ctx.lineTo(x + 2, y + 6); ctx.lineTo(x + 5, y - 4); ctx.lineTo(x + 11, y - 4); ctx.stroke(); break;
      case 'boss': ctx.arc(x, y - 2, 9, Math.PI * 0.85, Math.PI * 0.15); ctx.lineTo(x + 6, y + 9); ctx.lineTo(x - 6, y + 9); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(x - 3.5, y - 2, 2.2, 0, TAU); ctx.arc(x + 3.5, y - 2, 2.2, 0, TAU); ctx.fill(); break;
      case 'exit': ctx.moveTo(x - 9, y - 8); ctx.lineTo(x, y); ctx.lineTo(x - 9, y + 8); ctx.moveTo(x, y - 8); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 8); ctx.stroke(); break;
      default: ctx.arc(x, y, 3, 0, TAU); ctx.fill();
    }
  }
  function node(ctx, n, t, info) {
    const k = KIND[n.kind] || KIND.empty;
    const color = info.glitched ? C.coral : n.kind === 'exit' ? info.accent : k.color;
    if (info.glitched && !info.reduced) { ctx.save(); ctx.translate(Math.sin(t * 53) > 0.6 ? 3 : 0, Math.sin(t * 41) > 0.7 ? -2 : 0); }
    const done = info.cleared; const active = !done;
    const pulse = info.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 3 + n.x * 0.01);
    const w = 66; const h = 46; const x = n.x - w / 2; const y = n.y - h / 2;
    // pins
    ctx.strokeStyle = withAlpha(color, 0.5); ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x - 6, n.y + i * 11); ctx.lineTo(x, n.y + i * 11); ctx.moveTo(x + w, n.y + i * 11); ctx.lineTo(x + w + 6, n.y + i * 11); ctx.stroke(); }
    glow(ctx, color, active ? 10 + 14 * pulse : 6);
    rr(ctx, x, y, w, h, 12);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, 'rgba(22,30,66,0.96)'); g.addColorStop(1, 'rgba(9,13,34,0.96)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = done ? withAlpha(color, 0.55) : color; ctx.lineWidth = info.current ? 3 : 2; ctx.stroke();
    noGlow(ctx);
    icon(ctx, n.kind, n.x, n.y, done ? withAlpha(color, 0.8) : color, done);
    if (info.current && !info.reduced) {
      ctx.strokeStyle = withAlpha(info.accent, 0.6 * (1 - ((t * 0.8) % 1))); ctx.lineWidth = 2;
      rr(ctx, x - 8 - ((t * 0.8) % 1) * 10, y - 8 - ((t * 0.8) % 1) * 10, w + 16 + ((t * 0.8) % 1) * 20, h + 16 + ((t * 0.8) % 1) * 20, 16); ctx.stroke();
    }
    ctx.font = '700 12px "Adwaita Sans", Cantarell, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const label = n.label.toUpperCase();
    ctx.fillStyle = 'rgba(4,8,22,0.75)'; const tw = ctx.measureText(label).width + 10;
    rr(ctx, n.x - tw / 2, y + h + 7, tw, 18, 6); ctx.fill();
    ctx.fillStyle = done ? '#b9c4e6' : '#ffffff'; ctx.fillText(label, n.x, y + h + 10);
    if (info.glitched) {
      ctx.strokeStyle = withAlpha(C.coral, 0.7); ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { const gy = y + ((t * 60 + i * 13) % h); ctx.beginPath(); ctx.moveTo(x - 4, gy); ctx.lineTo(x + w + 4, gy); ctx.stroke(); }
      if (!info.reduced) ctx.restore();
    }
  }

  // ---------------------------------------------------------------- fog
  let fogCanvas = null;
  function fog(ctx, view, holes, t) {
    const pw = Math.round(view.w * view.dpr); const ph = Math.round(view.h * view.dpr);
    if (!fogCanvas) fogCanvas = document.createElement('canvas');
    if (fogCanvas.width !== pw || fogCanvas.height !== ph) { fogCanvas.width = pw; fogCanvas.height = ph; }
    const f = fogCanvas.getContext('2d');
    f.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    f.globalCompositeOperation = 'source-over';
    f.clearRect(0, 0, view.w, view.h);
    f.fillStyle = 'rgba(4,6,18,0.95)'; f.fillRect(0, 0, view.w, view.h);
    for (let i = 0; i < 5; i++) { // slow nebula swirls
      const cx = view.w * (0.5 + 0.42 * Math.sin(t * 0.05 + i * 1.7)); const cy = view.h * (0.5 + 0.4 * Math.cos(t * 0.04 + i * 2.3));
      const r = Math.max(view.w, view.h) * (0.28 + 0.06 * i);
      const g = f.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, i % 2 ? 'rgba(139,92,255,0.10)' : 'rgba(56,120,255,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      f.fillStyle = g; f.fillRect(0, 0, view.w, view.h);
    }
    f.globalCompositeOperation = 'destination-out';
    for (const hole of holes) {
      const g = f.createRadialGradient(hole.x, hole.y, hole.r * 0.45, hole.x, hole.y, hole.r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      f.fillStyle = g; f.beginPath(); f.arc(hole.x, hole.y, hole.r, 0, TAU); f.fill();
    }
    f.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(fogCanvas, 0, 0); ctx.restore();
  }

  // ---------------------------------------------------------------- Colonel Kernel
  function colonel(ctx, x, y, s, t, o) {
    o = o || {};
    const bob = o.reduced ? 0 : Math.sin(t * 2.4) * 2;
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(s * (o.facing === -1 ? -1 : 1), s);
    // hover glow + thruster
    const hg = ctx.createRadialGradient(0, 30, 2, 0, 30, 30); hg.addColorStop(0, 'rgba(56,242,255,0.55)'); hg.addColorStop(1, 'rgba(56,242,255,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(0, 30, 30, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(120,240,255,${0.6 + 0.3 * Math.sin(t * 20)})`;
    ctx.beginPath(); ctx.moveTo(-7, 20); ctx.lineTo(0, 30 + Math.sin(t * 25) * 3); ctx.lineTo(7, 20); ctx.fill();
    const body = ctx.createLinearGradient(0, -14, 0, 22); body.addColorStop(0, C.steel2); body.addColorStop(1, C.steel);
    // arms
    ctx.fillStyle = C.steel; ctx.strokeStyle = C.cyan; ctx.lineWidth = 1.4;
    rr(ctx, -27, -8, 8, 20, 4); ctx.fill(); ctx.stroke(); rr(ctx, 19, -8, 8, 20, 4); ctx.fill(); ctx.stroke();
    // torso
    glow(ctx, o.hurt ? C.coral : C.cyan, 12); ctx.fillStyle = body; rr(ctx, -19, -14, 38, 36, 10); ctx.fill();
    ctx.strokeStyle = o.hurt ? C.coral : C.cyan; ctx.lineWidth = 1.8; ctx.stroke(); noGlow(ctx);
    // epaulettes
    ctx.fillStyle = C.gold; rr(ctx, -25, -16, 13, 6, 3); ctx.fill(); rr(ctx, 12, -16, 13, 6, 3); ctx.fill();
    ctx.fillStyle = '#c99a2e'; for (let i = 0; i < 3; i++) { ctx.fillRect(-24 + i * 4, -10, 2, 3); ctx.fillRect(13 + i * 4, -10, 2, 3); }
    // chest core
    const pulse = o.reduced ? 1 : 0.8 + 0.2 * Math.sin(t * 4);
    const cg = ctx.createRadialGradient(0, 3, 0, 0, 3, 9 * pulse); cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.45, C.cyan); cg.addColorStop(1, 'rgba(56,242,255,0)');
    glow(ctx, C.cyan, 16); ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 3, 9 * pulse, 0, TAU); ctx.fill(); noGlow(ctx);
    ctx.strokeStyle = 'rgba(56,242,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-12, 14); ctx.lineTo(12, 14); ctx.stroke();
    // head
    ctx.fillStyle = body; rr(ctx, -17, -41, 34, 25, 9); ctx.fill(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 1.6; ctx.stroke();
    // visor + eyes
    const vg = ctx.createLinearGradient(-13, 0, 13, 0); vg.addColorStop(0, o.redVisor ? '#ff2a3d' : C.magenta); vg.addColorStop(1, o.redVisor ? '#5a0010' : C.cyan);
    ctx.fillStyle = vg; rr(ctx, -13, -34, 26, 10, 5); ctx.fill();
    const blink = o.reduced ? 1 : ((t % 4) < 0.12 ? 0.2 : 1);
    ctx.fillStyle = '#ffffff'; glow(ctx, '#ffffff', 8);
    ctx.beginPath(); ctx.ellipse(-5.5, -29, 2.6, 2.6 * blink, 0, 0, TAU); ctx.ellipse(5.5, -29, 2.6, 2.6 * blink, 0, 0, TAU); ctx.fill(); noGlow(ctx);
    // officer cap
    ctx.fillStyle = '#18285a'; ctx.beginPath();
    ctx.moveTo(-18, -40); ctx.quadraticCurveTo(-22, -55, -4, -58); ctx.quadraticCurveTo(20, -60, 19, -46); ctx.lineTo(17, -40); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = C.gold; ctx.fillRect(-18, -44, 36, 3.5);
    ctx.fillStyle = '#0c1430'; ctx.beginPath(); ctx.ellipse(6, -40, 17, 3.6, -0.05, 0, TAU); ctx.fill();
    // penguin emblem
    ctx.fillStyle = '#0b0b10'; ctx.beginPath(); ctx.ellipse(0, -51, 3.6, 4.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -50, 2, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f5a623'; ctx.beginPath(); ctx.arc(0, -52.3, 1, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- Pip (PID 1)
  function pip(ctx, x, y, s, t, mood) {
    const bob = Math.sin(t * 3) * 4;
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(s, s);
    for (let i = 0; i < 5; i++) { // sparkle trail
      const a = t * 2 + i * 1.25; const px = Math.cos(a) * 20 - 6; const py = Math.sin(a) * 8 + 6;
      ctx.fillStyle = `rgba(160,250,255,${0.15 + 0.12 * (i % 3)})`; ctx.beginPath(); ctx.arc(px, py, 1.6 + (i % 2), 0, TAU); ctx.fill();
    }
    const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, 15); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, C.cyan); g.addColorStop(1, '#1673d6');
    glow(ctx, C.cyan, 18); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill(); noGlow(ctx);
    const blink = (t % 3.3) < 0.12 ? 0.15 : 1;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -1, 7, 7 * blink, 0, 0, TAU); ctx.fill();
    const lx = mood === 'worried' ? 0 : Math.cos(t * 0.8) * 2; const ly = mood === 'worried' ? 2 : Math.sin(t * 0.6) * 1.2;
    ctx.fillStyle = '#0b1530'; ctx.beginPath(); ctx.ellipse(lx, -1 + ly, 3.4, 3.4 * blink, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(lx + 1.2, -2.4 + ly, 1, 0, TAU); ctx.fill();
    ctx.fillStyle = C.magenta; glow(ctx, C.magenta, 8); ctx.beginPath(); ctx.arc(10, -10, 5.5, 0, TAU); ctx.fill(); noGlow(ctx);
    ctx.fillStyle = '#ffffff'; ctx.font = '800 8px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1', 10, -9.5);
    ctx.restore();
  }

  // ---------------------------------------------------------------- characters
  const TUX_BEAK = typeof Path2D !== 'undefined' ? new Path2D('M47 70 Q60 63 73 70 Q60 82 47 70Z') : null;
  const TUX_CROWN = typeof Path2D !== 'undefined' ? new Path2D('M36 36 Q34 10 60 11 Q86 10 84 36 Z') : null;
  const TUX_BAND = typeof Path2D !== 'undefined' ? new Path2D('M36 30 Q60 25 84 30 L84 35 Q60 31 36 35 Z') : null;
  function liltux(ctx, x, y, s, t) { // the LilNux mascot, same look as the learning mode, with a neon rim
    const wave = Math.sin(t * 4) * 0.25;
    ctx.save(); ctx.translate(x, y + Math.sin(t * 2.2) * 2); ctx.scale(s, s); ctx.translate(-60, -80);
    glow(ctx, C.cyan, 16); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(60, 82, 38, 48, 0, 0, TAU); ctx.fill(); noGlow(ctx);
    ctx.fillStyle = '#f5a623'; ctx.beginPath(); ctx.ellipse(40, 130, 17, 7, 0, 0, TAU); ctx.ellipse(80, 130, 17, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.ellipse(22, 88, 10, 26, 0.32, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(98, 70); ctx.rotate(-0.32 - 0.6 - wave); ctx.beginPath(); ctx.ellipse(0, 18, 10, 26, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(60, 82, 38, 48, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fafafa'; ctx.beginPath(); ctx.ellipse(60, 94, 26, 34, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(48, 58, 9, 11, 0, 0, TAU); ctx.ellipse(72, 58, 9, 11, 0, 0, TAU); ctx.fill();
    const blink = (t % 3.7) < 0.12 ? 0.15 : 1;
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(50, 60, 4.5, 4.5 * blink, 0, 0, TAU); ctx.ellipse(70, 60, 4.5, 4.5 * blink, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,143,163,0.55)'; ctx.beginPath(); ctx.arc(38, 72, 4, 0, TAU); ctx.arc(82, 72, 4, 0, TAU); ctx.fill();
    if (TUX_BEAK) { ctx.fillStyle = '#f5a623'; ctx.fill(TUX_BEAK); }
    ctx.fillStyle = '#294172'; ctx.beginPath(); ctx.ellipse(60, 36, 40, 7, 0, 0, TAU); ctx.fill();
    if (TUX_CROWN) { ctx.fillStyle = '#3c6eb4'; ctx.fill(TUX_CROWN); }
    if (TUX_BAND) { ctx.fillStyle = '#51a2da'; ctx.fill(TUX_BAND); }
    ctx.restore();
  }

  function character(ctx, id, x, y, s, t) {
    if (id === 'pip') return pip(ctx, x, y, s * 1.6, t);
    if (id === 'liltux') return liltux(ctx, x, y + 6, s * 0.48, t);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (id === 'bios') {
      const led = (t % 1) < 0.5;
      ctx.strokeStyle = C.amber; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(0, -58); ctx.stroke();
      glow(ctx, led ? C.coral : C.amber, 12); ctx.fillStyle = led ? C.coral : '#7a4a12'; ctx.beginPath(); ctx.arc(0, -60, 4, 0, TAU); ctx.fill(); noGlow(ctx);
      glow(ctx, C.amber, 12); ctx.fillStyle = '#2a2010'; rr(ctx, -24, -46, 48, 36, 7); ctx.fill(); ctx.stroke(); noGlow(ctx);
      ctx.fillStyle = '#0b1a0d'; rr(ctx, -18, -40, 36, 24, 4); ctx.fill();
      ctx.fillStyle = '#6dffb0'; ctx.font = '700 10px "Adwaita Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(Math.floor(t * 1.5) % 2 ? 'POST' : 'OK_', 0, -28);
      ctx.fillStyle = '#3a2c14'; rr(ctx, -20, -8, 40, 30, 6); ctx.fill(); ctx.strokeStyle = C.amber; ctx.stroke();
      ctx.fillStyle = C.amber; for (let i = 0; i < 4; i++) ctx.fillRect(-14 + i * 8, 0, 4, 10);
      ctx.fillStyle = '#3a2c14'; rr(ctx, -18, 22, 12, 8, 3); ctx.fill(); rr(ctx, 6, 22, 12, 8, 3); ctx.fill();
    } else if (id === 'grub') {
      const seg = [[18, 0, 10], [6, 0, 12], [-8, 0, 14]];
      for (let i = 0; i < seg.length; i++) {
        const [sx, , r] = seg[i]; const sy = Math.sin(t * 4 + i) * 3;
        const g = ctx.createRadialGradient(sx - 3, sy - 4, 1, sx, sy, r); g.addColorStop(0, '#e6ffb8'); g.addColorStop(1, '#3f8f1c');
        glow(ctx, '#b6ff5c', 10); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill(); noGlow(ctx);
      }
      const hy = Math.sin(t * 4 + 3) * 3 - 6;
      const g = ctx.createRadialGradient(-26, hy - 5, 2, -24, hy, 17); g.addColorStop(0, '#f2ffd6'); g.addColorStop(1, '#58b52a');
      glow(ctx, '#b6ff5c', 14); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-24, hy, 17, 0, TAU); ctx.fill(); noGlow(ctx);
      ctx.strokeStyle = '#b6ff5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, hy - 15); ctx.lineTo(-36, hy - 26); ctx.moveTo(-20, hy - 16); ctx.lineTo(-16, hy - 27); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-30, hy - 3, 5, 0, TAU); ctx.arc(-19, hy - 3, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#10200a'; ctx.beginPath(); ctx.arc(-31, hy - 2, 2.4, 0, TAU); ctx.arc(-20, hy - 2, 2.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#10200a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-25, hy + 4, 5, 0.2, Math.PI - 0.2); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- creatures
  function creature(ctx, id, x, y, r, t, o) {
    o = o || {};
    const hidden = o.cloaked && !o.revealed;
    ctx.save(); ctx.translate(x, y);
    if (hidden) {
      ctx.globalAlpha = 0.16 + 0.08 * Math.sin(t * 9);
      ctx.setLineDash([4, 6]); ctx.strokeStyle = C.cyan; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r, t, t + TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    if (o.revealed && o.cloaked) { ctx.strokeStyle = withAlpha(C.cyan, 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r + 8 + Math.sin(t * 6) * 2, 0, TAU); ctx.stroke(); }
    const jitter = o.reduced ? 0 : (Math.sin(t * 37) > 0.85 ? 3 : 0);
    if (id === 'glitchMite') {
      const draw = (dx, color) => {
        ctx.fillStyle = color; ctx.beginPath();
        for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + t; const rad = i % 2 ? r * 0.55 : r; ctx.lineTo(Math.cos(a) * rad + dx, Math.sin(a) * rad); }
        ctx.closePath(); ctx.fill();
      };
      if (!hidden) { ctx.globalAlpha *= 0.6; draw(-jitter - 2, C.cyan); draw(jitter + 2, C.magenta); ctx.globalAlpha = hidden ? ctx.globalAlpha : 1; }
      glow(ctx, C.coral, 14); draw(0, C.coral); noGlow(ctx);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -2, r * 0.25, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a0010'; ctx.beginPath(); ctx.arc(1, -2, r * 0.12, 0, TAU); ctx.fill();
    } else if (id === 'loopWisp') {
      glow(ctx, '#b6ff5c', 16);
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = k % 2 ? C.cyan : '#b6ff5c'; ctx.lineWidth = 3.5 - k;
        ctx.beginPath(); ctx.arc(0, 0, r * (1 - k * 0.25), t * (3 + k) + k, t * (3 + k) + k + Math.PI * 1.4); ctx.stroke();
      }
      noGlow(ctx);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, TAU); ctx.fill();
      ctx.fillStyle = '#123'; ctx.beginPath(); ctx.arc(Math.cos(t * 2) * 2, 0, r * 0.13, 0, TAU); ctx.fill();
    } else if (id === 'bootGlitch') {
      const cols = [C.amber, C.coral, '#ff8a3d'];
      glow(ctx, C.coral, 20);
      for (let i = 0; i < 9; i++) {
        const gx = ((i % 3) - 1) * r * 0.55 + (i === 4 ? 0 : Math.sin(t * 3 + i) * 3) + (i % 2 ? jitter : -jitter);
        const gy = (Math.floor(i / 3) - 1) * r * 0.55 + Math.cos(t * 2.5 + i) * 3;
        ctx.fillStyle = cols[(i + (o.phase || 0)) % 3]; rr(ctx, gx - r * 0.26, gy - r * 0.26, r * 0.52, r * 0.52, 5); ctx.fill();
      }
      noGlow(ctx);
      ctx.strokeStyle = '#1a0606'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.2); ctx.lineTo(-r * 0.2, r * 0.1); ctx.lineTo(r * 0.1, -r * 0.4); ctx.lineTo(r * 0.6, r * 0.3); ctx.stroke();
      ctx.fillStyle = '#ffffff'; glow(ctx, '#ffffff', 10);
      ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.1, r * 0.12, 0, TAU); ctx.arc(r * 0.25, -r * 0.1, r * 0.12, 0, TAU); ctx.fill(); noGlow(ctx);
    } else if (id === 'kernelWraith') {
      const g = ctx.createLinearGradient(0, -r, 0, r * 1.4); g.addColorStop(0, 'rgba(180,150,255,0.95)'); g.addColorStop(1, 'rgba(139,92,255,0)');
      glow(ctx, C.violet, 24); ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(-r * 0.8, r * 0.2); ctx.quadraticCurveTo(-r * 0.9, -r * 1.1, 0, -r); ctx.quadraticCurveTo(r * 0.9, -r * 1.1, r * 0.8, r * 0.2);
      for (let i = 0; i <= 6; i++) { const wx = r * 0.8 - (i / 6) * r * 1.6; ctx.lineTo(wx, r * 1.2 + Math.sin(t * 5 + i) * r * 0.15 * (i % 2 ? 1 : -1)); }
      ctx.closePath(); ctx.fill(); noGlow(ctx);
      ctx.fillStyle = '#0b0420'; ctx.beginPath(); ctx.ellipse(0, -r * 0.25, r * 0.5, r * 0.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; glow(ctx, C.magenta, 12);
      ctx.beginPath(); ctx.ellipse(-r * 0.18, -r * 0.25, r * 0.08, r * 0.12, 0, 0, TAU); ctx.ellipse(r * 0.18, -r * 0.25, r * 0.08, r * 0.12, 0, 0, TAU); ctx.fill(); noGlow(ctx);
    }
    if (o.hpRatio !== undefined && !hidden) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; rr(ctx, -r, r + 12, r * 2, 6, 3); ctx.fill();
      ctx.fillStyle = C.coral; rr(ctx, -r, r + 12, r * 2 * Math.max(0, o.hpRatio), 6, 3); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- particles
  function burst(ctx, parts) {
    for (const p of parts) {
      const a = Math.max(0, p.life / p.max);
      ctx.fillStyle = withAlpha(p.color, a); glow(ctx, p.color, 10);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, TAU); ctx.fill();
    }
    noGlow(ctx);
  }
  function spawnBurst(parts, x, y, color, n, speed) {
    for (let i = 0; i < (n || 14); i++) {
      const a = Math.random() * TAU; const v = (speed || 160) * (0.3 + Math.random());
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6, max: 0.6, color, size: 2 + Math.random() * 2.5 });
    }
  }
  function stepParticles(parts, dt) {
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt; if (p.life <= 0) parts.splice(i, 1); }
  }

  CK.Art = { KIND, liltux, C, rr, glow, noGlow, withAlpha, background, trace, tracePoints, pointAlong, pathLen, node, fog, colonel, pip, character, creature, burst, spawnBurst, stepParticles };
})(typeof window !== 'undefined' ? window : globalThis);
