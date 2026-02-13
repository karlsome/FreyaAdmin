const financialsState = {
  charts: {},
  data: [],
  page: 1,
  limit: 10,
  totalPages: 0,
  totalRows: 0,
  sortField: "hinban",
  sortDir: "asc",
  hinbanDebounce: null,
  // Tag filter state
  selectedHinbans: [],
  selectedBans: [],
  availableProducts: [],
  currentSelectorType: null // 'hinban' or 'ban'
};

function initFinancialsPage() {
  setupFinancialsDateRange();
  initFinancialsCharts();
  loadFinancialsModelOptions();
  loadFinancialsFactoryOptions();
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

  modelSelect.innerHTML = '<option value="">Loading...</option>';
  modelSelect.disabled = true;

  try {
    const baseUrl = typeof BASE_URL !== "undefined" ? BASE_URL : (window.BASE_URL || "http://localhost:3000/");
    const response = await fetch(`${baseUrl}api/masterdb/models`);
    const data = await response.json();

    if (response.ok && data.success && Array.isArray(data.data)) {
      const options = ['<option value="">All Models</option>'];
      data.data.forEach(model => {
        options.push(`<option value="${model}">${model}</option>`);
      });
      modelSelect.innerHTML = options.join("");
    } else {
      modelSelect.innerHTML = '<option value="">All Models</option>';
    }
  } catch (error) {
    console.error("Failed to load model options:", error);
    modelSelect.innerHTML = '<option value="">All Models</option>';
  } finally {
    modelSelect.disabled = false;
  }
}

async function loadFinancialsFactoryOptions() {
  const factorySelect = document.getElementById("financialsFactoryFilter");
  if (!factorySelect) {
    return;
  }

  factorySelect.innerHTML = '<option value="">Loading...</option>';
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
      const options = ['<option value="">All Factories</option>'];
      factories.forEach(factory => {
        options.push(`<option value="${factory}">${factory}</option>`);
      });
      factorySelect.innerHTML = options.join("");
    } else {
      factorySelect.innerHTML = '<option value="">All Factories</option>';
    }
  } catch (error) {
    console.error("Failed to load factory options:", error);
    factorySelect.innerHTML = '<option value="">All Factories</option>';
  } finally {
    factorySelect.disabled = false;
  }
}

function setupFinancialsFilters() {
  const modelSelect = document.getElementById("financialsModelFilter");
  const factorySelect = document.getElementById("financialsFactoryFilter");
  const hinbanInput = document.getElementById("financialsHinbanInput");
  const banInput = document.getElementById("financialsBanInput");

  if (modelSelect) {
    modelSelect.addEventListener("change", () => {
      // Reset selected tags when model changes
      financialsState.selectedHinbans = [];
      financialsState.selectedBans = [];
      renderFinancialsHinbanTags();
      renderFinancialsBanTags();
      loadFinancialsAvailableProducts();
      resetFinancialsPage();
      loadFinancialsData();
    });
  }

  if (factorySelect) {
    factorySelect.addEventListener("change", () => {
      resetFinancialsPage();
      loadFinancialsData();
    });
  }

  // Hinban tag input
  if (hinbanInput) {
    hinbanInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const value = hinbanInput.value.trim();
        if (value && !financialsState.selectedHinbans.includes(value)) {
          financialsState.selectedHinbans.push(value);
          renderFinancialsHinbanTags();
          hinbanInput.value = "";
          resetFinancialsPage();
          loadFinancialsData();
        }
      } else if (e.key === "Backspace" && !hinbanInput.value) {
        if (financialsState.selectedHinbans.length > 0) {
          financialsState.selectedHinbans.pop();
          renderFinancialsHinbanTags();
          resetFinancialsPage();
          loadFinancialsData();
        }
      }
    });
  }

  // Ban tag input
  if (banInput) {
    banInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const value = banInput.value.trim();
        if (value && !financialsState.selectedBans.includes(value)) {
          financialsState.selectedBans.push(value);
          renderFinancialsBanTags();
          banInput.value = "";
          resetFinancialsPage();
          loadFinancialsData();
        }
      } else if (e.key === "Backspace" && !banInput.value) {
        if (financialsState.selectedBans.length > 0) {
          financialsState.selectedBans.pop();
          renderFinancialsBanTags();
          resetFinancialsPage();
          loadFinancialsData();
        }
      }
    });
  }
}

