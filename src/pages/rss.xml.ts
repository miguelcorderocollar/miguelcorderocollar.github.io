import type { APIRoute } from 'astro';
import rss from '@astrojs/rss';
import { getPublishedPosts } from '../lib/blog';

const site = 'https://miguelcorderocollar.com';

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();

  return rss({
    title: 'Miguel Cordero Collar | Blog',
    description: 'Writing about tools, projects, and ideas.',
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.published,
      link: `/blog/${post.data.slug}/`,
    })),
  });
};
