/* Colonel Kernel — action simulation (no drawing; roomscene.js renders it).
 * Free movement in a room, dash with i-frames, `kill` combo, `trap` parry, `echo` bolts, `ls` reveal, Glitch Mites. */
(function (root) {
  'use strict';
  const CK = (root.CK = root.CK || {});

  const TUNING = {
    MOVE: 110, PLAYER_R: 7, IFRAMES_HURT: 0.6, ATTACK_MOVE_MUL: 0.4,
    DASH_DIST: 70, DASH_TIME: 0.15, DASH_CD: 0.35, DASH_GRACE: 0.12, // after a dash, its energy shield lingers this long
    KILL_DMG: 12, KILL_TIME: 0.22, KILL_CHAIN: 0.4, KILL_RANGE: 30, KILL_LUNGE: 10, KILL_COOL_HEAT: 8, KILL_ARC_DEG: 70, KNOCK: 4,
    PARRY: 0.18, PARRY_KID: 0.30, PARRY_RECOVER: 0.35, STUN: 1.2, REFLECT_MUL: 2,
    ECHO_SPEED: 260, ECHO_DMG: 10, ECHO_CD: 0.35, ECHO_HEAT: 9, OVERHEAT_LOCK: 1.5, HEAT_DECAY: 25, BOLT_R: 3, ORB_R: 3,
    LS_CD: 3, LS_HEAT: 15, LS_REVEAL: 4, LS_REVEAL_A: 7, ECHO_N_MUL: 0.75,
    KILL9_CHARGE: 0.6, KILL9_DMG: 40, KILL9_RANGE: 34, KILL9_ARC_DEG: 100, BREAK_REACH: 36,
    MITE: { r: 6, speed: 45, shootEvery: 2.4, orbSpeed: 80, orbDmg: 8, contactDmg: 6,
      lungeEvery: 3.5, lungeTell: 0.4, lungeSpeed: 160, lungeTime: 0.3, lungeDmg: 10 },
    KID_SPEED: 0.8, KID_STABILITY: 130,
    // targeting: a soft target in front of you; mouse aim narrows it; lock-on holds it
    TARGET: { CONE_DEG: 60, AIM_CONE_DEG: 20, RANGE: 170, KEEP: 200, KEEP_DEG: 90, LOCK_RANGE: 260, STEAL: 0.6, ANGLE_W: 1.5 },
  };

  const len = (x, y) => Math.hypot(x, y);
  function norm(x, y) { const l = len(x, y); return l > 1e-9 ? { x: x / l, y: y / l } : { x: 0, y: 0 }; }
  const angleBetween = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y)));

  function create(opts) {
    const T = TUNING; const M = T.MITE;
    const room = opts.room; const kid = !!opts.kid; const rng = CK.rng(opts.seed || 1);
    const slow = kid ? T.KID_SPEED : 1;
    const tools = (opts.tools || []).slice();
    const upgrades = (opts.upgrades || []).slice();
    const mods = Object.assign({ cdMul: 1, heatMul: 1, moveMul: 1, dashCdMul: 1 }, opts.mods || {});
    const breakables = (opts.breakables || []).map((b) => ({ id: b.id, tiles: b.tiles.map((t) => t.slice()) }));
    const spawnList = opts.spawns || room.spawns;
    const maxStability = kid ? T.KID_STABILITY : 100;

    const s = {
      room, kid, tools, upgrades, mods, breakables, target: null, locked: false, time: 0, outcome: null, clean: false, events: [], hadFoes: spawnList.length > 0,
      player: {
        x: room.player.x, y: room.player.y, face: { x: 0, y: 1 }, stability: maxStability, maxStability,
        dashT: 0, dashCd: 0, dashDir: { x: 0, y: 1 }, iframes: 0, attackT: 0, combo: 0, chainT: 0,
        parryT: 0, recoverT: 0, parryCaught: false, shieldT: 0, heat: 0, overheatUntil: 0, hitsTaken: 0, moving: false, chargeT: 0, charged: false,
      },
      enemies: [],
      orbs: [], bolts: [], cooldowns: { echo: 0, ls: 0 },
      spawnOrb(o) { s.orbs.push({ x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, r: T.ORB_R, dmg: o.dmg || M.orbDmg, unparryable: !!o.unparryable, from: 'enemy', src: o.src || null }); },
      step,
    };
    const P = s.player;
    const ev = (type, x, y, extra) => s.events.push(Object.assign({ type, x: x === undefined ? P.x : x, y: y === undefined ? P.y : y }, extra || {}));
    const hittable = (e) => !e.dead && (!e.cloaked || s.time < e.revealedUntil || s.time < e.stunUntil);
    const alive = () => s.enemies.filter((e) => !e.dead);

    // What foes.js may see and do.
    const foeCtx = {
      room, rng, player: P, slow, get time() { return s.time; },
      orb(o) { s.orbs.push({ x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, r: T.ORB_R, dmg: o.dmg || M.orbDmg, unparryable: !!o.unparryable, from: 'enemy', src: o.src || null }); },
      ev(type, x, y, extra) { ev(type, x, y, extra); },
      // A seeded walkable spot at least minDist from the Colonel (falls back to where the foe stands).
      floorPoint(minDist, e) {
        const TL = CK.Rooms.TILE;
        for (let i = 0; i < 40; i++) {
          const tx = 1 + Math.floor(rng() * (room.cols - 2)); const ty = 1 + Math.floor(rng() * (room.rows - 2));
          const x = tx * TL + TL / 2; const y = ty * TL + TL / 2; const r = (e && e.r) || 8;
          if (CK.Rooms.collides(room, x, y, r)) continue;
          if (Math.hypot(x - P.x, y - P.y) >= minDist) return { x, y };
        }
        return { x: e ? e.x : P.x, y: e ? e.y : P.y };
      },
    };
    s.enemies = spawnList.map((sp, i) => CK.Foes.make(sp.kind, sp, i, foeCtx));

    function hurt(dmg, x, y) {
      if (P.dashT > 0 || P.iframes > 0 || s.outcome) return false;
      if (P.shieldT > 0) { ev('shield-block', x, y); return false; } // the dash shield takes it: no damage, not a hit
      P.stability = Math.max(0, P.stability - dmg); P.hitsTaken++; P.iframes = T.IFRAMES_HURT;
      ev('hurt', x, y);
      if (P.stability <= 0) { s.outcome = 'lose'; ev('lose'); }
      return true;
    }
    function addHeat(n) {
      P.heat = Math.min(100, P.heat + n * mods.heatMul);
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
      if (strikeScenery(dir, T.KILL_ARC_DEG)) near = true;
      if (!hit && !near) { const m = CK.Rooms.moveCircle(room, P.x, P.y, T.PLAYER_R, dir.x * T.KILL_LUNGE, dir.y * T.KILL_LUNGE); P.x = m.x; P.y = m.y; }
    }
    // `kill -9`: the charged heavy strike.
    function heavy(dir) {
      P.attackT = T.KILL_TIME; P.chainT = 0; P.combo = 0; P.face = dir;
      ev('heavy', P.x + dir.x * 14, P.y + dir.y * 14);
      const arc = (T.KILL9_ARC_DEG * Math.PI) / 180;
      for (const e of alive()) {
        const dx = e.x - P.x; const dy = e.y - P.y; const d = len(dx, dy);
        if (d > T.KILL9_RANGE + e.r || (d > 1e-6 && angleBetween(dir, norm(dx, dy)) > arc) || !hittable(e)) continue;
        damage(e, T.KILL9_DMG);
        if (!e.dead) { const k = d < 1e-6 ? dir : norm(dx, dy); const m = CK.Rooms.moveCircle(room, e.x, e.y, e.r, k.x * T.KNOCK * 2, k.y * T.KNOCK * 2); e.x = m.x; e.y = m.y; }
      }
      strikeScenery(dir, T.KILL9_ARC_DEG);
    }
    // A swing also breaks corrupt blocks / cracked walls and flips switches in reach.
    function strikeScenery(dir, arcDeg) {
      const arc = (arcDeg * Math.PI) / 180; const TL = CK.Rooms.TILE; let any = false;
      const inReach = (tx, ty) => {
        const cx = tx * TL + TL / 2; const cy = ty * TL + TL / 2; const dx = cx - P.x; const dy = cy - P.y; const d = len(dx, dy);
        return d <= T.BREAK_REACH && (d < 1e-6 || angleBetween(dir, norm(dx, dy)) <= arc);
      };
      for (let i = breakables.length - 1; i >= 0; i--) {
        const b = breakables[i];
        if (!b.tiles.some(([tx, ty]) => inReach(tx, ty))) continue;
        breakables.splice(i, 1); any = true;
        b.tiles.forEach(([tx, ty]) => { if (room.tiles[ty] && room.tiles[ty][tx] === 'b') room.clearTile(tx, ty); });
        const [tx, ty] = b.tiles[0]; ev('break', tx * TL + TL / 2, ty * TL + TL / 2, { id: b.id });
      }
      for (const p of room.props || []) if (p.kind === 'switch' && inReach(p.tx, p.ty)) { any = true; ev('switch', p.x, p.y, { tx: p.tx, ty: p.ty }); }
      return any;
    }

    function useTool(id, aim) {
      if (!tools.includes(id) || s.cooldowns[id] > 0 || s.time < P.overheatUntil) return;
      if (id === 'ls') {
        const reveal = upgrades.includes('ls-a') ? T.LS_REVEAL_A : T.LS_REVEAL;
        s.enemies.forEach((e) => { e.revealedUntil = s.time + reveal; });
        s.cooldowns.ls = T.LS_CD * mods.cdMul; ev('reveal'); addHeat(T.LS_HEAT);
      } else if (id === 'echo') {
        fireEcho(aim);
      }
    }
    function fireEcho(d) {
      s.bolts.push({ x: P.x + d.x * 8, y: P.y + d.y * 8, vx: d.x * T.ECHO_SPEED, vy: d.y * T.ECHO_SPEED, r: T.BOLT_R, dmg: T.ECHO_DMG });
      s.cooldowns.echo = T.ECHO_CD * mods.cdMul * (upgrades.includes('echo-n') ? T.ECHO_N_MUL : 1); ev('echo'); addHeat(T.ECHO_HEAT);
    }

    // ---- enemies ------------------------------------------------------------------------------
    function updateEnemy(e, dt) { CK.Foes.update(e, dt, foeCtx); }

    function contact(e) {
      if (e.dead || s.time < e.stunUntil) return;
      if (len(e.x - P.x, e.y - P.y) >= T.PLAYER_R + e.r) return;
      if (e.state === 'lunge' && onLungeContact(e)) return;
      hurt(e.state === 'lunge' ? e.lungeDmg : e.contactDmg, e.x, e.y);
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
    // Shots fly over the void; a bolt that reaches a switch trips it.
    function inWall(o) {
      const tx = Math.floor(o.x / CK.Rooms.TILE); const ty = Math.floor(o.y / CK.Rooms.TILE);
      return room.blocksShots ? room.blocksShots(tx, ty) : room.solid(tx, ty);
    }
    function tripSwitch(o) {
      const tx = Math.floor(o.x / CK.Rooms.TILE); const ty = Math.floor(o.y / CK.Rooms.TILE);
      if (room.tiles[ty] && room.tiles[ty][tx] === '!') ev('switch', o.x, o.y, { tx, ty });
    }
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
        if (inWall(b)) { tripSwitch(b); return false; }
        for (const e of alive()) if (hittable(e) && len(e.x - b.x, e.y - b.y) < e.r + b.r) { damage(e, b.dmg); return false; }
        return true;
      });
    }

    // ---- the step ---------------------------------------------------------------------------------
    function step(dt, inp) {
      if (s.outcome === 'lose') return; // after a win the Colonel keeps moving; nothing is left to fight
      inp = inp || {};
      s.time += dt;
      P.iframes = Math.max(0, P.iframes - dt);
      P.dashCd = Math.max(0, P.dashCd - dt);
      P.recoverT = Math.max(0, P.recoverT - dt);
      P.shieldT = Math.max(0, P.shieldT - dt);
      P.heat = Math.max(0, P.heat - T.HEAT_DECAY * dt);
      for (const k of Object.keys(s.cooldowns)) s.cooldowns[k] = Math.max(0, s.cooldowns[k] - dt);
      if (P.attackT > 0) { P.attackT -= dt; if (P.attackT <= 0) { P.attackT = 0; P.chainT = T.KILL_CHAIN; } }
      else P.chainT = Math.max(0, P.chainT - dt);

      let mv = { x: inp.mx || 0, y: inp.my || 0 };
      if (len(mv.x, mv.y) > 1) mv = norm(mv.x, mv.y);
      const aimIn = norm(inp.ax || 0, inp.ay || 0); const aiming = !!(aimIn.x || aimIn.y);
      const free = P.recoverT <= 0;
      updateTarget(aiming ? aimIn : len(mv.x, mv.y) > 0.1 ? norm(mv.x, mv.y) : P.face, aiming);
      if (inp.cycle) cycleTarget();
      if (inp.lock) toggleLock();
      const tgt = byId(s.target);
      const aim = tgt ? toward(tgt) : aiming ? aimIn : P.face; // every attack goes at the target when there is one

      if (inp.dash && free && P.dashT <= 0 && P.dashCd <= 0) {
        P.dashT = T.DASH_TIME; P.dashDir = mv.x || mv.y ? norm(mv.x, mv.y) : P.face; P.attackT = 0;
        ev('dash');
      }
      if (inp.trap) startParry();
      if (inp.kill && free && P.dashT <= 0 && P.attackT <= 0) swing(aim);
      if (inp.tool) useTool(inp.tool, aim);
      // `kill -9`: keep kill held to charge, release to strike
      if (upgrades.includes('kill-9')) {
        if (inp.killHeld && P.dashT <= 0) {
          P.chargeT += dt;
          if (!P.charged && P.chargeT >= T.KILL9_CHARGE - 1e-9) { P.charged = true; ev('charge'); }
        } else {
          if (P.charged && !inp.killHeld && free && P.dashT <= 0) heavy(aim);
          P.chargeT = 0; P.charged = false;
        }
      }

      if (P.dashT > 0) {
        const d = (T.DASH_DIST / T.DASH_TIME) * Math.min(dt, P.dashT);
        const m = CK.Rooms.moveCircle(room, P.x, P.y, T.PLAYER_R, P.dashDir.x * d, P.dashDir.y * d);
        P.x = m.x; P.y = m.y; P.dashT -= dt;
        if (P.dashT <= 1e-9) { P.dashT = 0; P.dashCd = T.DASH_CD * mods.dashCdMul; P.shieldT = T.DASH_GRACE; }
        P.moving = true;
      } else {
        const sp = T.MOVE * mods.moveMul * (P.attackT > 0 ? T.ATTACK_MOVE_MUL : 1) * dt;
        const m = CK.Rooms.moveCircle(room, P.x, P.y, T.PLAYER_R, mv.x * sp, mv.y * sp);
        P.x = m.x; P.y = m.y;
        P.moving = len(mv.x, mv.y) > 0.1;
        if (P.moving && P.attackT <= 0) P.face = norm(mv.x, mv.y);
      }
      if (s.locked && tgt && P.dashT <= 0) P.face = toward(tgt); // locked on: always face it, so moving strafes
      updateParry(dt);

      for (const e of s.enemies) updateEnemy(e, dt);
      updateOrbs(dt);
      for (const e of s.enemies) contact(e);

      if (!s.outcome && s.hadFoes && !alive().length) { s.outcome = 'win'; s.clean = P.hitsTaken === 0; ev('clear'); }
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
    // ---- targeting ------------------------------------------------------------------------------
    // The soft target is the visible creature that best fits where you face, move or point (closer and
    // more in line scores better). It sticks until another is clearly better. Lock-on holds it until it
    // dies, cloaks again or gets far away. Cloaked creatures are never targeted: that would give them away.
    const TG = T.TARGET; const rad = (d) => (d * Math.PI) / 180;
    const byId = (id) => (id ? s.enemies.find((e) => e.id === id) : null);
    const toward = (e) => norm(e.x - P.x, e.y - P.y);
    const valid = (e, range) => !!e && !e.dead && hittable(e) && len(e.x - P.x, e.y - P.y) <= range;
    const scoreOf = (e, ref) => len(e.x - P.x, e.y - P.y) * (1 + angleBetween(ref, toward(e)) * TG.ANGLE_W);
    function updateTarget(ref, aiming) {
      if (s.locked) {
        if (valid(byId(s.target), TG.LOCK_RANGE)) return;
        s.locked = false; ev('unlock');
      }
      const cone = rad(aiming ? TG.AIM_CONE_DEG : TG.CONE_DEG);
      let best = null; let bs = Infinity;
      for (const e of alive()) {
        if (!valid(e, TG.RANGE) || angleBetween(ref, toward(e)) > cone) continue;
        const sc = scoreOf(e, ref); if (sc < bs) { bs = sc; best = e; }
      }
      const cur = byId(s.target);
      if (!aiming && valid(cur, TG.KEEP) && angleBetween(ref, toward(cur)) <= rad(TG.KEEP_DEG)) {
        if (best && best !== cur && bs < TG.STEAL * scoreOf(cur, ref)) s.target = best.id;
        return;
      }
      s.target = best ? best.id : null;
    }
    // Q / next target: go round the visible creatures by direction, and turn to face the new one.
    function cycleTarget() {
      const list = alive().filter((e) => valid(e, TG.KEEP)).sort((a, b) => Math.atan2(a.y - P.y, a.x - P.x) - Math.atan2(b.y - P.y, b.x - P.x));
      if (!list.length) return;
      const next = list[(list.findIndex((e) => e.id === s.target) + 1) % list.length];
      s.target = next.id; P.face = toward(next); ev('target', next.x, next.y);
    }
    function toggleLock() {
      if (s.locked) { s.locked = false; ev('unlock'); return; }
      const t = byId(s.target);
      if (!t) { ev('lock-none'); return; }
      s.locked = true; P.face = toward(t); ev('lock', t.x, t.y);
    }

    return s;
  }

  CK.Action = { TUNING, create };
})(typeof window !== 'undefined' ? window : globalThis);
