const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/state.js');
require('../../js/ck/world.js');
require('../../js/ck/rules.js');
require('../../js/ck/combat.js');
const { State, Rules, Fight } = globalThis.CK;

function st(skills, mods) {
  const s = State.fresh();
  (mods || []).forEach((m) => Rules.installModule(s, m));
  skills.forEach((k) => Rules.learn(s, k));
  return s;
}
const run = (f, secs) => { for (let i = 0; i < secs * 60 && !f.outcome; i++) f.update(1 / 60); };
const freeze = (f) => f.enemies.forEach((e) => { e.vx = 0; e.vy = 0; e.frozen = true; });

test('create sets up the arena', () => {
  const f = Fight.create({ creature: 'glitchMite', state: st(['echo', 'ls']), kid: false, seed: 1 });
  assert.equal(f.W, 1000); assert.equal(f.H, 600);
  assert.deepEqual([f.colonel.x, f.colonel.y, f.colonel.stability], [500, 540, 100]);
  assert.equal(f.enemies.length, 3);
  f.enemies.forEach((e) => { assert.equal(e.hp, 30); assert.equal(e.cloaked, true); });
  assert.equal(f.outcome, null); assert.equal(f.hintAvailable, false);
  assert.equal(Fight.create({ creature: 'glitchMite', state: st(['echo']), kid: true, seed: 1 }).hintAvailable, true);
});

test('unequipped skill refused', () => {
  const f = Fight.create({ creature: 'glitchMite', state: st(['echo']), kid: false, seed: 1 });
  assert.deepEqual(f.use('ls', 0, 0), { ok: false, reason: 'not-equipped' });
});

test('cloaked mites ignore bolts until scanned; scan reveals and damages', () => {
  const f = Fight.create({ creature: 'glitchMite', state: st(['echo', 'ls']), kid: false, seed: 1 });
  freeze(f); f.enemies.forEach((e) => (e.shootTimer = 999));
  const e = f.enemies[0];
  assert.equal(f.use('echo', e.x, e.y).ok, true);
  run(f, 1.5);
  assert.equal(e.hp, 30, 'bolt passed through cloaked mite');
  assert.equal(f.use('ls', 0, 0).ok, true);
  f.enemies.forEach((x) => assert.equal(x.hp, 25));
  assert.ok(f.events.some((ev) => ev.type === 'reveal'));
  f.use('echo', e.x, e.y); run(f, 1);
  assert.equal(e.hp, 15);
  assert.ok(f.events.some((ev) => ev.type === 'hit'));
});

test('orbs hurt the colonel', () => {
  const f = Fight.create({ creature: 'glitchMite', state: st(['echo', 'ls']), kid: false, seed: 1 });
  freeze(f); f.enemies.forEach((e) => (e.shootTimer = 999));
  f.orbs.push({ x: 500, y: 300, vx: 0, vy: 200, r: 10, dmg: 8 });
  run(f, 2);
  assert.equal(f.colonel.stability, 92);
  assert.ok(f.events.some((ev) => ev.type === 'hurt'));
});

test('orbs can be shot down', () => {
  const f = Fight.create({ creature: 'glitchMite', state: st(['echo', 'ls']), kid: false, seed: 1 });
  freeze(f); f.enemies.forEach((e) => (e.shootTimer = 999));
  f.orbs.push({ x: 500, y: 200, vx: 0, vy: 100, r: 10, dmg: 8 });
  f.use('echo', 500, 250);
  run(f, 3);
  assert.equal(f.colonel.stability, 100);
  assert.ok(f.events.some((ev) => ev.type === 'orbPop'));
});

test('dash moves along the lane and dodges an orb', () => {
  const f = Fight.create({ creature: 'loopWisp', state: st(['echo', 'cd']), kid: false, seed: 1 });
  freeze(f); f.enemies.forEach((e) => (e.shootTimer = 999));
  f.orbs.push({ x: 500, y: 300, vx: 0, vy: 300, r: 10, dmg: 10 });
  assert.equal(f.use('cd', 800, 10).ok, true);
  assert.equal(f.colonel.x, 800); assert.equal(f.colonel.y, 540);
  run(f, 2);
  assert.equal(f.colonel.stability, 100);
  f.use('cd', 5000, 0);
  run(f, 2); f.use('cd', 5000, 0);
  assert.equal(f.colonel.x, 960);
});

