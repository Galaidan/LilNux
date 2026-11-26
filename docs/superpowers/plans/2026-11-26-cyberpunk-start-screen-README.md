# Cyberpunk start screen — build notes (review after changes)

All commentary, decisions and caveats from the build go here instead of the chat. Newest entries at the bottom of each task.
Plan: `2026-11-26-cyberpunk-start-screen.md` · Spec: `../specs/2026-11-26-cyberpunk-start-screen-design.md`

## Task 1 — pure core + wiring (done, commit 37185e0)
- Added `js/start-fx.js` (score + field simulation), `css/entry.css` (stub), wired both into `index.html` and `sw.js`; cache is now `lilnux-v14`.
- 190 unit tests pass (173 existing + 16 FX + 1 wiring).
- **Call:** runners carry their own `bounds` because the planned `stepRunner(r, dt, rng)` has no screen size. Cosmetic risk only.
- **Call:** trace/runner turns are true 90° turns (the mockup's turn list could reverse direction).

## Task 2 — StartFX runtime
- Canvas field + gesture-gated synthwave loop + lifecycle (`mount/unmount/setSound/isMounted/_debug`). 10 e2e tests (`tests/e2e/start-screen.e2e.js`) pass; 190 unit tests still pass.
- **Call:** `_debug()` also reports `audioState` (needed to test that a hidden tab suspends audio).
- **Call:** `body[data-music]` flips to `on` at the first tap (so the hint hides immediately); the music itself starts 0.3 s later. If the browser can't make audio, the hint stays hidden rather than nagging.
- **Call:** once the page has had a first tap, later mounts (e.g. coming back from Learn mode) resume music on their own after 0.3 s.
- Hat noise buffer is cached instead of rebuilt per hit (small perf gain over the mockup).

## Task 3 — shell wiring + always-dark theme
- `go()` now sets `body[data-screen="entry"]` and mounts/unmounts the FX for the `players` and `hub` views; the top-bar 🔊 calls `StartFX.setSound`. The dark theme is a token override block in `css/entry.css`, so the top bar, chips and cards go dark with no per-component work.
- 7 new shell e2e tests + the 10 FX tests pass (17); Learn regression still prints `ERRORS []`.
- **Call:** the game's own click sounds (`SFX`) keep their separate AudioContext, so the page has two in total. The "one AudioContext" test counts only StartFX's.
- **Call:** FX tests now `unmount()` first, because the shell mounts the FX on its own.
- **Seen by eye (to tune in Tasks 4–5):** bright trace lines run behind headline text in places; the old Welcome/hub layouts are still left-aligned until restyled.

## Task 4 — Welcome screen
- Centered Welcome: Lil Tux, glowing `LilNux` title (flicker + occasional glitch, both off under reduced motion), the tagline, a "tap anywhere to start the music" hint (visible only until music starts), `// who is awake?` kicker, circuit-ring player cards, `+ new recruit` panel with a violet `Begin ▸` button, neon lightbars top and bottom, embossed buttons. 24 e2e tests pass.
- ✏️/🗑️ moved to a row under each card at 44 px; every button and avatar on the screen is ≥ 44 px; 8 players with 20-letter names fit a 320 px phone with no sideways scroll.
- **Call:** the stats line is now two lines (`340 XP` / `0/8 worlds · 0 🏅`) so it never wraps awkwardly.
- **Call:** player cards use centered flex-wrap (not a grid) so an odd last card sits in the middle.
- **Call:** `.primary.primary` (doubled class) in `entry.css` is deliberate: it beats the dark-mode rule in `style.css` without `!important`.
- **Call:** a dark halo (text-shadow) sits under body text so it stays readable over the moving circuits.
- The "Pick an avatar" label and the Kid-mode text are unchanged on purpose (clear for newcomers).
- **Bug found and fixed (caught by the Learn regression suite):** the music hint used `display:none`, so the first press shifted the page up and a first tap on **Begin** was lost. It now uses `visibility:hidden` (keeps its space); new test `first press does not move the page`.
