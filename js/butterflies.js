// Butterflies: the moodboard's three, drawn as pixel sprites. they turn up once the garden has grown,
// wander lazily, loop the name now and then, sit on flowers with slow wingbeats, and startle when you get close.
// One rAF loop for all of them, transform-only moves, no layout reads per frame; it sleeps while they all sit still.
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
import { feel } from './feel.js';

export const BUTTERFLY_CSS = `
.bfs { position: absolute; inset: 0; pointer-events: none; z-index: 5; overflow: hidden; }
.bf { position: absolute; left: 0; top: 0; pointer-events: auto; cursor: pointer; will-change: transform;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
/* a thumb-sized target around a small sprite */
.bf::before { content: ""; position: absolute; inset: -10px; }
.bf-i { width: 100%; height: 100%; transition: transform .22s cubic-bezier(.3, 1.4, .5, 1); }
.bf.l .bf-i { transform: scaleX(-1); }
.bf canvas { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; }
.bf .c, .bf.shut .o { visibility: hidden; } .bf.shut .c { visibility: visible; }
.bf-j { width: 100%; height: 100%; }
/* startled: the wings flare wide, then snap in as it pushes off (scale only, so the facing flip stays put) */
.bf.spin .bf-j { animation: bf-startle .28s cubic-bezier(.2, .9, .3, 1); }
@keyframes bf-startle { 0% { scale: 1 1; } 30% { scale: 1.35 .82; } 65% { scale: .88 1.12; } 100% { scale: 1 1; } }
.bf.out { opacity: 0; transition: opacity .4s; }
`;

// a little personality each: who's skittish, who's playful, who's lazy
const KIN = [
  { name: 'flyblue', speed: 92, shy: 92, loops: .14, sit: 1, flap: 105, glide: .35 },
  { name: 'flypink', speed: 104, shy: 70, loops: .3, sit: .8, flap: 95, glide: .25 },
  { name: 'flybig', speed: 74, shy: 62, loops: .1, sit: 1.5, flap: 135, glide: .6 },
];

