'use strict';
// ---- the central tower, BUILT IN CODE (no model, no texture file). It stands where the scanned tower stood, to its measured
//      profile: brick shaft (r 15.3 -> 14.7 m, 4 to 44 m), gallery at 50 m (r 22), upper shaft to 74 m, a 14-sided riveted cabin
//      to 93 m, a domed roof and mast to 123 m, a lattice crane on the roof and a jib with a hanging buoy. Every part is a primitive
//      or a lathe; every surface is drawn by one shader in the tower's own coordinates (metres round the wall, metres up it), so a
//      brick, a seam and a rivet keep their size at any distance. aM = which material a vertex belongs to ----
const TowerCode = (() => {
  const P = [], N = [], M = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1);
  const BRICK = 0, PANEL = 1, STEEL = 2, CRANE = 3, GLASS = 4, WOOD = 5, BUOY = 6, COPPER = 7, CONC = 8, RUBBER = 9, ROPE = 10, LAMP = 11, HAZ = 12, SIGN = 13;
  const U = { uAxis: { value: new THREE.Vector3() }, uLamp: { value: 0 }, uWet: { value: 0 } };
  function add(g, id, mtx, flat) { let h = g.index ? g.toNonIndexed() : g; if (mtx) h.applyMatrix4(mtx); if (flat) h.computeVertexNormals();
    const p = h.attributes.position.array, n = h.attributes.normal.array; for (let i = 0; i < p.length; i++) { P.push(p[i]); N.push(n[i]); } for (let i = 0; i < p.length / 3; i++) M.push(id); h.dispose(); if (h !== g) g.dispose(); }
  const at = (x, y, z, ry = 0, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), ONE);
  const lathe = (pts, id, seg = 64) => add(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg), id);
  // a point on the wall: azimuth a (radians from +z toward +x), radius r, height y
  const pol = (a, r, y, out = new THREE.Vector3()) => out.set(Math.sin(a) * r, y, Math.cos(a) * r);
  // a straight member from a to b: a box of section w x h, or a round bar
  function beam(a, b, w, id, round) { const L = v0.subVectors(b, a).length(); if (L < 1e-3) return; q.setFromUnitVectors(UPV, v1.subVectors(b, a).normalize());
    m4.compose(v2.addVectors(a, b).multiplyScalar(0.5), q, ONE); add(round ? new THREE.CylinderGeometry(w / 2, w / 2, L, 8, 1) : new THREE.BoxGeometry(w, L, w), id, m4.clone()); }
  // a lattice boom from a to b: four chords on a square of side w, laced on all four faces
  function truss(a, b, w, id, chord = 0.26, lace = 0.16) {
    const ax = new THREE.Vector3().subVectors(b, a), L = ax.length(); ax.normalize(); const s = new THREE.Vector3().crossVectors(ax, Math.abs(ax.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : UPV).normalize(), u = new THREE.Vector3().crossVectors(s, ax).normalize();
    const c = (k, t) => new THREE.Vector3().copy(a).addScaledVector(ax, t).addScaledVector(s, (k & 1 ? 1 : -1) * w / 2).addScaledVector(u, (k & 2 ? 1 : -1) * w / 2);
    for (let k = 0; k < 4; k++) beam(c(k, 0), c(k, L), chord, id);
    const n = Math.max(2, Math.round(L / (w * 1.15))); for (let i = 0; i < n; i++) { const t0 = L * i / n, t1 = L * (i + 1) / n;
      for (const [k0, k1] of [[0, 1], [1, 3], [3, 2], [2, 0]]) { beam(c(k0, t0), c(k1, t1), lace, id); if (i === 0 || i === n - 1) beam(c(k0, i ? t1 : t0), c(k1, i ? t1 : t0), lace, id); } } }
  function railing(r, y, h, id, step = 9) { for (let a = 0; a < 360; a += step) add(new THREE.CylinderGeometry(0.13, 0.13, h, 6), id, at(Math.sin(rad(a)) * r, y + h / 2, Math.cos(rad(a)) * r));
    for (const k of [1, 0.52]) add(new THREE.TorusGeometry(r, 0.12, 6, 120), id, at(0, y + h * k, 0, 0, Math.PI / 2)); }
  // a window in a round wall: a steel frame with dark glass standing a hand proud of it
  function windowAt(a, r, y, w, h) { add(new THREE.BoxGeometry(w + 0.7, h + 0.7, 0.5), STEEL, at(Math.sin(a) * r, y, Math.cos(a) * r, a)); add(new THREE.BoxGeometry(w, h, 0.62), GLASS, at(Math.sin(a) * r, y, Math.cos(a) * r, a));
    add(new THREE.BoxGeometry(w + 1.1, 0.35, 0.9), STEEL, at(Math.sin(a) * r, y - h / 2 - 0.45, Math.cos(a) * r, a)); }

  function build(scene, L, sink) {
    const t0 = performance.now(), r = rng(9041), sh1 = y => lerp(15.3, 14.7, (y - 4.2) / 39.8), sh2 = y => lerp(14.2, 13.6, (y - 50.2) / 23.8);
    // ---- foot, lower shaft, its bands ----
    lathe([[17.6, -10], [17.6, 2.6], [16.9, 3.6], [15.9, 4.2], [15.3, 4.2]], STEEL, 72);
    lathe([[15.3, 4.2], [14.7, 44]], BRICK, 96);
    for (const y of [9.5, 23.5, 37.5]) lathe([[sh1(y) - 0.05, y - 0.7], [sh1(y) + 0.42, y - 0.5], [sh1(y) + 0.42, y + 0.5], [sh1(y) - 0.05, y + 0.7]], STEEL, 96);
    for (const [y, n, a0] of [[16.5, 7, 0.2], [30.5, 7, 0.65]]) for (let i = 0; i < n; i++) windowAt(a0 + i * TAU / n, sh1(y) + 0.05, y, 1.7, 3.0);
    // a door on the water side and its landing
    windowAt(rad(8), sh1(7) + 0.05, 7.6, 2.6, 4.6); add(new THREE.BoxGeometry(6.5, 0.45, 4.2), WOOD, at(Math.sin(rad(8)) * 17.4, 5.0, Math.cos(rad(8)) * 17.4, rad(8)));
    // ---- the gallery: a corbel of steel, a plank deck, a rail ----
    lathe([[14.7, 44], [15.4, 45.2], [20.4, 48.6], [21.8, 49.2], [22.3, 49.25], [22.3, 50.15], [21.9, 50.2]], STEEL, 96);
    for (let i = 0; i < 20; i++) { const a = i * TAU / 20; beam(pol(a, 15.0, 44.6), pol(a, 21.6, 49.0), 0.42, STEEL); }
    add(new THREE.RingGeometry(14.0, 21.95, 96, 1).rotateX(-Math.PI / 2), WOOD, at(0, 50.22, 0));
    railing(21.85, 50.2, 2.3, STEEL, 7.5);
    // ---- upper shaft ----
    lathe([[14.2, 50.2], [13.6, 74]], BRICK, 96);
    lathe([[14.55, 50.2], [14.55, 51.3], [14.2, 51.5]], STEEL, 96);
    for (const y of [62]) lathe([[sh2(y) - 0.05, y - 0.6], [sh2(y) + 0.4, y - 0.42], [sh2(y) + 0.4, y + 0.42], [sh2(y) - 0.05, y + 0.6]], STEEL, 96);
    for (const [y, n, a0] of [[56.5, 6, 0.4], [68, 6, 0.9]]) for (let i = 0; i < n; i++) windowAt(a0 + i * TAU / n, sh2(y) + 0.05, y, 1.6, 2.8);
    windowAt(rad(-150), sh2(52.6) + 0.05, 52.7, 2.2, 4.0);                                           // the gallery door
    // ---- the upper walk under the cabin ----
    lathe([[13.6, 72.4], [14.4, 73.2], [17.3, 74.5], [17.7, 74.55], [17.7, 75.3], [17.3, 75.35]], STEEL, 96);
    for (let i = 0; i < 14; i++) { const a = i * TAU / 14 + 0.1; beam(pol(a, 13.8, 72.6), pol(a, 17.2, 74.5), 0.34, STEEL); }
    add(new THREE.RingGeometry(13.5, 17.4, 96, 1).rotateX(-Math.PI / 2), WOOD, at(0, 75.37, 0));
    railing(17.35, 75.35, 2.1, STEEL, 10);
    // ---- the cabin: fourteen riveted plates, portholes, two big windows ----
    const NS = 14, cab0 = 75.35, cab1 = 93.2, rc = 15.1, ap = rc * Math.cos(Math.PI / NS);
    add(new THREE.CylinderGeometry(rc + 0.25, rc - 0.25, cab1 - cab0, NS, 1, true), PANEL, at(0, (cab0 + cab1) / 2, 0, Math.PI / NS), true);
    for (let i = 0; i < NS; i++) { const a = i * TAU / NS, c = pol(a, ap + 0.05, 0);
      if (i === 1 || i === 8) { add(new THREE.BoxGeometry(4.4, 5.2, 0.5), STEEL, at(c.x, 82.6, c.z, a)); add(new THREE.BoxGeometry(3.7, 4.5, 0.62), GLASS, at(c.x, 82.6, c.z, a)); add(new THREE.BoxGeometry(0.22, 4.5, 0.7), STEEL, at(c.x, 82.6, c.z, a)); add(new THREE.BoxGeometry(3.7, 0.22, 0.7), STEEL, at(c.x, 82.6, c.z, a)); }
      else { for (const y of [80.2, 88.2]) { if (y < 81 && i % 3 === 2) continue; add(new THREE.TorusGeometry(1.45, 0.32, 8, 28), STEEL, at(c.x, y, c.z, a)); add(new THREE.CylinderGeometry(1.4, 1.4, 0.3, 28), GLASS, at(c.x, y, c.z, a, Math.PI / 2)); } }
      beam(pol(a + Math.PI / NS, rc + 0.3, cab0), pol(a + Math.PI / NS, rc - 0.2, cab1), 0.5, STEEL); }                 // a strap over every joint
    lathe([[rc - 0.3, cab0], [rc + 0.75, cab0 + 0.15], [rc + 0.75, cab0 + 1.0], [rc - 0.2, cab0 + 1.2]], STEEL, NS * 4);
    // ---- eave, dome, mast ----
    lathe([[rc - 0.3, cab1 - 0.5], [16.9, cab1 + 0.1], [17.1, cab1 + 0.9], [15.6, cab1 + 1.7]], STEEL, 96);
    lathe([[15.6, 94.9], [14.6, 98.2], [12.2, 101.0], [8.4, 103.2], [4.2, 104.5], [1.5, 104.9], [1.5, 106.6], [0.9, 107.0]], COPPER, 96);
    for (let i = 0; i < 14; i++) { const a = i * TAU / 14; beam(pol(a, 15.5, 95.1), pol(a, 12.3, 101.05), 0.3, STEEL); beam(pol(a, 12.3, 101.05), pol(a, 4.3, 104.55), 0.26, STEEL); }
    add(new THREE.CylinderGeometry(0.34, 0.5, 17, 10), STEEL, at(0, 115.2, 0)); add(new THREE.BoxGeometry(6.4, 0.24, 0.24), STEEL, at(0, 117.5, 0, 0.5)); add(new THREE.BoxGeometry(3.6, 0.2, 0.2), STEEL, at(0, 120.3, 0, 2.0));
    add(new THREE.SphereGeometry(0.75, 14, 10), BUOY, at(0, 124.1, 0)); add(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 20), STEEL, at(0, 112.0, 0));
    for (const [a, rr, h] of [[rad(200), 9.5, 4.2], [rad(250), 11.5, 3.0], [rad(140), 7, 5.0]]) { const y = 99.5 + (15 - rr) * 0.35; add(new THREE.CylinderGeometry(0.7, 0.8, h, 12), STEEL, at(Math.sin(a) * rr, y + h / 2, Math.cos(a) * rr)); add(new THREE.ConeGeometry(1.25, 0.9, 12), STEEL, at(Math.sin(a) * rr, y + h + 0.45, Math.cos(a) * rr)); }
    // ---- the roof crane (toward 30 degrees): pedestal, cab, mast, boom, stays, hook ----
    { const A = rad(30), base = pol(A, 9.5, 99.6), top = pol(A, 9.5, 113.5), tip = pol(A, 33.5, 109.0), tail = pol(A, 0.5, 108.5);
      add(new THREE.CylinderGeometry(2.4, 2.8, 2.2, 16), HAZ, at(base.x, base.y + 0.6, base.z)); add(new THREE.BoxGeometry(4.4, 3.6, 5.2), PANEL, at(base.x, base.y + 3.4, base.z, A));
      add(new THREE.BoxGeometry(4.5, 1.5, 0.5), GLASS, at(base.x + Math.sin(A) * 2.4, base.y + 4.0, base.z + Math.cos(A) * 2.4, A));
      truss(pol(A, 9.5, 105), top, 1.7, CRANE); truss(pol(A, 11.0, 104.6), tip, 1.9, CRANE, 0.3, 0.17); truss(pol(A, 8.0, 104.6), tail, 1.6, CRANE);
      beam(top, tip, 0.16, STEEL, true); beam(top, pol(A, 22, 107.2), 0.16, STEEL, true); beam(top, tail, 0.16, STEEL, true);
      add(new THREE.BoxGeometry(3.0, 2.6, 2.6), STEEL, at(tail.x, tail.y - 1.2, tail.z, A));                                           // counterweight
      const hk = pol(A, 32.6, 0); beam(new THREE.Vector3(hk.x, 108.4, hk.z), new THREE.Vector3(hk.x, 95.5, hk.z), 0.12, STEEL, true); add(new THREE.BoxGeometry(1.1, 1.6, 0.8), CRANE, at(hk.x, 94.9, hk.z, A)); add(new THREE.TorusGeometry(0.55, 0.14, 6, 14, Math.PI * 1.4), STEEL, at(hk.x, 93.7, hk.z, A)); }
    // ---- the jib over the west side and the buoy on its line ----
    { const A = rad(-92), root = pol(A, 14.6, 85.2), tip = pol(A, 35.5, 86.6), king = pol(A, 14.9, 92.6);
      truss(root, tip, 1.5, CRANE, 0.24, 0.15); beam(king, tip, 0.14, STEEL, true); beam(king, pol(A, 25, 85.9), 0.14, STEEL, true); beam(pol(A, 14.9, 84), king, 0.5, STEEL);
      const b = pol(A, 33.2, 0); beam(new THREE.Vector3(b.x, 85.6, b.z), new THREE.Vector3(b.x, 72.5, b.z), 0.14, STEEL, true);
      add(new THREE.SphereGeometry(3.3, 28, 20).scale(1, 1.12, 1), BUOY, at(b.x, 68.6, b.z)); add(new THREE.TorusGeometry(3.32, 0.22, 8, 36), STEEL, at(b.x, 68.6, b.z, 0, Math.PI / 2)); add(new THREE.CylinderGeometry(0.5, 0.9, 1.2, 12), STEEL, at(b.x, 72.4, b.z)); }
    // ---- what hangs on the wall: pipes with their clamps, a ladder, two small balconies ----
    for (const [a, y0, y1, rr] of [[rad(138), 4.2, 49.0, 0.55], [rad(146), 4.2, 44.0, 0.4], [rad(-62), 9.5, 73.0, 0.5], [rad(100), 50.2, 73.0, 0.42]]) {
      const R0 = y0 < 50 ? sh1(y0) : sh2(y0), R1 = y1 <= 50 ? sh1(y1) : sh2(y1); beam(pol(a, R0 + rr + 0.25, y0), pol(a, R1 + rr + 0.25, y1), rr * 2, STEEL, true);
      for (let y = y0 + 3; y < y1 - 1; y += 6.5) { const R = y < 50 ? sh1(y) : sh2(y); add(new THREE.BoxGeometry(rr * 2 + 0.7, 0.3, rr * 2 + 0.6), STEEL, at(Math.sin(a) * (R + rr + 0.2), y, Math.cos(a) * (R + rr + 0.2), a)); } }
    { const a = rad(205); for (const s of [-0.42, 0.42]) beam(pol(a + s / 14, 14.75, 50.2), pol(a + s / 14, 14.15, 75.3), 0.13, STEEL); for (let y = 51; y < 75; y += 0.75) beam(pol(a - 0.42 / 14, sh2(y) + 0.55, y), pol(a + 0.42 / 14, sh2(y) + 0.55, y), 0.09, STEEL, true); }
    for (const [a, y] of [[rad(74), 30.4], [rad(-38), 16.4], [rad(160), 56.4]]) { const R = (y < 50 ? sh1(y) : sh2(y)), c = pol(a, R + 2.1, y - 2.2);
      add(new THREE.BoxGeometry(6.2, 0.4, 4.2), WOOD, at(c.x, c.y, c.z, a)); add(new THREE.BoxGeometry(6.5, 0.35, 0.35), STEEL, at(Math.sin(a) * (R + 4.1), y - 2.2, Math.cos(a) * (R + 4.1), a));
      for (const s of [-1, 1]) { const o = pol(a + Math.PI / 2, 3.0 * s, 0); beam(v0.copy(pol(a, R + 0.1, y - 5.6)).add(o).clone(), v1.copy(pol(a, R + 4.0, y - 2.4)).add(o).clone(), 0.3, STEEL);
        for (const d of [0.4, 2.2, 4.0]) add(new THREE.CylinderGeometry(0.1, 0.1, 1.9, 6), STEEL, at(Math.sin(a) * (R + d) + o.x, y - 1.05, Math.cos(a) * (R + d) + o.z)); beam(v0.copy(pol(a, R + 0.4, y - 0.15)).add(o).clone(), v1.copy(pol(a, R + 4.0, y - 0.15)).add(o).clone(), 0.11, STEEL, true); }
      beam(v0.copy(pol(a, R + 4.0, y - 0.15)).add(pol(a + Math.PI / 2, -3.0, 0)).clone(), v1.copy(pol(a, R + 4.0, y - 0.15)).add(pol(a + Math.PI / 2, 3.0, 0)).clone(), 0.11, STEEL, true); }
    // ================= the upgrade pass (read off the painted-over target image): a quay round the foot with bollards, rope and
    //                   tyre fenders, bracket lamps, a long ladder, slack cables, signs. WL = the sea in the tower's own metres =================
    const WL = sink - 0.05, cable = (a, b, sag, id, w = 0.09, n = 10) => { let p = a.clone(); for (let i = 1; i <= n; i++) { const t = i / n, q2 = new THREE.Vector3().lerpVectors(a, b, t); q2.y -= sag * 4 * t * (1 - t); beam(p, q2, w, id, true); p = q2; } };
    lathe([[17.5, -10], [21.3, -10], [21.3, WL + 2.0], [21.0, WL + 2.35], [17.5, WL + 2.35]], CONC, 96);
    lathe([[20.5, WL + 2.35], [20.5, WL + 2.62], [21.02, WL + 2.62], [21.02, WL + 2.3]], HAZ, 96);
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + 0.12, a2 = (i + 1) * TAU / 16 + 0.12, c = pol(a, 20.1, WL + 2.35);
      add(new THREE.CylinderGeometry(0.34, 0.42, 1.25, 10), STEEL, at(c.x, c.y + 0.62, c.z)); add(new THREE.CylinderGeometry(0.54, 0.54, 0.22, 10), STEEL, at(c.x, c.y + 1.3, c.z));
      cable(pol(a, 20.1, WL + 3.3), pol(a2, 20.1, WL + 3.3), 0.6, ROPE, 0.1, 8);
      const tA = a + TAU / 32, t = pol(tA, 21.6, WL + 0.75); add(new THREE.TorusGeometry(0.95, 0.36, 8, 18), RUBBER, at(t.x, t.y, t.z, tA)); beam(pol(tA, 21.55, WL + 1.6), pol(tA, 20.9, WL + 2.55), 0.07, ROPE, true); }
    const lamp = (a, R, y, out = 1.5) => { const p0 = pol(a, R, y + 0.9), p1 = pol(a, R + out, y + 1.35), p2 = pol(a, R + out, y + 0.6);
      beam(p0, p1, 0.11, STEEL, true); beam(p1, p2, 0.08, STEEL, true); add(new THREE.ConeGeometry(0.52, 0.36, 12), STEEL, at(p2.x, p2.y + 0.05, p2.z)); add(new THREE.SphereGeometry(0.28, 10, 8), LAMP, at(p2.x, p2.y - 0.26, p2.z)); };
    for (let i = 0; i < 6; i++) lamp(i * TAU / 6 + 0.5, sh1(13.5), 13.5); for (let i = 0; i < 6; i++) lamp(i * TAU / 6 + 0.15, sh2(55), 55, 1.3); for (let i = 0; i < 5; i++) lamp(i * TAU / 5 + 0.9, 15.3, 77.2, 1.1);
    { const a = rad(40), dl = 0.42 / 15; for (let y = WL + 2.35; y < 48.6; y += 3) { const y1 = Math.min(y + 3, 48.9); for (const s of [-1, 1]) beam(pol(a + s * dl, sh1(y) + 0.6, y), pol(a + s * dl, sh1(y1) + 0.6, y1), 0.12, STEEL); }
      for (let y = WL + 3; y < 48.6; y += 0.75) beam(pol(a - dl, sh1(y) + 0.6, y), pol(a + dl, sh1(y) + 0.6, y), 0.08, STEEL, true);
      for (let y = 12; y < 48; y += 6) for (const s of [-1, 1]) beam(pol(a + s * dl, sh1(y) + 0.05, y), pol(a + s * dl, sh1(y) + 0.62, y), 0.1, STEEL, true); }
    cable(pol(rad(60), 16.9, 93.5), pol(rad(78), 21.8, 52.4), 5.5, ROPE, 0.07, 14); cable(pol(rad(-140), 16.9, 93.5), pol(rad(-118), 21.8, 52.4), 4.0, ROPE, 0.07, 14); cable(pol(rad(170), 17.3, 77.3), pol(rad(196), 21.8, 52.4), 3.0, ROPE, 0.07, 12);
    { const a = rad(21), c = pol(a, sh1(9.6) + 0.14, 9.6); add(new THREE.BoxGeometry(2.3, 1.3, 0.14), SIGN, at(c.x, c.y, c.z, a)); const a2 = 4 * TAU / 14, c2 = pol(a2, 15.1 * Math.cos(Math.PI / 14) + 0.2, 84.6); add(new THREE.BoxGeometry(3.2, 1.5, 0.14), SIGN, at(c2.x, c2.y, c2.z, a2)); }
    // ---- one mesh, standing on the axis, sunk with the set ----
    const g = new THREE.BufferGeometry(), pa = new Float32Array(P), oy = 0.05 - sink; for (let i = 0; i < pa.length; i += 3) { pa[i] += L.main.x; pa[i + 1] += oy; pa[i + 2] += L.main.z; }
    g.setAttribute('position', new THREE.BufferAttribute(pa, 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N), 3)); g.setAttribute('aM', new THREE.BufferAttribute(new Float32Array(M), 1)); g.computeBoundingBox(); g.computeBoundingSphere();
    U.uAxis.value.set(L.main.x, oy, L.main.z);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 1 });
    patch(mat, s => { Object.assign(s.sh.uniforms, U); s.sh.uniforms.uSurfT = Surf.U.uSurfT;
      s.vHead('attribute float aM; varying float vM; varying vec3 vTp; uniform vec3 uAxis;');
      s.v('#include <begin_vertex>', '#include <begin_vertex>\n  vM = aM; vTp = (modelMatrix * vec4(transformed, 1.0)).xyz - uAxis;');
      s.fHead(FRAG_HEAD);
      s.f('#include <color_fragment>', '#include <color_fragment>\n  twSurface(vTp, vM); diffuseColor.rgb = sfWash(twCol, vTp + uAxis);');
      s.f('#include <roughnessmap_fragment>', 'float roughnessFactor = twRough;');
      s.f('#include <metalnessmap_fragment>', 'float metalnessFactor = twMetal;');
      s.f('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n  { vec3 sp = -vViewPosition, sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1), fw = max(length(sx), length(sy));\n    vec3 gr = sign(det) * (dFdx(twH) * r1 + dFdy(twH) * r2); normal = normalize(abs(det) * normal - gr * (1.0 - smoothstep(0.03, 0.22, fw))); }');
      s.f('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += twEmis;');
    }, 'tower');
    const mesh = new THREE.Mesh(g, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'towerCode'; scene.add(mesh);
    G.tick.push(() => { const S = Daylight.S, te = G.tEnv === undefined ? G.t : G.tEnv; U.uLamp.value = clamp(sm(0.62, 0.86, S.dusk || 0) + 0.55 * (S.gloom || 0)); U.uWet.value = sm(31.2, 36, te) * (1 - sm(68, 76, te)); });
    G.info.towerCode = { tris: pa.length / 9 | 0, ms: Math.round(performance.now() - t0) };
    return mesh;
  }
  // ---- the surfaces. p = metres from the tower's foot on its axis. u runs round the wall in metres (at a nominal 15 m radius), v up it.
  //      Sets twCol (albedo), twRough, twMetal, twH (height in metres, for the bump) and twEmis ----
  const FRAG_HEAD = /* glsl */`
    varying float vM; varying vec3 vTp; uniform float uLamp, uWet; uniform vec3 uAxis;
    ` + SURF_GLSL + /* glsl */`
    const float WLV = 5.55;                                    // the sea, in the tower's own metres (32_set.js SINK - 0.05)
    vec3 twCol; float twRough, twMetal, twH; vec3 twEmis;
    float tw1(float n){ return fract(sin(n * 127.1) * 43758.5453); }
    float tw2(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float twN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(tw2(i), tw2(i + vec2(1, 0)), f.x), mix(tw2(i + vec2(0, 1)), tw2(i + vec2(1, 1)), f.x), f.y); }
    float twF(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * twN(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
    float twN3(vec3 p){ return twF(p.xy * 0.9 + p.z * 0.37) * 0.6 + twF(p.yz * 0.9 - p.x * 0.41) * 0.4; }
    void twSurface(vec3 p, float m){
      float u = atan(p.x, p.z) * 15.0, v = p.y, aa = max(fwidth(u), fwidth(v));
      vec2 uv = vec2(u, v); float grime = twF(uv * vec2(0.55, 0.09)), stain = twF(uv * vec2(0.16, 0.5) + 7.3), fine = twF(uv * 6.0);
      twEmis = vec3(0.0); twH = 0.0; twMetal = 0.0;
      if (m < 0.5) {                                             // brick: courses 0.62 m, bricks 1.5 m, every other course half a brick on
        float row = floor(v / 0.62), bx = u / 1.5 + 0.5 * mod(row, 2.0); vec2 id = vec2(floor(bx), row), f = vec2(fract(bx), fract(v / 0.62));
        float jw = 0.045 + 0.6 * aa, mx = smoothstep(0.0, jw / 1.5, f.x) * smoothstep(0.0, jw / 1.5, 1.0 - f.x), my = smoothstep(0.0, jw / 0.62, f.y) * smoothstep(0.0, jw / 0.62, 1.0 - f.y), face = mx * my;
        { float cc = length(min(f, 1.0 - f) * vec2(1.5, 0.62)); face *= 1.0 - step(0.70, tw2(id + 3.3)) * (1.0 - smoothstep(0.05, 0.17, cc)); }      // one brick in three has lost a corner
        float k = tw2(id), k2 = tw2(id + 31.7); vec3 br = mix(vec3(0.36, 0.085, 0.050), vec3(0.50, 0.150, 0.075), k); br = mix(br, vec3(0.24, 0.07, 0.055), step(0.86, k2)); br = mix(br, vec3(0.52, 0.27, 0.16), step(k2, 0.07));
        br *= 0.82 + 0.36 * fine; vec3 mo = vec3(0.30, 0.26, 0.22) * (0.8 + 0.4 * fine);
        twCol = mix(mo, br, face); twH = 0.035 * face + 0.012 * fine * face; twRough = mix(0.95, 0.80, face);
        twCol *= 1.0 - 0.42 * smoothstep(0.46, 0.80, grime);                                   // soot that has run down the wall
        { float wp = 0.0; for (int i = 0; i < 5; i++) { float yb = i == 0 ? 8.8 : i == 1 ? 22.8 : i == 2 ? 36.8 : i == 3 ? 50.2 : 61.4, d = yb - v; wp = max(wp, step(0.0, d) * smoothstep(6.5, 0.0, d)); }
          twCol = mix(twCol, vec3(0.20, 0.085, 0.035), 0.62 * wp * smoothstep(0.40, 0.78, twF(vec2(u * 1.9, v * 0.10) + 21.0))); }      // rust weeping down from every steel band
        twCol = mix(twCol, vec3(0.50, 0.47, 0.42), 0.55 * smoothstep(0.52, 0.80, stain) * smoothstep(WLV + 12.0, WLV + 3.0, v));     // salt, near the sea
        twCol *= 1.0 - 0.45 * smoothstep(WLV + 5.2, WLV + 2.6, v + 1.4 * (stain - 0.5));                                             // the wall stays dark and wet above the quay
        twCol = mix(twCol, vec3(0.09, 0.14, 0.075), 0.6 * smoothstep(0.50, 0.85, stain) * smoothstep(WLV + 5.0, WLV + 2.4, v));       // and weed below that
      } else if (m < 1.5) {                                      // riveted plate, painted: plates 3.39 m round the cabin (one a side), 2.95 m high
        vec2 pl = vec2(u / 3.39 + 0.5, (v - 75.35) / 2.975), f = fract(pl), id = floor(pl); vec2 d = min(f, 1.0 - f) * vec2(3.39, 2.975);
        float seam = 1.0 - smoothstep(0.03, 0.07 + aa, min(d.x, d.y)), strip = step(min(d.x, d.y), 0.30);
        vec2 rv = vec2(d.x < d.y ? f.y * 2.975 : f.x * 3.39, min(d.x, d.y)); float rd = length(vec2(fract(rv.x / 0.34) - 0.5, (rv.y - 0.16) / 0.34)) * 0.34, riv = (1.0 - smoothstep(0.045, 0.075 + aa, rd)) * strip;
        vec3 pc = mix(vec3(0.72, 0.42, 0.045), vec3(0.80, 0.50, 0.07), tw2(id)); pc *= 0.86 + 0.28 * fine;
        float rust = smoothstep(0.50, 0.74, twF(uv * 0.8 + 3.1) + 0.35 * seam + 0.30 * smoothstep(0.9, 0.0, f.y) * step(0.5, tw2(id + 5.0)) - 0.10);
        float run = smoothstep(0.55, 0.85, twF(uv * vec2(1.6, 0.14) + 11.0)) * smoothstep(0.0, 0.5, 1.0 - f.y);
        vec3 rc = mix(vec3(0.30, 0.10, 0.035), vec3(0.16, 0.06, 0.03), fine);
        twCol = mix(pc, rc, clamp(rust + 0.45 * run, 0.0, 1.0)); twCol = mix(twCol, vec3(0.10, 0.07, 0.05), 0.75 * seam); twCol = mix(twCol, twCol * 1.25 + 0.02, riv);
        twH = 0.03 * riv - 0.012 * seam + 0.006 * rust * fine; twRough = mix(0.52, 0.90, clamp(rust, 0.0, 1.0)); twMetal = 0.25 * (1.0 - rust);
      } else if (m < 2.5) {                                      // bare steel: mill scale, rust in the low places
        float n = twN3(p * 0.55), rust = smoothstep(0.50, 0.72, twN3(p * 0.9 + 4.0) + 0.25 * (n - 0.5));
        twCol = mix(vec3(0.21, 0.22, 0.235) * (0.75 + 0.5 * n), vec3(0.27, 0.105, 0.045) * (0.7 + 0.6 * fine), 0.75 * rust);
        twH = 0.008 * rust * fine; twRough = mix(0.46, 0.92, rust); twMetal = mix(0.85, 0.15, rust);
      } else if (m < 3.5) {                                      // crane paint: chipped to primer and steel on the edges of every member
        float n = twN3(p * 1.7), chip = smoothstep(0.56, 0.66, twN3(p * 3.1 + 9.0));
        twCol = mix(vec3(0.78, 0.30, 0.035) * (0.85 + 0.3 * n), vec3(0.22, 0.09, 0.05), chip); twRough = mix(0.55, 0.9, chip); twMetal = 0.2;
      } else if (m < 4.5) {                                      // glass: black by day, lit from inside when the light goes
        twCol = vec3(0.012, 0.020, 0.026); twRough = 0.07; float k = tw2(floor(vec2(u / 2.2, v / 3.4)));
        twEmis = vec3(1.9, 1.05, 0.42) * uLamp * step(0.28, k) * (0.6 + 0.8 * k);
      } else if (m < 5.5) {                                      // planks, laid round the walk
        float pk = p.x * 0.6 + p.z * 0.8, id = floor(pk / 0.42), f = fract(pk / 0.42), gap = 1.0 - smoothstep(0.0, 0.06 + aa, min(f, 1.0 - f) * 0.42);
        twCol = mix(vec3(0.22, 0.15, 0.09), vec3(0.34, 0.25, 0.16), tw1(id)) * (0.7 + 0.6 * twF(vec2(pk * 9.0, (p.z * 0.6 - p.x * 0.8) * 0.5)));
        twCol = mix(twCol, vec3(0.03, 0.02, 0.015), gap); twH = -0.02 * gap; twRough = 0.88;
      } else if (m < 6.5) {                                      // the buoy: red lead, scabbed
        float n = twN3(p * 0.9), rust = smoothstep(0.55, 0.75, twN3(p * 1.4 + 2.0)); twCol = mix(vec3(0.50, 0.050, 0.030) * (0.8 + 0.4 * n), vec3(0.22, 0.085, 0.04), 0.8 * rust); twRough = mix(0.42, 0.9, rust); twMetal = 0.15;
      } else if (m < 7.5) {                                      // the dome: copper gone green, brown where the rain runs off the ribs
        float run = twF(vec2(u * 0.9, v * 0.10) + 5.0), pl = abs(fract(u / 2.6) - 0.5) * 2.6, seam = 1.0 - smoothstep(0.03, 0.08 + aa, pl), pn = tw2(vec2(floor(u / 2.6), 7.0));
        vec3 g = mix(vec3(0.11, 0.30, 0.26), vec3(0.24, 0.44, 0.36), pn) * (0.8 + 0.4 * fine); g = mix(g, vec3(0.19, 0.10, 0.05), 0.75 * smoothstep(0.52, 0.78, run)); g = mix(g, vec3(0.40, 0.54, 0.46), 0.35 * smoothstep(0.6, 0.9, stain));
        twCol = mix(g, g * 0.45, seam); twH = 0.03 * seam; twRough = 0.62; twMetal = 0.3;
      } else if (m < 8.5) {                                      // the quay: concrete cast in lifts; black-green and barnacled where the sea reaches
        float hw = v - WLV, lift = 1.0 - smoothstep(0.0, 0.04 + aa, abs(fract(v / 1.25) - 0.5) * 1.25);
        twCol = vec3(0.34, 0.33, 0.30) * (0.70 + 0.5 * twF(uv * 0.35)) * (1.0 - 0.35 * smoothstep(0.45, 0.8, grime)); twCol = mix(twCol, twCol * 0.6, lift);
        float tide = smoothstep(2.0, 0.2, hw + 0.8 * (stain - 0.5)); twCol = mix(twCol, vec3(0.045, 0.075, 0.04), 0.9 * tide); twCol = mix(twCol, vec3(0.55, 0.53, 0.47), 0.5 * step(0.80, twN(uv * 9.0)) * tide);
        twH = -0.012 * lift + 0.006 * fine; twRough = mix(0.93, 0.45, tide);
      } else if (m < 9.5) { twCol = vec3(0.020, 0.020, 0.022) * (0.7 + 0.7 * fine); twRough = 0.86;                                      // a tyre
      } else if (m < 10.5) { twCol = vec3(0.30, 0.23, 0.14) * (0.72 + 0.28 * sin((p.x + p.y + p.z) * 38.0)); twRough = 0.96;        // rope, cable
      } else if (m < 11.5) { twCol = vec3(0.85, 0.78, 0.60); twRough = 0.3; twEmis = vec3(2.6, 1.5, 0.62) * (0.22 + 3.4 * uLamp);       // a lamp: a pale globe by day
      } else if (m < 12.5) {                                     // warning stripes, chipped
        float k = step(0.5, fract((u + v) / 1.1)), chip = smoothstep(0.58, 0.72, twF(uv * 1.3 + 2.0));
        twCol = mix(mix(vec3(0.028), vec3(0.80, 0.50, 0.04), k) * (0.8 + 0.3 * fine), vec3(0.22, 0.09, 0.04), chip); twRough = mix(0.6, 0.9, chip);
      } else {                                                   // an enamel plate: cream, a dark rule, lines of lettering too small to read
        float ln = step(0.45, fract(v / 0.24)) * step(0.18, fract(u / 0.8 + floor(v / 0.24) * 0.37)), rust = smoothstep(0.6, 0.74, twF(uv * 1.1 + 8.0));
        twCol = mix(mix(vec3(0.66, 0.62, 0.50), vec3(0.07, 0.07, 0.08), 0.8 * ln), vec3(0.25, 0.10, 0.04), rust); twRough = mix(0.4, 0.9, rust);
      }
      // rain: everything darkens and shines
      float wet = uWet * (0.6 + 0.4 * grime); twCol *= 1.0 - 0.30 * wet; twRough = mix(twRough, min(twRough, 0.28), 0.8 * wet);
    }`;
  return { build, U };
})();
