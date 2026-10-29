const P = require('./src/flightline-physics.js'); const C = require('./src/course.js'); const F = C.FT;
const lie = { x: 1, y: 19.9 }, bk = C.HOLES[0].basket, disc = C.DISCS[0];
const ux = 0, uy = 1, dist = 6.1;
for (const la of [19, 24, 29, 34, 39, 44]) for (const mph of [15, 18, 21, 25, 30, 40]) {
  const r = P.simulate({ disc: { speed: 2, glide: 3, turn: 0, fade: 1 }, hand: 'RHBH', spin: 900, hyzer: 0, launchAngle: la, nose: la - 1.5, releaseHeight: 1.0 / F, armSpeed: mph, aim: 0, seed: 1, groundEffect: 0.25 });
  let zAt = null, apex = 0, land = 0, prev = null; for (const s of r.samples) { apex = Math.max(apex, s.z * F); land = s.y * F; if (zAt === null && s.y * F >= dist) zAt = s.z * F; }
  process.stdout.write(`la${la} ${mph}mph z@6=${zAt && zAt.toFixed(1)} apex=${apex.toFixed(1)} land=${land.toFixed(1)} | `);
} console.log();
