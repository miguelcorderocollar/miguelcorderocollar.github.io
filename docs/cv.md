# CV workflow

The CV is a two-page A4 document aimed at AI roles. Page one leads with AI expertise and both Red Bull roles. Page two starts with earlier experience, followed by brief project bullets, education, and contextual engineering and delivery skills. Each project name links to its website entry. All projects is a compact link aligned to the right of the section heading, with an orange arrow. It includes email, website, social links and current location, with no phone number or place of origin.

## Positioning

The CV targets applied AI work across agents, applications, product development and AI adoption in business processes. It should make sense to both startups and larger enterprises, particularly technology companies, without narrowing the candidate to one job title. Lead with hands-on AI work, then show how the product and enterprise delivery background supports it.

Prefer concrete examples such as Omatinta's AI integrations and the internal Zendesk applications. Describe Endless AI Quiz as a learning app about AI; its subject does not establish that AI generates the content. Keep measured outcomes, production AI deployment, model training and enterprise-wide strategy ownership out unless Miguel confirms them.

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

The generator uses ReportLab and the repository's local JetBrains Mono and Source Sans 3 fonts. It does not need a browser, network access, LaTeX, or a system font installation. Fixed PDF metadata makes repeated builds reproducible in the same Python/ReportLab runtime; `--check` compares a fresh build with the saved PDF byte for byte. Different Python or zlib versions may require rebuilding and reviewing the PDF. Commit the Markdown and rebuilt PDF together.

## Markdown supported by the generator

Use one `#` name heading followed by four paragraphs: role, focus, location, and contact links. The remaining document supports `##` section headings, `###` entry headings, paragraphs, single-line `-` bullets, `**bold**`, and `[label](https://example.com)` or `mailto:` links. Link labels can contain bold text, for example `[**Project name**](https://example.com)`. A bold paragraph directly after an entry heading is its metadata row. A standalone HTTPS link paragraph immediately after a `##` heading renders as a right-aligned action on the same heading row in the PDF; it stays directly below the heading in Markdown.

One `<!-- pagebreak -->` separates the two pages and remains invisible in rendered Markdown. The generator fails if the content flows onto more than two pages, preserving the previous PDF. Edit the copy or layout deliberately rather than silently shrinking the text to fit. Unsupported block constructs produce an error.

## Design

The white edition uses [Miguel Personal Style](https://github.com/miguelcorderocollar/miguel-personal-style), as requested for the CV: white paper, black ink, secondary grey, restrained orange markers, aligned rows and thin rules. It reads the `light` palette from `assets/personal-style/tokens.json`. JetBrains Mono SemiBold 600 and ExtraBold 800 distinguish headings, entry titles and the current role. Its licence remains in `assets/personal-style/fonts/OFL.txt`.

For this CV, Miguel requested a body font chosen for readability. Source Sans 3 Regular and Semibold provide proportional body text and inline emphasis at 11.4pt with 15.8pt leading. Contact and metadata text use 10.5pt; section headings use 9.8pt Mono, entry titles 11.2 to 12pt, and the name 27pt. Text is left aligned. Education separates degree titles, institutions and short bullets instead of combining them into long headings and paragraphs. Keep these sizes explicit; do not automatically shrink text on overflow.

The Adobe fonts, SIL Open Font License and pinned source revision are bundled under `assets/cv/`. This is a document-specific typography adaptation; it does not change the website or shared design system.

A vector halftone corner in the first page's upper right combines black dots with sparse orange and black pixels on a fixed grid. Density fades left and down from the page edge, away from text. It adapts the kit's Halftone corner, Halftone edge and Pixel scatter studies using procedural geometry. It is decorative and requires no image asset or extra dependency. The second page has no running header. Both pages have no footer or page numbers.

The maintained design source is currently `/home/mikelon797/dev/skills/miguel-personal-style/skills/miguel-personal-style/`. The CV uses the existing vendored light tokens and fonts, which match that source. It does not change the website's theme. No new photographs or shader assets are needed.

## Review before committing

Run `--check`, extract the PDF text, and compare it with the Markdown. Confirm that both roles, AI skills and project summaries are present, links remain clickable, and the phone number and place of origin are absent. Render both pages and inspect them at the final A4 size for clipping, spacing, reading order, corner-art clearance and page breaks. Confirm that both font families are embedded. For example, with Poppler installed:

```bash
pdftoppm -scale-to 1400 -png documents/Miguel-Cordero-CV.pdf /tmp/miguel-cv
pdftotext -layout documents/Miguel-Cordero-CV.pdf -
git diff --check
```
