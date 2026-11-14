// Feel: the site's sound, synthesized live, plus haptics. no audio files, no deps.
//
// Everything plays in one key, D major pentatonic, so whatever a visitor does, in whatever order, it lands
// as music. Planting walks a little melody, and each flower family has its own instrument in the same key
// (kalimba, glass, wood, music box), with a fingertip tick and a soft thump of soil under every note. A
// growing flower plucks its way up the stem, rings its petals in and resolves into a small bloom; a slow
// harmony moves under it all, a step every eight plants. Ornaments (the growth, sparkles, blooms) land on a
// soft grid, so fast tapping grooves instead of smearing. buttons tick-tock; mochi mews; the bee hums on the
// fifth; a butterfly takes off with a harp flick; clearing rakes back down the scale. One small room holds
// it all, with a quiet echo that only the sparkles and blooms use.
//
// audio unlocks on the first pointerdown/keydown; before that every call is a silent no-op.
// mute state persists in localStorage ('feel:muted') and silences both sound and haptics.
// away (another tab, another window, the page hidden) everything goes quiet until the page is back.
// feel.mood(0..1) darkens the whole mix a little as the light goes (the night prototype drives it; 0 by default).

const KEY = 'feel:muted';
const AC = window.AudioContext || window.webkitAudioContext;
const DEV = import.meta.env.DEV;

// D major pentatonic. degree 0 is D5; negative degrees go down, 5 is D6
const PENTA = [0, 2, 4, 7, 9];
const ROOT = 74;
const hz = m => 440 * 2 ** ((m - 69) / 12);
const mid = i => ROOT + PENTA[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5);
const deg = i => hz(mid(i));
const cents = c => 2 ** (c / 1200);
// a little either way of 1, so no two notes are quite the same
const jit = k => 1 + (Math.random() * 2 - 1) * k;
// every voice counts; ornaments stop short of the cap so a plant always has room
const MAX_VOICES = 30, ORN_VOICES = 22;
// the soft grid ornaments fall on (s), and how far ahead one may wait for its slot
const GRID = .118, HALF = GRID / 2, LOOK = .06;

// the slow harmony: D, B minor, G, A sus, one step every eight plants. pitch classes above D, all in the scale
// (G has no G in it: its third, fifth and ninth). bass is the phrase mark's note
const CHORDS = [
  { bass: 50, pcs: [0, 4, 7] },
  { bass: 47, pcs: [9, 0, 4] },
  { bass: 43, pcs: [9, 0, 7] },
  { bass: 45, pcs: [7, 0, 2] },
];
const pcOf = m => ((m - 62) % 12 + 12) % 12;
// the nearest chord tone at least a third under m, for the quiet under-note
const under = (m, ch) => { for (let n = m - 3; n > m - 15; n--) if (ch.pcs.includes(pcOf(n))) return n; return m - 12; };
// the chord's own note at or just above m
const upTo = (m, p) => { for (let n = m; n < m + 12; n++) if (pcOf(n) === p) return n; return m; };
// the next chord tone above m
const nextUp = (m, ch) => { for (let n = m + 1; n < m + 13; n++) if (ch.pcs.includes(pcOf(n))) return n; return m + 12; };

// which instrument each flower family plays: warm ones on the kalimba, blues and violets on glass, the red
// and pink cups on wood, the small and the lily on a music box. anything else falls back to the kalimba
const VOICE = {
  sunflower: 'kalimba', daffodil: 'kalimba', daisy: 'kalimba',
  forget: 'glass', bluebell: 'glass', lavender: 'glass', iris: 'glass', pansy: 'glass', allium: 'glass',
  rose: 'wood', poppy: 'wood', cosmos: 'wood', tulip: 'wood',
  lily: 'box', mini: 'box', blossom: 'box',
};

