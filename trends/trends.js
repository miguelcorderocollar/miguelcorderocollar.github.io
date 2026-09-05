const SVG_NS = "http://www.w3.org/2000/svg";

const SERIES_COLORS = {
  omarchy: "#e8512a",
  ai: "#2862aa",
  tesla: "#8a5a44",
  marketing: "#68733b",
  podcast: "#7f4c79",
  "spanish-trap": "#ad4b68",
};

const chartWidth = 1000;
const chartHeight = 280;
const chartPadding = { top: 30, right: 36, bottom: 38, left: 42 };

function makeSvgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
  return element;
}

function dateFromSeries(signal, index) {
  const [year, month, day = 1] = signal.series.start.split("-").map(Number);
  if (signal.series.interval === "week") {
    return new Date(Date.UTC(year, month - 1, day + index * 7));
  }
  return new Date(Date.UTC(year, month - 1 + index, 1));
}

function formatPeriod(date, interval) {
  const options = interval === "week"
    ? { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }
    : { month: "short", year: "numeric", timeZone: "UTC" };
  return new Intl.DateTimeFormat("en", options).format(date);
}

function buildPoints(signal) {
  return signal.series.values.map((value, index) => {
    const date = dateFromSeries(signal, index);
    return {
      date,
      label: formatPeriod(date, signal.series.interval),
      value,
      partial: Boolean(signal.partialLast && index === signal.series.values.length - 1),
    };
  });
}

function xForIndex(index, count) {
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  return chartPadding.left + (count <= 1 ? 0 : (index / (count - 1)) * plotWidth);
}

function yForValue(value) {
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  return chartHeight - chartPadding.bottom - (value / 100) * plotHeight;
}

