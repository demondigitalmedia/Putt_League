const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS);
const F = C.FT;
function shoot(hi, from, disc, cls, target, aimErr, pw, seed) {
  const h = C.HOLES[hi]; const tg = target || C.defaultTarget(hi, from) || { x: h.basket.x, y: h.basket.y };
  const p = C.solve(P, from, disc, cls, tg, from.y < C.ROOM.y1 ? 5.0 : 0);
  p.aim += aimErr || 0; p.armSpeed *= 1 + 0.07 * (pw || 0);
  const t = Date.now(); const rec = C.throwIt(E, hi, from, p, seed || 3); rec.ms = Date.now() - t; rec.p = p; return rec;
}
for (let hi = 0; hi < 3; hi++) {
  const h = C.HOLES[hi]; console.log('=== HOLE', h.n, h.name, 'par', h.par, 'dist', (h.dist / F).toFixed(0), 'ft');
  for (const k of ['short', 'long']) {
    const row = [];
    for (const cls of [1, 0, -1]) { const r = shoot(hi, h[k], C.DISCS[0], cls); const rd = C.readThrow(r, 'putt', 1); row.push(cls + ':' + rd.outcome + (rd.tricks ? '*' : '') + '(' + r.ms + 'ms)'); }
    console.log(' putt', k, (Math.hypot(h.basket.x - h[k].x, h.basket.y - h[k].y) / F).toFixed(0) + 'ft', row.join(' '));
  }
  for (const d of C.DISCS) {
    const row = [];
    for (const cls of [2, 1, 0, -1, -2]) {
      const r = shoot(hi, h.tee, d, cls); const rd = C.readThrow(r, 'pitch', 1);
      const dist = Math.hypot(r.rest.x - h.basket.x, r.rest.y - h.basket.y) / F;
      row.push(cls + ':' + (rd.made ? 'MADE' : dist.toFixed(0) + 'ft') + ' la' + r.p.launchAngle.toFixed(0) + ' ' + r.p.armSpeed.toFixed(0) + 'mph ' + (rd.awards.map(a => a.key).join('/') || '') + ' ' + r.ms + 'ms');
    }
    console.log(' pitch', d.label, '\n   ' + row.join('\n   '));
  }
}
// play-out simulation of pitch with an average player (aim error ~ N(0,1.2deg), speed error 4%)
function gauss() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random()); }
for (let hi = 0; hi < 3; hi++) {
  const h = C.HOLES[hi], strokesList = [];
  for (let g = 0; g < 12; g++) {
    let lie = { x: h.tee.x, y: h.tee.y }, s = 0, made = false;
    while (!made && s < h.par + 4) {
      s++;
      const d = Math.hypot(h.basket.x - lie.x, h.basket.y - lie.y), disc = d > 12 ? C.DISCS[2] : C.DISCS[0];
      const r = shoot(hi, lie, disc, 0, null, gauss() * 1.2, gauss() * 0.5, 1 + g * 13 + s);
      made = r.catchResult && r.catchResult.outcome === 'made';
      if (!made) { const f = C.fixLie(r.rest.x, r.rest.y, hi, lie); lie = { x: f.x, y: f.y }; }
    }
    strokesList.push(made ? s : 'X');
  }
  console.log('hole', h.n, 'par', h.par, 'strokes', strokesList.join(' '));
}
