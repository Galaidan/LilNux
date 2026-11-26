# Cyberpunk start screen & hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Welcome (pick-a-player) screen and the hub into the dark "Circuit Void" cyberpunk look, with a live Tron circuit field and a synthesized synthwave-techno loop.

**Architecture:** A new self-contained `js/start-fx.js` owns the animated canvas field and the music (pure, unit-testable simulation/music-score functions + a small DOM/Web Audio runtime). A new `css/entry.css` holds the dark theme, scoped to `body[data-screen="entry"]`, which `go()` in `js/game.js` sets on the `players` and `hub` views (and mounts/unmounts the FX). Screen markup for `renderPlayers` / `renderHub` is restyled in place; existing selectors stay stable.

**Tech Stack:** Plain HTML/CSS/JS (no build, no deps), Web Audio, Canvas 2D, `node --test` unit tests, Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-11-26-cyberpunk-start-screen-design.md`. **Visual + audio source of truth (port values from it):** `docs/superpowers/specs/2026-11-26-cyberpunk-start-screen-mockup.html`.

## Global Constraints

- Always dark on the `players` and `hub` views, whatever the OS/`data-theme`; every other view keeps today's light/dark look.
- No audio files; music is Web Audio only. The top-bar 🔊 (`S.sound`) is the only music switch. No audio before a user gesture; never if `S.sound` is false.
- Music plays only while the `players` or `hub` view is showing; it must never overlap the Adventure's room tone.
- Reduced motion: no moving runners/tracers/glitch/flicker; a static circuit field instead.
- Touch targets ≥ 44 px on both screens (including ✏️/🗑️).
- Keep these selectors working: `input[name=name]`, `#pform button[type=submit]`, `.hub-card.learn`, `.hub-card.adventure`, `.hub-card.learn [data-go=map]`, `.mode-switch [data-go=map|kernel]`, `[data-act=sound]`, `.hub-preview`, `[data-play]`, `[data-edit]`, `[data-del]`.
- Privacy: no names/ages of the family in files, test data, or commits (use "Sam", "Mom", "Dad" placeholders only).
- Bump `VERSION` in `sw.js` to `lilnux-v14` (done in Task 1); new files go in `index.html` and the `sw.js` `FILES` list.
- Palette (exact): void `#060b18`, panel `#0e1a30`, line `#1c3454`, ink `#e8fbff`, muted `#7e9bbe`, teal `#39d7c4`, violet `#b44dff`, mint `#8ff6d6`.
- Tagline (exact): `Crack the machine, level up, save the day. <b>No pressure.</b>` Section kicker: `// who is awake?`. New-player panel title: `+ new recruit`, name placeholder `What should we call you?`, submit button text `Begin ▸` (editing: `Save`).
- Git: work on branch `cyberpunk-start`; commit identity is repo-local (Galaidan noreply); no attribution lines; never push without the user's OK.

## Review Focus

1. **Saved sound is off** → no `AudioContext` is ever created, `body[data-music]` is `off`, the hint is hidden. (Task 2, Task 3)
2. **Fast navigation churn** (players → hub → map → hub, or `mount()` called twice) → exactly one canvas pair, one render loop, one `AudioContext`; nothing leaks after `unmount()`. (Task 2, Task 3)
3. **First tap goes straight through** (e.g. tapping a mode card immediately) → no blip of music. (Task 2)
4. **Tab hidden then shown** → loop and audio pause, then resume only if music was wanted. (Task 2)
5. **OS or saved theme is light** → entry screens still dark and the app is light again after leaving; Adventure entry stops the music. (Task 3)
6. **Small screens / many players**: 320 px wide, 8 players with 20-character names → no horizontal scroll, all controls ≥ 44 px. (Task 4)

## File Structure

