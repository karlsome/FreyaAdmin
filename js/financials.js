const financialsState = {
  charts: {},
  data: [],
  page: 1,
  limit: 10,
  totalPages: 0,
  totalRows: 0,
  sortField: "hinban",
  sortDir: "asc",
  // Product filter state (like productPDFs.js)
  allProducts: [],
  selectedSebanggoArray: [],
  tempSelectedSebanggo: [],
  previousSummary: null
};

function initFinancialsPage() {
  setupFinancialsDateRange();
  initFinancialsCharts();
  loadFinancialsModelOptions();
  loadFinancialsFactoryOptions();
  loadFinancialsAllProducts();
  setupFinancialsFilters();
  initFinancialsPagination();
  updateFinancialsSummary({
    totalValue: 0,
    scrapLoss: 0,
    totalCreated: 0,
    finalGood: 0,
    totalLoss: 0,
    defectRate: 0,
    yieldPercent: 0
  });
  renderFinancialsTable([]);
  loadFinancialsData();
}

function setupFinancialsDateRange() {
  const rangeSelect = document.getElementById("financialsRangeSelect");
  const fromInput = document.getElementById("financialsFromDate");
  const toInput = document.getElementById("financialsToDate");
  const refreshBtn = document.getElementById("financialsRefreshBtn");

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
        updateFinancialsDateRangeDisplay(fromInput.value, toInput.value);
        return;
    }

    fromInput.value = formatDateInput(start);
    toInput.value = formatDateInput(end);
    updateFinancialsDateRangeDisplay(fromInput.value, toInput.value);
  };

  rangeSelect.addEventListener("change", () => {
    applyRange();
    resetFinancialsPage();
    loadFinancialsData();
  });
  fromInput.addEventListener("change", () => {
    updateFinancialsDateRangeDisplay(fromInput.value, toInput.value);
    if (rangeSelect.value === "custom") {
      resetFinancialsPage();
      loadFinancialsData();
    }
  });
  toInput.addEventListener("change", () => {
    updateFinancialsDateRangeDisplay(fromInput.value, toInput.value);
    if (rangeSelect.value === "custom") {
      resetFinancialsPage();
      loadFinancialsData();
    }
  });
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      updateFinancialsDateRangeDisplay(fromInput.value, toInput.value);
      resetFinancialsPage();
      loadFinancialsData();
    });
  }

  applyRange();
}

async function loadFinancialsModelOptions() {
  const modelSelect = document.getElementById("financialsModelFilter");
  if (!modelSelect) {
    return;
  }

  const loadingText = (typeof t === 'function') ? t('loading') : 'Loading...';
  modelSelect.innerHTML = `<option value="">${loadingText}</option>`;
  modelSelect.disabled = true;

  try {
    const baseUrl = typeof BASE_URL !== "undefined" ? BASE_URL : (window.BASE_URL || "http://localhost:3000/");
    const response = await fetch(`${baseUrl}api/masterdb/models`);
    const data = await response.json();

    if (response.ok && data.success && Array.isArray(data.data)) {
      const allModelsText = (typeof t === 'function') ? t('allModels') : 'All Models';
      const options = [`<option value="">${allModelsText}</option>`];
      data.data.forEach(model => {
        options.push(`<option value="${model}">${model}</option>`);
      });
      modelSelect.innerHTML = options.join("");
    } else {
      const allModelsText = (typeof t === 'function') ? t('allModels') : 'All Models';
      modelSelect.innerHTML = `<option value="">${allModelsText}</option>`;
    }
  } catch (error) {
    console.error("Failed to load model options:", error);
    const allModelsText = (typeof t === 'function') ? t('allModels') : 'All Models';
    modelSelect.innerHTML = `<option value="">${allModelsText}</option>`;
  } finally {
    modelSelect.disabled = false;
  }
}

async function loadFinancialsFactoryOptions() {
  const factorySelect = document.getElementById("financialsFactoryFilter");
  if (!factorySelect) {
    return;
  }

  const loadingText = (typeof t === 'function') ? t('loading') : 'Loading...';
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
      const allFactoriesText = (typeof t === 'function') ? t('allFactories') : 'All Factories';
      const options = [`<option value="">${allFactoriesText}</option>`];
      factories.forEach(factory => {
        options.push(`<option value="${factory}">${factory}</option>`);
      });
      factorySelect.innerHTML = options.join("");
    } else {
      const allFactoriesText = (typeof t === 'function') ? t('allFactories') : 'All Factories';
      factorySelect.innerHTML = `<option value="">${allFactoriesText}</option>`;
    }
  } catch (error) {
    console.error("Failed to load factory options:", error);
    const allFactoriesText = (typeof t === 'function') ? t('allFactories') : 'All Factories';
    factorySelect.innerHTML = `<option value="">${allFactoriesText}</option>`;
  } finally {
    factorySelect.disabled = false;
  }
}

function setupFinancialsFilters() {
  const filterTypeSelect = document.getElementById("financialsFilterType");
  const modelSelect = document.getElementById("financialsModelFilter");
  const factorySelect = document.getElementById("financialsFactoryFilter");

  if (filterTypeSelect) {
    filterTypeSelect.addEventListener("change", handleFinancialsFilterTypeChange);
  }

  if (modelSelect) {
    modelSelect.addEventListener("change", handleFinancialsModelFilter);
  }

  if (factorySelect) {
    factorySelect.addEventListener("change", () => {
      resetFinancialsPage();
      loadFinancialsData();
    });
  }
}

// Load all products for the selector  
async function loadFinancialsAllProducts() {
  try {
    const baseUrl = typeof BASE_URL !== "undefined" ? BASE_URL : (window.BASE_URL || "http://localhost:3000/");
    const response = await fetch(`${baseUrl}api/masterdb/products`);
    const data = await response.json();

    if (response.ok && data.success && Array.isArray(data.data)) {
      financialsState.allProducts = data.data;
    } else {
      financialsState.allProducts = [];
    }
  } catch (error) {
    console.error("Failed to load all products:", error);
    financialsState.allProducts = [];
  }
}

// Handle filter type change
function handleFinancialsFilterTypeChange() {
  const filterType = document.getElementById("financialsFilterType").value;
  
  if (filterType === "model") {
    document.getElementById("financialsModelFilterContainer").style.display = "block";
    document.getElementById("financialsSebanggoFilterContainer").style.display = "none";
  } else {
    document.getElementById("financialsModelFilterContainer").style.display = "none";
    document.getElementById("financialsSebanggoFilterContainer").style.display = "block";
  }
  
  // Clear selection
  financialsState.selectedSebanggoArray = [];
  updateFinancialsSelectedProductsDisplay();
  resetFinancialsPage();
  loadFinancialsData();
}

// Handle model filter change - auto-select all sebanggo for that model
function handleFinancialsModelFilter() {
  const selectedModel = document.getElementById("financialsModelFilter").value;
  
  if (selectedModel) {
    financialsState.selectedSebanggoArray = financialsState.allProducts
      .filter(p => p.モデル === selectedModel)
      .map(p => p.背番号)
      .filter(Boolean);
    
    updateFinancialsSelectedProductsDisplay();
  } else {
    financialsState.selectedSebanggoArray = [];
    updateFinancialsSelectedProductsDisplay();
  }
  
  resetFinancialsPage();
  loadFinancialsData();
}

// Open sebanggo selector modal
function openFinancialsSebanggoSelector() {
  financialsState.tempSelectedSebanggo = [...financialsState.selectedSebanggoArray];
  document.getElementById("financialsSebanggoSelectorModal").classList.remove("hidden");
  renderFinancialsSebanggoList();
}

// Close sebanggo selector modal
function closeFinancialsSebanggoSelector() {
  document.getElementById("financialsSebanggoSelectorModal").classList.add("hidden");
}

// Confirm sebanggo selection
function confirmFinancialsSebanggoSelection() {
  financialsState.selectedSebanggoArray = [...financialsState.tempSelectedSebanggo];
  updateFinancialsSelectedProductsDisplay();
  closeFinancialsSebanggoSelector();
  resetFinancialsPage();
  loadFinancialsData();
}

