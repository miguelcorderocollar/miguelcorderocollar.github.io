# Performance

How the site stays fast, and what to do when adding to it.

## Images

- Large rasters are delivered as **AVIF** (primary) with a **WebP** fallback inside a `<picture>`. The PNG/JPEG master stays in the repository for tooling and downloads.
- **Never resample a finished halftone.** Resizing the dot grid creates moiré. Only the codec changes, never the pixel dimensions.
- Quality: AVIF **60**, WebP **75**. At AVIF 50 and below the dot grid starts to smear, so 60 is the floor. Both are set in `scripts/image_variants.py`.
- People portraits: `python3 scripts/build_people_portraits.py` renders a lossless master per person and writes both formats. The data in `people/people-data.json` keeps the `.webp` path; the page derives the `.avif` path from it.
- Other images (homepage hero, brand portrait preview): add the master to `MASTERS` in `scripts/build_site_images.py` and run it.
- Below-the-fold images use `loading="lazy"` and `decoding="async"`. The hero uses `fetchpriority="high"`. Every `<img>` has `width` and `height`.
- People portraits fade in once decoded (`revealWhenLoaded` in `public/people/people.js`, styles in `public/collections.css`). Cached images never go transparent, and reduced motion shortens the fade to 80ms.

## Fonts

- JetBrains Mono ships as WOFF2: a Latin subset per weight (about 22 KB) and a full font that downloads only if a character outside the subset appears. The old 270 KB TTFs remain for the CV and social-image scripts.
- The Medium and ExtraBold Latin files are preloaded in `SiteLayout.astro`. `font-display: swap`.
- The `@font-face` rules live in the vendored `public/assets/personal-style/personal-style.css`. Port this change to the maintained `miguel-personal-style` checkout so the next sync does not undo it.
- A new font version needs a new filename, because font files are cached for a year.

## Caching (`vercel.json`)

| Path | `Cache-Control` |
| --- | --- |
| HTML | Vercel default: always revalidated |
| `/_astro/*`, `*.woff2` | 1 year, immutable |
| `/images/*`, `/brand/assets/*` | 1 day, then stale-while-revalidate for 7 days |
| `*.css`, `*.js` | 1 hour, then stale-while-revalidate for 1 day |
| `*-data.json` | 5 minutes, then stale-while-revalidate for 1 day |

The collection pages fetch their JSON with the browser's normal HTTP cache, not `no-store`.

## Navigation

Astro prefetches a link on hover or focus only when it has `data-astro-prefetch`. It is set on the header navigation, the homepage collection links and blog titles. Do not switch on `prefetchAll`: `/brand/` links to multi-megabyte downloads.

## Checking a change

Compare transfer per page with a cold cache before and after (DevTools Network panel, cache disabled). Run `npm run check`, `npm test` and `npx playwright test`.

## Measured result and next step

A cold-cache benchmark in November 2026 (Chromium, 1280px, 7 runs per page) compared the live GitHub Pages site with the optimized build on a Vercel preview. Averaged over six pages, the Vercel build transferred 385 KB against 994 KB, with Largest Contentful Paint at 1033 ms against 1597 ms. First Contentful Paint was about 180 ms slower (849 ms against 669 ms). That gap comes from the network, not the markup: Vercel's edge was about 20 ms further away per request from the test machine, and with many parallel requests some small stylesheets took two round trips. Re-measure once the production domain is on Vercel. The next lever is bundling the shared stylesheets (`reset`, `personal-style`, `motion`, `homepage`, `collections`, `site`) into one file to cut render-blocking requests. Keep their cascade order and the vendored-asset sync rule in mind.
