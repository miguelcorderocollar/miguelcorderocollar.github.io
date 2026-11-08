import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/blog';
export const GET: APIRoute = async ({site}) => {
  const pages = ['/', '/projects/', '/people/', '/quotes/', '/trends/', '/brand/', '/shader/', '/blog/'];
  const posts = await getPublishedPosts();
  const entries = [
    ...pages.map(path => `<url><loc>${new URL(path, site)}</loc></url>`),
    ...posts.map(post => `<url><loc>${new URL(`/blog/${post.data.slug}/`, site)}</loc><lastmod>${post.data.published.toISOString().slice(0, 10)}</lastmod></url>`),
  ];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>\n`, {headers: {'Content-Type': 'application/xml; charset=utf-8'}});
};
