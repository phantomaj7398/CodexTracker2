const STORAGE_KEY = "tracker-pwa-state-v1";

const defaults = {
  numbers: [5, 10, 20, 50, 100, 200],
  categories: ["Food", "Shopping", "Travel", "Bills"],
  counts: {},
  selectedCategory: "Food",
  entries: []
};

let state = loadState();
let editMode = {
  numbers: false,
  categories: false
};

const numbersGrid = document.querySelector("#numbers-grid");
const categoriesGrid = document.querySelector("#categories-grid");
const summaryTotal = document.querySelector("#summary-total");
const summaryCategory = document.querySelector("#summary-category");
const saveButton = document.querySelector("#save-entry");
const entriesList = document.querySelector("#entries-list");
const editNumbersButton = document.querySelector("#edit-numbers");
const editCategoriesButton = document.querySelector("#edit-categories");
const numbersEditSheet = document.querySelector("#numbers-edit-sheet");
const categoriesEditSheet = document.querySelector("#categories-edit-sheet");
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
  renderEditSheets();
  renderSummary();
  renderEntries();
  persist();
}

function renderNumbers() {
  numbersGrid.innerHTML = "";
  state.numbers.forEach((number) => {
    const count = Number(state.counts[number] || 0);
    const item = document.createElement("div");
    item.className = `choice${count ? " selected" : ""}`;

    const action = document.createElement("button");
    action.type = "button";
    action.className = "choice-action";
    action.setAttribute("aria-label", count ? `${number} selected ${count} times` : `Select ${number}`);
    action.innerHTML = `<span class="choice-main">${number}</span>`;
    action.addEventListener("click", () => {
      state.counts[number] = count + 1;
      render();
    });

    item.append(action);
    if (count) {
      const badge = document.createElement("span");
      badge.className = "choice-badge";
      badge.textContent = `x${count}`;
      item.appendChild(badge);
    }
    numbersGrid.appendChild(item);
  });
}

function renderCategories() {
  categoriesGrid.innerHTML = "";
  if (!state.categories.includes(state.selectedCategory)) {
    state.selectedCategory = state.categories[0] || "";
  }

  state.categories.forEach((category) => {
    const item = document.createElement("div");
    item.className = `choice${category === state.selectedCategory ? " selected" : ""}`;

    const action = document.createElement("button");
    action.type = "button";
    action.className = "choice-action";
    action.setAttribute("aria-label", `Select ${category}`);
    action.innerHTML = `<span class="choice-main">${escapeHtml(category)}</span>`;
    action.addEventListener("click", () => {
      state.selectedCategory = category;
      render();
    });

    item.append(action);
    categoriesGrid.appendChild(item);
  });
}

function renderEditSheets() {
  editNumbersButton.textContent = editMode.numbers ? "Done" : "Edit";
  editNumbersButton.setAttribute("aria-expanded", String(editMode.numbers));
  editCategoriesButton.textContent = editMode.categories ? "Done" : "Edit";
  editCategoriesButton.setAttribute("aria-expanded", String(editMode.categories));

  renderEditSheet({
    sheet: numbersEditSheet,
    isOpen: editMode.numbers,
    type: "numbers",
    inputType: "number",
    inputMode: "decimal",
    placeholder: "Add number",
    values: state.numbers,
    onAdd: addNumber,
    onDelete: deleteNumber
  });

  renderEditSheet({
    sheet: categoriesEditSheet,
    isOpen: editMode.categories,
    type: "categories",
    inputType: "text",
    inputMode: "text",
    placeholder: "Add category",
    values: state.categories,
    onAdd: addCategory,
    onDelete: deleteCategory
  });
}

function renderEditSheet(config) {
  config.sheet.hidden = !config.isOpen;
  config.sheet.innerHTML = "";
  if (!config.isOpen) return;

  const form = document.createElement("form");
  form.className = "edit-add-row";

  const input = document.createElement("input");
  input.type = config.inputType;
  input.inputMode = config.inputMode;
  input.placeholder = config.placeholder;
  input.setAttribute("aria-label", config.placeholder);

  const add = document.createElement("button");
  add.type = "submit";
  add.className = "small-action";
  add.textContent = "Add";

  form.append(input, add);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    config.onAdd(input.value);
    input.value = "";
    input.focus();
  });

  const list = document.createElement("div");
  list.className = "edit-list";

  config.values.forEach((value, index) => {
    const row = document.createElement("div");
    row.className = "edit-row";

    const label = document.createElement("div");
    label.className = "edit-label";
    label.textContent = value;

    const up = document.createElement("button");
    up.type = "button";
    up.className = "small-action";
    up.textContent = "Up";
    up.disabled = index === 0;
    up.addEventListener("click", () => moveItem(config.type, index, index - 1));

    const down = document.createElement("button");
    down.type = "button";
    down.className = "small-action";
    down.textContent = "Down";
    down.disabled = index === config.values.length - 1;
    down.addEventListener("click", () => moveItem(config.type, index, index + 1));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "small-action remove-action";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => config.onDelete(value));

    row.append(label, up, down, remove);
    list.appendChild(row);
  });

  config.sheet.append(form, list);
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

function addNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return;
  if (!state.numbers.includes(number)) {
    state.numbers.push(number);
  }
  render();
}

function addCategory(value) {
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

function moveItem(type, from, to) {
  if (to < 0 || to >= state[type].length) return;
  reorder(type, from, to);
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

editNumbersButton.addEventListener("click", () => {
  editMode.numbers = !editMode.numbers;
  render();
});
editCategoriesButton.addEventListener("click", () => {
  editMode.categories = !editMode.categories;
  render();
});
saveButton.addEventListener("click", saveEntry);
clearCountsButton.addEventListener("click", resetCounts);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./" });
  });
}

render();
