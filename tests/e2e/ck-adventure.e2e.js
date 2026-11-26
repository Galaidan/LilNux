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
const learnedAll = { learned: ['kill', 'trap', 'echo', 'ls', 'cd'], codex: ['kill', 'trap', 'echo', 'ls', 'cd'], equipped: ['ls', 'cd'] };
const badges = (pg) => pg.evaluate((k) => JSON.parse(localStorage.getItem(k)).players[0].badges, KEY);
const clearFoes = (pg, clean) => pg.evaluate((c) => CK._test.main.clearFoes({ clean: c }), clean);
// stand next to a prop of a kind and press E
async function useProp(pg, kind) {
  await pg.evaluate((k) => { const m = CK._test.main; const p = m.room.props.find((x) => x.kind === k); m.place(p.x, (p.ty + p.h) * 16 + 9); }, kind);
  await wait(150); await pg.keyboard.press('e'); await wait(150);
}
async function walk(pg, side, id) { await toDoor(pg, side); await waitRoom(pg, id); }
const lumAt = (pg, dx, dy) => pg.evaluate(([a, c]) => {
  const m = CK._test.main; const e = m.engine; const v = e.view; const P = m.sim.player; const cam = m.scene.cam;
  const d = e.ctx.getImageData(Math.round((P.x + a - cam.x) * v.k + v.ox), Math.round((P.y + c - cam.y) * v.k + v.oy), 1, 1).data; return 0.3 * d[0] + 0.59 * d[1] + 0.11 * d[2];
}, [dx, dy]);

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
  async 'puzzle tiles are at least 44 CSS px on an iPhone in landscape'(b) {
    const pg = await page(b, { ...devices['iPhone 13 landscape'] });
    await pg.waitForFunction(() => window.H && H.ui);
    const css = await pg.evaluate(() => {
      const c = document.createElement('canvas'); c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:50'; document.body.appendChild(c);
      const solution = CK.World.REGIONS[1].nodes.g9.ref.grid; const grid = CK.Puzzle.scramble(JSON.parse(JSON.stringify(solution)), CK.rng(3));
      const engine = CK.PixEngine.create(c); const scene = CK.PuzzleScene.create({ engine, canvas: c, host: document.body, grid, solution, onSolved() {}, onLeave() {} });
      engine.setScene(scene); const v = engine.view; const a = scene.cellCentre(0, 0); const b2 = scene.cellCentre(0, 1);
      const ok = a.x - 0 >= 0 && scene.cellCentre(grid.rows - 1, grid.cols - 1).y < v.h;
      return { px: ((b2.x - a.x) * v.k) / v.dpr, fits: ok };
    });
    assert.ok(css.px >= 44, `${css.px} CSS px`); assert.ok(css.fits);
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
    assert.deepEqual(await pg2.evaluate(() => { const p = CK._test.main.room.props.find((x) => x.kind === 'pedestal'); return [p.icon, !!p.taken, CK._test.main.state.modules.includes('ram')]; }), ['mod_ram', false, false], 'the RAM stick waits on its pedestal');
    await pg2.evaluate(() => { const m = CK._test.main; const p = m.room.props.find((x) => x.kind === 'pedestal'); m.place(p.x, (p.ty + 1) * 16 + 9); });
    await pg2.waitForFunction(() => CK._test.main.state.modules.includes('ram'), null, { timeout: 3000 }); await settle(pg2);
    assert.ok(await pg2.evaluate(() => CK.Rules.stats(CK._test.main.state).slots === 3 && CK.Rules.isCleared(CK._test.main.state, 'f6') && CK._test.main.room.props.find((x) => x.kind === 'pedestal').taken));
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

  // ---- Task 13: fights, puzzles, tools and story ----
  async 'first problem room teaches trap, seals forward doors, the entry door stays open'(b) {
    const pg = await openWith(b, { node: 'f3', prev: 'f1', checkpoint: { region: 'firmware', node: 'f3' }, switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f7'] },
      cleared: { firmware: ['f1', 'f3'] }, learned: ['kill', 'echo', 'ls'], codex: ['kill', 'echo', 'ls'], equipped: ['echo', 'ls'] });
    await settle(pg); await walk(pg, 'e', 'f5');
    await pg.waitForSelector('.ck-say'); await settle(pg);
    assert.ok(await pg.evaluate(() => CK._test.main.state.learned.includes('trap')));
    assert.deepEqual(await pg.evaluate(() => ['w', 'n', 's'].map((s) => CK._test.main.room.doorKind(s))), ['open', 'sealed', 'sealed']);
    assert.equal(await pg.evaluate(() => CK._test.main.sim.enemies.length), 3);
  },
  async 'back out of a problem room at once'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', checkpoint: { region: 'firmware', node: 'f3' }, switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f7'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw));
    await settle(pg); await walk(pg, 'e', 'f5'); await settle(pg);
    await pg.evaluate(() => { CK._test.main.sim.enemies[0].hp = 5; });
    await walk(pg, 'w', 'f3'); await settle(pg);
    assert.deepEqual(await pg.evaluate(() => [CK._test.main.state.node, CK._test.main.state.prev]), ['f3', 'f5']);
    await walk(pg, 'e', 'f5'); await settle(pg);
    assert.deepEqual(await pg.evaluate(() => CK._test.main.sim.enemies.map((e) => e.hp)), [30, 30, 30], 'fresh creatures');
    assert.equal(await pg.evaluate(() => CK._test.main.state.stats.fights), 0, 'backing out is not a fight');
  },
  async 'clean clear counts and pays the clean reward'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', bits: 3, checkpoint: { region: 'firmware', node: 'f3' }, switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f7'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw));
    await settle(pg); await walk(pg, 'e', 'f5'); await settle(pg);
    await clearFoes(pg, true);
    await pg.waitForFunction(() => CK.Rules.isCleared(CK._test.main.state, 'f5'), null, { timeout: 3000 });
    await settle(pg);
    const s = await pg.evaluate(() => ({ clean: CK._test.main.state.stats.clean, bits: CK._test.main.state.bits, n: CK._test.main.room.doorKind('n') }));
    assert.deepEqual([s.clean, s.bits, s.n], [1, 18, 'open']);
    assert.deepEqual(await pg.evaluate(() => [CK._test.main.state.stats.fights, CK._test.main.state.stats.wins]), [1, 1]);
  },
  async 'losing reboots at the checkpoint with loot kept'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', bits: 7, checkpoint: { region: 'firmware', node: 'f3' }, switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f7'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw));
    await settle(pg); await walk(pg, 'e', 'f5'); await settle(pg);
    await pg.evaluate(() => { const s = CK._test.main.sim; s.player.stability = 1; s.spawnOrb({ x: s.player.x, y: s.player.y, dmg: 8 }); });
    await pg.waitForFunction(() => CK._test.main.roomId === 'f3', null, { timeout: 4000 });
    await settle(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.state.bits), 7);
    assert.ok(await pg.evaluate(() => CK._test.main.state.log.some((e) => /rebooting at the last checkpoint/.test(e.html))));
    assert.equal(await pg.evaluate(() => CK._test.main.sim.player.stability), 100, 'full stability again');
  },
  async 'circuit room opens the puzzle; solving opens the doors'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f5', prev: 'f3', explored: { firmware: ['f3', 'f5', 'f6', 'f7', 'f9'] }, cleared: { firmware: ['f1', 'f3', 'f5'] } }, learnedFw));
    await settle(pg); await walk(pg, 's', 'f9'); await settle(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.room.doorKind('e')), 'sealed');
    await useProp(pg, 'terminal');
    await pg.waitForFunction(() => CK._test.main.sceneKind() === 'puzzle', null, { timeout: 3000 });
    await pg.evaluate(() => CK._test.puzzle.solve());
    await pg.waitForFunction(() => CK._test.main.sceneKind() === 'room' && CK.Rules.isCleared(CK._test.main.state, 'f9'), null, { timeout: 4000 });
    await settle(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.room.doorKind('e')), 'open');
  },
  async 'boss door asks Fight!/Not yet; winning installs the module, badge and outro'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f10', prev: 'f9', explored: { firmware: ['f9', 'f10', 'f12'] }, cleared: { firmware: ['f1', 'f3', 'f5', 'f9', 'f10'] } }, learnedFw));
    await settle(pg);
    await toDoor(pg, 's'); await pg.waitForSelector('.ck-choice');
    await pg.click('.ck-choice button >> text=Not yet'); await settle(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.roomId), 'f10');
    await place(pg, 280, 200); await wait(100); // away from the door (and from the memory crystal)
    await toDoor(pg, 's'); await pg.waitForSelector('.ck-choice');
    await pg.click('.ck-choice button >> text=Fight!'); await waitRoom(pg, 'f12'); await settle(pg);
    assert.ok(await pg.evaluate(() => ['n', 'w', 'e'].every((s) => CK._test.main.room.doorKind(s) === 'sealed')));
    assert.deepEqual(await pg.evaluate(() => CK._test.main.sim.enemies.map((e) => e.kind)), ['bootGlitch']);
    await clearFoes(pg, false);
    await pg.waitForFunction(() => CK.Rules.isCleared(CK._test.main.state, 'f12'), null, { timeout: 3000 });
    await settle(pg);
    assert.ok(await pg.evaluate(() => CK._test.main.state.modules.includes('fan')));
    assert.ok((await badges(pg)).includes('ck-r1'));
    assert.equal(await pg.evaluate(() => CK._test.main.room.doorKind('e')), 'open');
  },
  async 'cd terminal fast-travels between visited safe rooms'(b) {
    const pg = await openWith(b, Object.assign({ region: 'grub', node: 'g1', prev: 'g0', checkpoint: { region: 'grub', node: 'g1' }, explored: { grub: ['g0', 'g1', 'g2', 'g3', 'g4'] }, cleared: { grub: ['g1', 'g2'] } }, learnedAll));
    await settle(pg);
    await useProp(pg, 'terminal'); await pg.waitForSelector('.ck-choice');
    const opts = await pg.$$eval('.ck-choice button', (bs) => bs.map((x) => x.textContent.trim()));
    assert.deepEqual(opts, ['cd Boot_Menu', 'Cancel']);
    await pg.click('.ck-choice button >> text=cd Boot_Menu');
    await waitRoom(pg, 'g0');
  },
  async 'loop doors send you back until cd /boot at the sign'(b) {
    const pg = await openWith(b, Object.assign({ region: 'grub', node: 'g7', prev: 'g3', checkpoint: { region: 'grub', node: 'g1' }, explored: { grub: ['g1', 'g3', 'g4', 'g7', 'g8', 'g9'] }, cleared: { grub: ['g1', 'g3', 'g7'] } }, learnedAll));
    await settle(pg);
    await toDoor(pg, 'e'); await wait(300); await settle(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.roomId), 'g7', 'looped back');
    assert.ok(await pg.evaluate(() => CK._test.main.sim.player.x < 400), 'back from the east door');
    await useProp(pg, 'sign'); await pg.waitForSelector('.ck-choice');
    await pg.click('.ck-choice button >> text=cd /boot'); await settle(pg);
    assert.ok(await pg.evaluate(() => CK._test.main.state.signs.includes('g7')));
    await walk(pg, 'e', 'g8');
  },
  async 'ls -a reveals a cracked wall; kill opens it; the hidden cache pays bits'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', bits: 0, upgrades: ['ls-a'], switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f7'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw));
    await settle(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.room.doorKind('n')), 'wall');
    await pg.keyboard.press('2'); await wait(300); await settle(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.room.doorKind('n')), 'crack');
    await place(pg, 240, 30); await pg.evaluate(() => { CK._test.main.sim.player.face = { x: 0, y: -1 }; });
    await pg.keyboard.press('j'); await wait(300);
    assert.equal(await pg.evaluate(() => CK._test.main.room.doorKind('n')), 'open');
    await walk(pg, 'n', 'f14'); await settle(pg);
    await pg.evaluate(() => { const m = CK._test.main; const p = m.room.props.find((x) => x.kind === 'pedestal'); m.place(p.x, (p.ty + 1) * 16 + 9); });
    await pg.waitForFunction(() => CK._test.main.state.bits === 20, null, { timeout: 3000 });
  },
  async 'dark room lights up with ls'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f1', prev: 'f0', switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f2', 'f3', 'f4'] }, cleared: { firmware: ['f1'] } }, learnedFw));
    await settle(pg); await walk(pg, 's', 'f4'); await settle(pg); await wait(200);
    const before = await lumAt(pg, -70, 80);
    await pg.keyboard.press('2'); await wait(400);
    const after = await lumAt(pg, -70, 80);
    assert.ok(after > before + 40, `${before} -> ${after}`);
  },
  async 'rest at Home: taken cliffhanger and the Chapter 1 badge'(b) {
    const pg = await openWith(b, Object.assign({ region: 'grub', node: 'g12', prev: 'g10', checkpoint: { region: 'grub', node: 'g1' }, explored: { grub: ['g10', 'g11', 'g12', 'g13'] }, cleared: { grub: ['g1', 'g12'] }, modules: ['fan', 'ssd'] }, learnedAll));
    await settle(pg); await walk(pg, 'e', 'g13');
    await settle(pg, { pick: 'Rest now' });
    await settle(pg);
    const s = await pg.evaluate(() => ({ taken: CK._test.main.state.story.liltuxTaken, done: CK._test.main.state.chapterDone, gl: CK._test.main.state.story.glitched }));
    assert.deepEqual([s.taken, s.done, s.gl.includes('g13')], [true, true, true]);
    assert.ok((await badges(pg)).includes('ck-ch1'));
    assert.deepEqual(pg.errs, []);
  },
  // ---- Task 14: devices (ported from the retired Training Room suite) ----
  async 'engine scale at PC and iPhone landscape; a pale plaza over a dark void'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f3'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw), null, { viewport: { width: 1920, height: 1080 } });
    await settle(pg);
    assert.deepEqual(await pg.evaluate(() => { const v = CK._test.main.engine.view; return [v.k, v.w, v.h]; }), [4, 480, 270]);
    const lum = await pg.evaluate(() => {
      const m = CK._test.main; const bctx = m.engine.bctx; const cam = m.scene.cam;
      const L = (x, y) => { const d = bctx.getImageData(x, y, 1, 1).data; return 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]; };
      return { plaza: L(Math.round(17 * 16 + 4 - cam.x), Math.round(10 * 16 + 4 - cam.y)), corner: L(2, 268) };
    });
    assert.ok(lum.plaza > 150 && lum.corner < 40, JSON.stringify(lum));
    await pg.screenshot({ path: path.join(SHOTS, 'ck-adv-desktop.png') });
    const pg2 = await openWith(b, null, null, { ...devices['iPhone 13 landscape'] });
    const v2 = await pg2.evaluate(() => { const e = CK._test.main.engine; const c = e.canvas.getBoundingClientRect(); return [e.view.k, CK.PixEngine.fit(Math.round(c.width * e.view.dpr), Math.round(c.height * e.view.dpr)).k]; });
    assert.equal(v2[0], v2[1]);
    assert.deepEqual(pg.errs, []);
  },
  async 'touch pad on a phone: big buttons, equipped tools only, use near a character'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f1', prev: 'f0', switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f3'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw), null, { ...devices['iPhone 13 landscape'] });
    await settle(pg);
    assert.ok(await pg.isVisible('#ck-root .ck-touchpad')); assert.equal(await pg.isVisible('#ck-root .ck-rotate'), false);
    const shown = () => pg.$$eval('#ck-root .ck-tbtn', (bs) => bs.filter((x) => !x.hidden).map((x) => { const r = x.getBoundingClientRect(); return [x.dataset.act, r.width, r.height, r.right <= innerWidth - 8 && r.bottom <= innerHeight - 8 && r.left >= 0 && r.top >= 0]; }));
    let boxes = await shown();
    assert.deepEqual(boxes.map((x) => x[0]).sort(), ['dash', 'echo', 'kill', 'ls', 'trap']);
    boxes.forEach(([a, w, h, inside]) => { assert.ok(w >= 44 && h >= 44, `${a} ${w}x${h}`); assert.ok(inside, `${a} clipped`); });
    await walk(pg, 'e', 'f3'); await settle(pg);
    await pg.evaluate(() => { const m = CK._test.main; const p = m.room.props.find((x) => x.kind === 'npc'); m.place(p.x, (p.ty + 1) * 16 + 9); });
    await wait(200);
    boxes = await shown(); const use = boxes.find((x) => x[0] === 'use');
    assert.ok(use && use[1] >= 44 && use[3], 'the use button shows next to Bios');
    assert.match(await pg.getAttribute('#ck-root .ck-tbtn-use', 'aria-label'), /Bios/);
    await pg.screenshot({ path: path.join(SHOTS, 'ck-adv-phone.png') });
    assert.deepEqual(pg.errs, []);
  },
  async 'multi-touch: stick and kill at once, lift one, the other keeps working'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f3'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw), null, { ...devices['iPhone 13 landscape'] });
    await settle(pg);
    await place(pg, 14 * 16 + 8, 9 * 16 + 8); // open plaza, clear of pillars
    const r = await pg.evaluate(() => {
      const zone = document.querySelector('.ck-stick-zone'); const kill = document.querySelector('.ck-tbtn[data-act=kill]');
      const z = zone.getBoundingClientRect(); const k = kill.getBoundingClientRect();
      const fire = (el, type, id, x, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: id === 1 }));
      const sx = z.left + z.width / 3; const sy = z.top + z.height / 2;
      fire(zone, 'pointerdown', 1, sx, sy); fire(zone, 'pointermove', 1, sx + 40, sy);
      CK._test.main.events.length = 0;
      fire(kill, 'pointerdown', 2, k.left + k.width / 2, k.top + k.height / 2);
      window.__fire = fire; window.__kill = kill;
      return { kx: k.left + k.width / 2, ky: k.top + k.height / 2 };
    });
    await wait(150);
    const a = await pg.evaluate(() => ({ v: CK._test.main.input.stick.v.x, ev: CK._test.main.events.slice(), x: CK._test.main.sim.player.x }));
    assert.ok(a.v > 0.5, `stick ${a.v}`); assert.ok(a.ev.includes('swing'), JSON.stringify(a.ev));
    await pg.evaluate((q) => window.__fire(window.__kill, 'pointerup', 2, q.kx, q.ky), r);
    await wait(200);
    const c = await pg.evaluate(() => ({ v: CK._test.main.input.stick.v.x, x: CK._test.main.sim.player.x }));
    assert.ok(c.v > 0.5, 'stick still held'); assert.ok(c.x > a.x, 'still moving ');
  },
  async 'rotate and blur freeze a boss fight'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f10', prev: 'f9', explored: { firmware: ['f9', 'f10', 'f12'] }, cleared: { firmware: ['f1', 'f3', 'f5', 'f9', 'f10'] } }, learnedFw), null, { ...devices['iPhone 13 landscape'] });
    await settle(pg);
    await toDoor(pg, 's'); await pg.waitForSelector('.ck-choice'); await pg.click('.ck-choice button >> text=Fight!');
    await waitRoom(pg, 'f12'); await settle(pg);
    await pg.setViewportSize({ width: 390, height: 664 }); await wait(300);
    assert.ok(await pg.isVisible('#ck-root .ck-rotate'), 'rotate screen');
    const t0 = await pg.evaluate(() => CK._test.main.sim.time); await wait(600);
    assert.equal(await pg.evaluate(() => CK._test.main.sim.time), t0, 'frozen in portrait');
    await pg.setViewportSize({ width: 750, height: 342 }); await wait(300);
    const t1 = await pg.evaluate(() => CK._test.main.sim.time); assert.ok(t1 > t0, 'resumes in landscape');
    const k = await pg.evaluate(() => { const e = CK._test.main.engine; const c = e.canvas.getBoundingClientRect(); const p = e.toBuffer(c.left + c.width / 2, c.top + c.height / 2); return [e.view.k, CK.PixEngine.fit(Math.round(c.width * e.view.dpr), Math.round(c.height * e.view.dpr)).k, Math.abs(p.x - e.view.w / 2) <= 1]; });
    assert.deepEqual([k[0] === k[1], k[2]], [true, true]);
    await pg.evaluate(() => window.dispatchEvent(new Event('blur'))); await wait(100);
    const t2 = await pg.evaluate(() => CK._test.main.sim.time); await wait(400);
    assert.equal(await pg.evaluate(() => CK._test.main.sim.time), t2, 'frozen while unfocused');
    await pg.evaluate(() => window.dispatchEvent(new Event('focus'))); await wait(300);
    assert.ok((await pg.evaluate(() => CK._test.main.sim.time)) > t2, 'resumes on focus');
    assert.deepEqual(pg.errs, []);
  },
  async 'tool chips show cooldown'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f3'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw));
    await settle(pg);
    assert.deepEqual(await pg.$$eval('#ck-root .ck-act [data-tool]', (els) => els.map((e) => e.dataset.tool)), ['echo', 'ls']);
    await pg.keyboard.press('2'); await wait(250); await settle(pg);
    const busy = await pg.evaluate(() => { const c = document.querySelector('.ck-act [data-tool=ls]'); return { cd: parseFloat(c.style.getPropertyValue('--cd')), label: c.getAttribute('aria-label') }; });
    assert.ok(busy.cd > 0.4, JSON.stringify(busy)); assert.match(busy.label, /recharging/i);
    await wait(3200);
    assert.equal(await pg.evaluate(() => parseFloat(document.querySelector('.ck-act [data-tool=ls]').style.getPropertyValue('--cd'))), 0);
  },
  // ---- final review fixes ----
  async 'after a clear the Colonel walks again (real keys)'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', checkpoint: { region: 'firmware', node: 'f3' }, switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f3', 'f5', 'f7'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw));
    await settle(pg); await walk(pg, 'e', 'f5'); await settle(pg);
    await clearFoes(pg, true);
    await pg.waitForFunction(() => CK.Rules.isCleared(CK._test.main.state, 'f5'), null, { timeout: 3000 }); await settle(pg);
    await place(pg, 14 * 16 + 8, 9 * 16 + 8); await wait(100);
    const x0 = await pg.evaluate(() => CK._test.main.sim.player.x);
    await pg.keyboard.down('d'); await wait(500); await pg.keyboard.up('d');
    assert.ok((await pg.evaluate(() => CK._test.main.sim.player.x)) > x0 + 20, 'moved after the clear');
  },
  async 'closing a dialogue with Enter does not use what is next to you'(b) {
    const pg = await openWith(b, Object.assign({ region: 'grub', node: 'g7', prev: 'g3', checkpoint: { region: 'grub', node: 'g1' }, explored: { grub: ['g1', 'g3', 'g4', 'g7', 'g8', 'g9'] }, cleared: { grub: ['g1', 'g3', 'g7'] } }, learnedAll));
    await settle(pg);
    await useProp(pg, 'sign'); await pg.waitForSelector('.ck-choice');
    await pg.click('.ck-choice button >> text=cd /dev/null');
    await pg.waitForSelector('.ck-say'); await pg.keyboard.press('Enter'); await wait(400);
    assert.equal(await pg.evaluate(() => !!document.querySelector('.ck-choice')), false, 'the sign did not reopen');
  },
  async 'Enter presses a focused button'(b) {
    const pg = await openWith(b, Object.assign({ region: 'grub', node: 'g7', prev: 'g3', checkpoint: { region: 'grub', node: 'g1' }, explored: { grub: ['g1', 'g3', 'g4', 'g7', 'g8', 'g9'] }, cleared: { grub: ['g1', 'g3', 'g7'] } }, learnedAll));
    await settle(pg);
    await useProp(pg, 'sign'); await pg.waitForSelector('.ck-choice');
    await pg.evaluate(() => [...document.querySelectorAll('.ck-choice button')].find((x) => /Cancel/.test(x.textContent)).focus());
    await pg.keyboard.press('Enter'); await wait(300);
    assert.equal(await pg.evaluate(() => !!document.querySelector('.ck-choice')), false, 'Enter activated Cancel');
  },
  async 'the cd key next to a terminal opens fast travel'(b) {
    const pg = await openWith(b, Object.assign({ region: 'grub', node: 'g1', prev: 'g0', checkpoint: { region: 'grub', node: 'g1' }, explored: { grub: ['g0', 'g1', 'g2', 'g3', 'g4'] }, cleared: { grub: ['g1', 'g2'] } }, learnedAll));
    await settle(pg);
    await pg.evaluate(() => { const m = CK._test.main; const p = m.room.props.find((x) => x.kind === 'terminal'); m.place(p.x, (p.ty + p.h) * 16 + 9); });
    await wait(150); await pg.keyboard.press('2');
    await pg.waitForSelector('.ck-choice', { timeout: 2000 });
  },
  async 'no hit flashes with reduced motion'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', checkpoint: { region: 'firmware', node: 'f3' }, switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f3', 'f5', 'f7'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw), null, { viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    await settle(pg); await walk(pg, 'e', 'f5'); await settle(pg);
    await pg.evaluate(() => {
      window.__flash = 0; const d = CK.Pixel.draw; CK.Pixel.draw = function (c, b, x, y, o) { if (o && o.flash) window.__flash++; return d.apply(this, arguments); };
      const s = CK._test.main.sim; s.enemies.forEach((e) => { e.revealedUntil = 99; }); s.spawnOrb({ x: s.player.x, y: s.player.y, dmg: 5 });
      s.player.face = { x: 1, y: 0 };
    });
    await wait(400);
    const r = await pg.evaluate(() => ({ st: CK._test.main.sim.player.stability, red: CK._test.main.engine.reducedMotion, paused: CK._test.main.busy() }));
    assert.ok(r.red && r.st < 100, 'a hit landed with reduced motion on: ' + JSON.stringify(r));
    assert.equal(await pg.evaluate(() => window.__flash), 0);
  },
  // ---- polish: deferred minors, reach, health bars ----
  async 'resting while away mid-fight wakes at the checkpoint'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', checkpoint: { region: 'firmware', node: 'f3' }, switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f3', 'f5', 'f7'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw));
    await settle(pg); await walk(pg, 'e', 'f5'); await settle(pg);
    await pg.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));
      CK._test.main.state.story.lastSeen = Date.now() - 6 * 60 * 1000;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange'));
    });
    await wait(300); await settle(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.roomId), 'f3', 'woke in the safe room, not in the fight');
  },
  async 'equipping during a puzzle keeps the action bar hidden'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f5', prev: 'f3', explored: { firmware: ['f3', 'f5', 'f6', 'f7', 'f9'] }, cleared: { firmware: ['f1', 'f3', 'f5'] } }, learnedFw));
    await settle(pg); await walk(pg, 's', 'f9'); await settle(pg);
    await useProp(pg, 'terminal'); await pg.waitForFunction(() => CK._test.main.sceneKind() === 'puzzle', null, { timeout: 3000 });
    await pg.evaluate(() => CK._test.main.ui.pip('items')); await pg.click('[data-unequip=ls]');
    assert.equal(await pg.evaluate(() => document.querySelector('.ck-act').hidden), true);
  },
  async 'the Adventure terminal uses the same user name as Learn mode'(b) {
    const pg = await page(b, { viewport: { width: 1280, height: 720 } }, INDEX);
    pg.on('dialog', (d) => d.accept());
    await pg.fill('input[name=name]', '9lives'); await pg.click('#pform button[type=submit]');
    await openAdv(pg); await settle(pg);
    await walk(pg, 'e', 'f1'); await pg.waitForSelector('.ck-say');
    while (await pg.$('.ck-say')) { await pg.click('.ck-say [data-ck=next]'); }
    await pg.waitForSelector('.ck-learn');
    assert.match(await pg.textContent('.ck-learn .p'), /\[user9lives@/);
  },
  async 'enemies show health bars once you can see them'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', checkpoint: { region: 'firmware', node: 'f3' }, switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f3', 'f5', 'f7'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw));
    await settle(pg); await walk(pg, 'e', 'f5'); await settle(pg);
    await pg.evaluate(() => { const s = CK._test.main.sim; s.enemies.forEach((e) => { e.speed = 0; e.shootTimer = e.lungeTimer = 999; }); s.enemies[0].revealedUntil = 999; s.enemies[0].hp = 15; s.enemies[1].revealedUntil = 0; });
    await wait(250);
    const bars = await pg.evaluate(() => CK._test.main.scene.bars);
    const b0 = bars.find((x) => x.id === 'e0'); assert.ok(b0, JSON.stringify(bars)); assert.equal(b0.frac, 0.5);
    assert.ok(!bars.some((x) => x.id === 'e1'), 'a cloaked mite gives nothing away');
    const px = await pg.evaluate((bb) => { const m = CK._test.main; const d = m.engine.bctx.getImageData(Math.round(bb.x - m.scene.cam.x) + 1, Math.round(bb.y - m.scene.cam.y), 1, 1).data; return [d[0], d[1], d[2]]; }, b0);
    assert.deepEqual(px, [255, 179, 71], 'half health reads amber');
  },
  async 'bosses get a named health bar in the HUD'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f10', prev: 'f9', explored: { firmware: ['f9', 'f10', 'f12'] }, cleared: { firmware: ['f1', 'f3', 'f5', 'f9', 'f10'] } }, learnedFw));
    await settle(pg);
    assert.equal(await pg.isVisible('.ck-bossbar'), false);
    await place(pg, 280, 200); await wait(100);
    await toDoor(pg, 's'); await pg.waitForSelector('.ck-choice'); await pg.click('.ck-choice button >> text=Fight!');
    await waitRoom(pg, 'f12'); await settle(pg); await wait(250);
    assert.ok(await pg.isVisible('.ck-bossbar')); assert.match(await pg.textContent('.ck-bossbar'), /Corrupt Boot Glitch/);
    assert.match(await pg.getAttribute('.ck-bossbar [role=img]', 'aria-label'), /220 of 220/);
    await pg.evaluate(() => { CK._test.main.sim.enemies[0].hp = 110; }); await wait(250);
    assert.match(await pg.getAttribute('.ck-bossbar [role=img]', 'aria-label'), /110 of 220/);
    await clearFoes(pg, false); await pg.waitForFunction(() => CK.Rules.isCleared(CK._test.main.state, 'f12'), null, { timeout: 3000 }); await settle(pg);
    assert.equal(await pg.isVisible('.ck-bossbar'), false);
  },
  // ---- targeting ----
  async 'a reticle marks the soft target; L locks on, Q picks the next one'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', checkpoint: { region: 'firmware', node: 'f3' }, switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f3', 'f5', 'f7'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw));
    await settle(pg); await walk(pg, 'e', 'f5'); await settle(pg);
    await pg.evaluate(() => {
      const m = CK._test.main; const s = m.sim; m.place(14 * 16 + 8, 9 * 16 + 8); s.player.face = { x: 1, y: 0 };
      s.enemies.forEach((e, i) => { e.speed = 0; e.shootTimer = e.lungeTimer = 999; e.revealedUntil = 999; e.x = s.player.x + [70, 20, -60][i]; e.y = s.player.y + [-10, -70, 30][i]; });
    });
    await wait(200);
    assert.deepEqual(await pg.evaluate(() => CK._test.main.scene.reticle), { id: 'e0', locked: false });
    await pg.keyboard.press('l'); await wait(150);
    assert.equal(await pg.evaluate(() => CK._test.main.sim.locked), true);
    assert.deepEqual(await pg.evaluate(() => CK._test.main.scene.reticle), { id: 'e0', locked: true });
    await pg.keyboard.press('q'); await wait(150);
    assert.notEqual(await pg.evaluate(() => CK._test.main.sim.target), 'e0');
    await pg.keyboard.press('l'); await wait(150);
    assert.equal(await pg.evaluate(() => CK._test.main.sim.locked), false);
    await pg.screenshot({ path: path.join(SHOTS, 'ck-adv-target.png') });
    assert.deepEqual(pg.errs, []);
  },
  async 'phone: the lock toggle sits by the joystick and only shows in a fight'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', checkpoint: { region: 'firmware', node: 'f3' }, switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f3', 'f5', 'f7'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw), null, { ...devices['iPhone 13 landscape'] });
    await settle(pg);
    assert.equal(await pg.isVisible('#ck-root .ck-tbtn-lock'), false, 'no toggle in a safe room');
    await walk(pg, 'e', 'f5'); await settle(pg);
    await pg.evaluate(() => { const s = CK._test.main.sim; s.enemies.forEach((e) => { e.speed = 0; e.shootTimer = e.lungeTimer = 999; e.revealedUntil = 999; }); CK._test.main.place(14 * 16 + 8, 9 * 16 + 8); s.player.face = { x: 0, y: -1 }; const e = s.enemies[0]; e.x = s.player.x + 10; e.y = s.player.y - 60; });
    await wait(200);
    assert.ok(await pg.isVisible('#ck-root .ck-tbtn-lock'));
    const r = await pg.$eval('#ck-root .ck-tbtn-lock', (x) => { const b = x.getBoundingClientRect(); return { w: b.width, h: b.height, left: b.left, right: b.right, top: b.top, bottom: b.bottom, vw: innerWidth, vh: innerHeight, label: x.getAttribute('aria-label'), pressed: x.getAttribute('aria-pressed') }; });
    assert.ok(r.w >= 44 && r.h >= 44, JSON.stringify(r)); assert.ok(r.right < r.vw * 0.3, 'on the left, by the stick'); assert.ok(r.left >= 0 && r.bottom <= r.vh && r.top >= 0, 'on screen');
    assert.match(r.label, /lock/i); assert.equal(r.pressed, 'false');
    const tap = () => pg.evaluate(() => { const el = document.querySelector('#ck-root .ck-tbtn-lock'); const b = el.getBoundingClientRect();
      for (const t of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: b.left + b.width / 2, clientY: b.top + b.height / 2, bubbles: true, cancelable: true, pointerType: 'touch' })); });
    await tap(); await wait(150);
    assert.equal(await pg.evaluate(() => CK._test.main.sim.locked), true);
    assert.equal(await pg.getAttribute('#ck-root .ck-tbtn-lock', 'aria-pressed'), 'true');
    await tap(); await wait(150);
    assert.equal(await pg.evaluate(() => CK._test.main.sim.locked), false);
    await pg.screenshot({ path: path.join(SHOTS, 'ck-adv-lock-phone.png') });
    assert.deepEqual(pg.errs, []);
  },
  // ---- HUD layout and button feel ----
  async 'the top HUD never covers the Stability bar (phones and desktop)'(b) {
    const save = Object.assign({ node: 'f3', prev: 'f1', bits: 120, memories: ['[    0.000000] efi: EFI v2.9 by LilNux Firmware'], switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f3'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw);
    for (const opts of [{ ...devices['iPhone 13 landscape'] }, { ...devices['iPhone SE landscape'] }, { viewport: { width: 1280, height: 720 } }]) {
      const pg = await openWith(b, save, null, opts); await settle(pg); await wait(200);
      const r = await pg.evaluate(() => {
        const box = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom, e.className]; };
        const hud = [...document.querySelectorAll('.ck-hud-left > *, .ck-hud-right > *')].filter((e) => e.offsetParent).map(box);
        const act = [...document.querySelectorAll('.ck-act > *')].filter((e) => e.offsetParent).map(box);
        const toast = [...document.querySelectorAll('.ck-toast')].map(box);
        const hits = []; const over = (p, q) => p[0] < q[2] - 1 && q[0] < p[2] - 1 && p[1] < q[3] - 1 && q[1] < p[3] - 1;
        for (const a of hud) for (const c of act) if (over(a, c)) hits.push(a[4] + ' x ' + c[4]);
        for (const t of toast) for (const c of hud.concat(act)) if (over(t, c)) hits.push('toast x ' + c[4]);
        return { hits, n: act.length, toasts: toast.length, vw: innerWidth };
      });
      assert.ok(r.n >= 2, 'the action bar is showing'); assert.ok(r.toasts >= 1, 'Pip says welcome back');
      assert.deepEqual(r.hits, [], 'overlap at ' + r.vw + 'px wide');
      await pg.screenshot({ path: path.join(SHOTS, 'ck-adv-hud-' + r.vw + '.png') });
    }
  },
  async 'touch buttons sink when pressed and spring back'(b) {
    const pg = await openWith(b, Object.assign({ node: 'f3', prev: 'f1', switches: ['f1'], explored: { firmware: ['f0', 'f1', 'f3'] }, cleared: { firmware: ['f1', 'f3'] } }, learnedFw), null, { ...devices['iPhone 13 landscape'] });
    await settle(pg);
    const scale = () => pg.$eval('#ck-root .ck-tbtn-trap', (e) => new DOMMatrix(getComputedStyle(e).transform).a);
    const fire = (t) => pg.evaluate((type) => { const el = document.querySelector('#ck-root .ck-tbtn-trap'); const b = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent(type, { pointerId: 9, clientX: b.left + 20, clientY: b.top + 20, bubbles: true, cancelable: true, pointerType: 'touch' })); }, t);
    assert.match(await pg.$eval('#ck-root .ck-tbtn-trap', (e) => getComputedStyle(e).boxShadow), /inset/, 'embossed');
    await fire('pointerdown'); await wait(120);
    assert.ok((await scale()) < 0.97, 'pressed in');
    await fire('pointerup'); await wait(400);
    assert.ok(Math.abs((await scale()) - 1) < 0.01, 'back to size');
  },
  async 'full Chapter 1 playthrough'(b) {
    const pg = await openWith(b);
    const step = async (side, id) => { await walk(pg, side, id); await settle(pg); };
    const fight = async () => { await clearFoes(pg, true); await pg.waitForFunction(() => CK.Rules.isCleared(CK._test.main.state, CK._test.main.roomId), null, { timeout: 4000 }); await settle(pg); };
    const circuit = async () => {
      await useProp(pg, 'terminal'); await pg.waitForFunction(() => CK._test.main.sceneKind() === 'puzzle', null, { timeout: 3000 });
      await pg.evaluate(() => CK._test.puzzle.solve()); await pg.waitForFunction(() => CK._test.main.sceneKind() === 'room', null, { timeout: 4000 }); await settle(pg);
    };
    const boss = async (side, id) => {
      await toDoor(pg, side); await pg.waitForSelector('.ck-choice'); await pg.click('.ck-choice button >> text=Fight!');
      await waitRoom(pg, id); await settle(pg); await fight();
    };
    await settle(pg);
    await step('e', 'f1');
    await place(pg, 20 * 16 + 8, 7 * 16 + 8); await pg.waitForSelector('.ck-say', { timeout: 3000 }); await settle(pg);
    await place(pg, 20 * 16 + 8, 6 * 16 + 8); await pg.evaluate(() => { CK._test.main.sim.player.face = { x: 1, y: 0 }; });
    await pg.keyboard.press('1'); await pg.waitForFunction(() => CK._test.main.state.switches.includes('f1'), null, { timeout: 3000 }); await settle(pg);
    await step('e', 'f3');
    await step('e', 'f5'); await fight();
    await step('s', 'f9'); await circuit();
    await step('e', 'f10');
    await boss('s', 'f12');
    await step('e', 'f13');
    const g = await pg.evaluate(() => CK._test.main.room.props.find((p) => p.kind === 'gate')); await place(pg, g.x, g.y);
    await pg.waitForFunction(() => CK._test.main.roomId === 'g0', null, { timeout: 4000 }); await settle(pg);
    await walk(pg, 'e', 'g1'); await settle(pg, { pick: 'Swap out echo' });
    await step('e', 'g3'); await circuit();
    await step('s', 'g7');
    await useProp(pg, 'sign'); await pg.waitForSelector('.ck-choice'); await pg.click('.ck-choice button >> text=cd /boot'); await settle(pg);
    await step('e', 'g8'); await fight();
    await step('e', 'g10');
    await boss('s', 'g12');
    await walk(pg, 'e', 'g13'); await settle(pg, { pick: 'Rest now' }); await settle(pg);
    assert.equal(await pg.evaluate(() => CK._test.main.state.chapterDone), true);
    const bs = await badges(pg); for (const id of ['ck-r1', 'ck-r2', 'ck-ch1']) assert.ok(bs.includes(id), id);
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
