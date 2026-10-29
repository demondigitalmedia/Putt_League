const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const H = require('./src/brewery-hole.js');
const E = { P, FB, CT, MATS };
const t0 = Date.now();
for (const shot of H.SHOTS) {
  console.log('== shot', shot.label, 'dist', Math.hypot(H.BASKET.x - shot.x, H.BASKET.y - shot.y).toFixed(2), 'm');
  for (const cls of [3, 2, 1, 0, -1, -2, -3]) {
    for (const nose of [0, -2]) {
      const ts = Date.now();
      const p = H.solve(P, shot, cls, nose, null, 0);
      const rec = H.throwIt(E, shot, p, 11);
      const r = H.readThrow(rec, shot);
      const ev = rec.events.filter(e => !['release'].includes(e.type)).map(e => e.type + (e.name ? ':' + e.name : '')).slice(0, 8).join(',');
      console.log(`cls ${cls} nose ${nose} aim ${p.aim.toFixed(1)} la ${p.launchAngle.toFixed(1)} mph ${p.armSpeed.toFixed(1)} -> ${r.outcome} [${r.awards.map(a => a.label).join(' | ')}] ev:${ev}  ${Date.now() - ts}ms`);
    }
  }
}
console.log('total', Date.now() - t0, 'ms');
