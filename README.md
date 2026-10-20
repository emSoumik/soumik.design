# soumik.design

The portfolio of Soumik Halder, a design engineer. It's a white page with a pixel garden. Tap anywhere and a flower stitches itself in, pixel by pixel. A bee visits the flowers, butterflies turn up once the garden grows, and everything plays a little music as you go. Scroll down and you get the work: WhyClub and the shaders.

Live at **[soumik.design](https://soumik.design)**.

## How it's built

Plain HTML, CSS and JavaScript modules. No framework, no build step, no dependencies. What's in the folder is what gets served.

- The garden is a `<canvas>` drawn in stepped frames, like real pixel art. It stops drawing completely when nothing is moving.
- All sound is synthesized live with the Web Audio API, so there are no audio files.
- The hand-off from the garden to the work is a CSS scroll-driven animation, so it runs off the main thread and costs no JavaScript.
- Nothing below the fold loads up front. The work section, its videos and the WebGL reel load as you scroll towards them.
- Images ship as AVIF with WebP as the fallback.

## Folder map

```
index.html            the page: markup, all the CSS, SEO and social tags
js/
  main.js             wires the page together (start here)
  content.js          copy and links: email, socials, project links, the bee's facts
  feel.js             sound design and haptics
  garden/
    pixels.js         the pixel garden: planting, growing, the self-clearing loop
    flora.js          the flowers that keep their own colours, and the butterfly sprites
    bee.js            the bee
    butterflies.js    the butterflies
    watercolour.js    the old watercolour garden, still there behind ?garden=ink
  companions/
    about.js          the About card the bee morphs into
    mochi.js          mochi the cat (switched off for now, see below)
  work/
    work.js           the work section
    slideshow.js      the WhyClub screens, as stories in a browser window
    reel.js           the live WebGL shader reel
assets/
  brand/              favicons, avatar, the link preview card
  fonts/              Faculty Glyphic (the reel titles)
  mochi/              mochi's art
  work/whyclub/       WhyClub screenshots and screen recordings, plus phone.json
robots.txt, sitemap.xml
_drafts/              old prototypes and experiments (git-ignored, never deployed)
```

## Run it locally

Any static server works. From this folder:

```bash
python3 -m http.server 5191
```

Then open http://localhost:5191. It has to be served, not opened as a file, because the scripts are ES modules.

## Deploy

The site is on Vercel, connected to this GitHub repo. Every push to `main` deploys to soumik.design within a minute or so. `.vercelignore` keeps the README and drafts out of the deploy.

## Common edits

- **Email, socials, project links:** `js/content.js`
- **What the bee says on the About card:** `FACTS` in `js/content.js`. Keep each fact short, because it sits in a small bubble.
- **The About card text:** `js/companions/about.js`
- **Work section copy:** `js/work/work.js`
- **How full the garden gets before old flowers make room:** `FULL` in `js/garden/pixels.js`
- **How many butterflies:** `FLY_MAX` in `js/main.js`
- **Bring mochi back:** set `MOCHI = true` in `js/main.js`
- **The link preview:** the `og:` and `twitter:` tags in `index.html`, and `assets/brand/og-card.png` (1200×630)

## Sound

Everything plays in D major pentatonic, so any mix of taps comes out sounding like music. Planting walks a small melody on a kalimba-like tone. A growing flower plays a music-box run, its sparkles chime an octave up, and buttons tick-tock. Butterflies flutter off with a harp flick, and clearing the garden runs back down the scale. Visitors can mute it with the speaker button in the top right; the choice is remembered.

## Accessibility and motion

- Every animation has a reduced-motion version. With reduced motion on, flowers appear without stitching, butterflies sit still and the scroll effects are off.
- Buttons have tap targets of at least 44px.
- The garden canvas is hidden from screen readers. The real content is in plain HTML.
