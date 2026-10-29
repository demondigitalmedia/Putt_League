const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS); const F = C.FT;
let n = 0, makes = 0, skipIn = 0, skipsAny = 0, hiBounce = 0;
const h = C.HOLES[0], bk = h.basket;
for (const k of ['short', 'long']) { const o = h[k], db = Math.hypot(bk.x - o.x, bk.y - o.y), ux = (bk.x - o.x) / db, uy = (bk.y - o.y) / db;
  for (const back of [1.2, 1.6, 2.0, 2.5, 3.0]) for (const nose of [0, -1, -2]) for (const pw of [0, 1, 2]) for (const hz of [3, 2, 1, 0, -1, -2, -3]) {
    const tg = { x: bk.x - ux * back, y: bk.y - uy * back, z: 0.02, floor: true };
    const p = C.solve(P, o, C.DISCS[0], hz, tg, 5.2); p.nose += 2.5 * nose; p.armSpeed *= 1 + 0.07 * pw;
    const r = C.throwIt(E, 0, o, p, 5); n++;
    const ev = r.events || [], fl = ev.filter(e => e.type === 'skip' || e.type === 'hop');
    if (fl.length) skipsAny++;
    // peak height after first floor touch
    if (fl.length) { const t0 = fl[0].t; let mz = 0; r.samples.forEach(s => { if (s.t > t0) mz = Math.max(mz, s.z * F); }); if (mz > 0.6) hiBounce++; }
    if (r.catchResult && r.catchResult.outcome === 'made') { makes++; if (C.readThrow(r, 'putt', 1).awards.some(a => a.key === 'skipIn')) skipIn++; }
  } }
console.log('tries', n, 'with floor skips', skipsAny, 'skip rose above 0.6 m', hiBounce, 'makes', makes, 'skip-ins', skipIn);
