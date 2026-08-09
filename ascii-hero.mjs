import {
  layoutWithLines,
  prepareWithSegments,
} from "https://esm.sh/@chenglou/pretext@0.0.4";

const DEFAULTS = Object.freeze({
  density: 1.55,
  threshold: 0.38,
  interactionRadius: 5.25,
  force: 1.65,
  spring: 0.11,
  damping: 0.86,
  fpsCap: 30,
  maxCols: 168,
});

const CONTROL_DEFS = [
  ["density", 0.8, 2.4, 0.01],
  ["threshold", 0.12, 0.75, 0.01],
  ["interactionRadius", 1.5, 12, 0.25],
  ["force", 0.2, 4, 0.05],
  ["spring", 0.02, 0.3, 0.01],
  ["damping", 0.65, 0.97, 0.01],
  ["fpsCap", 12, 60, 1],
  ["maxCols", 80, 240, 1],
];

const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
].map((value) => value / 16);

const preparedProbeCache = new Map();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function parseRgbChannels(value) {
  const matches = value.match(/[\d.]+/g);
  if (!matches || matches.length < 3) {
    return [255, 255, 255];
  }
  return matches.slice(0, 3).map(Number);
}

function luminanceFromRgb([red, green, blue]) {
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}

function getPreparedProbe(length, font) {
  const key = `${font}::${length}`;
  let prepared = preparedProbeCache.get(key);
  if (!prepared) {
    prepared = prepareWithSegments(".".repeat(length), font, {
      whiteSpace: "pre-wrap",
    });
    preparedProbeCache.set(key, prepared);
  }
  return prepared;
}

function getFontShorthand(style) {
  if (style.font) {
    return style.font;
  }
  return [
    style.fontStyle,
    style.fontVariant,
    style.fontWeight,
    style.fontStretch,
    style.fontSize,
    style.fontFamily,
  ]
    .filter(Boolean)
    .join(" ");
}

class AsciiHero {
  constructor(root) {
    this.root = root;
    this.pre = root.querySelector(".ascii-hero__art");
    this.canvas = root.querySelector(".ascii-hero__sample");
    this.fallback = root.querySelector(".ascii-hero__fallback");
    this.debugPanel = root.querySelector(".ascii-hero__debug");
    this.controlsRoot = root.querySelector(".ascii-hero__controls");
    this.metricsPre = root.querySelector(".ascii-hero__metrics");
    this.copyButton = root.querySelector(".ascii-hero__copy");
    this.resetButton = root.querySelector(".ascii-hero__reset");
    this.context = this.canvas.getContext("2d", { willReadFrequently: true });
    this.config = { ...DEFAULTS };
    this.metrics = {
      cols: 0,
      rows: 0,
      chars: 0,
      frameMs: 0,
      fps: 0,
    };
    this.image = new Image();
    this.image.decoding = "async";
    this.image.src = root.dataset.asciiSrc || "";
    this.lineHeight = 0;
    this.cellWidth = 0;
    this.cols = 0;
    this.rows = 0;
    this.luminance = new Float32Array();
    this.displacementX = new Float32Array();
    this.displacementY = new Float32Array();
    this.velocityX = new Float32Array();
    this.velocityY = new Float32Array();
    this.animationFrame = 0;
    this.lastFrameTime = 0;
    this.lastMetricsUpdate = 0;
    this.font = "";
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.isReady = false;
    this.isDebugOpen = false;
    this.dotBias = 1;

    this.handleResize = this.handleResize.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleReducedMotionChange = this.handleReducedMotionChange.bind(this);
    this.loop = this.loop.bind(this);
  }

  async init() {
    try {
      await this.image.decode();
    } catch {
      return;
    }

    this.buildControls();
    this.bindEvents();
    this.debugPanel.hidden = true;
    this.root.classList.add("is-enhanced");
    this.remeasure();
    this.isReady = true;
    this.render();
  }

