#!/usr/bin/env python3
"""Render the curated Markdown CV as a reproducible, two-page A4 PDF.

Install scripts/requirements-cv.txt, then run this script from any directory.
See docs/cv.md for the supported Markdown and maintenance workflow.
"""

import argparse
from html import escape
from io import BytesIO
import json
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
BODY_FONTS = ROOT / "assets/cv/fonts"
WIDTH, HEIGHT = A4
MARGIN = 44
BOTTOM = 44
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
    pdfmetrics.registerFont(TTFont("BodySans", str(BODY_FONTS / "SourceSans3-Regular.ttf")))
    pdfmetrics.registerFont(TTFont("BodySansSemi", str(BODY_FONTS / "SourceSans3-Semibold.ttf")))
    pdfmetrics.registerFontFamily("BodySans", normal="BodySans", bold="BodySansSemi")
    pdfmetrics.registerFontFamily("BodySansSemi", normal="BodySansSemi", bold="BodySansSemi")


def styles(palette):
    body = ParagraphStyle(
        "body", fontName="BodySans", fontSize=11.4, leading=15.8,
        textColor=palette["ink"], spaceAfter=5, allowWidows=0, allowOrphans=0,
    )
    return {
        "body": body,
        "name": ParagraphStyle("name", parent=body, fontName="MonoDisplay", fontSize=27,
                               leading=32, spaceAfter=8, keepWithNext=True),
        "role": ParagraphStyle("role", parent=body, fontName="MonoSemi", fontSize=11.1,
                               leading=16, spaceAfter=3, keepWithNext=True),
        "focus": ParagraphStyle("focus", parent=body, fontName="BodySansSemi", fontSize=11.4,
                                leading=15.8, spaceAfter=5, keepWithNext=True),
        "location": ParagraphStyle("location", parent=body, fontSize=10.5,
                                   leading=14, textColor=palette["muted"], spaceAfter=2,
                                   keepWithNext=True),
        "contacts": ParagraphStyle("contacts", parent=body, fontSize=10.5, leading=14,
                                   spaceAfter=6, keepWithNext=True),
        "h3": ParagraphStyle("h3", parent=body, fontName="MonoSemi", fontSize=11.2,
                             leading=16, spaceBefore=8, spaceAfter=3, keepWithNext=True),
        "current_role": ParagraphStyle("current_role", parent=body, fontName="MonoDisplay",
                                       fontSize=12, leading=17, spaceBefore=4,
                                       spaceAfter=3, keepWithNext=True),
        "past_role": ParagraphStyle("past_role", parent=body, fontName="MonoSemi",
                                    fontSize=11.2, leading=16, spaceBefore=12,
                                    spaceAfter=2, keepWithNext=True),
        "metadata": ParagraphStyle("metadata", parent=body, fontSize=10.5, leading=14.5,
                                   textColor=palette["muted"], spaceAfter=5, keepWithNext=True),
        "links": ParagraphStyle("links", parent=body, fontName="BodySansSemi",
                                fontSize=11.4, leading=15.8, spaceAfter=5),
        "bullet": ParagraphStyle("bullet", parent=body, leftIndent=12, firstLineIndent=0,
                                 bulletIndent=0, bulletFontName="BodySans", bulletFontSize=11.4,
                                 spaceAfter=5),
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
        canvas.setFont("MonoSemi", 9.8)
        canvas.drawString(13, 9, self.title)
        line_start = 25 + pdfmetrics.stringWidth(self.title, "MonoSemi", 9.8)
        canvas.setStrokeColor(self.palette["rule"])
        canvas.setLineWidth(0.5)
        canvas.line(line_start, 12, self.width, 12)


def draw_corner_study(canvas, palette):
    """Fixed-grid halftone and pixel scatter fading away from the top-right edge."""
    cell, columns, rows = 4.5, 33, 32
    canvas.saveState()
    for row in range(rows):
        for column in range(columns):
            x, y = WIDTH - (column + 0.5) * cell, HEIGHT - (row + 0.5) * cell
            density = (1 - column / columns) ** 1.35 * (1 - row / rows) ** 1.65
            # Stable grid hashes keep the sparse pixels reproducible.
            seed = (column * 73856093 ^ row * 19349663 ^ 83492791) & 0xFFFF
            scatter = seed / 65535
            size = round(density * 10) / 10
            if size == 0 and scatter > density:
                continue
            orange = seed % 19 < 3
            canvas.setFillColor(palette["accent"] if orange else palette["ink"])
            if orange or seed % 13 == 0:
                side = cell * max(0.16, size * 0.79)
                canvas.rect(x - side / 2, y - side / 2, side, side, fill=1, stroke=0)
            else:
                canvas.circle(x, y, cell * 0.46 * size, fill=1, stroke=0)
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
        return Canvas(*args, **{**kwargs, "invariant": 1, "pageCompression": 1,
                               "initialFontName": "BodySans", "initialFontSize": 11.4})

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
