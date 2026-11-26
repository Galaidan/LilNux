# Cyberpunk start screen & hub — design

_2026-11-26. Status: approved direction (mockup accepted), ready to plan._

## Intent & why

The entry screens (the **Welcome / pick-a-player** screen and the **hub** mode-chooser) currently read
like a friendly settings form. The user wants the front door to feel **intriguing and mysterious** —
most people opening LilNux know nothing about computers or Linux, and the goal is to pull them in rather
than lecture. Direction chosen from three mockups: **"Circuit Void"** — a Tron Legacy aesthetic over a
dark void, tying the front door into Colonel Kernel's neon world and quietly setting up the game's mystery.

## Goals

- Restyle **both** the Welcome screen (`renderPlayers`) and the **hub** (`renderHub`) in the real game to
  a dark cyberpunk "Circuit Void" look: centered layout, embossed buttons, neon lightbars.
- A live **Tron circuit field** behind the content: glowing circuit traces, **light-runners** that streak
  along the grid leaving fading tracers, and floating **data-nodes** that blink in and vanish.
- A looping **retro synthwave techno** track, synthesized in-engine (no audio files), that plays on these
  entry screens.
- A short, sarcastic-but-exciting tagline on the Welcome screen.

## Non-goals (for now)

- Restyling the rest of the app (map, world, terminal, badges, Adventure). Those keep the current
  Fedora-blue light/dark look.
- Changing player/save data, ranks, XP, or any game logic.
- Replacing the existing in-game SFX (`SFX` in `js/game.js`) or the Adventure's room tone.

## Anti-goals (what makes this a failure even if it "works")

- A newcomer or young child feeling shut out or intimidated at the door. Mysterious, not cold — one warm,
  playful note stays in the copy and Tux.
- Music that blasts on load, fights the in-game audio, or ignores the sound switch.
- Jank on older phones (runaway animation, dropped frames, battery drain).
- A jarring bright-blue flash when moving from the dark start screen into the app.

## Constraints

- **Always dark** on these two screens — treat them like a game title screen, independent of the
  system/`data-theme` setting. The rest of the app still honors light/dark.
- **No audio files.** Music is synthesized with Web Audio, consistent with the existing `SFX` engine.
- **Obey the sound switch**: the existing top-bar 🔊 (`S.sound`) is the one and only music toggle (no
  second ♪ button). Music only starts after a user gesture (browsers block autoplay), fades in, and
  never starts if the player's saved sound setting is off.
- **Respect reduced motion**: no moving runners/tracers, no flicker; a static circuit field instead.
- **Touch targets ≥ 44px.** Keep the avatar picker, player cards and buttons tappable.
- **Portrait** is fine here (this is shared/Learn-side shell; the landscape rule is Adventure-only).
- **Privacy**: no family details added anywhere public.
- Any shipped file change requires a `VERSION` bump in `sw.js` (currently `lilnux-v13`), and the
  `tests/ck/wiring.test.js` assertion updated to match; new JS files must be added to `index.html`,
  `sw.js` `FILES`, and `tests/e2e/ck-harness.html` if the Adventure tests load them.

## Approaches considered

1. **Static CSS/SVG restyle only.** Dark palette, embossed buttons, a fixed SVG circuit background.
   Cheapest, but loses the live Tron motion and the music — not what was asked.
2. **Canvas Tron field + Web Audio synthwave, as a self-contained module** _(chosen)_. A new
   `js/start-fx.js` owns the animated canvas and the music loop, started/stopped by the shell when the
   entry screens mount/unmount. The screens' markup/CSS live with the rest of the shell (`game.js` /
   `css/style.css`). Clean separation, easy to disable for reduced-motion, testable in isolation.
3. **Inline everything into `game.js`.** Avoids touching `index.html`/`sw.js` `FILES`/wiring test, but
   bloats the already-large `game.js` and mixes a rendering/audio engine into the shell. Rejected.

**Chosen: approach 2.** The canvas + audio engine is self-contained enough to be its own file and its
own tests; the screen markup and theming stay in the shell where the other screens live.

## Decisions made

- **Tagline (Welcome screen):** _"Crack the machine, level up, save the day. No pressure."_ with the CTA
  _"Choose who wakes up."_ (Short, dry, exciting; keeps the save-Lil-Tux thread. Easy to tweak later.)
- **Scope of the dark look:** Welcome screen **and** hub. (My call: give the two entry screens a shared
  dark shell so the flow doesn't flash bright blue; the app lightens again once you pick a mode.)
- **Music lifecycle (my call):** the synthwave loop plays only while an entry screen is showing; it stops
  when a player is chosen / the user leaves for a mode, so it never overlaps the Adventure's room tone.
  It respects `S.sound` and starts ~0.3 s after the first tap, only if the entry screen is still showing
  (so tapping straight through to a mode never produces a blip of music). A small "tap for music" hint
  shows until it starts. It pauses when the tab is hidden.
- **Light mode (decided):** always dark on these screens.
- **Module layout (my call):** new `js/start-fx.js` (canvas field + music) and new `css/entry.css` (the
  dark theme, scoped to `body[data-screen="entry"]`); wire both into `index.html` + `sw.js` `FILES`; bump
  `VERSION` to `lilnux-v14`; update the wiring test.
- **Touch targets (my call):** the small ✏️/🗑️ buttons on player cards move into a row under the card at
  44 px, because they are currently too small for the ≥ 44 px rule.

## Left to the builder (plan stage)

- Exact DOM/CSS structure for the dark Welcome + hub (reuse existing render functions, add scoped classes
  or a `body`/root flag like `data-screen="entry"` that forces the dark theme + mounts the FX).
- `start-fx.js` public API (e.g. `StartFX.mount(opts)` / `StartFX.unmount()`, `setMusic(on)`), wired to
  `go()` so it starts on `players`/`hub` and stops elsewhere, and to the sound switch.
- Canvas performance pass (DPR cap, runner/trail counts scaled to viewport, pause when tab hidden).
- Tests: unit (music muted when `S.sound` is false; no audio before a gesture; reduced-motion path draws
  no runners; mount/unmount cleans up rAF + timers) and e2e (entry screens render the canvas + ♪ control;
  toggling works; choosing a player stops the music and leaves the dark look behind).
