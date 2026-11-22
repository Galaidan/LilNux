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
