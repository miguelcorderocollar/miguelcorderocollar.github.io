# Projects collection

Edit `projects.json`. Astro renders the homepage selection and Projects page directly from that data during `npm run build`. Run `python3 scripts/build_projects.py` from the repository root to align the selected-project section in `documents/Miguel-Cordero-Profile.md`. Use `python3 scripts/build_projects.py --check` to verify the profile mirror. The curated CV project summaries are edited separately; see [CV workflow](../docs/cv.md).

The `homepage` array controls the short selection and its order. It can refer to full collection entries or `homepageHighlights`, which combine related work such as the Linux projects. Keep private work described only at the level Miguel has approved. Each collection project has a browsing group and may have several topic tags. Use `status` for specific lifecycle or review information; do not infer readiness from repository activity.

The collection works without JavaScript. JavaScript adds category filters with shareable `?group=tools` URLs and browser history. Project ids provide stable links such as `/projects/#omatinta`.

Sources for the proposed additions are the linked public repositories, their READMEs and demo links. Review states were checked on 19 October 2026. Endless AI Quiz is marked in development based on Miguel's assessment. Earlier work comes from the existing homepage and CV. The homepage selection and the general note about innovation work follow Miguel's feedback in this chat.

Presentation follows the [Miguel Personal Style](https://github.com/miguelcorderocollar/miguel-personal-style) collection row and filter examples, with the site's existing vendored typography, tokens and motion helper. Homepage entries use the same native disclosures as Education and Experience.

## Project images

`image-recipes.json` records the exact sources, credits and framing for every thumbnail. Public icons are pinned to Git commit URLs. The original SVGs in `public/projects/symbols/` represent subjects where there is no suitable project icon; they are not official product logos. Existing logos keep their source shapes and receive the site's monochrome halftone treatment.

Run `python3 scripts/build_project_images.py --fetch-sources` once to retrieve the public sources and build the images. Later builds can omit `--fetch-sources`. The script requires Pillow and `rsvg-convert`. Downloaded sources and normalized inputs stay in ignored directories; only processed WebP images in `public/images/projects/processed/` are public.

Each image is contained, without cropping, on a 320×320 square with the inset recorded in the recipe. All use the same 7px dot grid so the halftone dots remain visible at thumbnail size. WebP quality stays at 75. The reverse-print adaptation uses pale ink on dark paper for the small dark collection thumbnails. Source links and original project credits remain in the recipe manifest.
