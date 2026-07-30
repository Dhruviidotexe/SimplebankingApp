/**
 * ABC Bank — Frontend Controller
 * ---------------------------------
 * Connects to the Flask API backend at http://127.0.0.1:5000/api
 */

const API_BASE = "http://127.0.0.1:5000/api";

const state = {
  activeTab: "dashboard",
  balance: 0.0,
  selectedFile: null,
  documents: [],
  transactions: [],
};

const formatCurrency = (value) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatTime = (date = new Date()) =>
  date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const tabIds = ["dashboard", "transactions", "kyc"];

function getElement(id) {
  return document.getElementById(id);
}

// ── API Helpers ────────────────────────────────────────────────────────────

async function apiFetch(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: { message: `Network error: ${error.message}` } };
  }
}

// ── Balance ────────────────────────────────────────────────────────────────

async function fetchBalance() {
  const result = await apiFetch("/balance");
  if (result.ok) {
    state.balance = result.data.balance;
    updateBalanceDisplay();
  } else {
    showNotification("error", "Could not load balance. Is the server running?");
  }
}

function updateBalanceDisplay() {
  const balanceDisplay = getElement("balance-display");
  balanceDisplay.textContent = formatCurrency(state.balance);
  balanceDisplay.dataset.balance = state.balance.toString();
}

// ── Tab Navigation ─────────────────────────────────────────────────────────

function showTab(tabId, { updateHash = true, moveFocus = true } = {}) {
  if (!tabIds.includes(tabId)) return;

  state.activeTab = tabId;

  document.querySelectorAll("[data-tab]").forEach((button) => {
    const isActive = button.dataset.tab === tabId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const isActive = panel.id === `content-${tabId}`;
    panel.hidden = !isActive;
    panel.classList.toggle("is-visible", isActive);
    panel.setAttribute("aria-hidden", String(!isActive));
  });

  if (updateHash) {
    window.history.replaceState(null, "", `#${tabId}`);
  }

  if (moveFocus) {
    getElement(`content-${tabId}`)?.focus({ preventScroll: true });
  }
}

// ── Loading State ──────────────────────────────────────────────────────────

function setActionLoading(button, isLoading) {
  if (!button) return;
  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
  button.dataset.originalLabel ??= button.innerHTML;
  if (isLoading) {
    button.innerHTML = '<i class="ti ti-loader-2" aria-hidden="true"></i><span>Processing...</span>';
  } else {
    button.innerHTML = button.dataset.originalLabel;
  }
}

// ── Transactions ───────────────────────────────────────────────────────────

async function fetchTransactions() {
  const result = await apiFetch("/transactions");
  if (result.ok) {
    state.transactions = result.data.transactions;
    renderTransactions();
  }
}

function renderTransactions() {
  const todayList = getElement("activity-today");
  const yesterdayList = document.querySelector(".activity-group:last-child .transaction-stack");
  if (!todayList) return;

  // Clear existing entries (keep the date dividers)
  todayList.replaceChildren();

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  state.transactions.forEach((txn) => {
    const txnDate = txn.timestamp.slice(0, 10);
    const isToday = txnDate === today;
    const isYesterday = txnDate === yesterday;

    // Only show today's & yesterday's transactions
    if (!isToday && !isYesterday) return;

    const row = document.createElement("article");
    row.className = "transaction-row glass-panel";

    const leading = document.createElement("div");
    leading.className = "transaction-leading";

    const isCredit = txn.type === "deposit";
    const tone = isCredit ? "credit" : "debit";
    const iconName = isCredit ? "arrow-down-left" : "arrow-up-right";

    const iconWrapper = document.createElement("span");
    iconWrapper.className = `transaction-icon transaction-icon-${tone}`;
    iconWrapper.setAttribute("aria-hidden", "true");
    iconWrapper.innerHTML = `<i class="ti ti-${iconName}"></i>`;

    const copy = document.createElement("div");
    const titleElement = document.createElement("h2");
    titleElement.textContent = txn.description || (isCredit ? "Deposit" : "Withdrawal");
    const metaElement = document.createElement("p");
    metaElement.textContent = `${isCredit ? "Credit" : "Debit"} · ${new Date(txn.timestamp).toLocaleString()}`;
    copy.append(titleElement, metaElement);
    leading.append(iconWrapper, copy);

    const trailing = document.createElement("div");
    trailing.className = "transaction-trailing";
    const amountElement = document.createElement("strong");
    amountElement.className = isCredit ? "amount-credit" : "";
    amountElement.textContent = `${txn.amount >= 0 ? "+" : ""}${formatCurrency(txn.amount)}`;
    const timeElement = document.createElement("span");
    timeElement.textContent = formatTime(new Date(txn.timestamp));
    trailing.append(amountElement, timeElement);

    row.append(leading, trailing);

    if (isToday) {
      todayList.append(row);
    } else if (isYesterday && yesterdayList && yesterdayList !== todayList) {
      yesterdayList.append(row);
    }
  });
}

