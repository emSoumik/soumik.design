// Shader reel: a vanilla-JS port of the WhyClub WebGL shaders (order pass prism, beta pass
// glyph + particle, 404 prism). One WebGL context per canvas, programs compiled lazily.
// GLSL is ported verbatim from the why-club repo; only the JS driving the uniforms is adapted.

const VERTEX = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const PRISM_COMMON = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_tilt;
uniform vec3 u_accent;
uniform float u_seed;
uniform float u_stage;
uniform float u_wide;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + u_seed) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
vec3 spectrum(float t) {
  // Cosine palette (Inigo Quilez): a smooth rainbow without hue banding.
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}
`;
const PRISM = `
vec3 soft(float t) { return mix(spectrum(t), vec3(0.82, 0.84, 1.0), 0.3); }

// Three low octaves: big airbrushed blobs, not clouds (the grain supplies texture).
float field(vec2 p) {
  float v = 0.0, a = 0.6;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 1.7 + vec2(5.2, 1.3); a *= 0.4; }
  return v / 0.936;
}

float star(vec2 p, float s) {
  p /= s;
  float c = 0.012 / (abs(p.x * p.y) + 0.0025);
  return clamp(c * smoothstep(1.0, 0.0, length(p)), 0.0, 1.4);
}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  vec2 d = pa - ba * h;
  d.x += sin(h * 3.0 + u_time * 0.6) * 0.04 * h;
  return length(d);
}

// A soft five-petal bloom with a crisp starburst heart (the reference flowers).
vec4 bloom(vec2 p, float r, float open, float rot, float blur, float hue) {
  float l = length(p);
  float a = atan(p.y, p.x) + rot;
  float R = r * open * (0.6 + 0.4 * pow(abs(cos(a * 2.5)), 0.7));
  float d = l - R;
  float body = smoothstep(blur, -blur, d);
  float halo = exp(-max(d, 0.0) / (r * 0.4)) * 0.3 * open;
  vec3 inner = mix(vec3(0.48, 0.56, 1.0), mix(u_accent, vec3(1.0), 0.45), 0.3);
  vec3 outer = mix(vec3(1.0, 0.56, 0.78), vec3(1.0, 0.52, 0.32), 0.5 + 0.5 * sin(a + hue));
  vec3 c = mix(inner, outer, smoothstep(0.15 * r, R + 0.001, l));
  float rays = pow(abs(cos(a * 9.0 + 1.3)), 24.0) + 0.7 * pow(abs(cos(a * 13.0)), 40.0);
  float heart = (smoothstep(0.34 * r * open, 0.0, l) * (0.35 + rays) + smoothstep(0.07 * r, 0.0, l)) * open;
  return vec4(c * (body + halo) + vec3(0.95, 0.97, 1.0) * heart, clamp(body + halo + heart, 0.0, 1.0));
}

vec4 over(vec4 a, vec4 b) { return vec4(a.rgb * (1.0 - b.a * 0.7) + b.rgb, max(a.a, b.a)); }

vec2 route(float s) { return vec2(-0.8 + 1.7 * s, -0.7 + 1.2 * s + 0.3 * sin(s * 6.28)); }