| File | Responsibility |
|---|---|
| `js/start-fx.js` (new) | `window.StartFX`: pure `music` + `field` helpers, and runtime `mount/unmount/setSound/isMounted/_debug` |
| `css/entry.css` (new) | dark theme + embossed buttons + lightbars + centered layouts for both entry screens |
| `js/game.js` | `go()` sets `data-screen` and mounts/unmounts the FX; sound toggle calls `StartFX.setSound`; `renderPlayers`/`renderHub` markup + copy |
| `index.html`, `sw.js` | load/cache the two new files; `VERSION` → `lilnux-v14` |
| `tests/ck/startfx.test.js` (new) | unit tests for the pure helpers |
| `tests/e2e/start-screen.e2e.js` (new) | runtime, wiring, theming, layout, touch-target tests |
| `tests/ck/wiring.test.js` | assert new files wired + `lilnux-v14` |

**Execution notes (model choice):** Tasks 1–5 port working code from the mockup and are fine on Sonnet. Task 6 ends with one fresh whole-branch review — run that reviewer on **Opus**.

---

### Task 1: Pure core (`StartFX.music`, `StartFX.field`) + file wiring

**Files:**
- Create: `js/start-fx.js` (pure part only), `css/entry.css` (empty stub comment), `tests/ck/startfx.test.js`
- Modify: `index.html` (add `<link rel="stylesheet" href="css/entry.css">` after `css/ck.css`; add `<script src="js/start-fx.js"></script>` immediately before `js/game.js`), `sw.js` (`VERSION = 'lilnux-v14'`; add `'js/start-fx.js'`, `'css/entry.css'` to `FILES`), `tests/ck/wiring.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces (module pattern: `(function (root) { 'use strict'; … root.StartFX = … })(typeof window !== 'undefined' ? window : globalThis)`, same as `js/ck/rules.js`; nothing may touch `document`/`window` at load):
  - `StartFX.music = { BPM: 118, STEPS_PER_BAR: 16, LOOP_STEPS: 64, CHORDS, midiToHz(m): number, stepEvents(step: int): Array<{kind: 'kick'|'hat'|'bass'|'arp'|'pad', midi?: number}> }`
  - `StartFX.field = { CELL: 38, TRAIL_MAX: 22, makeRng(seed: int): () => number, counts(W: number, H: number): {runners: int, traces: int, nodes: int}, makeTraces(rng, cols: int, rows: int, count: int): Array<{color: 'teal'|'violet'|'mint', pts: Array<[int, int]>}>, makeRunner(rng, W, H): Runner, stepRunner(r: Runner, dt: number, rng): boolean, runnerAlpha(r): number, makeNode(rng, W, H): Node, stepNode(n: Node, dt: number): boolean, nodeAlpha(n): number }` where `Runner = {x, y, dir: [dx, dy], color, trail: Array<[x, y]>, life, max, speed, turnEvery, sinceTurn}` and `Node = {x, y, color, life, max, r}`; both `step*` return `true` while the entity is alive.

Values the implementer must use (from the mockup): `CHORDS` = Am `{bass: 45, arp: [57,60,64,69], pad: [57,60,64]}`, F `{41, [53,57,60,65], [53,57,60]}`, C `{48, [60,64,67,72], [60,64,67]}`, G `{43, [55,59,62,67], [55,59,62]}`. Per step `s` (bar = `floor(s/16) % 4`, `i = s % 16`): `kick` when `i % 4 === 0`; `hat` when `i % 4 === 2`; `bass` (midi = chord bass) when `i % 2 === 0`; an `arp` event every step with midi = `chord.arp[i % 4]`; one `pad` event per pad note only when `i === 0`. `counts`: `runners = clamp(round(W*H/95000), 6, 14)`, `traces = min(40, round(W*H/40000) + 6)`, `nodes = 8`. Runner: speed 46–101 px/s, `max` 4–10 s, `turnEvery` 0.45–1.35 s, fade-in 0.5 s, fade-out 0.8 s after `max`; dies when out of bounds by > 50 px; at each turn it snaps `x` and `y` to multiples of `CELL` and switches axis. Node: `max` 1.5–3.9 s, fade-in over the first 30 % of `max`, fade-out 0.6 s after `max`, `r` 3–7.

- [ ] **Step 1: Write the failing unit tests** in `tests/ck/startfx.test.js` (`node:test`, `require('../../js/start-fx.js')`, use global `StartFX`). Test names and assertions:
  - `music: loops every 64 steps` — `deepEqual(stepEvents(5), stepEvents(69))`.
  - `music: step 0 has kick, bass and three pad notes` — kinds include `kick`, `bass`, `arp`; exactly 3 `pad` events with midi `[57,60,64]`.
  - `music: step 2 has a hat and no kick` ; `step 1 has no bass` ; `pads only on step 0 of a bar` (`stepEvents(16)` has 3 pads with midi `[53,57,60]`).
  - `music: arp walks the chord` — arp midi for steps 0..3 equals `[57,60,64,69]`; steps 16..19 equals `[53,57,60,65]`.
  - `music: midiToHz(69) === 440` and `midiToHz(57) === 220`.
  - `field: counts are clamped` — `counts(390, 844).runners === 6`, `counts(3000, 2000).runners === 14`, `counts(3000, 2000).traces === 40`, `counts(390, 844).nodes === 8`.
  - `field: makeRng is deterministic` — two rngs with seed 7 give identical first 5 values; seed 8 differs; values in `[0, 1)`.
  - `field: makeTraces is deterministic and in bounds` — same seed → deepEqual; every point has `0 ≤ x ≤ cols`, `0 ≤ y ≤ rows`; every segment is axis-aligned (consecutive points share x or y); `color` ∈ the three names; count honoured.
  - `field: runner trail is capped` — step a runner 200 times with `dt = 0.016`; `trail.length <= TRAIL_MAX`.
  - `field: runner snaps to the grid when it turns` — step until `sinceTurn` resets; `x % CELL === 0` and `y % CELL === 0` at that moment, and the direction axis flipped.
  - `field: runner dies and fades` — with `dt = 0.05` it returns `false` eventually; `runnerAlpha` is 0 at `life = 0`, 1 mid-life, and 0 after `max + 0.8`.
  - `field: node lifecycle` — `nodeAlpha` rises from 0, reaches 1, and `stepNode` returns `false` once `life > max + 0.6`.
  - Update `tests/ck/wiring.test.js`: assert `index.html` contains `js/start-fx.js` before `js/game.js` and `css/entry.css`; `sw.js` includes both strings; replace the version assertion with `/lilnux-v14/`.
- [ ] **Step 2: Run to confirm failure.** `export NODE_PATH='C:\ClaudeBro\.pw\node_modules'; node --test tests/ck/startfx.test.js` → FAIL (module missing). `node --test tests/ck/wiring.test.js` → FAIL.
- [ ] **Step 3: Implement the pure part of `js/start-fx.js`** per the Interfaces block (use a small mulberry32-style seeded generator for `makeRng`; traces use the same turn/segment logic as `drawTrace` in the mockup, returning grid coordinates instead of drawing). Create the empty `css/entry.css` stub; apply the `index.html` / `sw.js` edits.
- [ ] **Step 4: Run all unit tests.** `node --test tests/ck/` → all pass (173 existing + the new ones).
- [ ] **Step 5: Commit.** `git add js/start-fx.js css/entry.css tests/ck/startfx.test.js tests/ck/wiring.test.js index.html sw.js docs/superpowers && git commit -m "Start screen: pure Tron field + synthwave score core, wired in (cache v14)"` (this also commits the design doc, mockup and this plan).

---

### Task 2: StartFX runtime (canvas, loop, music, lifecycle)

**Files:**
- Modify: `js/start-fx.js` (add runtime)
- Test: `tests/e2e/start-screen.e2e.js` (create; follow the launch/`pg`/`failed` conventions of `tests/e2e/lilnux-regression.e2e.js`; print `ERRORS []` and exit non-zero on failure)

**Interfaces:**
- Consumes: Task 1's `StartFX.music` / `StartFX.field`.
- Produces: `StartFX.mount({ soundOn: () => boolean }): void` · `StartFX.unmount(): void` · `StartFX.setSound(on: boolean): void` · `StartFX.isMounted(): boolean` · `StartFX._debug(): { running: boolean, contexts: number, musicOn: boolean, runners: number, nodes: number, canvases: number }`. While mounted, the runtime sets `document.body.dataset.music` to `'waiting'` (sound on, music not started yet), `'on'`, or `'off'` (sound off), and removes the attribute on `unmount()`.

Behaviour to implement (port the drawing from the mockup's field script and the audio from its music script, replacing its inline scheduling with `music.stepEvents`):
- `mount` is idempotent. It appends `<canvas id="start-grid" class="start-bg" aria-hidden="true">` (static traces from `makeTraces`, seeded so a resize repaints the identical circuit; resize debounced 150 ms) and `<canvas id="start-fx" class="start-bg" aria-hidden="true">` (runners + nodes, DPR capped at 2) to `document.body`, and starts one `requestAnimationFrame` loop. With `prefers-reduced-motion: reduce` it draws static nodes once and never starts the loop.
- One lazily created `AudioContext` for the page's life (`webkitAudioContext` fallback); it is never closed, only `suspend()`ed, so iOS keeps working. Nothing audio is created before the first `pointerdown`/`keydown`. 300 ms after that first gesture it starts the loop only if still mounted and `soundOn()`; master gain fades in over 0.6 s to 0.2. Scheduler: 118 BPM sixteenths, 0.12 s lookahead, 26 ms timer; a feedback delay (3 sixteenths, feedback 0.28, wet 0.33) on arps — as in the mockup.
- `setSound(false)` fades out in 0.4 s then suspends the context; `setSound(true)` while mounted after a gesture resumes and fades in. `unmount()` fades out, stops the timer and rAF loop, removes both canvases and the `data-music` attribute and the gesture listeners.
- `visibilitychange` hidden → stop the rAF loop and suspend the context; visible → restart the loop and resume audio only if music is wanted.

- [ ] **Step 1: Write the failing e2e tests** (each loads `index.html` with a seeded save via `page.addInitScript` that sets `localStorage['lilnux.save.v1']` to `{players:[{id:'p1',name:'Sam',avatar:'🐧',kid:false,xp:0,worlds:{},quests:{},badges:[],unlockAll:false,sandboxCount:0}],current:'p1',sound:true}`; patch `window.AudioContext` in an init script to count constructions; call `StartFX.mount` directly via `pg.evaluate` so this task is independent of Task 3 wiring):
  - `mounts one canvas pair and runs` — after `mount`, `_debug().canvases === 2`, `running === true`, `runners > 0` within 1.5 s; both canvases are `position: fixed`.
  - `mount twice is one pair` — `mount(); mount(); mount();` → `canvases === 2`; `unmount(); mount();` → still 2 (Review Focus 2).
  - `no audio before a gesture` — after `mount`, AudioContext count is 0 and `body.dataset.music === 'waiting'`.
  - `first tap starts music once, after a short delay` — `pg.mouse.click(10,10)`; at +100 ms the count is still 0; at +600 ms it is 1 and `data-music === 'on'`; a second click keeps it at 1.
  - `tap straight through → no music` — `mount(); click(10,10); unmount();` then wait 800 ms → count is 0 (Review Focus 3).
  - `sound off never plays` — `mount({soundOn: () => false})`; click; wait 800 ms → count 0 and `data-music === 'off'` (Review Focus 1).
  - `setSound toggles` — after music is on, `setSound(false)` → `data-music === 'off'` and `_debug().musicOn === false`; `setSound(true)` → `'on'`.
  - `unmount cleans up` — `canvases === 0`, `running === false`, `data-music` undefined, and `requestAnimationFrame` callbacks stop (runner count stops changing).
  - `hidden tab pauses` — dispatch `visibilitychange` with `document.hidden` overridden to `true` → `running === false`; back to `false` → `running === true` (Review Focus 4).
  - `reduced motion draws no runners` — `pg.emulateMedia({reducedMotion:'reduce'})` before load; after `mount`, `running === false` and `runners === 0` but `nodes > 0`.
- [ ] **Step 2: Run to confirm failure.** `node tests/e2e/start-screen.e2e.js` → fails (`StartFX.mount` undefined).
- [ ] **Step 3: Implement the runtime in `js/start-fx.js`** as specified above. Add `.start-bg { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; }`, `#start-grid { z-index: 0 }`, `#start-fx { z-index: 1 }` to `css/entry.css` (the `main`/`topbar` must stack above: `#app, #top { position: relative; z-index: 2 }` scoped to `body[data-screen="entry"]` in Task 3).
- [ ] **Step 4: Run e2e and unit tests.** `node tests/e2e/start-screen.e2e.js` → all pass, `ERRORS []`; `node --test tests/ck/` still green.
- [ ] **Step 5: Commit.** `git add js/start-fx.js css/entry.css tests/e2e/start-screen.e2e.js && git commit -m "Start screen: StartFX runtime (Tron canvas field, gesture-gated synthwave loop, lifecycle)"`

