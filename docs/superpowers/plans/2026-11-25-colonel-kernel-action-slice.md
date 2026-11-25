# Colonel Kernel Action Slice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable one-room "Training Room" in the new pixel action style. The Colonel moves
freely and fights Glitch Mites with `kill`, dash, `trap`, `echo` and `ls`, on keyboard and mouse
and on iPhone landscape. It's shipped as a playtest zip from branch `ck-action`. The current
Chapter 1 stays playable and untouched.

**Architecture:** New, self-contained files sit next to the old Adventure:
- `CK.PixEngine`: low-res buffer, integer scale, fixed 60 Hz step.
- `CK.Input`: keyboard, mouse, and touch stick + buttons.
- `CK.Pixel` + `CK.Sprites`: palette-indexed sprite grids → canvases.
- `CK.Rooms`: ASCII rooms.
- `CK.Action`: pure simulation, no drawing, node-testable.
- `CK.RoomScene`: drawing.
- `CK.openSlice`: entry point, HUD, rotate overlay.

A temporary hub button opens the slice. The old engine, map, fights and `main.js` aren't
modified, so the Chapter 1 plan (written after this playtest) can replace them knowingly.

**Tech Stack:** Plain JS (classic scripts, IIFE, `root.CK` namespace), Canvas 2D, Pointer
Events. Tests: `node --test` and Playwright + Chromium, installed outside the repo.

**Spec:** `docs/superpowers/specs/2026-11-25-colonel-kernel-action-adventure-design.md`
(sections 3, 5, 6.1, 6.2, 9, 10.1)

## Global Constraints

- No build step, no runtime dependencies, classic `<script>` tags, works from `file://`, GitHub
  Pages and the PWA.
- Every new JS file uses the existing pattern
  `(function (root) { 'use strict'; const CK = (root.CK = root.CK || {}); … })(typeof window !== 'undefined' ? window : globalThis);`
  and must load in Node **without touching `document`/`window` at load time**, because unit tests
  `require` them.
- Pixel buffer scale: `k = max(1, round(deviceHeightPx / 270))`, buffer `floor(deviceW/k) × floor(deviceH/k)`.
  Room 30×17 tiles of 16 px (480×272).
- Neon Circuit palette exactly as `js/ck/art.js` `C`:
  - `bg0 #060a1c`, `bg1 #14103a`
  - `cyan #38f2ff`, `magenta #ff4fd8`, `violet #8b5cff`, `mint #6dffb0`
  - `amber #ffb347`, `coral #ff5d73`, `gold #ffd166`
  - `ink #e8f1ff`, `dim #7f8bb3`, `steel #1c2448`, `steel2 #2b3768`
- All text in the HTML overlay, never drawn into the canvas. Contrast ≥ 4.5:1.
- Touch targets ≥ 44 CSS px. Controls inside `env(safe-area-inset-*)`. `touch-action: none`. No
  long-press callout.
- Reduced motion (`engine.reducedMotion`): no screen shake, no flashing; hit-stop is allowed.
- The sound toggle is respected (sounds go through the `h.sound` / `h.soundOn` the hub passes in).
- Original art only. Nothing copied from any existing game.
- `manifest.webmanifest` gets no `orientation`.
- Commit identity is already set repo-locally (`Galaidan`). Never add personal details.
- Before every `git`/`node` call in a PowerShell session started before the installs, refresh
  PATH:
  `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`.
  E2E runs need `$env:NODE_PATH = 'C:\ClaudeBro\.pw\node_modules'`.

## Review Focus

1. **Window loses focus while a key or touch is held.** The Colonel must stop, not run forever
   (`blur` / `pointercancel` clear held input). → Task 7 test `blur clears held movement`.
2. **Two thumbs at once on iPhone** (stick + kill, then lift one). The other must keep working.
   → Task 7 e2e `multi-touch stick + kill`.
3. **Very large `dt`** after a tab switch or a slow phone frame. Must not tunnel through walls or
   skip a parry window: the fixed step clamps. → Task 2 test `step clamps backlog`, Task 4 test
   `no tunnelling at max step`.
4. **Resizing or rotating mid-fight** (portrait ↔ landscape). Buffer and scale recompute and
   aim/stick still map correctly. → Task 9 e2e `rotate mid-fight`.
5. **Parry pressed at the exact moment an orb arrives during a dash.** No double-handling, no
   damage. → Task 6 test `parry during dash invulnerability`.

---

### Task 1: E2E baseline on this Windows PC

**Files:**
- Modify: `tests/e2e/ck-engine.e2e.js`, `ck-ui.e2e.js`, `ck-scenes.e2e.js`, `ck-chapter.e2e.js`,
  `lilnux-regression.e2e.js` (URL and SHOTS lines only)

**Interfaces:** Produces the E2E run recipe that every later task uses.

- [ ] **Step 1: Install Playwright outside the repo**

