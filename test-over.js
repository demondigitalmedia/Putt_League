// how far past the basket do missed throws end up? targets at the basket's distance, human-ish error
const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS); const F = C.FT;
function gauss() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random()); }
const out = [];
for (const [hi, k] of [[0, 'short'], [0, 'long'], [1, 'short'], [2, 'short'], [0, 'tee']]) {
  const h = C.HOLES[hi], o = h[k], bk = h.basket, db = Math.hypot(bk.x - o.x, bk.y - o.y);
  let past = [], made = 0, N = 14;
  for (let i = 0; i < N; i++) {
    const z = [1.08, 1.4, 1.9][i % 3], air = z > 1.1, tg = air ? { x: bk.x, y: bk.y, z, air: true, carry: db * 1.2, land: db + (process.env.LANDPAD ? +process.env.LANDPAD : 1.5) } : { x: bk.x, y: bk.y, z };
    const p = Object.assign({}, C.solve(P, o, C.DISCS[db > 12 ? 1 : 0], 0, tg, o.y < C.ROOM.y1 ? 5.2 : 0));
    p.aim += gauss() * 1.6; p.armSpeed *= 1 + Math.abs(gauss()) * 0.02; p.hyzer = gauss() * 5;
    const r = C.throwIt(E, hi, o, p, 21 + i);
    if (r.catchResult && r.catchResult.outcome === 'made') { made++; continue; }
    const al = ((r.rest.x - o.x) * (bk.x - o.x) + (r.rest.y - o.y) * (bk.y - o.y)) / db;
    past.push((al - db) / F);
  }
  past.sort((a, b) => a - b);
  console.log('h' + (hi + 1), k.padEnd(5), Math.round(db / F) + 'ft', 'made', made + '/' + N, 'misses end past basket (ft): median', past.length ? past[Math.floor(past.length / 2)].toFixed(0) : '-', 'max', past.length ? past[past.length - 1].toFixed(0) : '-');
}
