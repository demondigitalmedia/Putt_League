const P = require('./src/flightline-physics.js'); const C = require('./src/course.js'); const F = C.FT;
const o = C.HOLES[0].tee, bk = C.HOLES[0].basket, db = Math.hypot(bk.x - o.x, bk.y - o.y);
for (const z of [1.6, 2.5, 3.2]) for (const d of [C.DISCS[0], C.DISCS[2]]) {
  const p = C.solve(P, o, d, 0, { x: bk.x, y: bk.y, z, air: true, carry: db * 1.2, land: db + 1.5 }, 5.2);
  for (const sd of [1, 5]) { const r = P.simulate(Object.assign({}, p, { seed: sd }));
  let zAt = null, apex = 0, land = 0; for (const s of r.samples) { apex = Math.max(apex, s.z * F); land = Math.hypot(s.x, s.y) * F; if (zAt === null && Math.hypot(s.x, s.y) * F >= db) zAt = s.z * F; }
  console.log('z', z, d.label, 'seed', sd, 'la', p.launchAngle.toFixed(1), 'mph', p.armSpeed.toFixed(1), 'z@basket', zAt && zAt.toFixed(2), 'apex', apex.toFixed(2), 'land', land.toFixed(1), 'goal', (db + 1.5).toFixed(1)); }
}
