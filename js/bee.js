// A little bee that drifts between flowers, perches for a few seconds, sometimes comes
// to see what the cursor is doing, loops when you tap it, and rushes to every new patch.
// One transformed element, so it moves on the compositor.
import { beeSVG } from './cats.js';
import { feel } from './feel.js';

export const BEE_CSS = `
.bee { position: absolute; left: 0; top: 0; width: 36px; height: 23px; z-index: 30; cursor: pointer;
  will-change: transform; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
/* a 48px target around a small bee, so a thumb can catch it */
.bee::before { content: ""; position: absolute; inset: -13px -6px; }
.bee .jig, .bee .tilt { width: 100%; height: 100%; }
.bee.hit .jig { animation: jig .42s cubic-bezier(.3, 1.4, .5, 1); }
@keyframes jig { 0% { transform: scale(1); } 20% { transform: scale(1.18, .86) rotate(-6deg); } 45% { transform: scale(.94, 1.08) rotate(5deg); } 70% { transform: rotate(-3deg); } 100% { transform: none; } }
.bee .flip { width: 100%; height: 100%; transition: transform .25s cubic-bezier(.3, 1.4, .5, 1); }
.bee.right .flip { transform: scaleX(-1); }
.bee-svg { width: 100%; height: 100%; overflow: visible; display: block; }
.bee-svg { image-rendering: pixelated; }
/* two wing frames, swapped in steps like a sprite */
.bee .wa { animation: wa 90ms steps(1) infinite; } .bee .wd { animation: wd 90ms steps(1) infinite; }
@keyframes wa { 0% { opacity: 1; } 50% { opacity: 0; } } @keyframes wd { 0% { opacity: 0; } 50% { opacity: 1; } }
.bee.rest .wa { animation: rwa 2.6s steps(1) infinite; } .bee.rest .wd { animation: rwd 2.6s steps(1) infinite; }
@keyframes rwa { 0% { opacity: 1; } 88% { opacity: 0; } 92% { opacity: 1; } 95% { opacity: 0; } 98% { opacity: 1; } }
@keyframes rwd { 0% { opacity: 0; } 88% { opacity: 1; } 92% { opacity: 0; } 95% { opacity: 1; } 98% { opacity: 0; } }
.bee .say { position: absolute; left: 70%; bottom: 95%; padding: 3px 8px; border-radius: 10px 10px 10px 2px;
  background: #fff; color: #1d1c1b; font: 500 11.5px/1.2 "Instrument Sans", system-ui, sans-serif; white-space: nowrap;
  box-shadow: 0 0 0 1px rgba(42, 40, 38, .14), 0 6px 14px -8px rgba(0, 0, 0, .3);
  opacity: 0; transform: translateY(4px) scale(.9); transform-origin: 0 100%;
  transition: opacity .2s, transform .3s cubic-bezier(.3, 1.5, .5, 1); pointer-events: none; }
.bee.talk .say { opacity: 1; transform: none; }
/* near the right edge the bubble opens to the left, so it never runs off a phone screen */
.bee.edge .say { left: auto; right: 70%; border-radius: 10px 10px 2px 10px; transform-origin: 100% 100%; }
@media (max-width: 640px) { .bee { width: 32px; height: 21px; } }
@media (prefers-reduced-motion: reduce) { .bee .wa, .bee .wd, .bee.hit .jig { animation: none; } .bee .wd { opacity: 0; } }
`;

const LINES = ['bzz!', 'hi :)', 'bzzt', 'busy bee', 'tickles!', 'plant more?'];
const PERCH = ['mmm, pollen', 'bzz…', 'this one smells nice', 'comfy', 'five more minutes'];
const NEW = ['ooh, a new one!', 'bzz! mine!', 'pretty!', 'coming!', 'more flowers!', 'yay'];
const any = a => a[Math.floor(Math.random() * a.length)];

