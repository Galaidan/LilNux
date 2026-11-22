/* Colonel Kernel — tiny canvas engine: loop, sizing, camera, input. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});
  const debug = typeof location !== 'undefined' && /ckdebug/.test(location.search);
  if (debug) CK._test = CK._test || { loops: 0 };

  const ARENA = { w: 1000, h: 600 };

  function create(canvas) {
    const ctx = canvas.getContext('2d');
    let scene = null; let raf = 0; let last = 0; let started = false; let destroyed = false;
    const view = { w: 1, h: 1, dpr: 1, s: 1, ox: 0, oy: 0 };
    const pointers = new Map(); let pinchDist = 0; let pinching = false;

    const engine = {
      canvas, ctx, view, camera: { x: 800, y: 500, zoom: 1 }, running: false,
      reducedMotion: !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches),
      setScene(s) { scene = s; if (s && s.enter) s.enter(); computeView(); },
      get scene() { return scene; },
      start() { started = true; if (!document.hidden) run(); },
      stop() { started = false; halt(); },
      destroy() { destroyed = true; engine.stop(); unbind(); scene = null; },
      resize() { computeView(); },
      toWorld(cx, cy) { const r = canvas.getBoundingClientRect(); return { x: (cx - r.left - view.ox) / view.s, y: (cy - r.top - view.oy) / view.s }; },
      toScreen(x, y) { const r = canvas.getBoundingClientRect(); return { x: x * view.s + view.ox + r.left, y: y * view.s + view.oy + r.top }; },
      worldTransform() { ctx.setTransform(view.dpr * view.s, 0, 0, view.dpr * view.s, view.dpr * view.ox, view.dpr * view.oy); },
      screenTransform() { ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0); },
    };

    function computeView() {
      const r = canvas.getBoundingClientRect();
      view.w = Math.max(1, r.width); view.h = Math.max(1, r.height);
      view.dpr = Math.min(root.devicePixelRatio || 1, 2);
      const bw = Math.round(view.w * view.dpr); const bh = Math.round(view.h * view.dpr);
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
      if (scene && scene.view === 'arena') {
        const top = scene.reserveTop || 0; const room = view.h - top - (scene.reserveBottom || 0);
        view.s = Math.max(0.1, Math.min(view.w / ARENA.w, room / ARENA.h));
        view.ox = (view.w - ARENA.w * view.s) / 2;
        view.oy = top + Math.max(0, (room - ARENA.h * view.s) / 2);
      } else {
        const cam = engine.camera;
        view.s = Math.max(0.5, Math.min(1.25, Math.min(view.w / 760, view.h / 600))) * cam.zoom;
        view.ox = view.w / 2 - cam.x * view.s;
        view.oy = view.h / 2 - cam.y * view.s;
      }
    }

    function frame(ts) {
      if (!engine.running) return;
      const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
      last = ts;
      computeView();
      if (scene) {
        if (scene.update) scene.update(dt);
        computeView();
        if (scene.draw) scene.draw(ctx, ts / 1000, view);
      }
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

    // ---- input ----
    function onVis() { if (document.hidden) halt(); else if (started) run(); }
    function pt(e) { return Object.assign(engine.toWorld(e.clientX, e.clientY), { sx: e.clientX, sy: e.clientY, id: e.pointerId, kind: e.pointerType }); }
    function onDown(e) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()]; pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        if (!pinching) { pinching = true; if (scene && scene.pointer) scene.pointer('cancel', pt(e), e); }
        e.preventDefault(); return;
      }
      if (canvas.setPointerCapture) try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (scene && scene.pointer) scene.pointer('down', pt(e), e);
      e.preventDefault();
    }
    function onMove(e) {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && scene && scene.pinch) {
        const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist) scene.pinch(d / pinchDist); pinchDist = d; return;
      }
      if (pinching) return;
      if (scene && scene.pointer) scene.pointer('move', pt(e), e);
    }
    function onUp(e) {
      pointers.delete(e.pointerId); if (pointers.size < 2) pinchDist = 0;
      if (pinching) { if (!pointers.size) pinching = false; return; }
      if (scene && scene.pointer) scene.pointer('up', pt(e), e);
    }
    function onWheel(e) { if (scene && scene.pinch) { scene.pinch(e.deltaY < 0 ? 1.08 : 1 / 1.08); e.preventDefault(); } }
    function onKey(e) { if (engine.running && scene && scene.key) scene.key(e); }
    function onKeyUp(e) { if (scene && scene.keyup) scene.keyup(e); }
    function onBlur() { if (scene && scene.keyup) scene.keyup({ key: 'blur' }); }
    function onResize() { computeView(); }

    document.addEventListener('visibilitychange', onVis);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    root.addEventListener('keydown', onKey);
    root.addEventListener('keyup', onKeyUp);
    root.addEventListener('blur', onBlur);
    root.addEventListener('resize', onResize);
    function unbind() {
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      root.removeEventListener('keydown', onKey);
      root.removeEventListener('keyup', onKeyUp);
      root.removeEventListener('blur', onBlur);
      root.removeEventListener('resize', onResize);
    }

    computeView();
    return engine;
  }

  CK.Engine = { create, ARENA, debug };
})(typeof window !== 'undefined' ? window : globalThis);
