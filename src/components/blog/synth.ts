// a tiny kalimba for the blog's sound demos: one sine struck by a quick fm blip, in the same small room the garden
// uses (impulse() from js/feel.js). it follows the site's mute, and goes quiet when the page isn't in front
import { feel, impulse } from '../../../js/feel.js';

let ac: AudioContext | null = null, out: GainNode | null = null;
export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function ready() {
  if (feel.muted) return null;
  if (!ac) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    out = ac.createGain(); out.gain.value = .8;
    const lim = ac.createDynamicsCompressor();
    lim.threshold.value = -10; lim.ratio.value = 12; lim.attack.value = .003; lim.release.value = .2;
    const room = ac.createConvolver(), wet = ac.createGain();
    room.buffer = impulse(ac); wet.gain.value = .26;
    out.connect(lim); out.connect(wet); wet.connect(room); room.connect(lim); lim.connect(ac.destination);
    feel.onAway((away: boolean) => { if (away) ac?.suspend(); else ac?.resume(); });
  }
  if (ac.state !== 'running') ac.resume();
  return ac;
}

// one note. pan -1..1. returns nothing; the note cleans up after itself
export function note(midi: number, { vol = .2, pan = 0, dur = 1.6 } = {}) {
  const a = ready();
  if (!a || !out) return;
  const t = a.currentTime + .01, f = hz(midi);
  const g = a.createGain(), p = a.createStereoPanner(), car = a.createOscillator(), mod = a.createOscillator(), idx = a.createGain();
  car.frequency.value = f; mod.frequency.value = f * 3.01;
  idx.gain.setValueAtTime(f * 1.4, t); idx.gain.exponentialRampToValueAtTime(1, t + .12);
  mod.connect(idx); idx.connect(car.frequency);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  p.pan.value = pan;
  car.connect(g); g.connect(p); p.connect(out);
  car.start(t); mod.start(t); car.stop(t + dur + .05); mod.stop(t + dur + .05);
  car.onended = () => { [car, mod, idx, g, p].forEach((n) => n.disconnect()); };
}
