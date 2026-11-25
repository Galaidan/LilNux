# Colonel Kernel — action-adventure rebuild (design)

Date: 2026-11-25. Builds on `2026-11-22-colonel-kernel-design.md` and the story update
`2026-11-22-colonel-kernel-story-nullnux-design.md`. Where this document differs on how the
Adventure **looks and plays**, this one wins. The story, characters and Learn mode are unchanged.

## 1. Intent and why

The user wants the Adventure to feel like a real top-down action-adventure, not a board you tap
through. Their words: "walk around and fight like those games". The references are:

- **Hyper Light Drifter:** fast, skill-based fights with a dash and a parry.
- **A Link to the Past:** slower exploration with more weapons, items and mechanics, where tools
  open new places.

On the look, they named the low-res, 3/4 top-down pixel style of those games (internal resolution
about 480×270, sprites 16–64 px, main character about 32×32), but said to **keep today's Neon
Circuit colours**.

We borrow the **genre and style**: top-down 3/4 view, room-to-room exploration, dash/parry
combat, tool-gated areas. Every sprite, tile, HUD element and sound is original Neon Circuit
work. No assets, characters, names or signature HUD elements (for example, rows of heart
containers) from either game. The repo is public.

## 2. Goals, non-goals, anti-goals

**Goals**
- Free movement of the Colonel through rooms. Creatures attack in the same space you explore.
- Combat that rewards timing: dash with invulnerability frames, a `trap` parry that reflects
  attacks, a `kill` melee combo and an `echo` ranged shot.
- Linux commands are the tools and weapons, and each one is still taught in the terminal before
  you get it. The "In real Linux…" explanations stay accurate.
- Chapter 1 (Firmware Foundry → GRUB Gate → Home, the Lil Tux rest, the cliffhanger) is fully
  rebuilt in the new style, with the same story beats.
- Smooth on an iPhone in landscape and on a PC with keyboard and mouse.

**Non-goals (for this rebuild)**
- Chapters 2–8. Chapter 2 comes after this ships.
- Gamepad support. Nice later; the input layer should make it easy to add.
- Real 3D. Depth is faked with 3/4 perspective, front faces on walls, drop shadows and light
  pools, as in the reference style.
- Changes to Learn mode.

**Anti-goals (failure even if it "works")**
- Fights that feel floaty or unfair: input lag, invisible hitboxes, getting hit during a dash.
- Unreadable neon: text drawn into the pixel buffer, colour-only cues, low contrast.
- Anything that punishes: losing progress, streaks, grind. Losing a fight still only sends you
  to the last checkpoint with loot kept.
- Copying either reference game's art or characters.
- Breaking existing family saves.

## 3. Constraints (unchanged unless noted)

- Plain HTML/CSS/JS, classic `<script>` tags, no build step, no runtime dependencies. Works
  offline from disk, on GitHub Pages and as the iPhone PWA.
- **Changed:** on phones the **Adventure** is played in **landscape**. iOS web apps can't lock
  orientation, so in portrait the Adventure shows a "turn your phone sideways" screen.
  `manifest.webmanifest` gets **no** `orientation` setting, because Learn mode shares it and stays
  portrait-friendly.
- Touch targets ≥ 44 px. Respect reduced motion (no screen shake, no sliding room transitions,
  no flashing) and the sound toggle.
- Text (dialogue, HUD labels, tooltips, terminal) stays in the **HTML overlay**, never in the
  canvas. This keeps contrast ≥ 4.5:1, read-aloud and the existing UI code.
- Real-Linux facts must be accurate.
- Privacy: no family details in the repo.

## 4. Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A ✅ picked** | **Rooms on the existing node graph.** Each node id (`f0`…`f15`, `g0`…`g15`) becomes a one-screen room. Edges become doorways. Node kinds become what's in the room. A new pure action simulation replaces the arena fight. | Keeps saves, `explored`/`cleared`, checkpoints, tasks, NullNux rest events (rebreak circuits, glitched rooms) and most of `rules.js` working. The regions need re-authoring onto a grid so doorways line up. |
| B | One big scrolling tile map per region, with nodes as spots on it | More open-world feel, but every rule keyed on node ids (fog, blocking, story events, tasks) needs rethinking. Old saves don't map cleanly. Much bigger rewrite. |
| C | Use a game library (Phaser, Kaboom) | Faster to prototype, but breaks "no dependencies / offline from disk". Ruled out. |

