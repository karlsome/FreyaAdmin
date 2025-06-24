// Thresholds for defect rate classification
const DEFECT_RATE_THRESHOLDS = {
    high: 2.0,
    warning: 1.5
};

/**
 * Renders the dashboard cards for each factory, showing total, NG, and defect rate.
 */
async function renderFactoryCards() {
    const container = document.getElementById("factoryCards");
    container.innerHTML = "Loading factories...";
  
    const factoryNames = ["第一工場", "第二工場", "肥田瀬", "天徳", "倉知", "小瀬", "SCNA", "NFH"];
    const today = new Date().toISOString().split("T")[0];
  
    try {
      const cards = await Promise.all(factoryNames.map(async factory => {
        const res = await fetch(BASE_URL + "queries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dbName: "submittedDB",
            collectionName: "kensaDB",
            query: { 工場: factory, Date: today }
          })
        });
  
        const data = await res.json();
  
        const total = data.reduce((sum, item) => sum + (item.Process_Quantity ?? 0), 0);
        const totalNG = data.reduce((sum, item) => sum + (item.Total_NG ?? 0), 0);
        const defectRate = total > 0 ? ((totalNG / total) * 100).toFixed(2) : "0.00";
  
        // Determine status
        let statusColor = "green";
        let statusText = "Normal";
        if (defectRate >= DEFECT_RATE_THRESHOLDS.high) {
          statusColor = "red";
          statusText = "High Defect Rate";
        } else if (defectRate >= DEFECT_RATE_THRESHOLDS.warning) {
          statusColor = "yellow";
          statusText = "Warning";
        }
  
        const statusStyle = {
          green: "bg-green-100 text-green-800",
          yellow: "bg-yellow-100 text-yellow-800",
          red: "bg-red-100 text-red-800"
        }[statusColor];
  
        const isClickable = ["admin", "班長"].includes(role);
        return `
          <div 
            class="${isClickable ? "cursor-pointer hover:shadow-md" : "opacity-100 cursor-not-allowed"} bg-white p-6 rounded-lg shadow border transition"
            ${isClickable ? `onclick="loadFactoryPage('${factory}')"` : ""}
          >
            <h4 class="text-lg font-bold mb-2">${factory}</h4>
            <p class="text-sm">Total: <strong>${total}</strong></p>
            <p class="text-sm">Total NG: <strong>${totalNG}</strong></p>
            <p class="text-sm">Defect Rate: 
              <strong class="${statusColor === 'red' ? 'text-red-600' : statusColor === 'yellow' ? 'text-yellow-600' : 'text-green-600'}">
                ${defectRate}%
              </strong>
            </p>
            <span class="inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${statusStyle}">
              ${statusText}
            </span>
          </div>
        `;
      }));
  
      container.innerHTML = cards.join("");
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      container.innerHTML = `<p class="text-red-500">Failed to load data.</p>`;
    }
}


/**
 * Renders the list of factories (used in the factories page).
 */
function renderFactoryList() {
    const container = document.getElementById("factoryList");
    const factoryNames = ["第一工場", "第二工場", "肥田瀬", "天徳", "倉知", "小瀬", "SCNA", "NFH"];

    container.innerHTML = factoryNames.map(factory => `
        <div class="cursor-pointer bg-white p-6 rounded-lg shadow hover:shadow-lg transition" onclick="loadFactoryPage('${factory}')">
            <h4 class="text-lg font-semibold">${factory}</h4>
            <p class="text-sm text-gray-500">Click to view factory details</p>
        </div>
    `).join('');
}


/**
 * Loads and displays the dashboard for a specific factory, including stats and charts.
 * @param {string} factoryName - The name of the factory to load.
 */
async function loadFactoryPage(factoryName) {
    const mainContent = document.getElementById("mainContent");
    mainContent.innerHTML = `<p>Loading data for ${factoryName}...</p>`;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const isoStart = startDate.toISOString().split("T")[0];
    const isoEnd = new Date().toISOString().split("T")[0];

    const collections = ["pressDB", "SRSDB", "kensaDB", "slitDB"];
    const statsRequests = collections.map(col => ({
        dbName: "submittedDB",
        collectionName: col,
        aggregation: [
            { $match: { 工場: factoryName, Date: { $gte: isoStart, $lte: isoEnd } } },
            {
                $group: {
                    _id: "$設備",
                    totalNG: { $sum: "$Total_NG" },
                    totalProcess: { $sum: "$Process_Quantity" },
                    avgCycle: { $avg: "$Cycle_Time" },
                    count: { $sum: 1 }
                }
            }
        ]
    }));

    const topDefectRequest = {
        dbName: "submittedDB",
        collectionName: "kensaDB",
        aggregation: [
            { $match: { 工場: factoryName, Date: { $gte: isoStart, $lte: isoEnd } } },
            {
                $group: {
                    _id: "$品番",
                    totalNG: { $sum: "$Total_NG" },
                    product: { $first: "$品番" }
                }
            },
            { $sort: { totalNG: -1 } },
            { $limit: 15 }
        ]
    };

    try {
        const [pressData, srsData, kensaData, slitData, topDefects] = await Promise.all([
            ...statsRequests.map(req =>
                fetch(BASE_URL + "queries", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(req)
                }).then(res => res.json())
            ),
            fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(topDefectRequest)
            }).then(res => res.json())
        ]);

        renderFactoryDashboard({
            factoryName,
            pressData,
            srsData,
            kensaData,
            slitData,
            topDefects
        });

    } catch (error) {
        console.error("Error loading factory dashboard:", error);
        mainContent.innerHTML = `<p class="text-red-500">Failed to load data for ${factoryName}</p>`;
    }
}


