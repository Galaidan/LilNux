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

  root.StartFX = { music, field };
})(typeof window !== 'undefined' ? window : globalThis);
