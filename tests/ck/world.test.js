const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/state.js');
require('../../js/ck/world.js');
const W = globalThis.CK.World;

const adj = (region) => {
  const m = {};
  Object.keys(region.nodes).forEach((id) => (m[id] = []));
  region.edges.forEach(([a, b]) => { m[a].push(b); m[b].push(a); });
  return m;
};
const reach = (region, from, avoid) => {
  const a = adj(region); const seen = new Set([from]); const q = [from];
  while (q.length) { const n = q.shift(); for (const x of a[n]) if (!seen.has(x) && x !== avoid) { seen.add(x); q.push(x); } }
  return seen;
};
const nodesOf = (region, kind) => Object.entries(region.nodes).filter(([, n]) => n.kind === kind);

test('two regions in boot order', () => {
  assert.deepEqual(W.REGIONS.map((r) => r.id), ['firmware', 'grub']);
  assert.equal(W.REGIONS[0].accent, '#ffb347');
  assert.equal(W.REGIONS[1].accent, '#b6ff5c');
});

test('skills match the spec values', () => {
  assert.deepEqual(Object.keys(W.SKILLS), ['kill', 'trap', 'echo', 'ls', 'cd']);
  assert.deepEqual(W.SKILLS.echo.fight, { type: 'bolt', dmg: 10, cd: 0.35, heat: 9 });
  assert.deepEqual(W.SKILLS.ls.fight, { type: 'scan', reveal: 4, cd: 3, heat: 15 });
  assert.deepEqual(W.SKILLS.cd.fight, { type: 'dash', cd: 1.2, heat: 6 });
  assert.equal(W.SKILLS.ls.upgrade.id, 'ls-a');
  assert.equal(W.SKILLS.echo.teacher, 'pip');
  assert.ok(W.SKILLS.ls.learnTest.test('ls -a') && !W.SKILLS.ls.learnTest.test('lsblk'));
  assert.ok(W.SKILLS.cd.learnTest.test('cd /boot') && W.SKILLS.cd.learnTest.test('cd'));
  assert.ok(W.SKILLS.echo.learnTest.test('echo hi') && !W.SKILLS.echo.learnTest.test('echo'));
});

test('modules and creatures match the spec values', () => {
  assert.deepEqual(Object.keys(W.MODULES).sort(), ['cpu', 'fan', 'ram', 'ssd']);
  assert.equal(W.MODULES.ram.slots, 1); assert.equal(W.MODULES.fan.heatMul, 0.7);
  assert.equal(W.MODULES.cpu.cdMul, 0.85); assert.equal(W.MODULES.ssd.moveMul, 1.2);
  const c = W.CREATURES;
  assert.equal(c.glitchMite.hp, 30); assert.equal(c.glitchMite.cloaked, true); assert.equal(c.glitchMite.count, 3);
  assert.equal(c.loopWisp.pattern, 'blink'); assert.equal(c.bootGlitch.hp, 220); assert.equal(c.bootGlitch.phases, 2);
  assert.equal(c.kernelWraith.hp, 300); assert.equal(c.kernelWraith.phases, 3);
  for (const k of Object.keys(c)) for (const f of ['name', 'weakText', 'real']) assert.ok(c[k][f], `${k}.${f}`);
});

