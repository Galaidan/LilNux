const test = require('node:test');
const assert = require('node:assert/strict');
for (const f of ['state', 'world', 'rules', 'rooms', 'roomgen']) require(`../../js/ck/${f}.js`);
const { World: W, Rules: R, Rooms, RoomGen } = globalThis.CK;
const all = W.REGIONS.flatMap((reg) => Object.keys(reg.nodes).map((id) => [reg, id]));
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };

// Walkable tiles reachable from a point. Corrupt blocks (b) count as passable: kill breaks them.
function flood(room, from) {
  const seen = new Set(); const q = [[Math.floor(from.x / 16), Math.floor(from.y / 16)]];
  const ok = (x, y) => x >= 0 && y >= 0 && x < room.cols && y < room.rows && (!room.solid(x, y) || room.tiles[y][x] === 'b');
  while (q.length) {
    const [x, y] = q.pop(); const k = x + ',' + y;
    if (seen.has(k) || !ok(x, y)) continue; seen.add(k);
    q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}
function adjacentReach(reach, p) {
  if (reach.has(p.tx + ',' + p.ty)) return true;
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach.has((p.tx + dx) + ',' + (p.ty + dy)));
}
const cheb = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));

test('every room is 30x17, parses, and is deterministic', () => {
  for (const [reg, id] of all) {
    const rows = RoomGen.build(reg, id); assert.equal(rows.length, 17, id); rows.forEach((r) => assert.equal(r.length, 30, id));
    Rooms.parse(rows); assert.deepEqual(RoomGen.build(reg, id), rows, id);
  }
});

test('doors match grid neighbours, on both sides', () => {
  for (const [reg, id] of all) {
    const room = Rooms.parse(RoomGen.build(reg, id));
    const want = R.neighbors(reg, id).map((nb) => R.sideOf(reg, id, nb)).sort();
    assert.deepEqual(Object.keys(room.doors).sort(), want, id);
    for (const nb of R.neighbors(reg, id)) assert.ok(Rooms.parse(RoomGen.build(reg, nb)).doors[OPP[R.sideOf(reg, id, nb)]], `${nb} has the matching door`);
  }
});

test('everything is reachable once doors are open and bridges extended', () => {
  for (const [reg, id] of all) {
    const room = Rooms.parse(RoomGen.build(reg, id)); Object.keys(room.doors).forEach((s) => room.setDoor(s, 'open')); room.openBridge();
    const reach = flood(room, room.player);
    assert.equal(room.solid(Math.floor(room.player.x / 16), Math.floor(room.player.y / 16)), false, `${id} player on floor`);
    for (const s of Object.keys(room.doors)) assert.ok(room.doors[s].tiles.some(([x, y]) => reach.has(x + ',' + y)), `${id} door ${s}`);
    for (const p of room.props) assert.ok(adjacentReach(reach, p), `${id} ${p.kind} at ${p.tx},${p.ty}`);
    for (const sp of room.spawns) assert.ok(reach.has(Math.floor(sp.x / 16) + ',' + Math.floor(sp.y / 16)), `${id} spawn`);
  }
});

test('rooms hold what their kind needs', () => {
  const count = (room, k) => room.props.filter((p) => p.kind === k).length;
  for (const [reg, id] of all) {
    const n = reg.nodes[id]; const room = Rooms.parse(RoomGen.build(reg, id));
    if (n.kind === 'start' || n.kind === 'character') assert.equal(count(room, 'terminal'), 1, id);
    if (n.kind === 'character') assert.equal(count(room, 'npc'), n.ref === 'pip' ? 0 : 1, id);
    if (n.kind === 'circuit') assert.equal(count(room, 'terminal'), 1, id);
    if (n.kind === 'item') assert.equal(count(room, 'pedestal'), 1, id);
    if (n.kind === 'memory') assert.equal(count(room, 'crystal'), 1, id);
    if (n.kind === 'exit') assert.equal(count(room, 'gate'), 1, id);
    if (n.kind === 'problem') assert.equal(room.spawns.length, W.CREATURES[n.ref.creature].count, id);
    if (n.kind === 'problem') room.spawns.forEach((s) => assert.equal(s.kind, n.ref.creature, id));
    if (n.kind === 'boss') assert.deepEqual(room.spawns.map((s) => s.kind), [n.ref.creature], id);
    if (!['problem', 'boss'].includes(n.kind)) assert.equal(room.spawns.length, 0, id);
  }
});

test('creatures spawn at least 6 tiles from every door', () => {
  for (const [reg, id] of all) {
    const room = Rooms.parse(RoomGen.build(reg, id));
    const doorTiles = Object.values(room.doors).flatMap((d) => d.tiles);
    for (const s of room.spawns) {
      const t = [Math.floor(s.x / 16), Math.floor(s.y / 16)];
      for (const d of doorTiles) assert.ok(cheb(t, d) >= 6, `${id} spawn ${t} near door ${d}`);
    }
  }
});

test('Power Rail has the echo gap: a switch beyond the retracted east bridge', () => {
  const room = Rooms.parse(RoomGen.build(W.REGIONS[0], 'f1'));
  const sw = room.props.find((p) => p.kind === 'switch'); assert.ok(sw && sw.tx >= 22);
  room.setDoor('e', 'open');
  assert.ok(!room.doors.e.tiles.some(([x, y]) => flood(room, room.player).has(x + ',' + y)), 'east door unreachable before the bridge');
  room.openBridge(); assert.ok(room.doors.e.tiles.some(([x, y]) => flood(room, room.player).has(x + ',' + y)));
});

test('initramfs has the path sign; corrupt blocks guard f2 and g2 crystals', () => {
  assert.equal(Rooms.parse(RoomGen.build(W.REGIONS[1], 'g7')).props.filter((p) => p.kind === 'sign').length, 1);
  for (const [r, id] of [[0, 'f2'], [1, 'g2']]) assert.ok(Rooms.parse(RoomGen.build(W.REGIONS[r], id)).props.some((p) => p.kind === 'block'), id);
});
