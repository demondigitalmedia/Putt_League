/* =====================================================================
   PUTT LEAGUE · SCENE KIT (three.js r128)
   Cel-shaded: toon materials with three light bands, ink outlines (inverted hull on smoothed
   normals), canvas-painted textures, merged static batches, baskets with live chains, the bank
   boards and tee mats every hole gets. The live venue (venues/<id>.scene.js) builds the rest.
   Engine frame (x right, y downrange, z up, metres) maps to three.js as (x, z, -y).
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

  var KIT;
  /* ---------- the whole venue: the kit sets up the scene, the live venue builds into it ---------- */
  function build() {
    makeTextures(); gardenTextures();
    REST = FlightlineBasket.restPose();
    var scene = new T.Scene(), stat = new Batch(scene), ceilB = new Batch(new T.Group());
    scene.add(ceilB.parent);
    var out = { scene: scene, ceiling: ceilB.parent, anim: [], bulbs: [], baskets: [], icons: {} };
    C.venue.buildScene(KIT, scene, stat, ceilB, out);
    stat.build(); ceilB.build();
    return out;
  }

  /* ---------- each hole's basket, bank board (by kind), Putt tee mats and Pitch tee pad ---------- */
  function dressHoles(scene, stat, out) {
    var dark = toon(0x2b1b12), kegMat = toon(0xc9d1d6);
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

  KIT = { T: T, C: C, W: W, toon: toon, glow: glow, outline: outline, canvas: canvas, rnd: rnd, TEX: TEX, paintPanel: paintPanel, signBoard: signBoard, label: label, cylGeom: cylGeom, latheGeom: latheGeom, mBox: mBox, at: at, GBOX: GBOX, plane: plane, dressHoles: dressHoles, Batch: Batch, glowShell: glowShell };
  return { build: build, makeDisc: makeDisc, W: W, toon: toon, outline: outline, grad: grad, glowShell: glowShell, kit: KIT };
})();
