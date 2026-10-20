#!/usr/bin/env python3
"""Render the curated Markdown CV as a reproducible, two-page A4 PDF.

Install scripts/requirements-cv.txt, then run this script from any directory.
See docs/cv.md for the supported Markdown and maintenance workflow.
"""

import argparse
from html import escape
from io import BytesIO
import json
import math
from pathlib import Path
import re

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, PageBreak, PageTemplate, Paragraph,
)

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "documents/Miguel-Cordero-CV.md"
OUTPUT = ROOT / "documents/Miguel-Cordero-CV.pdf"
ASSETS = ROOT / "assets/personal-style"
WIDTH, HEIGHT = A4
MARGIN = 44
BOTTOM = 50
INLINE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*")


def inline(text):
    """Escape text before translating the two supported inline constructs."""
    parts, start = [], 0
    for match in INLINE.finditer(text):
        parts.append(escape(text[start:match.start()]))
        label, url, bold = match.groups()
        if bold is not None:
            parts.append(f"<b>{escape(bold)}</b>")
        else:
            if not url.startswith(("https://", "mailto:")):
                raise ValueError(f"CV links must use https:// or mailto: {url}")
            parts.append(f'<link href="{escape(url, quote=True)}"><u>{escape(label)}</u></link>')
        start = match.end()
    parts.append(escape(text[start:]))
    return "".join(parts)


def blocks(markdown):
    result, paragraph = [], []

    def flush():
        if paragraph:
            result.append(("paragraph", " ".join(paragraph)))
            paragraph.clear()

    for line in markdown.splitlines():
        line = line.strip()
        if not line:
            flush()
        elif line == "<!-- pagebreak -->":
            flush()
            result.append(("pagebreak", ""))
        elif match := re.fullmatch(r"(#{1,3}) (.+)", line):
            flush()
            result.append((f"h{len(match[1])}", match[2]))
        elif line.startswith("- "):
            flush()
            result.append(("bullet", line[2:]))
        elif line.startswith(("#", "<", "|", "```", ">", "* ")):
            raise ValueError(f"Unsupported CV Markdown: {line}")
        else:
            paragraph.append(line)
    flush()
    if not result or result[0][0] != "h1" or sum(k == "h1" for k, _ in result) != 1:
        raise ValueError("The CV needs exactly one name heading at the start")
    if sum(k == "pagebreak" for k, _ in result) != 1:
        raise ValueError("The two-page CV needs exactly one <!-- pagebreak -->")
    return result


def register_fonts():
    for name, weight in [("Mono", "Medium"), ("MonoSemi", "SemiBold"), ("MonoDisplay", "ExtraBold")]:
        pdfmetrics.registerFont(TTFont(name, str(ASSETS / f"fonts/JetBrainsMono-{weight}.ttf")))
    pdfmetrics.registerFontFamily("Mono", normal="Mono", bold="MonoDisplay")
    pdfmetrics.registerFontFamily("MonoSemi", normal="MonoSemi", bold="MonoSemi")
    pdfmetrics.registerFontFamily("MonoDisplay", normal="MonoDisplay", bold="MonoDisplay")


