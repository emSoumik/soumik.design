// About me: the bee flies to the link, lands, and morphs into a small intro panel
// (Dynamic Island style). Closing folds the panel back into the bee, which flies off.
// createAbout({ bee }) -> { open(from), close() }
import { EMAIL, SOCIALS, WHYCLUB } from './content.js';

const AVATAR = new URL('../assets/avatar.png', import.meta.url).href;
const MORPH = 'cubic-bezier(.32,.72,0,1)';
const OUT = 'cubic-bezier(.23,1,.32,1)';

const CSS = `
.ab { position: fixed; z-index: 70; width: min(372px, calc(100vw - 24px)); padding: 20px 22px 18px; border-radius: 28px; color: #1f1d1b;
  background: rgba(255,255,255,.84); backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4);
  box-shadow: 0 0 0 1px rgba(29,27,26,.08), inset 0 1px 0 rgba(255,255,255,.9), 0 24px 50px -20px rgba(50,35,20,.4), 0 6px 18px -10px rgba(50,35,20,.25);
  font: 400 14px/1.5 -apple-system, system-ui, sans-serif; will-change: clip-path; }
.ab:focus { outline: none; }
/* the bee's skin, which fades as the panel takes shape */
.ab-skin { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0;
  background: radial-gradient(120% 140% at 50% 100%, #f6d777, #f3c64b 55%, #eab53a); }
.ab-in > * { opacity: 0; }
.ab-top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.ab-top img { width: 52px; height: 52px; object-fit: contain; mix-blend-mode: multiply; margin: -4px -2px -4px -6px; }
.ab-top h2 { font: 500 24px/1.1 "Instrument Sans", -apple-system, system-ui, sans-serif; letter-spacing: -.03em; color: rgba(31,29,27,.5); }
.ab-top h2 i { font-style: normal; color: #1f1d1b; }
.ab-x { all: unset; cursor: pointer; margin-left: auto; align-self: flex-start; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
  background: rgba(29,27,26,.06); transition: background .2s, transform .16s ease-out; }
@media (hover: hover) and (pointer: fine) { .ab-x:hover { background: rgba(29,27,26,.12); } } .ab-x:active { transform: scale(.94); }
.ab-x::before { content: ""; position: absolute; inset: -8px; } .ab-x { position: relative; }
.ab dd a, .ab dd button { position: relative; } .ab dd a::before, .ab dd button::before { content: ""; position: absolute; inset: -10px -4px; }
.ab-x:focus-visible { outline: 1.5px solid currentColor; outline-offset: 2px; }
.ab-x svg { width: 10px; height: 10px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }
.ab p { color: rgba(31,29,27,.72); margin: 0 0 16px; text-wrap: pretty; }
.ab dl { display: grid; grid-template-columns: 74px 1fr; gap: 9px 12px; margin: 0; padding-top: 14px; border-top: 1px solid rgba(31,29,27,.1);
  font: 400 12px/1.3 ui-monospace, "SF Mono", Menlo, monospace; }
.ab dt { color: rgba(31,29,27,.45); } .ab dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
.ab dd a, .ab dd button { all: unset; cursor: pointer; border-radius: 4px; transition: color .2s; }
.ab dd a:focus-visible, .ab dd button:focus-visible { outline: 1.5px solid currentColor; outline-offset: 2px; }
.ab dd .sep { color: rgba(31,29,27,.3); margin: 0 6px; }
@media (hover: hover) and (pointer: fine) {
  .ab dd a:hover, .ab dd button:hover { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
}
@media (max-width: 640px) { .ab { padding: 18px 18px 16px; } .ab-top h2 { font-size: 22px; } }
`;

