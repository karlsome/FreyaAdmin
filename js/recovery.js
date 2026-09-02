const recoveryState = {
  data: [],
  page: 1,
  limit: 10,
  totalPages: 0,
  totalRows: 0,
  sortField: "recordedAt",
  sortDir: "desc",
  allProducts: [],
  selectedSebanggoArray: [],
  tempSelectedSebanggo: [],
  selectedRowIds: [],
  currentDetailId: null,
  currentDetail: null,
  currentLogs: [],
  isEditMode: false,
  currentUser: JSON.parse(localStorage.getItem("authUser") || "{}"),
  createResolvedProduct: null,
  createPressMatch: null,
  createExistingRecord: null,
  createProductCandidates: [],
  createPressCandidates: [],
  createRows: [],
  nextRowId: 0
};

const RECOVERY_EDIT_ROLES = ["係長", "課長", "部長", "admin"];

function initRecoveryPage() {
  recoveryState.selectedRowIds = [];
  recoveryState.currentDetailId = null;
  recoveryState.currentDetail = null;
  recoveryState.currentLogs = [];
  recoveryState.isEditMode = false;
  recoveryState.currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  recoveryState.createResolvedProduct = null;
  recoveryState.createPressMatch = null;
  recoveryState.createExistingRecord = null;
  recoveryState.createProductCandidates = [];
  recoveryState.createPressCandidates = [];

  setupRecoveryDateRange();
  loadRecoveryModelOptions();
  loadRecoveryFactoryOptions();
  loadRecoveryAllProducts();
  setupRecoveryFilters();
  initRecoveryPagination();
  updateRecoverySummary({
    totalEntries: 0,
    totalRecoveredQty: 0,
    affectedLots: 0,
    affectedProducts: 0,
    affectedFactories: 0,
    distinctDefectTypes: 0
  });
  renderRecoveryTable([]);
  updateRecoverySelectionUi();
  loadRecoveryData();
}

function setupRecoveryDateRange() {
  const rangeSelect = document.getElementById("recoveryRangeSelect");
  const fromInput = document.getElementById("recoveryFromDate");
  const toInput = document.getElementById("recoveryToDate");
  const refreshBtn = document.getElementById("recoveryRefreshBtn");

  if (!rangeSelect || !fromInput || !toInput) {
    return;
  }

  const applyRange = () => {
    const today = new Date();
    const value = rangeSelect.value;
    let start = new Date(today);
    let end = new Date(today);

    switch (value) {
      case "today":
        break;
      case "last7":
        start.setDate(today.getDate() - 6);
        break;
      case "last30":
        start.setDate(today.getDate() - 29);
        break;
      case "last90":
        start.setDate(today.getDate() - 89);
        break;
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "lastMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "custom":
      default:
        updateRecoveryDateRangeDisplay(fromInput.value, toInput.value);
        return;
    }

    fromInput.value = formatRecoveryDateInput(start);
    toInput.value = formatRecoveryDateInput(end);
    updateRecoveryDateRangeDisplay(fromInput.value, toInput.value);
  };

  rangeSelect.addEventListener("change", () => {
    applyRange();
    resetRecoveryPage();
    loadRecoveryData();
  });
  fromInput.addEventListener("change", () => {
    updateRecoveryDateRangeDisplay(fromInput.value, toInput.value);
    if (rangeSelect.value === "custom") {
      resetRecoveryPage();
      loadRecoveryData();
    }
  });
  toInput.addEventListener("change", () => {
    updateRecoveryDateRangeDisplay(fromInput.value, toInput.value);
    if (rangeSelect.value === "custom") {
      resetRecoveryPage();
      loadRecoveryData();
    }
  });
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      updateRecoveryDateRangeDisplay(fromInput.value, toInput.value);
      resetRecoveryPage();
      loadRecoveryData();
    });
  }

  applyRange();
}

async function loadRecoveryModelOptions() {
  const modelSelect = document.getElementById("recoveryModelFilter");
  if (!modelSelect) {
    return;
  }

  const loadingText = (typeof t === "function") ? t("loading") : "Loading...";
  modelSelect.innerHTML = `<option value="">${loadingText}</option>`;
  modelSelect.disabled = true;

  try {
    const baseUrl = typeof BASE_URL !== "undefined" ? BASE_URL : (window.BASE_URL || "http://localhost:3000/");
    const response = await fetch(`${baseUrl}api/masterdb/models`);
    const data = await response.json();

    const allModelsText = (typeof t === "function") ? t("allModels") : "All Models";
    if (response.ok && data.success && Array.isArray(data.data)) {
      modelSelect.innerHTML = [`<option value="">${allModelsText}</option>`, ...data.data.map(model => `<option value="${model}">${model}</option>`)].join("");
    } else {
      modelSelect.innerHTML = `<option value="">${allModelsText}</option>`;
    }
  } catch (error) {
    console.error("Failed to load recovery model options:", error);
    const allModelsText = (typeof t === "function") ? t("allModels") : "All Models";
    modelSelect.innerHTML = `<option value="">${allModelsText}</option>`;
  } finally {
    modelSelect.disabled = false;
  }
}

