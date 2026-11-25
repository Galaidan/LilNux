/* Colonel Kernel — world data for Chapter 1 (Firmware Foundry, GRUB Gate). */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  // `kill -l` / `trap -l` as bash prints them on Linux (first 19 of 64).
  const SIGNALS = ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGKILL', 'SIGUSR1',
    'SIGSEGV', 'SIGUSR2', 'SIGPIPE', 'SIGALRM', 'SIGTERM', 'SIGSTKFLT', 'SIGCHLD', 'SIGCONT', 'SIGSTOP'];
  const sigList = () => {
    const cells = SIGNALS.map((s, i) => `${String(i + 1).padStart(2, ' ')}) ${s}`);
    const rows = []; for (let i = 0; i < cells.length; i += 5) rows.push(cells.slice(i, i + 5).map((c) => c.padEnd(13, ' ')).join(' ').trimEnd());
    return `<pre>${rows.join('\n')}</pre><div class="ck-dim">…up to 64 on Linux</div>`;
  };
  const dim = (t) => `<div class="ck-dim">${t}</div>`;
  // Signal names bash knows on Linux (1-31; case doesn't matter, SIG is optional), or a number 0-64.
  const NAMES = SIGNALS.map((n) => n.slice(3)).concat(['TSTP', 'TTIN', 'TTOU', 'URG', 'XCPU', 'XFSZ', 'VTALRM', 'PROF', 'WINCH', 'IO', 'POLL', 'PWR', 'SYS', 'IOT', 'CLD']);
  const TRAP_ONLY = ['EXIT', 'DEBUG', 'RETURN', 'ERR']; // pseudo-signals only `trap` understands
  function sigOk(spec, trap) {
    if (/^\d+$/.test(spec)) return Number(spec) <= 64;
    const n = spec.toUpperCase().replace(/^SIG/, '');
    return NAMES.includes(n) || (!!trap && TRAP_ONLY.includes(n));
  }
  const badSig = (cmd, spec) => ({ ok: false, html: `bash: ${cmd}: ${spec.replace(/[&<>]/g, '')}: invalid signal specification` });
  function killTerm(line) {
    if (/^kill\s+-l$/.test(line)) return { ok: true, html: sigList() };
    const m = line.match(/^kill\s+(?:-s\s+(\S+)\s+|-(\S+)\s+)?(\d+)$/);
    if (m) {
      const spec = m[1] || m[2];
      if (spec && !sigOk(spec)) return badSig('kill', spec);
      if (m[3] === '1') return { ok: true, html: 'bash: kill: (1) - Operation not permitted' + dim('Only root may signal PID 1. Which is me, by the way. Rude.') };
      return { ok: true, html: `bash: kill: (${m[3]}) - No such process` + dim('Down here it hits Glitch Mites instead.') };
    }
    return { ok: false, html: 'kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]' };
  }
  function trapTerm(line) {
    if (/^trap\s+-l$/.test(line)) return { ok: true, html: sigList() };
    const m = line.match(/^trap\s+(['"]).+\1((?:\s+\S+)+)$/);
    if (m) {
      const specs = m[2].trim().split(/\s+/); const bad = specs.find((x) => !sigOk(x, true));
      if (bad) return badSig('trap', bad);
      const uncatchable = specs.some((x) => ['KILL', 'STOP', '9', '19'].includes(x.toUpperCase().replace(/^SIG/, '')));
      return { ok: true, html: dim(uncatchable ? 'SIGKILL and SIGSTOP can’t be caught: that handler would never run.' : 'Handler set. Down here it catches orbs and lunges.') };
    }
    return { ok: false, html: dim("try <code>trap 'echo caught' INT</code>") };
  }

  const SKILLS = {
    kill: {
      id: 'kill', cmd: 'kill', name: 'Kill Strike', icon: '⚔️', teacher: 'pip', move: true, learnTest: /^kill\s+(-l|(-s\s+\S+\s+|-\S+\s+)?\d+)$/,
      blurb: 'Melee combo. Each hit cools your heat a little.',
      real: '`kill` sends a signal to a process. By default it’s SIGTERM, which asks it to quit politely; `kill -9` sends SIGKILL, which the process can’t catch or ignore.',
      example: 'kill -l', term: killTerm,
      upgrade: { id: 'kill-9', cmd: 'kill -9', cost: 50, needs: 'cpu', blurb: 'hold to charge a heavy strike nothing can catch' },
    },
    trap: {
      id: 'trap', cmd: 'trap', name: 'Signal Trap', icon: '🛡️', teacher: 'pip', move: true, learnTest: /^trap\s+(-l|(['"]).+\2(\s+\S+)+)$/,
      blurb: 'Parry: catch a signal and send it back. Mistimed, it leaves you open.',
      real: 'In bash, `trap \'echo caught\' INT` runs a command when the shell gets SIGINT (Ctrl+C). Scripts use it to clean up. SIGKILL and SIGSTOP can’t be trapped.',
      example: "trap 'echo caught' INT", term: trapTerm,
    },
    echo: {
      id: 'echo', cmd: 'echo', name: 'Echo Bolt', icon: '📣', teacher: 'pip', learnTest: /^echo\s+\S/,
      blurb: 'Ranged bolt. Also trips switches across gaps.',
      real: 'echo prints whatever you give it. `echo hello` prints hello. Add > to write it into a file: `echo hi > note.txt`.',
      example: 'echo "Hello, Fedora"',
      fight: { type: 'bolt', dmg: 10, cd: 0.35, heat: 9 },
      upgrade: { id: 'echo-n', cmd: 'echo -n', cost: 30, blurb: 'no trailing newline: bolts fire 25% faster' },
    },
    ls: {
      id: 'ls', cmd: 'ls', name: 'List Scan', icon: '🔦', teacher: 'bios', learnTest: /^ls(\s|$)/,
      blurb: 'Light pulse: lights dark rooms and reveals cloaked creatures.',
      real: 'ls lists what is inside a folder. `ls -a` also shows hidden entries — names starting with a dot.',
      example: 'ls -a ~',
      fight: { type: 'scan', reveal: 4, cd: 3, heat: 15 },
      upgrade: { id: 'ls-a', cmd: 'ls -a', cost: 40, blurb: 'also shows hidden entries: cracked walls to hidden caches, reveal lasts 7s' },
    },
    cd: {
      id: 'cd', cmd: 'cd', name: 'Change Directory', icon: '🌀', teacher: 'grub', learnTest: /^cd(\s|$)/,
      blurb: 'At a terminal: fast-travel between safe rooms. At a path sign: pick the right path.',
      real: 'cd changes your current directory. `cd Documents` goes in, `cd ..` goes up, plain `cd` goes home, `cd -` jumps back.',
      example: 'cd /boot',
      fight: { type: 'dash', cd: 1.2, heat: 6 },
    },
  };

  const MODULES = {
    ram: { id: 'ram', name: 'RAM Stick', icon: '🟩', slots: 1, real: 'RAM is short-term memory: more of it means more programs open at once without slowing down. Here: +1 loadout slot.' },
    fan: { id: 'fan', name: 'Cooling Fan', icon: '🌬️', heatMul: 0.7, real: 'Hot chips slow themselves down (thermal throttling). Good cooling keeps them at full speed. Here: skills build 30% less heat.' },
    cpu: { id: 'cpu', name: 'CPU Core', icon: '🧠', cdMul: 0.85, real: 'Each CPU core runs its own stream of work, so more cores means more done in parallel. Here: skills recharge 15% faster.' },
    ssd: { id: 'ssd', name: 'SSD', icon: '💾', moveMul: 1.2, dashCdMul: 0.75, real: 'An SSD stores data on flash chips with no moving parts — far faster than an old spinning hard drive. Here: you move 20% faster and your dash recharges 25% sooner.' },
  };

  const CREATURES = {
    glitchMite: {
      id: 'glitchMite', name: 'Glitch Mite', hp: 30, speed: 90, pattern: 'drift', cloaked: true, count: 3, weak: 'ls',
      shoots: { every: 2.4, speed: 160, dmg: 8 },
      weakText: '🔦 Cloaked — pulse ls to light them up, then kill.',
      real: 'Before anything boots, firmware runs POST to check each part. Faulty hardware usually shows up as beep codes or a screen that never lights.',
    },
    loopWisp: {
      id: 'loopWisp', name: 'Loop Wisp', hp: 40, speed: 150, pattern: 'blink', cloaked: false, count: 2, weak: 'cd',
      shoots: { every: 1.8, speed: 210, dmg: 10 },
      weakText: '🌀 Blinks, then bursts — dash through the burst and strike.',
      real: 'A broken bootloader setup can loop back to its own menu forever. The real fix is pointing GRUB at the right kernel, often from a live USB.',
    },
    bootGlitch: {
      id: 'bootGlitch', name: 'Corrupt Boot Glitch', boss: true, hp: 220, phases: 2, speed: 120, pattern: 'sweep', cloaked: true, count: 1, weak: 'ls',
      shoots: { every: 1.4, speed: 200, dmg: 10 },
      weakText: '🔦 Re-cloaks every phase — keep pulsing ls. Its red 9 ring is SIGKILL: dash, don’t trap.',
      real: 'If the boot sector or EFI partition is damaged, firmware finds nothing to start and shows "No bootable device".',
    },
    kernelWraith: {
      id: 'kernelWraith', name: 'Missing Kernel Wraith', boss: true, hp: 300, phases: 3, speed: 170, pattern: 'blink', cloaked: true, count: 1, weak: 'cd',
      shoots: { every: 1.2, speed: 230, dmg: 12 },
      weakText: '🌀🔦 Blinks and cloaks — pulse ls, dash its SIGKILL ring, kill it.',
      real: 'If GRUB cannot find the kernel file (vmlinuz) in /boot, the menu entry fails with “error: file … not found” and you drop back to the menu. Fedora keeps a few older kernels there so you can boot one of those instead.',
    },
  };

  const CHARACTERS = {
    pip: {
      id: 'pip', name: 'Pip', title: 'PID 1 · your companion', color: '#38f2ff',
      lines: [
        '…boot sequence… hey. HEY. Oh good, you’re awake. I was starting to talk to myself, and honestly? Terrible company.',
        'I’m Pip. PID 1. On Linux the very first program the kernel starts gets process ID 1, and it starts and babysits everything else. So yes — I’m technically your oldest friend. You’re welcome.',
        'You don’t remember who you are? Great. Fantastic. My memory’s scrambled too, so that makes two of us. Let’s fix this machine and hope it shakes something loose.',
        'Lesson one: kill. In a real terminal it sends a signal to a process — SIGTERM by default, a polite “please stop”. Down here it’s your fists. Type it.',
      ],
    },
    bios: {
      id: 'bios', name: 'Bios', title: 'Firmware guardian', color: '#ffb347',
      lines: [
        'HALT. Who goes there? …Oh. A kernel-shaped thing. You look terrible.',
        'I’m BIOS. Technically UEFI these days, but nobody can pronounce that. I’m firmware: code baked into the motherboard that runs before any operating system.',
        'My job is POST — Power-On Self-Test. Check every part is alive, find something bootable, hand over control. Simple. Normally.',
        'But Glitch Mites got in. Cloaked little pests. You can’t hit what you can’t see — so take ls. It lists what’s in a place. Down here it’s a light pulse. Type it.',
      ],
    },
    grub: {
      id: 'grub', name: 'Grub', title: 'GRand Unified Bootloader', color: '#b6ff5c',
      lines: [
        'Oh hi! Welcome to the boot menu! I’m GRUB — GRand Unified Bootloader. Yes, I’m a grub. Yes, the jokes write themselves.',
        'Firmware hands control to me. I find the Linux kernel on the disk, load it into memory, give it its settings, and press GO.',
        'Except the kernel I’m supposed to load has… gone missing. And something keeps rewriting my paths into loops.',
        'You’ll want cd — change directory. In a terminal it moves you between folders. Out here it works the old terminals and my path signs. Type it!',
        'Fun fact: Fedora hides my menu unless something went wrong. Hold Shift or tap Esc while the computer starts and you’ll see me.',
      ],
    },
  };

  CHARACTERS.liltux = {
    id: 'liltux', name: 'Lil Tux', title: 'Linux mascot · lives at Home', color: '#f5a623',
    lines: [
      'You did it! The whole machine booted! I’m Lil Tux — I live here at Home, the desktop that appears when Linux is up and running.',
      'Firmware checked the hardware, GRUB loaded the kernel, the kernel started PID 1… and now there’s a working computer. A tiny one, but a real one!',
      'Colonel, you look exhausted. Even kernels need rest. When you rest, the system goes quiet — the CPU idles until something wakes it up.',
      'On a real Fedora computer, `systemctl suspend` puts it to sleep. Type it, and you can rest at any safe spot — or just close the game; that counts too.',
      'And if you’ve been playing for ages, I’ll remind you to take a break. Promise you’ll actually take it? 🐧',
    ],
  };

  // Puzzle grids are stored SOLVED. Codes: S=source G=target I=straight L=corner T=tee X=cross .=empty, digit = rotation.
  const TYPES = { S: 'source', G: 'target', I: 'straight', L: 'corner', T: 'tee', X: 'cross', '.': 'empty' };
  function grid(rows) {
    const cells = rows.map((row) => row.split(' ').map((c) => ({ t: TYPES[c[0]], r: c[0] === '.' ? 0 : Number(c[1] || 0) })));
    return { rows: cells.length, cols: cells[0].length, cells };
  }

  const n = (x, y, label, kind, ref, extra) => Object.assign({ x, y, label, kind }, ref !== undefined ? { ref } : {}, extra || {});

  const firmware = {
    id: 'firmware', name: 'Firmware Foundry', accent: '#ffb347', start: 'f0', boss: 'f12', exit: 'f13',
    intro: ['Firmware Foundry. This is where a computer wakes up — before Linux, before anything. Cozy. Well, no. Dark.', 'Walk with WASD or your left thumb. Doors lead on; my map in Pip’s panel shows where we’ve been. Don’t worry, I’ll float right next to you. Someone has to.', 'Weird… I’m picking up a faint signal deep inside the system. Small. Penguin-shaped? Let’s boot this machine and find out.'],
    outro: ['POST complete! The firmware found a bootable disk and is handing control to the bootloader. Look at you, being useful.', '…did you feel that? A memory. Something about “Linux version 6.19”. Weird. Let’s keep moving before you get sentimental.'],
    nodes: {
      f0: n(120, 520, 'Cold Boot', 'start', undefined, { dark: true }),
      f1: n(300, 520, 'Power Rail', 'character', 'pip'),
      f2: n(300, 300, 'CMOS Cell', 'memory', '[    0.000000] Linux version 6.19.8-200.fc44.x86_64 (mockbuild@fedoraproject.org)'),
      f3: n(500, 520, 'Firmware Vault', 'character', 'bios'),
      f4: n(480, 780, 'Boot ROM', 'memory', '[    0.000000] efi: EFI v2.9 by LilNux Firmware', { dark: true }),
      f5: n(700, 390, 'RAM Bank', 'problem', { skill: 'ls', creature: 'glitchMite', title: 'Unchecked RAM bank', real: 'POST checks memory before boot. Looking first with ls is the same habit: inspect before you act.' }),
      f6: n(720, 170, 'DIMM Slot', 'item', 'ram'),
      f7: n(720, 690, 'PCIe Lane', 'problem', { skill: 'ls', creature: 'glitchMite', title: 'Silent PCIe lane', real: 'Graphics cards and NVMe drives sit on PCIe lanes. On real Linux, `lspci` lists every device the kernel found there.' }),
      f8: n(900, 860, 'Option ROM', 'memory', '[    0.000000] BIOS-provided physical RAM map:', { dark: true }),
      f9: n(950, 520, 'Power Bus', 'circuit', { grid: grid(['S1 I1 L2 L0', 'I0 T0 I0 L1', 'L3 I1 L0 G3', 'T1 L2 I1 X0']) }),
      f10: n(1150, 320, 'ACPI Table', 'memory', '[    0.004000] ACPI: Early table checksum verification disabled'),
      f11: n(1150, 710, 'Clock Gen', 'memory', '[    0.000000] DMI: LilNux Systems Fedora Box, BIOS 1.44 11/22/2026'),
      f12: n(1330, 520, 'Boot Sector', 'boss', { creature: 'bootGlitch', drop: 'fan' }),
      f13: n(1500, 520, 'To GRUB', 'exit'),
      f14: n(560, 250, 'Hidden Cache', 'item', { bits: 20 }, { hidden: true }),
      f15: n(1060, 940, 'Hidden Cache', 'item', { bits: 25 }, { hidden: true }),
    },
    cells: { f0: [0, 1], f1: [1, 1], f2: [1, 0], f14: [2, 0], f3: [2, 1], f4: [1, 2], f5: [3, 1], f6: [3, 0], f7: [2, 2], f9: [3, 2], f10: [4, 2], f8: [2, 3], f11: [3, 3], f12: [4, 3], f13: [5, 3], f15: [2, 4] },
    edges: [['f0', 'f1'], ['f1', 'f2'], ['f1', 'f3'], ['f3', 'f14'], ['f2', 'f14'], ['f1', 'f4'], ['f3', 'f5'], ['f3', 'f7'], ['f5', 'f6'], ['f5', 'f9'],
      ['f7', 'f8'], ['f7', 'f9'], ['f8', 'f15'], ['f9', 'f10'], ['f9', 'f11'], ['f10', 'f12'], ['f11', 'f12'], ['f12', 'f13']],
  };

  const grubRegion = {
    id: 'grub', name: 'GRUB Gate', accent: '#b6ff5c', start: 'g0', boss: 'g12', exit: null, home: 'g13',
    intro: ['GRUB Gate. The bootloader’s job: find the kernel, load it, and hand over control. Basically a very fancy “start” button.', 'Somewhere past these loops is the kernel image. Try not to get lost. Again.'],
    outro: ['The kernel image is loaded and GRUB just handed over control to… wait.', 'Colonel. The log says “Run /init as init process”. That’s me — PID 1. And the thing that starts PID 1 is the kernel. Which means you’re…', '…not important right now. The machine is booting! Look — Home just came online. Someone’s waving at us. Wave back, Colonel. It’s polite.'],
    nodes: {
      g0: n(110, 500, 'Boot Menu', 'start'),
      g1: n(300, 500, 'GRUB Shell', 'character', 'grub'),
      g2: n(300, 280, 'grub.cfg', 'memory', '[    0.000000] Command line: BOOT_IMAGE=(hd0,gpt2)/vmlinuz-6.19.8-200.fc44.x86_64 root=UUID=4f2c9a1e-7b3d-4c55-9e0a-1d2b3c4d5e6f ro rhgb quiet'),
      g3: n(500, 380, 'Menu Entry', 'circuit', { grid: grid(['X0 L2 L1 G3', 'L1 I1 T3 I0', 'I0 L1 T2 L3', 'S0 I1 L0 T0']) }),
      g4: n(520, 680, 'Loop Path', 'problem', { skill: 'cd', creature: 'loopWisp', title: 'Endless boot loop', real: 'Like cd taking you to the right folder, the real fix for a boot loop is pointing the bootloader at the right kernel path — usually by fixing its menu entries or picking another kernel.' }),
      g5: n(680, 200, 'Kernel Image', 'memory', '[    0.000000] Kernel command line: BOOT_IMAGE=(hd0,gpt2)/vmlinuz-6.19.8-200.fc44.x86_64 root=UUID=4f2c9a1e-7b3d-4c55-9e0a-1d2b3c4d5e6f ro rhgb quiet'),
      g6: n(720, 860, 'Spare Core', 'item', 'cpu'),
      g7: n(760, 500, 'initramfs', 'memory', '[    0.982114] Freeing initrd memory: 38912K'),
      g8: n(950, 380, 'Fallback Loop', 'problem', { skill: 'cd', creature: 'loopWisp', title: 'Fallback entry stuck in a loop', real: 'Fedora keeps older kernels as fallback menu entries. If the newest one breaks, you can boot an older one and fix things from there.' }),
      g9: n(950, 700, 'Root Bridge', 'circuit', { grid: grid(['S2 T1 I0 L1 X0', 'L0 I1 L2 L3 I1', 'I0 L2 I0 T0 L0', 'L1 T2 L0 I1 G3']) }),
      g10: n(1150, 250, 'Kernel Params', 'memory', '[    0.412345] Memory: 15981232K/16642560K available'),
      g11: n(1150, 820, 'Root UUID', 'memory', '[    1.204561] Run /init as init process'),
      g12: n(1330, 500, 'Kernel Handoff', 'boss', { creature: 'kernelWraith', drop: 'ssd' }),
      g13: n(1500, 500, 'Home', 'character', 'liltux', { accent: '#f5a623' }),
      g14: n(480, 140, 'Hidden Cache', 'item', { bits: 30 }, { hidden: true }),
      g15: n(900, 950, 'Hidden Cache', 'item', { bits: 30 }, { hidden: true }),
    },
    cells: { g0: [0, 1], g1: [1, 1], g2: [1, 0], g14: [2, 0], g3: [2, 1], g5: [3, 1], g4: [1, 2], g7: [2, 2], g8: [3, 2], g10: [4, 2], g6: [1, 3], g9: [2, 3], g11: [3, 3], g12: [4, 3], g13: [5, 3], g15: [1, 4] },
    edges: [['g0', 'g1'], ['g1', 'g2'], ['g1', 'g3'], ['g1', 'g4'], ['g2', 'g14'], ['g3', 'g5'], ['g3', 'g14'], ['g3', 'g7'], ['g4', 'g6'], ['g4', 'g7'],
      ['g6', 'g15'], ['g7', 'g8'], ['g7', 'g9'], ['g8', 'g10'], ['g9', 'g11'], ['g10', 'g12'], ['g11', 'g12'], ['g12', 'g13']],
  };

  const TASKS = {
    'bios-check': { id: 'bios-check', giver: 'bios', text: 'Run POST on every part: clear all problems in the Foundry', goal: { type: 'clearKind', region: 'firmware', kind: 'problem' }, bits: 25 },
    'grub-memories': { id: 'grub-memories', giver: 'grub', text: 'Recover all 5 boot memories at the Gate', goal: { type: 'memories', region: 'grub', count: 5 }, bits: 25 },
    'pip-clean': { id: 'pip-clean', giver: 'pip', text: 'Clear 3 problem rooms without taking a hit', goal: { type: 'clean', count: 3 }, bits: 30 },
  };

  CK.World = { SKILLS, MODULES, CREATURES, CHARACTERS, REGIONS: [firmware, grubRegion], TASKS, grid };
})(typeof window !== 'undefined' ? window : globalThis);
