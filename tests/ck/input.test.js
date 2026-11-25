const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/input.js');
const { Input } = globalThis.CK;

test('stickVector dead zone, clamp, rescale', () => {
  assert.deepEqual(Input.stickVector(3, 0, 40), { x: 0, y: 0 });
  assert.deepEqual(Input.stickVector(80, 0, 40), { x: 1, y: 0 });
  const v = Input.stickVector(0, 23, 40); // 0.575 -> (0.575-0.15)/0.85 = 0.5
  assert.ok(Math.abs(v.y - 0.5) < 1e-9 && v.x === 0, JSON.stringify(v));
  const d = Input.stickVector(-30, -30, 40); // diagonal past the edge -> unit length
  assert.ok(Math.abs(Math.hypot(d.x, d.y) - 1) < 1e-9 && d.x < 0 && d.y < 0);
});

test('mapKey', () => {
  assert.equal(Input.mapKey('w'), 'up'); assert.equal(Input.mapKey('W'), 'up'); assert.equal(Input.mapKey('ArrowLeft'), 'left');
  assert.equal(Input.mapKey('s'), 'down'); assert.equal(Input.mapKey('d'), 'right'); assert.equal(Input.mapKey('ArrowUp'), 'up');
  assert.equal(Input.mapKey(' '), 'dash'); assert.equal(Input.mapKey('Shift'), 'dash');
  assert.equal(Input.mapKey('j'), 'kill'); assert.equal(Input.mapKey('K'), 'trap');
  assert.equal(Input.mapKey('1'), 'slot0'); assert.equal(Input.mapKey('2'), 'slot1'); assert.equal(Input.mapKey('x'), null);
});

test('number keys are tool slots; E and Enter are use', () => {
  assert.deepEqual(['1', '2', '3', 'e', 'Enter', 'j', 'k', ' '].map(globalThis.CK.Input.mapKey), ['slot0', 'slot1', 'slot2', 'use', 'use', 'kill', 'trap', 'dash']);
});
test('slot keys resolve through the equipped order', () => {
  const I = globalThis.CK.Input;
  assert.equal(I.slotTool(['ls', 'echo'], 'slot0'), 'ls'); assert.equal(I.slotTool(['ls'], 'slot2'), null);
});