const financialsState = {
  charts: {},
  data: []
};

function initFinancialsPage() {
  setupFinancialsDateRange();
  initFinancialsCharts();
  loadFinancialsModelOptions();
  updateFinancialsSummary({
    totalValue: 0,
    scrapLoss: 0,
    yieldPercent: 0,
    totalQty: 0
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

  rangeSelect.addEventListener("change", applyRange);
  fromInput.addEventListener("change", () => updateFinancialsDateRangeDisplay(fromInput.value, toInput.value));
  toInput.addEventListener("change", () => updateFinancialsDateRangeDisplay(fromInput.value, toInput.value));
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      updateFinancialsDateRangeDisplay(fromInput.value, toInput.value);
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

async function loadFinancialsData() {
  const fromDate = document.getElementById("financialsFromDate")?.value;
  const toDate = document.getElementById("financialsToDate")?.value;
  const model = document.getElementById("financialsModelFilter")?.value || "";
  const hinban = document.getElementById("financialsHinbanFilter")?.value?.trim() || "";
  const process = document.getElementById("financialsProcessFilter")?.value || "all";
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
        includeAllNg
      })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to load financials");
    }

    updateFinancialsSummary(data.summary || {});
    updateFinancialsCharts(data.series || {}, data.scrapByProcess || {});
    renderFinancialsTable(data.rows || []);
  } catch (error) {
    console.error("Error loading financials:", error);
    updateFinancialsSummary({
      totalValue: 0,
      scrapLoss: 0,
      yieldPercent: 0,
      totalQty: 0
    });
    updateFinancialsCharts({}, {});
    renderFinancialsTable([]);
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
  const valueTrend = document.getElementById("financialsValueTrend");
  const scrapByProcess = document.getElementById("financialsScrapByProcess");

  if (window.Chart && valueTrend) {
    if (financialsState.charts.valueTrend) {
      financialsState.charts.valueTrend.destroy();
    }
    financialsState.charts.valueTrend = new Chart(valueTrend, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Total Value",
            data: [],
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.1)",
            tension: 0.3,
            fill: true
          },
          {
            label: "Scrap Loss",
            data: [],
            borderColor: "#dc2626",
            backgroundColor: "rgba(220, 38, 38, 0.1)",
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
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
            label: "Scrap Loss",
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
          }
        }
      }
    });
  }
}

function updateFinancialsSummary(summary) {
  const totalValue = document.getElementById("financialsTotalValue");
  const scrapLoss = document.getElementById("financialsScrapLoss");
  const yieldPercent = document.getElementById("financialsYield");
  const totalQty = document.getElementById("financialsTotalQty");

  if (totalValue) {
    totalValue.textContent = formatNumber(summary.totalValue || 0);
  }
  if (scrapLoss) {
    scrapLoss.textContent = formatNumber(summary.scrapLoss || 0);
  }
  if (yieldPercent) {
    yieldPercent.textContent = `${formatNumber(summary.yieldPercent || 0)}%`;
  }
  if (totalQty) {
    totalQty.textContent = formatNumber(summary.totalQty || 0);
  }
}

function updateFinancialsCharts(series, scrapByProcess) {
  if (financialsState.charts.valueTrend) {
    const labels = series.dates || [];
    financialsState.charts.valueTrend.data.labels = labels;
    financialsState.charts.valueTrend.data.datasets[0].data = series.totalValue || [];
    financialsState.charts.valueTrend.data.datasets[1].data = series.scrapLoss || [];
    financialsState.charts.valueTrend.update();
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
}

function renderFinancialsTable(rows) {
  const body = document.getElementById("financialsDetailBody");
  if (!body) {
    return;
  }

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td class="px-4 py-3 text-gray-500" colspan="9">No data loaded.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows.map(row => `
    <tr>
      <td class="px-4 py-3">${row.date || "-"}</td>
      <td class="px-4 py-3">${row.hinban || "-"}</td>
      <td class="px-4 py-3">${row.ban || "-"}</td>
      <td class="px-4 py-3">${row.model || "-"}</td>
      <td class="px-4 py-3">${formatNumber(row.goodQty || 0)}</td>
      <td class="px-4 py-3">${formatNumber(row.totalNg || 0)}</td>
      <td class="px-4 py-3">${formatNumber(row.yieldPercent || 0)}%</td>
      <td class="px-4 py-3">${formatNumber(row.value || 0)}</td>
      <td class="px-4 py-3">${formatNumber(row.scrapLoss || 0)}</td>
    </tr>
  `).join("");
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
