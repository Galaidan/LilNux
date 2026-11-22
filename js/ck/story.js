/* Colonel Kernel — resting and NullNux's secret corruption. Pure rules; main.js shows the results. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const REST_MIN_MS = 5 * 60 * 1000;   // away at least this long = the Colonel rested
  const BREAK_MS = 35 * 60 * 1000;     // gentle break reminder after this much play
  const ODD_LOGS = [
    '[ 3605.120044] swapper/0: unexpected write to /boot/grub2/grub.cfg',
    '[ 7210.004211] swapper/0: process 1 (pip) memory map altered',
    '[10815.660001] swapper/0: signal from 0 to 0: wake',
  ];
  const TAKEN_LOG = '[14420.000000] swapper/0: moved process liltux to [unknown]';

  function restedWhileAway(state, now) {
    const last = state.story.lastSeen;
    return !!state.seenIntro && last > 0 && now - last >= CK.Story.REST_MIN_MS;
  }

  // One rest = at most one NullNux event. Never touches skills, items, bits or memories.
  function rest(state, rng) {
    const st = state.story; st.rests++;
    if (st.liltuxMet && !st.liltuxTaken) {
      st.liltuxTaken = true; state.chapterDone = true;
      const home = CK.Rules.region('grub').home;
      if (!st.glitched.includes(home)) st.glitched.push(home);
      st.oddLogs.push(TAKEN_LOG);
      return { type: 'taken', node: home };
    }
    if (st.liltuxTaken) { st.flicker = true; return { type: 'flicker' }; }
    const options = ['flicker'];
    const reg = CK.Rules.region(state.region);
    const circuits = (state.cleared[state.region] || []).filter((id) => reg.nodes[id] && reg.nodes[id].kind === 'circuit' && id !== state.node);
    if (circuits.length) options.push('rebreak');
    const nextLog = ODD_LOGS.find((l) => !st.oddLogs.includes(l));
    if (nextLog) options.push('oddlog');
    const pick = options[Math.floor(rng() * options.length)];
    if (pick === 'rebreak') {
      const id = circuits[Math.floor(rng() * circuits.length)];
      state.cleared[state.region] = state.cleared[state.region].filter((x) => x !== id);
      return { type: 'rebreak', node: id };
    }
    if (pick === 'oddlog') { st.oddLogs.push(nextLog); return { type: 'oddlog', line: nextLog }; }
    st.flicker = true; return { type: 'flicker' };
  }

  // Adds active play time; true when it's time for a gentle break reminder.
  function addPlayTime(state, ms) {
    const st = state.story; st.playMs += ms;
    if (st.playMs - st.lastReminderMs >= CK.Story.BREAK_MS) { st.lastReminderMs = st.playMs; return true; }
    return false;
  }

  CK.Story = { REST_MIN_MS, BREAK_MS, ODD_LOGS, TAKEN_LOG, restedWhileAway, rest, addPlayTime };
})(typeof window !== 'undefined' ? window : globalThis);