```powershell
New-Item -ItemType Directory -Force C:\ClaudeBro\.pw | Out-Null
Set-Location C:\ClaudeBro\.pw; npm init -y | Out-Null; npm i playwright; npx playwright install chromium
```
Expected: `node -e "require('playwright')"` succeeds from `C:\ClaudeBro\.pw`.

- [ ] **Step 2: Run one suite to see the Windows failure**

Run: `$env:NODE_PATH='C:\ClaudeBro\.pw\node_modules'; node tests/e2e/ck-engine.e2e.js`
Expected: failures from `'file://' + path.resolve(...)` producing an invalid Windows URL, and/or
`/tmp` screenshots.

- [ ] **Step 3: Fix URL and SHOTS in all five suites**

In each file, replace the URL line with
`require('url').pathToFileURL(path.resolve(__dirname, '<same html>')).href + '<same query>'`
and default `SHOTS` to `process.env.SHOTS || require('os').tmpdir()`. No other changes.

- [ ] **Step 4: Run every suite, one at a time**

Run each of `node --test tests/ck/*.test.js` and the five `node tests/e2e/*.e2e.js`.
Expected: 76 unit tests pass, and every e2e suite prints `PASS`. If a suite fails for a reason
other than the platform, stop and report it. Don't fix game code in this task.

- [ ] **Step 5: Commit**

`git add tests/e2e; git commit -m "Tests: run e2e suites on Windows (file URLs, temp screenshots)"`

---

### Task 2: Pixel engine (`CK.PixEngine`)

**Files:**
- Create: `js/ck/pixengine.js`
- Test: `tests/ck/pixengine.test.js`

**Interfaces:**
- Produces:
  - `CK.PixEngine.fit(devW: number, devH: number) → { k, w, h }`
  - `CK.PixEngine.camera(roomW, roomH, bufW, bufH, px, py) → { x, y }`. This is the top-left of
    the view in room pixels. A negative value centres the room in a larger buffer.
  - `CK.PixEngine.stepper(stepSec = 1/60, maxSteps = 5) → { advance(dtSec) → number }`. Returns
    the number of fixed steps to run and drops any backlog beyond `maxSteps`.
  - `CK.PixEngine.create(canvas) → engine` with:
    - `engine.buf` (offscreen canvas), `engine.bctx` (its 2D context, `imageSmoothingEnabled = false`)
    - `engine.view = { k, w, h, cssW, cssH, dpr }`
    - `engine.setScene(s)`, where `s` may have `update(dt)` (called once per fixed step),
      `draw(bctx, t, view)` and `resize(view)`
    - `start()`, `stop()`, `destroy()`, `running`, `reducedMotion`
    - `toBuffer(clientX, clientY) → { x, y }`
  
  Each frame, the scene draws into `buf`, then `buf` is blitted to `canvas` at scale `k` with
  smoothing off. It pauses when `document.hidden`. Device size = CSS size × `devicePixelRatio`
  (no cap).

- [ ] **Step 1: Write failing tests** (`require('../../js/ck/pixengine.js')` must not throw in Node)

```js
test('fit picks a whole-number scale near 270 tall', () => {
  assert.deepEqual(PixEngine.fit(1920, 1080), { k: 4, w: 480, h: 270 });
  assert.deepEqual(PixEngine.fit(2556, 1179), { k: 4, w: 639, h: 294 });
  assert.deepEqual(PixEngine.fit(1366, 768), { k: 3, w: 455, h: 256 });
  assert.deepEqual(PixEngine.fit(300, 200), { k: 1, w: 300, h: 200 });
});
test('camera centres a small room, clamps a big one', () => {
  assert.deepEqual(PixEngine.camera(480, 272, 639, 294, 240, 136), { x: -79, y: -11 });
  assert.deepEqual(PixEngine.camera(480, 272, 455, 256, 10, 10), { x: 0, y: 0 });
  assert.deepEqual(PixEngine.camera(480, 272, 455, 256, 470, 260), { x: 25, y: 16 });
  assert.deepEqual(PixEngine.camera(480, 272, 455, 256, 240, 136), { x: 13, y: 8 });
});
test('step clamps backlog', () => {
  const s = PixEngine.stepper(1 / 60, 5);
  assert.equal(s.advance(1 / 60), 1);
  assert.equal(s.advance(0.5), 5);      // a 0.5 s stall runs at most 5 steps…
  assert.equal(s.advance(1 / 60), 1);   // …and the rest is dropped, not carried
});
```

- [ ] **Step 2: Run, expect FAIL** — `node --test tests/ck/pixengine.test.js` → cannot find module / not a function.
- [ ] **Step 3: Implement `js/ck/pixengine.js`** (`camera` uses `Math.floor` for the centring margin and the half-buffer).
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `git add js/ck/pixengine.js tests/ck/pixengine.test.js; git commit -m "CK: pixel engine (integer scale, camera, fixed step)"`

---

### Task 3: Pixel sprites (`CK.Pixel`, `CK.Sprites`)

**Files:**
- Create: `js/ck/pixel.js`, `js/ck/sprites.js`
- Test: `tests/ck/pixel.test.js`

