# LilNux — handoff for the next session

Read this first, then the design docs it points to. Last updated 2026-11-22.

## What LilNux is

A family web game for learning **Fedora 44 Workstation and Linux**. Plain HTML/CSS/JS — **no build step,
no dependencies**, classic `<script>` tags. Runs offline from disk (`index.html`), on GitHub Pages, and as an
installable iPhone Home Screen app (PWA: `manifest.webmanifest`, `sw.js`).

Two modes, chosen on a hub screen after picking a family player (switch any time with **📚 Learn | 🎮 Adventure**
in the top bar). Both share players, XP, ranks and badges (`localStorage` key `lilnux.save.v1`).

1. **📚 Learn — LilNux Academy:** 8 worlds of lessons, quizzes, matching/ordering, and missions in a pretend
   bash terminal. All ages; Kid mode + read-aloud. Code: `js/content.js`, `js/game.js`, `js/terminal.js`.
2. **🎮 Adventure — Colonel Kernel:** a top-down pixel action-adventure for teens and adults: walk room to room,
   fight with `kill` (melee), `trap` (parry), dash and tools, solve circuit puzzles. Code: `js/ck/*.js`, `css/ck.css`.

## Repository state

- GitHub: `Galaidan/LilNux`. Default branch `main` = live site (GitHub Pages, once the repo is public and
  Pages is set to `main` / root).
- `main` has the action slice (Training Room). The room-based Chapter 1 rebuild is on branch `ck-chapter1`
  until the user playtests it and says "push it" (merge into `main` and push).
- Leftover remote branches already merged (safe to delete on github.com — this sandbox can't delete
  remote branches): `colonel-kernel-design`, `ck-story-update`, `ck-ux-tweaks`.
- Commit identity used: `Galaidan <Galaidan@users.noreply.github.com>`. Don't put personal details in commits.

## Design documents (the source of truth)

- `docs/superpowers/specs/2026-11-22-colonel-kernel-design.md` — original Adventure design.
- `docs/superpowers/specs/2026-11-22-colonel-kernel-story-nullnux-design.md` — **story update; wins where they
  differ.** Lil Tux, NullNux (PID 0 / `swapper/0`), resting, the slow reveal, the fourth-wall finale.
- `docs/superpowers/plans/2026-11-22-colonel-kernel-chapter-1.md` — the first Chapter 1 build plan (node map; replaced).
- `docs/superpowers/specs/2026-11-25-colonel-kernel-action-adventure-design.md` — **the action rebuild: wins on how
  the Adventure looks and plays** (rooms, combat, controls, art direction "computer ruins with corrupted overgrowth").
- `docs/superpowers/plans/2026-11-25-colonel-kernel-action-slice.md` and
  `docs/superpowers/plans/2026-11-25-colonel-kernel-chapter-1-action.md` — the slice and the Chapter 1 rebuild (done).

## Story so far (Adventure)

- **Colonel Kernel** wakes with amnesia in a dark computer; companion **Pip (PID 1)** — sarcastic but caring.
- Goal of the whole game: save **Lil Tux** (the Learn-mode mascot) from **NullNux**, a corrupt kernel.
- Secret: NullNux is the Colonel's **id** — PID 0, the idle task, which acts **while the Colonel rests**.
  Reveal slowly via clues; never explain early.
- Chapter 1 (built, room-based): Firmware Foundry (Pip teaches `kill` at Power Rail and `echo` at its gap,
  `trap` in the first problem room; Bios teaches `ls`) → GRUB Gate (Grub teaches `cd`: terminals fast-travel,
  the path sign in initramfs breaks the boot loop with `cd /boot`) → boot completes → **Home**, where Lil Tux
  teaches `systemctl suspend` (unlocks 💤 Rest). The first rest after meeting him = he's taken, Home glitches,
  `swapper/0` log line → Chapter 1 complete (cliffhanger).
