#!/usr/bin/env python3
"""Crop a portrait around a normalized focal point before shader preprocessing."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


def parse_aspect(value: str) -> float:
    try:
        width, height = (float(part) for part in value.split(":", 1))
        if width <= 0 or height <= 0:
            raise ValueError
        return width / height
    except (TypeError, ValueError) as error:
        raise argparse.ArgumentTypeError("aspect must look like 1:1 or 4:3") from error


def clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def crop_focus(
    input_path: Path,
    output_path: Path,
    focus_x: float,
    focus_y: float,
    area_pct: float,
    aspect: float,
) -> None:
    image = ImageOps.exif_transpose(Image.open(input_path)).convert("RGB")
    width, height = image.size
    area_pct = max(0.05, min(1.0, area_pct))
    focus_x = clamp(focus_x)
    focus_y = clamp(focus_y)

    if width / height >= aspect:
        crop_height = height * area_pct
        crop_width = crop_height * aspect
    else:
        crop_width = width * area_pct
        crop_height = crop_width / aspect

    crop_width = min(width, crop_width)
    crop_height = min(height, crop_height)
    left = focus_x * width - crop_width / 2
    top = focus_y * height - crop_height / 2
    left = max(0, min(width - crop_width, left))
    top = max(0, min(height - crop_height, top))

    box = (
        round(left),
        round(top),
        round(left + crop_width),
        round(top + crop_height),
    )
    cropped = image.crop(box)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(output_path, quality=95, optimize=True)
    print(
        f"{input_path} -> {output_path} · source {width}x{height} · "
        f"crop {box[2] - box[0]}x{box[3] - box[1]} · focus ({focus_x:.3f}, {focus_y:.3f})"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Source portrait")
    parser.add_argument("output", type=Path, help="Cropped portrait")
    parser.add_argument("--focus-x", type=float, default=0.5, help="Focal point from left to right (0-1)")
    parser.add_argument("--focus-y", type=float, default=0.5, help="Focal point from top to bottom (0-1)")
    parser.add_argument("--area-pct", type=float, default=1.0, help="Crop area retained (0-1)")
    parser.add_argument("--aspect", type=parse_aspect, default=1.0, help="Output aspect ratio, such as 1:1")
    args = parser.parse_args()
    crop_focus(args.input, args.output, args.focus_x, args.focus_y, args.area_pct, args.aspect)


if __name__ == "__main__":
    main()
