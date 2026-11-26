# LilNux — handoff for the next session

Read this first, then the design docs it points to. Last updated 2026-11-26.

## What LilNux is

A family web game for learning **Fedora 44 Workstation and Linux**. Plain HTML/CSS/JS — **no build step,
no dependencies**, classic `<script>` tags. Runs offline from disk (`index.html`), on GitHub Pages, and as an
installable iPhone Home Screen app (PWA: `manifest.webmanifest`, `sw.js`). The user decided (2026-11-26) to
**stay on the web**: no Unity or other engine (it would mean a full rewrite, a much bigger download, and losing
offline and open-from-disk play).

Two modes, chosen on a hub screen after picking a family player (switch any time with **📚 Learn | 🎮 Adventure**
in the top bar). Both share players, XP, ranks, badges and the sound switch (`localStorage` key `lilnux.save.v1`).

1. **📚 Learn — LilNux Academy:** 8 worlds of lessons, quizzes, matching/ordering, and missions in a pretend
   bash terminal. All ages; Kid mode + read-aloud. Code: `js/content.js`, `js/game.js`, `js/terminal.js`.
2. **🎮 Adventure — Colonel Kernel:** a top-down 3/4 pixel action-adventure for teens and adults: walk room to
   room, fight with `kill`, `trap`, dash and tools, solve circuit puzzles. Code: `js/ck/*.js`, `css/ck.css`.

## Repository state (2026-11-26)

- GitHub `Galaidan/LilNux`. **`main` = the live site** (GitHub Pages): https://galaidan.github.io/LilNux/
- `main` is at `968015b`, cache **`lilnux-v13`**, and is live. Everything below is merged and pushed; nothing is
  waiting on a branch.
- Local feature branches `ck-action`, `ck-chapter1`, `ck-polish`, `ck-hud-buttons`, `ck-craft-floors`,
  `ck-colonel-look` are all merged into `main` (safe to delete). Old remote branches `colonel-kernel-design`,
  `ck-story-update`, `ck-ux-tweaks` are merged too (delete on github.com if wanted).
