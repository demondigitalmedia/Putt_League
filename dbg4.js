const P = require('./src/flightline-physics.js'); const C = require('./src/course.js'); const F = C.FT;
const o = C.HOLES[0].tee, bk = C.HOLES[0].basket, db = Math.hypot(bk.x - o.x, bk.y - o.y);
for (const cls of [0, 1, -1, 2, -2, 3, -3]) {
  const p = C.solve(P, o, C.DISCS[1], cls, { x: bk.x, y: bk.y, z: 4, air: true, carry: db * 1.2, land: db + 1.5 }, 5.2);
  const r = P.simulate(Object.assign({}, p, { seed: 1 })); let apex = 0; r.samples.forEach(s => apex = Math.max(apex, s.z * F));
  console.log('cls', cls, 'la', p.launchAngle.toFixed(1), 'mph', p.armSpeed.toFixed(1), 'apex', apex.toFixed(2));
}
