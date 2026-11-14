'use strict';
// ---- the rock module's place in the build, held by the set (32_set.js). The film's other modules read Rock.L (the layout),
//      Rock.sites (planting sites: none here) and Rock.mat (the material of the mesh the red loong's coil is laid on) ----
const Rock = (() => {
  const sites = [];
  // The main "spire" is the set's central tower. Falls and ledges of the old valley are folded down to the waterline.
  const L = {
    main: { x: 10, z: -66, top: 102, r0: 15.2, r1: 13.2 },
    gateY: 4.4, gateZ: -14, leftLedge: { x: -27, y: 2.4, z: -5 }, rightTer: { x: 33, y: 3.2, z: 8 },
    bankY: 6.0,
    sluice: { x0: 7.7, x1: 12.3, y: 0.35, z: -66, back: -66 },      // the one fall the lake module needs is folded away inside the tower's foot
  };
  let mat = null;
  async function build(scene, prog, tick) { const r = await SetPiece.build(scene, L, prog, tick); mat = r.seatMat; prog(1); }
  return { build, sites, L, get mat() { return mat; } };
})();