- Playtest zips from each round sit in `C:\ClaudeBro\` (`LilNux-*.zip`); they're throwaway.
- `C:\ClaudeBro\HANDOFF.md` is an old copy of this file and `C:\ClaudeBro\LilNux-Colonel-Kernel\` a stale unzip:
  ignore both. Work only in `C:\ClaudeBro\LilNux`.
- Commit identity (repo-local): `Galaidan <Galaidan@users.noreply.github.com>`. Never put personal details in
  commits.

## Design documents (the source of truth)

- `docs/superpowers/specs/2026-11-22-colonel-kernel-design.md` — original Adventure design.
- `docs/superpowers/specs/2026-11-22-colonel-kernel-story-nullnux-design.md` — **story; wins where they differ.**
  Lil Tux, NullNux (PID 0 / `swapper/0`), resting, the slow reveal, the fourth-wall finale.
- `docs/superpowers/specs/2026-11-25-colonel-kernel-action-adventure-design.md` — **the action rebuild: wins on
  how the Adventure looks and plays** (rooms, combat, controls, art direction).
- Plans (all done): `docs/superpowers/plans/2026-11-25-colonel-kernel-action-slice.md`,
  `docs/superpowers/plans/2026-11-25-colonel-kernel-chapter-1-action.md`. (The 2026-11-22 node-map plan is
  history.)

## Story so far (Adventure)

- **Colonel Kernel** wakes with amnesia in a dark computer; companion **Pip (PID 1)** — sarcastic but caring.
- Goal of the whole game: save **Lil Tux** (the Learn-mode mascot) from **NullNux**, a corrupt kernel.
- Secret: NullNux is the Colonel's **id** — PID 0, the idle task, which acts **while the Colonel rests**.
  Reveal slowly via clues; never explain early.
- **Chapter 1 (built):** Firmware Foundry (Pip teaches `kill` at Power Rail and `echo` at its gap, `trap` in the
  first problem room; Bios teaches `ls`) → GRUB Gate (Grub teaches `cd`: terminals fast-travel, the path sign in
  initramfs breaks the boot loop with `cd /boot`) → **Home**, where Lil Tux teaches `systemctl suspend` (unlocks
  💤 Rest). The first rest after meeting him = he's taken, Home glitches, `swapper/0` log line → Chapter 1
  complete (cliffhanger).
- Resting = 💤 Rest in safe rooms, quitting for ≥ 5 min, or accepting the ~35-min break reminder. Each rest → at
  most one secret NullNux event (`js/ck/story.js`); **never** loses progress.
- **Next: Chapter 2** (Kernel Core — processes, the scheduler…), not started. Then Chapters 3–8 (systemd,
  Filesystem, Bash, Packages, Network…) and the NullNux finale (player types real commands from memory).

## What the Adventure does now

- 32 rooms (30×17 tiles) on per-region grids, generated from `World.REGIONS[].cells` + edges; doors line up.
  Forward doors seal in an uncleared problem room; the way back stays open. Dark rooms, a retracted bridge you
  `echo` a switch to extend, cracked walls `ls -a` reveals and `kill` opens, the GRUB loop room.
- **Combat** (`js/ck/action.js`, `foes.js`): `kill` 3-hit combo (30 px reach), `kill -9` hold-to-charge (CPU
  module + upgrade), `trap` parry (reflects orbs ×2, stuns lunges; mistimed = 0.35 s open), dash (fully
  invulnerable, then a 0.12 s energy-shield grace that absorbs hits without breaking a clean clear), `echo`
  bolts, `ls` reveal pulse. Glitch Mites (cloaked), Loop Wisps, Corrupt Boot Glitch and Missing Kernel Wraith
  bosses with phases and an unparryable red "9" SIGKILL ring (dash through it — `trap` can't catch signal 9).
  "Clean fix" = clearing a problem room without taking a hit.
- **Aiming:** a soft target (cyan reticle) in front of you that every attack aims at; **Q** next target;
  lock-on toggle (**L**, or the small ◎ button by the joystick on phones) keeps the Colonel facing it.
- **Feedback:** creature health bars, a named boss bar at the bottom, damage numbers, hit-stop, pickup sparks,
  a boss-defeat banner, each ability's own effect (dash shield, `trap` hex ward, `echo` sound waves, `ls` scan,
  `kill -9` charge motes), crescent sabre slashes.
- **Shell & sound:** pause menu (Esc / P / ⏸: Resume · Sound on/off · Leave), fade-in, a soft click on UI
  buttons, a quiet room tone, pickup blip, win sting — all synthesized in `js/game.js` (`SFX`), no audio files.
- **The Colonel's look:** officer cap with penguin emblem, magenta→cyan visor, pointed gold-edged pauldrons,
  crimson cape, curved scimitar-sabre with a gold knuckle-bow guard. Built from shapes in `js/ck/sprites.js`.
- Saves: `player.ck`, v2 (migrates v1 saves; never wipes progress). Reloading inside a fight resumes at the
  checkpoint safe room.

**Controls:** WASD/arrows or left thumb (stick) · J / click `kill` (hold to charge `kill -9`) · K / right-click
`trap` · Space/Shift dash · 1–3 tools · E/Enter talk/use (✋ on phones) · Q next target · L lock-on · Esc/P pause.

## Art bible (Adventure)

- **Style:** "computer ruins with corrupted overgrowth": original 3/4 top-down pixel art, one pixel density, dark outlines on everything you fight or talk to.
- **Palette:** Neon Circuit only: pale mint/teal plazas over a navy data void, magenta/violet corruption, cyan/mint/amber/coral for light and feedback; region accents Firmware amber, GRUB lime, Home orange.
- **Feel & sound:** every action gets a visible and audible answer within 100 ms (effects keep a dark under-stroke so they read on the pale plaza); a quiet room tone, a click on UI buttons, a sting for wins; text stays in the HTML overlay.

## Hard rules

- **Never cause or pretend real harm** to the computer, files or browser outside the game window.
- Real-Linux facts must be accurate (the family learns from them).
- No manipulative hooks: no streaks/daily-login pressure/purchases/ads; rest corruption is story, never loss;
  break reminders are gentle and never pile up.
- Tone: witty, never babyish (Adventure is for teens/adults; the youngest kids use Learn mode).
- Touch targets ≥ 44 px; respect reduced motion (no shake, no flashing, spinning effects stand still) and the
  sound switch.
- **Adventure is landscape on phones; Learn stays portrait.** (Portrait shows a "turn your phone sideways"
  screen and pauses the game; `manifest.webmanifest` has no `orientation`, because Learn shares it.)
- Text stays in the HTML overlay, never drawn into the pixel canvas. Original art only.
- Privacy: keep family details (names, ages) out of the repo — it's public. (Older commits still contain the
  kids' ages in the first design doc; only a history rewrite + force-push would remove them, and only if the user
  asks.)

## Code map (Adventure)

| File | Role |
|---|---|
| `js/ck/state.js` | save state (`player.ck`, v2; migrates v1 saves), `CK.State.load` repairs bad saves, `CK.rng` |
| `js/ck/world.js` | regions (nodes, grid `cells`, edges), skills incl. `kill`/`trap` terminal responders, modules, creatures, characters, tasks |
| `js/ck/rules.js` | pure rules: fog/reveal, movement, door states, tools vs moves, `clearRoom`, fast travel, upgrades, rewards, tasks, `sanitize` |
| `js/ck/story.js` | resting, secret NullNux events, break-reminder timing |
| `js/ck/puzzle.js` | circuit-rotation puzzle logic |
| `js/ck/pixel.js`, `sprites.js` | palette-indexed sprites → canvases (all art is code; the Colonel is built from shapes) |
| `js/ck/rooms.js` | room legend, tile collision, doors, props, `doorAt` / `entryPoint` / `nearestProp` |
| `js/ck/roomgen.js` | builds every Chapter 1 room from its node (seeded, doors line up with the grid) |
| `js/ck/roomart.js` | paints a room's static look (plazas, cliffs, landmarks, corruption) |
| `js/ck/foes.js`, `action.js` | creature behaviours + the pure fight simulation (targeting, lock-on, dash shield; no drawing) |
| `js/ck/input.js` | keyboard, mouse, touch stick and buttons (tool slots, use, lock toggle, hold J to charge) |
| `js/ck/pixengine.js` | low-res buffer (~480×270), integer scale, fixed 60 Hz step |
| `js/ck/roomscene.js`, `puzzlescene.js` | drawing: rooms, effects, health bars, reticle, darkness, slides; the pixel puzzle |
| `js/ck/ui.js` | HUD, action bar, boss bar, use prompt, rotate screen, Pip panel (Quests/Items/Map/Tasks), dialogue, learning terminal, log |
| `js/ck/main.js` | room-based chapter flow, pause menu, sounds, rest/wake, bridge to `game.js` (`CK.open` / `CK.close`) |

When adding files: add them to `index.html`, `tests/e2e/ck-harness.html` if tests need them, and the `FILES`
list in `sw.js` (`tests/ck/wiring.test.js` checks this). **Bump `VERSION` in `sw.js` whenever shipped files
change** (currently `lilnux-v13`; the wiring test asserts the number, so update it there too).

## How we work (this PC)

- **Shell:** the Bash tool (Git Bash) works; PowerShell has sometimes been disabled. Repo: `/c/ClaudeBro/LilNux`.
  Git and Node 26 are on PATH (in an old PowerShell, refresh PATH first; see the memory notes).
- **Flow for each request:** branch off `main` → tests first (watch them fail) → change → run every suite →
  commit → build a playtest zip → the user playtests or says **"push it"** → `git merge --no-ff` into `main`,
  push, then confirm the live site serves the new cache (`curl https://galaidan.github.io/LilNux/sw.js`, usually
  live within a minute). Never push without the user's OK.
