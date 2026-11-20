// the venue registry: a second venue drops in, plays, and switching back restores the Taproom
const assert = require('assert');
const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS };

assert.deepStrictEqual(C.venueIds(), ['taproom']);
assert.strictEqual(C.venue.id, 'taproom'); assert.strictEqual(C.HOLES.length, 6); assert.ok(C.ROOM && C.OAK);

// a bare outdoor venue: one hole on grass, a fence box around it, one big rock
const PAD = { x0: -10, x1: 10, y0: -2, y1: 30 }, ROCK = { x: 3, y: 8, r: 1.2, h: 1.5 };
C.use({
  id: 'test-field', name: 'THE TEST FIELD',
  layout: { PAD, ROCK },
  HOLES: [{ n: 1, name: 'ONLY HOLE', par: 2, basket: { x: 0, y: 20 }, tee: { x: 0, y: 0 }, short: { x: 0, y: 12.38 }, long: { x: 2, y: 8 },
    backstop: { name: 'Hay bales', kind: 'sacks', bank: 'HAY BANK', x: 0, y: 21, hx: 1, hy: 0.4, h: 1.2 } }],
  SURFACES: { field_grass: MATS.surfaces.garden_grass || { slideFriction: 0.55, skipRetention: 0.65, restitution: 0.25, grassDrag: 1.2, edgeGrab: 0.12, rollResistance: 0.05, sound: 'contact.grass', embed: 0.1 } },
  surfaceAt: () => 'field_grass',
  inPlay: (x, y) => x >= PAD.x0 && x <= PAD.x1 && y >= PAD.y0 && y <= PAD.y1,
  solids(box, cyl) { cyl('Big rock', ROCK.x, ROCK.y, ROCK.r, 0, ROCK.h, 'stone', 'Rock'); },
  bigObstacles: [{ k: 'c', x: ROCK.x, y: ROCK.y, r: ROCK.r }],
});
C.installFloor(MATS);
assert.strictEqual(C.venue.id, 'test-field'); assert.strictEqual(C.HOLES.length, 1);
assert.strictEqual(C.ROOM, undefined, 'the last venue\'s layout is not left mirrored'); assert.ok(C.PAD && C.ROCK);
assert.deepStrictEqual(C.venueIds(), ['taproom', 'test-field']);
assert.strictEqual(C.surfaceAt(0, 5), 'field_grass'); assert.strictEqual(C.defaultTarget(0, { x: 0, y: 0 }), null);
const names = C.worldSolids(0).map(s => s.name);
assert.ok(names.includes('Big rock') && names.includes('Hay bales') && names.includes('Basket pole') && !names.includes('Copper kettle'));

// a putt at the chains from the short tee, and a lie behind the rock gets relief around it
const h = C.HOLES[0], p = C.solve(P, h.short, C.DISCS[0], 0, { x: h.basket.x, y: h.basket.y, z: C.CHAIN_Z }, 0);
let made = 0; for (let s = 1; s <= 10; s++) if (C.readThrow(C.throwIt(E, 0, h.short, p, s), 'putt', 1).made) made++;
const lie = C.fixLie(ROCK.x - 1.0, ROCK.y - 2.3, 0, h.tee);
console.log('test field: putts made', made + '/10', ' lie behind the rock', JSON.stringify(lie));
assert.ok(made > 0, 'a solved putt at the chains goes in sometimes');
assert.ok(C.fixLie(30, 5, 0, h.tee).ob, 'outside the pad is OB');

// back to the Taproom
C.use('taproom'); C.installFloor(MATS);
assert.strictEqual(C.HOLES.length, 6); assert.ok(C.ROOM); assert.strictEqual(C.PAD, undefined);
assert.strictEqual(C.surfaceAt(0, 5), 'taproom_floor');
assert.throws(() => C.use('nowhere'), /no venue "nowhere"/);
console.log('venues ok');
