const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/state.js');
require('../../js/ck/world.js');
require('../../js/ck/rooms.js');
require('../../js/ck/action.js');
const { Action, Rooms } = globalThis.CK;
const T = Action.TUNING;

const mk = (o) => Action.create(Object.assign({ room: Rooms.parse(Rooms.TRAINING), kid: false, seed: 1, tools: ['echo', 'ls'] }, o || {}));
const IDLE = { mx: 0, my: 0, ax: 0, ay: 0, kill: false, trap: false, dash: false, tool: null };
// Run `secs` of fixed steps. Press flags (kill/trap/dash/tool) are sent on the first step only.
function run(s, secs, inp) {
  const n = Math.round(secs * 60);
  for (let i = 0; i < n; i++) {
    const held = Object.assign({}, IDLE, inp || {});
    if (i > 0) { held.kill = false; held.trap = false; held.dash = false; held.tool = null; }
    s.step(1 / 60, held);
  }
}
const press = (s, what) => run(s, 1 / 60, what);
function freeze(s) { s.enemies.forEach((e) => { e.speed = 0; e.shootEvery = 999; e.shootTimer = 999; e.lungeEvery = 999; e.lungeTimer = 999; }); }
const drain = (s) => s.events.splice(0).map((e) => e.type);

test('create', () => {
  const s = mk();
  assert.equal(s.enemies.length, 3); assert.equal(s.player.stability, 100); assert.equal(s.player.maxStability, 100);
  s.enemies.forEach((e) => { assert.equal(e.hp, 30); assert.equal(e.cloaked, true); assert.equal(e.kind, 'glitchMite'); });
  assert.equal(s.outcome, null);
  assert.equal(mk({ kid: true }).player.stability, 130);
});

test('moves at MOVE px/s and is stopped by walls', () => {
  const s = mk(); freeze(s); const x0 = s.player.x;
  run(s, 0.5, { mx: 1 });
  assert.ok(Math.abs(s.player.x - x0 - 55) <= 1, `dx=${s.player.x - x0}`);
  run(s, 10, { mx: -1 });
  assert.ok(s.player.x >= 16 + T.PLAYER_R - 0.01);
  assert.deepEqual(s.player.face, { x: -1, y: 0 });
});

test('dash covers DASH_DIST in DASH_TIME and respects cooldown', () => {
  const s = mk(); freeze(s); const x0 = s.player.x;
  run(s, 0.15, { mx: 1, dash: true });
  assert.ok(Math.abs(s.player.x - x0 - 70) <= 2, `dash dx=${s.player.x - x0}`);
  assert.ok(drain(s).includes('dash'));
  const x1 = s.player.x;
  run(s, 0.15, { mx: 1, dash: true });
  assert.ok(s.player.x - x1 < 20, `second dash blocked by cooldown, dx=${s.player.x - x1}`);
});

test('dash i-frames ignore orbs', () => {
  const s = mk(); freeze(s);
  press(s, { mx: 1, dash: true });
  s.spawnOrb({ x: s.player.x, y: s.player.y, vx: 0, vy: 0, dmg: 8 });
  run(s, 0.3);
  assert.equal(s.player.stability, 100);
});

test('hurt gives i-frames', () => {
  const s = mk(); freeze(s);
  s.spawnOrb({ x: s.player.x, y: s.player.y, vx: 0, vy: 0, dmg: 8 });
  press(s);
  assert.equal(s.player.stability, 92); assert.equal(s.player.hitsTaken, 1);
  assert.ok(drain(s).includes('hurt'));
  s.spawnOrb({ x: s.player.x, y: s.player.y, vx: 0, vy: 0, dmg: 8 });
  run(s, 0.3);
  assert.equal(s.player.stability, 92);
});

test('kill cannot hit cloaked; ls reveals; combo 12/12/18', () => {
  const s = mk(); freeze(s); const e = s.enemies[0];
  e.x = s.player.x; e.y = s.player.y + 15;               // straight below; the Colonel faces down at start
  press(s, { kill: true });
  assert.equal(e.hp, 30, 'cloaked mite is not hit');
  run(s, 1); // let the whiff's combo chain window (KILL_TIME + KILL_CHAIN) expire
  press(s, { tool: 'ls' });
  assert.ok(e.revealedUntil > s.time); assert.ok(drain(s).includes('reveal'));
  run(s, 0.1);
  press(s, { kill: true }); assert.equal(e.hp, 18);
  run(s, 0.25);
  press(s, { kill: true }); assert.equal(e.hp, 6);
  run(s, 0.25);
  press(s, { kill: true }); assert.ok(e.dead);
  const ev = drain(s); assert.ok(ev.includes('hit') && ev.includes('kill') && ev.includes('swing'));
});

