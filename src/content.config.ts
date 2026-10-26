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
    link: z.url().optional(),
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
  }),
});

export const collections = { work, blog };
