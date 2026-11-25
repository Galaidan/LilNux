const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/rooms.js');
require('../../js/ck/roomart.js');
const { Rooms, RoomArt } = globalThis.CK;

test('cliff faces hang in the void directly under ground', () => {
  const r = Rooms.parse(['~~~', '.#~', '~~~']);
  assert.deepEqual(RoomArt.cliffs(r), [{ tx: 0, ty: 2 }, { tx: 1, ty: 2 }]);
});

test('every edge of the training plaza over the void gets a cliff', () => {
  const r = Rooms.parse(Rooms.TRAINING);
  const cl = RoomArt.cliffs(r);
  assert.ok(cl.length >= 20, `${cl.length} cliff tiles`);
  cl.forEach(({ tx, ty }) => { assert.equal(r.tiles[ty][tx], '~'); assert.notEqual(r.tiles[ty - 1][tx], '~'); });
});

test('art colours stay in the Neon Circuit family', () => {
  const A = RoomArt.ART;
  assert.equal(A.void0, '#060a1c', 'void is the Neon Circuit background');
  for (const k of ['mag', 'vio', 'mint', 'cyan']) assert.ok(/^#[0-9a-f]{6}$/.test(A[k]), k);
  assert.deepEqual([A.mag, A.vio, A.mint, A.cyan], ['#ff4fd8', '#8b5cff', '#6dffb0', '#38f2ff']);
});
