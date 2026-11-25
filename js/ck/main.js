/* Colonel Kernel — the room-based Adventure: Chapter 1 played room to room, and the bridge to LilNux
 * (players, XP, badges). Rooms come from roomgen.js, fights from action.js, drawing from roomscene.js,
 * the overlay from ui.js. Rules, saves and the story keep their meaning (rules.js, state.js, story.js). */
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
  const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
  const LINES = {
    dashTip: 'Tip: <b>Space</b> (or <b>»</b>) to dash. Nothing can hit you mid-dash.',
    echoGap: ['See that switch across the gap? Lesson two: echo. In a terminal it repeats what you tell it. Down here it flies. Type it.'],
    newMoves: ['You can do more than shoot now. kill up close, trap to catch what they throw, Space or » to dash.'],
    parry: '<b>Pip:</b> Caught it! <code>trap</code> grabs a signal and runs your handler instead. Smug looks good on you.',
    sigkill: '<b>Pip:</b> That one was SIGKILL — <code>trap</code> can’t catch signal 9 (or SIGSTOP). Nobody can. Dodge it.',
  };

  CK.open = function (h) {
    CK.close();
    if (CK.closeSlice) CK.closeSlice();
    const W = CK.World; const R = CK.Rules; const S = CK.Story;
    const player = h.player;
    const state = R.sanitize(CK.State.load(player.ck));
    const restedAway = S.restedWhileAway(state, Date.now());
    state.story.lastSeen = Date.now();
    // Never resume standing inside an unfinished fight / puzzle: go back to the checkpoint.
    const here0 = R.region(state.region).nodes[state.node];
    if (R.BLOCKING[here0.kind] && !R.isCleared(state, state.node) && state.checkpoint.region === state.region && R.region(state.region).nodes[state.checkpoint.node]) {
      state.node = state.checkpoint.node; state.prev = null;
    }
    R.reveal(state, state.node);
    player.ck = state;

    const host = document.createElement('div'); host.id = 'ck-root';
    const parts = { intervals: [], offs: [] };
    cur = { host, engine: null, input: null, ui: null, cleanup() { parts.intervals.forEach((i) => clearInterval(i)); parts.offs.forEach((f) => f()); } };
    try { setup(); } catch (err) {
      // A bug must never leave a full-screen overlay the player can't close.
      if (root.console) console.error('Colonel Kernel failed to start:', err);
      try { CK.close(); } catch (e) { host.remove(); document.body.classList.remove('ck-open'); cur = null; }
      if (h.onExit) h.onExit();
    }

    function setup() {
      host.innerHTML = '<canvas class="ck-pix" aria-label="Colonel Kernel: the room you are in"></canvas><div class="ck-ui-host"></div>';
      (h.root || document.body).appendChild(host);
      document.body.classList.add('ck-open');
      const canvas = host.querySelector('.ck-pix');
      const engine = cur.engine = CK.PixEngine.create(canvas);
      const input = cur.input = CK.Input.create({ canvas, host, toBuffer: engine.toBuffer });

      const save = () => { player.ck = state; try { h.save(); } catch (e) { /* storage blocked: keep playing */ } };
      const xp = (n) => { if (n) h.addXP(n); };
      const sound = (k) => { try { if (h.sound && h.sound[k] && (!h.soundOn || h.soundOn())) h.sound[k](); } catch (e) { /* ignore */ } };
      const say = (who, lines) => ui.say(who, lines);
      let lock = 0; const m = { learning: null, learnExample: null };
      let remindPending = false; let reminderOpen = false; let hiddenAt = 0;
      let room = null; let sim = null; let scene = null; let roomId = null; let near = null;
      let puzzle = null; let bossFight = false; let away = false; let entrySide = null;
      const firsts = {}; const brokenDoors = new Set(); const events = [];

      const inFight = () => !!sim && sim.hadFoes && !sim.outcome && sim.enemies.some((e) => !e.dead);
      const ui = cur.ui = CK.UI.create(host.querySelector('.ck-ui-host'), {
        user: (player.name || 'colonel').toLowerCase().replace(/[^a-z0-9]/g, '') || 'colonel',
        getState: () => state,
        onExit: () => { CK.close(); if (h.onExit) h.onExit(); },
        onEquip: (id) => { if (!inFight()) { R.equip(state, id); toolsChanged(); save(); } },
        onUnequip: (id) => { if (!inFight()) { R.unequip(state, id); toolsChanged(); save(); } },
        onBuy: (id) => {
          if (inFight()) return;
          const r = R.buyUpgrade(state, id);
          if (r.ok) { const up = Object.values(W.SKILLS).find((s) => s.upgrade && s.upgrade.id === id).upgrade; sound('win'); ui.toast(`⬆ Upgrade installed: <code>${up.cmd}</code> — ${up.blurb}`); toolsChanged(); }
          save();
        },
        onSkill: () => {},
        onLearned: (id) => { if (id === 'rest') state.story.restUnlocked = true; else R.learn(state, id); toolsChanged(); save(); },
        onRest: () => { if (canRest()) busy(async () => { await ui.banner('💤 Resting…', 'systemctl suspend', 1800); await wake(S.rest(state, Math.random)); }); },
        speak: (t) => { if (h.speak) h.speak(t); },
        inFight,
      });

      // ---- pause: rotate screen, unfocused window, any overlay, a running story beat -------------
      const portrait = root.matchMedia ? root.matchMedia('(orientation: portrait) and (pointer: coarse)') : null;
      const paused = () => away || !!(portrait && portrait.matches) || lock > 0 || ui.busy() || ui.pipOpen() || !!puzzle;
      const onBlur = () => { away = true; input.clear(); };
      const onFocus = () => { away = false; };
      root.addEventListener('blur', onBlur); root.addEventListener('focus', onFocus); host.addEventListener('pointerdown', onFocus);
      parts.offs.push(() => { root.removeEventListener('blur', onBlur); root.removeEventListener('focus', onFocus); });

      // ---- building rooms -------------------------------------------------------------------------
      const reg = () => R.region(state.region);
      function applyDoors() {
        const ds = R.doorStates(state, roomId, { bossFight });
        for (const side of Object.keys(room.doors)) {
          let kind = ds[side] ? ds[side].kind : 'wall';
          if (kind === 'crack' && brokenDoors.has(side)) kind = 'open';
          room.setDoor(side, kind);
        }
        return ds;
      }
      function makeSim() {
        const node = reg().nodes[roomId]; const ds = R.doorStates(state, roomId, { bossFight });
        const fight = (node.kind === 'problem' && !R.isCleared(state, roomId)) || (node.kind === 'boss' && bossFight);
        const breakables = Object.keys(ds).filter((s) => ds[s].kind === 'crack' && !brokenDoors.has(s) && room.doors[s]).map((s) => ({ id: 'door-' + s, tiles: room.doors[s].tiles }))
          .concat(room.props.filter((p) => p.kind === 'block').map((p) => ({ id: `b${p.tx},${p.ty}`, tiles: [[p.tx, p.ty]] })));
        return CK.Action.create({ room, kid: !!player.kid, seed: (Date.now() % 100000) + 1, tools: state.equipped.slice(), upgrades: state.upgrades.slice(),
          mods: R.stats(state), spawns: fight ? room.spawns : [], breakables });
      }
      function enterRoom(id, fromSide) {
        const region = reg(); const node = region.nodes[id];
        roomId = id; entrySide = fromSide || null; brokenDoors.clear(); near = null;
        room = CK.Rooms.parse(CK.RoomGen.build(region, id));
        applyDoors();
        if (state.switches.includes(id)) room.openBridge();
        for (const p of room.props) {
          if (p.kind === 'terminal' && node.kind === 'circuit') p.broken = !R.isCleared(state, id);
          if (p.kind === 'crystal') p.taken = state.memories.includes(node.ref);
          if (p.kind === 'pedestal') { p.icon = typeof node.ref === 'string' ? 'mod_' + node.ref : 'bits'; p.taken = true; }
        }
        sim = makeSim();
        const at = fromSide ? CK.Rooms.entryPoint(room, fromSide) : { x: room.player.x, y: room.player.y };
        sim.player.x = at.x; sim.player.y = at.y;
        if (fromSide) sim.player.face = { n: { x: 0, y: 1 }, s: { x: 0, y: -1 }, w: { x: 1, y: 0 }, e: { x: -1, y: 0 } }[fromSide];
        const npc = room.props.find((p) => p.kind === 'npc');
        const who = node.kind === 'character' && node.ref !== 'pip' && !(node.ref === 'liltux' && state.story.liltuxTaken) ? node.ref : null;
        const view = { room, sim, accent: node.accent || region.accent, dark: !!node.dark, glitched: state.story.glitched.includes(id),
          npcs: npc && who ? [{ who, tx: npc.tx, ty: npc.ty }] : [], seed: CK.RoomGen.hash(id) };
        if (!scene) {
          scene = CK.RoomScene.create(Object.assign({ engine, input, onEvent, paused, onDoor, onNear, onTouch, onUse }, view));
          engine.setScene(scene); engine.start();
        } else scene.setRoom(view, fromSide && !puzzle ? fromSide : null);
        input.setTools(state.equipped); ui.action(true); onNear(null); refresh();
      }
      function toolsChanged() {
        input.setTools(state.equipped); ui.action(true);
        if (sim) { sim.tools.length = 0; sim.tools.push(...state.equipped); sim.upgrades.length = 0; sim.upgrades.push(...state.upgrades); Object.assign(sim.mods, R.stats(state)); }
      }

      // ---- the scene tells us where the Colonel is ---------------------------------------------------
      function onDoor(side) {
        if (lock || puzzle || !room.doors[side]) return;
        const ds = R.doorStates(state, roomId, { bossFight }); const d = ds[side]; if (!d) return;
        if (d.kind === 'loop') { loopBack(); return; }
        if (!(d.kind === 'open' || (d.kind === 'crack' && brokenDoors.has(side)))) return;
        const node = reg().nodes[d.to];
        if (node.kind === 'boss' && !R.isCleared(state, d.to)) { bossDoor(side, d.to); return; }
        go(d.to, side);
      }
      function go(to, side) {
        const r = R.move(state, to); if (!r.ok) return;
        save(); enterRoom(to, OPP[side]); arrive(r);
      }
      function onNear(p) {
        near = p;
        let label = null;
        if (p && p.kind === 'npc') { const who = (scene && sceneNpc(p)) || reg().nodes[roomId].ref; label = W.CHARACTERS[who] ? `Talk to ${W.CHARACTERS[who].name}` : null; }
        else if (p && p.kind === 'terminal') label = p.broken ? 'Repair the circuit' : 'Use the terminal (cd)';
        else if (p && p.kind === 'sign') label = 'Read the path sign (cd)';
        ui.prompt(label); input.showUse(label);
      }
      const sceneNpc = () => { const n = reg().nodes[roomId]; return n.kind === 'character' ? n.ref : null; };
      function onUse(p) {
        if (lock || !p) return;
        if (p.kind === 'npc') { const who = sceneNpc(); if (who) busy(() => meet(who)); }
        else if (p.kind === 'terminal') { if (p.broken) startPuzzle(); else cdTerminal(); }
        else if (p.kind === 'sign') pathSign();
      }
      function onTouch(p) {
        if (p.kind === 'crystal' && !p.taken) { p.taken = true; busy(() => memory(reg().nodes[roomId])); }
        else if (p.kind === 'gate') busy(() => exit());
      }

      // ---- events from the fight ----------------------------------------------------------------------
      function onEvent(ev) {
        if (events.length > 200) events.splice(0, 100);
        events.push(ev.type);
        switch (ev.type) {
          case 'hit': case 'kill': case 'break': sound('good'); break;
          case 'hurt': sound('bad'); break;
          case 'parry': case 'dash': case 'reveal': case 'switch': sound('pop'); break;
          default: break;
        }
        if (ev.type === 'parry' && !firsts.parry) { firsts.parry = true; ui.toast(LINES.parry); }
        if (ev.type === 'sigkill' && !firsts.sigkill) { firsts.sigkill = true; ui.toast(LINES.sigkill); }
        if (ev.type === 'switch' && roomId === 'f1' && !state.switches.includes('f1')) {
          state.switches.push('f1'); room.openBridge(); save(); ui.toast('⚡ The bridge slides out across the gap.');
        }
        if (ev.type === 'break' && ev.id && ev.id.startsWith('door-')) { const side = ev.id.slice(5); brokenDoors.add(side); room.setDoor(side, 'open'); }
        if (ev.type === 'reveal') onPulse();
        if (ev.type === 'clear') onClear();
        if (ev.type === 'lose') onLose();
      }

      // ---- story beats in rooms ----------------------------------------------------------------------
      function arrive(r) {
        if (!r || !r.ok || !cur) return;
        const node = r.arrived; const id = state.node;
        busy(async () => {
          if (node.kind === 'character') await meet(node.ref, true);
          else if (node.kind === 'problem' && !R.isCleared(state, id)) await problemEntry();
          else if (node.kind === 'item' && r.first) item(node);
        });
      }
      async function learn(skill) {
        m.learning = skill; m.learnExample = W.SKILLS[skill].example;
        await ui.learn(skill);
        m.learning = null; m.learnExample = null; sound('win'); xp(10); toolsChanged();
      }
      async function meet(who, arriving) {
        if (who === 'liltux') return meetLilTux();
        if (who === 'pip') {
          if (!state.learned.includes('kill')) { await say('pip', W.CHARACTERS.pip.lines); await learn('kill'); ui.toast(LINES.dashTip); }
          else if (!arriving) ui.toast('<b>Pip:</b> Still here. Still PID 1. Still not going anywhere — that’s literally my whole job.');
          return;
        }
        const skill = Object.keys(W.SKILLS).find((k) => W.SKILLS[k].teacher === who);
        const first = !state.codex.includes(skill);
        if (first) await say(who, W.CHARACTERS[who].lines);
        else if (!arriving) ui.toast(`<b>${W.CHARACTERS[who].name}:</b> Back again? Go on — the machine won’t fix itself.`);
        if (skill && !state.learned.includes(skill)) await learn(skill);
        if (first && skill && state.learned.includes(skill) && !state.equipped.includes(skill) && R.TOOLS.includes(skill)) {
          const out = await ui.choice('Your tool slots are full', state.equipped.map((s) => ({ label: `Swap out ${W.SKILLS[s].cmd}`, html: `🔁 Swap out <code>${W.SKILLS[s].cmd}</code> for <code>${W.SKILLS[skill].cmd}</code>`, value: s }))
            .concat([{ label: 'Keep my loadout', html: '✋ Keep my loadout (swap later in Pip → Items)', value: null }]),
            `You have ${state.equipped.length} slots. A RAM stick adds one. Which tool should make room for ${W.SKILLS[skill].cmd}?`);
          if (out) { state.equipped[state.equipped.indexOf(out)] = skill; toolsChanged(); save(); }
        }
      }
      // Power Rail: the first time the Colonel walks up to the gap, Pip teaches echo.
      function gapCheck() {
        if (roomId !== 'f1' || lock || state.learned.includes('echo') || !state.learned.includes('kill') || !sim || ui.busy()) return;
        const P = sim.player; const TL = CK.Rooms.TILE; let close = false;
        room.tiles.forEach((row, ty) => row.forEach((c, tx) => { if (c === '_' && Math.hypot(tx * TL + 8 - P.x, ty * TL + 8 - P.y) <= 3 * TL + 2) close = true; }));
        if (close) busy(async () => { await say('pip', LINES.echoGap); await learn('echo'); });
      }
      function item(node) {
        if (typeof node.ref === 'string') {
          R.installModule(state, node.ref); const mod = W.MODULES[node.ref];
          ui.toast(`${mod.icon} Found a <b>${mod.name}</b> — installed! ${mod.real}`); sound('win'); toolsChanged();
        } else { state.bits += node.ref.bits; ui.toast(`💎 Hidden cache: <b>+${node.ref.bits} bits</b>`); sound('good'); }
        save();
      }
      async function memory(node) {
        if (!state.memories.includes(node.ref)) state.memories.push(node.ref);
        const rw = R.reward(state, 'memory'); xp(rw.xp); sound('good');
        ui.toast(`✦ Memory fragment recovered <br><code>${node.ref.replace(/</g, '&lt;')}</code>`);
        if (state.memories.length === 1) await say('pip', ['A memory! It looks like a kernel log line — the kind `dmesg` prints on a real Linux machine.', 'Why would YOU remember kernel logs, Colonel…? Don’t answer that. It’s a little creepy.']);
        claim(); save();
      }
      async function exit() {
        if (state.region !== 'firmware') return;
        R.enterRegion(state, 'grub'); save();
        enterRoom(state.node, null);
        await intro();
      }
      async function intro() {
        const region = reg();
        await ui.banner(region.name, state.region === 'firmware' ? 'Chapter 1 · Boot Sequence' : 'Region 2');
        if (state.region === 'firmware' && !state.seenIntro) await say('colonel', ['…where… am I? Who am I?', 'Everything’s dark. Something is humming next to me.']);
        await say('pip', region.intro);
        state.seenIntro = true; save();
      }

      // ---- fights -----------------------------------------------------------------------------------------
      const teacherOf = (skill) => W.SKILLS[skill].teacher;
      async function problemEntry() {
        state.stats.fights++;
        if (!state.learned.includes('trap')) { // the first problem room: Pip teaches the parry before the creatures wake
          await say('pip', ['Creatures ahead — and they shoot signals. Lesson three: trap. In bash, `trap` runs your handler when a signal arrives.',
            'Down here: time it right and you catch what they throw and send it back. Mistime it and you’re open for a moment. A red ! means a lunge is coming.']);
          await learn('trap');
        }
      }
      function reapplyDoors() { if (room) applyDoors(); }
      function onClear() {
        const node = reg().nodes[roomId]; const clean = sim.clean;
        busy(async () => {
          state.stats.wins++;
          if (node.kind === 'problem') {
            const rw = R.clearRoom(state, roomId, { clean }); xp(rw.xp); sound('win');
            ui.toast(rw.clean ? `🧼 <b>Clean fix — no hits!</b> +${rw.bits} bits` : `⚔️ Room cleared! +${rw.bits} bits`);
            reapplyDoors(); save();
            const c = W.CREATURES[node.ref.creature];
            await say(teacherOf(c.weak), ['In real Linux: ' + (rw.clean ? node.ref.real : c.real)]);
            claim();
          } else if (node.kind === 'boss') {
            const c = W.CREATURES[node.ref.creature];
            bossFight = false; R.clear(state, roomId); const rw = R.reward(state, 'boss'); xp(rw.xp);
            R.installModule(state, node.ref.drop); const mod = W.MODULES[node.ref.drop];
            ui.toast(`${mod.icon} <b>${mod.name}</b> installed on your motherboard! ${mod.real}`); toolsChanged();
            const rr = R.reward(state, 'region'); xp(rr.xp);
            h.giveBadge(...BADGES[state.region]); sound('win');
            reapplyDoors(); save();
            await say('pip', reg().outro);
            await say(teacherOf(c.weak), ['In real Linux: ' + c.real]);
            claim();
          }
        });
      }
      function onLose() {
        lock++; sound('bad');
        setTimeout(() => {
          lock--; if (!cur) return;
          bossFight = false;
          state.region = state.checkpoint.region; state.node = state.checkpoint.node; state.prev = null; R.reveal(state, state.node);
          save(); enterRoom(state.node, null);
          ui.toast('💥 Stability lost — rebooting at the last checkpoint. Your loot is safe. Your dignity, less so. You’ve got this.');
          refresh();
        }, 1600);
      }
      // The boss's door asks first; "Not yet" steps back, "Fight!" seals every door until it's over.
      function bossDoor(side, to) {
        busy(async () => {
          const c = W.CREATURES[reg().nodes[to].ref.creature];
          const pick = await ui.choice('☠ ' + c.name, [{ label: 'Fight!', html: '⚔️ Fight!', value: 'fight', primary: true }, { label: 'Not yet', html: '↩ Not yet — step back', value: 'back' }],
            `Pip: “That’s the ${c.name}. ${c.weakText}”` + (c.cloaked && !state.equipped.includes('ls') ? ' ⚠ You don’t have ls equipped — you won’t be able to see it! Step back and equip it in Pip → Items.' : ''));
          if (pick !== 'fight') {
            const IN = { n: [0, 1], s: [0, -1], w: [1, 0], e: [-1, 0] }[side];
            scene.place(sim.player.x + IN[0] * 24, sim.player.y + IN[1] * 24); return;
          }
          const r = R.move(state, to); if (!r.ok) return;
          bossFight = true; state.stats.fights++; save(); enterRoom(to, OPP[side]);
        });
      }

      // ---- tools in rooms: ls pulses, broken circuits, terminals, path signs, loop doors ------------------
      function onPulse() {
        const node = reg().nodes[roomId];
        if (node.dark && scene) scene.light(20);
        const r = R.useOnMap(state, 'ls'); if (!r.ok) return;
        const found = (r.revealed || []).filter((id) => reg().nodes[id].hidden && R.neighbors(reg(), roomId).includes(id));
        if (found.length) {
          reapplyDoors();
          for (const id of found) {
            const side = R.sideOf(reg(), roomId, id);
            if (side && room.doors[side] && !sim.breakables.some((b) => b.id === 'door-' + side)) sim.breakables.push({ id: 'door-' + side, tiles: room.doors[side].tiles.map((t) => t.slice()) });
          }
          ui.toast('🔦 <code>ls -a</code> found a cracked wall. <code>kill</code> should open it.');
        }
        save();
      }
      function startPuzzle() {
        const node = reg().nodes[roomId];
        if (node.kind !== 'circuit' || R.isCleared(state, roomId) || puzzle) return;
        ui.prompt(null); input.showUse(null); input.clear();
        const grid = CK.Puzzle.scramble(JSON.parse(JSON.stringify(node.ref.grid)), CK.rng((Date.now() % 100000) + 3));
        puzzle = CK.PuzzleScene.create({ engine, canvas, host: host.querySelector('.ck-ui-host'), grid, solution: node.ref.grid, accent: node.accent || reg().accent,
          sfx: (t) => sound(t === 'win' ? 'win' : 'pop'),
          onSolved: () => {
            endPuzzle(); R.clear(state, roomId); const rw = R.reward(state, 'puzzle'); xp(rw.xp);
            const t = room.props.find((p) => p.kind === 'terminal'); if (t) t.broken = false;
            reapplyDoors(); ui.toast(`⚡ Circuit restored! +${rw.bits} bits`); claim(); save(); refresh();
          },
          onLeave: () => endPuzzle(),
        });
        ui.action(false); engine.setScene(puzzle);
      }
      function endPuzzle() { if (!puzzle) return; puzzle.destroy(); puzzle = null; engine.setScene(scene); ui.action(true); input.clear(); }
      function needCd(what) {
        if (!state.learned.includes('cd')) { ui.toast(`🌀 The ${what} blinks at you. Someone at the GRUB Gate could show you how it works.`); return true; }
        if (!state.equipped.includes('cd')) { ui.toast(`🌀 Equip <code>cd</code> in Pip → Items to use ${what === 'sign' ? 'path signs' : 'terminals'}.`); return true; }
        return false;
      }
      function cdTerminal() {
        if (needCd('terminal')) return;
        const targets = R.travelTargets(state);
        if (!targets.length) { ui.toast('🌀 Nowhere to jump yet — visit more safe rooms first.'); return; }
        busy(async () => {
          const region = reg(); const nm = (t) => region.nodes[t].label.replace(/\s+/g, '_');
          const pick = await ui.choice('🌀 cd — fast travel', targets.map((t) => ({ label: `cd ${nm(t)}`, html: `<code>cd ${nm(t)}</code>`, value: t })).concat([{ label: 'Cancel', value: null }]));
          if (pick && R.fastTravel(state, pick)) { R.reveal(state, pick); state.checkpoint = { region: state.region, node: pick }; save(); enterRoom(pick, null); sound('pop'); }
        });
      }
      function pathSign() {
        if (state.signs.includes(roomId)) { ui.toast('🪧 The sign now reads <code>/boot</code>. The loop is broken.'); return; }
        if (needCd('sign')) return;
        busy(async () => {
          const opt = (p, v) => ({ label: `cd ${p}`, html: `<code>cd ${p}</code>`, value: v });
          const pick = await ui.choice('🪧 Path sign — where does the kernel live?', [opt('/loop/loop/loop', 'loop'), opt('/boot', 'boot'), opt('/dev/null', 'null'), { label: 'Cancel', value: null }],
            'Something keeps rewriting GRUB’s paths into loops. Pick the folder that really holds the kernel.');
          if (pick === 'boot') { state.signs.push(roomId); save(); reapplyDoors(); sound('win'); await say('grub', ['That’s it — /boot is where the kernel (vmlinuz) and initramfs live.']); }
          else if (pick === 'null') await say('pip', ['/dev/null discards everything written to it. Including us, probably.']);
          else if (pick === 'loop') await say('pip', ['That directory doesn’t exist. Thankfully.']);
        });
      }
      function loopBack() {
        const back = entrySide ? CK.Rooms.entryPoint(room, entrySide) : { x: room.player.x, y: room.player.y };
        scene.place(back.x, back.y);
        if (!firsts.loop) { firsts.loop = true; busy(() => say('pip', ['We just… came back. Boot loop. Find the path sign and cd somewhere sensible.'])); }
        else ui.toast('🔁 …and we’re back where we started.');
      }

      // ---- resting and NullNux ------------------------------------------------------------------------
      function canRest() {
        const n = reg().nodes[state.node];
        return !!state.story.restUnlocked && !puzzle && !lock && !ui.busy() && !inFight() && R.SAFE[n.kind] && !state.story.glitched.includes(state.node);
      }
      let hudKey = '';
      function refresh() {
        const rest = canRest(); const key = [state.region, state.bits, state.memories.length, rest].join('|');
        if (key !== hudKey) { hudKey = key; ui.hud(state, { canRest: rest }); }
        if (remindPending && !lock && !ui.busy() && !inFight()) { remindPending = false; breakReminder(); }
      }
      async function wake(ev) {
        save(); enterRoom(state.node, null);
        const region = reg();
        if (ev.type === 'taken') {
          await ui.banner('…', 'You wake up', 1600);
          await say('pip', ['Colonel! Colonel, wake up! And no, I’m not being dramatic this time.', 'Lil Tux is gone. Home is… glitching. Everything was fine when you went to sleep.',
            'There’s a log line I don’t recognise: `' + S.TAKEN_LOG + '`', 'swapper/0? Nothing out here should be running as PID 0…', 'Whatever took him is still somewhere in this system. And nobody messes with our penguin. We’re going to find him.']);
          h.giveBadge(...BADGES.chapter); sound('win');
          await ui.banner('Chapter 1 Complete', 'Lil Tux is missing', 3200);
          await say('pip', ['Next: the Kernel Core — processes, the scheduler… and maybe some answers. You rest. I’ll keep watch. PID 1 doesn’t get naps.', 'Until then, try `ls -a`, `cd` and `sudo dmesg` in the real Terminal (dmesg may need sudo). Same commands as here. Well… minus the lasers.']);
          return;
        }
        ui.toast('😴 The Colonel wakes up feeling rested.');
        if (ev.type === 'rebreak') await say('pip', [`Huh. The ${region.nodes[ev.node].label} circuit is broken again. I could’ve sworn we fixed that… Did you sleepwalk? Kidding. Probably.`]);
        else if (ev.type === 'oddlog') { ui.toast(`✦ A strange line appeared in the logs:<br><code>${ev.line}</code>`); await say('pip', ['That’s not a boot message… Probably nothing. Probably.']); }
        if (state.story.flicker) { state.story.flicker = false; if (scene) scene.flicker(); }
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
          reminderOpen = false; remindPending = false; state.story.lastReminderMs = state.story.playMs;
        });
      }
      async function meetLilTux() {
        const st = state.story;
        if (st.liltuxTaken) { ui.toast('<b>Pip:</b> Home is cold and glitching. Lil Tux is gone… We’ll find him, Colonel.'); return; }
        if (st.liltuxMet && st.restUnlocked) { ui.toast('<b>Lil Tux:</b> Still here! Rest with 💤 whenever you like. I’ll keep watch. 🐧'); return; }
        if (!st.liltuxMet) { await say('liltux', W.CHARACTERS.liltux.lines); sound('win'); }
        if (!st.restUnlocked) {
          m.learning = 'rest'; m.learnExample = 'systemctl suspend';
          await ui.learn('rest', { id: 'rest', cmd: 'systemctl suspend', name: 'Rest', icon: '💤', teacher: 'liltux', learnTest: /^systemctl\s+suspend$/,
            real: '`systemctl suspend` puts a real Fedora computer to sleep. It wakes up right where you left off.', example: 'systemctl suspend', done: '💤 Rest unlocked! Use the 💤 Rest button in safe rooms — or just take a real break.' });
          m.learning = null; m.learnExample = null; xp(10);
        }
        if (!st.liltuxMet) { st.liltuxMet = true; xp(25); }
        save();
        const pick = await ui.choice('Lil Tux: “Rest now? I’ll keep watch.”', [{ label: 'Rest now', html: '💤 Rest now (<code>systemctl suspend</code>)', value: 'rest', primary: true }, { label: 'Not yet', html: '⏳ Not yet', value: null }]);
        if (pick === 'rest') { await ui.banner('💤 Resting…', 'systemctl suspend', 1800); await wake(S.rest(state, Math.random)); }
      }

      // ---- housekeeping ------------------------------------------------------------------------------
      async function busy(fn) {
        lock++; input.clear();
        try { await fn(); } finally { lock--; if (cur) { refresh(); save(); } }
      }
      function claim() {
        for (const id of R.claimTasks(state)) { const t = W.TASKS[id]; ui.toast(`✅ Task done for <b>${W.CHARACTERS[t.giver].name}</b>: ${t.text} <b>+${t.bits} bits</b>`); sound('good'); }
        if (state.stats.clean >= CLEAN_BADGE_AT) h.giveBadge(...BADGES.clean);
      }
      parts.intervals.push(setInterval(() => { if (cur && sim) { ui.actionTick(sim); gapCheck(); } }, 100));
      parts.intervals.push(setInterval(() => {
        if (!cur || document.hidden) return;
        if (S.addPlayTime(state, 1000) && !reminderOpen) remindPending = true;
        state.story.lastSeen = Date.now();
        refresh();
      }, 1000));
      function onVis() {
        if (document.hidden) { hiddenAt = Date.now(); state.story.lastSeen = hiddenAt; save(); return; }
        if (hiddenAt && S.restedWhileAway(state, Date.now()) && !lock) busy(async () => { await wake(S.rest(state, Math.random)); });
        hiddenAt = 0; state.story.lastSeen = Date.now();
      }
      function onHide() { state.story.lastSeen = Date.now(); save(); }
      document.addEventListener('visibilitychange', onVis); root.addEventListener('pagehide', onHide);
      parts.offs.push(() => { document.removeEventListener('visibilitychange', onVis); root.removeEventListener('pagehide', onHide); state.story.lastSeen = Date.now(); save(); });
      parts.offs.push(() => { if (puzzle) { puzzle.destroy(); puzzle = null; } });

      enterRoom(state.node, null);

      if (CK.PixEngine.debug) {
        CK._test = CK._test || {};
        CK._test.main = {
          get state() { return state; }, get room() { return room; }, get sim() { return sim; }, get scene() { return scene; }, get roomId() { return roomId; },
          engine, input, ui, events,
          sceneKind: () => (puzzle ? 'puzzle' : scene ? 'room' : 'none'),
          busy: () => lock > 0 || ui.busy(),
          get learning() { return m.learning; }, get learnExample() { return m.learnExample; },
          place: (x, y) => scene.place(x, y),
          // put the Colonel in a doorway so the real crossing code runs
          toDoor(side) {
            const d = room.doors[side]; if (!d) return false; const TL = CK.Rooms.TILE;
            const x = d.tiles.reduce((a, [tx]) => a + tx * TL + TL / 2, 0) / d.tiles.length; const y = d.tiles.reduce((a, [, ty]) => a + ty * TL + TL / 2, 0) / d.tiles.length;
            const at = { n: [x, 4], s: [x, room.h - 4], w: [4, y], e: [room.w - 4, y] }[side];
            scene.place(at[0], at[1]); return true;
          },
          clearFoes(o) { if (o && o.clean === false) sim.player.hitsTaken = Math.max(1, sim.player.hitsTaken); sim.enemies.forEach((e) => { e.hp = 0; e.dead = true; }); },
        };
      }
      busy(async () => {
        if (!state.seenIntro) await intro();
        else ui.toast(`Pip: Welcome back, Colonel. ${reg().name}. I kept the lights on. Mostly.`);
        if (state.story.newMoves) {
          ui.toast('New moves: <code>kill</code>, <code>trap</code>, dash');
          await say('pip', LINES.newMoves);
          state.story.newMoves = false; save();
        }
        if (restedAway) await wake(S.rest(state, Math.random));
      });
    }
  };

  CK.close = function () {
    if (!cur) return;
    const c = cur; cur = null;
    try { if (root.speechSynthesis) root.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    try { c.cleanup(); } finally {
      if (c.engine) c.engine.destroy();
      if (c.input) c.input.destroy();
      if (c.ui) c.ui.destroy();
      c.host.remove();
      document.body.classList.remove('ck-open');
      if (CK._test) CK._test.main = null;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