async function loadRecoveryFactoryOptions() {
  const factorySelect = document.getElementById("recoveryFactoryFilter");
  if (!factorySelect) {
    return;
  }

  const loadingText = (typeof t === "function") ? t("loading") : "Loading...";
  factorySelect.innerHTML = `<option value="">${loadingText}</option>`;
  factorySelect.disabled = true;

  try {
    const baseUrl = typeof BASE_URL !== "undefined" ? BASE_URL : (window.BASE_URL || "http://localhost:3000/");
    const response = await fetch(`${baseUrl}api/factories/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collections: ["pressDB", "slitDB", "SRSDB", "kensaDB"] })
    });
    const data = await response.json();
    const allFactoriesText = (typeof t === "function") ? t("allFactories") : "All Factories";

    if (response.ok && data.success && data.results) {
      const factorySet = new Set();
      Object.values(data.results).forEach(result => {
        (result.factories || []).forEach(factory => {
          if (factory && String(factory).trim()) {
            factorySet.add(String(factory).trim());
          }
        });
      });
      const factories = Array.from(factorySet).sort();
      factorySelect.innerHTML = [`<option value="">${allFactoriesText}</option>`, ...factories.map(entry => `<option value="${entry}">${entry}</option>`)].join("");
    } else {
      factorySelect.innerHTML = `<option value="">${allFactoriesText}</option>`;
    }
  } catch (error) {
    console.error("Failed to load recovery factory options:", error);
    const allFactoriesText = (typeof t === "function") ? t("allFactories") : "All Factories";
    factorySelect.innerHTML = `<option value="">${allFactoriesText}</option>`;
  } finally {
    factorySelect.disabled = false;
  }
}

async function loadRecoveryAllProducts() {
  try {
    const baseUrl = typeof BASE_URL !== "undefined" ? BASE_URL : (window.BASE_URL || "http://localhost:3000/");
    const response = await fetch(`${baseUrl}api/masterdb/products`);
    const data = await response.json();
    recoveryState.allProducts = response.ok && data.success && Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    console.error("Failed to load recovery products:", error);
    recoveryState.allProducts = [];
  }
}

function setupRecoveryFilters() {
  const filterTypeSelect = document.getElementById("recoveryFilterType");
  const modelSelect = document.getElementById("recoveryModelFilter");
  const factorySelect = document.getElementById("recoveryFactoryFilter");

  if (filterTypeSelect) {
    filterTypeSelect.addEventListener("change", handleRecoveryFilterTypeChange);
  }
  if (modelSelect) {
    modelSelect.addEventListener("change", handleRecoveryModelFilter);
  }
  if (factorySelect) {
    factorySelect.addEventListener("change", () => {
      resetRecoveryPage();
      loadRecoveryData();
    });
  }
}

function handleRecoveryFilterTypeChange() {
  const filterType = document.getElementById("recoveryFilterType")?.value;
  const modelContainer = document.getElementById("recoveryModelFilterContainer");
  const sebanggoContainer = document.getElementById("recoverySebanggoFilterContainer");

  if (filterType === "model") {
    if (modelContainer) modelContainer.style.display = "block";
    if (sebanggoContainer) sebanggoContainer.style.display = "none";
  } else {
    if (modelContainer) modelContainer.style.display = "none";
    if (sebanggoContainer) sebanggoContainer.style.display = "block";
  }

  recoveryState.selectedSebanggoArray = [];
  updateRecoverySelectedProductsDisplay();
  resetRecoveryPage();
  loadRecoveryData();
}

function handleRecoveryModelFilter() {
  const selectedModel = document.getElementById("recoveryModelFilter")?.value || "";
  if (selectedModel) {
    recoveryState.selectedSebanggoArray = recoveryState.allProducts
      .filter(product => product.モデル === selectedModel)
      .map(product => product.背番号)
      .filter(Boolean);
  } else {
    recoveryState.selectedSebanggoArray = [];
  }
  updateRecoverySelectedProductsDisplay();
  resetRecoveryPage();
  loadRecoveryData();
}

function openRecoverySebanggoSelector() {
  recoveryState.tempSelectedSebanggo = [...recoveryState.selectedSebanggoArray];
  document.getElementById("recoverySebanggoSelectorModal")?.classList.remove("hidden");
  renderRecoverySebanggoList();
}

function closeRecoverySebanggoSelector() {
  document.getElementById("recoverySebanggoSelectorModal")?.classList.add("hidden");
}

function confirmRecoverySebanggoSelection() {
  recoveryState.selectedSebanggoArray = [...recoveryState.tempSelectedSebanggo];
  updateRecoverySelectedProductsDisplay();
  closeRecoverySebanggoSelector();
  resetRecoveryPage();
  loadRecoveryData();
}

function renderRecoverySebanggoList() {
  const container = document.getElementById("recoverySebanggoListContainer");
  if (!container) {
    return;
  }

  const searchTerm = (document.getElementById("recoverySebanggoSearch")?.value || "").toLowerCase();
  const filterType = document.getElementById("recoveryFilterType")?.value;
  const selectedModel = document.getElementById("recoveryModelFilter")?.value;
  const filteredProducts = recoveryState.allProducts
    .filter(product => {
      const matchesModel = !selectedModel || filterType !== "model" || product.モデル === selectedModel;
      const matchesSearch =
        String(product.背番号 || "").toLowerCase().includes(searchTerm) ||
        String(product.品番 || "").toLowerCase().includes(searchTerm) ||
        String(product.モデル || "").toLowerCase().includes(searchTerm);
      return matchesModel && matchesSearch;
    })
    .sort((a, b) => String(a.背番号 || "").localeCompare(String(b.背番号 || "")));

  container.innerHTML = filteredProducts.map(product => {
    const ban = String(product.背番号 || "");
    const isSelected = recoveryState.tempSelectedSebanggo.includes(ban);
    return `
      <label class="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
        <input type="checkbox" ${isSelected ? "checked" : ""} onchange="toggleRecoverySebanggoSelection('${escapeRecoveryAttribute(ban)}')" class="w-3.5 h-3.5" />
        <div class="flex-1">
          <div class="text-sm font-medium text-gray-900">${escapeRecoveryHtml(ban)}</div>
          <div class="text-xs text-gray-500">${escapeRecoveryHtml(product.品番 || "")} • ${escapeRecoveryHtml(product.モデル || "")}</div>
        </div>
      </label>
    `;
  }).join("");
}

function filterRecoverySebanggoList() {
  renderRecoverySebanggoList();
}

function toggleRecoverySebanggoSelection(sebanggo) {
  const index = recoveryState.tempSelectedSebanggo.indexOf(sebanggo);
  if (index > -1) {
    recoveryState.tempSelectedSebanggo.splice(index, 1);
  } else {
    recoveryState.tempSelectedSebanggo.push(sebanggo);
  }
}

function checkAllRecoverySebanggo() {
  recoveryState.tempSelectedSebanggo = getRecoveryVisibleSebanggoList();
  renderRecoverySebanggoList();
}

function uncheckAllRecoverySebanggo() {
  recoveryState.tempSelectedSebanggo = [];
  renderRecoverySebanggoList();
}

function getRecoveryVisibleSebanggoList() {
  const searchTerm = (document.getElementById("recoverySebanggoSearch")?.value || "").toLowerCase();
  const filterType = document.getElementById("recoveryFilterType")?.value;
  const selectedModel = document.getElementById("recoveryModelFilter")?.value;

  return recoveryState.allProducts
    .filter(product => {
      const matchesModel = !selectedModel || filterType !== "model" || product.モデル === selectedModel;
      const matchesSearch =
        String(product.背番号 || "").toLowerCase().includes(searchTerm) ||
        String(product.品番 || "").toLowerCase().includes(searchTerm) ||
        String(product.モデル || "").toLowerCase().includes(searchTerm);
      return matchesModel && matchesSearch;
    })
    .map(product => product.背番号)
    .filter(Boolean);
}

function updateRecoverySelectedProductsDisplay() {
  const display = document.getElementById("recoverySelectedProductsDisplay");
  const tags = document.getElementById("recoverySelectedProductsTags");
  const count = document.getElementById("recoverySelectedCount");
  const selectedProductsText = (typeof t === "function") ? t("selectedProducts") : "Selected Products";
  const noneSelectedText = (typeof t === "function") ? t("noneSelected") : "None selected";

  if (recoveryState.selectedSebanggoArray.length === 0) {
    if (display) display.textContent = noneSelectedText;
    if (tags) tags.innerHTML = "";
    if (count) count.textContent = (typeof t === "function") ? t("selectProducts") : "Select products...";
    return;
  }

  if (display) {
    display.textContent = `${recoveryState.selectedSebanggoArray.length} ${selectedProductsText.toLowerCase()}`;
  }
  if (count) {
    count.textContent = `${recoveryState.selectedSebanggoArray.length} selected`;
  }
  if (tags) {
    const visibleTags = recoveryState.selectedSebanggoArray.slice(0, 10).map(sebanggo => `
      <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
        ${escapeRecoveryHtml(sebanggo)}
        <button onclick="removeRecoverySebanggoFromSelection('${escapeRecoveryAttribute(sebanggo)}')" class="hover:text-blue-600">
          <i class="ri-close-line"></i>
        </button>
      </span>
    `).join("");
    const overflowTag = recoveryState.selectedSebanggoArray.length > 10 ? `
      <button onclick="openRecoverySebanggoSelector()" class="text-gray-500 text-sm hover:text-gray-700">
        +${recoveryState.selectedSebanggoArray.length - 10} more (Show all)
      </button>
    ` : "";
    tags.innerHTML = visibleTags + overflowTag;
  }
}

function removeRecoverySebanggoFromSelection(sebanggo) {
  recoveryState.selectedSebanggoArray = recoveryState.selectedSebanggoArray.filter(item => item !== sebanggo);
  updateRecoverySelectedProductsDisplay();
  resetRecoveryPage();
  loadRecoveryData();
}

function initRecoveryPagination() {
  const prevBtn = document.getElementById("recoveryPrevPageBtn");
  const nextBtn = document.getElementById("recoveryNextPageBtn");
  const pageSizeSelect = document.getElementById("recoveryPageSizeSelect");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (recoveryState.page > 1) {
        recoveryState.page -= 1;
        loadRecoveryData();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (recoveryState.page < recoveryState.totalPages) {
        recoveryState.page += 1;
        loadRecoveryData();
      }
    });
  }

  if (pageSizeSelect) {
    pageSizeSelect.value = String(recoveryState.limit);
    pageSizeSelect.addEventListener("change", () => {
      recoveryState.limit = parseInt(pageSizeSelect.value, 10) || 10;
      resetRecoveryPage();
      loadRecoveryData();
    });
  }
}

function resetRecoveryPage() {
  recoveryState.page = 1;
}

async function loadRecoveryData() {
  setRecoveryTableLoading(true);

  const fromDate = document.getElementById("recoveryFromDate")?.value;
  const toDate = document.getElementById("recoveryToDate")?.value;
  const model = document.getElementById("recoveryModelFilter")?.value || "";
  const factory = document.getElementById("recoveryFactoryFilter")?.value || "";

  if (!fromDate || !toDate) {
    setRecoveryTableLoading(false);
    return;
  }

  try {
    const baseUrl = typeof BASE_URL !== "undefined" ? BASE_URL : (window.BASE_URL || "http://localhost:3000/");
    const response = await fetch(`${baseUrl}api/recovery-details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromDate,
        toDate,
        model,
        bans: recoveryState.selectedSebanggoArray,
        factory,
        page: recoveryState.page,
        limit: recoveryState.limit,
        sortField: recoveryState.sortField,
        sortDir: recoveryState.sortDir
      })
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to load recovery data");
    }

    recoveryState.data = data.rows || [];
    recoveryState.totalRows = data.totalRows || 0;
    recoveryState.totalPages = data.totalPages || 0;
    recoveryState.page = data.page || recoveryState.page;
    recoveryState.limit = data.limit || recoveryState.limit;
    recoveryState.sortField = data.sortField || recoveryState.sortField;
    recoveryState.sortDir = data.sortDir || recoveryState.sortDir;

    updateRecoverySummary(data.summary || {});
    renderRecoveryTable(recoveryState.data);
    renderRecoveryPagination();
    updateRecoverySortIcons();
  } catch (error) {
    console.error("Error loading recovery data:", error);
    recoveryState.data = [];
    recoveryState.totalRows = 0;
    recoveryState.totalPages = 0;
    updateRecoverySummary({
      totalEntries: 0,
      totalRecoveredQty: 0,
      affectedLots: 0,
      affectedProducts: 0,
      affectedFactories: 0,
      distinctDefectTypes: 0
    });
    renderRecoveryTable([]);
    renderRecoveryPagination();
    updateRecoverySortIcons();
  } finally {
    setRecoveryTableLoading(false);
  }
}

