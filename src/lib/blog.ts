import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

/** Sample posts exist to exercise the blog's formats. They carry the `sample` tag. */
export const isSample = (post: BlogPost) => post.data.tags.includes('sample');

/**
 * Sample posts are visible in local development and on Vercel preview/development
 * deployments, and hidden everywhere else (production, GitHub Pages, a plain
 * `npm run build`). `BLOG_SAMPLES=1` forces them on, which the test suite uses.
 */
/** Drafts (except test fixtures) are previewable in local development only, never in a build. */
const isFixture = (post: BlogPost) => post.data.tags.includes('fixture');
const isVisibleDraft = (post: BlogPost) => import.meta.env.DEV && post.data.draft && !isFixture(post);

export function showSamples(): boolean {
  const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
  return import.meta.env.DEV || env.VERCEL_ENV === 'preview' || env.VERCEL_ENV === 'development' || env.BLOG_SAMPLES === '1';
}

/**
 * Return posts that are eligible for public routes and feeds.
 * Slug collisions are checked across the full collection, including drafts,
 * so a future post cannot silently take over an existing URL.
 */
export async function getPublishedPosts(now = new Date()): Promise<BlogPost[]> {
  const entries = await getCollection('blog');
  const slugs = new Map<string, string>();

  for (const entry of entries) {
    const existingId = slugs.get(entry.data.slug);
    if (existingId) {
      throw new Error(
        `Duplicate blog slug "${entry.data.slug}" in entries "${existingId}" and "${entry.id}".`,
      );
    }
    slugs.set(entry.data.slug, entry.id);
  }

  return entries
    .filter((post) => isVisibleDraft(post) || (!post.data.draft && post.data.published.getTime() <= now.getTime()))
    .filter((post) => showSamples() || !isSample(post))
    .sort((a, b) => {
      const byDate = b.data.published.getTime() - a.data.published.getTime();
      return byDate || a.data.slug.localeCompare(b.data.slug);
    });
}

/**
 * The blog only appears on the site (navigation, homepage, feed, sitemap, llms.txt)
 * once at least one article is visible in the current environment.
 */
export async function isBlogLive(): Promise<boolean> {
  return (await getPublishedPosts()).length > 0;
}

export function formatBlogDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Last material change: the explicit `updated` date, otherwise the publication date. */
export function modifiedDate(post: BlogPost): Date {
  return post.data.updated ?? post.data.published;
}

export function blogSourceExtension(post: BlogPost): 'md' | 'mdx' {
  return post.id.endsWith('.mdx') ? 'mdx' : 'md';
}

export function blogSource(post: BlogPost): string {
  const { data } = post;
  return [
    '---',
    `title: ${JSON.stringify(data.title)}`,
    `description: ${JSON.stringify(data.description)}`,
    `published: ${data.published.toISOString()}`,
    ...(data.updated ? [`updated: ${data.updated.toISOString()}`] : []),
    `tags: ${JSON.stringify(data.tags)}`,
    `draft: ${data.draft}`,
    `slug: ${data.slug}`,
    '---', '', post.body?.trimStart() ?? '',
  ].join('\n');
}
