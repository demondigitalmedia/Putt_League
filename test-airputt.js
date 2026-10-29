const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS);
const h = C.HOLES[0], bk = h.basket, d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
for (const [o, nm] of [[h.short, 'short'], [h.long, 'long'], [h.tee, 'tee']]) for (const tg of [{ x: bk.x, y: bk.y, z: 1.0 }, { x: bk.x, y: bk.y, z: 0.5 }, { x: bk.x + 0.8, y: bk.y - 0.3, z: 1.6 }, { x: bk.x, y: bk.y + 0.4, z: 2.5 }]) {
  const t = Object.assign({ air: true, carry: Math.max(d2(o, bk), d2(o, tg) * 1.2) }, tg);
  const p = C.solve(P, o, C.DISCS[0], 0, t, 0);
  const r = C.throwIt(E, 0, o, p, 5); let apex = 0; r.samples.forEach(s => apex = Math.max(apex, s.z));
  console.log(nm, JSON.stringify(tg), 'la', p.launchAngle.toFixed(1), 'mph', p.armSpeed.toFixed(1), 'apex ft', apex.toFixed(1), C.readThrow(r, 'putt', 1).awards.map(a => a.key).join('/'));
}
