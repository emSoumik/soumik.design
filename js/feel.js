// Feel: the site's sound, synthesized live, plus haptics. no audio files, no deps.
//
// Everything plays in one key, D major pentatonic, so whatever a visitor does, in whatever order, it lands
// as music. Planting walks a little melody instead of picking random notes; a growing flower winds up a
// music-box run as it stitches in; its sparkles answer with a glint an octave up; buttons tick-tock;
// mochi mews; the bee hums on the fifth; a butterfly takes off with a flutter and a harp flick; clearing
// the garden rakes back down the scale. All of it shares one small room reverb so it sits together.
//
// audio unlocks on the first pointerdown/keydown; before that every call is a silent no-op.
// mute state persists in localStorage ('feel:muted') and silences both sound and haptics.

const KEY = 'feel:muted';
const AC = window.AudioContext || window.webkitAudioContext;

// D major pentatonic. degree 0 is D5; negative degrees go down, 5 is D6
const PENTA = [0, 2, 4, 7, 9];
const ROOT = 74;
const hz = m => 440 * 2 ** ((m - 69) / 12);
const deg = i => hz(ROOT + PENTA[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5));
const MAX_VOICES = 18;

let ctx = null, master = null, verb = null, noise = null;
let muted = false;
let voices = 0;
let lastHaptic = 0;
let hapticLabel = null;
// the melody: where it is, how many notes into the phrase, and the music-box run of the flower growing now
let pos = 0, phrase = 0, run = 0, runBase = 0, lastRun = 0;
let tock = 0, lastTap = 0;
const listeners = new Set();

try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

function unlock() {
  try {
    if (!ctx && AC) {
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
      comp.connect(ctx.destination);
      master = ctx.createGain();
      master.gain.value = .55;
      master.connect(comp);
      // a small, soft room: decaying stereo noise as the impulse, darkened so it never hisses
      const len = Math.floor(ctx.sampleRate * 1.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / len * 5.5);
      }
      const conv = ctx.createConvolver();
      conv.buffer = ir;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass'; tone.frequency.value = 3200;
      verb = ctx.createGain();
      verb.gain.value = .28;
      verb.connect(conv); conv.connect(tone); tone.connect(master);
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .5), ctx.sampleRate);
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

// one voice: an envelope, a place in the stereo field, and a send to the room. busy moments drop voices, never glitch
function voice(t, peak, dur, { attack = .003, pan = 0, wet = 1 } = {}) {
  if (voices >= MAX_VOICES) return null;
  voices++;
  setTimeout(() => voices--, (t - ctx.currentTime + dur) * 1000 + 60);
  const g = ctx.createGain();
  g.gain.setValueAtTime(.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  let out = g;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); out = p; }
  out.connect(master);
  if (wet) { const s = ctx.createGain(); s.gain.value = wet; out.connect(s); s.connect(verb); }
  return g;
}

function osc(type, freq, t, dur, out) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.connect(out);
  o.start(t);
  o.stop(t + dur + .02);
  return o;
}

function hiss(t, dur, peak, type, freq, q, o = {}) {
  const g = voice(t, peak, dur, { attack: o.attack ?? .002, pan: o.pan, wet: o.wet ?? .3 });
  if (!g) return null;
  const s = ctx.createBufferSource();
  s.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  s.connect(f); f.connect(g);
  s.start(t, Math.random() * .3, dur + .02);
  return f;
}

// a kalimba tine: FM, with a bright attack that mellows as it rings
function tine(t, f, vol, o = {}) {
  const dur = o.dur ?? 1.1;
  const g = voice(t, vol, dur, o);
  if (!g) return;
  const car = osc('sine', f, t, dur, g);
  const mod = ctx.createOscillator();
  mod.frequency.value = f * (o.ratio ?? 3.0);
  const idx = ctx.createGain();
  idx.gain.setValueAtTime(f * (o.bright ?? 1.4), t);
  idx.gain.exponentialRampToValueAtTime(f * .01, t + .14);
  mod.connect(idx); idx.connect(car.frequency);
  mod.start(t); mod.stop(t + dur + .02);
}

