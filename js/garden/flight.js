// Flight: how a butterfly flies, shared by the day's pixel ones and the night's ones of light. pure maths, no drawing:
// each garden reads the numbers here and draws them its own way.
//
//   const f = flyer(TEMPER.playful, Math.random, { x, y })
//   fly(f, dt, [dx, dy], { wind, hurry, speed })   // a frame in the air: wings, heading, the body riding the beats
//   land(f, x, y, now) … settle(f, now)            // come in, flare, drop the last few px, two small closing beats
//   rest(f, now)                                   // perched: wings breathing, the odd flick, small weight shifts
//   breeze(x, y, t)                                // the slow air every flyer feels
//
// f.fore / f.hind: how open each pair of wings looks from the front (1 flat, toward .1 folded up edge-on).
// f.push: how hard the wings are pushing right now (0 … 1, only on a downstroke). f.down: a downstroke began this frame.
// f.bank: the lean into a turn (-1 … 1). f.beating: false while it glides on open wings.

// a temperament scales everything: beat rate (Hz), downstrokes a burst, glide length (s), cruising speed, how
// erratic the heading is, how often it turns sharply, how long it sits
export const TEMPER = {
  skittish: { rate: 5.4, burst: [3, 6], glide: [.12, .4], speed: 1.12, jink: 1.3, sharp: .16, sit: .7, flick: .3 },
  playful: { rate: 4.7, burst: [2, 5], glide: [.22, .65], speed: 1, jink: 1.1, sharp: .12, sit: .9, flick: .22 },
  lazy: { rate: 3.7, burst: [2, 4], glide: [.4, 1.1], speed: .82, jink: .7, sharp: .06, sit: 1.4, flick: .1 },
};

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const sine = u => .5 - .5 * Math.cos(Math.PI * clamp(u));
// a wing's elevation (radians) to how wide it looks from the front: flat is widest, raised or lowered it foreshortens
const width = th => clamp(Math.cos(th), .1, 1);

// the stroke: wings up (nearly shut) at 0, a fast downstroke through flat to a little below, a slower upstroke back
const D = .34, UP = 1.38, DOWN = -.5, GLIDE = .3;
function stroke(u) {
  u = ((u % 1) + 1) % 1;
  return u < D ? UP + (DOWN - UP) * sine(u / D) : DOWN + (UP - DOWN) * sine((u - D) / (1 - D));
}
// the hind wings follow the fore wings this far behind, as a share of the beat
const LAG = .1;

// the breeze: a slow, smooth field, so two flyers near each other drift the same way (px/s)
export function breeze(x, y, t) {
  return [
    11 * Math.sin(t * .21 + x * .0031 + 1.3) + 6 * Math.sin(t * .47 - y * .005 + x * .0017) + 3 * Math.sin(t * 1.1 + x * .011),
    4 * Math.sin(t * .29 + x * .0043 + y * .002) + 2.5 * Math.sin(t * .83 - x * .007),
  ];
}

export function flyer(T, r = Math.random, { x = 0, y = 0, head = -Math.PI / 2 } = {}) {
  const f = { T, r, x, y, vx: 0, vy: 0, head, bank: 0, fore: 1, hind: 1, push: 0, down: false, beating: true, ph: .6, left: 0, glide: 0,
    rate: T.rate, thF: 0, thH: 0, beats: 0, landing: null, rs: null, sx: 0, sy: 0 };
  burst(f);
  return f;
}
const between = (r, [a, b]) => a + r() * (b - a);
function burst(f, hurry = 0) {
  f.beating = true; f.ph = .6;
  f.left = Math.round(between(f.r, f.T.burst) + hurry * 3);
  // each burst has its own pace
  f.rate = f.T.rate * (.86 + f.r() * .28);
}

// the wings for one frame in the air. hurry (0 … 1): faster, longer bursts, no glides. hold: glide whatever happens
function wings(f, dt, hurry, hold) {
  f.down = false; f.push = 0;
  if (f.beating) {
    const was = f.ph;
    f.ph += dt * f.rate * (1 + hurry * .9);
    if (f.ph >= 1) { f.ph -= 1; f.down = true; f.beats++; f.left--; }
    // the burst ends just after a downstroke, wings near flat, which is how it glides
    const end = D + .1;
    if ((f.left <= 0 || hold) && hurry < .3 && ((was < end && f.ph >= end) || hold && f.ph >= end)) {
      f.beating = false; f.glide = hold ? 9 : between(f.r, f.T.glide);
    }
    if (f.beating) {
      f.thF = stroke(f.ph); f.thH = stroke(f.ph - LAG);
      if (f.ph < D) f.push = Math.sin(Math.PI * f.ph / D);
    }
  }
  if (!f.beating) {
    f.glide -= dt;
    // a shallow v, held, the tips trembling a little in the air
    const th = GLIDE + .07 * Math.sin(f.beats * 1.7 + f.glide * 9);
    f.thF += (th - f.thF) * Math.min(1, dt * 14); f.thH += (th - f.thH) * Math.min(1, dt * 9);
    if (!hold && (f.glide <= 0 || hurry > .3)) burst(f, hurry);
  }
  f.fore = width(f.thF); f.hind = width(f.thH);
}

