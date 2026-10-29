const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const H = require('./src/brewery-hole.js'); const E = { P, FB, CT, MATS }; H.installFloor(MATS);
let found = 0, tried = 0;
for (const shot of H.SHOTS) {
  const bx = H.BASKET.x, by = H.BASKET.y, d = Math.hypot(bx - shot.x, by - shot.y), ux = (bx - shot.x) / d, uy = (by - shot.y) / d;
  for (const back of [1.2, 1.6, 2.0, 2.5, 3.0]) for (const cls of [3, 2, 1, 0, -1, -2, -3]) for (const nose of [0, -1, -2]) for (const pw of [0, 1, 2]) {
    const target = { x: bx - ux * back, y: by - uy * back, z: 0.02 };
    const p = H.solve(P, shot, cls, nose, target, pw);
    const rec = H.throwIt(E, shot, p, 9); const r = H.readThrow(rec, shot); tried++;
    if (r.awards.some(a => a.key === 'skipIn')) { found++; if (found < 30) console.log(shot.label, 'back', back, 'cls', cls, 'nose', nose, 'pw', pw, '->', r.awards.map(a => a.label).join(' | ')); }
  }
}
console.log('skip-ins', found, 'of', tried);