**Interfaces:**
- Produces:
  - `CK.Pixel.parse(rows: string[], palette: {char: '#rrggbb'}) → { w, h, data: Uint8ClampedArray }`
    (RGBA; `.` is transparent; an unknown char throws `Error('bad pixel "<c>" at x,y')`).
  - `CK.Pixel.build(sprite) → { w, h, img, glow }`: browser only. `img` is a canvas. `glow` is
    the same shape blurred and brightened once at build time, drawn later with `'lighter'`.
  - `CK.Pixel.draw(bctx, built, x, y, { flip, alpha, flash })`: `x, y` is the sprite's **feet
    centre**. `flash` draws it solid white (hit flash).
  - `CK.Sprites.PALETTE`: one-char keys mapped to the Neon Circuit colours (plus `.`
    transparent), e.g. `k`=bg0 `n`=bg1 `c`=cyan `m`=magenta `v`=violet `g`=mint `a`=amber
    `r`=coral `y`=gold `w`=ink `d`=dim `s`=steel `S`=steel2 `W`=`#ffffff` `b`=`#0b0b10`
    `o`=`#f5a623`.
  - `CK.Sprites.SET`: `{ name: { rows: string[] } }` with at least:
    - `colonel_down_0`, `colonel_down_1`, `colonel_up_0`, `colonel_up_1`, `colonel_side_0`,
      `colonel_side_1`, `colonel_attack_down`, `colonel_attack_up`, `colonel_attack_side`,
      `colonel_dash` — all 32×32. Side faces right; left = flip.
    - `pip` 16×16, `mite_0` and `mite_1` 16×16, `orb` 6×6, `bolt` 8×4
    - `tile_floor`, `tile_floor_alt`, `tile_wall_top`, `tile_wall_front`, `tile_door` — all 16×16
  - `CK.Sprites.built()`: browser only, lazily runs `build` on every entry and caches.

  Design notes (artist's call within these): the Colonel keeps the officer cap with a tiny
  penguin emblem (`b`/`W`/`o`), gold band, magenta→cyan visor with white eyes, steel body with
  a cyan chest core and gold epaulettes. Walls show a lit top face (`S` + region accent edge) and
  a darker front face (`s`/`k`).

- [ ] **Step 1: Write failing tests**

```js
test('parse maps palette chars to RGBA and . to transparent', () => {
  const p = Pixel.parse(['.c', 'k.'], { c: '#38f2ff', k: '#060a1c' });
  assert.deepEqual([p.w, p.h], [2, 2]);
  assert.deepEqual([...p.data.slice(0, 8)], [0, 0, 0, 0, 0x38, 0xf2, 0xff, 255]);
});
test('parse rejects unknown chars and ragged rows', () => {
  assert.throws(() => Pixel.parse(['cz'], { c: '#38f2ff' }), /bad pixel "z" at 1,0/);
  assert.throws(() => Pixel.parse(['cc', 'c'], { c: '#38f2ff' }), /ragged/);
});
test('every sprite parses with the shared palette at its required size', () => {
  const size = (n) => /^colonel_/.test(n) ? [32, 32] : /^(pip|mite_|tile_)/.test(n) ? [16, 16] : n === 'orb' ? [6, 6] : n === 'bolt' ? [8, 4] : null;
  for (const [name, s] of Object.entries(Sprites.SET)) {
    const p = Pixel.parse(s.rows, Sprites.PALETTE);
    if (size(name)) assert.deepEqual([p.w, p.h], size(name), name);
  }
  for (const req of ['colonel_down_0', 'colonel_side_1', 'colonel_attack_up', 'colonel_dash', 'pip', 'mite_0', 'orb', 'bolt', 'tile_wall_front', 'tile_door'])
    assert.ok(Sprites.SET[req], req);
});
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement `pixel.js` and author `sprites.js`.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `git commit -m "CK: palette-indexed pixel sprites"` (add both files and the test)

---

### Task 4: Training Room data and collision (`CK.Rooms`)

**Files:**
- Create: `js/ck/rooms.js`
- Test: `tests/ck/rooms.test.js`

**Interfaces:**
- Produces:
  - `CK.Rooms.TILE = 16`
  - `CK.Rooms.parse(rows: string[]) → room` where `room = { cols, rows, w, h, tiles: string[][], solid(tx, ty) → bool, player: {x, y}, spawns: [{ kind, x, y }] }`.
    Legend:
    - `#` wall (solid), `.` floor, `,` alt floor, `D` door (solid in the slice)
    - `P` player start (floor), `m` Glitch Mite spawn (floor), `o` light post (solid pillar that
      casts light)
    - Out-of-range tiles are solid.
    - Spawn and player coordinates are tile centres in pixels.
  - `CK.Rooms.TRAINING`: 30 columns × 17 rows. Border of `#` with one `D` in the top wall. A few
    `o` pillars to dodge around. `P` near the bottom centre. Three `m` spread in the upper half.
  - `CK.Rooms.moveCircle(room, x, y, r, dx, dy) → { x, y, hitX, hitY }`: axis-separated circle vs
    solid tiles, internally sub-stepped so no single sub-move exceeds `r`.

- [ ] **Step 1: Write failing tests**

```js
const R = CK.Rooms; const room = R.parse(R.TRAINING);
test('training room shape', () => {
  assert.deepEqual([room.cols, room.rows, room.w, room.h], [30, 17, 480, 272]);
  assert.equal(room.spawns.filter((s) => s.kind === 'glitchMite').length, 3);
  assert.ok(room.player.y > room.h / 2);
  for (let x = 0; x < 30; x++) { assert.ok(room.solid(x, 0)); assert.ok(room.solid(x, 16)); }
  assert.ok(room.solid(-1, 5) && room.solid(30, 5));
});
test('moveCircle stops at walls and slides along them', () => {
  const m = R.moveCircle(room, 40, 136, 7, -100, 0);
  assert.equal(m.hitX, true); assert.ok(m.x >= 16 + 7 - 0.01);
  const s = R.moveCircle(room, 40, 136, 7, -100, 20);
  assert.ok(s.y > 136, 'slides vertically while blocked horizontally');
});
test('no tunnelling at max step', () => {
  const m = R.moveCircle(room, 40, 136, 7, -500, 0); // far larger than a tile in one call
  assert.ok(m.x >= 23 - 0.01);
});
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `git commit -m "CK: room parser, collision and the Training Room"`

---

### Task 5: Action sim — movement, dash, enemies, `kill`, outcome (`CK.Action`)

**Files:**
- Create: `js/ck/action.js`
- Test: `tests/ck/action.test.js`

**Interfaces:**
- Consumes: `CK.Rooms.parse`, `CK.Rooms.moveCircle`, `CK.rng(seed)`, `CK.World.CREATURES.glitchMite`
  (`hp: 30`, `cloaked: true`, `weak: 'ls'`).
- Produces:
  - `CK.Action.TUNING`:
    ```
    { MOVE: 110, PLAYER_R: 7, IFRAMES_HURT: 0.6,
      DASH_DIST: 70, DASH_TIME: 0.15, DASH_CD: 0.35,
      KILL_DMG: 12, KILL_TIME: 0.22, KILL_CHAIN: 0.4, KILL_RANGE: 22, KILL_LUNGE: 10, KILL_COOL_HEAT: 8,
      PARRY: 0.18, PARRY_KID: 0.30, PARRY_RECOVER: 0.35, STUN: 1.2, REFLECT_MUL: 2,
      ECHO_SPEED: 260, ECHO_DMG: 10, ECHO_CD: 0.35, ECHO_HEAT: 9, OVERHEAT_LOCK: 1.5, HEAT_DECAY: 25,
      LS_CD: 3, LS_HEAT: 15, LS_REVEAL: 4,
      MITE: { r: 6, speed: 45, shootEvery: 2.4, orbSpeed: 80, orbDmg: 8, contactDmg: 6,
              lungeEvery: 3.5, lungeTell: 0.4, lungeSpeed: 160, lungeTime: 0.3, lungeDmg: 10 },
      KID_SPEED: 0.8, KID_STABILITY: 130, AIM_CONE_DEG: 60 }
    ```
  - `CK.Action.create({ room, kid, seed, tools: ['echo', 'ls'] }) → sim`. Enemies come from
    `room.spawns`.
  - `sim.step(dt, input)` with
    `input = { mx, my, ax, ay, kill, trap, dash, tool }`:
    - `mx, my`: movement in −1..1 (normalised if longer than 1)
    - `ax, ay`: aim unit vector, or `0, 0` to use the facing direction
    - `kill`, `trap`, `dash`: booleans, true **only on the step they were pressed**
    - `tool`: `'echo' | 'ls' | null`, also press-only
  - `sim.player`: `{ x, y, face: {x, y}, stability, maxStability, dashT, dashCd, iframes, attackT, combo, chainT, parryT, recoverT, heat, overheatUntil, hitsTaken }`
  - `sim.enemies[]`: `{ id, kind, x, y, r, hp, maxHp, cloaked, revealedUntil, stunUntil, state: 'drift'|'tell'|'lunge', dead }`
  - `sim.orbs[]`: `{ x, y, vx, vy, r: 3, dmg, unparryable, from: 'enemy'|'player' }`
  - `sim.bolts[]`: the player's echo bolts
  - `sim.events`: an array the scene drains each frame. Each is `{ type, x, y }` with `type` in
    `swing hit kill hurt dash parry parry-miss reflect echo reveal overheat clear lose`.
  - `sim.time`, `sim.outcome` (`null | 'win' | 'lose'`), `sim.clean` (true if `win` with
    `hitsTaken === 0`), `sim.cooldowns: { echo, ls }`
  - Testing helper: `sim.spawnOrb({ x, y, vx, vy, dmg, unparryable })`

  Rules:
  - Dash moves `DASH_DIST` along the move direction (or facing) over `DASH_TIME`. The player is
    invulnerable for the whole dash.
  - `kill` hits every hittable enemy whose centre is within `KILL_RANGE + e.r` of the player and
    within 70° of the swing direction (aim, or facing). Damage is `KILL_DMG` for hits 1–2 and ×1.5
    for hit 3. Pressing again within `KILL_CHAIN` advances the combo (1→2→3→1), and each swing
    lunges `KILL_LUNGE`. Each landed hit lowers heat by `KILL_COOL_HEAT`.
  - Cloaked enemies can't be hit unless `time < revealedUntil`.
  - Enemy contact or orb damage is skipped while `dashT > 0` or `iframes > 0`. Otherwise it costs
    stability and sets `iframes = IFRAMES_HURT`.
  - Kid mode: enemy and orb speeds × `KID_SPEED`, stability `KID_STABILITY`.

- [ ] **Step 1: Write failing tests** (helper: `const run = (s, secs, inp) => { for (let i = 0; i < secs * 60; i++) s.step(1/60, Object.assign({ mx:0, my:0, ax:0, ay:0, kill:false, trap:false, dash:false, tool:null }, inp)); }`; `freeze(sim)` sets every enemy's `speed = 0`, `shootEvery = 999`, `lungeEvery = 999`)

```js
test('create', () => {
  const s = mk();  // Action.create({ room: Rooms.parse(Rooms.TRAINING), kid: false, seed: 1, tools: ['echo','ls'] })
  assert.equal(s.enemies.length, 3); assert.equal(s.player.stability, 100);
  s.enemies.forEach((e) => { assert.equal(e.hp, 30); assert.equal(e.cloaked, true); });
  assert.equal(mk({ kid: true }).player.stability, 130);
});
test('moves at MOVE px/s and is stopped by walls', () => { /* run 0.5 s with mx:1 → x increased by 55±1; run 10 s with mx:-1 → x ≥ 16+7 */ });
test('dash covers DASH_DIST in DASH_TIME and respects cooldown', () => { /* press dash with mx:1, run 0.15 s → Δx 70±2; dash again at once → no movement beyond walk */ });
test('dash i-frames ignore orbs', () => { /* freeze; spawnOrb aimed at player arriving mid-dash → stability 100 */ });
test('hurt gives i-frames', () => { /* orb hit → stability 92, second orb within 0.6 s → still 92 */ });
test('kill cannot hit cloaked; ls reveals; combo 12/12/18', () => {
  /* freeze; teleport e0 next to player; kill → hp 30 (cloaked);
     tool:'ls' → e0.revealedUntil > time, 'reveal' event;
     kill, kill, kill within chain window → hp 30-12-12-18 < 0 → dead, 'kill' event */
});
test('room clear sets outcome win and clean', () => { /* reveal + kill all three → outcome 'win', clean true */ });
test('losing all stability → lose', () => { /* repeatedly spawnOrb dmg 50 with iframes forced to 0 → outcome 'lose' */ });
test('kid mode slows orbs', () => { /* spawned enemy orb speed is 80 * 0.8 */ });
test('deterministic with the same seed', () => { /* two sims, same inputs 5 s → identical JSON of enemies */ });
```

The test bodies follow the comment in each block: one assertion per stated value.

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Mite AI: drift with gentle wander (seeded), bounce off walls via
  `moveCircle`, shoot an orb at the player every `shootEvery` (seeded jitter ±30%). Every
  `lungeEvery` it enters `tell` for `lungeTell` (scene shows the warning), then `lunge` toward the
  player's position at tell start for `lungeTime`. Contact during `lunge` does `lungeDmg`,
  otherwise `contactDmg`.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `git commit -m "CK: action sim — movement, dash, kill combo, Glitch Mites"`

---

### Task 6: Action sim — `trap` parry, `echo`, unparryable, aim-assist

**Files:**
- Modify: `js/ck/action.js`
- Test: `tests/ck/action.test.js` (append)

**Interfaces:**
- Consumes: Task 5's `sim`, `TUNING`, `spawnOrb`.
- Produces (rules):
  - **`trap`** opens `parryT = PARRY` (kid `PARRY_KID`).
    - An enemy orb touching the player while `parryT > 0` and not `unparryable` is reflected:
      velocity reversed toward its source enemy (or straight back), `from: 'player'`,
      `dmg × REFLECT_MUL`. Event `parry`.
    - A lunging enemy touching the player while `parryT > 0` is set `stunUntil = time + STUN`,
      takes no lunge damage, and is hittable even if cloaked during the stun. Event `parry`.
    - If the window ends with nothing caught, `recoverT = PARRY_RECOVER` (event `parry-miss`).
      During `recoverT` the player can't dash, swing or parry.
  - **`unparryable` orbs** ignore the parry and hurt normally (only a dash avoids them). The
    first time one hits, emit event `sigkill`. The scene shows Pip's line.
  - **`echo`**: needs `'echo'` in `tools`, `cooldowns.echo <= 0` and `time >= overheatUntil`.
    - Fires a bolt (`ECHO_SPEED`, `ECHO_DMG`) along the aim.
    - Heat `+ECHO_HEAT`. At ≥ 100: `overheatUntil = time + OVERHEAT_LOCK`, event `overheat`.
    - Heat decays `HEAT_DECAY`/s. Bolts pass through cloaked, unrevealed enemies.
  - **`ls`**: `LS_CD` cooldown, `+LS_HEAT`, `revealedUntil = time + LS_REVEAL` on all enemies,
    event `reveal`.
  - **Aim-assist** (only when `ax = ay = 0`): echo aims at the nearest hittable enemy within
    `AIM_CONE_DEG / 2` of facing, otherwise straight along facing.

- [ ] **Step 1: Write failing tests**

```js
test('parry reflects an orb at double damage', () => { /* freeze, reveal; spawnOrb from e0 toward player; trap 0.05 s before contact → stability 100, orb.from 'player', orb.dmg 16, 'parry' event; run until it reaches e0 → e0.hp 14 */ });
test('parry window is 0.18 s (0.30 kid)', () => { /* trap, orb arrives 0.2 s later → hurt (adult); same in kid → parried */ });
test('missed parry recovery blocks dash', () => { /* trap with nothing incoming, run 0.2 s → recoverT > 0, 'parry-miss'; dash pressed → no Δx beyond walking */ });
test('parrying a lunge stuns', () => { /* force e0 state 'lunge' into the player with trap open → e0.stunUntil ≈ time+1.2, stability 100 */ });
test('unparryable orb ignores trap; dash avoids it', () => { /* unparryable orb + trap → stability 92 and 'sigkill' event; same orb during dash → 100 */ });
test('parry during dash invulnerability', () => { /* dash then trap in the same window, normal orb arrives → stability 100, exactly one of: reflected or ignored, never both; no 'hurt' */ });
test('echo heat and overheat lock', () => { /* one echo → heat 9 then decays 25/s; set player.heat = 95, echo → 'overheat', overheatUntil = time+1.5; echo again during lock (cooldown elapsed) adds no bolt; after 1.5 s echo works again */ });
test('bolts pass through cloaked enemies', () => { /* echo at unrevealed e0 → hp 30 */ });
test('aim-assist picks the enemy inside the cone', () => { /* face right; one revealed enemy 25° above facing, one 50° → bolt heads to the 25° one */ });
test('tools not in loadout are refused', () => { /* tools: ['ls'] → tool:'echo' adds no bolt */ });
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS** — the whole of `tests/ck/*.test.js` (old 76 plus new) passes.
- [ ] **Step 5: Commit** — `git commit -m "CK: trap parry, echo heat, SIGKILL orbs, aim-assist"`

---

### Task 7: Input (`CK.Input`) and touch controls

**Files:**
- Create: `js/ck/input.js`
- Modify: `css/ck.css` (append a `/* action slice */` block)
- Test: `tests/ck/input.test.js`

**Interfaces:**
- Produces:
  - `CK.Input.stickVector(dx, dy, radius, dead = 0.15) → { x, y }`: clamped to length 1, zero
    inside the dead zone, rescaled so the edge of the dead zone maps to 0.
  - `CK.Input.mapKey(key) → 'up'|'down'|'left'|'right'|'kill'|'trap'|'dash'|'echo'|'ls'|null`:
    - WASD / arrows → directions
    - J → kill, K → trap, Space or Shift → dash
    - 1 → echo, 2 → ls
  - `CK.Input.create({ canvas, host, toBuffer, touch }) → input` (browser only):
    - `input.read() → { mx, my, mouse: {x, y} | null, kill, trap, dash, tool }`. Press flags are
      returned once and then cleared.
    - `input.held`, `input.destroy()`, `input.showTouch(bool)`
    - Mouse: left button → kill, right button → trap (`contextmenu` prevented). `mouse` is in
      buffer coordinates.
    - Touch UI goes into `host`:
      - `.ck-stick`: appears where a finger lands in the left 45% of the screen; radius 40 CSS px.
      - `.ck-btn[data-act=kill|trap|dash|echo|ls]`: kill 72 px, trap and dash 56 px, tools 44 px.
      - The pad sits inside `env(safe-area-inset-*)`.
    - Each pointer is tracked by `pointerId`, so the stick and buttons work at the same time.
    - `blur`, `pointercancel` and `visibilitychange` clear all held state.
  - CSS:
    - the game canvas `image-rendering: pixelated`
    - `.ck-touchpad` with `touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;`
    - `.ck-rotate` overlay, shown by `@media (orientation: portrait) and (pointer: coarse)` inside
      `.ck-slice`

- [ ] **Step 1: Write failing tests**

```js
test('stickVector dead zone, clamp, rescale', () => {
  assert.deepEqual(Input.stickVector(3, 0, 40), { x: 0, y: 0 });
  assert.deepEqual(Input.stickVector(80, 0, 40), { x: 1, y: 0 });
  const v = Input.stickVector(0, 23, 40); // 0.575 → (0.575-0.15)/0.85 = 0.5
  assert.ok(Math.abs(v.y - 0.5) < 1e-9 && v.x === 0);
});
test('mapKey', () => {
  assert.equal(Input.mapKey('w'), 'up'); assert.equal(Input.mapKey('ArrowLeft'), 'left');
  assert.equal(Input.mapKey(' '), 'dash'); assert.equal(Input.mapKey('Shift'), 'dash');
  assert.equal(Input.mapKey('j'), 'kill'); assert.equal(Input.mapKey('K'), 'trap');
  assert.equal(Input.mapKey('1'), 'echo'); assert.equal(Input.mapKey('2'), 'ls'); assert.equal(Input.mapKey('x'), null);
});
```
The browser behaviour (`blur clears held movement`, multi-touch) is tested in Task 9's e2e.

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `git commit -m "CK: keyboard, mouse and touch input with on-screen stick"`

---

### Task 8: Room scene (`CK.RoomScene`)

**Files:**
- Create: `js/ck/roomscene.js`

**Interfaces:**
- Consumes: `CK.PixEngine` (`engine.view`, `engine.reducedMotion`, `PixEngine.camera`),
  `CK.Sprites.built()`, `CK.Pixel.draw`, `CK.Action` sim, `CK.Input.read()`, `CK.Rooms.TILE`.
- Produces: `CK.RoomScene.create({ engine, input, sim, room, accent, onEvent }) → scene` with
  `update(dt)`, `draw(bctx, t, view)` and `scene.cam`. On each step it converts
  `input.read()` into a sim input:
  - aim = normalised (mouse + cam − player) when the mouse moved in the last 2 s, else `0, 0`
  - `tool` passed through
  
  It calls `sim.step`, then drains `sim.events` into `onEvent(ev)` and its own effects.

  Drawing, back to front:
  1. Margin fog (navy noise, static with reduced motion).
  2. Floor tiles (alternating `tile_floor` / `tile_floor_alt` by a tile hash).
  3. Wall front faces.
  4. Floor light pools: radial gradients pre-rendered once per colour, drawn with `'lighter'` —
     cyan under the Colonel's core, mint/amber at `o` pillars, magenta under orbs.
  5. Oval shadows (bg0 at 45% alpha).
  6. Entities sorted by `y`:
     - **Colonel:** walk frames at 8 fps while moving, attack frame for `attackT`, dash frame
       plus 3 fading afterimages, white `flash` for 0.08 s after `hurt`, blink at 15 Hz while
       `iframes > 0`.
     - **Pip:** follows at offset (−14, −18) with 0.15 s lag, bobbing (still with reduced motion).
     - **Mites:** 2-frame wiggle. Cloaked: 25% alpha with a shimmer offset. `tell`: coral `!`
       pixel mark above and a red outline.
     - **Orbs:** coral, with a white "9" pixel ring when `unparryable`. **Bolts:** cyan.
  7. Wall top faces drawn over entities (depth).
  8. Effects:
     - parry: expanding cyan ring + 3 frames of white
     - swing: arc of 3 frames
     - hit sparks: 6 particles
     - number pops: tiny 3×5 pixel digits, the only "text" allowed in-canvas, purely decorative;
       the HUD repeats the important information
  9. Hit-stop: on `hit`, `parry` or `kill`, skip `sim.step` for 50 ms.
  10. Screen shake (2 px, 0.12 s) on `hurt` and `kill`, unless reduced motion.

- [ ] **Step 1: No unit test** (drawing). Coverage comes from Task 9's e2e (renders, colours,
  no page errors, movement).
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Commit** — `git commit -m "CK: pixel room scene with light, depth and hit feedback"`