for (const region of W.REGIONS) {
  test(`${region.id}: every edge joins existing nodes`, () => {
    region.edges.forEach(([a, b]) => { assert.ok(region.nodes[a], a); assert.ok(region.nodes[b], b); });
  });
  test(`${region.id}: every node reachable from start`, () => {
    assert.equal(reach(region, region.start).size, Object.keys(region.nodes).length);
  });
  test(`${region.id}: boss reachable and the way on is beyond the boss`, () => {
    assert.equal(region.nodes[region.boss].kind, 'boss');
    const end = region.exit || region.home;
    assert.ok(region.exit ? region.nodes[end].kind === 'exit' : region.nodes[end].ref === 'liltux');
    assert.ok(!reach(region, region.start, region.boss).has(end));
  });
  test(`${region.id}: every problem skill is taught earlier on the path`, () => {
    for (const [id, n] of nodesOf(region, 'problem')) {
      const skill = n.ref.skill;
      const teacher = W.SKILLS[skill].teacher;
      if (teacher === 'pip') continue;
      const where = W.REGIONS.findIndex((r) => nodesOf(r, 'character').some(([, c]) => c.ref === teacher));
      const here = W.REGIONS.indexOf(region);
      assert.ok(where >= 0 && where <= here, `${skill} teacher exists`);
      if (where < here) continue;
      const tnode = nodesOf(region, 'character').find(([, c]) => c.ref === teacher)[0];
      assert.ok(reach(region, region.start, id).has(tnode), `${tnode} reachable without ${id}`);
    }
  });
  test(`${region.id}: refs exist`, () => {
    for (const [, n] of Object.entries(region.nodes)) {
      if (n.kind === 'character') assert.ok(W.CHARACTERS[n.ref], n.ref);
      if (n.kind === 'problem') { assert.ok(W.CREATURES[n.ref.creature]); assert.ok(W.SKILLS[n.ref.skill]); assert.ok(n.ref.title && n.ref.real); }
      if (n.kind === 'boss') assert.ok(W.CREATURES[n.ref.creature] && W.CREATURES[n.ref.creature].boss && W.MODULES[n.ref.drop]);
      if (n.kind === 'item') assert.ok(W.MODULES[n.ref] || (n.ref && n.ref.bits > 0), JSON.stringify(n.ref));
      if (n.kind === 'circuit') assert.ok(n.ref.grid && n.ref.grid.cells.length === n.ref.grid.rows);
      assert.ok(typeof n.x === 'number' && typeof n.y === 'number' && n.label);
      assert.ok(n.x >= 0 && n.x <= 1600 && n.y >= 0 && n.y <= 1000);
    }
  });
  test(`${region.id}: 5 memories in dmesg format, 2 hidden caches`, () => {
    const mem = nodesOf(region, 'memory');
    assert.equal(mem.length, 5);
    mem.forEach(([, n]) => assert.match(n.ref, /^\[\s*\d+\.\d{6}\] /));
    assert.equal(Object.values(region.nodes).filter((n) => n.hidden).length, 2);
  });
}

test('chapter content: characters, puzzles, items, bosses', () => {
  const [f, g] = W.REGIONS;
  assert.ok(nodesOf(f, 'character').some(([, n]) => n.ref === 'pip'));
  assert.ok(nodesOf(f, 'character').some(([, n]) => n.ref === 'bios'));
  assert.ok(nodesOf(g, 'character').some(([, n]) => n.ref === 'grub'));
  assert.equal(nodesOf(f, 'problem').length, 2); assert.equal(nodesOf(g, 'problem').length, 2);
  nodesOf(f, 'problem').forEach(([, n]) => assert.deepEqual([n.ref.skill, n.ref.creature], ['ls', 'glitchMite']));
  nodesOf(g, 'problem').forEach(([, n]) => assert.deepEqual([n.ref.skill, n.ref.creature], ['cd', 'loopWisp']));
  assert.equal(nodesOf(f, 'circuit').length, 1); assert.equal(nodesOf(g, 'circuit').length, 2);
  assert.deepEqual([f.nodes[f.boss].ref.creature, f.nodes[f.boss].ref.drop], ['bootGlitch', 'fan']);
  assert.deepEqual([g.nodes[g.boss].ref.creature, g.nodes[g.boss].ref.drop], ['kernelWraith', 'ssd']);
  assert.ok(nodesOf(f, 'item').some(([, n]) => n.ref === 'ram'));
  assert.ok(nodesOf(g, 'item').some(([, n]) => n.ref === 'cpu'));
  assert.equal(f.nodes[f.start].kind, 'start'); assert.equal(f.start, 'f0'); assert.equal(g.start, 'g0');
});

