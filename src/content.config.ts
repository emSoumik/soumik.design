// The case studies and the blog. Each entry is a folder: index.mdx plus its images, side by side.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const work = defineCollection({
  loader: glob({ pattern: '*/index.mdx', base: './src/content/work', generateId: ({ entry }) => entry.split('/')[0] }),
  schema: ({ image }) => z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    role: z.string(),
    tags: z.array(z.string()).default([]),
    cover: image(),
    coverAlt: z.string(),
    // phone screens to stand in front of the cover (paths without extension, see Phone.astro)
    coverPhones: z.array(z.string()).max(2).optional(),
    link: z.url().optional(),
    // what the eyebrow calls it: most are case studies, an idea that never shipped is a concept, a tool anyone can use is open source
    kind: z.enum(['case study', 'concept', 'open source']).default('case study'),
    // how the page opens from the home page and the projects list (components/transitions): out of its live product
    // like an app (window), a watch screen waking (wake), or a quick look zoom with the title flicking through faces (type).
    // leave it out for the quiet fade
    transition: z.enum(['window', 'wake', 'type']).optional(),
    // drafts show in dev and on preview deploys, never on soumik.design
    draft: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '*/index.mdx', base: './src/content/blog', generateId: ({ entry }) => entry.split('/')[0] }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    cover: image().optional(),
    coverAlt: z.string().optional(),
    draft: z.boolean().default(false),
    // the live header made of the garden's own stitches (see components/blog). a post with a cover shows the cover
    header: z.enum(['garden', 'xray', 'scale']).optional(),
    // one word of the title to set in italic, like the wordmark
    accent: z.string().optional(),
    // the references this post cites, in order, by id (see components/blog/refs.ts). <Ref id="…"> numbers itself from this
    refs: z.array(z.string()).default([]),
  }),
});

export const collections = { work, blog };