// Render sebanggo list in modal
function renderFinancialsSebanggoList() {
  const container = document.getElementById("financialsSebanggoListContainer");
  const searchTerm = (document.getElementById("financialsSebanggoSearch")?.value || "").toLowerCase();
  const filterType = document.getElementById("financialsFilterType")?.value;
  const selectedModel = document.getElementById("financialsModelFilter")?.value;
  
  const filteredProducts = financialsState.allProducts.filter(p => {
    const matchesModel = !selectedModel || filterType !== "model" || p.モデル === selectedModel;
    const matchesSearch = 
      (p.背番号 || "").toLowerCase().includes(searchTerm) ||
      (p.品番 || "").toLowerCase().includes(searchTerm) ||
      (p.モデル || "").toLowerCase().includes(searchTerm);
    return matchesModel && matchesSearch;
  }).sort((a, b) => (a.背番号 || "").localeCompare(b.背番号 || ""));
  
  container.innerHTML = filteredProducts.map(product => {
    const isSelected = financialsState.tempSelectedSebanggo.includes(product.背番号);
    return `
      <label class="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
        <input type="checkbox" ${isSelected ? "checked" : ""} onchange="toggleFinancialsSebanggoSelection('${product.背番号}')" class="w-3.5 h-3.5" />
        <div class="flex-1">
          <div class="text-sm font-medium text-gray-900">${product.背番号}</div>
          <div class="text-xs text-gray-500">${product.品番 || ""} • ${product.モデル || ""}</div>
        </div>
      </label>
    `;
  }).join("");
}

// Filter sebanggo list
function filterFinancialsSebanggoList() {
  renderFinancialsSebanggoList();
}

// Toggle sebanggo selection in modal
function toggleFinancialsSebanggoSelection(sebanggo) {
  const index = financialsState.tempSelectedSebanggo.indexOf(sebanggo);
  if (index > -1) {
    financialsState.tempSelectedSebanggo.splice(index, 1);
  } else {
    financialsState.tempSelectedSebanggo.push(sebanggo);
  }
}

// Check all sebanggo
function checkAllFinancialsSebanggo() {
  financialsState.tempSelectedSebanggo = getFinancialsVisibleSebanggoList();
  renderFinancialsSebanggoList();
}

// Uncheck all sebanggo
function uncheckAllFinancialsSebanggo() {
  financialsState.tempSelectedSebanggo = [];
  renderFinancialsSebanggoList();
}

// Get visible sebanggo list (filtered)
function getFinancialsVisibleSebanggoList() {
  const searchTerm = (document.getElementById("financialsSebanggoSearch")?.value || "").toLowerCase();
  const filterType = document.getElementById("financialsFilterType")?.value;
  const selectedModel = document.getElementById("financialsModelFilter")?.value;

  return financialsState.allProducts
    .filter(p => {
      const matchesModel = !selectedModel || filterType !== "model" || p.モデル === selectedModel;
      const matchesSearch = 
        (p.背番号 || "").toLowerCase().includes(searchTerm) ||
        (p.品番 || "").toLowerCase().includes(searchTerm) ||
        (p.モデル || "").toLowerCase().includes(searchTerm);
      return matchesModel && matchesSearch;
    })
    .map(p => p.背番号)
    .filter(Boolean);
}

// Update selected products display (tags)
function updateFinancialsSelectedProductsDisplay() {
  const display = document.getElementById("financialsSelectedProductsDisplay");
  const tags = document.getElementById("financialsSelectedProductsTags");
  const count = document.getElementById("financialsSelectedCount");
  
  if (financialsState.selectedSebanggoArray.length === 0) {
    if (display) display.textContent = t ? t("noneSelected") : "None selected";
    if (tags) tags.innerHTML = "";
    if (count) count.textContent = t ? t("selectProducts") : "Select products...";
    return;
  }
  
  if (display) display.textContent = `${financialsState.selectedSebanggoArray.length} ${t ? t("selectedProducts").toLowerCase() : "products selected"}`;
  if (count) count.textContent = `${financialsState.selectedSebanggoArray.length} selected`;
  
  // Show first 10 as tags
  if (tags) {
    tags.innerHTML = financialsState.selectedSebanggoArray.slice(0, 10).map(sebanggo => `
      <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
        ${sebanggo}
        <button onclick="removeFinancialsSebanggoFromSelection('${sebanggo}')" class="hover:text-blue-600">
          <i class="ri-close-line"></i>
        </button>
      </span>
    `).join("") + (financialsState.selectedSebanggoArray.length > 10 ? `
      <button onclick="openFinancialsSebanggoSelector()" class="text-gray-500 text-sm hover:text-gray-700">
        +${financialsState.selectedSebanggoArray.length - 10} more (Show all)
      </button>
    ` : "");
  }
}

// Remove sebanggo from selection
function removeFinancialsSebanggoFromSelection(sebanggo) {
  financialsState.selectedSebanggoArray = financialsState.selectedSebanggoArray.filter(s => s !== sebanggo);
  updateFinancialsSelectedProductsDisplay();
  resetFinancialsPage();
  loadFinancialsData();
}

function initFinancialsPagination() {
  const prevBtn = document.getElementById("financialsPrevPageBtn");
  const nextBtn = document.getElementById("financialsNextPageBtn");
  const pageSizeSelect = document.getElementById("financialsPageSizeSelect");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (financialsState.page > 1) {
        financialsState.page -= 1;
        loadFinancialsData();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (financialsState.page < financialsState.totalPages) {
        financialsState.page += 1;
        loadFinancialsData();
      }
    });
  }

  if (pageSizeSelect) {
    pageSizeSelect.value = String(financialsState.limit);
    pageSizeSelect.addEventListener("change", () => {
      financialsState.limit = Math.max(parseInt(pageSizeSelect.value, 10) || 10, 1);
      resetFinancialsPage();
      loadFinancialsData();
    });
  }
}

function resetFinancialsPage() {
  financialsState.page = 1;
}

