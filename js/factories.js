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
  
        const isClickable = role !== "member"; // All roles except member can click
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

        console.log('Daily production data loaded:', results);

        dailyContainer.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            ${processes.map((proc, i) => {
              const data = results[i];
              
              // Debug: Check for problematic data
              data.forEach((item, index) => {
                try {
                  JSON.stringify(item);
                } catch (error) {
                  console.error(`Problematic item in ${proc.name} at index ${index}:`, item, error);
                }
              });

              const bgClassMap = {
                Kensa: "from-yellow-50 to-yellow-100 border-yellow-200",
                Press: "from-green-50 to-green-100 border-green-200",
                SRS: "from-gray-50 to-gray-100 border-gray-200",
                Slit: "from-blue-50 to-blue-100 border-blue-200"
              };
              const bgClass = bgClassMap[proc.name] || "from-white to-gray-50 border-gray-200";

              const iconMap = {
                Kensa: "ri-search-eye-line text-yellow-600",
                Press: "ri-hammer-line text-green-600",
                SRS: "ri-scan-line text-gray-600",
                Slit: "ri-scissors-cut-line text-blue-600"
              };
              const iconClass = iconMap[proc.name] || "ri-factory-line text-gray-600";

              return `
                <div class="bg-gradient-to-br ${bgClass} border-2 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <!-- Header -->
                  <div class="p-4 border-b border-white/50">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <i class="${iconClass} text-2xl"></i>
                        <div>
                          <h3 class="font-semibold text-gray-800">${proc.name}</h3>
                          <p class="text-sm text-gray-600">${data.length} records</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Content -->
                  <div class="p-4">
                    ${data.length === 0 ? `
                      <div class="text-center py-8">
                        <i class="ri-database-line text-3xl text-gray-400 mb-2 block"></i>
                        <p class="text-gray-500 text-sm">No data for today</p>
                      </div>
                    ` : `
                      <div class="space-y-2 max-h-64 overflow-y-auto">
                        ${data.map(item => {
                          const encodedData = safeEncodeItemData(item);
                          const total = item.Total ?? item.Process_Quantity ?? 0;
                          const totalNG = item.Total_NG ?? 0;
                          const defectRate = total > 0 ? ((totalNG / total) * 100).toFixed(1) : '0.0';
                          
                          return `
                            <div class="bg-white/80 backdrop-blur-sm rounded-lg p-3 cursor-pointer hover:bg-white/90 transition-colors border border-white/30"
                                 onclick='showSidebarFromElement(this)'
                                 data-item='${encodedData.encodedItem}'
                                 data-comment='${encodedData.comment.replace(/'/g, '&#39;').replace(/"/g, '&quot;')}'>
                              <div class="flex items-center justify-between">
                                <div class="flex-1 min-w-0">
                                  <p class="font-medium text-gray-900 truncate">${item.品番}</p>
                                  <p class="text-sm text-gray-600">${item.背番号} • ${item.Worker_Name || 'Unknown'}</p>
                                </div>
                                <div class="flex items-center gap-2 ml-3">
                                  <div class="text-right">
                                    <p class="text-sm font-medium text-gray-900">${total.toLocaleString()}</p>
                                    <p class="text-xs ${totalNG > 0 ? 'text-red-600' : 'text-gray-500'}">NG: ${totalNG}</p>
                                  </div>
                                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    parseFloat(defectRate) > 2 ? 'bg-red-100 text-red-700' :
                                    parseFloat(defectRate) > 1 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                  }">
                                    ${defectRate}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          `;
                        }).join("")}
                      </div>
                    `}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `;

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
    try {
        const encodedData = el.dataset.item;
        const comment = el.dataset.comment || '';
        
        console.log('Raw encoded data length:', encodedData.length);
        console.log('Comment length:', comment.length);
        
        const decodedData = decodeURIComponent(encodedData);
        console.log('Decoded data preview:', decodedData.substring(0, 600) + '...');
        
        // Parse the item without comment
        const itemWithoutComment = JSON.parse(decodedData);
        
        // Reconstruct the complete item with comment
        const completeItem = {
            ...itemWithoutComment,
            Comment: comment
        };
        
        console.log('Complete item reconstructed successfully');
        showSidebar(completeItem);
        
    } catch (error) {
        console.error('Error parsing item data:', error);
        console.error('Problematic encoded data:', el.dataset.item);
        console.error('Comment data:', el.dataset.comment);
        
        // Show a simple error message to user
        alert('データの読み込みに失敗しました。開発者コンソールでエラーを確認してください。');
    }
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
      ${entries.map(([label, value]) => {
        const isComment = label === "コメント" || label === "Comment";
        if (isComment) {
          return `
            <div class="flex items-start gap-2">
              <label class="font-medium w-32 shrink-0 pt-1">${label}</label>
              <textarea class="editable-input p-1 border rounded w-full bg-gray-100 resize-none overflow-hidden" 
                        data-label="${label}" 
                        disabled
                        style="min-height: 2.5rem;"
                        oninput="this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'">${value ?? ""}</textarea>
            </div>
          `;
        } else {
          return `
            <div class="flex items-center gap-2">
              <label class="font-medium w-32 shrink-0">${label}</label>
              <input type="text" class="editable-input p-1 border rounded w-full bg-gray-100" data-label="${label}" value="${value ?? ""}" disabled />
            </div>
          `;
        }
      }).join("")}
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

  // Initialize textarea height for comment fields
  const commentTextareas = content.querySelectorAll('textarea[data-label="コメント"], textarea[data-label="Comment"]');
  commentTextareas.forEach(textarea => {
    // Set initial height based on content
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  });

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
      
      // For textareas (comment fields), add auto-resize functionality when editing
      if (i.tagName.toLowerCase() === 'textarea') {
        i.addEventListener("input", () => {
          i.style.height = 'auto';
          i.style.height = i.scrollHeight + 'px';
        });
      }
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
// Pagination state for factory overview
let factoryPaginationState = {
  Daily: { Kensa: 1, Press: 1, SRS: 1, Slit: 1 },
  Weekly: { Kensa: 1, Press: 1, SRS: 1, Slit: 1 },
  Monthly: { Kensa: 1, Press: 1, SRS: 1, Slit: 1 }
};
const FACTORY_ITEMS_PER_PAGE = 10;

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
          // Reset pagination to first page when sorting
          factoryPaginationState[section][processName] = 1;
          renderSections(); // re-render
        };

        // Pagination functions
        window.changeFactoryPage = (section, processName, direction) => {
          const currentPage = factoryPaginationState[section][processName];
          const newPage = currentPage + direction;
          if (newPage >= 1) {
            factoryPaginationState[section][processName] = newPage;
            renderSections();
          }
        };

        window.goToFactoryPage = (section, processName, page) => {
          factoryPaginationState[section][processName] = page;
          renderSections();
        };
  
        function renderSections() {
          // Store reference for search functionality
          window.currentRenderFunction = renderSections;
          
          // Initialize pagination state if not exists
          if (!factoryPaginationState.Daily) {
            factoryPaginationState = {
              Daily: { Kensa: 1, Press: 1, SRS: 1, Slit: 1 },
              Weekly: { Kensa: 1, Press: 1, SRS: 1, Slit: 1 },
              Monthly: { Kensa: 1, Press: 1, SRS: 1, Slit: 1 }
            };
          }
          
          container.innerHTML = Object.entries(dataBySection).map(([label, results], index) => `
            <div class="mb-8">
              ${index > 0 ? '<hr class="my-6 border-t-2 border-gray-300">' : ''}
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-2xl font-semibold">${label} Production</h3>
                <div class="flex items-center gap-4">
                  <input type="text" 
                         id="search${label}" 
                         placeholder="Search..." 
                         class="px-3 py-1 border rounded-md text-sm"
                         onkeyup="handleFactorySearch('${label}')"
                         value="">
                </div>
              </div>
              <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                ${processes.map((proc, i) => {
                  const original = results[i];
                  if (!original?.length) return `
                    <div class="bg-white p-6 rounded-xl shadow border">
                      <div class="text-center py-8">
                        <div class="text-gray-400 mb-2">
                          <i class="ri-database-line text-4xl"></i>
                        </div>
                        <h4 class="font-semibold text-gray-600">${proc.name} Process</h4>
                        <p class="text-gray-500 text-sm">No data available</p>
                      </div>
                    </div>
                  `;

                  const state = sortStates[label];
                  let sorted = [...original];

                  // Apply search filter
                  const searchTerm = document.getElementById(`search${label}`)?.value?.toLowerCase() || '';
                  if (searchTerm) {
                    sorted = sorted.filter(item => 
                      (item.品番?.toLowerCase().includes(searchTerm)) ||
                      (item.背番号?.toLowerCase().includes(searchTerm)) ||
                      (item.Worker_Name?.toLowerCase().includes(searchTerm))
                    );
                  }

                  if (state.process === proc.name && state.column) {
                    sorted.sort((a, b) => {
                      const valA = a[state.column] ?? "";
                      const valB = b[state.column] ?? "";
                      return valA.toString().localeCompare(valB.toString(), "ja") * state.direction;
                    });
                  }

                  // Pagination calculations
                  const currentPage = factoryPaginationState[label][proc.name];
                  const totalItems = sorted.length;
                  const totalPages = Math.ceil(totalItems / FACTORY_ITEMS_PER_PAGE);
                  const startIndex = (currentPage - 1) * FACTORY_ITEMS_PER_PAGE;
                  const endIndex = startIndex + FACTORY_ITEMS_PER_PAGE;
                  const pageData = sorted.slice(startIndex, endIndex);

                  const arrow = col =>
                    state.process === proc.name && state.column === col
                      ? state.direction > 0 ? " ↑" : " ↓"
                      : "";

                  const summary = groupAndSummarize(sorted);

                  // Store data globally for export functions
                  if (!window.dailySectionData) window.dailySectionData = {};
                  window.dailySectionData[`${label}_${proc.name}`] = sorted;

                  const bgClassMap = {
                    Kensa: "bg-yellow-50",
                    Press: "bg-green-50",
                    SRS: "bg-gray-100",
                    Slit: "bg-blue-50"
                  };
                  const bgClass = bgClassMap[proc.name] || "bg-white";

                  return `
                    <div class="bg-white rounded-xl shadow-md border overflow-hidden">
                      <!-- Header -->
                      <div class="bg-gradient-to-r ${bgClass} px-6 py-4 border-b">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-3">
                            <div class="w-3 h-3 rounded-full ${
                              proc.name === 'Kensa' ? 'bg-yellow-500' :
                              proc.name === 'Press' ? 'bg-green-500' :
                              proc.name === 'SRS' ? 'bg-gray-500' : 'bg-blue-500'
                            }"></div>
                            <h4 class="text-lg font-semibold">${proc.name} Process</h4>
                          </div>
                          <div class="text-sm text-gray-600">
                            ${totalItems} records
                          </div>
                        </div>
                      </div>
                      
                      <!-- Table -->
                      <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                          <thead class="bg-gray-50 border-b">
                            <tr>
                              <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" 
                                  onclick="handleSectionSort('${label}', '${proc.name}', '品番')">
                                品番${arrow("品番")}
                              </th>
                              <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" 
                                  onclick="handleSectionSort('${label}', '${proc.name}', '背番号')">
                                背番号${arrow("背番号")}
                              </th>
                              <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" 
                                  onclick="handleSectionSort('${label}', '${proc.name}', 'Worker_Name')">
                                作業者${arrow("Worker_Name")}
                              </th>
                              <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" 
                                  onclick="handleSectionSort('${label}', '${proc.name}', 'Date')">
                                日付${arrow("Date")}
                              </th>
                              <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" 
                                  onclick="handleSectionSort('${label}', '${proc.name}', 'Total')">
                                Total${arrow("Total")}
                              </th>
                              <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" 
                                  onclick="handleSectionSort('${label}', '${proc.name}', 'Total_NG')">
                                Total NG${arrow("Total_NG")}
                              </th>
                              <th class="px-4 py-3 text-left font-medium text-gray-700">
                                不良率
                              </th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-gray-200">
                            ${pageData.length === 0 ? `
                              <tr>
                                <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                                  ${searchTerm ? 'No results found for your search' : 'No data available'}
                                </td>
                              </tr>
                            ` : pageData.map((item, index) => {
                              const encodedData = safeEncodeItemData(item);
                              const total = item.Total ?? item.Process_Quantity ?? 0;
                              const totalNG = item.Total_NG ?? 0;
                              const defectRate = total > 0 ? ((totalNG / total) * 100).toFixed(2) : '0.00';
                              const isEvenRow = index % 2 === 0;
                              
                              return `
                                <tr class="cursor-pointer hover:bg-blue-50 transition-colors ${isEvenRow ? 'bg-gray-50/50' : 'bg-white'}"
                                    onclick='showSidebarFromElement(this)'
                                    data-item='${encodedData.encodedItem}'
                                    data-comment='${encodedData.comment.replace(/'/g, '&#39;').replace(/"/g, '&quot;')}'>
                                  <td class="px-4 py-3 font-medium text-gray-900">${item.品番 ?? "-"}</td>
                                  <td class="px-4 py-3 text-gray-700">${item.背番号 ?? "-"}</td>
                                  <td class="px-4 py-3 text-gray-700">${item.Worker_Name ?? "-"}</td>
                                  <td class="px-4 py-3 text-gray-700">${item.Date ?? "-"}</td>
                                  <td class="px-4 py-3 font-medium text-gray-900">${total.toLocaleString()}</td>
                                  <td class="px-4 py-3 ${totalNG > 0 ? 'text-red-600 font-medium' : 'text-gray-700'}">${totalNG}</td>
                                  <td class="px-4 py-3">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      parseFloat(defectRate) > 2 ? 'bg-red-100 text-red-800' :
                                      parseFloat(defectRate) > 1 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    }">
                                      ${defectRate}%
                                    </span>
                                  </td>
                                </tr>
                              `;
                            }).join("")}
                          </tbody>
                        </table>
                      </div>

                      <!-- Pagination -->
                      ${totalPages > 1 ? `
                        <div class="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                          <div class="text-sm text-gray-700">
                            ${totalItems === 0 ? '0件中 0-0件を表示' : 
                              `${totalItems}件中 ${startIndex + 1}-${Math.min(endIndex, totalItems)}件を表示`}
                          </div>
                          <div class="flex items-center space-x-2">
                            <button onclick="changeFactoryPage('${label}', '${proc.name}', -1)" 
                                    ${currentPage === 1 ? 'disabled' : ''} 
                                    class="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                              前へ
                            </button>
                            <div class="flex space-x-1" id="pageNumbers${label}${proc.name}">
                              ${Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                                const startPage = Math.max(1, currentPage - 2);
                                const pageNum = startPage + i;
                                if (pageNum > totalPages) return '';
                                return `
                                  <button onclick="goToFactoryPage('${label}', '${proc.name}', ${pageNum})" 
                                          class="px-3 py-1 border rounded text-sm ${pageNum === currentPage ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'}">
                                    ${pageNum}
                                  </button>
                                `;
                              }).join('')}
                            </div>
                            <button onclick="changeFactoryPage('${label}', '${proc.name}', 1)" 
                                    ${currentPage === totalPages ? 'disabled' : ''} 
                                    class="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                              次へ
                            </button>
                          </div>
                        </div>
                      ` : ''}

                      <!-- Summary Section -->
                      ${summary.length > 0 ? `
                        <div class="px-6 py-4 border-t bg-gray-50/50">
                          <details class="group">
                            <summary class="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                              <span>📊 ${label} Summary (${summary.length} items)</span>
                              <span class="group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div class="mt-3 overflow-x-auto">
                              <table class="w-full text-xs border">
                                <thead class="bg-gray-100">
                                  <tr>
                                    <th class="px-3 py-2 text-left font-medium">品番</th>
                                    <th class="px-3 py-2 text-left font-medium">背番号</th>
                                    <th class="px-3 py-2 text-left font-medium">Total</th>
                                    <th class="px-3 py-2 text-left font-medium">Total NG</th>
                                    <th class="px-3 py-2 text-left font-medium">不良率</th>
                                  </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                                  ${summary.map(row => {
                                    const defectRate = row.Total > 0 ? ((row.Total_NG / row.Total) * 100).toFixed(2) : '0.00';
                                    return `
                                      <tr class="hover:bg-gray-50">
                                        <td class="px-3 py-2">${row.品番}</td>
                                        <td class="px-3 py-2">${row.背番号}</td>
                                        <td class="px-3 py-2">${row.Total.toLocaleString()}</td>
                                        <td class="px-3 py-2 ${row.Total_NG > 0 ? 'text-red-600' : ''}">${row.Total_NG}</td>
                                        <td class="px-3 py-2">
                                          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs ${
                                            parseFloat(defectRate) > 2 ? 'bg-red-100 text-red-700' :
                                            parseFloat(defectRate) > 1 ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-green-100 text-green-700'
                                          }">
                                            ${defectRate}%
                                          </span>
                                        </td>
                                      </tr>
                                    `;
                                  }).join("")}
                                </tbody>
                              </table>
                              <div class="flex gap-3 mt-3 pt-3 border-t">
                                <button onclick='exportDailySectionData("${label}", "${proc.name}")' 
                                        class="inline-flex items-center px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                                  <i class="ri-download-line mr-1"></i>
                                  CSV
                                </button>
                                <button onclick='exportSummaryToCSV(${JSON.stringify(summary)}, "${label}_${proc.name}_Summary.csv")' 
                                        class="inline-flex items-center px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                                  <i class="ri-download-line mr-1"></i>
                                  Summary CSV
                                </button>
                                <button onclick='exportToPDFGrouped([{ name: "${proc.name}", summary: ${JSON.stringify(summary)} }], "${label} ${proc.name} Summary")' 
                                        class="inline-flex items-center px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                                  <i class="ri-file-pdf-line mr-1"></i>
                                  PDF
                                </button>
                              </div>
                            </div>
                          </details>
                        </div>
                      ` : ''}
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
        const fullDataByProcess = [];
  
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
          // Reset arrays to avoid duplicates
          summaryByProcess.length = 0;
          fullDataByProcess.length = 0;
          
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
            fullDataByProcess.push({ name: procLabel, data: sorted });

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
                      ${sorted.map(item => {
                        const encodedData = safeEncodeItemData(item);
                        return `
                          <tr class="cursor-pointer hover:bg-gray-100"
                              onclick='showSidebarFromElement(this)'
                              data-item='${encodedData.encodedItem}'
                              data-comment='${encodedData.comment.replace(/'/g, '&#39;').replace(/"/g, '&quot;')}'>
                            <td>${item.品番 ?? "-"}</td>
                            <td>${item.背番号 ?? "-"}</td>
                            <td>${item.Worker_Name ?? "-"}</td>
                            <td>${item.Date ?? "-"}</td>
                            <td>${item.Total ?? item.Process_Quantity ?? 0}</td>
                            <td>${item.Total_NG ?? 0}</td>
                          </tr>
                        `;
                      }).join("")}
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
                    <button onclick='exportToCSV(window.currentProcessData_${index},"${procLabel}_detailed.csv")' class="text-blue-600 underline text-sm">Export CSV</button>
                    <button onclick='exportSummaryToCSV(${JSON.stringify(summary)},"${procLabel}_summary.csv")' class="text-blue-600 underline text-sm">Export Summary CSV</button>
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
                <button onclick='exportAllProcessesData()' class="text-blue-600 underline text-sm">Export CSV</button>
                <button onclick='exportSummaryToCSVGrouped(window.currentSummaryData,"all_processes_summary.csv")' class="text-blue-600 underline text-sm">Export Summary CSV</button>
                <button onclick='exportToPDFGrouped(window.currentSummaryData)' class="text-blue-600 underline text-sm">Export PDF</button>
              </div>
            </div>
          `;

          // Store data in global variables for export functions
          fullDataByProcess.forEach((proc, index) => {
            window[`currentProcessData_${index}`] = proc.data;
          });
          window.currentSummaryData = summaryByProcess;
          window.currentFullData = fullDataByProcess;
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
 * Exports summary data to CSV file (for summary tables only).
 */
function exportSummaryToCSV(data, filename = "summary.csv") {
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
 * Exports full MongoDB data to CSV file with all fields.
 */
function exportToCSV(data, filename = "export.csv") {
    if (!data || data.length === 0) {
        alert("No data to export");
        return;
    }

    // Get all possible headers from all records to ensure we don't miss any fields
    const allHeaders = new Set();
    
    data.forEach(item => {
        Object.keys(item).forEach(key => {
            if (key === 'Counters' && item[key] && typeof item[key] === 'object') {
                // Add individual counter fields
                Object.keys(item[key]).forEach(counterKey => {
                    allHeaders.add(`Counters.${counterKey}`);
                });
            } else if (key !== 'Counters') {
                allHeaders.add(key);
            }
        });
    });

    const headers = Array.from(allHeaders).sort();
    
    // Convert data to CSV format, handling nested Counters object
    const rows = data.map(row => {
        return headers.map(header => {
            if (header.startsWith('Counters.')) {
                const counterKey = header.replace('Counters.', '');
                return row.Counters?.[counterKey] ?? "";
            } else {
                let value = row[header];
                if (value === null || value === undefined) {
                    return "";
                }
                // Handle objects that aren't Counters (convert to JSON string)
                if (typeof value === 'object' && header !== 'Counters') {
                    return JSON.stringify(value);
                }
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }
        }).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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
 * Exports grouped process summaries to CSV (summary data only).
 */
function exportSummaryToCSVGrouped(processSummaries, filename = "summary.csv") {
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
 * Exports grouped process full data to CSV with all MongoDB fields.
 */
function exportToCSVGrouped(processData, filename = "export.csv") {
    if (!processData || processData.length === 0) {
        alert("No data to export");
        return;
    }

    const rows = [];
    
    // Get all possible headers from all processes and records
    const allHeaders = new Set();
    
    processData.forEach(proc => {
        if (proc.data && proc.data.length > 0) {
            proc.data.forEach(item => {
                Object.keys(item).forEach(key => {
                    if (key === 'Counters' && item[key] && typeof item[key] === 'object') {
                        Object.keys(item[key]).forEach(counterKey => {
                            allHeaders.add(`Counters.${counterKey}`);
                        });
                    } else if (key !== 'Counters') {
                        allHeaders.add(key);
                    }
                });
            });
        }
    });

    const headers = Array.from(allHeaders).sort();
    
    processData.forEach((proc, index) => {
        if (proc.data && proc.data.length > 0) {
            if (index > 0) {
                rows.push([]); // blank line between processes
            }
            
            rows.push([`${proc.name} Process Data`]);
            rows.push(headers);
            
            proc.data.forEach(row => {
                const csvRow = headers.map(header => {
                    if (header.startsWith('Counters.')) {
                        const counterKey = header.replace('Counters.', '');
                        return row.Counters?.[counterKey] ?? "";
                    } else {
                        let value = row[header];
                        if (value === null || value === undefined) {
                            return "";
                        }
                        if (typeof value === 'object' && header !== 'Counters') {
                            return JSON.stringify(value);
                        }
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    }
                });
                rows.push(csvRow);
            });
        }
    });

    const csv = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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

/**
 * Safely encode item data for HTML attributes, excluding problematic Comment field
 * @param {Object} item - The item object to encode
 * @returns {Object} - Object with encoded item data and separate comment
 */
function safeEncodeItemData(item) {
    try {
        // Create a copy without the Comment field
        const itemWithoutComment = { ...item };
        const comment = itemWithoutComment.Comment || '';
        delete itemWithoutComment.Comment;
        
        // Encode the clean item (without comment)
        const encodedItem = encodeURIComponent(JSON.stringify(itemWithoutComment));
        
        // Return both encoded item and raw comment
        return {
            encodedItem,
            comment
        };
        
    } catch (error) {
        console.error('Error in safeEncodeItemData:', error);
        console.error('Problematic item:', item);
        
        // Create a minimal safe fallback
        const safeItem = {
            _id: item._id || 'unknown',
            品番: item.品番 || 'unknown',
            背番号: item.背番号 || 'unknown',
            工場: item.工場 || 'unknown',
            Total: item.Total || 0,
            Total_NG: item.Total_NG || 0,
            Worker_Name: item.Worker_Name || 'unknown',
            Date: item.Date || 'unknown',
            error: 'Data simplified due to encoding issues'
        };
        
        return {
            encodedItem: encodeURIComponent(JSON.stringify(safeItem)),
            comment: item.Comment || ''
        };
    }
}

/**
 * Handle search functionality for factory overview
 */
window.handleFactorySearch = function(section) {
  // Reset pagination to first page when searching
  Object.keys(factoryPaginationState[section]).forEach(process => {
    factoryPaginationState[section][process] = 1;
  });
  
  // Re-render the sections to apply search filter
  const container = document.getElementById("dailyProduction");
  if (container.innerHTML.includes(`${section} Production`)) {
    // Find the current renderSections function and call it
    if (window.currentRenderFunction) {
      window.currentRenderFunction();
    }
  }
};

/**
 * Helper function to export all processes data from global variables
 */
function exportAllProcessesData() {
    if (window.currentFullData && window.currentFullData.length > 0) {
        showExportOptionsModal(window.currentFullData, "all_processes_detailed.csv", 'grouped');
    } else {
        alert("No data available to export");
    }
}

/**
 * Helper function to export daily section data
 */
function exportDailySectionData(section, processName) {
    const key = `${section}_${processName}`;
    if (window.dailySectionData && window.dailySectionData[key]) {
        showExportOptionsModal(window.dailySectionData[key], `${section}_${processName}_detailed.csv`, 'single');
    } else {
        alert("No data available to export");
    }
}

/**
 * Helper function to export single process data with options
 */
function exportSingleProcessData(processIndex, processName) {
    const dataKey = `currentProcessData_${processIndex}`;
    if (window[dataKey]) {
        showExportOptionsModal(window[dataKey], `${processName}_detailed.csv`, 'single');
    } else {
        alert("No data available to export");
    }
}

/**
 * Shows export options modal for selecting and ordering headers
 */
function showExportOptionsModal(data, filename, exportType = 'single') {
    if (!data || data.length === 0) {
        alert("No data to export");
        return;
    }

    // Get all possible headers from the data
    const allHeaders = new Set();
    const dataArray = Array.isArray(data) ? data : [data];
    
    if (exportType === 'grouped') {
        // For grouped data, get headers from all processes
        data.forEach(proc => {
            if (proc.data && proc.data.length > 0) {
                proc.data.forEach(item => {
                    Object.keys(item).forEach(key => {
                        if (key === 'Counters' && item[key] && typeof item[key] === 'object') {
                            Object.keys(item[key]).forEach(counterKey => {
                                allHeaders.add(`Counters.${counterKey}`);
                            });
                        } else if (key !== 'Counters') {
                            allHeaders.add(key);
                        }
                    });
                });
            }
        });
    } else {
        // For single process data
        dataArray.forEach(item => {
            Object.keys(item).forEach(key => {
                if (key === 'Counters' && item[key] && typeof item[key] === 'object') {
                    Object.keys(item[key]).forEach(counterKey => {
                        allHeaders.add(`Counters.${counterKey}`);
                    });
                } else if (key !== 'Counters') {
                    allHeaders.add(key);
                }
            });
        });
    }

    const headers = Array.from(allHeaders).sort();

    // Create modal HTML
    const modalHTML = `
        <div id="exportOptionsModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900">エクスポートオプション</h3>
                    <p class="text-sm text-gray-600 mt-1">エクスポートする列を選択し、順序を設定してください</p>
                </div>
                
                <div class="p-6 overflow-y-auto max-h-[60vh]">
                    <div class="mb-4">
                        <div class="flex gap-2 mb-3">
                            <button id="selectAllBtn" class="text-blue-600 underline text-sm">すべて選択</button>
                            <button id="deselectAllBtn" class="text-blue-600 underline text-sm">すべて解除</button>
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">列の順序を設定:</label>
                        <div id="headersList" class="space-y-2 border border-gray-200 rounded-md p-3 max-h-96 overflow-y-auto">
                            ${headers.map((header, index) => `
                                <div class="header-item flex items-center p-2 bg-gray-50 rounded border" data-header="${header}">
                                    <input type="checkbox" id="header_${index}" checked class="mr-3">
                                    <span class="flex-1 text-sm">${header}</span>
                                    <div class="flex gap-1">
                                        <button class="move-up text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200" ${index === 0 ? 'disabled' : ''}>↑</button>
                                        <button class="move-down text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200" ${index === headers.length - 1 ? 'disabled' : ''}>↓</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button id="cancelExportBtn" class="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                        キャンセル
                    </button>
                    <button id="executeExportBtn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        エクスポート実行
                    </button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('exportOptionsModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add event listeners
    setupExportModalEventListeners(data, filename, exportType);
}

/**
 * Sets up event listeners for the export options modal
 */
function setupExportModalEventListeners(data, filename, exportType) {
    const modal = document.getElementById('exportOptionsModal');
    const headersList = document.getElementById('headersList');

    // Select/Deselect all buttons
    document.getElementById('selectAllBtn').onclick = () => {
        headersList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    };

    document.getElementById('deselectAllBtn').onclick = () => {
        headersList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    };

    // Move up/down buttons
    headersList.addEventListener('click', (e) => {
        const item = e.target.closest('.header-item');
        if (!item) return;

        if (e.target.classList.contains('move-up')) {
            const prev = item.previousElementSibling;
            if (prev) {
                item.parentNode.insertBefore(item, prev);
                updateMoveButtons();
            }
        } else if (e.target.classList.contains('move-down')) {
            const next = item.nextElementSibling;
            if (next) {
                item.parentNode.insertBefore(next, item);
                updateMoveButtons();
            }
        }
    });

    function updateMoveButtons() {
        const items = headersList.querySelectorAll('.header-item');
        items.forEach((item, index) => {
            const upBtn = item.querySelector('.move-up');
            const downBtn = item.querySelector('.move-down');
            upBtn.disabled = index === 0;
            downBtn.disabled = index === items.length - 1;
        });
    }

    // Cancel button
    document.getElementById('cancelExportBtn').onclick = () => {
        modal.remove();
    };

    // Execute export button
    document.getElementById('executeExportBtn').onclick = () => {
        const selectedHeaders = [];
        const items = headersList.querySelectorAll('.header-item');
        
        items.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox.checked) {
                selectedHeaders.push(item.dataset.header);
            }
        });

        if (selectedHeaders.length === 0) {
            alert('少なくとも1つの列を選択してください');
            return;
        }

        modal.remove();

        // Execute the export with selected headers
        if (exportType === 'grouped') {
            exportToCSVGroupedWithHeaders(data, selectedHeaders, filename);
        } else {
            exportToCSVWithHeaders(data, selectedHeaders, filename);
        }
    };

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

/**
 * Exports data to CSV with custom selected headers and order
 */
function exportToCSVWithHeaders(data, selectedHeaders, filename = "export.csv") {
    if (!data || data.length === 0) {
        alert("No data to export");
        return;
    }

    // Convert data to CSV format with selected headers in specified order
    const rows = data.map(row => {
        return selectedHeaders.map(header => {
            if (header.startsWith('Counters.')) {
                const counterKey = header.replace('Counters.', '');
                return row.Counters?.[counterKey] ?? "";
            } else {
                let value = row[header];
                if (value === null || value === undefined) {
                    return "";
                }
                // Handle objects that aren't Counters (convert to JSON string)
                if (typeof value === 'object' && header !== 'Counters') {
                    return JSON.stringify(value);
                }
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }
        }).join(",");
    });

    const csv = [selectedHeaders.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

/**
 * Exports grouped data to CSV with custom selected headers and order
 */
function exportToCSVGroupedWithHeaders(processData, selectedHeaders, filename = "export.csv") {
    if (!processData || processData.length === 0) {
        alert("No data to export");
        return;
    }

    const rows = [];
    
    processData.forEach((proc, index) => {
        if (proc.data && proc.data.length > 0) {
            if (index > 0) {
                rows.push([]); // blank line between processes
            }
            
            rows.push([`${proc.name} Process Data`]);
            rows.push(selectedHeaders);
            
            proc.data.forEach(row => {
                const csvRow = selectedHeaders.map(header => {
                    if (header.startsWith('Counters.')) {
                        const counterKey = header.replace('Counters.', '');
                        return row.Counters?.[counterKey] ?? "";
                    } else {
                        let value = row[header];
                        if (value === null || value === undefined) {
                            return "";
                        }
                        if (typeof value === 'object' && header !== 'Counters') {
                            return JSON.stringify(value);
                        }
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    }
                });
                rows.push(csvRow);
            });
        }
    });

    const csv = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
