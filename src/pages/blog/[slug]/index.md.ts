import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublishedPosts, type BlogPost } from '../../../lib/blog';

interface Props {
  post: BlogPost;
}

export const getStaticPaths: GetStaticPaths = async () =>
  (await getPublishedPosts()).map((post) => ({
    params: { slug: post.data.slug },
    props: { post },
  }));

export const GET: APIRoute = ({ props }) => {
  const { post } = props as Props;
  const { data } = post;
  const source = [
    '---',
    `title: ${JSON.stringify(data.title)}`,
    `description: ${JSON.stringify(data.description)}`,
    `published: ${data.published.toISOString().slice(0, 10)}`,
    `tags: ${JSON.stringify(data.tags)}`,
    `draft: ${data.draft}`,
    `slug: ${data.slug}`,
    '---',
    '',
    post.body?.trimStart() ?? '',
  ].join('\n');

  return new Response(source, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