---

### Task 9: Slice entry, HUD, hub button, harness and e2e

**Files:**
- Create: `js/ck/slice.js`, `tests/e2e/ck-slice-harness.html`, `tests/e2e/ck-slice.e2e.js`
- Modify:
  - `js/game.js`: hub card gets a second button `<button class="ghost" data-go="slice">🧪 Try the new action room</button>`; `go('slice')` → `openSlice()`, which mirrors `openKernel()`
  - `index.html`: add the new scripts after `js/ck/ui.js`, before `js/ck/main.js`, in this
    order: `pixengine, pixel, sprites, rooms, action, input, roomscene, slice`
  - `sw.js`: add the eight files to `FILES`; `VERSION = 'lilnux-v7'`
  - `css/ck.css`: slice HUD styles

**Interfaces:**
- Consumes: everything above. Hub handles: `{ root, player, sound, soundOn, onExit }` (same
  shape as `CK.open`).
- Produces:
  - `CK.openSlice(h)` and `CK.closeSlice()`. Opening calls `CK.close()` first.
  - It builds a `.ck-slice` host with:
    - the canvas
    - an HTML HUD: a stability bar of 10 segments with an `aria-label`, a heat bar, and tool
      buttons showing cooldown as CSS conic fill
    - a Pip line area (text)
    - ✕ Exit and ↻ Reset room buttons
    - the controls hint: one dismissible line, keyboard or touch version
    - the `.ck-rotate` overlay, "Turn your phone sideways to play"
  - It does not read or write `player.ck` or any save. Kid mode comes from `player.kid`.
  - Event → sound and Pip lines:
    - `hit`/`kill` → `good`; `hurt`/`lose` → `bad`; `parry`/`dash`/`reveal` → `pop`; `clear` → `win`
    - first `parry`: "Pip: Caught it! `trap` grabs a signal and runs your handler instead. Smug looks good on you."
    - first `sigkill`: "Pip: That one was SIGKILL — `trap` can’t catch signal 9 (or SIGSTOP). Nobody can. Dodge it."
      Not reachable in the slice except from the debug hook, but wired up for the bosses.
    - `clear`: "Room clear!" plus "No hits — that’s a clean fix." when `sim.clean`.
    - `lose`: "Stability lost — rebooting the room. You’ve got this."
  - Debug (`?ckdebug`): `CK._test.slice = { engine, input, sim(), scene, reset() }`.

