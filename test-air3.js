const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS); const F = C.FT;
const mode = process.argv[2] || 'new';
const cases = [[0, null, { x: 1, y: 26, z: 1.6 }], [0, null, { x: 1, y: 26, z: 2.5 }], [0, null, { x: 1, y: 26, z: 4.0 }], [0, null, { x: 1.2, y: 39.8, z: 2.0 }], [0, null, { x: -2, y: 14, z: 3.0 }], [0, 'short', { x: 1, y: 26, z: 1.8 }],
  [2, null, { x: 0.5, y: 60.5, z: 8 }], [2, null, { x: 3.8, y: 62.8, z: 5 }], [2, null, { x: -10, y: 76, z: 3 }], [1, null, { x: -3.5, y: 40, z: 2.0 }]];
for (const [hi, k, tg] of cases) {
  const h = C.HOLES[hi], o = k ? h[k] : h.tee, bk = h.basket, inside = o.y < C.ROOM.y1;
  const db = Math.hypot(bk.x - o.x, bk.y - o.y), dp = Math.hypot(tg.x - o.x, tg.y - o.y);
  for (const disc of [C.DISCS[0], C.DISCS[2]]) {
    const t0 = Date.now();
    const base = mode === 'game' ? C.solve(P, o, disc, 0, C.defaultTarget(hi, o) || bk, inside ? 5.2 : 0) : null;
    const p = C.solve(P, o, disc, 0, Object.assign({ air: true, carry: Math.max(db, dp * 1.2), land: Math.max(db, dp + 1.5), speed: base ? base.armSpeed : undefined }, tg), mode === 'game' ? 0 : (inside ? 5.2 : 0));
    const ms = Date.now() - t0;
    const r = C.throwIt(E, hi, o, p, 5); let apex = 0, best = 99; r.samples.forEach(s => { apex = Math.max(apex, s.z * F); best = Math.min(best, Math.hypot(s.x * F + o.x - tg.x, s.y * F + o.y - tg.y, s.z * F - tg.z)); });
    console.log('h' + (hi + 1), k || 'tee', JSON.stringify(tg), disc.label, 'la', p.launchAngle.toFixed(0), 'mph', p.armSpeed.toFixed(0), 'apex m', apex.toFixed(1), 'thru', best.toFixed(2), 'travel/hole', (Math.hypot(r.rest.x - o.x, r.rest.y - o.y) / db).toFixed(2), (r.events || []).filter(e => e.type === 'bounce').slice(0, 2).map(e => e.name).join('/'), ms + 'ms');
  }
}
// near-basket lies with a high reticle
for (const lie of [{ x: 1.0, y: 19.9 }, { x: -1.6, y: 16.3 }, { x: 3, y: 23 }]) for (const z of [3, 4]) {
  const h = C.HOLES[0], bk = h.basket, tg = { x: bk.x, y: bk.y, z }, db = Math.hypot(bk.x - lie.x, bk.y - lie.y);
  const p = C.solve(P, lie, C.DISCS[0], 0, Object.assign({ air: true, carry: db * 1.2, land: db + 1.5 }, tg), 5.2);
  const r = C.throwIt(E, 0, lie, p, 5); let apex = 0; r.samples.forEach(s => apex = Math.max(apex, s.z * F));
  console.log('near', JSON.stringify(lie), 'z', z, 'la', p.launchAngle.toFixed(0), 'mph', p.armSpeed.toFixed(0), 'apex', apex.toFixed(2), C.readThrow(r, 'pitch', 2).awards.map(a => a.key).join('/'));
}
