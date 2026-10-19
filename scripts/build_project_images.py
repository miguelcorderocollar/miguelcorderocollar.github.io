#!/usr/bin/env python3
"""Build small project images with the site's halftone shader.

Requires Pillow and rsvg-convert for SVG inputs. Use --fetch-sources to retrieve
the pinned public icons recorded in projects/image-recipes.json.
"""
import argparse
import json
import subprocess
from pathlib import Path
from urllib.request import urlopen

from PIL import Image, ImageOps
from preprocess_shader import DEFAULTS, render

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fetch-sources', action='store_true')
    args = parser.parse_args()
    recipe = json.loads((ROOT / 'projects/image-recipes.json').read_text())
    size = recipe['size']
    settings = {**DEFAULTS, **recipe['shader']}
    normalized_dir = ROOT / 'images/projects/normalized'
    normalized_dir.mkdir(parents=True, exist_ok=True)
    for item in recipe['images']:
        source = ROOT / item['source']
        if args.fetch_sources and item.get('sourceUrl'):
            source.parent.mkdir(parents=True, exist_ok=True)
            with urlopen(item['sourceUrl'], timeout=30) as response:
                source.write_bytes(response.read())
        if not source.is_file():
            raise FileNotFoundError(f'{source}: fetch the pinned sources with --fetch-sources')
        raster = source
        if source.suffix == '.svg':
            raster = normalized_dir / f'{item["id"]}-raster.png'
            subprocess.run(['rsvg-convert', '--width', str(size), '--height', str(size),
                            '--output', str(raster), str(source)], check=True)
        with Image.open(raster) as original:
            image = ImageOps.exif_transpose(original).convert('RGBA')
            inset = item['inset']
            image.thumbnail((size - 2 * inset, size - 2 * inset), Image.Resampling.LANCZOS)
            canvas = Image.new('RGB', (size, size), recipe['sourceBackground'])
            canvas.paste(image, ((size - image.width) // 2, (size - image.height) // 2), image)
            normalized = normalized_dir / f'{item["id"]}.png'
            canvas.save(normalized)
        output = ROOT / f'images/projects/processed/{item["id"]}.webp'
        render(normalized, output, settings, size, recipe['quality'])
        print(f'{output.relative_to(ROOT)}: {size}×{size}, {output.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
