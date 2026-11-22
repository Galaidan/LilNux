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
      v: 1, region: 'firmware', node: 'f0', prev: null, explored: { firmware: ['f0'] }, cleared: {},
      learned: [], equipped: [], upgrades: [], modules: [], bits: 0, memories: [], tasksDone: [], codex: [],
      checkpoint: { region: 'firmware', node: 'f0' }, stats: { clean: 0, fights: 0, wins: 0 },
      chapterDone: false, seenIntro: false,
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
    ['learned', 'equipped', 'upgrades', 'modules', 'memories', 'tasksDone', 'codex'].forEach((k) => { s[k] = strList(raw[k], []); });
    s.bits = Number.isFinite(raw.bits) && raw.bits >= 0 ? Math.floor(raw.bits) : 0;
    if (isObj(raw.stats)) for (const k of Object.keys(s.stats)) if (Number.isFinite(raw.stats[k])) s.stats[k] = raw.stats[k];
    s.chapterDone = raw.chapterDone === true;
    s.seenIntro = raw.seenIntro === true;
    return s;
  }

  const clone = (state) => JSON.parse(JSON.stringify(state));

  CK.State = { fresh, load, clone };
})(typeof window !== 'undefined' ? window : globalThis);
