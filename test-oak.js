const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS); const F = C.FT;
const h = C.HOLES[2], o = h.tee, bk = h.basket, carry = Math.hypot(bk.x - o.x, bk.y - o.y), rp = { x: 0.818, y: 0.575 };
for (const [side, k] of [['right', 4], ['left', -4]]) for (const z of [3.5, 6]) for (const cls of [3, 2, 0, -2]) {
  const tg = { x: C.OAK.x + k * rp.x, y: C.OAK.y + k * rp.y, z };
  const t0 = Date.now();
  const p = C.solve(P, o, C.DISCS[0], cls, Object.assign({ air: true, carry: Math.max(carry, Math.hypot(tg.x - o.x, tg.y - o.y) * 1.2), land: Math.max(carry, Math.hypot(tg.x - o.x, tg.y - o.y) + 1.5) }, tg), 0);
  const r = C.throwIt(E, 2, o, p, 5);
  let best = 99; for (const s of r.samples) best = Math.min(best, Math.hypot(s.x * F + o.x - tg.x, s.y * F + o.y - tg.y, s.z * F - tg.z));
  console.log(side, 'z', z, 'cls', cls, 'la', p.launchAngle.toFixed(0), 'mph', p.armSpeed.toFixed(0), 'thru', best.toFixed(2), 'rest ft from basket', (Math.hypot(r.rest.x - bk.x, r.rest.y - bk.y) / F).toFixed(0), C.readThrow(r, 'pitch', 1).awards.map(a => a.key).join('/'), (Date.now() - t0) + 'ms');
}
