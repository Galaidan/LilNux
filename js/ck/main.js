/* Colonel Kernel — chapter flow and the bridge to LilNux (players, XP, badges). */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});
  let cur = null;

  const BADGES = {
    firmware: ['ck-r1', '🔥', 'Firmware Fixer'],
    grub: ['ck-r2', '🐛', 'Bootloader Boss'],
    clean: ['ck-clean', '🧼', 'Clean Fixer'],
    chapter: ['ck-ch1', '🎖️', 'Chapter 1: Boot Sequence'],
  };
  const CLEAN_BADGE_AT = 3;

  CK.open = function (h) {
    CK.close();
    const W = CK.World; const R = CK.Rules;
    const player = h.player;
    const state = R.sanitize(CK.State.load(player.ck));
    const S = CK.Story;
    const restedAway = S.restedWhileAway(state, Date.now());
    state.story.lastSeen = Date.now();
    // Never resume standing inside an unfinished fight/puzzle: go back to the checkpoint.
    const here = R.region(state.region).nodes[state.node];
    if (R.BLOCKING[here.kind] && !R.isCleared(state, state.node) && state.checkpoint.region === state.region && R.region(state.region).nodes[state.checkpoint.node]) {
      state.node = state.checkpoint.node; state.prev = null;
    }
    R.reveal(state, state.node);
    player.ck = state;

    const host = document.createElement('div'); host.id = 'ck-root';
    try { setup(); } catch (err) {
      // A bug must never leave a full-screen overlay the player can't close.
      try { if (cur) CK.close(); else host.remove(); } catch (e) { /* ignore */ }
      document.body.classList.remove('ck-open'); cur = null;
      if (root.console) console.error('Colonel Kernel failed to start:', err);
      if (h.onExit) h.onExit();
    }
    function setup() {
    host.innerHTML = '<canvas class="ck-canvas" aria-label="Colonel Kernel game map"></canvas><div class="ck-ui-host"></div>';
    (h.root || document.body).appendChild(host);
    document.body.classList.add('ck-open');

    const engine = CK.Engine.create(host.querySelector('canvas'));
    const save = () => { player.ck = state; try { h.save(); } catch (e) { /* storage blocked: keep playing */ } };
    const xp = (n) => { if (n) h.addXP(n); };
    const say = (who, lines) => ui.say(who, lines);
    const sound = (k) => { if (h.sound && h.sound[k] && (!h.soundOn || h.soundOn())) h.sound[k](); };
    let lock = 0; const m = { learning: null, learnExample: null, pendingProblem: null }; let remindPending = false; let reminderOpen = false; let hiddenAt = 0;
    let orientationTipShown = false;

    let engineRef = null; const onMap = () => !engineRef || !engineRef.scene || !!engineRef.scene.tapNode;
    const ui = CK.UI.create(host.querySelector('.ck-ui-host'), {
      user: (player.name || 'colonel').toLowerCase().replace(/[^a-z0-9]/g, '') || 'colonel',
      getState: () => state,
      onExit: () => { CK.close(); if (h.onExit) h.onExit(); },
      onEquip: (id) => { if (onMap()) { R.equip(state, id); save(); } },
      onUnequip: (id) => { if (onMap()) { R.unequip(state, id); save(); } },
      onBuy: (id) => {
        if (!onMap()) return;
        const r = R.buyUpgrade(state, id);
        if (r.ok) { const up = Object.values(W.SKILLS).find((s) => s.upgrade.id === id).upgrade; sound('win'); ui.toast(`⬆ Upgrade installed: <code>${up.cmd}</code> — ${up.blurb}`); }
        save();
      },
      onSkill: (id) => onSkill(id),
      onLearned: (id) => { if (id === 'rest') state.story.restUnlocked = true; else R.learn(state, id); save(); },
      onRest: () => { if (canRest()) busy(async () => { await ui.banner('💤 Resting…', 'systemctl suspend', 1800); await wake(S.rest(state, Math.random)); }); },
      speak: (t) => { if (h.speak) h.speak(t); },
    });

    const map = CK.Scenes.map({ engine, state, onArrive: (r) => arrive(r), onBlocked: (why, id) => blocked(why, id), onFlicker: () => save() });
    engineRef = engine; cur = { engine, ui, host, map };
    engine.setScene(map); engine.start();
    refresh();

    function canRest() {
      const n = R.region(state.region).nodes[state.node];
      return !!state.story.restUnlocked && engine.scene === map && !map.locked && !ui.busy() && (n.kind === 'start' || n.kind === 'character') && !state.story.glitched.includes(state.node);
    }
    function refresh() {
      ui.hud(state, { canRest: canRest() }); if (engine.scene === map) ui.skillBar(state, 'map');
      if (remindPending && !lock && engine.scene === map && !ui.busy()) { remindPending = false; breakReminder(); }
    }

    // ------------------------------------------------------------ resting (NullNux acts in secret)
    async function wake(ev) {
      save(); map.setState(state);
      const reg = R.region(state.region);
      if (ev.type === 'taken') {
        await ui.banner('…', 'You wake up', 1600);
        await say('pip', ['Colonel! Colonel, wake up!', 'Lil Tux is gone. Home is… glitching. Everything was fine when you went to sleep.',
          'There’s a log line I don’t recognise: `' + S.TAKEN_LOG + '`', 'swapper/0? Nothing out here should be running as PID 0…', 'Whatever took him is still somewhere in this system. We’re going to find him.']);
        h.giveBadge(...BADGES.chapter); sound('win');
        await ui.banner('Chapter 1 Complete', 'Lil Tux is missing', 3200);
        await say('pip', ['Next: the Kernel Core — processes, the scheduler… and maybe some answers.', 'Until then, try `ls -a`, `cd` and `sudo dmesg` in the real Terminal (dmesg may need sudo). Same commands as here. Well… minus the lasers.']);
        return;
      }
      ui.toast('😴 The Colonel wakes up feeling rested.');
      if (ev.type === 'rebreak') await say('pip', [`Huh. The ${reg.nodes[ev.node].label} circuit is broken again. I could’ve sworn we fixed that…`]);
      else if (ev.type === 'oddlog') { ui.toast(`✦ A strange line appeared in the logs:<br><code>${ev.line}</code>`); await say('pip', ['That’s not a boot message… Probably nothing.']); }
    }
    async function breakReminder() {
      const who = state.story.liltuxMet && !state.story.liltuxTaken ? 'liltux' : 'pip';
      const opts = [];
      if (canRest()) opts.push({ label: 'Rest now', html: '💤 Rest now (<code>systemctl suspend</code>)', value: 'rest' });
      opts.push({ label: 'Take a real break', html: '🚶 Take a real break (close the game)', value: 'quit' }, { label: 'Keep playing', html: '▶ Keep playing', value: null });
      reminderOpen = true;
      await busy(async () => {
        const pick = await ui.choice('Time for a break?', opts, `${W.CHARACTERS[who].name}: “You’ve been playing for a while. Even kernels need rest — stretch, grab some water, look at something far away.”`);
        if (pick === 'rest') { await ui.banner('💤 Resting…', 'systemctl suspend', 1800); await wake(S.rest(state, Math.random)); }
        else if (pick === 'quit') { setTimeout(() => { CK.close(); if (h.onExit) h.onExit(); }, 0); }
        reminderOpen = false; remindPending = false; state.story.lastReminderMs = state.story.playMs; // next one a full interval later
      });
    }
    const tick = setInterval(() => {
      if (!cur || document.hidden) return;
      if (S.addPlayTime(state, 1000) && !reminderOpen) remindPending = true;
      state.story.lastSeen = Date.now();
      if (remindPending) refresh();
    }, 1000);
    function onVis() {
      if (document.hidden) { hiddenAt = Date.now(); state.story.lastSeen = hiddenAt; save(); return; }
      if (hiddenAt && S.restedWhileAway(state, Date.now()) && !lock) busy(async () => { await wake(S.rest(state, Math.random)); });
      hiddenAt = 0; state.story.lastSeen = Date.now();
    }
    function onHide() { state.story.lastSeen = Date.now(); save(); }
    document.addEventListener('visibilitychange', onVis);
    root.addEventListener('pagehide', onHide);
    async function busy(fn) {
      lock++; map.locked = true;
      try { await fn(); } finally { lock--; if (!lock) map.locked = false; if (cur) { refresh(); save(); } }
    }
    function claim() {
      for (const id of R.claimTasks(state)) { const t = W.TASKS[id]; ui.toast(`✅ Task done for <b>${W.CHARACTERS[t.giver].name}</b>: ${t.text} <b>+${t.bits} bits</b>`); sound('good'); }
      if (state.stats.clean >= CLEAN_BADGE_AT) h.giveBadge(...BADGES.clean);
    }
    function backToMap() { engine.setScene(map); map.setState(state); ui.closePip(); ui.skillBar(state, 'map'); }
    function teacherOf(skill) { return W.SKILLS[skill].teacher; }

    // ------------------------------------------------------------ arrivals
    function arrive(r) {
      if (!r || !r.ok || !cur) return;
      const node = r.arrived; const id = state.node;
      save();
      busy(async () => {
        if (node.kind === 'character') await meet(node.ref);
        else if (node.kind === 'problem' && !R.isCleared(state, id)) await problem(id, node);
        else if (node.kind === 'circuit' && !R.isCleared(state, id)) await circuit(id, node);
        else if (node.kind === 'boss' && !R.isCleared(state, id)) await boss(id, node);
        else if (node.kind === 'item' && r.first) item(node);
        else if (node.kind === 'memory' && r.first) await memory(node);
        else if (node.kind === 'exit') await exit();
      });
    }
    function blocked(why) {
      const msg = { fog: 'Too foggy — explore next to it first (or scan with <code>ls</code>).', 'not-adjacent': 'No direct trace there. Follow the circuit lines.', blocked: 'Pip: we can’t get past this until it’s fixed. Tap it again to try, or step back.' }[why];
      if (msg) ui.toast(msg);
    }

    async function meet(who) {
      if (who === 'liltux') return meetLilTux();
      const skill = Object.keys(W.SKILLS).find((k) => W.SKILLS[k].teacher === who);
      const first = !state.codex.includes(skill);
      if (first) await say(who, W.CHARACTERS[who].lines);
      else await say(who, [who === 'pip' ? 'I’m right here, Colonel. Always running.' : 'Back again? Go on — the machine won’t fix itself.']);
      if (skill && !state.learned.includes(skill)) { m.learning = skill; m.learnExample = W.SKILLS[skill].example; await ui.learn(skill); m.learning = null; m.learnExample = null; sound('win'); xp(10); }
      if (skill && state.learned.includes(skill) && !state.equipped.includes(skill)) {
        const out = await ui.choice(`Your skill slots are full`, state.equipped.map((s) => ({ label: `Swap out ${W.SKILLS[s].cmd}`, html: `🔁 Swap out <code>${W.SKILLS[s].cmd}</code> for <code>${W.SKILLS[skill].cmd}</code>`, value: s }))
          .concat([{ label: 'Keep my loadout', html: '✋ Keep my loadout (swap later in Pip → Items)', value: null }]),
          `You have ${state.equipped.length} slots. A RAM stick adds one. Which skill should make room for ${W.SKILLS[skill].cmd}?`);
        if (out) { state.equipped[state.equipped.indexOf(out)] = skill; save(); }
      }
    }

    async function problem(id, node) {
      const p = node.ref; m.pendingProblem = p.skill;
      const opts = state.equipped.map((s) => ({ label: `Quick fix with ${W.SKILLS[s].cmd}`, html: `${W.SKILLS[s].icon} Quick fix with <code>${W.SKILLS[s].cmd}</code>`, value: s }));
      opts.push({ label: 'Fight it', html: '⚔️ Fight it head-on', value: 'fight' });
      opts.push({ label: 'Step back', html: '↩ Step back', value: 'back' });
      const pick = await ui.choice('⚠ ' + p.title, opts, 'Something’s wrong here. Use the right skill for a clean fix — or fight it.');
      m.pendingProblem = null;
      if (pick === 'back') { if (state.prev) { state.node = state.prev; state.prev = null; map.snapTo(state.node); } return; }
      if (pick !== 'fight' && R.quickFix(state, id, pick) === 'fixed') {
        const rw = R.reward(state, 'clean'); xp(rw.xp); sound('good');
        map.burst(node.x, node.y, '#6dffb0', 30);
        ui.toast(`🧼 <b>Clean fix!</b> +${rw.bits} bits`);
        await say(teacherOf(p.skill), ['In real Linux: ' + p.real]);
        claim(); return;
      }
      if (pick !== 'fight') ui.toast(`<code>${W.SKILLS[pick].cmd}</code> didn’t work here — it’s turning into a fight!`);
      const won = await fight(p.creature);
      if (won) {
        R.clear(state, id); const rw = R.reward(state, 'fight'); xp(rw.xp);
        ui.toast(`⚔️ Problem defeated! +${rw.bits} bits`);
        await say(teacherOf(W.CREATURES[p.creature].weak), ['In real Linux: ' + W.CREATURES[p.creature].real]);
        claim();
      }
    }

    function fight(creature) {
      return new Promise((resolve) => {
        ui.closePip();
        state.stats.fights++;
        if (!orientationTipShown && root.innerHeight > root.innerWidth * 1.2) { orientationTipShown = true; ui.toast('📱 Tip: turn your phone sideways for a bigger arena.'); }
        const sc = CK.Scenes.fight({
          engine, ui, state, creature, kid: !!player.kid, seed: (Date.now() % 100000) + 1, accent: R.region(state.region).accent,
          sfx: (t) => { if (t === 'kill' || t === 'win') sound(t === 'win' ? 'win' : 'good'); else if (t === 'hurt' || t === 'lose') sound('bad'); else if (t === 'reveal' || t === 'dash') sound('pop'); },
          onEnd: (outcome) => {
            backToMap();
            if (outcome === 'win') { state.stats.wins++; resolve(true); return; }
            state.region = state.checkpoint.region; state.node = state.checkpoint.node; state.prev = null; map.setState(state);
            ui.toast('💥 Stability lost — rebooting at the last checkpoint. Your loot is safe.');
            resolve(false);
          },
        });
        engine.setScene(sc);
      });
    }

    function circuit(id, node) {
      return new Promise((resolve) => {
        ui.closePip(); ui.skillBar(state, 'map');
        const grid = CK.Puzzle.scramble(JSON.parse(JSON.stringify(node.ref.grid)), CK.rng((Date.now() % 100000) + 3));
        const sc = CK.Scenes.puzzle({
          engine, state, grid, solvedGrid: node.ref.grid, accent: R.region(state.region).accent, sfx: (t) => sound(t === 'win' ? 'win' : 'pop'),
          onSolved: () => {
            R.clear(state, id); const rw = R.reward(state, 'puzzle'); xp(rw.xp);
            backToMap(); map.burst(node.x, node.y, R.region(state.region).accent, 30);
            ui.toast(`⚡ Circuit restored! +${rw.bits} bits`); claim(); resolve();
          },
        });
        engine.setScene(sc);
      });
    }

    async function boss(id, node) {
      const c = W.CREATURES[node.ref.creature];
      const pick = await ui.choice('☠ ' + c.name, [{ label: 'Fight!', html: '⚔️ Fight!', value: 'fight', primary: true }, { label: 'Not yet', html: '↩ Not yet — step back', value: 'back' }],
        `Pip: “That’s the ${c.name}. ${c.weakText}”` + (c.cloaked && !state.equipped.includes('ls') ? ' ⚠ You don’t have ls equipped — you won’t be able to see it! Step back and equip it in Pip → Items.' : ''));
      if (pick === 'back') { if (state.prev) { state.node = state.prev; state.prev = null; map.snapTo(state.node); } return; }
      const won = await fight(node.ref.creature);
      if (!won) return;
      R.clear(state, id);
      const rw = R.reward(state, 'boss'); xp(rw.xp);
      R.installModule(state, node.ref.drop);
      const mod = W.MODULES[node.ref.drop];
      ui.toast(`${mod.icon} <b>${mod.name}</b> installed on your motherboard! ${mod.real}`);
      const reg = R.region(state.region);
      const rr = R.reward(state, 'region'); xp(rr.xp);
      h.giveBadge(...BADGES[state.region]);
      await say('pip', reg.outro);
      await say(teacherOf(c.weak), ['In real Linux: ' + c.real]);
      claim();
    }

    function item(node) {
      if (typeof node.ref === 'string') {
        R.installModule(state, node.ref); const mod = W.MODULES[node.ref];
        ui.toast(`${mod.icon} Found a <b>${mod.name}</b> — installed! ${mod.real}`); sound('win');
      } else { state.bits += node.ref.bits; ui.toast(`💎 Hidden cache: <b>+${node.ref.bits} bits</b>`); sound('good'); }
      map.burst(node.x, node.y, '#6dffb0', 24);
    }

    async function memory(node) {
      if (!state.memories.includes(node.ref)) state.memories.push(node.ref);
      const rw = R.reward(state, 'memory'); xp(rw.xp); sound('good');
      map.burst(node.x, node.y, '#8b5cff', 30);
      ui.toast(`✦ Memory fragment recovered <br><code>${node.ref.replace(/</g, '&lt;')}</code>`);
      const n = state.memories.length;
      if (n === 1) await say('pip', ['A memory! It looks like a kernel log line — the kind `dmesg` prints on a real Linux machine.', 'Why would YOU remember kernel logs, Colonel…?']);
      claim();
    }

    async function exit() {
      if (state.region === 'firmware') {
        R.enterRegion(state, 'grub'); map.setState(state); save();
        await intro();
      }
    }

    async function meetLilTux() {
      const st = state.story;
      if (st.liltuxTaken) { await say('pip', ['Home is cold and glitching. Lil Tux is gone… We’ll find him, Colonel.']); return; }
      if (!st.liltuxMet) { await say('liltux', W.CHARACTERS.liltux.lines); sound('win'); }
      else await say('liltux', ['Still here! Go on, get some rest. I’ll keep watch. 🐧']);
      if (!st.restUnlocked) {
        m.learning = 'rest'; m.learnExample = 'systemctl suspend';
        await ui.learn('rest', { id: 'rest', cmd: 'systemctl suspend', name: 'Rest', icon: '💤', teacher: 'liltux', learnTest: /^systemctl\s+suspend$/,
          real: '`systemctl suspend` puts a real Fedora computer to sleep. It wakes up right where you left off.', example: 'systemctl suspend', done: '💤 Rest unlocked! Use the 💤 Rest button at safe spots — or just take a real break.' });
        m.learning = null; m.learnExample = null; xp(10);
      }
      if (!st.liltuxMet) { st.liltuxMet = true; xp(25); }
      save();
      const pick = await ui.choice('Lil Tux: “Rest now? I’ll keep watch.”', [{ label: 'Rest now', html: '💤 Rest now (<code>systemctl suspend</code>)', value: 'rest', primary: true }, { label: 'Not yet', html: '⏳ Not yet', value: null }]);
      if (pick === 'rest') { await ui.banner('💤 Resting…', 'systemctl suspend', 1800); await wake(S.rest(state, Math.random)); }
    }

    async function intro() {
      const reg = R.region(state.region);
      await ui.banner(reg.name, state.region === 'firmware' ? 'Chapter 1 · Boot Sequence' : 'Region 2');
      if (state.region === 'firmware' && !state.seenIntro) {
        await say('colonel', ['…where… am I? Who am I?', 'Everything’s dark. Something is humming next to me.']);
      }
      await say('pip', reg.intro);
      state.seenIntro = true;
    }

    // ------------------------------------------------------------ skills on the map
    async function onSkill(id) {
      if (engine.scene !== map) { if (engine.scene && engine.scene.skill) engine.scene.skill(id); return; }
      if (map.locked) return;
      if (id === 'echo') { ui.toast('📣 <code>echo hello</code> → hello… …hello… …hello. (Save it for fights, Colonel.)'); return; }
      const r = R.useOnMap(state, id);
      if (!r.ok) return;
      if (id === 'ls') {
        sound('pop'); const p = map.colonelPos(); map.burst(p.x, p.y, '#38f2ff', 30);
        ui.toast(r.revealed.length ? `🔦 <code>${state.upgrades.includes('ls-a') ? 'ls -a' : 'ls'}</code> revealed ${r.revealed.length} new place${r.revealed.length > 1 ? 's' : ''}.` : '🔦 Nothing new nearby.');
        save(); return;
      }
      if (id === 'cd') {
        if (!r.travelTargets.length) { ui.toast('🌀 Nowhere to jump yet — visit some places first.'); return; }
        await busy(async () => {
          const reg = R.region(state.region);
          const pick = await ui.choice('🌀 cd — fast travel', r.travelTargets.map((t) => ({ label: reg.nodes[t].label, html: `<code>cd ${reg.nodes[t].label.replace(/\s+/g, '_')}</code>`, value: t })).concat([{ label: 'Cancel', value: null }]));
          if (pick && R.fastTravel(state, pick)) { map.snapTo(state.node); sound('pop'); }
        });
      }
    }

    if (CK.Engine.debug) {
      CK._test.main = {
        get state() { return state; }, ui, map,
        sceneKind: () => (engine.scene === map ? 'map' : engine.scene && engine.scene.fight ? 'fight' : engine.scene && engine.scene.grid ? 'puzzle' : 'none'),
        busy: () => map.locked || ui.busy(),
        get learning() { return m.learning; }, get learnExample() { return m.learnExample; }, get pendingProblem() { return m.pendingProblem; },
      };
    }
    busy(async () => {
      if (!state.seenIntro) await intro();
      else ui.toast(`Welcome back, Colonel. ${R.region(state.region).name}.`);
      if (restedAway) await wake(S.rest(state, Math.random));
    });
    cur.cleanup = () => { clearInterval(tick); document.removeEventListener('visibilitychange', onVis); root.removeEventListener('pagehide', onHide); state.story.lastSeen = Date.now(); save(); };
    }
  };

  CK.close = function () {
    if (!cur) return;
    try { if (root.speechSynthesis) root.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    if (cur.cleanup) cur.cleanup();
    cur.engine.destroy(); cur.ui.destroy(); cur.host.remove();
    document.body.classList.remove('ck-open');
    cur = null;
    if (CK.Engine.debug && CK._test) CK._test.main = null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
