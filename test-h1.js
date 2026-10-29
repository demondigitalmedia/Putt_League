const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS); const F = C.FT;
function gauss() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random()); }
for (let hi = 0; hi < 3; hi++) {
  const h = C.HOLES[hi]; const res = {};
  for (const k of ['short', 'long']) { let m = 0; for (let g = 0; g < 10; g++) { const p = C.solve(P, h[k], C.DISCS[0], 0, h.basket, 5); p.aim += gauss() * 1.0; p.armSpeed *= 1 + gauss() * 0.03; const r = C.throwIt(E, hi, h[k], p, g + 1); if (r.catchResult.outcome === 'made') m++; } res[k] = m + '/10'; }
  const lines = [];
  for (let g = 0; g < 12; g++) {
    let lie = { x: h.tee.x, y: h.tee.y }, s = 0, made = false, log = [];
    while (!made && s < h.par + 4) {
      s++;
      const tg = C.defaultTarget(hi, lie) || { x: h.basket.x, y: h.basket.y };
      const d = Math.hypot(h.basket.x - lie.x, h.basket.y - lie.y), disc = d > 13 ? C.DISCS[1] : C.DISCS[0];
      const p = C.solve(P, lie, disc, 0, tg, lie.y < C.ROOM.y1 ? 5.0 : 0); p.aim += gauss() * 1.0; p.armSpeed *= 1 + gauss() * 0.03;
      const r = C.throwIt(E, hi, lie, p, 1 + g * 13 + s);
      made = r.catchResult && r.catchResult.outcome === 'made';
      log.push((d / F).toFixed(0) + 'ft->' + (made ? 'IN' : (Math.hypot(r.rest.x - h.basket.x, r.rest.y - h.basket.y) / F).toFixed(0)));
      if (!made) { const f = C.fixLie(r.rest.x, r.rest.y, hi, lie); lie = { x: f.x, y: f.y }; }
    }
    lines.push((made ? s : 'X') + ' [' + log.join(' ') + ']');
  }
  console.log('HOLE', h.n, 'putts', JSON.stringify(res)); console.log(' ' + lines.join('\n '));
}
