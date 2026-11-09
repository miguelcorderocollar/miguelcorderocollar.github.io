"""Shared AVIF and WebP encoders for published raster images.

Halftone art is made of fine, high-contrast dots, so these settings keep the
dot grid intact while dropping everything else. Never downscale a halftone
here: resampling it creates moire. Only the codec changes, not the pixels.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

# AVIF 60 keeps individual dots crisp. At 50 and below the grid starts to smear.
AVIF_QUALITY = 60
# WebP is only the fallback for browsers without AVIF.
WEBP_QUALITY = 75


def write_avif(image: Image.Image, path: Path, quality: int = AVIF_QUALITY) -> int:
    """Write a full-chroma AVIF and return its size in bytes."""
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "AVIF", quality=quality, speed=4, subsampling="4:4:4")
    return path.stat().st_size


def write_webp(image: Image.Image, path: Path, quality: int = WEBP_QUALITY) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=quality, method=6)
    return path.stat().st_size
