const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS); const F = C.FT;
const h = C.HOLES[2], o = h.tee, carry = Math.hypot(h.basket.x - o.x, h.basket.y - o.y);
for (const tg of [{ x: C.OAK.x, y: C.OAK.y, z: 7.5 }, { x: C.OAK.x - 4.5, y: C.OAK.y + 1, z: 2.5 }, { x: C.OAK.x + 3.5, y: C.OAK.y - 2, z: 2 }]) {
  for (const d of C.DISCS) {
    const t0 = Date.now();
    const p = C.solve(P, o, d, 0, Object.assign({ air: true, carry: Math.max(carry, Math.hypot(tg.x - o.x, tg.y - o.y) * 1.2) }, tg), 0);
    const r = C.throwIt(E, 2, o, p, 5), rd = C.readThrow(r, 'pitch', 1);
    // how close did it pass the air point?
    let best = 99; for (const s of r.samples) { const x = s.x * F + o.x, y = s.y * F + o.y, z = s.z * F; best = Math.min(best, Math.hypot(x - tg.x, y - tg.y, z - tg.z)); }
    console.log('target', JSON.stringify(tg), d.label, 'launch', p.launchAngle.toFixed(1), 'mph', p.armSpeed.toFixed(0), 'passed within', best.toFixed(2) + 'm', 'rest', (Math.hypot(r.rest.x - h.basket.x, r.rest.y - h.basket.y) / F).toFixed(0) + 'ft from basket', rd.awards.map(a => a.key).join('/'), (Date.now() - t0) + 'ms');
  }
}
