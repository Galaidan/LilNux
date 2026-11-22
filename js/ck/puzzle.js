/* Colonel Kernel — circuit-repair puzzle logic. Directions: 0=N 1=E 2=S 3=W. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const BASE = { straight: [0, 2], corner: [0, 1], tee: [0, 1, 2], cross: [0, 1, 2, 3], source: [0], target: [0], empty: [] };
  const FIXED = { source: 1, target: 1, empty: 1 };
  const STEP = [[-1, 0], [0, 1], [1, 0], [0, -1]];

  function ports(cell) {
    return [...new Set(BASE[cell.t].map((d) => (d + cell.r) % 4))].sort((a, b) => a - b);
  }

  function rotate(grid, row, col) {
    const cell = grid.cells[row] && grid.cells[row][col];
    if (cell && !FIXED[cell.t]) cell.r = (cell.r + 1) % 4;
    return grid;
  }

  function find(grid, type) {
    for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) if (grid.cells[r][c].t === type) return [r, c];
    return null;
  }

  function powered(grid) {
    const start = find(grid, 'source'); const on = new Set();
    if (!start) return on;
    const q = [start]; on.add(start.join(','));
    while (q.length) {
      const [r, c] = q.shift();
      for (const d of ports(grid.cells[r][c])) {
        const nr = r + STEP[d][0]; const nc = c + STEP[d][1];
        if (nr < 0 || nc < 0 || nr >= grid.rows || nc >= grid.cols) continue;
        const key = nr + ',' + nc;
        if (on.has(key) || !ports(grid.cells[nr][nc]).includes((d + 2) % 4)) continue;
        on.add(key); q.push([nr, nc]);
      }
    }
    return on;
  }

  function isSolved(grid) {
    const t = find(grid, 'target');
    return !!t && powered(grid).has(t.join(','));
  }

  function scramble(grid, rng) {
    do {
      for (const row of grid.cells) for (const cell of row) if (!FIXED[cell.t]) cell.r = Math.floor(rng() * 4);
    } while (isSolved(grid));
    return grid;
  }

  CK.Puzzle = { ports, rotate, powered, isSolved, scramble };
})(typeof window !== 'undefined' ? window : globalThis);
