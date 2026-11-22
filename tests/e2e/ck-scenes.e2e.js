// Fight and puzzle scenes. Run: node tests/e2e/ck-scenes.e2e.js
const { chromium, devices } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
const URL = 'file://' + path.resolve(__dirname, 'ck-harness.html') + '?ckdebug';
const SHOTS = process.env.SHOTS || '/tmp';

async function page(b, opts) {
  const ctx = await b.newContext(opts || { viewport: { width: 1280, height: 800 } });
  const pg = await ctx.newPage();
  pg.errs = [];
  pg.on('pageerror', (e) => pg.errs.push(e.message));
  await pg.goto(URL);
  await pg.waitForFunction(() => window.H && H.ui);
  return pg;
}
const arena = (pg, x, y) => pg.evaluate((p) => H.engine.toScreen(p.x, p.y), { x, y });

const tests = {
  async 'tapping fires toward the tap'(b) {
    const pg = await page(b);
    await pg.evaluate(() => { H.startFight('glitchMite'); H.scene.fight.enemies.forEach((e) => (e.shootTimer = 999)); });
    await pg.waitForTimeout(200);
    const target = { x: 250, y: 150 };
    const p = await arena(pg, target.x, target.y);
    await pg.mouse.click(p.x, p.y);
    const shot = await pg.evaluate(() => H.scene.fight.shots[0] && { ...H.scene.fight.shots[0] });
    assert.ok(shot, 'a shot exists');
    const c = await pg.evaluate(() => ({ x: H.scene.fight.colonel.x, y: H.scene.fight.colonel.y - 30 }));
    const want = Math.atan2(target.y - c.y, target.x - c.x); const got = Math.atan2(shot.vy, shot.vx);
    assert.ok(Math.abs(want - got) < (10 * Math.PI) / 180, `angle off: ${want} vs ${got}`);
  },
  async 'keys select skills'(b) {
    const pg = await page(b);
    await pg.evaluate(() => H.startFight('loopWisp', ['echo', 'cd']));
    await pg.waitForTimeout(100);
    await pg.keyboard.press('2');
    assert.equal(await pg.evaluate(() => H.ui.selected), 'cd');
    await pg.keyboard.press('1');
    assert.equal(await pg.evaluate(() => H.ui.selected), 'echo');
  },
  async 'scan fires straight from the skill bar'(b) {
    const pg = await page(b);
    await pg.evaluate(() => H.startFight('glitchMite'));
    await pg.waitForTimeout(100);
    await pg.click('.ck-skill[data-skill=ls]');
    assert.ok(await pg.evaluate(() => H.scene.fight.enemies.every((e) => e.revealedUntil > H.scene.fight.time)));
    assert.equal(await pg.evaluate(() => H.ui.selected), 'echo', 'scan does not steal the aim selection');
  },
  async 'fight win calls onEnd(win)'(b) {
    const pg = await page(b);
    await pg.evaluate(() => H.startFight('bootGlitch'));
    await pg.waitForTimeout(600);
    await pg.screenshot({ path: path.join(SHOTS, 'ck-fight.png') });
    await pg.evaluate(() => CK._test.win());
    await pg.waitForTimeout(1600);
    assert.equal(await pg.evaluate(() => H.ended), 'win');
  },
  async 'fight lose calls onEnd(lose)'(b) {
    const pg = await page(b);
    await pg.evaluate(() => H.startFight('glitchMite'));
    await pg.evaluate(() => CK._test.lose());
    await pg.waitForTimeout(1600);
    assert.equal(await pg.evaluate(() => H.ended), 'lose');
  },
  async 'kid mode shows a hint button once'(b) {
    const pg = await page(b);
    await pg.evaluate(() => H.startFight('glitchMite', ['echo', 'ls'], true));
    await pg.waitForTimeout(100);
    await pg.click('[data-ck=fighthint]');
    assert.equal(await pg.$('[data-ck=fighthint]'), null);
    assert.match(await pg.textContent('.ck-toasts'), /ls/);
  },
  async 'puzzle tap rotates and solves'(b) {
    const pg = await page(b);
    await pg.evaluate(() => H.startPuzzle('f9'));
    await pg.waitForTimeout(300);
    await pg.screenshot({ path: path.join(SHOTS, 'ck-puzzle.png') });
    const plan = await pg.evaluate(() => {
      const g = H.scene.grid; const s = H.solvedGrid; const out = [];
      for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
        const t = g.cells[r][c].t; if (t === 'source' || t === 'target' || t === 'empty') continue;
        out.push({ r, c, n: (s.cells[r][c].r - g.cells[r][c].r + 4) % 4 });
      }
      return out;
    });
    for (const { r, c, n } of plan) {
      const p = await pg.evaluate((q) => CK._test.cellScreenPos(q.r, q.c), { r, c });
      for (let i = 0; i < n; i++) { await pg.mouse.click(p.x, p.y); await pg.waitForTimeout(30); }
    }
    await pg.waitForTimeout(1200);
    assert.equal(await pg.evaluate(() => H.solved), true);
  },
  async 'fight and puzzle on iPhone'(b) {
    const pg = await page(b, { ...devices['iPhone 13'] });
    await pg.evaluate(() => H.startFight('kernelWraith', ['echo', 'ls', 'cd']));
    await pg.waitForTimeout(700);
    await pg.screenshot({ path: path.join(SHOTS, 'ck-fight-phone.png') });
    const p = await arena(pg, 500, 100);
    await pg.touchscreen.tap(p.x, p.y);
    assert.ok(await pg.evaluate(() => H.scene.fight.shots.length >= 1));
    await pg.evaluate(() => H.startPuzzle('f9'));
    await pg.waitForTimeout(300);
    await pg.screenshot({ path: path.join(SHOTS, 'ck-puzzle-phone.png') });
    assert.deepEqual(pg.errs, []);
  },
  async 'no loadout changes mid-fight and the fight pauses while Pip is open'(b) {
    const pg = await page(b);
    await pg.evaluate(() => { H.startFight('glitchMite', ['echo', 'ls', 'cd']); H.ui.pip('items'); });
    assert.equal(await pg.$eval('[data-unequip=ls]', (e) => e.disabled), true);
    assert.equal(await pg.$eval('[data-equip=cd]', (e) => e.disabled), true);
    const t0 = await pg.evaluate(() => H.scene.fight.time);
    await pg.waitForTimeout(500);
    assert.equal(await pg.evaluate(() => H.scene.fight.time), t0, 'paused while Pip is open');
    await pg.evaluate(() => H.ui.closePip());
    await pg.waitForTimeout(300);
    assert.ok(await pg.evaluate((t) => H.scene.fight.time > t, t0));
  },
  async 'q and e move the Colonel in fights'(b) {
    const pg = await page(b);
    await pg.evaluate(() => { H.startFight('glitchMite'); H.scene.fight.enemies.forEach((e) => { e.shootTimer = 999; }); });
    await pg.waitForTimeout(100);
    await pg.keyboard.down('e'); await pg.waitForTimeout(400); await pg.keyboard.up('e');
    const x1 = await pg.evaluate(() => H.scene.fight.colonel.x);
    assert.ok(x1 > 560, 'moved right: ' + x1);
    await pg.waitForTimeout(200);
    assert.equal(await pg.evaluate(() => H.scene.fight.colonel.x), x1, 'stops on key up');
    await pg.keyboard.down('Q'); await pg.waitForTimeout(400); await pg.keyboard.up('Q');
    assert.ok(await pg.evaluate((x) => H.scene.fight.colonel.x < x - 60, x1), 'moved left (caps lock too)');
  },
};

(async () => {
  const b = await chromium.launch();
  let fail = 0;
  for (const [name, fn] of Object.entries(tests)) {
    try { await fn(b); console.log('ok -', name); } catch (e) { fail++; console.log('not ok -', name, '\n   ', e.message.split('\n')[0]); }
  }
  await b.close();
  console.log(fail ? `FAIL ${fail}` : 'PASS');
  process.exit(fail ? 1 : 0);
})();
