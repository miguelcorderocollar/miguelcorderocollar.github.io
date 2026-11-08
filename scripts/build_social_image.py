#!/usr/bin/env python3
"""Build the default 1200x630 Open Graph card.

The background is the shader-processed YouTube brand banner
(public/brand/assets/banner-youtube.png), so no extra shader pass is needed.
Text uses the site's JetBrains Mono. Run after changing the banner, name or role:

    python3 scripts/build_social_image.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BANNER = ROOT / "public/brand/assets/banner-youtube.png"
LOGO = ROOT / "public/brand/assets/logo.png"
FONTS = ROOT / "public/assets/personal-style/fonts"
OUT = ROOT / "public/images/social/og-default.jpg"

W, H = 1200, 630
PAD = 72
INK = (255, 255, 255)
MUTED = (200, 200, 200)
ACCENT = (255, 133, 97)  # dark-mode accent, matches --mcc-accent on dark pages

NAME = "Miguel Cordero Collar"
ROLE = "IT Innovation Project Manager at Red Bull"
DETAIL = "AI agents, applications and internal tools"
DOMAIN = "miguelcorderocollar.com"


def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / f"JetBrainsMono-{weight}.ttf"), size)


def remove_banner_marks(banner: Image.Image) -> Image.Image:
    """Paint out the banner's orange safe-area marks with nearby halftone texture."""
    px = np.asarray(banner).astype(int)
    orange = (px[..., 0] - px[..., 2]) > 40
    mask = np.asarray(Image.fromarray((orange * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
    out = px.copy()
    h, w = mask.shape
    for y, x in zip(*np.nonzero(mask)):
        for dy, dx in ((-64, -64), (64, 64), (-64, 64), (64, -64)):
            sy, sx = y + dy, x + dx
            if 0 <= sy < h and 0 <= sx < w and not mask[sy, sx]:
                out[y, x] = px[sy, sx]
                break
    return Image.fromarray(out.astype(np.uint8))


def main() -> None:
    banner = remove_banner_marks(Image.open(BANNER).convert("RGB"))
    # Crop the banner to 1.905:1 around its vertical centre, then scale down.
    bw, bh = banner.size
    crop_h = round(bw * H / W)
    top = (bh - crop_h) // 2
    card = banner.crop((0, top, bw, top + crop_h)).resize((W, H), Image.LANCZOS)

    # Darken towards the left so the text stays readable over clouds.
    shade = Image.new("L", (W, H))
    shade_draw = ImageDraw.Draw(shade)
    for x in range(W):
        shade_draw.line([(x, 0), (x, H)], fill=round(225 - 120 * (x / W)))
    card = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), card, shade)

    logo = Image.open(LOGO).convert("RGBA").resize((72, 72), Image.LANCZOS)
    card.paste(logo, (PAD, PAD), logo)

    draw = ImageDraw.Draw(card)
    draw.text((PAD, 300), NAME, font=font("ExtraBold", 64), fill=INK, anchor="ls")
    draw.text((PAD, 362), ROLE, font=font("SemiBold", 30), fill=INK, anchor="ls")
    draw.text((PAD, 408), DETAIL, font=font("Medium", 26), fill=MUTED, anchor="ls")
    draw.text((PAD, H - PAD), DOMAIN, font=font("SemiBold", 24), fill=ACCENT, anchor="ls")

    # Corner mark, as on the brand banners.
    x, y, arm, t = W - PAD, H - PAD, 28, 5
    draw.rectangle((x - arm, y - t, x, y), fill=ACCENT)
    draw.rectangle((x - t, y - arm, x, y), fill=ACCENT)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    card.save(OUT, "JPEG", quality=85, optimize=True, progressive=True)
    print(f"Wrote {OUT.relative_to(ROOT)} ({W}x{H}, {OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