function addTransaction({ title, meta, amount, icon, tone }) {
  // After a deposit/withdraw, we simply refresh the full transaction list from the backend.
  // This ensures consistency.
  fetchTransactions();
}

// ── Deposit / Withdraw Actions ─────────────────────────────────────────────

async function handleAction(type, form) {
  const amountInput = form?.querySelector('input[type="number"]');
  const amount = Number(amountInput?.value);
  const submitButton = form?.querySelector('button[type="submit"]');

  if (!Number.isFinite(amount) || amount <= 0) {
    showNotification("error", `Please enter a valid ${type} amount.`);
    amountInput?.focus();
    return;
  }

  if (type === "withdraw" && amount > state.balance) {
    showNotification("error", "Insufficient funds for this withdrawal.");
    amountInput?.focus();
    return;
  }

  setActionLoading(submitButton, true);

  const endpoint = type === "deposit" ? "/deposit" : "/withdraw";
  const result = await apiFetch(endpoint, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });

  setActionLoading(submitButton, false);

  if (result.ok) {
    state.balance = result.data.balance;
    updateBalanceDisplay();
    form.reset();
    showNotification("success", result.data.message);
    // Refresh transaction list from backend
    fetchTransactions();
  } else {
    state.balance = result.data.balance ?? state.balance;
    updateBalanceDisplay();
    showNotification("error", result.data.message);
  }
}

// ── Notifications ──────────────────────────────────────────────────────────

function showNotification(type, message) {
  const stack = getElement("notification-stack");
  if (!stack) return;

  const toast = document.createElement("div");
  const isSuccess = type === "success";
  toast.className = "toast";
  toast.style.setProperty("--toast-color", isSuccess ? "#22c55e" : "#f87171");
  toast.setAttribute("role", isSuccess ? "status" : "alert");

  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = `<i class="ti ti-${isSuccess ? "circle-check" : "alert-circle"}"></i>`;

  const copy = document.createElement("div");
  copy.className = "toast-copy";
  const title = document.createElement("strong");
  title.textContent = isSuccess ? "Success" : "Action needed";
  const body = document.createElement("span");
  body.textContent = message;
  copy.append(title, body);

  const close = document.createElement("button");
  close.className = "toast-close";
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss notification");
  close.innerHTML = '<i class="ti ti-x" aria-hidden="true"></i>';
  close.addEventListener("click", () => dismissNotification(toast));

  toast.append(icon, copy, close);
  stack.append(toast);

  window.setTimeout(() => dismissNotification(toast), 5000);
}

function dismissNotification(toast) {
  if (!toast || toast.classList.contains("is-leaving")) return;
  toast.classList.add("is-leaving");
  toast.addEventListener("animationend", () => toast.remove(), { once: true });
}

// ── KYC ────────────────────────────────────────────────────────────────────

async function fetchKycDocuments() {
  const result = await apiFetch("/kyc");
  if (result.ok) {
    state.documents = result.data.documents;
    renderDocuments();
  }
}

function renderDocuments() {
  const list = getElement("document-list");
  const count = getElement("saved-count");
  if (!list || !count) return;

  list.replaceChildren();
  count.textContent = `${state.documents.length} ${state.documents.length === 1 ? "file" : "files"}`;

  state.documents.forEach((documentItem) => {
    const chip = document.createElement("div");
    chip.className = "document-chip";
    chip.dataset.documentName = documentItem.name;

    const icon = document.createElement("i");
    icon.className = "ti ti-file-text";
    icon.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    const type = document.createElement("strong");
    type.textContent = documentItem.type;
    const name = document.createElement("small");
    name.textContent = documentItem.name;
    copy.append(type, name);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "chip-remove";
    remove.setAttribute("aria-label", `Remove ${documentItem.type}`);
    remove.innerHTML = '<i class="ti ti-x" aria-hidden="true"></i>';
    remove.addEventListener("click", async () => {
      // Delete via API
      const result = await apiFetch(`/kyc/${encodeURIComponent(documentItem.name)}`, {
        method: "DELETE",
      });
      if (result.ok) {
        state.documents = result.data.documents;
        renderDocuments();
        showNotification("success", `${documentItem.type} removed from your saved documents.`);
      } else {
        showNotification("error", result.data.message);
      }
    });

    chip.append(icon, copy, remove);
    list.append(chip);
  });
}

