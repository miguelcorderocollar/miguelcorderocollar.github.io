# Astro migration

The `codex/astro-blog` branch converts the site to Astro static output. It preserves the existing URLs and personal design system. It adds `/blog/`, article pages, raw article Markdown, `/rss.xml`, and a generated sitemap. The sample article is demonstration content for local review.

## What changed

The shared layout owns page titles, descriptions, canonical URLs, stylesheet loading, skip navigation and the primary navigation. Page-specific structured data and article metadata remain in their routes. The shader playground retains its existing independent layout.

People, Quotes and Trends include their collection content in the generated HTML. Existing browser scripts add filtering, dialogs, random quotes and interactive charts. If browser enhancement fails, the initial content remains available. Projects render directly from their JSON source through a shared component.

Collection JSON stays in its existing source location. Static endpoints generate the public JSON and Markdown files, including the full profile and curated CV Markdown. The full profile mirror still needs to be kept aligned with homepage facts. The curated CV/PDF workflow is separate.

Approved static assets moved to `public/` without changing their public URLs. Private image inputs and scratch experiments remain outside the published directory. Asset maintenance scripts use the new output paths. Production builds require Node/npm, with no private photos, browser renderer or Python dependency. The optional `npm run check` command also uses Python for existing content checks.

## Local review

1. Run `npm ci`, then `npm run dev`.
2. Review the homepage, all collections, brand downloads, shader and blog at `http://localhost:8000`.
3. Check desktop and narrow layouts, keyboard navigation, reduced motion, data filters, dialogs and downloads.
4. Run `npm run check` and `npm test`.
5. Stop the dev server and run `npm run preview` to inspect the production build.

The build publishes normal files. No request-time server or Vercel adapter is required. Future-dated articles appear only after a new build following their publication date; there is no scheduler.

## Later Vercel preview

Local review must finish before deployment. Do not change the production branch or domain as part of creating a preview.

- Import the existing repository as a Vercel Astro project. Use Node.js 24, `npm run build`, and `dist`.
- Deploy the migration branch as a Preview deployment.
- Verify directory paths and legacy explicit `index.html` requests, 404 status, image/font loading, brand ZIP, PDF downloads and CV copy.
- Verify JSON, RSS, sitemap and Markdown responses and their content types. The development server's endpoint headers do not by themselves prove Vercel's static-file headers.
- Check draft and future routes return 404 and are absent from all feeds and discovery output.
- Review Hobby eligibility and usage against the site's intended personal use.

## Later production cutover

The repository currently uses `master`, even though discussion referred to main. Confirm the intended production branch at merge time.

After the preview is approved, merge into that branch, verify its Vercel deployment, attach the custom domain and use the exact DNS records Vercel supplies. Preserve unrelated records. Verify apex/www behavior, HTTPS, public assets and deep links before disabling GitHub Pages and removing stale Pages/CNAME settings.

The custom domain stays `https://miguelcorderocollar.com`. Preview builds intentionally retain this production canonical URL. Header-based `Accept: text/markdown` negotiation remains a separate hosting enhancement; explicit `.md` routes work without it.
