# Colonel Kernel — story update: Lil Tux, NullNux and resting

Status: agreed in conversation · 2026-11-22 · extends `2026-11-22-colonel-kernel-design.md`
(where this document disagrees with the original story section, this one wins).

## 1. The story arc

- **Goal of the whole adventure:** save **Lil Tux** (the penguin mascot who guides the family through
  the LilNux learning worlds) from **NullNux**, a corrupt kernel.
- **NullNux is the Colonel's id — his raw alter ego.** While the Colonel *rests*, he becomes NullNux and
  corrupts the system he is restoring. The player discovers this slowly; the hero is the saboteur.
- **Real-Linux anchor:** Pip is PID 1. NullNux is **PID 0** — the kernel's idle task (`swapper/0`), which
  runs whenever the system has nothing to do, i.e. while the kernel rests. Null = 0.
- **Ending (proposal, accepted):** PID 0 can never be deleted — the kernel needs its idle task. The
  Colonel doesn't destroy NullNux; he takes back control of him and frees Lil Tux.
- The old finale boss "Kernel Panic" may appear as a phase or consequence (e.g. NullNux tries to kill
  PID 1, which panics the kernel) — builder's call when the finale is built.

### Slow reveal — clue ladder across chapters
1. Odd memory fragments stamped *after* boot, mentioning `swapper/0`.
2. Things the Colonel fixed are found broken again after he rests.
3. Corrupt edits signed with the Colonel's own ID.
4. His visor flickers red when idle.
5. A silhouette in the fog wearing his cap.
6. Lil Tux's distress signal traced to *inside* the Colonel's own core.
Pip never explains the clues early; he notices them and shrugs them off.

## 2. The NullNux finale (built later, after Chapter 8)

- Phase 1: "normal" arena boss — a mirror Colonel with black cap and red visor.
- Phase 2: the fourth wall breaks — arena frame cracks, HUD and skill bar glitch away, NullNux addresses
  the **player by name**.
- Phase 3: a raw root terminal, **no hints** — the player types real commands **from memory**
  (`ls -a`, `grep`, `chmod -x`, `cd`, `kill`, …) to undo NullNux step by step.
- **Adds** spawn all over the screen; left alone they scramble the player's command line. The player
  **clicks to shoot** them; defeated adds drop **hint fragments** (e.g. `c h m _ _ + x`) when stuck.

## 3. Hard rule: never real harm

The game never touches the real computer, its files, or the browser outside its own window — and never
pretends to (no fake system crash dialogs, no fake "deleting your files"). Every scary moment is clearly
in-game and runs in the pretend sandbox.

## 4. Resting (the mechanic)

The Colonel rests in three ways — all count the same:
1. **Quitting** (closing the mode/tab, or the page hidden) and coming back after ≥ 5 minutes.
2. **Break reminders:** after ~35 minutes of play, Lil Tux (or Pip, before Lil Tux is met) gently suggests a
   break, at most once per 35 minutes, easy to dismiss.
3. **In-game rest:** a **💤 Rest** button at safe spots (start and character nodes) once unlocked. Taught as
   the real command `systemctl suspend` (which really puts Fedora to sleep).

**Corruption while away is secret:** the game never explains it. Each rest triggers **at most one**
NullNux event, never more for longer absences, and **never loses progress, items, skills or bits**.
Fixing corruption pays bits.

## 5. Chapter 1 update (this round)

- Chapter 1 becomes a **complete, very basic computer**: Firmware Foundry → GRUB Gate → the boot finishes
  and a new final node **Home** (the booted desktop) comes online.
- **Lil Tux lives at Home.** He thanks the Colonel, explains resting, teaches `systemctl suspend`
  (unlocking 💤 Rest), and suggests the first rest.
- **Before meeting Lil Tux,** rests may cause one small clue: a repaired circuit broken again (pays bits to
  re-fix), an odd `swapper/0` log line, or a one-time red visor flicker.
- **The first rest after meeting Lil Tux is the kidnapping:** the Colonel wakes, Lil Tux is gone, Home is
  glitching, there's a `swapper/0` log line, Pip is baffled. Chapter 1 completes on this cliffhanger.
- Light foreshadowing earlier in the chapter (a faint penguin-shaped signal), no early explanation.

## 6. Anti-goals (in addition to the original design)

- Punishing absence: corruption is story, never loss; no scaling with time away.
- Nagging: break reminders are rare, friendly and dismissable.
- Explaining the twist early.
