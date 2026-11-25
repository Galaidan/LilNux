// Action slice checks (pixel room, input, touch pad, hub button). Run: node tests/e2e/ck-slice.e2e.js
const { chromium, devices } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
const toURL = (f) => require('url').pathToFileURL(path.resolve(__dirname, f)).href;
const HARNESS = toURL('ck-slice-harness.html') + '?ckdebug';
const INDEX = toURL('../../index.html') + '?ckdebug';
const SHOTS = process.env.SHOTS || require('os').tmpdir();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function page(b, opts, url) {
  const ctx = await b.newContext(opts);
  const pg = await ctx.newPage();
  pg.errs = [];
  pg.on('pageerror', (e) => pg.errs.push(e.message));
  await pg.goto(url || HARNESS);
  if (!url) { await pg.waitForFunction(() => window.CK && CK._test && CK._test.slice && CK._test.slice.engine.running); await wait(300); }
  return pg;
}
const px = (pg) => pg.evaluate(() => CK._test.slice.sim.player.x);
const freeze = (pg) => pg.evaluate(() => CK._test.slice.sim.enemies.forEach((e) => { e.speed = 0; e.shootTimer = 999; e.shootEvery = 999; e.lungeTimer = 999; e.lungeEvery = 999; }));

const tests = {
  async 'renders at 1920x1080'(b) {
    const pg = await page(b, { viewport: { width: 1920, height: 1080 } });
    const v = await pg.evaluate(() => { const w = CK._test.slice.engine.view; return { k: w.k, w: w.w, h: w.h }; });
    assert.deepEqual(v, { k: 4, w: 480, h: 270 });
    const colours = await pg.evaluate(() => {
      const c = document.querySelector('#ck-slice .ck-pix'); const x = c.getContext('2d'); const set = new Set();
      for (let i = 0; i < 64; i++) { const d = x.getImageData(Math.floor((c.width * (i % 8)) / 8) + 5, Math.floor((c.height * Math.floor(i / 8)) / 8) + 5, 1, 1).data; set.add(d.join(',')); }
      return set.size;
    });
    assert.ok(colours > 3, `only ${colours} colours`);
    await pg.screenshot({ path: path.join(SHOTS, 'ck-slice-desktop.png') });
    assert.deepEqual(pg.errs, []);
  },
  async 'keyboard moves and dashes'(b) {
    const pg = await page(b, { viewport: { width: 1280, height: 720 } });
    await freeze(pg);
    const x0 = await px(pg);
    await pg.keyboard.down('d'); await wait(500); await pg.keyboard.up('d');
    const x1 = await px(pg);
    assert.ok(x1 - x0 >= 40, `walked ${x1 - x0}`);
    await pg.keyboard.press(' '); await wait(300);
    const x2 = await px(pg);
    assert.ok(Math.abs(x2 - x1) >= 50, `dashed ${x2 - x1}`);
    assert.deepEqual(pg.errs, []);
  },
  async 'blur clears held movement'(b) {
    const pg = await page(b, { viewport: { width: 1280, height: 720 } });
    await freeze(pg);
    await pg.keyboard.down('d'); await wait(150);
    await pg.evaluate(() => window.dispatchEvent(new Event('blur')));
    await wait(100);
    const x1 = await px(pg); await wait(300); const x2 = await px(pg);
    await pg.keyboard.up('d');
    assert.ok(Math.abs(x2 - x1) < 1, `kept moving ${x2 - x1}`);
  },
  async 'iPhone landscape shows touch pad, not rotate'(b) {
    const pg = await page(b, { ...devices['iPhone 13 landscape'] });
    assert.ok(await pg.isVisible('#ck-slice .ck-touchpad'), 'touch pad visible');
    assert.equal(await pg.isVisible('#ck-slice .ck-rotate'), false);
    const boxes = await pg.$$eval('#ck-slice .ck-tbtn', (bs) => bs.filter((x) => !x.hidden).map((x) => { const r = x.getBoundingClientRect(); return [x.dataset.act, r.width, r.height]; }));
    assert.equal(boxes.length, 5);
    boxes.forEach(([a, w, h]) => assert.ok(w >= 44 && h >= 44, `${a} ${w}x${h}`));
    await pg.screenshot({ path: path.join(SHOTS, 'ck-slice-phone.png') });
    assert.deepEqual(pg.errs, []);
  },
  async 'iPhone portrait shows rotate overlay'(b) {
    const pg = await page(b, { ...devices['iPhone 13'] });
    assert.ok(await pg.isVisible('#ck-slice .ck-rotate'));
  },
  async 'multi-touch stick + kill'(b) {
    const pg = await page(b, { ...devices['iPhone 13 landscape'] });
    await freeze(pg);
    const r = await pg.evaluate(() => {
      const zone = document.querySelector('.ck-stick-zone'); const kill = document.querySelector('.ck-tbtn[data-act=kill]');
      const z = zone.getBoundingClientRect(); const k = kill.getBoundingClientRect();
      const fire = (el, type, id, x, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: id === 1 }));
      const sx = z.left + z.width / 3; const sy = z.top + z.height / 2;
      fire(zone, 'pointerdown', 1, sx, sy); fire(zone, 'pointermove', 1, sx + 40, sy);
      CK._test.slice.events.length = 0;
      fire(kill, 'pointerdown', 2, k.left + k.width / 2, k.top + k.height / 2);
      window.__fire = fire; window.__kill = kill;
      return { kx: k.left + k.width / 2, ky: k.top + k.height / 2 };
    });
    await wait(150);
    const a = await pg.evaluate(() => ({ v: CK._test.slice.input.stick.v.x, ev: CK._test.slice.events.slice(), x: CK._test.slice.sim.player.x }));
    assert.ok(a.v > 0.5, `stick ${a.v}`); assert.ok(a.ev.includes('swing'), JSON.stringify(a.ev));
    await pg.evaluate((q) => window.__fire(window.__kill, 'pointerup', 2, q.kx, q.ky), r);
    await wait(200);
    const c = await pg.evaluate(() => ({ v: CK._test.slice.input.stick.v.x, x: CK._test.slice.sim.player.x }));
    assert.ok(c.v > 0.5, 'stick still held after lifting the other finger'); assert.ok(c.x > a.x, 'still moving');
  },
  async 'rotate mid-fight'(b) {
    const pg = await page(b, { ...devices['iPhone 13 landscape'] });
    for (const vp of [{ width: 390, height: 664 }, { width: 750, height: 342 }]) {
      await pg.setViewportSize(vp); await wait(300);
      const r = await pg.evaluate(() => {
        const e = CK._test.slice.engine; const c = e.canvas.getBoundingClientRect();
        const f = CK.PixEngine.fit(Math.round(c.width * e.view.dpr), Math.round(c.height * e.view.dpr));
        const p = e.toBuffer(c.left + c.width / 2, c.top + c.height / 2);
        return { k: e.view.k, fk: f.k, w: e.view.w, h: e.view.h, px: p.x, py: p.y };
      });
      assert.equal(r.k, r.fk, JSON.stringify(r));
      assert.ok(Math.abs(r.px - r.w / 2) <= 1 && Math.abs(r.py - r.h / 2) <= 1, JSON.stringify(r));
    }
    assert.deepEqual(pg.errs, []);
  },
  async 'hub opens and exits the slice'(b) {
    const pg = await page(b, { viewport: { width: 1280, height: 800 } }, INDEX);
    pg.on('dialog', (d) => d.accept());
    await pg.fill('input[name=name]', 'Tester'); await pg.click('#pform button[type=submit]');
    await pg.waitForSelector('[data-go=slice]');
    await pg.click('[data-go=slice]');
    await pg.waitForSelector('#ck-slice');
    await wait(300);
    await pg.click('#ck-slice [data-sl=exit]');
    await pg.waitForSelector('.hub');
    assert.equal(await pg.$('#ck-slice'), null);
    assert.equal(await pg.evaluate(() => CK._test.loops), 0);
    assert.deepEqual(pg.errs, []);
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
