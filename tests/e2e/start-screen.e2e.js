// Start screen (Welcome + hub): FX runtime, wiring, theme, layout. Run: node tests/e2e/start-screen.e2e.js
const { chromium } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
const URL = require('url').pathToFileURL(path.resolve(__dirname, '../../index.html')).href;
const SHOTS = process.env.SHOTS || path.resolve(__dirname, '../../.shots');

const player = (id, name, avatar) => ({ id, name, avatar: avatar || '🐧', kid: false, xp: 0, worlds: {}, quests: {}, badges: [], unlockAll: false, sandboxCount: 0 });
const saveOf = (opts) => JSON.stringify({ players: (opts.players || [player('p1', 'Sam')]), current: opts.current === undefined ? 'p1' : opts.current, sound: opts.sound !== false });

// A page with a seeded save, an AudioContext construction counter and a requestAnimationFrame counter.
async function open(b, opts = {}) {
  const ctx = await b.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference', colorScheme: opts.colorScheme || 'dark' });
  await ctx.addInitScript((save) => {
    if (save) localStorage.setItem('lilnux.save.v1', save);
    window.__ac = 0;
    const Real = window.AudioContext;
    // counts only the contexts StartFX makes (the game's own click sounds keep a separate one)
    if (Real) { window.AudioContext = function () { if (new Error().stack.includes('start-fx')) window.__ac++; return new Real(); }; window.AudioContext.prototype = Real.prototype; }
    window.__raf = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (f) => { window.__raf++; return raf(f); };
  }, opts.save === null ? null : saveOf(opts));
  const pg = await ctx.newPage();
  pg.errs = [];
  pg.on('pageerror', (e) => pg.errs.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error') pg.errs.push(m.text()); });
  pg.on('dialog', (d) => d.accept());
  await pg.goto(URL);
  return pg;
}
const dbg = (pg) => pg.evaluate(() => StartFX._debug());
const music = (pg) => pg.evaluate(() => document.body.dataset.music);
const acCount = (pg) => pg.evaluate(() => window.__ac);
// the shell mounts the FX by itself on entry views, so start these tests from a clean slate
const mountFx = (pg, on) => pg.evaluate((snd) => { StartFX.unmount(); window.__snd = snd !== false; StartFX.mount({ soundOn: () => window.__snd }); }, on);
const musicOn = (pg) => pg.waitForFunction(() => StartFX._debug().musicOn === true, null, { timeout: 3000 });

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

// ---------------------------------------------------------------- Task 2: the FX runtime on its own
test('fx: mounts one canvas pair and runs', async (b) => {
  const pg = await open(b);
  await mountFx(pg);
  await pg.waitForFunction(() => StartFX._debug().runners > 0, null, { timeout: 3000 });
  const d = await dbg(pg);
  assert.equal(d.canvases, 2); assert.equal(d.running, true);
  const pos = await pg.$$eval('.start-bg', (cs) => cs.map((c) => getComputedStyle(c).position));
  assert.deepEqual(pos, ['fixed', 'fixed']);
  return pg;
});

test('fx: mounting repeatedly is still one pair', async (b) => {
  const pg = await open(b);
  await pg.evaluate(() => { const o = { soundOn: () => true }; StartFX.mount(o); StartFX.mount(o); StartFX.mount(o); });
  assert.equal((await dbg(pg)).canvases, 2);
  await pg.evaluate(() => { StartFX.unmount(); StartFX.mount({ soundOn: () => true }); });
  assert.equal((await dbg(pg)).canvases, 2);
  assert.equal(await pg.evaluate(() => document.querySelectorAll('#start-grid, #start-fx').length), 2);
  return pg;
});

test('fx: no audio before a gesture', async (b) => {
  const pg = await open(b);
  await mountFx(pg);
  await pg.waitForTimeout(500);
  assert.equal(await acCount(pg), 0);
  assert.equal(await music(pg), 'waiting');
  return pg;
});

test('fx: first tap starts music once, after a short delay', async (b) => {
  const pg = await open(b);
  await mountFx(pg);
  await pg.mouse.click(10, 10);
  await pg.waitForTimeout(100);
  assert.equal(await acCount(pg), 0);
  await musicOn(pg);
  assert.equal(await acCount(pg), 1);
  await pg.mouse.click(12, 12); await pg.waitForTimeout(500);
  assert.equal(await acCount(pg), 1);
  assert.equal((await dbg(pg)).musicOn, true);
  return pg;
});

test('fx: tapping straight through plays no music', async (b) => {
  const pg = await open(b);
  await mountFx(pg);
  await pg.mouse.click(10, 10);
  await pg.evaluate(() => StartFX.unmount());
  await pg.waitForTimeout(900);
  assert.equal(await acCount(pg), 0);
  return pg;
});

test('fx: sound off never plays', async (b) => {
  const pg = await open(b);
  await mountFx(pg, false);
  assert.equal(await music(pg), 'off');
  await pg.mouse.click(10, 10); await pg.waitForTimeout(900);
  assert.equal(await acCount(pg), 0);
  assert.equal(await music(pg), 'off');
  return pg;
});

test('fx: setSound toggles the music', async (b) => {
  const pg = await open(b);
  await mountFx(pg);
  await pg.mouse.click(10, 10); await musicOn(pg);
  await pg.evaluate(() => { window.__snd = false; StartFX.setSound(false); });
  assert.equal(await music(pg), 'off'); assert.equal((await dbg(pg)).musicOn, false);
  await pg.evaluate(() => { window.__snd = true; StartFX.setSound(true); });
  assert.equal(await music(pg), 'on'); assert.equal((await dbg(pg)).musicOn, true);
  assert.equal(await acCount(pg), 1);
  return pg;
});

test('fx: unmount cleans everything up', async (b) => {
  const pg = await open(b);
  await mountFx(pg);
  await pg.mouse.click(10, 10); await musicOn(pg);
  await pg.evaluate(() => StartFX.unmount());
  const d = await dbg(pg);
  assert.equal(d.canvases, 0); assert.equal(d.running, false); assert.equal(d.musicOn, false);
  assert.equal(await music(pg), undefined);
  assert.equal(await pg.evaluate(() => StartFX.isMounted()), false);
  await pg.waitForTimeout(150);
  const raf = await pg.evaluate(() => window.__raf);
  await pg.waitForTimeout(400);
  assert.equal(await pg.evaluate(() => window.__raf), raf, 'no animation frames after unmount');
  return pg;
});

test('fx: a hidden tab pauses and resumes', async (b) => {
  const pg = await open(b);
  await mountFx(pg);
  await pg.mouse.click(10, 10); await musicOn(pg);
  const setHidden = (h) => pg.evaluate((hide) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => hide }); document.dispatchEvent(new Event('visibilitychange')); }, h);
  await setHidden(true);
  assert.equal((await dbg(pg)).running, false);
  await pg.waitForFunction(() => StartFX._debug().audioState === 'suspended', null, { timeout: 3000 });
  await setHidden(false);
  assert.equal((await dbg(pg)).running, true);
  await pg.waitForFunction(() => StartFX._debug().audioState === 'running', null, { timeout: 3000 });
  return pg;
});

