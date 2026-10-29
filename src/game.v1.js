/* =====================================================================
   PUTT LEAGUE · BREWERY · GAME
   Aim (tap a target, set power, tilt the nose) -> flick the disc (Putt Reader 1.1 reading)
   -> the engines simulate the whole putt -> it plays back in the 3D taproom with a chase cam
   -> every reason to score pops as a comic award -> two putts, then the hole card.
   ===================================================================== */
(function () {
  'use strict';
  var T = THREE, H = BreweryHole, SC = BreweryScene, FT = 0.3048;
  var E = { P: FlightlinePhysics, FB: FlightlineBasket, CT: DDMContact, MATS: DDMMaterials };
  H.installFloor(E.MATS);
  var $ = function (id) { return document.getElementById(id); };
  var app = $('app'), stage = $('stage'), glc = $('gl'), inkc = $('ink'), fxc = $('fx'), ink = inkc.getContext('2d'), fx = fxc.getContext('2d');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, k) { return a + (b - a) * k; }

  /* ---------- renderer and world ---------- */
  var renderer;
  try { renderer = new T.WebGLRenderer({ canvas: glc, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { $('loading').textContent = 'THIS BROWSER CANNOT DRAW 3D HERE'; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  var world = SC.build(renderer), scene = world.scene;
  var camera = new T.PerspectiveCamera(58, 1, 0.05, 90);
  var disc = SC.makeDisc(0xF2A13B); disc.visible = false; scene.add(disc);
  var aimRing = new T.Mesh(new T.RingGeometry(0.16, 0.22, 32), new T.MeshBasicMaterial({ color: 0xF2A13B, transparent: true, opacity: 0.9, side: T.DoubleSide, depthTest: false }));
  aimRing.visible = false; aimRing.renderOrder = 5; scene.add(aimRing);

  /* ---------- game state ---------- */
  var CUT = { TL: [9, 24, 36], TR: [5, 16, 35] }, MAXA = 50;
  var G = {
    shot: 0, score: 0, shown: 0, streak: 0, missStreak: 0, results: [], jackpot: false,
    state: 'aim', view: 'tee', power: 0, nose: 0, target: null, solved: {}, solveTok: 0,
    peaks: [], medianPeak: 2.6, rec: null, play: null, lastPlay: null
  };
  function shot() { return H.SHOTS[G.shot]; }
  function shotDist(s) { return Math.hypot(H.BASKET.x - s.x, H.BASKET.y - s.y); }

  /* ---------- layout ---------- */
  var L = {};
  function layout() {
    var r = app.getBoundingClientRect(), W = r.width, Hh = r.height, dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setSize(W, Hh, false); camera.aspect = W / Hh; camera.fov = W / Hh < 0.7 ? 62 : 52; camera.updateProjectionMatrix();
    [inkc, fxc].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(Hh * dpr); c.style.width = W + 'px'; c.style.height = Hh + 'px'; });
    ink.setTransform(dpr, 0, 0, dpr, 0, 0); fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sb = parseFloat(getComputedStyle(document.documentElement).paddingBottom) || 0;
    var R = 46, cx = W / 2, cy = Hh - sb - 18 - R - 18;
    var fanR = Math.max(120, Math.min((W / 2 - 8) / Math.sin(MAXA * Math.PI / 180), cy - 120));
    L = { W: W, H: Hh, R: R, cx: cx, cy: cy, fanR: fanR, sb: sb };
    var dw = $('discWrap'); dw.style.left = (cx - R) + 'px'; dw.style.top = (cy - R) + 'px'; dw.style.width = dw.style.height = (R * 2) + 'px';
    var side = Math.max(12, W * 0.035);
    var vw = $('viewWrap'); vw.style.left = side + 'px'; vw.style.top = (cy + R - 62) + 'px';
    var pw = $('powerWrap'); pw.style.right = side + 'px'; pw.style.top = (cy + R - 196) + 'px';
    $('hint').style.top = (cy + R + 10) + 'px';
    $('call').style.top = (cy - R - 52) + 'px';
    $('tally').style.top = Math.round(Hh * 0.2) + 'px';
    drawFan();
  }

  /* ---------- the fan (Putt Reader 1.1 zones) ---------- */
  function pt(a, rad) { var t = a * Math.PI / 180; return [L.cx - Math.sin(t) * rad, L.cy - Math.cos(t) * rad]; }
  function wedge(a0, a1, rad) { var p0 = pt(a0, rad), p1 = pt(a1, rad); return 'M' + L.cx + ' ' + L.cy + ' L' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + rad + ' ' + rad + ' 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' Z'; }
  function drawFan() {
    var f = $('fan'), R = L.fanR, A = MAXA, a = pt(A, R), b = pt(-A, R);
    f.setAttribute('width', L.W); f.setAttribute('height', L.H); f.setAttribute('viewBox', '0 0 ' + L.W + ' ' + L.H);
    var rays = '';
    [CUT.TL[1], CUT.TL[2]].forEach(function (an) { var p = pt(an, R); rays += '<path d="M' + L.cx + ' ' + L.cy + ' L' + p[0] + ' ' + p[1] + '" stroke="rgba(255,243,223,0.25)" stroke-width="1.5" stroke-dasharray="4 7"/>'; });
    [CUT.TR[1], CUT.TR[2]].forEach(function (an) { var p = pt(-an, R); rays += '<path d="M' + L.cx + ' ' + L.cy + ' L' + p[0] + ' ' + p[1] + '" stroke="rgba(255,243,223,0.25)" stroke-width="1.5" stroke-dasharray="4 7"/>'; });
    f.innerHTML =
      '<path d="' + wedge(A, CUT.TL[0], R) + '" fill="rgba(224,72,47,0.16)"/>' +
      '<path d="' + wedge(CUT.TL[0], -CUT.TR[0], R) + '" fill="rgba(255,243,223,0.12)"/>' +
      '<path d="' + wedge(-CUT.TR[0], -A, R) + '" fill="rgba(59,134,217,0.16)"/>' + rays +
      '<path d="M' + a[0] + ' ' + a[1] + ' A' + R + ' ' + R + ' 0 0 1 ' + b[0] + ' ' + b[1] + '" fill="none" stroke="#1d130c" stroke-width="6" stroke-dasharray="14 10" stroke-linecap="round" opacity="0.5"/>' +
      '<path d="M' + a[0] + ' ' + a[1] + ' A' + R + ' ' + R + ' 0 0 1 ' + b[0] + ' ' + b[1] + '" fill="none" stroke="#FFF3DF" stroke-width="2.5" stroke-dasharray="14 10" stroke-linecap="round" opacity="0.8"/>';
  }

  /* ---------- power bar ---------- */
  var PCOL = ['#3B86D9', '#5AA5F2', '#8fc4d8', '#FFF3DF', '#ffc93c', '#F2A13B', '#E0482F'];
  (function () { var p = $('power'), h = ''; for (var i = 0; i < 7; i++) h += '<span class="seg' + (i === 3 ? ' mid' : '') + '" style="--c:' + PCOL[i] + '"></span>'; p.innerHTML = h; })();
  function showPower() {
    var segs = document.querySelectorAll('#power .seg');
    for (var i = 0; i < 7; i++) segs[i].classList.toggle('on', i <= G.power + 3);
    $('pwVal').textContent = G.power === 0 ? 'AUTO' : (G.power > 0 ? '+' : '') + G.power;
    $('power').setAttribute('aria-valuenow', G.power); $('power').setAttribute('aria-valuetext', G.power === 0 ? 'Auto' : (G.power > 0 ? 'Plus ' : 'Minus ') + Math.abs(G.power));
  }
  (function () {
    var p = $('power'), drag = false;
    function setFromY(y) { var r = p.getBoundingClientRect(), k = 1 - clamp((y - r.top) / r.height, 0, 0.999); G.power = Math.floor(k * 7) - 3; showPower(); }
    p.addEventListener('pointerdown', function (e) { if (G.state !== 'aim') return; drag = true; try { p.setPointerCapture(e.pointerId); } catch (x) {} setFromY(e.clientY); e.preventDefault(); e.stopPropagation(); });
    p.addEventListener('pointermove', function (e) { if (drag) setFromY(e.clientY); });
    p.addEventListener('pointerup', function () { drag = false; });
    p.addEventListener('pointercancel', function () { drag = false; });
    p.addEventListener('keydown', function (e) { if (e.key === 'ArrowUp') { G.power = Math.min(3, G.power + 1); showPower(); } if (e.key === 'ArrowDown') { G.power = Math.max(-3, G.power - 1); showPower(); } });
  })();

  /* ---------- the flick (Putt Reader 1.1) ---------- */
  function ang(a, b) { return Math.atan2(-(b.x - a.x), -(b.y - a.y)) * 180 / Math.PI; }
  function mag(m, Tt) { return m < Tt[0] ? 0 : m < Tt[1] ? 1 : m < Tt[2] ? 2 : 3; }
  function classify(score) { var M = mag(Math.abs(score), score >= 0 ? CUT.TL : CUT.TR); return M === 0 ? 0 : (score > 0 ? M : -M); }
  function analyze(pts) {
    if (pts.length < 3) return { ok: false, why: 'tap' };
    var turn = 0, i; for (i = 1; i < pts.length; i++) if (pts[i].y > pts[turn].y) turn = i;
    var end = pts.length - 1, peak = 0, sp = [];
    for (var j = turn + 1; j < pts.length; j++) { var dt = Math.max(4, pts[j].t - pts[j - 1].t), v = Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y) / dt; sp.push(v); if (v > peak) peak = v; }
    for (var s = sp.length - 1; s >= 0; s--) { if (sp[s] >= peak * 0.2) { end = turn + 1 + s; break; } }
    var F = pts.slice(turn, end + 1), len = 0;
    for (var q = 1; q < F.length; q++) len += Math.hypot(F[q].x - F[q - 1].x, F[q].y - F[q - 1].y);
    var rise = F[0].y - F[F.length - 1].y;
    if (F.length < 3 || len < 30 || rise < 20) return { ok: false, why: 'noflick' };
    var chord = ang(F[0], F[F.length - 1]);
    return { ok: true, chord: chord, read: classify(chord), peak: peak, len: len, turn: turn, end: end };
  }
  var CLASS_NAME = { 3: 'A TON OF HYZER', 2: 'SOME HYZER', 1: 'A LITTLE HYZER', 0: 'FLAT', '-1': 'A LITTLE ANNY', '-2': 'SOME ANNY', '-3': 'A TON OF ANNY' };
  function classCenter(c) {
    if (c === 0) return (CUT.TL[0] - CUT.TR[0]) / 2;
    var Tt = c > 0 ? CUT.TL : CUT.TR, m = Math.abs(c), v = m === 1 ? (Tt[0] + Tt[1]) / 2 : m === 2 ? (Tt[1] + Tt[2]) / 2 : Tt[2] + 7;
    return c > 0 ? v : -v;
  }

  /* ---------- solving the putt for each flick class (in the background while you aim) ---------- */
  function scheduleSolve() {
    var tok = ++G.solveTok, order = [0, 1, -1, 2, -2, 3, -3], s = shot(), tg = G.target;
    G.solved = {};
    (function next(i) {
      if (tok !== G.solveTok || i >= order.length) return;
      setTimeout(function () { if (tok !== G.solveTok) return; if (!G.solved[order[i]]) G.solved[order[i]] = H.solve(E.P, s, order[i], 0, tg, 0); next(i + 1); }, 16);
    })(0);
  }
  function solved(c) { return G.solved[c] || (G.solved[c] = H.solve(E.P, shot(), c, 0, G.target, 0)); }

  /* ---------- input: the disc (stroke) and the room (target) ---------- */
  var IN = { pid: null, pts: [], hold: null, down: null, tilt: false, tiltBase: 0, roomDown: null };
  function local(e) { var r = app.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp || performance.now() }; }
  function onDisc(p) { return Math.hypot(p.x - L.cx, p.y - L.cy) <= L.R * 1.45; }
  app.addEventListener('pointerdown', function (e) {
    if (G.state !== 'aim' || IN.pid !== null || !$('sheet').hidden) return;
    if (e.target.closest && e.target.closest('#top button, #viewBtn, #power, #card, #sheet, #skipBtn')) return;
    var p = local(e);
    if (!onDisc(p)) { IN.roomDown = { p: p, id: e.pointerId }; return; }
    e.preventDefault();
    IN.pid = e.pointerId; try { app.setPointerCapture(e.pointerId); } catch (x) {}
    IN.pts = [p]; IN.down = p; IN.tilt = false;
    clearTimeout(IN.hold);
    IN.hold = setTimeout(function () {
      var l = IN.pts[IN.pts.length - 1];
      if (IN.pid !== null && Math.hypot(l.x - IN.down.x, l.y - IN.down.y) < 7) { IN.tilt = true; IN.tiltBase = G.nose; try { navigator.vibrate && navigator.vibrate(12); } catch (x) {} setHint(); }
    }, 450);
  });
  app.addEventListener('pointermove', function (e) {
    if (e.pointerId !== IN.pid) return;
    e.preventDefault();
    var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; if (!list.length) list = [e];
    if (IN.tilt) {
      var p = local(list[list.length - 1]), n = clamp(IN.tiltBase + Math.round(-(p.y - IN.down.y) / 22), -3, 3);
      if (n !== G.nose) { G.nose = n; showNose(); try { navigator.vibrate && navigator.vibrate(6); } catch (x) {} }
      return;
    }
    for (var i = 0; i < list.length; i++) IN.pts.push(local(list[i]));
    var l = IN.pts[IN.pts.length - 1];
    if (IN.hold && Math.hypot(l.x - IN.down.x, l.y - IN.down.y) >= 7) { clearTimeout(IN.hold); IN.hold = null; }
    drawStroke();
  });
  function finish(e) {
    if (IN.roomDown && e.pointerId === IN.roomDown.id) {
      var p = local(e), d = IN.roomDown.p; IN.roomDown = null;
      if (e.type === 'pointerup' && Math.hypot(p.x - d.x, p.y - d.y) < 12 && G.state === 'aim') pickTarget(p);
      return;
    }
    if (e.pointerId !== IN.pid) return;
    IN.pid = null; clearTimeout(IN.hold); IN.hold = null;
    try { app.releasePointerCapture(e.pointerId); } catch (x) {}
    if (IN.tilt) { IN.tilt = false; IN.pts = []; drawStroke(); setHint(); return; }
    if (e.type === 'pointerup') IN.pts.push(local(e));
    var a = analyze(IN.pts);
    if (!a.ok) { IN.pts = []; drawStroke(); flashHint(a.why === 'tap' ? 'PULL BACK, THEN FLICK UP' : 'NO FLICK. PULL BACK AND FLICK'); return; }
    drawStroke(a);
    throwPutt(a);
  }
  app.addEventListener('pointerup', finish);
  app.addEventListener('pointercancel', finish);

  function drawStroke(a) {
    ink.clearRect(0, 0, L.W, L.H);
    var pts = IN.pts; if (pts.length < 2) return;
    var turn = 0; for (var i = 1; i < pts.length; i++) if (pts[i].y > pts[turn].y) turn = i;
    ink.lineCap = 'round'; ink.lineJoin = 'round';
    function path(from, to) { ink.beginPath(); ink.moveTo(pts[from].x, pts[from].y); for (var k = from + 1; k <= to; k++) ink.lineTo(pts[k].x, pts[k].y); }
    if (turn > 0) { path(0, turn); ink.setLineDash([5, 6]); ink.strokeStyle = 'rgba(255,243,223,0.6)'; ink.lineWidth = 3; ink.stroke(); ink.setLineDash([]); }
    var end = a ? a.end : pts.length - 1, col = a ? (a.read > 0 ? '#E0482F' : a.read < 0 ? '#3B86D9' : '#FFF3DF') : '#FFF3DF';
    if (end > turn) { path(turn, end); ink.strokeStyle = '#1d130c'; ink.lineWidth = 10; ink.stroke(); ink.strokeStyle = col; ink.lineWidth = 5; ink.stroke(); }
  }
  function showNose() {
    $('disc').style.setProperty('--noseY', (-G.nose * 4) + 'px');
    $('disc').style.transform = 'scaleY(' + (1 - Math.abs(G.nose) * 0.08) + ')';
    setHint();
  }
  function setHint() {
    var h = $('hint');
    if (IN.tilt) h.textContent = 'SLIDE UP: NOSE UP. DOWN: NOSE DOWN';
    else if (G.nose) h.textContent = (G.nose > 0 ? 'NOSE UP ' : 'NOSE DOWN ') + Math.abs(G.nose) + ' · HOLD DISC TO CHANGE';
    else h.textContent = 'PULL BACK ON THE DISC, FLICK';
  }
  var hintT = 0;
  function flashHint(t) { var h = $('hint'); h.textContent = t; clearTimeout(hintT); hintT = setTimeout(setHint, 1600); }

  /* ---------- picking a target in the room ---------- */
  var ray = new T.Raycaster(), ndc = new T.Vector2();
  function inBasket(o) { while (o) { if (o === world.basket) return true; o = o.parent; } return false; }
  function pickTarget(p) {
    ndc.set(p.x / L.W * 2 - 1, -(p.y / L.H) * 2 + 1); ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObjects(scene.children, true), h = null;
    for (var i = 0; i < hits.length; i++) {
      var o = hits[i].object;
      if (!o.visible || o.type !== 'Mesh' || o.material.type === 'ShaderMaterial' || o.material.type === 'MeshBasicMaterial' && !o.material.map) continue;
      var vis = true, q = o; while (q) { if (!q.visible) { vis = false; break; } q = q.parent; } if (!vis) continue;
      h = hits[i]; break;
    }
    if (!h) return;
    var s = shot(), X = h.point.x, Y = -h.point.z, Z = h.point.y;
    var dx = X - s.x, dy = Y - s.y, d = Math.hypot(dx, dy);
    if (inBasket(h.object) || Math.hypot(X - H.BASKET.x, Y - H.BASKET.y) < 0.45) { setTarget(null); flashHint('TARGET: THE BASKET'); return; }
    if (d < 1.5 || d > 18 || dy < 0.5) { flashHint('PICK A SPOT DOWN THE AISLE'); return; }
    var onFloor = h.object === world.floor || Z < 0.05;
    setTarget({ x: X, y: Y, z: onFloor ? 0.02 : clamp(Z, 0.3, 2.6), floor: onFloor });
    flashHint(onFloor ? 'TARGET: THE FLOOR. SKIP IT!' : /gong/i.test(h.object.name || '') || h.object === world.gong || h.object === world.gongFace ? 'TARGET: THE GONG' : 'TARGET SET');
  }
  function setTarget(t) { G.target = t; scheduleSolve(); }
  function targetPoint() { return G.target ? SC.W(G.target.x, G.target.y, G.target.floor ? 0.02 : G.target.z) : SC.W(H.BASKET.x, H.BASKET.y, 1.08); }

  /* ---------- cameras ---------- */
  var cam = { pos: new T.Vector3(), look: new T.Vector3(), init: false, t: 0 };
  function dirToBasket(s) { var d = new T.Vector3(H.BASKET.x - s.x, 0, -(H.BASKET.y - s.y)); return d.normalize(); }
  function viewCam(v, s) {
    var B = SC.W(H.BASKET.x, H.BASKET.y, 0), O = SC.W(s.x, s.y, 0), d = dirToBasket(s), side = new T.Vector3(-d.z, 0, d.x);
    if (v === 'drone') {
      var mid = O.clone().lerp(B, 0.45);
      return { pos: O.clone().addScaledVector(d, -3.2).addScaledVector(side, -2.4).setY(8.2), look: mid.setY(0.2) };
    }
    if (v === 'basket') return { pos: B.clone().addScaledVector(d, 1.9).addScaledVector(side, 0.5).setY(1.6), look: O.clone().setY(0.9) };
    return { pos: O.clone().addScaledVector(d, -1.35).addScaledVector(side, 0.22).setY(1.62), look: B.clone().setY(1.0) };
  }
  // keep any camera inside the room and out of the kettles, fermenters and posts
  var BLOCK = [];
  H.KETTLES.forEach(function (k) { BLOCK.push([k.x, k.y, k.r + 0.45]); });
  H.FERMENTERS.forEach(function (f) { BLOCK.push([f.x, f.y, f.r + 0.45]); });
  H.POSTS_X.forEach(function (x) { H.POSTS_Y.forEach(function (y) { BLOCK.push([x, y, 0.55]); }); });
  function safe(v) {
    var R = H.ROOM, x = clamp(v.x, R.x0 + 0.35, R.x1 - 0.35), y = clamp(-v.z, R.y0 + 0.35, R.y1 - 0.35);
    for (var i = 0; i < BLOCK.length; i++) { var b = BLOCK[i], dx = x - b[0], dy = y - b[1], d = Math.hypot(dx, dy); if (d < b[2]) { if (d < 1e-4) { dx = -1; dy = 0; d = 1; } x = b[0] + dx / d * b[2]; y = b[1] + dy / d * b[2]; } }
    v.x = x; v.z = -y; v.y = clamp(v.y, 0.35, 5.3); return v;
  }
  function setCam(c, rate, dt, snap) {
    safe(c.pos);
    if (snap || !cam.init) { cam.pos.copy(c.pos); cam.look.copy(c.look); cam.init = true; }
    else { var k = 1 - Math.exp(-rate * dt); cam.pos.lerp(c.pos, k); cam.look.lerp(c.look, k); }
    camera.position.copy(cam.pos); camera.lookAt(cam.look);
  }
  $('viewBtn').addEventListener('click', function () {
    if (G.state !== 'aim') return;
    G.view = G.view === 'tee' ? 'drone' : G.view === 'drone' ? 'basket' : 'tee';
    flashHint(G.view === 'tee' ? 'TEE VIEW' : G.view === 'drone' ? 'DRONE VIEW' : 'BASKET VIEW');
  });

  /* ---------- the throw ---------- */
  function throwPutt(a) {
    G.state = 'busy';
    var c = a.read, p = Object.assign({}, solved(c));
    var dev = a.chord - classCenter(c), aimErr = clamp(-dev * 0.22, -3, 3);
    G.peaks.push(a.peak); if (G.peaks.length > 15) G.peaks.shift();
    var sorted = G.peaks.slice().sort(function (x, y) { return x - y; });
    var spErr = clamp((a.peak / G.medianPeak - 1) * 0.06, -0.06, 0.06);
    if (sorted.length >= 3) G.medianPeak = sorted[Math.floor(sorted.length / 2)];
    p.aim += aimErr;
    p.nose += 3.5 * G.nose;
    p.armSpeed *= (1 + 0.07 * G.power) * (1 + spErr);
    var seed = Math.floor(Math.random() * 1e9);
    showCall(CLASS_NAME[c] + (G.power ? (G.power > 0 ? ' · POWER +' : ' · POWER ') + G.power : '') + (G.nose ? (G.nose > 0 ? ' · NOSE UP' : ' · NOSE DOWN') : ''));
    app.classList.add('throwing');
    setTimeout(function () {
      var rec = H.throwIt(E, shot(), p, seed);
      rec.params = p; rec.shotIndex = G.shot;
      startPlay(rec, false);
    }, 60);
  }
  function showCall(t) { var c = $('call'); c.textContent = t; c.classList.add('show'); clearTimeout(c._t); c._t = setTimeout(function () { c.classList.remove('show'); }, 1100); }

  /* ---------- playback of a simulated putt ---------- */
  function startPlay(rec, replay) {
    var s = H.SHOTS[rec.shotIndex], o = rec.origin, S = rec.samples;
    var pos = S.map(function (q) { return new T.Vector3(q.x * FT + o.x, q.z * FT, -(q.y * FT + o.y)); });
    var bxy = new T.Vector2(H.BASKET.x, -H.BASKET.y);
    var slow = S.map(function (q, i) { var d = Math.hypot(pos[i].x - bxy.x, pos[i].z - bxy.y); return d < 2.3 && pos[i].y < 2.2 && !q.post; });
    var evs = (rec.events || []).filter(function (e) { return e.type !== 'release'; }).sort(function (a, b) { return a.t - b.t; });
    G.play = { rec: rec, s: s, S: S, pos: pos, slow: slow, evs: evs, ei: 0, t: 0, i: 0, done: false, replay: replay, endT: S[S.length - 1].t, hold: 0, madeFx: false };
    G.lastPlay = rec;
    G.state = 'flight'; disc.visible = true; aimRing.visible = false;
    $('skipBtn').hidden = false;
    world.ceiling.visible = true;
  }
  var qA = new T.Quaternion(), up = new T.Vector3(0, 1, 0), nrm = new T.Vector3();
  function stepPlay(dt) {
    var P = G.play; if (!P) return;
    var S = P.S, i = P.i;
    while (i < S.length - 2 && S[i + 1].t <= P.t) i++;
    P.i = i;
    var a = S[i], b = S[Math.min(i + 1, S.length - 1)], k = b.t > a.t ? clamp((P.t - a.t) / (b.t - a.t), 0, 1) : 0;
    disc.position.copy(P.pos[i]).lerp(P.pos[Math.min(i + 1, S.length - 1)], k);
    nrm.set(lerp(a.nx, b.nx, k), lerp(a.nz, b.nz, k), -lerp(a.ny, b.ny, k)).normalize();
    qA.setFromUnitVectors(up, nrm); disc.quaternion.copy(qA); disc.rotateY(lerp(a.spinAngle, b.spinAngle, k));
    if (a.chains) world.setChains(a.chains);
    // effects as their moments pass
    while (P.ei < P.evs.length && P.evs[P.ei].t <= P.t) { fireEvent(P.evs[P.ei], P); P.ei++; }
    // time: slow motion near the basket
    var slowNow = P.slow[i] && !reduce;
    var rate = slowNow ? 0.4 : (P.t > (P.rec.airTime || 0) + 0.6 ? 1.6 : 1);
    if (!P.done) P.t += dt * rate;
    // camera: chase from behind, then a low side view at the basket
    var d = P.pos[Math.min(i + 3, S.length - 1)].clone().sub(P.pos[i]); d.y = 0; if (d.lengthSq() < 1e-6) d.copy(dirToBasket(P.s)); d.normalize();
    var side = new T.Vector3(-d.z, 0, d.x), c;
    if (slowNow || P.nearBasket) {
      P.nearBasket = true;
      var B = SC.W(H.BASKET.x, H.BASKET.y, 0), toB = dirToBasket(P.s), sd = new T.Vector3(-toB.z, 0, toB.x);
      c = { pos: B.clone().addScaledVector(sd, -2.3).addScaledVector(toB, -1.0).setY(1.3), look: B.clone().setY(0.95).lerp(disc.position, 0.35) };
      setCam(c, 3.5, dt);
    } else {
      // a camera on a rail down the putt line, a step behind the disc
      var O = SC.W(P.s.x, P.s.y, 0), dir = dirToBasket(P.s), sideL = new T.Vector3(dir.z, 0, -dir.x);
      var prog = disc.position.clone().sub(O).dot(dir);
      c = { pos: O.clone().addScaledVector(dir, Math.max(-1.3, prog - 2.0)).addScaledVector(sideL, 0.3).setY(Math.max(1.45, disc.position.y + 0.45)), look: disc.position.clone().addScaledVector(d, 1.0) };
      setCam(c, 5, dt);
    }
    if (P.t >= P.endT && !P.done) { P.done = true; P.hold = 0; }
    if (P.done) { P.hold += dt; if (P.hold > 0.5) endPlay(); }
  }
  function endPlay() {
    var P = G.play; G.play = null; $('skipBtn').hidden = true;
    world.setChains(world.restChains);
    if (P.replay) { disc.visible = false; showCard(true); return; }
    scoreShot(P.rec);
  }
  $('skipBtn').addEventListener('click', function () { if (!G.play) return; var P = G.play; while (P.ei < P.evs.length) { if (P.evs[P.ei].type === 'made') fireEvent(P.evs[P.ei], P); P.ei++; } P.t = P.endT; P.done = true; P.hold = 0.5; });

  /* ---------- moments: comic words, bursts, coins ---------- */
  function screenOf(v3) { var v = v3.clone().project(camera); return { x: (v.x + 1) / 2 * L.W, y: (1 - v.y) / 2 * L.H, behind: v.z > 1 }; }
  function engineToWorld(e) { var o = G.play ? G.play.rec.origin : { x: 0, y: 0 }; return new T.Vector3(e.x * FT + o.x, e.z * FT, -(e.y * FT + o.y)); }
  var lastWord = 0;
  function fireEvent(e, P) {
    var at = screenOf(engineToWorld(e));
    if (e.type === 'made' && !P.madeFx) { P.madeFx = true; burst('CHAAING!', screenOf(SC.W(H.BASKET.x, H.BASKET.y, 1.1))); shakeIt(); for (var i = 0; i < 26; i++) coin(at.x, at.y, true); for (var j = 0; j < 20; j++) spark(at.x, at.y); kick(); return; }
    var now = performance.now(); if (now - lastWord < 160) return;
    if (e.type === 'bounce') {
      lastWord = now;
      if (/gong/i.test(e.name || '')) { burst('DONG!', at); world.gongHit = 1; shakeIt(); for (var g = 0; g < 14; g++) spark(at.x, at.y); kick(); }
      else word(/wall/i.test(e.name || '') ? 'THWACK!' : /kettle|fermenter/i.test(e.name || '') ? 'BWONG!' : /barrel/i.test(e.name || '') ? 'BONK!' : /post/i.test(e.name || '') ? 'THUNK!' : 'BOP!', at, '#fff', 30);
    } else if (e.type === 'pole') { lastWord = now; word('CLANG!', at, '#ffc93c', 30); }
    else if (e.type === 'band') { lastWord = now; word('TINK!', at, '#fff', 26); }
    else if (e.type === 'skip' || e.type === 'hop') { lastWord = now; word('SKIP!', at, '#2E9C9A', 28, '#fff3df'); }
    else if (e.type === 'roll' && !P.rolled) { P.rolled = true; lastWord = now; word('ROLLER!', at, '#3B86D9', 26, '#fff3df'); }
  }
  function word(text, at, bg, size, color) {
    var el = document.createElement('div'); el.className = 'word panel'; el.textContent = text;
    el.style.left = clamp(at.x, 60, L.W - 60) + 'px'; el.style.top = clamp(at.y - 30, 70, L.H - 120) + 'px';
    el.style.background = bg; el.style.color = color || '#1d130c'; el.style.fontSize = (size || 26) + 'px'; el.style.setProperty('--r', (Math.random() * 12 - 6).toFixed(1) + 'deg');
    app.appendChild(el); requestAnimationFrame(function () { el.classList.add('in'); });
    setTimeout(function () { el.style.opacity = '0'; }, 750); setTimeout(function () { el.remove(); }, 1200);
  }
  function burst(text, at) {
    var pts = [], n = 22;
    for (var i = 0; i < n * 2; i++) { var a = Math.PI * i / n, r = i % 2 ? 62 + Math.random() * 10 : 100 + Math.random() * 18; pts.push((130 + Math.cos(a) * r * 1.22).toFixed(1) + ',' + (100 + Math.sin(a) * r * 0.86).toFixed(1)); }
    var h = $('hit');
    h.innerHTML = '<polygon points="' + pts.join(' ') + '" fill="#FFC93C" stroke="#1d130c" stroke-width="5" stroke-linejoin="round"/>' +
      '<polygon points="' + pts.join(' ') + '" fill="none" stroke="#E0482F" stroke-width="3" stroke-linejoin="round" transform="translate(130 100) scale(0.82) translate(-130 -100)"/>' +
      '<text x="133" y="117" text-anchor="middle" font-size="52" fill="#1d130c" textLength="' + (text.length > 6 ? 196 : 150) + '" lengthAdjust="spacingAndGlyphs">' + text + '</text>' +
      '<text x="130" y="113" text-anchor="middle" font-size="52" fill="#E0482F" stroke="#1d130c" stroke-width="2" textLength="' + (text.length > 6 ? 196 : 150) + '" lengthAdjust="spacingAndGlyphs">' + text + '</text>';
    h.style.left = clamp(at.x, 130, L.W - 130) + 'px'; h.style.top = clamp(at.y - 40, 160, L.H - 200) + 'px';
    h.classList.remove('on'); void h.offsetWidth; h.classList.add('on');
    clearTimeout(h._t); h._t = setTimeout(function () { h.classList.remove('on'); h.style.transform = 'scale(0)'; }, 1300);
  }
  function shakeIt() {
    var f = $('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    if (reduce) return; stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
  }
  var parts = [], raf = 0;
  function coin(x, y, burstIt) { var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = (burstIt ? 6 : 3) + Math.random() * (burstIt ? 9 : 5); parts.push({ k: 'coin', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 7 + Math.random() * 6, spin: Math.random() * 6, vs: 0.15 + Math.random() * 0.3, life: 0, b: 0 }); }
  function spark(x, y) { var a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 8; parts.push({ k: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, len: 10 + Math.random() * 16 }); }
  function stepParts() {
    fx.clearRect(0, 0, L.W, L.H);
    var floor = L.H - 20;
    for (var i = 0; i < parts.length; i++) {
      var q = parts[i]; q.life++;
      if (q.k === 'coin') {
        q.vy += 0.42; q.x += q.vx; q.y += q.vy; q.spin += q.vs; q.vx *= 0.995;
        if (q.y > floor - q.r && q.vy > 0) { q.y = floor - q.r; q.vy *= -0.48; q.vx *= 0.8; q.b++; }
        var w = Math.abs(Math.cos(q.spin)) * q.r;
        fx.save(); fx.translate(q.x, q.y); fx.beginPath(); fx.ellipse(0, 0, Math.max(1.5, w), q.r, 0, 0, Math.PI * 2);
        fx.fillStyle = Math.cos(q.spin) > 0 ? '#FFC93C' : '#D8742A'; fx.fill(); fx.lineWidth = 2.5; fx.strokeStyle = '#1d130c'; fx.stroke();
        if (w > 4) { fx.beginPath(); fx.ellipse(-w * 0.3, -q.r * 0.35, w * 0.25, q.r * 0.2, 0, 0, Math.PI * 2); fx.fillStyle = '#FFF3DF'; fx.fill(); }
        fx.restore();
      } else {
        q.vx *= 0.9; q.vy *= 0.9; q.x += q.vx; q.y += q.vy; var m = Math.hypot(q.vx, q.vy) || 1;
        fx.globalAlpha = Math.max(0, 1 - q.life / 26); fx.strokeStyle = '#1d130c'; fx.lineWidth = 6; fx.lineCap = 'round';
        fx.beginPath(); fx.moveTo(q.x, q.y); fx.lineTo(q.x - q.vx / m * q.len, q.y - q.vy / m * q.len); fx.stroke(); fx.strokeStyle = '#FFC93C'; fx.lineWidth = 3; fx.stroke(); fx.globalAlpha = 1;
      }
    }
    parts = parts.filter(function (q) { return q.k === 'coin' ? (q.life < 420 && q.b < 5 && q.x > -40 && q.x < L.W + 40) : q.life < 26; });
  }
  function kick() {}

  /* ---------- scoring a putt ---------- */
  function multFor(n) { return n >= 5 ? 4 : n >= 3 ? 3 : n >= 2 ? 2 : 1; }
  function scoreShot(rec) {
    var s = H.SHOTS[rec.shotIndex], r = H.readThrow(rec, s), list = r.awards.slice(), jack = false;
    if (r.made) {
      G.streak++; G.missStreak = 0;
      var m = multFor(G.streak); if (m > 1) list.splice(1, 0, { key: 'streak', label: 'STREAK x' + m, pts: H.PTS.make * (m - 1), kind: 'streak' });
      if (r.tricks >= 2) { jack = true; list.push({ key: 'jackpot', label: 'JACKPOT!', pts: 2500, kind: 'streak' }); }
    } else {
      G.streak = 0; G.missStreak++;
      if (G.missStreak >= 2) list.push({ key: 'shake', label: 'SHAKE IT OFF', pts: 100 * G.missStreak, kind: 'near' });
      if (!list.length) list.push({ key: 'air', label: 'NOTHING BUT AIR', pts: 25, kind: 'near' });
    }
    G.results[rec.shotIndex] = { made: r.made, tricks: r.tricks, awards: list, total: 0 };
    if (rec.shotIndex === 1 && G.results[0] && G.results[0].made && r.made) {
      list.push({ key: 'pair', label: 'PAIR!', pts: H.PTS.pair, kind: 'make' });
      if (G.results[0].tricks && r.tricks) { jack = true; list.push({ key: 'pairjack', label: 'TRICK PAIR JACKPOT', pts: 3000, kind: 'streak' }); }
    }
    if (jack) G.jackpot = true;
    var total = list.reduce(function (a, b) { return a + b.pts; }, 0); G.results[rec.shotIndex].total = total;
    var dot = document.querySelectorAll('#shots .dot')[rec.shotIndex]; dot.classList.remove('on'); dot.classList.add(r.made ? 'made' : 'miss');
    showTally(list, function () { setTimeout(afterShot, 650); });
    G.score += total; countScore();
    showStreak();
    if (jack) { for (var c = 0; c < 40; c++) coin(Math.random() * L.W, -20 - Math.random() * 200, false); }
  }
  function showStreak() { var st = $('streak'); if (G.streak >= 2) { st.hidden = false; st.textContent = 'STREAK x' + multFor(G.streak); } else st.hidden = true; }
  function showTally(list, done) {
    var box = $('tally'); box.innerHTML = '';
    list.forEach(function (a, i) {
      var el = document.createElement('div'); el.className = 'award panel ' + a.kind; el.style.setProperty('--r', ((i % 2 ? 1 : -1) * (1 + Math.random() * 2)).toFixed(1) + 'deg');
      el.innerHTML = '<span></span><span class="p"></span>'; el.firstChild.textContent = a.label; el.lastChild.textContent = '+' + a.pts.toLocaleString('en-US');
      box.appendChild(el);
      setTimeout(function () { el.classList.add('in'); if (a.kind === 'make' || a.kind === 'streak') { for (var k = 0; k < 10; k++) coin(L.W / 2 + (Math.random() - 0.5) * 120, L.H * 0.3, true); } }, reduce ? 0 : 280 * i + 150);
    });
    setTimeout(done, reduce ? 300 : 280 * list.length + 1500);
  }
  function countScore() {
    var from = G.shown, to = G.score, t0 = performance.now(), ms = reduce ? 1 : 900;
    (function f() { var k = Math.min(1, (performance.now() - t0) / ms), e = 1 - Math.pow(1 - k, 3); $('score').textContent = Math.round(from + (to - from) * e).toLocaleString('en-US'); if (k < 1) requestAnimationFrame(f); else G.shown = to; })();
  }
  function afterShot() {
    $('tally').innerHTML = ''; ink.clearRect(0, 0, L.W, L.H); IN.pts = [];
    disc.visible = false;
    if (G.shot === 0) { G.shot = 1; beginShot(true); }
    else showCard(false);
  }
  function beginShot(announce) {
    var s = shot(), ft = Math.round(shotDist(s) / FT);
    $('holeMeta').textContent = s.label + ' · ' + ft + ' FT';
    $('shots').setAttribute('aria-label', 'Putt ' + (G.shot + 1) + ' of 2');
    G.target = null; G.nose = 0; G.power = 0; showPower(); showNose(); scheduleSolve();
    G.state = 'aim'; G.view = 'tee'; app.classList.remove('throwing');
    if (announce) showCall(s.label + ' PUTT · ' + ft + ' FT');
  }

  /* ---------- the hole card ---------- */
  function showCard(fromReplay) {
    G.state = 'card';
    var card = $('card'), made = G.results.filter(function (r) { return r && r.made; }).length, hole = G.results.reduce(function (a, r) { return a + (r ? r.total : 0); }, 0);
    card.hidden = false; card.classList.toggle('jack', G.jackpot);
    $('cardK').textContent = 'HOLE 1 · THE COPPER AISLE';
    $('cardBig').textContent = G.jackpot ? 'JACKPOT!' : made === 2 ? 'PAIRED IT!' : made === 1 ? 'ONE DOWN' : 'WHIFF CITY';
    var lines = '';
    H.SHOTS.forEach(function (s, i) { var r = G.results[i]; if (!r) return; lines += '<span>' + s.label + ': ' + (r.made ? 'MADE' : 'MISSED') + '</span><span>+' + r.total.toLocaleString('en-US') + '</span>'; });
    $('cardLines').innerHTML = lines;
    card.classList.remove('show'); void card.offsetWidth; card.classList.add('show');
    var amt = $('cardAmt');
    if (fromReplay) amt.textContent = hole.toLocaleString('en-US');
    else { var t0 = performance.now(); (function f() { var k = Math.min(1, (performance.now() - t0) / (reduce ? 1 : 1100)), e = 1 - Math.pow(1 - k, 3); amt.textContent = Math.round(hole * e).toLocaleString('en-US'); if (k < 1) requestAnimationFrame(f); })(); }
    if (G.jackpot && !fromReplay) { var n = 0, rain = setInterval(function () { for (var k = 0; k < 3; k++) coin(Math.random() * L.W, -20, false); if (++n > 30) clearInterval(rain); }, 110); }
    setTimeout(function () { $('cardBtns').classList.add('in'); }, fromReplay ? 0 : 900);
  }
  $('replayBtn').addEventListener('click', function () {
    if (!G.lastPlay) return;
    $('card').hidden = true; $('cardBtns').classList.remove('in');
    app.classList.add('throwing'); startPlay(G.lastPlay, true);
  });
  $('nextBtn').addEventListener('click', function () { newHole(); });
  function newHole() {
    $('card').hidden = true; $('cardBtns').classList.remove('in');
    G.shot = 0; G.results = []; G.jackpot = false;
    document.querySelectorAll('#shots .dot').forEach(function (d, i) { d.className = 'dot' + (i === 0 ? ' on' : ''); });
    beginShot(true);
  }
  $('pauseBtn').addEventListener('click', function () { $('sheet').hidden = false; $('resumeBtn').focus(); });
  $('resumeBtn').addEventListener('click', function () { $('sheet').hidden = true; });
  $('restartBtn').addEventListener('click', function () {
    $('sheet').hidden = true; G.play = null; $('skipBtn').hidden = true; disc.visible = false; world.setChains(world.restChains);
    G.score = 0; G.shown = 0; G.streak = 0; G.missStreak = 0; $('score').textContent = '0'; showStreak(); $('tally').innerHTML = ''; newHole();
  });

  /* ---------- bubbles on bonus targets ---------- */
  function placeBubble(el, p3, show) {
    if (!show) { el.style.opacity = '0'; return; }
    var s = screenOf(p3);
    var ok = !s.behind && s.x > 30 && s.x < L.W - 30 && s.y > 110 && s.y < L.cy - L.fanR * 0.55;
    el.style.opacity = ok ? '1' : '0';
    if (!ok) return;
    var half = el.offsetWidth / 2, x = clamp(s.x, half + 8, L.W - half - 8);
    el.style.left = x + 'px'; el.style.top = (s.y - 10) + 'px'; el.style.setProperty('--tail', clamp(s.x - x + half, 16, el.offsetWidth - 16) + 'px');
  }
  function updateHud() {
    var aim = G.state === 'aim', s = shot();
    var bd = H.BASKET, dd = shotDist(s), ux = (bd.x - s.x) / dd, uy = (bd.y - s.y) / dd;
    placeBubble($('bGong'), SC.W(H.GONG.x, H.GONG.y, H.GONG.z + H.GONG.r + 0.1), aim && G.view !== 'basket');
    placeBubble($('bSkip'), SC.W(bd.x - ux * 1.7, bd.y - uy * 1.7, 0.05), aim && G.shot === 0 && G.view !== 'basket');
    placeBubble($('bStack'), SC.W(H.STACK.x, H.STACK.y, 1.35), aim && G.shot === 1 && G.view !== 'basket');
    var at = $('aimTag');
    if (aim) {
      var tp = targetPoint(), sp = screenOf(tp);
      at.style.opacity = sp.behind ? '0' : '1'; at.style.left = sp.x + 'px'; at.style.top = sp.y + 'px';
      aimRing.visible = !!(G.target && G.target.floor); if (aimRing.visible) { aimRing.position.copy(tp).setY(0.012); aimRing.rotation.x = -Math.PI / 2; }
    } else { at.style.opacity = '0'; aimRing.visible = false; }
  }

  /* ---------- ambient life in the room ---------- */
  function animateRoom(t, dt) {
    world.anim.forEach(function (a) {
      if (a.kind === 'neon') a.mesh.material.opacity = (Math.sin(t * 23) > 0.97 || Math.sin(t * 3.1) > 0.995) ? 0.55 : 1;
      else if (a.kind === 'flutter') a.mesh.rotation.x = Math.sin(t * 2.2 + a.ph) * 0.12;
      else if (a.kind === 'spin') a.mesh.rotation.z += dt * a.rate;
      else if (a.kind === 'clock') a.mesh.rotation.z = -t * 0.2;
      else if (a.kind === 'gaugeWobble') a.mesh.rotation.z = Math.sin(t * 1.3 + a.ph) * 0.05;
      else if (a.kind === 'pulse') a.mesh.material.color.setHSL((t * 0.05) % 1, 0.4, 0.75);
    });
    if (world.gongHit) { world.gongHit = Math.max(0, world.gongHit - dt * 0.8); var w = Math.sin(t * 30) * 0.08 * world.gongHit; world.gong.rotation.z = w; world.gongFace.rotation.z = w; }
  }

  /* ---------- main loop ---------- */
  var last = performance.now(), clock = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    animateRoom(clock, dt);
    if (G.state === 'flight' && G.play) stepPlay(dt);
    else {
      var v = viewCam(G.view, shot());
      if (G.state === 'aim' && G.view === 'tee' && !reduce) { v.pos.x += Math.sin(clock * 0.6) * 0.05; v.pos.y += Math.sin(clock * 0.9) * 0.025; }   // breathing: the room shifts in depth
      setCam(v, 3.2, dt);
    }
    world.ceiling.visible = !(G.state === 'aim' && G.view === 'drone');
    updateHud();
    renderer.render(scene, camera);
    stepParts();
    requestAnimationFrame(frame);
  }

  new ResizeObserver(layout).observe(app);
  layout(); showPower(); showNose(); beginShot(false);
  setCam(viewCam('tee', shot()), 1, 0, true);
  renderer.render(scene, camera);
  $('loading').hidden = true;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  requestAnimationFrame(frame);
  window.__putt = { G: G, world: world, camera: camera, throwPutt: throwPutt, pickTarget: pickTarget, L: function () { return L; } };
})();
