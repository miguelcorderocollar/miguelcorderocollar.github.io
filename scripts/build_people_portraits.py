#!/usr/bin/env python3
"""Build the published People portraits from local source images."""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

from PIL import Image

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

from crop_focus import crop_focus, parse_aspect  # noqa: E402
from preprocess_shader import DEFAULTS, render  # noqa: E402


DEFAULT_RECIPES = PROJECT_ROOT / "people/portrait-recipes.json"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "images/people/processed"
DEFAULT_SIZE = 640
DEFAULT_WEBP_QUALITY = 75


def resolve_project_path(path: Path) -> Path:
    return path if path.is_absolute() else PROJECT_ROOT / path


def build_portraits(
    recipes_path: Path,
    output_dir: Path,
    size: int,
    webp_quality: int,
) -> None:
    recipe_data = json.loads(recipes_path.read_text())
    aspect = parse_aspect(recipe_data.get("aspect", "1:1"))
    output_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="people-portraits-") as temp_dir:
        crop_dir = Path(temp_dir)
        for person in recipe_data["people"]:
            source_path = resolve_project_path(Path(person["source"]))
            if not source_path.is_file():
                raise FileNotFoundError(
                    f"Missing source image for {person['id']}: {source_path}"
                )

            crop = person["crop"]
            cropped_path = crop_dir / f"{person['id']}.jpg"
            normalized_path = crop_dir / f"{person['id']}-normalized.png"
            output_path = output_dir / f"{person['id']}-halftone.webp"

            crop_focus(
                source_path,
                cropped_path,
                crop["focusX"],
                crop["focusY"],
                crop["areaPct"],
                aspect,
            )

            # Normalize every portrait before the shader runs. The shader's
            # fixed 3px cell then has the same meaning for every final asset.
            with Image.open(cropped_path) as image:
                normalized = image.convert("RGB").resize(
                    (size, size), Image.Resampling.LANCZOS
                )
                normalized.save(normalized_path, "PNG", optimize=True)

            render(
                normalized_path,
                output_path,
                dict(DEFAULTS),
                size,
                webp_quality,
            )
            print(f"built {output_path} ({output_path.stat().st_size / 1024:.0f} KB)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--recipes",
        type=Path,
        default=DEFAULT_RECIPES,
        help="Portrait recipe JSON (default: people/portrait-recipes.json)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Published output directory (default: images/people/processed)",
    )
    parser.add_argument(
        "--size",
        type=int,
        default=DEFAULT_SIZE,
        help="Standard square dimension for every output (default: 640)",
    )
    parser.add_argument(
        "--webp-quality",
        type=int,
        default=DEFAULT_WEBP_QUALITY,
        help="WebP quality from 0 to 100 (default: 75)",
    )
    args = parser.parse_args()

    if args.size < 1:
        parser.error("--size must be positive")
    if not 0 <= args.webp_quality <= 100:
        parser.error("--webp-quality must be between 0 and 100")

    build_portraits(
        resolve_project_path(args.recipes),
        resolve_project_path(args.output_dir),
        args.size,
        args.webp_quality,
    )


if __name__ == "__main__":
    main()
