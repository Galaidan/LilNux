// Plays Colonel Kernel chapter 1 inside the real LilNux page. Run: node tests/e2e/ck-chapter.e2e.js
const { chromium } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
const URL = 'file://' + path.resolve(__dirname, '../../index.html') + '?ckdebug';
const SHOTS = process.env.SHOTS || '/tmp';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(b, init) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  if (init) await ctx.addInitScript(init);
  const pg = await ctx.newPage();
  pg.errs = [];
  pg.on('pageerror', (e) => pg.errs.push(e.message));
  pg.on('dialog', (d) => d.accept());
  await pg.goto(URL);
  return pg;
}
async function addPlayer(pg, name) {
  await pg.fill('input[name=name]', name || 'Tester');
  await pg.click('#pform button[type=submit]');
}
async function openKernel(pg) {
  await pg.click('.map-foot [data-go=kernel]');
  await pg.waitForFunction(() => window.CK && CK._test && CK._test.main);
}
const info = (pg) => pg.evaluate(() => {
  const m = CK._test.main;
  return { scene: m.sceneKind(), say: !!document.querySelector('.ck-say'), learning: document.querySelector('.ck-learn') ? m.learning : null,
    choice: !!document.querySelector('.ck-choice'), banner: !!document.querySelector('.ck-banner'), busy: m.busy(), problemSkill: m.pendingProblem };
});

// Resolve whatever is on screen until the player is free on the map again.
async function settle(pg, opts) {
  opts = opts || {};
  for (let i = 0; i < 120; i++) {
    const s = await info(pg);
    if (s.banner) { await pg.click('.ck-banner'); continue; }
    if (s.say) { await pg.click('.ck-say [data-ck=next]'); continue; }
    if (s.learning) {
      const ex = await pg.evaluate(() => CK._test.main.learnExample);
      await pg.fill('.ck-learn input', ex); await pg.press('.ck-learn input', 'Enter'); await wait(1400); continue;
    }
    if (s.choice && opts.stopAtChoice) return 'choice';
    if (s.choice) {
      const want = opts.wrong ? 'echo' : s.problemSkill;
      const btns = await pg.$$('.ck-choice button');
      let picked = false;
      if (want) for (const btn of btns) { if ((await btn.textContent()).includes('with ' + want)) { await btn.click(); picked = true; break; } }
      if (!picked) await btns[0].click();
      if (opts.stopAfterChoice) return;
      continue;
    }
    if (s.scene === 'fight') { if (opts.stopInFight) return 'fight'; await pg.evaluate(() => CK._test.win()); await wait(1400); continue; }
    if (s.scene === 'puzzle') { await pg.evaluate(() => CK._test.solve()); await wait(1200); continue; }
    if (!s.busy) return;
    await wait(120);
  }
  throw new Error('settle: stuck');
}

// Next hop toward the nearest unfinished node (boss last, exit after that).
const nextHop = (pg) => pg.evaluate(() => {
  const s = CK._test.main.state; const R = CK.Rules; const reg = R.region(s.region); const ex = s.explored[s.region];
  const want = (id) => !R.isCleared(s, id);
  const rank = (id) => (reg.nodes[id].kind === 'boss' ? 1 : reg.nodes[id].kind === 'exit' ? 2 : 0);
  const prev = { [s.node]: null }; const q = [s.node]; const found = [];
  while (q.length) {
    const n = q.shift();
    if (n !== s.node && (want(n) || reg.nodes[n].kind === 'exit')) { found.push(n); continue; }
    if (n !== s.node && !R.isCleared(s, n)) continue;
    for (const nb of R.neighbors(reg, n)) if (!(nb in prev) && ex.includes(nb)) { prev[nb] = n; q.push(nb); }
  }
  if (!found.length) return null;
  found.sort((a, b) => rank(a) - rank(b));
  let t = found[0]; while (prev[t] !== s.node) t = prev[t];
  return t;
});
async function step(pg, opts) {
  const hop = await nextHop(pg);
  if (!hop) return false;
  await pg.evaluate((h) => CK._test.mapScene.tapNode(h), hop);
  for (let i = 0; i < 40; i++) { await wait(100); const s = await pg.evaluate(() => ({ n: CK._test.main.state.node, r: CK._test.main.state.region, b: CK._test.main.busy() })); if (s.b || s.n === hop) break; }
  await settle(pg, opts);
  return true;
}