test('fx: reduced motion draws no runners', async (b) => {
  const pg = await open(b, { reduced: true });
  await mountFx(pg);
  const d = await dbg(pg);
  assert.equal(d.running, false); assert.equal(d.runners, 0); assert.ok(d.nodes > 0); assert.equal(d.canvases, 2);
  return pg;
});

// ---------------------------------------------------------------- Task 3: shell wiring + always-dark theme
const screenOf = (pg) => pg.evaluate(() => document.body.dataset.screen);
const bodyBg = (pg) => pg.evaluate(() => { const m = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g).map(Number); return m.slice(0, 3); });
const savedSound = (pg) => pg.evaluate(() => JSON.parse(localStorage.getItem('lilnux.save.v1')).sound);

test('shell: entry views are marked and mounted, other views are not', async (b) => {
  const pg = await open(b);
  assert.equal(await screenOf(pg), 'entry');
  assert.equal(await pg.evaluate(() => StartFX.isMounted()), true);
  assert.equal((await dbg(pg)).canvases, 2);
  await pg.click('.hub-card.learn [data-go=map]');
  assert.equal(await screenOf(pg), undefined);
  assert.equal(await pg.evaluate(() => StartFX.isMounted()), false);
  assert.equal((await dbg(pg)).canvases, 0);
  return pg;
});

