// the font preview demo: a finder window, a fonts folder, and quick look, all running in the page. it plays itself
// with a cursor while it's on screen; the moment you click or press a key inside, it's yours. space opens and closes
// the preview, ↑ ↓ move between files (the preview follows), return or a double click opens a folder, ⌘↑ goes back.
// under reduced motion it never plays itself, and the steps under it jump straight to each state
import { FONTS, DOWNLOADS, FONTS_CSS, latin, glyphs, type Font } from './fonts';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SIZES = [72, 48, 36, 24, 18, 14];
const SAMPLE = 'The quick brown fox jumps over the lazy dog';
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
type PostHogClient = { capture: (event: string) => void };
type PostHogLogClient = { info: (message: string, attributes?: Record<string, string | number | boolean>) => void };
const capture = (event: string) => (window as Window & { posthog?: PostHogClient }).posthog?.capture(event);
const log = (message: string, attributes?: Record<string, string | number | boolean>) => (window as Window & { posthogLog?: PostHogLogClient }).posthogLog?.info(message, attributes);

const ICON = {
  folder: '<svg viewBox="0 0 20 16"><path d="M1 3.2C1 2 2 1 3.2 1h4.3c.6 0 1.1.3 1.5.7L10 3h6.8C18 3 19 4 19 5.2v8.6c0 1.2-1 2.2-2.2 2.2H3.2C2 16 1 15 1 13.8z" fill="#5ab0f7"/><path d="M1 5.6C1 4.7 1.7 4 2.6 4h14.8c.9 0 1.6.7 1.6 1.6v8.2c0 1.2-1 2.2-2.2 2.2H3.2C2 16 1 15 1 13.8z" fill="#84c6fb"/></svg>',
  font: '<svg viewBox="0 0 16 20"><path d="M1.5 1.5h9l4 4v13h-13z" fill="#fff" stroke="#c8c8cc"/><path d="M10.5 1.5v4h4" fill="#ececef" stroke="#c8c8cc"/><text x="8" y="15.5" text-anchor="middle" font-size="7" font-family="Georgia, serif" fill="#3a3a3c">Aa</text></svg>',
  pdf: '<svg viewBox="0 0 16 20"><path d="M1.5 1.5h9l4 4v13h-13z" fill="#fff" stroke="#c8c8cc"/><rect x="3" y="12" width="10" height="4.5" rx="1" fill="#e5483d"/></svg>',
  img: '<svg viewBox="0 0 16 20"><path d="M1.5 1.5h9l4 4v13h-13z" fill="#fff" stroke="#c8c8cc"/><path d="M3.5 16l3-4 2 2.5 1.5-1.5 2.5 3z" fill="#34a37b"/><circle cx="10.5" cy="9" r="1.3" fill="#f2b33d"/></svg>',
  mov: '<svg viewBox="0 0 16 20"><path d="M1.5 1.5h9l4 4v13h-13z" fill="#fff" stroke="#c8c8cc"/><rect x="3.5" y="10" width="9" height="6.5" rx="1" fill="#3a3a3c"/><path d="M7 11.8v2.9l2.4-1.45z" fill="#fff"/></svg>',
};

type Row = { name: string; kind: string; folder?: boolean; icon?: keyof typeof ICON; font?: Font };
type State = { dir: 'Downloads' | 'Fonts'; sel: number; ql: boolean; dark: boolean };

const STEPS: State[] = [
  { dir: 'Fonts', sel: -1, ql: false, dark: false },
  { dir: 'Fonts', sel: 0, ql: false, dark: false },
  { dir: 'Fonts', sel: 0, ql: true, dark: false },
  { dir: 'Fonts', sel: 0, ql: true, dark: true },
  { dir: 'Fonts', sel: 1, ql: true, dark: true },
];