/**
 * Renders the main dashboard for a factory, including filters, summary cards, and charts.
 * @param {Object} param0 - Data for the dashboard (factoryName, pressData, etc.)
 */
function renderFactoryDashboard({ factoryName, pressData, srsData, kensaData, slitData, topDefects }) {
    const mainContent = document.getElementById("mainContent");

    mainContent.innerHTML = `
        <!-- Page Header -->
        <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-semibold">${factoryName} - ${translations[currentLang].factoryOverview}</h2>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-end gap-4 mb-6">
        <!-- From Date -->
        <div>
            <label class="block text-sm font-medium mb-1" data-i18n="from">From</label>
            <input type="date" id="filterFromDate" class="p-2 border rounded" />
        </div>

        <!-- To Date -->
        <div>
            <label class="block text-sm font-medium mb-1" data-i18n="to">To</label>
            <input type="date" id="filterToDate" class="p-2 border rounded" />
        </div>

        <!-- 品番 -->
        <div>
            <label class="block text-sm font-medium mb-1" data-i18n="partNumber">Part Number</label>
            <input type="text" id="filterPartNumber" class="p-2 border rounded w-48" placeholder="例: GN200-A0400" />
        </div>

        <!-- 背番号 -->
        <div>
            <label class="block text-sm font-medium mb-1" data-i18n="serialNumber">Serial Number</label>
            <input type="text" id="filterSerialNumber" class="p-2 border rounded w-48" placeholder="例: DR042" />
        </div>

        <!-- Apply Filters -->
        <div class="mt-6">
            <button id="applyFilterBtn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" data-i18n="applyFilter">
            Apply Filters
            </button>
        </div>
        </div>

        <!-- Production Results -->
        <div id="dailyProduction" class="mb-10"></div>

        <!-- Detail Sidebar -->
        <div id="detailSidebar" class="fixed top-0 right-0 w-full md:w-[600px] h-full bg-white shadow-lg transform translate-x-full transition-transform duration-300 z-50 p-4 overflow-y-auto max-h-screen">
          <button onclick="closeSidebar()" class="mb-4 text-red-500 font-semibold w-full text-left md:w-auto">Close</button>
          <div id="sidebarContent"></div>
        </div>

        <!-- Backdrop for mobile -->
        <div id="sidebarBackdrop"
            class="fixed inset-0 bg-black bg-opacity-30 z-40 hidden"
            onclick="closeSidebar()"></div>

        <!-- Detail Sidebar -->
        <div id="detailSidebar"
            class="fixed top-0 right-0 w-full max-w-lg h-full bg-white shadow-lg transform translate-x-full transition-transform duration-300 z-50 p-4 overflow-y-auto md:w-[600px]">
          <button onclick="closeSidebar()" class="mb-4 text-red-500 font-semibold">Close</button>
          <div id="sidebarContent"></div>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${[["Press", pressData], ["SRS", srsData], ["Slit", slitData], ["Kensa", kensaData]].map(([label, data]) => {
            const totalProc = data.reduce((sum, d) => sum + (d.totalProcess ?? 0), 0);
            const totalNG = data.reduce((sum, d) => sum + (d.totalNG ?? 0), 0);
            const defectRate = totalProc ? ((totalNG / totalProc) * 100).toFixed(2) : 0;
            return `
            <div class="bg-white p-4 rounded shadow">
                <h3 class="font-semibold">${label} Process</h3>
                <p>${translations[currentLang].total}: ${totalProc}</p>
                <p>${translations[currentLang].totalNG}: ${totalNG}</p>
                <p>${translations[currentLang].defectRate}: ${defectRate}%</p>
            </div>
            `;
        }).join("")}
        </div>

        <!-- Top Defects -->
        <div class="bg-white p-4 rounded shadow mb-6">
        <h3 class="font-semibold mb-2">${translations[currentLang].topDefectiveProducts || "Top 15 Defective Products"}</h3>
        <ul class="list-disc list-inside">
            ${topDefects.map(p => `<li>${p.product} – ${p.totalNG} ${translations[currentLang].totalNG}</li>`).join("") || "<li>No data</li>"}
        </ul>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded shadow">
            <h3 class="font-semibold mb-2">${translations[currentLang].defectRate} per Process</h3>
            <div id="defectRateChart" style="height: 300px;"></div>
        </div>
        <div class="bg-white p-4 rounded shadow">
            <h3 class="font-semibold mb-2">Cycle Time per Process</h3>
            <div id="cycleTimeChart" style="height: 300px;"></div>
        </div>
        </div>
    `;

    // Attach event listener for Apply Filters
    document.getElementById("applyFilterBtn").addEventListener("click", () => {
        const from = document.getElementById("filterFromDate").value;
        const to = document.getElementById("filterToDate").value;
        const part = document.getElementById("filterPartNumber").value.trim();
        const serial = document.getElementById("filterSerialNumber").value.trim();
        loadProductionByPeriod(factoryName, from, to, part, serial);
    });

    // Load default data for today
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("filterFromDate").value = today;
    document.getElementById("filterToDate").value = today;
    loadProductionByPeriod(factoryName, today, today);

    // Run translations
    applyLanguage();

    // Render charts
    renderFactoryCharts({ pressData, srsData, slitData, kensaData });
}


/**
 * Loads and displays daily production data for a factory.
 * @param {string} factory - Factory name
 * @param {string} date - Date string (YYYY-MM-DD)
 */
