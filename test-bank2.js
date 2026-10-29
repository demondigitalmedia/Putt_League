const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); const E = { P, FB, CT, MATS }; C.installFloor(MATS); const F = C.FT;
// throw at the middle kettle (5.6, 12.5, r 1.05) from across the aisle, hitting its face at several offsets
const k = C.KETTLES[1];
for (const [from, label] of [[{ x: -1.5, y: 6.0 }, 'from left-front'], [{ x: 0.5, y: 2.0 }, 'from front']]) for (const off of [-0.8, -0.4, 0, 0.4, 0.8]) for (const cls of [0, 2]) {
  const d = Math.hypot(k.x - from.x, k.y - from.y), ux = (k.x - from.x) / d, uy = (k.y - from.y) / d;
  const tg = { x: k.x - ux * (k.r + 0.05) + (-uy) * off, y: k.y - uy * (k.r + 0.05) + ux * off, z: 1.3, air: true, carry: d, land: d + 3 };
  const p = C.solve(P, from, C.DISCS[1], 0, tg, 5.2); p.hyzer = C.BANK[cls];
  const r = C.throwIt(E, 0, from, p, 5), ev = (r.events || []);
  const hit = ev.find(e => e.type === 'bounce'); if (!hit) { console.log(label, 'off', off, 'cls', cls, 'no hit'); continue; }
  const i = r.samples.findIndex(s => s.t >= hit.t), pre = r.samples[Math.max(0, i - 2)], post = r.samples[Math.min(r.samples.length - 1, i + 3)];
  const land = r.samples.find((s, j) => j > i && s.z * F < 0.05);
  const hd = (a, b) => Math.atan2(b.x - a.x, b.y - a.y) * 57.3;
  console.log(label.padEnd(15), 'off', String(off).padStart(4), 'cls', cls, 'hit', hit.name, 'v', hit.v + 'mph', 'speed after', post.speed.toFixed(1), 'flies on', land ? ((land.t - hit.t).toFixed(2) + 's') : '-', 'rest', '(' + r.rest.x.toFixed(1) + ',' + r.rest.y.toFixed(1) + ')', 'after:', ev.filter(e => e.t > hit.t && e.type !== 'release').slice(0, 3).map(e => e.type + (e.name ? ':' + e.name : '')).join(' '));
}
