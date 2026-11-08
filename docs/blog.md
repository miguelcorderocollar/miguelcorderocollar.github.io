# Blog

Blog posts live in `src/content/blog/` as Markdown files. Astro validates every post against the schema in `src/content.config.ts`.

Each post must provide a stable, lowercase, hyphenated `slug`. The same slug cannot be used by another collection entry, including a draft. The required `published` value is a date or timestamp; posts with a publication time in the future are withheld until that time. Set `draft: true` to keep a post out of public output. `tags` may be omitted and defaults to an empty list.

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

`sample-post.md` is clearly labelled demonstration content covering headings, lists, code, an existing site image, a table, a link, and an unattributed blockquote. `draft-fixture.md` and `future-fixture.md` are fixtures that must stay unpublished.

Run `npm run dev` to preview edits. Run `npm test` before publishing. Changing a title or filename does not change its URL when the explicit `slug` stays the same. Changing an established slug requires a redirect. A scheduled date is evaluated at build time; publish with a new deployment after that date. Dates without times are interpreted as midnight UTC.

Keep articles in `src/content/blog`, outside `public`. The Markdown endpoint emits only published articles. Do not copy source articles into `public`, which would bypass draft filtering.

Use root-relative links for site pages and images, such as `/projects/` and `/images/bg/mountains-after-hours.png`. This keeps links correct in both the article and its raw Markdown representation. New photographic assets follow the site's shader and provenance workflow.
