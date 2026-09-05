const defaults = Object.freeze({
  cell: 3,
  minDot: 0.12,
  maxDot: 1.05,
  contrast: 1.75,
  brightness: 0.02,
  gamma: 0.85,
  levels: 9,
  roughness: 0.36,
  grain: 0.06,
  softness: 0.8,
  angle: 0,
  halftone: 1,
  ink: "#090909",
  paper: "#ffffff",
  invert: false,
});

const presets = {
  header: { ...defaults },
  newsprint: {
    ...defaults,
    cell: 6,
    minDot: 0.02,
    maxDot: 1.18,
    contrast: 1.65,
    brightness: 0.04,
    gamma: 0.8,
    levels: 6,
    roughness: 0.1,
    grain: 0.02,
    softness: 0.35,
    angle: 15,
  },
  soft: {
    ...defaults,
    cell: 5,
    minDot: 0.15,
    maxDot: 0.95,
    contrast: 0.95,
    brightness: 0.06,
    gamma: 1.05,
    levels: 16,
    roughness: 0.35,
    grain: 0.09,
    softness: 1.15,
    halftone: 0.78,
  },
  coarse: {
    ...defaults,
    cell: 17,
    minDot: 0,
    maxDot: 1.25,
    contrast: 1.85,
    brightness: -0.03,
    gamma: 0.7,
    levels: 4,
    roughness: 0.48,
    grain: 0.04,
    softness: 0.45,
    angle: -8,
  },
};

const numericKeys = [
  "cell",
  "minDot",
  "maxDot",
  "contrast",
  "brightness",
  "gamma",
  "levels",
  "roughness",
  "grain",
  "softness",
  "angle",
  "halftone",
];

const valueSuffix = {
  cell: " px",
  minDot: "x",
  maxDot: "x",
  contrast: "x",
  brightness: "",
  gamma: "",
  levels: "",
  roughness: "%",
  grain: "%",
  softness: " px",
  angle: " deg",
  halftone: "%",
};

const vertexSource = `
  attribute vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;

  uniform sampler2D u_image;
  uniform vec2 u_resolution;
  uniform float u_cell;
  uniform float u_min_dot;
  uniform float u_max_dot;
  uniform float u_contrast;
  uniform float u_brightness;
  uniform float u_gamma;
  uniform float u_levels;
  uniform float u_roughness;
  uniform float u_grain;
  uniform float u_softness;
  uniform float u_angle;
  uniform float u_halftone;
  uniform float u_invert;
  uniform vec3 u_ink;
  uniform vec3 u_paper;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  vec2 hash22(vec2 p) {
    float n = hash21(p);
    return vec2(n, hash21(p + n + 19.19));
  }

  mat2 rotate2d(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    vec2 center = u_resolution * 0.5;
    vec2 p = gl_FragCoord.xy - center;
    mat2 rotation = rotate2d(radians(u_angle));
    vec2 rotated = rotation * p;
    vec2 cell_id = floor(rotated / u_cell);
    vec2 cell_center = (cell_id + 0.5) * u_cell;
    vec2 sample_point = rotate2d(radians(-u_angle)) * cell_center + center;
    vec2 uv = clamp(sample_point / u_resolution, 0.0, 1.0);

    vec3 source = texture2D(u_image, uv).rgb;
    float luminance = dot(source, vec3(0.2126, 0.7152, 0.0722));
    luminance = clamp((luminance - 0.5) * u_contrast + 0.5 + u_brightness, 0.0, 1.0);
    luminance = pow(luminance, u_gamma);
    luminance = floor(luminance * (u_levels - 1.0) + 0.5) / (u_levels - 1.0);
    luminance = mix(luminance, 1.0 - luminance, u_invert);

    float random_value = hash21(cell_id);
    float radius_scale = mix(u_max_dot, u_min_dot, luminance);
    radius_scale *= 1.0 + (random_value - 0.5) * u_roughness * 0.34;
    float radius = u_cell * 0.5 * radius_scale;

    vec2 jitter = (hash22(cell_id + 7.31) - 0.5) * u_cell * u_roughness * 0.28;
    vec2 local = rotated - cell_center - jitter;
    float wobble = sin(local.x * 0.42 + random_value * 6.2831)
      * sin(local.y * 0.37 - random_value * 3.1415)
      * u_roughness * u_cell * 0.045;
    float distance_to_dot = length(local) + wobble;
    float dot_mask = 1.0 - smoothstep(radius - u_softness, radius + u_softness, distance_to_dot);

    vec3 continuous_tone = mix(u_ink, u_paper, luminance);
    vec3 dotted_tone = mix(u_paper, u_ink, dot_mask);
    vec3 color = mix(continuous_tone, dotted_tone, u_halftone);

    float paper_noise = (hash21(gl_FragCoord.xy + cell_id * 0.73) - 0.5) * u_grain;
    color += paper_noise;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

const shaderCards = new Set();
const controls = Object.fromEntries(
  [...document.querySelectorAll("[name]")].map((element) => [element.name, element]),
);
const configOutput = document.querySelector("#config-output");
const copyStatus = document.querySelector("#copy-status");
let statusTimer;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${message}`);
  }

  return shader;
}

