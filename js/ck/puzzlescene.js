/* Colonel Kernel — the circuit puzzle in pixels: rotate tiles until power flows from the source to the target.
 * Tap / click a tile, or use the arrow keys and Space / Enter. Esc or "Step away" leaves it unsolved.
 * Text (the hint and the button) is HTML; the canvas only draws the board. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});
  const CELL = 40; // 40 buffer px is >= 44 CSS px on phones (k / dpr >= 1.33 in landscape)
  const COL = { board: '#0d1430', cell: '#14103a', edge: '#2b3768', off: '#3c4a85', cyan: '#38f2ff', amber: '#ffb347', white: '#ffffff', ink: '#060a1c' };
  const FIXED = { source: 1, target: 1, empty: 1 };
  // direction -> [dx, dy] in screen space (0=N 1=E 2=S 3=W)
  const DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  function create(o) {
    const engine = o.engine; const canvas = o.canvas || engine.canvas; const grid = o.grid; const accent = o.accent || COL.amber;
    const sfx = o.sfx || (() => {});
    const reduced = () => !!engine.reducedMotion;
    let t = 0; let solved = false; let solvedT = 0; let done = false;
    const cur = { r: 0, c: 0 };
    let origin = { x: 0, y: 0 };

    // HTML: what to do, and the way out
    const host = o.host || canvas.parentElement;
    const panel = document.createElement('div'); panel.className = 'ck-pz';
    panel.innerHTML = '<p>Broken circuit. Rotate the tiles until power reaches the target. <span class="ck-dim">Tap a tile, or use the arrow keys and Space.</span></p>'
      + '<button type="button" class="ck-btn" data-pz="leave">↩ Step away</button>';
    host.appendChild(panel);

    function layout(view) { origin = { x: Math.floor((view.w - grid.cols * CELL) / 2), y: Math.floor((view.h - grid.rows * CELL) / 2) + 6 }; }
    function cellCentre(r, c) { return { x: origin.x + c * CELL + CELL / 2, y: origin.y + r * CELL + CELL / 2 }; }
    function turn(r, c) {
      const cell = grid.cells[r] && grid.cells[r][c]; if (!cell || FIXED[cell.t] || solved) return;
      CK.Puzzle.rotate(grid, r, c); sfx('pop'); check();
    }
    function check() { if (!solved && CK.Puzzle.isSolved(grid)) { solved = true; solvedT = 0.8; sfx('win'); } }
    function leave() { if (done) return; done = true; if (o.onLeave) o.onLeave(); }

    function onDown(e) {
      if (solved) return;
      const p = engine.toBuffer(e.clientX, e.clientY);
      const c = Math.floor((p.x - origin.x) / CELL); const r = Math.floor((p.y - origin.y) / CELL);
      if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) return;
      cur.r = r; cur.c = c; turn(r, c); e.preventDefault();
    }
    function onKey(e) {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const k = e.key;
      if (k === 'Escape') { leave(); return; }
      if (solved) return;
      const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
      if (mv) { cur.r = Math.max(0, Math.min(grid.rows - 1, cur.r + mv[0])); cur.c = Math.max(0, Math.min(grid.cols - 1, cur.c + mv[1])); e.preventDefault(); return; }
      if (k === 'Enter' || k === ' ') { turn(cur.r, cur.c); e.preventDefault(); }
    }
    function onClick(e) { if (e.target.closest('[data-pz=leave]')) leave(); }
    canvas.addEventListener('pointerdown', onDown); root.addEventListener('keydown', onKey); panel.addEventListener('click', onClick);

    function drawCell(g, r, c, on) {
      const cell = grid.cells[r][c]; const x = origin.x + c * CELL; const y = origin.y + r * CELL;
      g.fillStyle = COL.cell; g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      g.fillStyle = COL.edge; g.fillRect(x + 1, y + CELL - 2, CELL - 2, 1);
      if (cell.t === 'empty') return;
      const col = on ? accent : COL.off; const cx = x + CELL / 2; const cy = y + CELL / 2;
      for (const d of CK.Puzzle.ports(cell)) { // pixel pipes: a dark under-stroke, then the wire
        const [dx, dy] = DIR[d];
        const L = CELL / 2; g.fillStyle = COL.ink; g.fillRect(Math.min(cx, cx + dx * L) - 3, Math.min(cy, cy + dy * L) - 3, Math.abs(dx) * L + 6, Math.abs(dy) * L + 6);
        g.fillStyle = col; g.fillRect(Math.min(cx, cx + dx * L) - 2, Math.min(cy, cy + dy * L) - 2, Math.abs(dx) * L + 4, Math.abs(dy) * L + 4);
      }
      if (cell.t === 'source') { g.fillStyle = COL.amber; g.fillRect(cx - 7, cy - 7, 14, 14); g.fillStyle = COL.white; g.fillRect(cx - 2, cy - 2, 4, 4); }
      else if (cell.t === 'target') { g.fillStyle = on ? accent : COL.ink; g.fillRect(cx - 8, cy - 8, 16, 16); g.fillStyle = on ? COL.white : COL.off; g.fillRect(cx - 5, cy - 5, 10, 10); }
      else { g.fillStyle = on ? COL.white : COL.edge; g.fillRect(cx - 1, cy - 1, 2, 2); }
    }

    const scene = {
      grid,
      cellCentre,
      update(dt) {
        t += dt;
        if (solvedT > 0) { solvedT -= dt; if (solvedT <= 0 && !done) { done = true; if (o.onSolved) o.onSolved(); } }
      },
      draw(g, _t, view) {
        layout(view);
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.imageSmoothingEnabled = false;
        g.fillStyle = '#060a1c'; g.fillRect(0, 0, view.w, view.h);
        const on = CK.Puzzle.powered(grid);
        const pad = 6; const bx = origin.x - pad; const by = origin.y - pad; const bw = grid.cols * CELL + pad * 2; const bh = grid.rows * CELL + pad * 2;
        g.fillStyle = COL.board; g.fillRect(bx, by, bw, bh);
        g.fillStyle = solved ? accent : COL.edge; g.fillRect(bx, by, bw, 1); g.fillRect(bx, by + bh - 1, bw, 1); g.fillRect(bx, by, 1, bh); g.fillRect(bx + bw - 1, by, 1, bh);
        for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) drawCell(g, r, c, on.has(r + ',' + c));
        if (!solved) { // the keyboard cursor
          const x = origin.x + cur.c * CELL; const y = origin.y + cur.r * CELL;
          g.strokeStyle = COL.cyan; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
        } else if (!reduced()) { // a short glow when power reaches the target
          g.globalAlpha = 0.25 + 0.25 * Math.sin(t * 12); g.fillStyle = accent; g.fillRect(bx, by, bw, bh); g.globalAlpha = 1;
        }
      },
      resize(view) { layout(view); },
      destroy() {
        canvas.removeEventListener('pointerdown', onDown); root.removeEventListener('keydown', onKey); panel.remove();
        if (CK._test && CK._test.puzzle && CK._test.puzzle.grid === grid) CK._test.puzzle = null;
      },
    };
    if (CK.PixEngine && CK.PixEngine.debug) {
      CK._test = CK._test || {};
      // debug: set every tile to the stored solution
      CK._test.puzzle = { grid, solve() { if (!o.solution) return; o.solution.cells.forEach((row, r) => row.forEach((cell, c) => { grid.cells[r][c].r = cell.r; })); check(); } };
    }
    return scene;
  }

  CK.PuzzleScene = { create, CELL };
})(typeof window !== 'undefined' ? window : globalThis);
