# Miguel Cordero Collar

Personal website, portfolio and Markdown blog, built with Astro. Pages are generated as static HTML. Existing browser interactions use vanilla JavaScript.

## Local development

Use Node.js 22.23.4 or newer. Node.js 24 LTS is suitable for a future Vercel project.

```sh
npm ci
npm run dev
```

Open <http://localhost:8000>. Astro reloads changes automatically. Stop the dev server before running `npm run preview`, which uses the same port.

```sh
npm run check
npm test
npm run preview
```

`check` validates Astro/TypeScript, People summaries and project/profile alignment. `test` builds the site and checks generated pages, links, source representations, publishing exclusions and static assets. `preview` serves the production output in `dist/`.

## Sources and output

- `src/pages/` contains every HTML route and the RSS, sitemap, Markdown and JSON endpoints.
- `src/layouts/` and `src/components/` contain the shared shell and collection views.
- `src/content/blog/` contains Markdown and optional MDX articles. See [blog authoring](docs/blog.md).
- `people/`, `quotes/`, `trends/` and `projects/` retain the canonical collection JSON and image recipes. Astro reads these files during builds.
- `documents/Miguel-Cordero-Profile.md` is the full profile mirror; `documents/Miguel-Cordero-CV.md` is the curated CV source.
- `public/` contains styles, existing vanilla browser scripts, fonts, approved images, PDFs and downloads. Files retain their existing public URLs. Only this directory and generated Astro routes are published.
- `dist/` is generated and ignored. Never edit it directly.

Changes to collection JSON automatically update static HTML and Markdown/JSON representations on the next build. Projects use one component and one JSON source for the homepage selection and full collection. After changing project data, run `python3 scripts/build_projects.py` to update the selected-project section in the full Markdown profile.

Keep homepage profile facts aligned with the full Markdown profile. The curated CV remains independent. Its PDF workflow is documented in [docs/cv.md](docs/cv.md). Image and PDF regeneration are maintenance tasks, not prerequisites for ordinary deployment. Private source photos stay outside `public/`.

`python3 scripts/build_agent_content.py` remains a compatibility command and now runs the Astro build. It no longer rewrites Markdown files in the source tree.

## Hosting migration

This branch is for local review. It does not change DNS, disable GitHub Pages, or create a Vercel project. The production branch is currently `master`.

After local approval, import this repository into Vercel with the Astro preset, build command `npm run build`, output directory `dist`, and Node.js 24. `vercel.json` records the static build configuration. First deploy this branch as a preview and verify page paths, Markdown/JSON content types, downloads, HTTPS and domain redirects. Keep the current host until that preview is approved and the domain cutover is verified. See [docs/astro-migration.md](docs/astro-migration.md).

For repeatable HTTP checks against a running production preview:

```sh
npm run preview -- --port 8001
node scripts/verify_http.mjs http://127.0.0.1:8001
python3 scripts/validate_agent_content.py http://127.0.0.1:8001
```

The HTTP checker can also inspect the eventual Vercel preview URL.


## Readability checks

The site uses a 17px default reading size, 17–18px article prose, at least 18px quotes, and approximately 14px supporting text at the browser's default 16px root size. The sizes use `rem` so a reader's default font preference can enlarge them. Large headings retain their visual hierarchy.

With `npm run dev` running, use `npm run test:browser` for automated font-size, page-overflow, component keyboard/reset and no-JavaScript checks at widths of 320, 390, 768 and 1440 CSS pixels. Chromium defaults to `/usr/bin/chromium`; set `CHROMIUM_PATH` for another installed executable and `SITE_TEST_URL` for another preview. The suite also checks a doubled root font size. These project rules catch regressions; they are not a complete WCAG certification or a measurement of perceived physical text size on every display.
