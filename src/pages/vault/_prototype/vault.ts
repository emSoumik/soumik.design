// PROTOTYPE (dev only): behaviour for the vault wall. demos, the filter, opening a piece in place five ways,
// and the wall's entrance. the dev bar sets <html data-proto-open / -enter>, read here when a piece opens or the page loads
import { createReel, SCENES } from '../../../../js/work/reel.js';
import { liveDock } from '../../projects/_prototype-whyclub/dock';
import { PIECES, type Piece } from './pieces';

type Variant = 'morph' | 'window' | 'sheet' | 'stitch' | 'zoom';
type Box = { left: number; top: number; width: number; height: number };
type Card = { li: HTMLElement; art: HTMLElement; hit: HTMLAnchorElement };
type Demo = { el: HTMLElement | null; home: HTMLElement; tilt: (x: number, y: number) => void; hush?: () => void };

const EASE = 'cubic-bezier(.23, 1, .32, 1)';
const IOS = 'cubic-bezier(.32, .72, 0, 1)';
const VARIANTS = ['morph', 'window', 'sheet', 'stitch', 'zoom'];
const ENTERS = ['skeleton', 'rise', 'stitch', 'cascade', 'focus'];
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const phone = matchMedia('(max-width: 639px)');
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const frames = (n: number) => new Promise<void>((r) => { const go = (i: number) => (i ? requestAnimationFrame(() => go(i - 1)) : r()); go(n); });
const q = <T extends HTMLElement = HTMLElement>(sel: string, from: ParentNode) => from.querySelector<T>(sel)!;
const qa = <T extends HTMLElement = HTMLElement>(sel: string, from: ParentNode) => [...from.querySelectorAll<T>(sel)];
const variant = (): Variant => (VARIANTS.includes(html.dataset.protoOpen ?? '') ? html.dataset.protoOpen : 'morph') as Variant;
const enterKind = () => (ENTERS.includes(html.dataset.protoEnter ?? '') ? html.dataset.protoEnter! : 'skeleton');
const box = (el: Element): Box => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
const scrollTo0 = (y = 0) => window.scrollTo({ top: y, behavior: 'instant' });
const hasVT = () => typeof document.startViewTransition === 'function';

const root = document.querySelector<HTMLElement>('.vlt');
if (root) init(root);

