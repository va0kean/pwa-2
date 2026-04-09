import "./styles.css";

const STATUS_FLOW = ["", "priority", "done"];
const STATUS_LABELS = {
  "": "Без статуса",
  priority: "Приоритетный",
  done: "Выполненный"
};
const STATUS_CLASS = {
  "": "status-empty",
  priority: "status-priority",
  done: "status-done"
};
const STATUS_SORT_ORDER = {
  "": 0,
  priority: 1,
  done: 2
};

const state = {
  articles: [],
  rows: [],
  filteredRows: [],
  sortKey: "category",
  sortDirection: "asc",
  query: "",
  statuses: loadStatuses()
};

const bodyEl = document.getElementById("articlesBody");
const searchInput = document.getElementById("searchInput");
const statsEl = document.getElementById("stats");
const dialogEl = document.getElementById("articleDialog");
const dialogTitleEl = document.getElementById("dialogTitle");
const dialogMetaEl = document.getElementById("dialogMeta");
const dialogTextEl = document.getElementById("dialogText");
const closeDialogBtn = document.getElementById("closeDialogBtn");

const articleById = new Map();

init().catch((error) => {
  console.error(error);
  statsEl.textContent = "Ошибка загрузки данных. Проверьте public/data/articles.json";
});

async function init() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW registration error", err);
    });
  }

  const response = await fetch("/data/articles.json", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить JSON: ${response.status}`);
  }

  const data = await response.json();
  state.articles = data.articles || [];

  for (const article of state.articles) {
    articleById.set(article.id, article);

    const categories = article.categories.length > 0 ? article.categories : ["Без категории"];
    for (const category of categories) {
      state.rows.push({
        articleId: article.id,
        category,
        author: article.author,
        title: article.title
      });
    }
  }

  bindEvents();
  filterSortAndRender();
}

function bindEvents() {
  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLocaleLowerCase("ru");
    filterSortAndRender();
  });

  document.querySelectorAll("th[data-sort-key]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sortKey;
      if (state.sortKey === key) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDirection = "asc";
      }
      filterSortAndRender();
    });
  });

  closeDialogBtn.addEventListener("click", () => dialogEl.close());
  dialogEl.addEventListener("click", (event) => {
    const rect = dialogEl.getBoundingClientRect();
    const isInDialog =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!isInDialog) {
      dialogEl.close();
    }
  });

  bodyEl.addEventListener("click", (event) => {
    const titleBtn = event.target.closest("button[data-open-id]");
    if (titleBtn) {
      openArticle(titleBtn.dataset.openId);
      return;
    }

    const statusBtn = event.target.closest("button[data-status-id]");
    if (statusBtn) {
      cycleStatus(statusBtn.dataset.statusId);
    }
  });
}

function filterSortAndRender() {
  const q = state.query;

  let rows = state.rows;
  if (q) {
    rows = rows.filter((row) => {
      const haystack = `${row.category} ${row.author} ${row.title}`.toLocaleLowerCase("ru");
      return haystack.includes(q);
    });
  }

  const direction = state.sortDirection === "asc" ? 1 : -1;
  rows = [...rows].sort((a, b) => {
    if (state.sortKey === "status") {
      const sa = STATUS_SORT_ORDER[state.statuses[a.articleId] || ""];
      const sb = STATUS_SORT_ORDER[state.statuses[b.articleId] || ""];
      if (sa !== sb) return (sa - sb) * direction;
      return a.title.localeCompare(b.title, "ru") * direction;
    }

    const first = (a[state.sortKey] || "").toString();
    const second = (b[state.sortKey] || "").toString();
    const result = first.localeCompare(second, "ru", { sensitivity: "base" });
    if (result !== 0) {
      return result * direction;
    }
    return a.title.localeCompare(b.title, "ru", { sensitivity: "base" }) * direction;
  });

  state.filteredRows = rows;
  renderRows();
  renderStats();
}

function renderRows() {
  bodyEl.textContent = "";

  const fragment = document.createDocumentFragment();
  for (const row of state.filteredRows) {
    const statusValue = state.statuses[row.articleId] || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.category)}</td>
      <td>${escapeHtml(row.author)}</td>
      <td>
        <button class="title-btn" data-open-id="${row.articleId}">${escapeHtml(row.title)}</button>
      </td>
      <td>
        <button class="status-btn ${STATUS_CLASS[statusValue]}" data-status-id="${row.articleId}">${STATUS_LABELS[statusValue]}</button>
      </td>
    `;

    fragment.appendChild(tr);
  }

  bodyEl.appendChild(fragment);
}

function renderStats() {
  const uniqueFiles = new Set(state.filteredRows.map((row) => row.articleId)).size;
  statsEl.textContent = `Файлов: ${state.articles.length} | Строк в таблице: ${state.filteredRows.length} | Уникальных в выборке: ${uniqueFiles}`;
}

function openArticle(articleId) {
  const article = articleById.get(articleId);
  if (!article) return;

  dialogTitleEl.textContent = article.title;
  dialogMetaEl.textContent = `Файл: ${article.id}.txt | Автор: ${article.author} | Категории: ${article.categories.join(", ")}`;
  dialogTextEl.textContent = article.content;
  dialogEl.showModal();
}

function cycleStatus(articleId) {
  const current = state.statuses[articleId] || "";
  const next = STATUS_FLOW[(STATUS_FLOW.indexOf(current) + 1) % STATUS_FLOW.length];

  if (next) {
    state.statuses[articleId] = next;
  } else {
    delete state.statuses[articleId];
  }

  saveStatuses(state.statuses);
  filterSortAndRender();
}

function loadStatuses() {
  try {
    const raw = localStorage.getItem("article-statuses");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStatuses(value) {
  localStorage.setItem("article-statuses", JSON.stringify(value));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