async function loadFinancialsData() {
  setFinancialsTableLoading(true);
  const fromDate = document.getElementById("financialsFromDate")?.value;
  const toDate = document.getElementById("financialsToDate")?.value;
  const model = document.getElementById("financialsModelFilter")?.value || "";
  const factory = document.getElementById("financialsFactoryFilter")?.value || "";
  
  // Use selected sebanggo (背番号) array for filtering
  const bans = financialsState.selectedSebanggoArray;

  if (!fromDate || !toDate) {
    return;
  }

  try {
    const baseUrl = typeof BASE_URL !== "undefined" ? BASE_URL : (window.BASE_URL || "http://localhost:3000/");
    const response = await fetch(`${baseUrl}api/financials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromDate,
        toDate,
        model,
        bans,
        factory,
        page: financialsState.page,
        limit: financialsState.limit,
        sortField: financialsState.sortField,
        sortDir: financialsState.sortDir
      })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to load financials");
    }

    // Recovery is pre-applied server-side: each row already has `recoveredNg` stamped.
    // No second HTTP call needed.
    const rowsWithRecovery = (data.rows || []).map(row => {
      const recoveredNg = row.recoveredNg || 0;
      const pricePerPc = row.pricePerPc || 0;
      const created = row.created || 0;
      const ngAfterRecovery = Math.max((row.totalNg || 0) - recoveredNg, 0);
      const adjustedFinalGood = created - ngAfterRecovery;
      const adjustedScrapLoss = ngAfterRecovery * pricePerPc;
      const adjustedValue = (row.cost || 0) - adjustedScrapLoss;
      const adjustedYield = created > 0 ? (adjustedFinalGood / created) * 100 : 0;
      const adjustedDefectRate = created > 0 ? (ngAfterRecovery / created) * 100 : 0;
      return {
        ...row,
        recoveredNg,
        ngAfterRecovery,
        finalGood: adjustedFinalGood,
        scrapLoss: adjustedScrapLoss,
        value: adjustedValue,
        yieldPercent: Math.round(adjustedYield * 100) / 100,
        defectRate: Math.round(adjustedDefectRate * 100) / 100
      };
    });

    // Use server-side adjustedSummary which is computed from ALL rows (not just current page)
    // Fall back to data.summary if adjustedSummary is not available
    const summaryForCards = data.adjustedSummary || data.summary || {};
    summaryForCards.finalGoodYen = (summaryForCards.totalValue || 0) - (summaryForCards.scrapLoss || 0);

    financialsState.previousSummary = data.previousSummary || null;
    updateFinancialsSummary(summaryForCards);
    updateFinancialsTrend(data.trend);
    updateFinancialsCharts(data.scrapByProcess || {}, data.factoryTotals || {});
    renderFinancialsTop5(data.top5 || []);
    renderFinancialsFactoryRanking(data.factoryTotals || {});
    renderFinancialsTop5Value(data.top5Value || []);
    renderFinancialsFactoryFinalGood(data.factoryTotals || {});
    renderFinancialsTable(rowsWithRecovery);
    financialsState.totalRows = data.totalRows || 0;
    financialsState.totalPages = data.totalPages || 0;
    financialsState.page = data.page || financialsState.page;
    financialsState.limit = data.limit || financialsState.limit;
    financialsState.sortField = data.sortField || financialsState.sortField;
    financialsState.sortDir = data.sortDir || financialsState.sortDir;
    renderFinancialsPagination();
    updateFinancialsSortIcons();
    setFinancialsTableLoading(false);
  } catch (error) {
    console.error("Error loading financials:", error);
    setFinancialsTableLoading(false);
    updateFinancialsSummary({
      totalValue: 0,
      scrapLoss: 0,
      totalCreated: 0,
      finalGood: 0,
      totalLoss: 0,
      defectRate: 0,
      yieldPercent: 0
    });
    updateFinancialsCharts({}, {});
    renderFinancialsTable([]);
    financialsState.totalRows = 0;
    financialsState.totalPages = 0;
    renderFinancialsPagination();
    updateFinancialsSortIcons();
  }
}

function updateFinancialsDateRangeDisplay(start, end) {
  const display = document.getElementById("financialsDateRangeDisplay");
  if (!display) {
    return;
  }

  if (!start || !end) {
    display.textContent = "Select a date range";
    return;
  }

  display.textContent = `${start} to ${end}`;
}

function initFinancialsCharts() {
  const createdVsGood = document.getElementById("financialsCreatedVsGood");
  const scrapByProcess = document.getElementById("financialsScrapByProcess");
  const valueByFactory = document.getElementById("financialsValueByFactory");
  const scrapByFactory = document.getElementById("financialsScrapByFactory");

  if (window.Chart && createdVsGood) {
    if (financialsState.charts.createdVsGood) {
      financialsState.charts.createdVsGood.destroy();
    }
    financialsState.charts.createdVsGood = new Chart(createdVsGood, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: (typeof t === 'function') ? t('createdPcs') : "Created (pcs)",
            data: [],
            backgroundColor: "rgba(34, 197, 94, 0.7)",
            borderColor: "rgb(34, 197, 94)",
            borderWidth: 1
          },
          {
            label: (typeof t === 'function') ? t('finalGoodPcs') : "Final Good (pcs)",
            data: [],
            backgroundColor: "rgba(37, 99, 235, 0.7)",
            borderColor: "rgb(37, 99, 235)",
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.raw.toLocaleString()} pcs`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString() + ' pcs';
              }
            }
          }
        }
      }
    });
  }

  if (window.Chart && scrapByProcess) {
    if (financialsState.charts.scrapByProcess) {
      financialsState.charts.scrapByProcess.destroy();
    }
    financialsState.charts.scrapByProcess = new Chart(scrapByProcess, {
      type: "bar",
      data: {
        labels: [
          (typeof t === 'function') ? t('pressProcess') : "Press",
          (typeof t === 'function') ? t('slitProcess') : "Slit",
          (typeof t === 'function') ? t('srsProcess') : "SRS",
          (typeof t === 'function') ? t('inspectionProcess') : "Inspection"
        ],
        datasets: [
          {
            label: (typeof t === 'function') ? t('scrapLoss') : "Scrap Loss (¥)",
            data: [0, 0, 0, 0],
            backgroundColor: ["#f97316", "#0ea5e9", "#8b5cf6", "#22c55e"]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `¥${context.raw.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function(value) {
                return '¥' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
  }

  if (window.Chart && valueByFactory) {
    if (financialsState.charts.valueByFactory) {
      financialsState.charts.valueByFactory.destroy();
    }
    financialsState.charts.valueByFactory = new Chart(valueByFactory, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: (typeof t === 'function') ? t('totalValueYen') : "Total Value (¥)",
            data: [],
            backgroundColor: "rgba(37, 99, 235, 0.6)"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `¥${context.raw.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function(value) {
                return '¥' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
  }

  if (window.Chart && scrapByFactory) {
    if (financialsState.charts.scrapByFactory) {
      financialsState.charts.scrapByFactory.destroy();
    }
    financialsState.charts.scrapByFactory = new Chart(scrapByFactory, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: (typeof t === 'function') ? t('scrapLoss') : "Scrap Loss (¥)",
            data: [],
            backgroundColor: "rgba(220, 38, 38, 0.6)"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `¥${context.raw.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function(value) {
                return '¥' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
  }

  const trendChartEl = document.getElementById("financialsTrendChart");
  if (window.Chart && trendChartEl) {
    if (financialsState.charts.trendChart) {
      financialsState.charts.trendChart.destroy();
    }
    financialsState.charts.trendChart = new Chart(trendChartEl, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: (typeof t === 'function') ? t('cost') : "Cost (¥)",
            data: [],
            borderColor: "rgb(37, 99, 235)",
            backgroundColor: "rgba(37, 99, 235, 0.05)",
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: 3
          },
          {
            label: (typeof t === 'function') ? t('scrapLoss') : "Scrap Loss (¥)",
            data: [],
            borderColor: "rgb(220, 38, 38)",
            backgroundColor: "rgba(220, 38, 38, 0.05)",
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ¥${ctx.raw.toLocaleString()}`
            }
          }
        },
        scales: {
          y: {
            ticks: { callback: (v) => '¥' + v.toLocaleString() }
          }
        }
      }
    });
  }

  const posNegChartEl = document.getElementById("financialsPosNegChart");
  if (window.Chart && posNegChartEl) {
    if (financialsState.charts.posNegChart) {
      financialsState.charts.posNegChart.destroy();
    }
    financialsState.charts.posNegChart = new Chart(posNegChartEl, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: (typeof t === 'function') ? t('cost') : "Cost (¥)",
            data: [],
            backgroundColor: "rgba(22, 163, 74, 0.75)",
            borderColor: "rgb(22, 163, 74)",
            borderWidth: 1,
            borderRadius: 3,
            stack: "stack"
          },
          {
            label: (typeof t === 'function') ? t('scrapLoss') : "Scrap Loss (¥)",
            // values stored as negatives so bars go below zero
            data: [],
            backgroundColor: "rgba(220, 38, 38, 0.75)",
            borderColor: "rgb(220, 38, 38)",
            borderWidth: 1,
            borderRadius: 3,
            stack: "stack"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }, // custom legend in HTML header
          tooltip: {
            callbacks: {
              label: (ctx) => {
                // Show absolute value in tooltip regardless of sign
                const abs = Math.abs(ctx.raw || 0);
                return `${ctx.dataset.label}: ¥${abs.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            ticks: {
              maxTicksLimit: 10,
              callback: (v) => {
                const abs = Math.abs(v);
                if (abs === 0) return '¥0';
                if (abs >= 1000000) return (v < 0 ? '-' : '') + '¥' + (abs / 1000000) + 'M';
                return (v < 0 ? '-' : '') + '¥' + (abs / 1000) + 'K';
              }
            }
          }
        }
      }
    });
  }
}

function updateFinancialsSummary(summary) {
  const totalValue = document.getElementById("financialsTotalValue");
  const scrapLoss = document.getElementById("financialsScrapLoss");
  const finalGoodYen = document.getElementById("financialsFinalGoodYen");
  const totalCreated = document.getElementById("financialsTotalCreated");
  const totalLoss = document.getElementById("financialsTotalLoss");
  const finalGood = document.getElementById("financialsFinalGood");
  const defectRate = document.getElementById("financialsDefectRate");
  const yieldPercent = document.getElementById("financialsYield");
  const costRecoveryEl = document.getElementById("financialsCostRecovery");
  const prev = financialsState.previousSummary || {};

  if (totalValue) totalValue.textContent = `¥${formatNumber(summary.totalValue || 0)}`;
  if (scrapLoss)  scrapLoss.textContent  = `¥${formatNumber(summary.scrapLoss  || 0)}`;
  if (finalGoodYen) {
    const fgy = summary.finalGoodYen !== undefined
      ? summary.finalGoodYen
      : (summary.totalValue || 0) - (summary.scrapLoss || 0);
    finalGoodYen.textContent = `¥${formatNumber(fgy)}`;
  }
  if (totalCreated) totalCreated.textContent = `${formatNumber(summary.totalCreated || 0)} pcs`;
  if (totalLoss)    totalLoss.textContent    = `${formatNumber(summary.totalLoss    || 0)} pcs`;
  if (finalGood)    finalGood.textContent    = `${formatNumber(summary.finalGood    || 0)} pcs`;
  if (defectRate)   defectRate.textContent   = `${formatNumber(summary.defectRate   || 0)}%`;
  if (yieldPercent) yieldPercent.textContent = `${formatNumber(summary.yieldPercent || 0)}%`;

  const costRcvRate = (summary.totalValue || 0) > 0
    ? Number((((summary.totalValue - (summary.scrapLoss || 0)) / summary.totalValue) * 100).toFixed(2))
    : 0;
  if (costRecoveryEl) costRecoveryEl.textContent = `${formatNumber(costRcvRate)}%`;

  // Period-over-period delta badges
  _financialsDelta("financialsDelta-totalValue",   summary.totalValue   || 0, prev.totalValue,       false);
  _financialsDelta("financialsDelta-scrapLoss",    summary.scrapLoss    || 0, prev.scrapLoss,        true);
  _financialsDelta("financialsDelta-totalCreated", summary.totalCreated || 0, prev.totalCreated,     false);
  _financialsDelta("financialsDelta-totalLoss",    summary.totalLoss    || 0, prev.totalLoss,        true);
  _financialsDelta("financialsDelta-yield",        summary.yieldPercent || 0, prev.yieldPercent,     false);
  _financialsDelta("financialsDelta-defectRate",   summary.defectRate   || 0, prev.defectRate,       true);
  _financialsDelta("financialsDelta-costRecovery", costRcvRate,               prev.costRecoveryRate, false);
}

function updateFinancialsCharts(scrapByProcess, factoryTotals) {
  if (financialsState.charts.createdVsGood) {
    const labels = factoryTotals.factories || [];
    financialsState.charts.createdVsGood.data.labels = labels;
    financialsState.charts.createdVsGood.data.datasets[0].data = factoryTotals.created || [];
    financialsState.charts.createdVsGood.data.datasets[1].data = factoryTotals.finalGood || [];
    financialsState.charts.createdVsGood.update();
  }

  if (financialsState.charts.scrapByProcess) {
    const processValues = [
      scrapByProcess.press || 0,
      scrapByProcess.slit || 0,
      scrapByProcess.srs || 0,
      scrapByProcess.kensa || 0
    ];
    financialsState.charts.scrapByProcess.data.datasets[0].data = processValues;
    financialsState.charts.scrapByProcess.update();
  }

  if (financialsState.charts.valueByFactory) {
    const labels = factoryTotals.factories || [];
    financialsState.charts.valueByFactory.data.labels = labels;
    financialsState.charts.valueByFactory.data.datasets[0].data = factoryTotals.totalValue || [];
    financialsState.charts.valueByFactory.update();
  }

  if (financialsState.charts.scrapByFactory) {
    const labels = factoryTotals.factories || [];
    financialsState.charts.scrapByFactory.data.labels = labels;
    financialsState.charts.scrapByFactory.data.datasets[0].data = factoryTotals.scrapLoss || [];
    financialsState.charts.scrapByFactory.update();
  }
}

function setFinancialsTableLoading(isLoading) {
  const section = document.getElementById("financialsDetailSection");
  if (!section) return;
  const existing = document.getElementById("financialsTableLoadingOverlay");
  if (isLoading) {
    if (existing) return; // already showing
    const overlay = document.createElement("div");
    overlay.id = "financialsTableLoadingOverlay";
    overlay.style.cssText = [
      "position: absolute",
      "inset: 0",
      "background: rgba(255,255,255,0.75)",
      "display: flex",
      "flex-direction: column",
      "align-items: center",
      "justify-content: center",
      "z-index: 20",
      "border-radius: 0.5rem",
      "pointer-events: all"
    ].join(";");
    overlay.innerHTML = `
      <svg style="width:36px;height:36px;animation:financials-spin 0.8s linear infinite;color:#3b82f6" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="40 20" stroke-linecap="round"/>
      </svg>
      <span style="margin-top:10px;font-size:0.8rem;color:#6b7280;font-weight:500;">Loading...</span>
    `;
    // Inject keyframe once
    if (!document.getElementById("financials-spin-style")) {
      const style = document.createElement("style");
      style.id = "financials-spin-style";
      style.textContent = "@keyframes financials-spin { to { transform: rotate(360deg); } }";
      document.head.appendChild(style);
    }
    section.appendChild(overlay);
  } else {
    if (existing) existing.remove();
  }
}

function renderFinancialsTable(rows) {
  const body = document.getElementById("financialsDetailBody");
  if (!body) {
    return;
  }

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td class="px-4 py-3 text-gray-500" colspan="17" data-i18n="noDataLoaded">No data loaded.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows.map(row => `
    <tr>
      <td class="px-4 py-3">${row.hinban || "-"}</td>
      <td class="px-4 py-3">${row.ban || "-"}</td>
      <td class="px-4 py-3">${row.model || "-"}</td>
      <td class="px-4 py-3">${row.factory || "-"}</td>
      <td class="px-4 py-3">${formatNumber(row.created || 0)}</td>
      <td class="px-4 py-3">${formatNumber(row.pressNg || 0)}</td>
      <td class="px-4 py-3">${formatNumber(row.slitNg || 0)}</td>
      <td class="px-4 py-3">${formatNumber(row.srsNg || 0)}</td>
      <td class="px-4 py-3">${formatNumber(row.kensaNg || 0)}</td>
      <td class="px-4 py-3">${formatNumber(row.totalNg || 0)}</td>
      <td class="px-4 py-3" style="background-color: #fff3cd; font-weight: 600;">${formatNumber(row.recoveredNg || 0)}</td>
      <td class="px-4 py-3">${formatNumber((row.totalNg || 0) - (row.recoveredNg || 0))}</td>
      <td class="px-4 py-3">${formatNumber(row.finalGood || 0)}</td>
      <td class="px-4 py-3">${formatNumber(row.yieldPercent || 0)}%</td>
      <td class="px-4 py-3">¥${formatNumber(row.pricePerPc || 0)}</td>
      <td class="px-4 py-3">¥${formatNumber(row.cost || 0)}</td>
      <td class="px-4 py-3">¥${formatNumber(row.scrapLoss || 0)}</td>
      <td class="px-4 py-3">¥${formatNumber(row.value || 0)}</td>
    </tr>
  `).join("");
}

function renderFinancialsPagination() {
  const pageInfo = document.getElementById("financialsPageInfo");
  const prevBtn = document.getElementById("financialsPrevPageBtn");
  const nextBtn = document.getElementById("financialsNextPageBtn");
  const pageSizeSelect = document.getElementById("financialsPageSizeSelect");

  const totalRows = financialsState.totalRows || 0;
  const totalPages = financialsState.totalPages || 0;
  const page = financialsState.page || 1;
  const limit = financialsState.limit || 10;

  if (pageInfo) {
    if (totalRows === 0) {
      pageInfo.textContent = "0件中 0-0件を表示";
    } else {
      const start = (page - 1) * limit + 1;
      const end = Math.min(page * limit, totalRows);
      pageInfo.textContent = `${totalRows}件中 ${start}-${end}件を表示`;
    }
  }

  if (prevBtn) {
    prevBtn.disabled = page <= 1;
  }
  if (nextBtn) {
    nextBtn.disabled = totalPages === 0 || page >= totalPages;
  }
  if (pageSizeSelect) {
    pageSizeSelect.value = String(limit);
  }
}

function toggleFinancialsSort(field) {
  if (financialsState.sortField === field) {
    financialsState.sortDir = financialsState.sortDir === "asc" ? "desc" : "asc";
  } else {
    financialsState.sortField = field;
    financialsState.sortDir = "asc";
  }
  resetFinancialsPage();
  loadFinancialsData();
}

function getFinancialsSortIcon(field) {
  if (financialsState.sortField !== field) {
    return "↕";
  }
  return financialsState.sortDir === "asc" ? "↑" : "↓";
}

function updateFinancialsSortIcons() {
  const fields = ["hinban", "ban", "model", "factory", "created", "finalGood", "loss", "yieldPercent", "value", "scrapLoss"];
  fields.forEach(field => {
    const icon = document.getElementById(`financialsSortIcon-${field}`);
    if (icon) {
      icon.textContent = getFinancialsSortIcon(field);
    }
  });
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

// Helper: show period-over-period delta badge in an element
function _financialsDelta(elId, current, previous, lowerIsBetter) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (previous === null || previous === undefined || previous === 0) { el.textContent = ''; return; }
  const diff = current - previous;
  if (diff === 0) { el.textContent = ''; return; }
  const pct = Math.abs((diff / previous) * 100).toFixed(1);
  const isGood = lowerIsBetter ? diff < 0 : diff > 0;
  el.innerHTML = `<span class="${isGood ? 'text-green-600' : 'text-red-600'}">${diff > 0 ? '▲' : '▼'} ${pct}% ${(typeof t === 'function') ? t('vsPrev') : 'vs prev'}</span>`;
}

// Update the trend line chart from server data
function updateFinancialsTrend(trend) {
  const granLabel = document.getElementById("financialsTrendGranularity");
  if (granLabel) granLabel.textContent = (trend?.granularity === 'weekly') ? ((typeof t === 'function') ? t('weekly') : 'Weekly') : ((typeof t === 'function') ? t('daily') : 'Daily');

  if (!trend?.labels) return;

  // Format labels: 'yyyy-mm-dd' → 'M/D', weekly labels like '2026-W08' pass through
  const formattedLabels = (trend.labels || []).map(l => {
    const m = l.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${parseInt(m[2], 10)}/${parseInt(m[3], 10)}`;
    return l;
  });

  // Line chart
  if (financialsState.charts.trendChart) {
    financialsState.charts.trendChart.data.labels = formattedLabels;
    financialsState.charts.trendChart.data.datasets[0].data = trend.cost      || [];
    financialsState.charts.trendChart.data.datasets[1].data = trend.scrapLoss || [];
    financialsState.charts.trendChart.update();
  }

  // Positive / negative bar chart
  // Cost is positive (green bars above zero)
  // Scrap Loss is negated (red bars below zero)
  if (financialsState.charts.posNegChart) {
    financialsState.charts.posNegChart.data.labels = formattedLabels;
    financialsState.charts.posNegChart.data.datasets[0].data = trend.cost      || [];
    financialsState.charts.posNegChart.data.datasets[1].data = (trend.scrapLoss || []).map(v => -(v || 0));
    financialsState.charts.posNegChart.update();
  }
}

// Render top 5 worst-performing 背番号 table
function renderFinancialsTop5(top5) {
  const body = document.getElementById("financialsTop5Body");
  if (!body) return;
  if (!top5 || !top5.length) {
    body.innerHTML = `<tr><td colspan="5" class="px-3 py-3 text-gray-400 text-xs">${(typeof t === 'function') ? t('noData') : 'No data.'}</td></tr>`;
    return;
  }
  body.innerHTML = top5.map((r, i) => `
    <tr class="${i === 0 ? 'bg-red-50' : ''} cursor-pointer hover:bg-gray-100" title="${_fbT('breakdownClickHint', 'Click to see how this was calculated')}"
        data-fb-ban="${_fbEsc(r.ban)}" data-fb-hinban="${_fbEsc(r.hinban)}" data-fb-factory="${_fbEsc(r.factory)}" data-fb-expected="${r.scrapLoss || 0}" data-fb-metric="scrapLoss">
      <td class="px-3 py-2 text-xs text-gray-500">${i + 1}</td>
      <td class="px-3 py-2 font-medium text-sm">${r.ban || '-'}</td>
      <td class="px-3 py-2 text-xs text-gray-500">${r.model || '-'}</td>
      <td class="px-3 py-2 text-right text-sm font-semibold text-red-600">¥${formatNumber(r.scrapLoss || 0)}</td>
      <td class="px-3 py-2 text-right text-sm">${formatNumber(r.yieldPercent || 0)}%</td>
    </tr>
  `).join("");
}

// Render top 5 best-performing 背番号 by Final Good (¥)
function renderFinancialsTop5Value(top5Value) {
  const body = document.getElementById("financialsTop5ValueBody");
  if (!body) return;
  if (!top5Value || !top5Value.length) {
    body.innerHTML = `<tr><td colspan="5" class="px-3 py-3 text-gray-400 text-xs">${(typeof t === 'function') ? t('noData') : 'No data.'}</td></tr>`;
    return;
  }
  body.innerHTML = top5Value.map((r, i) => `
    <tr class="${i === 0 ? 'bg-green-50' : ''} cursor-pointer hover:bg-gray-100" title="${_fbT('breakdownClickHint', 'Click to see how this was calculated')}"
        data-fb-ban="${_fbEsc(r.ban)}" data-fb-hinban="${_fbEsc(r.hinban)}" data-fb-factory="${_fbEsc(r.factory)}" data-fb-expected="${r.value || 0}" data-fb-metric="value">
      <td class="px-3 py-2 text-xs text-gray-500">${i + 1}</td>
      <td class="px-3 py-2 font-medium text-sm">${r.ban || '-'}</td>
      <td class="px-3 py-2 text-xs text-gray-500">${r.model || '-'}</td>
      <td class="px-3 py-2 text-right text-sm font-semibold text-green-600">¥${formatNumber(r.value || 0)}</td>
      <td class="px-3 py-2 text-right text-sm">${formatNumber(r.yieldPercent || 0)}%</td>
    </tr>
  `).join("");
}

// Render factory Final Good (¥) ranking table
function renderFinancialsFactoryFinalGood(factoryTotals) {
  const body = document.getElementById("financialsFactoryFinalGoodBody");
  if (!body) return;
  const factories  = factoryTotals?.factories  || [];
  const totalValue = factoryTotals?.totalValue  || [];
  const scrapLoss  = factoryTotals?.scrapLoss   || [];
  const created    = factoryTotals?.created     || [];
  const finalGood  = factoryTotals?.finalGood   || [];
  if (!factories.length) {
    body.innerHTML = `<tr><td colspan="5" class="px-3 py-3 text-gray-400 text-xs">${(typeof t === 'function') ? t('noData') : 'No data.'}</td></tr>`;
    return;
  }
  const ranked = factories
    .map((name, i) => ({
      name,
      created:       created[i]    || 0,
      finalGoodPcs:  finalGood[i]  || 0,
      finalGoodYen:  Number(((totalValue[i] || 0) - (scrapLoss[i] || 0)).toFixed(2))
    }))
    .sort((a, b) => b.finalGoodYen - a.finalGoodYen);
  body.innerHTML = ranked.map((r, i) => {
    const yieldPct = r.created > 0 ? ((r.finalGoodPcs / r.created) * 100).toFixed(1) : '0.0';
    return `
      <tr>
        <td class="px-3 py-2 text-xs text-gray-500">${i + 1}</td>
        <td class="px-3 py-2 font-medium text-sm">${r.name}</td>
        <td class="px-3 py-2 text-right text-sm">${formatNumber(r.created)}</td>
        <td class="px-3 py-2 text-right text-sm font-semibold text-green-600">¥${formatNumber(r.finalGoodYen)}</td>
        <td class="px-3 py-2 text-right text-sm">${yieldPct}%</td>
      </tr>
    `;
  }).join("");
}

// Render factory scrap loss ranking table
function renderFinancialsFactoryRanking(factoryTotals) {
  const body = document.getElementById("financialsFactoryRankingBody");
  if (!body) return;
  const factories   = factoryTotals?.factories  || [];
  const scrapLosses = factoryTotals?.scrapLoss   || [];
  const created     = factoryTotals?.created     || [];
  const finalGood   = factoryTotals?.finalGood   || [];
  if (!factories.length) {
    body.innerHTML = `<tr><td colspan="5" class="px-3 py-3 text-gray-400 text-xs">${(typeof t === 'function') ? t('noData') : 'No data.'}</td></tr>`;
    return;
  }
  const ranked = factories
    .map((name, i) => ({ name, created: created[i] || 0, finalGood: finalGood[i] || 0, scrapLoss: scrapLosses[i] || 0 }))
    .sort((a, b) => b.scrapLoss - a.scrapLoss);
  body.innerHTML = ranked.map((r, i) => {
    const yieldPct = r.created > 0 ? ((r.finalGood / r.created) * 100).toFixed(1) : '0.0';
    return `
      <tr>
        <td class="px-3 py-2 text-xs text-gray-500">${i + 1}</td>
        <td class="px-3 py-2 font-medium text-sm">${r.name}</td>
        <td class="px-3 py-2 text-right text-sm">${formatNumber(r.created)}</td>
        <td class="px-3 py-2 text-right text-sm font-semibold text-red-600">¥${formatNumber(r.scrapLoss)}</td>
        <td class="px-3 py-2 text-right text-sm">${yieldPct}%</td>
      </tr>
    `;
  }).join("");
}

// PDF export — opens a print-ready window
function exportFinancialsPDF() {
  const fromDate     = document.getElementById("financialsFromDate")?.value  || '';
  const toDate       = document.getElementById("financialsToDate")?.value    || '';
  const totalValue   = document.getElementById("financialsTotalValue")?.textContent   || '¥0';
  const scrapLoss    = document.getElementById("financialsScrapLoss")?.textContent    || '¥0';
  const finalGoodYen = document.getElementById("financialsFinalGoodYen")?.textContent || '¥0';
  const costRecovery = document.getElementById("financialsCostRecovery")?.textContent || '0%';
  const totalCreated = document.getElementById("financialsTotalCreated")?.textContent || '0';
  const totalLoss    = document.getElementById("financialsTotalLoss")?.textContent    || '0';
  const finalGoodPcs = document.getElementById("financialsFinalGood")?.textContent   || '0';
  const defectRate   = document.getElementById("financialsDefectRate")?.textContent  || '0%';
  const yieldPct     = document.getElementById("financialsYield")?.textContent       || '0%';
  const top5Rows     = document.getElementById("financialsTop5Body")?.innerHTML      || '';
  const factoryRows  = document.getElementById("financialsFactoryRankingBody")?.innerHTML || '';
  const printContent = `<!DOCTYPE html><html><head><title>Financials ${fromDate} to ${toDate}</title>
<style>body{font-family:Arial,sans-serif;padding:20px;color:#333}h1{font-size:20px;margin-bottom:4px}.sub{color:#666;font-size:12px;margin-bottom:16px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px}.card{border:1px solid #ddd;border-radius:6px;padding:10px}.cl{font-size:10px;color:#666}.cv{font-size:16px;font-weight:bold}table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px}th{background:#f5f5f5;padding:6px 8px;text-align:left;border:1px solid #ddd}td{padding:5px 8px;border:1px solid #ddd}h2{font-size:13px;margin:16px 0 8px}@media print{body{padding:10px}input,button{display:none}}</style>
</head><body>
<h1>Financials Report</h1><div class="sub">${fromDate} to ${toDate}</div>
<div class="cards">
  <div class="card"><div class="cl">Total Cost (¥)</div><div class="cv">${totalValue}</div></div>
  <div class="card"><div class="cl">Scrap Loss (¥)</div><div class="cv" style="color:#dc2626">${scrapLoss}</div></div>
  <div class="card"><div class="cl">Final Good (¥)</div><div class="cv" style="color:#16a34a">${finalGoodYen}</div></div>
  <div class="card"><div class="cl">Cost Recovery Rate</div><div class="cv" style="color:#4f46e5">${costRecovery}</div></div>
  <div class="card"><div class="cl">Yield %</div><div class="cv">${yieldPct}</div></div>
  <div class="card"><div class="cl">Total Created (pcs)</div><div class="cv" style="color:#16a34a">${totalCreated}</div></div>
  <div class="card"><div class="cl">Total Loss (pcs)</div><div class="cv" style="color:#dc2626">${totalLoss}</div></div>
  <div class="card"><div class="cl">Final Good (pcs)</div><div class="cv" style="color:#2563eb">${finalGoodPcs}</div></div>
  <div class="card"><div class="cl">Defect Rate</div><div class="cv">${defectRate}</div></div>
</div>
<h2>Top 5 Highest Scrap Loss (背番号)</h2>
<table><thead><tr><th>#</th><th>背番号</th><th>Model</th><th>Scrap Loss (¥)</th><th>Yield %</th></tr></thead><tbody>${top5Rows}</tbody></table>
<h2>Factory Scrap Loss Ranking</h2>
<table><thead><tr><th>#</th><th>Factory</th><th>Created</th><th>Scrap Loss (¥)</th><th>Yield %</th></tr></thead><tbody>${factoryRows}</tbody></table>
</body></html>`;
  const w = window.open('', '_blank');
  w.document.write(printContent);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

async function exportFinancialsCSVServerLevel() {
  const btn = document.getElementById('financialsExportCsvBtn');
  const fromDate = document.getElementById('financialsFromDate')?.value;
  const toDate   = document.getElementById('financialsToDate')?.value;

  if (!fromDate || !toDate) {
    alert('Please select a date range first.');
    return;
  }

  const originalHtml = btn?.innerHTML;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Exporting...';
  }

  try {
    const baseUrl = typeof BASE_URL !== 'undefined' ? BASE_URL : (window.BASE_URL || 'http://localhost:3000/');
    const response = await fetch(`${baseUrl}api/financials/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromDate,
        toDate,
        model:     document.getElementById('financialsModelFilter')?.value   || '',
        factory:   document.getElementById('financialsFactoryFilter')?.value || '',
        bans:      financialsState.selectedSebanggoArray || [],
        sortField: financialsState.sortField,
        sortDir:   financialsState.sortDir,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${response.status}`);
    }

    const blob = await response.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `financials_${fromDate}_to_${toDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('CSV export failed:', error);
    alert('Export failed: ' + error.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

// ── Scrap Loss breakdown modal ───────────────────────────────────────────────
// Click a Top 5 row → explains how its ¥ was calculated (/api/financials/breakdown)
// and lists the raw source records, one server-side page at a time
// (/api/financials/breakdown/records).
const FINANCIALS_BREAKDOWN_SOURCES = ["press", "slit", "srs", "kensa", "recovery"];
const financialsBreakdownState = {
  ban: "", factory: "", fromDate: "", toDate: "",
  focus: null, source: "press", page: 1, limit: 20, requestId: 0
};

function _fbT(key, fallback) {
  const value = (typeof t === "function") ? t(key) : key;
  return value && value !== key ? value : fallback;
}

function _fbEsc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function _fbBaseUrl() {
  return typeof BASE_URL !== "undefined" ? BASE_URL : (window.BASE_URL || "http://localhost:3000/");
}

async function _fbPost(path, body) {
  const response = await fetch(`${_fbBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || "Request failed");
  return data;
}

function _fbSourceLabel(source) {
  return {
    press: _fbT("pressProcess", "Press"),
    slit: _fbT("slitProcess", "Slit"),
    srs: _fbT("srsProcess", "SRS"),
    kensa: _fbT("kensaProcess", "Kensa"),
    recovery: _fbT("recoveredNg", "Recovered NG")
  }[source];
}

function ensureFinancialsBreakdownModal() {
  let modal = document.getElementById("financialsBreakdownModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "financialsBreakdownModal";
  modal.className = "hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4";
  modal.style.zIndex = "60";
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl w-full max-w-[96vw] max-h-[92vh] flex flex-col">
      <div class="flex items-start justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h3 id="fbTitle" class="text-lg font-semibold text-gray-900"></h3>
          <div id="fbSubtitle" class="text-sm text-gray-500 mt-1"></div>
        </div>
        <button id="fbCloseBtn" class="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Close">&times;</button>
      </div>
      <div class="overflow-y-auto px-6 py-4 space-y-5">
        <div id="fbSummary"></div>
        <div>
          <div id="fbTabs" class="flex flex-wrap gap-2 border-b border-gray-200 mb-3"></div>
          <div id="fbRecords"></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) closeFinancialsBreakdown(); });
  modal.querySelector("#fbCloseBtn").addEventListener("click", closeFinancialsBreakdown);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeFinancialsBreakdown();
  });
  return modal;
}

