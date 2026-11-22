# Colonel Kernel — Chapter 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable first chapter of the Colonel Kernel mode inside LilNux: the engine, Pip, regions 1–2 (Firmware Foundry, GRUB Gate), quick fixes, skillshot fights, circuit puzzles, hardware modules and upgrades, saving, touch support and the Neon Circuit look.

**Architecture:** Pure game logic (state, world data, rules, puzzle, combat simulation) lives in small browser scripts under `js/ck/` that also load in Node, so it is unit-tested with `node --test`. A hand-built canvas engine draws the map, fog, characters, fights and puzzles; HTML overlays (`js/ck/ui.js`, `css/ck.css`) carry Pip's panel, dialogue, skill bar and menus. `js/ck/main.js` wires it into the existing app (`js/game.js`) and its family players, XP and badges.

**Tech Stack:** Plain HTML/CSS/JS, `<canvas>` 2D, WebAudio, `speechSynthesis`; tests with Node 22 `node --test` and the pre-installed Playwright (`require('playwright')`, `chromium.launch()`).

**Spec:** `docs/superpowers/specs/2026-11-22-colonel-kernel-design.md`

## Global Constraints

- Plain HTML/CSS/JS, **no build step, no dependencies**, classic `<script>` tags (as today).
- Must work offline: add new files to `sw.js`'s cache list and bump its `VERSION` (to `lilnux-v2`).
- Works on GitHub Pages and straight from disk (`file://`); no `fetch` of local files, no ES modules.
- Input: mouse + keyboard (number keys `1–5` for skills) **and** touch. Tap targets ≥ 44px.
- Shares players/XP/ranks/badges via the existing save (`localStorage` key `lilnux.save.v1`); CK state lives at `player.ck`.
- Respect `prefers-reduced-motion` and the existing sound toggle (`S.sound`); "Read to me" via `speechSynthesis`.
- Canvas sized to device pixel ratio **capped at 2**; pause when the tab is hidden.
- Text contrast ≥ 4.5:1 on panels; weaknesses shown with icon + text, never colour alone.
- Tone for teens/adults: witty, real terms explained in one line, never babyish. Real-Linux facts must be accurate.
- Kid mode (`player.kid`): creatures ~20% slower, hitboxes ×1.15, one free hint per fight. No heavy aim assist.
- No daily rewards, streaks, timers that nag, or purchases.
- Every `js/ck/*.js` file starts with `(function (root) { … })(typeof window !== 'undefined' ? window : globalThis);` and attaches to `root.CK`, so it loads in both the browser and Node tests.
- Existing LilNux mode must keep working: `node tests/e2e/lilnux-regression.e2e.js` passes after every task that touches shared files.

## Review Focus

1. Rotating a phone or resizing the window mid-fight — canvas resizes and taps still land where the finger is (Task 6 test `resize keeps aim mapping`).
2. Leaving the mode (Exit, switching player) mid-fight or mid-puzzle, then re-entering — no doubled game loop, no stale state, last checkpoint restored (Task 9 test `reenter after exit mid-fight`).
3. An old save with no `player.ck`, or a corrupt one (wrong types, unknown node id) — starts fresh or repairs, never crashes (Task 1 tests `load repairs corrupt state`).
4. Tab hidden or phone locked during a fight — the fight pauses; on return there is no giant time jump (Task 5 test `update clamps dt`; Task 6 test `loop pauses when hidden`).
5. Storage blocked (private window) — the chapter still plays; it just doesn't persist (Task 9 test `plays with storage blocked`).

---

### Task 1: Test harness, shared helpers and CK save state

**Files:**
- Create: `js/ck/state.js`
- Create: `tests/ck/state.test.js`
- Create: `tests/e2e/lilnux-regression.e2e.js` (port of the existing full playthrough: creates a player, plays all 8 worlds with correct answers, asserts each result screen and zero page errors)

**Interfaces:**
- Produces: `CK.rng(seed: number) -> () => number` (mulberry32, values in [0,1)).
- Produces: `CK.State.fresh() -> CKState` with exactly:
  `{ v: 1, region: 'firmware', node: 'f0', prev: null, explored: { firmware: ['f0'] }, cleared: {}, learned: [], equipped: [], upgrades: [], modules: [], bits: 0, memories: [], tasksDone: [], codex: [], checkpoint: { region: 'firmware', node: 'f0' }, stats: { clean: 0, fights: 0, wins: 0 }, chapterDone: false, seenIntro: false }`
