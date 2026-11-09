const FILTER_MODE = new URLSearchParams(window.location.search).get("portraitFilter");

function areaResize(source, width, height) {
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  if (source.width === width && source.height === height) return source;

  const result = Object.assign(document.createElement("canvas"), { width, height });
  const target = result.getContext("2d");
  const sw = source.width;
  const sh = source.height;
  const pixels = source.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, sw, sh).data;
  const output = target.createImageData(width, height);
  const out = output.data;
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

  target.putImageData(output, 0, 0);
  return result;
}

function gaussianPrefilter(source, ratio) {
  if (ratio <= 1.15) return source;

  // Blur before decimation: box averaging alone can leave repeating dot patterns.
  // Replicated edge pixels keep the Gaussian from creating a dark rim.
  const sigma = 0.48 * Math.sqrt(ratio * ratio - 1);
  const pad = Math.ceil(sigma * 3);
  const { width, height } = source;
  const padded = Object.assign(document.createElement("canvas"), {
    width: width + pad * 2,
    height: height + pad * 2,
  });
  const p = padded.getContext("2d");
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
  context.filter = `blur(${sigma}px)`;
  context.drawImage(padded, -pad, -pad);
  context.filter = "none";
  return filtered;
}

function positionFactor(value) {
  const normalized = value.toLowerCase();
  if (normalized === "left" || normalized === "top") return 0;
  if (normalized === "right" || normalized === "bottom") return 1;
  if (normalized === "center") return 0.5;
  if (normalized.endsWith("%")) {
    const percent = Number.parseFloat(normalized);
    return Number.isFinite(percent) ? percent / 100 : 0.5;
  }
  // The current People data uses the CSS default (center); unknown units keep it.
  return 0.5;
}

function getObjectPosition(value) {
  const tokens = value.trim().split(/\s+/);
  if (tokens.length === 1) {
    const token = tokens[0].toLowerCase();
    if (token === "top" || token === "bottom") return [0.5, positionFactor(token)];
    return [positionFactor(token), 0.5];
  }

  let [x, y] = tokens;
  if ((x === "top" || x === "bottom") && (y === "left" || y === "right")) [x, y] = [y, x];
  return [positionFactor(x), positionFactor(y)];
}

function cropToCover(image, width, height, objectPosition) {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  const frameRatio = width / height;
  const sourceRatio = sourceWidth / sourceHeight;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;

  if (sourceRatio > frameRatio) cropWidth = sourceHeight * frameRatio;
  else cropHeight = sourceWidth / frameRatio;

  const [positionX, positionY] = getObjectPosition(objectPosition);
  const sx = (sourceWidth - cropWidth) * positionX;
  const sy = (sourceHeight - cropHeight) * positionY;
  const crop = Object.assign(document.createElement("canvas"), {
    width: Math.max(1, Math.round(cropWidth)),
    height: Math.max(1, Math.round(cropHeight)),
  });
  crop.getContext("2d").drawImage(
    image,
    sx,
    sy,
    cropWidth,
    cropHeight,
    0,
    0,
    crop.width,
    crop.height,
  );
  return crop;
}

function renderPortrait(image, canvas) {
  if (!image.complete || !image.naturalWidth) return;
  const frame = image.parentElement;
  const cssWidth = frame.clientWidth;
  const cssHeight = frame.clientHeight;
  if (!cssWidth || !cssHeight) return;

  try {
    const objectPosition = getComputedStyle(image).objectPosition;
    const frameRatio = cssWidth / cssHeight;
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const sourceRatio = sourceWidth / sourceHeight;
    const cropWidth = sourceRatio > frameRatio ? sourceHeight * frameRatio : sourceWidth;
    const cropHeight = sourceRatio > frameRatio ? sourceHeight : sourceWidth / frameRatio;
    const dpr = Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0
      ? window.devicePixelRatio
      : 1;
    const scale = Math.min(dpr, cropWidth / cssWidth, cropHeight / cssHeight);
    const width = Math.max(1, Math.min(Math.round(cropWidth), Math.round(cssWidth * scale)));
    const height = Math.max(1, Math.min(Math.round(cropHeight), Math.round(cssHeight * scale)));
    const cacheKey = [width, height, cssWidth, cssHeight, sourceWidth, sourceHeight, objectPosition].join(":");
    if (canvas.dataset.renderKey === cacheKey) return;

    const crop = cropToCover(image, cssWidth, cssHeight, objectPosition);
    const ratio = Math.max(crop.width / width, crop.height / height);
    const filtered = gaussianPrefilter(crop, ratio);
    const result = areaResize(filtered, width, height);
    canvas.width = result.width;
    canvas.height = result.height;
    canvas.getContext("2d").drawImage(result, 0, 0);
    canvas.dataset.renderKey = cacheKey;
    canvas.hidden = false;
  } catch {
    // Keep the accessible source image visible if canvas APIs or filtering fail.
    canvas.hidden = true;
    delete canvas.dataset.renderKey;
  }
}

export function setupPortraitFiltering(frames) {
  if (
    FILTER_MODE === "off"
    || typeof ResizeObserver === "undefined"
    || typeof IntersectionObserver === "undefined"
  ) return;

  const updateFrame = (frame) => {
    const rect = frame.getBoundingClientRect();
    const nearViewport = rect.width && rect.height
      && rect.bottom >= -100 && rect.top <= window.innerHeight + 100
      && rect.right >= 0 && rect.left <= window.innerWidth;
    if (!nearViewport) return;
    const image = frame.querySelector("img");
    const canvas = frame.querySelector("canvas");
    if (image && canvas) renderPortrait(image, canvas);
  };
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      updateFrame(entry.target);
    }
  });
  const visibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateFrame(entry.target);
    });
  }, { rootMargin: "100px" });
  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      frames.forEach(updateFrame);
      resizeFrame = 0;
    });
  }, { passive: true });

  frames.forEach((frame) => {
    const image = frame.querySelector("img");
    if (!image) return;
    const canvas = document.createElement("canvas");
    canvas.className = "person-card__portrait-filter";
    canvas.setAttribute("aria-hidden", "true");
    canvas.hidden = true;
    frame.append(canvas);
    observer.observe(frame);
    visibilityObserver.observe(frame);

    const update = () => renderPortrait(image, canvas);
    image.addEventListener("load", update, { once: true });
    if (image.complete && image.naturalWidth) update();
  });
}
