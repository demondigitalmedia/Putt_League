const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS);
function gauss() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random()); }
C.HOLES.forEach((h, hi) => { const row = [];
  for (const k of ['short', 'long']) { const o = h[k], bk = h.basket; let made = 0, N = 16;
    const p0 = C.solve(P, o, C.DISCS[0], 0, { x: bk.x, y: bk.y, z: C.CHAIN_Z }, o.y < C.ROOM.y1 ? 5.2 : 0);
    for (let i = 0; i < N; i++) { const p = Object.assign({}, p0); p.aim += gauss() * 1.6; p.armSpeed *= 1 + gauss() * 0.03; p.hyzer = gauss() * 5; const r = C.throwIt(E, hi, o, p, 11 + i); if (r.catchResult && r.catchResult.outcome === 'made') made++; }
    row.push(k + ' ' + Math.round(made / N * 100) + '%'); }
  console.log('hole', h.n, 'straight-at-chains putts:', row.join('  '));
});