- Produces: `CK.State.load(raw: any) -> CKState` — returns `fresh()` for missing/non-object input; otherwise copies known keys with correct types, drops unknown ones, and resets `region/node` to the checkpoint when the node id is not a string.
- Produces: `CK.State.clone(state) -> CKState` (deep copy via JSON).

- [ ] **Step 1: Write the failing tests** in `tests/ck/state.test.js` (`node:test` + `node:assert/strict`, `require('../../js/ck/state.js')`, read `globalThis.CK`):
  - `fresh has expected shape` — deepEqual to the object above.
  - `load(undefined)` and `load('junk')` deepEqual `fresh()`.
  - `load repairs corrupt state` — `load({ v: 1, bits: 'lots', learned: 'echo', node: 7, region: 'firmware', checkpoint: { region: 'firmware', node: 'f3' }, evil: 1 })` gives `bits === 0`, `learned` deepEqual `[]`, `node === 'f3'`, no `evil` key.
  - `rng is deterministic` — two `CK.rng(42)` sequences of 5 are equal; all values in [0,1).
- [ ] **Step 2: Run** `node --test tests/ck/` — Expected: FAIL (`Cannot find module` / `CK is undefined`).
- [ ] **Step 3: Implement** `js/ck/state.js` per the Interfaces block.
- [ ] **Step 4: Run** `node --test tests/ck/` — Expected: all PASS.
- [ ] **Step 5: Write and run the regression e2e** `node tests/e2e/lilnux-regression.e2e.js` — Expected: prints `done <world> … stars 3` for all 8 worlds and `ERRORS []`.
- [ ] **Step 6: Commit** `git add js/ck/state.js tests/ && git commit -m "Add CK save state, rng and test harness"`

---

### Task 2: World data for regions 1–2

**Files:**
- Create: `js/ck/world.js`
- Create: `tests/ck/world.test.js`

**Interfaces:**
- Produces: `CK.World.SKILLS` — keys `echo`, `ls`, `cd`. Each: `{ id, cmd, name, icon, teacher, learnTest: RegExp, blurb, real, fight: {...}, upgrade: { id, cmd, cost, needs?, blurb } }`.
  - `echo`: teacher `pip`, `learnTest /^echo\s+\S/`, fight `{ type: 'bolt', dmg: 10, cd: 0.35, heat: 9 }`, upgrade `{ id: 'echo-n', cmd: 'echo -n', cost: 30, blurb: 'no trailing newline: bolts fire 25% faster' }`.
  - `ls`: teacher `bios`, `learnTest /^ls(\s|$)/`, fight `{ type: 'scan', reveal: 4, cd: 3, heat: 15 }`, upgrade `{ id: 'ls-a', cmd: 'ls -a', cost: 40, blurb: 'shows hidden entries: reveals hidden caches on the map, scan lasts 7s' }`.
  - `cd`: teacher `grub`, `learnTest /^cd(\s|$)/`, fight `{ type: 'dash', cd: 1.2, heat: 6 }`, upgrade `{ id: 'cd-dash', cmd: 'cd -', cost: 50, needs: 'cpu', blurb: 'jump back to where you were: double dash' }`.
