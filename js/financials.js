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
            label: "Created (pcs)",
            data: [],
            backgroundColor: "rgba(34, 197, 94, 0.7)",
            borderColor: "rgb(34, 197, 94)",
            borderWidth: 1
          },
          {
            label: "Final Good (pcs)",
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
        labels: ["Press", "Slit", "SRS", "Inspection"],
        datasets: [
          {
            label: "Scrap Loss (¥)",
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
            label: "Total Value (¥)",
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
            label: "Scrap Loss (¥)",
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
            label: "Cost (¥)",
            data: [],
            borderColor: "rgb(37, 99, 235)",
            backgroundColor: "rgba(37, 99, 235, 0.05)",
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: 3
          },
          {
            label: "Scrap Loss (¥)",
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
            label: "Cost (¥)",
            data: [],
            backgroundColor: "rgba(22, 163, 74, 0.75)",
            borderColor: "rgb(22, 163, 74)",
            borderWidth: 1,
            borderRadius: 3,
            stack: "stack"
          },
          {
            label: "Scrap Loss (¥)",
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
  el.innerHTML = `<span class="${isGood ? 'text-green-600' : 'text-red-600'}">${diff > 0 ? '▲' : '▼'} ${pct}% vs prev</span>`;
}

// Update the trend line chart from server data
function updateFinancialsTrend(trend) {
  const granLabel = document.getElementById("financialsTrendGranularity");
  if (granLabel) granLabel.textContent = (trend?.granularity === 'weekly') ? 'Weekly' : 'Daily';

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
    body.innerHTML = '<tr><td colspan="5" class="px-3 py-3 text-gray-400 text-xs">No data.</td></tr>';
    return;
  }
  body.innerHTML = top5.map((r, i) => `
    <tr class="${i === 0 ? 'bg-red-50' : ''}">
      <td class="px-3 py-2 text-xs text-gray-500">${i + 1}</td>
      <td class="px-3 py-2 font-medium text-sm">${r.ban || '-'}</td>
      <td class="px-3 py-2 text-xs text-gray-500">${r.model || '-'}</td>
      <td class="px-3 py-2 text-right text-sm font-semibold text-red-600">¥${formatNumber(r.scrapLoss || 0)}</td>
      <td class="px-3 py-2 text-right text-sm">${formatNumber(r.yieldPercent || 0)}%</td>
    </tr>
  `).join("");
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
    body.innerHTML = '<tr><td colspan="5" class="px-3 py-3 text-gray-400 text-xs">No data.</td></tr>';
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

window.initFinancialsPage = initFinancialsPage;
window.toggleFinancialsSort = toggleFinancialsSort;
window.exportFinancialsPDF = exportFinancialsPDF;
