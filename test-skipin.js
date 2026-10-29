const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS); const F = C.FT;
let n = 0, skipIn = 0, past = [];
for (const k of ['short', 'long', 'tee']) { const h = C.HOLES[0], o = h[k], bk = h.basket, db = Math.hypot(bk.x - o.x, bk.y - o.y), ux = (bk.x - o.x) / db, uy = (bk.y - o.y) / db;
  for (const back of [1.0, 1.6, 2.2, 3.0, 4.0]) for (const nose of [0, -1, -2]) for (const pw of [0, 1, 2]) for (const lat of [-0.1, 0, 0.1]) for (const hz of [0, 2, 3]) {
    const tg = { x: bk.x - ux * back - uy * lat, y: bk.y - uy * back + ux * lat, z: 0.02, floor: true };
    const p = C.solve(P, o, C.DISCS[db > 12 ? 1 : 0], 0, tg, 5.2); p.nose += 2.5 * nose; p.armSpeed *= 1 + 0.07 * pw; p.hyzer = C.BANK[hz];
    const r = C.throwIt(E, 0, o, p, 5); n++; const rd = C.readThrow(r, 'putt', 1);
    if (rd.awards.some(a => a.key === 'skipIn')) skipIn++;
    else { const al = ((r.rest.x - o.x) * ux + (r.rest.y - o.y) * uy); past.push((al - db) / F); }
  } }
past.sort((a, b) => a - b);
console.log('floor-skip tries', n, 'skip-ins', skipIn, 'misses past basket ft median', past[Math.floor(past.length / 2)].toFixed(0), '90th', past[Math.floor(past.length * 0.9)].toFixed(0));