test('cooldown and overheat block use', () => {
  const f = Fight.create({ creature: 'glitchMite', state: st(['echo', 'ls']), kid: false, seed: 1 });
  assert.equal(f.use('ls', 0, 0).ok, true);
  assert.deepEqual(f.use('ls', 0, 0), { ok: false, reason: 'cooldown' });
  const g = Fight.create({ creature: 'glitchMite', state: st(['echo', 'ls']), kid: false, seed: 1 });
  g.heat = 95;
  assert.equal(g.use('echo', 500, 0).ok, true);
  assert.ok(g.events.some((ev) => ev.type === 'overheat'));
  g.update(0.05); g.update(0.05); g.update(0.05); g.update(0.05); g.update(0.05); g.update(0.05); g.update(0.05); g.update(0.05);
  assert.deepEqual(g.use('echo', 500, 0), { ok: false, reason: 'overheat' });
});

test('fan reduces heat and cpu reduces cooldown', () => {
  const f = Fight.create({ creature: 'glitchMite', state: st(['echo', 'ls'], ['fan', 'cpu']), kid: false, seed: 1 });
  f.use('ls', 0, 0);
  assert.ok(Math.abs(f.heat - 15 * 0.7) < 1e-9);
  assert.ok(Math.abs(f.cooldowns.ls - 3 * 0.85) < 1e-9);
});

test('kid mode slows enemies', () => {
  const dist = (kid) => {
    const f = Fight.create({ creature: 'glitchMite', state: st(['echo']), kid, seed: 5 });
    let d = 0; const e = f.enemies[0];
    for (let i = 0; i < 60; i++) { const x = e.x; const y = e.y; f.update(1 / 60); d += Math.hypot(e.x - x, e.y - y); }
    return d;
  };
  const ratio = dist(true) / dist(false);
  assert.ok(ratio > 0.75 && ratio < 0.85, `ratio ${ratio}`);
  const k = Fight.create({ creature: 'glitchMite', state: st(['echo']), kid: true, seed: 5 });
  const a = Fight.create({ creature: 'glitchMite', state: st(['echo']), kid: false, seed: 5 });
  assert.ok(Math.abs(k.enemies[0].r / a.enemies[0].r - 1.15) < 1e-9);
});

test('update clamps dt', () => {
  const f = Fight.create({ creature: 'glitchMite', state: st(['echo']), kid: false, seed: 1 });
  f.update(10);
  assert.ok(Math.abs(f.time - 0.05) < 1e-9);
});

test('use after the fight is over is refused', () => {
  const f = Fight.create({ creature: 'glitchMite', state: st(['echo']), kid: false, seed: 1 });
  f.colonel.stability = 0; f.update(0.01);
  assert.equal(f.outcome, 'lose');
  assert.deepEqual(f.use('echo', 0, 0), { ok: false, reason: 'over' });
});

test('boss changes phase and re-cloaks', () => {
  const f = Fight.create({ creature: 'bootGlitch', state: st(['echo', 'ls']), kid: false, seed: 1 });
  const b = f.enemies[0];
  assert.equal(b.hp, 220); assert.equal(b.phase, 0);
  const every = b.every;
  f.use('ls', 0, 0); b.hp = 100; f.update(0.01);
  assert.equal(b.phase, 1);
  assert.ok(b.revealedUntil <= f.time);
  assert.ok(Math.abs(b.every - every * 0.8) < 1e-9);
  assert.ok(f.events.some((ev) => ev.type === 'phase'));
});

// A simple bot: scan when anything is cloaked, shoot down nearby orbs, else lead shots at the nearest hittable enemy.
function bot(f) {
  let t = 0;
  for (let i = 0; i < 120 * 60 && !f.outcome; i++) {
    f.update(1 / 60); t += 1 / 60;
    if (t < 0.3) continue; t = 0;
    const c = f.colonel;
    const hidden = f.enemies.some((e) => e.cloaked && f.time >= e.revealedUntil);
    if (hidden && f.use('ls', 0, 0).ok) continue;
    const orb = f.orbs.filter((o) => Math.hypot(o.x - c.x, o.y - c.y) < 320).sort((a, b) => b.y - a.y)[0];
    if (orb) { f.use('echo', orb.x, orb.y); continue; }
    const vis = f.enemies.filter((e) => !e.cloaked || f.time < e.revealedUntil);
    const e = vis.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
    if (!e) continue;
    const tt = Math.hypot(e.x - c.x, e.y - c.y) / 700;
    f.use('echo', e.x + e.vx * tt, e.y + e.vy * tt);
  }
  return f.outcome;
}

test('scripted win against glitch mites', () => {
  assert.equal(bot(Fight.create({ creature: 'glitchMite', state: st(['echo', 'ls']), kid: false, seed: 1 })), 'win');
});

test('scripted win against the Corrupt Boot Glitch', () => {
  assert.equal(bot(Fight.create({ creature: 'bootGlitch', state: st(['echo', 'ls']), kid: false, seed: 1 })), 'win');
});
