# Homepage redesign proposal

Branch: `codex/homepage-design-system`

The homepage keeps the existing CV and personal collections, with a compact opening based on Miguel personal style. The name is the main heading. Role and location sit beside it, above the existing mountain halftone. Collections have a compact index, followed by a two-column CV with a sticky section menu on larger screens.

Local JetBrains Mono fonts use the kit's 500, 600 and 800 weights. Black paper, pale ink, thin dividers and square controls carry the layout. Orange marks the heading's full stop, the M mark, reading progress and the current CV section. Native disclosures keep the long CV compact. The homepage navbar uses only the kit's exact SVG M, with an accessible home label. Collection pages add the full name in small type. The homepage name heading is capped at 36px. Footer design credits and redundant horizontal rules are removed; spacing separates the CV sections. Contact and download actions are proper links.

At narrow widths, the opening and collections stack, the section menu becomes a short two-column index, and dates sit under their titles. The smallest header uses two rows. Motion uses the kit's native helper, following Emil Kowalski's animate skill: 180ms interruptible disclosure transitions and 120ms press feedback. Keyboard actions are immediate. Reduced-motion settings disable smooth scrolling and hover movement, with an 80ms opacity-only disclosure change. The homepage uses the kit's dark palette only, as requested.

Trends, People and Quotes now share the dark palette, local fonts, navigation and calmer controls through collections.css. Their existing content and data behavior are preserved. Dialogs use the shared native motion helper, and pointer-triggered random quotes receive brief feedback. Filters, search and keyboard actions stay immediate. Staggered card entrances are removed. All pages have a back-to-top action with orange hover and focus states. Quote copy and translation buttons use icon-only orange feedback on transparent backgrounds. The Quotes introduction has a wider, balanced heading; Browse and Random fill adjacent halves with no gap. The original mountain asset is reused without another shader pass. Decorative captions and the section-menu heading are removed. The collection boundary is the only divider above the introduction. The Markdown introduction matches the homepage.

## Review

Start the local server from the repository with `python3 -m http.server 8000`, then visit http://localhost:8000. The preview runs as the transient user service mcc-homepage-preview, so it remains available between messages.

JavaScript syntax, local resources, unique IDs, anchor targets and whitespace checks were validated. People, Trends and Quotes were visually inspected at desktop size; People and Trends were also checked at 390px width, with no horizontal overflow. Quotes random mode was checked at 390px. Verified the collection back-to-top action and focus return, transparent quote icon hover, full-width mode-button fills, People search and filters, Trends category filters, method dialog opening and closing with focus return, quote search, Spanish translation, random mode and another-quote behavior. Reduced-motion handling is supplied by the shared kit; a live preference change has not been retested.
