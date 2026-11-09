# Performance

How the site stays fast, and what to do when adding to it.

## Images

- Large rasters are delivered as **AVIF** (primary) with a **WebP** fallback inside a `<picture>`. The PNG/JPEG master stays in the repository for tooling and downloads.
- **Never resample a finished halftone.** Resizing the dot grid creates moiré. Only the codec changes, never the pixel dimensions.
- Quality: AVIF **60**, WebP **75**. At AVIF 50 and below the dot grid starts to smear, so 60 is the floor. Both are set in `scripts/image_variants.py`.
- People portraits: `python3 scripts/build_people_portraits.py` renders a lossless master per person and writes both formats. The data in `people/people-data.json` keeps the `.webp` path; the page derives the `.avif` path from it.
- Other images (homepage hero, brand portrait preview): add the master to `MASTERS` in `scripts/build_site_images.py` and run it.
- Below-the-fold images use `loading="lazy"` and `decoding="async"`. Every `<img>` has `width` and `height`.
- The hero has no `fetchpriority="high"`. Tested on Vercel, raising it made the image compete with the render-blocking CSS for the first round trip; at default priority both first paint and LCP were the same or better.
- People portraits fade in once decoded (`revealWhenLoaded` in `public/people/people.js`, styles in `public/collections.css`). Cached images never go transparent, and reduced motion shortens the fade to 80ms.

## Fonts

- JetBrains Mono ships as WOFF2: a Latin subset per weight (about 22 KB) and a full font that downloads only if a character outside the subset appears. The old 270 KB TTFs remain for the CV and social-image scripts.
- Fonts are **not** preloaded. Preloading 45 KB of fonts alongside the CSS overflowed the first TCP round trip on a new connection and delayed first paint by about 100 ms. Fonts are requested as soon as the CSS arrives, and `font-display: swap` shows text in the fallback monospace (near-identical metrics) meanwhile.
- The `@font-face` rules live in the vendored `public/assets/personal-style/personal-style.css`. Port this change to the maintained `miguel-personal-style` checkout so the next sync does not undo it.
- A new font version needs a new filename, because font files are cached for a year.

## Stylesheets

`SiteLayout.astro` inlines the shared base styles (`reset`, `personal-style`, `motion`, `homepage`; about 4 KB compressed) because they are identical everywhere and come first in the cascade. Only a leading run is inlined, so the order against the linked page, `collections.css` and `site.css` never changes. A page has 3 render-blocking stylesheet requests instead of 7. The inlined CSS is read with Vite `?raw` imports, and relative `url()`s are rewritten to absolute paths.

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

## Measured result

Cold-cache benchmark in November 2026 (Chromium, 1280px, 7 runs per page, medians), comparing the live GitHub Pages site with the final build on a Vercel preview, averaged over `/`, `/projects/`, `/people/`, `/quotes/`, `/trends/` and `/brand/`:

| | GitHub Pages (old site) | Vercel (this build) |
| --- | --- | --- |
| Transfer | 994 KB | 384 KB |
| Largest Contentful Paint | 1250 ms | 821 ms |
| First Contentful Paint | 546 ms | 672 ms |
| Layout shift (CLS) | 0–0.041 | 0–0.024 |

On pages without an early image (`/projects/`, `/quotes/`, `/trends/`), first paint matches the old site. Elsewhere it trails by 100–250 ms. In the test, Vercel's edge answered about 30–40 ms later than GitHub's CDN, and the first image shares the first round trips with the CSS. The old site's first paint was only its logo: its text stayed invisible until the 270 KB fonts arrived (`font-display: block`), around 900 ms. Re-measure once the production domain is on Vercel.