function closeFinancialsBreakdown() {
  document.getElementById("financialsBreakdownModal")?.classList.add("hidden");
}

// focus = { hinban, factory, expected, metric } identifies the clicked Top 5 row
async function openFinancialsBreakdown(ban, focus = null) {
  const fromDate = document.getElementById("financialsFromDate")?.value;
  const toDate = document.getElementById("financialsToDate")?.value;
  if (!ban || !fromDate || !toDate) return;

  const modal = ensureFinancialsBreakdownModal();
  Object.assign(financialsBreakdownState, {
    ban, fromDate, toDate, focus, source: "press", page: 1,
    factory: document.getElementById("financialsFactoryFilter")?.value || ""
  });
  modal.classList.remove("hidden");
  modal.querySelector("#fbTitle").textContent = `${ban} — ${_fbT("breakdownTitle", "Scrap Loss Breakdown")}`;
  modal.querySelector("#fbSubtitle").textContent = `${fromDate} → ${toDate}`;
  modal.querySelector("#fbSummary").innerHTML = `<div class="text-sm text-gray-400">${_fbT("loading", "Loading...")}</div>`;
  renderFinancialsBreakdownTabs();
  loadFinancialsBreakdownRecords();

  try {
    const { ban: b, factory, fromDate: f, toDate: to } = financialsBreakdownState;
    const data = await _fbPost("api/financials/breakdown", { ban: b, factory, fromDate: f, toDate: to });
    if (financialsBreakdownState.ban !== b) return;
    if (data.model) modal.querySelector("#fbTitle").textContent = `${b} (${data.model}) — ${_fbT("breakdownTitle", "Scrap Loss Breakdown")}`;
    modal.querySelector("#fbSummary").innerHTML = renderFinancialsBreakdownSummary(data);
  } catch (error) {
    console.error("Breakdown load failed:", error);
    modal.querySelector("#fbSummary").innerHTML = `<div class="text-sm text-red-600">${_fbEsc(error.message)}</div>`;
  }
}

