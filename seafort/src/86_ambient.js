'use strict';
// ---- tour: the sound of the place, synthesised in the page (Web Audio; no file, no music). Sea wash, wind, gulls, rain, thunder.
//      It starts on the first click, tap or key (browsers allow sound only after a gesture); M mutes. Rain follows the same
//      envelope as the picture (the environment clock G.tEnv); every bolt orders its thunder, late by the distance (343 m/s) ----
const Ambient = (() => {
  if (!G.tour) return null;
  let ac = null, master, rainHi, rainLo, windLo, windHi, windF, noise, lastTick = 0, muted = false, birdTimer = 0, rainK = 0;
  const snd = document.getElementById('snd');
  const pill = (txt, hide) => { if (!snd) return; snd.style.display = ''; snd.textContent = txt; snd.style.opacity = 1; if (hide) setTimeout(() => { snd.style.opacity = 0; }, hide); };
  const src = () => { const s = ac.createBufferSource(); s.buffer = noise; s.loop = true; s.loopStart = Math.random() * 2; s.start(0, Math.random() * 3); return s; };
  const filt = (type, f, q) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; };
  const gain = v => { const g = ac.createGain(); g.gain.value = v; return g; };
  const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
  const lfo = (hz, depth, target) => { const o = ac.createOscillator(); o.frequency.value = hz; const g = gain(depth); o.connect(g); g.connect(target); o.start(); };
  function start() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ac = new AC(); } catch (e) { ac = null; return; }
    master = gain(0); master.connect(ac.destination); master.gain.setTargetAtTime(0.9, ac.currentTime, 0.8);
    const n = ac.sampleRate * 5; noise = ac.createBuffer(1, n, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    // the sea: a low body that breathes every nine seconds, a wash that runs up and hisses back on its own slower beat, and a far rumble
    { const g = gain(0.16); chain(src(), filt('lowpass', 420, 0.4), g, master); lfo(0.11, 0.07, g.gain); lfo(0.043, 0.035, g.gain); }
    { const g = gain(0.045), bp = filt('bandpass', 1500, 0.6); chain(src(), bp, g, master); lfo(0.083, 0.04, g.gain); lfo(0.083, 500, bp.frequency); }
    { const g = gain(0.10); chain(src(), filt('lowpass', 110, 0.7), g, master); lfo(0.031, 0.04, g.gain); }
    // rain: the hiss of it on the water and the body of it on roofs; both silent until the picture rains
    rainHi = gain(0); chain(src(), filt('highpass', 2600), filt('lowpass', 9500), rainHi, master);
    rainLo = gain(0); chain(src(), filt('bandpass', 650, 0.5), rainLo, master);
    // wind: a hollow moan whose pitch wanders, and a thin whistle in the rigging that only the gusts bring out
    windF = filt('bandpass', 330, 1.1); windLo = gain(0.03); chain(src(), windF, windLo, master); lfo(0.07, 90, windF.frequency); lfo(0.19, 40, windF.frequency);
    { const bp = filt('bandpass', 1150, 5); windHi = gain(0); chain(src(), bp, windHi, master); lfo(0.23, 180, bp.frequency); }
    birds(); pill('sound on', 1400);
  }
  // a gull: two to five cries, each a reedy note that jumps up and falls away; every bird a little different, somewhere across the frame
  function gull() {
    const t0 = ac.currentTime + 0.05, n = 2 + (Math.random() * 4 | 0), f0 = 1250 + 700 * Math.random(), vol = (0.035 + 0.07 * Math.random()) * (1 - 0.6 * rainK);
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : gain(1); if (pan.pan) pan.pan.value = Math.random() * 1.6 - 0.8; const bp = filt('bandpass', f0 * 1.4, 1.2); chain(bp, pan, master);
    for (let i = 0; i < n; i++) { const t = t0 + i * (0.30 + 0.12 * Math.random()), len = 0.20 + 0.14 * Math.random(), o = ac.createOscillator(), o2 = ac.createOscillator(), g = gain(0);
      o.type = 'sawtooth'; o2.type = 'square'; const k = 1 - i * 0.03;
      for (const [x, m] of [[o, 1], [o2, 2.01]]) { x.frequency.setValueAtTime(f0 * 0.82 * m * k, t); x.frequency.linearRampToValueAtTime(f0 * 1.22 * m * k, t + len * 0.25); x.frequency.exponentialRampToValueAtTime(f0 * 0.78 * m * k, t + len); x.connect(g); x.start(t); x.stop(t + len + 0.05); }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.setValueAtTime(vol, t + len * 0.5); g.gain.exponentialRampToValueAtTime(0.0005, t + len); g.connect(bp); }
  }
  function birds() { clearTimeout(birdTimer); birdTimer = setTimeout(() => { if (ac && ac.state === 'running' && !muted && performance.now() - lastTick < 500) gull(); birds(); }, 1400 + Math.random() * 5200); }
  // thunder: a crack if it is near, then the roll: low noise whose brightness falls away while it rumbles on for six to nine seconds
  function thunder(dist) {
    if (!ac || ac.state !== 'running') return;
    const t = ac.currentTime + dist / 343, near = clamp(1.4 - dist / 800, 0.25, 1), len = 6 + 3 * Math.random();
    { const s = src(), lp = filt('lowpass', 900, 0.3), g = gain(0); chain(s, lp, g, master); lp.frequency.setValueAtTime(1100, t); lp.frequency.exponentialRampToValueAtTime(70, t + len);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.85 * near, t + 0.06); g.gain.exponentialRampToValueAtTime(0.25 * near, t + 0.7); g.gain.linearRampToValueAtTime(0.38 * near, t + 1.3 + Math.random()); g.gain.exponentialRampToValueAtTime(0.001, t + len); s.stop(t + len + 0.2); }
    { const s = src(), hp = filt('highpass', 1400), g = gain(0); chain(s, hp, g, master); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.30 * near * near, t + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45); s.stop(t + 0.6); }
  }
  function update() { lastTick = performance.now(); if (!ac) return; const te = G.tEnv === undefined ? G.t : G.tEnv;
    rainK = sm(31.2, 34.5, te) * (1 - sm(67.55, 68.5, te)); const now = ac.currentTime; rainHi.gain.setTargetAtTime(0.20 * rainK, now, 0.6); rainLo.gain.setTargetAtTime(0.11 * rainK, now, 0.6);
    // the wind rises before the rain and holds through the storm; gusts come and go on beats that never line up
    const ta = G.tAbs || 0, storm = sm(22, 33, te) * (1 - sm(68, 76, te)), gust = Math.pow(0.5 + 0.5 * Math.sin(ta * 0.31 + 1.7 * Math.sin(ta * 0.073)), 2) * (0.6 + 0.4 * Math.sin(ta * 0.83 + 2));
    windLo.gain.setTargetAtTime((0.035 + 0.075 * storm) * (0.45 + 0.9 * gust), now, 0.5); windHi.gain.setTargetAtTime((0.004 + 0.022 * storm) * gust * gust, now, 0.4); }
  G.tick.push(update);
  setInterval(() => { if (ac && master) master.gain.setTargetAtTime(muted || performance.now() - lastTick > 500 ? 0 : 0.9, ac.currentTime, 0.25); }, 250);     // a held frame is silent
  addEventListener('pointerdown', start); addEventListener('keydown', e => { if (e.code === 'KeyM') { if (!ac) start(); else { muted = !muted; pill(muted ? 'sound off' : 'sound on', 1200); } } else if (!ac && e.key !== ' ') start(); });
  setTimeout(() => { if (!ac) pill('click for sound'); }, 0);
  return { start, thunder };
})();
