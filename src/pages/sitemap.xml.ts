import type { APIRoute } from 'astro';
import { getPublishedPosts, modifiedDate } from '../lib/blog';

const day = (date: Date) => date.toISOString().slice(0, 10);

// `lastmod` is only emitted where it is verifiable: for articles (their publication or
// explicit `updated` date) and for /blog/ (the newest article change). Other pages have no
// reliable modification date, and Google ignores a `lastmod` that is not consistently accurate.
export const GET: APIRoute = async ({ site }) => {
  const pages = ['/', '/projects/', '/people/', '/quotes/', '/trends/', '/brand/', '/shader/'];
  const posts = await getPublishedPosts();
  const newest = posts.map(modifiedDate).sort((a, b) => b.getTime() - a.getTime())[0];
  const url = (path: string, lastmod?: Date) =>
    `<url><loc>${new URL(path, site)}</loc>${lastmod ? `<lastmod>${day(lastmod)}</lastmod>` : ''}</url>`;
  const entries = [
    ...pages.map((path) => url(path)),
    url('/blog/', newest),
    ...posts.map((post) => url(`/blog/${post.data.slug}/`, modifiedDate(post))),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
