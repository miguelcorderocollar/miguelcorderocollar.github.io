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
  return signal.series.values.map((value, index) => ({
    date: dateFromSeries(signal, index),
    label: formatPeriod(dateFromSeries(signal, index), signal.series.interval),
    value,
    partial: Boolean(signal.partialLast && index === signal.series.values.length - 1),
  }));
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
    const updateReadout = () => {
      readout.textContent = `${point.label} · ${point.value}/100${point.partial ? " · partial latest value" : ""}`;
    };
    circle.addEventListener("mouseenter", updateReadout);
    circle.addEventListener("focus", updateReadout);
    svg.appendChild(circle);
  });

  if (signal.personalInterestDate) {
    const markerDate = new Date(`${signal.personalInterestDate}T00:00:00Z`);
    const firstDate = points[0].date;
    const lastDate = points[points.length - 1].date;
    if (markerDate >= firstDate && markerDate <= lastDate) {
      const markerPosition = points.findIndex((point) => point.date >= markerDate);
      const index = markerPosition < 0 ? points.length - 1 : markerPosition;
      const x = xForIndex(index, points.length);
      svg.appendChild(makeSvgElement("line", {
        class: "chart-marker",
        x1: x,
        x2: x,
        y1: chartPadding.top - 8,
        y2: chartHeight - chartPadding.bottom,
      }));
      const markerLabel = makeSvgElement("text", {
        class: "chart-marker-label",
        x: x > chartWidth - 190 ? x - 8 : x + 8,
        y: chartPadding.top - 13,
        "text-anchor": x > chartWidth - 190 ? "end" : "start",
      });
      markerLabel.textContent = "personal marker";
      svg.appendChild(markerLabel);
    }
  }

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

  return svg;
}

function createSparkline(signal, points) {
  const svg = makeSvgElement("svg", { viewBox: "0 0 100 24", "aria-hidden": "true" });
  const path = points.map((point, index) => {
    const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * 100;
    const y = 22 - (point.value / 100) * 20;
    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  svg.appendChild(makeSvgElement("polyline", { points: path.replace(/[ML]/g, "").trim() }));
  return svg;
}

function getStats(points) {
  const latest = points[points.length - 1];
  const peakValue = Math.max(...points.map((point) => point.value));
  const peakIndex = points.findIndex((point) => point.value === peakValue);
  const change = latest.value - points[0].value;
  return { latest, peakValue, peak: points[peakIndex], change };
}

function createSummaryCard(signal, points) {
  const { latest, peakValue, peak, change } = getStats(points);
  const card = document.createElement("article");
  card.className = "summary-card";
  card.style.setProperty("--series-color", SERIES_COLORS[signal.id] || "var(--text-color)");

  const top = document.createElement("div");
  top.className = "summary-card__top";
  const label = document.createElement("p");
  label.className = "summary-card__label";
  label.textContent = signal.label;
  const category = document.createElement("span");
  category.textContent = signal.categoryLabel;
  top.append(label, category);

  const valueLine = document.createElement("div");
  valueLine.className = "summary-card__value-line";
  const value = document.createElement("p");
  value.className = "summary-card__value";
  value.textContent = latest.value;
  const context = document.createElement("p");
  context.className = "summary-card__context";
  context.textContent = `latest · peak ${peakValue}`;
  valueLine.append(value, context);

  const spark = createSparkline(signal, points);
  spark.className.baseVal = "summary-card__spark";
  const note = document.createElement("p");
  note.className = "summary-card__context";
  note.textContent = `${change >= 0 ? "+" : ""}${change} from first point · peak ${peak.label}`;

  card.append(top, valueLine, spark, note);
  return card;
}

function createPersonalCopy(signal) {
  const paragraph = document.createElement("p");
  paragraph.className = "trend-card__personal";
  const label = document.createElement("span");
  label.className = signal.personalInterestDate ? "personal-marker" : "marker-missing";
  label.textContent = signal.personalInterestDate
    ? `Personal marker · ${signal.personalInterestLabel}`
    : `Personal marker · ${signal.personalInterestLabel}`;
  paragraph.appendChild(label);
  return paragraph;
}

function createTrendCard(signal, index) {
  const points = buildPoints(signal);
  const stats = getStats(points);
  const card = document.createElement("article");
  card.className = `trend-card${index === 0 ? " is-featured" : ""}`;
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
  [
    `Google Trends · ${signal.geo || "Worldwide"}`,
    signal.dateRange,
    signal.granularity,
  ].forEach((text) => {
    const item = document.createElement("span");
    item.textContent = text;
    meta.appendChild(item);
  });

  const chartFrame = document.createElement("div");
  chartFrame.className = "chart-frame";
  const readout = document.createElement("p");
  readout.className = "chart-readout";
  readout.textContent = "Hover a point to read the value.";
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
  sourceLink.textContent = "Open source ↗";
  source.appendChild(sourceLink);
  footer.append(personal, source);

  card.append(top, meta, chartFrame, note, footer);
  card.dataset.latest = stats.latest.value;
  return card;
}

function renderSummary(signals) {
  const summaryGrid = document.getElementById("summary-grid");
  summaryGrid.replaceChildren(...signals.slice(0, 4).map((signal) => createSummaryCard(signal, buildPoints(signal))));
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
    renderSummary(data.signals);
    trendList.replaceChildren(...data.signals.map(createTrendCard));
    setupFilters(data.signals);
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
