// The room-based Colonel Kernel Adventure (Chapter 1). Run: node tests/e2e/ck-adventure.e2e.js  ($env:ONLY='name' runs one)
const { chromium, devices } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
const toURL = (f) => require('url').pathToFileURL(path.resolve(__dirname, f)).href;
const HARNESS = toURL('ck-harness.html') + '?ckdebug';
const INDEX = toURL('../../index.html') + '?ckdebug';
const SHOTS = process.env.SHOTS || require('os').tmpdir();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const open = [];
async function page(b, opts, url) {
  const ctx = await b.newContext(opts || { viewport: { width: 1280, height: 720 } }); open.push(ctx);
  ctx.setDefaultTimeout(8000);
  const pg = await ctx.newPage();
  pg.errs = [];
  pg.on('pageerror', (e) => pg.errs.push(e.message));
  await pg.goto(url || HARNESS);
  return pg;
}

const tests = {
  async 'puzzle: tap rotates, keys rotate, solve calls onSolved'(b) {
    const pg = await page(b);
    await pg.waitForFunction(() => window.H && H.ui);
    await pg.evaluate(() => {
      const c = document.createElement('canvas'); c.id = 'pz'; c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:50';
      document.body.appendChild(c);
      const solution = CK.World.REGIONS[0].nodes.f9.ref.grid;
      const grid = CK.Puzzle.scramble(JSON.parse(JSON.stringify(solution)), CK.rng(3));
      const engine = CK.PixEngine.create(c);
      H.pz = { engine, grid, solved: false, left: false };
      H.pz.scene = CK.PuzzleScene.create({ engine, canvas: c, host: document.body, grid, solution, accent: '#ffb347', sfx: () => {},
        onSolved: () => (H.pz.solved = true), onLeave: () => (H.pz.left = true) });
      engine.setScene(H.pz.scene); engine.start();
    });
    await wait(200);
    // tap a cell that can rotate
    const hit = await pg.evaluate(() => {
      const { grid, scene, engine } = H.pz; const v = engine.view; const r = engine.canvas.getBoundingClientRect();
      for (let row = 0; row < grid.rows; row++) for (let col = 0; col < grid.cols; col++) {
        const t = grid.cells[row][col].t; if (t === 'source' || t === 'target' || t === 'empty') continue;
        const p = scene.cellCentre(row, col);
        return { row, col, r0: grid.cells[row][col].r, x: r.left + (p.x * v.k + v.ox) / v.dpr, y: r.top + (p.y * v.k + v.oy) / v.dpr };
      }
      return null;
    });
    await pg.mouse.click(hit.x, hit.y);
    assert.equal(await pg.evaluate((h) => H.pz.grid.cells[h.row][h.col].r, hit), (hit.r0 + 1) % 4, 'tap rotated the cell');
    // keyboard: the cursor sits on the tapped cell; Enter rotates it again
    await pg.keyboard.press('Enter');
    assert.equal(await pg.evaluate((h) => H.pz.grid.cells[h.row][h.col].r, hit), (hit.r0 + 2) % 4, 'Enter rotated the cursor cell');
    await pg.evaluate(() => CK._test.puzzle.solve());
    await pg.waitForFunction(() => H.pz.solved, null, { timeout: 2000 });
    assert.deepEqual(pg.errs, []);
  },
  async 'puzzle: step away leaves it unsolved'(b) {
    const pg = await page(b);
    await pg.waitForFunction(() => window.H && H.ui);
    await pg.evaluate(() => {
      const c = document.createElement('canvas'); c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:50'; document.body.appendChild(c);
      const solution = CK.World.REGIONS[0].nodes.f9.ref.grid; const grid = CK.Puzzle.scramble(JSON.parse(JSON.stringify(solution)), CK.rng(3));
      const engine = CK.PixEngine.create(c); H.pz = { left: false };
      H.pz.scene = CK.PuzzleScene.create({ engine, canvas: c, host: document.body, grid, solution, accent: '#ffb347', sfx: () => {}, onSolved: () => {}, onLeave: () => (H.pz.left = true) });
      engine.setScene(H.pz.scene); engine.start();
    });
    await pg.click('.ck-pz [data-pz=leave]');
    assert.equal(await pg.evaluate(() => H.pz.left), true);
    await pg.evaluate(() => { H.pz.left = false; H.pz.scene.destroy(); });
    await pg.keyboard.press('Escape');
    assert.equal(await pg.evaluate(() => H.pz.left), false, 'listeners removed by destroy()');
    assert.equal(await pg.evaluate(() => !!document.querySelector('.ck-pz')), false);
  },
};

(async () => {
  const b = await chromium.launch();
  let fail = 0;
  for (const [name, fn] of Object.entries(tests)) {
    if (process.env.ONLY && !name.includes(process.env.ONLY)) continue;
    let timer;
    const limit = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('test timed out after 60s')), 60000); });
    try { await Promise.race([fn(b), limit]); console.log('ok -', name); } catch (e) { fail++; console.log('not ok -', name, '\n   ', e.message.split('\n')[0]); }
    clearTimeout(timer);
    while (open.length) await open.pop().close().catch(() => {});
  }
  await b.close();
  console.log(fail ? `FAIL ${fail}` : 'PASS');
  process.exit(fail ? 1 : 0);
})();
