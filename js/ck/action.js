/* Colonel Kernel — action simulation (no drawing; roomscene.js renders it).
 * Free movement in a room, dash with i-frames, `kill` combo, `trap` parry, `echo` bolts, `ls` reveal, Glitch Mites. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const TUNING = {
    MOVE: 110, PLAYER_R: 7, IFRAMES_HURT: 0.6, ATTACK_MOVE_MUL: 0.4,
    DASH_DIST: 70, DASH_TIME: 0.15, DASH_CD: 0.35,
    KILL_DMG: 12, KILL_TIME: 0.22, KILL_CHAIN: 0.4, KILL_RANGE: 22, KILL_LUNGE: 10, KILL_COOL_HEAT: 8, KILL_ARC_DEG: 70, KNOCK: 4,
    PARRY: 0.18, PARRY_KID: 0.30, PARRY_RECOVER: 0.35, STUN: 1.2, REFLECT_MUL: 2,
    ECHO_SPEED: 260, ECHO_DMG: 10, ECHO_CD: 0.35, ECHO_HEAT: 9, OVERHEAT_LOCK: 1.5, HEAT_DECAY: 25, BOLT_R: 3, ORB_R: 3,
    LS_CD: 3, LS_HEAT: 15, LS_REVEAL: 4,
    MITE: { r: 6, speed: 45, shootEvery: 2.4, orbSpeed: 80, orbDmg: 8, contactDmg: 6,
      lungeEvery: 3.5, lungeTell: 0.4, lungeSpeed: 160, lungeTime: 0.3, lungeDmg: 10 },
    KID_SPEED: 0.8, KID_STABILITY: 130, AIM_CONE_DEG: 60,
  };

  const len = (x, y) => Math.hypot(x, y);
  function norm(x, y) { const l = len(x, y); return l > 1e-9 ? { x: x / l, y: y / l } : { x: 0, y: 0 }; }
  const angleBetween = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y)));

  function create(opts) {
    const T = TUNING; const M = T.MITE;
    const room = opts.room; const kid = !!opts.kid; const rng = CK.rng(opts.seed || 1);
    const slow = kid ? T.KID_SPEED : 1;
    const tools = (opts.tools || []).slice();
    const def = CK.World && CK.World.CREATURES && CK.World.CREATURES.glitchMite;
    const maxStability = kid ? T.KID_STABILITY : 100;

    const s = {
      room, kid, tools, time: 0, outcome: null, clean: false, events: [],
      player: {
        x: room.player.x, y: room.player.y, face: { x: 0, y: 1 }, stability: maxStability, maxStability,
        dashT: 0, dashCd: 0, dashDir: { x: 0, y: 1 }, iframes: 0, attackT: 0, combo: 0, chainT: 0,
        parryT: 0, recoverT: 0, parryCaught: false, heat: 0, overheatUntil: 0, hitsTaken: 0, moving: false,
      },
      enemies: room.spawns.map((sp, i) => ({
        id: 'e' + i, kind: sp.kind, x: sp.x, y: sp.y, r: M.r, hp: def ? def.hp : 30, maxHp: def ? def.hp : 30,
        cloaked: def ? !!def.cloaked : true, revealedUntil: 0, stunUntil: 0, state: 'drift', dead: false,
        speed: M.speed * slow, heading: rng() * Math.PI * 2,
        shootEvery: M.shootEvery, shootTimer: M.shootEvery * (0.5 + 0.5 * rng()),
        lungeEvery: M.lungeEvery, lungeTimer: M.lungeEvery * (0.6 + 0.6 * rng()),
        tellT: 0, lungeT: 0, lungeDir: { x: 0, y: 0 }, flash: 0,
      })),
      orbs: [], bolts: [], cooldowns: { echo: 0, ls: 0 },
      spawnOrb(o) { s.orbs.push({ x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, r: T.ORB_R, dmg: o.dmg || M.orbDmg, unparryable: !!o.unparryable, from: 'enemy', src: o.src || null }); },
      step,
    };
    const P = s.player;
    const ev = (type, x, y) => s.events.push({ type, x: x === undefined ? P.x : x, y: y === undefined ? P.y : y });
    const hittable = (e) => !e.dead && (!e.cloaked || s.time < e.revealedUntil || s.time < e.stunUntil);
    const alive = () => s.enemies.filter((e) => !e.dead);

    function hurt(dmg, x, y) {
      if (P.dashT > 0 || P.iframes > 0 || s.outcome) return false;
      P.stability = Math.max(0, P.stability - dmg); P.hitsTaken++; P.iframes = T.IFRAMES_HURT;
      ev('hurt', x, y);
      if (P.stability <= 0) { s.outcome = 'lose'; ev('lose'); }
      return true;
    }
    function addHeat(n) {
      P.heat = Math.min(100, P.heat + n);
      if (P.heat >= 100) { P.overheatUntil = s.time + T.OVERHEAT_LOCK; ev('overheat'); }
    }
    function damage(e, n) {
      if (e.dead) return;
      e.hp -= n; e.flash = 0.08; ev('hit', e.x, e.y); s.events[s.events.length - 1].n = Math.round(n);
      if (e.hp <= 0) { e.hp = 0; e.dead = true; ev('kill', e.x, e.y); }
    }

    // ---- player actions ---------------------------------------------------------------------
    function swing(dir) {
      P.combo = P.chainT > 0 ? (P.combo % 3) + 1 : 1;
      P.attackT = T.KILL_TIME; P.chainT = 0; P.face = dir;
      ev('swing', P.x + dir.x * 12, P.y + dir.y * 12);
      const arc = (T.KILL_ARC_DEG * Math.PI) / 180;
      let hit = false; let near = false;
      for (const e of alive()) {
        const dx = e.x - P.x; const dy = e.y - P.y; const d = len(dx, dy);
        const inArc = d <= T.KILL_RANGE + e.r && (d < 1e-6 || angleBetween(dir, norm(dx, dy)) <= arc);
        if (!inArc) continue;
        near = true;
        if (!hittable(e)) continue;
        hit = true;
        damage(e, T.KILL_DMG * (P.combo === 3 ? 1.5 : 1));
        P.heat = Math.max(0, P.heat - T.KILL_COOL_HEAT);
        if (!e.dead) { const k = d < 1e-6 ? dir : norm(dx, dy); const m = CK.Rooms.moveCircle(room, e.x, e.y, e.r, k.x * T.KNOCK, k.y * T.KNOCK); e.x = m.x; e.y = m.y; }
      }
      if (!hit && !near) { const m = CK.Rooms.moveCircle(room, P.x, P.y, T.PLAYER_R, dir.x * T.KILL_LUNGE, dir.y * T.KILL_LUNGE); P.x = m.x; P.y = m.y; }
    }

    function useTool(id, aim) {
      if (!tools.includes(id) || s.cooldowns[id] > 0 || s.time < P.overheatUntil) return;
      if (id === 'ls') {
        s.enemies.forEach((e) => { e.revealedUntil = s.time + T.LS_REVEAL; });
        s.cooldowns.ls = T.LS_CD; ev('reveal'); addHeat(T.LS_HEAT);
      } else if (id === 'echo') {
        fireEcho(aim);
      }
    }
    function fireEcho(d) {
      s.bolts.push({ x: P.x + d.x * 8, y: P.y + d.y * 8, vx: d.x * T.ECHO_SPEED, vy: d.y * T.ECHO_SPEED, r: T.BOLT_R, dmg: T.ECHO_DMG });
      s.cooldowns.echo = T.ECHO_CD; ev('echo'); addHeat(T.ECHO_HEAT);
    }

    // ---- enemies ------------------------------------------------------------------------------
    function updateEnemy(e, dt) {
      if (e.dead) return;
      e.flash = Math.max(0, e.flash - dt);
      if (s.time < e.stunUntil) return;
      if (e.state === 'drift') {
        e.heading += (rng() - 0.5) * 2.4 * dt;
        const vx = Math.cos(e.heading) * e.speed * dt; const vy = Math.sin(e.heading) * e.speed * dt;
        const m = CK.Rooms.moveCircle(room, e.x, e.y, e.r, vx, vy);
        if (m.hitX) e.heading = Math.PI - e.heading;
        if (m.hitY) e.heading = -e.heading;
        e.x = m.x; e.y = m.y;
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          const d = norm(P.x - e.x, P.y - e.y); const sp = M.orbSpeed * slow;
          s.orbs.push({ x: e.x, y: e.y, vx: d.x * sp, vy: d.y * sp, r: T.ORB_R, dmg: M.orbDmg, unparryable: false, from: 'enemy', src: e.id });
          e.shootTimer = e.shootEvery * (0.7 + 0.6 * rng());
        }
        e.lungeTimer -= dt;
        if (e.lungeTimer <= 0) { e.state = 'tell'; e.tellT = M.lungeTell; e.lungeDir = norm(P.x - e.x, P.y - e.y); }
      } else if (e.state === 'tell') {
        e.tellT -= dt;
        if (e.tellT <= 0) { e.state = 'lunge'; e.lungeT = M.lungeTime; }
      } else if (e.state === 'lunge') {
        const sp = M.lungeSpeed * slow * dt;
        const m = CK.Rooms.moveCircle(room, e.x, e.y, e.r, e.lungeDir.x * sp, e.lungeDir.y * sp);
        e.x = m.x; e.y = m.y; e.lungeT -= dt;
        if (e.lungeT <= 0) { e.state = 'drift'; e.lungeTimer = e.lungeEvery * (0.7 + 0.6 * rng()); }
      }
    }

    function contact(e) {
      if (e.dead || s.time < e.stunUntil) return;
      if (len(e.x - P.x, e.y - P.y) >= T.PLAYER_R + e.r) return;
      if (e.state === 'lunge' && onLungeContact(e)) return;
      hurt(e.state === 'lunge' ? M.lungeDmg : M.contactDmg, e.x, e.y);
    }
    // `trap` catches a lunge: the mite is stunned (and hittable even if cloaked) and bounced back.
    function onLungeContact(e) {
      if (P.parryT <= 0) return false;
      e.stunUntil = s.time + T.STUN; e.state = 'drift'; e.lungeTimer = e.lungeEvery;
      const k = norm(e.x - P.x, e.y - P.y); const m = CK.Rooms.moveCircle(room, e.x, e.y, e.r, k.x * 10, k.y * 10); e.x = m.x; e.y = m.y;
      P.parryCaught = true; ev('parry', e.x, e.y);
      return true;
    }
    // `trap` catches a signal (orb) and sends it back at double damage. SIGKILL orbs can't be caught.
    function onOrbContact(o) {
      if (P.parryT <= 0 || o.unparryable) return false;
      const src = o.src && s.enemies.find((e) => e.id === o.src && !e.dead);
      const sp = len(o.vx, o.vy) || T.ECHO_SPEED;
      const d = src ? norm(src.x - o.x, src.y - o.y) : norm(-o.vx, -o.vy);
      o.vx = d.x * sp; o.vy = d.y * sp; o.from = 'player'; o.dmg *= T.REFLECT_MUL;
      P.parryCaught = true; ev('parry', o.x, o.y);
      return true;
    }

    // ---- projectiles ---------------------------------------------------------------------------
    function inWall(o) { return room.solid(Math.floor(o.x / CK.Rooms.TILE), Math.floor(o.y / CK.Rooms.TILE)); }
    function updateOrbs(dt) {
      s.orbs = s.orbs.filter((o) => {
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (inWall(o)) return false;
        if (o.from === 'player') {
          for (const e of alive()) if (hittable(e) && len(e.x - o.x, e.y - o.y) < e.r + o.r) { damage(e, o.dmg); return false; }
          return true;
        }
        if (len(P.x - o.x, P.y - o.y) < T.PLAYER_R + o.r) {
          if (onOrbContact(o)) return true;
          if (P.dashT > 0) return true; // dashes straight through
          if (P.iframes > 0) return false;
          if (hurt(o.dmg, o.x, o.y) && o.unparryable) ev('sigkill', o.x, o.y);
          return false;
        }
        return true;
      });
      s.bolts = s.bolts.filter((b) => {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (inWall(b)) return false;
        for (const e of alive()) if (hittable(e) && len(e.x - b.x, e.y - b.y) < e.r + b.r) { damage(e, b.dmg); return false; }
        return true;
      });
    }

    // ---- the step ---------------------------------------------------------------------------------
    function step(dt, inp) {
      if (s.outcome) return;
      inp = inp || {};
      s.time += dt;
      P.iframes = Math.max(0, P.iframes - dt);
      P.dashCd = Math.max(0, P.dashCd - dt);
      P.recoverT = Math.max(0, P.recoverT - dt);
      P.heat = Math.max(0, P.heat - T.HEAT_DECAY * dt);
      for (const k of Object.keys(s.cooldowns)) s.cooldowns[k] = Math.max(0, s.cooldowns[k] - dt);
      if (P.attackT > 0) { P.attackT -= dt; if (P.attackT <= 0) { P.attackT = 0; P.chainT = T.KILL_CHAIN; } }
      else P.chainT = Math.max(0, P.chainT - dt);

      let mv = { x: inp.mx || 0, y: inp.my || 0 };
      if (len(mv.x, mv.y) > 1) mv = norm(mv.x, mv.y);
      const aimIn = norm(inp.ax || 0, inp.ay || 0);
      const aim = aimIn.x || aimIn.y ? aimIn : P.face;
      const free = P.recoverT <= 0;

      if (inp.dash && free && P.dashT <= 0 && P.dashCd <= 0) {
        P.dashT = T.DASH_TIME; P.dashDir = mv.x || mv.y ? norm(mv.x, mv.y) : P.face; P.attackT = 0;
        ev('dash');
      }
      if (inp.trap) startParry();
      if (inp.kill && free && P.dashT <= 0 && P.attackT <= 0) swing(aim);
      if (inp.tool) useTool(inp.tool, aimFor(inp.tool, aimIn));

      if (P.dashT > 0) {
        const d = (T.DASH_DIST / T.DASH_TIME) * Math.min(dt, P.dashT);
        const m = CK.Rooms.moveCircle(room, P.x, P.y, T.PLAYER_R, P.dashDir.x * d, P.dashDir.y * d);
        P.x = m.x; P.y = m.y; P.dashT -= dt;
        if (P.dashT <= 1e-9) { P.dashT = 0; P.dashCd = T.DASH_CD; }
        P.moving = true;
      } else {
        const sp = T.MOVE * (P.attackT > 0 ? T.ATTACK_MOVE_MUL : 1) * dt;
        const m = CK.Rooms.moveCircle(room, P.x, P.y, T.PLAYER_R, mv.x * sp, mv.y * sp);
        P.x = m.x; P.y = m.y;
        P.moving = len(mv.x, mv.y) > 0.1;
        if (P.moving && P.attackT <= 0) P.face = norm(mv.x, mv.y);
      }
      updateParry(dt);

      for (const e of s.enemies) updateEnemy(e, dt);
      updateOrbs(dt);
      for (const e of s.enemies) contact(e);

      if (!s.outcome && !alive().length) { s.outcome = 'win'; s.clean = P.hitsTaken === 0; ev('clear'); }
    }
    function startParry() {
      if (P.recoverT > 0 || P.parryT > 0) return;
      P.parryT = kid ? T.PARRY_KID : T.PARRY; P.parryCaught = false; ev('trap');
    }
    // A window that closes with nothing caught leaves the Colonel open for PARRY_RECOVER.
    function updateParry(dt) {
      if (P.parryT <= 0) return;
      P.parryT -= dt;
      if (P.parryT <= 1e-9) {
        P.parryT = 0;
        if (!P.parryCaught) { P.recoverT = T.PARRY_RECOVER; ev('parry-miss'); }
      }
    }
    // With no explicit aim, echo snaps to the nearest hittable enemy inside the facing cone.
    function aimFor(tool, aimIn) {
      if (aimIn.x || aimIn.y) return aimIn;
      if (tool !== 'echo') return P.face;
      const half = (T.AIM_CONE_DEG / 2) * (Math.PI / 180);
      let best = null; let bestD = Infinity;
      for (const e of alive()) {
        if (!hittable(e)) continue;
        const dx = e.x - P.x; const dy = e.y - P.y; const d = len(dx, dy);
        if (d < 1e-6 || angleBetween(P.face, norm(dx, dy)) > half) continue;
        if (d < bestD) { bestD = d; best = norm(dx, dy); }
      }
      return best || P.face;
    }

    return s;
  }

  CK.Action = { TUNING, create };
})(typeof window !== 'undefined' ? window : globalThis);
