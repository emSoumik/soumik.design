// Garden: watercolour blooms on warm paper, drawn in WebGL.
// Ink dropped on wet paper: five-lobed cauliflower blooms, pigment granulating in the paper tooth, a
// darker rim where it dried, and a faint pale watermark with a tide-line around each one.
//
// Patch pass: bakes every patch into an RGBA8 framebuffer as a multiplicative glaze (white = bare
// paper). It only runs while something grows or fades. Present pass: paper grain times that glaze.
// When idle the loop stops entirely, so nothing draws until the next plant or resize.
//
//   const garden = createGarden(canvas, { initial: 'auto' | 0, bed(w, h, mob), onChange })
//   garden.plant(x, y, { size })  // canvas-local CSS px, y down; returns { id, x, y, flowers: [{ x, y, r }] }
//   garden.patches()              // live patches
//   garden.onChange               // assignable; called with patches() after planting or removal
//   garden.destroy()

const MAX_PATCHES = 28;
const MAX_ENTRIES = 12;   // one patch wash + up to 9 blooms (+ spare)
const GROW_TIME = 3.4;    // seconds until a patch has finished spreading and drying
const FADE_TIME = 1.4;

// ---- pigments (transmittance at full density) -----------------------------------------------
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const PIGMENTS = {
  indigo: ['#2c3880', '#27337a', '#38458f', '#2d4796'].map(hex),
  rose: ['#d9738f', '#cf6585', '#e08aa0', '#d0708f'].map(hex),
  cerulean: ['#5aa0d2', '#4c94cb', '#6aaedb', '#5a9fd0'].map(hex),
  sumi: ['#1d2a26', '#222e2a'].map(hex),
};

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFamily(rnd) {
  const r = rnd();
  return r < .5 ? 'indigo' : r < .76 ? 'rose' : 'cerulean';
}

// ---- patch generation (JS owns every position; the bee reads the same ones) -----------------
function buildPatch(x, y, R, family, rnd) {
  const rs = Math.max(.62, Math.min(1.1, R / 100));            // smaller on mobile, a touch bigger on big patches
  const n = Math.min(9, 3 + Math.floor(Math.pow(rnd(), .85) * 6.99));
  const accent = rnd() < .2 && n >= 4 ? Math.floor(rnd() * n) : -1;   // one deep green-black bloom, rarely
  const sx = R * .85, sy = R * .55;
  const g = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  const bl = [];
  for (let i = 0; i < n; i++) {
    const large = i < (n > 5 ? 2 : 1) && i !== accent;         // one or two larger, paler blooms
    const r = large ? (19 + rnd() * 8) * rs : (8.5 + Math.pow(rnd(), 1.4) * 9) * rs;
    let best = null, bestD = -Infinity;
    for (let tr = 0; tr < 9; tr++) {                            // keep the try that sits furthest from its neighbours
      const cx = x + g() * sx, cy = y + g() * sy;
      let md = 1e9;
      for (const o of bl) md = Math.min(md, Math.hypot(o.x - cx, (o.y - cy) * 1.1) - (o.r + r) * .95);
      if (md > bestD) { bestD = md; best = { x: cx, y: cy }; }
    }
    const pal = i === accent ? PIGMENTS.sumi : PIGMENTS[family];
    const col = pal[Math.floor(rnd() * pal.length)].map(c => Math.min(1, Math.max(0, c + (rnd() - .5) * .05)));
    bl.push({
      x: best.x, y: best.y, r,
      rot: rnd() * 6.2832,
      lobes: rnd() < .22 ? 6 : 5,
      dens: large ? .42 + rnd() * .16 : .62 + rnd() * .3,     // saturation varies, big ones are paler
      wash: large ? .85 : .6 + rnd() * .4,
      seed: 1 + rnd() * 60,
      col,
    });
  }
  // stagger: centre first, then outward, with a little jitter
  for (const b of bl) b.delay = Math.min(1.05, Math.hypot(b.x - x, (b.y - y) * 1.4) / (R * 1.3) * .75 + rnd() * .3);

  // entry 0 is the patch-level wash (no bloom), then every bloom
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const fam = PIGMENTS[family][Math.floor(rnd() * PIGMENTS[family].length)];
  const entries = [{ x, y: y + R * .04, r: R * .62, rot: 0, lobes: 3, dens: 0, wash: .7, seed: 1 + rnd() * 60, col: mix(fam, [1, 1, 1], .25), delay: 0 }, ...bl];

  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const e of entries) {
    const pad = e.r * (e.dens > 0 ? 2.8 : 3.4) + 6;
    x0 = Math.min(x0, e.x - pad); y0 = Math.min(y0, e.y - pad);
    x1 = Math.max(x1, e.x + pad); y1 = Math.max(y1, e.y + pad);
  }
  const box = [x0, y0, x1, y1];
  const F = new Float32Array(MAX_ENTRIES * 4), C = new Float32Array(MAX_ENTRIES * 4), Q = new Float32Array(MAX_ENTRIES * 4);
  entries.forEach((e, i) => {
    F.set([e.x - box[0], e.y - box[1], e.r, e.rot], i * 4);
    C.set([e.col[0], e.col[1], e.col[2], e.delay], i * 4);
    Q.set([e.lobes, e.dens, e.seed, e.wash], i * 4);
  });
  return {
    box, n: entries.length, F, C, Q,
    list: bl.map(b => ({ x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, r: Math.round(b.r * 10) / 10 })),
  };
}

