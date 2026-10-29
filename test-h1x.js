const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS); const F = C.FT;
function gauss() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random()); }
const hi = 0, h = C.HOLES[0];
for (let g = 0; g < 16; g++) {
  let lie = { x: h.tee.x, y: h.tee.y }, s = 0, made = false, log = [];
  while (!made && s < 6) { s++;
    const d = Math.hypot(h.basket.x - lie.x, h.basket.y - lie.y), disc = d > 12 ? C.DISCS[2] : C.DISCS[0];
    const tg = C.defaultTarget(hi, lie) || h.basket; const p = C.solve(P, lie, disc, 0, tg, 5.0); p.aim += gauss() * 1.2; p.armSpeed *= 1 + 0.07 * gauss() * 0.5;
    const r = C.throwIt(E, hi, lie, p, 1 + g * 13 + s); made = r.catchResult && r.catchResult.outcome === 'made';
    log.push('(' + lie.x.toFixed(1) + ',' + lie.y.toFixed(1) + ' ' + (d / F).toFixed(0) + 'ft ' + (r.catchResult ? r.catchResult.outcome : '') + ' ' + C.readThrow(r, 'pitch', 1).awards.map(a => a.key).join('/') + ')');
    if (!made) { const f = C.fixLie(r.rest.x, r.rest.y, hi, lie); lie = { x: f.x, y: f.y }; }
  }
  console.log(made ? s : 'X', log.join(' '));
}
