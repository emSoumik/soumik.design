import { getCollection } from 'astro:content';

// drafts stay off soumik.design only. dev, local builds and vercel preview deploys show them, so a case study can be read on the PR first
export const showDrafts = process.env.VERCEL_ENV !== 'production';

export async function published<C extends 'work' | 'blog'>(collection: C) {
  const entries = await getCollection(collection, (e) => showDrafts || !e.data.draft);
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const day = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const iso = (d: Date) => d.toISOString().slice(0, 10);