test('room clear sets outcome win and clean', () => {
  const s = mk(); freeze(s);
  for (const e of s.enemies) {
    e.revealedUntil = 999; e.x = s.player.x; e.y = s.player.y + 15;
    for (let i = 0; i < 3 && !e.dead; i++) { press(s, { kill: true }); run(s, 0.25); }
    run(s, 0.5);
  }
  assert.equal(s.outcome, 'win'); assert.equal(s.clean, true);
  assert.ok(drain(s).includes('clear'));
});

test('losing all stability -> lose', () => {
  const s = mk(); freeze(s);
  for (let i = 0; i < 3 && !s.outcome; i++) { s.player.iframes = 0; s.spawnOrb({ x: s.player.x, y: s.player.y, vx: 0, vy: 0, dmg: 50 }); press(s); }
  assert.equal(s.outcome, 'lose'); assert.equal(s.player.stability, 0);
  assert.ok(drain(s).includes('lose'));
});

test('kid mode slows orbs', () => {
  for (const [kid, speed] of [[false, 80], [true, 64]]) {
    const s = mk({ kid }); freeze(s); s.enemies[0].shootTimer = 0; s.enemies[0].shootEvery = 2.4;
    press(s);
    assert.equal(s.orbs.length, 1);
    assert.ok(Math.abs(Math.hypot(s.orbs[0].vx, s.orbs[0].vy) - speed) < 1e-6);
  }
});

test('mites telegraph, then lunge', () => {
  const s = mk(); freeze(s); const e = s.enemies[0]; e.lungeTimer = 0; e.lungeEvery = 3.5;
  press(s); assert.equal(e.state, 'tell');
  run(s, T.MITE.lungeTell + 0.02); assert.equal(e.state, 'lunge');
  run(s, T.MITE.lungeTime + 0.02); assert.equal(e.state, 'drift');
});

test('deterministic with the same seed', () => {
  const a = mk({ seed: 7 }); const b = mk({ seed: 7 });
  for (const s of [a, b]) { run(s, 2, { mx: 1 }); run(s, 3, { my: -1 }); }
  assert.equal(JSON.stringify(a.enemies), JSON.stringify(b.enemies));
  assert.equal(JSON.stringify(a.player), JSON.stringify(b.player));
});

// ---------------------------------------------------------------- Task 6: trap, echo, SIGKILL, aim-assist
function orbAt(s, dy, speed, extra) { s.spawnOrb(Object.assign({ x: s.player.x, y: s.player.y - dy, vx: 0, vy: speed, dmg: 8 }, extra || {})); }

test('parry reflects an orb at double damage', () => {
  const s = mk(); freeze(s); const e = s.enemies[0];
  e.revealedUntil = 999; e.x = s.player.x; e.y = s.player.y - 80;
  orbAt(s, 30, 100, { src: e.id });                     // contact after ~0.2 s
  run(s, 0.15);
  press(s, { trap: true });
  run(s, 0.1);
  assert.equal(s.player.stability, 100);
  assert.equal(s.orbs.length, 1); assert.equal(s.orbs[0].from, 'player'); assert.equal(s.orbs[0].dmg, 16);
  assert.ok(drain(s).includes('parry'));
  run(s, 1);
  assert.equal(e.hp, 14);
});

test('parry window is 0.18 s (0.30 kid)', () => {
  for (const [kid, stab] of [[false, 92], [true, 130]]) {
    const s = mk({ kid }); freeze(s);
    orbAt(s, 30, 100);
    press(s, { trap: true });
    run(s, 0.4);
    assert.equal(s.player.stability, stab, kid ? 'kid parries' : 'adult window closed');
  }
});

test('missed parry recovery blocks dash', () => {
  const s = mk(); freeze(s);
  press(s, { trap: true });
  run(s, 0.2);
  assert.ok(s.player.recoverT > 0); assert.ok(drain(s).includes('parry-miss'));
  const x0 = s.player.x;
  press(s, { mx: 1, dash: true });
  assert.ok(s.player.x - x0 < 5, `no dash during recovery, dx=${s.player.x - x0}`);
});

