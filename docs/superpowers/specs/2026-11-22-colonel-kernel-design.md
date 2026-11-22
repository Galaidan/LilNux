# Colonel Kernel — design

A second play mode for LilNux: a futuristic exploration + skillshot videogame in which
Colonel Kernel, who has lost his memory, restores a dark, broken Linux computer region by
region, learning real Linux commands as powers from characters who personify the parts of
the system.

Status: draft for approval · 2026-11-22

## 1. Intent and why

LilNux today teaches Fedora/Linux through lessons, quizzes and pretend-terminal missions.
The family wants a mode that feels like a **real videogame** — something the kids (and
grown-ups) come back to because it's fun — while still teaching **real, accurate Linux**.

The player should *see a whole system*, uncover it through fog of war, collect and equip
skills that are real Linux commands, and deploy them to fix problems. Hooks come from
**unlocking new things and upgrading**, especially physical hardware modules that enhance
skills.

Success looks like: the kids ask to play it; after playing, the family can say what the
BIOS, bootloader, kernel, init/systemd, file system, shell, packages and network do, and
recognise the real commands (`ls`, `cd`, `kill`, `chmod`, `grep`, `sudo`, …) and what they're for.

## 2. Story

- **Colonel Kernel** wakes in a dark, broken computer with no memory of who or what he is.
- **Pip (PID 1)** — a small floating companion — is with him from the start. On real Linux,
  the first program the kernel starts gets process ID 1 and starts/looks after everything
  else, so Pip is "the first friend he ever made". Pip is scrambled too; they rediscover
  things together.
- Each restored region returns a piece of his memory. **Memory fragments** are real-style
  kernel log lines (what `dmesg` shows), collected as glowing pickups.
- Late in the game he learns `dmesg` and reads his memories back. **Twist:** he *is* the
  kernel — the heart of the system. Remembering who he is = understanding how Linux works.
- Finale: a boss fight against **Kernel Panic**.

## 3. Goals, non-goals, anti-goals

**Goals**
- Feels like a modern, good-looking videogame: smooth animation, glow, particles, fog that peels back.
- Every skill is a real Linux command, and the game explains it accurately in real-Linux terms.
- Walks the real boot order and system layers, so the map itself teaches how Linux fits together.
- Hooks: unlocks, hardware module upgrades, skill upgrades via real command options, collections.
- Playable by the whole family on desktop (Firefox/Fedora, Windows) and iPhone (touch).

**Non-goals**
- Multiplayer, online features, leaderboards beyond the existing local family one.
- Touching the real computer. Everything is simulated, like the existing pretend terminal.
- Downloaded art, music or fonts; voice acting.
- Endless/procedural levels.

**Anti-goals** (would be a failure even if it works)
- Wrong or misleading Linux facts.
- Manipulative hooks: daily-login pressure, streak punishment, timers that nag, any money.
- Punishing kids: losing all progress, unwinnable fights for young players.
- Neon that's hard to read (low contrast text, colour-only cues).
- Working only on desktop, or breaking the existing LilNux mode.

## 4. Constraints

- Plain HTML/CSS/JS, **no build step, no dependencies**, classic `<script>` tags (as today).
- Must work offline: add new files to `sw.js`'s cache list and bump its `VERSION`.
- Hosted on GitHub Pages; also opened straight from disk (`file://`) on Fedora/Windows.
- Input: mouse + keyboard (number keys for skills) **and** touch (iPhone). Tap targets ≥ 44px.
- Shares the existing family players, XP, ranks and badges (`localStorage` key `lilnux.save.v1`).
- Respect `prefers-reduced-motion` and the existing sound toggle; "Read to me" via `speechSynthesis`.
- Runs smoothly on a phone: canvas sized to device pixel ratio (capped at 2), pause when tab hidden.

## 5. Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A ✅ picked** | Hand-built engine: `<canvas>` for map, fog, characters, creatures and fights; normal HTML on top for Pip's panel, dialogue, quest log, inventory, motherboard | Best look and true aim/timing skillshots, crisp readable text, nothing extra to download. Most code to write. |
| B | Board of HTML tiles, no canvas | Simplest and closest to existing code, but skillshots feel stiff, fog is blocky, phones may stutter — a board game, not a videogame. |
| C | Vendored Phaser game library | Faster engine features, but ~1 MB more to cache offline and a third-party toolkit to learn; menus still built separately. |
| — | Unity/Godot | Ruled out: tens of MB, poor iPhone Safari support, tools outside the project. |