def styles(palette):
    body = ParagraphStyle(
        "body", fontName="Mono", fontSize=9.8, leading=14.5,
        textColor=palette["ink"], spaceAfter=4, allowWidows=0, allowOrphans=0,
    )
    return {
        "body": body,
        "name": ParagraphStyle("name", parent=body, fontName="MonoDisplay", fontSize=27,
                               leading=32, spaceAfter=8, keepWithNext=True),
        "role": ParagraphStyle("role", parent=body, fontName="MonoSemi", fontSize=11.1,
                               leading=15, spaceAfter=3, keepWithNext=True),
        "focus": ParagraphStyle("focus", parent=body, fontSize=9.4,
                                leading=14, spaceAfter=5, keepWithNext=True),
        "location": ParagraphStyle("location", parent=body, fontSize=8.1,
                                   leading=12, textColor=palette["muted"], spaceAfter=2,
                                   keepWithNext=True),
        "contacts": ParagraphStyle("contacts", parent=body, fontSize=8.1, leading=12,
                                   spaceAfter=6, keepWithNext=True),
        "h3": ParagraphStyle("h3", parent=body, fontName="MonoSemi", fontSize=10.3,
                             leading=14.2, spaceBefore=4, spaceAfter=2, keepWithNext=True),
        "current_role": ParagraphStyle("current_role", parent=body, fontName="MonoDisplay",
                                       fontSize=11.3, leading=15.7, spaceBefore=4,
                                       spaceAfter=3, keepWithNext=True),
        "past_role": ParagraphStyle("past_role", parent=body, fontName="MonoSemi",
                                    fontSize=10.3, leading=14.2, spaceBefore=11,
                                    spaceAfter=2, keepWithNext=True),
        "metadata": ParagraphStyle("metadata", parent=body, fontSize=8.1, leading=11.5,
                                   textColor=palette["muted"], spaceAfter=4, keepWithNext=True),
        "links": ParagraphStyle("links", parent=body, fontSize=8.1, leading=11.2,
                                spaceAfter=5),
        "bullet": ParagraphStyle("bullet", parent=body, leftIndent=12, firstLineIndent=0,
                                 bulletIndent=0, bulletFontName="Mono", bulletFontSize=9.4,
                                 spaceAfter=4),
    }


class SectionHeading(Flowable):
    keepWithNext = True

    def __init__(self, title, palette):
        super().__init__()
        self.title, self.palette = title.upper(), palette
        self.height = 28

    def wrap(self, avail_width, avail_height):
        self.width = avail_width
        return self.width, self.height

    def draw(self):
        canvas = self.canv
        canvas.setFillColor(self.palette["accent"])
        canvas.rect(0, 8, 4, 9, fill=1, stroke=0)
        canvas.setFillColor(self.palette["ink"])
        canvas.setFont("MonoSemi", 9.2)
        canvas.drawString(13, 9, self.title)
        line_start = 25 + pdfmetrics.stringWidth(self.title, "MonoSemi", 9.2)
        canvas.setStrokeColor(self.palette["rule"])
        canvas.setLineWidth(0.5)
        canvas.line(line_start, 12, self.width, 12)


def draw_corner_study(canvas, palette):
    """A still of the kit's procedural dot-sphere language, drawn as vectors."""
    size, cell, radius = 64, 3.2, 27
    canvas.saveState()
    canvas.translate(WIDTH - MARGIN - size, HEIGHT - 40 - size)
    canvas.setFillColor(palette["ink"])
    for row in range(20):
        for column in range(20):
            x, y = (column + 0.5) * cell, (row + 0.5) * cell
            nx, ny = (x - size / 2) / radius, (y - size / 2) / radius
            distance = nx * nx + ny * ny
            if distance >= 1:
                continue
            nz = math.sqrt(1 - distance)
            light = max(0, -0.45 * nx + 0.55 * ny + 0.70 * nz)
            darkness = round((1 - 0.88 * light) * 8) / 8
            canvas.circle(x, y, cell * 0.43 * math.sqrt(darkness), fill=1, stroke=0)
    canvas.setFillColor(palette["accent"])
    canvas.rect(size - 8, size - 8, 6, 6, fill=1, stroke=0)
    canvas.restoreState()


