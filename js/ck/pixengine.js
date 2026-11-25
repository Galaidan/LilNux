/* Colonel Kernel — pixel engine: low-res buffer, whole-number scaling, fixed 60 Hz step. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});
  const debug = typeof location !== 'undefined' && /ckdebug/.test(location.search);
  if (debug) { CK._test = CK._test || {}; CK._test.loops = CK._test.loops || 0; }

  const TARGET_H = 270;
  const BG = '#060a1c';

  // Whole-number scale k so the buffer is about 270 px tall, as wide as the screen allows.
  function fit(devW, devH) {
    const k = Math.max(1, Math.round(devH / TARGET_H));
    return { k, w: Math.floor(devW / k), h: Math.floor(devH / k) };
  }

  // Top-left of the view in room pixels. Negative = room centred inside a larger buffer.
  function camera(roomW, roomH, bufW, bufH, px, py) {
    const axis = (room, buf, p) => {
      if (buf >= room) return -Math.floor((buf - room) / 2);
      return Math.max(0, Math.min(room - buf, Math.round(p - Math.floor(buf / 2))));
    };
    return { x: axis(roomW, bufW, px), y: axis(roomH, bufH, py) };
  }

  // Fixed-step accumulator. A long stall runs at most maxSteps and drops the rest.
  function stepper(step, maxSteps) {
    step = step || 1 / 60; maxSteps = maxSteps || 5;
    let acc = 0;
    return {
      step,
      advance(dt) {
        acc += Math.max(0, dt);
        let n = Math.floor((acc + 1e-9) / step);
        if (n > maxSteps) { n = maxSteps; acc = 0; } else acc -= n * step;
        if (acc < 0) acc = 0;
        return n;
      },
    };
  }

  function create(canvas) {
    const ctx = canvas.getContext('2d');
    const buf = document.createElement('canvas');
    const bctx = buf.getContext('2d');
    const view = { k: 1, w: 1, h: 1, cssW: 1, cssH: 1, dpr: 1, ox: 0, oy: 0 };
    const steps = stepper(1 / 60, 5);
    let scene = null; let raf = 0; let last = 0; let started = false; let destroyed = false; let t = 0;

    const engine = {
      canvas, ctx, buf, bctx, view, running: false,
      reducedMotion: !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches),
      get scene() { return scene; },
      setScene(s) { scene = s; computeView(true); },
      start() { started = true; if (!document.hidden) run(); },
      stop() { started = false; halt(); },
      destroy() { destroyed = true; engine.stop(); document.removeEventListener('visibilitychange', onVis); root.removeEventListener('resize', onResize); scene = null; },
      resize() { computeView(); },
      toBuffer(cx, cy) {
        const r = canvas.getBoundingClientRect();
        return { x: ((cx - r.left) * view.dpr - view.ox) / view.k, y: ((cy - r.top) * view.dpr - view.oy) / view.k };
      },
      render() { draw(); },
    };

    function computeView(force) {
      const r = canvas.getBoundingClientRect();
      const dpr = root.devicePixelRatio || 1;
      const devW = Math.max(1, Math.round(r.width * dpr)); const devH = Math.max(1, Math.round(r.height * dpr));
      const f = fit(devW, devH);
      const changed = force || f.k !== view.k || f.w !== view.w || f.h !== view.h || devW !== canvas.width || devH !== canvas.height;
      if (canvas.width !== devW || canvas.height !== devH) { canvas.width = devW; canvas.height = devH; }
      if (buf.width !== f.w || buf.height !== f.h) { buf.width = f.w; buf.height = f.h; }
      Object.assign(view, { k: f.k, w: f.w, h: f.h, cssW: r.width, cssH: r.height, dpr,
        ox: Math.floor((devW - f.w * f.k) / 2), oy: Math.floor((devH - f.h * f.k) / 2) });
      bctx.imageSmoothingEnabled = false; ctx.imageSmoothingEnabled = false;
      if (changed && scene && scene.resize) scene.resize(view);
    }

    function draw() {
      if (scene && scene.draw) scene.draw(bctx, t, view);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = BG; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buf, 0, 0, view.w, view.h, view.ox, view.oy, view.w * view.k, view.h * view.k);
    }

    function frame(ts) {
      if (!engine.running) return;
      const dt = last ? (ts - last) / 1000 : steps.step;
      last = ts;
      computeView();
      const n = steps.advance(dt);
      for (let i = 0; i < n; i++) { t += steps.step; if (scene && scene.update) scene.update(steps.step); }
      draw();
      raf = root.requestAnimationFrame(frame);
    }
    function run() {
      if (engine.running || destroyed) return;
      engine.running = true; last = 0;
      if (debug) CK._test.loops++;
      raf = root.requestAnimationFrame(frame);
    }
    function halt() {
      if (!engine.running) return;
      engine.running = false; root.cancelAnimationFrame(raf);
      if (debug) CK._test.loops--;
    }
    function onVis() { if (document.hidden) halt(); else if (started) run(); }
    function onResize() { computeView(); }
    document.addEventListener('visibilitychange', onVis);
    root.addEventListener('resize', onResize);

    computeView(true);
    return engine;
  }

  CK.PixEngine = { fit, camera, stepper, create, TARGET_H, debug };
})(typeof window !== 'undefined' ? window : globalThis);
