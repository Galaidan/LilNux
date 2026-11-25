const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/state.js');
require('../../js/ck/world.js');
require('../../js/ck/rules.js');
const { State, Rules, World } = globalThis.CK;

const fresh = () => State.fresh();
const walk = (s, ...ids) => ids.forEach((id) => { const r = Rules.move(s, id); assert.ok(r.ok, `move to ${id}: ${r.reason}`); });

test('stats base values', () => {
  assert.deepEqual(Rules.stats(fresh()), { slots: 2, cdMul: 1, heatMul: 1, moveMul: 1, dashCdMul: 1, sight: 1 });
});

test('ram adds a slot; fan and cpu stack', () => {
  const s = fresh();
  Rules.installModule(s, 'ram'); assert.equal(Rules.stats(s).slots, 3);
  Rules.installModule(s, 'fan'); Rules.installModule(s, 'cpu'); Rules.installModule(s, 'ssd');
  const st = Rules.stats(s);
  assert.equal(st.heatMul, 0.7); assert.equal(st.cdMul, 0.85);
  assert.deepEqual(s.modules, ['ram', 'fan', 'cpu', 'ssd']);
});

test('region and neighbors', () => {
  assert.equal(Rules.region('grub').name, 'GRUB Gate');
  assert.deepEqual(Rules.neighbors(Rules.region('firmware'), 'f1').sort(), ['f0', 'f2', 'f3', 'f4']);
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
  const s = fresh(); Rules.learn(s, 'kill'); Rules.learn(s, 'ls');
  assert.deepEqual(Rules.buyUpgrade(s, 'nope'), { ok: false, reason: 'unknown' });
  s.bits = 100;
  assert.deepEqual(Rules.buyUpgrade(s, 'kill-9'), { ok: false, reason: 'needs' });
  Rules.installModule(s, 'cpu');
  assert.deepEqual(Rules.buyUpgrade(s, 'kill-9'), { ok: true });
  assert.equal(s.bits, 50);
  assert.deepEqual(Rules.buyUpgrade(s, 'kill-9'), { ok: false, reason: 'owned' });
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

test('sanitize repairs unknown ids from corrupt or future saves', () => {
  const s = State.load({
    region: 'firmware', node: 'f3', checkpoint: { region: 'firmware', node: 'f99' },
    explored: { firmware: ['f0', 'f1', 'zzz'], mars: ['x'] }, cleared: { firmware: ['f5', 'nope'] },
    learned: ['echo', 'ls', 'cd', 'grep'], equipped: ['grep', 'echo', 'ls', 'cd'], codex: ['grep', 'echo'],
    upgrades: ['ls-a', 'bogus'], modules: ['quantum'], tasksDone: ['bios-check', 'nope'],
  });
  Rules.sanitize(s);
  assert.deepEqual(Object.keys(s.explored), ['firmware']);
  assert.ok(!s.explored.firmware.includes('zzz') && s.explored.firmware.includes('f0') && s.explored.firmware.includes('f3'));
  assert.deepEqual(s.cleared, { firmware: ['f5'] });
  assert.deepEqual(s.learned, ['echo', 'ls', 'cd']);
  assert.deepEqual(s.equipped, ['echo', 'ls'], 'trimmed to 2 slots');
  assert.deepEqual(s.codex, ['echo']);
  assert.deepEqual(s.upgrades, ['ls-a']); assert.deepEqual(s.modules, []); assert.deepEqual(s.tasksDone, ['bios-check']);
  assert.deepEqual(s.checkpoint, { region: 'firmware', node: 'f0' });
  assert.equal(s.node, 'f3');
});

test('sanitize moves an unknown node to the checkpoint and an unknown region to the start', () => {
  const a = State.load({ region: 'firmware', node: 'f99', checkpoint: { region: 'firmware', node: 'f3' }, explored: { firmware: ['f0', 'f1', 'f3'] }, learned: ['echo'] });
  Rules.sanitize(a);
  assert.equal(a.node, 'f3'); assert.deepEqual(a.learned, ['echo'], 'progress kept');
  const b = State.load({ region: 'mars', node: 'm1', checkpoint: { region: 'mars', node: 'm1' }, bits: 50 });
  Rules.sanitize(b);
  assert.deepEqual([b.region, b.node, b.bits], ['firmware', 'f0', 50]);
  assert.ok(b.explored.firmware.includes('f1'));
});

// ---- rooms, tools and doors (Chapter 1 in the action style) ----------------------------------------
const R = Rules; const CK = globalThis.CK;
test('stats: SSD moves 20% faster and dashes recover 25% sooner', () => {
  const s = CK.State.fresh(); s.modules = ['ssd'];
  const st = R.stats(s); assert.equal(st.moveMul, 1.2); assert.equal(st.dashCdMul, 0.75); assert.equal(st.travelMul, undefined);
});
test('kill and trap are moves: learning them never takes a tool slot', () => {
  const s = CK.State.fresh(); R.learn(s, 'kill'); R.learn(s, 'trap'); R.learn(s, 'echo');
  assert.deepEqual(s.equipped, ['echo']); assert.equal(R.equip(s, 'kill'), false);
  assert.deepEqual(s.learned.sort(), ['echo', 'kill', 'trap']);
});
test('clearRoom: no hits is a clean clear with the clean reward', () => {
  const s = CK.State.fresh();
  assert.deepEqual(R.clearRoom(s, 'f5', { clean: true }), { clean: true, bits: 15, xp: 15 });
  assert.ok(R.isCleared(s, 'f5')); assert.equal(s.stats.clean, 1); assert.equal(s.bits, 15);
});
test('clearRoom: a clear with hits pays the fight reward', () => {
  const s = CK.State.fresh();
  assert.deepEqual(R.clearRoom(s, 'f7', { clean: false }), { clean: false, bits: 10, xp: 20 });
  assert.equal(s.stats.clean, 0);
});
test('sideOf', () => {
  const fw = R.region('firmware');
  assert.deepEqual([R.sideOf(fw, 'f1', 'f3'), R.sideOf(fw, 'f1', 'f2'), R.sideOf(fw, 'f1', 'f0'), R.sideOf(fw, 'f1', 'f4'), R.sideOf(fw, 'f1', 'f9')], ['e', 'n', 'w', 's', null]);
});
test('doorStates: forward doors seal in an uncleared problem room; the way back stays open', () => {
  const s = CK.State.fresh(); s.node = 'f5'; s.prev = 'f3'; s.explored.firmware = ['f3', 'f5', 'f6', 'f9'];
  assert.deepEqual(R.doorStates(s, 'f5'), { w: { to: 'f3', kind: 'open' }, n: { to: 'f6', kind: 'sealed' }, s: { to: 'f9', kind: 'sealed' } });
  R.clearRoom(s, 'f5', { clean: false });
  assert.equal(R.doorStates(s, 'f5').n.kind, 'open');
});
test('doorStates: hidden neighbours are wall, then crack once revealed, then open once cleared', () => {
  const s = CK.State.fresh(); s.node = 'f3'; s.explored.firmware = ['f3', 'f1'];
  assert.equal(R.doorStates(s, 'f3').n.kind, 'wall');
  s.explored.firmware.push('f14'); assert.equal(R.doorStates(s, 'f3').n.kind, 'crack');
  R.clear(s, 'f14'); assert.equal(R.doorStates(s, 'f3').n.kind, 'open');
});
test('doorStates: g7 loop doors until the path sign is set', () => {
  const s = CK.State.fresh(); s.region = 'grub'; s.node = 'g7'; s.explored.grub = ['g3', 'g4', 'g7', 'g8', 'g9'];
  const d = R.doorStates(s, 'g7'); assert.deepEqual([d.e.kind, d.s.kind, d.n.kind], ['loop', 'loop', 'open']);
  s.signs = ['g7']; assert.equal(R.doorStates(s, 'g7').e.kind, 'open');
});
test('doorStates: a boss fight seals every door', () => {
  const s = CK.State.fresh(); s.node = 'f12'; s.prev = 'f10'; s.explored.firmware = ['f10', 'f11', 'f12', 'f13'];
  assert.ok(Object.values(R.doorStates(s, 'f12', { bossFight: true })).every((d) => d.kind === 'sealed'));
});
test('doorStates: unexplored neighbours are sealed (fog), never walked into', () => {
  const s = CK.State.fresh(); s.node = 'f1'; s.explored.firmware = ['f0', 'f1'];
  assert.equal(R.doorStates(s, 'f1').e.kind, 'sealed');
});
test('cd fast travel only reaches visited safe rooms', () => {
  const s = CK.State.fresh(); s.learned = ['cd']; s.node = 'f5';
  s.explored.firmware = ['f0', 'f1', 'f2', 'f3', 'f5']; s.cleared.firmware = ['f1', 'f2', 'f3'];
  assert.deepEqual(R.travelTargets(s).sort(), ['f0', 'f1', 'f3']);
  s.story.glitched = ['f3']; assert.deepEqual(R.travelTargets(s).sort(), ['f0', 'f1']);
  assert.equal(R.fastTravel(s, 'f2'), false);
});
test('sanitize v2: equipped holds only learned tools, trimmed to slots; kill-9 is known', () => {
  const s = CK.State.fresh(); s.learned = ['echo', 'ls', 'cd', 'kill', 'trap']; s.equipped = ['kill', 'echo', 'ls', 'cd'];
  s.upgrades = ['kill-9', 'cd-dash']; R.sanitize(s);
  assert.deepEqual(s.equipped, ['echo', 'ls']); assert.deepEqual(s.upgrades, ['kill-9']);
});