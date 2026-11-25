const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/pixel.js');
require('../../js/ck/sprites.js');
const { Pixel, Sprites } = globalThis.CK;

test('parse maps palette chars to RGBA and . to transparent', () => {
  const p = Pixel.parse(['.c', 'k.'], { c: '#38f2ff', k: '#060a1c' });
  assert.deepEqual([p.w, p.h], [2, 2]);
  assert.deepEqual([...p.data.slice(0, 8)], [0, 0, 0, 0, 0x38, 0xf2, 0xff, 255]);
  assert.deepEqual([...p.data.slice(8, 12)], [0x06, 0x0a, 0x1c, 255]);
});

test('parse rejects unknown chars and ragged rows', () => {
  assert.throws(() => Pixel.parse(['cz'], { c: '#38f2ff' }), /bad pixel "z" at 1,0/);
  assert.throws(() => Pixel.parse(['cc', 'c'], { c: '#38f2ff' }), /ragged/);
});

test('palette uses the Neon Circuit colours', () => {
  const P = Sprites.PALETTE;
  assert.equal(P.c, '#38f2ff'); assert.equal(P.m, '#ff4fd8'); assert.equal(P.v, '#8b5cff'); assert.equal(P.g, '#6dffb0');
  assert.equal(P.a, '#ffb347'); assert.equal(P.r, '#ff5d73'); assert.equal(P.y, '#ffd166'); assert.equal(P.k, '#060a1c');
});

test('every sprite parses with the shared palette at its required size', () => {
  const size = (n) => (/^colonel_/.test(n) ? [32, 32] : /^(pip|mite_|tile_)/.test(n) ? [16, 16] : n === 'orb' ? [6, 6] : n === 'bolt' ? [8, 4] : null);
  for (const [name, s] of Object.entries(Sprites.SET)) {
    const p = Pixel.parse(s.rows, Sprites.PALETTE);
    if (size(name)) assert.deepEqual([p.w, p.h], size(name), name);
  }
  for (const req of ['colonel_down_0', 'colonel_down_1', 'colonel_up_0', 'colonel_up_1', 'colonel_side_0', 'colonel_side_1',
    'colonel_attack_down', 'colonel_attack_up', 'colonel_attack_side', 'colonel_dash', 'pip', 'mite_0', 'mite_1', 'orb', 'bolt',
    'tile_floor', 'tile_floor_alt', 'tile_wall_top', 'tile_wall_front', 'tile_door']) assert.ok(Sprites.SET[req], req);
});

test('chapter sprites exist at their sizes and use palette keys only', () => {
  const S = globalThis.CK.Sprites; const P = globalThis.CK.Pixel;
  const size = { bios: [24, 28], grub: [24, 24], liltux: [24, 28], wisp_0: [24, 24], boot_0: [48, 48], wraith_0: [64, 64], terminal: [16, 24], crystal: [16, 20], gate: [32, 32], switch_on: [16, 16] };
  for (const [k, [w, h]] of Object.entries(size)) { const p = P.parse(S.SET[k].rows, S.PALETTE); assert.deepEqual([p.w, p.h], [w, h], k); }
  for (const k of Object.keys(S.SET)) P.parse(S.SET[k].rows, S.PALETTE);
});