// draw a sprite into a little canvas; squash > 0 folds the wings in toward the body.
// cells pile up as they fold, and the darker one wins, so the outline stays whole
function frame(s, squash = 0) {
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
    const key = Math.round(bx + (i - bx) * (1 - squash)) + ',' + y;
    if (top[key] === undefined || lum[k] < lum[top[key]]) top[key] = k;
  }
  for (const key in top) { const [i, y] = key.split(',').map(Number); x.fillStyle = s.pal[top[key]]; x.fillRect(i, y, 1, 1); }
  return c;
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
  const cursor = { x: -999, y: -999, at: -9 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const any = a => a[Math.floor(Math.random() * a.length)];

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
    el.className = 'bf';
    el.style.width = sw * k + 'px'; el.style.height = sh * k + 'px';
    const inner = document.createElement('div'), jolt = document.createElement('div');
    inner.className = 'bf-i'; jolt.className = 'bf-j';
    const o = frame(s), c = frame(s, kin.name === 'flybig' ? .5 : .4);
    o.className = 'o'; c.className = 'c';
    jolt.append(o, c);
    inner.appendChild(jolt);
    el.appendChild(inner);
    wrap.appendChild(el);
    const f = { kin, el, w: sw * k, h: sh * k, ax: bx * k, ay: by * k, x: 0, y: 0, vx: 0, vy: 0, mode: 'wander', tx: 0, ty: 0, timer: 0, ph: Math.random() * 9,
      spot: null, shut: false, left: false, flapAt: 0, glideTill: 0, landT: 0, theta: 0, swept: 0, dir: 1, px: NaN, py: NaN };
    // pointerdown, not click: it's off the moment a finger lands, the way a real one would be
    // (a touch only counts as a gesture for sound and haptics once it lifts, so on phones the flutter plays on click)
    el.addEventListener('pointerdown', e => { e.stopPropagation(); f.hush = e.pointerType !== 'mouse'; tap(f, e.pageX - hx, e.pageY - hy); });
    el.addEventListener('click', e => { e.stopPropagation(); if (f.hush) { f.hush = false; feel.flutter(f.x); } });
    return f;
  }

  function add() {
    if (dead || flies.filter(f => f.mode !== 'leave').length >= count || !W) return;
    // three different ones before anyone repeats
    const kin = KIN[kinN++ % KIN.length];
    const f = make(kin);
    flies.push(f);
    if (reduced) {
      const s = any(freeSpots(f));
      if (!s) { f.el.remove(); flies.splice(flies.indexOf(f), 1); return; }
      f.spot = s; f.x = s.x; f.y = s.y; f.mode = 'perch';
      place(f, 0);
      return;
    }
    const side = Math.random() < .5 ? -1 : 1;
    f.x = side < 0 ? -f.w : W + f.w; f.y = rnd(H * .15, H * .5);
    f.vx = -side * kin.speed; f.vy = 0;
    const p = sky(); f.tx = p.x; f.ty = p.y; f.mode = 'wander'; f.timer = rnd(3, 5);
    wake();
  }

  // keep a heading in the upper half, between up-left and up-right (canvas y runs down)
  const up = a => Math.max(-2.6, Math.min(-.55, a));
  // escaping: a burst away from whatever startled it, biased upwards, that jinks every few wingbeats
  // (that zig-zag is how real ones shake off a bird) and eases back to a lazy pace over a second or so
  function lift(f, why, from = cursor) {
    f.spot = null;
    if (why === 'flee' || why === 'tap') {
      // sideways away from the finger or the cursor, and always up: a startled one climbs
      const dx = f.x - from.x, side = Math.abs(dx) < 4 ? (Math.random() < .5 ? -1 : 1) : Math.sign(dx);
      const base = up(Math.atan2(-1.1 - Math.random() * .5, side * (.7 + Math.random() * .5))), burst = why === 'tap' ? 620 : 470;
      f.esc = { t0: t, base, head: base, next: t + .05, burst };
      // no wind-up: it's already moving on the first frame
      f.vx = Math.cos(base) * burst * .8; f.vy = Math.sin(base) * burst * .8;
      face(f, f.vx < 0);
      f.mode = 'flee'; f.timer = why === 'tap' ? 1.5 : 1.1; f.flapAt = 0;
      return;
    }
    f.vy = -60;
    pick(f);
  }

  // what next: a flower, a lap of the name, or just more drifting
  function pick(f) {
    const r = Math.random();
    if (r < .42) {
      const list = freeSpots(f);
      if (list.length) {
        list.sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y));
        return land(f, list[Math.floor(Math.random() * Math.min(6, list.length))]);
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

  function land(f, s) {
    f.spot = s; f.mode = 'land';
    // sit on the bloom: the body's middle just above the head
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

  function place(f, bob) {
    const x = Math.round(f.x - (f.left ? f.w - f.ax : f.ax)), y = Math.round(f.y - f.ay - f.h * .12 + bob);
    if (x === f.px && y === f.py) return;
    f.px = x; f.py = y;
    f.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
  function face(f, left) { if (left !== f.left) { f.left = left; f.px = NaN; f.el.classList.toggle('l', left); } }
  function shut(f, v) { if (v !== f.shut) { f.shut = v; f.el.classList.toggle('shut', v); } }

  // returns when this one next needs a frame (0 = every frame)
  function step(f, dt, now) {
    const k = f.kin;
    if (f.mode === 'perch') {
      const e = (now - f.landAt) / 1000;
      // settles a pixel or two, with a little bounce
      place(f, e < .7 ? 2.4 * Math.exp(-6 * e) * Math.sin(15 * e) : 0);
      // slow wingbeats: open, then a slow close every second or two, sometimes twice
      if (now >= f.flapAt) {
        if (f.shut) { shut(f, false); f.flapAt = now + (f.double ? 160 : rnd(1100, 2200)); f.double = !f.double && Math.random() < .3; }
        else { shut(f, true); f.flapAt = now + 260; }
      }
      if (fine && t - cursor.at < .3 && Math.hypot(cursor.x - f.x, cursor.y - f.y) < k.shy * .75) { lift(f, 'flee'); return 0; }
      if (now >= f.liftAt) { lift(f); return 0; }
      return e < .7 ? 0 : Math.min(f.flapAt, f.liftAt);
    }

    let tx = f.tx, ty = f.ty, speed = k.speed, turn = 2.4;
    if (f.mode === 'orbit') {
      const cx = (mark[0] + mark[2]) / 2, cy = (mark[1] + mark[3]) / 2, rx = (mark[2] - mark[0]) / 2 + 70, ry = (mark[3] - mark[1]) / 2 + 60;
      f.theta += f.dir * 1.05 * dt; f.swept += 1.05 * dt;
      tx = cx + Math.cos(f.theta) * rx; ty = cy + Math.sin(f.theta) * ry;
      speed *= 1.25; turn = 3.2;
      if (f.swept > Math.PI * 2) pick(f);
    } else if (f.mode === 'leave') {
      speed = 300; turn = 2.6;
    }
    const dx = tx - f.x, dy = ty - f.y, dist = Math.hypot(dx, dy) || 1;
    let ax, ay;
    if (f.mode === 'flee') {
      const e = f.esc, age = t - e.t0;
      // the jinks: a new heading every 70–150ms, never swinging too far off the getaway line
      if (t >= e.next) {
        e.head = e.base + Math.max(-.8, Math.min(.8, e.head - e.base + rnd(-.8, .8)));
        e.next = t + rnd(.07, .15);
        // and the getaway line itself drifts, so it curls off rather than flying a ruler-straight line, but keeps climbing
        e.base = up(e.base + rnd(-.25, .25));
      }
      const sp = k.speed + (e.burst - k.speed) * Math.exp(-age * 2.1);
      ax = Math.cos(e.head) * sp; ay = Math.sin(e.head) * sp;
      turn = 11;
      f.timer -= dt;
      if (f.timer <= 0) {
        const p = sky(); f.tx = p.x; f.ty = p.y; f.mode = 'wander'; f.timer = rnd(2, 4);
      }
    } else {
      // lazy heading noise, so it never flies straight at anything
      const wob = f.mode === 'land' ? Math.min(1, dist / 120) : f.mode === 'leave' ? .25 : 1;
      const head = Math.atan2(dy, dx) + (Math.sin(t * 1.3 + f.ph) * .7 + Math.sin(t * 3.1 + f.ph * 2) * .35) * wob;
      const sp = f.mode === 'land' ? Math.min(speed, dist * 2.2 + 12) : speed;
      ax = Math.cos(head) * sp; ay = Math.sin(head) * sp;
    }
    // the type and the buttons push gently, unless it's landing beside them
    if (f.mode !== 'land' && f.mode !== 'leave') for (const r of avoid) if (inRect(f.x, f.y, r, 30)) {
      const cx = (r[0] + r[2]) / 2, cy = (r[1] + r[3]) / 2, d = Math.hypot(f.x - cx, f.y - cy) || 1;
      ax += (f.x - cx) / d * 160; ay += (f.y - cy) / d * 220;
    }
    // stay in the garden while wandering
    if (f.mode === 'wander' || f.mode === 'orbit') {
      if (f.x < 30) ax += 120; if (f.x > W - 30) ax -= 120;
      if (f.y < 50) ay += 120; if (f.y > H * .86) ay -= 120;
    } else if (f.mode === 'flee') {
      // near an edge it veers along it instead of vanishing: across the top, back in from the sides
      const e = f.esc;
      if (f.y < 60) { ay = Math.max(ay, 0) + (60 - f.y) * 6; e.base = Math.cos(e.base) < 0 ? -2.75 : -.4; }
      if (f.x < 30) { ax += (30 - f.x) * 8; e.base = -.7; }
      if (f.x > W - 30) { ax -= (f.x - W + 30) * 8; e.base = -2.45; }
    }
    const kk = Math.min(1, dt * turn);
    f.vx += (ax - f.vx) * kk; f.vy += (ay - f.vy) * kk;
    f.x += f.vx * dt; f.y += f.vy * dt;
    // it turns to face where it's going; mid-escape only for a real change of direction, so the jinks don't flicker it
    if (Math.abs(f.vx) > (f.mode === 'flee' ? 90 : 14)) face(f, f.vx < 0);

    // wings: quick stepped beats, with the odd glide; the body lifts a pixel on each downstroke
    const fast = f.mode === 'flee' || f.mode === 'leave';
    if (now >= f.flapAt) {
      if (!fast && !f.shut && now > f.glideTill && Math.random() < k.glide * .06) f.glideTill = now + rnd(300, 600);
      const gliding = now < f.glideTill || (f.mode === 'land' && dist < 36);
      shut(f, gliding ? false : !f.shut);
      // a beat as fast as a frame or two while it bolts, slowing back to its own rhythm as it calms down
      const calm = f.mode === 'flee' ? 1 - Math.exp(-(t - f.esc.t0) * 1.6) : 1;
      f.flapAt = now + (f.mode === 'flee' ? 34 + (k.flap - 34) * calm : fast ? 62 : k.flap);
      if (f.mode === 'flee' && !f.shut) f.vy -= 40 * (1 - calm);
    }
    const bob = Math.sin(t * 2.2 + f.ph) * 4 + (f.shut ? -2 : 0);
    place(f, f.mode === 'land' ? bob * Math.min(1, dist / 30) : bob);

    if (fine && f.mode !== 'flee' && f.mode !== 'leave' && t - cursor.at < .3 && Math.hypot(cursor.x - f.x, cursor.y - f.y) < k.shy) lift(f, 'flee');
    if (f.mode === 'land' && dist < 3) {
      f.x = tx; f.y = ty; f.vx = f.vy = 0;
      f.mode = 'perch'; f.landAt = now; f.liftAt = now + rnd(2000, 6000) * k.sit; f.flapAt = now + rnd(500, 900);
      shut(f, false);
    }
    if (f.mode === 'wander') { f.timer -= dt; if (f.timer <= 0 || dist < 20) pick(f); }
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
    for (const f of [...flies]) { const n = step(f, dt, now); next = n ? Math.min(next, n) : 0; }
    if (!flies.length) return;
    // everyone's sitting still: sleep until the next wingbeat or lift-off
    if (next > now + 40) { clearTimeout(sleepT); sleepT = setTimeout(wake, Math.min(next, now + 4000) - now); return; }
    raf = requestAnimationFrame(loop);
  }
  function wake() {
    clearTimeout(sleepT);
    if (!raf && !dead && !reduced) raf = requestAnimationFrame(loop);
  }

  const onMove = e => {
    if (e.pointerType !== 'mouse') return;
    cursor.x = e.pageX - hx; cursor.y = e.pageY - hy; cursor.at = t;
    if (flies.length && e.pageY < H + 200) wake();
  };
  if (fine && !reduced) addEventListener('pointermove', onMove, { passive: true });
  const io = new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; if (visible) wake(); });
  io.observe(host);
  const onVis = () => { if (!document.hidden) wake(); };
  document.addEventListener('visibilitychange', onVis);
  measure();

  /** The nearest one that's free may wander over to a new flower. */
  function visit(spot) {
    if (!spot || reduced) return;
    const ok = flies.filter(f => f.mode !== 'leave' && f.mode !== 'flee');
    if (!ok.length || busy().some(o => Math.hypot(o.x - spot.x, o.y - spot.y) < 34) || flies.some(f => f.spot && Math.hypot(f.spot.x - spot.x, f.spot.y - spot.y) < 34)) return;
    ok.sort((a, b) => Math.hypot(a.x - spot.x, a.y - spot.y) - Math.hypot(b.x - spot.x, b.y - spot.y));
    land(ok[0], spot);
    wake();
  }
  /** Everyone off-screen, out the nearest side and up a little. */
  function scatter() {
    for (const f of [...flies]) {
      if (reduced) { f.el.classList.add('out'); setTimeout(() => f.el.remove(), 400); flies.splice(flies.indexOf(f), 1); continue; }
      f.spot = null; f.mode = 'leave';
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
