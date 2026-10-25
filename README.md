# soumik.design

The portfolio of Soumik Halder, a design engineer. It's a white page with a pixel garden. Tap anywhere and a flower stitches itself in, pixel by pixel. A bee visits the flowers, butterflies turn up once the garden grows, and everything plays a little music as you go. Scroll down and you get the work: WhyClub and the shaders.

Live at **[soumik.design](https://soumik.design)**.

## How it's built

[Astro](https://astro.build) builds it into a plain static site. The home page is still hand-written HTML and CSS with vanilla JavaScript modules, no UI framework; Astro just bundles the scripts and adds the case studies and the blog, written in MDX.

- The garden is a `<canvas>` drawn in stepped frames, like real pixel art. It stops drawing completely when nothing is moving.
- All sound is synthesized live with the Web Audio API, so there are no audio files.
- The hand-off from the garden to the work is a CSS scroll-driven animation, so it runs off the main thread and costs no JavaScript.
- Nothing below the fold loads up front. The work section, its videos and the WebGL reel load as you scroll towards them.
- Images ship as AVIF with WebP as the fallback.

## Folder map

```
src/
  pages/
    index.astro       the home page: markup, all its CSS, SEO and social tags
    work/, blog/      the index pages and the page every case study or post renders into
    sitemap.xml.ts    /sitemap.xml, built from every published page
  content/
    work/<slug>/      a case study: index.mdx plus its images
    blog/<slug>/      a post: index.mdx plus its images
  content.config.ts   what a case study's and a post's frontmatter must have
  components/
    Wordmark.astro    the Soumik wordmark with the pixel sunflower
    mdx/              Figure, Video and Screens, usable in any post without importing
  layouts/Base.astro  the head, masthead and footer of every page but home
  styles/site.css     the reading pages' styles
js/                   the home page's scripts, bundled by Astro as they are
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
public/               served as is, at the same URLs as always
  assets/
    brand/            favicons, avatar, the link preview card
    fonts/            Faculty Glyphic (the reel titles)
    mochi/            mochi's art
    work/whyclub/     WhyClub screenshots and screen recordings, plus phone.json
  robots.txt
vercel.json           tells Vercel to build with Astro and serve dist/
_drafts/              old prototypes and experiments (git-ignored, never deployed)
```

## Run it locally

Needs Node 22.23 or newer. From this folder:

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:4321. Edits to the scripts, pages and posts reload the page. `npm run build` makes the real site in `dist/`, and `npm run preview` serves that.

Anything only for your own machine (like the Agentation toolbar) should load behind `import.meta.env.DEV`, so it never reaches the live site. A dynamic `import()` of a file that isn't committed breaks the build on Vercel, so load those with `import.meta.glob`, which quietly finds nothing when the file isn't there.

## Write a case study or a post

1. Make a folder: `src/content/work/<slug>/` for a case study, `src/content/blog/<slug>/` for a post. The slug becomes the URL (`/work/<slug>/`, `/blog/<slug>/`).
2. Put an `index.mdx` in it, and its images next to it. Start from `src/content/work/whyclub/index.mdx` or `src/content/blog/a-garden-that-tends-itself/index.mdx`.
3. Fill in the frontmatter. `src/content.config.ts` lists the fields, and the build stops with a clear message if one is missing or wrong.
4. Keep `draft: true` while you write. Drafts show in `npm run dev` and on Vercel preview deploys (every branch and PR gets one), and nowhere else, so a production build can never publish one by accident. To see them in a local build, run `DRAFTS=1 npm run build`. Set it to `false` to publish.

Markdown images (`![alt](./shot.png)`) are optimised automatically. For more, these work in any post without importing:

- `<Figure src={shot} alt="…" caption="…" wide />`: an image from the folder, served as AVIF with a WebP fallback. Import it first: `import shot from './shot.png'`. `phone` keeps a phone screenshot narrow.
- `<Video src="/assets/…/clip.mp4" webm="…" poster="…" alt="…" caption="…" phone />`: a screen recording that plays, muted and looping, while it's on screen. With reduced motion, it waits for play.
- `<Screens device="phone" caption="…" />`: the WhyClub screens slideshow from the home page.

`wide` lets a figure run wider than the text, up to the cover's width.

## Deploy

The site is on Vercel, connected to this GitHub repo. Every push to `main` builds and deploys to soumik.design within a minute or so. Other branches and PRs get preview deploys. `vercel.json` sets the build (`npm run build`, output `dist/`), so it doesn't depend on the dashboard settings. `.vercelignore` keeps the README and drafts out of the upload.

## Common edits

- **Email, socials, project links:** `js/content.js`
- **What the bee says on the About card:** `FACTS` in `js/content.js`. Keep each fact short, because it sits in a small bubble.
- **The About card text:** `js/companions/about.js`
- **Work section copy:** `js/work/work.js`
- **How full the garden gets before old flowers make room:** `FULL` in `js/garden/pixels.js`
- **How many butterflies:** `FLY_MAX` in `js/main.js`
- **Bring mochi back:** set `MOCHI = true` in `js/main.js`
- **The link preview:** the `og:` and `twitter:` tags in `src/pages/index.astro`, and `public/assets/brand/og-card.png` (1200×630)

## Sound

Everything plays in D major pentatonic, so any mix of taps comes out sounding like music. Planting walks a small melody on a kalimba-like tone. A growing flower plays a music-box run, its sparkles chime an octave up, and buttons tick-tock. Butterflies flutter off with a harp flick, and clearing the garden runs back down the scale. Visitors can mute it with the speaker button in the top right; the choice is remembered.

## Accessibility and motion

- Every animation has a reduced-motion version. With reduced motion on, flowers appear without stitching, butterflies sit still and the scroll effects are off.
- Buttons have tap targets of at least 44px.
- The garden canvas is hidden from screen readers. The real content is in plain HTML.