// a frame in the air. want: [dx, dy] where it means to go (any length; target plus whatever pushes it).
// o: { wind: [wx, wy] px/s, hurry 0 … 1, speed: cruising px/s, scale: size of the world (1 desktop), calm 0 … 1, hold }
export const G = 300;
export function fly(f, dt, want, o = {}) {
  const T = f.T, hurry = Math.max(o.hurry || 0, f.boost || 0), s = o.scale ?? 1, calm = o.calm || 0;
  // a take-off's fast beats ease off over half a second or so
  if (f.boost) f.boost = f.boost > .02 ? f.boost * Math.exp(-dt * 2.6) : 0;
  wings(f, dt, hurry, o.hold);
  // heading: it jinks on the beat, now and then turns hard, and is drawn back toward where it's going
  const bearing = Math.atan2(want[1], want[0]), off = wrap(bearing - f.head);
  if (f.down) {
    const j = T.jink * (1 - .75 * calm), h0 = f.head;
    f.head += off * (.5 + .3 * calm) + (f.r() - .5) * 1.4 * j;
    if (f.r() < T.sharp * (1 - calm)) f.head += (f.r() < .5 ? -1 : 1) * (.55 + f.r() * .8);
    // the beat itself throws the body a little onto the new line, so the path kinks on it
    const k = wrap(f.head - h0) * .45, c = Math.cos(k), sn = Math.sin(k);
    [f.vx, f.vy] = [f.vx * c - f.vy * sn, f.vx * sn + f.vy * c];
  } else f.head += off * Math.min(1, dt * (1.6 + 2.5 * calm)) + (f.r() - .5) * dt * 1.2 * T.jink;
  f.head = wrap(f.head);
  // the body rides the wings: each downstroke pushes it on along its heading and lifts it; between, it sinks
  const sp = (o.speed ?? 90) * T.speed * s * (1 + hurry * 1.3);
  const drag = f.beating ? 3 : 1.1, g = G * s * (f.beating ? 1 : .42);
  const thrust = sp * drag * Math.PI / (2 * D), lift = g * 1.12 * Math.PI / (2 * D) * (f.beating ? 1 : 0);
  // the hurry also pays its own way up: a startled one climbs
  const ax = Math.cos(f.head) * thrust * f.push, ay = Math.sin(f.head) * thrust * f.push - lift * f.push * (1 + hurry * .4) + g;
  const [wx, wy] = o.wind || [0, 0];
  const pvx = f.vx, pvy = f.vy;
  f.vx += (ax - (f.vx - wx) * drag) * dt; f.vy += (ay - (f.vy - wy) * drag) * dt;
  // a cap, so a hard pull never turns into a dash
  const v = Math.hypot(f.vx, f.vy), cap = sp * 2.1 + 40 * s;
  if (v > cap) { f.vx *= cap / v; f.vy *= cap / v; }
  f.x += f.vx * dt; f.y += f.vy * dt;
  // bank: how fast the path is curling, smoothed
  const w = v > 5 ? (pvx * (f.vy - pvy) - pvy * (f.vx - pvx)) / (v * v * Math.max(dt, 1e-3)) : 0;
  f.bank += (clamp(w * .35 + f.vx / (sp * 6 || 1), -1, 1) - f.bank) * Math.min(1, dt * 6);
  return Math.hypot(want[0], want[1]);
}

