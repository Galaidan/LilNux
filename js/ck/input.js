/* Colonel Kernel — input for the action game: keyboard, mouse, and an on-screen touch stick + buttons. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const KEYS = {
    w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right',
    j: 'kill', k: 'trap', ' ': 'dash', shift: 'dash', '1': 'slot0', '2': 'slot1', '3': 'slot2', e: 'use', enter: 'use',
  };
  function mapKey(key) { return (key && KEYS[String(key).toLowerCase()]) || null; }
  // Keys 1-3 fire the tools in loadout order.
  function slotTool(list, slot) { const i = Number(String(slot).replace('slot', '')); return (list && list[i]) || null; }
  const TOOL = { echo: 1, ls: 1, cd: 1 };

  // Thumb offset -> movement vector: zero inside the dead zone, rescaled so the zone's edge is 0, clamped to length 1.
  function stickVector(dx, dy, radius, dead) {
    dead = dead === undefined ? 0.15 : dead;
    const d = Math.hypot(dx, dy) / radius;
    if (d <= dead) return { x: 0, y: 0 };
    const m = Math.min(1, (Math.min(d, 1) - dead) / (1 - dead));
    const l = Math.hypot(dx, dy);
    return { x: (dx / l) * m, y: (dy / l) * m };
  }

  const PRESS = { kill: 1, trap: 1, dash: 1, echo: 1, ls: 1, cd: 1, use: 1, slot0: 1, slot1: 1, slot2: 1 };
  const STICK_R = 40;
  const BUTTONS = [
    { act: 'kill', label: '⚔', name: 'kill — strike' },
    { act: 'trap', label: '🛡', name: 'trap — parry' },
    { act: 'dash', label: '»', name: 'dash' },
    { act: 'echo', label: '📣', name: 'echo — shoot' },
    { act: 'ls', label: '🔦', name: 'ls — light pulse' },
    { act: 'cd', label: '🌀', name: 'cd — use a terminal or sign' },
    { act: 'use', label: '✋', name: 'use' },
  ];

  function create(o) {
    const canvas = o.canvas; const host = o.host; const toBuffer = o.toBuffer;
    const held = { up: false, down: false, left: false, right: false };
    const stick = { id: null, ox: 0, oy: 0, v: { x: 0, y: 0 } };
    let presses = {}; let tool = null; let mouse = null; let lastMouseMove = -1e9;
    let tools = []; const killHold = { key: false, mouse: false, touch: false };
    const btnPointers = new Map();

    function press(act) {
      if (/^slot\d$/.test(act)) { const t = slotTool(tools, act); if (t) tool = t; } else if (TOOL[act]) tool = act; else presses[act] = true;
    }
    function clearAll() {
      held.up = held.down = held.left = held.right = false;
      killHold.key = killHold.mouse = killHold.touch = false;
      stick.id = null; stick.v = { x: 0, y: 0 }; presses = {}; tool = null; btnPointers.clear();
      if (stickEl) stickEl.hidden = true;
      if (pad) pad.querySelectorAll('.ck-tbtn.on').forEach((b) => b.classList.remove('on'));
    }

    // ---- keyboard ----
    function onKey(e) {
      const a = mapKey(e.key); if (!a) return;
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      e.preventDefault();
      if (a in held) held[a] = true;
      else if (!e.repeat && PRESS[a]) press(a);
      if (a === 'kill') killHold.key = true;
    }
    function onKeyUp(e) { const a = mapKey(e.key); if (a && a in held) held[a] = false; if (a === 'kill') killHold.key = false; }
    function onVis() { if (document.hidden) clearAll(); }

    // ---- mouse on the canvas ----
    function onCanvasDown(e) {
      if (e.pointerType !== 'mouse') return;
      if (e.button === 0) { press('kill'); killHold.mouse = true; } else if (e.button === 2) press('trap');
      mouse = toBuffer(e.clientX, e.clientY); lastMouseMove = now();
      e.preventDefault();
    }
    function onMouseUp(e) { if (e.pointerType === 'mouse' && e.button === 0) killHold.mouse = false; }
    function onCanvasMove(e) { if (e.pointerType === 'mouse') { mouse = toBuffer(e.clientX, e.clientY); lastMouseMove = now(); } }
    function onContext(e) { e.preventDefault(); }

    // ---- touch pad ----
    const pad = document.createElement('div'); pad.className = 'ck-touchpad'; pad.hidden = true;
    pad.innerHTML = '<div class="ck-stick-zone" aria-hidden="true"><div class="ck-stick" hidden><div class="ck-knob"></div></div></div>'
      + '<div class="ck-tbtns">' + BUTTONS.map((b) => `<button type="button" class="ck-tbtn ck-tbtn-${b.act}" data-act="${b.act}" aria-label="${b.name}">${b.label}</button>`).join('') + '</div>';
    host.appendChild(pad);
    const zone = pad.querySelector('.ck-stick-zone'); const stickEl = pad.querySelector('.ck-stick'); const knob = pad.querySelector('.ck-knob');

    function onZoneDown(e) {
      if (stick.id !== null) return;
      stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.v = { x: 0, y: 0 };
      stickEl.hidden = false; stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px'; knob.style.transform = '';
      try { zone.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
    }
    function onZoneMove(e) {
      if (e.pointerId !== stick.id) return;
      const dx = e.clientX - stick.ox; const dy = e.clientY - stick.oy;
      stick.v = stickVector(dx, dy, STICK_R);
      const l = Math.hypot(dx, dy); const k = l > STICK_R ? STICK_R / l : 1;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    }
    function onZoneUp(e) {
      if (e.pointerId !== stick.id) return;
      stick.id = null; stick.v = { x: 0, y: 0 }; stickEl.hidden = true;
    }
    function onBtnDown(e) {
      const b = e.target.closest('.ck-tbtn'); if (!b) return;
      e.preventDefault();
      btnPointers.set(e.pointerId, b); b.classList.add('on');
      press(b.dataset.act);
      if (b.dataset.act === 'kill') killHold.touch = true;
    }
    function onBtnUp(e) {
      const b = btnPointers.get(e.pointerId);
      if (b) { b.classList.remove('on'); btnPointers.delete(e.pointerId); if (b.dataset.act === 'kill') killHold.touch = false; }
    }
    function onAnyTouch(e) { if (e.pointerType === 'touch' && pad.hidden) pad.hidden = false; }

    const coarse = !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches);
    pad.hidden = !(o.touch || coarse);

    const L = [
      [root, 'keydown', onKey], [root, 'keyup', onKeyUp], [root, 'blur', clearAll], [document, 'visibilitychange', onVis],
      [canvas, 'pointerdown', onCanvasDown], [canvas, 'pointermove', onCanvasMove], [canvas, 'contextmenu', onContext],
      [zone, 'pointerdown', onZoneDown], [zone, 'pointermove', onZoneMove], [zone, 'pointerup', onZoneUp], [zone, 'pointercancel', onZoneUp],
      [pad, 'pointerdown', onBtnDown], [pad, 'pointerup', onBtnUp], [pad, 'pointercancel', onBtnUp], [pad, 'contextmenu', onContext],
      [root, 'pointerdown', onAnyTouch], [root, 'pointerup', onMouseUp], [root, 'pointercancel', onMouseUp],
    ];
    pad.querySelector('.ck-tbtn-use').hidden = true;
    pad.querySelector('.ck-tbtn-cd').hidden = true;
    L.forEach(([t, n, f]) => t.addEventListener(n, f, n === 'keydown' ? false : { passive: false }));

    function now() { return root.performance && performance.now ? performance.now() : Date.now(); }

    const input = {
      held, stick,
      read() {
        let mx = (held.right ? 1 : 0) - (held.left ? 1 : 0); let my = (held.down ? 1 : 0) - (held.up ? 1 : 0);
        if (stick.v.x || stick.v.y) { mx = stick.v.x; my = stick.v.y; }
        const out = { mx, my, mouse: mouse && now() - lastMouseMove < 2000 ? mouse : null,
          kill: !!presses.kill, killHeld: killHold.key || killHold.mouse || killHold.touch,
          trap: !!presses.trap, dash: !!presses.dash, use: !!presses.use, tool };
        presses = {}; tool = null;
        return out;
      },
      showTouch(on) { pad.hidden = !on; },
      // Which tools fill the slots (keys 1-3, and which touch tool buttons show).
      setTools(list) {
        tools = (list || []).slice();
        pad.querySelectorAll('.ck-tbtn-echo, .ck-tbtn-ls, .ck-tbtn-cd').forEach((b) => { b.hidden = !tools.includes(b.dataset.act); });
      },
      // The touch context button: shown with a label near something to talk to or use.
      showUse(label) {
        const b = pad.querySelector('.ck-tbtn-use'); b.hidden = !label;
        if (label) { b.setAttribute('aria-label', label); b.title = label; }
      },
      clear: clearAll,
      destroy() { L.forEach(([t, n, f]) => t.removeEventListener(n, f)); pad.remove(); },
    };
    return input;
  }

  CK.Input = { mapKey, slotTool, stickVector, create, STICK_R };
})(typeof window !== 'undefined' ? window : globalThis);