---

### Task 3: Shell wiring + always-dark theme

**Files:**
- Modify: `js/game.js` (`go()`; the `data-act === 'sound'` handler; optionally `renderTop`), `css/entry.css`
- Test: `tests/e2e/start-screen.e2e.js` (extend)

**Interfaces:**
- Consumes: `StartFX.mount({soundOn})`, `StartFX.unmount()`, `StartFX.setSound(on)`, `StartFX.isMounted()`.
- Produces: `document.body.dataset.screen === 'entry'` while the `players` or `hub` view is showing (removed on every other view). The theme is a block in `css/entry.css` that, on `body[data-screen="entry"]`, overrides the design tokens (`--bg --bg2 --panel --ink --muted --line --brand --brand-dark --accent --shadow`, `color-scheme: dark`) with the palette above so the top bar, player chip and every component restyle automatically; `#app` and `#top` get `position: relative; z-index: 2`.

- [ ] **Step 1: Write the failing e2e tests:**
  - `entry views are marked and mounted` — new player flow lands on `hub`: `body[data-screen] === 'entry'`, `StartFX.isMounted() === true`, two canvases; click `.hub-card.learn [data-go=map]` → `data-screen` undefined, `isMounted() === false`, canvases 0.
  - `churn: players → hub → map → hub` — via `go`-triggering clicks (`.player-chip`, `.brand`, `.mode-switch [data-go=map]`); at every point `canvases` is 0 or 2, never 4; AudioContext constructions ≤ 1 (Review Focus 2).
  - `adventure entry stops the music` — start music (click), then click `.mode-switch [data-go=kernel]` → `data-music` undefined and `_debug().musicOn === false` (Review Focus 5).
  - `top-bar sound switch controls music` — click `[data-act=sound]` → `data-music === 'off'` and saved `sound === false`; click again → back to `'on'`/`'waiting'`.
  - `saved sound off` — seeded `sound:false`: reload → `data-music === 'off'`, zero AudioContexts after a click + 800 ms (Review Focus 1).
  - `always dark` — `pg.emulateMedia({colorScheme:'light'})` and `document.documentElement.dataset.theme = 'light'` (set via `pg.evaluate`): on hub `getComputedStyle(document.body).backgroundColor` is dark (each of r, g, b < 40); after going to the map the body background is light (each > 200); `data-screen` gone (Review Focus 5).
