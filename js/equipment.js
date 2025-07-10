// Equipment Analytics Module

let equipmentData = [];
let filteredEquipmentData = [];
let availableEquipment = [];
let equipmentCharts = {};
let equipmentByFactory = {}; // New: equipment grouped by factory

// Equipment table data storage
let equipmentTableData = {};

// Equipment sorting state
let equipmentSortState = {};

// Load equipment checkbox preferences from localStorage
function loadEquipmentPreferences() {
  const preferences = localStorage.getItem('equipmentFilterPreferences');
  if (preferences) {
    const saved = JSON.parse(preferences);
    // Return only checkbox preferences, dates will be calculated fresh each time
    return {
      selectedEquipment: saved.selectedEquipment || []
    };
  } else {
    // Default preferences
    return {
      selectedEquipment: [] // Empty means all selected by default
    };
  }
}

// Save equipment checkbox preferences to localStorage (dates not persisted)
function saveEquipmentPreferences(selectedEquipment) {
  const preferences = { selectedEquipment };
  localStorage.setItem('equipmentFilterPreferences', JSON.stringify(preferences));
}

// Calculate business days (excluding weekends) for date range
function getBusinessDayRange(daysCount = 7) {
  const endDate = new Date();
  const startDate = new Date();
  
  let businessDaysFound = 0;
  let currentDate = new Date(endDate);
  
  // Include current day if it's a business day
  if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
    businessDaysFound = 1;
  }
  
  // Go back in time until we find the required number of business days
  while (businessDaysFound < daysCount) {
    currentDate.setDate(currentDate.getDate() - 1);
    
    // Check if it's a weekday (Monday = 1, Sunday = 0)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      businessDaysFound++;
    }
  }
  
  return {
    startDate: currentDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

// Load equipment data from pressDB
async function loadEquipmentData() {
  try {
    // First, load basic equipment structure to set up filters
    const response = await fetch(`${BASE_URL}queries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dbName: 'submittedDB',
        collectionName: 'pressDB',
        query: {},
        projection: { 設備: 1, 工場: 1 } // Only get equipment and factory info
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch equipment structure: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract unique equipment and group by factory
    availableEquipment = [...new Set(data.map(item => item.設備).filter(Boolean))];
    
    // Group equipment by factory
    equipmentByFactory = data.reduce((acc, item) => {
      if (item.設備 && item.工場) {
        if (!acc[item.工場]) {
          acc[item.工場] = new Set();
        }
        acc[item.工場].add(item.設備);
      }
      return acc;
    }, {});
    
    // Convert Sets to Arrays for easier handling
    Object.keys(equipmentByFactory).forEach(factory => {
      equipmentByFactory[factory] = [...equipmentByFactory[factory]];
    });
    
    // Setup filters
    setupEquipmentFilters();
    
    // Apply filters immediately to load filtered data
    await applyEquipmentFilters();
    
  } catch (error) {
    console.error('Error loading equipment data:', error);
    document.getElementById('equipmentContent').innerHTML = `
      <div class="text-red-600 p-4 bg-red-50 rounded-lg border border-red-200">
        <h3 class="font-semibold mb-2">Error loading equipment data</h3>
        <p>Please check your connection and try again.</p>
        <p class="text-sm mt-2">Error: ${error.message}</p>
        <button onclick="loadEquipmentData()" class="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Retry</button>
      </div>
    `;
  }
}

// Setup filter controls
function setupEquipmentFilters() {
  const checkboxContainer = document.getElementById('equipmentCheckboxes');
  
  // Load saved preferences (checkboxes only)
  const preferences = loadEquipmentPreferences();
  const savedSelectedEquipment = preferences.selectedEquipment || [];
  
  // Set date range to 7 business days (always fresh, not persisted)
  const dateRange = getBusinessDayRange(7);
  document.getElementById('equipmentStartDate').value = dateRange.startDate;
  document.getElementById('equipmentEndDate').value = dateRange.endDate;
  
  // Add event listeners for date changes (no persistence, just for real-time filtering)
  document.getElementById('equipmentStartDate').addEventListener('change', saveEquipmentCheckboxState);
  document.getElementById('equipmentEndDate').addEventListener('change', saveEquipmentCheckboxState);
  
  // Load saved expand/collapse states
  const expandStates = JSON.parse(localStorage.getItem('factoryExpandStates') || '{}');
  
  // Create equipment checkboxes grouped by factory
  const factoriesHTML = Object.entries(equipmentByFactory).map(([factory, equipmentList]) => {
    // Default to expanded if no saved state
    const isExpanded = expandStates[factory] !== false;
    const iconClass = isExpanded ? 'rotate-0' : '-rotate-90';
    const contentClass = isExpanded ? '' : 'hidden';
    
    return `
    <div class="mb-4 border border-gray-200 rounded-lg bg-white shadow-sm">
      <div class="p-3 border-b border-gray-100">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <button onclick="toggleFactorySection('${factory}')" class="flex items-center space-x-2 text-sm font-semibold text-gray-700 hover:text-gray-900">
              <i id="factory-icon-${factory}" class="ri-arrow-down-s-line text-lg transform transition-transform duration-200 ${iconClass}"></i>
              <span>${factory}</span>
              <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">${equipmentList.length}</span>
            </button>
          </div>
          <div class="flex space-x-2">
            <button onclick="toggleFactoryEquipment('${factory}', true)" class="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">All</button>
            <button onclick="toggleFactoryEquipment('${factory}', false)" class="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">None</button>
          </div>
        </div>
      </div>
      <div id="factory-content-${factory}" class="p-3 transition-all duration-300 ${contentClass}">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          ${equipmentList.map(equipment => {
            // Check if this equipment was previously selected, default to true if no preferences saved
            const isChecked = savedSelectedEquipment.length === 0 || savedSelectedEquipment.includes(equipment);
            return `
              <label class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded border border-gray-100 text-sm transition-colors">
                <input type="checkbox" value="${equipment}" ${isChecked ? 'checked' : ''} class="equipment-checkbox text-blue-600 focus:ring-blue-500" data-factory="${factory}" onchange="saveEquipmentCheckboxState()">
                <span class="flex-1 truncate">${equipment}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
  }).join('');
  
  checkboxContainer.innerHTML = factoriesHTML;
}

// Save checkbox state when changed (dates not persisted)
function saveEquipmentCheckboxState() {
  const selectedEquipment = Array.from(document.querySelectorAll('.equipment-checkbox:checked'))
    .map(cb => cb.value);
  saveEquipmentPreferences(selectedEquipment);
}

// Legacy function - now just calls saveEquipmentCheckboxState
function saveEquipmentState() {
  saveEquipmentCheckboxState();
}

// Toggle all equipment checkboxes
function toggleAllEquipment(selectAll) {
  const checkboxes = document.querySelectorAll('.equipment-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAll;
  });
  saveEquipmentCheckboxState(); // Save checkbox state only
}

// Toggle equipment for a specific factory
function toggleFactoryEquipment(factory, selectAll) {
  const checkboxes = document.querySelectorAll(`.equipment-checkbox[data-factory="${factory}"]`);
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAll;
  });
  saveEquipmentCheckboxState(); // Save checkbox state only
}

// Apply filters to equipment data
async function applyEquipmentFilters() {
  try {
    const startDate = document.getElementById('equipmentStartDate').value;
    const endDate = document.getElementById('equipmentEndDate').value;
    const selectedEquipment = Array.from(document.querySelectorAll('.equipment-checkbox:checked'))
      .map(cb => cb.value);
    
    // Build MongoDB query
    let query = {};
    
    // Date filter
    if (startDate || endDate) {
      query.Date = {};
      if (startDate) query.Date.$gte = startDate;
      if (endDate) query.Date.$lte = endDate;
    }
    
    // Equipment filter
    if (selectedEquipment.length > 0) {
      query.設備 = { $in: selectedEquipment };
    }
    
    // Use the existing /queries route with filters
    const response = await fetch(`${BASE_URL}queries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dbName: 'submittedDB',
        collectionName: 'pressDB',
        query: query
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch filtered data: ${response.status}`);
    }
    
    filteredEquipmentData = await response.json();
    renderEquipmentAnalytics();
    
  } catch (error) {
    console.error('Error applying filters:', error);
    showNotification('Error applying filters. Please try again.', 'error');
  }
}

// Render equipment analytics
function renderEquipmentAnalytics() {
  const contentContainer = document.getElementById('equipmentContent');
  
  if (filteredEquipmentData.length === 0) {
    contentContainer.innerHTML = `
      <div class="text-gray-500 text-center p-8 bg-gray-50 rounded-lg">
        <i class="ri-database-2-line text-4xl mb-4"></i>
        <p class="text-lg">No data available for the selected filters.</p>
        <p class="text-sm">Try adjusting your date range or equipment selection.</p>
      </div>
    `;
    return;
  }
  
  // Group data by equipment
  const groupedData = groupDataByEquipment(filteredEquipmentData);
  
  // Render each equipment section
  contentContainer.innerHTML = Object.entries(groupedData).map(([equipment, data]) => {
    const analytics = calculateEquipmentAnalytics(data);
    return renderEquipmentSection(equipment, data, analytics);
  }).join('');
  
  // Initialize charts and pagination after rendering
  setTimeout(() => {
    Object.entries(groupedData).forEach(([equipment, data]) => {
      // Initialize charts
      initializeEquipmentChart(equipment, data);
      
      // Initialize pagination for tables
      renderTablePage(equipment, data, 1, 10); // Default: page 1, 10 items per page
    });
  }, 100);
}

// Group data by equipment
function groupDataByEquipment(data) {
  return data.reduce((acc, item) => {
    const equipment = item.設備;
    if (!acc[equipment]) {
      acc[equipment] = [];
    }
    acc[equipment].push(item);
    return acc;
  }, {});
}

// Calculate analytics for equipment
function calculateEquipmentAnalytics(data) {
  const totalDays = [...new Set(data.map(item => item.Date))].length;
  const totalShots = data.reduce((sum, item) => sum + (parseInt(item.ショット数) || 0), 0);
  const totalProcessQuantity = data.reduce((sum, item) => sum + (parseInt(item.Process_Quantity) || 0), 0);
  const totalDefects = data.reduce((sum, item) => sum + (parseInt(item.Total_NG) || 0), 0);
  
  // Calculate working hours
  const workingHours = data.reduce((sum, item) => {
    if (item.Time_start && item.Time_end) {
      const start = new Date(`2000-01-01T${item.Time_start}`);
      const end = new Date(`2000-01-01T${item.Time_end}`);
      if (end > start) {
        sum += (end - start) / (1000 * 60 * 60); // Convert to hours
      }
    }
    return sum;
  }, 0);
  
  return {
    totalDays,
    totalShots,
    totalProcessQuantity,
    totalDefects,
    workingHours,
    avgShotsPerDay: totalDays > 0 ? (totalShots / totalDays).toFixed(1) : 0,
    avgShotsPerHour: workingHours > 0 ? (totalShots / workingHours).toFixed(1) : 0,
    defectRate: totalProcessQuantity > 0 ? ((totalDefects / totalProcessQuantity) * 100).toFixed(2) : 0,
    avgWorkingHoursPerDay: totalDays > 0 ? (workingHours / totalDays).toFixed(2) : 0
  };
}

// Render equipment section
function renderEquipmentSection(equipment, data, analytics) {
  const equipmentId = equipment.replace(/[^a-zA-Z0-9]/g, '_'); // Create valid ID
  const sortedData = data.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  
  return `
    <div class="border-2 border-gray-200 rounded-lg p-6 bg-white shadow-sm">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-semibold text-gray-800 flex items-center">
          <i class="ri-tools-line mr-2 text-blue-600"></i>
          ${equipment}
        </h3>
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">${data.length} records</span>
          <button onclick="exportEquipmentData('${equipment}')" class="text-blue-600 hover:text-blue-800 text-sm">
            <i class="ri-download-line"></i> Export
          </button>
        </div>
      </div>
      
      <!-- Analytics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 class="text-sm font-medium text-blue-800 mb-2">Total Shots</h4>
          <p class="text-2xl font-bold text-blue-900">${analytics.totalShots.toLocaleString()}</p>
          <p class="text-xs text-blue-600">週合計shot数</p>
        </div>
        <div class="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 class="text-sm font-medium text-green-800 mb-2">Avg Shots/Day</h4>
          <p class="text-2xl font-bold text-green-900">${analytics.avgShotsPerDay}</p>
          <p class="text-xs text-green-600">平均shot/Day</p>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h4 class="text-sm font-medium text-purple-800 mb-2">Avg Shots/Hour</h4>
          <p class="text-2xl font-bold text-purple-900">${analytics.avgShotsPerHour}</p>
          <p class="text-xs text-purple-600">平均shot/Hour</p>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h4 class="text-sm font-medium text-orange-800 mb-2">Working Hours/Day</h4>
          <p class="text-2xl font-bold text-orange-900">${analytics.avgWorkingHoursPerDay}</p>
          <p class="text-xs text-orange-600">実働時間/Day</p>
        </div>
      </div>
      
      <!-- Chart Section -->
      <div class="mb-6">
        <h4 class="text-lg font-semibold mb-3">Daily Performance Trend</h4>
        <div id="chart-${equipmentId}" class="h-64 bg-gray-50 rounded-lg border"></div>
      </div>
      
      <!-- Table Controls -->
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center space-x-2">
          <label class="text-sm text-gray-600">Show:</label>
          <select id="itemsPerPage-${equipmentId}" onchange="changeItemsPerPage('${equipmentId}')" class="p-1 border rounded text-sm">
            <option value="10">10</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span class="text-sm text-gray-600">entries</span>
        </div>
        <div id="pagination-${equipmentId}" class="flex items-center space-x-2"></div>
      </div>
      
      <!-- Detailed Analytics Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none" onclick="sortEquipmentTable('${equipmentId}', 'Date')">
                <div class="flex items-center justify-between">
                  <span>Date</span>
                  <span id="sort-Date-${equipmentId}" class="ml-1 text-gray-400">↕</span>
                </div>
              </th>
              <th class="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none" onclick="sortEquipmentTable('${equipmentId}', 'Worker_Name')">
                <div class="flex items-center justify-between">
                  <span>Worker</span>
                  <span id="sort-Worker_Name-${equipmentId}" class="ml-1 text-gray-400">↕</span>
                </div>
              </th>
              <th class="border border-gray-300 px-3 py-2 text-right cursor-pointer hover:bg-gray-200 select-none" onclick="sortEquipmentTable('${equipmentId}', 'ショット数')">
                <div class="flex items-center justify-between">
                  <span>Shots</span>
                  <span id="sort-ショット数-${equipmentId}" class="ml-1 text-gray-400">↕</span>
                </div>
              </th>
              <th class="border border-gray-300 px-3 py-2 text-right cursor-pointer hover:bg-gray-200 select-none" onclick="sortEquipmentTable('${equipmentId}', 'Process_Quantity')">
                <div class="flex items-center justify-between">
                  <span>Process Qty</span>
                  <span id="sort-Process_Quantity-${equipmentId}" class="ml-1 text-gray-400">↕</span>
                </div>
              </th>
              <th class="border border-gray-300 px-3 py-2 text-right cursor-pointer hover:bg-gray-200 select-none" onclick="sortEquipmentTable('${equipmentId}', 'Total_NG')">
                <div class="flex items-center justify-between">
                  <span>Defects</span>
                  <span id="sort-Total_NG-${equipmentId}" class="ml-1 text-gray-400">↕</span>
                </div>
              </th>
              <th class="border border-gray-300 px-3 py-2 text-right cursor-pointer hover:bg-gray-200 select-none" onclick="sortEquipmentTable('${equipmentId}', 'defectRate')">
                <div class="flex items-center justify-between">
                  <span>Defect Rate</span>
                  <span id="sort-defectRate-${equipmentId}" class="ml-1 text-gray-400">↕</span>
                </div>
              </th>
              <th class="border border-gray-300 px-3 py-2 text-left cursor-pointer hover:bg-gray-200 select-none" onclick="sortEquipmentTable('${equipmentId}', 'Time_start')">
                <div class="flex items-center justify-between">
                  <span>Time</span>
                  <span id="sort-Time_start-${equipmentId}" class="ml-1 text-gray-400">↕</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody id="tableBody-${equipmentId}">
            <!-- Table content will be populated by renderTablePage -->
          </tbody>
        </table>
      </div>
      
      <!-- Table Info -->
      <div class="mt-4 text-sm text-gray-600" id="tableInfo-${equipmentId}"></div>
    </div>
  `;
}

// Initialize chart for equipment
function initializeEquipmentChart(equipment, data) {
  const equipmentId = equipment.replace(/[^a-zA-Z0-9]/g, '_'); // Create valid ID
  const chartElement = document.getElementById(`chart-${equipmentId}`);
  if (!chartElement || !window.echarts) return;
  
  const chart = echarts.init(chartElement);
  
  // Prepare data for chart
  const dailyData = data.reduce((acc, item) => {
    const date = item.Date;
    if (!acc[date]) {
      acc[date] = { shots: 0, hours: 0, defects: 0 };
    }
    acc[date].shots += parseInt(item.ショット数 || 0);
    acc[date].defects += parseInt(item.Total_NG || 0);
    
    if (item.Time_start && item.Time_end) {
      const start = new Date(`2000-01-01T${item.Time_start}`);
      const end = new Date(`2000-01-01T${item.Time_end}`);
      if (end > start) {
        acc[date].hours += (end - start) / (1000 * 60 * 60);
      }
    }
    return acc;
  }, {});
  
  const dates = Object.keys(dailyData).sort();
  const shotData = dates.map(date => dailyData[date].shots);
  const hourData = dates.map(date => dailyData[date].hours.toFixed(1));
  
  const option = {
    title: {
      text: `${equipment} - Daily Performance`,
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['Shots', 'Working Hours'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        rotate: 45,
        fontSize: 10
      }
    },
    yAxis: [
      {
        type: 'value',
        name: 'Shots',
        position: 'left',
        axisLabel: { formatter: '{value}' }
      },
      {
        type: 'value',
        name: 'Hours',
        position: 'right',
        axisLabel: { formatter: '{value}h' }
      }
    ],
    series: [
      {
        name: 'Shots',
        type: 'bar',
        data: shotData,
        itemStyle: { color: '#3B82F6' }
      },
      {
        name: 'Working Hours',
        type: 'line',
        yAxisIndex: 1,
        data: hourData,
        itemStyle: { color: '#10B981' },
        lineStyle: { width: 2 }
      }
    ]
  };
  
  chart.setOption(option);
  equipmentCharts[equipment] = chart;
  
  // Handle resize
  window.addEventListener('resize', () => {
    chart.resize();
  });
}

// Export equipment data to PDF
async function exportEquipmentPDF() {
  try {
    // Check if jsPDF is available
    if (!window.jspdf) {
      alert('PDF export library not loaded. Please refresh the page and try again.');
      return;
    }

    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.textContent = 'PDFエクスポートを準備中です、しばらくお待ちください...';
    loadingIndicator.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded shadow-lg z-[100]';
    document.body.appendChild(loadingIndicator);
    
    const summaryData = createSummaryTable();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait' });
    
    // Setup Japanese font
    try {
      if (typeof notoSansJPRegularBase64 === 'undefined' || (typeof notoSansJPRegularBase64 === 'string' && notoSansJPRegularBase64.startsWith("YOUR_"))) {
        throw new Error("Noto Sans JP Regularフォントのbase64文字列が埋め込まれていないか、利用できません。");
      }
      doc.addFileToVFS('NotoSansJP-Regular.ttf', notoSansJPRegularBase64);
      doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');

      if (typeof notoSansJPBoldBase64 !== 'undefined' && (typeof notoSansJPBoldBase64 === 'string' && !notoSansJPBoldBase64.startsWith("YOUR_"))) {
        doc.addFileToVFS('NotoSansJP-Bold.ttf', notoSansJPBoldBase64);
        doc.addFont('NotoSansJP-Bold.ttf', 'NotoSansJP', 'bold');
      } else {
        console.warn("Noto Sans JP Boldフォントが埋め込まれていないか、利用できません。太字スタイルが正しく表示されない可能性があります。");
      }
      doc.setFont('NotoSansJP');
      console.log("Noto Sans JPフォントがPDF用に登録されました。");
    } catch (fontError) {
      console.error("Noto Sans JPフォントのPDFへの登録に失敗しました:", fontError);
      console.log("PDFは標準フォントを使用します。");
    }
    
    // Get user information
    const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    
    // Fetch user's full name from database
    let displayName = "Unknown User";
    try {
      const userRes = await fetch(BASE_URL + "queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbName: "Sasaki_Coating_MasterDB",
          collectionName: "users",
          query: { username: currentUser.username },
          projection: { firstName: 1, lastName: 1, username: 1 }
        })
      });
      
      const userData = await userRes.json();
      if (userData && userData.length > 0) {
        const user = userData[0];
        if (user.lastName && user.firstName) {
          displayName = `${user.lastName} ${user.firstName}`;
        } else {
          displayName = user.username || "Unknown User";
        }
      } else {
        displayName = currentUser.username || "Unknown User";
      }
    } catch (error) {
      console.error("Failed to fetch user information:", error);
      displayName = currentUser.username || "Unknown User";
    }
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('NotoSansJP', 'bold');
    doc.text('設備分析レポート', 20, 20);
    
    // Add date range
    const startDate = document.getElementById('equipmentStartDate').value;
    const endDate = document.getElementById('equipmentEndDate').value;
    doc.setFontSize(12);
    doc.setFont('NotoSansJP', 'normal');
    doc.text(`期間: ${startDate} ～ ${endDate}`, 20, 35);
    
    // Add generation timestamp and user info
    doc.setFontSize(10);
    doc.text(`作成日時: ${new Date().toLocaleString('ja-JP')}`, 20, 45);
    doc.text(`作成者: ${displayName}`, 20, 52);
    
    // Add summary table with Japanese headers
    const japaneseHeaders = ['設備名', '工場', '総ショット数', '平均ショット数/日', '平均ショット数/時間', '平均稼働時間/日'];
    
    // Update summary data to include factory information
    const enhancedSummaryData = summaryData.map(row => {
      const equipmentName = row[0];
      // Find factory for this equipment
      const factory = Object.keys(equipmentByFactory).find(factoryName => 
        equipmentByFactory[factoryName].includes(equipmentName)
      ) || '不明';
      
      return [
        equipmentName,
        factory,
        row[1], // Total shots
        row[2], // Avg shots/day
        row[3], // Avg shots/hour
        row[4]  // Working hours/day
      ];
    });
    
    doc.autoTable({
      head: [japaneseHeaders],
      body: enhancedSummaryData,
      startY: 60,
      theme: 'grid',
      styles: { 
        font: 'NotoSansJP',
        fontStyle: 'normal',
        fontSize: 9 
      },
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: 255,
        font: 'NotoSansJP',
        fontStyle: 'bold',
        fontSize: 10
      },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    // Generate charts directly in PDF
    try {
      const groupedData = groupDataByEquipment(filteredEquipmentData);
      const equipmentList = Object.keys(groupedData);
      
      if (equipmentList.length > 0) {
        // Add new page for charts
        doc.addPage();
        
        doc.setFontSize(16);
        doc.setFont('NotoSansJP', 'bold');
        doc.text('日次パフォーマンス推移', 20, 20);
        
        let yPosition = 40;
        
        // Generate charts for each equipment (limit to first 2 to fit on page)
        for (let i = 0; i < Math.min(2, equipmentList.length); i++) {
          const equipment = equipmentList[i];
          const data = groupedData[equipment];
          
          // Generate chart directly in PDF
          yPosition = generateDirectChartInPDF(doc, equipment, data, yPosition);
          
          // Check if we have space for another chart
          if (yPosition + 120 > 280) {
            // Add a new page if we need more space
            if (i < Math.min(2, equipmentList.length) - 1) {
              doc.addPage();
              yPosition = 30;
            }
          }
        }
      }
    } catch (chartError) {
      console.warn('チャートの生成に失敗しました:', chartError);
    }
    
    // Save the PDF
    const filename = `設備分析レポート_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    // Show success message
    showNotification('PDFエクスポートが完了しました！', 'success');
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    showNotification('PDFの生成中にエラーが発生しました。再度お試しください。', 'error');
  } finally {
    // Remove loading indicator
    const loadingIndicator = document.querySelector('.fixed.top-1\\/2.left-1\\/2');
    if (loadingIndicator && document.body.contains(loadingIndicator)) {
      document.body.removeChild(loadingIndicator);
    }
  }
}

// Export specific equipment data
function exportEquipmentData(equipment) {
  const groupedData = groupDataByEquipment(filteredEquipmentData);
  const equipmentData = groupedData[equipment];
  
  if (!equipmentData || equipmentData.length === 0) {
    showNotification('No data available for export.', 'error');
    return;
  }
  
  // Create CSV data with Japanese headers
  const headers = ['日付', '作業者', 'ショット数', '加工数量', '不良数', '不良率', '開始時間', '終了時間', '勤務時間'];
  const csvData = equipmentData.map(item => {
    // Calculate work hours
    let workHours = '';
    if (item.Time_start && item.Time_end) {
      try {
        const start = new Date(`2000-01-01T${item.Time_start}`);
        const end = new Date(`2000-01-01T${item.Time_end}`);
        if (end > start) {
          const hours = (end - start) / (1000 * 60 * 60);
          workHours = hours.toFixed(2) + 'h';
        }
      } catch (error) {
        workHours = '';
      }
    }
    
    return [
      item.Date,
      item.Worker_Name || '',
      item.ショット数 || '0',
      item.Process_Quantity || '0',
      item.Total_NG || '0',
      item.Process_Quantity > 0 ? ((parseInt(item.Total_NG || 0) / parseInt(item.Process_Quantity)) * 100).toFixed(2) + '%' : '0%',
      item.Time_start || '',
      item.Time_end || '',
      workHours
    ];
  });
  
  // Create CSV content
  const csvContent = [headers, ...csvData]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${equipment}-data-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showNotification(`${equipment} data exported successfully!`, 'success');
}

// Create summary table data for PDF export
function createSummaryTable() {
  const groupedData = groupDataByEquipment(filteredEquipmentData);
  
  return Object.entries(groupedData).map(([equipment, data]) => {
    const analytics = calculateEquipmentAnalytics(data);
    return [
      equipment,
      analytics.totalShots.toLocaleString(),
      analytics.avgShotsPerDay,
      analytics.avgShotsPerHour,
      analytics.avgWorkingHoursPerDay
    ];
  });
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
    type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
    type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
    'bg-blue-100 border border-blue-400 text-blue-700'
  }`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Render table page for specific equipment
function renderTablePage(equipment, data, page = 1, equipmentItemsPerPage = 10) {
  const equipmentId = equipment.replace(/[^a-zA-Z0-9]/g, '_');
  
  // Initialize sort state for this equipment if not exists (default: Date descending)
  if (!equipmentSortState[equipmentId]) {
    equipmentSortState[equipmentId] = { column: 'Date', direction: -1 };
  }
  
  // Sort data based on current sort state
  const sortState = equipmentSortState[equipmentId];
  let sortedData = [...data];
  
  if (sortState.column) {
    sortedData = sortedData.sort((a, b) => {
      let aValue, bValue;
      
      if (sortState.column === 'Date') {
        aValue = new Date(a.Date);
        bValue = new Date(b.Date);
      } else if (sortState.column === 'defectRate') {
        const aRate = a.Process_Quantity > 0 ? (parseInt(a.Total_NG || 0) / parseInt(a.Process_Quantity)) : 0;
        const bRate = b.Process_Quantity > 0 ? (parseInt(b.Total_NG || 0) / parseInt(b.Process_Quantity)) : 0;
        aValue = aRate;
        bValue = bRate;
      } else if (sortState.column === 'ショット数' || sortState.column === 'Process_Quantity' || sortState.column === 'Total_NG') {
        aValue = parseInt(a[sortState.column] || 0);
        bValue = parseInt(b[sortState.column] || 0);
      } else if (sortState.column === 'Time_start') {
        aValue = a.Time_start || '';
        bValue = b.Time_start || '';
      } else {
        aValue = a[sortState.column] || '';
        bValue = b[sortState.column] || '';
      }
      
      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * sortState.direction;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        return (aValue - bValue) * sortState.direction;
      } else {
        return (aValue - bValue) * sortState.direction;
      }
    });
  }
  
  // Store data for this equipment
  equipmentTableData[equipmentId] = {
    data: sortedData,
    currentPage: page,
    itemsPerPage: equipmentItemsPerPage
  };
  
  // Update sort indicators
  updateSortIndicators(equipmentId, sortState.column, sortState.direction);
  
  const startIndex = (page - 1) * equipmentItemsPerPage;
  const endIndex = startIndex + equipmentItemsPerPage;
  const pageData = sortedData.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedData.length / equipmentItemsPerPage);
  
  // Update table body
  const tableBody = document.getElementById(`tableBody-${equipmentId}`);
  if (tableBody) {
    tableBody.innerHTML = pageData.map(item => {
      const defectRate = item.Process_Quantity > 0 ? 
        ((parseInt(item.Total_NG || 0) / parseInt(item.Process_Quantity)) * 100).toFixed(2) : 0;
      return `
        <tr class="hover:bg-gray-50" onclick="showEquipmentSidebarFromElement(this)" data-row="${encodeURIComponent(JSON.stringify(item))}">
          <td class="border border-gray-300 px-3 py-2">${item.Date}</td>
          <td class="border border-gray-300 px-3 py-2">${item.Worker_Name || '-'}</td>
          <td class="border border-gray-300 px-3 py-2 text-right">${parseInt(item.ショット数 || 0).toLocaleString()}</td>
          <td class="border border-gray-300 px-3 py-2 text-right">${parseInt(item.Process_Quantity || 0).toLocaleString()}</td>
          <td class="border border-gray-300 px-3 py-2 text-right">${parseInt(item.Total_NG || 0).toLocaleString()}</td>
          <td class="border border-gray-300 px-3 py-2 text-right ${defectRate > 5 ? 'text-red-600 font-semibold' : ''}">${defectRate}%</td>
          <td class="border border-gray-300 px-3 py-2">${item.Time_start || '-'} - ${item.Time_end || '-'}</td>
        </tr>
      `;
    }).join('');
  }
  
  // Update pagination
  const paginationContainer = document.getElementById(`pagination-${equipmentId}`);
  if (paginationContainer) {
    let paginationHTML = '';
    
    // Previous button
    if (page > 1) {
      paginationHTML += `<button onclick="goToPage('${equipmentId}', ${page - 1})" class="px-3 py-1 border rounded hover:bg-gray-100">Previous</button>`;
    }
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === page;
      paginationHTML += `
        <button onclick="goToPage('${equipmentId}', ${i})" 
                class="px-3 py-1 border rounded ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}">
          ${i}
        </button>
      `;
    }
    
    // Next button
    if (page < totalPages) {
      paginationHTML += `<button onclick="goToPage('${equipmentId}', ${page + 1})" class="px-3 py-1 border rounded hover:bg-gray-100">Next</button>`;
    }
    
    paginationContainer.innerHTML = paginationHTML;
  }
  
  // Update table info
  const tableInfo = document.getElementById(`tableInfo-${equipmentId}`);
  if (tableInfo) {
    const startRecord = startIndex + 1;
    const endRecord = Math.min(endIndex, sortedData.length);
    tableInfo.textContent = `Showing ${startRecord} to ${endRecord} of ${sortedData.length} entries`;
  }
}

// Go to specific page
function goToPage(equipmentId, page) {
  const tableData = equipmentTableData[equipmentId];
  if (tableData) {
    const equipment = Object.keys(groupDataByEquipment(filteredEquipmentData))
      .find(eq => eq.replace(/[^a-zA-Z0-9]/g, '_') === equipmentId);
    if (equipment) {
      renderTablePage(equipment, tableData.data, page, tableData.itemsPerPage);
    }
  }
}

// Change items per page
function changeItemsPerPage(equipmentId) {
  const select = document.getElementById(`itemsPerPage-${equipmentId}`);
  const newEquipmentItemsPerPage = parseInt(select.value);
  
  const tableData = equipmentTableData[equipmentId];
  if (tableData) {
    const equipment = Object.keys(groupDataByEquipment(filteredEquipmentData))
      .find(eq => eq.replace(/[^a-zA-Z0-9]/g, '_') === equipmentId);
    if (equipment) {
      renderTablePage(equipment, tableData.data, 1, newEquipmentItemsPerPage); // Reset to page 1
    }
  }
}

// Equipment Sidebar Functions
function showEquipmentSidebarFromElement(el) {
  const rowData = JSON.parse(decodeURIComponent(el.getAttribute("data-row")));
  showEquipmentSidebar(rowData);
}

function ensureEquipmentSidebarExists() {
  let sidebar = document.getElementById('equipmentSidebar');
  if (!sidebar) {
    sidebar = document.createElement('div');
    sidebar.id = 'equipmentSidebar';
    sidebar.className = 'fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform translate-x-full transition-transform duration-300 ease-in-out z-50 overflow-y-auto';
    document.body.appendChild(sidebar);
    
    // Add backdrop
    let backdrop = document.getElementById('equipmentSidebarBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'equipmentSidebarBackdrop';
      backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-40 hidden';
      backdrop.onclick = closeEquipmentSidebar;
      document.body.appendChild(backdrop);
    }
  }
  return sidebar;
}

function showEquipmentSidebar(item) {
  const sidebar = ensureEquipmentSidebarExists();
  const backdrop = document.getElementById('equipmentSidebarBackdrop');
  
  // Calculate additional metrics
  const shots = parseInt(item.ショット数 || 0);
  const processQty = parseInt(item.Process_Quantity || 0);
  const defects = parseInt(item.Total_NG || 0);
  const defectRate = processQty > 0 ? ((defects / processQty) * 100).toFixed(2) : '0.00';
  
  // Calculate working time
  let workingHours = 'N/A';
  if (item.Time_start && item.Time_end) {
    const start = new Date(`2000-01-01T${item.Time_start}`);
    const end = new Date(`2000-01-01T${item.Time_end}`);
    if (end > start) {
      const hours = (end - start) / (1000 * 60 * 60);
      workingHours = hours.toFixed(2) + ' 時間';
    }
  }
  
  // Calculate cycle time
  const cycleTime = item.Cycle_Time ? `${item.Cycle_Time} 秒` : 'N/A';
  
  // Calculate shots per hour
  let shotsPerHour = 'N/A';
  if (shots > 0 && workingHours !== 'N/A') {
    const hours = parseFloat(workingHours);
    shotsPerHour = (shots / hours).toFixed(0);
  }

  sidebar.innerHTML = `
    <div class="h-full flex flex-col">
      <!-- Header -->
      <div class="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h3 class="text-lg font-semibold">設備詳細</h3>
        <button onclick="closeEquipmentSidebar()" class="text-white hover:text-gray-200">
          <i class="ri-close-line text-xl"></i>
        </button>
      </div>
      
      <!-- Content -->
      <div class="flex-1 p-4 space-y-6">
        <!-- Basic Information -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
            <i class="ri-information-line mr-2 text-blue-600"></i>
            基本情報
          </h4>
          <div class="grid grid-cols-1 gap-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">設備:</span>
              <span class="font-medium">${item.設備 || '-'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">日付:</span>
              <span class="font-medium">${item.Date || '-'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">作業者:</span>
              <span class="font-medium">${item.Worker_Name || '-'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">工場:</span>
              <span class="font-medium">${item.工場 || '-'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">品番:</span>
              <span class="font-medium">${item.品番 || '-'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">背番号:</span>
              <span class="font-medium">${item.背番号 || '-'}</span>
            </div>
          </div>
        </div>

        <!-- Time Information -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
            <i class="ri-time-line mr-2 text-green-600"></i>
            時間・スケジュール
          </h4>
          <div class="grid grid-cols-1 gap-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">開始時間:</span>
              <span class="font-medium">${item.Time_start || '-'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">終了時間:</span>
              <span class="font-medium">${item.Time_end || '-'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">稼働時間:</span>
              <span class="font-medium text-green-600">${workingHours}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">サイクルタイム:</span>
              <span class="font-medium">${cycleTime}</span>
            </div>
          </div>
        </div>

        <!-- Production Metrics -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
            <i class="ri-bar-chart-line mr-2 text-purple-600"></i>
            生産指標
          </h4>
          <div class="grid grid-cols-1 gap-3">
            <div class="bg-white p-3 rounded border">
              <div class="flex justify-between items-center">
                <span class="text-gray-600 text-sm">総ショット数</span>
                <span class="text-2xl font-bold text-blue-600">${shots.toLocaleString()}</span>
              </div>
            </div>
            <div class="bg-white p-3 rounded border">
              <div class="flex justify-between items-center">
                <span class="text-gray-600 text-sm">加工数量</span>
                <span class="text-2xl font-bold text-green-600">${processQty.toLocaleString()}</span>
              </div>
            </div>
            <div class="bg-white p-3 rounded border">
              <div class="flex justify-between items-center">
                <span class="text-gray-600 text-sm">時間当たりショット数</span>
                <span class="text-xl font-bold text-purple-600">${shotsPerHour}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quality Metrics -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
            <i class="ri-error-warning-line mr-2 text-red-600"></i>
            品質指標
          </h4>
          <div class="grid grid-cols-1 gap-3">
            <div class="bg-white p-3 rounded border">
              <div class="flex justify-between items-center">
                <span class="text-gray-600 text-sm">総不良数</span>
                <span class="text-2xl font-bold ${defects > 0 ? 'text-red-600' : 'text-green-600'}">${defects}</span>
              </div>
            </div>
            <div class="bg-white p-3 rounded border">
              <div class="flex justify-between items-center">
                <span class="text-gray-600 text-sm">不良率</span>
                <span class="text-xl font-bold ${parseFloat(defectRate) > 2 ? 'text-red-600' : 'text-green-600'}">${defectRate}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Defect Details -->
        ${item.疵引不良 || item.加工不良 || item.その他 ? `
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
            <i class="ri-alert-line mr-2 text-orange-600"></i>
            不良内訳
          </h4>
          <div class="space-y-2 text-sm">
            ${item.疵引不良 ? `
              <div class="flex justify-between bg-white p-2 rounded border">
                <span class="text-gray-600">疵引不良:</span>
                <span class="font-medium text-red-600">${item.疵引不良}</span>
              </div>
            ` : ''}
            ${item.加工不良 ? `
              <div class="flex justify-between bg-white p-2 rounded border">
                <span class="text-gray-600">加工不良:</span>
                <span class="font-medium text-red-600">${item.加工不良}</span>
              </div>
            ` : ''}
            ${item.その他 ? `
              <div class="flex justify-between bg-white p-2 rounded border">
                <span class="text-gray-600">その他:</span>
                <span class="font-medium text-red-600">${item.その他}</span>
              </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Additional Data -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
            <i class="ri-database-line mr-2 text-gray-600"></i>
            追加情報
          </h4>
          <div class="grid grid-cols-1 gap-2 text-sm">
            ${item.製造ロット ? `
              <div class="flex justify-between">
                <span class="text-gray-600">製造ロット:</span>
                <span class="font-medium">${item.製造ロット}</span>
              </div>
            ` : ''}
            ${item.材料ロット ? `
              <div class="flex justify-between">
                <span class="text-gray-600">材料ロット:</span>
                <span class="font-medium">${item.材料ロット}</span>
              </div>
            ` : ''}
            ${item.Comment ? `
              <div class="mt-2">
                <span class="text-gray-600">コメント:</span>
                <p class="font-medium mt-1 p-2 bg-white rounded border">${item.Comment}</p>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Master Image Section -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
            <i class="ri-image-line mr-2 text-indigo-600"></i>
            画像
          </h4>
          <div class="space-y-3">
            <!-- Master Image (正しい形状) -->
            <div id="masterImageContainer-${item._id || Date.now()}">
              <div>
                <p class="font-semibold text-sm mb-1">正しい形状</p>
                <div class="rounded shadow w-full max-h-60 bg-gray-100 flex items-center justify-center">
                  <span class="text-gray-500">読み込み中...</span>
                </div>
              </div>
            </div>
            
            ${item['初物チェック画像'] ? `
              <div>
                <label class="text-sm font-medium text-gray-700 mb-1 block">初物チェック画像</label>
                <img src="${item['初物チェック画像']}" 
                     alt="初物チェック" 
                     class="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-75 transition-opacity" 
                     onclick="openEquipmentImageTab('${item['初物チェック画像']}', '初物チェック')">
              </div>
            ` : ''}
            ${item['終物チェック画像'] ? `
              <div>
                <label class="text-sm font-medium text-gray-700 mb-1 block">終物チェック画像</label>
                <img src="${item['終物チェック画像']}" 
                     alt="終物チェック" 
                     class="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-75 transition-opacity" 
                     onclick="openEquipmentImageTab('${item['終物チェック画像']}', '終物チェック')">
              </div>
            ` : ''}
            ${item['材料ラベル画像'] ? `
              <div>
                <label class="text-sm font-medium text-gray-700 mb-1 block">材料ラベル画像</label>
                <img src="${item['材料ラベル画像']}" 
                     alt="材料ラベル" 
                     class="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-75 transition-opacity" 
                     onclick="openEquipmentImageTab('${item['材料ラベル画像']}', '材料ラベル')">
              </div>
            ` : ''}
            ${!item['初物チェック画像'] && !item['終物チェック画像'] && !item['材料ラベル画像'] ? `
              <div class="text-center text-gray-500 py-4">
                <i class="ri-image-off-line text-2xl mb-2"></i>
                <p>画像がありません</p>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Load master image
  loadEquipmentMasterImage(item.品番, item.背番号, item._id || Date.now());
  
  // Show sidebar and backdrop
  sidebar.classList.remove('translate-x-full');
  backdrop.classList.remove('hidden');
}

function closeEquipmentSidebar() {
  const sidebar = document.getElementById('equipmentSidebar');
  const backdrop = document.getElementById('equipmentSidebarBackdrop');
  
  if (sidebar) {
    sidebar.classList.add('translate-x-full');
  }
  
  if (backdrop) {
    backdrop.classList.add('hidden');
  }
}

// Ensure sidebar closes when clicking outside (desktop and mobile)
document.addEventListener("mousedown", function(event) {
  const sidebar = document.getElementById("equipmentSidebar");
  const backdrop = document.getElementById("equipmentSidebarBackdrop");
  if (!sidebar || sidebar.classList.contains("translate-x-full")) return; // Sidebar not open
  if (!sidebar.contains(event.target)) {
    closeEquipmentSidebar();
  }
});

// Load master image for equipment
async function loadEquipmentMasterImage(品番, 背番号, itemId) {
  const container = document.getElementById(`masterImageContainer-${itemId}`);
  
  if (!container) return;
  
  try {
    // First try to find by 品番
    let query = { 品番: 品番 };
    if (!品番 && 背番号) {
      // If no 品番, try with 背番号
      query = { 背番号: 背番号 };
    }

    const response = await fetch(`${BASE_URL}queries`, {
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
          <a href="#" onclick="openEquipmentImageTab('${masterData.imageURL}', '正しい形状'); return false;">
            <img src="${masterData.imageURL}" alt="正しい形状" class="rounded shadow w-full max-h-60 object-contain sm:max-w-md mx-auto hover:opacity-90 cursor-zoom-in border-2 border-green-200" />
          </a>
        </div>
      `;
    } else {
      // Try alternative search if first attempt failed
      if (品番 && 背番号) {
        // If we searched by 品番 first, try 背番号
        const altResponse = await fetch(`${BASE_URL}queries`, {
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
              <a href="#" onclick="openEquipmentImageTab('${masterData.imageURL}', '正しい形状'); return false;">
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

function openEquipmentImageTab(imageUrl, title) {
  const newTab = window.open('', '_blank');
  newTab.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { 
            margin: 0; 
            padding: 20px; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            background-color: #f5f5f5; 
          }
          img { 
            max-width: 100%; 
            max-height: 100%; 
            border: 1px solid #ccc; 
            border-radius: 8px; 
            box-shadow: 0 4px 8px rgba(0,0,0,0.1); 
          }
          .title { 
            position: absolute; 
            top: 10px; 
            left: 20px; 
            font-family: Arial, sans-serif; 
            font-size: 18px; 
            font-weight: bold; 
            color: #333; 
          }
        </style>
      </head>
      <body>
        <div class="title">${title}</div>
        <img src="${imageUrl}" alt="${title}">
      </body>
    </html>
  `);
}

// Sort equipment table by column
function sortEquipmentTable(equipmentId, column) {
  const tableData = equipmentTableData[equipmentId];
  if (!tableData) return;
  
  // Initialize sort state for this equipment if not exists
  if (!equipmentSortState[equipmentId]) {
    equipmentSortState[equipmentId] = { column: null, direction: 1 };
  }
  
  const sortState = equipmentSortState[equipmentId];
  
  // Toggle direction if same column, otherwise set to ascending
  if (sortState.column === column) {
    sortState.direction *= -1;
  } else {
    sortState.column = column;
    sortState.direction = 1;
  }
  
  // Sort the data
  const sortedData = [...tableData.data].sort((a, b) => {
    let aValue, bValue;
    
    if (column === 'Date') {
      aValue = new Date(a.Date);
      bValue = new Date(b.Date);
    } else if (column === 'defectRate') {
      // Calculate defect rate for sorting
      const aRate = a.Process_Quantity > 0 ? (parseInt(a.Total_NG || 0) / parseInt(a.Process_Quantity)) : 0;
      const bRate = b.Process_Quantity > 0 ? (parseInt(b.Total_NG || 0) / parseInt(b.Process_Quantity)) : 0;
      aValue = aRate;
      bValue = bRate;
    } else if (column === 'ショット数' || column === 'Process_Quantity' || column === 'Total_NG') {
      aValue = parseInt(a[column] || 0);
      bValue = parseInt(b[column] || 0);
    } else if (column === 'Time_start') {
      aValue = a.Time_start || '';
      bValue = b.Time_start || '';
    } else {
      aValue = a[column] || '';
      bValue = b[column] || '';
    }
    
    // Handle different data types
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue) * sortState.direction;
    } else if (aValue instanceof Date && bValue instanceof Date) {
      return (aValue - bValue) * sortState.direction;
    } else {
      return (aValue - bValue) * sortState.direction;
    }
  });
  
  // Update the data in tableData
  equipmentTableData[equipmentId].data = sortedData;
  
  // Update sort indicators
  updateSortIndicators(equipmentId, column, sortState.direction);
  
  // Re-render the table with sorted data
  const equipment = Object.keys(groupDataByEquipment(filteredEquipmentData))
    .find(eq => eq.replace(/[^a-zA-Z0-9]/g, '_') === equipmentId);
  if (equipment) {
    renderTablePage(equipment, sortedData, 1, tableData.itemsPerPage);
  }
}

// Update sort indicators in table headers
function updateSortIndicators(equipmentId, activeColumn, direction) {
  // Reset all indicators for this equipment
  const sortIndicators = document.querySelectorAll(`[id^="sort-"][id$="-${equipmentId}"]`);
  sortIndicators.forEach(indicator => {
    indicator.textContent = '↕';
    indicator.className = 'ml-1 text-gray-400';
  });
  
  // Update active indicator
  const activeIndicator = document.getElementById(`sort-${activeColumn}-${equipmentId}`);
  if (activeIndicator) {
    activeIndicator.textContent = direction === 1 ? '↑' : '↓';
    activeIndicator.className = 'ml-1 text-blue-600';
  }
}

// Toggle factory section expand/collapse
function toggleFactorySection(factory) {
  const content = document.getElementById(`factory-content-${factory}`);
  const icon = document.getElementById(`factory-icon-${factory}`);
  
  if (content && icon) {
    const isExpanded = !content.classList.contains('hidden');
    
    if (isExpanded) {
      // Collapse
      content.classList.add('hidden');
      icon.classList.remove('rotate-0');
      icon.classList.add('-rotate-90');
    } else {
      // Expand
      content.classList.remove('hidden');
      icon.classList.remove('-rotate-90');
      icon.classList.add('rotate-0');
    }
    
    // Save expand/collapse state to localStorage
    const expandStates = JSON.parse(localStorage.getItem('factoryExpandStates') || '{}');
    expandStates[factory] = !isExpanded;
    localStorage.setItem('factoryExpandStates', JSON.stringify(expandStates));
  }
}

// Make function globally available
window.toggleFactorySection = toggleFactorySection;

// Generate chart directly in PDF using vector graphics
function generateDirectChartInPDF(doc, equipment, data, startY) {
  // Prepare data for chart
  const dailyData = data.reduce((acc, item) => {
    const date = item.Date;
    if (!acc[date]) {
      acc[date] = { shots: 0, hours: 0, defects: 0 };
    }
    acc[date].shots += parseInt(item.ショット数 || 0);
    acc[date].defects += parseInt(item.Total_NG || 0);
    
    if (item.Time_start && item.Time_end) {
      const start = new Date(`2000-01-01T${item.Time_start}`);
      const end = new Date(`2000-01-01T${item.Time_end}`);
      if (end > start) {
        acc[date].hours += (end - start) / (1000 * 60 * 60);
      }
    }
    return acc;
  }, {});
  
  const dates = Object.keys(dailyData).sort();
  const shotData = dates.map(date => dailyData[date].shots);
  const hourData = dates.map(date => dailyData[date].hours);
  
  // Chart dimensions
  const chartX = 20;
  const chartY = startY + 15;
  const chartWidth = 170;
  const chartHeight = 80;
  
  // Add equipment name
  doc.setFontSize(12);
  doc.setFont('NotoSansJP', 'bold');
  doc.text(`${equipment} - 日次パフォーマンス`, chartX, startY + 5);
  
  // Draw chart background
  doc.setFillColor(248, 250, 252); // Light gray background
  doc.rect(chartX, chartY, chartWidth, chartHeight, 'F');
  
  // Draw chart border
  doc.setDrawColor(156, 163, 175); // Gray border
  doc.setLineWidth(0.5);
  doc.rect(chartX, chartY, chartWidth, chartHeight, 'S');
  
  if (dates.length === 0) {
    doc.setFontSize(10);
    doc.setFont('NotoSansJP', 'normal');
    doc.text('データがありません', chartX + chartWidth / 2, chartY + chartHeight / 2, { align: 'center' });
    return startY + 120;
  }
  
  // Calculate scales
  const maxShots = Math.max(...shotData);
  const maxHours = Math.max(...hourData);
  const shotsScale = maxShots > 0 ? (chartHeight - 20) / maxShots : 1;
  const hoursScale = maxHours > 0 ? (chartHeight - 20) / maxHours : 1;
  
  // Draw grid lines
  doc.setDrawColor(229, 231, 235); // Light gray grid
  doc.setLineWidth(0.3);
  
  // Horizontal grid lines
  for (let i = 0; i <= 4; i++) {
    const y = chartY + 10 + (i * (chartHeight - 20) / 4);
    doc.line(chartX + 5, y, chartX + chartWidth - 5, y);
  }
  
  // Vertical grid lines
  const barWidth = (chartWidth - 30) / dates.length; // More space for thinner bars
  for (let i = 0; i <= dates.length; i++) {
    const x = chartX + 15 + (i * barWidth);
    doc.line(x, chartY + 10, x, chartY + chartHeight - 10);
  }
  
  // Draw bars (shots) - thinner bars
  doc.setFillColor(59, 130, 246); // Blue color for shots
  shotData.forEach((shots, index) => {
    const barHeight = shots * shotsScale;
    const barX = chartX + 15 + (index * barWidth);
    const barY = chartY + chartHeight - 10 - barHeight;
    const actualBarWidth = Math.max(barWidth * 0.6, 3); // Make bars thinner
    
    if (barHeight > 0) {
      doc.rect(barX, barY, actualBarWidth, barHeight, 'F');
    }
  });
  
  // Draw line (working hours) - thinner line
  doc.setDrawColor(16, 185, 129); // Green color for hours
  doc.setLineWidth(1.5); // Thinner line
  
  const hourPoints = hourData.map((hours, index) => {
    const x = chartX + 15 + (index * barWidth) + (barWidth * 0.6) / 2;
    const y = chartY + chartHeight - 10 - (hours * hoursScale);
    return { x, y };
  });
  
  // Draw line segments
  for (let i = 0; i < hourPoints.length - 1; i++) {
    doc.line(hourPoints[i].x, hourPoints[i].y, hourPoints[i + 1].x, hourPoints[i + 1].y);
  }
  
  // Draw line points - smaller circles
  doc.setFillColor(16, 185, 129);
  hourPoints.forEach(point => {
    doc.circle(point.x, point.y, 1, 'F');
  });
  
  // Draw Y-axis labels and titles
  doc.setFontSize(8);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(75, 85, 99); // Gray text
  
  // Shots axis (left)
  for (let i = 0; i <= 4; i++) {
    const value = Math.round(maxShots * i / 4);
    const y = chartY + chartHeight - 10 - (i * (chartHeight - 20) / 4);
    doc.text(value.toString(), chartX + 8, y + 1, { align: 'right' });
  }
  
  // Hours axis (right)
  for (let i = 0; i <= 4; i++) {
    const value = (maxHours * i / 4).toFixed(1) + 'h';
    const y = chartY + chartHeight - 10 - (i * (chartHeight - 20) / 4);
    doc.text(value, chartX + chartWidth - 8, y + 1, { align: 'left' });
  }
  
  // Add axis titles
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  
  // Left Y-axis title (shots)
  doc.text('ショット数', chartX - 2, chartY + 5, { align: 'right' });
  
  // Right Y-axis title (hours)
  doc.text('稼働時間', chartX + chartWidth + 2, chartY + 5, { align: 'left' });
  
  // X-axis title
  doc.text('日付', chartX + chartWidth / 2, chartY + chartHeight + 15, { align: 'center' });
  
  // Draw X-axis labels (dates)
  dates.forEach((date, index) => {
    const x = chartX + 15 + (index * barWidth) + (barWidth * 0.6) / 2;
    const y = chartY + chartHeight + 8; // Moved down to make room for axis title
    
    // Format date for display
    const formattedDate = new Date(date).toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    doc.text(formattedDate, x, y, { align: 'center' });
  });
  
  // Draw legend
  const legendY = chartY + chartHeight + 20; // More space for axis title
  doc.setFontSize(9);
  
  // Shots legend
  doc.setFillColor(59, 130, 246);
  doc.rect(chartX, legendY, 8, 4, 'F');
  doc.setTextColor(0, 0, 0);
  doc.text('ショット数', chartX + 12, legendY + 3);
  
  // Hours legend
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(2);
  doc.line(chartX + 60, legendY + 2, chartX + 68, legendY + 2);
  doc.setFillColor(16, 185, 129);
  doc.circle(chartX + 64, legendY + 2, 1, 'F');
  doc.text('稼働時間', chartX + 72, legendY + 3);
  
  // Add summary statistics
  const analytics = calculateEquipmentAnalytics(data);
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  
  const summaryY = legendY + 8;
  doc.text(`総ショット数: ${analytics.totalShots.toLocaleString()}`, chartX, summaryY);
  doc.text(`平均ショット数/日: ${analytics.avgShotsPerDay}`, chartX + 60, summaryY);
  doc.text(`平均稼働時間/日: ${analytics.avgWorkingHoursPerDay}h`, chartX + 120, summaryY);
  
  return startY + 130; // Return next Y position (increased for axis title space)
}
