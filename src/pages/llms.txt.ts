import type { APIRoute } from 'astro';
import base from '../data/llms.txt?raw';
import { getPublishedPosts } from '../lib/blog';
import { BLOG_DESCRIPTION, postSourceUrl, postUrl } from '../lib/seo';

// The static parts live in src/data/llms.txt. The article list is generated so it can never
// drift from what is actually published (drafts and future-dated posts are excluded).
export const GET: APIRoute = async ({ site }) => {
  const posts = await getPublishedPosts();
  const origin = site!.origin;
  const articles = posts.map(
    (post) => `- [${post.data.title}](${postUrl(post)}): ${post.data.description} [Markdown](${postSourceUrl(post)})`,
  );
  const blog = [
    `- [Blog](${origin}/blog/): ${BLOG_DESCRIPTION} Every published article links to its raw source.`,
    `- [Blog RSS](${origin}/rss.xml): Published articles only.`,
    ...articles,
  ].join('\n');
  return new Response(base.replace('{{BLOG}}', blog), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
