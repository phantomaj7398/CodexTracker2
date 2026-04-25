const STORAGE_KEY = "tracker-pwa-state-v1";

const defaults = {
  numbers: [5, 10, 20, 50, 100, 200],
  categories: ["Food", "Shopping", "Travel", "Bills"],
  counts: {},
  selectedCategory: "Food",
  entries: []
};

let state = loadState();
let dragContext = null;

const numbersGrid = document.querySelector("#numbers-grid");
const categoriesGrid = document.querySelector("#categories-grid");
const summaryTotal = document.querySelector("#summary-total");
const summaryCategory = document.querySelector("#summary-category");
const saveButton = document.querySelector("#save-entry");
const entriesList = document.querySelector("#entries-list");
const addNumberButton = document.querySelector("#add-number");
const addCategoryButton = document.querySelector("#add-category");
const clearCountsButton = document.querySelector("#clear-counts");

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      ...defaults,
      ...parsed,
      numbers: Array.isArray(parsed?.numbers) ? parsed.numbers : defaults.numbers,
      categories: Array.isArray(parsed?.categories) ? parsed.categories : defaults.categories,
      counts: parsed?.counts && typeof parsed.counts === "object" ? parsed.counts : {},
      entries: Array.isArray(parsed?.entries) ? parsed.entries : []
    };
  } catch {
    return JSON.parse(JSON.stringify(defaults));
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function totalAmount() {
  return state.numbers.reduce((sum, number) => {
    const count = Number(state.counts[number] || 0);
    return sum + number * count;
  }, 0);
}

function formatAmount(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function render() {
  renderNumbers();
  renderCategories();
  renderSummary();
  renderEntries();
  persist();
}

function renderNumbers() {
  numbersGrid.innerHTML = "";
  state.numbers.forEach((number, index) => {
    const count = Number(state.counts[number] || 0);
    const item = document.createElement("div");
    item.className = `choice${count ? " selected" : ""}`;
    item.draggable = true;
    item.dataset.type = "numbers";
    item.dataset.index = String(index);

    const action = document.createElement("button");
    action.type = "button";
    action.className = "choice-action";
    action.setAttribute("aria-label", count ? `${number} selected ${count} times` : `Select ${number}`);
    action.innerHTML = `<span class="choice-main">${number}${count ? ` <span class="choice-count">x ${count}</span>` : ""}</span>`;
    action.addEventListener("click", () => {
      state.counts[number] = count + 1;
      render();
    });

    const tools = choiceTools(`Delete ${number}`);
    tools.deleteButton.addEventListener("click", () => deleteNumber(number));
    item.append(action, tools.wrap);
    attachDragEvents(item);
    numbersGrid.appendChild(item);
  });
}

function renderCategories() {
  categoriesGrid.innerHTML = "";
  if (!state.categories.includes(state.selectedCategory)) {
    state.selectedCategory = state.categories[0] || "";
  }

  state.categories.forEach((category, index) => {
    const item = document.createElement("div");
    item.className = `choice${category === state.selectedCategory ? " selected" : ""}`;
    item.draggable = true;
    item.dataset.type = "categories";
    item.dataset.index = String(index);

    const action = document.createElement("button");
    action.type = "button";
    action.className = "choice-action";
    action.setAttribute("aria-label", `Select ${category}`);
    action.innerHTML = `<span class="choice-main">${escapeHtml(category)}</span>`;
    action.addEventListener("click", () => {
      state.selectedCategory = category;
      render();
    });

    const tools = choiceTools(`Delete ${category}`);
    tools.deleteButton.addEventListener("click", () => deleteCategory(category));
    item.append(action, tools.wrap);
    attachDragEvents(item);
    categoriesGrid.appendChild(item);
  });
}

function choiceTools(deleteLabel) {
  const wrap = document.createElement("span");
  wrap.className = "choice-tools";

  const handle = document.createElement("span");
  handle.className = "drag-handle";
  handle.setAttribute("aria-hidden", "true");
  handle.textContent = "=";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "danger-button";
  deleteButton.setAttribute("aria-label", deleteLabel);
  deleteButton.title = deleteLabel;
  deleteButton.textContent = "x";

  wrap.append(handle, deleteButton);
  return { wrap, deleteButton };
}

function renderSummary() {
  const amount = totalAmount();
  summaryTotal.textContent = formatAmount(amount);
  summaryCategory.textContent = state.selectedCategory || "-";
  saveButton.disabled = amount <= 0 || !state.selectedCategory;
}

function renderEntries() {
  entriesList.innerHTML = "";
  if (!state.entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No entries";
    entriesList.appendChild(empty);
    return;
  }

  state.entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "entry";

    const amountInput = document.createElement("input");
    amountInput.type = "number";
    amountInput.inputMode = "decimal";
    amountInput.min = "0";
    amountInput.step = "0.01";
    amountInput.value = entry.amount;
    amountInput.setAttribute("aria-label", "Amount");
    amountInput.addEventListener("input", () => {
      entry.amount = Number(amountInput.value || 0);
      persist();
    });

    const categorySelect = document.createElement("select");
    categorySelect.setAttribute("aria-label", "Category");
    state.categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    });
    if (!state.categories.includes(entry.category)) {
      const option = document.createElement("option");
      option.value = entry.category;
      option.textContent = entry.category;
      categorySelect.appendChild(option);
    }
    categorySelect.value = entry.category;
    categorySelect.addEventListener("change", () => {
      entry.category = categorySelect.value;
      persist();
    });

    const time = document.createElement("div");
    time.className = "entry-time";
    time.textContent = formatDate(entry.createdAt);
    time.title = new Date(entry.createdAt).toLocaleString();

    row.append(amountInput, categorySelect, time);
    entriesList.appendChild(row);
  });
}

