/* =====================================================================
   PUTT LEAGUE · THE TAPROOM · GAME
   Modes: PUTT (2 putts a hole), PITCH (tee to basket vs par), UNLIMITED (free throws from any tee).
   Flick the disc (Putt Reader 1.1 reading) -> the engines simulate the whole throw -> it plays back
   in the cel-shaded venue -> every reason to score pops, big. Each hole opens with a drone flyover.
   ===================================================================== */
(function () {
  'use strict';
  var T = THREE, C = Course, SC = VenueScene, FT = 0.3048;
  var E = { P: FlightlinePhysics, FB: FlightlineBasket, CT: DDMContact, MATS: DDMMaterials };
  C.installFloor(E.MATS);
  var $ = function (id) { return document.getElementById(id); };
  var app = $('app'), stage = $('stage'), glc = $('gl'), inkc = $('ink'), fxc = $('fx'), ink = inkc.getContext('2d'), fx = fxc.getContext('2d');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

  /* ---------- renderer and world ---------- */
  var renderer;
  try { renderer = new T.WebGLRenderer({ canvas: glc, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { $('loading').textContent = 'THIS BROWSER CANNOT DRAW 3D HERE'; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  var world = SC.build(), scene = world.scene;
  var camera = new T.PerspectiveCamera(60, 1, 0.05, 260);
  var discs3 = C.DISCS.map(function (d) { var m = SC.makeDisc(d.color); m.visible = false; scene.add(m); return m; });
  var disc = discs3[0];
  var aimRing = new T.Mesh(new T.RingGeometry(0.2, 0.28, 32), new T.MeshBasicMaterial({ color: 0xF2A13B, transparent: true, opacity: 0.9, side: T.DoubleSide, depthTest: false }));
  aimRing.visible = false; aimRing.renderOrder = 5; scene.add(aimRing);
  var dropGeo = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(0, -1, 0)]);
  var dropLine = new T.Line(dropGeo, new T.LineDashedMaterial({ color: 0xffc93c, dashSize: 0.25, gapSize: 0.18, depthTest: false, transparent: true }));
  dropLine.visible = false; dropLine.renderOrder = 6; scene.add(dropLine);
  var lieRing = new T.Mesh(new T.RingGeometry(0.32, 0.42, 32), new T.MeshBasicMaterial({ color: 0xfff3df, transparent: true, opacity: 0.85, side: T.DoubleSide }));
  lieRing.rotation.x = -Math.PI / 2; lieRing.visible = false; scene.add(lieRing);

  /* ---------- state ---------- */
  var CUT = { TL: [9, 24, 36], TR: [5, 16, 35] }, MAXA = 50;
  var G = {
    mode: null, hole: 0, shot: 0, stroke: 0, lie: null, freeTee: 'tee', disc: 0,
    score: 0, shown: 0, streak: 0, missStreak: 0, holeLog: [], results: [], jackpot: false, holeAwards: 0,
    stats: { throws: 0, made: 0, tricks: 0 },
    state: 'menu', view: 'tee', zoom: 0, power: 0, nose: 0, hyz: 0, target: null, solved: {}, solveTok: 0,
    peaks: [], medianPeak: 2.6, play: null, lastPlay: null, cardKind: null, attract: 0
  };
  function hole() { return C.HOLES[G.hole]; }
  function origin() {
    var h = hole();
    if (G.mode === 'putt') return G.shot === 0 ? h.short : h.long;
    if (G.mode === 'pitch') return G.lie || h.tee;
    return h[G.freeTee];
  }
  function distTo(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function basketPt() { var b = hole().basket; return { x: b.x, y: b.y }; }
  function aimTarget() { return G.target || C.defaultTarget(G.hole, origin()) || { x: hole().basket.x, y: hole().basket.y }; }
  // the lid on a throw: the rafters if you are inside; the door frame if you are outside throwing back in
  function ceilingFor(o, t) { if (o.y < C.ROOM.y1) return 5.2; t = t || aimTarget(); var bk = hole().basket; return (t.y < C.ROOM.y1 || bk.y < C.ROOM.y1) ? C.DOOR.h - 0.2 : 0; }

  /* ---------- layout ---------- */
  var L = {};
  function layout() {
    var r = app.getBoundingClientRect(), W = r.width, Hh = r.height, dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setSize(W, Hh, false); camera.aspect = W / Hh; camera.fov = W / Hh < 0.7 ? 62 : 52; camera.updateProjectionMatrix();
    [inkc, fxc].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(Hh * dpr); c.style.width = W + 'px'; c.style.height = Hh + 'px'; });
    ink.setTransform(dpr, 0, 0, dpr, 0, 0); fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sb = parseFloat(getComputedStyle(document.documentElement).paddingBottom) || 0;
    var R = 46, cx = W / 2, cy = Hh - sb - 140 - R;   // ~140 px of open screen under the disc for the pull back
    var fanR = Math.max(120, Math.min((W / 2 - 8) / Math.sin(MAXA * Math.PI / 180), cy - 120));
    L = { W: W, H: Hh, R: R, cx: cx, cy: cy, fanR: fanR, sb: sb };
    var dw = $('discWrap'); dw.style.left = (cx - R) + 'px'; dw.style.top = (cy - R) + 'px'; dw.style.width = dw.style.height = (R * 2) + 'px';
    var side = Math.max(12, W * 0.035);
    $('viewWrap').style.left = side + 'px'; $('viewWrap').style.top = (cy + R - 62) + 'px';
    $('discSel').style.left = side + 'px'; $('discSel').style.top = (cy + R - 62 - 46) + 'px';
    $('powerWrap').style.right = side + 'px'; $('powerWrap').style.top = (cy + R - 196) + 'px';
    $('teeSel').style.right = side + 'px'; $('teeSel').style.top = (cy + R - 196 - 54) + 'px';
    $('hint').style.top = (Hh - sb - 30) + 'px';
    var gg = $('gauge'); gg.style.left = cx + 'px'; gg.style.top = (cy - R - 34) + 'px';
    $('call').style.top = (cy - R - 84) + 'px';
    $('tally').style.top = Math.round(Hh * 0.17) + 'px';
    drawFan();
  }

  /* ---------- the fan ---------- */
  function pt(a, rad) { var t = a * Math.PI / 180; return [L.cx - Math.sin(t) * rad, L.cy - Math.cos(t) * rad]; }
  function wedge(a0, a1, rad) { var p0 = pt(a0, rad), p1 = pt(a1, rad); return 'M' + L.cx + ' ' + L.cy + ' L' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + rad + ' ' + rad + ' 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' Z'; }
  function drawFan() {
    var f = $('fan'), R = L.fanR, A = MAXA, a = pt(A, R), b = pt(-A, R), rays = '';
    f.setAttribute('width', L.W); f.setAttribute('height', L.H); f.setAttribute('viewBox', '0 0 ' + L.W + ' ' + L.H);
    [CUT.TL[1], CUT.TL[2]].forEach(function (an) { var p = pt(an, R); rays += '<path d="M' + L.cx + ' ' + L.cy + ' L' + p[0] + ' ' + p[1] + '" stroke="rgba(255,243,223,0.25)" stroke-width="1.5" stroke-dasharray="4 7"/>'; });
    [CUT.TR[1], CUT.TR[2]].forEach(function (an) { var p = pt(-an, R); rays += '<path d="M' + L.cx + ' ' + L.cy + ' L' + p[0] + ' ' + p[1] + '" stroke="rgba(255,243,223,0.25)" stroke-width="1.5" stroke-dasharray="4 7"/>'; });
    f.innerHTML = '<path d="' + wedge(A, CUT.TL[0], R) + '" fill="rgba(224,72,47,0.14)"/>' + '<path d="' + wedge(CUT.TL[0], -CUT.TR[0], R) + '" fill="rgba(255,243,223,0.10)"/>' +
      '<path d="' + wedge(-CUT.TR[0], -A, R) + '" fill="rgba(59,134,217,0.14)"/>' + rays +
      '<path d="M' + a[0] + ' ' + a[1] + ' A' + R + ' ' + R + ' 0 0 1 ' + b[0] + ' ' + b[1] + '" fill="none" stroke="#1d130c" stroke-width="6" stroke-dasharray="14 10" stroke-linecap="round" opacity="0.45"/>' +
      '<path d="M' + a[0] + ' ' + a[1] + ' A' + R + ' ' + R + ' 0 0 1 ' + b[0] + ' ' + b[1] + '" fill="none" stroke="#FFF3DF" stroke-width="2.5" stroke-dasharray="14 10" stroke-linecap="round" opacity="0.75"/>';
  }

  /* ---------- power bar ---------- */
  var PCOL = ['#3B86D9', '#5AA5F2', '#8fc4d8', '#FFF3DF', '#ffc93c', '#F2A13B', '#E0482F'];
  (function () { var p = $('power'), h = ''; for (var i = 0; i < 7; i++) h += '<span class="seg' + (i === 3 ? ' mid' : '') + '" style="--c:' + PCOL[i] + '"></span>'; p.innerHTML = h; })();
  function showPower() {
    var segs = document.querySelectorAll('#power .seg');
    for (var i = 0; i < 7; i++) segs[i].classList.toggle('on', i <= G.power + 3);
    $('pwVal').textContent = G.power === 0 ? 'AUTO' : (G.power > 0 ? '+' : '') + G.power;
    $('power').setAttribute('aria-valuenow', G.power);
  }
  (function () {
    var p = $('power'), drag = false;
    function setFromY(y) { var r = p.getBoundingClientRect(), k = 1 - clamp((y - r.top) / r.height, 0, 0.999); G.power = Math.floor(k * 7) - 3; showPower(); }
    p.addEventListener('pointerdown', function (e) { if (G.state !== 'aim') return; drag = true; try { p.setPointerCapture(e.pointerId); } catch (x) {} setFromY(e.clientY); e.preventDefault(); e.stopPropagation(); });
    p.addEventListener('pointermove', function (e) { if (drag) setFromY(e.clientY); });
    p.addEventListener('pointerup', function () { drag = false; }); p.addEventListener('pointercancel', function () { drag = false; });
    p.addEventListener('keydown', function (e) { if (e.key === 'ArrowUp') { G.power = Math.min(3, G.power + 1); showPower(); } if (e.key === 'ArrowDown') { G.power = Math.max(-3, G.power - 1); showPower(); } });
  })();

  /* ---------- disc and tee buttons ---------- */
  function showDisc() {
    var d = C.DISCS[G.disc]; $('discName').textContent = d.label; $('discSw').style.background = '#' + d.color.toString(16).padStart(6, '0');
    $('discSel').hidden = G.mode === 'putt';
    discs3.forEach(function (m) { m.visible = false; }); disc = discs3[G.disc];
  }
  $('discBtn').addEventListener('click', function () { if (G.state !== 'aim') return; G.disc = (G.disc + 1) % C.DISCS.length; showDisc(); scheduleSolve(); flashHint(C.DISCS[G.disc].label + ': SPEED ' + C.DISCS[G.disc].speed); });
  var TEES = ['tee', 'long', 'short'], TEE_NAME = { tee: 'PITCH', long: 'LONG', short: 'SHORT' };
  $('teeBtn').addEventListener('click', function () { if (G.state !== 'aim') return; G.freeTee = TEES[(TEES.indexOf(G.freeTee) + 1) % 3]; $('teeName').textContent = TEE_NAME[G.freeTee]; G.target = null; G.zoom = 0; autoDisc(); scheduleSolve(); showMeta(); });
  $('hole').addEventListener('click', function () { if (G.mode !== 'free' || G.state !== 'aim') return; G.hole = (G.hole + 1) % C.HOLES.length; G.target = null; G.zoom = 0; startHole(true); });
  function autoDisc() { if (G.mode === 'putt') { G.disc = 0; } else { var d = distTo(origin(), hole().basket); G.disc = d <= 12 ? 0 : (G.disc === 0 ? 1 : G.disc); } showDisc(); }

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
    if (F.length < 3 || len < 30 || F[0].y - F[F.length - 1].y < 20) return { ok: false, why: 'noflick' };
    var chord = ang(F[0], F[F.length - 1]), snap = 0;
    for (var u = 0; u < F.length; u++) for (var w = u + 1; w < F.length; w++) { var dtw = F[w].t - F[u].t; if (dtw >= 30) { snap = Math.max(snap, Math.hypot(F[w].x - F[u].x, F[w].y - F[u].y) / dtw); break; } }
    if (!snap) snap = len / Math.max(30, F[F.length - 1].t - F[0].t);
    return { ok: true, chord: chord, read: classify(chord), peak: peak, snap: snap, len: len, turn: turn, end: end };
  }
  var CLASS_NAME = { 3: 'A TON OF HYZER', 2: 'SOME HYZER', 1: 'A LITTLE HYZER', 0: 'FLAT', '-1': 'A LITTLE ANNY', '-2': 'SOME ANNY', '-3': 'A TON OF ANNY' };
  function classCenter(c) { if (c === 0) return (CUT.TL[0] - CUT.TR[0]) / 2; var Tt = c > 0 ? CUT.TL : CUT.TR, m = Math.abs(c), v = m === 1 ? (Tt[0] + Tt[1]) / 2 : m === 2 ? (Tt[1] + Tt[2]) / 2 : Tt[2] + 7; return c > 0 ? v : -v; }

  /* ---------- solving each flick class in the background while you aim ---------- */
  // an air target: the throw goes through it and comes down about at the basket (or just past the point)
  function baseTarget(o) { return C.defaultTarget(G.hole, o) || basketPt(); }
  function solveFor(c, o, d) {
    var t = G.target;
    // a spot out in the air away from the basket: thread it and come down at the basket. A spot ON or right around
    // the basket is just "hit the basket there": the normal putt line at that height, sized for the basket
    if (t && t.air && (distTo(t, hole().basket) > 2.5 || t.z > 2.5)) {
      var db = distTo(o, hole().basket), dp = distTo(o, t);
      return C.solve(E.P, o, d, c, Object.assign({}, t, { carry: Math.max(db, dp * 1.2), land: Math.max(db, dp) + 0.3 }), ceilingFor(o, t));
    }
    var tt = t ? { x: t.x, y: t.y, z: t.z } : aimTarget();
    // an approach (past putting range) to a spot in the air: come down THROUGH it at a dying pace, landing a step
    // past, instead of a flat fast line that keeps gliding across the room when it misses
    if (!(t && t.floor) && distTo(o, tt) > 13) {
      var db2 = distTo(o, hole().basket), dp2 = distTo(o, tt);
      return C.solve(E.P, o, d, c, Object.assign({}, tt, { z: tt.z != null ? tt.z : C.CHAIN_Z, air: true, carry: Math.max(db2, dp2), land: Math.max(db2, dp2) + 1.5 }), ceilingFor(o, tt));
    }
    return C.solve(E.P, o, d, c, t && t.air ? tt : aimTarget(), ceilingFor(o, tt));
  }
  // one solve: the clean flat line to (or through) the reticle. Your angle, nose and power bend it at the throw.
  function scheduleSolve() {
    var tok = ++G.solveTok, o = origin(), d = C.DISCS[G.disc];
    G.solved = {}; if (!G.target) return;
    setTimeout(function () { if (tok !== G.solveTok || !G.target) return; if (!G.solved[0]) G.solved[0] = solveFor(0, o, d); }, 16);
  }
  function solved() { return G.solved[0] || (G.solved[0] = solveFor(0, origin(), C.DISCS[G.disc])); }

  /* ---------- input: the disc, the room (target), pinch zoom, double tap ---------- */
  var IN = { pid: null, pts: [], hold: null, down: null, tilt: false, tiltBase: 0, touches: {}, pinch: null, lastTap: null, aim: null };
  function local(e) { var r = app.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp || performance.now() }; }
  function onDisc(p) { return Math.hypot(p.x - L.cx, p.y - L.cy) <= L.R * 1.45; }
  function nTouches() { return Object.keys(IN.touches).length; }
  app.addEventListener('pointerdown', function (e) {
    if (G.state === 'preview' || G.state === 'intro') { skipPreview(); return; }
    if (G.state !== 'aim' || !$('sheet').hidden) return;
    if (e.target.closest && e.target.closest('#top button, #viewBtn, #power, #discBtn, #teeBtn, #card, #sheet, #skipBtn, #pickBtn, #hole.pick')) return;
    var p = local(e);
    var onRet = !RET.behind && !onDisc(p) && Math.hypot(p.x - RET.sx, p.y - RET.sy) < 40;
    if (IN.pid === null && !IN.aim && (onRet || (G.aiming && !onDisc(p) && nTouches() === 0))) {
      e.preventDefault();
      IN.aim = { id: e.pointerId, start: p, s0: { x: RET.behind ? L.W / 2 : RET.sx, y: RET.behind ? L.H * 0.4 : RET.sy }, onRet: onRet, was: !!G.aiming, moved: false };
      try { app.setPointerCapture(e.pointerId); } catch (x) {}
      if (!G.aiming) { G.aiming = true; G.lookFreeze = G.target || basketPt(); flashHint('DRAG ANYWHERE: UP, DOWN, AROUND'); }
      G.steerDepth = distTo(origin(), aimTarget());
      return;
    }
    if (onDisc(p)) { G.aiming = false; if (G.zoom || G.view !== 'tee') { G.zoom = 0; G.view = 'tee'; } }
    if (IN.pid === null && !onDisc(p) || IN.pid !== null) {
      if (e.pointerId === IN.pid) return;
      IN.touches[e.pointerId] = { p: p, start: p };
      if (nTouches() === 2) { var k = Object.keys(IN.touches), a = IN.touches[k[0]].p, b = IN.touches[k[1]].p; IN.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), z0: G.zoom }; }
      return;
    }
    e.preventDefault();
    IN.pid = e.pointerId; try { app.setPointerCapture(e.pointerId); } catch (x) {}
    IN.pts = [p]; IN.down = p; IN.tilt = false;
    clearTimeout(IN.hold);
    IN.hold = setTimeout(function () { var l = IN.pts[IN.pts.length - 1]; if (IN.pid !== null && Math.hypot(l.x - IN.down.x, l.y - IN.down.y) < 7) { IN.tilt = true; IN.tiltBase = G.nose; IN.tiltBaseH = G.hyz; try { navigator.vibrate && navigator.vibrate(12); } catch (x) {} setHint(); } }, 650);
  });
  app.addEventListener('pointermove', function (e) {
    if (IN.aim && e.pointerId === IN.aim.id) {
      e.preventDefault();
      var q = local(e), dx = q.x - IN.aim.start.x, dy = q.y - IN.aim.start.y;
      if (!IN.aim.moved && Math.hypot(dx, dy) < 6) return;
      IN.aim.moved = true;
      var sx = clamp(IN.aim.s0.x + dx, 4, L.W - 4), sy = clamp(IN.aim.s0.y + dy, 60, L.H - 4);
      steerTarget(sx, sy, true);
      return;
    }
    if (IN.touches[e.pointerId]) {
      IN.touches[e.pointerId].p = local(e);
      if (IN.pinch && nTouches() === 2) { var k = Object.keys(IN.touches), a = IN.touches[k[0]].p, b = IN.touches[k[1]].p, d = Math.hypot(a.x - b.x, a.y - b.y); G.zoom = clamp(IN.pinch.z0 + Math.log(d / IN.pinch.d0) * 1.8, -1, 4); }
      return;
    }
    if (e.pointerId !== IN.pid) return;
    e.preventDefault();
    var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; if (!list.length) list = [e];
    for (var i = 0; i < list.length; i++) IN.pts.push(local(list[i]));
    if (IN.tilt) { var p = local(list[list.length - 1]), n = clamp(IN.tiltBase + Math.round(-(p.y - IN.down.y) / 24), -3, 3), hz = clamp(IN.tiltBaseH + Math.round(-(p.x - IN.down.x) / 24), -3, 3); if (n !== G.nose || hz !== G.hyz) { G.nose = n; G.hyz = hz; showNose(); try { navigator.vibrate && navigator.vibrate(6); } catch (x) {} } return; }
    var l = IN.pts[IN.pts.length - 1];
    if (IN.hold && Math.hypot(l.x - IN.down.x, l.y - IN.down.y) >= 7) { clearTimeout(IN.hold); IN.hold = null; }
    var py = clamp(l.y - IN.down.y, 0, 120); PULL.y = py; PULL.x = clamp((l.x - IN.down.x) * 0.5, -30, 30) * (py / 120); discPose(false);
    drawStroke();
  });
  function finish(e) {
    if (IN.aim && e.pointerId === IN.aim.id) {
      var A = IN.aim; IN.aim = null;
      try { app.releasePointerCapture(e.pointerId); } catch (x) {}
      if (A.moved) { scheduleSolve(); flashHint('TAP THE TARGET TO LOCK IT'); }
      else if (A.was) { G.aiming = false; scheduleSolve(); flashHint(G.target ? (G.target.floor ? 'TARGET LOCKED: THE FLOOR' : G.target.air ? 'LOCKED: THROWING THROUGH THAT SPOT' : 'TARGET LOCKED') : 'TARGET LOCKED: THE BASKET'); }
      return;
    }
    var t = IN.touches[e.pointerId];
    if (t) {
      var wasPinch = !!IN.pinch; delete IN.touches[e.pointerId]; if (nTouches() < 2) IN.pinch = null;
      if (wasPinch || e.type !== 'pointerup' || G.state !== 'aim') return;
      var p = local(e); if (Math.hypot(p.x - t.start.x, p.y - t.start.y) > 12) return;
      var now = performance.now();
      if (IN.lastTap && now - IN.lastTap.t < 330 && Math.hypot(p.x - IN.lastTap.x, p.y - IN.lastTap.y) < 45) { IN.lastTap = null; G.zoom = 0; setTarget(null); flashHint('VIEW AND TARGET RESET'); return; }
      IN.lastTap = { t: now, x: p.x, y: p.y };
      pickTarget(p); return;
    }
    if (e.pointerId !== IN.pid) return;
    IN.pid = null; clearTimeout(IN.hold); IN.hold = null; releasePull();
    try { app.releasePointerCapture(e.pointerId); } catch (x) {}
    if (IN.tilt) {
      // a real flick out of a hold is a throw, not a nose change: put the nose back and throw it
      if (e.type === 'pointerup') IN.pts.push(local(e));
      var at = analyze(IN.pts); IN.tilt = false;
      if (at.ok && at.turn > 0 && IN.pts[at.turn].y - IN.pts[0].y > 18 && at.len > 70 && at.peak > Math.max(0.6, 0.35 * G.medianPeak)) { G.nose = IN.tiltBase; G.hyz = IN.tiltBaseH; showNose(); drawStroke(at); throwIt(at); return; }
      IN.pts = []; drawStroke(); setHint(); return;
    }
    if (e.type === 'pointerup') IN.pts.push(local(e));
    var a = analyze(IN.pts);
    if (!a.ok) { IN.pts = []; drawStroke(); flashHint(a.why === 'tap' ? 'PULL BACK, THEN FLICK UP' : 'NO FLICK. PULL BACK AND FLICK'); return; }
    drawStroke(a); throwIt(a);
  }
  app.addEventListener('wheel', function (e) { if (G.state !== 'aim') return; e.preventDefault(); G.zoom = clamp(G.zoom - e.deltaY * 0.004, -1, 4); }, { passive: false });
  app.addEventListener('pointerup', finish); app.addEventListener('pointercancel', finish);

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
  // the angle you set: hyzer/anhyzer (hold the disc, slide left/right) and nose (slide up/down)
  var HYZ_NAME = { 3: 'BIG HYZER', 2: 'HYZER', 1: 'TOUCH HYZER', 0: 'FLAT', '-1': 'TOUCH ANNY', '-2': 'ANHYZER', '-3': 'BIG ANNY' };
  var NOSE_NAME = { 3: 'NOSE UP 3', 2: 'NOSE UP 2', 1: 'NOSE UP 1', 0: 'LEVEL', '-1': 'NOSE DOWN 1', '-2': 'NOSE DOWN 2', '-3': 'NOSE DOWN 3' };
  function bankDeg(h) { return -(C.BANK[h] || 0); }            // screen tilt in degrees: hyzer = left side down
  // the disc button rides your thumb as you load up: down with the pull back (up to ~120 px), a little side to
  // side, glowing hotter the deeper you load; it springs home on release
  var PULL = { x: 0, y: 0 };
  function discPose(spring) {
    var d = $('disc'), k = clamp(PULL.y / 120, 0, 1);
    d.style.transition = spring ? 'transform 260ms cubic-bezier(.2,1.7,.4,1), box-shadow 200ms ease' : 'none';
    d.style.setProperty('--load', k.toFixed(3));
    d.style.transform = 'translate(' + PULL.x.toFixed(1) + 'px,' + PULL.y.toFixed(1) + 'px) rotate(' + (-bankDeg(G.hyz)).toFixed(1) + 'deg) scale(' + (1 + k * 0.06).toFixed(3) + ',' + ((1 - Math.abs(G.nose) * 0.08) * (1 - k * 0.1)).toFixed(3) + ')';
  }
  function releasePull() { if (PULL.x || PULL.y) { PULL.x = 0; PULL.y = 0; discPose(true); } }
  function showNose() {
    var d = $('disc'); d.style.setProperty('--noseY', (-G.nose * 4) + 'px');
    discPose(true);
    showGauge(bankDeg(G.hyz), G.nose, HYZ_NAME[G.hyz], false); setHint();
  }
  function showGauge(tiltDeg, nose, label, released) {
    var gg = $('gauge'); if (!gg) return;
    gg.querySelector('.fv').style.transform = 'rotate(' + (-tiltDeg).toFixed(1) + 'deg)';
    gg.querySelector('.sv').style.transform = 'rotate(' + (-nose * 6) + 'deg)';
    gg.querySelector('.hl').textContent = label; gg.querySelector('.nl').textContent = NOSE_NAME[nose];
    gg.classList.toggle('rel', !!released);
    var x = $('aimTag').querySelector('.xh .h'); if (x) x.style.transform = 'rotate(' + (-tiltDeg).toFixed(1) + 'deg)';
  }
  function hyzLabel(deg) { var a = Math.abs(deg); return a < 4 ? 'FLAT' : (deg > 0 ? (a < 12 ? 'TOUCH HYZER' : a < 21 ? 'HYZER' : 'BIG HYZER') : (a < 12 ? 'TOUCH ANNY' : a < 21 ? 'ANHYZER' : 'BIG ANNY')) + ' ' + Math.round(a) + '°'; }
  function setHint() {
    var h = $('hint');
    if (IN.tilt) h.textContent = 'SLIDE: LEFT HYZER · RIGHT ANNY · UP/DOWN NOSE';
    else if (G.state === 'aim' && !G.target) h.textContent = 'TAP WHERE YOU WANT TO THROW';
    else h.textContent = 'FLICK TO THROW · HOLD DISC FOR ANGLE';
  }
  var hintT = 0;
  function flashHint(t) { var h = $('hint'); h.textContent = t; clearTimeout(hintT); hintT = setTimeout(setHint, 1700); }

  /* ---------- picking a target ---------- */
  var ray = new T.Raycaster(), ndc = new T.Vector2();
  function inGroup(o, g) { while (o) { if (o === g) return true; o = o.parent; } return false; }
  // the reticle: tap it to grab it, then drag anywhere on the screen to steer it; tap again to lock
  var RET = { sx: 0, sy: 0, behind: false };
  function updateReticle() { $('aimTag').classList.toggle('live', !!G.aiming && G.state === 'aim'); }
  var plane = new T.Plane(), hitP = new T.Vector3();
  var ground = new T.Plane(new T.Vector3(0, 1, 0), 0);
  function steerTarget(sx, sy, live) {
    // exactly where your finger puts it, nothing snaps: the target rides on an upright plane at its depth,
    // facing you, and below the floor line it slides along the floor instead
    var o = origin(), dep = G.steerDepth || distTo(o, aimTarget()), dir = dirFrom(o, G.lookFreeze || aimTarget()), Opt = SC.W(o.x, o.y, 0);
    var onP = Opt.clone().addScaledVector(dir, Math.max(1.5, dep));
    plane.setFromNormalAndCoplanarPoint(dir.clone().negate(), onP);
    ndc.set(sx / L.W * 2 - 1, -(sy / L.H) * 2 + 1); ray.setFromCamera(ndc, camera);
    var t = null;
    if (ray.ray.intersectPlane(plane, hitP) && hitP.y >= 0.02) t = { x: hitP.x, y: -hitP.z, z: Math.min(hitP.y, -hitP.z < C.ROOM.y1 ? 4.0 : 30), air: true };
    else if (ray.ray.intersectPlane(ground, hitP)) t = { x: hitP.x, y: -hitP.z, z: 0.02, floor: true };
    if (!t || distTo(t, o) < 1.0) return false;
    G.target = { x: t.x, y: t.y, z: t.z, floor: !!t.floor, air: !!t.air };
    G.solveTok++; G.solved = {};
    if (!live) scheduleSolve();
    return true;
  }
  function pickTarget(p) {
    ndc.set(p.x / L.W * 2 - 1, -(p.y / L.H) * 2 + 1); ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObjects(scene.children, true), h = null;
    for (var i = 0; i < hits.length; i++) {
      var o = hits[i].object;
      if (o.type !== 'Mesh' || o.material.type === 'ShaderMaterial' || (o.material.type === 'MeshBasicMaterial' && !o.material.map) || o.material.side === T.BackSide) continue;
      var vis = true, q = o; while (q) { if (!q.visible) { vis = false; break; } q = q.parent; } if (!vis) continue;
      h = hits[i]; break;
    }
    var o2 = origin(), bk = hole().basket;
    if (h && inGroup(h.object, world.baskets[G.hole].group)) { setTarget({ x: bk.x, y: bk.y, z: C.CHAIN_Z, basket: true }); flashHint('TARGET: THE CHAINS'); return; }
    // a tap that lands on something BEHIND the basket (the back wall, the gong, through the chains) means "about here,
    // at the basket": the spot goes on an upright plane at the basket's distance, so the throw is sized for the basket,
    // not for the wall 40 ft behind it. Taps on things in front of the basket (a kettle face, the floor) stay put.
    var dir0 = dirFrom(o2, basketPt()), onP0 = SC.W(o2.x, o2.y, 0).addScaledVector(dir0, Math.max(1.5, distTo(o2, bk)));
    plane.setFromNormalAndCoplanarPoint(dir0.clone().negate(), onP0);
    var pHit = ray.ray.intersectPlane(plane, hitP) ? hitP.clone() : null, tPl = pHit ? camera.position.distanceTo(pHit) : Infinity;
    if (pHit && pHit.y >= 0.02 && (!h || h.distance > tPl + 0.05)) {
      var pz = Math.min(pHit.y, -pHit.z < C.ROOM.y1 ? 4.0 : 30);
      setTarget({ x: pHit.x, y: -pHit.z, z: pz, floor: false, air: pz > 0.4 }); flashHint('TARGET SET'); return;
    }
    if (!h) return;
    var X = h.point.x, Y = -h.point.z, Z = h.point.y;
    var d = distTo({ x: X, y: Y }, o2);
    if (d < 1.0) { flashHint('PICK A SPOT FARTHER OUT'); return; }
    var onFloor = world.grounds.indexOf(h.object) >= 0 || Z < 0.05;
    var zz = onFloor ? 0.02 : Math.min(Math.max(0.05, Z), Y < C.ROOM.y1 ? 4.0 : 30); setTarget({ x: X, y: Y, z: zz, floor: onFloor, air: !onFloor && zz > 0.4 });
    flashHint(onFloor ? 'TARGET: THE FLOOR' : 'TARGET SET');
  }
  function setTarget(t) { G.target = t; scheduleSolve(); setHint(); }
  function targetWorld() { var t = aimTarget(); return SC.W(t.x, t.y, t.floor ? 0.02 : (t.z != null ? t.z : C.CHAIN_Z)); }

  /* ---------- cameras ---------- */
  var cam = { pos: new T.Vector3(), look: new T.Vector3(), init: false };
  var BLOCK = [];
  C.KETTLES.forEach(function (k) { BLOCK.push([k.x, k.y, k.r + 0.45]); });
  C.FERMENTERS.forEach(function (f) { BLOCK.push([f.x, f.y, f.r + 0.45]); });
  C.POSTS_X.forEach(function (x) { C.POSTS_Y.forEach(function (y) { BLOCK.push([x, y, 0.55]); }); });
  BLOCK.push([C.OAK.x, C.OAK.y, 1.0]); BLOCK.push([C.TRUCK.x, C.TRUCK.y, 3.4]); BLOCK.push([C.FIREPIT.x, C.FIREPIT.y, 1.3]); BLOCK.push([C.SILO.x, C.SILO.y, C.SILO.r + 0.6]);
  function safe(v, inside) {
    var R = C.ROOM, Gd = C.GARDEN, D = C.DOOR, x = v.x, y = -v.z, isIn = inside != null ? inside : y < R.y1;
    if (isIn) { x = clamp(x, R.x0 + 0.35, R.x1 - 0.35); y = clamp(y, R.y0 + 0.35, R.y1 - 0.35); v.y = clamp(v.y, 0.35, 5.2); }
    else { x = clamp(x, Gd.x0 + 0.4, Gd.x1 - 0.4); y = clamp(y, R.y1 + 0.5, C.LOT.y1 - 0.5); v.y = Math.max(0.35, v.y); }
    for (var i = 0; i < BLOCK.length; i++) { var b = BLOCK[i], dx = x - b[0], dy = y - b[1], d = Math.hypot(dx, dy); if (d < b[2] && v.y < 5.5) { if (d < 1e-4) { dx = -1; dy = 0; d = 1; } x = b[0] + dx / d * b[2]; y = b[1] + dy / d * b[2]; } }
    v.x = x; v.z = -y; return v;
  }
  /* ---------- keeping the camera out of things and able to see ---------- */
  var SOL = { hole: -1, all: [], see: [] };
  function solids(seeOnly) {
    if (SOL.hole !== G.hole) {
      SOL.hole = G.hole;
      SOL.all = C.worldSolids(G.hole).filter(function (s) { return s.tag !== 'Ceiling' && s.tag !== 'Basket' && s.tag !== 'OtherBasket' && !(s.kind === 'cyl' && s.r < 0.08); });
      SOL.see = SOL.all.filter(function (s) { return s.tag !== 'Wall' && s.tag !== 'Fence' && s.tag !== 'Beam' && s.tag !== 'Table'; });
    }
    return seeOnly ? SOL.see : SOL.all;
  }
  function inSolid(x, y, z, m, list) {
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (s.kind === 'box') {
        var dx = x - s.x, dy = y - s.y;
        if (s.yaw) { var cs = Math.cos(s.yaw), sn = Math.sin(s.yaw), rx = dx * cs + dy * sn; dy = -dx * sn + dy * cs; dx = rx; }
        if (Math.abs(dx) < s.hx + m && Math.abs(dy) < s.hy + m && z > s.z0 - m && z < s.z1 + m) return true;
      } else if (s.kind === 'cyl') {
        if (z > s.z0 - m && z < s.z1 + m && Math.hypot(x - s.x, y - s.y) < s.r + m) return true;
      } else if (s.kind === 'blob') {
        var q = s.squash || 1, ez = (z - s.z) / q;
        if (Math.sqrt((x - s.x) * (x - s.x) + (y - s.y) * (y - s.y) + ez * ez) < s.r * 0.92 + m) return true;
      } else if (s.kind === 'capsule') {
        var ax = s.b.x - s.a.x, ay = s.b.y - s.a.y, az = s.b.z - s.a.z, l2 = ax * ax + ay * ay + az * az || 1;
        var k = clamp(((x - s.a.x) * ax + (y - s.a.y) * ay + (z - s.a.z) * az) / l2, 0, 1);
        if (Math.hypot(x - s.a.x - ax * k, y - s.a.y - ay * k, z - s.a.z - az * k) < s.r + m) return true;
      }
    }
    return false;
  }
  // how far along A -> B (course coords) you get before running into something: 1 = all the way
  function clearFrac(A, B, m, list, upTo) {
    var len = Math.hypot(B.x - A.x, B.y - A.y, B.z - A.z), n = Math.min(60, Math.max(4, Math.ceil(len / 0.2))), end = upTo || 1;
    for (var i = 1; i <= n; i++) { var t = i / n * end; if (inSolid(A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t, A.z + (B.z - A.z) * t, m, list)) return (i - 1) / n * end; }
    return 1;
  }
  function toC(v) { return { x: v.x, y: -v.z, z: v.y }; }
  // spring arm: keep the camera on the near side of anything between it and what it is watching
  function armClamp(anchorW, posW) {
    var A = toC(anchorW), B = toC(posW), f = clearFrac(A, B, 0.22, solids(false));
    if (f < 1) posW.copy(anchorW.clone().lerp(posW, Math.max(0.12, f - 0.04)));
    return posW;
  }
  // the aim camera: behind you if it can see the target, otherwise up and/or to the side until it can
  var AIMCAM = { key: '', pick: 0 };
  // camera spots [back, side, height], cheapest first: straight behind you, then higher, then off to a side, then in front
  var AIM_SPOTS = (function () {
    var out = [[1.35, 0.22, 1.62]];
    [1.35, 2.2, 0.4, -0.6].forEach(function (bk) { [0, 1.5, -1.5, 3.0, -3.0].forEach(function (sd) { [1.62, 2.4, 3.4, 4.6, 6.5].forEach(function (hh) {
      out.push([bk, sd, hh, Math.abs(sd) * 0.9 + (hh - 1.62) * 0.7 + Math.abs(bk - 1.35) * 0.8 + (bk < 1 ? 1.2 : 0)]);
    }); }); });
    var first = out.shift(); out.sort(function (a, b) { return a[3] - b[3]; }); out.unshift(first);
    out.push([6, 0, 10, 50], [10, 0, 16, 60]);   // outdoors only: a crane shot over whatever is in the way
    return out;
  })();
  function aimSpot(o, lt, d, side, i, inside) {
    var s = AIM_SPOTS[i], O = SC.W(o.x, o.y, 0), pos = O.clone().addScaledVector(d, -s[0]).addScaledVector(side, s[1]).setY(inside ? Math.min(s[2], 5.0) : s[2]);
    return safe(pos, inside);
  }
  function pickAimSpot(o, lt, d, side, inside) {
    var key = G.hole + ':' + o.x.toFixed(2) + ',' + o.y.toFixed(2) + ':' + lt.x.toFixed(2) + ',' + lt.y.toFixed(2) + ',' + (lt.z || 0).toFixed(2);
    if (AIMCAM.key === key) return AIMCAM.pick;
    var T0 = { x: lt.x, y: lt.y, z: lt.floor ? 0.15 : (lt.z != null ? lt.z : 1.0) }, L0 = { x: o.x, y: o.y, z: 1.1 }, best = 0, bestF = -1;
    var tl = Math.hypot(T0.x - o.x, T0.y - o.y), upTo = clamp(1 - 0.7 / Math.max(1, tl), 0.6, 0.95);
    for (var i = 0; i < AIM_SPOTS.length; i++) {
      if (inside && AIM_SPOTS[i][2] > 5.0) continue;
      var P = toC(aimSpot(o, lt, d, side, i, inside));
      if (inSolid(P.x, P.y, P.z, 0.25, solids(false)) || clearFrac(L0, P, 0.15, solids(false)) < 1) continue;
      var f = clearFrac(P, T0, 0.05, solids(true), upTo);
      if (f >= upTo - 1e-6) { best = i; bestF = 2; break; }
      if (f > bestF) { bestF = f; best = i; }
    }
    AIMCAM.key = key; AIMCAM.pick = best; return best;
  }
  function dirFrom(o, t) { var d = new T.Vector3(t.x - o.x, 0, -(t.y - o.y)); return d.normalize(); }
  function viewCam(v) {
    var o = origin(), lt = (G.aiming && G.lookFreeze) ? G.lookFreeze : (G.target || basketPt()), bk = hole().basket, O = SC.W(o.x, o.y, 0), d = dirFrom(o, lt), side = new T.Vector3(-d.z, 0, d.x), inside = o.y < C.ROOM.y1;
    var c;
    if (v === 'drone') {
      var B = SC.W(bk.x, bk.y, 0), dist = distTo(o, bk), mid = O.clone().lerp(B, 0.5), db = dirFrom(o, bk), sb = new T.Vector3(-db.z, 0, db.x);
      c = { pos: O.clone().addScaledVector(db, -3.5 - dist * 0.08).addScaledVector(sb, -2.5).setY(7 + dist * 0.28), look: mid.setY(0), free: true };
    } else if (v === 'basket') {
      var B2 = SC.W(bk.x, bk.y, 0), db2 = dirFrom(o, bk), sb2 = new T.Vector3(-db2.z, 0, db2.x);
      c = { pos: B2.clone().addScaledVector(db2, 1.9).addScaledVector(sb2, 0.5).setY(1.6), look: O.clone().setY(0.9) };
    } else {
      var L2 = SC.W(lt.x, lt.y, 0);
      var spot = pickAimSpot(o, lt, d, side, inside);
      c = { pos: aimSpot(o, lt, d, side, spot, inside), look: L2.setY(lt.floor ? 0.4 : (lt.air ? 1.0 + (lt.z - 1.0) * 0.5 : 1.0)), inside: inside };
      if (spot > 0) c.look.lerp(SC.W(o.x, o.y, 0.6), 0.12);
    }
    // pinch zoom: in toward the target, or back and up behind the tee
    var dir = c.look.clone().sub(c.pos), len = dir.length(); dir.normalize();
    if (G.zoom > 0) c.pos.addScaledVector(dir, len * 0.95 * (1 - Math.exp(-0.6 * G.zoom)));
    else if (G.zoom < 0) { c.pos.addScaledVector(dir, 3.2 * G.zoom); c.pos.y += -G.zoom * 1.3; }
    return c;
  }
  function setCam(c, rate, dt, snap) {
    if (!c.free) safe(c.pos, c.inside);
    if (snap || !cam.init) { cam.pos.copy(c.pos); cam.look.copy(c.look); cam.init = true; }
    else { var k = 1 - Math.exp(-rate * dt); cam.pos.lerp(c.pos, k); cam.look.lerp(c.look, k); }
    camera.position.copy(cam.pos); camera.lookAt(cam.look);
  }
  $('viewBtn').addEventListener('click', function () {
    if (G.state !== 'aim') return;
    G.view = G.view === 'tee' ? 'drone' : G.view === 'drone' ? 'basket' : 'tee'; G.zoom = 0;
    flashHint(G.view === 'tee' ? 'TEE VIEW' : G.view === 'drone' ? 'DRONE VIEW' : 'BASKET VIEW');
  });

  /* ---------- hole preview: drone shot from your tee all the way to the basket, then cut back ---------- */
  var ROUTES = [
    [{ x: 0.4, y: 5.0, z: 3.8 }, { x: 0.2, y: 14.0, z: 4.2 }, { x: 1.8, y: 21.5, z: 2.4 }],
    [{ x: 1.0, y: 6.0, z: 3.8 }, { x: -1.0, y: 31.0, z: 3.6 }, { x: -3.5, y: 38.2, z: 2.6 }, { x: -3.5, y: 41.5, z: 2.8 }, { x: -5.0, y: 47.0, z: 4.2 }, { x: -6.6, y: 51.5, z: 2.5 }],
    [{ x: 10.5, y: 48.0, z: 5.0 }, { x: 6.0, y: 54.0, z: 7.0 }, { x: 2.5, y: 64.5, z: 8.8 }, { x: -4.0, y: 70.0, z: 5.0 }, { x: -7.2, y: 72.8, z: 2.6 }],
    [{ x: 4.5, y: 87.0, z: 4.0 }, { x: -2.0, y: 93.0, z: 6.5 }, { x: -6.0, y: 100.8, z: 5.0 }, { x: -9.6, y: 103.2, z: 2.6 }],
    [{ x: 13.5, y: 104.5, z: 4.2 }, { x: 6.0, y: 107.5, z: 5.2 }, { x: 0.5, y: 110.5, z: 5.4 }, { x: -2.6, y: 107.6, z: 3.4 }, { x: -1.6, y: 106.6, z: 2.3 }],
    [{ x: -10.5, y: 89.0, z: 4.0 }, { x: -5.0, y: 98.5, z: 5.0 }, { x: -1.0, y: 106.0, z: 4.5 }, { x: 3.0, y: 113.0, z: 3.8 }, { x: 5.6, y: 116.8, z: 2.4 }]
  ];
  var preview = null;
  function startPreview(cb) {
    var h = hole(), o = origin(), bk = h.basket, tc = viewCam('tee'), od = distTo(o, bk);
    var pts = [tc.pos.clone(), tc.pos.clone().setY(tc.pos.y + 0.8)];
    ROUTES[G.hole].forEach(function (p, i, arr) { if (distTo(p, bk) < od - 1.0 || i === arr.length - 1) pts.push(SC.W(p.x, p.y, p.z)); });
    if (pts.length < 3) { var m = SC.W(o.x + (bk.x - o.x) * 0.55, o.y + (bk.y - o.y) * 0.55, 2.4); pts.push(m); }
    var endP = pts[pts.length - 1];
    if (distTo({ x: endP.x, y: -endP.z }, bk) > od) { pts.pop(); pts.push(SC.W(o.x + (bk.x - o.x) * 0.7, o.y + (bk.y - o.y) * 0.7, 2.2)); }
    preview = { curve: new T.CatmullRomCurve3(pts, false, 'centripetal'), t: 0, dur: reduce ? 0.6 : 6.5, bk: SC.W(bk.x, bk.y, 1.0), cb: cb, look0: tc.look.clone(), cut: false };
    G.state = 'preview'; app.classList.add('throwing');
    var tcard = $('titleCard'); tcard.hidden = false;
    $('tcK').textContent = 'HOLE ' + h.n + (G.mode === 'pitch' ? ' · PAR ' + h.par : '');
    $('tcBig').textContent = h.name;
    $('tcM').textContent = G.mode === 'putt' ? 'PUTTS: ' + Math.round(distTo(h.short, bk) / FT) + ' FT & ' + Math.round(distTo(h.long, bk) / FT) + ' FT' : Math.round(h.dist / FT) + ' FT TEE TO BASKET';
    var b = $('tcBox'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    lights(1.2, 'rainbow'); buildCallouts();
  }
  function stepPreview(dt) {
    var p = preview; p.t += dt / p.dur; var k = clamp(p.t, 0, 1);
    var fly = clamp(k / 0.78, 0, 1), e = fly < 0.5 ? 2 * fly * fly : 1 - Math.pow(-2 * fly + 2, 2) / 2;
    var pos = p.curve.getPoint(e), ahead = p.curve.getPoint(Math.min(1, e + 0.12)).setY(1.2);
    var look = (fly < 0.02 ? p.look0.clone() : ahead).lerp(p.bk, clamp(e * 1.3, 0, 1));
    if (k > 0.78) { // hold on the basket with a slow drift around it
      var hold = (k - 0.78) / 0.14, B = p.bk, off = pos.clone().sub(B), ang = hold * 0.35;
      pos = B.clone().add(new T.Vector3(off.x * Math.cos(ang) - off.z * Math.sin(ang), off.y, off.x * Math.sin(ang) + off.z * Math.cos(ang)));
      look = B.clone();
    }
    cam.pos.copy(pos); cam.look.copy(look); cam.init = true; camera.position.copy(pos); camera.lookAt(look);
    if (k > 0.25) $('titleCard').hidden = true;
    if (k > 0.08) updateCallouts(dt);
    if (k >= 0.92) { var f = $('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); cam.init = false; endPreview(); }
  }
  function skipPreview() { if (preview) { preview.t = 1; } if (intro) intro.t = 1; }
  function endPreview() { var p = preview; preview = null; $('titleCard').hidden = true; clearCallouts(); app.classList.remove('throwing'); G.state = 'aim'; if (p && p.cb) p.cb(); }

  /* ---------- course reveal: a sweep over the whole venue with each hole's path lit up ---------- */
  var intro = null, introObjs = [];
  var HOLE_COL = [0xffc93c, 0x5fe0c8, 0xff5fa2, 0x9ef01a, 0xff8f3c, 0x8ed8ff];
  function pathPts(h) {
    var H = C.HOLES[h], t = H.tee, b = H.basket, pts = [t];
    var w = C.defaultTarget(h, t); if (w) pts.push({ x: w.x, y: C.ROOM.y1 - 1.5 }, { x: w.x, y: C.ROOM.y1 + 1.5 });
    pts.push(b); return pts;
  }
  function buildIntroObjs() {
    introObjs.forEach(function (o) { scene.remove(o); }); introObjs = [];
    C.HOLES.forEach(function (H, h) {
      var pts = pathPts(h), geos = [], mat = new T.MeshBasicMaterial({ color: HOLE_COL[h], transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
      for (var i = 0; i < pts.length - 1; i++) {
        var A = pts[i], B = pts[i + 1], len = distTo(A, B), ux = (B.x - A.x) / len, uy = (B.y - A.y) / len;
        for (var s = 0.6; s < len - 0.9; s += 1.0) {
          var q = new T.PlaneGeometry(0.22, 0.55); q.rotateX(-Math.PI / 2); q.rotateY(Math.atan2(ux, uy));
          var c = SC.W(A.x + ux * s, A.y + uy * s, 0.035); q.translate(c.x, c.y, c.z); geos.push(q);
        }
      }
      var merged = mergeGeos(geos); if (!merged) return;
      var mesh = new T.Mesh(merged, mat); mesh.visible = false; mesh.userData.h = h; scene.add(mesh); introObjs.push(mesh);
      var ring = new T.Mesh(new T.RingGeometry(0.55, 0.85, 40), mat.clone()); ring.rotation.x = -Math.PI / 2; ring.position.copy(SC.W(H.tee.x, H.tee.y, 0.04)); ring.visible = false; ring.userData.h = h; scene.add(ring); introObjs.push(ring);
    });
  }
  function mergeGeos(list) {
    if (!list.length) return null;
    var n = 0; list.forEach(function (g) { n += g.attributes.position.count; });
    var pos = new Float32Array(n * 3), idx = [], off = 0;
    list.forEach(function (g) { pos.set(g.attributes.position.array, off * 3); var ii = g.index.array; for (var i = 0; i < ii.length; i++) idx.push(ii[i] + off); off += g.attributes.position.count; });
    var m = new T.BufferGeometry(); m.setAttribute('position', new T.BufferAttribute(pos, 3)); m.setIndex(idx); return m;
  }
  var pins = [];
  function startIntro(cb) {
    if (!introObjs.length) buildIntroObjs();
    var P = [[-15, -13, 17], [11, 6, 15], [15, 33, 15], [14, 58, 17], [12, 88, 20], [2, 140, 32]].map(function (q) { return SC.W(q[0], q[1], q[2]); });
    var Lk = [[0, 14, 0], [0, 22, 0], [-4, 44, 0], [-3, 62, 0], [-2, 100, 0], [0, 72, 0]].map(function (q) { return SC.W(q[0], q[1], q[2]); });
    intro = { pc: new T.CatmullRomCurve3(P, false, 'centripetal'), lc: new T.CatmullRomCurve3(Lk, false, 'centripetal'), t: 0, dur: reduce ? 0.8 : 10.0, cb: cb };
    G.state = 'intro'; app.classList.add('throwing');
    pins.forEach(function (p) { p.el.remove(); }); pins = [];
    C.HOLES.forEach(function (H, h) {
      var el = document.createElement('div'); el.className = 'pin'; el.style.setProperty('--gc', '#' + HOLE_COL[h].toString(16).padStart(6, '0'));
      el.innerHTML = '<div class="num"></div><div class="nm"></div>'; el.firstChild.textContent = H.n; el.lastChild.textContent = H.name + (G.mode === 'pitch' ? ' · PAR ' + H.par : '');
      app.appendChild(el); pins.push({ el: el, h: h, at: [0.08, 0.24, 0.4, 0.55, 0.64, 0.72][h] });
    });
    var par = C.HOLES.reduce(function (s, H) { return s + H.par; }, 0);
    $('titleCard').hidden = false; $('tcK').textContent = 'WELCOME TO'; $('tcBig').textContent = 'THE TAPROOM';
    $('tcM').textContent = C.HOLES.length + ' HOLES' + (G.mode === 'pitch' ? ' · PAR ' + par : G.mode === 'putt' ? ' · ' + C.HOLES.length * 2 + ' PUTTS' : ' · OPEN PLAY');
    var b = $('tcBox'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    lights(2.5, 'rainbow');
  }
  function stepIntro(dt) {
    var I = intro; I.t += dt / I.dur; var k = clamp(I.t, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    var pos = I.pc.getPoint(e), look = I.lc.getPoint(e);
    cam.pos.copy(pos); cam.look.copy(look); cam.init = true; camera.position.copy(pos); camera.lookAt(look);
    if (k > 0.22) $('titleCard').hidden = true;
    introObjs.forEach(function (o) { var on = k > pins[o.userData.h].at; o.visible = on; if (on) o.material.opacity = Math.min(0.85, (k - pins[o.userData.h].at) * 5) * (0.75 + 0.25 * Math.sin(clock * 6)); });
    world.baskets.forEach(function (b, i) { b.halo.material.opacity = k > pins[i].at ? 0.6 + 0.3 * Math.sin(clock * 5 + i) : 0; });
    pins.forEach(function (p) {
      var bk = C.HOLES[p.h].basket, s = screenOf(SC.W(bk.x, bk.y, 2.0)), ok = k > p.at && !s.behind && s.x > 10 && s.x < L.W - 10 && s.y > 60 && s.y < L.H - 40;
      p.el.classList.toggle('in', ok); if (ok) { var hw = p.el.offsetWidth / 2 + 6; p.el.style.left = clamp(s.x, hw, L.W - hw) + 'px'; p.el.style.top = s.y + 'px'; }
    });
    if (k >= 1) endIntro();
  }
  function endIntro() {
    var I = intro; intro = null; $('titleCard').hidden = true;
    pins.forEach(function (p) { p.el.remove(); }); pins = [];
    introObjs.forEach(function (o) { o.visible = false; });
    var f = $('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    if (I && I.cb) I.cb();
  }

  /* ---------- bonus targets: called out in the flyover, then the thing itself glows ---------- */
  function box3(sx, sz, sy) { return new T.BoxGeometry(sx, sz, sy); }
  var BONUS = [
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
       shells: function () { var b = C.HOLES[3].backstop; return [[box3(b.hx * 2, b.h, b.hy * 2), b.x, b.y, b.h / 2]]; } }],
    [{ id: 'under', color: 0x5fe0c8, label: 'UNDER THE TRUCK', sub: 'SKIP IT UNDER: +1000', p: function () { return [C.BOX_TRUCK.x, C.BOX_TRUCK.y, C.BOX_TRUCK.z1 + 0.5]; },
       shells: function () { var t = C.BOX_TRUCK; return [[box3(t.hx * 2 - 0.1, t.z0 - 0.05, t.hy * 2 - 0.1), t.x, t.y, t.z0 / 2]]; } },
     { id: 'pallets', color: 0xffc93c, label: 'PALLET BANK', sub: 'BANK IT IN: JACKPOT', p: function () { var b = C.HOLES[4].backstop; return [b.x, b.y, b.h + 0.5]; },
       shells: function () { var b = C.HOLES[4].backstop; return [[box3(b.hx * 2, b.h, b.hy * 2), b.x, b.y, b.h / 2]]; } }],
    [{ id: 'under6', color: 0x5fe0c8, label: 'UNDER THE TRUCK', sub: 'SKIP IT UNDER: +1000', p: function () { return [C.BOX_TRUCK.x, C.BOX_TRUCK.y, C.BOX_TRUCK.z1 + 0.5]; },
       shells: function () { var t = C.BOX_TRUCK; return [[box3(t.hx * 2 - 0.1, t.z0 - 0.05, t.hy * 2 - 0.1), t.x, t.y, t.z0 / 2]]; } },
     { id: 'dock', color: 0xffc93c, label: 'DOCK BANK', sub: 'BANK IT IN: JACKPOT', p: function () { var b = C.HOLES[5].backstop; return [b.x, b.y - b.hy, b.h + 0.6]; },
       shells: function () { var b = C.HOLES[5].backstop; return [[box3(b.hx * 2, b.h, b.hy * 2), b.x, b.y, b.h / 2]]; } }]
  ];
  function skipSpot() { var o = origin(), b = hole().basket, d = distTo(o, b) || 1; return [b.x - (b.x - o.x) / d * 1.8, b.y - (b.y - o.y) / d * 1.8]; }
  var glows = [];
  var skipRing = new T.Mesh(new T.RingGeometry(0.25, 0.6, 40), new T.MeshBasicMaterial({ color: 0x5fe0c8, transparent: true, opacity: 0.5, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
  skipRing.rotation.x = -Math.PI / 2; skipRing.visible = false; scene.add(skipRing);
  function buildGlows() {
    glows.forEach(function (g) { g.objs.forEach(function (o) { scene.remove(o); }); }); glows = [];
    BONUS[G.hole].forEach(function (b) {
      var objs = [];
      if (b.shells) b.shells().forEach(function (sh) { var m = SC.glowShell(sh[0], b.color); m.position.copy(SC.W(sh[1], sh[2], sh[3])); scene.add(m); objs.push(m); });
      glows.push({ b: b, objs: objs });
    });
  }
  function updateGlows(t) {
    var on = G.state === 'aim' || G.state === 'preview', pulse = 0.45 + 0.35 * Math.sin(t * 4.2);
    glows.forEach(function (g) {
      var show = on && (!g.b.when || g.b.when());
      g.objs.forEach(function (o) { o.visible = show; if (show) { o.userData.mats[0].uniforms.a.value = pulse; o.userData.mats[1].uniforms.a.value = pulse * 0.35; o.userData.mats[0].uniforms.t.value = 0.05 + 0.04 * (0.5 + 0.5 * Math.sin(t * 4.2)); } });
      if (g.b.floor) { skipRing.visible = show; if (show) { var sp = skipSpot(); skipRing.position.copy(SC.W(sp[0], sp[1], 0.02)); skipRing.material.opacity = pulse * 0.8; skipRing.scale.setScalar(1 + 0.15 * Math.sin(t * 4.2)); } }
    });
  }
  // flyover callouts: each bonus gets a comic label as the camera goes past it
  var callouts = [];
  function buildCallouts() {
    callouts.forEach(function (c) { c.el.remove(); }); callouts = [];
    BONUS[G.hole].forEach(function (b, i) {
      if (b.when && !b.when()) return;
      var el = document.createElement('div'); el.className = 'callout panel'; el.style.setProperty('--r', (i % 2 ? 3 : -3) + 'deg'); el.style.setProperty('--gc', '#' + b.color.toString(16).padStart(6, '0'));
      el.innerHTML = '<b></b><span></span>'; el.firstChild.textContent = b.label; el.lastChild.textContent = b.sub;
      app.appendChild(el); callouts.push({ b: b, el: el, shown: 0 });
    });
  }
  // one callout at a time: the nearest bonus in view gets the stage, and each gets at least a second and a half
  var curCall = null;
  function updateCallouts(dt) {
    var best = null, bd = 1e9;
    callouts.forEach(function (c) {
      var p = c.b.p(), w = SC.W(p[0], p[1], p[2]), s = screenOf(w), d = camera.position.distanceTo(w);
      c.s = s; c.ok = !s.behind && s.x > 40 && s.x < L.W - 40 && s.y > 150 && s.y < L.H - 80 && d < 16;
      if (c.ok && !c.done && d < bd) { bd = d; best = c; }
    });
    if (curCall) { curCall.shown += dt; if (curCall.shown > 1.6 || !curCall.ok) { if (curCall.shown > 1.0 || !curCall.ok) { curCall.done = curCall.shown > 1.0; curCall.el.classList.remove('in'); curCall = null; } } }
    if (!curCall && best) { curCall = best; best.el.classList.add('in'); }
    if (curCall && curCall.ok) { var half = curCall.el.offsetWidth / 2; curCall.el.style.left = clamp(curCall.s.x, half + 8, L.W - half - 8) + 'px'; curCall.el.style.top = (curCall.s.y - 8) + 'px'; }
  }
  function clearCallouts() { callouts.forEach(function (c) { c.el.remove(); }); callouts = []; curCall = null; }
  function screenOf(v3) { var v = v3.clone().project(camera); return { x: (v.x + 1) / 2 * L.W, y: (1 - v.y) / 2 * L.H, behind: v.z > 1 }; }

  /* ---------- the throw ---------- */
  function throwIt(a) {
    if (!G.target) { IN.pts = []; drawStroke(); flashHint('PLACE YOUR AIM FIRST: TAP WHERE TO THROW'); var t = $('hint'); t.classList.remove('nudge'); void t.offsetWidth; t.classList.add('nudge'); return; }
    G.state = 'busy';
    var c = a.read, p = Object.assign({}, solved()), o = origin();
    var dev = a.chord - classCenter(c), aimErr = clamp(-dev * 0.3, -4, 4);
    p.hyzer = clamp((C.BANK[G.hyz] || 0) + (C.BANK[c] || 0) * 0.6, -34, 34);
    G.peaks.push(a.peak); if (G.peaks.length > 15) G.peaks.shift();
    var sorted = G.peaks.slice().sort(function (x, y) { return x - y; }), spErr = touchFor(a.snap) - 1;
    if (sorted.length >= 3) G.medianPeak = sorted[Math.floor(sorted.length / 2)];
    p.aim += aimErr; p.nose += 2.5 * G.nose; p.armSpeed *= (1 + 0.07 * G.power) * (1 + spErr);
    var seed = Math.floor(Math.random() * 1e9);
    if (G.mode === 'pitch') G.stroke++;
    showCall(hyzLabel(-p.hyzer) + (spErr > 0.03 ? ' · BIG ARM' : '') + (G.power ? (G.power > 0 ? ' · POWER +' : ' · POWER ') + G.power : '') + (G.nose ? (G.nose > 0 ? ' · NOSE UP' : ' · NOSE DOWN') : ''));
    showGauge(-p.hyzer, G.nose, 'RELEASED ' + hyzLabel(-p.hyzer), true);
    app.classList.add('throwing'); $('pickBtn').hidden = true;
    setTimeout(function () {
      var rec = C.throwIt(E, G.hole, o, p, seed);
      rec.params = p; rec.mode = G.mode; rec.stroke = G.stroke; rec.shot = G.shot; rec.disc = G.disc;
      startPlay(rec, false);
    }, 60);
  }
  // swipe speed barely matters: anything up to an average flick (2.7 px/ms over its fastest 30 ms, from 400
  // logged strokes) is an average throw, including a slow swipe or a drawn line; faster adds up to 4% at the
  // hardest flicks (5.2). Real extra power is the power bar.
  function touchFor(s) { return 1 + 0.04 * clamp(((s || 0) - 2.7) / 2.5, 0, 1); }
  function showCall(t) { var c = $('call'); c.textContent = t; c.classList.add('show'); clearTimeout(c._t); c._t = setTimeout(function () { c.classList.remove('show'); }, 1100); }

  /* ---------- playback ---------- */
  function startPlay(rec, replay) {
    var o = rec.origin, S = rec.samples, bk = C.HOLES[rec.hole].basket;
    var pos = S.map(function (q) { return new T.Vector3(q.x * FT + o.x, q.z * FT, -(q.y * FT + o.y)); });
    var slow = S.map(function (q, i) { var d = Math.hypot(pos[i].x - bk.x, pos[i].z + bk.y); return d < 2.3 && pos[i].y < 2.2 && !q.post; });
    var evs = (rec.events || []).filter(function (e) { return e.type !== 'release'; }).sort(function (a, b) { return a.t - b.t; });
    discs3.forEach(function (m) { m.visible = false; }); disc = discs3[rec.disc || 0]; disc.visible = true;
    G.play = { rec: rec, S: S, pos: pos, slow: slow, evs: evs, ei: 0, t: 0, i: 0, done: false, replay: replay, endT: S[S.length - 1].t, hold: 0, madeFx: false, bk: bk };
    G.lastPlay = rec; G.state = 'flight'; aimRing.visible = false; lieRing.visible = false;
    $('skipBtn').hidden = false;
  }
  var qA = new T.Quaternion(), up = new T.Vector3(0, 1, 0), nrm = new T.Vector3();
  function stepPlay(dt) {
    var P = G.play, S = P.S, i = P.i;
    while (i < S.length - 2 && S[i + 1].t <= P.t) i++;
    P.i = i;
    var a = S[i], b = S[Math.min(i + 1, S.length - 1)], k = b.t > a.t ? clamp((P.t - a.t) / (b.t - a.t), 0, 1) : 0;
    disc.position.copy(P.pos[i]).lerp(P.pos[Math.min(i + 1, S.length - 1)], k);
    nrm.set(lerp(a.nx, b.nx, k), lerp(a.nz, b.nz, k), -lerp(a.ny, b.ny, k)).normalize();
    qA.setFromUnitVectors(up, nrm); disc.quaternion.copy(qA); disc.rotateY(lerp(a.spinAngle, b.spinAngle, k));
    if (a.chains) world.baskets[P.rec.hole].setChains(a.chains);
    while (P.ei < P.evs.length && P.evs[P.ei].t <= P.t) { fireEvent(P.evs[P.ei], P); P.ei++; }
    var slowNow = P.slow[i] && !reduce, air = P.rec.airTime || 0;
    var rate = slowNow ? 0.4 : (P.t > air + 0.6 ? 1.8 : 1);
    if (!P.done) P.t += dt * rate;
    var d = P.pos[Math.min(i + 3, S.length - 1)].clone().sub(P.pos[i]); d.y = 0; if (d.lengthSq() < 1e-6) d.copy(dirFrom(P.rec.origin, P.bk)); d.normalize();
    var c, B = SC.W(P.bk.x, P.bk.y, 0);
    // after the chains moment: if the disc skips, kicks or rolls away from the basket, go with it
    if (P.nearBasket && !P.follow) { var away = Math.hypot(disc.position.x - B.x, disc.position.z - B.z), ss = screenOf(disc.position); if (away > 2.4 || ss.behind || ss.x < 20 || ss.x > L.W - 20 || ss.y < 60 || ss.y > L.H - 20) P.follow = true; }
    if (P.follow) {
      var mv = P.pos[Math.min(i + 6, S.length - 1)].clone().sub(P.pos[i]); mv.y = 0; if (mv.lengthSq() > 1e-4) { mv.normalize(); P.fdir = P.fdir ? P.fdir.lerp(mv, 0.08).normalize() : mv; }
      var fd = P.fdir || d, low = disc.position.y < 0.4;
      c = { pos: disc.position.clone().addScaledVector(fd, low ? -2.6 : -3.0).setY(disc.position.y + (low ? 1.7 : 1.2)), look: disc.position.clone(), inside: -disc.position.z < C.ROOM.y1 ? true : false };
      safe(c.pos, c.inside); armClamp(disc.position.clone().setY(disc.position.y + 0.3), c.pos); c.free = true;
      setCam(c, 2.6, dt);
    } else if (slowNow || P.nearBasket) {
      P.nearBasket = true;
      var toB = dirFrom(P.rec.origin, P.bk), sd = new T.Vector3(-toB.z, 0, toB.x);
      if (!P.nbPos) {
        // the basket camera: first of these spots with a clear view of the basket
        var Bc = B.clone().setY(1.0), opts = [[-2.3, -1.0], [2.3, -1.0], [-1.4, -2.4], [1.4, -2.4], [-2.0, 1.2], [2.0, 1.2]];
        P.nbPos = null;
        for (var oi = 0; oi < opts.length && !P.nbPos; oi++) { var cand = B.clone().addScaledVector(sd, opts[oi][0]).addScaledVector(toB, opts[oi][1]).setY(1.3); safe(cand); var cc = toC(cand); if (!inSolid(cc.x, cc.y, cc.z, 0.25, solids(false)) && clearFrac(toC(Bc), toC(cand), 0.18, solids(false)) >= 1) P.nbPos = cand; }
        if (!P.nbPos) P.nbPos = armClamp(Bc, B.clone().addScaledVector(sd, -2.3).addScaledVector(toB, -1.0).setY(1.3));
      }
      c = { pos: P.nbPos.clone(), look: B.clone().setY(0.95).lerp(disc.position, 0.35), free: true };
      setCam(c, 3.5, dt);
    } else {
      // a rail camera a step behind the disc, on the side away from trouble
      P.rdir = P.rdir ? P.rdir.lerp(d, disc.position.y < 0.4 ? 0.06 : 0.25).normalize() : d.clone(); var rd = P.rdir;
      var back = disc.position.clone().addScaledVector(rd, -2.4), sideL = new T.Vector3(rd.z, 0, -rd.x);
      c = { pos: back.addScaledVector(sideL, 0.3).setY(Math.max(1.5, disc.position.y + 0.55)), look: disc.position.clone().addScaledVector(rd, 1.2), inside: -disc.position.z < C.ROOM.y1 - 0.4 ? true : (-disc.position.z > C.ROOM.y1 + 0.4 ? false : undefined) };
      safe(c.pos, c.inside); armClamp(disc.position, c.pos); c.free = true;
      setCam(c, 4.5, dt);
      // and never let the smoothing drag the lens through something
      var camC = toC(camera.position); if (inSolid(camC.x, camC.y, camC.z, 0.12, solids(false))) { cam.pos.copy(c.pos); camera.position.copy(c.pos); camera.lookAt(cam.look); }
    }
    if (P.t >= P.endT && !P.done) { P.done = true; P.hold = 0; }
    if (P.done) { P.hold += dt; if (P.hold > 0.45) endPlay(); }
  }
  function endPlay() {
    var P = G.play; G.play = null; $('skipBtn').hidden = true;
    world.baskets[P.rec.hole].setChains(world.REST || null);
    if (P.replay) { disc.visible = false; reopenCard(); return; }
    scoreThrow(P.rec);
  }
  $('skipBtn').addEventListener('click', function () { if (!G.play) return; var P = G.play; while (P.ei < P.evs.length) { if (P.evs[P.ei].type === 'made') fireEvent(P.evs[P.ei], P); P.ei++; } P.t = P.endT; P.done = true; P.hold = 0.45; });

  /* ---------- moments ---------- */
  function engineToWorld(e) { var o = G.play ? G.play.rec.origin : { x: 0, y: 0 }; return new T.Vector3(e.x * FT + o.x, e.z * FT, -(e.y * FT + o.y)); }
  var lastWord = 0;
  function fireEvent(e, P) {
    var at = screenOf(engineToWorld(e));
    if (e.type === 'made' && !P.madeFx) { P.madeFx = true; burst('CHAAING!', screenOf(SC.W(P.bk.x, P.bk.y, 1.1))); shakeIt(); for (var i = 0; i < 30; i++) coin(at.x, at.y, true); for (var j = 0; j < 22; j++) spark(at.x, at.y); lights(1.6, 'gold'); return; }
    var now = performance.now(); if (now - lastWord < 150) return;
    if (e.type === 'bounce') {
      lastWord = now; var n = e.name || '';
      if (n === 'Gong') { burst('DONG!', at); world.gongHit = 1; shakeIt(); for (var g = 0; g < 16; g++) spark(at.x, at.y); lights(0.8, 'gold'); }
      else if (n === 'Keg wall' || n === 'Crate tower') { burst(n === 'Keg wall' ? 'KLONK!' : 'KRAK!', at); shakeIt(); for (var g2 = 0; g2 < 12; g2++) spark(at.x, at.y); }
      else word(/wall/i.test(n) ? 'THWACK!' : /kettle|fermenter/i.test(n) ? 'BWONG!' : /barrel|keg/i.test(n) ? 'BONK!' : /post|pole/i.test(n) ? 'THUNK!' : /truck/i.test(n) ? 'TACO!' : /ceiling|beam/i.test(n) ? 'WHAM!' : /tree|oak/i.test(n) ? 'THOCK!' : /umbrella/i.test(n) ? 'FWUMP!' : 'BOP!', at, '#fff', 30);
    } else if (e.type === 'pole') { lastWord = now; word('CLANG!', at, '#ffc93c', 30); }
    else if (e.type === 'band') { lastWord = now; word('TINK!', at, '#fff', 26); }
    else if (e.type === 'skip' || e.type === 'hop') { lastWord = now; word('SKIP!', at, '#2E9C9A', 28, '#fff3df'); }
    else if (e.type === 'brush' && !P.brushed) { P.brushed = true; lastWord = now; word('RUSTLE!', at, '#4f9a40', 26, '#fff3df'); }
    else if (e.type === 'hung') { lastWord = now; word('STUCK!', at, '#4f9a40', 30, '#fff3df'); }
    else if (e.type === 'roll' && !P.rolled) { P.rolled = true; lastWord = now; word('ROLLER!', at, '#3B86D9', 26, '#fff3df'); }
  }
  function word(text, at, bg, size, color) {
    var el = document.createElement('div'); el.className = 'word panel'; el.textContent = text;
    el.style.left = clamp(at.x, 60, L.W - 60) + 'px'; el.style.top = clamp(at.y - 30, 70, L.H - 120) + 'px';
    el.style.background = bg; el.style.color = color || '#1d130c'; el.style.fontSize = (size || 26) + 'px'; el.style.setProperty('--r', (Math.random() * 12 - 6).toFixed(1) + 'deg');
    app.appendChild(el); requestAnimationFrame(function () { el.classList.add('in'); });
    setTimeout(function () { el.style.opacity = '0'; }, 750); setTimeout(function () { el.remove(); }, 1200);
  }
  function burst(text, at, big) {
    var pts = [], n = 22;
    for (var i = 0; i < n * 2; i++) { var a = Math.PI * i / n, r = i % 2 ? 62 + Math.random() * 10 : 100 + Math.random() * 18; pts.push((130 + Math.cos(a) * r * 1.22).toFixed(1) + ',' + (100 + Math.sin(a) * r * 0.86).toFixed(1)); }
    var h = $('hit'), tl = text.length > 6 ? 200 : 150;
    h.innerHTML = '<polygon points="' + pts.join(' ') + '" fill="#FFC93C" stroke="#1d130c" stroke-width="5" stroke-linejoin="round"/>' +
      '<polygon points="' + pts.join(' ') + '" fill="none" stroke="#E0482F" stroke-width="3" stroke-linejoin="round" transform="translate(130 100) scale(0.82) translate(-130 -100)"/>' +
      '<text x="133" y="117" text-anchor="middle" font-size="52" fill="#1d130c" textLength="' + tl + '" lengthAdjust="spacingAndGlyphs">' + text + '</text>' +
      '<text x="130" y="113" text-anchor="middle" font-size="52" fill="#E0482F" stroke="#1d130c" stroke-width="2" textLength="' + tl + '" lengthAdjust="spacingAndGlyphs">' + text + '</text>';
    h.style.left = clamp(at.x, 130, L.W - 130) + 'px'; h.style.top = clamp(at.y - 40, 160, L.H - 200) + 'px';
    h.style.width = big ? '330px' : ''; h.classList.remove('on'); void h.offsetWidth; h.classList.add('on');
    clearTimeout(h._t); h._t = setTimeout(function () { h.classList.remove('on'); h.style.transform = 'scale(0)'; }, 1300);
  }
  function shakeIt() { var f = $('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); if (reduce) return; stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); }

  /* ---------- particles: coins, sparks, confetti, fireworks ---------- */
  var parts = [];
  var CONF = ['#E0482F', '#FFC93C', '#3B86D9', '#2E9C9A', '#ff5fa2', '#9ef01a', '#fff3df'];
  function coin(x, y, b) { var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = (b ? 6 : 3) + Math.random() * (b ? 9 : 5); parts.push({ k: 'coin', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 7 + Math.random() * 6, spin: Math.random() * 6, vs: 0.15 + Math.random() * 0.3, life: 0, b: 0 }); }
  function spark(x, y, col) { var a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 8; parts.push({ k: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, len: 10 + Math.random() * 16, col: col || '#FFC93C', g: 0 }); }
  function confetti(x, y, dir) { for (var i = 0; i < 46; i++) { var a = -Math.PI / 2 + dir * (0.25 + Math.random() * 0.6), sp = 9 + Math.random() * 10; parts.push({ k: 'conf', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, col: CONF[i % CONF.length], life: 0 }); } }
  function firework(x, y) { var col = CONF[Math.floor(Math.random() * CONF.length)]; for (var i = 0; i < 36; i++) { var a = i / 36 * Math.PI * 2, sp = 3 + Math.random() * 4; parts.push({ k: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, len: 8 + Math.random() * 8, col: col, g: 0.12 }); } }
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
      } else if (q.k === 'conf') {
        q.vy += 0.28; q.vx *= 0.97; q.vy *= 0.97; q.x += q.vx + Math.sin(q.life * 0.2) * 0.8; q.y += q.vy; q.rot += q.vr;
        fx.save(); fx.translate(q.x, q.y); fx.rotate(q.rot); fx.scale(1, Math.cos(q.life * 0.25)); fx.fillStyle = q.col; fx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); fx.restore();
      } else {
        q.vx *= 0.92; q.vy = q.vy * 0.92 + (q.g || 0); q.x += q.vx; q.y += q.vy; var m = Math.hypot(q.vx, q.vy) || 1, lf = q.g ? 48 : 26;
        fx.globalAlpha = Math.max(0, 1 - q.life / lf); fx.strokeStyle = '#1d130c'; fx.lineWidth = 6; fx.lineCap = 'round';
        fx.beginPath(); fx.moveTo(q.x, q.y); fx.lineTo(q.x - q.vx / m * q.len, q.y - q.vy / m * q.len); fx.stroke(); fx.strokeStyle = q.col; fx.lineWidth = 3; fx.stroke(); fx.globalAlpha = 1;
      }
    }
    parts = parts.filter(function (q) { return q.k === 'coin' ? (q.life < 420 && q.b < 5 && q.x > -40 && q.x < L.W + 40) : q.k === 'conf' ? q.life < 260 && q.y < L.H + 20 : q.life < (q.g ? 48 : 26); });
  }
  function celebrate(level) {
    var n = level >= 2 ? 10 : 5;
    confetti(0, L.H, 1); confetti(L.W, L.H, -1);
    for (var i = 0; i < n; i++) setTimeout(function () { firework(40 + Math.random() * (L.W - 80), 90 + Math.random() * L.H * 0.35); }, i * (reduce ? 0 : 220));
    for (var c = 0; c < (level >= 2 ? 90 : 40); c++) coin(Math.random() * L.W, -20 - Math.random() * 300, false);
    lights(level >= 2 ? 4 : 2.5, 'rainbow');
  }
  // the room reacts: string lights flash
  var LT = { t: 0, kind: null };
  function lights(sec, kind) { LT.t = sec; LT.kind = kind; }
  var baseBulb = new T.Color(0xffc46b), tmpC = new T.Color();
  function stepLights(dt, clock) {
    if (LT.t > 0) {
      LT.t -= dt;
      if (LT.kind === 'rainbow') tmpC.setHSL((clock * 1.5) % 1, 0.9, 0.62); else tmpC.setHSL(0.12, 1, 0.55 + 0.25 * Math.sin(clock * 30));
      world.bulbMat.color.copy(tmpC);
      if (LT.t <= 0) world.bulbMat.color.copy(baseBulb);
    }
  }

  /* ---------- scoring ---------- */
  var FUNNY_MISS = ['NOTHING BUT AIR', 'THE BASKET FEARS YOU', 'BOLD STRATEGY', 'WHIFF CITY', 'FOR THE HIGHLIGHT REEL', 'THE FLOOR SAYS HI'];
  function multFor(n) { return n >= 5 ? 4 : n >= 3 ? 3 : n >= 2 ? 2 : 1; }
  function scoreThrow(rec) {
    var r = C.readThrow(rec, G.mode, rec.stroke), list = r.awards.slice(), jack = false, ace = r.awards.some(function (a) { return a.key === 'ace'; });
    if (G.mode === 'free') {
      G.stats.throws++; if (r.made) G.stats.made++; G.stats.tricks += r.tricks; showScore();
      if (!list.length) list.push({ key: 'air', label: FUNNY_MISS[Math.floor(Math.random() * FUNNY_MISS.length)], pts: 0, kind: 'near' });
      showTally(list, true, function () { setTimeout(nextFree, 500); });
      if (r.made && r.tricks >= 2) celebrate(1);
      return;
    }
    if (r.made) {
      G.streak++; G.missStreak = 0;
      var m = multFor(G.streak); if (m > 1) list.splice(1, 0, { key: 'streak', label: 'STREAK x' + m, pts: C.PTS.make * (m - 1), kind: 'streak' });
      if (r.tricks >= 2 || ace) jack = true;
    } else {
      G.streak = 0; G.missStreak++;
      if (G.missStreak >= 2) list.push({ key: 'shake', label: 'SHAKE IT OFF', pts: 100 * G.missStreak, kind: 'near' });
      if (!list.length) list.push({ key: 'air', label: FUNNY_MISS[Math.floor(Math.random() * FUNNY_MISS.length)], pts: 25, kind: 'near' });
    }
    if (G.mode === 'putt') {
      G.results[G.shot] = { made: r.made, tricks: r.tricks, total: 0 };
      if (G.shot === 1 && G.results[0] && G.results[0].made && r.made) {
        list.push({ key: 'pair', label: 'PAIR!', pts: C.PTS.pair, kind: 'make' });
        if (G.results[0].tricks && r.tricks) jack = true;
      }
      var dot = document.querySelectorAll('#shots .dot')[G.shot]; dot.classList.remove('on'); dot.classList.add(r.made ? 'made' : 'miss');
    }
    var finishHole = G.mode === 'putt' ? G.shot === 1 : (r.made || G.stroke >= hole().par + 5);
    if (G.mode === 'pitch' && finishHole) {
      var sn = r.made ? C.scoreName(G.stroke, hole().par) : 'PICKED UP', hp = C.HOLE_PTS[sn] || (r.made ? 100 : 0);
      list.push({ key: 'hole', label: sn + (r.made ? '!' : ''), pts: hp, kind: sn === 'PAR' || sn === 'BOGEY' || !r.made ? 'near' : 'make' });
      G.holeScore = sn;
    }
    var proceed = function () {
      var total = list.reduce(function (s, a) { return s + a.pts; }, 0);
      G.holeAwards += total;
      if (G.mode === 'putt') G.results[G.shot].total = total;
      G.score += total; countScore(); showStreak();
      showTally(list, false, function () { setTimeout(function () { afterThrow(r, finishHole); }, 600); });
    };
    if (jack) {
      G.jackpot = true;
      spinWheel(ace ? 10000 : 2500, ace, function (pts) { list.push({ key: 'jackpot', label: ace ? 'ACE JACKPOT!' : 'JACKPOT!', pts: pts, kind: 'streak' }); proceed(); });
    } else proceed();
  }
  var pickArm = 0;
  function showPick() { var b = $('pickBtn'); b.hidden = !(G.mode === 'pitch' && G.state === 'aim' && G.stroke >= hole().par + 1); if (b.hidden) { b.textContent = 'PICK UP'; pickArm = 0; } }
  $('pickBtn').addEventListener('click', function () {
    if (G.state !== 'aim') return;
    var now = performance.now();
    if (now - pickArm > 4000) { pickArm = now; $('pickBtn').textContent = 'SURE? TAP AGAIN'; setTimeout(function () { if (performance.now() - pickArm >= 3900) $('pickBtn').textContent = 'PICK UP'; }, 4000); return; }
    pickArm = 0; $('pickBtn').hidden = true;
    var h = hole(); G.stroke = h.par + 3; G.holeScore = 'PICKED UP'; G.streak = 0;
    word('PICKED UP', { x: L.W / 2, y: L.H * 0.4 }, '#fff', 34);
    setTimeout(holeCard, 700);
  });
  function showStreak() { var st = $('streak'); if (G.mode !== 'free' && G.streak >= 2) { st.hidden = false; st.textContent = 'STREAK x' + multFor(G.streak); } else st.hidden = true; }
  function showTally(list, noPts, done) {
    var box = $('tally'); box.innerHTML = '';
    list.forEach(function (a, i) {
      var el = document.createElement('div'); el.className = 'award panel ' + a.kind; el.style.setProperty('--r', ((i % 2 ? 1 : -1) * (1 + Math.random() * 2)).toFixed(1) + 'deg');
      el.innerHTML = '<span></span><span class="p"></span>'; el.firstChild.textContent = a.label; el.lastChild.textContent = noPts ? '' : '+' + fmt(a.pts);
      box.appendChild(el);
      setTimeout(function () { el.classList.add('in'); if (a.kind === 'make' || a.kind === 'streak') { for (var k = 0; k < 12; k++) coin(L.W / 2 + (Math.random() - 0.5) * 140, L.H * 0.3, true); } if (a.trick || a.kind === 'streak') confetti(L.W / 2, L.H * 0.32, Math.random() < 0.5 ? 1 : -1); }, reduce ? 0 : 300 * i + 150);
    });
    setTimeout(done, reduce ? 300 : 300 * list.length + 1500);
  }
  function countScore() {
    var from = G.shown, to = G.score, t0 = performance.now(), ms = reduce ? 1 : 900;
    (function f() { var k = Math.min(1, (performance.now() - t0) / ms), e = 1 - Math.pow(1 - k, 3); $('score').textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(f); else G.shown = to; })();
  }
  function showScore() {
    if (G.mode === 'free') { $('score').textContent = G.stats.made + '/' + G.stats.throws; return; }
    $('score').textContent = fmt(G.score);
  }

  /* ---------- the jackpot wheel ---------- */
  var MULTS = [2, 3, 5, 2, 10, 3, 2, 5, 3, 2, 4, 2, 3, 5, 2, 10, 3, 2, 4, 3];
  function spinWheel(base, ace, cb) {
    var w = $('wheel'), strip = $('strip'), list = [];
    for (var r = 0; r < 3; r++) list = list.concat(MULTS);
    strip.innerHTML = list.map(function (m) { return '<div>x' + m + '</div>'; }).join('');
    var pick = MULTS.length * 2 + Math.floor(Math.random() * MULTS.length); if (ace && MULTS[pick % MULTS.length] < 5) pick = MULTS.length * 2 + 4;
    var m = list[pick];
    w.hidden = false; $('wheelAmt').textContent = fmt(base); strip.style.transition = 'none'; strip.style.transform = 'translateY(0)';
    burst(ace ? 'ACE!!!' : 'JACKPOT!', { x: L.W / 2, y: L.H * 0.22 }, true); shakeIt(); celebrate(ace ? 2 : 1);
    if (ace && world.gong) world.gongHit = 1;
    setTimeout(function () {
      strip.style.transition = 'transform ' + (reduce ? 0.01 : 2.1) + 's cubic-bezier(.12,.75,.2,1)'; strip.style.transform = 'translateY(' + (-pick * 84) + 'px)';
      setTimeout(function () {
        var t0 = performance.now(), to = base * m;
        burst('x' + m + '!', { x: L.W / 2, y: L.H * 0.5 }); celebrate(m >= 5 ? 2 : 1);
        (function f() { var k = Math.min(1, (performance.now() - t0) / (reduce ? 1 : 900)); $('wheelAmt').textContent = fmt(base + (to - base) * k); if (k < 1) requestAnimationFrame(f); else setTimeout(function () { w.hidden = true; cb(to); }, 800); })();
      }, reduce ? 50 : 2250);
    }, reduce ? 50 : 700);
  }

  /* ---------- flow ---------- */
  function afterThrow(r, finishHole) {
    $('tally').innerHTML = ''; ink.clearRect(0, 0, L.W, L.H); IN.pts = []; disc.visible = false;
    if (G.mode === 'putt') { if (G.shot === 0) { G.shot = 1; beginAim(true); } else holeCard(); return; }
    if (finishHole) { holeCard(); return; }
    // pitch: play it from where it stopped
    var rest = G.lastPlay.rest, f = C.fixLie(rest.x, rest.y, G.hole, G.lie || hole().tee);
    G.lie = { x: f.x, y: f.y };
    if (f.ob) { G.stroke++; word('OB! +1', { x: L.W / 2, y: L.H * 0.4 }, '#E0482F', 34, '#fff3df'); }
    else if (f.moved) word('LIE MOVED', { x: L.W / 2, y: L.H * 0.4 }, '#fff', 26);
    beginAim(false);
  }
  function nextFree() { $('tally').innerHTML = ''; ink.clearRect(0, 0, L.W, L.H); IN.pts = []; disc.visible = false; beginAim(false); }
  function showMeta() {
    var h = hole(), o = origin(), ft = Math.round(distTo(o, h.basket) / FT), m;
    if (G.mode === 'putt') m = (G.shot === 0 ? 'SHORT' : 'LONG') + ' · ' + ft + ' FT';
    else if (G.mode === 'pitch') m = 'PAR ' + h.par + ' · #' + (G.stroke + 1) + ' · ' + ft + ' FT';
    else m = TEE_NAME[G.freeTee] + ' · ' + ft + ' FT';
    $('hole').querySelector('.n').textContent = 'HOLE ' + h.n + (G.mode === 'free' ? ' ▸' : '');
    $('holeMeta').textContent = m;
    $('hole').classList.toggle('pick', G.mode === 'free');
  }
  function beginAim(announce) {
    G.aiming = false; G.target = null; G.power = 0; G.zoom = 0; G.view = 'tee'; showPower(); showNose(); autoDisc(); scheduleSolve(); showMeta(); setHint();
    G.state = 'aim'; app.classList.remove('throwing');
    var o = origin(); lieRing.position.copy(SC.W(o.x, o.y, 0.015)); lieRing.visible = G.mode === 'pitch' && G.stroke > 0;
    if (announce) showCall((G.mode === 'putt' ? (G.shot === 0 ? 'SHORT PUTT' : 'LONG PUTT') : 'THROW ' + (G.stroke + 1)) + ' · ' + Math.round(distTo(o, hole().basket) / FT) + ' FT');
    world.baskets.forEach(function (b, i) { b.halo.material.opacity = i === G.hole ? 0.8 : 0; });
    showPick();
  }
  function startHole(flyover) {
    G.shot = 0; G.stroke = 0; G.lie = null; G.results = []; G.jackpot = false; G.holeAwards = 0; G.holeScore = null; G.view = 'tee'; G.zoom = 0; G.target = null; G.nose = 0; G.hyz = 0;
    document.querySelectorAll('#shots .dot').forEach(function (d, i) { d.className = 'dot' + (i === 0 ? ' on' : ''); });
    $('shots').style.display = G.mode === 'putt' ? 'flex' : 'none';
    buildGlows(); showMeta(); autoDisc();
    world.baskets.forEach(function (b, i) { b.halo.material.opacity = i === G.hole ? 0.8 : 0; });
    if (flyover) startPreview(function () { beginAim(true); }); else beginAim(true);
  }
  function startCourse(mode) {
    G.mode = mode; G.hole = 0; G.score = 0; G.shown = 0; G.streak = 0; G.missStreak = 0; G.holeLog = []; G.stats = { throws: 0, made: 0, tricks: 0 };
    G.freeTee = 'tee'; $('teeName').textContent = 'PITCH'; $('teeSel').hidden = mode !== 'free';
    $('menu').hidden = true; showScore(); showStreak(); $('streak').hidden = true;
    startIntro(function () { startHole(true); });
  }

  /* ---------- cards ---------- */
  function setCard(k, big, amt, lines, jack, btnA, btnB, kind) {
    G.state = 'card'; G.cardKind = kind;
    var card = $('card'); card.hidden = false; card.classList.toggle('jack', !!jack);
    $('cardK').textContent = k; $('cardBig').textContent = big; $('cardLines').innerHTML = lines;
    $('replayBtn').textContent = btnA; $('nextBtn').textContent = btnB;
    var bg = $('cardBig'), bx = $('cardBox'); bg.style.fontSize = ''; var room = bx.clientWidth - 36;
    if (bg.scrollWidth > room) bg.style.fontSize = (parseFloat(getComputedStyle(bg).fontSize) * room / bg.scrollWidth) + 'px';
    card.classList.remove('show'); void card.offsetWidth; card.classList.add('show');
    var t0 = performance.now(), el = $('cardAmt'); (function f() { var q = Math.min(1, (performance.now() - t0) / (reduce ? 1 : 1100)), e = 1 - Math.pow(1 - q, 3); el.textContent = fmt(amt * e); if (q < 1) requestAnimationFrame(f); })();
    setTimeout(function () { $('cardBtns').classList.add('in'); }, reduce ? 0 : 900);
    if (jack) celebrate(1);
  }
  var lastCard = null;
  function holeCard() {
    var h = hole(), last = G.hole === C.HOLES.length - 1, lines = '', big, k;
    if (G.mode === 'putt') {
      var made = G.results.filter(function (r) { return r && r.made; }).length;
      big = G.jackpot ? 'JACKPOT!' : made === 2 ? 'PAIRED IT!' : made === 1 ? 'ONE DOWN' : 'WHIFF CITY';
      ['SHORT', 'LONG'].forEach(function (s, i) { var r = G.results[i]; if (r) lines += '<span>' + s + ': ' + (r.made ? 'MADE' : 'MISSED') + '</span><span>+' + fmt(r.total) + '</span>'; });
      G.holeLog.push({ n: h.n, text: made + '/2', pts: G.holeAwards });
      k = 'HOLE ' + h.n + ' · ' + h.name;
    } else {
      big = G.jackpot && G.holeScore !== 'ACE' ? 'JACKPOT!' : (G.holeScore || 'DONE') + (G.holeScore && G.holeScore !== 'PICKED UP' ? '!' : '');
      lines = '<span>THROWS</span><span>' + G.stroke + ' (PAR ' + h.par + ')</span><span>HOLE POINTS</span><span>+' + fmt(G.holeAwards) + '</span>';
      G.holeLog.push({ n: h.n, text: G.holeScore + ' (' + G.stroke + ')', pts: G.holeAwards, strokes: G.stroke, par: h.par });
      k = 'HOLE ' + h.n + ' · PAR ' + h.par;
    }
    lastCard = { k: k, big: big, amt: G.holeAwards, lines: lines, jack: G.jackpot, last: last };
    setCard(k, big, G.holeAwards, lines, G.jackpot, 'REPLAY', last ? 'FINISH' : 'NEXT HOLE', 'hole');
  }
  function reopenCard() { var c = lastCard; setCard(c.k, c.big, c.amt, c.lines, false, 'REPLAY', c.last ? 'FINISH' : 'NEXT HOLE', 'hole'); }
  function courseCard() {
    var lines = '', strokes = 0, par = 0;
    G.holeLog.forEach(function (l) { lines += '<span>HOLE ' + l.n + ': ' + l.text + '</span><span>+' + fmt(l.pts) + '</span>'; if (l.strokes) { strokes += l.strokes; par += l.par; } });
    var big = G.mode === 'pitch' ? (strokes - par < 0 ? (strokes - par) + ' UNDER?! ' : strokes - par === 0 ? 'EVEN PAR' : '+' + (strokes - par)) : 'COURSE DONE';
    if (G.mode === 'pitch' && strokes - par < 0) big = (par - strokes) + ' UNDER!';
    setCard('THE TAPROOM · ' + (G.mode === 'putt' ? 'PUTT' : 'PITCH'), big, G.score, lines, G.score > 20000, 'MENU', 'PLAY AGAIN', 'course');
    celebrate(G.score > 20000 ? 2 : 1);
  }
  $('replayBtn').addEventListener('click', function () {
    $('card').hidden = true; $('cardBtns').classList.remove('in');
    if (G.cardKind === 'course') { toMenu(); return; }
    if (!G.lastPlay) return; app.classList.add('throwing'); startPlay(G.lastPlay, true);
  });
  $('nextBtn').addEventListener('click', function () {
    $('card').hidden = true; $('cardBtns').classList.remove('in');
    if (G.cardKind === 'course') { startCourse(G.mode); return; }
    if (G.hole === C.HOLES.length - 1) { courseCard(); return; }
    G.hole++; startHole(true);
  });
  function toMenu() { G.state = 'menu'; G.mode = null; $('menu').hidden = false; $('card').hidden = true; app.classList.add('throwing'); clearCallouts(); glows.forEach(function (g) { g.objs.forEach(function (o) { o.visible = false; }); }); skipRing.visible = false; }
  document.querySelectorAll('.mode').forEach(function (b) { b.addEventListener('click', function () { startCourse(b.dataset.mode); }); });
  $('pauseBtn').addEventListener('click', function () { $('sheet').hidden = false; $('resumeBtn').focus(); });
  $('resumeBtn').addEventListener('click', function () { $('sheet').hidden = true; });
  $('restartBtn').addEventListener('click', function () { $('sheet').hidden = true; abortPlay(); startCourse(G.mode || 'putt'); });
  $('menuBtn2').addEventListener('click', function () { $('sheet').hidden = true; abortPlay(); toMenu(); });
  function abortPlay() { G.play = null; preview = null; if (intro) { intro = null; pins.forEach(function (p) { p.el.remove(); }); pins = []; introObjs.forEach(function (o) { o.visible = false; }); } clearCallouts(); $('titleCard').hidden = true; $('wheel').hidden = true; $('skipBtn').hidden = true; discs3.forEach(function (m) { m.visible = false; }); $('tally').innerHTML = ''; ink.clearRect(0, 0, L.W, L.H); }

  /* ---------- ambient life ---------- */
  function animateRoom(t, dt) {
    world.anim.forEach(function (a) {
      if (a.kind === 'neon') a.mesh.material.opacity = (Math.sin(t * 23 + a.mesh.id) > 0.97 || Math.sin(t * 3.1) > 0.995) ? 0.55 : 1;
      else if (a.kind === 'flutter') a.mesh.rotation.x = Math.sin(t * 2.2 + a.ph) * 0.12;
      else if (a.kind === 'spin') a.mesh.rotation.z += dt * a.rate;
      else if (a.kind === 'clock') a.mesh.rotation.z = -t * 0.2;
      else if (a.kind === 'flames') { a.mesh.scale.y = 1 + Math.sin(t * 13) * 0.12 + Math.sin(t * 7.3) * 0.08; a.mesh.rotation.y += dt * 1.5; }
      else if (a.kind === 'firelight') a.light.intensity = 1.1 + Math.sin(t * 17) * 0.15 + Math.sin(t * 5) * 0.1;
    });
    if (world.gongHit) { world.gongHit = Math.max(0, world.gongHit - dt * 0.7); var w = Math.sin(t * 30) * 0.08 * world.gongHit; world.gong.rotation.z = w; world.gongFace.rotation.z = w; }
    world.baskets.forEach(function (b, i) { if (i === G.hole && G.mode) b.halo.material.opacity = 0.55 + 0.3 * Math.sin(t * 4); });
  }

  /* ---------- main loop ---------- */
  var last = performance.now(), clock = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    animateRoom(clock, dt); stepLights(dt, clock);
    if (G.state === 'menu') {
      // attract mode: a slow drone orbit over the course
      G.attract += dt * 0.06; var a = G.attract;
      var p = SC.W(Math.sin(a) * 18, 60 + Math.cos(a) * 46, 16), l = SC.W(0, 62, 0);
      setCam({ pos: p, look: l, free: true }, 1.5, dt, !cam.init);
    } else if (G.state === 'intro' && intro) stepIntro(dt);
    else if (G.state === 'preview' && preview) stepPreview(dt);
    else if (G.state === 'flight' && G.play) stepPlay(dt);
    else if (G.mode) {
      var v = viewCam(G.view);
      if (G.state === 'aim' && G.view === 'tee' && !reduce) { v.pos.x += Math.sin(clock * 0.6) * 0.05; v.pos.y += Math.sin(clock * 0.9) * 0.025; }
      setCam(v, 3.2, dt);
    }
    var cp = camera.position, camIn = -cp.z < C.ROOM.y1 && -cp.z > C.ROOM.y0 && cp.x > C.ROOM.x0 && cp.x < C.ROOM.x1 && cp.y < C.ROOM.h - 0.2;
    var hideTop = (G.state === 'aim' && G.view === 'drone') || G.state === 'menu' || G.state === 'intro' || (G.state === 'preview' && !camIn) || (G.state === 'flight' && !camIn && cp.y > C.ROOM.h);
    world.ceiling.visible = !hideTop; world.roof.visible = !hideTop && !camIn;
    if (G.state === 'aim') {
      var tp = targetWorld(), sp = screenOf(tp), at = $('aimTag');
      // no reticle until you place one
      at.style.opacity = (!G.target || sp.behind) ? '0' : '1'; at.style.left = sp.x + 'px'; at.style.top = sp.y + 'px'; RET.sx = sp.x; RET.sy = sp.y; RET.behind = sp.behind || !G.target;
      var air = !!(G.target && G.target.air);
      aimRing.visible = air || !!(G.target && G.target.floor); if (aimRing.visible) { aimRing.position.copy(tp).setY(0.02); aimRing.rotation.x = -Math.PI / 2; }
      dropLine.visible = air; if (air) { dropLine.position.copy(tp); dropLine.scale.set(1, tp.y, 1); dropLine.computeLineDistances(); }
    } else { $('aimTag').style.opacity = '0'; aimRing.visible = false; dropLine.visible = false; }
    updateGlows(clock); updateReticle();
    renderer.render(scene, camera);
    stepParts();
    requestAnimationFrame(frame);
  }

  world.REST = FlightlineBasket.restPose();
  new ResizeObserver(layout).observe(app);
  layout(); showPower(); showNose(); showDisc();
  app.classList.add('throwing');
  setCam({ pos: SC.W(0, 12, 13), look: SC.W(0, 40, 0), free: true }, 1, 0, true);
  renderer.render(scene, camera);
  $('loading').hidden = true;
  requestAnimationFrame(frame);
  window.__putt = { G: G, world: world, camera: camera, throwIt: throwIt, startCourse: startCourse, skipPreview: skipPreview, startHole: startHole, pv: function () { return preview; }, viewCam: viewCam, aimcam: function () { return AIMCAM; }, L: function () { return L; } };
})();
