# 🐧 LilNux

A family game for learning **Fedora 44 Workstation** and **Linux**.
It runs entirely offline in your web browser — no installs, no accounts, nothing sent anywhere.

## Start playing

**Easiest:** open the `LilNux` folder in the Files app and double‑click `index.html` (it opens in Firefox).

**From the Terminal:**

```bash
cd ~/LilNux
./play.sh
```

**Add it to the app grid** (so anyone can press Super and type “LilNux”):

```bash
cd ~/LilNux
./install-shortcut.sh
```

Remove the shortcut with `./install-shortcut.sh --remove`.
If the scripts say “Permission denied”, run `chmod +x play.sh install-shortcut.sh` first (you’ll learn why in World 5!).

## 🎮 Colonel Kernel (videogame mode — Chapter 1)

A futuristic adventure for teens and grown-ups. **Colonel Kernel** wakes up inside a dark,
broken computer with no memory of who he is. With his companion **Pip** (PID 1), he restores
the machine region by region, following the real Linux boot order, and slowly works out
that *he is the kernel*.

- **Explore:** tap glowing circuit nodes to move. Fog of war hides everything you haven't explored.
- **Learn real commands as powers:** characters teach you `echo`, `ls` and `cd`. You learn each by typing the real command.
- **Quick fix or fight:** equip the right skill and walk into a problem to fix it cleanly — or it turns into a
  skillshot fight. Tap or click to aim, keys `1`–`5` (or the skill bar) to pick a skill, shoot down incoming orbs, watch your heat.
- **Repair circuits:** rotate tiles to route power from the source to the core.
- **Upgrade:** find RAM, CPU, fan and SSD modules for your motherboard, and buy command-option upgrades
  (`ls -a`, `cd -`, `echo -n`) with bits.
- **Pip's panel:** quests, items and motherboard, combat notes, side tasks, and a codex of every command you've learned.

Chapter 1 covers the **Firmware Foundry** (BIOS/UEFI) and the **GRUB Gate** (bootloader). Start it from the
🎮 button in the top bar or on the world map. It uses the same family players, XP and badges as the learning worlds.
Kid mode makes fights a little gentler (slower enemies, one free hint per fight).

### Tests (for whoever maintains this)

```bash
node --test tests/ck/*.test.js
node tests/e2e/ck-engine.e2e.js && node tests/e2e/ck-ui.e2e.js && node tests/e2e/ck-scenes.e2e.js
node tests/e2e/ck-chapter.e2e.js && node tests/e2e/lilnux-regression.e2e.js
```

The browser tests use Playwright with Chromium.

## What’s inside

| World | You learn |
|---|---|
| 🐧 Meet Fedora | Linux vs. Fedora vs. GNOME, open source |
| 🖥️ Desktop Explorer | Super key, top bar, Dash, windows, workspaces, Settings |
| 📁 Files & Folders | Home folder, `/` tree, hidden files, case sensitivity, Trash, USB |
| ⌨️ Terminal Town | `pwd`, `ls`, `cd`, `cat`, `mkdir`, `touch`, `echo >` |
| 🏰 Command Castle | `cp`, `mv`, `rm`, wildcards, Tab, history, `chmod +x`, scripts, `grep`, `man` |
| 📦 Software Shop | Software app, `sudo`, `dnf`, Flatpak & Flathub |
| 🛡️ Safety Shield | Accounts, locking, updates, not pasting random commands, SELinux, backups |
| 🏆 Linux Legend | Final boss: typed answers + combined terminal missions, pipes, `&&` |

Plus: **Free Play** terminal, printable **Cheat Sheet**, **badges**, a family **leaderboard**,
a printable **certificate**, “Try it for real!” quests for the actual computer, and **🔊 Read to me** for younger kids.

- **Kid mode** (per player): free hints with no star penalty, and the grown‑up extra tips are hidden.
- **Unlock all worlds** on the map lets grown‑ups skip ahead.
- The practice terminal is **pretend** — it can’t change your real computer. Some output (package versions, sizes) is made up to look realistic.
- Progress is saved in this browser only (Firefox’s local storage for this file). Each family member picks their name on the start screen.
