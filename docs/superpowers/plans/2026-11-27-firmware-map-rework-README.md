# Firmware map rework: build notes

Branch `ck-firmware-map`, built 2026-11-27 from the design in `docs/superpowers/specs/2026-11-27-firmware-map-rework-design.md`. Cache is `lilnux-v15`. Merged to `main` as `a70755f` and pushed 2026-11-27; live.

## What changed

**Signposting (style B).** Overlay text, never canvas text.
- Entering a room shows a banner card (name, a one-line real-world blurb, and "👋 X is here" when an unmet friend lives there). It stacks inside the toast column, so it never overlaps Pip's messages.
- Each door has a label. The door toward the goal is gold and always shows `➤ Name`. A shut door wears a red chip: "Clear this room first", "Hidden crack: ls -a, then kill", "Set the path sign: cd /boot", "echo the switch", "Fight!", "Not found yet". Other doors fade their destination name in when the Colonel is within 56 px (3.5 tiles). Off-screen labels hide; only the goal door stays as an edge pointer.
- Goal = nearest teacher you have not learned from (Pip only for `kill`; his `trap` and `echo` lessons happen on the way), else the boss, else the exit (GRUB Gate: Home). Path = shortest route over the graph, never through an unfound hidden cache. Pure code in `rules.js`: `goalNode`, `nextStep`, `goalSide`, `doorInfo`, `isPowered`, `regionPowered`.
- In the canvas, the goal door's bar is gold and thicker, open doors use the region accent, and sealed or looping doors get a grey-coral bar under the barrier.

**Five area looks (Firmware only; GRUB Gate keeps its chips and heat sinks).** `zone` per node in `world.js`; landmark letters in `rooms.js` (`R` ROM chips, `M` RAM sticks, `V` coin battery, `Q` crystal can, `U` capacitor bank, `Z` padlocked BIOS chip, `L` PCIe slot); painted in `roomart.js`.
- Power and Clock: Cold Boot, Power Rail, CMOS Cell (amber rails flank the west-east corridor, capacitor banks, a coin battery)
- The Vaults: Firmware Vault, Boot ROM, Option ROM, both Hidden Caches (violet pad grid, ROM chip rows, the padlocked BIOS chip)
- Memory: RAM Bank, DIMM Slot (RAM sticks, slot lines with gold contacts)
- Lanes and Buses: PCIe Lane, Power Bus, ACPI Table, Clock Gen (data-lane bundle with east chevrons, PCIe slots, the crystal can)
- Boot Sector (`boss`): a bare arena with concentric sector rings
- To GRUB (`gate`): a bare room whose floor glows GRUB lime, with chevrons running to the exit
- Rooms in the first four areas also get two interior machines in the quadrants (capacitor banks, ROM chips, RAM sticks or slot rows), chosen per room from a seeded stream; the cross between the four doors is always clear (a unit test guards it).
- Hidden Cache rooms keep the Vaults look plus a cyan glow.

**State colors.** A room is *powered* when its own job is done (problem, circuit and boss rooms are dim, cool-tinted and low-glow until cleared; every other room is on). The scene crossfades over 0.8 s (a cut with reduced motion). Once the region's power node is solved (Power Bus `f9`, GRUB's Root Bridge `g9`), each area's floor motif lights up and shimmers (rails go gold, lanes go cyan with chevrons). Doors and the bridge, terminal and switch show enabled vs disabled as before, with the new bar colors.

**Three new optional friends** (no commands, no tool slots): CMOS in CMOS Cell, Opti in Option ROM, Acpi in ACPI Table. Press E near them; the first talk is 3 to 4 lines and gives 5 XP, later talks are a one-line toast. Saved in `state.friends` (older saves load with `[]`). The sprites are original pixel art in `sprites.js`.

## My calls (check these)

- Pip is not a goal after `kill`: he teaches `trap` and `echo` on the way, so pointing at his room again would be wrong.
- The three friends went into rooms that already have a memory crystal, so each room has a reason to be visited twice. I did not add them to Pip's Quests tab or Map icons.
- Friends are not auto-met on arrival (Bios, Grub and Lil Tux still are). The banner line "👋 CMOS is here" is the nudge.
- Unpowered rooms are the five problem/circuit/boss rooms. Non-blocking rooms are never dim, because dimming rooms you are meant to rest and explore in would read as broken.
- GRUB Gate gets the banner, door labels, blurbs and power states too (shared code), but keeps its original look.
- XP for meeting a friend is 5. Easy to change in `main.js` `meet()`.

## Dialogue and facts to review

Each line is in `js/ck/world.js` (`CHARACTERS.cmos / opti / acpi`, and the `BLURBS` table for every room). Facts used: a CMOS coin battery (about 3 V) keeps the real-time clock and firmware settings alive; `timedatectl` and `hwclock` are real; Option ROMs are firmware on add-in cards and run at boot (UEFI runs them as drivers); ACPI tables describe hardware to the OS, and S3 is suspend-to-RAM; `systemctl suspend` is real.

Acpi's last line is about S4 (hibernate: memory to disk, power fully off). An earlier draft hinted at the idle task; that was cut, because it is wrong for S3 (nothing runs while suspended) and gives away the NullNux reveal too early.

## Not done (said plainly)

- **Varied room silhouettes.** Option B in the chat mentioned "varied room shapes". Every room is still the same 30x17 plaza with seeded corner bites. The look now comes from the area floor, landmarks and interior machines, not from different outlines. If "feels empty" survives playtesting, this is the next lever.
- The back-wall landmarks sit on rows 1 and 2, which scroll under the top HUD on small screens; the interior machines are the ones you will see most.

## Not verified

- Real iPhone: label positions on a small landscape screen, the extra canvas work of the crossfade, and the lit-layer shimmer (one extra full-room blit per frame in powered rooms).
- A room's lit motif is drawn at full-room size every frame while powered. If a phone gets warm, draw it every other frame or skip the shimmer.
- Screenshots were checked by eye at 1280x720 only.

## Tests

Unit tests: `tests/ck/signs.test.js` (goal, path, door info, power), `tests/ck/firmware-map.test.js` (areas, blurbs, friends, saves, landmark placement, every door reachable from the spawn except the retracted bridge). E2E (in `ck-adventure.e2e.js`): signposting banner and goal door, sealed-room chips and near-door names, friend conversation, power crossfade, goal side.
