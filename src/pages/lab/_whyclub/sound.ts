// LAB: the store's sounds, rebuilt for this page. the definitions are copied from why-club
// src/lib/audio-patches/whyclub.ts and played the way @web-kits/audio plays them (same envelope, filter,
// noise and reverb rules), with plain web audio so the portfolio needs no dependency

type Filter = { type: BiquadFilterType; frequency: number; resonance?: number; envelope?: { attack?: number; peak: number; decay: number } };
type Layer = {
  source: { type: 'noise' } | { type: 'sine'; frequency: number | { start: number; end: number }; detune?: number } | { type: 'wavetable'; harmonics: number[]; frequency: number };
  filter?: Filter | Filter[];
  envelope: { attack?: number; decay: number; sustain?: number; release?: number };
  gain: number;
  delay?: number;
};
type Sound = { layers: Layer[]; room?: { mix: number; decay: number } };

const contact = (gain: number, brightness = 2200, length = 0.008): Layer => ({
  source: { type: 'noise' },
  filter: [{ type: 'highpass', frequency: 500, resonance: 0.5 }, { type: 'lowpass', frequency: brightness, resonance: 0.6 }],
  envelope: { attack: 0.0015, decay: length, sustain: 0, release: 0.004 },
  gain,
});
const body = (from: number, to: number, gain: number, decay = 0.024): Layer => ({
  source: { type: 'sine', frequency: { start: from, end: to } },
  filter: { type: 'lowpass', frequency: 700, resonance: 0.3 },
  envelope: { attack: 0.002, decay, sustain: 0, release: 0.01 },
  gain,
});
const air = (from: number, to: number, gain: number, length = 0.12): Layer => ({
  source: { type: 'noise' },
  filter: { type: 'lowpass', frequency: from, resonance: 0.4, envelope: { attack: length * 0.6, peak: to, decay: length * 0.4 } },
  envelope: { attack: length * 0.4, decay: length * 0.6, sustain: 0 },
  gain,
});
const felt = (frequency: number, gain: number, delay = 0, decay = 0.6): Layer[] => [
  {
    source: { type: 'wavetable', harmonics: [1, 0.22, 0.07, 0.02], frequency },
    filter: { type: 'lowpass', frequency: Math.min(frequency * 2, 1400), resonance: 0.3, envelope: { attack: 0.002, peak: 2600, decay: 0.14 } },
    envelope: { attack: 0.005, decay, sustain: 0, release: decay * 0.5 },
    delay, gain,
  },
  { source: { type: 'sine', frequency, detune: 4 }, envelope: { attack: 0.02, decay: decay * 1.2, sustain: 0, release: decay * 0.5 }, delay, gain: gain * 0.35 },
  { ...contact(gain * 0.3, 1800, 0.006), delay },
];

export const SOUNDS = {
  tap: { layers: [contact(0.08, 2200), body(230, 160, 0.098)] },
  select: { layers: [contact(0.08, 3000, 0.006), body(280, 200, 0.07, 0.018)] },
  dockTap: { layers: [contact(0.048, 1400, 0.007), body(200, 140, 0.077, 0.02)] },
  dockOpen: { layers: [air(380, 1200, 0.045, 0.1), body(160, 135, 0.028, 0.04)] },
  dockClose: { layers: [air(1000, 340, 0.035, 0.09)] },
  success: { layers: [...felt(440, 0.072, 0, 0.55), ...felt(587, 0.064, 0.016, 0.6)], room: { mix: 0.16, decay: 0.7 } },
  complete: {
    layers: [...felt(294, 0.07, 0, 1.1), ...felt(440, 0.06, 0.04, 1.1), ...felt(587, 0.05, 0.08, 1.2), ...felt(740, 0.034, 0.12, 1.3)],
    room: { mix: 0.22, decay: 1.4 },
  },
} satisfies Record<string, Sound>;
export type SoundName = keyof typeof SOUNDS;
// presses many times a visit vary a little each time, the way the store's player does it
const JITTER = new Set<SoundName>(['tap', 'select', 'dockTap']);
// the store's default volume
const MASTER = 0.75;
const SILENCE = 0.0001;

