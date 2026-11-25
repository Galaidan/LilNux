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
    const engine = o.engine; const input = o.input; let room = o.room; let accent = o.accent || COL.amber;
    const TILE = CK.Rooms.TILE; const Pix = CK.Pixel; const spr = CK.Sprites.built();
    const reduced = () => !!engine.reducedMotion;
    let sim = o.sim;

    // ---- pre-rendered layers ------------------------------------------------------------------
    const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const Art = CK.RoomArt; const A = Art.ART;
    let art = Art.paint(room, { accent, seed: o.seed || 7 }); // plaza, cliffs, walls, creep (static) + props/cores/leds
    // world state for chapter rooms
    let dark = !!o.dark; let glitched = !!o.glitched; let npcs = o.npcs || [];
    let litT = 0; let flickerT = 0; let slideT = 0; let slideDir = null;
    let latch = null; let near = null; let touched = new Set();
    const tells = []; // SIGKILL telegraphs
    let darkLayer = null;
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
        case 'heavy': arcs.push({ x: P.x, y: P.y - 10, dir: Math.atan2(P.face.y, P.face.x), life: 0.16, combo: 3, big: true }); hitstop = Math.max(hitstop, 0.07); shake(); break;
        case 'charge': rings.push({ x: P.x, y: P.y - 12, r0: 16, r1: 6, life: 0.25, max: 0.25, color: COL.gold }); break;
        case 'break': burst(ev.x, ev.y, COL.magenta, 14, 80); burst(ev.x, ev.y, COL.white, 5, 50); shake(); break;
        case 'switch': rings.push({ x: ev.x, y: ev.y, r0: 4, r1: 20, life: 0.35, max: 0.35, color: COL.mint }); break;
        case 'blink': case 'blink-tell': burst(ev.x, ev.y - 8, COL.violet, ev.type === 'blink' ? 10 : 4, 50); break;
        case 'burst': rings.push({ x: ev.x, y: ev.y - 8, r0: 6, r1: 30, life: 0.3, max: 0.3, color: COL.violet }); break;
        case 'phase': rings.push({ x: ev.x, y: ev.y - 16, r0: 10, r1: 60, life: 0.5, max: 0.5, color: COL.magenta }); burst(ev.x, ev.y - 16, COL.magenta, 20, 110); shake(); break;
        case 'sigkill-tell': tells.push({ x: ev.x, y: ev.y, r: ev.r || 20, life: 0.8, max: 0.8 }); break;
        default: break;
      }
      if (o.onEvent) o.onEvent(ev);
    }
    function shake() { if (!reduced()) shakeT = 0.12; }

    // ---- update -----------------------------------------------------------------------------------
    function update(dt) {
      // frozen behind the rotate screen, while unfocused, or while a dialogue / terminal / panel is open;
      // keys pressed meanwhile (Enter on a dialogue, letters typed into the terminal) are dropped, not replayed
      if (o.paused && o.paused()) { if (input) input.clear(); return; }
      t += dt;
      litT = Math.max(0, litT - dt); flickerT = Math.max(0, flickerT - dt);
      for (const k of tells) k.life -= dt; prune(tells);
      if (slideT > 0) { slideT = Math.max(0, slideT - dt); if (input) input.read(); return; }
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
      checkPlace(P);
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
    // Doors (once per crossing, latched until the Colonel leaves the doorway), things to use, things to touch.
    function checkPlace(P) {
      if (!room.doors) return;
      const side = CK.Rooms.doorAt(room, P.x, P.y);
      if (!side) latch = null;
      else if (side !== latch) { latch = side; if (o.onDoor) o.onDoor(side); }
      const n = CK.Rooms.nearestProp(room, P.x, P.y, 20, ['npc', 'terminal', 'sign']);
      if (n !== near) { near = n; if (o.onNear) o.onNear(n); }
      for (const p of room.props) {
        if (touched.has(p) || !['pedestal', 'crystal', 'gate'].includes(p.kind)) continue;
        if (CK.Rooms.nearestProp(room, P.x, P.y, 6 + 7, [p.kind]) === p) { touched.add(p); if (o.onTouch) o.onTouch(p); }
      }
    }
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
      // sliding in from the door we came through (a cut with reduced motion)
      if (slideT > 0 && slideDir) {
        const k = slideT / SLIDE; const OFF = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[slideDir];
        sx += Math.round(OFF[0] * k * view.w); sy += Math.round(OFF[1] * k * view.h);
      }
      g.setTransform(1, 0, 0, 1, -cam.x + sx, -cam.y + sy);
      g.drawImage(art.ground, 0, 0);
      drawDoors(g);

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
      for (const e of sim.enemies) if (!e.dead) list.push({ y: e.y + e.r, draw: () => (e.kind === 'glitchMite' ? drawMite(g, e) : drawFoe(g, e)) });
      for (const p of art.props) list.push({ y: p.sortY, draw: () => g.drawImage(p.img, p.x, p.y) });
      for (const p of room.props || []) list.push({ y: (p.ty + p.h) * TILE, draw: () => drawProp(g, p) });
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
      drawTells(g);

      // screen space: darkness, glitches, drifting motes, then the vignette
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (dark) drawDark(g, view, P);
      if (glitched) drawGlitch(g, view);
      if (flickerT > 0 && !reduced() && Math.floor(flickerT * 12) % 3 === 0) { g.fillStyle = 'rgba(6,10,28,0.55)'; g.fillRect(0, 0, view.w, view.h); }
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
    // ---- chapter rooms: doors, props, bigger creatures, SIGKILL, darkness, glitches ----------------
    const SLIDE = 0.25;
    function drawDoors(g) {
      if (!room.doors) return;
      for (const side of Object.keys(room.doors)) {
        const kind = room.doorKind(side);
        for (const [tx, ty] of room.doors[side].tiles) {
          const x = tx * TILE; const y = ty * TILE;
          if (kind === 'sealed') { Pix.draw(g, spr.barrier, x + 8, y + 16, { alpha: reduced() ? 0.85 : 0.6 + 0.3 * pulse(tx + ty, 5) }); }
          else if (kind === 'crack') Pix.draw(g, spr.crack, x + 8, y + 16);
          else if (kind === 'wall') { if (side === 'n') Pix.draw(g, spr.tile_wall_front, x + 8, y + 16); else { g.fillStyle = A.void0; g.fillRect(x, y, TILE, TILE); } }
          else {
            const col = kind === 'loop' ? '#b6ff5c' : accent;
            g.globalAlpha = kind === 'loop' ? 0.35 + 0.4 * pulse(tx, 3) : 0.55; g.fillStyle = col;
            if (side === 'n' || side === 's') g.fillRect(x, side === 'n' ? y + 13 : y, TILE, 3); else g.fillRect(side === 'w' ? x + 13 : x, y, 3, TILE);
            g.globalAlpha = 1;
          }
        }
      }
    }
    const npcAt = (p) => (npcs.find((n) => n.tx === p.tx && n.ty === p.ty) || {}).who;
    function drawProp(g, p) {
      const fx = p.tx * TILE + (p.w * TILE) / 2; const fy = (p.ty + p.h) * TILE;
      const bob = reduced() ? 0 : Math.round(Math.sin(t * 2 + p.tx) * 1);
      switch (p.kind) {
        case 'terminal': Pix.draw(g, p.broken ? spr.terminal_off : spr.terminal, fx, fy, { glow: p.broken ? 0 : 0.4 }); break;
        case 'npc': { const who = npcAt(p); if (who && spr[who]) { shadow(g, fx, fy - 1, 7); Pix.draw(g, spr[who], fx, fy + bob * 0, { glow: 0.2 }); } break; }
        case 'pedestal': Pix.draw(g, spr.pedestal, fx, fy); if (p.icon && spr[p.icon] && !p.taken) Pix.draw(g, spr[p.icon], fx, fy - 10 + bob, { glow: 0.7 }); break;
        case 'crystal': if (!p.taken) { shadow(g, fx, fy - 1, 5); Pix.draw(g, spr.crystal, fx, fy - 2 + bob, { glow: 0.8 }); } break;
        case 'sign': Pix.draw(g, spr.sign, fx, fy); break;
        case 'switch': Pix.draw(g, room.tiles.some((r) => r.includes('_')) ? spr.switch_off : spr.switch_on, fx, fy, { glow: 0.5 }); break;
        case 'block': Pix.draw(g, spr.block, fx, fy, { glow: 0.3 }); break;
        case 'gate': Pix.draw(g, spr.gate, fx, fy, { glow: 0.6 }); break;
        default: break;
      }
    }
    const FOE_SPRITE = { loopWisp: 'wisp', bootGlitch: 'boot', kernelWraith: 'wraith' };
    function drawFoe(g, e) {
      const visible = !e.cloaked || sim.time < e.revealedUntil || sim.time < e.stunUntil;
      const frame = reduced() ? 0 : (Math.floor(t * 5) + Number(e.id.slice(1))) % 2;
      const b = spr[FOE_SPRITE[e.kind] + '_' + frame];
      shadow(g, e.x, e.y + e.r - 1, e.r * 0.8);
      const tell = e.state === 'tell' || e.sigTellT > 0;
      Pix.draw(g, b, e.x, e.y + e.r + 2, { alpha: visible ? 1 : 0.13, glow: visible ? 0.5 : 0, flash: e.flash > 0 || (tell && !reduced() && Math.floor(t * 10) % 2 === 0) });
    }
    function drawTells(g) {
      for (const k of tells) {
        const prog = 1 - k.life / k.max; const r = k.r + prog * 8;
        g.globalAlpha = 0.5; g.strokeStyle = A.cliff3; g.lineWidth = 3; g.beginPath(); g.arc(k.x, k.y - 8, r, 0, TAU); g.stroke();
        g.globalAlpha = 1; g.strokeStyle = COL.coral; g.lineWidth = 1; g.beginPath(); g.arc(k.x, k.y - 8, r, 0, TAU); g.stroke();
        // the decorative "9" (signal 9, SIGKILL): Pip's line carries the meaning in text
        const d = DIGITS[9]; g.fillStyle = COL.coral;
        for (let i = 0; i < 15; i++) if (d[i] === '1') g.fillRect(Math.round(k.x) - 3 + (i % 3) * 2, Math.round(k.y - 8 - r - 12) + Math.floor(i / 3) * 2, 2, 2);
      }
      g.globalAlpha = 1;
    }
    function drawDark(g, view, P) {
      const a = litT > 1 ? 0 : 0.9 * (1 - litT);
      if (a <= 0) return;
      if (!darkLayer || darkLayer.width !== view.w || darkLayer.height !== view.h) darkLayer = canvasOf(view.w, view.h);
      const d = darkLayer.getContext('2d');
      d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, view.w, view.h);
      d.fillStyle = `rgba(4,6,20,${a.toFixed(3)})`; d.fillRect(0, 0, view.w, view.h);
      d.globalCompositeOperation = 'destination-out';
      for (const [x, y, r] of [[P.x - cam.x, P.y - 10 - cam.y, 44], [pip.x - cam.x, pip.y - 8 - cam.y, 28]]) {
        const gr = d.createRadialGradient(x, y, r * 0.35, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = gr; d.fillRect(x - r, y - r, r * 2, r * 2);
      }
      d.globalCompositeOperation = 'source-over';
      g.drawImage(darkLayer, 0, 0);
    }
    // NullNux damage: torn scanlines and a colour cast. Still under reduced motion.
    function drawGlitch(g, view) {
      const seed = reduced() ? 1 : Math.floor(t * 3); const rng = CK.rng(seed + 11);
      for (let i = 0; i < 6; i++) {
        const y = Math.floor(rng() * view.h); const h = 1 + Math.floor(rng() * 3); const dx = Math.round((rng() - 0.5) * 10);
        g.drawImage(g.canvas, 0, y, view.w, h, dx, y, view.w, h);
      }
      g.globalAlpha = 0.08; g.fillStyle = COL.magenta; g.fillRect(0, 0, view.w, view.h); g.globalAlpha = 1;
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
      setSim(s) { sim = s; parts.length = rings.length = pops.length = arcs.length = ghosts.length = tells.length = 0; hitstop = 0; pending = null; pip.x = s.player.x - 14; pip.y = s.player.y - 22; },
      // A new room (a door, fast travel, a reboot). `slide` is the side the Colonel came in by.
      setRoom(v, slide) {
        room = v.room; accent = v.accent || accent; dark = !!v.dark; glitched = !!v.glitched; npcs = v.npcs || [];
        art = Art.paint(room, { accent, seed: v.seed || 7 });
        scene.setSim(v.sim); litT = 0; latch = null; near = null; touched = new Set();
        if (o.onNear) o.onNear(null);
        slideT = slide && !reduced() ? SLIDE : 0; slideDir = slide || null;
        if (CK.Rooms.doorAt(room, v.sim.player.x, v.sim.player.y)) latch = CK.Rooms.doorAt(room, v.sim.player.x, v.sim.player.y);
      },
      get room() { return room; },
      light(seconds) { litT = Math.max(litT, seconds); },
      flicker() { flickerT = 1.6; },
      // debug: put the Colonel somewhere (the door latch resets, so the real crossing code runs)
      place(x, y) { sim.player.x = x; sim.player.y = y; latch = null; },
      get transitioning() { return slideT > 0; },
      resize(view) {
        if (!view || (deep && deep.img.width === view.w && deep.img.height === view.h)) return;
        deep = Art.deep(view.w, view.h, 3); vig = Art.vignette(view.w, view.h); seedMotes(view.w, view.h);
      },
    };
    return scene;
  }

  CK.RoomScene = { create };
})(typeof window !== 'undefined' ? window : globalThis);