function drawChart(signal, points, readout) {
  const svg = makeSvgElement("svg", {
    class: "trend-chart",
    viewBox: `0 0 ${chartWidth} ${chartHeight}`,
    role: "img",
    "aria-labelledby": `${signal.id}-chart-title`,
  });
  const title = makeSvgElement("title", { id: `${signal.id}-chart-title` });
  title.textContent = `${signal.label} Google Trends interest over time`;
  svg.appendChild(title);

  [0, 50, 100].forEach((value) => {
    const y = yForValue(value);
    svg.appendChild(makeSvgElement("line", {
      class: "chart-grid",
      x1: chartPadding.left,
      x2: chartWidth - chartPadding.right,
      y1: y,
      y2: y,
    }));
    const label = makeSvgElement("text", {
      class: "chart-label",
      x: chartPadding.left - 10,
      y: y + 4,
      "text-anchor": "end",
    });
    label.textContent = value;
    svg.appendChild(label);
  });

  const markerDate = signal.personalInterestDate
    ? new Date(`${signal.personalInterestDate}T00:00:00Z`)
    : null;
  const markerIsVisible = markerDate && markerDate >= points[0].date && markerDate <= points[points.length - 1].date;
  let markerIndex = -1;

  if (markerIsVisible) {
    const markerPosition = points.findIndex((point) => point.date >= markerDate);
    markerIndex = markerPosition < 0 ? points.length - 1 : markerPosition;
    const x = xForIndex(markerIndex, points.length);
    svg.appendChild(makeSvgElement("rect", {
      class: "chart-marker-band",
      x: x - 7,
      y: chartPadding.top - 8,
      width: 14,
      height: chartHeight - chartPadding.top - chartPadding.bottom + 8,
      "aria-hidden": "true",
    }));
    svg.appendChild(makeSvgElement("line", {
      class: "chart-marker",
      x1: x,
      x2: x,
      y1: chartPadding.top - 8,
      y2: chartHeight - chartPadding.bottom,
      "aria-hidden": "true",
    }));
    svg.appendChild(makeSvgElement("circle", {
      class: "chart-marker-point",
      cx: x,
      cy: yForValue(points[markerIndex].value),
      r: 5,
      "aria-hidden": "true",
    }));
    const markerLabel = makeSvgElement("text", {
      class: "chart-marker-label",
      x: x > chartWidth - 190 ? x - 10 : x + 10,
      y: chartPadding.top - 13,
      "text-anchor": x > chartWidth - 190 ? "end" : "start",
      "aria-hidden": "true",
    });
    markerLabel.textContent = "my start";
    svg.appendChild(markerLabel);
  }

  const path = points.map((point, index) => {
    const command = index === 0 ? "M" : "L";
    return `${command} ${xForIndex(index, points.length)} ${yForValue(point.value)}`;
  }).join(" ");
  svg.appendChild(makeSvgElement("path", { class: "chart-line", d: path }));

  points.forEach((point, index) => {
    const circle = makeSvgElement("circle", {
      class: "chart-point",
      cx: xForIndex(index, points.length),
      cy: yForValue(point.value),
      r: points.length > 100 ? 2.7 : 4,
      tabindex: 0,
      "aria-label": `${point.label}, ${point.value}${point.partial ? ", partial" : ""}`,
    });
    const pointTitle = makeSvgElement("title");
    pointTitle.textContent = `${point.label}: ${point.value}${point.partial ? " (partial)" : ""}`;
    circle.appendChild(pointTitle);
    circle.addEventListener("focus", () => renderHover(index));
    svg.appendChild(circle);
  });

  [0, Math.floor((points.length - 1) / 2), points.length - 1]
    .filter((index, position, indexes) => indexes.indexOf(index) === position)
    .forEach((index) => {
      const label = makeSvgElement("text", {
        class: "chart-label",
        x: xForIndex(index, points.length),
        y: chartHeight - 10,
        "text-anchor": index === 0 ? "start" : index === points.length - 1 ? "end" : "middle",
      });
      label.textContent = points[index].label;
      svg.appendChild(label);
    });

  const crosshair = makeSvgElement("line", {
    class: "chart-crosshair",
    x1: chartPadding.left,
    x2: chartPadding.left,
    y1: chartPadding.top - 8,
    y2: chartHeight - chartPadding.bottom,
    visibility: "hidden",
    "aria-hidden": "true",
  });
  const focusPoint = makeSvgElement("circle", {
    class: "chart-focus-point",
    cx: chartPadding.left,
    cy: yForValue(points[0].value),
    r: 5,
    visibility: "hidden",
    "aria-hidden": "true",
  });
  svg.append(crosshair, focusPoint);

  let hoverIndex = markerIndex >= 0 ? markerIndex : 0;

  function renderHover(index) {
    hoverIndex = Math.max(0, Math.min(points.length - 1, index));
    const point = points[hoverIndex];
    const x = xForIndex(hoverIndex, points.length);
    crosshair.setAttribute("x1", x);
    crosshair.setAttribute("x2", x);
    focusPoint.setAttribute("cx", x);
    focusPoint.setAttribute("cy", yForValue(point.value));
    crosshair.setAttribute("visibility", "visible");
    focusPoint.setAttribute("visibility", "visible");
    readout.textContent = `${point.label} · ${point.value}/100${point.partial ? " · partial latest value" : ""}`;
    hitArea.setAttribute("aria-valuenow", point.value);
    hitArea.setAttribute("aria-valuetext", `${point.label}, ${point.value} out of 100`);
  }

  function hideHover() {
    if (document.activeElement !== hitArea) {
      crosshair.setAttribute("visibility", "hidden");
      focusPoint.setAttribute("visibility", "hidden");
    }
  }

  const hitArea = makeSvgElement("rect", {
    class: "chart-hit-area",
    x: chartPadding.left,
    y: chartPadding.top - 8,
    width: chartWidth - chartPadding.left - chartPadding.right,
    height: chartHeight - chartPadding.top - chartPadding.bottom + 8,
    tabindex: 0,
    role: "slider",
    "aria-label": `Inspect ${signal.label} values over time`,
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": points[hoverIndex].value,
    "aria-valuetext": `${points[hoverIndex].label}, ${points[hoverIndex].value} out of 100`,
  });

  hitArea.addEventListener("pointermove", (event) => {
    const bounds = svg.getBoundingClientRect();
    const viewX = (event.clientX - bounds.left) * (chartWidth / bounds.width);
    const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
    const ratio = Math.max(0, Math.min(1, (viewX - chartPadding.left) / plotWidth));
    renderHover(Math.round(ratio * (points.length - 1)));
  });
  hitArea.addEventListener("pointerdown", () => renderHover(hoverIndex));
  hitArea.addEventListener("pointerleave", hideHover);
  hitArea.addEventListener("focus", () => renderHover(hoverIndex));
  hitArea.addEventListener("keydown", (event) => {
    let nextIndex = hoverIndex;
    if (event.key === "ArrowLeft") nextIndex -= 1;
    if (event.key === "ArrowRight") nextIndex += 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = points.length - 1;
    if (nextIndex !== hoverIndex) {
      event.preventDefault();
      renderHover(nextIndex);
    }
  });
  svg.appendChild(hitArea);

  svg.addEventListener("mouseleave", hideHover);
  return svg;
}

function getStats(points) {
  const latest = points[points.length - 1];
  const peakValue = Math.max(...points.map((point) => point.value));
  const peakIndex = points.findIndex((point) => point.value === peakValue);
  return { latest, peakValue, peak: points[peakIndex] };
}

