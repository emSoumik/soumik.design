// what the vayu page does: the walk and the phone app (they play on their own while on screen, until you take over),
// the decisions you can flip, the chart that draws in, the alerts you can set off, and the look switches. nothing
// runs off screen, and under reduced motion nothing plays by itself: the steps still work, they just jump
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (t: number) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type Step = { s: string; d: number; clock?: string; tap?: string; path?: 'a' | 'b'; from?: number; to?: number; air?: boolean; routes?: boolean; aqi?: [number, number] };

export function show(w: HTMLElement, s: string) {
  w.querySelectorAll<HTMLElement>('.sc').forEach((el) => el.classList.toggle('on', el.dataset.s === s));
}
export function tap(w: HTMLElement, tone: string) {
  w.style.setProperty('--tap', tone);
  if (reduced) return;
  w.classList.remove('tap');
  void w.offsetWidth;
  w.classList.add('tap');
}
// the AQI bands as pigments, and the darker shade of each that's fit for text
const bands: [number, string, string][] = [[50, '#22A04B', '#1B7A3A'], [100, '#F5B700', '#8A6100'], [150, '#FF8A00', '#B85A00'], [200, '#E0301E', '#B8210F'], [300, '#7A2F9A', '#66247F'], [1e9, '#7A1F3D', '#7A1F3D']];
const band = (v: number) => { const b = bands.find(([max]) => v <= max)!; return [b[1], b[2]]; };
// a section comes into view: run f(true), and f(false) when it leaves
const seen = (el: Element, f: (on: boolean) => void, threshold = .35) =>
  new IntersectionObserver(([e]) => f(e.isIntersecting), { threshold }).observe(el);

// one indicator shared by a row of options: a copy of the row in its chosen style, clipped to the chosen one.
// moving the clip slides it across, and the label's colour changes exactly under it
function indicator(row: HTMLElement, btns: HTMLElement[]) {
  const ind = document.createElement('span');
  ind.className = 'vy-ind';
  ind.setAttribute('aria-hidden', 'true');
  btns.forEach((b) => { const s = document.createElement('span'); s.innerHTML = b.innerHTML; ind.append(s); });
  row.append(ind);
  let cur = 0;
  const draw = () => {
    const b = btns[cur], W = row.offsetWidth, H = row.offsetHeight, r = Math.min(b.offsetHeight / 2, 99);
    ind.style.clipPath = `inset(${b.offsetTop}px ${W - b.offsetLeft - b.offsetWidth}px ${H - b.offsetTop - b.offsetHeight}px ${b.offsetLeft}px round ${r}px)`;
  };
  // the first placement, and any after a resize, lands without sliding
  new ResizeObserver(() => {
    ind.classList.remove('go');
    draw();
    requestAnimationFrame(() => requestAnimationFrame(() => ind.classList.add('go')));
  }).observe(row);
  return (k: number) => { cur = k; draw(); };
}

// a radio group of real buttons: arrows move and choose, like a native one
function radios(group: HTMLElement, pick: (k: number, user: boolean) => void) {
  const btns = [...group.querySelectorAll<HTMLButtonElement>('button')];
  const move = indicator(group, btns);
  const set = (k: number, user = false, focus = false) => {
    btns.forEach((x, j) => { x.setAttribute('aria-checked', String(j === k)); x.tabIndex = j === k ? 0 : -1; });
    if (focus) btns[k].focus();
    move(k);
    pick(k, user);
  };
  btns.forEach((b, k) => {
    b.addEventListener('click', () => set(k, true));
    b.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      set((k + d + btns.length) % btns.length, true, true);
    });
  });
  set(Math.max(0, btns.findIndex((b) => b.getAttribute('aria-checked') === 'true')));
  return set;
}