function init(root: HTMLElement) {
  const under = q('.vlt-under', root);
  const wallview = q('.vlt-wallview', root);
  const wall = q('.vlt-wall', root);
  const host = q('.vlt-host', root);
  const scrim = q('.vlt-scrim', root);
  const crumbText = q('.vlt-crumb-text', root);
  const crumb = q('.vlt-crumb', root);
  const home = q<HTMLButtonElement>('.vlt-home', root);
  const controls = q('.vlt-controls', root);
  const head = q('.vlt-head', root);
  const empty = q('.vlt-empty', root);
  const baseTitle = document.title;
  const defaultCrumb = crumbText.textContent ?? '';
  const mast = document.querySelector<HTMLElement>('.mast');

  const byslug = new Map(PIECES.map((p) => [p.slug, p]));
  const cards = new Map<string, Card>();
  const articles = new Map<string, HTMLElement>();
  const demos = new Map<string, Demo>();
  qa('.vlt-card', wall).forEach((li) => cards.set(li.dataset.slug!, { li, art: q('.vlt-art', li), hit: q<HTMLAnchorElement>('.vlt-hit', li) }));
  qa('.vlt-detail', host).forEach((a) => articles.set(a.dataset.slug!, a));
  const stageOf = (slug: string) => q('.vlt-stage', articles.get(slug)!);
  const blocksOf = (slug: string) => [...articles.get(slug)!.children].filter((c) => !c.classList.contains('vlt-stage')) as HTMLElement[];

  // ---------- demos ----------
  function mountShader(p: Piece, art: HTMLElement): Demo {
    const el = q('.vlt-demo', art);
    const canvas = q<HTMLCanvasElement>('canvas', el);
    const title = el.querySelector<HTMLElement>('[data-title]');
    const count = el.querySelector<HTMLElement>('.vlt-count');
    const list = p.scenes;
    let reel: ReturnType<typeof createReel> | null = null;
    let at = 0, timer = 0, seen = false;
    const pick = (k: number) => {
      at = k;
      reel?.show(list[k]);
      el.dataset.dark = String(SCENES[list[k]].dark);
      if (title) title.textContent = SCENES[list[k]].title;
      if (count) count.textContent = `${k + 1} / ${list.length}`;
    };
    // walks its scenes only while on screen, never under reduced motion
    const walk = () => {
      clearInterval(timer);
      if (seen && list.length > 1 && !reduced.matches) timer = window.setInterval(() => pick((at + 1) % list.length), 4200);
    };
    // the arrows step by hand and restart the walk, so the next stage never lands right after a tap
    qa<HTMLButtonElement>('[data-step]', el).forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      pick((at + Number(b.dataset.step) + list.length) % list.length);
      walk();
    }));
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen && !reel) {
        reel = createReel(canvas, { start: list[at], onFail: () => { q('.vlt-fail', el).hidden = false; el.dataset.ready = ''; } });
        frames(2).then(() => { el.dataset.ready = ''; });
      }
      walk();
    }, { rootMargin: '15% 0px' }).observe(el);
    return { el, home: art, tilt: (x, y) => reel?.setTilt(x, y) };
  }
  // a film plays muted and looped while it's on screen. under reduced motion it stays the finished flower until someone
  // asks for sound, which plays it from the start. the sound button shows on the card and the stage
  function mountFilm(art: HTMLElement): Demo {
    const el = q('.vlt-demo', art);
    const video = q<HTMLVideoElement>('video', el);
    const sound = q<HTMLButtonElement>('.vlt-sound', el);
    let seen = false, asked = false;
    const sync = () => {
      if (!seen || (reduced.matches && !asked)) { video.pause(); return; }
      video.preload = 'auto';
      video.play().catch(() => {});
    };
    video.addEventListener('playing', () => { el.dataset.ready = ''; });
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); }, { rootMargin: '10% 0px' }).observe(el);
    const hush = () => { video.muted = true; asked = false; sound.setAttribute('aria-pressed', 'false'); sync(); };
    sound.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!video.muted) return hush();
      asked = true; video.muted = false; video.currentTime = 0;
      sound.setAttribute('aria-pressed', 'true');
      sync();
    });
    return { el, home: art, tilt: () => {}, hush };
  }
  PIECES.forEach((p) => {
    const art = cards.get(p.slug)!.art;
    if (p.video) demos.set(p.slug, mountFilm(art));
    else if (p.slug === 'dock') {
      const dk = q('[data-dockcard]', art);
      liveDock(dk, { host: q('.win', dk), head: 14, fixed: true, dwell: 2600 }); // quicker than the detail, so the card never sits long as a lone pill
      demos.set(p.slug, { el: null, home: art, tilt: () => {} });
    } else demos.set(p.slug, mountShader(p, art));
  });

  // pointer tilt: listened on the card (the link sits on top) and on the stage
  const tiltFrom = (d: Demo, e: PointerEvent) => {
    if (!d.el) return;
    const r = d.el.getBoundingClientRect();
    d.tilt((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
  };
  PIECES.forEach((p) => {
    const d = demos.get(p.slug)!;
    const wire = (target: HTMLElement) => {
      target.addEventListener('pointermove', (e) => { if (d.el && target.contains(d.el)) tiltFrom(d, e); });
      target.addEventListener('pointerleave', () => { if (d.el && target.contains(d.el)) d.tilt(0, 0); });
    };
    wire(cards.get(p.slug)!.li);
    wire(stageOf(p.slug));
  });
  const moveIn = (slug: string) => { const d = demos.get(slug)!; const st = stageOf(slug); if (d.el && d.el.parentElement !== st) st.prepend(d.el); };
  const moveOut = (slug: string) => { const d = demos.get(slug)!; d.hush?.(); if (d.el && d.el.parentElement !== d.home) d.home.prepend(d.el); };

  // ---------- state ----------
  let cur: string | null = null;
  let busy = false;
  let pushed = false;
  let leaving = false; // history.back() is on its way; ignore more closes
  let savedY = 0;
  let openedWith: Variant = 'morph';
  let openRect: Box | null = null;

  const urlPiece = () => { const s = new URLSearchParams(location.search).get('piece'); return s && byslug.has(s) ? s : null; };
  const urlFor = (slug: string | null) => {
    const u = new URL(location.href);
    if (slug) u.searchParams.set('piece', slug); else u.searchParams.delete('piece');
    return u.pathname + u.search + u.hash;
  };
  const setCrumb = (slug: string | null) => {
    crumbText.textContent = slug ? byslug.get(slug)!.title : defaultCrumb;
    home.disabled = !slug;
    root.dataset.page = slug ? 'detail' : 'wall';
  };
  const showArticle = (slug: string) => { articles.forEach((a, s) => { a.hidden = s !== slug; }); };

  // the page layer: the detail replaces the wall. the sheet layer: the detail rides over it
  function swapToDetail(slug: string, o: { sheet?: boolean; keepWall?: boolean } = {}) {
    cur = slug;
    showArticle(slug);
    host.hidden = false;
    moveIn(slug);
    if (!o.sheet) { if (!o.keepWall) wallview.hidden = true; setCrumb(slug); }
    document.title = `${byslug.get(slug)!.title} · Vault · Soumik Halder`;
    html.dataset.vault = 'detail';
  }
  function swapToWall(o: { keepHost?: boolean } = {}) {
    if (cur) moveOut(cur);
    if (!o.keepHost) { host.hidden = true; showArticle(''); }
    wallview.hidden = false;
    wallview.style.cssText = '';
    cur = null;
    setCrumb(null);
    document.title = baseTitle;
    html.dataset.vault = 'wall';
  }
  // the stage's rect as it will sit at scroll 0, measured without painting
  function measureStage(slug: string): Box {
    const wh = wallview.hidden, hh = host.hidden;
    const ah = [...articles.values()].map((a) => a.hidden);
    wallview.hidden = true; host.hidden = false; showArticle(slug);
    const r = stageOf(slug).getBoundingClientRect();
    const out = { left: r.left, top: r.top + window.scrollY, width: r.width, height: r.height };
    wallview.hidden = wh; host.hidden = hh;
    [...articles.values()].forEach((a, i) => { a.hidden = ah[i]; });
    return out;
  }
  const bgOf = (el: Element) => getComputedStyle(el).backgroundColor;
  const rise = (slug: string) => blocksOf(slug).forEach((b, i) =>
    b.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 140 + 40 * i, easing: EASE, fill: 'backwards' }));

  // ---------- open / close ----------
  async function open(slug: string, o: { push?: boolean } = {}) {
    if (busy || !byslug.has(slug)) return;
    if (cur) return switchTo(slug, 'fwd', o.push === false);
    busy = true;
    try {
      const v = variant();
      const card = cards.get(slug)!;
      savedY = window.scrollY;
      openedWith = v;
      openRect = box(card.art);
      if (o.push !== false) { history.pushState({ piece: slug }, '', urlFor(slug)); pushed = true; }
      if (v === 'sheet') await sheetOpen(slug);
      else if (reduced.matches || ((v === 'morph' || v === 'window') && !hasVT())) { swapToDetail(slug); scrollTo0(); }
      else if (v === 'morph') await morphOpen(slug, card);
      else if (v === 'window') await windowOpen(slug, card);
      else if (v === 'stitch') await stitchOpen(slug, card);
      else await zoomOpen(slug, card);
    } finally { busy = false; settle(); }
  }

  function close(viaPop = false) {
    if (busy || !cur) return;
    if (!viaPop) {
      if (pushed) { if (!leaving) { leaving = true; history.back(); } return; }
      history.replaceState(null, '', urlFor(null));
    }
    pushed = false; leaving = false;
    void run();
    async function run() {
      busy = true;
      const slug = cur!;
      try {
        let v: Variant = openedWith === 'sheet' ? 'sheet' : variant() === 'sheet' ? 'morph' : variant();
        if ((v === 'window') && !openRect) v = 'morph';
        if (v === 'sheet') await sheetClose(slug);
        else if (reduced.matches || ((v === 'morph' || v === 'window') && !hasVT())) { swapToWall(); scrollTo0(savedY); }
        else if (v === 'morph') await morphClose(slug);
        else if (v === 'window') await windowClose(slug);
        else if (v === 'stitch') await stitchClose(slug);
        else await zoomClose(slug);
      } finally { openRect = null; busy = false; settle(); }
    }
  }

  // browser back / forward and rapid clicks: bring the page in line with the url once nothing is animating
  function settle() {
    const want = urlPiece();
    if (want === cur) return;
    if (!want) close(true);
    else if (!cur) open(want, { push: false });
    else switchTo(want, 'fwd', true);
  }
  addEventListener('popstate', () => { leaving = false; if (!busy) settle(); });

  // ---------- morph ----------
  const name = (el: HTMLElement, n: string) => { el.style.viewTransitionName = n; };
  const vtDone = async (t: ViewTransition) => { try { await t.finished; } catch { /* skipped */ } };
  async function morphOpen(slug: string, card: Card) {
    const stage = stageOf(slug);
    html.style.setProperty('--vlt-bg', bgOf(card.art));
    html.dataset.vltVt = 'morph';
    name(card.art, 'vlt-piece'); name(crumb, 'vlt-crumb'); name(controls, 'vlt-controls');
    const t = document.startViewTransition(() => {
      swapToDetail(slug); scrollTo0();
      name(card.art, ''); name(stage, 'vlt-piece');
    });
    await vtDone(t);
    [card.art, stage, crumb, controls].forEach((e) => name(e, ''));
    delete html.dataset.vltVt;
  }
  async function morphClose(slug: string) {
    const card = cards.get(slug)!, stage = stageOf(slug);
    html.style.setProperty('--vlt-bg', bgOf(stage));
    html.dataset.vltVt = 'morph';
    name(stage, 'vlt-piece'); name(crumb, 'vlt-crumb'); name(controls, 'vlt-controls');
    const t = document.startViewTransition(() => {
      swapToWall(); scrollTo0(savedY);
      name(stage, ''); name(card.art, 'vlt-piece');
    });
    await vtDone(t);
    [card.art, stage, crumb, controls].forEach((e) => name(e, ''));
    delete html.dataset.vltVt;
  }

  // ---------- window: the demo keeps running; a clip opens from the card's size to the stage ----------
  function windowKeys(sr: Box, cr: Box) {
    const x = Math.max(0, (sr.width - cr.width) / 2), y = Math.max(0, (sr.height - cr.height) / 2);
    const dx = cr.left - (sr.left + x), dy = cr.top - (sr.top + y);
    return {
      from: { transform: `translate(${dx}px, ${dy}px)`, clipPath: `inset(${y}px ${x}px ${y}px ${x}px round 24px)` },
      to: { transform: 'none', clipPath: 'inset(0px 0px 0px 0px round 24px)' },
    };
  }
  async function windowOpen(slug: string, card: Card) {
    const cr = box(card.art), stage = stageOf(slug);
    html.dataset.vltVt = 'window';
    let a: Animation | null = null;
    const t = document.startViewTransition(() => {
      swapToDetail(slug); scrollTo0();
      const k = windowKeys(box(stage), cr);
      a = stage.animate([k.from, k.to], { duration: 520, easing: IOS, fill: 'backwards' });
      rise(slug);
    });
    await vtDone(t);
    await Promise.race([(a as Animation | null)?.finished.catch(() => {}), sleep(700)]);
    delete html.dataset.vltVt;
  }
  async function windowClose(slug: string) {
    const stage = stageOf(slug);
    blocksOf(slug).forEach((b) => b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' }));
    if (window.scrollY > 0) scrollTo0();
    const k = windowKeys(box(stage), openRect!);
    const a = stage.animate([k.to, k.from], { duration: 440, easing: IOS, fill: 'forwards' });
    await Promise.race([a.finished.catch(() => {}), sleep(700)]);
    swapToWall(); scrollTo0(savedY);
    a.cancel();
    blocksOf(slug).forEach((b) => b.getAnimations().forEach((x) => x.cancel()));
    cardsExcept(slug).forEach((li) => li.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' }));
  }
  const cardsExcept = (slug: string) => [...cards.entries()].filter(([s, c]) => s !== slug && !c.li.hidden).map(([, c]) => c.li);

  // ---------- sheet ----------
  function sheetHide() {
    host.classList.remove('is-sheet'); host.hidden = true; scrim.hidden = true; scrim.classList.remove('is-on');
    host.style.cssText = ''; scrim.style.cssText = ''; under.style.cssText = ''; if (mast) mast.style.cssText = '';
    showArticle('');
  }
  async function sheetOpen(slug: string) {
    swapToDetail(slug, { sheet: true });
    host.classList.add('is-sheet'); scrim.hidden = false; scrim.classList.add('is-on');
    host.scrollTop = 0;
    html.style.setProperty('--oy', `${-under.getBoundingClientRect().top}px`);
    void host.offsetHeight;
    html.dataset.sheet = 'open';
    await sleep(reduced.matches ? 0 : 520);
  }
  async function sheetClose(slug: string) {
    host.style.cssText = ''; scrim.style.cssText = ''; under.style.cssText = ''; if (mast) mast.style.cssText = '';
    html.dataset.sheetClosing = '';
    delete html.dataset.sheet;
    await sleep(reduced.matches ? 0 : 380);
    moveOut(slug);
    sheetHide();
    cur = null; document.title = baseTitle; html.dataset.vault = 'wall';
    delete html.dataset.sheetClosing;
  }
  // drag to dismiss: the sheet follows the finger, rubber-banding upward; scrim and wall track it
  let drag: { y0: number; ly: number; lt: number; v: number; off: number; grab: boolean; on: boolean } | null = null;
  const dragStart = (y: number, grab: boolean) => {
    if (html.dataset.sheet !== 'open' || busy) return;
    drag = { y0: y, ly: y, lt: performance.now(), v: 0, off: 0, grab, on: false };
  };
  const dragMove = (y: number) => {
    if (!drag) return false;
    const dy = y - drag.y0;
    if (!drag.on) {
      if (dy > 6 && (drag.grab || host.scrollTop <= 0)) drag.on = true;
      else { if (dy < -6) drag = null; return false; }
    }
    const now = performance.now();
    drag.v = (y - drag.ly) / Math.max(1, now - drag.lt);
    drag.ly = y; drag.lt = now;
    drag.off = dy > 0 ? dy : dy * 0.2;
    const p = Math.min(1, Math.max(0, 1 - drag.off / host.clientHeight));
    host.style.transition = 'none'; host.style.transform = `translateY(${drag.off}px)`;
    scrim.style.transition = 'none'; scrim.style.opacity = String(p);
    [under, mast].forEach((e) => { if (!e) return; e.style.transition = 'none'; e.style.transform = `scale(${1 - 0.06 * p}) translateY(${8 * p}px)`; e.style.borderRadius = `${24 * p}px`; });
    return true;
  };
  const dragEnd = () => {
    const d = drag; drag = null;
    if (!d || !d.on) return;
    if (d.off > 120 || d.v > 0.5) { close(); return; }
    // spring back
    const t = `transform .3s ${IOS}`;
    host.style.transition = t; host.style.transform = '';
    scrim.style.transition = `opacity .3s ${IOS}`; scrim.style.opacity = '';
    [under, mast].forEach((e) => { if (!e) return; e.style.transition = `${t}, border-radius .3s ${IOS}`; e.style.transform = ''; e.style.borderRadius = ''; });
    setTimeout(() => { host.style.transition = ''; scrim.style.transition = ''; [under, mast].forEach((e) => { if (e) e.style.transition = ''; }); }, 320);
  };
  host.addEventListener('touchstart', (e) => dragStart(e.touches[0].clientY, !!(e.target as Element).closest('.vlt-grab')), { passive: true });
  host.addEventListener('touchmove', (e) => { if (dragMove(e.touches[0].clientY) && e.cancelable) e.preventDefault(); }, { passive: false });
  host.addEventListener('touchend', dragEnd);
  host.addEventListener('touchcancel', dragEnd);
  host.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || !host.classList.contains('is-sheet') || (e.target as Element).closest('button, a')) return;
    dragStart(e.clientY, !!(e.target as Element).closest('.vlt-grab'));
    if (drag) host.setPointerCapture(e.pointerId);
  });
  host.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') dragMove(e.clientY); });
  host.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') dragEnd(); });
  scrim.addEventListener('click', () => close());
  q('.vlt-x', host).addEventListener('click', () => close());

  // ---------- stitch: a rect of cells grows from the card to the stage in stepped frames ----------
  let sc: HTMLCanvasElement | null = null;
  function overlay() {
    if (!sc) {
      sc = document.createElement('canvas');
      sc.setAttribute('aria-hidden', 'true');
      sc.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2000000000';
      document.body.append(sc);
    }
    const dpr = Math.min(2, devicePixelRatio || 1);
    sc.width = Math.round(innerWidth * dpr); sc.height = Math.round(innerHeight * dpr);
    const ctx = sc.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }
  function drawStitch(ctx: CanvasRenderingContext2D, r: Box, ink: boolean, bg: string) {
    const g = phone.matches ? 6 : 8;
    const x0 = Math.round(r.left / g) * g, y0 = Math.round(r.top / g) * g;
    const cols = Math.max(2, Math.round(r.width / g)), rows = Math.max(2, Math.round(r.height / g));
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = bg;
    ctx.fillRect(x0 + g, y0 + g, (cols - 2) * g, (rows - 2) * g);
    ctx.fillStyle = ink ? '#050505' : 'rgba(31, 29, 27, .18)';
    const cell = (cx: number, cy: number) => { if (Math.random() > 0.35) ctx.fillRect(x0 + cx * g, y0 + cy * g, g, g); };
    for (let c = 0; c < cols; c++) { cell(c, 0); cell(c, rows - 1); }
    for (let rr = 1; rr < rows - 1; rr++) { cell(0, rr); cell(cols - 1, rr); }
  }
  // 9 steps, 34ms apart, so it reads as stepped and not smooth
  async function stitchRun(from: Box, to: Box, ink: boolean, bg: string) {
    const ctx = overlay();
    const N = 9;
    for (let i = 0; i <= N; i++) {
      const t = i / N, e = 1 - Math.pow(1 - t, 2.2);
      const m = (a: number, b: number) => a + (b - a) * e;
      drawStitch(ctx, { left: m(from.left, to.left), top: m(from.top, to.top), width: m(from.width, to.width), height: m(from.height, to.height) }, ink, bg);
      if (i < N) await sleep(34);
    }
  }
  const stitchClear = () => { if (sc) sc.getContext('2d')!.clearRect(0, 0, sc.width, sc.height); };
  async function stitchOpen(slug: string, card: Card) {
    const to = measureStage(slug);
    const ink = card.li.dataset.tone === 'ink';
    await stitchRun(box(card.art), { ...to, top: to.top }, ink, bgOf(card.art));
    swapToDetail(slug); scrollTo0();
    await frames(1);
    stitchClear();
    blocksOf(slug).forEach((b, i) => b.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], { duration: 200, delay: 50 * i, easing: 'steps(4, end)', fill: 'backwards' }));
    await sleep(200 + 50 * 4);
  }
  async function stitchClose(slug: string) {
    const card = cards.get(slug)!, stage = stageOf(slug);
    const from = box(stage);
    const ink = card.li.dataset.tone === 'ink';
    const bg = bgOf(stage);
    drawStitch(overlay(), from, ink, bg);
    swapToWall(); scrollTo0(savedY);
    await stitchRun(from, box(card.art), ink, bg);
    stitchClear();
  }

  // ---------- zoom: the camera flies into the wall ----------
  const ZOOM = 'cubic-bezier(.65, 0, .35, 1)';
  function zoomTransform(cr: Box, sr: Box) {
    const wr = box(wall);
    const k = sr.width / cr.width;
    return `translate(${sr.left - wr.left - k * (cr.left - wr.left)}px, ${sr.top - wr.top - k * (cr.top - wr.top)}px) scale(${k})`;
  }
  async function zoomOpen(slug: string, card: Card) {
    const sr = measureStage(slug);
    html.dataset.vltZoom = '';
    wall.style.transformOrigin = '0 0';
    const wa = wall.animate([{ transform: 'none' }, { transform: zoomTransform(box(card.art), sr) }], { duration: 560, easing: ZOOM, fill: 'forwards' });
    cardsExcept(slug).forEach((li) => li.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }));
    await sleep(308);
    // pin the wall where it is, then show the detail on top of it
    const wv = box(wallview);
    wallview.style.cssText = `position:fixed;left:${wv.left}px;top:${wv.top}px;width:${wv.width}px;margin:0;pointer-events:none;z-index:1`;
    swapToDetail(slug, { keepWall: true }); scrollTo0();
    host.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
    rise(slug);
    await Promise.race([wa.finished.catch(() => {}), sleep(500)]);
    wallview.hidden = true; wallview.style.cssText = '';
    wall.getAnimations().forEach((x) => x.cancel());
    cards.forEach((c) => c.li.getAnimations().forEach((x) => x.cancel()));
    wall.style.transformOrigin = '';
    delete html.dataset.vltZoom;
  }
  async function zoomClose(slug: string) {
    const card = cards.get(slug)!;
    html.dataset.vltZoom = '';
    if (window.scrollY > 0) scrollTo0();
    const sr = box(stageOf(slug));
    const hr = box(host);
    host.style.cssText = `position:fixed;left:${hr.left}px;top:${hr.top}px;width:${hr.width}px;margin:0;pointer-events:none;z-index:3;background:#fff`;
    swapToWall({ keepHost: true }); scrollTo0(savedY);
    wall.style.transformOrigin = '0 0';
    const from = zoomTransform(box(card.art), sr);
    const wa = wall.animate([{ transform: from }, { transform: 'none' }], { duration: 520, easing: ZOOM });
    cardsExcept(slug).forEach((li) => li.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: 100, easing: 'ease-out', fill: 'backwards' }));
    const fade = host.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
    await fade.finished.catch(() => {});
    host.hidden = true; host.style.cssText = ''; fade.cancel(); showArticle('');
    await Promise.race([wa.finished.catch(() => {}), sleep(520)]);
    wall.style.transformOrigin = '';
    delete html.dataset.vltZoom;
  }

  // ---------- prev / next ----------
  async function switchTo(slug: string, dir: 'fwd' | 'back', replace = true) {
    if (busy || slug === cur || !cur) return;
    busy = true;
    const old = cur;
    const sheet = host.classList.contains('is-sheet');
    const swap = () => {
      moveOut(old);
      cur = slug;
      showArticle(slug);
      moveIn(slug);
      if (!sheet) setCrumb(slug);
      document.title = `${byslug.get(slug)!.title} · Vault · Soumik Halder`;
      if (sheet) host.scrollTop = 0; else scrollTo0();
    };
    try {
      if (replace && urlPiece() !== slug) history.replaceState({ piece: slug }, '', urlFor(slug));
      openRect = null;
      if (hasVT() && !reduced.matches) {
        const a = articles.get(old)!, b = articles.get(slug)!;
        html.dataset.vltVt = 'switch'; html.dataset.vltDir = dir;
        name(a, 'vlt-content');
        const t = document.startViewTransition(() => { swap(); name(a, ''); name(b, 'vlt-content'); });
        await vtDone(t);
        name(a, ''); name(b, '');
        delete html.dataset.vltVt; delete html.dataset.vltDir;
      } else swap();
    } finally { busy = false; settle(); }
  }
  const step = (d: 1 | -1) => {
    if (!cur) return;
    const i = PIECES.findIndex((p) => p.slug === cur);
    switchTo(PIECES[(i + d + PIECES.length) % PIECES.length].slug, d === 1 ? 'fwd' : 'back');
  };

  // ---------- wiring ----------
  cards.forEach((c, slug) => c.hit.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    open(slug);
  }));
  home.addEventListener('click', () => close());
  const flash = (b: HTMLElement, text: string) => { b.dataset.flash = text; setTimeout(() => delete b.dataset.flash, 1400); };
  host.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-act]');
    if (!b || !cur) return;
    const act = b.dataset.act;
    if (act === 'prev') step(-1);
    else if (act === 'next') step(1);
    else if (act === 'full') {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else stageOf(cur).requestFullscreen?.().catch(() => {});
    } else if (act === 'share') {
      const data = { title: byslug.get(cur)!.title, url: location.href };
      if (navigator.share) navigator.share(data).catch(() => {});
      else navigator.clipboard?.writeText(location.href).then(() => flash(b, 'copied')).catch(() => {});
    }
  });

  // ---------- the wall's rows ----------
  // every card keeps its demo's shape. on a laptop the visible cards are split into rows (the split whose row heights land
  // closest to a target, tried every way since there are only a few), each row sized so its cards share a height and fill
  // the width. a last row that would grow too tall stays at the target instead
  function layout() {
    const lis = [...cards.values()].map((c) => c.li).filter((li) => !li.hidden);
    const W = wall.clientWidth;
    if (!W) return;
    if (W < 600) { lis.forEach((li) => { li.style.width = ''; }); return; }
    const G = 12, T = W >= 980 ? 380 : 300;
    const rs = lis.map((li) => Number(li.dataset.r));
    const height = (a: number, b: number) => (W - G * (b - a - 1)) / rs.slice(a, b).reduce((x, y) => x + y, 0);
    const n = lis.length;
    // best[i]: cheapest way to lay out cards i..n
    const best: { cost: number; to: number }[] = Array(n + 1);
    best[n] = { cost: 0, to: n };
    for (let i = n - 1; i >= 0; i--) {
      best[i] = { cost: Infinity, to: n };
      for (let j = i + 1; j <= n; j++) {
        const h = height(i, j);
        const last = j === n;
        const over = h > T * 1.2;
        if (over && !last) continue;
        const c = (last && over ? 0 : (h - T) ** 2) + best[j].cost + (last && over ? (W - rs.slice(i, j).reduce((x, y) => x + y, 0) * T) ** 2 / 40 : 0);
        if (c < best[i].cost) best[i] = { cost: c, to: j };
      }
    }
    for (let i = 0; i < n; i = best[i].to) {
      const j = best[i].to;
      let h = height(i, j);
      const capped = j === n && h > T * 1.2;
      if (capped) h = T;
      for (let k = i; k < j; k++) lis[k].style.width = `${Math.floor(rs[k] * h * 100) / 100}px`;
    }
  }
  new ResizeObserver(() => layout()).observe(wall);
  layout();

  // filter
  let kind = 'all';
  const seg = qa<HTMLButtonElement>('[data-filter]', root);
  const applyFilter = () => {
    let n = 0;
    PIECES.forEach((p) => {
      const ok = (kind === 'all' || p.kind === kind);
      cards.get(p.slug)!.li.hidden = !ok;
      if (ok) n++;
    });
    empty.hidden = n > 0;
    layout();
  };
  const pickSeg = (b: HTMLButtonElement, focus = false) => {
    kind = b.dataset.filter!;
    seg.forEach((s) => { s.setAttribute('aria-checked', String(s === b)); s.tabIndex = s === b ? 0 : -1; });
    if (focus) b.focus();
    applyFilter();
  };
  seg.forEach((b, i) => {
    b.addEventListener('click', () => pickSeg(b));
    b.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      pickSeg(seg[(i + d + seg.length) % seg.length], true);
    });
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cur && !document.fullscreenElement) close();
  });

  // ---------- entrance ----------
  let running: Animation[] = [];
  function enter() {
    running.forEach((a) => a.cancel());
    running = [];
    const kind = enterKind();
    const lis = [...cards.values()].map((c) => c.li).filter((li) => !li.hidden);
    const go = (el: Element, keys: Keyframe[], opts: KeyframeAnimationOptions) => { running.push(el.animate(keys, { fill: 'backwards', ...opts })); };
    if (reduced.matches) { go(wall, [{ opacity: 0 }, { opacity: 1 }], { duration: 150 }); return; }
    go(head, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: EASE });
    if (kind === 'skeleton') {
      // the surfaces are there at once; each demo fades in when it is ready
      cards.forEach((c, slug) => {
        const el = demos.get(slug)!.el;
        if (!el || el.parentElement !== c.art || !('ready' in el.dataset)) return;
        el.style.transition = 'none'; delete el.dataset.ready; void el.offsetWidth; el.style.transition = '';
        frames(2).then(() => { el.dataset.ready = ''; });
      });
    } else if (kind === 'rise') {
      lis.forEach((li, i) => go(li, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 50 * i, easing: EASE }));
    } else if (kind === 'stitch') {
      lis.forEach((li, i) => go(li, [{ clipPath: 'inset(0 0 100% 0 round 24px)' }, { clipPath: 'inset(0 0 0% 0 round 24px)' }], { duration: 400, delay: 70 * i, easing: 'steps(8, end)' }));
    } else if (kind === 'cascade') {
      const xs = [...new Set(lis.map((li) => li.offsetLeft))].sort((a, b) => a - b);
      const seen: number[] = xs.map(() => 0);
      lis.forEach((li) => {
        const c = xs.indexOf(li.offsetLeft);
        go(li, [{ opacity: 0, transform: 'translateY(-24px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 560, delay: c * 90 + seen[c]++ * 60, easing: EASE });
      });
    } else {
      lis.forEach((li) => go(li, [{ opacity: 0, filter: 'blur(10px)', transform: 'scale(1.03)' }, { opacity: 1, filter: 'blur(0px)', transform: 'none' }], { duration: 640, delay: Math.random() * 300, easing: EASE }));
    }
  }
  addEventListener('proto:change', (e) => {
    const k = (e as CustomEvent).detail?.key;
    if (k === 'enter' && !cur && !busy) { wallview.hidden = false; enter(); }
  });

  // ---------- start ----------
  // we restore the wall's scroll ourselves; the browser's own restore on back would fight it
  history.scrollRestoration = 'manual';
  const first = urlPiece();
  if (first) {
    swapToDetail(first);
    scrollTo0();
    history.replaceState({ piece: first }, '', location.href);
  } else {
    html.dataset.vault = 'wall';
    enter();
  }
}
