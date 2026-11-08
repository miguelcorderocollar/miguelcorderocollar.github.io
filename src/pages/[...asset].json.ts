import type { APIRoute } from 'astro';
import { representations } from '../lib/representations';
export function getStaticPaths() {
  return [...representations].filter(([path]) => path.endsWith('.json')).map(([path, representation]) => ({params: {asset: path.slice(0, -5)}, props: representation}));
}
export const GET: APIRoute = ({props}) => new Response(props.body, {headers: {'Content-Type': 'application/json; charset=utf-8'}});
