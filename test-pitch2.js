const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS); const F = C.FT;
function gauss() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random()); }
for (const mode of ['old', 'dropin']) for (const [hi, from] of [[0, 'tee'], [2, 'tee'], [3, 'tee'], [5, 'tee']]) {
  const h = C.HOLES[hi], o = h[from], bk = h.basket, db = Math.hypot(bk.x - o.x, bk.y - o.y), roof = o.y < C.ROOM.y1 ? 5.2 : 0;
  let past = [], made = 0, N = 12, t0 = Date.now(), la = 0, mph = 0;
  const disc = C.DISCS[db > 30 ? 2 : 1];
  const base = mode === 'old' ? C.solve(P, o, disc, 0, { x: bk.x, y: bk.y, z: C.CHAIN_Z }, roof)
    : C.solve(P, o, disc, 0, { x: bk.x, y: bk.y, z: C.CHAIN_Z, air: true, carry: db, land: db + 1.5 }, roof);
  const ms = Date.now() - t0;
  for (let i = 0; i < N; i++) {
    const p = Object.assign({}, base); p.aim += gauss() * 1.4; p.armSpeed *= 1 + Math.abs(gauss()) * 0.02; p.hyzer = gauss() * 5;
    const r = C.throwIt(E, hi, o, p, 31 + i);
    if (r.catchResult && r.catchResult.outcome === 'made') { made++; continue; }
    past.push((((r.rest.x - o.x) * (bk.x - o.x) + (r.rest.y - o.y) * (bk.y - o.y)) / db - db) / F);
  }
  past.sort((a, b) => a - b);
  console.log(mode.padEnd(6), 'h' + (hi + 1), Math.round(db / F) + 'ft', 'la', base.launchAngle.toFixed(0), 'mph', base.armSpeed.toFixed(0), 'solve', ms + 'ms', 'made', made, 'miss past ft median', past.length ? past[Math.floor(past.length / 2)].toFixed(0) : '-', 'max', past.length ? past[past.length - 1].toFixed(0) : '-');
}
