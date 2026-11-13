// PROTOTYPE: the lab's clock. every moving thing (a scripted demo, a rotation, a recording) is a runner: it runs
// only while it's on screen, in the variant that's showing, with the tab in front, and not paused by its variant's
// pause button. leaving starts the lap over next time. reduced motion parks each one on its most telling frame
export type Beat = [at: number, run: () => void];
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Run = { el: HTMLElement; seen: boolean; on: boolean; start: () => void; stop: () => void };
const runs: Run[] = [];
const held = (el: HTMLElement) => !!el.closest('[data-held]');
export const refresh = () => runs.forEach((r) => {
  const want = r.seen && !document.hidden && !held(r.el);
  if (want === r.on) return;
  r.on = want;
  if (want) r.start(); else r.stop();
});
const io = new IntersectionObserver((es) => {
  es.forEach((e) => runs.forEach((r) => { if (r.el === e.target) r.seen = e.isIntersecting; }));
  refresh();
}, { threshold: 0.2 });
document.addEventListener('visibilitychange', refresh);
const add = (el: HTMLElement, start: () => void, stop: () => void) => { runs.push({ el, seen: false, on: false, start, stop }); io.observe(el); };

export function loop(el: HTMLElement, beats: Beat[], length: number, still: () => void) {
  if (reduced) { still(); return; }
  let timers: number[] = [];
  const lap = () => {
    beats.forEach(([at, run]) => timers.push(window.setTimeout(run, at)));
    timers.push(window.setTimeout(lap, length));
  };
  add(el, lap, () => { timers.forEach(clearTimeout); timers = []; });
}

// one item lit at a time, stepping on a timer. `.done` marks the ones already passed; prev/next restart the wait
export function rotate(root: HTMLElement, items: HTMLElement[], ms: number, onStep?: (i: number) => void) {
  let i = 0, t = 0, on = false;
  root.style.setProperty('--step', `${ms}ms`);
  const show = (n: number) => {
    i = (n + items.length) % items.length;
    items.forEach((el, k) => { el.classList.toggle('on', k === i); el.classList.toggle('done', k < i); });
    onStep?.(i);
    clearTimeout(t);
    if (on) t = window.setTimeout(() => show(i + 1), ms);
  };
  show(0);
  if (!reduced) add(root, () => { on = true; root.classList.remove('still'); show(i); }, () => { on = false; root.classList.add('still'); clearTimeout(t); });
  else root.classList.add('still');
  return { go: show, next: () => show(i + 1), prev: () => show(i - 1) };
}

// recordings play while they're on screen; reduced motion keeps them on their poster
export function videos(root: ParentNode) {
  if (reduced) return;
  root.querySelectorAll('video').forEach((v) => add(v, () => { v.preload = 'auto'; v.play().catch(() => {}); }, () => v.pause()));
}

// the pause button on a stage holds everything in its variant
export function holds(root: ParentNode) {
  root.querySelectorAll<HTMLButtonElement>('[data-hold]').forEach((b) => {
    if (reduced) { b.hidden = true; return; }
    b.addEventListener('click', () => {
      const v = b.closest<HTMLElement>('[data-variant]')!;
      const now = !v.hasAttribute('data-held');
      v.toggleAttribute('data-held', now);
      v.querySelectorAll<HTMLButtonElement>('[data-hold]').forEach((x) => {
        x.setAttribute('aria-pressed', String(now));
        x.querySelector('.lb')!.textContent = now ? 'Play' : 'Pause';
      });
      refresh();
    });
  });
}

// ---- the store on a phone: home, shop, quick add, added, the bag, home again. the lap starts and ends on home ----
// targets are percentages of the screen, read off the real screenshots
const P = { shopTab: [33.5, 94], plus: [42.3, 38.1], add: [50, 89.9], cart: [50, 94], homeTab: [17.3, 94] } as const;

function finger(el: HTMLElement) {
  const x = el.querySelector<HTMLElement>('.tch')!, y = x.firstElementChild as HTMLElement, dot = y.firstElementChild as HTMLElement;
  return {
    to: ([a, b]: readonly number[], snap = false) => {
      x.classList.toggle('snap', snap);
      x.style.transform = `translateX(${a}%)`;
      y.style.transform = `translateY(${b}%)`;
    },
    show: (v: boolean) => dot.classList.toggle('in', v),
    press: () => { dot.classList.remove('down'); void dot.offsetWidth; dot.classList.add('down'); },
  };
}

// the beat goes on the demo and on its variant, and every [data-beat-id] in the variant lights when it matches
function tell(el: HTMLElement, beat: string) {
  el.dataset.beat = beat;
  const v = el.closest<HTMLElement>('[data-variant]');
  if (!v) return;
  v.dataset.beat = beat;
  v.querySelectorAll<HTMLElement>('[data-beat-id]').forEach((b) => b.classList.toggle('on', b.dataset.beatId === beat));
}

export function phone(el: HTMLElement) {
  const f = finger(el);
  const beats: Beat[] = [
    [0, () => { tell(el, 'home'); f.show(false); f.to([62, 70], true); }],
    [700, () => f.show(true)],
    [820, () => f.to(P.shopTab)],
    [1550, f.press], [1700, () => tell(el, 'shop')],
    [2200, () => f.to(P.plus)],
    [2950, f.press], [3100, () => tell(el, 'sheet')],
    [4300, () => f.to(P.add)],
    [5050, f.press], [5200, () => tell(el, 'added')],
    [6000, () => f.to(P.cart)],
    [6700, f.press], [6850, () => tell(el, 'cart')],
    [8300, () => f.to(P.homeTab)],
    [9050, f.press], [9200, () => tell(el, 'home')],
    [9700, () => f.show(false)],
  ];
  loop(el, beats, 11000, () => tell(el, 'sheet'));
}
