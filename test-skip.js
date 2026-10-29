const P = require('./src/flightline-physics.js'), FB = require('./src/flightline-basket.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const H = require('./src/brewery-hole.js'); const E = { P, FB, CT, MATS }; H.installFloor(MATS);
const shot = H.SHOTS[0];
for (const [cls, nose, pw] of [[3,-3,-2],[3,-2,-1],[2,-3,-3],[0,-3,-1],[3,-1,-3]]) {
  const p = H.solve(P, shot, cls, nose, null, pw);
  const rec = H.throwIt(E, shot, p, 5);
  console.log('cls',cls,'nose',nose,'pw',pw, rec.catchResult && rec.catchResult.outcome);
  for (const e of rec.events.slice(0, 7)) console.log('   ', e.type, e.name || '', 'y=' + (e.y * 0.3048 + shot.y).toFixed(2), 'z=' + (e.z * 0.3048).toFixed(2), 'tilt', e.tilt, 'path', e.path, 'v', e.v, 'up', e.up);
}
