// Butterflies: the moodboard's drawings, as pixel sprites. they turn up once the garden has grown and fly the way real
// ones do (flight.js): bursts of beats and glides, a path that kinks on every beat, rising on the downstroke and sinking
// between. they loop the name now and then, come in to land on flowers, sit breathing their wings, and startle when you
// get close. One rAF loop for all of them, transform-only moves, no layout reads per frame; it sleeps while they all
// sit still, and wakes for each breath.
//
//   const bf = createButterflies({ host, spots, count, busy })
//   bf.add()          // one more flies in from a side edge (up to count)
//   bf.visit(spot)    // the nearest one may go and see a new flower
//   bf.scatter()      // everyone flies off-screen
//   bf.count          // how many are out
//   bf.destroy()
//
// spots() -> [{ x, y }] flower heads in host px. busy() -> [{ x, y }] places someone else (the bee) is sitting.
import { BUTTERFLIES } from './flora.js';
import { flyer, fly, land, settle, rest, takeoff, crouching, breeze, TEMPER } from './flight.js';
import { feel } from '../feel.js';

export const BUTTERFLY_CSS = `
.bfs { position: absolute; inset: 0; pointer-events: none; z-index: 5; overflow: hidden; }
.bf { position: absolute; left: 0; top: 0; pointer-events: auto; cursor: pointer; will-change: transform;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
/* a thumb-sized target around a small sprite */
.bf::before { content: ""; position: absolute; inset: -10px; }
.bf-i { width: 100%; height: 100%; transition: transform .22s cubic-bezier(.3, 1.4, .5, 1); }
.bf.l .bf-i { transform: scaleX(-1); }
.bf canvas { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; }
.bf-j { width: 100%; height: 100%; }
/* startled: the wings flare wide, then snap in as it pushes off (scale only, so the facing flip stays put) */
.bf.spin .bf-j { animation: bf-startle .28s cubic-bezier(.2, .9, .3, 1); }
@keyframes bf-startle { 0% { scale: 1 1; } 30% { scale: 1.35 .82; } 65% { scale: .88 1.12; } 100% { scale: 1 1; } }
.bf.out { opacity: 0; transition: opacity .4s; }
`;

// a little personality each: who's skittish, who's playful, who's lazy. fore: which side of the drawing the
// forewing is on (-1 left, 1 right), so the hind wing can follow it a beat late
const KIN = [
  { name: 'flyblue', temper: 'skittish', speed: 92, shy: 92, loops: .14, sit: 1, fore: -1 },
  { name: 'flypink', temper: 'playful', speed: 100, shy: 70, loops: .3, sit: .8, fore: 1 },
  { name: 'flybig', temper: 'lazy', speed: 80, shy: 62, loops: .1, sit: 1.5, fore: -1 },
  { name: 'flylemon', temper: 'playful', speed: 96, shy: 80, loops: .22, sit: .9, fore: -1 },
  { name: 'flylilac', temper: 'skittish', speed: 98, shy: 86, loops: .18, sit: .8, fore: 1 },
];

// how far each side folds, in steps: 0 flat open … 5 nearly edge-on
const FOLD = [0, .14, .28, .42, .56, .7];
const step = open => Math.max(0, Math.min(5, Math.round((1 - open) * .8 / .14)));

