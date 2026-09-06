const SVG_NS = "http://www.w3.org/2000/svg";

const SERIES_COLORS = {
  omarchy: "#73a942",
  ai: "#9b6cff",
  tesla: "#e82127",
  ethereum: "#627eea",
  podcast: "#c2642f",
  "c-tangana": "#ad4b68",
  youtube: "#e62117",
  "league-of-legends": "#c89b3c",
  rosalia: "#d65a9b",
  "twenty-one-pilots": "#4c78b8",
  "el-rubius": "#8c4fd1",
  milei: "#4f9d9d",
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
  const points = signal.series.values.map((value, index) => {
    const date = dateFromSeries(signal, index);
    return {
      date,
      label: formatPeriod(date, signal.series.interval),
      value,
      partial: Boolean(signal.partialLast && index === signal.series.values.length - 1),
    };
  });

  if (!signal.displayUntil) return points;
  const cutoff = new Date(`${signal.displayUntil}T23:59:59Z`);
  return points.filter((point) => point.date <= cutoff);
}

function xForIndex(index, count) {
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  return chartPadding.left + (count <= 1 ? 0 : (index / (count - 1)) * plotWidth);
}

function yForValue(value) {
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  return chartHeight - chartPadding.bottom - (value / 100) * plotHeight;
}

function markerDateFromValue(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstIndexAtOrAfter(points, date) {
  const index = points.findIndex((point) => point.date >= date);
  return index < 0 ? points.length : index;
}

function lastIndexAtOrBefore(points, date) {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (points[index].date <= date) return index;
  }
  return -1;
}

function visibleMarkerIndex(points, date) {
  if (!date || !points.length || date < points[0].date || date > points[points.length - 1].date) {
    return -1;
  }
  return firstIndexAtOrAfter(points, date);
}

function pathForPoints(points, startIndex, endIndex) {
  return points.slice(startIndex, endIndex + 1).map((point, offset) => {
    const index = startIndex + offset;
    const command = offset === 0 ? "M" : "L";
    return `${command} ${xForIndex(index, points.length)} ${yForValue(point.value)}`;
  }).join(" ");
}

