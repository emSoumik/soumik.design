// what a case study's page hands to Base: its entry and its link preview. shared by [slug].astro (the ones written in
// mdx) and the pages built by hand, which each have their own file so a page ships only its own css
import { getImage } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import { published } from '../../lib/content';

// built by hand: projects/<id>.astro renders these, not [slug].astro
export const HAND_BUILT = ['whyclub', 'vayu', 'font-preview'];

export async function caseStudy(id: string) {
  const entry = (await published('work')).find((e) => e.id === id);
  // an unpublished one has no page in [slug].astro either; a page file of its own can't quietly skip itself
  if (!entry) throw new Error(`src/pages/projects/${id}.astro: no published case study called "${id}" in src/content/work`);
  return { entry, data: entry.data, card: await cardOf(entry) };
}

// link previews want a png: some scrapers won't show webp or avif
export async function cardOf(entry: CollectionEntry<'work'>) {
  const { data } = entry;
  const cover = data.cover && await getImage({ src: data.cover, format: 'png', width: 1200 });
  return cover && { src: cover.src, width: cover.attributes.width as number, height: cover.attributes.height as number, alt: data.coverAlt };
}