function renderFinancialsBreakdownSummary(data) {
  const n = formatNumber;
  const focus = financialsBreakdownState.focus;
  if (!data.rows.length) {
    return `<div class="text-sm text-gray-500">${_fbT("noData", "No data.")}</div>`;
  }

  const rowCards = data.rows.map(r => {
    const isFocus = focus && r.hinban === focus.hinban && r.factory === focus.factory;
    const ngParts = `${_fbT("pressProcess", "Press")} ${n(r.pressNg)} + ${_fbT("slitProcess", "Slit")} ${n(r.slitNg)} + ${_fbT("srsProcess", "SRS")} ${n(r.srsNg)} + ${_fbT("kensaProcess", "Kensa")} ${n(r.kensaNg)}`;
    return `
      <div class="border rounded-lg p-4 ${isFocus ? "border-red-300 bg-red-50" : "border-gray-200"}">
        <div class="flex flex-wrap justify-between gap-2 mb-2">
          <div class="font-semibold text-gray-800">${_fbEsc(r.hinban)} <span class="text-xs font-normal text-gray-500">/ ${_fbEsc(r.factory)}</span></div>
          <div class="text-lg font-bold text-red-600">¥${n(r.scrapLoss)}</div>
        </div>
        <ol class="text-sm text-gray-700 space-y-1 list-decimal list-inside">
          <li>${_fbT("created", "Created")}: <b>${n(r.created)}</b> pcs</li>
          <li>${_fbT("breakdownTotalNg", "Total NG")}: ${ngParts} = <b>${n(r.totalNg)}</b>${r.mergedZeroCreatedNg ? ` <span class="text-xs text-gray-500">(${_fbT("breakdownMerged", "incl. NG merged from lots with 0 created")}: ${n(r.mergedZeroCreatedNg)})</span>` : ""}</li>
          <li>${_fbT("recoveredNg", "Recovered NG")}: <span class="px-1 rounded" style="background:#fff3cd">− ${n(r.recoveredNg)}</span> <span class="text-xs text-gray-500">(${n(r.recoveryDocCount)} ${_fbT("breakdownRecoveryDocs", "recovery entries")})</span> → ${_fbT("breakdownNetNg", "Net NG")} <b>${n(r.ngAfterRecovery)}</b></li>
          <li>${_fbT("breakdownUnitPrice", "Unit price")}: <b>¥${n(r.pricePerPc)}</b> <span class="text-xs text-gray-500">(masterDB.pricePerPc, 品番 ${_fbEsc(r.hinban)})</span></li>
          <li>${_fbT("scrapLoss", "Scrap Loss (¥)")} = ${n(r.ngAfterRecovery)} × ¥${n(r.pricePerPc)} = <b class="text-red-600">¥${n(r.scrapLoss)}</b></li>
          <li>${_fbT("yieldPercent", "Yield %")} = (${n(r.created)} − ${n(r.ngAfterRecovery)}) ÷ ${n(r.created)} = <b>${n(r.yieldPercent)}%</b></li>
        </ol>
      </div>`;
  }).join("");

  const tot = data.totals;
  let match = "";
  if (focus && focus.expected != null) {
    const focusRow = data.rows.find(r => r.hinban === focus.hinban && r.factory === focus.factory);
    const actual = focusRow ? focusRow[focus.metric || "scrapLoss"] : null;
    const ok = actual != null && Math.abs(actual - focus.expected) < 1;
    match = ok
      ? `<span class="text-green-700">✔ ${_fbT("breakdownMatches", "Matches the table value")} (¥${n(focus.expected)})</span>`
      : `<span class="text-amber-700">⚠ ${_fbT("breakdownMismatch", "Differs from the table value")} (¥${n(focus.expected)} vs ¥${n(actual ?? 0)}) — ${_fbT("breakdownMismatchHint", "data may have changed since the page loaded")}</span>`;
  }

  const notes = [];
  if (data.skippedNoPrice.length) {
    notes.push(`${_fbT("breakdownNoPrice", "Excluded (no pricePerPc in masterDB)")}: ${data.skippedNoPrice.map(s => `${_fbEsc(s.hinban)} (${n(s.created)} / NG ${n(s.totalNg)})`).join(", ")}`);
  }
  if (data.unallocatedRecoveryDocs > 0) {
    notes.push(`${n(data.unallocatedRecoveryDocs)} ${_fbT("breakdownUnallocated", "recovery entries could not be matched to a row")}`);
  }

  return `
    <div class="space-y-3">
      ${rowCards}
      ${data.rows.length > 1 ? `
        <div class="text-sm text-gray-700 border-t border-gray-200 pt-2">
          <b>${_fbT("breakdownTotal", "Total")}</b>: ${_fbT("created", "Created")} ${n(tot.created)} · NG ${n(tot.totalNg)} − ${_fbT("recoveredNg", "Recovered NG")} ${n(tot.recoveredNg)} = ${n(tot.ngAfterRecovery)} ·
          ${_fbT("scrapLoss", "Scrap Loss (¥)")} <b class="text-red-600">¥${n(tot.scrapLoss)}</b> · ${_fbT("yieldPercent", "Yield %")} ${n(tot.yieldPercent)}%
        </div>` : ""}
      ${match ? `<div class="text-sm">${match}</div>` : ""}
      ${notes.map(x => `<div class="text-xs text-gray-500">${x}</div>`).join("")}
    </div>`;
}

