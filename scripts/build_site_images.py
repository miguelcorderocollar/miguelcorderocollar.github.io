#!/usr/bin/env python3
"""Build AVIF and WebP delivery copies of the site's large raster images.

The PNG (or JPEG) masters stay untouched, because brand downloads and the brand
tooling read them. Pages reference the lighter copies through <picture>.
Pixel dimensions never change: halftone art must not be resampled.

    python3 scripts/build_site_images.py
"""

from pathlib import Path

from PIL import Image

from image_variants import AVIF_QUALITY, WEBP_QUALITY, write_avif, write_webp

ROOT = Path(__file__).resolve().parent.parent

# Master image -> delivery copies written next to it with .avif and .webp extensions.
MASTERS = [
    "public/images/bg/mountains-after-hours.png",  # homepage hero
    "public/brand/assets/portrait.png",  # brand page preview; the PNG stays the download
]


def main() -> None:
    for relative in MASTERS:
        master = ROOT / relative
        with Image.open(master) as image:
            image.load()
            # Opaque masters: drop an unused alpha channel so it is not encoded.
            if image.mode == "RGBA" and image.getchannel("A").getextrema() == (255, 255):
                image = image.convert("RGB")
            avif = write_avif(image, master.with_suffix(".avif"), AVIF_QUALITY)
            webp = write_webp(image, master.with_suffix(".webp"), WEBP_QUALITY)
        print(
            f"{relative}: master {master.stat().st_size / 1024:.0f} KB -> "
            f"avif {avif / 1024:.0f} KB, webp {webp / 1024:.0f} KB"
        )


if __name__ == "__main__":
    main()
