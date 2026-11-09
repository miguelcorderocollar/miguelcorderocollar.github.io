import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublishedPosts, blogSource, type BlogPost } from '../../../lib/blog';

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
  const source = blogSource(post);

  return new Response(source, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