// === Tag Rendering Functions ===
function renderFinancialsHinbanTags() {
  const container = document.getElementById("financialsHinbanTags");
  if (!container) return;

  container.innerHTML = financialsState.selectedHinbans.map(hinban =>
    `<span class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
      ${hinban}
      <button type="button" onclick="removeFinancialsHinban('${hinban}')" class="text-blue-600 hover:text-blue-900">
        <i class="ri-close-line"></i>
      </button>
    </span>`
  ).join("");
}

function renderFinancialsBanTags() {
  const container = document.getElementById("financialsBanTags");
  if (!container) return;

  container.innerHTML = financialsState.selectedBans.map(ban =>
    `<span class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
      ${ban}
      <button type="button" onclick="removeFinancialsBan('${ban}')" class="text-green-600 hover:text-green-900">
        <i class="ri-close-line"></i>
      </button>
    </span>`
  ).join("");
}

function removeFinancialsHinban(hinban) {
  financialsState.selectedHinbans = financialsState.selectedHinbans.filter(h => h !== hinban);
  renderFinancialsHinbanTags();
  resetFinancialsPage();
  loadFinancialsData();
}

function removeFinancialsBan(ban) {
  financialsState.selectedBans = financialsState.selectedBans.filter(b => b !== ban);
  renderFinancialsBanTags();
  resetFinancialsPage();
  loadFinancialsData();
}

// === Available Products Loading ===
async function loadFinancialsAvailableProducts() {
  const model = document.getElementById("financialsModelFilter")?.value || "";
  const container = document.getElementById("financialsAvailableProducts");
  
  if (!container) return;
  
  if (!model) {
    container.innerHTML = '<p class="text-sm text-gray-500">Select a model to see available 品番/背番号</p>';
    financialsState.availableProducts = [];
    return;
  }

  container.innerHTML = '<p class="text-sm text-gray-500">Loading...</p>';

  try {
    const baseUrl = typeof BASE_URL !== "undefined" ? BASE_URL : (window.BASE_URL || "http://localhost:3000/");
    const response = await fetch(`${baseUrl}api/masterdb/products?model=${encodeURIComponent(model)}`);
    const data = await response.json();

    if (response.ok && data.success && Array.isArray(data.data)) {
      financialsState.availableProducts = data.data;
      renderFinancialsAvailableProducts();
    } else {
      container.innerHTML = '<p class="text-sm text-gray-500">No products found</p>';
      financialsState.availableProducts = [];
    }
  } catch (error) {
    console.error("Failed to load available products:", error);
    container.innerHTML = '<p class="text-sm text-red-500">Failed to load products</p>';
    financialsState.availableProducts = [];
  }
}

