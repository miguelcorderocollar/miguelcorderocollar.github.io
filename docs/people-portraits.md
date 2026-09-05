# People portraits

Portraits on `/people/` are cropped to a square around a normalized focal point,
then passed through the default shader recipe in [`image-shader.md`](image-shader.md).
The crop settings live in [`people/portrait-recipes.json`](../people/portrait-recipes.json).

The published files use a standardized delivery format: 640×640px WebP,
quality 75. Every crop is resized to the same square canvas before the shader
runs, so the fixed shader cell produces the same dot size in every portrait.

Build or rebuild the complete People collection with:

```bash
python3 scripts/build_people_portraits.py
```

The command reads local source images from `images/people/source/`, creates
temporary square crops and normalized shader inputs, and writes only the final
assets to `images/people/processed/`.
The source and crop directories are ignored by Git and must not be added to the
published repository. Keep the source links and credits in
[`people/people-data.json`](../people/people-data.json).