let ctx = null, master = null, verb = null, echo = null, noise = null, tone = null, moodLp = null, meterNode = null;
let muted = false;
let voices = 0;
let lastHaptic = 0;
let hapticLabel = null;
// the melody: where it is, how many notes into the phrase, the harmony, and the run of a flower growing now
let pos = 0, phrase = 0, chord = 0, run = 0, runBase = 0, lastRun = 0;
let tock = 0, lastTap = 0;
// the grid: where its beat starts (ctx s), when anything last used it, the last stitch slot and bloom
let grid0 = 0, lastOrn = -9, lastStitch = -9, lastBloom = -9, lastPlant = -9;
// how loud a new voice may be, from how many events started in the last 200 ms
let lvl = 1;
const recent = [];
// flowers growing now, by id: the note they were planted on, their family, and how far their run has got
const grows = new Map();
// the first note after the context starts is scheduled a hair ahead, so ios doesn't clip it
let warm = false, waiting = 0, resuming = null;
let moodV = 0;
const listeners = new Set();
// away: the page isn't the one in front, so nothing sounds (anything else making sound listens via onAway)
let away = typeof document !== 'undefined' && (document.hidden || !document.hasFocus());
const awayFns = new Set();
function setAway(v) {
  if (v === away) return;
  away = v;
  try { if (ctx) { if (v) ctx.suspend(); else ctx.resume(); } } catch (e) {}
  awayFns.forEach((fn) => { try { fn(away); } catch (e) {} });
}
const checkAway = () => setAway(document.hidden || !document.hasFocus());
document.addEventListener('visibilitychange', checkAway);
window.addEventListener('blur', checkAway);
window.addEventListener('focus', checkAway);
window.addEventListener('pagehide', () => setAway(true));
window.addEventListener('pageshow', checkAway);

try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

// a room's impulse: a short pre-delay, a few early reflections (different each side), then a noise tail that
// decays and darkens as it goes (a one-pole lowpass closing along it), so the highs die before the lows and it
// never hisses or rings metallic. dark = how far the lowpass closes by the end (1 = not at all)
export function impulse(ac, { secs = 1.3, pre = .018, decay = 6.5, bright = .8, dark = .12, early = 6 } = {}) {
  const sr = ac.sampleRate, len = Math.floor(sr * secs), ir = ac.createBuffer(2, len, sr), p0 = Math.floor(pre * sr);
  const k = Math.log(dark / bright);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let e = 0; e < early; e++) {
      const i = p0 + Math.floor(sr * (.003 + Math.random() * .055));
      const a = (Math.random() < .5 ? -1 : 1) * (.55 - e * .06);
      if (i + 1 < len) { d[i] += a; d[i + 1] += a * .5; }
    }
    let y = 0;
    const t0 = p0 + Math.floor(sr * .006), fade = sr * .025, n = len - p0;
    // the lowpass coefficient and the envelope as running products, not an exp per sample (same curves)
    const ka = Math.exp(k / n), kd = Math.exp(-decay / n);
    let a = bright * Math.exp(k * (t0 - p0) / n), env = Math.exp(-decay * (t0 - p0) / n);
    for (let i = t0; i < len; i++) {
      y += a * ((Math.random() * 2 - 1) - y);
      d[i] += y * env * Math.min(1, (i - t0) / fade) * .6;
      a *= ka; env *= kd;
    }
  }
  return ir;
}