test('parrying a lunge stuns', () => {
  const s = mk(); freeze(s); const e = s.enemies[0];
  e.x = s.player.x; e.y = s.player.y - 20; e.state = 'lunge'; e.lungeT = 0.3; e.lungeDir = { x: 0, y: 1 };
  press(s, { trap: true });
  run(s, 0.1);
  assert.ok(e.stunUntil > s.time + 1.0, `stunUntil=${e.stunUntil} time=${s.time}`);
  assert.equal(s.player.stability, 100);
  assert.ok(drain(s).includes('parry'));
});

test('unparryable orb ignores trap; dash avoids it', () => {
  const s = mk(); freeze(s);
  orbAt(s, 30, 100, { unparryable: true });
  press(s, { trap: true });
  run(s, 0.3);
  assert.equal(s.player.stability, 92); assert.ok(drain(s).includes('sigkill'));
  const d = mk(); freeze(d);
  press(d, { mx: 1, dash: true });
  d.spawnOrb({ x: d.player.x, y: d.player.y, vx: 0, vy: 0, dmg: 8, unparryable: true });
  run(d, 0.3);
  assert.equal(d.player.stability, 100);
});

test('parry during dash invulnerability', () => {
  const s = mk(); freeze(s);
  press(s, { mx: 1, dash: true });
  press(s, { mx: 1, trap: true });
  s.spawnOrb({ x: s.player.x, y: s.player.y, vx: 0, vy: 0, dmg: 8 });
  run(s, 0.3);
  assert.equal(s.player.stability, 100);
  assert.ok(!drain(s).includes('hurt'));
  assert.ok(s.orbs.length <= 1);
});

test('echo heat and overheat lock', () => {
  const s = mk(); freeze(s);
  press(s, { tool: 'echo' });
  assert.ok(Math.abs(s.player.heat - 9) < 0.01, `heat=${s.player.heat}`);
  run(s, 0.2);
  assert.ok(Math.abs(s.player.heat - 4) < 0.1, `heat=${s.player.heat}`);
  drain(s);
  s.player.heat = 95; s.cooldowns.echo = 0;
  press(s, { tool: 'echo' });
  assert.ok(drain(s).includes('overheat'));
  assert.ok(Math.abs(s.player.overheatUntil - (s.time + 1.5)) < 0.02);
  run(s, 0.4);
  press(s, { tool: 'echo' });
  assert.ok(!drain(s).includes('echo'), 'locked while overheated');
  run(s, 1.2);
  press(s, { tool: 'echo' });
  assert.ok(drain(s).includes('echo'), 'works again after the lock');
});

test('bolts pass through cloaked enemies', () => {
  const s = mk(); freeze(s); const e = s.enemies[0];
  e.x = s.player.x; e.y = s.player.y + 30;
  press(s, { tool: 'echo' });
  run(s, 0.5);
  assert.equal(e.hp, 30);
});

test('aim-assist picks the enemy inside the cone', () => {
  const s = mk(); freeze(s);
  press(s, { mx: 1 });                                   // face right
  const P = s.player; const at = (deg, d) => ({ x: P.x + Math.cos((deg * Math.PI) / 180) * d, y: P.y - Math.sin((deg * Math.PI) / 180) * d });
  Object.assign(s.enemies[0], at(25, 60), { revealedUntil: 999 });
  Object.assign(s.enemies[1], at(50, 45), { revealedUntil: 999 });
  Object.assign(s.enemies[2], { x: P.x - 100, y: P.y, revealedUntil: 999 });
  press(s, { tool: 'echo' });
  const b = s.bolts[0];
  const deg = (Math.atan2(-b.vy, b.vx) * 180) / Math.PI;
  assert.ok(Math.abs(deg - 25) < 1, `bolt heads ${deg} deg`);
});

test('tools not in loadout are refused', () => {
  const s = mk({ tools: ['ls'] }); freeze(s);
  press(s, { tool: 'echo' });
  assert.equal(s.bolts.length, 0);
});

