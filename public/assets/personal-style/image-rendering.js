import { drawHalftone } from "./halftone.js";

const halftoneWorkingCanvases = new WeakMap();

function dimensionsOf(source) {
  const width = source.naturalWidth ?? source.width;
  const height = source.naturalHeight ?? source.height;
  if (!width || !height) throw new TypeError("The source must be decoded and have non-zero dimensions.");
  return { width, height };
}

function positiveNumber(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${name} must be a finite number greater than zero.`);
  }
  return value;
}

function canvasFrom(source) {
  const { width, height } = dimensionsOf(source);
  if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) {
    const context = source.getContext("2d");
    if (context) return source;
  }

  const canvas = Object.assign(document.createElement("canvas"), { width, height });
  const context = canvas.getContext("2d");
  if (!context) throw new Error("A 2D canvas context is unavailable.");
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

function copyToCanvas(source) {
  const { width, height } = dimensionsOf(source);
  const canvas = Object.assign(document.createElement("canvas"), { width, height });
  const context = canvas.getContext("2d");
  if (!context) throw new Error("A 2D canvas context is unavailable.");
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

/**
 * Resize an origin-clean image or canvas with exact area averages when
 * downscaling. Upscaling uses the browser's high-quality image smoothing.
 * The returned canvas is origin-clean only when the input is origin-clean.
 */
export function areaResize(source, width, height) {
  width = Math.max(1, Math.round(positiveNumber(width, "width")));
  height = Math.max(1, Math.round(positiveNumber(height, "height")));
  const input = canvasFrom(source);
  if (input.width === width && input.height === height) return input;

  const output = Object.assign(document.createElement("canvas"), { width, height });
  const target = output.getContext("2d");
  if (!target) throw new Error("A 2D canvas context is unavailable.");
  if (width > input.width || height > input.height) {
    target.imageSmoothingQuality = "high";
    target.drawImage(input, 0, 0, width, height);
    return output;
  }

  const sw = input.width;
  const sh = input.height;
  const pixels = input.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, sw, sh).data;
  const imageData = target.createImageData(width, height);
  const out = imageData.data;
  const taps = (from, to) => Array.from({ length: to }, (_, i) => {
    const start = (i * from) / to;
    const end = ((i + 1) * from) / to;
    const parts = [];
    for (let n = Math.floor(start); n < Math.ceil(end) && n < from; n += 1) {
      parts.push([n, (Math.min(end, n + 1) - Math.max(start, n)) / (end - start)]);
    }
    return parts;
  });
  const xs = taps(sw, width);
  const ys = taps(sh, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (const [sy, wy] of ys[y]) {
        for (const [sx, wx] of xs[x]) {
          const i = (sy * sw + sx) * 4;
          const weight = wx * wy;
          const alpha = pixels[i + 3] / 255;
          r += pixels[i] * alpha * weight;
          g += pixels[i + 1] * alpha * weight;
          b += pixels[i + 2] * alpha * weight;
          a += alpha * weight;
        }
      }
      const j = (y * width + x) * 4;
      out[j] = a ? r / a : 0;
      out[j + 1] = a ? g / a : 0;
      out[j + 2] = a ? b / a : 0;
      out[j + 3] = a * 255;
    }
  }

  target.putImageData(imageData, 0, 0);
  return output;
}

function gaussianPrefilter(source, ratio) {
  if (ratio <= 1.15) return source;

  // Box averaging alone can leave repeating dots. Replicate edge pixels before
  // the Gaussian so the filter does not create a dark or transparent rim.
  const sigma = 0.48 * Math.sqrt(ratio * ratio - 1);
  const pad = Math.ceil(sigma * 3);
  const { width, height } = source;
  const padded = Object.assign(document.createElement("canvas"), {
    width: width + pad * 2,
    height: height + pad * 2,
  });
  const p = padded.getContext("2d");
  if (!p) throw new Error("A 2D canvas context is unavailable.");
  p.drawImage(source, pad, pad);
  p.drawImage(source, 0, 0, width, 1, pad, 0, width, pad);
  p.drawImage(source, 0, height - 1, width, 1, pad, pad + height, width, pad);
  p.drawImage(source, 0, 0, 1, height, 0, pad, pad, height);
  p.drawImage(source, width - 1, 0, 1, height, pad + width, pad, pad, height);
  for (const [sx, sy, dx, dy] of [
    [0, 0, 0, 0],
    [width - 1, 0, pad + width, 0],
    [0, height - 1, 0, pad + height],
    [width - 1, height - 1, pad + width, pad + height],
  ]) {
    p.drawImage(source, sx, sy, 1, 1, dx, dy, pad, pad);
  }

  const filtered = Object.assign(document.createElement("canvas"), { width, height });
  const context = filtered.getContext("2d");
  if (!context) throw new Error("A 2D canvas context is unavailable.");
  context.filter = `blur(${sigma}px)`;
  context.drawImage(padded, -pad, -pad);
  context.filter = "none";
  return filtered;
}

/**
 * Prepare a full image for display at a CSS width and device-pixel ratio.
 * The image's aspect ratio is preserved; crop it before calling when the
 * destination uses object-fit: cover. The source is never upscaled here.
 */
export function displayImage(source, cssWidth, dpr = window.devicePixelRatio || 1) {
  cssWidth = positiveNumber(cssWidth, "cssWidth");
  dpr = positiveNumber(dpr, "dpr");
  const input = copyToCanvas(source);
  const width = Math.min(input.width, Math.max(1, Math.round(cssWidth * dpr)));
  const height = Math.max(1, Math.round((input.height * width) / input.width));
  const ratio = input.width / width;
  if (ratio <= 1) return areaResize(input, width, height);

  const filtered = gaussianPrefilter(input, ratio);
  return areaResize(filtered, width, height);
}

/**
 * Draw the existing halftone shader at a display target. `supersample: 1`
 * preserves its normal output; larger integer values render more samples and
 * reduce them with exact area averages without changing the recipe.
 */
export function drawHalftoneForDisplay(canvas, image, settings = {}, {
  cssWidth,
  cssHeight,
  dpr = window.devicePixelRatio || 1,
  supersample = 1,
} = {}) {
  cssWidth = positiveNumber(cssWidth, "cssWidth");
  cssHeight = positiveNumber(cssHeight, "cssHeight");
  dpr = positiveNumber(dpr, "dpr");
  if (!Number.isInteger(supersample) || supersample < 1) {
    throw new TypeError("supersample must be a positive integer.");
  }

  const width = Math.max(1, Math.round(cssWidth * dpr));
  const height = Math.max(1, Math.round(cssHeight * dpr));
  let working = halftoneWorkingCanvases.get(canvas);
  if (!working) {
    working = document.createElement("canvas");
    halftoneWorkingCanvases.set(canvas, working);
  }
  if (working.width !== width * supersample) working.width = width * supersample;
  if (working.height !== height * supersample) working.height = height * supersample;
  const result = drawHalftone(working, image, settings, dpr * supersample);
  const reduced = supersample === 1 ? working : areaResize(working, width, height);

  canvas.width = width;
  canvas.height = height;
  const target = canvas.getContext("2d");
  if (!target) throw new Error("Pass a canvas that can use a 2D output context.");
  target.drawImage(reduced, 0, 0, width, height);
  return {
    ...result,
    renderer: supersample === 1 ? "webgl+copy" : "webgl+area",
    width,
    height,
    supersample,
  };
}
