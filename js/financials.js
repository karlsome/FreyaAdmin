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
  tempSelectedSebanggo: []
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

    // Fetch recovery data
    let recoveryData = {};
    try {
      const recoveryResponse = await fetch(`${baseUrl}api/get-all-recoveries?factory=${factory}&startDate=${fromDate}&endDate=${toDate}`);
      if (recoveryResponse.ok) {
        const recoveryResult = await recoveryResponse.json();
        if (recoveryResult.recoveries) {
          // Group recovery data by 背番号
          recoveryResult.recoveries.forEach(item => {
            const key = item.背番号;
            if (!recoveryData[key]) {
              recoveryData[key] = {
                疵引不良: 0,
                加工不良: 0,
                その他: 0,
                total: 0
              };
            }
            item.recoveries.forEach(recovery => {
              recoveryData[key][recovery.defectType] = (recoveryData[key][recovery.defectType] || 0) + recovery.quantity;
              recoveryData[key].total += recovery.quantity;
            });
          });
        }
      }
    } catch (error) {
      console.warn("Could not fetch recovery data:", error);
    }

    // Merge recovery data into rows and recalculate affected values
    const rowsWithRecovery = (data.rows || []).map(row => {
      const recoveredNg = recoveryData[row.ban]?.total || 0;
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

    updateFinancialsSummary(summaryForCards);
    updateFinancialsCharts(data.scrapByProcess || {}, data.factoryTotals || {});
    renderFinancialsTable(rowsWithRecovery);
    financialsState.totalRows = data.totalRows || 0;
    financialsState.totalPages = data.totalPages || 0;
    financialsState.page = data.page || financialsState.page;
    financialsState.limit = data.limit || financialsState.limit;
    financialsState.sortField = data.sortField || financialsState.sortField;
    financialsState.sortDir = data.sortDir || financialsState.sortDir;
    renderFinancialsPagination();
    updateFinancialsSortIcons();
  } catch (error) {
    console.error("Error loading financials:", error);
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

  if (totalValue) {
    totalValue.textContent = `¥${formatNumber(summary.totalValue || 0)}`;
  }
  if (scrapLoss) {
    scrapLoss.textContent = `¥${formatNumber(summary.scrapLoss || 0)}`;
  }
  if (finalGoodYen) {
    const fgy = summary.finalGoodYen !== undefined
      ? summary.finalGoodYen
      : (summary.totalValue || 0) - (summary.scrapLoss || 0);
    finalGoodYen.textContent = `¥${formatNumber(fgy)}`;
  }
  if (totalCreated) {
    totalCreated.textContent = `${formatNumber(summary.totalCreated || 0)} pcs`;
  }
  if (totalLoss) {
    totalLoss.textContent = `${formatNumber(summary.totalLoss || 0)} pcs`;
  }
  if (finalGood) {
    finalGood.textContent = `${formatNumber(summary.finalGood || 0)} pcs`;
  }
  if (defectRate) {
    defectRate.textContent = `${formatNumber(summary.defectRate || 0)}%`;
  }
  if (yieldPercent) {
    yieldPercent.textContent = `${formatNumber(summary.yieldPercent || 0)}%`;
  }
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

window.initFinancialsPage = initFinancialsPage;
window.toggleFinancialsSort = toggleFinancialsSort;