export function createAbout({ bee } = {}) {
  if (!document.getElementById('ab-style')) document.head.insertAdjacentHTML('beforeend', `<style id="ab-style">${CSS}</style>`);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ext = s => s.href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
  const el = document.createElement('div');
  el.className = 'ab';
  el.hidden = true;
  el.tabIndex = -1;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-labelledby', 'ab-title');
  el.innerHTML = `<div class="ab-skin" aria-hidden="true"></div>
    <div class="ab-in">
      <div class="ab-top"><img src="${AVATAR}" alt="" onerror="this.onerror=null;this.src=this.src.replace('avatar.png','avatar-src.jpg')">
        <h2 id="ab-title">Hi, I’m <i>Soumik</i>.</h2>
        <button class="ab-x" type="button" aria-label="Close"><svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3L3 9"/></svg></button></div>
      <p>Design engineer. I design and build interfaces end to end: the brand, the motion, the WebGL, and the code that ships it.</p>
      <dl>
        <dt>made</dt><dd><a href="${WHYCLUB.href}" target="_blank" rel="noopener">${WHYCLUB.domain} ↗</a><span class="sep">·</span><button type="button" data-work>see the work ↓</button></dd>
        <dt>say hi</dt><dd><a href="mailto:${EMAIL}">${EMAIL}</a></dd>
        <dt>elsewhere</dt><dd>${SOCIALS.filter(s => s.label !== 'Email').map(s => `<a href="${s.href}"${ext(s)}>${s.label} ↗</a>`).join('<span class="sep">·</span>')}</dd>
      </dl>
    </div>`;
  document.body.appendChild(el);
  const skin = el.querySelector('.ab-skin');
  const kids = [...el.querySelector('.ab-in').children];
  let isOpen = false, busy = false, opener = null, anim = [];

  const stop = () => { anim.forEach(a => a.cancel()); anim = []; };

  // Sits above its trigger, centred on it, kept inside the viewport.
  function place(from) {
    const r = from.getBoundingClientRect();
    el.hidden = false;
    el.style.visibility = 'hidden';
    el.style.left = el.style.top = '0px';
    const w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2));
    const above = r.top - h - 16;
    const top = above > 12 ? above : Math.min(innerHeight - h - 12, r.bottom + 16);
    el.style.left = `${left}px`; el.style.top = `${top}px`;
    return { left, top, w, h, below: top > r.top };
  }

  // clip-path inset that crops the panel down to a rectangle in viewport px
  const crop = (p, r, round) => {
    const b = { left: Math.max(p.left, r.left), top: Math.max(p.top, r.top), right: Math.min(p.left + p.w, r.right), bottom: Math.min(p.top + p.h, r.bottom) };
    return `inset(${b.top - p.top}px ${p.left + p.w - b.right}px ${p.top + p.h - b.bottom}px ${b.left - p.left}px round ${round}px)`;
  };

  async function open(from) {
    if (isOpen || busy) return;
    busy = true; isOpen = true;
    opener = from || document.activeElement;
    // measure the panel first (still invisible), so the bee lands where the panel will grow from:
    // the edge nearest the link
    const p = place(opener);
    const r = opener.getBoundingClientRect();
    const lx = Math.max(p.left + 30, Math.min(p.left + p.w - 30, r.left + r.width / 2));
    const ly = p.below ? p.top + 22 : p.top + p.h - 12;
    if (bee && !reduced) await Promise.race([bee.flyTo(lx + scrollX, ly + scrollY), new Promise(res => setTimeout(res, 1600))]);
    el.style.visibility = '';
    stop();
    if (reduced || !bee) {
      anim = [el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: OUT })];
      kids.forEach(k => k.style.opacity = 1);
    } else {
      const b = bee.rect();
      bee.el.style.opacity = 0;
      const from = crop(p, b, 13);
      const to = `inset(0px 0px 0px 0px round 28px)`;
      anim.push(el.animate([{ clipPath: from }, { clipPath: to }], { duration: 540, easing: MORPH }));
      anim.push(skin.animate([{ opacity: 1 }, { opacity: .9, offset: .15 }, { opacity: 0 }], { duration: 340, easing: OUT }));
      kids.forEach((k, i) => anim.push(k.animate(
        [{ opacity: 0, transform: 'translateY(6px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'none' }],
        { duration: 360, delay: 200 + i * 50, easing: OUT, fill: 'both' })));
    }
    el.focus({ preventScroll: true });
    busy = false;
  }

  async function close(next) {
    if (!isOpen || busy) return;
    busy = true;
    const p = { left: el.offsetLeft, top: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    stop();
    if (reduced || !bee) {
      await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: OUT }).finished;
    } else {
      const b = bee.rect();
      const fold = [
        el.animate([{ clipPath: 'inset(0px 0px 0px 0px round 28px)' }, { clipPath: crop(p, b, 13) }], { duration: 320, easing: OUT, fill: 'forwards' }),
        skin.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: OUT, fill: 'forwards' }),
        ...kids.map(k => k.animate([{ opacity: 1 }, { opacity: 0, filter: 'blur(3px)' }], { duration: 140, easing: OUT, fill: 'forwards' })),
      ];
      await fold[0].finished;
      bee.el.style.opacity = '';
      fold.forEach(a => a.cancel());
    }
    el.hidden = true;
    kids.forEach(k => k.style.opacity = '');
    bee?.release(next === 'work' ? 'this way!' : 'bye!');
    isOpen = false; busy = false;
    if (next !== 'work') opener?.focus?.({ preventScroll: true });
  }

  el.querySelector('.ab-x').addEventListener('click', () => close());
  el.querySelector('[data-work]').addEventListener('click', async () => {
    await close('work');
    document.getElementById('work')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) close(); });
  addEventListener('pointerdown', e => { if (isOpen && !busy && !el.contains(e.target) && !opener?.contains(e.target)) close(); }, true);
  addEventListener('scroll', () => { if (isOpen && !busy && scrollY > innerHeight * .4) close(); }, { passive: true });

  return { open, close, get isOpen() { return isOpen; } };
}
