// Action slice checks (pixel room, input, touch pad, hub button). Run: node tests/e2e/ck-slice.e2e.js
const { chromium, devices } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
const toURL = (f) => require('url').pathToFileURL(path.resolve(__dirname, f)).href;
const HARNESS = toURL('ck-slice-harness.html') + '?ckdebug';
const INDEX = toURL('../../index.html') + '?ckdebug';
const SHOTS = process.env.SHOTS || require('os').tmpdir();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const open = [];
async function page(b, opts, url) {
  const ctx = await b.newContext(opts); open.push(ctx);
  ctx.setDefaultTimeout(8000);
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
    const lum = await pg.evaluate(() => {
      const s = CK._test.slice; const b = s.engine.bctx; const cam = s.scene.cam;
      const L = (x, y) => { const d = b.getImageData(x, y, 1, 1).data; return 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]; };
      return { plaza: L(15 * 16 + 4 - cam.x, 8 * 16 + 4 - cam.y), corner: L(2, 2) };
    });
    assert.ok(lum.plaza > 150, `the plaza is pale: ${JSON.stringify(lum)}`);
    assert.ok(lum.corner < 40, `the void corner is dark: ${JSON.stringify(lum)}`);
    const hud = await pg.$$eval('#ck-slice .ck-shud > *', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom]; }));
    for (let i = 0; i < hud.length; i++) for (let j = i + 1; j < hud.length; j++) {
      const [a, c] = [hud[i], hud[j]]; const overlap = a[0] < c[1] - 1 && c[0] < a[1] - 1 && a[2] < c[3] - 1 && c[2] < a[3] - 1;
      assert.ok(!overlap, `HUD items ${i} and ${j} overlap`);
    }
    assert.ok(hud[0][0] < 200, 'stability bar sits at the left');
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
    const inside = await pg.$$eval('#ck-slice .ck-tbtn', (bs) => bs.filter((x) => !x.hidden).map((x) => { const r = x.getBoundingClientRect(); return [x.dataset.act, r.right <= innerWidth - 8 && r.bottom <= innerHeight - 8 && r.left >= 0 && r.top >= 0]; }));
    inside.forEach(([a, ok]) => assert.ok(ok, `${a} button is clipped by the screen edge`));
    await pg.screenshot({ path: path.join(SHOTS, 'ck-slice-phone.png') });
    assert.deepEqual(pg.errs, []);
  },
  async 'iPhone portrait shows rotate overlay'(b) {
    const pg = await page(b, { ...devices['iPhone 13'] });
    assert.ok(await pg.isVisible('#ck-slice .ck-rotate'));
  },
  async 'portrait pauses the fight and the exit is reachable'(b) {
    const pg = await page(b, { ...devices['iPhone 13'] });
    const t0 = await pg.evaluate(() => CK._test.slice.sim.time); await wait(500);
    const t1 = await pg.evaluate(() => CK._test.slice.sim.time);
    assert.equal(t1, t0, 'sim must not run behind the rotate screen');
    const hit = await pg.evaluate(() => { const b = document.querySelector('.ck-rotate [data-sl=exit]'); if (!b) return 'no exit button'; const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el && el.closest('[data-sl=exit]') ? 'ok' : 'covered'; });
    assert.equal(hit, 'ok');
    await pg.click('.ck-rotate [data-sl=exit]');
    assert.equal(await pg.evaluate(() => !!document.querySelector('#ck-slice')), false, 'slice host removed');
    assert.equal(await pg.evaluate(() => H.exited), true);
  },
  async 'desktop blur pauses, focus resumes'(b) {
    const pg = await page(b, { viewport: { width: 1280, height: 720 } });
    await pg.evaluate(() => window.dispatchEvent(new Event('blur'))); await wait(100);
    const t0 = await pg.evaluate(() => CK._test.slice.sim.time); await wait(400);
    assert.equal(await pg.evaluate(() => CK._test.slice.sim.time), t0, 'paused while the window is not focused');
    await pg.evaluate(() => window.dispatchEvent(new Event('focus'))); await wait(300);
    assert.ok((await pg.evaluate(() => CK._test.slice.sim.time)) > t0, 'resumes on focus');
  },
  async 'tool chips show cooldown'(b) {
    const pg = await page(b, { viewport: { width: 1280, height: 720 } });
    await freeze(pg);
    const ready = await pg.$$eval('#ck-slice .ck-shud [data-tool]', (els) => els.map((e) => e.dataset.tool));
    assert.deepEqual(ready.sort(), ['echo', 'ls']);
    await pg.keyboard.press('2'); await wait(250);
    const busy = await pg.evaluate(() => { const c = document.querySelector('.ck-shud [data-tool=ls]'); return { cd: parseFloat(c.style.getPropertyValue('--cd')), label: c.getAttribute('aria-label'), touch: parseFloat(document.querySelector('.ck-tbtn-ls').style.getPropertyValue('--cd')) }; });
    assert.ok(busy.cd > 0.5, JSON.stringify(busy)); assert.match(busy.label, /recharging/i); assert.ok(busy.touch > 0.5, 'touch button mirrors cooldown');
    await wait(3200);
    const after = await pg.evaluate(() => parseFloat(document.querySelector('.ck-shud [data-tool=ls]').style.getPropertyValue('--cd')));
    assert.equal(after, 0);
  },
  async 'controls hint does not block the stick'(b) {
    const pg = await page(b, { ...devices['iPhone 13 landscape'] });
    const r = await pg.evaluate(() => { const h = document.querySelector('.ck-shint').getBoundingClientRect(); const el = document.elementFromPoint(h.left + 20, h.top + h.height / 2); return el ? el.className : 'none'; });
    assert.match(r, /ck-stick-zone/);
  },
  async 'a startup error never leaves a dead overlay'(b) {
    const pg = await page(b, { viewport: { width: 1280, height: 800 } }, INDEX);
    pg.on('dialog', (d) => d.accept());
    await pg.fill('input[name=name]', 'Tester'); await pg.click('#pform button[type=submit]');
    await pg.waitForSelector('[data-go=slice]');
    await pg.evaluate(() => { CK.RoomScene.create = () => { throw new Error('boom'); }; });
    await pg.click('[data-go=slice]'); await wait(300);
    assert.equal(await pg.evaluate(() => !!document.querySelector('#ck-slice')), false, 'slice host removed');
    assert.equal(await pg.evaluate(() => document.body.classList.contains('ck-open')), false);
    assert.ok(await pg.isVisible('.hub'));
    assert.equal(await pg.evaluate(() => CK._test.loops), 0);
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
    assert.equal(await pg.evaluate(() => !!document.querySelector('#ck-slice')), false, 'slice host removed');
    assert.equal(await pg.evaluate(() => CK._test.loops), 0);
    assert.deepEqual(pg.errs, []);
  },
};

(async () => {
  const b = await chromium.launch();
  let fail = 0;
  for (const [name, fn] of Object.entries(tests)) {
    if (process.env.ONLY && !name.includes(process.env.ONLY)) continue; // e.g. $env:ONLY='startup'
    let timer;
    const limit = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('test timed out after 45s')), 45000); });
    try { await Promise.race([fn(b), limit]); console.log('ok -', name); } catch (e) { fail++; console.log('not ok -', name, '\n   ', e.message.split('\n')[0]); }
    clearTimeout(timer);
    while (open.length) await open.pop().close().catch(() => {});
  }
  await b.close();
  console.log(fail ? `FAIL ${fail}` : 'PASS');
  process.exit(fail ? 1 : 0);
})();