function createProgram(gl) {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Shader linking failed: ${message}`);
  }

  return program;
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
}

function hashNoise(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function readConfig() {
  const config = {};

  for (const key of numericKeys) {
    config[key] = Number(controls[key].value);
  }

  config.ink = controls.ink.value;
  config.paper = controls.paper.value;
  config.invert = controls.invert.checked;
  return config;
}

function formatValue(key, value) {
  if (["roughness", "grain", "halftone"].includes(key)) {
    return `${Math.round(value * 100)}${valueSuffix[key]}`;
  }

  const input = controls[key];
  const decimals = input.step.includes(".") ? input.step.split(".")[1].length : 0;
  return `${Number(value).toFixed(decimals)}${valueSuffix[key]}`;
}

function writeConfig(config) {
  for (const key of numericKeys) {
    controls[key].value = config[key];
  }

  controls.ink.value = config.ink;
  controls.paper.value = config.paper;
  controls.invert.checked = config.invert;
  update();
}

function configFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const config = { ...defaults };

  for (const key of numericKeys) {
    if (params.has(key)) {
      const value = Number(params.get(key));
      const input = controls[key];
      config[key] = Number.isFinite(value)
        ? Math.min(Number(input.max), Math.max(Number(input.min), value))
        : defaults[key];
    }
  }

  if (/^#[0-9a-f]{6}$/i.test(`#${params.get("ink")}`)) config.ink = `#${params.get("ink")}`;
  if (/^#[0-9a-f]{6}$/i.test(`#${params.get("paper")}`)) config.paper = `#${params.get("paper")}`;
  if (params.has("invert")) config.invert = params.get("invert") === "1";
  return config;
}

function configUrl(config) {
  const url = new URL(window.location.href);
  url.search = "";

  for (const key of numericKeys) {
    url.searchParams.set(key, config[key]);
  }

  url.searchParams.set("ink", config.ink.slice(1));
  url.searchParams.set("paper", config.paper.slice(1));
  url.searchParams.set("invert", config.invert ? "1" : "0");
  return url.toString();
}

class ShaderCard {
  constructor(element) {
    this.element = element;
    this.canvas = element.querySelector("canvas");
    this.image = element.querySelector("img");
    this.source = element.dataset.src;
    this.gl = this.canvas.getContext("webgl", {
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });

    if (!this.gl) {
      this.context2d = this.canvas.getContext("2d", { willReadFrequently: true });
      document.querySelector("#renderer-status").innerHTML = '<span class="live-dot" aria-hidden="true"></span> Canvas fallback';
    }

    try {
      if (!this.gl) throw new Error("WebGL unavailable");
      this.setupGl();
    } catch (error) {
      if (!this.context2d) {
        this.context2d = this.canvas.getContext("2d", { willReadFrequently: true });
      }
      document.querySelector("#renderer-status").innerHTML = '<span class="live-dot" aria-hidden="true"></span> Canvas fallback';
      console.info("WebGL is unavailable. Using the CPU canvas renderer.");
    }

    this.image.addEventListener("load", () => this.onImageLoad());
    this.image.addEventListener("error", () => this.onImageError());
    this.image.src = this.source;

    this.resizeObserver = new ResizeObserver(() => this.draw(readConfig()));
    this.resizeObserver.observe(this.canvas);
    this.bindActions();
  }

  setupGl() {
    const gl = this.gl;
    this.program = createProgram(gl);
    gl.useProgram(this.program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const positionLocation = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    this.uniforms = {};
    [
      "u_resolution",
      "u_cell",
      "u_min_dot",
      "u_max_dot",
      "u_contrast",
      "u_brightness",
      "u_gamma",
      "u_levels",
      "u_roughness",
      "u_grain",
      "u_softness",
      "u_angle",
      "u_halftone",
      "u_invert",
      "u_ink",
      "u_paper",
    ].forEach((name) => {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    });

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  onImageLoad() {
    this.canvas.style.aspectRatio = `${this.image.naturalWidth} / ${this.image.naturalHeight}`;
    if (this.gl) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
    }

    this.ready = true;
    this.draw(readConfig());
  }

  onImageError() {
    this.element.querySelector(".media-stage").insertAdjacentHTML(
      "beforeend",
      '<p class="error-message">The source image could not be loaded.</p>',
    );
  }

  draw(config) {
    if (!this.ready) return;

    if (!this.gl) {
      this.drawFallback(config);
      return;
    }

    const gl = this.gl;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(this.canvas.clientWidth * pixelRatio));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * pixelRatio));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.u_resolution, width, height);
    gl.uniform1f(this.uniforms.u_cell, config.cell * pixelRatio);
    gl.uniform1f(this.uniforms.u_min_dot, config.minDot);
    gl.uniform1f(this.uniforms.u_max_dot, config.maxDot);
    gl.uniform1f(this.uniforms.u_contrast, config.contrast);
    gl.uniform1f(this.uniforms.u_brightness, config.brightness);
    gl.uniform1f(this.uniforms.u_gamma, config.gamma);
    gl.uniform1f(this.uniforms.u_levels, config.levels);
    gl.uniform1f(this.uniforms.u_roughness, config.roughness);
    gl.uniform1f(this.uniforms.u_grain, config.grain);
    gl.uniform1f(this.uniforms.u_softness, config.softness * pixelRatio);
    gl.uniform1f(this.uniforms.u_angle, config.angle);
    gl.uniform1f(this.uniforms.u_halftone, config.halftone);
    gl.uniform1f(this.uniforms.u_invert, config.invert ? 1 : 0);
    gl.uniform3fv(this.uniforms.u_ink, hexToRgb(config.ink));
    gl.uniform3fv(this.uniforms.u_paper, hexToRgb(config.paper));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  drawFallback(config) {
    const ctx = this.context2d;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(this.canvas.clientWidth * pixelRatio));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * pixelRatio));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    if (!this.pixelCanvas) {
      this.pixelCanvas = document.createElement("canvas");
      this.pixelContext = this.pixelCanvas.getContext("2d", { willReadFrequently: true });
    }

    if (this.pixelCanvas.width !== width || this.pixelCanvas.height !== height) {
      this.pixelCanvas.width = width;
      this.pixelCanvas.height = height;
      this.pixelContext.imageSmoothingEnabled = true;
    }

    this.pixelContext.clearRect(0, 0, width, height);
    this.pixelContext.drawImage(this.image, 0, 0, width, height);
    const pixels = this.pixelContext.getImageData(0, 0, width, height).data;
    const cell = config.cell * pixelRatio;
    const angle = (config.angle * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const diagonal = Math.hypot(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const ink = config.ink;
    const paper = config.paper;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, width, height);

    if (config.halftone < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - config.halftone;
      ctx.filter = `grayscale(1) contrast(${config.contrast})`;
      ctx.drawImage(this.image, 0, 0, width, height);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.fillStyle = ink;
    ctx.globalAlpha = config.halftone;

    for (let y = -diagonal / 2; y < diagonal / 2; y += cell) {
      for (let x = -diagonal / 2; x < diagonal / 2; x += cell) {
        const sourceX = Math.round(centerX + cos * x + sin * y);
        const sourceY = Math.round(centerY - sin * x + cos * y);
        if (sourceX < 0 || sourceX >= width || sourceY < 0 || sourceY >= height) continue;

        const pixelIndex = (sourceY * width + sourceX) * 4;
        let luminance = (pixels[pixelIndex] * 0.2126 + pixels[pixelIndex + 1] * 0.7152 + pixels[pixelIndex + 2] * 0.0722) / 255;
        luminance = Math.min(1, Math.max(0, (luminance - 0.5) * config.contrast + 0.5 + config.brightness));
        luminance = Math.pow(luminance, config.gamma);
        luminance = Math.round(luminance * (config.levels - 1)) / (config.levels - 1);
        if (config.invert) luminance = 1 - luminance;

        const seed = hashNoise(x / cell, y / cell);
        const radiusScale = Math.max(0, config.minDot + (config.maxDot - config.minDot) * (1 - luminance));
        const radius = cell * 0.5 * radiusScale * (1 + (seed - 0.5) * config.roughness * 0.34);
        const jitterX = (hashNoise(x / cell + 7.31, y / cell) - 0.5) * cell * config.roughness * 0.28;
        const jitterY = (hashNoise(x / cell, y / cell + 11.17) - 0.5) * cell * config.roughness * 0.28;

        ctx.beginPath();
        ctx.arc(x + cell / 2 + jitterX, y + cell / 2 + jitterY, Math.max(0, radius), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    if (config.grain > 0) {
      ctx.save();
      ctx.globalAlpha = config.grain * 0.2;
      ctx.fillStyle = ink;
      const speckCount = Math.round((width * height) / 900);
      for (let i = 0; i < speckCount; i += 1) {
        const speckX = hashNoise(i, 13.4) * width;
        const speckY = hashNoise(i, 71.8) * height;
        ctx.fillRect(speckX, speckY, pixelRatio, pixelRatio);
      }
      ctx.restore();
    }
  }

  bindActions() {
    this.element.addEventListener("click", async (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;

      if (action === "source") {
        const showSource = this.element.dataset.showSource !== "true";
        this.element.dataset.showSource = String(showSource);
        event.target.textContent = showSource ? "View shader" : "View source";
      }

      if (action === "save") {
        this.draw(readConfig());
        const link = document.createElement("a");
        const title = this.element.querySelector("h3").textContent.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        link.download = `${title}-halftone.png`;
        link.href = this.canvas.toDataURL("image/png");
        link.click();
      }

      if (action === "copy") {
        this.draw(readConfig());
        try {
          const blob = await new Promise((resolve) => this.canvas.toBlob(resolve, "image/png"));
          if (!blob || !navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
            throw new Error("Image clipboard unavailable");
          }
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setStatus("Image copied");
        } catch {
          setStatus("Copy image failed");
        }
      }

      if (action === "remove") {
        this.destroy();
      }
    });
  }

  destroy() {
    this.resizeObserver?.disconnect();
    if (this.source?.startsWith("blob:")) URL.revokeObjectURL(this.source);
    shaderCards.delete(this);
    this.element.remove();
  }
}

function setupCard(element) {
  const card = new ShaderCard(element);
  shaderCards.add(card);
  return card;
}

function setStatus(message) {
  window.clearTimeout(statusTimer);
  copyStatus.textContent = message;
  statusTimer = window.setTimeout(() => {
    copyStatus.textContent = "";
  }, 1800);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the older clipboard API for local-file previews.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

function update() {
  const config = readConfig();

  for (const key of numericKeys) {
    document.querySelector(`[data-output="${key}"]`).textContent = formatValue(key, config[key]);
  }

  configOutput.textContent = JSON.stringify(config, null, 2);
  document.documentElement.style.setProperty("--ink", config.ink);
  document.documentElement.style.setProperty("--paper", config.paper);
  shaderCards.forEach((card) => card.draw(config));

  document.querySelectorAll("[data-preset]").forEach((button) => {
    const preset = presets[button.dataset.preset];
    const matches = Object.keys(preset).every((key) => preset[key] === config[key]);
    button.setAttribute("aria-pressed", String(matches));
  });
}

Object.values(controls).forEach((control) => {
  if (control.matches("input[type='range'], input[type='color'], input[type='checkbox']")) {
    control.addEventListener("input", update);
  }
});

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => writeConfig(presets[button.dataset.preset]));
});

document.querySelector("#reset-button").addEventListener("click", () => writeConfig(defaults));

document.querySelector("#copy-settings").addEventListener("click", async () => {
  try {
    setStatus(await copyText(configOutput.textContent) ? "Copied" : "Copy failed");
  } catch {
    setStatus("Copy failed");
  }
});

document.querySelector("#copy-link").addEventListener("click", async () => {
  try {
    const url = configUrl(readConfig());
    const copied = await copyText(url);
    window.history.replaceState({}, "", url);
    setStatus(copied ? "Link copied" : "Copy failed");
  } catch {
    setStatus("Copy failed");
  }
});

document.querySelector("#upload-image").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const fragment = document.querySelector("#uploaded-card-template").content.cloneNode(true);
  const element = fragment.querySelector(".shader-card");
  element.dataset.src = URL.createObjectURL(file);
  element.querySelector("h3").textContent = file.name.replace(/\.[^.]+$/, "");
  document.querySelector(".results__heading").after(element);
  setupCard(element);
  event.target.value = "";
});

document.querySelectorAll(".shader-card").forEach(setupCard);
writeConfig(configFromUrl());
