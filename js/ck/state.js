/* Colonel Kernel — save state and shared helpers. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  // mulberry32: small, fast, deterministic PRNG -> values in [0, 1)
  CK.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  function fresh() {
    return {
      v: 2, region: 'firmware', node: 'f0', prev: null, explored: { firmware: ['f0'] }, cleared: {},
      learned: [], equipped: [], upgrades: [], modules: [], bits: 0, memories: [], tasksDone: [], codex: [],
      switches: [], signs: [],
      checkpoint: { region: 'firmware', node: 'f0' }, stats: { clean: 0, fights: 0, wins: 0 },
      chapterDone: false, seenIntro: false, log: [],
      story: { liltuxMet: false, liltuxTaken: false, restUnlocked: false, rests: 0, lastSeen: 0, glitched: [], oddLogs: [], flicker: false, playMs: 0, lastReminderMs: 0, newMoves: false },
    };
  }

  const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const strList = (x, dflt) => (Array.isArray(x) ? x.filter((s) => typeof s === 'string') : dflt);
  const mapOfLists = (x, dflt) => {
    if (!isObj(x)) return dflt;
    const out = Object.assign({}, dflt);
    for (const k of Object.keys(x)) if (Array.isArray(x[k])) out[k] = strList(x[k], []);
    return out;
  };

  function load(raw) {
    const s = fresh();
    if (!isObj(raw)) return s;
    if (isObj(raw.checkpoint) && typeof raw.checkpoint.region === 'string' && typeof raw.checkpoint.node === 'string') {
      s.checkpoint = { region: raw.checkpoint.region, node: raw.checkpoint.node };
    }
    const nodeOk = typeof raw.node === 'string' && typeof raw.region === 'string';
    s.region = nodeOk ? raw.region : s.checkpoint.region;
    s.node = nodeOk ? raw.node : s.checkpoint.node;
    s.prev = nodeOk && typeof raw.prev === 'string' ? raw.prev : null;
    s.explored = mapOfLists(raw.explored, s.explored);
    s.cleared = mapOfLists(raw.cleared, {});
    ['learned', 'equipped', 'upgrades', 'modules', 'memories', 'tasksDone', 'codex', 'switches', 'signs'].forEach((k) => { s[k] = strList(raw[k], []); });
    s.bits = Number.isFinite(raw.bits) && raw.bits >= 0 ? Math.floor(raw.bits) : 0;
    if (isObj(raw.stats)) for (const k of Object.keys(s.stats)) if (Number.isFinite(raw.stats[k])) s.stats[k] = raw.stats[k];
    s.chapterDone = raw.chapterDone === true;
    s.seenIntro = raw.seenIntro === true;
    if (Array.isArray(raw.log)) {
      s.log = raw.log.filter((e) => isObj(e) && typeof e.html === 'string' && typeof e.kind === 'string')
        .map((e) => ({ who: typeof e.who === 'string' ? e.who : '', kind: e.kind, html: e.html, at: Number.isFinite(e.at) ? e.at : 0 })).slice(-150);
    }
    if (isObj(raw.story)) {
      const r = raw.story; const st = s.story;
      for (const k of ['liltuxMet', 'liltuxTaken', 'restUnlocked', 'flicker', 'newMoves']) st[k] = r[k] === true;
      for (const k of ['rests', 'lastSeen', 'playMs', 'lastReminderMs']) st[k] = Number.isFinite(r[k]) && r[k] >= 0 ? r[k] : 0;
      st.glitched = strList(r.glitched, []); st.oddLogs = strList(r.oddLogs, []);
    }
    // v1 -> v2 (the action rebuild): anyone who met Pip gets the new moves; the removed `cd -` upgrade is refunded.
    if (!(raw.v >= 2)) {
      if (s.learned.includes('echo')) {
        for (const id of ['kill', 'trap']) { if (!s.learned.includes(id)) s.learned.push(id); if (!s.codex.includes(id)) s.codex.push(id); }
        s.story.newMoves = true;
      }
      if (s.upgrades.includes('cd-dash')) { s.upgrades = s.upgrades.filter((u) => u !== 'cd-dash'); s.bits += 50; }
    }
    return s;
  }

  const clone = (state) => JSON.parse(JSON.stringify(state));

  CK.State = { fresh, load, clone };
})(typeof window !== 'undefined' ? window : globalThis);