function renderFinancialsAvailableProducts() {
  const container = document.getElementById("financialsAvailableProducts");
  if (!container) return;

  const products = financialsState.availableProducts;
  if (products.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500">No products found for this model</p>';
    return;
  }

  // Get unique hinbans and bans
  const hinbanSet = new Set();
  const banSet = new Set();
  products.forEach(p => {
    if (p.品番) hinbanSet.add(p.品番);
    if (p.背番号) banSet.add(String(p.背番号));
  });

  const hinbans = Array.from(hinbanSet).sort();
  const bans = Array.from(banSet).sort((a, b) => parseInt(a) - parseInt(b));

  // Show max 5 tags each, with "Show all" button
  const maxVisible = 5;
  const visibleHinbans = hinbans.slice(0, maxVisible);
  const visibleBans = bans.slice(0, maxVisible);
  const moreHinbans = hinbans.length - maxVisible;
  const moreBans = bans.length - maxVisible;

  let html = '<div class="space-y-2">';
  
  // Hinban tags
  html += '<div class="flex flex-wrap items-center gap-1">';
  html += '<span class="text-xs text-gray-500 mr-1">品番:</span>';
  visibleHinbans.forEach(h => {
    const isSelected = financialsState.selectedHinbans.includes(h);
    html += `<button type="button" onclick="toggleFinancialsHinban('${h}')" 
      class="px-2 py-0.5 text-xs rounded border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}">
      ${h}
    </button>`;
  });
  if (moreHinbans > 0) {
    html += `<button type="button" onclick="openFinancialsProductSelector('hinban')" class="text-xs text-blue-600 hover:underline ml-1">
      +${moreHinbans} more (Show all)
    </button>`;
  }
  html += '</div>';

  // Ban tags
  html += '<div class="flex flex-wrap items-center gap-1">';
  html += '<span class="text-xs text-gray-500 mr-1">背番号:</span>';
  visibleBans.forEach(b => {
    const isSelected = financialsState.selectedBans.includes(b);
    html += `<button type="button" onclick="toggleFinancialsBan('${b}')" 
      class="px-2 py-0.5 text-xs rounded border ${isSelected ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}">
      ${b}
    </button>`;
  });
  if (moreBans > 0) {
    html += `<button type="button" onclick="openFinancialsProductSelector('ban')" class="text-xs text-green-600 hover:underline ml-1">
      +${moreBans} more (Show all)
    </button>`;
  }
  html += '</div>';
  
  html += '</div>';
  container.innerHTML = html;
}

function toggleFinancialsHinban(hinban) {
  const idx = financialsState.selectedHinbans.indexOf(hinban);
  if (idx === -1) {
    financialsState.selectedHinbans.push(hinban);
  } else {
    financialsState.selectedHinbans.splice(idx, 1);
  }
  renderFinancialsHinbanTags();
  renderFinancialsAvailableProducts();
  resetFinancialsPage();
  loadFinancialsData();
}

function toggleFinancialsBan(ban) {
  const idx = financialsState.selectedBans.indexOf(ban);
  if (idx === -1) {
    financialsState.selectedBans.push(ban);
  } else {
    financialsState.selectedBans.splice(idx, 1);
  }
  renderFinancialsBanTags();
  renderFinancialsAvailableProducts();
  resetFinancialsPage();
  loadFinancialsData();
}

// === Modal Functions ===
function openFinancialsProductSelector(type) {
  financialsState.currentSelectorType = type;
  const modal = document.getElementById("financialsProductSelectorModal");
  const title = document.getElementById("financialsSelectorModalTitle");
  const searchInput = document.getElementById("financialsProductSearch");
  
  if (!modal) return;
  
  title.textContent = type === 'hinban' ? 'Select 品番' : 'Select 背番号';
  if (searchInput) searchInput.value = "";
  
  renderFinancialsProductList();
  modal.classList.remove("hidden");
}

function closeFinancialsProductSelector() {
  const modal = document.getElementById("financialsProductSelectorModal");
  if (modal) modal.classList.add("hidden");
  financialsState.currentSelectorType = null;
}

