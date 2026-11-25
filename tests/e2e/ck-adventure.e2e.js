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

// ---- the real game, through the hub ----------------------------------------------------------------
const KEY = 'lilnux.save.v1';
async function hubPage(b, opts) {
  const pg = await page(b, opts || { viewport: { width: 1280, height: 720 } }, INDEX);
  pg.on('dialog', (d) => d.accept());
  await pg.fill('input[name=name]', 'Tester'); await pg.click('#pform button[type=submit]');
  return pg;
}
async function openAdv(pg) {
  await pg.click('.mode-switch [data-go=kernel]');
  await pg.waitForFunction(() => window.CK && CK._test && CK._test.main && CK._test.main.sceneKind() !== 'none');
}
// A save to start from: `raw` is stored as-is (a v1 save), `o` is merged into CK.State.fresh() in the page.
async function openWith(b, o, raw, opts) {
  const pg = await hubPage(b, opts);
  if (o || raw) {
    await pg.evaluate(([o2, r2, key]) => {
      const s = JSON.parse(localStorage.getItem(key));
      s.players[0].ck = r2 || Object.assign(CK.State.fresh(), { seenIntro: true }, o2);
      localStorage.setItem(key, JSON.stringify(s));
    }, [o || null, raw || null, KEY]);
    await pg.reload();
  }
  await openAdv(pg);
  return pg;
}
const M = (pg) => pg.evaluate(() => { const m = CK._test.main; return { room: m.roomId, scene: m.sceneKind(), node: m.state.node, region: m.state.region, busy: m.busy(), learning: m.learning }; });
// Click through banners and dialogue, type each lesson's example; stop at a choice (returns 'choice') or when free.
async function settle(pg, opts) {
  opts = opts || {};
  for (let i = 0; i < 80; i++) {
    const s = await pg.evaluate(() => ({ banner: !!document.querySelector('.ck-banner'), say: !!document.querySelector('.ck-say'), learn: !!document.querySelector('.ck-learn'),
      choice: !!document.querySelector('.ck-choice'), busy: CK._test.main.busy() }));
    if (s.banner) { await pg.click('.ck-banner'); continue; }
    if (s.say) { await pg.click('.ck-say [data-ck=next]'); continue; }
    if (s.learn) {
      const ex = await pg.evaluate(() => CK._test.main.learnExample);
      await pg.fill('.ck-learn input', ex); await pg.press('.ck-learn input', 'Enter'); await wait(1300); continue;
    }
    if (s.choice) { if (opts.pick) { await pg.click(`.ck-choice button >> text=${opts.pick}`); opts = Object.assign({}, opts, { pick: null }); continue; } return 'choice'; }
    if (!s.busy) return 'free';
    await wait(100);
  }
  throw new Error('settle: still busy');
}
const toDoor = (pg, side) => pg.evaluate((s) => CK._test.main.toDoor(s), side);
const waitRoom = (pg, id) => pg.waitForFunction((x) => CK._test.main.roomId === x && !CK._test.main.scene.transitioning, id, { timeout: 4000 });
const place = (pg, x, y) => pg.evaluate(([a, c]) => CK._test.main.place(a, c), [x, y]);
const learnedFw = { learned: ['kill', 'trap', 'echo', 'ls'], codex: ['kill', 'trap', 'echo', 'ls'], equipped: ['echo', 'ls'] };

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

  // ---- Task 12: walking the world ----
  async 'opens in Cold Boot with the intro'(b) {
    const pg = await openWith(b);
    await pg.waitForSelector('.ck-banner');
    assert.match(await pg.textContent('.ck-banner'), /Firmware Foundry/);
    assert.equal(await settle(pg), 'free');
    const s = await M(pg); assert.deepEqual([s.scene, s.room], ['room', 'f0']);
    // Cold Boot is dark: the plaza far from the Colonel is much darker than next to the Colonel
    await wait(300);
    const lum = await pg.evaluate(() => {
      const m = CK._test.main; const e = m.engine; const v = e.view; const P = m.sim.player; const cam = m.scene.cam;
      const at = (bx, by) => { const d = e.ctx.getImageData(Math.round((bx - cam.x) * v.k + v.ox), Math.round((by - cam.y) * v.k + v.oy), 1, 1).data; return 0.3 * d[0] + 0.59 * d[1] + 0.11 * d[2]; };
      return { near: at(P.x + 4, P.y - 30), far: at(P.x - 120, P.y - 80) };
    });
    assert.ok(lum.near > lum.far + 40, JSON.stringify(lum));
    await pg.screenshot({ path: path.join(SHOTS, 'ck-adv-coldboot.png') });
    assert.deepEqual(pg.errs, []);
  },
  async 'walks through a door; Pip teaches kill at Power Rail'(b) {
    const pg = await openWith(b);
    await settle(pg);
    await toDoor(pg, 'e'); await waitRoom(pg, 'f1');
    const s = await M(pg); assert.equal(s.node, 'f1');
    await pg.waitForSelector('.ck-say');
    assert.equal(await settle(pg), 'free');
    assert.ok(await pg.evaluate(() => CK._test.main.state.learned.includes('kill')));
    const p = await pg.evaluate(() => { const m = CK._test.main; const e = CK.Rooms.entryPoint(m.room, 'w'); return Math.hypot(m.sim.player.x - e.x, m.sim.player.y - e.y); });
    assert.ok(p < 40, `near the west entry (${p})`);
    assert.deepEqual(pg.errs, []);
  },
  async 'echo lesson at the gap; the switch extends the bridge for good'(b) {
    const pg = await openWith(b, { node: 'f1', prev: 'f0', explored: { firmware: ['f0', 'f1', 'f2', 'f3', 'f4'] }, cleared: { firmware: ['f1'] }, learned: ['kill', 'trap'], codex: ['kill', 'trap'] });
    await settle(pg);
    await place(pg, 20 * 16 + 8, 7 * 16 + 8);
    await pg.waitForSelector('.ck-say', { timeout: 3000 });
    await settle(pg);
    assert.ok(await pg.evaluate(() => CK._test.main.state.equipped.includes('echo')));
    await place(pg, 20 * 16 + 8, 6 * 16 + 8);
    await pg.evaluate(() => { CK._test.main.sim.player.face = { x: 1, y: 0 }; });
    await pg.keyboard.press('1');
    await pg.waitForFunction(() => CK._test.main.state.switches.includes('f1'), null, { timeout: 3000 });
    assert.equal(await pg.evaluate(() => CK._test.main.room.tiles.some((r) => r.includes('_'))), false, 'bridge out');
    await settle(pg);
    await toDoor(pg, 'w'); await waitRoom(pg, 'f0'); await settle(pg);
    await toDoor(pg, 'e'); await waitRoom(pg, 'f1'); await settle(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.room.tiles.some((r) => r.includes('_'))), false, 'still out after coming back');
    assert.deepEqual(pg.errs, []);
  },
  async 'Bios teaches ls in the Firmware Vault'(b) {
    const pg = await openWith(b, { node: 'f1', prev: 'f0', switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f2', 'f3', 'f4'] }, cleared: { firmware: ['f1'] },
      learned: ['kill', 'trap', 'echo'], codex: ['kill', 'trap', 'echo'], equipped: ['echo'] });
    await settle(pg);
    await toDoor(pg, 'e'); await waitRoom(pg, 'f3');
    await pg.waitForSelector('.ck-say'); await settle(pg);
    assert.ok(await pg.evaluate(() => CK._test.main.state.learned.includes('ls') && CK._test.main.state.equipped.includes('ls')));
  },
  async 'memory crystal behind corrupt blocks; module pedestal'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f1', prev: 'f0', switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f2', 'f3', 'f4'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw));
    await settle(pg);
    await toDoor(pg, 'n'); await waitRoom(pg, 'f2'); await settle(pg);
    await place(pg, 14 * 16 + 8, 3 * 16 + 12);
    await pg.evaluate(() => { CK._test.main.sim.player.face = { x: 0, y: -1 }; });
    await pg.keyboard.press('j'); await wait(400);
    assert.equal(await pg.evaluate(() => CK._test.main.room.tiles[2][14]), '.', 'block broken');
    await place(pg, 14 * 16 + 8, 2 * 16 + 8);
    await pg.waitForFunction(() => CK._test.main.state.memories.length === 1, null, { timeout: 3000 });
    await settle(pg);
    await toDoor(pg, 's'); await waitRoom(pg, 'f1'); await settle(pg);
    // pedestal: seed a later save next to the DIMM Slot
    const pg2 = await openWith(b, Object.assign({ node: 'f5', prev: 'f3', explored: { firmware: ['f0', 'f1', 'f3', 'f5', 'f6', 'f9'] }, cleared: { firmware: ['f1', 'f3', 'f5'] } }, learnedFw));
    await settle(pg2);
    await toDoor(pg2, 'n'); await waitRoom(pg2, 'f6'); await settle(pg2);
    assert.ok(await pg2.evaluate(() => CK._test.main.state.modules.includes('ram') && CK.Rules.stats(CK._test.main.state).slots === 3));
  },
  async 'exit to GRUB Gate'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f12', prev: 'f10', explored: { firmware: ['f10', 'f11', 'f12', 'f13'] }, cleared: { firmware: ['f12'] }, modules: ['fan'] }, learnedFw));
    await settle(pg);
    await toDoor(pg, 'e'); await waitRoom(pg, 'f13'); await settle(pg);
    const g = await pg.evaluate(() => CK._test.main.room.props.find((p) => p.kind === 'gate'));
    await place(pg, g.x, g.y);
    await pg.waitForSelector('.ck-banner'); assert.match(await pg.textContent('.ck-banner'), /GRUB Gate/);
    await settle(pg);
    const s = await M(pg); assert.deepEqual([s.region, s.room], ['grub', 'g0']);
  },
  async 'reload inside a sealed room resumes at the checkpoint'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', checkpoint: { region: 'firmware', node: 'f3' }, switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f7'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw));
    await settle(pg);
    await toDoor(pg, 'e'); await waitRoom(pg, 'f5'); await settle(pg);
    await pg.reload(); await openAdv(pg); await settle(pg);
    const s = await M(pg); assert.equal(s.room, 'f3');
    assert.equal(await pg.evaluate(() => CK._test.main.room.doorKind('e')), 'open');
  },
  async 'v1 save loads into the new Adventure'(b) {
    const V1 = { v: 1, region: 'firmware', node: 'f3', prev: 'f1', explored: { firmware: ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f7'] }, cleared: { firmware: ['f1', 'f3'] },
      learned: ['echo', 'ls'], equipped: ['echo', 'ls'], upgrades: ['cd-dash'], modules: [], bits: 5, memories: [], tasksDone: [], codex: ['echo', 'ls'],
      checkpoint: { region: 'firmware', node: 'f3' }, stats: { clean: 1, fights: 2, wins: 2 }, chapterDone: false, seenIntro: true, log: [], story: { liltuxMet: false } };
    const pg = await openWith(b, null, V1);
    await pg.waitForFunction(() => (CK._test.main.state.log || []).some((e) => /New moves/.test(e.html)), null, { timeout: 4000 });
    await settle(pg);
    const s = await pg.evaluate(() => { const st = CK._test.main.state; return { learned: st.learned, bits: st.bits, room: CK._test.main.roomId, newMoves: st.story.newMoves }; });
    assert.deepEqual([s.learned.includes('kill'), s.learned.includes('trap'), s.bits, s.room, s.newMoves], [true, true, 55, 'f3', false]);
    await pg.click('[data-ck=exit]'); await pg.waitForSelector('.hub'); await openAdv(pg); await settle(pg);
    const n = await pg.evaluate(() => CK._test.main.state.log.filter((e) => /New moves/.test(e.html)).length);
    assert.equal(n, 1, 'the toast shows once');
  },
  async 'overlays freeze the room and swallow their keys'(b) {
    const pg = await openWith(b, { node: 'f0', explored: { firmware: ['f0', 'f1'] } });
    await settle(pg);
    await toDoor(pg, 'e'); await waitRoom(pg, 'f1');
    await pg.waitForSelector('.ck-say');
    const t0 = await pg.evaluate(() => CK._test.main.sim.time); await wait(500);
    assert.equal(await pg.evaluate(() => CK._test.main.sim.time), t0, 'frozen during dialogue');
    while (await pg.$('.ck-say')) { await pg.keyboard.press('Enter'); await wait(80); }
    await pg.waitForSelector('.ck-learn input');
    const before = await pg.evaluate(() => { const m = CK._test.main; m.events.length = 0; return { x: m.sim.player.x, y: m.sim.player.y }; });
    await pg.type('.ck-learn input', 'kill -l'); await pg.press('.ck-learn input', 'Enter'); await wait(1500);
    await settle(pg); await wait(300);
    const after = await pg.evaluate(() => { const m = CK._test.main; return { x: m.sim.player.x, y: m.sim.player.y, ev: m.events.slice() }; });
    assert.deepEqual([after.x, after.y], [before.x, before.y], 'did not move');
    assert.ok(!after.ev.some((e) => ['swing', 'trap', 'dash'].includes(e)), after.ev.join(','));
    await pg.click('[data-ck=pip]');
    const t1 = await pg.evaluate(() => CK._test.main.sim.time); await wait(400);
    assert.equal(await pg.evaluate(() => CK._test.main.sim.time), t1, 'frozen with Pip open');
    assert.deepEqual(pg.errs, []);
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