function createPersonalCopy(signal) {
  const paragraph = document.createElement("p");
  paragraph.className = "trend-card__personal";
  const hasMarker = Boolean(signal.personalInterestDate);
  const label = document.createElement("span");
  label.className = hasMarker ? "personal-marker" : "marker-missing";
  label.textContent = hasMarker
    ? `Personal marker · ${signal.personalInterestLabel}`
    : "No personal marker";
  paragraph.appendChild(label);
  return paragraph;
}

function createTrendCard(signal) {
  const points = buildPoints(signal);
  const { latest, peakValue, peak } = getStats(points);
  const card = document.createElement("article");
  card.className = "trend-card";
  card.dataset.category = signal.category;
  card.style.setProperty("--series-color", SERIES_COLORS[signal.id] || "var(--text-color)");

  const top = document.createElement("div");
  top.className = "trend-card__top";
  const heading = document.createElement("h3");
  heading.textContent = signal.label;
  const category = document.createElement("p");
  category.className = "trend-card__category";
  category.textContent = signal.categoryLabel;
  top.append(heading, category);

  const meta = document.createElement("div");
  meta.className = "trend-card__meta";
  [signal.geo || "Worldwide", signal.dateRange, signal.granularity].forEach((text) => {
    const item = document.createElement("span");
    item.textContent = text;
    meta.appendChild(item);
  });

  const stats = document.createElement("div");
  stats.className = "trend-card__stats";
  const latestStat = document.createElement("span");
  latestStat.innerHTML = `latest <strong>${latest.value}</strong>`;
  const peakStat = document.createElement("span");
  peakStat.textContent = `peak ${peakValue} · ${peak.label}`;
  stats.append(latestStat, peakStat);

  const chartFrame = document.createElement("div");
  chartFrame.className = "chart-frame";
  const readout = document.createElement("p");
  readout.className = "chart-readout";
  readout.setAttribute("aria-live", "polite");
  readout.textContent = "Hover the chart to inspect values.";
  chartFrame.append(drawChart(signal, points, readout), readout);

  const note = document.createElement("p");
  note.className = "trend-card__note";
  note.textContent = signal.note;

  const footer = document.createElement("div");
  footer.className = "trend-card__footer";
  const personal = createPersonalCopy(signal);
  const source = document.createElement("p");
  source.className = "trend-card__source";
  const sourceLink = document.createElement("a");
  sourceLink.href = signal.sourceUrl;
  sourceLink.target = "_blank";
  sourceLink.rel = "noreferrer";
  sourceLink.textContent = "source ↗";
  source.appendChild(sourceLink);
  footer.append(personal, source);

  card.append(top, meta, stats, chartFrame, note, footer);
  return card;
}

function setupFilters(signals) {
  const list = document.getElementById("trend-list");
  const cards = [...list.querySelectorAll(".trend-card")];
  const status = document.getElementById("filter-status");
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      const visibleCount = cards.filter((card) => {
        const visible = filter === "all" || card.dataset.category === filter;
        card.classList.toggle("is-hidden", !visible);
        return visible;
      }).length;
      status.textContent = `${visibleCount} signal${visibleCount === 1 ? "" : "s"} shown · ${filter === "all" ? "all categories" : filter}`;
    });
  });
  status.textContent = `${signals.length} signals shown · all categories`;
}

function setupMethodDialog() {
  const dialog = document.getElementById("method-dialog");
  const openButton = document.getElementById("method-open");
  if (!dialog || !openButton) return;

  openButton.addEventListener("click", () => {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog && typeof dialog.close === "function") dialog.close();
  });
}

function updateReadingProgress() {
  const progressBar = document.querySelector(".reading-progress");
  if (!progressBar) return;
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = `${scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0}%`;
}

async function loadTrends() {
  const trendList = document.getElementById("trend-list");
  try {
    const response = await fetch("trends-data.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Snapshot request failed with ${response.status}`);
    const data = await response.json();
    trendList.replaceChildren(...data.signals.map(createTrendCard));
    setupFilters(data.signals);
    setupMethodDialog();
    updateReadingProgress();
  } catch (error) {
    console.error(error);
    trendList.replaceChildren();
    const message = document.createElement("p");
    message.className = "error-state";
    message.textContent = "The snapshot could not be loaded. Run this page through a local HTTP server, not file://.";
    trendList.appendChild(message);
    document.getElementById("filter-status").textContent = "Snapshot unavailable";
  }
}

window.addEventListener("scroll", updateReadingProgress, { passive: true });
window.addEventListener("resize", updateReadingProgress, { passive: true });
updateReadingProgress();
loadTrends();