// ---- shaders -------------------------------------------------------------------------------
const HEAD = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

const HASH = `
float hs(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + 1.), f.x), f.y);
}
float fbm(vec2 p){
  float s = 0., a = .5;
  for (int i = 0; i < 3; i++) { s += a * vn(p); p = p * 2.03 + vec2(7.1, 3.7); a *= .5; }
  return s / .875;
}
`;

const PATCH_VS = `
attribute vec2 a;
uniform vec4 uBox;
uniform vec2 uCss;
varying vec2 vP;
void main(){
  vec2 p = mix(uBox.xy, uBox.zw, a);
  vP = p - uBox.xy;
  gl_Position = vec4(p.x / uCss.x * 2. - 1., 1. - p.y / uCss.y * 2., 0., 1.);
}`;

// Output is a glaze: white where there is no pigment. Blending multiplies it onto the framebuffer.
const PATCH_FS = HEAD + HASH + `
varying vec2 vP;
uniform float uT, uStart, uFade, uN;
uniform vec2 uOrg;
uniform vec4 uF[${MAX_ENTRIES}], uC[${MAX_ENTRIES}], uQ[${MAX_ENTRIES}];

void main(){
  float tt = uT - uStart;
  vec2 pa = vP + uOrg;                       // absolute CSS px, so the paper tooth is shared by all patches
  float tooth = vn(pa * .42 + 3.7) * .5 + vn(pa * 1.15 + 9.1) * .3 + hs(floor(pa * 1.6)) * .3;
  vec3 T = vec3(1.);

  for (int i = 0; i < ${MAX_ENTRIES}; i++) {
    if (float(i) >= uN) break;
    vec4 F = uF[i], Cc = uC[i], Q = uQ[i];
    float age = tt - Cc.w;
    if (age <= 0.) continue;
    float R = F.z, seed = Q.z;
    bool hasBloom = Q.y > .01;
    vec2 q = vP - F.xy;
    if (!hasBloom) q.y *= 1.4;               // the patch wash is a wide oval
    float l = length(q);
    if (l > R * (hasBloom ? 2.7 : 3.3)) continue;

    vec3 pig = Cc.rgb;
    float dry = smoothstep(.5, 2.1, age);

    // --- the bloom: ink spreading over the first 1.2s, then drying
    if (hasBloom) {
      float k = clamp(age / 1.2, 0., 1.);
      float sc = .3 + .7 * (1. - pow(1. - k, 3.));
      float Rg = R * sc;
      float cs = cos(F.w), sn = sin(F.w);
      vec2 u = mat2(cs, -sn, sn, cs) * q / Rg;
      float ang = atan(u.y, u.x);
      float shape = .6 + .4 * pow(abs(cos(ang * Q.x * .5)), .55);
      shape *= 1. + (fbm(u * 2.4 + seed) - .5) * .7;          // cauliflower edge
      shape *= 1. + (vn(u * 6. + seed * 2.) - .5) * .11;
      float d = length(u) - shape;
      d += .012 * sin(uT * 2.2 + seed) * (1. - dry);          // the wet edge breathes while it grows
      float e = mix(.11, .045, dry) + .7 / Rg;                // wet edge is soft, dried edge sharpens
      float core = 1. - smoothstep(-e, e, d);

      float gran = .42 + 1.05 * tooth;                        // pigment settling in the tooth
      float ctr = mix(.6, 1., smoothstep(0., .6, length(u)));  // lighter middle
      float rim = smoothstep(-.34, -.02, d) * core;            // pigment pooled where it dried
      float dens = core * Q.y * gran * ctr;
      dens += Q.y * rim * mix(.22, .62, dry) * (.7 + .5 * gran);
      dens += core * Q.y * .22 * dry * exp(-pow((d + .035) / .05, 2.));
      dens *= 1. + .12 * (1. - dry);                           // wet ink reads a touch darker
      if (fract(seed * .37) > .72) dens += (1. - smoothstep(.035, .09, length(u))) * .55 * core;   // pistil dot
      dens = clamp(dens, 0., 1.);
      vec3 deep = pig * pig * .9 + .02;
      vec3 col = mix(pig, deep, .6 * smoothstep(.5, 1., dens));
      T *= mix(vec3(1.), col, dens);
    }

    // --- the watermark: a pale wash that creeps out further and slower, with a tide-line where it dried
    float wk = clamp((age - .12) / 1.8, 0., 1.);
    wk = 1. - pow(1. - wk, 3.);
    float wr = (hasBloom ? 1.7 : 1.45) * (.25 + .75 * wk);
    vec2 w = q / R;
    float wet = fbm(w * 1.3 + seed * 3.);
    float wd = length(w) - wr * (1. + (fbm(w * 1.7 + seed) - .5) * .55);
    float inside = 1. - smoothstep(-.28, .05, wd);
    float tide = exp(-pow(wd / .075, 2.)) * (.55 + .9 * vn(w * 5. + seed));
    float wa = inside * .055 * (.5 + wet);
    wa += tide * .1 * mix(.45, 1., dry) * smoothstep(.1, .5, wk);
    // a broken back-run: a cauliflower ring where later water pushed into the drying wash
    float rd = length(w) - wr * (.5 + .22 * fbm(w * 2.2 + seed * 5.));
    wa += .06 * exp(-pow(rd / .07, 2.)) * smoothstep(.45, .62, wet) * step(.6, hs(vec2(seed, 2.3)) + (hasBloom ? 0. : .4)) * smoothstep(.3, .8, wk);
    wa *= Q.w * (.8 + .4 * tooth);
    T *= mix(vec3(1.), pig, clamp(wa, 0., .5));
  }
  gl_FragColor = vec4(mix(vec3(1.), T, uFade), 1.);
}`;

