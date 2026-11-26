/* LilNux — start-screen effects (the Welcome screen and the hub).
 * Pure part: the synthwave-techno score and the Tron circuit field's simulation. No DOM, no audio here,
 * so it can be unit-tested. The runtime (canvas + Web Audio + lifecycle) lives lower in this file. */
(function (root) {
  'use strict';

  // ------------------------------------------------------------ music score (118 BPM, Am F C G)
  const CHORDS = [
    { bass: 45, arp: [57, 60, 64, 69], pad: [57, 60, 64] }, // Am
    { bass: 41, arp: [53, 57, 60, 65], pad: [53, 57, 60] }, // F
    { bass: 48, arp: [60, 64, 67, 72], pad: [60, 64, 67] }, // C
    { bass: 43, arp: [55, 59, 62, 67], pad: [55, 59, 62] }, // G
  ];
  const STEPS_PER_BAR = 16;
  const LOOP_STEPS = STEPS_PER_BAR * CHORDS.length;
  const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /** What plays on sixteenth-note `step`. The loop repeats every LOOP_STEPS. */
  function stepEvents(step) {
    const s = ((step % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS;
    const chord = CHORDS[Math.floor(s / STEPS_PER_BAR)];
    const i = s % STEPS_PER_BAR;
    const evs = [];
    if (i % 4 === 0) evs.push({ kind: 'kick' });
    if (i % 4 === 2) evs.push({ kind: 'hat' });
    if (i % 2 === 0) evs.push({ kind: 'bass', midi: chord.bass });
    evs.push({ kind: 'arp', midi: chord.arp[i % 4] });
    if (i === 0) for (const m of chord.pad) evs.push({ kind: 'pad', midi: m });
    return evs;
  }
  const music = { BPM: 118, STEPS_PER_BAR, LOOP_STEPS, CHORDS, midiToHz, stepEvents };

  // ------------------------------------------------------------ Tron field simulation
  const CELL = 38;
  const TRAIL_MAX = 22;
  const RUNNER_FADE_IN = 0.5, RUNNER_FADE_OUT = 0.8, NODE_FADE_OUT = 0.6, OFFSCREEN = 50;
  const COLORS = ['teal', 'violet', 'mint'];
  const TURNS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // neighbours in this list are 90 degrees apart

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pickColor = (rng) => { const r = rng(); return r < 0.6 ? 'teal' : (r < 0.85 ? 'violet' : 'mint'); };

  /** Small seeded generator (mulberry32): same seed, same circuit, so a resize repaints the same board. */
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function counts(W, H) {
    return {
      runners: clamp(Math.round((W * H) / 95000), 6, 14),
      traces: Math.min(40, Math.round((W * H) / 40000) + 6),
      nodes: 8,
    };
  }

  /** Static circuit traces in grid coordinates: axis-aligned polylines that wander and turn 90 degrees. */
  function makeTraces(rng, cols, rows, count) {
    const out = [];
    for (let n = 0; n < count; n++) {
      const color = pickColor(rng);
      let x = Math.floor(rng() * (cols + 1)); let y = Math.floor(rng() * (rows + 1));
      let dir = Math.floor(rng() * 4);
      const pts = [[x, y]];
      const segs = 4 + Math.floor(rng() * 6);
      for (let s = 0; s < segs; s++) {
        if (rng() < 0.55) dir = (dir + (rng() < 0.5 ? 1 : 3)) % 4;
        const len = 1 + Math.floor(rng() * 4);
        x = clamp(x + TURNS[dir][0] * len, 0, cols);
        y = clamp(y + TURNS[dir][1] * len, 0, rows);
        pts.push([x, y]);
      }
      out.push({ color, pts });
    }
    return out;
  }

  /** A light-runner: glides along the grid, turning 90 degrees now and then, leaving a fading tracer. */
  function makeRunner(rng, W, H) {
    const horiz = rng() < 0.5;
    return {
      x: Math.round((rng() * W) / CELL) * CELL, y: Math.round((rng() * H) / CELL) * CELL,
      dir: horiz ? (rng() < 0.5 ? [1, 0] : [-1, 0]) : (rng() < 0.5 ? [0, 1] : [0, -1]),
      color: pickColor(rng), trail: [], life: 0, max: 4 + rng() * 6, speed: 46 + rng() * 55,
      turnEvery: 0.45 + rng() * 0.9, sinceTurn: 0, bounds: [W, H],
    };
  }

  /** Advance one runner by dt seconds. Returns false once it has faded out or left the screen. */
  function stepRunner(r, dt, rng) {
    r.life += dt; r.sinceTurn += dt;
    r.x += r.dir[0] * r.speed * dt; r.y += r.dir[1] * r.speed * dt;
    if (r.sinceTurn > r.turnEvery) {
      r.sinceTurn = 0;
      r.x = Math.round(r.x / CELL) * CELL + 0; r.y = Math.round(r.y / CELL) * CELL + 0; // "+ 0" turns -0 into 0
      r.dir = r.dir[0] ? (rng() < 0.5 ? [0, 1] : [0, -1]) : (rng() < 0.5 ? [1, 0] : [-1, 0]);
    }
    r.trail.push([r.x, r.y]);
    if (r.trail.length > TRAIL_MAX) r.trail.shift();
    if (r.life >= r.max + RUNNER_FADE_OUT) return false;
    const W = r.bounds[0]; const H = r.bounds[1];
    return !(r.x < -OFFSCREEN || r.x > W + OFFSCREEN || r.y < -OFFSCREEN || r.y > H + OFFSCREEN);
  }

  function runnerAlpha(r) {
    if (r.life >= r.max + RUNNER_FADE_OUT) return 0;
    if (r.life > r.max) return 1 - (r.life - r.max) / RUNNER_FADE_OUT;
    return Math.min(1, r.life / RUNNER_FADE_IN);
  }

  /** A floating data-node: blinks in somewhere, pulses, and vanishes. */
  function makeNode(rng, W, H) {
    return { x: rng() * W, y: rng() * H, color: pickColor(rng), life: 0, max: 1.5 + rng() * 2.4, r: 3 + rng() * 4 };
  }
  function stepNode(n, dt) { n.life += dt; return n.life < n.max + NODE_FADE_OUT; }
  function nodeAlpha(n) {
    if (n.life >= n.max + NODE_FADE_OUT) return 0;
    if (n.life > n.max) return 1 - (n.life - n.max) / NODE_FADE_OUT;
    return Math.min(1, n.life / (n.max * 0.3));
  }

  const field = { CELL, TRAIL_MAX, COLORS, makeRng, counts, makeTraces, makeRunner, stepRunner, runnerAlpha, makeNode, stepNode, nodeAlpha };

  // ------------------------------------------------------------ runtime: canvas field + Web Audio loop
  // Browser only; nothing below runs until mount(). Animated with requestAnimationFrame, audio is
  // synthesized (no files), starts only after the first user gesture, and obeys the shell's sound switch.
  const RGB = { teal: '57,215,196', violet: '180,77,255', mint: '143,246,214' };
  const GRID_SEED = 20261126, LOOKAHEAD = 0.12, TICK_MS = 26, START_DELAY_MS = 300, MASTER_GAIN = 0.2, FADE_IN_S = 0.6, FADE_OUT_S = 0.4;
  const sixteenth = 60 / music.BPM / 4;

  let mounted = false; let opts = null;
  let gridC = null, fxC = null, gc = null, fc = null, W = 0, H = 0, DPR = 1;
  let runners = [], nodes = [], rng = null, raf = 0, last = 0, running = false, reduce = false, resizeTimer = 0;
  let AC = null, master = null, delay = null, noiseBuf = null, schedTimer = 0, stopTimer = 0, startTimer = 0;
  let step = 0, nextTime = 0, wantMusic = false, musicPlaying = false, unlocked = false, unlocking = false;

  const soundOn = () => !!(opts && opts.soundOn && opts.soundOn());

  function setMusicAttr() {
    if (!mounted) { delete document.body.dataset.music; return; }
    document.body.dataset.music = !soundOn() ? 'off' : ((musicPlaying || unlocked) ? 'on' : 'waiting');
  }

  // ---- drawing
  function drawGrid() {
    gc.clearRect(0, 0, W, H);
    const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
    gc.lineWidth = 1; gc.strokeStyle = 'rgba(28,52,84,0.20)'; gc.beginPath();
    for (let x = 0; x <= cols; x++) { gc.moveTo(x * CELL, 0); gc.lineTo(x * CELL, H); }
    for (let y = 0; y <= rows; y++) { gc.moveTo(0, y * CELL); gc.lineTo(W, y * CELL); }
    gc.stroke();
    gc.lineJoin = 'round'; gc.lineCap = 'round';
    for (const t of field.makeTraces(field.makeRng(GRID_SEED), cols, rows, field.counts(W, H).traces)) {
      const c = RGB[t.color];
      gc.beginPath(); gc.moveTo(t.pts[0][0] * CELL, t.pts[0][1] * CELL);
      for (let i = 1; i < t.pts.length; i++) gc.lineTo(t.pts[i][0] * CELL, t.pts[i][1] * CELL);
      gc.shadowColor = 'rgba(' + c + ',0.9)'; gc.shadowBlur = 8; gc.strokeStyle = 'rgba(' + c + ',0.45)'; gc.lineWidth = 1.6; gc.stroke();
      gc.shadowBlur = 0; gc.strokeStyle = 'rgba(' + c + ',0.85)'; gc.lineWidth = 0.8; gc.stroke();
      for (const p of [t.pts[0], t.pts[t.pts.length - 1]]) {
        gc.shadowColor = 'rgba(' + c + ',0.9)'; gc.shadowBlur = 10; gc.fillStyle = 'rgba(' + c + ',0.9)';
        gc.fillRect(p[0] * CELL - 2.5, p[1] * CELL - 2.5, 5, 5); gc.shadowBlur = 0;
      }
    }
  }
  function drawNode(n, a) {
    const c = RGB[n.color];
    fc.shadowColor = 'rgba(' + c + ',1)'; fc.shadowBlur = 14; fc.fillStyle = 'rgba(' + c + ',' + a.toFixed(3) + ')';
    fc.save(); fc.translate(n.x, n.y); fc.rotate(Math.PI / 4); fc.fillRect(-n.r / 2, -n.r / 2, n.r, n.r); fc.restore(); fc.shadowBlur = 0;
  }
  function drawStatic() { // reduced motion: a still scatter of nodes, no loop
    fc.clearRect(0, 0, W, H);
    nodes = [];
    for (let i = 0; i < field.counts(W, H).nodes; i++) nodes.push(field.makeNode(rng, W, H));
    for (const n of nodes) drawNode(n, 0.8);
  }
  function drawRunner(r) {
    const a = field.runnerAlpha(r), c = RGB[r.color], tr = r.trail, n = tr.length;
    fc.lineCap = 'round';
    for (let j = 1; j < n; j++) {
      const p = j / n;
      fc.strokeStyle = 'rgba(' + c + ',' + (a * p * 0.85).toFixed(3) + ')'; fc.lineWidth = p * 2.6;
      fc.beginPath(); fc.moveTo(tr[j - 1][0], tr[j - 1][1]); fc.lineTo(tr[j][0], tr[j][1]); fc.stroke();
    }
    fc.shadowColor = 'rgba(' + c + ',1)'; fc.shadowBlur = 12; fc.fillStyle = 'rgba(' + c + ',' + a.toFixed(3) + ')';
    fc.beginPath(); fc.arc(r.x, r.y, 2.4, 0, 7); fc.fill(); fc.shadowBlur = 0;
  }

  // ---- animation loop
  function frame(ts) {
    if (!running) return;
    const dt = Math.min(0.05, ((ts - last) / 1000) || 0); last = ts;
    fc.clearRect(0, 0, W, H);
    for (let i = runners.length - 1; i >= 0; i--) {
      if (field.stepRunner(runners[i], dt, rng)) drawRunner(runners[i]); else runners.splice(i, 1);
    }
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (field.stepNode(nodes[i], dt)) drawNode(nodes[i], field.nodeAlpha(nodes[i]) * (0.7 + 0.3 * Math.sin(nodes[i].life * 6)) * 0.9); else nodes.splice(i, 1);
    }
    const want = field.counts(W, H);
    if (runners.length < want.runners && rng() < 0.09) runners.push(field.makeRunner(rng, W, H));
    if (nodes.length < want.nodes && rng() < 0.05) nodes.push(field.makeNode(rng, W, H));
    raf = requestAnimationFrame(frame);
  }
  function startLoop() { if (running || reduce || !mounted) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stopLoop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  function resize() {
    W = window.innerWidth; H = window.innerHeight; DPR = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [gridC, fxC]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
    gc.setTransform(DPR, 0, 0, DPR, 0, 0); fc.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawGrid();
    for (const r of runners) r.bounds = [W, H];
    if (reduce) drawStatic();
  }
  function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (mounted) resize(); }, 150); }

  // ---- audio
  function ensureAudio() {
    if (AC) return true;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      AC = new Ctor();
      master = AC.createGain(); master.gain.value = 0; master.connect(AC.destination);
      delay = AC.createDelay(); delay.delayTime.value = sixteenth * 3;
      const fb = AC.createGain(); fb.gain.value = 0.28; const wet = AC.createGain(); wet.gain.value = 0.33;
      delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
      return true;
    } catch (e) { AC = null; return false; }
  }
  function tone(type, midi, t, dur, peak, lp, send) {
    const o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter();
    o.type = type; o.frequency.value = music.midiToHz(midi); f.type = 'lowpass'; f.frequency.value = lp;
    o.connect(f); f.connect(g); g.connect(master); if (send) g.connect(delay);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function kick(t) {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.22);
  }
  function hat(t) {
    if (!noiseBuf) { noiseBuf = AC.createBuffer(1, 1024, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < 1024; i++) d[i] = Math.random() * 2 - 1; }
    const s = AC.createBufferSource(); s.buffer = noiseBuf;
    const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
    const g = AC.createGain(); g.gain.setValueAtTime(0.13, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    s.connect(hp); hp.connect(g); g.connect(master); s.start(t); s.stop(t + 0.05);
  }
  function playEvent(ev, t) {
    if (ev.kind === 'kick') kick(t);
    else if (ev.kind === 'hat') hat(t);
    else if (ev.kind === 'bass') tone('sawtooth', ev.midi, t, 0.22, 0.19, 620, false);
    else if (ev.kind === 'arp') tone('square', ev.midi, t, 0.13, 0.06, 2600, true);
    else if (ev.kind === 'pad') tone('sawtooth', ev.midi, t, sixteenth * 15, 0.03, 1300, false);
  }
  function schedule() {
    while (nextTime < AC.currentTime + LOOKAHEAD) {
      for (const ev of music.stepEvents(step)) playEvent(ev, nextTime);
      nextTime += sixteenth; step++;
    }
    schedTimer = setTimeout(schedule, TICK_MS);
  }
  function ramp(to, secs) {
    const now = AC.currentTime;
    master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(master.gain.value, now); master.gain.linearRampToValueAtTime(to, now + secs);
  }
  function startMusic() {
    if (!mounted || !unlocked || !soundOn() || !ensureAudio()) return;
    clearTimeout(stopTimer); stopTimer = 0;
    wantMusic = true; musicPlaying = true;
    try { const p = AC.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
    if (!schedTimer && !document.hidden) { nextTime = AC.currentTime + 0.1; schedule(); }
    ramp(MASTER_GAIN, FADE_IN_S);
    setMusicAttr();
  }
  function stopMusic(fade) {
    const secs = fade === undefined ? FADE_OUT_S : fade;
    wantMusic = false; musicPlaying = false;
    clearTimeout(startTimer); startTimer = 0;
    if (!AC) return;
    ramp(0.0001, secs);
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => { stopTimer = 0; clearTimeout(schedTimer); schedTimer = 0; if (AC && AC.state === 'running') AC.suspend(); }, secs * 1000 + 100);
  }
  function pauseAudio() { clearTimeout(schedTimer); schedTimer = 0; if (AC && AC.state === 'running') AC.suspend(); }
  function resumeAudio() {
    if (!wantMusic || !AC) return;
    try { const p = AC.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
    if (!schedTimer) { nextTime = AC.currentTime + 0.1; schedule(); }
  }

  // ---- events
  // Safari/iOS only unlock audio inside a real gesture (a finished tap or key press, not a touch start), so the context is
  // created and resumed right inside the handler, silently (master gain is 0). The music itself starts START_DELAY_MS later,
  // so tapping straight through to a mode never plays a blip. The hint only goes away once the context is really running;
  // if the browser refuses, the listeners stay armed and the next tap tries again.
  const GESTURES = ['pointerup', 'click', 'touchend', 'keydown'];
  const armGesture = () => { for (const t of GESTURES) document.addEventListener(t, onGesture, true); };
  const disarmGesture = () => { for (const t of GESTURES) document.removeEventListener(t, onGesture, true); };
  function scheduleStart(ms) {
    clearTimeout(startTimer);
    startTimer = setTimeout(() => { startTimer = 0; if (mounted && soundOn()) startMusic(); }, ms);
  }
  function tryUnlock(startAfterMs) {
    if (unlocked) { scheduleStart(startAfterMs); return; }
    if (unlocking || !ensureAudio()) return;
    unlocking = true;
    let p = null;
    try { p = AC.resume(); } catch (e) { /* ignore */ }
    Promise.resolve(p).catch(() => {}).then(() => {
      unlocking = false;
      if (!AC || AC.state !== 'running') return;
      unlocked = true; disarmGesture();
      if (mounted) { setMusicAttr(); scheduleStart(startAfterMs); }
    });
  }
  function onGesture() { if (soundOn()) tryUnlock(START_DELAY_MS); }
  function onVisibility() {
    if (!mounted) return;
    if (document.hidden) { stopLoop(); pauseAudio(); } else { startLoop(); resumeAudio(); }
  }

  // ---- public lifecycle
  function mount(o) {
    if (mounted) return;
    mounted = true; opts = o || {};
    reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    rng = field.makeRng(Date.now());
    gridC = document.createElement('canvas'); gridC.id = 'start-grid'; gridC.className = 'start-bg';
    fxC = document.createElement('canvas'); fxC.id = 'start-fx'; fxC.className = 'start-bg';
    for (const c of [gridC, fxC]) { c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c); }
    gc = gridC.getContext('2d'); fc = fxC.getContext('2d');
    resize();
    if (!reduce) {
      W = window.innerWidth; H = window.innerHeight;
      for (let i = 0; i < field.counts(W, H).runners; i++) runners.push(field.makeRunner(rng, W, H));
      startLoop();
    }
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    if (unlocked) scheduleStart(START_DELAY_MS); else armGesture();
    setMusicAttr();
  }
  /** `fast: true` cuts the music in ~30 ms instead of fading, for screens with their own sound (the Adventure). */
  function unmount(o) {
    if (!mounted) return;
    mounted = false;
    stopLoop(); stopMusic(o && o.fast ? 0.03 : undefined);
    clearTimeout(resizeTimer); clearTimeout(startTimer); startTimer = 0;
    window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVisibility);
    disarmGesture();
    for (const c of [gridC, fxC]) if (c && c.parentNode) c.parentNode.removeChild(c);
    gridC = fxC = gc = fc = null; runners = []; nodes = [];
    delete document.body.dataset.music;
  }
  function setSound(on) {
    if (!mounted) return;
    if (on) { if (unlocked) startMusic(); else tryUnlock(0); } else stopMusic();
    setMusicAttr();
  }
  const isMounted = () => mounted;
  function _debug() {
    return { running, contexts: AC ? 1 : 0, musicOn: musicPlaying, runners: runners.length, nodes: nodes.length,
      canvases: document.querySelectorAll('#start-grid, #start-fx').length, audioState: AC ? AC.state : null,
      masterGain: master ? Math.round(master.gain.value * 1000) / 1000 : 0 };
  }

  root.StartFX = { music, field, mount, unmount, setSound, isMounted, _debug };
})(typeof window !== 'undefined' ? window : globalThis);
