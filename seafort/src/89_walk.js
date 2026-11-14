'use strict';
// ---- tour: leave the crane and fly the place yourself. W A S D move along the view, Q / E sink and rise, Shift is fast; the mouse looks
//      (a click captures the pointer where the page may; otherwise hold a button and drag). R hands the camera back to the tour.
//      Keys are read by position (e.code), so a Korean or any other input method changes nothing. The day, the weather and the sound go on. ----
const Walk = (() => {
  if (!G.tour) return null;
  const keys = new Set(), pos = new THREE.Vector3(), vel = new THREE.Vector3(), wish = new THREE.Vector3(), eu = new THREE.Euler(0, 0, 0, 'YXZ'), d = new THREE.Vector3();
  const MOVE = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, KeyQ: 1, KeyE: 1 }, canvas = document.getElementById('c');
  let on = false, yaw = 0, pitch = 0, cam = null, drag = false, hint = null, hintT = 0;
  function say(txt) { if (!hint) { hint = document.createElement('div'); hint.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);font:600 11px/1 -apple-system,system-ui,sans-serif;letter-spacing:.08em;color:#f3d9bd;background:rgba(20,14,14,.5);padding:9px 14px;border-radius:999px;border:1px solid rgba(243,217,189,.18);pointer-events:none;transition:opacity .8s;z-index:4;white-space:nowrap'; document.body.appendChild(hint); }
    hint.textContent = txt; hint.style.opacity = 1; clearTimeout(hintT); hintT = setTimeout(() => { hint.style.opacity = 0; }, 5200); }
  function enter() { if (on || !cam) return; on = true; pos.copy(cam.position); cam.getWorldDirection(d); yaw = Math.atan2(-d.x, -d.z); pitch = Math.asin(clamp(d.y, -1, 1)); vel.set(0, 0, 0); if (G.resume) G.resume();
    say('W A S D move · mouse look (click or drag) · Q / E down / up · Shift fast · R back to the tour'); }
  function leave() { if (!on) return; on = false; keys.clear(); if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); say('tour'); }
  function step(camera, dt) { cam = camera; if (!on) return;
    const k = c => keys.has(c) ? 1 : 0, cp = Math.cos(pitch), fx = -Math.sin(yaw) * cp, fy = Math.sin(pitch), fz = -Math.cos(yaw) * cp, rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const a = k('KeyW') - k('KeyS'), b = k('KeyD') - k('KeyA'), u = k('KeyE') - k('KeyQ'), sp = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 52 : 15;
    wish.set(fx * a + rx * b, fy * a + u, fz * a + rz * b); if (wish.lengthSq() > 1) wish.normalize(); wish.multiplyScalar(sp);
    vel.lerp(wish, 1 - Math.exp(-dt * 7)); pos.addScaledVector(vel, dt);
    pos.y = clamp(pos.y, 1.2, 420); const cx = pos.x - 14, cz = pos.z + 100, r = Math.hypot(cx, cz); if (r > 1300) { pos.x = 14 + cx * 1300 / r; pos.z = -100 + cz * 1300 / r; }      // the sea is drawn out to here
    camera.position.copy(pos); camera.quaternion.setFromEuler(eu.set(pitch, yaw, 0)); }
  addEventListener('keydown', e => { if (e.metaKey || e.ctrlKey || e.altKey) return; if (MOVE[e.code]) { if (!on) enter(); e.preventDefault(); } if (e.code === 'KeyR') leave(); if (on) keys.add(e.code); });
  addEventListener('keyup', e => keys.delete(e.code)); addEventListener('blur', () => { keys.clear(); drag = false; });
  addEventListener('pointerdown', () => { if (!on) return; drag = true; if (canvas && canvas.requestPointerLock && !document.pointerLockElement) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (err) {} } });
  addEventListener('pointerup', () => { drag = false; });
  addEventListener('mousemove', e => { if (!on || !(document.pointerLockElement || drag)) return; yaw -= (e.movementX || 0) * 0.0023; pitch = clamp(pitch - (e.movementY || 0) * 0.0023, -1.45, 1.45); });
  G.walk = step;
  return { get on() { return on; }, enter, leave };
})();
