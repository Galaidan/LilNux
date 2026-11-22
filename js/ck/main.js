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
    let state = CK.State.load(player.ck);
    const reg0 = R.region(state.region);
    if (!reg0 || !reg0.nodes[state.node]) state = CK.State.fresh();
    // Never resume standing inside an unfinished fight/puzzle: go back to the checkpoint.
    const here = R.region(state.region).nodes[state.node];
    if (R.BLOCKING[here.kind] && !R.isCleared(state, state.node) && state.checkpoint.region === state.region && R.region(state.region).nodes[state.checkpoint.node]) {
      state.node = state.checkpoint.node; state.prev = null;
    }
    R.reveal(state, state.node);
    player.ck = state;

    const host = document.createElement('div'); host.id = 'ck-root';
    host.innerHTML = '<canvas class="ck-canvas" aria-label="Colonel Kernel game map"></canvas><div class="ck-ui-host"></div>';
    (h.root || document.body).appendChild(host);
    document.body.classList.add('ck-open');

    const engine = CK.Engine.create(host.querySelector('canvas'));
    const save = () => { player.ck = state; try { h.save(); } catch (e) { /* storage blocked: keep playing */ } };
    const xp = (n) => { if (n) h.addXP(n); };
    const say = (who, lines) => ui.say(who, lines);
    const sound = (k) => { if (h.sound && h.sound[k] && (!h.soundOn || h.soundOn())) h.sound[k](); };
    let lock = 0; const m = { learning: null, pendingProblem: null };
    let orientationTipShown = false;

    const ui = CK.UI.create(host.querySelector('.ck-ui-host'), {
      user: (player.name || 'colonel').toLowerCase().replace(/[^a-z0-9]/g, '') || 'colonel',
      getState: () => state,
      onExit: () => { CK.close(); if (h.onExit) h.onExit(); },
      onEquip: (id) => { R.equip(state, id); save(); },
      onUnequip: (id) => { R.unequip(state, id); save(); },
      onBuy: (id) => {
        const r = R.buyUpgrade(state, id);
        if (r.ok) { const up = Object.values(W.SKILLS).find((s) => s.upgrade.id === id).upgrade; sound('win'); ui.toast(`⬆ Upgrade installed: <code>${up.cmd}</code> — ${up.blurb}`); }
        save();
      },
      onSkill: (id) => onSkill(id),
      onLearned: (id) => { R.learn(state, id); save(); },
      speak: (t) => { if (h.speak) h.speak(t); },
    });

    const map = CK.Scenes.map({ engine, state, onArrive: (r) => arrive(r), onBlocked: (why, id) => blocked(why, id) });
    engine.setScene(map); engine.start();
    refresh();

    function refresh() { ui.hud(state); if (engine.scene === map) ui.skillBar(state, 'map'); }
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
      const skill = Object.keys(W.SKILLS).find((k) => W.SKILLS[k].teacher === who);
      const first = !state.codex.includes(skill);
      if (first) await say(who, W.CHARACTERS[who].lines);
      else await say(who, [who === 'pip' ? 'I’m right here, Colonel. Always running.' : 'Back again? Go on — the machine won’t fix itself.']);
      if (skill && !state.learned.includes(skill)) { m.learning = skill; await ui.learn(skill); m.learning = null; sound('win'); xp(10); }
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
        `Pip: “That’s the ${c.name}. ${c.weakText}”`);
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
      } else if (!state.chapterDone) {
        state.chapterDone = true; save();
        h.giveBadge(...BADGES.chapter); sound('win');
        await ui.banner('Chapter 1 Complete', 'Boot Sequence restored', 3200);
        await say('pip', ['Next time: the Kernel Core. Processes, the scheduler, and something called a Fork Bomb. I’ve got a bad feeling about this.', 'Until then — try `dmesg`, `ls -a` and `cd` in the real Terminal. They work exactly like here. Well… minus the lasers.']);
      } else {
        await say('pip', ['Chapter 2 is still being built. Stay tuned, Colonel!']);
      }
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

    cur = { engine, ui, host, map };
    if (CK.Engine.debug) {
      CK._test.main = {
        get state() { return state; }, ui, map,
        sceneKind: () => (engine.scene === map ? 'map' : engine.scene && engine.scene.fight ? 'fight' : engine.scene && engine.scene.grid ? 'puzzle' : 'none'),
        busy: () => map.locked || ui.busy(),
        get learning() { return m.learning; }, get pendingProblem() { return m.pendingProblem; },
      };
    }
    busy(async () => {
      if (!state.seenIntro) await intro();
      else ui.toast(`Welcome back, Colonel. ${R.region(state.region).name}.`);
    });
  };

  CK.close = function () {
    if (!cur) return;
    try { if (root.speechSynthesis) root.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    cur.engine.destroy(); cur.ui.destroy(); cur.host.remove();
    document.body.classList.remove('ck-open');
    cur = null;
    if (CK.Engine.debug && CK._test) CK._test.main = null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