test('shell: the Welcome screen (no player yet) is an entry view too', async (b) => {
  const pg = await open(b, { save: null });
  assert.equal(await screenOf(pg), 'entry');
  assert.equal((await dbg(pg)).canvases, 2);
  return pg;
});

test('shell: churn players > hub > map > hub never doubles anything', async (b) => {
  const pg = await open(b);
  const check = async () => { await pg.waitForTimeout(150); const c = (await dbg(pg)).canvases; assert.ok(c === 0 || c === 2, 'canvases ' + c); };
  for (const sel of ['.player-chip', '.player-main', '.mode-switch [data-go=map]', '.brand', '.player-chip', '.player-main']) { await pg.click(sel); await check(); }
  await pg.waitForTimeout(600);
  assert.ok((await acCount(pg)) <= 1, 'at most one AudioContext');
  assert.equal(await pg.evaluate(() => document.querySelectorAll('#start-grid, #start-fx').length), 2);
  return pg;
});

test('shell: entering the Adventure stops the music', async (b) => {
  const pg = await open(b);
  await pg.mouse.click(5, 300); await musicOn(pg);
  await pg.click('.mode-switch [data-go=kernel]');
  await pg.waitForTimeout(200);
  assert.equal(await music(pg), undefined);
  const d = await dbg(pg);
  assert.equal(d.musicOn, false); assert.equal(d.canvases, 0);
  return pg;
});

test('shell: the top-bar sound switch controls the music', async (b) => {
  const pg = await open(b);
  await pg.click('[data-act=sound]');
  assert.equal(await music(pg), 'off'); assert.equal(await savedSound(pg), false);
  await pg.click('[data-act=sound]');
  assert.equal(await savedSound(pg), true);
  await musicOn(pg);
  assert.equal(await music(pg), 'on');
  return pg;
});

test('shell: a saved sound-off setting never plays', async (b) => {
  const pg = await open(b, { sound: false });
  assert.equal(await music(pg), 'off');
  await pg.mouse.click(5, 300); await pg.waitForTimeout(900);
  assert.equal(await acCount(pg), 0);
  return pg;
});

test('shell: entry views stay dark even when the OS and theme are light', async (b) => {
  const pg = await open(b, { colorScheme: 'light' });
  await pg.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  assert.ok((await bodyBg(pg)).every((v) => v < 40), 'hub is dark: ' + (await bodyBg(pg)));
  await pg.click('.hub-card.learn [data-go=map]');
  assert.ok((await bodyBg(pg)).every((v) => v > 200), 'map is light: ' + (await bodyBg(pg)));
  await pg.click('.brand');
  assert.ok((await bodyBg(pg)).every((v) => v < 40), 'hub is dark again');
  return pg;
});

// ---------------------------------------------------------------- runner
(async () => {
  const only = process.env.ONLY;
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let failed = 0; const errs = [];
  for (const [name, fn] of tests) {
    if (only && !name.includes(only)) continue;
    let pg = null;
    try { pg = await fn(b); console.log('PASS', name); }
    catch (e) { failed++; console.log('FAIL', name, '\n   ', String(e.message).split('\n').slice(0, 4).join('\n    ')); }
    if (pg && pg.errs) errs.push(...pg.errs);
  }
  console.log('ERRORS', JSON.stringify(errs));
  console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
  await b.close();
  process.exit(failed || errs.length ? 1 : 0);
})();
