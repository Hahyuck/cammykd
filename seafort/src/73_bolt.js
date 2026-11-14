'use strict';
// ---- tour: lightning under the storm. Each entry of TOUR_STRIKES (seconds of the ENVIRONMENT clock G.tEnv) is one bolt from the cloud
//      to the sea. A bolt is placed the moment it strikes, 700 to 1000 m out and 9 to 25 degrees to one side of where the lens is
//      looking, so it is always in frame behind the town. It is a ribbon that faces the lens: a white-hot core in a soft sheath,
//      with two or three forks; it burns for a few frames and re-strikes twice. Ambient (86_ambient.js) is told, for the thunder ----
const Bolt = (() => {
  if (typeof TOUR_STRIKES === 'undefined') return null;
  const meshes = [], par = [], armed = []; let built = false; const fwd = new THREE.Vector3();
  G.boltAt = new THREE.Vector3(0, 300, -900);
  const VS = /* glsl */`attribute vec3 aT; attribute vec3 aQ; uniform float uW; varying float vS, vU, vB;
    void main(){ vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz; vec3 side = normalize(cross(aT, normalize(cameraPosition - wp)));
      float d = distance(cameraPosition, wp); wp += side * aQ.x * uW * aQ.z * max(1.0, d / 520.0);
      vS = aQ.x; vU = aQ.y; vB = aQ.z; gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`;
  const FS = /* glsl */`uniform float uE; varying float vS, vU, vB;
    void main(){ float a = abs(vS), core = 1.0 - smoothstep(0.07, 0.20, a), sheath = exp(-a * 4.2) * (1.0 - a);
      float top = smoothstep(0.0, 0.16, vU);                 // it comes out of the cloud, it is not hung on it
      vec3 c = vec3(0.80, 0.86, 1.0) * (46.0 * core + 4.5 * sheath) * mix(0.45, 1.0, vB);
      gl_FragColor = vec4(c * uE * top, 1.0); }`;
  function path(r, a, b, n, amp) {                             // midpoint displacement between a and b: n is a power of two
    const p = new Array(n + 1); p[0] = a; p[n] = b;
    for (let st = n; st > 1; st /= 2) { const k = amp * st / n; for (let i = st / 2; i < n; i += st) { const u = p[i - st / 2], v = p[i + st / 2]; p[i] = [(u[0] + v[0]) / 2 + (r() - 0.5) * k, (u[1] + v[1]) / 2 + (r() - 0.5) * k * 0.35, (u[2] + v[2]) / 2 + (r() - 0.5) * k]; } }
    return p; }
  function build() {
    if (built || !G.scene) return; built = true;
    for (let k = 0; k < TOUR_STRIKES.length; k++) { const r = rng(7001 + k * 131), pos = [], aT = [], aQ = [], idx = [];
      const dist = 700 + 300 * r(), H = dist * Math.tan(rad(21 + 6 * r())), off = rad(9 + 16 * r()) * (r() < 0.5 ? 1 : -1); par.push({ dist, H, off }); armed.push(true);
      const strand = (p, u0, u1, w) => { for (let i = 0; i < p.length; i++) { const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2], l = Math.hypot(tx, ty, tz) || 1, u = lerp(u0, u1, i / (p.length - 1)), v = pos.length / 3;
          for (const s of [-1, 1]) { pos.push(p[i][0], p[i][1], p[i][2]); aT.push(tx / l, ty / l, tz / l); aQ.push(s, u, w * (i === p.length - 1 && w < 1 ? 0.3 : 1)); }
          if (i) idx.push(v - 2, v - 1, v, v, v - 1, v + 1); } };
      const main = path(r, [(r() - 0.5) * 120, H, (r() - 0.5) * 60], [0, 0, 0], 32, H * 0.42);
      strand(main, 0, 1, 1);
      const nf = 2 + (r() * 2 | 0); for (let f = 0; f < nf; f++) { const i0 = 5 + (r() * 16 | 0), o = main[i0], len = H * (0.22 + 0.25 * r()), az = r() * TAU;
        strand(path(r, o, [o[0] + Math.cos(az) * len * 0.7, Math.max(0, o[1] - len), o[2] + Math.sin(az) * len * 0.3], 8, len * 0.5), i0 / 32, i0 / 32, 0.55); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 3)); g.setAttribute('aQ', new THREE.Float32BufferAttribute(aQ, 3)); g.setIndex(idx);
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uE: { value: 0 }, uW: { value: 13 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      m.frustumCulled = false; m.visible = false; m.renderOrder = 50; m.name = 'bolt'; G.scene.add(m); meshes.push(m); }
    G.info.bolts = meshes.length;
  }
  const env = d => d < 0 || d > 0.9 ? 0 : Math.exp(-d / 0.10) + (d > 0.16 ? 0.75 * Math.exp(-(d - 0.16) / 0.07) : 0) + (d > 0.34 ? 0.35 * Math.exp(-(d - 0.34) / 0.06) : 0);
  function place(k) { const p = par[k], c = G.camera; c.getWorldDirection(fwd); const az = Math.atan2(fwd.x, fwd.z) + p.off, m = meshes[k];
    m.position.set(c.position.x + Math.sin(az) * p.dist, 0, c.position.z + Math.cos(az) * p.dist); m.updateMatrixWorld(true); G.boltAt.set(m.position.x, p.H * 0.85, m.position.z);
    if (typeof Ambient !== 'undefined' && Ambient && Ambient.thunder) Ambient.thunder(p.dist); }
  function update() { if (!built) build(); const te = G.tEnv === undefined ? G.t : G.tEnv;
    for (let k = 0; k < meshes.length; k++) { const d = (te - TOUR_STRIKES[k]) / TOUR_RATE, m = meshes[k];        // seconds of real time since it struck
      if (d < 0 || d > 3) armed[k] = true;
      const e = env(d); if (e > 0.004 && armed[k]) { armed[k] = false; place(k); }
      m.visible = e > 0.004; if (m.visible) m.material.uniforms.uE.value = e; } }
  G.tick.push(update);
  return { update, env };
})();
