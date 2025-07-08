// Equipment Analytics Module

let equipmentData = [];
let filteredEquipmentData = [];
let availableEquipment = [];
let equipmentCharts = {};
let equipmentByFactory = {}; // New: equipment grouped by factory

// Equipment table data storage
let equipmentTableData = {};

// Load equipment data from pressDB
async function loadEquipmentData() {
  try {
    // Use the existing /queries route to get all pressDB data
    const response = await fetch(`${BASE_URL}queries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dbName: 'submittedDB',
        collectionName: 'pressDB',
        query: {} // Empty query to get all data
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch equipment data: ${response.status}`);
    }
    
    const data = await response.json();
    equipmentData = data;
    
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
    
    // Initial load with all data
    filteredEquipmentData = equipmentData;
    renderEquipmentAnalytics();
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
  
  // Set default date range (last 7 days)
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);
  
  document.getElementById('equipmentStartDate').value = weekAgo.toISOString().split('T')[0];
  document.getElementById('equipmentEndDate').value = today.toISOString().split('T')[0];
  
  // Create equipment checkboxes grouped by factory
  const factoriesHTML = Object.entries(equipmentByFactory).map(([factory, equipmentList]) => `
    <div class="mb-4 border border-gray-200 rounded-lg p-3">
      <div class="flex items-center justify-between mb-2">
        <h4 class="font-semibold text-sm text-gray-700">${factory}</h4>
        <div class="flex space-x-2">
          <button onclick="toggleFactoryEquipment('${factory}', true)" class="text-xs text-blue-600 hover:text-blue-800">All</button>
          <button onclick="toggleFactoryEquipment('${factory}', false)" class="text-xs text-blue-600 hover:text-blue-800">None</button>
        </div>
      </div>
      <div class="space-y-1 max-h-32 overflow-y-auto">
        ${equipmentList.map(equipment => `
          <label class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-sm">
            <input type="checkbox" value="${equipment}" checked class="equipment-checkbox" data-factory="${factory}">
            <span>${equipment}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');
  
  checkboxContainer.innerHTML = factoriesHTML;
}

// Toggle all equipment checkboxes
function toggleAllEquipment(selectAll) {
  const checkboxes = document.querySelectorAll('.equipment-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAll;
  });
}

// Toggle equipment for a specific factory
function toggleFactoryEquipment(factory, selectAll) {
  const checkboxes = document.querySelectorAll(`.equipment-checkbox[data-factory="${factory}"]`);
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAll;
  });
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
              <th class="border border-gray-300 px-3 py-2 text-left">Date</th>
              <th class="border border-gray-300 px-3 py-2 text-left">Worker</th>
              <th class="border border-gray-300 px-3 py-2 text-right">Shots</th>
              <th class="border border-gray-300 px-3 py-2 text-right">Process Qty</th>
              <th class="border border-gray-300 px-3 py-2 text-right">Defects</th>
              <th class="border border-gray-300 px-3 py-2 text-right">Defect Rate</th>
              <th class="border border-gray-300 px-3 py-2 text-left">Time</th>
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
    const userName = currentUser.fullName || currentUser.username || "Unknown User";
    
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
    doc.text(`作成者: ${userName}`, 20, 52);
    
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
  
  // Create CSV data
  const headers = ['Date', 'Worker', 'Shots', 'Process Qty', 'Defects', 'Defect Rate', 'Time Start', 'Time End'];
  const csvData = equipmentData.map(item => [
    item.Date,
    item.Worker_Name || '',
    item.ショット数 || '0',
    item.Process_Quantity || '0',
    item.Total_NG || '0',
    item.Process_Quantity > 0 ? ((parseInt(item.Total_NG || 0) / parseInt(item.Process_Quantity)) * 100).toFixed(2) + '%' : '0%',
    item.Time_start || '',
    item.Time_end || ''
  ]);
  
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
  const sortedData = data.sort((a, b) => new Date(b.Date) - new Date(a.Date));
  
  // Store data for this equipment
  equipmentTableData[equipmentId] = {
    data: sortedData,
    currentPage: page,
    itemsPerPage: equipmentItemsPerPage
  };
  
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
        <tr class="hover:bg-gray-50">
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

// Export functions for global access
window.loadEquipmentData = loadEquipmentData;
window.applyEquipmentFilters = applyEquipmentFilters;
window.exportEquipmentPDF = exportEquipmentPDF;
window.exportEquipmentData = exportEquipmentData;
window.toggleAllEquipment = toggleAllEquipment;
window.toggleFactoryEquipment = toggleFactoryEquipment;
window.goToPage = goToPage;
window.changeItemsPerPage = changeItemsPerPage;

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
  const barWidth = (chartWidth - 20) / dates.length;
  for (let i = 0; i <= dates.length; i++) {
    const x = chartX + 10 + (i * barWidth);
    doc.line(x, chartY + 10, x, chartY + chartHeight - 10);
  }
  
  // Draw bars (shots)
  doc.setFillColor(59, 130, 246); // Blue color for shots
  shotData.forEach((shots, index) => {
    const barHeight = shots * shotsScale;
    const barX = chartX + 12 + (index * barWidth);
    const barY = chartY + chartHeight - 10 - barHeight;
    const actualBarWidth = barWidth - 4;
    
    if (barHeight > 0) {
      doc.rect(barX, barY, actualBarWidth, barHeight, 'F');
    }
  });
  
  // Draw line (working hours)
  doc.setDrawColor(16, 185, 129); // Green color for hours
  doc.setLineWidth(2);
  
  const hourPoints = hourData.map((hours, index) => {
    const x = chartX + 12 + (index * barWidth) + barWidth / 2;
    const y = chartY + chartHeight - 10 - (hours * hoursScale);
    return { x, y };
  });
  
  // Draw line segments
  for (let i = 0; i < hourPoints.length - 1; i++) {
    doc.line(hourPoints[i].x, hourPoints[i].y, hourPoints[i + 1].x, hourPoints[i + 1].y);
  }
  
  // Draw line points
  doc.setFillColor(16, 185, 129);
  hourPoints.forEach(point => {
    doc.circle(point.x, point.y, 1.5, 'F');
  });
  
  // Draw Y-axis labels
  doc.setFontSize(8);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(75, 85, 99); // Gray text
  
  // Shots axis (left)
  for (let i = 0; i <= 4; i++) {
    const value = (maxShots * i / 4).toFixed(0);
    const y = chartY + chartHeight - 10 - (i * (chartHeight - 20) / 4);
    doc.text(value, chartX + 2, y + 1, { align: 'right' });
  }
  
  // Hours axis (right)
  for (let i = 0; i <= 4; i++) {
    const value = (maxHours * i / 4).toFixed(1) + 'h';
    const y = chartY + chartHeight - 10 - (i * (chartHeight - 20) / 4);
    doc.text(value, chartX + chartWidth - 2, y + 1, { align: 'left' });
  }
  
  // Draw X-axis labels (dates)
  dates.forEach((date, index) => {
    const x = chartX + 12 + (index * barWidth) + barWidth / 2;
    const y = chartY + chartHeight + 5;
    
    // Format date for display
    const formattedDate = new Date(date).toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    doc.text(formattedDate, x, y, { align: 'center' });
  });
  
  // Draw legend
  const legendY = chartY + chartHeight + 15;
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
  
  return startY + 120; // Return next Y position
}