- Produces: `CK.World.MODULES` — `ram { slots: +1 }`, `fan { heatMul: 0.7 }`, `cpu { cdMul: 0.85 }`, `ssd { travelMul: 0.5 }`; each with `name`, `icon`, `real` (one-line real-world lesson from spec §6.5).
- Produces: `CK.World.CREATURES` — `glitchMite { hp: 30, speed: 90, pattern: 'drift', cloaked: true, shoots: { every: 2.4, speed: 160, dmg: 8 }, count: 3, weak: 'ls' }`, `loopWisp { hp: 40, speed: 150, pattern: 'blink', cloaked: false, shoots: { every: 1.8, speed: 210, dmg: 10 }, count: 2, weak: 'cd' }`, `bootGlitch { boss: true, hp: 220, phases: 2, pattern: 'sweep', cloaked: true, shoots: { every: 1.4, speed: 200, dmg: 10 }, weak: 'ls' }`, `kernelWraith { boss: true, hp: 300, phases: 3, pattern: 'blink', cloaked: true, shoots: { every: 1.2, speed: 230, dmg: 12 }, weak: 'cd' }`. Each with `name`, `weakText`, `real` (what the problem is in real Linux).
- Produces: `CK.World.CHARACTERS` — `pip`, `bios`, `grub` with `name`, `title`, `color`, `lines` (arrays of dialogue strings).
- Produces: `CK.World.TASKS` — side jobs: `bios-check { giver: 'bios', text: 'Run POST on every part: clear all problems in the Foundry', goal: { type: 'clearKind', region: 'firmware', kind: 'problem' }, bits: 25 }`, `grub-memories { giver: 'grub', text: 'Recover all 5 boot memories at the Gate', goal: { type: 'memories', region: 'grub', count: 5 }, bits: 25 }`, `pip-clean { giver: 'pip', text: 'Win 3 clean fixes (no fight)', goal: { type: 'clean', count: 3 }, bits: 30 }`.
- Produces: `CK.World.REGIONS` — `[firmware, grub]`, each `{ id, name, accent, intro: string[], outro: string[], start, boss, exit, nodes: { [id]: { x, y, label, kind, ref? } }, edges: [[a,b]] }`.
  - `kind` ∈ `start | empty | character | problem | item | memory | circuit | boss | exit`; `ref` points to a character id, a problem `{ skill, creature, title, real }`, a module id, a memory line, or a puzzle `{ grid }`.
  - Firmware Foundry: accent `#ffb347`, node ids `f0…f11`, characters Pip (at `f0`, teaches echo) and Bios (teaches ls), 2 problems (skill `ls` → creature `glitchMite`), 1 circuit puzzle, module `ram` and `fan` (fan is the boss drop), 5 memory lines, boss `bootGlitch`, exit to `grub`.
  - GRUB Gate: accent `#b6ff5c`, node ids `g0…g12`, character Grub (teaches cd), 2 problems (skill `cd` → `loopWisp`), 2 circuit puzzles, modules `cpu` and `ssd` (ssd is the boss drop), 5 memory lines, boss `kernelWraith`, exit ends the chapter.
  - Memory lines are real `dmesg`-style lines, e.g. `[    0.000000] Linux version 6.19.8-200.fc44.x86_64`, `[    0.000000] Command line: BOOT_IMAGE=(hd0,gpt2)/vmlinuz-6.19.8-200.fc44.x86_64 root=UUID=… ro rhgb quiet`, `[    0.412345] Memory: 15981232K/16642560K available`.
  - Each region has 2 **hidden cache** nodes (`hidden: true`, kind `item` holding bits or `memory`) that only appear after `ls -a` is used on the map nearby.
  - Puzzle grids are stored **solved**: `{ rows, cols, cells: [[{ t, r }]] }`, `t` ∈ `empty | straight | corner | tee | cross | source | target`.
  - All dialogue follows the Global tone rule; Pip's first lines explain PID 1; Bios explains POST/firmware; Grub explains choosing a kernel to boot.

- [ ] **Step 1: Write the failing tests** in `tests/ck/world.test.js`:
  - `every edge joins existing nodes`; `every node reachable from start` (BFS).
  - `every problem skill is taught earlier on the path` — the teacher's node for `problem.ref.skill` is reachable from start without passing through that problem node (echo counts as taught at `f0`).
  - `boss reachable and exit beyond boss` — every path from start to `exit` passes through `boss`.
  - `every creature, module, character ref exists`; `each region has 5 memory nodes`.
  - `memory lines look like dmesg` — each matches `/^\[\s*\d+\.\d{6}\] /`.
- [ ] **Step 2: Run** `node --test tests/ck/` — Expected: FAIL.
- [ ] **Step 3: Write** `js/ck/world.js` with the data above (layout coordinates in a 1600×1000 world space; regions read left→right toward the boss).
- [ ] **Step 4: Run** `node --test tests/ck/` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Add Colonel Kernel world data for regions 1-2"`

---

### Task 3: Game rules

**Files:**
- Create: `js/ck/rules.js`
- Create: `tests/ck/rules.test.js`