function renderFinancialsProductList() {
  const container = document.getElementById("financialsProductListContainer");
  const searchInput = document.getElementById("financialsProductSearch");
  if (!container) return;

  const type = financialsState.currentSelectorType;
  const searchTerm = (searchInput?.value || "").toLowerCase();
  const products = financialsState.availableProducts;

  // Get unique values
  const valueSet = new Set();
  products.forEach(p => {
    if (type === 'hinban' && p.品番) valueSet.add(p.品番);
    if (type === 'ban' && p.背番号) valueSet.add(String(p.背番号));
  });

  let values = Array.from(valueSet);
  
  // Sort
  if (type === 'ban') {
    values.sort((a, b) => parseInt(a) - parseInt(b));
  } else {
    values.sort();
  }

  // Filter by search
  if (searchTerm) {
    values = values.filter(v => v.toLowerCase().includes(searchTerm));
  }

  if (values.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-sm">No items found</p>';
    return;
  }

  const selectedArray = type === 'hinban' ? financialsState.selectedHinbans : financialsState.selectedBans;
  
  let html = '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">';
  values.forEach(v => {
    const isChecked = selectedArray.includes(v);
    html += `<label class="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer ${isChecked ? 'bg-blue-50 border-blue-300' : 'bg-white'}">
      <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleFinancialsModalItem('${v}')" class="rounded text-blue-600" />
      <span class="text-sm truncate">${v}</span>
    </label>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function filterFinancialsProductList() {
  renderFinancialsProductList();
}

function toggleFinancialsModalItem(value) {
  const type = financialsState.currentSelectorType;
  const selectedArray = type === 'hinban' ? financialsState.selectedHinbans : financialsState.selectedBans;
  
  const idx = selectedArray.indexOf(value);
  if (idx === -1) {
    selectedArray.push(value);
  } else {
    selectedArray.splice(idx, 1);
  }
  
  renderFinancialsProductList();
}

function checkAllFinancialsProducts() {
  const type = financialsState.currentSelectorType;
  const searchInput = document.getElementById("financialsProductSearch");
  const searchTerm = (searchInput?.value || "").toLowerCase();
  const products = financialsState.availableProducts;

  // Get unique values
  const valueSet = new Set();
  products.forEach(p => {
    if (type === 'hinban' && p.品番) valueSet.add(p.品番);
    if (type === 'ban' && p.背番号) valueSet.add(String(p.背番号));
  });

  let values = Array.from(valueSet);
  if (searchTerm) {
    values = values.filter(v => v.toLowerCase().includes(searchTerm));
  }

  if (type === 'hinban') {
    values.forEach(v => {
      if (!financialsState.selectedHinbans.includes(v)) {
        financialsState.selectedHinbans.push(v);
      }
    });
  } else {
    values.forEach(v => {
      if (!financialsState.selectedBans.includes(v)) {
        financialsState.selectedBans.push(v);
      }
    });
  }

  renderFinancialsProductList();
}

function uncheckAllFinancialsProducts() {
  const type = financialsState.currentSelectorType;
  const searchInput = document.getElementById("financialsProductSearch");
  const searchTerm = (searchInput?.value || "").toLowerCase();
  const products = financialsState.availableProducts;

  // Get unique values
  const valueSet = new Set();
  products.forEach(p => {
    if (type === 'hinban' && p.品番) valueSet.add(p.品番);
    if (type === 'ban' && p.背番号) valueSet.add(String(p.背番号));
  });

  let values = Array.from(valueSet);
  if (searchTerm) {
    values = values.filter(v => v.toLowerCase().includes(searchTerm));
  }

  if (type === 'hinban') {
    financialsState.selectedHinbans = financialsState.selectedHinbans.filter(h => !values.includes(h));
  } else {
    financialsState.selectedBans = financialsState.selectedBans.filter(b => !values.includes(b));
  }

  renderFinancialsProductList();
}

function confirmFinancialsProductSelection() {
  closeFinancialsProductSelector();
  renderFinancialsHinbanTags();
  renderFinancialsBanTags();
  renderFinancialsAvailableProducts();
  resetFinancialsPage();
  loadFinancialsData();
}

function selectAllFinancialsProducts() {
  checkAllFinancialsProducts();
  confirmFinancialsProductSelection();
}

function clearAllFinancialsProducts() {
  financialsState.selectedHinbans = [];
  financialsState.selectedBans = [];
  renderFinancialsHinbanTags();
  renderFinancialsBanTags();
  renderFinancialsAvailableProducts();
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
  
  // Use selected tags arrays
  const hinbans = financialsState.selectedHinbans;
  const bans = financialsState.selectedBans;

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
        hinbans,
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

    updateFinancialsSummary(data.summary || {});
    updateFinancialsCharts(data.scrapByProcess || {}, data.factoryTotals || {});
    renderFinancialsTable(data.rows || []);
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
        <td class="px-4 py-3 text-gray-500" colspan="16">No data loaded.</td>
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