// draw a sprite into a little canvas, each side folded in toward the body by its own amount (sl left, sr right).
// cells pile up as they fold, and the darker one wins, so the outline stays whole
function frame(s, sl = 0, sr = 0) {
  const W = s.rows[0].length, H = s.rows.length;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const lum = s.pal.map(h => { const n = parseInt(h.slice(1), 16); return (n >> 16) + (n >> 8 & 255) + (n & 255); });
  const cells = [];
  s.rows.forEach((r, y) => [...r].forEach((ch, i) => { if (ch !== '.') cells.push([i, y, parseInt(ch, 16)]); }));
  const bx = cells.reduce((a, q) => a + q[0], 0) / cells.length;
  const top = {};
  for (const [i, y, k] of cells) {
    const key = Math.round(bx + (i - bx) * (1 - (i < bx ? sl : sr))) + ',' + y;
    if (top[key] === undefined || lum[k] < lum[top[key]]) top[key] = k;
  }
  for (const key in top) { const [i, y] = key.split(',').map(Number); x.fillStyle = s.pal[top[key]]; x.fillRect(i, y, 1, 1); }
  return c;
}
// every fold, once per drawing: 6 x 6 tiny canvases
const frames = {};
function framesOf(name) {
  if (frames[name]) return frames[name];
  const s = BUTTERFLIES[name];
  return (frames[name] = FOLD.map(l => FOLD.map(r => frame(s, l, r))));
}
// where the body is, in sprite cells: that's the point that sits on a flower
function body(s) {
  let x = 0, y = 0, n = 0;
  s.rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { x += i; y += j; n++; } }));
  return [x / n + .5, y / n + .5];
}

