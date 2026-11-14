// the x-ray header: the rose fills in stitch by stitch, holds, and starts again. the css drives it from --k (how many
// stitches are in) until mount; then --k is parked and each step touches only the groups that changed, so a step
// doesn't restyle all of them. the slider scrubs; play picks up from there.
// it only runs while it's on screen, and with reduced motion it waits for play
const PART = ['stem', 'leaf', 'petal'];
const STEP = 78;          // ms a stitch: a third of the garden's own pace, slow enough to follow the numbers
const HOLD = 2400;        // the finished rose, before it starts again

export function mount(fig: HTMLElement) {
  const svg = fig.querySelector<SVGSVGElement>('.xr')!;
  const cells = [...fig.querySelectorAll<SVGRectElement>('.xr-cells rect')];
  const groups = [...fig.querySelectorAll<SVGGElement>('.xr-cells > g')];
  const now = fig.querySelector<SVGRectElement>('.xr-now')!;
  const range = fig.querySelector<HTMLInputElement>('.xr-scrub input')!;
  const play = fig.querySelector<HTMLButtonElement>('[data-play]')!;
  const read = fig.querySelector('.xr-read')!;
  const parts = fig.dataset.parts || '';
  const n = cells.length;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let k = reduced ? n : 0, shown = 0, playing = !reduced, seen = false, t0 = 0, timer = 0, holdT = 0;
  function show(v: number) {
    k = v;
    for (let i = Math.min(shown, v); i < Math.max(shown, v); i++) groups[i].style.opacity = i < v ? '1' : '0';
    shown = v;
    range.value = String(k);
    const c = cells[k - 1];
    if (c) { now.setAttribute('x', c.getAttribute('x')!); now.setAttribute('y', c.getAttribute('y')!); }
    else now.setAttribute('x', '-2');
    read.innerHTML = `<b>${String(k).padStart(3, '0')}</b> / ${n}<span>${k ? PART[+parts[k - 1]] : 'soil'}</span>`;
  }
  function frame() {
    timer = 0;
    if (!playing || !seen) return;
    const v = Math.min(n, Math.floor((performance.now() - t0) / STEP));
    if (v !== k) show(v);
    if (v >= n) { clearTimeout(holdT); holdT = window.setTimeout(() => { if (playing) { t0 = performance.now(); show(0); wake(); } }, HOLD); return; }
    wake();
  }
  const wake = () => { if (!timer && playing && seen) timer = window.setTimeout(frame, STEP); };
  function setPlaying(v: boolean) {
    playing = v;
    clearTimeout(holdT);
    play.setAttribute('aria-pressed', String(v));
    play.querySelector('.px')!.textContent = v ? 'pause' : 'play';
    if (v) { if (k >= n) show(0); t0 = performance.now() - k * STEP; wake(); }
  }

  // from here the inline opacities rule, not the css variable
  groups.forEach((g, i) => { g.style.opacity = i < k ? '1' : '0'; });
  shown = k;
  svg.style.setProperty('--k', '9999');
  range.disabled = false; play.disabled = false;
  range.addEventListener('input', () => { if (playing) setPlaying(false); show(+range.value); });
  play.addEventListener('click', () => setPlaying(!playing));
  new IntersectionObserver((es) => {
    seen = es[es.length - 1].isIntersecting;
    if (seen && playing) { t0 = performance.now() - k * STEP; wake(); }
  }).observe(fig);
  show(k);
  setPlaying(playing);
}
