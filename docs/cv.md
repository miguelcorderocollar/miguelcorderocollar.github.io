# CV workflow

The CV is a two-page A4 document aimed at AI roles. Page one leads with AI expertise and both Red Bull roles. Page two starts with earlier experience, followed by short project summaries, education, and supporting engineering and delivery skills. Project titles link to the website for details. It includes email, website and social links, with no phone number.

## Content and sources

- Edit `documents/Miguel-Cordero-CV.md`. It is the source for the PDF and the homepage's curriculum `Copy .md` action.
- Ground changes in the current homepage, `documents/Miguel-Cordero-Profile.md`, and `projects/projects.json`. Do not add achievements, metrics, dates or AI capabilities that those sources do not support.
- `documents/Miguel-Cordero-Profile.md` preserves the full homepage copy. `scripts/build_projects.py` updates its project section; `scripts/build_agent_content.py` uses it to produce `index.md`. Neither builder modifies the curated CV.
- The CV is deliberately edited for space and relevance. Review it when profile facts change; homepage project selections do not automatically change its project summaries.

## Build

Python 3.9 or newer is required. Set up the pinned dependency in a local virtual environment:

```bash
python3 -m venv .venv-cv
.venv-cv/bin/python -m pip install -r scripts/requirements-cv.txt
.venv-cv/bin/python scripts/build_cv.py
.venv-cv/bin/python scripts/build_cv.py --check
```

The script resolves source files and assets relative to its own location, so it also works from another directory. `--source PATH` and `--output PATH` allow temporary proposals without replacing the published files. The default output is `documents/Miguel-Cordero-CV.pdf`.

The generator uses ReportLab and the repository's local JetBrains Mono fonts. It does not need a browser, network access, LaTeX, or a system font installation. Fixed PDF metadata makes repeated builds reproducible in the same Python/ReportLab runtime; `--check` compares a fresh build with the saved PDF byte for byte. Different Python or zlib versions may require rebuilding and reviewing the PDF. Commit the Markdown and rebuilt PDF together.

## Markdown supported by the generator

Use one `#` name heading followed by four paragraphs: role, focus, location, and contact links. The remaining document supports `##` section headings, `###` entry headings, paragraphs, single-line `-` bullets, `**bold**`, and `[label](https://example.com)` or `mailto:` links. Inline formatting is intentionally flat; do not nest bold and links. A bold paragraph directly after an entry heading is its metadata row.

One `<!-- pagebreak -->` separates the two pages and remains invisible in rendered Markdown. The generator fails if the content flows onto more than two pages, preserving the previous PDF. Edit the copy or layout deliberately rather than silently shrinking the text to fit. Unsupported block constructs produce an error.

## Design

The white edition uses [Miguel Personal Style](https://github.com/miguelcorderocollar/miguel-personal-style), as requested for the CV: white paper, black ink, secondary grey, restrained orange markers, aligned rows and thin rules. It reads the `light` palette from `assets/personal-style/tokens.json` and embeds the supplied Medium 500, SemiBold 600 and ExtraBold 800 fonts. ExtraBold highlights key phrases and the current role; SemiBold distinguishes entry titles. Their licence remains in `assets/personal-style/fonts/OFL.txt`.

A small vector dot-sphere in the first page's upper-right corner adapts the kit's procedural graphic studies. Its fixed grid, nine dot sizes and orange pixel are decorative, not a data graphic or a photograph. It requires no image asset or extra dependency. The second page has no running header; both pages retain a quiet website footer and page numbers.

The maintained design source is currently `/home/mikelon797/dev/skills/miguel-personal-style/skills/miguel-personal-style/`. The CV uses the existing vendored light tokens and fonts, which match that source. It does not change the website's theme. No new photographs or shader assets are needed.

## Review before committing

Run `--check`, extract the PDF text, and compare it with the Markdown. Confirm that both roles, AI skills and project summaries are present, links remain clickable, and the phone number is absent. Render both pages and inspect them at the final A4 size for clipping, spacing, reading order and page breaks. For example, with Poppler installed:

```bash
pdftoppm -scale-to 1400 -png documents/Miguel-Cordero-CV.pdf /tmp/miguel-cv
pdftotext -layout documents/Miguel-Cordero-CV.pdf -
git diff --check
```
