# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Portfolio site for soumik.design: a white page with a pixel-art garden, then the work below. Astro (static output) with MDX for case studies and the blog. The home page is hand-written HTML/CSS plus vanilla ES modules in `js/`, which Astro bundles as one client script; **no UI framework, no tests, no linter.** Every push to `main` builds on Vercel and deploys.

`README.md` has the folder map and a "Common edits" table (which constant to change for flower size, garden capacity, butterfly count, copy, etc.). Read it before hunting for a knob.

## Run

```bash
npm run dev      # http://localhost:4321, drafts visible
npm run build    # the real site in dist/; must pass before pushing
```

Verify changes in a browser. Drafts ship to production with a "draft" label (`src/lib/content.ts`).

Query flags: `?garden=ink` loads the old watercolour garden (`js/garden/watercolour.js`) instead of the pixel one. `#about` opens the About card on load.

## Architecture

- `src/pages/index.astro` holds the home page's markup, **all its CSS** (an inline `<style is:inline>`, deliberately unprocessed), and the SEO/social/JSON-LD tags. The reading pages (`/projects`, `/blog`, `/vault`) use `src/layouts/Base.astro` and `src/styles/site.css`. `/work` redirects to `/projects` in `vercel.json`; the content collection is still called `work`. Companion modules (`bee.js`, `butterflies.js`) inject their own CSS at runtime via `css()` from `content.js`.
- `js/main.js` is the home page's only entry point (`<script src="../../js/main.js">` in `index.astro`, bundled by Vite). It builds the garden, bee, butterflies and About card, and wires sound/mute, the hint line, the clear button and planting. Modules don't import each other sideways; `main.js` passes them shared callbacks and a `spots()` function that exposes the garden's live flowers.
- **Garden → companions contract:** `pixels.js` exposes `plant / patches / flowerAt / clear / destroy` and `onStitch / onBloom / onMorph / onSparkle / onGrown` callbacks. `patches()` is deliberately shaped like the watercolour garden's patches, so the bee and butterflies work with either implementation. Keep that shape if you change either garden.
- `js/garden/flora.js` holds only sprite data (pixel-grid flower families, each with `forms` for tap-to-morph, plus butterfly sprites). `pixels.js` owns placement, spacing (`REACH/CLOSE/APART/MEMORY`), growth, and the self-clearing loop (`FULL`: oldest flowers unpick once the garden is full). The canvas draws in stepped frames and stops rendering entirely when idle, so keep new animation inside that idle-stop model.
- `js/feel.js` is the sound/haptics singleton. All audio is synthesized with Web Audio (D major pentatonic, so any tap sequence sounds musical); there are no audio files. Mute state is persisted.
- `js/content.js` is the shared copy/links (email, socials, project links, the bee's `FACTS`) plus the `css()` injector.
- **Lazy loading:** everything below the fold is dynamic-imported. `main.js` mounts `work/work.js` (the projects section: WhyClub, Vayu, Font Preview) via IntersectionObserver (or after idle on load), and its videos load near the viewport. Don't add static imports of work modules to `main.js`. The section's colours are `--wk-*` tokens; night mode sets `data-theme="dark"` on `<html>` and the dark override turns it pitch black.
- **The vault** (`src/pages/vault/index.astro`) renders the wall in `src/pages/vault/_prototype/` (`VaultLab.astro` markup, `vault.ts` behaviour, `pieces.ts` data). Shaders run scenes from `js/work/reel.js`; the dock piece reuses `DockLive.astro` from `src/pages/projects/_prototype-whyclub/`. In dev, `components/proto/` adds a bar to switch how cards open and arrive; production uses the picks set at the top of `VaultLab.astro`.
- **WhyClub's case study** is the hand-built page in `src/pages/projects/_prototype-whyclub/` (`Prototype.astro` and friends), mounted by `[slug].astro`. The `/lab/*` pages stay dev-only.
- **Reading pages' nav** is `src/components/ReadDock.astro`: the home dock at the bottom (back, about, sections); it tucks into a bud while you read down.
- **Hand-built project pages:** `[slug].astro` renders `src/components/vayu/Vayu.astro` and `src/components/fontpreview/FontPreview.astro` instead of their MDX (the MDX body is only a fallback; the frontmatter still drives the title, meta and listing). Both use `src/components/project/project.css` (a text column plus grey "stages" with clickable steps and a caption) and `project/Player.astro` (a film player with chapters and keyboard controls). Vayu's watch screens are HTML/CSS in `vayu/Watch.astro`, not images, and its map and chart are inline SVG; don't swap film stills back in. The Font Preview demo (`fontpreview/demo.ts`) loads its fonts from Google Fonts when it nears the screen.
- The garden → work hand-off is a CSS scroll-driven animation in `index.astro`, not JS.
- **Page transitions** (`src/components/transitions/PageTransitions.astro`, in the head of `Base.astro` and `index.astro`): cross-document view transitions, set up in inline `pageswap`/`pagereveal` listeners that must run before first paint. Into and out of the blog the garden's seam stitches the page in (or unpicks it going back); a case study opens with its frontmatter `transition` (`window`, `wake`, `type`) out of the element marked `data-pt-src="<slug>"`; anything else gets a quiet fade. Keep new motion there to transform, opacity and clip-path, and give it a reduced-motion path.
- **Case studies and posts:** `src/content/work/<slug>/index.mdx` and `src/content/blog/<slug>/index.mdx`, typed in `src/content.config.ts`. `draft: true` keeps an entry published but labelled "draft" (`src/lib/content.ts`). MDX gets `Figure`, `Video`, `Screens`, `Phone`, `Phones` and `DropPass` (`src/components/mdx/`) without imports. `kind: concept` marks a concept, `kind: open source` a tool, rather than a case study. The home page passes published case-study ids to `work.js` via `data-cases` on `#projects`.
- Static files live in `public/` (`public/assets/…` keeps the old `/assets/…` URLs). Modules reference assets by root path (`/assets/…`), never relative to `import.meta.url`, because bundled chunks live in `/_astro/`.
- Mochi the cat (`companions/mochi.js`) is switched off with `const MOCHI = false` in `main.js`. When off, `main.js` substitutes a no-op stand-in object, so any new call on `mochi` must also be added to that stub.

## Conventions

- Every animation needs a `prefers-reduced-motion` path (flowers appear without stitching, butterflies sit still, scroll effects off). `main.js` reads `reduced` and `touch` once at load.
- Tap targets ≥ 44px. The garden canvas is hidden from assistive tech; real content stays in plain HTML.
- Images ship as AVIF with WebP fallback; keep both when adding assets under `public/assets/`. Images inside a post go next to its `index.mdx` and Astro optimises them.
- Code comments are short, lowercase, and explain intent (match the existing style). Copy in the UI is lowercase and informal.
- `_drafts/` is git-ignored and never deployed. `.vercelignore` also excludes `README.md` and `assets/readme/` (README art, not part of the site).

## Localhost-only dev tooling (untracked)

`main.js` ends with an `import.meta.env.DEV` block that loads `js/agentation-dev.js` (Agentation annotation toolbar, React from esm.sh, expects an endpoint on `localhost:4747`) and `js/night-prototype/index.js` (the night garden prototype, untracked; see its `PLAN.md`) through `import.meta.glob`. Never use a plain `import()` for an untracked file: Vite resolves it at build time and the Vercel build fails. Don't make the shipped site depend on either.
