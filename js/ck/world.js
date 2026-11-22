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
      real: 'If GRUB cannot find the kernel file (vmlinuz) in /boot, you land at a bare "grub>" prompt. Fedora keeps a few older kernels in the menu so you can boot one of those instead.',
    },
  };

  const CHARACTERS = {
    pip: {
      id: 'pip', name: 'Pip', title: 'PID 1 · your companion', color: '#38f2ff',
      lines: [
        '…boot sequence… hey. HEY. You’re awake! Everything’s dark, but you’re online. That’s a start.',
        'I’m Pip. PID 1. On Linux the very first program the kernel starts gets process ID 1, and it starts and babysits everything else. So technically I’m the first friend you ever made.',
        'You don’t remember who you are? Yeah… my memory’s scrambled too. Let’s fix this machine. Maybe it all comes back.',
        'Lesson one: echo. In a real terminal it just repeats what you tell it — `echo hello` prints hello. Down here it’s your basic shot. Type it in.',
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

  // Puzzle grids are stored SOLVED. Codes: S=source G=target I=straight L=corner T=tee X=cross .=empty, digit = rotation.
  const TYPES = { S: 'source', G: 'target', I: 'straight', L: 'corner', T: 'tee', X: 'cross', '.': 'empty' };
  function grid(rows) {
    const cells = rows.map((row) => row.split(' ').map((c) => ({ t: TYPES[c[0]], r: c[0] === '.' ? 0 : Number(c[1] || 0) })));
    return { rows: cells.length, cols: cells[0].length, cells };
  }

  const n = (x, y, label, kind, ref, extra) => Object.assign({ x, y, label, kind }, ref !== undefined ? { ref } : {}, extra || {});

  const firmware = {
    id: 'firmware', name: 'Firmware Foundry', accent: '#ffb347', start: 'f0', boss: 'f12', exit: 'f13',
    intro: ['Firmware Foundry. This is where a computer wakes up — before Linux, before anything.', 'Tap a glowing node to move. Fog hides everything we haven’t explored yet.'],
    outro: ['POST complete! The firmware found a bootable disk and is handing control to the bootloader.', '…did you feel that? A memory. Something about “Linux version 6.19”. Weird. Let’s keep moving.'],
    nodes: {
      f0: n(120, 520, 'Cold Boot', 'start'),
      f1: n(300, 520, 'Power Rail', 'character', 'pip'),
      f2: n(300, 300, 'CMOS Cell', 'memory', '[    0.000000] Linux version 6.19.8-200.fc44.x86_64 (mockbuild@fedoraproject.org)'),
      f3: n(500, 520, 'Firmware Vault', 'character', 'bios'),
      f4: n(480, 780, 'Boot ROM', 'memory', '[    0.000000] efi: EFI v2.9 by LilNux Firmware'),
      f5: n(700, 390, 'RAM Bank', 'problem', { skill: 'ls', creature: 'glitchMite', title: 'Unchecked RAM bank', real: 'POST checks memory before boot. Looking first with ls is the same habit: inspect before you act.' }),
      f6: n(720, 170, 'DIMM Slot', 'item', 'ram'),
      f7: n(720, 690, 'PCIe Lane', 'problem', { skill: 'ls', creature: 'glitchMite', title: 'Silent PCIe lane', real: 'Graphics cards and NVMe drives sit on PCIe lanes. On real Linux, `lspci` lists every device the kernel found there.' }),
      f8: n(900, 860, 'Option ROM', 'memory', '[    0.000000] BIOS-provided physical RAM map:'),
      f9: n(950, 520, 'Power Bus', 'circuit', { grid: grid(['S1 I1 L2 L0', 'I0 T0 I0 L1', 'L3 I1 L0 G3', 'T1 L2 I1 X0']) }),
      f10: n(1150, 320, 'ACPI Table', 'memory', '[    0.004000] ACPI: Early table checksum verification disabled'),
      f11: n(1150, 710, 'Clock Gen', 'memory', '[    0.000000] DMI: LilNux Systems Fedora Box, BIOS 1.44 11/22/2026'),
      f12: n(1330, 520, 'Boot Sector', 'boss', { creature: 'bootGlitch', drop: 'fan' }),
      f13: n(1500, 520, 'To GRUB', 'exit'),
      f14: n(560, 250, 'Hidden Cache', 'item', { bits: 20 }, { hidden: true }),
      f15: n(1060, 940, 'Hidden Cache', 'item', { bits: 25 }, { hidden: true }),
    },
    edges: [['f0', 'f1'], ['f1', 'f2'], ['f1', 'f3'], ['f3', 'f14'], ['f2', 'f14'], ['f3', 'f4'], ['f3', 'f5'], ['f3', 'f7'], ['f5', 'f6'], ['f5', 'f9'],
      ['f7', 'f8'], ['f7', 'f9'], ['f8', 'f15'], ['f9', 'f10'], ['f9', 'f11'], ['f10', 'f12'], ['f11', 'f12'], ['f12', 'f13']],
  };

  const grubRegion = {
    id: 'grub', name: 'GRUB Gate', accent: '#b6ff5c', start: 'g0', boss: 'g12', exit: 'g13',
    intro: ['GRUB Gate. The bootloader’s job: find the kernel, load it, and hand over control.', 'Somewhere past these loops is the kernel image. Let’s go get it.'],
    outro: ['The kernel image is loaded and GRUB just handed over control to… wait.', 'Colonel. The log says “Run /init as init process”. That’s me — PID 1. And the thing that starts PID 1 is the kernel. Which means you’re…', 'Chapter 1 complete: Boot Sequence restored. Next stop — the Kernel Core.'],
    nodes: {
      g0: n(110, 500, 'Boot Menu', 'start'),
      g1: n(300, 500, 'GRUB Shell', 'character', 'grub'),
      g2: n(300, 280, 'grub.cfg', 'memory', '[    0.000000] Command line: BOOT_IMAGE=(hd0,gpt2)/vmlinuz-6.19.8-200.fc44.x86_64 root=UUID=4f2c9a1e-7b3d-4c55-9e0a-1d2b3c4d5e6f ro rhgb quiet'),
      g3: n(500, 380, 'Menu Entry', 'circuit', { grid: grid(['X0 L2 L1 G3', 'L1 I1 T3 I0', 'I0 L1 T2 L3', 'S0 I1 L0 T0']) }),
      g4: n(520, 680, 'Loop Path', 'problem', { skill: 'cd', creature: 'loopWisp', title: 'Endless boot loop', real: 'cd moves you to the right place. A bootloader pointed at the wrong path just keeps circling — the fix is always “go to the right directory”.' }),
      g5: n(680, 200, 'Kernel Image', 'memory', '[    0.000000] Kernel command line: rhgb quiet'),
      g6: n(720, 860, 'Spare Core', 'item', 'cpu'),
      g7: n(760, 500, 'initramfs', 'memory', '[    0.982114] Freeing initrd memory: 38912K'),
      g8: n(950, 380, 'Fallback Loop', 'problem', { skill: 'cd', creature: 'loopWisp', title: 'Fallback entry stuck in a loop', real: 'Fedora keeps older kernels as fallback menu entries. If the newest one breaks, you can boot an older one and fix things from there.' }),
      g9: n(950, 700, 'Root Bridge', 'circuit', { grid: grid(['S2 T1 I0 L1 X0', 'L0 I1 L2 L3 I1', 'I0 L2 I0 T0 L0', 'L1 T2 L0 I1 G3']) }),
      g10: n(1150, 250, 'Kernel Params', 'memory', '[    0.412345] Memory: 15981232K/16642560K available'),
      g11: n(1150, 820, 'Root UUID', 'memory', '[    1.204561] Run /init as init process'),
      g12: n(1330, 500, 'Kernel Handoff', 'boss', { creature: 'kernelWraith', drop: 'ssd' }),
      g13: n(1500, 500, 'To the Kernel', 'exit'),
      g14: n(480, 140, 'Hidden Cache', 'item', { bits: 30 }, { hidden: true }),
      g15: n(900, 950, 'Hidden Cache', 'item', { bits: 30 }, { hidden: true }),
    },
    edges: [['g0', 'g1'], ['g1', 'g2'], ['g1', 'g3'], ['g1', 'g4'], ['g2', 'g14'], ['g3', 'g5'], ['g5', 'g14'], ['g3', 'g7'], ['g4', 'g6'], ['g4', 'g7'],
      ['g6', 'g15'], ['g7', 'g8'], ['g7', 'g9'], ['g8', 'g10'], ['g9', 'g11'], ['g10', 'g12'], ['g11', 'g12'], ['g12', 'g13']],
  };

  const TASKS = {
    'bios-check': { id: 'bios-check', giver: 'bios', text: 'Run POST on every part: clear all problems in the Foundry', goal: { type: 'clearKind', region: 'firmware', kind: 'problem' }, bits: 25 },
    'grub-memories': { id: 'grub-memories', giver: 'grub', text: 'Recover all 5 boot memories at the Gate', goal: { type: 'memories', region: 'grub', count: 5 }, bits: 25 },
    'pip-clean': { id: 'pip-clean', giver: 'pip', text: 'Win 3 clean fixes (no fight)', goal: { type: 'clean', count: 3 }, bits: 30 },
  };

  CK.World = { SKILLS, MODULES, CREATURES, CHARACTERS, REGIONS: [firmware, grubRegion], TASKS, grid };
})(typeof window !== 'undefined' ? window : globalThis);
