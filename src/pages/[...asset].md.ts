import type { APIRoute } from 'astro';
import { representations } from '../lib/representations';
export function getStaticPaths() {
  return [...representations].filter(([path]) => path.endsWith('.md')).map(([path, representation]) => ({params: {asset: path.slice(0, -3)}, props: representation}));
}
export const GET: APIRoute = ({props}) => new Response(props.body, {headers: {'Content-Type': 'text/markdown; charset=utf-8'}});