The family picked **A** because they want a real videogame feel without adding weight or a dependency.

## 6. How it plays

### 6.1 The map (navigator)
- Each region is a **circuit-board map**: nodes (system parts, e.g. `/home`, a service,
  a process, a disk) joined by glowing traces. The whole region's outline is visible;
  everything beyond Colonel Kernel's sight is under **fog of war**.
- Movement is **point-and-click / tap**: tap a connected node and he travels along the trace.
  Fog lifts around wherever he's been (radius grows with upgrades).
- Nodes can hold: a character, a problem, an item/module, a memory fragment, a locked
  door, a circuit to repair, or the region's boss gate.
- The camera pans/zooms smoothly; pinch/scroll zoom optional.

### 6.2 Problems — two speeds
1. **Quick fix (calm).** Arriving at a problem pauses everything. If the matching skill is
   equipped and the player uses it, it's fixed instantly with a **clean-fix bonus**.
2. **Skillshot fight (action).** If the player uses the wrong skill, doesn't have it equipped,
   or chooses to fight, the problem becomes a **creature** in an arena. The player
   points/taps to fire skills (projectiles travel, so you lead moving targets — real
   skillshots), managing cooldowns and an **overheat** meter. Creatures attack Colonel
   Kernel's **stability** bar. Each creature has a **weakness** shown by Pip as an icon +
   text (never colour alone).
- A problem blocks its node: the player can step back to the previous node, but can't pass
  until it's fixed (builder's call, to keep the "fix it now or fight it" rule clear).
- Losing a fight returns him to the last checkpoint node; loot already collected is kept.
- After a fight, the character who taught the winning skill gives a short **"In real
  Linux…"** explanation of what just happened.

### 6.3 Building (circuit repair) — *proposal*
Broken traces block paths. Repairing them is a short **circuit puzzle**: rotate/place trace
tiles to route the signal from source to target, sometimes needing a component installed
with `dnf install` (Package Port onward). This is the "system/circuit builder" part of the ask.

### 6.4 Skills, loadout and upgrades
- Characters teach skills. **To learn one, the player types the real command once** in a
  small pretend terminal (reusing `LilShell` from `js/terminal.js`) — the bridge to real Linux.
- **Loadout:** equip a few skills at a time (slots = RAM sticks installed). Equip on the map,
  not mid-fight. Keys `1–5` or tap the skill bar.
- **Skill upgrades = real command options**, bought with **bits** (currency from fights and
  exploration), some needing a module: `ls` → `ls -a` (reveals hidden things),
  `kill` → `kill -9`, `rm` → `rm -r` (clears whole nests, riskier aim), `chmod` → `chmod +x`, etc.

### 6.5 Hardware modules (physical upgrades)
Found in the fog or dropped by creatures; plugged into **Colonel Kernel's motherboard**
(limited slots). Each teaches what the real part does:

| Module | Game effect | Real-world lesson |
|---|---|---|
| RAM stick | +1 loadout slot | more memory → more things open at once |
| CPU core | faster skill recharge | more cores → more work in parallel |
| Cooling fan | slower overheat | heat limits performance |
| SSD | faster travel | storage speed |
| GPU | bigger fog-clear radius, steadier aim | graphics processing |
| Network card | unlocks Network Nexus | how computers connect |
| Battery/UPS | one extra life per fight | power backup |

### 6.6 Pip (PID 1)
Small floating companion, always on screen. Pip's panel has four tabs:
- **Quests** — main goal, restored regions, who to talk to next.
- **Items** — inventory, modules, motherboard screen, bits.
- **Combat** — in fights: points out the weak spot, hints the right skill, cooldown reminders.
- **Tasks** — side jobs from characters (e.g. "Files: clear 5 junk temp files").

Pip speaks hints and story lines (with 🔊 Read to me).

### 6.7 Regions, characters, skills (follows the real boot order)