async function loadDailyProduction(factory, date) {
    const dailyContainer = document.getElementById("dailyProduction");
    dailyContainer.innerHTML = "Loading daily data...";

    const processes = [
        { name: "Kensa", collection: "kensaDB" },
        { name: "Press", collection: "pressDB" },
        { name: "SRS", collection: "SRSDB" },
        { name: "Slit", collection: "slitDB" }
    ];

    try {
        const results = await Promise.all(processes.map(proc =>
            fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dbName: "submittedDB",
                    collectionName: proc.collection,
                    query: { 工場: factory, Date: date }
                })
            }).then(res => res.json())
        ));

        dailyContainer.innerHTML = processes.map((proc, i) => {
          const data = results[i];
        
          const bgMap = {
            kensa: "bg-yellow-50",
            srs: "bg-gray-100",
            press: "bg-green-50",
            slit: "bg-blue-50"
          };
          const name = proc.name.toLowerCase();
          const bgClass = bgMap[name] || "bg-white";
        
          return `
          
            <div class="${bgClass} p-4 rounded shadow">
              <h3 class="font-semibold mb-2">${proc.name} Process (${data.length})</h3>
              <ul class="divide-y divide-gray-200">
                ${data.map(item => `
                  <li class="py-2 cursor-pointer hover:bg-gray-100 rounded px-2"
                      onclick='showSidebarFromElement(this)'
                      data-item='${encodeURIComponent(JSON.stringify(item))}'>
                    ${item.品番} - ${item.背番号}
                  </li>
                `).join("")}
              </ul>
            </div>
          `;
        }).join("");

    } catch (err) {
        console.error("Error loading daily production:", err);
        dailyContainer.innerHTML = `<p class="text-red-500">Failed to load daily data</p>`;
    }
}

/**
 * Helper to show the sidebar with details for a clicked element (row).
 * @param {HTMLElement} el - The element containing encoded item data
 */
function showSidebarFromElement(el) {
    const item = JSON.parse(decodeURIComponent(el.dataset.item));
    showSidebar(item);
}


/**
 * Shows the right-side detail sidebar with all information for a production record.
 * @param {Object} item - The production record data
 */
