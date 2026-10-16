// PROTOTYPE. Original hand-drawn cats (inspired by the moods in the moodboard,
// not traced from it). Ink lines, warm white fill, a little blush.
const INK = '#2a2826', FUR = '#fffdf9', BLUSH = '#f3b4ae';

// A fluffy outline: an ellipse whose edge breaks into soft tufts.
function fluff(cx, cy, rx, ry, tufts, depth, start = 0) {
  let d = '';
  for (let i = 0; i <= tufts; i++) {
    const a = start + i / tufts * Math.PI * 2;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    if (i === 0) { d += `M${x.toFixed(1)} ${y.toFixed(1)}`; continue; }
    const am = a - Math.PI / tufts;
    const mx = cx + Math.cos(am) * (rx + depth), my = cy + Math.sin(am) * (ry + depth);
    d += `Q${mx.toFixed(1)} ${my.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d + 'Z';
}

const svg = (vb, body, cls = '') =>
  `<svg class="cat ${cls}" viewBox="${vb}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** Lying in the grass, eyes shut, chin on paws. */
export const sleepyCat = () => svg('0 0 200 112', `
  <path fill="${FUR}" d="M82 52C108 40 158 40 180 60C193 72 191 92 176 96L66 98Z"/>
  <path d="M176 95C186 100 197 94 195 84" />
  <path fill="${FUR}" d="M40 94C22 92 15 78 19 63C21 55 23 51 26 46L30 21L48 37C56 34 66 34 74 37L91 19L93 46C97 54 98 63 95 71C92 86 80 95 60 96Z"/>
  <path fill="${FUR}" d="M42 99C40 90 58 89 60 98M60 99C59 91 76 90 78 98"/>
  <path d="M33 66Q39 71 45 66M61 66Q67 71 73 66"/>
  <path fill="${INK}" stroke-width="1.2" d="M52.5 73.5h4l-2 2.2z"/>
  <path stroke-width="1.8" d="M49 78Q51.7 81 54.5 77.6Q57.3 81 60 78"/>
  <path stroke-width="1.2" d="M26 73L8 70M26 77L9 80M84 73L101 70M84 77L100 80"/>
  <ellipse fill="${BLUSH}" stroke="none" opacity=".55" cx="33" cy="75" rx="5.5" ry="3"/>
  <ellipse fill="${BLUSH}" stroke="none" opacity=".55" cx="76" cy="75" rx="5.5" ry="3"/>
  <g class="zz" fill="${INK}" stroke="none" font-family="ui-rounded, system-ui, sans-serif" font-weight="600">
    <text x="98" y="30" font-size="13">z</text><text x="108" y="18" font-size="10">z</text><text x="116" y="9" font-size="8">z</text>
  </g>`, 'sleepy');

/** Smug, tongue out, pointing a paw at you. */
export const pointCat = () => svg('0 0 170 170', `
  <path fill="${FUR}" d="M46 160C34 140 38 112 56 100L104 100C122 112 126 140 114 160Z"/>
  <path fill="${FUR}" d="M54 162c-2-8 14-9 16 0M92 162c-2-8 14-9 16 0"/>
  <path fill="${FUR}" d="${fluff(80, 70, 46, 40, 22, 3, -.2)}"/>
  <path fill="${FUR}" d="M44 52L40 18L66 36M96 36L122 16L118 52"/>
  <path stroke-width="1.6" d="M45 25L48 40M117 24L113 39"/>
  <ellipse fill="${INK}" stroke="none" cx="64" cy="67" rx="7" ry="8"/>
  <ellipse fill="${INK}" stroke="none" cx="98" cy="67" rx="7" ry="8"/>
  <circle fill="#fff" stroke="none" cx="66.5" cy="64" r="2.4"/><circle fill="#fff" stroke="none" cx="100.5" cy="64" r="2.4"/>
  <path stroke-width="1.8" d="M56 56.5L69 58.5M93 58.5L106 56.5"/>
  <path fill="${INK}" stroke-width="1.2" d="M78.5 78h5l-2.5 2.6z"/>
  <path stroke-width="1.8" d="M73 84Q77 88 81 84Q85 88 89 84"/>
  <path fill="#f08a96" stroke-width="1.6" d="M79 87c0 9 8 9 8 0"/>
  <ellipse fill="${BLUSH}" stroke="none" opacity=".6" cx="55" cy="80" rx="6.5" ry="3.5"/>
  <ellipse fill="${BLUSH}" stroke="none" opacity=".6" cx="107" cy="80" rx="6.5" ry="3.5"/>
  <path stroke-width="1.2" d="M42 80L24 77M42 85L25 89M120 80L138 77M120 85L137 89"/>
  <g class="paw"><path fill="${FUR}" d="M106 118C122 116 134 110 146 104C154 100 160 108 153 113C142 120 126 128 108 132"/>
  <path fill="${FUR}" d="M146 104c3-4 12-6 16-3c3 2 1 6-3 6"/></g>`, 'point');

/** Fluffy, glasses, unimpressed, quietly on fire, typing. */
export const wipCat = () => svg('0 0 180 160', `
  <g class="flame"><path fill="#ff9a3c" stroke="#e8542a" stroke-width="1.6" d="M84 46C70 34 76 18 84 8C84 20 94 18 96 6C108 18 110 34 98 46Z"/>
  <path fill="#ffd36b" stroke="none" d="M88 44C82 36 86 28 90 22C92 30 98 30 98 26C102 34 100 40 94 44Z"/></g>
  <path fill="${FUR}" d="${fluff(90, 96, 60, 52, 30, 4)}"/>
  <path fill="${FUR}" d="M50 66L46 38L72 52M108 52L134 38L130 66"/>
  <circle cx="72" cy="86" r="11"/><circle cx="108" cy="86" r="11"/><path d="M83 85Q90 81 97 85"/>
  <path stroke-width="2.6" d="M66 88L78 88M102 88L114 88"/>
  <path fill="${INK}" stroke-width="1.2" d="M87.5 98h5l-2.5 2.6z"/>
  <path stroke-width="1.8" d="M85 105Q90 102 95 105"/>
  <ellipse fill="${BLUSH}" stroke="none" opacity=".7" cx="64" cy="102" rx="7" ry="4"/>
  <ellipse fill="${BLUSH}" stroke="none" opacity=".7" cx="116" cy="102" rx="7" ry="4"/>
  <path fill="#e6e3dd" d="M50 118L130 118L138 152L42 152Z"/>
  <path fill="#d6d2ca" d="M30 152h120"/>
  <path stroke="#b9b4ab" stroke-width="1.6" d="M86 132q4 4 8 0"/>
  <path fill="${FUR}" d="M40 140c-4-8 10-12 14-4M126 140c4-8-10-12-14-4"/>
  <path fill="${FUR}" d="M150 124h14v18a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6z"/><path d="M164 128a5 5 0 0 1 0 10"/>
  <path class="steam" stroke-width="1.4" stroke="#b9b4ab" d="M154 118q-3-5 0-9M160 118q-3-5 0-9"/>`, 'wip');

export const CAT_CSS = `
.cat { display: block; overflow: visible; }
.cat .zz text { animation: zz 3.2s ease-in-out infinite; opacity: 0; }
.cat .zz text:nth-child(2) { animation-delay: .5s; } .cat .zz text:nth-child(3) { animation-delay: 1s; }
@keyframes zz { 0% { opacity: 0; transform: translate(0, 4px); } 30%, 60% { opacity: .8; } 100% { opacity: 0; transform: translate(4px, -6px); } }
.cat .flame { transform-box: fill-box; transform-origin: 50% 100%; animation: flame .5s ease-in-out infinite alternate; }
@keyframes flame { from { transform: scale(1, 1) skewX(-3deg); } to { transform: scale(.94, 1.08) skewX(4deg); } }
.cat .paw { transform-box: view-box; transform-origin: 108px 124px; animation: poke 2.4s cubic-bezier(.3, 1.6, .5, 1) infinite; }
@keyframes poke { 0%, 70%, 100% { transform: none; } 80% { transform: translate(4px, -1px) rotate(-3deg); } }
.cat .steam { animation: steam 2s ease-in-out infinite; }
@keyframes steam { 0%, 100% { opacity: .2; transform: translateY(1px); } 50% { opacity: .9; transform: translateY(-2px); } }
@media (prefers-reduced-motion: reduce) { .cat * { animation: none !important; } .cat .zz text { opacity: .7; } }
`;

// the bee, in pixels to match the garden. two wing frames swap while it flies.
const BEE = {
  up: ['.....ooo.ooo.', '....owwwowwwo', '.....owwwwwo.', '..K.K.oooo...'],
  down: ['.............', '.....oo..oo..', '....owwoowwo.', '..K.Kowwwwo..'],
  body: ['.KKKKYYKKYYK.', 'KKEKKYYKKYYKK', 'KpKKKYYKKYYKKK', '.KKKKyyKKyyK.', '..K...K..K...'],
};
const BEE_COL = { K: '#1d1c1b', Y: '#ffc93c', y: '#f0a51c', E: '#fff', p: '#f594b8', w: '#eef6ff', o: '#9fb6d3' };
const beeRects = (rows, y0) => rows.flatMap((row, r) => [...row].map((k, c) => k === '.' ? '' :
  `<rect x="${c}" y="${y0 + r}" width="1.04" height="1.04" fill="${BEE_COL[k]}"/>`)).join('');
export const beeSVG = () => `
<svg class="bee-svg" viewBox="0 0 14 9" shape-rendering="crispEdges" aria-hidden="true">
  <g class="wa">${beeRects(BEE.up, 0)}</g><g class="wd">${beeRects(BEE.down, 0)}</g>${beeRects(BEE.body, 4)}
</svg>`;