**Interfaces:**
- Consumes: `CK.State`, `CK.World` (Tasks 1–2).
- Produces (all on `CK.Rules`, all pure except they mutate the passed `state`):
  - `stats(state) -> { slots, cdMul, heatMul, travelMul, sight }` — base `slots 2, cdMul 1, heatMul 1, travelMul 1, sight 1`; modules apply multiplicatively/additively per `MODULES`.
  - `region(id) -> Region`; `neighbors(region, nodeId) -> string[]`.
  - `reveal(state, nodeId, radius = stats(state).sight) -> string[]` — adds nodes within `radius` graph hops to `state.explored[state.region]`; returns newly added ids.
  - `canMove(state, to) -> { ok: boolean, reason?: 'not-adjacent' | 'fog' | 'blocked' }` — `blocked` when the current node is an uncleared problem/circuit/boss and `to !== state.prev`.
  - `move(state, to) -> { ok, reason?, arrived?: Node }` — on success sets `prev`, `node`, reveals, and sets `checkpoint` when the node is `start`, `character` or a cleared node.
  - `isCleared(state, nodeId) -> boolean`; `clear(state, nodeId)`.
  - `learn(state, skillId)` — adds to `learned` and `codex`; auto-equips if a slot is free.
  - `equip(state, skillId) -> boolean`; `unequip(state, skillId) -> boolean` — only learned skills, at most `stats().slots`.
  - `quickFix(state, nodeId, skillId) -> 'fixed' | 'fight'` — `'fixed'` only if `skillId` is equipped and equals the problem's skill; on fixed: `clear`, `stats.clean++`.
  - `installModule(state, moduleId)`; `buyUpgrade(state, upgradeId) -> { ok, reason?: 'bits' | 'needs' | 'owned' | 'unknown' }`.
  - `reward(state, kind) -> { bits, xp }` for `clean 15/15`, `fight 10/20`, `boss 50/60`, `memory 0/5`, `region 30/100`, `puzzle 10/10`; adds bits to state.
  - `useOnMap(state, skillId) -> { ok, revealed?: string[], travelTargets?: string[] }` — `ls`: `reveal(state, state.node, stats.sight + 1)`, and with `ls-a` also un-hides `hidden` nodes within 2 hops; `cd`: returns explored, cleared nodes in the current region as `travelTargets`; `echo`: `{ ok: true }` (Pip quips).
  - `fastTravel(state, nodeId) -> boolean` — only to a node in `travelTargets`; sets `node`, `prev = null`.
  - `taskProgress(state, taskId) -> { done: number, need: number, complete: boolean }`; `claimTasks(state) -> taskId[]` — marks newly complete tasks in `tasksDone`, adds their bits.
  - `enterRegion(state, regionId)` — sets region/node/prev/checkpoint to the region's start and reveals.

- [ ] **Step 1: Write the failing tests** — one test per function above with the spec values, plus:
  - `cannot pass an uncleared problem` — move onto a problem node, `canMove` to a forward node → `blocked`; back to `prev` → ok.
  - `fog blocks unexplored moves`; `ram adds a slot` (`slots` 2 → 3); `fan + cpu stack` (`heatMul 0.7`, `cdMul 0.85`).
  - `quickFix needs the right skill equipped` — wrong skill → `'fight'`, learned-but-unequipped → `'fight'`, right → `'fixed'`.
  - `buyUpgrade cd-dash needs cpu`.
  - `ls reveals further and ls -a finds hidden caches`; `cd lists only explored cleared nodes`; `hidden nodes are not visible before ls -a`.
  - `tasks complete and pay once` — clearing both firmware problems completes `bios-check`; `claimTasks` adds 25 bits once.
- [ ] **Step 2: Run** `node --test tests/ck/` — Expected: FAIL.
- [ ] **Step 3: Implement** `js/ck/rules.js`.
- [ ] **Step 4: Run** `node --test tests/ck/` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Add Colonel Kernel game rules"`

---

### Task 4: Circuit puzzle logic

**Files:**
- Create: `js/ck/puzzle.js`
- Create: `tests/ck/puzzle.test.js`

**Interfaces:**
- Produces `CK.Puzzle`:
  - `ports(cell) -> number[]` — directions 0=N,1=E,2=S,3=W after rotation `r`. Base ports: `straight [0,2]`, `corner [0,1]`, `tee [0,1,2]`, `cross [0,1,2,3]`, `source`/`target` `[0]`, `empty []`; rotation adds `r` mod 4.
  - `rotate(grid, row, col) -> grid` — `r = (r+1)%4`; `source`, `target`, `empty` never rotate.
  - `powered(grid) -> Set<string>` of `"row,col"` reachable from the source through matching ports.
  - `isSolved(grid) -> boolean` — target powered.
  - `scramble(grid, rng) -> grid` — random rotation of every rotatable cell; re-rolls until not solved.

- [ ] **Step 1: Write the failing tests:** `ports applies rotation`; `fixed tiles do not rotate`; `solved world grids are solved` (every puzzle in `CK.World.REGIONS` passes `isSolved`); `scramble is unsolved and rotations only` (same `t` per cell, `isSolved` false, rotating each cell back to its original `r` solves it); `powered stops at mismatched edges`.
- [ ] **Step 2: Run** `node --test tests/ck/` — Expected: FAIL.
- [ ] **Step 3: Implement** `js/ck/puzzle.js`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Add circuit puzzle logic"`

