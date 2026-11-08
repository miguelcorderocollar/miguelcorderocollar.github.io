import type { APIRoute } from 'astro';
import rss from '@astrojs/rss';
import { getPublishedPosts, modifiedDate } from '../lib/blog';
import { BLOG_DESCRIPTION, SITE, topics } from '../lib/seo';

const AUTHOR = 'Miguel Cordero Collar';

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  // Deterministic: the newest article change, not the time of the build.
  const lastBuild = posts.map(modifiedDate).sort((a, b) => b.getTime() - a.getTime())[0];

  return rss({
    title: `${AUTHOR} | Blog`,
    description: BLOG_DESCRIPTION,
    site: SITE,
    xmlns: { atom: 'http://www.w3.org/2005/Atom', dc: 'http://purl.org/dc/elements/1.1/' },
    customData: [
      '<language>en</language>',
      `<atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />`,
      lastBuild ? `<lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>` : '',
    ].join(''),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.published,
      link: `/blog/${post.data.slug}/`,
      categories: topics(post),
      customData: `<dc:creator>${AUTHOR}</dc:creator>`,
    })),
  });
};
