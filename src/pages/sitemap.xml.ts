import type { APIRoute } from 'astro';
import { getPublishedPosts, modifiedDate } from '../lib/blog';
import people from '../../people/people-data.json';
import quotes from '../../quotes/quotes-data.json';
import trends from '../../trends/trends-data.json';
import projects from '../../projects/projects.json';
import brand from '../../brand/settings.json';
import profile from '../data/profile-schema.json';

const day = (date: Date) => date.toISOString().slice(0, 10);

// `lastmod` is only emitted where it is verifiable: for articles (their publication or
// explicit `updated` date), for /blog/ (the newest article change), and for pages whose source
// data records its own date (profile schema, People, Quotes, Trends, Projects review, Brand
// approval). The Shader page has no recorded date, so it carries none. Google ignores a `lastmod`
// that is not consistently accurate.
const pageDates: Record<string, string | undefined> = {
  '/': profile[0].dateModified,
  '/projects/': projects.reviewedOn,
  '/people/': people.updated,
  '/quotes/': quotes.updated,
  '/trends/': trends.retrievedAt,
  '/brand/': brand.approvedOn,
};
export const GET: APIRoute = async ({ site }) => {
  const pages = ['/', '/projects/', '/people/', '/quotes/', '/trends/', '/brand/'];
  // /shader/ is an internal image tool: noindex and left out of the sitemap.
  const pageLastmod = (path: string) => {
    const value = pageDates[path];
    return value ? new Date(value) : undefined;
  };
  const posts = await getPublishedPosts();
  const newest = posts.map(modifiedDate).sort((a, b) => b.getTime() - a.getTime())[0];
  // No /blog/ entry until the blog has an article visible in this environment.
  const url = (path: string, lastmod?: Date) =>
    `<url><loc>${new URL(path, site)}</loc>${lastmod ? `<lastmod>${day(lastmod)}</lastmod>` : ''}</url>`;
  const entries = [
    ...pages.map((path) => url(path, pageLastmod(path))),
    ...(posts.length ? [url('/blog/', newest)] : []),
    ...posts.map((post) => url(`/blog/${post.data.slug}/`, modifiedDate(post))),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
