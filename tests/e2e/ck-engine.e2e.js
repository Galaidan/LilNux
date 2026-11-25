// Engine + map scene checks. Run: node tests/e2e/ck-engine.e2e.js  (screenshots go to $SHOTS or /tmp)
const { chromium, devices } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
const URL = require('url').pathToFileURL(path.resolve(__dirname, 'ck-harness.html')).href + '?ckdebug';
const SHOTS = process.env.SHOTS || require('os').tmpdir();

async function page(b, opts) {
  const ctx = await b.newContext(opts);
  const pg = await ctx.newPage();
  pg.errs = [];
  pg.on('pageerror', (e) => pg.errs.push(e.message));
  await pg.goto(URL);
  await pg.waitForFunction(() => window.H && H.engine);
  await pg.waitForTimeout(500);
  return pg;
}
const pos = (pg, id) => pg.evaluate((i) => CK._test.nodeScreenPos(i), id);

const tests = {
  async 'canvas renders'(b) {
    const pg = await page(b, { viewport: { width: 1280, height: 800 } });
    const colours = await pg.evaluate(() => {
      const c = document.getElementById('c'); const x = c.getContext('2d'); const set = new Set();
      for (let i = 0; i < 40; i++) { const d = x.getImageData((c.width * (i % 8)) / 8 + 3, (c.height * Math.floor(i / 8)) / 5 + 3, 1, 1).data; set.add(d.join(',')); }
      return set.size;
    });
    assert.ok(colours > 3, `only ${colours} colours`);
    await pg.screenshot({ path: path.join(SHOTS, 'ck-map-desktop.png') });
    assert.deepEqual(pg.errs, []);
  },
  async 'tap moves colonel (desktop click)'(b) {
    const pg = await page(b, { viewport: { width: 1280, height: 800 } });
    const p = await pos(pg, 'f1');
    await pg.mouse.click(p.x, p.y);
    await pg.waitForTimeout(2000);
    assert.equal(await pg.evaluate(() => H.state.node), 'f1');
    assert.equal(await pg.evaluate(() => H.arrived && H.arrived.arrived.label), 'Power Rail');
  },
  async 'tap moves colonel (iPhone touch)'(b) {
    const pg = await page(b, { ...devices['iPhone 13'] });
    const p = await pos(pg, 'f1');
    await pg.touchscreen.tap(p.x, p.y);
    await pg.waitForTimeout(2000);
    assert.equal(await pg.evaluate(() => H.state.node), 'f1');
    await pg.screenshot({ path: path.join(SHOTS, 'ck-map-phone.png') });
    assert.deepEqual(pg.errs, []);
  },
  async 'tapping a fogged node is blocked'(b) {
    const pg = await page(b, { viewport: { width: 1280, height: 800 } });
    await pg.evaluate(() => { H.scene.tapNode('f3'); });
    await pg.waitForTimeout(300);
    assert.equal(await pg.evaluate(() => H.state.node), 'f0');
    assert.ok(await pg.evaluate(() => H.blocked));
  },
  async 'resize keeps aim mapping'(b) {
    const pg = await page(b, { ...devices['iPhone 13'] });
    for (const vp of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await pg.setViewportSize(vp); await pg.waitForTimeout(400);
      const p = await pos(pg, 'f1');
      const w = await pg.evaluate((q) => H.engine.toWorld(q.x, q.y), p);
      const n = await pg.evaluate(() => CK.World.REGIONS[0].nodes.f1);
      assert.ok(Math.abs(w.x - n.x) <= 4 && Math.abs(w.y - n.y) <= 4, JSON.stringify({ vp, w }));
    }
  },
  async 'loop pauses when hidden'(b) {
    const pg = await page(b, { viewport: { width: 800, height: 600 } });
    await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await pg.evaluate(() => H.engine.running), false);
    await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await pg.evaluate(() => H.engine.running), true);
    assert.equal(await pg.evaluate(() => CK._test.loops), 1);
  },
  async 'pinch does not count as a tap'(b) {
    const pg = await page(b, { ...devices['iPhone 13'] });
    const p = await pos(pg, 'f1');
    await pg.evaluate((q) => {
      const c = document.getElementById('c');
      const ev = (type, id, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch', isPrimary: id === 1 }));
      ev('pointerdown', 1, q.x, q.y); ev('pointerdown', 2, q.x + 40, q.y + 40); ev('pointermove', 2, q.x + 90, q.y + 90);
      ev('pointerup', 1, q.x, q.y); ev('pointerup', 2, q.x + 90, q.y + 90);
    }, p);
    await pg.waitForTimeout(1500);
    assert.equal(await pg.evaluate(() => H.state.node), 'f0');
    assert.equal(await pg.evaluate(() => !!H.arrived || !!H.blocked), false);
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
