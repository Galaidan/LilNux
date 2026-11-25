const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/state.js');
require('../../js/ck/world.js');
require('../../js/ck/rules.js');
require('../../js/ck/story.js');
const { State, Rules, Story, rng } = globalThis.CK;

function midChapter() {
  const s = State.fresh(); s.seenIntro = true;
  Rules.learn(s, 'echo'); Rules.learn(s, 'ls'); Rules.installModule(s, 'ram'); s.bits = 77;
  s.cleared.firmware = ['f1', 'f3', 'f5', 'f9']; s.memories = ['[    0.000000] BIOS-provided physical RAM map:'];
  s.node = 'f3';
  return s;
}
const keep = (s) => JSON.stringify([s.learned, s.equipped, s.modules, s.bits, s.memories, s.codex, s.upgrades]);

test('quitting counts as a rest only after 5 minutes', () => {
  const s = State.fresh(); s.seenIntro = true;
  assert.equal(Story.restedWhileAway(s, 1000), false, 'never seen before');
  s.story.lastSeen = 1000;
  assert.equal(Story.restedWhileAway(s, 1000 + 4 * 60e3), false);
  assert.equal(Story.restedWhileAway(s, 1000 + 5 * 60e3), true);
  s.seenIntro = false;
  assert.equal(Story.restedWhileAway(s, 1000 + 60 * 60e3), false, 'not before the intro');
});

test('a rest before meeting Lil Tux causes at most one small clue and never loses anything', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const s = midChapter(); const before = keep(s);
    const ev = Story.rest(s, rng(seed));
    assert.ok(['rebreak', 'oddlog', 'flicker'].includes(ev.type), ev.type);
    assert.equal(keep(s), before, 'progress untouched');
    assert.equal(s.story.rests, 1);
    const changes = (ev.type === 'rebreak') + (s.story.oddLogs.length) + (s.story.flicker ? 1 : 0);
    assert.equal(changes, 1, 'exactly one event');
    if (ev.type === 'rebreak') { assert.equal(ev.node, 'f9'); assert.ok(!s.cleared.firmware.includes('f9')); }
    if (ev.type === 'oddlog') assert.match(s.story.oddLogs[0], /swapper\/0/);
  }
});

test('rebreak never hits the node the Colonel stands on, and only cleared circuits', () => {
  const s = midChapter(); s.node = 'f9';
  for (let seed = 1; seed <= 30; seed++) { const c = State.clone(s); const ev = Story.rest(c, rng(seed)); assert.notEqual(ev.type, 'rebreak'); }
  const t = midChapter(); t.cleared.firmware = ['f1', 'f3', 'f5'];
  for (let seed = 1; seed <= 30; seed++) { const c = State.clone(t); assert.notEqual(Story.rest(c, rng(seed)).type, 'rebreak'); }
});

test('the first rest after meeting Lil Tux takes him and completes the chapter', () => {
  const s = midChapter(); s.region = 'grub'; s.node = 'g13'; s.story.liltuxMet = true; s.story.restUnlocked = true;
  const before = keep(s);
  const ev = Story.rest(s, rng(1));
  assert.equal(ev.type, 'taken');
  assert.equal(s.story.liltuxTaken, true); assert.equal(s.chapterDone, true);
  assert.deepEqual(s.story.glitched, ['g13']);
  assert.match(s.story.oddLogs[s.story.oddLogs.length - 1], /swapper\/0.*liltux/);
  assert.equal(keep(s), before);
  const again = Story.rest(s, rng(2));
  assert.equal(again.type, 'flicker', 'later rests stay small until chapter 2');
});

test('break reminder after 35 minutes, then not again for another 35', () => {
  const s = State.fresh();
  assert.equal(Story.addPlayTime(s, 34 * 60e3), false);
  assert.equal(Story.addPlayTime(s, 60e3), true);
  assert.equal(Story.addPlayTime(s, 10 * 60e3), false);
  assert.equal(Story.addPlayTime(s, 25 * 60e3), true);
});

test('rebreak never breaks the checkpoint room', () => {
  const s = midChapter(); s.node = 'f10'; s.checkpoint = { region: 'firmware', node: 'f9' };
  for (let seed = 1; seed <= 40; seed++) { const c = State.clone(s); const ev = Story.rest(c, rng(seed)); assert.notEqual(ev.type, 'rebreak', `seed ${seed}`); }
});