| # | Region | Character(s) | Skill(s) taught | Boss |
|---|---|---|---|---|
| 1 | Firmware Foundry (BIOS/UEFI) | **Bios** — old guardian robot who checks every part (POST) | `ls` — scan/flashlight, clears fog | Corrupt Boot Glitch |
| 2 | GRUB Gate (bootloader) | **Grub** — chunky friendly grub who chooses which kernel boots | `cd` — travel/fast-travel; upgrades `cd ~`, `cd -` | Missing Kernel Wraith |
| 3 | Kernel Core | **Sched** — juggling scheduler bot | `ps` — reveal processes/weak spots; `kill` | Runaway Process Hydra |
| 4 | systemd Station (Pip's home) | **Systemd** — conductor of services | `systemctl restart` — revive crashed service nodes | Failed Unit Golem |
| 5 | Filesystem Forest | **Files** — librarian; **Data** — mischievous data sprites | `rm`, `cp`/`mv` (move data to the right node), `chmod` | Permission Gremlin King |
| 6 | Bash Bazaar | **Bash** — hermit crab who lives in a *shell*; **Root** — stern admin | `grep` — find hidden things; pipes `\|` — combo two skills; `sudo` — power-up with a cost | Fork Bomb Swarm |
| 7 | Package Port | **Dnf** — dock master | `dnf install` — install components into circuit sockets | Broken Dependency Serpent |
| 8 | Network Nexus | **Firewall** — shield knight; **Nic** — messenger | `ping` — sonar reveals distant fog; firewall shield | Packet Storm |
| ★ | The Core (finale) | memories via `dmesg` | `dmesg` — read memory fragments | **Kernel Panic** |

Each region: ~10–20 minutes. Whole adventure: roughly 2–3 hours.

### 6.8 Hooks and rewards
- Unlocks: new regions, characters, skills, skill upgrades, modules.
- Collections: memory fragments per region, a **codex** of learned commands (real usage +
  example, like a friendly `man` page), a gallery of characters met, creatures defeated.
- Shared with LilNux: XP feeds the same player rank; new badges (e.g. one per region,
  "Clean Fixer", "Memory Restored", "Panic Defeated").
- No daily-login rewards, streaks, timers or purchases.

### 6.9 Kid mode (existing per-player setting)
Slower creatures, bigger hitboxes, light aim assist, free hints, gentler stability loss.

## 7. Look and feel — "Neon Circuit" (*proposal*)

Unique, futuristic, good to look at, readable.
- **Background:** deep space-navy to indigo (`#060a1c` → `#14103a`) with a faint animated
  circuit grid and slow parallax star-dust.
- **Glow palette:** cyan `#38f2ff`, magenta `#ff4fd8`, violet `#8b5cff`, mint `#6dffb0`,
  amber `#ffb347` (warnings), coral `#ff5d73` (danger). Each region has its own accent
  (Firmware amber, GRUB lime, Kernel violet, systemd cyan, Filesystem mint, Bash magenta,
  Package orange, Network electric blue, Core white-hot).
- **Traces** pulse with travelling light; restored circuits light up in the region accent.
- **Fog:** dark, softly animated nebula; revealed areas fade in through a soft radial edge.
- **Panels:** translucent "glass" (blurred background, thin glowing border, rounded corners).
- **Characters:** geometric, holographic robots/creatures with simple expressive faces,
  drawn in code. Colonel Kernel: compact robot, officer cap with a small penguin emblem,
  visor eyes, glowing core in his chest. Pip: a small orb with one big friendly eye and a
  "1" badge, trailing sparkles.
- **Type:** system fonts (Adwaita Sans/Cantarell/system-ui), uppercase letter-spaced HUD
  labels; monospace for commands. Text contrast ≥ 4.5:1 on panels.
- **Feedback:** screen-shake (reduced-motion aware), hit sparks, number pops, soft synth
  sound effects via WebAudio (existing sound toggle).

## 8. Fit with the existing app

- New entry point: a **🎮 Colonel Kernel** button in the top bar and on the world map,
  next to the existing worlds. Uses the currently selected family player. Available from
  the start — it doesn't require finishing the lesson worlds (builder's call).
- New files (suggested): `js/ck/engine.js`, `js/ck/art.js`, `js/ck/world.js` (region data),
  `js/ck/combat.js`, `js/ck/ui.js`, `css/ck.css`. Loaded by `index.html`; added to `sw.js`.
- Save: `player.ck = { region, node, explored, skills, upgrades, modules, bits, memories, quests, codex }`,
  saved at checkpoints and on every change of region.

## 9. Delivery — *proposal*

Build a **playable first chapter first** (engine, Pip, regions 1–2, one fight per
creature type introduced there, modules, saving, iPhone touch), get the family's
reactions, then build regions 3–8 and the finale on top.

## 10. Left to the builder

Exact node layouts and level design per region; creature stats, attack patterns and
balancing; currency amounts and upgrade costs; drawing details of each character;
sound design; code structure within the constraints above.
