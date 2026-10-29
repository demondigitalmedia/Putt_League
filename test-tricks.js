const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const H = require('./src/brewery-hole.js'); const E = { P, FB, CT, MATS }; H.installFloor(MATS);
const tally = {};
for (const shot of H.SHOTS) {
  let n = 0;
  for (const cls of [3, 2, 1, 0, -1, -2, -3]) for (const nose of [-3, -2, -1, 1]) for (const pw of [-3, -2, -1, 0, 1, 2]) {
    const p = H.solve(P, shot, cls, nose, null, pw);
    const rec = H.throwIt(E, shot, p, 5); const r = H.readThrow(rec, shot);
    const k = shot.label + ' ' + r.outcome; tally[k] = (tally[k] || 0) + 1;
    const tr = r.awards.filter(a => ['skipIn', 'bank', 'dong', 'roller', 'pinball', 'spit'].includes(a.key));
    if (tr.length && n < 25) { n++; console.log(shot.label, 'cls', cls, 'nose', nose, 'pw', pw, '->', r.outcome, r.awards.map(a => a.label + ' ' + a.pts).join(' | ')); }
  }
}
console.log(tally);
// aim error sensitivity: make rate vs lateral aim error
for (const shot of H.SHOTS) {
  const row = [];
  for (const err of [0.5, 1, 1.5, 2, 3]) {
    let made = 0, N = 0;
    for (const cls of [1, 0, -1]) for (const s of [-1, 1]) { const p = H.solve(P, shot, cls, 0, null, 0); p.aim += s * err; const r = H.readThrow(H.throwIt(E, shot, p, 3), shot); N++; if (r.made) made++; }
    row.push(err + 'deg:' + made + '/' + N);
  }
  console.log(shot.label, 'aim error', row.join('  '));
  const rowp = [];
  for (const pe of [0.03, 0.06, 0.1]) { let made = 0, N = 0; for (const s of [-1, 1]) for (const cls of [1, 0, -1]) { const p = H.solve(P, shot, cls, 0, null, 0); p.armSpeed *= 1 + s * pe; const r = H.readThrow(H.throwIt(E, shot, p, 3), shot); N++; if (r.made) made++; } rowp.push(pe + ':' + made + '/' + N); }
  console.log(shot.label, 'speed error', rowp.join('  '));
}
