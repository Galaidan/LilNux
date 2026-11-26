/* Colonel Kernel — HTML overlays: HUD, action bar, Pip panel, dialogue, learning terminal, modals. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const code = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
  const SLOTS = [['ram', 'RAM'], ['cpu', 'CPU'], ['fan', 'FAN'], ['ssd', 'SSD'], ['gpu', 'GPU'], ['nic', 'NIC']];

  function create(rootEl, h) {
    const W = CK.World; const R = CK.Rules;
    rootEl.classList.add('ck-ui');
    rootEl.innerHTML = '<div class="ck-hud"></div><div class="ck-act" hidden></div><div class="ck-layer"></div><div class="ck-toasts" aria-live="polite"></div>'
      + '<div class="ck-prompt" hidden></div><div class="ck-bossbar" hidden><b></b><div role="img"><i></i></div></div>'
      + '<div class="ck-rotate"><div class="ph"></div><p><b>Turn your phone sideways to play.</b></p><p>The Adventure is played in landscape.</p><button type="button" class="ck-btn" data-ck="exit">Back to menu</button></div>';
    const $ = (s) => rootEl.querySelector(s);
    const ui = { selected: null, combatText: '', pipTab: null, mode: 'map', unread: 0 };
    let sayState = null;

    // ------------------------------------------------------------ message log (everything said or shown)
    function appendLog(ol, e) {
      const li = document.createElement('li'); li.className = 'k-' + e.kind;
      li.innerHTML = (e.who ? `<b>${esc(e.who)}</b> ` : '') + `<span>${e.html}</span>`;
      ol.appendChild(li); ol.scrollTop = ol.scrollHeight;
    }
    function record(kind, who, html) {
      const e = { who: who || '', kind, html: String(html), at: Date.now() };
      const st = h.getState && h.getState();
      if (st && Array.isArray(st.log)) { st.log.push(e); if (st.log.length > 150) st.log.splice(0, st.log.length - 150); }
      const panel = $('.ck-log');
      if (panel) appendLog(panel.querySelector('ol'), e);
      else { ui.unread++; const b = $('.ck-unread'); if (b) { b.textContent = ui.unread; b.hidden = false; } }
    }
    ui.record = record;
    ui.openLog = function () {
      if ($('.ck-log')) return;
      const box = document.createElement('aside'); box.className = 'ck-log'; box.setAttribute('aria-label', 'Message log');
      box.innerHTML = '<header><b>💬 Message log</b><button class="ck-btn" data-ck="closelog" aria-label="Close message log" title="Close the message log">✕</button></header><ol></ol>';
      $('.ck-layer').appendChild(box);
      const st = h.getState && h.getState(); const ol = box.querySelector('ol');
      ((st && st.log) || []).forEach((e) => appendLog(ol, e));
      if (!ol.children.length) ol.innerHTML = '<li class="k-system"><span>No messages yet.</span></li>';
      ui.unread = 0; const b = $('.ck-unread'); if (b) b.hidden = true;
    };
    ui.closeLog = function () { const l = $('.ck-log'); if (l) l.remove(); };

    // ------------------------------------------------------------ HUD
    ui.hud = function (state, opts) {
      opts = opts || {};
      const reg = R.region(state.region);
      const mems = W.REGIONS.reduce((n, r) => n + Object.values(r.nodes).filter((x) => x.kind === 'memory').length, 0);
      $('.ck-hud').innerHTML = `
        <div class="ck-hud-left">
          <span class="ck-mode">🎮 Adventure</span>
          <span class="ck-region" style="--acc:${reg.accent}"><i></i>${esc(reg.name)}</span>
          <span class="ck-stat" title="Bits"><b>${state.bits}</b> bits</span>
          <span class="ck-stat" title="Memory fragments"><b>${state.memories.length}</b>/${mems} memories</span>
        </div>
        <div class="ck-hud-right">
          ${opts.canRest ? '<button class="ck-btn" data-ck="rest" aria-label="Rest (systemctl suspend)" title="Rest — systemctl suspend">💤 Rest</button>' : ''}
          <button class="ck-btn ck-logbtn" data-ck="log" aria-label="Message log" title="Message log">💬<b class="ck-unread" ${ui.unread ? '' : 'hidden'}>${ui.unread}</b></button>
          <button class="ck-btn ck-pipbtn" data-ck="pip" aria-label="Open Pip" title="Pip’s panel: quests, items, map and tasks"><span class="ck-orb"></span><span>Pip</span></button>
          <button class="ck-btn" data-ck="exit" aria-label="Leave the adventure" title="Back to choose a mode">✕</button>
        </div>`;
      layoutHud();
    };
    // The top HUD can wrap onto two rows on a narrow screen: the action bar sits below wherever it ends.
    function layoutHud() {
      const hud = $('.ck-hud'); if (!hud) return;
      const items = hud.querySelectorAll('.ck-hud-left > *, .ck-hud-right > *'); let bottom = 0;
      items.forEach((e) => { bottom = Math.max(bottom, e.getBoundingClientRect().bottom); });
      if (bottom) rootEl.style.setProperty('--hud-h', Math.ceil(bottom) + 'px');
    }
    root.addEventListener('resize', layoutHud);
    // iOS only shows :active (the pressed look) when the page listens for touches
    const noop = () => {}; document.addEventListener('touchstart', noop, { passive: true });

    // ------------------------------------------------------------ action HUD (rooms): stability, heat, tool chips
    const inFight = () => !!(h.inFight && h.inFight());
    let chips = [];
    ui.action = function (show) {
      const el = $('.ck-act'); el.hidden = !show;
      if (!show) return;
      const st = h.getState(); const tools = st.equipped.filter((id) => R.TOOLS.includes(id));
      el.innerHTML = '<div class="ck-sbar">Stability<div class="ck-ssegs" role="img" aria-label="Stability">' + '<i></i>'.repeat(10) + '</div></div>'
        + '<div class="ck-sbar">Heat<div class="ck-sheat" role="img" aria-label="Heat"><b></b></div></div>'
        + tools.map((id, i) => `<span class="ck-tool" data-tool="${id}" role="img" aria-label="${id} ready"><kbd>${i + 1}</kbd> ${esc(id)}</span>`).join('');
      chips = tools.map((id) => ({ id, el: el.querySelector(`[data-tool="${id}"]`), last: -1 }));
    };
    // A boss's health: its name and a bar split at each phase, in the HTML overlay.
    let bossKey = '';
    function bossBar(sim) {
      const box = $('.ck-bossbar'); const e = sim && !sim.outcome && (sim.enemies || []).find((x) => x.boss && !x.dead);
      if (!e) { box.hidden = true; bossKey = ''; return; }
      const c = W.CREATURES[e.kind]; const hp = Math.max(0, Math.ceil(e.hp)); const key = e.kind + hp;
      box.hidden = false; if (key === bossKey) return; bossKey = key;
      box.querySelector('b').textContent = c.name;
      const bar = box.querySelector('[role=img]'); bar.setAttribute('aria-label', `${c.name}: health ${hp} of ${e.maxHp}`);
      bar.style.setProperty('--hp', (hp / e.maxHp).toFixed(3)); bar.style.setProperty('--phases', e.phases || 1);
    }
    ui.actionTick = function (sim) {
      bossBar(sim);
      const el = $('.ck-act'); if (!sim || el.hidden) return;
      const T = CK.Action.TUNING; const P = sim.player;
      const segs = el.querySelector('.ck-ssegs'); const on = Math.ceil((P.stability / P.maxStability) * 10);
      segs.querySelectorAll('i').forEach((x, i) => x.classList.toggle('on', i < on));
      segs.classList.toggle('low', on <= 3);
      segs.setAttribute('aria-label', `Stability ${Math.round(P.stability)} of ${P.maxStability}`);
      const hot = sim.time < P.overheatUntil; const heat = el.querySelector('.ck-sheat');
      heat.querySelector('b').style.width = Math.round(P.heat) + '%'; heat.classList.toggle('hot', hot);
      heat.setAttribute('aria-label', hot ? 'Overheated' : `Heat ${Math.round(P.heat)} percent`);
      const lock = hot ? (P.overheatUntil - sim.time) / T.OVERHEAT_LOCK : 0;
      const full = { echo: T.ECHO_CD, ls: T.LS_CD };
      for (const c of chips) {
        const cd = Math.round(Math.min(1, Math.max(lock, full[c.id] ? (sim.cooldowns[c.id] || 0) / full[c.id] : 0)) * 100) / 100;
        if (cd === c.last) continue;
        c.last = cd; c.el.style.setProperty('--cd', cd);
        const pad = rootEl.ownerDocument.querySelector(`.ck-tbtn-${c.id}`); if (pad) pad.style.setProperty('--cd', cd);
        c.el.classList.toggle('busy', cd > 0);
        c.el.setAttribute('aria-label', `${c.id} ${cd > 0 ? (hot ? 'locked: overheated' : 'recharging') : 'ready'}`);
      }
    };
    // "E · Talk to Bios" near something you can use (keyboard players; phones get the ✋ button).
    ui.prompt = function (text) {
      const p = $('.ck-prompt'); p.hidden = !text;
      if (text) p.innerHTML = `<kbd>E</kbd> ${esc(text)}`;
    };

    // ------------------------------------------------------------ dialogue
    const PORTRAIT = { colonel: 'colonel_down_0', pip: 'pip', bios: 'bios', grub: 'grub', liltux: 'liltux' };
    function portrait(speaker) {
      const c = document.createElement('canvas'); const dpr = Math.min(root.devicePixelRatio || 1, 2);
      c.width = 72 * dpr; c.height = 72 * dpr; c.className = 'ck-portrait';
      const x = c.getContext('2d');
      const key = PORTRAIT[speaker] || 'colonel_down_0';
      { // pixel art, whole-number scale, no smoothing
        const b = CK.Sprites.built()[key];
        const k = Math.max(1, Math.floor(Math.min((64 * dpr) / b.w, (64 * dpr) / b.h)));
        x.imageSmoothingEnabled = false;
        x.drawImage(b.img, Math.round((c.width - b.w * k) / 2), Math.round((c.height - b.h * k) / 2), b.w * k, b.h * k);
        return c;
      }
      return c;
    }
    ui.say = function (speaker, lines) {
      return new Promise((resolve) => {
        if (sayState) sayState.finish();
        const ch = W.CHARACTERS[speaker] || { name: 'Colonel Kernel', title: 'Amnesiac. Probably important.', color: '#38f2ff' };
        const box = document.createElement('div');
        box.className = 'ck-say'; box.style.setProperty('--acc', ch.color);
        box.innerHTML = `<div class="ck-say-who"></div><div class="ck-say-body"><div class="ck-say-name">${esc(ch.name)} <small>${esc(ch.title)}</small></div><p></p>
          <div class="ck-say-actions"><button class="ck-btn" data-ck="speak" aria-label="Read aloud" title="Read this line aloud">🔊</button><button class="ck-btn ck-primary" data-ck="next" title="Next line (Enter)">Next ▶</button></div></div>`;
        box.querySelector('.ck-say-who').appendChild(portrait(speaker));
        $('.ck-layer').appendChild(box);
        let i = 0;
        const show = () => {
          box.querySelector('p').innerHTML = code(lines[i]);
          record('say', ch.name, code(lines[i]));
          box.querySelector('[data-ck=next]').textContent = i === lines.length - 1 ? 'Got it ✓' : 'Next ▶';
        };
        sayState = {
          next() { i++; if (i >= lines.length) sayState.finish(); else show(); },
          speak() { h.speak(lines[i].replace(/`/g, '')); },
          finish() { box.remove(); sayState = null; resolve(); },
        };
        show();
      });
    };
    function onKey(e) {
      if (!sayState) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if ((e.key === 'Enter' || e.key === ' ') && tag !== 'BUTTON' && tag !== 'INPUT') { e.preventDefault(); e.stopPropagation(); sayState.next(); }
    }
    document.addEventListener('keydown', onKey);

    // ------------------------------------------------------------ Pip panel
    function canBuy(state, upId) { return R.buyUpgrade(CK.State.clone(state), upId); }
    function upButton(state, u, locked) {
      if (state.upgrades.includes(u.id)) return `<span class="ck-owned">✓ <code>${esc(u.cmd)}</code></span>`;
      const cb = canBuy(state, u.id);
      const why = { bits: `need ${u.cost} bits`, needs: u.needs ? `needs ${W.MODULES[u.needs] ? W.MODULES[u.needs].name : u.needs}` : 'locked' }[cb.reason] || '';
      return `<button class="ck-btn ck-up" data-buy="${u.id}" ${cb.ok && !locked ? '' : 'disabled'} title="${esc(u.blurb)}">⬆ <code>${esc(u.cmd)}</code> · ${u.cost}b${why ? `<small>${why}</small>` : ''}</button>`;
    }
    function tabItems(state) {
      const st = R.stats(state); const locked = inFight();
      const count = (id) => state.modules.filter((m) => m === id).length;
      const board = SLOTS.map(([id, label]) => {
        const m = W.MODULES[id]; const n = count(id);
        return `<div class="ck-slot ${n ? 'on' : ''}" data-slot="${id}" title="${n ? esc(m.real) : 'Empty slot'}"><b>${label}</b><span>${n ? `${m.icon} ${esc(m.name)}${n > 1 ? ' ×' + n : ''}` : '—'}</span></div>`;
      }).join('');
      const moves = R.MOVES.filter((id) => state.learned.includes(id)).map((id) => {
        const s = W.SKILLS[id];
        return `<div class="ck-skillrow"><span class="i">${s.icon}</span><div><b>${esc(s.name)}</b> <code>${esc(s.cmd)}</code> <span class="ck-dim">· always on</span><small>${esc(s.blurb)}</small></div>
          ${s.upgrade ? upButton(state, s.upgrade, locked) : ''}</div>`;
      }).join('') + '<div class="ck-skillrow"><span class="i">»</span><div><b>Dash</b> <span class="ck-dim">· always on</span><small>Space / Shift, or the » button. You can’t be hit mid-dash.</small></div></div>';
      const controls = '<p class="ck-dim">WASD or the left thumb to move · J / click: <code>kill</code> · K / right-click: <code>trap</code> · Space: dash · 1–3: tools · E: talk / use · L or ◎: lock on · Q: next target</p>';
      const tools = (locked ? '<p class="ck-dim">⏸ Creatures are awake. Change your loadout once the room is clear.</p>' : '') + R.TOOLS.filter((id) => state.learned.includes(id)).map((id) => {
        const s = W.SKILLS[id]; const on = state.equipped.includes(id);
        return `<div class="ck-skillrow"><span class="i">${s.icon}</span><div><b>${esc(s.name)}</b> <code>${esc(s.upgrade && state.upgrades.includes(s.upgrade.id) ? s.upgrade.cmd : s.cmd)}</code><small>${esc(s.blurb)}</small></div>
          ${on ? `<button class="ck-btn" data-unequip="${id}" ${locked ? 'disabled' : ''} title="Take ${esc(s.cmd)} out of a tool slot">Unequip</button>` : `<button class="ck-btn" data-equip="${id}" ${locked || state.equipped.length >= st.slots ? 'disabled' : ''} title="Put ${esc(s.cmd)} in a tool slot">Equip</button>`}
          ${s.upgrade ? upButton(state, s.upgrade, locked) : ''}</div>`;
      }).join('');
      const codex = state.codex.map((id) => { const s = W.SKILLS[id]; return `<li><code>${esc(s.cmd)}</code> — ${code(s.real)}<br><span class="ck-dim">Try in a real terminal:</span> <code>${esc(s.example)}</code></li>`; }).join('') || '<li class="ck-dim">Learn a command to fill your codex.</li>';
      return `<p class="ck-bits"><b>${state.bits}</b> bits · ${state.equipped.length}/${st.slots} tool slots</p>
        <h3>Moves</h3>${moves || '<p class="ck-dim">Pip will teach you to fight.</p>'}${controls}
        <h3>Tools</h3>${tools || '<p class="ck-dim">No tools yet.</p>'}
        <h3>Motherboard</h3><div class="ck-board">${board}</div>
        <h3>Codex</h3><ul class="ck-codex">${codex}</ul>`;
    }
    // ------------------------------------------------------------ Pip's map
    const MAP_ICON = { start: '⌂', character: '☺', problem: '⚠', circuit: '⚡', item: '◆', memory: '✦', boss: '☠', exit: '➜' };
    const MAP_KEY = [['⌂', 'Start · safe room'], ['☺', 'Someone to talk to · safe room'], ['⚠', 'Problem room'], ['⚡', 'Broken circuit'], ['◆', 'Item'], ['✦', 'Memory'], ['☠', 'Boss'], ['➜', 'Way onward']];
    function tabMap(state) {
      const reg = R.region(state.region); const cells = reg.cells || {};
      const ids = Object.keys(cells); if (!ids.length) return '<p class="ck-dim">No map here.</p>';
      const cols = 1 + Math.max(...ids.map((id) => cells[id][0])); const rows = 1 + Math.max(...ids.map((id) => cells[id][1]));
      const ex = state.explored[state.region] || [];
      const at = {}; ids.forEach((id) => { at[cells[id].join(',')] = id; });
      let html = '';
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const id = at[x + ',' + y];
        if (!id) { html += '<div class="empty" aria-hidden="true"></div>'; continue; }
        const n = reg.nodes[id]; const here = id === state.node; const lit = here || R.isCleared(state, id); const seen = ex.includes(id);
        const cls = [lit ? 'lit' : seen ? 'dim' : '', here ? 'here' : ''].join(' ').trim();
        const label = !seen && !lit ? 'Unexplored' : `${n.label} — ${here ? 'you are here' : lit ? (n.kind === 'problem' || n.kind === 'boss' ? 'fixed' : 'visited') : 'not visited yet'}`;
        html += `<div class="${cls}" data-node="${id}" role="img" aria-label="${esc(label)}" title="${esc(label)}">${lit || seen ? MAP_ICON[n.kind] || '' : ''}</div>`;
      }
      return `<div class="ck-map" style="grid-template-columns:repeat(${cols}, 44px)">${html}</div>
        <ul class="ck-mapkey">${MAP_KEY.map(([i, t]) => `<li><b>${i}</b>${esc(t)}</li>`).join('')}<li><b>▣</b>Bright: visited · dim: seen · dark: unknown</li></ul>`;
    }
    function tabQuests(state) {
      const reg = R.region(state.region); const boss = reg.nodes[reg.boss];
      const done = W.REGIONS.filter((r) => (state.cleared[r.id] || []).includes(r.boss));
      const unlearned = W.REGIONS.flatMap((r) => Object.values(r.nodes)).filter((n) => n.kind === 'character' && W.SKILLS[Object.keys(W.SKILLS).find((k) => W.SKILLS[k].teacher === n.ref)] && !state.learned.includes(Object.keys(W.SKILLS).find((k) => W.SKILLS[k].teacher === n.ref)));
      return `<div class="ck-quest"><b>Main quest</b><p>${(state.story && state.story.liltuxTaken) ? 'Lil Tux is missing. Something moved him while you rested. The search continues in Chapter 2…'
          : (state.story && state.story.liltuxMet) ? 'Rest with 💤 (or take a real break). Lil Tux insists.'
          : (reg.home && (state.cleared[reg.id] || []).includes(reg.boss)) ? 'The machine booted! Go <b>Home</b> and meet whoever is waving.'
          : `Restore <b>${esc(reg.name)}</b>: reach <b>${esc(boss.label)}</b> and defeat the <b>${esc(W.CREATURES[boss.ref.creature].name)}</b>.`}</p></div>
        <div class="ck-quest"><b>Who to talk to</b><p>${unlearned.length ? `Find <b>${esc(W.CHARACTERS[unlearned[0].ref].name)}</b> at <b>${esc(unlearned[0].label)}</b> to learn a new skill.` : 'You’ve met everyone in this chapter.'}</p></div>
        <div class="ck-quest"><b>Restored</b><p>${done.length ? done.map((r) => '✓ ' + esc(r.name)).join('<br>') : 'Nothing yet. The machine is still dark.'}</p></div>
        <div class="ck-quest"><b>Memories</b><p>${state.memories.length ? state.memories.slice(-3).map((m) => `<code>${esc(m)}</code>`).join('<br>') : 'None recovered yet. Look for violet ✦ crystals.'}</p></div>`;
    }
    function tabTasks(state) {
      return Object.values(W.TASKS).map((t) => {
        const p = R.taskProgress(state, t.id); const claimed = state.tasksDone.includes(t.id);
        return `<div class="ck-quest ${claimed ? 'done' : ''}"><b>${esc(W.CHARACTERS[t.giver].name)}</b><p>${esc(t.text)}</p><span class="ck-prog">${claimed ? '✓ done' : `${p.done}/${p.need}`} · +${t.bits} bits</span></div>`;
      }).join('');
    }
    ui.pip = function (tab) {
      ui.pipTab = tab || ui.pipTab || 'quests';
      const state = h.getState();
      let panel = $('.ck-pip');
      if (!panel) { panel = document.createElement('aside'); panel.className = 'ck-pip'; $('.ck-layer').appendChild(panel); }
      const tabs = [['quests', '📜 Quests', 'What to do next, and where'], ['items', '🎒 Items', 'Moves, tools, motherboard, upgrades and your command codex'], ['map', '🗺 Map', 'Rooms we’ve visited and seen'], ['tasks', '✅ Tasks', 'Side jobs from the characters you meet']];
      if (!tabs.some(([id]) => id === ui.pipTab)) ui.pipTab = 'quests';
      const body = { quests: tabQuests, items: tabItems, map: tabMap, tasks: tabTasks }[ui.pipTab](state);
      panel.innerHTML = `<header><span class="ck-orb big"></span><div><b>Pip</b><small>PID 1 · always running · mildly judgmental</small></div><button class="ck-btn" data-ck="closepip" aria-label="Close Pip" title="Close Pip’s panel">✕</button></header>
        <nav>${tabs.map(([id, l, tip]) => `<button class="ck-tab ${id === ui.pipTab ? 'on' : ''}" data-tab="${id}" title="${tip}">${l}</button>`).join('')}</nav>
        <div class="ck-pip-body">${body}</div>`;
    };
    ui.closePip = function () { const p = $('.ck-pip'); if (p) p.remove(); ui.pipTab = null; };
    ui.pipOpen = () => !!$('.ck-pip');

    // ------------------------------------------------------------ learning terminal
    ui.learn = function (skillId, spec) {
      return new Promise((resolve) => {
        const s = spec || W.SKILLS[skillId]; const teacher = W.CHARACTERS[s.teacher];
        const shell = new root.LilShell(h.user || 'colonel');
        const box = document.createElement('div');
        box.className = 'ck-modal ck-learn'; box.style.setProperty('--acc', teacher.color);
        box.innerHTML = `<div class="ck-card">
          <div class="ck-kicker">New skill from ${esc(teacher.name)}</div>
          <h2><span>${s.icon}</span> ${esc(s.name)} <code>${esc(s.cmd)}</code></h2>
          <p>${code(s.real)}</p>
          <p class="ck-try">Type a real <code>${esc(s.cmd)}</code> command — for example <code>${esc(s.example)}</code> — and press Enter.</p>
          <div class="ck-term"><div class="ck-term-out"></div><form class="ck-term-line"><span class="p"></span><input autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" aria-label="Type the command"></form></div>
        </div>`;
        $('.ck-layer').appendChild(box);
        const out = box.querySelector('.ck-term-out'); const input = box.querySelector('input'); const p = box.querySelector('.p');
        p.textContent = shell.prompt();
        let done = false;
        box.querySelector('form').addEventListener('submit', (e) => {
          e.preventDefault(); if (done) return;
          const v = input.value; input.value = '';
          if (v.trim()) record('you', 'You', `<code>${esc(v)}</code>`);
          const line = document.createElement('div'); line.className = 'cmd'; line.textContent = shell.prompt() + v; out.appendChild(line);
          const res = s.term ? s.term(v.trim()) : shell.run(v);
          if (res.pending) shell.cancel();
          const o = document.createElement('div'); o.innerHTML = res.html || ''; out.appendChild(o);
          p.textContent = shell.prompt();
          if (s.learnTest.test(v.trim()) && res.ok !== false) {
            done = true; h.onLearned(skillId);
            const equipped = h.getState().equipped.includes(skillId);
            const ok = document.createElement('div'); ok.className = 'ck-learned';
            ok.innerHTML = spec ? esc(spec.done) : `✅ Skill learned: <code>${esc(s.cmd)}</code> — ${equipped ? 'it’s in your tool slots and codex.' : 'it’s in your codex.'}`; out.appendChild(ok);
            setTimeout(() => { box.remove(); resolve(); }, 1100);
          } else if (v.trim()) {
            const hint = document.createElement('div'); hint.className = 'ck-dim'; hint.innerHTML = `Not quite — try <code>${esc(s.example)}</code>`; out.appendChild(hint);
          }
          out.scrollTop = out.scrollHeight;
        });
        setTimeout(() => input.focus(), 50);
      });
    };

    // ------------------------------------------------------------ choice, toast, banner
    ui.choice = function (title, options, text) {
      return new Promise((resolve) => {
        const box = document.createElement('div'); box.className = 'ck-modal ck-choice';
        box.innerHTML = `<div class="ck-card"><h2>${esc(title)}</h2>${text ? `<p>${code(text)}</p>` : ''}<div class="ck-options">${options.map((o, i) => `<button class="ck-btn ${o.primary ? 'ck-primary' : ''}" data-i="${i}" title="${esc(o.title || o.label)}">${o.html || esc(o.label)}</button>`).join('')}</div></div>`;
        box.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; box.remove(); record('you', 'You', esc(options[+b.dataset.i].label)); resolve(options[+b.dataset.i].value); });
        $('.ck-layer').appendChild(box);
        record('system', '', '❓ ' + esc(title));
      });
    };
    ui.toast = function (html) {
      record('toast', '', html);
      const t = document.createElement('div'); t.className = 'ck-toast'; t.innerHTML = html;
      $('.ck-toasts').appendChild(t);
      setTimeout(() => t.classList.add('out'), 3000); setTimeout(() => t.remove(), 3500);
    };
    ui.banner = function (title, subtitle, ms) {
      return new Promise((resolve) => {
        const b = document.createElement('div'); b.className = 'ck-banner';
        b.innerHTML = `<div><small>${esc(subtitle || '')}</small><h1>${esc(title)}</h1></div>`;
        record('system', '', `★ ${esc(title)}${subtitle ? ' — ' + esc(subtitle) : ''}`);
        $('.ck-layer').appendChild(b);
        let gone = false; const end = () => { if (gone) return; gone = true; b.remove(); resolve(); };
        b.addEventListener('click', end); setTimeout(end, ms || 2600);
      });
    };
    ui.busy = () => !!(sayState || rootEl.querySelector('.ck-modal, .ck-banner'));

    // ------------------------------------------------------------ events
    rootEl.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const d = b.dataset;
      if (d.ck === 'exit') return h.onExit();
      if (d.ck === 'rest') return h.onRest && h.onRest();
      if (d.ck === 'log') return $('.ck-log') ? ui.closeLog() : ui.openLog();
      if (d.ck === 'closelog') return ui.closeLog();
      if (d.ck === 'pip') return ui.pipOpen() ? ui.closePip() : ui.pip();
      if (d.ck === 'closepip') return ui.closePip();
      if (d.ck === 'next' && sayState) return sayState.next();
      if (d.ck === 'speak' && sayState) return sayState.speak();
      if (d.tab) return ui.pip(d.tab);
      if (d.equip) { h.onEquip(d.equip); ui.pip('items'); return; }
      if (d.unequip) { h.onUnequip(d.unequip); ui.pip('items'); return; }
      if (d.buy) { h.onBuy(d.buy); ui.pip('items'); }
    });

    ui.destroy = function () { document.removeEventListener('keydown', onKey); root.removeEventListener('resize', layoutHud); document.removeEventListener('touchstart', noop); rootEl.innerHTML = ''; rootEl.classList.remove('ck-ui'); };
    return ui;
  }

  CK.UI = { create };
})(typeof window !== 'undefined' ? window : globalThis);