// ---- chapter rooms: mods, upgrades, kill -9, breakables, switches, empty rooms -------------------
test('a room with no foes never ends', () => {
  const s = mk({ spawns: [] }); for (let i = 0; i < 120; i++) s.step(1 / 60, IDLE);
  assert.equal(s.outcome, null); assert.equal(s.hadFoes, false); assert.ok(!s.events.some((e) => e.type === 'clear'));
});
test('mods scale move speed, dash cooldown, tool cooldowns and heat', () => {
  const s = mk({ spawns: [], tools: ['echo'], mods: { moveMul: 1.2, dashCdMul: 0.75, cdMul: 0.85, heatMul: 0.7 } });
  const x0 = s.player.x; run(s, 0.5, { mx: 1 }); assert.ok(Math.abs(s.player.x - x0 - 66) < 1, `${s.player.x - x0}`);
  press(s, { tool: 'echo', ax: 0, ay: -1 }); // cooldowns decay first, then the shot sets them
  assert.ok(Math.abs(s.cooldowns.echo - 0.35 * 0.85) < 1e-6); assert.ok(Math.abs(s.player.heat - 9 * 0.7) < 1e-6);
  press(s, { dash: true }); run(s, 9 / 60);
  assert.ok(s.player.dashCd > 0 && s.player.dashCd <= 0.35 * 0.75 + 1e-6, `${s.player.dashCd}`);
});
test('echo -n fires 25% faster', () => {
  const s = mk({ spawns: [], tools: ['echo'], upgrades: ['echo-n'] });
  press(s, { tool: 'echo', ax: 0, ay: -1 }); assert.ok(s.cooldowns.echo <= 0.35 * 0.75 + 1e-6);
});
test('kill -9: hold 0.6 s, release, 40 damage', () => {
  const room = Rooms.parse(Rooms.TRAINING);
  const s = mk({ room, upgrades: ['kill-9'], spawns: [{ kind: 'glitchMite', x: room.player.x, y: room.player.y - 18 }] });
  freeze(s); const e = s.enemies[0]; e.revealedUntil = 99; s.player.face = { x: 0, y: -1 };
  s.step(1 / 60, Object.assign({}, IDLE, { kill: true, killHeld: true, ay: -1 }));
  for (let i = 0; i < 40; i++) s.step(1 / 60, Object.assign({}, IDLE, { killHeld: true }));
  assert.ok(s.events.some((v) => v.type === 'charge')); s.step(1 / 60, Object.assign({}, IDLE, { killHeld: false }));
  assert.ok(s.events.some((v) => v.type === 'heavy')); assert.equal(e.dead, true);
});
test('kill -9 needs the upgrade', () => {
  const s = mk({ spawns: [] }); for (let i = 0; i < 50; i++) s.step(1 / 60, Object.assign({}, IDLE, { killHeld: true })); s.step(1 / 60, IDLE);
  assert.ok(!s.events.some((v) => v.type === 'heavy' || v.type === 'charge'));
});
test('ls -a keeps creatures revealed for 7 s', () => {
  const s = mk({ tools: ['ls'], upgrades: ['ls-a'] }); press(s, { tool: 'ls' });
  assert.ok(Math.abs(s.enemies[0].revealedUntil - s.time - 7) < 1e-6);
});
test('kill breaks a breakable in reach; echo does not', () => {
  const room = Rooms.parse(['.....', '..b..', '..P..', '..b..', '.....']);
  const s = mk({ room, spawns: [], breakables: [{ id: 'b1', tiles: [[2, 1]] }, { id: 'b2', tiles: [[2, 3]] }] });
  press(s, { kill: true, ax: 0, ay: -1 });
  const br = s.events.filter((v) => v.type === 'break'); assert.deepEqual(br.map((v) => v.id), ['b1']); assert.equal(room.tiles[1][2], '.');
  run(s, 0.5); press(s, { tool: 'echo', ax: 0, ay: 1 }); run(s, 0.5);
  assert.equal(s.events.filter((v) => v.type === 'break').length, 1); assert.equal(room.tiles[3][2], 'b');
});
test('echo bolts fly over the void and trip a switch', () => {
  const room = Rooms.parse(['.....', 'P~~~!', '.....']);
  const s = mk({ room, spawns: [] }); press(s, { tool: 'echo', ax: 1, ay: 0 }); run(s, 0.5);
  const sw = s.events.filter((v) => v.type === 'switch'); assert.equal(sw.length, 1); assert.deepEqual([sw[0].tx, sw[0].ty], [4, 1]);
});