function unlock() {
  // a press means the page is in front, whatever focus said
  if (away && !document.hidden) setAway(false);
  try {
    if (!ctx && AC) {
      ctx = new AC();
      // master: a gentle shelf off the top, then a limiter-style compressor (fast, high ratio) that only
      // catches peaks. the compressor's own makeup gain lifts everything ~4.5 dB and caps 0 dBFS in at ~-3 out
      const shelf = ctx.createBiquadFilter();
      shelf.type = 'highshelf'; shelf.frequency.value = 7000; shelf.gain.value = -2;
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -8; lim.knee.value = 3; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .15;
      shelf.connect(lim);
      // dev only: a meter at the very end, read by feel.meter()
      if (DEV && ctx.createAnalyser) { meterNode = ctx.createAnalyser(); meterNode.fftSize = 2048; lim.connect(meterNode); meterNode.connect(ctx.destination); }
      else lim.connect(ctx.destination);
      tone = shelf;
      master = ctx.createGain();
      master.gain.value = .7;
      master.connect(shelf);
      // the room
      // its impulse is built once the tap is handled, so the first press never waits on it (dry until then)
      const conv = ctx.createConvolver();
      const fill = () => { try { conv.buffer = impulse(ctx); } catch (e) {} };
      if ('requestIdleCallback' in window) requestIdleCallback(fill, { timeout: 400 }); else setTimeout(fill, 60);
      verb = ctx.createGain();
      verb.gain.value = .28;
      verb.connect(conv); conv.connect(master);
      // the echo: three grid steps long, dark, a couple of repeats; only sparkles and blooms send to it
      const dl = ctx.createDelay(1), lp = ctx.createBiquadFilter(), fb = ctx.createGain(), ret = ctx.createGain();
      dl.delayTime.value = GRID * 3; lp.type = 'lowpass'; lp.frequency.value = 1800; fb.gain.value = .22; ret.gain.value = .5;
      echo = ctx.createGain();
      echo.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(ret); ret.connect(master);
      const rs = ctx.createGain(); rs.gain.value = .3; lp.connect(rs); rs.connect(verb);
      if (moodV > 0) applyMood();
      if (DEV) startMeter();
    }
    if (ctx && ctx.state !== 'running' && !away) ctx.resume();
  } catch (e) {}
}
['pointerdown', 'keydown'].forEach((t) =>
  window.addEventListener(t, unlock, { capture: true, passive: true }));

// how many events started in the last 200 ms sets how loud the next voice may be (1/sqrt(n)), so a flurry
// of taps stays the same loudness instead of piling up. w: whether this one counts as an event
function weigh(w) {
  const now = ctx.currentTime;
  while (recent.length && now - recent[0] > .2) recent.shift();
  if (w) recent.push(now);
  lvl = 1 / Math.sqrt(Math.max(1, recent.length));
}

// run a sound fn only when audio is ready and not muted. a context still starting (the very first tap) waits
// for it, then plays a few tens of ms ahead so the attack isn't lost
function sound(fn, w = 0) {
  if (muted || away || !ctx) return;
  if (ctx.state !== 'running') {
    if (waiting >= 4) return;
    waiting++;
    resuming = resuming || ctx.resume();
    resuming.then(() => {
      waiting--; resuming = null;
      if (muted || away || !ctx || ctx.state !== 'running') return;
      warm = true;
      try { weigh(w); fn(ctx.currentTime + .04); } catch (e) {}
    }, () => { waiting--; resuming = null; });
    return;
  }
  let t = ctx.currentTime;
  if (!warm) { warm = true; t += .03; }
  try { weigh(w); fn(t); } catch (e) {}
}

// one voice: an envelope, a place in the stereo field, a send to the room (and the echo, if asked). busy
// moments drop voices, never glitch; everything is disconnected once it has rung out
function voice(t, peak, dur, { attack = .003, pan = 0, wet = 1, echo: ech = 0, orn = false } = {}) {
  if (voices >= (orn ? ORN_VOICES : MAX_VOICES)) return null;
  voices++;
  const g = ctx.createGain(), own = [g];
  g.gain.setValueAtTime(.0001, t);
  g.gain.linearRampToValueAtTime(Math.max(.0002, peak * lvl), t + attack);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  let out = g;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); out = p; own.push(p); }
  out.connect(master);
  if (wet) { const s = ctx.createGain(); s.gain.value = wet; out.connect(s); s.connect(verb); own.push(s); }
  if (ech) { const s = ctx.createGain(); s.gain.value = ech; out.connect(s); s.connect(echo); own.push(s); }
  g.own = own;
  setTimeout(() => { voices--; own.forEach((n) => { try { n.disconnect(); } catch (e) {} }); }, (t - ctx.currentTime + dur) * 1000 + 80);
  return g;
}
// a node that belongs to a voice, so it's let go with it
const keep = (g, n) => { g.own.push(n); return n; };
function gain(g, v) { const n = keep(g, ctx.createGain()); n.gain.value = v; return n; }

