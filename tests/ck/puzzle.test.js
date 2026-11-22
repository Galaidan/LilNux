const test = require('node:test');
const assert = require('node:assert/strict');
require('../../js/ck/state.js');
require('../../js/ck/world.js');
require('../../js/ck/puzzle.js');
const { Puzzle, World, rng } = globalThis.CK;

const worldGrids = () => World.REGIONS.flatMap((r) => Object.values(r.nodes).filter((n) => n.kind === 'circuit').map((n) => n.ref.grid));
const copy = (g) => JSON.parse(JSON.stringify(g));

test('ports applies rotation', () => {
  assert.deepEqual(Puzzle.ports({ t: 'straight', r: 0 }), [0, 2]);
  assert.deepEqual(Puzzle.ports({ t: 'straight', r: 1 }), [1, 3]);
  assert.deepEqual(Puzzle.ports({ t: 'corner', r: 2 }), [2, 3]);
  assert.deepEqual(Puzzle.ports({ t: 'tee', r: 3 }), [0, 1, 3]);
  assert.deepEqual(Puzzle.ports({ t: 'cross', r: 1 }), [0, 1, 2, 3]);
  assert.deepEqual(Puzzle.ports({ t: 'source', r: 1 }), [1]);
  assert.deepEqual(Puzzle.ports({ t: 'empty', r: 0 }), []);
});

test('fixed tiles do not rotate', () => {
  const g = World.grid(['S1 L0', '. G0']);
  Puzzle.rotate(g, 0, 0); Puzzle.rotate(g, 1, 0); Puzzle.rotate(g, 1, 1); Puzzle.rotate(g, 0, 1);
  assert.equal(g.cells[0][0].r, 1); assert.equal(g.cells[1][1].r, 0); assert.equal(g.cells[0][1].r, 1);
  for (let i = 0; i < 3; i++) Puzzle.rotate(g, 0, 1);
  assert.equal(g.cells[0][1].r, 0, 'wraps after 4');
});

test('solved world grids are solved', () => {
  const grids = worldGrids();
  assert.equal(grids.length, 3);
  grids.forEach((g, i) => assert.equal(Puzzle.isSolved(g), true, `grid ${i}`));
});

test('powered stops at mismatched edges', () => {
  const g = World.grid(['S1 I1 G3']);
  assert.equal(Puzzle.isSolved(g), true);
  Puzzle.rotate(g, 0, 1);
  const p = Puzzle.powered(g);
  assert.ok(p.has('0,0')); assert.ok(!p.has('0,1')); assert.ok(!p.has('0,2'));
  assert.equal(Puzzle.isSolved(g), false);
});

test('scramble is unsolved and rotations only', () => {
  for (const g of worldGrids()) {
    const s = Puzzle.scramble(copy(g), rng(3));
    assert.equal(Puzzle.isSolved(s), false);
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
      assert.equal(s.cells[r][c].t, g.cells[r][c].t);
      while (s.cells[r][c].r !== g.cells[r][c].r) Puzzle.rotate(s, r, c);
    }
    assert.equal(Puzzle.isSolved(s), true);
  }
});