- [ ] **Step 1: Write the e2e suite** (`ck-slice.e2e.js`, same runner style as `ck-engine.e2e.js`; the harness page calls `CK.openSlice({ root: document.body, player: { name: 'tester', kid: false }, sound: {}, soundOn: () => false, onExit: () => (H.exited = true) })`)

| Test | Setup → assertion |
|---|---|
| `renders at 1920x1080` | viewport 1920×1080 → `engine.view` is `{k:4, w:480, h:270}`; > 3 distinct colours sampled; no page errors; screenshot `ck-slice-desktop.png` |
| `keyboard moves and dashes` | hold `d` 500 ms → `player.x` +≥ 40; press Space → +≥ 50 within 300 ms |
| `blur clears held movement` | keydown `d`, dispatch `window` `blur`, wait 300 ms → x unchanged over the next 300 ms |
| `iPhone landscape shows touch pad, not rotate` | `devices['iPhone 13 landscape']` → `.ck-touchpad` visible; every `.ck-btn` box ≥ 44×44; `.ck-rotate` hidden; screenshot `ck-slice-phone.png` |
| `iPhone portrait shows rotate overlay` | `devices['iPhone 13']` → `.ck-rotate` visible |
| `multi-touch stick + kill` | synthetic `PointerEvent`s (pointerType `touch`): id 1 down at left-third and moved +40 px right, id 2 down on `[data-act=kill]` → next `sim.step` sees `mx > 0.5` and a swing event; lift id 2 → `mx` still > 0.5 |
| `rotate mid-fight` | start landscape, `setViewportSize` to portrait and back → `engine.view.k` recomputed; `toBuffer` of the canvas centre is within 1 px of `(view.w/2, view.h/2)`; no page errors |
| `hub opens and exits the slice` | load `index.html`, create a player, go to hub, click `[data-go=slice]` → `.ck-slice` exists; click ✕ → hub visible, `.ck-slice` gone, `CK._test.loops === 0` |

