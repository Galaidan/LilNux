/* Colonel Kernel — how each creature moves and attacks (no drawing). Used by action.js.
 * Glitch Mite (drift, shoot, telegraphed lunge), Loop Wisp (blink + radial burst),
 * Corrupt Boot Glitch (sweep + fans) and Missing Kernel Wraith (blink + volleys). Bosses re-cloak each phase
 * and telegraph an unparryable SIGKILL ring: `trap` can't catch signal 9, so you dash. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const TUNING = {
    WISP: { r: 8, blinkEvery: 2.5, blinkTell: 0.35, burstDelay: 0.3, burstN: 8, orbSpeed: 90, orbDmg: 10, minDist: 48, contactDmg: 8, drift: 25 },
    BOOT: { r: 16, sweepSpeed: 60, fanEvery: 1.4, fanN: [3, 5], fanSpreadDeg: 30, orbSpeed: 100, orbDmg: 10,
      sigEvery: 6, sigTell: 0.8, sigN: 16, sigSpeed: 90, sigDmg: 18, contactDmg: 10 },
    WRAITH: { r: 20, blinkEvery: 2.2, blinkTell: 0.3, volley: 3, volleyGap: 0.15, orbSpeed: 120, orbDmg: 12,
      sigEvery: 5, sigTell: 0.8, sigN: 20, sigSpeed: 100, sigDmg: 20, contactDmg: 12, minDist: 64 },
    PHASE_SPEED: 1.3,
  };
  const TAU = Math.PI * 2;
  const norm = (x, y) => { const l = Math.hypot(x, y); return l > 1e-9 ? { x: x / l, y: y / l } : { x: 0, y: 1 }; };
  const def = (kind) => (CK.World && CK.World.CREATURES && CK.World.CREATURES[kind]) || { hp: 30, cloaked: true };

  function make(kind, sp, index, ctx) {
    const d = def(kind); const rng = ctx.rng;
    const e = { id: 'e' + index, kind, x: sp.x, y: sp.y, hp: d.hp, maxHp: d.hp, cloaked: !!d.cloaked, boss: !!d.boss,
      phases: d.phases || 1, phase: 0, revealedUntil: 0, stunUntil: 0, dead: false, flash: 0, speedMul: 1, state: 'idle' };
    if (kind === 'glitchMite') {
      const M = CK.Action.TUNING.MITE;
      return Object.assign(e, { r: M.r, state: 'drift', speed: M.speed * ctx.slow, heading: rng() * TAU,
        shootEvery: M.shootEvery, shootTimer: M.shootEvery * (0.5 + 0.5 * rng()),
        lungeEvery: M.lungeEvery, lungeTimer: M.lungeEvery * (0.6 + 0.6 * rng()),
        tellT: 0, lungeT: 0, lungeDir: { x: 0, y: 0 }, contactDmg: M.contactDmg, lungeDmg: M.lungeDmg });
    }
    if (kind === 'loopWisp') {
      const Wt = TUNING.WISP;
      return Object.assign(e, { r: Wt.r, blinkT: Wt.blinkEvery * (0.3 + 0.4 * rng()), tellT: 0, burstT: 0, contactDmg: Wt.contactDmg });
    }
    if (kind === 'bootGlitch') {
      const B = TUNING.BOOT;
      return Object.assign(e, { r: B.r, dir: rng() < 0.5 ? -1 : 1, fanT: B.fanEvery, sigT: B.sigEvery * (0.6 + 0.4 * rng()), sigTellT: 0, contactDmg: B.contactDmg });
    }
    if (kind === 'kernelWraith') {
      const K = TUNING.WRAITH;
      return Object.assign(e, { r: K.r, blinkT: K.blinkEvery * (0.5 + 0.5 * rng()), tellT: 0, volleyLeft: 0, volleyT: 0,
        sigT: K.sigEvery * (0.6 + 0.4 * rng()), sigTellT: 0, contactDmg: K.contactDmg });
    }
    throw new Error('unknown creature ' + kind);
  }

  // ---- shared pieces ----------------------------------------------------------------------------
  function aimedOrb(e, ctx, speed, dmg, angleOff) {
    const P = ctx.player; const d = norm(P.x - e.x, P.y - e.y); const a = Math.atan2(d.y, d.x) + (angleOff || 0);
    const sp = speed * ctx.slow;
    ctx.orb({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, src: e.id });
  }
  // A ring of orbs; a SIGKILL ring always has one orb aimed straight at the Colonel.
  function ring(e, ctx, n, speed, dmg, unparryable) {
    const sp = speed * ctx.slow; const off = unparryable ? Math.atan2(ctx.player.y - e.y, ctx.player.x - e.x) : ctx.rng() * TAU;
    for (let i = 0; i < n; i++) { const a = off + (i / n) * TAU; ctx.orb({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, src: e.id, unparryable }); }
  }
  // Each new phase: re-cloak, speed up, tell the scene.
  function phaseCheck(e, ctx) {
    while (e.phase < e.phases - 1 && e.hp <= e.maxHp * (1 - (e.phase + 1) / e.phases)) {
      e.phase++; e.revealedUntil = 0; e.speedMul *= TUNING.PHASE_SPEED; ctx.ev('phase', e.x, e.y, { phase: e.phase, id: e.id });
    }
  }
  // SIGKILL: a telegraphed ring of unparryable orbs.
  function sigkill(e, dt, ctx, S) {
    if (e.sigTellT > 0) {
      e.sigTellT -= dt;
      if (e.sigTellT <= 0) { e.sigTellT = 0; ring(e, ctx, S.sigN, S.sigSpeed, S.sigDmg, true); e.sigT = S.sigEvery; }
      return true;
    }
    e.sigT -= dt;
    if (e.sigT <= 0) { e.sigTellT = S.sigTell; ctx.ev('sigkill-tell', e.x, e.y, { id: e.id, r: e.r + 10 }); return true; }
    return false;
  }
  function blinkTo(e, ctx, minDist) {
    ctx.ev('blink', e.x, e.y, { id: e.id });
    const p = ctx.floorPoint(minDist, e); e.x = p.x; e.y = p.y;
    ctx.ev('blink', e.x, e.y, { id: e.id });
  }

  // ---- behaviours ---------------------------------------------------------------------------------
  function mite(e, dt, ctx) {
    const M = CK.Action.TUNING.MITE; const P = ctx.player; const rng = ctx.rng;
    if (e.state === 'drift') {
      e.heading += (rng() - 0.5) * 2.4 * dt;
      const vx = Math.cos(e.heading) * e.speed * dt; const vy = Math.sin(e.heading) * e.speed * dt;
      const m = CK.Rooms.moveCircle(ctx.room, e.x, e.y, e.r, vx, vy);
      if (m.hitX) e.heading = Math.PI - e.heading;
      if (m.hitY) e.heading = -e.heading;
      e.x = m.x; e.y = m.y;
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        const d = norm(P.x - e.x, P.y - e.y); const sp = M.orbSpeed * ctx.slow;
        ctx.orb({ x: e.x, y: e.y, vx: d.x * sp, vy: d.y * sp, dmg: M.orbDmg, src: e.id });
        e.shootTimer = e.shootEvery * (0.7 + 0.6 * rng());
      }
      e.lungeTimer -= dt;
      if (e.lungeTimer <= 0) { e.state = 'tell'; e.tellT = M.lungeTell; e.lungeDir = norm(P.x - e.x, P.y - e.y); }
    } else if (e.state === 'tell') {
      e.tellT -= dt;
      if (e.tellT <= 0) { e.state = 'lunge'; e.lungeT = M.lungeTime; }
    } else if (e.state === 'lunge') {
      const sp = M.lungeSpeed * ctx.slow * dt;
      const m = CK.Rooms.moveCircle(ctx.room, e.x, e.y, e.r, e.lungeDir.x * sp, e.lungeDir.y * sp);
      e.x = m.x; e.y = m.y; e.lungeT -= dt;
      if (e.lungeT <= 0) { e.state = 'drift'; e.lungeTimer = e.lungeEvery * (0.7 + 0.6 * rng()); }
    }
  }

  function wisp(e, dt, ctx) {
    const Wt = TUNING.WISP; const P = ctx.player;
    if (e.state === 'idle') {
      const d = norm(P.x - e.x, P.y - e.y); const sp = Wt.drift * ctx.slow * e.speedMul * dt;
      const m = CK.Rooms.moveCircle(ctx.room, e.x, e.y, e.r, d.x * sp, d.y * sp); e.x = m.x; e.y = m.y;
      e.blinkT -= dt;
      if (e.blinkT <= 0) { e.state = 'tell'; e.tellT = Wt.blinkTell; ctx.ev('blink-tell', e.x, e.y, { id: e.id }); }
    } else if (e.state === 'tell') {
      e.tellT -= dt;
      if (e.tellT <= 0) { blinkTo(e, ctx, Wt.minDist); e.state = 'burst'; e.burstT = Wt.burstDelay; }
    } else if (e.state === 'burst') {
      e.burstT -= dt;
      if (e.burstT <= 0) {
        ctx.ev('burst', e.x, e.y, { id: e.id }); ring(e, ctx, Wt.burstN, Wt.orbSpeed, Wt.orbDmg, false);
        e.state = 'idle'; e.blinkT = Wt.blinkEvery * (0.8 + 0.4 * ctx.rng());
      }
    }
  }

  function boot(e, dt, ctx) {
    const B = TUNING.BOOT;
    phaseCheck(e, ctx);
    if (sigkill(e, dt, ctx, B)) return; // holds still while it winds up signal 9
    const sp = B.sweepSpeed * ctx.slow * e.speedMul;
    const targetY = ctx.room.h * 0.3; const vy = Math.max(-20, Math.min(20, targetY - e.y)) * ctx.slow * e.speedMul;
    const m = CK.Rooms.moveCircle(ctx.room, e.x, e.y, e.r, e.dir * sp * dt, vy * dt);
    if (m.hitX) e.dir = -e.dir;
    e.x = m.x; e.y = m.y;
    e.fanT -= dt;
    if (e.fanT <= 0) {
      const n = B.fanN[Math.min(e.phase, B.fanN.length - 1)]; const spread = (B.fanSpreadDeg * Math.PI) / 180;
      for (let i = 0; i < n; i++) aimedOrb(e, ctx, B.orbSpeed, B.orbDmg, n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1));
      e.fanT = B.fanEvery / e.speedMul;
    }
  }

  function wraith(e, dt, ctx) {
    const K = TUNING.WRAITH;
    phaseCheck(e, ctx);
    if (sigkill(e, dt, ctx, K)) return;
    if (e.volleyLeft > 0) {
      e.volleyT -= dt;
      if (e.volleyT <= 0) { aimedOrb(e, ctx, K.orbSpeed, K.orbDmg, 0); e.volleyLeft--; e.volleyT = K.volleyGap; }
      return;
    }
    if (e.state === 'tell') {
      e.tellT -= dt;
      if (e.tellT <= 0) { blinkTo(e, ctx, K.minDist); e.state = 'idle'; e.volleyLeft = K.volley; e.volleyT = 0.2; }
      return;
    }
    e.blinkT -= dt;
    if (e.blinkT <= 0) { e.state = 'tell'; e.tellT = K.blinkTell; e.blinkT = K.blinkEvery / e.speedMul; ctx.ev('blink-tell', e.x, e.y, { id: e.id }); }
  }

  const BEHAVIOUR = { glitchMite: mite, loopWisp: wisp, bootGlitch: boot, kernelWraith: wraith };
  function update(e, dt, ctx) {
    if (e.dead) return;
    e.flash = Math.max(0, e.flash - dt);
    if (ctx.time < e.stunUntil) return;
    BEHAVIOUR[e.kind](e, dt, ctx);
  }

  CK.Foes = { TUNING, make, update };
})(typeof window !== 'undefined' ? window : globalThis);
