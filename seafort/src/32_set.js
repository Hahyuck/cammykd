'use strict';
// ---- the set: one scanned/generated model stands where the karst valley stood. Its central tower takes the main spire's
//      place (same axis, same summit height), its water is the film's lake, and the sea runs on to the horizon around it ----
const SetPiece = (() => {
  const D = SET_DATA;
  const AX = +(Q.get('sax') || 0.155), AZ = +(Q.get('saz') || 0.020);      // the tower's axis in model units
  const SINK = 5.6, SC = +(Q.get('ssc') || 219), YAW = rad(+(Q.get('syaw') || -90)), WY0 = 0.05;
  const b64 = s => { const b = atob(s), n = b.length, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = b.charCodeAt(i); return u; };
  const img = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('set texture did not decode')); im.src = src; });
  async function build(scene, L, prog, tick) {
    const t0 = performance.now(), R = G.R;
    const q = new Uint16Array(b64(D.pos).buffer), qn = new Int8Array(b64(D.nrm).buffer), quv = new Uint16Array(b64(D.uv).buffer), ix0 = new Uint32Array(b64(D.idx).buffer);
    const nv = D.nv, pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
    const cy = Math.cos(YAW), sy = Math.sin(YAW), mn = D.mn, ex = [(D.mx[0] - mn[0]) / 65535, (D.mx[1] - mn[1]) / 65535, (D.mx[2] - mn[2]) / 65535];
    for (let i = 0; i < nv; i++) {
      const x = (q[i * 3] * ex[0] + mn[0] - AX) * SC, y = (q[i * 3 + 1] * ex[1] + mn[1] - D.wl) * SC, z = (q[i * 3 + 2] * ex[2] + mn[2] - AZ) * SC;
      pos[i * 3] = L.main.x + x * cy + z * sy; pos[i * 3 + 1] = WY0 + y - SINK; pos[i * 3 + 2] = L.main.z - x * sy + z * cy;
      const nx = qn[i * 3] / 127, ny = qn[i * 3 + 1] / 127, nz = qn[i * 3 + 2] / 127;
      nor[i * 3] = nx * cy + nz * sy; nor[i * 3 + 1] = ny; nor[i * 3 + 2] = -nx * sy + nz * cy;
      uv[i * 2] = quv[i * 2] / 65535; uv[i * 2 + 1] = quv[i * 2 + 1] / 65535;
    }
    prog(0.3); await tick();
    // faces wholly under four metres of water are never seen and would only shoal the lake's bed map
    const TOWER_IN_CODE = Q.get('tower') !== 'glb', inTower = i => { const y = pos[i * 3 + 1] + SINK, r = Math.hypot(pos[i * 3] - L.main.x, pos[i * 3 + 2] - L.main.z); return y < 40 ? (r < 17.6 || (y < 12.5 && r < 21.9)) && y > 3.5 : y < 62 ? r < 25.5 : r < 39; };
    const idx = new Uint32Array(ix0.length); let ni = 0;
    for (let i = 0; i < ix0.length; i += 3) { const a = ix0[i], b = ix0[i + 1], c = ix0[i + 2]; if (pos[a * 3 + 1] < -0.3 && pos[b * 3 + 1] < -0.3 && pos[c * 3 + 1] < -0.3) continue;
      if (TOWER_IN_CODE && inTower(a) && inTower(b) && inTower(c)) continue;      /* the scanned tower makes way for the one built in code (34_tower.js) */ idx[ni++] = a; idx[ni++] = b; idx[ni++] = c; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx.slice(0, ni), 1)); geo.computeBoundingBox(); geo.computeBoundingSphere();
    const [iB, iN, iM] = await Promise.all([img(D.tBase), img(D.tNorm), img(D.tMR)]);
    const tex = (im, srgb) => { const t = new THREE.Texture(im); t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = Math.min(16, R.capabilities.getMaxAnisotropy()); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; return t; };
    const tM = tex(iM, false);
    const mat = new THREE.MeshStandardMaterial({ map: tex(iB, true), normalMap: tex(iN, false), roughnessMap: tM, metalnessMap: tM, roughness: 1, metalness: +(Q.get('smetal') || 0.55), envMapIntensity: 1 });
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'set'; scene.add(mesh);
    prog(0.7); await tick();
    // ---- what the red loong lies on: the tower's surface as a cloud of points (60_dragon.js Seat reads the vertices of the mesh that
    //      carries Rock.mat). Every face of the shaft is sampled about every 0.7 m, so a rolled ball finds the wall between vertices ----
    const pts = [], S = L.main, near = i => { const dx = pos[i * 3] - S.x, dz = pos[i * 3 + 2] - S.z, y = pos[i * 3 + 1]; return dx * dx + dz * dz < 17 * 17 && y > 34 && y < 124; };
    for (let i = 0; i < ni; i += 3) { const a = idx[i], b = idx[i + 1], c = idx[i + 2]; if (!near(a) || !near(b) || !near(c)) continue;
      const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2], ux = pos[b * 3] - ax, uy = pos[b * 3 + 1] - ay, uz = pos[b * 3 + 2] - az, vx = pos[c * 3] - ax, vy = pos[c * 3 + 1] - ay, vz = pos[c * 3 + 2] - az;
      const n = Math.max(1, Math.ceil(Math.max(Math.hypot(ux, uy, uz), Math.hypot(vx, vy, vz)) / 0.7));
      for (let j = 0; j <= n; j++) for (let k = 0; k <= n - j; k++) { const s = j / n, t = k / n, x = ax + ux * s + vx * t, y = ay + uy * s + vy * t, z = az + uz * s + vz * t; if (Math.hypot(x - S.x, z - S.z) < 0.9 && y > 106) continue; pts.push(x, y, z); } }      // (the mast on the dome is no place to lie)
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3)); sg.setDrawRange(0, 0);
    const seatMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false });
    const seat = new THREE.Mesh(sg, seatMat); seat.raycast = () => {}; seat.frustumCulled = true; seat.name = 'setSeat'; scene.add(seat);
    // ---- the sea beyond the lake's rectangle: a plain dark mirror of the sky out to the horizon (the lake draws over it) ----
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: new THREE.Color(0.035, 0.085, 0.080), roughness: 0.22, metalness: 0.0, envMapIntensity: 1.6 }));
    sea.position.set(0, WY0 - 0.06, 0); sea.receiveShadow = true; sea.frustumCulled = false; sea.name = 'sea'; sea.renderOrder = -1; scene.add(sea);
    const bb = geo.boundingBox; G.info.set = { tris: ni / 3 | 0, verts: nv, seatPts: pts.length / 3 | 0, box: [bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z].map(x => Math.round(x)), ms: Math.round(performance.now() - t0) };
    if (TOWER_IN_CODE) TowerCode.build(scene, L, SINK);
    Town.build(scene);
    return { mesh, seatMat };
  }
  return { build };
})();
