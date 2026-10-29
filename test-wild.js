// hunt for "into space" throws: random lies, aims, angles, nose, power across all holes
const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS); const F = C.FT;
let worst = [], n = 0;
for (let i = 0; i < 360; i++) {
  const hi = i % 6, h = C.HOLES[hi], src = [h.tee, h.short, h.long][i % 3], bk = h.basket;
  const tg = { x: bk.x + (Math.random() - 0.5) * 12, y: bk.y + (Math.random() - 0.5) * 12, z: Math.random() * 3 };
  const p = C.solve(P, src, C.DISCS[i % 3], 0, tg, src.y < C.ROOM.y1 ? 5.2 : 0);
  p.hyzer = (Math.random() - 0.5) * 60; p.nose += (Math.random() - 0.5) * 15; p.armSpeed *= 1 + (Math.random() - 0.3) * 0.4;
  const r = C.throwIt(E, hi, src, p, i); n++;
  const ev = (r.events || []).filter(e => e.type !== 'release'), t1 = ev.length ? ev[0].t : 1e9;
  let preMax = 0, postMax = 0, preV = 0, postV = 0;
  r.samples.forEach(s => { if (s.t < t1) { preMax = Math.max(preMax, s.z * F); preV = Math.max(preV, s.speed); } else { postMax = Math.max(postMax, s.z * F); postV = Math.max(postV, s.speed); } });
  worst.push({ i, hi: hi + 1, preMax, postMax, preV, postV, first: ev[0] ? ev[0].type + ':' + (ev[0].name || '') : '-' });
}
worst.sort((a, b) => (b.postMax - b.preMax) - (a.postMax - a.preMax));
console.log('throws', n); worst.slice(0, 6).forEach(w => console.log('h' + w.hi, 'apex before contact', w.preMax.toFixed(1) + 'm', 'after', w.postMax.toFixed(1) + 'm', 'speed before', w.preV.toFixed(0), 'after', w.postV.toFixed(0), 'first contact', w.first));
