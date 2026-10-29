const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const H = require('./src/brewery-hole.js'); const E = { P, FB, CT, MATS }; H.installFloor(MATS);
const tally = {};
for (const shot of H.SHOTS) for (const cls of [2, 1, 0, -1, -2]) for (const nose of [0, 1, -1]) for (const pw of [1, 2, 3]) for (const tz of [1.1, 1.3, 1.5]) {
  const t = { x: H.GONG.x, y: H.GONG.y - 0.06, z: tz };
  const p = H.solve(P, shot, cls, nose, t, pw - 1);
  const r = H.readThrow(H.throwIt(E, shot, p, 4), shot);
  const k = shot.label + ' ' + (r.made ? 'MADE' : r.outcome) + (r.awards.some(a => a.key === 'bank') ? ' BANK' : '') + (r.awards.some(a => a.key === 'dong') ? ' DONG' : '');
  tally[k] = (tally[k] || 0) + 1;
}
console.log(tally);