function renderFinancialsBreakdownTabs() {
  const tabs = document.getElementById("fbTabs");
  if (!tabs) return;
  tabs.innerHTML = FINANCIALS_BREAKDOWN_SOURCES.map(source => {
    const active = source === financialsBreakdownState.source;
    return `<button data-source="${source}" class="px-3 py-2 text-sm -mb-px border-b-2 ${active ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent text-gray-500 hover:text-gray-800"}">${_fbSourceLabel(source)}</button>`;
  }).join("");
  tabs.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
    financialsBreakdownState.source = btn.dataset.source;
    financialsBreakdownState.page = 1;
    renderFinancialsBreakdownTabs();
    loadFinancialsBreakdownRecords();
  }));
}

async function loadFinancialsBreakdownRecords() {
  const container = document.getElementById("fbRecords");
  if (!container) return;
  const state = financialsBreakdownState;
  const requestId = ++state.requestId;
  container.innerHTML = `<div class="text-sm text-gray-400 py-4">${_fbT("loading", "Loading...")}</div>`;
  try {
    const data = await _fbPost("api/financials/breakdown/records", {
      ban: state.ban, factory: state.factory, fromDate: state.fromDate, toDate: state.toDate,
      source: state.source, page: state.page, limit: state.limit
    });
    if (requestId !== state.requestId) return; // a newer request superseded this one
    state.page = data.page;
    container.innerHTML = renderFinancialsBreakdownRecords(data);
    container.querySelector("[data-fb-prev]")?.addEventListener("click", () => { state.page -= 1; loadFinancialsBreakdownRecords(); });
    container.querySelector("[data-fb-next]")?.addEventListener("click", () => { state.page += 1; loadFinancialsBreakdownRecords(); });
  } catch (error) {
    if (requestId !== state.requestId) return;
    container.innerHTML = `<div class="text-sm text-red-600 py-4">${_fbEsc(error.message)}</div>`;
  }
}

