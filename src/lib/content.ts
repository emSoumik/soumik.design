import { getCollection } from 'astro:content';

// drafts are published too, everywhere: they keep their "draft" label on the page, so a reader knows it isn't finished
export const showDrafts = true;

export async function published<C extends 'work' | 'blog'>(collection: C) {
  const entries = await getCollection(collection, (e) => showDrafts || !e.data.draft);
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const day = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const iso = (d: Date) => d.toISOString().slice(0, 10);
