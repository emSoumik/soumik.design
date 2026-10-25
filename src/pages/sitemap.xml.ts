// /sitemap.xml, built from the pages and every published case study and post, so new writing gets found on its own
import type { APIRoute } from 'astro';
import { published, iso } from '../lib/content';

export const GET: APIRoute = async ({ site }) => {
  const [work, blog] = await Promise.all([published('work'), published('blog')]);
  const urls: [string, Date?][] = [
    ['/'],
    // a list only counts once there's something in it
    ...(work.length ? [['/work/', work[0].data.date] as [string, Date]] : []),
    ...work.map((e): [string, Date] => [`/work/${e.id}/`, e.data.date]),
    ...(blog.length ? [['/blog/', blog[0].data.date] as [string, Date]] : []),
    ...blog.map((e): [string, Date] => [`/blog/${e.id}/`, e.data.updated ?? e.data.date]),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([path, date]) => `  <url><loc>${new URL(path, site)}</loc>${date ? `<lastmod>${iso(date)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
