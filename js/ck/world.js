/* Colonel Kernel — world data for Chapter 1 (Firmware Foundry, GRUB Gate). */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const SKILLS = {
    echo: {
      id: 'echo', cmd: 'echo', name: 'Echo Bolt', icon: '📣', teacher: 'pip', learnTest: /^echo\s+\S/,
      blurb: 'Your basic shot. Fast, cheap, reliable.',
      real: 'echo prints whatever you give it. `echo hello` prints hello. Add > to write it into a file: `echo hi > note.txt`.',
      example: 'echo "Hello, Fedora"',
      fight: { type: 'bolt', dmg: 10, cd: 0.35, heat: 9 },
      upgrade: { id: 'echo-n', cmd: 'echo -n', cost: 30, blurb: 'no trailing newline: bolts fire 25% faster' },
    },
    ls: {
      id: 'ls', cmd: 'ls', name: 'List Scan', icon: '🔦', teacher: 'bios', learnTest: /^ls(\s|$)/,
      blurb: 'Reveals cloaked things and chips them. On the map, clears fog further out.',
      real: 'ls lists what is inside a folder. `ls -a` also shows hidden entries — names starting with a dot.',
      example: 'ls -a ~',
      fight: { type: 'scan', reveal: 4, cd: 3, heat: 15 },
      upgrade: { id: 'ls-a', cmd: 'ls -a', cost: 40, blurb: 'shows hidden entries: reveals hidden caches on the map, scan lasts 7s' },
    },
    cd: {
      id: 'cd', cmd: 'cd', name: 'Change Dash', icon: '🌀', teacher: 'grub', learnTest: /^cd(\s|$)/,
      blurb: 'Dash along the lane to dodge. On the map, fast-travel to any cleared place.',
      real: 'cd changes your current directory. `cd Documents` goes in, `cd ..` goes up, plain `cd` goes home, `cd -` jumps back.',
      example: 'cd /boot',
      fight: { type: 'dash', cd: 1.2, heat: 6 },
      upgrade: { id: 'cd-dash', cmd: 'cd -', cost: 50, needs: 'cpu', blurb: 'jump back to where you were: double dash' },
    },
  };

  const MODULES = {
    ram: { id: 'ram', name: 'RAM Stick', icon: '🟩', slots: 1, real: 'RAM is short-term memory: more of it means more programs open at once without slowing down. Here: +1 loadout slot.' },
    fan: { id: 'fan', name: 'Cooling Fan', icon: '🌬️', heatMul: 0.7, real: 'Hot chips slow themselves down (thermal throttling). Good cooling keeps them at full speed. Here: skills build 30% less heat.' },
    cpu: { id: 'cpu', name: 'CPU Core', icon: '🧠', cdMul: 0.85, real: 'Each CPU core runs its own stream of work, so more cores means more done in parallel. Here: skills recharge 15% faster.' },
    ssd: { id: 'ssd', name: 'SSD', icon: '💾', travelMul: 0.5, real: 'An SSD stores data on flash chips with no moving parts — far faster than an old spinning hard drive. Here: travel twice as fast.' },
  };

  const CREATURES = {
    glitchMite: {
      id: 'glitchMite', name: 'Glitch Mite', hp: 30, speed: 90, pattern: 'drift', cloaked: true, count: 3, weak: 'ls',
      shoots: { every: 2.4, speed: 160, dmg: 8 },
      weakText: '🔦 Cloaked — scan with ls to make them hittable, then echo them.',
      real: 'Before anything boots, firmware runs POST to check each part. Faulty hardware usually shows up as beep codes or a screen that never lights.',
    },
    loopWisp: {
      id: 'loopWisp', name: 'Loop Wisp', hp: 40, speed: 150, pattern: 'blink', cloaked: false, count: 2, weak: 'cd',
      shoots: { every: 1.8, speed: 210, dmg: 10 },
      weakText: '🌀 Teleports and fires fast — dash with cd to dodge, then hit back.',
      real: 'A broken bootloader setup can loop back to its own menu forever. The real fix is pointing GRUB at the right kernel, often from a live USB.',
    },
    bootGlitch: {
      id: 'bootGlitch', name: 'Corrupt Boot Glitch', boss: true, hp: 220, phases: 2, speed: 120, pattern: 'sweep', cloaked: true, count: 1, weak: 'ls',
      shoots: { every: 1.4, speed: 200, dmg: 10 },
      weakText: '🔦 Re-cloaks every phase — keep scanning with ls and keep firing.',
      real: 'If the boot sector or EFI partition is damaged, firmware finds nothing to start and shows "No bootable device".',
    },
    kernelWraith: {
      id: 'kernelWraith', name: 'Missing Kernel Wraith', boss: true, hp: 300, phases: 3, speed: 170, pattern: 'blink', cloaked: true, count: 1, weak: 'cd',
      shoots: { every: 1.2, speed: 230, dmg: 12 },
      weakText: '🌀🔦 Blinks and cloaks — dash with cd, scan with ls, echo it down.',
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
        'Lesson one: echo. In a real terminal it repeats whatever you tell it — `echo hello` prints hello. Thrilling, I know. Down here it’s your basic shot. Type it in.',
      ],
    },
    bios: {
      id: 'bios', name: 'Bios', title: 'Firmware guardian', color: '#ffb347',
      lines: [
        'HALT. Who goes there? …Oh. A kernel-shaped thing. You look terrible.',
        'I’m BIOS. Technically UEFI these days, but nobody can pronounce that. I’m firmware: code baked into the motherboard that runs before any operating system.',
        'My job is POST — Power-On Self-Test. Check every part is alive, find something bootable, hand over control. Simple. Normally.',
        'But Glitch Mites got in. Cloaked little pests. You can’t hit what you can’t see — so take ls. It lists what’s in a place. Type it.',
      ],
    },
    grub: {
      id: 'grub', name: 'Grub', title: 'GRand Unified Bootloader', color: '#b6ff5c',
      lines: [
        'Oh hi! Welcome to the boot menu! I’m GRUB — GRand Unified Bootloader. Yes, I’m a grub. Yes, the jokes write themselves.',
        'Firmware hands control to me. I find the Linux kernel on the disk, load it into memory, give it its settings, and press GO.',
        'Except the kernel I’m supposed to load has… gone missing. And something keeps rewriting my paths into loops.',
        'You’ll want cd — change directory. In a terminal it moves you between folders. Out here it lets you dash and fast-travel. Type it!',
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

  // Chapter 1 maps: rooms laid out left → right along the boot order; every path is a straight line.
  // `room` puts each node in a room; doors are where a path crosses between rooms; `goals` is the main route.
  const firmware = {
    id: 'firmware', name: 'Firmware Foundry', accent: '#ffb347', start: 'f0', boss: 'f12', exit: 'f13',
    goals: ['f1', 'f3', 'f5', 'f9', 'f12', 'f13'],
    rooms: [
      { id: 'power', name: 'Power-On', x: 40, y: 300, w: 290, h: 520 },
      { id: 'vault', name: 'Firmware Vault', x: 370, y: 300, w: 300, h: 520 },
      { id: 'check', name: 'Hardware Check', x: 710, y: 300, w: 340, h: 620 },
      { id: 'bus', name: 'Power Bus', x: 1090, y: 300, w: 180, h: 520 },
      { id: 'boot', name: 'Boot Sector', x: 1310, y: 400, w: 270, h: 320 },
    ],
    intro: ['Firmware Foundry. This is where a computer wakes up — before Linux, before anything. Cozy. Well, no. Dark.', 'Tap a glowing node to move. Fog hides everything we haven’t explored. Scary? A bit. Don’t worry, I’ll float right next to you. Someone has to.', 'Weird… I’m picking up a faint signal deep inside the system. Small. Penguin-shaped? Let’s boot this machine and find out.'],
    outro: ['POST complete! The firmware found a bootable disk and is handing control to the bootloader. Look at you, being useful.', '…did you feel that? A memory. Something about “Linux version 6.19”. Weird. Let’s keep moving before you get sentimental.'],
    nodes: {
      f0: n(100, 560, 'Cold Boot', 'start', undefined, { room: 'power' }),
      f1: n(240, 560, 'Power Rail', 'character', 'pip', { room: 'power' }),
      f2: n(240, 400, 'CMOS Cell', 'memory', '[    0.000000] Linux version 6.19.8-200.fc44.x86_64 (mockbuild@fedoraproject.org)', { room: 'power' }),
      f3: n(450, 560, 'Firmware Vault', 'character', 'bios', { room: 'vault' }),
      f4: n(450, 720, 'Boot ROM', 'memory', '[    0.000000] efi: EFI v2.9 by LilNux Firmware', { room: 'vault' }),
      f5: n(810, 560, 'RAM Bank', 'problem', { skill: 'ls', creature: 'glitchMite', title: 'Unchecked RAM bank', real: 'POST checks memory before boot. Looking first with ls is the same habit: inspect before you act.' }, { room: 'check' }),
      f6: n(810, 400, 'DIMM Slot', 'item', 'ram', { room: 'check' }),
      f7: n(810, 720, 'PCIe Lane', 'problem', { skill: 'ls', creature: 'glitchMite', title: 'Silent PCIe lane', real: 'Graphics cards and NVMe drives sit on PCIe lanes. On real Linux, `lspci` lists every device the kernel found there.' }, { room: 'check' }),
      f8: n(970, 720, 'Option ROM', 'memory', '[    0.000000] BIOS-provided physical RAM map:', { room: 'check' }),
      f9: n(1170, 560, 'Power Bus', 'circuit', { grid: grid(['S1 I1 L2 L0', 'I0 T0 I0 L1', 'L3 I1 L0 G3', 'T1 L2 I1 X0']) }, { room: 'bus' }),
      f10: n(1170, 400, 'ACPI Table', 'memory', '[    0.004000] ACPI: Early table checksum verification disabled', { room: 'bus' }),
      f11: n(1170, 720, 'Clock Gen', 'memory', '[    0.000000] DMI: LilNux Systems Fedora Box, BIOS 1.44 11/22/2026', { room: 'bus' }),
      f12: n(1410, 560, 'Boot Sector', 'boss', { creature: 'bootGlitch', drop: 'fan' }, { room: 'boot' }),
      f13: n(1530, 560, 'To GRUB', 'exit', undefined, { room: 'boot' }),
      f14: n(450, 400, 'Hidden Cache', 'item', { bits: 20 }, { hidden: true, room: 'vault' }),
      f15: n(970, 840, 'Hidden Cache', 'item', { bits: 25 }, { hidden: true, room: 'check' }),
    },
    edges: [['f0', 'f1'], ['f1', 'f2'], ['f1', 'f3'], ['f2', 'f14'], ['f3', 'f14'], ['f3', 'f4'], ['f3', 'f5'], ['f5', 'f6'], ['f4', 'f7'],
      ['f7', 'f8'], ['f8', 'f15'], ['f5', 'f9'], ['f9', 'f10'], ['f9', 'f11'], ['f9', 'f12'], ['f12', 'f13']],
  };

  const grubRegion = {
    id: 'grub', name: 'GRUB Gate', accent: '#b6ff5c', start: 'g0', boss: 'g12', exit: null, home: 'g13',
    goals: ['g1', 'g3', 'g8', 'g12', 'g13'],
    rooms: [
      { id: 'menu', name: 'Boot Menu', x: 40, y: 300, w: 290, h: 520 },
      { id: 'entries', name: 'Menu Entries', x: 370, y: 300, w: 300, h: 620 },
      { id: 'initramfs', name: 'initramfs', x: 710, y: 300, w: 340, h: 520 },
      { id: 'loader', name: 'Kernel Loader', x: 1090, y: 300, w: 180, h: 520 },
      { id: 'home', name: 'Home', x: 1310, y: 400, w: 270, h: 320 },
    ],
    intro: ['GRUB Gate. The bootloader’s job: find the kernel, load it, and hand over control. Basically a very fancy “start” button.', 'Somewhere past these loops is the kernel image. Try not to get lost. Again.'],
    outro: ['The kernel image is loaded and GRUB just handed over control to… wait.', 'Colonel. The log says “Run /init as init process”. That’s me — PID 1. And the thing that starts PID 1 is the kernel. Which means you’re…', '…not important right now. The machine is booting! Look — Home just came online. Someone’s waving at us. Wave back, Colonel. It’s polite.'],
    nodes: {
      g0: n(100, 560, 'Boot Menu', 'start', undefined, { room: 'menu' }),
      g1: n(240, 560, 'GRUB Shell', 'character', 'grub', { room: 'menu' }),
      g2: n(240, 400, 'grub.cfg', 'memory', '[    0.000000] Command line: BOOT_IMAGE=(hd0,gpt2)/vmlinuz-6.19.8-200.fc44.x86_64 root=UUID=4f2c9a1e-7b3d-4c55-9e0a-1d2b3c4d5e6f ro rhgb quiet', { room: 'menu' }),
      g3: n(450, 560, 'Menu Entry', 'circuit', { grid: grid(['X0 L2 L1 G3', 'L1 I1 T3 I0', 'I0 L1 T2 L3', 'S0 I1 L0 T0']) }, { room: 'entries' }),
      g4: n(240, 720, 'Loop Path', 'problem', { skill: 'cd', creature: 'loopWisp', title: 'Endless boot loop', real: 'Like cd taking you to the right folder, the real fix for a boot loop is pointing the bootloader at the right kernel path — usually by fixing its menu entries or picking another kernel.' }, { room: 'menu' }),
      g5: n(450, 400, 'Kernel Image', 'memory', '[    0.000000] Kernel command line: BOOT_IMAGE=(hd0,gpt2)/vmlinuz-6.19.8-200.fc44.x86_64 root=UUID=4f2c9a1e-7b3d-4c55-9e0a-1d2b3c4d5e6f ro rhgb quiet', { room: 'entries' }),
      g6: n(450, 720, 'Spare Core', 'item', 'cpu', { room: 'entries' }),
      g7: n(810, 560, 'initramfs', 'memory', '[    0.982114] Freeing initrd memory: 38912K', { room: 'initramfs' }),
      g8: n(810, 400, 'Fallback Loop', 'problem', { skill: 'cd', creature: 'loopWisp', title: 'Fallback entry stuck in a loop', real: 'Fedora keeps older kernels as fallback menu entries. If the newest one breaks, you can boot an older one and fix things from there.' }, { room: 'initramfs' }),
      g9: n(810, 720, 'Root Bridge', 'circuit', { grid: grid(['S2 T1 I0 L1 X0', 'L0 I1 L2 L3 I1', 'I0 L2 I0 T0 L0', 'L1 T2 L0 I1 G3']) }, { room: 'initramfs' }),
      g10: n(1170, 400, 'Kernel Params', 'memory', '[    0.412345] Memory: 15981232K/16642560K available', { room: 'loader' }),
      g11: n(1170, 720, 'Root UUID', 'memory', '[    1.204561] Run /init as init process', { room: 'loader' }),
      g12: n(1170, 560, 'Kernel Handoff', 'boss', { creature: 'kernelWraith', drop: 'ssd' }, { room: 'loader' }),
      g13: n(1450, 560, 'Home', 'character', 'liltux', { room: 'home' }),
      g14: n(100, 400, 'Hidden Cache', 'item', { bits: 30 }, { hidden: true, room: 'menu' }),
      g15: n(450, 860, 'Hidden Cache', 'item', { bits: 30 }, { hidden: true, room: 'entries' }),
    },
    edges: [['g0', 'g1'], ['g1', 'g2'], ['g2', 'g14'], ['g1', 'g3'], ['g3', 'g5'], ['g1', 'g4'], ['g4', 'g6'], ['g6', 'g15'],
      ['g3', 'g7'], ['g7', 'g8'], ['g7', 'g9'], ['g8', 'g10'], ['g9', 'g11'], ['g10', 'g12'], ['g11', 'g12'], ['g12', 'g13']],
  };

  const TASKS = {
    'bios-check': { id: 'bios-check', giver: 'bios', text: 'Run POST on every part: clear all problems in the Foundry', goal: { type: 'clearKind', region: 'firmware', kind: 'problem' }, bits: 25 },
    'grub-memories': { id: 'grub-memories', giver: 'grub', text: 'Recover all 5 boot memories at the Gate', goal: { type: 'memories', region: 'grub', count: 5 }, bits: 25 },
    'pip-clean': { id: 'pip-clean', giver: 'pip', text: 'Win 3 clean fixes (no fight)', goal: { type: 'clean', count: 3 }, bits: 30 },
  };

  CK.World = { SKILLS, MODULES, CREATURES, CHARACTERS, REGIONS: [firmware, grubRegion], TASKS, grid };
})(typeof window !== 'undefined' ? window : globalThis);
