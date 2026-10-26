# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Portfolio site for soumik.design: a white page with a pixel-art garden, then the work below. Astro (static output) with MDX for case studies and the blog. The home page is hand-written HTML/CSS plus vanilla ES modules in `js/`, which Astro bundles as one client script; **no UI framework, no tests, no linter.** Every push to `main` builds on Vercel and deploys.

`README.md` has the folder map and a "Common edits" table (which constant to change for flower size, garden capacity, butterfly count, copy, etc.). Read it before hunting for a knob.

## Run

```bash
npm run dev      # http://localhost:4321, drafts visible
npm run build    # the real site in dist/; must pass before pushing
```

Verify changes in a browser. `DRAFTS=1 npm run build` includes draft posts in a local build.

Query flags: `?garden=ink` loads the old watercolour garden (`js/garden/watercolour.js`) instead of the pixel one. `#about` opens the About card on load.

## Architecture

- `src/pages/index.astro` holds the home page's markup, **all its CSS** (an inline `<style is:inline>`, deliberately unprocessed), and the SEO/social/JSON-LD tags. The reading pages (`/work`, `/blog`) use `src/layouts/Base.astro` and `src/styles/site.css`. Companion modules (`bee.js`, `butterflies.js`) inject their own CSS at runtime via `css()` from `content.js`.
- `js/main.js` is the home page's only entry point (`<script src="../../js/main.js">` in `index.astro`, bundled by Vite). It builds the garden, bee, butterflies and About card, and wires sound/mute, the hint line, the clear button and planting. Modules don't import each other sideways; `main.js` passes them shared callbacks and a `spots()` function that exposes the garden's live flowers.
- **Garden → companions contract:** `pixels.js` exposes `plant / patches / flowerAt / clear / destroy` and `onStitch / onBloom / onMorph / onSparkle / onGrown` callbacks. `patches()` is deliberately shaped like the watercolour garden's patches, so the bee and butterflies work with either implementation. Keep that shape if you change either garden.
- `js/garden/flora.js` holds only sprite data (pixel-grid flower families, each with `forms` for tap-to-morph, plus butterfly sprites). `pixels.js` owns placement, spacing (`REACH/CLOSE/APART/MEMORY`), growth, and the self-clearing loop (`FULL`: oldest flowers unpick once the garden is full). The canvas draws in stepped frames and stops rendering entirely when idle, so keep new animation inside that idle-stop model.
- `js/feel.js` is the sound/haptics singleton. All audio is synthesized with Web Audio (D major pentatonic, so any tap sequence sounds musical); there are no audio files. Mute state is persisted.
- `js/content.js` is the shared copy/links (email, socials, project links, the bee's `FACTS`) plus the `css()` injector.
- **Lazy loading:** everything below the fold is dynamic-imported. `main.js` mounts `work/work.js` via IntersectionObserver (or after idle on load); `work.js` in turn lazy-loads `slideshow.js` and the WebGL `reel.js`, and videos load near the viewport. Don't add static imports of work modules to `main.js`.
- The garden → work hand-off is a CSS scroll-driven animation in `index.astro`, not JS.
- **Case studies and posts:** `src/content/work/<slug>/index.mdx` and `src/content/blog/<slug>/index.mdx`, typed in `src/content.config.ts`. `draft: true` hides an entry everywhere except dev, Vercel previews and `DRAFTS=1` (`src/lib/content.ts`). MDX gets `Figure`, `Video` and `Screens` (`src/components/mdx/`) without imports. The home page passes published case-study ids to `work.js` via `data-cases` on `#work`.
- Static files live in `public/` (`public/assets/…` keeps the old `/assets/…` URLs). Modules reference assets by root path (`/assets/…`), never relative to `import.meta.url`, because bundled chunks live in `/_astro/`.
- Mochi the cat (`companions/mochi.js`) is switched off with `const MOCHI = false` in `main.js`. When off, `main.js` substitutes a no-op stand-in object, so any new call on `mochi` must also be added to that stub.

## Conventions

- Every animation needs a `prefers-reduced-motion` path (flowers appear without stitching, butterflies sit still, scroll effects off). `main.js` reads `reduced` and `touch` once at load.
- Tap targets ≥ 44px. The garden canvas is hidden from assistive tech; real content stays in plain HTML.
- Images ship as AVIF with WebP fallback; keep both when adding assets under `public/assets/`. Images inside a post go next to its `index.mdx` and Astro optimises them.
- Code comments are short, lowercase, and explain intent (match the existing style). Copy in the UI is lowercase and informal.
- `_drafts/` is git-ignored and never deployed. `.vercelignore` also excludes `README.md` and `assets/readme/` (README art, not part of the site).

## Localhost-only dev tooling (untracked)

`main.js` ends with an `import.meta.env.DEV` block that loads `js/agentation-dev.js` (Agentation annotation toolbar, React from esm.sh, expects an endpoint on `localhost:4747`) and `js/night-prototype/index.js` (throwaway night-mode variants, `?night=A…E`, untracked; see its `PLAN.md`) through `import.meta.glob`. Never use a plain `import()` for an untracked file: Vite resolves it at build time and the Vercel build fails. Don't make the shipped site depend on either.
