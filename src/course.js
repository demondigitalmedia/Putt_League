/* =====================================================================
   PUTT LEAGUE · COURSE
   The rules for whichever venue is live (venues/<id>.js, picked with Course.use): every solid
   (the venue's, plus each hole's basket and bank board), the discs, the aim solver, the throw,
   the lie rule and relief, reading a throw for points, and the scoring. The live venue's layout
   (ROOM, OAK, ...) and HOLES are mirrored onto Course, so Course.HOLES is always the live course.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { const Venues = require('./venues.js'); require('./venues/taproom.js'); module.exports = factory(Venues); }
  else root.Course = factory(root.Venues);
})(typeof self !== 'undefined' ? self : this, function (Venues) {
  'use strict';
  const FT = 0.3048;

  /* ---------- the live venue ---------- */
  let V = null, HOLES = [], BIG_BANKS = {}, mirrored = [];
  function use(id) {
    V = typeof id === 'object' ? Venues.register(id) : Venues.get(id);
    HOLES = V.HOLES;
    HOLES.forEach(h => { h.dist = Math.hypot(h.basket.x - h.tee.x, h.basket.y - h.tee.y); });
    BIG_BANKS = {}; HOLES.forEach(h => { if (h.backstop.bank) BIG_BANKS[h.backstop.name] = h.backstop.bank; });
    mirrored.forEach(k => { delete api[k]; });
    mirrored = Object.keys(V.layout || {}).concat(['HOLES', 'venue']);
    Object.assign(api, V.layout || {}, { HOLES, venue: V });
    return V;
  }

  /* ---------- discs (speed 4 and under) ---------- */
  const DISCS = [
    { key: 'putter', label: 'PUTTER', speed: 2, glide: 3, turn: 0, fade: 1, color: 0xF2A13B },
    { key: 'approach', label: 'APPROACH', speed: 3, glide: 4, turn: 0, fade: 2, color: 0x2E9C9A },
    { key: 'mid', label: 'MID', speed: 4, glide: 5, turn: -1, fade: 1, color: 0xE0482F },
  ];

  /* ---------- surfaces ---------- */
  function installFloor(MATS) { Object.keys(V.SURFACES).forEach(k => { MATS.surfaces[k] = V.SURFACES[k]; }); }
  const surfaceAt = (x, y) => V.surfaceAt(x, y);
  const inPlay = (x, y) => V.inPlay(x, y);

  /* ---------- every solid (world metres) ---------- */
  function worldSolids(activeHole) {
    const S = [];
    const box = (name, x, y, hx, hy, z0, z1, mat, tag) => S.push({ kind: 'box', x, y, hx, hy, yaw: 0, z0, z1, mat, name, tag: tag || name });
    const cyl = (name, x, y, r, z0, z1, mat, tag) => S.push({ kind: 'cyl', x, y, r, z0, z1, mat, name, tag: tag || name });
    V.solids(box, cyl, S);
    // baskets and their bank boards
    HOLES.forEach((h, i) => {
      const b = h.backstop;
      if (b.kind === 'gong') box('Gong', b.x, b.y, b.r, b.t, b.z - b.r, b.z + b.r, 'metal', 'Gong');
      else box(b.name, b.x, b.y, b.hx, b.hy, 0, b.h, b.mat || (b.kind === 'kegs' ? 'metal' : b.kind === 'sacks' ? 'hay' : b.kind === 'dock' ? 'stone' : 'timber'), b.name);
      if (i === activeHole) {
        // the live basket's pole and base, for a disc already on the ground (the catcher handles them in the air)
        S.push({ kind: 'cyl', x: h.basket.x, y: h.basket.y, r: 0.024, z0: 0, z1: 1.47, mat: 'metal', name: 'Basket pole', tag: 'Basket', groundOnly: true });
        S.push({ kind: 'cyl', x: h.basket.x, y: h.basket.y, r: 0.22, z0: 0, z1: 0.06, mat: 'metal', name: 'Basket base', tag: 'Basket', groundOnly: true });
      } else {
        cyl('Other basket', h.basket.x, h.basket.y, 0.03, 0, 1.47, 'metal', 'OtherBasket');
        cyl('Other basket', h.basket.x, h.basket.y, 0.34, 0.58, 0.82, 'metal', 'OtherBasket');
        cyl('Other basket', h.basket.x, h.basket.y, 0.29, 1.32, 1.43, 'metal', 'OtherBasket');
      }
    });
    return S;
  }
  function solidsFrom(o, activeHole) {
    return worldSolids(activeHole).map(s => {
      const c = JSON.parse(JSON.stringify(s));
      if (c.kind === 'capsule') { c.a.x -= o.x; c.a.y -= o.y; c.b.x -= o.x; c.b.y -= o.y; }
      else { c.x -= o.x; c.y -= o.y; }
      return c;
    });
  }

  /* ---------- the throw: flick class -> release, and the aim solver ---------- */
  const RELEASE_H = 1.0, CHAIN_Z = 1.08;
  const BANK = { 3: -26, 2: -16, 1: -8, 0: 0, '-1': 8, '-2': 16, '-3': 26 };
  function mphFor(d) { return d <= 12 ? 11 + 0.95 * d : 22.4 + 0.45 * (d - 12); }   // putts: a firm-but-dying pace, so a miss ends a few feet past, not across the room
  function baseParams(disc, cls) {
    return { disc: { speed: disc.speed, glide: disc.glide, turn: disc.turn, fade: disc.fade }, hand: 'RHBH', spin: 900,
      hyzer: BANK[cls] || 0, launchAngle: 6, nose: 4.5, releaseHeight: RELEASE_H / FT, groundEffect: 0.25 };
  }
  /* aim and launch that carry a clean, neutral throw of this class (nothing in the way) to the target at a
     natural speed for the distance. Nose and power are applied after, as deviations. */
  function solve(P, from, disc, cls, target, ceiling) {
    const tx = target.x - from.x, ty = target.y - from.y, dist = Math.max(0.5, Math.hypot(tx, ty));
    let aimZ = target.z != null ? target.z : CHAIN_Z;
    const p = baseParams(disc, cls);
    const ux = tx / dist, uy = ty / dist;
    const probe = (aimDeg, la, mph) => {
      const r = P.simulate(Object.assign({}, p, { aim: aimDeg, armSpeed: mph, launchAngle: la, nose: la - 1.5, seed: 1 }));
      let prev = null, apex = 0;
      for (const s of r.samples) {
        apex = Math.max(apex, s.z * FT);
        const x = s.x * FT, y = s.y * FT, along = x * ux + y * uy;
        if (along >= dist) {
          let k = 1, q = s;
          if (prev) { const pa = prev.x * FT * ux + prev.y * FT * uy; k = (dist - pa) / ((along - pa) || 1); q = prev; }
          const lx = (q.x + (s.x - q.x) * k) * FT, ly = (q.y + (s.y - q.y) * k) * FT, z = (q.z + (s.z - q.z) * k) * FT;
          return { z, lat: lx * uy - ly * ux, reached: true, apex };
        }
        prev = s;
      }
      const last = r.samples[r.samples.length - 1];
      return { z: -1, lat: last.x * FT * uy - last.y * FT * ux, reached: false, apex };
    };
    let aim = Math.atan2(tx, ty) * 180 / Math.PI, launch, speed;
    if (target.carry) {
      // aimed through a point in the air: the disc goes THROUGH the reticle and comes down about where it is
      // headed (the basket, or just past the point if the point is beyond it). For a launch angle, find the arm
      // speed that passes the point; then pick the launch whose landing matches, the lowest one if several do.
      // Indoors nothing may top out into the rafters.
      const goal = target.land || Math.max(dist + 1.5, (target.carry || dist) / 1.2), roof = ceiling ? Math.min(ceiling, 4.6) : 0;
      const run = (la, mph) => {
        const r = P.simulate(Object.assign({}, p, { aim, armSpeed: mph, launchAngle: la, nose: la - 1.5, seed: 1 }));
        let prev = null, apex = 0, zAt = null, lat = 0, land = 0;
        for (const s of r.samples) {
          apex = Math.max(apex, s.z * FT);
          const x = s.x * FT, y = s.y * FT, along = x * ux + y * uy; land = along;
          if (zAt === null && along >= dist) {
            let k = 1, q = s;
            if (prev) { const pa = prev.x * FT * ux + prev.y * FT * uy; k = (dist - pa) / ((along - pa) || 1); q = prev; }
            const lx = (q.x + (s.x - q.x) * k) * FT, ly = (q.y + (s.y - q.y) * k) * FT; zAt = (q.z + (s.z - q.z) * k) * FT; lat = lx * uy - ly * ux;
          }
          prev = s;
        }
        if (zAt === null) { const L = r.samples[r.samples.length - 1]; lat = L.x * FT * uy - L.y * FT * ux; }
        return { zAt, lat, land, apex };
      };
      const speedFor = (la) => {
        let lo = 8, hi = 85, best = null;
        for (let i = 0; i < 11; i++) {
          const mid = (lo + hi) / 2, r = run(la, mid);
          aim += Math.atan2(-r.lat, dist) * 180 / Math.PI;
          if (r.zAt === null || r.zAt < aimZ) lo = mid; else hi = mid;
          best = { mph: mid, r };
        }
        const r = run(la, (lo + hi) / 2);
        return { la, mph: (lo + hi) / 2, r, aim, ok: r.zAt !== null && Math.abs(r.zAt - aimZ) < 0.25 && hi < 84 };
      };
      const search = () => {
        const la0 = Math.max(-4, Math.min(40, Math.atan2(aimZ - RELEASE_H, dist) * 57.3 + 1));
        let pick = null, prevC = null;
        for (let la = la0; la <= 50; la += 5) {
          const c = speedFor(la);
          if (!c.ok || (roof && c.r.apex > roof)) continue;
          if (c.r.land <= goal) {
            if (prevC) { let A = prevC, B = c; for (let j = 0; j < 3; j++) { const m = speedFor((A.la + B.la) / 2); if (!m.ok || (roof && m.r.apex > roof)) break; if (m.r.land > goal) A = m; else B = m; } pick = Math.abs(A.r.land - goal) < Math.abs(B.r.land - goal) ? A : B; }
            else pick = c;
            break;
          }
          prevC = c;
        }
        return pick || prevC;
      };
      let pick = search();
      // indoors, a point too high to thread under the rafters from here: the highest line that fits
      while (!pick && roof && aimZ > RELEASE_H + 0.2) { aimZ = Math.max(RELEASE_H, aimZ - 0.4); pick = search(); }
      if (!pick) pick = speedFor(Math.max(-4, Math.atan2(aimZ - RELEASE_H, dist) * 57.3 + 1));
      launch = pick.la; speed = pick.mph; aim = pick.aim;
      // polish: settle the line and the arm on this launch so it really threads the point
      for (let j = 0; j < 5; j++) {
        const r = run(launch, speed); if (r.zAt === null) { speed *= 1.03; continue; }
        if (roof && r.apex > roof && j > 0) { speed /= 1.02; break; }
        aim += Math.atan2(-r.lat, dist) * 180 / Math.PI;
        const dz = aimZ - r.zAt; if (Math.abs(dz) < 0.04 && Math.abs(r.lat) < 0.04) break;
        speed *= 1 + Math.max(-0.02, Math.min(0.02, dz * 0.03));
      }
    } else if (dist <= 13) {
      speed = mphFor(dist); launch = 6;
      for (let i = 0; i < 18; i++) {
        const a = probe(aim, launch, speed);
        aim += Math.atan2(-a.lat, dist) * 180 / Math.PI;
        const dz = aimZ - a.z;
        if (a.reached && Math.abs(dz) < 0.015 && Math.abs(a.lat) < 0.015) break;
        launch += a.reached ? Math.max(-5, Math.min(5, dz / dist * 57.3 * 0.9)) : 3;
        if (launch > 24) { launch = 24; speed *= 1.05; }
        launch = Math.max(-8, launch);
      }
    } else {
      // pitches: a natural launch for the disc; the speed is what we solve (and the launch drops if the apex would hit a ceiling)
      launch = disc.speed <= 2 ? 11 : disc.speed === 3 ? 9 : 8;
      speed = mphFor(dist);
      for (let i = 0; i < 16; i++) {
        const a = probe(aim, launch, speed);
        aim += Math.atan2(-a.lat, dist) * 180 / Math.PI;
        if (ceiling && a.apex > ceiling && launch > 2) { launch -= 1.5; continue; }
        const dz = aimZ - a.z;
        if (a.reached && Math.abs(dz) < 0.03 && Math.abs(a.lat) < 0.03) break;
        speed *= a.reached ? (1 + Math.max(-0.08, Math.min(0.12, dz / dist * 1.4))) : 1.1;
        speed = Math.max(8, Math.min(75, speed));
      }
    }
    return Object.assign(p, { aim, launchAngle: launch, nose: launch - 1.5, armSpeed: speed, solvedMph: speed, dist });
  }
  // where to aim by default from a lie: the basket, unless the venue routes it (out a door, around a corner)
  function defaultTarget(holeIndex, lie) { return V.defaultTarget ? V.defaultTarget(HOLES[holeIndex], lie) : null; }

  function throwIt(E, holeIndex, from, params, seed) {
    const h = HOLES[holeIndex], o = { x: from.x, y: from.y, z: 0 };
    const sim = Object.assign({}, params, {
      seed: seed != null ? seed : 1,
      collider: E.FB.createCatcher({ base: { x: h.basket.x - o.x, y: h.basket.y - o.y, z: 0 }, mount: 'ground' }),
      contact: E.CT.create({ materials: E.MATS, solidMaterials: E.MATS.solids, solids: solidsFrom(o, holeIndex), surfaceAt: (x, y) => surfaceAt(x + o.x, y + o.y), noTombstone: true, seed: seed || 7 }),
    });
    const rec = E.P.simulate(sim);
    rec.origin = o; rec.hole = holeIndex;
    const last = rec.samples[rec.samples.length - 1];
    let li = rec.samples.length - 1; for (let i = rec.samples.length - 1; i >= 0; i--) if (!rec.samples[i].post) { li = i; break; }
    const L = rec.samples[li];
    rec.rest = { x: L.x * FT + o.x, y: L.y * FT + o.y, z: L.z * FT };
    return rec;
  }

  /* ---------- the lie: where the next throw goes from ---------- */
  function footprints(activeHole) {
    const out = [];
    worldSolids(activeHole).forEach(s => {
      if (s.tag === 'Wall' || s.tag === 'Ceiling' || s.tag === 'Beam' || s.tag === 'Fence' || s.groundOnly || s.kind === 'blob') return;
      if (s.kind === 'box') out.push({ k: 'box', x: s.x, y: s.y, hx: s.hx, hy: s.hy });
      else if (s.kind === 'cyl') { if (s.z0 < 1.5) out.push({ k: 'cyl', x: s.x, y: s.y, r: s.r }); }
      else if (s.kind === 'capsule') { if (Math.min(s.a.z, s.b.z) < 1.5) out.push({ k: 'box', x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2, hx: Math.abs(s.a.x - s.b.x) / 2 + s.r, hy: Math.abs(s.a.y - s.b.y) / 2 + s.r }); }
    });
    return out;
  }
  function blocked(x, y, fp, m) {
    if (!inPlay(x, y)) return true;
    if (V.nearEdge && V.nearEdge(x, y, m)) return true;
    for (const f of fp) {
      if (f.k === 'box' && Math.abs(x - f.x) < f.hx + m && Math.abs(y - f.y) < f.hy + m) return true;
      if (f.k === 'cyl' && Math.hypot(x - f.x, y - f.y) < f.r + m) return true;
    }
    return false;
  }
  function fixLie(x, y, activeHole, prev) {
    const fp = footprints(activeHole), m = 0.4;
    if (!inPlay(x, y) && prev) return { x: prev.x, y: prev.y, moved: true, ob: true };
    let res = null;
    if (!blocked(x, y, fp, m)) res = { x, y, moved: false };
    else {
      for (let r = 0.25; r < 6 && !res; r += 0.25) for (let k = 0; k < 24; k++) {
        const a = k / 24 * Math.PI * 2, nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
        if (!blocked(nx, ny, fp, m)) { res = { x: nx, y: ny, moved: true }; break; }
      }
      if (!res) return prev ? { x: prev.x, y: prev.y, moved: true } : { x, y, moved: false };
    }
    // relief from the bank board: a lie tucked behind it (the board between you and the basket) slides around
    // the basket, same distance, to the nearest side with a look at the chains
    const h = HOLES[activeHole], bk = h.basket, b = h.backstop, d0 = Math.hypot(res.x - bk.x, res.y - bk.y);
    const hx = (b.kind === 'gong' ? b.r : b.hx) + 0.3, hy = (b.kind === 'gong' ? b.t : b.hy) + 0.3;
    const hides = (px, py) => { for (let i = 1; i < 20; i++) { const k = i / 20, qx = px + (bk.x - px) * k, qy = py + (bk.y - py) * k; if (Math.abs(qx - b.x) < hx && Math.abs(qy - b.y) < hy) return true; } return false; };
    if (d0 < 9 && d0 > 0.3 && hides(res.x, res.y)) {
      const a0 = Math.atan2(res.y - bk.y, res.x - bk.x);
      for (let da = 0.08; da < 3.0; da += 0.08) for (const sg of [1, -1]) {
        const a = a0 + sg * da, nx = bk.x + Math.cos(a) * d0, ny = bk.y + Math.sin(a) * d0;
        if (!hides(nx, ny) && !blocked(nx, ny, fp, m)) return { x: nx, y: ny, moved: true, relief: true };
      }
    }
    // relief from being pinned against something big (the venue lists them: the silo, the box truck, a kettle): a lie
    // tucked within a couple of metres of it, with it square in the way, slides around it (same distance to the basket)
    // just far enough to see past its edge. Lies farther back play it as it lies.
    const big = V.bigObstacles || [];
    const gap = (o, px, py) => o.k === 'c' ? Math.hypot(px - o.x, py - o.y) - o.r : Math.max(Math.abs(px - o.x) - o.hx, Math.abs(py - o.y) - o.hy);
    const inWay = (o, px, py) => { for (let i = 1; i < 24; i++) { const k = i / 24, qx = px + (bk.x - px) * k, qy = py + (bk.y - py) * k; if (gap(o, qx, qy) < 0.35) return true; } return false; };
    for (const o of big) {
      if (gap(o, res.x, res.y) > 2.2 || !inWay(o, res.x, res.y)) continue;
      const a0 = Math.atan2(res.y - bk.y, res.x - bk.x);
      for (let da = 0.03; da < 1.2; da += 0.03) for (const sg of [1, -1]) {
        const a = a0 + sg * da, nx = bk.x + Math.cos(a) * d0, ny = bk.y + Math.sin(a) * d0;
        if (Math.hypot(nx - res.x, ny - res.y) > 5) break;
        if (!inWay(o, nx, ny) && !blocked(nx, ny, fp, m)) return { x: nx, y: ny, moved: true, relief: true };
      }
    }
    return res;
  }

  /* ---------- reading a throw for points ---------- */
  const PTS = { make: 1000, bank: 1500, bigBank: 2000, skipIn: 2000, over: 800, thread: 1000, under: 800, kiss: 300, hung: 500, ceiling: 300,
    pair: 1500, chainout: 250, spit: 300, band: 150, pole: 200, cage: 100, pinball: 150, wall: 50, roller: 20, skip: 75, cheers: 300,
    ace: 10000, downtown: 40, parked: 300, circle: 100 };
  function readThrow(rec, mode, stroke) {
    const h = HOLES[rec.hole], ev = rec.events || [], out = [], c = rec.catchResult || { outcome: 'none' }, o = rec.origin;
    const made = c.outcome === 'made';
    const madeT = made ? (ev.find(e => e.type === 'made') || { t: 1e9 }).t : 1e9;
    const before = e => e.t < madeT;
    const bounces = ev.filter(e => e.type === 'bounce'), floor = ev.filter(e => e.type === 'skip' || e.type === 'hop');
    const award = (key, label, pts, kind, trick) => out.push({ key, label, pts, kind: kind || 'bonus', trick: !!trick });
    const W = s => ({ x: s.x * FT + o.x, y: s.y * FT + o.y, z: s.z * FT });
    // the venue's passes (over, under, through things), read off the flight
    const tk = V.tricks || {}, f = tk.start ? tk.start(o) : {}, k = { award, bounces, out, PTS };
    if (tk.sample) for (const s0 of rec.samples || []) { if (s0.landed) break; tk.sample(f, W(s0)); }
    const brushed = ev.some(e => e.type === 'brush'), hung = ev.some(e => e.type === 'hung');
    const ceiling = bounces.some(e => e.name === 'Ceiling');
    if (made) {
      if (mode === 'pitch' && stroke === 1) award('ace', 'ACE!!!', PTS.ace, 'make', true);
      else award('make', 'CHAAING!', PTS.make, 'make');
      const bb = bounces.filter(before);
      const big = bb.find(e => BIG_BANKS[e.name]);
      if (big) award('bigbank', BIG_BANKS[big.name] + '!', PTS.bigBank, 'bonus', true);
      else if (bb.length) award('bank', 'BANK OFF THE ' + String(bb[bb.length - 1].name || 'WALL').toUpperCase() + '!', PTS.bank, 'bonus', true);
      if (ceiling) award('ceilbank', 'CEILING SHOT', PTS.ceiling, 'bonus', true);
      if (floor.some(before)) award('skipIn', 'SKIP IN!', PTS.skipIn, 'bonus', true);
      if (tk.make) tk.make(f, k);
      if (brushed) award('kiss', 'TREE KISS', PTS.kiss, 'bonus', true);
      const d = Math.hypot(h.basket.x - o.x, h.basket.y - o.y) / FT;
      if (d > 34) award('downtown', 'DOWNTOWN ' + Math.round(d) + ' FT', Math.round(PTS.downtown * d), 'bonus', d > 60);
    } else {
      const map = { chainout: ['CHAIN OUT', PTS.chainout], spit: ['SPIT THROUGH!', PTS.spit], band: ['RIM SHOT', PTS.band], pole: ['CLANG!', PTS.pole], cage: ['CAGE RATTLE', PTS.cage] };
      if (map[c.outcome]) award(c.outcome, map[c.outcome][0], map[c.outcome][1], 'near');
      if (bounces.length >= 2) award('pinball', 'PINBALL x' + bounces.length, PTS.pinball * bounces.length);
      else if (bounces.some(e => e.name === 'Wall')) award('wall', 'WALL BALL', PTS.wall);
      if (ceiling) award('ceiling', 'CEILING SHOT', PTS.ceiling);
      const roll = ev.find(e => e.type === 'roll');
      if (roll) { const rx = roll.x * FT + o.x, ry = roll.y * FT + o.y, d = Math.hypot(rec.rest.x - rx, rec.rest.y - ry); if (d > 1) award('roller', 'ROLLER ' + Math.round(d / FT) + ' FT', Math.round(PTS.roller * d / FT)); }
      if (floor.length >= 2) award('skips', 'SKIPPER x' + floor.length, PTS.skip * floor.length);
      if (hung) award('hung', 'STUCK IN THE TREE!', PTS.hung);
      else if (brushed) award('kiss', 'TREE KISS', PTS.kiss);
      if (tk.miss) tk.miss(f, k);
      if (mode === 'pitch') {
        const d = Math.hypot(rec.rest.x - h.basket.x, rec.rest.y - h.basket.y);
        if (d < 0.9) award('parked', 'PARKED IT', PTS.parked);
        else if (d < 3) award('circle', 'TAP-IN RANGE', PTS.circle);
      }
    }
    if (tk.hits) tk.hits(f, k);
    return { made, outcome: c.outcome, awards: out, tricks: out.filter(a => a.trick).length };
  }
  function scoreName(strokes, par) {
    if (strokes === 1) return 'ACE';
    const d = strokes - par;
    return d <= -2 ? 'EAGLE' : d === -1 ? 'BIRDIE' : d === 0 ? 'PAR' : d === 1 ? 'BOGEY' : d === 2 ? 'DOUBLE BOGEY' : '+' + d;
  }
  const HOLE_PTS = { ACE: 10000, EAGLE: 5000, BIRDIE: 3000, PAR: 1500, BOGEY: 500 };

  const api = { FT, DISCS, PTS, HOLE_PTS, BANK, CHAIN_Z, Venues, use, venueIds: () => Venues.ids(),
    installFloor, surfaceAt, inPlay, worldSolids, solidsFrom, baseParams, mphFor, solve, defaultTarget, throwIt, fixLie, readThrow, scoreName };
  use();
  return api;
});
