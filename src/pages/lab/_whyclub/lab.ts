// LAB: small helpers the five directions share: the live embeds, reduced motion, and the switch event.

export const A = '/assets/work/whyclub/';
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** runs fn now if root is the visible direction, and again every time the switcher shows it */
export function whenShown(root: HTMLElement, fn: () => void) {
  const dir = root.closest<HTMLElement>('[data-dir]');
  if (dir && !dir.hidden) requestAnimationFrame(fn);
  addEventListener('lab:show', (e) => { if ((e as CustomEvent).detail === dir?.dataset.dir) requestAnimationFrame(fn); });
}

export interface Frame {
  send(msg: object): void;
  on(fn: (data: any) => void): void;
  readonly el: HTMLIFrameElement | null;
}

/**
 * a live embed (the real dock or pass, built from the store) inside holder. it loads once the holder is near the
 * viewport, renders at its native size w×h and is scaled down to the holder's width, so it never reflows inside
 */
export function frame(holder: HTMLElement, src: string, w: number, h: number, title: string, kind: 'dock' | 'pass'): Frame {
  let el: HTMLIFrameElement | null = null;
  let size = { w, h };
  const queue: object[] = [];
  const listeners: ((d: any) => void)[] = [];
  const fit = () => {
    if (!el) return;
    const k = holder.clientWidth / size.w;
    Object.assign(el.style, { width: `${size.w}px`, height: `${size.h}px`, transform: `scale(${k})` });
  };
  addEventListener('message', (e) => {
    if (!el || e.source !== el.contentWindow || e.data?.wc !== kind) return;
    listeners.forEach((fn) => fn(e.data));
  });
  const load = () => {
    el = document.createElement('iframe');
    el.src = src;
    el.title = title;
    el.setAttribute('scrolling', 'no');
    el.addEventListener('load', () => {
      holder.classList.add('is-live');
      queue.splice(0).forEach((m) => el!.contentWindow?.postMessage({ wc: kind, ...m }, '*'));
    }, { once: true });
    holder.append(el);
    fit();
  };
  new IntersectionObserver((entries, io) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    load();
  }, { rootMargin: '400px' }).observe(holder);
  new ResizeObserver(fit).observe(holder);
  return {
    get el() { return el; },
    send(msg) {
      if (el && holder.classList.contains('is-live')) el.contentWindow?.postMessage({ wc: kind, ...msg }, '*');
      else queue.push(msg);
    },
    on(fn) { listeners.push(fn); },
    // the pass can switch between its phone and desktop layouts
    resize(nw: number, nh: number) { size = { w: nw, h: nh }; fit(); },
  } as Frame & { resize(w: number, h: number): void };
}

/** the spring the store's dock uses, sampled into a css linear() easing (a port of why-club src/lib/springEasing.ts) */
export function springEasing(response: number, dampingRatio: number, samples = 48) {
  const omega = (2 * Math.PI) / response, zeta = dampingRatio;
  const at = (t: number) => {
    if (zeta >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
    const d = omega * Math.sqrt(1 - zeta * zeta), env = Math.exp(-zeta * omega * t);
    return 1 - env * (Math.cos(d * t) + ((zeta * omega) / d) * Math.sin(d * t));
  };
  let last = 0;
  for (let t = 0; t <= 3; t += 0.001) if (Math.abs(1 - at(t)) > 0.001) last = t;
  const settle = Math.min(last + 0.001, 3);
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) pts.push(String(Number((i === samples ? 1 : at((settle * i) / samples)).toFixed(4))));
  return { durationMs: Math.round(settle * 1000), easing: `linear(${pts.join(', ')})` };
}
