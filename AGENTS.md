# Repository guidance

## Content-only updates

- People entries and other small copy changes are data-driven. When adding a person or editing text in JSON/content files, do not run browser or visual UI verification unless the user asks for it or the implementation itself changes.
- Follow [`docs/people-descriptions.md`](docs/people-descriptions.md) when writing or revising People summaries.
- Quote entries use English in `text`; when the original wording is not English, preserve it in `originalText` so the existing translation control can expose it.
- For these small updates, validate the changed JSON, run `git diff --check`, and inspect the diff for correctness. Keep the existing UI untouched.
- UI, layout, styling, interaction, or shader changes still require the appropriate focused verification.

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
