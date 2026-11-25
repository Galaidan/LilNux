const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/pixengine.js');
const { PixEngine } = globalThis.CK;

test('fit picks a whole-number scale near 270 tall', () => {
  assert.deepEqual(PixEngine.fit(1920, 1080), { k: 4, w: 480, h: 270 });
  assert.deepEqual(PixEngine.fit(2556, 1179), { k: 4, w: 639, h: 294 });
  assert.deepEqual(PixEngine.fit(1366, 768), { k: 3, w: 455, h: 256 });
  assert.deepEqual(PixEngine.fit(300, 200), { k: 1, w: 300, h: 200 });
});

test('camera centres a small room, clamps a big one', () => {
  assert.deepEqual(PixEngine.camera(480, 272, 639, 294, 240, 136), { x: -79, y: -11 });
  assert.deepEqual(PixEngine.camera(480, 272, 455, 256, 10, 10), { x: 0, y: 0 });
  assert.deepEqual(PixEngine.camera(480, 272, 455, 256, 470, 260), { x: 25, y: 16 });
  assert.deepEqual(PixEngine.camera(480, 272, 455, 256, 240, 136), { x: 13, y: 8 });
});

test('step clamps backlog', () => {
  const s = PixEngine.stepper(1 / 60, 5);
  assert.equal(s.advance(1 / 60), 1);
  assert.equal(s.advance(0.5), 5);
  assert.equal(s.advance(1 / 60), 1);
});
