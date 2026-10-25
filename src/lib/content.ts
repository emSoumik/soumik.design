import { getCollection } from 'astro:content';

// drafts show in dev and on vercel preview deploys, so a case study can be read on the PR first. everywhere else they're left out,
// so a production build can never publish one by accident. DRAFTS=1 npm run build shows them in a local build too
export const showDrafts = import.meta.env.DEV || process.env.VERCEL_ENV === 'preview' || process.env.DRAFTS === '1';

export async function published<C extends 'work' | 'blog'>(collection: C) {
  const entries = await getCollection(collection, (e) => showDrafts || !e.data.draft);
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const day = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const iso = (d: Date) => d.toISOString().slice(0, 10);
