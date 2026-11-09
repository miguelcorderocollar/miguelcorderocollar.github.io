# Blog

Blog posts live in `src/content/blog/` as Markdown files. Astro validates every post against the schema in `src/content.config.ts`.

Each post must provide a stable, lowercase, hyphenated `slug`. The same slug cannot be used by another collection entry, including a draft. The required `published` value is a date or timestamp; posts with a publication time in the future are withheld until that time. Set `draft: true` to keep a post out of public output. Drafts are still shown, with a Draft label, in `npm run dev` so they can be reviewed locally; drafts tagged `fixture` stay hidden there too. `tags` may be omitted and defaults to an empty list.

```yaml
---
title: "A post title"
description: A concise summary for the listing, metadata, and feed.
published: 2026-11-08
tags:
  - tooling
draft: false
slug: a-post-title
---
```

Eligible posts appear at `/blog/`, with individual pages at `/blog/<slug>/`. Each page also exposes its Markdown source at `/blog/<slug>/index.md`. `/rss.xml` includes the same published posts. Only eligible posts produce static page and raw-source routes, and `/sitemap.xml` uses the same published-post selection. Drafts and future posts produce no public files.

`sample-post.mdx` is a labelled content and interaction specimen. `sample-plain-markdown.md` is a short labelled plain-Markdown specimen that keeps the list and the older/newer article links exercised. Posts tagged `sample` show a Sample label instead of a `#sample` tag; they are only visible in development and preview deployments, never in production. `draft-fixture.md` and `future-fixture.md` are fixtures that must stay unpublished.

Run `npm run dev` to preview edits. Run `npm test` before publishing. Changing a title or filename does not change its URL when the explicit `slug` stays the same. Changing an established slug requires a redirect. A scheduled date is evaluated at build time; publish with a new deployment after that date. Dates without times are interpreted as midnight UTC.

Keep articles in `src/content/blog`, outside `public`. The Markdown endpoint emits only published articles. Do not copy source articles into `public`, which would bypass draft filtering.

Use root-relative links for site pages and images, such as `/projects/` and `/images/bg/mountains-after-hours.png`. This keeps links correct in both the article and its raw Markdown representation. New photographic assets follow the site's shader and provenance workflow.

## When the blog is visible

The blog is hidden until there is a real article, and sample posts only exist outside production.

| Environment | Sample posts (`sample` tag) | Real posts |
| --- | --- | --- |
| `npm run dev` (local development) | shown | shown |
| Vercel preview and development deployments (`VERCEL_ENV`) | shown | shown |
| Vercel production, GitHub Pages, a plain `npm run build` | **hidden** | shown |

`BLOG_SAMPLES=1` forces the samples on (`npm test` sets it so the fixtures are exercised).

While no article is visible, the blog does not exist: no `/blog/` or `/rss.xml` file, no "Blog" link in the header or homepage tile (the homepage grid returns to three tiles), no RSS autodiscovery link, no sitemap entry, no `llms.txt` lines, and no "Blog" section in `/index.md` or the profile Markdown. The first non-sample, published, non-draft article switches all of that on at once. Keep the samples while testing; they are never public in production.

## Search and agent discovery

Everything below is derived from the published-post selection and the frontmatter; there is nothing to maintain by hand.

- **`updated`** (optional): set it only when an article is materially revised. It becomes `dateModified` in the JSON-LD, `article:modified_time`, the article's sitemap `lastmod`, and the feed's `lastBuildDate`. It cannot be earlier than `published` (the build fails). Without it, the publication date is used. Do not bump it for typo fixes: Google only trusts `lastmod` when it is consistently accurate, which is why `lastmod` outside `/blog/` comes only from dates the source data records (profile schema, People, Quotes, Trends, Projects review, Brand approval) and the Shader page carries none.
- **Structured data** (`src/lib/seo.ts`): each article emits `BlogPosting` (headline, description, `image`, `datePublished`, `dateModified`, `author`, `publisher`, `inLanguage`, `wordCount`, `keywords`) plus a `BreadcrumbList`. `/blog/` emits `Blog` with its `blogPost` entries. The author is the same Person as the homepage (`/#miguel-cordero-collar`), repeated inline because search engines do not resolve an `@id` defined on another page.
- **Per-page head:** canonical URL, Open Graph `article` tags (published/modified time, author, topics), a Twitter large card, and `<link rel="alternate" type="text/markdown">` pointing at `/blog/<slug>/index.md`.
- **`/sitemap.xml`**, **`/rss.xml`** (RSS 2.0 with `atom:link rel="self"`, `language`, deterministic `lastBuildDate`, stable permalink GUIDs, categories and `dc:creator`), and **`/llms.txt`** are all generated from the same posts, so a draft or future post can never leak into them. `llms.txt` lists every published article with a `.md` link; its static text lives in `src/data/llms.txt` (the `{{BLOG}}` placeholder is replaced at build time). Machine-facing links always use `.md` because static hosts serve it as `text/markdown`, while `.mdx` has no reliable MIME type.
- Articles use the site-wide 1200×630 card `/images/social/og-default.jpg` (see `docs/brand-assets.md`). Add a per-article image field if posts need their own preview.

`tests/build.test.mjs` and `tests/publishing.test.mjs` enforce all of this (valid JSON-LD that matches the visible `h1`, consistent canonical/Open Graph URLs, ISO dates, `lastmod` equal to `dateModified`, feed identity, `llms.txt` coverage, and the `updated` rules).

## Rich articles with MDX

Use `.md` for ordinary writing and `.mdx` when an article needs component imports or expressions. Both share the same collection schema, stable URLs, draft rules and feed. Astro's official MDX integration is installed. React is not installed or required for the current components.

The sample is now `src/content/blog/sample-post.mdx`. It demonstrates Markdown formatting, nested lists, task lists, footnotes, fenced code, tables, captioned images, native HTML disclosures, inline HTML, an accessible SVG diagram, an interactive Astro component, and a lazy iframe of a local tool.

```mdx
import ReadingLab from '../../components/ReadingLab.astro';

## Try a component

<ReadingLab size={18} />
```

`src/components/ReadingLab.astro` contains its own HTML, styles and small browser script. Astro includes that script only where the component is used. It uses keyboard-operable native sliders, immediate updates, a reset button and a readable fallback with disabled controls when JavaScript is unavailable. The demo stores no state and makes no network requests.

Use native HTML for figures, disclosures, audio/video elements and small diagrams. Use a component for reusable or interactive content. Use an iframe for a separate complete document, with a descriptive title, lazy loading and a normal link to open it separately. Add actual audio/video files when publishing those formats; the sample does not include fake players without media. External embeds can make requests to their provider; the current sample uses only a local iframe.

Each article has a **Copy .md** button that copies `/blog/<slug>/index.md` to the clipboard; without JavaScript it falls back to a link to that file. Published MDX source is also available at `/blog/<slug>/index.mdx`, served as plain text. The existing `index.md` URL remains a source alias for compatibility. MDX source includes imports and component syntax and requires the project to render those components; it is not a self-contained plain-Markdown export. Plain `.md` posts keep their normal `index.md` link. Draft and future sources are excluded in both formats.

MDX is executable project source, so only repository authors should supply it. It is not a parser for untrusted visitor submissions.