function osc(type, freq, t, dur, out) {
  const o = ctx.createOscillator();
  o.type = type;
  // held to nyquist, where the browser clamps it anyway (no out-of-range warnings)
  o.frequency.setValueAtTime(Math.min(freq, ctx.sampleRate / 2), t);
  if (out) o.connect(out);
  o.start(t);
  o.stop(t + dur + .02);
  o.onended = () => { try { o.disconnect(); } catch (e) {} };
  return o;
}

// a second of white noise, made the first time something hisses
function makeNoise() {
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function hiss(t, dur, peak, type, freq, q, o = {}) {
  const g = voice(t, peak, dur, { attack: o.attack ?? .002, pan: o.pan, wet: o.wet ?? .3, echo: o.echo, orn: o.orn });
  if (!g) return null;
  const s = ctx.createBufferSource();
  s.buffer = noise ||= makeNoise();
  const f = keep(g, ctx.createBiquadFilter());
  f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  s.connect(f); f.connect(g);
  s.start(t, Math.random() * .5, dur + .02);
  s.onended = () => { try { s.disconnect(); } catch (e) {} };
  return f;
}

// two carriers a few cents apart, so the note breathes rather than beeps
function pair(g, f, t, dur, spread, type = 'sine') {
  const h = gain(g, .5);
  h.connect(g);
  return [osc(type, f * cents(-spread), t, dur, h), osc(type, f * cents(spread), t, dur, h)];
}
// a partial over the fundamental that dies away faster than it
function partial(g, f, t, dur, k) {
  const h = gain(g, 0);
  h.gain.setValueAtTime(k, t);
  h.gain.exponentialRampToValueAtTime(.0005, t + dur);
  h.connect(g);
  osc('sine', f, t, dur, h);
}
// a moment of fm on the attack: the strike, mellowing as it rings
function strike(g, cars, f, t, ratio, from, len) {
  const idx = gain(g, 0);
  idx.gain.setValueAtTime(f * from, t);
  idx.gain.exponentialRampToValueAtTime(f * .01, t + len);
  idx.gain.exponentialRampToValueAtTime(f * .0005, t + len + .1);
  osc('sine', f * ratio, t, len + .12, idx);
  cars.forEach((c) => idx.connect(c.frequency));
}

// the instruments. each takes (t, f, vol, { dur, pan, wet, echo, orn, bright }); they're matched by ear-proxy:
// the same peak once trimmed, the same kind of brightness on the attack, only their bodies and decays differ
// a kalimba tine: fm, bright on the pluck, warm as it rings
function kalimba(t, f, vol, o = {}) {
  const dur = (o.dur ?? 1.1) * jit(.1);
  const g = voice(t, vol, dur, o);
  if (!g) return;
  const cars = pair(g, f, t, dur, 3);
  strike(g, cars, f, t, 3, (o.bright ?? 1.3) * jit(.15), .12 + Math.random() * .04);
}
// glass, like a celesta's bar: a clean ring with a quick shimmer two octaves up
function glass(t, f, vol, o = {}) {
  const dur = (o.dur ?? 1.4) * jit(.1);
  const g = voice(t, vol * .9, dur, o);
  if (!g) return;
  const cars = pair(g, f, t, dur, 2);
  partial(g, f * (f > 1400 ? 2 : 4), t, dur * .22, .16 * jit(.2) * (o.bright ?? 1));
  strike(g, cars, f, t, 1, .5 * jit(.2), .05);
}
// wood, a soft marimba: a short warm bar with a mallet's knock two octaves up that's gone at once
function wood(t, f, vol, o = {}) {
  const dur = (o.dur ?? .6) * .8 * jit(.1);
  const g = voice(t, vol * 1.15, dur, { ...o, attack: .004 });
  if (!g) return;
  const cars = pair(g, f, t, dur, 1.5);
  // the bar settles onto its pitch as the mallet leaves it (each carrier keeps its own few cents)
  cars.forEach((c, j) => { const fj = f * cents(j ? 1.5 : -1.5); c.frequency.setValueAtTime(fj * 1.012, t); c.frequency.exponentialRampToValueAtTime(fj, t + .025); });
  partial(g, f * 4, t, .05, .3 * (o.bright ?? 1));
  partial(g, f * 10, t, .02, .05 * (o.bright ?? 1));
}
// a music box: a near-pure comb with its inharmonic ring
function box(t, f, vol, o = {}) {
  const dur = (o.dur ?? .9) * jit(.1);
  const g = voice(t, vol * .95, dur, o);
  if (!g) return;
  pair(g, f, t, dur, 1);
  partial(g, f * 2.76, t, dur * .4, .2 * (o.bright ?? 1));
  if (f * 5.4 < 9000) partial(g, f * 5.4, t, dur * .15, .05 * (o.bright ?? 1));
}
const INST = { kalimba, glass, wood, box };
const inst = kind => INST[VOICE[kind]] || kalimba;
// the old names, still used by the rest of the site's sounds
const tine = kalimba;
function bell(t, f, vol, o = {}) { box(t, f, vol, { dur: .55, ...o }); }

// the plant's other two layers: a fingertip on the note, and the soil it lands in
function touch(t, pan) { hiss(t, .004 + Math.random() * .002, .05, 'bandpass', 2500 + Math.random() * 1000, 1.2, { attack: .0007, pan, wet: 0 }); }
function thump(t, pan) {
  const g = voice(t, .05, .11, { attack: .004, pan, wet: .1 });
  if (!g) return;
  const o = osc('sine', 150, t, .11, g);
  o.frequency.exponentialRampToValueAtTime(95, t + .06);
}
// a stem stitch: a low, soft, muted pluck
function pluck(t, f, vol, pan) {
  const g = voice(t, vol, .17, { attack: .003, pan, wet: .25, orn: true });
  if (!g) return;
  const lp = keep(g, ctx.createBiquadFilter());
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(1500, f * 3), t); lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.1), t + .12); lp.Q.value = .7;
  lp.connect(g);
  osc('triangle', f, t, .17, lp);
}
// the harmony's step, at a phrase's turn: one soft low note with a long release. an event, never a bed
function mark(t) {
  const f = hz(CHORDS[chord].bass);
  const g = voice(t, .05, 2.5, { attack: .04, wet: .5 });
  if (!g) return;
  osc('sine', f, t, 2.5, g);
  const h = gain(g, .12); h.connect(g);
  osc('triangle', f, t, 1.2, h);
}