function appendChartMarker(svg, points, index, label, isEnd = false) {
  if (index < 0) return;
  const x = xForIndex(index, points.length);
  const markerVariant = isEnd ? " chart-marker--end" : "";
  const pointVariant = isEnd ? " chart-marker-point--end" : "";

  if (!isEnd) {
    svg.appendChild(makeSvgElement("rect", {
      class: "chart-marker-band",
      x: x - 7,
      y: chartPadding.top - 8,
      width: 14,
      height: chartHeight - chartPadding.top - chartPadding.bottom + 8,
      "aria-hidden": "true",
    }));
  }

  svg.appendChild(makeSvgElement("line", {
    class: `chart-marker${markerVariant}`,
    x1: x,
    x2: x,
    y1: chartPadding.top - 8,
    y2: chartHeight - chartPadding.bottom,
    "aria-hidden": "true",
  }));
  svg.appendChild(makeSvgElement("circle", {
    class: `chart-marker-point${pointVariant}`,
    cx: x,
    cy: yForValue(points[index].value),
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
  markerLabel.textContent = label || (isEnd ? "stopped" : "personal");
  svg.appendChild(markerLabel);
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

  const markerDate = markerDateFromValue(signal.personalInterestDate);
  const endMarkerDate = markerDateFromValue(signal.personalInterestEndDate);
  const markerIndex = visibleMarkerIndex(points, markerDate);
  const endMarkerIndex = visibleMarkerIndex(points, endMarkerDate);
  const interestStartIndex = markerDate
    ? firstIndexAtOrAfter(points, markerDate)
    : 0;
  const interestEndIndex = endMarkerDate
    ? lastIndexAtOrBefore(points, endMarkerDate)
    : points.length - 1;
  const hasInterestWindow = interestStartIndex >= 0
    && interestStartIndex < points.length
    && interestEndIndex >= interestStartIndex;

  if (hasInterestWindow) {
    svg.appendChild(makeSvgElement("path", {
      class: "chart-line chart-line--muted",
      d: pathForPoints(points, 0, points.length - 1),
      "aria-hidden": "true",
    }));
    svg.appendChild(makeSvgElement("path", {
      class: "chart-line",
      d: pathForPoints(points, interestStartIndex, interestEndIndex),
      "aria-hidden": "true",
    }));
  } else {
    svg.appendChild(makeSvgElement("path", {
      class: "chart-line",
      d: pathForPoints(points, 0, points.length - 1),
      "aria-hidden": "true",
    }));
  }

  points.forEach((point, index) => {
    const isActivePoint = !hasInterestWindow
      || (index >= interestStartIndex && index <= interestEndIndex);
    const circle = makeSvgElement("circle", {
      class: `chart-point${isActivePoint ? "" : " chart-point--muted"}`,
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

  appendChartMarker(svg, points, markerIndex, signal.markerLabel);
  appendChartMarker(svg, points, endMarkerIndex, signal.endMarkerLabel, true);

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

  let hoverIndex = markerIndex >= 0 ? markerIndex : Math.min(interestStartIndex, points.length - 1);

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
    readout.textContent = `${point.label} · ${point.value}/100${point.partial ? " · partial" : ""}`;
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

function createTrendCard(signal) {
  const points = buildPoints(signal);
  const card = document.createElement("article");
  card.className = "trend-card";
  card.dataset.category = signal.category;
  card.style.setProperty("--series-color", SERIES_COLORS[signal.id] || "var(--text-color)");

  const top = document.createElement("div");
  top.className = "trend-card__top";
  const heading = document.createElement("h3");
  heading.textContent = signal.label;

  const actions = document.createElement("div");
  actions.className = "trend-card__actions";
  if (signal.contextMarkdown) {
    const infoButton = document.createElement("button");
    infoButton.type = "button";
    infoButton.className = "trend-card__info";
    infoButton.dataset.info = signal.id;
    infoButton.setAttribute("aria-haspopup", "dialog");
    infoButton.setAttribute("aria-controls", "info-dialog");
    infoButton.setAttribute("aria-label", `Open context for ${signal.label}`);
    infoButton.title = `More context about ${signal.label}`;
    const infoIcon = makeSvgElement("svg", {
      viewBox: "0 0 24 24",
      "aria-hidden": "true",
      focusable: "false",
    });
    infoIcon.append(
      makeSvgElement("circle", { cx: 12, cy: 12, r: 9, fill: "none", stroke: "currentColor", "stroke-width": 2 }),
      makeSvgElement("circle", { cx: 12, cy: 7.5, r: 1.1, fill: "currentColor" }),
      makeSvgElement("line", { x1: 12, y1: 11, x2: 12, y2: 16.5, stroke: "currentColor", "stroke-width": 2 }),
    );
    infoButton.appendChild(infoIcon);
    actions.append(infoButton);
  }

  if (signal.aboutMarkdown) {
    const aboutButton = document.createElement("button");
    aboutButton.type = "button";
    aboutButton.className = "trend-card__about";
    aboutButton.dataset.about = signal.id;
    aboutButton.setAttribute("aria-haspopup", "dialog");
    aboutButton.setAttribute("aria-controls", "about-dialog");
    aboutButton.setAttribute("aria-label", `Explain what ${signal.label} is`);
    aboutButton.title = `What is ${signal.label}?`;
    const aboutIcon = makeSvgElement("svg", {
      viewBox: "0 0 24 24",
      "aria-hidden": "true",
      focusable: "false",
    });
    aboutIcon.append(
      makeSvgElement("circle", { cx: 12, cy: 12, r: 9, fill: "none", stroke: "currentColor", "stroke-width": 2 }),
      makeSvgElement("path", {
        d: "M9.4 9.2a2.65 2.65 0 1 1 4.46 1.92c-.88.77-1.86 1.24-1.86 2.55",
        fill: "none",
        stroke: "currentColor",
        "stroke-linecap": "round",
        "stroke-width": 2,
      }),
      makeSvgElement("circle", { cx: 12, cy: 17.1, r: 1, fill: "currentColor" }),
    );
    aboutButton.appendChild(aboutIcon);
    actions.append(aboutButton);
  }

  const sourceLink = document.createElement("a");
  sourceLink.className = "trend-card__source";
  sourceLink.href = signal.sourceUrl;
  sourceLink.target = "_blank";
  sourceLink.rel = "noreferrer";
  sourceLink.setAttribute("aria-label", `Open Google Trends source for ${signal.label}`);
  const sourceIcon = makeSvgElement("svg", {
    viewBox: "0 0 24 24",
    "aria-hidden": "true",
    focusable: "false",
  });
  sourceIcon.append(
    makeSvgElement("path", {
      d: "M14 4h6v6M20 4l-9 9M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5",
      fill: "none",
      stroke: "currentColor",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-width": 2,
    }),
  );
  sourceLink.appendChild(sourceIcon);
  actions.append(sourceLink);
  top.append(heading, actions);

  const chartFrame = document.createElement("div");
  chartFrame.className = "chart-frame";
  const readout = document.createElement("p");
  readout.className = "chart-readout";
  readout.setAttribute("aria-live", "polite");
  readout.textContent = "Hover the chart to inspect values.";
  chartFrame.append(drawChart(signal, points, readout), readout);

  card.append(top, chartFrame);
  return card;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeMarkdownUrl(url) {
  return /^(https?:\/\/|\/)/i.test(url) ? url : null;
}

function renderMarkdown(markdown) {
  const lines = markdown.trim().split(/\r?\n/);
  const output = [];
  let paragraph = [];
  let inList = false;

  const renderInline = (value) => {
    let html = escapeHtml(value);
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
      const safeUrl = safeMarkdownUrl(url);
      return safeUrl
        ? `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer">${label}</a>`
        : label;
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    return html;
  };

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!inList) return;
    output.push("</ul>");
    inList = false;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      return;
    }
    const heading = trimmed.match(/^###\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      output.push(`<h3>${renderInline(heading[1])}</h3>`);
      return;
    }
    const listItem = trimmed.match(/^[-*]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      if (!inList) {
        output.push("<ul>");
        inList = true;
      }
      output.push(`<li>${renderInline(listItem[1])}</li>`);
      return;
    }
    closeList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  closeList();
  return output.join("");
}

function setupFilters() {
  const list = document.getElementById("trend-list");
  const cards = [...list.querySelectorAll(".trend-card")];
  const filterButtons = [...document.querySelectorAll("[data-filter]")];

  const applyFilter = (filter, selectedButton) => {
    filterButtons.forEach((item) => {
      item.classList.toggle("is-active", item === selectedButton);
    });
    cards.forEach((card) => {
      card.classList.toggle("is-hidden", card.dataset.category !== filter);
    });
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyFilter(button.dataset.filter, button);
    });
  });

  const defaultButton = filterButtons.find((button) => button.dataset.filter === "technology") || filterButtons[0];
  if (defaultButton) applyFilter(defaultButton.dataset.filter, defaultButton);
}

function setupMethodDialog() {
  const dialog = document.getElementById("method-dialog");
  const openButton = document.getElementById("method-open");
  if (!dialog || !openButton) return;

  openButton.addEventListener("click", () => {
    openDialog(dialog);
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog && typeof dialog.close === "function") dialog.close();
  });
}

function openDialog(dialog) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function setupAboutDialog(signals) {
  const dialog = document.getElementById("about-dialog");
  const heading = document.getElementById("about-dialog-heading");
  const category = document.getElementById("about-dialog-category");
  const content = document.getElementById("about-dialog-content");
  if (!dialog || !heading || !category || !content) return;

  const signalsById = new Map(signals.map((signal) => [signal.id, signal]));
  document.querySelectorAll("[data-about]").forEach((button) => {
    button.addEventListener("click", () => {
      const signal = signalsById.get(button.dataset.about);
      if (!signal) return;
      heading.textContent = signal.label;
      category.textContent = `${signal.categoryLabel} · ABOUT THIS TOPIC`;
      content.innerHTML = renderMarkdown(signal.aboutMarkdown);
      openDialog(dialog);
    });
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog && typeof dialog.close === "function") dialog.close();
  });
}

function setupInfoDialog(signals) {
  const dialog = document.getElementById("info-dialog");
  const heading = document.getElementById("info-dialog-heading");
  const category = document.getElementById("info-dialog-category");
  const content = document.getElementById("info-dialog-content");
  if (!dialog || !heading || !category || !content) return;

  const signalsById = new Map(signals.map((signal) => [signal.id, signal]));
  document.querySelectorAll("[data-info]").forEach((button) => {
    button.addEventListener("click", () => {
      const signal = signalsById.get(button.dataset.info);
      if (!signal) return;
      heading.textContent = signal.label;
      category.textContent = `${signal.categoryLabel} · PERSONAL CONTEXT`;
      content.innerHTML = renderMarkdown(
        signal.contextMarkdown || "No personal context has been added for this topic yet.",
      );
      openDialog(dialog);
    });
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
    const signals = data.signals.filter(
      (signal) => signal.personalInterestDate && signal.personalInterestLabel,
    );
    if (signals.length !== data.signals.length) {
      console.warn("Some trend signals were hidden because they have no personal marker.");
    }
    trendList.replaceChildren(...signals.map(createTrendCard));
    setupFilters();
    setupMethodDialog();
    setupAboutDialog(signals);
    setupInfoDialog(signals);
    updateReadingProgress();
  } catch (error) {
    console.error(error);
    trendList.replaceChildren();
    const message = document.createElement("p");
    message.className = "error-state";
    message.textContent = "The snapshot could not be loaded. Run this page through a local HTTP server, not file://.";
    trendList.appendChild(message);
  }
}

window.addEventListener("scroll", updateReadingProgress, { passive: true });
window.addEventListener("resize", updateReadingProgress, { passive: true });
updateReadingProgress();
loadTrends();