export function demo(root: HTMLElement) {
  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const desk = $('[data-desk]');
  const list = $('[data-list]');
  const ql = $('[data-ql]');
  const qlName = $('[data-ql-name]');
  const qlBody = $('[data-ql-body]');
  const cur = $('[data-cursor]');
  const hint = $('[data-hint]');
  const replay = $<HTMLButtonElement>('[data-replay]');
  const steps = [...root.querySelectorAll<HTMLButtonElement>('[data-step]')];
  const caps = [...root.querySelectorAll<HTMLElement>('[data-cap]')];
  const keys = Object.fromEntries([...root.querySelectorAll<HTMLButtonElement>('[data-key]')].map((k) => [k.dataset.key!, k]));

  let s: State = { dir: 'Downloads', sel: -1, ql: false, dark: false };
  let face: Record<string, number> = {};
  let shown = '';
  let run = 0;
  let driving = false;

  const rows = (): Row[] => (s.dir === 'Downloads' ? DOWNLOADS : FONTS.map((f) => ({ name: f.file, kind: f.kind, font: f })));
  const rowEl = (i: number) => list.children[i] as HTMLElement | undefined;

  // ---- drawing
  const drawList = () => {
    list.innerHTML = rows().map((r, i) => `<li role="option" id="fp-r${i}" data-i="${i}" aria-selected="false"><span class="fp-ic">${ICON[r.folder ? 'folder' : r.font ? 'font' : r.icon ?? 'pdf']}</span><span class="fp-nm">${esc(r.name)}</span><span class="fp-kd">${esc(r.kind)}</span></li>`).join('');
    root.querySelectorAll('[data-dir]').forEach((el) => (el.textContent = s.dir));
    root.querySelectorAll<HTMLElement>('[data-side]').forEach((el) => el.toggleAttribute('data-on', el.dataset.side === s.dir));
    $('[data-back]').toggleAttribute('disabled', s.dir === 'Downloads');
  };
  const drawPreview = () => {
    const r = rows()[s.sel];
    if (!r) return;
    const key = s.dir + s.sel;
    qlName.textContent = r.name;
    if (key === shown) return applyFace();
    shown = key;
    if (!r.font) {
      qlBody.innerHTML = `<div class="fq-plain"><span class="fp-ic">${ICON[r.folder ? 'folder' : r.icon ?? 'pdf']}</span><p>${esc(r.name)}</p><small>${esc(r.kind)}</small></div>`;
      qlBody.removeAttribute('style');
      return;
    }
    const f = r.font;
    face[f.family] ??= Math.max(0, f.faces.findIndex((x) => x.name === 'Regular'));
    const sample = f.sample ?? SAMPLE;
    qlBody.innerHTML = `
      <div class="fq-head">
        <div><p class="fq-fam">${esc(f.family)}</p><p class="fq-face"></p><p class="fq-meta">${esc(f.format)} · ${f.faces.length} faces · ${esc(f.by)}</p></div>
        <div class="fq-tools">
          <label class="fq-sel"><span class="sr">Face</span><select data-face>${f.faces.map((x, i) => `<option value="${i}">${x.name}</option>`).join('')}</select></label>
          <button type="button" class="fq-theme" data-theme aria-label="Dark background" aria-pressed="false"><svg class="moon" viewBox="0 0 16 16"><path d="M13.2 10.1A5.6 5.6 0 0 1 5.9 2.8a5.6 5.6 0 1 0 7.3 7.3z" fill="currentColor"/></svg><svg class="sun" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="3" fill="currentColor" stroke="none"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/></svg></button>
        </div>
      </div>
      <p class="fq-k">Sizes</p>
      ${SIZES.map((z) => `<p class="fq-size" style="--s:${z}"><small>${z}</small><span>${esc(sample)}</span></p>`).join('')}
      <p class="fq-k" data-set>Character set</p>
      ${latin(f).map((l) => `<p class="fq-set">${esc(l)}</p>`).join('')}
      <p class="fq-k">Glyphs</p>
      <div class="fq-grid">${glyphs(f).map((g) => `<span>${esc(g)}</span>`).join('')}</div>`;
    qlBody.scrollTop = 0;
    applyFace();
  };
  const applyFace = () => {
    const f = rows()[s.sel]?.font;
    if (!f) return;
    const x = f.faces[face[f.family]];
    qlBody.style.fontFamily = `"${f.family}", ui-serif, Georgia, serif`;
    qlBody.style.fontWeight = String(x.w);
    qlBody.style.fontStyle = x.i ? 'italic' : 'normal';
    qlBody.querySelector<HTMLSelectElement>('[data-face]')!.value = String(face[f.family]);
    qlBody.querySelector('.fq-face')!.textContent = x.name;
    const t = qlBody.querySelector<HTMLButtonElement>('[data-theme]')!;
    t.setAttribute('aria-pressed', String(s.dark));
    t.setAttribute('aria-label', s.dark ? 'Light background' : 'Dark background');
  };
  const set = (next: Partial<State>) => {
    const dirChanged = next.dir && next.dir !== s.dir;
    s = { ...s, ...next };
    if (dirChanged) { drawList(); shown = ''; }
    [...list.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === s.sel)));
    list.setAttribute('aria-activedescendant', s.sel >= 0 ? `fp-r${s.sel}` : '');
    if (s.ql && s.sel < 0) s.ql = false;
    if (s.ql) {
      // the window grows out of the file it shows
      const row = rowEl(s.sel);
      if (row && !ql.classList.contains('open')) {
        const d = ql.getBoundingClientRect(), r = row.getBoundingClientRect();
        ql.style.transformOrigin = `${r.left + 40 - d.left}px ${r.top + r.height / 2 - d.top}px`;
      }
      drawPreview();
    }
    ql.classList.toggle('open', s.ql);
    ql.setAttribute('aria-hidden', String(!s.ql));
    ql.dataset.theme = s.dark ? 'dark' : 'light';
    // the step under the stage follows whatever state you got to
    const at = s.dir !== 'Fonts' ? 0 : s.ql && s.sel > 0 ? 4 : s.ql && s.dark ? 3 : s.ql ? 2 : s.sel >= 0 ? 1 : 0;
    steps.forEach((b, i) => (i === at ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    caps.forEach((c, i) => (c.hidden = i !== at));
  };

  // ---- what you can do
  const press = (k: string) => { const b = keys[k]; if (!b) return; b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 160); };
  const space = () => { press('space'); if (s.sel >= 0) set({ ql: !s.ql }); };
  const step = (d: number) => { press(d > 0 ? 'down' : 'up'); const n = rows().length; set({ sel: s.sel < 0 ? 0 : Math.max(0, Math.min(n - 1, s.sel + d)) }); };
  const open = (i = s.sel) => { const r = rows()[i]; if (r?.folder) set({ dir: 'Fonts', sel: -1, ql: false }); else if (r) set({ sel: i, ql: true }); };
  const back = () => set({ dir: 'Downloads', sel: 0, ql: false });
  const theme = () => set({ dark: !s.dark });

  const takeOver = () => {
    if (driving) return;
    driving = true;
    capture('font_preview_demo_interacted');
    log('font preview demo taken over', { interaction_mode: 'manual' });
    run++;
    root.classList.add('driving');
    hint.textContent = 'You’re driving. Space opens and closes, ↑ ↓ move, Esc closes.';
    replay.hidden = false;
  };
  const keep = () => desk.focus({ preventScroll: true });

  desk.addEventListener('pointerdown', (e) => {
    takeOver();
    const t = e.target as HTMLElement;
    if (!t.closest('select, button')) keep();
  });
  list.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('li');
    if (!li) return set({ sel: -1, ql: false });
    const i = Number(li.dataset.i);
    // on a touch screen a second tap on a selected folder opens it
    if (i === s.sel && rows()[i].folder && (e as PointerEvent).pointerType !== 'mouse') return open(i);
    set({ sel: i });
  });
  list.addEventListener('dblclick', (e) => { const li = (e.target as HTMLElement).closest<HTMLElement>('li'); if (li) open(Number(li.dataset.i)); });
  $('[data-back]').addEventListener('click', () => { back(); keep(); });
  root.querySelectorAll<HTMLElement>('[data-side]').forEach((el) => el.addEventListener('click', () => { if (el.dataset.side === 'Downloads') back(); else if (el.dataset.side === 'Fonts') set({ dir: 'Fonts', sel: -1, ql: false }); keep(); }));
  $('[data-ql-close]').addEventListener('click', () => { set({ ql: false }); keep(); });
  qlBody.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('[data-theme]')) { takeOver(); theme(); keep(); } });
  qlBody.addEventListener('change', (e) => {
    const sel = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-face]');
    const f = rows()[s.sel]?.font;
    if (!sel || !f) return;
    face[f.family] = Number(sel.value);
    applyFace();
    keep();
  });
  desk.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t.tagName === 'SELECT') return;
    if ((e.key === ' ' || e.key === 'Enter') && t.tagName === 'BUTTON') return;
    let done = true;
    if (e.key === ' ') space();
    else if (e.key === 'Escape') { if (s.ql) set({ ql: false }); else done = false; }
    else if (e.key === 'ArrowDown' && e.metaKey) open();
    else if (e.key === 'ArrowUp' && e.metaKey) back();
    else if (e.key === 'ArrowDown') step(1);
    else if (e.key === 'ArrowUp') step(-1);
    else if (e.key === 'Enter') open();
    else if (e.key === 'Backspace') back();
    else done = false;
    if (done) { e.preventDefault(); takeOver(); }
  });
  // the keys under the stage are buttons too, for a phone or a mouse
  keys.space?.addEventListener('click', () => { takeOver(); if (s.sel < 0 && s.dir === 'Fonts') set({ sel: 0 }); space(); });
  keys.up?.addEventListener('click', () => { takeOver(); step(-1); });
  keys.down?.addEventListener('click', () => { takeOver(); step(1); });
  steps.forEach((b, i) => b.addEventListener('click', () => { takeOver(); set(STEPS[i]); }));
  replay.addEventListener('click', () => { driving = false; root.classList.remove('driving'); replay.hidden = true; hint.textContent = hintIdle; play(); });
  const hintIdle = hint.textContent ?? '';

  // ---- the show: a cursor walks it through, and stops the moment you touch anything
  const wait = (ms: number, g: number) => new Promise<void>((res, rej) => setTimeout(() => (g === run ? res() : rej()), ms));
  const to = async (el: Element | null | undefined, g: number, fx = .3, fy = .5) => {
    if (!el) return;
    const d = desk.getBoundingClientRect(), r = el.getBoundingClientRect();
    cur.style.translate = `${(r.left - d.left + r.width * fx).toFixed(1)}px ${(r.top - d.top + r.height * fy).toFixed(1)}px`;
    await wait(750, g);
  };
  const click = async (g: number) => { cur.classList.add('down'); await wait(130, g); cur.classList.remove('down'); };
  let warmed = false;
  const play = async () => {
    if (reduced || driving) return;
    const g = ++run;
    try {
      for (;;) {
        set({ dir: 'Downloads', sel: -1, ql: false, dark: false });
        // hold the first quick look until its face is in (1.2 s at most), so the specimen never swaps in view
        if (!warmed) { warmed = true; await Promise.race([document.fonts.load(`400 1em "${FONTS[0].family}"`).catch(() => {}), wait(1200, g)]); }
        cur.classList.add('on');
        await wait(700, g);
        await to(rowEl(0), g); await click(g); set({ sel: 0 }); await wait(160, g); await click(g); open(0);
        await wait(1100, g);
        await to(rowEl(0), g); await click(g); set({ sel: 0 });
        await wait(900, g);
        space();
        await wait(2600, g);
        const cs = qlBody.querySelector<HTMLElement>('[data-set]');
        if (cs) qlBody.scrollTo({ top: cs.offsetTop - 16, behavior: 'smooth' });
        await wait(2400, g);
        qlBody.scrollTo({ top: 0, behavior: 'smooth' });
        await wait(900, g);
        await to(qlBody.querySelector('[data-theme]'), g, .5, .5); await click(g); theme();
        await wait(2200, g);
        cur.classList.remove('on');
        for (let i = 1; i < FONTS.length; i++) { step(1); await wait(2300, g); }
        space();
        await wait(1200, g);
        cur.classList.add('on');
        await to($('[data-back]'), g, .5, .5); await click(g); back();
        await wait(1600, g);
      }
    } catch { /* cancelled: someone took over, or it left the screen */ }
    if (g === run) cur.classList.remove('on');
  };

  drawList();
  set({});
  // the fonts load as the demo comes near; it plays only while it's on screen
  new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = FONTS_CSS;
    document.head.append(l);
  }, { rootMargin: '600px' }).observe(root);
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !driving) play();
    else if (!e.isIntersecting && !driving) { run++; cur.classList.remove('on'); }
  }, { threshold: .45 }).observe(desk);
}