// the grid point at or after t, every step s (the beat or the off-beat between)
const snap = (t, step) => grid0 + Math.ceil((t - grid0 - .002) / step) * step;
const busy = t => { lastOrn = Math.max(lastOrn, t); };

// a flower fully grown: the chord's note near where it was planted, then a consonant partner a step later,
// over an airy breath opening upwards. quiet, resolved, never a fanfare
function bloom(t, i, kind, pan) {
  const ch = CHORDS[chord], play = inst(kind);
  let r = upTo(mid(i) + 3, ch.pcs[0]);
  if (r > 98) r -= 12;
  const p = nextUp(r, ch);
  play(t, hz(r), .065, { pan, dur: 1.2, wet: .8, echo: .22, orn: true, bright: .8 });
  play(t + GRID, hz(p), .05, { pan, dur: 1.4, wet: .9, echo: .28, orn: true, bright: .7 });
  const f = hiss(t, .34, .02, 'bandpass', 900, 1.1, { attack: .18, pan, wet: .6, echo: .15, orn: true });
  f?.frequency.exponentialRampToValueAtTime(5200, t + .32);
  busy(t + GRID);
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

// a growing flower's run, by id (planted ones know their note; ones from the opening bed borrow the melody's)
function grower(id, kind) {
  let s = grows.get(id);
  if (!s) {
    if (grows.size > 60) for (const [k, v] of grows) if (ctx.currentTime - v.last > 6) grows.delete(k);
    s = { i: pos + (Math.random() < .5 ? -2 : 0), kind, stem: 0, petal: 0, done: false, last: 0 };
    grows.set(id, s);
  }
  if (kind && !s.kind) s.kind = kind;
  return s;
}

// dev only: peak and rms after the master chain, collected between calls to feel.meter()
const M = { peak: 0, sum: 0, n: 0, buf: null };
function startMeter() {
  if (!meterNode) return;
  M.buf = new Float32Array(meterNode.fftSize);
  setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    meterNode.getFloatTimeDomainData(M.buf);
    for (let i = 0; i < M.buf.length; i++) { const v = M.buf[i]; const a = v < 0 ? -v : v; if (a > M.peak) M.peak = a; M.sum += v * v; }
    M.n += M.buf.length;
  }, 40);
}

