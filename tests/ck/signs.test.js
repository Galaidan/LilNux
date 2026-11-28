const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/state.js');
require('../../js/ck/world.js');
require('../../js/ck/rules.js');
const { State, Rules, World } = globalThis.CK;

const fresh = () => State.fresh();
const at = (s, id) => { s.node = id; Rules.reveal(s, id); return s; };

test('goal: Pip first, then the nearest unmet teacher, then the boss, then the exit', () => {
  const s = fresh();
  assert.equal(Rules.goalNode(s), 'f1', 'Pip teaches kill');
  Rules.learn(s, 'kill');
  assert.equal(Rules.goalNode(s), 'f3', 'Bios teaches ls (Pip\'s echo and trap are taught on the way)');
  Rules.learn(s, 'ls');
  assert.equal(Rules.goalNode(s), 'f12', 'the boss');
  Rules.clear(s, 'f12');
  assert.equal(Rules.goalNode(s), 'f13', 'the exit');
});

test('goal in GRUB Gate: Grub, then the boss, then Home', () => {
  const s = fresh(); Rules.enterRegion(s, 'grub'); Rules.learn(s, 'kill'); Rules.learn(s, 'ls');
  assert.equal(Rules.goalNode(s), 'g1');
  Rules.learn(s, 'cd');
  assert.equal(Rules.goalNode(s), 'g12');
  Rules.clear(s, 'g12');
  assert.equal(Rules.goalNode(s), 'g13');
});

test('next step follows the shortest path and never through an unfound hidden room', () => {
  const s = at(fresh(), 'f1'); Rules.learn(s, 'kill');
  assert.equal(Rules.nextStep(s, 'f3'), 'f3', 'f1 to f3 is one hop');
  const t = at(fresh(), 'f2'); Rules.learn(t, 'kill');
  assert.equal(Rules.nextStep(t, 'f3'), 'f1', 'f2 reaches f3 through f1, not the hidden cache f14');
  assert.equal(Rules.nextStep(t, 'f2'), null, 'already there');
});

test('goal side is the door toward the next step', () => {
  const s = at(fresh(), 'f1'); Rules.learn(s, 'kill');
  assert.equal(Rules.goalSide(s), 'e');
  const t = at(fresh(), 'f0'); Rules.learn(t, 'kill');
  assert.equal(Rules.goalSide(t), 'e', 'f0 to f1 is east');
});

test('door info: names, reasons and the goal door', () => {
  const s = at(fresh(), 'f1'); Rules.learn(s, 'kill');
  const d = Rules.doorInfo(s, 'f1', { gapSides: ['e'] });
  assert.equal(d.e.name, 'Firmware Vault'); assert.equal(d.e.goal, true); assert.equal(d.e.reason, 'echo the switch');
  assert.equal(d.w.name, 'Cold Boot'); assert.equal(d.w.goal, false); assert.equal(d.w.reason, null);
  assert.equal(d.n.name, 'CMOS Cell'); assert.equal(d.s.name, 'Boot ROM');
});

test('door info: a sealed problem room says why, and an unexplored room has no name', () => {
  const s = at(fresh(), 'f1'); walkTo(s, 'f3', 'f5');
  const d = Rules.doorInfo(s, 'f5', {});
  assert.equal(d.w.kind, 'open'); assert.equal(d.w.name, 'Firmware Vault');
  assert.equal(d.n.kind, 'sealed'); assert.equal(d.n.reason, 'Clear this room first');
  assert.equal(d.s.reason, 'Clear this room first');
  const fog = Rules.doorInfo(at(fresh(), 'f0'), 'f1', {});
  assert.equal(fog.n.name, '???'); assert.equal(fog.s.name, '???');
});

function walkTo(s, ...ids) { ids.forEach((id) => { const r = Rules.move(s, id); assert.ok(r.ok, `move to ${id}: ${r.reason}`); }); }

test('door info: cracks, hidden walls and the boss fight', () => {
  const s = at(fresh(), 'f3');
  const d = Rules.doorInfo(s, 'f3', {});
  assert.equal(d.n.kind, 'wall'); assert.equal(d.n.name, null); assert.equal(d.n.reason, null);
  s.explored.firmware.push('f14');
  const e = Rules.doorInfo(s, 'f3', {});
  assert.equal(e.n.kind, 'crack'); assert.match(e.n.reason, /ls -a/);
  const f = Rules.doorInfo(s, 'f3', { bossFight: true });
  assert.equal(f.w.reason, 'Fight!');
});

test('powered: problem, circuit and boss rooms are off until cleared; the rest are on', () => {
  const s = fresh();
  for (const id of ['f0', 'f1', 'f2', 'f3', 'f4', 'f6', 'f8', 'f13']) assert.equal(Rules.isPowered(s, id), true, id);
  for (const id of ['f5', 'f7', 'f9', 'f12']) assert.equal(Rules.isPowered(s, id), false, id);
  Rules.clear(s, 'f5'); assert.equal(Rules.isPowered(s, 'f5'), true);
});

test('region power comes on when the region\'s power node is cleared', () => {
  const s = fresh();
  assert.equal(World.REGIONS[0].powerNode, 'f9'); assert.equal(World.REGIONS[1].powerNode, 'g9');
  assert.equal(Rules.regionPowered(s), false);
  Rules.clear(s, 'f9'); assert.equal(Rules.regionPowered(s), true);
});