// ---- coming in to land: it slows, flares its wings wide, hangs a few px above the spot, drops onto it
export function land(f, x, y, now) {
  const d = Math.hypot(x - f.x, y - f.y);
  f.landing = { x0: f.x, y0: f.y, x, y, t0: now, dur: clamp(d / 80, .45, 1), drop: 5 + f.r() * 3 };
}
// returns true once it's down (then call rest). x, y may move under it (a swaying flower): pass them each frame
export function settle(f, now, x = f.landing.x, y = f.landing.y) {
  const L = f.landing, u = clamp((now - L.t0) / L.dur);
  // in to a point just above, then the drop
  const a = sine(Math.min(1, u / .8)), b = u < .8 ? 0 : (u - .8) / .2;
  const px = f.x, py = f.y;
  f.x = L.x0 + (x - L.x0) * (1 - (1 - a) * (1 - a));
  f.y = L.y0 + (y - L.drop - L.y0) * a + L.drop * b * b;
  f.vx = (f.x - px) * 30; f.vy = (f.y - py) * 30;
  // wings flared wide, a last small beat to brake as it comes over the spot
  const th = u < .55 ? GLIDE * (1 - u / .55) - .05 : u < .8 ? -.05 + .9 * Math.sin(Math.PI * (u - .55) / .25) : -.08;
  f.thF += (th - f.thF) * .5; f.thH += (th - f.thH) * .35;
  f.fore = width(f.thF); f.hind = width(f.thH); f.push = 0; f.down = false;
  f.bank *= .9;
  if (u < 1) return false;
  f.landing = null; f.x = x; f.y = y; f.vx = f.vy = 0;
  rest(f, now, 'settle');
  return true;
}

// ---- perched. returns how many seconds until it next moves (0: it's moving now, it needs every frame).
// now: seconds on a clock that keeps running while nothing draws (not a sum of clamped frame times)
const EV = {
  // two small closing beats as it settles
  settle: () => ({ dur: .62, lag: .08, th: u => -.04 + .66 * Math.abs(Math.sin(Math.PI * 2 * u)) * (u < .5 ? 1 : .7) }),
  // held open, flat, basking
  hold: (r, T) => ({ dur: (.5 + r() * 1.6) * T.sit, still: true, th: () => -.04 }),
  // a slow breath: shut quickly, open slowly
  breath: r => { const top = .9 + r() * .45, c = .35 + r() * .1; return { dur: .75 + r() * .6, lag: .06, th: u => -.04 + (top + .04) * (u < c ? sine(u / c) : 1 - sine((u - c) / (1 - c))) }; },
  // a quick double flick
  flick: r => ({ dur: .42 + r() * .1, lag: .05, th: u => -.04 + 1.15 * Math.abs(Math.sin(Math.PI * 2 * u)) * (u < .5 ? 1 : .8) }),
  // a little weight shift: a pixel over and back, wings still
  shift: r => { const dx = r() < .5 ? -1 : 1; return { dur: .5 + r() * .5, th: () => -.04, sx: u => dx * Math.sin(Math.PI * u), sy: u => .6 * Math.sin(Math.PI * u) }; },
};
function next(f) {
  const r = f.r, T = f.T, prev = f.rs?.kind;
  // after anything but a hold, a hold (the reference holds open most of a second between beats)
  if (prev && prev !== 'hold') return 'hold';
  const u = r();
  return u < T.flick ? 'flick' : u < T.flick + .5 ? 'breath' : u < T.flick + .72 ? 'shift' : 'hold';
}
export function rest(f, now, kind) {
  if (kind || !f.rs || now - f.rs.t0 >= f.rs.dur) {
    kind = kind || next(f);
    f.rs = { kind, t0: now, ...EV[kind](f.r, f.T) };
  }
  const R = f.rs, u = clamp((now - R.t0) / R.dur);
  f.thF = R.th(u); f.thH = R.th(Math.max(0, u - (R.lag || 0)));
  f.fore = width(f.thF); f.hind = width(f.thH);
  f.sx = R.sx ? R.sx(u) : 0; f.sy = R.sy ? R.sy(u) : 0;
  f.push = 0; f.down = false; f.beating = false;
  return R.still ? Math.max(0, R.t0 + R.dur - now) : 0;
}

// ---- off a perch: a small crouch, then a burst of fast beats and a quick climb. up: radians it leaves toward
export function takeoff(f, up = -Math.PI / 2, hurry = .6) {
  f.rs = null; f.landing = null;
  f.head = up; f.thF = f.thH = UP; f.fore = f.hind = width(UP);
  burst(f, hurry); f.ph = .92;
  f.vy = -40; f.crouch = .07; f.boost = hurry; f.sx = f.sy = 0;
}
// how much of the crouch is left (s), counting down; while it's above 0 the body sits a px lower, wings shut
export function crouching(f, dt) {
  if (!(f.crouch > 0)) return false;
  f.crouch -= dt; f.fore = f.hind = width(UP);
  return true;
}
