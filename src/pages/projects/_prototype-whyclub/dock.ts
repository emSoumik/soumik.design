// the live dock, shared by every variant: loads the real component (built from whyclub into /assets/work/whyclub/dock/)
// in an iframe, walks it between its three shapes, plays the tour (pill, bar, panel, round again), notices when the
// person takes over, and either keeps the window as tall as the dock frame by frame or, with `fixed`, holds it at the
// open panel's height for good so nothing below the figure ever moves
export type Shape = 'bar' | 'panel' | 'pill';
export type Rect = { x: number; y: number; w: number; h: number };
export interface Spring { name: string; response: number; damping: number; durationMs: number; easing: string; seq: number }
export interface Report { wc: string; shape: Shape | null; panel?: string | null; labeled?: boolean; moving: boolean; parts: Record<string, Rect | undefined>; spring: Spring | null }
export type Mode = 'tour' | 'you' | 'free';

export const SRC = '/assets/work/whyclub/dock/index.html';
export const FW = 392; // the frame's css size
export const FH = 760;
export const ORDER: Shape[] = ['pill', 'bar', 'panel'];
export const n = (v: number) => Math.round(v);
const SHELL = '.morph-dock__shell';
/** the shop panel's top edge in frame px (its tallest), measured from the built dock; re-read live whenever a panel opens */
export const PANEL_TOP = 356;
/** a fixed window's css height for a given head, in plain css: the frame scales down with the container below 392 */
export const fixedHeight = (head: number) => `min(calc((${FH}px - var(--pt, ${PANEL_TOP}) * 1px + ${head}px)), calc((${FH} - var(--pt, ${PANEL_TOP}) + ${head}) / ${FW} * 100cqw))`;

export interface Opts {
  /** the element the frame goes in; its height is driven to fit the dock */
  host: HTMLElement;
  /** frame px of white kept above the dock's top edge */
  head?: number;
  /** the largest the frame may be drawn (1 = its own size) */
  maxScale?: number;
  /** how long each shape is held during the tour */
  dwell?: number | (() => number);
  onSettle?: (r: Report) => void;
  onMove?: (r: Report) => void;
  onSpring?: (sp: Spring) => void;
  /** which panel a move to the panel opens: 'shop', 'account' or 'more' (shop when not given) */
  panel?: () => string;
  onMode?: (m: Mode) => void;
  /** every frame the window's height (or, when fixed, the dock's top edge) changes */
  onFit?: () => void;
  /** hold the window at the tallest panel's height; css sizes it from --pt on the root (see fixedHeight) */
  fixed?: boolean;
}

