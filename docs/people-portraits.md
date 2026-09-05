# People portraits

Portraits on `/people/` are cropped to a square around a normalized focal point,
then passed through the default shader recipe in [`image-shader.md`](image-shader.md).
The crop settings live in [`people/portrait-recipes.json`](../people/portrait-recipes.json).

To reproduce one of the current portraits:

```bash
python3 scripts/crop_focus.py \
  images/people/source/miguel-anxo-bastos-modern.jpg \
  images/people/cropped/miguel-anxo-bastos.jpg \
  --focus-x 0.51 --focus-y 0.37 --area-pct 0.98 --aspect 1:1

python3 scripts/preprocess_shader.py \
  images/people/cropped/miguel-anxo-bastos.jpg \
  images/people/processed/miguel-anxo-bastos-halftone.webp \
  --webp-quality 90
```

The current source links and credits are listed in `people/people-data.json`.
