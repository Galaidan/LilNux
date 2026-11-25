# Colonel Kernel Chapter 1 in the Action Style — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all of Chapter 1 (Firmware Foundry → GRUB Gate → Home, the Lil Tux rest and the
cliffhanger) as the room-to-room action-adventure from the vertical slice. The result is a
playtest zip, built from branch `ck-chapter1`.

**Architecture:** Each node in `CK.World` becomes one 30×17-tile room, placed on a per-region
grid. Edges become doorways.
- `CK.RoomGen` builds every room's ASCII layout from its node, its kind and its neighbours, from
  a fixed seed, so doors always line up.
- `CK.Action` (with the new `CK.Foes`) runs the fight in every room.
- `CK.RoomScene` draws the room, its doors and props, darkness and transitions.
- The rewritten `main.js` is the room-based flow: lessons, fights, puzzles, items, story, rest.
- The rules, the save format and the story keep their meaning. `CK.State` moves to v2 with a
  migration.
- The old node-map Adventure (`engine.js`, `scenes.js`, `combat.js`, `art.js`) and the temporary
  Training Room button are removed at the end.

**Tech Stack:** Plain JS (classic scripts, IIFE on `root.CK`), Canvas 2D, Pointer Events. Tests use
`node --test` and Playwright + Chromium, installed outside the repo at `C:\ClaudeBro\.pw`.

**Spec:** `docs/superpowers/specs/2026-11-25-colonel-kernel-action-adventure-design.md`. This plan
covers delivery step 2 and the docs part of step 3. Step 1, the slice, is merged on `main`.

## Global Constraints

- No build step and no runtime dependencies. Classic `<script>` tags. Works from `file://`,
  GitHub Pages and the iPhone PWA.
- Every JS file follows the existing IIFE pattern and loads in Node **without touching
  `document`/`window` at load time**.
- Pixel buffer: `k = max(1, round(deviceHeightPx / 270))`. Rooms are 30×17 tiles of 16 px
  (480×272), as `CK.PixEngine` and `CK.Rooms` already do.
- Text (dialogue, HUD, prompts, tooltips, terminal) stays in the HTML overlay, never in the
  canvas. Contrast ≥ 4.5:1. Pixel digits and the "9" glyph are decorative only.
- Touch targets ≥ 44 CSS px, inside `env(safe-area-inset-*)`. `touch-action: none`. No long-press
  callout.
- Reduced motion (`engine.reducedMotion`): no screen shake, no sliding transitions (cut instead),
  no flashing or flicker. Glitched rooms are drawn still. Hit-stop is allowed.
- Sounds go only through `h.sound` / `h.soundOn` (the sound toggle).
- Phones play the Adventure in landscape. Portrait shows the rotate screen. `manifest.webmanifest`
  gets **no** `orientation`. Learn mode is untouched.
- Real-Linux lines must be accurate, word for word where the spec fixes them (§6.4).
- Palette: Neon Circuit as in `CK.RoomArt.ART` and `CK.Sprites.PALETTE`. Region accents:
  Firmware `#ffb347`, GRUB `#b6ff5c`, Home `#f5a623`.
- Original art only. Nothing from Hyper Light Drifter, A Link to the Past or any other game. No
  rows of heart containers.
- No punishment: losing reboots at the last checkpoint with loot kept. No streaks, no grind.
- Family saves must keep working: v1 → v2 migration, never wiping progress.
- Privacy: no names or family details in code, commits, fixtures or docs. Commits use the
  repo-local `Galaidan` identity.
- PowerShell: refresh PATH before `git`/`node`:
  `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`.
  E2E runs need `$env:NODE_PATH = 'C:\ClaudeBro\.pw\node_modules'`. Run one e2e file per
  command. Never `assert.equal` a Playwright handle (it prints a huge object and can hang): compare
  booleans.

## Review Focus

1. **A dialogue, learning terminal, choice, banner or Pip panel is open while creatures are
   live.** The fight must freeze. Letters typed into the learning terminal (`kill -l` contains `k`
   and `l`; Enter closes dialogue) must not swing, parry, dash or "use" in the room after the
   overlay closes. → Task 12 e2e `overlays freeze the room and swallow their keys`.
2. **Reloading or closing the app while inside an uncleared problem, boss or circuit room** (or
   mid-transition) must resume at the checkpoint safe room, never behind sealed doors. → Task 12
   e2e `reload inside a sealed room resumes at the checkpoint`.
3. **Crossing doors fast, or stepping back out of the entry door the moment a fight starts.**
   There must be exactly one `R.move` per crossing, the entry door stays open, and leaving resets
   the creatures. → Task 13 e2e `back out of a problem room at once`, which exercises the
   Task 9 door latch.
4. **Real v1 saves from the live site** (mid-Firmware with `cd-dash` bought, three tools with a
   RAM stick, a finished chapter with Lil Tux taken) load without losing anything and show the
   new-moves toast once. → Task 3 tests and Task 12 e2e `v1 save loads into the new Adventure`.
5. **Rotating to portrait or losing focus mid-boss.** Time freezes (SIGKILL telegraphs are never
   skipped) and held input clears. → Task 14 e2e `rotate and blur freeze a boss fight`.

## Calls made in this plan (not in the spec; open to change at review)

- Branch `ck-chapter1` from `main`. The spec's `ck-action` is already merged. The cache moves to
  `lilnux-v9`, because `v7`/`v8` are taken.
- **Grid re-authoring.** Two edges change so every edge joins grid neighbours, since a room has
  only four sides:
  - Firmware: `f3–f4` becomes `f1–f4`.
  - GRUB: `g5–g14` becomes `g3–g14`, because a 5-cycle can't sit on a grid.

  Node ids and kinds are unchanged, so saves are unaffected.
- **Echo lesson:** Pip teaches `echo` at the gap in Power Rail (`f1`). The east bridge to the
  Firmware Vault is retracted, and the switch that extends it is across the void. It's on the
  critical path and before `f9`.
- **`trap` lesson:** taught on entry to whichever problem room is entered first (`f5` or `f7`).
  The spec says `f5`, but both are reachable from `f3`.
- **Stability and heat refill on every room entry.** Each room is its own fight, as today's
  fights are.
- **`cd` must be equipped to use terminals (fast travel) and path signs.** If it isn't, Pip says
  to equip it.
- **Keys 1–3 fire tool slots in loadout order. `E`/`Enter` is Talk/use.** The spec's Q/E cycling
  is dropped because it collides with `E` for use.
- **Loop doors** are in initramfs (`g7`): its east and south doors loop until you `cd /boot` at
  the path sign.
- **Dark rooms:** `f0`, `f4`, `f8`. **Corrupt blocks** guard the memory crystals in `f2` and
  `g2`. Chapter 1 uses no hidden switches; `ls` reveals cloaked creatures, dark rooms and cracked
  walls.
- **Pip's map** is an accessible HTML grid of squares, not a canvas.
- **The Training Room button and `slice.js` are removed** once the chapter replaces them.
  `Rooms.TRAINING` stays as a test fixture.

---

## File map

| File | Change | Responsibility |
|---|---|---|
| `js/ck/world.js` | modify | `kill`/`trap` skills with `term` responders, new lines, SSD, grid `cells`, re-authored edges, `dark` flags |
| `js/ck/rules.js` | modify | tools vs moves, `stats` mods, `clearRoom`, `sideOf`, `doorStates`, safe-room travel, `sanitize` v2 |
| `js/ck/state.js` | modify | save v2 + v1 migration |
| `js/ck/rooms.js` | modify | new legend, doors/props/breakables, `setDoor`, `blocksShots`, `doorAt`, `entryPoint`, `nearestProp` |
| `js/ck/roomgen.js` | **new** | `CK.RoomGen.build(region, nodeId)` → 30×17 rows |
| `js/ck/foes.js` | **new** | enemy behaviours: mite, wisp, Boot Glitch, Kernel Wraith, SIGKILL |
| `js/ck/action.js` | modify | uses `CK.Foes`; mods, upgrades, `kill -9`, breakables, switches, empty rooms |
| `js/ck/input.js` | modify | tool slots, `use`, `kill` hold, `cd`/use touch buttons |
| `js/ck/sprites.js`, `js/ck/roomart.js` | modify | characters, creatures, props, door/bridge art |
| `js/ck/roomscene.js` | modify | world scene: props, NPCs, doors, darkness, glitch, transitions, door/prop callbacks |
| `js/ck/puzzlescene.js` | **new** | pixel rotation puzzle on `CK.PixEngine` |
| `js/ck/ui.js` | modify | action HUD, prompt, rotate screen, Pip Map tab, Items tab for tools/moves, pixel portraits |
| `js/ck/main.js` | rewrite | room-based Chapter 1 flow |
| `js/ck/engine.js`, `scenes.js`, `combat.js`, `art.js`, `slice.js` | **delete** (Task 14) | old map Adventure and slice |
| `index.html`, `js/game.js`, `css/ck.css`, `sw.js` | modify | wiring, hub button removal, styles, cache `lilnux-v9` |
| `tests/ck/*.test.js` | modify/new | `roomgen.test.js`, `foes.test.js`, `wiring.test.js` new; `combat.test.js` deleted |
| `tests/e2e/ck-adventure.e2e.js` | **new** | replaces `ck-engine`, `ck-scenes`, `ck-chapter`, `ck-slice` suites |

Script order in `index.html` (Task 12 and Task 14): `state, world, rules, story, puzzle, pixel, sprites,
rooms, roomgen, roomart, foes, action, input, pixengine, roomscene, puzzlescene, ui, main`.

---

### Task 1: World data for the action chapter

**Files:**
- Modify: `js/ck/world.js`, `js/ck/ui.js` (one line in `ui.learn`)
- Test: `tests/ck/world.test.js`

**Interfaces:**
- Produces:
  - `World.SKILLS.kill` and `World.SKILLS.trap`, each with `{ id, cmd, name, icon, teacher: 'pip', move: true, learnTest, real, example, term(line) → { ok, html } }`. `kill.upgrade = { id: 'kill-9', cmd: 'kill -9', cost: 50, needs: 'cpu', blurb }`. `trap` has no `upgrade`.
  - `SKILLS.cd.upgrade` is removed.
  - Every region has `cells: { nodeId: [gx, gy] }`.
  - `nodes[id].dark === true` for `f0`, `f4`, `f8`.
  - `nodes.g13.accent = '#f5a623'`.
  - `MODULES.ssd = { moveMul: 1.2, dashCdMul: 0.75, … }`, replacing `travelMul`.
- Consumed by: Task 2 (rules), Task 4 (generator), Task 10 (UI), Task 12 (flow).

- [ ] **Step 1: Be on the branch**

The plan was committed on `ck-chapter1`, which was cut from `main` at `a8fd659`.

```powershell
git switch ck-chapter1; git log --oneline -1
```
Expected: HEAD is the plan commit.

- [ ] **Step 2: Write the failing tests** (append to `tests/ck/world.test.js`)