export function liveDock(root: HTMLElement, o: Opts) {
  const host = o.host;
  const head = o.head ?? 14;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dwell = () => (typeof o.dwell === 'function' ? o.dwell() : o.dwell ?? 4200);
  let frame: HTMLIFrameElement | null = null;
  let last: Report | null = null;
  let want: Shape | null = null; // a shape we're walking toward through more than one move
  let shownSeq = 0;
  let lastSent = 0;
  let visible = false;
  let timer = 0;
  let settled = false;
  let booting = true; // walking to the pill out of sight before the first frame is shown
  let panelTop = PANEL_TOP;
  let rest: Shape | null = null; // the last shape the dock settled in
  let said: string | null = null;
  let top = FH - 64 - 12; // the dock's top edge in frame px, read from the frame itself
  let raf = 0;

  const sr = document.createElement('p');
  sr.setAttribute('role', 'status'); sr.setAttribute('aria-live', 'polite');
  sr.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap';
  root.append(sr);

  const mode = (m: Mode) => { root.dataset.mode = m; o.onMode?.(m); };
  const send = (msg: object) => { lastSent = Date.now(); frame?.contentWindow?.postMessage({ wc: 'dock', ...msg }, '*'); };
  const scale = () => Math.min(o.maxScale ?? 1, host.clientWidth / FW);

  // ---- the window: as tall as the dock plus a little air, tracked every frame while anything moves ----
  function readTop(): number | null {
    try {
      const el = frame?.contentDocument?.querySelector(SHELL);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.height ? r.top : null;
    } catch { return null; }
  }
  function size() {
    const s = scale();
    if (frame) { frame.style.transform = `scale(${s})`; frame.style.left = `${(host.clientWidth - FW * s) / 2}px`; }
    if (o.fixed) { const dh = String(n((FH - top) * s)); if (root.style.getPropertyValue('--dock') !== `${dh}px`) { root.style.setProperty('--dock', `${dh}px`); o.onFit?.(); } return; }
    const h = Math.ceil((FH - top + head) * s);
    if (host.style.height !== `${h}px`) { host.style.height = `${h}px`; o.onFit?.(); }
  }
  // follows the shell until it has held still for a few frames
  function track() {
    cancelAnimationFrame(raf);
    let still = 0;
    const tick = () => {
      const t = readTop();
      if (t !== null) { still = Math.abs(t - top) < .25 ? still + 1 : 0; top = t; }
      size();
      if (still < 8) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  const fromParts = (r: Report) => {
    const ys = Object.values(r.parts).filter(Boolean).map((p) => p!.y);
    if (ys.length) top = Math.min(...ys);
  };

  // ---- the frame loads once the figure is near ----
  new IntersectionObserver((e, io) => {
    if (!e[0].isIntersecting) return;
    io.disconnect();
    frame = document.createElement('iframe');
    frame.src = SRC;
    frame.title = 'The WhyClub dock, live';
    frame.style.cssText = `position:absolute;bottom:0;width:${FW}px;height:${FH}px;border:0;transform-origin:0 100%;background:#fff;color-scheme:light;opacity:0;transition:opacity .3s cubic-bezier(.23,1,.32,1)`;
    // the frame is same-origin, so a press inside it is heard directly; the blur check below is the fallback
    frame.addEventListener('load', () => {
      try { for (const ev of ['pointerdown', 'keydown']) frame!.contentDocument!.addEventListener(ev, (e) => { if (e.isTrusted) takeOver(); }, true); } catch { /* cross-origin: blur covers it */ }
    });
    host.append(frame);
    size();
  }, { rootMargin: '400px' }).observe(root);
  new ResizeObserver(() => { size(); if (last && !last.moving) o.onSettle?.(last); }).observe(host);

  // ---- the moves. the frame is same-origin, so the pill is tapped for real; messages are the fallback ----
  const doc = () => { try { return frame?.contentDocument ?? null; } catch { return null; } };
  // pill to bar: tap the pill, as a person would
  function expand() {
    const b = doc()?.querySelector<HTMLElement>('.morph-dock__pill-primary');
    if (!b) return send({ scroll: 'top' });
    lastSent = Date.now();
    b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
  }
  // bar to pill: scroll the page down. a bar is happy at any height, so when the page is about to run out, start from the top
  function collapse() {
    try {
      const w = frame!.contentWindow!;
      if (w.scrollY + 600 > w.document.documentElement.scrollHeight - w.innerHeight) w.scrollTo({ top: 0, behavior: 'instant' });
    } catch { /* cross-origin: just ask */ }
    send({ scroll: 'down' });
  }
  function go(target: Shape) { want = target; step(); }
  // each call takes the next move toward `want`; reports call it again as the dock settles
  function step() {
    if (!want || !last || last.moving) return;
    const now = last.shape;
    if (now === want) { want = null; return; }
    if (want === 'bar') now === 'panel' ? send({ close: true }) : expand();
    else if (want === 'panel') { if (now === 'bar') { send({ open: o.panel?.() ?? 'shop' }); want = null; } else expand(); }
    // the panel folds into the bar and the bar into the pill in one move: the scroll starts while the panel is still closing
    else if (now === 'panel') { send({ close: true }); window.setTimeout(collapse, 220); }
    else collapse();
    track();
  }

  // ---- the tour: pill, bar, panel, round again. only while on screen and the person hasn't taken over ----
  function queue(wait = dwell()) {
    clearTimeout(timer);
    timer = 0;
    if (root.dataset.mode === 'free' || reduced.matches || !visible || booting) { root.style.setProperty('--run', 'paused'); return; }
    root.style.setProperty('--run', 'running');
    root.dataset.tick = String((Number(root.dataset.tick) || 0) + 1); // lets a variant restart a progress fill
    timer = window.setTimeout(() => {
      timer = 0;
      if (root.dataset.mode === 'free') return;
      const i = ORDER.indexOf((last?.shape ?? 'pill') as Shape);
      go(ORDER[(i + 1) % ORDER.length]);
    }, wait);
  }
  // the person has touched something: stop the tour and say it's theirs
  function takeOver() {
    if (root.dataset.mode === 'free') return;
    clearTimeout(timer); timer = 0; root.style.setProperty('--run', 'paused');
    mode('free');
  }
  function replay() { want = null; mode('tour'); go('pill'); }
  new IntersectionObserver((e) => {
    visible = e[0].isIntersecting;
    if (reduced.matches || root.dataset.mode === 'free' || booting) return;
    queue();
  }, { threshold: 0.4 }).observe(root);
  // a tap inside the frame takes focus from this window (closing a panel moves focus inside on its own, so not right after a command)
  addEventListener('blur', () => { if (document.activeElement === frame && Date.now() - lastSent > 1200) takeOver(); });
  // a few shapes in, the prompt rewords itself so the ask is made before the dock is left alone
  let laps = 0;
  const asked = () => { if (++laps === 4 && root.dataset.mode === 'tour') mode('you'); };

  // ---- messages from the dock ----
  addEventListener('message', (e) => {
    if (e.source !== frame?.contentWindow) return;
    const d = e.data as Report;
    if (!d || d.wc !== 'dock' || d.shape === undefined) return;
    last = d;
    root.dataset.moving = String(d.moving || !d.shape);
    // a move we didn't ask for is the person's own (the dock settling as it first loads doesn't count)
    if (d.moving && settled && !booting && Date.now() - lastSent > 1500 && root.dataset.mode !== 'free') takeOver();
    if (d.shape) root.dataset.shape = d.shape;
    if (d.spring && d.spring.seq !== shownSeq) { shownSeq = d.spring.seq; o.onSpring?.(d.spring); }
    if (d.moving) { track(); o.onMove?.(d); return; }
    if (readTop() === null) fromParts(d);
    track();
    // the tallest panel seen so far sets the fixed window (css reads --pt), so a taller build can never be clipped
    if (d.shape === 'panel' && d.parts.shell && d.parts.shell.y < panelTop - .5) { panelTop = d.parts.shell.y; root.style.setProperty('--pt', String(n(panelTop))); }
    if (!settled) {
      settled = true;
      // the tour's first frame is the pill: scroll the page down out of sight, and show the dock once it has folded
      if (!reduced.matches && root.dataset.mode !== 'free' && d.shape !== 'pill') { want = 'pill'; frame!.contentWindow!.scrollTo({ top: 520, behavior: 'instant' }); return; }
    }
    if (booting) {
      if (want && d.shape !== want) return step();
      booting = false; want = null; rest = d.shape;
      frame!.style.opacity = '1'; root.dataset.ready = 'true';
      o.onSettle?.(d); announce(d.shape); queue();
      return;
    }
    o.onSettle?.(d);
    announce(d.shape);
    step();
    // a new resting shape restarts the hold; a settle we were waiting on with no timer running does too
    if (!want && d.shape !== rest) { if (rest !== null) asked(); rest = d.shape; queue(); }
    else if (!want && !timer) queue();
  });
  function announce(shape: string | null) {
    const key = shape === 'panel' ? `panel-${last?.panel ?? ''}` : shape;
    if (!shape || key === said) return;
    const name = last?.panel ? last.panel[0].toUpperCase() + last.panel.slice(1) : 'Panel';
    if (said !== null) sr.textContent = shape === 'panel' ? `${name} panel open` : shape === 'bar' ? 'Bar' : 'Pill';
    said = key;
  }

  // ---- controls any variant may carry: [data-go] shape buttons, [data-glass] radios, .replay ----
  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const g = t.closest<HTMLElement>('[data-go]');
    if (g) { takeOver(); go(g.dataset.go as Shape); return; }
    const gl = t.closest<HTMLElement>('[data-glass]');
    if (gl) { check(gl); send({ glass: gl.dataset.glass }); return; }
    if (t.closest('.replay')) replay();
  });
  const check = (on: Element) => on.parentElement!.querySelectorAll('[role=radio]').forEach((x) => {
    x.setAttribute('aria-checked', String(x === on)); x.setAttribute('tabindex', x === on ? '0' : '-1');
  });
  // radiogroups: arrows move and select, Home and End jump
  root.addEventListener('keydown', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[role=radio]');
    const group = el?.closest<HTMLElement>('[role=radiogroup]');
    if (!el || !group) return;
    const radios = [...group.querySelectorAll<HTMLElement>('[role=radio]')];
    const i = radios.indexOf(el);
    const to = ({ ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: radios.length - 1 } as Record<string, number>)[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = radios[(to + radios.length) % radios.length];
    next.focus(); next.click();
  });

  // reduced motion: no tour, just the ask
  if (reduced.matches) mode('you'); else mode('tour');

  return {
    go, takeOver, replay, scale, reduced,
    get last() { return last; },
    // a point on a part, in px relative to `to`'s box. fx/fy are fractions of the part's rect
    at(rect: Rect, fx: number, fy: number, to: Element) {
      const s = scale();
      const h = host.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const fl = (host.clientWidth - FW * s) / 2;
      return { x: h.left - b.left + fl + (rect.x + rect.w * fx) * s, y: h.bottom - b.top - (FH - (rect.y + rect.h * fy)) * s };
    },
  };
}