---

### Task 5: Fight simulation

**Files:**
- Create: `js/ck/combat.js`
- Create: `tests/ck/combat.test.js`

**Interfaces:**
- Consumes: `CK.World.SKILLS/CREATURES`, `CK.Rules.stats`, `CK.rng`.
- Produces `CK.Fight.create({ creature: string, state: CKState, kid: boolean, seed: number }) -> Fight` with fields
  `W = 1000, H = 600`, `colonel { x: 500, y: 540, r: 26, stability: 100, maxStability: 100 }`, `enemies [{ id, x, y, r, hp, maxHp, cloaked, revealedUntil, phase }]`, `shots []`, `orbs []`, `heat 0`, `overheatedUntil 0`, `cooldowns { [skillId]: number }`, `time 0`, `outcome null | 'win' | 'lose'`, `events []`, `hintAvailable` (true in kid mode).
- `fight.update(dt)` — clamps `dt` to `0.05`; moves enemies by pattern (`drift`, `blink`, `sweep`), fires orbs at the colonel on `shoots.every`, moves shots/orbs, resolves hits, decays heat (`25/s`), sets `outcome`. Kid mode: enemy and orb speeds ×0.8, enemy `r` ×1.15.
- `fight.use(skillId, x, y) -> { ok: boolean, reason?: 'not-equipped' | 'cooldown' | 'overheat' | 'over' }`:
  - `bolt`: spawns a shot from the colonel toward (x,y), speed 700; hits enemies (only if not cloaked or `time < revealedUntil`) and orbs (destroys them).
  - `scan`: sets `revealedUntil = time + reveal` (7 with `ls-a`) for all enemies and deals 5 damage to each.
  - `dash`: moves `colonel.x` to `x` clamped to [40, 960]; with `cd-dash` the next dash within 1.5s is free of cooldown.
  - Applies `cd × stats.cdMul` (×0.75 for bolts with `echo-n`) and `heat × stats.heatMul`; heat ≥ 100 sets `overheatedUntil = time + 1.5`.
- Bosses: at each `phase` threshold (hp splits evenly) they re-cloak and their `shoots.every` drops 20%.
- `events` entries: `{ type: 'hit'|'kill'|'reveal'|'dash'|'hurt'|'overheat'|'phase'|'orbPop', x, y }`, cleared by the caller.

- [ ] **Step 1: Write the failing tests** (use `seed: 1` and drive time with `update(1/60)` loops):
  - `cloaked mites ignore bolts until scanned`; `scan reveals and damages`.
  - `orbs hurt the colonel and can be shot down`.
  - `dash moves along the lane and dodges an orb`.
  - `cooldown and overheat block use` with reasons `'cooldown'` and `'overheat'`.
  - `kid mode slows enemies` (distance moved over 1s ≈ 0.8× adult, ±5%).
  - `update clamps dt` — `update(10)` advances `time` by exactly 0.05.
  - `scripted win` — loop: every 0.3s `use('ls')` when ready else `use('echo', nearestEnemy.x, nearestEnemy.y)` → `outcome === 'win'` within 120s simulated for `glitchMite` and `bootGlitch`.
  - `unequipped skill refused` → `'not-equipped'`.
- [ ] **Step 2: Run** `node --test tests/ck/` — Expected: FAIL.
- [ ] **Step 3: Implement** `js/ck/combat.js`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Add skillshot fight simulation"`

---

### Task 6: Engine, art and the map scene

**Files:**
- Create: `js/ck/engine.js`, `js/ck/art.js`, `js/ck/scenes.js` (map scene now; fight and puzzle scenes in Task 8)
- Create: `tests/e2e/ck-engine.e2e.js` (loads a test page `tests/e2e/ck-harness.html` that includes the CK scripts and a canvas)

**Interfaces:**
- Produces `CK.Engine.create(canvas: HTMLCanvasElement) -> Engine`:
  `{ start(), stop(), setScene(scene), resize(), toWorld(clientX, clientY) -> {x, y}, camera: { x, y, zoom }, running: boolean }`.
  Fixed logical sizes: map world 1600×1000, fight arena 1000×600; the scene declares `scene.view = 'map' | 'arena'`. Canvas backing size = CSS size × `min(devicePixelRatio, 2)`. Uses `requestAnimationFrame`; stops updating while `document.hidden`; calls `scene.update(dt)` then `scene.draw(ctx, t)`; forwards `pointerdown/move/up` (as world coords) and `keydown` to `scene.pointer(type, pt)` / `scene.key(ev)`.
