const C = require('./src/course.js');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function inSolid(x, y, z, m, list) { for (const s of list) {
  if (s.kind === 'box') { let dx = x - s.x, dy = y - s.y; if (Math.abs(dx) < s.hx + m && Math.abs(dy) < s.hy + m && z > s.z0 - m && z < s.z1 + m) return s.name; }
  else if (s.kind === 'cyl') { if (z > s.z0 - m && z < s.z1 + m && Math.hypot(x - s.x, y - s.y) < s.r + m) return s.name; }
  else if (s.kind === 'blob') { const q = s.squash || 1, ez = (z - s.z) / q; if (Math.sqrt((x - s.x) ** 2 + (y - s.y) ** 2 + ez * ez) < s.r * 0.92 + m) return s.name; }
  else if (s.kind === 'capsule') { const ax = s.b.x - s.a.x, ay = s.b.y - s.a.y, az = s.b.z - s.a.z, l2 = ax * ax + ay * ay + az * az || 1; const k = clamp(((x - s.a.x) * ax + (y - s.a.y) * ay + (z - s.a.z) * az) / l2, 0, 1); if (Math.hypot(x - s.a.x - ax * k, y - s.a.y - ay * k, z - s.a.z - az * k) < s.r + m) return s.name; }
} return null; }
const R = JSON.parse(process.argv[2]);
R.forEach((route, h) => {
  const list = C.worldSolids(h).filter(s => s.tag !== 'Basket' && s.tag !== 'OtherBasket');
  const t = C.HOLES[h].tee, pts = [{ x: t.x, y: t.y - 1.3, z: 1.7 }].concat(route);
  const bad = new Set();
  for (let i = 0; i < pts.length - 1; i++) { const A = pts[i], B = pts[i + 1], n = 40; for (let j = 0; j <= n; j++) { const k = j / n, hit = inSolid(A.x + (B.x - A.x) * k, A.y + (B.y - A.y) * k, A.z + (B.z - A.z) * k, 0.3, list); if (hit) bad.add('seg' + i + ':' + hit); } }
  console.log('hole', h + 1, bad.size ? [...bad].join(', ') : 'clear');
});
