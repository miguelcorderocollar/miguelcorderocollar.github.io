# Repository guidance

## Personal design system

- Use [Miguel Personal Style](https://github.com/miguelcorderocollar/miguel-personal-style) for this site's visual identity, components, and interaction patterns.
- Find the maintained local checkout first, currently `/home/mikelon797/dev/skills/miguel-personal-style`, and read `skills/miguel-personal-style/SKILL.md` and its relevant references before UI work. Locate the checkout again if that path moves.
- Prefer that maintained source over a potentially stale installed copy. If no local checkout is available, consult the source repository or install its skill using the README instructions. Do not install another copy just for this site when the maintained checkout is available.
- Reuse its tokens, typography, collection controls, and motion guidance. Keep any copied site assets in sync deliberately; reading updated guidance does not update vendored assets automatically.

## Content-only updates

- People entries and other small copy changes are data-driven. When adding a person or editing text in JSON/content files, do not run browser or visual UI verification unless the user asks for it or the implementation itself changes.
- Follow [`docs/people-descriptions.md`](docs/people-descriptions.md) when writing or revising People summaries.
- Follow [`docs/trends-descriptions.md`](docs/trends-descriptions.md) when writing or revising Trends descriptions. Every trend signal must have a concise, neutral `aboutMarkdown` description with at least one useful source link for the About this topic popup. Use `contextMarkdown` only when it adds specific, useful personal context; never add filler just to populate a button.
- Quote entries use English in `text`; when the original wording is not English, preserve it in `originalText` so the existing translation control can expose it.
- If a quote's attribution is missing or unverified, use `Unknown author` rather than guessing or retaining an unverified attribution. Preserve the submitted wording, set `source` to `User-submitted`, and leave `sourceUrl` empty unless a reliable source is provided.
- For these small updates, validate the changed JSON, run `git diff --check`, and inspect the diff for correctness. Run `python3 scripts/validate_people.py` for People entries. Keep the existing UI untouched.
- After a straightforward, fully specified content-only addition such as a trend, quote, or person is validated, commit the task's related changes. Keep unrelated user changes out of the commit, and do not commit ambiguous or incomplete work.
- Once an issue's requested work is complete and verified, close the corresponding GitHub issue with state reason `completed`. Leave ambiguous, incomplete, or skipped issues open.
- UI, layout, styling, interaction, or shader changes still require the appropriate focused verification.

## Recommendations backlog

- When the user asks to add something to "the recommendation issue" or the Recommendations list, append it to [Issue #34, Recommendations backlog](https://github.com/miguelcorderocollar/miguelcorderocollar.github.io/issues/34).
- Treat Issue #34 as the single running backlog. Keep it open and do not create a separate issue for each recommendation unless the user asks.
- Add each item under its category with a name, source link, topic tags, and a short personal note when available. One item may have multiple topic tags, and preserve source or credit details.
- Do not build or edit the Recommendations page from a new entry alone. Keep collecting entries in Issue #34 until the user asks for implementation or the backlog is clearly large enough to plan it.

## UI changes

When changing HTML, CSS, or JavaScript:

1. Start a local HTTP server on port 8000 if one is not already running:

   ```bash
   python3 -m http.server 8000
   ```

2. Open `http://localhost:8000` in the default browser. Use `xdg-open` on Linux and `open` on macOS.
3. Run the server in the background so it does not block other operations.
4. After the change, tell the user they can refresh the browser to see the update.

## Markdown sync

When changing page content in `index.html`, also update `documents/Miguel-Cordero-CV.md` in the same change so the curriculum's "Copy .md" button stays current.

## Image processing

- Before adding an image to the public site, run it through the appropriate shader pipeline unless the image is intentionally excluded from the shader treatment. Use `/shader/` to tune a recipe before preprocessing the final asset.
- Keep the source link, credit, and crop recipe documented even when the source file is not committed.

### People portraits

- Build People portraits with `python3 scripts/build_people_portraits.py` after adding or changing a portrait recipe.
- Normalize every crop to a 640×640px square before running the shader so all portraits use the same dot size.
- Write WebP output at quality 75. Keep source photos and temporary crops in the ignored `images/people/source/` and `images/people/cropped/` directories. Only WebP files in `images/people/processed/` belong in Git and on the published site.
- For image pipeline changes, inspect generated dimensions and file sizes, run `git diff --check`, and visually inspect a representative output. Browser verification is not required unless the implementation changes the UI.