function addNumber() {
  const value = prompt("Number");
  if (value === null) return;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return;
  if (!state.numbers.includes(number)) {
    state.numbers.push(number);
  }
  render();
}

function addCategory() {
  const value = prompt("Category");
  if (value === null) return;
  const category = value.trim();
  if (!category) return;
  if (!state.categories.includes(category)) {
    state.categories.push(category);
  }
  state.selectedCategory = category;
  render();
}

function deleteNumber(number) {
  state.numbers = state.numbers.filter((item) => item !== number);
  delete state.counts[number];
  render();
}

function deleteCategory(category) {
  state.categories = state.categories.filter((item) => item !== category);
  if (state.selectedCategory === category) {
    state.selectedCategory = state.categories[0] || "";
  }
  render();
}

function saveEntry() {
  const amount = totalAmount();
  if (amount <= 0 || !state.selectedCategory) return;
  state.entries.unshift({
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()),
    amount,
    category: state.selectedCategory,
    createdAt: new Date().toISOString()
  });
  state.counts = {};
  render();
}

function resetCounts() {
  state.counts = {};
  render();
}

function attachDragEvents(element) {
  element.addEventListener("dragstart", (event) => {
    dragContext = {
      type: element.dataset.type,
      from: Number(element.dataset.index)
    };
    element.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
  });

  element.addEventListener("dragend", () => {
    dragContext = null;
    element.classList.remove("dragging");
  });

  element.addEventListener("dragover", (event) => {
    if (dragContext?.type === element.dataset.type) {
      event.preventDefault();
    }
  });

  element.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!dragContext || dragContext.type !== element.dataset.type) return;
    reorder(dragContext.type, dragContext.from, Number(element.dataset.index));
  });
}

function reorder(type, from, to) {
  if (from === to) return;
  const list = [...state[type]];
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  state[type] = list;
  render();
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

addNumberButton.addEventListener("click", addNumber);
addCategoryButton.addEventListener("click", addCategory);
saveButton.addEventListener("click", saveEntry);
clearCountsButton.addEventListener("click", resetCounts);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}

render();
