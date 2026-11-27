# Firmware Foundry map rework (design)

Date: 2026-11-27. Branch: `ck-firmware-map`. Status: approved in chat (signposting B, five looks, colors by state, three new characters); the user then said "build it".

## Why

Playtest feedback on Firmware Foundry (the first level): the layout needs to be smoother; directions are not obvious; doorways are sometimes not accessible; area transitions are hard to identify; the programs to meet can't be found; it feels empty.

Audit (2026-11-27, from the generated rooms): every door is reachable at tile level except Power Rail's east door (retracted bridge, by design). The causes are signage and sameness:

- every room is the same 30x17 plaza with doors at the same spots;
- a room's name only appears in Pip's Map tab; open doors are a faint 3 px line;
- shut doors (uncleared problem rooms, cracked walls, the bridge gap) all look like bugs;
- Firmware has two characters in 16 rooms, and the quest text names a room without a direction;
- three pairs of adjacent grid cells have no door (f14-f6, f4-f7, f8-f11), implying links that do not exist.

## Goals

1. A player always knows which room they are in, where the next goal is, and why a shut door is shut.
2. Each area of Firmware looks different at a glance, and rooms change color with state (power on/off, enabled/disabled).
3. More to meet: three new optional characters with their own voice and accurate firmware facts.

## Non-goals

- No change to the room graph, the story beats, skills, combat or save format beyond one new list.
- No new commands to learn. No new music. GRUB Gate keeps its current look (the signposting applies to it too, because it shares the code).

## Approaches considered

Scope A (signposting only), B (signposting plus room character), C (redesign the room graph). The user chose **B**: it keeps the 49-test Chapter 1 playthrough valid. New characters: chose "add two or three small optional ones, no new commands".

## Design

**Signposting (style B).** An HTML overlay over the canvas (text never goes in the pixel canvas):

- a banner on entering a room: name plus a one-line blurb (real firmware facts), fading after about 3 s;
- the door toward the current goal glows gold and always shows the destination name with a ➤;
- shut doors show a lock chip with the reason: "Clear this room", "echo the switch", "ls -a, then kill", "cd /boot";
- other doors fade in their destination name when the Colonel is within 3 tiles; an unexplored destination shows "???".

Goal: the first unlearned teacher character in the region (Bios, then Grub), else the boss, else the exit (GRUB Gate: Home). The next step is the first move of the shortest path over the graph, ignoring hidden rooms that have not been found. Pure functions in `rules.js` (`goalNode`, `nextStep`, `doorInfo`), unit-tested.

**Five looks** (new landmark tiles in the room legend; `zone` per node in `world.js`):

1. Power and Clock: Cold Boot, Power Rail, CMOS Cell (amber rails, capacitor banks, a coin battery in CMOS Cell)
2. The Vaults (ROM): Firmware Vault, Boot ROM, Option ROM (rows of ROM chips, a padlocked BIOS chip)
3. Memory: RAM Bank, DIMM Slot (rows of RAM sticks)
4. Lanes and Buses: PCIe Lane, Power Bus, ACPI Table, Clock Gen (striped data lanes, a crystal can)
5. Boot Sector (dark sector rings) and, as its own look, To GRUB (lime glow with chevrons to the exit)

Hidden Cache rooms use their neighbour's look with a faint glow. Landmarks replace the random chips and heat sinks in Firmware; GRUB Gate keeps them.

**Color by state.** The static art is painted once; state changes only a runtime layer:

- a room is *powered* when its own job is done: problem, circuit and boss rooms are unpowered (dim, cool-tinted, glows and LEDs low) until cleared; every other room is powered;
- once the Power Bus is solved, a lit layer of accent traces (amber rails, cyan lanes) shimmers in powered rooms;
- enabled vs disabled: open doors use the area accent; shut doors turn grey with a coral lock tint; the retracted bridge, broken terminal and switch already change state and keep doing so.

**New characters** (flavor only, kind of room unchanged; node field `friend`): CMOS (CMOS Cell), Opti (Option ROM), Acpi (ACPI Table). Each has its own sprite, voice and 3 to 4 lines; first meeting says the lines, later visits a short toast. Met list saved in `state.friends` (default `[]`, loads from older saves). ACPI foreshadows `systemctl suspend` (sleep states).

## Constraints

Real firmware and Linux facts must be accurate. Touch targets 44 px. Reduced motion: no fades or shimmer movement beyond a still state. Tests first; all suites pass; cache version bump; no push without the user's OK.

## Left to the builder

Exact pixel art, label positions, and the dialogue wording (the user can review it in the build notes in the README next to this file).
