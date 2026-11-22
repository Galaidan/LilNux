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
2. **🎮 Adventure — Colonel Kernel:** neon canvas videogame for teens and adults. Code: `js/ck/*.js`, `css/ck.css`.

## Repository state

- GitHub: `Galaidan/LilNux`. Default branch `main` = live site (GitHub Pages, once the repo is public and
  Pages is set to `main` / root).
- Everything is merged into `main` (latest: message log, Q/E movement in fights, no forced dialogue on revisits,
  map colour legend, hover info on map nodes/characters and titles on every button). "Push it" from the user
  means merge into `main` and push.
- Leftover remote branches already merged (safe to delete on github.com — this sandbox can't delete
  remote branches): `colonel-kernel-design`, `ck-story-update`, `ck-ux-tweaks`.
- Commit identity used: `Galaidan <Galaidan@users.noreply.github.com>`. Don't put personal details in commits.

## Design documents (the source of truth)

- `docs/superpowers/specs/2026-11-22-colonel-kernel-design.md` — original Adventure design.
- `docs/superpowers/specs/2026-11-22-colonel-kernel-story-nullnux-design.md` — **story update; wins where they
  differ.** Lil Tux, NullNux (PID 0 / `swapper/0`), resting, the slow reveal, the fourth-wall finale.
- `docs/superpowers/plans/2026-11-22-colonel-kernel-chapter-1.md` — the Chapter 1 build plan (done).

## Story so far (Adventure)

- **Colonel Kernel** wakes with amnesia in a dark computer; companion **Pip (PID 1)** — sarcastic but caring.
- Goal of the whole game: save **Lil Tux** (the Learn-mode mascot) from **NullNux**, a corrupt kernel.
- Secret: NullNux is the Colonel's **id** — PID 0, the idle task, which acts **while the Colonel rests**.
  Reveal slowly via clues; never explain early.
- Chapter 1 (built): Firmware Foundry (BIOS; Pip teaches `echo`, Bios teaches `ls`) → GRUB Gate (Grub teaches
  `cd`) → boot completes → **Home**, where Lil Tux teaches `systemctl suspend` (unlocks 💤 Rest). The first rest
  after meeting him = he's taken, Home glitches, `swapper/0` log line → Chapter 1 complete (cliffhanger).
- Resting = 💤 Rest button at safe spots, quitting for ≥ 5 min, or accepting the ~35-min break reminder.
  Each rest → at most one secret NullNux event (`js/ck/story.js`); **never** loses progress.
- Planned: Chapters 2–8 (Kernel Core, systemd, Filesystem, Bash, Packages, Network…), then the NullNux finale
  (phase 3: player types real commands from memory, clickable "adds" drop hint fragments).

## Hard rules

- **Never cause or pretend real harm** to the computer, files or browser outside the game window.
- Real-Linux facts must be accurate (the family learns from them).
- No manipulative hooks: no streaks/daily-login pressure/purchases; rest corruption is story, never loss;
  break reminders are gentle and never pile up.
- Tone: witty, never babyish (Adventure is for teens/adults; the youngest kids use Learn mode).
- Touch targets ≥ 44px; works on iPhone portrait; respect reduced motion and the sound toggle.
- Privacy: the user doesn't want their information shared with outside services or in public files.
  Keep family details (names, ages) out of the repo — it's public for GitHub Pages. (Older commits still
  contain the kids' ages in the first design doc; only a history rewrite + force-push would remove them,
  and only if the user asks.)

## Code map (Adventure)

| File | Role |
|---|---|
| `js/ck/state.js` | save state (`player.ck`), `CK.State.load` repairs bad saves, `CK.rng` |
| `js/ck/world.js` | regions, nodes, skills, modules, creatures, characters (dialogue), tasks |
| `js/ck/rules.js` | pure rules: fog/reveal, movement, quick fix, loadout, upgrades, rewards, tasks, `sanitize` |
| `js/ck/story.js` | resting, secret NullNux events, break-reminder timing |
| `js/ck/puzzle.js` | circuit-rotation puzzle logic |
| `js/ck/combat.js` | skillshot fight simulation (no drawing); `setMove` for Q/E |
| `js/ck/engine.js` | canvas loop, sizing (DPR ≤ 2), camera, pointer/keys, pinch |
| `js/ck/art.js` | all drawing ("Neon Circuit" look), incl. Colonel, Pip, Lil Tux, creatures, fog |
| `js/ck/scenes.js` | map, fight and puzzle scenes |
| `js/ck/ui.js` | HUD, skill bar, Pip panel, dialogue, learning terminal, message log, legend, hover tooltip |
| `js/ck/main.js` | chapter flow, rest/wake, bridge to `game.js` (`CK.open` / `CK.close`) |

When adding files: add them to `index.html`, `tests/e2e/ck-harness.html` if tests need them, and the
`FILES` list in `sw.js`; bump `VERSION` in `sw.js` whenever shipped files change (currently `lilnux-v6`).

## Tests (run one at a time — the sandbox has limited memory)

```bash
node --test tests/ck/*.test.js
node tests/e2e/ck-engine.e2e.js
node tests/e2e/ck-ui.e2e.js
node tests/e2e/ck-scenes.e2e.js
node tests/e2e/ck-chapter.e2e.js
node tests/e2e/lilnux-regression.e2e.js
```

Browser tests use the pre-installed Playwright + Chromium. Debug hooks (`CK._test`) exist only with `?ckdebug`
in the URL. Current status on `main`: 76 unit tests + all e2e suites pass.

## Deferred polish (from the code review — user hasn't asked for these yet)

- Scan hits show "-10" instead of "-5".
- Map nodes / puzzle tiles slightly under 44px on iPhone portrait at minimum zoom.
- Keys 1–5 do nothing on the map (only in fights); no on-screen ◀ ▶ buttons for touch movement in fights yet.
- Cooldown ring uses the base cooldown (off with CPU / `echo -n` upgrades).
- Some background animations ignore reduced motion.
- Adventure's terminal user name differs from Learn mode's for names starting with a digit.

## Working with this user

Plain, friendly language. They play on Windows (`C:\ClaudeBro`), Fedora, and iPhone. They like to playtest a
zip before changes go to `main`; "push it" means merge into `main` and push. They opted into the superpowers
workflow (design → plan → build with tests → review) for big features; small, clear requests can just be built.
