const P = require('./src/flightline-physics.js'); const C = require('./src/course.js'); const F = C.FT;
const lie = { x: 1, y: 19.9 }, bk = C.HOLES[0].basket, db = 6.1;
for (const z of [2, 3, 4]) {
  const p = C.solve(P, lie, C.DISCS[0], 0, { x: bk.x, y: bk.y, z, air: true, carry: db * 1.2, land: db + 1.5 }, 5.2);
  const r = P.simulate(Object.assign({}, p, { seed: 1 }));
  let zAt = null, apex = 0, land = 0; for (const s of r.samples) { apex = Math.max(apex, s.z * F); land = s.y * F; if (zAt === null && s.y * F >= db) zAt = s.z * F; }
  console.log('z', z, 'la', p.launchAngle.toFixed(1), 'mph', p.armSpeed.toFixed(1), 'nose', p.nose.toFixed(1), 'z@basket', zAt && zAt.toFixed(2), 'apex', apex.toFixed(2), 'land', land.toFixed(1));
}
