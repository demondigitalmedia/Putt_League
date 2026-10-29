/* =====================================================================
   PUTT LEAGUE · THE TAPROOM COURSE (6 holes: the taproom, the beer garden, the back lot)
   The whole venue in the flight engine's frame (metres, x right, y toward the back of the
   building and out into the beer garden, z up, ground at 0): the long taproom, the roll-up door,
   the beer garden, every solid, every surface, three baskets, each hole's Pitch tee and two Putt
   tees, the discs, the aim solver, the lie rule and the scoring. The 3D scene is drawn from these
   same numbers, so what you see is what the disc hits.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Course = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const FT = 0.3048;

  /* ---------- the venue ---------- */
  const ROOM = { x0: -9, x1: 8, y0: -2, y1: 40, h: 6 };
  const DOOR = { x0: -6.2, x1: -0.8, h: 3.6 };
  const GARDEN = { x0: -16, x1: 16, y0: 40, y1: 82 };
  const POSTS_X = [-2.8, 3.0], POSTS_Y = [3, 9, 15, 21, 27, 33];
  const KETTLES = [{ x: 5.6, y: 7, r: 1.0, h: 2.6 }, { x: 5.6, y: 12.5, r: 1.05, h: 2.8 }, { x: 5.7, y: 18, r: 0.95, h: 2.5 }];
  const FERMENTERS = [{ x: 5.2, y: 30, r: 0.8, h: 3.2 }, { x: 7.0, y: 31.9, r: 0.72, h: 3.0 }, { x: 7.0, y: 28.1, r: 0.72, h: 3.0 }];
  const BAR = { x0: -8.6, x1: -7.5, y0: 3.5, y1: 19.5, h: 1.05 };
  const TABLES = [6, 11.5, 17, 24.5, 30, 35.5].map(y => ({ x: -5.2, y, hx: 0.45, hy: 0.9, top: 0.79 }));
  const STACK = { x: -1.8, y: 12.5, r: 0.33, len: 0.9 };
  const STACK_BARRELS = [[-0.68, 0.36], [0.0, 0.36], [0.68, 0.36], [-0.34, 0.94], [0.34, 0.94]].map(([dx, z]) => ({ x: STACK.x + dx, y: STACK.y, z }));
  const KEGS = [-1.2, -0.75, -0.3, 0.15].map(x => ({ x, y: 22.6, z0: 0, z1: 0.6 })).concat([-0.97, -0.52, -0.07].map(x => ({ x, y: 22.6, z0: 0.6, z1: 1.2 })));
  const UPRIGHT_BARRELS = [{ x: 3.7, y: 4.0 }, { x: -2.2, y: 19.0 }, { x: 2.4, y: 33.5 }, { x: -1.4, y: 37.5 }];

  // the beer garden
  const OAK = { x: 0.5, y: 60.5, trunkR: 0.45, trunkH: 3.4, canopy: [{ dx: 0, dy: 0, z: 4.6, r: 2.9 }, { dx: -1.8, dy: 1.2, z: 4.0, r: 2.2 }, { dx: 1.9, dy: -1.0, z: 4.1, r: 2.2 }, { dx: 0.4, dy: 2.0, z: 5.2, r: 2.0 }] };
  const PICNIC = [{ x: 6, y: 50 }, { x: 7.5, y: 56.5 }, { x: -2.5, y: 51.5 }, { x: -3.2, y: 64 }, { x: 3.5, y: 70.5 }, { x: -12.5, y: 63 }, { x: 10.5, y: 62 }];
  const UMBRELLAS = [{ x: -2.5, y: 51.5 }, { x: 3.5, y: 70.5 }, { x: 10.5, y: 62 }];
  const FIREPIT = { x: 8.5, y: 66.5, r: 0.95, h: 0.45 };
  const TRUCK = { x: 13.2, y: 74.5, hx: 1.25, hy: 3.1, h: 3.0 };
  const PLANTERS = [{ x: -15, y: 45 }, { x: -15, y: 55 }, { x: -15, y: 70 }, { x: 15, y: 45 }, { x: 15, y: 55 }, { x: -6.6, y: 41.2 }, { x: -0.4, y: 41.2 }];
  const LIGHT_POLES = [{ x: -15.4, y: 41 }, { x: 15.4, y: 41 }, { x: -15.4, y: 81.4 }, { x: 15.4, y: 81.4 }, { x: 0, y: 81.4 }, { x: -15.4, y: 61 }, { x: 15.4, y: 61 }];

  // the back lot: out the garden's back gate, the brewery's working yard
  const LOT = { x0: -16, x1: 16, y0: 82, y1: 123.5 };
  const GATE = { x0: 2.0, x1: 8.0 };
  const SILO = { x: -9.0, y: 97.0, r: 2.2, h: 9.0 };
  const BOX_TRUCK = { x: 0.5, y: 111.0, hx: 1.2, hy: 3.6, z0: 0.8, z1: 3.3, cab: { x: 0.5, y: 115.6, hx: 1.1, hy: 0.9, z0: 0.45, z1: 2.7 } };
  const DOCK = { x: 8.0, y: 122.35, hx: 6.0, hy: 1.15, h: 1.2 };
  const PALLETS = [{ x: -3.0, y: 101.5, h: 1.8 }, { x: -5.4, y: 105.0, h: 1.2 }, { x: -0.6, y: 98.0, h: 1.2 }, { x: -9.35, y: 108.75, h: 1.5 }, { x: 12.8, y: 96.0, h: 0.6 }, { x: 13.6, y: 98.5, h: 1.2 }];
  const DUMPSTER = { x: -5.0, y: 119.6, hx: 1.0, hy: 0.6, h: 1.5 };
  const FORKLIFT = { x: 11.3, y: 115.0, hx: 0.6, hy: 1.1, h: 1.3, mast: 2.6 };
  const JENGA = { x: -7.16, y: 71.41, hx: 0.38, hy: 0.38, h: 1.5 };
  const LOT_POLES = [{ x: -15.4, y: 104 }, { x: 15.4, y: 104 }, { x: -15.4, y: 122.6 }, { x: 15.4, y: 122.6 }];

  /* ---------- the holes ----------
     backstop: a bank board behind each basket (the gong, a keg wall, a crate tower). */
  const HOLES = [
    { n: 1, name: 'THE COPPER AISLE', par: 2, basket: { x: 1.0, y: 26.0 },
      tee: { x: 0.6, y: -0.3 }, short: { x: 1.0, y: 18.38 }, long: { x: -1.3, y: 14.0 },
      backstop: { name: 'Gong', kind: 'gong', x: 1.0, y: 26.8, r: 0.62, z: 1.35, t: 0.05 }, inside: true },
    { n: 2, name: 'OUT THE DOOR', par: 3, basket: { x: -8.0, y: 56.0 },
      tee: { x: 2.0, y: -0.6 }, short: { x: -8.0, y: 48.38 }, long: { x: 2.44, y: 48.27 },
      backstop: { name: 'Keg wall', kind: 'kegs', x: -8.0, y: 57.0, hx: 0.95, hy: 0.25, h: 1.9 }, inside: false },
    { n: 3, name: 'THE BIG OAK', par: 3, basket: { x: -10.0, y: 76.0 },
      tee: { x: 12.5, y: 44.0 }, short: { x: -10.0, y: 68.38 }, long: { x: -3.58, y: 65.64 },
      backstop: { name: 'Crate tower', kind: 'crates', x: -10.0, y: 77.0, hx: 0.9, hy: 0.4, h: 1.8 }, inside: false },
    { n: 4, name: 'SILO SWEEP', par: 3, basket: { x: -12.4, y: 100.0 },
      tee: { x: 6.0, y: 84.0 }, short: { x: -12.4, y: 92.38 }, long: { x: -2.6, y: 92.6 },
      backstop: { name: 'Grain sacks', kind: 'sacks', x: -13.05, y: 100.6, hx: 0.9, hy: 0.45, h: 1.6 }, inside: false },
    { n: 5, name: 'TRUCK STOP', par: 3, basket: { x: -3.2, y: 111.5 },
      tee: { x: 15.5, y: 103.5 }, short: { x: -3.2, y: 103.88 }, long: { x: 8.4, y: 107.8 },
      backstop: { name: 'Pallet wall', kind: 'pallets', x: -4.05, y: 111.75, hx: 0.4, hy: 0.95, h: 1.7 }, inside: false },
    { n: 6, name: 'THE LOADING DOCK', par: 3, basket: { x: 8.0, y: 120.5 },
      tee: { x: -12.0, y: 86.0 }, short: { x: 3.43, y: 114.4 }, long: { x: 14.7, y: 110.3 },
      backstop: { name: 'Loading dock', kind: 'dock', x: DOCK.x, y: DOCK.y, hx: DOCK.hx, hy: DOCK.hy, h: DOCK.h }, inside: false },
  ];
  HOLES.forEach(h => { h.dist = Math.hypot(h.basket.x - h.tee.x, h.basket.y - h.tee.y); });

  /* ---------- discs (speed 4 and under) ---------- */
  const DISCS = [
    { key: 'putter', label: 'PUTTER', speed: 2, glide: 3, turn: 0, fade: 1, color: 0xF2A13B },
    { key: 'approach', label: 'APPROACH', speed: 3, glide: 4, turn: 0, fade: 2, color: 0x2E9C9A },
    { key: 'mid', label: 'MID', speed: 4, glide: 5, turn: -1, fade: 1, color: 0xE0482F },
  ];

  /* ---------- surfaces ---------- */
  const FLOOR = { slideFriction: 0.28, skipRetention: 0.88, restitution: 1.0, grassDrag: 0, edgeGrab: 0.02, rollResistance: 0.012,
    sound: 'contact.wood', embed: 0, look: '#b87a45', label: 'Lacquered taproom floor' };
  // venue surfaces, fastest to slowest after a landing: glazed tile (for themes that call for it), lacquered
  // taproom wood (baseline), patio flagstone (~70% of the wood's slide), garden grass (~25%), gravel paths (~15%)
  const VENUE = {
    tile: { slideFriction: 0.22, skipRetention: 0.9, restitution: 1.0, grassDrag: 0, edgeGrab: 0.01, rollResistance: 0.01, sound: 'contact.hard', embed: 0, look: '#d9d4c7', label: 'Glazed tile' },
    lot_asphalt: { slideFriction: 0.36, skipRetention: 0.78, restitution: 0.65, grassDrag: 0, edgeGrab: 0.04, rollResistance: 0.02, sound: 'contact.hard', embed: 0, look: '#4a4a4f', label: 'Asphalt lot' },
    patio_flagstone: { slideFriction: 0.46, skipRetention: 0.62, restitution: 0.55, grassDrag: 0, edgeGrab: 0.07, rollResistance: 0.035, sound: 'contact.rock', embed: 0, look: '#8f8a80', label: 'Patio flagstone' },
    garden_grass: { slideFriction: 0.55, skipRetention: 0.65, restitution: 0.25, grassDrag: 1.2, edgeGrab: 0.12, rollResistance: 0.05, sound: 'contact.grass', embed: 0.1, look: '#6cc25a', label: 'Garden grass' },
    garden_gravel: { slideFriction: 1.0, skipRetention: 0.25, restitution: 0.15, grassDrag: 1.6, edgeGrab: 0.22, rollResistance: 0.2, sound: 'contact.gravel', embed: 0.02, look: '#9b958b', label: 'Gravel path' },
  };
  function installFloor(MATS) { MATS.surfaces.taproom_floor = FLOOR; Object.keys(VENUE).forEach(k => { MATS.surfaces[k] = VENUE[k]; }); }
  function surfaceAt(x, y) {
    if (y < ROOM.y1) return 'taproom_floor';
    if (y > LOT.y0) { if (x < LOT.x0 + 1.4 || x > LOT.x1 - 1.4) return 'garden_gravel'; if (Math.hypot(x - SILO.x, y - SILO.y) < SILO.r + 1.6) return 'garden_grass'; return 'lot_asphalt'; }
    if (y < 46) return 'patio_flagstone';
    if (Math.hypot(x - FIREPIT.x, y - FIREPIT.y) < 2.6) return 'patio_flagstone';
    if ((x > -5.2 && x < -2.2) || (y > 58.5 && y < 61 && Math.abs(x - OAK.x) > 3.2)) return 'garden_gravel';
    return 'garden_grass';
  }
  function inPlay(x, y) {
    if (y >= ROOM.y0 && y <= ROOM.y1) return x >= ROOM.x0 && x <= ROOM.x1;
    if (y > ROOM.y1 && y <= GARDEN.y1) return x >= GARDEN.x0 && x <= GARDEN.x1;
    return y > GARDEN.y1 && y <= LOT.y1 && x >= LOT.x0 && x <= LOT.x1;
  }

  /* ---------- every solid (world metres) ---------- */
  function worldSolids(activeHole) {
    const S = [];
    const box = (name, x, y, hx, hy, z0, z1, mat, tag) => S.push({ kind: 'box', x, y, hx, hy, yaw: 0, z0, z1, mat, name, tag: tag || name });
    const cyl = (name, x, y, r, z0, z1, mat, tag) => S.push({ kind: 'cyl', x, y, r, z0, z1, mat, name, tag: tag || name });
    const R = ROOM, gH = 4.2;
    // the building
    box('Wall', R.x0 - 0.15, (R.y0 + R.y1) / 2, 0.15, (R.y1 - R.y0) / 2, 0, R.h, 'brick_wall', 'Wall');
    box('Wall', R.x1 + 0.15, (R.y0 + R.y1) / 2, 0.15, (R.y1 - R.y0) / 2, 0, R.h, 'brick_wall', 'Wall');
    box('Wall', (R.x0 + R.x1) / 2, R.y0 - 0.15, (R.x1 - R.x0) / 2, 0.15, 0, R.h, 'brick_wall', 'Wall');
    // back wall with the roll-up door, carried out to the garden fences as the neighbours' brick
    box('Wall', (GARDEN.x0 + DOOR.x0) / 2, R.y1 + 0.15, (DOOR.x0 - GARDEN.x0) / 2, 0.15, 0, R.h, 'brick_wall', 'Wall');
    box('Wall', (DOOR.x1 + GARDEN.x1) / 2, R.y1 + 0.15, (GARDEN.x1 - DOOR.x1) / 2, 0.15, 0, R.h, 'brick_wall', 'Wall');
    box('Door header', (DOOR.x0 + DOOR.x1) / 2, R.y1 + 0.15, (DOOR.x1 - DOOR.x0) / 2, 0.15, DOOR.h, R.h, 'brick_wall', 'Wall');
    box('Ceiling', (R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, (R.x1 - R.x0) / 2, (R.y1 - R.y0) / 2, R.h, R.h + 0.3, 'timber', 'Ceiling');
    POSTS_X.forEach(x => POSTS_Y.forEach(y => box('Timber post', x, y, 0.16, 0.16, 0, R.h, 'timber', 'Post')));
    POSTS_Y.forEach(y => box('Cross beam', (R.x0 + R.x1) / 2, y, (R.x1 - R.x0) / 2, 0.15, R.h - 0.75, R.h - 0.35, 'timber', 'Beam'));
    KETTLES.forEach((k, i) => cyl('Copper kettle', k.x, k.y, k.r, 0.3, 0.75 + k.h + 0.4, 'metal', 'Kettle'));
    FERMENTERS.forEach(f => cyl('Fermenter', f.x, f.y, f.r, 0.55, 1.2 + f.h, 'metal', 'Fermenter'));
    box('Bar', (BAR.x0 + BAR.x1) / 2, (BAR.y0 + BAR.y1) / 2, (BAR.x1 - BAR.x0) / 2 + 0.15, (BAR.y1 - BAR.y0) / 2 + 0.1, 0, BAR.h + 0.04, 'timber', 'Bar');
    TABLES.forEach(t => box('Table', t.x, t.y, t.hx, t.hy, 0.72, t.top, 'timber', 'Table'));
    STACK_BARRELS.forEach(b => S.push({ kind: 'capsule', a: { x: b.x, y: b.y - STACK.len / 2 + STACK.r * 0.6, z: b.z }, b: { x: b.x, y: b.y + STACK.len / 2 - STACK.r * 0.6, z: b.z }, r: STACK.r, mat: 'timber', name: 'Barrel stack', tag: 'Barrel' }));
    KEGS.forEach(k => cyl('Keg pyramid', k.x, k.y, 0.21, k.z0, k.z1, 'metal', 'Keg'));
    UPRIGHT_BARRELS.forEach(b => cyl('Barrel', b.x, b.y, 0.32, 0, 0.9, 'timber', 'Barrel'));
    // the garden
    box('Fence', GARDEN.x0 - 0.1, (GARDEN.y0 + GARDEN.y1) / 2, 0.1, (GARDEN.y1 - GARDEN.y0) / 2, 0, 1.9, 'timber', 'Fence');
    box('Fence', GARDEN.x1 + 0.1, (GARDEN.y0 + GARDEN.y1) / 2, 0.1, (GARDEN.y1 - GARDEN.y0) / 2, 0, 1.9, 'timber', 'Fence');
    box('Fence', (GARDEN.x0 + GATE.x0) / 2, GARDEN.y1 + 0.1, (GATE.x0 - GARDEN.x0) / 2, 0.1, 0, 1.9, 'timber', 'Fence');
    box('Fence', (GATE.x1 + GARDEN.x1) / 2, GARDEN.y1 + 0.1, (GARDEN.x1 - GATE.x1) / 2, 0.1, 0, 1.9, 'timber', 'Fence');
    // the back lot
    box('Fence', LOT.x0 - 0.1, (LOT.y0 + LOT.y1) / 2, 0.1, (LOT.y1 - LOT.y0) / 2, 0, 1.9, 'timber', 'Fence');
    box('Fence', LOT.x1 + 0.1, (LOT.y0 + LOT.y1) / 2, 0.1, (LOT.y1 - LOT.y0) / 2, 0, 1.9, 'timber', 'Fence');
    box('Wall', 0, LOT.y1 + 0.6, 16.5, 0.6, 0, 5.5, 'brick_wall', 'Wall');
    cyl('Grain silo', SILO.x, SILO.y, SILO.r, 0, SILO.h, 'metal', 'Silo');
    const T = BOX_TRUCK;
    box('Box truck', T.x, T.y, T.hx, T.hy, T.z0, T.z1, 'metal', 'BoxTruck');
    box('Truck cab', T.cab.x, T.cab.y, T.cab.hx, T.cab.hy, T.cab.z0, T.cab.z1, 'metal', 'BoxTruck');
    [-1, 1].forEach(sx => [-2.6, 2.4].forEach(dy => box('Truck wheel', T.x + sx * (T.hx - 0.18), T.y + dy, 0.16, 0.42, 0, T.z0, 'rubber', 'Wheel')));
    [-1, 1].forEach(sx => box('Truck wheel', T.cab.x + sx * (T.cab.hx - 0.16), T.cab.y, 0.15, 0.4, 0, T.cab.z0 + 0.1, 'rubber', 'Wheel'));
    PALLETS.forEach(p => box('Pallet stack', p.x, p.y, 0.6, 0.5, 0, p.h, 'timber', 'Pallets'));
    box('Dumpster', DUMPSTER.x, DUMPSTER.y, DUMPSTER.hx, DUMPSTER.hy, 0, DUMPSTER.h, 'metal', 'Dumpster');
    box('Forklift', FORKLIFT.x, FORKLIFT.y, FORKLIFT.hx, FORKLIFT.hy, 0, FORKLIFT.h, 'metal', 'Forklift');
    box('Forklift mast', FORKLIFT.x, FORKLIFT.y + FORKLIFT.hy + 0.1, FORKLIFT.hx, 0.08, 0, FORKLIFT.mast, 'metal', 'Forklift');
    box('Giant Jenga', JENGA.x, JENGA.y, JENGA.hx, JENGA.hy, 0, JENGA.h, 'timber', 'Jenga');
    LOT_POLES.forEach(p => cyl('Light pole', p.x, p.y, 0.07, 0, gH + 0.4, 'timber', 'Pole'));
    cyl('Oak trunk', OAK.x, OAK.y, OAK.trunkR, 0, OAK.trunkH, 'bark_core', 'Tree');
    OAK.canopy.forEach(c => S.push({ kind: 'blob', x: OAK.x + c.dx, y: OAK.y + c.dy, z: c.z, r: c.r, density: 0.55, squash: 0.75, mat: 'leaves', name: 'Big oak', tag: 'Tree' }));
    S.push({ kind: 'capsule', a: { x: OAK.x, y: OAK.y, z: 3.0 }, b: { x: OAK.x - 2.6, y: OAK.y + 1.4, z: 4.3 }, r: 0.16, mat: 'branch', name: 'Oak limb', tag: 'Tree' });
    S.push({ kind: 'capsule', a: { x: OAK.x, y: OAK.y, z: 3.1 }, b: { x: OAK.x + 2.5, y: OAK.y - 1.3, z: 4.4 }, r: 0.15, mat: 'branch', name: 'Oak limb', tag: 'Tree' });
    PICNIC.forEach(p => { box('Picnic table', p.x, p.y, 1.0, 0.4, 0.7, 0.76, 'timber', 'Table'); box('Picnic bench', p.x, p.y - 0.65, 1.0, 0.15, 0.42, 0.46, 'timber', 'Table'); box('Picnic bench', p.x, p.y + 0.65, 1.0, 0.15, 0.42, 0.46, 'timber', 'Table'); });
    UMBRELLAS.forEach(u => { cyl('Umbrella pole', u.x, u.y, 0.03, 0, 2.3, 'metal', 'Umbrella'); cyl('Umbrella', u.x, u.y, 1.15, 2.12, 2.3, 'cloth', 'Umbrella'); });
    cyl('Fire pit', FIREPIT.x, FIREPIT.y, FIREPIT.r, 0, FIREPIT.h, 'stone', 'Fire pit');
    box('Food truck', TRUCK.x, TRUCK.y, TRUCK.hx, TRUCK.hy, 0.3, TRUCK.h, 'metal', 'Truck');
    PLANTERS.forEach(p => cyl('Planter', p.x, p.y, 0.35, 0, 0.55, 'stone', 'Planter'));
    LIGHT_POLES.forEach(p => cyl('Light pole', p.x, p.y, 0.07, 0, gH + 0.4, 'timber', 'Pole'));
    // baskets and their bank boards
    HOLES.forEach((h, i) => {
      const b = h.backstop;
      if (b.kind === 'gong') box('Gong', b.x, b.y, b.r, b.t, b.z - b.r, b.z + b.r, 'metal', 'Gong');
      else box(b.name, b.x, b.y, b.hx, b.hy, 0, b.h, b.kind === 'kegs' ? 'metal' : b.kind === 'sacks' ? 'hay' : b.kind === 'dock' ? 'stone' : 'timber', b.name);
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
  function mphFor(d) { return d <= 12 ? 14.5 + d : 26.5 + 0.45 * (d - 12); }
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
  // where to aim by default from a lie: the basket, unless the lie is inside and the basket is out in the garden
  function defaultTarget(holeIndex, lie) {
    const h = HOLES[holeIndex];
    if (lie.y < ROOM.y1 - 0.5 && h.basket.y > ROOM.y1) return { x: DOOR.x1 - 1.4, y: ROOM.y1 + 4, z: 0.02, floor: true, waypoint: true };
    return null;
  }

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
    const R = ROOM, G = GARDEN;
    if (y < R.y1 && (x < R.x0 + m || x > R.x1 - m || y < R.y0 + m)) return true;
    if (y >= R.y1 && y <= G.y1 && (x < G.x0 + m || x > G.x1 - m || (y > G.y1 - m && (x < GATE.x0 + m || x > GATE.x1 - m)))) return true;
    if (y > G.y1 && (x < LOT.x0 + m || x > LOT.x1 - m || y > LOT.y1 - m || (y < G.y1 + m && (x < GATE.x0 + m || x > GATE.x1 - m)))) return true;
    if (Math.abs(y - R.y1) < m && (x < DOOR.x0 + m || x > DOOR.x1 - m)) return true;
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
    return res;
  }

  /* ---------- reading a throw for points ---------- */
  const PTS = { make: 1000, bank: 1500, bigBank: 2000, skipIn: 2000, over: 800, thread: 1000, under: 800, kiss: 300, hung: 500, ceiling: 300,
    pair: 1500, chainout: 250, spit: 300, band: 150, pole: 200, cage: 100, pinball: 150, wall: 50, roller: 20, skip: 75, cheers: 300,
    ace: 10000, downtown: 40, parked: 300, circle: 100 };
  const BIG_BANKS = { Gong: 'RING THE GONG', 'Keg wall': 'KEG BANK', 'Crate tower': 'CRATE BANK', 'Grain sacks': 'SACK BANK', 'Pallet wall': 'PALLET BANK', 'Loading dock': 'DOCK BANK' };
  function readThrow(rec, mode, stroke) {
    const h = HOLES[rec.hole], ev = rec.events || [], out = [], c = rec.catchResult || { outcome: 'none' }, o = rec.origin;
    const made = c.outcome === 'made';
    const madeT = made ? (ev.find(e => e.type === 'made') || { t: 1e9 }).t : 1e9;
    const before = e => e.t < madeT;
    const bounces = ev.filter(e => e.type === 'bounce'), floor = ev.filter(e => e.type === 'skip' || e.type === 'hop');
    const award = (key, label, pts, kind, trick) => out.push({ key, label, pts, kind: kind || 'bonus', trick: !!trick });
    const W = s => ({ x: s.x * FT + o.x, y: s.y * FT + o.y, z: s.z * FT });
    // passes: over the barrels / kegs, through the door, under the oak
    let overStack = false, overKegs = false, thread = false, under = false, underTruck = false, aroundSilo = false, startInside = o.y < ROOM.y1;
    for (const s0 of rec.samples || []) {
      if (s0.landed) break;
      const s = W(s0);
      if (Math.abs(s.y - STACK.y) < STACK.len / 2 && Math.abs(s.x - STACK.x) < 1.05 && s.z > 1.3 && s.z < 2.8) overStack = true;
      if (Math.abs(s.y - 22.6) < 0.3 && s.x > -1.45 && s.x < 0.4 && s.z > 1.25 && s.z < 2.8) overKegs = true;
      if (startInside && Math.abs(s.y - ROOM.y1) < 0.2 && s.x > DOOR.x0 && s.x < DOOR.x1 && s.z > 0.08) thread = true;
      if (Math.hypot(s.x - OAK.x, s.y - OAK.y) < 2.6 && s.z < 2.6 && s.z > 0.1) under = true;
      if (Math.abs(s.x - BOX_TRUCK.x) < BOX_TRUCK.hx && Math.abs(s.y - BOX_TRUCK.y) < BOX_TRUCK.hy && s.z < BOX_TRUCK.z0) underTruck = true;
    }
    const hitStack = bounces.some(e => e.name === 'Barrel stack'), hitKegs = bounces.some(e => e.name === 'Keg pyramid');
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
      if (overStack && !hitStack) award('over', 'OVER THE BARRELS', PTS.over, 'bonus', true);
      if (overKegs && !hitKegs) award('overkegs', 'OVER THE KEGS', PTS.over, 'bonus', true);
      if (thread) award('thread', 'THREAD THE DOOR', PTS.thread, 'bonus', true);
      if (under) award('under', 'UNDER THE OAK', PTS.under, 'bonus', true);
      if (underTruck) award('undertruck', 'UNDER THE TRUCK!', PTS.thread, 'bonus', true);
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
      if (thread) award('thread', 'THREAD THE DOOR', Math.round(PTS.thread / 2));
      if (underTruck) award('undertruck', 'UNDER THE TRUCK', Math.round(PTS.thread / 2));
      if (mode === 'pitch') {
        const d = Math.hypot(rec.rest.x - h.basket.x, rec.rest.y - h.basket.y);
        if (d < 0.9) award('parked', 'PARKED IT', PTS.parked);
        else if (d < 3) award('circle', 'TAP-IN RANGE', PTS.circle);
      }
    }
    if (bounces.some(e => /kettle/i.test(e.name || ''))) award('bwong', 'BWONG!', 200);
    if (bounces.some(e => e.name === 'Gong') && !out.some(a => a.key === 'bigbank')) award('dong', 'DONG!', 500);
    if (bounces.some(e => e.name === 'Table' || e.name === 'Bar' || e.name === 'Picnic table')) award('cheers', 'CHEERS!', PTS.cheers);
    if (bounces.some(e => e.name === 'Food truck')) award('truck', 'TACO TRUCK!', 250);
    if (bounces.some(e => e.name === 'Fire pit')) award('pit', 'HOT STUFF', 250);
    if (bounces.some(e => e.name === 'Umbrella')) award('umbrella', 'UMBRELLA BOUNCE', 250);
    return { made, outcome: c.outcome, awards: out, tricks: out.filter(a => a.trick).length };
  }
  function scoreName(strokes, par) {
    if (strokes === 1) return 'ACE';
    const d = strokes - par;
    return d <= -2 ? 'EAGLE' : d === -1 ? 'BIRDIE' : d === 0 ? 'PAR' : d === 1 ? 'BOGEY' : d === 2 ? 'DOUBLE BOGEY' : '+' + d;
  }
  const HOLE_PTS = { ACE: 10000, EAGLE: 5000, BIRDIE: 3000, PAR: 1500, BOGEY: 500 };

  return { FT, ROOM, DOOR, GARDEN, LOT, GATE, SILO, BOX_TRUCK, DOCK, PALLETS, DUMPSTER, FORKLIFT, JENGA, LOT_POLES, POSTS_X, POSTS_Y, KETTLES, FERMENTERS, BAR, TABLES, STACK, STACK_BARRELS, KEGS, UPRIGHT_BARRELS,
    OAK, PICNIC, UMBRELLAS, FIREPIT, TRUCK, PLANTERS, LIGHT_POLES, HOLES, DISCS, PTS, HOLE_PTS, BANK, CHAIN_Z,
    installFloor, surfaceAt, inPlay, worldSolids, solidsFrom, baseParams, mphFor, solve, defaultTarget, throwIt, fixLie, readThrow, scoreName };
});
