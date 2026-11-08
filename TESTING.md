# Astro migration verification

Local checks performed on 8 November 2026 for `codex/astro-blog`. No Vercel deployment, domain change, merge or GitHub Pages removal has occurred.

Runtime: Node.js 26.13.0 and npm 11.20.0 on Linux.

## Automated checks

- `npm ci` installs the locked dependencies. The dependency audit reported no vulnerabilities at installation.
- `npm run check` validates Astro/TypeScript without errors, warnings or hints, all 20 People summaries, and project/profile alignment.
- `npm test` builds the static site and runs eight regression tests. These cover local page links and asset references, static collection content, Markdown/JSON fidelity, sample article rendering and metadata, draft/future exclusion, sitemap coverage, and stylesheet/module dependencies.
- The publishing regression uses a temporary project copy. It adds a synthetic article, edits it, renames its source file while retaining its slug, marks it as a draft, and rejects duplicate slugs and invalid frontmatter. It checks article HTML, raw Markdown, the index, RSS and sitemap. Temporary fixtures do not enter the actual site's source or build.
- `node scripts/verify_http.mjs http://127.0.0.1:8001` checks 35 responses against Astro's production preview. It covers pages, legacy explicit HTML paths, Markdown/JSON/XML content types, draft/future/source-only routes returning 404, the custom 404, and byte-identical CV PDF, thesis PDF and brand ZIP downloads.
- `python3 scripts/validate_agent_content.py http://127.0.0.1:8001` checks discovery files, representation links, JSON, JSON-LD and internal Markdown links. XML may be `application/xml` in development or `text/xml` when served as a static file; both are accepted.
- Python syntax compilation and Node syntax checks pass for adjusted asset maintenance scripts. Approved image/PDF assets were moved without regeneration.
- `git diff --check` checks both staged moves and source changes.

## Browser review

Reviewed through the Codex in-app browser, including the Astro development server on port 8000 and production preview on port 8001.

- Blog index and sample article at desktop size and a 390 × 844 mobile viewport. Checked the existing font, responsive navigation, wrapping, article contents navigation, code, table and image layout.
- People search, biography dialog and Escape dismissal with focus returning to its opener.
- Quote search, original-language toggle, random mode and another-quote action.
- Trends keyboard chart inspection, explanation dialog and category filters.
- Projects filter results and a direct project anchor overriding a conflicting category filter.
- Brand platform, style and device previews, with download links matching the selected style.
- Homepage disclosures and curriculum Markdown copy.
- Shader controls, image preview and explanation dialog.

These checks are local. Vercel routing, CDN MIME types, domain redirects and HTTPS must be checked after the later preview deployment. No separate Edge, Firefox or Safari run is claimed. Static HTML checks establish that collection content exists without JavaScript; no separate browser session with JavaScript disabled was run. Reduced-motion rules were preserved and inspected, without a separate OS preference emulation run. Offline image and CV generators were syntax/path checked, not regenerated from private inputs.
