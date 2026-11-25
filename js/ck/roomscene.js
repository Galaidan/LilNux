/* Colonel Kernel — pixel room scene: draws the action sim in a 3/4 top-down Neon Circuit style. No text in the canvas. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});
  const TAU = Math.PI * 2;
  const COL = { bg0: '#060a1c', bg1: '#14103a', cyan: '#38f2ff', magenta: '#ff4fd8', violet: '#8b5cff', mint: '#6dffb0', amber: '#ffb347', coral: '#ff5d73', gold: '#ffd166', white: '#ffffff' };

  // 3x5 pixel digits for decorative damage pops (the HUD carries the real information).
  const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
    '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];

  function create(o) {
    const engine = o.engine; const input = o.input; const room = o.room; const accent = o.accent || COL.amber;
    const TILE = CK.Rooms.TILE; const Pix = CK.Pixel; const spr = CK.Sprites.built();
    const reduced = () => !!engine.reducedMotion;
    let sim = o.sim;

    // ---- pre-rendered layers ------------------------------------------------------------------
    const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const Art = CK.RoomArt; const A = Art.ART;
    const art = Art.paint(room, { accent, seed: 7 }); // plaza, cliffs, walls, creep (static) + props/cores/leds
    let deep = null; let vig = null; // per buffer size, built in resize()
    const motes = [];
    function seedMotes(w, h) {
      motes.length = 0; const rng = CK.rng(9);
      for (let i = 0; i < 42; i++) {
        const p = rng();
        motes.push({ x: rng() * w, y: rng() * h, vy: 3 + rng() * 7, sway: 0.5 + rng() * 1.5, ph: rng() * 6, big: rng() < 0.15,
          color: p < 0.5 ? A.white : p < 0.75 ? '#c8f5ea' : p < 0.9 ? A.magHi : A.mint });
      }
    }

    const pools = {};
    function pool(color, r) {
      const key = color + r; if (pools[key]) return pools[key];
      const c = canvasOf(r * 2, r * 2); const g = c.getContext('2d');
      const gr = g.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
      return (pools[key] = c);
    }

    // ---- effects state ------------------------------------------------------------------------
    const parts = []; const rings = []; const pops = []; const arcs = []; const ghosts = [];
    let hitstop = 0; let shakeT = 0; let hurtFlash = 0; let t = 0;
    const pip = { x: sim.player.x - 14, y: sim.player.y - 18 };
    const cam = { x: 0, y: 0 };

    function burst(x, y, color, n, speed) {
      const rng = Math.random;
      for (let i = 0; i < n; i++) { const a = rng() * TAU; const v = speed * (0.4 + rng() * 0.6); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + rng() * 0.25, max: 0.6, color }); }
    }
    function handle(ev) {
      const P = sim.player;
      switch (ev.type) {
        case 'hit': burst(ev.x, ev.y, COL.magenta, 6, 60); if (ev.n) pops.push({ x: ev.x, y: ev.y - 10, n: ev.n, life: 0.6 }); hitstop = Math.max(hitstop, 0.05); break;
        case 'kill': burst(ev.x, ev.y, COL.violet, 14, 90); burst(ev.x, ev.y, COL.white, 4, 40); rings.push({ x: ev.x, y: ev.y, r0: 4, r1: 22, life: 0.3, max: 0.3, color: COL.magenta }); hitstop = Math.max(hitstop, 0.06); shake(); break;
        case 'hurt': burst(P.x, P.y - 10, COL.coral, 8, 70); hurtFlash = 0.08; shake(); break;
        case 'parry': rings.push({ x: ev.x, y: ev.y, r0: 4, r1: 26, life: 0.25, max: 0.25, color: COL.cyan }); burst(ev.x, ev.y, COL.cyan, 8, 80); hitstop = Math.max(hitstop, 0.05); break;
        case 'parry-miss': rings.push({ x: P.x, y: P.y - 10, r0: 10, r1: 6, life: 0.2, max: 0.2, color: COL.coral }); break;
        case 'trap': rings.push({ x: P.x, y: P.y - 10, r0: 6, r1: 14, life: 0.18, max: 0.18, color: COL.cyan }); break;
        case 'reveal': rings.push({ x: P.x, y: P.y - 8, r0: 6, r1: 200, life: 0.5, max: 0.5, color: COL.cyan }); break;
        case 'swing': arcs.push({ x: P.x, y: P.y - 10, dir: Math.atan2(P.face.y, P.face.x), life: 0.1, combo: P.combo }); break;
        case 'echo': burst(P.x + P.face.x * 8, P.y - 10 + P.face.y * 8, COL.cyan, 3, 40); break;
        case 'overheat': burst(P.x, P.y - 20, COL.amber, 10, 50); break;
        case 'clear': rings.push({ x: P.x, y: P.y - 10, r0: 10, r1: 260, life: 0.8, max: 0.8, color: COL.mint }); break;
        default: break;
      }
      if (o.onEvent) o.onEvent(ev);
    }
    function shake() { if (!reduced()) shakeT = 0.12; }

    // ---- update -----------------------------------------------------------------------------------
    function update(dt) {
      if (o.paused && o.paused()) return; // frozen behind the rotate screen or while the window is unfocused
      t += dt;
      const P = sim.player;
      const inp = input ? input.read() : { mx: 0, my: 0, mouse: null, kill: false, trap: false, dash: false, tool: null };
      let ax = 0; let ay = 0;
      if (inp.mouse) { ax = inp.mouse.x + cam.x - P.x; ay = inp.mouse.y + cam.y - (P.y - 10); const l = Math.hypot(ax, ay); if (l > 1) { ax /= l; ay /= l; } else { ax = 0; ay = 0; } }
      if (hitstop > 0) {
        hitstop -= dt; // buffer presses made during hit-stop so they aren't lost
        if (inp.kill || inp.trap || inp.dash || inp.tool) {
          pending = pending || {};
          for (const k of ['kill', 'trap', 'dash']) if (inp[k]) pending[k] = true;
          if (inp.tool) pending.tool = inp.tool;
        }
      }
      else {
        const press = pending || {}; pending = null;
        sim.step(dt, { mx: inp.mx, my: inp.my, ax, ay, kill: inp.kill || !!press.kill, trap: inp.trap || !!press.trap, dash: inp.dash || !!press.dash, tool: inp.tool || press.tool || null });
      }
      for (const ev of sim.events.splice(0)) handle(ev);
      if (P.dashT > 0) ghosts.push({ x: P.x, y: P.y, life: 0.15, flip: P.dashDir.x < 0 });
      for (const g of ghosts) g.life -= dt;
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; p.life -= dt; }
      for (const r of rings) r.life -= dt;
      for (const a of arcs) a.life -= dt;
      for (const p of pops) { p.life -= dt; p.y -= 18 * dt; }
      prune(ghosts); prune(parts); prune(rings); prune(arcs); prune(pops);
      shakeT = Math.max(0, shakeT - dt); hurtFlash = Math.max(0, hurtFlash - dt);
      const k = 1 - Math.pow(0.002, dt); // smooth follow with ~0.15 s lag
      pip.x += (P.x - 14 - pip.x) * k; pip.y += (P.y - 22 - pip.y) * k;
      if (!reduced() && deep) for (const m of motes) { m.y -= m.vy * dt; m.x += Math.sin(t * m.sway + m.ph) * 4 * dt; if (m.y < -2) { m.y = deep.img.height + 2; m.x = Math.random() * deep.img.width; } }
    }
    let pending = null;
    function prune(a) { for (let i = a.length - 1; i >= 0; i--) if (a[i].life <= 0) a.splice(i, 1); }

    // ---- draw -------------------------------------------------------------------------------------
    function colonelSprite(P) {
      const f = P.face; const side = Math.abs(f.x) > Math.abs(f.y); const dir = side ? 'side' : f.y < 0 ? 'up' : 'down';
      const flip = side && f.x < 0;
      if (P.dashT > 0) return { b: spr.colonel_dash, flip: P.dashDir.x < 0 || (Math.abs(P.dashDir.x) < 0.01 && f.x < 0) };
      if (P.attackT > 0) return { b: spr['colonel_attack_' + dir], flip };
      const frame = P.moving ? Math.floor(t * 8) % 2 : 0;
      return { b: spr[`colonel_${dir}_${frame}`], flip };
    }
    function shadow(g, x, y, w) { g.fillStyle = A.shadow; g.beginPath(); g.ellipse(x + 1, y, w, w * 0.35, 0, 0, TAU); g.fill(); }
    // mode 'lighter' only over dark things (cores, the void); on the pale plaza additive light just turns white
    function light(g, x, y, color, r, a, mode) {
      g.globalCompositeOperation = mode || 'source-over'; g.globalAlpha = a;
      g.drawImage(pool(color, r), Math.round(x - r), Math.round(y - r));
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    const pulse = (ph, speed) => (reduced() ? 0.7 : 0.55 + 0.45 * Math.sin(t * speed + ph));

    function draw(g, _t, view) {
      const P = sim.player;
      const c = CK.PixEngine.camera(room.w, room.h, view.w, view.h, P.x, P.y - 8);
      cam.x = c.x; cam.y = c.y;
      let sx = 0; let sy = 0;
      if (shakeT > 0 && !reduced()) { sx = Math.round((Math.random() - 0.5) * 4); sy = Math.round((Math.random() - 0.5) * 4); }
      g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      // the data void far below, with distant blinking lights
      if (deep) {
        g.drawImage(deep.img, 0, 0);
        for (const l of deep.lights) { g.globalAlpha = 0.25 + 0.5 * pulse(l.phase, 1.3); g.fillStyle = l.color; g.fillRect(l.x, l.y, 1, 1); }
        g.globalAlpha = 1;
      }
      g.setTransform(1, 0, 0, 1, -cam.x + sx, -cam.y + sy);
      g.drawImage(art.ground, 0, 0);

      // danger and shots tint the plaza under them
      for (const ob of sim.orbs) light(g, ob.x, ob.y + 3, ob.from === 'player' ? COL.cyan : COL.coral, 12, 0.35);
      for (const b of sim.bolts) light(g, b.x, b.y + 2, COL.cyan, 10, 0.3);

      // shadows
      shadow(g, P.x, P.y, 8);
      for (const e of sim.enemies) {
        if (e.dead) continue;
        const shown = !e.cloaked || sim.time < e.revealedUntil || sim.time < e.stunUntil;
        g.globalAlpha = shown ? 1 : 0.15; shadow(g, e.x, e.y + e.r - 1, 6); g.globalAlpha = 1; // a cloaked mite barely touches the floor
      }
      shadow(g, pip.x, P.y - 2, 4);

      // y-sorted: the Colonel, mites, landmarks, capacitors, blooms, Pip
      const list = [];
      list.push({ y: P.y, draw: () => drawColonel(g, P) });
      for (const e of sim.enemies) if (!e.dead) list.push({ y: e.y + e.r, draw: () => drawMite(g, e) });
      for (const p of art.props) list.push({ y: p.sortY, draw: () => g.drawImage(p.img, p.x, p.y) });
      list.push({ y: P.y - 2, draw: () => Pix.draw(g, spr.pip, pip.x, pip.y + (reduced() ? 0 : Math.round(Math.sin(t * 3) * 1.5)), { glow: 0.7 }) });
      list.sort((a, b) => a.y - b.y).forEach((it) => it.draw());

      // glowing cores and status lights bloom on top of the dark machines
      for (let i = 0; i < art.cores.length; i++) { const k = art.cores[i]; light(g, k.x, k.y, k.color, k.r, k.a * pulse(i, 1.6), 'lighter'); }
      for (const l of art.leds) { g.globalAlpha = pulse(l.phase, 4) > 0.6 ? 1 : 0.25; g.fillStyle = l.color; g.fillRect(l.x, l.y, 1, 1); }
      g.globalAlpha = 1;

      for (const ob of sim.orbs) {
        Pix.draw(g, spr.orb, ob.x, ob.y + 3, { glow: 0.8 });
        if (ob.unparryable) { g.strokeStyle = COL.white; g.lineWidth = 1; g.beginPath(); g.arc(Math.round(ob.x) + 0.5, Math.round(ob.y) + 0.5, 6, 0, TAU); g.stroke(); }
      }
      for (const b of sim.bolts) Pix.draw(g, spr.bolt, b.x, b.y + 2, { glow: 0.9 });
      drawEffects(g);

      // screen space: drifting motes, then the vignette
      g.setTransform(1, 0, 0, 1, 0, 0);
      for (const m of motes) {
        g.globalAlpha = 0.35 + 0.4 * pulse(m.ph, 2); g.fillStyle = m.color;
        g.fillRect(Math.round(m.x), Math.round(m.y), m.big ? 2 : 1, m.big ? 2 : 1);
      }
      g.globalAlpha = 1;
      if (vig) g.drawImage(vig, 0, 0);
    }

    function drawColonel(g, P) {
      for (const gh of ghosts) Pix.draw(g, spr.colonel_dash, gh.x, gh.y, { alpha: Math.max(0, gh.life / 0.15) * 0.35, flip: gh.flip });
      const s = colonelSprite(P);
      let alpha = 1;
      if (P.iframes > 0 && P.dashT <= 0) alpha = reduced() ? 0.6 : (Math.floor(t * 15) % 2 ? 0.25 : 1);
      Pix.draw(g, s.b, P.x, P.y, { flip: s.flip, alpha, flash: hurtFlash > 0, glow: 0.35 });
      if (P.parryT > 0) { g.strokeStyle = COL.cyan; g.globalAlpha = 0.8; g.lineWidth = 1; g.beginPath(); g.arc(Math.round(P.x) + 0.5, Math.round(P.y - 12) + 0.5, 15, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    }
    function drawMite(g, e) {
      const visible = !e.cloaked || sim.time < e.revealedUntil || sim.time < e.stunUntil;
      const frame = (Math.floor(t * 6) + Number(e.id.slice(1))) % 2;
      const b = spr['mite_' + frame];
      const jitter = visible || reduced() ? 0 : (Math.floor(t * 20) % 3) - 1;
      // cloaked: a faint shimmer (0.22 read as faint on the old navy floor; the pale plaza needs less)
      Pix.draw(g, b, e.x + jitter, e.y + e.r + 2, { alpha: visible ? 1 : 0.13, glow: visible ? 0.6 : 0, flash: e.flash > 0 });
      if (e.state === 'tell') {
        g.fillStyle = COL.coral; g.fillRect(Math.round(e.x), Math.round(e.y - 16), 1, 4); g.fillRect(Math.round(e.x), Math.round(e.y - 11), 1, 1);
        g.globalAlpha = 0.5; Pix.draw(g, b, e.x, e.y + e.r + 2, { flash: true }); g.globalAlpha = 1;
      }
      if (sim.time < e.stunUntil) {
        g.fillStyle = COL.gold;
        for (let i = 0; i < 3; i++) { const a = (reduced() ? 0 : t * 5) + (i * TAU) / 3; g.fillRect(Math.round(e.x + Math.cos(a) * 7), Math.round(e.y - 12 + Math.sin(a) * 2), 1, 1); }
      }
    }
    // Effects draw normally (not additive) with a dark under-stroke, so they read on the pale plaza.
    function drawEffects(g) {
      for (const a of arcs) {
        const al = Math.max(0, a.life / 0.1); const w = a.combo === 3 ? 3 : 2;
        g.globalAlpha = al * 0.55; g.strokeStyle = A.cliff2; g.lineWidth = w + 2;
        g.beginPath(); g.arc(a.x, a.y, 18, a.dir - 0.9, a.dir + 0.9); g.stroke();
        g.globalAlpha = al; g.strokeStyle = a.combo === 3 ? COL.magenta : COL.white; g.lineWidth = w;
        g.beginPath(); g.arc(a.x, a.y, 18, a.dir - 0.9, a.dir + 0.9); g.stroke();
      }
      for (const r of rings) {
        const k = 1 - r.life / r.max; const rad = r.r0 + (r.r1 - r.r0) * k; const al = Math.max(0, r.life / r.max);
        g.globalAlpha = al * 0.5; g.strokeStyle = A.cliff2; g.lineWidth = 3; g.beginPath(); g.arc(r.x, r.y, rad, 0, TAU); g.stroke();
        g.globalAlpha = al; g.strokeStyle = r.color; g.lineWidth = 1; g.beginPath(); g.arc(r.x, r.y, rad, 0, TAU); g.stroke();
      }
      for (const p of parts) { g.globalAlpha = Math.max(0, p.life / p.max); g.fillStyle = p.color; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
      g.globalAlpha = 1;
      for (const p of pops) {
        g.globalAlpha = Math.min(1, p.life / 0.3);
        const s = String(p.n); const x0 = Math.round(p.x - (s.length * 4) / 2); const y0 = Math.round(p.y);
        for (const [col, ox, oy] of [[A.cliff3, 1, 0], [A.cliff3, -1, 0], [A.cliff3, 0, 1], [A.cliff3, 0, -1], [COL.white, 0, 0]]) {
          g.fillStyle = col; let x = x0 + ox;
          for (const ch of s) { const d = DIGITS[+ch]; for (let i = 0; i < 15; i++) if (d[i] === '1') g.fillRect(x + (i % 3), y0 + oy + Math.floor(i / 3), 1, 1); x += 4; }
        }
      }
      g.globalAlpha = 1;
    }

    const scene = {
      update, draw, cam,
      get sim() { return sim; },
      setSim(s) { sim = s; parts.length = rings.length = pops.length = arcs.length = ghosts.length = 0; hitstop = 0; pending = null; pip.x = s.player.x - 14; pip.y = s.player.y - 22; },
      resize(view) {
        if (!view || (deep && deep.img.width === view.w && deep.img.height === view.h)) return;
        deep = Art.deep(view.w, view.h, 3); vig = Art.vignette(view.w, view.h); seedMotes(view.w, view.h);
      },
    };
    return scene;
  }

  CK.RoomScene = { create };
})(typeof window !== 'undefined' ? window : globalThis);