- [ ] **Step 2: Run to confirm failure.**
- [ ] **Step 3: Implement.** In `go()`, once `where` is final: if `where` is `'players'` or `'hub'`, set `document.body.dataset.screen = 'entry'` and `StartFX.mount({ soundOn: () => S.sound })` if not already mounted; otherwise `delete document.body.dataset.screen` and `StartFX.unmount()`. In the `sound` action handler, call `StartFX.setSound(S.sound)` after saving. Write the theme block in `css/entry.css`.
- [ ] **Step 4: Run e2e + unit + `node tests/e2e/lilnux-regression.e2e.js`** (must still print `ERRORS []`).
- [ ] **Step 5: Look at it.** Screenshot hub and players at 390×844 via Playwright (`SHOTS=` folder), confirm by eye the whole page is dark with no bright strip (top bar included).
- [ ] **Step 6: Commit.** `git add js/game.js css/entry.css tests/e2e/start-screen.e2e.js && git commit -m "Start screen: entry views mount the FX and force the dark Circuit Void theme"`

---

### Task 4: Welcome screen restyle (`renderPlayers`)

**Files:**
- Modify: `js/game.js` (`renderPlayers` markup + copy), `css/entry.css`
- Test: `tests/e2e/start-screen.e2e.js` (extend)