export function createBee({ spots, start = 1.4 }) {
  const el = document.createElement('div');
  el.className = 'bee';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'A little bee');
  el.innerHTML = `<div class="tilt"><div class="flip"><div class="jig">${beeSVG()}</div></div></div><span class="say"></span>`;
  document.body.appendChild(el);
  const say = el.querySelector('.say'), tilt = el.querySelector('.tilt');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const pos = { x: -60, y: innerHeight * .3 }, vel = { x: 60, y: 0 };
  let mode = 'wait', timer = start, target = null, current = null, phase = Math.random() * 9;
  const cursor = { x: -1, y: -1, at: 0 };
  let t = 0, last = performance.now(), raf = 0, arrive = null, fast = false;

  // page coordinates: the bee lives in the hero and scrolls away with it
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { cursor.x = e.pageX; cursor.y = e.pageY; cursor.at = t; } }, { passive: true });

  function pick() {
    const list = spots().filter(s => s !== current && s.x > 10 && s.x < innerWidth - 10 && s.y > 30 && s.y < innerHeight - 10);
    if (fine && cursor.at > t - 4 && Math.random() < .2) {
      target = { x: cursor.x + 46, y: cursor.y - 30, curious: true };
    } else if (list.length) {
      // prefer a flower that is a short hop away, like a real bee working a patch
      list.sort((a, b) => Math.hypot(a.x - pos.x, a.y - pos.y) - Math.hypot(b.x - pos.x, b.y - pos.y));
      target = list[Math.min(list.length - 1, Math.floor(Math.random() * Math.min(5, list.length)) + (Math.random() < .25 ? 4 : 0))];
    } else {
      target = { x: innerWidth * (.2 + Math.random() * .6), y: innerHeight * (.2 + Math.random() * .5), curious: true };
    }
    mode = 'fly'; fast = false;
    el.classList.remove('rest');
  }

  function talk(text, ms = 1600) {
    say.textContent = text;
    el.classList.toggle('edge', pos.x - scrollX > innerWidth * .62);
    el.classList.add('talk');
    clearTimeout(talk.t);
    talk.t = setTimeout(() => el.classList.remove('talk'), ms);
  }

  el.addEventListener('click', () => {
    if (mode === 'held') return;
    feel.buzz();
    el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
    talk(any(LINES));
    if (reduced) return;
    mode = 'loop'; timer = .9; current = null;
    el.classList.remove('rest');
  });

  function place(x, y, rotDeg) {
    // the bee tilts; its speech bubble stays upright
    el.style.transform = `translate3d(${(x - el.offsetWidth / 2).toFixed(1)}px, ${(y - el.offsetHeight * .82).toFixed(1)}px, 0)`;
    tilt.style.transform = `rotate(${rotDeg.toFixed(1)}deg)`;
  }

  function step(now) {
    raf = requestAnimationFrame(step);
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    if (mode === 'held') { place(pos.x, pos.y + Math.sin(t * 2.4) * 1.2, Math.sin(t * .9) * 4); return; }
    if (scrollY > innerHeight * 1.1) return; // hero is offscreen: nothing to watch
    if (mode === 'wait') { timer -= dt; if (timer <= 0) pick(); place(pos.x, pos.y, 0); return; }
    if (mode === 'perch') {
      timer -= dt;
      if (timer <= 0) pick();
      place(pos.x, pos.y + Math.sin(t * 2) * .6, Math.sin(t * .8) * 3);
      return;
    }
    if (mode === 'loop') {
      timer -= dt;
      const a = (1 - timer / .9) * Math.PI * 2;
      pos.x += Math.cos(a) * 160 * dt; pos.y += Math.sin(a) * 160 * dt;
      place(pos.x, pos.y, a * 57.3);
      if (timer <= 0) pick();
      return;
    }
    // fly: steer toward the target with a lazy, loopy wander that settles on arrival
    const dx = target.x - pos.x, dy = target.y - pos.y, dist = Math.hypot(dx, dy) || 1;
    const speed = fast ? Math.min(760, dist * 7 + 60) : Math.min(150, dist * 2.4 + 8);
    const wob = Math.min(1, dist / 160) * (fast ? 30 : 70);
    const px = -dy / dist, py = dx / dist;
    const w = Math.sin(t * 2.7 + phase) * wob;
    const ax = dx / dist * speed + px * w, ay = dy / dist * speed + py * w;
    const k = Math.min(1, dt * (fast ? 7 : 3.2));
    vel.x += (ax - vel.x) * k; vel.y += (ay - vel.y) * k;
    pos.x += vel.x * dt; pos.y += vel.y * dt;
    if (Math.abs(vel.x) > 12) el.classList.toggle('right', vel.x > 0);
    place(pos.x, pos.y + Math.sin(t * 9) * 1.6 * Math.min(1, dist / 40), Math.max(-18, Math.min(18, vel.y * .08)) * (vel.x > 0 ? 1 : -1));
    if (arrive && dist < 4) {
      pos.x = target.x; pos.y = target.y; mode = 'held'; fast = false;
      el.classList.add('rest');
      const done = arrive; arrive = null; done();
      return;
    }
    if (dist < 2.5) {
      pos.x = target.x; pos.y = target.y;
      current = target.curious ? null : target;
      mode = 'perch';
      timer = target.curious ? 1.4 : 2.5 + Math.random() * 3.5;
      el.classList.add('rest');
      if (target.curious && Math.random() < .5) talk('hi :)');
      else if (!target.curious && Math.random() < .12) talk(any(PERCH), 2000);
    }
  }

  if (reduced) {
    setTimeout(() => {
      const s = spots()[0];
      if (s) { pos.x = s.x; pos.y = s.y; }
      el.classList.add('rest');
      place(pos.x, pos.y, 0);
    }, 300);
  } else {
    raf = requestAnimationFrame(step);
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(step); }
    });
  }
  /** Fly straight to a fresh flower and say so; the next pick after that is business as usual. */
  function visit(spot) {
    if (!spot || mode === 'held') return;
    talk(any(NEW));
    if (reduced) return;
    target = spot; current = null; mode = 'fly';
    el.classList.remove('rest');
  }
  /** Fly briskly to a page point and hover there until release(). Resolves on arrival. */
  function flyTo(x, y) {
    return new Promise(res => {
      arrive?.();
      if (reduced) { pos.x = x; pos.y = y; place(x, y, 0); mode = 'held'; return res(); }
      target = { x, y }; current = null; mode = 'fly'; fast = true; arrive = res;
      el.classList.remove('rest');
    });
  }
  function release(text) {
    mode = 'wait'; timer = .5; arrive = null;
    el.classList.remove('rest');
    if (text) talk(text);
  }
  /** Where the bee is drawn right now, in viewport px. */
  const rect = () => el.getBoundingClientRect();
  return { el, visit, talk, flyTo, release, rect };
}
