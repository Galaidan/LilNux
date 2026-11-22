const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/state.js');
require('../../js/ck/world.js');
require('../../js/ck/rules.js');
const { State, Rules, World } = globalThis.CK;

const fresh = () => State.fresh();
const walk = (s, ...ids) => ids.forEach((id) => { const r = Rules.move(s, id); assert.ok(r.ok, `move to ${id}: ${r.reason}`); });

test('stats base values', () => {
  assert.deepEqual(Rules.stats(fresh()), { slots: 2, cdMul: 1, heatMul: 1, travelMul: 1, sight: 1 });
});

test('ram adds a slot; fan and cpu stack', () => {
  const s = fresh();
  Rules.installModule(s, 'ram'); assert.equal(Rules.stats(s).slots, 3);
  Rules.installModule(s, 'fan'); Rules.installModule(s, 'cpu'); Rules.installModule(s, 'ssd');
  const st = Rules.stats(s);
  assert.equal(st.heatMul, 0.7); assert.equal(st.cdMul, 0.85); assert.equal(st.travelMul, 0.5);
  assert.deepEqual(s.modules, ['ram', 'fan', 'cpu', 'ssd']);
});

test('region and neighbors', () => {
  assert.equal(Rules.region('grub').name, 'GRUB Gate');
  assert.deepEqual(Rules.neighbors(Rules.region('firmware'), 'f1').sort(), ['f0', 'f2', 'f3']);
});

test('reveal adds nodes within radius and skips hidden ones', () => {
  const s = fresh();
  const added = Rules.reveal(s, 'f0');
  assert.deepEqual(added, ['f1']);
  Rules.reveal(s, 'f3', 1);
  assert.ok(s.explored.firmware.includes('f5'));
  assert.ok(!s.explored.firmware.includes('f14'), 'hidden cache stays hidden');
  assert.deepEqual(Rules.reveal(s, 'f0'), []);
});

test('fog blocks unexplored moves; not-adjacent refused', () => {
  const s = fresh();
  assert.deepEqual(Rules.canMove(s, 'f3'), { ok: false, reason: 'not-adjacent' });
  s.explored.firmware = ['f0'];
  assert.deepEqual(Rules.canMove(s, 'f1'), { ok: false, reason: 'fog' });
  Rules.reveal(s, 'f0');
  assert.deepEqual(Rules.canMove(s, 'f1'), { ok: true });
});

test('move sets prev, node, reveals and checkpoints at characters', () => {
  const s = fresh(); Rules.reveal(s, 'f0');
  const r = Rules.move(s, 'f1');
  assert.equal(r.ok, true); assert.equal(r.arrived.kind, 'character');
  assert.equal(s.prev, 'f0'); assert.equal(s.node, 'f1');
  assert.deepEqual(s.checkpoint, { region: 'firmware', node: 'f1' });
  assert.ok(s.explored.firmware.includes('f3'));
});

test('cannot pass an uncleared problem', () => {
  const s = fresh(); Rules.reveal(s, 'f0');
  walk(s, 'f1', 'f3', 'f5');
  assert.deepEqual(Rules.canMove(s, 'f9'), { ok: false, reason: 'blocked' });
  assert.deepEqual(Rules.canMove(s, 'f3'), { ok: true });
  assert.notDeepEqual(s.checkpoint, { region: 'firmware', node: 'f5' });
  Rules.clear(s, 'f5');
  assert.equal(Rules.isCleared(s, 'f5'), true);
  assert.deepEqual(Rules.canMove(s, 'f9'), { ok: true });
});

test('learn adds to codex and auto-equips while slots are free', () => {
  const s = fresh();
  Rules.learn(s, 'echo'); Rules.learn(s, 'ls'); Rules.learn(s, 'cd'); Rules.learn(s, 'ls');
  assert.deepEqual(s.learned, ['echo', 'ls', 'cd']);
  assert.deepEqual(s.codex, ['echo', 'ls', 'cd']);
  assert.deepEqual(s.equipped, ['echo', 'ls']);
});

test('equip respects slots and learned skills', () => {
  const s = fresh();
  assert.equal(Rules.equip(s, 'echo'), false);
  Rules.learn(s, 'echo'); Rules.learn(s, 'ls'); Rules.learn(s, 'cd');
  assert.equal(Rules.equip(s, 'cd'), false);
  assert.equal(Rules.unequip(s, 'ls'), true);
  assert.equal(Rules.equip(s, 'cd'), true);
  assert.deepEqual(s.equipped, ['echo', 'cd']);
  assert.equal(Rules.unequip(s, 'ls'), false);
  Rules.installModule(s, 'ram');
  assert.equal(Rules.equip(s, 'ls'), true);
});

test('quickFix needs the right skill equipped', () => {
  const s = fresh(); Rules.reveal(s, 'f0'); walk(s, 'f1', 'f3', 'f5');
  Rules.learn(s, 'echo');
  assert.equal(Rules.quickFix(s, 'f5', 'echo'), 'fight');
  s.learned.push('ls');
  assert.equal(Rules.quickFix(s, 'f5', 'ls'), 'fight', 'learned but not equipped');
  Rules.equip(s, 'ls');
  assert.equal(Rules.quickFix(s, 'f5', 'ls'), 'fixed');
  assert.equal(Rules.isCleared(s, 'f5'), true);
  assert.equal(s.stats.clean, 1);
});

