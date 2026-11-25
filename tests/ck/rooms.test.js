const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/rooms.js');
const R = globalThis.CK.Rooms;
const room = R.parse(R.TRAINING);

test('training room shape', () => {
  assert.equal(R.TILE, 16);
  assert.deepEqual([room.cols, room.rows, room.w, room.h], [30, 17, 480, 272]);
  assert.equal(room.spawns.filter((s) => s.kind === 'glitchMite').length, 3);
  room.spawns.forEach((s) => assert.ok(s.y < room.h / 2, 'mites in the upper half'));
  assert.ok(room.player.y > room.h / 2);
  for (let x = 0; x < 30; x++) { assert.ok(room.solid(x, 0)); assert.ok(room.solid(x, 16)); }
  for (let y = 0; y < 17; y++) { assert.ok(room.solid(0, y)); assert.ok(room.solid(29, y)); }
  assert.ok(room.solid(-1, 5) && room.solid(30, 5) && room.solid(4, -1) && room.solid(4, 17));
  assert.ok(room.tiles[0].includes('D'), 'a door in the top wall');
  assert.ok(room.tiles.some((row) => row.includes('o')), 'light pillars');
});

test('spawns and player sit at tile centres on floor', () => {
  const t = (v) => (v - 8) / 16;
  assert.ok(Number.isInteger(t(room.player.x)) && Number.isInteger(t(room.player.y)));
  assert.equal(room.solid(t(room.player.x), t(room.player.y)), false);
});

test('void, blooms and landmarks are solid; corruption creep is walkable', () => {
  const r = R.parse(['~&H%T', '.....']);
  assert.deepEqual([0, 1, 2, 3, 4].map((x) => r.solid(x, 0)), [true, true, true, false, true]);
});

test('landmark tiles group into rectangles with a kind', () => {
  const r = R.parse(['HH.HH.T', 'HH.HH.T', '.......']);
  assert.deepEqual(r.landmarks, [
    { kind: 'chip', tx: 0, ty: 0, w: 2, h: 2 }, { kind: 'chip', tx: 3, ty: 0, w: 2, h: 2 }, { kind: 'heatsink', tx: 6, ty: 0, w: 1, h: 2 },
  ]);
});

test('training room is a floating plaza with landmarks at the back', () => {
  const flat = room.tiles.flat();
  assert.ok(flat.filter((c) => c === '~').length >= 40, 'plenty of void around the plaza');
  assert.ok(flat.includes('&') && flat.includes('%'), 'corruption blooms and creep');
  assert.deepEqual(room.landmarks.map((l) => l.kind).sort(), ['chip', 'heatsink']);
  for (const l of room.landmarks) {
    assert.ok(l.ty + l.h <= 3, 'landmarks stay along the back wall');
    for (const s of room.spawns) {
      const dx = Math.max(l.tx - (s.x - 8) / 16, 0, (s.x - 8) / 16 - (l.tx + l.w - 1));
      const dy = Math.max(l.ty - (s.y - 8) / 16, 0, (s.y - 8) / 16 - (l.ty + l.h - 1));
      assert.ok(Math.max(dx, dy) >= 2, 'landmarks keep clear of mite spawns');
    }
  }
});

test('parse rejects ragged rows and unknown tiles', () => {
  assert.throws(() => R.parse(['###', '##']), /ragged/);
  assert.throws(() => R.parse(['#?#']), /unknown tile/);
});

test('moveCircle stops at walls and slides along them', () => {
  const m = R.moveCircle(room, 40, 136, 7, -100, 0);
  assert.equal(m.hitX, true); assert.ok(m.x >= 16 + 7 - 0.01, `x=${m.x}`);
  const s = R.moveCircle(room, 40, 136, 7, -100, 20);
  assert.ok(s.y > 136, 'slides vertically while blocked horizontally');
  const free = R.moveCircle(room, 240, 200, 7, 5, 0);
  assert.deepEqual([free.x, free.y, free.hitX, free.hitY], [245, 200, false, false]);
});

test('no tunnelling at max step', () => {
  const m = R.moveCircle(room, 40, 136, 7, -500, 0);
  assert.ok(m.x >= 23 - 0.01, `x=${m.x}`);
  const d = R.moveCircle(room, 240, 40, 7, 0, -500);
  assert.ok(d.y >= 23 - 0.01, `y=${d.y}`);
});
