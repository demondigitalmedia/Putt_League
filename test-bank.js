const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const H = require('./src/brewery-hole.js'); const E = { P, FB, CT, MATS }; H.installFloor(MATS);
let found = 0, tried = 0; const hits = {};
const targets = [];
// points on the kettle faces and posts near the basket, at a few heights
for (const k of H.KETTLES) for (const a of [150, 165, 180, 195, 210, 225]) { const r = a * Math.PI / 180; targets.push({ name: 'kettle', x: k.x + Math.cos(r) * k.r, y: k.y + Math.sin(r) * k.r, z: 1.1 }); }
for (const y of [9.0, 15.0]) for (const dx of [-0.17, 0.17]) targets.push({ name: 'post', x: 3.0 + dx, y: y - 0.17, z: 1.1 });
for (const x of [0, 1.5, 2.5, 3.5]) targets.push({ name: 'backwall', x, y: 24, z: 1.2 });
for (const shot of H.SHOTS) for (const t of targets) for (const cls of [2, 0, -2]) for (const pw of [0, 1, 2]) {
  const p = H.solve(P, shot, cls, 0, t, pw);
  const rec = H.throwIt(E, shot, p, 4); const r = H.readThrow(rec, shot); tried++;
  if (r.awards.some(a => a.key === 'bank')) { found++; hits[shot.label + ' ' + t.name] = (hits[shot.label + ' ' + t.name] || 0) + 1; if (found < 15) console.log(shot.label, t.name, t.x.toFixed(2), t.y.toFixed(2), 'cls', cls, 'pw', pw, '->', r.awards.map(a => a.label).join(' | ')); }
}
console.log('banks', found, 'of', tried, hits);
