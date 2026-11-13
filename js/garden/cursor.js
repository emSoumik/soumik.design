// The garden's cursor, for a mouse: a pastel pixel arrow drawn on a canvas and moved by hand (a real cursor image can't
// move), so it can stretch along a swipe, press in when you click, take on the colours of the flower it's over, and answer
// a tap with a few marks at the tip.
//   const cursor = createCursor({ canvas, hover(x, y), peek(x, y, id) })   // x, y in canvas pixels; peek is garden.peek
//   cursor.tapped(result)   // what garden.plant just returned, called before the pointerdown reaches the cursor
// nothing runs once it settles. with reduced motion it only presses in and takes on a flower's colours
const S = 1.75, PAD = 1, OX = PAD * S + 1;
// the tip is the top-left cell and the arrow leans the way a system pointer does. a cell is 1.75px, so it's a touch bigger
// than a system pointer
const ARROW = ['#............', '##...........', '#o#..........', '.#o#.........', '.#oo#........', '.#ooo#.......', '.#oooo#......', '.#ooooo#.....',
  '..#ooooo##...', '..#ooooooo#..', '..#ooooo##...', '..#oooo#.....', '..#o##o#.....', '...#..#o#....', '......#o#....', '.......#o#...', '.......###...'];
const INK = '#7cc0f7', CONF = ['#fde9a5', '#f9c6e4', '#cfe9fb', '#cdeedd', '#e3dcf8'];
// stronger cousins of the confetti, for marks that sit on white
const POP = ['#f7c531', '#f6a3cf', '#7cc0f7', '#8fd9b4', '#b9a8f0'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = list => list[Math.floor(Math.random() * list.length)], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// a flower colour, washed halfway to white so it sits with the pastels
const wash = hex => { const n = parseInt(hex.slice(1), 16), c = s => Math.round((n >> s & 255) * .5 + 127.5); return `rgb(${c(16)},${c(8)},${c(0)})`; };
const DIRS = [[0, -1], [-1, -1], [-1, 0]];
const X3 = [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];

export function createCursor({ canvas, hover, peek }) {
  // the sprite: outline, and fill cells that each hold a confetti colour (base), the
  // colour they show now (col), and the one they're heading for (want: a flower's, while it's being tasted)
  const outline = [], fill = [];
  ARROW.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '#') outline.push([x, y]);
    else if (ch === 'o') { const c = rnd(CONF); fill.push({ x, y, base: c, col: c, want: c }); }
  }));
  const W = ARROW[0].length + PAD * 2, H = ARROW.length + PAD * 2, dpr = Math.min(3, devicePixelRatio || 1), fdpr = Math.min(2, devicePixelRatio || 1);
  const el = document.createElement('div'), sprite = document.createElement('canvas'), g = sprite.getContext('2d');
  sprite.width = Math.ceil(W * S * dpr); sprite.height = Math.ceil(H * S * dpr);
  sprite.style.cssText = `width:${W * S}px;height:${H * S}px;display:block;image-rendering:pixelated`;
  el.className = 'lc'; el.setAttribute('aria-hidden', 'true'); el.append(sprite); document.body.append(el);
  const fx = document.createElement('canvas'), f = fx.getContext('2d');
  fx.className = 'lc-fx'; fx.setAttribute('aria-hidden', 'true'); document.body.append(fx);
  const sizeFx = () => { fx.width = innerWidth * fdpr; fx.height = innerHeight * fdpr; fxDirty = true; };
  document.head.insertAdjacentHTML('beforeend', `<style>
    .lc { position: fixed; left: 0; top: 0; z-index: 1001; pointer-events: none; display: none; will-change: transform; transform-origin: ${OX}px ${OX}px; }
    .lc-fx { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 1000; pointer-events: none; }
  </style>`);

  // pointer (x, y) and where it was last frame; scale sc/sv; stretch k along ang
  let x = -99, y = -99, px = -99, py = -99, vx = 0, vy = 0, sc = 1, sv = 0, k = 0, ang = 0;
  let down = false, shown = false, running = false, last = 0, since = 0, tasteT = 0, fxDirty = false;
  // the flower under the pointer (garden.peek), every short-lived mark, and the last tap's result
  let over = null, pending = null;
  const items = [];
  sizeFx(); addEventListener('resize', sizeFx);

  function draw() {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, sprite.width, sprite.height);
    // cells are 1.75px, so each edge snaps to a device pixel and the arrow stays crisp
    const e = n => Math.round((n + PAD) * S * dpr);
    const put = (cx, cy, col) => { g.fillStyle = col; g.fillRect(e(cx), e(cy), e(cx + 1) - e(cx), e(cy + 1) - e(cy)); };
    for (const c of fill) put(c.x, c.y, c.col);
    for (const [cx, cy] of outline) put(cx, cy, INK);
  }
  const place = () => {
    // squash: a press shrinks it into the page, a release overshoots tall. stretch runs along the direction of travel
    const st = k > .002 ? `rotate(${ang}rad) scale(${1 + k},${1 - k * .45}) rotate(${-ang}rad) ` : '';
    el.style.transform = `translate3d(${x - OX}px,${y - OX}px,0) ${st}scale(${sc},${1 - (1 - sc) * 1.35})`;
  };

  // taste: the fill takes on the colours of the flower it's over, a few cells at a time, and gives them back after
  function setWants() {
    const cols = over ? [...new Set(over.cells.map(c => c[2]))].map(wash) : null;
    for (const c of fill) c.want = cols ? rnd(cols) : c.base;
    if (reduced) { for (const c of fill) c.col = c.want; draw(); }
    wake();
  }
  const tasting = () => fill.some(c => c.col !== c.want);
  function taste(t) {
    if (t - tasteT < 28) return false;
    tasteT = t;
    const todo = fill.filter(c => c.col !== c.want);
    for (let i = 0; i < 4 && todo.length; i++) { const c = todo.splice(Math.floor(Math.random() * todo.length), 1)[0]; c.col = c.want; }
    return true;
  }

  // ---- marks on the page --------------------------------------------------------------------------------------------
  // the marks sit on a 2px grid
  const dot = (vx0, vy0, s, col) => { f.fillStyle = col; const X = Math.round(vx0 * fdpr), Y = Math.round(vy0 * fdpr); f.fillRect(X, Y, Math.round((vx0 + s) * fdpr) - X, Math.round((vy0 + s) * fdpr) - Y); };
  const dot2 = (vx0, vy0, col) => dot(Math.round(vx0 / 2) * 2, Math.round(vy0 / 2) * 2, 2, col);

  // one frame of every mark; false once a mark is done
  function mark(m, t, dt) {
    const e = t - m.t0;
    if (e < 0) return true;
    if (m.type === 'p') {
      m.age += dt; if (m.age >= m.life) return false;
      m.vy += m.g * dt; m.x += m.vx * dt; m.y += m.vy * dt;
      // pixel art doesn't fade: in its last moments it blinks out
      if (m.age > m.life * .65 && Math.floor(m.age * 28) % 2) return true;
      dot2(m.x, m.y, m.col);
      return true;
    }
    if (m.type === 'ticks') {
      // three little impact lines flick out from the tip, away from the arrow's body
      const fr = Math.floor(e / 45); if (fr > 2) return false;
      const ds = [[2, 3], [4, 5], [6]][fr];
      for (const [dx, dy] of DIRS) for (const d of ds) dot2(m.x + dx * d * 2, m.y + dy * d * 2, INK);
      return true;
    }
    if (m.type === 'stitch') {
      // on bare soil: three tiny cross-stitches pop out from the tip, then shrink to a dot
      const fr = Math.floor(e / 55); if (fr > 3) return false;
      const d = [4, 6, 8, 9][fr];
      DIRS.forEach(([dx, dy], i) => {
        const cx = m.x + dx * d * 2, cy = m.y + dy * d * 2, col = m.cols[i];
        for (const [ix, iy] of fr < 3 ? X3 : X3.slice(0, 1)) dot2(cx + ix * 2, cy + iy * 2, col);
      });
      return true;
    }
    return false;
  }
  function paintFx(t, dt) {
    if (!items.length && !fxDirty) return false;
    f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, fx.width, fx.height);
    for (let i = items.length - 1; i >= 0; i--) if (!mark(items[i], t, dt)) items.splice(i, 1);
    fxDirty = false;
    return items.length > 0;
  }

  // ---- the loop: springs and marks, and nothing at all once they've settled ----------------------------------------
  function frame(t) {
    const dt = clamp((t - last) / 1000 || .016, .001, .033); last = t;
    const m = Math.min(1, dt * 16);
    vx += ((x - px) / dt - vx) * m; vy += ((y - py) / dt - vy) * m; px = x; py = y;
    // squash: pressed it sinks in, and it overshoots on the way back
    const sT = down ? .84 : 1;
    sv += ((sT - sc) * 560 - sv * 20) * dt; sc += sv * dt;
    if (reduced) { sc = sT; sv = 0; }
    // stretch: only when it's really travelling, and it eases off rather than snapping
    const sp = Math.hypot(vx, vy), kT = reduced ? 0 : Math.min(.16, Math.max(0, sp - 150) / 8000);
    if (sp > 80) ang = Math.atan2(vy, vx);
    k += (kT - k) * Math.min(1, dt * 18);
    if (shown && tasting() && taste(t)) draw();
    if (shown) place();
    const busy = paintFx(t, dt);
    const settled = Math.abs(sc - sT) < .002 && Math.abs(sv) < .02 && sp < 4 && k < .002 && !tasting();
    if ((settled || !shown) && !busy) {
      running = false;
      if (shown) { sc = sT; k = 0; sv = vx = vy = 0; draw(); place(); }
      return;
    }
    requestAnimationFrame(frame);
  }
  function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }

  // ---- what a click does ------------------------------------------------------------------------------------------
  const push = m => { items.push({ t0: performance.now(), ...m }); fxDirty = true; };
  // canvas-local: is a flower under the pointer, and which
  function look() {
    const R = canvas.getBoundingClientRect(), lx = x - R.left, ly = y - R.top;
    const nu = hover(lx, ly) ? peek?.(lx, ly) ?? null : null;
    const changed = nu?.id !== over?.id;
    over = nu;
    if (changed) setWants();
  }

  const show = () => { if (shown) return; shown = true; el.style.display = 'block'; canvas.style.cursor = 'none'; draw(); };
  const hide = () => {
    if (!shown) return;
    shown = false; el.style.display = 'none'; canvas.style.cursor = '';
    down = false; over = null; setWants(); for (const c of fill) c.col = c.want;
    fxDirty = true; wake();
  };

  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    if (e.target !== canvas) { hide(); return; }
    const first = !shown; show();
    x = e.clientX; y = e.clientY; if (first) { px = x; py = y; }
    look();
    since += Math.hypot(e.movementX, e.movementY);
    if (!reduced && Math.hypot(vx, vy) > 650 && since > 30) { since = 0; push({ type: 'p', x: x + 2, y: y + 3, vx: 0, vy: 10, g: 40, age: 0, life: .4, col: rnd(CONF) }); }
    place(); wake();
  }, { capture: true, passive: true });

  // main.js handles the tap first (its listener was added before this one) and plant() reports back through tapped(),
  // so by the time this runs we know whether the click turned a flower or planted one
  addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.target !== canvas || e.button !== 0) return;
    x = px = e.clientX; y = py = e.clientY; show();
    down = true;
    // instant: it's pressed in on this very frame, before the loop catches up
    sc = .84; sv = 0;
    const tap = pending && performance.now() - pending.t < 150 ? pending.p : null;
    pending = null;
    if (!reduced) {
      if (tap?.morphed) {
        push({ type: 'ticks', x, y });
      } else if (tap) push({ type: 'stitch', x, y, cols: [rnd(POP.slice(0, 2)), POP[2], rnd(POP.slice(3))] });
      else push({ type: 'ticks', x, y });
    }
    // the turned flower has new colours: taste them
    if (tap?.morphed) { const nu = peek?.(0, 0, tap.id); if (nu) { over = nu; setWants(); } }
    place(); paintFx(performance.now(), 0); wake();
  }, true);
  let upT = 0;
  const up = () => {
    if (!down) return;
    down = false; wake();
    // once the flower's sprung back up (or a new one's in), find it again so its colours are right
    clearTimeout(upT); upT = setTimeout(() => { if (shown) { look(); wake(); } }, 90);
  };
  addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true); addEventListener('blur', up);
  document.addEventListener('mouseleave', hide);
  canvas.addEventListener('pointerleave', hide);
  // the page scrolled under a still pointer: still over the garden? then find whatever's under it now
  addEventListener('scroll', () => { if (!shown) return; if (document.elementFromPoint(x, y) !== canvas) hide(); else { look(); wake(); } }, { passive: true });

  return { tapped: p => { pending = { p, t: performance.now() }; } };
}
