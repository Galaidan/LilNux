const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/start-fx.js');

const { music, field } = StartFX;
const kinds = (evs) => evs.map((e) => e.kind);
const midis = (evs, kind) => evs.filter((e) => e.kind === kind).map((e) => e.midi);

test('music: loops every 64 steps', () => {
  assert.equal(music.LOOP_STEPS, 64);
  assert.deepEqual(music.stepEvents(5), music.stepEvents(69));
});

test('music: step 0 has kick, bass, arp and three pad notes', () => {
  const evs = music.stepEvents(0);
  for (const k of ['kick', 'bass', 'arp']) assert.ok(kinds(evs).includes(k), k);
  assert.deepEqual(midis(evs, 'pad'), [57, 60, 64]);
});

test('music: step 2 has a hat and no kick', () => {
  const k = kinds(music.stepEvents(2));
  assert.ok(k.includes('hat'));
  assert.ok(!k.includes('kick'));
});

test('music: step 1 has no bass', () => {
  assert.ok(!kinds(music.stepEvents(1)).includes('bass'));
});

test('music: pads only on step 0 of a bar', () => {
  assert.deepEqual(midis(music.stepEvents(16), 'pad'), [53, 57, 60]);
  assert.equal(midis(music.stepEvents(17), 'pad').length, 0);
});

test('music: arp walks the chord', () => {
  const arp = (a, b) => { const out = []; for (let s = a; s <= b; s++) out.push(...midis(music.stepEvents(s), 'arp')); return out; };
  assert.deepEqual(arp(0, 3), [57, 60, 64, 69]);
  assert.deepEqual(arp(16, 19), [53, 57, 60, 65]);
});

test('music: bass follows the chord roots (Am F C G)', () => {
  assert.deepEqual([0, 16, 32, 48].map((s) => midis(music.stepEvents(s), 'bass')[0]), [45, 41, 48, 43]);
});

test('music: midiToHz maps A4 and A3', () => {
  assert.equal(music.midiToHz(69), 440);
  assert.equal(music.midiToHz(57), 220);
});

test('music: a late scheduler catches up instead of replaying missed steps in a clump', () => {
  assert.ok(Math.abs(music.catchUp(5, 5.2) - 5.23) < 1e-9, 'behind: jump to just after now');
  assert.equal(music.catchUp(5.3, 5.2), 5.3);
});

test('music: resuming keeps the audio clock so queued notes are not doubled', () => {
  assert.equal(music.resumeTime(5.12, 5.0), 5.12);
  assert.ok(Math.abs(music.resumeTime(0, 5.0) - 5.02) < 1e-9, 'fresh start: just after now');
});

test('field: counts are clamped', () => {
  assert.equal(field.counts(390, 844).runners, 6);
  assert.equal(field.counts(3000, 2000).runners, 14);
  assert.equal(field.counts(3000, 2000).traces, 40);
  assert.equal(field.counts(390, 844).nodes, 8);
});

test('field: makeRng is deterministic', () => {
  const a = field.makeRng(7); const b = field.makeRng(7); const c = field.makeRng(8);
  const av = [a(), a(), a(), a(), a()]; const bv = [b(), b(), b(), b(), b()]; const cv = [c(), c(), c(), c(), c()];
  assert.deepEqual(av, bv);
  assert.notDeepEqual(av, cv);
  for (const v of av) assert.ok(v >= 0 && v < 1);
});

test('field: makeTraces is deterministic and in bounds', () => {
  const a = field.makeTraces(field.makeRng(3), 12, 20, 15);
  const b = field.makeTraces(field.makeRng(3), 12, 20, 15);
  assert.deepEqual(a, b);
  assert.equal(a.length, 15);
  for (const t of a) {
    assert.ok(['teal', 'violet', 'mint'].includes(t.color));
    assert.ok(t.pts.length >= 2);
    for (const [x, y] of t.pts) assert.ok(x >= 0 && x <= 12 && y >= 0 && y <= 20);
    for (let i = 1; i < t.pts.length; i++) assert.ok(t.pts[i][0] === t.pts[i - 1][0] || t.pts[i][1] === t.pts[i - 1][1], 'axis aligned');
  }
});

test('field: runner trail is capped', () => {
  const rng = field.makeRng(1); const r = field.makeRunner(rng, 800, 800); r.x = 400; r.y = 400; r.max = 100;
  for (let i = 0; i < 200; i++) field.stepRunner(r, 0.016, rng);
  assert.ok(r.trail.length > 0);
  assert.ok(r.trail.length <= field.TRAIL_MAX);
});

test('field: runner snaps to the grid when it turns', () => {
  const rng = field.makeRng(2); const r = field.makeRunner(rng, 4000, 4000);
  r.x = 1500.5; r.y = 1500.5; r.dir = [1, 0]; r.max = 100; r.turnEvery = 0.5; r.sinceTurn = 0;
  let turned = false;
  for (let i = 0; i < 200 && !turned; i++) {
    const before = r.sinceTurn;
    field.stepRunner(r, 0.016, rng);
    if (r.sinceTurn < before) turned = true;
  }
  assert.ok(turned, 'it turned');
  assert.equal(r.x % field.CELL, 0);
  assert.equal(r.y % field.CELL, 0);
  assert.deepEqual(r.dir.map((d) => d !== 0), [false, true]); // was horizontal, now vertical
});

test('field: runner dies when it leaves the screen', () => {
  const rng = field.makeRng(4); const r = field.makeRunner(rng, 400, 400);
  r.x = 390; r.y = 200; r.dir = [1, 0]; r.max = 100; r.turnEvery = 100; r.speed = 100;
  let alive = true;
  for (let i = 0; i < 100 && alive; i++) alive = field.stepRunner(r, 0.05, rng);
  assert.equal(alive, false);
});

test('field: runner fades in, holds, fades out and dies', () => {
  const rng = field.makeRng(5); const r = field.makeRunner(rng, 800, 800);
  r.life = 0; assert.equal(field.runnerAlpha(r), 0);
  r.life = r.max / 2; assert.equal(field.runnerAlpha(r), 1);
  r.life = r.max + 0.8; assert.equal(field.runnerAlpha(r), 0);
  r.life = r.max + 5; assert.equal(field.runnerAlpha(r), 0);
  r.x = 400; r.y = 400; r.life = 0; r.turnEvery = 1000;
  let steps = 0; while (field.stepRunner(r, 0.05, rng) && steps < 1000) steps++;
  assert.ok(steps < 1000, 'eventually dies');
});

test('field: node lifecycle', () => {
  const rng = field.makeRng(6); const n = field.makeNode(rng, 800, 800);
  assert.ok(n.max >= 1.5 && n.max <= 3.9 && n.r >= 3 && n.r <= 7);
  n.life = 0; assert.equal(field.nodeAlpha(n), 0);
  n.life = n.max * 0.3; assert.equal(field.nodeAlpha(n), 1);
  n.life = n.max; assert.equal(field.nodeAlpha(n), 1);
  n.life = n.max + 0.6; assert.equal(field.nodeAlpha(n), 0);
  assert.equal(field.stepNode(n, 0.01), false);
  const fresh = field.makeNode(rng, 800, 800);
  assert.equal(field.stepNode(fresh, 0.01), true);
});
