const P = require('./src/flightline-physics.js'); const C = require('./src/course.js'); const F = C.FT;
const h = C.HOLES[0], bk = h.basket;
for (const [o, nm, d] of [[h.short, '25ft putt', 0], [h.long, '40ft putt', 0], [h.tee, '86ft tee', 1], [C.HOLES[2].tee, 'h3 tee 128ft', 2]]) {
  const B = nm.startsWith('h3') ? C.HOLES[2].basket : bk, dist = Math.hypot(B.x - o.x, B.y - o.y), ux = (B.x - o.x) / dist, uy = (B.y - o.y) / dist;
  const p0 = C.solve(P, o, C.DISCS[d], 0, B, o.y < 40 ? 5.2 : 0);
  const out = [];
  for (const [lab, hy, nose] of [['flat', 0, 0], ['hyz1', 1, 0], ['hyz2', 2, 0], ['hyz3', 3, 0], ['any2', -2, 0], ['any3', -3, 0], ['noseUp2', 0, 2], ['noseDn2', 0, -2]]) {
    const p = Object.assign({}, p0, { hyzer: C.BANK[hy], nose: p0.nose + 2.5 * nose });
    const r = P.simulate(Object.assign({}, p, { seed: 1 }));
    let at = null; for (const s of r.samples) { const al = s.x * F * ux + s.y * F * uy; if (al >= dist) { at = s; break; } }
    const L = r.samples[r.samples.length - 1], lat = at ? (at.x * F * uy - at.y * F * ux) : null;
    out.push(lab + ': ' + (at ? 'lat ' + (lat / F).toFixed(1) + 'ft z ' + (at.z).toFixed(1) + 'ft' : 'short ' + ((Math.hypot(L.x, L.y) * F - dist) / F).toFixed(0) + 'ft'));
  }
  console.log(nm, C.DISCS[d].label, '\n  ' + out.join('\n  '));
}
