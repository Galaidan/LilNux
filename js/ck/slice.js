/* Colonel Kernel — action slice: one Training Room to playtest the new movement and combat.
 * Self-contained: reads player.kid only, never reads or writes the Adventure save. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});
  let cur = null;

  const LINES = {
    intro: '<b>Pip:</b> Training Room. Three Glitch Mites, all cloaked. Light them up with <code>ls</code>, then <code>kill</code>. A red <b>!</b> means a lunge is coming: <code>trap</code> it.',
    parry: '<b>Pip:</b> Caught it! <code>trap</code> grabs a signal and runs your handler instead. Smug looks good on you.',
    sigkill: '<b>Pip:</b> That one was SIGKILL — <code>trap</code> can’t catch signal 9 (or SIGSTOP). Nobody can. Dodge it.',
    clear: '<b>Pip:</b> Room clear! Press ↻ to go again.',
    clean: '<b>Pip:</b> Room clear — no hits. That’s a clean fix. Press ↻ to go again.',
    lose: '<b>Pip:</b> Stability lost — rebooting the room. You’ve got this.',
  };
  const HINT_KEYS = '<b>WASD</b> move · <b>J</b>/click <code>kill</code> · <b>K</b>/right-click <code>trap</code> · <b>Space</b> dash · <b>1</b> <code>echo</code> · <b>2</b> <code>ls</code>';
  const HINT_TOUCH = 'Left thumb: move · <b>⚔</b> <code>kill</code> · <b>🛡</b> <code>trap</code> · <b>»</b> dash · <b>📣</b> <code>echo</code> · <b>🔦</b> <code>ls</code>';
  const TOOLS = ['echo', 'ls'];

  CK.openSlice = function (h) {
    CK.closeSlice();
    if (CK.close) CK.close();
    const player = h.player || {};
    const host = document.createElement('div'); host.id = 'ck-slice';
    host.innerHTML = `
      <canvas class="ck-pix" aria-label="Colonel Kernel training room"></canvas>
      <div class="ck-shud">
        <div class="ck-sbar">Stability<div class="ck-ssegs" role="img" aria-label="Stability"></div></div>
        <div class="ck-sbar">Heat<div class="ck-sheat" role="img" aria-label="Heat"><b></b></div></div>
        <span class="ck-tool" data-tool="echo" role="img" aria-label="echo ready"><kbd>1</kbd> echo</span>
        <span class="ck-tool" data-tool="ls" role="img" aria-label="ls ready"><kbd>2</kbd> ls</span>
        <span class="ck-spacer"></span>
        <button type="button" class="ck-sbtn" data-sl="reset" title="Reset the room">↻</button>
        <button type="button" class="ck-sbtn" data-sl="exit" title="Back to the menu">✕</button>
      </div>
      <div class="ck-pipline" aria-live="polite"></div>
      <div class="ck-shint"><span></span><button type="button" class="ck-sbtn" data-sl="hint" aria-label="Hide controls">✓</button></div>
      <div class="ck-rotate"><div class="ph"></div><p><b>Turn your phone sideways to play.</b></p><p>The Adventure is played in landscape.</p><button type="button" class="ck-sbtn" data-sl="exit">Back to menu</button></div>`;
    (h.root || document.body).appendChild(host);
    document.body.classList.add('ck-open');


    // Anything that throws during setup tears the room down and returns to the menu, never a dead overlay.
    const parts = { timers: [], intervals: [], offs: [] };
    cur = { host, engine: null, input: null, cleanup() {
      parts.timers.forEach((f) => f()); parts.intervals.forEach((id) => clearInterval(id)); parts.offs.forEach((f) => f());
    } };
    try { setup(h, host, player, parts); }
    catch (err) {
      console.error('[CK] action room failed to start', err);
      try { CK.closeSlice(); } catch (e) { host.remove(); document.body.classList.remove('ck-open'); cur = null; }
      if (h.onExit) h.onExit();
    }
  };

  function setup(h, host, player, parts) {
    const canvas = host.querySelector('.ck-pix');
    const engine = cur.engine = CK.PixEngine.create(canvas);
    const room = CK.Rooms.parse(CK.Rooms.TRAINING);
    let seed = (Date.now() % 100000) + 1;
    const newSim = () => CK.Action.create({ room, kid: !!player.kid, seed: seed++, tools: TOOLS });
    let sim = newSim();
    const input = cur.input = CK.Input.create({ canvas, host, toBuffer: engine.toBuffer, touch: false });
    input.setTools(TOOLS);
    const firsts = {}; const events = [];
    let resetTimer = 0; let sayTimer = 0;
    parts.timers.push(() => { clearTimeout(resetTimer); clearTimeout(sayTimer); });

    const pipEl = host.querySelector('.ck-pipline');
    // Pip's line clears itself so it doesn't cover the room for long on a phone
    const say = (html) => { pipEl.innerHTML = html || ''; clearTimeout(sayTimer); if (html) sayTimer = setTimeout(() => { pipEl.innerHTML = ''; }, 9000); };
    const sound = (k) => { try { if (h.sound && h.sound[k] && (!h.soundOn || h.soundOn())) h.sound[k](); } catch (e) { /* ignore */ } };

    // ---- pause: behind the rotate screen, or while the window isn't focused ----
    const portrait = root.matchMedia ? root.matchMedia('(orientation: portrait) and (pointer: coarse)') : null;
    let away = false; let wasPaused = false;
    const paused = () => {
      const p = away || !!(portrait && portrait.matches);
      if (p && !wasPaused) input.clear();
      wasPaused = p; return p;
    };
    const onBlur = () => { away = true; input.clear(); };
    const onFocus = () => { away = false; };
    root.addEventListener('blur', onBlur); root.addEventListener('focus', onFocus);
    host.addEventListener('pointerdown', onFocus);
    parts.offs.push(() => { root.removeEventListener('blur', onBlur); root.removeEventListener('focus', onFocus); });

    function onEvent(ev) {
      if (events.length > 200) events.splice(0, 100);
      events.push(ev.type);
      switch (ev.type) {
        case 'hit': case 'kill': sound('good'); break;
        case 'hurt': sound('bad'); break;
        case 'parry': case 'dash': case 'reveal': sound('pop'); break;
        default: break;
      }
      if (ev.type === 'parry' && !firsts.parry) { firsts.parry = true; say(LINES.parry); }
      if (ev.type === 'sigkill' && !firsts.sigkill) { firsts.sigkill = true; say(LINES.sigkill); }
      if (ev.type === 'clear') { sound('win'); say(sim.clean ? LINES.clean : LINES.clear); }
      if (ev.type === 'lose') { sound('bad'); say(LINES.lose); clearTimeout(resetTimer); resetTimer = setTimeout(() => { if (cur) reset(); }, 1600); }
    }
    const scene = CK.RoomScene.create({ engine, input, sim, room, accent: '#ffb347', onEvent, paused });
    engine.setScene(scene); engine.start();

    function reset() {
      clearTimeout(resetTimer);
      sim = newSim(); scene.setSim(sim); input.clear(); say(LINES.intro);
    }

    // ---- HUD ----
    const segs = host.querySelector('.ck-ssegs'); segs.innerHTML = '<i></i>'.repeat(10);
    const heat = host.querySelector('.ck-sheat'); const heatBar = heat.querySelector('b');
    const T = CK.Action.TUNING;
    const chips = TOOLS.map((id) => ({ id, el: host.querySelector(`.ck-shud [data-tool=${id}]`), pad: host.querySelector(`.ck-tbtn-${id}`), full: id === 'ls' ? T.LS_CD : T.ECHO_CD, last: -1 }));
    function hud() {
      const P = sim.player; const on = Math.ceil((P.stability / P.maxStability) * 10);
      segs.querySelectorAll('i').forEach((el, i) => el.classList.toggle('on', i < on));
      segs.classList.toggle('low', on <= 3);
      segs.setAttribute('aria-label', `Stability ${Math.round(P.stability)} of ${P.maxStability}`);
      const hot = sim.time < P.overheatUntil;
      heatBar.style.width = Math.round(P.heat) + '%'; heat.classList.toggle('hot', hot);
      heat.setAttribute('aria-label', hot ? 'Overheated' : `Heat ${Math.round(P.heat)} percent`);
      const lock = hot ? (P.overheatUntil - sim.time) / T.OVERHEAT_LOCK : 0;
      for (const c of chips) {
        const cd = Math.round(Math.min(1, Math.max(lock, (sim.cooldowns[c.id] || 0) / c.full)) * 100) / 100;
        if (cd === c.last) continue;
        c.last = cd;
        c.el.style.setProperty('--cd', cd); if (c.pad) c.pad.style.setProperty('--cd', cd);
        c.el.classList.toggle('busy', cd > 0);
        c.el.setAttribute('aria-label', `${c.id} ${cd > 0 ? (hot ? 'locked: overheated' : 'recharging') : 'ready'}`);
      }
    }
    parts.intervals.push(setInterval(hud, 100)); hud();

    const hint = host.querySelector('.ck-shint');
    const touchy = !host.querySelector('.ck-touchpad').hidden;
    hint.querySelector('span').innerHTML = touchy ? HINT_TOUCH : HINT_KEYS;
    function onFirstTouch(e) { if (e.pointerType === 'touch') hint.querySelector('span').innerHTML = HINT_TOUCH; }
    root.addEventListener('pointerdown', onFirstTouch);
    parts.offs.push(() => root.removeEventListener('pointerdown', onFirstTouch));

    host.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sl]'); if (!b) return;
      if (b.dataset.sl === 'exit') { CK.closeSlice(); if (h.onExit) h.onExit(); }
      else if (b.dataset.sl === 'reset') { reset(); b.blur(); }
      else if (b.dataset.sl === 'hint') hint.hidden = true;
    });

    say(LINES.intro);
    if (CK.PixEngine.debug) {
      CK._test = CK._test || {};
      CK._test.slice = { engine, input, scene, events, reset, get sim() { return sim; } };
    }
  }

  CK.closeSlice = function () {
    if (!cur) return;
    const c = cur; cur = null;
    try { c.cleanup(); } finally {
      if (c.engine) c.engine.destroy();
      if (c.input) c.input.destroy();
      c.host.remove();
      document.body.classList.remove('ck-open');
      if (CK._test) CK._test.slice = null;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
