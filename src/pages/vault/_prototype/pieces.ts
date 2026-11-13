// the vault prototype's pieces. the newest go first. the shader and dock copy is the old vault's own
export type Piece = {
  slug: string;
  kind: 'Shader' | 'Component' | 'Garden';
  /** a film instead of a live demo: /assets/vault/<video>.{mp4,webm} with a -poster still */
  video?: string;
  title: string;
  line: string;
  /** reel scenes the demo walks (shaders) */
  scenes: number[];
  /** the surface the piece sits on */
  tone: 'ink' | 'paper';
  about: string[];
  madeWith: string;
  partOf: [string, string];
  links: [string, string][];
  /** the demo's own shape, width / height. the card and the stage both take it */
  r: number;
};

const CASE = '/projects/whyclub/';
const PASS = 'https://prototype.whyclub.in/';
const BUILT = 'https://prototype.whyclub.in/case-study/';
const GLSL = 'WebGL and hand-written GLSL';
const part: [string, string] = ['WhyClub', CASE];

const GARDEN: [string, string] = ['The pixel garden', '/blog/a-garden-that-tends-itself/'];
const POST = '/blog/a-garden-that-tends-itself/';
const FILMED = 'The garden’s own sprites and stitch order, slowed to fifteen seconds';

export const PIECES: Piece[] = [
  {
    slug: 'daisy', kind: 'Garden', title: 'Daisy, stitch by stitch', tone: 'paper', scenes: [], video: 'garden/daisy',
    line: 'Every flower in my garden is sewn in one cell at a time, in an order fixed before the first stitch lands. Here is a daisy slowed from under a second to fifteen, every stitch numbered as it goes in.',
    about: [
      'The stem goes first. It climbs out of the soil a cell at a time, and the leaves join as the stem reaches them, one side then the other. Only then does the head begin.',
      'The head grows from its centre out. A cell’s place in the queue is its distance from the middle, so the yellow eye closes first and the lilac tips land last, the way a flower opens.',
      'In the garden a stitch lands every 26 milliseconds, and a whole flower never takes more than 900, so nothing blooms slower than a breath. Each stitch plays a note: low, muted plucks up the stem, brighter ones for the petals, all in D major pentatonic so no tap is ever out of tune.',
    ],
    madeWith: FILMED, partOf: GARDEN,
    links: [['How the garden works', POST], ['Plant one yourself', '/']],
    r: 4 / 5,
  },
  {
    slug: 'rose', kind: 'Garden', title: 'Rose, stitch by stitch', tone: 'paper', scenes: [], video: 'garden/rose',
    line: 'A rose from the garden, slowed down far enough to count. About a hundred stitches, from the first cell of stem to the last fold of the outer petals.',
    about: [
      'Same rules as every flower: stem from the soil up, leaves as it passes them, then the head from its centre out. The head is a chart drawn by hand, ten rows of letters, one letter per cell, like a cross-stitch pattern written in code.',
      'The letters are roles, not colours: a petal, the crease where two petals meet, the deep fold between them. Each rose comes in a few colourways, and the garden picks whichever stands apart from the flowers beside it.',
      'The same seed always grows the same plant. The greens, stem and leaves draw on it first and the head after, so a rose keeps its stem when you tap it and it turns into the next of its kind.',
    ],
    madeWith: FILMED, partOf: GARDEN,
    links: [['How the garden works', POST], ['Plant one yourself', '/']],
    r: 4 / 5,
  },
  {
    slug: 'order-pass', kind: 'Shader', title: 'Order pass', tone: 'ink', scenes: [0, 1, 2, 3],
    line: 'Every WhyClub order gets a pass that changes as the order moves. Each stage has its own light, written by hand in WebGL.',
    about: [
      'One fragment shader draws all four stages. A bloom opens when the order is confirmed, a glowing box bobs once it’s packed, a comet runs the route to a pin when it ships, and a bouquet sits at different depths of focus when it’s home.',
      'Under each scene is a grainy colour field in the stage’s accent, a faint iridescent edge, and a light leak that slides as you tilt. A cosine palette keeps the colour smooth, and dither on top stops the gradients banding. Move your pointer over it to tilt the light.',
      'A status label says “shipped”. The pass shows it: You’re in, All packed, On its way, It’s home.',
      'The shaders were written for the drop pass, then turned up around the rest of the store. The full write-up of how they were made lives on the prototype site.',
    ],
    madeWith: GLSL, partOf: part,
    links: [['How the shaders were built', BUILT], ['Try the drop pass', PASS], ['whyclub.in', 'https://whyclub.in']],
    r: 16 / 9,
  },
  {
    slug: 'riso-glyphs', kind: 'Shader', title: 'Riso glyphs', tone: 'paper', scenes: [4],
    line: 'The beta pass’s badges, printed like a riso: paper tooth, a faint ink-starved band, then grain. Hand-written WebGL.',
    about: [
      'The glyphs are printed like a riso: paper tooth, a faint ink-starved band, then grain. Move your pointer over it to tilt the light.',
      'These started with the drop pass and spread. The beta pass got riso badges.',
    ],
    madeWith: GLSL, partOf: part,
    links: [['How the shaders were built', BUILT], ['whyclub.in', 'https://whyclub.in']],
    r: 1,
  },
  {
    slug: 'dithered-asterisk', kind: 'Shader', title: 'Dithered asterisk', tone: 'paper', scenes: [5],
    line: 'An asterisk for the beta pass whose halo is drawn as ordered-dither dots, in hand-written WebGL.',
    about: [
      'The asterisk’s halo is drawn as 2px ordered-dither dots. Move your pointer over it to tilt the light.',
      'These started with the drop pass and spread. The beta pass got a dithered asterisk.',
    ],
    madeWith: GLSL, partOf: part,
    links: [['How the shaders were built', BUILT], ['whyclub.in', 'https://whyclub.in']],
    r: 1,
  },
  {
    slug: 'dock', kind: 'Component', title: 'The dock', tone: 'paper', scenes: [],
    line: 'WhyClub’s navigation: one piece at the bottom of the screen that is a pill, a bar or a panel, depending on where you are.',
    about: [
      'It’s one shell that morphs between three shapes. At the top of the page it’s a bar. Further down it shrinks to a pill. Tap a tab and it opens into a panel: Shop, Account or More.',
      'Each change is a morph on a spring, not a swap. This is the real component, built from the store and running in a frame. The notes around it are measured from the live dock.',
      'On WhyClub the navigation lives at the bottom of the screen, where your thumb already is.',
      'Instead of a header and a separate menu, it’s one thing that stays small while you browse and opens up when you ask it to. The tour walks it through each shape until you tap it.',
    ],
    madeWith: 'The real component, built from the WhyClub store, running in a frame', partOf: part,
    links: [['WhyClub case study', CASE], ['whyclub.in', 'https://whyclub.in']],
    r: 15 / 16,
  },
];