```js
const [FW, GR] = W.REGIONS;
test('every edge joins grid neighbours and no two rooms share a cell', () => {
  for (const reg of W.REGIONS) {
    assert.deepEqual(Object.keys(reg.cells).sort(), Object.keys(reg.nodes).sort());
    const seen = new Set();
    for (const id of Object.keys(reg.cells)) { const k = reg.cells[id].join(','); assert.ok(!seen.has(k), id); seen.add(k); }
    for (const [a, b] of reg.edges) {
      const [ax, ay] = reg.cells[a]; const [bx, by] = reg.cells[b];
      assert.equal(Math.abs(ax - bx) + Math.abs(ay - by), 1, `${a}-${b}`);
    }
  }
});
test('chapter 1 grid layout', () => {
  assert.deepEqual([FW.cells.f0, FW.cells.f1, FW.cells.f3, FW.cells.f12, FW.cells.f13], [[0, 1], [1, 1], [2, 1], [4, 3], [5, 3]]);
  assert.deepEqual([GR.cells.g0, GR.cells.g7, GR.cells.g12, GR.cells.g13], [[0, 1], [2, 2], [4, 3], [5, 3]]);
  const has = (reg, a, b) => reg.edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  assert.ok(has(FW, 'f1', 'f4') && !has(FW, 'f3', 'f4'));
  assert.ok(has(GR, 'g3', 'g14') && !has(GR, 'g5', 'g14'));
  assert.equal(FW.edges.length, 18); assert.equal(GR.edges.length, 18);
});
test('kill and trap are always-on moves taught by Pip; cd has no dash upgrade', () => {
  for (const id of ['kill', 'trap']) { assert.equal(W.SKILLS[id].teacher, 'pip'); assert.equal(W.SKILLS[id].move, true); }
  assert.equal(W.SKILLS.kill.upgrade.id, 'kill-9'); assert.equal(W.SKILLS.kill.upgrade.needs, 'cpu');
  assert.equal(W.SKILLS.trap.upgrade, undefined); assert.equal(W.SKILLS.cd.upgrade, undefined);
});
test('kill and trap lines are accurate', () => {
  assert.equal(W.SKILLS.kill.real, '`kill` sends a signal to a process. By default it’s SIGTERM, which asks it to quit politely; `kill -9` sends SIGKILL, which the process can’t catch or ignore.');
  assert.equal(W.SKILLS.trap.real, 'In bash, `trap \'echo caught\' INT` runs a command when the shell gets SIGINT (Ctrl+C). Scripts use it to clean up. SIGKILL and SIGSTOP can’t be trapped.');
  const l = W.SKILLS.kill.term('kill -l');
  assert.ok(l.ok); for (const s of ['2) SIGINT', '9) SIGKILL', '15) SIGTERM', '19) SIGSTOP']) assert.ok(l.html.includes(s), s);
  assert.equal(W.SKILLS.kill.term('kill').ok, false); // bash prints usage
  assert.match(W.SKILLS.kill.term('kill 4242').html, /\(4242\) - No such process/);
  assert.ok(W.SKILLS.trap.term("trap 'echo caught' INT").ok);
  for (const ok of ['kill -l', 'kill 4242', 'kill -9 4242']) assert.ok(W.SKILLS.kill.learnTest.test(ok), ok);
  for (const ok of ["trap 'echo caught' INT", 'trap -l']) assert.ok(W.SKILLS.trap.learnTest.test(ok), ok);
});
test('Pip opens with kill; Grub teaches cd for terminals and path signs', () => {
  assert.match(W.CHARACTERS.pip.lines[3], /kill/); assert.doesNotMatch(W.CHARACTERS.pip.lines[3], /echo/);
  assert.doesNotMatch(W.CHARACTERS.grub.lines.join(' '), /dash/);
});
test('SSD speeds movement and dashing; dark rooms; Home accent; clean task', () => {
  assert.deepEqual([W.MODULES.ssd.moveMul, W.MODULES.ssd.dashCdMul, W.MODULES.ssd.travelMul], [1.2, 0.75, undefined]);
  assert.deepEqual(Object.keys(FW.nodes).filter((id) => FW.nodes[id].dark), ['f0', 'f4', 'f8']);
  assert.equal(GR.nodes.g13.accent, '#f5a623');
  assert.equal(W.TASKS['pip-clean'].text, 'Clear 3 problem rooms without taking a hit');
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `node --test tests/ck/world.test.js`
Expected: FAIL, with `cells` undefined and `SKILLS.kill` undefined.

- [ ] **Step 4: Implement in `js/ck/world.js`**

- **Cells (`[gx, gy]`).**
  - Firmware: `f0 [0,1]`, `f1 [1,1]`, `f2 [1,0]`, `f14 [2,0]`, `f3 [2,1]`, `f4 [1,2]`, `f5 [3,1]`, `f6 [3,0]`, `f7 [2,2]`, `f9 [3,2]`, `f10 [4,2]`, `f8 [2,3]`, `f11 [3,3]`, `f12 [4,3]`, `f13 [5,3]`, `f15 [2,4]`.
  - GRUB: `g0 [0,1]`, `g1 [1,1]`, `g2 [1,0]`, `g14 [2,0]`, `g3 [2,1]`, `g5 [3,1]`, `g4 [1,2]`, `g7 [2,2]`, `g8 [3,2]`, `g10 [4,2]`, `g6 [1,3]`, `g9 [2,3]`, `g11 [3,3]`, `g12 [4,3]`, `g13 [5,3]`, `g15 [1,4]`.
  - Keep the old `x, y` until Task 14 deletes the map scene.
- **Edges:** replace `['f3','f4']` with `['f1','f4']`, and `['g5','g14']` with `['g3','g14']`.
- **Room flags:** `dark: true` on `f0`, `f4`, `f8`. `accent: '#f5a623'` on `g13`.
- **`kill`:**
  - name `Kill Strike`, icon `⚔️`, `real` exactly as tested, example `kill -l`.
  - `learnTest: /^kill\s+(-l|-\w+\s+\d+|\d+)$/`.
  - blurb: `Melee combo. Each hit cools your heat a little.`
- **`kill.term(line)`:**
  - `-l` → the first 19 Linux signals in bash's `kill -l` layout (`1) SIGHUP … 9) SIGKILL … 15) SIGTERM … 19) SIGSTOP`), in a `<pre>`, plus a dim line `…up to 64 on Linux`.
  - `kill [-SIG] N` → `bash: kill: (N) - No such process`, then a dim line `Down here it hits Glitch Mites instead.`, with `ok: true`.
  - Anything else → `kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]`, with `ok: false`.
- **`trap`:**
  - name `Signal Trap`, icon `🛡️`, `real` exactly as tested, example `trap 'echo caught' INT`.
  - `learnTest: /^trap\s+(-l|(['"]).+\2\s+\w+)$/`.
  - blurb: `Parry: catch a signal and send it back. Mistimed, it leaves you open.`
- **`trap.term`:**
  - `-l` → the same list as `kill -l`.
  - A quoted handler plus a signal → empty output (bash prints nothing) plus a dim line `Handler set. Down here it catches orbs and lunges.`, with `ok: true`.
  - Otherwise `ok: false` with the hint `try trap 'echo caught' INT`.
- **Tool blurbs:**
  - `echo`: `Ranged bolt. Also trips switches across gaps.`
  - `ls`: `Light pulse: lights dark rooms and reveals cloaked creatures.`
  - `ls-a` upgrade blurb: `also shows hidden entries: cracked walls to hidden caches, reveal lasts 7s`.
  - `cd`: name `Change Directory`, blurb `At a terminal: fast-travel between safe rooms. At a path sign: pick the right path.`. Delete `cd.upgrade`.
- **SSD:** `{ id, name, icon, moveMul: 1.2, dashCdMul: 0.75, real: 'An SSD stores data on flash chips with no moving parts — far faster than an old spinning hard drive. Here: you move 20% faster and your dash recharges 25% sooner.' }`.
- **Pip `lines[3]`:** `Lesson one: kill. In a real terminal it sends a signal to a process — SIGTERM by default, a polite “please stop”. Down here it’s your fists. Type it.`
- **Grub `lines[3]`:** `You’ll want cd — change directory. In a terminal it moves you between folders. Out here it works the old terminals and my path signs. Type it!`
- **Bios `lines[3]`:** keep the ls lesson, and add `Down here it’s a light pulse.`
- **Region intros:**
  - Firmware `intro[1]` → `Walk with WASD or your left thumb. Doors lead on; my map in Pip’s panel shows where we’ve been. Don’t worry, I’ll float right next to you. Someone has to.`
- **Creature `weakText`:**
  - `glitchMite`: `🔦 Cloaked — pulse ls to light them up, then kill.`
  - `loopWisp`: `🌀 Blinks, then bursts — dash through the burst and strike.`
  - `bootGlitch`: `🔦 Re-cloaks every phase — keep pulsing ls. Its red 9 ring is SIGKILL: dash, don’t trap.`
  - `kernelWraith`: `🌀🔦 Blinks and cloaks — pulse ls, dash its SIGKILL ring, kill it.`
- **Task text:** `pip-clean` → as tested.
- **`ui.learn` in `js/ck/ui.js`:** run `const res = s.term ? s.term(v.trim()) : shell.run(v);`. The rest is unchanged.

- [ ] **Step 5: Run the unit suite**

Run: `node --test tests/ck/`
Expected: all pass. If an older world test asserted the old Pip/echo wording, the `cd` upgrade or
`travelMul`, update it to the new values and note that in the commit message.

- [ ] **Step 6: Commit**

```powershell
git add js/ck/world.js js/ck/ui.js tests/ck/world.test.js
git commit -m "CK ch1: world data for rooms - grid cells, kill/trap lessons with accurate signals, SSD move/dash, dark rooms"
```

---

### Task 2: Rules for rooms, tools and doors

**Files:**
- Modify: `js/ck/rules.js`
- Test: `tests/ck/rules.test.js`

**Interfaces:**
- Consumes (Task 1): `region.cells`, `SKILLS[*].move`, `MODULES.ssd.moveMul/dashCdMul`.
- Produces:
  - `R.TOOLS = ['echo','ls','cd']` and `R.MOVES = ['kill','trap']`.
  - `R.stats(state) → { slots, cdMul, heatMul, moveMul, dashCdMul, sight }`.
  - `R.clearRoom(state, nodeId, { clean }) → { clean, bits, xp }`.
  - `R.sideOf(region, a, b) → 'n'|'s'|'e'|'w'|null`.
  - `R.doorStates(state, nodeId, { bossFight }) → { [side]: { to, kind } }`, where `kind ∈ 'open'|'sealed'|'wall'|'crack'|'loop'`.
  - `R.LOOP_DOORS = { g7: ['e', 's'] }`.
  - `R.SAFE = { start: 1, character: 1 }`.
  - `R.travelTargets(state) → nodeId[]`.
  - `R.useOnMap(state, 'cd').travelTargets === R.travelTargets(state)`.
- Keep `quickFix` until Task 12 deletes it along with the old `main.js`.

- [ ] **Step 1: Write the failing tests** (append to `tests/ck/rules.test.js`; use its existing
  `fresh()` helper or `CK.State.fresh()`)

```js
test('stats: SSD moves 20% faster and dashes recover 25% sooner', () => {
  const s = CK.State.fresh(); s.modules = ['ssd'];
  const st = R.stats(s); assert.equal(st.moveMul, 1.2); assert.equal(st.dashCdMul, 0.75); assert.equal(st.travelMul, undefined);
});
test('kill and trap are moves: learning them never takes a tool slot', () => {
  const s = CK.State.fresh(); R.learn(s, 'kill'); R.learn(s, 'trap'); R.learn(s, 'echo');
  assert.deepEqual(s.equipped, ['echo']); assert.equal(R.equip(s, 'kill'), false);
  assert.deepEqual(s.learned.sort(), ['echo', 'kill', 'trap']);
});
test('clearRoom: no hits is a clean clear with the clean reward', () => {
  const s = CK.State.fresh();
  assert.deepEqual(R.clearRoom(s, 'f5', { clean: true }), { clean: true, bits: 15, xp: 15 });
  assert.ok(R.isCleared(s, 'f5')); assert.equal(s.stats.clean, 1); assert.equal(s.bits, 15);
});
test('clearRoom: a clear with hits pays the fight reward', () => {
  const s = CK.State.fresh();
  assert.deepEqual(R.clearRoom(s, 'f7', { clean: false }), { clean: false, bits: 10, xp: 20 });
  assert.equal(s.stats.clean, 0);
});
test('sideOf', () => {
  const fw = R.region('firmware');
  assert.deepEqual([R.sideOf(fw, 'f1', 'f3'), R.sideOf(fw, 'f1', 'f2'), R.sideOf(fw, 'f1', 'f0'), R.sideOf(fw, 'f1', 'f4'), R.sideOf(fw, 'f1', 'f9')], ['e', 'n', 'w', 's', null]);
});
test('doorStates: forward doors seal in an uncleared problem room; the way back stays open', () => {
  const s = CK.State.fresh(); s.node = 'f5'; s.prev = 'f3'; s.explored.firmware = ['f3', 'f5', 'f6', 'f9'];
  assert.deepEqual(R.doorStates(s, 'f5'), { w: { to: 'f3', kind: 'open' }, n: { to: 'f6', kind: 'sealed' }, s: { to: 'f9', kind: 'sealed' } });
  R.clearRoom(s, 'f5', { clean: false });
  assert.equal(R.doorStates(s, 'f5').n.kind, 'open');
});
test('doorStates: hidden neighbours are wall, then crack once revealed, then open once cleared', () => {
  const s = CK.State.fresh(); s.node = 'f3'; s.explored.firmware = ['f3', 'f1'];
  assert.equal(R.doorStates(s, 'f3').n.kind, 'wall');
  s.explored.firmware.push('f14'); assert.equal(R.doorStates(s, 'f3').n.kind, 'crack');
  R.clear(s, 'f14'); assert.equal(R.doorStates(s, 'f3').n.kind, 'open');
});
test('doorStates: g7 loop doors until the path sign is set', () => {
  const s = CK.State.fresh(); s.region = 'grub'; s.node = 'g7'; s.explored.grub = ['g3', 'g4', 'g7', 'g8', 'g9'];
  const d = R.doorStates(s, 'g7'); assert.deepEqual([d.e.kind, d.s.kind, d.n.kind], ['loop', 'loop', 'open']);
  s.signs = ['g7']; assert.equal(R.doorStates(s, 'g7').e.kind, 'open');
});
test('doorStates: a boss fight seals every door', () => {
  const s = CK.State.fresh(); s.node = 'f12'; s.prev = 'f10'; s.explored.firmware = ['f10', 'f11', 'f12', 'f13'];
  assert.ok(Object.values(R.doorStates(s, 'f12', { bossFight: true })).every((d) => d.kind === 'sealed'));
});
test('doorStates: unexplored neighbours are sealed (fog), never walked into', () => {
  const s = CK.State.fresh(); s.node = 'f1'; s.explored.firmware = ['f0', 'f1'];
  assert.equal(R.doorStates(s, 'f1').e.kind, 'sealed');
});
test('cd fast travel only reaches visited safe rooms', () => {
  const s = CK.State.fresh(); s.learned = ['cd']; s.node = 'f5';
  s.explored.firmware = ['f0', 'f1', 'f2', 'f3', 'f5']; s.cleared.firmware = ['f1', 'f2', 'f3'];
  assert.deepEqual(R.travelTargets(s).sort(), ['f0', 'f1', 'f3']);
  s.story.glitched = ['f3']; assert.deepEqual(R.travelTargets(s).sort(), ['f0', 'f1']);
  assert.equal(R.fastTravel(s, 'f2'), false);
});
test('sanitize v2: equipped holds only learned tools, trimmed to slots; kill-9 is known', () => {
  const s = CK.State.fresh(); s.learned = ['echo', 'ls', 'cd', 'kill', 'trap']; s.equipped = ['kill', 'echo', 'ls', 'cd'];
  s.upgrades = ['kill-9', 'cd-dash']; R.sanitize(s);
  assert.deepEqual(s.equipped, ['echo', 'ls']); assert.deepEqual(s.upgrades, ['kill-9']);
});
```
`doorStates` returns sides in `n, e, s, w` order only when present. Compare with `deepEqual` on
objects (order-free).

- [ ] **Step 2: Run them to see them fail**

Run: `node --test tests/ck/rules.test.js`
Expected: FAIL, because `clearRoom`, `sideOf` and `doorStates` are not functions.

- [ ] **Step 3: Implement in `js/ck/rules.js`**

- **`stats`:** multiply `moveMul` and `dashCdMul` from modules (default 1). Drop `travelMul`.
- **`learn`:** pushes to `learned` and `codex`, and equips only when the skill is in `TOOLS` and a slot is free.
- **`equip`:** returns false for anything not in `TOOLS`.
- **`clearRoom`:** `clear(state, id)`. If `clean`, also `state.stats.clean++`. Then return `reward(state, clean ? 'clean' : 'fight')` merged with `{ clean }`.
- **`sideOf`:** compares `region.cells`. It returns null unless the two nodes are joined by an edge.
- **`doorStates(state, id, opts)`:** for each neighbour `nb`, on its `side`, decide the kind in this order:
  1. `opts.bossFight` → `sealed`.
  2. `nb` hidden and not explored → `wall`.
  3. Hidden, explored and not cleared → `crack`.
  4. Not explored → `sealed`.
  5. `BLOCKING[here.kind] && !isCleared(here) && nb !== state.prev` → `sealed`.
  6. `LOOP_DOORS[id]` includes the side and `!(state.signs || []).includes(id)` → `loop`.
  7. Otherwise `open`.
- **`travelTargets`:** `explored ∩ isCleared ∩ SAFE[kind]`, minus `story.glitched`, minus the current node.
- **`useOnMap('cd')`:** returns `{ ok, travelTargets: travelTargets(state) }`.
- **`sanitize`:**
  - `equipped` is filtered to `TOOLS ∩ learned`, then sliced to slots.
  - Upgrade ids come from skills that have an `upgrade`, so the code tolerates skills without one.
- **Export** the new names.

- [ ] **Step 4: Run the unit suite**

Run: `node --test tests/ck/`
Expected: all pass. Old tests expecting `travelMul`, or `cd` fast travel to any cleared node,
are updated to the new rule in the same commit.

- [ ] **Step 5: Commit**

```powershell
git add js/ck/rules.js tests/ck/rules.test.js
git commit -m "CK ch1: rules - tools vs moves, clearRoom with clean no-hit clears, door states, safe-room fast travel"
```

---

### Task 3: Save v2 and the v1 migration

**Files:**
- Modify: `js/ck/state.js`
- Test: `tests/ck/state.test.js`

**Interfaces:**
- Produces: `fresh()` with
  `{ v: 2, switches: [], signs: [], story: { …, newMoves: false } }`.
- `load(raw)` migrates any `raw.v` below 2.
- Consumed by: Task 12 (new-moves toast reads and clears `story.newMoves`). Task 13 adds to
  `switches` and `signs`.

- [ ] **Step 1: Write the failing tests**

```js
const V1 = { v: 1, region: 'firmware', node: 'f9', prev: 'f5', explored: { firmware: ['f0', 'f1', 'f3', 'f5', 'f9'] }, cleared: { firmware: ['f1', 'f3', 'f5'] },
  learned: ['echo', 'ls'], equipped: ['echo', 'ls'], upgrades: ['echo-n', 'cd-dash'], modules: ['ram'], bits: 12, memories: ['[    0.000000] efi: EFI v2.9 by LilNux Firmware'],
  tasksDone: [], codex: ['echo', 'ls'], checkpoint: { region: 'firmware', node: 'f3' }, stats: { clean: 2, fights: 3, wins: 3 }, chapterDone: false, seenIntro: true, log: [],
  story: { liltuxMet: false, liltuxTaken: false, restUnlocked: false, rests: 1, lastSeen: 5, glitched: [], oddLogs: [], flicker: false, playMs: 9000, lastReminderMs: 0 } };
test('fresh saves are v2 with switches and signs', () => {
  const s = CK.State.fresh(); assert.equal(s.v, 2); assert.deepEqual([s.switches, s.signs, s.story.newMoves], [[], [], false]);
});
test('v1 save that met Pip gains kill and trap, once, with the new-moves flag', () => {
  const s = CK.State.load(V1);
  assert.equal(s.v, 2); assert.deepEqual(s.learned, ['echo', 'ls', 'kill', 'trap']); assert.ok(s.codex.includes('kill') && s.codex.includes('trap'));
  assert.deepEqual(s.equipped, ['echo', 'ls']); assert.equal(s.story.newMoves, true);
});
test('v1 cd-dash upgrade is refunded as 50 bits', () => {
  const s = CK.State.load(V1); assert.deepEqual(s.upgrades, ['echo-n']); assert.equal(s.bits, 62);
});
test('v1 progress carries over unchanged', () => {
  const s = CK.State.load(V1);
  assert.deepEqual([s.region, s.node, s.prev, s.checkpoint], ['firmware', 'f9', 'f5', { region: 'firmware', node: 'f3' }]);
  assert.deepEqual(s.explored, V1.explored); assert.deepEqual(s.cleared, V1.cleared); assert.deepEqual(s.memories, V1.memories);
  assert.deepEqual(s.stats, V1.stats); assert.equal(s.story.rests, 1); assert.equal(s.story.playMs, 9000);
});
test('v2 saves are not migrated twice', () => {
  const once = CK.State.load(V1); once.story.newMoves = false;
  const twice = CK.State.load(JSON.parse(JSON.stringify(once)));
  assert.equal(twice.bits, 62); assert.equal(twice.story.newMoves, false); assert.equal(twice.learned.filter((x) => x === 'kill').length, 1);
});
test('a v1 save that never met Pip learns nothing new', () => {
  const s = CK.State.load({ v: 1, learned: [], seenIntro: true }); assert.deepEqual(s.learned, []); assert.equal(s.story.newMoves, false);
});
test('switches and signs survive a round trip and junk is dropped', () => {
  const s = CK.State.load({ v: 2, switches: ['f1', 7], signs: ['g7'] }); assert.deepEqual([s.switches, s.signs], [['f1'], ['g7']]);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test tests/ck/state.test.js`
Expected: FAIL, because `v` is 1 and `switches` is undefined.

- [ ] **Step 3: Implement in `js/ck/state.js`**

- `fresh()` adds `switches`, `signs` and `story.newMoves`.
- `load()` reads `switches` and `signs` with `strList`, and `story.newMoves === true`.
- Migration runs when `!(raw.v >= 2)`:
  - if `learned` includes `echo`, append `kill` and `trap` to `learned` and `codex` (no duplicates) and set `story.newMoves = true`;
  - if `upgrades` includes `cd-dash`, remove it and add 50 bits.
- Always return `v: 2`.

- [ ] **Step 4: Run the unit suite**

Run: `node --test tests/ck/`
Expected: all pass. Update any test that asserted `fresh().v === 1`.

- [ ] **Step 5: Commit**

```powershell
git add js/ck/state.js tests/ck/state.test.js
git commit -m "CK ch1: save v2 with a v1 migration - new moves for anyone who met Pip, cd-dash refunded"
```

---

### Task 4: Room generator and the extended room format

**Files:**
- Create: `js/ck/roomgen.js`
- Modify: `js/ck/rooms.js`
- Test: create `tests/ck/roomgen.test.js`, modify `tests/ck/rooms.test.js`

**Interfaces:**
- Consumes (Task 1–2): `region.cells`, `edges`, `nodes[*].kind/ref/dark/hidden`, `CREATURES[*].count`, `R.sideOf`, `R.LOOP_DOORS`.
- Produces:
  - `CK.RoomGen.build(region, nodeId) → string[17]`, each row 30 characters, deterministic.
  - `CK.RoomGen.SPAWN_LETTER = { glitchMite: 'm', loopWisp: 'w', bootGlitch: 'G', kernelWraith: 'K' }`.
- **New legend in `CK.Rooms.parse`:**
  - `=` bridge (walkable)
  - `_` retracted bridge (solid until `openBridge()`)
  - `!` switch (solid)
  - `t` terminal (solid)
  - `c` character spot (solid)
  - `p` pedestal (solid)
  - `*` memory crystal (solid)
  - `s` path sign (solid)
  - `b` corrupt block (solid, breakable)
  - `>` exit gate (walkable)
  - spawns `w`, `G`, `K` (walkable)
  - `D` is a door: solid unless `setDoor(side, 'open'|'loop')`. It defaults to solid, so the Training Room is unchanged.
- **Room additions:**
  - `room.doors: { [side]: { tiles: [[tx,ty],…] } }`. A door's side comes from its edge.
  - `room.props: [{ kind: 'npc'|'terminal'|'pedestal'|'crystal'|'sign'|'switch'|'block'|'gate', tx, ty, x, y }]`, where `x, y` is the tile centre.
  - `setDoor(side, kind)` and `doorKind(side)`.
  - `blocksShots(tx, ty)`: solid except `~` and `_`.
  - `openBridge()`: turns every `_` into `=`.
  - `clearTile(tx, ty)`: makes a tile floor and drops its prop.
- **Pure helpers:**
  - `CK.Rooms.doorAt(room, x, y) → side|null`: inside an `open`/`loop` door tile and within 6 px of the room edge.
  - `CK.Rooms.entryPoint(room, side) → {x, y}`: the door's centre, moved 2 tiles inward.
  - `CK.Rooms.nearestProp(room, x, y, reach, kinds) → prop|null`: distance from the point to the prop's tile rectangle must be ≤ reach.
- Consumed by: Task 5 (`blocksShots`, props), Task 9 (scene), Task 12/13 (flow).

- [ ] **Step 1: Write the failing tests**

`tests/ck/roomgen.test.js`:
```js
const test = require('node:test'); const assert = require('node:assert/strict');
for (const f of ['state', 'world', 'rules', 'rooms', 'roomgen']) require(`../../js/ck/${f}.js`);
const { World: W, Rules: R, Rooms, RoomGen } = globalThis.CK;
const all = W.REGIONS.flatMap((reg) => Object.keys(reg.nodes).map((id) => [reg, id]));
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };

test('every room is 30x17, parses, and is deterministic', () => {
  for (const [reg, id] of all) {
    const rows = RoomGen.build(reg, id); assert.equal(rows.length, 17, id); rows.forEach((r) => assert.equal(r.length, 30, id));
    Rooms.parse(rows); assert.deepEqual(RoomGen.build(reg, id), rows, id);
  }
});
test('doors match grid neighbours, on both sides', () => {
  for (const [reg, id] of all) {
    const room = Rooms.parse(RoomGen.build(reg, id));
    const want = R.neighbors(reg, id).map((nb) => R.sideOf(reg, id, nb)).sort();
    assert.deepEqual(Object.keys(room.doors).sort(), want, id);
    for (const nb of R.neighbors(reg, id)) assert.ok(Rooms.parse(RoomGen.build(reg, nb)).doors[OPP[R.sideOf(reg, id, nb)]], `${nb} has the matching door`);
  }
});
test('everything is reachable once doors are open and bridges extended', () => {
  for (const [reg, id] of all) {
    const room = Rooms.parse(RoomGen.build(reg, id)); Object.keys(room.doors).forEach((s) => room.setDoor(s, 'open')); room.openBridge();
    const reach = flood(room, room.player); // walkable tiles reachable from the default player tile
    for (const s of Object.keys(room.doors)) assert.ok(room.doors[s].tiles.some(([x, y]) => reach.has(x + ',' + y)), `${id} door ${s}`);
    for (const p of room.props) assert.ok(adjacentReach(reach, p), `${id} ${p.kind} at ${p.tx},${p.ty}`);
  }
});
test('rooms hold what their kind needs', () => {
  const count = (room, k) => room.props.filter((p) => p.kind === k).length;
  for (const [reg, id] of all) {
    const n = reg.nodes[id]; const room = Rooms.parse(RoomGen.build(reg, id));
    if (n.kind === 'start' || n.kind === 'character') assert.equal(count(room, 'terminal'), 1, id);
    if (n.kind === 'character') assert.equal(count(room, 'npc'), n.ref === 'pip' ? 0 : 1, id);
    if (n.kind === 'circuit') assert.equal(count(room, 'terminal'), 1, id);
    if (n.kind === 'item') assert.equal(count(room, 'pedestal'), 1, id);
    if (n.kind === 'memory') assert.equal(count(room, 'crystal'), 1, id);
    if (n.kind === 'exit') assert.equal(count(room, 'gate'), 1, id);
    if (n.kind === 'problem') assert.equal(room.spawns.length, W.CREATURES[n.ref.creature].count, id);
    if (n.kind === 'boss') assert.deepEqual(room.spawns.map((s) => s.kind), [n.ref.creature], id);
    if (!['problem', 'boss'].includes(n.kind)) assert.equal(room.spawns.length, 0, id);
  }
});
test('creatures spawn at least 6 tiles from every door', () => { /* Chebyshev distance spawn tile → every door tile >= 6 */ });
test('Power Rail has the echo gap: a switch beyond the retracted east bridge', () => {
  const room = Rooms.parse(RoomGen.build(W.REGIONS[0], 'f1'));
  const sw = room.props.find((p) => p.kind === 'switch'); assert.ok(sw && sw.tx >= 22);
  room.setDoor('e', 'open');
  assert.ok(!room.doors.e.tiles.some(([x, y]) => flood(room, room.player).has(x + ',' + y)), 'east door unreachable before the bridge');
  room.openBridge(); assert.ok(room.doors.e.tiles.some(([x, y]) => flood(room, room.player).has(x + ',' + y)));
});
test('initramfs has the path sign; corrupt blocks guard f2 and g2 crystals', () => {
  assert.equal(Rooms.parse(RoomGen.build(W.REGIONS[1], 'g7')).props.filter((p) => p.kind === 'sign').length, 1);
  for (const [r, id] of [[0, 'f2'], [1, 'g2']]) assert.ok(Rooms.parse(RoomGen.build(W.REGIONS[r], id)).props.some((p) => p.kind === 'block'), id);
});
```
Write the helpers `flood(room, {x,y})` (4-way BFS over `!room.solid`) and `adjacentReach(reach, prop)` (a reachable tile is 4-adjacent to the prop tile, or the prop tile itself is walkable) in the test file.

`tests/ck/rooms.test.js` additions:
```js
test('doors are solid until opened; doorAt and entryPoint', () => {
  const r = R.parse(R.TRAINING); assert.ok(r.solid(14, 0)); assert.deepEqual(Object.keys(r.doors), ['n']);
  r.setDoor('n', 'open'); assert.equal(r.solid(14, 0), false); assert.equal(r.doorKind('n'), 'open');
  assert.equal(R.doorAt(r, 15 * 16, 4), 'n'); assert.equal(R.doorAt(r, 15 * 16, 40), null);
  assert.deepEqual(R.entryPoint(r, 'n'), { x: 15 * 16, y: 2 * 16 + 8 });
});
test('shots fly over the void and retracted bridges but not walls', () => {
  const r = R.parse(['#~_=!', '.....']);
  assert.deepEqual([0, 1, 2, 3, 4].map((x) => r.blocksShots(x, 0)), [true, false, false, false, true]);
  assert.equal(r.solid(2, 0), true); r.openBridge(); assert.equal(r.solid(2, 0), false);
});
test('props list and nearestProp', () => {
  const r = R.parse(['.t..*', '.....', 'p.c.>']);
  assert.deepEqual(r.props.map((p) => p.kind), ['terminal', 'crystal', 'pedestal', 'npc', 'gate']);
  assert.equal(R.nearestProp(r, 24, 24, 10, ['terminal', 'npc']).kind, 'terminal');
  assert.equal(R.nearestProp(r, 72, 40, 10, ['terminal']), null);
});
```
`entryPoint` is the door's centre, 2 tiles inward: for the north door at cols 14–15 that is
x = 15·16 and y = row 2's centre.

- [ ] **Step 2: Run them to see them fail**

Run: `node --test tests/ck/roomgen.test.js tests/ck/rooms.test.js`
Expected: FAIL, with `Cannot find module '../../js/ck/roomgen.js'` and `doors` undefined.

- [ ] **Step 3: Extend `js/ck/rooms.js`**

- Add the legend and spawn kinds.
- A `D` tile belongs to the side whose edge it touches: row 0 → `n`, last row → `s`, column 0 → `w`, last column → `e`.
- `solid(tx, ty)` consults door kinds and the bridge state.
- Keep `TRAINING` and its tests unchanged.

- [ ] **Step 4: Implement `js/ck/roomgen.js`**

The layout follows the art direction (`TRAINING` is the model) and the tests:
- Row 0 is a back wall `#` over cols 3–26 with void corners.
- An irregular plaza, seeded from the node id (a string hash into `CK.rng`), floats over `~`.
- **Doors:**
  - `n`: `D` at cols 14–15 in the back wall.
  - `s`: cols 14–15 on row 16.
  - `w`: rows 7–8 on col 0.
  - `e`: rows 7–8 on col 29.
  - Each side door is joined to the plaza by a 2-wide `=` bridge.
- Landmarks (`H`/`T`) sit along the back wall, never in front of the north door.
- Blooms `&` and creep `%` are scattered from the seed.

Every room has exactly one `P` on the plaza: the default spot, used for fast travel and checkpoint
arrival. In `f1` it is west of the gap.

Content by kind:
- `start` and `character`: `t` near the back-left. An NPC `c` at the plaza's upper middle, unless the ref is `pip`.
- `circuit`: `t` at the centre-back.
- `item`: `p` at the centre.
- `memory`: `*` at the centre.
- `boss`: one spawn letter at the centre-top, no landmarks in the fight area.
- `problem`: `count` spawn letters on seeded floor tiles at least 6 tiles from every door and 2 from landmarks.
- `exit`: `>` on a 2×2 gate at the east edge, rows 7–8, joined by a bridge.

Special rooms:
- `f1`: the east bridge has its middle 4 columns as `_`, and a `!` switch sits on the far plaza tile above the bridge.
- `g7`: an `s` sign next to the west door.
- `f2` and `g2`: `b` blocks ring three sides of the crystal.
- Dark rooms need no tiles; the flag lives on the node.

- [ ] **Step 5: Run the unit suite**

Run: `node --test tests/ck/`
Expected: all pass, including the 32-room loops.

- [ ] **Step 6: Commit**

```powershell
git add js/ck/rooms.js js/ck/roomgen.js tests/ck/roomgen.test.js tests/ck/rooms.test.js
git commit -m "CK ch1: room generator - 32 rooms on the region grids with matching doors, props, spawns, the f1 echo gap and the g7 sign"
```

---

### Task 5: Action sim for chapter rooms

**Files:**
- Modify: `js/ck/action.js`
- Test: `tests/ck/action.test.js`

**Interfaces:**
- Consumes (Task 4): `room.blocksShots`, `room.props` (switch, block), `room.doors`.
- **Produces:** `CK.Action.create(opts)` with:
  - `opts.tools` (equipped)
  - `opts.upgrades` (string[])
  - `opts.mods = { cdMul, heatMul, moveMul, dashCdMul }` (default 1)
  - `opts.spawns` (overrides `room.spawns`)
  - `opts.breakables = [{ id, tiles: [[tx,ty]…] }]`
- **Input** gains `killHeld` (boolean).
- **New events:**
  - `heavy`
  - `charge`, when the `kill -9` charge is full
  - `break`, with `id`
  - `switch`, with `{tx, ty}`
- `s.hadFoes` (boolean).
- **`TUNING` additions:**
  - `KILL9_CHARGE: 0.6`, `KILL9_DMG: 40`, `KILL9_RANGE: 26`, `KILL9_ARC_DEG: 100`
  - `LS_REVEAL_A: 7`
  - `ECHO_N_MUL: 0.75`
- The Glitch Mite behaviour is unchanged in this task.

- [ ] **Step 1: Write the failing tests** (append; reuse the file's room helpers)

```js
test('a room with no foes never ends', () => {
  const s = A.create({ room, seed: 1, spawns: [] }); for (let i = 0; i < 120; i++) s.step(1 / 60, {});
  assert.equal(s.outcome, null); assert.equal(s.hadFoes, false); assert.ok(!s.events.some((e) => e.type === 'clear'));
});
test('mods scale move speed, dash cooldown, tool cooldowns and heat', () => {
  const s = A.create({ room, seed: 1, spawns: [], tools: ['echo'], mods: { moveMul: 1.2, dashCdMul: 0.75, cdMul: 0.85, heatMul: 0.7 } });
  const x0 = s.player.x; for (let i = 0; i < 30; i++) s.step(1 / 60, { mx: 1 }); assert.ok(Math.abs(s.player.x - x0 - 66) < 1, `${s.player.x - x0}`);
  s.step(1 / 60, { tool: 'echo', ax: 0, ay: -1 }); // cooldowns decay first, then the shot sets them
  assert.ok(Math.abs(s.cooldowns.echo - 0.35 * 0.85) < 1e-6); assert.ok(Math.abs(s.player.heat - 9 * 0.7) < 1e-6);
  s.step(1 / 60, { dash: true }); for (let i = 0; i < 9; i++) s.step(1 / 60, {});
  assert.ok(s.player.dashCd > 0 && s.player.dashCd <= 0.35 * 0.75 + 1e-6);
});
test('echo -n fires 25% faster', () => {
  const s = A.create({ room, seed: 1, spawns: [], tools: ['echo'], upgrades: ['echo-n'] });
  s.step(1 / 60, { tool: 'echo', ax: 0, ay: -1 }); assert.ok(s.cooldowns.echo <= 0.35 * 0.75 + 1e-6);
});
test('kill -9: hold 0.6 s, release, 40 damage', () => {
  const s = A.create({ room, seed: 1, upgrades: ['kill-9'], spawns: [{ kind: 'glitchMite', x: room.player.x, y: room.player.y - 18 }] });
  const e = s.enemies[0]; e.revealedUntil = 99; e.lungeTimer = e.shootTimer = 99; s.player.face = { x: 0, y: -1 };
  s.step(1 / 60, { kill: true, killHeld: true }); for (let i = 0; i < 40; i++) s.step(1 / 60, { killHeld: true });
  assert.ok(s.events.some((v) => v.type === 'charge')); s.step(1 / 60, { killHeld: false });
  assert.ok(s.events.some((v) => v.type === 'heavy')); assert.equal(e.dead, true);
});
test('kill -9 needs the upgrade', () => {
  const s = A.create({ room, seed: 1, spawns: [] }); for (let i = 0; i < 50; i++) s.step(1 / 60, { killHeld: true }); s.step(1 / 60, {});
  assert.ok(!s.events.some((v) => v.type === 'heavy' || v.type === 'charge'));
});
test('ls -a keeps creatures revealed for 7 s', () => {
  const s = A.create({ room, seed: 1, tools: ['ls'], upgrades: ['ls-a'] }); s.step(1 / 60, { tool: 'ls' });
  assert.ok(Math.abs(s.enemies[0].revealedUntil - s.time - 7) < 1e-6);
});
test('kill breaks a breakable in reach; echo does not', () => { /* breakables [{id:'b1', tiles:[[tx,ty]]}] one tile above the player: kill → 'break' b1 and the tile clears; a bolt at a second breakable → no 'break' */ });
test('echo bolts fly over the void and trip a switch', () => { /* parse ['.....', '..~~!', '.....'] style room: bolt from (0,1) east → 'switch' event at the ! tile */ });
```
Fill in the two stub tests with real rooms. For example, parse a 5×3 room and place the player
with `create({ room, spawns: [] })` and `s.player.x/y`. Assert the event and the room tile.

- [ ] **Step 2: Run them to see them fail**

Run: `node --test tests/ck/action.test.js`
Expected: FAIL, because `hadFoes` is undefined and mods are ignored.

- [ ] **Step 3: Implement in `js/ck/action.js`**

- `win` needs `hadFoes`.
- `mods` scale:
  - `MOVE` by `moveMul`;
  - `DASH_CD` by `dashCdMul`;
  - tool cooldowns by `cdMul`, and by `ECHO_N_MUL` with `echo-n`;
  - heat added by `heatMul`.
- `ls` reveal lasts `LS_REVEAL_A` with `ls-a`.
- **Charge:** while `killHeld`, with `kill-9` owned and not dashing, `chargeT += dt`. When it reaches the charge time, emit `charge` once. On release with the charge full, do a heavy swing (dmg, range and arc as tuned). Always reset on release.
- Swings hit breakables whose tile centre is in the arc: emit `break` and `room.clearTile` each tile.
- Bolts and player-owned orbs use `room.blocksShots` instead of `solid`. A bolt entering a `!` tile emits `switch` and is removed. A swing in reach of a switch also trips it.
- Enemy spawns come from `opts.spawns || room.spawns`.

- [ ] **Step 4: Run the unit suite**

Run: `node --test tests/ck/`
Expected: all pass, including the existing slice tests.

- [ ] **Step 5: Commit**

```powershell
git add js/ck/action.js tests/ck/action.test.js
git commit -m "CK ch1: action sim - module mods, echo -n, ls -a, kill -9 charge, breakables, switches, shots over the void"
```

---

### Task 6: Foes — Loop Wisps, both bosses, SIGKILL

**Files:**
- Create: `js/ck/foes.js`, `tests/ck/foes.test.js`
- Modify: `js/ck/action.js` (move the mite behaviour into `CK.Foes`)

**Interfaces:**
- `CK.Foes.make(kind, spawn, ctx) → enemy` and `CK.Foes.update(e, dt, ctx)`.
  - `ctx = { room, rng, player, time, slow, orb(o), ev(type, x, y, extra), floorPoint(minDist) }`.
- `CK.Foes.TUNING` holds `WISP`, `BOOT` and `WRAITH`.
  - The mite's tuning stays in `Action.TUNING.MITE`.
- **Enemy fields** (beyond the mite's):
  - `phase`
  - `maxHp` (from `World.CREATURES[kind].hp`)
  - `boss` (boolean)
  - `sigT`, the SIGKILL timer
- **Events:**
  - `blink`
  - `burst`
  - `phase`
  - `sigkill-tell` (with `r`, the ring radius, for the scene)
- SIGKILL orbs use `unparryable: true`. The existing `sigkill` event still fires when one hurts.
- `Action` delegates `updateEnemy` to `Foes.update`. Contact, parry and reflection stay in `action.js`.

**Tuning:**
- `WISP`:
  - `{ r: 8, blinkEvery: 2.5, blinkTell: 0.35, burstN: 8, orbSpeed: 90, orbDmg: 10, minDist: 48, contactDmg: 8 }`
- `BOOT`:
  - `{ r: 16, sweepSpeed: 60, fanEvery: 1.4, fanN: [3, 5], fanSpreadDeg: 30, orbSpeed: 100, orbDmg: 10, sigEvery: 6, sigTell: 0.8, sigN: 16, sigSpeed: 90, sigDmg: 18, contactDmg: 10 }`
- `WRAITH`:
  - `{ r: 20, blinkEvery: 2.2, blinkTell: 0.3, volley: 3, volleyGap: 0.15, orbSpeed: 120, orbDmg: 12, sigEvery: 5, sigTell: 0.8, sigN: 20, sigSpeed: 100, sigDmg: 20, contactDmg: 12 }`
- **Phase rule:** phase `i` (from 0) ends when `hp ≤ maxHp·(1 − (i+1)/phases)`.
  - On each new phase: `revealedUntil = 0` (re-cloak), speed ×1.3, emit `phase`.
  - The Boot Glitch fan grows to 5 in phase 2.

- [ ] **Step 1: Write the failing tests** (`tests/ck/foes.test.js`)

Use `CK.Rooms.parse` on an open 30×17 floor room. Spawn with
`Action.create({ room, seed, spawns: [{ kind, x, y }] })`. Step at 1/60 and read `s.events`.

```js
test('Loop Wisps blink away, then burst eight parryable orbs', () => { /* within 3 s: a 'blink' event, the wisp >= 48 px from the player, then a 'burst' event and 8 new orbs with unparryable=false */ });
test('a wisp burst can be dashed through', () => { /* place the player inside the burst ring, dash as the orbs arrive: stability unchanged */ });
test('the Boot Glitch fans 3 orbs, re-cloaks at half health and fans 5', () => { /* damage to 50%: 'phase' event, revealedUntil === 0, the next fan has 5 orbs */ });
test('SIGKILL: telegraph, then an unparryable ring; trap can’t catch it, dash can', () => {
  /* run until 'sigkill-tell'; within sigTell+0.1 s, 16 orbs with unparryable=true appear.
     Case A: parry pressed as they reach the player -> stability drops and a 'sigkill' event fires.
     Case B: dash as they reach the player -> stability unchanged. */
});
test('the Kernel Wraith has three phases and blinks', () => { /* phases 0->1->2 at 66%/33%; at least one 'blink' in 5 s */ });
test('bosses and wisps take hp from World.CREATURES', () => { /* bootGlitch 220, kernelWraith 300, loopWisp 40 */ });
test('kid mode slows every foe to 0.8x', () => { /* same seed, kid vs not: the wisp travel or boss sweep distance ratio is about 0.8 */ });
```
Each stub becomes concrete. For example, for the SIGKILL test: force `e.sigT` to a small value,
put the player 40 px away, step until the orbs are within 4 px, then set the input.

- [ ] **Step 2: Run them to see them fail**

Run: `node --test tests/ck/foes.test.js`
Expected: FAIL, with `Cannot find module '../../js/ck/foes.js'`.

- [ ] **Step 3: Implement `js/ck/foes.js`, and delegate to it from `action.js`**

- **Mite:** move the existing drift/shoot/tell/lunge code here. Behaviour is unchanged; the slice tests prove it.
- **Wisp:**
  - Blink to `floorPoint(minDist)` after a `blinkTell` shimmer: emit `blink` at both ends.
  - Then a radial burst of `burstN` orbs (`src: e.id`).
  - Not cloaked.
- **Boot Glitch:**
  - Sweeps horizontally across the upper third and bounces off walls.
  - Fires an aimed fan.
  - SIGKILL every `sigEvery`: emit `sigkill-tell`, wait `sigTell`, then a ring of `sigN` unparryable orbs.
  - Cloaked.
- **Kernel Wraith:**
  - Blinks with a tell, then fires a 3-orb aimed volley `volleyGap` apart.
  - SIGKILL as above.
  - Cloaked. 3 phases.
- **Kid mode:** `slow` scales movement and orb speeds (as for mites).
- **`floorPoint`:** samples seeded walkable tiles at least `minDist` from the player, with 30 tries, then falls back to the spawn point.

- [ ] **Step 4: Run the unit suite**

Run: `node --test tests/ck/`
Expected: all pass, including the slice action tests.

- [ ] **Step 5: Commit**

```powershell
git add js/ck/foes.js js/ck/action.js tests/ck/foes.test.js
git commit -m "CK ch1: foes - Loop Wisps, Corrupt Boot Glitch and Missing Kernel Wraith with phases and an unparryable SIGKILL ring"
```

---

### Task 7: Input — tool slots, use, hold to charge

**Files:**
- Modify: `js/ck/input.js`
- Test: `tests/ck/input.test.js`

**Interfaces:**
- **`mapKey(key)`:**
  - `'1'|'2'|'3'` → `'slot0'|'slot1'|'slot2'`
  - `'e'|'enter'` → `'use'`
  - `j` → `kill`, `k` → `trap`, Space/Shift → `dash`, arrows/WASD → move (unchanged)
- **`input.read()`** → `{ mx, my, mouse, kill, killHeld, trap, dash, use, tool }`.
  - `tool` resolves a slot through the list from the last `setTools(list)`.
  - `killHeld` is true while J or the left mouse button is down, or a finger is on the kill button.
- **`setTools(list)`** shows touch buttons only for listed tools: `echo` 📣, `ls` 🔦, `cd` 🌀.
- **`showUse(label|null)`** shows or hides a ✋ context button, with `aria-label` set to the label.
  - It sits above the action buttons, is at least 44 px, and its tap → `use`.
- **`clear()`** also clears `killHeld` and `use`.

- [ ] **Step 1: Write the failing tests**

```js
test('number keys are tool slots; E and Enter are use', () => {
  assert.deepEqual(['1', '2', '3', 'e', 'Enter', 'j', 'k', ' '].map(CK.Input.mapKey), ['slot0', 'slot1', 'slot2', 'use', 'use', 'kill', 'trap', 'dash']);
});
test('slot keys resolve through the equipped order', () => {
  assert.equal(CK.Input.slotTool(['ls', 'echo'], 'slot0'), 'ls'); assert.equal(CK.Input.slotTool(['ls'], 'slot2'), null);
});
```
Export `slotTool(list, slot)` as a pure helper. The DOM behaviour (`killHeld`, the touch `cd`
and use buttons, clear) is covered in Task 14's e2e.

- [ ] **Step 2: Run them to see them fail**

Run: `node --test tests/ck/input.test.js`
Expected: FAIL, because `mapKey('1')` returns `'echo'`.

- [ ] **Step 3: Implement**

- Key-up for `j`, and pointer-up/cancel on the canvas (button 0) and on the kill button, clear `killHeld`.
- `press('use')` is a one-shot like `kill`.
- Keep `stickVector` and the multi-touch handling unchanged.

- [ ] **Step 4: Run the unit suite**

Run: `node --test tests/ck/`
Expected: all pass.

- [ ] **Step 5: Commit**

```powershell
git add js/ck/input.js tests/ck/input.test.js
git commit -m "CK ch1: input - tool slots 1-3, E/Enter use with a touch context button, hold kill to charge"
```

---

### Task 8: Sprites and room art for the chapter

**Files:**
- Modify: `js/ck/sprites.js`, `js/ck/roomart.js`
- Test: `tests/ck/pixel.test.js`, `tests/ck/roomart.test.js`

**Interfaces:**
- **New `CK.Sprites.SET` keys.** Sizes are in px; each is a `{ rows }` grid in the existing palette.
  - Characters:
    - `bios` (24×28), `grub` (24×24), `liltux` (24×28)
  - Creatures (two frames each):
    - `wisp_0`, `wisp_1` (24×24)
    - `boot_0`, `boot_1` (48×48)
    - `wraith_0`, `wraith_1` (64×64)
  - Props:
    - `terminal`, `terminal_off` (16×24)
    - `pedestal` (16×16)
    - `mod_ram`, `mod_fan`, `mod_cpu`, `mod_ssd`, `bits` (12×12)
    - `crystal` (16×20)
    - `sign` (16×24)
    - `switch_off`, `switch_on` (16×16)
    - `crack` (16×16)
    - `block` (16×16)
    - `gate` (32×32)
    - `barrier` (16×16, a sealed-door field)
- **`CK.RoomArt.paint(room, opts)`** handles every legend character:
  - `=` as a bridge over the void, with cables hanging under it;
  - `_` as void with two stub ends;
  - props as ground plus `props` entries;
  - doors as floor, with the frames on the ground layer.
  - It also takes `opts.region` for accents.
- **`CK.RoomArt.TILES`**: a string with every legend character `paint` knows.

Art follows the spec's Sprites and Art direction:
- Bios: a guardian chip with an amber visor.
- Grub: a friendly lime grub in a tiny bootloader hat.
- Lil Tux: an original small penguin with an orange beak and feet.
- Wisps: violet looped flames with one eye.
- Boot Glitch: a cracked magenta boot-sector slab with a glitching core.
- Kernel Wraith: a hollow violet robe around a missing kernel-shaped hole.

All are original; none may copy another game's sprites.

- [ ] **Step 1: Write the failing tests**

```js
test('chapter sprites exist at their sizes and use palette keys only', () => {
  const S = CK.Sprites; const size = { bios: [24, 28], grub: [24, 24], liltux: [24, 28], wisp_0: [24, 24], boot_0: [48, 48], wraith_0: [64, 64], terminal: [16, 24], crystal: [16, 20], gate: [32, 32], switch_on: [16, 16] };
  for (const [k, [w, h]] of Object.entries(size)) { const p = CK.Pixel.parse(S.SET[k].rows, S.PALETTE); assert.deepEqual([p.w, p.h], [w, h], k); }
});
test('room art knows every tile in the legend', () => {
  for (const c of '#.,DPmo~&%HT=_!tcp*sb>wGK') assert.ok(CK.RoomArt.TILES.includes(c), c);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test tests/ck/pixel.test.js tests/ck/roomart.test.js`
Expected: FAIL, with `S.SET.bios` undefined.

- [ ] **Step 3: Implement the sprites and paint**

`Pixel.parse` already throws on unknown palette keys and ragged rows. Keep the grids readable,
using the `centre`/`patch` helpers.

- [ ] **Step 4: Run the unit suite**

Run: `node --test tests/ck/`
Expected: all pass.

- [ ] **Step 5: Commit**

```powershell
git add js/ck/sprites.js js/ck/roomart.js tests/ck/pixel.test.js tests/ck/roomart.test.js
git commit -m "CK ch1: original sprites for Bios, Grub, Lil Tux, wisps, both bosses and room props; bridges and gaps in room art"
```

---

### Task 9: Room scene for the whole world

**Files:**
- Modify: `js/ck/roomscene.js`

**Interfaces:**
- **`CK.RoomScene.create(o)`** keeps its slice options and adds callbacks:
  - `o.onDoor(side)`: once per crossing; latched until the Colonel leaves the door zone.
  - `o.onNear(prop|null)`: the nearest `npc`/`terminal`/`sign` within 20 px. It fires when the value changes.
  - `o.onTouch(prop)`: the Colonel is within 6 px of a `pedestal`, `crystal` or `gate` tile. Fires once per prop per room.
- **`scene.setRoom(v, slide)`**, where:
  - `v = { room, sim, accent, dark, glitched, npcs: [{ who, tx, ty }] }`;
  - `slide ∈ 'n'|'s'|'e'|'w'|null`. A 0.25 s slide, or a cut with reduced motion.
- **`scene.light(seconds)`**: lights a dark room.
- **`scene.flicker()`**: a 1.6 s flicker, skipped with reduced motion.
- **`scene.place(x, y)`**: debug only. Moves the Colonel and resets the door latch.
- **Drawing:**
  - doors by `room.doorKind(side)`: `open` as a glowing gap, `sealed` as a magenta `barrier`, `wall` as wall, `crack` as `crack`, `loop` as a looping lime glow;
  - props with their sprites, plus `switch_on` once the bridge is open;
  - NPCs, with breathing bob frozen under reduced motion;
  - wisp/boss sprites with phase flicker; the SIGKILL telegraph as a red ring with a pixel "9" glyph, for `sigkill-tell`;
  - the `charge` glint.
- **Darkness:** dark rooms get a darkness layer with holes around the Colonel (r 44) and Pip (r 28). It fades away for the duration of `light()`.
- **Glitched rooms:** static scanline offsets and a colour shift, drawn still with reduced motion.
- **Pause:** while `o.paused()`, call `input.clear()` every frame and don't step the sim.
  This is Review Focus 1.

- [ ] **Step 1: Add the scene behaviour**

Make the changes above. Reuse the slice's draw order and add props to the y-sort. The door
latch: `latched = side` after `onDoor`, cleared when `Rooms.doorAt` returns null.

- [ ] **Step 2: Verify through the existing slice e2e**

Run: `$env:NODE_PATH='C:\ClaudeBro\.pw\node_modules'; node tests/e2e/ck-slice.e2e.js`
Expected: all slice tests pass. The Training Room still renders, and its north door stays solid
because doors default to `wall`.

- [ ] **Step 3: Commit**

```powershell
git add js/ck/roomscene.js
git commit -m "CK ch1: room scene draws doors, props, NPCs, bosses, darkness, glitches and slide transitions with door/prop callbacks"
```

The scene's own behaviours (latch, darkness, transitions, pause clearing) are proven by the
Task 12–14 e2e tests that drive it through the real Adventure.

---

### Task 10: Adventure UI — action HUD, prompt, rotate screen, Pip's map

**Files:**
- Modify: `js/ck/ui.js`, `css/ck.css`
- Test: `tests/e2e/ck-ui.e2e.js` (rewrite the affected checks), `tests/e2e/ck-harness.html` (load `pixel`, `sprites`)

**Interfaces:**
- `ui.hud(state, { canRest })` is unchanged.
- **`ui.action(show)`** builds the action HUD row once: stability segments, heat, and one tool chip
  per equipped tool (`<kbd>1</kbd> echo` …), with glass backing as in the slice.
- **`ui.actionTick(sim, state)`** updates the bars and chip `--cd` and aria labels (slice logic). Call it at 10 Hz.
- **`ui.prompt(text|null)`**: a bottom-centre label (`E · Talk to Bios`), hidden on `(pointer: coarse)`.
- **`ui.rotate`**: a static `.ck-rotate` overlay inside the UI root, shown by CSS in portrait on coarse pointers. Its "Back to menu" button → `h.onExit`.
- **Pip panel tabs:** `quests`, `items`, `map`, `tasks`. The combat tab is removed.
- **Items tab:**
  - "Moves": `kill`, `trap` and dash are always on, with a one-line controls summary, plus the `kill -9` upgrade button.
  - "Tools": equip/unequip `echo`/`ls`/`cd`, plus the `echo -n` and `ls -a` upgrades.
  - Motherboard.
  - Codex.
  - Equip, unequip and buy are disabled while `h.inFight && h.inFight()`.
- **Map tab:** an HTML grid of region cells.
  - Each cell is a `<div role="img" aria-label="RAM Bank — fixed">` (or similar).
  - Class `lit` (current or cleared), `dim` (explored), or nothing (unknown). Unknown cells show no icon.
  - Icons are the kind glyphs; the current room gets `here`.
  - A legend list follows.
- **Portraits** use pixel sprites (`colonel_down_0`, `pip`, `bios`, `grub`, `liltux`), scaled ×2 with smoothing off.
- **Additive only in this task.** The old `main.js` still runs until Task 12, so `legend`,
  `skillBar`, `tick`, `select`, `tip`, the combat tab and the `CK.Art` portrait fallback (used
  only when `CK.Sprites` is missing) stay until Task 14 deletes them.
- `h` gains an optional `inFight()`.

- [ ] **Step 1: Rewrite the failing UI e2e checks**

In `tests/e2e/ck-ui.e2e.js`, keep every existing test (the old skill-bar and fight
checks go in Task 14, with the code they test). Add these:

- `action HUD shows stability, heat and one chip per tool`: after `ui.action(true)`, and
  `ui.actionTick` with a fake sim at stability 50/100, there are 5 lit segments and 2 chips.
- `Pip panel has Quests, Items, Map and Tasks`.
- `map tab marks here, lit, dim and unknown cells`: a state with `f0`, `f1` cleared and `f3`
  explored gives `f1.here.lit`, `f0.lit`, `f3.dim`, and `f9` with no class or icon.
- `items tab keeps moves always on and locks loadout in a fight`: with `inFight` → the equip
  buttons are disabled; `kill`/`trap` have no equip button.
- `learn uses the skill's own terminal responder`: `ui.learn('kill')`, type `kill -l` → the output
  includes `9) SIGKILL` and the skill is learned.
- `portrait is pixel art`: the dialogue canvas has non-transparent pixels and `CK.Art` is never
  called. Delete `CK.Art` in the harness before opening.
- `rotate overlay in portrait on a phone`: at 390×844, coarse → `.ck-rotate` is visible.

- [ ] **Step 2: Run to see it fail**

Run: `$env:NODE_PATH='C:\ClaudeBro\.pw\node_modules'; node tests/e2e/ck-ui.e2e.js`
Expected: FAIL, with `ui.action is not a function`.

- [ ] **Step 3: Implement**

- Move the slice HUD and rotate CSS onto `#ck-root .ck-act` and `#ck-root .ck-rotate`. Keep the
  slice rules until Task 14.
- Map grid squares are ≥ 44 px on touch (the map is read-only, but the cells are also its
  legend tooltip targets).

- [ ] **Step 4: Run the UI e2e and the unit suite**

Run: `$env:NODE_PATH='C:\ClaudeBro\.pw\node_modules'; node tests/e2e/ck-ui.e2e.js; node --test tests/ck/`
Expected: all pass.

- [ ] **Step 5: Commit**

```powershell
git add js/ck/ui.js css/ck.css tests/e2e/ck-ui.e2e.js tests/e2e/ck-harness.html
git commit -m "CK ch1: UI - action HUD, use prompt, rotate screen, Pip's map tab, moves vs tools in Items, pixel portraits"
```

---

### Task 11: Pixel rotation puzzle

**Files:**
- Create: `js/ck/puzzlescene.js`
- Test: `tests/e2e/ck-adventure.e2e.js` (create the file with a puzzle harness test), `tests/e2e/ck-harness.html`

**Interfaces:**
- `CK.PuzzleScene.create({ engine, canvas, grid, accent, sfx, onSolved, onLeave })` → a scene
  with `update`, `draw`, `resize` and `destroy`.
  - `grid` is the scrambled `CK.Puzzle` grid; it is mutated in place.
  - The board is drawn at 24 px per cell, centred in the buffer.
  - Tiles are pixel pipes: powered ones glow in the accent, the source and target are fixed.
- **Controls:**
  - tap or click a cell → `CK.Puzzle.rotate`;
  - arrows move a highlighted cursor;
  - Space/Enter rotates the cursor's cell;
  - Esc or the "Step away" HTML button → `onLeave()`.
- Solved → a 0.8 s glow, then `onSolved()`. With reduced motion there's no pulse.
- Debug: `CK._test.puzzle = { grid, solve() }`. `solve()` rotates every cell until `isSolved`.

- [ ] **Step 1: Write the failing e2e**

`tests/e2e/ck-adventure.e2e.js` uses the same skeleton as `ck-slice.e2e.js`: per-test 45 s
timeout, an `ONLY` filter and a `SHOTS` folder. Test `puzzle: tap rotates, keys rotate, solve
calls onSolved`. It opens the harness, mounts a `PixEngine` on a canvas with the
`PuzzleScene` for `World.REGIONS[0].nodes.f9.ref.grid` scrambled with `CK.rng(3)`, then:

1. clicks a non-fixed cell centre through `engine.toBuffer` → that cell's `r` changes;
2. presses ArrowRight then Enter → the next cell rotates;
3. calls `CK._test.puzzle.solve()` → `onSolved` is called within 1.5 s.

- [ ] **Step 2: Run to see it fail**

Run: `$env:NODE_PATH='C:\ClaudeBro\.pw\node_modules'; $env:ONLY='puzzle'; node tests/e2e/ck-adventure.e2e.js`
Expected: FAIL, with `CK.PuzzleScene` undefined.

- [ ] **Step 3: Implement `js/ck/puzzlescene.js`**

The scene adds its own pointer and key listeners and removes them in `destroy()`. Keys are
ignored while the event target is an input field.

- [ ] **Step 4: Run to see it pass**

Run: the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add js/ck/puzzlescene.js tests/e2e/ck-adventure.e2e.js tests/e2e/ck-harness.html
git commit -m "CK ch1: pixel circuit puzzle with tap, keyboard and a step-away button"
```

---

### Task 12: Room-based Adventure flow, part 1 — walking the world

**Files:**
- Rewrite: `js/ck/main.js`
- Modify: `index.html` (script tags in the order from the file map; old files stay loaded until Task 14), `js/ck/rules.js` (delete `quickFix`)
- Delete: `tests/e2e/ck-chapter.e2e.js` (its coverage moves to `ck-adventure.e2e.js` in Tasks 12–14)
- Test: `tests/e2e/ck-adventure.e2e.js`

**Interfaces:**
- `CK.open(h)` and `CK.close()` keep the hub contract `h = { root, player, save, addXP, giveBadge, sound, soundOn, speak, onExit }`.
- Debug: `CK._test.main = { state, room, sim, scene, input, sceneKind(), busy(), roomId, place(x, y), toDoor(side), clearFoes({ clean }), learning }`.
  - `sceneKind()` returns `'room'|'puzzle'|'none'`.
  - `toDoor(side)` places the Colonel on that door's outer half, so the real crossing code runs.
  - `clearFoes` kills foes through the sim's damage path. With `clean: false`, it first sets `hitsTaken = 1`.
- **Room flow:** `enterRoom(nodeId, fromSide)`:
  1. builds `Rooms.parse(RoomGen.build(region, nodeId))`;
  2. applies `R.doorStates` with `room.setDoor`;
  3. opens the bridge if `state.switches` includes the node;
  4. creates the sim: `tools = equipped`, `upgrades`, `mods = R.stats(state)`, `kid = player.kid`, `spawns = []` when the room is cleared, else `room.spawns`, `breakables = crack doors and block props`;
  5. calls `scene.setRoom(...)` with `slide = fromSide`.
- **Door crossing:** `onDoor(side)` → `R.move(state, doorStates[side].to)`. On success:
  1. `save()`;
  2. `enterRoom(to, opposite(side))`;
  3. the Colonel is placed at `Rooms.entryPoint(room, opposite(side))`;
  4. `arrive(...)`.
- **Pause:** `paused = away || portrait || ui.busy() || ui.pipOpen()`.
- `canRest` = a safe room (`start`/`character`), not glitched, and no live foes.

- [ ] **Step 1: Write the failing e2e tests** (in `ck-adventure.e2e.js`, against `index.html?ckdebug`, through the hub's Adventure button)

First add a helper, `openWith(page, ck)`. It writes a test player, whose `ck` is the given save
(or none, for a fresh player), through the same storage key and shape `js/game.js` uses. Then it
opens the Adventure from the hub. Tests that start mid-chapter seed a v2 save with the
`explored`/`cleared`/`learned` they need, rather than walking there.

- `opens in Cold Boot with the intro`: the banner shows `Firmware Foundry`; then Pip's dialogue;
  then `sceneKind()==='room'` and `roomId==='f0'`. Cold Boot is dark, so the canvas centre is
  brighter than the corners.
- `walks through a door into the next room`: `toDoor('e')` → within 1 s `roomId==='f1'` and
  `state.node==='f1'`, and the Colonel is near `entryPoint(room,'w')`.
- `Pip teaches kill at Power Rail`: entering f1 starts Pip's lines. Click through, type `kill -l`
  in the learning terminal → `state.learned` includes `kill`.
- `echo lesson at the gap; the switch extends the bridge for good`:
  1. place the Colonel 3 tiles from the gap → Pip's echo lines; type `echo hi` → `echo` is learned and equipped;
  2. aim at the switch and fire (`place` plus `sim.step` with a `tool: 'echo'` input through the scene) → a `switch` event, the bridge opens, and `state.switches` includes `f1`;
  3. leave and come back → the bridge is still open.
- `Bios teaches ls in the Firmware Vault`: type `ls` → learned.
- `memory crystal and module pedestal`: in `f2`, `clearFoes` isn't needed; break the blocks with
  kill presses through `input`, then walk onto the crystal → the memory is in `state.memories` and
  a toast appears. `f6` pedestal → `ram` installed and slots go to 3.
- `exit to GRUB Gate`: with `f12` cleared, walk onto the f13 gate → the banner shows
  `GRUB Gate`, `state.region==='grub'` and `roomId==='g0'`.
- `reload inside a sealed room resumes at the checkpoint`: enter `f5` (uncleared), reload the page,
  reopen the Adventure → `roomId` is the checkpoint (`f3`) and its doors are open.
- `v1 save loads into the new Adventure`: seed the player's saved `ck` with the Task 3 `V1`
  fixture through the same storage path `js/game.js` uses, then open → the toast includes
  `New moves`, Pip's line runs once, and reopening shows no toast.
- `overlays freeze the room and swallow their keys`: during the kill lesson, record
  `sim.time` and the Colonel's position, type `kill -l` plus Enter, and close the lesson → time
  didn't advance while it was open, there was no `swing`/`trap`/`dash` event, and the Pip panel
  open → time frozen.

- [ ] **Step 2: Run to see them fail**

Run: `$env:NODE_PATH='C:\ClaudeBro\.pw\node_modules'; node tests/e2e/ck-adventure.e2e.js`
Expected: FAIL. The old map opens, so `sceneKind()` returns `'map'`.

- [ ] **Step 3: Rewrite `js/ck/main.js`**

Keep these from the old file, adapted to rooms:
- `save`, `xp`, `sound`, `busy`, `claim`, BADGES;
- `wake` (rebreak/oddlog/taken), `breakReminder`, the play-time tick, visibility/pagehide resting;
- `meetLilTux`, `intro`, `memory`, `item`, `exit`.

Remove the map, `describe`, `quickFix`, `onSkill` on the map, and the old `fight`.

On open:
- `R.sanitize(State.load(player.ck))`;
- the checkpoint resume rule as today;
- `restedWhileAway`;
- if `story.newMoves`: toast `New moves: <code>kill</code>, <code>trap</code>, dash`, Pip says
  `You can do more than shoot now. kill up close, trap to catch what they throw, Space or » to
  dash.`, then clear the flag and save.

Lessons:
- **`f1`, first entry with `kill` not learned:** Pip's lines, then `ui.learn('kill')`, then a
  one-time tip toast `Space / » to dash`.
- **`f1` gap:** a trigger within 3 tiles of a `_` tile, with `echo` not learned. Pip says
  `See that switch across the gap? Lesson two: echo. In a terminal it repeats what you tell it.
  Down here it flies. Type it.`, then `ui.learn('echo')`.
- **Character rooms on first entry:** `bios` → `ls`, `grub` → `cd`, using their lines. If slots
  are full, use the existing swap choice for tools.

Interaction:
- `use`, or `kill` near an NPC with no live foes, → talk (the repeat lines as today).
- The prompt text comes from `onNear`.
- Pedestal, crystal and gate come from `onTouch`.
- Breakable `break` events: for a crack door, `room.setDoor(side, 'open')`.

- [ ] **Step 4: Run the e2e, the regression and the units**

Run each separately:
`$env:NODE_PATH='C:\ClaudeBro\.pw\node_modules'; node tests/e2e/ck-adventure.e2e.js`,
`node tests/e2e/lilnux-regression.e2e.js`, `node --test tests/ck/`
Expected: all pass. Delete any unit test that targets `quickFix`.

- [ ] **Step 5: Commit**

```powershell
git add -A js/ck/main.js js/ck/rules.js index.html tests/e2e/ck-adventure.e2e.js tests/e2e/ck-chapter.e2e.js tests/ck
git commit -m "CK ch1: room-based Adventure - walk Chapter 1 room to room with lessons, the f1 echo gap, items, memories and region exit"
```

---

### Task 13: Adventure flow, part 2 — fights, puzzles, tools and story

**Files:**
- Modify: `js/ck/main.js`
- Test: `tests/e2e/ck-adventure.e2e.js`

**Interfaces:**
- Consumes `R.clearRoom`, `R.doorStates(…, { bossFight })`, `R.travelTargets`, `R.fastTravel`,
  `CK.PuzzleScene`, `state.signs`, and the Task 6 events.

**Flow:**
- **Problem rooms:**
  - On the first entry to any problem room with `trap` not learned: Pip's trap lesson (the slice's
    `intro`/`parry` voice), then `ui.learn('trap')`. Creatures wake only after `busy()` ends.
  - On `clear`: `R.clearRoom(state, id, { clean: sim.clean })`; a toast (`🧼 Clean fix — no hits!
    +15 bits` or `⚔️ Room cleared! +10 bits`); then the teacher's `In real Linux:` line
    (`teacherOf(creature.weak)`); `claim()`; reapply door states.
- **Lose:**
  - the slice's lose line;
  - after 1.6 s: `state.node = checkpoint`, `prev = null`, `enterRoom(checkpoint, null)`;
  - the toast `💥 Stability lost — rebooting at the last checkpoint. Your loot is safe. Your
    dignity, less so. You’ve got this.`;
  - `stats.fights++` on each fight start, `wins++` on a clear.
- **Boss door:**
  - `onDoor` toward an uncleared boss opens the choice `☠ <name>` with `Fight!` / `Not yet`, and
    the `weakText`, plus the `ls`-not-equipped warning as today.
  - `Not yet` → the Colonel moves 1 tile back inward.
  - `Fight!` → move, then `enterRoom` with `bossFight` sealing every door until win or lose.
  - Win → `clear`, boss reward, `installModule(drop)`, region reward, badge, `outro`, the
    teacher's real line, and `claim`.
- **Circuit rooms:** `use` at the broken terminal → `PuzzleScene` with a scrambled grid.
  - Solved → `clear` plus the puzzle reward, back to the room, doors reapplied.
  - Step away → back to the room, still unsolved.
- **`cd` terminals:** in safe rooms, `use` at the terminal.
  - Not equipped → toast `🌀 Equip cd in Pip → Items to use terminals.`
  - Otherwise, a choice of `R.travelTargets` as `cd <Label_With_Underscores>`.
  - A pick → `R.fastTravel`, then `enterRoom(target, null)`, with the Colonel at `room.player`.
    Checkpoint reboots arrive there too.
- **Loop doors (`g7`):** `onDoor` on a `loop` side → the Colonel is put back at the entry point of
  the door the room was entered by. The first time, Pip says `We just… came back. Boot loop. Find the path sign and cd
  somewhere sensible.`
  - The sign `use` with `cd` equipped opens a choice:
    - `cd /boot`: right. Grub says `That’s it — /boot is where the kernel (vmlinuz) and initramfs
      live.`; `state.signs.push('g7')`; save; doors reapplied.
    - `cd /dev/null`: wrong. `/dev/null discards everything written to it. Including us, probably.`
    - `cd /loop/loop/loop`: wrong. `That directory doesn’t exist. Thankfully.`
- **`ls` in a room:** the sim emits `reveal`, then main runs `R.useOnMap(state, 'ls')`:
  - newly revealed hidden neighbours → reapply doors (a crack appears) and toast `🔦 ls -a found
    a cracked wall.`;
  - dark room → `scene.light(20)`.
- **Hidden caches:** a crack door, broken by `kill`, opens. Entering the item room pays bits as today.
- **Rest and story:**
  - 💤 in safe rooms runs the existing `S.rest`/`wake`.
  - `rebreak` makes that circuit room uncleared (its doors seal on the next visit).
  - `glitched` rooms render glitched.
  - Home: Lil Tux is an NPC until taken. Then the room is glitched with no NPC, and `use`
    there gives the cold-Home toast.
  - `flicker` → `scene.flicker()`.

- [ ] **Step 1: Write the failing e2e tests**

- `first problem room teaches trap, seals forward doors, the entry door stays open`: enter `f5`
  from `f3` → the trap lesson; then `room.doorKind('w')==='open'` and `n`/`s` are `sealed`.
- `back out of a problem room at once`: right after entering f5, `toDoor('w')` → back in `f3`,
  exactly one `R.move` happened (`state.prev==='f5'`, `node==='f3'`). Re-entering creates a fresh
  sim with 3 mites at full hp.
- `clean clear counts and pays the clean reward`: `clearFoes({clean:true})` → `stats.clean===1`,
  `bits` up 15, doors open.
- `losing reboots at the checkpoint with loot kept`: set the sim stability to 1, let an orb hit →
  after 2 s `roomId===state.checkpoint.node`, `bits` unchanged, toast shown.
- `circuit room opens the puzzle; solving opens the doors`: in f9, `use` at the terminal →
  `sceneKind()==='puzzle'`; `_test.puzzle.solve()` → back to `'room'`, f9 cleared, doors open.
- `boss door asks Fight!/Not yet`: from f10 `toDoor('s')` → the choice appears; `Not yet` → still
  in f10. Again with `Fight!` → in f12 with all doors sealed.
- `boss win installs the module, gives the badge and the outro`: `clearFoes` → `fan` installed,
  `giveBadge('ck-r1',…)` recorded by the harness hub stub, outro dialogue.
- `cd terminal fast-travels between visited safe rooms`: with `cd` equipped in GRUB, use the g1
  terminal → the options are exactly the visited safe rooms; pick `g0` → `roomId==='g0'`.
- `loop doors send you back until cd /boot at the sign`: in g7 `toDoor('e')` → still g7 near the
  entry; use the sign and pick `cd /boot` → `toDoor('e')` → g8.
- `ls -a reveals a cracked wall; kill opens it; the hidden cache pays bits`: own `ls-a`, pulse `ls`
  in f3 → `doorKind('n')==='crack'`; kill at the wall → `open`; walk to f14 → `bits` +20.
- `dark room lights up with ls`: in f4, the corner luminance is low → after pulsing `ls` it's
  higher for a moment.
- `rest at Home → taken cliffhanger → Chapter 1 badge`: meet Lil Tux, type `systemctl suspend`,
  rest → the `taken` dialogue, `ck-ch1` badge, `chapterDone`, Home glitched.
- `full Chapter 1 playthrough`: a fresh player, using only `toDoor`, `use`/kill presses,
  learning-terminal typing, `clearFoes` and `_test.puzzle.solve()`, follows
  f0→f1→f3→f5→f9→f10→f12→f13→g0→g1→g3→g7 (sign)→g8→g10→g12→g13. At Grub's full-slots
  choice it swaps out `echo` for `cd` (the Kernel Wraith needs `ls`). Then it rests →
  `chapterDone===true` and badges `ck-r1`, `ck-r2`, `ck-ch1`.

- [ ] **Step 2: Run to see them fail**

Run: `$env:NODE_PATH='C:\ClaudeBro\.pw\node_modules'; node tests/e2e/ck-adventure.e2e.js`
Expected: the Task 12 tests pass and these new ones fail.

- [ ] **Step 3: Implement the flow above in `js/ck/main.js`**

- [ ] **Step 4: Run the e2e, the regression and the units**

Run separately: `node tests/e2e/ck-adventure.e2e.js`,
`node tests/e2e/lilnux-regression.e2e.js`, `node --test tests/ck/`
Expected: all pass.

- [ ] **Step 5: Build a mid-point playtest zip** (keep going; don't wait for feedback)

```powershell
git archive --format=zip -o C:\ClaudeBro\LilNux-chapter1-preview.zip HEAD assets css index.html install-shortcut.sh js manifest.webmanifest play.sh README.md sw.js
```
Expected: the zip exists. Its size is about the same as the slice zip's plus the new files.

- [ ] **Step 6: Commit**

```powershell
git add js/ck/main.js tests/e2e/ck-adventure.e2e.js
git commit -m "CK ch1: fights, no-hit clean clears, boss doors, circuits, cd terminals, GRUB loop doors, ls -a cracks, dark rooms, rest and the cliffhanger"
```

---

### Task 14: Remove the old Adventure; wiring, cache and touch checks

**Files:**
- Delete: `js/ck/engine.js`, `js/ck/scenes.js`, `js/ck/combat.js`, `js/ck/art.js`, `js/ck/slice.js`, `tests/ck/combat.test.js`, `tests/e2e/ck-engine.e2e.js`, `tests/e2e/ck-scenes.e2e.js`, `tests/e2e/ck-slice.e2e.js`, `tests/e2e/ck-slice-harness.html`
- Modify:
  - `index.html`: final script list; remove the Training Room hub button.
  - `js/game.js`: remove `openSlice` and its route.
  - `js/ck/world.js`: drop the old node `x, y` and `fight` fields if nothing reads them.
  - `css/ck.css`: delete `#ck-slice` and old map/fight rules.
  - `sw.js`: `VERSION = 'lilnux-v9'`; FILES updated.
  - `tests/e2e/ck-harness.html`.
- Create: `tests/ck/wiring.test.js`
- Test: `tests/e2e/ck-adventure.e2e.js` (port the slice's device checks)

- [ ] **Step 1: Write the failing wiring test**

```js
const fs = require('node:fs'); const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
test('every CK script in index.html exists and is cached by the service worker', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const srcs = [...html.matchAll(/src="(js\/ck\/[^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(srcs.map((s) => s.split('/').pop().replace('.js', '')), ['state', 'world', 'rules', 'story', 'puzzle', 'pixel', 'sprites', 'rooms', 'roomgen', 'roomart', 'foes', 'action', 'input', 'pixengine', 'roomscene', 'puzzlescene', 'ui', 'main']);
  for (const s of srcs) { assert.ok(fs.existsSync(path.join(ROOT, s)), s); assert.ok(sw.includes(`'${s}'`) || sw.includes(`"${s}"`), `sw caches ${s}`); }
  assert.match(sw, /lilnux-v9/);
  for (const gone of ['engine', 'scenes', 'combat', 'art', 'slice']) assert.ok(!sw.includes(`js/ck/${gone}.js`), gone);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/ck/wiring.test.js`
Expected: FAIL, because the script list still has `combat`, `engine`, …

- [ ] **Step 3: Delete, rewire, bump the cache**

Also delete the old UI pieces Task 10 kept: `legend`, `skillBar`, `tick`, `select`, `tip`, the
combat tab, the `CK.Art` portrait fallback, and their old checks in `ck-ui.e2e.js`.

Then grep for `CK.Engine`, `CK.Scenes`, `CK.Art`, `CK.Combat` and `openSlice` → zero hits
outside `docs/`.

- [ ] **Step 4: Port the device checks into `ck-adventure.e2e.js`** (from `ck-slice.e2e.js`, now on the Adventure)

- `touch pad on a phone: buttons ≥ 44 px inside the safe area, only equipped tools shown, use
  button appears near an NPC`;
- `multi-touch: stick and kill at once, lift one, the other keeps working`;
- `rotate and blur freeze a boss fight`: in f12, rotate to portrait → the rotate screen is
  visible, `sim.time` is frozen over 1 s and held input is cleared; back to landscape → it
  resumes. Window blur behaves the same;
- `engine scale at PC and iPhone landscape`: 1920×1080 → k 4, buffer 480×270; 2556×1179 at dpr
  3 → k 4;
- `hint and cooldown chips` (the slice's chip `--cd`/aria test, on the Adventure HUD).

- [ ] **Step 5: Run everything**

Run each separately:
`node --test tests/ck/`, `node tests/e2e/ck-ui.e2e.js`, `node tests/e2e/ck-adventure.e2e.js`,
`node tests/e2e/lilnux-regression.e2e.js`
Expected: all pass.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "CK ch1: retire the old map Adventure and the Training Room button; cache lilnux-v9; device checks on the new Adventure"
```

---

### Task 15: Handoff docs and the playtest zip

**Files:**
- Modify:
  - `docs/HANDOFF.md`: Adventure is room-based; the landscape-on-phones hard rule; `lilnux-v9`; the new files; how to run the e2e suites.
  - The spec's §10: one line noting the `ck-chapter1` branch and this plan.

- [ ] **Step 1: Update the docs**

The HANDOFF gets a "Hard rules" line, written exactly: **Adventure is landscape on phones; Learn
stays portrait.** Also replace `lilnux-v6` with `lilnux-v9`.

- [ ] **Step 2: Final full run**

Run: `node --test tests/ck/`, then each e2e file separately.
Expected: all pass. Record the counts in the final message.

- [ ] **Step 3: Commit and build the zip**

```powershell
git add docs
git commit -m "CK ch1: handoff notes for the room-based Adventure"
git archive --format=zip -o C:\ClaudeBro\LilNux-chapter1.zip HEAD assets css index.html install-shortcut.sh js manifest.webmanifest play.sh README.md sw.js
```
Expected: the zip exists. Then hand off to superpowers:finishing-a-development-branch. Never
merge or push without the user's "push it".