export function createButterflies({ host, spots, count = 3, busy = () => [] }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const wrap = document.createElement('div');
  wrap.className = 'bfs';
  wrap.setAttribute('aria-hidden', 'true');
  host.appendChild(wrap);

  const flies = [];
  let W = 0, H = 0, hx = 0, hy = 0, avoid = [], mark = null, raf = 0, sleepT = 0, last = 0, t = 0, visible = true, dead = false, kinN = 0;
  const cursor = { x: -999, y: -999, at: -9, speed: 0, ms: 0 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const any = a => a[Math.floor(Math.random() * a.length)];
  // the world is smaller on a phone, so they fly a little slower there
  const scale = () => W && W <= 640 ? .75 : 1;

  // the only layout reads: on resize, and once the type has settled in
  function measure() {
    const h = host.getBoundingClientRect();
    W = h.width; H = h.height; hx = h.left + scrollX; hy = h.top + scrollY;
    const r = sel => [...host.querySelectorAll(sel)].map(el => { const b = el.getBoundingClientRect(); return [b.left - h.left, b.top - h.top, b.right - h.left, b.bottom - h.top]; });
    avoid = [...r('.mark'), ...r('.nav'), ...r('.hint')];
    mark = r('.mark')[0] || null;
  }
  const ro = new ResizeObserver(measure);
  ro.observe(host);
  const settleT = setTimeout(measure, 2600);
  const inRect = (x, y, [a, b, c, d], pad = 0) => x > a - pad && x < c + pad && y > b - pad && y < d + pad;

  function sky() {
    for (let i = 0; i < 16; i++) {
      const x = rnd(60, W - 60), y = rnd(H * .1, H * .72);
      if (!avoid.some(r => inRect(x, y, r, 40))) return { x, y };
    }
    return { x: rnd(60, W - 60), y: H * .12 };
  }

  // a free flower: not under the bee, not taken by another butterfly
  function freeSpots(self) {
    const taken = [...busy(), ...flies.filter(f => f !== self && f.spot).map(f => f.spot)];
    return spots().filter(s => s.x > 24 && s.x < W - 24 && s.y > 50 && s.y < H - 30 && !taken.some(o => Math.hypot(o.x - s.x, o.y - s.y) < 34));
  }

  function make(kin) {
    const s = BUTTERFLIES[kin.name];
    const sw = s.rows[0].length, sh = s.rows.length;
    // one sprite cell per garden cell, give or take: the big one is drawn finer so it isn't huge
    const k = kin.name === 'flybig' ? (W <= 640 ? 2 : 3) : (W <= 640 ? 3 : 5);
    const [bx, by] = body(s);
    const el = document.createElement('div');
    el.className = 'bf'; el.dataset.kin = kin.name;
    el.style.width = sw * k + 'px'; el.style.height = sh * k + 'px';
    const inner = document.createElement('div'), jolt = document.createElement('div');
    inner.className = 'bf-i'; jolt.className = 'bf-j';
    const cv = document.createElement('canvas');
    cv.width = sw; cv.height = sh;
    jolt.append(cv);
    inner.appendChild(jolt);
    el.appendChild(inner);
    wrap.appendChild(el);
    const f = Object.assign(flyer(TEMPER[kin.temper]), { kin, el, cv, cx: cv.getContext('2d'), frames: framesOf(kin.name), w: sw * k, h: sh * k, ax: bx * k, ay: by * k,
      mode: 'wander', tx: 0, ty: 0, timer: 0, spot: null, left: false, lean: 0, look: 0, fl: -1, fr: -1, px: NaN, py: NaN, hurry: 0 });
    // pointerdown, not click: it's off the moment a finger lands, the way a real one would be
    // (a touch only counts as a gesture for sound and haptics once it lifts, so on phones the flutter plays on click)
    el.addEventListener('pointerdown', e => { e.stopPropagation(); f.hush = e.pointerType !== 'mouse'; tap(f, e.pageX - hx, e.pageY - hy); });
    el.addEventListener('click', e => { e.stopPropagation(); if (f.hush) { f.hush = false; feel.flutter(f.x); } });
    return f;
  }

  function add() {
    if (dead || flies.filter(f => f.mode !== 'leave').length >= count || !W) return;
    // five different ones before anyone repeats
    const kin = KIN[kinN++ % Math.min(KIN.length, Math.max(3, count))];
    const f = make(kin);
    flies.push(f);
    if (reduced) {
      const s = any(freeSpots(f));
      if (!s) { f.el.remove(); flies.splice(flies.indexOf(f), 1); return; }
      // it's simply there, sitting, wings open
      f.spot = s; f.x = s.x; f.y = s.y; f.mode = 'perch'; f.fore = f.hind = 1;
      draw(f); place(f);
      return;
    }
    const side = Math.random() < .5 ? -1 : 1;
    f.x = side < 0 ? -f.w : W + f.w; f.y = rnd(H * .15, H * .5);
    f.vx = -side * kin.speed * .8; f.vy = 0; f.head = side < 0 ? 0 : Math.PI;
    const p = sky(); f.tx = p.x; f.ty = p.y; f.mode = 'wander'; f.timer = rnd(3, 5);
    wake();
  }

  // keep a heading in the upper half, between up-left and up-right (canvas y runs down)
  const up = a => Math.max(-2.6, Math.min(-.55, a));
  // escaping: a burst away from whatever startled it, biased upwards, that jinks every few wingbeats
  // (that zig-zag is how real ones shake off a bird) and eases back to a lazy pace over a second or so
  function lift(f, why, from = cursor) {
    const was = f.mode;
    f.spot = null; f.landing = null;
    if (why === 'flee' || why === 'tap') {
      // sideways away from the finger or the cursor, and always up: a startled one climbs
      const dx = f.x - from.x, side = Math.abs(dx) < 4 ? (Math.random() < .5 ? -1 : 1) : Math.sign(dx);
      const base = up(Math.atan2(-1.1 - Math.random() * .5, side * (.7 + Math.random() * .5))), burst = why === 'tap' ? 1 : .8;
      f.esc = { t0: t, base, head: base, next: t + .05, burst };
      // no wind-up and no crouch: it's already moving on the first frame
      takeoff(f, base, 1); f.crouch = 0;
      const v = f.kin.speed * 2.6 * burst * scale();
      f.vx = Math.cos(base) * v; f.vy = Math.sin(base) * v;
      face(f, f.vx < 0);
      f.mode = 'flee'; f.timer = why === 'tap' ? 1.5 : 1.1;
      return;
    }
    // an easy lift-off: a small crouch, then up and away
    if (was === 'perch') takeoff(f, -Math.PI / 2 + (f.left ? -.5 : .5) * Math.random(), .5);
    pick(f);
  }

  // what next: a flower, a lap of the name, or just more drifting
  function pick(f) {
    const r = Math.random();
    if (r < .42) {
      const list = freeSpots(f);
      if (list.length) {
        list.sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y));
        return goLand(f, list[Math.floor(Math.random() * Math.min(6, list.length))]);
      }
    }
    if (mark && r < .42 + f.kin.loops) {
      const cx = (mark[0] + mark[2]) / 2, cy = (mark[1] + mark[3]) / 2;
      f.mode = 'orbit'; f.dir = Math.random() < .5 ? -1 : 1; f.swept = 0;
      f.theta = Math.atan2((f.y - cy) / ((mark[3] - mark[1]) / 2 + 60), (f.x - cx) / ((mark[2] - mark[0]) / 2 + 70));
      return;
    }
    const p = sky(); f.tx = p.x; f.ty = p.y; f.mode = 'wander'; f.timer = rnd(2.5, 5);
  }

  function goLand(f, s) {
    if (f.mode === 'perch') takeoff(f, -Math.PI / 2, .5);
    f.landing = null;
    f.spot = s; f.mode = 'land';
    f.tx = s.x; f.ty = s.y;
  }

  function tap(f, x, y) {
    if (!f.hush) feel.flutter(f.x);
    if (reduced || f.mode === 'leave') return;
    f.el.classList.remove('spin');
    requestAnimationFrame(() => f.el.classList.add('spin'));
    lift(f, 'tap', { x: x ?? f.x, y: y ?? f.y + 10 });
    wake();
  }

  // stepped and pixel-snapped: whole px only, so the sprite never blurs
  function place(f) {
    const x = Math.round(f.x + (f.sx || 0) - (f.left ? f.w - f.ax : f.ax)), y = Math.round(f.y + (f.sy || 0) + (f.crouch > 0 ? 1 : 0) - f.ay - f.h * .12);
    if (x === f.px && y === f.py) return;
    f.px = x; f.py = y;
    f.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
  function face(f, left) { if (left !== f.left) { f.left = left; f.px = NaN; f.el.classList.toggle('l', left); } }
  // the wings: each side folds by its own step. the hind wing trails the forewing, and the near wing shows more on a
  // lean (into a turn, or toward a cursor it's watching): a swapped frame, never a rotation that would smear the pixels
  function draw(f) {
    const lean = Math.max(-1, Math.min(1, f.bank * .8 + f.look)) * (f.left ? -1 : 1);
    const side = sgn => {
      const open = sgn === f.kin.fore ? f.fore : f.hind;
      return step(open * (1 - .38 * Math.max(0, -lean * sgn)));
    };
    const l = side(-1), r = side(1);
    if (l === f.fl && r === f.fr) return;
    f.fl = l; f.fr = r;
    f.cx.clearRect(0, 0, f.cv.width, f.cv.height);
    f.cx.drawImage(f.frames[l][r], 0, 0);
  }

  // where it means to go, plus the type and the buttons pushing it off, plus the edges of the garden
  function want(f, tx, ty, edges) {
    const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1;
    let ax = dx / d, ay = dy / d;
    if (f.mode !== 'land' && f.mode !== 'leave') for (const r of avoid) if (inRect(f.x, f.y, r, 30)) {
      const cx = (r[0] + r[2]) / 2, cy = (r[1] + r[3]) / 2, q = Math.hypot(f.x - cx, f.y - cy) || 1;
      ax += (f.x - cx) / q * 1.3; ay += (f.y - cy) / q * 1.8;
    }
    if (edges) {
      if (f.x < 30) ax += 1.2; if (f.x > W - 30) ax -= 1.2;
      if (f.y < 50) ay += 1.2; if (f.y > H * .86) ay -= 1.4;
    }
    return [ax, ay];
  }

  // returns when this one next needs a frame (0 = every frame)
  function stepFly(f, dt, now) {
    const k = f.kin, s = now / 1000;
    if (f.mode === 'perch') {
      let next = rest(f, s);
      // a slow cursor nearby: it turns its near wing toward it. a fast one, or one right on top of it, sends it off
      let look = 0;
      if (fine && t - cursor.at < .3) {
        const d = Math.hypot(cursor.x - f.x, cursor.y - f.y);
        if (d < k.shy * .5 || (d < k.shy && cursor.speed > 450)) { lift(f, 'flee'); return 0; }
        if (d < k.shy * 1.6) look = Math.sign(cursor.x - f.x) * (1 - d / (k.shy * 1.6));
      }
      f.look += (look - f.look) * Math.min(1, dt * 8);
      if (Math.abs(f.look - look) > .03 || t - cursor.at < .3) next = 0;
      else f.look = look;
      // a moment after it lands, it turns round to sit along the flower
      if (f.turnAt && now >= f.turnAt) { f.turnAt = 0; face(f, !f.left); }
      draw(f); place(f);
      if (now >= f.liftAt) { lift(f); return 0; }
      return next ? Math.min(now + next * 1000, f.liftAt, f.turnAt || Infinity) : 0;
    }
    if (f.mode === 'settle') {
      if (settle(f, s)) {
        f.mode = 'perch'; f.liftAt = now + rnd(2600, 7000) * k.sit;
        f.turnAt = Math.random() < .4 ? now + rnd(700, 1400) : 0;
      }
      draw(f); place(f);
      return 0;
    }
    // a crouch before an easy take-off: a px lower, wings shut
    if (crouching(f, dt)) { draw(f); place(f); return 0; }

    let tx = f.tx, ty = f.ty, speed = k.speed, hurry = 0, calm = 0;
    if (f.mode === 'orbit') {
      const cx = (mark[0] + mark[2]) / 2, cy = (mark[1] + mark[3]) / 2, rx = (mark[2] - mark[0]) / 2 + 70, ry = (mark[3] - mark[1]) / 2 + 60;
      f.theta += f.dir * .95 * dt; f.swept += .95 * dt;
      tx = cx + Math.cos(f.theta) * rx; ty = cy + Math.sin(f.theta) * ry;
      speed *= 1.2;
      if (f.swept > Math.PI * 2) pick(f);
    } else if (f.mode === 'leave') {
      speed = 150; hurry = .5;
    }
    let dir;
    if (f.mode === 'flee') {
      const e = f.esc, age = t - e.t0;
      // the jinks: a new heading every 70–150ms, never swinging too far off the getaway line
      if (t >= e.next) {
        e.head = e.base + Math.max(-.8, Math.min(.8, e.head - e.base + rnd(-.8, .8)));
        e.next = t + rnd(.07, .15);
        // and the getaway line itself drifts, so it curls off rather than flying a ruler-straight line, but keeps climbing
        e.base = up(e.base + rnd(-.25, .25));
      }
      // near an edge it veers along it instead of vanishing: across the top, back in from the sides
      if (f.y < 60) e.base = Math.cos(e.base) < 0 ? -2.75 : -.4;
      if (f.x < 30) e.base = -.7;
      if (f.x > W - 30) e.base = -2.45;
      dir = [Math.cos(e.head), Math.sin(e.head) + (f.y < 60 ? (60 - f.y) / 30 : 0)];
      hurry = e.burst * Math.exp(-age * 1.8);
      f.timer -= dt;
      if (f.timer <= 0) { const p = sky(); f.tx = p.x; f.ty = p.y; f.mode = 'wander'; f.timer = rnd(2, 4); }
    } else {
      dir = want(f, tx, ty, f.mode === 'wander' || f.mode === 'orbit');
      // steadier as it comes in to land
      if (f.mode === 'land') calm = 1 - Math.min(1, Math.hypot(tx - f.x, ty - f.y) / 160);
    }
    fly(f, dt, dir, { wind: breeze(f.x, f.y, s), hurry, speed, scale: scale(), calm });
    // it turns to face where it's going; mid-escape only for a real change of direction, so the jinks don't flicker it
    if (Math.abs(f.vx) > (f.mode === 'flee' ? 90 : 18)) face(f, f.vx < 0);
    f.look *= .9;
    draw(f); place(f);

    const dist = Math.hypot(tx - f.x, ty - f.y);
    if (fine && f.mode !== 'flee' && f.mode !== 'leave' && t - cursor.at < .3 && Math.hypot(cursor.x - f.x, cursor.y - f.y) < k.shy && cursor.speed > 250) lift(f, 'flee');
    // close in: it slows, flares and drops onto the flower
    if (f.mode === 'land' && dist < 46) { land(f, tx, ty, s); f.mode = 'settle'; }
    if (f.mode === 'wander') { f.timer -= dt; if (f.timer <= 0 || dist < 24) pick(f); }
    if (f.mode === 'leave' && (f.x < -f.w * 2 || f.x > W + f.w * 2 || f.y < -f.h * 2)) {
      f.el.remove(); flies.splice(flies.indexOf(f), 1);
    }
    return 0;
  }

  function loop(now) {
    raf = 0;
    if (dead || !visible || document.hidden || !flies.length) return;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; t += dt;
    let next = Infinity;
    for (const f of [...flies]) { const n = stepFly(f, dt, now); next = n ? Math.min(next, n) : 0; }
    if (!flies.length) return;
    // everyone's sitting still: sleep until the next breath, flick or lift-off
    if (next > now + 40) { clearTimeout(sleepT); last = 0; sleepT = setTimeout(wake, Math.min(next, now + 4000) - now); return; }
    raf = requestAnimationFrame(loop);
  }
  function wake() {
    clearTimeout(sleepT);
    if (!raf && !dead && !reduced) raf = requestAnimationFrame(loop);
  }

  const onMove = e => {
    if (e.pointerType !== 'mouse') return;
    const x = e.pageX - hx, y = e.pageY - hy, ms = e.timeStamp, gap = Math.max(8, ms - cursor.ms);
    // how fast it's moving (px/s), smoothed, so a slow hand can come close and a quick one scares them
    cursor.speed = gap > 200 ? 0 : cursor.speed + (Math.hypot(x - cursor.x, y - cursor.y) / gap * 1000 - cursor.speed) * .4;
    cursor.x = x; cursor.y = y; cursor.at = t; cursor.ms = ms;
    if (flies.length && e.pageY < H + 200) wake();
  };
  if (fine && !reduced) addEventListener('pointermove', onMove, { passive: true });
  const io = new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; if (visible) wake(); });
  io.observe(host);
  const onVis = () => { if (!document.hidden) wake(); };
  document.addEventListener('visibilitychange', onVis);
  measure();
  // dev: the flyers themselves, for measuring the flight from the console
  if (import.meta.env?.DEV) window.__butterflies = flies;

  /** The nearest one that's free may wander over to a new flower. */
  function visit(spot) {
    if (!spot || reduced) return;
    const ok = flies.filter(f => f.mode !== 'leave' && f.mode !== 'flee');
    if (!ok.length || busy().some(o => Math.hypot(o.x - spot.x, o.y - spot.y) < 34) || flies.some(f => f.spot && Math.hypot(f.spot.x - spot.x, f.spot.y - spot.y) < 34)) return;
    ok.sort((a, b) => Math.hypot(a.x - spot.x, a.y - spot.y) - Math.hypot(b.x - spot.x, b.y - spot.y));
    goLand(ok[0], spot);
    wake();
  }
  /** Everyone off-screen, out the nearest side and up a little. */
  function scatter() {
    for (const f of [...flies]) {
      if (reduced) { f.el.classList.add('out'); setTimeout(() => f.el.remove(), 400); flies.splice(flies.indexOf(f), 1); continue; }
      if (f.mode === 'perch' || f.mode === 'settle') takeoff(f, -Math.PI / 2, .7);
      f.spot = null; f.landing = null; f.crouch = 0; f.mode = 'leave';
      f.tx = f.x < W / 2 ? -f.w * 3 : W + f.w * 3; f.ty = f.y - rnd(80, 200);
      f.vx += (f.x < W / 2 ? -1 : 1) * 120; f.vy -= 80;
    }
    wake();
  }
  function destroy() {
    dead = true; cancelAnimationFrame(raf); clearTimeout(sleepT); clearTimeout(settleT);
    ro.disconnect(); io.disconnect();
    removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', onVis);
    wrap.remove();
  }
  return { add, visit, scatter, destroy, get count() { return flies.filter(f => f.mode !== 'leave').length; } };
}