def build_pdf(markdown):
    register_fonts()
    palette = {key: HexColor(value) for key, value in json.loads((ASSETS / "tokens.json").read_text())["light"].items()}
    text_styles = styles(palette)
    parsed = blocks(markdown)
    name = parsed[0][1]
    story, header_index, in_header = [], 0, True
    header_styles = ["role", "focus", "location", "contacts"]
    after_subheading = False
    section, role_count = "", 0
    for kind, text in parsed:
        if kind == "h1":
            story.append(Paragraph(inline(text), text_styles["name"]))
        elif kind == "h2":
            if in_header and header_index != len(header_styles):
                raise ValueError("The name must be followed by role, focus, location and contact paragraphs")
            in_header = False
            section = text
            story.append(SectionHeading(text, palette))
            after_subheading = False
        elif kind == "h3":
            style = "h3"
            if section == "Experience":
                style = "current_role" if role_count == 0 else "past_role"
                role_count += 1
            story.append(Paragraph(inline(text), text_styles[style]))
            after_subheading = True
        elif kind == "pagebreak":
            story.append(PageBreak())
        elif kind == "bullet":
            story.append(Paragraph(inline(text), text_styles["bullet"], bulletText="•"))
            after_subheading = False
        else:
            if in_header:
                if header_index >= len(header_styles):
                    raise ValueError("Too many header paragraphs")
                style = header_styles[header_index]
                header_index += 1
            elif after_subheading and text.startswith("**"):
                style = "metadata"
            elif text.startswith("["):
                style = "links"
            else:
                style = "body"
            story.append(Paragraph(inline(text), text_styles[style]))
            after_subheading = False

    def decorate(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(palette["paper"])
        canvas.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
        canvas.setStrokeColor(palette["rule"])
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, 36, WIDTH - MARGIN, 36)
        canvas.setFillColor(palette["muted"])
        canvas.setFont("Mono", 7.5)
        canvas.drawString(MARGIN, 22, "miguelcorderocollar.com")
        canvas.linkURL("https://miguelcorderocollar.com", (MARGIN, 20, MARGIN + 100, 31), relative=0)
        canvas.drawRightString(WIDTH - MARGIN, 22, f"{doc.page:02d} / 02")
        if doc.page == 1:
            canvas.setFillColor(palette["accent"])
            canvas.rect(MARGIN, HEIGHT - 27, 26, 3, fill=1, stroke=0)
            draw_corner_study(canvas, palette)
        canvas.restoreState()

    stream = BytesIO()
    doc = BaseDocTemplate(
        stream, pagesize=A4, title=f"{name} | AI-focused CV", author=name,
        subject="AI innovation, agentic AI, product management and selected projects",
        leftMargin=MARGIN, rightMargin=MARGIN, topMargin=40, bottomMargin=BOTTOM,
    )

    def frame(top, frame_id):
        return Frame(MARGIN, BOTTOM, WIDTH - 2 * MARGIN, top - BOTTOM,
                     leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0, id=frame_id)

    doc.addPageTemplates([
        PageTemplate(id="first", frames=[frame(HEIGHT - 40, "first")],
                     onPage=decorate, autoNextPageTemplate="continued"),
        PageTemplate(id="continued", frames=[frame(HEIGHT - 40, "continued")], onPage=decorate),
    ])

    def canvas_factory(*args, **kwargs):
        return Canvas(*args, **{**kwargs, "invariant": 1, "pageCompression": 1})

    doc.build(story, canvasmaker=canvas_factory)
    if doc.page != 2:
        raise ValueError(f"CV overflow: expected 2 pages, got {doc.page}. Edit the copy or layout; output was not replaced.")
    return stream.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--check", action="store_true", help="fail if the committed PDF differs from a fresh build")
    args = parser.parse_args()
    try:
        pdf = build_pdf(args.source.read_text(encoding="utf-8"))
    except ValueError as error:
        parser.exit(1, f"{error}\n")
    if args.check:
        if not args.output.exists() or args.output.read_bytes() != pdf:
            parser.exit(1, "CV PDF is stale. Run python3 scripts/build_cv.py\n")
        print("CV PDF is current (2 A4 pages).")
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(pdf)
        print(f"Built {args.output} (2 A4 pages, {len(pdf):,} bytes)")


if __name__ == "__main__":
    main()
