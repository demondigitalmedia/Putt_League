/* =====================================================================
   PUTT LEAGUE · BREWERY · HOLE 1 "THE COPPER AISLE"
   One file holds the hole: the room, every solid the disc can hit (in the flight engine's
   frame: metres, x right, y toward the back wall, z up, floor at z = 0), the basket, the two
   putt spots, the aim/power solver and the scoring. The 3D scene is drawn from the same
   numbers, so what you see is what the disc hits.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BreweryHole = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const FT = 0.3048, MPH = 0.44704;

  /* ---------- the room and what is in it (world metres) ---------- */
  const ROOM = { x0: -9, x1: 8, y0: -2, y1: 24, h: 6 };
  const BASKET = { x: 2.2, y: 12.0 };
  const SHOTS = [
    { key: 'short', label: 'SHORT', x: 2.0, y: 6.0, face: 0 },
    { key: 'long', label: 'LONG', x: -2.0, y: 3.0, face: 0 },
  ];
  const POSTS_X = [-2.8, 3.0], POSTS_Y = [3.0, 9.0, 15.0, 21.0];
  const KETTLES = [{ x: 5.0, y: 5.2, r: 1.0, h: 2.6 }, { x: 5.0, y: 9.6, r: 1.05, h: 2.8 }, { x: 5.2, y: 14.0, r: 0.95, h: 2.5 }];
  const FERMENTERS = [{ x: 4.6, y: 20.2, r: 0.8, h: 3.2 }, { x: 6.6, y: 20.4, r: 0.85, h: 3.4 }, { x: 6.6, y: 17.6, r: 0.75, h: 3.0 }];
  const BAR = { x0: -8.6, x1: -7.5, y0: 3.5, y1: 15.5, h: 1.05 };
  const TABLES = [5.5, 10.0, 14.5, 19.0].map(y => ({ x: -5.2, y, hx: 0.45, hy: 0.9, top: 0.79 }));
  // barrel stack: three on their sides (axis down the aisle) with two on top, in the long putt's line
  const STACK = { x: 0.0, y: 7.6, r: 0.33, len: 0.9 };
  const STACK_BARRELS = [[-0.68, 0.36], [0.0, 0.36], [0.68, 0.36], [-0.34, 0.94], [0.34, 0.94]].map(([dx, z]) => ({ x: STACK.x + dx, y: STACK.y, z }));
  // the gong: a big copper gong hung behind the basket. Overthrow it and it rings; catch it right and it banks you in.
  const GONG = { x: BASKET.x, y: BASKET.y + 0.8, r: 0.62, z: 1.35, t: 0.05 };
  const UPRIGHT_BARRELS = [{ x: 3.6, y: 3.4 }, { x: -2.2, y: 15.6 }, { x: 2.6, y: 20.8 }, { x: -0.9, y: 16.8 }];

  function worldSolids() {
    const S = [];
    const box = (name, x, y, hx, hy, z0, z1, mat, tag) => S.push({ kind: 'box', x, y, hx, hy, yaw: 0, z0, z1, mat, name, tag: tag || name });
    const cyl = (name, x, y, r, z0, z1, mat, tag) => S.push({ kind: 'cyl', x, y, r, z0, z1, mat, name, tag: tag || name });
    // walls
    box('Left wall', ROOM.x0 - 0.15, (ROOM.y0 + ROOM.y1) / 2, 0.15, (ROOM.y1 - ROOM.y0) / 2, 0, ROOM.h, 'brick_wall', 'Wall');
    box('Right wall', ROOM.x1 + 0.15, (ROOM.y0 + ROOM.y1) / 2, 0.15, (ROOM.y1 - ROOM.y0) / 2, 0, ROOM.h, 'brick_wall', 'Wall');
    box('Back wall', (ROOM.x0 + ROOM.x1) / 2, ROOM.y1 + 0.15, (ROOM.x1 - ROOM.x0) / 2, 0.15, 0, ROOM.h, 'brick_wall', 'Wall');
    box('Front wall', (ROOM.x0 + ROOM.x1) / 2, ROOM.y0 - 0.15, (ROOM.x1 - ROOM.x0) / 2, 0.15, 0, ROOM.h, 'brick_wall', 'Wall');
    box('Ceiling', (ROOM.x0 + ROOM.x1) / 2, (ROOM.y0 + ROOM.y1) / 2, (ROOM.x1 - ROOM.x0) / 2, (ROOM.y1 - ROOM.y0) / 2, ROOM.h, ROOM.h + 0.3, 'timber', 'Ceiling');
    POSTS_X.forEach(x => POSTS_Y.forEach(y => box('Timber post', x, y, 0.16, 0.16, 0, ROOM.h, 'timber', 'Post')));
    POSTS_Y.forEach(y => box('Cross beam', (ROOM.x0 + ROOM.x1) / 2, y, (ROOM.x1 - ROOM.x0) / 2, 0.15, ROOM.h - 0.75, ROOM.h - 0.35, 'timber', 'Beam'));
    KETTLES.forEach((k, i) => cyl('Copper kettle ' + (i + 1), k.x, k.y, k.r, 0.3, 0.75 + k.h + 0.4, 'metal', 'Kettle'));
    FERMENTERS.forEach((f, i) => cyl('Fermenter ' + (i + 1), f.x, f.y, f.r, 0.55, 1.2 + f.h, 'metal', 'Fermenter'));
    box('Bar', (BAR.x0 + BAR.x1) / 2, (BAR.y0 + BAR.y1) / 2, (BAR.x1 - BAR.x0) / 2 + 0.15, (BAR.y1 - BAR.y0) / 2 + 0.1, 0, BAR.h + 0.04, 'timber', 'Bar');
    TABLES.forEach(t => box('Table', t.x, t.y, t.hx, t.hy, 0.72, t.top, 'timber', 'Table'));
    STACK_BARRELS.forEach(b => S.push({ kind: 'capsule', a: { x: b.x, y: b.y - STACK.len / 2 + STACK.r * 0.6, z: b.z }, b: { x: b.x, y: b.y + STACK.len / 2 - STACK.r * 0.6, z: b.z }, r: STACK.r, mat: 'timber', name: 'Barrel stack', tag: 'Barrel' }));
    UPRIGHT_BARRELS.forEach(b => cyl('Barrel', b.x, b.y, 0.32, 0, 0.9, 'timber', 'Barrel'));
    box('Gong', GONG.x, GONG.y, GONG.r, GONG.t, GONG.z - GONG.r, GONG.z + GONG.r, 'metal', 'Gong');
    // the basket's pole and base for a disc already rolling on the floor (the catcher handles them in the air)
    S.push({ kind: 'cyl', x: BASKET.x, y: BASKET.y, r: 0.024, z0: 0, z1: 1.47, mat: 'metal', name: 'Basket pole', tag: 'Basket', groundOnly: true });
    S.push({ kind: 'cyl', x: BASKET.x, y: BASKET.y, r: 0.22, z0: 0, z1: 0.06, mat: 'metal', name: 'Basket base', tag: 'Basket', groundOnly: true });
    return S;
  }

  // solids moved into a throw's frame (origin at the putt spot)
  function solidsFrom(o) {
    return worldSolids().map(s => {
      const c = JSON.parse(JSON.stringify(s));
      if (c.kind === 'capsule') { c.a.x -= o.x; c.a.y -= o.y; c.b.x -= o.x; c.b.y -= o.y; }
      else { c.x -= o.x; c.y -= o.y; }
      return c;
    });
  }

  /* ---------- the putt: flick read -> engine release ---------- */
  const DISC = { speed: 2, glide: 3, turn: 0, fade: 1 };       // a putter
  const RELEASE_H = 1.0;                                      // m: putting release height
  const CHAIN_Z = 1.08;                                       // m: aim height in the chains
  // flick class (-3..3, + = hyzer side) -> release bank in the engine's sign (- = hyzer)
  const BANK = { 3: -26, 2: -16, 1: -8, 0: 0, '-1': 8, '-2': 16, '-3': 26 };

  function baseParams(shot, cls) {
    return {
      disc: DISC, hand: 'RHBH', spin: 900,
      hyzer: BANK[cls] || 0,
      launchAngle: 6, nose: 4.5,
      releaseHeight: RELEASE_H / FT, groundEffect: 0.25,
    };
  }
  // the putt speed a person would choose for a distance (mph)
  function puttMph(d) { return 14.5 + 1.0 * d; }

  /* find the aim and launch that carry a clean, neutral putt of this class (nothing in the way) to the
     chains at a natural putting speed. Nose and power are applied after, as deviations: nose down dives
     it into the floor (skips), more power sends it long, less leaves it short. */
  function solve(P, shot, cls, noseStep, target, powerStep) {
    const tx = (target ? target.x : BASKET.x) - shot.x, ty = (target ? target.y : BASKET.y) - shot.y;
    const aimZ = target && target.z != null ? target.z : CHAIN_Z;
    const dist = Math.hypot(tx, ty), bearing = Math.atan2(tx, ty) * 180 / Math.PI;
    const p = baseParams(shot, cls);
    let aim = bearing, launch = 6;
    const speed = puttMph(dist);
    const probe = (aimDeg, la) => {
      const r = P.simulate(Object.assign({}, p, { aim: aimDeg, armSpeed: speed, launchAngle: la, nose: la - 1.5, seed: 1 }));
      // where the flight crosses the target distance (along the straight line to the target)
      const ux = tx / dist, uy = ty / dist; let prev = null;
      for (const s of r.samples) {
        const x = s.x * FT, y = s.y * FT, along = x * ux + y * uy;
        if (along >= dist) {
          let k = 1, q = s;
          if (prev) { const pa = prev.x * FT * ux + prev.y * FT * uy; k = (dist - pa) / ((along - pa) || 1); q = prev; }
          const lx = (q.x + (s.x - q.x) * k) * FT, ly = (q.y + (s.y - q.y) * k) * FT, z = (q.z + (s.z - q.z) * k) * FT;
          return { z, lat: lx * uy - ly * ux, reached: true };
        }
        prev = s;
      }
      const last = r.samples[r.samples.length - 1];
      return { z: -1, lat: last.x * FT * uy - last.y * FT * ux, reached: false };
    };
    for (let i = 0; i < 12; i++) {
      const a = probe(aim, launch);
      aim += Math.atan2(-a.lat, dist) * 180 / Math.PI;
      const dz = aimZ - a.z;
      if (Math.abs(dz) < 0.015 && Math.abs(a.lat) < 0.015) break;
      launch += a.reached ? Math.max(-4, Math.min(4, dz / dist * 57.3 * 0.9)) : 3;
      launch = Math.max(-4, Math.min(30, launch));
    }
    const pw = 1 + 0.07 * (powerStep || 0);
    return Object.assign(p, { aim, launchAngle: launch, nose: launch - 1.5 + 3.5 * (noseStep || 0), armSpeed: speed * pw, solvedMph: speed, dist });
  }

  /* ---------- the arcade floor ----------
     Lacquered maple, wackier than real wood: a disc that comes in low on its hyzer edge skips back up
     hard enough to pop into a basket. Real floors cannot do that (a skip off real wood rises a few
     inches); this one is tuned so skip-ins happen when you mean them. */
  const FLOOR = { slideFriction: 0.28, skipRetention: 0.88, restitution: 1.0, grassDrag: 0, edgeGrab: 0.02, rollResistance: 0.012,
    sound: 'contact.wood', embed: 0, look: '#b87a45', label: 'Lacquered taproom floor' };
  function installFloor(MATS) { MATS.surfaces.taproom_floor = FLOOR; }

  /* ---------- a full throw: catcher + contact engine ---------- */
  function throwIt(E, shot, params, seed) {
    const o = { x: shot.x, y: shot.y, z: 0 };
    const sim = Object.assign({}, params, {
      seed: seed != null ? seed : (params.seed || 1),
      collider: E.FB.createCatcher({ base: { x: BASKET.x - o.x, y: BASKET.y - o.y, z: 0 }, mount: 'ground' }),
      contact: E.CT.create({ materials: E.MATS, solidMaterials: E.MATS.solids, solids: solidsFrom(o), surfaceAt: () => 'taproom_floor', noTombstone: true, seed: seed || 7 }),
    });
    const rec = E.P.simulate(sim);
    rec.origin = o;
    return rec;
  }

  /* ---------- reading a throw for points ----------
     Every reason to score, made or missed. Returns the list of awards (in order) and flags. */
  const PTS = {
    make: 1000, bank: 1500, skipIn: 2000, overBarrels: 800, dong: 500, pair: 1500,
    chainout: 250, spit: 300, band: 150, pole: 200, cage: 100,
    pinball: 150, wall: 50, roller: 20, skip: 75, cheers: 300, bullseye: 400,
  };
  function readThrow(rec, shot) {
    const ev = rec.events || [], out = [], c = rec.catchResult || { outcome: 'none' };
    const made = c.outcome === 'made';
    const bounces = ev.filter(e => e.type === 'bounce');
    const floor = ev.filter(e => e.type === 'skip' || e.type === 'hop');
    const madeT = made ? (ev.find(e => e.type === 'made') || {}).t : null;
    const before = e => madeT == null || e.t < madeT;
    const tags = new Set(bounces.filter(before).map(e => (e.name || '')));
    const kettle = bounces.some(e => /kettle|gong/i.test(e.name || ''));
    const table = bounces.some(e => e.name === 'Table' || e.name === 'Bar');
    const hitStack = bounces.some(e => e.name === 'Barrel stack');
    const award = (key, label, pts, kind) => out.push({ key, label, pts, kind: kind || 'bonus' });
    // over the barrels: the flight passes above the stack
    let over = false;
    for (const s of rec.samples || []) {
      const x = s.x * FT + shot.x, y = s.y * FT + shot.y, z = s.z * FT;
      if (Math.abs(y - STACK.y) < STACK.len / 2 && Math.abs(x - STACK.x) < 1.05 && z > 1.3 && z < 2.6) { over = true; break; }
    }
    if (hitStack) over = false;
    if (made) {
      award('make', 'CHAAING!', PTS.make, 'make');
      if (bounces.some(before)) award('bank', 'BANK SHOT', PTS.bank);
      if (floor.some(before)) award('skipIn', 'SKIP IN!', PTS.skipIn);
      if (over) award('over', 'OVER THE BARRELS', PTS.overBarrels);
    } else {
      const map = { chainout: ['CHAIN OUT', PTS.chainout], spit: ['SPIT THROUGH!', PTS.spit], band: ['RIM SHOT', PTS.band], pole: ['CLANG!', PTS.pole], cage: ['CAGE RATTLE', PTS.cage] };
      if (map[c.outcome]) award(c.outcome, map[c.outcome][0], map[c.outcome][1], 'near');
      const hard = bounces.filter(e => !/wall/i.test(e.name || ''));
      if (bounces.length >= 2) award('pinball', 'PINBALL x' + bounces.length, PTS.pinball * bounces.length);
      else if (bounces.some(e => /wall/i.test(e.name || ''))) award('wall', 'WALL BALL', PTS.wall);
      const roll = ev.find(e => e.type === 'roll');
      if (roll) {
        const last = rec.samples[rec.samples.length - 1], d = Math.hypot(last.x * FT - roll.x * FT, last.y * FT - roll.y * FT);
        if (d > 1) award('roller', 'ROLLER ' + Math.round(d / FT) + ' FT', Math.round(PTS.roller * d / FT));
      }
      if (floor.length >= 2) award('skips', 'SKIPPER x' + floor.length, PTS.skip * floor.length);
      if (over) award('over', 'OVER THE BARRELS', Math.round(PTS.overBarrels / 4));
    }
    if (kettle) award('dong', 'DONG!', PTS.dong);
    if (table) award('cheers', 'CHEERS!', PTS.cheers);
    return { made, outcome: c.outcome, awards: out, tricks: out.filter(a => a.kind === 'bonus' && ['bank', 'skipIn', 'over', 'dong'].includes(a.key)).length };
  }

  return { FT, MPH, ROOM, BASKET, SHOTS, GONG, POSTS_X, POSTS_Y, KETTLES, FERMENTERS, BAR, TABLES, STACK, STACK_BARRELS, UPRIGHT_BARRELS, BANK, PTS,
    worldSolids, solidsFrom, baseParams, puttMph, solve, installFloor, FLOOR, throwIt, readThrow };
});
