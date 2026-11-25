const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/state.js');
const CK = globalThis.CK;

const FRESH = {
  v: 2, region: 'firmware', node: 'f0', prev: null, explored: { firmware: ['f0'] }, cleared: {},
  learned: [], equipped: [], upgrades: [], modules: [], bits: 0, memories: [], tasksDone: [], codex: [],
  switches: [], signs: [],
  checkpoint: { region: 'firmware', node: 'f0' }, stats: { clean: 0, fights: 0, wins: 0 },
  chapterDone: false, seenIntro: false, log: [],
  story: { liltuxMet: false, liltuxTaken: false, restUnlocked: false, rests: 0, lastSeen: 0, glitched: [], oddLogs: [], flicker: false, playMs: 0, lastReminderMs: 0, newMoves: false },
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
  const s = CK.State.load({ v: 2, learned: ['echo', 5, null], explored: { firmware: 'x', grub: ['g0'] }, stats: { clean: 'a', wins: 2 } });
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

test('load repairs the story block', () => {
  const s = CK.State.load({ story: { liltuxMet: 'yes', rests: 3, lastSeen: 'x', glitched: ['g13', 4], oddLogs: 'no', flicker: true } });
  assert.equal(s.story.liltuxMet, false); assert.equal(s.story.rests, 3); assert.equal(s.story.lastSeen, 0);
  assert.deepEqual(s.story.glitched, ['g13']); assert.deepEqual(s.story.oddLogs, []); assert.equal(s.story.flicker, true);
});

test('load keeps a clean, capped message log', () => {
  const entries = Array.from({ length: 170 }, (_, i) => ({ who: 'Pip', kind: 'say', html: 'line ' + i, at: i }));
  const s = CK.State.load({ log: entries.concat([{ who: 5 }, 'junk', { html: 'ok', kind: 'toast' }]) });
  assert.equal(s.log.length, 150);
  assert.equal(s.log[s.log.length - 1].html, 'ok');
  assert.ok(s.log.every((e) => typeof e.html === 'string' && typeof e.kind === 'string'));
});

// ---- save v2 + v1 migration ---------------------------------------------------------------------
const V1 = { v: 1, region: 'firmware', node: 'f9', prev: 'f5', explored: { firmware: ['f0', 'f1', 'f3', 'f5', 'f9'] }, cleared: { firmware: ['f1', 'f3', 'f5'] },
  learned: ['echo', 'ls'], equipped: ['echo', 'ls'], upgrades: ['echo-n', 'cd-dash'], modules: ['ram'], bits: 12, memories: ['[    0.000000] efi: EFI v2.9 by LilNux Firmware'],
  tasksDone: [], codex: ['echo', 'ls'], checkpoint: { region: 'firmware', node: 'f3' }, stats: { clean: 2, fights: 3, wins: 3 }, chapterDone: false, seenIntro: true, log: [],
  story: { liltuxMet: false, liltuxTaken: false, restUnlocked: false, rests: 1, lastSeen: 5, glitched: [], oddLogs: [], flicker: false, playMs: 9000, lastReminderMs: 0 } };
test('fresh saves are v2 with switches and signs', () => {
  const s = globalThis.CK.State.fresh(); assert.equal(s.v, 2); assert.deepEqual([s.switches, s.signs, s.story.newMoves], [[], [], false]);
});
test('v1 save that met Pip gains kill and trap, once, with the new-moves flag', () => {
  const s = globalThis.CK.State.load(V1);
  assert.equal(s.v, 2); assert.deepEqual(s.learned, ['echo', 'ls', 'kill', 'trap']); assert.ok(s.codex.includes('kill') && s.codex.includes('trap'));
  assert.deepEqual(s.equipped, ['echo', 'ls']); assert.equal(s.story.newMoves, true);
});
test('v1 cd-dash upgrade is refunded as 50 bits', () => {
  const s = globalThis.CK.State.load(V1); assert.deepEqual(s.upgrades, ['echo-n']); assert.equal(s.bits, 62);
});
test('v1 progress carries over unchanged', () => {
  const s = globalThis.CK.State.load(V1);
  assert.deepEqual([s.region, s.node, s.prev, s.checkpoint], ['firmware', 'f9', 'f5', { region: 'firmware', node: 'f3' }]);
  assert.deepEqual(s.explored, V1.explored); assert.deepEqual(s.cleared, V1.cleared); assert.deepEqual(s.memories, V1.memories);
  assert.deepEqual(s.stats, V1.stats); assert.equal(s.story.rests, 1); assert.equal(s.story.playMs, 9000);
});
test('v2 saves are not migrated twice', () => {
  const once = globalThis.CK.State.load(V1); once.story.newMoves = false;
  const twice = globalThis.CK.State.load(JSON.parse(JSON.stringify(once)));
  assert.equal(twice.bits, 62); assert.equal(twice.story.newMoves, false); assert.equal(twice.learned.filter((x) => x === 'kill').length, 1);
});
test('a v1 save that never met Pip learns nothing new', () => {
  const s = globalThis.CK.State.load({ v: 1, learned: [], seenIntro: true }); assert.deepEqual(s.learned, []); assert.equal(s.story.newMoves, false);
});
test('switches and signs survive a round trip and junk is dropped', () => {
  const s = globalThis.CK.State.load({ v: 2, switches: ['f1', 7], signs: ['g7'] }); assert.deepEqual([s.switches, s.signs], [['f1'], ['g7']]);
});