function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const maxFileSize = 5 * 1024 * 1024;
  if (file.size > maxFileSize) {
    event.target.value = "";
    state.selectedFile = null;
    getElement("upload-title").textContent = "Drop your file here";
    getElement("upload-subtitle").textContent = "File is larger than 5 MB. Please choose a smaller file.";
    showNotification("error", "Please choose a document smaller than 5 MB.");
    return;
  }

  state.selectedFile = file;
  getElement("upload-title").textContent = file.name;
  getElement("upload-subtitle").textContent = "File ready to submit for review.";
}

async function handleKycSubmit(form) {
  const typeInput = getElement("kyc-doc-type");
  const fileInput = getElement("file-upload");
  const type = typeInput.value;

  if (!type) {
    showNotification("error", "Please select a document type before uploading.");
    typeInput.focus();
    return;
  }

  if (!state.selectedFile) {
    showNotification("error", "Please choose a document file before submitting.");
    fileInput.focus();
    return;
  }

  const duplicate = state.documents.some((documentItem) => documentItem.type === type);
  if (duplicate) {
    showNotification("error", `${type} is already saved. Remove the old file before replacing it.`);
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  setActionLoading(submitButton, true);

  // Send to backend
  const result = await apiFetch("/kyc", {
    method: "POST",
    body: JSON.stringify({
      type: type,
      name: state.selectedFile.name,
    }),
  });

  setActionLoading(submitButton, false);

  if (result.ok) {
    state.documents = result.data.documents;
    renderDocuments();
    form.reset();
    state.selectedFile = null;
    getElement("upload-title").textContent = "Drop your file here";
    getElement("upload-subtitle").textContent = "or browse from your device · PDF, JPG, PNG up to 5 MB";
    showNotification("success", result.data.message);
  } else {
    showNotification("error", result.data.message);
  }
}

// ── Hash Routing ───────────────────────────────────────────────────────────

function handleHashChange() {
  const tabFromHash = window.location.hash.replace("#", "");
  showTab(tabIds.includes(tabFromHash) ? tabFromHash : "dashboard", {
    updateHash: false,
    moveFocus: false,
  });
}

// ── Event Binding ──────────────────────────────────────────────────────────

function bindEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.tab));
  });

  document.querySelectorAll("[data-tab-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showTab(link.dataset.tabLink);
    });
  });

  document.addEventListener("keydown", (event) => {
    const currentTab = document.activeElement?.closest("[role=tab]");
    if (!currentTab || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = tabIds.indexOf(currentTab.dataset.tab);
    const nextIndex =
      event.key === "ArrowRight"
        ? (currentIndex + 1) % tabIds.length
        : (currentIndex - 1 + tabIds.length) % tabIds.length;
    const nextTab = getElement(`tab-${tabIds[nextIndex]}`);
    nextTab.focus();
    showTab(tabIds[nextIndex], { moveFocus: false });
  });

  getElement("deposit-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleAction("deposit", event.currentTarget);
  });

  getElement("withdraw-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleAction("withdraw", event.currentTarget);
  });

  getElement("kyc-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleKycSubmit(event.currentTarget);
  });

  getElement("file-upload")?.addEventListener("change", handleFileSelect);

  document.querySelectorAll('[data-action="history"]').forEach((button) => {
    button.addEventListener("click", () => showTab("transactions"));
  });

  document.querySelectorAll('[data-action="goal"]').forEach((button) => {
    button.addEventListener("click", () =>
      showNotification("success", "Goal creation coming soon!")
    );
  });

  document.querySelectorAll('[data-action="filter"]').forEach((button) => {
    button.addEventListener("click", () =>
      showNotification("success", "Transaction filters coming soon.")
    );
  });

  document.querySelectorAll('[data-action="download"]').forEach((button) => {
    button.addEventListener("click", () =>
      showNotification("success", "Download export coming soon.")
    );
  });

  document.querySelectorAll('[data-action="older"]').forEach((button) => {
    button.addEventListener("click", () =>
      showNotification("success", "Older transactions will load from the backend later.")
    );
  });
}

// ── Initialisation ─────────────────────────────────────────────────────────

window.addEventListener("hashchange", handleHashChange);

document.addEventListener("DOMContentLoaded", async () => {
  // Initial data load from backend
  await Promise.all([fetchBalance(), fetchTransactions(), fetchKycDocuments()]);
  bindEvents();
  handleHashChange();
});