**Interfaces:**
- Consumes: Task 3's dark tokens; selectors from Global Constraints.
- Produces: centered markup — `section.entry-hero` (`.hero-tux`, `h1.entry-title` rendering `Lil<span class="nx">Nux</span>`, `p.entry-tag` with the exact tagline, `p.music-hint`), `h2.sec.kicker`, `.players` (centered flex; each `.player` keeps `.player-main[data-play]` with a `.ring` around the avatar, plus `.player-tools` as a row under the card with 44 px `.mini[data-edit]`/`.mini[data-del]`), the `form#pform.panel.add-player` (centered, copy per Global Constraints), `.note`. Lightbars are `#app::before` / `#app::after` pseudo-elements (animated sweep, static under reduced motion). `.music-hint` is visible only when `body[data-music="waiting"]`. `.primary` under `body[data-screen="entry"]` is the embossed teal button (violet for the `Begin` submit); `.ghost`/`.mini` get dark embossed treatment; `h1` neon glow with occasional glitch flicker (disabled under reduced motion).

- [ ] **Step 1: Write the failing e2e tests (390×844 unless stated):**
  - `welcome copy and structure` — fresh storage: `h1.entry-title` text is `LilNux`; `.entry-tag` text equals `Crack the machine, level up, save the day. No pressure.`; `input[name=name]` has placeholder `What should we call you?`; submit button text is `Begin ▸`; creating a player ("Sam") still lands on the hub.
  - `everything is centered` — for `.entry-hero`, `.players`, `#pform`: the horizontal centre of the element's bounding box is within 2 px of the viewport centre (single-column layouts), and `getComputedStyle(h1).textAlign === 'center'`.
  - `hint shows only until music starts` — `.music-hint` visible while `data-music === 'waiting'`, hidden after the first click + 600 ms, hidden when sound is off.
  - `player cards still work` — with 3 seeded players, clicking `[data-play]` selects and goes to the hub; `[data-edit]` opens the form pre-filled and `Save` returns to `players`; `[data-del]` still confirms (accept the dialog) and removes.
  - `touch targets ≥ 44` — every visible `#app button` and `#top button` and each `.avatars span` has `boundingBox().width >= 44 && height >= 44` (Review Focus 6).
  - `320 px with 8 players` — viewport 320×640, 8 seeded players with 20-character names: `document.documentElement.scrollWidth <= 320` (no horizontal scroll) (Review Focus 6).
  - `reduced motion` — `emulateMedia({reducedMotion:'reduce'})`: `getComputedStyle(document.querySelector('.entry-title')).animationName === 'none'`.
