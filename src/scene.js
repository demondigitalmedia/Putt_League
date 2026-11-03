/* =====================================================================
   PUTT LEAGUE · BREWERY · 3D SCENE (three.js r128)
   Cel-shaded: toon materials with three light bands, ink outlines (inverted hull on smoothed
   normals), canvas-painted textures. Engine frame (x right, y downrange, z up, metres) maps to
   three.js as (x, z, -y). Built from the same numbers as course.js.
   ===================================================================== */
var VenueScene = (function () {
  'use strict';
  var T = THREE, C = Course;
  var INK = new T.Color(0x1d130c);
  function W(x, y, z) { return new T.Vector3(x, z, -y); }

  /* ---------- toon materials ---------- */
  var grad = (function () {
    var d = new Uint8Array([90, 90, 90, 170, 170, 170, 255, 255, 255]);
    var t = new T.DataTexture(d, 3, 1, T.RGBFormat); t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
  })();
  var matCache = {};
  function toon(color, o) {
    o = o || {};
    var key = color + '|' + (o.map ? o.map.uuid : '') + '|' + (o.emissive || '') + '|' + (o.side || '');
    if (matCache[key]) return matCache[key];
    var m = new T.MeshToonMaterial({ color: color, gradientMap: grad, map: o.map || null, emissive: o.emissive || 0x000000, side: o.side || T.FrontSide });
    matCache[key] = m; return m;
  }
  function glow(color) { return new T.MeshBasicMaterial({ color: color }); }
  var outlineMats = {};
  function outlineMat(thick) {
    var k = thick.toFixed(3); if (outlineMats[k]) return outlineMats[k];
    outlineMats[k] = new T.ShaderMaterial({
      uniforms: { c: { value: INK }, t: { value: thick } },
      vertexShader: 'attribute vec3 oNormal; uniform float t; void main(){ vec4 mv = modelViewMatrix * vec4(position + oNormal * t, 1.0); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 c; void main(){ gl_FragColor = vec4(c, 1.0); }',
      side: T.BackSide
    });
    return outlineMats[k];
  }
  // averaged normals per position, so the hull closes over hard edges (boxes get a solid ink line)
  function smoothNormals(g) {
    var p = g.attributes.position, n = g.attributes.normal, map = {}, out = new Float32Array(p.count * 3), i, k;
    for (i = 0; i < p.count; i++) {
      k = Math.round(p.getX(i) * 1000) + ',' + Math.round(p.getY(i) * 1000) + ',' + Math.round(p.getZ(i) * 1000);
      var a = map[k] || (map[k] = [0, 0, 0]); a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i);
    }
    for (i = 0; i < p.count; i++) {
      k = Math.round(p.getX(i) * 1000) + ',' + Math.round(p.getY(i) * 1000) + ',' + Math.round(p.getZ(i) * 1000);
      var v = map[k], l = Math.hypot(v[0], v[1], v[2]) || 1; out[i * 3] = v[0] / l; out[i * 3 + 1] = v[1] / l; out[i * 3 + 2] = v[2] / l;
    }
    g.setAttribute('oNormal', new T.BufferAttribute(out, 3));
  }
  function outline(mesh, thick) {
    if (!mesh.geometry.attributes.oNormal) smoothNormals(mesh.geometry);
    var o = new T.Mesh(mesh.geometry, outlineMat(thick == null ? 0.02 : thick));
    o.matrixAutoUpdate = false; mesh.add(o); o.updateMatrix();
    return mesh;
  }

  /* ---------- static geometry is merged per material: few draw calls on a phone ---------- */
  function Batch(parent) { this.parent = parent; this.groups = {}; }
  Batch.prototype.add = function (geom, mat, matrix, ink) {
    var key = mat.uuid + (ink ? '|' + ink : '');
    var g = geom.index ? geom.toNonIndexed() : geom.clone();
    if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(matrix);
    (this.groups[key] || (this.groups[key] = { mat: mat, ink: ink, list: [] })).list.push(g);
  };
  Batch.prototype.build = function () {
    var meshes = [];
    for (var key in this.groups) {
      var G = this.groups[key], n = 0, i;
      G.list.forEach(function (g) { n += g.attributes.position.count; });
      var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), o = 0;
      G.list.forEach(function (g) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; });
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
      var m = new T.Mesh(geo, G.mat); m.matrixAutoUpdate = false;
      if (G.ink) outline(m, G.ink);
      this.parent.add(m); meshes.push(m);
    }
    return meshes;
  };

  /* ---------- painted textures ---------- */
  function canvas(w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); draw(g, w, h);
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
  }
  function rnd(seed) { var s = seed || 1; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  var TEX = {};
  function makeTextures() {
    var r = rnd(7);
    TEX.brick = canvas(512, 512, function (g, w, h) {               // 1.92 m square: 8 bricks x 24 rows
      g.fillStyle = '#5c3a2c'; g.fillRect(0, 0, w, h);
      var bw = w / 8, bh = h / 24;
      for (var row = 0; row < 24; row++) for (var i = -1; i < 9; i++) {
        var x = i * bw + (row % 2 ? bw / 2 : 0), y = row * bh, v = r();
        g.fillStyle = v < 0.33 ? '#9c4a32' : v < 0.66 ? '#a9573a' : '#8a3f2b';
        g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
        g.fillStyle = 'rgba(255,220,180,0.12)'; g.fillRect(x + 3, y + 3, bw - 6, 3);
      }
      g.fillStyle = 'rgba(29,19,12,0.35)'; for (var k = 0; k < 9; k++) g.fillRect(0, k * bh * 3 - 1, w, 2);
    });
    TEX.planks = canvas(512, 512, function (g, w, h) {              // 1.2 m wide x 2.4 m long tile, planks run downrange
      var pw = w / 6;
      for (var i = 0; i < 6; i++) {
        var off = (i * 37 % 5) / 5 * h;
        for (var j = -1; j < 2; j++) {
          var y = off + j * h, v = r();
          g.fillStyle = v < 0.33 ? '#b0703d' : v < 0.66 ? '#a4652f' : '#bd7c48';
          g.fillRect(i * pw, y, pw, h);
          g.strokeStyle = 'rgba(80,40,15,0.25)'; g.lineWidth = 2;
          for (var s = 0; s < 3; s++) { var gx = i * pw + 8 + r() * (pw - 16); g.beginPath(); g.moveTo(gx, y + 10); g.bezierCurveTo(gx + 6, y + h * 0.3, gx - 6, y + h * 0.6, gx + 3, y + h - 10); g.stroke(); }
          g.fillStyle = '#3a2112'; g.fillRect(i * pw, y, pw, 3);
        }
        g.fillStyle = '#3a2112'; g.fillRect(i * pw, 0, 3, h);
      }
      g.fillStyle = 'rgba(255,240,210,0.10)'; g.fillRect(0, 0, w, h * 0.04);
    });
    TEX.ceiling = canvas(256, 256, function (g, w, h) { g.fillStyle = '#2a1d14'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d140d'; for (var i = 0; i < 8; i++) g.fillRect(0, i * h / 8, w, 3); });
    TEX.tile = canvas(256, 256, function (g, w, h) { var s = w / 8; for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#e8e0cc' : '#1f5c9a'; g.fillRect(i * s, j * s, s, s); } });
    TEX.stack = canvas(256, 256, function (g, w, h) { g.fillStyle = '#7b4a26'; g.fillRect(0, 0, w, h); for (var i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#8d5730' : '#6f4021'; g.fillRect(i * w / 12, 0, w / 12 - 2, h); } });
  }

  // a sign or poster painted on canvas, returned as a flat panel (plane) facing +normal
  function paintPanel(w, h, px, draw, emissive) {
    var tex = canvas(Math.round(px), Math.round(px * h / w), draw); tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    var m = emissive ? new T.MeshBasicMaterial({ map: tex, transparent: true }) : new T.MeshToonMaterial({ map: tex, gradientMap: grad, transparent: true });
    return new T.Mesh(new T.PlaneGeometry(w, h), m);
  }
  // a bank-board sign: small, lit (so it pops in any light), colored rim, text sized to fit so nothing clips
  function signBoard(text, w, h, rim, sub) {
    return paintPanel(w, h, 512, function (g, cw, ch) {
      var r = ch * 0.22; g.fillStyle = rim || '#ffc93c'; roundRect(g, 0, 0, cw, ch, r); g.fill();
      g.fillStyle = '#1d130c'; roundRect(g, ch * 0.07, ch * 0.07, cw - ch * 0.14, ch - ch * 0.14, r * 0.7); g.fill();
      var fs = ch * (sub ? 0.46 : 0.6), fam = '"Bangers", Impact, "Arial Black", sans-serif';
      g.font = '900 ' + fs + 'px ' + fam; var tw = g.measureText(text).width, maxW = cw * 0.86; if (tw > maxW) fs *= maxW / tw;
      label(g, text, cw / 2, sub ? ch * 0.4 : ch * 0.53, fs, '#ffc93c', { stroke: Math.max(3, fs * 0.12), glow: 'rgba(255,201,60,0.55)', glowBlur: fs * 0.35 });
      if (sub) { var f2 = ch * 0.2; g.font = '900 ' + f2 + 'px ' + fam; var t2 = g.measureText(sub).width; if (t2 > maxW) f2 *= maxW / t2; label(g, sub, cw / 2, ch * 0.76, f2, '#fff3df', {}); }
    }, true);
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function label(g, text, x, y, size, fill, opts) {
    opts = opts || {};
    g.font = (opts.weight || '900') + ' ' + size + 'px ' + (opts.font || '"Bangers", Impact, "Arial Black", sans-serif');
    g.textAlign = opts.align || 'center'; g.textBaseline = 'middle';
    if (opts.stroke) { g.lineWidth = opts.stroke; g.strokeStyle = opts.strokeColor || '#1d130c'; g.lineJoin = 'round'; g.strokeText(text, x, y); }
    if (opts.glow) { g.shadowColor = opts.glow; g.shadowBlur = opts.glowBlur || 18; }
    g.fillStyle = fill; g.fillText(text, x, y); g.shadowBlur = 0;
  }
  // place a panel flat on a wall: wall = 'L' (x0), 'R' (x1), 'B' (back y1), 'F' (front y0); u along the wall, z height
  function onWall(scene, mesh, wall, u, z, lift) {
    var R = C.ROOM, d = lift || 0.03;
    if (wall === 'L') { mesh.position.copy(W(R.x0 + d, u, z)); mesh.rotation.y = Math.PI / 2; }
    if (wall === 'R') { mesh.position.copy(W(R.x1 - d, u, z)); mesh.rotation.y = -Math.PI / 2; }
    if (wall === 'B') { mesh.position.copy(W(u, R.y1 - d, z)); }
    if (wall === 'F') { mesh.position.copy(W(u, R.y0 + d, z)); mesh.rotation.y = Math.PI; }
    scene.add(mesh); return mesh;
  }

  /* ---------- builders (engine frame in, three.js out) ---------- */
  /* ---------- extra paint for the garden ---------- */
  function gardenTextures() {
    var r = rnd(11);
    TEX.grass = canvas(256, 256, function (g, w, h) {
      g.fillStyle = '#4f8a3a'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 900; i++) { var x = r() * w, y = r() * h; g.strokeStyle = r() < 0.5 ? '#5d9c44' : '#3f7430'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 6 - r() * 5); g.stroke(); }
    });
    TEX.pavers = canvas(256, 256, function (g, w, h) {
      g.fillStyle = '#4a4038'; g.fillRect(0, 0, w, h); var s = w / 4;
      for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { var v = r(); g.fillStyle = v < 0.33 ? '#9b8f80' : v < 0.66 ? '#a89a88' : '#8d8274'; g.fillRect(i * s + 3 + (j % 2 ? s / 2 : 0) % s, j * s + 3, s - 6, s - 6); }
    });
    TEX.gravel = canvas(256, 256, function (g, w, h) { g.fillStyle = '#9b8f7c'; g.fillRect(0, 0, w, h); for (var i = 0; i < 1400; i++) { g.fillStyle = ['#b9ad98', '#7d7262', '#c9bfae', '#6b6153'][i % 4]; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 2.2, 0, 7); g.fill(); } });
    TEX.fence = canvas(256, 128, function (g, w, h) { var pw = w / 8; for (var i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#8a5a33' : '#7a4d2a'; g.fillRect(i * pw, 0, pw, h); g.fillStyle = '#3a2112'; g.fillRect(i * pw, 0, 3, h); } g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, h * 0.2, w, 6); g.fillRect(0, h * 0.75, w, 6); });
  }

  /* ---------- builders (engine frame in, three.js out) ---------- */
  function cylGeom(r, h, seg, r2) { var g = new T.CylinderGeometry(r2 == null ? r : r2, r, h, seg || 24); g.translate(0, h / 2, 0); return g; }
  function latheGeom(prof, seg) { return new T.LatheGeometry(prof.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg || 40); }
  function mBox(cx, cy, z0, sx, sy, sz, ry) {
    var m = new T.Matrix4().makeTranslation(cx, z0 + sz / 2, -cy);
    if (ry) m.multiply(new T.Matrix4().makeRotationY(ry));
    return m.multiply(new T.Matrix4().makeScale(sx, sz, sy));
  }
  function at(x, y, z) { return new T.Matrix4().makeTranslation(x, z || 0, -y); }
  var GBOX = new T.BoxGeometry(1, 1, 1);
  function plane(w, h, tex, rep, color) {
    var t = tex.clone(); t.needsUpdate = true; t.repeat.set(rep[0], rep[1]);
    return new T.Mesh(new T.PlaneGeometry(w, h), toon(color || 0xffffff, { map: t }));
  }

  /* ---------- a basket, with chains that the engine can drive ---------- */
  function makeBasket(scene, hx, hy) {
    var S = FlightlineBasket.SPEC, chainMat = toon(0xd5dbe0), dark = toon(0x2b1b12);
    var basket = new T.Group(); basket.position.copy(W(hx, hy, 0)); scene.add(basket);
    function part(geom, mat, z, ink) { var m = new T.Mesh(geom, mat); m.position.y = z; if (ink) outline(m, ink); basket.add(m); return m; }
    part(cylGeom(S.poleR, S.poleTop, 12), chainMat, 0, 0.01);
    part(cylGeom(0.25, 0.03, 28), dark, 0, 0.01);
    part(latheGeom([[0.04, 0], [S.trayR - 0.06, 0], [S.trayR, S.trayDepth], [S.trayR + 0.01, S.trayDepth + 0.01]], 36), toon(0xbfc7cc, { side: T.DoubleSide }), S.trayBottomZ, 0.012);
    part(new T.CylinderGeometry(S.bandR, S.bandR, S.bandH, 36, 1, true), new T.MeshToonMaterial({ color: 0xF2A13B, gradientMap: grad, side: T.DoubleSide }), S.bandBottomZ + S.bandH / 2, 0.012);
    part(new T.CylinderGeometry(0.06, S.bandR, S.lidRise, 24), toon(0xF2A13B), S.bandTopZ + S.lidRise / 2, 0.01);
    for (var cg = 0; cg < 14; cg++) { var a = cg / 14 * Math.PI * 2, rod = new T.Mesh(cylGeom(0.006, S.trayDepth, 4), chainMat); rod.position.set(Math.cos(a) * (S.trayR - 0.01), S.trayBottomZ, Math.sin(a) * (S.trayR - 0.01)); basket.add(rod); }
    var defs = FlightlineBasket.strandDefs(S), P = S.segments + 1, nStr = defs.length;
    var cpos = new Float32Array(nStr * S.segments * 2 * 3), cgeo = new T.BufferGeometry(); cgeo.setAttribute('position', new T.BufferAttribute(cpos, 3));
    var ch = new T.LineSegments(cgeo, new T.LineBasicMaterial({ color: 0xe9eef2 })); ch.frustumCulled = false; basket.add(ch);
    var chi = new T.LineSegments(cgeo, new T.LineBasicMaterial({ color: 0x1d130c, transparent: true, opacity: 0.55 })); chi.frustumCulled = false; chi.position.set(0.004, -0.004, 0); basket.add(chi);
    // a glow ring that lights up when this is the hole being played
    var halo = new T.Mesh(new T.RingGeometry(0.42, 0.52, 40), new T.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.0, side: T.DoubleSide, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.012; basket.add(halo);
    function set(x) {
      var o = 0;
      for (var s = 0; s < nStr; s++) for (var k = 0; k < S.segments; k++) { var a = (s * P + k) * 3, b = a + 3; cpos[o++] = x[a]; cpos[o++] = x[a + 2]; cpos[o++] = -x[a + 1]; cpos[o++] = x[b]; cpos[o++] = x[b + 2]; cpos[o++] = -x[b + 1]; }
      cgeo.attributes.position.needsUpdate = true;
    }
    set(REST);
    return { group: basket, setChains: set, halo: halo };
  }
  var REST = null;

  /* ---------- the whole venue ---------- */
  function build() {
    makeTextures(); gardenTextures();
    REST = FlightlineBasket.restPose();
    var scene = new T.Scene(), R = C.ROOM, G = C.GARDEN, D = C.DOOR;
    scene.background = new T.Color(0x1b1430);
    scene.fog = new T.Fog(0x2a1d2c, 30, 95);
    var stat = new Batch(scene), ceilB = new Batch(new T.Group());
    var ceiling = ceilB.parent; scene.add(ceiling);
    var out = { scene: scene, ceiling: ceiling, anim: [], bulbs: [], baskets: [], icons: {} };

    // sky dome: dusk
    var skyTex = canvas(64, 512, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0f1440'); gr.addColorStop(0.35, '#3b2c6e'); gr.addColorStop(0.55, '#a5486e'); gr.addColorStop(0.68, '#f08a4b'); gr.addColorStop(0.75, '#ffc46b'); gr.addColorStop(1, '#ffc46b'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    var sky = new T.Mesh(new T.SphereGeometry(140, 24, 16), new T.MeshBasicMaterial({ map: skyTex, side: T.BackSide, fog: false })); sky.position.copy(W(0, 40, 0)); scene.add(sky);
    var ground = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshBasicMaterial({ color: 0x1d2a18 })); ground.rotation.x = -Math.PI / 2; ground.position.copy(W(0, 40, -0.05)); scene.add(ground);

    // ---- inside: floor, walls, ceiling
    var fw = R.x1 - R.x0, fl = R.y1 - R.y0;
    var floor = plane(fw, fl, TEX.planks, [fw / 1.2, fl / 2.4]); floor.rotation.x = -Math.PI / 2; floor.position.copy(W((R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, 0)); scene.add(floor);
    out.grounds = [floor];
    function wallPlane(x0, x1, z0, z1, place) { var w = x1 - x0, h = z1 - z0, m = plane(w, h, TEX.brick, [w / 1.92, h / 1.92]); place(m, (x0 + x1) / 2, (z0 + z1) / 2); scene.add(m); return m; }
    wallPlane(R.y0, R.y1, 0, R.h, function (m, u, z) { m.rotation.y = Math.PI / 2; m.position.copy(W(R.x0, u, z)); });
    wallPlane(R.y0, R.y1, 0, R.h, function (m, u, z) { m.rotation.y = -Math.PI / 2; m.position.copy(W(R.x1, u, z)); });
    wallPlane(R.x0, R.x1, 0, R.h, function (m, u, z) { m.rotation.y = Math.PI; m.position.copy(W(u, R.y0, z)); });
    // back wall, inside face (with the door) and garden face (wider: the building plus the neighbours)
    [[R.x0, D.x0, 0, R.h], [D.x1, R.x1, 0, R.h], [D.x0, D.x1, D.h, R.h]].forEach(function (s) { wallPlane(s[0], s[1], s[2], s[3], function (m, u, z) { m.position.copy(W(u, R.y1, z)); }); });
    [[G.x0, D.x0, 0, R.h + 1.2], [D.x1, G.x1, 0, R.h + 1.2], [D.x0, D.x1, D.h, R.h + 1.2]].forEach(function (s) { wallPlane(s[0], s[1], s[2], s[3], function (m, u, z) { m.rotation.y = Math.PI; m.position.copy(W(u, R.y1 + 0.3, z)); }); });
    stat.add(GBOX, toon(0x3a2418), mBox((G.x0 + G.x1) / 2, R.y1 + 0.15, R.h + 1.2, G.x1 - G.x0 + 0.4, 0.5, 0.35), 0.02);
    var ceil = plane(fw, fl, TEX.ceiling, [fw / 2, fl / 2]); ceil.rotation.x = Math.PI / 2; ceil.position.copy(W((R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, R.h)); ceiling.add(ceil);
    // roof over the building, seen from the garden
    var roof = new T.Mesh(new T.BoxGeometry(fw + 0.6, 0.3, fl + 0.3), toon(0x2b1b12)); roof.position.copy(W((R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, R.h + 0.45)); scene.add(roof); out.roof = roof;
    // the roll-up door, rolled up
    var coil = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, D.x1 - D.x0 + 0.2, 20), toon(0x9aa3aa)); coil.rotation.z = Math.PI / 2; coil.position.copy(W((D.x0 + D.x1) / 2, R.y1 - 0.35, D.h + 0.3)); outline(coil, 0.015); scene.add(coil);
    [D.x0, D.x1].forEach(function (x) { stat.add(GBOX, toon(0x2b1b12), mBox(x, R.y1, 0, 0.16, 0.5, D.h), 0.015); });

    // ---- posts, beams, duct
    var timber = toon(0x6e4426), dark = toon(0x2b1b12), steel = toon(0x9aa3aa), copper = toon(0xc8692c), brass = toon(0xd9a441);
    C.POSTS_X.forEach(function (x) { C.POSTS_Y.forEach(function (y) { stat.add(GBOX, timber, mBox(x, y, 0, 0.32, 0.32, R.h), 0.02); }); });
    C.POSTS_X.forEach(function (x) { ceilB.add(GBOX, timber, mBox(x, (R.y0 + R.y1) / 2, R.h - 0.45, 0.34, fl, 0.45), 0.02); });
    C.POSTS_Y.forEach(function (y) { ceilB.add(GBOX, timber, mBox((R.x0 + R.x1) / 2, y, R.h - 0.75, fw, 0.3, 0.4), 0.02); });
    var duct = new T.Mesh(new T.CylinderGeometry(0.38, 0.38, fl, 28, 1, true), toon(0xb8c0c6)); duct.rotation.x = Math.PI / 2; duct.position.copy(W(-1.0, (R.y0 + R.y1) / 2, 4.9)); outline(duct, 0.02); ceiling.add(duct);

    // ---- brewhouse
    C.KETTLES.forEach(function (k, i) {
      var base = 0.75, R2 = k.r, Hk = k.h;
      var m = new T.Mesh(latheGeom([[0.001, base - 0.25], [0.15, base - 0.22], [R2 * 0.85, base + 0.05], [R2, base + 0.25], [R2, base + Hk], [R2 * 0.92, base + Hk + 0.25], [R2 * 0.7, base + Hk + 0.45], [R2 * 0.35, base + Hk + 0.6], [0.18, base + Hk + 0.64], [0.001, base + Hk + 0.65]], 40), copper);
      m.position.copy(W(k.x, k.y, 0)); outline(m, 0.025); scene.add(m);
      var st = new T.Mesh(cylGeom(0.16, R.h - (base + Hk + 0.5), 16), copper); st.position.copy(W(k.x, k.y, base + Hk + 0.5)); outline(st, 0.02); scene.add(st);
      [[0.8, 0.8], [-0.8, 0.8], [0.8, -0.8], [-0.8, -0.8]].forEach(function (o) { stat.add(GBOX, dark, mBox(k.x + o[0] * R2 * 0.7, k.y + o[1] * R2 * 0.7, 0, 0.09, 0.09, base + 0.3), 0.012); });
      var man = new T.Mesh(cylGeom(0.27, 0.12, 24), brass); man.rotation.z = Math.PI / 2; man.position.copy(W(k.x - R2 - 0.02, k.y, base + Hk * 0.45)); outline(man, 0.015); scene.add(man);
      [0.28, Hk - 0.05].forEach(function (z) { var bnd = new T.Mesh(new T.TorusGeometry(R2 + 0.01, 0.025, 6, 40), brass); bnd.rotation.x = Math.PI / 2; bnd.position.copy(W(k.x, k.y, base + z)); scene.add(bnd); });
    });
    C.FERMENTERS.forEach(function (f) {
      var m = new T.Mesh(latheGeom([[0.001, 0.55], [f.r * 0.6, 0.85], [f.r, 1.2], [f.r, 1.2 + f.h], [f.r * 0.6, 1.5 + f.h], [0.001, 1.55 + f.h]], 36), toon(0xc9d1d6)); m.position.copy(W(f.x, f.y, 0)); outline(m, 0.025); scene.add(m);
      [0, 2.1, 4.2].forEach(function (a) { stat.add(cylGeom(0.045, 1.3, 8), steel, at(f.x + Math.cos(a) * f.r * 0.9, f.y + Math.sin(a) * f.r * 0.9, 0), 0.01); });
    });

    // ---- bar
    var B = C.BAR, tileTex = TEX.tile.clone(); tileTex.needsUpdate = true; tileTex.repeat.set((B.y1 - B.y0), 1);
    var barFront = new T.Mesh(new T.BoxGeometry(B.x1 - B.x0, B.h, B.y1 - B.y0), toon(0xffffff, { map: tileTex })); barFront.position.copy(W((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, B.h / 2)); outline(barFront, 0.02); scene.add(barFront);
    stat.add(GBOX, toon(0x8a4b22), mBox((B.x0 + B.x1) / 2 + 0.08, (B.y0 + B.y1) / 2, B.h, B.x1 - B.x0 + 0.3, B.y1 - B.y0 + 0.2, 0.08), 0.015);
    stat.add(GBOX, timber, mBox(R.x0 + 0.3, (B.y0 + B.y1) / 2, 0, 0.6, B.y1 - B.y0, 1.0), 0.015);
    [2.2, 2.75].forEach(function (z) { stat.add(GBOX, timber, mBox(R.x0 + 0.15, (B.y0 + B.y1) / 2, z, 0.3, B.y1 - B.y0 - 2, 0.04), 0.01); });
    var bottleCols = [0x2f6b3a, 0xa35b2a, 0xd9c27a, 0x7c2f2a, 0x2c5f8a];
    for (var bi = 0; bi < 44; bi++) stat.add(cylGeom(0.045, 0.24 + (bi * 7 % 5) * 0.03, 10, 0.03), toon(bottleCols[bi % 5]), at(R.x0 + 0.15, B.y0 + 1.2 + bi * 0.31, bi % 2 ? 2.24 : 2.79), 0.008);
    var tapCols = [0xF2A13B, 0x1f5c9a, 0xd9c27a, 0x7c2f2a, 0x2f6b3a, 0xe8e0cc];
    for (var tk = 0; tk < 24; tk++) stat.add(cylGeom(0.024, 0.24, 8, 0.032), toon(tapCols[tk % 6]), at(R.x0 + 0.26, 6.2 + tk * 0.38, 1.55), 0.008);
    for (var sk = 0; sk < 14; sk++) { var sy = B.y0 + 0.7 + sk * 1.12; stat.add(cylGeom(0.025, 0.74, 8), dark, at(B.x1 + 0.55, sy, 0), 0.008); stat.add(cylGeom(0.2, 0.06, 18), toon(0x9c2f22), at(B.x1 + 0.55, sy, 0.72), 0.012); }
    [4.6, 6.9, 8.2, 11.7, 13.9, 16.4, 18.6].forEach(function (y, i) { stat.add(cylGeom(0.04, 0.16, 12, 0.048), toon(i % 2 ? 0x3a1f12 : 0xF2A13B), at(B.x1 - 0.15, y, B.h + 0.04), 0.008); });
    [7.4, 10.6, 13.8].forEach(function (y, si) {
      var scr = paintPanel(2.4, 1.3, 512, function (g, w, h) {
        g.fillStyle = '#0f1a2b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1d130c'; g.lineWidth = 16; g.strokeRect(0, 0, w, h);
        var t = [['PUTT LEAGUE NIGHT', [['2 PUTTS A HOLE', ''], ['PITCH IT: PAR 2 & 3', ''], ['RING THE GONG', 'JACKPOT'], ['SKIP IT IN', '+2000']]],
          ['ON TAP', [['HAZY IPA', '6.5'], ['CHAIN SMOKER PORTER', '7.1'], ['ACE PILSNER', '4.8'], ['SKIP IT SOUR', '5.2']]],
          ['HIGH SCORES', [['THE GONG GOBLIN', '48,200'], ['DOWNTOWN DAVE', '41,950'], ['SKIP CITY', '39,100'], ['YOU?', '???']]]][si];
        label(g, t[0], w / 2, h * 0.17, 42, '#ffc93c', { glow: '#ffc93c', glowBlur: 10 });
        t[1].forEach(function (n, k) { label(g, n[0], 34, h * (0.36 + k * 0.17), 30, '#fff3df', { align: 'left', font: '"Barlow Condensed", "Arial Narrow", sans-serif', weight: '700' }); label(g, n[1], w - 34, h * (0.36 + k * 0.17), 30, '#5aa5f2', { align: 'right', font: '"Barlow Condensed", "Arial Narrow", sans-serif', weight: '700' }); });
      }, true);
      onWall(scene, scr, 'L', y, 3.3);
    });

    // ---- taproom tables, barrels, kegs
    C.TABLES.forEach(function (t) {
      stat.add(GBOX, toon(0xa7683a), mBox(t.x, t.y, 0.73, t.hx * 2, t.hy * 2, 0.06), 0.015);
      [[-0.35, -0.75], [0.35, -0.75], [-0.35, 0.75], [0.35, 0.75]].forEach(function (o) { stat.add(GBOX, dark, mBox(t.x + o[0], t.y + o[1], 0, 0.06, 0.06, 0.73), 0.01); });
      [-1, 1].forEach(function (side) { [-0.45, 0.45].forEach(function (dyy) { var cx = t.x + side * 0.75, cy = t.y + dyy; stat.add(GBOX, toon(0x2b5d6e), mBox(cx, cy, 0.44, 0.42, 0.42, 0.05), 0.01); stat.add(GBOX, toon(0x2b5d6e), mBox(cx + side * 0.2, cy, 0.49, 0.04, 0.42, 0.5), 0.01); stat.add(GBOX, dark, mBox(cx, cy, 0, 0.36, 0.36, 0.44), 0.008); }); });
      stat.add(cylGeom(0.04, 0.16, 12, 0.048), toon(0xF2A13B), at(t.x + 0.1, t.y - 0.3, 0.79), 0.008);
    });
    var bgeo = latheGeom([[0.001, -0.45], [0.27, -0.45], [0.3, -0.3], [0.325, 0], [0.3, 0.3], [0.27, 0.45], [0.001, 0.45]], 28), bmat = toon(0xffffff, { map: TEX.stack });
    C.STACK_BARRELS.forEach(function (b) {
      var m = new T.Mesh(bgeo, bmat); m.position.copy(W(b.x, b.y, b.z)); m.rotation.set(Math.PI / 2, 0, 0); outline(m, 0.02); scene.add(m);
      [-0.36, 0.36].forEach(function (o) { var hp = new T.Mesh(new T.TorusGeometry(0.31, 0.014, 6, 24), dark); hp.position.copy(W(b.x, b.y + o, b.z)); scene.add(hp); });
      var end = new T.Mesh(new T.CircleGeometry(0.27, 24), toon(0x9b6234)); end.position.copy(W(b.x, b.y - 0.455, b.z)); scene.add(end);
    });
    stat.add(GBOX, timber, mBox(C.STACK.x, C.STACK.y - 0.3, 0, 2.2, 0.12, 0.1), 0.01); stat.add(GBOX, timber, mBox(C.STACK.x, C.STACK.y + 0.3, 0, 2.2, 0.12, 0.1), 0.01);
    C.UPRIGHT_BARRELS.forEach(function (b) { var m = new T.Mesh(bgeo, bmat); m.position.copy(W(b.x, b.y, 0.45)); outline(m, 0.02); scene.add(m); });
    var kegMat = toon(0xc9d1d6);
    C.KEGS.forEach(function (k) { var m = new T.Mesh(latheGeom([[0.001, 0], [0.2, 0], [0.21, 0.04], [0.21, 0.56], [0.2, 0.6], [0.001, 0.6]], 20), kegMat); m.position.copy(W(k.x, k.y, k.z0)); outline(m, 0.012); scene.add(m); var band = new T.Mesh(new T.TorusGeometry(0.212, 0.012, 6, 20), toon(0x1f5c9a)); band.rotation.x = Math.PI / 2; band.position.copy(W(k.x, k.y, k.z0 + 0.3)); scene.add(band); });

    // ---- baskets and their bank boards
    C.HOLES.forEach(function (h, i) {
      out.baskets.push(makeBasket(scene, h.basket.x, h.basket.y));
      var b = h.backstop;
      if (b.kind === 'gong') {
        var gong = new T.Mesh(new T.CylinderGeometry(b.r, b.r, b.t * 2, 40), toon(0x9a4f1e)); gong.rotation.x = Math.PI / 2; gong.position.copy(W(b.x, b.y, b.z)); outline(gong, 0.025); scene.add(gong);
        var face = paintPanel(b.r * 2, b.r * 2, 256, function (g, w) { g.fillStyle = '#b8642a'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 2, 0, 7); g.fill(); g.strokeStyle = 'rgba(60,25,5,0.55)'; g.lineWidth = 5; for (var k = 1; k < 5; k++) { g.beginPath(); g.arc(w / 2, w / 2, k * w / 10, 0, 7); g.stroke(); } g.fillStyle = '#d98a3a'; g.beginPath(); g.arc(w / 2, w / 2, w * 0.13, 0, 7); g.fill(); g.fillStyle = 'rgba(255,230,180,0.45)'; g.beginPath(); g.ellipse(w * 0.34, w * 0.3, w * 0.12, w * 0.05, -0.5, 0, 7); g.fill(); label(g, 'DONG', w / 2, w * 0.78, 40, '#3a1a05', {}); });
        face.position.copy(W(b.x, b.y - b.t - 0.005, b.z)); scene.add(face);
        [-1, 1].forEach(function (s) { stat.add(GBOX, dark, mBox(b.x + s * (b.r + 0.12), b.y + 0.05, 0, 0.1, 0.1, b.z + b.r + 0.3), 0.012); });
        stat.add(GBOX, dark, mBox(b.x, b.y + 0.05, b.z + b.r + 0.25, b.r * 2 + 0.34, 0.1, 0.1), 0.012);
        out.gong = gong; out.gongFace = face;
      } else if (b.kind === 'kegs') {
        for (var row = 0; row < 3; row++) for (var c2 = 0; c2 < 4 - (row === 2 ? 1 : 0); c2++) {
          var kx = b.x - b.hx + 0.24 + c2 * 0.47 + (row === 2 ? 0.23 : 0), m2 = new T.Mesh(cylGeom(0.21, 0.6, 18), kegMat);
          m2.position.copy(W(kx, b.y, row * 0.62)); outline(m2, 0.012); scene.add(m2);
        }
      } else if (b.kind === 'crates') {
        for (var cr = 0; cr < 4; cr++) { var col = [0xc0392b, 0x2E9C9A, 0xF2A13B, 0x3B86D9][cr]; stat.add(GBOX, toon(col), mBox(b.x + (cr % 2 ? 0.45 : -0.45), b.y, Math.floor(cr / 2) * 0.9, 0.86, b.hy * 2, 0.86), 0.02); }
        var sign = signBoard('CRATE BANK', 1.15, 0.34); sign.position.copy(W(b.x, b.y - b.hy - 0.02, b.h + 0.3)); scene.add(sign);
      } else if (b.kind === 'sacks') {
        // grain sacks: a stacked pyramid of fat burlap bags
        var sackM = toon(0xd9c08a);
        [[-0.55, 0, 0], [0, 0, 0], [0.55, 0, 0], [-0.28, 0, 0.5], [0.28, 0, 0.5], [0, 0, 1.0]].forEach(function (q) { var sk = new T.Mesh(new T.SphereGeometry(0.34, 12, 8), sackM); sk.scale.set(1.0, 0.75, 1.25); sk.position.copy(W(b.x + q[0], b.y, 0.26 + q[2])); outline(sk, 0.015); scene.add(sk); });
        var sgn = signBoard('SACK BANK', 1.1, 0.32); sgn.position.copy(W(b.x, b.y - b.hy - 0.05, b.h + 0.2)); scene.add(sgn);
      } else if (b.kind === 'pallets') {
        var palM = toon(0xb98a52), palD = toon(0x7a5530);
        for (var pr = 0; pr < 9; pr++) { stat.add(GBOX, pr % 3 === 2 ? palD : palM, mBox(b.x, b.y, pr * 0.19, b.hx * 2, b.hy * 2, 0.15), 0.012); }
        var sgp = signBoard('PALLET BANK', 1.2, 0.32); sgp.rotation.y = Math.PI / 2; sgp.position.copy(W(b.x + b.hx + 0.05, b.y, b.h + 0.2)); scene.add(sgp);
      }
      // the Putt tee mats and the Pitch tee pad
      [['short', 'SHORT', 0x2f6b3a], ['long', 'LONG', 0x2f6b3a], ['tee', 'TEE ' + h.n, 0xa8402a]].forEach(function (t) {
        var spot = h[t[0]], bearing = Math.atan2(h.basket.x - spot.x, h.basket.y - spot.y);
        var mat = paintPanel(t[0] === 'tee' ? 1.4 : 1.1, t[0] === 'tee' ? 2.0 : 1.5, 256, function (g, w, hh) { g.fillStyle = '#' + t[2].toString(16).padStart(6, '0'); g.fillRect(0, 0, w, hh); g.strokeStyle = '#fff3df'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, hh - 16); label(g, t[1], w / 2, hh * 0.82, t[0] === 'tee' ? 40 : 50, '#fff3df', {}); });
        mat.rotation.x = -Math.PI / 2; mat.rotation.z = -bearing; mat.position.copy(W(spot.x - Math.sin(bearing) * 0.3, spot.y - Math.cos(bearing) * 0.3, 0.01)); scene.add(mat);
      });
    });

    // ---- lights inside: string lights and pendants
    var bulbMat = glow(0xffc46b); out.bulbMat = bulbMat;
    function cat(p0, p1, sag, n) { var pts = []; for (var i = 0; i <= n; i++) { var t = i / n; pts.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, p0[2] + (p1[2] - p0[2]) * t - sag * 4 * t * (1 - t)]); } return pts; }
    function stringLights(parent, strands, r) {
      var count = 0; strands.forEach(function (s) { count += s.length - 2; });
      var bulbs = new T.InstancedMesh(new T.SphereGeometry(r || 0.045, 8, 6), bulbMat, count), mm = new T.Matrix4(), k = 0, wire = [];
      strands.forEach(function (s) { for (var i = 0; i < s.length; i++) { if (i > 0) wire.push(W(s[i - 1][0], s[i - 1][1], s[i - 1][2]), W(s[i][0], s[i][1], s[i][2])); if (i > 0 && i < s.length - 1) { mm.makeTranslation(s[i][0], s[i][2] - 0.07, -s[i][1]); bulbs.setMatrixAt(k++, mm); } } });
      parent.add(bulbs); parent.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(wire), new T.LineBasicMaterial({ color: 0x1d130c })));
    }
    var inS = [];
    C.POSTS_X.forEach(function (x) { for (var i = 0; i < C.POSTS_Y.length - 1; i++) inS.push(cat([x, C.POSTS_Y[i], R.h - 0.5], [x, C.POSTS_Y[i + 1], R.h - 0.5], 0.7, 10)); });
    C.POSTS_Y.forEach(function (y) { inS.push(cat([R.x0 + 0.2, y, R.h - 0.8], [-2.8, y, R.h - 0.75], 0.45, 9)); inS.push(cat([-2.8, y, R.h - 0.75], [3.0, y, R.h - 0.75], 0.9, 12)); inS.push(cat([3.0, y, R.h - 0.75], [R.x1 - 0.2, y, R.h - 0.8], 0.45, 7)); });
    for (var zi = 0; zi < C.POSTS_Y.length - 1; zi++) inS.push(cat([-2.8, C.POSTS_Y[zi], R.h - 0.75], [3.0, C.POSTS_Y[zi + 1], R.h - 0.75], 1.1, 14));
    stringLights(ceiling, inS);
    for (var pk = 0; pk < 12; pk++) { var py = B.y0 + 0.8 + pk * 1.35; ceiling.add(new T.Line(new T.BufferGeometry().setFromPoints([W(B.x1 + 0.05, py, R.h), W(B.x1 + 0.05, py, 3.0)]), new T.LineBasicMaterial({ color: 0x1d130c }))); var pb = new T.Mesh(new T.SphereGeometry(0.07, 10, 8), bulbMat); pb.scale.y = 1.35; pb.position.copy(W(B.x1 + 0.05, py, 2.92)); scene.add(pb); }
    var ringL = new T.Mesh(new T.TorusGeometry(1.3, 0.04, 8, 64), glow(0xffe2a8)); ringL.rotation.x = Math.PI / 2; ringL.position.copy(W(-5.2, 27, 4.4)); ceiling.add(ringL);

    // ---- WALL DECOR inside
    decorateInside(scene, stat, out);
    // ---- THE BEER GARDEN
    buildGarden(scene, stat, out, stringLights, cat);
    buildBackLot(scene, stat, out, stringLights, cat);

    // ---- lighting
    scene.add(new T.AmbientLight(0xffe0c0, 0.36));
    scene.add(new T.HemisphereLight(0xffd7a0, 0x3a2414, 0.3));
    var key = new T.DirectionalLight(0xffe2b8, 0.45); key.position.set(-4, 9, 6); scene.add(key);
    var moon = new T.DirectionalLight(0x9fa8ff, 0.35); moon.position.set(10, 20, -80); scene.add(moon);
    [[-6, 5], [-6, 17], [1, 4], [1, 16], [1, 28], [-5, 34]].forEach(function (p) { var l = new T.PointLight(0xffb46b, 0.45, 9, 2); l.position.copy(W(p[0], p[1], 4.6)); scene.add(l); });
    C.HOLES.forEach(function (h) { var l = new T.PointLight(0xffc98a, 0.9, 8, 1.6); l.position.copy(W(h.basket.x - 0.8, h.basket.y - 1.8, 3.4)); scene.add(l); });
    [[-10, 50], [8, 50], [-8, 68], [6, 72]].forEach(function (p) { var l = new T.PointLight(0xffc46b, 0.7, 16, 1.6); l.position.copy(W(p[0], p[1], 4.0)); scene.add(l); });

    stat.build(); ceilB.build();
    return out;
  }

  /* ---------- decor inside ---------- */
  function decorateInside(scene, stat, out) {
    var R = C.ROOM;
    var neon = paintPanel(4.2, 1.3, 1024, function (g, w, h) { g.clearRect(0, 0, w, h); label(g, 'PUTT LEAGUE', w / 2, h * 0.42, 150, '#ff5fa2', { glow: '#ff3e7f', glowBlur: 40, stroke: 6, strokeColor: '#ffd1e4' }); label(g, 'TAPROOM', w / 2, h * 0.82, 70, '#62f2ff', { glow: '#3be3ff', glowBlur: 30 }); }, true);
    onWall(scene, neon, 'L', 1.6, 4.6); out.anim.push({ kind: 'neon', mesh: neon }); out.neon = neon;
    var neon2 = paintPanel(3.4, 1.1, 1024, function (g, w, h) { g.clearRect(0, 0, w, h); label(g, 'CHAAING!', w / 2, h * 0.52, 190, '#ffe066', { glow: '#ffc93c', glowBlur: 40, stroke: 6, strokeColor: '#fff6c2' }); }, true);
    onWall(scene, neon2, 'R', 22.4, 4.8); out.anim.push({ kind: 'neon', mesh: neon2 });
    var discCols = ['#F2A13B', '#E0482F', '#3B86D9', '#2E9C9A', '#ffc93c', '#9b5de5', '#f15bb5', '#00bbf9', '#9ef01a', '#fff3df', '#ff6b35', '#4361ee'];
    var discWall = paintPanel(3.2, 1.6, 1024, function (g, w, h) {
      g.clearRect(0, 0, w, h);
      for (var r = 0; r < 3; r++) for (var c = 0; c < 6; c++) { var x = w * (c + 0.5) / 6 + (r % 2 ? w / 24 : 0), y = h * (r + 0.5) / 3, rad = h / 7.5, col = discCols[(r * 6 + c) % discCols.length];
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + 8, y + 8, rad, rad, 0, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); g.lineWidth = 7; g.strokeStyle = '#1d130c'; g.stroke(); g.strokeStyle = 'rgba(29,19,12,0.35)'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, rad * 0.72, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(x - rad * 0.3, y - rad * 0.4, rad * 0.32, rad * 0.12, -0.5, 0, 7); g.fill(); }
    });
    onWall(scene, discWall, 'L', 23.2, 2.9);
    var dart = paintPanel(0.75, 0.75, 256, function (g, w) { var cx = w / 2; for (var k = 0; k < 20; k++) { g.fillStyle = k % 2 ? '#1d130c' : '#f4ead2'; g.beginPath(); g.moveTo(cx, cx); g.arc(cx, cx, w / 2 - 6, k / 20 * 7 - 0.16, (k + 1) / 20 * 7 - 0.16); g.fill(); } g.lineWidth = 10; g.strokeStyle = '#c0392b'; g.beginPath(); g.arc(cx, cx, w * 0.3, 0, 7); g.stroke(); g.strokeStyle = '#2e9c9a'; g.beginPath(); g.arc(cx, cx, w * 0.44, 0, 7); g.stroke(); g.fillStyle = '#c0392b'; g.beginPath(); g.arc(cx, cx, 12, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = '#1d130c'; g.beginPath(); g.arc(cx, cx, w / 2 - 4, 0, 7); g.stroke(); });
    onWall(scene, dart, 'L', 26.6, 1.8);
    [['HOPS & CHAINS', 'FRIDAY PUTT NIGHT', '#E0482F', '#ffc93c'], ['ACE RACE', 'WIN A KEG', '#3B86D9', '#fff3df'], ['NO', 'TOMBSTONES', '#2E9C9A', '#fff3df'], ['GONG SHOW', 'EVERY TUESDAY', '#9b5de5', '#ffc93c']].forEach(function (p, i) {
      var pm = paintPanel(0.9, 1.25, 256, function (g, w, h) { g.fillStyle = '#1d130c'; g.fillRect(0, 0, w, h); g.fillStyle = p[2]; g.fillRect(12, 12, w - 24, h - 24); g.fillStyle = 'rgba(255,255,255,0.12)'; for (var k = 0; k < 8; k++) { g.beginPath(); g.moveTo(w / 2, h * 0.55); g.arc(w / 2, h * 0.55, w, k * 0.8, k * 0.8 + 0.35); g.fill(); } label(g, p[0], w / 2, h * 0.24, 38, p[3], { stroke: 6 }); label(g, p[1], w / 2, h * 0.84, 24, '#fff3df', { stroke: 5 }); g.fillStyle = '#fff3df'; g.beginPath(); g.arc(w / 2, h * 0.55, w * 0.18, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#1d130c'; g.stroke(); });
      onWall(scene, pm, 'L', 29.4 + i * 1.15, 2.4 + (i % 2) * 0.2);
    });
    for (var i = 0; i < 22; i++) {
      var y = 3.6 + i * 0.75, z = 4.05 - Math.sin(i / 21 * Math.PI) * 0.6;
      var tri = new T.Mesh(new T.BufferGeometry().setFromPoints([W(R.x0 + 0.6, y - 0.28, z), W(R.x0 + 0.6, y + 0.28, z), W(R.x0 + 0.6, y, z - 0.42)]), new T.MeshBasicMaterial({ color: ['#E0482F', '#ffc93c', '#3B86D9', '#2E9C9A'][i % 4], side: T.DoubleSide }));
      scene.add(tri); out.anim.push({ kind: 'flutter', mesh: tri, ph: i * 0.7 });
    }
    var mural = paintPanel(7.5, 3.6, 1024, function (g, w, h) {
      g.clearRect(0, 0, w, h); g.fillStyle = '#f4ead2'; g.globalAlpha = 0.92; g.beginPath();
      for (var k = 0; k < 24; k++) { var a = k / 24 * Math.PI * 2, r = k % 2 ? h * 0.3 : h * 0.47; g.lineTo(w * 0.36 + Math.cos(a) * r * 1.5, h * 0.5 + Math.sin(a) * r); } g.closePath(); g.fill();
      g.globalAlpha = 1; g.lineWidth = 12; g.strokeStyle = '#1d130c'; g.stroke(); label(g, 'SKIP IT!', w * 0.36, h * 0.52, 190, '#2E9C9A', { stroke: 14 });
      g.fillStyle = '#F2A13B'; g.beginPath(); g.ellipse(w * 0.8, h * 0.45, h * 0.3, h * 0.11, -0.3, 0, 7); g.fill(); g.lineWidth = 12; g.stroke();
      g.strokeStyle = '#fff3df'; g.lineWidth = 14; for (var s = 0; s < 4; s++) { g.beginPath(); g.moveTo(w * 0.62 - s * 40, h * (0.3 + s * 0.1)); g.lineTo(w * 0.52 - s * 40, h * (0.36 + s * 0.1)); g.stroke(); }
    });
    onWall(scene, mural, 'R', 25.0, 2.7);
    var safety = paintPanel(1.4, 0.9, 256, function (g, w, h) { g.fillStyle = '#ffc93c'; g.fillRect(0, 0, w, h); g.lineWidth = 12; g.strokeStyle = '#1d130c'; g.strokeRect(6, 6, w - 12, h - 12); label(g, 'CAUTION', w / 2, h * 0.28, 44, '#1d130c', {}); label(g, 'NO PUTTING', w / 2, h * 0.58, 30, '#1d130c', { font: '"Barlow Condensed", "Arial Narrow", sans-serif' }); label(g, 'IN THE MASH TUN', w / 2, h * 0.78, 30, '#1d130c', { font: '"Barlow Condensed", "Arial Narrow", sans-serif' }); });
    onWall(scene, safety, 'R', 9.8, 2.6);
    for (var v = 0; v < 6; v++) { var vw = new T.Mesh(new T.TorusGeometry(0.16, 0.025, 6, 20), toon(0xc0392b)); vw.position.copy(W(R.x1 - 0.12, 4.0 + v * 3.6, 1.6 + (v % 2) * 0.5)); vw.rotation.y = Math.PI / 2; scene.add(vw); out.anim.push({ kind: 'spin', mesh: vw, rate: 0.2 + v * 0.1 }); }
    [5.15, 5.35].forEach(function (z, i) { stat.add(cylGeom(0.06 - i * 0.015, R.y1 - R.y0, 10), toon(i ? 0x1d130c : 0x9aa3aa), new T.Matrix4().makeTranslation(R.x1 - 0.5 - i * 0.3, z, -R.y0).multiply(new T.Matrix4().makeRotationX(-Math.PI / 2)), 0.008); });
    [1.6, 4.0, 6.4].forEach(function (cx) {
      var win = paintPanel(1.3, 2.9, 256, function (g, w, h) { g.fillStyle = '#1d130c'; g.fillRect(0, 0, w, h); var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a3a8a'); gr.addColorStop(1, '#f08a4b'); g.fillStyle = gr; g.beginPath(); g.moveTo(14, h - 14); g.lineTo(14, w / 2); g.arc(w / 2, w / 2, w / 2 - 14, Math.PI, 0); g.lineTo(w - 14, h - 14); g.closePath(); g.fill(); g.strokeStyle = '#1d130c'; g.lineWidth = 8; g.beginPath(); g.moveTo(w / 2, 14); g.lineTo(w / 2, h - 14); g.moveTo(14, h * 0.45); g.lineTo(w - 14, h * 0.45); g.moveTo(14, h * 0.72); g.lineTo(w - 14, h * 0.72); g.stroke(); }, true);
      onWall(scene, win, 'B', cx, 2.6);
    });
    var roundSign = paintPanel(1.8, 1.8, 512, function (g, w) { g.clearRect(0, 0, w, w); g.lineWidth = 26; g.strokeStyle = '#8ed8ff'; g.shadowColor = '#3be3ff'; g.shadowBlur = 40; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 40, 0, 7); g.stroke(); g.shadowBlur = 0; g.fillStyle = '#f2a13b'; g.beginPath(); g.arc(w / 2, w / 2, w * 0.28, 0, 7); g.fill(); label(g, 'HOP', w / 2, w * 0.43, 90, '#1d130c', {}); label(g, 'YARD', w / 2, w * 0.6, 90, '#1d130c', {}); }, true);
    onWall(scene, roundSign, 'B', -7.6, 3.6);
    var outSign = paintPanel(3.4, 0.9, 512, function (g, w, h) { g.fillStyle = '#1d130c'; g.fillRect(0, 0, w, h); label(g, 'BEER GARDEN →', w / 2, h / 2, 64, '#9ef01a', { glow: '#9ef01a', glowBlur: 20 }); }, true);
    onWall(scene, outSign, 'B', -3.5, 4.5); out.anim.push({ kind: 'neon', mesh: outSign });
    var chalk = paintPanel(2.2, 1.4, 512, function (g, w, h) { g.fillStyle = '#6b3f22'; g.fillRect(0, 0, w, h); g.fillStyle = '#20282b'; g.fillRect(16, 16, w - 32, h - 32); label(g, 'TONIGHT', w / 2, h * 0.2, 56, '#fff3df', {}); ['PAIR IT: +1500', 'GONG BANK: JACKPOT', 'SKIP IN: +2000', 'MISSES PAY TOO'].forEach(function (t, k) { label(g, t, w / 2, h * (0.4 + k * 0.15), 34, ['#ffc93c', '#ff8fb3', '#8ed8ff', '#d9f2a6'][k], { font: '"Permanent Marker", "Marker Felt", cursive', weight: '400' }); }); });
    onWall(scene, chalk, 'R', 36.0, 2.4);
    var clock = paintPanel(0.7, 0.7, 256, function (g, w) { g.fillStyle = '#fff3df'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 8, 0, 7); g.fill(); g.lineWidth = 12; g.strokeStyle = '#1d130c'; g.stroke(); for (var k = 0; k < 12; k++) { var a = k / 12 * 7; g.fillStyle = '#1d130c'; g.fillRect(w / 2 + Math.cos(a) * w * 0.36 - 5, w / 2 + Math.sin(a) * w * 0.36 - 5, 10, 10); } label(g, '19TH HOLE', w / 2, w * 0.68, 26, '#E0482F', {}); });
    onWall(scene, clock, 'F', 3.0, 4.2);
    var hand = new T.Mesh(new T.PlaneGeometry(0.04, 0.24), new T.MeshBasicMaterial({ color: 0x1d130c })); hand.geometry.translate(0, 0.1, 0); onWall(scene, hand, 'F', 3.0, 4.2, 0.04); out.anim.push({ kind: 'clock', mesh: hand });
    var big = paintPanel(6, 2.2, 1024, function (g, w, h) { g.clearRect(0, 0, w, h); label(g, 'ALL THE POINTS.', w / 2, h * 0.5, 130, '#ffc93c', { stroke: 14 }); }); onWall(scene, big, 'F', -3.5, 3.9);
    var jukebox = new T.Mesh(new T.BoxGeometry(0.9, 1.7, 0.6), toon(0x8a2a5a)); jukebox.position.copy(W(-7.8, R.y0 + 0.35, 0.85)); outline(jukebox, 0.02); scene.add(jukebox);
    [[-4.5, 3.0], [-0.2, 9.0], [5.6, 15.0], [-6.6, 21.0], [1.6, 21.0], [-0.2, 33], [5.6, 33]].forEach(function (p) {
      scene.add(new T.Line(new T.BufferGeometry().setFromPoints([W(p[0], p[1], 5.25), W(p[0], p[1], 4.3)]), new T.LineBasicMaterial({ color: 0x1d130c })));
      var pot = new T.Mesh(cylGeom(0.16, 0.22, 12, 0.2), toon(0xb5532a)); pot.position.copy(W(p[0], p[1], 4.1)); outline(pot, 0.012); scene.add(pot);
      for (var l = 0; l < 7; l++) { var lf = new T.Mesh(new T.SphereGeometry(0.12, 8, 6), toon(0x3f8a3a)); var a = l / 7 * 6.28; lf.position.copy(W(p[0] + Math.cos(a) * 0.17, p[1] + Math.sin(a) * 0.17, 4.05 - (l % 3) * 0.18)); lf.scale.set(1, 1.6, 1); scene.add(lf); }
    });
  }

  /* ---------- the beer garden ---------- */
  function buildGarden(scene, stat, out, stringLights, cat) {
    var G = C.GARDEN, R = C.ROOM, dark = toon(0x2b1b12), wood = toon(0xa7683a);
    var gw = G.x1 - G.x0, gl = G.y1 - G.y0;
    var grass = plane(gw, gl, TEX.grass, [gw / 3, gl / 3]); grass.rotation.x = -Math.PI / 2; grass.position.copy(W(0, (G.y0 + G.y1) / 2, 0)); scene.add(grass);
    var pav = plane(gw, 6, TEX.pavers, [gw / 1.2, 6 / 1.2]); pav.rotation.x = -Math.PI / 2; pav.position.copy(W(0, 43, 0.004)); scene.add(pav);
    var path = plane(3, gl - 6, TEX.gravel, [1, (gl - 6) / 3]); path.rotation.x = -Math.PI / 2; path.position.copy(W(-3.7, 46 + (gl - 6) / 2, 0.006)); scene.add(path);
    var cross = plane(gw, 2.5, TEX.gravel, [gw / 3, 1]); cross.rotation.x = -Math.PI / 2; cross.position.copy(W(0, 59.75, 0.005)); scene.add(cross);
    var pitPad = new T.Mesh(new T.CircleGeometry(2.6, 32), toon(0xffffff, { map: TEX.pavers })); pitPad.rotation.x = -Math.PI / 2; pitPad.position.copy(W(C.FIREPIT.x, C.FIREPIT.y, 0.007)); scene.add(pitPad);
    out.grounds.push(grass, pav, path, cross, pitPad);
    // fence
    var GT = C.GATE;
    [[G.x0, (G.y0 + G.y1) / 2, gl, Math.PI / 2], [G.x1, (G.y0 + G.y1) / 2, gl, -Math.PI / 2], [(G.x0 + GT.x0) / 2, G.y1, GT.x0 - G.x0, 0], [(GT.x1 + G.x1) / 2, G.y1, G.x1 - GT.x1, 0]].forEach(function (f) {
      var m = plane(f[2], 1.9, TEX.fence, [f[2] / 2, 1]); m.material.side = T.DoubleSide; m.rotation.y = f[3]; m.position.copy(f[3] === 0 ? W(f[0], f[1], 0.95) : W(f[0], f[1], 0.95)); scene.add(m);
    });
    for (var fx = G.x0; fx <= G.x1; fx += 4) if (fx < GT.x0 || fx > GT.x1) stat.add(GBOX, dark, mBox(fx, G.y1, 0, 0.14, 0.14, 2.0), 0.01);
    [GT.x0, GT.x1].forEach(function (gx) { stat.add(GBOX, dark, mBox(gx, G.y1, 0, 0.22, 0.22, 2.6), 0.012); });
    var gsign = signBoard('BACK LOT', 3.2, 0.62, '#9ef01a', 'HOLES 4 · 5 · 6');
    stat.add(GBOX, dark, mBox((GT.x0 + GT.x1) / 2, G.y1, 2.62, GT.x1 - GT.x0 + 0.2, 0.14, 0.12), 0.01);
    gsign.position.copy(W((GT.x0 + GT.x1) / 2, G.y1, 2.25)); gsign.material.side = T.DoubleSide; scene.add(gsign);
    for (var fy = G.y0; fy <= G.y1; fy += 4) { stat.add(GBOX, dark, mBox(G.x0, fy, 0, 0.14, 0.14, 2.0), 0.01); stat.add(GBOX, dark, mBox(G.x1, fy, 0, 0.14, 0.14, 2.0), 0.01); }
    // trees beyond the fence (silhouettes)
    for (var t = 0; t < 22; t++) { var tx = -30 + t * 3 + (t % 3), ty = C.LOT.y1 + 7 + (t % 4) * 2.5, s = 3 + (t % 3); var tr = new T.Mesh(new T.SphereGeometry(s, 10, 8), toon(0x1f3a1a)); tr.position.copy(W(tx, ty, s + 2)); scene.add(tr); }
    // the big oak
    var O = C.OAK, trunk = new T.Mesh(cylGeom(O.trunkR, O.trunkH + 0.6, 14, O.trunkR * 0.75), toon(0x5a3b22)); trunk.position.copy(W(O.x, O.y, 0)); outline(trunk, 0.03); scene.add(trunk);
    [[-2.6, 1.4, 4.3], [2.5, -1.3, 4.4]].forEach(function (l) { var a = W(O.x, O.y, 3.0), b = W(O.x + l[0], O.y + l[1], l[2]), d = b.clone().sub(a), limb = new T.Mesh(new T.CylinderGeometry(0.1, 0.17, d.length(), 8), toon(0x5a3b22)); limb.position.copy(a.clone().add(b).multiplyScalar(0.5)); limb.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); outline(limb, 0.02); scene.add(limb); });
    O.canopy.forEach(function (c, i) { var m = new T.Mesh(new T.IcosahedronGeometry(c.r, 1), toon(i % 2 ? 0x3f8a35 : 0x4f9a40)); m.scale.set(1, 0.75, 1); m.position.copy(W(O.x + c.dx, O.y + c.dy, c.z)); outline(m, 0.04); scene.add(m); });
    out.oak = trunk;
    // picnic tables and umbrellas
    C.PICNIC.forEach(function (p) {
      stat.add(GBOX, wood, mBox(p.x, p.y, 0.7, 2.0, 0.8, 0.06), 0.015);
      [-0.65, 0.65].forEach(function (o) { stat.add(GBOX, toon(0x8a5a33), mBox(p.x, p.y + o, 0.42, 2.0, 0.3, 0.05), 0.012); });
      [-0.85, 0.85].forEach(function (o) { stat.add(GBOX, dark, mBox(p.x + o, p.y, 0, 0.08, 1.5, 0.7), 0.01); });
      stat.add(cylGeom(0.04, 0.16, 12, 0.048), toon(0xF2A13B), at(p.x + 0.4, p.y - 0.2, 0.76), 0.008);
    });
    C.UMBRELLAS.forEach(function (u, i) {
      stat.add(cylGeom(0.03, 2.3, 8), toon(0xe8e0cc), at(u.x, u.y, 0), 0.008);
      var cone = new T.Mesh(new T.ConeGeometry(1.2, 0.5, 10), toon([0xc8402e, 0x2E9C9A, 0xF2A13B][i % 3])); cone.position.copy(W(u.x, u.y, 2.45)); outline(cone, 0.02); scene.add(cone);
    });
    // fire pit with live flames
    var F = C.FIREPIT, pit = new T.Mesh(cylGeom(F.r, F.h, 20), toon(0x7d7262)); pit.position.copy(W(F.x, F.y, 0)); outline(pit, 0.02); scene.add(pit);
    var flames = new T.Group(); flames.position.copy(W(F.x, F.y, F.h)); scene.add(flames);
    [0xffc93c, 0xF2A13B, 0xE0482F].forEach(function (c, i) { var f = new T.Mesh(new T.ConeGeometry(0.42 - i * 0.1, 0.9 - i * 0.15, 7), new T.MeshBasicMaterial({ color: c })); f.position.y = 0.4 - i * 0.05; f.position.x = (i - 1) * 0.12; flames.add(f); });
    out.anim.push({ kind: 'flames', mesh: flames });
    var fl = new T.PointLight(0xff8a3a, 1.2, 9, 1.8); fl.position.copy(W(F.x, F.y, 1.2)); scene.add(fl); out.anim.push({ kind: 'firelight', light: fl });
    [0, 2.1, 4.2].forEach(function (a) { var cx = F.x + Math.cos(a) * 1.9, cy = F.y + Math.sin(a) * 1.9; stat.add(GBOX, toon([0x2c6fa8, 0x2f6b3a, 0xc0392b][Math.round(a) % 3]), mBox(cx, cy, 0.4, 0.6, 0.6, 0.08, a), 0.012); stat.add(GBOX, toon([0x2c6fa8, 0x2f6b3a, 0xc0392b][Math.round(a) % 3]), mBox(cx + Math.cos(a) * 0.3, cy + Math.sin(a) * 0.3, 0.4, 0.08, 0.6, 0.6, a), 0.012); });
    // food truck
    var TR = C.TRUCK, truck = new T.Mesh(new T.BoxGeometry(TR.hx * 2, TR.h - 0.3, TR.hy * 2), toon(0xF2A13B)); truck.position.copy(W(TR.x, TR.y, 0.3 + (TR.h - 0.3) / 2)); outline(truck, 0.03); scene.add(truck);
    var side = paintPanel(TR.hy * 2 - 0.4, 1.4, 512, function (g, w, h) { g.fillStyle = '#1d130c'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd38a'; g.fillRect(12, 12, w - 24, h * 0.45); label(g, 'TACO TRUCK', w / 2, h * 0.78, 80, '#ffc93c', { stroke: 6 }); }, true);
    side.rotation.y = -Math.PI / 2; side.position.copy(W(TR.x - TR.hx - 0.02, TR.y, 1.9)); scene.add(side);
    [-1, 1].forEach(function (s) { [-1, 1].forEach(function (e) { var wh = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 0.25, 14), dark); wh.rotation.z = Math.PI / 2; wh.position.copy(W(TR.x + s * TR.hx, TR.y + e * (TR.hy - 0.8), 0.35)); scene.add(wh); }); });
    // planters, cornhole, light poles with zigzag string lights
    C.PLANTERS.forEach(function (p) { var m = new T.Mesh(cylGeom(0.35, 0.55, 14, 0.42), toon(0xb5532a)); m.position.copy(W(p.x, p.y, 0)); outline(m, 0.015); scene.add(m); for (var k = 0; k < 5; k++) { var lf = new T.Mesh(new T.SphereGeometry(0.22, 8, 6), toon(0x3f8a3a)); lf.position.copy(W(p.x + Math.cos(k) * 0.18, p.y + Math.sin(k) * 0.18, 0.75 + (k % 2) * 0.2)); scene.add(lf); } });
    [[-12.5, 49.5], [-12.5, 55]].forEach(function (c, i) { stat.add(GBOX, toon(0xd9c27a), mBox(c[0], c[1], 0, 0.6, 1.2, 0.18, 0.15), 0.012); });
    C.LIGHT_POLES.forEach(function (p) { stat.add(cylGeom(0.07, 4.6, 8), dark, at(p.x, p.y, 0), 0.012); });
    var gs = [], zig = [[-15.4, 41], [15.4, 47], [-15.4, 53], [15.4, 59], [-15.4, 65], [15.4, 71], [-15.4, 77], [15.4, 81.4]];
    for (var z = 0; z < zig.length - 1; z++) gs.push(cat([zig[z][0], zig[z][1], 4.4], [zig[z + 1][0], zig[z + 1][1], 4.4], 0.9, 26));
    gs.push(cat([-15.4, 81.4, 4.4], [0, 81.4, 4.4], 0.6, 14)); gs.push(cat([0, 81.4, 4.4], [15.4, 81.4, 4.4], 0.6, 14));
    stringLights(scene, gs, 0.06);
    // giant Jenga by the crate bank
    var J = C.JENGA, jw = J.hx * 2;
    for (var jr = 0; jr < 10; jr++) for (var jb = 0; jb < 3; jb++) { if ((jr * 3 + jb) % 7 === 4) continue; var along = (jb - 1) * jw / 3, rot = jr % 2;
      stat.add(GBOX, toon(jb % 2 ? 0xe2b97f : 0xd6a96a), mBox(J.x + (rot ? 0 : along), J.y + (rot ? along : 0), jr * J.h / 10, rot ? jw : jw / 3 - 0.01, rot ? jw / 3 - 0.01 : jw, J.h / 10 - 0.008), 0.01); }
    // a little stage in the corner with a mic and amp
    stat.add(GBOX, toon(0x3a2418), mBox(13.5, 50, 0, 4, 3, 0.4), 0.015);
    stat.add(GBOX, dark, mBox(13.5, 50.5, 0.4, 0.6, 0.4, 0.8), 0.012);
    stat.add(cylGeom(0.02, 1.5, 6), toon(0x9aa3aa), at(12.6, 49.6, 0.4), 0.006);
  }

  /* ---------- the back lot: the brewery's working yard behind the beer garden ---------- */
  function buildBackLot(scene, stat, out, stringLights, cat) {
    var Lt = C.LOT, dark = toon(0x2b1b12), metal = toon(0x9aa3aa), r = rnd(23);
    if (!TEX.asphalt) TEX.asphalt = canvas(256, 256, function (g, w, h) { g.fillStyle = '#3d3e44'; g.fillRect(0, 0, w, h); for (var i = 0; i < 1600; i++) { g.fillStyle = ['#47484f', '#34353a', '#55565d', '#2e2f33'][i % 4]; g.fillRect(r() * w, r() * h, 2, 2); } g.strokeStyle = 'rgba(20,20,22,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w * 0.1, h * 0.3); g.lineTo(w * 0.35, h * 0.42); g.lineTo(w * 0.5, h * 0.4); g.stroke(); });
    var lw = Lt.x1 - Lt.x0, ll = Lt.y1 - Lt.y0;
    var asph = plane(lw, ll, TEX.asphalt, [lw / 4, ll / 4]); asph.rotation.x = -Math.PI / 2; asph.position.copy(W(0, (Lt.y0 + Lt.y1) / 2, 0)); scene.add(asph);
    var gl = plane(1.4, ll, TEX.gravel, [0.5, ll / 3]), gr = plane(1.4, ll, TEX.gravel, [0.5, ll / 3]);
    [[gl, Lt.x0 + 0.7], [gr, Lt.x1 - 0.7]].forEach(function (q) { q[0].rotation.x = -Math.PI / 2; q[0].position.copy(W(q[1], (Lt.y0 + Lt.y1) / 2, 0.004)); scene.add(q[0]); });
    var pad = new T.Mesh(new T.CircleGeometry(C.SILO.r + 1.6, 32), toon(0xffffff, { map: TEX.grass })); pad.rotation.x = -Math.PI / 2; pad.position.copy(W(C.SILO.x, C.SILO.y, 0.006)); scene.add(pad);
    out.grounds.push(asph, gl, gr, pad);
    // painted lines: parking stalls on the east side and a yellow fire lane
    var paint = new T.MeshBasicMaterial({ color: 0xf1e6c8 }), yel = new T.MeshBasicMaterial({ color: 0xf2c230 });
    for (var py = 86; py < 104; py += 3) { var ln = new T.Mesh(new T.PlaneGeometry(4.5, 0.12), paint); ln.rotation.x = -Math.PI / 2; ln.position.copy(W(12.0, py, 0.008)); scene.add(ln); }
    var lane = new T.Mesh(new T.PlaneGeometry(0.18, 30), yel); lane.rotation.x = -Math.PI / 2; lane.position.copy(W(-2.0, 103, 0.008)); scene.add(lane);
    // fences
    [[Lt.x0, Math.PI / 2], [Lt.x1, -Math.PI / 2]].forEach(function (f) { var m = plane(ll, 1.9, TEX.fence, [ll / 2, 1]); m.material.side = T.DoubleSide; m.rotation.y = f[1]; m.position.copy(W(f[0], (Lt.y0 + Lt.y1) / 2, 0.95)); scene.add(m); });
    for (var fy = Lt.y0; fy <= Lt.y1; fy += 4) { stat.add(GBOX, dark, mBox(Lt.x0, fy, 0, 0.14, 0.14, 2.0), 0.01); stat.add(GBOX, dark, mBox(Lt.x1, fy, 0, 0.14, 0.14, 2.0), 0.01); }
    // the keg warehouse across the back, with a loading dock and roll-up doors
    var wall = plane(33, 5.5, TEX.brick, [33 / 1.92, 5.5 / 1.92]); wall.position.copy(W(0, Lt.y1, 2.75)); scene.add(wall);
    stat.add(GBOX, toon(0x5a2f22), mBox(0, Lt.y1 + 0.6, 0, 33, 1.2, 5.5), 0.02);
    stat.add(GBOX, toon(0x2b1b12), mBox(0, Lt.y1 + 0.6, 5.5, 33.4, 1.6, 0.35), 0.02);
    var D = C.DOCK;
    stat.add(GBOX, toon(0xb9b4aa), mBox(D.x, D.y, 0, D.hx * 2, D.hy * 2, D.h), 0.02);
    for (var bx = D.x - D.hx + 1; bx <= D.x + D.hx - 1; bx += 2.5) stat.add(GBOX, toon(0x1d1d1f), mBox(bx, D.y - D.hy - 0.08, 0.35, 0.45, 0.16, 0.6), 0.012);
    stat.add(GBOX, yel, mBox(D.x, D.y - D.hy + 0.02, D.h - 0.04, D.hx * 2, 0.12, 0.05), 0);
    [D.x - 3, D.x + 3].forEach(function (dx2) {
      var door = paintPanel(3.6, 3.6, 256, function (g, w, h) { g.fillStyle = '#c9c4b8'; g.fillRect(0, 0, w, h); g.fillStyle = '#9d988d'; for (var k = 0; k < 16; k++) g.fillRect(0, k * h / 16, w, 4); g.fillStyle = '#e0482f'; g.fillRect(0, h - 18, w, 18); });
      door.position.copy(W(dx2, Lt.y1 - 0.02, D.h + 1.8)); scene.add(door);
    });
    var wsign = signBoard('PUTT LEAGUE BREWING', 5.6, 0.9, '#E0482F', 'KEG WAREHOUSE');
    wsign.position.copy(W(-3, Lt.y1 - 0.03, 4.6)); scene.add(wsign);
    var dsign = signBoard('DOCK BANK', 1.4, 0.36);
    dsign.position.copy(W(D.x, D.y - D.hy - 0.03, D.h + 0.35)); scene.add(dsign);
    // grain silo: ribbed steel, cone roof, ladder
    var Si = C.SILO, silo = new T.Mesh(cylGeom(Si.r, Si.h, 28), toon(0xc7ccd1)); silo.position.copy(W(Si.x, Si.y, 0)); outline(silo, 0.035); scene.add(silo);
    for (var rb = 1; rb < 9; rb++) { var ring = new T.Mesh(new T.TorusGeometry(Si.r + 0.01, 0.035, 6, 32), toon(0x8f969d)); ring.rotation.x = Math.PI / 2; ring.position.copy(W(Si.x, Si.y, rb * Si.h / 9)); scene.add(ring); }
    var roofC = new T.Mesh(new T.ConeGeometry(Si.r + 0.15, 1.6, 28), toon(0x9aa3aa)); roofC.position.copy(W(Si.x, Si.y, Si.h + 0.8)); outline(roofC, 0.03); scene.add(roofC);
    stat.add(GBOX, dark, mBox(Si.x + Si.r * 0.7, Si.y - Si.r * 0.7, 0, 0.5, 0.08, Si.h), 0.008);
    var ssign = paintPanel(2.6, 2.6, 256, function (g, w, h) { g.fillStyle = '#E0482F'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = '#1d130c'; g.stroke(); label(g, 'GRAIN', w / 2, h * 0.42, 54, '#fff3df', { stroke: 5 }); label(g, '2-ROW', w / 2, h * 0.64, 44, '#ffc93c', { stroke: 4 }); });
    ssign.position.copy(W(Si.x + 0.9, Si.y - Si.r - 0.2, 5.2)); ssign.rotation.y = -0.4; scene.add(ssign);
    // box truck with the cab to the north; a disc can skip under the box
    var B = C.BOX_TRUCK, body = new T.Mesh(new T.BoxGeometry(B.hx * 2, B.z1 - B.z0, B.hy * 2), toon(0xf3efe6)); body.position.copy(W(B.x, B.y, (B.z0 + B.z1) / 2)); outline(body, 0.03); scene.add(body);
    var cab = new T.Mesh(new T.BoxGeometry(B.cab.hx * 2, B.cab.z1 - B.cab.z0, B.cab.hy * 2), toon(0xE0482F)); cab.position.copy(W(B.cab.x, B.cab.y, (B.cab.z0 + B.cab.z1) / 2)); outline(cab, 0.03); scene.add(cab);
    var wind = new T.Mesh(new T.PlaneGeometry(B.cab.hx * 1.7, 0.8), toon(0x2b4a5e)); wind.position.copy(W(B.cab.x, B.cab.y + B.cab.hy + 0.01, B.cab.z1 - 0.55)); wind.rotation.y = Math.PI; scene.add(wind);
    [-1, 1].forEach(function (sx) {
      var side = paintPanel(B.hy * 2 - 0.3, 1.6, 512, function (g, w, h) { g.fillStyle = '#f3efe6'; g.fillRect(0, 0, w, h); label(g, 'PUTT LEAGUE', w / 2, h * 0.4, 96, '#E0482F', { stroke: 7 }); label(g, 'BREWING CO.', w / 2, h * 0.75, 64, '#1d130c', {}); });
      side.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; side.position.copy(W(B.x + sx * (B.hx + 0.02), B.y, (B.z0 + B.z1) / 2 + 0.1)); scene.add(side);
      [[B.y - 2.6], [B.y + 2.4], [B.cab.y]].forEach(function (wy) { var wh = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.3, 16), dark); wh.rotation.z = Math.PI / 2; wh.position.copy(W(B.x + sx * (B.hx - 0.15), wy[0], 0.42)); scene.add(wh); });
    });
    stat.add(GBOX, toon(0x3a3a3e), mBox(B.x, B.y, B.z0 - 0.18, B.hx * 1.4, B.hy * 2 + 2, 0.12), 0.01);
    // pallet stacks, dumpster, forklift
    var palM = toon(0xb98a52), palD = toon(0x7a5530);
    C.PALLETS.forEach(function (p) { var n = Math.round(p.h / 0.15); for (var k = 0; k < n; k++) stat.add(GBOX, k % 3 === 2 ? palD : palM, mBox(p.x, p.y, k * 0.15, 1.2, 1.0, 0.12), 0.01); });
    var Du = C.DUMPSTER, dump = new T.Mesh(new T.BoxGeometry(Du.hx * 2, Du.h, Du.hy * 2), toon(0x2f6b3a)); dump.position.copy(W(Du.x, Du.y, Du.h / 2)); outline(dump, 0.03); scene.add(dump);
    stat.add(GBOX, toon(0x1f4a28), mBox(Du.x, Du.y - 0.1, Du.h, Du.hx * 2 + 0.1, Du.hy * 2 + 0.3, 0.08, 0), 0.015);
    var Fk = C.FORKLIFT, fk = new T.Mesh(new T.BoxGeometry(Fk.hx * 2, Fk.h, Fk.hy * 2), toon(0xF2A13B)); fk.position.copy(W(Fk.x, Fk.y, Fk.h / 2)); outline(fk, 0.025); scene.add(fk);
    stat.add(GBOX, dark, mBox(Fk.x, Fk.y + Fk.hy + 0.1, 0, Fk.hx * 2, 0.12, Fk.mast), 0.01);
    [-0.35, 0.35].forEach(function (fx2) { stat.add(GBOX, metal, mBox(Fk.x + fx2, Fk.y + Fk.hy + 0.7, 0.08, 0.12, 1.1, 0.05), 0.006); });
    stat.add(GBOX, dark, mBox(Fk.x, Fk.y - 0.2, Fk.h, Fk.hx * 2, 1.2, 0.06), 0.008);
    // light poles and a run of string lights
    C.LOT_POLES.forEach(function (p) { stat.add(cylGeom(0.07, 4.6, 8), dark, at(p.x, p.y, 0), 0.012); });
    var ls = [cat([-15.4, 104, 4.4], [15.4, 104, 4.4], 0.9, 30), cat([-15.4, 122.6, 4.4], [15.4, 122.6, 4.4], 0.9, 30), cat([15.4, 81.4, 4.4], [15.4, 104, 4.4], 0.6, 20), cat([-15.4, 81.4, 4.4], [-15.4, 104, 4.4], 0.6, 20)];
    stringLights(scene, ls, 0.06);
  }

  /* ---------- the disc ---------- */
  function makeDisc(color) {
    var r = 0.1055, m = new T.Mesh(latheGeom([[0.001, -0.008], [r * 0.9, -0.01], [r, -0.004], [r, 0.004], [r * 0.92, 0.01], [0.001, 0.011]], 32), new T.MeshToonMaterial({ color: color || 0xF2A13B, gradientMap: grad })); outline(m, 0.008);
    var stamp = new T.Mesh(new T.CircleGeometry(r * 0.55, 20), new T.MeshBasicMaterial({ color: 0xfff3df })); stamp.rotation.x = -Math.PI / 2; stamp.position.y = 0.0115; m.add(stamp);
    var bar = new T.Mesh(new T.PlaneGeometry(r * 0.9, 0.012), new T.MeshBasicMaterial({ color: 0x1d130c })); bar.rotation.x = -Math.PI / 2; bar.position.y = 0.012; m.add(bar);
    return m;
  }

  /* ---------- glow: an additive halo hull plus a faint tint, for bonus objects ---------- */
  function glowMat(color, thick, back) {
    return new T.ShaderMaterial({
      uniforms: { c: { value: new T.Color(color) }, t: { value: thick }, a: { value: 0.6 } },
      vertexShader: 'attribute vec3 oNormal; uniform float t; varying float vf; void main(){ vec4 mv = modelViewMatrix * vec4(position + oNormal * t, 1.0); vec3 n = normalize(normalMatrix * oNormal); vf = 1.0 - abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 c; uniform float a; varying float vf; void main(){ gl_FragColor = vec4(c, a * (0.35 + 0.65 * vf)); }',
      side: back ? T.BackSide : T.FrontSide, transparent: true, depthWrite: false, blending: T.AdditiveBlending
    });
  }
  function glowShell(geom, color) {
    var g = geom.clone(); smoothNormals(g);
    var grp = new T.Group();
    var halo = new T.Mesh(g, glowMat(color, 0.035, true)), tint = new T.Mesh(g, glowMat(color, 0.006, false));
    halo.renderOrder = 3; tint.renderOrder = 3; grp.add(halo); grp.add(tint);
    grp.userData.mats = [halo.material, tint.material];
    return grp;
  }

  return { build: build, makeDisc: makeDisc, W: W, toon: toon, outline: outline, grad: grad, glowShell: glowShell };
})();
