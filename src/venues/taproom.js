/* =====================================================================
   PUTT LEAGUE · VENUE · THE TAPROOM (6 holes: the taproom, the beer garden, the back lot)
   The whole venue in the flight engine's frame (metres, x right, y toward the back of the
   building and out into the beer garden, z up, ground at 0): the long taproom, the roll-up door,
   the beer garden, the back lot, every solid, every surface, the holes (basket, bank board, Pitch
   tee and two Putt tees), where the disc is in play, and the venue's own trick reads. The 3D
   scene (taproom.scene.js) is drawn from these same numbers, so what you see is what the disc hits.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../venues.js'));
  else factory(root.Venues);
})(typeof self !== 'undefined' ? self : this, function (Venues) {
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
     backstop: a bank board behind each basket (the gong, a keg wall, a crate tower); bank is its call on a bank-in. */
  const HOLES = [
    { n: 1, name: 'THE COPPER AISLE', par: 2, basket: { x: 1.0, y: 26.0 },
      tee: { x: 0.6, y: -0.3 }, short: { x: 1.0, y: 18.38 }, long: { x: -1.3, y: 14.0 },
      backstop: { name: 'Gong', kind: 'gong', bank: 'RING THE GONG', x: 1.0, y: 26.8, r: 0.62, z: 1.35, t: 0.05 }, inside: true },
    { n: 2, name: 'OUT THE DOOR', par: 3, basket: { x: -8.0, y: 56.0 },
      tee: { x: 2.0, y: -0.6 }, short: { x: -8.0, y: 48.38 }, long: { x: 2.44, y: 48.27 },
      backstop: { name: 'Keg wall', kind: 'kegs', bank: 'KEG BANK', x: -8.0, y: 57.0, hx: 0.95, hy: 0.25, h: 1.9 }, inside: false },
    { n: 3, name: 'THE BIG OAK', par: 3, basket: { x: -10.0, y: 76.0 },
      tee: { x: 12.5, y: 44.0 }, short: { x: -10.0, y: 68.38 }, long: { x: -3.58, y: 65.64 },
      backstop: { name: 'Crate tower', kind: 'crates', bank: 'CRATE BANK', x: -10.0, y: 77.0, hx: 0.9, hy: 0.4, h: 1.8 }, inside: false },
    { n: 4, name: 'SILO SWEEP', par: 3, basket: { x: -12.4, y: 100.0 },
      tee: { x: 6.0, y: 84.0 }, short: { x: -12.4, y: 92.38 }, long: { x: -2.6, y: 92.6 },
      backstop: { name: 'Grain sacks', kind: 'sacks', bank: 'SACK BANK', x: -13.05, y: 100.6, hx: 0.9, hy: 0.45, h: 1.6 }, inside: false },
    { n: 5, name: 'TRUCK STOP', par: 3, basket: { x: -3.2, y: 111.5 },
      tee: { x: 15.5, y: 103.5 }, short: { x: -3.2, y: 103.88 }, long: { x: 8.4, y: 107.8 },
      backstop: { name: 'Pallet wall', kind: 'pallets', bank: 'PALLET BANK', x: -4.05, y: 111.75, hx: 0.4, hy: 0.95, h: 1.7 }, inside: false },
    { n: 6, name: 'THE LOADING DOCK', par: 3, basket: { x: 8.0, y: 120.5 },
      tee: { x: -12.0, y: 86.0 }, short: { x: 3.43, y: 114.4 }, long: { x: 14.7, y: 110.3 },
      backstop: { name: 'Loading dock', kind: 'dock', bank: 'DOCK BANK', x: DOCK.x, y: DOCK.y, hx: DOCK.hx, hy: DOCK.hy, h: DOCK.h }, inside: false },
  ];

  /* ---------- surfaces ---------- */
  const FLOOR = { slideFriction: 0.42, skipRetention: 0.86, restitution: 1.0, grassDrag: 0, edgeGrab: 0.02, rollResistance: 0.02,
    sound: 'contact.wood', embed: 0, look: '#b87a45', label: 'Lacquered taproom floor' };
  // venue surfaces, fastest to slowest after a landing: glazed tile (for themes that call for it), lacquered
  // taproom wood (baseline), patio flagstone (~70% of the wood's slide), garden grass (~25%), gravel paths (~15%)
  const SURFACES = {
    taproom_floor: FLOOR,
    tile: { slideFriction: 0.33, skipRetention: 0.88, restitution: 1.0, grassDrag: 0, edgeGrab: 0.01, rollResistance: 0.015, sound: 'contact.hard', embed: 0, look: '#d9d4c7', label: 'Glazed tile' },
    lot_asphalt: { slideFriction: 0.5, skipRetention: 0.72, restitution: 0.65, grassDrag: 0, edgeGrab: 0.04, rollResistance: 0.028, sound: 'contact.hard', embed: 0, look: '#4a4a4f', label: 'Asphalt lot' },
    patio_flagstone: { slideFriction: 0.6, skipRetention: 0.58, restitution: 0.55, grassDrag: 0, edgeGrab: 0.07, rollResistance: 0.045, sound: 'contact.rock', embed: 0, look: '#8f8a80', label: 'Patio flagstone' },
    garden_grass: { slideFriction: 0.55, skipRetention: 0.65, restitution: 0.25, grassDrag: 1.2, edgeGrab: 0.12, rollResistance: 0.05, sound: 'contact.grass', embed: 0.1, look: '#6cc25a', label: 'Garden grass' },
    garden_gravel: { slideFriction: 1.0, skipRetention: 0.25, restitution: 0.15, grassDrag: 1.6, edgeGrab: 0.22, rollResistance: 0.2, sound: 'contact.gravel', embed: 0.02, look: '#9b958b', label: 'Gravel path' },
  };
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
  // a lie this close (m) to a wall, a fence or the door frame is no good
  function nearEdge(x, y, m) {
    const R = ROOM, G = GARDEN;
    if (y < R.y1 && (x < R.x0 + m || x > R.x1 - m || y < R.y0 + m)) return true;
    if (y >= R.y1 && y <= G.y1 && (x < G.x0 + m || x > G.x1 - m || (y > G.y1 - m && (x < GATE.x0 + m || x > GATE.x1 - m)))) return true;
    if (y > G.y1 && (x < LOT.x0 + m || x > LOT.x1 - m || y > LOT.y1 - m || (y < G.y1 + m && (x < GATE.x0 + m || x > GATE.x1 - m)))) return true;
    if (Math.abs(y - R.y1) < m && (x < DOOR.x0 + m || x > DOOR.x1 - m)) return true;
    return false;
  }

  /* ---------- every solid but the baskets and their bank boards (world metres) ---------- */
  function solids(box, cyl, S) {
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
  }
  // relief from being pinned against something big: the silo, the box truck (with its cab), the kettles, the fermenters
  const BIG = [{ k: 'c', x: SILO.x, y: SILO.y, r: SILO.r }, { k: 'b', x: BOX_TRUCK.x, y: BOX_TRUCK.y + 2.3, hx: BOX_TRUCK.hx, hy: BOX_TRUCK.hy + 2.3 }]
    .concat(KETTLES.map(q => ({ k: 'c', x: q.x, y: q.y, r: q.r }))).concat(FERMENTERS.map(q => ({ k: 'c', x: q.x, y: q.y, r: q.r })));

  /* ---------- aiming and the lid on a throw ---------- */
  // where to aim by default from a lie: the basket, unless the lie is inside and the basket is out in the garden
  function defaultTarget(h, lie) {
    if (lie.y < ROOM.y1 - 0.5 && h.basket.y > ROOM.y1) return { x: DOOR.x1 - 1.4, y: ROOM.y1 + 4, z: 0.02, floor: true, waypoint: true };
    return null;
  }
  const inside = (x, y, m) => y < ROOM.y1 - (m || 0);
  // the rafters if you are inside; the door frame if you are outside throwing back in
  function ceilingFor(o, t, basket) { if (o.y < ROOM.y1) return 5.2; return (t.y < ROOM.y1 || basket.y < ROOM.y1) ? DOOR.h - 0.2 : 0; }
  const airCap = (x, y) => y < ROOM.y1 ? 4.0 : 30;   // the highest a reticle can float
  // the course reveal's path for a hole: out through the door when the tee is inside and the basket is not
  function introVia(h, tee) { const w = defaultTarget(h, tee); return w ? [{ x: w.x, y: ROOM.y1 - 1.5 }, { x: w.x, y: ROOM.y1 + 1.5 }] : []; }

  /* ---------- cameras: kept inside the walls and out of the big things ---------- */
  const CAM_BLOCK = [];
  KETTLES.forEach(k => { CAM_BLOCK.push([k.x, k.y, k.r + 0.45]); });
  FERMENTERS.forEach(f => { CAM_BLOCK.push([f.x, f.y, f.r + 0.45]); });
  POSTS_X.forEach(x => { POSTS_Y.forEach(y => { CAM_BLOCK.push([x, y, 0.55]); }); });
  CAM_BLOCK.push([OAK.x, OAK.y, 1.0]); CAM_BLOCK.push([TRUCK.x, TRUCK.y, 3.4]); CAM_BLOCK.push([FIREPIT.x, FIREPIT.y, 1.3]); CAM_BLOCK.push([SILO.x, SILO.y, SILO.r + 0.6]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function camClamp(x, y, z, isIn) {
    if (isIn) return { x: clamp(x, ROOM.x0 + 0.35, ROOM.x1 - 0.35), y: clamp(y, ROOM.y0 + 0.35, ROOM.y1 - 0.35), z: clamp(z, 0.35, 5.2) };
    return { x: clamp(x, GARDEN.x0 + 0.4, GARDEN.x1 - 0.4), y: clamp(y, ROOM.y1 + 0.5, LOT.y1 - 0.5), z: Math.max(0.35, z) };
  }
  // the camera is under the taproom roof (the ceiling stays drawn), and the height above which the roof is in the way
  const underRoof = (x, y, z) => y < ROOM.y1 && y > ROOM.y0 && x > ROOM.x0 && x < ROOM.x1 && z < ROOM.h - 0.2;

  /* ---------- the venue's own trick reads, on top of the course's makes, banks, skips and near misses ---------- */
  const tricks = {
    start(o) { return { overStack: false, overKegs: false, thread: false, under: false, underTruck: false, startInside: o.y < ROOM.y1 }; },
    // passes: over the barrels / kegs, through the door, under the oak, under the box truck (s in world metres)
    sample(f, s) {
      if (Math.abs(s.y - STACK.y) < STACK.len / 2 && Math.abs(s.x - STACK.x) < 1.05 && s.z > 1.3 && s.z < 2.8) f.overStack = true;
      if (Math.abs(s.y - 22.6) < 0.3 && s.x > -1.45 && s.x < 0.4 && s.z > 1.25 && s.z < 2.8) f.overKegs = true;
      if (f.startInside && Math.abs(s.y - ROOM.y1) < 0.2 && s.x > DOOR.x0 && s.x < DOOR.x1 && s.z > 0.08) f.thread = true;
      if (Math.hypot(s.x - OAK.x, s.y - OAK.y) < 2.6 && s.z < 2.6 && s.z > 0.1) f.under = true;
      if (Math.abs(s.x - BOX_TRUCK.x) < BOX_TRUCK.hx && Math.abs(s.y - BOX_TRUCK.y) < BOX_TRUCK.hy && s.z < BOX_TRUCK.z0) f.underTruck = true;
    },
    make(f, k) {
      const hitStack = k.bounces.some(e => e.name === 'Barrel stack'), hitKegs = k.bounces.some(e => e.name === 'Keg pyramid'), PTS = k.PTS;
      if (f.overStack && !hitStack) k.award('over', 'OVER THE BARRELS', PTS.over, 'bonus', true);
      if (f.overKegs && !hitKegs) k.award('overkegs', 'OVER THE KEGS', PTS.over, 'bonus', true);
      if (f.thread) k.award('thread', 'THREAD THE DOOR', PTS.thread, 'bonus', true);
      if (f.under) k.award('under', 'UNDER THE OAK', PTS.under, 'bonus', true);
      if (f.underTruck) k.award('undertruck', 'UNDER THE TRUCK!', PTS.thread, 'bonus', true);
    },
    miss(f, k) {
      if (f.thread) k.award('thread', 'THREAD THE DOOR', Math.round(k.PTS.thread / 2));
      if (f.underTruck) k.award('undertruck', 'UNDER THE TRUCK', Math.round(k.PTS.thread / 2));
    },
    // things you hit, make or miss
    hits(f, k) {
      const b = k.bounces;
      if (b.some(e => /kettle/i.test(e.name || ''))) k.award('bwong', 'BWONG!', 200);
      if (b.some(e => e.name === 'Gong') && !k.out.some(a => a.key === 'bigbank')) k.award('dong', 'DONG!', 500);
      if (b.some(e => e.name === 'Table' || e.name === 'Bar' || e.name === 'Picnic table')) k.award('cheers', 'CHEERS!', k.PTS.cheers);
      if (b.some(e => e.name === 'Food truck')) k.award('truck', 'TACO TRUCK!', 250);
      if (b.some(e => e.name === 'Fire pit')) k.award('pit', 'HOT STUFF', 250);
      if (b.some(e => e.name === 'Umbrella')) k.award('umbrella', 'UMBRELLA BOUNCE', 250);
    },
  };

  return Venues.register({
    id: 'taproom', name: 'THE TAPROOM', FT,
    layout: { ROOM, DOOR, GARDEN, LOT, GATE, SILO, BOX_TRUCK, DOCK, PALLETS, DUMPSTER, FORKLIFT, JENGA, LOT_POLES, POSTS_X, POSTS_Y, KETTLES, FERMENTERS, BAR, TABLES, STACK, STACK_BARRELS, KEGS, UPRIGHT_BARRELS,
      OAK, PICNIC, UMBRELLAS, FIREPIT, TRUCK, PLANTERS, LIGHT_POLES },
    HOLES, SURFACES, surfaceAt, inPlay, nearEdge, solids, bigObstacles: BIG, defaultTarget,
    inside, ceilingFor, airCap, introVia, cam: { blockers: CAM_BLOCK, clamp: camClamp, underRoof, roofZ: ROOM.h }, tricks,
  });
});