- [ ] **Step 2: Run to confirm failure.**
- [ ] **Step 3: Implement** the markup in `renderPlayers` (reuse the existing handlers; keep every data-attribute and the form's `name` attributes) and the CSS, porting layout/visual values from the mockup (embossed button gradients, lightbar gradient + 5.5 s sweep, `.ring` avatars, card hover glow). Kid-mode checkbox text stays as-is.
- [ ] **Step 4: Run e2e + unit + the Learn regression suite.**
- [ ] **Step 5: Look at it.** Screenshots at 390×844, 320×640 and 1280×800 (light OS theme emulated for one); compare against the mockup; fix by eye. Send them to the user.
- [ ] **Step 6: Commit.** `git commit -am "Start screen: centered cyberpunk Welcome screen with embossed buttons and neon lightbars"`

---

### Task 5: Hub restyle (`renderHub`)

**Files:**
- Modify: `js/game.js` (`renderHub` markup/copy), `css/entry.css`
- Test: `tests/e2e/start-screen.e2e.js` (extend)

**Interfaces:**
- Consumes: Task 3/4 tokens and button styles.
- Produces: a centered hub — heading `<name> <avatar> — choose your path`, lead `Two ways in. Both teach real Fedora & Linux, and both share your XP, rank and badges.`; `.hub-card.learn` becomes a dark teal "circuit card" (violet on hover) and `.hub-card.adventure` keeps its neon look, harmonised with the same lightbar/emboss language; both cards' text, lists, `.hub-progress`, buttons and `.hub-preview` canvas unchanged in meaning.

- [ ] **Step 1: Write the failing e2e tests:** `hub heading and lead` (exact strings above, with the seeded name); `hub is centered` (h1 `text-align: center`, grid centred within 2 px); `hub cards keep their contract` (`.hub-card.learn` text matches `/Learn/` and `/Start learning/`, `.hub-card.adventure` matches `/Colonel Kernel/` and `/Play adventure/`, `.hub-preview` canvas exists and has non-zero size); `hub touch targets ≥ 44`; `hub at 320 px has no horizontal scroll`; clicking either card's button still navigates (`map` / `kernel`).
- [ ] **Step 2: Run to confirm failure.**
- [ ] **Step 3: Implement** the `renderHub` markup tweaks and CSS.
- [ ] **Step 4: Run e2e + unit + Learn regression + `node tests/e2e/ck-ui.e2e.js` and `node tests/e2e/ck-adventure.e2e.js`** (the Adventure suite drives the hub and the player form).
- [ ] **Step 5: Look at it.** Screenshots of the hub at 390×844, 844×390 (landscape phone) and 1280×800; fix by eye; send to the user.
- [ ] **Step 6: Commit.** `git commit -am "Start screen: dark neon hub that matches the Welcome screen"`

---

### Task 6: Ship prep and whole-branch review

**Files:**
- Modify: `docs/HANDOFF.md` (cache number, new files, the entry-theme rule, where music lives, open items)
- Create (not committed): `C:\ClaudeBro\LilNux-cyberpunk-start.zip`

- [ ] **Step 1: Run every suite**, one at a time: `node --test tests/ck/`, `node tests/e2e/start-screen.e2e.js`, `node tests/e2e/ck-ui.e2e.js`, `node tests/e2e/ck-adventure.e2e.js`, `node tests/e2e/lilnux-regression.e2e.js` — all green, Learn regression prints `ERRORS []`.
- [ ] **Step 2: Console check.** Load `index.html` in Playwright through players → hub → map → hub → Adventure and back; no console errors or page errors.
- [ ] **Step 3: Update `docs/HANDOFF.md`** (repo state, `lilnux-v14`, `js/start-fx.js` + `css/entry.css` in the code map, the "entry views are always dark and own the synthwave music" rule, and the iPhone silent-switch caveat for Web Audio).
- [ ] **Step 4: Dispatch one fresh reviewer on Opus** over the whole branch (`git diff main...HEAD`) against the spec and this plan; fix real findings, note the rest.
- [ ] **Step 5: Commit and build the playtest zip.** `git commit -am "Start screen: handoff notes"`; then `git archive --format=zip -o /c/ClaudeBro/LilNux-cyberpunk-start.zip HEAD assets css index.html install-shortcut.sh js manifest.webmanifest play.sh README.md sw.js`. Stop here: the user playtests, and only an explicit "push it" triggers `git merge --no-ff` into `main` and a push.