- Produces `CK.Art` (all draw at a centre point and scale, `t` = seconds, for animation):
  `background(ctx, w, h, t, accent)`, `trace(ctx, a, b, t, lit, accent)`, `node(ctx, node, t, state, accent)`, `fog(ctx, w, h, visibleNodes, camera, t)`, `colonel(ctx, x, y, s, t, facing)`, `pip(ctx, x, y, s, t, mood)`, `character(ctx, id, x, y, s, t)` for `bios`, `grub`, `creature(ctx, id, x, y, s, t, opts)` for the four creatures, `burst(ctx, particles)`.
  Neon Circuit palette (spec §7, exact): background `#060a1c` → `#14103a`; glow cyan `#38f2ff`, magenta `#ff4fd8`, violet `#8b5cff`, mint `#6dffb0`, amber `#ffb347`, coral `#ff5d73`; Firmware accent `#ffb347`, GRUB accent `#b6ff5c`. Colonel Kernel: compact robot, officer cap with a small penguin emblem, visor eyes, glowing chest core. Pip: small orb, one big friendly eye, a "1" badge, trailing sparkles. Glow via `shadowBlur`; reduced-motion disables shake and pulsing.
- Produces `CK.Scenes.map({ engine, state, onArrive(node), onBlocked(reason) }) -> Scene`: draws background, traces (lit once both ends cleared/visited), visible nodes, fog over unexplored space with soft radial reveal around explored nodes, the colonel travelling along traces (speed 320 world units/s × `travelMul`), Pip floating beside him; tap a node → `CK.Rules.canMove/move`; camera eases to follow; mouse wheel / pinch zoom between 0.6 and 1.6.

- [ ] **Step 1: Write the failing e2e** `tests/e2e/ck-engine.e2e.js` with Playwright at 1280×800 and `devices['iPhone 13']`:
  - `canvas renders` — after 500ms, sampled pixels of the canvas are not all one colour.
  - `tap moves colonel` — tap the screen position of an adjacent node (`page.evaluate` exposes `CK._test.nodeScreenPos(id)`), after 2s `state.node` equals it.
  - `resize keeps aim mapping` — set viewport 390×844 then 844×390; `toWorld` of a node's screen position returns that node's world coords ±4.
  - `loop pauses when hidden` — dispatch `visibilitychange` with `document.hidden` stubbed true; `engine.running` false; restore → true.
  - Save screenshots `ck-map-desktop.png`, `ck-map-phone.png` to the scratchpad for visual review.
- [ ] **Step 2: Run** `node tests/e2e/ck-engine.e2e.js` — Expected: FAIL.
- [ ] **Step 3: Implement** `engine.js`, `art.js`, the map scene in `scenes.js`, and `tests/e2e/ck-harness.html`.
- [ ] **Step 4: Run** — Expected: PASS; inspect both screenshots for the Neon Circuit look (glow, fog edge, readable labels).
- [ ] **Step 5: Commit** `git commit -m "Add CK canvas engine, art and map scene"`

---

### Task 7: HUD and Pip overlays

**Files:**
- Create: `js/ck/ui.js`, `css/ck.css`
- Modify: `tests/e2e/ck-harness.html` (include `css/ck.css`, `js/terminal.js`, `js/ck/ui.js`)
- Create: `tests/e2e/ck-ui.e2e.js`

**Interfaces:**
- Consumes: `CK.Rules`, `CK.World`, `window.LilShell` (from `js/terminal.js`).
- Produces `CK.UI.create(root: HTMLElement, h: Handlers) -> UI` where `Handlers = { getState(), onExit(), onEquip(skillId), onUnequip(skillId), onBuy(upgradeId), onSkill(skillId), onLearned(skillId), speak(text) }`, and `UI` has:
  - `hud(state)` — top-left region name + accent, bits, memory count; top-right Exit and Pip button.
  - `skillBar(state, mode: 'map'|'fight', fight?)` — one 56px button per equipped skill with icon, command, key number, cooldown ring and the heat meter in fight mode.
  - `say(speaker: characterId, lines: string[]) -> Promise<void>` — glass dialogue box with portrait, tap/Enter to advance, 🔊 reads aloud.
  - `pip(tab: 'quests'|'items'|'combat'|'tasks')` — slide-in Pip panel; Items tab contains inventory, the **motherboard** (slots for ram/cpu/fan/ssd/gpu/nic, empty ones shown as "—"), skill list with equip toggles and upgrade buttons (cost, `needs`, real option text), and the **Codex**: each learned command with its `real` text and a usage example; Tasks tab lists `CK.World.TASKS` with `taskProgress`.
  - `learn(skillId) -> Promise<void>` — modal pretend terminal (a fresh `new LilShell(user)`), shows the teacher's prompt and the `real` text; resolves when a run command matches `SKILLS[id].learnTest` and succeeded.
  - `choice(title, options: {label, value}[]) -> Promise<value>` — used for "Quick fix with… / Fight".
  - `toast(html)`; `banner(title, subtitle)` for region intros and chapter end.
