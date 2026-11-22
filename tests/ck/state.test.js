const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/state.js');
const CK = globalThis.CK;

const FRESH = {
  v: 1, region: 'firmware', node: 'f0', prev: null, explored: { firmware: ['f0'] }, cleared: {},
  learned: [], equipped: [], upgrades: [], modules: [], bits: 0, memories: [], tasksDone: [], codex: [],
  checkpoint: { region: 'firmware', node: 'f0' }, stats: { clean: 0, fights: 0, wins: 0 },
  chapterDone: false, seenIntro: false,
};

test('fresh has expected shape', () => {
  assert.deepEqual(CK.State.fresh(), FRESH);
});

test('fresh returns independent copies', () => {
  const a = CK.State.fresh(); a.learned.push('ls');
  assert.deepEqual(CK.State.fresh().learned, []);
});

test('load of missing or junk input is fresh', () => {
  assert.deepEqual(CK.State.load(undefined), FRESH);
  assert.deepEqual(CK.State.load('junk'), FRESH);
  assert.deepEqual(CK.State.load(null), FRESH);
});

test('load keeps valid saved values', () => {
  const s = CK.State.fresh(); s.bits = 40; s.learned = ['echo', 'ls']; s.node = 'f4'; s.seenIntro = true;
  const back = CK.State.load(JSON.parse(JSON.stringify(s)));
  assert.equal(back.bits, 40); assert.deepEqual(back.learned, ['echo', 'ls']); assert.equal(back.node, 'f4'); assert.equal(back.seenIntro, true);
});

test('load repairs corrupt state', () => {
  const s = CK.State.load({ v: 1, bits: 'lots', learned: 'echo', node: 7, region: 'firmware', checkpoint: { region: 'firmware', node: 'f3' }, evil: 1 });
  assert.equal(s.bits, 0);
  assert.deepEqual(s.learned, []);
  assert.equal(s.node, 'f3');
  assert.equal('evil' in s, false);
});

test('load drops non-string list entries and bad nested objects', () => {
  const s = CK.State.load({ learned: ['echo', 5, null], explored: { firmware: 'x', grub: ['g0'] }, stats: { clean: 'a', wins: 2 } });
  assert.deepEqual(s.learned, ['echo']);
  assert.deepEqual(s.explored, { firmware: ['f0'], grub: ['g0'] });
  assert.deepEqual(s.stats, { clean: 0, fights: 0, wins: 2 });
});

test('clone is deep', () => {
  const a = CK.State.fresh(); const b = CK.State.clone(a); b.explored.firmware.push('f1');
  assert.deepEqual(a.explored.firmware, ['f0']);
});

test('rng is deterministic', () => {
  const a = CK.rng(42); const b = CK.rng(42);
  const xs = [a(), a(), a(), a(), a()]; const ys = [b(), b(), b(), b(), b()];
  assert.deepEqual(xs, ys);
  xs.forEach((x) => assert.ok(x >= 0 && x < 1));
  assert.notDeepEqual(xs, [CK.rng(7)(), 0, 0, 0, 0]);
});
