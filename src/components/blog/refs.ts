// every reference a post may cite, by id. only pages that have been opened and read, and the site's own files.
// a post lists the ids it cites in its frontmatter (refs: [...]); <Ref id="…"> takes its number from that list
export type Reference = { title: string; site: string; href?: string; note: string };

export const REFS: Record<string, Reference> = {
  webaudio: {
    title: 'Web Audio API',
    site: 'MDN',
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API',
    note: 'The browser’s own synthesizer: oscillators, gains, filters, reverb. Every note on the site is made with it.',
  },
  pentatonic: {
    title: 'Pentatonic scale',
    site: 'Wikipedia',
    href: 'https://en.wikipedia.org/wiki/Pentatonic_scale',
    note: 'Five notes to the octave. The major pentatonic has no semitones in it, which is why it’s hard to play a wrong note.',
  },
  'reduced-motion': {
    title: 'prefers-reduced-motion',
    site: 'MDN',
    href: 'https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion',
    note: 'The media query that tells a page someone has asked their device for less motion.',
  },
  raf: {
    title: 'requestAnimationFrame()',
    site: 'MDN',
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame',
    note: 'Asks the browser for one frame. The garden only asks again while something is moving.',
  },
  'touch-action': {
    title: 'touch-action',
    site: 'MDN',
    href: 'https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action',
    note: 'How a page tells the browser which finger gestures it keeps for itself and which still scroll.',
  },
  'pixels-js': {
    title: 'js/garden/pixels.js',
    site: 'this site’s source',
    note: 'The pixel garden: placement, stitching, the idle stop and the tidying up.',
  },
  'feel-js': {
    title: 'js/feel.js',
    site: 'this site’s source',
    note: 'All the sound and the haptics, synthesized live. No audio files.',
  },
  'flora-js': {
    title: 'js/garden/flora.js',
    site: 'this site’s source',
    note: 'Every flower as a grid of letters, one letter per stitch.',
  },
};
