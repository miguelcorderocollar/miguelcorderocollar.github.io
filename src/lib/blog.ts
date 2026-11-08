import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

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
    .filter(({ data }) => !data.draft && data.published.getTime() <= now.getTime())
    .sort((a, b) => {
      const byDate = b.data.published.getTime() - a.data.published.getTime();
      return byDate || a.data.slug.localeCompare(b.data.slug);
    });
}

export function formatBlogDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
