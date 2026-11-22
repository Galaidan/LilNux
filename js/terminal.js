/* LilNux — a pretend Fedora bash shell.
 * Everything here is simulated in the browser: nothing touches your real computer.
 */
(function (global) {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const trimNL = (s) => String(s).replace(/\n+$/, '');
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  let NOW = Date.now();
  function D(children, extra) { return Object.assign({ t: 'd', c: children || {}, mode: 0o755, mtime: NOW }, extra || {}); }
  function F(data, extra) { return Object.assign({ t: 'f', data: data || '', mode: 0o644, mtime: NOW }, extra || {}); }
  const PIC = (what) => `(This is a picture of ${what}. Pictures aren't text, so 'cat' can't show them — open it in the Files app to look at it!)\n`;
  const MEDIA = (what) => `(This is ${what}. It isn't text, so 'cat' can't play it — double-click it in the Files app!)\n`;

  function buildFS(user) {
    NOW = Date.now();
    const home = D({
      Desktop: D({}),
      Documents: D({
        'notes.txt': F("Welcome to your Documents folder!\nThis is where letters, homework and notes like to live.\nTip: try 'cat shopping-list.txt' next.\n"),
        'shopping-list.txt': F('milk\neggs\nbananas\npizza dough\ncheese\npenguin crackers\n'),
        'recipes.txt': F('Pancakes: flour, milk, eggs, a pinch of salt\nPizza: dough, tomato sauce, cheese, basil\nSmoothie: bananas, berries, yogurt\nNachos: chips, cheese, beans, salsa\n'),
        homework: D({
          'math.txt': F('2 + 2 = 4\n7 x 6 = 42\n100 - 1 = 99\n'),
          'spelling.txt': F('penguin\nterminal\ndirectory\nfedora\n'),
        }),
      }),
      Downloads: D({
        'IMG_0042.jpg': F(PIC('a fluffy puppy')),
        'fedora-wallpaper.png': F(PIC('a blue space wallpaper')),
        'junk-1.tmp': F('junk\n'),
        'junk-2.tmp': F('more junk\n'),
        'junk-3.tmp': F('even more junk\n'),
      }),
      Music: D({ 'penguin-polka.ogg': F(MEDIA('a song')) }),
      Pictures: D({ 'tux.png': F(PIC('Tux the penguin waving')), 'beach.jpg': F(PIC('a sunny beach')), Screenshots: D({}) }),
      Public: D({}),
      Templates: D({}),
      Videos: D({ 'cat-skateboard.webm': F(MEDIA('a video of a cat on a skateboard')) }),
      '.bashrc': F('# .bashrc\n\n# Source global definitions\nif [ -f /etc/bashrc ]; then\n    . /etc/bashrc\nfi\n'),
      '.secret-treasure.txt': F('🏴‍☠️  You found the hidden treasure!\nFiles whose names start with a dot (.) are hidden.\nThe magic word is: PENGUIN\n'),
      'magic.sh': F('#!/bin/bash\n# A tiny script: a list of commands saved in a file\necho "✨ Abracadabra! ✨"\necho "You just ran your very first script!"\necho "Scripts are lists of commands saved in a file."\n'),
    });
    const sys = { sys: true };
    return D({
      afs: D({}, sys), bin: D({}, sys), boot: D({}, sys), dev: D({}, sys),
      etc: D({
        'fedora-release': F('Fedora release 44 (Forty Four)\n', sys),
        'os-release': F('NAME="Fedora Linux"\nVERSION="44 (Workstation Edition)"\nID=fedora\nVERSION_ID=44\nPRETTY_NAME="Fedora Linux 44 (Workstation Edition)"\nVARIANT="Workstation Edition"\nVARIANT_ID=workstation\n', sys),
        hostname: F('fedora\n', sys),
        shadow: F('(secret password hashes)\n', { sys: true, lock: true, mode: 0o000 }),
      }, sys),
      home: D({ [user]: home }, sys),
      lib: D({}, sys), lib64: D({}, sys), media: D({}, sys), mnt: D({}, sys), opt: D({}, sys), proc: D({}, sys),
      root: D({ 'secret.txt': F('🔐 Only the admin (root) can read this file.\nWith great power comes great responsibility!\n', { sys: true }) }, { sys: true, lock: true, mode: 0o550 }),
      run: D({ media: D({ [user]: D({ 'USB-STICK': D({ 'school-project.odt': F(MEDIA('a LibreOffice document')) }) }) }, sys) }, sys),
      sbin: D({}, sys), srv: D({}, sys), sys: D({}, sys),
      tmp: D({}, { sys: true, mode: 0o777 }),
      usr: D({ bin: D({}, sys), share: D({}, sys) }, sys),
      var: D({ log: D({}, sys) }, sys),
    }, sys);
  }

  // ---- Pretend package catalogs -------------------------------------------------------------
  const PKGS = {
    cowsay: { ver: '3.8.4-3.fc44', arch: 'noarch', size: '78.4 KiB', desc: 'Configurable speaking/thinking cow', cmds: ['cowsay', 'cowthink'] },
    'fortune-mod': { ver: '3.24.0-3.fc44', arch: 'x86_64', size: '4.1 MiB', desc: 'A program which will display a fortune', cmds: ['fortune'] },
    fastfetch: { ver: '2.40.4-1.fc44', arch: 'x86_64', size: '1.9 MiB', desc: 'Like neofetch, but much faster because written in c', cmds: ['fastfetch'] },
    sl: { ver: '5.02-25.fc44', arch: 'x86_64', size: '33.1 KiB', desc: 'Joke command for when you type "sl" instead of "ls"', cmds: ['sl'] },
    htop: { ver: '3.4.1-1.fc44', arch: 'x86_64', size: '480.2 KiB', desc: 'Interactive process viewer', cmds: ['htop'] },
    supertux: { ver: '0.6.3-14.fc44', arch: 'x86_64', size: '182.6 MiB', desc: "Jump'n run like game", cmds: ['supertux2'] },
    supertuxkart: { ver: '1.4-8.fc44', arch: 'x86_64', size: '22.0 MiB', desc: 'Kids 3D go-kart racing game featuring Tux', cmds: ['supertuxkart'] },
    tuxpaint: { ver: '0.9.34-1.fc44', arch: 'x86_64', size: '38.9 MiB', desc: 'Drawing program designed for young children', cmds: ['tuxpaint'] },
    gimp: { ver: '3.0.4-2.fc44', arch: 'x86_64', size: '120.4 MiB', desc: 'GNU Image Manipulation Program', cmds: ['gimp'] },
    'gnome-tweaks': { ver: '46.1-4.fc44', arch: 'noarch', size: '1.2 MiB', desc: 'Customize advanced GNOME options', cmds: ['gnome-tweaks'] },
    'gnome-chess': { ver: '49.0-1.fc44', arch: 'x86_64', size: '2.6 MiB', desc: 'Chess board game', cmds: ['gnome-chess'] },
    vlc: { ver: '3.0.21-30.fc44', arch: 'x86_64', size: '9.7 MiB', desc: 'The cross-platform open-source multimedia framework, player and server', cmds: ['vlc'] },
  };
  const CMD_PKG = {};
  Object.keys(PKGS).forEach((p) => PKGS[p].cmds.forEach((c) => (CMD_PKG[c] = p)));

  const FLATS = {
    'net.supertuxkart.SuperTuxKart': { name: 'SuperTuxKart', ver: '1.4', desc: 'A 3D open-source arcade racer with a variety of characters, tracks, and modes' },
    'org.tuxpaint.Tuxpaint': { name: 'Tux Paint', ver: '0.9.34', desc: 'A drawing program for children' },
    'org.gnome.Chess': { name: 'Chess', ver: '49.0', desc: 'Play the classic two-player board game of chess' },
    'org.supertuxproject.SuperTux': { name: 'SuperTux', ver: '0.6.3', desc: 'A jump-and-run game starring Tux the penguin' },
    'org.gimp.GIMP': { name: 'GNU Image Manipulation Program', ver: '3.0.4', desc: 'Create images and edit photographs' },
    'org.kde.krita': { name: 'Krita', ver: '5.2.9', desc: 'Digital painting, creative freedom' },
    'com.spotify.Client': { name: 'Spotify', ver: '1.2.63', desc: 'Online music streaming service' },
    'org.videolan.VLC': { name: 'VLC', ver: '3.0.21', desc: 'VLC media player, the open-source multimedia player' },
    'com.valvesoftware.Steam': { name: 'Steam', ver: '1.0.0.82', desc: 'Launcher for the Steam software distribution service' },
    'org.libreoffice.LibreOffice': { name: 'LibreOffice', ver: '25.8', desc: 'The LibreOffice productivity suite' },
    'org.gnome.Mahjongg': { name: 'Mahjongg', ver: '49.0', desc: 'Match tiles and clear the board' },
  };

  const FORTUNES = [
    'A penguin never forgets to save its work.',
    'Today is a great day to learn a new command.',
    'You will soon find a hidden file. Try ls -a!',
    'The best way to learn Linux is to play with it.',
    'Read the manual. It knows things. (man ls)',
    'Be kind, share your knowledge — that is the open source way.',
    'Press Tab. Your fingers will thank you.',
    'There is no place like ~ (home).',
    'Update often, and your computer will be happy.',
    'A small step for a user, a giant leap for your terminal skills.',
  ];

  const MAN = {
    pwd: ['print working directory', 'pwd', 'Shows the full path of the folder you are in right now.'],
    ls: ['list directory contents', 'ls [-a] [-l] [FOLDER]', 'Lists files and folders.\n  -a   show hidden files too (names starting with .)\n  -l   long list: permissions, owner, size, date'],
    cd: ['change directory', 'cd [FOLDER]', 'Moves you into a folder.\n  cd        go home (~)\n  cd ..     go up one folder\n  cd -      go back to the last folder'],
    cat: ['concatenate files and print them', 'cat FILE...', 'Prints what is inside text files.'],
    mkdir: ['make directories', 'mkdir [-p] FOLDER...', 'Creates new folders.\n  -p   also create parent folders if needed'],
    touch: ['change file timestamps', 'touch FILE...', 'Creates an empty file if it does not exist yet.'],
    echo: ['display a line of text', 'echo [TEXT]', 'Prints text. Combine with > to write it into a file:\n  echo "hello" > hello.txt   (replace the file)\n  echo "more" >> hello.txt   (add to the end)'],
    rm: ['remove files or directories', 'rm [-r] [-f] FILE...', 'Deletes files. There is NO trash can in the terminal!\n  -r   remove folders and everything inside\n  -f   do not ask, ignore missing files'],
    rmdir: ['remove empty directories', 'rmdir FOLDER...', 'Removes folders, but only if they are empty.'],
    cp: ['copy files and directories', 'cp [-r] SOURCE... DESTINATION', 'Copies files.\n  -r   copy folders and everything inside'],
    mv: ['move (rename) files', 'mv SOURCE... DESTINATION', 'Moves files to another folder, or renames them:\n  mv old.txt new.txt'],
    grep: ['print lines that match patterns', 'grep [-i] [-n] [-v] [-c] WORD [FILE...]', 'Finds lines containing WORD.\n  -i   ignore BIG/small letters\n  -n   show line numbers\n  -v   show lines that do NOT match\n  -c   count matching lines'],
    head: ['output the first part of files', 'head [-n N] FILE', 'Shows the first 10 lines (or N lines).'],
    tail: ['output the last part of files', 'tail [-n N] FILE', 'Shows the last 10 lines (or N lines).'],
    wc: ['word count', 'wc [-l] [-w] [-c] FILE', 'Counts lines, words and characters.'],
    sort: ['sort lines of text', 'sort [-r] FILE', 'Sorts lines alphabetically (-r for reverse).'],
    tree: ['list contents of directories in a tree-like format', 'tree [FOLDER]', 'Draws folders and files as a tree.'],
    chmod: ['change file mode bits', 'chmod MODE FILE', 'Changes permissions.\n  chmod +x file   make it runnable (executable)\n  chmod -x file   make it not runnable\n  chmod 644 file  rw-r--r--'],
    history: ['show command history', 'history', 'Lists the commands you typed. Press the Up arrow to reuse one.'],
    man: ['an interface to the system reference manuals', 'man COMMAND', 'Shows the manual page for a command. In a real terminal press q to quit.'],
    clear: ['clear the terminal screen', 'clear', 'Wipes the screen clean. (Shortcut: Ctrl+L)'],
    sudo: ['execute a command as another user', 'sudo COMMAND', 'Runs a command with admin (root) powers. It asks for YOUR password,\nand the letters stay invisible while you type.'],
    dnf: ['package manager', 'dnf COMMAND [PACKAGE...]', 'Installs and updates software on Fedora.\n  dnf search WORD          find packages\n  dnf info PACKAGE         details about a package\n  sudo dnf install PKG     install\n  sudo dnf remove PKG      remove\n  sudo dnf upgrade         update everything\n  dnf list --installed     show installed packages'],
    flatpak: ['build, install and run applications and runtimes', 'flatpak COMMAND', 'Manages Flatpak apps (sandboxed apps, often from Flathub).\n  flatpak search WORD\n  flatpak install flathub APP.ID\n  flatpak list\n  flatpak update\n  flatpak run APP.ID\n  flatpak uninstall APP.ID'],
    whoami: ['print effective user name', 'whoami', 'Prints your user name.'],
    uname: ['print system information', 'uname [-r] [-a]', 'Shows the kernel name.\n  -r   kernel version\n  -a   everything'],
    date: ['print the system date and time', 'date', 'Shows the date and time.'],
    df: ['report file system disk space usage', 'df [-h]', 'Shows how full your disks are. -h = human-friendly sizes.'],
    free: ['display amount of free and used memory', 'free [-h]', 'Shows memory (RAM) use.'],
    which: ['locate a command', 'which COMMAND', 'Shows where a command program lives.'],
  };

  const HELP = [
    ['Where am I?', [['pwd', 'show the folder you are in'], ['ls', 'list files (ls -a shows hidden ones)'], ['cd NAME', 'go into a folder (cd .. goes up, cd goes home)'], ['tree', 'draw folders as a tree']]],
    ['Files', [['cat FILE', 'show what is inside a file'], ['touch FILE', 'make an empty file'], ['mkdir NAME', 'make a folder'], ['echo "hi" > FILE', 'write text into a file'], ['cp A B', 'copy'], ['mv A B', 'move or rename'], ['rm FILE', 'delete (no trash can!)'], ['chmod +x FILE', 'make a script runnable']]],
    ['Finding things', [['grep WORD FILE', 'find lines with a word'], ['head / tail FILE', 'first / last lines'], ['wc -l FILE', 'count lines'], ['history', 'commands you typed'], ['man CMD', 'read the manual']]],
    ['Software & admin', [['sudo CMD', 'do it as the admin'], ['dnf search WORD', 'find software'], ['sudo dnf install PKG', 'install software'], ['sudo dnf upgrade', 'update everything'], ['flatpak install flathub ID', 'install an app from Flathub']]],
    ['About this computer', [['whoami', 'your user name'], ['cat /etc/fedora-release', 'your Fedora version'], ['uname -r', 'Linux kernel version'], ['df -h / free -h', 'disk / memory'], ['date', 'date and time'], ['clear', 'clean the screen']]],
  ];

  function parseFlags(args, longMap) {
    const flags = new Set(); const rest = []; let stop = false;
    for (const a of args) {
      if (!stop && a === '--') { stop = true; continue; }
      if (!stop && a.startsWith('--') && a.length > 2) { const k = a.slice(2); flags.add((longMap && longMap[k]) || k); continue; }
      if (!stop && a.startsWith('-') && a.length > 1 && !/^-\d+$/.test(a)) { for (const ch of a.slice(1)) flags.add(ch); continue; }
      rest.push(a);
    }
    return { flags, rest };
  }

  function fmtDate(ms) {
    const d = new Date(ms); const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${M[d.getMonth()]} ${String(d.getDate()).padStart(2, ' ')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  function permStr(n) {
    const m = n.mode; const r = (b, c) => (m & b ? c : '-');
    return (n.t === 'd' ? 'd' : '-') + r(0o400, 'r') + r(0o200, 'w') + r(0o100, 'x') + r(0o40, 'r') + r(0o20, 'w') + r(0o10, 'x') + r(0o4, 'r') + r(0o2, 'w') + r(0o1, 'x') + '.';
  }
  function clone(n) { const c = Object.assign({}, n); if (n.t === 'd') { c.c = {}; for (const k of Object.keys(n.c)) c.c[k] = clone(n.c[k]); } c.mtime = Date.now(); return c; }
  function sizeOf(n) { return n.t === 'd' ? 4096 : new TextEncoder().encode(n.data).length; }

  class Shell {
    constructor(user) {
      this.user = user || 'friend';
      this.host = 'fedora';
      this.root = buildFS(this.user);
      this.cwd = ['home', this.user];
      this.oldpwd = null;
      this.hist = [];
      this.installed = new Set();
      this.flatpaks = new Set();
      this.sudoOK = false;
      this.pending = null;
      this.flags = {};
      this.last = [];
      this.log = [];
      this.upgradesLeft = true;
      this.flatUpdatesLeft = true;
    }

    // ---- paths --------------------------------------------------------------------------
    homeStr() { return '/home/' + this.user; }
    cwdStr() { return '/' + this.cwd.join('/'); }
    abs(path) {
      if (path === undefined || path === null || path === '') return this.cwd.slice();
      if (path === '~' || path.startsWith('~/')) path = this.homeStr() + path.slice(1);
      const parts = path.startsWith('/') ? [] : this.cwd.slice();
      for (const seg of path.split('/')) {
        if (!seg || seg === '.') continue;
        if (seg === '..') parts.pop(); else parts.push(seg);
      }
      return parts;
    }
    node(parts) {
      let n = this.root;
      for (const p of parts) { if (n.t !== 'd' || !has(n.c, p)) return null; n = n.c[p]; }
      return n;
    }
    get(path) { return this.node(this.abs(path)); }
    exists(path) { return !!this.get(path); }
    isDir(path) { const n = this.get(path); return !!n && n.t === 'd'; }
    isFile(path) { const n = this.get(path); return !!n && n.t === 'f'; }
    read(path) { const n = this.get(path); return n && n.t === 'f' ? n.data : null; }
    str(parts) { return '/' + parts.join('/'); }
    inHome(parts) { return parts[0] === 'home' && parts[1] === this.user; }
    canWrite(parts, sudo) { return sudo || this.inHome(parts) || parts[0] === 'tmp'; }
    lockedOn(parts, sudo) { // any locked folder along the way?
      if (sudo) return false;
      let n = this.root;
      for (const p of parts) { if (n.lock) return true; if (n.t !== 'd' || !has(n.c, p)) return false; n = n.c[p]; }
      return !!n.lock;
    }
    ownerOf(parts) { return this.inHome(parts) ? this.user : 'root'; }
    env(k) { return { HOME: this.homeStr(), USER: this.user, PWD: this.cwdStr(), SHELL: '/bin/bash', HOSTNAME: this.host }[k] || ''; }

    prompt() {
      if (this.pending) return this.pending.prompt;
      const p = this.cwdStr(); const h = this.homeStr();
      const d = p === h ? '~' : (p === '/' ? '/' : this.cwd[this.cwd.length - 1]);
      return `[${this.user}@${this.host} ${d}]$ `;
    }

    // ---- parsing ------------------------------------------------------------------------
    tokenize(line) {
      const toks = []; let cur = ''; let any = false; let quoted = false; let sq = false; let q = null;
      const push = () => { if (any) toks.push({ w: cur, q: quoted, sq }); cur = ''; any = false; quoted = false; sq = false; };
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (q) {
          if (ch === q) q = null;
          else if (ch === '\\' && q === '"' && /["\\$]/.test(line[i + 1] || '')) cur += line[++i];
          else cur += ch;
          continue;
        }
        if (ch === '"' || ch === "'") { q = ch; any = true; quoted = true; if (ch === "'") sq = true; continue; }
        if (ch === '\\' && i + 1 < line.length) { cur += line[++i]; any = true; quoted = true; continue; }
        if (ch === '#' && !any) break; // comment
        if (/\s/.test(ch)) { push(); continue; }
        if (ch === '|' || ch === ';' || ch === '>' || ch === '&' || ch === '<') {
          push();
          const nx = line[i + 1];
          if (ch === '>' && nx === '>') { toks.push({ op: '>>' }); i++; }
          else if (ch === '&' && nx === '&') { toks.push({ op: '&&' }); i++; }
          else if (ch === '|' && nx === '|') { toks.push({ op: '||' }); i++; }
          else toks.push({ op: ch === '&' ? ';' : ch });
          continue;
        }
        cur += ch; any = true;
      }
      if (q) return { error: `unexpected EOF while looking for matching \`${q}'` };
      push();
      return { toks };
    }

    parse(toks) {
      const chain = []; let pipe = []; let cmd = { words: [], redir: [], input: null };
      const endCmd = () => { pipe.push(cmd); cmd = { words: [], redir: [], input: null }; };
      for (let i = 0; i < toks.length; i++) {
        const t = toks[i];
        if (!t.op) { cmd.words.push(t); continue; }
        if (t.op === '>' || t.op === '>>' || t.op === '<') {
          const f = toks[i + 1];
          if (!f || f.op) return { error: "syntax error near unexpected token `newline'" };
          if (t.op === '<') cmd.input = f; else cmd.redir.push({ op: t.op, file: f });
          i++; continue;
        }
        if (!cmd.words.length) return { error: `syntax error near unexpected token \`${t.op}'` };
        endCmd();
        if (t.op === '|') continue;
        chain.push({ pipe, sep: t.op }); pipe = [];
      }
      if (cmd.words.length) endCmd();
      else if (pipe.length) return { error: 'syntax error: unexpected end of file' };
      if (pipe.length) chain.push({ pipe, sep: null });
      return { chain };
    }

    glob(pattern) {
      const idx = pattern.lastIndexOf('/');
      const dirPart = idx >= 0 ? pattern.slice(0, idx + 1) : '';
      const pat = pattern.slice(idx + 1);
      if (/[*?]/.test(dirPart) || !pat) return [];
      const dir = this.get(dirPart || '.');
      if (!dir || dir.t !== 'd' || dir.lock) return [];
      const re = new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      return Object.keys(dir.c).filter((n) => (pat.startsWith('.') || !n.startsWith('.')) && re.test(n)).sort().map((n) => dirPart + n);
    }

    expand(tok) {
      let w = tok.w;
      if (!tok.sq) w = w.replace(/\$\{?(HOME|USER|PWD|SHELL|HOSTNAME)\}?/g, (m, k) => this.env(k));
      if (!tok.q) {
        if (w === '~') w = this.homeStr();
        else if (w.startsWith('~/')) w = this.homeStr() + w.slice(1);
        if (/[*?]/.test(w)) { const g = this.glob(w); if (g.length) return g; }
      }
      return [w];
    }

    // ---- running ------------------------------------------------------------------------
    run(line) {
      this.last = [];
      const trimmed = String(line).trim();
      if (!trimmed) return { html: '' };
      this.hist.push(trimmed);
      return this.runLine(trimmed);
    }
    runLine(line) {
      const t = this.tokenize(line);
      if (t.error) return { html: `<div class="e">bash: ${esc(t.error)}</div>`, ok: false };
      if (!t.toks.length) return { html: '' };
      const p = this.parse(t.toks);
      if (p.error) return { html: `<div class="e">bash: ${esc(p.error)}</div>`, ok: false };
      return this.execChain(p.chain, 0, { html: [], ok: true, clear: false });
    }
    answer(input) {
      if (!this.pending) return { html: '' };
      const p = this.pending; this.pending = null;
      return p.resume(input);
    }
    cancel() { this.pending = null; }

    execChain(chain, i, acc) {
      for (; i < chain.length; i++) {
        if (i > 0) {
          const op = chain[i - 1].sep;
          if (op === '&&' && !acc.ok) continue;
          if (op === '||' && acc.ok) continue;
        }
        const r = this.runPipeline(chain[i].pipe);
        if (r.pending) return this.suspend(r, chain, i, acc);
        this.emit(acc, r);
      }
      return { html: acc.html.join(''), clear: acc.clear, ok: acc.ok };
    }
    suspend(r, chain, i, acc) {
      this.emit(acc, r);
      const p = r.pending;
      this.pending = {
        prompt: p.prompt, mask: !!p.mask,
        resume: (ans) => {
          const acc2 = { html: [], ok: true, clear: false };
          const r2 = p.resume(ans);
          if (r2.pending) return this.suspend(r2, chain, i, acc2);
          this.emit(acc2, r2);
          return this.execChain(chain, i + 1, acc2);
        },
      };
      return { html: acc.html.join(''), clear: acc.clear, pending: true, prompt: p.prompt, mask: !!p.mask };
    }
    emit(acc, r) {
      if (r.clear) { acc.html = []; acc.clear = true; }
      const text = r.html != null ? r.html : esc(trimNL(r.out || ''));
      if (text) acc.html.push(`<div class="o">${text}</div>`);
      if (r.err) acc.html.push(`<div class="e">${esc(trimNL(r.err))}</div>`);
      if (r.tip) acc.html.push(`<div class="tip">💡 ${r.tip}</div>`);
      if (!r.pending) acc.ok = r.ok !== false;
    }

    runPipeline(pipe) {
      let stdin = null; let r = { ok: true, out: '' }; const errs = []; let tip = null; let clear = false;
      for (let k = 0; k < pipe.length; k++) {
        const c = pipe[k];
        const words = [].concat(...c.words.map((t) => this.expand(t)));
        if (c.input) {
          const f = this.expand(c.input)[0]; const n = this.get(f);
          if (!n) { errs.push(`bash: ${f}: No such file or directory`); return { ok: false, err: errs.join('\n') }; }
          stdin = n.t === 'f' ? n.data : '';
        }
        const piped = k < pipe.length - 1 || c.redir.length > 0;
        r = this.exec(words, stdin, { piped });
        if (r.pending) {
          if (pipe.length > 1 || c.redir.length) { this.pending = null; return { ok: false, err: 'LilNux: that command wants to ask you a question, so run it on its own line (without | or >).' }; }
          return r;
        }
        if (r.err) errs.push(trimNL(r.err));
        if (r.tip) tip = r.tip;
        if (r.clear) clear = true;
        for (const rd of c.redir) {
          const f = this.expand(rd.file)[0];
          const e = this.writeFile(f, r.out || '', rd.op === '>>');
          if (e) { errs.push(e); r = Object.assign({}, r, { ok: false }); }
          r = Object.assign({}, r, { out: '', html: null });
        }
        stdin = r.out || '';
      }
      return { ok: r.ok, out: r.out, html: r.html, err: errs.join('\n'), tip, clear };
    }

    writeFile(path, text, append) {
      const parts = this.abs(path); const name = parts[parts.length - 1];
      const parent = this.node(parts.slice(0, -1));
      if (!parent || parent.t !== 'd') return `bash: ${path}: No such file or directory`;
      if (!this.canWrite(parts, false) || this.lockedOn(parts.slice(0, -1), false)) return `bash: ${path}: Permission denied`;
      const n = parent.c[name];
      if (n && n.t === 'd') return `bash: ${path}: Is a directory`;
      if (n) { n.data = append ? n.data + text : text; n.mtime = Date.now(); }
      else parent.c[name] = F(text);
      return null;
    }

    rec(name, args, ok, sudo) {
      const r = { name, args, ok, sudo: !!sudo };
      this.last.push(r); this.log.push(r);
      if (this.log.length > 300) this.log.shift();
    }

    exec(words, stdin, ctx) {
      ctx = ctx || {};
      if (!words.length) return { ok: true, out: '' };
      const [name, ...args] = words;
      const sudo = !!ctx.sudo;
      if (name === 'sudo') {
        if (!args.length) return { ok: false, err: 'usage: sudo command' };
        if (args[0] === '-i' || args[0] === 'su' || args[0] === '-s') return { ok: false, err: 'LilNux: a root shell is too much power for practice! Put sudo in front of one command instead.' };
        if (!this.sudoOK) {
          this.flags.sawPassword = true;
          return {
            ok: true, out: '',
            tip: sudo ? null : 'Type your password and press Enter. <b>The letters stay invisible</b> — that\'s normal! (In LilNux any password works.)',
            pending: {
              prompt: `[sudo] password for ${this.user}: `, mask: true,
              resume: (pw) => {
                if (!pw) { this.rec('sudo', args, false, true); return { ok: false, err: 'sudo: no password was provided\nsudo: a password is required' }; }
                this.sudoOK = true;
                return this.exec(args, stdin, Object.assign({}, ctx, { sudo: true }));
              },
            },
          };
        }
        return this.exec(args, stdin, Object.assign({}, ctx, { sudo: true }));
      }
      const wrap = (r) => {
        if (r && r.pending) { const orig = r.pending.resume; r.pending.resume = (a) => wrap(orig(a)); return r; }
        this.rec(name, args, r.ok !== false, sudo);
        return r;
      };
      if (name.includes('/')) return wrap(this.runScript(name, args, sudo));
      if (CMD_PKG[name] && !this.installed.has(CMD_PKG[name])) return wrap(this.notFound(name));
      const fn = has(CMDS, name) ? CMDS[name] : null;
      if (!fn) return wrap(this.notFound(name));
      return wrap(fn.call(this, args, stdin, { sudo, piped: ctx.piped }));
    }

    notFound(name) {
      const r = { ok: false, err: `bash: ${name}: command not found...` };
      const low = name.toLowerCase();
      if (CMD_PKG[name]) r.tip = `It isn't installed yet. Install it with: <code>sudo dnf install ${CMD_PKG[name]}</code>`;
      else if (low !== name && (has(CMDS, low) || CMD_PKG[low])) r.tip = `Linux commands are case-sensitive! Try <code>${esc(low)}</code> (all small letters).`;
      else if (/^cd\.\.?$/.test(name)) r.tip = 'Put a space between <code>cd</code> and <code>..</code> like this: <code>cd ..</code>';
      else if (name === 'dir') r.tip = 'On Linux we use <code>ls</code> to list files.';
      else if (name === 'cls') r.tip = 'On Linux we use <code>clear</code> to clean the screen.';
      else if (['apt', 'apt-get', 'yum', 'pacman', 'brew', 'winget'].includes(name)) r.tip = 'Fedora uses <code>dnf</code> to install software, like <code>sudo dnf install cowsay</code>.';
      else r.tip = 'Type <code>help</code> to see the commands you can use here.';
      return r;
    }

    runScript(path, args, sudo) {
      const parts = this.abs(path); const n = this.node(parts);
      if (!n) return { ok: false, err: `bash: ${path}: No such file or directory` };
      if (n.t === 'd') return { ok: false, err: `bash: ${path}: Is a directory` };
      if (!(n.mode & 0o100)) return { ok: false, err: `bash: ${path}: Permission denied`, tip: 'This file isn\'t allowed to run yet. Give it the e<b>x</b>ecute permission: <code>chmod +x ' + esc(parts[parts.length - 1]) + '</code>' };
      return this.runScriptText(n.data, parts[parts.length - 1]);
    }
    runScriptText(text, name) {
      const saved = this.last; this.last = [];
      const out = [];
      for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const r = this.runLine(line);
        if (r.pending) { this.pending = null; out.push('<div class="e">(skipped a command that asks questions)</div>'); continue; }
        out.push(r.html);
      }
      this.last = saved;
      this.flags.scriptRan = name;
      return { ok: true, html: out.join('') };
    }

    // ---- tab completion -----------------------------------------------------------------
    complete(line) {
      const m = line.match(/^(.*?)(\S*)$/);
      const before = m[1]; const word = m[2];
      const isCmd = !before.trim() || /(\|\||&&|[|;]|sudo)\s*$/.test(before);
      let options = [];
      if (isCmd && !word.includes('/')) {
        const all = Object.keys(CMDS).concat([...this.installed].flatMap((p) => PKGS[p].cmds));
        options = [...new Set(all)].filter((c) => c.startsWith(word)).sort().map((c) => ({ text: c, dir: false }));
      } else {
        const idx = word.lastIndexOf('/');
        const dirPart = idx >= 0 ? word.slice(0, idx + 1) : '';
        const pre = word.slice(idx + 1);
        const dir = this.get(dirPart ? dirPart.replace(/^~(?=\/|$)/, this.homeStr()) : '.');
        if (dir && dir.t === 'd' && !dir.lock) {
          options = Object.keys(dir.c).filter((n) => n.startsWith(pre) && (pre.startsWith('.') || !n.startsWith('.'))).sort()
            .map((n) => ({ text: dirPart + n, dir: dir.c[n].t === 'd', show: n }));
        }
      }
      if (!options.length) return { line };
      if (options.length === 1) {
        const o = options[0];
        this.flags.tabUsed = true;
        return { line: before + o.text + (o.dir ? '/' : ' ') };
      }
      let common = options[0].text;
      for (const o of options) { while (!o.text.startsWith(common)) common = common.slice(0, -1); }
      if (common.length > word.length) { this.flags.tabUsed = true; return { line: before + common }; }
      return { line, options: options.map((o) => (o.show || o.text) + (o.dir ? '/' : '')) };
    }
  }

  // ---- the commands ---------------------------------------------------------------------
  const CMDS = {
    help() {
      let h = '<span class="hl">🐧 LilNux practice terminal — commands you can try:</span>\n';
      for (const [title, rows] of HELP) {
        h += `\n<b>${esc(title)}</b>\n`;
        for (const [c, d] of rows) h += `  <span class="c-cmd">${esc(c.padEnd(28))}</span>${esc(d)}\n`;
      }
      h += '\nKeys: <b>Tab</b> finishes names · <b>↑/↓</b> old commands · <b>Ctrl+C</b> cancel · <b>Ctrl+L</b> clear';
      return { ok: true, out: 'help', html: h };
    },
    pwd() { return { ok: true, out: this.cwdStr() + '\n' }; },
    whoami(a, i, c) { return { ok: true, out: (c.sudo ? 'root' : this.user) + '\n' }; },
    hostname() { return { ok: true, out: this.host + '\n' }; },
    id(a, i, c) { return { ok: true, out: c.sudo ? 'uid=0(root) gid=0(root) groups=0(root)\n' : `uid=1000(${this.user}) gid=1000(${this.user}) groups=1000(${this.user}),10(wheel)\n` }; },
    date() { const d = new Date(); return { ok: true, out: d.toDateString().replace(/ (\d{4})$/, ' ' + d.toLocaleTimeString() + ' $1') + '\n' }; },
    uname(args) {
      const { flags } = parseFlags(args);
      const kr = '6.19.8-200.fc44.x86_64';
      if (flags.has('a')) return { ok: true, out: `Linux ${this.host} ${kr} #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux\n` };
      if (flags.has('r')) return { ok: true, out: kr + '\n' };
      return { ok: true, out: 'Linux\n' };
    },
    uptime() { return { ok: true, out: ` ${new Date().toTimeString().slice(0, 8)} up 2:17,  1 user,  load average: 0.42, 0.35, 0.30\n` }; },
    free() { return { ok: true, out: '               total        used        free      shared  buff/cache   available\nMem:            15Gi       3.2Gi       8.1Gi       410Mi       4.4Gi        12Gi\nSwap:          8.0Gi          0B       8.0Gi\n' }; },
    df() { return { ok: true, out: 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p3  475G   61G  412G  13% /\n/dev/nvme0n1p3  475G   61G  412G  13% /home\n/dev/nvme0n1p2  974M  312M  595M  35% /boot\n/dev/sdb1        29G  1.2G   28G   5% /run/media/' + this.user + '/USB-STICK\n' }; },
    clear() { return { ok: true, out: '', clear: true }; },
    exit() { return { ok: true, out: '', tip: 'In a real terminal, <code>exit</code> closes the window. Here, use the buttons above to leave.' }; },
    sleep() { return { ok: true, out: '' }; },
    true() { return { ok: true, out: '' }; },
    false() { return { ok: false, out: '' }; },
    echo(args) {
      let nl = true; if (args[0] === '-n') { nl = false; args = args.slice(1); }
      return { ok: true, out: args.join(' ') + (nl ? '\n' : '') };
    },
    history() { return { ok: true, out: this.hist.map((h, i) => String(i + 1).padStart(5) + '  ' + h).join('\n') + '\n' }; },
    man(args) {
      const c = args[0];
      if (!c) return { ok: false, err: 'What manual page do you want?\nFor example, try \'man ls\'.' };
      const m = MAN[c] || (c === 'cowsay' || c === 'fortune' || c === 'fastfetch' ? [PKGS[CMD_PKG[c]].desc, c + ' [TEXT]', PKGS[CMD_PKG[c]].desc + '.'] : null);
      if (!m) return { ok: false, err: `No manual entry for ${c}` };
      const up = c.toUpperCase();
      const h = `<b>${esc(up)}(1)                     User Commands                     ${esc(up)}(1)</b>\n\n<b>NAME</b>\n       ${esc(c)} - ${esc(m[0])}\n\n<b>SYNOPSIS</b>\n       ${esc(m[1])}\n\n<b>DESCRIPTION</b>\n${esc(m[2]).split('\n').map((l) => '       ' + l).join('\n')}\n\n<span class="dim"> Manual page ${esc(c)}(1) — in a real terminal press q to quit</span>`;
      return { ok: true, out: m.join('\n'), html: h };
    },
    which(args) {
      const out = []; let ok = true;
      for (const c of args) {
        if ((has(CMDS, c) && !['help', 'cd', 'history', 'exit'].includes(c)) || (CMD_PKG[c] && this.installed.has(CMD_PKG[c]))) out.push('/usr/bin/' + c);
        else { ok = false; out.push(`/usr/bin/which: no ${c} in (/home/${this.user}/.local/bin:/home/${this.user}/bin:/usr/local/bin:/usr/bin)`); }
      }
      return { ok, out: out.join('\n') + '\n' };
    },
    cd(args) {
      const t = args[0];
      if (args.length > 1) return { ok: false, err: 'bash: cd: too many arguments' };
      let target;
      if (t === undefined || t === '~') target = this.abs('~');
      else if (t === '-') { if (!this.oldpwd) return { ok: false, err: 'bash: cd: OLDPWD not set' }; target = this.oldpwd.slice(); }
      else target = this.abs(t);
      const n = this.node(target);
      if (!n) return { ok: false, err: `bash: cd: ${t}: No such file or directory`, tip: hintCase(this, t) };
      if (n.t !== 'd') return { ok: false, err: `bash: cd: ${t}: Not a directory` };
      if (this.lockedOn(target, false)) return { ok: false, err: `bash: cd: ${t}: Permission denied` };
      this.oldpwd = this.cwd.slice();
      this.cwd = target;
      return { ok: true, out: t === '-' ? this.cwdStr() + '\n' : '' };
    },
    ls(args, stdin, ctx) {
      const { flags, rest } = parseFlags(args, { all: 'a', 'almost-all': 'A' });
      const all = flags.has('a'); const almost = flags.has('A'); const long = flags.has('l');
      const targets = rest.length ? rest : ['.'];
      const plain = []; const html = []; let ok = true; const errs = [];
      const files = targets.filter((t) => { const n = this.get(t); return n && n.t === 'f'; });
      const dirs = targets.filter((t) => { const n = this.get(t); return n && n.t === 'd'; });
      targets.filter((t) => !this.get(t)).forEach((t) => { ok = false; errs.push(`ls: cannot access '${t}': No such file or directory`); });
      const color = (name, n) => n.t === 'd' ? `<span class="c-dir">${esc(name)}</span>` : (n.mode & 0o100 ? `<span class="c-exe">${esc(name)}</span>` : (/\.(png|jpe?g|gif|webp)$/i.test(name) ? `<span class="c-img">${esc(name)}</span>` : esc(name)));
      const longLine = (name, n, parts) => {
        const own = this.ownerOf(parts);
        return [permStr(n), n.t === 'd' ? String(2 + Object.values(n.c).filter((x) => x.t === 'd').length).padStart(2) : ' 1', own, own, String(sizeOf(n)).padStart(5), fmtDate(n.mtime)];
      };
      const list = (entries) => {
        if (long) {
          const p = []; const h = [];
          p.push('total ' + entries.length * 4); h.push('total ' + entries.length * 4);
          for (const [name, n, parts] of entries) { const l = longLine(name, n, parts).join(' '); p.push(l + ' ' + name); h.push(esc(l) + ' ' + color(name, n)); }
          return [p.join('\n'), h.join('\n')];
        }
        return [entries.map((e) => e[0]).join('\n'), entries.map((e) => color(e[0], e[1])).join('  ')];
      };
      if (files.length) {
        const [p, h] = list(files.map((f) => [f, this.get(f), this.abs(f)]));
        plain.push(p); html.push(h);
      }
      for (const d of dirs) {
        const parts = this.abs(d);
        if (this.lockedOn(parts, ctx.sudo)) { ok = false; errs.push(`ls: cannot open directory '${d}': Permission denied`); continue; }
        const n = this.node(parts);
        let names = Object.keys(n.c).filter((k) => all || almost || !k.startsWith('.')).sort((a, b) => a.replace(/^\./, '').localeCompare(b.replace(/^\./, ''), undefined, { sensitivity: 'base' }));
        let entries = names.map((k) => [k, n.c[k], parts.concat(k)]);
        if (all) entries = [['.', n, parts], ['..', this.node(parts.slice(0, -1)) || n, parts.slice(0, -1)]].concat(entries);
        if (all && d === '.' && parts.join('/') === this.abs('~').join('/')) this.flags.sawHidden = true;
        const [p, h] = list(entries);
        const head = (targets.length > 1) ? d + ':\n' : '';
        plain.push(head + p); html.push(esc(head) + h);
      }
      const out = plain.filter(Boolean).join('\n\n');
      return { ok, out: out ? out + '\n' : '', html: html.filter(Boolean).join('\n\n'), err: errs.join('\n') };
    },
    tree(args) {
      const start = args.find((a) => !a.startsWith('-')) || '.';
      const n = this.get(start);
      if (!n || n.t !== 'd') return { ok: false, err: `${start}  [error opening dir]` };
      let dcount = 0; let fcount = 0;
      const lines = [`<span class="c-dir">${esc(start)}</span>`]; const plain = [start];
      const walk = (node, prefix) => {
        const keys = Object.keys(node.c).filter((k) => !k.startsWith('.')).sort();
        keys.forEach((k, i) => {
          const last = i === keys.length - 1; const ch = node.c[k];
          const br = prefix + (last ? '└── ' : '├── ');
          plain.push(br + k);
          lines.push(esc(br) + (ch.t === 'd' ? `<span class="c-dir">${esc(k)}</span>` : esc(k)));
          if (ch.t === 'd') { dcount++; if (!ch.lock) walk(ch, prefix + (last ? '    ' : '│   ')); } else fcount++;
        });
      };
      walk(n, '');
      const sum = `\n${dcount} director${dcount === 1 ? 'y' : 'ies'}, ${fcount} file${fcount === 1 ? '' : 's'}`;
      return { ok: true, out: plain.join('\n') + sum + '\n', html: lines.join('\n') + esc(sum) };
    },
    cat(args, stdin, ctx) {
      if (!args.length) return { ok: true, out: stdin || '' };
      let out = ''; const errs = [];
      for (const f of args) {
        const parts = this.abs(f); const n = this.node(parts);
        if (this.lockedOn(parts, ctx.sudo) || (n && n.mode === 0 && !ctx.sudo)) { errs.push(`cat: ${f}: Permission denied`); continue; }
        if (!n) { errs.push(`cat: ${f}: No such file or directory`); continue; }
        if (n.t === 'd') { errs.push(`cat: ${f}: Is a directory`); continue; }
        out += n.data;
        if (parts.join('/') === this.abs('~/.secret-treasure.txt').join('/')) this.flags.treasure = true;
      }
      const r = { ok: !errs.length, out, err: errs.join('\n') };
      if (errs.some((e) => e.endsWith('Permission denied')) && !ctx.sudo) r.tip = 'That file belongs to the admin (root). Grown-ups can use <code>sudo</code> in front of the command.';
      else if (errs.some((e) => e.endsWith('No such file or directory'))) r.tip = hintCase(this, args.find((f) => !this.get(f))) || 'Check the spelling, or use <code>ls</code> to see what\'s here. <b>Tab</b> can finish names for you!';
      return r;
    },
    head(args, stdin) { return headTail.call(this, args, stdin, 'head'); },
    tail(args, stdin) { return headTail.call(this, args, stdin, 'tail'); },
    wc(args, stdin) {
      const { flags, rest } = parseFlags(args, { lines: 'l', words: 'w', chars: 'c' });
      const one = (txt, name) => {
        const l = (txt.match(/\n/g) || []).length; const w = (txt.match(/\S+/g) || []).length; const c = new TextEncoder().encode(txt).length;
        const cols = []; if (!flags.size || flags.has('l')) cols.push(l); if (!flags.size || flags.has('w')) cols.push(w); if (!flags.size || flags.has('c') || flags.has('m')) cols.push(c);
        return cols.map((x) => String(x).padStart(flags.size === 1 ? 1 : 3)).join(' ') + (name ? ' ' + name : '');
      };
      if (!rest.length) return { ok: true, out: one(stdin || '') + '\n' };
      const out = []; const errs = [];
      for (const f of rest) { const n = this.get(f); if (!n) errs.push(`wc: ${f}: No such file or directory`); else if (n.t === 'd') errs.push(`wc: ${f}: Is a directory`); else out.push(one(n.data, f)); }
      return { ok: !errs.length, out: out.length ? out.join('\n') + '\n' : '', err: errs.join('\n') };
    },
    sort(args, stdin) {
      const { flags, rest } = parseFlags(args);
      let txt = stdin || '';
      if (rest.length) { const n = this.get(rest[0]); if (!n || n.t !== 'f') return { ok: false, err: `sort: cannot read: ${rest[0]}: No such file or directory` }; txt = n.data; }
      let lines = txt.split('\n'); if (lines[lines.length - 1] === '') lines.pop();
      lines.sort((a, b) => a.localeCompare(b)); if (flags.has('r')) lines.reverse();
      return { ok: true, out: lines.join('\n') + (lines.length ? '\n' : '') };
    },
    grep(args, stdin, ctx) {
      const { flags, rest } = parseFlags(args, { 'ignore-case': 'i', 'line-number': 'n', 'invert-match': 'v', count: 'c' });
      const pat = rest[0];
      if (pat === undefined) return { ok: false, err: 'Usage: grep [OPTION]... PATTERNS [FILE]...\nTry \'grep --help\' for more information.' };
      let re; try { re = new RegExp(pat, flags.has('i') ? 'gi' : 'g'); } catch (e) { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags.has('i') ? 'gi' : 'g'); }
      const files = rest.slice(1);
      const sources = files.length ? files : [null];
      const plain = []; const html = []; const errs = []; let found = false;
      for (const f of sources) {
        let txt;
        if (f === null) txt = stdin || '';
        else {
          const parts = this.abs(f); const n = this.node(parts);
          if (this.lockedOn(parts, ctx.sudo)) { errs.push(`grep: ${f}: Permission denied`); continue; }
          if (!n) { errs.push(`grep: ${f}: No such file or directory`); continue; }
          if (n.t === 'd') { errs.push(`grep: ${f}: Is a directory`); continue; }
          txt = n.data;
        }
        const lines = txt.split('\n'); if (lines[lines.length - 1] === '') lines.pop();
        let count = 0;
        lines.forEach((line, i) => {
          re.lastIndex = 0;
          const m = re.test(line); re.lastIndex = 0;
          if (m === flags.has('v')) return;
          count++; found = true;
          if (flags.has('c')) return;
          const pre = (files.length > 1 ? f + ':' : '') + (flags.has('n') ? (i + 1) + ':' : '');
          plain.push(pre + line);
          const hl = flags.has('v') ? esc(line) : line.split(re).length > 1 ? highlight(line, re) : esc(line);
          html.push((pre ? `<span class="c-grep-f">${esc(pre)}</span>` : '') + hl);
        });
        if (flags.has('c')) { const s = (files.length > 1 ? f + ':' : '') + count; plain.push(s); html.push(esc(s)); }
      }
      return { ok: found, out: plain.length ? plain.join('\n') + '\n' : '', html: html.join('\n'), err: errs.join('\n') };
    },
    touch(args, stdin, ctx) {
      if (!args.length) return { ok: false, err: 'touch: missing file operand' };
      const errs = [];
      for (const f of args) {
        const parts = this.abs(f); const n = this.node(parts);
        if (n) { n.mtime = Date.now(); continue; }
        const parent = this.node(parts.slice(0, -1));
        if (!parent || parent.t !== 'd') { errs.push(`touch: cannot touch '${f}': No such file or directory`); continue; }
        if (!this.canWrite(parts, ctx.sudo) || this.lockedOn(parts.slice(0, -1), ctx.sudo)) { errs.push(`touch: cannot touch '${f}': Permission denied`); continue; }
        parent.c[parts[parts.length - 1]] = F('');
      }
      return { ok: !errs.length, out: '', err: errs.join('\n') };
    },
    mkdir(args, stdin, ctx) {
      const { flags, rest } = parseFlags(args, { parents: 'p' });
      if (!rest.length) return { ok: false, err: 'mkdir: missing operand' };
      const errs = [];
      for (const f of rest) {
        const parts = this.abs(f);
        if (!this.canWrite(parts, ctx.sudo)) { errs.push(`mkdir: cannot create directory '${f}': Permission denied`); continue; }
        if (flags.has('p')) {
          let n = this.root; let bad = false;
          for (const p of parts) {
            if (!has(n.c, p)) n.c[p] = D({});
            n = n.c[p]; if (n.t !== 'd') { bad = true; break; }
          }
          if (bad) errs.push(`mkdir: cannot create directory '${f}': Not a directory`);
          continue;
        }
        const parent = this.node(parts.slice(0, -1)); const name = parts[parts.length - 1];
        if (!parent || parent.t !== 'd') { errs.push(`mkdir: cannot create directory '${f}': No such file or directory`); continue; }
        if (has(parent.c, name)) { errs.push(`mkdir: cannot create directory '${f}': File exists`); continue; }
        parent.c[name] = D({});
      }
      return { ok: !errs.length, out: '', err: errs.join('\n') };
    },
    rmdir(args, stdin, ctx) {
      if (!args.length) return { ok: false, err: 'rmdir: missing operand' };
      const errs = [];
      for (const f of args) {
        const parts = this.abs(f); const n = this.node(parts);
        if (!n) { errs.push(`rmdir: failed to remove '${f}': No such file or directory`); continue; }
        if (n.t !== 'd') { errs.push(`rmdir: failed to remove '${f}': Not a directory`); continue; }
        if (Object.keys(n.c).length) { errs.push(`rmdir: failed to remove '${f}': Directory not empty`); continue; }
        if (!this.canWrite(parts, ctx.sudo) || parts.length < 3) { errs.push(`rmdir: failed to remove '${f}': Permission denied`); continue; }
        delete this.node(parts.slice(0, -1)).c[parts[parts.length - 1]];
      }
      return { ok: !errs.length, out: '', err: errs.join('\n') };
    },
    rm(args, stdin, ctx) {
      const { flags, rest } = parseFlags(args, { recursive: 'r', force: 'f' });
      const rec = flags.has('r') || flags.has('R'); const force = flags.has('f');
      if (!rest.length) return force ? { ok: true, out: '' } : { ok: false, err: 'rm: missing operand' };
      const errs = []; let tip = null;
      const homeParts = this.abs('~');
      for (const f of rest) {
        const parts = this.abs(f); const n = this.node(parts);
        const key = parts.join('/');
        if (parts.length === 0 || key === 'home' || key === homeParts.join('/') || (ctx.sudo && !this.inHome(parts) && parts[0] !== 'tmp')) {
          return { ok: false, err: `rm: LilNux stopped this command.`, tip: `<b>Whoa there!</b> 🐧 That would delete ${parts.length === 0 ? 'your <b>whole computer</b>' : 'really important files'}. On a real Fedora computer there is <b>no undo</b>. This is why you never run <code>rm -rf</code> or <code>sudo rm</code> unless you are 100% sure.` };
        }
        if (!n) { if (!force) errs.push(`rm: cannot remove '${f}': No such file or directory`); continue; }
        if (!this.canWrite(parts, ctx.sudo)) { errs.push(`rm: cannot remove '${f}': Permission denied`); continue; }
        if (n.t === 'd' && !rec) { errs.push(`rm: cannot remove '${f}': Is a directory`); tip = 'To remove a folder and everything in it, use <code>rm -r</code>. For an empty folder, <code>rmdir</code>.'; continue; }
        const cw = this.cwd.join('/');
        if (cw === key || cw.startsWith(key + '/')) { this.cwd = parts.slice(0, -1); }
        delete this.node(parts.slice(0, -1)).c[parts[parts.length - 1]];
      }
      return { ok: !errs.length, out: '', err: errs.join('\n'), tip };
    },
    cp(args, stdin, ctx) { return copyMove.call(this, args, ctx, false); },
    mv(args, stdin, ctx) { return copyMove.call(this, args, ctx, true); },
    chmod(args, stdin, ctx) {
      if (args.length < 2) return { ok: false, err: `chmod: missing operand${args.length ? ` after '${args[0]}'` : ''}`, tip: 'Try <code>chmod +x magic.sh</code>' };
      const mode = args[0]; const errs = [];
      for (const f of args.slice(1)) {
        const parts = this.abs(f); const n = this.node(parts);
        if (!n) { errs.push(`chmod: cannot access '${f}': No such file or directory`); continue; }
        if (!this.canWrite(parts, ctx.sudo)) { errs.push(`chmod: changing permissions of '${f}': Operation not permitted`); continue; }
        if (/^[0-7]{3,4}$/.test(mode)) { n.mode = parseInt(mode, 8) & 0o777; continue; }
        const m = mode.match(/^([ugoa]*)([+\-=])([rwx]+)$/);
        if (!m) { errs.push(`chmod: invalid mode: '${mode}'`); continue; }
        const who = m[1] || 'a'; let bits = 0;
        const add = (shift) => { for (const p of m[3]) bits |= ({ r: 4, w: 2, x: 1 }[p]) << shift; };
        if (who.includes('u') || who.includes('a')) add(6);
        if (who.includes('g') || who.includes('a')) add(3);
        if (who.includes('o') || who.includes('a')) add(0);
        if (!m[1] && m[2] === '+' && m[3].includes('w')) bits &= ~0o022; // like umask
        if (m[2] === '+') n.mode |= bits; else if (m[2] === '-') n.mode &= ~bits; else n.mode = bits;
      }
      return { ok: !errs.length, out: '', err: errs.join('\n') };
    },
    bash(args) { return shRun.call(this, args); },
    sh(args) { return shRun.call(this, args); },
    nano(args) { return editor(args, 'nano', 'Ctrl+O saves, Ctrl+X quits'); },
    vim(args) { return editor(args, 'vim', 'type :wq to save and quit — vim is famous for being tricky to exit!'); },
    vi(args) { return editor(args, 'vi', 'type :wq to save and quit'); },
    'gnome-text-editor'(args) { return { ok: true, out: '', tip: 'In real Fedora this opens the <b>Text Editor</b> app in a window.' }; },
    python3() { return { ok: false, err: 'LilNux: Python is installed on real Fedora, but not in this pretend terminal.', tip: 'Open the real Terminal and type <code>python3</code> to try it (type <code>exit()</code> to leave).' }; },
    firefox() { return { ok: true, out: '', tip: 'In real Fedora this opens the Firefox web browser.' }; },
    nautilus() { return { ok: true, out: '', tip: 'In real Fedora this opens the <b>Files</b> app.' }; },
    'xdg-open'(args) { return { ok: true, out: '', tip: `In real Fedora this opens <code>${esc(args[0] || '')}</code> with its favourite app.` }; },
    ping() { return { ok: false, err: 'LilNux: no internet in the pretend terminal!', tip: 'In the real Terminal, try <code>ping -c 3 fedoraproject.org</code> to test your internet. Ctrl+C stops it.' }; },

    // --- software ---
    dnf(args, stdin, ctx) { return dnf.call(this, args, ctx); },
    flatpak(args) { return flatpak.call(this, args); },
    rpm(args) {
      if (args[0] === '-q' && args[1]) { const p = args[1]; return this.installed.has(p) ? { ok: true, out: `${p}-${PKGS[p].ver}.${PKGS[p].arch}\n` } : { ok: false, out: `package ${p} is not installed\n` }; }
      if (args[0] === '-qa') return { ok: true, out: [...this.installed].map((p) => `${p}-${PKGS[p].ver}.${PKGS[p].arch}`).concat(['bash-5.3.0-2.fc44.x86_64', 'firefox-145.0-1.fc44.x86_64', 'kernel-6.19.8-200.fc44.x86_64']).join('\n') + '\n' };
      return { ok: false, err: 'LilNux knows: rpm -q PACKAGE, rpm -qa' };
    },
    // --- fun extras (need installing first) ---
    cowsay(args, stdin) { return { ok: true, out: cow(args.length ? args.join(' ') : (stdin || 'Moo! Give me some words: cowsay hello'), false) }; },
    cowthink(args, stdin) { return { ok: true, out: cow(args.length ? args.join(' ') : (stdin || 'Hmm...'), true) }; },
    fortune() { return { ok: true, out: FORTUNES[Math.floor(Math.random() * FORTUNES.length)] + '\n' }; },
    fastfetch() {
      const logo = [
        '          .\',;::::;,\'.          ',
        '      .\';:cccccccccccc:;,.      ',
        '    .;cccccccccccccccccccccc;.   ',
        '  .:cccccccccccccccccccccccccc:. ',
        ' .;ccccccccccccc;<b>.:dddl:.</b>;ccccc;.',
        '.:cccccccccccccc;<b>OWMKOOXMWd</b>;cccc:.',
        ':ccccccccccccccc;<b>KMMc</b>;cc;<b>xMMc</b>;ccc:',
        ',cccccccccccccc;<b>MMM.</b>;cc;<b>;WW:</b>;cccc,',
        ':cccccccccccccc;<b>MMM.</b>;cccccccccccc:',
        ':ccccccc;<b>oxOOOo</b>;<b>MMM000k.</b>;cccccccc:',
        'cccccc;<b>0MMKxdd:</b>;<b>MMMkddc.</b>;cccccccc;',
        'ccccc;<b>XMO\'</b>;cccc;<b>MMM.</b>;cccccccccccc\'',
        'ccccc;<b>MMo</b>;ccccc;<b>MMW.</b>;ccccccccccc;  ',
        'ccccc;<b>0MNc.</b>ccc<b>.xMMd</b>;ccccccccccc;   ',
        'cccccc;<b>dNMWXXXWM0:</b>;cccccccccc:,    ',
        'cccccccc;<b>.:odl:.</b>;cccccccccc:,.     ',
        ':cccccccccccccccccccccc:\'.        ',
        '.:cccccccccccccccccc:;,..          ',
      ];
      const info = [
        `<span class="hl">${esc(this.user)}</span>@<span class="hl">${this.host}</span>`, '-------------',
        '<span class="hl">OS</span>: Fedora Linux 44 (Workstation Edition) x86_64',
        '<span class="hl">Kernel</span>: Linux 6.19.8-200.fc44.x86_64',
        '<span class="hl">Packages</span>: ' + (2104 + this.installed.size) + ' (rpm), ' + (this.flatpaks.size + 8) + ' (flatpak)',
        '<span class="hl">Shell</span>: bash 5.3.0', '<span class="hl">DE</span>: GNOME 50', '<span class="hl">WM</span>: Mutter (Wayland)',
        '<span class="hl">Terminal</span>: ptyxis', '<span class="hl">Memory</span>: 3.20 GiB / 15.36 GiB (21%)',
        '<span class="hl">Disk (/)</span>: 61 GiB / 475 GiB (13%) - btrfs', '',
        '<span style="color:#e01b24">███</span><span style="color:#2ec27e">███</span><span style="color:#f6d32d">███</span><span style="color:#3584e4">███</span><span style="color:#c061cb">███</span><span style="color:#33c7de">███</span>',
      ];
      const lines = logo.map((l, i) => `<span class="c-fedora">${l}</span>  ${info[i] || ''}`);
      return { ok: true, out: 'Fedora Linux 44 (Workstation Edition)\n', html: lines.join('\n') };
    },
    sl() {
      const t = '      ====        ________                ___________\n  _D _|  |_______/        \\__I_I_____===__|_________|\n   |(_)---  |   H\\________/ |   |        =|___ ___|  \n   /     |  |   H  |  |     |   |         ||_| |_||  \n  |      |  |   H  |__--------------------| [___] |  \n  | ________|___H__/__|_____/[][]~\\_______|       |  \n  |/ |   |-----------I_____I [][] []  D   |=======|__\n__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__\n |/-=|___|=    ||    ||    ||    |_____/~\\___/        \n  \\_/      \\O=====O=====O=====O_/      \\_/            \n';
      return { ok: true, out: t, tip: 'Choo choo! 🚂 <code>sl</code> is a joke for people who mistype <code>ls</code>.' };
    },
    htop() { return { ok: true, out: '', tip: '<code>htop</code> opens a full-screen live view of running programs. In the real Terminal press <b>q</b> or <b>F10</b> to quit it.' }; },
  };
  ['supertux2', 'supertuxkart', 'tuxpaint', 'gimp', 'gnome-tweaks', 'gnome-chess', 'vlc'].forEach((c) => {
    CMDS[c] = function () { return { ok: true, out: '', tip: `🚀 In real Fedora, <code>${c}</code> would open its app window now!` }; };
  });

  function hintCase(sh, path) {
    if (!path) return null;
    const parts = sh.abs(path); const parent = sh.node(parts.slice(0, -1)); const name = parts[parts.length - 1];
    if (parent && parent.t === 'd' && name) {
      const alt = Object.keys(parent.c).find((k) => k.toLowerCase() === name.toLowerCase() && k !== name);
      if (alt) return `Close! Linux cares about BIG and small letters: it's <code>${esc(alt)}</code>, not <code>${esc(name)}</code>.`;
    }
    return null;
  }
  function highlight(line, re) {
    let out = ''; let last = 0; re.lastIndex = 0; let m;
    while ((m = re.exec(line)) !== null) {
      if (m[0] === '') { re.lastIndex++; continue; }
      out += esc(line.slice(last, m.index)) + `<span class="c-grep">${esc(m[0])}</span>`; last = m.index + m[0].length;
    }
    re.lastIndex = 0;
    return out + esc(line.slice(last));
  }
  function headTail(args, stdin, which) {
    let n = 10; const rest = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '-n') { n = parseInt(args[++i], 10); continue; }
      if (/^-n\d+$/.test(a)) { n = parseInt(a.slice(2), 10); continue; }
      if (/^-\d+$/.test(a)) { n = parseInt(a.slice(1), 10); continue; }
      rest.push(a);
    }
    if (isNaN(n)) return { ok: false, err: `${which}: invalid number of lines` };
    let txt = stdin || '';
    if (rest.length) { const node = this.get(rest[0]); if (!node) return { ok: false, err: `${which}: cannot open '${rest[0]}' for reading: No such file or directory` }; if (node.t === 'd') return { ok: false, err: `${which}: error reading '${rest[0]}': Is a directory` }; txt = node.data; }
    let lines = txt.split('\n'); if (lines[lines.length - 1] === '') lines.pop();
    lines = which === 'head' ? lines.slice(0, n) : lines.slice(Math.max(0, lines.length - n));
    return { ok: true, out: lines.join('\n') + (lines.length ? '\n' : '') };
  }
  function copyMove(args, ctx, move) {
    const name = move ? 'mv' : 'cp';
    const { flags, rest } = parseFlags(args, { recursive: 'r' });
    const rec = flags.has('r') || flags.has('R') || flags.has('a');
    if (rest.length < 2) return { ok: false, err: rest.length ? `${name}: missing destination file operand after '${rest[0]}'` : `${name}: missing file operand`, tip: `Use it like this: <code>${name} SOURCE DESTINATION</code>` };
    const dest = rest[rest.length - 1]; const srcs = rest.slice(0, -1);
    const dParts = this.abs(dest); const dNode = this.node(dParts);
    const errs = [];
    if (srcs.length > 1 && (!dNode || dNode.t !== 'd')) return { ok: false, err: `${name}: target '${dest}' is not a directory` };
    for (const s of srcs) {
      const sParts = this.abs(s); const sNode = this.node(sParts);
      if (!sNode) { errs.push(`${name}: cannot stat '${s}': No such file or directory`); continue; }
      if (this.lockedOn(sParts, ctx.sudo)) { errs.push(`${name}: cannot open '${s}' for reading: Permission denied`); continue; }
      if (sNode.t === 'd' && !move && !rec) { errs.push(`cp: -r not specified; omitting directory '${s}'`); continue; }
      let tParts = (dNode && dNode.t === 'd') ? dParts.concat(sParts[sParts.length - 1]) : dParts;
      const tParent = this.node(tParts.slice(0, -1));
      if (!tParent || tParent.t !== 'd') { errs.push(`${name}: cannot ${move ? 'move' : 'create regular file'} '${dest}': No such file or directory`); continue; }
      if (!this.canWrite(tParts, ctx.sudo) || (move && !this.canWrite(sParts, ctx.sudo))) { errs.push(`${name}: cannot ${move ? 'move' : 'create'} '${s}': Permission denied`); continue; }
      const tKey = tParts.join('/'); const sKey = sParts.join('/');
      if (tKey === sKey) { errs.push(`${name}: '${s}' and '${dest}' are the same file`); continue; }
      if (sNode.t === 'd' && (tKey + '/').startsWith(sKey + '/')) { errs.push(`${name}: cannot ${move ? 'move' : 'copy'} a directory, '${s}', into itself, '${dest}'`); continue; }
      const existing = tParent.c[tParts[tParts.length - 1]];
      if (existing && existing.t === 'd' && sNode.t !== 'd') { errs.push(`${name}: cannot overwrite directory '${dest}' with non-directory`); continue; }
      tParent.c[tParts[tParts.length - 1]] = move ? sNode : clone(sNode);
      if (move) {
        delete this.node(sParts.slice(0, -1)).c[sParts[sParts.length - 1]];
        const cw = this.cwd.join('/');
        if (cw === sKey || cw.startsWith(sKey + '/')) this.cwd = tParts.concat(this.cwd.slice(sParts.length));
      }
    }
    return { ok: !errs.length, out: '', err: errs.join('\n') };
  }
  function shRun(args) {
    if (!args.length) return { ok: false, err: 'LilNux: an interactive shell inside a shell? Too deep! Try: bash magic.sh' };
    const n = this.get(args[0]);
    if (!n) return { ok: false, err: `bash: ${args[0]}: No such file or directory` };
    if (n.t === 'd') return { ok: false, err: `bash: ${args[0]}: Is a directory` };
    return this.runScriptText(n.data, this.abs(args[0]).pop());
  }
  function editor(args, name, keys) {
    return { ok: true, out: '', tip: `<code>${name}</code> is a full-screen text editor (${keys}). This pretend terminal can't open it — instead use <code>echo "your text" &gt; ${esc(args[0] || 'file.txt')}</code>. On real Fedora you can also use the <b>Text Editor</b> app.` };
  }
  function cow(text, think) {
    const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
    const lines = []; let cur = '';
    for (const w of words) { if ((cur + ' ' + w).trim().length > 38) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
    if (cur) lines.push(cur);
    const width = Math.max(...lines.map((l) => l.length));
    let b = ' ' + '_'.repeat(width + 2) + '\n';
    if (lines.length === 1) b += (think ? '( ' : '< ') + lines[0] + (think ? ' )' : ' >') + '\n';
    else lines.forEach((l, i) => {
      const [o, c] = think ? ['(', ')'] : i === 0 ? ['/', '\\'] : i === lines.length - 1 ? ['\\', '/'] : ['|', '|'];
      b += o + ' ' + l.padEnd(width) + ' ' + c + '\n';
    });
    b += ' ' + '-'.repeat(width + 2) + '\n';
    const t = think ? 'o' : '\\';
    b += `        ${t}   ^__^\n         ${t}  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||\n`;
    return b;
  }

  // ---- dnf (dnf5 style) -----------------------------------------------------------------
  const ROOT_MSG = 'This command has to be run with superuser privileges (under the root user on most systems).';
  const LOADED = 'Updating and loading repositories:\nRepositories loaded.\n';
  function table(rows, verb) {
    let s = 'Package'.padEnd(26) + 'Arch'.padEnd(8) + 'Version'.padEnd(20) + 'Repository'.padEnd(12) + '     Size\n' + verb + ':\n';
    for (const r of rows) s += ' ' + r.name.padEnd(25) + r.arch.padEnd(8) + r.ver.padEnd(20) + r.repo.padEnd(12) + r.size.padStart(9) + '\n';
    return s;
  }
  function confirm(sh, text, onYes, assumeYes) {
    if (assumeYes) { const r = onYes(); r.out = text + (r.out || ''); return r; }
    return {
      ok: true, out: text,
      pending: {
        prompt: 'Is this ok [y/N]: ',
        resume: (ans) => (/^y(es)?$/i.test(ans.trim()) ? onYes() : { ok: false, out: 'Operation aborted by the user.\n', tip: ans.trim() ? null : 'The capital <b>N</b> in <b>[y/N]</b> means pressing Enter alone answers “No”. Type <b>y</b> to say yes.' }),
      },
    };
  }
  function dnf(args, ctx) {
    const { flags, rest } = parseFlags(args, { assumeyes: 'y', installed: 'installed', refresh: 'refresh' });
    const sub = rest[0]; const pkgs = rest.slice(1);
    const yes = flags.has('y');
    if (!sub) return { ok: false, err: 'Missing command. Add "--help" for more information about the arguments.', tip: 'Try <code>dnf search game</code> or <code>sudo dnf install cowsay</code>.' };
    if (sub === 'search') {
      if (!pkgs.length) return { ok: false, err: 'Missing positional argument "patterns" for command "search".' };
      const q = pkgs.join(' ').toLowerCase();
      const hits = Object.keys(PKGS).filter((p) => p.includes(q) || PKGS[p].desc.toLowerCase().includes(q));
      if (!hits.length) return { ok: false, out: LOADED + `No matches found.\n` };
      return { ok: true, out: LOADED + 'Matched fields: name, summary\n' + hits.map((p) => ` ${(p + '.' + PKGS[p].arch).padEnd(28)}${PKGS[p].desc}`).join('\n') + '\n' };
    }
    if (sub === 'info') {
      const p = pkgs[0]; if (!PKGS[p]) return { ok: false, out: LOADED, err: 'No matching packages to list' };
      const k = PKGS[p];
      return { ok: true, out: LOADED + `${this.installed.has(p) ? 'Installed' : 'Available'} packages\nName            : ${p}\nVersion         : ${k.ver.split('-')[0]}\nRelease         : ${k.ver.split('-')[1]}\nArchitecture    : ${k.arch}\nInstalled size  : ${k.size}\nRepository      : fedora\nSummary         : ${k.desc}\nLicense         : (open source!)\n` };
    }
    if (sub === 'list') {
      if (!flags.has('installed') && !pkgs.includes('installed')) return { ok: true, out: LOADED + 'Available packages\n' + Object.keys(PKGS).map((p) => `${(p + '.' + PKGS[p].arch).padEnd(28)}${PKGS[p].ver.padEnd(18)}fedora`).join('\n') + '\n' };
      const base = ['bash.x86_64                  5.3.0-2.fc44      anaconda', 'firefox.x86_64               145.0-1.fc44      updates', 'gnome-shell.x86_64           50.1-1.fc44       updates', 'kernel.x86_64                6.19.8-200.fc44   updates'];
      return { ok: true, out: 'Installed packages\n' + base.concat([...this.installed].map((p) => `${(p + '.' + PKGS[p].arch).padEnd(29)}${PKGS[p].ver.padEnd(18)}fedora`)).join('\n') + '\n' };
    }
    if (sub === 'check-update' || sub === 'check-upgrade') {
      return this.upgradesLeft ? { ok: true, out: LOADED + 'firefox.x86_64        146.0-1.fc44          updates\ngnome-shell.x86_64    50.2-1.fc44           updates\nkernel.x86_64         6.19.10-200.fc44      updates\n' } : { ok: true, out: LOADED };
    }
    if (['install', 'remove', 'erase', 'upgrade', 'update', 'reinstall', 'autoremove', 'system-upgrade'].includes(sub) && !ctx.sudo) {
      return { ok: false, err: ROOT_MSG, tip: 'Changing software needs admin powers. Put <code>sudo</code> in front: <code>sudo ' + esc(['dnf'].concat(args).join(' ')) + '</code>' };
    }
    if (sub === 'install' || sub === 'reinstall') {
      if (!pkgs.length) return { ok: false, err: 'Missing positional argument "specs" for command "install".' };
      const missing = pkgs.filter((p) => !PKGS[p]);
      if (missing.length) {
        const sug = missing.map((m) => Object.keys(PKGS).find((p) => PKGS[p].cmds.includes(m))).filter(Boolean);
        return { ok: false, out: LOADED, err: 'Failed to resolve the transaction:\n' + missing.map((m) => `No match for argument: ${m}`).join('\n'), tip: sug.length ? `The package has a different name than the command! Try <code>sudo dnf install ${esc(sug[0])}</code>` : 'Use <code>dnf search WORD</code> to find the right package name.' };
      }
      const todo = pkgs.filter((p) => !this.installed.has(p));
      if (!todo.length) return { ok: true, out: LOADED + pkgs.map((p) => `Package "${p}-${PKGS[p].ver}.${PKGS[p].arch}" is already installed.`).join('\n') + '\n\nNothing to do.\n' };
      const rows = todo.map((p) => ({ name: p, arch: PKGS[p].arch, ver: PKGS[p].ver, repo: 'fedora', size: PKGS[p].size }));
      const text = LOADED + table(rows, 'Installing') + `\nTransaction Summary:\n Installing:        ${todo.length} package${todo.length > 1 ? 's' : ''}\n\n`;
      return confirm(this, text, () => {
        todo.forEach((p) => this.installed.add(p));
        const dl = todo.map((p, i) => `[${i + 1}/${todo.length}] ${p}-0:${PKGS[p].ver}.${PKGS[p].arch}`.padEnd(48) + '100% |   1.2 MiB/s |  ' + PKGS[p].size.padStart(9)).join('\n');
        return { ok: true, out: dl + '\nRunning transaction\n[1/3] Verify package files              100% |\n[2/3] Prepare transaction               100% |\n' + todo.map((p) => `[3/3] Installing ${p}-0:${PKGS[p].ver}.${PKGS[p].arch}`.padEnd(48) + '100% |').join('\n') + '\nComplete!\n', tip: `Installed! Now try running <code>${esc(PKGS[todo[0]].cmds[0])}</code>` };
      }, yes);
    }
    if (sub === 'remove' || sub === 'erase') {
      const todo = pkgs.filter((p) => this.installed.has(p));
      if (!todo.length) return { ok: true, out: LOADED, err: pkgs.length ? 'No packages to remove for argument: ' + pkgs.join(' ') : 'Missing positional argument "specs" for command "remove".' };
      const rows = todo.map((p) => ({ name: p, arch: PKGS[p].arch, ver: PKGS[p].ver, repo: '@System', size: PKGS[p].size }));
      return confirm(this, LOADED + table(rows, 'Removing') + `\nTransaction Summary:\n Removing:          ${todo.length} package${todo.length > 1 ? 's' : ''}\n\n`, () => {
        todo.forEach((p) => this.installed.delete(p));
        return { ok: true, out: 'Running transaction\n' + todo.map((p) => `[1/1] Removing ${p}-0:${PKGS[p].ver}.${PKGS[p].arch}`.padEnd(48) + '100% |').join('\n') + '\nComplete!\n' };
      }, yes);
    }
    if (sub === 'upgrade' || sub === 'update') {
      if (!this.upgradesLeft) { this.flags.upgraded = true; return { ok: true, out: LOADED + 'Nothing to do.\n', tip: 'Everything is already up to date. 🎉' }; }
      const rows = [
        { name: 'firefox', arch: 'x86_64', ver: '146.0-1.fc44', repo: 'updates', size: '271.3 MiB' },
        { name: 'gnome-shell', arch: 'x86_64', ver: '50.2-1.fc44', repo: 'updates', size: '12.1 MiB' },
        { name: 'kernel', arch: 'x86_64', ver: '6.19.10-200.fc44', repo: 'updates', size: '0.0 B' },
      ];
      return confirm(this, LOADED + table(rows, 'Upgrading') + '\nTransaction Summary:\n Upgrading:         3 packages\n\n', () => {
        this.upgradesLeft = false; this.flags.upgraded = true;
        return { ok: true, out: '[1/3] firefox-0:146.0-1.fc44.x86_64            100% |  10.4 MiB/s |  68.2 MiB\n[2/3] gnome-shell-0:50.2-1.fc44.x86_64        100% |   9.8 MiB/s |   3.1 MiB\n[3/3] kernel-0:6.19.10-200.fc44.x86_64        100% |  11.0 MiB/s |  98.6 KiB\nRunning transaction\n[1/6] Verify package files                    100% |\n[2/6] Prepare transaction                     100% |\n[3/6] Upgrading firefox                       100% |\n[4/6] Upgrading gnome-shell                   100% |\n[5/6] Installing kernel                       100% |\n[6/6] Cleaning up old versions                100% |\nComplete!\n', tip: 'Your pretend computer is up to date! A new <b>kernel</b> was installed, so on a real computer you\'d restart soon.' };
      }, yes);
    }
    if (sub === 'autoremove') return { ok: true, out: LOADED + 'Nothing to do.\n' };
    if (sub === 'system-upgrade') return { ok: false, err: 'LilNux: upgrading to a whole new Fedora version is a grown-up job!', tip: 'When Fedora 45 comes out, the <b>Software</b> app will show a big “Download” button for it. That\'s the easiest way.' };
    return { ok: false, err: `Unknown argument "${sub}" for command "dnf5". Add "--help" for more information about the arguments.` };
  }

  // ---- flatpak --------------------------------------------------------------------------
  function findFlat(q) {
    if (!q) return [];
    if (FLATS[q]) return [q];
    const low = q.toLowerCase();
    const exact = Object.keys(FLATS).filter((id) => id.toLowerCase() === low);
    if (exact.length) return exact;
    return Object.keys(FLATS).filter((id) => id.toLowerCase().includes(low) || FLATS[id].name.toLowerCase().includes(low));
  }
  function flatpak(args) {
    const { flags, rest } = parseFlags(args, { assumeyes: 'y', user: 'user', system: 'system', app: 'app' });
    const sub = rest[0];
    const yes = flags.has('y');
    if (!sub) return { ok: false, err: 'error: No command specified', tip: 'Try <code>flatpak search kart</code> or <code>flatpak list</code>.' };
    if (sub === 'search') {
      const hits = findFlat(rest.slice(1).join(' '));
      if (!hits.length) return { ok: true, out: 'No matches found\n' };
      return { ok: true, out: 'Name'.padEnd(32) + 'Application ID'.padEnd(34) + 'Version'.padEnd(10) + 'Remotes\n' + hits.map((id) => FLATS[id].name.padEnd(32) + id.padEnd(34) + FLATS[id].ver.padEnd(10) + 'flathub').join('\n') + '\n' };
    }
    if (sub === 'list') {
      if (!this.flatpaks.size) return { ok: true, out: '', tip: 'No apps installed from Flathub yet. Try <code>flatpak install flathub net.supertuxkart.SuperTuxKart</code>' };
      return { ok: true, out: 'Name'.padEnd(32) + 'Application ID'.padEnd(34) + 'Version'.padEnd(10) + 'Branch    Installation\n' + [...this.flatpaks].map((id) => FLATS[id].name.padEnd(32) + id.padEnd(34) + FLATS[id].ver.padEnd(10) + 'stable    system').join('\n') + '\n' };
    }
    if (sub === 'install') {
      let ids = rest.slice(1);
      if (ids[0] === 'flathub' || ids[0] === 'fedora') ids = ids.slice(1);
      if (!ids.length) return { ok: false, err: 'error: At least one REF must be specified', tip: 'Like this: <code>flatpak install flathub net.supertuxkart.SuperTuxKart</code>' };
      const found = [];
      for (const q of ids) {
        const h = findFlat(q);
        if (!h.length) return { ok: false, err: `error: No remote refs found for ‘${q}’`, tip: 'Use <code>flatpak search WORD</code> to find the exact Application ID.' };
        if (h.length > 1) return { ok: false, out: `Similar refs found for ‘${q}’ in remote ‘flathub’ (system):\n\n` + h.map((id, i) => `   ${i + 1}) app/${id}/x86_64/stable`).join('\n') + '\n', err: 'error: more than one match — please type the full Application ID', tip: 'Copy one of the IDs above, like <code>' + esc(h[0]) + '</code>' };
        found.push(h[0]);
      }
      const todo = found.filter((id) => !this.flatpaks.has(id));
      if (!todo.length) return { ok: true, out: `Skipping: ${found[0]}/x86_64/stable is already installed\n` };
      const text = 'Looking for matches…\n\n' + todo.map((id, i) => `        ID`.padEnd(14) + '\n' + ` ${i + 1}.     ${id}`.padEnd(48) + 'stable    i    flathub   < 120 MB').join('\n') + '\n\n';
      const done = () => {
        todo.forEach((id) => this.flatpaks.add(id));
        return { ok: true, out: 'Installing…\nInstalling 1/1… ████████████████████ 100%  12.0 MB/s  00:00\n\nInstallation complete.\n', tip: `<b>${esc(FLATS[todo[0]].name)}</b> is installed! In real Fedora it shows up in your app grid (<kbd>Super</kbd>+<kbd>A</kbd>). Or run <code>flatpak run ${esc(todo[0])}</code>` };
      };
      if (yes) { const r = done(); r.out = text + r.out; return r; }
      return { ok: true, out: text, pending: { prompt: 'Proceed with these changes to the system installation? [Y/n]: ', resume: (a) => (/^(y(es)?)?$/i.test(a.trim()) ? done() : { ok: false, out: '', err: 'error: Aborted by user' }) } };
    }
    if (sub === 'uninstall' || sub === 'remove') {
      const h = findFlat(rest[1]).filter((id) => this.flatpaks.has(id));
      if (!h.length) return { ok: false, err: `error: ${rest[1] || 'app'} not installed` };
      this.flatpaks.delete(h[0]);
      return { ok: true, out: `\n        ID                              Branch    Op\n 1.     ${h[0]}    stable    r\n\nUninstall complete.\n` };
    }
    if (sub === 'update') {
      if (!this.flatpaks.size || !this.flatUpdatesLeft) return { ok: true, out: 'Looking for updates…\n\n\nNothing to do.\n' };
      this.flatUpdatesLeft = false;
      return { ok: true, out: 'Looking for updates…\n\n        ID                                   Branch   Op\n 1.     org.gnome.Platform.Locale            49       u\n 2.     ' + [...this.flatpaks][0].padEnd(37) + 'stable   u\n\nUpdating 2/2… ████████████████████ 100%\n\nUpdates complete.\n' };
    }
    if (sub === 'run') {
      const h = findFlat(rest[1]).filter((id) => this.flatpaks.has(id));
      if (!h.length) return { ok: false, err: `error: app/${rest[1] || ''}/x86_64/master not installed` };
      return { ok: true, out: '', tip: `🚀 Launching <b>${esc(FLATS[h[0]].name)}</b>… (in real Fedora a window would open!)` };
    }
    if (sub === 'remotes') return { ok: true, out: 'Name    Options\nfedora  system,oci\nflathub system\n' };
    return { ok: false, err: `error: '${sub}' is not a flatpak command. See 'flatpak --help'.` };
  }

  global.LilShell = Shell;
  global.LilShellUtil = { esc };
})(window);