- **Playtest zip:** `git archive --format=zip -o /c/ClaudeBro/LilNux-<name>.zip HEAD assets css index.html install-shortcut.sh js manifest.webmanifest play.sh README.md sw.js`
- **Push auth:** Git Credential Manager has the user's GitHub sign-in saved; `git push origin main` just works.
  If it ever asks again, run the push in the user's Terminal panel and use
  `git -c credential.gitHubAuthModes=browser push origin main` (the device-code flow expired once). The user's
  GitHub account signs in with Apple.
- **Big features** (a new chapter): the user opted into the superpowers workflow (brainstorm → spec → plan →
  build with tests → one fresh review). They asked to keep agent usage low: build inline, one reviewer at the end.
  Small, clear requests: just build them.
- **Seeing the game:** Playwright scripts that open `index.html?ckdebug`, seed a save, and screenshot — check
  every visual change by eye, not only by tests. Send screenshots to the user.

## Tests (run one file at a time)

```bash
export NODE_PATH='C:\ClaudeBro\.pw\node_modules'   # Playwright + Chromium live outside the repo
node --test tests/ck/                              # 173 unit tests
node tests/e2e/ck-ui.e2e.js                        # 21 overlay tests
node tests/e2e/ck-adventure.e2e.js                 # 49 tests incl. a full Chapter 1 playthrough; ONLY='name' runs one
node tests/e2e/lilnux-regression.e2e.js            # Learn mode; prints ERRORS [] when clean
```

All pass on `main` as of 2026-11-26. `SHOTS=<folder>` sets where e2e screenshots go. Debug hooks (`CK._test`)
exist only with `?ckdebug` in the URL.

Gotchas when writing e2e tests:
- `openWith()` seeds a save; reloading the page while the Adventure is open saves the old state over a seeded
  one — call `CK.close()` before seeding.
- The hub stays rendered under the Adventure, so wait for `#ck-root` to disappear, not for `.hub`.
- Input is dropped during the 0.25 s room slide: use `waitRoom()` (it waits for the slide to finish).
- Never `assert.equal` a Playwright handle (it prints a huge object and can hang); compare booleans.

## Plugins (reviewed 2026-11-26)

- **Applied:** Unity's `craft-game-floors` ideas (engine-agnostic parts: feel, sound, shell, a scored look
  check). The pixel-perfect check already passes (integer scale, smoothing off, camera on whole pixels).
- **Not applicable:** the other Unity skills and `unity-perf` (need Unity / C#); `game-trend-skills` (mobile
  monetization and growth — against the no-purchases, no-hooks rules).
- **Maybe later:** `phase-runner` (its `design-planner` could lock a design system before Chapter 2) and `phaser`
  (OpenSpec workflow; needs the `openspec` CLI, not installed). Only use them if the user asks.

## Open items

- Nothing deferred from earlier rounds.
- Small, known: on an iPhone SE in landscape the top HUD wraps to two rows (nothing overlaps; the bars sit below).
- Next big thing, when the user asks: **Chapter 2**.

## Working with this user

Plain, friendly language. They play on Windows (`C:\ClaudeBro`), Fedora, and iPhone, and often follow along
remotely from their phone. They like to see screenshots and to playtest a zip before changes go to `main`;
"push it" means merge into `main` and push.