- Style per spec §7: glass panels (`backdrop-filter: blur`), thin glowing borders, uppercase letter-spaced HUD labels, system fonts, monospace for commands, contrast ≥ 4.5:1, every button ≥ 44px, safe-area insets respected.

- [ ] **Step 1: Write the failing e2e** `tests/e2e/ck-ui.e2e.js`:
  - `dialogue advances and resolves` after 3 taps for 3 lines.
  - `learn resolves only on the right command` — typing `ls -a` resolves `learn('ls')`; `pwd` does not.
  - `motherboard shows installed module` (`ram`) and an empty `gpu` slot.
  - `codex lists learned commands`; `tasks tab shows progress` (e.g. `1/2`).
  - `equip respects slots` — third skill equip button disabled with 2 slots.
  - `tap targets` — every button in `#ck-root` has bounding box ≥ 44×44 on iPhone 13.
  - Screenshot `ck-pip-panel.png` for visual review.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** `ui.js` and `ck.css`.
- [ ] **Step 4: Run** — Expected: PASS; inspect the screenshot.
- [ ] **Step 5: Commit** `git commit -m "Add Pip panel, dialogue, learning terminal and HUD"`

---

### Task 8: Fight and puzzle scenes

**Files:**
- Modify: `js/ck/scenes.js` (add `CK.Scenes.fight`, `CK.Scenes.puzzle`)
- Create: `tests/e2e/ck-scenes.e2e.js`

**Interfaces:**
- Consumes: `CK.Fight` (Task 5), `CK.Puzzle` (Task 4), `CK.Art`, `CK.UI.skillBar`.
- Produces `CK.Scenes.fight({ engine, ui, state, creature, kid, seed, onEnd(outcome) }) -> Scene` — arena view; selected skill via skill bar or keys `1–5`; pointer/tap in the arena calls `fight.use(selected, x, y)`; aiming reticle follows the pointer on desktop; draws enemies (cloaked = faint shimmer), shots, orbs, hit sparks, damage numbers, screen shake (not with reduced motion), stability bar, heat meter; Pip's Combat line shows the creature's `weakText`; kid mode adds a "💡 Hint" button once per fight. Calls `onEnd` 1s after `outcome` is set.
- Produces `CK.Scenes.puzzle({ engine, state, grid, accent, onSolved() }) -> Scene` — grid centred in the arena view; tap a tile to `CK.Puzzle.rotate`; powered traces glow in the accent with travelling pulses; solved → flash and `onSolved` after 0.8s.
- Produces `CK._test` hooks (only when `location.search` contains `ckdebug`): `win()`, `lose()`, `solve()`.

- [ ] **Step 1: Write the failing e2e** `tests/e2e/ck-scenes.e2e.js`:
  - `tapping fires toward the tap` — select echo, tap above the colonel, a shot exists whose velocity points at the tap (±10°).
  - `keys select skills` — pressing `2` selects the second equipped skill.
  - `puzzle tap rotates and solves` — tap each cell the number of times needed (computed in-page from the solved grid) → `onSolved` called.
  - `fight win calls onEnd('win')` using `?ckdebug` `win()`.
  - Screenshots `ck-fight.png`, `ck-puzzle.png` (desktop and iPhone 13).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** both scenes.
- [ ] **Step 4: Run** — Expected: PASS; inspect screenshots.
- [ ] **Step 5: Commit** `git commit -m "Add skillshot fight and circuit puzzle scenes"`

---

### Task 9: Chapter flow, integration with LilNux, offline and docs