- Each map node is a 30×17-tile room on a per-region grid (`World.REGIONS[].cells`); edges are doorways.
  A "clean fix" = clearing a problem room without taking a hit. Bosses fire an unparryable red "9" SIGKILL
  ring: dash through it (`trap` can't catch signal 9 — a real bash fact).
- Resting = 💤 Rest button in safe rooms, quitting for ≥ 5 min, or accepting the ~35-min break reminder.
  Each rest → at most one secret NullNux event (`js/ck/story.js`); **never** loses progress.
- Planned: Chapters 2–8 (Kernel Core, systemd, Filesystem, Bash, Packages, Network…), then the NullNux finale
  (phase 3: player types real commands from memory, clickable "adds" drop hint fragments).

## Art bible (Adventure)

- **Style:** "computer ruins with corrupted overgrowth": original 3/4 top-down pixel art, one pixel density, dark outlines on everything you fight or talk to.
- **Palette:** Neon Circuit only: pale mint/teal plazas over a navy data void, magenta/violet corruption, cyan/mint/amber/coral for light and feedback; region accents Firmware amber, GRUB lime, Home orange.
- **Feel & sound:** every action gets a visible and audible answer within 100 ms (effects keep a dark under-stroke so they read on the pale plaza); a quiet room tone, a click on UI buttons, a sting for wins; text stays in the HTML overlay.

## Hard rules

- **Never cause or pretend real harm** to the computer, files or browser outside the game window.
- Real-Linux facts must be accurate (the family learns from them).
- No manipulative hooks: no streaks/daily-login pressure/purchases; rest corruption is story, never loss;
  break reminders are gentle and never pile up.
- Tone: witty, never babyish (Adventure is for teens/adults; the youngest kids use Learn mode).
- Touch targets ≥ 44px; respect reduced motion and the sound toggle.
- **Adventure is landscape on phones; Learn stays portrait.** (Portrait shows a "turn your phone sideways"
  screen and pauses the game; `manifest.webmanifest` has no `orientation`, because Learn shares it.)
- Text stays in the HTML overlay, never drawn into the pixel canvas. Original art only.
- Privacy: the user doesn't want their information shared with outside services or in public files.
  Keep family details (names, ages) out of the repo — it's public for GitHub Pages. (Older commits still
  contain the kids' ages in the first design doc; only a history rewrite + force-push would remove them,
  and only if the user asks.)

## Code map (Adventure)

| File | Role |
|---|---|
| `js/ck/state.js` | save state (`player.ck`, v2; migrates v1 saves), `CK.State.load` repairs bad saves, `CK.rng` |
| `js/ck/world.js` | regions (nodes, grid `cells`, edges), skills incl. `kill`/`trap` terminal responders, modules, creatures, characters, tasks |
| `js/ck/rules.js` | pure rules: fog/reveal, movement, door states, tools vs moves, `clearRoom`, fast travel, upgrades, rewards, tasks, `sanitize` |
| `js/ck/story.js` | resting, secret NullNux events, break-reminder timing |
| `js/ck/puzzle.js` | circuit-rotation puzzle logic |
| `js/ck/pixel.js`, `sprites.js` | palette-indexed text-grid sprites → canvases (all art is code) |
| `js/ck/rooms.js` | room legend, tile collision, doors, props, `doorAt` / `entryPoint` / `nearestProp` |
| `js/ck/roomgen.js` | builds every Chapter 1 room from its node (seeded, doors line up with the grid) |
| `js/ck/roomart.js` | paints a room's static look (plazas, cliffs, landmarks, corruption) |
| `js/ck/foes.js`, `action.js` | creature behaviours + the pure fight simulation (no drawing) |
| `js/ck/input.js` | keyboard, mouse, touch stick and buttons (tool slots 1–3, E/✋ use, hold J to charge) |
| `js/ck/pixengine.js` | low-res buffer, integer scale, fixed 60 Hz step |
| `js/ck/roomscene.js`, `puzzlescene.js` | drawing: rooms (doors, props, darkness, glitches, slides) and the pixel puzzle |
| `js/ck/ui.js` | HUD, action bar, use prompt, rotate screen, Pip panel (Quests/Items/Map/Tasks), dialogue, learning terminal, log |
| `js/ck/main.js` | room-based chapter flow, rest/wake, bridge to `game.js` (`CK.open` / `CK.close`) |

When adding files: add them to `index.html`, `tests/e2e/ck-harness.html` if tests need them, and the
`FILES` list in `sw.js` (`tests/ck/wiring.test.js` checks this); bump `VERSION` in `sw.js` whenever shipped
files change (currently `lilnux-v13`).

## Tests (run one at a time — the sandbox has limited memory)

```bash
node --test tests/ck/
node tests/e2e/ck-ui.e2e.js
node tests/e2e/ck-adventure.e2e.js      # $env:ONLY='name' runs one test
node tests/e2e/lilnux-regression.e2e.js
```

On the Windows PC, Playwright + Chromium live outside the repo in `C:\ClaudeBro\.pw`: set
`$env:NODE_PATH = 'C:\ClaudeBro\.pw\node_modules'` first (and `$env:SHOTS` for screenshots). Debug hooks
(`CK._test`) exist only with `?ckdebug` in the URL; `ck-adventure.e2e.js` includes a full Chapter 1 playthrough.

## Deferred polish

Nothing open right now.

## Working with this user

Plain, friendly language. They play on Windows (`C:\ClaudeBro`), Fedora, and iPhone. They like to playtest a
zip before changes go to `main`; "push it" means merge into `main` and push. They opted into the superpowers
workflow (design → plan → build with tests → review) for big features; small, clear requests can just be built.