function showSidebar(item) {
  const sidebar = document.getElementById("detailSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const content = document.getElementById("sidebarContent");
  const originalItem = JSON.parse(JSON.stringify(item));
  const factoryName = item["工場"]; // Required for reload

  let processType = "";
  const labelToKeyMap = {
    "品番": "品番", "背番号": "背番号", "工場": "工場", "日付": "Date",
    "作業者": "Worker_Name", "設備": "設備", "数量": "Process_Quantity",
    "残数量": "Remaining_Quantity", "不良数": "Total_NG", "Total": "Total",
    "開始": "Time_start", "終了": "Time_end", "製造ロット": "製造ロット",
    "コメント": "Comment", "サイクルタイム": "Cycle_Time", "ショット数": "ショット数",
    "材料ロット": "材料ロット", "疵引不良": "疵引不良", "加工不良": "加工不良",
    "その他": "その他", "SRSコード": "SRSコード", "くっつき・めくれ": "くっつき・めくれ",
    "シワ": "シワ", "転写位置ズレ": "転写位置ズレ", "転写不良": "転写不良",
    ...Array.from({ length: 12 }, (_, i) => [`counter-${i + 1}`, `Counters.counter-${i + 1}`])
      .reduce((acc, [k, v]) => (acc[k] = v, acc), {})
  };

    const entries = [];
    const isKensa = item?.Counters !== undefined;
    const isSRS = item?.["SRSコード"] !== undefined;
    const isPress = (
    !isKensa &&
    !isSRS &&
    ("ショット数" in item) // ✅ only treat as Press if ショット数 is present
    );
    const isSlit = !isKensa && !isSRS && !isPress;

    console.log("Process Type Detected:", { isKensa, isPress, isSRS, isSlit });

  if (isKensa) {
    processType = "kensaDB";
    const fields = ["品番", "背番号", "工場", "日付", "作業者", "設備", "数量", "残数量", "不良数", "Total", "開始", "終了", "製造ロット", "コメント", "サイクルタイム"];
    fields.forEach(label => entries.push([label, item[labelToKeyMap[label]] ?? ""]));
    for (let i = 1; i <= 12; i++) entries.push([`counter-${i}`, item?.Counters?.[`counter-${i}`] ?? 0]);
  } else if (isPress) {
    processType = "pressDB";
    const fields = ["品番", "背番号", "工場", "日付", "作業者", "設備", "数量", "不良数", "Total", "開始", "終了", "材料ロット", "疵引不良", "加工不良", "その他", "サイクルタイム", "ショット数", "コメント"];
    fields.forEach(label => entries.push([label, item[labelToKeyMap[label]] ?? ""]));
  } else if (isSRS) {
    processType = "SRSDB";
    const fields = ["品番", "背番号", "工場", "日付", "作業者", "設備", "数量", "不良数", "Total", "開始", "終了", "製造ロット", "サイクルタイム", "SRSコード", "くっつき・めくれ", "シワ", "転写位置ズレ", "転写不良", "その他", "コメント"];
    fields.forEach(label => entries.push([label, item[labelToKeyMap[label]] ?? ""]));
  } else if (isSlit) {
    processType = "slitDB";
    const fields = ["品番", "背番号", "工場", "日付", "作業者", "設備", "数量", "不良数", "Total", "開始", "終了", "製造ロット", "サイクルタイム", "疵引不良", "加工不良", "その他", "コメント"];
    fields.forEach(label => entries.push([label, item[labelToKeyMap[label]] ?? ""]));
  }

  content.innerHTML = `
    <h3 class="text-xl font-bold mb-4">${item["品番"] ?? "データ"}</h3>
    <div class="space-y-2" id="sidebarFields">
      ${entries.map(([label, value]) => `
        <div class="flex items-center gap-2">
          <label class="font-medium w-32 shrink-0">${label}</label>
          <input type="text" class="editable-input p-1 border rounded w-full bg-gray-100" data-label="${label}" value="${value ?? ""}" disabled />
        </div>
      `).join("")}
    </div>
    <div class="mt-4 flex gap-2">
      <button id="editSidebarBtn" class="text-blue-600 underline text-sm">Edit</button>
      <button id="saveSidebarBtn" class="hidden bg-green-500 text-white px-3 py-1 rounded text-sm">OK</button>
      <button id="cancelSidebarBtn" class="hidden bg-gray-300 text-black px-3 py-1 rounded text-sm">Cancel</button>
    </div>
        <div class="mt-6 space-y-4">
        <div id="masterImageContainer">
          <!-- Master DB image will be loaded here -->
        </div>
        ${["初物チェック画像", "終物チェック画像", "材料ラベル画像"].map(label => {
          const url = item[label];
          if (!url) return "";
          return `
            <div>
              <p class="font-semibold text-sm mb-1">${label}</p>
              <a href="#" onclick="openImageTab('${url}', '${label}'); return false;">
                <img src="${url}" alt="${label}" class="rounded shadow w-full max-h-60 object-contain sm:max-w-md mx-auto hover:opacity-90 cursor-zoom-in" />
              </a>
            </div>
          `;
        }).join("")}
      </div>
  `;

  // Load master DB image
  loadMasterImage(item["品番"], item["背番号"]);

  sidebar.classList.remove("translate-x-full");
  backdrop.classList.remove("hidden");
  //picLINK(item["背番号"], item["品番"]);

  const inputs = () => Array.from(document.querySelectorAll(".editable-input"));

  function recalculateLive() {
    const get = label => {
      const el = inputs().find(i => i.dataset.label === label);
      return el ? el.value.trim() : null;
    };
    const set = (label, value) => {
      const el = inputs().find(i => i.dataset.label === label);
      if (el) el.value = value;
    };
  
    const start = new Date(`1970-01-01T${get("開始") || "00:00"}:00Z`);
    const end = new Date(`1970-01-01T${get("終了") || "00:00"}:00Z`);
    const quantity = Number(get("数量")) || 1;
  
    const durationInSeconds = Math.max(0, (end - start) / 1000);
    const cycleTime = durationInSeconds / quantity;
    set("サイクルタイム", cycleTime.toFixed(2));
  
    let totalNG = 0;
    if (isKensa) for (let i = 1; i <= 12; i++) totalNG += Number(get(`counter-${i}`)) || 0;
    else if (isPress || isSlit) ["疵引不良", "加工不良", "その他"].forEach(f => totalNG += Number(get(f)) || 0);
    else if (isSRS) ["くっつき・めくれ", "シワ", "転写位置ズレ", "転写不良", "その他"].forEach(f => totalNG += Number(get(f)) || 0);
  
    set("不良数", totalNG);
    set("Total", quantity - totalNG);
  }

  document.getElementById("editSidebarBtn").onclick = () => {
    inputs().forEach(i => {
      i.disabled = false;
      i.addEventListener("input", () => {
        recalculateLive();
        validateInputs();
      });
    });
    document.getElementById("saveSidebarBtn").classList.remove("hidden");
    document.getElementById("cancelSidebarBtn").classList.remove("hidden");
  };

  document.getElementById("cancelSidebarBtn").onclick = () => showSidebar(originalItem);

  document.getElementById("saveSidebarBtn").onclick = async () => {
    const updatedFields = {}, counters = {};
    let processQty = 0;

    inputs().forEach(input => {
      const label = input.dataset.label;
      const key = labelToKeyMap[label];
      const val = input.value.trim();

      if (key.startsWith("Counters.")) {
        const counterKey = key.split(".")[1];
        counters[counterKey] = Number(val) || 0;
        updatedFields["Counters"] = counters;
      } else {
        updatedFields[key] = isNaN(val) ? val : Number(val);
        if (key === "Process_Quantity") processQty = Number(val);
      }
    });

    // Calculate cycle time again for final save
    if (updatedFields["Time_start"] && updatedFields["Time_end"] && processQty > 0) {
      const start = new Date(`1970-01-01T${updatedFields["Time_start"]}:00Z`);
      const end = new Date(`1970-01-01T${updatedFields["Time_end"]}:00Z`);
      const diffSeconds = (end - start) / 1000;
      updatedFields["Cycle_Time"] = Math.max(diffSeconds / processQty, 0);
    }

    // Calculate Total_NG and Total
    let totalNG = 0;
    if (isKensa) Object.values(counters).forEach(v => totalNG += v || 0);
    else if (isPress || isSlit) ["疵引不良", "加工不良", "その他"].forEach(f => totalNG += Number(updatedFields[f]) || 0);
    else if (isSRS) ["くっつき・めくれ", "シワ", "転写位置ズレ", "転写不良", "その他"].forEach(f => totalNG += Number(updatedFields[f]) || 0);

    updatedFields["Total_NG"] = totalNG;
    updatedFields["Total"] = processQty - totalNG;

    const updatePayload = {
      dbName: "submittedDB",
      collectionName: processType,
      query: {
        品番: originalItem["品番"],
        背番号: originalItem["背番号"],
        Date: originalItem["Date"]
      },
      update: { $set: updatedFields }
    };

    try {
      const res = await fetch(BASE_URL + "queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload)
      });
      await res.json();
      alert("Updated successfully.");

      // Reload factory page
      closeSidebar();
      loadFactoryPage(factoryName);
    } catch (err) {
      alert("Update failed.");
      console.error(err);
    }
  };
}


/**
 * Opens an image in a new tab for viewing larger.
 * @param {string} url - The image URL
 * @param {string} label - The label for the image
 */
