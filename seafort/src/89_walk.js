'use strict';
// ---- tour: leave the crane and fly the place yourself. W A S D move along the view, Q / E sink and rise, Shift is fast; the mouse looks
//      (a click captures the pointer where the page may; otherwise hold a button and drag). R hands the camera back to the tour.
//      Keys are read by position (e.code), so a Korean or any other input method changes nothing. The day, the weather and the sound go on. ----
const Walk = (() => {
  if (!G.tour) return null;
  const keys = new Set(), pos = new THREE.Vector3(), vel = new THREE.Vector3(), wish = new THREE.Vector3(), eu = new THREE.Euler(0, 0, 0, 'YXZ'), d = new THREE.Vector3();
  const MOVE = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, KeyQ: 1, KeyE: 1 }, canvas = document.getElementById('c');
  let on = false, yaw = 0, pitch = 0, cam = null, drag = false, hint = null, hintT = 0, tA = 0, tB = 0, touchUI = false;
  const TS = new Map(); let tapAt = 0, tapX = 0, tapY = 0;      // touches alive: id -> { side, x0, y0, x, y, moved }
  function say(txt) { if (!hint) { hint = document.createElement('div'); hint.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);font:600 11px/1 -apple-system,system-ui,sans-serif;letter-spacing:.08em;color:#f3d9bd;background:rgba(20,14,14,.5);padding:9px 14px;border-radius:999px;border:1px solid rgba(243,217,189,.18);pointer-events:none;transition:opacity .8s;z-index:4;white-space:nowrap'; document.body.appendChild(hint); }
    hint.textContent = txt; hint.style.opacity = 1; clearTimeout(hintT); hintT = setTimeout(() => { hint.style.opacity = 0; }, 5200); }
  function enter() { if (on || !cam) return; on = true; pos.copy(cam.position); cam.getWorldDirection(d); yaw = Math.atan2(-d.x, -d.z); pitch = Math.asin(clamp(d.y, -1, 1)); vel.set(0, 0, 0); if (G.resume) G.resume();
    say(touchUI ? 'left thumb moves · right thumb looks · double-tap for the tour' : 'W A S D move · mouse look (click or drag) · Q / E down / up · Shift fast · R back to the tour'); }
  function leave() { if (!on) return; on = false; keys.clear(); tA = tB = 0; if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); say('tour'); }
  function step(camera, dt) { cam = camera; if (!on) return;
    const k = c => keys.has(c) ? 1 : 0, cp = Math.cos(pitch), fx = -Math.sin(yaw) * cp, fy = Math.sin(pitch), fz = -Math.cos(yaw) * cp, rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const a = k('KeyW') - k('KeyS') + tA, b = k('KeyD') - k('KeyA') + tB, u = k('KeyE') - k('KeyQ'), sp = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 52 : 15;
    wish.set(fx * a + rx * b, fy * a + u, fz * a + rz * b); if (wish.lengthSq() > 1) wish.normalize(); wish.multiplyScalar(sp);
    vel.lerp(wish, 1 - Math.exp(-dt * 7)); pos.addScaledVector(vel, dt);
    pos.y = clamp(pos.y, 1.2, 420); const cx = pos.x - 14, cz = pos.z + 100, r = Math.hypot(cx, cz); if (r > 1300) { pos.x = 14 + cx * 1300 / r; pos.z = -100 + cz * 1300 / r; }      // the sea is drawn out to here
    camera.position.copy(pos); camera.quaternion.setFromEuler(eu.set(pitch, yaw, 0)); }
  addEventListener('keydown', e => { if (e.metaKey || e.ctrlKey || e.altKey) return; if (MOVE[e.code]) { if (!on) enter(); e.preventDefault(); } if (e.code === 'KeyR') leave(); if (on) keys.add(e.code); });
  addEventListener('keyup', e => keys.delete(e.code)); addEventListener('blur', () => { keys.clear(); drag = false; });
  addEventListener('pointerdown', e => { if (!on || e.pointerType === 'touch') return; drag = true; if (canvas && canvas.requestPointerLock && !document.pointerLockElement) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (err) {} } });
  addEventListener('pointerup', () => { drag = false; });
  addEventListener('mousemove', e => { if (!on || !(document.pointerLockElement || drag)) return; yaw -= (e.movementX || 0) * 0.0023; pitch = clamp(pitch - (e.movementY || 0) * 0.0023, -1.45, 1.45); });
  // ---- touch: an invisible pad. A thumb on the left half is a stick (it starts wherever the thumb lands; push away from there to move),
  //      a thumb on the right half turns the view. The first drag leaves the tour; a double tap gives the camera back to it. Nothing is drawn ----
  const tOpt = { passive: false };
  addEventListener('touchstart', e => { touchUI = true; for (const t of e.changedTouches) TS.set(t.identifier, { side: t.clientX < innerWidth / 2 ? 0 : 1, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, moved: 0, at: e.timeStamp }); if (on) e.preventDefault(); }, tOpt);
  addEventListener('touchmove', e => { for (const t of e.changedTouches) { const s = TS.get(t.identifier); if (!s) continue; const dx = t.clientX - s.x, dy = t.clientY - s.y; s.x = t.clientX; s.y = t.clientY; s.moved += Math.abs(dx) + Math.abs(dy);
      if (!on && s.moved > 14) enter(); if (!on) continue;
      if (s.side) { yaw -= dx * 0.0052; pitch = clamp(pitch - dy * 0.0052, -1.45, 1.45); }
      else { const R = Math.min(innerWidth, innerHeight) * 0.16, ux = clamp((s.x - s.x0) / R, -1, 1), uy = clamp((s.y - s.y0) / R, -1, 1); tB = Math.abs(ux) < 0.12 ? 0 : ux; tA = Math.abs(uy) < 0.12 ? 0 : -uy; } }
    e.preventDefault(); }, tOpt);
  const tEnd = e => { for (const t of e.changedTouches) { const s = TS.get(t.identifier); if (!s) continue; TS.delete(t.identifier); if (!s.side) tA = tB = 0;
      if (s.moved < 10 && e.timeStamp - s.at < 320) { if (on && e.timeStamp - tapAt < 340 && Math.hypot(s.x - tapX, s.y - tapY) < 60) { leave(); tapAt = 0; } else { tapAt = e.timeStamp; tapX = s.x; tapY = s.y; } } } };
  addEventListener('touchend', tEnd, tOpt); addEventListener('touchcancel', tEnd, tOpt);
  G.walk = step;
  return { get on() { return on; }, enter, leave };
})();
