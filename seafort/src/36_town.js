'use strict';
// ---- the town, built in code. Everything round the tower that used to be a scanned model: four quays on the sea, warehouses,
//      a vaulted hall with a clock, a gasholder in its guide frame, a tank farm, chimneys, a second small tower with a jib, sheds,
//      piers, footbridges, lamp posts. The massing follows the scan (where things stood and how tall); the buildings are new.
//      A building is a few calls of a small kit (wall box, gable or barrel roof, window grid, tank, stack, deck, lattice);
//      every surface is drawn by ONE procedural material from a per-vertex (u, v) in metres of its own face, a material id and a
//      variant (which paint, which brick), so nothing here has a texture and nothing blurs when the lens comes close.
//      Town.build(scene) -> mesh. Reads TowerCode.U (uLamp: lights on in the storm and at dusk; uWet: rain) ----
const Town = (() => {
  const B = { pos: [], nor: [], tw: [], idx: [] };
  const BRICK = 0, PAINT = 1, STEEL = 2, ROOF = 3, GLASS = 4, WOOD = 5, CONC = 6, CORR = 7, LAMP = 8, RUBBER = 9, ROPE = 10, HAZ = 11;
  const YEL = 0, TEAL = 1, OXIDE = 2, CREAM = 3, SLATE = 4, WHITE = 5;        // paint (and corrugated iron) variants
  const DECK = 2.4;                                                            // quay level above the sea (m): the tower's own quay stands at this height
  const UPY = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1), v3 = new THREE.Vector3(), n3 = new THREE.Matrix3(), tmp = new THREE.Matrix4();
  const RECTS = []; let CM = new THREE.Matrix4(), seed = 0;                                      // the frame of the building being built
  const M = (x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), ONE);
  const inFrame = (x, y, z, ry, fn) => { const keep = CM; CM = keep.clone().multiply(M(x, y, z, ry)); fn(); CM = keep; };
  // one piece into the pile. mode 'box': (u, v) planar in the piece's own space by the face it lies in; 'ring': u = the geometry's uv.x round a length uLen, v = height
  function put(geo, id, local, mode = 'box', uLen = 1, vr = 0) {
    const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, base = B.pos.length / 3, off = (seed++ * 7.31) % 40, mat = tmp.multiplyMatrices(CM, local);
    n3.getNormalMatrix(mat);
    for (let i = 0; i < P.count; i++) { const lx = P.getX(i), ly = P.getY(i), lz = P.getZ(i), nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
      v3.set(lx, ly, lz).applyMatrix4(mat); B.pos.push(v3.x, v3.y, v3.z); const wy = v3.y;
      v3.set(nx, ny, nz).applyMatrix3(n3).normalize(); B.nor.push(v3.x, v3.y, v3.z);
      let u, v; if (mode === 'ring') { u = U.getX(i) * uLen + off; v = wy; } else { const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz); if (ay >= ax && ay >= az) { u = lx + off; v = lz + off; } else if (ax >= az) { u = lz + off; v = wy; } else { u = lx + off; v = wy; } }
      B.tw.push(u, v, id, vr); }
    if (geo.index) { const I = geo.index; for (let i = 0; i < I.count; i++) B.idx.push(base + I.getX(i)); } else for (let i = 0; i < P.count; i++) B.idx.push(base + i);
    geo.dispose();
  }
  // raw quads/triangles with their own (u, v): pts = [x, y, z, u, v] per corner, flat shaded
  function face(pts, id, vr = 0) { const base = B.pos.length / 3, w = pts.map(p => v3.set(p[0], p[1], p[2]).applyMatrix4(CM).clone());
    const n = new THREE.Vector3().subVectors(w[1], w[0]).cross(new THREE.Vector3().subVectors(w[2], w[0])).normalize();
    pts.forEach((p, i) => { B.pos.push(w[i].x, w[i].y, w[i].z); B.nor.push(n.x, n.y, n.z); B.tw.push(p[3], p[4], id, vr); });
    for (let i = 1; i < pts.length - 1; i++) B.idx.push(base, base + i, base + i + 1); }
  const box = (w, h, d, id, x, y, z, vr = 0, ry = 0, rx = 0, rz = 0) => put(new THREE.BoxGeometry(w, h, d), id, M(x, y, z, ry, rx, rz), 'box', 1, vr);
  function bar(a, b, r, id, sides = 6, vr = 0) { const d = new THREE.Vector3().subVectors(b, a), len = d.length(); if (len < 1e-3) return; const q = new THREE.Quaternion().setFromUnitVectors(UPY, d.normalize());
    put(new THREE.CylinderGeometry(r, r, len, sides, 1, false), id, new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, ONE), 'ring', TAU * r, vr); }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function lathe(prof, id, n = 48, vr = 0, w = 1.5) { let rm = 0; for (const p of prof) rm = Math.max(rm, p[0]); put(new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), n), id, M(), 'ring', Math.max(1, Math.round(TAU * rm / w)) * w, vr); }
  function boom(a, b, s0, s1, n, id, vr = 0, rc = 0.16, rl = 0.085) {
    const ax = new THREE.Vector3().subVectors(b, a).normalize(), sx = new THREE.Vector3().crossVectors(ax, Math.abs(ax.y) > 0.95 ? V(1, 0, 0) : UPY).normalize(), sy = new THREE.Vector3().crossVectors(sx, ax).normalize();
    const nd = (k, i) => { const t = k / n, s = lerp(s0, s1, t) / 2, c = [[-1, -1], [1, -1], [1, 1], [-1, 1]][i]; return new THREE.Vector3().lerpVectors(a, b, t).addScaledVector(sx, c[0] * s).addScaledVector(sy, c[1] * s); };
    for (let i = 0; i < 4; i++) bar(nd(0, i), nd(n, i), rc, id, 6, vr);
    for (let k = 0; k <= n; k++) for (let i = 0; i < 4; i++) { bar(nd(k, i), nd(k, (i + 1) % 4), rl, id, 5, vr); if (k < n) bar(nd(k, (i + (k & 1)) % 4), nd(k + 1, (i + 1 - (k & 1) + 4) % 4), rl, id, 5, vr); } }

  // ================= the kit (all in the frame of the building: x across the front, z toward the front, y up from the quay) =================
  // a window on a wall whose outward normal is (sin a, 0, cos a): pane, sill, lintel, jambs, one glazing bar each way
  function win(x, y, z, a, w, h, fr = CREAM) { inFrame(x, y, z, a, () => { box(w, h, 0.1, GLASS, 0, 0, 0.06); box(w + 0.5, 0.22, 0.34, PAINT, 0, -h / 2 - 0.11, 0.12, fr); box(w + 0.36, 0.2, 0.26, PAINT, 0, h / 2 + 0.1, 0.1, fr);
      for (const s of [-1, 1]) box(0.16, h, 0.24, PAINT, s * (w / 2 + 0.08), 0, 0.09, fr); box(0.07, h, 0.16, PAINT, 0, 0, 0.1, fr); if (h > 1.6) box(w, 0.07, 0.16, PAINT, 0, 0, 0.1, fr); }); }
  // rows of windows along one wall: centre of the wall (x, z), its normal angle a, its length L; rows = [[y, n, w, h], ...]
  function wins(x, z, a, L, rows, fr) { for (const [y, n, w, h] of rows) for (let i = 0; i < n; i++) { const o = (i + 0.5) / n * L - L / 2; win(x + Math.cos(a) * o, y, z - Math.sin(a) * o, a, w, h, fr); } }
  function door(x, z, a, w, h, id = WOOD, vr = 0) { inFrame(x, 0, z, a, () => { box(w, h, 0.14, id, 0, h / 2, 0.08, vr); box(w + 0.6, 0.35, 0.4, STEEL, 0, h + 0.17, 0.14); for (const s of [-1, 1]) box(0.3, h, 0.36, STEEL, s * (w / 2 + 0.15), h / 2, 0.12); box(0.12, h, 0.2, STEEL, 0, h / 2, 0.12); }); }
  // a gable roof on a w x d plan, ridge along z; eave at y0, rise r; ov = overhang. The two gable ends are filled with the wall's material
  function gable(w, d, y0, r, id, vr, wallId, wallVr, ov = 0.7) { const hw = w / 2 + ov, hd = d / 2 + ov, sl = Math.hypot(hw, r * hw / (w / 2)), yr = y0 + r * hw / (w / 2), ye = y0 - 0.0;
    for (const s of [-1, 1]) { face(s > 0 ? [[0, yr, hd, hd, sl], [0, yr, -hd, -hd, sl], [hw, ye, -hd, -hd, 0], [hw, ye, hd, hd, 0]] : [[0, yr, -hd, -hd, sl], [0, yr, hd, hd, sl], [-hw, ye, hd, hd, 0], [-hw, ye, -hd, -hd, 0]], id, vr);
      face(s > 0 ? [[-w / 2, y0, d / 2, -w / 2, y0], [w / 2, y0, d / 2, w / 2, y0], [0, y0 + r, d / 2, 0, y0 + r]] : [[w / 2, y0, -d / 2, w / 2, y0], [-w / 2, y0, -d / 2, -w / 2, y0], [0, y0 + r, -d / 2, 0, y0 + r]], wallId, wallVr); }
    // the underside reads as a dark line at the eave; a ridge cap
    box(0.5, 0.28, 2 * hd + 0.2, STEEL, 0, yr + 0.05, 0); for (const s of [-1, 1]) box(0.3, 0.3, 2 * hd, STEEL, s * hw, ye - 0.05, 0); }
  // a barrel vault on a w x d plan, axis along z: springing at y0, rise r; both ends closed with the wall's material
  function vault(w, d, y0, r, id, vr, wallId, wallVr, n = 18, ov = 0.5) { const hw = w / 2 + 0.25, hd = d / 2 + ov; let len = 0, px = hw, py = 0; const P = [];
    for (let i = 0; i <= n; i++) { const t = i / n * Math.PI, x = hw * Math.cos(t), y = (r + 0.25) * Math.sin(t); len += Math.hypot(x - px, y - py); px = x; py = y; P.push([x, y, len]); }
    for (let i = 0; i < n; i++) { const a = P[i], b = P[i + 1]; face([[a[0], y0 + a[1], hd, hd, a[2]], [a[0], y0 + a[1], -hd, -hd, a[2]], [b[0], y0 + b[1], -hd, -hd, b[2]], [b[0], y0 + b[1], hd, hd, b[2]]], id, vr); }
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI, a1 = (i + 1) / n * Math.PI, A = [w / 2 * Math.cos(a0), r * Math.sin(a0)], C = [w / 2 * Math.cos(a1), r * Math.sin(a1)];
      face(s > 0 ? [[0, y0, d / 2, 0, y0], [A[0], y0 + A[1], d / 2, A[0], y0 + A[1]], [C[0], y0 + C[1], d / 2, C[0], y0 + C[1]]] : [[0, y0, -d / 2, 0, y0], [C[0], y0 + C[1], -d / 2, C[0], y0 + C[1]], [A[0], y0 + A[1], -d / 2, A[0], y0 + A[1]]], wallId, wallVr); } }
  // a plain building: walls w x d x h of wall material, a plinth, a string course; returns nothing. The roof is the caller's
  function walls(w, d, h, id, vr) { box(w, h, d, id, 0, h / 2, 0, vr); box(w + 0.5, 0.9, d + 0.5, CONC, 0, 0.45, 0); box(w + 0.36, 0.3, d + 0.36, id === BRICK ? CONC : STEEL, 0, h - 0.5, 0); }
  // a tank: a riveted drum with a shallow dome, bands, a rail round the top, a ladder
  function tank(r, h, vr = SLATE, dome = 0.22) { const p = [[r, 0], [r, h]], n = 40; lathe(p, PAINT, n, vr, 2.6); const d = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8 * Math.PI / 2; d.push([r * Math.cos(t), h + r * dome * Math.sin(t)]); } lathe(d, ROOF, n, 1, 1.8);
    for (let y = 0.3; y < h; y += Math.max(3.2, h / 6)) lathe([[r, y - 0.2], [r + 0.16, y - 0.14], [r + 0.16, y + 0.14], [r, y + 0.2]], STEEL, n, 0, 0.6);
    lathe([[r + 0.5, -0.2], [r + 0.5, 0.5], [r, 0.7]], CONC, n, 0, 2.4);
    for (let i = 0; i < Math.round(r * 2.2); i++) { const a = i / Math.round(r * 2.2) * TAU; bar(V(r * Math.sin(a), h, r * Math.cos(a)), V(r * Math.sin(a), h + 1.2, r * Math.cos(a)), 0.07, STEEL, 5); }
    put(new THREE.TorusGeometry(r, 0.06, 5, 64).rotateX(Math.PI / 2), STEEL, M(0, h + 1.2, 0), 'ring', 1); put(new THREE.TorusGeometry(r, 0.06, 5, 64).rotateX(Math.PI / 2), STEEL, M(0, h + 0.6, 0), 'ring', 1);
    for (const s of [-0.3, 0.3]) bar(V(s, 0.6, r + 0.45), V(s, h + 1.1, r + 0.45), 0.06, STEEL, 5); for (let y = 1; y < h + 1; y += 0.6) bar(V(-0.3, y, r + 0.45), V(0.3, y, r + 0.45), 0.04, STEEL, 4); }
  // a brick stack, tapering, banded, with a corbelled lip
  function stack(r0, r1, h, vr = 0) { lathe([[r0 + 0.9, 0], [r0 + 0.9, 3.2], [r0, 4.0], [r1, h - 2.4], [r1 + 0.45, h - 1.9], [r1 + 0.45, h - 0.6], [r1 + 0.1, h], [r1 - 0.5, h]], BRICK, 28, vr);
    for (let y = 9; y < h - 4; y += 8) { const r = lerp(r0, r1, (y - 4) / (h - 6.4)); lathe([[r, y - 0.3], [r + 0.2, y - 0.2], [r + 0.2, y + 0.2], [r, y + 0.3]], STEEL, 28, 0, 0.6); }
    for (const s of [-0.26, 0.26]) bar(V(s, 3.5, r0 + 0.25), V(s, h - 2, r1 + 0.3), 0.05, STEEL, 5); }
  // a quay: a concrete block from the sea bed to DECK, a kerb with warning paint, fenders, bollards, piles under any timber apron
  function quay(x0, z0, x1, z1) { RECTS.push([x0 - 0.25, z0 - 0.25, x1 + 0.25, z1 + 0.25]); const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    inFrame(cx, 0, cz, 0, () => { box(w, DECK + 8.9, d, CONC, 0, (DECK - 0.1 - 9) / 2, 0); box(w + 0.5, 0.35, d + 0.5, CONC, 0, DECK - 0.175, 0);
      for (const [a, L, ox, oz, kl] of [[0, w, 0, d / 2, w + 0.5], [Math.PI, w, 0, -d / 2, w + 0.5], [Math.PI / 2, d, w / 2, 0, d - 0.5], [-Math.PI / 2, d, -w / 2, 0, d - 0.5]]) inFrame(ox, 0, oz, a, () => { box(kl, 0.28, 0.5, HAZ, 0, DECK + 0.14, 0);
        const n = Math.max(2, Math.round(L / 9)); for (let i = 0; i < n; i++) { const o = (i + 0.5) / n * L - L / 2; put(new THREE.TorusGeometry(0.9, 0.34, 7, 16), RUBBER, M(o, DECK - 1.7, 0.42)); bar(V(o, DECK - 0.85, 0.42), V(o, DECK + 0.2, 0.1), 0.06, ROPE, 4);
          if (i % 2 === 0) { put(new THREE.CylinderGeometry(0.3, 0.38, 1.1, 10), STEEL, M(o + L / n / 2, DECK + 0.55, -0.9), 'ring', 2); put(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 10), STEEL, M(o + L / n / 2, DECK + 1.15, -0.9), 'ring', 3); } } }); }); }
  // a timber pier on piles from (x0, z0) to (x1, z1), width w
  function pier(x0, z0, x1, z1, w = 4.2) { const L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0); inFrame((x0 + x1) / 2, 0, (z0 + z1) / 2, a, () => { box(w, 0.4, L, WOOD, 0, DECK - 0.2, 0);
      for (let z = -L / 2 + 1; z <= L / 2 - 0.5; z += 4.5) { for (const s of [-1, 1]) { bar(V(s * (w / 2 - 0.3), -8, z), V(s * (w / 2 - 0.3), DECK + 1.0, z), 0.3, WOOD, 7); } box(w + 0.4, 0.4, 0.4, WOOD, 0, DECK - 0.6, z); }
      for (const s of [-1, 1]) { bar(V(s * (w / 2 - 0.3), DECK + 1.0, -L / 2 + 1), V(s * (w / 2 - 0.3), DECK + 1.0, L / 2 - 0.5), 0.07, ROPE, 4); } }); }
  // a lamp on a post
  function post(x, z, h = 6.5) { inFrame(x, DECK, z, 0, () => { bar(V(0, 0, 0), V(0, h, 0), 0.11, STEEL, 6); bar(V(0, h, 0), V(0.9, h + 0.35, 0), 0.07, STEEL, 5); put(new THREE.ConeGeometry(0.5, 0.36, 10), STEEL, M(0.9, h + 0.2, 0), 'ring', 2); put(new THREE.SphereGeometry(0.27, 10, 8), LAMP, M(0.9, h - 0.08, 0), 'ring', 1); }); }
  // a clock on a wall: a cream face in a steel rim, two hands
  function clock(x, y, z, a, r) { inFrame(x, y, z, a, () => { put(new THREE.CylinderGeometry(r, r, 0.2, 36).rotateX(Math.PI / 2), PAINT, M(0, 0, 0.12), 'box', 1, CREAM); put(new THREE.TorusGeometry(r, 0.22, 8, 40), STEEL, M(0, 0, 0.2), 'ring', 1);
      box(0.18, r * 0.62, 0.08, STEEL, 0.0 + Math.sin(0.9) * r * 0.31, Math.cos(0.9) * r * 0.31, 0.26, 0, 0, 0, -0.9); box(0.14, r * 0.85, 0.08, STEEL, Math.sin(-2.2) * r * 0.42, Math.cos(-2.2) * r * 0.42, 0.26, 0, 0, 0, 2.2);
      for (let i = 0; i < 12; i++) { const t = i / 12 * TAU; box(0.1, r * 0.14, 0.06, STEEL, Math.sin(t) * r * 0.86, Math.cos(t) * r * 0.86, 0.24, 0, 0, 0, -t); } }); }
  // a footbridge of steel lattice from a to b at quay level
  function bridge(a, b) { const u = V(a.x, DECK + 0.1, a.z), w = V(b.x, DECK + 0.1, b.z), L = u.distanceTo(w), s = new THREE.Vector3().subVectors(w, u).cross(UPY).normalize().multiplyScalar(1.3);
    inFrame(0, 0, 0, 0, () => { for (const k of [-1, 1]) { const o = s.clone().multiplyScalar(k); bar(u.clone().add(o), w.clone().add(o), 0.14, STEEL, 6); bar(u.clone().add(o).setY(DECK + 1.5), w.clone().add(o).setY(DECK + 1.5), 0.09, STEEL, 6);
        const n = Math.max(2, Math.round(L / 2.4)); for (let i = 0; i <= n; i++) { const p = new THREE.Vector3().lerpVectors(u, w, i / n).add(o); bar(p, p.clone().setY(DECK + 1.5), 0.06, STEEL, 5); if (i < n) bar(p, new THREE.Vector3().lerpVectors(u, w, (i + 1) / n).add(o).setY(DECK + 1.5), 0.05, STEEL, 4); } }
      const m = new THREE.Vector3().addVectors(u, w).multiplyScalar(0.5), ang = Math.atan2(w.x - u.x, w.z - u.z); inFrame(m.x, 0, m.z, ang, () => box(2.6, 0.2, L, WOOD, 0, DECK + 0.06, 0)); }); }

  // ================= the town =================
  function make() {
    // ---- the west quay: warehouses and workshops ----
    quay(-64, -130, -18, -62);
    inFrame(-41, DECK, -104, 0, () => { walls(36, 17, 19, BRICK, 0); inFrame(0, 0, 0, Math.PI / 2, () => gable(17, 36, 19, 7, CORR, 0, BRICK, 0));       // the long warehouse: ridge along x
      wins(0, 8.5, 0, 34, [[5.2, 7, 2.2, 3.4], [12.6, 7, 2.2, 3.4]]); wins(0, -8.5, Math.PI, 34, [[5.2, 6, 2.2, 3.4], [12.6, 6, 2.2, 3.4]]); wins(18, 0, Math.PI / 2, 15, [[12.6, 3, 1.8, 3.2]]); door(18.0, 0, Math.PI / 2, 5.4, 6.6, WOOD); door(-6, 8.5, 0, 4.6, 0.01, WOOD);
      for (const x of [-9, 9]) inFrame(x, 22.3, 0, 0, () => { box(3.0, 2.6, 3.0, CORR, 0, 1.3, 0, 0); box(3.6, 0.3, 3.6, STEEL, 0, 2.75, 0); }); });
    inFrame(-31, DECK, -75, 0, () => { walls(20, 13, 11, PAINT, TEAL); vault(20, 13, 11, 5.2, CORR, 2, PAINT, TEAL);                                    // the teal workshop under a vault
      wins(0, 6.5, 0, 18, [[4.2, 4, 2.4, 3.6]]); wins(10, 0, Math.PI / 2, 11, [[4.2, 2, 2.2, 3.4]]); put(new THREE.CylinderGeometry(1.5, 1.5, 0.14, 28).rotateX(Math.PI / 2), GLASS, M(0, 13.2, 6.58)); put(new THREE.TorusGeometry(1.55, 0.2, 7, 28), PAINT, M(0, 13.2, 6.6), 'ring', 1, CREAM); door(-5.5, 6.5, 0, 3.4, 4.6, PAINT, OXIDE); });
    inFrame(-55, DECK, -86, 0, () => { walls(12, 12, 27, BRICK, 1); gable(12, 12, 27, 5, ROOF, 1, BRICK, 1); wins(0, 6, 0, 10, [[5, 2, 1.8, 3], [11, 2, 1.8, 3], [17, 2, 1.8, 3], [23, 2, 1.8, 2.6]]); wins(6, 0, Math.PI / 2, 10, [[5, 2, 1.8, 3], [11, 2, 1.8, 3], [17, 2, 1.8, 3], [23, 2, 1.8, 2.6]]); wins(-6, 0, -Math.PI / 2, 10, [[11, 2, 1.8, 3], [17, 2, 1.8, 3]]);
      box(5.2, 0.3, 2.6, STEEL, 0, 20.2, 7.2); for (const s of [-2.4, 2.4]) bar(V(s, 17.6, 6.1), V(s, 20.1, 8.3), 0.1, STEEL, 5); });                                   // the tall counting house, with a hoist platform
    inFrame(-52, DECK, -68.5, 0, () => { walls(14, 9, 7.5, PAINT, YEL); inFrame(0, 0, 0, Math.PI / 2, () => gable(9, 14, 7.5, 3.2, CORR, 1, PAINT, YEL)); wins(0, 4.5, 0, 12, [[3.6, 3, 1.8, 2.6]]); door(4.6, 4.5, 0, 2.6, 3.6, WOOD); });
    inFrame(-23, DECK, -116, 0, () => tank(5.2, 13, SLATE)); inFrame(-23, DECK, -103.5, 0, () => tank(4.0, 10, OXIDE)); inFrame(-46.5, DECK, -121, 0, () => stack(2.5, 1.7, 44, 1));
    inFrame(-21, DECK, -66.5, 0, () => { box(3.4, 3.0, 3.4, STEEL, 0, 1.5, 0); boom(V(0, 3, 0), V(0, 24, 0), 2.2, 1.8, 9, PAINT, YEL); box(3.6, 2.8, 4.4, PAINT, 0, 25.4, 0.4, YEL); box(2.6, 1.3, 0.12, GLASS, 0, 25.7, 2.66);
      boom(V(0, 26, 1.5), V(4, 33, 20), 1.8, 0.9, 10, PAINT, YEL); bar(V(0, 30.5, -1.5), V(4, 33, 20), 0.06, STEEL, 4); bar(V(0, 26.8, 0), V(0, 30.5, -1.5), 0.14, STEEL, 5); bar(V(4, 32.4, 19.6), V(4, 14, 19.6), 0.05, STEEL, 4); box(1.0, 1.4, 0.7, PAINT, 4, 13.3, 19.6, YEL); });
    for (const [x, z] of [[-60, -64], [-44, -64], [-20, -80], [-20, -96], [-62, -100], [-62, -124], [-36, -128]]) post(x, z);
    pier(-64.3, -66, -74.5, -66); inFrame(-80, DECK, -70, 0, () => { box(11, 0.4, 10, WOOD, 0, -0.2, 0); for (const sx of [-4.8, 4.8]) for (const sz of [-4.3, 4.3]) bar(V(sx, -10, sz), V(sx, 0.4, sz), 0.3, WOOD, 7);
      inFrame(0, 0, 0, 0, () => { box(8, 5, 6.4, WOOD, 0, 2.5, 0); gable(8, 6.4, 5, 2.4, CORR, 0, WOOD, 0); win(0, 2.8, 3.2, 0, 1.6, 2.0); door(-2.4, 3.2, 0, 1.6, 2.9, PAINT, TEAL); }); });                                   // the pilots' hut on its own piles
    // ---- the gasworks to the north-west: a gasholder in its guide frame, the retort house, the great stack ----
    quay(-56, -196, -4, -134);
    inFrame(-33, DECK, -170, 0, () => { tank(15.5, 34, OXIDE, 0.16); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, p = V(17.2 * Math.sin(a), 0, 17.2 * Math.cos(a)), q = V(17.2 * Math.sin(a + TAU / 12), 0, 17.2 * Math.cos(a + TAU / 12));
        bar(p, p.clone().setY(50), 0.28, STEEL, 6); for (const y of [16.5, 33, 49.5]) { bar(p.clone().setY(y), q.clone().setY(y), 0.16, STEEL, 5); bar(p.clone().setY(y - 16.5), q.clone().setY(y), 0.07, STEEL, 4); bar(q.clone().setY(y - 16.5), p.clone().setY(y), 0.07, STEEL, 4); } } });
    inFrame(-14, DECK, -147, 0, () => { walls(16, 15, 23, BRICK, 0); gable(16, 15, 23, 6.5, ROOF, 1, BRICK, 0); wins(0, 7.5, 0, 14, [[6, 3, 2.2, 5.0], [15.5, 3, 2.2, 4.0]]); wins(8, 0, Math.PI / 2, 13, [[6, 2, 2.2, 5.0], [15.5, 2, 2.2, 4.0]]); door(0, 7.5, 0, 0.01, 0.01);
      box(17.2, 1.2, 3.4, STEEL, 0, 30.4, 0); for (const x of [-5, 0, 5]) inFrame(x, 31, 0, 0, () => { put(new THREE.CylinderGeometry(0.8, 0.9, 3.4, 12), STEEL, M(0, 1.7, 0), 'ring', 5); put(new THREE.ConeGeometry(1.3, 0.9, 12), STEEL, M(0, 3.8, 0), 'ring', 5); }); });
    inFrame(-12, DECK, -131.5, 0, () => stack(3.3, 2.1, 62, 0));
    inFrame(-50, DECK, -186, 0, () => { walls(11, 9, 8, CORR, 0); gable(11, 9, 8, 3.4, CORR, 0, CORR, 0); door(0, 4.5, 0, 4.0, 4.6, WOOD); });
    inFrame(0, 0, 0, 0, () => { for (const [a, b] of [[V(-19, 19, -163), V(-14, 19, -155)], [V(-19, 19, -163), V(-19, 3, -163)]]) bar(a.clone().setY(a.y + DECK), b.clone().setY(b.y + DECK), 0.45, STEEL, 8); });
    for (const [x, z] of [[-8, -160], [-8, -184], [-52, -140], [-30, -194], [-54, -168]]) post(x, z);
    // ---- the tank farm to the north ----
    quay(0, -216, 36, -148);
    inFrame(19, DECK, -200, 0, () => tank(11.5, 35, WHITE)); inFrame(15, DECK, -163, 0, () => tank(8.5, 33, SLATE)); inFrame(8.5, DECK, -180.5, 0, () => tank(5, 10.5, YEL)); inFrame(28, DECK, -178, 0, () => tank(5, 16, OXIDE));
    inFrame(0, 0, 0, 0, () => { const y = DECK + 8.4; for (const [a, b] of [[V(15, y, -171.5), V(15, y, -188.5)], [V(8.5, y, -186), V(15, y, -188.5)], [V(28, y, -183), V(22, y, -189)], [V(15, y, -171.5), V(-4, y, -171.5)]]) { bar(a, b, 0.42, STEEL, 8); bar(a.clone().setY(DECK), a, 0.12, STEEL, 5); bar(b.clone().setY(DECK), b, 0.12, STEEL, 5); } });
    for (const [x, z] of [[3, -152], [33, -152], [33, -212], [3, -212], [34, -190]]) post(x, z);
    // ---- the stack behind the tower, on its own plinth ----
    RECTS.push([4.5, -113.5, 15.5, -102.5]); inFrame(10, 0, -108, 0, () => { box(11, DECK + 9, 11, CONC, 0, (DECK - 9) / 2, 0); box(11.5, 0.3, 11.5, HAZ, 0, DECK + 0.15, 0); }); inFrame(10, DECK, -108, 0, () => stack(3.0, 1.9, 82, 0));
    // ---- the east quay: the vaulted hall with the clock, the offices, the little tower with its jib, sheds ----
    quay(38.5, -154, 110, -84);
    inFrame(60, DECK, -99, 0, () => { walls(24, 26, 12.5, BRICK, 2); vault(24, 26, 12.5, 9.5, ROOF, 0, BRICK, 2); clock(0, 17.2, 13.02, 0, 2.7);
      for (const x of [-7, 0, 7]) door(x, 13, 0, 4.2, 6.4, PAINT, x === 0 ? OXIDE : TEAL); wins(12, 0, Math.PI / 2, 24, [[6, 5, 2.2, 5.2]]); wins(-12, 0, -Math.PI / 2, 24, [[6, 5, 2.2, 5.2]]); for (const x of [-8.5, 8.5]) win(x, 16.4, 13.0, 0, 1.6, 2.2); });
    inFrame(88, DECK, -113, 0, () => { walls(20, 16, 22, PAINT, CREAM); box(21, 1.3, 17, PAINT, 0, 22.65, 0, CREAM); box(19.2, 0.3, 15.2, ROOF, 0, 22.2, 0, 1);
      wins(0, 8, 0, 18, [[4.6, 5, 1.8, 2.8], [10, 5, 1.8, 2.8], [15.4, 5, 1.8, 2.8], [20.0, 5, 1.8, 1.6]], SLATE); wins(-10, 0, -Math.PI / 2, 14, [[4.6, 4, 1.8, 2.8], [10, 4, 1.8, 2.8], [15.4, 4, 1.8, 2.8]], SLATE); wins(10, 0, Math.PI / 2, 14, [[10, 4, 1.8, 2.8], [15.4, 4, 1.8, 2.8]], SLATE);
      inFrame(-5, 23.3, -3, 0, () => tank(2.4, 3.6, OXIDE)); inFrame(5, 23.3, 2, 0, () => { box(5, 3, 4, CORR, 0, 1.5, 0, 0); box(5.6, 0.25, 4.6, STEEL, 0, 3.1, 0); }); door(0, 8, 0, 2.8, 4.2, WOOD); });
    inFrame(85, DECK, -93.5, 0, () => { lathe([[6.4, 0], [6.4, 1.6], [5.8, 2.2], [5.0, 46]], BRICK, 40, 0); for (const y of [8, 20, 32, 44]) lathe([[5.8 - 0.018 * y, y - 0.4], [6.05 - 0.018 * y, y - 0.3], [6.05 - 0.018 * y, y + 0.3], [5.8 - 0.018 * y, y + 0.4]], STEEL, 40, 0, 0.6);
      lathe([[5.0, 45.4], [7.6, 47.4], [7.6, 48.0], [4.9, 48.0]], STEEL, 40, 0, 2.6); for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; bar(V(7.4 * Math.sin(a), 48, 7.4 * Math.cos(a)), V(7.4 * Math.sin(a), 49.3, 7.4 * Math.cos(a)), 0.07, STEEL, 5); } put(new THREE.TorusGeometry(7.4, 0.06, 5, 48).rotateX(Math.PI / 2), STEEL, M(0, 49.3, 0), 'ring', 1);
      put(new THREE.CylinderGeometry(5.3, 5.3, 8, 10, 1, true), PAINT, M(0, 52, 0), 'ring', 26, YEL); for (let i = 0; i < 10; i++) { const a = (i + 0.5) / 10 * TAU; if (i % 2) win(5.1 * Math.sin(a), 52.4, 5.1 * Math.cos(a), a, 1.7, 2.6); }
      { const d = []; for (let i = 0; i <= 8; i++) { const t = i / 8 * Math.PI / 2; d.push([6.0 * Math.cos(t), 56 + 4.2 * Math.sin(t)]); } lathe(d, ROOF, 32, 0, 1.8); } bar(V(0, 60, 0), V(0, 69, 0), 0.14, STEEL, 6);
      boom(V(-4.5, 50.5, 0), V(-25, 53, 3), 2.0, 0.9, 9, STEEL); bar(V(0, 66, 0), V(-25, 53.4, 3), 0.06, STEEL, 4); bar(V(-22, 52.4, 2.8), V(-22, 34, 2.8), 0.05, STEEL, 4); box(1.2, 1.5, 0.8, PAINT, -22, 33.2, 2.8, YEL);
      for (const [a, y] of [[0.4, 14], [2.6, 26], [4.4, 38]]) win((5.75 - 0.018 * y) * Math.sin(a), y, (5.75 - 0.018 * y) * Math.cos(a), a, 1.5, 2.8); });                                   // the little tower: the big one's sister
    inFrame(70, DECK, -137, 0, () => { walls(32, 15, 27, BRICK, 0); inFrame(0, 0, 0, Math.PI / 2, () => gable(15, 32, 27, 6.5, CORR, 1, BRICK, 0)); wins(0, 7.5, 0, 30, [[5.4, 6, 2.2, 3.6], [12.6, 6, 2.2, 3.6], [19.8, 6, 2.2, 3.6]]); wins(-16, 0, -Math.PI / 2, 13, [[5.4, 2, 2.2, 3.6], [12.6, 2, 2.2, 3.6], [19.8, 2, 2.2, 3.6]]); wins(0, -7.5, Math.PI, 30, [[12.6, 6, 2.2, 3.6], [19.8, 6, 2.2, 3.6]]);
      inFrame(0, 0, 9.4, 0, () => { box(8, 0.35, 3.8, STEEL, 0, 9.4, 0); for (const s of [-3.6, 3.6]) bar(V(s, 0, 1.6), V(s, 9.3, 1.6), 0.14, STEEL, 6); }); door(0, 7.5, 0, 5.0, 6.2, WOOD); });
    inFrame(46, DECK, -124, 0, () => { walls(12, 22, 9, CORR, 2); gable(12, 22, 9, 4.2, CORR, 0, CORR, 2); door(0, 11, 0, 5.2, 5.6, WOOD); wins(6, 0, Math.PI / 2, 20, [[5.2, 4, 1.8, 2.2]]); });
    inFrame(43.5, DECK, -96, 0, () => { walls(8, 12, 7, PAINT, OXIDE); gable(8, 12, 7, 2.6, CORR, 0, PAINT, OXIDE); door(0, 6, 0, 3.0, 3.8, WOOD); wins(-4, 0, -Math.PI / 2, 10, [[3.6, 3, 1.6, 2.2]]); });
    inFrame(100, DECK, -92, 0, () => stack(1.9, 1.3, 38, 1));
    for (const [x, z] of [[40.5, -88], [50, -86.5], [74, -86.5], [107, -100], [107, -130], [96, -152], [60, -152], [40.5, -140], [40.5, -110]]) post(x, z);
    pier(44, -83.7, 44, -48); inFrame(44, DECK, -44, 0, () => { box(9, 0.4, 8, WOOD, 0, -0.2, 0); for (const sx of [-4, 4]) for (const sz of [-3.5, 3.5]) bar(V(sx, -10, sz), V(sx, 1.2, sz), 0.3, WOOD, 7);
      box(6.4, 4.4, 5.2, PAINT, 0, 2.2, 0, TEAL); gable(6.4, 5.2, 4.4, 2.2, CORR, 1, PAINT, TEAL); win(0, 2.5, 2.62, 0, 1.6, 1.8); win(3.22, 2.5, 0, Math.PI / 2, 1.4, 1.8); });                                   // the harbour master's hut at the pier head
    // ---- the tower's own quay joins the others by footbridges ----
    bridge(V(-10.8, 0, -72), V(-18, 0, -75)); bridge(V(27.4, 0, -78.2), V(39, 0, -84.6)); bridge(V(35.6, 0, -151), V(39.2, 0, -151)); bridge(V(8, 0, -87.2), V(9, 0, -102.5)); bridge(V(4.6, 0, -113.4), V(2, 0, -148)); bridge(V(-4, 0, -140), V(0.2, 0, -150));
  }

  // ================= the one material =================
  const HEAD_V = /* glsl */`attribute vec4 aTw; varying vec4 vTw; varying vec3 vTwP;`;
  const HEAD_F = /* glsl */`varying vec4 vTw; varying vec3 vTwP; uniform float uLamp, uWet;
    ` + SURF_GLSL + /* glsl */`
    float nH(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float nN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(nH(i), nH(i + vec2(1, 0)), f.x), mix(nH(i + vec2(0, 1)), nH(i + vec2(1, 1)), f.x), f.y); }
    float nF(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * nN(p); p = p * 2.03 + vec2(7.1, 3.3); a *= .5; } return s; }
    float nRust(vec2 p, float k){ return smoothstep(0.64 - 0.5 * k, 0.72 - 0.5 * k, nF(p * 0.55) * 0.75 + nN(p * 3.1) * 0.25); }
    vec3 nPaint(float vr){ return vr < 0.5 ? vec3(0.76, 0.43, 0.045) : vr < 1.5 ? vec3(0.075, 0.30, 0.30) : vr < 2.5 ? vec3(0.40, 0.095, 0.055) : vr < 3.5 ? vec3(0.60, 0.54, 0.42) : vr < 4.5 ? vec3(0.17, 0.24, 0.31) : vec3(0.66, 0.66, 0.62); }
    // albedo, roughness, metalness, height (m) and light of its own at the surface point p = (u, v) metres, of kind id and variant vr; wy = metres above the sea
    void nSurf(vec2 p, float id, float vr, float wy, out vec3 col, out float rg, out float mt, out float h, out vec3 emi){
      emi = vec3(0.0); h = 0.0; mt = 0.0; rg = 0.8; col = vec3(0.5);
      float aa = max(fwidth(p.x), fwidth(p.y)), run = nF(vec2(p.x * 0.33, p.y * 0.045)), blot = nF(p * 0.21 + 11.0), fine = nN(p * 6.0);
      float tide = 1.0 - smoothstep(0.6, 3.2, wy + 1.6 * (blot - 0.5));
      if (id < 0.5) {            // brick, running bond: red, purple-brown, or yellow stock
        float bw = 1.5, bh = 0.62, row = floor(p.y / bh), u = p.x + 0.5 * bw * mod(row, 2.0); vec2 c = vec2(floor(u / bw), row), f = fract(vec2(u / bw, p.y / bh));
        float d = min(min(f.x, 1.0 - f.x) * bw, min(f.y, 1.0 - f.y) * bh), tn = nH(c), face = smoothstep(0.03, 0.075 + aa, d);
        face *= 1.0 - step(0.72, nH(c + 3.3)) * (1.0 - smoothstep(0.05, 0.17, length(min(f, 1.0 - f) * vec2(bw, bh))));
        vec3 a0 = vr < 0.5 ? vec3(0.36, 0.085, 0.050) : vr < 1.5 ? vec3(0.19, 0.075, 0.070) : vec3(0.46, 0.30, 0.13), a1 = vr < 0.5 ? vec3(0.50, 0.150, 0.075) : vr < 1.5 ? vec3(0.30, 0.11, 0.085) : vec3(0.60, 0.42, 0.20);
        vec3 br = mix(a0, a1, tn); br = mix(br, br * 0.55, step(0.86, nH(c + 7.7))); br *= 0.82 + 0.36 * fine; col = mix(vec3(0.30, 0.26, 0.22) * (0.8 + 0.4 * fine), br, face);
        h = face * 0.035 + 0.012 * fine * face; rg = mix(0.95, 0.80, face); col *= 1.0 - 0.42 * smoothstep(0.46, 0.80, run); col = mix(col, vec3(0.08, 0.12, 0.065), 0.7 * tide); }
      else if (id < 1.5) {       // paint on plate or board: seams, rivets, chips to rust, streaks
        float pw = 2.6, ph = 3.2; vec2 f = vec2(fract(p.x / pw) * pw, fract(p.y / ph) * ph); float dx = min(f.x, pw - f.x), dy = min(f.y, ph - f.y), ds = min(dx, dy), seam = 1.0 - smoothstep(0.012, 0.035 + aa, ds);
        vec2 rv = dx < dy ? vec2(dx - 0.13, fract(p.y / 0.42) * 0.42 - 0.21) : vec2(dy - 0.13, fract(p.x / 0.42) * 0.42 - 0.21); float rivet = 1.0 - smoothstep(0.045, 0.065 + aa, length(rv));
        float k = 0.18 + 0.40 * (1.0 - smoothstep(0.0, 0.5, ds)) + 0.35 * tide + 0.16 * smoothstep(0.5, 0.9, run), rust = nRust(p + 3.0, k);
        vec3 pa = nPaint(vr) * (0.82 + 0.3 * blot); pa = mix(pa, pa * vec3(0.6, 0.5, 0.42), 0.5 * smoothstep(0.35, 0.85, run));
        col = mix(pa, mix(vec3(0.20, 0.075, 0.03), vec3(0.34, 0.15, 0.05), fine), rust); col = mix(col, vec3(0.05, 0.04, 0.035), seam * 0.8); col = mix(col, pa * 1.12, rivet * (1.0 - rust));
        h = 0.014 * rivet - 0.012 * seam - 0.004 * rust; rg = mix(0.50, 0.93, rust); }
      else if (id < 2.5) {       // bare steel
        float rust = nRust(p + 9.0, 0.34 + 0.4 * tide); col = mix(vec3(0.20, 0.21, 0.225) * (0.75 + 0.5 * blot), mix(vec3(0.17, 0.07, 0.035), vec3(0.28, 0.13, 0.05), fine), 0.8 * rust); h = -0.003 * rust; rg = mix(0.46, 0.92, rust); mt = mix(0.85, 0.1, rust); }
      else if (id < 3.5) {       // roofing in sheets with standing seams: green copper, or dark slate-grey lead
        float pw = 1.8, dx = abs(fract(p.x / pw) - 0.5) * pw, seam = 1.0 - smoothstep(0.03, 0.07 + aa, pw * 0.5 - dx), tn = nH(vec2(floor(p.x / pw), 3.0));
        vec3 g = vr < 0.5 ? mix(vec3(0.11, 0.30, 0.26), vec3(0.24, 0.44, 0.36), tn) : mix(vec3(0.075, 0.085, 0.105), vec3(0.13, 0.145, 0.17), tn); g *= 0.8 + 0.4 * fine;
        g = mix(g, vr < 0.5 ? vec3(0.19, 0.10, 0.05) : vec3(0.16, 0.13, 0.10), 0.7 * smoothstep(0.52, 0.80, nF(vec2(p.x * 0.9, p.y * 0.12) + 5.0))); col = mix(g, g * 0.45, seam); h = 0.03 * seam; rg = 0.62; mt = vr < 0.5 ? 0.3 : 0.15; }
      else if (id < 4.5) {       // glass: black by day, lit from inside when the light goes
        col = vec3(0.012, 0.020, 0.026); rg = 0.07; float k = nH(floor(vTwP.xz * 0.37) + floor(vTwP.y * 0.31)); emi = vec3(1.9, 1.05, 0.42) * uLamp * step(0.34, k) * (0.6 + 0.8 * k); }
      else if (id < 5.5) {       // timber: boards, grey with weather, green at the waterline
        float pk = 0.36, row = floor(p.x / pk), fx = fract(p.x / pk), gap = 1.0 - smoothstep(0.02, 0.07 + aa, min(fx, 1.0 - fx) * pk), tn = nH(vec2(row, 1.0));
        col = mix(vec3(0.17, 0.115, 0.07), vec3(0.31, 0.23, 0.15), tn) * (0.7 + 0.5 * nN(vec2(p.x * 9.0, p.y * 0.7 + row * 3.0))); col = mix(col, vec3(0.03, 0.025, 0.02), gap); col = mix(col, vec3(0.05, 0.085, 0.045), 0.7 * tide); h = -0.02 * gap; rg = 0.9; }
      else if (id < 6.5) {       // concrete: cast in lifts; black-green and barnacled where the sea reaches
        float lift = 1.0 - smoothstep(0.0, 0.04 + aa, abs(fract(p.y / 1.25) - 0.5) * 1.25); col = vec3(0.34, 0.33, 0.30) * (0.70 + 0.5 * nF(p * 0.35)) * (1.0 - 0.35 * smoothstep(0.45, 0.8, run)); col = mix(col, col * 0.6, lift);
        col = mix(col, vec3(0.045, 0.075, 0.04), 0.9 * tide); col = mix(col, vec3(0.55, 0.53, 0.47), 0.5 * step(0.80, nN(p * 9.0)) * tide); h = -0.012 * lift + 0.006 * fine; rg = mix(0.93, 0.45, tide); }
      else if (id < 7.5) {       // corrugated iron: grey zinc going to rust, or painted
        float rib = sin(p.x * 6.2831853 / 0.19), sheet = 1.0 - smoothstep(0.0, 0.03 + aa, abs(fract(p.x / 0.95) - 0.5) * 0.95), lap = 1.0 - smoothstep(0.0, 0.05 + aa, abs(fract(p.y / 2.4) - 0.5) * 2.4);
        vec3 z = vr < 0.5 ? vec3(0.29, 0.30, 0.31) : vr < 1.5 ? vec3(0.36, 0.10, 0.06) : vec3(0.09, 0.27, 0.27); z *= 0.8 + 0.3 * nH(vec2(floor(p.x / 0.95), floor(p.y / 2.4)));
        float rust = nRust(vec2(p.x * 0.7, p.y * 0.35) + 4.0, 0.30 + 0.25 * lap + 0.2 * smoothstep(0.4, 0.9, run) + 0.3 * tide);
        col = mix(z, mix(vec3(0.22, 0.085, 0.035), vec3(0.36, 0.16, 0.055), fine), rust) * (0.80 + 0.20 * rib); col = mix(col, col * 0.5, max(sheet, lap) * 0.7); h = 0.016 * rib * (1.0 - smoothstep(0.02, 0.10, aa)); rg = mix(0.45, 0.9, rust); mt = mix(0.6, 0.05, rust); }
      else if (id < 8.5) { col = vec3(0.85, 0.78, 0.60); rg = 0.3; emi = vec3(2.6, 1.5, 0.62) * (0.22 + 3.4 * uLamp); }
      else if (id < 9.5) { col = vec3(0.020, 0.020, 0.022) * (0.7 + 0.7 * fine); rg = 0.86; }
      else if (id < 10.5) { col = vec3(0.30, 0.23, 0.14) * (0.72 + 0.28 * sin((vTwP.x + vTwP.y + vTwP.z) * 38.0)); rg = 0.96; }
      else {                     // warning paint on the kerbs
        float k = step(0.5, fract((p.x + p.y) / 1.1)), chip = smoothstep(0.56, 0.72, nF(p * 1.3 + 2.0)); col = mix(mix(vec3(0.028), vec3(0.80, 0.50, 0.04), k) * (0.8 + 0.3 * fine), vec3(0.24, 0.22, 0.20), chip); rg = mix(0.6, 0.9, chip); }
      float wet = uWet * (0.6 + 0.4 * run); col *= 1.0 - 0.30 * wet; rg = mix(rg, min(rg, 0.28), 0.8 * wet);
    }`;
  function material() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 1, side: THREE.DoubleSide });
    const U = typeof TowerCode !== 'undefined' && TowerCode.U ? TowerCode.U : { uLamp: { value: 0 }, uWet: { value: 0 } };
    patch(mat, s => { s.sh.uniforms.uLamp = U.uLamp; s.sh.uniforms.uWet = U.uWet; s.sh.uniforms.uSurfT = Surf.U.uSurfT;
      s.vHead(HEAD_V); s.v('#include <begin_vertex>', '#include <begin_vertex>\n  vTw = aTw; vTwP = (modelMatrix * vec4(position, 1.0)).xyz;'); s.fHead(HEAD_F);
      s.f('#include <color_fragment>', '#include <color_fragment>\n  vec3 nCol, nEmi; float nRg, nMt, nHt; nSurf(vTw.xy, vTw.z, vTw.w, vTwP.y, nCol, nRg, nMt, nHt, nEmi); diffuseColor.rgb = sfWash(nCol, vTwP);');
      s.f('#include <roughnessmap_fragment>', 'float roughnessFactor = nRg;'); s.f('#include <metalnessmap_fragment>', 'float metalnessFactor = nMt;');
      s.f('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n  { vec3 sp = -vViewPosition, sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1), fw = max(length(sx), length(sy));\n    vec3 gr = sign(det) * (dFdx(nHt) * r1 + dFdy(nHt) * r2); normal = normalize(abs(det) * normal - gr * (1.0 - smoothstep(0.03, 0.22, fw))); }');
      s.f('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += nEmi;');
    }, 'town');
    return mat;
  }
  function build(scene) {
    const t0 = performance.now(); make();
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nor, 3)); g.setAttribute('aTw', new THREE.Float32BufferAttribute(B.tw, 4)); g.setIndex(B.idx);
    const mesh = new THREE.Mesh(g, material()); mesh.position.y = 0.05; mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'town'; mesh.updateMatrixWorld(true); g.computeBoundingBox(); g.computeBoundingSphere(); scene.add(mesh);
    Surf.build(scene, RECTS, [[10, -66, 21.4]]);
    G.info.town = { tris: B.idx.length / 3 | 0, verts: B.pos.length / 3 | 0, ms: Math.round(performance.now() - t0) };
    return mesh;
  }
  return { build };
})();
