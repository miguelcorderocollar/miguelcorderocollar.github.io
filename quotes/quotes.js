function normalizeSearchValue(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

const COPY_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="8" y="8" width="11" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="2"></rect>
    <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h3" fill="none" stroke="currentColor" stroke-width="2"></path>
  </svg>
`;

const CHECK_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"></path>
  </svg>
`;

const TRANSLATION_ICON = `<span class="quote-translation-glyph" aria-hidden="true">A文</span>`;

function quoteAsMarkdown(quote, text = quote.text) {
  const lines = text.split(/\r?\n/).map((line) => `> ${line}`).join("\n");
  return `${lines}\n>\n> — ${quote.author}, *${quote.source}*`;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
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
  if (!copied) throw new Error("Clipboard access is unavailable");
}

function createCopyButton(quote, getText = () => quote.text) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "quote-copy-button";
  button.innerHTML = COPY_ICON;
  button.title = "Copy quote as Markdown";
  button.setAttribute("aria-label", `Copy quote by ${quote.author} as Markdown`);

  button.addEventListener("click", async () => {
    try {
      await copyText(quoteAsMarkdown(quote, getText()));
      button.classList.add("is-copied");
      button.innerHTML = CHECK_ICON;
      button.title = "Copied as Markdown";
      button.setAttribute("aria-label", "Copied as Markdown");
      window.setTimeout(() => {
        button.classList.remove("is-copied");
        button.innerHTML = COPY_ICON;
        button.title = "Copy quote as Markdown";
        button.setAttribute("aria-label", `Copy quote by ${quote.author} as Markdown`);
      }, 1400);
    } catch (error) {
      console.error(error);
      button.title = "Could not copy quote";
    }
  });

  return button;
}

function createTranslationControl(quote, onToggle = () => {}) {
  if (!quote.originalText) return null;

  const control = document.createElement("span");
  control.className = "quote-translation";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "quote-translation-button";
  button.innerHTML = TRANSLATION_ICON;
  let showingOriginal = false;

  function updateButton() {
    const action = showingOriginal ? "Show English translation" : "Show original Spanish";
    button.title = action;
    button.setAttribute("aria-label", action);
    button.setAttribute("aria-pressed", String(showingOriginal));
  }

  button.addEventListener("click", () => {
    showingOriginal = !showingOriginal;
    updateButton();
    onToggle(showingOriginal);
  });

  updateButton();
  control.append(button);
  return control;
}

function createQuoteContents(quote, showOriginal = false) {
  const blockquote = document.createElement("blockquote");
  const text = document.createElement("p");
  text.textContent = showOriginal ? quote.originalText : quote.text;
  if (showOriginal) text.lang = "es";

  const footer = document.createElement("footer");
  const author = document.createElement("cite");
  author.className = "quote-author";
  author.textContent = quote.author;

  footer.append(author);
  blockquote.append(text, footer);
  return blockquote;
}

function createQuoteCard(quote) {
  const card = document.createElement("article");
  card.className = "quote-card";
  card.dataset.category = quote.category;
  card.dataset.search = normalizeSearchValue(
    [quote.text, quote.originalText, quote.author, quote.source, quote.categoryLabel].join(" "),
  );
  let showingOriginal = false;
  const translationControl = createTranslationControl(quote, (showOriginal) => {
    showingOriginal = showOriginal;
    card.querySelector("blockquote")?.replaceWith(createQuoteContents(quote, showingOriginal));
  });
  card.append(createQuoteContents(quote));
  if (translationControl) card.append(translationControl);
  card.append(createCopyButton(quote, () => (showingOriginal ? quote.originalText : quote.text)));
  return card;
}