const pink = (ctx: BaseAudioContext, seconds: number) => {
  const buf = ctx.createBuffer(1, Math.max(1, Math.ceil(ctx.sampleRate * seconds)), ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
};

const room = (ctx: BaseAudioContext, out: AudioNode, mix: number, decay: number) => {
  const input = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), conv = ctx.createConvolver();
  dry.gain.value = 1 - mix; wet.gain.value = mix;
  const len = Math.ceil(ctx.sampleRate * decay), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < len; i++) { prev = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.28)) * 0.3 + prev * 0.7; d[i] = prev; }
  }
  conv.buffer = buf;
  input.connect(dry).connect(out);
  input.connect(wet).connect(conv).connect(out);
  return input;
};

function schedule(ctx: BaseAudioContext, out: AudioNode, def: Sound, t0: number, jitter: boolean) {
  const dest = def.room ? room(ctx, out, def.room.mix, def.room.decay) : out;
  const detune = jitter ? (Math.random() * 2 - 1) * 35 : 0;
  const vol = jitter ? 1 + (Math.random() * 2 - 1) * 0.08 : 1;
  for (const layer of def.layers) {
    const t = t0 + (layer.delay ?? 0);
    const e = layer.envelope, attack = e.attack ?? 0, sustain = e.sustain ?? 0, release = e.release ?? 0;
    const dur = attack + e.decay + release;
    const env = ctx.createGain();
    env.gain.setValueAtTime(SILENCE, t);
    env.gain.linearRampToValueAtTime(layer.gain * vol, t + Math.max(attack, 0.0001));
    if (sustain > 0) env.gain.setTargetAtTime(Math.max(sustain * layer.gain, SILENCE), t + attack, e.decay / 3);
    else env.gain.setTargetAtTime(SILENCE, t + attack, e.decay / 3);

    let src: AudioScheduledSourceNode;
    const s = layer.source;
    if (s.type === 'noise') {
      const n = ctx.createBufferSource();
      n.buffer = pink(ctx, dur + 0.1);
      src = n;
    } else {
      const o = ctx.createOscillator();
      if (s.type === 'wavetable') {
        const real = new Float32Array(s.harmonics.length + 1), imag = new Float32Array(s.harmonics.length + 1);
        s.harmonics.forEach((h, i) => (imag[i + 1] = h));
        o.setPeriodicWave(ctx.createPeriodicWave(real, imag));
        o.frequency.setValueAtTime(s.frequency, t);
      } else if (typeof s.frequency === 'number') {
        o.frequency.setValueAtTime(s.frequency, t);
        if (s.detune) o.detune.value = s.detune;
      } else {
        o.frequency.setValueAtTime(s.frequency.start, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(s.frequency.end, 1), t + dur);
      }
      o.detune.value += detune;
      src = o;
    }
    let node: AudioNode = src;
    for (const f of [layer.filter ?? []].flat()) {
      const bq = ctx.createBiquadFilter();
      bq.type = f.type;
      bq.frequency.setValueAtTime(f.frequency, t);
      bq.Q.value = f.resonance ?? 1;
      if (f.envelope) {
        const end = t + (f.envelope.attack ?? 0);
        bq.frequency.linearRampToValueAtTime(f.envelope.peak, end);
        bq.frequency.exponentialRampToValueAtTime(Math.max(f.frequency, 1), end + f.envelope.decay);
      }
      node.connect(bq);
      node = bq;
    }
    node.connect(env).connect(dest);
    src.start(t);
    src.stop(t + dur + 0.1);
  }
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

/** plays one of the store's sounds; only ever called from a press, so the context is allowed to start */
export function play(name: SoundName) {
  try {
    ctx ??= new AudioContext();
    if (!master) { master = ctx.createGain(); master.gain.value = MASTER; master.connect(ctx.destination); }
    if (ctx.state === 'suspended') void ctx.resume();
    schedule(ctx, master, SOUNDS[name], ctx.currentTime + 0.005, JITTER.has(name));
  } catch {
    // a page without audio still works
  }
}

/** the sound rendered offline, for drawing its real waveform */
export async function render(name: SoundName): Promise<Float32Array | null> {
  try {
    const def: Sound = SOUNDS[name];
    const seconds = Math.max(...def.layers.map((l) => (l.delay ?? 0) + (l.envelope.attack ?? 0) + l.envelope.decay + (l.envelope.release ?? 0))) + (def.room?.decay ?? 0) * 0.6 + 0.05;
    const off = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100);
    const g = off.createGain();
    g.gain.value = MASTER;
    g.connect(off.destination);
    schedule(off, g, def, 0, false);
    return (await off.startRendering()).getChannelData(0);
  } catch {
    return null;
  }
}