// the walk: the dot walks the map, the watch follows, the steps under it say where you are. it plays on its own
// while it's on screen; touch a step, press an arrow or pause, and it waits for you
function walk(root: HTMLElement) {
  const steps: Step[] = JSON.parse(root.dataset.walk!);
  const btns = [...root.querySelectorAll<HTMLButtonElement>('[data-step]')];
  const caps = [...root.querySelectorAll<HTMLElement>('[data-cap]')];
  const live = root.querySelector<HTMLElement>('[data-live]')!;
  const row = root.querySelector<HTMLElement>('.vy-steps-row')!;
  const scroller = root.querySelector<HTMLElement>('.vy-steps')!;
  const pp = root.querySelector<HTMLButtonElement>('[data-pp]')!;
  const w = root.querySelector<HTMLElement>('[data-watch]')!;
  const map = root.querySelector<HTMLElement>('[data-map]')!;
  const dot = map.querySelector<SVGGElement>('[data-dot]')!;
  const paths = { a: map.querySelector<SVGPathElement>('[data-path="a"]')!, b: map.querySelector<SVGPathElement>('[data-path="b"]')! };
  const aqi = w.querySelector<HTMLElement>('[data-aqi]');
  const knob = w.querySelector<HTMLElement>('.sc-scale i');
  const move = indicator(row, btns);
  let i = 0, t0 = 0, raf = 0, on = false, held = reduced;

  const place = (st: Step, p: number) => {
    if (!st.path) return;
    const path = paths[st.path];
    const f = (st.from ?? 0) + ((st.to ?? 0) - (st.from ?? 0)) * p;
    const pt = path.getPointAtLength(f * path.getTotalLength());
    dot.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    path.style.setProperty('--p', String(f));
    // the first leg stays drawn once you've walked it
    if (st.path === 'b') paths.a.style.setProperty('--p', '1');
    else paths.b.style.setProperty('--p', '0');
    if (st.aqi && aqi && knob) {
      const [x, y] = st.aqi;
      aqi.textContent = String(Math.round(x + (y - x) * p));
      const v = x + (y - x) * p;
      knob.style.setProperty('--at', String(Math.min(1, v / 300)));
      // the card takes the colour of the band the number is in
      const card = knob.closest<HTMLElement>('.sc-aqi');
      if (card) { const [c, ink] = band(v); card.style.setProperty('--band', c); card.style.setProperty('--band-ink', ink); }
    }
  };
  const pause = (yes: boolean) => {
    held = yes;
    root.classList.toggle('held', yes);
    pp.setAttribute('aria-label', yes ? 'Play the walk' : 'Pause the walk');
    // while it plays by itself the captions stay quiet for screen readers; once you drive, they're read
    live.setAttribute('aria-live', yes ? 'polite' : 'off');
    if (!yes) { t0 = performance.now() - steps[i].d; run(); }
  };
  const run = () => { if (on && !raf) raf = requestAnimationFrame(frame); };
  const enter = (k: number, user = false) => {
    i = k;
    t0 = performance.now();
    const st = steps[k];
    btns.forEach((b, j) => { if (j === k) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); b.tabIndex = j === k ? 0 : -1; });
    caps.forEach((c, j) => c.classList.toggle('on', j === k));
    move(k);
    // keep the step in view in its row, without moving the page
    if (scroller.scrollWidth > scroller.clientWidth) {
      const b = btns[k];
      scroller.scrollTo({ left: b.offsetLeft - (scroller.clientWidth - b.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
    }
    show(w, st.s);
    w.querySelectorAll<HTMLElement>('[data-clock]').forEach((c) => st.clock && (c.textContent = st.clock));
    if (st.tap) tap(w, st.tap);
    map.dataset.air = st.air ? 'bad' : 'ok';
    map.toggleAttribute('data-routes', !!st.routes);
    place(st, reduced ? 1 : 0);
    if (user && !held) pause(true);
    run();
  };
  const frame = (now: number) => {
    raf = 0;
    const st = steps[i];
    const p = Math.min(1, (now - t0) / st.d);
    place(st, reduced ? 1 : ease(p));
    if (!held && now - t0 >= st.d + 600) enter((i + 1) % steps.length);
    else if (on && (!held || p < 1)) raf = requestAnimationFrame(frame);
  };

  btns.forEach((b, k) => b.addEventListener('click', () => enter(k, true)));
  // arrows step it whenever the walk has focus: a step, the pause button or the stage itself
  root.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    const n = (i + d + steps.length) % steps.length;
    enter(n, true);
    if (btns.includes(document.activeElement as HTMLButtonElement)) btns[n].focus();
  });
  pp.addEventListener('click', () => pause(!held));
  enter(0);
  // under reduced motion it starts paused; play still works, a step at a time without the travel
  if (reduced) pause(true);
  seen(root, (yes) => { on = yes; if (yes) { t0 = performance.now() - (held ? steps[i].d : 0); run(); } });
}