vec4 scene(vec2 p) {
  float t = u_time;
  vec4 o = vec4(0.0);
  vec3 stemC = mix(vec3(0.3, 0.42, 1.0), u_accent, 0.25);
  if (u_stage < 0.5) {
    // pending: three orbs orbit and breathe, waiting.
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float a = t * 0.35 + fi * 2.094;
      vec2 c = vec2(cos(a), sin(a) * 0.55) * 0.6;
      float r = 0.34 + 0.06 * sin(t * 1.4 + fi);
      float g = smoothstep(r, r * 0.1, length(p - c));
      o = over(o, vec4(soft(fi * 0.3 + t * 0.05) * g, g));
    }
  } else if (u_stage < 1.5) {
    // review: a soft lens drifts over the order.
    vec2 c = vec2(sin(t * 0.4) * 0.35, cos(t * 0.31) * 0.25);
    float ring = exp(-abs(length(p - c) - 0.5) * 16.0);
    float fill = smoothstep(0.5, 0.0, length(p - c)) * 0.25;
    o = over(o, vec4(soft(0.6 + t * 0.04) * (ring + fill), ring));
    o.rgb += star(p - c - vec2(0.22, 0.24), 0.25) * vec3(1.0);
  } else if (u_stage < 2.5) {
    // confirmed: one bloom opens as the pass finishes printing.
    float open = smoothstep(0.2, 2.4, t);
    float sd = segment(p, vec2(0.0, -0.2), vec2(0.3, -1.8));
    o = over(o, vec4(stemC * exp(-sd * 45.0) * open, exp(-sd * 45.0) * open));
    o = over(o, bloom(p, 0.85, 0.35 + 0.65 * open, t * 0.12, 0.1, 0.0));
    float orb = smoothstep(0.16, 0.0, length(p - vec2(-0.95, 0.75)));
    o = over(o, vec4(vec3(0.55, 0.62, 1.0) * orb, orb));
  } else if (u_stage < 3.5) {
    // packed: a glowing isometric box, bobbing, tape across the lid.
    vec2 q = p - vec2(0.0, 0.08 * sin(t * 1.1));
    float R = 0.78;
    vec2 h = abs(q);
    float d = max(h.x - 0.866 * R, dot(h, vec2(0.5, 0.866)) - 0.866 * R);
    float inside = smoothstep(0.08, -0.08, d);
    float a = atan(q.y, q.x);
    float face = a > 0.5236 && a < 2.618 ? 1.0 : (a > -1.5708 && a <= 0.5236 ? 0.72 : 0.5);
    vec3 c = mix(vec3(1.0, 0.72, 0.5), mix(u_accent, vec3(1.0), 0.35), 0.4) * face;
    c += soft(face * 1.7 + t * 0.06) * 0.18;
    float lid = a > 0.5236 && a < 2.618 ? 1.0 : 0.0;
    float tape = lid * smoothstep(0.11, 0.06, abs(q.x)) * 0.35;
    float seam = (q.y < 0.0 ? 1.0 : 0.0) * exp(-abs(q.x) * 70.0) * 0.4;
    float edge = exp(-abs(d) * 22.0) * 0.45;
    float shadow = smoothstep(0.7, 0.0, length((p - vec2(0.0, -1.05)) * vec2(1.0, 4.0))) * 0.45;
    o.rgb -= shadow * 0.4;
    o = over(o, vec4(c * inside + vec3(tape + seam) * inside + vec3(1.0, 0.9, 0.8) * edge, inside));
  } else if (u_stage < 4.5) {
    // shipped: a comet of light runs the route to a glowing pin.
    float head = fract(t * 0.11);
    float trail = 0.0;
    for (int i = 0; i < 18; i++) {
      float s = head - float(i) * 0.011;
      if (s < 0.0) break;
      trail += exp(-length(p - route(s)) * 18.0) * (1.0 - float(i) / 18.0);
    }
    float dots = 0.0;
    for (int i = 0; i < 26; i++) dots += smoothstep(0.05, 0.0, length(p - route(float(i) / 25.0)));
    vec2 pin = route(1.0);
    float pinG = smoothstep(0.2, 0.0, length(p - pin)) + exp(-abs(length((p - pin) * vec2(1.0, 1.8)) - 0.42) * 18.0) * 0.4;
    vec3 c = soft(head * 1.5 + t * 0.05) * trail + vec3(0.9, 0.93, 1.0) * dots * 0.35 + vec3(1.0) * pinG;
    o = over(o, vec4(c, clamp(trail + pinG, 0.0, 1.0)));
  } else {
    // delivered: a bouquet at different depths of focus.
    float open = smoothstep(0.2, 2.6, t);
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      vec2 c = vec2(-0.75 + fi * 0.38, 0.45 * sin(fi * 2.1) + 0.1);
      float sd = segment(p, c, vec2(0.05, -1.9));
      o = over(o, vec4(stemC * exp(-sd * 50.0) * 0.8 * open, exp(-sd * 50.0) * open));
    }
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      vec2 c = vec2(-0.75 + fi * 0.38, 0.45 * sin(fi * 2.1) + 0.1);
      float o2 = smoothstep(0.1 + fi * 0.15, 1.6 + fi * 0.2, t);
      // Far blooms are larger blur, near ones crisp: depth of field.
      float blur = 0.04 + 0.16 * fract(fi * 0.61 + 0.3);
      o = over(o, bloom(p - c, 0.42 + 0.06 * sin(fi * 3.0), o2, t * 0.1 + fi, blur, fi));
    }
  }
  return o;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 q = vec2(uv.x * aspect, uv.y);
  float t = u_time * 0.05;

  // Grainy colour field: a deep shade of the stage colour with soft blooms of light.
  vec3 deep = mix(u_accent * 0.32, vec3(0.04, 0.05, 0.14), 0.5);
  vec3 mid = mix(u_accent, vec3(0.42, 0.48, 1.0), 0.4);
  vec3 lift = mix(u_accent, vec3(1.0, 0.82, 0.95), 0.55);
  vec2 w = vec2(field(q * 0.55 + t * 2.0), field(q * 0.55 - t * 1.6 + 3.1));
  float m = field(q * 0.7 + w * 1.2 + u_tilt * 0.4);
  vec3 col = mix(deep, mid, smoothstep(0.3, 0.7, m));
  col = mix(col, lift, smoothstep(0.6, 0.85, m) * 0.55);

  // Iridescent: a faint thin-film edge where light meets shadow.
  col += soft(m * 2.2 + t * 3.0 + u_tilt.x) * clamp(1.0 - abs(m - 0.55) * 5.0, 0.0, 1.0) * 0.1;

  // Holographic: a prismatic light leak that slides with tilt.
  float along = dot(uv - 0.5, normalize(vec2(1.0, -0.4)));
  float leakAt = 0.16 + u_tilt.x * 0.4 + 0.05 * sin(u_time * 0.3);
  float leak = exp(-pow((along - leakAt) * 4.5, 2.0));
  col += spectrum(along * 2.4 + uv.y * 0.35 + t * 3.0) * leak * 0.3;

  // Stage scene, sampled three times for a soft chromatic fringe.
  vec2 centre = u_wide > 0.5 ? vec2(aspect * 0.78, 0.53) : vec2(aspect * 0.73, 0.6);
  float scale = u_wide > 0.5 ? 0.42 : 0.38;
  vec2 sp = (q - centre) / scale;
  vec2 fringe = vec2(0.035, 0.0);
  vec4 g = scene(sp);
  float r = scene(sp + fringe).r;
  float b = scene(sp - fringe).b;
  vec3 art = vec3(r, g.g, b);
  col = col * (1.0 - g.a * 0.75) + art;

  // Twinkling four-point stars.
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    // Right of the headline, or above it: never on the type.
    vec2 at = vec2((0.5 + hash(vec2(fi, 1.0)) * 0.48) * aspect, 0.3 + hash(vec2(fi, 2.0)) * 0.66);
    col += star(q - at, 0.035 + 0.03 * hash(vec2(fi, 3.0))) * (0.45 + 0.45 * sin(u_time * 1.2 + fi * 1.7)) * 0.8;
  }

  // Keep the headline corner calm, then film grain over everything.
  col *= 0.72 + 0.28 * smoothstep(0.0, 0.75, uv.x * 0.9 + uv.y * 0.6);
  col += (hash(gl_FragCoord.xy + fract(u_time * 7.0) * 113.0) - 0.5) * 0.1;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const BETA_COMMON = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_tilt;