test('tasks reference real givers', () => {
  assert.deepEqual(Object.keys(W.TASKS), ['bios-check', 'grub-memories', 'pip-clean']);
  for (const t of Object.values(W.TASKS)) { assert.ok(W.CHARACTERS[t.giver]); assert.ok(t.bits > 0 && t.text && t.goal); }
});

test('characters have lines', () => {
  for (const id of ['pip', 'bios', 'grub']) {
    const c = W.CHARACTERS[id];
    assert.ok(c.name && c.title && c.color && c.lines.length >= 3, id);
  }
  assert.match(W.CHARACTERS.pip.lines.join(' '), /PID 1/);
});

test('real-Linux facts: missing kernel, boot loops, kernel command line', () => {
  const w = W.CREATURES.kernelWraith.real;
  assert.doesNotMatch(w, /grub>/); assert.match(w, /not found/);
  assert.doesNotMatch(W.REGIONS[1].nodes.g4.ref.real, /always/);
  assert.match(W.REGIONS[1].nodes.g5.ref, /Kernel command line: BOOT_IMAGE=/);
});

test('GRUB Gate ends at Home, where Lil Tux lives', () => {
  const g = W.REGIONS[1];
  assert.equal(g.exit, null); assert.equal(g.home, 'g13');
  assert.deepEqual([g.nodes.g13.kind, g.nodes.g13.ref, g.nodes.g13.label], ['character', 'liltux', 'Home']);
  const lt = W.CHARACTERS.liltux;
  assert.ok(lt && lt.name === 'Lil Tux');
  assert.match(lt.lines.join(' '), /rest/i); assert.match(lt.lines.join(' '), /systemctl suspend/);
  assert.ok(!Object.values(W.SKILLS).some((s) => s.teacher === 'liltux'), 'resting is not a combat skill');
});