// the phone app: three tabs on a loop, the dock pill slides, each screen lays its pieces in, and the watch beside it
// shows the same moment. like the walk it plays while on screen until you take over
function app(root: HTMLElement) {
  const steps: { s: string; w: string; d: number }[] = JSON.parse(root.dataset.app!);
  const btns = [...root.querySelectorAll<HTMLButtonElement>('[data-step]')];
  const caps = [...root.querySelectorAll<HTMLElement>('[data-cap]')];
  const live = root.querySelector<HTMLElement>('[data-live]')!;
  const row = root.querySelector<HTMLElement>('.vy-steps-row')!;
  const scroller = root.querySelector<HTMLElement>('.vy-steps')!;
  const pp = root.querySelector<HTMLButtonElement>('[data-pp]')!;
  const phone = root.querySelector<HTMLElement>('[data-phone]')!;
  const dock = phone.querySelector<HTMLElement>('[data-dock]')!;
  const screens = [...phone.querySelectorAll<HTMLElement>('.ph-s')];
  const tabs = [...dock.querySelectorAll<HTMLButtonElement>('[data-tab]')];
  const w = root.querySelector<HTMLElement>('[data-watch]')!;
  const move = indicator(row, btns);
  let i = 0, timer = 0, on = false, held = reduced;

  const enter = (k: number, user = false) => {
    i = k;
    clearTimeout(timer);
    btns.forEach((b, j) => { if (j === k) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); b.tabIndex = j === k ? 0 : -1; });
    caps.forEach((c, j) => c.classList.toggle('on', j === k));
    tabs.forEach((t, j) => t.classList.toggle('on', j === k));
    screens.forEach((el) => el.classList.toggle('on', el.dataset.s === steps[k].s));
    dock.style.setProperty('--i', String(k));
    phone.dataset.tab = steps[k].s;
    show(w, steps[k].w);
    move(k);
    if (scroller.scrollWidth > scroller.clientWidth) {
      const b = btns[k];
      scroller.scrollTo({ left: b.offsetLeft - (scroller.clientWidth - b.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
    }
    if (user && !held) pause(true);
    schedule();
  };
  const schedule = () => {
    clearTimeout(timer);
    if (on && !held) timer = window.setTimeout(() => enter((i + 1) % steps.length), steps[i].d);
  };
  const pause = (yes: boolean) => {
    held = yes;
    root.classList.toggle('held', yes);
    pp.setAttribute('aria-label', yes ? 'Play the phone app' : 'Pause the phone app');
    live.setAttribute('aria-live', yes ? 'polite' : 'off');
    schedule();
  };
  btns.forEach((b, k) => b.addEventListener('click', () => enter(k, true)));
  tabs.forEach((t, k) => t.addEventListener('click', () => enter(k, true)));
  root.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    const n = (i + d + steps.length) % steps.length;
    enter(n, true);
    if (btns.includes(document.activeElement as HTMLButtonElement)) btns[n].focus();
  });
  pp.addEventListener('click', () => pause(!held));
  enter(0);
  if (reduced) pause(true);
  // each screen lays itself in when it comes on, so the first one waits until the stage is on screen
  screens.forEach((el) => el.classList.remove('on'));
  seen(root, (yes) => {
    on = yes;
    if (yes) { screens[i].classList.add('on'); schedule(); }
    else clearTimeout(timer);
  }, .4);
}

// a decision: the first idea, then what we kept. each card flips once on its own when you reach it, then it's yours
function call(card: HTMLElement) {
  const w = card.querySelector<HTMLElement>('[data-watch]')!;
  const group = card.querySelector<HTMLElement>('[role="radiogroup"]')!;
  const tag = card.querySelector<HTMLElement>('[data-tag]')!;
  let touched = false;
  const set = radios(group, (k, user) => {
    const b = group.querySelectorAll<HTMLButtonElement>('button')[k];
    show(w, b.dataset.s!);
    w.setAttribute('aria-label', b.dataset.label!);
    card.dataset.state = k ? 'kept' : 'first';
    tag.textContent = k ? 'what we kept' : 'the idea we dropped';
    if (user) touched = true;
  });
  if (reduced) return;
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    setTimeout(() => { if (!touched) set(1); }, 1100);
  }, { threshold: .7 });
  io.observe(w);
}

export function stories() {
  document.documentElement.classList.add('vy-js');
  document.querySelectorAll<HTMLElement>('[data-walk]').forEach(walk);
  document.querySelectorAll<HTMLElement>('[data-app]').forEach(app);
  document.querySelectorAll<HTMLElement>('[data-call]').forEach(call);

  // the chart draws in once
  document.querySelectorAll<HTMLElement>('[data-draw]').forEach((el) => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }, { threshold: .4 });
    io.observe(el);
  });

  // stages ease in once as they arrive. anything already on screen at load just stays put
  const rise = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('vy-on');
    rise.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll<HTMLElement>('[data-in]').forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight) return;
    el.classList.add('vy-pre');
    rise.observe(el);
  });

  // the alerts: each one taps its own pattern, its rhythm lights up as it plays, and a phone that can vibrate does it
  document.querySelectorAll<HTMLButtonElement>('[data-buzz]').forEach((b) => {
    const pat = b.querySelector<HTMLElement>('.vy-pat');
    const buzz: number[] = JSON.parse(b.dataset.buzz!);
    const total = buzz.reduce((a, n) => a + n, 0);
    b.addEventListener('click', () => {
      tap(b.querySelector<HTMLElement>('[data-watch]')!, b.dataset.tone!);
      navigator.vibrate?.(buzz);
      if (!pat || reduced) return;
      pat.style.setProperty('--ms', `${total}ms`);
      pat.classList.remove('go'); void pat.offsetWidth; pat.classList.add('go');
    });
  });

  // the look: face, shape and screen, each a radio group of real buttons
  document.querySelectorAll<HTMLElement>('[data-look]').forEach((look) => {
    const w = look.querySelector<HTMLElement>('[data-watch]')!;
    look.querySelectorAll<HTMLElement>('[data-switch]').forEach((sw) => {
      const kind = sw.dataset.switch!;
      const btns = [...sw.querySelectorAll<HTMLButtonElement>('button')];
      radios(sw, (k) => {
        const v = btns[k].dataset.v!;
        if (kind === 'face') w.dataset.face = v;
        else if (kind === 'shape') w.dataset.shape = v;
        else show(w, v);
      });
    });
  });
}
