#!/usr/bin/env python3
"""Pre-render a monochrome halftone image for the portfolio."""

from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


DEFAULTS: dict[str, Any] = {
    "cell": 3.0,
    "minDot": 0.12,
    "maxDot": 1.05,
    "contrast": 1.75,
    "brightness": 0.02,
    "gamma": 0.85,
    "levels": 9,
    "roughness": 0.36,
    "grain": 0.06,
    "softness": 0.8,
    "angle": 0.0,
    "halftone": 1.0,
    "ink": "#090909",
    "paper": "#ffffff",
    "invert": False,
}

CLI_NAMES = {
    "minDot": "min-dot",
    "maxDot": "max-dot",
    "roughness": "dot-roughness",
    "grain": "paper-grain",
    "softness": "dot-softness",
    "halftone": "halftone-mix",
}


def hash_noise(x: float, y: float) -> float:
    value = math.sin(x * 127.1 + y * 311.7) * 43758.5453
    return value - math.floor(value)


def parse_hex(value: str) -> tuple[int, int, int]:
    value = value.removeprefix("#")
    if len(value) != 6:
        raise ValueError(f"Expected a six-digit colour, got {value!r}")
    return tuple(int(value[offset : offset + 2], 16) for offset in (0, 2, 4))


def luminance(pixel: tuple[int, int, int], settings: dict[str, Any]) -> float:
    value = (pixel[0] * 0.2126 + pixel[1] * 0.7152 + pixel[2] * 0.0722) / 255
    value = max(0.0, min(1.0, (value - 0.5) * settings["contrast"] + 0.5 + settings["brightness"]))
    value = value ** settings["gamma"]
    levels = max(2, int(settings["levels"]))
    value = round(value * (levels - 1)) / (levels - 1)
    return 1.0 - value if settings["invert"] else value


def render(input_path: Path, output_path: Path, settings: dict[str, Any], max_size: int) -> None:
    image = ImageOps.exif_transpose(Image.open(input_path)).convert("RGB")
    image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

    scale = 3
    width, height = image.size
    work_size = (width * scale, height * scale)
    source = image.resize(work_size, Image.Resampling.LANCZOS)
    source_pixels = source.load()

    paper = parse_hex(settings["paper"])
    ink = parse_hex(settings["ink"])
    dots = Image.new("L", work_size, 0)
    draw = ImageDraw.Draw(dots)
    cell = max(1.0, float(settings["cell"]) * scale)
    angle = math.radians(float(settings["angle"]))
    cos_angle, sin_angle = math.cos(angle), math.sin(angle)
    center_x, center_y = width * scale / 2, height * scale / 2
    diagonal = math.hypot(width * scale, height * scale)

    for y in range(math.floor(-diagonal / 2), math.ceil(diagonal / 2), math.ceil(cell)):
        for x in range(math.floor(-diagonal / 2), math.ceil(diagonal / 2), math.ceil(cell)):
            source_x = round(center_x + cos_angle * x + sin_angle * y)
            source_y = round(center_y - sin_angle * x + cos_angle * y)
            if not (0 <= source_x < width * scale and 0 <= source_y < height * scale):
                continue

            tone = luminance(source_pixels[source_x, source_y], settings)
            seed = hash_noise(x / cell, y / cell)
            radius_scale = max(0.0, settings["minDot"] + (settings["maxDot"] - settings["minDot"]) * (1 - tone))
            radius = cell * 0.5 * radius_scale * (1 + (seed - 0.5) * settings["roughness"] * 0.34)
            jitter_x = (hash_noise(x / cell + 7.31, y / cell) - 0.5) * cell * settings["roughness"] * 0.28
            jitter_y = (hash_noise(x / cell, y / cell + 11.17) - 0.5) * cell * settings["roughness"] * 0.28
            draw.ellipse(
                (
                    center_x + x + cell / 2 + jitter_x - radius,
                    center_y + y + cell / 2 + jitter_y - radius,
                    center_x + x + cell / 2 + jitter_x + radius,
                    center_y + y + cell / 2 + jitter_y + radius,
                ),
                fill=255,
            )

    softness = max(0.0, float(settings["softness"])) * scale * 0.35
    if softness:
        dots = dots.filter(ImageFilter.GaussianBlur(softness))

    paper_layer = Image.new("RGB", work_size, paper)
    ink_layer = Image.new("RGB", work_size, ink)
    result = Image.composite(ink_layer, paper_layer, dots)

    if settings["halftone"] < 1:
        grayscale = ImageOps.grayscale(source).convert("RGB")
        result = Image.blend(grayscale, result, settings["halftone"])

    result = result.resize((width, height), Image.Resampling.LANCZOS)
    if settings["grain"] > 0:
        rng = random.Random(20260905)
        grain_size = (max(1, width // 4), max(1, height // 4))
        grain = Image.new("L", grain_size)
        grain.putdata([rng.randrange(96, 160) for _ in range(grain_size[0] * grain_size[1])])
        grain = grain.resize((width, height), Image.Resampling.BILINEAR)
        grain_rgb = Image.merge("RGB", (grain, grain, grain))
        result = Image.blend(result, ImageChops.multiply(result, grain_rgb), min(1.0, settings["grain"]))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    result.save(output_path, "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Pre-render the portfolio's monochrome halftone image treatment.")
    parser.add_argument("input", type=Path, help="Source image")
    parser.add_argument("output", type=Path, help="Output PNG")
    parser.add_argument("--settings", type=Path, help="Optional JSON file with recipe values")
    parser.add_argument("--max-size", type=int, default=1800, help="Maximum output dimension (default: 1800)")
    for key, default in DEFAULTS.items():
        argument = CLI_NAMES.get(key, key.replace("_", "-"))
        if isinstance(default, bool):
            parser.add_argument(f"--{argument}", dest=key, action="store_true", default=None)
        elif isinstance(default, int):
            parser.add_argument(f"--{argument}", dest=key, type=int, default=None)
        elif isinstance(default, float):
            parser.add_argument(f"--{argument}", dest=key, type=float, default=None)
        else:
            parser.add_argument(f"--{argument}", dest=key, default=None)

    args = parser.parse_args()
    settings = dict(DEFAULTS)
    if args.settings:
        settings.update(json.loads(args.settings.read_text()))
    for key in DEFAULTS:
        value = getattr(args, key)
        if value is not None:
            settings[key] = value

    render(args.input, args.output, settings, args.max_size)
    print(json.dumps({"input": str(args.input), "output": str(args.output), "settings": settings}, indent=2))


if __name__ == "__main__":
    main()