// ---- Chapter 1 in the action style ------------------------------------------------------------
const [FW, GR] = W.REGIONS;
test('every edge joins grid neighbours and no two rooms share a cell', () => {
  for (const reg of W.REGIONS) {
    assert.deepEqual(Object.keys(reg.cells).sort(), Object.keys(reg.nodes).sort());
    const seen = new Set();
    for (const id of Object.keys(reg.cells)) { const k = reg.cells[id].join(','); assert.ok(!seen.has(k), id); seen.add(k); }
    for (const [a, b] of reg.edges) {
      const [ax, ay] = reg.cells[a]; const [bx, by] = reg.cells[b];
      assert.equal(Math.abs(ax - bx) + Math.abs(ay - by), 1, `${a}-${b}`);
    }
  }
});
test('chapter 1 grid layout', () => {
  assert.deepEqual([FW.cells.f0, FW.cells.f1, FW.cells.f3, FW.cells.f12, FW.cells.f13], [[0, 1], [1, 1], [2, 1], [4, 3], [5, 3]]);
  assert.deepEqual([GR.cells.g0, GR.cells.g7, GR.cells.g12, GR.cells.g13], [[0, 1], [2, 2], [4, 3], [5, 3]]);
  const has = (reg, a, b) => reg.edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  assert.ok(has(FW, 'f1', 'f4') && !has(FW, 'f3', 'f4'));
  assert.ok(has(GR, 'g3', 'g14') && !has(GR, 'g5', 'g14'));
  assert.equal(FW.edges.length, 18); assert.equal(GR.edges.length, 18);
});
test('kill and trap are always-on moves taught by Pip; cd has no dash upgrade', () => {
  for (const id of ['kill', 'trap']) { assert.equal(W.SKILLS[id].teacher, 'pip'); assert.equal(W.SKILLS[id].move, true); }
  assert.equal(W.SKILLS.kill.upgrade.id, 'kill-9'); assert.equal(W.SKILLS.kill.upgrade.needs, 'cpu');
  assert.equal(W.SKILLS.trap.upgrade, undefined); assert.equal(W.SKILLS.cd.upgrade, undefined);
});
test('kill and trap lines are accurate', () => {
  assert.equal(W.SKILLS.kill.real, '`kill` sends a signal to a process. By default it’s SIGTERM, which asks it to quit politely; `kill -9` sends SIGKILL, which the process can’t catch or ignore.');
  assert.equal(W.SKILLS.trap.real, 'In bash, `trap \'echo caught\' INT` runs a command when the shell gets SIGINT (Ctrl+C). Scripts use it to clean up. SIGKILL and SIGSTOP can’t be trapped.');
  const l = W.SKILLS.kill.term('kill -l');
  assert.ok(l.ok); for (const s of ['2) SIGINT', '9) SIGKILL', '15) SIGTERM', '19) SIGSTOP']) assert.ok(l.html.includes(s), s);
  assert.equal(W.SKILLS.kill.term('kill').ok, false); // bash prints usage
  assert.match(W.SKILLS.kill.term('kill 4242').html, /\(4242\) - No such process/);
  assert.ok(W.SKILLS.trap.term("trap 'echo caught' INT").ok);
  for (const ok of ['kill -l', 'kill 4242', 'kill -9 4242']) assert.ok(W.SKILLS.kill.learnTest.test(ok), ok);
  for (const ok of ["trap 'echo caught' INT", 'trap -l']) assert.ok(W.SKILLS.trap.learnTest.test(ok), ok);
});
test('Pip opens with kill; Grub teaches cd for terminals and path signs', () => {
  assert.match(W.CHARACTERS.pip.lines[3], /kill/); assert.doesNotMatch(W.CHARACTERS.pip.lines[3], /echo/);
  assert.doesNotMatch(W.CHARACTERS.grub.lines.join(' '), /dash/);
});
test('SSD speeds movement and dashing; dark rooms; Home accent; clean task', () => {
  assert.deepEqual([W.MODULES.ssd.moveMul, W.MODULES.ssd.dashCdMul, W.MODULES.ssd.travelMul], [1.2, 0.75, undefined]);
  assert.deepEqual(Object.keys(FW.nodes).filter((id) => FW.nodes[id].dark), ['f0', 'f4', 'f8']);
  assert.equal(GR.nodes.g13.accent, '#f5a623');
  assert.equal(W.TASKS['pip-clean'].text, 'Clear 3 problem rooms without taking a hit');
});
test('kill and trap reject made-up signals the way bash does', () => {
  const k = W.SKILLS.kill; const t = W.SKILLS.trap;
  const bad = k.term('kill -banana 5'); assert.equal(bad.ok, false); assert.match(bad.html, /bash: kill: banana: invalid signal specification/);
  for (const ok of ['kill -9 4242', 'kill -KILL 4242', 'kill -SIGTERM 4242', 'kill -term 4242', 'kill -s TERM 4242']) assert.ok(k.term(ok).ok, ok);
  assert.ok(!k.learnTest.test('kill -banana 5') || !k.term('kill -banana 5').ok);
  assert.equal(k.term('kill -99 4242').ok, false);
  const tb = t.term("trap 'echo x' FOO"); assert.equal(tb.ok, false); assert.match(tb.html, /bash: trap: FOO: invalid signal specification/);
  for (const ok of ["trap 'echo caught' INT", "trap 'echo bye' EXIT", "trap 'echo x' SIGTERM HUP"]) assert.ok(t.term(ok).ok, ok);
});
test('kill 1 is not permitted (and Pip takes it personally)', () => {
  const r = W.SKILLS.kill.term('kill 1');
  assert.ok(r.ok); assert.match(r.html, /bash: kill: \(1\) - Operation not permitted/); assert.match(r.html, /PID 1/);
});