function updateRecoverySummary(summary) {
  const mapping = {
    recoveryTotalEntries: summary.totalEntries,
    recoveryTotalRecoveredQty: summary.totalRecoveredQty,
    recoveryAffectedLots: summary.affectedLots,
    recoveryAffectedProducts: summary.affectedProducts,
    recoveryAffectedFactories: summary.affectedFactories,
    recoveryDistinctDefectTypes: summary.distinctDefectTypes
  };

  Object.entries(mapping).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = formatRecoveryNumber(value || 0);
    }
  });
}

function setRecoveryTableLoading(isLoading) {
  const section = document.getElementById("recoveryDetailSection");
  if (!section) {
    return;
  }
  const existing = document.getElementById("recoveryTableLoadingOverlay");
  if (isLoading) {
    if (existing) {
      return;
    }
    const overlay = document.createElement("div");
    overlay.id = "recoveryTableLoadingOverlay";
    overlay.className = "absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg";
    overlay.innerHTML = '<div class="flex items-center gap-3 text-sm text-gray-700"><div class="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div><span>Loading recovery data...</span></div>';
    section.appendChild(overlay);
  } else if (existing) {
    existing.remove();
  }
}

function renderRecoveryTable(rows) {
  const body = document.getElementById("recoveryDetailBody");
  if (!body) {
    return;
  }

  if (!rows.length) {
    const noDataText = (typeof t === "function") ? t("noRecoveryData") : "No recovery data loaded.";
    body.innerHTML = `<tr><td class="px-4 py-3 text-gray-500" colspan="9">${escapeRecoveryHtml(noDataText)}</td></tr>`;
    updateRecoverySelectionUi();
    return;
  }

  // Group rows by Date (lotDate or date or recordedAt date)
  const groupedByDate = new Map();
  rows.forEach(row => {
    const rawDate = row.lotDate || row.date || (row.recordedAt ? String(row.recordedAt).slice(0, 10) : "") || "No Date";
    if (!groupedByDate.has(rawDate)) {
      groupedByDate.set(rawDate, []);
    }
    groupedByDate.get(rawDate).push(row);
  });

  // Sort dates descending (most recent first)
  const sortedDates = Array.from(groupedByDate.keys()).sort((a, b) => b.localeCompare(a));

  let html = "";

  sortedDates.forEach(dateStr => {
    const dateRows = groupedByDate.get(dateStr) || [];
    const dateTotalQty = dateRows.reduce((sum, r) => sum + (Number(r.totalRecoveredQty) || 0), 0);
    
    // Format friendly date display: e.g. 2026-08-20 (木)
    let formattedDateLabel = dateStr;
    if (dateStr !== "No Date") {
      try {
        const d = new Date(dateStr + "T00:00:00");
        const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
        const dayName = dayNames[d.getDay()] || "";
        formattedDateLabel = `${dateStr} (${dayName})`;
      } catch (e) {
        formattedDateLabel = dateStr;
      }
    }

    // Date header banner row spanning all 9 columns
    html += `
      <tr class="bg-slate-100 dark:bg-slate-800/80 border-t-2 border-b border-slate-300 dark:border-slate-700">
        <td colspan="9" class="px-4 py-2.5">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm">
                <i class="ri-calendar-event-line"></i>
              </span>
              <span class="text-sm font-bold text-gray-900 dark:text-white">${escapeRecoveryHtml(formattedDateLabel)}</span>
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
              <span>${dateRows.length} item(s)</span>
              <span>•</span>
              <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                Total: ${formatRecoveryNumber(dateTotalQty)} pcs recovered
              </span>
            </div>
          </div>
        </td>
      </tr>
    `;

    // Render individual item rows under this date
    dateRows.forEach(row => {
      const isSelected = recoveryState.selectedRowIds.includes(row.id);
      
      // Defect / detail notes
      let detailsHtml = "";
      if ((row.recoveries || []).length > 0) {
        const nonDefaultRecoveries = row.recoveries.filter(item => item.defectType && item.defectType !== "Recovered");
        if (nonDefaultRecoveries.length > 0) {
          detailsHtml = nonDefaultRecoveries.map(item => `
            <span class="inline-flex items-center gap-1 px-2 py-0.5 mr-1 mb-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs">
              ${escapeRecoveryHtml(item.defectType)}: <strong>${formatRecoveryNumber(item.quantity || 0)}</strong>
            </span>
          `).join("");
        } else {
          detailsHtml = `<span class="text-xs text-gray-400">Recovered</span>`;
        }
      } else {
        detailsHtml = `<span class="text-xs text-gray-400">-</span>`;
      }

      html += `
        <tr class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isSelected ? "bg-blue-50 dark:bg-blue-950/30" : ""}" onclick="openRecoveryDetailModal('${escapeRecoveryAttribute(row.id)}')">
          <td class="px-4 py-3 whitespace-nowrap" onclick="event.stopPropagation()">
            <input type="checkbox" class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${isSelected ? "checked" : ""} onchange="toggleRecoveryRowSelection('${escapeRecoveryAttribute(row.id)}', this.checked)">
          </td>
          <td class="px-4 py-3 whitespace-nowrap font-bold text-gray-900 dark:text-white">
            <span class="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-700 text-xs">
              ${escapeRecoveryHtml(row.ban || "-")}
            </span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-700 dark:text-gray-300">${escapeRecoveryHtml(row.hinban || "-")}</td>
          <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">${escapeRecoveryHtml(row.model || "-")}</td>
          <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">${escapeRecoveryHtml(row.factory || "-")}</td>
          <td class="px-4 py-3 whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400 text-sm">
            ${formatRecoveryNumber(row.totalRecoveredQty || 0)} <span class="text-xs font-normal text-gray-400">pcs</span>
          </td>
          <td class="px-4 py-3">${detailsHtml}</td>
          <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">${escapeRecoveryHtml(row.recordedBy || "-")}</td>
          <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">${escapeRecoveryHtml(formatRecoveryDateTime(row.recordedAt))}</td>
        </tr>
      `;
    });
  });

  body.innerHTML = html;
  updateRecoverySelectionUi();
}

function renderRecoveryPagination() {
  const pageInfo = document.getElementById("recoveryPageInfo");
  const prevBtn = document.getElementById("recoveryPrevPageBtn");
  const nextBtn = document.getElementById("recoveryNextPageBtn");
  const pageSizeSelect = document.getElementById("recoveryPageSizeSelect");

  const totalRows = recoveryState.totalRows || 0;
  const totalPages = recoveryState.totalPages || 0;
  const page = recoveryState.page || 1;
  const limit = recoveryState.limit || 10;
  const start = totalRows ? ((page - 1) * limit) + 1 : 0;
  const end = totalRows ? Math.min(page * limit, totalRows) : 0;

  if (pageInfo) {
    pageInfo.textContent = `${totalRows}件中 ${start}-${end}件を表示`;
  }
  if (prevBtn) {
    prevBtn.disabled = page <= 1;
  }
  if (nextBtn) {
    nextBtn.disabled = page >= totalPages;
  }
  if (pageSizeSelect) {
    pageSizeSelect.value = String(limit);
  }
}

function toggleRecoverySort(field) {
  if (recoveryState.sortField === field) {
    recoveryState.sortDir = recoveryState.sortDir === "asc" ? "desc" : "asc";
  } else {
    recoveryState.sortField = field;
    recoveryState.sortDir = "asc";
  }
  resetRecoveryPage();
  loadRecoveryData();
}

function getRecoverySortIcon(field) {
  if (recoveryState.sortField !== field) {
    return "";
  }
  return recoveryState.sortDir === "asc" ? "↑" : "↓";
}

function updateRecoverySortIcons() {
  [
    "lotDate",
    "manufacturingLot",
    "hinban",
    "ban",
    "model",
    "factory",
    "totalRecoveredQty",
    "recoveryCount",
    "inspectionTable",
    "matchedPressQty",
    "recordedBy",
    "recordedAt"
  ].forEach(field => {
    const iconEl = document.getElementById(`recoverySortIcon-${field}`);
    if (iconEl) {
      iconEl.textContent = getRecoverySortIcon(field);
    }
  });
}

function getRecoveryBaseUrl() {
  return typeof BASE_URL !== "undefined" ? BASE_URL : (window.BASE_URL || "http://localhost:3000/");
}

function canEditRecoveryRecords() {
  return RECOVERY_EDIT_ROLES.includes(String(recoveryState.currentUser?.role || "").trim());
}

function canDeleteRecoveryRecords() {
  return canEditRecoveryRecords();
}

function toggleRecoveryRowSelection(id, checked) {
  if (checked) {
    if (!recoveryState.selectedRowIds.includes(id)) {
      recoveryState.selectedRowIds.push(id);
    }
  } else {
    recoveryState.selectedRowIds = recoveryState.selectedRowIds.filter(item => item !== id);
  }
  updateRecoverySelectionUi();
  renderRecoveryTable(recoveryState.data);
}