test('buyUpgrade checks unknown, bits, needs and owned', () => {
  const s = fresh(); Rules.learn(s, 'cd'); Rules.learn(s, 'ls');
  assert.deepEqual(Rules.buyUpgrade(s, 'nope'), { ok: false, reason: 'unknown' });
  s.bits = 100;
  assert.deepEqual(Rules.buyUpgrade(s, 'cd-dash'), { ok: false, reason: 'needs' });
  Rules.installModule(s, 'cpu');
  assert.deepEqual(Rules.buyUpgrade(s, 'cd-dash'), { ok: true });
  assert.equal(s.bits, 50);
  assert.deepEqual(Rules.buyUpgrade(s, 'cd-dash'), { ok: false, reason: 'owned' });
  s.bits = 10;
  assert.deepEqual(Rules.buyUpgrade(s, 'ls-a'), { ok: false, reason: 'bits' });
  assert.deepEqual(Rules.buyUpgrade(s, 'echo-n'), { ok: false, reason: 'needs' }, 'skill not learned');
});

test('reward values', () => {
  const s = fresh();
  const want = { clean: [15, 15], fight: [10, 20], boss: [50, 60], memory: [0, 5], region: [30, 100], puzzle: [10, 10] };
  let total = 0;
  for (const [k, [bits, xp]] of Object.entries(want)) { assert.deepEqual(Rules.reward(s, k), { bits, xp }); total += bits; }
  assert.equal(s.bits, total);
});

test('ls reveals further and ls -a finds hidden caches', () => {
  const s = fresh(); Rules.reveal(s, 'f0'); walk(s, 'f1', 'f3'); Rules.learn(s, 'echo'); Rules.learn(s, 'ls');
  const r = Rules.useOnMap(s, 'ls');
  assert.equal(r.ok, true);
  assert.ok(s.explored.firmware.includes('f9'), 'two hops away');
  assert.ok(!s.explored.firmware.includes('f14'));
  s.upgrades.push('ls-a');
  const r2 = Rules.useOnMap(s, 'ls');
  assert.ok(r2.revealed.includes('f14'));
});

test('hidden nodes are not visible before ls -a', () => {
  const s = fresh(); Rules.reveal(s, 'f0'); walk(s, 'f1', 'f2');
  assert.ok(!s.explored.firmware.includes('f14'));
  assert.deepEqual(Rules.canMove(s, 'f14'), { ok: false, reason: 'fog' });
});

test('cd lists only explored cleared nodes and fast travel works', () => {
  const s = fresh(); Rules.reveal(s, 'f0'); walk(s, 'f1', 'f3', 'f5'); Rules.learn(s, 'cd');
  const t = Rules.useOnMap(s, 'cd').travelTargets;
  assert.ok(t.includes('f0') && t.includes('f3'));
  assert.ok(!t.includes('f5'), 'current node');
  assert.ok(!t.includes('f7'), 'uncleared problem');
  assert.ok(!t.includes('f6'), 'unexplored');
  assert.equal(Rules.fastTravel(s, 'f7'), false);
  assert.equal(Rules.fastTravel(s, 'f0'), true);
  assert.equal(s.node, 'f0'); assert.equal(s.prev, null);
});

test('useOnMap refuses unlearned skills', () => {
  assert.equal(Rules.useOnMap(fresh(), 'ls').ok, false);
});

test('tasks complete and pay once', () => {
  const s = fresh();
  assert.deepEqual(Rules.taskProgress(s, 'bios-check'), { done: 0, need: 2, complete: false });
  Rules.clear(s, 'f5');
  assert.deepEqual(Rules.taskProgress(s, 'bios-check'), { done: 1, need: 2, complete: false });
  Rules.clear(s, 'f7');
  assert.equal(Rules.taskProgress(s, 'bios-check').complete, true);
  assert.deepEqual(Rules.claimTasks(s), ['bios-check']);
  assert.equal(s.bits, 25);
  assert.deepEqual(Rules.claimTasks(s), []);
  assert.equal(s.bits, 25);
  const g = World.REGIONS[1].nodes;
  s.memories.push(g.g2.ref, g.g5.ref, World.REGIONS[0].nodes.f2.ref);
  assert.deepEqual(Rules.taskProgress(s, 'grub-memories'), { done: 2, need: 5, complete: false });
  s.stats.clean = 3;
  assert.equal(Rules.taskProgress(s, 'pip-clean').complete, true);
});

test('enterRegion sets start, checkpoint and reveals', () => {
  const s = fresh(); s.prev = 'f12';
  Rules.enterRegion(s, 'grub');
  assert.equal(s.region, 'grub'); assert.equal(s.node, 'g0'); assert.equal(s.prev, null);
  assert.deepEqual(s.checkpoint, { region: 'grub', node: 'g0' });
  assert.deepEqual(s.explored.grub.sort(), ['g0', 'g1']);
});

test('move reports first visits and clears non-blocking nodes', () => {
  const s = fresh(); Rules.reveal(s, 'f0');
  assert.equal(Rules.move(s, 'f1').first, true);
  assert.equal(Rules.isCleared(s, 'f1'), true);
  Rules.move(s, 'f0');
  assert.equal(Rules.move(s, 'f1').first, false);
  Rules.move(s, 'f3'); const p = Rules.move(s, 'f5');
  assert.equal(p.first, true); assert.equal(Rules.isCleared(s, 'f5'), false, 'problems stay uncleared');
});