function applyMood() {
  if (!ctx) return;
  const t = ctx.currentTime;
  if (!moodLp) {
    if (moodV <= 0) return;
    // put a lowpass in front of the master's shelf, only once evening first asks for it
    moodLp = ctx.createBiquadFilter();
    moodLp.type = 'lowpass'; moodLp.Q.value = .5; moodLp.frequency.value = 20000;
    master.disconnect(); master.connect(moodLp); moodLp.connect(tone);
  }
  moodLp.frequency.setTargetAtTime(20000 * .3 ** moodV, t, .4);
  verb.gain.setTargetAtTime(.28 * (1 + .45 * moodV), t, .4);
}

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
    }, 1);
    haptic(8);
  },
  // a flower is planted: the melody's next note on its family's instrument, a fingertip tick and a thump of
  // soil under it, a quiet chord tone underneath now and then, and a low mark when the harmony moves.
  // o: { kind, id } of the flower, so its growth can follow on from this note
  plant(n = 1, x, o = {}) {
    sound((t) => {
      const i = nextNote(), pan = panX(x), play = inst(o.kind);
      // after a pause, a tap sets where the beat is
      if (t - lastOrn > 1.2) grid0 = t;
      busy(t); lastPlant = t;
      if (phrase % 8 === 0) { chord = (chord + 1) % CHORDS.length; mark(t); }
      touch(t, pan);
      thump(t, pan);
      play(t, deg(i), .16 * jit(.15), { pan });
      if (phrase % 4 === 0) play(t + .012, hz(under(mid(i), CHORDS[chord])), .045, { pan, bright: .6, dur: 1 });
      for (let k = 1; k < n; k++) play(t + k * .08, deg(i + k), .08, { pan });
      run = 0; runBase = i + 3;
      const s = grower(o.id ?? 'anon', o.kind);
      Object.assign(s, { i, kind: o.kind, stem: 0, petal: 0, done: false, last: t });
    }, 1);
    haptic(n > 1 ? [10, 40, 6] : 10);
  },
  // while a flower stitches in: low muted plucks walking up its stem, then brighter notes on its own instrument
  // as the petals go in, and a small bloom when it's whole. o: { id, kind, part: 'stem' | 'leaf' | 'petal', p
  // (0..1 of its stitches), x }. on the grid, one note per beat across every flower, thinned when many grow
  stitch(o = {}) {
    if (o.id == null && !o.part) {
      // called bare: the old music-box run, on the grid
      const now = performance.now();
      if (now - lastRun < 70 || run >= 6) return;
      lastRun = now;
      sound((t) => {
        const ts = snap(t, GRID);
        if (ts - t > LOOK || Math.abs(ts - lastStitch) < .01) return;
        lastStitch = ts; busy(ts);
        bell(ts, deg(runBase + run++), .024 - run * .002, { dur: .3, wet: .6, orn: true });
      });
      return;
    }
    sound((t) => {
      const s = grower(o.id ?? 'anon', o.kind), pan = panX(o.x);
      s.last = t;
      let growing = 0;
      for (const v of grows.values()) if (t - v.last < .3 && !v.done) growing++;
      if ((o.p ?? 0) >= 1) {
        if (s.done) return;
        s.done = true;
        // blooms keep two beats apart, and wait a beat after the tap that planted them
        const tb = snap(Math.max(t, lastPlant + GRID), HALF);
        if (tb - lastBloom < GRID * 2) return;
        lastBloom = tb;
        bloom(tb, s.i, s.kind, pan);
        return;
      }
      const ts = snap(t, GRID);
      if (ts - t > LOOK || Math.abs(ts - lastStitch) < .01) return;
      if (growing > 2 && Math.random() > 2 / growing) return;
      const thin = 1 / Math.sqrt(Math.max(1, growing));
      if (o.part === 'petal') {
        if (s.petal >= 4) return;
        lastStitch = ts; busy(ts);
        inst(s.kind)(ts, deg(s.i + 1 + s.petal), .032 * (1 - s.petal * .1) * thin, { pan, dur: .45, wet: .55, orn: true, bright: .9 });
        s.petal++;
      } else {
        if (s.stem >= 3) return;
        lastStitch = ts; busy(ts);
        pluck(ts, deg(s.i - 5 + s.stem), .05 * (1 - s.stem * .12) * thin, pan);
        s.stem++;
      }
    });
  },
  // a flower tapped again turns into another of its kind: a quick music-box turn, whether it ripples or scatters
  morph(kind = 'ripple', x, o = {}) {
    sound((t) => {
      const pan = panX(x), i = nextNote();
      busy(t);
      touch(t, pan);
      inst(o.kind)(t, deg(i), .11 * jit(.15), { pan });
      [2, 4, 2].forEach((s, k) => bell(t + .05 + k * .05, deg(i + s), .026 - k * .005, { dur: .45, pan, wet: .7 }));
      run = 0; runBase = i + 3;
    }, 1);
    haptic(8);
  },
  // its sparkles: a glint high up on a note of the current chord, on the off-beat grid, into the echo
  sparkle(x) {
    sound((t) => {
      const ch = CHORDS[chord], p = ch.pcs[Math.floor(Math.random() * ch.pcs.length)];
      const ts = snap(t, HALF);
      busy(ts);
      bell(ts, hz(upTo(86 + (Math.random() < .5 ? 0 : 5), p)), .03, { dur: .7, pan: panX(x), wet: 1, echo: .35, orn: true });
    });
  },
  // mochi's bubble opens: a bloop up an octave
  pop() {
    sound((t) => {
      const g = voice(t, .09, .16, { attack: .006, pan: .5, wet: .4 });
      if (g) { const o = osc('sine', deg(0), t, .16, g); o.frequency.exponentialRampToValueAtTime(deg(5), t + .08); }
      bell(t + .07, deg(7), .025, { dur: .4, pan: .5 });
    }, 1);
    haptic(6);
  },
  close() {
    sound((t) => {
      const g = voice(t, .045, .12, { attack: .005, pan: .5, wet: .3 });
      if (g) { const o = osc('sine', deg(5), t, .12, g); o.frequency.exponentialRampToValueAtTime(deg(0), t + .09); }
    }, 1);
  },
  // poking mochi: a little chirpy mew, nasal and bendy
  mew() {
    sound((t) => {
      const dur = .26, g = voice(t, .06, dur, { attack: .02, pan: .55, wet: .35 });
      if (!g) return;
      const bp = keep(g, ctx.createBiquadFilter());
      bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 2.2; bp.connect(g);
      const o = osc('triangle', 560, t, dur, bp);
      o.frequency.exponentialRampToValueAtTime(880, t + .07);
      o.frequency.exponentialRampToValueAtTime(660, t + dur);
      const v = gain(g, 14); v.connect(o.frequency);
      osc('sine', 18, t, dur, v);
    }, 1);
    haptic(8);
  },
  swipe(dir = 1) {
    sound((t) => {
      const f = hiss(t, .12, .05, 'bandpass', dir > 0 ? 600 : 2200, .8);
      f?.frequency.exponentialRampToValueAtTime(dir > 0 ? 2200 : 600, t + .12);
    }, 1);
    haptic(5);
  },
  // the bee, tapped: a wingbeat hum on A, the fifth, that swoops up and settles. a rounder saw than before,
  // with a sine under it for body
  buzz() {
    sound((t) => {
      const dur = .42;
      const g = voice(t, .065, dur, { attack: .02, wet: .2 });
      if (!g) return;
      const lp = keep(g, ctx.createBiquadFilter());
      lp.type = 'lowpass'; lp.frequency.value = 950; lp.Q.value = .7;
      lp.connect(g);
      // wings: the tone flutters ~34 times a second
      const am = gain(g, .55); am.connect(lp);
      osc('sine', 34, t, dur, am.gain);
      const saw = gain(g, .6); saw.connect(am);
      const o = osc('sawtooth', hz(57), t, dur, saw);
      const s = osc('sine', hz(57), t, dur, am);
      [o, s].forEach((x) => { x.frequency.linearRampToValueAtTime(hz(59), t + dur * .35); x.frequency.linearRampToValueAtTime(hz(57), t + dur); });
    }, 1);
    haptic([14, 24, 12, 24, 16]);
  },
  // a butterfly startled into the air: soft wingbeats speeding off, and a quick harp flick upwards
  flutter(x) {
    sound((t) => {
      const pan = panX(x);
      for (let k = 0; k < 6; k++) hiss(t + k * .034, .028, .05 * (1 - k * .14), 'bandpass', 1500 + k * 260, 1.6, { pan: pan + k * .04, wet: .2 });
      const base = 5 + Math.floor(Math.random() * 3);
      [0, 1, 2, 4].forEach((s, k) => tine(t + .02 + k * .045, deg(base + s), .05 - k * .007, { pan, dur: .6, bright: .9 }));
    }, 1);
    haptic([6, 30, 6]);
  },
  // clearing the garden: a rake of soil and a run back down the scale, landing on D
  clear() {
    sound((t) => {
      const f = hiss(t, .45, .05, 'lowpass', 4200, .7, { attack: .04, wet: .3 });
      f?.frequency.exponentialRampToValueAtTime(500, t + .45);
      [9, 8, 7, 5, 4, 2, 0].forEach((d, k) => tine(t + .05 + k * .05, deg(d), .07 - k * .006, { dur: k === 6 ? 1.4 : .8, pan: .5 - k * .15 }));
      pos = 0; phrase = 0; chord = 0;
      grows.clear();
    }, 1);
    haptic([12, 40, 8]);
  },
  // sound back on: a little hello
  hello() {
    sound((t) => [0, 2, 4].forEach((s, k) => tine(t + k * .07, deg(s + 2), .07, { dur: .8 })), 1);
  },
  // 0 = day, 1 = dusk: the mix darkens a little (a lowpass easing down to ~6 kHz) and the room opens a little
  mood(v) {
    v = Math.max(0, Math.min(1, +v || 0));
    if (Math.abs(v - moodV) < .005 && !(v === 0 && moodV !== 0)) return;
    moodV = v;
    applyMood();
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
  get away() { return away; },
  onAway(fn) {
    awayFns.add(fn);
    return () => awayFns.delete(fn);
  },
};

// dev only: levels after the master chain since the last call, from the console: feel.meter()
if (DEV) {
  feel.meter = () => {
    const db = v => v > 0 ? +(10 * Math.log10(v)).toFixed(1) : -Infinity;
    const out = { peakDb: db(M.peak * M.peak), rmsDb: db(M.n ? M.sum / M.n : 0), voices };
    M.peak = 0; M.sum = 0; M.n = 0;
    return out;
  };
  // dev only: reachable from the console for level checks
  window.__feel = feel;
}