// keeps the shape buttons in step with the dock
export function markShape(root: HTMLElement, sh: string | null) {
  root.querySelectorAll<HTMLElement>('.shapes [data-go]').forEach((b) => {
    const on = b.dataset.go === sh;
    b.setAttribute('aria-checked', String(on)); b.setAttribute('tabindex', on ? '0' : '-1');
  });
}

export const springName = (sp: Spring) => sp.name[0].toUpperCase() + sp.name.slice(1);

// what each part is, in a sentence, from its measured rect
export interface Note { part: string; title: string; text: string; size: string }
export function notesFor(r: Report): Note[] {
  const p = r.parts;
  const out: Note[] = [];
  const add = (part: string, title: string, size: string, text: string) => p[part] && out.push({ part, title, text, size });
  if (r.shape === 'pill' && p.pill) add('pill', 'Pill', `${n(p.pill.w)} × ${n(p.pill.h)}`, 'Scroll down and the bar collapses into it, sliding to the left edge. Tap it to bring the bar back.');
  if (r.shape === 'bar' && p.shell) {
    add('cell', 'Tab', `${n(p.cell!.w)} wide`, 'Home and Cart are links; Shop, Account and More open a panel.');
    add('shell', 'Bar', `${n(p.shell.w)} × ${n(p.shell.h)}`, r.labeled ? 'Five tabs, with their labels. Scroll a little and the labels drop.' : 'Five tabs; the labels drop while the page scrolls.');
  }
  if (r.shape === 'panel' && p.panel) {
    add('header', 'Header', `${n(p.header!.h)} tall`, 'Back folds the panel into the bar again.');
    if (p.tile) {
      // the shop: two photo tiles, then rows led by a glyph tile
      add('tile', 'Photo tile', `${n(p.tile.h)} tall`, 'Women and Men face each other across the seam.');
      if (p.row) add('row', 'Row', `${n(p.row.h)} tall`, 'Rows without a glyph tile are 56.');
      add('panel', 'Panel', `${n(p.panel.w)} wide`, 'The bar grows into it instead of opening a menu on top.');
    } else {
      // account and more: four plain rows, each led by a line icon
      if (p.icon) add('icon', 'Row icon', `${n(p.icon.w)} wide`, 'Drawn on the dock’s own stroke, so a row stays one line.');
      if (p.row) add('row', 'Row', `${n(p.row.h)} tall`, r.panel === 'account' ? 'Overview, orders, wishlist and settings.' : 'Our story, tracking, returns and contact.');
      add('panel', 'Panel', `${n(p.panel.w)} × ${n(p.panel.h)}`, 'Shorter than the shop: the bar grows only as far as its rows.');
    }
  }
  return out;
}

