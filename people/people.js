const INFO_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"></circle>
    <circle cx="12" cy="7.5" r="1.1" fill="currentColor"></circle>
    <line x1="12" y1="11" x2="12" y2="16.5" stroke="currentColor" stroke-width="2"></line>
  </svg>
`;

function normalizeSearchValue(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

function createPersonCard(person, index) {
  const card = document.createElement("article");
  card.className = "person-card";
  card.dataset.category = person.category;
  card.dataset.search = normalizeSearchValue(
    [
      person.name,
      person.shortName,
      person.category,
      person.categoryLabel,
      person.role,
      person.summary,
      person.bio,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const portraitFrame = document.createElement("div");
  portraitFrame.className = "person-card__portrait";

  const portrait = document.createElement("img");
  portrait.src = person.portrait;
  portrait.alt = person.portraitAlt;
  portrait.loading = index === 0 ? "eager" : "lazy";
  portrait.decoding = "async";
  if (person.portraitPosition) portrait.style.objectPosition = person.portraitPosition;

  portraitFrame.append(portrait);

  const body = document.createElement("div");
  body.className = "person-card__body";

  const categoryRow = document.createElement("div");
  categoryRow.className = "person-card__category-row";

  const category = document.createElement("p");
  category.className = "eyebrow person-card__category";
  category.textContent = person.categoryLabel;
  categoryRow.append(category);

  const headingRow = document.createElement("div");
  headingRow.className = "person-card__heading";

  const heading = document.createElement("h3");
  heading.textContent = person.name;

  if (person.bio || person.links?.length) {
    const infoButton = document.createElement("button");
    infoButton.type = "button";
    infoButton.className = "person-card__info";
    infoButton.dataset.person = person.id;
    infoButton.setAttribute("aria-label", `Read a short bio and links for ${person.name}`);
    infoButton.title = `More about ${person.shortName || person.name}`;
    infoButton.innerHTML = INFO_ICON;
    categoryRow.append(infoButton);
  }
  headingRow.append(heading);

  const role = document.createElement("p");
  role.className = "person-card__role";
  role.textContent = person.role;

  const summary = document.createElement("p");
  summary.className = "person-card__summary";
  summary.textContent = person.summary;

  body.append(categoryRow, headingRow, role, summary);
  card.append(portraitFrame, body);
  return card;
}

function openDialog(dialog) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDialogFromBackdrop(dialog) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog && typeof dialog.close === "function") dialog.close();
  });
}

function setupFilters(cards, emptyState) {
  const buttons = [...document.querySelectorAll("[data-filter]")];
  const searchInput = document.getElementById("people-search");
  let activeFilter = "all";
  let searchTerm = "";

  function updateResults() {
    let visibleCount = 0;

    cards.forEach((card) => {
      const matchesFilter = activeFilter === "all" || card.dataset.category === activeFilter;
      const matchesSearch = !searchTerm || card.dataset.search.includes(searchTerm);
      const shouldShow = matchesFilter && matchesSearch;
      card.classList.toggle("is-hidden", !shouldShow);
      card.hidden = !shouldShow;
      if (shouldShow) visibleCount += 1;
    });

    emptyState.hidden = visibleCount > 0;
    if (visibleCount === 0) {
      emptyState.textContent = searchTerm
        ? `No people match "${searchInput.value}".`
        : "No people in this category yet.";
    }
  }

  function applyFilter(filter, activeButton) {
    activeFilter = filter;
    buttons.forEach((button) => button.classList.toggle("is-active", button === activeButton));
    updateResults();
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => applyFilter(button.dataset.filter, button));
  });

  searchInput?.addEventListener("input", () => {
    searchTerm = normalizeSearchValue(searchInput.value.trim());
    updateResults();
  });

  applyFilter("all", buttons[0]);
}

function setupPersonDialog(people) {
  const dialog = document.getElementById("person-dialog");
  const heading = document.getElementById("person-dialog-heading");
  const category = document.getElementById("person-dialog-category");
  const content = document.getElementById("person-dialog-content");
  const peopleById = new Map(people.map((person) => [person.id, person]));

  document.querySelectorAll("[data-person]").forEach((button) => {
    button.addEventListener("click", () => {
      const person = peopleById.get(button.dataset.person);
      if (!person) return;
      heading.textContent = person.name;
      category.textContent = `${person.categoryLabel} · SHORT BIO`;
      const bio = document.createElement("p");
      bio.textContent = person.bio || "A short bio will be added soon.";
      const links = document.createElement("ul");
      links.className = "person-links";
      (person.links || []).forEach((link) => {
        const item = document.createElement("li");
        const anchor = document.createElement("a");
        anchor.href = link.url;
        anchor.target = "_blank";
        anchor.rel = "noreferrer";
        anchor.textContent = link.label;
        item.appendChild(anchor);
        links.appendChild(item);
      });
      content.replaceChildren(bio, links);
      openDialog(dialog);
    });
  });
  closeDialogFromBackdrop(dialog);
}

function setupDisclaimerDialog() {
  const button = document.getElementById("disclaimer-button");
  const dialog = document.getElementById("disclaimer-dialog");
  if (!button || !dialog) return;

  button.addEventListener("click", () => openDialog(dialog));
  closeDialogFromBackdrop(dialog);
}

function updateReadingProgress() {
  const progressBar = document.querySelector(".reading-progress");
  if (!progressBar) return;
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = `${scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0}%`;
}

async function loadPeople() {
  const peopleList = document.getElementById("people-list");
  try {
    const response = await fetch("people-data.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Collection request failed with ${response.status}`);
    const data = await response.json();
    const cards = data.people.map(createPersonCard);
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.setAttribute("role", "status");
    emptyState.hidden = true;
    peopleList.replaceChildren(...cards);
    peopleList.append(emptyState);
    setupFilters(cards, emptyState);
    setupPersonDialog(data.people);
    setupDisclaimerDialog();
    updateReadingProgress();
  } catch (error) {
    console.error(error);
    const message = document.createElement("p");
    message.className = "error-state";
    message.textContent = "The collection could not be loaded. Run this page through a local HTTP server, not file://.";
    peopleList.replaceChildren(message);
  }
}

window.addEventListener("scroll", updateReadingProgress, { passive: true });
window.addEventListener("resize", updateReadingProgress, { passive: true });
updateReadingProgress();
loadPeople();
