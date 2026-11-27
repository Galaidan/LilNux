const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/state.js');
require('../../js/ck/world.js');
require('../../js/ck/rules.js');
require('../../js/ck/rooms.js');
require('../../js/ck/roomgen.js');
const { State, World, RoomGen, Rooms } = globalThis.CK;
const fw = World.REGIONS[0]; const grub = World.REGIONS[1];

test('every Firmware room has an area look and a banner blurb; GRUB rooms have blurbs too', () => {
  const zones = new Set(['power', 'rom', 'ram', 'lanes', 'boss']);
  for (const id of Object.keys(fw.nodes)) {
    assert.ok(zones.has(fw.nodes[id].zone), `${id} zone`);
    assert.ok(fw.nodes[id].blurb && fw.nodes[id].blurb.length <= 100, `${id} blurb`);
  }
  for (const id of Object.keys(grub.nodes)) assert.ok(grub.nodes[id].blurb && grub.nodes[id].blurb.length <= 100, `${id} blurb`);
});

test('the five areas group the rooms as designed', () => {
  const of = (z) => Object.keys(fw.nodes).filter((id) => fw.nodes[id].zone === z).sort();
  assert.deepEqual(of('power'), ['f0', 'f1', 'f2']);
  assert.deepEqual(of('ram'), ['f5', 'f6']);
  assert.deepEqual(of('lanes'), ['f10', 'f11', 'f7', 'f9']);
  assert.deepEqual(of('boss'), ['f12', 'f13']);
  assert.deepEqual(of('rom'), ['f14', 'f15', 'f3', 'f4', 'f8']);
});

test('three optional friends live in Firmware and teach no command', () => {
  const friends = Object.keys(fw.nodes).filter((id) => fw.nodes[id].friend);
  assert.deepEqual(friends.sort(), ['f10', 'f2', 'f8']);
  for (const id of friends) {
    const c = World.CHARACTERS[fw.nodes[id].friend];
    assert.equal(c.friend, true); assert.ok(c.lines.length >= 3 && c.lines.length <= 4); assert.ok(c.toast);
    assert.ok(!Object.values(World.SKILLS).some((s) => s.teacher === c.id), 'no skill is taught by a friend');
  }
});

test('friend rooms get an NPC spot the Colonel can walk up to', () => {
  for (const id of ['f2', 'f8', 'f10']) {
    const room = Rooms.parse(RoomGen.build(fw, id));
    const npc = room.props.find((p) => p.kind === 'npc');
    assert.ok(npc, `${id} has a character spot`);
    const open = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => '.,'.includes(room.tiles[npc.ty + dy][npc.tx + dx]));
    assert.ok(open, `${id}: a free tile beside the character`);
  }
});

test('saves track met friends and shrug off junk', () => {
  assert.deepEqual(State.fresh().friends, []);
  const s = State.fresh(); s.friends = ['cmos'];
  assert.deepEqual(State.load(JSON.parse(JSON.stringify(s))).friends, ['cmos']);
  const bad = JSON.parse(JSON.stringify(s)); bad.friends = ['cmos', 7, null];
  assert.deepEqual(State.load(bad).friends, ['cmos']);
  const old = JSON.parse(JSON.stringify(State.fresh())); delete old.friends;
  assert.deepEqual(State.load(old).friends, []);
});

// ---- room layouts: landmarks by area, and every door reachable ------------------------------------------------
const WALK = new Set(['.', ',', '%', '=', 'P', '>', 'm', 'w', 'G', 'K']);
function reachableDoors(rows) {
  const H = rows.length; const W = rows[0].length; let P = null;
  rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'P') P = [x, y]; }));
  const seen = new Set([P + '']); const q = [P];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const c = rows[ny][nx]; if (!WALK.has(c) && c !== 'D') continue;
      if (seen.has(nx + ',' + ny)) continue; seen.add(nx + ',' + ny); if (c !== 'D') q.push([nx, ny]);
    }
  }
  const out = {};
  rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'D') { const s = y === 0 ? 'n' : y === H - 1 ? 's' : x === 0 ? 'w' : 'e'; out[s] = (out[s] === undefined ? true : out[s]) && seen.has(x + ',' + y); } }));
  return out;
}
const has = (rows, letters) => rows.some((r) => [...r].some((c) => letters.includes(c)));

test('Firmware landmarks follow the areas; no random chips or heat sinks', () => {
  const rows = (id) => RoomGen.build(fw, id);
  for (const id of ['f0', 'f1', 'f2']) assert.ok(has(rows(id), 'U'), `${id} capacitor bank`);
  assert.ok(has(rows('f2'), 'V'), 'CMOS Cell coin battery');
  for (const id of ['f3', 'f4', 'f8']) assert.ok(has(rows(id), 'R'), `${id} ROM chips`);
  assert.ok(has(rows('f3'), 'Z'), 'the Vault has the padlocked BIOS chip');
  for (const id of ['f5', 'f6']) assert.ok(has(rows(id), 'M'), `${id} RAM sticks`);
  for (const id of ['f7', 'f9', 'f10', 'f11']) assert.ok(has(rows(id), 'L'), `${id} PCIe slot`);
  assert.ok(has(rows('f11'), 'Q'), 'Clock Gen crystal can');
  for (const id of ['f12', 'f13']) assert.ok(!has(rows(id), 'URMVQZLHT'), `${id} stays bare`);
  for (const id of Object.keys(fw.nodes)) assert.ok(!has(rows(id), 'HT'), `${id} has no random chip or heat sink`);
});

test('GRUB Gate rooms keep their original landmarks', () => {
  const any = Object.keys(grub.nodes).some((id) => has(RoomGen.build(grub, id), 'HT'));
  assert.ok(any);
  for (const id of Object.keys(grub.nodes)) assert.ok(!has(RoomGen.build(grub, id), 'RMVQUZL'), id);
});

test('every door in every room is reachable from the spawn, except the retracted bridge at Power Rail', () => {
  for (const reg of World.REGIONS) {
    for (const id of Object.keys(reg.nodes)) {
      const r = reachableDoors(RoomGen.build(reg, id));
      for (const side of Object.keys(r)) {
        if (id === 'f1' && side === 'e') { assert.equal(r[side], false, 'the bridge is out'); continue; }
        assert.equal(r[side], true, `${id} door ${side}`);
      }
    }
  }
});

test('the north door approach and the doors are never covered by a landmark', () => {
  for (const id of Object.keys(fw.nodes)) {
    const rows = RoomGen.build(fw, id);
    for (let y = 0; y <= 3; y++) for (let x = 12; x <= 17; x++) assert.ok(!'URMVQZL'.includes(rows[y][x]), `${id} ${x},${y}`);
  }
});
