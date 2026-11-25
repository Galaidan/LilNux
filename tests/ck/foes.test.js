const test = require('node:test');
const assert = require('node:assert/strict');
for (const f of ['state', 'world', 'rooms', 'foes', 'action']) require(`../../js/ck/${f}.js`);
const { Action, Rooms, Foes, World } = globalThis.CK;

const OPEN = () => Rooms.parse(Array.from({ length: 17 }, () => '.'.repeat(30)));
const IDLE = { mx: 0, my: 0, ax: 0, ay: 0, kill: false, trap: false, dash: false, tool: null };
const sim = (kind, at, o) => { const room = OPEN(); return Action.create(Object.assign({ room, seed: 3, spawns: [Object.assign({ kind }, at || { x: 240, y: 120 })] }, o || {})); };
const step = (s, inp) => s.step(1 / 60, Object.assign({}, IDLE, inp || {}));
const runUntil = (s, pred, secs) => { for (let i = 0; i < Math.round(secs * 60); i++) { step(s); if (pred()) return true; } return false; };
const types = (s) => s.events.map((e) => e.type);

test('Loop Wisps blink away, then burst eight parryable orbs', () => {
  const s = sim('loopWisp', { x: s0x(), y: 200 });
  const P = s.player; const e = s.enemies[0];
  assert.ok(runUntil(s, () => types(s).includes('burst'), 4), 'a burst within 4 s');
  assert.ok(types(s).includes('blink'));
  assert.ok(Math.hypot(e.x - P.x, e.y - P.y) >= Foes.TUNING.WISP.minDist - 1, 'blinked away from the player');
  const mine = s.orbs.filter((o) => o.src === e.id); assert.equal(mine.length, 8); assert.ok(mine.every((o) => !o.unparryable));
});
function s0x() { return 248; }

test('a wisp burst can be dashed through', () => {
  const s = sim('loopWisp'); const P = s.player; const e = s.enemies[0];
  assert.ok(runUntil(s, () => types(s).includes('burst'), 4));
  const st = P.stability; let dashed = false;
  for (let i = 0; i < 180; i++) {
    const close = s.orbs.some((o) => Math.hypot(o.x - P.x, o.y - P.y) < 20);
    step(s, close && !dashed ? { dash: true } : {}); if (close) dashed = true;
    if (dashed && P.dashT <= 0) break;
  }
  e.dead = true; // only the burst matters here
  assert.equal(P.stability, st);
});

test('the Boot Glitch fans 3 orbs, re-cloaks at half health and fans 5', () => {
  const s = sim('bootGlitch'); const e = s.enemies[0]; e.sigT = 99;
  e.fanT = 0.001; step(s); assert.equal(s.orbs.filter((o) => o.src === e.id).length, 3);
  s.orbs.length = 0; e.revealedUntil = 99; e.hp = e.maxHp / 2; step(s);
  assert.ok(types(s).includes('phase')); assert.equal(e.phase, 1); assert.equal(e.revealedUntil, 0);
  e.fanT = 0.001; step(s); assert.equal(s.orbs.filter((o) => o.src === e.id).length, 5);
});

function sigkillCase(react) {
  const room = OPEN(); const s = Action.create({ room, seed: 3, spawns: [{ kind: 'bootGlitch', x: room.player.x, y: room.player.y - 120 }] });
  const P = s.player; const e = s.enemies[0]; e.speedMul = 0; e.fanT = 99; e.sigT = 0.01;
  assert.ok(runUntil(s, () => types(s).includes('sigkill-tell'), 1), 'telegraph first');
  assert.equal(s.orbs.length, 0, 'no orbs during the telegraph');
  assert.ok(runUntil(s, () => s.orbs.length > 0, Foes.TUNING.BOOT.sigTell + 0.1));
  assert.equal(s.orbs.length, Foes.TUNING.BOOT.sigN); assert.ok(s.orbs.every((o) => o.unparryable));
  const st = P.stability; let reacted = false;
  for (let i = 0; i < 120; i++) {
    const close = s.orbs.some((o) => Math.hypot(o.x - P.x, o.y - P.y) < 16);
    step(s, close && !reacted ? react : {}); if (close) reacted = true;
  }
  return { s, st };
}
test('SIGKILL: telegraph, then an unparryable ring; trap can’t catch it', () => {
  const { s, st } = sigkillCase({ trap: true });
  assert.ok(s.player.stability < st); assert.ok(types(s).includes('sigkill'));
});
test('SIGKILL: dashing through the ring avoids it', () => {
  const { s, st } = sigkillCase({ dash: true, my: -1 }); // through the ring, inside it
  assert.equal(s.player.stability, st);
});

test('the Kernel Wraith has three phases and blinks', () => {
  const s = sim('kernelWraith'); const e = s.enemies[0]; e.sigT = 99;
  assert.ok(runUntil(s, () => types(s).includes('blink'), 5));
  e.hp = 199; step(s); assert.equal(e.phase, 1); e.hp = 99; step(s); assert.equal(e.phase, 2);
  e.hp = 1; step(s); assert.equal(e.phase, 2, 'no fourth phase');
});

test('bosses and wisps take hp from World.CREATURES', () => {
  for (const k of ['loopWisp', 'bootGlitch', 'kernelWraith', 'glitchMite']) assert.equal(sim(k).enemies[0].hp, World.CREATURES[k].hp, k);
  assert.equal(sim('bootGlitch').enemies[0].boss, true); assert.equal(sim('loopWisp').enemies[0].cloaked, false);
});

test('kid mode slows every foe to 0.8x', () => {
  const dist = (kid) => {
    const s = sim('bootGlitch', null, { kid }); const e = s.enemies[0]; e.sigT = 99; e.fanT = 99; const x0 = e.x;
    for (let i = 0; i < 30; i++) step(s);
    return Math.abs(e.x - x0);
  };
  const r = dist(true) / dist(false); assert.ok(Math.abs(r - 0.8) < 0.02, `${r}`);
});
