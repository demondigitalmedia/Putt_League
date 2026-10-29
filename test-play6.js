// a searching bot: for each throw it tries aim spots (the basket, and points left/right/over), flat release,
// picks the one that ends closest (or makes it), then throws it with human-ish error
const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS); const F = C.FT;
function gauss() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random()); }
const holes = process.argv[2] ? process.argv[2].split(',').map(Number) : [0, 1, 2, 3, 4, 5];
const games = +(process.argv[3] || 8);
function ceil(o, bk) { return o.y < C.ROOM.y1 ? 5.2 : (bk.y < C.ROOM.y1 ? C.DOOR.h - 0.2 : 0); }
function plan(hi, lie) {
  const h = C.HOLES[hi], bk = h.basket, d = Math.hypot(bk.x - lie.x, bk.y - lie.y), ux = (bk.x - lie.x) / d, uy = (bk.y - lie.y) / d;
  const disc = d > 12 ? C.DISCS[d > 30 ? 2 : 1] : C.DISCS[0], opts = [];
  const def = C.defaultTarget(hi, lie);
  opts.push({ t: def || { x: bk.x, y: bk.y, z: C.CHAIN_Z }, hy: 0 });
  for (const hy of [2, -2]) opts.push({ t: def || { x: bk.x, y: bk.y, z: C.CHAIN_Z }, hy });
  if (!def) for (const k of [0.35, 0.55]) for (const side of [-1, 1]) for (const z of [1.6, 3.2]) {
    const along = d * k, lat = side * Math.max(2.5, d * 0.18);
    opts.push({ t: { x: lie.x + ux * along - uy * lat, y: lie.y + uy * along + ux * lat, z, air: true }, hy: side > 0 ? 2 : -2 });
  }
  let best = null;
  for (const o of opts) {
    const t = o.t, dp = Math.hypot(t.x - lie.x, t.y - lie.y);
    const tt = t.air ? Object.assign({ carry: Math.max(d, dp * 1.2), land: Math.max(d, dp + 1.5) }, t) : t;
    const p = C.solve(P, lie, disc, 0, tt, ceil(lie, bk)); p.hyzer = C.BANK[o.hy] || 0;
    const r = C.throwIt(E, hi, lie, p, 3), made = r.catchResult && r.catchResult.outcome === 'made';
    const score = made ? -1 : Math.hypot(r.rest.x - bk.x, r.rest.y - bk.y);
    if (!best || score < best.score) best = { score, p, o };
  }
  return best;
}
for (const hi of holes) {
  const h = C.HOLES[hi], list = [];
  for (let g = 0; g < games; g++) {
    let lie = { x: h.tee.x, y: h.tee.y }, s = 0, made = false;
    while (!made && s < h.par + 4) {
      s++;
      const b = plan(hi, lie), p = Object.assign({}, b.p);
      p.aim += gauss() * 1.2; p.armSpeed *= 1 + gauss() * 0.03; p.hyzer += gauss() * 3;
      const r = C.throwIt(E, hi, lie, p, 7 + g * 31 + s);
      made = r.catchResult && r.catchResult.outcome === 'made';
      if (!made) { const f = C.fixLie(r.rest.x, r.rest.y, hi, lie); lie = { x: f.x, y: f.y }; }
    }
    list.push(made ? s : 'X');
  }
  const num = list.filter(x => x !== 'X'); console.log('hole', h.n, h.name, 'par', h.par, 'strokes', list.join(' '), ' avg', (num.reduce((a, b) => a + b, 0) / Math.max(1, num.length)).toFixed(2));
}