function toggleSelectAllRecoveryRows(checked) {
  const rowIds = (recoveryState.data || []).map(row => row.id);
  if (checked) {
    recoveryState.selectedRowIds = Array.from(new Set([...recoveryState.selectedRowIds, ...rowIds]));
  } else {
    recoveryState.selectedRowIds = recoveryState.selectedRowIds.filter(id => !rowIds.includes(id));
  }
  updateRecoverySelectionUi();
  renderRecoveryTable(recoveryState.data);
}

function updateRecoverySelectionUi() {
  const deleteBtn = document.getElementById("recoveryDeleteSelectedBtn");
  const countEl = document.getElementById("recoverySelectedRowCount");
  const selectAllEl = document.getElementById("recoverySelectAllRows");
  const visibleRowIds = (recoveryState.data || []).map(row => row.id);
  const visibleSelectedCount = visibleRowIds.filter(id => recoveryState.selectedRowIds.includes(id)).length;

  if (countEl) {
    countEl.textContent = `${recoveryState.selectedRowIds.length} selected`;
  }
  if (deleteBtn) {
    deleteBtn.disabled = !canDeleteRecoveryRecords() || recoveryState.selectedRowIds.length === 0;
    deleteBtn.classList.toggle("hidden", !canDeleteRecoveryRecords());
  }
  if (selectAllEl) {
    selectAllEl.checked = visibleRowIds.length > 0 && visibleSelectedCount === visibleRowIds.length;
    selectAllEl.indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < visibleRowIds.length;
  }
}

async function openRecoveryDetailModal(id) {
  try {
    recoveryState.currentDetailId = id;
    recoveryState.isEditMode = false;
    const modal = document.getElementById("recoveryDetailModal");
    const body = document.getElementById("recoveryDetailModalBody");
    const subtitle = document.getElementById("recoveryDetailModalSubtitle");
    const status = document.getElementById("recoveryDetailModalStatus");

    if (body) {
      body.innerHTML = '<div class="py-12 text-center text-gray-500">Loading...</div>';
    }
    if (subtitle) subtitle.textContent = "Loading...";
    if (status) status.textContent = "";
    if (modal) modal.classList.remove("hidden");

    const response = await fetch(`${getRecoveryBaseUrl()}api/recovery-details/${encodeURIComponent(id)}`);
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to load recovery detail");
    }

    recoveryState.currentDetail = data.data || null;
    recoveryState.currentLogs = Array.isArray(data.logs) ? data.logs : [];
    renderRecoveryDetailModal();
  } catch (error) {
    console.error("Error loading recovery detail:", error);
    const body = document.getElementById("recoveryDetailModalBody");
    const status = document.getElementById("recoveryDetailModalStatus");
    if (body) {
      body.innerHTML = `<div class="py-12 text-center text-red-600">${escapeRecoveryHtml(error.message || "Failed to load recovery detail")}</div>`;
    }
    if (status) status.textContent = "Failed to load detail";
  }
}

function closeRecoveryDetailModal() {
  document.getElementById("recoveryDetailModal")?.classList.add("hidden");
  recoveryState.currentDetailId = null;
  recoveryState.currentDetail = null;
  recoveryState.currentLogs = [];
  recoveryState.isEditMode = false;
}