Real 3D (WebGL) was also ruled out: neither reference game is 3D, and it would cost iPhone
performance and simplicity for a look the user didn't ask for.

## 5. How it looks

- **Pixel buffer:** the game draws into a low-res offscreen canvas and is scaled up by a whole
  number with smoothing off, so pixels stay crisp. Scale `k = max(1, round(deviceHeightPx / 270))`.
  The buffer is `floor(deviceW / k) × floor(deviceH / k)` device pixels, which is about 270 tall
  and as wide as the screen's shape allows. Examples:
  - 1920×1080 PC: k = 4, buffer 480×270.
  - iPhone landscape 2556×1179: k = 4, buffer about 639×294.
- **Rooms** are 30×17 tiles of 16 px (480×272). If the buffer is larger, the room is centred and
  the margin shows dark, softly animated fog. If smaller (for example a 1366×768 laptop, k = 3,
  455×256), the camera follows the Colonel, clamped to the room.
- **Art direction: computer ruins with corrupted overgrowth** (chosen by the user after sharing
  reference screenshots of the mood they want). The world is the inside of the machine as
  ancient, overgrown ruins. Everything here is original computer hardware; no shapes, characters
  or layouts are taken from any existing game.
  - **Plazas:** walkable ground is pale mint/teal circuit-board slabs. Seams fall every 3–4
    tiles, not on every tile. Thin copper-style traces, solder pads and vias run across slab
    boundaries, painted procedurally from a fixed seed.
  - **The void:** the rooms float over a dark data void. Void tiles are part of the room layout
    (legend `~`, solid, so you can't fall in for now). Floor edges over the void show a cliff face
    dropping into darkness, with cables hanging down it. Far below, faint silhouettes of giant
    boards and blinking lights give depth.
  - **Landmarks:** giant chips, capacitors and heat sinks sit along the back of a room and on the
    pillar footprints, never in the open fight area. Each has a white glowing core that lights the
    floor around it.
  - **Corruption:** NullNux's damage grows like overgrowth. Magenta/violet data blooms and cable
    vines creep over walls, cliff edges and some floor tiles. Blooms on solid tiles (legend `&`)
    are scenery; creep on the floor (legend `%`) is walkable decoration.
  - **Atmosphere:** drifting motes, a soft vignette, and additive glow only on dark surfaces (on
    pale floors it would just wash out to white). Motes and pulses stand still with reduced motion.
- **Palette:** Neon Circuit, with one deliberate change. Floors move from navy to pale mint/teal
  tints of Neon Circuit's own mint and cyan. The void keeps the deep navy background, corruption
  uses magenta and violet, and the HUD, glow colours, amber warnings, coral danger and region
  accents (Firmware amber, GRUB lime, Home warm orange) stay as they are.
- **Depth:** walls and machines are drawn with a lit top face and a darker front face. Every
  character and creature casts a soft oval shadow. Glowing things (Pip, cores, projectiles, lit
  circuits) draw an additive light pool on the floor. Glow halos are **pre-rendered** per sprite.
  No per-frame `shadowBlur`, which is slow on iPhone.
- **Sprites** are authored in code as palette-indexed text grids (one character per pixel) and
  turned into offscreen canvases at startup. There are no image files to draw and everything is
  diffable. Sizes:
  - Colonel: 32×32, 4 directions × idle/walk/attack/dash/hurt frames.
  - Pip: 16×16 orb that floats and bobs beside the Colonel.
  - Lil Tux, Bios, Grub: 24–32 px.
  - Mites: 16 px. Wisps: 24 px. Bosses: 48–64 px.
  - Tiles: 16 px floor, wall, door, terminal, socket, memory crystal, cracked wall.
  
  Designs follow the existing characters (Colonel's officer cap with penguin emblem, visor eyes,
  chest core; Pip's one big eye and "1" badge).
- **Fog of war** becomes darkness in two places:
  - Unvisited rooms are dark on Pip's map.
  - **Dark rooms** in the Firmware Foundry ("Cozy. Well, no. Dark.") have only a small light
    circle around the Colonel and Pip until lit with `ls`.
- **Room transitions:** a quick slide to the next room, or a cut with reduced motion.
- **Glitched rooms** (NullNux events) get scanline tearing and colour shifts, and stay still with
  reduced motion.

## 6. How it plays

### 6.1 Controls

| Action | PC | iPhone (landscape) |
|---|---|---|
| Move | WASD / arrows | Virtual stick, bottom-left (appears where the thumb lands) |
| Aim | Mouse | Facing direction, with light aim-assist toward the nearest enemy in a 60° cone |
| `kill` (melee) | Left click / J | Big button, bottom-right |
| `trap` (parry) | Right click / K | Button |
| Dash | Space / Shift | Button |
| Tools (`echo`, `ls`, `cd`) | 1–3 / Q-E to cycle | Small tool buttons above the action buttons |
| Talk / use | E / Enter, or walk into a character and press `kill` | Context button appears near the thumb |
| Pip panel, map, rest | Existing HUD buttons | Same, sized ≥ 44 px, inside safe areas |

Touch: multi-touch (stick + a button at once), `touch-action: none` on the game, no long-press
callout or text selection, controls kept inside `env(safe-area-inset-*)`.

### 6.2 Combat (the Hyper Light Drifter half)

Starting numbers. The builder tunes these through playtest.

- **Stability** (health) stays 100, shown as a segmented bar. Kid mode: 130, and enemies 0.8×
  speed (as now).
- **`kill`** — 3-hit melee combo, about 12 damage each, with a small forward lunge. Each hit
  cools the heat meter a little, which rewards getting close.
- **`kill -9`** (upgrade, needs CPU module) — hold to charge (0.6 s), a heavy strike for about 40.
- **Dash** — about 70 px over 0.15 s, invulnerable for the whole dash, 0.35 s cooldown. Not a
  command, just the Colonel's own move.
- **`trap`** (parry) — 0.18 s window (kid mode 0.30 s).
  - Catching a projectile reflects it at 2× damage.
  - Catching a lunge stuns the enemy for 1.2 s.
  - A missed parry has a 0.35 s recovery where you can be hit. That's the risk.
- **`echo`** (ranged) — fast bolt with the existing heat meter and overheat lockout. `echo -n`
  upgrade: 25% faster fire (as now).
- **Unparryable attacks (`SIGKILL`):** bosses telegraph a red "9" ring attack that `trap` can't
  catch. You must dash. Pip explains why the first time: in real bash, `trap` can't catch SIGKILL
  or SIGSTOP. A fact turned into a mechanic.
- **Hit feedback:** brief hit-stop (about 50 ms), white flash on hit, knockback, number pops,
  particles, screen shake (off with reduced motion). The existing synth sounds.
- **Creatures** keep their identities and weaknesses:
  - **Glitch Mites:** cloaked; `ls` reveals them.
  - **Loop Wisps:** blink and teleport; dash through their burst.
  - **Corrupt Boot Glitch** and **Missing Kernel Wraith:** multi-phase bosses with telegraphed
    patterns and one SIGKILL attack each.

### 6.3 Exploration and tools (the Zelda half)

- **Rooms by node kind:**

  | Old node kind | Room |
  |---|---|
  | `start` / `character` | Safe room. A rest spot and a `cd` fast-travel terminal once visited. |
  | `problem` | Creatures spawn when you enter. Forward doors seal until cleared; the door you came in by stays open, as today's "step back" rule. Leaving resets the creatures. |
  | `circuit` | A broken terminal. Using it opens the existing rotation puzzle (restyled in pixels). Solving it powers a door or bridge. |
  | `item` | Hardware module on a pedestal/socket, or a bits cache. |
  | `memory` | A glowing memory crystal. Touch it to recover the log line. |
  | `boss` | Doors seal on entry, after a "Fight! / Not yet" prompt at the door. |
  | `exit` | The passage onward. |

- **Hidden caches** (`f14`, `f15`, `g14`, `g15`): behind cracked walls that only show up when
  you pulse `ls -a` next to them, as today's "`ls -a` reveals hidden caches".
- **Tools gate places:**
  - **`ls`** — light pulse (cooldown): lights dark rooms for a while and reveals cloaked
    creatures and hidden switches. `ls -a` also reveals cracked walls to hidden rooms.
  - **`echo`** — also hits switches across gaps you can't walk over.
  - **`cd`** — at a lit terminal in a safe room, fast-travel to any visited safe room (today's
    `fastTravel`). In the GRUB Gate, **loop doors** send you back to the start of the room unless
    you `cd` at the path sign and pick the right path. That's the boot-loop idea, now walkable.
  - **`kill`** — also breaks corrupt blocks.
- **Pip's map** (in the Pip panel): a pixel minimap of the region's room grid. Visited rooms are
  lit, neighbours dim, the rest dark. Icons show what each room holds, plus the existing legend.
- **Loadout:** `kill`, `trap` and dash are always on. **Tool slots** hold `echo`/`ls`/`cd`: 2 slots,
  +1 per RAM stick, using today's `stats().slots` and `equipped`. Change them in Pip → Items when
  out of combat.
- **Modules:**
  - RAM: +1 slot.
  - Fan: less heat.
  - CPU: faster cooldowns; needed for `kill -9`.
  - SSD: **move 20% faster and dash cooldown −25%**. It replaces "travel twice as fast". The
    real fact stays the same: faster storage, no moving parts.

### 6.4 Teaching order in Chapter 1

Each command is still learned by typing it in the learning terminal (`ui.learn`). The teacher's
"In real Linux…" line follows.

| Where | Teacher | Command | In the game | Real-Linux line (must stay accurate) |
|---|---|---|---|---|
| Power Rail (`f1`) | Pip | `kill` | melee | `kill` sends a signal to a process. By default it's SIGTERM, which asks it to quit politely; `kill -9` sends SIGKILL, which the process can't catch or ignore. |
| First problem room (`f5`), on entry, before creatures wake | Pip | `trap` | parry | In bash, `trap 'echo caught' INT` runs a command when the shell gets SIGINT (Ctrl+C). Scripts use it to clean up. SIGKILL and SIGSTOP can't be trapped. |
| Firmware Vault (`f3`) | Bios | `ls` | light pulse / reveal | unchanged |
| A switch-across-a-gap room in Firmware (builder picks, before `f9`) | Pip | `echo` | ranged bolt / switches | unchanged |
| GRUB Shell (`g1`) | Grub | `cd` | fast travel / loop doors | unchanged |
| Home (`g13`) | Lil Tux | `systemctl suspend` | 💤 Rest | unchanged |

Pip's first lines change from teaching `echo` to teaching `kill`, keeping the same voice. The
character lines that mention `cd` as a dash change to the new meaning. Dash is the Colonel's own
move, so it needs no lesson. A one-line tip appears the first time ("Space / ⤴ to dash").

### 6.5 Clean fixes

"Clean fix" becomes **clearing a problem room without taking a hit**, which is the timing skill
this rebuild is about.
- `stats.clean`, the Clean Fixer badge, and Pip's task (reworded: "Clear 3 problem rooms without
  taking a hit") stay.
- `R.quickFix` is replaced by `R.clearRoom(state, id, { clean })`.
- Clean clears keep today's clean reward. Normal clears get the fight reward.

### 6.6 Story, resting and checkpoints (unchanged in meaning)

- 💤 Rest only in safe rooms (start / character / cleared, not glitched). Break reminder, rest
  while away, one NullNux event per rest, and the `taken` cliffhanger at Home all work as today.
- `rebreak` re-breaks a solved circuit room's terminal. `glitched` rooms render glitched.
- Losing all stability means rebooting at the last checkpoint room, with loot kept and the same
  friendly Pip line.

## 7. Saves and migration

- `CK.State` save version `v: 1 → 2`. Node ids are unchanged, so `region`, `node`, `explored`,
  `cleared`, `memories`, `checkpoint`, `story` all carry over.
- **Upgrading v1 saves:**
  - Anyone who had met Pip (`learned` includes `echo`) also gets `kill` and `trap`. A one-time
    toast says "New moves: `kill`, `trap`, dash" and Pip's lines run once ("you can do more than
    shoot now").
  - `equipped` keeps only tools (`echo`/`ls`/`cd`), trimmed to slots.
  - A save standing inside an uncleared problem or boss room resumes at its checkpoint (as today).
  - An unknown `cd -` upgrade is dropped and its bits refunded.
- `CK.State.load` keeps repairing bad saves, now with tests for v1→v2.

## 8. Code shape (builder may refine)

| File | Role |
|---|---|
| `js/ck/engine.js` | **Changed:** low-res buffer, integer scale, camera, fixed-step update (60 Hz) |
| `js/ck/input.js` | **New:** keyboard/mouse/touch → one input state. Virtual stick and buttons (DOM). Ready for gamepad later. |
| `js/ck/pixel.js` | **New:** palette-indexed sprite grids → offscreen canvases, pre-rendered glow, flipping, frames |
| `js/ck/sprites.js` | **New:** sprite data (characters, creatures, tiles, effects) |
| `js/ck/rooms.js` | **New:** per-room tile layouts, doors, spawns, props, keyed by node id |
| `js/ck/action.js` | **New, replaces `combat.js`:** pure simulation (no drawing). Tile collision, entities, hitboxes, dash invulnerability, parry window, projectiles, enemy patterns, SIGKILL attacks. Deterministic (`CK.rng`), `step(dt, input)`. |
| `js/ck/scenes.js` | **Changed:** world scene (room render, transitions, light, fog), puzzle scene restyled, minimap |
| `js/ck/art.js` | **Changed:** pixel renderer helpers (or merged into `pixel.js`) |
| `js/ck/world.js` | **Changed:** skills (`kill`, `trap` added), room grid coordinates per node, edges matching the grid, lines updated |
| `js/ck/rules.js` | **Changed:** `clearRoom`, tool slots, `sanitize` for v2. Fog/reveal/blocking kept. |
| `js/ck/ui.js` | **Changed:** HUD for stability/heat/tools, touch controls host, rotate overlay, minimap in Pip panel |
| `js/ck/main.js` | **Changed:** room-based flow (enter room, not arrive at node) |

New files go into `index.html`, `tests/e2e/ck-harness.html` and `sw.js` `FILES`, and `VERSION`
moves to `lilnux-v7`.

## 9. Testing

- **Unit (`node --test`):**
  - Action simulation: collision with walls, dash invulnerability, parry window and reflection,
    missed-parry recovery, SIGKILL unparryable, combo damage, enemy death and clear, kid mode
    windows.
  - Rooms data: every edge is grid-adjacent and has matching doors on both sides, every room
    reachable, every node kind represented.
  - Rules (`clearRoom`, slots).
  - State v1→v2 migration.
- **E2E (Playwright + Chromium, installed outside the repo so "no dependencies" holds):**
  - Engine scaling at PC and iPhone-landscape sizes.
  - World scene renders and moves between rooms.
  - Touch controls (multi-touch) and the portrait rotate screen.
  - Full Chapter 1 playthrough through `?ckdebug` hooks.
  - `lilnux-regression.e2e.js` must stay green throughout: Learn mode is untouched.
- **Get the existing e2e suites running on this PC first**, as the baseline.

## 10. Delivery

All work on branch `ck-action`. `main` stays live until the user says "push it".

1. **Vertical slice → playtest zip.** One room with movement, `kill`, dash, `trap` and Glitch
   Mites, on keyboard and iPhone landscape. The user plays it and we tune the feel before any
   more building.
2. **Chapter 1 rebuild.** All rooms, tools, puzzles, bosses, story hooks, migration, minimap →
   playtest zip.
3. **Polish and review** → merge to `main` on "push it". Update `docs/HANDOFF.md`, including the
   changed hard rule: **Adventure is landscape on phones; Learn stays portrait.**

## 11. Left to the builder

- Exact room layouts, the room grid per region, and the placement of switches, dark rooms and
  loop doors.
- All combat numbers, enemy patterns and boss phases (tuned at the slice playtest).
- Sprite designs within the style above.
- Sound effects beyond the existing set.
- Which deferred-polish items disappear naturally. Several (map node size, keys 1–5 on the map,
  cooldown ring, Q/E fight buttons) are made obsolete by this rebuild.

### Calls made by Claude (not asked of the user; open to change)
- Rooms on the existing node graph (Approach A).
- Command roles: `kill` melee, `trap` parry, `echo` ranged, dash innate. Pip teaches the basics.
- Clean fix = no-hit room clear.
- SSD changes to move/dash speed.
- `cd -` upgrade removed; `kill -9` added.
- Sprites authored as code text grids, not image files.
- Landscape-only on phones, with a rotate screen in portrait.