/** a phone: each note sits in a row above the panel (t), below the dock (b), or (pill and bar only) in the room above the
 *  dock that the panel takes when it opens (a). its leader lands on `at` (fractions of the part, or of `of` when the note
 *  names a measure rather than a part). `around` sends the leader outside the dock on that side first, so it never
 *  crosses the dock's own words */
export const MOB: Record<string, { row: 't' | 'b' | 'a'; at: [number, number]; around?: 'l' | 'r'; of?: string; col?: 'r' }> = {
  // the pill sits at the left edge, so its note takes the right column and the phone's width is used on both sides
  pill: { row: 'a', at: [.5, 0], col: 'r' },
  edge: { row: 'b', at: [0, .5], around: 'l', of: 'pill' },
  cell: { row: 'a', at: [0, .5], around: 'l' },
  shell: { row: 'b', at: [1, .5], around: 'r' },
  tile: { row: 't', at: [0, .5], around: 'l' },
  icon: { row: 't', at: [0, .5], around: 'l' },
  header: { row: 't', at: [.62, 0] },
  panel: { row: 'b', at: [.3, 1] },
  row: { row: 'b', at: [1, .5], around: 'r' },
};
/** the rect a mobile note's leader lands on */
export const mobRect = (nt: Note, parts: Report['parts']) => parts[MOB[nt.part]?.of ?? nt.part];
/** a phone's notes: the shape's notes, and for the pill one more, so the row under it is never empty */
export function mobNotes(r: Report): Note[] {
  const out = notesFor(r);
  if (r.shape === 'pill' && r.parts.pill) out.push({ part: 'edge', title: 'Edge', size: `${n(r.parts.pill.x)} in`, text: 'Out of the way of the buy button.' });
  return out;
}
/** a row's notes as list items; a note alone in its row whose leader leaves on the right takes the right column */
export const mobLi = (items: Note[]) => items.map((nt) => `<li class="note${items.length === 1 && (MOB[nt.part]?.around === 'r' || MOB[nt.part]?.col === 'r') ? ' r' : ''}"><span><b>${nt.title}</b>${nt.size ? `<em>${nt.size}</em>` : ''}</span><span>${nt.text}</span></li>`).join('');
/** where a heading above the dock already names the shape and gives its size, the note on the whole shape names the
 *  surface instead and leaves the size to the heading */
export const underStep = (notes: Note[]) => notes.map((nt) => nt.part === 'pill' || nt.part === 'shell' ? { ...nt, title: 'Shell', size: '' } : nt);
/** a row's notes, left to right in the order their leaders land, so no two leaders cross */
export function mobRow(notes: Note[], parts: Report['parts'], row: 't' | 'b' | 'a'): Note[] {
  const key = (nt: Note) => { const m = MOB[nt.part], p = mobRect(nt, parts)!; return m.around === 'l' ? -1e4 : m.around === 'r' ? 1e4 : p.x + m.at[0] * p.w; };
  return notes.filter((nt) => MOB[nt.part]?.row === row && mobRect(nt, parts)).sort((a, b) => key(a) - key(b));
}
