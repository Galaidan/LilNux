/* Colonel Kernel — HTML overlays: HUD, skill bar, Pip panel, dialogue, learning terminal, modals. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const code = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
  const SLOTS = [['ram', 'RAM'], ['cpu', 'CPU'], ['fan', 'FAN'], ['ssd', 'SSD'], ['gpu', 'GPU'], ['nic', 'NIC']];

  function create(rootEl, h) {
    const W = CK.World; const R = CK.Rules;
    rootEl.classList.add('ck-ui');
    rootEl.innerHTML = '<div class="ck-hud"></div><div class="ck-bar"></div><div class="ck-layer"></div><div class="ck-toasts" aria-live="polite"></div>';
    const $ = (s) => rootEl.querySelector(s);
    const ui = { selected: null, combatText: '', pipTab: null, mode: 'map' };
    let sayState = null;

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
          <button class="ck-btn ck-pipbtn" data-ck="pip" aria-label="Open Pip"><span class="ck-orb"></span><span>Pip</span></button>
          <button class="ck-btn" data-ck="exit" aria-label="Leave the adventure" title="Back to choose a mode">✕</button>
        </div>`;
    };

    // ------------------------------------------------------------ skill bar
    ui.skillBar = function (state, mode, fight) {
      ui.mode = mode;
      if (!state.equipped.includes(ui.selected)) ui.selected = state.equipped.find((id) => W.SKILLS[id].fight.type !== 'scan') || state.equipped[0] || null;
      const btns = state.equipped.map((id, i) => {
        const s = W.SKILLS[id]; const up = s.upgrade && state.upgrades.includes(s.upgrade.id) ? s.upgrade.cmd : s.cmd;
        return `<button class="ck-skill ${mode === 'fight' && ui.selected === id ? 'sel' : ''}" data-skill="${id}" title="${esc(s.name)}: ${esc(s.blurb)}">
          <span class="k">${i + 1}</span><span class="i">${s.icon}</span><code>${esc(up)}</code><span class="cd"></span></button>`;
      }).join('');
      $('.ck-bar').innerHTML = (state.equipped.length ? btns : '<span class="ck-hint">No skills yet — talk to Pip.</span>') +
        (mode === 'fight' ? '<div class="ck-heat" title="Heat: firing too fast overheats you"><i></i><span>HEAT</span></div>' : '');
      $('.ck-bar').classList.toggle('fight', mode === 'fight');
      if (fight) ui.tick(fight);
    };
    ui.select = function (id) { ui.selected = id; rootEl.querySelectorAll('.ck-skill').forEach((b) => b.classList.toggle('sel', b.dataset.skill === id)); };
    ui.tick = function (fight) {
      rootEl.querySelectorAll('.ck-skill').forEach((b) => {
        const id = b.dataset.skill; const total = W.SKILLS[id].fight.cd || 1;
        const left = Math.max(0, (fight.cooldowns[id] || 0) - fight.time);
        b.style.setProperty('--cd', Math.min(1, left / total).toFixed(3));
      });
      const heat = $('.ck-heat');
      if (heat) { heat.querySelector('i').style.width = Math.round(fight.heat) + '%'; heat.classList.toggle('hot', fight.time < fight.overheatedUntil); }
    };

    // ------------------------------------------------------------ dialogue
    function portrait(speaker) {
      const c = document.createElement('canvas'); const dpr = Math.min(root.devicePixelRatio || 1, 2);
      c.width = 72 * dpr; c.height = 72 * dpr; c.className = 'ck-portrait';
      const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (speaker === 'colonel') CK.Art.colonel(x, 36, 60, 0.85, 1, { reduced: true });
      else if (speaker === 'pip') CK.Art.pip(x, 36, 38, 1.7, 1);
      else if (speaker === 'liltux') CK.Art.liltux(x, 36, 34, 0.42, 1);
      else CK.Art.character(x, speaker, 40, 50, 0.8, 1);
      return c;
    }
    ui.say = function (speaker, lines) {
      return new Promise((resolve) => {
        if (sayState) sayState.finish();
        const ch = W.CHARACTERS[speaker] || { name: 'Colonel Kernel', title: 'Amnesiac. Probably important.', color: '#38f2ff' };
        const box = document.createElement('div');
        box.className = 'ck-say'; box.style.setProperty('--acc', ch.color);
        box.innerHTML = `<div class="ck-say-who"></div><div class="ck-say-body"><div class="ck-say-name">${esc(ch.name)} <small>${esc(ch.title)}</small></div><p></p>
          <div class="ck-say-actions"><button class="ck-btn" data-ck="speak" aria-label="Read aloud">🔊</button><button class="ck-btn ck-primary" data-ck="next">Next ▶</button></div></div>`;
        box.querySelector('.ck-say-who').appendChild(portrait(speaker));
        $('.ck-layer').appendChild(box);
        let i = 0;
        const show = () => {
          box.querySelector('p').innerHTML = code(lines[i]);
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
      if ((e.key === 'Enter' || e.key === ' ') && tag !== 'BUTTON' && tag !== 'INPUT') { e.preventDefault(); sayState.next(); }
    }
    document.addEventListener('keydown', onKey);

    // ------------------------------------------------------------ Pip panel
    function canBuy(state, upId) { return R.buyUpgrade(CK.State.clone(state), upId); }
    function tabItems(state) {
      const st = R.stats(state);
      const count = (id) => state.modules.filter((m) => m === id).length;
      const board = SLOTS.map(([id, label]) => {
        const m = W.MODULES[id]; const n = count(id);
        return `<div class="ck-slot ${n ? 'on' : ''}" data-slot="${id}" title="${n ? esc(m.real) : 'Empty slot'}"><b>${label}</b><span>${n ? `${m.icon} ${esc(m.name)}${n > 1 ? ' ×' + n : ''}` : '—'}</span></div>`;
      }).join('');
      const inFight = ui.mode === 'fight';
      const skills = (inFight ? '<p class="ck-dim">⏸ Fight paused. Loadout changes happen on the map, not mid-fight.</p>' : '') + state.learned.map((id) => {
        const s = W.SKILLS[id]; const on = state.equipped.includes(id);
        const u = s.upgrade; const owned = state.upgrades.includes(u.id); const cb = canBuy(state, u.id);
        const why = { bits: `need ${u.cost} bits`, needs: u.needs ? `needs ${W.MODULES[u.needs] ? W.MODULES[u.needs].name : u.needs}` : 'locked' }[cb.reason] || '';
        return `<div class="ck-skillrow">
          <span class="i">${s.icon}</span><div><b>${esc(s.name)}</b> <code>${esc(owned ? u.cmd : s.cmd)}</code><small>${esc(s.blurb)}</small></div>
          ${on ? `<button class="ck-btn" data-unequip="${id}" ${inFight ? 'disabled' : ''}>Unequip</button>` : `<button class="ck-btn" data-equip="${id}" ${inFight || state.equipped.length >= st.slots ? 'disabled' : ''}>Equip</button>`}
          ${owned ? `<span class="ck-owned">✓ <code>${esc(u.cmd)}</code></span>` : `<button class="ck-btn ck-up" data-buy="${u.id}" ${cb.ok && !inFight ? '' : 'disabled'} title="${esc(u.blurb)}">⬆ <code>${esc(u.cmd)}</code> · ${u.cost}b${why ? `<small>${why}</small>` : ''}</button>`}
        </div>`;
      }).join('') || '<p class="ck-dim">No skills learned yet.</p>';
      const codex = state.codex.map((id) => { const s = W.SKILLS[id]; return `<li><code>${esc(s.cmd)}</code> — ${code(s.real)}<br><span class="ck-dim">Try in a real terminal:</span> <code>${esc(s.example)}</code></li>`; }).join('') || '<li class="ck-dim">Learn a skill to fill your codex.</li>';
      return `<p class="ck-bits"><b>${state.bits}</b> bits · ${state.equipped.length}/${st.slots} skill slots</p>
        <h3>Motherboard</h3><div class="ck-board">${board}</div>
        <h3>Skills</h3>${skills}
        <h3>Codex</h3><ul class="ck-codex">${codex}</ul>`;
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
        <div class="ck-quest"><b>Memories</b><p>${state.memories.length ? state.memories.slice(-3).map((m) => `<code>${esc(m)}</code>`).join('<br>') : 'None recovered yet. Look for violet ✦ nodes.'}</p></div>`;
    }
    function tabCombat() {
      return `<div class="ck-quest"><b>Pip’s combat notes</b><p>${ui.combatText ? code(ui.combatText) : 'Pick a skill (keys 1–5 or tap it), then tap the arena to fire. Shoot down incoming orbs, watch your heat, and dash with cd once you have it. Simple. Mostly. I believe in you.'}</p></div>
        <div class="ck-quest"><b>Clean fixes</b><p>Equip the right skill before walking into a problem and you can fix it instantly — no fight, bonus bits.</p></div>`;
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
      const tabs = [['quests', '📜 Quests'], ['items', '🎒 Items'], ['combat', '⚔️ Combat'], ['tasks', '✅ Tasks']];
      const body = { quests: tabQuests, items: tabItems, combat: tabCombat, tasks: tabTasks }[ui.pipTab](state);
      panel.innerHTML = `<header><span class="ck-orb big"></span><div><b>Pip</b><small>PID 1 · always running · mildly judgmental</small></div><button class="ck-btn" data-ck="closepip" aria-label="Close Pip">✕</button></header>
        <nav>${tabs.map(([id, l]) => `<button class="ck-tab ${id === ui.pipTab ? 'on' : ''}" data-tab="${id}">${l}</button>`).join('')}</nav>
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
          const line = document.createElement('div'); line.className = 'cmd'; line.textContent = shell.prompt() + v; out.appendChild(line);
          const res = shell.run(v);
          if (res.pending) shell.cancel();
          const o = document.createElement('div'); o.innerHTML = res.html || ''; out.appendChild(o);
          p.textContent = shell.prompt();
          if (s.learnTest.test(v.trim()) && res.ok !== false) {
            done = true; h.onLearned(skillId);
            const equipped = h.getState().equipped.includes(skillId);
            const ok = document.createElement('div'); ok.className = 'ck-learned';
            ok.innerHTML = spec ? esc(spec.done) : `✅ Skill learned: <code>${esc(s.cmd)}</code> — ${equipped ? 'it’s in your skill bar and codex.' : 'it’s in your codex, but your skill slots are full.'}`; out.appendChild(ok);
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
        box.innerHTML = `<div class="ck-card"><h2>${esc(title)}</h2>${text ? `<p>${code(text)}</p>` : ''}<div class="ck-options">${options.map((o, i) => `<button class="ck-btn ${o.primary ? 'ck-primary' : ''}" data-i="${i}">${o.html || esc(o.label)}</button>`).join('')}</div></div>`;
        box.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; box.remove(); resolve(options[+b.dataset.i].value); });
        $('.ck-layer').appendChild(box);
      });
    };
    ui.toast = function (html) {
      const t = document.createElement('div'); t.className = 'ck-toast'; t.innerHTML = html;
      $('.ck-toasts').appendChild(t);
      setTimeout(() => t.classList.add('out'), 3000); setTimeout(() => t.remove(), 3500);
    };
    ui.banner = function (title, subtitle, ms) {
      return new Promise((resolve) => {
        const b = document.createElement('div'); b.className = 'ck-banner';
        b.innerHTML = `<div><small>${esc(subtitle || '')}</small><h1>${esc(title)}</h1></div>`;
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
      if (d.ck === 'pip') return ui.pipOpen() ? ui.closePip() : ui.pip();
      if (d.ck === 'closepip') return ui.closePip();
      if (d.ck === 'next' && sayState) return sayState.next();
      if (d.ck === 'speak' && sayState) return sayState.speak();
      if (d.tab) return ui.pip(d.tab);
      if (d.skill) return h.onSkill(d.skill);
      if (d.equip) { h.onEquip(d.equip); ui.pip('items'); ui.skillBar(h.getState(), ui.mode); return; }
      if (d.unequip) { h.onUnequip(d.unequip); ui.pip('items'); ui.skillBar(h.getState(), ui.mode); return; }
      if (d.buy) { h.onBuy(d.buy); ui.pip('items'); ui.skillBar(h.getState(), ui.mode); ui.hud(h.getState()); }
    });

    ui.destroy = function () { document.removeEventListener('keydown', onKey); rootEl.innerHTML = ''; rootEl.classList.remove('ck-ui'); };
    return ui;
  }

  CK.UI = { create };
})(typeof window !== 'undefined' ? window : globalThis);
