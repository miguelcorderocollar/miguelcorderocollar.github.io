# Image shader

The site uses a small monochrome halftone treatment for images that belong to the header or the future influences collection. The live playground is at [`/shader/`](../shader/). It uses the WebGL shader when the browser supports it and falls back to Canvas 2D when it does not.

## Default recipe

This is the current preferred recipe:

```json
{
  "cell": 3,
  "minDot": 0.12,
  "maxDot": 1.05,
  "contrast": 1.75,
  "brightness": 0.02,
  "gamma": 0.85,
  "levels": 9,
  "roughness": 0.36,
  "grain": 0.06,
  "softness": 0.8,
  "angle": 0,
  "halftone": 1,
  "ink": "#090909",
  "paper": "#ffffff",
  "invert": false
}
```

## Preprocessing an image

The script needs Pillow once in the local Python environment:

```bash
python3 -m pip install --user Pillow
```

Use the shared recipe to create a production PNG:

```bash
python3 scripts/preprocess_shader.py \
  images/source/example.jpg \
  images/processed/example-halftone.png
```

Override a value for one image with a flag:

```bash
python3 scripts/preprocess_shader.py \
  images/source/example.jpg \
  images/processed/example-halftone.png \
  --cell 4 \
  --contrast 1.55 \
  --roughness 0.22
```

For a larger set of overrides, put the recipe in a JSON file and pass `--settings path/to/recipe.json`. The script keeps the source aspect ratio, corrects EXIF orientation, caps the longest dimension at 1800px by default, and writes a PNG with a little antialiasing around the dots.

The script is intended for final, stable assets. While tuning, use `/shader/` so the browser can show changes immediately and copy the exact settings.

When the ink and paper colours are grayscale, the script stores the result as an 8-bit grayscale PNG automatically. This keeps the lossless output smaller without changing its appearance. To create a smaller WebP for a web-only use, give the output a `.webp` extension:

```bash
python3 scripts/preprocess_shader.py \
  images/source/example.jpg \
  images/processed/example-halftone.webp \
  --webp-quality 90
```

The playground keeps PNG for clipboard copying and offers WebP as an optional download when the browser supports it.

## Credits

Any third-party image used in the site must keep its source and license in the relevant page or content notes. The playground's DHH sample is by Roo Reynolds (CC BY-NC 2.0). Its Nokia Lumia 800 sample is by Petar Milosevic (CC BY-SA 3.0).
