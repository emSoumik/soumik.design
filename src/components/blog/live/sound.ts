// the sound switch every live header carries: it shows and flips the site's one mute (js/feel.js)
import { feel } from '../../../../js/feel.js';

export function wireSound(btn: HTMLButtonElement | null) {
  if (!btn) return;
  const paint = () => { btn.setAttribute('aria-pressed', String(!feel.muted)); btn.setAttribute('aria-label', feel.muted ? 'Sound off' : 'Sound on'); };
  paint(); feel.onMute(paint);
  btn.disabled = false;
  btn.addEventListener('click', () => { feel.muted = !feel.muted; if (!feel.muted) feel.hello(); });
}
