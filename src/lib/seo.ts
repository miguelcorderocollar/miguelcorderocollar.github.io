import { modifiedDate, type BlogPost } from './blog';

export const SITE = 'https://miguelcorderocollar.com';
export const BLOG_DESCRIPTION = 'Notes on software, tools, and things worth understanding.';
/** Default Open Graph card, built by scripts/build_social_image.py. */
export const SOCIAL_IMAGE = {
  path: '/images/social/og-default.jpg',
  width: 1200,
  height: 630,
  alt: 'Miguel Cordero Collar, IT Innovation Project Manager at Red Bull',
};

const abs = (path: string) => new URL(path, SITE).href;

/**
 * The same Person described on the homepage (see src/data/profile-schema.json).
 * Repeated inline because search engines read each page's JSON-LD on its own and
 * do not resolve an `@id` that is only defined on another page.
 */
const author = {
  '@type': 'Person',
  '@id': abs('/#miguel-cordero-collar'),
  name: 'Miguel Cordero Collar',
  url: abs('/'),
};

const breadcrumb = (items: [name: string, path: string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name,
    item: abs(path),
  })),
});

export function postUrl(post: BlogPost) {
  return abs(`/blog/${post.data.slug}/`);
}

/**
 * Raw source URL advertised to agents. Always the `.md` file: every article has one and static
 * hosts serve it as text/markdown, whereas `.mdx` has no reliable MIME type (it can be downloaded).
 */
export function postSourceUrl(post: BlogPost) {
  return abs(`/blog/${post.data.slug}/index.md`);
}

export function wordCount(post: BlogPost) {
  return (post.body ?? '').split(/\s+/).filter(Boolean).length;
}

/** Topics for search/feeds. `sample` is an internal label, not a topic. */
export function topics(post: BlogPost) {
  return post.data.tags.filter((tag) => tag !== 'sample');
}

export function postSchema(post: BlogPost) {
  const url = postUrl(post);
  const keywords = topics(post);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        headline: post.data.title,
        description: post.data.description,
        url,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        image: [abs(SOCIAL_IMAGE.path)],
        datePublished: post.data.published.toISOString(),
        dateModified: modifiedDate(post).toISOString(),
        author,
        publisher: author,
        isPartOf: { '@type': 'Blog', '@id': abs('/blog/#blog'), url: abs('/blog/') },
        inLanguage: 'en',
        wordCount: wordCount(post),
        ...(keywords.length ? { keywords: keywords.join(', ') } : {}),
      },
      breadcrumb([['Home', '/'], ['Blog', '/blog/'], [post.data.title, `/blog/${post.data.slug}/`]]),
    ],
  };
}

export function blogSchema(posts: BlogPost[]) {
  const latest = posts[0] ? modifiedDate(posts.reduce((a, b) => (modifiedDate(b) > modifiedDate(a) ? b : a))) : undefined;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': abs('/blog/#blog'),
        url: abs('/blog/'),
        name: 'Miguel Cordero Collar | Blog',
        description: BLOG_DESCRIPTION,
        inLanguage: 'en',
        author,
        publisher: author,
        ...(latest ? { dateModified: latest.toISOString() } : {}),
        blogPost: posts.map((post) => ({
          '@type': 'BlogPosting',
          '@id': `${postUrl(post)}#article`,
          headline: post.data.title,
          url: postUrl(post),
          datePublished: post.data.published.toISOString(),
        })),
      },
      breadcrumb([['Home', '/'], ['Blog', '/blog/']]),
    ],
  };
}