function openImageTab(url, label) {
  const encodedFileName = url.split("/").pop().split("?")[0];
  const decodedFileName = decodeURIComponent(encodedFileName);  // ✅ Fix here

  const win = window.open("", "_blank");

  if (win) {
    win.document.write(`
      <html>
        <head>
          <title>${label}</title>
          <style>
            body { margin: 0; background: #000; color: white; text-align: center; }
            .filename { margin: 1rem; font-size: 1.2rem; font-weight: bold; }
            img { max-width: 100%; height: auto; cursor: zoom-in; }
          </style>
        </head>
        <body>
          <div class="filename">${decodedFileName}</div>  <!-- ✅ This will now show Japanese correctly -->
          <img src="${url}" alt="${label}" />
        </body>
      </html>
    `);
    win.document.close();
  }
}

/**
 * Validates the sidebar input fields and displays errors if any.
 */
function validateInputs() {
  const intFields = ["数量", "残数量", "不良数", "Total", "疵引不良", "加工不良", "その他", "ショット数", ...Array.from({ length: 12 }, (_, i) => `counter-${i + 1}`)];
  const timeFields = ["開始", "終了"];
  const errorDiv = document.getElementById("inputError") || (() => {
    const div = document.createElement("div");
    div.id = "inputError";
    div.className = "text-red-500 text-sm mt-2";
    document.getElementById("sidebarFields").appendChild(div);
    return div;
  })();

  const inputs = document.querySelectorAll(".editable-input");
  let isValid = true;
  let messages = [];

  inputs.forEach(input => {
    const label = input.dataset.label;
    const value = input.value.trim();

    if (intFields.includes(label)) {
      if (!/^\d+$/.test(value)) {
        isValid = false;
        messages.push(`${label} must be an integer`);
        input.classList.add("border-red-500");
      } else {
        input.classList.remove("border-red-500");
      }
    }

    if (timeFields.includes(label)) {
      if (!/^\d{2}:\d{2}$/.test(value) || Number(value.split(":")[0]) > 23 || Number(value.split(":")[1]) > 59) {
        isValid = false;
        messages.push(`${label} must be in 24-hour HH:mm format`);
        input.classList.add("border-red-500");
      } else {
        input.classList.remove("border-red-500");
      }
    }
  });

  if (!isValid) {
    errorDiv.innerHTML = messages.join("<br>");
  } else {
    errorDiv.innerHTML = "";
  }

  document.getElementById("saveSidebarBtn").disabled = !isValid;
}


/**
 * Closes the right-side detail sidebar and hides the backdrop.
 */
function closeSidebar() {
    document.getElementById("detailSidebar").classList.add("translate-x-full");
    document.getElementById("sidebarBackdrop").classList.add("hidden");
}