- [ ] **Step 2: Run, expect FAIL** — `node tests/e2e/ck-slice.e2e.js` (no `CK.openSlice`).
- [ ] **Step 3: Implement** `slice.js`, the harness, and the hub / index / sw changes.
- [ ] **Step 4: Run, expect PASS.** Then re-run `lilnux-regression.e2e.js` and `ck-chapter.e2e.js`:
  both must still `PASS`, because the old Adventure and Learn mode are untouched.
- [ ] **Step 5: Commit** — `git commit -m "CK: playable action slice behind a hub button (lilnux-v7)"`

---

### Task 10: Playtest zip

**Files:** none in the repo.

- [ ] **Step 1: Full test run** — `node --test tests/ck/*.test.js` and then each e2e suite, one at a time. All must pass.
- [ ] **Step 2: Look at the screenshots** (`ck-slice-desktop.png`, `ck-slice-phone.png`) and
  check by eye:
  - the Colonel is recognisable (cap, visor, core)
  - walls read as 3/4 with depth
  - glow is present but text-free
  
  Fix sprite or scene issues and re-run Task 9's suite before going on.
- [ ] **Step 3: Build the zip** from the repo's shipped files into `C:\ClaudeBro\LilNux-action-slice.zip`:

```powershell
$files = 'index.html','manifest.webmanifest','sw.js','README.md','play.sh','install-shortcut.sh','css','js','assets'
Compress-Archive -Path $files -DestinationPath C:\ClaudeBro\LilNux-action-slice.zip -Force
```
- [ ] **Step 4: Tell the user how to playtest.**
  - **PC:** unzip, open `index.html`, pick a player, 🎮 Adventure hub → "🧪 Try the new action
    room".
  - **iPhone:** needs a hosted copy (the zip can't be opened directly on iPhone). Offer to push
    the branch so they can try it via GitHub Pages or a preview. Pushing needs their OK.
  - Ask what to tune: move speed, dash, parry window, how hard the mites are.
