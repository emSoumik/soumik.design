// Feel: tiny synthesized sounds and haptics. no audio files, no deps.
// audio unlocks on the first pointerdown/keydown; before that every call is a silent no-op.
// mute state persists in localStorage ('feel:muted') and silences both sound and haptics.

const KEY = 'feel:muted';
const AC = window.AudioContext || window.webkitAudioContext;
// c major pentatonic, two octaves (hz)
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];

let ctx = null;
let master = null;
let noise = null;
let muted = false;
let lastNote = -1;
let lastStitch = 0;
let lastHaptic = 0;
let hapticLabel = null;
const listeners = new Set();

try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

function unlock() {
  try {
    if (!ctx && AC) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(ctx.destination);
      // one reusable noise buffer
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx && ctx.state !== 'running') ctx.resume();
  } catch (e) {}
}
['pointerdown', 'keydown'].forEach((t) =>
  window.addEventListener(t, unlock, { capture: true, passive: true }));

// run a sound fn only when audio is ready and not muted
function sound(fn) {
  if (muted || !ctx) return;
  try { fn(ctx.currentTime); } catch (e) {}
}

// gain envelope: short attack, exponential decay
function env(t, peak, dur, attack = 0.003) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(master);
  return g;
}

function osc(type, freq, t, dur, out) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
  return o;
}

function burst(t, dur, peak, type, freq, q) {
  const s = ctx.createBufferSource();
  s.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  s.connect(f);
  f.connect(env(t, peak, dur));
  s.start(t, Math.random() * 0.1, dur + 0.02);
  return f;
}

function haptic(pattern) {
  // browsers only allow haptics after the visitor has touched the page
  if (muted || navigator.userActivation?.hasBeenActive === false) return;
  const vibrate = typeof navigator.vibrate === 'function';
  // ios only buzzes inside the tap itself; skip calls from timers so the switch isn't flipped for nothing
  if (!vibrate && navigator.userActivation && !navigator.userActivation.isActive) return;
  const now = performance.now();
  if (now - lastHaptic < 30) return;
  lastHaptic = now;
  try {
    if (vibrate) {
      navigator.vibrate(pattern);
    } else {
      // ios 18+: toggling a switch checkbox inside a gesture fires a system haptic. the label is
      // display:none, so it never covers anything, never takes focus and can't get in the way of scrolling
      if (!hapticLabel) {
        hapticLabel = document.createElement('label');
        hapticLabel.setAttribute('aria-hidden', 'true');
        hapticLabel.style.display = 'none';
        hapticLabel.innerHTML = '<input type="checkbox" switch tabindex="-1">';
        document.body.appendChild(hapticLabel);
      }
      hapticLabel.click();
    }
  } catch (e) {}
}

function pluck(t, freq, vol) {
  const g = env(t, vol, 0.35, 0.003);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 4200;
  lp.connect(g);
  const a = ctx.createGain();
  a.gain.value = 1;
  a.connect(lp);
  const b = ctx.createGain();
  b.gain.value = 0.3;
  b.connect(lp);
  osc('triangle', freq, t, 0.35, a);
  osc('sine', freq * 2.01, t, 0.35, b);
  burst(t, 0.012, vol * 0.35, 'bandpass', freq * 3, 1);
}

function glide(t, from, to, vol) {
  const g = env(t, vol, 0.11, 0.005);
  const o = osc('sine', from, t, 0.11, g);
  o.frequency.exponentialRampToValueAtTime(to, t + 0.09);
}

export const feel = {
  tap() {
    sound((t) => {
      burst(t, 0.025, 0.06, 'bandpass', 2400, 1.2);
      osc('sine', 1800, t, 0.02, env(t, 0.03, 0.02, 0.002));
    });
    haptic(8);
  },
  plant(n = 1) {
    sound((t) => {
      let i;
      do { i = Math.floor(Math.random() * SCALE.length); } while (i === lastNote);
      lastNote = i;
      pluck(t, SCALE[i], 0.16);
      // tiny ascending arpeggio, quieter
      for (let k = 1; k < n; k++) {
        pluck(t + k * 0.07, SCALE[Math.min(i + k, SCALE.length - 1)], 0.1);
      }
    });
    haptic(n > 1 ? [10, 40, 6] : 10);
  },
  stitch() {
    const now = performance.now();
    if (now - lastStitch < 45) return;
    lastStitch = now;
    sound((t) => osc('sine', 3000 + Math.random() * 1000, t, 0.012, env(t, 0.02, 0.012, 0.002)));
  },
  pop() {
    sound((t) => glide(t, 380, 720, 0.12));
    haptic(6);
  },
  close() {
    sound((t) => glide(t, 720, 380, 0.07));
  },
  swipe(dir = 1) {
    sound((t) => {
      const f = burst(t, 0.12, 0.05, 'bandpass', dir > 0 ? 600 : 2200, 0.8);
      f.frequency.setValueAtTime(dir > 0 ? 600 : 2200, t);
      f.frequency.exponentialRampToValueAtTime(dir > 0 ? 2200 : 600, t + 0.12);
    });
    haptic(5);
  },
  // the bee, tapped: a short wingbeat buzz that swoops up and settles
  buzz() {
    sound((t) => {
      const dur = 0.42;
      const g = env(t, 0.07, dur, 0.02);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 2;
      lp.connect(g);
      // wings: the tone flutters ~34 times a second
      const am = ctx.createGain(); am.gain.value = 0.55; am.connect(lp);
      const lfo = osc('sine', 34, t, dur, am.gain);
      lfo.connect(am.gain);
      const o = osc('sawtooth', 190, t, dur, am);
      o.frequency.linearRampToValueAtTime(245, t + dur * 0.35);
      o.frequency.linearRampToValueAtTime(205, t + dur);
    });
    haptic([14, 24, 12, 24, 16]);
  },
  get muted() { return muted; },
  set muted(v) {
    v = !!v;
    if (v === muted) return;
    muted = v;
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {}
    listeners.forEach((fn) => { try { fn(muted); } catch (e) {} });
  },
  onMute(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
