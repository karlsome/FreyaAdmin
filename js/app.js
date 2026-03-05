if (!localStorage.getItem("authUser")) {
  window.location.href = "login.html";
}


const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
const roleDisplay = document.getElementById("userRole");
if (roleDisplay) {
  roleDisplay.textContent = currentUser.role || "guest";
}
const role = currentUser.role || "guest"; // Default to guest if no role is found



const roleAccess = {
  admin: ["dashboard", "factories", "factoryStatus", "planner", "inventory", "notifications", "analytics", "financials", "userManagement", "approvals", "masterDB", "customerManagement", "equipment", "scna", "noda"],
  部長: ["dashboard", "factories", "factoryStatus", "planner", "inventory", "notifications", "analytics", "financials", "userManagement", "approvals", "masterDB", "equipment", "customerManagement", "scna", "noda"], // Same as admin but no customerManagement
  課長: ["dashboard", "factories", "factoryStatus", "planner", "inventory", "notifications", "analytics", "financials", "userManagement", "approvals", "masterDB", "equipment", "scna", "noda"], // Same as 部長
  係長: ["dashboard", "factories", "factoryStatus", "planner", "approvals", "masterDB", "equipment", "financials", "scna", "noda"], // Same as 班長 but factory-limited
  班長: ["dashboard", "factories", "factoryStatus", "planner", "approvals", "masterDB", "equipment", "financials", "scna", "noda"],
  member: ["dashboard", "noda"]
};

const navItemsConfig = {
  dashboard: { icon: "ri-dashboard-line", label: "dashboard" },
  factories: { icon: "ri-building-line", label: "factories" },
  factoryStatus: { icon: "ri-bar-chart-box-line", label: "factoryStatus" },
  planner: { icon: "ri-calendar-schedule-line", label: "planner" },
  masterDB: { icon: "ri-settings-line", label: "masterDB" },
  inventory: { icon: "ri-archive-line", label: "inventory" },
  notifications: { icon: "ri-notification-line", label: "notifications" },
  analytics: { icon: "ri-line-chart-line", label: "analytics" },
  financials: { icon: "ri-funds-line", label: "financials" },
  userManagement: { icon: "ri-user-settings-line", label: "userManagement" },
  approvals: { icon: "ri-checkbox-line", label: "approvals", badge: "12" },
  customerManagement: { icon: "ri-user-3-line", label: "customerManagement" },
  equipment: { icon: "ri-tools-line", label: "equipment" },
  scna: { icon: "ri-folder-line", label: "scna" },
  noda: { icon: "ri-store-line", label: "noda" },
};

// Navigation functions are now handled in navbar.js to avoid duplicates

function setupNavigation() {
  document.querySelectorAll(".nav-btn").forEach(button => {
    const page = button.getAttribute("data-page");
    
    if (!roleAccess[role]?.includes(page)) {
      button.style.display = "none";  // hide button if no permission
    } else {
      // Only add event listener if it doesn't already have one
      if (!button.hasAttribute('data-listener-added')) {
        button.setAttribute('data-listener-added', 'true');
        
        button.addEventListener("click", function (e) {
          // Handle page navigation
          document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active", "bg-gray-100", "dark:bg-gray-700", "text-gray-900", "dark:text-white"));
          this.classList.add("active", "bg-gray-100", "dark:bg-gray-700", "text-gray-900", "dark:text-white");
          loadPage(page);
        });
      }
    }
  });
}

function createNavItem(page) {
  const { icon, label, badge } = navItemsConfig[page] || {};
  if (!icon || !label) return null;

  const li = document.createElement("li");

  // Regular nav item
  const button = document.createElement("button");
  button.className = "nav-btn flex items-center w-full p-2 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200";
  button.setAttribute("data-page", page);

  button.innerHTML = `
    <i class="${icon} text-lg"></i>
    <span class="ml-3" data-i18n="${page}">${label}</span>
    ${badge ? `<span class="ml-auto bg-red-500 dark:bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">${badge}</span>` : ""}
  `;

  li.appendChild(button);
  return li;
}

function renderSidebarNavigation() {
  const navList = document.getElementById("dynamicNav");
  navList.innerHTML = ""; // Clear existing items

  const allowedPages = roleAccess[role] || [];

  allowedPages.forEach(page => {
    const navItem = createNavItem(page);
    if (navItem) navList.appendChild(navItem);
  });

  // Event handlers will be set up by setupNavigation() which is called after this
}
renderSidebarNavigation();

function toggleDropdown() {
  const dropdown = document.getElementById("dropdownContent");
  dropdown.classList.toggle("hidden");
}

document.addEventListener("click", function (event) {
  const menu = document.getElementById("profileMenu");
  if (!menu.contains(event.target)) {
    document.getElementById("dropdownContent").classList.add("hidden");
  }
});

function logout() {
  localStorage.removeItem("authUser");
  window.location.href = "login.html";
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (sidebar && overlay) {
    sidebar.classList.toggle("-translate-x-full");
    overlay.classList.toggle("hidden");
  }
}

// Make toggleSidebar globally available
window.toggleSidebar = toggleSidebar;


// This is a simple JavaScript file to handle the navigation and rendering of different pages in a web application.
// It uses the Fetch API to retrieve data from a server and dynamically updates the HTML content based on user interactions.
document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    loadPage("dashboard"); // Load dashboard by default
});




// Mock data for demonstration purposes
function loadPage(page) {
    const mainContent = document.getElementById("mainContent");

    switch (page) {
        case "dashboard":
        mainContent.innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow mb-6">
                <h2 class="text-2xl font-semibold mb-4" data-i18n="factoryOverview">Factory Overview</h2>
                <div id="factoryCards" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            </div>
        `;
        renderFactoryCards();
        if (typeof applyLanguageEnhanced === 'function') {
          applyLanguageEnhanced();
        } else if (typeof applyLanguage === 'function') {
          applyLanguage();
        }
        break;

        case "analytics":
            mainContent.innerHTML = `
                <div class="space-y-6">
                    <!-- Header Section -->
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h2 class="text-3xl font-bold text-gray-900" data-i18n="analyticsTitle">Analytics</h2>
                            <p class="mt-2 text-gray-600" data-i18n="analyticsSubtitle">Inspection Data Analysis & Insights</p>
                            <div class="mt-2 text-sm text-blue-600 date-range-display">
                                <span data-i18n="loading">Loading...</span>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            <button onclick="exportAnalyticsData()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                <i class="ri-download-line mr-2"></i><span data-i18n="csvExport">CSV Export</span>
                            </button>
                            <button id="refreshAnalyticsBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <i class="ri-refresh-line mr-2"></i><span data-i18n="update">Update</span>
                            </button>
                        </div>
                    </div>

                    <!-- Date Range Controls -->
                    <div class="bg-white p-6 rounded-lg border border-gray-200">
                      <!-- Row 1: Period, Dates, Process, Factory -->
                      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-4">
                        <div>
                          <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="periodSelection">Period Selection</label>
                          <select id="analyticsRangeSelect" class="w-full p-2 border border-gray-300 rounded-md">
                            <option value="today" data-i18n="today">Today</option>
                            <option value="last7" data-i18n="last7Days">Last 7 Days</option>
                            <option value="last30" selected data-i18n="last30Days">Last 30 Days</option>
                            <option value="last90" data-i18n="last3Months">Last 3 Months</option>
                            <option value="thisMonth" data-i18n="thisMonth">This Month</option>
                            <option value="lastMonth" data-i18n="lastMonth">Last Month</option>
                            <option value="custom" data-i18n="customRange">Custom Range</option>
                          </select>
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="startDate">Start Date</label>
                          <input type="date" id="analyticsFromDate" class="w-full p-2 border border-gray-300 rounded-md">
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="endDate">End Date</label>
                          <input type="date" id="analyticsToDate" class="w-full p-2 border border-gray-300 rounded-md">
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="process">Process</label>
                          <select id="analyticsCollectionFilter" class="w-full p-2 border border-gray-300 rounded-md">
                            <option value="kensaDB" data-i18n="inspection">Inspection (kensaDB)</option>
                            <option value="pressDB" data-i18n="press">Press (pressDB)</option>
                            <option value="slitDB" data-i18n="slit">Slit (slitDB)</option>
                            <option value="SRSDB" data-i18n="srs">SRS (SRSDB)</option>
                          </select>
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="factoryFilter">Factory</label>
                          <select id="analyticsFactoryFilter" class="w-full p-2 border border-gray-300 rounded-md">
                            <option value="" data-i18n="allFactories">All Factories</option>
                          </select>
                        </div>
                      </div>

                      <!-- Row 2: Filter Type + Model/背番号 selector -->
                      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-4">
                        <div>
                          <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="filterType">Filter Type</label>
                          <select id="analyticsFilterType" class="w-full p-2 border border-gray-300 rounded-md" onchange="handleAnalyticsFilterTypeChange()">
                            <option value="" data-i18n="noFilter">— No Filter —</option>
                            <option value="model" data-i18n="model">モデル (Model)</option>
                            <option value="sebanggo">背番号 (Serial Number)</option>
                          </select>
                        </div>
                        <!-- Model dropdown (visible when filterType=model) -->
                        <div id="analyticsModelFilterContainer" class="hidden">
                          <label class="block text-sm font-medium text-gray-700 mb-2">モデル / Model</label>
                          <select id="analyticsModelFilter" class="w-full p-2 border border-gray-300 rounded-md" onchange="handleAnalyticsModelFilter()">
                            <option value="">All Models</option>
                          </select>
                        </div>
                        <!-- 背番号 selector button (visible when filterType=sebanggo) -->
                        <div id="analyticsSebanggoFilterContainer" class="hidden">
                          <label class="block text-sm font-medium text-gray-700 mb-2">背番号 / Serial Numbers</label>
                          <button onclick="openAnalyticsSebanggoSelector()" class="w-full p-2 border border-gray-300 rounded-md bg-white text-left text-gray-700 hover:bg-gray-50">
                            <span id="analyticsSelectedCount">Select products...</span>
                          </button>
                        </div>
                        <!-- Selected Products display (span 2 cols) -->
                        <div id="analyticsProductDisplayContainer" class="hidden md:col-span-2">
                          <div class="flex items-center justify-between mb-2">
                            <label class="block text-sm font-medium text-gray-700">Selected Products</label>
                            <button onclick="openAnalyticsSebanggoSelector()" class="text-xs text-blue-600 hover:text-blue-700">Show all</button>
                          </div>
                          <div id="analyticsSelectedProductsDisplay" class="p-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-700 h-[42px] overflow-y-auto">None selected</div>
                        </div>
                        <!-- Loader (always last slot) -->
                        <div class="flex items-end pb-1">
                          <div id="analyticsLoader" class="hidden">
                            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          </div>
                        </div>
                      </div>

                      <!-- Selected Products Tags -->
                      <div id="analyticsSelectedProductsTags" class="flex flex-wrap gap-2 min-h-[1rem]"></div>
                    </div>

                    <!-- Summary Cards -->
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div class="analytics-card bg-white p-4 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-blue-100 rounded-lg">
                                    <i class="ri-line-chart-line text-blue-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="totalProduction">Total Production</p>
                                    <p class="text-2xl font-bold text-gray-900 analytics-count" id="totalProductionCount">0</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="analytics-card bg-white p-4 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-red-100 rounded-lg">
                                    <i class="ri-error-warning-line text-red-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="totalDefects">Total Defects</p>
                                    <p class="text-2xl font-bold text-gray-900 analytics-count" id="totalDefectsCount">0</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="analytics-card bg-white p-4 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-yellow-100 rounded-lg">
                                    <i class="ri-percent-line text-yellow-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="defectRate">Defect Rate</p>
                                    <p class="text-2xl font-bold text-gray-900 analytics-count" id="avgDefectRateCount">0.00%</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="analytics-card bg-white p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors duration-200" 
                             onclick="recalculateCombinedDefectRate()" 
                             title="クリックして再計算 (Click to recalculate)">
                            <div class="flex items-center">
                                <div class="p-2 bg-amber-100 rounded-lg">
                                    <i class="ri-pie-chart-line text-amber-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="combinedDefectRate">Combined Defect Rate</p>
                                    <p class="text-2xl font-bold text-gray-900 analytics-count hover:text-blue-600 transition-colors" id="combinedDefectRateCount">0.00%</p>
                                </div>
                                <div class="ml-auto">
                                    <i class="ri-refresh-line text-gray-400 text-sm"></i>
                                </div>
                            </div>
                        </div>
                        
                        <div class="analytics-card bg-white p-4 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-green-100 rounded-lg">
                                    <i class="ri-building-line text-green-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="factoryCount">Factory Count</p>
                                    <p class="text-2xl font-bold text-gray-900 analytics-count" id="totalFactoriesCount">0</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="analytics-card bg-white p-4 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-purple-100 rounded-lg">
                                    <i class="ri-user-line text-purple-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="workerCount">Worker Count</p>
                                    <p class="text-2xl font-bold text-gray-900 analytics-count" id="totalWorkersCount">0</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="analytics-card bg-white p-4 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-indigo-100 rounded-lg">
                                    <i class="ri-time-line text-indigo-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="avgCycleTime">Avg Cycle Time</p>
                                    <p class="text-2xl font-bold text-gray-900 analytics-count" id="avgCycleTimeCount">0.0<span data-i18n="minutes">min</span></p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- New KPI Cards -->
                        <div class="analytics-card bg-white p-4 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-emerald-100 rounded-lg">
                                    <i class="ri-check-double-line text-emerald-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="firstPassYield">First Pass Yield</p>
                                    <p class="text-2xl font-bold text-gray-900 analytics-count" id="firstPassYieldCount">0%</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="analytics-card bg-white p-4 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-orange-100 rounded-lg">
                                    <i class="ri-time-fill text-orange-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="peakProductionHour">Peak Hour</p>
                                    <p class="text-2xl font-bold text-gray-900 analytics-count" id="peakHourCount">--:--</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="analytics-card bg-white p-4 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-cyan-100 rounded-lg">
                                    <i class="ri-product-hunt-line text-cyan-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="mostProducedPart">Top Product</p>
                                    <p class="text-lg font-bold text-gray-900 analytics-count" id="topProductCount" style="font-size: 0.9rem;">---</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="analytics-card bg-white p-4 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-pink-100 rounded-lg">
                                    <i class="ri-tools-line text-pink-600 text-xl"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="equipmentCount">Equipment Used</p>
                                    <p class="text-2xl font-bold text-gray-900 analytics-count" id="equipmentCountCount">0</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Charts Grid -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- Production Trend Chart -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="productionDefectTrend">Production & Defect Trend</h3>
                            <div class="h-80">
                                <canvas id="productionTrendChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Quality Trend Chart -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="qualityTrendDefectRate">Quality Trend (Defect Rate)</h3>
                            <div class="h-80">
                                <canvas id="qualityTrendChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Factory Comparison Chart -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="factoryPerformance">Factory Performance</h3>
                            <div class="h-80">
                                <canvas id="factoryComparisonChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Defect Bar Chart -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <div class="flex items-start justify-between mb-3">
                              <h3 class="text-lg font-semibold text-gray-900" data-i18n="defectCountByType">Defect Count by Type</h3>
                              <span id="defectBarChartModelBadge" class="hidden text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded"></span>
                            </div>
                            <div class="h-80">
                                <canvas id="defectBarChart"></canvas>
                            </div>
                        </div>

                        <!-- Defect Distribution Chart -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <div class="flex items-start justify-between mb-3">
                              <h3 class="text-lg font-semibold text-gray-900" data-i18n="defectDistributionByProcess">Defect Distribution (by Process)</h3>
                              <span id="defectChartModelBadge" class="hidden text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded"></span>
                            </div>
                            <div class="h-72">
                                <canvas id="defectDistributionChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Worker Performance Chart -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="workerPerformance">Worker Performance (Top 10)</h3>
                            <div class="h-80">
                                <canvas id="workerPerformanceChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Process Efficiency Chart -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="equipmentEfficiency">Equipment Efficiency (Top 10)</h3>
                            <div class="h-80">
                                <canvas id="processEfficiencyChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- NEW ANALYTICS CHARTS -->
                        
                        <!-- Hourly Production Heatmap -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="hourlyProductionPattern">Hourly Production Pattern</h3>
                            <div class="h-80">
                                <canvas id="hourlyProductionChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Top/Bottom Products -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="topBottomProducts">Top & Bottom Products</h3>
                            <div class="h-80">
                                <canvas id="topBottomProductsChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Defect Trends by Time -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="defectRateByHour">Defect Rate by Hour</h3>
                            <div class="h-80">
                                <canvas id="defectsByHourChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Factory Total Defects Comparison -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="totalDefectsPerFactory">Total Defects per Factory</h3>
                            <div class="h-80">
                                <canvas id="factoryDefectsChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Top 5 Defects per Factory -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="top5DefectsPerFactory">Top 5 Defects per Factory</h3>
                            <div class="h-80">
                                <canvas id="factoryTop5DefectsChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Worker Quality Leaderboard -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="workerQualityLeaderboard">Worker Quality Leaderboard</h3>
                            <div class="h-80">
                                <canvas id="workerQualityChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Equipment Downtime Analysis -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="equipmentPerformance">Equipment Performance</h3>
                            <div class="h-80">
                                <canvas id="equipmentDowntimeChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Factory Performance Radar -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="factoryPerformanceComparison">Factory Performance Comparison</h3>
                            <div class="h-80">
                                <canvas id="factoryRadarChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Temperature Trend Chart -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="temperatureTrend">Temperature Trend</h3>
                            <div class="h-80">
                                <canvas id="temperatureTrendChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Humidity Trend Chart -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="humidityTrend">Humidity Trend</h3>
                            <div class="h-80">
                                <canvas id="humidityTrendChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- Top 5 Defect Parts per Factory -->
                        <div class="bg-white p-6 rounded-lg border border-gray-200 col-span-full">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4" data-i18n="top5DefectsPerFactory">Top 5 Defect Parts per Factory</h3>
                            <div id="topDefectPartsByFactory" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <!-- Will be populated by renderTopDefectPartsByFactory() -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Defect Part Details Modal -->
                    <div id="defectPartDetailsModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50" style="display: none;">
                        <div class="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] flex flex-col">
                            <!-- Modal Header -->
                            <div class="flex items-center justify-between p-6 border-b border-gray-200">
                                <div>
                                    <h2 class="text-xl font-bold text-gray-900" id="defectPartModalTitle" data-i18n="defectDetails">Defect Details</h2>
                                    <p class="text-sm text-gray-600 mt-1" id="defectPartModalSubtitle"></p>
                                </div>
                                <button onclick="closeDefectPartDetailsModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                            
                            <!-- Modal Body -->
                            <div class="flex-1 overflow-auto p-6">
                                <div id="defectPartDetailsContent">
                                    <div class="text-center py-8 text-gray-500">Loading...</div>
                                </div>
                            </div>
                            
                            <!-- Modal Footer -->
                            <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                                <button onclick="closeDefectPartDetailsModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors" data-i18n="close">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Analytics 背番号 Selector Modal -->
                <div id="analyticsSebanggoSelectorModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                  <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                    <div class="p-4 border-b">
                      <div class="flex items-center justify-between">
                        <h3 class="text-base font-semibold text-gray-900">Select Products (背番号)</h3>
                        <button onclick="closeAnalyticsSebanggoSelector()" class="text-gray-500 hover:text-gray-700">
                          <i class="ri-close-line text-2xl"></i>
                        </button>
                      </div>
                      <input type="text" id="analyticsSebanggoSearch" oninput="filterAnalyticsSebanggoList()" placeholder="Search 背番号, 品番, モデル..." class="w-full mt-3 p-2 text-sm border rounded bg-white" />
                    </div>
                    <div class="p-3 overflow-y-auto max-h-[55vh]" id="analyticsSebanggoListContainer">
                      <p class="text-gray-500">Loading products...</p>
                    </div>
                    <div class="p-4 border-t flex items-center justify-between gap-2">
                      <div class="flex gap-2">
                        <button onclick="checkAllAnalyticsSebanggo()" class="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 text-gray-700">Check all</button>
                        <button onclick="uncheckAllAnalyticsSebanggo()" class="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 text-gray-700">Uncheck all</button>
                      </div>
                      <div class="flex gap-2">
                        <button onclick="closeAnalyticsSebanggoSelector()" class="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 text-gray-700">Cancel</button>
                        <button onclick="confirmAnalyticsSebanggoSelection()" class="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded">Confirm Selection</button>
                      </div>
                    </div>
                  </div>
                </div>
            `;
            // Initialize analytics after DOM is ready
            setTimeout(() => {
                if (typeof initializeAnalytics === 'function') {
                    initializeAnalytics();
                }
            }, 100);
            
            if (typeof applyLanguageEnhanced === 'function') {
              applyLanguageEnhanced();
            } else if (typeof applyLanguage === 'function') {
              applyLanguage();
            }
            break;

          case "financials":
            mainContent.innerHTML = `
              <div class="space-y-6">
                <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 class="text-3xl font-bold text-gray-900" data-i18n="financialsTitle">Financials</h2>
                    <p class="mt-2 text-gray-600" data-i18n="financialsSubtitle">Production value and scrap analysis</p>
                    <div class="mt-2 text-sm text-blue-600" id="financialsDateRangeDisplay">Loading...</div>
                  </div>
                  <div class="flex items-center space-x-3">
                    <button onclick="exportFinancialsPDF()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      <i class="ri-file-pdf-line mr-2"></i><span>PDF Export</span>
                    </button>
                    <button id="financialsExportBtn" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors" disabled>
                      <i class="ri-download-line mr-2"></i><span data-i18n="csvExport">CSV Export</span>
                    </button>
                    <button id="financialsRefreshBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <i class="ri-refresh-line mr-2"></i><span data-i18n="update">Update</span>
                    </button>
                  </div>
                </div>

                <div class="bg-white p-6 rounded-lg border border-gray-200">
                  <!-- Row 1: Period, Dates, Factory -->
                  <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="periodSelection">Period Selection</label>
                      <select id="financialsRangeSelect" class="w-full p-2 border border-gray-300 rounded-md">
                        <option value="today" data-i18n="today">Today</option>
                        <option value="last7" data-i18n="last7Days">Last 7 Days</option>
                        <option value="last30" selected data-i18n="last30Days">Last 30 Days</option>
                        <option value="last90" data-i18n="last3Months">Last 3 Months</option>
                        <option value="thisMonth" data-i18n="thisMonth">This Month</option>
                        <option value="lastMonth" data-i18n="lastMonth">Last Month</option>
                        <option value="custom" data-i18n="customRange">Custom Range</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="startDate">Start Date</label>
                      <input type="date" id="financialsFromDate" class="w-full p-2 border border-gray-300 rounded-md">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="endDate">End Date</label>
                      <input type="date" id="financialsToDate" class="w-full p-2 border border-gray-300 rounded-md">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="filterType">Filter Type</label>
                      <select id="financialsFilterType" class="w-full p-2 border border-gray-300 rounded-md">
                        <option value="model" data-i18n="model">モデル (Model)</option>
                        <option value="sebanggo" data-i18n="sebanggo">背番号 (Serial Number)</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="factoryFilter">Factory</label>
                      <select id="financialsFactoryFilter" class="w-full p-2 border border-gray-300 rounded-md">
                        <option value="" data-i18n="allFactories">All Factories</option>
                      </select>
                    </div>
                  </div>
                  
                  <!-- Row 2: Model dropdown or Sebanggo selector based on Filter Type -->
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <!-- Model Filter (shown when filter type is model) -->
                    <div id="financialsModelFilterContainer">
                      <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="model">モデル / Model</label>
                      <select id="financialsModelFilter" class="w-full p-2 border border-gray-300 rounded-md">
                        <option value="" data-i18n="selectModel">Select Model...</option>
                      </select>
                    </div>
                    
                    <!-- Sebanggo selector button (hidden by default) -->
                    <div id="financialsSebanggoFilterContainer" style="display: none;">
                      <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="sebanggo">背番号 / Serial Numbers</label>
                      <button onclick="openFinancialsSebanggoSelector()" class="w-full p-2 border border-gray-300 rounded-md bg-white text-left text-gray-700 hover:bg-gray-50">
                        <span id="financialsSelectedCount" data-i18n="selectProducts">Select products...</span>
                      </button>
                    </div>
                    
                    <!-- Selected Products Display -->
                    <div>
                      <div class="flex items-center justify-between mb-2">
                        <label class="block text-sm font-medium text-gray-700" data-i18n="selectedProducts">Selected Products</label>
                        <button onclick="openFinancialsSebanggoSelector()" class="text-xs text-blue-600 hover:text-blue-700" data-i18n="showAll">
                          Show all
                        </button>
                      </div>
                      <div id="financialsSelectedProductsDisplay" class="p-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-700 h-[42px] overflow-y-auto" data-i18n="noneSelected">
                        None selected
                      </div>
                    </div>
                  </div>
                  
                  <!-- Selected Products Tags -->
                  <div id="financialsSelectedProductsTags" class="flex flex-wrap gap-2 min-h-[1.5rem] mb-4"></div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
                  <div class="bg-white p-3 rounded-lg border border-gray-200">
                    <p class="text-xs font-medium text-gray-600" data-i18n="totalCost">Total Cost (¥)</p>
                    <p class="text-base font-bold text-gray-900 truncate" id="financialsTotalValue">¥0</p>
                    <p class="text-xs mt-1 h-4" id="financialsDelta-totalValue"></p>
                  </div>
                  <div class="bg-white p-3 rounded-lg border border-gray-200">
                    <p class="text-xs font-medium text-red-600" data-i18n="scrapLoss">Scrap Loss (¥)</p>
                    <p class="text-base font-bold text-red-700 truncate" id="financialsScrapLoss">¥0</p>
                    <p class="text-xs mt-1 h-4" id="financialsDelta-scrapLoss"></p>
                  </div>
                  <div class="bg-white p-3 rounded-lg border border-gray-200">
                    <p class="text-xs font-medium text-green-600" data-i18n="finalGoodYen">Final Good (¥)</p>
                    <p class="text-base font-bold text-green-700 truncate" id="financialsFinalGoodYen">¥0</p>
                    <p class="text-xs text-gray-400" data-i18n="costMinusScrap">(Cost - Scrap Loss)</p>
                  </div>
                  <div class="bg-white p-3 rounded-lg border border-gray-200">
                    <p class="text-xs font-medium text-indigo-600" data-i18n="costRecoveryRate">Cost Recovery Rate</p>
                    <p class="text-base font-bold text-indigo-700" id="financialsCostRecovery">0%</p>
                    <p class="text-xs mt-1 h-4" id="financialsDelta-costRecovery"></p>
                  </div>
                  <div class="bg-white p-3 rounded-lg border border-gray-200">
                    <p class="text-xs font-medium text-gray-600" data-i18n="yield">Yield %</p>
                    <p class="text-base font-bold text-gray-900" id="financialsYield">0%</p>
                    <p class="text-xs mt-1 h-4" id="financialsDelta-yield"></p>
                  </div>
                  <div class="bg-white p-3 rounded-lg border border-gray-200">
                    <p class="text-xs font-medium text-green-600" data-i18n="totalCreated">Total Created (pcs)</p>
                    <p class="text-base font-bold text-green-700 truncate" id="financialsTotalCreated">0 pcs</p>
                    <p class="text-xs mt-1 h-4" id="financialsDelta-totalCreated"></p>
                  </div>
                  <div class="bg-white p-3 rounded-lg border border-gray-200">
                    <p class="text-xs font-medium text-red-600" data-i18n="totalLoss">Total Loss (pcs)</p>
                    <p class="text-base font-bold text-red-700 truncate" id="financialsTotalLoss">0 pcs</p>
                    <p class="text-xs mt-1 h-4" id="financialsDelta-totalLoss"></p>
                  </div>
                  <div class="bg-white p-3 rounded-lg border border-gray-200">
                    <p class="text-xs font-medium text-blue-600" data-i18n="finalGood">Final Good (pcs)</p>
                    <p class="text-base font-bold text-blue-700 truncate" id="financialsFinalGood">0 pcs</p>
                    <p class="text-xs text-gray-400" data-i18n="createdMinusTotalNg">(Created - Total NG)</p>
                  </div>
                  <div class="bg-white p-3 rounded-lg border border-gray-200">
                    <p class="text-xs font-medium text-gray-600" data-i18n="defectRate">Defect Rate</p>
                    <p class="text-base font-bold text-gray-900" id="financialsDefectRate">0%</p>
                    <p class="text-xs mt-1 h-4" id="financialsDelta-defectRate"></p>
                  </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 class="text-sm font-semibold text-gray-700 mb-3" data-i18n="createdVsGoodByFactory">Created vs Final Good by Factory</h3>
                    <div class="h-72">
                      <canvas id="financialsCreatedVsGood"></canvas>
                    </div>
                  </div>
                  <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 class="text-sm font-semibold text-gray-700 mb-3" data-i18n="scrapByProcess">Scrap by Process</h3>
                    <div class="h-72">
                      <canvas id="financialsScrapByProcess"></canvas>
                    </div>
                  </div>
                  <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 class="text-sm font-semibold text-gray-700 mb-3" data-i18n="valueByFactory">Value by Factory</h3>
                    <div class="h-72">
                      <canvas id="financialsValueByFactory"></canvas>
                    </div>
                  </div>
                  <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 class="text-sm font-semibold text-gray-700 mb-3" data-i18n="scrapByFactory">Scrap Loss by Factory</h3>
                    <div class="h-72">
                      <canvas id="financialsScrapByFactory"></canvas>
                    </div>
                  </div>
                </div>

                <!-- Scrap Loss &amp; Cost Trend -->
                <div class="bg-white p-4 rounded-lg border border-gray-200">
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm font-semibold text-gray-700" data-i18n="scrapLossCostTrend">Scrap Loss &amp; Cost Trend</h3>
                    <span class="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded" id="financialsTrendGranularity" data-i18n="daily">Daily</span>
                  </div>
                  <div class="h-64">
                    <canvas id="financialsTrendChart"></canvas>
                  </div>
                </div>

                <!-- Cost vs Scrap Loss: Positive / Negative Bar -->
                <div class="bg-white p-4 rounded-lg border border-gray-200">
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm font-semibold text-gray-700" data-i18n="costVsScrapDailyBar">Cost vs Scrap Loss (Daily Bar)</h3>
                    <div class="flex items-center gap-3 text-xs text-gray-500">
                      <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm" style="background:#16a34a"></span><span data-i18n="cost">Cost (¥)</span></span>
                      <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm" style="background:#dc2626"></span><span data-i18n="scrapLoss">Scrap Loss (¥)</span></span>
                    </div>
                  </div>
                  <div class="h-64">
                    <canvas id="financialsPosNegChart"></canvas>
                  </div>
                </div>

                <!-- Top 5 worst 背番号 + Factory ranking -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 class="text-sm font-semibold text-gray-700 mb-3" data-i18n="top5HighestScrapLoss">Top 5 Highest Scrap Loss (背番号)</h3>
                    <table class="min-w-full text-sm">
                      <thead class="bg-gray-50 text-gray-600 text-xs">
                        <tr>
                          <th class="px-3 py-2 text-left">#</th>
                          <th class="px-3 py-2 text-left">背番号</th>
                          <th class="px-3 py-2 text-left" data-i18n="model">Model</th>
                          <th class="px-3 py-2 text-right" data-i18n="scrapLoss">Scrap Loss (¥)</th>
                          <th class="px-3 py-2 text-right" data-i18n="yieldPercent">Yield %</th>
                        </tr>
                      </thead>
                      <tbody id="financialsTop5Body" class="divide-y divide-gray-100">
                        <tr><td colspan="5" class="px-3 py-3 text-gray-400 text-xs">No data.</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 class="text-sm font-semibold text-gray-700 mb-3" data-i18n="factoryScrapLossRanking">Factory Scrap Loss Ranking</h3>
                    <table class="min-w-full text-sm">
                      <thead class="bg-gray-50 text-gray-600 text-xs">
                        <tr>
                          <th class="px-3 py-2 text-left">#</th>
                          <th class="px-3 py-2 text-left" data-i18n="factory">Factory</th>
                          <th class="px-3 py-2 text-right" data-i18n="created">Created</th>
                          <th class="px-3 py-2 text-right" data-i18n="scrapLoss">Scrap Loss (¥)</th>
                          <th class="px-3 py-2 text-right" data-i18n="yieldPercent">Yield %</th>
                        </tr>
                      </thead>
                      <tbody id="financialsFactoryRankingBody" class="divide-y divide-gray-100">
                        <tr><td colspan="5" class="px-3 py-3 text-gray-400 text-xs">No data.</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div id="financialsDetailSection" class="bg-white p-4 rounded-lg border border-gray-200" style="position: relative;">
                  <h3 class="text-sm font-semibold text-gray-700 mb-3" data-i18n="detailBreakdown">Detail Breakdown by 品番</h3>
                  <div class="overflow-x-auto">
                    <table class="min-w-full text-sm text-left">
                      <thead class="bg-gray-50 text-gray-600">
                        <tr>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('hinban')">品番 <span id="financialsSortIcon-hinban"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('ban')">背番号 <span id="financialsSortIcon-ban"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('model')"><span data-i18n="model">Model</span> <span id="financialsSortIcon-model"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('factory')">工場 <span id="financialsSortIcon-factory"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('created')"><span data-i18n="createdPcs">Created (pcs)</span> <span id="financialsSortIcon-created"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('pressNg')"><span data-i18n="pressNg">Press NG</span> <span id="financialsSortIcon-pressNg"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('slitNg')"><span data-i18n="slitNg">Slit NG</span> <span id="financialsSortIcon-slitNg"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('srsNg')"><span data-i18n="srsNg">SRS NG</span> <span id="financialsSortIcon-srsNg"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('kensaNg')"><span data-i18n="kensaNg">Kensa NG</span> <span id="financialsSortIcon-kensaNg"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('totalNg')"><span data-i18n="totalNg">Total NG</span> <span id="financialsSortIcon-totalNg"></span></button>
                          </th>
                          <th class="px-4 py-2" style="background-color: #fff3cd;">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('recoveredNg')"><span data-i18n="recoveredNg">Recovered NG</span> <span id="financialsSortIcon-recoveredNg"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('ngAfterRecovery')"><span data-i18n="ngAfterRecovery">NG After Recovery</span> <span id="financialsSortIcon-ngAfterRecovery"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('finalGood')"><span data-i18n="finalGoodPcs">Final Good (pcs)</span> <span id="financialsSortIcon-finalGood"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('yieldPercent')"><span data-i18n="yieldPercent">Yield %</span> <span id="financialsSortIcon-yieldPercent"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('pricePerPc')"><span data-i18n="pricePerPiece">pricePerPiece (¥)</span> <span id="financialsSortIcon-pricePerPc"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('cost')"><span data-i18n="cost">Cost (¥)</span> <span id="financialsSortIcon-cost"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('scrapLoss')"><span data-i18n="scrapLoss">Scrap Loss (¥)</span> <span id="financialsSortIcon-scrapLoss"></span></button>
                          </th>
                          <th class="px-4 py-2">
                            <button class="flex items-center gap-1" onclick="toggleFinancialsSort('value')"><span data-i18n="value">Value (¥)</span> <span id="financialsSortIcon-value"></span></button>
                          </th>
                        </tr>
                      </thead>
                      <tbody id="financialsDetailBody" class="divide-y divide-gray-100">
                        <tr>
                          <td class="px-4 py-3 text-gray-500" colspan="18">No data loaded.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div class="text-sm text-gray-600" id="financialsPageInfo">0件中 0-0件を表示</div>
                    <div class="flex items-center gap-2">
                      <button id="financialsPrevPageBtn" class="px-3 py-1 border rounded hover:bg-gray-50" data-i18n="prev" disabled>Prev</button>
                      <button id="financialsNextPageBtn" class="px-3 py-1 border rounded hover:bg-gray-50" data-i18n="next" disabled>Next</button>
                      <select id="financialsPageSizeSelect" class="p-1 border rounded text-sm">
                        <option value="10" selected>10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Sebanggo Selector Modal -->
              <div id="financialsSebanggoSelectorModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                  <div class="p-4 border-b">
                    <div class="flex items-center justify-between">
                      <h3 class="text-base font-semibold text-gray-900" data-i18n="selectProductsSebanggo">Select Products (背番号)</h3>
                      <button onclick="closeFinancialsSebanggoSelector()" class="text-gray-500 hover:text-gray-700">
                        <i class="ri-close-line text-2xl"></i>
                      </button>
                    </div>
                    <input type="text" id="financialsSebanggoSearch" oninput="filterFinancialsSebanggoList()" data-i18n-placeholder="searchProducts" placeholder="Search..." class="w-full mt-3 p-2 text-sm border rounded bg-white" />
                  </div>
                  <div class="p-3 overflow-y-auto max-h-[55vh]" id="financialsSebanggoListContainer">
                    <p class="text-gray-500" data-i18n="loadingProducts">Loading products...</p>
                  </div>
                  <div class="p-4 border-t flex items-center justify-between gap-2">
                    <div class="flex gap-2">
                      <button onclick="checkAllFinancialsSebanggo()" class="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 text-gray-700" data-i18n="checkAll">
                        Check all
                      </button>
                      <button onclick="uncheckAllFinancialsSebanggo()" class="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 text-gray-700" data-i18n="uncheckAll">
                        Uncheck all
                      </button>
                    </div>
                    <div class="flex gap-2">
                      <button onclick="closeFinancialsSebanggoSelector()" class="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 text-gray-700" data-i18n="cancel">
                        Cancel
                      </button>
                      <button onclick="confirmFinancialsSebanggoSelection()" class="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded" data-i18n="confirmSelection">
                        Confirm Selection
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `;
            if (typeof applyLanguage === "function") {
              applyLanguage();
            }
            if (typeof initFinancialsPage === "function") {
              initFinancialsPage();
            }
            break;

          case "approvals":
            mainContent.innerHTML = `
                <h2 class="text-2xl font-semibold mb-6" data-i18n="approvalsTitle">Data Approval System</h2>
                
                <!-- View Options Dropdown -->
                <div class="mb-6 flex justify-between items-center">
                    <div class="flex items-center space-x-4">
                        <label for="viewModeSelect" class="text-sm font-medium text-gray-700" data-i18n="viewMode">View Mode:</label>
                        <select id="viewModeSelect" class="p-2 border rounded bg-white">
                            <option value="table" data-i18n="tableView">Table View (Individual Approval)</option>
                            <option value="list" data-i18n="listView">List View (Batch Approval)</option>
                        </select>
                    </div>
                </div>
                
                <!-- Process Tabs -->
                <div class="border-b border-gray-200 mb-6">
                    <nav class="-mb-px flex space-x-8">
                        <button class="approval-tab-btn py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap active" 
                                data-tab="kensaDB" onclick="switchApprovalTab('kensaDB')" data-i18n="kensa">
                            Inspection (Kensa)
                        </button>
                        <button class="approval-tab-btn py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap" 
                                data-tab="pressDB" onclick="switchApprovalTab('pressDB')" data-i18n="press">
                            Press
                        </button>
                        <button class="approval-tab-btn py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap" 
                                data-tab="SRSDB" onclick="switchApprovalTab('SRSDB')">
                            SRS
                        </button>
                        <button class="approval-tab-btn py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap" 
                                data-tab="slitDB" onclick="switchApprovalTab('slitDB')" data-i18n="slit">
                            Slit
                        </button>
                    </nav>
                </div>

                <!-- Tab Content Container -->
                <div id="approvalTabContent">
                    <!-- Stats Cards -->
                    <!-- Data Range Toggle -->
                    <div class="mb-4 flex flex-wrap items-center justify-between gap-4">
                        <div class="flex items-center space-x-4">
                            <div class="bg-white rounded-lg border border-gray-200 p-1 flex items-center">
                                <button 
                                    id="currentDateModeBtn" 
                                    class="px-3 py-2 text-sm font-medium rounded-md transition-colors bg-blue-500 text-white"
                                    onclick="toggleDataRange('current')"
                                >
                                    <i class="ri-calendar-line mr-1"></i>
                                    <span data-i18n="currentDateOnly">Current Date Only</span>
                                </button>
                                <button 
                                    id="allDataModeBtn" 
                                    class="px-3 py-2 text-sm font-medium rounded-md transition-colors text-gray-600 hover:bg-gray-100"
                                    onclick="toggleDataRange('all')"
                                >
                                    <i class="ri-database-2-line mr-1"></i>
                                    <span data-i18n="allHistoricalData">All Historical Data</span>
                                </button>
                            </div>
                            <div id="dataRangeIndicator" class="text-sm text-gray-600">
                                <i class="ri-calendar-check-line mr-1 text-blue-500"></i>
                                <span data-i18n="showingCurrentDate">Showing current date data</span>
                            </div>
                            <button
                              id="showAllImagesBtn"
                              class="hidden px-3 py-2 text-sm font-medium rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                              onclick="openAllImagesModal()"
                            >
                              <i class="ri-image-line mr-1"></i>
                              <span data-i18n="showAllUploadedImages">Show All Uploaded Images</span>
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-${role === '班長' ? '6' : '5'} gap-3 mb-6">
                        <div class="bg-yellow-50 px-4 py-3 rounded-lg border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors" onclick="filterByStatus('pending')">
                            <h3 class="text-xs font-medium text-yellow-800" data-i18n="pending">Pending</h3>
                            <p class="text-xl font-bold text-yellow-900" id="pendingCount">0</p>
                            <p class="text-xs text-yellow-600" data-i18n="pendingApproval">Pending Hancho Approval</p>
                        </div>
                        <div class="bg-blue-50 px-4 py-3 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors" onclick="filterByStatus('hancho_approved')">
                            <h3 class="text-xs font-medium text-blue-800" data-i18n="hanchoApproved">Hancho Approved</h3>
                            <p class="text-xl font-bold text-blue-900" id="hanchoApprovedCount">0</p>
                            <p class="text-xs text-blue-600" data-i18n="waitingKacho">Waiting for Kacho Approval</p>
                        </div>
                        <div class="bg-green-50 px-4 py-3 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors" onclick="filterByStatus('fully_approved')">
                            <h3 class="text-xs font-medium text-green-800" data-i18n="fullyApproved">Fully Approved</h3>
                            <p class="text-xl font-bold text-green-900" id="fullyApprovedCount">0</p>
                            <p class="text-xs text-green-600" data-i18n="kachoApprovalComplete">Kacho Approval Complete</p>
                        </div>
                        <div class="bg-red-50 px-4 py-3 rounded-lg border border-red-200 cursor-pointer hover:bg-red-100 transition-colors" onclick="filterByStatus('correction_needed')">
                            <h3 class="text-xs font-medium text-red-800" data-i18n="correctionNeeded">Correction Needed</h3>
                            <p class="text-xl font-bold text-red-900" id="correctionCount">0</p>
                            <p class="text-xs text-red-600" data-i18n="needsCorrection">Needs Correction & Resubmission</p>
                        </div>
                        ${role === '班長' ? `
                        <div class="bg-orange-50 px-4 py-3 rounded-lg border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors" onclick="filterByStatus('correction_needed_from_kacho')">
                            <h3 class="text-xs font-medium text-orange-800" data-i18n="kachoRequest">Kacho Correction Request</h3>
                            <p class="text-xl font-bold text-orange-900" id="kachoRequestCount">0</p>
                            <p class="text-xs text-orange-600" data-i18n="hanchoAction">Hancho Action Required</p>
                        </div>
                        ` : ''}
                        <div class="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors" onclick="filterByStatus('today')">
                            <h3 class="text-xs font-medium text-gray-800" data-i18n="todayTotal">Today's Total</h3>
                            <p class="text-xl font-bold text-gray-900" id="totalCount">0</p>
                            <p class="text-xs text-gray-600" data-i18n="submittedToday">Submitted Today</p>
                        </div>
                    </div>

                    <!-- Controls -->
                    <div class="flex flex-wrap gap-4 mb-6">
                        <button id="refreshBtn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" data-i18n="dataUpdate">
                            🔄 データ更新
                        </button>
                        <select id="factoryFilter" class="p-2 border rounded">
                            <option value="" data-i18n="allFactories">All Factories</option>
                        </select>
                        <select id="statusFilter" class="p-2 border rounded">
                            <option value="" data-i18n="allStatus">All Status</option>
                            <option value="pending">保留中 (班長承認待ち)</option>
                            <option value="hancho_approved">班長承認済み (課長承認待ち)</option>
                            <option value="fully_approved">完全承認済み</option>
                            <option value="correction_needed">修正要求</option>
                            <option value="correction_needed_from_kacho">課長修正要求（班長対応）</option>
                        </select>
                        <input type="date" id="dateFilter" class="p-2 border rounded">
                        <input type="text" id="approvalSearchInput" placeholder="品番、背番号、作業者で検索..." class="p-2 border rounded flex-1 min-w-64">
                        <select id="itemsPerPageSelect" class="p-2 border rounded">
                            <option value="10">10件表示</option>
                            <option value="15">15件表示</option>
                            <option value="50">50件表示</option>
                            <option value="100">100件表示</option>
                        </select>
                    </div>

                    <!-- List View Controls (hidden by default) -->
                    <div id="listViewControls" class="hidden mb-6">
                        <div class="flex flex-wrap gap-4 items-center">
                            <button id="batchApproveBtn" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled data-i18n="batchApproveSelected">
                                Batch Approve Selected
                            </button>
                            <button id="batchRejectBtn" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled data-i18n="batchRejectSelected">
                                Batch Reject Selected
                            </button>
                            <div class="ml-auto">
                                <span id="selectedCount" class="text-sm text-gray-600">0 <span data-i18n="selected">selected</span></span>
                            </div>
                        </div>
                    </div>

                    <!-- Table Container (default view) -->
                    <div class="bg-white rounded-lg shadow border" id="approvalsTableContainer">
                        <div class="p-8 text-center text-gray-500">データを読み込み中...</div>
                    </div>

                    <!-- List Container (hidden by default) -->
                    <div id="approvalsListContainer" class="hidden">
                        <div class="p-8 text-center text-gray-500">データを読み込み中...</div>
                    </div>

                    <!-- Summary Report (for card view) -->
                    <div id="summaryReport" class="hidden mt-6 bg-gray-50 p-6 rounded-lg border">
                        <h3 class="text-lg font-semibold mb-4">Summary Report</h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="summaryStats">
                            <!-- Will be populated dynamically -->
                        </div>
                    </div>

                    <!-- Pagination -->
                    <div class="flex items-center justify-between mt-6 p-4 bg-gray-50 border rounded-lg" id="paginationContainer">
                        <div class="text-sm text-gray-700" id="pageInfo">0件中 0-0件を表示</div>
                        <div class="flex items-center space-x-2">
                            <button id="prevPageBtn" class="p-2 border rounded hover:bg-gray-50 bg-white shadow-sm" disabled>前へ</button>
                            <div id="pageNumbers" class="flex space-x-1"></div>
                            <button id="nextPageBtn" class="p-2 border rounded hover:bg-gray-50 bg-white shadow-sm" disabled>次へ</button>
                        </div>
                    </div>
                </div>

                <!-- Approval Modal -->
                <div id="approvalModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                            <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                                <h3 class="text-lg font-semibold">データ承認</h3>
                                <button onclick="closeApprovalModal()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                            </div>
                            <div id="approvalModalContent" class="p-6"></div>
                        </div>
                    </div>
                </div>

                <!-- Approval Images Modal -->
                <div id="approvalImagesModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
                  <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                      <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                        <div>
                          <h3 class="text-lg font-semibold">Uploaded Images</h3>
                          <p id="approvalImagesSubtitle" class="text-xs text-gray-500"></p>
                        </div>
                        <button onclick="closeApprovalImagesModal()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                      </div>
                      <div id="approvalImagesModalContent" class="p-6"></div>
                    </div>
                  </div>
                </div>
            `;
            initializeApprovalSystem();
            // Initialize view mode listener with persistence
            const savedViewMode = localStorage.getItem('approvalViewMode') || 'table';
            document.getElementById('viewModeSelect').value = savedViewMode;
            toggleViewMode(savedViewMode);
            
            document.getElementById('viewModeSelect').addEventListener('change', function() {
                const viewMode = this.value;
                localStorage.setItem('approvalViewMode', viewMode);
                toggleViewMode(viewMode);
            });
            if (typeof applyLanguageEnhanced === 'function') {
              applyLanguageEnhanced();
            } else if (typeof applyLanguage === 'function') {
              applyLanguage();
            }
            break;

          case "userManagement":
              if (!["admin", "部長", "課長"].includes(role)) {
                  mainContent.innerHTML = `<p class="text-red-600 font-semibold" data-i18n="accessDenied">Access Denied</p>`;
                  return;
              }
          
              mainContent.innerHTML = `
             <div class="max-w-6xl mx-auto bg-white p-6 rounded shadow space-y-6">
              <!-- Create User Button -->
              <div class="flex justify-end items-center">
                <button id="toggleCreateUserForm" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" data-i18n="createNewUser">Create New User</button>
              </div>

              <!-- Create User Form in Separate Card -->
              <div id="createUserFormWrapper" class="hidden">
                <div class="bg-gray-50 border border-gray-200 p-6 rounded shadow">
                  <form id="createUserForm" class="grid grid-cols-2 gap-4">
                    <input required data-i18n-placeholder="firstName" placeholder="First Name" id="firstName" class="border p-2 rounded" />
                    <input required data-i18n-placeholder="lastName" placeholder="Last Name" id="lastName" class="border p-2 rounded" />
                    <input required type="email" data-i18n-placeholder="email" placeholder="Email" id="email" class="border p-2 rounded" />
                    <input required data-i18n-placeholder="username" placeholder="Username" id="username" class="border p-2 rounded" />
                    <input required type="password" data-i18n-placeholder="password" placeholder="Password" id="password" class="border p-2 rounded" />
                    <select id="role" class="border p-2 rounded" required onchange="toggleFactorySelection()">
                      <option value="" data-i18n="selectRole">Select Role</option>
                      <option value="admin">admin</option>
                      <option value="部長">部長</option>
                      <option value="課長">課長</option>
                      <option value="係長">係長</option>
                      <option value="班長">班長</option>
                      <option value="member">member</option>
                    </select>
                    
                    <!-- Factory Selection (shown only for 班長 and 係長) -->
                    <div id="factorySelectionContainer" class="col-span-2 hidden">
                      <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="factorySelection">Factory Selection</label>
                      <div class="grid grid-cols-3 gap-2" id="factoryCheckboxes">
                        <!-- Will be populated with factory options -->
                      </div>
                      <input type="hidden" id="selectedFactories" name="factories" />
                    </div>
                    
                    <button type="submit" class="col-span-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" data-i18n="submit">
                      Submit
                    </button>
                  </form>
                </div>
              </div>

              <!-- Tab Navigation -->
              <div class="border-b border-gray-200 mb-4">
                <nav class="flex -mb-px">
                  <button id="adminMemberTab" class="px-6 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600" onclick="switchTab('admin')">
                    <span data-i18n="adminMember">Admin Member</span>
                  </button>
                  <button id="factoryMemberTab" class="px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300" onclick="switchTab('factory')">
                    <span data-i18n="factoryMember">Factory Member</span>
                  </button>
                </nav>
              </div>

              <!-- Admin Member Tab Content -->
              <div id="adminMemberContent">
                <div class="mb-4">
                  <input type="text" id="userSearchInput" data-i18n-placeholder="searchUsers" placeholder="Search users..." class="w-full border rounded px-4 py-2" />
                </div>
                <div id="userTableContainer" data-i18n="loadingUsers">Loading users...</div>
              </div>

              <!-- Factory Member Tab Content -->
              <div id="factoryMemberContent" class="hidden">
                <div class="mb-4 flex gap-4">
                  <input type="text" id="workerSearchInput" data-i18n-placeholder="searchWorkers" placeholder="Search workers..." class="flex-1 border rounded px-4 py-2" />
                  <button id="toggleCreateWorkerForm" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    <span data-i18n="createNewWorker">Create New Worker</span>
                  </button>
                </div>

                <!-- Create Worker Form (Initially Hidden) -->
                <div id="createWorkerFormWrapper" class="mb-4 hidden">
                  <div class="bg-white p-6 rounded-lg border">
                    <h3 class="text-lg font-semibold mb-4" data-i18n="createNewWorker">Create New Worker</h3>
                    <form id="createWorkerForm" class="grid grid-cols-2 gap-4">
                      <input type="text" name="Name" placeholder="Name" required class="border rounded px-3 py-2" />
                      <input type="text" name="ID number" placeholder="ID Number" class="border rounded px-3 py-2" />
                      
                      <!-- Department Selection -->
                      <div class="col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="departmentSelection">Department Selection</label>
                        <div class="selected-departments flex flex-wrap gap-1 mb-2" id="createWorkerDepartments"></div>
                        <select class="border p-2 rounded text-sm w-full" onchange="addDepartmentToNewWorker(this.value); this.value='';">
                          <option value="">Add Department</option>
                          <option value="第一工場">第一工場</option>
                          <option value="第二工場">第二工場</option>
                          <option value="肥田瀬">肥田瀬</option>
                          <option value="天徳">天徳</option>
                          <option value="倉知">倉知</option>
                          <option value="小瀬">小瀬</option>
                          <option value="SCNA">SCNA</option>
                          <option value="NFH">NFH</option>
                        </select>
                        <input type="hidden" id="newWorkerDepartments" name="部署" />
                      </div>

                      <input type="text" name="Picture" placeholder="Picture URL" class="col-span-2 border rounded px-3 py-2" />
                      
                      <button type="submit" class="col-span-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" data-i18n="submit">
                        Submit
                      </button>
                    </form>
                  </div>
                </div>

                <div id="workerTableContainer" data-i18n="loadingWorkers">Loading workers...</div>
              </div>
            </div>
            `;
          
            document.getElementById("toggleCreateUserForm").onclick = () => {
              document.getElementById("createUserFormWrapper").classList.toggle("hidden");
              // Load factory options when form is opened
              if (!document.getElementById("createUserFormWrapper").classList.contains("hidden")) {
                loadFactoryOptions();
              }
            };
            
            // Function to toggle factory selection based on role
            window.toggleFactorySelection = function() {
              const role = document.getElementById("role").value;
              const factoryContainer = document.getElementById("factorySelectionContainer");
              
              if (role === "班長" || role === "係長") {
                factoryContainer.classList.remove("hidden");
              } else {
                factoryContainer.classList.add("hidden");
                // Clear selected factories for non-factory roles
                document.getElementById("selectedFactories").value = "";
                updateFactoryDisplay();
              }
            };
            
            // Function to load factory options from masterDB
            async function loadFactoryOptions() {
              try {
                const response = await fetch(BASE_URL + "queries", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    dbName: "Sasaki_Coating_MasterDB",
                    collectionName: "masterDB",
                    query: {},
                    projection: { "工場": 1 }
                  })
                });
                
                if (response.ok) {
                  const data = await response.json();
                  const factories = [...new Set(data.map(item => item.工場).filter(Boolean))].sort();
                  renderFactoryCheckboxes(factories);
                }
              } catch (error) {
                console.error("Failed to load factory options:", error);
                // Fallback to default factories
                const defaultFactories = ["第一工場", "第二工場", "肥田瀬", "天徳", "倉知", "小瀬", "SCNA", "NFH"];
                renderFactoryCheckboxes(defaultFactories);
              }
            }
            
            // Function to render factory checkboxes
            function renderFactoryCheckboxes(factories) {
              const container = document.getElementById("factoryCheckboxes");
              container.innerHTML = factories.map(factory => `
                <label class="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                  <input type="checkbox" value="${factory}" onchange="updateSelectedFactories()" class="factory-checkbox">
                  <span class="text-sm">${factory}</span>
                </label>
              `).join('');
            }
            
            // Function to update selected factories
            window.updateSelectedFactories = function() {
              const checkboxes = document.querySelectorAll('.factory-checkbox:checked');
              const selectedFactories = Array.from(checkboxes).map(cb => cb.value);
              document.getElementById("selectedFactories").value = JSON.stringify(selectedFactories);
              updateFactoryDisplay();
            };
            
            // Function to update factory display
            function updateFactoryDisplay() {
              // This can be expanded to show selected factories if needed
            }
            
            document.getElementById("createUserForm").addEventListener("submit", async (e) => {
              e.preventDefault();
              const role = document.getElementById("role").value;
              const selectedFactoriesValue = document.getElementById("selectedFactories").value;
              
              // Validate factory selection for roles that require it
              if ((role === "班長" || role === "係長") && (!selectedFactoriesValue || selectedFactoriesValue === "[]")) {
                alert(`${role} role requires at least one factory assignment.`);
                return;
              }
              
              const body = {
                firstName: document.getElementById("firstName").value.trim(),
                lastName: document.getElementById("lastName").value.trim(),
                email: document.getElementById("email").value.trim(),
                username: document.getElementById("username").value.trim(),
                password: document.getElementById("password").value.trim(),
                role: role
              };
              
              // Add factory data for roles that need it
              if ((role === "班長" || role === "係長") && selectedFactoriesValue) {
                try {
                  body.factory = JSON.parse(selectedFactoriesValue);
                } catch (e) {
                  body.factory = [];
                }
              }
            
              try {
                const res = await fetch(BASE_URL + "createUser", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body)
                });
            
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Failed to create user");
                alert("User created successfully");
                e.target.reset();
                document.getElementById("createUserFormWrapper").classList.add("hidden");
                document.getElementById("factorySelectionContainer").classList.add("hidden");
                loadUserTable(); // refresh list
              } catch (err) {
                alert(err.message);
              }
            });
            
            // Toggle create worker form
            const toggleWorkerBtn = document.getElementById("toggleCreateWorkerForm");
            if (toggleWorkerBtn) {
              toggleWorkerBtn.onclick = () => {
                document.getElementById("createWorkerFormWrapper").classList.toggle("hidden");
                // Reset form when opening
                if (!document.getElementById("createWorkerFormWrapper").classList.contains("hidden")) {
                  newWorkerDepartments = [];
                  document.getElementById('createWorkerDepartments').innerHTML = '';
                  document.getElementById('newWorkerDepartments').value = '';
                }
              };
            }
            
            // Create worker form submission
            const createWorkerForm = document.getElementById("createWorkerForm");
            if (createWorkerForm) {
              createWorkerForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const workerData = {
                  Name: formData.get('Name').trim(),
                  "ID number": formData.get('ID number').trim(),
                  部署: formData.get('部署') || '',
                  Picture: formData.get('Picture').trim()
                };
                
                try {
                  const res = await fetch(BASE_URL + "createWorker", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(workerData)
                  });
                  
                  const result = await res.json();
                  
                  if (res.ok) {
                    alert("Worker created successfully!");
                    e.target.reset();
                    newWorkerDepartments = [];
                    document.getElementById('createWorkerDepartments').innerHTML = '';
                    document.getElementById("createWorkerFormWrapper").classList.add("hidden");
                    loadWorkerTable();
                  } else {
                    alert(result.error || "Failed to create worker");
                  }
                } catch (err) {
                  console.error("Error creating worker:", err);
                  alert("Error creating worker");
                }
              });
            }

            // Make allUsers global so userManagement.js can access it
            window.allUsers = [];
            let sortState = { column: null, direction: 1 };
            
            
            
            window.handleUserSort = function(col) {
              if (sortState.column === col) sortState.direction *= -1;
              else sortState = { column: col, direction: 1 };
              renderUserTable(allUsers);
            };
            
            window.updateUserRole = async (id, newRole) => {
              await fetch(BASE_URL + "updateUserRole", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: id, role: newRole })
              });
            };
            
            window.resetPassword = async (id) => {
              const newPass = prompt("Enter new password:");
              if (!newPass) return;
              await fetch(BASE_URL + "resetPassword", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: id, newPassword: newPass })
              });
              alert("Password reset");
            };
            
            window.editUser = (id) => {
              alert("Edit form coming soon (excluding password). Want it inline or in a modal?");
            };


            window.startEditingUser = (userId) => {
              // Enable all input fields
              document.querySelectorAll(`[user-id="${userId}"]`).forEach(el => el.disabled = false);
              
              // Get user role
              const roleSelect = document.querySelector(`select[user-id="${userId}"][data-role]`);
              const userRole = roleSelect ? roleSelect.value : null;
              
              // Handle factory editing interface
              const factoryDisplay = document.getElementById(`factoryDisplay-${userId}`);
              const factoryEdit = document.getElementById(`factoryEdit-${userId}`);
              
              if (userRole === "班長" || userRole === "係長") {
                // For 班長 and 係長: Hide display mode, show edit mode
                if (factoryDisplay) factoryDisplay.style.display = "none";
                if (factoryEdit) factoryEdit.classList.remove('hidden');
                
                // Ensure factory edit interface is properly populated
                refreshFactoryEditInterface(userId);
              } else {
                // For other roles: Keep display mode hidden, edit mode hidden
                if (factoryDisplay) factoryDisplay.style.display = "none";
                if (factoryEdit) factoryEdit.classList.add('hidden');
              }
            
              const actionsCell = document.getElementById(`actions-${userId}`);
              actionsCell.innerHTML = `
                <button class="text-green-600 hover:underline" onclick="saveUser('${userId}')">OK</button>
                <button class="ml-2 text-gray-600 hover:underline" onclick="cancelEdit('${userId}')">Cancel</button>
              `;
            };
            
            // Function to refresh the factory edit interface with current data
            function refreshFactoryEditInterface(userId) {
              const hiddenInput = document.querySelector(`input.factory-data[user-id="${userId}"]`);
              const selectedContainer = document.getElementById(`selectedFactories-${userId}`);
              
              if (!hiddenInput || !selectedContainer) return;
              
              let currentFactories = [];
              try {
                currentFactories = JSON.parse(hiddenInput.value || '[]');
              } catch (e) {
                currentFactories = [];
              }
              
              // Clear and repopulate the selected factories container
              selectedContainer.innerHTML = '';
              currentFactories.forEach(factory => {
                const tagHTML = `
                  <span class="factory-tag bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                    ${factory}
                    <button type="button" class="ml-1 text-blue-600 hover:text-blue-800" onclick="removeFactoryTag('${userId}', '${factory}')">×</button>
                  </span>
                `;
                selectedContainer.insertAdjacentHTML('beforeend', tagHTML);
              });
            }
            
            window.cancelEdit = (userId) => {
              loadUserTable(); // simply re-fetch and render again
            };
            
            // window.saveUser = async (userId) => {
            //   const inputs = document.querySelectorAll(`[user-id="${userId}"]`);
            //   const updated = {};
            //   inputs.forEach(el => {
            //     const field = el.dataset.field || (el.dataset.role ? "role" : null);
            //     if (field) updated[field] = el.value;
            //   });
            
            //   try {
            //     const res = await fetch(BASE_URL + "updateUser", {
            //       method: "POST",
            //       headers: { "Content-Type": "application/json" },
            //       body: JSON.stringify({ userId, ...updated })
            //     });
            
            //     const result = await res.json();
            //     if (!res.ok) throw new Error(result.error || "Failed to update user");
            
            //     alert("User updated");
            //     loadUserTable();
            //   } catch (err) {
            //     alert(err.message);
            //   }
            // };

            window.saveUser = async (userId) => {
              const inputs = document.querySelectorAll(`[user-id="${userId}"]`);
              const updated = {};
              inputs.forEach(el => {
                // Corrected line below
                const field = el.dataset.field || (el.hasAttribute('data-role') ? "role" : null);
                if (field) {
                  if (field === 'factory') {
                    // Handle factory data from hidden input - map 工場 to factory for backend
                    try {
                      updated['factory'] = JSON.parse(el.value || '[]');
                    } catch (e) {
                      updated['factory'] = [];
                    }
                  } else {
                    updated[field] = el.value;
                  }
                }
              });

              console.log('Sending user update:', { userId, ...updated }); // Debug log
            
              try {
                const res = await fetch(BASE_URL + "updateUser", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, ...updated }) // Spread updated properties
                });
            
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Failed to update user");
            
                alert("User updated");
                loadUserTable(); // Reloads the table to show updated data and reset edit states
              } catch (err) {
                console.error('Update error:', err);
                alert(err.message);
              }
            };

            window.deleteUser = async (id) => {
              if (!confirm("Are you sure you want to archive this user?")) return;
            
              try {
                const res = await fetch(BASE_URL + "queries", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    dbName: "Sasaki_Coating_MasterDB",
                    collectionName: "users",
                    query: { _id: id }, // Just send the raw string ID
                    delete: true,
                    username: currentUser.username
                  })
                });
            
                const result = await res.json();
                if (res.ok && result.deletedFromOriginal > 0) {
                  alert(`User archived successfully by ${currentUser.username}.`);
                  loadUserTable();
                } else {
                  alert("No user archived. Check if the user still exists.");
                }
              } catch (err) {
                console.error("Error archiving user:", err);
                alert("Error occurred during archive.");
              }
            };
            
            // User table management functions with factory support
            async function loadUserTable() {
              try {
                const res = await fetch(BASE_URL + "queries", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    dbName: "Sasaki_Coating_MasterDB",
                    collectionName: "users",
                    query: {},
                    projection: { password: 0 }
                  })
                });

                window.allUsers = await res.json();
                renderUserTable(window.allUsers);
              } catch (err) {
                console.error("Failed to load users:", err);
                document.getElementById("userTableContainer").innerHTML = `<p class="text-red-600">Failed to load users</p>`;
              }
            }

            function renderUserTable(users) {
              if (!["admin", "部長", "課長"].includes(currentUser.role)) {
                document.getElementById("userTableContainer").innerHTML = "";
                return;
              }

              const headers = ["firstName", "lastName", "email", "username", "role", "factory"];
              const tableHTML = `
                <table class="w-full text-sm border">
                  <thead class="bg-gray-100">
                    <tr>
                      ${headers.map(h => {
                        const sortIcon = userSortState.column === h 
                          ? (userSortState.direction === 1 ? ' ▲' : ' ▼') 
                          : '';
                        return `<th class="px-4 py-2 cursor-pointer hover:bg-gray-200" onclick="sortUsers('${h}')">${h.charAt(0).toUpperCase() + h.slice(1)}${sortIcon}</th>`;
                      }).join("")}
                      <th class='px-4 py-2'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${users.map(u => {
                      // Handle factory data - support both string and array formats
                      const userFactories = u.工場 || u.factory || [];
                      const factoryArray = Array.isArray(userFactories) ? userFactories : (userFactories ? [userFactories] : []);
                      const factoryDisplayText = factoryArray.length > 0 ? factoryArray.join(', ') : '-';
                      
                      return `
                        <tr class="border-t" id="userRow-${u._id}">
                          ${headers.map(h => `
                            <td class="px-4 py-2">
                              ${h === "role"
                                ? `<select class="border p-1 rounded" disabled data-role user-id="${u._id}" onchange="toggleEditFactoryField('${u._id}', this.value)">
                                    ${["admin", "部長", "課長", "係長", "班長", "member"].map(r => `
                                      <option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>
                                    `).join("")}
                                  </select>`
                                : h === "factory"
                                ? `<div class="factory-container" user-id="${u._id}">
                                    <div class="factory-tags-display" id="factoryDisplay-${u._id}" ${u.role !== "班長" && u.role !== "係長" ? "style='display:none'" : ""}>
                                      ${factoryArray.map(f => `<span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">${f}</span>`).join('')}
                                      ${factoryArray.length === 0 ? '<span class="text-gray-500 text-xs">工場未設定</span>' : ''}
                                    </div>
                                    <div class="factory-tags-edit hidden" id="factoryEdit-${u._id}">
                                      <div class="factory-tag-input-container">
                                        <div class="selected-factories flex flex-wrap gap-1 mb-2" id="selectedFactories-${u._id}">
                                          ${factoryArray.map(f => `
                                            <span class="factory-tag bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                                              ${f}
                                              <button type="button" class="ml-1 text-blue-600 hover:text-blue-800" onclick="removeFactoryTag('${u._id}', '${f}')">×</button>
                                            </span>
                                          `).join('')}
                                        </div>
                                        <select class="border p-1 rounded text-xs" onchange="addFactoryTag('${u._id}', this.value); this.value='';">
                                          <option value="">工場を追加</option>
                                          ${["第一工場", "第二工場", "肥田瀬", "天徳", "倉知", "小瀬", "SCNA", "NFH"].map(f => 
                                            `<option value="${f}">${f}</option>`
                                          ).join("")}
                                        </select>
                                      </div>
                                    </div>
                                    <input type="hidden" class="factory-data" data-field="factory" user-id="${u._id}" value='${JSON.stringify(factoryArray)}' />
                                    ${u.role !== "班長" && u.role !== "係長" ? `<span class="text-gray-500 factory-readonly">${factoryDisplayText}</span>` : ""}
                                  </div>`
                                : `<input class="border p-1 rounded w-full" value="${u[h] || ""}" disabled data-field="${h}" user-id="${u._id}" />`}
                            </td>
                          `).join("")}
                          <td class="px-4 py-2" id="actions-${u._id}">
                            <button class="text-blue-600 hover:underline" onclick="startEditingUser('${u._id}')" data-i18n="edit">Edit</button>
                            <button class="ml-2 text-yellow-600 hover:underline" onclick="resetPassword('${u._id}')" data-i18n="resetPassword">Reset Password</button>
                            <button class="ml-2 text-red-600 hover:underline" onclick="deleteUser('${u._id}')" data-i18n="delete">Delete</button>
                          </td>
                        </tr>`;
                    }).join("")}
                  </tbody>
                </table>
              `;

              document.getElementById("userTableContainer").innerHTML = tableHTML;
              
              // Apply translations to the newly rendered table
              if (typeof translateDynamicContent === 'function') {
                translateDynamicContent(document.getElementById("userTableContainer"));
              }
            }

            // Factory tag management functions
            window.addFactoryTag = function(userId, factory) {
              if (!factory) return;
              
              const hiddenInput = document.querySelector(`input.factory-data[user-id="${userId}"]`);
              const selectedContainer = document.getElementById(`selectedFactories-${userId}`);
              
              if (!hiddenInput || !selectedContainer) return;
              
              let currentFactories = [];
              try {
                currentFactories = JSON.parse(hiddenInput.value || '[]');
              } catch (e) {
                currentFactories = [];
              }
              
              // Don't add if already exists
              if (currentFactories.includes(factory)) return;
              
              currentFactories.push(factory);
              hiddenInput.value = JSON.stringify(currentFactories);
              
              // Add visual tag
              const tagHTML = `
                <span class="factory-tag bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                  ${factory}
                  <button type="button" class="ml-1 text-blue-600 hover:text-blue-800" onclick="removeFactoryTag('${userId}', '${factory}')">×</button>
                </span>
              `;
              selectedContainer.insertAdjacentHTML('beforeend', tagHTML);
            };

            window.removeFactoryTag = function(userId, factory) {
              const hiddenInput = document.querySelector(`input.factory-data[user-id="${userId}"]`);
              
              if (!hiddenInput) return;
              
              let currentFactories = [];
              try {
                currentFactories = JSON.parse(hiddenInput.value || '[]');
              } catch (e) {
                currentFactories = [];
              }
              
              currentFactories = currentFactories.filter(f => f !== factory);
              hiddenInput.value = JSON.stringify(currentFactories);
              
              // Remove visual tag
              const tagElements = document.querySelectorAll(`#selectedFactories-${userId} .factory-tag`);
              tagElements.forEach(tag => {
                if (tag.textContent.trim().startsWith(factory)) {
                  tag.remove();
                }
              });
            };

            // Updated factory field toggle function for editing users
            window.toggleEditFactoryField = function(userId, role) {
              const factoryDisplay = document.getElementById(`factoryDisplay-${userId}`);
              const factoryEdit = document.getElementById(`factoryEdit-${userId}`);
              const factoryReadonly = document.querySelector(`tr#userRow-${userId} .factory-readonly`);
              
              // Check if we're in edit mode
              const actionsCell = document.getElementById(`actions-${userId}`);
              const isInEditMode = actionsCell && actionsCell.innerHTML.includes('OK');
              
              if (role === "班長" || role === "係長") {
                if (isInEditMode) {
                  // In edit mode: hide display, show edit interface
                  if (factoryDisplay) factoryDisplay.style.display = "none";
                  if (factoryEdit) factoryEdit.classList.remove('hidden');
                } else {
                  // In view mode: show display, hide edit interface
                  if (factoryDisplay) factoryDisplay.style.display = "block";
                  if (factoryEdit) factoryEdit.classList.add('hidden');
                }
                if (factoryReadonly) factoryReadonly.style.display = "none";
              } else {
                // For roles without factory access: always hide factory interfaces, show readonly text
                if (factoryDisplay) factoryDisplay.style.display = "none";
                if (factoryEdit) factoryEdit.classList.add('hidden');
                if (factoryReadonly) factoryReadonly.style.display = "inline";
              }
            };
            
            loadUserTable();
            updateTabVisibility();
            
            // Restore last active tab and load data accordingly
            setTimeout(() => {
              const savedTab = localStorage.getItem('userManagementTab') || 'admin';
              console.log('💾 Saved tab from localStorage:', savedTab);
              if (savedTab === 'factory') {
                console.log('🔄 Restoring factory tab...');
                switchTab('factory');
              } else {
                console.log('📍 Staying on admin tab');
              }
            }, 200);
            
            // Initialize search inputs
            setTimeout(() => {
              const userSearchInput = document.getElementById('userSearchInput');
              if (userSearchInput) {
                userSearchInput.addEventListener('input', searchUsers);
              }
              
              const workerSearchInput = document.getElementById('workerSearchInput');
              if (workerSearchInput) {
                workerSearchInput.addEventListener('input', searchWorkers);
              }
            }, 100);
          
          if (typeof applyLanguageEnhanced === 'function') {
            applyLanguageEnhanced();
          } else if (typeof applyLanguage === 'function') {
            applyLanguage();
          }
              break;

        case "customerManagement":
          if (role !== "admin") {
            mainContent.innerHTML = `<p class="text-red-600 font-semibold" data-i18n="accessDenied">Access Denied</p>`;
            return;
          }

          mainContent.innerHTML = `
            <div class="max-w-6xl mx-auto bg-white p-6 rounded shadow">
              <h1 class="text-2xl font-semibold mb-6" data-i18n="masterUserAdminPanel">Master User Admin Panel</h1>
              <input type="text" id="customerSearchInput" data-i18n-placeholder="searchByUsernameCompanyEmail" placeholder="Search by username, company, or email..." class="w-full p-2 border mb-4 rounded" />

              <form id="createMasterUserForm" class="bg-white p-6 rounded shadow-md mb-6">
                <h2 class="text-xl font-semibold mb-4" data-i18n="createMasterUser">Create Master User</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input id="masterUsername" data-i18n-placeholder="username" placeholder="Username" class="p-2 border rounded" />
                  <input type="password" id="masterPassword" data-i18n-placeholder="password" placeholder="Password" class="p-2 border rounded" />
                  <input id="masterCompany" data-i18n-placeholder="companyName" placeholder="Company Name" class="p-2 border rounded" />
                  <input type="email" id="masterEmail" data-i18n-placeholder="email" placeholder="Email" class="p-2 border rounded" />
                  <input type="date" id="masterValidUntil" class="p-2 border rounded" />
                  <input id="masterDbName" data-i18n-placeholder="databaseName" placeholder="Database Name" class="p-2 border rounded" />
                </div>
                <h3 class="text-md font-semibold mt-4 mb-2" data-i18n="devicesOptional">Devices (optional)</h3>
                <div id="deviceListCreate" class="mb-4"></div>
                <button type="button" onclick="addDeviceRow(document.getElementById('deviceListCreate'))" class="text-blue-600 text-sm mb-4" data-i18n="addDevice">+ Add Device</button>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded w-full" data-i18n="createMasterUser">Create Master User</button>
              </form>

              <table class="w-full text-sm border">
                <thead class="bg-gray-200">
                  <tr>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('username')" data-i18n="username">Username</th>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('company')" data-i18n="companyName">Company</th>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('email')" data-i18n="email">Email</th>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('validUntil')" data-i18n="validUntil">Valid Until</th>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('dbName')" data-i18n="database">Database</th>
                    <th class="px-3 py-2" data-i18n="devices">Devices</th>
                    <th class="px-3 py-2" data-i18n="actions">Actions</th>
                  </tr>
                </thead>
                <tbody id="masterUsersTable"></tbody>
              </table>
            </div>

            <!-- Edit Modal -->
            <div id="editModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
              <div class="bg-white p-6 rounded shadow max-w-2xl w-full">
                <h2 class="text-lg font-semibold mb-4">Edit Master User</h2>
                <form id="editMasterUserForm" class="grid gap-4">
                  <input hidden id="editId" />
                  <input id="editCompany" placeholder="Company Name" class="border p-2 rounded" />
                  <input type="email" id="editEmail" placeholder="Email" class="border p-2 rounded" />
                  <input type="date" id="editValidUntil" class="border p-2 rounded" />
                  <input id="editDbName" placeholder="Database Name" class="border p-2 rounded" />

                  <h3 class="text-md font-semibold mt-2">Devices</h3>
                  <div id="deviceListContainer"></div>
                  <button type="button" onclick="addDeviceRow(document.getElementById('deviceListContainer'))" class="text-blue-600 text-sm">+ Add Device</button>

                  <div class="flex justify-end gap-2">
                    <button type="button" onclick="closeEditModal()" class="bg-gray-300 px-3 py-1 rounded">Cancel</button>
                    <button type="submit" class="bg-green-600 text-white px-3 py-1 rounded">Save</button>
                  </div>
                </form>
              </div>
            </div>
          `;

          // Master User Management JavaScript functionality
          const masterUserURL = "https://kurachi.onrender.com";
          let masterUsers = [];
          let masterUserSortKey = "";
          let masterUserSortDirection = 1;

          function generateUniqueID() {
            return Math.random().toString(36).substring(2, 8).toUpperCase();
          }

          window.addDeviceRow = function(container, device = {}) {
            const id = device.uniqueId || generateUniqueID();
            const div = document.createElement("div");
            div.className = "device-row grid grid-cols-1 md:grid-cols-3 gap-2 mb-2 items-center";
            div.innerHTML = `
              <input placeholder="Device Name" class="device-name border p-2 rounded" value="${device.name || ""}" />
              <input placeholder="Unique ID" class="device-uid border p-2 rounded" value="${id}" readonly />
              <div class="flex gap-2">
                <input placeholder="Brand" class="device-brand border p-2 rounded w-full" value="${device.brand || ""}" />
                <button class="bg-red-500 text-white px-2 rounded" onclick="this.closest('.device-row').remove()">&times;</button>
              </div>`;
            container.appendChild(div);
          };

          async function fetchMasterUsers() {
            try {
              const res = await fetch(`${masterUserURL}/masterUsers`);
              masterUsers = await res.json();
              renderMasterUserTable();
            } catch (err) {
              console.error("Failed to fetch master users:", err);
            }
          }

          function renderMasterUserTable() {
            const search = document.getElementById("customerSearchInput").value.toLowerCase();
            let filtered = masterUsers.filter(u =>
              u.username.toLowerCase().includes(search) ||
              u.company.toLowerCase().includes(search) ||
              u.email.toLowerCase().includes(search)
            );

            if (masterUserSortKey) {
              filtered.sort((a, b) => {
                const aVal = (a[masterUserSortKey] || "").toLowerCase?.() ?? "";
                const bVal = (b[masterUserSortKey] || "").toLowerCase?.() ?? "";
                return (aVal > bVal ? 1 : -1) * masterUserSortDirection;
              });
            }

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const tbody = document.getElementById("masterUsersTable");
            tbody.innerHTML = filtered.map(u => {
              const validDate = new Date(u.validUntil);
              const isExpiring =
                validDate.getMonth() === currentMonth &&
                validDate.getFullYear() === currentYear;

              const rowClass = isExpiring ? "bg-yellow-100 text-red-600 font-semibold" : "";

              return `
                <tr class="border-t ${rowClass}">
                  <td class="px-3 py-2">${u.username}</td>
                  <td class="px-3 py-2">${u.company}</td>
                  <td class="px-3 py-2">${u.email}</td>
                  <td class="px-3 py-2">${u.validUntil?.split("T")[0]}</td>
                  <td class="px-3 py-2">${u.dbName}</td>
                  <td class="px-3 py-2">${(u.devices || []).length}</td>
                  <td class="px-3 py-2">
                    <button class="text-blue-600 mr-2" onclick='openEditModal(${JSON.stringify(u)})' data-i18n="edit">Edit</button>
                    <button class="text-red-600" onclick='deleteMasterUser("${u._id}")' data-i18n="delete">Delete</button>
                  </td>
                </tr>
              `;
            }).join("");
            
            // Apply translations to the newly rendered table
            if (typeof translateDynamicContent === 'function') {
              translateDynamicContent(tbody);
            }
          }

          window.openEditModal = function(user) {
            document.getElementById("editId").value = user._id;
            document.getElementById("editCompany").value = user.company;
            document.getElementById("editEmail").value = user.email;
            document.getElementById("editValidUntil").value = user.validUntil?.split("T")[0];
            document.getElementById("editDbName").value = user.dbName;
            const container = document.getElementById("deviceListContainer");
            container.innerHTML = "";
            (user.devices || []).forEach(d => addDeviceRow(container, d));
            document.getElementById("editModal").classList.remove("hidden");
            document.getElementById("editModal").classList.add("flex");
          };

          window.closeEditModal = function() {
            document.getElementById("editModal").classList.add("hidden");
            document.getElementById("editModal").classList.remove("flex");
          };

          window.sortMasterUserTable = function(key) {
            masterUserSortKey = key;
            masterUserSortDirection *= -1;
            renderMasterUserTable();
          };

          window.deleteMasterUser = async function(id) {
            if (!confirm("Are you sure?")) return;
            try {
              const res = await fetch(`${masterUserURL}/deleteMasterUser`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
              });
              if (res.ok) {
                alert("Deleted");
                fetchMasterUsers();
              }
            } catch (err) {
              console.error("Failed to delete master user:", err);
            }
          };

          // Form submission handlers
          document.getElementById("editMasterUserForm").onsubmit = async (e) => {
            e.preventDefault();
            const container = document.getElementById("deviceListContainer");
            const devices = Array.from(container.querySelectorAll(".device-row")).map(row => ({
              name: row.querySelector(".device-name").value.trim(),
              uniqueId: row.querySelector(".device-uid").value.trim(),
              brand: row.querySelector(".device-brand").value.trim()
            }));
            const ids = devices.map(d => d.uniqueId);
            if (new Set(ids).size !== ids.length) return alert("Duplicate device uniqueID found.");
            
            const body = {
              id: document.getElementById("editId").value,
              company: document.getElementById("editCompany").value,
              email: document.getElementById("editEmail").value,
              validUntil: document.getElementById("editValidUntil").value,
              dbName: document.getElementById("editDbName").value,
              devices
            };
            
            try {
              const res = await fetch(`${masterUserURL}/updateMasterUser`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
              });
              if (res.ok) {
                alert("Updated");
                closeEditModal();
                fetchMasterUsers();
              }
            } catch (err) {
              console.error("Failed to update master user:", err);
            }
          };

          document.getElementById("createMasterUserForm").onsubmit = async (e) => {
            e.preventDefault();
            const devices = Array.from(document.getElementById("deviceListCreate").querySelectorAll(".device-row")).map(row => ({
              name: row.querySelector(".device-name").value.trim(),
              uniqueId: row.querySelector(".device-uid").value.trim(),
              brand: row.querySelector(".device-brand").value.trim()
            }));
            const ids = devices.map(d => d.uniqueId);
            if (new Set(ids).size !== ids.length) return alert("Duplicate device uniqueID found.");
            
            const body = {
              username: document.getElementById("masterUsername").value,
              password: document.getElementById("masterPassword").value,
              company: document.getElementById("masterCompany").value,
              email: document.getElementById("masterEmail").value,
              validUntil: document.getElementById("masterValidUntil").value,
              dbName: document.getElementById("masterDbName").value,
              devices
            };
            
            try {
              const res = await fetch(`${masterUserURL}/createMasterUser`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
              });
              if (res.ok) {
                alert("Master user created");
                e.target.reset();
                document.getElementById("deviceListCreate").innerHTML = "";
                fetchMasterUsers();
              }
            } catch (err) {
              console.error("Failed to create master user:", err);
            }
          };

          document.getElementById("customerSearchInput").addEventListener("input", renderMasterUserTable);
          fetchMasterUsers();
          if (typeof applyLanguageEnhanced === 'function') {
            applyLanguageEnhanced();
          } else if (typeof applyLanguage === 'function') {
            applyLanguage();
          }
          break;

        case "factories":
          mainContent.innerHTML = `
              <div class="bg-white p-6 rounded-xl shadow mb-6">
                  <h2 class="text-2xl font-semibold mb-4" data-i18n="factoryListTitle">Factory List</h2>
                  <div id="factoryList" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
              </div>
          `;
          renderFactoryList();
          if (typeof applyLanguageEnhanced === 'function') {
            applyLanguageEnhanced();
          } else if (typeof applyLanguage === 'function') {
            applyLanguage();
          }
          break;

        case "factoryStatus":
          mainContent.innerHTML = `
            <div class="space-y-6">
              <!-- Header Section -->
              <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 class="text-3xl font-bold text-gray-900 dark:text-white" data-i18n="factoryStatus">Factory Status</h2>
                  <p class="mt-2 text-gray-600 dark:text-gray-400" data-i18n="factoryStatusSubtitle">Real-time factory production progress</p>
                </div>
              </div>

              <!-- Filters Section -->
              <div class="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="factory">Factory</label>
                    <select id="factoryStatusFactory" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                      <option value="all">All Factories</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="date">Date</label>
                    <input type="date" id="factoryStatusDate" value="${new Date().toISOString().split('T')[0]}" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  </div>
                  <div>
                    <div id="factoryStatusLoader" class="hidden flex items-center justify-center h-full">
                      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Chart Section -->
              <div class="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div class="mb-4 flex items-center justify-between">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white" data-i18n="productionProgress">Production Progress</h3>
                  <div class="flex items-center gap-4 text-sm">
                    <div class="flex items-center gap-2">
                      <div class="w-4 h-4 bg-blue-400 rounded"></div>
                      <span class="text-gray-600 dark:text-gray-400">Current Production</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="w-4 h-1 bg-red-500"></div>
                      <span class="text-gray-600 dark:text-gray-400">Goal</span>
                    </div>
                  </div>
                </div>
                <div id="factoryStatusChart" class="w-full" style="height: 500px;"></div>
              </div>

              <!-- Info Section -->
              <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <i class="ri-information-line text-blue-600 dark:text-blue-400 text-xl flex-shrink-0 mt-0.5"></i>
                  <div class="text-sm text-blue-800 dark:text-blue-300">
                    <p class="font-medium mb-1">Auto-refresh enabled</p>
                    <p>This graph automatically updates every 60 seconds to show real-time production progress.</p>
                  </div>
                </div>
              </div>
            </div>
          `;
          // Initialize factory status
          if (typeof initializeFactoryStatus === 'function') {
            setTimeout(() => initializeFactoryStatus(), 100);
          }
          if (typeof applyLanguageEnhanced === 'function') {
            applyLanguageEnhanced();
          } else if (typeof applyLanguage === 'function') {
            applyLanguage();
          }
          break;

        case "planner":
          mainContent.innerHTML = `
            <div class="space-y-6">
              <!-- Header Section -->
              <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 class="text-3xl font-bold text-gray-900 dark:text-white" data-i18n="productionPlanning">Production Planning</h2>
                  <p class="mt-2 text-gray-600 dark:text-gray-400" data-i18n="productionPlanningSubtitle">Plan and schedule production for equipment</p>
                </div>
                <div class="flex items-center space-x-4">
                  <button onclick="showBreakTimeModal()" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                    <i class="ri-time-line mr-2"></i><span data-i18n="breakTimes">Break Times</span>
                  </button>
                  <button onclick="openCalendarView()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    <i class="ri-calendar-line mr-2"></i><span data-i18n="viewCalendar">View Calendar</span>
                  </button>
                </div>
              </div>

              <!-- Factory & Date Selection -->
              <div class="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="factory">Factory</label>
                    <select id="plannerFactory" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                      <option value="" data-i18n="selectFactory">-- Select Factory --</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="planDate">Plan Date</label>
                    <input type="date" id="plannerDate" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="endDateOptional">End Date (Optional)</label>
                    <input type="date" id="plannerEndDate" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  </div>
                  <div>
                    <div id="plannerLoader" class="hidden">
                      <div class="flex items-center justify-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Main Tabs: Production Goals & Planning -->
              <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <!-- Tab Navigation -->
                <div class="border-b border-gray-200 dark:border-gray-700">
                  <nav class="flex -mb-px">
                    <button class="planner-main-tab-btn px-6 py-4 text-base font-medium border-b-2 border-blue-500 text-blue-600" data-main-tab="goals">
                      <i class="ri-target-line mr-2"></i><span>Production Goals</span>
                    </button>
                    <button class="planner-main-tab-btn px-6 py-4 text-base font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" data-main-tab="planning">
                      <i class="ri-calendar-schedule-line mr-2"></i><span>Planning</span>
                    </button>
                  </nav>
                </div>

                <!-- Tab Content -->
                <div class="p-6">
                  <!-- Production Goals Tab Content -->
                  <div id="planner-goals-tab" class="planner-main-tab-content">
                    <div class="mb-4 flex flex-col sm:flex-row gap-3">
                      <button onclick="triggerGoalCsvUpload()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                        <i class="ri-upload-2-line mr-2"></i><span data-i18n="uploadCSV">Upload CSV</span>
                      </button>
                      <button onclick="showManualGoalInput()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center">
                        <i class="ri-add-line mr-2"></i><span data-i18n="manualInput">Manual Input</span>
                      </button>
                      <button onclick="showSmartSchedulingModal()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center">
                        <i class="ri-magic-line mr-2"></i><span data-i18n="smartScheduling">Smart Scheduling</span>
                      </button>
                      <button onclick="openBulkEditGoalsModal()" class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center">
                        <i class="ri-edit-line mr-2"></i><span>Edit Goals</span>
                      </button>
                      <div class="flex-1 flex gap-2">
                        <input type="text" id="goalSearch" 
                               class="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" 
                               data-i18n-placeholder="searchGoals" placeholder="Search goals...">
                      </div>
                    </div>
                    <input type="file" id="goalCsvFileInput" accept=".csv" style="display: none;" onchange="handleGoalCsvUpload(this)">
                    
                    <!-- Goals List View -->
                    <div id="goalListContainer" class="space-y-2">
                      <div class="text-center py-12 text-gray-500">
                        <i class="ri-target-line text-5xl mb-3"></i>
                        <p class="text-lg" data-i18n="setGoalsFirst">Please set production goals first</p>
                      </div>
                    </div>
                  </div>

                  <!-- Planning Tab Content -->
                  <div id="planner-planning-tab" class="planner-main-tab-content hidden">
                    <!-- Selected Products Summary -->
                    <div class="mb-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600 p-3">
                      <div class="flex items-center justify-between gap-2 mb-2">
                        <h3 class="font-medium text-sm text-gray-900 dark:text-white" data-i18n="selectedProducts">Selected Products</h3>
                        <div class="flex items-center gap-2 flex-1 justify-end">
                          <button onclick="showPrintModal()" 
                                  class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5">
                            <i class="ri-printer-line"></i>
                            <span>Print</span>
                          </button>
                          <div class="relative flex-1 max-w-xs">
                            <input type="text" 
                                   id="selectedProductsSearch" 
                                   placeholder="Search by 背番号 or 品番..." 
                                   class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                   oninput="filterSelectedProducts(this.value)">
                            <i class="ri-search-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                          </div>
                        </div>
                      </div>
                      <div id="selectedProductsSummary">
                        <div class="text-center py-2 text-gray-500 text-sm">
                          <p data-i18n="noProductsSelected">No products selected</p>
                        </div>
                      </div>
                    </div>

                    <!-- View Tabs (Timeline/Kanban/Table) -->
                    <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <nav class="flex -mb-px mb-4">
                        <button class="planner-tab-btn px-6 py-2 text-sm font-medium border-b-2 border-blue-500 text-blue-600" data-tab="timeline">
                          <i class="ri-time-line mr-2"></i><span data-i18n="timelineView">Timeline</span>
                        </button>
                        <button class="planner-tab-btn px-6 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" data-tab="kanban">
                          <i class="ri-layout-column-line mr-2"></i><span data-i18n="kanbanView">Kanban</span>
                        </button>
                        <button class="planner-tab-btn px-6 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" data-tab="table">
                          <i class="ri-table-line mr-2"></i><span data-i18n="tableView">Table</span>
                        </button>
                      </nav>

                      <!-- Timeline View -->
                      <div id="planner-timeline-view" class="planner-view" style="min-height: 500px;">
                        <div id="timelineContainer">
                          <div class="text-center py-12 text-gray-500">
                            <i class="ri-calendar-line text-5xl mb-3"></i>
                            <p class="text-lg" data-i18n="selectFactoryFirst">Please select a factory first</p>
                          </div>
                        </div>
                      </div>

                      <!-- Kanban View -->
                      <div id="planner-kanban-view" class="planner-view hidden" style="min-height: 500px;">
                        <div id="kanbanContainer">
                          <div class="text-center py-12 text-gray-500">
                            <i class="ri-layout-column-line text-5xl mb-3"></i>
                            <p class="text-lg" data-i18n="selectFactoryFirst">Please select a factory first</p>
                          </div>
                        </div>
                      </div>

                      <!-- Table View -->
                      <div id="planner-table-view" class="planner-view hidden" style="min-height: 500px;">
                        <div id="tableContainer">
                          <div class="text-center py-12 text-gray-500">
                            <i class="ri-table-line text-5xl mb-3"></i>
                            <p class="text-lg" data-i18n="noProductsInPlan">No products in the plan</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Work Hours Info -->
              <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div class="flex items-center text-blue-800 dark:text-blue-300">
                  <i class="ri-information-line text-xl mr-3"></i>
                  <div class="text-sm">
                    <p><strong data-i18n="workHours">Work Hours:</strong> 8:45 AM - 8:00 PM</p>
                    <p class="mt-1"><span data-i18n="defaultCycleTimeInfo">Default cycle time: 22.5 seconds per piece (if not specified in masterDB)</span></p>
                  </div>
                </div>
              </div>
            </div>
          `;
          
          // Initialize the planner
          if (typeof initializePlanner === 'function') {
            initializePlanner();
          }
          
          // Load products and goals if factory is already selected (from localStorage)
          setTimeout(() => {
            if (typeof plannerState !== 'undefined' && plannerState.currentFactory) {
              console.log('🔄 Loading data for pre-selected factory:', plannerState.currentFactory);
              
              // Load products first, then goals
              (async () => {
                if (typeof loadProductsForFactory === 'function') {
                  await loadProductsForFactory(plannerState.currentFactory);
                }
                if (typeof loadGoals === 'function') {
                  await loadGoals();
                }
                if (typeof renderGoalList === 'function') {
                  renderGoalList();
                }
              })();
            }
          }, 500); // Small delay to ensure DOM is ready
          
          if (typeof applyLanguageEnhanced === 'function') {
            applyLanguageEnhanced();
          } else if (typeof applyLanguage === 'function') {
            applyLanguage();
          }
          break;

        case "masterDB":
          mainContent.innerHTML = `
            <!-- Header Section -->
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-semibold text-gray-800" data-i18n="masterProductManagement">Master Product Management</h2>
              <div class="flex items-center space-x-3">
                <button id="addNewRecordBtn" class="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm">
                  <i class="ri-add-line mr-1"></i><span data-i18n="addNewRecord">Add New Record</span>
                </button>
                <button id="refreshMasterBtn" class="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                  <i class="ri-refresh-line mr-1"></i><span data-i18n="refresh">Refresh</span>
                </button>
              </div>
            </div>

            <!-- Tab Navigation -->
            <div class="bg-white rounded-lg shadow-sm border mb-6">
              <div class="border-b border-gray-200">
                <nav class="flex space-x-8 px-6" aria-label="Tabs">
                  <button id="masterDBTab" class="master-tab-btn py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm whitespace-nowrap" onclick="switchMasterTab('masterDB')">
                    内装品 DB
                  </button>
                  <button id="materialDBTab" class="master-tab-btn py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap" onclick="switchMasterTab('materialDB')">
                    材料 DB
                  </button>
                  <button id="productPDFsTab" class="master-tab-btn py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap" onclick="switchMasterTab('productPDFs')">
                    梱包 / 検査基準 / 3点照合
                  </button>
                  <button id="furyoKanriTab" class="master-tab-btn py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap" onclick="switchMasterTab('furyoKanri')">
                    不良管理
                  </button>
                </nav>
              </div>
            </div>

            <div id="masterNormalContentWrapper">
            <!-- CSV Upload Section -->
            <div class="bg-white p-4 rounded-lg shadow-sm mb-4 border">
              <div class="flex items-center space-x-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="csvFile">CSVファイル</label>
                  <input type="file" id="csvUploadInput" accept=".csv" class="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:font-medium" />
                </div>
                <button class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium mt-6" onclick="handleMasterCSVUpload()">
                  <i class="ri-upload-line mr-2"></i><span data-i18n="uploadPreview">アップロード & プレビュー</span>
                </button>
              </div>
              <div id="csvPreviewContainer" class="mt-4"></div>
            </div>

            <!-- Filters Section -->
            <div class="bg-white p-6 rounded-lg shadow-sm mb-6 border">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Factory / 工程</label>
                  <select id="filterFactory" class="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="" data-i18n="all">All</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="rl">R/L</label>
                  <select id="filterRL" class="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="" data-i18n="all">All</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="color">Color</label>
                  <select id="filterColor" class="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="" data-i18n="all">All</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Equipment / 材料</label>
                  <select id="filterProcess" class="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="" data-i18n="all">All</option>
                  </select>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                    <span data-i18n="search">Search</span>
                    <div class="flex items-center gap-3">
                      <select id="searchLogicMode" onchange="applyMasterFilters()" class="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500">
                        <option value="OR" data-i18n="matchAnyTag">Match ANY tag (OR)</option>
                        <option value="AND" data-i18n="matchAllTags">Match ALL tags (AND)</option>
                      </select>
                      <button id="clearSearchTagsBtn" onclick="clearAllMasterSearchTags()" class="hidden text-xs text-red-600 hover:text-red-800 font-medium">
                        <span data-i18n="clearAllTags">Clear all tags</span>
                      </button>
                    </div>
                  </label>
                  <div id="masterSearchTags" class="min-h-[3rem] border border-gray-300 rounded-lg p-2 bg-white cursor-text flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500" onclick="focusMasterSearchInput()">
                    <input type="text" id="masterSearchInput" class="flex-1 min-w-[200px] outline-none text-base" data-i18n-placeholder="searchPlaceholderMaster" placeholder="Search... (press Enter to add tags)" onkeydown="handleMasterSearchKeydown(event)" onblur="handleMasterSearchBlur(event)" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Advanced Filters Section -->
            <div class="bg-white rounded-lg shadow-sm mb-6 border">
              <!-- Collapsible Header -->
              <button id="masterAdvancedFiltersToggle" onclick="toggleMasterAdvancedFilters()" class="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                <div class="flex items-center">
                  <i class="ri-filter-3-line text-blue-600 text-xl mr-3"></i>
                  <span class="font-medium text-gray-900" data-i18n="advancedFilters">Advanced Filters</span>
                  <span id="masterActiveFiltersCount" class="ml-3 px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold hidden">0</span>
                </div>
                <i id="masterAdvancedFiltersIcon" class="ri-arrow-down-s-line text-gray-400 text-2xl transform transition-transform"></i>
              </button>

              <!-- Expandable Content -->
              <div id="masterAdvancedFiltersContent" class="hidden border-t border-gray-200">
                <div class="p-6">
                  <!-- Dynamic Filter Rows Container -->
                  <div id="masterFilterRowsContainer" class="space-y-3 mb-4">
                    <!-- Filter rows will be added here dynamically -->
                  </div>

                  <!-- Add Filter Button -->
                  <button onclick="addMasterFilterRow()" class="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center">
                    <i class="ri-add-line mr-1"></i>
                    <span data-i18n="addFilter">Add Filter</span>
                  </button>

                  <!-- Active Filters Display -->
                  <div id="masterActiveFiltersDisplay" class="hidden mt-4 pt-4 border-t border-gray-200">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-medium text-gray-600" data-i18n="activeFilters">Active Filters:</span>
                      <button onclick="clearAllMasterFilters()" class="text-xs text-red-600 hover:text-red-700 font-medium">
                        <i class="ri-close-circle-line"></i> <span data-i18n="clearAllFilters">Clear All</span>
                      </button>
                    </div>
                    <div id="masterActiveFilterBadges" class="flex flex-wrap gap-2">
                      <!-- Active filter badges will appear here -->
                    </div>
                  </div>

                  <!-- Apply Filters Button -->
                  <div class="mt-6 pt-6 border-t border-gray-200">
                    <button onclick="applyMasterAdvancedFilters()" class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center">
                      <i class="ri-filter-line mr-2"></i>
                      Apply Filters
                    </button>
                  </div>

                  <!-- Batch Edit Button (shown when filters are applied) -->
                  <div id="masterBatchEditButtonContainer" class="hidden mt-3">
                    <button onclick="openMasterBatchEditModal()" class="w-full bg-amber-600 text-white py-3 px-6 rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center justify-center">
                      <i class="ri-edit-box-line mr-2"></i>
                      <span data-i18n="batchEdit">Batch Edit</span> (<span id="masterBatchEditCount">0</span> <span data-i18n="records">records</span>)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Batch Edit Modal -->
            <div id="masterBatchEditModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div class="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
                <!-- Modal Header -->
                <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-green-50">
                  <div>
                    <h3 class="text-xl font-bold text-gray-900" data-i18n="batchEditRecords">Batch Edit Master Records</h3>
                    <p class="text-sm text-gray-600 mt-1"><span data-i18n="editing">Editing</span> <span id="batchEditRecordCount" class="font-semibold text-blue-600">0</span> <span data-i18n="filteredRecords">filtered records</span></p>
                  </div>
                  <button onclick="closeMasterBatchEditModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <i class="ri-close-line text-2xl"></i>
                  </button>
                </div>

                <!-- Modal Body - Two Panel Layout -->
                <div class="flex-1 flex overflow-hidden">
                  <!-- LEFT PANEL - Field Editor -->
                  <div class="w-1/2 border-r border-gray-200 flex flex-col">
                    <!-- Info Box -->
                    <div class="p-4 bg-blue-50 border-b border-blue-200">
                      <div class="flex items-start">
                        <i class="ri-information-line text-blue-600 text-lg mr-2"></i>
                        <div class="text-xs text-blue-800">
                          <p class="font-medium mb-1" data-i18n="batchEditInstructions">Click field tags to edit • <span class="text-red-600">Red</span> = Old • <span class="text-green-600">Green</span> = New</p>
                        </div>
                      </div>
                    </div>

                    <!-- Field Tags (Scrollable) -->
                    <div class="p-4 overflow-y-auto flex-1">
                      <div class="mb-4">
                        <label class="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide" data-i18n="availableFields">Available Fields:</label>
                        <div id="batchEditFieldTags" class="flex flex-wrap gap-2">
                          <!-- Field tags will be inserted here -->
                        </div>
                      </div>

                      <!-- Active Edit Section -->
                      <div id="batchEditActiveSection" class="hidden mb-4 p-4 bg-gray-50 rounded-lg border-2 border-blue-300">
                        <div class="flex items-center justify-between mb-3">
                          <label class="text-sm font-semibold text-gray-700"><span data-i18n="editing">Editing</span>: <span id="activeFieldLabel" class="text-blue-600"></span></label>
                          <button onclick="cancelFieldEdit()" class="text-xs text-gray-500 hover:text-gray-700">
                            <i class="ri-close-line"></i> <span data-i18n="cancel">Cancel</span>
                          </button>
                        </div>
                        <div class="flex gap-2 items-start">
                          <div class="flex-1">
                            <input type="text" id="batchEditActiveInput" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" data-i18n-placeholder="enterNewValue" placeholder="Enter new value..." />
                            <p id="customValueWarning" class="hidden text-xs text-amber-600 mt-1 flex items-center gap-1">
                              <i class="ri-alert-line"></i> <span data-i18n="addingCustomValue">Adding new custom value</span>
                            </p>
                          </div>
                          <button onclick="addFieldToChangesList()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 text-sm font-medium">
                            <i class="ri-check-line"></i> <span data-i18n="addChange">Add</span>
                          </button>
                        </div>
                      </div>

                      <!-- Changes List -->
                      <div class="mb-4">
                        <label class="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide" data-i18n="changesToApply">Changes to Apply:</label>
                        <div id="batchEditChangesList" class="space-y-2">
                          <p class="text-xs text-gray-400 italic" data-i18n="noChangesYet">No changes yet. Click field tags above to start editing.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- RIGHT PANEL - Live Preview -->
                  <div class="w-1/2 flex flex-col bg-gray-50">
                    <!-- Preview Header -->
                    <div class="p-4 bg-green-50 border-b border-green-200">
                      <h4 class="text-sm font-semibold text-gray-700 flex items-center">
                        <i class="ri-eye-line text-green-600 mr-2"></i>
                        <span data-i18n="preview">Preview</span> <span id="batchEditPreviewInfo" class="ml-2 text-xs font-normal text-gray-600">(showing 5 of 0 total records)</span>
                      </h4>
                    </div>

                    <!-- Preview Cards (Independently Scrollable) -->
                    <div id="batchEditPreviewContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
                      <!-- Preview cards will be inserted here -->
                    </div>
                  </div>
                </div>

                <!-- Modal Footer -->
                <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                  <p class="text-xs text-gray-600">
                    <i class="ri-alert-line text-amber-600"></i>
                    <span data-i18n="changesWillBeApplied">Changes will be applied to</span> <strong id="footerRecordCount">0</strong> <span data-i18n="records">records</span>
                  </p>
                  <div class="flex gap-3">
                    <button onclick="closeMasterBatchEditModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium text-sm">
                      <span data-i18n="cancel">Cancel</span>
                    </button>
                    <button onclick="confirmMasterBatchEdit()" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 text-sm">
                      <i class="ri-check-line"></i>
                      <span data-i18n="updateRecords">Update Records</span>
                      Update Records
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div class="bg-white px-4 py-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div class="flex items-center">
                  <div class="p-2 bg-blue-100 rounded-lg">
                    <i class="ri-database-line text-blue-600 text-xl"></i>
                  </div>
                  <div class="ml-3">
                    <p class="text-xs text-gray-500">総件数</p>
                    <p class="text-xl font-bold text-gray-900" id="totalMasterCount">0</p>
                  </div>
                </div>
              </div>
              <div class="bg-white px-4 py-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div class="flex items-center">
                  <div class="p-2 bg-green-100 rounded-lg">
                    <i class="ri-image-line text-green-600 text-xl"></i>
                  </div>
                  <div class="ml-3">
                    <p class="text-xs text-gray-500">画像あり</p>
                    <p class="text-xl font-bold text-gray-900" id="withImageCount">0</p>
                  </div>
                </div>
              </div>
              <div class="bg-white px-4 py-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div class="flex items-center">
                  <div class="p-2 bg-yellow-100 rounded-lg">
                    <i class="ri-image-off-line text-yellow-600 text-xl"></i>
                  </div>
                  <div class="ml-3">
                    <p class="text-xs text-gray-500">画像なし</p>
                    <p class="text-xl font-bold text-gray-900" id="withoutImageCount">0</p>
                  </div>
                </div>
              </div>
              <div class="bg-white px-4 py-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div class="flex items-center">
                  <div class="p-2 bg-purple-100 rounded-lg">
                    <i class="ri-filter-line text-purple-600 text-xl"></i>
                  </div>
                  <div class="ml-3">
                    <p class="text-xs text-gray-500">表示中</p>
                    <p class="text-xl font-bold text-gray-900" id="filteredCount">0</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Table Controls -->
            <div class="bg-white p-4 rounded-lg shadow-sm border mb-4">
              <div class="flex justify-between items-center">
                <div class="flex items-center space-x-2">
                  <label class="text-sm text-gray-600">表示件数:</label>
                  <select id="masterItemsPerPageSelect" class="p-1 border rounded text-sm">
                    <option value="10">10件</option>
                    <option value="25" selected>25件</option>
                    <option value="50">50件</option>
                    <option value="100">100件</option>
                  </select>
                </div>
                <div class="text-sm text-gray-600" id="masterPageInfo">
                  0件中 0-0件を表示
                </div>
              </div>
            </div>

            <!-- Table Container -->
            <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div id="masterTableContainer" class="min-h-[600px]">
                <div class="flex items-center justify-center h-96">
                  <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p class="text-gray-500 text-lg">データを読み込み中...</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div class="bg-white p-4 rounded-lg shadow-sm border mt-4">
              <div class="flex justify-between items-center">
                <div class="text-sm text-gray-600" id="masterPaginationInfo">
                  0件中 0-0件を表示
                </div>
                <div class="flex items-center space-x-2">
                  <button id="masterPrevPageBtn" class="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm" disabled>
                    <i class="ri-arrow-left-line mr-1"></i> 前へ
                  </button>
                  <div id="masterPageNumbers" class="flex space-x-2">
                    <!-- Page numbers will be inserted here -->
                  </div>
                  <button id="masterNextPageBtn" class="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm" disabled>
                    次へ <i class="ri-arrow-right-line ml-1"></i>
                  </button>
                </div>
              </div>
            </div>
            </div><!-- end masterNormalContentWrapper -->

            <!-- Defect Management Container -->
            <div id="furyoKanriContainer" class="hidden"></div>

            <!-- Add New Record Modal -->
            <div id="addRecordModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
              <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="text-lg font-semibold text-gray-900" id="modalTitle" data-i18n="addNewRecordModal">Add New Record</h3>
                      <button onclick="closeAddRecordModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="ri-close-line text-xl"></i>
                      </button>
                    </div>
                    
                    <form id="addRecordForm">
                      <!-- Image Upload Section -->
                      <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="productImage">製品画像</label>
                        <div id="newRecordImagePreview" class="mb-3">
                          <div class="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                            <div class="text-center">
                              <i class="ri-image-line text-gray-400 text-2xl mb-2"></i>
                              <p class="text-gray-500 text-sm" data-i18n="noImageAvailable">画像がありません</p>
                            </div>
                          </div>
                        </div>
                        <button type="button" onclick="document.getElementById('newRecordImageInput').click()" class="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                          <i class="ri-upload-line mr-1"></i><span data-i18n="uploadImage">画像をアップロード</span>
                        </button>
                        <input type="file" id="newRecordImageInput" accept="image/*" class="hidden" />
                      </div>

                      <!-- Dynamic Fields Container -->
                      <div id="dynamicFieldsContainer" class="space-y-4 mb-6">
                        <!-- Dynamic input fields will be generated here -->
                      </div>

                      <!-- Action Buttons -->
                      <div class="flex justify-end space-x-3">
                        <button type="button" onclick="closeAddRecordModal()" class="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50" data-i18n="cancel">
                          キャンセル
                        </button>
                        <button type="submit" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                          <i class="ri-save-line mr-1"></i><span data-i18n="save">保存</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          `;

          let masterData = [];
          let filteredMasterData = [];
          let masterSortState = { column: null, direction: 1 };
          let currentMasterPage = 1;
          let masterItemsPerPage = 25;
          let currentMasterTab = 'masterDB'; // Track current tab

          // Server-side pagination state (populated by /api/masterdb/paginate response)
          let masterTotalCount = 0;
          let masterFilteredCount = 0;
          let masterWithImageCount = 0;
          let masterTotalPages = 0;
          // Current advanced-filter query built by applyMasterAdvancedFilters()
          let masterAdvancedFilterQuery = {};
          let _masterDBLoading = false;

          function setMasterLoading(on) {
            _masterDBLoading = on;
            const container = document.getElementById('masterTableContainer');
            const prevBtn   = document.getElementById('masterPrevPageBtn');
            const nextBtn   = document.getElementById('masterNextPageBtn');
            const perPage   = document.getElementById('masterItemsPerPageSelect');

            if (on) {
              // Dim existing content and overlay a spinner
              container.style.position = 'relative';
              if (!document.getElementById('_masterLoadingOverlay')) {
                const overlay = document.createElement('div');
                overlay.id = '_masterLoadingOverlay';
                overlay.style.cssText = [
                  'position:absolute', 'inset:0', 'z-index:10',
                  'background:rgba(255,255,255,0.65)',
                  'display:flex', 'align-items:center', 'justify-content:center',
                  'border-radius:inherit',
                ].join(';');
                overlay.innerHTML = `
                  <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
                    <svg style="width:36px;height:36px;animation:spin 0.8s linear infinite" viewBox="0 0 24 24" fill="none">
                      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
                      <circle cx="12" cy="12" r="10" stroke="#d1d5db" stroke-width="3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                    <span style="font-size:13px;color:#6b7280">読み込み中...</span>
                  </div>
                `;
                container.appendChild(overlay);
              }
              if (prevBtn) prevBtn.disabled = true;
              if (nextBtn) nextBtn.disabled = true;
              if (perPage) perPage.disabled = true;
            } else {
              const overlay = document.getElementById('_masterLoadingOverlay');
              if (overlay) overlay.remove();
              if (perPage) perPage.disabled = false;
              // prev/next button enabled state is managed by updateMasterPagination
            }
          }

          async function loadMasterDB() {
            if (_masterDBLoading) return; // prevent double-fire
            setMasterLoading(true);
            try {
              const collectionName = currentMasterTab === 'materialDB' ? 'materialMasterDB2' : currentMasterTab;
              const baseQuery = currentMasterTab === 'materialDB' ? { 工程名: "粘着工程" } : {};

              // Gather current UI state for server-side filtering / sorting
              const searchTags = getMasterSearchTags ? getMasterSearchTags() : [];
              const logicMode = document.getElementById("searchLogicMode")?.value || "OR";

              // Only send string-type fields for text search
              const searchFields = masterFieldSchemas
                ? Object.keys(masterFieldSchemas).filter(k => {
                    const t = masterFieldSchemas[k]?.type;
                    return t === 'text' || t === 'select';
                  })
                : [];

              const simpleFilters = {
                factory: document.getElementById("filterFactory")?.value || '',
                rl:      document.getElementById("filterRL")?.value     || '',
                color:   document.getElementById("filterColor")?.value  || '',
                process: document.getElementById("filterProcess")?.value || '',
              };

              const res = await fetch(BASE_URL + "api/masterdb/paginate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  collectionName,
                  baseQuery,
                  page:  currentMasterPage,
                  limit: masterItemsPerPage,
                  sort:  masterSortState,
                  simpleFilters,
                  advancedFilters:  masterAdvancedFilterQuery,
                  searchTags,
                  searchFields,
                  searchLogicMode: logicMode,
                }),
              });

              const result = await res.json();
              masterData         = result.data;
              filteredMasterData = result.data; // alias kept for compatibility
              masterTotalCount     = result.totalCount;
              masterFilteredCount  = result.filteredCount;
              masterWithImageCount = result.withImageCount;
              masterTotalPages     = result.totalPages;

              updateMasterStats();
              renderMasterTable();
            } catch (err) {
              console.error("Failed to load masterDB:", err);
              document.getElementById("masterTableContainer").innerHTML =
                `<div class="text-center py-8"><p class="text-red-500">データの読み込みに失敗しました</p></div>`;
            } finally {
              setMasterLoading(false);
            }
          }

          // Make loadMasterDB globally accessible for sidebar operations
          window.loadMasterDB = loadMasterDB;

          // Tab switching function
          window.switchMasterTab = function(tabName) {
            // Helper: show/hide normal DB sections vs furyoKanri
            function showNormalSections() {
              const wrapper = document.getElementById('masterNormalContentWrapper');
              const fc = document.getElementById('furyoKanriContainer');
              if (wrapper) wrapper.style.display = '';
              if (fc) fc.classList.add('hidden');
            }
            function showFuryoKanriSection() {
              const wrapper = document.getElementById('masterNormalContentWrapper');
              const fc = document.getElementById('furyoKanriContainer');
              if (wrapper) wrapper.style.display = 'none';
              if (fc) fc.classList.remove('hidden');
            }

            // If switching to 不良管理 tab
            if (tabName === 'furyoKanri') {
              currentMasterTab = 'furyoKanri';
              window.currentMasterTab = currentMasterTab;
              updateMasterTabStyles();
              showFuryoKanriSection();
              loadFuryoKanri();
              return;
            }

            // Make sure normal sections are visible when switching away from furyoKanri
            showNormalSections();

            // If switching to Product PDFs tab, load that page instead
            if (tabName === 'productPDFs') {
              if (typeof initProductPDFsPage === 'function') {
                initProductPDFsPage();
              } else {
                console.error('❌ initProductPDFsPage function not found');
              }
              updateMasterTabStyles();
              return;
            }
            
            currentMasterTab = tabName;
            window.currentMasterTab = currentMasterTab; // Update global variable
            updateMasterTabStyles();
            currentMasterPage = 1; // Reset to first page
            masterAdvancedFilterQuery = {}; // Clear advanced filters for new tab
            masterSortState = { column: null, direction: 1 }; // Reset sort for new tab
            
            // Clear advanced filter cache and reset fields for new tab
            masterFilterDropdownCache.clear();
            masterFieldSchemas = {};
            
            // Clear existing filter rows
            const container = document.getElementById('masterFilterRowsContainer');
            if (container) {
              container.innerHTML = '';
            }
            
            // Re-fetch field schemas for new tab
            fetchMasterFieldNames().then(() => {
              console.log('✅ Field schemas loaded for new tab');
            });
            
            loadMasterDB();
            loadMasterFilters();
          };

          // Update tab button styles
          function updateMasterTabStyles() {
            document.querySelectorAll('.master-tab-btn').forEach(btn => {
              if (btn.id === currentMasterTab + 'Tab') {
                btn.className = 'master-tab-btn py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm whitespace-nowrap';
              } else {
                btn.className = 'master-tab-btn py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap';
              }
            });
          }

          // ==================== 不良管理 DEFECT MANAGEMENT ====================

          let _furyoModels = [];           // distinct モデル values from masterDB
          let _furyoDefinitions = {};      // { モデル: { 'counter-1': 'シワ', ... } }  (Japanese)
          let _furyoDefinitionsEN = {};    // { モデル: { 'counter-1': 'Wrinkle', ... } } (English)
          let _furyoSelectedModel = null;
          let _furyoHasChanges = false;
          let _furyoEditMode = false;      // true when user has pressed 編集
          let _furyoOriginalDef   = {};   // snapshot before edit (JP) — used by cancel
          let _furyoOriginalDefEN = {};   // snapshot before edit (EN) — used by cancel

          // Roles allowed to edit defect definitions
          const FURYO_EDIT_ROLES = ['admin', '部長', '課長', '係長'];

          async function loadFuryoKanri() {
            const container = document.getElementById('furyoKanriContainer');
            if (!container) return;

            // Show loading
            container.innerHTML = `
              <div class="flex items-center justify-center h-64">
                <div class="text-center">
                  <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
                  <p class="text-gray-500">読み込み中...</p>
                </div>
              </div>`;

            try {
              // Fetch distinct モデル values from masterDB + existing definitions in parallel
              const [modelsRes, defsRes] = await Promise.all([
                fetch(BASE_URL + 'queries', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    dbName: 'Sasaki_Coating_MasterDB',
                    collectionName: 'masterDB',
                    aggregation: [
                      { $group: { _id: '$モデル' } },
                      { $sort: { _id: 1 } }
                    ]
                  })
                }),
                fetch(BASE_URL + 'defectDefinitions')
              ]);

              const modelsData = await modelsRes.json();
              const defsData = await defsRes.json();

              _furyoModels = (modelsData || [])
                .map(d => d._id)
                .filter(m => m && m.trim() !== '')
                .sort();

              // Index definitions by model
              _furyoDefinitions = {};
              _furyoDefinitionsEN = {};
              (defsData || []).forEach(def => {
                if (def.モデル) {
                  _furyoDefinitions[def.モデル]   = def.counters    || {};
                  _furyoDefinitionsEN[def.モデル] = def.counters_en || {};
                }
              });

              renderFuryoKanriUI();

            } catch (err) {
              console.error('loadFuryoKanri error:', err);
              container.innerHTML = `<div class="p-6 text-red-500">データの読み込みに失敗しました: ${err.message}</div>`;
            }
          }

          function renderFuryoKanriUI() {
            const container = document.getElementById('furyoKanriContainer');
            if (!container) return;

            const canEdit = FURYO_EDIT_ROLES.includes(currentUser?.role || '');

            container.innerHTML = `
              <div class="flex gap-4" style="height: calc(100vh - 180px);">
                <!-- Left: Model List -->
                <div class="w-72 shrink-0 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-full">
                  <div class="p-4 border-b border-gray-200 shrink-0">
                    <h3 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <i class="ri-list-unordered text-blue-600"></i> モデル一覧
                    </h3>
                    <input
                      type="text"
                      id="furyoModelSearch"
                      placeholder="モデルを検索..."
                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      oninput="filterFuryoModels(this.value)"
                    />
                  </div>
                  <ul id="furyoModelList" class="flex-1 overflow-y-auto divide-y divide-gray-100">
                    ${_furyoModels.length === 0
                      ? `<li class="px-4 py-6 text-center text-gray-400 text-sm">モデルが見つかりません</li>`
                      : _furyoModels.map(m => renderFuryoModelItem(m)).join('')
                    }
                  </ul>
                  <div class="p-3 border-t border-gray-100 text-xs text-gray-400 text-center shrink-0">
                    ${_furyoModels.length}モデル
                  </div>
                </div>

                <!-- Right: Counter Definition Panel -->
                <div class="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm h-full overflow-hidden">
                  <div id="furyoDetailPanel" class="h-full flex items-center justify-center">
                    <div class="text-center text-gray-400">
                      <i class="ri-arrow-left-line text-4xl mb-3 block"></i>
                      <p class="text-lg font-medium">左からモデルを選択してください</p>
                      <p class="text-sm mt-1">各カウンターの不良名を定義します</p>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }

          function renderFuryoModelItem(modelName) {
            const hasDef = !!_furyoDefinitions[modelName];
            const definedCount = hasDef
              ? Object.values(_furyoDefinitions[modelName]).filter(v => v && v.trim()).length
              : 0;
            const isSelected = _furyoSelectedModel === modelName;
            const safeName = modelName.replace(/'/g, "\\'");

            return `
              <li
                class="furyo-model-item px-3 py-3 cursor-pointer hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}"
                data-model="${modelName}"
                onclick="selectFuryoModel('${safeName}')"
              >
                <div class="flex items-center gap-1">
                  <span class="text-sm font-medium text-gray-800 truncate flex-1">${modelName}</span>
                  ${hasDef && definedCount > 0
                    ? `<span class="shrink-0 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">${definedCount}/12</span>`
                    : `<span class="shrink-0 px-2 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-full">未定義</span>`
                  }
                  <button
                    class="shrink-0 p-1 text-gray-400 hover:text-blue-500 rounded transition-colors"
                    title="製品一覧を見る"
                    onclick="event.stopPropagation(); showFuryoModelInfo('${safeName}')"
                  ><i class="ri-information-line text-sm"></i></button>
                </div>
              </li>
            `;
          }

          function filterFuryoModels(query) {
            const list = document.getElementById('furyoModelList');
            if (!list) return;
            const q = query.toLowerCase().trim();
            const filtered = q ? _furyoModels.filter(m => m.toLowerCase().includes(q)) : _furyoModels;
            list.innerHTML = filtered.length === 0
              ? `<li class="px-4 py-6 text-center text-gray-400 text-sm">一致するモデルがありません</li>`
              : filtered.map(m => renderFuryoModelItem(m)).join('');
          }

          function selectFuryoModel(modelName) {
            // Warn if switching away while in edit mode with unsaved changes
            if (_furyoEditMode && _furyoHasChanges) {
              if (!confirm('編集中の変更が失われます。続けますか？')) return;
            }
            _furyoEditMode = false;
            _furyoHasChanges = false;
            _furyoSelectedModel = modelName;
            // Refresh model list to update selection highlight
            filterFuryoModels(document.getElementById('furyoModelSearch')?.value || '');
            renderFuryoDetailPanel(modelName);
          }
          window.selectFuryoModel = selectFuryoModel;

          function renderFuryoDetailPanel(modelName) {
            const panel = document.getElementById('furyoDetailPanel');
            if (!panel) return;

            // Switch from centered placeholder layout to full-height flex layout
            panel.className = 'h-full flex flex-col overflow-hidden';

            const canEdit = FURYO_EDIT_ROLES.includes(currentUser?.role || '');
            const existingDef   = _furyoDefinitions[modelName]   || {};
            const existingDefEN = _furyoDefinitionsEN[modelName] || {};
            const isDefined = Object.keys(existingDef).length > 0;

            // Save originals for cancel — deep copy
            _furyoOriginalDef   = JSON.parse(JSON.stringify(existingDef));
            _furyoOriginalDefEN = JSON.parse(JSON.stringify(existingDefEN));
            _furyoEditMode  = false;
            _furyoHasChanges = false;

            // Readonly style (default view mode)
            const readonlyCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-default outline-none';
            // Disabled style (no permission)
            const disabledCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed outline-none';

            const countersHTML = Array.from({ length: 12 }, (_, i) => {
              const key   = `counter-${i + 1}`;
              const valJP = existingDef[key]   || '';
              const valEN = existingDefEN[key] || '';
              return `
                <div class="grid items-center gap-3" style="grid-template-columns: 6rem 1fr 1fr;">
                  <label class="text-sm font-medium text-gray-600">カウンター${i + 1}</label>
                  <input
                    type="text"
                    id="furyoCounter_${i + 1}"
                    value="${valJP.replace(/"/g, '&quot;')}"
                    readonly
                    ${canEdit ? '' : 'disabled'}
                    placeholder="${canEdit ? '日本語で入力...' : '権限なし'}"
                    class="furyo-counter-input ${canEdit ? readonlyCls : disabledCls}"
                    oninput="onFuryoCounterChange()"
                  />
                  <div class="relative">
                    <input
                      type="text"
                      id="furyoCounterEN_${i + 1}"
                      value="${valEN.replace(/"/g, '&quot;')}"
                      readonly
                      ${canEdit ? '' : 'disabled'}
                      placeholder="${canEdit ? 'English...' : 'No permission'}"
                      class="furyo-counter-input ${canEdit ? readonlyCls : disabledCls} pr-7"
                      oninput="onFuryoCounterChange()"
                    />
                    <span id="furyoTranslating_${i + 1}" class="hidden absolute right-2 top-1/2 -translate-y-1/2 text-blue-400">
                      <i class="ri-loader-4-line animate-spin text-xs"></i>
                    </span>
                  </div>
                </div>
              `;
            }).join('');

            panel.innerHTML = `
              <div class="p-6 flex flex-col h-full">
                <!-- Header -->
                <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 shrink-0">
                  <div>
                    <h3 class="text-lg font-bold text-gray-900">${modelName}</h3>
                    <p class="text-sm text-gray-500 mt-0.5">カウンター不良名定義</p>
                  </div>
                  ${isDefined
                    ? `<span class="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium flex items-center gap-1">
                        <i class="ri-checkbox-circle-line"></i> 定義済み
                       </span>`
                    : `<span class="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full font-medium flex items-center gap-1">
                        <i class="ri-information-line"></i> 未定義
                       </span>`
                  }
                </div>

                <!-- Column Headers -->
                <div class="grid gap-3 mb-2 shrink-0" style="grid-template-columns: 6rem 1fr 1fr;">
                  <div></div>
                  <div class="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span>🇯🇵</span> 日本語
                  </div>
                  <div class="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span>🇬🇧</span> English
                    <span class="ml-1 text-gray-400 font-normal normal-case tracking-normal">(日本語入力後に自動提案)</span>
                  </div>
                </div>

                <!-- Counter Fields -->
                <div class="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  ${countersHTML}
                </div>

                <!-- Action Bar -->
                <div class="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between shrink-0">
                  <p id="furyoActionHint" class="text-xs text-gray-400">
                    ${canEdit ? '空欄のカウンターは「カウンターN」として表示されます' : '表示専用 — 編集権限がありません'}
                  </p>
                  ${canEdit ? `
                    <div class="flex items-center gap-2">
                      <!-- Clear — only visible in edit mode -->
                      <button
                        id="furyoClearBtn"
                        onclick="clearFuryoCounters()"
                        class="hidden px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >クリア</button>

                      <!-- Cancel — only visible in edit mode -->
                      <button
                        id="furyoCancelBtn"
                        onclick="cancelFuryoEdit()"
                        class="hidden px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >キャンセル</button>

                      <!-- Edit — only visible in view mode -->
                      <button
                        id="furyoEditBtn"
                        onclick="startFuryoEdit()"
                        class="px-4 py-2 border border-blue-400 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
                      ><i class="ri-edit-line"></i> 編集</button>

                      <!-- Save — always present, greyed until there are changes -->
                      <button
                        id="furyoSaveBtn"
                        onclick="saveFuryoDefinition('${modelName.replace(/'/g, "\\'")}')"
                        disabled
                        class="px-5 py-2 bg-gray-300 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed transition-colors flex items-center gap-2"
                      ><i class="ri-save-line"></i> 保存</button>
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }

          // Auto-translate a Japanese counter value into the English field using MyMemory
          window.furyoAutoTranslate = async function(idx) {
            const jpInput = document.getElementById(`furyoCounter_${idx}`);
            const enInput = document.getElementById(`furyoCounterEN_${idx}`);
            const spinner = document.getElementById(`furyoTranslating_${idx}`);
            if (!jpInput || !enInput) return;

            const jpText = jpInput.value.trim();
            // Only auto-suggest when there is JP text AND EN field is empty
            if (!jpText || enInput.value.trim() !== '') return;

            try {
              if (spinner) spinner.classList.remove('hidden');
              const res = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(jpText)}&langpair=ja|en`
              );
              const data = await res.json();
              const translated = data?.responseData?.translatedText;
              // Only fill if EN field is still empty (user may have typed while waiting)
              if (translated && enInput.value.trim() === '') {
                enInput.value = translated;
                onFuryoCounterChange(); // re-check change state after fill
              }
            } catch (err) {
              console.warn('Auto-translate failed:', err);
            } finally {
              if (spinner) spinner.classList.add('hidden');
            }
          };

          function clearFuryoCounters() {
            for (let i = 1; i <= 12; i++) {
              const jp = document.getElementById(`furyoCounter_${i}`);
              const en = document.getElementById(`furyoCounterEN_${i}`);
              if (jp) jp.value = '';
              if (en) en.value = '';
            }
            onFuryoCounterChange();
          }
          window.clearFuryoCounters = clearFuryoCounters;
          window.filterFuryoModels = filterFuryoModels;

          // ── Edit-mode helpers ──────────────────────────────────────────────

          const _FURYO_EDIT_CLS = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';
          const _FURYO_READONLY_CLS = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-default outline-none';

          window.startFuryoEdit = function() {
            _furyoEditMode = true;
            _furyoHasChanges = false;

            // Make all counter inputs editable
            for (let i = 1; i <= 12; i++) {
              const jp = document.getElementById(`furyoCounter_${i}`);
              const en = document.getElementById(`furyoCounterEN_${i}`);
              if (jp) {
                jp.removeAttribute('readonly');
                jp.className = `furyo-counter-input ${_FURYO_EDIT_CLS}`;
                jp.setAttribute('onblur', `furyoAutoTranslate(${i})`);
              }
              if (en) {
                en.removeAttribute('readonly');
                en.className = `furyo-counter-input ${_FURYO_EDIT_CLS} pr-7`;
              }
            }

            // Swap button visibility
            document.getElementById('furyoClearBtn')?.classList.remove('hidden');
            document.getElementById('furyoCancelBtn')?.classList.remove('hidden');
            document.getElementById('furyoEditBtn')?.classList.add('hidden');
          };

          window.cancelFuryoEdit = function() {
            _furyoEditMode = false;
            _furyoHasChanges = false;

            // Restore original values
            for (let i = 1; i <= 12; i++) {
              const key = `counter-${i}`;
              const jp = document.getElementById(`furyoCounter_${i}`);
              const en = document.getElementById(`furyoCounterEN_${i}`);
              if (jp) {
                jp.value = _furyoOriginalDef[key] || '';
                jp.setAttribute('readonly', '');
                jp.className = `furyo-counter-input ${_FURYO_READONLY_CLS}`;
                jp.removeAttribute('onblur');
              }
              if (en) {
                en.value = _furyoOriginalDefEN[key] || '';
                en.setAttribute('readonly', '');
                en.className = `furyo-counter-input ${_FURYO_READONLY_CLS} pr-7`;
              }
            }

            // Swap button visibility
            document.getElementById('furyoClearBtn')?.classList.add('hidden');
            document.getElementById('furyoCancelBtn')?.classList.add('hidden');
            document.getElementById('furyoEditBtn')?.classList.remove('hidden');

            // Grey out save
            const saveBtn = document.getElementById('furyoSaveBtn');
            if (saveBtn) {
              saveBtn.disabled = true;
              saveBtn.className = 'px-5 py-2 bg-gray-300 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed transition-colors flex items-center gap-2';
              saveBtn.innerHTML = '<i class="ri-save-line"></i> 保存';
            }
          };

          function onFuryoCounterChange() {
            if (!_furyoEditMode) return;

            // Check whether any value differs from the original snapshot
            let changed = false;
            for (let i = 1; i <= 12; i++) {
              const key = `counter-${i}`;
              const jp = document.getElementById(`furyoCounter_${i}`);
              const en = document.getElementById(`furyoCounterEN_${i}`);
              if (jp && jp.value.trim() !== (_furyoOriginalDef[key]   || '')) { changed = true; break; }
              if (en && en.value.trim() !== (_furyoOriginalDefEN[key] || '')) { changed = true; break; }
            }

            _furyoHasChanges = changed;
            const saveBtn = document.getElementById('furyoSaveBtn');
            if (saveBtn) {
              if (changed) {
                saveBtn.disabled = false;
                saveBtn.className = 'px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2';
              } else {
                saveBtn.disabled = true;
                saveBtn.className = 'px-5 py-2 bg-gray-300 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed transition-colors flex items-center gap-2';
              }
            }
          }
          window.onFuryoCounterChange = onFuryoCounterChange;

          async function saveFuryoDefinition(modelName) {
            const counters    = {};
            const counters_en = {};
            for (let i = 1; i <= 12; i++) {
              const jp = document.getElementById(`furyoCounter_${i}`);
              const en = document.getElementById(`furyoCounterEN_${i}`);
              counters[`counter-${i}`]    = jp ? jp.value.trim() : '';
              counters_en[`counter-${i}`] = en ? en.value.trim() : '';
            }

            const btn = document.getElementById('furyoSaveBtn');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> 保存中...'; }

            try {
              const res = await fetch(BASE_URL + 'defectDefinitions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: modelName,
                  counters,
                  counters_en,
                  username: currentUser?.username || 'unknown'
                })
              });

              if (!res.ok) throw new Error((await res.json()).error || 'Save failed');

              // Update local cache
              _furyoDefinitions[modelName]   = counters;
              _furyoDefinitionsEN[modelName] = counters_en;
              _furyoOriginalDef   = JSON.parse(JSON.stringify(counters));
              _furyoOriginalDefEN = JSON.parse(JSON.stringify(counters_en));
              _furyoHasChanges = false;

              // Exit edit mode (inputs back to readonly)
              _furyoEditMode = false;
              for (let i = 1; i <= 12; i++) {
                const jp = document.getElementById(`furyoCounter_${i}`);
                const en = document.getElementById(`furyoCounterEN_${i}`);
                if (jp) { jp.setAttribute('readonly', ''); jp.className = `furyo-counter-input ${_FURYO_READONLY_CLS}`; jp.removeAttribute('onblur'); }
                if (en) { en.setAttribute('readonly', ''); en.className = `furyo-counter-input ${_FURYO_READONLY_CLS} pr-7`; }
              }
              document.getElementById('furyoClearBtn')?.classList.add('hidden');
              document.getElementById('furyoCancelBtn')?.classList.add('hidden');
              document.getElementById('furyoEditBtn')?.classList.remove('hidden');

              // Success flash on save button
              if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="ri-checkbox-circle-line"></i> 保存しました';
                btn.className = 'px-5 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2';
                setTimeout(() => {
                  btn.innerHTML = '<i class="ri-save-line"></i> 保存';
                  btn.className = 'px-5 py-2 bg-gray-300 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed transition-colors flex items-center gap-2';
                }, 2000);
              }

              // Refresh model list badges
              filterFuryoModels(document.getElementById('furyoModelSearch')?.value || '');

            } catch (err) {
              console.error('saveFuryoDefinition error:', err);
              if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="ri-save-line"></i> 保存';
                btn.className = 'px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2';
              }
              alert('保存に失敗しました: ' + err.message);
            }
          }
          window.saveFuryoDefinition = saveFuryoDefinition;

          // ── Model Info Modal ───────────────────────────────────────────────

          window.showFuryoModelInfo = async function(modelName) {
            // Remove existing overlay if any
            document.getElementById('furyoModelInfoOverlay')?.remove();

            const overlay = document.createElement('div');
            overlay.id = 'furyoModelInfoOverlay';
            overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

            overlay.innerHTML = `
              <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col" style="max-height:80vh;">
                <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                  <div>
                    <h3 class="text-lg font-bold text-gray-900">${modelName}</h3>
                    <p id="furyoModelInfoCount" class="text-sm text-gray-500 mt-0.5">読み込み中...</p>
                  </div>
                  <button
                    onclick="document.getElementById('furyoModelInfoOverlay').remove()"
                    class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  ><i class="ri-close-line text-xl"></i></button>
                </div>
                <div id="furyoModelInfoBody" class="flex-1 overflow-y-auto p-6">
                  <div class="flex items-center justify-center h-32">
                    <div class="text-center">
                      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p class="text-gray-400 text-sm">読み込み中...</p>
                    </div>
                  </div>
                </div>
              </div>
            `;

            document.body.appendChild(overlay);

            try {
              const res = await fetch(BASE_URL + 'queries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  dbName: 'Sasaki_Coating_MasterDB',
                  collectionName: 'masterDB',
                  query: { 'モデル': modelName },
                  projection: { 背番号: 1, 品番: 1, 品名: 1, imageURL: 1, _id: 0 }
                })
              });
              const products = await res.json();

              const countEl = document.getElementById('furyoModelInfoCount');
              if (countEl) countEl.textContent = `${(products || []).length} 品番`;

              const body = document.getElementById('furyoModelInfoBody');
              if (!body) return;

              if (!products || products.length === 0) {
                body.innerHTML = '<p class="text-center text-gray-400 py-10">この機種に対応する製品が見つかりません</p>';
                return;
              }

              body.innerHTML = `
                <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));">
                  ${products.map(p => `
                    <div class="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div class="bg-gray-100 flex items-center justify-center overflow-hidden" style="height:110px;">
                        ${p.imageURL
                          ? `<img src="${p.imageURL}" alt="${p.品番 || ''}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<span class=\\'text-gray-300 text-xs\\'>画像なし</span>'">`
                          : '<span class="text-gray-300 text-xs">画像なし</span>'
                        }
                      </div>
                      <div class="p-2.5 space-y-0.5">
                        <p class="text-xs font-semibold text-gray-800 truncate" title="${p.背番号 || ''}">背番号: ${p.背番号 || '—'}</p>
                        <p class="text-xs text-gray-500 truncate" title="${p.品番 || ''}">品番: ${p.品番 || '—'}</p>
                        ${p.品名 ? `<p class="text-xs text-gray-400 truncate" title="${p.品名}">${p.品名}</p>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              `;
            } catch (err) {
              const body = document.getElementById('furyoModelInfoBody');
              if (body) body.innerHTML = `<p class="text-center text-red-500 py-10">読み込み失敗: ${err.message}</p>`;
            }
          };

          window.loadFuryoKanri = loadFuryoKanri;

          // ==================== END 不良管理 ====================

          function updateMasterStats() {
            document.getElementById('totalMasterCount').textContent = masterTotalCount;
            document.getElementById('withImageCount').textContent = masterWithImageCount;
            document.getElementById('withoutImageCount').textContent = masterTotalCount - masterWithImageCount;
            document.getElementById('filteredCount').textContent = masterFilteredCount;
          }

          function renderMasterTable() {
            if (!masterData.length) {
              document.getElementById("masterTableContainer").innerHTML = `
                <div class="flex items-center justify-center h-96">
                  <div class="text-center">
                    <i class="ri-database-line text-6xl text-gray-400 mb-4"></i>
                    <p class="text-gray-500 text-xl font-medium">データが見つかりません</p>
                    <p class="text-gray-400 mt-2">フィルターを調整するか、新しいデータを追加してください</p>
                  </div>
                </div>
              `;
              updateMasterPagination(0);
              return;
            }

            // masterData is already the current page — no client-side slicing needed
            const pageData = masterData;

            // Filter out any corrupted records from pageData before rendering
            const cleanPageData = pageData.filter(item => {
              if (!item || typeof item !== 'object') return false;
              
              // Check for header corruption signs
              const hasHeaderCorruption = 
                item[""] === '品番' ||
                item._1 === 'モデル' ||
                item['製品背番号一覧'] === '背番号' ||
                Object.values(item).includes('品番') ||
                Object.values(item).includes('モデル');
              
              if (hasHeaderCorruption) {
                return false;
              }
              
              return true;
            });

            // Define headers based on the current tab
            let headers, dataFields;
            
            if (currentMasterTab === 'materialDB') {
              // 材料DB headers - ordered as requested
              // Priority fields: 品番, 品名, ラベル品番, NMOJI_色コード (as 色), 梱包数, 仕様, 型番, ロール温度, 画像, NMOJI_ユーザー (as 次工程), 原材料品番
              const priorityFields = [
                { key: '品番', label: '品番' },
                { key: '品名', label: '品名' },
                { key: 'ラベル品番', label: 'ラベル品番' },
                { key: 'NMOJI_色コード', label: '色' },
                { key: '梱包数', label: '梱包数' },
                { key: '仕様', label: '仕様' },
                { key: '型番', label: '型番' },
                { key: 'ロール温度', label: 'ロール温度' },
                { key: 'imageURL', label: '画像' },
                { key: 'NMOJI_ユーザー', label: '次工程' },
                { key: '原材料品番', label: '原材料品番' }
              ];
              
              // Get all other fields from the first data item (excluding priority fields, _id, and imageURL)
              const priorityFieldKeys = priorityFields.map(f => f.key);
              const sampleItem = cleanPageData.length > 0 ? cleanPageData[0] : {};
              const otherFields = Object.keys(sampleItem)
                .filter(key => !priorityFieldKeys.includes(key) && key !== '_id' && key !== 'imageURL')
                .map(key => ({ key, label: key }));
              
              // Combine priority fields + other fields (imageURL is already in priorityFields)
              headers = [...priorityFields, ...otherFields];
              dataFields = headers.filter(h => h.key !== 'imageURL').map(h => h.key);
            } else {
              // 内装品DB headers (existing logic)
              // Use page data as the dataset to find a reference header item
              let referenceItem = null;
              
              // Try to find a record with a proper 品番 field
              for (let item of masterData) {
                if (item && item.品番 && typeof item.品番 === 'string' && item.品番.trim() !== '') {
                  referenceItem = item;
                  break;
                }
              }
              
              // If no good reference found, use predefined field structure
              if (!referenceItem) {
                console.warn('No proper reference item found, using default field structure');
                referenceItem = {
                  品番: '',
                  モデル: '',
                  背番号: '',
                  品名: '',
                形状: '',
                'R/L': '',
                色: '',
                '顧客/納入先': '',
                備考: '',
                加工設備: '',
                'QR CODE': '',
                型番: '',
                材料背番号: '',
                材料: '',
                収容数: '',
                工場: '',
                '秒数(1pcs何秒)': '',
                '離型紙上/下': '',
                送りピッチ: '',
                SRS: '',
                SLIT: '',
                imageURL: ''
              };
            }

            // Get all fields except _id and imageURL for 内装品DB, then add imageURL at the end
            dataFields = Object.keys(referenceItem).filter(k => k !== "_id" && k !== "imageURL");
            headers = [
              ...dataFields.map(field => ({ key: field, label: field })),
              { key: "imageURL", label: "画像" }
            ];
          }

            const getSortArrow = (col) => {
              if (masterSortState.column !== col) return '';
              return masterSortState.direction === 1 ? ' ↑' : ' ↓';
            };

            // Store the cleaned page data for sidebar access
            storeMasterData(cleanPageData);

            const tableHTML = `
              <div class="overflow-x-auto">
                <table class="w-full text-sm min-w-full">
                  <thead class="bg-gray-50 border-b">
                    <tr>
                      ${headers.map(h => `
                        <th class="px-3 py-2 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors ${h.key === 'imageURL' ? 'w-20' : 'min-w-[100px]'}" onclick="handleMasterSort('${h.key}')">
                          <div class="flex items-center space-x-1">
                            <span>${h.label}</span>
                            <span class="text-xs">${getSortArrow(h.key)}</span>
                          </div>
                        </th>
                      `).join('')}
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    ${cleanPageData.map((row, index) => `
                      <tr class="hover:bg-gray-50 cursor-pointer transition-colors" onclick='showMasterSidebarFromRow(this)' data-index='${index}'>
                        ${headers.map(h => {
                          if (h.key === 'imageURL') {
                            // Render image column
                            return `<td class="px-3 py-2 text-sm">
                              ${row.imageURL 
                                ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><i class="ri-image-line mr-1"></i>あり</span>'
                                : '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"><i class="ri-image-off-line mr-1"></i>なし</span>'
                              }
                            </td>`;
                          } else {
                            // Render data field
                            const value = row[h.key];
                            const displayValue = (value === null || value === undefined || value === '') ? "-" : value;
                            // Highlight main fields for both tabs
                            const isMainField = h.key === "品番" || h.key === "品名" || h.key === "材料品番" || h.key === "材料" || h.key === "ラベル品番" || h.key === "原材料品番";
                            return `<td class="px-3 py-2 text-sm ${isMainField ? 'font-medium text-blue-600 hover:text-blue-800' : 'text-gray-900'}">${displayValue}</td>`;
                          }
                        }).join('')}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `;

            document.getElementById("masterTableContainer").innerHTML = tableHTML;
            updateMasterPagination(masterFilteredCount);
          }

          function updateMasterPagination(totalItems) {
            const totalPages = Math.ceil(totalItems / masterItemsPerPage);
            const pageInfo = document.getElementById('masterPageInfo');
            const paginationInfo = document.getElementById('masterPaginationInfo');
            const pageNumbers = document.getElementById('masterPageNumbers');
            const prevBtn = document.getElementById('masterPrevPageBtn');
            const nextBtn = document.getElementById('masterNextPageBtn');

            if (totalItems === 0) {
              pageInfo.textContent = '0件中 0-0件を表示';
              paginationInfo.textContent = '0件中 0-0件を表示';
              pageNumbers.innerHTML = '';
              prevBtn.disabled = true;
              nextBtn.disabled = true;
              return;
            }

            const startItem = (currentMasterPage - 1) * masterItemsPerPage + 1;
            const endItem = Math.min(currentMasterPage * masterItemsPerPage, totalItems);
            const infoText = `${totalItems}件中 ${startItem}-${endItem}件を表示`;
            
            pageInfo.textContent = infoText;
            paginationInfo.textContent = infoText;

            // Generate page numbers with smart pagination (like approvals page)
            pageNumbers.innerHTML = '';
            
            if (totalPages <= 7) {
              // Show all pages if 7 or fewer
              for (let i = 1; i <= totalPages; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `px-3 py-1 text-sm rounded transition-colors ${i === currentMasterPage ? 'bg-blue-600 text-white' : 'border hover:bg-gray-100'}`;
                pageBtn.textContent = i;
                pageBtn.onclick = () => goToMasterPage(i);
                pageNumbers.appendChild(pageBtn);
              }
            } else {
              // Show abbreviated pagination with consistent pattern
              let pages = [];
              
              if (currentMasterPage <= 4) {
                // Show first 5 pages + ... + last page
                pages = [1, 2, 3, 4, 5, '...', totalPages];
              } else if (currentMasterPage >= totalPages - 3) {
                // Show first page + ... + last 5 pages
                pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
              } else {
                // Show first + ... + current-1, current, current+1 + ... + last
                pages = [1, '...', currentMasterPage - 1, currentMasterPage, currentMasterPage + 1, '...', totalPages];
              }
              
              pages.forEach(page => {
                if (page === '...') {
                  const dots = document.createElement('span');
                  dots.className = 'px-3 py-1 text-sm text-gray-400';
                  dots.textContent = '...';
                  pageNumbers.appendChild(dots);
                } else {
                  const pageBtn = document.createElement('button');
                  pageBtn.className = `px-3 py-1 text-sm rounded transition-colors ${page === currentMasterPage ? 'bg-blue-600 text-white' : 'border hover:bg-gray-100'}`;
                  pageBtn.textContent = page;
                  pageBtn.onclick = () => goToMasterPage(page);
                  pageNumbers.appendChild(pageBtn);
                }
              });
            }

            prevBtn.disabled = currentMasterPage === 1;
            nextBtn.disabled = currentMasterPage === totalPages;
          }

          function goToMasterPage(page) {
            currentMasterPage = page;
            loadMasterDB();
          }

          function changeMasterPage(direction) {
            const newPage = currentMasterPage + direction;
            if (newPage >= 1 && newPage <= masterTotalPages) {
              currentMasterPage = newPage;
              loadMasterDB();
            }
          }

          window.handleMasterSort = (col) => {
            if (masterSortState.column === col) {
              masterSortState.direction *= -1;
            } else {
              masterSortState.column = col;
              masterSortState.direction = 1;
            }
            currentMasterPage = 1;
            loadMasterDB();
          };

          // Store master data globally for sidebar access
          let masterDataCache = [];

          // Safe data storage approach - use index instead of embedding full object
          function storeMasterData(dataArray) {
            // Filter out corrupted records that have header data as values
            const cleanedData = (dataArray || []).filter(item => {
              // Check if this is a corrupted record with headers as values
              if (!item || typeof item !== 'object') return false;
              
              // Look for signs of header corruption
              const hasHeaderCorruption = 
                item[""] === '品番' ||
                item._1 === 'モデル' ||
                item['製品背番号一覧'] === '背番号' ||
                item._2 === '材料' ||
                Object.values(item).includes('品番') ||
                Object.values(item).includes('モデル') ||
                Object.values(item).includes('背番号');
              
              if (hasHeaderCorruption) {
                return false;
              }
              
              return true;
            });
            
            masterDataCache = cleanedData;
            
            // Validate data structure
            if (masterDataCache.length > 0) {
              const sampleItem = masterDataCache[0];
              
              // Check for required fields
              if (!sampleItem.品番) {
                console.warn('Warning: First item missing 品番 field');
              }
            }
          }

          window.showMasterSidebarFromRow = (el) => {
            const rowIndex = parseInt(el.getAttribute("data-index"));
            
            if (isNaN(rowIndex) || rowIndex < 0 || rowIndex >= masterDataCache.length) {
              console.error('Invalid row index:', rowIndex, 'Cache length:', masterDataCache.length);
              alert('データの読み込みエラーが発生しました。ページを再読み込みしてください。');
              return;
            }
            
            const data = masterDataCache[rowIndex];
            if (!data) {
              console.error('No data found at index:', rowIndex);
              alert('データが見つかりません。ページを再読み込みしてください。');
              return;
            }
            
            showMasterSidebar(data);
          };

          // Add New Record Modal Functions
          let newRecordImageFile = null;

          window.openAddRecordModal = function() {
            const modal = document.getElementById('addRecordModal');
            const modalTitle = document.getElementById('modalTitle');
            
            // Get current language from localStorage or use fallback
            const currentLang = localStorage.getItem("lang") || "en";
            
            // Update modal title based on current tab
            const baseTitle = translations[currentLang]?.addNewRecordModal || "新規レコード追加";
            const tabSuffix = currentMasterTab === 'masterDB' ? ' - 内装品 DB' : ' - 材料 DB';
            modalTitle.textContent = baseTitle + tabSuffix;
            
            // Generate dynamic fields based on current data structure
            generateDynamicFields();
            
            // Reset form
            document.getElementById('addRecordForm').reset();
            resetImagePreview();
            newRecordImageFile = null;
            
            modal.classList.remove('hidden');
            
            // Apply language translations to the modal
            if (typeof applyLanguageEnhanced === 'function') {
              applyLanguageEnhanced();
            } else if (typeof applyLanguage === 'function') {
              applyLanguage();
            }
          };

          window.closeAddRecordModal = function() {
            const modal = document.getElementById('addRecordModal');
            modal.classList.add('hidden');
            newRecordImageFile = null;
          };

          function generateDynamicFields() {
            const container = document.getElementById('dynamicFieldsContainer');
            container.innerHTML = '';

            // Get field structure from existing data or create basic structure
            let fieldsToShow = [];
            
            if (masterData.length > 0) {
              // Use existing data structure but ensure boardData is always included for masterDB only
              const sampleRecord = masterData[0];
              const existingFields = Object.keys(sampleRecord).filter(key => key !== '_id' && key !== 'imageURL');
              
              // Always include boardData if it's not already in the existing fields, but only for masterDB
              if (currentMasterTab === 'masterDB' && !existingFields.includes('boardData')) {
                existingFields.push('boardData');
              }
              
              fieldsToShow = existingFields;
            } else {
              // Default fields based on tab
              if (currentMasterTab === 'masterDB') {
                fieldsToShow = ['品番', 'モデル', '背番号', '品名', '形状', 'R/L', '色', '顧客/納入先', '備考', '加工設備', 'QR CODE', '型番', '材料品番', '材料', 'boardData'];
              } else {
                fieldsToShow = ['品番', 'モデル', '背番号', '品名', '形状', 'R/L', '色', '顧客/納入先', '備考', '次工程', 'QR CODE', '型番', '材料品番', '材料'];
              }
            }

            fieldsToShow.forEach(field => {
              const fieldDiv = document.createElement('div');
              
              // Special handling for boardData field (string input)
              if (field === 'boardData') {
                fieldDiv.innerHTML = `
                  <label class="block text-sm font-medium text-gray-700 mb-1">${field}</label>
                  <input type="text" 
                         name="${field}" 
                         class="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                         placeholder="カンマ区切りで入力してください（例：950A,Cピラー(ア),RH）" />
                  <p class="text-xs text-gray-500 mt-1">カンマ区切りの文字列として保存されます。</p>
                `;
              } else {
                fieldDiv.innerHTML = `
                  <label class="block text-sm font-medium text-gray-700 mb-1">${field}</label>
                  <input type="text" 
                         name="${field}" 
                         class="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                         placeholder="${field}を入力..." />
                `;
              }
              container.appendChild(fieldDiv);
            });
          }

          function resetImagePreview() {
            const preview = document.getElementById('newRecordImagePreview');
            const currentLang = localStorage.getItem("lang") || "en";
            const noImageText = translations[currentLang]?.noImageAvailable || "画像がありません";
            preview.innerHTML = `
              <div class="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                <div class="text-center">
                  <i class="ri-image-line text-gray-400 text-2xl mb-2"></i>
                  <p class="text-gray-500 text-sm">${noImageText}</p>
                </div>
              </div>
            `;
          }

          async function submitNewRecord(formData) {
            try {
              // Prepare record data with ALL fields from the current data structure
              const recordData = {};
              
              // Get all possible fields from existing data structure
              let allFields = [];
              if (masterData.length > 0) {
                // Use existing data structure but ensure boardData is always included for masterDB only
                const sampleRecord = masterData[0];
                const existingFields = Object.keys(sampleRecord).filter(key => key !== '_id' && key !== 'imageURL');
                
                // Always include boardData if it's not already in the existing fields, but only for masterDB
                if (currentMasterTab === 'masterDB' && !existingFields.includes('boardData')) {
                  existingFields.push('boardData');
                }
                
                allFields = existingFields;
              } else {
                // Default fields based on tab if no existing data
                if (currentMasterTab === 'masterDB') {
                  allFields = ['品番', 'モデル', '背番号', '品名', '形状', 'R/L', '色', '顧客/納入先', '備考', '加工設備', 'QR CODE', '型番', '材料品番', '材料', 'boardData'];
                } else {
                  allFields = ['品番', 'モデル', '背番号', '品名', '形状', 'R/L', '色', '顧客/納入先', '備考', '次工程', 'QR CODE', '型番', '材料品番', '材料'];
                }
              }

              // Initialize all fields with empty strings
              allFields.forEach(field => {
                recordData[field] = "";
              });

              // Fill in the data from form elements (overwrite empty strings with actual values)
              const formElements = document.getElementById('addRecordForm').elements;
              for (let element of formElements) {
                if (element.name && allFields.includes(element.name)) {
                  recordData[element.name] = element.value.trim();
                }
              }

              console.log("Record data being inserted:", recordData);

              // Map tab to actual collection name
              const collectionName = currentMasterTab === 'materialDB' ? 'materialMasterDB2' : currentMasterTab;
              const username = currentUser?.username || "unknown";

              // Use submitToMasterDB (not generic /queries) so cache is properly invalidated
              const insertRes = await fetch(BASE_URL + "submitToMasterDB", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  data: recordData,
                  username,
                  collectionName,
                })
              });

              const insertResult = await insertRes.json();
              
              if (!insertRes.ok || !insertResult.insertedId) {
                throw new Error(insertResult.error || "Failed to insert record");
              }

              // Get the inserted record ID
              const recordId = insertResult.insertedId;

              // Upload image if exists and update the record
              if (newRecordImageFile && recordId) {
                const reader = new FileReader();
                const base64Promise = new Promise((resolve) => {
                  reader.onloadend = () => resolve(reader.result.split(",")[1]);
                  reader.readAsDataURL(newRecordImageFile);
                });
                
                const base64 = await base64Promise;
                
                const imageRes = await fetch(BASE_URL + "uploadMasterImage", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    base64,
                    label: "main",
                    recordId: recordId,
                    username,
                    collectionName: collectionName
                  })
                });
                
                const imageResult = await imageRes.json();
                if (!imageRes.ok) {
                  console.warn("Image upload failed:", imageResult.error);
                  // Don't fail the entire operation if image upload fails
                }
              }

              const currentLang = localStorage.getItem("lang") || "en";
              const successMessage = translations[currentLang]?.recordAddedSuccessfully || "新規レコードが正常に追加されました！";
              alert(successMessage);
              closeAddRecordModal();
              loadMasterDB(); // Refresh data
              
            } catch (error) {
              console.error("Error adding new record:", error);
              const currentLang = localStorage.getItem("lang") || "en";
              const errorMessage = translations[currentLang]?.failedToAddRecord || "レコードの追加に失敗しました: ";
              alert(errorMessage + error.message);
            }
          }

          // Event listeners
          document.getElementById('refreshMasterBtn').addEventListener('click', () => {
            loadMasterDB();
            loadMasterFilters();
          });
          document.getElementById('addNewRecordBtn').addEventListener('click', openAddRecordModal);
          document.getElementById('masterItemsPerPageSelect').addEventListener('change', function() {
            masterItemsPerPage = parseInt(this.value);
            currentMasterPage = 1;
            loadMasterDB();
          });
          document.getElementById('masterPrevPageBtn').addEventListener('click', () => changeMasterPage(-1));
          document.getElementById('masterNextPageBtn').addEventListener('click', () => changeMasterPage(1));

          // Add Record Modal Event Listeners
          document.getElementById('newRecordImageInput').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
              newRecordImageFile = file;
              const reader = new FileReader();
              reader.onload = function(e) {
                const preview = document.getElementById('newRecordImagePreview');
                preview.innerHTML = `
                  <img src="${e.target.result}" alt="Preview" class="w-full h-32 object-contain rounded border bg-gray-50" />
                `;
              };
              reader.readAsDataURL(file);
            }
          });

          document.getElementById('addRecordForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic validation - check if at least one field is filled
            const formElements = document.getElementById('addRecordForm').elements;
            let hasData = false;
            
            for (let element of formElements) {
              if (element.name && element.value.trim()) {
                hasData = true;
                break;
              }
            }
            
            if (!hasData) {
              const currentLang = localStorage.getItem("lang") || "en";
              const alertMessage = translations[currentLang]?.pleaseEnterAtLeastOneField || "少なくとも1つのフィールドに入力してください。";
              alert(alertMessage);
              return;
            }
            
            submitNewRecord();
          });

          // Close modal on background click
          document.getElementById('addRecordModal').addEventListener('click', function(e) {
            if (e.target === this) {
              closeAddRecordModal();
            }
          });

          // Filtering logic
          // Note: Search input now uses tags, so we don't need the input listener
          ["filterFactory", "filterRL", "filterColor", "filterProcess"].forEach(id => {
            document.getElementById(id).addEventListener("change", applyMasterFilters);
          });

          function applyMasterFilters() {
            // Simple dropdown filters are now passed to the server via loadMasterDB().
            // Just reset to page 1 and re-fetch.
            currentMasterPage = 1;
            loadMasterDB();
          }

          // ==================== ADVANCED FILTER SYSTEM FOR MASTER DB ====================

          // Global state for master advanced filters
          let masterActiveFilters = [];
          let masterFilterDropdownCache = new Map();
          let masterFieldSchemas = {}; // Dynamic schemas based on actual data

          /**
           * Toggle advanced filters section
           */
          window.toggleMasterAdvancedFilters = function() {
            const content = document.getElementById('masterAdvancedFiltersContent');
            const icon = document.getElementById('masterAdvancedFiltersIcon');
            
            if (content.classList.contains('hidden')) {
              content.classList.remove('hidden');
              icon.classList.add('rotate-180');
              
              // Initialize with one filter row if empty
              if (!document.getElementById('masterFilterRowsContainer').hasChildNodes.length) {
                addMasterFilterRow();
              }
            } else {
              content.classList.add('hidden');
              icon.classList.remove('rotate-180');
            }
          };

          /**
           * Fetch all unique field names from current collection.
           * Uses /api/masterdb/schema which samples 200 docs — avoids full collection scan.
           */
          async function fetchMasterFieldNames() {
            try {
              const collectionName = currentMasterTab === 'materialDB' ? 'materialMasterDB2' : 'masterDB';
              const baseQuery = currentMasterTab === 'materialDB' ? { 工程名: "粘着工程" } : {};
              
              console.log(`📋 Fetching schema for ${collectionName}...`);

              const params = new URLSearchParams({
                collection: collectionName,
                query: JSON.stringify(baseQuery),
              });
              const res = await fetch(`${BASE_URL}api/masterdb/schema?${params}`);
              const fields = await res.json(); // string[]

              if (!Array.isArray(fields) || fields.length === 0) {
                console.warn('No schema fields returned');
                return {};
              }

              // Build schemas — for simplicity, classify fields by name heuristics.
              // The server already sampled 200 docs; we just need type hints for the filter UI.
              const schemas = {};
              fields.forEach(field => {
                if (field.toLowerCase().includes('date') || field === 'Date') {
                  schemas[field] = { type: 'date', label: field, operators: ['equals', 'range'] };
                } else {
                  // All other fields default to select (will auto-populate via distinct).
                  // The filter builder will show a text input for fields with many unique values.
                  schemas[field] = { type: 'select', label: field, operators: ['equals', 'contains', 'in'], autoPopulate: true };
                }
              });

              masterFieldSchemas = schemas;
              console.log(`✅ schema loaded: ${fields.length} fields`);
              return schemas;
            } catch (error) {
              console.error('❌ Error fetching field schema:', error);
              return {};
            }
          }

          /**
           * Add a new filter row
           */
          window.addMasterFilterRow = async function() {
            // Ensure we have field schemas
            if (Object.keys(masterFieldSchemas).length === 0) {
              await fetchMasterFieldNames();
            }

            const container = document.getElementById('masterFilterRowsContainer');
            const filterId = `master-filter-${Date.now()}`;
            const fields = Object.keys(masterFieldSchemas).sort();

            const filterRow = document.createElement('div');
            filterRow.id = filterId;
            filterRow.className = 'flex gap-2 items-start';
            const currentLang = localStorage.getItem("lang") || "en";
            const t = translations[currentLang];
            
            filterRow.innerHTML = `
              <select class="master-filter-field flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" onchange="onMasterFieldChange('${filterId}')">
                <option value="">${t.selectField}</option>
                ${fields.map(f => `<option value="${f}">${masterFieldSchemas[f].label}</option>`).join('')}
              </select>
              <select class="master-filter-operator flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" disabled>
                <option value="">${t.selectOperator}</option>
              </select>
              <div class="master-filter-value-container flex-1">
                <input type="text" class="master-filter-value w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="${t.enterValue}" disabled />
              </div>
              <button onclick="removeMasterFilterRow('${filterId}')" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <i class="ri-delete-bin-line text-lg"></i>
              </button>
            `;

            container.appendChild(filterRow);
            updateMasterActiveFiltersCount();
          };

          /**
           * Remove a filter row
           */
          window.removeMasterFilterRow = function(filterId) {
            const row = document.getElementById(filterId);
            if (row) {
              row.remove();
              updateMasterActiveFiltersCount();
            }
          };

          /**
           * Handle field selection change
           */
          window.onMasterFieldChange = function(filterId) {
            const row = document.getElementById(filterId);
            const fieldSelect = row.querySelector('.master-filter-field');
            const operatorSelect = row.querySelector('.master-filter-operator');
            const valueContainer = row.querySelector('.master-filter-value-container');
            
            const selectedField = fieldSelect.value;
            
            if (!selectedField) {
              operatorSelect.disabled = true;
              operatorSelect.innerHTML = '<option value="">Select Operator...</option>';
              valueContainer.innerHTML = '<input type="text" class="master-filter-value w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Value..." disabled />';
              return;
            }

            const fieldSchema = masterFieldSchemas[selectedField];
            
            // Populate operators
            const currentLang = localStorage.getItem("lang") || "en";
            const t = translations[currentLang];
            
            const operatorOptions = {
              'equals': t.equals,
              'contains': t.contains,
              'range': t.range,
              'greater': t.greaterThan,
              'less': t.lessThan,
              'in': t.in
            };

            operatorSelect.disabled = false;
            operatorSelect.innerHTML = `<option value="">${t.selectOperator}</option>` +
              fieldSchema.operators.map(op => `<option value="${op}" ${op === 'equals' ? 'selected' : ''}>${operatorOptions[op]}</option>`).join('');

            // Update value input based on field type
            updateMasterValueInput(filterId, selectedField, 'equals');

            // Trigger operator change to set up value input
            operatorSelect.onchange = () => onMasterOperatorChange(filterId);
            onMasterOperatorChange(filterId);
          };

          /**
           * Handle operator selection change
           */
          window.onMasterOperatorChange = function(filterId) {
            const row = document.getElementById(filterId);
            const fieldSelect = row.querySelector('.master-filter-field');
            const operatorSelect = row.querySelector('.master-filter-operator');
            
            const selectedField = fieldSelect.value;
            const selectedOperator = operatorSelect.value;
            
            if (selectedField && selectedOperator) {
              updateMasterValueInput(filterId, selectedField, selectedOperator);
            }
          };

          /**
           * Update value input based on field type and operator
           */
          async function updateMasterValueInput(filterId, field, operator) {
            const row = document.getElementById(filterId);
            const valueContainer = row.querySelector('.master-filter-value-container');
            const fieldSchema = masterFieldSchemas[field];

            // For 'range' operator, show two inputs
            if (operator === 'range') {
              if (fieldSchema.type === 'date') {
                valueContainer.innerHTML = `
                  <div class="flex gap-2">
                    <input type="date" class="master-filter-value-from w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" onchange="updateMasterActiveFiltersDisplay()" />
                    <input type="date" class="master-filter-value-to w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" onchange="updateMasterActiveFiltersDisplay()" />
                  </div>
                `;
              } else {
                valueContainer.innerHTML = `
                  <div class="flex gap-2">
                    <input type="number" class="master-filter-value-from w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="From..." oninput="updateMasterActiveFiltersDisplay()" />
                    <input type="number" class="master-filter-value-to w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="To..." oninput="updateMasterActiveFiltersDisplay()" />
                  </div>
                `;
              }
              return;
            }

            // For 'in' operator or select type with autoPopulate
            if (operator === 'in' || (fieldSchema.type === 'select' && fieldSchema.autoPopulate)) {
              const values = await fetchMasterDistinctValues(field);
              valueContainer.innerHTML = `
                <select class="master-filter-value w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" ${operator === 'in' ? 'multiple' : ''} onchange="updateMasterActiveFiltersDisplay()">
                  <option value="">Select...</option>
                  ${values.map(v => `<option value="${v}">${v}</option>`).join('')}
                </select>
              `;
              return;
            }

            // Default inputs based on type
            switch (fieldSchema.type) {
              case 'number':
                valueContainer.innerHTML = `<input type="number" class="master-filter-value w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter number..." oninput="updateMasterActiveFiltersDisplay()" />`;
                break;
              case 'date':
                valueContainer.innerHTML = `<input type="date" class="master-filter-value w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" onchange="updateMasterActiveFiltersDisplay()" />`;
                break;
              default:
                valueContainer.innerHTML = `<input type="text" class="master-filter-value w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter value..." oninput="updateMasterActiveFiltersDisplay()" />`;
            }
          }

          /**
           * Fetch distinct values for a field (with caching)
           */
          async function fetchMasterDistinctValues(field) {
            const cacheKey = `${currentMasterTab}_${field}`;
            const cached = masterFilterDropdownCache.get(cacheKey);
            const now = Date.now();

            if (cached && (now - cached.timestamp < 300000)) { // 5 minutes cache
              return cached.values;
            }

            try {
              const collectionName = currentMasterTab === 'materialDB' ? 'materialMasterDB2' : 'masterDB';
              const filter = currentMasterTab === 'materialDB' ? { 工程名: "粘着工程" } : {};
              
              const res = await fetch(BASE_URL + "api/distinct", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  dbName: "Sasaki_Coating_MasterDB",
                  collectionName: collectionName,
                  field: field,
                  filter: filter
                })
              });

              const result = await res.json();
              const values = result.values || [];
              
              masterFilterDropdownCache.set(cacheKey, {
                values: values,
                timestamp: now
              });

              return values;
            } catch (error) {
              console.error(`Error fetching distinct values for ${field}:`, error);
              return [];
            }
          }

          /**
           * Build MongoDB query from advanced filters
           */
          async function buildMasterDynamicQuery() {
            const container = document.getElementById('masterFilterRowsContainer');
            const rows = container.querySelectorAll('[id^="master-filter-"]');
            const query = {};

            for (const row of rows) {
              const fieldSelect = row.querySelector('.master-filter-field');
              const operatorSelect = row.querySelector('.master-filter-operator');
              
              const field = fieldSelect.value;
              const operator = operatorSelect.value;

              if (!field || !operator) continue;

              const valueInput = row.querySelector('.master-filter-value');
              const valueFrom = row.querySelector('.master-filter-value-from');
              const valueTo = row.querySelector('.master-filter-value-to');

              let value;

              // Handle different input types
              if (operator === 'range' && valueFrom && valueTo) {
                const from = valueFrom.value;
                const to = valueTo.value;
                if (from && to) {
                  query[field] = { $gte: from, $lte: to };
                }
                continue;
              }

              if (operator === 'in') {
                const select = row.querySelector('.master-filter-value');
                value = Array.from(select.selectedOptions).map(opt => opt.value).filter(v => v);
                if (value.length > 0) {
                  query[field] = { $in: value };
                }
                continue;
              }

              value = valueInput?.value;
              if (!value) continue;

              // Apply operator
              switch (operator) {
                case 'equals':
                  query[field] = value;
                  break;
                case 'contains':
                  query[field] = { $regex: value, $options: 'i' };
                  break;
                case 'greater':
                  query[field] = { $gt: parseFloat(value) };
                  break;
                case 'less':
                  query[field] = { $lt: parseFloat(value) };
                  break;
              }
            }

            console.log('🔍 Built master query:', query);
            return query;
          }

          /**
           * Apply advanced filters
           */
          window.applyMasterAdvancedFilters = async function() {
            try {
              // Build MongoDB query from the UI filter rows
              const advancedQuery = await buildMasterDynamicQuery();
              masterAdvancedFilterQuery = advancedQuery;

              currentMasterPage = 1;
              await loadMasterDB();

              updateMasterActiveFiltersCount();

              // Show batch edit button if advanced filters are applied and have results
              const batchEditButton = document.getElementById('masterBatchEditButtonContainer');
              const batchEditCount  = document.getElementById('masterBatchEditCount');

              if (Object.keys(advancedQuery).length > 0 && masterFilteredCount > 0) {
                batchEditCount.textContent = masterFilteredCount;
                batchEditButton.classList.remove('hidden');
              } else {
                batchEditButton.classList.add('hidden');
              }

              console.log(`✅ Applied advanced filters: ${masterFilteredCount} results`);
            } catch (error) {
              console.error('❌ Error applying advanced filters:', error);
              alert('Failed to apply filters. Please try again.');
            }
          };

          /**
           * Update active filters count badge and display
           */
          function updateMasterActiveFiltersCount() {
            const container = document.getElementById('masterFilterRowsContainer');
            const rows = container.querySelectorAll('[id^="master-filter-"]');
            
            let activeCount = 0;
            rows.forEach(row => {
              const field = row.querySelector('.master-filter-field').value;
              const operator = row.querySelector('.master-filter-operator').value;
              if (field && operator) activeCount++;
            });

            const badge = document.getElementById('masterActiveFiltersCount');
            if (activeCount > 0) {
              badge.textContent = activeCount;
              badge.classList.remove('hidden');
            } else {
              badge.classList.add('hidden');
            }

            // Update active filters display
            updateMasterActiveFiltersDisplay();
          }

          /**
           * Update active filters display with badges
           */
          window.updateMasterActiveFiltersDisplay = function() {
            const filterRows = document.querySelectorAll('[id^="master-filter-"]');
            const activeFiltersDisplay = document.getElementById('masterActiveFiltersDisplay');
            const activeFilterBadges = document.getElementById('masterActiveFilterBadges');
            
            let count = 0;
            let badges = '';
            
            // Generate badges for each active filter
            filterRows.forEach(row => {
              const fieldSelect = row.querySelector('.master-filter-field');
              const operatorSelect = row.querySelector('.master-filter-operator');
              const valueInput = row.querySelector('.master-filter-value');
              const valueFrom = row.querySelector('.master-filter-value-from');
              const valueTo = row.querySelector('.master-filter-value-to');
              
              if (fieldSelect?.value && operatorSelect?.value) {
                const field = fieldSelect.value;
                const operator = operatorSelect.value;
                const fieldSchema = masterFieldSchemas[field];
                
                let displayValue = '';
                
                // Handle range operator
                if (operator === 'range' && valueFrom && valueTo) {
                  const from = valueFrom.value;
                  const to = valueTo.value;
                  if (from && to) {
                    displayValue = `${from} to ${to}`;
                    count++;
                  } else {
                    return; // Skip incomplete ranges
                  }
                }
                // Handle 'in' operator (multi-select)
                else if (operator === 'in') {
                  const select = row.querySelector('.master-filter-value');
                  const selectedOptions = Array.from(select?.selectedOptions || []).map(opt => opt.value).filter(v => v);
                  if (selectedOptions.length > 0) {
                    displayValue = selectedOptions.length > 2 
                      ? `${selectedOptions.slice(0, 2).join(', ')}... (+${selectedOptions.length - 2})`
                      : selectedOptions.join(', ');
                    count++;
                  } else {
                    return; // Skip empty selections
                  }
                }
                // Handle regular operators
                else {
                  const value = valueInput?.value;
                  if (value) {
                    displayValue = value;
                    count++;
                  } else {
                    return; // Skip empty values
                  }
                }
                
                // Operator display names
                const operatorNames = {
                  'equals': 'equals',
                  'contains': 'contains',
                  'range': 'range',
                  'greater': '>',
                  'less': '<',
                  'in': 'in'
                };
                
                badges += `
                  <span class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                    <span class="font-medium">${fieldSchema?.label || field}:</span>
                    <span class="text-blue-600">${operatorNames[operator]}</span>
                    <span class="text-blue-800">"${displayValue}"</span>
                    <button onclick="removeMasterFilterRow('${row.id}')" class="ml-1 hover:text-blue-900 hover:bg-blue-200 rounded p-0.5">
                      <i class="ri-close-line text-sm"></i>
                    </button>
                  </span>
                `;
              }
            });
            
            // Show or hide the active filters section
            if (count > 0) {
              activeFiltersDisplay.classList.remove('hidden');
              activeFilterBadges.innerHTML = badges;
            } else {
              activeFiltersDisplay.classList.add('hidden');
              activeFilterBadges.innerHTML = '';
            }
          };

          /**
           * Clear all active filters
           */
          window.clearAllMasterFilters = function() {
            // Remove all filter rows
            const container = document.getElementById('masterFilterRowsContainer');
            container.innerHTML = '';
            
            // Reset advanced filter query state
            masterAdvancedFilterQuery = {};
            
            // Update display
            updateMasterActiveFiltersCount();
            
            // Hide batch edit button
            document.getElementById('masterBatchEditButtonContainer').classList.add('hidden');
            
            // Reload data without filters
            loadMasterDB();
          };

          // ==================== BATCH EDIT SYSTEM ====================

          // Store filtered records for batch edit
          let batchEditRecords = [];
          let batchEditIds = []; // All matching record IDs (from /api/masterdb/ids)
          let batchEditChanges = {}; // Store {fieldName: newValue}
          let currentEditingField = null;
          let existingFactories = []; // Cache for factory validation

          /**
           * Open batch edit modal with two-panel design
           */
          window.openMasterBatchEditModal = async function() {
            // Use current page data for preview cards; use server count for total
            batchEditRecords = [...masterData];
            const totalMatchCount = masterFilteredCount;

            if (totalMatchCount === 0) {
              alert('No records to edit. Please apply filters first.');
              return;
            }

            // Fetch all matching IDs for the actual batch update
            try {
              const collectionName = currentMasterTab === 'materialDB' ? 'materialMasterDB2' : currentMasterTab;
              const baseQuery = currentMasterTab === 'materialDB' ? { 工程名: "粘着工程" } : {};
              const fullQuery = Object.keys(masterAdvancedFilterQuery).length
                ? { $and: [baseQuery, masterAdvancedFilterQuery] }
                : baseQuery;

              const idsRes = await fetch(BASE_URL + 'api/masterdb/ids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collectionName, query: fullQuery }),
              });
              batchEditIds = await idsRes.json(); // string[]
            } catch (e) {
              console.error('❌ Failed to fetch batch edit IDs:', e);
              batchEditIds = [];
            }

            // Reset state
            batchEditChanges = {};
            currentEditingField = null;

            // Update record counts in multiple places
            document.getElementById('batchEditRecordCount').textContent = totalMatchCount;
            
            // Update footer record count
            const footerCount = document.getElementById('footerRecordCount');
            if (footerCount) footerCount.textContent = totalMatchCount;
            
            // Update preview info
            const currentLang = localStorage.getItem("lang") || "en";
            const t = translations[currentLang];
            
            const previewInfo = document.getElementById('batchEditPreviewInfo');
            if (previewInfo) {
              const previewCount = Math.min(5, batchEditRecords.length);
              previewInfo.textContent = `(${t.showing || 'showing'} ${previewCount} ${t.of || 'of'} ${totalMatchCount} ${t.totalRecords || 'total records'})`;
            }
            
            // Generate field tags (left panel)
            generateFieldTags();
            
            // Hide active edit section initially
            const activeSection = document.getElementById('batchEditActiveSection');
            if (activeSection) activeSection.classList.add('hidden');
            
            // Clear changes list
            const changesList = document.getElementById('batchEditChangesList');
            if (changesList) {
              const noChangesMsg = t.noChangesYet || 'No changes yet. Click field tags above to start editing.';
              changesList.innerHTML = `<p class="text-xs text-gray-400 italic">${noChangesMsg}</p>`;
            }
            
            // Generate preview cards (right panel)
            generatePreviewCards();
            
            // Show modal first
            document.getElementById('masterBatchEditModal').classList.remove('hidden');
            
            // Then apply translations after modal is visible
            setTimeout(() => {
              if (typeof window.applyLanguageEnhanced === 'function') {
                window.applyLanguageEnhanced();
              }
              
              // Force update the instructions element specifically
              const instructionsEl = document.querySelector('[data-i18n="batchEditInstructions"]');
              if (instructionsEl) {
                const currentLang = localStorage.getItem("lang") || "en";
                if (translations[currentLang] && translations[currentLang].batchEditInstructions) {
                  instructionsEl.innerHTML = translations[currentLang].batchEditInstructions;
                }
              }
            }, 50);
          };

          /**
           * Close batch edit modal
           */
          window.closeMasterBatchEditModal = function() {
            document.getElementById('masterBatchEditModal').classList.add('hidden');
            batchEditRecords = [];
            batchEditChanges = {};
            currentEditingField = null;
          };

          /**
           * Generate clickable field tags
           */
          function generateFieldTags() {
            const container = document.getElementById('batchEditFieldTags');
            
            // Get all fields from schema (exclude _id and imageURL)
            const fields = Object.keys(masterFieldSchemas)
              .filter(f => f !== '_id' && f !== 'imageURL')
              .sort();
            
            let html = '';
            fields.forEach(field => {
              const schema = masterFieldSchemas[field];
              html += `
                <button 
                  onclick="handleFieldTagClick('${field}')"
                  class="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full text-sm font-medium transition-colors"
                >
                  ${schema.label}
                </button>
              `;
            });
            
            container.innerHTML = html;
          }

          /**
           * Handle field tag click - show active edit section
           */
          window.handleFieldTagClick = async function(field) {
            currentEditingField = field;
            const schema = masterFieldSchemas[field];
            const section = document.getElementById('batchEditActiveSection');
            const fieldNameElem = document.getElementById('activeFieldLabel');
            const input = document.getElementById('batchEditActiveInput');
            
            if (!section || !fieldNameElem || !input) {
              console.error('❌ Batch edit elements not found');
              return;
            }
            
            // Update field name display
            fieldNameElem.textContent = schema.label;
            
            // Set input type and attributes based on field type
            switch (schema.type) {
              case 'number':
                input.type = 'number';
                input.placeholder = 'Enter new number...';
                break;
              
              case 'date':
                input.type = 'date';
                input.placeholder = '';
                break;
              
              case 'select':
                if (schema.autoPopulate) {
                  // Replace input with select element + hidden text input for new values
                  const selectHTML = `
                    <select id="batchEditActiveInput" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" onchange="handleBatchEditSelectChange('${field}')">
                      <option value="">Loading options...</option>
                    </select>
                    <input type="text" id="batchEditCustomInput" class="hidden flex-1 px-3 py-2 border-2 border-amber-400 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500" placeholder="Enter custom value..." />
                  `;
                  input.outerHTML = selectHTML;
                  
                  // Load dropdown options
                  setTimeout(async () => {
                    const values = await fetchMasterDistinctValues(field);
                    const select = document.getElementById('batchEditActiveInput');
                    if (select) {
                      select.innerHTML = '<option value="">Select new value...</option>' +
                        values.map(v => `<option value="${v}">${v}</option>`).join('') +
                        '<option value="__ADD_NEW__" class="font-semibold text-green-700">➕ Add New Value</option>';
                      
                      // If editing existing change, set the value
                      if (batchEditChanges[field] !== undefined) {
                        const existingValue = batchEditChanges[field];
                        // Check if it's an existing option
                        if (values.includes(existingValue)) {
                          select.value = existingValue;
                        } else {
                          // It's a custom value, show custom input
                          select.value = '__ADD_NEW__';
                          const customInput = document.getElementById('batchEditCustomInput');
                          if (customInput) {
                            customInput.value = existingValue;
                            select.classList.add('hidden');
                            customInput.classList.remove('hidden');
                          }
                        }
                      }
                    }
                  }, 0);
                  
                  // Show section and exit (since we replaced the element)
                  section.classList.remove('hidden');
                  return;
                } else {
                  input.type = 'text';
                  input.placeholder = 'Enter new value...';
                }
                break;
              
              default:
                input.type = 'text';
                input.placeholder = 'Enter new value...';
            }
            
            // If editing existing change, load the value
            if (batchEditChanges[field] !== undefined) {
              input.value = batchEditChanges[field];
            } else {
              input.value = '';
            }
            
            // Show section
            section.classList.remove('hidden');
            
            // Focus input
            setTimeout(() => {
              const focusInput = document.getElementById('batchEditActiveInput');
              if (focusInput) focusInput.focus();
            }, 100);
          };

          /**
           * Handle select dropdown change - show custom input if "Add New Value" selected
           */
          window.handleBatchEditSelectChange = function(field) {
            const select = document.getElementById('batchEditActiveInput');
            const customInput = document.getElementById('batchEditCustomInput');
            const warningText = document.getElementById('customValueWarning');
            
            if (!select || !customInput) return;
            
            if (select.value === '__ADD_NEW__') {
              // User selected "Add New Value" - show custom input
              const schema = masterFieldSchemas[field];
              const fieldLabel = schema ? schema.label : field;
              
              // Show warning for certain fields
              if (field === '工場' || field === 'Factory') {
                const currentLang = localStorage.getItem("lang") || "en";
                const t = translations[currentLang];
                const message = t.factoryValidationWarning.replace('{field}', fieldLabel);
                alert(message);
              }
              
              // Hide select, show custom input
              select.classList.add('hidden');
              customInput.classList.remove('hidden');
              
              // Show warning text
              if (warningText) warningText.classList.remove('hidden');
              
              // Focus and clear
              customInput.focus();
              customInput.value = '';
            } else {
              // Regular value selected, hide warning
              if (warningText) warningText.classList.add('hidden');
            }
          };

          /**
           * Cancel field edit - hide active section
           */
          window.cancelFieldEdit = function() {
            const section = document.getElementById('batchEditActiveSection');
            if (section) section.classList.add('hidden');
            currentEditingField = null;
            
            // Reset any custom inputs
            const customInput = document.getElementById('batchEditCustomInput');
            const select = document.getElementById('batchEditActiveInput');
            const warningText = document.getElementById('customValueWarning');
            
            if (customInput && select) {
              customInput.classList.add('hidden');
              select.classList.remove('hidden');
            }
            
            // Hide warning text
            if (warningText) warningText.classList.add('hidden');
          };

          /**
           * Add field to changes list
           */
          window.addFieldToChangesList = async function() {
            if (!currentEditingField) return;
            
            const field = currentEditingField;
            const schema = masterFieldSchemas[field];
            
            // Get value from either the select or custom input
            let newValue = '';
            const input = document.getElementById('batchEditActiveInput');
            const customInput = document.getElementById('batchEditCustomInput');
            
            const currentLang = localStorage.getItem("lang") || "en";
            const t = translations[currentLang];
            
            // Check if custom input is visible (user is adding new value)
            if (customInput && !customInput.classList.contains('hidden')) {
              newValue = customInput.value.trim();
              
              // Show warning for new custom values
              if (newValue !== '') {
                const message = t.customValueWarning
                  .replace('{field}', schema.label)
                  .replace('{value}', newValue);
                const confirmCustom = confirm(message);
                if (!confirmCustom) return;
              }
            } else if (input) {
              // Regular input or select
              newValue = input.value.trim();
              
              // If select shows "Add New Value" but custom input not shown, invalid state
              if (newValue === '__ADD_NEW__') {
                alert(t.enterCustomValuePrompt || 'Please enter a custom value or select a different option.');
                return;
              }
            } else {
              console.error('❌ Input element not found');
              return;
            }
            
            // Check if empty
            if (newValue === '') {
              const currentLang = localStorage.getItem("lang") || "en";
              const t = translations[currentLang];
              const message = t.emptyValueWarning
                .replace('{field}', schema.label)
                .replace('{count}', batchEditRecords.length);
              const confirmEmpty = confirm(message);
              if (!confirmEmpty) return;
            }
            
            // Special validation for 工場 field (only if not from custom input - we already warned)
            const isCustomValue = customInput && !customInput.classList.contains('hidden');
            if (field === '工場' && !isCustomValue && newValue !== '') {
              const isValid = await validateFactoryField(newValue);
              if (!isValid) {
                return; // Validation function shows its own alerts
              }
            }
            
            // Add to changes object
            batchEditChanges[field] = newValue;
            
            // Update changes list display
            renderChangesList();
            
            // Update preview cards
            updatePreviewsInRealTime();
            
            // Hide active section
            cancelFieldEdit();
          };

          /**
           * Render changes list with edit/delete buttons
           */
          function renderChangesList() {
            const container = document.getElementById('batchEditChangesList');
            
            const fields = Object.keys(batchEditChanges);
            
            if (fields.length === 0) {
              container.innerHTML = '<p class="text-gray-400 italic text-sm text-center py-4">No changes yet</p>';
              return;
            }
            
            let html = '<div class="space-y-2">';
            fields.forEach(field => {
              const schema = masterFieldSchemas[field];
              const value = batchEditChanges[field];
              const displayValue = value === '' ? '<span class="text-red-500 italic">(empty)</span>' : value;
              
              html += `
                <div class="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                  <div class="flex-1">
                    <span class="font-medium text-sm">${schema.label}:</span>
                    <span class="ml-2 text-green-600">${displayValue}</span>
                  </div>
                  <div class="flex gap-2">
                    <button 
                      onclick="editChangeItem('${field}')"
                      class="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded"
                    >
                      Edit
                    </button>
                    <button 
                      onclick="deleteChangeItem('${field}')"
                      class="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              `;
            });
            html += '</div>';
            
            container.innerHTML = html;
          }

          /**
           * Edit change item - load back to active section
           */
          window.editChangeItem = function(field) {
            handleFieldTagClick(field);
          };

          /**
           * Delete change item
           */
          window.deleteChangeItem = function(field) {
            delete batchEditChanges[field];
            renderChangesList();
            updatePreviewsInRealTime();
          };

          /**
           * Generate preview cards (first 5 records)
           */
          function generatePreviewCards() {
            const container = document.getElementById('batchEditPreviewContainer');
            
            const previewRecords = batchEditRecords.slice(0, 5);
            const totalCount = batchEditRecords.length;
            
            if (previewRecords.length === 0) {
              container.innerHTML = '<p class="text-gray-400 italic text-center py-8">No records to preview</p>';
              return;
            }
            
            let html = '';
            previewRecords.forEach((record, index) => {
              html += formatDocumentCard(record, index + 1, totalCount);
            });
            
            container.innerHTML = html;
          }

          /**
           * Format single document as card
           */
          function formatDocumentCard(record, index, total) {
            const cardId = `preview-card-${index}`;
            
            let html = `
              <div id="${cardId}" class="bg-white border border-gray-300 rounded-lg p-4 mb-3">
                <div class="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                  <h4 class="font-semibold text-gray-900">Document ${index} of ${total}</h4>
                  <span class="text-xs text-gray-500">Preview</span>
                </div>
                <div class="space-y-2 text-sm">
            `;
            
            // Get all fields
            const fields = Object.keys(masterFieldSchemas).filter(f => f !== '_id');
            
            fields.forEach(field => {
              const schema = masterFieldSchemas[field];
              const currentValue = record[field] !== undefined && record[field] !== null ? String(record[field]) : '';
              const hasChange = batchEditChanges[field] !== undefined;
              const newValue = hasChange ? batchEditChanges[field] : '';
              
              if (hasChange) {
                // Show old value with red strikethrough and new value in green
                html += `
                  <div class="flex justify-between py-1">
                    <span class="font-medium text-gray-700 w-1/3">${schema.label}:</span>
                    <span class="w-2/3">
                      <span class="text-red-600 line-through mr-2">${currentValue || '(empty)'}</span>
                      <span class="text-green-600 font-semibold">→ ${newValue || '(empty)'}</span>
                    </span>
                  </div>
                `;
              } else {
                // Show current value normally
                html += `
                  <div class="flex justify-between py-1">
                    <span class="font-medium text-gray-700 w-1/3">${schema.label}:</span>
                    <span class="text-gray-900 w-2/3">${currentValue || '(empty)'}</span>
                  </div>
                `;
              }
            });
            
            html += `
                </div>
              </div>
            `;
            
            return html;
          }

          /**
           * Update preview cards in real-time with changes
           */
          function updatePreviewsInRealTime() {
            const previewRecords = batchEditRecords.slice(0, 5);
            const totalCount = batchEditRecords.length;
            
            previewRecords.forEach((record, index) => {
              const cardId = `preview-card-${index + 1}`;
              const cardElem = document.getElementById(cardId);
              
              if (cardElem) {
                // Regenerate card HTML
                const newHTML = formatDocumentCard(record, index + 1, totalCount);
                cardElem.outerHTML = newHTML;
              }
            });
          }

          /**
           * Validate factory field with nearest match suggestion
           */
          async function validateFactoryField(newValue) {
            const currentLang = localStorage.getItem("lang") || "en";
            const t = translations[currentLang];
            
            // Load existing factories if not cached
            if (existingFactories.length === 0) {
              try {
                const values = await fetchMasterDistinctValues('工場');
                existingFactories = values || [];
              } catch (error) {
                console.error('Failed to load factory list:', error);
                existingFactories = [];
              }
            }
            
            // Check if exact match exists
            if (existingFactories.includes(newValue)) {
              return true; // Valid
            }
            
            // Find nearest match
            const nearest = findNearestMatch(newValue, existingFactories);
            
            if (nearest) {
              const message = t.factoryNotFoundSuggestion
                .replace('{value}', newValue)
                .replace('{suggestion}', nearest)
                .replace('{suggestion}', nearest); // Replace twice for both occurrences
              
              const useNearest = confirm(message);
              
              if (useNearest) {
                // Update input with nearest match
                const input = document.getElementById('batchEditActiveInput');
                if (input) input.value = nearest;
                return false; // Return false to not add yet, user should click Add again
              }
            } else {
              const message = t.factoryNotFoundConfirm.replace('{value}', newValue);
              const continueAnyway = confirm(message);
              
              if (!continueAnyway) return false;
            }
            
            return true;
          }

          /**
           * Find nearest match using simple string similarity
           */
          function findNearestMatch(value, existingValues) {
            if (!value || existingValues.length === 0) return null;
            
            const valueLower = value.toLowerCase();
            let bestMatch = null;
            let bestScore = 0;
            
            existingValues.forEach(existing => {
              const existingLower = existing.toLowerCase();
              
              // Calculate similarity score
              let score = 0;
              
              // Exact match
              if (existingLower === valueLower) {
                score = 100;
              }
              // Contains or is contained
              else if (existingLower.includes(valueLower) || valueLower.includes(existingLower)) {
                score = 80;
              }
              // Same first 3 characters
              else if (existingLower.substring(0, 3) === valueLower.substring(0, 3)) {
                score = 60;
              }
              // Levenshtein-like: count matching characters
              else {
                let matches = 0;
                for (let char of valueLower) {
                  if (existingLower.includes(char)) matches++;
                }
                score = (matches / Math.max(valueLower.length, existingLower.length)) * 50;
              }
              
              if (score > bestScore) {
                bestScore = score;
                bestMatch = existing;
              }
            });
            
            // Return match only if score is reasonable
            return bestScore > 40 ? bestMatch : null;
          }

          /**
           * Confirm and execute batch edit
           */
          window.confirmMasterBatchEdit = async function() {
            const currentLang = localStorage.getItem("lang") || "en";
            const t = translations[currentLang];
            
            // Check if any changes
            if (Object.keys(batchEditChanges).length === 0) {
              alert(t.noChangesToApply);
              return;
            }
            
            const updates = { ...batchEditChanges };
            const fieldCount = Object.keys(updates).length;
              const recordCount = batchEditIds.length || batchEditRecords.length;
            let changesSummary = Object.keys(updates).map(field => {
              const schema = masterFieldSchemas[field];
              const value = updates[field] === '' ? '(empty)' : updates[field];
              return `  • ${schema.label} → ${value}`;
            }).join('\n');
            
            const confirmMessage = t.batchUpdateConfirm
              .replace('{count}', recordCount)
              .replace('{changes}', changesSummary);
            
            if (!confirm(confirmMessage)) {
              return;
            }
            
            try {
              // Get current user
              const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
              const username = currentUser.username || 'unknown';
              
              // Get collection name
              const collectionName = currentMasterTab === 'materialDB' ? 'materialMasterDB2' : 'masterDB';
              
              // Use pre-fetched IDs (from /api/masterdb/ids) for all matching records
              const recordIds = batchEditIds.length
                ? batchEditIds
                : batchEditRecords.map(record => {
                    if (record._id && record._id.$oid) return record._id.$oid;
                    return record._id;
                  }).filter(id => id);
              
              console.log('🔄 Batch updating records:', {
                count: recordIds.length,
                updates: updates,
                collection: collectionName
              });
              
              // Send batch update request
              const response = await fetch(BASE_URL + 'batchUpdateMasterRecords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  recordIds: recordIds,
                  updates: updates,
                  username: username,
                  collectionName: collectionName
                })
              });
              
              const currentLang = localStorage.getItem("lang") || "en";
              const t = translations[currentLang];
              
              const result = await response.json();
              
              if (response.ok && result.success) {
                const message = t.batchUpdateSuccess.replace('{count}', result.modifiedCount);
                alert(message);
                
                // Close modal
                closeMasterBatchEditModal();
                
                // Reload data
                applyMasterAdvancedFilters();
              } else {
                throw new Error(result.error || 'Update failed');
              }
              
            } catch (error) {
              console.error('❌ Batch update error:', error);
              const currentLang = localStorage.getItem("lang") || "en";
              const t = translations[currentLang];
              const message = t.batchUpdateFailed.replace('{error}', error.message);
              alert(message);
            }
          };

          // ==================== END BATCH EDIT SYSTEM ====================

          // ==================== MASTER SEARCH TAGS SYSTEM ====================

          let masterSearchTags = [];

          /**
           * Handle keydown in master search input
           */
          window.handleMasterSearchKeydown = function(event) {
            if (event.key === 'Enter' && event.target.value.trim()) {
              event.preventDefault();
              window.addMasterSearchTag(event.target.value.trim());
              event.target.value = '';
            } else if (event.key === 'Backspace' && !event.target.value && masterSearchTags.length > 0) {
              // Remove last tag when backspace is pressed on empty input
              window.removeMasterSearchTag(masterSearchTags.length - 1);
            }
          };

          /**
           * Handle blur (when user clicks away) - add tag if there's a value
           */
          window.handleMasterSearchBlur = function(event) {
            if (event.target.value.trim()) {
              window.addMasterSearchTag(event.target.value.trim());
              event.target.value = '';
            }
          };

          /**
           * Add a search tag
           */
          window.addMasterSearchTag = function(value) {
            if (!masterSearchTags.includes(value)) {
              masterSearchTags.push(value);
              renderMasterSearchTags();
              // Trigger search automatically when tag is added
              applyMasterFilters();
            }
          };

          /**
           * Remove a search tag by index
           */
          window.removeMasterSearchTag = function(index) {
            masterSearchTags.splice(index, 1);
            renderMasterSearchTags();
            // Trigger search automatically when tag is removed
            applyMasterFilters();
          };

          /**
           * Render search tags in the container
           */
          function renderMasterSearchTags() {
            const container = document.getElementById('masterSearchTags');
            if (!container) return;
            
            const input = container.querySelector('input');
            const clearBtn = document.getElementById('clearSearchTagsBtn');
            
            // Remove existing tags
            container.querySelectorAll('.search-tag').forEach(tag => tag.remove());
            
            // Add tags before input
            masterSearchTags.forEach((tag, index) => {
              const tagElement = document.createElement('span');
              tagElement.className = 'search-tag inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium';
              tagElement.innerHTML = `
                ${tag}
                <button type="button" onclick="removeMasterSearchTag(${index})" class="hover:bg-blue-200 rounded-full px-1 ml-1 font-bold text-base leading-none">×</button>
              `;
              container.insertBefore(tagElement, input);
            });
            
            // Show/hide clear button based on tag count
            if (clearBtn) {
              if (masterSearchTags.length > 0) {
                clearBtn.classList.remove('hidden');
              } else {
                clearBtn.classList.add('hidden');
              }
            }
          }

          /**
           * Focus the search input when container is clicked
           */
          window.focusMasterSearchInput = function() {
            const input = document.getElementById('masterSearchInput');
            if (input) input.focus();
          };

          /**
           * Get all search tags
           */
          function getMasterSearchTags() {
            return masterSearchTags;
          }

          /**
           * Clear all search tags
           */
          window.clearAllMasterSearchTags = function() {
            masterSearchTags = [];
            renderMasterSearchTags();
            applyMasterFilters();
          };

          // ==================== END MASTER SEARCH TAGS SYSTEM ====================

          // ==================== END ADVANCED FILTER SYSTEM ====================

          async function loadMasterFilters() {
            try {
              
              // Show loading state for all dropdowns
              const dropdowns = [
                { id: 'filterFactory', label: 'Factory' },
                { id: 'filterRL', label: 'R/L' }, 
                { id: 'filterColor', label: 'Color' },
                { id: 'filterProcess', label: 'Equipment' }
              ];
              
              dropdowns.forEach(({ id, label }) => {
                const select = document.getElementById(id);
                if (select) {
                  select.innerHTML = `<option value="">Loading ${label}...</option>`;
                  select.disabled = true;
                }
              });

              // Load factories from batch endpoint first
              try {
                const collections = ['kensaDB', 'pressDB', 'SRSDB', 'slitDB'];
                const factoryResponse = await fetch(`${BASE_URL}api/factories/batch`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ collections })
                });

                if (factoryResponse.ok) {
                  const factoryResult = await factoryResponse.json();
                  
                  if (factoryResult.success && factoryResult.results) {
                    // Combine all factories from all collections and remove duplicates
                    const allFactories = new Set();
                    
                    Object.keys(factoryResult.results).forEach(collection => {
                      if (factoryResult.results[collection].factories) {
                        factoryResult.results[collection].factories.forEach(factory => {
                          // Only add non-null, non-empty factories
                          if (factory && factory.trim() !== '') {
                            allFactories.add(factory.trim());
                          }
                        });
                      }
                    });
                    
                    const uniqueFactories = Array.from(allFactories).sort();
                    console.log(`✅ Master DB: Combined ${uniqueFactories.length} unique factories from all collections:`, uniqueFactories);
                    populateMasterDropdown('filterFactory', uniqueFactories, 'All Factory');
                  }
                } else {
                  console.error('❌ Failed to load factories from batch endpoint');
                  populateMasterDropdown('filterFactory', [], 'All Factory');
                }
              } catch (error) {
                console.error('❌ Error loading factories from batch endpoint:', error);
                populateMasterDropdown('filterFactory', [], 'All Factory');
              }

              // Determine other API endpoints based on current tab (excluding factories)
              let otherEndpoints;
              if (currentMasterTab === '内製品DB') {
                // For Master DB (内製品DB)
                otherEndpoints = [
                  { endpoint: 'api/masterdb/rl', selectId: 'filterRL', label: 'All R/L' },
                  { endpoint: 'api/masterdb/colors', selectId: 'filterColor', label: 'All Color' },
                  { endpoint: 'api/masterdb/equipment', selectId: 'filterProcess', label: 'All Equipment' }
                ];
              } else {
                // For Material DB (材料DB) - use similar endpoints or create new ones
                otherEndpoints = [
                  { endpoint: 'api/masterdb/rl', selectId: 'filterRL', label: 'All R/L' },
                  { endpoint: 'api/masterdb/colors', selectId: 'filterColor', label: 'All Color' },
                  { endpoint: 'api/masterdb/materials', selectId: 'filterProcess', label: 'All Material' }
                ];
              }

              // Load all other filter values in parallel for better performance
              const promises = otherEndpoints.map(async ({ endpoint, selectId, label }) => {
                try {
                  const response = await fetch(`${BASE_URL}${endpoint}`);
                  const data = await response.json();
                  
                  if (data.success && data.data) {
                    populateMasterDropdown(selectId, data.data, label);
                    //console.log(`✅ Loaded ${data.data.length} options for ${selectId}`);
                  } else {
                    console.warn(`⚠️ No data received for ${endpoint}`);
                    populateMasterDropdown(selectId, [], label);
                  }
                } catch (error) {
                  console.error(`❌ Error loading ${endpoint}:`, error);
                  populateMasterDropdown(selectId, [], label);
                }
              });

              await Promise.all(promises);

            } catch (error) {
              console.error('❌ Error loading Master DB filters:', error);
              
              // Reset dropdowns to default state on error
              const dropdowns = [
                { id: 'filterFactory', label: 'All Factory' },
                { id: 'filterRL', label: 'All R/L' },
                { id: 'filterColor', label: 'All Color' },
                { id: 'filterProcess', label: 'All Equipment' }
              ];
              
              dropdowns.forEach(({ id, label }) => {
                populateMasterDropdown(id, [], label);
              });
            }
          }

          // Helper function to populate Master DB dropdowns
          function populateMasterDropdown(selectId, values, defaultLabel) {
            const select = document.getElementById(selectId);
            if (!select) {
              console.warn(`Dropdown with ID '${selectId}' not found`);
              return;
            }

            // Clear existing options
            select.innerHTML = '';
            
            // Add "All" option
            const allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = defaultLabel;
            allOption.setAttribute('data-i18n', 'all');
            select.appendChild(allOption);

            // Add unique values
            values.forEach(value => {
              if (value && value.trim()) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                select.appendChild(option);
              }
            });

            // Re-enable the dropdown
            select.disabled = false;
          }

          loadMasterDB();
          loadMasterFilters();
          
          // Initialize field schemas for advanced filters
          fetchMasterFieldNames().then(() => {
            console.log('✅ Master DB field schemas initialized');
          });
          
          // Make currentMasterTab globally accessible
          window.currentMasterTab = currentMasterTab;
          
          if (typeof applyLanguageEnhanced === 'function') {
            applyLanguageEnhanced();
          } else if (typeof applyLanguage === 'function') {
            applyLanguage();
          }
          break;

        case "equipment":
          mainContent.innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow mb-6">
              <h2 class="text-2xl font-semibold mb-4" data-i18n="equipmentTitle">Equipment Management</h2>
              <div id="equipmentFilters" class="mb-6">
                <div class="flex flex-wrap gap-4 mb-4">
                  <div class="flex-1 min-w-48">
                    <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="dateRange">Date Range</label>
                    <div class="flex gap-2">
                      <input type="date" id="equipmentStartDate" class="p-2 border rounded-md">
                      <input type="date" id="equipmentEndDate" class="p-2 border rounded-md">
                    </div>
                  </div>
                  <div class="flex-1 min-w-48">
                    <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="equipmentFilter">Equipment Filter (by Factory)</label>
                    <div class="mb-2">
                      <button onclick="toggleAllEquipment(true)" class="text-xs text-blue-600 hover:text-blue-800 mr-2" data-i18n="selectAll">Select All</button>
                      <button onclick="toggleAllEquipment(false)" class="text-xs text-blue-600 hover:text-blue-800" data-i18n="deselectAll">Deselect All</button>
                    </div>
                    <div id="equipmentCheckboxes" class="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md bg-gray-50"></div>
                  </div>
                  <div class="flex flex-col justify-end">
                    <button onclick="applyEquipmentFilters()" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700" data-i18n="applyFilters">Apply Filters</button>
                    <button onclick="exportEquipmentPDF()" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 mt-2" data-i18n="exportPDF">Export PDF</button>
                  </div>
                </div>
              </div>
              <div id="equipmentContent" class="space-y-8"></div>
            </div>
          `;
          // Initialize equipment page
          if (typeof window.loadEquipmentData === 'function') {
            window.loadEquipmentData();
          } else {
            console.error('loadEquipmentData function not available');
            // Retry after a short delay to ensure equipment.js is fully loaded
            setTimeout(() => {
              if (typeof window.loadEquipmentData === 'function') {
                window.loadEquipmentData();
              } else {
                console.error('loadEquipmentData still not available after retry');
                document.getElementById('equipmentContent').innerHTML = '<div class="text-center text-gray-500 py-8">Equipment functionality is loading... Please refresh the page if this persists.</div>';
              }
            }, 200);
          }
          if (typeof applyLanguageEnhanced === 'function') {
            applyLanguageEnhanced();
          } else if (typeof applyLanguage === 'function') {
            applyLanguage();
          }
          break;

        case "scna":
            mainContent.innerHTML = `
                <div class="space-y-6">
                    <!-- Header Section -->
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h2 class="text-3xl font-bold text-gray-900" data-i18n="scnaTitle">SCNA Management</h2>
                            <p class="mt-2 text-gray-600" data-i18n="scnaSubtitle">Supply Chain Network Analytics & Work Order Management</p>
                        </div>
                    </div>

                    <!-- Tab Navigation -->
                    <div class="bg-white border-b border-gray-200 rounded-lg">
                        <nav class="flex space-x-8 px-6" aria-label="Tabs">
                            <button onclick="switchSCNATab('freyaTablet')" 
                                    class="scna-tab-btn py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600" 
                                    data-tab="freyaTablet" data-i18n="freyaTablet">
                                Freya Tablet
                            </button>
                            <button onclick="switchSCNATab('workOrder')" 
                                    class="scna-tab-btn py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300" 
                                    data-tab="workOrder" data-i18n="workOrder">
                                Work Order
                            </button>
                            <!-- Future tabs can be added here -->
                            <button onclick="switchSCNATab('analytics')" 
                                    class="scna-tab-btn py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300" 
                                    data-tab="analytics" data-i18n="analytics">
                                Analytics
                            </button>
                        </nav>
                    </div>

                    <!-- Tab Content -->
                    <div id="scnaTabContent">
                        <!-- Content will be loaded by switchSCNATab function -->
                    </div>
                </div>
            `;
            
            // Initialize with freya tablet tab
            if (typeof switchSCNATab === 'function') {
                switchSCNATab('freyaTablet');
            }
            
            if (typeof applyLanguageEnhanced === 'function') {
                applyLanguageEnhanced();
            } else if (typeof applyLanguage === 'function') {
                applyLanguage();
            }
            break;

        case "noda":
            mainContent.innerHTML = `
                <div class="space-y-6">
                    <!-- Header Section -->
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h2 class="text-3xl font-bold text-gray-900" data-i18n="nodaTitle">NODA Warehouse Management</h2>
                            <p class="mt-2 text-gray-600" data-i18n="nodaSubtitle">Warehouse Picking Order Management System</p>
                        </div>
                        <div class="flex items-center space-x-4">
                            <button onclick="openGenSyncModal()" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                <i class="ri-cloud-line mr-2"></i><span data-i18n="syncFromGen">Sync from GEN</span>
                            </button>
                            <button onclick="triggerNodaCsvUpload()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                                <i class="ri-upload-line mr-2"></i><span data-i18n="csvUpload">Upload CSV</span>
                            </button>
                            <button onclick="exportNodaData()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                <i class="ri-download-line mr-2"></i><span data-i18n="csvExport">CSV Export</span>
                            </button>
                            <button id="checkInventoryBtn" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                                <i class="ri-refresh-line mr-2"></i>Check Inventory
                            </button>
                            <button id="refreshNodaBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <i class="ri-refresh-line mr-2"></i><span data-i18n="refresh">Refresh</span>
                            </button>
                        </div>
                    </div>

                    <!-- Hidden file input for CSV upload -->
                    <input type="file" id="nodaCsvFileInput" accept=".csv" style="display: none;" onchange="handleNodaCsvUpload(this)">

                    <!-- Filters Section -->
                    <div class="bg-white p-6 rounded-lg border border-gray-200">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="status">Status</label>
                                <select id="nodaStatusFilter" class="w-full p-2 border border-gray-300 rounded-md" onchange="syncStatusFilterWithCards()">
                                    <option value="" data-i18n="allStatuses">All Statuses</option>
                                    <option value="pending" data-i18n="statusPending">Pending</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="partial-inventory">Partial Inventory</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="partNumber">品番</label>
                                <select id="nodaPartNumberFilter" class="w-full p-2 border border-gray-300 rounded-md">
                                    <option value="" data-i18n="allPartNumbers">All Part Numbers</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="backNumber">背番号</label>
                                <select id="nodaBackNumberFilter" class="w-full p-2 border border-gray-300 rounded-md">
                                    <option value="" data-i18n="allBackNumbers">All Back Numbers</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="dateFrom">Date From</label>
                                <input type="date" id="nodaDateFrom" class="w-full p-2 border border-gray-300 rounded-md">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="dateTo">Date To</label>
                                <input type="date" id="nodaDateTo" class="w-full p-2 border border-gray-300 rounded-md">
                            </div>
                            <div>
                                <button onclick="applyNodaFilters()" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                    <i class="ri-filter-line mr-2"></i><span data-i18n="applyFilters">Apply Filters</span>
                                </button>
                            </div>
                        </div>
                        <div class="mt-4">
                            <input type="text" id="nodaSearchInput" data-i18n-placeholder="searchRequests" placeholder="Search requests..." class="w-full p-2 border border-gray-300 rounded-md">
                        </div>
                    </div>

                    <!-- Statistics Cards - Compact & Clickable -->
                    <div class="grid grid-cols-2 md:grid-cols-6 gap-3" id="nodaStatusCards">
                        <div class="bg-white px-4 py-3 rounded-lg border-2 border-gray-300 cursor-pointer hover:shadow-md transition-all noda-status-card active" data-status="all" onclick="filterNodaByStatus('all')">
                            <div class="flex items-center">
                                <div class="p-2 bg-gray-100 rounded-lg">
                                    <i class="ri-list-check text-xl text-gray-600"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-xs text-gray-500">All</p>
                                    <p id="nodaAllCount" class="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-3 rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-all noda-status-card" data-status="pending" onclick="filterNodaByStatus('pending')">
                            <div class="flex items-center">
                                <div class="p-2 bg-yellow-100 rounded-lg">
                                    <i class="ri-time-line text-xl text-yellow-600"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-xs text-gray-500" data-i18n="statusPending">Pending</p>
                                    <p id="nodaPendingCount" class="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-3 rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-all noda-status-card" data-status="in-progress" onclick="filterNodaByStatus('in-progress')">
                            <div class="flex items-center">
                                <div class="p-2 bg-blue-100 rounded-lg">
                                    <i class="ri-play-line text-xl text-blue-600"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-xs text-gray-500">In Progress</p>
                                    <p id="nodaInProgressCount" class="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-3 rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-all noda-status-card" data-status="completed" onclick="filterNodaByStatus('completed')">
                            <div class="flex items-center">
                                <div class="p-2 bg-green-100 rounded-lg">
                                    <i class="ri-checkbox-circle-line text-xl text-green-600"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-xs text-gray-500" data-i18n="statusComplete">Completed</p>
                                    <p id="nodaCompletedCount" class="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-3 rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-all noda-status-card" data-status="partial-inventory" onclick="filterNodaByStatus('partial-inventory')">
                            <div class="flex items-center">
                                <div class="p-2 bg-orange-100 rounded-lg">
                                    <i class="ri-alert-line text-xl text-orange-600"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-xs text-gray-500">Partial Inventory</p>
                                    <p id="nodaPartialInventoryCount" class="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-3 rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-all noda-status-card" data-status="cancelled" onclick="filterNodaByStatus('cancelled')">
                            <div class="flex items-center">
                                <div class="p-2 bg-red-100 rounded-lg">
                                    <i class="ri-close-circle-line text-xl text-red-600"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-xs text-gray-500">Cancelled</p>
                                    <p id="nodaCancelledCount" class="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Add New Request Button (Role-based) -->
                    <div id="nodaAddRequestSection" class="flex justify-end" style="display: none;">
                        <button onclick="openNodaAddModal()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                            <i class="ri-add-line mr-2"></i><span data-i18n="newRequest">New Request</span>
                        </button>
                    </div>

                    <!-- Data Table -->
                    <div class="bg-white rounded-lg border border-gray-200">
                        <div class="p-4 border-b border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900" data-i18n="pickingRequests">Picking Requests</h3>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <div id="nodaTableContainer">
                                <!-- Table content will be loaded here -->
                            </div>
                        </div>
                        
                        <!-- Pagination -->
                        <div class="px-6 py-4 border-t border-gray-200">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-2">
                                    <label class="text-sm text-gray-500">Items per page</label>
                                    <select id="nodaItemsPerPage" class="border border-gray-300 rounded px-2 py-1 text-sm">
                                        <option value="10">10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                                <div id="nodaPageInfo" class="text-sm text-gray-600"></div>
                                <div class="flex items-center space-x-2">
                                    <button id="nodaPrevPage" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50" disabled>
                                        <i class="ri-arrow-left-line"></i>
                                    </button>
                                    <div id="nodaPageNumbers" class="flex items-center space-x-1">
                                        <!-- Page numbers will be dynamically generated here -->
                                    </div>
                                    <button id="nodaNextPage" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50" disabled>
                                        <i class="ri-arrow-right-line"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- NODA Detail/Edit Modal -->
                <div id="nodaDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
                            <div class="p-6 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-lg font-semibold" data-i18n="pickingRequestDetails">Picking Request Details</h3>
                                    <button onclick="closeNodaModal()" class="text-gray-400 hover:text-gray-600">
                                        <i class="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                            </div>
                            <div id="nodaDetailContent" class="p-6">
                                <!-- Content will be populated by JavaScript -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- NODA Bulk Request Modal with Cart System -->
                <div id="nodaAddModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
                            <div class="p-6 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-lg font-semibold" data-i18n="bulkPickingRequest">Bulk Picking Request</h3>
                                    <button onclick="closeNodaAddModal()" class="text-gray-400 hover:text-gray-600">
                                        <i class="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                                <!-- Step Indicator -->
                                <div class="mt-4 flex items-center space-x-4">
                                    <div id="step1Indicator" class="flex items-center text-blue-600">
                                        <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
                                        <span class="ml-2 text-sm font-medium" data-i18n="addItems">Add Items</span>
                                    </div>
                                    <div class="flex-1 h-px bg-gray-300"></div>
                                    <div id="step2Indicator" class="flex items-center text-gray-400">
                                        <div class="w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
                                        <span class="ml-2 text-sm font-medium" data-i18n="reviewCart">Review Cart</span>
                                    </div>
                                    <div class="flex-1 h-px bg-gray-300"></div>
                                    <div id="step3Indicator" class="flex items-center text-gray-400">
                                        <div class="w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
                                        <span class="ml-2 text-sm font-medium" data-i18n="submit">Submit</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="p-6">
                                <!-- Step 1: Add Items -->
                                <div id="addItemStep" class="space-y-6">
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <!-- Pickup Date -->
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="pickupDateAllItems">
                                                Pickup Date (All Items) *
                                            </label>
                                            <input type="date" id="bulkPickupDate" class="w-full p-3 border border-gray-300 rounded-md" required>
                                        </div>
                                        
                                        <!-- Deadline Date (納入指示日) -->
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                                <span data-i18n="deadline">Deadline</span> (納入指示日) *
                                            </label>
                                            <input type="date" id="bulkDeadlineDate" class="w-full p-3 border border-gray-300 rounded-md" required>
                                        </div>
                                        
                                        <!-- Delivery Order (便) -->
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                                便 (<span data-i18n="deliveryOrder">Delivery Order</span>)
                                            </label>
                                            <input type="text" id="bulkDeliveryOrder" class="w-full p-3 border border-gray-300 rounded-md" placeholder="Optional">
                                        </div>
                                        
                                        <!-- Delivery Note Number (納品書番号) -->
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                                納品書番号 (<span data-i18n="deliveryNote">Delivery Note</span>)
                                            </label>
                                            <input type="text" id="bulkDeliveryNote" class="w-full p-3 border border-gray-300 rounded-md" placeholder="Optional">
                                        </div>
                                    </div>
                                    
                                    <div class="border-t pt-6">
                                        <h4 class="text-md font-medium text-gray-900 mb-4" data-i18n="addItemToCart">Add Item to Cart</h4>
                                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="partNumber">品番 *</label>
                                                <input type="text" id="modalNodaPartNumber" class="w-full p-3 border border-gray-300 rounded-md" data-i18n-placeholder="enterPartNumber" placeholder="Enter part number">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="backNumber">背番号 *</label>
                                                <input type="text" id="modalNodaBackNumber" class="w-full p-3 border border-gray-300 rounded-md" data-i18n-placeholder="enterBackNumber" placeholder="Enter back number">
                                                <div id="modalInventoryCheckResult" class="mt-1 text-sm"></div>
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="quantity">Quantity *</label>
                                                <input type="number" id="modalNodaQuantity" min="1" class="w-full p-3 border border-gray-300 rounded-md" data-i18n-placeholder="qtyPlaceholder" placeholder="Qty">
                                            </div>
                                            <div class="flex items-end">
                                                <button type="button" onclick="addItemToCart()" class="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                                    <i class="ri-add-line mr-2"></i><span data-i18n="addToCart">Add to Cart</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Cart Items Display -->
                                    <div class="border-t pt-6">
                                        <div class="flex items-center justify-between mb-4">
                                            <h4 class="text-md font-medium text-gray-900" data-i18n="cartItems">Cart Items</h4>
                                            <span id="cartItemCount" class="text-sm text-gray-500"><span>0</span> <span data-i18n="items">items</span></span>
                                        </div>
                                        <div id="cartItemsList" class="space-y-2 max-h-40 overflow-y-auto">
                                            <div class="text-center text-gray-500 py-8">
                                                <i class="ri-shopping-cart-line text-4xl text-gray-300"></i>
                                                <p class="mt-2 text-sm" data-i18n="noItemsInCart">No items in cart</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex justify-between pt-6 border-t">
                                        <button type="button" onclick="closeNodaAddModal()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                                            <span data-i18n="cancel">Cancel</span>
                                        </button>
                                        <button type="button" id="proceedToReviewBtn" onclick="proceedToReview()" disabled class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300">
                                            <span data-i18n="proceedToReview">Review Cart</span> <i class="ri-arrow-right-line ml-2"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Step 2: Review Cart -->
                                <div id="reviewCartStep" class="space-y-6 hidden">
                                    <div class="bg-gray-50 p-4 rounded-lg">
                                        <h4 class="text-md font-medium text-gray-900 mb-2" data-i18n="pickupDate">Pickup Date</h4>
                                        <p id="reviewPickupDate" class="text-gray-700"></p>
                                    </div>
                                    
                                    <div>
                                        <h4 class="text-md font-medium text-gray-900 mb-4" data-i18n="itemsToRequest">Items to Request</h4>
                                        <div class="overflow-x-auto">
                                            <table class="min-w-full border border-gray-200">
                                                <thead class="bg-gray-50">
                                                    <tr>
                                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase" data-i18n="partNumber">品番</th>
                                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase" data-i18n="backNumber">背番号</th>
                                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase" data-i18n="quantity">Quantity</th>
                                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase" data-i18n="available">Available</th>
                                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase" data-i18n="status">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="reviewTableBody" class="bg-white divide-y divide-gray-200">
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div class="flex justify-between pt-6 border-t">
                                        <button type="button" onclick="backToAddItems()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                                            <i class="ri-arrow-left-line mr-2"></i><span data-i18n="backToAddItems">Back to Add Items</span>
                                        </button>
                                        <button type="button" onclick="proceedToSubmit()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                            <span data-i18n="proceedToSubmit">Proceed to Submit</span> <i class="ri-arrow-right-line ml-2"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Step 3: Submit -->
                                <div id="submitStep" class="space-y-6 hidden">
                                    <div class="text-center">
                                        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <i class="ri-check-line text-2xl text-green-600"></i>
                                        </div>
                                        <h4 class="text-lg font-medium text-gray-900 mb-2" data-i18n="readyToSubmit">Ready to Submit</h4>
                                        <p class="text-gray-600" data-i18n="bulkPickingRequestReady">Your bulk picking request is ready to be submitted.</p>
                                    </div>

                                    <div class="bg-gray-50 p-4 rounded-lg">
                                        <div class="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span class="font-medium text-gray-700" data-i18n="pickupDate">Pickup Date:</span>
                                                <span id="submitPickupDate" class="text-gray-900"></span>
                                            </div>
                                            <div>
                                                <span class="font-medium text-gray-700" data-i18n="totalItems">Total Items:</span>
                                                <span id="submitTotalItems" class="text-gray-900"></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div id="submitProgress" class="hidden">
                                        <div class="text-center">
                                            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            <p class="mt-2 text-sm text-gray-600" data-i18n="submittingBulkRequest">Submitting bulk request...</p>
                                        </div>
                                    </div>

                                    <div class="flex justify-between pt-6 border-t">
                                        <button type="button" id="backToReviewBtn" onclick="backToReview()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                                            <i class="ri-arrow-left-line mr-2"></i><span data-i18n="backToReview">Back to Review</span>
                                        </button>
                                        <button type="button" id="submitBulkRequestBtn" onclick="submitBulkRequest()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                            <i class="ri-send-plane-line mr-2"></i><span data-i18n="submitBulkRequest">Submit Bulk Request</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize NODA system
            if (typeof initializeNodaSystem === 'function') {
                initializeNodaSystem();
            }
            
            // Apply language translations
            if (typeof applyLanguageEnhanced === 'function') {
                applyLanguageEnhanced();
            } else if (typeof applyLanguage === 'function') {
                applyLanguage();
            }
            break;

        case "inventory":
            mainContent.innerHTML = `
                <div class="space-y-6">
                    <!-- Header Section -->
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h2 class="text-3xl font-bold text-gray-900" data-i18n="inventoryTitle">Inventory Management</h2>
                            <p class="mt-2 text-gray-600" data-i18n="inventorySubtitle">Two-Stage Inventory Tracking System</p>
                        </div>
                        <div class="flex items-center space-x-4">
                            <div id="inventoryAddSection" style="display: none;">
                                <button onclick="openInventoryAddModal()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                                    <i class="ri-add-line mr-2"></i><span data-i18n="addInventory">Add Inventory</span>
                                </button>
                            </div>
                            <div id="inventoryResetAllSection" style="display: none;">
                                <button onclick="openBatchResetModal()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                    <i class="ri-refresh-line mr-2"></i><span data-i18n="resetAll">Reset All</span>
                                </button>
                            </div>
                            <button onclick="exportInventoryData()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                <i class="ri-download-line mr-2"></i><span data-i18n="csvExport">CSV Export</span>
                            </button>
                            <button id="refreshInventoryBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <i class="ri-refresh-line mr-2"></i><span data-i18n="refresh">Refresh</span>
                            </button>
                        </div>
                    </div>

                    <!-- Filters Section -->
                    <div class="bg-white p-6 rounded-lg border border-gray-200">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="partNumber">品番</label>
                                <select id="inventoryPartNumberFilter" class="w-full p-2 border border-gray-300 rounded-md">
                                    <option value="" data-i18n="allPartNumbers">All Part Numbers</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="backNumber">背番号</label>
                                <select id="inventoryBackNumberFilter" class="w-full p-2 border border-gray-300 rounded-md">
                                    <option value="" data-i18n="allBackNumbers">All Back Numbers</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="search">Search</label>
                                <input type="text" id="inventorySearchInput" class="w-full p-2 border border-gray-300 rounded-md" data-i18n-placeholder="searchInventory" placeholder="Search inventory...">
                            </div>
                            <div>
                                <button onclick="applyInventoryFilters()" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                    <i class="ri-search-line mr-2"></i><span data-i18n="search">Search</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Summary Cards -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div class="bg-white px-4 py-3 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-blue-100 rounded-lg">
                                    <i class="ri-archive-line text-blue-600 text-xl"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-xs text-gray-500" data-i18n="totalItems">Total Items</p>
                                    <p id="inventoryTotalItems" class="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-3 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-green-100 rounded-lg">
                                    <i class="ri-checkbox-circle-line text-green-600 text-xl"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-xs text-gray-500" data-i18n="physicalStock">Physical Stock</p>
                                    <p id="inventoryPhysicalStock" class="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-3 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-yellow-100 rounded-lg">
                                    <i class="ri-time-line text-yellow-600 text-xl"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-xs text-gray-500" data-i18n="reservedStock">Reserved Stock</p>
                                    <p id="inventoryReservedStock" class="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-3 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-purple-100 rounded-lg">
                                    <i class="ri-check-line text-purple-600 text-xl"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-xs text-gray-500" data-i18n="availableStock">Available Stock</p>
                                    <p id="inventoryAvailableStock" class="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Data Table -->
                    <div class="bg-white rounded-lg border border-gray-200">
                        <div class="p-4 border-b border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900" data-i18n="inventoryItems">Inventory Items</h3>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <div id="inventoryTableContainer">
                                <!-- Table content will be loaded here -->
                            </div>
                        </div>
                        
                        <!-- Pagination -->
                        <div class="px-6 py-4 border-t border-gray-200">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-2">
                                    <label class="text-sm text-gray-500" data-i18n="itemsPerPage">Items per page</label>
                                    <select id="inventoryItemsPerPage" class="border border-gray-300 rounded px-2 py-1 text-sm">
                                        <option value="10">10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                                <div id="inventoryPageInfo" class="text-sm text-gray-600"></div>
                                <div class="flex items-center space-x-2">
                                    <button id="inventoryPrevPage" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50" disabled>
                                        <i class="ri-arrow-left-line"></i>
                                    </button>
                                    <div id="inventoryPageNumbers" class="flex items-center space-x-1">
                                        <!-- Page numbers will be dynamically generated here -->
                                    </div>
                                    <button id="inventoryNextPage" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50" disabled>
                                        <i class="ri-arrow-right-line"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Inventory Transactions Modal -->
                <div id="inventoryTransactionsModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
                            <div class="p-6 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-lg font-semibold" data-i18n="inventoryTransactions">Inventory Transactions</h3>
                                    <button onclick="closeInventoryTransactionsModal()" class="text-gray-400 hover:text-gray-600">
                                        <i class="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                            </div>
                            <div id="inventoryTransactionsContent" class="p-6">
                                <!-- Content will be populated by JavaScript -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Add Inventory Modal -->
                <div id="inventoryAddModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg max-w-md w-full">
                            <div class="p-6 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-lg font-semibold" data-i18n="addInventory">Add Inventory</h3>
                                    <button onclick="closeInventoryAddModal()" class="text-gray-400 hover:text-gray-600">
                                        <i class="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="p-6">
                                <form id="addInventoryForm" class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="partNumber">品番 (Part Number) *</label>
                                        <input type="text" id="addInventory品番" class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="backNumber">背番号 (Back Number) *</label>
                                        <input type="text" id="addInventory背番号" class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="quantityToAdd">Quantity to Add *</label>
                                        <input type="number" id="addInventoryQuantity" min="1" class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                                    </div>
                                    
                                    <div class="flex items-center justify-end space-x-4 pt-4">
                                        <button type="button" onclick="closeInventoryAddModal()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                                            <span data-i18n="cancel">Cancel</span>
                                        </button>
                                        <button type="submit" class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                                            <i class="ri-add-line mr-2"></i><span data-i18n="addInventory">Add Inventory</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize inventory system
            if (typeof initializeInventorySystem === 'function') {
                initializeInventorySystem();
            }
            
            // Apply language translations
            if (typeof applyLanguageEnhanced === 'function') {
                applyLanguageEnhanced();
            } else if (typeof applyLanguage === 'function') {
                applyLanguage();
            }
            break;

        default:
            mainContent.innerHTML = `<h2 class="text-xl font-semibold">Page Not Found</h2>`;
            if (typeof applyLanguageEnhanced === 'function') {
              applyLanguageEnhanced();
            } else if (typeof applyLanguage === 'function') {
              applyLanguage();
            }
            break;
    }
}

// ==================== SCNA TAB MANAGEMENT ====================

/**
 * Switch between SCNA tabs
 */
window.switchSCNATab = function(tabName) {
    // Update tab button styles
    document.querySelectorAll('.scna-tab-btn').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    });
    
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        activeTab.classList.add('border-blue-500', 'text-blue-600');
    }
    
    const tabContent = document.getElementById('scnaTabContent');
    
    switch (tabName) {
        case 'freyaTablet':
            tabContent.innerHTML = `
                <!-- Freya Tablet Tab Content -->
                <div class="space-y-6">
                    <!-- Action Buttons -->
                    <div class="flex items-center justify-end space-x-4">
                        <button onclick="exportFreyaTabletData()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                            <i class="ri-download-line mr-2"></i><span data-i18n="csvExport">CSV Export</span>
                        </button>
                        <button id="refreshFreyaTabletBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <i class="ri-refresh-line mr-2"></i><span data-i18n="refresh">Refresh</span>
                        </button>
                    </div>

                    <!-- Filter Controls -->
                    <div class="bg-white p-6 rounded-lg border border-gray-200">
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">設備 (Equipment)</label>
                                <select id="freyaTabletEquipmentFilter" class="w-full p-2 border border-gray-300 rounded-md">
                                    <option value="">All Equipment</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                                <input type="date" id="freyaTabletDateFrom" class="w-full p-2 border border-gray-300 rounded-md">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                                <input type="date" id="freyaTabletDateTo" class="w-full p-2 border border-gray-300 rounded-md">
                            </div>
                            <div>
                                <button onclick="applyFreyaTabletFilters()" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                    <i class="ri-filter-line mr-2"></i><span data-i18n="applyFilters">Apply Filters</span>
                                </button>
                            </div>
                        </div>
                        <div class="mt-4">
                            <input type="text" id="freyaTabletSearchInput" placeholder="Search production records..." class="w-full p-2 border border-gray-300 rounded-md">
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div class="bg-white px-4 py-3 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-blue-100 rounded-lg">
                                    <i class="ri-file-list-line text-xl text-blue-600"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-xs text-gray-500">Total Records</p>
                                    <p id="freyaTabletTotalRecords" class="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-3 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-green-100 rounded-lg">
                                    <i class="ri-checkbox-circle-line text-xl text-green-600"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-xs text-gray-500">Total Quantity</p>
                                    <p id="freyaTabletTotalQuantity" class="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-3 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-yellow-100 rounded-lg">
                                    <i class="ri-error-warning-line text-xl text-yellow-600"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-xs text-gray-500">Total NG</p>
                                    <p id="freyaTabletTotalNG" class="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white px-4 py-3 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-2 bg-purple-100 rounded-lg">
                                    <i class="ri-time-line text-xl text-purple-600"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-xs text-gray-500">Avg Cycle Time</p>
                                    <p id="freyaTabletAvgCycleTime" class="text-xl font-bold text-gray-900">0</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Data Table -->
                    <div class="bg-white rounded-lg border border-gray-200">
                        <div class="p-4 border-b border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900">Production Records</h3>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <div id="freyaTabletTableContainer">
                                <!-- Table content will be loaded here -->
                            </div>
                        </div>
                        
                        <!-- Pagination -->
                        <div class="px-6 py-4 border-t border-gray-200">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-2">
                                    <label class="text-sm text-gray-500">Items per page</label>
                                    <select id="freyaTabletItemsPerPage" class="border border-gray-300 rounded px-2 py-1 text-sm">
                                        <option value="10">10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <button id="freyaTabletPrevPage" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50" disabled>
                                        <i class="ri-arrow-left-line"></i>
                                    </button>
                                    <!-- Numbered pagination container -->
                                    <div id="freyaTabletPaginationNumbers" class="flex items-center space-x-1">
                                        <!-- Page numbers will be dynamically generated here -->
                                    </div>
                                    <button id="freyaTabletNextPage" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50" disabled>
                                        <i class="ri-arrow-right-line"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Freya Tablet Detail Modal -->
                <div id="freyaTabletDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
                            <div class="p-6 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-lg font-semibold">Production Record Details</h3>
                                    <button onclick="closeFreyaTabletModal()" class="text-gray-400 hover:text-gray-600">
                                        <i class="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                            </div>
                            <div id="freyaTabletDetailContent" class="p-6">
                                <!-- Content will be populated by JavaScript -->
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize freya tablet system
            if (typeof initializeFreyaTabletSystem === 'function') {
                initializeFreyaTabletSystem();
            }
            break;
            
        case 'workOrder':
            tabContent.innerHTML = `
                <!-- Work Order Tab Content -->
                <div class="space-y-6">
                    <!-- Action Buttons -->
                    <div class="flex items-center justify-end space-x-4">
                        <button onclick="triggerJsonUpload()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                            <i class="ri-upload-line mr-2"></i><span data-i18n="jsonUpload">Upload JSON</span>
                        </button>
                        <button onclick="exportWorkOrderData()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                            <i class="ri-download-line mr-2"></i><span data-i18n="csvExport">CSV Export</span>
                        </button>
                        <button id="refreshWorkOrderBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <i class="ri-refresh-line mr-2"></i><span data-i18n="refresh">Refresh</span>
                        </button>
                    </div>

                    <!-- Hidden file input for JSON upload -->
                    <input type="file" id="jsonFileInput" accept=".json" style="display: none;" onchange="handleJsonFileUpload(this)">

                    <!-- Filter Controls -->
                    <div class="bg-white p-6 rounded-lg border border-gray-200">
                        <div class="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="status">Status</label>
                                <select id="workOrderStatusFilter" class="w-full p-2 border border-gray-300 rounded-md">
                                    <option value="" data-i18n="allStatuses">All Statuses</option>
                                    <option value="Entered">Entered</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="customer">Customer</label>
                                <select id="workOrderCustomerFilter" class="w-full p-2 border border-gray-300 rounded-md">
                                    <option value="" data-i18n="allCustomers">All Customers</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="assignedTo">Assigned To</label>
                                <select id="workOrderAssignFilter" class="w-full p-2 border border-gray-300 rounded-md">
                                    <option value="" data-i18n="allAssignees">All Assignees</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="dateFrom">Date From</label>
                                <input type="date" id="workOrderDateFrom" class="w-full p-2 border border-gray-300 rounded-md">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="dateTo">Date To</label>
                                <input type="date" id="workOrderDateTo" class="w-full p-2 border border-gray-300 rounded-md">
                            </div>
                            <div>
                                <button onclick="applyWorkOrderFilters()" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                    <i class="ri-filter-line mr-2"></i><span data-i18n="applyFilters">Apply Filters</span>
                                </button>
                            </div>
                        </div>
                        <div class="mt-4">
                            <input type="text" id="workOrderSearchInput" placeholder="Search work orders..." class="w-full p-2 border border-gray-300 rounded-md">
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-3 bg-blue-100 rounded-lg">
                                    <i class="ri-file-list-line text-2xl text-blue-600"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="totalOrders">Total Orders</p>
                                    <p class="text-2xl font-semibold text-gray-900" id="totalWorkOrders">-</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-3 bg-yellow-100 rounded-lg">
                                    <i class="ri-time-line text-2xl text-yellow-600"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="inProgress">In Progress</p>
                                    <p class="text-2xl font-semibold text-gray-900" id="inProgressOrders">-</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-3 bg-green-100 rounded-lg">
                                    <i class="ri-checkbox-circle-line text-2xl text-green-600"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="completed">Completed</p>
                                    <p class="text-2xl font-semibold text-gray-900" id="completedOrders">-</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white p-6 rounded-lg border border-gray-200">
                            <div class="flex items-center">
                                <div class="p-3 bg-red-100 rounded-lg">
                                    <i class="ri-alarm-warning-line text-2xl text-red-600"></i>
                                </div>
                                <div class="ml-4">
                                    <p class="text-sm font-medium text-gray-600" data-i18n="overdue">Overdue</p>
                                    <p class="text-2xl font-semibold text-gray-900" id="overdueOrders">-</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Work Orders Table -->
                    <div class="bg-white rounded-lg border border-gray-200">
                        <div class="p-6 border-b border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900" data-i18n="workOrdersList">Work Orders List</h3>
                        </div>
                        <div id="workOrdersTableContainer" class="overflow-x-auto">
                            <!-- Table will be populated by JavaScript -->
                        </div>
                        <!-- Pagination -->
                        <div class="px-6 py-4 border-t border-gray-200">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-2">
                                    <span class="text-sm text-gray-500" data-i18n="itemsPerPage">Items per page:</span>
                                    <select id="workOrderItemsPerPage" class="p-1 border border-gray-300 rounded text-sm">
                                        <option value="10">10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <button id="workOrderPrevPage" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50" disabled>
                                        <i class="ri-arrow-left-line"></i>
                                    </button>
                                    <!-- Numbered pagination container -->
                                    <div id="workOrderPaginationNumbers" class="flex items-center space-x-1">
                                        <!-- Page numbers will be dynamically generated here -->
                                    </div>
                                    <button id="workOrderNextPage" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50" disabled>
                                        <i class="ri-arrow-right-line"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Work Order Detail Modal -->
                <div id="workOrderDetailModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
                            <div class="p-6 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-lg font-semibold" data-i18n="workOrderDetails">Work Order Details</h3>
                                    <button onclick="closeWorkOrderModal()" class="text-gray-400 hover:text-gray-600">
                                        <i class="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                            </div>
                            <div id="workOrderDetailContent" class="p-6">
                                <!-- Content will be populated by JavaScript -->
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize work order system
            if (typeof initializeWorkOrderSystem === 'function') {
                initializeWorkOrderSystem();
            }
            break;
            
        case 'analytics':
            tabContent.innerHTML = `
                <div class="space-y-6">
                    <!-- Header Section -->
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900">Machine Downtime Analytics</h2>
                            <p class="text-gray-600">Machine utilization and downtime analysis for SCNA factory</p>
                        </div>
                        <div class="flex flex-col sm:flex-row gap-3">
                            <button onclick="exportSCNAMachineData()" 
                                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                <i class="ri-download-line mr-2"></i>Export Data
                            </button>
                            <button id="refreshSCNAMachineBtn" 
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <i class="ri-refresh-line mr-2"></i>Refresh
                            </button>
                        </div>
                    </div>

                    <!-- Filters Section -->
                    <div class="bg-white p-6 rounded-lg border border-gray-200">
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label for="scnaMachineDateFrom" class="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                                <input type="date" id="scnaMachineDateFrom" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label for="scnaMachineDateTo" class="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                                <input type="date" id="scnaMachineDateTo" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Machine</label>
                                <div class="mb-2">
                                    <input type="checkbox" id="scnaMachineAll" checked onchange="toggleAllMachines(this.checked)" class="mr-2">
                                    <label for="scnaMachineAll" class="text-sm text-gray-700 cursor-pointer">All</label>
                                    <button onclick="toggleAllMachines(false)" class="ml-4 text-xs text-blue-600 hover:text-blue-800">None</button>
                                </div>
                                <div id="scnaMachineCheckboxes" class="space-y-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-gray-50"></div>
                            </div>
                            <div class="flex items-end">
                                <div class="text-sm text-gray-600">
                                    <div class="flex items-center space-x-4">
                                        <div class="flex items-center">
                                            <div class="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                                            <span>Working</span>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="w-4 h-4 bg-red-500 rounded mr-2"></div>
                                            <span>Break</span>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="w-4 h-4 bg-gray-500 rounded mr-2"></div>
                                            <span>Downtime</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Machine Downtime Chart -->
                    <div class="bg-white p-6 rounded-lg border border-gray-200">
                        <div class="mb-4">
                            <h3 class="text-lg font-semibold text-gray-900">Machine Utilization Timeline</h3>
                            <p class="text-sm text-gray-600">Real-time view of machine working status, breaks, and downtime periods</p>
                        </div>
                        <div id="machineDowntimeChart" style="height: 600px;"></div>
                    </div>
                </div>
                
                <!-- Machine Analytics Detail Modal -->
                <div id="machineAnalyticsDetailModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
                            <div class="p-6 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-lg font-semibold">Production Record Details</h3>
                                    <button onclick="closeMachineAnalyticsModal()" class="text-gray-400 hover:text-gray-600">
                                        <i class="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                            </div>
                            <div id="machineAnalyticsDetailContent" class="p-6">
                                <!-- Content will be populated by JavaScript -->
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize machine analytics after DOM is ready
            setTimeout(() => {
                if (typeof initializeSCNAMachineAnalytics === 'function') {
                    initializeSCNAMachineAnalytics();
                }
            }, 100);
            break;
            
        default:
            tabContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg border border-gray-200">
                    <div class="text-center py-12">
                        <i class="ri-error-warning-line text-6xl text-gray-400 mb-4"></i>
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">Tab Not Found</h3>
                        <p class="text-gray-600">The requested tab could not be found.</p>
                    </div>
                </div>
            `;
    }
    
    // Apply language translations
    if (typeof applyLanguageEnhanced === 'function') {
        applyLanguageEnhanced();
    } else if (typeof applyLanguage === 'function') {
        applyLanguage();
    }
};


// ==================== APPROVAL SYSTEM (OPTIMIZED) ====================

let currentApprovalPage = 1;
let itemsPerPage = 10; // Match the dropdown default
let allApprovalData = []; // Keep for compatibility, but won't store all data
let filteredApprovalData = [];
let approvalSortState = { column: null, direction: 1 };
let currentApprovalTab = 'kensaDB'; // Default tab
let currentUserData = {}; // Cache user data
let approvalStatistics = {}; // Cache statistics
let dataRangeMode = 'current'; // 'current' or 'all' - controls whether to show current date or all historical data
let lastSelectedApprovalItem = null;
let lastSelectedApprovalItemId = null;
let approvalGalleryEntries = [];
let approvalGalleryRenderCount = 0;
const approvalGalleryPageSize = 200;

function updateShowAllImagesButtonVisibility() {
  const button = document.getElementById('showAllImagesBtn');
  if (!button) return;
  const isPressTab = currentApprovalTab === 'pressDB';
  button.classList.toggle('hidden', !isPressTab);
}

/**
 * Load unique factory options for the current approval tab
 */
async function loadFactoryOptions(collection = 'kensaDB') {
    try {
        console.log(`📋 Loading factory options for ${collection}...`);
        
        const factoryFilter = document.getElementById('factoryFilter');
        if (!factoryFilter) {
            console.warn('❌ Factory filter element not found');
            return;
        }

        // Show loading state
        factoryFilter.innerHTML = '<option value="">Loading factories...</option>';
        factoryFilter.disabled = true;

        // Fetch unique factories from the API - use BASE_URL for server communication
        const apiUrl = `${BASE_URL}api/factories/${collection}`;
        console.log(`🌐 Fetching from: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch factory data');
        }

        console.log(`✅ Loaded ${data.count} unique factories for ${collection}:`, data.factories);

        // Clear existing options and add default
        factoryFilter.innerHTML = '<option value="" data-i18n="allFactories">All Factories</option>';
        
        // Add factory options
        data.factories.forEach(factory => {
            const option = document.createElement('option');
            option.value = factory;
            option.textContent = factory;
            factoryFilter.appendChild(option);
        });

        // Re-enable dropdown
        factoryFilter.disabled = false;

        // Restore previously selected factory for this collection
        const savedFactoryKey = `factoryFilter_${collection}`;
        const savedFactory = localStorage.getItem(savedFactoryKey);
        if (savedFactory && data.factories.includes(savedFactory)) {
            factoryFilter.value = savedFactory;
            console.log(`🔄 Restored saved factory selection: ${savedFactory} for ${collection}`);
        }

        // Add event listener for persistence (remove existing listener first to avoid duplicates)
        factoryFilter.removeEventListener('change', handleFactoryFilterChange);
        factoryFilter.addEventListener('change', handleFactoryFilterChange);

        console.log(`✅ Factory dropdown populated with ${data.factories.length} options`);

    } catch (error) {
        console.error(`❌ Error loading factory options for ${collection}:`, error);
        
        const factoryFilter = document.getElementById('factoryFilter');
        if (factoryFilter) {
            factoryFilter.innerHTML = `
                <option value="" data-i18n="allFactories">All Factories</option>
                <option value="" disabled>Error loading factories</option>
            `;
            factoryFilter.disabled = false;
        }
    }
}

/**
 * Load factory options for multiple collections in batch
 */
async function loadFactoryOptionsBatch(collections = ['kensaDB', 'pressDB', 'SRSDB', 'slitDB']) {
    try {
        console.log('📋 Loading factory options for multiple collections...');
        
        // Use BASE_URL for server communication
        const apiUrl = `${BASE_URL}api/factories/batch`;
        console.log(`🌐 Fetching batch from: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ collections })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error('Failed to fetch batch factory data');
        }

        console.log('✅ Loaded factory data for all collections:', data.results);
        
        // Store factory data for each collection
        window.factoryData = data.results;
        
        return data.results;

    } catch (error) {
        console.error('❌ Error loading batch factory options:', error);
        return null;
    }
}

/**
 * Update factory dropdown when switching approval tabs
 */
function updateFactoryDropdownForTab(collection) {
    console.log(`🔄 Updating factory dropdown for ${collection}`);
    
    // If we have cached batch data, use it
    if (window.factoryData && window.factoryData[collection]) {
        const factoryFilter = document.getElementById('factoryFilter');
        if (!factoryFilter) return;

        const factories = window.factoryData[collection].factories || [];
        
        // Clear and rebuild options
        factoryFilter.innerHTML = '<option value="" data-i18n="allFactories">All Factories</option>';
        
        factories.forEach(factory => {
            const option = document.createElement('option');
            option.value = factory;
            option.textContent = factory;
            factoryFilter.appendChild(option);
        });

        // Restore previously selected factory for this collection
        const savedFactoryKey = `factoryFilter_${collection}`;
        const savedFactory = localStorage.getItem(savedFactoryKey);
        if (savedFactory && factories.includes(savedFactory)) {
            factoryFilter.value = savedFactory;
            console.log(`🔄 Restored saved factory selection: ${savedFactory} for ${collection}`);
        }

        // Add event listener for persistence (remove existing listener first to avoid duplicates)
        factoryFilter.removeEventListener('change', handleFactoryFilterChange);
        factoryFilter.addEventListener('change', handleFactoryFilterChange);

        console.log(`✅ Updated factory dropdown with ${factories.length} options for ${collection}`);
    } else {
        // Fall back to individual loading
        loadFactoryOptions(collection);
    }
}

/**
 * Handle factory filter change (unified function for persistence and filtering)
 */
function handleFactoryFilterChange() {
    saveFactorySelection(); // Save the selection
    applyApprovalFilters(); // Apply the filter
}

/**
 * Save factory selection to localStorage for persistence
 */
function saveFactorySelection() {
    const factoryFilter = document.getElementById('factoryFilter');
    if (!factoryFilter) return;
    
    const selectedFactory = factoryFilter.value;
    const savedFactoryKey = `factoryFilter_${currentApprovalTab}`;
    
    if (selectedFactory) {
        localStorage.setItem(savedFactoryKey, selectedFactory);
        console.log(`💾 Saved factory selection: ${selectedFactory} for ${currentApprovalTab}`);
    } else {
        localStorage.removeItem(savedFactoryKey);
        console.log(`🗑️ Cleared factory selection for ${currentApprovalTab}`);
    }
}

/**
 * Initialize the approval system (OPTIMIZED)
 */
function initializeApprovalSystem() {
    // Get current user data and cache it
    currentUserData = JSON.parse(localStorage.getItem("authUser") || "{}");
    
    // Initialize data range mode to current date
    dataRangeMode = 'current';
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFilter').value = today;
    
    // Event listeners
    document.getElementById('refreshBtn').addEventListener('click', loadApprovalData);
    document.getElementById('factoryFilter').addEventListener('change', handleFactoryFilterChange);
    document.getElementById('statusFilter').addEventListener('change', applyApprovalFilters);
    document.getElementById('dateFilter').addEventListener('change', applyApprovalFilters);
    document.getElementById('approvalSearchInput').addEventListener('input', applyApprovalFilters);
    document.getElementById('itemsPerPageSelect').addEventListener('change', function() {
        const oldItemsPerPage = itemsPerPage;
        itemsPerPage = parseInt(this.value);
        currentApprovalPage = 1;
        
        console.log(`📝 Items per page changed from ${oldItemsPerPage} to ${itemsPerPage}, reset to page 1`);
        
        // Check current view mode and reload appropriate view
        const viewMode = document.getElementById('viewModeSelect').value;
        if (viewMode === 'list') {
            console.log('📝 In list view - reloading list data with new pagination');
            renderApprovalList(); // Reload list data with new pagination
        } else {
            console.log('📝 In table view - reloading table data');
            loadApprovalTableData(); // Only reload table data
        }
    });
    document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));
    
    // Initialize tab styles
    updateTabStyles();
    updateShowAllImagesButtonVisibility();
    
    // Load factory options for all collections in batch (for better performance)
    if (typeof loadFactoryOptionsBatch === 'function') {
        loadFactoryOptionsBatch(['kensaDB', 'pressDB', 'SRSDB', 'slitDB']).then(() => {
            // After loading batch data, update factory dropdown for current tab
            if (typeof updateFactoryDropdownForTab === 'function') {
                updateFactoryDropdownForTab(currentApprovalTab);
            }
        });
    } else {
        // Fallback to individual loading for current tab
        console.warn('⚠️ Factory batch loading function not available, using fallback');
        if (typeof loadFactoryOptions === 'function') {
            loadFactoryOptions(currentApprovalTab);
        }
    }
    
    // Load initial data efficiently
    loadApprovalData();
}

/**
 * Switch between approval tabs
 */
window.switchApprovalTab = function(tabName) {
    currentApprovalTab = tabName;
    updateTabStyles();
  updateShowAllImagesButtonVisibility();
    
    // Update factory dropdown for the new tab
    if (typeof updateFactoryDropdownForTab === 'function') {
        updateFactoryDropdownForTab(tabName);
    }
    
    loadApprovalData();
};

/**
 * Update tab button styles
 */
function updateTabStyles() {
    document.querySelectorAll('.approval-tab-btn').forEach(btn => {
        if (btn.dataset.tab === currentApprovalTab) {
            btn.className = 'approval-tab-btn py-2 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm whitespace-nowrap active';
        } else {
            btn.className = 'approval-tab-btn py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap';
        }
    });
}

/**
 * Load approval data efficiently (OPTIMIZED)
 */
async function loadApprovalData() {
    try {
        console.log('🔄 Loading approval data optimized for tab:', currentApprovalTab);
        
        // Show loading state
        showApprovalLoadingState();
        
        // Ensure we have complete user data with factory information
        if ((currentUserData.role === '班長' || currentUserData.role === '係長') && 
            (!currentUserData.工場 && !currentUserData.factory)) {
            console.log('Factory info missing, fetching from database...');
            currentUserData = await fetchCompleteUserData(currentUserData.username);
        }
        
        // Load data efficiently in parallel
        await Promise.all([
            loadApprovalStatistics(),
            loadFactoryList(),
            loadApprovalTableData()
        ]);
        
        console.log('✅ Optimized approval data loading completed');
        
    } catch (error) {
        console.error('❌ Error loading approval data:', error);
        showApprovalErrorState(error.message);
    }
}

/**
 * Load approval statistics using server-side aggregation (NEW)
 */
async function loadApprovalStatistics() {
    try {
        const factoryAccess = getFactoryAccessForUser();
        // Use statistics-specific filters (no status filter to get all counts)
        const filters = buildStatisticsQueryFilters();
        
        console.log('📊 Loading approval statistics via aggregation...');
        
        const response = await fetch(BASE_URL + 'api/approval-stats', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                collectionName: currentApprovalTab,
                userRole: currentUserData.role,
                factoryAccess: factoryAccess,
                filters: filters
            })
        });

        if (!response.ok) {
            // Fallback to old method if new route doesn't exist yet
            console.log('📊 New stats route not available, calculating statistics from sample...');
            await loadApprovalStatisticsFallback();
            return;
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load statistics');
        }

        approvalStatistics = result.statistics;
        console.log('✅ Statistics loaded via aggregation:', approvalStatistics);
        
        updateApprovalStatisticsDisplay();
        
    } catch (error) {
        console.error('❌ Error loading approval statistics:', error);
        // Fallback to old method
        await loadApprovalStatisticsFallback();
    }
}

/**
 * Fallback statistics calculation using limited data sample (FALLBACK)
 */
async function loadApprovalStatisticsFallback() {
    try {
        console.log('📊 Using fallback statistics calculation...');
        
        // Get statistics query (without status filter) combined with database query
        const baseQuery = buildApprovalDatabaseQuery();
        const statisticsFilters = buildStatisticsQueryFilters();
        
        // Merge the queries 
        const query = { ...baseQuery, ...statisticsFilters };
        
        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "submittedDB",
                collectionName: currentApprovalTab,
                query: query,
                limit: 5000, // Limit to reasonable sample size
                sort: { Date: -1 } // Get recent data first
            })
        });

        if (!response.ok) throw new Error('Failed to fetch statistics data');
        
        const sampleData = await response.json();
        console.log('📊 Statistics calculated from sample:', sampleData.length, 'items');
        
        // Calculate statistics from sample
        const pending = sampleData.filter(item => !item.approvalStatus || item.approvalStatus === 'pending').length;
        const hanchoApproved = sampleData.filter(item => item.approvalStatus === 'hancho_approved').length;
        const fullyApproved = sampleData.filter(item => item.approvalStatus === 'fully_approved').length;
        const correction = sampleData.filter(item => 
            item.approvalStatus === 'correction_needed' || item.approvalStatus === 'correction_needed_from_kacho'
        ).length;
        const correctionFromKacho = sampleData.filter(item => item.approvalStatus === 'correction_needed_from_kacho').length;
        const today = new Date().toISOString().split('T')[0];
        const todayTotal = sampleData.filter(item => item.Date === today).length;
        
        approvalStatistics = {
            pending,
            hanchoApproved,
            fullyApproved,
            correctionNeeded: correction,
            correctionNeededFromKacho: correctionFromKacho,
            todayTotal,
            overallTotal: sampleData.length
        };
        
        updateApprovalStatisticsDisplay();
        
    } catch (error) {
        console.error('❌ Error in fallback statistics:', error);
        // Show error state in statistics
        document.querySelectorAll('[id$="Count"]').forEach(element => {
            element.textContent = '?';
            element.parentElement.classList.add('opacity-50');
        });
    }
}

/**
 * Load factory list efficiently (NEW)
 */
async function loadFactoryList() {
    try {
        const factoryAccess = getFactoryAccessForUser();
        
        console.log('🏭 Loading factory list...');
        
        const response = await fetch(BASE_URL + 'api/approval-factories', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                collectionName: currentApprovalTab,
                userRole: currentUserData.role,
                factoryAccess: factoryAccess
            })
        });

        if (!response.ok) {
            // Fallback to old method
            console.log('🏭 New factory route not available, using fallback...');
            await loadFactoryListFallback();
            return;
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load factory list');
        }

        console.log('✅ Factory list loaded:', result.factories);
        updateFactoryFilterOptions(result.factories);
        
    } catch (error) {
        console.error('❌ Error loading factory list:', error);
        await loadFactoryListFallback();
    }
}

/**
 * Fallback factory list loading (FALLBACK)
 */
async function loadFactoryListFallback() {
    try {
        console.log('🏭 Using fallback factory list loading...');
        
        const query = buildApprovalDatabaseQuery();
        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "submittedDB",
                collectionName: currentApprovalTab,
                query: query,
                projection: { 工場: 1 }, // Only get factory field
                limit: 1000 // Reasonable sample for factory list
            })
        });

        if (!response.ok) throw new Error('Failed to fetch factory data');
        
        const factoryData = await response.json();
        const factories = [...new Set(factoryData.map(item => item.工場))].filter(Boolean);
        
        console.log('✅ Factory list from fallback:', factories);
        updateFactoryFilterOptions(factories);
        
    } catch (error) {
        console.error('❌ Error in fallback factory loading:', error);
        // Provide basic factory filter
        const factoryFilter = document.getElementById('factoryFilter');
        factoryFilter.innerHTML = '<option value="" data-i18n="allFactories">All Factories</option>';
    }
}

/**
 * Load paginated table data efficiently (NEW)
 */
async function loadApprovalTableData() {
    console.log(`🔄 📊 loadApprovalTableData called for page: ${currentApprovalPage}`);
    try {
        const factoryAccess = getFactoryAccessForUser();
        const filters = buildApprovalQueryFilters();
        
        console.log(`📄 Loading table data: Page ${currentApprovalPage}, Limit ${itemsPerPage}`);
        
        const response = await fetch(BASE_URL + 'api/approval-paginate', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                collectionName: currentApprovalTab,
                page: currentApprovalPage,
                limit: itemsPerPage,
                maxLimit: 100,
                filters: filters,
                userRole: currentUserData.role,
                factoryAccess: factoryAccess
            })
        });

        if (!response.ok) {
            // Fallback to old pagination method
            console.log('📄 New pagination route not available, using fallback...');
            await loadApprovalTableDataFallback();
            return;
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load table data');
        }

        console.log(`✅ Table data loaded: ${result.data.length} items, Page ${result.pagination.currentPage}/${result.pagination.totalPages}`);
        console.log('📊 Server pagination info:', result.pagination);
        
        // Store current page data for compatibility and apply sort if active
        filteredApprovalData = applySortToData(result.data);
        
        renderApprovalTable(filteredApprovalData, result.pagination);
        
    } catch (error) {
        console.error('❌ Error loading table data:', error);
        await loadApprovalTableDataFallback();
    }
}

/**
 * Fallback table data loading with client-side pagination (FALLBACK) 
 */
async function loadApprovalTableDataFallback() {
    try {
        console.log('📄 Using fallback table data loading...');
        
        const query = buildApprovalDatabaseQuery();
        const filters = buildApprovalQueryFilters();
        
        // Merge query and filters
        const combinedQuery = { ...query, ...filters };
        
        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "submittedDB",
                collectionName: currentApprovalTab,
                query: combinedQuery,
                limit: itemsPerPage * 10, // Get more data for local pagination
                sort: { Date: -1, _id: -1 }
            })
        });

        if (!response.ok) throw new Error('Failed to fetch table data');
        
        const data = await response.json();
        console.log('📄 Table data from fallback:', data.length, 'items');
        
        // Apply client-side pagination
        const startIndex = (currentApprovalPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = data.slice(startIndex, endIndex);
        
        filteredApprovalData = applySortToData(pageData);
        
        // Create fake pagination info
        const totalPages = Math.ceil(data.length / itemsPerPage);
        const paginationInfo = {
            currentPage: currentApprovalPage,
            totalPages: totalPages,
            totalRecords: data.length,
            itemsPerPage: itemsPerPage,
            hasNext: currentApprovalPage < totalPages,
            hasPrevious: currentApprovalPage > 1,
            startIndex: startIndex + 1,
            endIndex: Math.min(endIndex, data.length)
        };
        
        renderApprovalTable(pageData, paginationInfo);
        
    } catch (error) {
        console.error('❌ Error in fallback table loading:', error);
        const container = document.getElementById('approvalsTableContainer');
        container.innerHTML = '<div class="p-8 text-center text-red-500">テーブルデータの読み込みに失敗しました</div>';
    }
}

/**
 * Fetch complete user data including factory assignments
 */
async function fetchCompleteUserData(username) {
    try {
        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "Sasaki_Coating_MasterDB",
                collectionName: "users",
                query: { username: username },
                projection: { password: 0 }
            })
        });

        if (!response.ok) throw new Error('Failed to fetch user data');
        
        const users = await response.json();
        if (users.length > 0) {
            const completeUserData = users[0];
            console.log('Fetched complete user data:', completeUserData);
            
            // Update localStorage with complete user data
            localStorage.setItem("authUser", JSON.stringify(completeUserData));
            
            return completeUserData;
        } else {
            console.error('User not found in database');
            return JSON.parse(localStorage.getItem("authUser") || "{}");
        }
    } catch (error) {
        console.error('Error fetching complete user data:', error);
        return JSON.parse(localStorage.getItem("authUser") || "{}");
    }
}

/**
 * Get factory access for current user (NEW HELPER)
 */
function getFactoryAccessForUser() {
    let factoryAccess = [];
    
    if (currentUserData.role === '班長' || currentUserData.role === '係長') {
        const userFactories = currentUserData.工場 || currentUserData.factory;
        if (userFactories && userFactories.length > 0) {
            factoryAccess = Array.isArray(userFactories) ? userFactories : [userFactories];
        }
        console.log(`${currentUserData.role} factory access:`, factoryAccess);
    }
    // Admin, 部長, 課長 have access to all factories (empty array = no restriction)
    
    return factoryAccess;
}

/**
 * Build database query based on user role (NEW HELPER)
 */
function buildApprovalDatabaseQuery() {
    let query = {};
    
    // Role-based visibility for 2-step approval system
    if (currentUserData.role === '班長') {
        // 班長 can only see data for their assigned factories (first approval level)
        const userFactories = currentUserData.工場 || currentUserData.factory;
        console.log('班長 factories found:', userFactories);
        
        if (userFactories && userFactories.length > 0) {
            const factoryArray = Array.isArray(userFactories) ? userFactories : [userFactories];
            query = { "工場": { $in: factoryArray } };
            console.log('Applying 班長 factory filter:', query);
        } else {
            console.warn('班長 user has no assigned factories, showing no data');
            query = { "工場": { $in: [] } };
        }
    } else if (currentUserData.role === '係長') {
        // 係長 can only see data for their assigned factories (similar to 班長 but limited access)
        const userFactories = currentUserData.工場 || currentUserData.factory;
        console.log('係長 factories found:', userFactories);
        
        if (userFactories && userFactories.length > 0) {
            const factoryArray = Array.isArray(userFactories) ? userFactories : [userFactories];
            query = { "工場": { $in: factoryArray } };
            console.log('Applying 係長 factory filter:', query);
        } else {
            console.warn('係長 user has no assigned factories, showing no data');
            query = { "工場": { $in: [] } };
        }
    } else if (currentUserData.role === '課長') {
        // 課長 can see all data (to monitor 班長 approvals and do second approval)
        query = {}; // No filter - see everything
        console.log('課長 can see all data');
    } else if (['admin', '部長'].includes(currentUserData.role)) {
        // Admin/部長 can see everything including history
        query = {}; // No filter - see everything
        console.log('Admin/部長 can see all data including history');
    } else {
        // Other roles have no access
        query = { "_id": { $exists: false } }; // Show nothing
        console.log('Role has no approval access');
    }

    console.log('Final database query for', currentApprovalTab, ':', query);
    return query;
}

/**
 * Build query filters for statistics (excludes status filter to get all counts)
 */
function buildStatisticsQueryFilters() {
    const filters = {};
    
    // Get user's timezone offset
    const timezoneOffset = new Date().getTimezoneOffset();
    filters.timezoneOffset = timezoneOffset;
    
    // Factory filter
    const factoryFilter = document.getElementById('factoryFilter')?.value;
    if (factoryFilter) {
        filters.工場 = factoryFilter;
    }
    
    // Date filter - enhanced with data range mode logic
    const dateFilter = document.getElementById('dateFilter')?.value;
    if (dateFilter) {
        filters.Date = dateFilter;
    } else if (dataRangeMode === 'current') {
        // If we're in current mode and no specific date is set, default to today
        const today = new Date().toISOString().split('T')[0];
        filters.Date = today;
    }
    // If dataRangeMode is 'all' and no date filter, don't add date restriction
    
    // Search filter
    const searchTerm = document.getElementById('approvalSearchInput')?.value?.toLowerCase();
    if (searchTerm) {
        filters.$or = [
            { 品番: { $regex: searchTerm, $options: 'i' } },
            { 背番号: { $regex: searchTerm, $options: 'i' } },
            { Worker_Name: { $regex: searchTerm, $options: 'i' } }
        ];
    }
    
    console.log('📊 Built statistics query filters (mode: ' + dataRangeMode + '):', filters);
    return filters;
}

/**
 * Build query filters from UI controls (NEW HELPER)
 */
function buildApprovalQueryFilters() {
    const filters = {};
    
    // Factory filter
    const factoryFilter = document.getElementById('factoryFilter')?.value;
    if (factoryFilter) {
        filters.工場 = factoryFilter;
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter')?.value;
    if (statusFilter) {
        if (statusFilter === 'today') {
            const today = new Date().toISOString().split('T')[0];
            filters.Date = today;
        } else if (statusFilter === 'pending') {
            filters.$or = [
                { approvalStatus: { $exists: false } },
                { approvalStatus: 'pending' }
            ];
        } else if (statusFilter === 'correction_needed') {
            // Handle both correction types for the main "Correction Needed" card
            filters.$or = [
                { approvalStatus: 'correction_needed' },
                { approvalStatus: 'correction_needed_from_kacho' }
            ];
        } else {
            filters.approvalStatus = statusFilter;
        }
    }
    
    // Date filter - enhanced with data range mode logic
    // Get user's timezone offset for accurate date filtering
    const timezoneOffset = new Date().getTimezoneOffset(); // minutes from UTC (e.g., PST=-480, JST=-540)
    filters.timezoneOffset = timezoneOffset;
    
    const dateFilter = document.getElementById('dateFilter')?.value;
    if (dateFilter) {
        filters.Date = dateFilter;
    } else if (dataRangeMode === 'current' && !statusFilter) {
        // If we're in current mode and no specific date is set, default to today
        const today = new Date().toISOString().split('T')[0];
        filters.Date = today;
    }
    // If dataRangeMode is 'all' and no date filter, don't add date restriction
    
    // Search filter
    const searchTerm = document.getElementById('approvalSearchInput')?.value?.toLowerCase();
    if (searchTerm) {
        // If we already have an $or from status filtering, combine them with $and
        if (filters.$or) {
            filters.$and = [
                { $or: filters.$or }, // Existing status $or condition
                { $or: [              // Search $or condition
                    { 品番: { $regex: searchTerm, $options: 'i' } },
                    { 背番号: { $regex: searchTerm, $options: 'i' } },
                    { Worker_Name: { $regex: searchTerm, $options: 'i' } }
                ]}
            ];
            delete filters.$or; // Remove the single $or since we're using $and now
        } else {
            filters.$or = [
                { 品番: { $regex: searchTerm, $options: 'i' } },
                { 背番号: { $regex: searchTerm, $options: 'i' } },
                { Worker_Name: { $regex: searchTerm, $options: 'i' } }
            ];
        }
    }
    
    console.log('🔍 Built query filters (mode: ' + dataRangeMode + '):', filters);
    return filters;
}

/**
 * Update statistics display in the UI (NEW HELPER)
 */
function updateApprovalStatisticsDisplay() {
    document.getElementById('pendingCount').textContent = approvalStatistics.pending || 0;
    document.getElementById('hanchoApprovedCount').textContent = approvalStatistics.hanchoApproved || 0;
    document.getElementById('fullyApprovedCount').textContent = approvalStatistics.fullyApproved || 0;
    document.getElementById('correctionCount').textContent = approvalStatistics.correctionNeeded || 0;
    document.getElementById('totalCount').textContent = approvalStatistics.todayTotal || 0;
    
    // Update 班長-specific card if it exists
    if (currentUserData.role === '班長') {
        const kachoRequestElement = document.getElementById('kachoRequestCount');
        if (kachoRequestElement) {
            kachoRequestElement.textContent = approvalStatistics.correctionNeededFromKacho || 0;
        }
    }
    
    // Remove loading opacity
    document.querySelectorAll('[id$="Count"]').forEach(element => {
        element.parentElement.classList.remove('opacity-50');
    });
}

/**
 * Update factory filter dropdown options (UPDATED TO WORK WITH PERSISTENCE)
 */
function updateFactoryFilterOptions(factories) {
    const factoryFilter = document.getElementById('factoryFilter');
    
    // Store current value before rebuilding
    const currentValue = factoryFilter.value;
    
    // Get saved value for current collection
    const savedFactoryKey = `factoryFilter_${currentApprovalTab}`;
    const savedFactory = localStorage.getItem(savedFactoryKey);
    
    factoryFilter.innerHTML = '<option value="" data-i18n="allFactories">All Factories</option>';
    
    factories.forEach(factory => {
        const option = document.createElement('option');
        option.value = factory;
        option.textContent = factory;
        factoryFilter.appendChild(option);
    });
    
    // Restore saved selection if it exists and is valid
    if (savedFactory && factories.includes(savedFactory)) {
        factoryFilter.value = savedFactory;
        console.log(`🔄 Restored saved factory selection in updateFactoryFilterOptions: ${savedFactory}`);
    } else if (currentValue && factories.includes(currentValue)) {
        factoryFilter.value = currentValue;
        console.log(`🔄 Preserved current factory selection: ${currentValue}`);
    }
    
    // Ensure the change event listener for persistence is attached
    factoryFilter.removeEventListener('change', handleFactoryFilterChange);
    factoryFilter.addEventListener('change', handleFactoryFilterChange);
}

/**
 * Show loading state in UI (NEW HELPER)
 */
function showApprovalLoadingState() {
    // Add opacity to statistics cards
    document.querySelectorAll('[id$="Count"]').forEach(element => {
        element.textContent = '...';
        element.parentElement.classList.add('opacity-50');
    });
    
    // Show loading in table
    const container = document.getElementById('approvalsTableContainer');
    container.innerHTML = '<div class="p-8 text-center text-gray-500"><i class="ri-loader-4-line animate-spin text-2xl mr-2"></i>データを読み込んでいます...</div>';
}

/**
 * Show error state in UI (NEW HELPER)
 */
function showApprovalErrorState(errorMessage) {
    const container = document.getElementById('approvalsTableContainer');
    container.innerHTML = `<div class="p-8 text-center text-red-500">
        <i class="ri-error-warning-line text-2xl mr-2"></i>
        エラー: ${errorMessage}
        <br><button class="mt-2 text-blue-500 hover:underline" onclick="loadApprovalData()">再試行</button>
    </div>`;
}

/**
 * Load factory filter options (LEGACY - REPLACED BUT KEPT FOR COMPATIBILITY)
 */
function loadFactoryFilterOptions() {
    const factoryFilter = document.getElementById('factoryFilter');
    const factories = [...new Set(allApprovalData.map(item => item.工場))].filter(Boolean);
    
    factoryFilter.innerHTML = '<option value="" data-i18n="allFactories">All Factories</option>' + 
        factories.map(factory => `<option value="${factory}">${factory}</option>`).join('');
}

/**
 * Toggle data range mode between current date and all historical data
 */
window.toggleDataRange = function(mode) {
    dataRangeMode = mode;
    
    const currentBtn = document.getElementById('currentDateModeBtn');
    const allBtn = document.getElementById('allDataModeBtn');
    const indicator = document.getElementById('dataRangeIndicator');
    const dateFilter = document.getElementById('dateFilter');
    
    if (mode === 'current') {
        // Switch to current date mode
        currentBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');
        currentBtn.classList.add('bg-blue-500', 'text-white');
        allBtn.classList.remove('bg-blue-500', 'text-white');
        allBtn.classList.add('text-gray-600', 'hover:bg-gray-100');
        
        // Set today's date if no date is selected
        if (!dateFilter.value) {
            const today = new Date().toISOString().split('T')[0];
            dateFilter.value = today;
        }
        
        // Update indicator
        indicator.innerHTML = `
            <i class="ri-calendar-check-line mr-1 text-blue-500"></i>
            <span data-i18n="showingCurrentDate">Showing current date data</span>
        `;
        
    } else {
        // Switch to all data mode
        allBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');
        allBtn.classList.add('bg-blue-500', 'text-white');
        currentBtn.classList.remove('bg-blue-500', 'text-white');
        currentBtn.classList.add('text-gray-600', 'hover:bg-gray-100');
        
        // Clear date filter to show all data
        dateFilter.value = '';
        
        // Update indicator
        indicator.innerHTML = `
            <i class="ri-database-2-line mr-1 text-blue-500"></i>
            <span data-i18n="showingAllData">Showing all historical data</span>
        `;
    }
    
    // Reload data with new range
    applyApprovalFilters();
};

/**
 * Filter by status when clicking on stat cards
 */
window.filterByStatus = function(status) {
    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');
    
    if (status === 'today') {
        // Filter by today's date - clear status to show all
        const today = new Date().toISOString().split('T')[0];
        dateFilter.value = today;
        statusFilter.value = '';
        // Ensure we're in current mode when clicking "Today's Total"
        if (dataRangeMode === 'all') {
            toggleDataRange('current');
            return; // toggleDataRange will call applyApprovalFilters
        }
    } else {
        // Set status filter for table data
        statusFilter.value = status;
        
        if (dataRangeMode === 'current') {
            // Keep current date if we're in current date mode
            const today = new Date().toISOString().split('T')[0];
            if (!dateFilter.value) {
                dateFilter.value = today;
            }
        } else {
            // Clear date filter only if in "all data" mode
            dateFilter.value = '';
        }
    }
    
    // Apply filters normally
    applyApprovalFilters();
};

/**
 * Apply filters to approval data
 */
/**
 * Apply filters to approval data (OPTIMIZED)
 */
function applyApprovalFilters() {
    console.log('🔍 Applying filters and reloading data...');
    currentApprovalPage = 1; // Reset to first page
    
    // Reload both statistics and table data with new filters
    Promise.all([
        loadApprovalStatistics(),
        loadApprovalTableData()
    ]).catch(error => {
        console.error('❌ Error applying filters:', error);
        showApprovalErrorState('フィルター適用中にエラーが発生しました');
    });
}

/**
 * Extract date and time from MongoDB ObjectId (User's local timezone)
 */
function getDateTimeFromObjectId(objectId) {
    try {
        // ObjectId first 8 hex chars = timestamp in seconds
        const timestamp = parseInt(objectId.substring(0, 8), 16) * 1000;
        const date = new Date(timestamp);
        
        // Use user's local timezone (browser automatically converts)
        const localDate = new Date(date.getTime());
        
        // Format in user's local timezone
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        const hours = String(localDate.getHours()).padStart(2, '0');
        const minutes = String(localDate.getMinutes()).padStart(2, '0');
        
        return {
            date: `${year}-${month}-${day}`, // YYYY-MM-DD
            time: `${hours}:${minutes}`, // HH:MM
            fullDateTime: localDate
        };
    } catch (error) {
        console.error('Error extracting date from ObjectId:', error);
        return null;
    }
}

/**
 * Check if user-entered date/time matches ObjectId timestamp
 */
function checkDateTimeMismatch(item) {
    const objectId = item._id?.$oid || item._id;
    if (!objectId) return { dateMismatch: false, timeMismatch: false };
    
    const objectIdDateTime = getDateTimeFromObjectId(objectId);
    if (!objectIdDateTime) return { dateMismatch: false, timeMismatch: false };
    
    // Check date mismatch
    const dateMismatch = item.Date !== objectIdDateTime.date;
    
    // Check time mismatch (if Time_end is very different from ObjectId time)
    let timeMismatch = false;
    if (item.Time_end) {
        const endTime = item.Time_end; // HH:MM format
        const objectIdTime = objectIdDateTime.time;
        
        // Convert to minutes for comparison
        const [endHour, endMin] = endTime.split(':').map(Number);
        const [objHour, objMin] = objectIdTime.split(':').map(Number);
        const endMinutes = endHour * 60 + endMin;
        const objMinutes = objHour * 60 + objMin;
        
        // If difference is more than 30 minutes, flag as mismatch
        const diffMinutes = Math.abs(endMinutes - objMinutes);
        timeMismatch = diffMinutes > 30;
    }
    
    return { 
        dateMismatch, 
        timeMismatch, 
        objectIdDate: objectIdDateTime.date,
        objectIdTime: objectIdDateTime.time
    };
}

/**
 * Update statistics cards (OPTIMIZED - Now handled by loadApprovalStatistics)
 */
function updateStats() {
    // This function is now handled by updateApprovalStatisticsDisplay()
    // Keep it for compatibility with existing code
    if (approvalStatistics && Object.keys(approvalStatistics).length > 0) {
        updateApprovalStatisticsDisplay();
    } else {
        console.log('📊 Statistics not loaded yet, calling loadApprovalStatistics...');
        loadApprovalStatistics();
    }
}

/**
 * Render the approval table (UPDATED TO HANDLE BOTH OLD AND NEW FORMATS)
 */
function renderApprovalTable(data = null, paginationInfo = null) {
    const container = document.getElementById('approvalsTableContainer');
    
    // Check if we're in list view mode
    const viewMode = document.getElementById('viewModeSelect').value;
    if (viewMode === 'list') {
        renderApprovalList(); // Async function - will load ALL data
        generateSummaryReport();
        return;
    }
    
    // Use provided data or fallback to legacy filteredApprovalData
    let tableData = data || filteredApprovalData;
    let totalRecords = 0;
    let currentPagination = null;
    
    if (paginationInfo) {
        // New optimized format - data is already paginated
        totalRecords = paginationInfo.totalRecords;
        currentPagination = paginationInfo;
    } else {
        // Legacy format - apply client-side pagination
        if (tableData.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-gray-500">データがありません</div>';
            updatePagination(0, { currentPage: 1, totalPages: 0 });
            return;
        }
        
        const startIndex = (currentApprovalPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        tableData = tableData.slice(startIndex, endIndex);
        totalRecords = filteredApprovalData.length;
        
        // Create legacy pagination info
        const totalPages = Math.ceil(filteredApprovalData.length / itemsPerPage);
        currentPagination = {
            currentPage: currentApprovalPage,
            totalPages: totalPages,
            totalRecords: totalRecords,
            itemsPerPage: itemsPerPage,
            hasNext: currentApprovalPage < totalPages,
            hasPrevious: currentApprovalPage > 1,
            startIndex: startIndex + 1,
            endIndex: Math.min(endIndex, filteredApprovalData.length)
        };
    }
    
    if (tableData.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-gray-500">データがありません</div>';
        updatePagination(0, { currentPage: 1, totalPages: 0 });
        return;
    }

    // Get columns based on current tab
    const columns = getTableColumns(currentApprovalTab);

    const tableHTML = `
        <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b">
                <tr>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('approvalStatus')">
                        状態 ${getSortArrow('approvalStatus')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('Date')">
                        日付・時間 ${getSortArrow('Date')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('工場')">
                        工場 ${getSortArrow('工場')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('品番')">
                        品番 ${getSortArrow('品番')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('背番号')">
                        背番号 ${getSortArrow('背番号')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('Worker_Name')">
                        作業者 ${getSortArrow('Worker_Name')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('${getQuantityField(currentApprovalTab)}')">
                        数量 ${getSortArrow(getQuantityField(currentApprovalTab))}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('${getNGField(currentApprovalTab)}')">
                        NG ${getSortArrow(getNGField(currentApprovalTab))}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700">不良率</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('approvedBy')">
                        承認者 ${getSortArrow('approvedBy')}
                    </th>
                </tr>
            </thead>
            <tbody>
                ${tableData.map(item => {
                    const statusInfo = getStatusInfo(item);
                    const quantityField = getQuantityField(currentApprovalTab);
                    const ngField = getNGField(currentApprovalTab);
                    const quantity = item[quantityField] || 0;
                    const ngCount = item[ngField] || 0;
                    const defectRate = quantity > 0 ? ((ngCount / quantity) * 100).toFixed(2) : '0.00';
                    
                    // Check for date/time mismatch
                    const mismatch = checkDateTimeMismatch(item);
                    const rowWarningClass = mismatch.dateMismatch ? 'bg-red-50 border-l-4 border-red-400' : '';
                    const dateWarningClass = mismatch.dateMismatch ? 'text-red-600 font-bold' : '';
                    const timeWarningClass = mismatch.timeMismatch ? 'text-orange-600 font-semibold' : 'text-gray-500';
                    
                    return `
                        <tr class="border-b hover:bg-gray-50 cursor-pointer ${statusInfo.rowClass} ${rowWarningClass}" onclick="openApprovalDetail('${item._id}')">
                            <td class="px-4 py-3">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.badgeClass}">
                                    <i class="${statusInfo.icon} mr-1"></i>
                                    ${statusInfo.text}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <div class="text-sm font-medium ${dateWarningClass}">
                                    ${item.Date}
                                    ${mismatch.dateMismatch ? `<i class="ri-alert-line text-red-600 ml-1" title="入力日付が正しくありません (実際: ${mismatch.objectIdDate})"></i>` : ''}
                                </div>
                                <div class="text-xs ${timeWarningClass}">
                                    ${item.Time_start} - ${item.Time_end}
                                    ${mismatch.timeMismatch ? `<i class="ri-time-line text-orange-600 ml-1" title="終了時刻がずれています (実際の送信: ${mismatch.objectIdTime})"></i>` : ''}
                                </div>
                            </td>
                            <td class="px-4 py-3">${item.工場 || '-'}</td>
                            <td class="px-4 py-3 font-medium">${item.品番 || '-'}</td>
                            <td class="px-4 py-3">${item.背番号 || '-'}</td>
                            <td class="px-4 py-3">${item.Worker_Name || '-'}</td>
                            <td class="px-4 py-3 font-medium">${quantity.toLocaleString()}</td>
                            <td class="px-4 py-3 ${ngCount > 0 ? 'text-red-600 font-medium' : ''}">${ngCount}</td>
                            <td class="px-4 py-3 ${parseFloat(defectRate) > 0 ? 'text-red-600 font-medium' : ''}">${defectRate}%</td>
                            <td class="px-4 py-3 text-sm text-gray-600">${item.approvedBy || '-'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
    updatePagination(totalRecords, currentPagination);
}

/**
 * Get table columns based on collection
 */
function getTableColumns(tabName) {
    const baseColumns = ['approvalStatus', 'Date', '工場', '品番', '背番号', 'Worker_Name'];
    
    switch (tabName) {
        case 'kensaDB':
            return [...baseColumns, 'Process_Quantity', 'Total_NG', 'approvedBy'];
        case 'pressDB':
            return [...baseColumns, 'Total', 'Total_NG', 'approvedBy'];
        case 'SRSDB':
            return [...baseColumns, 'Total', 'SRS_Total_NG', 'approvedBy'];
        case 'slitDB':
            return [...baseColumns, 'Total', 'Total_NG', 'approvedBy'];
        default:
            return [...baseColumns, 'Process_Quantity', 'Total_NG', 'approvedBy'];
    }
}

/**
 * Get quantity field based on collection
 */
function getQuantityField(tabName) {
    switch (tabName) {
        case 'kensaDB':
            return 'Process_Quantity';
        case 'pressDB':
        case 'SRSDB':
        case 'slitDB':
            return 'Total';
        default:
            return 'Process_Quantity';
    }
}

/**
 * Get NG field based on collection
 */
function getNGField(tabName) {
    switch (tabName) {
        case 'SRSDB':
            return 'SRS_Total_NG';
        default:
            return 'Total_NG';
    }
}

/**
 * Sort approval table by column
 */
window.sortApprovalTable = async function(column) {
    console.log(`🔄 sortApprovalTable called: column=${column}`);
    console.log(`🔄 Current filteredApprovalData length: ${filteredApprovalData.length}`);
    console.log(`🔄 First few items before sort:`, filteredApprovalData.slice(0, 3));
    
    if (approvalSortState.column === column) {
        approvalSortState.direction *= -1;
    } else {
        approvalSortState.column = column;
        approvalSortState.direction = 1;
    }
    
    console.log(`🔄 Sort state: column=${approvalSortState.column}, direction=${approvalSortState.direction}`);

    // Sort the current page data
    filteredApprovalData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        if (aVal === undefined) aVal = '';
        if (bVal === undefined) bVal = '';
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return -1 * approvalSortState.direction;
        if (aVal > bVal) return 1 * approvalSortState.direction;
        return 0;
    });
    
    console.log(`🔄 First few items after sort:`, filteredApprovalData.slice(0, 3));

    // Render appropriate view based on current mode
    const viewMode = document.getElementById('viewModeSelect').value;
    console.log(`🔄 Current view mode: ${viewMode}`);
    
    if (viewMode === 'list') {
        console.log('🔄 Updating list view after sort');
        await renderApprovalList();
        generateSummaryReport();
    } else {
        console.log('🔄 Updating table view after sort');
        // Re-render table with sorted data - use existing pagination info
        const paginationContainer = document.querySelector('#approvalContainer .flex.items-center.justify-between');
        const currentPaginationInfo = {
            currentPage: currentApprovalPage,
            totalPages: 10, // This will be updated by the table function
            totalRecords: filteredApprovalData.length,
            itemsPerPage: itemsPerPage
        };
        
        renderApprovalTable(filteredApprovalData, currentPaginationInfo);
        console.log('🔄 Table view updated after sort');
    }
    
    console.log('🔄 Sort completed');
};

/**
 * Apply current sort state to data array
 */
function applySortToData(dataArray) {
    if (!approvalSortState.column || !dataArray || dataArray.length === 0) {
        return dataArray;
    }
    
    console.log(`🔄 Applying sort: ${approvalSortState.column} (direction: ${approvalSortState.direction})`);
    
    return dataArray.sort((a, b) => {
        let aVal = a[approvalSortState.column];
        let bVal = b[approvalSortState.column];
        
        if (aVal === undefined) aVal = '';
        if (bVal === undefined) bVal = '';
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return -1 * approvalSortState.direction;
        if (aVal > bVal) return 1 * approvalSortState.direction;
        return 0;
    });
}

/**
 * Get sort arrow for column headers
 */
function getSortArrow(column) {
    if (approvalSortState.column !== column) return '';
    return approvalSortState.direction === 1 ? ' ↑' : ' ↓';
}

/**
 * Get status information for display
 */
function getStatusInfo(item) {
    if (!item.approvalStatus || item.approvalStatus === 'pending') {
        return { text: '保留中', icon: 'ri-time-line', badgeClass: 'bg-yellow-100 text-yellow-800', rowClass: 'bg-yellow-50' };
    } else if (item.approvalStatus === 'hancho_approved') {
        return { text: '班長承認済み', icon: 'ri-user-check-line', badgeClass: 'bg-blue-100 text-blue-800', rowClass: 'bg-blue-50' };
    } else if (item.approvalStatus === 'fully_approved') {
        return { text: '完全承認済み', icon: 'ri-check-double-line', badgeClass: 'bg-green-100 text-green-800', rowClass: '' };
    } else if (item.approvalStatus === 'correction_needed') {
        return { text: '修正要求', icon: 'ri-error-warning-line', badgeClass: 'bg-red-100 text-red-800', rowClass: 'bg-red-50' };
    } else if (item.approvalStatus === 'correction_needed_from_kacho') {
        return { text: '課長修正要求（班長対応）', icon: 'ri-error-warning-line', badgeClass: 'bg-orange-100 text-orange-800', rowClass: 'bg-orange-50' };
    }
    return { text: '不明', icon: 'ri-question-line', badgeClass: 'bg-gray-100 text-gray-800', rowClass: '' };
}

/**
 * Update pagination controls
 */
/**
 * Update pagination controls (UPDATED TO HANDLE BOTH OLD AND NEW FORMATS)
 */
function updatePagination(totalItems, paginationInfo = null) {
    console.log('🔢 updatePagination called:', { totalItems, paginationInfo, itemsPerPage, currentApprovalPage });
    
    const pageInfo = document.getElementById('pageInfo');
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (totalItems === 0) {
        pageInfo.textContent = '0件中 0-0件を表示';
        pageNumbers.innerHTML = '';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    let currentPage, totalPages, startItem, endItem, hasNext, hasPrevious;
    
    if (paginationInfo) {
        // New optimized format - use provided pagination info
        currentPage = paginationInfo.currentPage;
        totalPages = paginationInfo.totalPages;
        startItem = paginationInfo.startIndex;
        endItem = paginationInfo.endIndex;
        hasNext = paginationInfo.hasNext;
        hasPrevious = paginationInfo.hasPrevious;
        console.log('📊 Using provided pagination info:', paginationInfo);
    } else {
        // Legacy format - calculate pagination info
        totalPages = Math.ceil(totalItems / itemsPerPage);
        currentPage = currentApprovalPage;
        startItem = (currentPage - 1) * itemsPerPage + 1;
        endItem = Math.min(currentPage * itemsPerPage, totalItems);
        hasNext = currentPage < totalPages;
        hasPrevious = currentPage > 1;
        console.log('📊 Calculated pagination:', { totalPages, currentPage, startItem, endItem, hasNext, hasPrevious, itemsPerPage, totalItems });
    }

    pageInfo.textContent = `${totalItems}件中 ${startItem}-${endItem}件を表示`;

    // Generate page numbers with better pagination
    pageNumbers.innerHTML = '';
    
    // Clean up any existing direct page input
    const existingInput = pageNumbers.parentElement.querySelector('div.flex.items-center.space-x-2.ml-4');
    if (existingInput) {
        existingInput.remove();
    }
    
    // Helper function to create page button
    const createPageButton = (pageNum, isActive = false, isEllipsis = false) => {
        const pageBtn = document.createElement('button');
        pageBtn.type = 'button'; // Ensure it's a button type
        
        if (isEllipsis) {
            pageBtn.textContent = '...';
            pageBtn.className = 'px-3 py-1 border rounded bg-white shadow-sm cursor-default';
            pageBtn.disabled = true;
        } else {
            pageBtn.textContent = pageNum;
            pageBtn.className = `px-3 py-1 border rounded bg-white shadow-sm ${isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'}`;
            pageBtn.onclick = (e) => {
                console.log(`🖱️ Page button ${pageNum} clicked!`);
                e.preventDefault();
                console.log(`🔄 About to call goToPageNew(${pageNum})`);
                console.log(`🔄 goToPageNew function exists:`, typeof window.goToPageNew);
                try {
                    window.goToPageNew(pageNum);
                    console.log(`🔄 window.goToPageNew(${pageNum}) called successfully`);
                } catch (error) {
                    console.error(`🔄 Error calling window.goToPageNew(${pageNum}):`, error);
                }
                return false;
            };
            // Also add event listener as backup
            pageBtn.addEventListener('click', (e) => {
                console.log(`🖱️ Page button ${pageNum} event listener triggered!`);
                e.preventDefault();
                e.stopPropagation();
                window.goToPageNew(pageNum);
            });
        }
        return pageBtn;
    };
    
    if (totalPages <= 7) {
        // Show all pages if 7 or fewer
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = createPageButton(i, i === currentPage);
            pageNumbers.appendChild(pageBtn);
        }
    } else {
        // Complex pagination for many pages
        // Always show page 1
        const page1Btn = createPageButton(1, currentPage === 1);
        pageNumbers.appendChild(page1Btn);
        
        let startRange, endRange;
        
        if (currentPage <= 4) {
            // Near the beginning: 1, 2, 3, 4, 5, ..., last
            startRange = 2;
            endRange = 5;
        } else if (currentPage >= totalPages - 3) {
            // Near the end: 1, ..., last-4, last-3, last-2, last-1, last
            startRange = totalPages - 4;
            endRange = totalPages - 1;
        } else {
            // In the middle: 1, ..., current-1, current, current+1, ..., last
            startRange = currentPage - 1;
            endRange = currentPage + 1;
        }
        
        // Add ellipsis if there's a gap after page 1
        if (startRange > 2) {
            pageNumbers.appendChild(createPageButton(0, false, true)); // ellipsis
        }
        
        // Add the middle range
        for (let i = startRange; i <= endRange; i++) {
            const pageBtn = createPageButton(i, i === currentPage);
            pageNumbers.appendChild(pageBtn);
        }
        
        // Add ellipsis if there's a gap before the last page
        if (endRange < totalPages - 1) {
            pageNumbers.appendChild(createPageButton(0, false, true)); // ellipsis
        }
        
        // Always show last page (if not already shown)
        if (totalPages > 1) {
            const pageBtn = createPageButton(totalPages, currentPage === totalPages);
            pageNumbers.appendChild(pageBtn);
        }
    }
    
    // Add direct page input for very large pagination
    if (totalPages > 10) {
        const inputContainer = document.createElement('div');
        inputContainer.className = 'flex items-center space-x-2 ml-4';
        inputContainer.innerHTML = `
            <span class="text-sm text-gray-600">ページ:</span>
            <input type="number" id="directPageInput" min="1" max="${totalPages}" 
                   class="w-16 px-2 py-1 border rounded text-sm text-center" 
                   placeholder="${currentPage}">
            <button type="button" onclick="goToDirectPage()" 
                    class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">移動</button>
        `;
        pageNumbers.parentElement.appendChild(inputContainer);
        
        // Add Enter key support for direct page input
        const input = inputContainer.querySelector('#directPageInput');
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                goToDirectPage();
            }
        });
    }

    prevBtn.disabled = !hasPrevious;
    nextBtn.disabled = !hasNext;
    
    // Debug: Check if pagination elements are visible
    setTimeout(() => {
        const paginationElements = {
            pageInfo: document.getElementById('pageInfo'),
            pageNumbers: document.getElementById('pageNumbers'),
            prevBtn: document.getElementById('prevPageBtn'),
            nextBtn: document.getElementById('nextPageBtn'),
            paginationContainer: document.getElementById('paginationContainer')
        };
        
        // Silent visibility check - no console output
    }, 100);
}

/**
 * Change page
 */
/**
 * Change page (OPTIMIZED)
 */
function changePage(direction) {
    const newPage = currentApprovalPage + direction;
    console.log(`🔄 changePage called: direction=${direction}, current=${currentApprovalPage}, new=${newPage}`);
    
    if (newPage >= 1) {
        console.log(`🔄 changePage calling goToPageNew(${newPage})`);
        window.goToPageNew(newPage);
    } else {
        console.log(`🔄 changePage: Invalid page ${newPage}, staying on current page`);
    }
}

/**
 * Go to specific page (OPTIMIZED)
 */
window.goToPage = function(page) {
    console.log(`🔄🔄🔄 GOTTOPAGE FUNCTION ENTRY: page=${page}, current=${currentApprovalPage} 🔄🔄🔄`);
    console.log(`🔄 goToPage called: page=${page}, current=${currentApprovalPage}`);
    console.log(`🔄 Type of page:`, typeof page, `Value:`, page);
    
    if (page >= 1) {
        console.log(`🔄 Page ${page} is valid, proceeding...`);
        currentApprovalPage = page;
        console.log(`🔄 currentApprovalPage updated to:`, currentApprovalPage);
        
        // Check current view mode and reload appropriate view
        const viewModeElement = document.getElementById('viewModeSelect');
        console.log(`🔄 viewModeElement:`, viewModeElement);
        
        if (!viewModeElement) {
            console.error(`🔄 ERROR: viewModeSelect element not found!`);
            return;
        }
        
        const viewMode = viewModeElement.value;
        console.log(`🔄 Current view mode: ${viewMode}`);
        
        try {
            if (viewMode === 'list') {
                console.log('🔄 Calling renderApprovalList for page change');
                renderApprovalList(); // Load new page data for list view
            } else {
                console.log('🔄 Calling loadApprovalTableData for page change');
                loadApprovalTableData(); // Load new page data for table view
            }
            console.log(`🔄 Successfully switched to page ${page}`);
        } catch (error) {
            console.error(`🔄 ERROR in goToPage: ${error.message}`, error);
        }
    } else {
        console.log(`🔄 Invalid page number: ${page}`);
    }
}

/**
 * NEW TEST FUNCTION - Go to specific page
 */
window.goToPageNew = function(page) {
    console.log(`🔄🔄🔄 GOTTOPAGENEW FUNCTION ENTRY: page=${page}, current=${currentApprovalPage} 🔄🔄🔄`);
    console.log(`🔄 goToPageNew called: page=${page}, current=${currentApprovalPage}`);
    
    if (page >= 1) {
        console.log(`🔄 Page ${page} is valid, updating currentApprovalPage...`);
        currentApprovalPage = page;
        console.log(`🔄 currentApprovalPage updated to:`, currentApprovalPage);
        
        // Check current view mode and reload appropriate view
        const viewModeElement = document.getElementById('viewModeSelect');
        console.log(`🔄 viewModeElement:`, viewModeElement);
        
        if (!viewModeElement) {
            console.error(`🔄 ERROR: viewModeSelect element not found!`);
            return;
        }
        
        const viewMode = viewModeElement.value;
        console.log(`🔄 Current view mode: ${viewMode}`);
        
        try {
            if (viewMode === 'list') {
                console.log('🔄 Calling renderApprovalList for page change');
                renderApprovalList(); // Load new page data for list view
            } else {
                console.log('🔄 Calling loadApprovalTableData for page change');
                loadApprovalTableData(); // Load new page data for table view
            }
            console.log(`🔄 Successfully switched to page ${page}`);
        } catch (error) {
            console.error(`🔄 ERROR in goToPageNew: ${error.message}`, error);
        }
    } else {
        console.log(`🔄 Invalid page number: ${page}`);
    }
}

/**
 * Go to direct page from input field
 */
window.goToDirectPage = function() {
    const input = document.getElementById('directPageInput');
    const page = parseInt(input.value);
    
    if (page && page >= 1) {
        console.log(`🔄 goToDirectPage called: page=${page}`);
        window.goToPageNew(page);
        input.value = ''; // Clear input after navigation
    } else {
        alert('有効なページ番号を入力してください');
    }
}

const picURL = 'https://script.google.com/macros/s/AKfycbwHUW1ia8hNZG-ljsguNq8K4LTPVnB6Ng_GLXIHmtJTdUgGGd2WoiQo9ToF-7PvcJh9bA/exec';

function picLINK(背番号, 品番 = null) {
    fetchImageFromSheet(背番号)
        .then(link => {
            if (!link || link.includes("not found")) {
                if (品番) return fetchImageFromSheet(品番);
                throw new Error("Image not found and no fallback.");
                console.log("Image not found for both 品番 and 背番号");
            }
            return link;
        })
        .then(finalLink => {
            if (finalLink && !finalLink.includes("not found")) {
                updateImageSrc(finalLink);
                console.log("Image loaded successfully:", finalLink);
            }
        })
        .catch(error => console.error("Image load error:", error));
}

function fetchImageFromSheet(headerValue) {
    return fetch(`${picURL}?link=${headerValue}`)
        .then(res => res.ok ? res.text() : Promise.reject("Image not found"))
        .then(data => data.replace(/"/g, ''));
}

function updateImageSrc(link) {
    const imageElement = document.getElementById("dynamicImage");
    if (!imageElement) return;
    const cleanedLink = link.replace(/.*\/d\/(.*?)\/.*/, 'https://drive.google.com/uc?export=view&id=$1');
    imageElement.src = cleanedLink;
    imageElement.alt = "Product Image";
    imageElement.style.display = "block";
}

function normalizeImageList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.trim() ? [value] : [];
  }
  return [];
}

function collectMaterialLabelImages(item) {
  const images = [];
  const baseImages = normalizeImageList(item['材料ラベル画像']);
  images.push(...baseImages);

  Object.keys(item || {}).forEach(key => {
    if (key !== '材料ラベル画像' && key.startsWith('材料ラベル画像')) {
      images.push(...normalizeImageList(item[key]));
    }
  });

  return images;
}

function collectMaintenancePhotos(item) {
  const photos = [];
  const records = item?.Maintenance_Data?.records;
  if (Array.isArray(records)) {
    records.forEach(record => {
      photos.push(...normalizeImageList(record?.photos));
    });
  }
  return photos;
}

function collectApprovalImageEntries(item, tabName) {
  const entries = [];
  const seen = new Set();

  const pushEntry = (label, url, sourceKey) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    entries.push({ label, url, sourceKey });
  };

  const addFromList = (labelBase, urls, sourceKey) => {
    urls.forEach((url, index) => {
      const label = urls.length > 1 ? `${labelBase} #${index + 1}` : labelBase;
      pushEntry(label, url, sourceKey);
    });
  };

  addFromList('初物チェック', normalizeImageList(item['初物チェック画像']), '初物チェック画像');

  if (tabName === 'pressDB') {
    addFromList('終物チェック', normalizeImageList(item['終物チェック画像']), '終物チェック画像');
    addFromList('材料ラベル', collectMaterialLabelImages(item), '材料ラベル画像');
  }

  addFromList('メンテ写真', collectMaintenancePhotos(item), 'Maintenance_Data');

  const knownKeys = new Set(['初物チェック画像', '終物チェック画像', '材料ラベル画像', 'Maintenance_Data']);
  Object.entries(item || {}).forEach(([key, value]) => {
    if (knownKeys.has(key)) return;
    if (!/(画像|image|photo)/i.test(key)) return;
    const values = normalizeImageList(value);
    values.forEach((url, index) => {
      const label = values.length > 1 ? `${key} #${index + 1}` : key;
      pushEntry(label, url, key);
    });
  });

  return entries;
}

async function resolveApprovalItemForImages() {
  if (lastSelectedApprovalItem && lastSelectedApprovalItem._id) {
    return lastSelectedApprovalItem;
  }

  let itemId = null;
  const viewMode = document.getElementById('viewModeSelect')?.value;
  if (viewMode === 'list') {
    const selected = document.querySelectorAll('.list-checkbox:checked:not(:disabled)');
    if (selected.length === 1) {
      itemId = selected[0].dataset.itemId;
    }
  }

  if (!itemId && lastSelectedApprovalItemId) {
    itemId = lastSelectedApprovalItemId;
  }

  if (!itemId) return null;

  const cached = filteredApprovalData.find(d => d._id === itemId);
  if (cached) return cached;

  try {
    const response = await fetch(BASE_URL + "queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dbName: "submittedDB",
        collectionName: currentApprovalTab,
        query: { _id: itemId }
      })
    });

    if (!response.ok) return null;
    const items = await response.json();
    return items[0] || null;
  } catch (error) {
    console.error('❌ Error fetching item for images:', error);
    return null;
  }
}

window.openAllImagesModal = async function() {
  if (currentApprovalTab !== 'pressDB') return;
  const content = document.getElementById('approvalImagesModalContent');
  const subtitle = document.getElementById('approvalImagesSubtitle');

  approvalGalleryEntries = [];
  approvalGalleryRenderCount = 0;

  if (content) {
    content.innerHTML = '<div class="text-center text-gray-500"><i class="ri-loader-4-line animate-spin text-xl mr-2"></i>Loading images...</div>';
  }

  if (subtitle) {
    const dateFilter = document.getElementById('dateFilter')?.value || 'All Dates';
    const factoryFilter = document.getElementById('factoryFilter')?.value || 'All Factories';
    subtitle.textContent = `Filters: ${dateFilter} / ${factoryFilter}`;
  }

  document.getElementById('approvalImagesModal').classList.remove('hidden');

  let allData = [];
  try {
    allData = await loadApprovalDataForListView();
  } catch (error) {
    console.error('❌ Error loading data for image gallery:', error);
  }

  allData.forEach(item => {
    const entries = collectApprovalImageEntries(item, currentApprovalTab);
    const summary = `${item.品番 || '-'} / ${item.背番号 || '-'} / ${item.工場 || '-'} / ${item.Date || '-'}`;
    entries.forEach(entry => {
      approvalGalleryEntries.push({
        ...entry,
        itemId: item._id,
        itemSummary: summary
      });
    });
  });

  renderApprovalImagesGallery(true);
};

window.closeApprovalImagesModal = function() {
  const modal = document.getElementById('approvalImagesModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  approvalGalleryEntries = [];
  approvalGalleryRenderCount = 0;
};

window.toggleImageActions = function(actionId) {
  const actions = document.getElementById(actionId);
  if (actions) {
    actions.classList.toggle('hidden');
  }
};

function renderApprovalImagesGallery(reset = false) {
  const content = document.getElementById('approvalImagesModalContent');
  if (!content) return;

  if (reset) {
    approvalGalleryRenderCount = 0;
    content.innerHTML = '';
  }

  if (approvalGalleryEntries.length === 0) {
    content.innerHTML = '<div class="text-center text-gray-500">No uploaded images found for the current filters.</div>';
    return;
  }

  const sliceStart = approvalGalleryRenderCount;
  const sliceEnd = Math.min(sliceStart + approvalGalleryPageSize, approvalGalleryEntries.length);
  const slice = approvalGalleryEntries.slice(sliceStart, sliceEnd);

  approvalGalleryRenderCount = sliceEnd;

  let galleryGrid = content.querySelector('#approvalImagesGrid');
  if (!galleryGrid) {
    content.innerHTML = '<div id="approvalImagesGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div><div id="approvalImagesLoadMore" class="mt-6 text-center"></div>';
    galleryGrid = content.querySelector('#approvalImagesGrid');
  }

  const newCards = slice.map((entry, indexOffset) => {
    const entryIndex = sliceStart + indexOffset;
    const actionId = `imageActions-${entryIndex}`;
    return `
      <div class="bg-gray-50 border rounded-lg p-3">
        <div class="text-xs font-medium text-gray-700 mb-2">${entry.label}</div>
        <div class="text-[11px] text-gray-500 mb-2">${entry.itemSummary}</div>
        <img
          src="${entry.url}"
          alt="${entry.label}"
          class="w-full h-40 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
          onclick="toggleImageActions('${actionId}')"
        >
        <div id="${actionId}" class="hidden mt-3 flex gap-2">
          <button type="button" class="flex-1 px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700" onclick="window.open('${entry.url}', '_blank')">Full View</button>
          <button type="button" class="flex-1 px-3 py-1.5 text-xs rounded bg-gray-200 text-gray-800 hover:bg-gray-300" onclick="closeApprovalImagesModal(); openApprovalDetail('${entry.itemId}', '${entry.label}')">Open Data</button>
        </div>
      </div>
    `;
  }).join('');

  galleryGrid.insertAdjacentHTML('beforeend', newCards);

  const loadMoreContainer = content.querySelector('#approvalImagesLoadMore');
  if (approvalGalleryRenderCount < approvalGalleryEntries.length) {
    loadMoreContainer.innerHTML = `
      <button type="button" class="px-4 py-2 text-sm rounded border bg-white hover:bg-gray-50" onclick="renderApprovalImagesGallery()">Load more (${approvalGalleryRenderCount}/${approvalGalleryEntries.length})</button>
    `;
  } else {
    loadMoreContainer.innerHTML = '<div class="text-xs text-gray-500">All images loaded.</div>';
  }
}

/**
 * Open approval detail modal with images
 */
/**
 * Open approval detail modal with images (UPDATED FOR OPTIMIZATION)
 */
window.openApprovalDetail = async function(itemId, focusLabel = null) {
    // First try to find item in current page data
    let item = filteredApprovalData.find(d => d._id === itemId);
    
    // If not found in current page, fetch it from database
    if (!item) {
        console.log('🔍 Item not in current page, fetching from database...');
        try {
            const response = await fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dbName: "submittedDB",
                    collectionName: currentApprovalTab,
                    query: { _id: itemId } // Server will handle ObjectId conversion
                })
            });

            if (!response.ok) throw new Error('Failed to fetch item details');
            
            const items = await response.json();
            if (items.length === 0) {
                console.error('Item not found in database');
                return;
            }
            
            item = items[0];
            console.log('✅ Item fetched for modal:', item._id);
            
        } catch (error) {
            console.error('❌ Error fetching item details:', error);
            alert('アイテムの詳細を取得できませんでした');
            return;
        }
    }

    const modal = document.getElementById('approvalModal');
    const content = document.getElementById('approvalModalContent');
    
    // Calculate defect rate
    const quantityField = getQuantityField(currentApprovalTab);
    const ngField = getNGField(currentApprovalTab);
    const quantity = item[quantityField] || 0;
    const ngCount = item[ngField] || 0;
    const defectRate = quantity > 0 ? ((ngCount / quantity) * 100).toFixed(2) : '0.00';
    
    // Get counter/NG details based on tab
    const counterDetails = getCounterDetails(item, currentApprovalTab);
    
    // Get images for this process type
    const processImages = getProcessImages(item, currentApprovalTab, focusLabel);

    lastSelectedApprovalItem = item;
    lastSelectedApprovalItemId = item._id;
    
    // Check for date/time mismatch
    const mismatch = checkDateTimeMismatch(item);
    const dateWarningClass = mismatch.dateMismatch ? 'text-red-600 font-bold' : 'font-medium';
    const timeWarningClass = mismatch.timeMismatch ? 'text-orange-600 font-semibold' : 'font-medium';
    const dateWarningIcon = mismatch.dateMismatch ? `<i class="ri-alert-fill text-red-600 ml-1" title="入力日付が正しくありません"></i>` : '';
    const timeWarningIcon = mismatch.timeMismatch ? `<i class="ri-time-line text-orange-600 ml-1" title="終了時刻がずれています"></i>` : '';
    
    // Get all fields from the item, excluding system fields
    const excludeFields = ['_id', 'approvalStatus', 'approvedBy', 'approvedAt', 'approvalComment', 'correctionBy', 'correctionAt', 'correctionComment', 'approvalHistory'];
    const allFields = Object.entries(item)
        .filter(([key, value]) => !excludeFields.includes(key) && value !== null && value !== undefined && value !== '')
        .sort(([a], [b]) => a.localeCompare(b));
    
    // Separate Counters object for special handling
    const countersIndex = allFields.findIndex(([key]) => key === 'Counters');
    let countersObject = null;
    if (countersIndex !== -1) {
        countersObject = allFields[countersIndex][1];
        allFields.splice(countersIndex, 1); // Remove Counters from main fields
    }
    
    content.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Complete Information -->
            <div class="lg:col-span-2 space-y-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">基本情報</h4>
                    ${mismatch.dateMismatch ? `
                        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-3 text-xs rounded">
                            <div class="flex items-center">
                                <i class="ri-error-warning-line text-lg mr-2"></i>
                                <div>
                                    <p class="font-semibold">日付エラー検出</p>
                                    <p>入力日付: <strong>${item.Date}</strong> → 実際の送信: <strong>${mismatch.objectIdDate}</strong></p>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    ${mismatch.timeMismatch ? `
                        <div class="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-3 mb-3 text-xs rounded">
                            <div class="flex items-center">
                                <i class="ri-time-line text-lg mr-2"></i>
                                <div>
                                    <p class="font-semibold">時刻のずれ検出</p>
                                    <p>終了時刻: <strong>${item.Time_end}</strong> → 実際の送信: <strong>${mismatch.objectIdTime}</strong></p>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div><span class="text-gray-600">品番:</span> <span class="font-medium">${item.品番 || '-'}</span></div>
                        <div><span class="text-gray-600">背番号:</span> <span class="font-medium">${item.背番号 || '-'}</span></div>
                        <div><span class="text-gray-600">工場:</span> <span class="font-medium">${item.工場 || '-'}</span></div>
                        <div><span class="text-gray-600">設備:</span> <span class="font-medium">${item.設備 || '-'}</span></div>
                        <div><span class="text-gray-600">作業者:</span> <span class="font-medium">${item.Worker_Name || '-'}</span></div>
                        <div><span class="text-gray-600">日付:</span> <span class="${dateWarningClass}">${item.Date || '-'} ${dateWarningIcon}</span></div>
                        <div><span class="text-gray-600">開始:</span> <span class="font-medium">${item.Time_start || '-'}</span></div>
                        <div><span class="text-gray-600">終了:</span> <span class="${timeWarningClass}">${item.Time_end || '-'} ${timeWarningIcon}</span></div>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">生産実績</h4>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div><span class="text-gray-600">処理数量:</span> <span class="font-medium">${quantity.toLocaleString()}</span></div>
                        <div><span class="text-gray-600">不良数:</span> <span class="font-medium text-red-600">${ngCount}</span></div>
                        <div><span class="text-gray-600">不良率:</span> <span class="font-medium ${parseFloat(defectRate) > 0 ? 'text-red-600' : 'text-green-600'}">${defectRate}%</span></div>
                        <div><span class="text-gray-600">サイクルタイム:</span> <span class="font-medium">${item.Cycle_Time || '-'}秒</span></div>
                        ${item.製造ロット ? `<div class="col-span-2"><span class="text-gray-600">製造ロット:</span> <span class="font-medium">${item.製造ロット}</span></div>` : ''}
                        ${item.材料ロット ? `<div class="col-span-2"><span class="text-gray-600">材料ロット:</span> <span class="font-medium">${item.材料ロット}</span></div>` : ''}
                        ${item.SRSコード ? `<div class="col-span-2"><span class="text-gray-600">SRSコード:</span> <span class="font-medium">${item.SRSコード}</span></div>` : ''}
                        ${item.ショット数 ? `<div><span class="text-gray-600">ショット数:</span> <span class="font-medium">${item.ショット数}</span></div>` : ''}
                        ${item.Spare ? `<div><span class="text-gray-600">予備:</span> <span class="font-medium">${item.Spare}</span></div>` : ''}
                    </div>
                </div>
                
                ${counterDetails ? `
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">不良詳細</h4>
                    <div class="text-sm space-y-1">
                        ${counterDetails}
                    </div>
                </div>
                ` : ''}
                
                <!-- Complete MongoDB Data -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">完全データ (MongoDB) - 編集可能</h4>
                    <div class="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto p-2">
                        ${countersObject ? `
                            <div class="bg-white p-2 rounded border">
                                <label class="block text-xs font-medium text-gray-600 mb-2">Counters (個別設定)</label>
                                <div class="grid grid-cols-2 gap-2">
                                    ${Object.entries(countersObject).map(([counterKey, counterValue]) => `
                                        <div class="flex items-center space-x-2">
                                            <label class="text-xs text-gray-600 min-w-0 flex-shrink-0">${counterKey}:</label>
                                            <input type="number" 
                                                   value="${counterValue}" 
                                                   class="flex-1 p-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                   data-field="Counters.${counterKey}"
                                                   data-item-id="${item._id}"
                                                   min="0">
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${allFields.map(([key, value]) => `
                            <div class="bg-white p-2 rounded border">
                                <label class="block text-xs font-medium text-gray-600 mb-1">${key}</label>
                                <input type="text" 
                                       value="${typeof value === 'object' ? JSON.stringify(value) : value}" 
                                       class="w-full p-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                       data-field="${key}"
                                       data-item-id="${item._id}">
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${item.Comment ? `
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">コメント</h4>
                    <div class="text-sm">${item.Comment}</div>
                </div>
                ` : ''}
                
                <!-- Approval Status -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">承認状況</h4>
                    ${getApprovalStatusHTML(item)}
                </div>
            </div>
            
            <!-- Images Section -->
            <div class="space-y-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">提出画像</h4>
                    <div class="space-y-3">
                        ${processImages.submitted}
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">マスター参考画像</h4>
                    <div class="space-y-3">
                        ${processImages.master}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    
    // Add input change listeners for editable fields
    setTimeout(() => {
        addInputChangeListeners();
    }, 100);
};

/**
 * Get counter/NG details based on process type
 */
function getCounterDetails(item, tabName) {
    switch (tabName) {
        case 'kensaDB':
            if (item.Counters && typeof item.Counters === 'object') {
                const activeCounters = Object.entries(item.Counters).filter(([key, value]) => value > 0);
                if (activeCounters.length === 0) {
                    return '<div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center"><span class="text-green-700 font-medium">✅ 不良なし</span></div>';
                }
                return `
                    <div class="grid grid-cols-2 gap-3">
                        ${activeCounters.map(([key, value]) => `
                            <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                <div class="text-xs text-gray-600 font-medium">${key}</div>
                                <div class="text-lg font-bold text-red-600">${value}</div>
                                <div class="text-xs text-gray-500">件</div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            return null;
            
        case 'pressDB':
            const pressCounters = [
                ['疵引不良', item.疵引不良 || 0],
                ['加工不良', item.加工不良 || 0],
                ['その他', item.その他 || 0]
            ];
            const activePressCounters = pressCounters.filter(([key, value]) => value > 0);
            if (activePressCounters.length === 0) {
                return '<div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center"><span class="text-green-700 font-medium">✅ 不良なし</span></div>';
            }
            return `
                <div class="grid grid-cols-2 gap-3">
                    ${activePressCounters.map(([key, value]) => `
                        <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                            <div class="text-xs text-gray-600 font-medium">${key}</div>
                            <div class="text-lg font-bold text-red-600">${value}</div>
                            <div class="text-xs text-gray-500">件</div>
                        </div>
                    `).join('')}
                </div>
            `;
            
        case 'SRSDB':
            const srsCounters = [
                ['くっつき・めくれ', item['くっつき・めくれ'] || 0],
                ['シワ', item.シワ || 0],
                ['転写位置ズレ', item.転写位置ズレ || 0],
                ['転写不良', item.転写不良 || 0],
                ['文字欠け', item.文字欠け || 0],
                ['その他', item.その他 || 0]
            ];
            const activeSrsCounters = srsCounters.filter(([key, value]) => value > 0);
            if (activeSrsCounters.length === 0) {
                return '<div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center"><span class="text-green-700 font-medium">✅ 不良なし</span></div>';
            }
            return `
                <div class="grid grid-cols-2 gap-3">
                    ${activeSrsCounters.map(([key, value]) => `
                        <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                            <div class="text-xs text-gray-600 font-medium">${key}</div>
                            <div class="text-lg font-bold text-red-600">${value}</div>
                            <div class="text-xs text-gray-500">件</div>
                        </div>
                    `).join('')}
                </div>
            `;
            
        case 'slitDB':
            const slitCounters = [
                ['疵引不良', item.疵引不良 || 0],
                ['加工不良', item.加工不良 || 0],
                ['その他', item.その他 || 0]
            ];
            const activeSlitCounters = slitCounters.filter(([key, value]) => value > 0);
            if (activeSlitCounters.length === 0) {
                return '<div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center"><span class="text-green-700 font-medium">✅ 不良なし</span></div>';
            }
            return `
                <div class="grid grid-cols-2 gap-3">
                    ${activeSlitCounters.map(([key, value]) => `
                        <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                            <div class="text-xs text-gray-600 font-medium">${key}</div>
                            <div class="text-lg font-bold text-red-600">${value}</div>
                            <div class="text-xs text-gray-500">件</div>
                        </div>
                    `).join('')}
                </div>
            `;
            
        default:
            return null;
    }
}

/**
 * Get process images based on tab
 */
function getProcessImages(item, tabName, focusLabel = null) {
  const submittedImages = [];

  const entries = collectApprovalImageEntries(item, tabName);
  entries.forEach(entry => {
    const highlightClass = focusLabel && entry.label === focusLabel ? 'ring-2 ring-blue-500' : '';
    submittedImages.push(`
      <div class="rounded border p-2 ${highlightClass}">
        <label class="text-sm font-medium text-gray-700 mb-1 block">${entry.label}</label>
        <img src="${entry.url}" alt="${entry.label}" class="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-75 transition-opacity" onclick="window.open('${entry.url}', '_blank')" title="クリックで拡大表示">
      </div>
    `);
  });
    
    // Master reference image using picLINK function
    let masterImageHTML = `
        <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">マスター画像 (${item.背番号})</label>
            <div id="masterImageContainer-${item._id}" class="w-full h-32 bg-gray-100 rounded border flex items-center justify-center cursor-pointer hover:opacity-75 transition-opacity">
                <span class="text-gray-500 text-sm">画像を読み込み中...</span>
            </div>
        </div>
    `;
    
    // Try to load master image
    setTimeout(() => {
        loadMasterImage(item.品番, item.背番号, `masterImageContainer-${item._id}`);
    }, 100);
    
    return {
        submitted: submittedImages.length > 0 ? submittedImages.join('') : '<div class="text-gray-500">提出画像なし</div>',
        master: masterImageHTML
    };
}

/**
 * Load master image using database query like in factories.js
 */
async function loadMasterImage(品番, 背番号, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Show loading state
    container.innerHTML = '<div class="text-gray-500 text-center text-sm flex items-center justify-center h-full"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>読み込み中...</div>';
    
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
            container.innerHTML = `<img src="${masterData.imageURL}" alt="マスター画像" class="w-full h-full object-cover rounded cursor-pointer hover:opacity-75 transition-opacity" onclick="window.open('${masterData.imageURL}', '_blank')" title="クリックで拡大表示">`;
            container.onclick = () => window.open(masterData.imageURL, '_blank');
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
                    container.innerHTML = `<img src="${masterData.imageURL}" alt="マスター画像" class="w-full h-full object-cover rounded cursor-pointer hover:opacity-75 transition-opacity" onclick="window.open('${masterData.imageURL}', '_blank')" title="クリックで拡大表示">`;
                    container.onclick = () => window.open(masterData.imageURL, '_blank');
                } else {
                    // No image found
                    container.innerHTML = '<div class="text-gray-500 text-center text-sm">マスター画像なし</div>';
                }
            } else {
                // No image found
                container.innerHTML = '<div class="text-gray-500 text-center text-sm">マスター画像なし</div>';
            }
        }
    } catch (error) {
        console.error("Master image load error:", error);
        container.innerHTML = '<div class="text-gray-500 text-center text-sm">画像読み込みエラー</div>';
    }
}

/**
 * Get approval status HTML
 */
function getApprovalStatusHTML(item) {
    const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    
    let statusHTML = `<div class="space-y-3">`;
    
    // Current status display
    statusHTML += `<div class="flex items-center space-x-2">`;
    
    if (!item.approvalStatus || item.approvalStatus === 'pending') {
        statusHTML += `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <i class="ri-time-line mr-1"></i>保留中（班長承認待ち）
            </span>
        `;
        
        // 班長 can approve in first step
        if (currentUser.role === '班長') {
            statusHTML += `
                <button onclick="approveItem('${item._id}')" class="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                    班長承認
                </button>
                <button onclick="requestCorrection('${item._id}')" class="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">
                    修正要求
                </button>
            `;
        }
    } else if (item.approvalStatus === 'hancho_approved') {
        statusHTML += `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <i class="ri-user-check-line mr-1"></i>班長承認済み（課長承認待ち）
            </span>
        `;
        
        // 課長, admin, 部長 can approve in second step
        if (['課長', 'admin', '部長'].includes(currentUser.role)) {
            statusHTML += `
                <button onclick="approveItem('${item._id}')" class="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                    課長承認
                </button>
                <button onclick="requestCorrection('${item._id}')" class="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">
                    修正要求
                </button>
            `;
        }
        
        if (item.hanchoApprovedBy) {
            statusHTML += `<div class="text-xs text-gray-600">班長承認: ${item.hanchoApprovedBy}</div>`;
        }
        if (item.hanchoApprovedAt) {
            statusHTML += `<div class="text-xs text-gray-600">${new Date(item.hanchoApprovedAt).toLocaleString('ja-JP')}</div>`;
        }
    } else if (item.approvalStatus === 'fully_approved') {
        statusHTML += `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <i class="ri-check-double-line mr-1"></i>完全承認済み
            </span>
        `;
        
        if (item.hanchoApprovedBy && item.kachoApprovedBy) {
            statusHTML += `
                <div class="text-xs text-gray-600 space-y-1">
                    <div>班長承認: ${item.hanchoApprovedBy} (${new Date(item.hanchoApprovedAt).toLocaleString('ja-JP')})</div>
                    <div>課長承認: ${item.kachoApprovedBy} (${new Date(item.kachoApprovedAt).toLocaleString('ja-JP')})</div>
                </div>
            `;
        }
    } else if (item.approvalStatus === 'correction_needed') {
        statusHTML += `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <i class="ri-error-warning-line mr-1"></i>修正要求
            </span>
        `;
        if (item.correctionBy) {
            statusHTML += `<div class="text-xs text-gray-600">要求者: ${item.correctionBy}</div>`;
        }
        if (item.correctionComment) {
            statusHTML += `<div class="mt-2 text-xs text-gray-600 bg-red-50 p-2 rounded">${item.correctionComment}</div>`;
        }
    } else if (item.approvalStatus === 'correction_needed_from_kacho') {
        statusHTML += `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                <i class="ri-error-warning-line mr-1"></i>課長修正要求（班長対応）
            </span>
        `;
        
        // 班長 can edit data and re-approve
        if (currentUser.role === '班長') {
            statusHTML += `
                <button onclick="approveItem('${item._id}')" class="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                    修正完了・再承認
                </button>
            `;
        }
        
        if (item.correctionBy) {
            statusHTML += `<div class="text-xs text-gray-600">修正要求者: ${item.correctionBy}</div>`;
        }
        if (item.correctionComment) {
            statusHTML += `<div class="mt-2 text-xs text-gray-600 bg-orange-50 p-2 rounded">${item.correctionComment}</div>`;
        }
    }
    
    statusHTML += `</div>`;
    
    // Version history
    if (item.approvalHistory && item.approvalHistory.length > 0) {
        statusHTML += `
            <div class="mt-3">
                <h5 class="text-sm font-medium text-gray-900 mb-2">承認履歴</h5>
                <div class="space-y-1 max-h-80 overflow-y-auto border rounded-lg bg-white p-3">
                    ${item.approvalHistory.map(history => `
                        <div class="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <div class="font-medium">${history.action} - ${history.user}</div>
                            <div>${new Date(history.timestamp).toLocaleString('ja-JP')}</div>
                            ${history.comment ? `<div class="mt-1">${history.comment}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    statusHTML += `</div>`;
    
    return statusHTML;
}

/**
 * Close approval modal
 */
window.closeApprovalModal = function() {
    document.getElementById('approvalModal').classList.add('hidden');
};

/**
 * Approve an item (2-step approval process)
 */
window.approveItem = async function(itemId) {
    try {
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        
        // First try to find item in current page data, otherwise fetch from server
        let item = filteredApprovalData.find(d => d._id === itemId);
        
        if (!item) {
            console.log('🔍 Item not found in current page, fetching from server...');
            // Fetch item from server
            const response = await fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dbName: "submittedDB",
                    collectionName: currentApprovalTab,
                    query: { _id: itemId }
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch item details');
            }
            
            const items = await response.json();
            if (!items || items.length === 0) {
                throw new Error('Item not found');
            }
            
            item = items[0];
            console.log('✅ Item fetched from server:', item._id);
        }
        
        if (!item) {
            throw new Error('Item not found');
        }
        
        // Get user's full name for display
        const userFullName = await getUserFullName(currentUser.username);
        
        let newStatus, approvalField, approvalByField, actionText;
        
        // Determine next approval step based on current status and user role
        if ((!item.approvalStatus || item.approvalStatus === 'pending') && currentUser.role === '班長') {
            // First step: 班長 approval
            newStatus = 'hancho_approved';
            approvalField = 'hanchoApprovedBy';
            approvalByField = 'hanchoApprovedAt';
            actionText = '班長承認';
        } else if (item.approvalStatus === 'hancho_approved' && ['課長', 'admin', '部長'].includes(currentUser.role)) {
            // Second step: 課長 approval
            newStatus = 'fully_approved';
            approvalField = 'kachoApprovedBy';
            approvalByField = 'kachoApprovedAt';
            actionText = '課長承認';
        } else if (item.approvalStatus === 'correction_needed_from_kacho' && currentUser.role === '班長') {
            // Re-approval after 課長 correction request
            newStatus = 'hancho_approved';
            approvalField = 'hanchoApprovedBy';
            approvalByField = 'hanchoApprovedAt';
            actionText = '修正完了・再承認';
        } else {
            alert("承認権限がありません");
            return;
        }
        
        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "submittedDB",
                collectionName: currentApprovalTab,
                query: { _id: itemId },
                update: {
                    $set: {
                        approvalStatus: newStatus,
                        [approvalField]: userFullName,
                        [approvalByField]: new Date()
                    },
                    $push: {
                        approvalHistory: {
                            action: actionText,
                            user: userFullName,
                            timestamp: new Date()
                        }
                    }
                }
            })
        });
        
        if (!response.ok) throw new Error('Failed to approve item');
        
        let stepMessage;
        if (actionText === '修正完了・再承認') {
            stepMessage = '修正完了・班長再承認（課長承認待ち）';
        } else if (newStatus === 'hancho_approved') {
            stepMessage = '班長承認完了（課長承認待ち）';
        } else {
            stepMessage = '課長承認完了（承認完了）';
        }
        
        alert(stepMessage);
        closeApprovalModal();
        
        // Reload current view data
        const viewMode = document.getElementById('viewModeSelect')?.value;
        if (viewMode === 'list') {
            await renderApprovalList();
        } else {
            await loadApprovalTableData();
        }
        
    } catch (error) {
        console.error('Error approving item:', error);
        alert("承認に失敗しました");
    }
};

/**
 * Get user's full name for display
 */
async function getUserFullName(username) {
    try {
        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "Sasaki_Coating_MasterDB",
                collectionName: "users",
                query: { username: username },
                projection: { firstName: 1, lastName: 1 }
            })
        });

        if (response.ok) {
            const users = await response.json();
            if (users.length > 0) {
                const user = users[0];
                return `${user.lastName || ''} ${user.firstName || ''}`.trim() || username;
            }
        }
        return username; // Fallback to username if full name not found
    } catch (error) {
        console.error('Error getting user full name:', error);
        return username;
    }
}

/**
 * Request correction for an item
 */
window.requestCorrection = async function(itemId) {
    const comment = prompt("修正要求の理由を入力してください:");
    if (!comment || comment.trim() === "") {
        alert("修正要求の理由を入力してください");
        return;
    }
    
    try {
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const userFullName = await getUserFullName(currentUser.username);
        
        // First try to find item in current page data, otherwise fetch from server
        let item = filteredApprovalData.find(d => d._id === itemId);
        
        if (!item) {
            console.log('🔍 Item not found in current page, fetching from server...');
            // Fetch item from server
            const response = await fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dbName: "submittedDB",
                    collectionName: currentApprovalTab,
                    query: { _id: itemId }
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch item details');
            }
            
            const items = await response.json();
            if (!items || items.length === 0) {
                throw new Error('Item not found');
            }
            
            item = items[0];
            console.log('✅ Item fetched from server:', item._id);
        }
        
        if (!item) {
            throw new Error('Item not found');
        }
        
        let newStatus, targetRole;
        
        // Determine correction logic based on current status and user role
        if (currentUser.role === '班長' && (!item.approvalStatus || item.approvalStatus === 'pending')) {
            // Scenario 2: 班長 requests correction - goes back to submitter (original logic)
            newStatus = 'correction_needed';
            targetRole = 'submitter';
        } else if (['課長', 'admin', '部長'].includes(currentUser.role) && item.approvalStatus === 'hancho_approved') {
            // Scenario 1: 課長 requests correction after 班長 approval - goes back to 班長
            newStatus = 'correction_needed_from_kacho';
            targetRole = '班長';
        } else {
            alert("修正要求権限がありません");
            return;
        }
        
        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "submittedDB",
                collectionName: currentApprovalTab,
                query: { _id: itemId },
                update: {
                    $set: {
                        approvalStatus: newStatus,
                        correctionBy: userFullName,
                        correctionAt: new Date(),
                        correctionComment: comment,
                        correctionTarget: targetRole
                    },
                    $push: {
                        approvalHistory: {
                            action: '修正要求',
                            user: userFullName,
                            timestamp: new Date(),
                            comment: comment,
                            target: targetRole
                        }
                    }
                }
            })
        });
        
        if (!response.ok) throw new Error('Failed to request correction');
        
        const targetMessage = targetRole === '班長' ? 
            "修正要求を送信しました（班長による修正が必要）" : 
            "修正要求を送信しました（提出者による修正が必要）";
        alert(targetMessage);
        closeApprovalModal();
        
        // Reload current view data
        const viewMode = document.getElementById('viewModeSelect')?.value;
        if (viewMode === 'list') {
            await renderApprovalList();
        } else {
            await loadApprovalTableData();
        }
        
    } catch (error) {
        console.error('Error requesting correction:', error);
        alert("修正要求の送信に失敗しました");
    }
};

/**
 * Save edited field value to database
 */
window.saveFieldValue = function(fieldName, newValue, itemId) {
    // Add save functionality - can be implemented when backend is ready
    console.log('Field updated:', { fieldName, newValue, itemId });
    // This would make an API call to update the specific field
    // For now, we'll just log it
};

// Add event listeners for input changes after modal is created
function addInputChangeListeners() {
    const inputs = document.querySelectorAll('input[data-field]');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            const fieldName = this.dataset.field;
            const newValue = this.value;
            const itemId = this.dataset.itemId;
            
            // Visual feedback for unsaved changes
            this.style.backgroundColor = '#fef3c7'; // yellow background
            this.title = '変更が保存待ちです';
            
            // You can implement auto-save or add a save button
            // saveFieldValue(fieldName, newValue, itemId);
        });
        
        input.addEventListener('focus', function() {
            this.style.backgroundColor = '#ffffff';
            this.title = '';
        });
    });
}

// Call this function after the modal is opened
// addInputChangeListeners();

// ============================================
// NEW VIEW MODE FUNCTIONALITY
// ============================================

/**
 * Toggle between table and list view modes
 */
async function toggleViewMode(viewMode) {
    const tableContainer = document.getElementById('approvalsTableContainer');
    const listContainer = document.getElementById('approvalsListContainer');
    const listControls = document.getElementById('listViewControls');
    const summaryReport = document.getElementById('summaryReport');
    const pagination = document.querySelector('.flex.items-center.justify-between.mt-6');
    const paginationContainer = document.getElementById('paginationContainer');

    if (viewMode === 'list') {
        // Show list view
        tableContainer.classList.add('hidden');
        listContainer.classList.remove('hidden');
        listControls.classList.remove('hidden');
        summaryReport.classList.remove('hidden');
        // Hide main pagination for list view (we use inline pagination)
        if (pagination) pagination.classList.add('hidden');
        if (paginationContainer) paginationContainer.classList.add('hidden');
        
        console.log('📋 List view activated - main pagination hidden, using inline pagination');
        
        // Initialize list view
        initializeListView();
        await renderApprovalList();
        generateSummaryReport();
    } else {
        // Show table view (default)
        tableContainer.classList.remove('hidden');
        listContainer.classList.add('hidden');
        listControls.classList.add('hidden');
        summaryReport.classList.add('hidden');
        // Show main pagination for table view
        if (pagination) pagination.classList.remove('hidden');
        if (paginationContainer) paginationContainer.classList.remove('hidden');
        
        // Render table view
        loadApprovalTableData(); // Reload table data properly
    }
}

/**
 * Initialize list view event listeners
 */
function initializeListView() {
    // Batch approval buttons
    document.getElementById('batchApproveBtn').addEventListener('click', handleBatchApproval);
    document.getElementById('batchRejectBtn').addEventListener('click', handleBatchReject);
}

/**
 * Load ALL approval data for list view (batch operations)
 * This bypasses pagination to get all records for batch approval
 */
async function loadApprovalDataForListView() {
    try {
        const factoryAccess = getFactoryAccessForUser();
        const filters = buildApprovalQueryFilters();
        
        console.log('📋 Loading ALL data for list view (batch approval)...');
        
        // Try the optimized route first but request ALL data
        const response = await fetch(BASE_URL + 'api/approval-paginate', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                collectionName: currentApprovalTab,
                page: 1,
                limit: 10000, // Request large limit for all data
                maxLimit: 10000,
                filters: filters,
                userRole: currentUserData.role,
                factoryAccess: factoryAccess
            })
        });

        if (!response.ok) {
            throw new Error('Optimized route not available');
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load all data');
        }

        console.log(`✅ All data loaded for list view: ${result.data.length} total items`);
        
        return result.data;
        
    } catch (error) {
        console.error('❌ Error loading all data, using fallback:', error);
        return await loadApprovalDataForListViewFallback();
    }
}

/**
 * Fallback method to load ALL data for list view
 */
async function loadApprovalDataForListViewFallback() {
    console.log('📄 Loading ALL data for list view via fallback...');
    
    const factoryAccess = getFactoryAccessForUser();
    let combinedQuery = {};
    
    // Apply current filters
    const currentFilters = buildApprovalQueryFilters();
    combinedQuery = { ...combinedQuery, ...currentFilters };
    
    // Apply factory access controls
    if (currentUserData.role !== 'admin' && currentUserData.role !== '部長' && factoryAccess.length > 0) {
        combinedQuery.工場 = { $in: factoryAccess };
    }

    const response = await fetch(BASE_URL + "queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            dbName: "submittedDB",
            collectionName: currentApprovalTab,
            query: combinedQuery,
            limit: 10000, // Get all data
            sort: { Date: -1, _id: -1 }
        })
    });

    if (!response.ok) throw new Error('Failed to fetch all data for list view');
    
    const data = await response.json();
    console.log('✅ All data loaded via fallback for list view:', data.length, 'items');
    
    return data;
}
async function renderApprovalList() {
    const container = document.getElementById('approvalsListContainer');
    
    // Show loading state
    container.innerHTML = '<div class="p-8 text-center text-gray-500"><i class="ri-loader-4-line animate-spin text-xl mr-2"></i>Loading data...</div>';
    
    try {
        // Load data with pagination for list view
        console.log('📋 Loading paginated data for list view...');
        
        // Use the same pagination as table view
        const factoryAccess = getFactoryAccessForUser();
        const filters = buildApprovalQueryFilters();
        
        // Try the new paginated API first
        let result = null;
        try {
            const response = await fetch(BASE_URL + 'api/approval-paginate', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    collectionName: currentApprovalTab,
                    page: currentApprovalPage,
                    limit: itemsPerPage,
                    maxLimit: 100,
                    filters: filters,
                    userRole: currentUserData.role,
                    factoryAccess: factoryAccess
                })
            });
            
            if (response.ok) {
                result = await response.json();
                if (result.success) {
                    console.log(`✅ Paginated list data loaded: ${result.data.length} items, Page ${result.pagination.currentPage}/${result.pagination.totalPages}`);
                }
            }
        } catch (error) {
            console.log('📋 Paginated API not available, using fallback...');
        }
        
        let listData, paginationInfo;
        
        if (result && result.success) {
            // Use paginated data
            listData = result.data;
            paginationInfo = result.pagination;
        } else {
            // Fallback: Load all data and paginate client-side
            const allData = await loadApprovalDataForListView();
            const startIndex = (currentApprovalPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            listData = allData.slice(startIndex, endIndex);
            
            const totalPages = Math.ceil(allData.length / itemsPerPage);
            paginationInfo = {
                currentPage: currentApprovalPage,
                totalPages: totalPages,
                totalRecords: allData.length,
                itemsPerPage: itemsPerPage,
                hasNext: currentApprovalPage < totalPages,
                hasPrevious: currentApprovalPage > 1,
                startIndex: startIndex + 1,
                endIndex: Math.min(endIndex, allData.length)
            };
        }

        if (listData.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-gray-500">データがありません</div>';
            return;
        }

        // Update global variable for current page operations and apply any active sort
        filteredApprovalData = applySortToData(listData);

        // Use backend sorting (which already has priority: date errors → time warnings → FIFO)
        // Only apply additional client-side sort if user explicitly clicked a column
        let sortedData = [...filteredApprovalData];
        // DO NOT sort by Time_start by default - respect backend's priority sorting
        // Backend already sorted by: _hasDateMismatch DESC, _hasTimeMismatch DESC, _id ASC (FIFO)

        console.log(`📋 Rendering list view with ${sortedData.length} items (Page ${paginationInfo.currentPage}/${paginationInfo.totalPages})`);

        // Get all possible fields for the current tab
        const allFields = getAllFieldsForTab(currentApprovalTab, sortedData);

        // Create comprehensive table structure with pagination info header
        const listHTML = `
            <div class="bg-white border rounded-lg overflow-hidden">
                <!-- Batch Operations Summary -->
                <div class="bg-blue-50 border-b p-3">
                    <div class="text-sm text-blue-800">
                        <i class="ri-information-line mr-1"></i>
                        <strong>List View (Batch Approval)</strong> - Page ${paginationInfo.currentPage} of ${paginationInfo.totalPages}
                        <span class="ml-4 text-blue-600">Showing ${paginationInfo.startIndex}-${paginationInfo.endIndex} of ${paginationInfo.totalRecords} records</span>
                    </div>
                </div>
                
                <!-- Excel-like table -->
                <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                    <thead class="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <th class="border p-2 w-8">
                                <input type="checkbox" id="selectAllListItems" class="rounded" onchange="toggleSelectAll(this)">
                            </th>
                            <th class="border p-2 text-left font-medium text-gray-700 bg-yellow-50 cursor-pointer hover:bg-yellow-100" onclick="sortApprovalTable('approvalStatus')">
                                Status${getSortArrow('approvalStatus')}
                            </th>
                            ${allFields.map(field => {
                                const fieldKey = field.name.includes('.') ? field.name.split('.')[1] : field.name;
                                const isClickable = ['Date', 'Time_start', 'Time_end', '工場', '品番', '背番号', 'Worker_Name', '設備'].includes(field.name) || 
                                                  field.name.includes('加工数') || field.name.includes('不良') || field.name.includes('NG');
                                
                                if (isClickable) {
                                    return `
                                        <th class="border p-2 text-left font-medium text-gray-700 min-w-24 cursor-pointer hover:bg-gray-100 ${field.isGrouped ? 'bg-blue-50 hover:bg-blue-100' : ''}" 
                                            onclick="sortApprovalTable('${field.name}')" 
                                            title="${field.description || field.name}">
                                            ${field.displayName}${getSortArrow(field.name)}
                                            ${field.isGrouped ? `<br><span class="text-xs text-blue-600">(${field.group})</span>` : ''}
                                        </th>
                                    `;
                                } else {
                                    return `
                                        <th class="border p-2 text-left font-medium text-gray-700 min-w-24 ${field.isGrouped ? 'bg-blue-50' : ''}" title="${field.description || field.name}">
                                            ${field.displayName}
                                            ${field.isGrouped ? `<br><span class="text-xs text-blue-600">(${field.group})</span>` : ''}
                                        </th>
                                    `;
                                }
                            }).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedData.map((item, index) => createListRow(item, index, allFields)).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- List View Pagination (inline) -->
            <div class="flex items-center justify-between mt-4 p-4 bg-gray-50 border rounded-lg">
                <div class="text-sm text-gray-700">
                    ${paginationInfo.totalRecords}件中 ${paginationInfo.startIndex}-${paginationInfo.endIndex}件を表示
                </div>
                <div class="flex items-center space-x-2" id="listPaginationControls">
                    <button type="button" onclick="event.preventDefault(); changeListPage(-1); return false;" class="p-2 border rounded hover:bg-gray-50 bg-white shadow-sm" ${!paginationInfo.hasPrevious ? 'disabled' : ''}>前へ</button>
                    <div class="flex space-x-1" id="listPageNumbers">
                        <!-- Enhanced pagination will be generated by JavaScript -->
                    </div>
                    <button type="button" onclick="event.preventDefault(); changeListPage(1); return false;" class="p-2 border rounded hover:bg-gray-50 bg-white shadow-sm" ${!paginationInfo.hasNext ? 'disabled' : ''}>次へ</button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = listHTML;

    // Generate enhanced pagination for list view (same as table view)
    const listPageNumbers = document.getElementById('listPageNumbers');
    if (listPageNumbers && paginationInfo.totalPages > 0) {
        // Clear existing buttons
        listPageNumbers.innerHTML = '';
        
        const totalPages = paginationInfo.totalPages;
        const currentPage = paginationInfo.currentPage;
        
        // Helper function to create page button for list view
        const createListPageButton = (pageNum, isActive = false, isEllipsis = false) => {
            const pageBtn = document.createElement('button');
            pageBtn.type = 'button';
            
            if (isEllipsis) {
                pageBtn.textContent = '...';
                pageBtn.className = 'px-3 py-1 border rounded bg-white shadow-sm cursor-default';
                pageBtn.disabled = true;
            } else {
                pageBtn.textContent = pageNum;
                pageBtn.className = `px-3 py-1 border rounded bg-white shadow-sm ${isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'}`;
                pageBtn.onclick = (e) => {
                    e.preventDefault();
                    console.log(`🖱️ List page button ${pageNum} clicked!`);
                    window.goToListPage(pageNum);
                    return false;
                };
            }
            return pageBtn;
        };
        
        if (totalPages <= 7) {
            // Show all pages if 7 or fewer
            for (let i = 1; i <= totalPages; i++) {
                const pageBtn = createListPageButton(i, i === currentPage);
                listPageNumbers.appendChild(pageBtn);
            }
        } else {
            // Complex pagination for many pages (same logic as table view)
            // Always show page 1
            const page1Btn = createListPageButton(1, currentPage === 1);
            listPageNumbers.appendChild(page1Btn);
            
            let startRange, endRange;
            
            if (currentPage <= 4) {
                // Near beginning: 1 2 3 4 5 ... 10
                startRange = 2;
                endRange = 5;
            } else if (currentPage >= totalPages - 3) {
                // Near end: 1 ... 6 7 8 9 10
                startRange = totalPages - 4;
                endRange = totalPages - 1;
            } else {
                // Middle: 1 ... 4 5 6 ... 10
                startRange = currentPage - 1;
                endRange = currentPage + 1;
            }
            
            // Add ellipsis after page 1 if needed
            if (startRange > 2) {
                const ellipsisBtn = createListPageButton(0, false, true);
                listPageNumbers.appendChild(ellipsisBtn);
            }
            
            // Add middle range
            for (let i = startRange; i <= endRange; i++) {
                const pageBtn = createListPageButton(i, i === currentPage);
                listPageNumbers.appendChild(pageBtn);
            }
            
            // Add ellipsis before last page if needed
            if (endRange < totalPages - 1) {
                const ellipsisBtn = createListPageButton(0, false, true);
                listPageNumbers.appendChild(ellipsisBtn);
            }
            
            // Always show last page (if not already shown)
            if (endRange < totalPages) {
                const lastPageBtn = createListPageButton(totalPages, currentPage === totalPages);
                listPageNumbers.appendChild(lastPageBtn);
            }
        }
        
    }

    // Add event listeners for list interactions
    addListEventListeners();
    
    // No need to update the main pagination since we have inline pagination
    console.log('📋 List view rendered with inline pagination');
    
    } catch (error) {
        console.error('❌ Error loading data for batch approval:', error);
        container.innerHTML = '<div class="p-8 text-center text-red-500">Error loading data for batch approval. Please try refreshing.</div>';
    }
}

/**
 * Generate page buttons HTML for inline pagination
 */
function generatePageButtons(currentPage, totalPages) {
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    let buttonsHTML = '';
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        buttonsHTML += `<button type="button" onclick="event.preventDefault(); goToListPage(${i}); return false;" class="px-3 py-1 border rounded bg-white shadow-sm ${isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'}">${i}</button>`;
    }
    return buttonsHTML;
}

/**
 * Change list page without scrolling
 */
window.changeListPage = function(direction) {
    const newPage = currentApprovalPage + direction;
    console.log(`🔄 changeListPage called: direction=${direction}, current=${currentApprovalPage}, new=${newPage}`);
    
    if (newPage >= 1) {
        // Store current scroll position before any DOM changes
        const scrollInfo = {
            window: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop,
            documentElement: document.documentElement.scrollTop,
            body: document.body.scrollTop
        };
        
        console.log('📍 Storing scroll position:', scrollInfo);
        
        currentApprovalPage = newPage;
        
        // Temporarily disable scroll restoration
        const originalScrollRestoration = history.scrollRestoration;
        if (history.scrollRestoration) {
            history.scrollRestoration = 'manual';
        }
        
        renderApprovalList().then(() => {
            // Multiple attempts to restore scroll position
            const restoreScroll = () => {
                window.scrollTo(0, scrollInfo.window);
                document.documentElement.scrollTop = scrollInfo.documentElement;
                document.body.scrollTop = scrollInfo.body;
                console.log('📍 Restored scroll to:', scrollInfo.window);
            };
            
            // Immediate restore
            restoreScroll();
            
            // Delayed restore (in case DOM is still updating)
            setTimeout(restoreScroll, 0);
            setTimeout(restoreScroll, 10);
            setTimeout(restoreScroll, 50);
            
            // Restore scroll restoration setting
            if (originalScrollRestoration) {
                history.scrollRestoration = originalScrollRestoration;
            }
        }).catch(error => {
            console.error('Error in renderApprovalList:', error);
        });
    }
}

/**
 * Go to specific list page without scrolling
 */
window.goToListPage = function(page) {
    console.log(`🔄 goToListPage called: page=${page}, current=${currentApprovalPage}`);
    
    if (page >= 1) {
        // Store current scroll position before any DOM changes
        const scrollInfo = {
            window: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop,
            documentElement: document.documentElement.scrollTop,
            body: document.body.scrollTop
        };
        
        console.log('📍 Storing scroll position:', scrollInfo);
        
        currentApprovalPage = page;
        
        // Temporarily disable scroll restoration
        const originalScrollRestoration = history.scrollRestoration;
        if (history.scrollRestoration) {
            history.scrollRestoration = 'manual';
        }
        
        renderApprovalList().then(() => {
            // Multiple attempts to restore scroll position
            const restoreScroll = () => {
                window.scrollTo(0, scrollInfo.window);
                document.documentElement.scrollTop = scrollInfo.documentElement;
                document.body.scrollTop = scrollInfo.body;
                console.log('📍 Restored scroll to:', scrollInfo.window);
            };
            
            // Immediate restore
            restoreScroll();
            
            // Delayed restore (in case DOM is still updating)
            setTimeout(restoreScroll, 0);
            setTimeout(restoreScroll, 10);
            setTimeout(restoreScroll, 50);
            
            // Restore scroll restoration setting
            if (originalScrollRestoration) {
                history.scrollRestoration = originalScrollRestoration;
            }
        }).catch(error => {
            console.error('Error in renderApprovalList:', error);
        });
    }
}

/**
 * Get all possible fields for the current tab
 */
function getAllFieldsForTab(tabName, data) {
    const fields = [];
    
    // Basic fields (always shown)
    const basicFields = [
        { name: 'Date', displayName: '日付', group: null },
        { name: 'Time_start', displayName: '開始時間', group: null },
        { name: 'Time_end', displayName: '終了時間', group: null },
        { name: '工場', displayName: '工場', group: null },
        { name: '品番', displayName: '品番', group: null },
        { name: '背番号', displayName: '背番号', group: null },
        { name: 'Worker_Name', displayName: '作業者', group: null },
        { name: '設備', displayName: '設備', group: null }
    ];

    // Add basic fields that exist in data
    basicFields.forEach(field => {
        if (data.some(item => item[field.name] !== undefined && item[field.name] !== null && item[field.name] !== '')) {
            fields.push(field);
        }
    });

    // Process-specific fields
    const processFields = [];
    
    if (tabName === 'kensaDB') {
        processFields.push(
            { name: 'Process_Quantity', displayName: '処理数', group: null },
            { name: 'Remaining_Quantity', displayName: '残り数', group: null },
            { name: 'Total', displayName: 'Total', group: null },
            { name: 'Total_NG', displayName: 'Total NG', group: null },
            { name: '製造ロット', displayName: '製造ロット', group: null }
        );

        // Add counter fields
        const sampleItem = data.find(item => item.Counters);
        if (sampleItem && sampleItem.Counters) {
            Object.keys(sampleItem.Counters).forEach(counter => {
                processFields.push({
                    name: `Counters.${counter}`,
                    displayName: counter,
                    group: 'Counters',
                    isGrouped: true
                });
            });
        }
    } else if (tabName === 'pressDB') {
        processFields.push(
            { name: 'Total', displayName: 'Total', group: null },
            { name: 'Total_NG', displayName: 'Total NG', group: null },
            { name: '材料ロット', displayName: '材料ロット', group: null },
            { name: 'Cycle_Time', displayName: 'サイクル時間', group: null },
            { name: 'ショット数', displayName: 'ショット数', group: null },
            { name: '疵引処理数', displayName: '疵引処理数', group: 'NG Details', isGrouped: true },
            { name: '疵引不良', displayName: '疵引不良', group: 'NG Details', isGrouped: true },
            { name: '加工不良', displayName: '加工不良', group: 'NG Details', isGrouped: true },
            { name: 'その他', displayName: 'その他', group: 'NG Details', isGrouped: true }
        );
    } else if (tabName === 'SRSDB') {
        processFields.push(
            { name: 'Total', displayName: 'Total', group: null },
            { name: 'SRS_Total_NG', displayName: 'SRS Total NG', group: null },
            { name: 'くっつき・めくれ', displayName: 'くっつき・めくれ', group: 'SRS Details', isGrouped: true },
            { name: 'シワ', displayName: 'シワ', group: 'SRS Details', isGrouped: true },
            { name: '転写位置ズレ', displayName: '転写位置ズレ', group: 'SRS Details', isGrouped: true },
            { name: '転写不良', displayName: '転写不良', group: 'SRS Details', isGrouped: true },
            { name: '文字欠け', displayName: '文字欠け', group: 'SRS Details', isGrouped: true }
        );
    } else if (tabName === 'slitDB') {
        processFields.push(
            { name: 'Total', displayName: 'Total', group: null },
            { name: 'Total_NG', displayName: 'Total NG', group: null },
            { name: '疵引不良', displayName: '疵引不良', group: 'NG Details', isGrouped: true },
            { name: '加工不良', displayName: '加工不良', group: 'NG Details', isGrouped: true },
            { name: 'その他', displayName: 'その他', group: 'NG Details', isGrouped: true }
        );
    }

    // Add process fields that exist in data
    processFields.forEach(field => {
        if (field.name.includes('.')) {
            // Handle nested fields like Counters.counter-1
            const [parent, child] = field.name.split('.');
            if (data.some(item => item[parent] && item[parent][child] !== undefined)) {
                fields.push(field);
            }
        } else {
            if (data.some(item => item[field.name] !== undefined && item[field.name] !== null && item[field.name] !== '')) {
                fields.push(field);
            }
        }
    });

    // Add image fields
    const imageFields = [];
    const sampleItem = data[0];
    if (sampleItem) {
        Object.keys(sampleItem).forEach(key => {
            if (key.includes('画像') && sampleItem[key]) {
                imageFields.push({
                    name: key,
                    displayName: key.replace('画像', ' Image'),
                    group: 'Images',
                    isGrouped: true,
                    isImage: true
                });
            }
        });
    }

    fields.push(...imageFields);

    // Add common fields at the end
    const endFields = [
        { name: 'Spare', displayName: 'Spare', group: null },
        { name: 'Comment', displayName: 'Comment', group: null }
    ];

    endFields.forEach(field => {
        if (data.some(item => item[field.name] !== undefined && item[field.name] !== null && item[field.name] !== '')) {
            fields.push(field);
        }
    });

    return fields;
}

/**
 * Create individual list row
 */
function createListRow(item, index, allFields) {
    const statusInfo = getStatusInfo(item);
    
    // Check for date/time mismatch
    const mismatchInfo = checkDateTimeMismatch(item);
    const hasDateMismatch = mismatchInfo.dateMismatch;
    const hasTimeMismatch = mismatchInfo.timeMismatch;
    
    // Check for obvious wrong data
    const hasWrongData = detectWrongData(item);
    const wrongDataClass = hasWrongData ? 'bg-red-100 border-red-300' : '';
    
    // Add date mismatch highlighting (red border for critical errors)
    const dateMismatchClass = hasDateMismatch ? 'bg-red-50 border-l-4 border-red-400' : '';
    
    const rowClass = 'hover:bg-gray-50 ' + statusInfo.rowClass + ' ' + wrongDataClass + ' ' + dateMismatchClass + ' ' + (index % 2 === 0 ? 'bg-gray-25' : '');
    
    let rowHtml = '<tr class="' + rowClass + '" onclick="openApprovalDetail(\'' + item._id + '\')" style="cursor: pointer;">';
    
    // Checkbox column
    rowHtml += '<td class="border p-2 text-center" onclick="event.stopPropagation();">';
    
    // Check if item should be disabled for current user role
    const isDisabled = shouldDisableCheckbox(item, currentUser.role);
    const disabledAttr = isDisabled ? ' disabled' : '';
    const disabledClass = isDisabled ? ' opacity-50 cursor-not-allowed' : '';
    
    rowHtml += '<input type="checkbox" class="list-checkbox rounded' + disabledClass + '" data-item-id="' + item._id + '" onchange="updateBatchButtons()"' + disabledAttr + '>';
    rowHtml += '</td>';
    
    // Status column
    rowHtml += '<td class="border p-2">';
    rowHtml += '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ' + statusInfo.badgeClass + '">';
    rowHtml += '<i class="' + statusInfo.icon + ' mr-1"></i>';
    rowHtml += statusInfo.text;
    if (hasDateMismatch) {
        rowHtml += ' <i class="ri-alert-fill text-red-600" title="入力日付が正しくありません"></i>';
    } else if (hasTimeMismatch) {
        rowHtml += ' <i class="ri-time-line text-orange-500" title="入力時刻が30分以上ずれています"></i>';
    } else if (hasWrongData) {
        rowHtml += ' ⚠️';
    }
    rowHtml += '</span>';
    rowHtml += '</td>';
    
    // Data columns
    allFields.forEach(field => {
        let value = '';
        let cellClass = 'border p-2 text-sm';
        
        if (field.name.includes('.')) {
            // Handle nested fields like Counters.counter-1
            const [parent, child] = field.name.split('.');
            value = item[parent] && item[parent][child] !== undefined ? item[parent][child] : '';
        } else {
            value = item[field.name] !== undefined ? item[field.name] : '';
        }

        // Store original value for display
        let displayValue = value;
        let iconHtml = '';

        // Add date/time mismatch highlighting for Date field
        if (field.name === 'Date' && hasDateMismatch) {
            cellClass += ' text-red-600 font-semibold';
            iconHtml = '<i class="ri-alert-fill ml-1" title="ObjectId日付: ' + mismatchInfo.objectIdDate + '"></i>';
        }
        
        // Add time mismatch highlighting for Time_end field
        // Show orange even if there's also a date mismatch
        if (field.name === 'Time_end' && hasTimeMismatch) {
            cellClass += ' text-orange-600';
            iconHtml = '<i class="ri-time-line ml-1" title="ObjectId時刻: ' + mismatchInfo.objectIdTime + '"></i>';
        }

        // Special formatting
        if (field.isImage && value) {
            displayValue = '✅ OK';
            cellClass += ' text-green-600 font-medium text-center';
        } else if (field.name.includes('不良') && value > 0) {
            cellClass += ' text-red-600 font-medium';
        } else if (field.name.includes('NG') && value > 0) {
            cellClass += ' text-red-600 font-medium';
        } else if (typeof value === 'number' && value > 0) {
            displayValue = value.toLocaleString();
        } else if (typeof value === 'number' && value < 0) {
            // Highlight negative numbers
            cellClass += ' text-red-600 font-medium bg-red-50';
        }

        // Highlight grouped fields
        if (field.isGrouped) {
            cellClass += ' bg-blue-25';
        }

        rowHtml += '<td class="' + cellClass + '" title="' + field.displayName + ': ' + value + '">' + (displayValue || '-') + iconHtml + '</td>';
    });
    
    rowHtml += '</tr>';
    
    return rowHtml;
}

/**
 * Check if checkbox should be disabled for current user and item status
 */
function shouldDisableCheckbox(item, userRole) {
    const status = item.approvalStatus;
    
    // If user is 班長 (hancho)
    if (userRole === '班長') {
        // Disable if already hancho approved, fully approved, or rejected
        if (status === 'hancho_approved' || 
            status === 'fully_approved' || 
            status === 'rejected' ||
            status === 'correction_needed_from_kacho') {
            return true;
        }
    }
    
    // If user is 課長 or higher
    if (['課長', '部長', 'admin'].includes(userRole)) {
        // Disable if fully approved or rejected (final states)
        if (status === 'fully_approved' || status === 'rejected') {
            return true;
        }
    }
    
    return false;
}

/**
 * Detect obvious wrong data in an item
 */
function detectWrongData(item) {
    const issues = [];
    
    // Check for time start equals time end
    const startTimeFields = ['Time_start', '開始時刻', 'start_time'];
    const endTimeFields = ['Time_end', '終了時刻', 'end_time'];
    
    for (const startField of startTimeFields) {
        for (const endField of endTimeFields) {
            if (item[startField] && item[endField] && item[startField] === item[endField]) {
                issues.push("Time start equals time end: " + item[startField]);
            }
        }
    }
    
    // Check for negative quantities
    const quantityFields = ['Total', 'Process_Quantity', '数量', 'quantity', 'total'];
    for (const field of quantityFields) {
        if (item[field] && typeof item[field] === 'number' && item[field] < 0) {
            issues.push("Negative quantity: " + field + " = " + item[field]);
        }
    }
    
    // Check counters for negative values
    if (item.Counters) {
        Object.entries(item.Counters).forEach(([key, value]) => {
            if (typeof value === 'number' && value < 0) {
                issues.push("Negative counter: " + key + " = " + value);
            }
        });
    }
    
    // Log detected issues for debugging
    if (issues.length > 0) {
        console.log("Wrong data detected in item " + item._id + ":", issues);
    }
    
    return issues.length > 0;
}

/**
 * Add event listeners for list interactions
 */
function addListEventListeners() {
    // Update batch button states when checkboxes change
    const checkboxes = document.querySelectorAll('.list-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateBatchButtons);
    });
}

/**
 * Toggle select all functionality
 */
window.toggleSelectAll = function(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.list-checkbox:not(:disabled)');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    updateBatchButtons();
};

/**
 * Update batch button states based on selected items
 */
function updateBatchButtons() {
    const checkboxes = document.querySelectorAll('.list-checkbox:checked:not(:disabled)');
    const approveBtn = document.getElementById('batchApproveBtn');
    const rejectBtn = document.getElementById('batchRejectBtn');
    const selectedCount = document.getElementById('selectedCount');

    const selectedLength = checkboxes.length;
    const isEnabled = selectedLength > 0;

    approveBtn.disabled = !isEnabled;
    rejectBtn.disabled = !isEnabled;
    selectedCount.textContent = selectedLength + " " + (window.t ? window.t('selected') : 'selected');
}

/**
 * Create organized field data for card display
 */
function createFieldData(item) {
    const fieldGroups = [];
    
    // Basic fields (ungrouped)
    const basicFields = [
        { key: 'Date', label: '日付' },
        { key: '設備', label: '設備' },
        { key: 'Process_Quantity', label: '処理数' },
        { key: 'Remaining_Quantity', label: '残り数' },
        { key: 'Total', label: 'Total' },
        { key: 'Spare', label: 'Spare' },
        { key: 'Cycle_Time', label: 'サイクル時間' },
        { key: '製造ロット', label: '製造ロット' },
        { key: '材料ロット', label: '材料ロット' },
        { key: 'ショット数', label: 'ショット数' }
    ];

    const basicGroup = {
        groupName: null,
        fields: basicFields
            .filter(field => item[field.key] !== undefined && item[field.key] !== null && item[field.key] !== '')
            .map(field => ({
                label: field.label,
                value: item[field.key],
                isImage: false,
                isNegative: false
            }))
    };

    if (basicGroup.fields.length > 0) {
        fieldGroups.push(basicGroup);
    }

    // Counters group (for kensaDB)
    if (item.Counters && typeof item.Counters === 'object') {
        const counterFields = Object.entries(item.Counters)
            .filter(([key, value]) => value > 0)
            .map(([key, value]) => ({
                label: key,
                value: value,
                isImage: false,
                isNegative: true
            }));

        if (counterFields.length > 0) {
            fieldGroups.push({
                groupName: 'Counters',
                fields: counterFields
            });
        }
    }

    // NG fields group (for pressDB, slitDB)
    const ngFields = [
        { key: '疵引不良', label: '疵引不良' },
        { key: '加工不良', label: '加工不良' },
        { key: 'その他', label: 'その他' },
        { key: '疵引処理数', label: '疵引処理数' }
    ];

    const ngGroup = {
        groupName: 'NG Details',
        fields: ngFields
            .filter(field => item[field.key] !== undefined && item[field.key] !== null && item[field.key] !== '')
            .map(field => ({
                label: field.label,
                value: item[field.key],
                isImage: false,
                isNegative: field.key.includes('不良') && item[field.key] > 0
            }))
    };

    if (ngGroup.fields.length > 0) {
        fieldGroups.push(ngGroup);
    }

    // SRS specific fields (for SRSDB)
    if (currentApprovalTab === 'SRSDB') {
        const srsFields = [
            { key: 'くっつき・めくれ', label: 'くっつき・めくれ' },
            { key: 'シワ', label: 'シワ' },
            { key: '転写位置ズレ', label: '転写位置ズレ' },
            { key: '転写不良', label: '転写不良' },
            { key: '文字欠け', label: '文字欠け' }
        ];

        const srsGroup = {
            groupName: 'SRS Details',
            fields: srsFields
                .filter(field => item[field.key] !== undefined && item[field.key] !== null && item[field.key] !== '')
                .map(field => ({
                    label: field.label,
                    value: item[field.key],
                    isImage: false,
                    isNegative: item[field.key] > 0
                }))
        };

        if (srsGroup.fields.length > 0) {
            fieldGroups.push(srsGroup);
        }
    }

    // Images group
    const imageFields = Object.keys(item)
        .filter(key => key.includes('画像') && item[key])
        .map(key => ({
            label: key,
            value: 'Available',
            isImage: true,
            isNegative: false
        }));

    if (imageFields.length > 0) {
        fieldGroups.push({
            groupName: 'Images',
            fields: imageFields
        });
    }

    return fieldGroups;
}

/**
 * Add event listeners for card interactions
 */
function addCardEventListeners() {
    // Update batch button states when checkboxes change
    const checkboxes = document.querySelectorAll('.card-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateBatchButtons);
    });
}

/**
 * Update batch button states based on selected items
 */
function updateBatchButtons() {
    const checkboxes = document.querySelectorAll('.list-checkbox:checked:not(:disabled)');
    const approveBtn = document.getElementById('batchApproveBtn');
    const rejectBtn = document.getElementById('batchRejectBtn');
    const selectedCount = document.getElementById('selectedCount');

    const selectedLength = checkboxes.length;
    const isEnabled = selectedLength > 0;

    approveBtn.disabled = !isEnabled;
    rejectBtn.disabled = !isEnabled;
    selectedCount.textContent = selectedLength + " " + (window.t ? window.t('selected') : 'selected');
}

/**
 * Handle batch approval
 */
async function handleBatchApproval() {
    const selectedItems = Array.from(document.querySelectorAll('.list-checkbox:checked:not(:disabled)'))
        .map(checkbox => checkbox.dataset.itemId);

    console.log('Debug: Selected items for batch approval:', selectedItems);

    if (selectedItems.length === 0) {
        alert('承認するアイテムを選択してください');
        return;
    }

    if (!confirm(selectedItems.length + "件のアイテムを一括承認しますか？")) {
        return;
    }

    try {
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        console.log('Debug: Current user:', currentUser);
        
        const userFullName = await getUserFullName(currentUser.username);
        console.log('Debug: User full name:', userFullName);
        
        const promises = selectedItems.map(async (itemId) => {
            // First try to find item in current page data, otherwise fetch from server
            let item = filteredApprovalData.find(d => d._id === itemId);
            
            if (!item) {
                console.log('🔍 Item ' + itemId + ' not found in current page, fetching from server...');
                // Fetch item from server
                const response = await fetch(BASE_URL + "queries", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        dbName: "submittedDB",
                        collectionName: currentApprovalTab,
                        query: { _id: itemId }
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Item ' + itemId + ': サーバーからの取得に失敗しました');
                }
                
                const items = await response.json();
                if (!items || items.length === 0) {
                    throw new Error('Item ' + itemId + ': データが見つかりません');
                }
                
                item = items[0];
                console.log('✅ Item ' + itemId + ' fetched from server');
            }
            
            console.log('Debug: Processing item ' + itemId + ':', item);
            
            if (!item) {
                throw new Error('Item ' + itemId + ': データが見つかりません');
            }
            
            // Check approval permissions and determine status
            let newStatus, approvalField, approvalByField, actionText;
            
            console.log('Debug: Item ' + itemId + ' - Current status: ' + item.approvalStatus + ', User role: ' + currentUser.role);
            
            if ((!item.approvalStatus || item.approvalStatus === 'pending') && currentUser.role === '班長') {
                newStatus = 'hancho_approved';
                approvalField = 'hanchoApprovedBy';
                approvalByField = 'hanchoApprovedAt';
                actionText = '班長承認';
            } else if (item.approvalStatus === 'hancho_approved' && ['課長', 'admin', '部長'].includes(currentUser.role)) {
                newStatus = 'fully_approved';
                approvalField = 'kachoApprovedBy';
                approvalByField = 'kachoApprovedAt';
                actionText = '課長承認';
            } else if (item.approvalStatus === 'correction_needed_from_kacho' && currentUser.role === '班長') {
                newStatus = 'hancho_approved';
                approvalField = 'hanchoApprovedBy';
                approvalByField = 'hanchoApprovedAt';
                actionText = '修正完了・再承認';
            } else {
                throw new Error('Item ' + itemId + ': 承認権限がありません (Status: ' + item.approvalStatus + ', Role: ' + currentUser.role + ')');
            }

            console.log('Debug: Item ' + itemId + ' - New status: ' + newStatus + ', Action: ' + actionText);

            return fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dbName: "submittedDB",
                    collectionName: currentApprovalTab,
                    query: { _id: itemId },
                    update: {
                        $set: {
                            approvalStatus: newStatus,
                            [approvalField]: userFullName,
                            [approvalByField]: new Date()
                        },
                        $push: {
                            approvalHistory: {
                                action: actionText,
                                user: userFullName,
                                timestamp: new Date(),
                                batchOperation: true
                            }
                        }
                    }
                })
            });
        });

        const results = await Promise.all(promises);
        console.log('Debug: Batch approval results:', results);
        
        alert(selectedItems.length + '件のアイテムを一括承認しました');
        
        // Clear selections and reload data
        document.querySelectorAll('.list-checkbox:checked').forEach(checkbox => checkbox.checked = false);
        updateBatchButtons();
        
        // Reload current view data
        await renderApprovalList();
        
    } catch (error) {
        console.error('Batch approval error:', error);
        alert('一括承認に失敗しました: ' + error.message);
    }
}

/**
 * Handle batch reject
 */
async function handleBatchReject() {
    const selectedItems = Array.from(document.querySelectorAll('.list-checkbox:checked:not(:disabled)'))
        .map(checkbox => checkbox.dataset.itemId);

    if (selectedItems.length === 0) {
        alert('却下するアイテムを選択してください');
        return;
    }

    const comment = prompt("却下理由を入力してください:");
    if (!comment || comment.trim() === "") {
        alert("却下理由を入力してください");
        return;
    }

    if (!confirm(selectedItems.length + '件のアイテムを一括却下しますか？')) {
        return;
    }

    try {
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const userFullName = await getUserFullName(currentUser.username);
        
        const promises = selectedItems.map(async (itemId) => {
            // First try to find item in current page data, otherwise fetch from server
            let item = filteredApprovalData.find(d => d._id === itemId);
            
            if (!item) {
                console.log('🔍 Item ' + itemId + ' not found in current page, fetching from server...');
                // Fetch item from server
                const response = await fetch(BASE_URL + "queries", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        dbName: "submittedDB",
                        collectionName: currentApprovalTab,
                        query: { _id: itemId }
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Item ' + itemId + ': サーバーからの取得に失敗しました');
                }
                
                const items = await response.json();
                if (!items || items.length === 0) {
                    throw new Error('Item ' + itemId + ': データが見つかりません');
                }
                
                item = items[0];
                console.log('✅ Item ' + itemId + ' fetched from server');
            }
            
            if (!item) {
                throw new Error('Item ' + itemId + ': データが見つかりません');
            }
            
            let newStatus, targetRole;
            
            if (currentUser.role === '班長' && (!item.approvalStatus || item.approvalStatus === 'pending')) {
                newStatus = 'correction_needed';
                targetRole = 'submitter';
            } else if (['課長', 'admin', '部長'].includes(currentUser.role) && item.approvalStatus === 'hancho_approved') {
                newStatus = 'correction_needed_from_kacho';
                targetRole = '班長';
            } else {
                throw new Error('Item ' + itemId + ': 却下権限がありません');
            }

            return fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dbName: "submittedDB",
                    collectionName: currentApprovalTab,
                    query: { _id: itemId },
                    update: {
                        $set: {
                            approvalStatus: newStatus,
                            correctionBy: userFullName,
                            correctionAt: new Date(),
                            correctionComment: comment,
                            correctionTarget: targetRole
                        },
                        $push: {
                            approvalHistory: {
                                action: '修正要求',
                                user: userFullName,
                                timestamp: new Date(),
                                comment: comment,
                                target: targetRole,
                                batchOperation: true
                            }
                        }
                    }
                })
            });
        });

        await Promise.all(promises);
        
        alert(selectedItems.length + '件のアイテムを一括却下しました');
        
        // Clear selections and reload data
        document.querySelectorAll('.list-checkbox:checked').forEach(checkbox => checkbox.checked = false);
        updateBatchButtons();
        
        // Reload current view data
        await renderApprovalList();
        
    } catch (error) {
        console.error('Batch reject error:', error);
        alert('一括却下に失敗しました: ' + error.message);
    }
}

/**
 * Generate summary report for card view
 */
function generateSummaryReport() {
    if (filteredApprovalData.length === 0) {
        document.getElementById('summaryStats').innerHTML = '<div class="col-span-4 text-center text-gray-500">データがありません</div>';
        return;
    }

    // Calculate time range
    const timeStarts = filteredApprovalData
        .map(item => item.Time_start)
        .filter(time => time)
        .sort();
    
    const timeEnds = filteredApprovalData
        .map(item => item.Time_end)
        .filter(time => time)
        .sort();

    const earliestStart = timeStarts[0] || '00:00';
    const latestEnd = timeEnds[timeEnds.length - 1] || '23:59';

    // Calculate time difference in hours
    const startTime = new Date(`2000-01-01T${earliestStart}:00`);
    const endTime = new Date(`2000-01-01T${latestEnd}:00`);
    let totalHours = (endTime - startTime) / (1000 * 60 * 60);
    if (totalHours < 0) totalHours += 24; // Handle day overflow

    // Calculate statistics
    const quantityField = getQuantityField(currentApprovalTab);
    const ngField = getNGField(currentApprovalTab);
    
    const totalQuantity = filteredApprovalData.reduce((sum, item) => sum + (item[quantityField] || 0), 0);
    const totalNG = filteredApprovalData.reduce((sum, item) => sum + (item[ngField] || 0), 0);
    const totalShots = filteredApprovalData.reduce((sum, item) => sum + (item.ショット数 || 0), 0);
    
    const defectRate = totalQuantity > 0 ? ((totalNG / totalQuantity) * 100).toFixed(2) : '0.00';
    const shotsPerHour = totalHours > 0 ? (totalShots / totalHours).toFixed(1) : '0.0';
    const shotsPerDay = totalShots;
    const efficiency = totalQuantity > 0 ? (((totalQuantity - totalNG) / totalQuantity) * 100).toFixed(2) : '100.00';

    // Calculate downtime (simplified - could be enhanced)
    const workingData = filteredApprovalData.filter(item => item.Time_start && item.Time_end);
    const totalWorkTime = workingData.reduce((sum, item) => {
        const start = new Date(`2000-01-01T${item.Time_start}:00`);
        const end = new Date(`2000-01-01T${item.Time_end}:00`);
        let duration = (end - start) / (1000 * 60 * 60);
        if (duration < 0) duration += 24;
        return sum + duration;
    }, 0);
    const downtime = Math.max(0, totalHours - totalWorkTime).toFixed(1);

    const summaryHTML = `
        <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">${shotsPerHour}</div>
            <div class="text-sm text-gray-600">ショット/時間</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-green-600">${shotsPerDay}</div>
            <div class="text-sm text-gray-600">ショット/日</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">${efficiency}%</div>
            <div class="text-sm text-gray-600">効率</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold ${parseFloat(defectRate) > 0 ? 'text-red-600' : 'text-gray-600'}">${defectRate}%</div>
            <div class="text-sm text-gray-600">不良率</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">${downtime}h</div>
            <div class="text-sm text-gray-600">ダウンタイム</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-gray-600">${totalHours.toFixed(1)}h</div>
            <div class="text-sm text-gray-600">稼働時間</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-indigo-600">${earliestStart}</div>
            <div class="text-sm text-gray-600">開始時刻</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-indigo-600">${latestEnd}</div>
            <div class="text-sm text-gray-600">終了時刻</div>
        </div>
    `;

    document.getElementById('summaryStats').innerHTML = summaryHTML;
}
