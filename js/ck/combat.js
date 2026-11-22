/* Colonel Kernel — skillshot fight simulation (no drawing; scenes.js renders it). */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const W = 1000; const H = 600;
  const BOX = { x0: 60, x1: 940, y0: 50, y1: 330 };
  const SHOT_SPEED = 700; const SHOT_R = 8; const ORB_R = 10; const HEAT_DECAY = 25; const MAX_DT = 0.05;

  function create(opts) {
    const def = CK.World.CREATURES[opts.creature];
    const state = opts.state; const kid = !!opts.kid;
    const rng = CK.rng(opts.seed || 1);
    const st = CK.Rules.stats(state);
    const slow = kid ? 0.8 : 1;
    const count = def.boss ? 1 : def.count || 1;
    const enemies = [];
    for (let i = 0; i < count; i++) {
      const ang = rng() * Math.PI * 2; const speed = def.speed * slow;
      enemies.push({
        id: def.id + i, kind: def.id, boss: !!def.boss, pattern: def.pattern,
        x: def.boss ? 500 : 200 + (count > 1 ? (600 / (count - 1)) * i : 300) + (rng() - 0.5) * 60,
        y: def.boss ? 150 : 110 + rng() * 150,
        r: (def.boss ? 60 : 28) * (kid ? 1.15 : 1),
        hp: def.hp, maxHp: def.hp, cloaked: !!def.cloaked, revealedUntil: 0, phase: 0, phases: def.phases || 1,
        speed, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, seed: rng() * 10,
        every: def.shoots.every, orbSpeed: def.shoots.speed * slow, dmg: def.shoots.dmg,
        shootTimer: def.shoots.every * (0.5 + rng() * 0.5), blinkTimer: 2.2, frozen: false,
      });
    }

    const f = {
      W, H, creature: def, kid,
      colonel: { x: 500, y: 540, r: 26, stability: 100, maxStability: 100 },
      enemies, shots: [], orbs: [], heat: 0, overheatedUntil: 0, cooldowns: {}, time: 0, outcome: null, events: [],
      hintAvailable: kid, freeDashUntil: 0,
    };
    const ev = (type, x, y) => f.events.push({ type, x, y });
    const hittable = (e) => !e.cloaked || f.time < e.revealedUntil;

    function damage(e, n) {
      e.hp -= n;
      if (e.hp <= 0) { ev('kill', e.x, e.y); f.enemies.splice(f.enemies.indexOf(e), 1); }
      else ev('hit', e.x, e.y);
    }

    function moveEnemy(e, dt) {
      if (e.frozen) { e.vx = 0; e.vy = 0; return; }
      if (e.pattern === 'sweep') {
        const ox = e.x; const oy = e.y;
        e.x = 500 + 380 * Math.sin(f.time * (e.speed / 300) + e.seed);
        e.y = 160 + 70 * Math.sin(f.time * 1.3 + e.seed);
        e.vx = (e.x - ox) / dt; e.vy = (e.y - oy) / dt;
        return;
      }
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.x < BOX.x0 || e.x > BOX.x1) { e.vx = -e.vx; e.x = Math.max(BOX.x0, Math.min(BOX.x1, e.x)); }
      if (e.y < BOX.y0 || e.y > BOX.y1) { e.vy = -e.vy; e.y = Math.max(BOX.y0, Math.min(BOX.y1, e.y)); }
      if (e.pattern === 'blink') {
        e.blinkTimer -= dt;
        if (e.blinkTimer <= 0) {
          e.blinkTimer = 2.2;
          e.x = 100 + rng() * 800; e.y = 70 + rng() * 230;
          ev('blink', e.x, e.y);
        }
      }
    }

    f.update = function (dt) {
      if (f.outcome) return;
      dt = Math.min(dt, MAX_DT);
      f.time += dt;
      f.heat = Math.max(0, f.heat - HEAT_DECAY * dt);
      const c = f.colonel;

      for (const e of f.enemies) {
        moveEnemy(e, dt);
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          e.shootTimer = e.every;
          const dx = c.x - e.x; const dy = c.y - e.y; const d = Math.hypot(dx, dy) || 1;
          f.orbs.push({ x: e.x, y: e.y, vx: (dx / d) * e.orbSpeed, vy: (dy / d) * e.orbSpeed, r: ORB_R, dmg: e.dmg });
        }
        if (e.boss && e.phase < e.phases - 1 && e.hp <= e.maxHp * (1 - (e.phase + 1) / e.phases)) {
          e.phase++; e.revealedUntil = 0; e.every *= 0.8; ev('phase', e.x, e.y);
        }
      }

      for (let i = f.shots.length - 1; i >= 0; i--) {
        const s = f.shots[i];
        s.x += s.vx * dt; s.y += s.vy * dt;
        let gone = s.x < -50 || s.x > W + 50 || s.y < -50 || s.y > H + 50;
        if (!gone) {
          const o = f.orbs.find((q) => Math.hypot(q.x - s.x, q.y - s.y) < q.r + s.r);
          if (o) { f.orbs.splice(f.orbs.indexOf(o), 1); ev('orbPop', o.x, o.y); gone = true; }
        }
        if (!gone) {
          const e = f.enemies.find((q) => hittable(q) && Math.hypot(q.x - s.x, q.y - s.y) < q.r + s.r);
          if (e) { damage(e, s.dmg); gone = true; }
        }
        if (gone) f.shots.splice(i, 1);
      }

      for (let i = f.orbs.length - 1; i >= 0; i--) {
        const o = f.orbs[i];
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (Math.hypot(o.x - c.x, o.y - c.y) < o.r + c.r) {
          c.stability = Math.max(0, c.stability - o.dmg); ev('hurt', c.x, c.y); f.orbs.splice(i, 1); continue;
        }
        if (o.x < -50 || o.x > W + 50 || o.y < -50 || o.y > H + 50) f.orbs.splice(i, 1);
      }

      if (c.stability <= 0) f.outcome = 'lose';
      else if (!f.enemies.length) f.outcome = 'win';
    };

    f.use = function (skillId, x, y) {
      if (f.outcome) return { ok: false, reason: 'over' };
      if (!state.equipped.includes(skillId)) return { ok: false, reason: 'not-equipped' };
      if (f.time < f.overheatedUntil) return { ok: false, reason: 'overheat' };
      if (f.time < (f.cooldowns[skillId] || 0)) return { ok: false, reason: 'cooldown' };
      const sk = CK.World.SKILLS[skillId].fight; const c = f.colonel;
      let cd = sk.cd * st.cdMul;

      if (sk.type === 'bolt') {
        if (state.upgrades.includes('echo-n')) cd *= 0.75;
        const dx = x - c.x; const dy = y - (c.y - 30); const d = Math.hypot(dx, dy) || 1;
        f.shots.push({ x: c.x, y: c.y - 30, vx: (dx / d) * SHOT_SPEED, vy: (dy / d) * SHOT_SPEED, r: SHOT_R, dmg: sk.dmg });
        ev('fire', c.x, c.y - 30);
      } else if (sk.type === 'scan') {
        const dur = state.upgrades.includes('ls-a') ? 7 : sk.reveal;
        for (const e of f.enemies.slice()) { e.revealedUntil = f.time + dur; damage(e, 5); }
        ev('reveal', c.x, c.y);
      } else if (sk.type === 'dash') {
        c.x = Math.max(40, Math.min(960, x));
        ev('dash', c.x, c.y);
        if (state.upgrades.includes('cd-dash')) {
          if (f.time < f.freeDashUntil) { f.freeDashUntil = 0; cd = 0; } else f.freeDashUntil = f.time + 1.5;
        }
      }

      if (cd > 0) f.cooldowns[skillId] = f.time + cd;
      f.heat += sk.heat * st.heatMul;
      if (f.heat >= 100) { f.heat = 100; f.overheatedUntil = f.time + 1.5; ev('overheat', c.x, c.y); }
      return { ok: true };
    };

    return f;
  }

  CK.Fight = { create, W, H };
})(typeof window !== 'undefined' ? window : globalThis);
