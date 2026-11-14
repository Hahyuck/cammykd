'use strict';
// ---- tour: the sea breaking on what stands in it. Seen from a boat's height a metre of foam lying on the water is a hair's width, so the
//      white has to stand up: (1) SURF_GLSL, shared by the tower's and the town's materials, washes every wall at the waterline with a
//      band of foam that climbs and sinks with each wave and leaves the stone dark and wet above it; (2) Surf.build throws spray up
//      along the same walls, in step with the same wave (one phase function of place and time serves both). ----
const SURF_Y = 0.05;
const SURF_GLSL = /* glsl */`uniform float uSurfT;
  float sfH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float sfN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(sfH(i), sfH(i + vec2(1.0, 0.0)), f.x), mix(sfH(i + vec2(0.0, 1.0)), sfH(i + vec2(1.0, 1.0)), f.x), f.y); }
  float sfPhase(vec2 xz){ return uSurfT * 1.25 + sfN(xz * 0.09) * 9.0; }
  vec3 sfWash(vec3 col, vec3 wp){ float y = wp.y - ${SURF_Y.toFixed(2)}; if (y > 3.2) return col;
    float al = wp.x * 0.71 + wp.z * 0.71, sw = 0.5 + 0.5 * sin(sfPhase(wp.xz)); sw *= sw;
    float top = 0.10 + 1.05 * sw * (0.35 + 0.65 * sfN(vec2(al * 0.45, uSurfT * 0.5)));
    float lace = 0.45 + 0.55 * sfN(vec2(al * 5.0 + wp.x * 2.0, y * 6.0 + uSurfT * 2.2));
    col *= 1.0 - 0.38 * smoothstep(top + 1.0, top, y);                                   // wet above the foam
    return mix(col, vec3(0.86, 0.89, 0.90), 0.92 * smoothstep(top, top - 0.30, y) * lace); }`;
const Surf = (() => {
  const U = { uSurfT: G.uTime, uC: { value: new THREE.Color(1, 1, 1) }, uK: { value: 1 } };
  // rects: [x0, z0, x1, z1] quays; rings: [x, z, r]
  function build(scene, rects, rings) {
    const B = [], Rn = [], inside = (x, z, skip) => { for (const q of rects) if (q !== skip && x > q[0] - 0.4 && x < q[2] + 0.4 && z > q[1] - 0.4 && z < q[3] + 0.4) return true; for (const c of rings) if (c !== skip && Math.hypot(x - c[0], z - c[1]) < c[2] - 0.3) return true; return false; };
    let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const emit = (x, z, nx, nz, skip) => { if (inside(x + nx * 0.6, z + nz * 0.6, skip)) return; for (let k = 0; k < 2; k++) { B.push(x, z, nx, nz); Rn.push(rnd(), rnd(), rnd(), rnd()); } };
    for (const q of rects) { const [x0, z0, x1, z1] = q; for (let x = x0 + 0.5; x < x1; x += 1.15) { emit(x, z1, 0, 1, q); emit(x, z0, 0, -1, q); } for (let z = z0 + 0.5; z < z1; z += 1.15) { emit(x1, z, 1, 0, q); emit(x0, z, -1, 0, q); } }
    for (const c of rings) { const n = Math.round(TAU * c[2] / 1.15); for (let i = 0; i < n; i++) { const a = i / n * TAU; emit(c[0] + c[2] * Math.sin(a), c[1] + c[2] * Math.cos(a), Math.sin(a), Math.cos(a), c); } }
    const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
    g.setAttribute('aB', new THREE.InstancedBufferAttribute(new Float32Array(B), 4)); g.setAttribute('aR', new THREE.InstancedBufferAttribute(new Float32Array(Rn), 4)); g.instanceCount = B.length / 4;
    const m = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, fog: false,
      vertexShader: SURF_GLSL + /* glsl */`
        attribute vec4 aB, aR; uniform float uK; varying vec2 vQ; varying vec2 vA;
        void main(){ float ph = sfPhase(aB.xy) - 2.3 + aR.x * 1.1, a = fract(ph / 6.2831853) / 0.40, live = step(a, 1.0);
          float strong = 0.35 + 0.65 * sfN(vec2((aB.x + aB.y) * 0.32, uSurfT * 0.5)), H = (0.5 + 2.3 * aR.y * aR.y) * uK * strong, e = 1.0 - (1.0 - a) * (1.0 - a);
          vec3 c = vec3(aB.x + aB.z * (0.15 + 0.9 * a * aR.z), ${SURF_Y.toFixed(2)} + 0.1 + H * e - 0.5 * H * a * a, aB.y + aB.w * (0.15 + 0.9 * a * aR.z));
          float size = (0.40 + 0.55 * aR.w) * (0.55 + 1.5 * a) * sqrt(uK);
          vec4 mv = viewMatrix * vec4(c, 1.0); mv.xy += position.xy * size * live; vQ = position.xy; vA = vec2(live * smoothstep(0.0, 0.07, a) * pow(1.0 - min(a, 1.0), 1.3) * strong, aR.x * 37.0);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: SURF_GLSL + /* glsl */`
        uniform vec3 uC; varying vec2 vQ; varying vec2 vA;
        void main(){ float d = length(vQ); if (d > 1.0 || vA.x < 0.004) discard; float blot = 0.55 + 0.45 * sfN(vQ * 2.6 + vA.y);
          gl_FragColor = vec4(uC * (0.82 + 0.18 * blot), 0.85 * vA.x * smoothstep(1.0, 0.25, d) * blot); }` });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 6; mesh.name = 'surf'; scene.add(mesh);
    G.tick.push(() => { const S = Daylight.S, te = G.tEnv === undefined ? G.t : G.tEnv, storm = sm(22, 33, te) * (1 - sm(68, 76, te)), b = 0.92 * (1 - 0.5 * (S.gloom || 0)) * lerp(1, 0.32, sm(76, 88, te)) + 0.8 * (S.flash || 0);
      U.uC.value.setRGB(b * lerp(1, 1.06, sm(70, 86, te)), b, b * lerp(1.02, 0.86, sm(70, 86, te))); U.uK.value = 1 + 1.3 * storm; });
    G.info.surf = g.instanceCount; return mesh;
  }
  return { build, U };
})();
