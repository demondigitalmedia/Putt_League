const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS); const F = C.FT;
for (const hi of [0, 1, 2]) { const h = C.HOLES[hi], bk = h.basket;
for (const [o, nm] of [[h.short, 'short'], [h.long, 'long']]) for (const off of [-3, 0, 3]) for (const sp of [1, 0.85, 0.72]) {
  const p = Object.assign({}, C.solve(P, o, C.DISCS[0], 0, bk, o.y < C.ROOM.y1 ? 5.2 : 0)); p.aim += off; p.armSpeed *= sp;
  const r = C.throwIt(E, hi, o, p, 5); let land = null;
  for (const s of r.samples) if (s.z * F < 0.05 && !land) land = s;
  const d0 = Math.hypot(bk.x - o.x, bk.y - o.y);
  const along = (q) => ((q.x - o.x) * (bk.x - o.x) + (q.y - o.y) * (bk.y - o.y)) / d0;
  console.log('h' + (hi + 1), nm, 'off', off, 'spd', sp, 'mph', p.armSpeed.toFixed(1), 'la', p.launchAngle.toFixed(0), 'rest past basket ft', ((along(r.rest) - d0) / F).toFixed(0), C.readThrow(r, 'putt', 1).awards.map(a => a.key).join('/'));
} }
