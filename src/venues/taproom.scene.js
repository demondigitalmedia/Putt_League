/* =====================================================================
   PUTT LEAGUE · VENUE · THE TAPROOM · 3D SCENE (three.js r128, browser only)
   The taproom (brick, timber, copper kettles, the bar), the beer garden and the back lot, built
   with the scene kit (scene.js: toon materials, ink outlines, painted panels, merged batches) from
   the numbers in taproom.js. Also the bonus targets the flyover calls out and the game makes glow.
   ===================================================================== */
(function (Venues) {
  'use strict';
  var T, C, W, toon, glow, outline, canvas, rnd, TEX, paintPanel, signBoard, label, cylGeom, latheGeom, mBox, at, GBOX, plane, dressHoles;
  function bind(K) { T = K.T; C = K.C; W = K.W; toon = K.toon; glow = K.glow; outline = K.outline; canvas = K.canvas; rnd = K.rnd; TEX = K.TEX; paintPanel = K.paintPanel; signBoard = K.signBoard; label = K.label; cylGeom = K.cylGeom; latheGeom = K.latheGeom; mBox = K.mBox; at = K.at; GBOX = K.GBOX; plane = K.plane; dressHoles = K.dressHoles; }

  // place a panel flat on a wall: wall = 'L' (x0), 'R' (x1), 'B' (back y1), 'F' (front y0); u along the wall, z height
  function onWall(scene, mesh, wall, u, z, lift) {
    var R = C.ROOM, d = lift || 0.03;
    if (wall === 'L') { mesh.position.copy(W(R.x0 + d, u, z)); mesh.rotation.y = Math.PI / 2; }
    if (wall === 'R') { mesh.position.copy(W(R.x1 - d, u, z)); mesh.rotation.y = -Math.PI / 2; }
    if (wall === 'B') { mesh.position.copy(W(u, R.y1 - d, z)); }
    if (wall === 'F') { mesh.position.copy(W(u, R.y0 + d, z)); mesh.rotation.y = Math.PI; }
    scene.add(mesh); return mesh;
  }

  /* ---------- the whole venue (the kit made the scene, the static batches and out) ---------- */
  function buildScene(K, scene, stat, ceilB, out) {
    bind(K);
    var R = C.ROOM, G = C.GARDEN, D = C.DOOR, ceiling = out.ceiling;
    scene.background = new T.Color(0x1b1430);
    scene.fog = new T.Fog(0x2a1d2c, 30, 95);

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

    // ---- baskets, their bank boards and the tee mats
    dressHoles(scene, stat, out);

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

  /* ---------- bonus targets: called out in the flyover, then the thing itself glows (one list per hole) ---------- */
  function bonus(B) {
    var T = B.T, C = B.C, box3 = B.box3, origin = B.origin, skipSpot = B.skipSpot;
    return [
      [{ id: 'gong', color: 0xffc93c, label: 'RING THE GONG', sub: 'BANK IT IN: JACKPOT', p: function () { var b = C.HOLES[0].backstop; return [b.x, b.y, b.z + b.r + 0.3]; },
         shells: function () { var b = C.HOLES[0].backstop, g = new T.CylinderGeometry(b.r, b.r, 0.12, 32); g.rotateX(Math.PI / 2); return [[g, b.x, b.y, b.z]]; } },
       { id: 'stack', color: 0xff8f6b, label: 'OVER THE BARRELS', sub: '+800 ON A MAKE', p: function () { return [C.STACK.x, C.STACK.y, 1.6]; }, when: function () { return origin().y < C.STACK.y; },
         shells: function () { return [[box3(2.15, 1.3, 0.95), C.STACK.x, C.STACK.y, 0.67]]; } },
       { id: 'kegs', color: 0x8ed8ff, label: 'OVER THE KEGS', sub: '+800 ON A MAKE', p: function () { return [-0.52, 22.6, 1.5]; }, when: function () { return origin().y < 22.6; },
         shells: function () { return [[box3(1.85, 1.22, 0.46), -0.52, 22.6, 0.61]]; } },
       { id: 'skip', color: 0x5fe0c8, label: 'SKIP IT IN', sub: 'AIM AT THE FLOOR, NOSE DOWN: +2000', p: function () { return skipSpot().concat([0.15]); }, floor: true }],
      [{ id: 'door', color: 0x9ef01a, label: 'THREAD THE DOOR', sub: '+1000 ON A MAKE', p: function () { return [(C.DOOR.x0 + C.DOOR.x1) / 2, C.ROOM.y1, C.DOOR.h + 0.3]; }, when: function () { return origin().y < C.ROOM.y1; },
         shells: function () { var D = C.DOOR, y = C.ROOM.y1, w = D.x1 - D.x0; return [[box3(0.2, D.h, 0.4), D.x0, y, D.h / 2], [box3(0.2, D.h, 0.4), D.x1, y, D.h / 2], [box3(w, 0.2, 0.4), (D.x0 + D.x1) / 2, y, D.h]]; } },
       { id: 'kegwall', color: 0xffc93c, label: 'KEG BANK', sub: 'BANK IT IN: JACKPOT', p: function () { var b = C.HOLES[1].backstop; return [b.x, b.y, b.h + 0.4]; },
         shells: function () { var b = C.HOLES[1].backstop; return [[box3(b.hx * 2, b.h, b.hy * 2), b.x, b.y, b.h / 2]]; } }],
      [{ id: 'oak', color: 0x9ef01a, label: 'UNDER THE OAK', sub: '+800  ·  TREE KISS +300', p: function () { return [C.OAK.x, C.OAK.y, 3.0]; }, when: function () { return origin().y < C.OAK.y; },
         shells: function () { return C.OAK.canopy.map(function (c) { var g = new T.IcosahedronGeometry(c.r, 1); g.scale(1, 0.75, 1); return [g, C.OAK.x + c.dx, C.OAK.y + c.dy, c.z]; }); } },
       { id: 'crates', color: 0xffc93c, label: 'CRATE BANK', sub: 'BANK IT IN: JACKPOT', p: function () { var b = C.HOLES[2].backstop; return [b.x, b.y, b.h + 0.4]; },
         shells: function () { var b = C.HOLES[2].backstop; return [[box3(b.hx * 2, b.h, b.hy * 2), b.x, b.y, b.h / 2]]; } },
       { id: 'truck', color: 0xff8f6b, label: 'TACO TRUCK', sub: 'HIT IT: +250', p: function () { return [C.TRUCK.x, C.TRUCK.y, C.TRUCK.h + 0.5]; },
         shells: function () { var t = C.TRUCK; return [[box3(t.hx * 2, t.h - 0.3, t.hy * 2), t.x, t.y, 0.3 + (t.h - 0.3) / 2]]; } }],
      [{ id: 'silo', color: 0x8ed8ff, label: 'SILO SLAM', sub: 'BANK OFF THE SILO: +1500', p: function () { return [C.SILO.x, C.SILO.y, 5.5]; },
         shells: function () { var s = C.SILO, g = new T.CylinderGeometry(s.r, s.r, s.h, 28); return [[g, s.x, s.y, s.h / 2]]; } },
       { id: 'sacks', color: 0xffc93c, label: 'SACK BANK', sub: 'BANK IT IN: JACKPOT', p: function () { var b = C.HOLES[3].backstop; return [b.x, b.y, b.h + 0.5]; },
         shells: function () { var b = C.HOLES[3].backstop; return [[-0.55, 0], [0, 0], [0.55, 0], [-0.28, 0.5], [0.28, 0.5], [0, 1.0]].map(function (q) { var sg = new T.SphereGeometry(0.34, 12, 8); sg.scale(1.0, 0.75, 1.25); return [sg, b.x + q[0], b.y, 0.26 + q[1]]; }); } }],
      [{ id: 'under', color: 0x5fe0c8, label: 'UNDER THE TRUCK', sub: 'SKIP IT UNDER: +1000', p: function () { return [C.BOX_TRUCK.x, C.BOX_TRUCK.y, C.BOX_TRUCK.z1 + 0.5]; },
         shells: function () { var t = C.BOX_TRUCK; return [[box3(t.hx * 2 - 0.1, t.z0 - 0.05, t.hy * 2 - 0.1), t.x, t.y, t.z0 / 2]]; } },
       { id: 'pallets', color: 0xffc93c, label: 'PALLET BANK', sub: 'BANK IT IN: JACKPOT', p: function () { var b = C.HOLES[4].backstop; return [b.x, b.y, b.h + 0.5]; },
         shells: function () { var b = C.HOLES[4].backstop; return [[box3(b.hx * 2, b.h, b.hy * 2), b.x, b.y, b.h / 2]]; } }],
      [{ id: 'under6', color: 0x5fe0c8, label: 'UNDER THE TRUCK', sub: 'SKIP IT UNDER: +1000', p: function () { return [C.BOX_TRUCK.x, C.BOX_TRUCK.y, C.BOX_TRUCK.z1 + 0.5]; },
         shells: function () { var t = C.BOX_TRUCK; return [[box3(t.hx * 2 - 0.1, t.z0 - 0.05, t.hy * 2 - 0.1), t.x, t.y, t.z0 / 2]]; } },
       { id: 'dock', color: 0xffc93c, label: 'DOCK BANK', sub: 'BANK IT IN: JACKPOT', p: function () { var b = C.HOLES[5].backstop; return [b.x, b.y - b.hy, b.h + 0.6]; },
         shells: function () { var b = C.HOLES[5].backstop, bk = C.HOLES[5].basket; return [[box3(3.2, b.h, 0.3), bk.x, b.y - b.hy + 0.15, b.h / 2]]; } }]
    ];
  }

  Venues.register({ id: 'taproom', buildScene: buildScene, bonus: bonus });
})(Venues);