function renderRecoveryDetailModal() {
  const detail = recoveryState.currentDetail;
  const body = document.getElementById("recoveryDetailModalBody");
  const subtitle = document.getElementById("recoveryDetailModalSubtitle");
  const status = document.getElementById("recoveryDetailModalStatus");
  const editBtn = document.getElementById("recoveryEditBtn");
  const cancelBtn = document.getElementById("recoveryCancelEditBtn");
  const saveBtn = document.getElementById("recoverySaveEditBtn");

  if (!detail || !body) {
    return;
  }

  const canEdit = canEditRecoveryRecords();
  const canDelete = canDeleteRecoveryRecords();
  if (subtitle) {
    subtitle.textContent = `${detail.背番号 || "-"} / ${detail.品番 || "-"}`;
  }
  if (status) {
    status.textContent = recoveryState.isEditMode
      ? "Edit mode enabled. Save will create an audit log."
      : `Created ${formatRecoveryDateTime(detail.createdAt)}${detail.updatedAt ? ` • Updated ${formatRecoveryDateTime(detail.updatedAt)}` : ""}`;
  }
  if (editBtn) editBtn.classList.toggle("hidden", !canEdit || recoveryState.isEditMode);
  if (cancelBtn) cancelBtn.classList.toggle("hidden", !recoveryState.isEditMode);
  if (saveBtn) saveBtn.classList.toggle("hidden", !recoveryState.isEditMode);

  const recoveriesBlock = recoveryState.isEditMode
    ? renderRecoveryEditableRecoveries(detail.recoveries || [])
    : renderRecoveryReadonlyRecoveries(detail.recoveries || []);
  const historyBlock = renderRecoveryHistoryLogs(recoveryState.currentLogs || [], detail.recoveryHistory || []);
  const pressMatchBlock = renderRecoveryPressMatch(detail.pressMatch);

  body.innerHTML = `
    <div class="space-y-6">
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div class="xl:col-span-2 space-y-6">
          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-sm font-semibold text-gray-700">Core Fields</h4>
              <span class="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">${escapeRecoveryHtml(detail.モデル || "No model")}</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="recoveryDetailFormFields">
              ${renderRecoveryField("品番", detail.品番 || "", recoveryState.isEditMode)}
              ${renderRecoveryField("背番号", detail.背番号 || "", recoveryState.isEditMode)}
              ${renderRecoveryField("製造ロット", detail.製造ロット || "", recoveryState.isEditMode)}
              ${renderRecoveryField("lotDate", detail.lotDate || "", recoveryState.isEditMode, "date")}
              ${renderRecoveryField("factory", detail.factory || "", recoveryState.isEditMode)}
              ${renderRecoveryField("userId", detail.userId || "", recoveryState.isEditMode)}
              ${renderRecoveryField("検査テーブル名", detail["検査テーブル名"] || "", recoveryState.isEditMode)}
              ${renderRecoveryField("timestamp", normalizeRecoveryDateTimeInput(detail.timestamp), recoveryState.isEditMode, "datetime-local")}
            </div>
            ${recoveryState.isEditMode ? `
              <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Edit Note</label>
                <textarea id="recoveryEditNote" class="w-full p-3 border border-gray-300 rounded-lg text-sm" rows="3" placeholder="Why are you editing this recovery record?" required></textarea>
              </div>
            ` : ""}
          </div>

          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-sm font-semibold text-gray-700">Recoveries</h4>
              <span class="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">Total ${formatRecoveryNumber(detail.totalRecoveredQty || 0)}</span>
            </div>
            ${recoveriesBlock}
          </div>

          ${pressMatchBlock}
        </div>

        <div class="space-y-6">
          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <h4 class="text-sm font-semibold text-gray-700 mb-4">Record Metadata</h4>
            <dl class="space-y-3 text-sm">
              ${renderRecoveryMetaItem("Recorded At", formatRecoveryDateTime(detail.timestamp))}
              ${renderRecoveryMetaItem("Created At", formatRecoveryDateTime(detail.createdAt))}
              ${renderRecoveryMetaItem("Updated At", formatRecoveryDateTime(detail.updatedAt))}
              ${renderRecoveryMetaItem("Updated By", detail.updatedBy || "-")}
              ${renderRecoveryMetaItem("Press DB ID", detail.pressDB_id || "-")}
            </dl>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <h4 class="text-sm font-semibold text-gray-700 mb-4">Audit Trail</h4>
            ${historyBlock}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRecoveryField(field, value, isEditMode, inputType = "text") {
  const labels = {
    品番: "品番",
    背番号: "背番号",
    製造ロット: "製造ロット",
    lotDate: "Lot Date",
    factory: "Factory",
    userId: "Recorded By",
    検査テーブル名: "Inspection Table",
    timestamp: "Recorded At"
  };
  const safeValue = value == null ? "" : String(value);
  if (!isEditMode) {
    return `
      <div>
        <div class="text-xs font-medium text-gray-500 mb-1">${escapeRecoveryHtml(labels[field] || field)}</div>
        <div class="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-900 break-all">${escapeRecoveryHtml(field === "timestamp" ? formatRecoveryDateTime(safeValue) : safeValue || "-")}</div>
      </div>
    `;
  }

  return `
    <label class="block">
      <span class="text-xs font-medium text-gray-500 mb-1 block">${escapeRecoveryHtml(labels[field] || field)}</span>
      <input id="recoveryField-${escapeRecoveryDomId(field)}" type="${inputType}" value="${escapeRecoveryHtml(safeValue)}" class="w-full p-3 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white">
    </label>
  `;
}

function renderRecoveryReadonlyRecoveries(recoveries) {
  if (!recoveries.length) {
    return '<div class="text-sm text-gray-400">No recovery items.</div>';
  }
  return `
    <div class="space-y-2">
      ${recoveries.map(item => `
        <div class="flex items-center justify-between px-3 py-2 rounded-lg border border-amber-200 bg-amber-50">
          <span class="text-sm text-gray-800">${escapeRecoveryHtml(item.defectType || "-")}</span>
          <span class="text-sm font-semibold text-amber-700">${formatRecoveryNumber(item.quantity || 0)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderRecoveryEditableRecoveries(recoveries) {
  return `
    <div>
      <div id="recoveryEditableRecoveries" class="space-y-2">
        ${(recoveries.length ? recoveries : [{ defectType: "", quantity: 0 }]).map((item, index) => renderRecoveryEditableRecoveryRow(item, index)).join("")}
      </div>
      <button onclick="addRecoveryEditableRow()" class="mt-3 px-3 py-2 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
        <i class="ri-add-line mr-1"></i>Add Recovery Item
      </button>
    </div>
  `;
}

function renderRecoveryEditableRecoveryRow(item, index) {
  return `
    <div class="grid grid-cols-1 md:grid-cols-[1fr_180px_48px] gap-2 items-center recovery-edit-row" data-index="${index}">
      <input type="text" class="recovery-edit-defect w-full p-3 border border-gray-300 rounded-lg text-sm" placeholder="Defect Type" value="${escapeRecoveryHtml(item.defectType || "")}">
      <input type="number" min="0" step="1" class="recovery-edit-qty w-full p-3 border border-gray-300 rounded-lg text-sm" placeholder="Quantity" value="${escapeRecoveryHtml(item.quantity || 0)}">
      <button onclick="removeRecoveryEditableRow(${index})" class="h-11 w-11 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
        <i class="ri-delete-bin-line"></i>
      </button>
    </div>
  `;
}

function renderRecoveryPressMatch(pressMatch) {
  const deleteDangerBlock = recoveryState.isEditMode && canDeleteRecoveryRecords()
    ? `
      <div class="mt-5 pt-5 border-t border-red-100">
        <div class="rounded-xl border border-red-200 bg-red-50 p-4">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h5 class="text-sm font-semibold text-red-700">Danger Zone</h5>
              <p class="mt-1 text-xs text-red-600">Deleting moves this recovery record to trash for 2 months before permanent cleanup.</p>
            </div>
            <button onclick="deleteCurrentRecoveryRecord()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors self-start md:self-auto">
              <i class="ri-delete-bin-line mr-1"></i><span>${escapeRecoveryHtml((typeof t === "function") ? t("deleteRecovery") : "Delete")}</span>
            </button>
          </div>
        </div>
      </div>
    `
    : "";

  if (!pressMatch || typeof pressMatch !== "object") {
    return `
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <h4 class="text-sm font-semibold text-gray-700 mb-3">Matched Press Record</h4>
        <div class="text-sm text-gray-400">No press match stored.</div>
        ${deleteDangerBlock}
      </div>
    `;
  }

  const entries = Object.entries(pressMatch)
    .filter(([key]) => key !== "id")
    .map(([key, value]) => `
      <div class="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
        <div class="text-xs font-medium text-gray-500 mb-1">${escapeRecoveryHtml(key)}</div>
        <div class="text-sm text-gray-900 break-all">${escapeRecoveryHtml(value == null ? "-" : String(value))}</div>
      </div>
    `).join("");

  return `
    <div class="bg-white rounded-xl border border-gray-200 p-5">
      <h4 class="text-sm font-semibold text-gray-700 mb-4">Matched Press Record</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${entries}</div>
      ${deleteDangerBlock}
    </div>
  `;
}

function renderRecoveryHistoryLogs(logs, fallbackHistory) {
  if (Array.isArray(logs) && logs.length) {
    return `
      <div class="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
        ${logs.map(log => renderRecoveryLogItem(log)).join("")}
      </div>
    `;
  }
  if (Array.isArray(fallbackHistory) && fallbackHistory.length) {
    return `
      <div class="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
        ${fallbackHistory.slice().reverse().map(item => `
          <div class="rounded-lg border border-gray-200 p-3 bg-gray-50">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium text-gray-800">${escapeRecoveryHtml(item.action || "History")}</span>
              <span class="text-xs text-gray-400">${escapeRecoveryHtml(formatRecoveryDateTime(item.timestamp))}</span>
            </div>
            <div class="mt-1 text-xs text-gray-500">${escapeRecoveryHtml(item.user || "-")}</div>
            ${item.comment ? `<div class="mt-2 text-sm text-gray-700">${escapeRecoveryHtml(item.comment)}</div>` : ""}
          </div>
        `).join("")}
      </div>
    `;
  }
  return '<div class="text-sm text-gray-400">No history yet.</div>';
}

function renderRecoveryLogItem(log) {
  const actor = log.editedBy || log.deletedBy || log.restoredBy || "system";
  const summary = log.editNote || log.deleteReason || log.rejectReason || "";
  const changedFields = Array.isArray(log.changedFields) ? log.changedFields : [];
  return `
    <div class="rounded-lg border border-gray-200 p-3 bg-gray-50">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-medium text-gray-800">${escapeRecoveryHtml(formatRecoveryLogType(log.type))}</span>
        <span class="text-xs text-gray-400">${escapeRecoveryHtml(formatRecoveryDateTime(log.timestamp))}</span>
      </div>
      <div class="mt-1 text-xs text-gray-500">${escapeRecoveryHtml(actor)}</div>
      ${summary ? `<div class="mt-2 text-sm text-gray-700">${escapeRecoveryHtml(summary)}</div>` : ""}
      ${changedFields.length ? `
        <div class="mt-3 space-y-2">
          ${changedFields.map(field => `
            <div class="rounded-md bg-white border border-gray-200 p-2">
              <div class="text-xs font-medium text-gray-500">${escapeRecoveryHtml(field.field)}</div>
              <div class="mt-1 text-xs text-red-600">Before: ${escapeRecoveryHtml(formatRecoveryValueForDisplay(field.before))}</div>
              <div class="mt-1 text-xs text-green-600">After: ${escapeRecoveryHtml(formatRecoveryValueForDisplay(field.after))}</div>
            </div>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderRecoveryMetaItem(label, value) {
  return `
    <div>
      <dt class="text-xs font-medium text-gray-500">${escapeRecoveryHtml(label)}</dt>
      <dd class="mt-1 text-sm text-gray-900 break-all">${escapeRecoveryHtml(value || "-")}</dd>
    </div>
  `;
}

function enterRecoveryEditMode() {
  if (!canEditRecoveryRecords() || !recoveryState.currentDetail) {
    return;
  }
  recoveryState.isEditMode = true;
  renderRecoveryDetailModal();
}

function exitRecoveryEditMode() {
  recoveryState.isEditMode = false;
  renderRecoveryDetailModal();
}

function addRecoveryEditableRow() {
  const container = document.getElementById("recoveryEditableRecoveries");
  if (!container) return;
  const index = container.querySelectorAll(".recovery-edit-row").length;
  container.insertAdjacentHTML("beforeend", renderRecoveryEditableRecoveryRow({ defectType: "", quantity: 0 }, index));
}

function removeRecoveryEditableRow(index) {
  const container = document.getElementById("recoveryEditableRecoveries");
  if (!container) return;
  const row = container.querySelector(`.recovery-edit-row[data-index="${index}"]`);
  if (row) {
    row.remove();
  }
}

async function saveRecoveryDetailChanges() {
  if (!recoveryState.currentDetailId || !recoveryState.currentDetail) {
    return;
  }

  const noteEl = document.getElementById("recoveryEditNote");
  const editNote = String(noteEl?.value || "").trim();
  if (!editNote) {
    alert("Please enter an edit note for traceability.");
    return;
  }

  const changes = {
    品番: document.getElementById(`recoveryField-${escapeRecoveryDomId("品番")}`)?.value || "",
    背番号: document.getElementById(`recoveryField-${escapeRecoveryDomId("背番号")}`)?.value || "",
    製造ロット: document.getElementById(`recoveryField-${escapeRecoveryDomId("製造ロット")}`)?.value || "",
    lotDate: document.getElementById(`recoveryField-${escapeRecoveryDomId("lotDate")}`)?.value || "",
    factory: document.getElementById(`recoveryField-${escapeRecoveryDomId("factory")}`)?.value || "",
    userId: document.getElementById(`recoveryField-${escapeRecoveryDomId("userId")}`)?.value || "",
    検査テーブル名: document.getElementById(`recoveryField-${escapeRecoveryDomId("検査テーブル名")}`)?.value || "",
    timestamp: recoveryDateTimeLocalToIso(document.getElementById(`recoveryField-${escapeRecoveryDomId("timestamp")}`)?.value || ""),
    recoveries: collectEditableRecoveryItems()
  };

  const status = document.getElementById("recoveryDetailModalStatus");
  if (status) status.textContent = "Saving changes...";

  try {
    const response = await fetch(`${getRecoveryBaseUrl()}api/recovery-details/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docId: recoveryState.currentDetailId,
        changes,
        editNote,
        editedBy: recoveryState.currentUser?.username || recoveryState.currentUser?.name || recoveryState.currentUser?.role || "unknown",
        editedByRole: recoveryState.currentUser?.role || "",
        editedByUsername: recoveryState.currentUser?.username || ""
      })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to save changes");
    }

    recoveryState.isEditMode = false;
    await loadRecoveryData();
    await openRecoveryDetailModal(recoveryState.currentDetailId);
  } catch (error) {
    console.error("Error saving recovery changes:", error);
    if (status) status.textContent = error.message || "Failed to save changes";
    alert(error.message || "Failed to save changes.");
  }
}

function collectEditableRecoveryItems() {
  const rows = Array.from(document.querySelectorAll("#recoveryEditableRecoveries .recovery-edit-row"));
  return rows.map(row => ({
    defectType: row.querySelector(".recovery-edit-defect")?.value || "",
    quantity: Number(row.querySelector(".recovery-edit-qty")?.value || 0)
  })).filter(item => String(item.defectType || "").trim() && Number(item.quantity) > 0);
}

async function deleteCurrentRecoveryRecord() {
  if (!recoveryState.currentDetailId) {
    return;
  }
  await deleteRecoveryRecords([recoveryState.currentDetailId], true);
}

async function deleteSelectedRecoveryRows() {
  if (!recoveryState.selectedRowIds.length) {
    return;
  }
  await deleteRecoveryRecords(recoveryState.selectedRowIds.slice(), false);
}

async function deleteRecoveryRecords(ids, closeModalAfterDelete) {
  if (!canDeleteRecoveryRecords()) {
    alert("You do not have permission to delete recovery records.");
    return;
  }

  const reason = window.prompt("Delete reason (required for traceability):", "");
  if (reason === null) {
    return;
  }
  if (!String(reason).trim()) {
    alert("Delete reason is required.");
    return;
  }

  try {
    const response = await fetch(`${getRecoveryBaseUrl()}api/recovery-details/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids,
        reason: String(reason).trim(),
        deletedBy: recoveryState.currentUser?.username || recoveryState.currentUser?.name || recoveryState.currentUser?.role || "unknown",
        deletedByRole: recoveryState.currentUser?.role || "",
        deletedByUsername: recoveryState.currentUser?.username || ""
      })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to delete recovery records");
    }

    recoveryState.selectedRowIds = recoveryState.selectedRowIds.filter(id => !ids.includes(id));
    if (closeModalAfterDelete) {
      closeRecoveryDetailModal();
    }
    await loadRecoveryData();
  } catch (error) {
    console.error("Error deleting recovery records:", error);
    alert(error.message || "Failed to delete recovery records.");
  }
}

function formatRecoveryLogType(type) {
  const map = {
    edit: "Edited",
    soft_delete: "Moved to Trash",
    restore: "Restored",
    permanent_delete: "Permanently Deleted"
  };
  return map[type] || type || "History";
}

function formatRecoveryValueForDisplay(value) {
  if (value == null || value === "") return "-";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }
  return String(value);
}

function normalizeRecoveryDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function recoveryDateTimeLocalToIso(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function escapeRecoveryDomId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function updateRecoveryDateRangeDisplay(start, end) {
  const display = document.getElementById("recoveryDateRangeDisplay");
  if (!display) {
    return;
  }

  if (!start || !end) {
    display.textContent = "Select a date range";
    return;
  }

  display.textContent = `${start} to ${end}`;
}

function formatRecoveryDateInput(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRecoveryNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatRecoveryDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
}

function escapeRecoveryHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRecoveryAttribute(value) {
  return String(value ?? "").replace(/'/g, "\\'");
}

function openRecoveryCreateModal() {
  const modal = document.getElementById("recoveryCreateModal");
  if (!modal) {
    return;
  }

  const dateInput = document.getElementById("recoveryCreateDateInput");
  const userInput = document.getElementById("recoveryCreateUserInput");
  const factorySelect = document.getElementById("recoveryCreateFactoryInput");
  const pageFactorySelect = document.getElementById("recoveryFactoryFilter");

  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  if (userInput) {
    userInput.value = recoveryState.currentUser?.username || recoveryState.currentUser?.name || recoveryState.currentUser?.firstName || "";
  }

  if (factorySelect) {
    factorySelect.innerHTML = `<option value="">Auto (From Product)</option>` + (pageFactorySelect ? pageFactorySelect.innerHTML.replace(/<option value="">.*?<\/option>/i, "") : "");
    factorySelect.value = pageFactorySelect?.value || "";
  }

  const statusEl = document.getElementById("recoveryCreateStatus");
  if (statusEl) statusEl.textContent = "";

  recoveryState.createRows = [];
  recoveryState.nextRowId = 0;
  addRecoveryCreateProductRow();

  modal.classList.remove("hidden");
}

function closeRecoveryCreateModal() {
  document.getElementById("recoveryCreateModal")?.classList.add("hidden");
}

function openRecoveryCreateSubmitModal(state, message) {
  const modal = document.getElementById("recoveryCreateSubmitModal");
  const iconEl = document.getElementById("recoveryCreateSubmitIcon");
  const titleEl = document.getElementById("recoveryCreateSubmitTitle");
  const messageEl = document.getElementById("recoveryCreateSubmitMessage");
  const closeBtn = document.getElementById("recoveryCreateSubmitCloseBtn");
  if (!modal || !iconEl || !titleEl || !messageEl || !closeBtn) {
    return;
  }

  const states = {
    loading: {
      title: "Submitting in progress...",
      message: message || "Please wait while the recovery record is being submitted.",
      icon: '<div class="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent"></div>',
      iconClass: "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600",
      closable: false
    },
    success: {
      title: "Data has been submitted",
      message: message || "The recovery record was submitted successfully.",
      icon: '<i class="ri-check-line text-3xl"></i>',
      iconClass: "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600",
      closable: true
    },
    error: {
      title: "Submit failed",
      message: message || "Failed to submit the recovery record.",
      icon: '<i class="ri-close-line text-3xl"></i>',
      iconClass: "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600",
      closable: true
    }
  };

  const config = states[state] || states.loading;
  iconEl.className = config.iconClass;
  iconEl.innerHTML = config.icon;
  titleEl.textContent = config.title;
  messageEl.textContent = config.message;
  closeBtn.classList.toggle("hidden", !config.closable);
  modal.classList.remove("hidden");
}

function closeRecoveryCreateSubmitModal() {
  document.getElementById("recoveryCreateSubmitModal")?.classList.add("hidden");
}

function setRecoveryCreateSubmitButtonsDisabled(disabled) {
  const cancelBtn = document.getElementById("recoveryCreateCancelBtn");
  const submitBtn = document.getElementById("recoveryCreateSubmitBtn");
  if (cancelBtn) {
    cancelBtn.disabled = !!disabled;
    cancelBtn.classList.toggle("opacity-50", !!disabled);
    cancelBtn.classList.toggle("cursor-not-allowed", !!disabled);
  }
  if (submitBtn) {
    submitBtn.disabled = !!disabled;
    submitBtn.classList.toggle("opacity-50", !!disabled);
    submitBtn.classList.toggle("cursor-not-allowed", !!disabled);
  }
}

function addRecoveryCreateProductRow() {
  const rowId = ++recoveryState.nextRowId;
  recoveryState.createRows.push({
    id: rowId,
    rawInput: "",
    resolvedProduct: null,
    quantity: ""
  });
  renderRecoveryCreateProductRows();
  setTimeout(() => {
    document.getElementById(`recoveryCreateProductInput_${rowId}`)?.focus();
  }, 50);
}

function removeRecoveryCreateProductRow(rowId) {
  if (recoveryState.createRows.length <= 1) return;
  recoveryState.createRows = recoveryState.createRows.filter(r => r.id !== rowId);
  renderRecoveryCreateProductRows();
}

function renderRecoveryCreateProductRows() {
  const container = document.getElementById("recoveryCreateRowsContainer");
  if (!container) return;

  const totalRows = recoveryState.createRows.length;

  container.innerHTML = recoveryState.createRows.map((row, index) => {
    const isResolved = !!row.resolvedProduct;
    const isInvalid = !!row.rawInput && !row.resolvedProduct;
    // Only display column titles/labels on the last row (currently being added)
    const isAdding = (index === totalRows - 1);

    const inputBorderClass = isInvalid
      ? "border-2 border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-900 dark:text-red-200 focus:ring-red-500"
      : isResolved
      ? "border border-emerald-500 text-emerald-900 dark:text-emerald-300 font-medium focus:ring-emerald-500"
      : "border border-gray-300 dark:border-gray-600 focus:ring-blue-500";

    const qtyClass = isResolved
      ? "font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-800"
      : "opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-800/80 text-gray-400";

    return `
      <div class="${isAdding ? "p-3 bg-white dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm" : "p-2.5 bg-white dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm"}" id="recoveryCreateRow_${row.id}">
        <div class="flex ${isAdding ? "items-end" : "items-center"} gap-3">
          <!-- Product Input -->
          <div class="flex-1 min-w-0 recovery-suggestion-container relative">
            ${isAdding ? `<label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Product (背番号 or 品番)</label>` : ""}
            <div class="relative">
              <input type="text"
                     id="recoveryCreateProductInput_${row.id}"
                     autocomplete="off"
                     value="${escapeRecoveryAttribute(row.rawInput)}"
                     placeholder="${isAdding ? "Type 背番号 (e.g. 3TD) or 品番..." : "背番号 or 品番"}"
                     class="w-full p-2.5 rounded-lg text-sm dark:bg-gray-800 dark:text-white focus:ring-2 ${inputBorderClass}"
                     oninput="handleRecoveryCreateProductInput(${row.id}, this.value)"
                     onfocus="handleRecoveryCreateProductFocus(${row.id})"
                     onkeydown="handleRecoveryCreateProductKeydown(${row.id}, event)"
              >
              <div id="recoveryCreateSuggestions_${row.id}" class="hidden absolute z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl"></div>
            </div>
          </div>

          <!-- Quantity Input -->
          <div class="w-36 flex-shrink-0">
            ${isAdding ? `<label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Recovered Qty</label>` : ""}
            <input type="number"
                   id="recoveryCreateQuantityInput_${row.id}"
                   min="1"
                   step="1"
                   value="${row.quantity}"
                   placeholder="${isResolved ? "e.g. 268" : (isAdding ? "Enter product" : "Qty")}"
                   ${isResolved ? "" : "disabled"}
                   class="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${qtyClass}"
                   oninput="handleRecoveryCreateQuantityInput(${row.id}, this.value)"
                   onkeydown="handleRecoveryCreateQuantityKeydown(${row.id}, event)"
            >
          </div>

          <!-- Remove Row Button -->
          <div class="flex-shrink-0 ${isAdding ? "mb-0.5" : ""}">
            ${totalRows > 1 ? `
              <button type="button" onclick="removeRecoveryCreateProductRow(${row.id})" class="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" title="Remove product">
                <i class="ri-delete-bin-line text-lg"></i>
              </button>
            ` : `
              <div class="w-9"></div>
            `}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function handleRecoveryCreateProductFocus(rowId) {
  const row = recoveryState.createRows.find(r => r.id === rowId);
  if (row && row.rawInput) {
    handleRecoveryCreateProductInput(rowId, row.rawInput);
  }
}

function handleRecoveryCreateProductInput(rowId, val) {
  const row = recoveryState.createRows.find(r => r.id === rowId);
  if (!row) return;

  row.rawInput = val;
  const q = String(val || "").trim().toLowerCase();
  const inputEl = document.getElementById(`recoveryCreateProductInput_${rowId}`);
  const qtyInput = document.getElementById(`recoveryCreateQuantityInput_${rowId}`);
  const suggestionsEl = document.getElementById(`recoveryCreateSuggestions_${rowId}`);

  if (!q) {
    row.resolvedProduct = null;
    row.quantity = "";
    if (inputEl) {
      inputEl.className = "w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500";
    }
    if (qtyInput) {
      qtyInput.value = "";
      qtyInput.disabled = true;
      qtyInput.placeholder = "Enter product";
      qtyInput.className = "w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-800/80 text-gray-400";
    }
    if (suggestionsEl) {
      suggestionsEl.innerHTML = "";
      suggestionsEl.classList.add("hidden");
    }
    return;
  }

  // Exact match check first
  const exactMatch = recoveryState.allProducts.find(p =>
    String(p.背番号 || "").trim().toLowerCase() === q ||
    String(p.品番 || "").trim().toLowerCase() === q
  );

  if (exactMatch) {
    row.resolvedProduct = exactMatch;
    if (inputEl) {
      inputEl.className = "w-full p-2.5 border border-emerald-500 dark:border-emerald-500 text-emerald-900 dark:text-emerald-300 font-medium rounded-lg text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500";
    }
    if (qtyInput) {
      qtyInput.disabled = false;
      qtyInput.placeholder = "e.g. 268";
      qtyInput.className = "w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500";
    }
  } else {
    row.resolvedProduct = null;
    row.quantity = "";
    if (inputEl) {
      inputEl.className = "w-full p-2.5 border-2 border-red-500 dark:border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-900 dark:text-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500";
    }
    if (qtyInput) {
      qtyInput.value = "";
      qtyInput.disabled = true;
      qtyInput.placeholder = "Enter product";
      qtyInput.className = "w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-800/80 text-gray-400";
    }
  }

  // Filter suggestions
  const matches = recoveryState.allProducts.filter(p => {
    const ban = String(p.背番号 || "").toLowerCase();
    const hinban = String(p.品番 || "").toLowerCase();
    return ban.includes(q) || hinban.includes(q);
  }).slice(0, 10);

  if (!suggestionsEl) return;

  if (matches.length === 0) {
    suggestionsEl.innerHTML = `<div class="p-3 text-xs text-red-600 dark:text-red-400 font-medium">背番号 / 品番 does not exist in masterDB</div>`;
    suggestionsEl._matches = [];
    suggestionsEl._selectedIndex = -1;
    suggestionsEl.classList.remove("hidden");
  } else {
    suggestionsEl.innerHTML = matches.map((p, idx) => `
      <div class="recovery-suggestion-item p-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/40 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center justify-between text-xs transition-colors"
           onclick="selectRecoveryCreateProductSuggestion(${rowId}, ${idx})">
        <div class="flex items-center gap-2">
          <span class="font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">${escapeRecoveryHtml(p.背番号 || "-")}</span>
          <span class="font-mono text-gray-700 dark:text-gray-300">${escapeRecoveryHtml(p.品番 || "-")}</span>
        </div>
        <div class="text-gray-400">
          ${escapeRecoveryHtml(p.モデル || "")} ${p.工場 ? `• ${escapeRecoveryHtml(p.工場)}` : ""}
        </div>
      </div>
    `).join("");
    suggestionsEl._matches = matches;
    suggestionsEl._selectedIndex = -1;
    suggestionsEl.classList.remove("hidden");
  }
}

function highlightRecoveryCreateSuggestion(rowId, index) {
  const suggestionsEl = document.getElementById(`recoveryCreateSuggestions_${rowId}`);
  if (!suggestionsEl || !suggestionsEl._matches || !suggestionsEl._matches[index]) return;

  suggestionsEl._selectedIndex = index;
  const items = suggestionsEl.querySelectorAll(".recovery-suggestion-item");
  items.forEach((item, idx) => {
    if (idx === index) {
      item.classList.add("bg-blue-100", "dark:bg-blue-900/60", "ring-2", "ring-blue-500", "font-semibold");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("bg-blue-100", "dark:bg-blue-900/60", "ring-2", "ring-blue-500", "font-semibold");
    }
  });
}

function selectRecoveryCreateProductSuggestion(rowId, index) {
  const row = recoveryState.createRows.find(r => r.id === rowId);
  const suggestionsEl = document.getElementById(`recoveryCreateSuggestions_${rowId}`);
  if (!row || !suggestionsEl || !suggestionsEl._matches) return;

  const product = suggestionsEl._matches[index];
  if (!product) return;

  row.resolvedProduct = product;
  row.rawInput = product.背番号 || product.品番;

  const inputEl = document.getElementById(`recoveryCreateProductInput_${rowId}`);
  if (inputEl) {
    inputEl.value = row.rawInput;
    inputEl.className = "w-full p-2.5 border border-emerald-500 dark:border-emerald-500 text-emerald-900 dark:text-emerald-300 font-medium rounded-lg text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500";
  }

  const qtyInput = document.getElementById(`recoveryCreateQuantityInput_${rowId}`);
  if (qtyInput) {
    qtyInput.disabled = false;
    qtyInput.placeholder = "e.g. 268";
    qtyInput.className = "w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500";
    qtyInput.focus();
  }

  suggestionsEl._selectedIndex = -1;
  suggestionsEl.classList.add("hidden");
}

function handleRecoveryCreateQuantityInput(rowId, val) {
  const row = recoveryState.createRows.find(r => r.id === rowId);
  if (row) {
    row.quantity = val;
  }
}

function handleRecoveryCreateProductKeydown(rowId, event) {
  const suggestionsEl = document.getElementById(`recoveryCreateSuggestions_${rowId}`);
  const hasSuggestions = suggestionsEl && !suggestionsEl.classList.contains("hidden") && suggestionsEl._matches && suggestionsEl._matches.length > 0;

  if (event.key === "Tab") {
    if (hasSuggestions) {
      const count = suggestionsEl._matches.length;
      if (count === 1) {
        // If only 1 choice: auto select on Tab and advance to quantity
        event.preventDefault();
        selectRecoveryCreateProductSuggestion(rowId, 0);
        return;
      }

      // If 2 or more choices: iterate through choices
      event.preventDefault();
      let nextIdx;
      if (event.shiftKey) {
        nextIdx = (typeof suggestionsEl._selectedIndex === "number" && suggestionsEl._selectedIndex > 0)
          ? suggestionsEl._selectedIndex - 1
          : count - 1;
      } else {
        nextIdx = (typeof suggestionsEl._selectedIndex === "number" && suggestionsEl._selectedIndex >= 0 && suggestionsEl._selectedIndex < count - 1)
          ? suggestionsEl._selectedIndex + 1
          : 0;
      }
      highlightRecoveryCreateSuggestion(rowId, nextIdx);
      return;
    }
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    if (hasSuggestions) {
      event.preventDefault();
      const count = suggestionsEl._matches.length;
      let nextIdx;
      if (event.key === "ArrowUp") {
        nextIdx = (typeof suggestionsEl._selectedIndex === "number" && suggestionsEl._selectedIndex > 0)
          ? suggestionsEl._selectedIndex - 1
          : count - 1;
      } else {
        nextIdx = (typeof suggestionsEl._selectedIndex === "number" && suggestionsEl._selectedIndex >= 0 && suggestionsEl._selectedIndex < count - 1)
          ? suggestionsEl._selectedIndex + 1
          : 0;
      }
      highlightRecoveryCreateSuggestion(rowId, nextIdx);
      return;
    }
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (hasSuggestions) {
      const selectedIdx = (typeof suggestionsEl._selectedIndex === "number" && suggestionsEl._selectedIndex >= 0)
        ? suggestionsEl._selectedIndex
        : 0;
      selectRecoveryCreateProductSuggestion(rowId, selectedIdx);
    } else {
      const row = recoveryState.createRows.find(r => r.id === rowId);
      if (row?.resolvedProduct) {
        document.getElementById(`recoveryCreateQuantityInput_${rowId}`)?.focus();
      }
    }
  }
}

function handleRecoveryCreateQuantityKeydown(rowId, event) {
  if (event.key === "Enter") {
    event.preventDefault();
    const row = recoveryState.createRows.find(r => r.id === rowId);
    const qty = parseInt(row?.quantity, 10);
    if (!row || !row.resolvedProduct || !qty || qty <= 0) {
      return;
    }

    const currentIndex = recoveryState.createRows.findIndex(r => r.id === rowId);
    if (currentIndex === recoveryState.createRows.length - 1) {
      // Last row: add new product row
      addRecoveryCreateProductRow();
    } else {
      // Earlier row: jump focus to next row's product input
      const nextRow = recoveryState.createRows[currentIndex + 1];
      if (nextRow) {
        document.getElementById(`recoveryCreateProductInput_${nextRow.id}`)?.focus();
      }
    }
  }
}

async function submitRecoveryCreateForm() {
  const dateInput = document.getElementById("recoveryCreateDateInput");
  const userInput = document.getElementById("recoveryCreateUserInput");
  const factorySelect = document.getElementById("recoveryCreateFactoryInput");

  const selectedDate = dateInput ? dateInput.value.trim() : "";
  if (!selectedDate) {
    alert("Please select a recovery/defect date.");
    dateInput?.focus();
    return;
  }

  const recordedBy = (userInput ? userInput.value.trim() : "") || "Operator";
  const selectedFactory = factorySelect ? factorySelect.value.trim() : "";

  // Validate each product row
  for (let i = 0; i < recoveryState.createRows.length; i++) {
    const row = recoveryState.createRows[i];
    
    // Auto-resolve product if user typed exact code without clicking suggestion
    if (!row.resolvedProduct && row.rawInput) {
      const q = String(row.rawInput).trim().toLowerCase();
      const match = recoveryState.allProducts.find(p =>
        String(p.背番号 || "").trim().toLowerCase() === q ||
        String(p.品番 || "").trim().toLowerCase() === q
      );
      if (match) {
        row.resolvedProduct = match;
      }
    }

    if (!row.resolvedProduct) {
      alert(`Row #${i + 1}: Please enter a valid product (背番号 or 品番) recognized in masterDB.`);
      document.getElementById(`recoveryCreateProductInput_${row.id}`)?.focus();
      return;
    }

    const qty = parseInt(row.quantity, 10);
    if (!qty || qty <= 0) {
      alert(`Row #${i + 1} (${row.resolvedProduct.背番号 || row.resolvedProduct.品番}): Please enter a valid quantity greater than 0.`);
      return;
    }
  }

  setRecoveryCreateSubmitButtonsDisabled(true);
  openRecoveryCreateSubmitModal("loading", "Saving recovery records...");

  try {
    const recoveries = recoveryState.createRows.map(row => {
      const p = row.resolvedProduct;
      const qty = parseInt(row.quantity, 10);
      return {
        背番号: p.背番号 || "",
        品番: p.品番 || "",
        date: selectedDate,
        lotDate: selectedDate,
        製造ロット: selectedDate.replace(/-/g, ""),
        quantity: qty,
        recoveries: [{ defectType: "Recovered", quantity: qty }],
        userId: recordedBy,
        factory: selectedFactory || p.工場 || p.factory || "",
        timestamp: new Date().toISOString()
      };
    });

    const response = await fetch(`${getRecoveryBaseUrl()}api/save-recovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recoveries })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to save recovery record.");
    }

    openRecoveryCreateSubmitModal("success", `Successfully recorded recovery for ${recoveries.length} product(s).`);
    closeRecoveryCreateModal();
    await loadRecoveryData();
  } catch (error) {
    console.error("Failed to save recovery records:", error);
    openRecoveryCreateSubmitModal("error", error.message || "Failed to save recovery records.");
  } finally {
    setRecoveryCreateSubmitButtonsDisabled(false);
  }
}

// Global click listener to close suggestions dropdowns when clicking outside
if (!window.__recoverySuggestionsGlobalListenerBound) {
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".recovery-suggestion-container")) {
      document.querySelectorAll("[id^='recoveryCreateSuggestions_']").forEach(el => el.classList.add("hidden"));
    }
  });
  window.__recoverySuggestionsGlobalListenerBound = true;
}

window.initRecoveryPage = initRecoveryPage;
window.openRecoveryCreateModal = openRecoveryCreateModal;
window.closeRecoveryCreateModal = closeRecoveryCreateModal;
window.closeRecoveryCreateSubmitModal = closeRecoveryCreateSubmitModal;
window.addRecoveryCreateProductRow = addRecoveryCreateProductRow;
window.removeRecoveryCreateProductRow = removeRecoveryCreateProductRow;
window.renderRecoveryCreateProductRows = renderRecoveryCreateProductRows;
window.handleRecoveryCreateProductInput = handleRecoveryCreateProductInput;
window.handleRecoveryCreateProductFocus = handleRecoveryCreateProductFocus;
window.selectRecoveryCreateProductSuggestion = selectRecoveryCreateProductSuggestion;
window.highlightRecoveryCreateSuggestion = highlightRecoveryCreateSuggestion;
window.handleRecoveryCreateQuantityInput = handleRecoveryCreateQuantityInput;
window.handleRecoveryCreateProductKeydown = handleRecoveryCreateProductKeydown;
window.handleRecoveryCreateQuantityKeydown = handleRecoveryCreateQuantityKeydown;
window.submitRecoveryCreateForm = submitRecoveryCreateForm;
window.openRecoverySebanggoSelector = openRecoverySebanggoSelector;
window.closeRecoverySebanggoSelector = closeRecoverySebanggoSelector;
window.confirmRecoverySebanggoSelection = confirmRecoverySebanggoSelection;
window.filterRecoverySebanggoList = filterRecoverySebanggoList;
window.toggleRecoverySebanggoSelection = toggleRecoverySebanggoSelection;
window.checkAllRecoverySebanggo = checkAllRecoverySebanggo;
window.uncheckAllRecoverySebanggo = uncheckAllRecoverySebanggo;
window.removeRecoverySebanggoFromSelection = removeRecoverySebanggoFromSelection;
window.toggleRecoverySort = toggleRecoverySort;
window.toggleRecoveryRowSelection = toggleRecoveryRowSelection;
window.toggleSelectAllRecoveryRows = toggleSelectAllRecoveryRows;
window.openRecoveryDetailModal = openRecoveryDetailModal;
window.closeRecoveryDetailModal = closeRecoveryDetailModal;
window.enterRecoveryEditMode = enterRecoveryEditMode;
window.exitRecoveryEditMode = exitRecoveryEditMode;
window.addRecoveryEditableRow = addRecoveryEditableRow;
window.removeRecoveryEditableRow = removeRecoveryEditableRow;
window.saveRecoveryDetailChanges = saveRecoveryDetailChanges;
window.deleteCurrentRecoveryRecord = deleteCurrentRecoveryRecord;
window.deleteSelectedRecoveryRows = deleteSelectedRecoveryRows;