  bindEvents() {
    window.addEventListener("resize", this.handleResize, { passive: true });
    this.root.addEventListener("pointermove", this.handlePointerMove, {
      passive: true,
    });
    this.root.addEventListener("pointerleave", this.handlePointerLeave, {
      passive: true,
    });
    document.addEventListener("keydown", this.handleKeydown);
    this.reducedMotion.addEventListener("change", this.handleReducedMotionChange);
    this.copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(
          JSON.stringify(this.getMetricsSnapshot(), null, 2),
        );
      } catch {
        this.metricsPre.textContent = `${JSON.stringify(this.getMetricsSnapshot(), null, 2)}\n\nClipboard unavailable in this context.`;
      }
    });
    this.resetButton.addEventListener("click", () => {
      this.config = { ...DEFAULTS };
      this.syncControls();
      this.remeasure();
      this.render();
    });
  }

  buildControls() {
    const fragment = document.createDocumentFragment();
    for (const [key, min, max, step] of CONTROL_DEFS) {
      const row = document.createElement("label");
      row.className = "ascii-hero__control";

      const name = document.createElement("span");
      name.className = "ascii-hero__control-name";
      name.textContent = key;

      const value = document.createElement("output");
      value.className = "ascii-hero__control-value";
      value.htmlFor = `ascii-hero-${key}`;

      const input = document.createElement("input");
      input.className = "ascii-hero__slider";
      input.type = "range";
      input.id = `ascii-hero-${key}`;
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(this.config[key]);
      input.dataset.key = key;

      const onInput = () => {
        const nextValue = step >= 1 ? Math.round(Number(input.value)) : Number(input.value);
        this.config[key] = nextValue;
        value.textContent = String(round(nextValue));
        if (key === "maxCols") {
          this.remeasure();
        }
        this.render();
        if (!this.reducedMotion.matches) {
          this.startLoop();
        }
      };

      input.addEventListener("input", onInput);
      value.textContent = String(round(this.config[key]));

      row.append(name, value, input);
      fragment.append(row);
    }
    this.controlsRoot.append(fragment);
  }

  syncControls() {
    const inputs = this.controlsRoot.querySelectorAll("input[data-key]");
    for (const input of inputs) {
      const key = input.dataset.key;
      input.value = String(this.config[key]);
      const value = input.parentElement?.querySelector("output");
      if (value) {
        value.textContent = String(round(this.config[key]));
      }
    }
  }

  handleResize() {
    this.remeasure();
    this.render();
    if (!this.reducedMotion.matches) {
      this.startLoop();
    }
  }

  handleReducedMotionChange() {
    if (this.reducedMotion.matches) {
      this.stopLoop();
      this.resetPhysics();
      this.render();
      return;
    }
    this.startLoop();
  }

  handlePointerMove(event) {
    if (!this.isReady || this.reducedMotion.matches || this.cols === 0 || this.rows === 0) {
      return;
    }

    const rect = this.root.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * this.cols;
    const y = ((event.clientY - rect.top) / rect.height) * this.rows;
    const radius = this.config.interactionRadius;
    const minCol = Math.max(0, Math.floor(x - radius - 1));
    const maxCol = Math.min(this.cols - 1, Math.ceil(x + radius + 1));
    const minRow = Math.max(0, Math.floor(y - radius - 1));
    const maxRow = Math.min(this.rows - 1, Math.ceil(y + radius + 1));

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        const dx = col + 0.5 - x;
        const dy = row + 0.5 - y;
        const distance = Math.hypot(dx, dy);
        if (distance > radius) {
          continue;
        }
        const falloff = 1 - distance / radius;
        const index = row * this.cols + col;
        const scale = (this.config.force * falloff) / Math.max(distance, 0.35);
        this.velocityX[index] += dx * scale;
        this.velocityY[index] += dy * scale;
      }
    }

    this.startLoop();
  }

  handlePointerLeave() {
    if (!this.reducedMotion.matches) {
      this.startLoop();
    }
  }

  handleKeydown(event) {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
    ) {
      return;
    }
    if (event.key.toLowerCase() !== "d") {
      return;
    }
    this.isDebugOpen = !this.isDebugOpen;
    this.root.classList.toggle("is-debug", this.isDebugOpen);
    this.debugPanel.hidden = !this.isDebugOpen;
    this.updateMetrics(true);
  }

  remeasure() {
    const style = window.getComputedStyle(this.pre);
    this.font = getFontShorthand(style);
    this.lineHeight = parseFloat(style.lineHeight);
    this.cellWidth = this.measureCellWidth();
    this.dotBias = this.measureDotBias();

    const nextCols = this.measureColumns();
    const aspectRatio = this.image.naturalWidth / this.image.naturalHeight;
    const nextRows = clamp(
      Math.round((nextCols * this.cellWidth) / (aspectRatio * this.lineHeight)),
      12,
      140,
    );

    if (nextCols === this.cols && nextRows === this.rows) {
      return;
    }

    this.cols = nextCols;
    this.rows = nextRows;
    const size = this.cols * this.rows;
    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.canvas.style.width = `${Math.round(this.cols * this.cellWidth)}px`;
    this.canvas.style.height = `${Math.round(this.rows * this.lineHeight)}px`;
    this.luminance = new Float32Array(size);
    this.displacementX = new Float32Array(size);
    this.displacementY = new Float32Array(size);
    this.velocityX = new Float32Array(size);
    this.velocityY = new Float32Array(size);
    this.updateSourceLuminance();
    this.updateMetrics(true);
  }

  measureCellWidth() {
    const probe = document.createElement("span");
    probe.textContent = ".";
    probe.className = "ascii-hero__probe";
    this.root.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }

  measureColumns() {
    const maxColumns = Math.round(this.config.maxCols);
    const targetWidth = this.pre.clientWidth || this.root.clientWidth;
    let low = 12;
    let high = maxColumns;
    let best = low;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const prepared = getPreparedProbe(mid, this.font);
      const stats = layoutWithLines(prepared, targetWidth, this.lineHeight);
      const maxWidth = stats.lines[0]?.width ?? 0;
      if (stats.lineCount === 1 && maxWidth <= targetWidth) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return best;
  }

  measureDotBias() {
    const textColor = window.getComputedStyle(this.pre).color;
    const backgroundColor = window.getComputedStyle(this.root).backgroundColor;
    const textLuma = luminanceFromRgb(parseRgbChannels(textColor));
    const backgroundLuma = luminanceFromRgb(parseRgbChannels(backgroundColor));
    return textLuma >= backgroundLuma ? 1 : -1;
  }

  updateSourceLuminance() {
    this.context.clearRect(0, 0, this.cols, this.rows);
    this.context.drawImage(this.image, 0, 0, this.cols, this.rows);
    const imageData = this.context.getImageData(0, 0, this.cols, this.rows).data;
    for (let index = 0; index < this.luminance.length; index += 1) {
      const offset = index * 4;
      const red = imageData[offset];
      const green = imageData[offset + 1];
      const blue = imageData[offset + 2];
      this.luminance[index] = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    }
  }

  resetPhysics() {
    this.displacementX.fill(0);
    this.displacementY.fill(0);
    this.velocityX.fill(0);
    this.velocityY.fill(0);
  }

  stepPhysics() {
    let maxMotion = 0;
    for (let index = 0; index < this.luminance.length; index += 1) {
      this.velocityX[index] =
        (this.velocityX[index] - this.displacementX[index] * this.config.spring) *
        this.config.damping;
      this.velocityY[index] =
        (this.velocityY[index] - this.displacementY[index] * this.config.spring) *
        this.config.damping;
      this.displacementX[index] += this.velocityX[index];
      this.displacementY[index] += this.velocityY[index];

      const motion =
        Math.abs(this.velocityX[index]) +
        Math.abs(this.velocityY[index]) +
        Math.abs(this.displacementX[index]) +
        Math.abs(this.displacementY[index]);
      if (motion > maxMotion) {
        maxMotion = motion;
      }
    }
    return maxMotion;
  }

  sampleAt(col, row) {
    const index = row * this.cols + col;
    const displacedCol = clamp(
      Math.round(col + this.displacementX[index]),
      0,
      this.cols - 1,
    );
    const displacedRow = clamp(
      Math.round(row + this.displacementY[index]),
      0,
      this.rows - 1,
    );
    return this.luminance[displacedRow * this.cols + displacedCol];
  }

  render() {
    if (!this.isReady || this.cols === 0 || this.rows === 0) {
      return;
    }

    let output = "";
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const luminance = this.sampleAt(col, row);
        const signal = this.dotBias > 0 ? luminance : 1 - luminance;
        const dither = BAYER_4X4[(row % 4) * 4 + (col % 4)] - 0.5;
        const weightedSignal = clamp(
          signal * this.config.density + dither * 0.22 + 0.06,
          0,
          1,
        );
        output += weightedSignal >= this.config.threshold ? "." : " ";
      }
      if (row < this.rows - 1) {
        output += "\n";
      }
    }
    this.pre.textContent = output;
    this.updateMetrics(false);
  }

  updateMetrics(force) {
    const now = performance.now();
    if (!force && now - this.lastMetricsUpdate < 120) {
      return;
    }
    this.lastMetricsUpdate = now;
    this.metrics.cols = this.cols;
    this.metrics.rows = this.rows;
    this.metrics.chars = this.cols * this.rows;
    if (this.isDebugOpen) {
      this.metricsPre.textContent = JSON.stringify(this.getMetricsSnapshot(), null, 2);
    }
  }

  getMetricsSnapshot() {
    return {
      config: {
        density: round(this.config.density),
        threshold: round(this.config.threshold),
        interactionRadius: round(this.config.interactionRadius),
        force: round(this.config.force),
        spring: round(this.config.spring),
        damping: round(this.config.damping),
        fpsCap: round(this.config.fpsCap),
        maxCols: round(this.config.maxCols),
      },
      metrics: {
        cols: this.metrics.cols,
        rows: this.metrics.rows,
        chars: this.metrics.chars,
        frameMs: round(this.metrics.frameMs),
        fps: round(this.metrics.fps),
      },
    };
  }

  startLoop() {
    if (this.animationFrame !== 0) {
      return;
    }
    this.lastFrameTime = 0;
    this.animationFrame = window.requestAnimationFrame(this.loop);
  }

  stopLoop() {
    if (this.animationFrame === 0) {
      return;
    }
    window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  loop(timestamp) {
    const minFrameTime = 1000 / Math.max(1, this.config.fpsCap);
    if (this.lastFrameTime !== 0 && timestamp - this.lastFrameTime < minFrameTime) {
      this.animationFrame = window.requestAnimationFrame(this.loop);
      return;
    }

    const frameStart = performance.now();
    this.lastFrameTime = timestamp;
    const motion = this.stepPhysics();
    this.render();
    const frameMs = performance.now() - frameStart;
    this.metrics.frameMs = frameMs;
    this.metrics.fps = frameMs > 0 ? 1000 / frameMs : this.config.fpsCap;

    if (motion < 0.01) {
      this.stopLoop();
      return;
    }

    this.animationFrame = window.requestAnimationFrame(this.loop);
  }
}

async function initAsciiHero() {
  const root = document.querySelector(".ascii-hero");
  if (!root) {
    return;
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const hero = new AsciiHero(root);
  await hero.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAsciiHero, { once: true });
} else {
  initAsciiHero();
}
