// HUD, Pip panel, dialogue and learning terminal. Run: node tests/e2e/ck-ui.e2e.js
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
  async 'skill bar fires onSkill'(b) {
    const pg = await page(b);
    await learnAll(pg, ['echo', 'ls']);
    await pg.evaluate(() => H.ui.skillBar(H.state, 'map'));
    await pg.click('.ck-skill[data-skill=ls]');
    assert.equal(await pg.evaluate(() => H.skill), 'ls');
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
    await pg.evaluate(() => { H.ui.hud(H.state); H.ui.skillBar(H.state, 'map'); H.ui.pip('items'); });
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: path.join(SHOTS, 'ck-pip-panel.png') });
    const small = await pg.$$eval('#ck-root button', (bs) => bs.filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).map((x) => x.outerHTML.slice(0, 80)));
    assert.deepEqual(small, []);
    await pg.evaluate(() => { H.ui.closePip(); H.ui.say('grub', CK.World.CHARACTERS.grub.lines); });
    await pg.waitForTimeout(300);
    await pg.screenshot({ path: path.join(SHOTS, 'ck-dialogue.png') });
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
