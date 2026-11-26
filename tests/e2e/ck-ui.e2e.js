// HUD, Pip panel, dialogue and learning terminal. Run: node tests/e2e/ck-ui.e2e.js
const { chromium, devices } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
const URL = require('url').pathToFileURL(path.resolve(__dirname, 'ck-harness.html')).href + '?ckdebug';
const SHOTS = process.env.SHOTS || require('os').tmpdir();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function page(b, opts) {
  const ctx = await b.newContext(opts || { viewport: { width: 1280, height: 800 } });
  const pg = await ctx.newPage();
  pg.errs = [];
  pg.on('pageerror', (e) => pg.errs.push(e.message));
  await pg.goto(URL);
  await pg.waitForFunction(() => window.H && H.ui);
  return pg;
}
const learnAll = (pg, ids) => pg.evaluate((list) => list.forEach((i) => CK.Rules.learn(H.state, i)), ids);

const tests = {
  async 'hud shows region and bits'(b) {
    const pg = await page(b);
    await pg.evaluate(() => { H.state.bits = 42; H.ui.hud(H.state); });
    const txt = await pg.textContent('.ck-hud');
    assert.match(txt, /FIRMWARE FOUNDRY/i); assert.match(txt, /42/);
    await pg.click('[data-ck=exit]');
    assert.equal(await pg.evaluate(() => H.exited), true);
  },
  async 'dialogue advances and resolves'(b) {
    const pg = await page(b);
    await pg.evaluate(() => { H.done = false; H.ui.say('bios', ['one', 'two', 'three']).then(() => (H.done = true)); });
    assert.match(await pg.textContent('.ck-say'), /one/);
    await pg.click('.ck-say [data-ck=next]'); await pg.click('.ck-say [data-ck=next]');
    assert.equal(await pg.evaluate(() => H.done), false);
    assert.match(await pg.textContent('.ck-say'), /three/);
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(100);
    assert.equal(await pg.evaluate(() => H.done), true);
    assert.equal(await pg.$('.ck-say'), null);
  },
  async 'learn resolves only on the right command'(b) {
    const pg = await page(b);
    await pg.evaluate(() => { H.learned = false; H.ui.learn('ls').then(() => (H.learned = true)); });
    await pg.fill('.ck-learn input', 'pwd'); await pg.press('.ck-learn input', 'Enter');
    await pg.waitForTimeout(300);
    assert.equal(await pg.evaluate(() => H.learned), false);
    assert.match(await pg.textContent('.ck-learn'), /\/home\/tester/);
    await pg.fill('.ck-learn input', 'ls -a'); await pg.press('.ck-learn input', 'Enter');
    await pg.waitForTimeout(1800);
    assert.equal(await pg.evaluate(() => H.learned), true);
    assert.equal(await pg.evaluate(() => H.state.learned.includes('ls')), true);
  },
  async 'motherboard shows installed module and empty slots'(b) {
    const pg = await page(b);
    await pg.evaluate(() => { CK.Rules.installModule(H.state, 'ram'); H.ui.pip('items'); });
    const ram = await pg.$('.ck-slot[data-slot=ram]');
    assert.ok(await ram.evaluate((e) => e.classList.contains('on')));
    assert.match(await ram.textContent(), /RAM/);
    assert.match(await pg.textContent('.ck-slot[data-slot=gpu]'), /—/);
  },
  async 'codex lists learned commands'(b) {
    const pg = await page(b);
    await learnAll(pg, ['echo', 'ls']);
    await pg.evaluate(() => H.ui.pip('items'));
    const t = await pg.textContent('.ck-codex');
    assert.match(t, /echo/); assert.match(t, /ls -a/);
  },
  async 'tasks tab shows progress'(b) {
    const pg = await page(b);
    await pg.evaluate(() => { CK.Rules.clear(H.state, 'f5'); H.ui.pip('tasks'); });
    assert.match(await pg.textContent('.ck-pip'), /1\/2/);
  },
  async 'equip respects slots and upgrade needs bits'(b) {
    const pg = await page(b);
    await learnAll(pg, ['echo', 'ls', 'cd']);
    await pg.evaluate(() => H.ui.pip('items'));
    assert.equal(await pg.$eval('[data-equip=cd]', (e) => e.disabled), true);
    await pg.click('[data-unequip=ls]');
    assert.equal(await pg.$eval('[data-equip=cd]', (e) => e.disabled), false);
    assert.equal(await pg.$eval('[data-buy=ls-a]', (e) => e.disabled), true);
    await pg.evaluate(() => { H.state.bits = 100; H.ui.pip('items'); });
    await pg.click('[data-buy=ls-a]');
    assert.equal(await pg.evaluate(() => H.state.upgrades.includes('ls-a')), true);
  },
  async 'choice resolves with the picked value'(b) {
    const pg = await page(b);
    await pg.evaluate(() => { H.ui.choice('Pick', [{ label: 'A', value: 'a' }, { label: 'Fight', value: 'fight' }]).then((v) => (H.picked = v)); });
    await pg.click('.ck-choice button >> text=Fight');
    await pg.waitForTimeout(50);
    assert.equal(await pg.evaluate(() => H.picked), 'fight');
  },
  async 'tap targets are at least 44px on iPhone'(b) {
    const pg = await page(b, { ...devices['iPhone 13'] });
    await learnAll(pg, ['echo', 'ls', 'cd']);
    await pg.evaluate(() => { H.ui.hud(H.state); H.ui.action(true); H.ui.pip('items'); });
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: path.join(SHOTS, 'ck-pip-panel.png') });
    const small = await pg.$$eval('#ck-root button', (bs) => bs.filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).map((x) => x.outerHTML.slice(0, 80)));
    assert.deepEqual(small, []);
    await pg.evaluate(() => { H.ui.closePip(); H.ui.say('grub', CK.World.CHARACTERS.grub.lines); });
    await pg.waitForTimeout(300);
    await pg.screenshot({ path: path.join(SHOTS, 'ck-dialogue.png') });
    assert.deepEqual(pg.errs, []);
  },
  async 'log records dialogue, toasts, choices and typed commands'(b) {
    const pg = await page(b);
    await pg.evaluate(() => { H.ui.say('bios', ['First line', 'Second line']); });
    await pg.click('.ck-say [data-ck=next]'); await pg.click('.ck-say [data-ck=next]');
    await pg.evaluate(() => { H.ui.toast('A <b>toast</b> message'); H.ui.choice('Pick one', [{ label: 'Alpha', value: 1 }, { label: 'Beta', value: 2 }]); });
    await pg.click('.ck-choice button >> text=Beta');
    await pg.evaluate(() => { H.ui.learn('ls'); });
    await pg.fill('.ck-learn input', 'ls -a'); await pg.press('.ck-learn input', 'Enter'); await pg.waitForTimeout(1500);
    await pg.click('[data-ck=log]');
    const t = await pg.textContent('.ck-log');
    for (const want of ['Bios', 'First line', 'Second line', 'toast message', 'Pick one', 'You', 'Beta', 'ls -a']) assert.ok(t.includes(want), 'log has ' + want);
    assert.ok(await pg.evaluate(() => H.state.log.length >= 6), 'stored in the save');
    await pg.click('.ck-log [data-ck=closelog]');
    assert.equal(await pg.$('.ck-log'), null);
  },
  async 'action HUD shows stability, heat and one chip per tool'(b) {
    const pg = await page(b);
    await learnAll(pg, ['echo', 'ls']);
    await pg.evaluate(() => { H.ui.action(true); H.ui.actionTick({ time: 0, cooldowns: { echo: 0, ls: 1.5 }, player: { stability: 50, maxStability: 100, heat: 20, overheatUntil: 0 } }); });
    assert.equal(await pg.$$eval('.ck-act .ck-ssegs i.on', (e) => e.length), 5);
    assert.deepEqual(await pg.$$eval('.ck-act .ck-tool', (e) => e.map((x) => x.dataset.tool)), ['echo', 'ls']);
    assert.match(await pg.getAttribute('.ck-act [data-tool=ls]', 'aria-label'), /recharging/);
  },
  async 'Pip panel has Quests, Items, Map and Tasks'(b) {
    const pg = await page(b);
    await pg.evaluate(() => H.ui.pip());
    assert.deepEqual(await pg.$$eval('.ck-pip [data-tab]', (e) => e.map((x) => x.dataset.tab)), ['quests', 'items', 'map', 'tasks']);
  },
  async 'map tab marks here, lit, dim and unknown cells'(b) {
    const pg = await page(b);
    await pg.evaluate(() => { const s = H.state; s.node = 'f1'; s.explored.firmware = ['f0', 'f1', 'f3']; s.cleared.firmware = ['f1']; H.ui.pip('map'); });
    const cls = (id) => pg.$eval(`.ck-map [data-node=${id}]`, (e) => [e.className, e.textContent, e.getAttribute('aria-label')]);
    const [f1, f0, f3, f9] = [await cls('f1'), await cls('f0'), await cls('f3'), await cls('f9')];
    assert.ok(/here/.test(f1[0]) && /lit/.test(f1[0])); assert.match(f1[2], /you are here/);
    assert.match(f0[0], /lit/); assert.match(f3[0], /dim/);
    assert.equal(f9[0], ''); assert.equal(f9[1], ''); assert.equal(f9[2], 'Unexplored');
  },
  async 'items tab keeps moves always on and locks loadout in a fight'(b) {
    const pg = await page(b);
    await learnAll(pg, ['kill', 'trap', 'echo', 'ls']);
    await pg.evaluate(() => { H.fight = true; H.ui.pip('items'); });
    assert.equal(await pg.$$eval('[data-equip=kill], [data-unequip=kill], [data-equip=trap], [data-unequip=trap]', (e) => e.length), 0);
    assert.ok(await pg.$$eval('.ck-pip [data-equip], .ck-pip [data-unequip]', (e) => e.length > 0 && e.every((x) => x.disabled)));
    assert.match(await pg.textContent('.ck-pip'), /always on/);
    assert.equal(await pg.$$eval('[data-buy=kill-9]', (e) => e.length), 1);
  },
  async 'learn uses the skill’s own terminal responder'(b) {
    const pg = await page(b);
    await pg.evaluate(() => { H.learned = false; H.ui.learn('kill').then(() => (H.learned = true)); });
    await pg.fill('.ck-learn input', 'kill -l'); await pg.press('.ck-learn input', 'Enter');
    assert.match(await pg.textContent('.ck-learn'), /9\) SIGKILL/);
    await pg.waitForTimeout(1600);
    assert.equal(await pg.evaluate(() => H.learned && H.state.learned.includes('kill')), true);
  },
  async 'no leftover old-map wording'(b) {
    const pg = await page(b);
    await pg.evaluate(() => H.ui.pip('quests'));
    assert.doesNotMatch(await pg.getAttribute('[data-ck=pip]', 'title'), /combat/);
    assert.doesNotMatch(await pg.textContent('.ck-pip'), /nodes?\b/);
  },
  async 'buttons look embossed and pop when clicked'(b) {
    const pg = await page(b);
    const st = () => pg.$eval('[data-ck=pip]', (e) => { const c = getComputedStyle(e); return { shadow: c.boxShadow, bg: c.backgroundImage, a: new DOMMatrix(c.transform).a }; });
    const up = await st();
    assert.match(up.shadow, /inset/, 'a lit top edge and a shaded bottom edge'); assert.match(up.bg, /gradient/);
    const bx = await pg.$eval('[data-ck=pip]', (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await pg.mouse.move(bx[0], bx[1]); await pg.mouse.down(); await wait(120);
    const down = await st(); assert.ok(down.a < 0.97, 'sinks in: ' + down.a); assert.notEqual(down.shadow, up.shadow, 'pressed look');
    await pg.mouse.up(); await wait(400);
    assert.ok(Math.abs((await st()).a - 1) < 0.01, 'springs back');
  },
  async 'with reduced motion, buttons change shade but do not move'(b) {
    const pg = await page(b, { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const bx = await pg.$eval('[data-ck=pip]', (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    const before = await pg.$eval('[data-ck=pip]', (e) => getComputedStyle(e).boxShadow);
    await pg.mouse.move(bx[0], bx[1]); await pg.mouse.down(); await wait(80);
    const c = await pg.$eval('[data-ck=pip]', (e) => { const s = getComputedStyle(e); return { t: s.transform, shadow: s.boxShadow }; });
    await pg.mouse.up();
    assert.equal(c.t, 'none'); assert.notEqual(c.shadow, before);
  },
  async 'portrait is pixel art'(b) {
    const pg = await page(b);
    await pg.evaluate(() => { H.ui.say('bios', ['Hello.']); });
    const lit = await pg.$eval('.ck-say canvas.ck-portrait', (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
    assert.ok(lit > 200, `${lit} lit pixels`);
    assert.deepEqual(pg.errs, []);
  },
  async 'rotate overlay in portrait on a phone'(b) {
    const pg = await page(b, { ...devices['iPhone 13'] });
    assert.equal(await pg.isVisible('.ck-rotate'), true);
    const pg2 = await page(b, { ...devices['iPhone 13 landscape'] });
    assert.equal(await pg2.isVisible('.ck-rotate'), false);
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