function setupBrowseMode(cards) {
  const searchInput = document.getElementById("quote-search");
  const resultCount = document.getElementById("result-count");
  const emptyState = document.createElement("p");
  let searchTerm = "";

  emptyState.className = "empty-state";
  emptyState.setAttribute("role", "status");
  emptyState.hidden = true;
  document.getElementById("quote-list").append(emptyState);

  function updateResults() {
    let visibleCount = 0;
    cards.forEach((card) => {
      const matchesSearch = !searchTerm || card.dataset.search.includes(searchTerm);
      const shouldShow = matchesSearch;
      card.hidden = !shouldShow;
      card.classList.toggle("is-hidden", !shouldShow);
      if (shouldShow) visibleCount += 1;
    });

    resultCount.textContent = `${visibleCount} ${visibleCount === 1 ? "quote" : "quotes"}`;
    emptyState.hidden = visibleCount !== 0;
    if (!visibleCount) {
      emptyState.textContent = searchTerm
        ? `No quotes match "${searchInput.value}".`
        : "No quotes in the collection yet.";
    }
  }

  searchInput.addEventListener("input", () => {
    searchTerm = normalizeSearchValue(searchInput.value.trim());
    updateResults();
  });

  updateResults();
}

function setupModes() {
  const modeButtons = [...document.querySelectorAll("[data-mode]")];
  const browseMode = document.getElementById("browse-mode");
  const randomMode = document.getElementById("random-mode");
  const randomQuote = document.getElementById("random-quote");
  const randomPosition = document.getElementById("random-position");
  let quotes = [];
  let currentIndex = -1;

  function showRandomQuote() {
    if (!quotes.length) {
      randomQuote.textContent = "Loading the next quote...";
      return;
    }

    let nextIndex = currentIndex;
    if (quotes.length > 1) {
      while (nextIndex === currentIndex) nextIndex = Math.floor(Math.random() * quotes.length);
    } else {
      nextIndex = 0;
    }
    currentIndex = nextIndex;
    randomQuote.classList.remove("is-changing");
    void randomQuote.offsetWidth;
    const quote = quotes[currentIndex];
    let showingOriginal = false;
    const translationControl = createTranslationControl(quote, (showOriginal) => {
      showingOriginal = showOriginal;
      randomQuote.querySelector("blockquote")?.replaceWith(createQuoteContents(quote, showingOriginal));
    });
    randomQuote.replaceChildren(createQuoteContents(quote));
    if (translationControl) randomQuote.append(translationControl);
    randomQuote.append(createCopyButton(quote, () => (showingOriginal ? quote.originalText : quote.text)));
    randomQuote.classList.add("is-changing");
    randomPosition.textContent = `${String(currentIndex + 1).padStart(2, "0")} / ${String(quotes.length).padStart(2, "0")}`;
  }

  function setMode(mode) {
    const isBrowse = mode === "browse";
    browseMode.hidden = !isBrowse;
    randomMode.hidden = isBrowse;
    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    history.replaceState(null, "", isBrowse ? "#browse" : "#random");
    if (!isBrowse && currentIndex < 0) showRandomQuote();
  }

  modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  document.getElementById("another-quote").addEventListener("click", showRandomQuote);

  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || randomMode.hidden || event.target.matches("button, input")) return;
    event.preventDefault();
    showRandomQuote();
  });

  setMode(location.hash === "#random" ? "random" : "browse");

  return {
    setQuotes(nextQuotes) {
      quotes = nextQuotes;
      currentIndex = -1;
      if (!randomMode.hidden) showRandomQuote();
    },
  };
}

async function loadQuotes() {
  const quoteList = document.getElementById("quote-list");
  const modeController = setupModes();
  try {
    const response = await fetch("quotes-data.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Collection request failed with ${response.status}`);
    const data = await response.json();
    const cards = data.quotes.map(createQuoteCard);
    quoteList.replaceChildren(...cards);
    setupBrowseMode(cards);
    modeController.setQuotes(data.quotes);
  } catch (error) {
    console.error(error);
    const message = document.createElement("p");
    message.className = "error-state";
    message.textContent = "The collection could not be loaded. Run this page through a local HTTP server, not file://.";
    quoteList.replaceChildren(message);
  }
}

loadQuotes();
