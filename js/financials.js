const financialsState = {
  charts: {},
  data: [],
  page: 1,
  limit: 10,
  totalPages: 0,
  totalRows: 0,
  sortField: "hinban",
  sortDir: "asc",
  hinbanDebounce: null
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
  const processSelect = document.getElementById("financialsProcessFilter");
  const includeAllNg = document.getElementById("financialsIncludeAllNg");
  const hinbanInput = document.getElementById("financialsHinbanFilter");

  if (modelSelect) {
    modelSelect.addEventListener("change", () => {
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

  if (processSelect) {
    processSelect.addEventListener("change", () => {
      resetFinancialsPage();
      loadFinancialsData();
    });
  }

  if (includeAllNg) {
    includeAllNg.addEventListener("change", () => {
      resetFinancialsPage();
      loadFinancialsData();
    });
  }

  if (hinbanInput) {
    hinbanInput.addEventListener("input", () => {
      if (financialsState.hinbanDebounce) {
        clearTimeout(financialsState.hinbanDebounce);
      }
      financialsState.hinbanDebounce = setTimeout(() => {
        resetFinancialsPage();
        loadFinancialsData();
      }, 300);
    });
  }
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
  const hinban = document.getElementById("financialsHinbanFilter")?.value?.trim() || "";
  const process = document.getElementById("financialsProcessFilter")?.value || "all";
  const factory = document.getElementById("financialsFactoryFilter")?.value || "";
  const includeAllNg = document.getElementById("financialsIncludeAllNg")?.checked ?? true;

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
        hinban,
        process,
        factory,
        page: financialsState.page,
        limit: financialsState.limit,
        sortField: financialsState.sortField,
        sortDir: financialsState.sortDir,
        includeAllNg
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
        <td class="px-4 py-3 text-gray-500" colspan="10">No data loaded.</td>
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
      <td class="px-4 py-3">${formatNumber(row.finalGood || 0)}</td>
      <td class="px-4 py-3">${formatNumber(row.loss || 0)}</td>
      <td class="px-4 py-3">${formatNumber(row.yieldPercent || 0)}%</td>
      <td class="px-4 py-3">¥${formatNumber(row.value || 0)}</td>
      <td class="px-4 py-3">¥${formatNumber(row.scrapLoss || 0)}</td>
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