uniform float u_dpr;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.55;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 1.9 + vec2(4.7, 1.9); a *= 0.5; }
  return v / 1.0156;
}
vec3 spectrum(float t) { return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67))); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float sdEllipse(vec2 p, vec2 ab) { return (length(p / ab) - 1.0) * min(ab.x, ab.y); }
float fill(float d, float aa) { return smoothstep(aa, -aa, d); }
// Ordered dither threshold, recursive Bayer without arrays (GLSL ES 1.0).
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

vec3 ink(float i) {
  i = mod(i, 7.0);
  if (i < 0.5) return vec3(0.62, 0.84, 0.72); // mint
  if (i < 1.5) return vec3(0.13, 0.28, 0.85); // cobalt
  if (i < 2.5) return vec3(0.18, 0.70, 0.35); // green
  if (i < 3.5) return vec3(0.49, 0.18, 0.31); // plum
  if (i < 4.5) return vec3(0.12, 0.65, 0.95); // sky
  if (i < 5.5) return vec3(0.88, 0.0, 0.0);   // store red
  return vec3(0.42, 0.42, 0.94);              // periwinkle
}
`;
const GLYPH = `
float shape(float k, vec2 q) {
  k = mod(k, 5.0);
  if (k < 0.5) return length(q) - 0.48;
  if (k < 1.5) return sdBox(q, vec2(0.43), 0.1);
  if (k < 2.5) return max(length(q + 0.5) - 1.0, sdBox(q, vec2(0.5), 0.0));
  if (k < 3.5) {
    vec2 a = abs(q) - 0.21;
    return length(a) - 0.27;
  }
  return min(sdBox(q - vec2(0.0, -0.16), vec2(0.34, 0.34), 0.0), length(q - vec2(0.0, 0.18)) - 0.34);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = floor(u_time * 12.0) / 12.0;

  vec2 cell = vec2(aspect * 0.5, 0.5);
  vec2 id = min(floor(p / cell), vec2(1.0));
  vec2 q = (p - (id + 0.5) * cell) / 0.5;
  float seed = id.x + id.y * 2.0;

  float clock = t / 2.6 + seed * 0.37;
  float n = floor(clock);
  float e = smoothstep(0.72, 1.0, fract(clock));
  float base = seed * 3.0 + n;
  float aa = 2.4 / u_res.y;

  vec2 qo = rot((n + e) * 1.5708) * (q + u_tilt * 0.08);
  float outer = mix(shape(n + seed, qo), shape(n + seed + 1.0, qo), e);
  vec2 qi = rot(-(n + e) * 3.1416) * (q + u_tilt * 0.16) * 2.3;
  float inner = mix(shape(n + seed + 3.0, qi), shape(n + seed + 4.0, qi), e) / 2.3;

  vec3 col = mix(ink(base), ink(base + 1.0), e);
  col = mix(col, mix(ink(base + 2.0), ink(base + 3.0), e), fill(outer, aa));
  col = mix(col, mix(ink(base + 4.0), ink(base + 5.0), e), fill(inner, aa) * fill(outer, aa));

  // Riso: paper tooth, a faint ink-starved band, then grain.
  col *= 0.95 + 0.05 * noise(gl_FragCoord.xy * 0.7 / u_dpr);
  col = mix(col, vec3(1.0), 0.05 * smoothstep(0.4, 0.9, noise(vec2(uv.y * 6.0, 1.0))));
  col += (hash(gl_FragCoord.xy + fract(t) * 91.0) - 0.5) * 0.06;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
const PARTICLE = `
float asterisk(vec2 p, float t) {
  float a = atan(p.y, p.x) - t * 0.22;
  float sector = 6.28318 / 7.0;
  float idx = floor(a / sector + 0.5);
  float la = a - idx * sector;
  vec2 q = vec2(cos(la), sin(la)) * length(p);
  float d = length(p) - 0.09;
  for (int j = 0; j < 3; j++) {
    float fj = float(j);
    float s = 0.072 - fj * 0.008 + 0.012 * sin(t * 1.7 + fj * 1.1 + idx * 1.3);
    d = min(d, sdEllipse(q - vec2(0.15 + fj * 0.1, 0.0), vec2(s * 1.25, s * 0.95)));
  }
  return d;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  p += u_tilt * 0.05;
  float t = u_time;
  float aa = 1.6 / u_res.y;

  float d = asterisk(p, t);
  float shadow = asterisk(p - vec2(0.035, -0.035), t);
  vec3 col = vec3(0.985, 0.978, 0.962);

  // Halo: a soft falloff rendered as 2px ordered-dither dots, kept off the edges.
  float halo = exp(-max(shadow, 0.0) * 24.0) * 0.9 * smoothstep(0.5, 0.36, length(p));
  float dots = step(bayer8(gl_FragCoord.xy / (2.0 * u_dpr)), halo);
  col = mix(col, vec3(0.07), dots * (1.0 - fill(d, aa)));

  vec3 glyph = mix(vec3(0.12, 0.65, 0.95), vec3(0.42, 0.42, 0.94), 0.5 + 0.5 * sin(t * 0.5 + length(p) * 6.0));
  col = mix(col, glyph, fill(d, aa));
  col = mix(col, vec3(0.18, 0.70, 0.35), fill(length(p) - 0.055, aa));

  col += (hash(gl_FragCoord.xy + fract(t * 9.0) * 37.0) - 0.5) * 0.04;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const PRISM_404 = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_c;      // the prism's centre, in height-normalised screen units (y up)
uniform float u_s;     // screen units per scene unit
uniform vec3 u_a;      // the left 4: x, y, size
uniform vec3 u_b;      // the right 4
uniform vec2 u_in;     // direction the incoming beam travels
uniform vec2 u_fan;    // the spectrum: angle of its red edge, and its spread
uniform float u_glow;  // hover and click energy

// The beam enters mid left face and leaves mid right face.
const vec2 E = vec2(-0.5, 0.2887);
const vec2 X = vec2(0.5, 0.2887);

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// Red at 0 to violet at 1, the order light leaves a prism in: overlapping soft bands rather
// than hard hues, so the colours melt into one another.
vec3 rainbow(float t) {
  return vec3(exp(-pow((t - 0.04) / 0.3, 2.0)) + 0.4 * exp(-pow((t - 0.96) / 0.14, 2.0)),
              exp(-pow((t - 0.42) / 0.26, 2.0)),
              exp(-pow((t - 0.8) / 0.24, 2.0)));
}
float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
// A 4 drawn as a glass tube, centred on its box: 1.82 wide, 2.26 tall.
float four(vec2 p) {
  float d = min(seg(p, vec2(0.36, -1.0), vec2(0.36, 1.0)),
            min(seg(p, vec2(0.36, 1.0), vec2(-0.78, -0.36)),
                seg(p, vec2(-0.78, -0.36), vec2(0.78, -0.36))));
  return d - 0.115;
}
// Equilateral triangle, apex up, r = half its side (Inigo Quilez).
float tri(vec2 p, float r) {
  const float k = 1.7320508;
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}
// Glass edges, shared by the prism and the 4s. d is the shape's distance (scene units) at
// green; dR and dB are the same shape a hair larger and smaller, as glass bends each colour by
// a slightly different amount. "lit" is how much light reaches this stretch of edge: unlit
// glass shows only a faint hairline, and colour separates only where light strikes it.
vec3 glassEdge(float dR, float d, float dB, float lit) {
  // Edge sharpness in scene units, capped so a small scene (a phone) keeps lines a pixel wide.
  float k = min(120.0, 0.9 * u_s * u_res.y);
  vec3 split = vec3(exp(-abs(dR) * k), exp(-abs(d) * k), exp(-abs(dB) * k));
  vec3 line = mix(vec3(exp(-abs(d) * k)), split, clamp(lit, 0.0, 1.0));
  float inside = smoothstep(0.01, -0.01, d);
  // Glass is thick: a second, dimmer line just inside the edge, and a soft sheen along it.
  float bevel = exp(-abs(d + 0.05) * k * 1.2) * inside;
  float sheen = exp(-abs(d) * 22.0) * inside;
  return line * (0.26 + 0.85 * lit) + vec3(0.8, 0.9, 1.0) * (bevel * (0.05 + 0.3 * lit) + sheen * 0.035);
}

// A glass 4: the prism's glass, lit by whatever light passes through it, so the beam whitens
// one and the spectrum stains the other.
vec3 glassFour(vec2 p, vec3 g, vec3 light) {
  vec2 lp = (p - g.xy) / g.z;
  if (dot(lp, lp) > 2.6) return vec3(0.0);
  float d = four(lp) * g.z;
  float lit = dot(light, vec3(0.5));
  vec3 c = glassEdge(four(lp * 0.993) * g.z, d, four(lp * 1.007) * g.z, lit);
  return c + smoothstep(0.01, -0.01, d) * (vec3(0.6, 0.75, 0.85) * 0.02 + light * 0.35);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy / u_res.y - u_c) / u_s;
  float t = u_time;

  // The room: near-black with a cool cast, slow haze.
  vec3 col = vec3(0.005, 0.011, 0.014) + vec3(0.0, 0.012, 0.016) * (1.0 - uv.y);
  float haze = noise(p * 0.45 + vec2(t * 0.04, -t * 0.025));
  col += vec3(0.006, 0.024, 0.03) * haze;

  // The beam coming in: a clean shaft of warm white, visible because of the dust it crosses.
  vec2 bp = p - E;
  float along = dot(bp, u_in);
  float across = u_in.x * bp.y - u_in.y * bp.x;
  float w = 0.075 - along * 0.012;
  float heart = exp(-pow(across / w, 2.0));
  float dust = 0.75 + 0.25 * noise(vec2(along * 1.4 - t * 0.25, across * 9.0))
                    + 0.3 * smoothstep(0.62, 0.95, noise(p * 6.0 + vec2(t * 0.35, t * 0.12)));
  float beam = (heart * 0.62 + exp(-pow(across / (w * 4.0), 2.0)) * 0.07) * dust * smoothstep(0.02, -0.06, along);
  vec3 light = mix(vec3(0.5, 0.62, 0.66), vec3(1.0, 0.95, 0.88), heart) * beam;

  // The spectrum leaving the right face: distinct bands, widening as they travel, with only a
  // breath of white where they leave the glass.
  vec2 fv = p - X;
  float fr = length(fv);
  float tt = (u_fan.x - atan(fv.y, fv.x)) / u_fan.y;
  float inFan = smoothstep(-0.06, 0.06, tt) * smoothstep(1.06, 0.94, tt) * smoothstep(0.0, 0.25, fr) * step(-0.02, fv.x);
  float sheets = 0.82 + 0.18 * noise(vec2(tt * 5.0, fr * 0.6 - t * 0.3));
  vec3 spec = mix(vec3(1.0, 0.97, 0.93), rainbow(clamp(tt, 0.0, 1.0)), smoothstep(0.05, 0.9, fr));
  float fall = 0.3 + 0.7 * exp(-fr * 0.22);
  light += spec * inFan * sheets * fall * 0.5;
  // A faint scatter either side of the fan.
  light += spec * smoothstep(-0.5, 0.0, tt) * smoothstep(1.5, 1.0, tt) * exp(-fr * 0.5) * 0.03 * step(-0.02, fv.x);
  col += light;

  // The 4s, either side of the glass.
  col += glassFour(p, u_a, light) + glassFour(p, u_b, light);

  // The prism. Its edges catch the light only near where the beam enters and leaves.
  float r = length(p - vec2(0.0, 0.29));
  if (r < 1.5) {
    float dG = tri(p, 1.0);
    float inside = smoothstep(0.01, -0.01, dG);
    float lit = (0.9 * exp(-length(p - E) * 3.2) + 0.7 * exp(-length(p - X) * 3.2)) * (1.0 + u_glow * 0.6);
    col *= 1.0 - inside * 0.18;
    col += inside * vec3(0.6, 0.75, 0.85) * 0.018;
    col += glassEdge(tri(p * 0.993, 1.0), dG, tri(p * 1.007, 1.0), lit);
    // Inside, the light crosses as a narrow shaft, separating into colour toward the far face.
    vec2 v = p - E;
    float a = v.x / (X.x - E.x);
    float bw = mix(0.035, 0.11, clamp(a, 0.0, 1.0));
    float inner = exp(-pow(v.y / bw, 2.0)) * smoothstep(-0.03, 0.04, a) * smoothstep(1.03, 0.97, a) * inside;
    col += mix(vec3(1.0, 0.96, 0.9), rainbow(clamp(0.5 - v.y / (2.0 * bw), 0.0, 1.0)), smoothstep(0.2, 0.95, a)) * inner * 0.42;
    // Where the beam strikes the glass, a small, soft bright spot; no flare.
    float hit = length(p - E);
    col += vec3(1.0, 0.96, 0.9) * (exp(-hit * 26.0) * 0.55 + exp(-hit * 7.0) * 0.05) * (1.0 + u_glow * 0.5);
  }

  // Settle the copy zone and the corners; filmic roll-off; dither so gradients never band.
  col *= mix(0.45, 1.0, smoothstep(0.04, 0.42, uv.y));
  col *= 1.0 - 0.5 * smoothstep(0.45, 1.05, length((uv - 0.5) * vec2(1.0, 1.25)));
  col = 1.0 - exp(-col * 1.15);
  col += (hash(gl_FragCoord.xy) - 0.5) / 128.0;
  gl_FragColor = vec4(col, 1.0);
}`;

// Stage indices follow the PRISM shader's `if` chain: confirmed=2, packed=3, shipped=4, delivered=5.
export const SCENES = [
  { id: 'prism-confirmed', title: 'You’re in.', caption: 'Order pass · confirmed', accent: '#12b76a', kind: 'prism', stage: 2, dark: true },
  { id: 'prism-packed', title: 'All packed.', caption: 'Order pass · packed', accent: '#f79009', kind: 'prism', stage: 3, dark: true },
  { id: 'prism-shipped', title: 'On its way.', caption: 'Order pass · shipped', accent: '#2e90fa', kind: 'prism', stage: 4, dark: true },
  { id: 'prism-delivered', title: 'It’s home.', caption: 'Order pass · delivered', accent: '#e00000', kind: 'prism', stage: 5, dark: true },
  { id: 'beta-glyph', title: 'Beta pass ’26', caption: 'Riso glyphs', accent: '#2147d9', kind: 'glyph', dark: false },
  { id: 'beta-particle', title: 'Beta pass ’26', caption: 'Dithered asterisk', accent: '#1fa6f2', kind: 'particle', dark: false },
  { id: 'prism-404', title: '4 ▲ 4', caption: '404 · light through glass', accent: '#e8f1f4', kind: 'p404', dark: true },
];

const PROGRAM_SOURCES = {
  prism: PRISM_COMMON + PRISM,
  glyph: BETA_COMMON + GLYPH,
  particle: BETA_COMMON + PARTICLE,
  p404: PRISM_404,
};
const PROGRAM_UNIFORMS = {
  prism: ['res', 'time', 'tilt', 'accent', 'seed', 'stage', 'wide'],
  glyph: ['res', 'time', 'tilt', 'dpr'],
  particle: ['res', 'time', 'tilt', 'dpr'],
  p404: ['res', 'time', 'c', 's', 'a', 'b', 'in', 'fan', 'glow'],
};

// 404 scene constants (notFoundPrism.ts).
const BEAM_REST = -0.42;
const BEAM_MIN = -0.95;
const BEAM_MAX = 0.2;
const GLYPH_MID = 0.2887;
const FOUR_SIZE = 1.732 / 2.26;
const FOUR_HALF_W = 0.91 * FOUR_SIZE;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function createReel(canvas, opts = {}) {
  const noop = { show() {}, next() {}, prev() {}, get index() { return 0; }, setTilt() {}, destroy() {} };
  let failed = false;
  const fail = () => {
    if (failed) return;
    failed = true;
    opts.onFail?.();
  };

  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) {
    fail();
    return noop;
  }

  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  // One triangle that covers the viewport.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const programs = {};
  const compile = (type, source) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return s;
  };
  // Starts compiling (async where the driver allows). Returns the cache entry.
  const getProgram = (kind) => {
    if (programs[kind]) return programs[kind];
    const entry = { program: gl.createProgram(), u: null, ready: false };
    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, PROGRAM_SOURCES[kind]);
    entry.fs = fs;
    gl.attachShader(entry.program, vs);
    gl.attachShader(entry.program, fs);
    gl.bindAttribLocation(entry.program, 0, 'p');
    gl.linkProgram(entry.program);
    programs[kind] = entry;
    return entry;
  };
  // true when usable, false while pending; flags failure itself.
  const prepare = (entry, kind) => {
    if (entry.ready) return true;
    if (parallel && !gl.getProgramParameter(entry.program, parallel.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(entry.program, gl.LINK_STATUS)) {
      fail();
      return false;
    }
    entry.u = {};
    for (const n of PROGRAM_UNIFORMS[kind]) entry.u[n] = gl.getUniformLocation(entry.program, `u_${n}`);
    entry.ready = true;
    return true;
  };

  let index = 0;
  let sceneStart = performance.now();
  let drawnKind = null;
  const tilt = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  let visible = true;
  let frame = 0;
  let lastDraw = 0;
  let dirtySize = true;
  let destroyed = false;
  let pendingStill = false;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(2, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    dirtySize = false;
    return { w, h, dpr };
  };

  // 404 state, eased like the original.
  const p404 = { beam: BEAM_REST, lean: { x: 0, y: 0 } };

  // Returns false if the scene's program isn't ready to draw yet.
  const draw = (now) => {
    const scene = SCENES[index];
    const entry = getProgram(scene.kind);
    if (!prepare(entry, scene.kind)) return false;
    const { u } = entry;
    gl.useProgram(entry.program);
    const { w, h, dpr } = resize();
    const aspect = w / h;
    const still = reduced;

    const t0 = (now - sceneStart) / 1000;
    const time = still ? (scene.kind === 'prism' ? 8 : 6) : t0;

    if (!still) {
      eased.x += (tilt.x - eased.x) * 0.12;
      eased.y += (tilt.y - eased.y) * 0.12;
    } else {
      eased.x = tilt.x;
      eased.y = tilt.y;
    }

    gl.uniform2f(u.res, w, h);
    if (scene.kind === 'prism') {
      gl.uniform1f(u.time, time);
      gl.uniform2f(u.tilt, eased.x, eased.y);
      gl.uniform3fv(u.accent, hexToRgb(scene.accent));
      gl.uniform1f(u.seed, 3.7);
      gl.uniform1f(u.stage, scene.stage);
      gl.uniform1f(u.wide, aspect > 1.6 ? 1 : 0);
    } else if (scene.kind === 'glyph' || scene.kind === 'particle') {
      gl.uniform1f(u.time, time);
      gl.uniform2f(u.tilt, eased.x, eased.y);
      gl.uniform1f(u.dpr, dpr);
    } else {
      // The 404 prism. The mouse-driven beam swing is mapped to tilt; the layout is fixed to
      // frame "4 ▲ 4" in the upper part of the card, leaving the bottom for overlay text.
      const t = time % 600;
      const narrow = aspect < 0.9;
      const gap = narrow ? 1.72 : 1.85;
      const top = 0.95;
      const floor = 0.2;
      const halfW = gap + FOUR_HALF_W + 0.3;
      const scale = Math.min((aspect * (narrow ? 0.94 : 0.8)) / (halfW * 2), (top - floor) / 2.7);
      const cx = aspect / 2;
      const cy = floor + (top - floor) * (narrow ? 0.44 : 0.5) - GLYPH_MID * scale;
      gl.uniform2f(u.c, cx, cy);
      gl.uniform1f(u.s, scale);

      const live = Math.abs(eased.x) + Math.abs(eased.y) > 0.002;
      const target = clamp(BEAM_REST + 0.06 * Math.sin(t * 0.17) + eased.y * 1.15 + eased.x * 0.2, BEAM_MIN, BEAM_MAX);
      p404.beam = still ? BEAM_REST : target;
      p404.lean.x = live && !still ? clamp(eased.x * 2, -1, 1) : 0;
      p404.lean.y = live && !still ? clamp(-eased.y * 2, -1, 1) : 0;

      const swing = p404.beam - BEAM_REST;
      const fanTop = 0.04 + swing * 0.75;
      const fanSpread = clamp(0.5 + swing * 0.3, 0.3, 0.7);
      const bob = (phase) => (still ? 0 : 0.03 * Math.sin(t * 0.6 + phase));
      gl.uniform1f(u.time, t);
      gl.uniform3f(u.a, -gap + p404.lean.x * 0.06, GLYPH_MID + bob(0) + p404.lean.y * 0.04, FOUR_SIZE);
      gl.uniform3f(u.b, gap + p404.lean.x * 0.06, GLYPH_MID + bob(2.2) + p404.lean.y * 0.04, FOUR_SIZE);
      gl.uniform2f(u.in, Math.cos(p404.beam), Math.sin(p404.beam));
      gl.uniform2f(u.fan, fanTop, fanSpread * (still ? 1 : 1 - Math.exp(-t * 1.6)) + 0.001);
      gl.uniform1f(u.glow, 0);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    drawnKind = scene.kind;
    return true;
  };

  const isEasing = () => Math.abs(tilt.x - eased.x) > 0.002 || Math.abs(tilt.y - eased.y) > 0.002;
  const canRun = () => visible && !document.hidden && !destroyed && !failed;

  const loop = (now) => {
    frame = 0;
    if (!canRun()) return;
    if (reduced) {
      // One still frame per show(); poll only while the program is still compiling.
      if (pendingStill && draw(now)) pendingStill = false;
      if (pendingStill && !failed) frame = requestAnimationFrame(loop);
      return;
    }
    // 30fps when idle, full rate while the tilt is still easing.
    if (!lastDraw || isEasing() || now - lastDraw >= 30) {
      if (draw(now)) lastDraw = now;
    }
    frame = requestAnimationFrame(loop);
  };
  const kick = () => {
    if (!frame && canRun()) frame = requestAnimationFrame(loop);
  };

  const show = (target) => {
    if (failed || destroyed) return;
    let i = typeof target === 'string' ? SCENES.findIndex((s) => s.id === target) : target;
    if (!Number.isInteger(i) || i < 0 || i >= SCENES.length) return;
    index = i;
    sceneStart = performance.now();
    lastDraw = 0;
    getProgram(SCENES[index].kind); // start compiling right away
    if (reduced) pendingStill = true;
    kick();
    opts.onChange?.(index, SCENES[index]);
  };

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) kick();
  });
  io.observe(canvas);
  const ro = new ResizeObserver(() => {
    dirtySize = true;
    if (reduced) {
      pendingStill = true;
      kick();
    }
  });
  ro.observe(canvas);
  const onVisibility = () => {
    if (!document.hidden) {
      lastDraw = 0;
      kick();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  const onLost = (e) => {
    e.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
    fail();
  };
  canvas.addEventListener('webglcontextlost', onLost);

  show(opts.start ?? 0);
  // Surface compile/link failures of the first scene promptly when the driver is synchronous.
  if (!parallel) prepare(getProgram(SCENES[index].kind), SCENES[index].kind);

  return {
    show,
    next() { show((index + 1) % SCENES.length); },
    prev() { show((index - 1 + SCENES.length) % SCENES.length); },
    get index() { return index; },
    setTilt(x, y) {
      tilt.x = clamp(x, -0.5, 0.5);
      tilt.y = clamp(y, -0.5, 0.5);
      if (reduced) {
        pendingStill = true;
      }
      kick();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frame);
      frame = 0;
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
