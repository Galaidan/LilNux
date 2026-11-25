/* LilNux — game engine: players, worlds, steps, XP, badges. */
(function () {
  'use strict';

  const WORLDS = window.LILNUX_WORLDS;
  const CHEATS = window.LILNUX_CHEATS;
  const { esc } = window.LilShellUtil;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const app = $('#app');
  const top = $('#top');
  const KEY = 'lilnux.save.v1';
  const AVATARS = ['🐧', '🦊', '🐱', '🐶', '🦄', '🐼', '🐸', '🦉', '🐢', '🦖', '🐙', '🦁', '🐰', '🚀', '🌟', '🎸'];
  const RANKS = [[0, 'Newbie Penguin'], [100, 'Curious Penguin'], [250, 'Desktop Explorer'], [450, 'Terminal Tourist'], [700, 'Command Wizard'], [1000, 'Package Pro'], [1400, 'Linux Legend']];
  const SPECIAL_BADGES = [
    { id: 'treasure', emoji: '🏴‍☠️', name: 'Treasure Hunter', how: 'Find the hidden treasure file' },
    { id: 'sudo', emoji: '🦸', name: 'Sudo Superhero', how: 'Use sudo for the first time' },
    { id: 'cow', emoji: '🐮', name: 'Cow Whisperer', how: 'Make the cow talk' },
    { id: 'pipe', emoji: '🔗', name: 'Pipe Plumber', how: 'Join two commands with |' },
    { id: 'perfect', emoji: '💯', name: 'Perfect Penguin', how: 'Finish a world with zero mistakes' },
    { id: 'quester', emoji: '🏡', name: 'Real-World Quester', how: 'Complete 10 real-computer quests' },
    { id: 'explorer', emoji: '🧪', name: 'Sandbox Scientist', how: 'Run 25 commands in Free Play' },
    { id: 'legend', emoji: '🎓', name: 'Graduate', how: 'Finish every world' },
    { id: 'ck-r1', emoji: '🔥', name: 'Firmware Fixer', how: 'Colonel Kernel: restore the Firmware Foundry' },
    { id: 'ck-r2', emoji: '🐛', name: 'Bootloader Boss', how: 'Colonel Kernel: restore the GRUB Gate' },
    { id: 'ck-clean', emoji: '🧼', name: 'Clean Fixer', how: 'Colonel Kernel: 3 clean fixes' },
    { id: 'ck-ch1', emoji: '🎖️', name: 'Chapter 1: Boot Sequence', how: 'Colonel Kernel: finish chapter 1' },
  ];
  const TUX = `<svg class="tux-svg" viewBox="0 0 120 140" aria-hidden="true"><ellipse cx="40" cy="130" rx="17" ry="7" fill="#f5a623"/><ellipse cx="80" cy="130" rx="17" ry="7" fill="#f5a623"/><ellipse cx="22" cy="88" rx="10" ry="26" fill="#1a1a1a" transform="rotate(18 22 88)"/><ellipse cx="98" cy="88" rx="10" ry="26" fill="#1a1a1a" transform="rotate(-18 98 88)"/><ellipse cx="60" cy="82" rx="38" ry="48" fill="#222"/><ellipse cx="60" cy="94" rx="26" ry="34" fill="#fafafa"/><ellipse cx="48" cy="58" rx="9" ry="11" fill="#fff"/><ellipse cx="72" cy="58" rx="9" ry="11" fill="#fff"/><circle class="tux-eye" cx="50" cy="60" r="4.5" fill="#111"/><circle class="tux-eye" cx="70" cy="60" r="4.5" fill="#111"/><circle cx="51.5" cy="58" r="1.4" fill="#fff"/><circle cx="71.5" cy="58" r="1.4" fill="#fff"/><path d="M47 70 Q60 63 73 70 Q60 82 47 70Z" fill="#f5a623"/><circle cx="38" cy="72" r="4" fill="#ff8fa3" opacity=".55"/><circle cx="82" cy="72" r="4" fill="#ff8fa3" opacity=".55"/><ellipse cx="60" cy="36" rx="40" ry="7" fill="#294172"/><path d="M36 36 Q34 10 60 11 Q86 10 84 36 Z" fill="#3c6eb4"/><path d="M50 14 Q60 20 70 14" stroke="#294172" stroke-width="3" fill="none"/><path d="M36 30 Q60 25 84 30 L84 35 Q60 31 36 35 Z" fill="#51a2da"/></svg>`;

  // ---------------------------------------------------------------- storage
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.players)) return s; } catch (e) { /* ignore */ }
    return { players: [], current: null, sound: true };
  }
  let S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode etc. */ } }
  const me = () => S.players.find((p) => p.id === S.current) || null;
  const rankOf = (xp) => RANKS.filter((r) => xp >= r[0]).pop()[1];
  const nextRank = (xp) => RANKS.find((r) => r[0] > xp);
  const unixName = (name) => { let u = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); if (!/^[a-z]/.test(u)) u = 'user' + u; return u.slice(0, 16) || 'friend'; };
  const worldDone = (p, id) => !!(p.worlds[id] && p.worlds[id].stars > 0);
  const unlocked = (p, i) => p.unlockAll || i === 0 || worldDone(p, WORLDS[i - 1].id);

  // ---------------------------------------------------------------- sound, speech, fx
  let AC = null;
  function tone(seq) {
    if (!S.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      let t = AC.currentTime;
      for (const [f, d] of seq) {
        const o = AC.createOscillator(); const g = AC.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.05); t += d * 0.8;
      }
    } catch (e) { /* no audio */ }
  }
  const SFX = { good: () => tone([[660, 0.12], [880, 0.2]]), bad: () => tone([[200, 0.25]]), win: () => tone([[523, 0.13], [659, 0.13], [784, 0.13], [1047, 0.4]]), pop: () => tone([[520, 0.06]]) };
  const canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  function speak(html) {
    if (!canSpeak) return;
    try {
      const d = document.createElement('div'); d.innerHTML = html;
      let text = d.textContent.replace(/~/g, ' tilde ').replace(/\s+/g, ' ');
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; u.pitch = 1.1;
      window.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }
  function stopSpeak() { try { if (canSpeak) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function confetti(n) {
    if (reduceMotion) return;
    const colors = ['#3c6eb4', '#51a2da', '#f6d32d', '#2ec27e', '#e66100', '#c061cb', '#ff7b9c'];
    const box = document.createElement('div'); box.className = 'confetti';
    for (let i = 0; i < (n || 80); i++) {
      const s = document.createElement('i');
      s.style.left = Math.random() * 100 + 'vw'; s.style.background = colors[i % colors.length];
      s.style.animationDelay = Math.random() * 0.6 + 's'; s.style.animationDuration = 1.8 + Math.random() * 1.4 + 's';
      s.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3800);
  }
  function toast(html, cls) {
    const t = document.createElement('div'); t.className = 'toast ' + (cls || ''); t.innerHTML = html;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3200);
  }
  function shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------------------------------------------------------------- XP & badges
  function addXP(n, why) {
    const p = me(); if (!p || !n) return;
    const before = rankOf(p.xp);
    p.xp += n; save(); renderTop();
    const pop = document.createElement('div'); pop.className = 'xp-pop'; pop.textContent = `+${n} XP`; document.body.appendChild(pop); setTimeout(() => pop.remove(), 1200);
    if (run) run.xp += n;
    const after = rankOf(p.xp);
    if (after !== before) { toast(`🎉 New rank: <b>${esc(after)}</b>!`, 'gold'); SFX.win(); }
    void why;
  }
  function giveBadge(id, emoji, name) {
    const p = me(); if (!p || p.badges.includes(id)) return false;
    p.badges.push(id); save();
    toast(`<span class="big">${emoji}</span> Badge earned: <b>${esc(name)}</b>`, 'gold');
    return true;
  }
  function checkSpecials(sh) {
    if (!sh) return;
    const last = sh.last;
    if (sh.flags.treasure) giveBadge('treasure', '🏴‍☠️', 'Treasure Hunter');
    if (last.some((r) => r.sudo && r.ok)) giveBadge('sudo', '🦸', 'Sudo Superhero');
    if (last.some((r) => (r.name === 'cowsay' || r.name === 'cowthink') && r.ok)) giveBadge('cow', '🐮', 'Cow Whisperer');
    if (sh.hist.length && /\|(?!\|)/.test(sh.hist[sh.hist.length - 1]) && last.length > 1 && last.every((r) => r.ok)) giveBadge('pipe', '🔗', 'Pipe Plumber');
  }

  // ---------------------------------------------------------------- top bar
  function renderTop() {
    const p = me();
    if (!p) { top.innerHTML = `<div class="brand"><span class="logo">${TUX}</span><span>LilNux</span></div><div class="top-actions">${soundBtn()}</div>`; return; }
    const nr = nextRank(p.xp);
    const prevXP = RANKS.filter((r) => p.xp >= r[0]).pop()[0];
    const pct = nr ? Math.round(((p.xp - prevXP) / (nr[0] - prevXP)) * 100) : 100;
    top.innerHTML = `
      <button class="brand" data-go="hub" title="Choose a mode"><span class="logo">${TUX}</span><span>LilNux</span></button>
      <div class="mode-switch" role="group" aria-label="Game mode">
        <button data-go="map" class="${LEARN_VIEWS.includes(view) ? 'on' : ''}" title="Learn mode: lessons, quizzes and terminal missions">📚<span class="lbl"> Learn</span></button>
        <button data-go="kernel" class="${view === 'kernel' ? 'on' : ''}" title="Adventure mode: the Colonel Kernel videogame">🎮<span class="lbl"> Adventure</span></button>
      </div>
      <nav class="top-actions">
        <button class="ghost" data-go="sandbox" title="Free play terminal">🧪<span class="lbl"> Free Play</span></button>
        <button class="ghost" data-go="cheats" title="Cheat sheet">📜<span class="lbl"> Cheat Sheet</span></button>
        <button class="ghost" data-go="badges" title="Badges">🏅<span class="lbl"> Badges</span></button>
        ${soundBtn()}
        <button class="player-chip" data-go="players" title="Switch player">
          <span class="av">${p.avatar}</span>
          <span class="pc-text"><b>${esc(p.name)}</b><small>${esc(rankOf(p.xp))} · ${p.xp} XP</small><span class="xpbar"><i style="width:${pct}%"></i></span></span>
        </button>
      </nav>`;
  }
  const soundBtn = () => `<button class="ghost" data-act="sound" title="Sound on/off" aria-pressed="${S.sound}">${S.sound ? '🔊' : '🔇'}</button>`;

  // ---------------------------------------------------------------- router
  let run = null; // current world run
  let sandbox = null; // free play shell
  let view = 'players';
  const LEARN_VIEWS = ['map', 'world', 'sandbox', 'cheats', 'certificate'];
  function go(where, arg) {
    stopSpeak();
    if (where !== 'world') run = null;
    if (where !== 'kernel' && window.CK && CK.close) CK.close();
    if (!me() && where !== 'players') where = 'players';
    window.scrollTo(0, 0);
    view = where;
    ({ hub: renderHub, players: renderPlayers, map: renderMap, sandbox: renderSandbox, cheats: renderCheats, badges: renderBadges, world: startWorld, certificate: renderCertificate, kernel: openKernel })[where](arg);
    renderTop();
  }

  // ---------------------------------------------------------------- mode choice: Learn or Adventure
  function adventureStatus(p) {
    const ck = p.ck;
    if (!ck || !ck.seenIntro) return 'Not started yet — Chapter 1 awaits.';
    if (ck.story && ck.story.liltuxTaken) return 'Chapter 1 complete — Lil Tux is missing!';
    const names = { firmware: 'Firmware Foundry', grub: 'GRUB Gate' };
    return `Chapter 1 · ${names[ck.region] || 'in progress'} · ${(ck.memories || []).length}/10 memories`;
  }
  function renderHub() {
    const p = me();
    const done = WORLDS.filter((w) => worldDone(p, w.id)).length;
    app.innerHTML = `
      <section class="hub">
        <h1>Hi ${esc(p.name)} ${p.avatar} — what do you want to play?</h1>
        <p class="lead">LilNux has two parts. Both teach real Fedora &amp; Linux, and both share your XP, rank and badges.</p>
        <div class="hub-grid">
          <article class="hub-card learn" data-go="map">
            <div class="hub-art">${TUX}</div>
            <span class="hub-kicker">📚 Learn mode</span>
            <h2>LilNux Academy</h2>
            <p>Short lessons, quizzes and pretend-terminal missions with Lil Tux. Learn Fedora one step at a time.</p>
            <ul><li>8 worlds, from the desktop to <code>sudo</code></li><li>Quizzes, matching games &amp; real commands</li><li>Great for all ages · Kid mode &amp; read-aloud</li></ul>
            <span class="hub-progress">⭐ ${done}/${WORLDS.length} worlds done</span>
            <button class="primary" data-go="map">Start learning →</button>
          </article>
          <article class="hub-card adventure" data-go="kernel">
            <canvas class="hub-preview" aria-hidden="true"></canvas>
            <span class="hub-kicker">🎮 Adventure mode</span>
            <h2>Colonel Kernel</h2>
            <p>A neon videogame. Explore a broken computer, learn real commands as powers, beat glitchy bosses — and save Lil Tux.</p>
            <ul><li>Room-to-room action: dash, parry &amp; boss fights</li><li>Upgrades, secrets &amp; a sarcastic sidekick</li><li>Best for ages 12+ · play sideways on a phone</li></ul>
            <span class="hub-progress">${esc(adventureStatus(p))}</span>
            <button class="primary neon" data-go="kernel">Play adventure →</button>
          </article>
        </div>
      </section>`;
    drawHubPreview($('.hub-preview'));
  }
  // The Adventure card's picture: the Colonel, Pip and Lil Tux as pixel art on a slice of circuit plaza.
  function drawHubPreview(c) {
    if (!c || !window.CK || !CK.Sprites || !CK.Pixel) return;
    const w = c.clientWidth || 320; const h = c.clientHeight || 150;
    const k = Math.max(2, Math.round(h / 60)); const bw = Math.ceil(w / k); const bh = Math.ceil(h / k);
    c.width = bw * k; c.height = bh * k;
    const buf = document.createElement('canvas'); buf.width = bw; buf.height = bh; const g = buf.getContext('2d');
    g.fillStyle = '#060a1c'; g.fillRect(0, 0, bw, bh);
    g.fillStyle = '#a9e4d6'; g.fillRect(0, Math.round(bh * 0.55), bw, bh); g.fillStyle = '#7fbfb3'; g.fillRect(0, Math.round(bh * 0.55), bw, 1);
    for (let x = 6; x < bw; x += 24) { g.fillStyle = '#74b3a8'; g.fillRect(x, Math.round(bh * 0.7), 12, 1); }
    const S = CK.Sprites.built(); const feet = Math.round(bh * 0.86);
    CK.Pixel.draw(g, S.colonel_down_0, Math.round(bw * 0.42), feet);
    CK.Pixel.draw(g, S.pip, Math.round(bw * 0.27), Math.round(bh * 0.45));
    CK.Pixel.draw(g, S.liltux, Math.round(bw * 0.68), feet);
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(buf, 0, 0, bw * k, bh * k);
  }

  // ---------------------------------------------------------------- Colonel Kernel (videogame mode)
  function openKernel() {
    renderHub();
    if (!window.CK || !CK.open) { toast('Colonel Kernel could not load.'); return; }
    CK.open({
      root: document.body, player: me(), save, addXP, giveBadge, speak,
      sound: SFX, soundOn: () => S.sound, onExit: () => go('hub'),
    });
  }

  // ---------------------------------------------------------------- players screen
  function renderPlayers(editId) {
    const list = S.players.slice().sort((a, b) => b.xp - a.xp);
    const editing = editId ? S.players.find((p) => p.id === editId) : null;
    app.innerHTML = `
      <section class="hero">
        <div class="hero-tux">${TUX}</div>
        <div>
          <h1>Welcome to <span class="grad">LilNux</span>!</h1>
          <p class="lead">A family game for learning <b>Fedora 44 Workstation</b> and <b>Linux</b> — the desktop, files, the terminal and installing software. Pick who’s playing!</p>
        </div>
      </section>
      ${list.length ? `<h2 class="sec">👪 Who’s playing?</h2>
      <div class="players">${list.map((p, i) => `
        <div class="player ${p.id === S.current ? 'current' : ''}">
          <button class="player-main" data-play="${p.id}">
            <span class="medal">${['🥇', '🥈', '🥉'][i] || ''}</span>
            <span class="pav">${p.avatar}</span>
            <b>${esc(p.name)}</b>
            <small>${esc(rankOf(p.xp))}</small>
            <small>${p.xp} XP · ${WORLDS.filter((w) => worldDone(p, w.id)).length}/${WORLDS.length} worlds · ${p.badges.length} 🏅</small>
            ${p.kid ? '<span class="tag">Kid mode</span>' : ''}
          </button>
          <div class="player-tools"><button class="mini" data-edit="${p.id}" title="Edit">✏️</button><button class="mini" data-del="${p.id}" title="Remove">🗑️</button></div>
        </div>`).join('')}
      </div>` : ''}
      <form class="panel add-player" id="pform">
        <h2>${editing ? '✏️ Edit player' : '➕ Add a family member'}</h2>
        <label class="field">Name <input name="name" maxlength="20" required placeholder="e.g. Mom, Dad, Sam" value="${editing ? esc(editing.name) : ''}" autocomplete="off"></label>
        <div class="field">Pick an avatar
          <div class="avatars">${AVATARS.map((a, i) => `<label><input type="radio" name="avatar" value="${a}" ${(editing ? editing.avatar === a : i === S.players.length % AVATARS.length) ? 'checked' : ''}><span>${a}</span></label>`).join('')}</div>
        </div>
        <label class="check"><input type="checkbox" name="kid" ${editing && editing.kid ? 'checked' : ''}> <span><b>Kid mode</b> — hints are free (no lost stars) and grown‑up extra tips are hidden. Great for younger players!</span></label>
        <div class="row">
          <button class="primary" type="submit">${editing ? 'Save' : 'Add player'}</button>
          ${editing ? '<button type="button" class="ghost" data-go="players">Cancel</button>' : ''}
        </div>
      </form>
      <p class="note">🔒 Progress is saved only in this web browser on this computer. Nothing is sent anywhere.</p>`;
    $('#pform').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const name = String(f.get('name') || '').trim();
      if (!name) return;
      if (editing) { editing.name = name; editing.avatar = f.get('avatar') || editing.avatar; editing.kid = !!f.get('kid'); }
      else {
        const p = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, avatar: f.get('avatar') || '🐧', kid: !!f.get('kid'), xp: 0, worlds: {}, quests: {}, badges: [], unlockAll: false, sandboxCount: 0 };
        S.players.push(p); S.current = p.id; save(); SFX.win(); go('hub'); return;
      }
      save(); go('players');
    });
  }

  // ---------------------------------------------------------------- map
  function renderMap() {
    const p = me();
    const totalStars = WORLDS.reduce((s, w) => s + ((p.worlds[w.id] || {}).stars || 0), 0);
    const allDone = WORLDS.every((w) => worldDone(p, w.id));
    const nextW = WORLDS.findIndex((w, i) => unlocked(p, i) && !worldDone(p, w.id));
    app.innerHTML = `
      <div class="mode-banner learn"><span><b>📚 Learn mode</b> · LilNux Academy — lessons, quizzes and terminal missions</span><button class="ghost" data-go="kernel">Switch to 🎮 Adventure</button></div>
      <section class="map-head">
        <div class="bubble-row"><div class="tux small">${TUX}</div>
          <div class="bubble"><b>Hi ${esc(p.name)}! ${p.avatar}</b><br>${allDone ? 'You finished every world — you’re a Linux Legend! Replay worlds for 3 stars, or try Free Play.' : nextW >= 0 ? `Next stop: <b>${WORLDS[nextW].emoji} ${esc(WORLDS[nextW].title)}</b>. Click it to start!` : 'Pick a world to play!'}</div>
        </div>
        <div class="stats"><span>⭐ ${totalStars}/${WORLDS.length * 3}</span><span>🏅 ${p.badges.length}</span><span>⚡ ${p.xp} XP</span></div>
      </section>
      <div class="worlds">${WORLDS.map((w, i) => {
        const st = (p.worlds[w.id] || {}).stars || 0; const lock = !unlocked(p, i);
        const q = (p.quests[w.id] || []).length;
        return `<button class="world ${lock ? 'locked' : ''} ${i === nextW ? 'next' : ''}" style="--wc:${w.color}" data-world="${w.id}" ${lock ? 'aria-disabled="true"' : ''}>
          <span class="wnum">World ${i + 1}</span>
          <span class="wemoji">${lock ? '🔒' : w.emoji}</span>
          <b>${esc(w.title)}</b>
          <small>${esc(w.blurb)}</small>
          <span class="stars" aria-label="${st} of 3 stars">${'★'.repeat(st)}<span class="off">${'★'.repeat(3 - st)}</span></span>
          ${worldDone(p, w.id) ? `<span class="qcount">🏠 ${q}/${w.quests.length} real quests</span>` : ''}
        </button>`;
      }).join('')}</div>
      <div class="map-foot">
        ${allDone ? '<button class="primary" data-go="certificate">🎓 Print my certificate</button>' : ''}
        <button class="ghost" data-go="kernel">🎮 Switch to Adventure</button>
        <button class="ghost" data-go="sandbox">🧪 Free Play terminal</button>
        <button class="ghost" data-go="cheats">📜 Cheat sheet</button>
        ${!p.unlockAll && !allDone ? '<button class="ghost" data-act="unlock">🔓 Unlock all worlds</button>' : ''}
      </div>`;
  }

  // ---------------------------------------------------------------- world runner
  function startWorld(id) {
    const p = me();
    const idx = WORLDS.findIndex((w) => w.id === id);
    if (idx < 0) return go('map');
    if (!unlocked(p, idx)) { toast('🔒 Finish the world before this one first!'); return go('map'); }
    run = { world: WORLDS[idx], idx, i: 0, mistakes: 0, xp: 0, shell: null };
    renderStep();
  }
  function stepFrame(inner) {
    const w = run.world; const n = w.steps.length;
    app.innerHTML = `
      <div class="level-head" style="--wc:${w.color}">
        <button class="ghost" data-go="map" title="Back to map">← Map</button>
        <div class="lh-title">${w.emoji} ${esc(w.title)}</div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${run.i}"><i style="width:${(run.i / n) * 100}%"></i></div>
        <span class="lh-count">${run.i + 1}/${n}</span>
      </div>
      <div class="stage" style="--wc:${w.color}">${inner}</div>`;
  }
  function next() {
    stopSpeak();
    run.i++;
    if (run.i >= run.world.steps.length) return finishWorld();
    window.scrollTo(0, 0);
    renderStep();
  }
  function mistake() { run.mistakes++; SFX.bad(); }
  const kid = () => !!(me() && me().kid);

  function renderStep() {
    const s = run.world.steps[run.i];
    ({ card: stepCard, quiz: stepQuiz, match: stepMatch, order: stepOrder, type: stepType, terminal: stepTerminal })[s.type](s);
  }

  function stepCard(s) {
    const more = !kid() && s.more ? `<div class="more">🎓 <b>Grown‑up tip:</b> ${s.more}</div>` : '';
    stepFrame(`
      <article class="card lesson">
        <div class="bubble-row">
          <div class="tux">${TUX}</div>
          <div class="bubble big">
            <h2><span class="cemoji">${s.emoji || '💡'}</span> ${esc(s.title)}</h2>
            <div class="txt">${s.text}</div>
            ${more}
          </div>
        </div>
        <div class="actions">
          ${canSpeak ? '<button class="ghost" data-act="speak">🔊 Read to me</button>' : ''}
          <button class="primary" data-act="next" autofocus>Next ➜</button>
        </div>
      </article>`);
    run.speakText = `${s.title}. ${s.text} ${!kid() && s.more ? s.more : ''}`;
    $('[data-act=next]').focus();
  }

  function stepQuiz(s) {
    const order = shuffle(s.options.map((o, i) => i));
    let tries = 0; let done = false;
    stepFrame(`
      <article class="card quiz">
        <div class="qhead"><span class="qbadge">❓ Quiz</span>${canSpeak ? '<button class="ghost mini-btn" data-act="speak">🔊</button>' : ''}</div>
        <h2 class="q">${esc(s.q)}</h2>
        <div class="options">${order.map((oi, k) => `<button class="opt" data-opt="${oi}"><span class="key">${'ABCD'[k]}</span><span>${esc(s.options[oi])}</span></button>`).join('')}</div>
        <div class="feedback" aria-live="polite"></div>
        <div class="actions"><button class="primary hidden" data-act="next">Next ➜</button></div>
      </article>`);
    run.speakText = s.q + '. ' + order.map((oi, k) => 'ABCD'[k] + ': ' + s.options[oi]).join('. ');
    $$('.opt').forEach((b) => b.addEventListener('click', () => {
      if (done) return;
      const oi = +b.dataset.opt;
      if (oi === s.answer) {
        done = true; b.classList.add('right'); $$('.opt').forEach((x) => (x.disabled = true));
        $('.feedback').innerHTML = `<div class="good">✅ ${tries ? 'Got it!' : 'Correct!'} ${esc(s.explain || '')}</div>`;
        SFX.good(); addXP(tries ? 5 : 10);
        const n = $('[data-act=next]'); n.classList.remove('hidden'); n.focus();
      } else {
        tries++; mistake(); b.classList.add('wrong'); b.disabled = true; shake(b);
        $('.feedback').innerHTML = `<div class="bad">Not quite — try again! 💪</div>`;
      }
    }));
  }

  function stepMatch(s) {
    const right = shuffle(s.pairs.map((p, i) => i));
    let selL = null; let matched = 0;
    stepFrame(`
      <article class="card match">
        <div class="qhead"><span class="qbadge">🔗 Match</span></div>
        <h2 class="q">${esc(s.title)}</h2>
        <p class="sub">Click one on the left, then its partner on the right.</p>
        <div class="match-grid">
          <div class="col">${s.pairs.map((p, i) => `<button class="m-item" data-l="${i}">${p[0]}</button>`).join('')}</div>
          <div class="col">${right.map((i) => `<button class="m-item" data-r="${i}">${esc(s.pairs[i][1])}</button>`).join('')}</div>
        </div>
        <div class="actions"><button class="primary hidden" data-act="next">Next ➜</button></div>
      </article>`);
    $$('[data-l]').forEach((b) => b.addEventListener('click', () => { if (b.classList.contains('done')) return; $$('[data-l]').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); selL = +b.dataset.l; SFX.pop(); }));
    $$('[data-r]').forEach((b) => b.addEventListener('click', () => {
      if (b.classList.contains('done')) return;
      if (selL === null) { shake($('.match-grid .col')); return; }
      const L = $(`[data-l="${selL}"]`);
      if (+b.dataset.r === selL) {
        [L, b].forEach((x) => { x.classList.remove('sel'); x.classList.add('done'); x.dataset.n = matched + 1; });
        matched++; selL = null; SFX.good(); addXP(4);
        if (matched === s.pairs.length) { const n = $('[data-act=next]'); n.classList.remove('hidden'); n.focus(); }
      } else { mistake(); shake(b); }
    }));
  }

  function stepOrder(s) {
    const pool = shuffle(s.items.map((t, i) => i));
    let placed = 0;
    stepFrame(`
      <article class="card order">
        <div class="qhead"><span class="qbadge">🔢 Put in order</span></div>
        <h2 class="q">${esc(s.title)}</h2>
        <p class="sub">Click the steps in the right order, from first to last.</p>
        <ol class="answer-list"></ol>
        <div class="pool">${pool.map((i) => `<button class="o-item" data-o="${i}">${esc(s.items[i])}</button>`).join('')}</div>
        <div class="actions"><button class="primary hidden" data-act="next">Next ➜</button></div>
      </article>`);
    $$('[data-o]').forEach((b) => b.addEventListener('click', () => {
      if (+b.dataset.o === placed) {
        const li = document.createElement('li'); li.textContent = s.items[placed]; $('.answer-list').appendChild(li);
        b.remove(); placed++; SFX.good();
        if (placed === s.items.length) { addXP(10); const n = $('[data-act=next]'); n.classList.remove('hidden'); n.focus(); }
      } else { mistake(); shake(b); }
    }));
  }

  function stepType(s) {
    let tries = 0; let done = false;
    stepFrame(`
      <article class="card typeq">
        <div class="qhead"><span class="qbadge">⌨️ Type it</span></div>
        <h2 class="q">${esc(s.q)}</h2>
        <form class="type-row" id="tform"><span class="fake-prompt">$</span><input id="tin" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Your answer"><button class="primary" type="submit">Check</button></form>
        <div class="feedback" aria-live="polite"></div>
        <div class="actions"><button class="ghost" data-act="thint">💡 Hint</button><button class="primary hidden" data-act="next">Next ➜</button></div>
      </article>`);
    const input = $('#tin'); input.focus();
    const answer = s.show || (typeof s.accept[0] === 'string' ? s.accept[0] : '');
    const ok = (v) => s.accept.some((a) => (typeof a === 'string' ? a === v : a.test(v)));
    $('#tform').addEventListener('submit', (e) => {
      e.preventDefault(); if (done) return;
      const v = input.value.trim().replace(/\s+/g, ' ');
      if (!v) return;
      if (ok(v)) {
        done = true; input.disabled = true; SFX.good(); addXP(tries ? 6 : 12);
        $('.feedback').innerHTML = `<div class="good">✅ Yes! <code>${esc(v)}</code> is right.</div>`;
        $('[data-act=thint]').classList.add('hidden');
        const n = $('[data-act=next]'); n.classList.remove('hidden'); n.focus();
      } else {
        tries++; mistake(); shake(input);
        const caseHint = ok(v.toLowerCase()) ? ' Remember: Linux commands use small letters!' : '';
        $('.feedback').innerHTML = `<div class="bad">Not quite.${caseHint} ${tries >= 2 ? `The answer is <code>${esc(answer)}</code> — type it in!` : 'Try again!'}</div>`;
      }
    });
    run.thint = () => { $('.feedback').innerHTML = `<div class="hint">💡 ${esc(s.hint || '')}</div>`; if (!kid()) run.mistakes += 0.5; input.focus(); };
  }

  // ---------------------------------------------------------------- terminal step
  function makeTerminal(host, shell, onCommand, banner) {
    host.innerHTML = `
      <div class="term" role="region" aria-label="Practice terminal">
        <div class="term-bar"><span class="dots"><i></i><i></i><i></i></span><span class="term-title">${esc(shell.user)}@fedora — Terminal (pretend)</span></div>
        <div class="term-body" tabindex="-1">
          <div class="term-out" aria-live="polite"></div>
          <form class="term-line"><span class="term-prompt"></span><input class="term-in" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" aria-label="Type a command and press Enter"></form>
        </div>
        <div class="term-keys" aria-label="Extra keys"><button type="button" data-key="Tab">Tab ⇥</button><button type="button" data-key="ArrowUp">↑</button><button type="button" data-key="ArrowDown">↓</button><button type="button" data-key="ctrlc">Ctrl+C</button><button type="button" data-key="ctrll">Clear</button><button type="button" data-key="|">|</button><button type="button" data-key="~">~</button><button type="button" data-key="/">/</button><button type="button" data-key="-">-</button></div>
      </div>`;
    const out = $('.term-out', host); const input = $('.term-in', host); const promptEl = $('.term-prompt', host); const body = $('.term-body', host);
    let hi = null; let draft = '';
    const print = (html) => { if (!html) return; const d = document.createElement('div'); d.innerHTML = html; out.appendChild(d); };
    const setPrompt = () => { promptEl.textContent = shell.prompt(); input.classList.toggle('masked', !!(shell.pending && shell.pending.mask)); };
    const scroll = () => { body.scrollTop = body.scrollHeight; };
    if (banner) print(`<div class="tip banner">${banner}</div>`);
    setPrompt();
    body.addEventListener('click', (e) => { if (!window.getSelection().toString() && e.target.tagName !== 'A') input.focus(); });
    $('form', host).addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value; input.value = ''; hi = null;
      let res;
      if (shell.pending) {
        const mask = shell.pending.mask;
        print(`<div class="cmd">${esc(shell.pending.prompt)}${mask ? '' : esc(v)}</div>`);
        res = shell.answer(v);
      } else {
        print(`<div class="cmd"><span class="p">${esc(shell.prompt())}</span>${esc(v)}</div>`);
        res = shell.run(v);
      }
      if (res.clear) out.innerHTML = '';
      print(res.html);
      setPrompt(); scroll();
      if (!res.pending) onCommand(shell, out, print);
      scroll();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (shell.pending) return;
        const r = shell.complete(input.value);
        if (r.options) { print(`<div class="cmd"><span class="p">${esc(shell.prompt())}</span>${esc(input.value)}</div><div class="o">${r.options.map(esc).join('   ')}</div>`); scroll(); }
        input.value = r.line;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (shell.pending || !shell.hist.length) return;
        e.preventDefault();
        if (hi === null) { draft = input.value; hi = shell.hist.length; }
        hi = Math.max(0, Math.min(shell.hist.length, hi + (e.key === 'ArrowUp' ? -1 : 1)));
        input.value = hi === shell.hist.length ? draft : shell.hist[hi];
        setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
      } else if (e.ctrlKey && !e.shiftKey && (e.key === 'c' || e.key === 'C') && input.selectionStart === input.selectionEnd) {
        e.preventDefault();
        print(`<div class="cmd"><span class="p">${esc(shell.prompt())}</span>${shell.pending && shell.pending.mask ? '' : esc(input.value)}^C</div>`);
        input.value = ''; shell.cancel(); setPrompt(); scroll();
      } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault(); out.innerHTML = '';
      }
    });
    // On-screen keys for phones (iPhone keyboards have no Tab, arrows or Ctrl)
    $$('.term-keys button', host).forEach((b) => {
      b.addEventListener('pointerdown', (e) => e.preventDefault()); // keep the keyboard open
      b.addEventListener('click', () => {
        const k = b.dataset.key;
        if (k.length === 1) {
          const st = input.selectionStart == null ? input.value.length : input.selectionStart;
          const en = input.selectionEnd == null ? st : input.selectionEnd;
          input.value = input.value.slice(0, st) + k + input.value.slice(en);
          input.setSelectionRange(st + 1, st + 1);
        } else if (k === 'ctrlc' || k === 'ctrll') {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: k === 'ctrlc' ? 'c' : 'l', ctrlKey: true, bubbles: true, cancelable: true }));
        } else {
          input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
        }
        input.focus();
      });
    });
    return { input, print, focus: () => input.focus() };
  }

  function stepTerminal(s) {
    const p = me();
    const shell = new window.LilShell(unixName(p.name));
    run.shell = shell;
    let cur = 0; let hinted = new Set();
    stepFrame(`
      <article class="card term-card">
        <div class="qhead"><span class="qbadge">🎯 Terminal missions</span><h2 class="q inline">${esc(s.title)}</h2></div>
        <div class="mission-wrap">
          <aside class="missions"><ol class="mlist"></ol></aside>
          <div class="term-host"></div>
        </div>
        <div class="actions"><button class="ghost" data-act="skip-m" title="Skip this mission">⏭️ Skip mission</button><button class="primary hidden" data-act="next">Next ➜</button></div>
      </article>`);
    const list = $('.mlist');
    const drawMissions = () => {
      list.innerHTML = s.missions.map((m, i) => `
        <li class="${i < cur ? 'done' : i === cur ? 'now' : 'later'}">
          <span class="mi">${i < cur ? '✅' : i === cur ? '👉' : '⬜'}</span>
          <div><div class="goal">${m.goal}</div>
          ${i === cur ? `<div class="mhint">${hinted.has(i) ? `Type: <code>${esc(m.hint)}</code>` : `<button class="ghost tiny" data-act="mhint">💡 Show me how</button>`}</div>` : ''}
          ${i < cur && m.done ? `<div class="mdone">${m.done}</div>` : ''}</div>
        </li>`).join('');
      const now = $('li.now', list); if (now && now.scrollIntoView && cur > 0) now.scrollIntoView({ block: 'nearest' });
      const hb = $('[data-act=mhint]', list);
      if (hb) hb.addEventListener('click', () => { hinted.add(cur); if (!kid()) run.mistakes += 1; drawMissions(); term.focus(); });
      if (cur >= s.missions.length) { $('[data-act=next]').classList.remove('hidden'); $('[data-act=skip-m]').classList.add('hidden'); }
    };
    const advance = (print, skipped) => {
      const m = s.missions[cur];
      if (!skipped) { print(`<div class="mission-ok">✅ Mission complete! ${m.done || ''}</div>`); SFX.good(); addXP(15); }
      else { print(`<div class="tip">⏭️ Skipped. The answer was: <code>${esc(m.hint)}</code></div>`); run.mistakes += 2; }
      cur++;
      if (cur >= s.missions.length) { print('<div class="mission-ok big">🎉 All missions complete! Press <b>Next</b> to continue.</div>'); confetti(60); SFX.win(); }
      drawMissions();
    };
    const term = makeTerminal($('.term-host'), shell, (sh, out, print) => {
      checkSpecials(sh);
      if (cur < s.missions.length) {
        let ok = false; try { ok = s.missions[cur].check(sh, sh.last); } catch (e) { ok = false; }
        if (ok) advance(print);
      }
    }, `Welcome to the LilNux practice terminal, ${esc(p.name)}! 🐧 It’s pretend, so you can’t break anything. Follow the 🎯 missions. Type <code>help</code> to see all commands.`);
    drawMissions();
    run.skipMission = () => { if (cur < s.missions.length && confirm('Skip this mission? You’ll lose a little bit of your star score.')) advance(term.print, true); term.focus(); };
    setTimeout(() => term.focus(), 50);
  }

  // ---------------------------------------------------------------- finishing
  function finishWorld() {
    const p = me(); const w = run.world;
    const m = Math.round(run.mistakes);
    const lenient = kid() ? 2 : 1;
    const stars = m <= 1 * lenient ? 3 : m <= 4 * lenient ? 2 : 1;
    const prev = p.worlds[w.id] || { stars: 0, plays: 0 };
    const first = !prev.stars;
    p.worlds[w.id] = { stars: Math.max(prev.stars, stars), plays: (prev.plays || 0) + 1 };
    save();
    addXP(first ? 50 : 10);
    let badgeHtml = '';
    if (giveBadge('w-' + w.id, w.badge.emoji, w.badge.name)) badgeHtml = `<div class="badge-won"><span>${w.badge.emoji}</span><div><small>New badge!</small><b>${esc(w.badge.name)}</b></div></div>`;
    if (m === 0) giveBadge('perfect', '💯', 'Perfect Penguin');
    if (WORLDS.every((x) => worldDone(p, x.id))) giveBadge('legend', '🎓', 'Graduate');
    SFX.win(); confetti(120);
    const nextIdx = run.idx + 1 < WORLDS.length ? run.idx + 1 : -1;
    const done = p.quests[w.id] || [];
    const quests = w.quests;
    app.innerHTML = `
      <section class="card result" style="--wc:${w.color}">
        <div class="result-top">
          <div class="tux dance">${TUX}</div>
          <div>
            <h1>${w.emoji} ${esc(w.title)} complete!</h1>
            <div class="big-stars" aria-label="${stars} of 3 stars">${'<span class="on">★</span>'.repeat(stars)}${'<span>★</span>'.repeat(3 - stars)}</div>
            <p>${stars === 3 ? 'Perfect! You’re a natural. 🌟' : stars === 2 ? 'Great job! Replay any time to earn 3 stars.' : 'You did it! Practice makes perfect — try it again for more stars.'}</p>
            <p class="xp-line">⚡ +${run.xp} XP this world</p>
          </div>
        </div>
        ${badgeHtml}
        <div class="quests">
          <h2>🏠 Try it for real!</h2>
          <p class="sub">Go do these on your real Fedora computer, then tick them off for +5 XP each.</p>
          <ul>${quests.map((q, i) => `<li><label class="check"><input type="checkbox" data-quest="${i}" ${done.includes(i) ? 'checked disabled' : ''}> <span>${esc(q)}</span></label></li>`).join('')}</ul>
        </div>
        <div class="actions">
          <button class="ghost" data-world="${w.id}">🔁 Play again</button>
          <button class="ghost" data-go="map">🗺️ Map</button>
          ${nextIdx >= 0 ? `<button class="primary" data-world="${WORLDS[nextIdx].id}">Next: ${WORLDS[nextIdx].emoji} ${esc(WORLDS[nextIdx].title)} ➜</button>` : '<button class="primary" data-go="certificate">🎓 Get my certificate</button>'}
        </div>
      </section>`;
    bindQuests(w);
    run = null;
    renderTop();
  }
  function bindQuests(w) {
    $$('[data-quest]').forEach((c) => c.addEventListener('change', () => {
      const p = me(); const i = +c.dataset.quest;
      p.quests[w.id] = p.quests[w.id] || [];
      if (c.checked && !p.quests[w.id].includes(i)) {
        p.quests[w.id].push(i); c.disabled = true; save(); SFX.good(); addXP(5);
        const total = Object.values(p.quests).reduce((s, a) => s + a.length, 0);
        if (total >= 10) giveBadge('quester', '🏡', 'Real-World Quester');
      }
    }));
  }

  // ---------------------------------------------------------------- free play
  function renderSandbox() {
    const p = me();
    if (!sandbox || sandbox.user !== unixName(p.name)) sandbox = new window.LilShell(unixName(p.name));
    const ideas = [
      ['ls -la', 'see everything with details'], ['tree', 'draw your folders'], ['cat /etc/os-release', 'all about this Fedora'],
      ['sudo dnf install sl', 'then type sl 🚂'], ['sudo dnf install cowsay fortune-mod', 'then fortune | cowsay'],
      ['flatpak search kart', 'find games'], ['grep -n e Documents/homework/spelling.txt', 'search with line numbers'],
      ['echo "Hi!" >> Desktop/note.txt', 'add a line to a file'], ['history | grep cd', 'find old commands'],
      ['ls Pictures | wc -l', 'count pictures'], ['uname -a', 'kernel details'], ['man grep', 'read a manual'],
    ];
    app.innerHTML = `
      <section class="card sandbox">
        <div class="qhead"><span class="qbadge">🧪 Free Play</span><h2 class="q inline">Experiment! Nothing here can break your computer.</h2></div>
        <div class="mission-wrap">
          <aside class="missions ideas">
            <h3>Things to try</h3>
            <ul>${ideas.map(([c, d]) => `<li><button class="idea" data-idea="${esc(c)}"><code>${esc(c)}</code></button><small>${esc(d)}</small></li>`).join('')}</ul>
            <button class="ghost tiny" data-act="reset-sandbox">♻️ Reset pretend computer</button>
          </aside>
          <div class="term-host"></div>
        </div>
      </section>`;
    const term = makeTerminal($('.term-host'), sandbox, (sh) => {
      checkSpecials(sh);
      const pl = me(); pl.sandboxCount = (pl.sandboxCount || 0) + 1; save();
      if (pl.sandboxCount >= 25) giveBadge('explorer', '🧪', 'Sandbox Scientist');
    }, `Free Play! Type <code>help</code> for commands. Click an idea on the left to put it in the terminal (then press Enter).`);
    $$('[data-idea]').forEach((b) => b.addEventListener('click', () => { term.input.value = b.dataset.idea; term.focus(); }));
    $('[data-act=reset-sandbox]').addEventListener('click', () => { sandbox = null; renderSandbox(); });
    setTimeout(() => term.focus(), 50);
  }

  // ---------------------------------------------------------------- cheat sheet, badges, certificate
  function renderCheats() {
    app.innerHTML = `
      <section class="card cheats">
        <div class="cheat-head"><h1>📜 LilNux Cheat Sheet</h1><button class="primary" data-act="print">🖨️ Print</button></div>
        <p class="sub">Fedora 44 Workstation · GNOME · bash. Stick it on the fridge! (<kbd>Super</kbd> is the key with the Windows logo.)</p>
        <div class="cheat-grid">${CHEATS.map((g) => `
          <div class="cheat"><h2>${esc(g.title)}</h2><table>${g.rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table></div>`).join('')}
        </div>
      </section>`;
  }
  function renderBadges() {
    const p = me();
    const all = WORLDS.map((w) => ({ id: 'w-' + w.id, emoji: w.badge.emoji, name: w.badge.name, how: `Finish ${w.title}` })).concat(SPECIAL_BADGES);
    app.innerHTML = `
      <section class="card badges-page">
        <h1>🏅 ${esc(p.name)}’s badges</h1>
        <p class="sub">${p.badges.length} of ${all.length} collected</p>
        <div class="badge-grid">${all.map((b) => { const got = p.badges.includes(b.id); return `<div class="badge ${got ? 'got' : ''}"><span>${got ? b.emoji : '❔'}</span><b>${esc(b.name)}</b><small>${esc(b.how)}</small></div>`; }).join('')}</div>
      </section>`;
  }
  function renderCertificate() {
    const p = me();
    const allDone = WORLDS.every((w) => worldDone(p, w.id));
    if (!allDone) { toast('Finish every world to unlock your certificate! 🎓'); return go('map'); }
    const stars = WORLDS.reduce((s, w) => s + ((p.worlds[w.id] || {}).stars || 0), 0);
    app.innerHTML = `
      <section class="certificate">
        <div class="cert-inner">
          <div class="cert-tux">${TUX}</div>
          <p class="cert-small">LilNux Certificate of Achievement</p>
          <h1>Linux Legend</h1>
          <p>This certifies that</p>
          <p class="cert-name">${p.avatar} ${esc(p.name)}</p>
          <p>has completed all ${WORLDS.length} LilNux worlds and learned how to use<br><b>Fedora 44 Workstation</b> and the <b>Linux terminal</b>.</p>
          <p class="cert-stats">⭐ ${stars}/${WORLDS.length * 3} stars · ⚡ ${p.xp} XP · 🏅 ${p.badges.length} badges</p>
          <p class="cert-date">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p class="cert-sign">— Lil Tux 🐧, Chief Penguin</p>
        </div>
        <div class="actions no-print"><button class="ghost" data-go="map">🗺️ Map</button><button class="primary" data-act="print">🖨️ Print certificate</button></div>
      </section>`;
    confetti(100); SFX.win();
  }

  // ---------------------------------------------------------------- global events
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-go]');
    if (!t) return;
    if (t.dataset.go) { if (t.dataset.go === 'players') return go('players'); return go(t.dataset.go); }
    if (t.dataset.world) {
      const idx = WORLDS.findIndex((w) => w.id === t.dataset.world);
      if (!unlocked(me(), idx)) { shake(t); toast('🔒 Finish the world before this one to unlock it!'); return; }
      return go('world', t.dataset.world);
    }
    if (t.dataset.play) { S.current = t.dataset.play; save(); SFX.pop(); return go('hub'); }
    if (t.dataset.edit) return renderPlayers(t.dataset.edit);
    if (t.dataset.del) {
      const p = S.players.find((x) => x.id === t.dataset.del);
      if (p && confirm(`Remove ${p.name} and all their progress?`)) { S.players = S.players.filter((x) => x !== p); if (S.current === p.id) S.current = null; save(); go('players'); }
      return;
    }
    const act = t.dataset.act;
    if (!act) return;
    if (act === 'next' && run) return next();
    if (act === 'speak' && run) return speak(run.speakText || '');
    if (act === 'thint' && run && run.thint) return run.thint();
    if (act === 'skip-m' && run && run.skipMission) return run.skipMission();
    if (act === 'sound') { S.sound = !S.sound; save(); renderTop(); if (S.sound) SFX.pop(); return; }
    if (act === 'print') return window.print();
    if (act === 'unlock') { if (confirm('Unlock every world for this player? (Good for grown‑ups who want to skip ahead.)')) { me().unlockAll = true; save(); renderMap(); } }
  });
  document.addEventListener('keydown', (e) => {
    if (!run) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const n = $('[data-act=next]:not(.hidden)');
    if (n && (e.key === 'ArrowRight') && run.world.steps[run.i].type === 'card') { e.preventDefault(); next(); }
    if (!n && /^[a-dA-D]$/.test(e.key)) { const opts = $$('.opt'); const o = opts['abcd'.indexOf(e.key.toLowerCase())]; if (o && !o.disabled) o.click(); }
  });

  // Hover info everywhere: any button without a title gets one from its label.
  function titleButtons(root) {
    (root.querySelectorAll ? root.querySelectorAll('button:not([title])') : []).forEach((b) => {
      const t = (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) b.title = t;
    });
  }
  new MutationObserver((muts) => { for (const m of muts) m.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.tagName === 'BUTTON' && !n.title) titleButtons(n.parentNode || document); else titleButtons(n); } }); })
    .observe(document.body, { childList: true, subtree: true });
  go(me() ? 'hub' : 'players');
  titleButtons(document);
})();