**Files:**
- Create: `js/ck/main.js`
- Modify: `index.html` (add `css/ck.css` and the `js/ck/*.js` scripts after `js/content.js`, before `js/game.js`)
- Modify: `js/game.js` (top-bar button `🎮 Kernel`, map-footer button `🎮 Colonel Kernel`, route `ck`, pass hooks)
- Modify: `sw.js` (`VERSION = 'lilnux-v2'`, add `css/ck.css` and every `js/ck/*.js`)
- Modify: `README.md` (new "🎮 Colonel Kernel" section: what it is, controls, that it's chapter 1)
- Create: `tests/e2e/ck-chapter.e2e.js`

**Interfaces:**
- Produces `CK.open({ root: HTMLElement, player, save(), addXP(n), giveBadge(id, emoji, name), sound: { good(), bad(), win(), pop() }, speak(text), soundOn: () => boolean }) -> void` and `CK.close() -> void`. `open` loads `player.ck = CK.State.load(player.ck)`, builds a full-screen `#ck-root`, creates one engine (closing any previous one first), plays the intro once (`seenIntro`).
- Node arrival handling (in `main.js`):
  - `character` → `ui.say` its lines; if it teaches an unlearned skill → `ui.learn(skill)` → `CK.Rules.learn` → `reward`-free; badge none.
  - `problem` → `ui.choice('…', [Quick fix with <each equipped skill>, Fight])` → `CK.Rules.quickFix` → `'fixed'`: reward `clean` + "In real Linux…" line; `'fight'`: fight scene → win: `clear`, reward `fight`, teacher explains; lose: back to `checkpoint`.
  - `circuit` → puzzle scene with `CK.Puzzle.scramble(grid, CK.rng(seed))` → solved: `clear`, reward `puzzle`.
  - `item` → `installModule` + toast with the module's `real` line; `memory` → push line, reward `memory`, Pip comments.
  - `boss` → fight scene with the boss → win: `clear`, reward `boss`, install the drop module, region `outro`, reward `region`, badge.
  - `exit` → `enterRegion('grub')`; GRUB's exit → `chapterDone = true`, chapter-end banner with a teaser for Kernel Core.
  - Skill-bar taps on the map call `CK.Rules.useOnMap`; `cd` opens a travel picker of `travelTargets`.
  - After clears/memories: `CK.Rules.claimTasks` → toast per completed task.
  - After every state change: `save()`. XP from `reward()` goes through `addXP`.
- Badges (ids, emoji, names): `ck-r1` 🔥 "Firmware Fixer", `ck-r2` 🐛 "Bootloader Boss", `ck-clean` 🧼 "Clean Fixer" (at `stats.clean >= 5`), `ck-ch1` 🎖️ "Chapter 1: Boot Sequence". Add them to `SPECIAL_BADGES` in `game.js` so the badge page lists them.

- [ ] **Step 1: Write the failing e2e** `tests/e2e/ck-chapter.e2e.js` (Playwright, `?ckdebug`, dialogs accepted):
  - `full chapter` — new player → click `🎮 Colonel Kernel` → advance intro → walk every node of region 1 in a BFS order using `CK._test.nodeScreenPos`, learning skills by typing their commands, choosing Quick fix with the right skill on problems, `solve()` puzzles, `win()` the boss → region 2 the same → chapter-end banner visible; player XP > 0; badges include `ck-r1`, `ck-r2`, `ck-ch1`; zero page errors.
  - `reenter after exit mid-fight` — start a fight, click Exit, re-open → exactly one `requestAnimationFrame` loop running (`CK._test.loops === 1`), colonel at checkpoint.
  - `wrong skill starts a fight` — Quick fix with echo on an `ls` problem → fight scene active.
  - `save survives reload` — reload page, re-open → same node and learned skills.
  - `plays with storage blocked` — `addInitScript` making `localStorage.setItem` throw → chapter opens and a node move works, zero page errors.
  - `old save without ck` — preload a v1 LilNux save lacking `ck` → opens at `f0`.
- [ ] **Step 2: Run** `node tests/e2e/ck-chapter.e2e.js` — Expected: FAIL.
- [ ] **Step 3: Implement** `main.js` and the `index.html`, `game.js`, `sw.js`, `README.md` changes.
- [ ] **Step 4: Run** all: `node --test tests/ck/ && node tests/e2e/ck-engine.e2e.js && node tests/e2e/ck-ui.e2e.js && node tests/e2e/ck-scenes.e2e.js && node tests/e2e/ck-chapter.e2e.js && node tests/e2e/lilnux-regression.e2e.js` — Expected: all PASS, `ERRORS []`.
- [ ] **Step 5: Commit and push** `git commit -m "Wire Colonel Kernel chapter 1 into LilNux" && git -c push.negotiate=true push`
