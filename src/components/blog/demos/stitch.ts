// stitch: the daisy goes in a stitch at a time, the newest flashing pale for a moment the way the garden's do, or fades
// in whole over the same time, to compare. the slider sets the pace; the garden's own is 26 ms a stitch. it plays once
// when it's first properly on screen, then waits for "play again". sound is the garden's own, through feel
import { feel } from '../../../../js/feel.js';

const FAST = 8, SLOW = 120;
const msAt = (v: number) => SLOW * (FAST / SLOW) ** (v / 100);
const vAt = (ms: number) => Math.log(ms / SLOW) / Math.log(FAST / SLOW) * 100;

export function mount(el: HTMLElement) {
  const svg = el.querySelector<SVGSVGElement>('.st-svg')!;
  const cells = [...svg.querySelectorAll<SVGRectElement>('rect:not(.st-flash)')];
  const flash = svg.querySelector<SVGRectElement>('.st-flash')!;
  const seg = el.querySelector<HTMLElement>('.dm-seg')!;
  const modes = [...seg.querySelectorAll<HTMLButtonElement>('button')];
  const range = el.querySelector<HTMLInputElement>('.dm-range input')!;
  const again = el.querySelector<HTMLButtonElement>('[data-play]')!;
  const t = el.querySelector('[data-t]')!;
  const n = cells.length;
  // which part each stitch is, for the sound to follow
  const part = cells.map((c) => ['stem', 'leaf', 'petal'][+c.dataset.o!]);

  let fade = false, ms = 26, raf = 0, t0 = 0, run = 0, shown = 0;
  range.value = String(vAt(ms));
  const total = () => n * ms;
  const paintT = () => { t.textContent = `${(total() / 1000).toFixed(1)} s`; range.setAttribute('aria-valuetext', `${Math.round(ms)} milliseconds a stitch`); };

  function frame(now: number) {
    const e = now - t0;
    if (fade) {
      const a = Math.min(1, e / total());
      // ease-out, the way most things fade in on the web
      svg.style.setProperty('--a', String(1 - (1 - a) ** 3));
      raf = a < 1 ? requestAnimationFrame(frame) : 0;
      return;
    }
    const k = Math.min(n, Math.floor(e / ms) + 1);
    if (k !== shown) {
      for (let i = shown; i < k; i++) feel.stitch({ id: `st${run}`, kind: 'daisy', part: part[i], p: (i + 1) / n });
      shown = k;
      svg.style.setProperty('--k', String(k));
      const c = cells[k - 1];
      if (k < n) { flash.setAttribute('x', c.getAttribute('x')!); flash.setAttribute('y', c.getAttribute('y')!); }
      else flash.setAttribute('x', '-99');
    }
    raf = k < n ? requestAnimationFrame(frame) : 0;
  }
  function play() {
    cancelAnimationFrame(raf);
    run++; shown = 0;
    svg.classList.toggle('fade', fade);
    svg.style.setProperty('--k', '0'); svg.style.setProperty('--a', '0');
    flash.setAttribute('x', '-99');
    feel.plant(1, undefined, { id: `st${run}`, kind: 'daisy' });
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function show() { cancelAnimationFrame(raf); raf = 0; svg.style.setProperty('--k', String(n)); svg.style.setProperty('--a', '1'); flash.setAttribute('x', '-99'); }
  function setMode(f: boolean) {
    fade = f;
    seg.dataset.v = f ? '1' : '0';
    modes.forEach((b, i) => b.setAttribute('aria-checked', String(i === +f)));
    play();
  }

  [...modes, range, again].forEach((c) => (c.disabled = false));
  modes.forEach((b, i) => {
    b.addEventListener('click', () => setMode(!!i));
    b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setMode(!i); modes[+!i].focus(); } });
  });
  range.addEventListener('input', () => { ms = msAt(+range.value); paintT(); });
  range.addEventListener('change', play);
  again.addEventListener('click', play);
  paintT();

  // empty while it's still off screen, then it plays the first time it's well in view. with reduced motion it stays
  // whole until asked
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) {
    svg.style.setProperty('--k', '0');
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); play(); } }, { threshold: .6 });
    io.observe(svg);
  }
  return { reset: () => { ms = 26; range.value = String(vAt(ms)); paintT(); fade ? setMode(false) : play(); }, show };
}
