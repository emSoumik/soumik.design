// Mochi's little notification: types one line, then taps through to wherever `onOpen` goes.
// Desktop: bottom-right card. Phone: a banner that drops in from the top, iOS style.
// peek({ text, onOpen }) -> { hide() }
import { wipCat } from './cats.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const avatar = () => wipCat().replace('viewBox="0 0 180 160"', 'viewBox="34 36 112 112"');
const delay = (ch, next) => /[.?!]/.test(ch) && next === ' ' ? 260 : /[,;:]/.test(ch) ? 130 : 20 + Math.random() * 6;

const CSS = `
.pk { position: fixed; z-index: 60; right: max(20px, env(safe-area-inset-right)); bottom: 20px; width: 300px; transform-origin: 100% 100%;
  opacity: 0; transform: translateY(18px) scale(.9); filter: blur(6px); transition: transform .7s cubic-bezier(.3,1.4,.5,1), opacity .35s ease, filter .45s ease; }
.pk.show { opacity: 1; transform: none; filter: none; }
.pk.out { opacity: 0; transform: translateY(10px) scale(.96); filter: blur(4px); transition: transform .3s cubic-bezier(.23,1,.32,1), opacity .25s ease, filter .25s ease; }
.pk-main { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 40px 10px 10px; border-radius: 24px;
  background: rgba(255,255,255,.78); backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4); color: #1d1b1a;
  box-shadow: 0 0 0 1px rgba(29,27,26,.08), inset 0 1px 0 rgba(255,255,255,.9), 0 24px 50px -20px rgba(50,35,20,.4), 0 6px 18px -10px rgba(50,35,20,.25);
  transition: transform .4s cubic-bezier(.3,1.4,.5,1); }
@media (hover: hover) and (pointer: fine) { .pk-main:hover { transform: translateY(-2px); } } .pk-main:active { transform: scale(.97); transition-duration: .16s; }
.pk-main:focus-visible { outline: 1.5px solid #1d1b1a; outline-offset: 3px; }
.pk-av { position: relative; flex: none; width: 44px; height: 44px; border-radius: 50%; overflow: hidden;
  background: radial-gradient(circle at 50% 30%, #fffaf2, #f6e6d6); box-shadow: 0 0 0 1px rgba(29,27,26,.08), 0 6px 14px -8px rgba(60,40,20,.4); }
.pk-av svg { width: 100%; height: 100%; display: block; }
.pk-av i { position: absolute; z-index: 1; right: 1px; top: 1px; width: 9px; height: 9px; border-radius: 50%; background: #ff6a5c; box-shadow: 0 0 0 2px #fff; }
.pk-body { display: grid; gap: 5px; min-width: 0; }
.pk-name { font: 600 12px/1 system-ui, sans-serif; } .pk-name i { margin-left: 7px; font: 400 10px/1 ui-monospace, "SF Mono", Menlo, monospace; font-style: normal; opacity: .56; }
.pk-text { font: 400 13.5px/1.32 system-ui, sans-serif; } .pk-text .b { visibility: hidden; }
.pk-x { all: unset; cursor: pointer; position: absolute; right: 10px; top: 10px; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%;
  background: rgba(29,27,26,.06); opacity: 0; transition: opacity .2s; }
.pk:hover .pk-x, .pk-x:focus-visible { opacity: 1; }
.pk-x svg { width: 9px; height: 9px; fill: none; stroke: #1d1b1a; stroke-width: 1.5; stroke-linecap: round; }
@media (max-width: 640px) {
  .pk { left: 14px; right: 14px; width: auto; bottom: auto; top: calc(10px + env(safe-area-inset-top)); transform-origin: 50% 0; transform: translateY(-24px) scale(.92); }
  .pk.show { transform: none; } .pk.out { transform: translateY(-14px) scale(.96); }
  .pk-main { margin-inline: auto; width: fit-content; max-width: 100%; padding: 8px 20px 8px 8px; border-radius: 99px; }
  .pk-av { width: 40px; height: 40px; } .pk-text { white-space: nowrap; font-size: 13px; } .pk-x { display: none; }
}
@media (prefers-reduced-motion: reduce) { .pk, .pk.out { transition-duration: .01s; filter: none; } }
`;

export function peek({ text, onOpen }) {
  if (!document.getElementById('pk-style')) document.head.insertAdjacentHTML('beforeend', `<style id="pk-style">${CSS}</style>`);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.className = 'pk';
  el.setAttribute('role', 'status');
  el.innerHTML = `<button class="pk-main" type="button"><span class="pk-av"><i aria-hidden="true"></i>${avatar()}</span>
    <span class="pk-body"><span class="pk-name">mochi<i>now</i></span><span class="pk-text"><span class="a"></span><span class="b" aria-hidden="true"></span></span></span></button>
    <button class="pk-x" type="button" aria-label="Dismiss"><svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3L3 9"/></svg></button>`;
  document.body.appendChild(el);
  const [a, b] = el.querySelectorAll('.pk-text span');
  let gone = false, timer = 0;

  function hide() {
    if (gone) return;
    gone = true; clearTimeout(timer);
    el.classList.replace('show', 'out');
    setTimeout(() => el.remove(), reduced ? 0 : 450);
  }
  const arm = () => { clearTimeout(timer); timer = setTimeout(hide, 9000); };
  el.addEventListener('pointerenter', () => clearTimeout(timer));
  el.addEventListener('pointerleave', arm);
  el.querySelector('.pk-main').addEventListener('click', () => { hide(); onOpen?.(); });
  el.querySelector('.pk-x').addEventListener('click', hide);

  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  arm();
  (async () => {
    if (reduced) { a.textContent = text; return; }
    b.textContent = text;
    await sleep(520);
    for (let i = 1; i <= text.length && !gone; i++) {
      a.textContent = text.slice(0, i); b.textContent = text.slice(i);
      await sleep(delay(text[i - 1], text[i]));
    }
  })();
  return { hide };
}
