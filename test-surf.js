const P = require('./src/flightline-physics.js'), CT = require('./src/ddm-contact.js'), MATS = require('./src/ddm-materials.js');
const C = require('./src/course.js'); C.installFloor(MATS); const F = C.FT;
const surfs = process.argv.slice(2).length ? process.argv.slice(2) : ['taproom_floor', 'flagstone', 'short_grass_dry', 'gravel'];
const shots = [[30, 2, 0], [30, 4, 2], [24, 6, -2], [40, 1, 0]]; // mph, launch, hyzer
const res = {};
for (const s of surfs) { const out = [];
  for (const [mph, la, hz] of shots) {
    const r = P.simulate({ disc: { speed: 3, glide: 4, turn: 0, fade: 2 }, hand: 'RHBH', spin: 900, hyzer: hz, launchAngle: la, nose: la - 1, releaseHeight: 1.0 / F, armSpeed: mph, aim: 0, seed: 1, groundEffect: 0.25,
      contact: CT.create({ materials: MATS, solidMaterials: MATS.solids, solids: [], surfaceAt: () => s, noTombstone: true, seed: 7 }) });
    let first = null; for (const q of r.samples) if (q.z * F < 0.03) { first = q; break; }
    const L = r.samples[r.samples.length - 1];
    out.push(first ? (Math.hypot(L.x - first.x, L.y - first.y)).toFixed(0) : 'na');
  }
  console.log(s.padEnd(16), 'slide ft after landing:', out.join(' / '));
}
