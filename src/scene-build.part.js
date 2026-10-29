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
      } else {
        for (var cr = 0; cr < 4; cr++) { var col = [0xc0392b, 0x2E9C9A, 0xF2A13B, 0x3B86D9][cr]; stat.add(GBOX, toon(col), mBox(b.x + (cr % 2 ? 0.45 : -0.45), b.y, Math.floor(cr / 2) * 0.9, 0.86, b.hy * 2, 0.86), 0.02); }
        var sign = paintPanel(1.6, 0.5, 256, function (g, w, h) { g.fillStyle = '#1d130c'; g.fillRect(0, 0, w, h); label(g, 'CRATE BANK', w / 2, h / 2, 50, '#ffc93c', {}); }); sign.position.copy(W(b.x, b.y - b.hy - 0.02, b.h + 0.3)); scene.add(sign);
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
    [[G.x0, (G.y0 + G.y1) / 2, gl, Math.PI / 2], [G.x1, (G.y0 + G.y1) / 2, gl, -Math.PI / 2], [0, G.y1, gw, 0]].forEach(function (f) {
      var m = plane(f[2], 1.9, TEX.fence, [f[2] / 2, 1]); m.material.side = T.DoubleSide; m.rotation.y = f[3]; m.position.copy(f[3] === 0 ? W(f[0], f[1], 0.95) : W(f[0], f[1], 0.95)); scene.add(m);
    });
    for (var fx = G.x0; fx <= G.x1; fx += 4) stat.add(GBOX, dark, mBox(fx, G.y1, 0, 0.14, 0.14, 2.0), 0.01);
    for (var fy = G.y0; fy <= G.y1; fy += 4) { stat.add(GBOX, dark, mBox(G.x0, fy, 0, 0.14, 0.14, 2.0), 0.01); stat.add(GBOX, dark, mBox(G.x1, fy, 0, 0.14, 0.14, 2.0), 0.01); }
    // trees beyond the fence (silhouettes)
    for (var t = 0; t < 22; t++) { var tx = -30 + t * 3 + (t % 3), ty = G.y1 + 6 + (t % 4) * 2.5, s = 3 + (t % 3); var tr = new T.Mesh(new T.SphereGeometry(s, 10, 8), toon(0x1f3a1a)); tr.position.copy(W(tx, ty, s + 2)); scene.add(tr); }
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
    // a little stage in the corner with a mic and amp
    stat.add(GBOX, toon(0x3a2418), mBox(13.5, 50, 0, 4, 3, 0.4), 0.015);
    stat.add(GBOX, dark, mBox(13.5, 50.5, 0.4, 0.6, 0.4, 0.8), 0.012);
    stat.add(cylGeom(0.02, 1.5, 6), toon(0x9aa3aa), at(12.6, 49.6, 0.4), 0.006);
  }

  /* ---------- the disc ---------- */
  function makeDisc(color) {
    var r = 0.1055, m = new T.Mesh(latheGeom([[0.001, -0.008], [r * 0.9, -0.01], [r, -0.004], [r, 0.004], [r * 0.92, 0.01], [0.001, 0.011]], 32), new T.MeshToonMaterial({ color: color || 0xF2A13B, gradientMap: grad })); outline(m, 0.008);
    var stamp = new T.Mesh(new T.CircleGeometry(r * 0.55, 20), new T.MeshBasicMaterial({ color: 0xfff3df })); stamp.rotation.x = -Math.PI / 2; stamp.position.y = 0.0115; m.add(stamp);
    var bar = new T.Mesh(new T.PlaneGeometry(r * 0.9, 0.012), new T.MeshBasicMaterial({ color: 0x1d130c })); bar.rotation.x = -Math.PI / 2; bar.position.y = 0.012; m.add(bar);
    return m;
  }

  return { build: build, makeDisc: makeDisc, W: W, toon: toon, outline: outline, grad: grad };
})();
