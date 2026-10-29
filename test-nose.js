const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS); const F = C.FT;
const h = C.HOLES[0];
for (const [o, nm] of [[h.short, 'short'], [h.long, 'long']]) for (const n of [0, 1, 2, 3, -3]) {
  const p = C.solve(P, o, C.DISCS[0], 0, h.basket, 6); const q = Object.assign({}, p); q.nose += 3.5 * n;
  const r = C.throwIt(E, 0, o, q, 5); let apex = 0; r.samples.forEach(s => apex = Math.max(apex, s.z));
  console.log(nm, 'nose', n, 'la', p.launchAngle.toFixed(1), 'nose deg', q.nose.toFixed(1), 'apex ft', apex.toFixed(1), C.readThrow(r, 'putt', 1).awards.map(a => a.key).join('/'));
}
