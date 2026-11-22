// Plays all 8 LilNux learning worlds with correct answers. Run: node tests/e2e/lilnux-regression.e2e.js
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../../index.html');
const SOLVE = {
  'cd Mu  (then press Tab, then Enter)': ['TAB:cd Mu'],
  'sudo dnf install fortune-mod   then   fortune': ['sudo dnf install fortune-mod', 'y', 'fortune'],
  'sudo dnf install fastfetch   then   fastfetch': ['sudo dnf install fastfetch', 'y', 'fastfetch'],
};

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  let failed = false;
  pg.on('pageerror', (e) => errs.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  pg.on('dialog', (d) => d.accept());
  await pg.goto(URL);
  await pg.fill('input[name=name]', 'Sam');
  await pg.click('#pform button[type=submit]');
  // the mode choice screen: two clearly separate parts
  for (const sel of ['.hub-card.learn', '.hub-card.adventure', '.mode-switch [data-go=map]', '.mode-switch [data-go=kernel]']) {
    if (!(await pg.$(sel))) { console.log('MISSING', sel); failed = true; }
  }
  if (!/Learn/.test(await pg.textContent('.hub-card.learn')) || !/Colonel Kernel/.test(await pg.textContent('.hub-card.adventure'))) { console.log('HUB TEXT'); failed = true; }
  await pg.click('.hub-card.learn [data-go=map]');
  if (!(await pg.$('.mode-banner.learn'))) { console.log('MISSING learn banner'); failed = true; }
  const worlds = await pg.evaluate(() => window.LILNUX_WORLDS.map((w) => ({
    id: w.id,
    steps: w.steps.map((s) => ({ type: s.type, answer: s.answer, n: (s.pairs || s.items || []).length, show: s.show || (s.accept && typeof s.accept[0] === 'string' ? s.accept[0] : null), hints: (s.missions || []).map((m) => m.hint) })),
  })));
  for (const w of worlds) {
    await pg.click(`[data-world="${w.id}"]`);
    for (const s of w.steps) {
      if (s.type === 'quiz') await pg.click(`.opt[data-opt="${s.answer}"]`);
      else if (s.type === 'match') { for (let k = 0; k < s.n; k++) { await pg.click(`[data-l="${k}"]`); await pg.click(`[data-r="${k}"]`); } }
      else if (s.type === 'order') { for (let k = 0; k < s.n; k++) await pg.click(`[data-o="${k}"]`); }
      else if (s.type === 'type') { await pg.fill('#tin', s.show); await pg.click('#tform button'); }
      else if (s.type === 'terminal') {
        for (let m = 0; m < s.hints.length; m++) {
          for (const c of SOLVE[s.hints[m]] || [s.hints[m]]) {
            if (c.startsWith('TAB:')) { await pg.fill('.term-in', c.slice(4)); await pg.press('.term-in', 'Tab'); await pg.press('.term-in', 'Enter'); continue; }
            await pg.fill('.term-in', c); await pg.press('.term-in', 'Enter');
            for (let g = 0; g < 3; g++) {
              const pr = await pg.textContent('.term-prompt');
              if (pr.includes('password')) { await pg.fill('.term-in', 'secret'); await pg.press('.term-in', 'Enter'); }
              else if (pr.includes('[y/N]') || pr.includes('[Y/n]')) { await pg.fill('.term-in', 'y'); await pg.press('.term-in', 'Enter'); }
              else break;
            }
          }
          const done = await pg.$$eval('.mlist li.done', (l) => l.length);
          if (done !== m + 1) { console.log('MISSION FAIL', w.id, m, s.hints[m]); failed = true; break; }
        }
      }
      await pg.click('[data-act=next]:not(.hidden)');
    }
    const stars = await pg.$$eval('.big-stars .on', (l) => l.length);
    console.log('done', w.id, 'stars', stars);
    if (stars !== 3) failed = true;
    await pg.click('[data-go=map]');
  }
  console.log('ERRORS', errs);
  await b.close();
  if (failed || errs.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
