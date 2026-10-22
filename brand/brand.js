import { displayImage } from "../assets/personal-style/image-rendering.js";

const formats = {
  linkedin: { src: "assets/banner-linkedin.png", width: 1584, height: 396, label: "LinkedIn" },
  x: { src: "assets/banner-x.png", width: 1500, height: 500, label: "X" },
  youtube: { src: "assets/banner-youtube.png", width: 2560, height: 1440, label: "YouTube" },
};
// All three device views come from the same approved full-size YouTube PNG.
const youtubeCrops = {
  mobile: { x: 508, y: 509, width: 1544, height: 422, label: "Mobile" },
  desktop: { x: 0, y: 509, width: 2560, height: 422, label: "Desktop" },
  tv: { x: 0, y: 0, width: 2560, height: 1440, label: "TV" },
};
const frame = document.querySelector(".brand-banner-preview");
const image = frame.querySelector("img");
const canvas = frame.querySelector("canvas");
const versionButtons = document.querySelectorAll("[data-format]");
const styleButtons = document.querySelectorAll("[data-style]");
let style = "current";
const sourcePath = () => `assets/banner-${format}${style === "colour-fade" ? "-colour-fade" : ""}.png`;
const viewButtons = document.querySelectorAll("[data-view]");
let format = "x";
let view = "mobile";
let scheduled = 0;
let lastSize = "";
let loadingVersion = 0;
let loadedSource = image.getAttribute("src");

function render() {
  if (scheduled) cancelAnimationFrame(scheduled);
  scheduled = requestAnimationFrame(() => {
    scheduled = 0;
    if (!image.complete || !image.naturalWidth || !frame.clientWidth || loadedSource !== sourcePath()) return;
    const dpr = window.devicePixelRatio || 1;
    const size = `${style}:${format}:${view}:${frame.clientWidth}:${dpr}`;
    if (lastSize === size) return;
    try {
      let source = image;
      if (format === "youtube") {
        const crop = youtubeCrops[view];
        source = Object.assign(document.createElement("canvas"), { width: crop.width, height: crop.height });
        source.getContext("2d").drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      }
      const filtered = displayImage(source, frame.clientWidth, dpr);
      canvas.width = filtered.width;
      canvas.height = filtered.height;
      canvas.getContext("2d").drawImage(filtered, 0, 0);
      canvas.hidden = false;
      lastSize = size;
    } catch {
      canvas.hidden = true;
    }
  });
}

function updateView() {
  const current = formats[format];
  const crop = format === "youtube" ? youtubeCrops[view] : current;
  // The frame follows the selected crop; the full original remains available as fallback.
  frame.style.aspectRatio = `${crop.width} / ${crop.height}`;
  frame.classList.toggle("is-cropped", format === "youtube" && view !== "tv");
  if (format === "youtube" && view !== "tv") {
    image.style.width = `${current.width / crop.width * 100}%`;
    image.style.height = `${current.height / crop.height * 100}%`;
    image.style.left = `${-crop.x / crop.width * 100}%`;
    image.style.top = `${-crop.y / crop.height * 100}%`;
  } else {
    for (const property of ["width", "height", "left", "top"]) image.style.removeProperty(property);
  }
  document.querySelector(".current-downloads").hidden = style !== "current";
  document.querySelector(".colour-downloads").hidden = style !== "colour-fade";
  styleButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.style === style)));
  image.alt = `${current.label} banner${format === "youtube" ? `, ${crop.label} crop` : ""}: ${style === "colour-fade" ? "colour mountains fading to black and white and halftone" : "monochrome mountains fading into halftone"} with orange corners`;
  document.querySelector(".youtube-views").hidden = format !== "youtube";
  document.querySelector(".youtube-note").hidden = format !== "youtube";
  versionButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.format === format)));
  viewButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.view === view)));
  render();
}

async function selectFormat(id) {
  format = id;
  const version = ++loadingVersion;
  canvas.hidden = true;
  lastSize = "";
  image.src = sourcePath();
  image.width = formats[id].width;
  image.height = formats[id].height;
  loadedSource = "";
  updateView();
  try {
    await image.decode();
    if (version !== loadingVersion) return;
    loadedSource = sourcePath();
    render();
  } catch {
    canvas.hidden = true;
  }
}

styleButtons.forEach(button => button.addEventListener("click", () => {
  style = button.dataset.style;
  selectFormat(format);
}));
document.querySelector(".banner-styles").hidden = false;
versionButtons.forEach(button => button.addEventListener("click", () => selectFormat(button.dataset.format)));
viewButtons.forEach(button => button.addEventListener("click", () => {
  view = button.dataset.view;
  canvas.hidden = true;
  lastSize = "";
  updateView();
}));
document.querySelector(".banner-versions").hidden = false;
image.addEventListener("load", () => {
  if (image.getAttribute("src") === sourcePath()) {
    loadedSource = sourcePath();
    render();
  }
});
window.addEventListener("resize", render, { passive: true });
if (typeof ResizeObserver !== "undefined") new ResizeObserver(render).observe(frame);
updateView();