// Ensure sidebar closes when clicking outside (desktop and mobile)
document.addEventListener("mousedown", function(event) {
  const sidebar = document.getElementById("detailSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (!sidebar || sidebar.classList.contains("translate-x-full")) return; // Sidebar not open
  if (!sidebar.contains(event.target)) {
    closeSidebar();
  }
});


/**
 * Loads production data for a factory by period (daily, weekly, monthly) and renders tables/sections.
 * @param {string} factory - Factory name
 * @param {string} from - Start date
 * @param {string} to - End date
 * @param {string} part - Part number filter
 * @param {string} serial - Serial number filter
 */
async function loadProductionByPeriod(factory, from, to, part = "", serial = "") {
    const container = document.getElementById("dailyProduction");
    container.innerHTML = "Loading production data...";
  
    const processes = [
      { name: "Kensa", collection: "kensaDB" },
      { name: "Press", collection: "pressDB" },
      { name: "SRS", collection: "SRSDB" },
      { name: "Slit", collection: "slitDB" }
    ];
  
    const isSingleDay = from === to;
  
    const getQuery = (start, end) => {
      const query = {
        工場: factory,
        Date: {
          $gte: new Date(start).toISOString().split("T")[0],
          $lte: new Date(end).toISOString().split("T")[0]
        }
      };
      if (part) query["品番"] = part;
      if (serial) query["背番号"] = serial;
      return query;
    };
  
    try {
      if (isSingleDay) {
        const dateObj = new Date(from);
        const weekStart = new Date(dateObj); weekStart.setDate(dateObj.getDate() - 6);
        const monthStart = new Date(dateObj); monthStart.setDate(dateObj.getDate() - 29);
  
        const [dailyResults, weeklyResults, monthlyResults] = await Promise.all(
          [from, weekStart, monthStart].map((start) =>
            Promise.all(processes.map(proc =>
              fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  dbName: "submittedDB",
                  collectionName: proc.collection,
                  query: getQuery(start, dateObj)
                })
              }).then(res => res.json())
            ))
          )
        );
  
        const dataBySection = {
          Daily: dailyResults,
          Weekly: weeklyResults,
          Monthly: monthlyResults
        };
  
        const sortStates = {
          Daily: {},
          Weekly: {},
          Monthly: {}
        };
  
        window.handleSectionSort = (section, processName, column) => {
          const state = sortStates[section];
          if (state.process === processName && state.column === column) {
            state.direction *= -1;
          } else {
            state.process = processName;
            state.column = column;
            state.direction = 1;
          }
          renderSections(); // re-render
        };
  
        function renderSections() {
          container.innerHTML = Object.entries(dataBySection).map(([label, results], index) => `
            <div class="mb-8">
              ${index > 0 ? '<hr class="my-6 border-t-2 border-gray-300">' : ''}
              <h3 class="text-2xl font-semibold mb-4">${label} Production</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                ${processes.map((proc, i) => {
                  const original = results[i];
                  if (!original?.length) return `
                    <div class="bg-white p-4 rounded-xl shadow">${proc.name} Process (0)</div>
                  `;

                  const state = sortStates[label];
                  let sorted = [...original];

                  if (state.process === proc.name && state.column) {
                    sorted.sort((a, b) => {
                      const valA = a[state.column] ?? "";
                      const valB = b[state.column] ?? "";
                      return valA.toString().localeCompare(valB.toString(), "ja") * state.direction;
                    });
                  }

                  const arrow = col =>
                    state.process === proc.name && state.column === col
                      ? state.direction > 0 ? " ↑" : " ↓"
                      : "";

                  const summary = groupAndSummarize(sorted);

                  const bgClassMap = {
                    Kensa: "bg-yellow-50",
                    Press: "bg-green-50",
                    SRS: "bg-gray-100",
                    Slit: "bg-blue-50"
                  };
                  const bgClass = bgClassMap[proc.name] || "bg-white";

                  return `
                    <div class="bg-white p-4 rounded-xl shadow">
                      <h4 class="font-semibold mb-2">${proc.name} Process (${sorted.length})</h4>
                      <div class="overflow-x-auto">
                        <table class="w-full text-sm min-w-[600px] mb-2">
                          <thead>
                            <tr class="border-b font-semibold text-left">
                              <th class="cursor-pointer" onclick="handleSectionSort('${label}', '${proc.name}', '品番')">品番${arrow("品番")}</th>
                              <th class="cursor-pointer" onclick="handleSectionSort('${label}', '${proc.name}', '背番号')">背番号${arrow("背番号")}</th>
                              <th class="cursor-pointer" onclick="handleSectionSort('${label}', '${proc.name}', 'Worker_Name')">作業者${arrow("Worker_Name")}</th>
                              <th class="cursor-pointer" onclick="handleSectionSort('${label}', '${proc.name}', 'Date')">日付${arrow("Date")}</th>
                              <th class="cursor-pointer" onclick="handleSectionSort('${label}', '${proc.name}', 'Total')">Total${arrow("Total")}</th>
                              <th class="cursor-pointer" onclick="handleSectionSort('${label}', '${proc.name}', 'Total_NG')">Total NG${arrow("Total_NG")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${sorted.map(item => `
                              <tr class="cursor-pointer hover:bg-gray-100"
                                  onclick='showSidebarFromElement(this)'
                                  data-item='${encodeURIComponent(JSON.stringify(item))}'>
                                <td>${item.品番 ?? "-"}</td>
                                <td>${item.背番号 ?? "-"}</td>
                                <td>${item.Worker_Name ?? "-"}</td>
                                <td>${item.Date ?? "-"}</td>
                                <td>${item.Total ?? item.Process_Quantity ?? 0}</td>
                                <td>${item.Total_NG ?? 0}</td>
                              </tr>
                            `).join("")}
                          </tbody>
                        </table>
                      </div>

                      <div class="mt-4 overflow-x-auto">
                        <h5 class="font-semibold mb-2">${label} Summary</h5>
                        <table class="w-full text-sm border-t min-w-[500px]">
                          <thead>
                            <tr class="border-b font-semibold text-left">
                              <th>品番</th><th>背番号</th><th>Total</th><th>Total NG</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${summary.map(row => `
                              <tr>
                                <td>${row.品番}</td>
                                <td>${row.背番号}</td>
                                <td>${row.Total}</td>
                                <td>${row.Total_NG}</td>
                              </tr>
                            `).join("")}
                          </tbody>
                        </table>
                        <div class="flex gap-4 mt-2">
                          <button onclick='exportToCSV(${JSON.stringify(summary)})' class="text-blue-600 underline text-sm">Export CSV</button>
                          <button onclick='exportToPDFGrouped([{ name: "${proc.name}", summary: ${JSON.stringify(summary)} }], "${label} ${proc.name} Summary")' class="text-blue-600 underline text-sm">Export PDF</button>
                        </div>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `).join("");
        }
  
        renderSections();
      }
   else {
        const processOrder = ["Kensa", "Press", "SRS", "Slit"];
        const summaryByProcess = [];
  
        const resultsByProcess = await Promise.all(processes.map(proc =>
          fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dbName: "submittedDB",
              collectionName: proc.collection,
              query: getQuery(from, to)
            })
          }).then(res => res.json())
        ));
  
        let sortState = { process: null, column: null, direction: 1 };
  
        window.handleSort = (processName, column) => {
          if (sortState.process === processName && sortState.column === column) {
            sortState.direction *= -1;
          } else {
            sortState = { process: processName, column, direction: 1 };
          }
          renderFilteredTables();
        };
  
        function renderFilteredTables() {
          container.innerHTML = processOrder.map((procLabel, index) => {
            const records = resultsByProcess[index];
            if (!records.length) return "";

            const sorted = [...records].sort((a, b) => {
              if (sortState.process === procLabel && sortState.column) {
                const valA = a[sortState.column] ?? "";
                const valB = b[sortState.column] ?? "";
                return (valA.toString().localeCompare(valB.toString(), "ja")) * sortState.direction;
              }
              return 0;
            });

            const summary = groupAndSummarize(sorted);
            summaryByProcess.push({ name: procLabel, summary });

            const arrow = col =>
              sortState.process === procLabel && sortState.column === col
                ? sortState.direction > 0 ? " ↑" : " ↓"
                : "";

            return `
              <div class="bg-white p-4 rounded-xl shadow mb-6">
                <h3 class="text-xl font-semibold mb-2">${procLabel} Process (${sorted.length})</h3>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm min-w-[600px] mb-2">
                    <thead>
                      <tr class="border-b font-semibold text-left">
                        <th class="cursor-pointer" onclick="handleSort('${procLabel}', '品番')">品番${arrow("品番")}</th>
                        <th class="cursor-pointer" onclick="handleSort('${procLabel}', '背番号')">背番号${arrow("背番号")}</th>
                        <th class="cursor-pointer" onclick="handleSort('${procLabel}', 'Worker_Name')">作業者${arrow("Worker_Name")}</th>
                        <th class="cursor-pointer" onclick="handleSort('${procLabel}', 'Date')">日付${arrow("Date")}</th>
                        <th class="cursor-pointer" onclick="handleSort('${procLabel}', 'Total')">Total${arrow("Total")}</th>
                        <th class="cursor-pointer" onclick="handleSort('${procLabel}', 'Total_NG')">Total NG${arrow("Total_NG")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${sorted.map(item => `
                        <tr class="cursor-pointer hover:bg-gray-100"
                            onclick='showSidebarFromElement(this)'
                            data-item='${encodeURIComponent(JSON.stringify(item))}'>
                          <td>${item.品番 ?? "-"}</td>
                          <td>${item.背番号 ?? "-"}</td>
                          <td>${item.Worker_Name ?? "-"}</td>
                          <td>${item.Date ?? "-"}</td>
                          <td>${item.Total ?? item.Process_Quantity ?? 0}</td>
                          <td>${item.Total_NG ?? 0}</td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>

                <div class="mt-4 overflow-x-auto">
                  <h5 class="font-semibold mb-2">${procLabel} Summary</h5>
                  <table class="w-full text-sm border-t min-w-[500px] mb-2">
                    <thead>
                      <tr class="border-b font-semibold text-left">
                        <th>品番</th><th>背番号</th><th>Total</th><th>Total NG</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${summary.map(row => `
                        <tr>
                          <td>${row.品番}</td>
                          <td>${row.背番号}</td>
                          <td>${row.Total}</td>
                          <td>${row.Total_NG}</td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                  <div class="flex gap-4">
                    <button onclick='exportToCSV(${JSON.stringify(summary)})' class="text-blue-600 underline text-sm">Export CSV</button>
                    <button onclick='exportToPDFGrouped([{ name: "${procLabel}", summary: ${JSON.stringify(summary)} }], "${procLabel} Summary")' class="text-blue-600 underline text-sm">Export PDF</button>
                  </div>
                </div>
              </div>
            `;
          }).join("") + `
            <div class="bg-white p-4 rounded-xl shadow mt-8">
              <h3 class="text-lg font-semibold mb-4">Summary by Process</h3>
              ${summaryByProcess.map(proc => {
                if (!proc.summary.length) return "";
                return `
                  <div class="mb-6">
                    <h4 class="font-semibold mb-2 border-b pb-1">${proc.name} Summary</h4>
                    <div class="overflow-x-auto">
                      <table class="w-full text-sm min-w-[500px] mb-2">
                        <thead>
                          <tr class="border-b font-semibold text-left">
                            <th>品番</th><th>背番号</th><th>Total</th><th>Total NG</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${proc.summary.map(row => `
                            <tr>
                              <td>${row.品番}</td>
                              <td>${row.背番号}</td>
                              <td>${row.Total}</td>
                              <td>${row.Total_NG}</td>
                            </tr>
                          `).join("")}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `;
              }).join("")}
              <div class="flex gap-4">
                <button onclick='exportToCSVGrouped(${JSON.stringify(summaryByProcess)})' class="text-blue-600 underline text-sm">Export CSV</button>
                <button onclick='exportToPDFGrouped(${JSON.stringify(summaryByProcess)})' class="text-blue-600 underline text-sm">Export PDF</button>
              </div>
            </div>
          `;
        }
  
        renderFilteredTables();
      }
    } catch (err) {
      console.error("Error loading production data:", err);
      container.innerHTML = `<p class="text-red-500">Failed to load production data</p>`;
    }
}


/**
 * Builds a query object for filtering production data.
 */
function getFilterQuery(factory, from, to, part, serial) {
  const query = {
    工場: factory,
    Date: {
      $gte: from || "2000-01-01",
      $lte: to || new Date().toISOString().split("T")[0]
    }
  };

  if (part) query["品番"] = part;
  if (serial) query["背番号"] = serial;

  return query;
}

/**
 * Groups and summarizes records for summary tables.
 */
function groupAndSummarize(records) {
    const grouped = {};

    records.forEach(item => {
        const key = `${item.品番 || "不明"}|${item.背番号 || "不明"}`;
        if (!grouped[key]) {
            grouped[key] = {
                品番: item.品番 || "不明",
                背番号: item.背番号 || "不明",
                Total: 0,
                Total_NG: 0
            };
        }
        grouped[key].Total += item.Total ?? item.Process_Quantity ?? 0;
        grouped[key].Total_NG += item.Total_NG ?? 0;
    });

    return Object.values(grouped);
}

/**
 * Exports data to CSV file.
 */
function exportToCSV(data, filename = "export.csv") {
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => row[h] ?? "").join(","));
    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

/**
 * Exports data to PDF file.
 */
async function exportToPDF(data, filename = "export.pdf") {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text("Monthly Summary", 14, 15);

    const headers = ["品番", "背番号", "Total", "Total NG"];
    const rows = data.map(row => [row.品番, row.背番号, row.Total.toString(), row.Total_NG.toString()]);

    doc.autoTable({
        startY: 20,
        head: [headers],
        body: rows,
        styles: { fontSize: 10 }
    });

    doc.save(filename);
}


/**
 * Exports grouped process summaries to CSV.
 */
function exportToCSVGrouped(processSummaries, filename = "summary.csv") {
    const rows = [];
  
    processSummaries.forEach(proc => {
      if (proc.summary.length) {
        rows.push([`${proc.name} Summary`]);
        rows.push(["品番", "背番号", "Total", "Total NG"]);
        proc.summary.forEach(row => {
          rows.push([row.品番, row.背番号, row.Total, row.Total_NG]);
        });
        rows.push([]); // blank line between groups
      }
    });
  
    const csv = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  /**
   * Exports grouped process summaries to PDF.
   */
  function exportToPDFGrouped(processSummaries, filename = "summary.pdf") {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(14);
    let y = 15;
  
    processSummaries.forEach(proc => {
      if (proc.summary.length === 0) return;
  
      doc.text(`${proc.name} Summary`, 14, y);
      y += 6;
  
      const headers = ["品番", "背番号", "Total", "Total NG"];
      const rows = proc.summary.map(r => [r.品番, r.背番号, r.Total.toString(), r.Total_NG.toString()]);
  
      doc.autoTable({
        startY: y,
        head: [headers],
        body: rows,
        theme: 'striped',
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 }
      });
  
      y = doc.lastAutoTable.finalY + 10;
    });
  
    doc.save(filename);
  }




document.getElementById("applyFilterBtn").addEventListener("click", () => {
    const from = document.getElementById("filterFromDate").value;
    const to = document.getElementById("filterToDate").value;
    const part = document.getElementById("filterPartNumber").value.trim();
    const serial = document.getElementById("filterSerialNumber").value.trim();
  
    loadProductionByPeriod(currentFactory, from, to, part, serial);
});

/**
 * Loads and displays the master image from masterDB collection for comparison
 * @param {string} 品番 - Part number to search for
 * @param {string} 背番号 - Serial number to search for
 */
async function loadMasterImage(品番, 背番号) {
  const container = document.getElementById("masterImageContainer");
  
  if (!container) return;
  
  // Show loading state
  container.innerHTML = `
    <div>
      <p class="font-semibold text-sm mb-1">正しい形状</p>
      <div class="rounded shadow w-full max-h-60 bg-gray-100 flex items-center justify-center">
        <span class="text-gray-500">Loading...</span>
      </div>
    </div>
  `;

  try {
    // First try to find by 品番
    let query = { 品番: 品番 };
    if (!品番 && 背番号) {
      // If no 品番, try with 背番号
      query = { 背番号: 背番号 };
    }

    const response = await fetch(BASE_URL + "queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dbName: "Sasaki_Coating_MasterDB",
        collectionName: "masterDB",
        query: query,
        projection: { imageURL: 1, 品番: 1, 背番号: 1, 品名: 1 }
      })
    });

    const results = await response.json();

    if (results && results.length > 0 && results[0].imageURL) {
      const masterData = results[0];
      container.innerHTML = `
        <div>
          <p class="font-semibold text-sm mb-1">正しい形状</p>
          <p class="text-xs text-gray-600 mb-2">品番: ${masterData.品番 || 'N/A'} | 背番号: ${masterData.背番号 || 'N/A'}</p>
          <a href="#" onclick="openImageTab('${masterData.imageURL}', '正しい形状'); return false;">
            <img src="${masterData.imageURL}" alt="正しい形状" class="rounded shadow w-full max-h-60 object-contain sm:max-w-md mx-auto hover:opacity-90 cursor-zoom-in border-2 border-green-200" />
          </a>
        </div>
      `;
    } else {
      // Try alternative search if first attempt failed
      if (品番 && 背番号) {
        // If we searched by 品番 first, try 背番号
        const altResponse = await fetch(BASE_URL + "queries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dbName: "Sasaki_Coating_MasterDB",
            collectionName: "masterDB",
            query: { 背番号: 背番号 },
            projection: { imageURL: 1, 品番: 1, 背番号: 1, 品名: 1 }
          })
        });

        const altResults = await altResponse.json();
        
        if (altResults && altResults.length > 0 && altResults[0].imageURL) {
          const masterData = altResults[0];
          container.innerHTML = `
            <div>
              <p class="font-semibold text-sm mb-1">正しい形状</p>
              <p class="text-xs text-gray-600 mb-2">品番: ${masterData.品番 || 'N/A'} | 背番号: ${masterData.背番号 || 'N/A'}</p>
              <a href="#" onclick="openImageTab('${masterData.imageURL}', '正しい形状'); return false;">
                <img src="${masterData.imageURL}" alt="正しい形状" class="rounded shadow w-full max-h-60 object-contain sm:max-w-md mx-auto hover:opacity-90 cursor-zoom-in border-2 border-green-200" />
              </a>
            </div>
          `;
        } else {
          // No image found
          container.innerHTML = `
            <div>
              <p class="font-semibold text-sm mb-1">正しい形状</p>
              <div class="rounded shadow w-full max-h-60 bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                <span class="text-gray-500">画像が見つかりません</span>
              </div>
            </div>
          `;
        }
      } else {
        // No image found
        container.innerHTML = `
          <div>
            <p class="font-semibold text-sm mb-1">正しい形状</p>
            <div class="rounded shadow w-full max-h-60 bg-gray-100 flex items-center justify-center border-2 border-gray-300">
              <span class="text-gray-500">画像が見つかりません</span>
            </div>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error("Error loading master image:", error);
    container.innerHTML = `
      <div>
        <p class="font-semibold text-sm mb-1">正しい形状</p>
        <div class="rounded shadow w-full max-h-60 bg-red-100 flex items-center justify-center border-2 border-red-300">
          <span class="text-red-500">画像の読み込みに失敗しました</span>
        </div>
      </div>
    `;
  }
}
