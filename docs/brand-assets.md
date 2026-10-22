# Brand assets

`/brand/` contains the approved logo, portrait and banner downloads. The page uses the site's existing JetBrains Mono, black theme, pale text and orange accent. Its ZIP includes nine assets and the reproducible selection settings.

## Approved selection

Approved on 22 October 2026. Parameters and export SHA-256 hashes are recorded in [`brand/settings.json`](../brand/settings.json). Source image hashes were checked against the submitted selection before rendering. Private source images and machine-specific paths are not included in the published files or bundle.

- Logo: the site's existing `assets/personal-style/mark.svg`, copied without changes. The PNG is a 1024 × 1024 rasterization of that SVG.
- Portrait: Fine squares, natural colour, 90% background contrast, 111% framing, 44px upward movement, orange enabled at 55% brightness. Export size 1024 × 1024 PNG. Source filename `ai-improvement-photo-transparent.png`, supplied by Miguel. Source crop starts at x=460, y=65, width=640, height=959. Placement is x=-56.32, y=57.376, width=1136.64, height=1703.184. Real source pixels fill the photograph, with no repeated rows or generated fill. The photograph is intentionally excluded from the photographic shader, as approved; only the independent background uses procedural pixels.
- Banner: the approved photograph-to-halftone image in `images/bg/mountains-after-hours.png`. The X export is pixel-identical to this master. LinkedIn and YouTube adapt the same composition. Reference corner geometry is 39px arms, 8px strokes and 48px insets at 1500 × 500. LinkedIn scales this to 41/8/51. YouTube uses 40/8/49 inside the centred 1544 × 422 mobile-visible frame. Native exports are 1584 × 396, 1500 × 500 and 2560 × 1440.

## Regenerating assets

The renderer and export command are versioned in `scripts/brand-renderer.js` and `scripts/build_brand_assets.mjs`. They read `brand/settings.json` and rebuild the logo, portrait and both banner variants for all three platforms, then package the ZIP. The private source folder must contain `headshot.png` and `mountains.jpg`. The website banner master is read from `images/bg/mountains-after-hours.png`. Source SHA-256 checks prevent accidentally substituting a different photo. To intentionally replace a source, review it and update its hash in the settings.

Requires Node.js, Playwright, Chromium and Python 3. Dependencies can stay outside the checkout:

```sh
npm install --prefix /tmp/mcc-brand-tools playwright
/tmp/mcc-brand-tools/node_modules/.bin/playwright install chromium
PLAYWRIGHT_MODULE=/tmp/mcc-brand-tools/node_modules/playwright/index.mjs \
  node scripts/build_brand_assets.mjs --sources /path/to/private/sources
```

Set `CHROMIUM_PATH` to use an existing Chromium executable. The script starts a temporary HTTP server on a random loopback port, serves only the required inputs, closes it after rendering, and never copies the private photos into the repository. It does not depend on the studio folder or a running preview server.

To adapt the assets, edit the profile settings and background, banner formats/reference corners, rendering recipe, or colour-fade stops in `brand/settings.json`, then rerun the command. The original X banner deliberately copies the website master; change that master when changing the original X composition. The colour fade's `colourEnd: 0.5` and `monochromeStart: 0.9` encode the approved 50/40/10 split. Profile placement is computed from framing and raise using the original crop; the recorded placement documents the approved output.

On 22 October 2026, a full rebuild using this script reproduced all eight approved PNGs byte for byte. Future browser/GPU versions may produce small rasterization differences, so inspect updated exports before publishing them.

## Packaging

After updating approved exports, rebuild the download with:

```sh
python3 scripts/package_brand_assets.py
```

The script checks dimensions and the logo source, records asset hashes, and writes `brand/assets/miguel-cordero-collar-brand.zip`.

## Display filtering

The banner's display-sized copy uses the maintained skill's `assets/image-rendering.js`. It reduces moiré without changing downloadable masters. The helper and its `halftone.js` dependency were deliberately copied into `assets/personal-style/` for this page. The original alt-labelled image is the fallback if JavaScript or filtering is unavailable. Logo and portrait previews retain their ordinary image rendering.

The page switches between LinkedIn, X and YouTube previews. YouTube's Mobile view crops x=508, y=509, width=1544, height=422; Desktop uses x=0, y=509, width=2560, height=422; TV shows the full 2560 × 1440 image. These are device previews of the approved upload, not additional export files. The YouTube link and ZIP always contain the full-size banner. Without JavaScript, the X preview and all download links remain available.

## Colour fade option

The second banner keeps the same source crop, halftone blend and orange accents. The photograph stays in full colour for the first 50% of the platform frame, fades linearly to monochrome across the next 40%, and stays black and white for the final 10%. For YouTube the transition follows the mobile-safe frame so all device crops retain its intended position. The halftone receives the same fading photograph through Canvas colour compositing before the existing blend mask. This keeps its luminance and dot grid while carrying the photo colour into the dots, so the shader no longer hides the desaturation. Orange accents are applied afterwards and keep their original colour. The approved proportions are 50% full colour, 40% transition and 10% monochrome.

The versioned renderer exports `renderBanner(platformId, "colour-fade")` for this variant and `renderBanner(platformId)` for the original. The three `banner-*-colour-fade.png` exports are in the ZIP alongside the original three banners. Style controls switch the preview and download links together; the same YouTube device views apply to both styles. Without JavaScript, both sets of download links remain available.