// a music-box bell: inharmonic, glassy, short
function bell(t, f, vol, o = {}) {
  const dur = o.dur ?? .55;
  const g = voice(t, vol, dur, o);
  if (!g) return;
  osc('sine', f, t, dur, g);
  const h = ctx.createGain(); h.gain.value = .22; h.connect(g);
  osc('sine', f * 2.76, t, dur * .5, h);
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

// the next note of the planting melody: mostly steps, some skips, the odd leap, drawn back towards the middle,
// and every eighth note comes home to D
function nextNote() {
  phrase++;
  if (phrase % 8 === 0) { pos = Math.random() < .5 ? 0 : 5; return pos; }
  const r = Math.random();
  let step = r < .5 ? 1 : r < .82 ? 2 : 3;
  if (Math.random() < .5 + (pos - 3) * .12) step = -step;
  pos = Math.max(-2, Math.min(8, pos + step));
  return pos;
}

// where on screen something is, as stereo pan
const panX = x => x == null ? 0 : (x / Math.max(1, innerWidth) - .5) * 1.2;

export const feel = {
  // buttons and links: a soft wooden tick-tock, two notes a fifth apart, alternating while you click around
  tap() {
    sound((t) => {
      const now = performance.now();
      tock = now - lastTap < 900 ? tock + 1 : 0;
      lastTap = now;
      const f = tock % 2 ? deg(9) : deg(5);
      const g = voice(t, .07, .07, { wet: .25 });
      if (g) { const o = osc('sine', f, t, .07, g); o.frequency.exponentialRampToValueAtTime(f * .72, t + .045); }
      hiss(t, .012, .025, 'bandpass', 3800, 1.4, { wet: 0 });
    });
    haptic(8);
  },
  // a flower is planted: the melody's next note on a kalimba, with a quiet third underneath now and then
  plant(n = 1, x) {
    sound((t) => {
      const i = nextNote(), pan = panX(x);
      tine(t, deg(i), .15, { pan });
      if (phrase % 4 === 0 || phrase % 8 === 0) tine(t + .012, deg(i - 2), .05, { pan, bright: .8 });
      for (let k = 1; k < n; k++) tine(t + k * .08, deg(i + k), .08, { pan });
      run = 0; runBase = i + 3;
    });
    haptic(n > 1 ? [10, 40, 6] : 10);
  },
  // while a flower stitches in: a tiny music-box run climbing from the note it was planted on
  stitch() {
    const now = performance.now();
    if (now - lastRun < 70 || run >= 6) return;
    lastRun = now;
    sound((t) => bell(t, deg(runBase + run++), .022 - run * .002, { dur: .3, wet: .6 }));
  },
  // its sparkles: a glint an octave up
  sparkle(x) {
    sound((t) => bell(t, deg(pos + 7 + (Math.random() < .5 ? 0 : 2)), .03, { dur: .7, pan: panX(x), wet: 1 }));
  },
  // mochi's bubble opens: a bloop up an octave
  pop() {
    sound((t) => {
      const g = voice(t, .09, .16, { attack: .006, pan: .5, wet: .4 });
      if (g) { const o = osc('sine', deg(0), t, .16, g); o.frequency.exponentialRampToValueAtTime(deg(5), t + .08); }
      bell(t + .07, deg(7), .025, { dur: .4, pan: .5 });
    });
    haptic(6);
  },
  close() {
    sound((t) => {
      const g = voice(t, .045, .12, { attack: .005, pan: .5, wet: .3 });
      if (g) { const o = osc('sine', deg(5), t, .12, g); o.frequency.exponentialRampToValueAtTime(deg(0), t + .09); }
    });
  },
  // poking mochi: a little chirpy mew, nasal and bendy
  mew() {
    sound((t) => {
      const dur = .26, g = voice(t, .06, dur, { attack: .02, pan: .55, wet: .35 });
      if (!g) return;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 2.2; bp.connect(g);
      const o = osc('triangle', 560, t, dur, bp);
      o.frequency.exponentialRampToValueAtTime(880, t + .07);
      o.frequency.exponentialRampToValueAtTime(660, t + dur);
      const v = ctx.createGain(); v.gain.value = 14; v.connect(o.frequency);
      osc('sine', 18, t, dur, v);
    });
    haptic(8);
  },
  swipe(dir = 1) {
    sound((t) => {
      const f = hiss(t, .12, .05, 'bandpass', dir > 0 ? 600 : 2200, .8);
      f?.frequency.exponentialRampToValueAtTime(dir > 0 ? 2200 : 600, t + .12);
    });
    haptic(5);
  },
  // the bee, tapped: a wingbeat hum on A, the fifth, that swoops up and settles
  buzz() {
    sound((t) => {
      const dur = .42;
      const g = voice(t, .07, dur, { attack: .02, wet: .2 });
      if (!g) return;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 2;
      lp.connect(g);
      // wings: the tone flutters ~34 times a second
      const am = ctx.createGain(); am.gain.value = .55; am.connect(lp);
      const lfo = osc('sine', 34, t, dur, am.gain);
      lfo.connect(am.gain);
      const o = osc('sawtooth', hz(57), t, dur, am);
      o.frequency.linearRampToValueAtTime(hz(59), t + dur * .35);
      o.frequency.linearRampToValueAtTime(hz(57), t + dur);
    });
    haptic([14, 24, 12, 24, 16]);
  },
  // a butterfly startled into the air: soft wingbeats speeding off, and a quick harp flick upwards
  flutter(x) {
    sound((t) => {
      const pan = panX(x);
      for (let k = 0; k < 6; k++) hiss(t + k * .034, .028, .05 * (1 - k * .14), 'bandpass', 1500 + k * 260, 1.6, { pan: pan + k * .04, wet: .2 });
      const base = 5 + Math.floor(Math.random() * 3);
      [0, 1, 2, 4].forEach((s, k) => tine(t + .02 + k * .045, deg(base + s), .05 - k * .007, { pan, dur: .6, bright: .9 }));
    });
    haptic([6, 30, 6]);
  },
  // clearing the garden: a rake of soil and a run back down the scale, landing on D
  clear() {
    sound((t) => {
      const f = hiss(t, .45, .05, 'lowpass', 4200, .7, { attack: .04, wet: .3 });
      f?.frequency.exponentialRampToValueAtTime(500, t + .45);
      [9, 8, 7, 5, 4, 2, 0].forEach((d, k) => tine(t + .05 + k * .05, deg(d), .07 - k * .006, { dur: k === 6 ? 1.4 : .8, pan: .5 - k * .15 }));
      pos = 0; phrase = 0;
    });
    haptic([12, 40, 8]);
  },
  // sound back on: a little hello
  hello() {
    sound((t) => [0, 2, 4].forEach((s, k) => tine(t + k * .07, deg(s + 2), .07, { dur: .8 })));
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
