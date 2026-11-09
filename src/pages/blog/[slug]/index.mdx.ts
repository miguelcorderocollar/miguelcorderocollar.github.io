import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublishedPosts, blogSource, blogSourceExtension } from '../../../lib/blog';
export const getStaticPaths: GetStaticPaths = async () =>
  (await getPublishedPosts()).filter(post => blogSourceExtension(post) === 'mdx').map(post => ({params: {slug: post.data.slug}, props: {post}}));
export const GET: APIRoute = ({props}) => new Response(blogSource(props.post), {
  headers: {'Content-Type': 'text/plain; charset=utf-8'},
});
