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

## Task 5 — hub
- Hub is centered: `<name> <avatar> — choose your path` + "Two ways in…" lead; Learn card is a dark teal circuit card with an embossed teal button, Adventure card keeps its neon with a violet button; card bullets became `›` lines. 5 new hub tests (30 e2e total).
- **Call:** hub heading/lead copy changed to match the Welcome tone (plan-specified strings).
- **Call:** on phones ≤ 440 px the top bar wraps to two rows (brand + Learn/Adventure on top, the other buttons below), because 44 px buttons no longer fit one row. Wider screens stay one row.
- **Found by the stronger check:** the old `scrollWidth` test passes even when the page overflows (body clips it), so the 320 px tests now also check the right-most edge of every visible element; the hub top bar failed that until the wrap rule was added.

## Task 6 — handoff addendum (paste into `docs/HANDOFF.md` after the `handoff-2026-11-26` branch is merged)
**Why here and not in HANDOFF.md:** `main` still has the old 2026-11-22 handoff; the rewritten one is only on the unmerged `handoff-2026-11-26` branch, so editing it on this branch would conflict.

- **Repo state:** branch `cyberpunk-start` (off `main` at `968015b`), cache **`lilnux-v14`**, not pushed. Design: `docs/superpowers/specs/2026-11-26-cyberpunk-start-screen-design.md`; plan: `docs/superpowers/plans/2026-11-26-cyberpunk-start-screen.md`; approved mockup: `docs/superpowers/specs/2026-11-26-cyberpunk-start-screen-mockup.html`.
- **What changed:** the Welcome (pick-a-player) screen and the hub are "Circuit Void" entry screens: always dark, centered, embossed buttons, neon lightbars, a live Tron circuit field and a synthesized synthwave loop. Tagline: "Crack the machine, level up, save the day. No pressure."
- **Rule:** the `players` and `hub` views are always dark (`body[data-screen="entry"]`, set in `go()`); every other view keeps the normal light/dark look. The music plays only on those two views and stops for Learn and the Adventure.
- **Code map:** `js/start-fx.js` (pure score + field simulation, then the canvas/Web Audio runtime: `StartFX.mount/unmount/setSound/isMounted/_debug`); `css/entry.css` (the dark tokens and all entry-screen styling). `go()` and the 🔊 handler in `js/game.js` drive it.
- **Sound:** the top-bar 🔊 (`S.sound`) is the only music switch. Nothing plays before the first tap; music starts 0.3 s after it. `body[data-music]` is `waiting | on | off` (the hint shows only on `waiting`). The page has two AudioContexts by design (StartFX's and the game's click sounds).
- **Gotchas:** never hide something with `display:none` on the first press of an entry screen (it shifts the layout and swallows the tap; use `visibility`). `.primary.primary` in `entry.css` is deliberate (beats the dark-mode rule in `style.css`). `scrollWidth` can pass while the page overflows, so overflow tests also check element edges.
- **Tests:** `node --test tests/ck/` (190 unit), `node tests/e2e/start-screen.e2e.js` (30 e2e: FX runtime, shell wiring, Welcome, hub). Run `lilnux-regression.e2e.js` too (it caught the first-tap bug).
- **Known:** on iPhone, Web Audio is muted by the silent switch (animation still shows). The hub top bar wraps to two rows on phones ≤ 440 px.

## Final review (fresh reviewer, Opus) — result
No Critical issues. Fixed (each with a test that failed first, suite 33/33 start-screen + 190 unit):
- **#1 Music might never start on iPhone.** Audio is now created and resumed *inside* the finished tap/key press (silently); the music follows 0.3 s later. The hint only hides once the browser has really unlocked audio, and if it refuses the next tap tries again. Needs a real iPhone check (I could not test Safari here).
- **#5 App depended on StartFX loading.** `go()` and the sound handler are guarded, so a missing script just means no circuits/music.
- **#4 Music overlapped the Adventure's room tone for 0.4 s.** Going to the Adventure now cuts the music in ~30 ms. (Re-graded Important because the plan says "never overlap".)

**Deferred minors (your call, each is small):**
- #2 After a main-thread stall (e.g. rotating the phone) the scheduler can play missed steps as one audible clump. Fix: one line in `schedule()`.
- #3 Coming back to the tab can give a brief doubled note. Fix: keep the audio clock (`nextTime = Math.max(nextTime, currentTime + 0.02)`).
- #6 Phone CPU/battery: 60 fps canvas with glow (`shadowBlur`) on every runner. Cheap mitigations: draw glow without `shadowBlur`, cap the effects canvas at 1.5× DPR, or run at 30 fps. Best decided after you playtest on a phone (heat, jank).
- #7 Screen readers read `// who is awake?` as "slash slash…". Fix: wrap the `// ` in `aria-hidden`.
- #8 The phone's browser bar stays Fedora-blue (`theme-color`) above the dark screens.
- #9 Older Safari might announce the title twice (glitch layer fallback text).

Reviewer's verdict on my rulings: all seven are sound.
