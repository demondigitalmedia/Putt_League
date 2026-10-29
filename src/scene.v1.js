/* =====================================================================
   PUTT LEAGUE · BREWERY · 3D SCENE (three.js r128)
   Cel-shaded: toon materials with three light bands, ink outlines (inverted hull on smoothed
   normals), canvas-painted textures. Engine frame (x right, y downrange, z up, metres) maps to
   three.js as (x, z, -y). Built from the same numbers as brewery-hole.js.
   ===================================================================== */
var BreweryScene = (function () {
  'use strict';
  var T = THREE, H = BreweryHole;
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
    var R = H.ROOM, d = lift || 0.03;
    if (wall === 'L') { mesh.position.copy(W(R.x0 + d, u, z)); mesh.rotation.y = Math.PI / 2; }
    if (wall === 'R') { mesh.position.copy(W(R.x1 - d, u, z)); mesh.rotation.y = -Math.PI / 2; }
    if (wall === 'B') { mesh.position.copy(W(u, R.y1 - d, z)); }
    if (wall === 'F') { mesh.position.copy(W(u, R.y0 + d, z)); mesh.rotation.y = Math.PI; }
    scene.add(mesh); return mesh;
  }

  /* ---------- builders (engine frame in, three.js out) ---------- */
  var M4 = new T.Matrix4();
  function mBox(cx, cy, z0, sx, sy, sz, ry) {
    var m = new T.Matrix4().makeTranslation(cx, z0 + sz / 2, -cy);
    if (ry) m.multiply(new T.Matrix4().makeRotationY(ry));
    return m.multiply(new T.Matrix4().makeScale(sx, sz, sy));
  }
  var GBOX = new T.BoxGeometry(1, 1, 1);
  function cylGeom(r, h, seg, r2) { var g = new T.CylinderGeometry(r2 == null ? r : r2, r, h, seg || 24); g.translate(0, h / 2, 0); return g; }
  function latheGeom(prof, seg) { return new T.LatheGeometry(prof.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg || 40); }

  function build(renderer) {
    makeTextures();
    var scene = new T.Scene(), R = H.ROOM;
    scene.background = new T.Color(0x140d09);
    scene.fog = new T.Fog(0x2a1a10, 18, 42);
    var stat = new Batch(scene), ceilB = new Batch(new T.Group());
    var ceiling = ceilB.parent; scene.add(ceiling);
    var out = { scene: scene, ceiling: ceiling, anim: [], bubbles: {}, targets: [] };

    // ---- floor, walls, ceiling (planes with tiled paint)
    function plane(w, h, tex, rx, ry, rep, color) {
      var t = tex.clone(); t.needsUpdate = true; t.repeat.set(rep[0], rep[1]);
      var m = new T.Mesh(new T.PlaneGeometry(w, h), toon(color || 0xffffff, { map: t }));
      m.rotation.set(rx || 0, ry || 0, 0); return m;
    }
    var fw = R.x1 - R.x0, fl = R.y1 - R.y0;
    var floor = plane(fw, fl, TEX.planks, -Math.PI / 2, 0, [fw / 1.2, fl / 2.4]); floor.position.copy(W((R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, 0)); scene.add(floor);
    out.floor = floor;
    var wl = plane(fl, R.h, TEX.brick, 0, Math.PI / 2, [fl / 1.92, R.h / 1.92]); wl.position.copy(W(R.x0, (R.y0 + R.y1) / 2, R.h / 2)); scene.add(wl);
    var wr = plane(fl, R.h, TEX.brick, 0, -Math.PI / 2, [fl / 1.92, R.h / 1.92]); wr.position.copy(W(R.x1, (R.y0 + R.y1) / 2, R.h / 2)); scene.add(wr);
    var wf = plane(fw, R.h, TEX.brick, 0, Math.PI, [fw / 1.92, R.h / 1.92]); wf.position.copy(W((R.x0 + R.x1) / 2, R.y0, R.h / 2)); scene.add(wf);
    // back wall around the roll-up door
    var D = { x0: -5.1, x1: -1.7, h: 3.3 };
    [[R.x0, D.x0, 0, R.h], [D.x1, R.x1, 0, R.h], [D.x0, D.x1, D.h, R.h]].forEach(function (s) {
      var w = s[1] - s[0], hh = s[3] - s[2], m = plane(w, hh, TEX.brick, 0, 0, [w / 1.92, hh / 1.92]);
      m.position.copy(W((s[0] + s[1]) / 2, R.y1, (s[2] + s[3]) / 2)); scene.add(m);
    });
    var ceil = plane(fw, fl, TEX.ceiling, Math.PI / 2, 0, [fw / 2, fl / 2]); ceil.position.copy(W((R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, R.h)); ceiling.add(ceil);

    // ---- outside through the roll-up door: dusk sky, courtyard, string lights
    var sky = paintPanel(30, 14, 512, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1b2350'); gr.addColorStop(0.55, '#7a3f6e'); gr.addColorStop(0.8, '#f08a4b'); gr.addColorStop(1, '#ffc46b');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#16200f'; for (var i = 0; i < 14; i++) { g.beginPath(); g.arc(i * w / 13, h * 0.83, 30 + (i * 13 % 25), 0, Math.PI * 2); g.fill(); }
      g.fillRect(0, h * 0.86, w, h * 0.14);
    }, true);
    sky.position.copy(W(-3.4, R.y1 + 12, 5)); scene.add(sky);
    var yard = new T.Mesh(new T.PlaneGeometry(16, 12), toon(0x6b6157)); yard.rotation.x = -Math.PI / 2; yard.position.copy(W(-3.4, R.y1 + 6, -0.01)); scene.add(yard);
    for (var ti = 0; ti < 3; ti++) stat.add(GBOX, toon(0xa7683a), mBox(-4.6 + ti * 1.9, R.y1 + 3 + ti * 2.2, 0.7, 1.9, 0.75, 0.06), 0.015);

    // ---- timber posts and beams, duct
    var timber = toon(0x6e4426), dark = toon(0x2b1b12), steel = toon(0x9aa3aa), copper = toon(0xc8692c), brass = toon(0xd9a441);
    H.POSTS_X.forEach(function (x) { H.POSTS_Y.forEach(function (y) { stat.add(GBOX, timber, mBox(x, y, 0, 0.32, 0.32, R.h), 0.02); }); });
    H.POSTS_X.forEach(function (x) { ceilB.add(GBOX, timber, mBox(x, (R.y0 + R.y1) / 2, R.h - 0.45, 0.34, R.y1 - R.y0, 0.45), 0.02); });
    H.POSTS_Y.forEach(function (y) { ceilB.add(GBOX, timber, mBox((R.x0 + R.x1) / 2, y, R.h - 0.75, R.x1 - R.x0, 0.3, 0.4), 0.02); });
    var duct = new T.Mesh(new T.CylinderGeometry(0.38, 0.38, R.y1 - R.y0, 28, 1, true), toon(0xb8c0c6)); duct.rotation.x = Math.PI / 2; duct.position.copy(W(-1.0, (R.y0 + R.y1) / 2, 4.9)); outline(duct, 0.02); ceiling.add(duct);
    for (var dy = R.y0 + 1; dy < R.y1; dy += 2) { var ring = new T.Mesh(new T.TorusGeometry(0.39, 0.02, 6, 28), dark); ring.position.copy(W(-1.0, dy, 4.9)); ceiling.add(ring); }

    // ---- copper kettles on black stands, stainless fermenters
    H.KETTLES.forEach(function (k, i) {
      var base = 0.75, R2 = k.r, Hk = k.h;
      var prof = [[0.001, base - 0.25], [0.15, base - 0.22], [R2 * 0.85, base + 0.05], [R2, base + 0.25], [R2, base + Hk], [R2 * 0.92, base + Hk + 0.25], [R2 * 0.7, base + Hk + 0.45], [R2 * 0.35, base + Hk + 0.6], [0.18, base + Hk + 0.64], [0.001, base + Hk + 0.65]];
      var m = new T.Mesh(latheGeom(prof, 40), copper); m.position.copy(W(k.x, k.y, 0)); outline(m, 0.025); scene.add(m);
      var stack = new T.Mesh(cylGeom(0.16, R.h - (base + Hk + 0.5), 16), copper); stack.position.copy(W(k.x, k.y, base + Hk + 0.5)); outline(stack, 0.02); scene.add(stack);
      [[0.8, 0.8], [-0.8, 0.8], [0.8, -0.8], [-0.8, -0.8]].forEach(function (o) { stat.add(GBOX, dark, mBox(k.x + o[0] * R2 * 0.7, k.y + o[1] * R2 * 0.7, 0, 0.09, 0.09, base + 0.3), 0.012); });
      var man = new T.Mesh(cylGeom(0.27, 0.12, 24), brass); man.rotation.z = Math.PI / 2; man.position.copy(W(k.x - R2 - 0.02, k.y, base + Hk * 0.45)); outline(man, 0.015); scene.add(man);
      var port = new T.Mesh(new T.CircleGeometry(0.2, 24), glow(0x3a2414)); port.rotation.y = -Math.PI / 2; port.position.copy(W(k.x - R2 - 0.15, k.y, base + Hk * 0.45)); scene.add(port);
      [0.28, Hk - 0.05].forEach(function (z) { var bnd = new T.Mesh(new T.TorusGeometry(R2 + 0.01, 0.025, 6, 40), brass); bnd.rotation.x = Math.PI / 2; bnd.position.copy(W(k.x, k.y, base + z)); scene.add(bnd); });
      var gauge = paintPanel(0.3, 0.3, 128, function (g, w) { g.fillStyle = '#f4ead2'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 6, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = '#1d130c'; g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2, w / 2); g.lineTo(w * 0.78, w * 0.3); g.stroke(); });
      gauge.rotation.y = -Math.PI / 2; gauge.position.copy(W(k.x - R2 - 0.04, k.y + 0.55, base + Hk * 0.8)); scene.add(gauge);
      out.anim.push({ kind: 'gaugeWobble', mesh: gauge, ph: i });
    });
    H.FERMENTERS.forEach(function (f) {
      var prof = [[0.001, 0.55], [f.r * 0.6, 0.85], [f.r, 1.2], [f.r, 1.2 + f.h], [f.r * 0.6, 1.5 + f.h], [0.001, 1.55 + f.h]];
      var m = new T.Mesh(latheGeom(prof, 36), toon(0xc9d1d6)); m.position.copy(W(f.x, f.y, 0)); outline(m, 0.025); scene.add(m);
      [0, 2.1, 4.2].forEach(function (a) { stat.add(cylGeom(0.045, 1.3, 8), steel, new T.Matrix4().makeTranslation(f.x + Math.cos(a) * f.r * 0.9, 0, -(f.y + Math.sin(a) * f.r * 0.9)), 0.01); });
    });

    // ---- the bar: tile front, wood top, taps, shelves, screens, stools
    var B = H.BAR, tileTex = TEX.tile.clone(); tileTex.needsUpdate = true; tileTex.repeat.set((B.y1 - B.y0) / 1, 1);
    var barFront = new T.Mesh(new T.BoxGeometry(B.x1 - B.x0, B.h, B.y1 - B.y0), toon(0xffffff, { map: tileTex })); barFront.position.copy(W((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, B.h / 2)); outline(barFront, 0.02); scene.add(barFront);
    stat.add(GBOX, toon(0x8a4b22), mBox((B.x0 + B.x1) / 2 + 0.08, (B.y0 + B.y1) / 2, B.h, B.x1 - B.x0 + 0.3, B.y1 - B.y0 + 0.2, 0.08), 0.015);
    stat.add(GBOX, timber, mBox(R.x0 + 0.3, (B.y0 + B.y1) / 2, 0, 0.6, B.y1 - B.y0, 1.0), 0.015);
    [2.2, 2.75].forEach(function (z) { stat.add(GBOX, timber, mBox(R.x0 + 0.15, (B.y0 + B.y1) / 2, z, 0.3, B.y1 - B.y0 - 4, 0.04), 0.01); });
    var bottleCols = [0x2f6b3a, 0xa35b2a, 0xd9c27a, 0x7c2f2a, 0x2c5f8a];
    for (var bi = 0; bi < 26; bi++) {
      var by = B.y0 + 2.2 + bi * 0.29, bz = bi % 2 ? 2.24 : 2.79, bh = 0.24 + (bi * 7 % 5) * 0.03;
      stat.add(cylGeom(0.045, bh, 10, 0.03), toon(bottleCols[bi % 5]), new T.Matrix4().makeTranslation(R.x0 + 0.15, bz, -by), 0.008);
    }
    stat.add(cylGeom(0.05, 7, 12), steel, new T.Matrix4().makeTranslation(R.x0 + 0.08, 1.55, -9.5).multiply(new T.Matrix4().makeRotationX(Math.PI / 2)).multiply(new T.Matrix4().makeTranslation(0, -3.5, 0)), 0.01);
    var tapCols = [0xF2A13B, 0x1f5c9a, 0xd9c27a, 0x7c2f2a, 0x2f6b3a, 0xe8e0cc];
    for (var tk = 0; tk < 18; tk++) stat.add(cylGeom(0.024, 0.24, 8, 0.032), toon(tapCols[tk % 6]), new T.Matrix4().makeTranslation(R.x0 + 0.26, 1.55, -(6.2 + tk * 0.38)), 0.008);
    for (var sk = 0; sk < 10; sk++) {
      var sy = B.y0 + 0.7 + sk * 1.15;
      stat.add(cylGeom(0.025, 0.74, 8), dark, new T.Matrix4().makeTranslation(B.x1 + 0.55, 0, -sy), 0.008);
      stat.add(cylGeom(0.2, 0.06, 18), toon(0x9c2f22), new T.Matrix4().makeTranslation(B.x1 + 0.55, 0.72, -sy), 0.012);
    }
    [4.6, 6.9, 8.2, 11.7, 13.9].forEach(function (y, i) { stat.add(cylGeom(0.04, 0.16, 12, 0.048), toon(i % 2 ? 0x3a1f12 : 0xF2A13B), new T.Matrix4().makeTranslation(B.x1 - 0.15, B.h + 0.04, -y), 0.008); });
    // tap list screens
    [7.4, 10.4].forEach(function (y, si) {
      var scr = paintPanel(2.4, 1.3, 512, function (g, w, h) {
        g.fillStyle = '#0f1a2b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1d130c'; g.lineWidth = 16; g.strokeRect(0, 0, w, h);
        label(g, si ? 'ON TAP' : 'PUTT LEAGUE NIGHT', w / 2, h * 0.17, si ? 46 : 40, '#ffc93c', { glow: '#ffc93c', glowBlur: 10 });
        var names = si ? [['HAZY IPA', '6.5'], ['CHAIN SMOKER PORTER', '7.1'], ['ACE PILSNER', '4.8'], ['SKIP IT SOUR', '5.2']] : [['2 PUTTS A HOLE', ''], ['MISS? STILL POINTS', ''], ['RING THE GONG', 'x2'], ['SKIP IT IN', '+2000']];
        names.forEach(function (n, k) { label(g, n[0], 34, h * (0.36 + k * 0.17), 30, '#fff3df', { align: 'left', font: '"Barlow Condensed", "Arial Narrow", sans-serif', weight: '700' }); label(g, n[1], w - 34, h * (0.36 + k * 0.17), 30, '#5aa5f2', { align: 'right', font: '"Barlow Condensed", "Arial Narrow", sans-serif', weight: '700' }); });
      }, true);
      onWall(scene, scr, 'L', y, 3.25);
    });

    // ---- taproom tables and chairs
    H.TABLES.forEach(function (t) {
      stat.add(GBOX, toon(0xa7683a), mBox(t.x, t.y, 0.73, t.hx * 2, t.hy * 2, 0.06), 0.015);
      [[-0.35, -0.75], [0.35, -0.75], [-0.35, 0.75], [0.35, 0.75]].forEach(function (o) { stat.add(GBOX, dark, mBox(t.x + o[0], t.y + o[1], 0, 0.06, 0.06, 0.73), 0.01); });
      [-1, 1].forEach(function (side) { [-0.45, 0.45].forEach(function (dyy) {
        var cx = t.x + side * 0.75, cy = t.y + dyy;
        stat.add(GBOX, toon(0x2b5d6e), mBox(cx, cy, 0.44, 0.42, 0.42, 0.05), 0.01);
        stat.add(GBOX, toon(0x2b5d6e), mBox(cx + side * 0.2, cy, 0.49, 0.04, 0.42, 0.5), 0.01);
        stat.add(GBOX, dark, mBox(cx, cy, 0, 0.36, 0.36, 0.44), 0.008);
      }); });
      stat.add(cylGeom(0.04, 0.16, 12, 0.048), toon(0xF2A13B), new T.Matrix4().makeTranslation(t.x + 0.1, 0.79, -(t.y - 0.3)), 0.008);
      stat.add(cylGeom(0.04, 0.16, 12, 0.048), toon(0x3a1f12), new T.Matrix4().makeTranslation(t.x - 0.12, 0.79, -(t.y + 0.25)), 0.008);
    });

    // ---- barrels: the stack (the obstacle) and loose uprights
    var staveTex = TEX.stack;
    function barrelGeom() { return latheGeom([[0.001, -0.45], [0.27, -0.45], [0.3, -0.3], [0.325, 0], [0.3, 0.3], [0.27, 0.45], [0.001, 0.45]], 28); }
    var bg = barrelGeom(), bmat = toon(0xffffff, { map: staveTex });
    H.STACK_BARRELS.forEach(function (b) {
      var m = new T.Mesh(bg, bmat); m.position.copy(W(b.x, b.y, b.z)); m.rotation.set(Math.PI / 2, 0, 0); outline(m, 0.02); scene.add(m);
      [-0.36, 0.36].forEach(function (o) { var hp = new T.Mesh(new T.TorusGeometry(0.31, 0.014, 6, 24), dark); hp.position.copy(W(b.x, b.y + o, b.z)); scene.add(hp); });
      var end = new T.Mesh(new T.CircleGeometry(0.27, 24), toon(0x9b6234)); end.position.copy(W(b.x, b.y - 0.455, b.z)); scene.add(end);
    });
    stat.add(GBOX, timber, mBox(H.STACK.x, H.STACK.y - 0.3, 0, 2.2, 0.12, 0.1), 0.01);
    stat.add(GBOX, timber, mBox(H.STACK.x, H.STACK.y + 0.3, 0, 2.2, 0.12, 0.1), 0.01);
    H.UPRIGHT_BARRELS.forEach(function (b) { var m = new T.Mesh(bg, bmat); m.position.copy(W(b.x, b.y, 0.45)); outline(m, 0.02); scene.add(m); });

    // ---- the gong
    var G = H.GONG;
    var gong = new T.Mesh(new T.CylinderGeometry(G.r, G.r, G.t * 2, 40), toon(0x9a4f1e)); gong.rotation.x = Math.PI / 2; gong.position.copy(W(G.x, G.y, G.z)); outline(gong, 0.025); scene.add(gong);
    var gface = paintPanel(G.r * 2, G.r * 2, 256, function (g, w) { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, w); g.fillStyle = '#b8642a'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 2, 0, 7); g.fill(); g.strokeStyle = 'rgba(60,25,5,0.55)'; g.lineWidth = 5; for (var k = 1; k < 5; k++) { g.beginPath(); g.arc(w / 2, w / 2, k * w / 10, 0, 7); g.stroke(); } g.fillStyle = '#d98a3a'; g.beginPath(); g.arc(w / 2, w / 2, w * 0.13, 0, 7); g.fill(); g.fillStyle = 'rgba(255,230,180,0.45)'; g.beginPath(); g.ellipse(w * 0.34, w * 0.3, w * 0.12, w * 0.05, -0.5, 0, 7); g.fill(); label(g, 'DONG', w / 2, w * 0.78, 40, '#3a1a05', {}); });
    gface.position.copy(W(G.x, G.y - G.t - 0.005, G.z)); scene.add(gface);
    [-1, 1].forEach(function (s) { stat.add(GBOX, dark, mBox(G.x + s * (G.r + 0.12), G.y + 0.05, 0, 0.1, 0.1, G.z + G.r + 0.3), 0.012); });
    stat.add(GBOX, dark, mBox(G.x, G.y + 0.05, G.z + G.r + 0.25, G.r * 2 + 0.34, 0.1, 0.1), 0.012);
    out.gong = gong; out.gongFace = gface;

    // ---- the basket (the real spec from the engine; chains are live)
    var S = FlightlineBasket.SPEC, bx = H.BASKET.x, byy = H.BASKET.y, chainMat = toon(0xd5dbe0), band = toon(0xF2A13B);
    var basket = new T.Group(); basket.position.copy(W(bx, byy, 0)); scene.add(basket);
    function bpart(geom, mat, z, ink) { var m = new T.Mesh(geom, mat); m.position.y = z; if (ink) outline(m, ink); basket.add(m); return m; }
    bpart(cylGeom(S.poleR, S.poleTop, 12), chainMat, 0, 0.01);
    bpart(cylGeom(0.25, 0.03, 28), dark, 0, 0.01);
    bpart(latheGeom([[0.04, 0], [S.trayR - 0.06, 0], [S.trayR, S.trayDepth], [S.trayR + 0.01, S.trayDepth + 0.01]], 36), toon(0xbfc7cc, { side: T.DoubleSide }), S.trayBottomZ, 0.012);
    var bandM = bpart(new T.CylinderGeometry(S.bandR, S.bandR, S.bandH, 36, 1, true), new T.MeshToonMaterial({ color: 0xF2A13B, gradientMap: grad, side: T.DoubleSide }), S.bandBottomZ + S.bandH / 2, 0.012);
    bpart(new T.CylinderGeometry(0.06, S.bandR, S.lidRise, 24), toon(0xF2A13B), S.bandTopZ + S.lidRise / 2, 0.01);
    for (var cg = 0; cg < 14; cg++) { var a = cg / 14 * Math.PI * 2, rod = new T.Mesh(cylGeom(0.006, S.trayDepth, 4), chainMat); rod.position.set(Math.cos(a) * (S.trayR - 0.01), S.trayBottomZ, Math.sin(a) * (S.trayR - 0.01)); basket.add(rod); }
    // chains: one line strip per strand, updated from the engine's chain particles
    var defs = FlightlineBasket.strandDefs(S), P = S.segments + 1, nStr = defs.length;
    var cpos = new Float32Array(nStr * S.segments * 2 * 3);
    var cgeo = new T.BufferGeometry(); cgeo.setAttribute('position', new T.BufferAttribute(cpos, 3));
    var chains = new T.LineSegments(cgeo, new T.LineBasicMaterial({ color: 0xe9eef2 })); chains.frustumCulled = false; basket.add(chains);
    var chainsInk = new T.LineSegments(cgeo, new T.LineBasicMaterial({ color: 0x1d130c, transparent: true, opacity: 0.55 })); chainsInk.frustumCulled = false; chainsInk.position.set(0.004, -0.004, 0); basket.add(chainsInk);
    var rest = FlightlineBasket.restPose();
    function setChains(x) {
      var o = 0;
      for (var s = 0; s < nStr; s++) for (var k = 0; k < S.segments; k++) {
        var a = (s * P + k) * 3, b = a + 3;
        cpos[o++] = x[a]; cpos[o++] = x[a + 2]; cpos[o++] = -x[a + 1];
        cpos[o++] = x[b]; cpos[o++] = x[b + 2]; cpos[o++] = -x[b + 1];
      }
      cgeo.attributes.position.needsUpdate = true;
    }
    setChains(rest);
    out.basket = basket; out.setChains = setChains; out.restChains = rest;

    // putt circle painted on the floor and the two putt spots (tee mats)
    var circ = new T.Mesh(new T.RingGeometry(1.46, 1.5, 64), new T.MeshBasicMaterial({ color: 0xfff3df, transparent: true, opacity: 0.35 }));
    circ.rotation.x = -Math.PI / 2; circ.position.copy(W(bx, byy, 0.005)); scene.add(circ);
    out.mats = H.SHOTS.map(function (s) {
      var mat = paintPanel(1.1, 1.5, 256, function (g, w, h) { g.fillStyle = '#2f6b3a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff3df'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16); label(g, s.label, w / 2, h * 0.82, 50, '#fff3df', {}); });
      mat.rotation.x = -Math.PI / 2; var bearing = Math.atan2(H.BASKET.x - s.x, H.BASKET.y - s.y); mat.rotation.z = -bearing;
      mat.position.copy(W(s.x, s.y - 0.3, 0.008)); scene.add(mat); return mat;
    });

    // ---- string lights (instanced bulbs) and pendants
    var bulbGeo = new T.SphereGeometry(0.045, 8, 6), bulbMat = glow(0xffc46b);
    var strands = [];
    function cat(p0, p1, sag, n) { var pts = []; for (var i = 0; i <= n; i++) { var t = i / n; pts.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, p0[2] + (p1[2] - p0[2]) * t - sag * 4 * t * (1 - t)]); } return pts; }
    H.POSTS_X.forEach(function (x) { for (var i = 0; i < 3; i++) strands.push(cat([x, H.POSTS_Y[i], R.h - 0.5], [x, H.POSTS_Y[i + 1], R.h - 0.5], 0.7, 10)); });
    H.POSTS_Y.forEach(function (y) { strands.push(cat([R.x0 + 0.2, y, R.h - 0.8], [-2.8, y, R.h - 0.75], 0.45, 9)); strands.push(cat([-2.8, y, R.h - 0.75], [3.0, y, R.h - 0.75], 0.9, 12)); strands.push(cat([3.0, y, R.h - 0.75], [R.x1 - 0.2, y, R.h - 0.8], 0.45, 7)); });
    for (var zi = 0; zi < 3; zi++) strands.push(cat([-2.8, H.POSTS_Y[zi], R.h - 0.75], [3.0, H.POSTS_Y[zi + 1], R.h - 0.75], 1.1, 14));
    var count = 0; strands.forEach(function (s) { count += s.length - 2; });
    var bulbs = new T.InstancedMesh(bulbGeo, bulbMat, count), mm = new T.Matrix4(), bk = 0, wirePts = [];
    strands.forEach(function (s) {
      for (var i = 0; i < s.length; i++) {
        if (i > 0) { wirePts.push(W(s[i - 1][0], s[i - 1][1], s[i - 1][2]), W(s[i][0], s[i][1], s[i][2])); }
        if (i > 0 && i < s.length - 1) { mm.makeTranslation(s[i][0], s[i][2] - 0.07, -s[i][1]); bulbs.setMatrixAt(bk++, mm); }
      }
    });
    ceiling.add(bulbs);
    ceiling.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(wirePts), new T.LineBasicMaterial({ color: 0x1d130c })));
    for (var pk = 0; pk < 9; pk++) {
      var py = B.y0 + 0.8 + pk * 1.3;
      ceiling.add(new T.Line(new T.BufferGeometry().setFromPoints([W(B.x1 + 0.05, py, R.h), W(B.x1 + 0.05, py, 3.0)]), new T.LineBasicMaterial({ color: 0x1d130c })));
      var pb = new T.Mesh(new T.SphereGeometry(0.07, 10, 8), glow(0xffb85a)); pb.scale.y = 1.35; pb.position.copy(W(B.x1 + 0.05, py, 2.92)); scene.add(pb);
    }
    var ringL = new T.Mesh(new T.TorusGeometry(1.3, 0.04, 8, 64), glow(0xffe2a8)); ringL.rotation.x = Math.PI / 2; ringL.position.copy(W(-5.2, 10, 4.4)); ceiling.add(ringL);

    // ---- WALL DECOR: lots to look at
    decorate(scene, stat, out);

    // ---- lights: warm room, cool door spill, a spot on the basket
    scene.add(new T.AmbientLight(0xffe0c0, 0.38));
    scene.add(new T.HemisphereLight(0xffd7a0, 0x3a2414, 0.3));
    var key = new T.DirectionalLight(0xffe2b8, 0.5); key.position.set(-4, 9, 6); scene.add(key);
    var spot = new T.PointLight(0xffc98a, 1.1, 9, 1.6); spot.position.copy(W(bx - 0.8, byy - 1.8, 3.4)); scene.add(spot);
    var spill = new T.PointLight(0x7f8cff, 0.6, 10, 2); spill.position.copy(W(-3.4, R.y1 - 0.6, 2)); scene.add(spill);
    [[-6, 5], [-6, 15], [1, 4], [1, 18]].forEach(function (p) { var l = new T.PointLight(0xffb46b, 0.45, 9, 2); l.position.copy(W(p[0], p[1], 4.6)); scene.add(l); });

    stat.build(); ceilB.build();
    return out;
  }

  /* ---------- wall decor ---------- */
  function decorate(scene, stat, out) {
    var R = H.ROOM;
    // big neon on the left wall
    var neon = paintPanel(4.2, 1.3, 1024, function (g, w, h) {
      g.clearRect(0, 0, w, h);
      label(g, 'PUTT LEAGUE', w / 2, h * 0.42, 150, '#ff5fa2', { glow: '#ff3e7f', glowBlur: 40, stroke: 6, strokeColor: '#ffd1e4' });
      label(g, 'TAPROOM', w / 2, h * 0.82, 70, '#62f2ff', { glow: '#3be3ff', glowBlur: 30 });
    }, true);
    onWall(scene, neon, 'L', 2.0, 4.6); out.anim.push({ kind: 'neon', mesh: neon });
    // disc wall: a grid of mounted discs
    var discCols = ['#F2A13B', '#E0482F', '#3B86D9', '#2E9C9A', '#ffc93c', '#9b5de5', '#f15bb5', '#00bbf9', '#9ef01a', '#fff3df', '#ff6b35', '#4361ee'];
    var discWall = paintPanel(3.2, 1.6, 1024, function (g, w, h) {
      g.clearRect(0, 0, w, h);
      for (var r = 0; r < 3; r++) for (var c = 0; c < 6; c++) {
        var x = w * (c + 0.5) / 6 + (r % 2 ? w / 24 : 0), y = h * (r + 0.5) / 3, rad = h / 7.5, col = discCols[(r * 6 + c) % discCols.length];
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + 8, y + 8, rad, rad, 0, 0, 7); g.fill();
        g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); g.lineWidth = 7; g.strokeStyle = '#1d130c'; g.stroke();
        g.strokeStyle = 'rgba(29,19,12,0.35)'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, rad * 0.72, 0, 7); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(x - rad * 0.3, y - rad * 0.4, rad * 0.32, rad * 0.12, -0.5, 0, 7); g.fill();
      }
    });
    onWall(scene, discWall, 'L', 16.6, 2.9);
    // dartboard
    var dart = paintPanel(0.75, 0.75, 256, function (g, w) {
      var cx = w / 2; for (var k = 0; k < 20; k++) { g.fillStyle = k % 2 ? '#1d130c' : '#f4ead2'; g.beginPath(); g.moveTo(cx, cx); g.arc(cx, cx, w / 2 - 6, k / 20 * 7 - 0.16, (k + 1) / 20 * 7 - 0.16); g.fill(); }
      g.lineWidth = 10; g.strokeStyle = '#c0392b'; g.beginPath(); g.arc(cx, cx, w * 0.3, 0, 7); g.stroke(); g.strokeStyle = '#2e9c9a'; g.beginPath(); g.arc(cx, cx, w * 0.44, 0, 7); g.stroke();
      g.fillStyle = '#c0392b'; g.beginPath(); g.arc(cx, cx, 12, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = '#1d130c'; g.beginPath(); g.arc(cx, cx, w / 2 - 4, 0, 7); g.stroke();
    });
    onWall(scene, dart, 'L', 19.6, 1.8);
    // framed posters on the left wall
    var posters = [
      ['HOPS & CHAINS', 'FRIDAY PUTT NIGHT', '#E0482F', '#ffc93c'],
      ['ACE RACE', 'WIN A KEG', '#3B86D9', '#fff3df'],
      ['NO', 'TOMBSTONES', '#2E9C9A', '#fff3df'],
    ];
    posters.forEach(function (p, i) {
      var pm = paintPanel(0.9, 1.25, 256, function (g, w, h) {
        g.fillStyle = '#1d130c'; g.fillRect(0, 0, w, h); g.fillStyle = p[2]; g.fillRect(12, 12, w - 24, h - 24);
        g.fillStyle = 'rgba(255,255,255,0.12)'; for (var k = 0; k < 8; k++) { g.beginPath(); g.moveTo(w / 2, h * 0.55); g.arc(w / 2, h * 0.55, w, k * 0.8, k * 0.8 + 0.35); g.fill(); }
        label(g, p[0], w / 2, h * 0.24, 40, p[3], { stroke: 6 }); label(g, p[1], w / 2, h * 0.84, 26, '#fff3df', { stroke: 5 });
        g.fillStyle = '#fff3df'; g.beginPath(); g.arc(w / 2, h * 0.55, w * 0.18, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#1d130c'; g.stroke();
      });
      onWall(scene, pm, 'L', 21.2 + i * 1.1, 2.4 + (i % 2) * 0.2);
    });
    // pennant string over the bar
    var pen = []; for (var i = 0; i < 16; i++) pen.push(i);
    var penPts = [];
    pen.forEach(function (i) {
      var y = 3.6 + i * 0.75, z = 4.05 - Math.sin(i / 15 * Math.PI) * 0.5;
      var tri = new T.Mesh(new T.BufferGeometry().setFromPoints([W(R.x0 + 0.6, y - 0.28, z), W(R.x0 + 0.6, y + 0.28, z), W(R.x0 + 0.6, y, z - 0.42)]), new T.MeshBasicMaterial({ color: ['#E0482F', '#ffc93c', '#3B86D9', '#2E9C9A'][i % 4], side: T.DoubleSide }));
      scene.add(tri); out.anim.push({ kind: 'flutter', mesh: tri, ph: i * 0.7 });
    });
    // the right wall (brewhouse): a giant comic mural, valve wheels, a safety sign
    var mural = paintPanel(7.5, 3.6, 1024, function (g, w, h) {
      g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h);
      g.fillStyle = '#f4ead2'; g.globalAlpha = 0.92; g.beginPath();
      for (var k = 0; k < 24; k++) { var a = k / 24 * Math.PI * 2, r = k % 2 ? h * 0.3 : h * 0.47; g.lineTo(w * 0.36 + Math.cos(a) * r * 1.5, h * 0.5 + Math.sin(a) * r); } g.closePath(); g.fill();
      g.globalAlpha = 1; g.lineWidth = 12; g.strokeStyle = '#1d130c'; g.stroke();
      label(g, 'CHAAING!', w * 0.36, h * 0.52, 190, '#E0482F', { stroke: 14 });
      g.fillStyle = '#F2A13B'; g.beginPath(); g.ellipse(w * 0.8, h * 0.45, h * 0.3, h * 0.11, -0.3, 0, 7); g.fill(); g.lineWidth = 12; g.stroke();
      g.strokeStyle = '#fff3df'; g.lineWidth = 14; for (var s = 0; s < 4; s++) { g.beginPath(); g.moveTo(w * 0.62 - s * 40, h * (0.3 + s * 0.1)); g.lineTo(w * 0.52 - s * 40, h * (0.36 + s * 0.1)); g.stroke(); }
    });
    onWall(scene, mural, 'R', 17.0, 3.7);
    var safety = paintPanel(1.4, 0.9, 256, function (g, w, h) { g.fillStyle = '#ffc93c'; g.fillRect(0, 0, w, h); g.lineWidth = 12; g.strokeStyle = '#1d130c'; g.strokeRect(6, 6, w - 12, h - 12); label(g, 'CAUTION', w / 2, h * 0.28, 44, '#1d130c', {}); label(g, 'NO PUTTING', w / 2, h * 0.58, 30, '#1d130c', { font: '"Barlow Condensed", "Arial Narrow", sans-serif' }); label(g, 'IN THE MASH TUN', w / 2, h * 0.78, 30, '#1d130c', { font: '"Barlow Condensed", "Arial Narrow", sans-serif' }); });
    onWall(scene, safety, 'R', 7.4, 2.6);
    for (var v = 0; v < 4; v++) {
      var vw = new T.Mesh(new T.TorusGeometry(0.16, 0.025, 6, 20), new T.MeshToonMaterial({ color: 0xc0392b, gradientMap: grad }));
      vw.position.copy(W(R.x1 - 0.12, 3.0 + v * 3.2, 1.6 + (v % 2) * 0.5)); vw.rotation.y = Math.PI / 2; scene.add(vw); out.anim.push({ kind: 'spin', mesh: vw, rate: 0.2 + v * 0.1 });
      stat.add(cylGeom(0.05, 0.25, 8), toon(0x9aa3aa), new T.Matrix4().makeTranslation(R.x1 - 0.12, 1.4 + (v % 2) * 0.5, -(3.0 + v * 3.2)), 0.008);
    }
    [5.15, 5.35].forEach(function (z, i) { stat.add(cylGeom(0.06 - i * 0.015, R.y1 - R.y0, 10), toon(i ? 0x1d130c : 0x9aa3aa), new T.Matrix4().makeTranslation(R.x1 - 0.5 - i * 0.3, z, -R.y0).multiply(new T.Matrix4().makeRotationX(-Math.PI / 2)), 0.008); });
    // back wall: arched windows, a glowing round sign, a chalkboard, a clock
    [1.4 - 3.0, 5.0, 6.8].forEach(function (cx, i) {
      var win = paintPanel(1.3, 2.9, 256, function (g, w, h) {
        g.fillStyle = '#1d130c'; g.fillRect(0, 0, w, h);
        var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a3a8a'); gr.addColorStop(1, '#f08a4b'); g.fillStyle = gr;
        g.beginPath(); g.moveTo(14, h - 14); g.lineTo(14, w / 2); g.arc(w / 2, w / 2, w / 2 - 14, Math.PI, 0); g.lineTo(w - 14, h - 14); g.closePath(); g.fill();
        g.strokeStyle = '#1d130c'; g.lineWidth = 8; g.beginPath(); g.moveTo(w / 2, 14); g.lineTo(w / 2, h - 14); g.moveTo(14, h * 0.45); g.lineTo(w - 14, h * 0.45); g.moveTo(14, h * 0.72); g.lineTo(w - 14, h * 0.72); g.stroke();
      }, true);
      onWall(scene, win, 'B', cx, 2.6);
    });
    var roundSign = paintPanel(1.8, 1.8, 512, function (g, w) { g.clearRect(0, 0, w, w); g.lineWidth = 26; g.strokeStyle = '#8ed8ff'; g.shadowColor = '#3be3ff'; g.shadowBlur = 40; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 40, 0, 7); g.stroke(); g.shadowBlur = 0; g.fillStyle = '#f2a13b'; g.beginPath(); g.arc(w / 2, w / 2, w * 0.28, 0, 7); g.fill(); label(g, 'HOP', w / 2, w * 0.43, 90, '#1d130c', {}); label(g, 'YARD', w / 2, w * 0.6, 90, '#1d130c', {}); }, true);
    onWall(scene, roundSign, 'B', -7.2, 3.6);
    var chalk = paintPanel(2.2, 1.4, 512, function (g, w, h) {
      g.fillStyle = '#6b3f22'; g.fillRect(0, 0, w, h); g.fillStyle = '#20282b'; g.fillRect(16, 16, w - 32, h - 32);
      label(g, 'TONIGHT', w / 2, h * 0.2, 56, '#fff3df', {});
      ['PAIR IT: +1500', 'GONG BANK: JACKPOT', 'SKIP IN: +2000', 'MISSES PAY TOO'].forEach(function (t, k) { label(g, t, w / 2, h * (0.4 + k * 0.15), 34, ['#ffc93c', '#ff8fb3', '#8ed8ff', '#d9f2a6'][k], { font: '"Permanent Marker", "Marker Felt", cursive', weight: '400' }); });
    });
    onWall(scene, chalk, 'B', 3.4, 3.9);
    var clock = paintPanel(0.7, 0.7, 256, function (g, w) { g.fillStyle = '#fff3df'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 8, 0, 7); g.fill(); g.lineWidth = 12; g.strokeStyle = '#1d130c'; g.stroke(); for (var k = 0; k < 12; k++) { var a = k / 12 * 7; g.fillStyle = '#1d130c'; g.fillRect(w / 2 + Math.cos(a) * w * 0.36 - 5, w / 2 + Math.sin(a) * w * 0.36 - 5, 10, 10); } label(g, '19TH HOLE', w / 2, w * 0.68, 26, '#E0482F', {}); });
    onWall(scene, clock, 'B', 0.2, 4.4);
    var hand = new T.Mesh(new T.PlaneGeometry(0.04, 0.24), new T.MeshBasicMaterial({ color: 0x1d130c })); hand.geometry.translate(0, 0.1, 0); onWall(scene, hand, 'B', 0.2, 4.4, 0.04); out.anim.push({ kind: 'clock', mesh: hand });
    // front wall (seen from the drone and the basket view)
    var big = paintPanel(6, 2.2, 1024, function (g, w, h) { g.clearRect(0, 0, w, h); label(g, 'TWO PUTTS. ALL THE POINTS.', w / 2, h * 0.5, 120, '#ffc93c', { stroke: 14 }); });
    onWall(scene, big, 'F', -1.0, 3.9);
    var jukebox = new T.Mesh(new T.BoxGeometry(0.9, 1.7, 0.6), toon(0x8a2a5a)); jukebox.position.copy(W(-6.2, R.y0 + 0.35, 0.85)); outline(jukebox, 0.02); scene.add(jukebox);
    var jbFace = paintPanel(0.7, 1.2, 256, function (g, w, h) { var gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ff5fa2'); gr.addColorStop(0.5, '#ffc93c'); gr.addColorStop(1, '#62f2ff'); g.fillStyle = gr; g.beginPath(); g.moveTo(10, h - 10); g.lineTo(10, w / 2); g.arc(w / 2, w / 2, w / 2 - 10, Math.PI, 0); g.lineTo(w - 10, h - 10); g.fill(); g.fillStyle = '#1d130c'; g.fillRect(w * 0.2, h * 0.45, w * 0.6, h * 0.3); }, true);
    jbFace.position.copy(W(-6.2, R.y0 + 0.66, 0.95)); jbFace.rotation.y = Math.PI; scene.add(jbFace); out.anim.push({ kind: 'pulse', mesh: jbFace });
    // hanging plants from the beams
    [[-4.5, 3.0], [-0.2, 9.0], [5.6, 15.0], [-6.6, 21.0], [1.6, 21.0]].forEach(function (p) {
      scene.add(new T.Line(new T.BufferGeometry().setFromPoints([W(p[0], p[1], 5.25), W(p[0], p[1], 4.3)]), new T.LineBasicMaterial({ color: 0x1d130c })));
      var pot = new T.Mesh(cylGeom(0.16, 0.22, 12, 0.2), toon(0xb5532a)); pot.position.copy(W(p[0], p[1], 4.1)); outline(pot, 0.012); scene.add(pot);
      for (var l = 0; l < 7; l++) { var lf = new T.Mesh(new T.SphereGeometry(0.12, 8, 6), toon(0x3f8a3a)); var a = l / 7 * 6.28; lf.position.copy(W(p[0] + Math.cos(a) * 0.17, p[1] + Math.sin(a) * 0.17, 4.05 - (l % 3) * 0.18)); lf.scale.set(1, 1.6, 1); scene.add(lf); }
    });
    // a bike hung on the right wall, because breweries
    var bike = new T.Group();
    [-0.55, 0.55].forEach(function (o) { var wh = new T.Mesh(new T.TorusGeometry(0.33, 0.03, 6, 24), toon(0x1d130c)); wh.position.set(o, 0, 0); bike.add(wh); });
    var frame = new T.Mesh(new T.BufferGeometry().setFromPoints([new T.Vector3(-0.55, 0, 0), new T.Vector3(-0.1, 0.35, 0), new T.Vector3(0.45, 0.35, 0), new T.Vector3(0.55, 0, 0), new T.Vector3(0.05, 0, 0), new T.Vector3(-0.1, 0.35, 0)]), new T.LineBasicMaterial({ color: 0x2e9c9a }));
    bike.add(new T.Line(frame.geometry, frame.material)); bike.position.copy(W(R.x1 - 0.1, 12.6, 4.2)); bike.rotation.y = -Math.PI / 2; scene.add(bike);
  }

  /* ---------- the disc ---------- */
  function makeDisc(color) {
    var r = 0.1055, prof = [[0.001, -0.008], [r * 0.9, -0.01], [r, -0.004], [r, 0.004], [r * 0.92, 0.01], [0.001, 0.011]];
    var m = new T.Mesh(latheGeom(prof, 32), toon(color || 0xF2A13B)); outline(m, 0.008);
    var stamp = new T.Mesh(new T.CircleGeometry(r * 0.55, 20), new T.MeshBasicMaterial({ color: 0xfff3df })); stamp.rotation.x = -Math.PI / 2; stamp.position.y = 0.0115; m.add(stamp);
    var bar = new T.Mesh(new T.PlaneGeometry(r * 0.9, 0.012), new T.MeshBasicMaterial({ color: 0x1d130c })); bar.rotation.x = -Math.PI / 2; bar.position.y = 0.012; m.add(bar);
    return m;
  }

  return { build: build, makeDisc: makeDisc, W: W, toon: toon, outline: outline, grad: grad };
})();