function renderFinancialsBreakdownRecords(data) {
  const n = formatNumber;
  const isRecovery = data.source === "recovery";
  // Per-defect columns (press/slit/srs fixed names, kensa from the model's defectDefinitions)
  const useEN = (localStorage.getItem("lang") || "en") === "en";
  const defectCols = isRecovery ? [] : (data.defectColumns || []);
  const defectLabel = c => (useEN && c.label_en) ? c.label_en : c.label;
  const showMachine = data.source !== "kensa"; // kensa 設備 is a long table name that only wastes width
  const head = isRecovery
    ? [_fbT("breakdownDate", "Lot date"), _fbT("breakdownLot", "Lot"), "品番", _fbT("factory", "Factory"), _fbT("breakdownDefects", "Defect types"), _fbT("breakdownQty", "Qty")]
    : [_fbT("breakdownDate", "Lot date"), _fbT("breakdownLot", "Lot"), "品番", _fbT("factory", "Factory"), ...(showMachine ? [_fbT("breakdownMachine", "Machine")] : []), _fbT("breakdownWorker", "Worker"), _fbT("breakdownProduced", "Produced"), "NG", ...defectCols.map(defectLabel)];
  const textCols = isRecovery ? 5 : (showMachine ? 6 : 5); // leading left-aligned columns; the rest are numeric
  const body = data.records.map(r => isRecovery ? `
      <tr>
        <td class="px-3 py-2">${_fbEsc(r.lotDate || (r.createdAt || "").slice(0, 10))}</td>
        <td class="px-3 py-2">${_fbEsc(r.lot)}</td>
        <td class="px-3 py-2">${_fbEsc(r.hinban)}</td>
        <td class="px-3 py-2">${_fbEsc(r.factory)}</td>
        <td class="px-3 py-2">${r.recoveries.map(x => `${_fbEsc(x.defectType)}: ${n(x.quantity)}`).join(", ")}</td>
        <td class="px-3 py-2 text-right font-semibold" style="background:#fff3cd">${n(r.quantity)}</td>
      </tr>` : `
      <tr>
        <td class="px-3 py-2">${_fbEsc(r.date)}</td>
        <td class="px-3 py-2">${_fbEsc(r.lot)}</td>
        <td class="px-3 py-2">${_fbEsc(r.hinban)}</td>
        <td class="px-3 py-2">${_fbEsc(r.factory)}</td>
        ${showMachine ? `<td class="px-3 py-2">${_fbEsc(r.machine)}</td>` : ""}
        <td class="px-3 py-2">${_fbEsc(r.worker)}</td>
        <td class="px-3 py-2 text-right">${r.quantity == null ? "-" : n(r.quantity)}</td>
        <td class="px-3 py-2 text-right font-semibold">${n(r.ng)}</td>
        ${defectCols.map(c => { const v = r.defects?.[c.key] || 0; return `<td class="px-3 py-2 text-right ${v ? "text-red-600 font-medium" : "text-gray-300"}">${n(v)}</td>`; }).join("")}
      </tr>`).join("");
  const from = data.total ? (data.page - 1) * data.limit + 1 : 0;
  const to = Math.min(data.page * data.limit, data.total);
  return `
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm whitespace-nowrap">
        <thead class="bg-gray-50 text-gray-600 text-xs"><tr>${head.map((h, i) => `<th class="px-3 py-2 whitespace-nowrap ${i >= textCols ? "text-right" : "text-left"}" ${i >= textCols && !isRecovery && i >= textCols + 2 ? 'style="min-width:7rem;white-space:normal"' : ""}>${_fbEsc(h)}</th>`).join("")}</tr></thead>
        <tbody class="divide-y divide-gray-100">${body || `<tr><td colspan="${head.length}" class="px-3 py-4 text-gray-400">${_fbT("noData", "No data.")}</td></tr>`}</tbody>
      </table>
    </div>
    <div class="flex items-center justify-between mt-3 text-sm text-gray-600">
      <span>${from}–${to} / ${n(data.total)}</span>
      <div class="flex gap-2">
        <button data-fb-prev class="px-3 py-1 border rounded ${data.page <= 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}" ${data.page <= 1 ? "disabled" : ""}>‹</button>
        <span class="py-1">${data.page} / ${Math.max(data.totalPages, 1)}</span>
        <button data-fb-next class="px-3 py-1 border rounded ${data.page >= data.totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}" ${data.page >= data.totalPages ? "disabled" : ""}>›</button>
      </div>
    </div>`;
}

// Delegated click handler for the clickable Top 5 rows (data-fb-* attributes)
document.addEventListener("click", e => {
  const row = e.target.closest("tr[data-fb-ban]");
  if (!row) return;
  openFinancialsBreakdown(row.dataset.fbBan, {
    hinban: row.dataset.fbHinban,
    factory: row.dataset.fbFactory,
    expected: Number(row.dataset.fbExpected),
    metric: row.dataset.fbMetric
  });
});

window.initFinancialsPage = initFinancialsPage;
window.toggleFinancialsSort = toggleFinancialsSort;
window.exportFinancialsPDF = exportFinancialsPDF;
window.exportFinancialsCSVServerLevel = exportFinancialsCSVServerLevel;