const PRESENT_VS = `
attribute vec2 a;
void main(){ gl_Position = vec4(a * 2. - 1., 0., 1.); }`;

const PRESENT_FS = HEAD + HASH + `
uniform sampler2D tex;
uniform vec2 r, css;
uniform vec3 uPaper;

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = fc / r;
  vec2 p = vec2(uv.x, 1. - uv.y) * css;           // CSS px, y down

  // paper: fine grain, a little fibre, very low-frequency mottling
  vec3 col = uPaper;
  col += (hs(floor(fc) + .31) - .5) * .02;
  col -= (vn(p * .011) - .5) * .018 + (vn(p * .0035 + 4.) - .5) * .02;
  col -= (vn(p * vec2(.9, .12) + 2.) - .5) * .008;

  // pigment sits in the tooth: pits take a little more, peaks a little less
  vec3 g = texture2D(tex, uv).rgb;
  float tooth = vn(p * .8 + 5.) * .6 + hs(floor(p * 1.7) + .7) * .4;
  g = 1. - (1. - g) * (.88 + .24 * tooth);
  gl_FragColor = vec4(col * g, 1.);
}`;

// ---- main ----------------------------------------------------------------------------------
export function createGarden(canvas, opts = {}) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;

  const live = [];      // patch records currently visible
  const dying = [];     // fading out
  let nextId = 1, userPlanted = false, bedTimers = [];
  let cssW = 0, cssH = 0, bedW = 0, bedH = 0, bedPlanted = false;
  let growUntil = 0;
  const api = {
    onChange: opts.onChange,
    plant,
    patches: () => live.map(pub),
    destroy,
    _stats: { fbo: 0, frames: 0 },
  };
  const pub = p => ({ id: p.id, x: p.x, y: p.y, flowers: p.flowers });
  const changed = () => api.onChange?.(api.patches());

  // ---- patch bookkeeping (works without WebGL) ----
  function defaultSize() {
    const w = cssW || 1200, h = cssH || 800;
    if (w <= 640) return 50 + Math.random() * 40;
    const vs = Math.max(.8, Math.min(1.2, Math.min(w, h * 1.6) / 1440));
    return (70 + Math.random() * 60) * vs;
  }

  function add(x, y, R, family, rnd, instant) {
    const built = buildPatch(x, y, R, family, rnd);
    const start = instant || reduced ? -10 : now();
    const p = { id: nextId++, x, y, start, built, flowers: built.list };
    live.push(p);
    if (start + GROW_TIME > growUntil) growUntil = start + GROW_TIME;
    while (live.length > MAX_PATCHES) {
      const old = live.shift();
      old.dieAt = now();
      dying.push(old);
    }
    fboDirty = true;
    return p;
  }

  function plant(x, y, o = {}) {
    userPlanted = true;
    bedTimers.forEach(clearTimeout); bedTimers = [];
    const p = add(x, y, o.size ?? defaultSize(), pickFamily(Math.random), Math.random, false);
    wake();
    changed();
    return pub(p);
  }

  function plantBed(instant) {
    bedPlanted = true; bedW = cssW; bedH = cssH;
    const mob = cssW <= 640;
    // opts.bed(w, h, mob) -> { cx, cy, bw, bh } lets the page fit the bed around its own type
    const o = opts.bed?.(cssW, cssH, mob) || {};
    const bw = o.bw ?? (mob ? Math.min(340, cssW - 30) : Math.min(640, cssW - 80));
    const bh = o.bh ?? (mob ? 220 : 260);
    const cx = o.cx ?? cssW / 2, cy = o.cy ?? cssH * (mob ? .40 : .46);
    const rnd = mulberry(mob ? 31 : 17);
    const n = 7;
    const families = ['indigo', 'rose', 'indigo', 'cerulean', 'indigo', 'rose', 'cerulean'];
    const delays = [0, .3, .55, .9, 1.2, 1.5, 1.85];
    const items = [];
    for (let i = 0; i < n; i++) {
      const R = mob ? 50 + rnd() * 22 : 80 + rnd() * 34;
      const a = i * 2.39996 + .4, rr = i === 0 ? .15 : .62 + .38 * rnd();
      const x = cx + Math.cos(a) * rr * (bw / 2 - R * .15) + (rnd() - .5) * 24;
      const y = cy + Math.sin(a) * rr * (bh / 2 - R * .1) + (rnd() - .5) * 16;
      items.push({ x, y, R, family: families[i] });
    }
    // grow the middle first, then outwards, with an uneven rhythm
    items.sort((a, b) => Math.hypot(a.x - cx, (a.y - cy) * 1.8) - Math.hypot(b.x - cx, (b.y - cy) * 1.8));
    const seedRnd = mulberry(5);
    items.forEach((it, i) => {
      const go = () => { add(it.x, it.y, it.R, it.family, seedRnd, instant); wake(); changed(); };
      if (instant || reduced) go();
      else bedTimers.push(setTimeout(go, delays[i] * 1000));
    });
  }

  // ---- WebGL ----
  let gl = null, quad = null, tex = null, fbo = null, W = 0, H = 0, scale = 1;
  let patchP = null, presP = null, pU = {}, qU = {};
  let raf = 0, running = false, fboDirty = true, destroyed = false, visible = true;

  function compile(vs, fs) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('garden shader:', gl.getShaderInfoLog(s)); return null; }
      gl.attachShader(p, s);
    }
    gl.bindAttribLocation(p, 0, 'a');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('garden link:', gl.getProgramInfoLog(p)); return null; }
    return p;
  }
  const loc = (prog, cache, name) => cache[name] ?? (cache[name] = gl.getUniformLocation(prog, name));

  function initGL() {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) return false;
    if (gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) < 48) { gl = null; return false; }
    patchP = compile(PATCH_VS, PATCH_FS);
    presP = compile(PRESENT_VS, PRESENT_FS);
    if (!patchP || !presP) { gl = null; return false; }
    pU = {}; qU = {};
    quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    tex = gl.createTexture(); fbo = gl.createFramebuffer();
    W = H = 0;
    return true;
  }

  function sizeBuffers() {
    const b = canvas.getBoundingClientRect();
    cssW = b.width; cssH = b.height;
    if (!gl || cssW < 1 || cssH < 1) return;
    scale = Math.min(window.devicePixelRatio || 1, 2);
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const nw = Math.min(max, Math.max(1, Math.round(cssW * scale))), nh = Math.min(max, Math.max(1, Math.round(cssH * scale)));
    if (nw === W && nh === H) return;
    W = nw; H = nh;
    canvas.width = W; canvas.height = H;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR);
    for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    fboDirty = true;
  }

  function renderFbo(t) {
    api._stats.fbo++;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, W, H);
    gl.clearColor(1, 1, 1, 1);                // bare paper
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ZERO, gl.SRC_COLOR);      // glazes multiply
    gl.useProgram(patchP);
    gl.uniform2f(loc(patchP, pU, 'uCss'), cssW, cssH);
    gl.uniform1f(loc(patchP, pU, 'uT'), t);
    const draw = (p, fade) => {
      const b = p.built;
      gl.uniform4f(loc(patchP, pU, 'uBox'), b.box[0], b.box[1], b.box[2], b.box[3]);
      gl.uniform2f(loc(patchP, pU, 'uOrg'), b.box[0], b.box[1]);
      gl.uniform1f(loc(patchP, pU, 'uStart'), p.start);
      gl.uniform1f(loc(patchP, pU, 'uFade'), fade);
      gl.uniform1f(loc(patchP, pU, 'uN'), b.n);
      gl.uniform4fv(loc(patchP, pU, 'uF'), b.F);
      gl.uniform4fv(loc(patchP, pU, 'uC'), b.C);
      gl.uniform4fv(loc(patchP, pU, 'uQ'), b.Q);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    for (const p of dying) draw(p, 1 - Math.min(1, (t - p.dieAt) / FADE_TIME));
    for (const p of live) draw(p, 1);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  const PAPER = hex("#ffffff");
  function renderPresent() {
    gl.viewport(0, 0, W, H);
    gl.useProgram(presP);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc(presP, qU, 'tex'), 0);
    gl.uniform2f(loc(presP, qU, 'r'), W, H);
    gl.uniform2f(loc(presP, qU, 'css'), cssW, cssH);
    gl.uniform3f(loc(presP, qU, 'uPaper'), PAPER[0], PAPER[1], PAPER[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function drawFrame(ms) {
    if (!gl || W < 1) return;
    const t = (ms - t0) / 1000;
    while (dying.length && t - dying[0].dieAt > FADE_TIME) dying.shift();
    const growing = t < growUntil || dying.length > 0;
    if (growing || fboDirty) { renderFbo(t); fboDirty = growing; }
    renderPresent();
    api._stats.frames++;
  }

  // The loop runs only while something grows or fades, then stops. Idle cost is zero.
  function loop(ms) {
    if (!running) return;
    const t = (ms - t0) / 1000;
    if (!(t < growUntil || dying.length > 0 || fboDirty)) { running = false; return; }
    raf = requestAnimationFrame(loop);
    drawFrame(ms);
  }
  function play() {
    if (running || reduced || destroyed || !gl || document.hidden || !visible) return;
    running = true; raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function wake() {
    if (!gl) return;
    if (reduced) { fboDirty = true; requestAnimationFrame(() => drawFrame(performance.now())); }
    else play();
  }

  function onResize() {
    sizeBuffers();
    if (cssW < 1 || cssH < 1) return;
    if (opts.initial === 'auto' && !userPlanted) {
      if (!bedPlanted) plantBed(false);
      else if (Math.abs(cssW - bedW) > 24 || Math.abs(cssH - bedH) > 120) {
        bedTimers.forEach(clearTimeout); bedTimers = [];
        live.length = 0; dying.length = 0;
        plantBed(true);
        changed();
      }
    }
    if (gl) { fboDirty = true; if (reduced || !running) requestAnimationFrame(() => drawFrame(performance.now())); }
  }

  const onVis = () => document.hidden ? stop() : (fboDirty = true, play());
  const onLost = e => { e.preventDefault(); stop(); };
  const onRestored = () => { if (initGL()) { sizeBuffers(); fboDirty = true; play(); wake(); } };

  initGL();
  if (gl) {
    document.addEventListener('visibilitychange', onVis);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
  }
  const ro = new ResizeObserver(onResize);
  ro.observe(canvas);
  // pause while the hero is scrolled out of view
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(es => {
    visible = es[es.length - 1].isIntersecting;
    if (!gl) return;
    if (visible) { fboDirty = true; reduced ? wake() : play(); } else stop();
  }) : null;
  io?.observe(canvas);
  onResize();
  if (gl) {
    requestAnimationFrame(() => canvas.classList.add('on'));
    play();
  }

  function destroy() {
    destroyed = true; stop(); ro.disconnect(); io?.disconnect();
    bedTimers.forEach(clearTimeout);
    document.removeEventListener('visibilitychange', onVis);
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
  }

  return api;
}