const tests = {
  async 'full chapter'(b) {
    const pg = await newPage(b);
    await addPlayer(pg, 'Sam');
    await openKernel(pg);
    await settle(pg);
    // first move uses a real mouse click on the canvas
    const p = await pg.evaluate(() => CK._test.nodeScreenPos('f1'));
    await wait(600); await pg.mouse.click(p.x, p.y); await wait(1500); await settle(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.state.learned.includes('echo')), true, 'learned echo from Pip');
    let shot = false;
    for (let i = 0; i < 120; i++) {
      if (await pg.evaluate(() => CK._test.main.state.chapterDone)) break;
      if (!shot && (await pg.evaluate(() => CK._test.main.state.region)) === 'grub') { await pg.screenshot({ path: path.join(SHOTS, 'ck-chapter-grub.png') }); shot = true; }
      const moved = await step(pg);
      if (!moved) break;
    }
    await settle(pg);
    const st = await pg.evaluate(() => CK._test.main.state);
    assert.equal(st.chapterDone, true, 'chapter done');
    assert.deepEqual(st.learned, ['echo', 'ls', 'cd']);
    assert.ok(st.modules.includes('ram') && st.modules.includes('fan') && st.modules.includes('cpu') && st.modules.includes('ssd'), st.modules.join());
    assert.equal(st.memories.length, 10);
    const player = await pg.evaluate(() => JSON.parse(localStorage.getItem('lilnux.save.v1')).players[0]);
    assert.ok(player.xp > 0);
    for (const id of ['ck-r1', 'ck-r2', 'ck-ch1', 'ck-clean']) assert.ok(player.badges.includes(id), id);
    assert.equal(st.story.liltuxMet, true, 'met Lil Tux at Home');
    assert.equal(st.story.restUnlocked, true, 'learned systemctl suspend');
    assert.equal(st.story.liltuxTaken, true, 'the first rest took Lil Tux');
    assert.deepEqual(st.story.glitched, ['g13']);
    await pg.screenshot({ path: path.join(SHOTS, 'ck-chapter-end.png') });
    assert.deepEqual(pg.errs, []);
  },
  async 'wrong skill starts a fight'(b) {
    const pg = await newPage(b);
    await addPlayer(pg); await openKernel(pg); await settle(pg);
    for (let i = 0; i < 20; i++) {
      const hop = await nextHop(pg);
      const kind = await pg.evaluate((h) => CK.Rules.region(CK._test.main.state.region).nodes[h].kind, hop);
      if (kind === 'problem') {
        await pg.evaluate((h) => CK._test.mapScene.tapNode(h), hop); await wait(1500);
        assert.equal(await settle(pg, { wrong: true, stopInFight: true }), 'fight');
        return;
      }
      await step(pg);
    }
    throw new Error('never reached a problem');
  },
  async 'reenter after exit mid-fight'(b) {
    const pg = await newPage(b);
    await addPlayer(pg); await openKernel(pg); await settle(pg);
    for (let i = 0; i < 20; i++) {
      const hop = await nextHop(pg);
      const kind = await pg.evaluate((h) => CK.Rules.region(CK._test.main.state.region).nodes[h].kind, hop);
      if (kind === 'problem') { await pg.evaluate((h) => CK._test.mapScene.tapNode(h), hop); await wait(1500); await settle(pg, { wrong: true, stopInFight: true }); break; }
      await step(pg);
    }
    assert.equal((await info(pg)).scene, 'fight');
    await pg.click('[data-ck=exit]');
    await wait(300);
    assert.equal(await pg.evaluate(() => CK._test.loops), 0);
    await openKernel(pg); await settle(pg);
    assert.equal(await pg.evaluate(() => CK._test.loops), 1);
    const st = await pg.evaluate(() => CK._test.main.state);
    assert.equal(st.node, st.checkpoint.node);
    assert.equal((await info(pg)).scene, 'map');
  },
  async 'save survives reload'(b) {
    const pg = await newPage(b);
    await addPlayer(pg); await openKernel(pg); await settle(pg);
    await step(pg); await step(pg);
    const before = await pg.evaluate(() => ({ node: CK._test.main.state.node, learned: CK._test.main.state.learned }));
    await pg.reload();
    await openKernel(pg); await settle(pg);
    const after = await pg.evaluate(() => ({ node: CK._test.main.state.node, learned: CK._test.main.state.learned }));
    assert.deepEqual(after, before);
  },
  async 'plays with storage blocked'(b) {
    const pg = await newPage(b, () => { Storage.prototype.setItem = function () { throw new Error('blocked'); }; });
    await addPlayer(pg); await openKernel(pg); await settle(pg);
    await step(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.state.node), 'f1');
    assert.deepEqual(pg.errs, []);
  },
  async 'old save without ck'(b) {
    const pg = await newPage(b, () => {
      localStorage.setItem('lilnux.save.v1', JSON.stringify({ players: [{ id: 'p1', name: 'Old', avatar: '🦊', kid: false, xp: 120, worlds: {}, quests: {}, badges: [], unlockAll: false }], current: 'p1', sound: false }));
    });
    await openKernel(pg); await settle(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.state.node), 'f0');
    assert.deepEqual(pg.errs, []);
  },
  async 'corrupt ids do not crash and Exit still works'(b) {
    const pg = await newPage(b, () => {
      localStorage.setItem('lilnux.save.v1', JSON.stringify({ players: [{ id: 'p1', name: 'Old', avatar: '🦊', kid: false, xp: 0, worlds: {}, quests: {}, badges: [], unlockAll: false,
        ck: { region: 'firmware', node: 'f0', seenIntro: true, explored: { firmware: ['f0', 'f1', 'zzz'] }, learned: ['grep'], equipped: ['grep'], checkpoint: { region: 'firmware', node: 'f99' } } }], current: 'p1', sound: false }));
    });
    await openKernel(pg); await settle(pg);
    await step(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.state.node), 'f1');
    assert.deepEqual(pg.errs, []);
    await settle(pg);
    await pg.click('[data-ck=exit]');
    assert.equal(await pg.$('#ck-root'), null);
  },
  async 'full slots offer a swap when learning cd'(b) {
    const pg = await newPage(b, () => {
      localStorage.setItem('lilnux.save.v1', JSON.stringify({ players: [{ id: 'p1', name: 'Old', avatar: '🦊', kid: false, xp: 0, worlds: {}, quests: {}, badges: [], unlockAll: false,
        ck: { region: 'grub', node: 'g0', seenIntro: true, explored: { grub: ['g0', 'g1'] }, learned: ['echo', 'ls'], equipped: ['echo', 'ls'], codex: ['echo', 'ls'], checkpoint: { region: 'grub', node: 'g0' } } }], current: 'p1', sound: false }));
    });
    await openKernel(pg); await settle(pg);
    await pg.evaluate(() => CK._test.mapScene.tapNode('g1')); await wait(1500);
    let sawSwap = false;
    for (let i = 0; i < 40; i++) {
      const s = await info(pg);
      if (s.choice) { const t = await pg.textContent('.ck-choice'); if (/slots are full/i.test(t)) { sawSwap = true; await pg.click('.ck-choice button >> nth=0'); continue; } }
      if (!s.choice && !s.say && !s.learning && !s.busy) break;
      await settle(pg, { stopAtChoice: true });
    }
    assert.ok(sawSwap, 'swap offered');
    assert.ok(await pg.evaluate(() => CK._test.main.state.equipped.includes('cd')));
  },
  async 'quitting for 5+ minutes counts as a rest (one secret event)'(b) {
    const pg = await newPage(b, () => {
      const ck = { region: 'firmware', node: 'f3', seenIntro: true, explored: { firmware: ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f7'] }, cleared: { firmware: ['f1', 'f2', 'f3', 'f5', 'f9'] },
        learned: ['echo', 'ls'], equipped: ['echo', 'ls'], codex: ['echo', 'ls'], bits: 40, checkpoint: { region: 'firmware', node: 'f3' }, story: { lastSeen: Date.now() - 10 * 60e3 } };
      localStorage.setItem('lilnux.save.v1', JSON.stringify({ players: [{ id: 'p1', name: 'Old', avatar: '🦊', kid: false, xp: 0, worlds: {}, quests: {}, badges: [], unlockAll: false, ck }], current: 'p1', sound: false }));
    });
    await openKernel(pg); await settle(pg);
    const st = await pg.evaluate(() => CK._test.main.state);
    assert.equal(st.story.rests, 1);
    const events = (st.cleared.firmware.includes('f9') ? 0 : 1) + st.story.oddLogs.length + (st.story.flicker ? 1 : 0);
    assert.ok(events <= 1);
    assert.deepEqual([st.bits, st.learned], [40, ['echo', 'ls']], 'nothing lost');
    assert.deepEqual(pg.errs, []);
  },
  async 'coming back within 5 minutes is not a rest'(b) {
    const pg = await newPage(b, () => {
      const ck = { region: 'firmware', node: 'f1', seenIntro: true, learned: ['echo'], equipped: ['echo'], checkpoint: { region: 'firmware', node: 'f1' }, story: { lastSeen: Date.now() - 60e3 } };
      localStorage.setItem('lilnux.save.v1', JSON.stringify({ players: [{ id: 'p1', name: 'Old', avatar: '🦊', kid: false, xp: 0, worlds: {}, quests: {}, badges: [], unlockAll: false, ck }], current: 'p1', sound: false }));
    });
    await openKernel(pg); await settle(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.state.story.rests), 0);
  },
  async 'break reminder offers a rest'(b) {
    const pg = await newPage(b);
    await addPlayer(pg);
    await openKernel(pg); await settle(pg);
    await pg.evaluate(() => { CK.Story.BREAK_MS = 1500; });
    await wait(3000);
    assert.match(await pg.textContent('.ck-choice'), /break/i);
    await pg.click('.ck-choice button >> text=Keep playing');
    assert.equal(await pg.$('.ck-choice'), null);
  },
};

(async () => {
  const b = await chromium.launch();
  let fail = 0;
  const only = process.argv[2];
  for (const [name, fn] of Object.entries(tests)) {
    if (only && !name.includes(only)) continue;
    try { await fn(b); console.log('ok -', name); } catch (e) { fail++; console.log('not ok -', name, '\n   ', e.message.split('\n')[0]); }
  }
  await b.close();
  console.log(fail ? `FAIL ${fail}` : 'PASS');
  process.exit(fail ? 1 : 0);
})();
