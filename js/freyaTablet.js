// freyaTablet.js - Freya Tablet Production Records Management

let freyaTabletCurrentPage = 1;
let freyaTabletItemsPerPage = 10;
let freyaTabletData = [];
let freyaTabletFilteredData = [];
let freyaTabletTotalPages = 0;
let freyaTabletTotalItems = 0;
let freyaTabletSortState = { column: null, direction: 1 };

// Initialize the Freya Tablet system
function initializeFreyaTabletSystem() {
    setFreyaTabletDefaultDates();
    loadFreyaTabletData();
    setupFreyaTabletEventListeners();
    populateFreyaTabletEquipmentFilter();
}

// Set default date range (1 week business days back to today)
function setFreyaTabletDefaultDates() {
    const today = new Date();
    const oneWeekAgo = new Date(today);
    
    // Calculate 7 business days back (excluding weekends)
    let businessDaysBack = 0;
    while (businessDaysBack < 7) {
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 1);
        // Monday = 1, Tuesday = 2, ..., Friday = 5, Saturday = 6, Sunday = 0
        if (oneWeekAgo.getDay() !== 0 && oneWeekAgo.getDay() !== 6) {
            businessDaysBack++;
        }
    }
    
    // Set the date input values
    const dateFromInput = document.getElementById('freyaTabletDateFrom');
    const dateToInput = document.getElementById('freyaTabletDateTo');
    
    if (dateFromInput) {
        dateFromInput.value = oneWeekAgo.toISOString().split('T')[0];
    }
    
    if (dateToInput) {
        dateToInput.value = today.toISOString().split('T')[0];
    }
    
    // Set the items per page dropdown to match the JavaScript variable
    const itemsPerPageSelect = document.getElementById('freyaTabletItemsPerPage');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.value = freyaTabletItemsPerPage;
    }
    
    console.log(`📅 Set default date range: ${oneWeekAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);
    console.log(`📄 Set items per page: ${freyaTabletItemsPerPage}`);
}

// Setup event listeners
function setupFreyaTabletEventListeners() {
    // Refresh button
    document.getElementById('refreshFreyaTabletBtn')?.addEventListener('click', () => {
        loadFreyaTabletData();
    });

    // Items per page selector
    document.getElementById('freyaTabletItemsPerPage')?.addEventListener('change', (e) => {
        freyaTabletItemsPerPage = parseInt(e.target.value);
        freyaTabletCurrentPage = 1; // Reset to first page
        loadFreyaTabletData(); // Reload data from server with new page size
    });

    // Previous page button
    document.getElementById('freyaTabletPrevPage')?.addEventListener('click', () => {
        if (freyaTabletCurrentPage > 1) {
            goToFreyaTabletPage(freyaTabletCurrentPage - 1);
        }
    });

    // Next page button
    document.getElementById('freyaTabletNextPage')?.addEventListener('click', () => {
        if (freyaTabletCurrentPage < freyaTabletTotalPages) {
            goToFreyaTabletPage(freyaTabletCurrentPage + 1);
        }
    });

    // Search input with debounce
    let searchTimeout;
    document.getElementById('freyaTabletSearchInput')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFreyaTabletFilters();
        }, 500);
    });

    // Equipment filter
    document.getElementById('freyaTabletEquipmentFilter')?.addEventListener('change', () => {
        applyFreyaTabletFilters();
    });

    // Date filters
    document.getElementById('freyaTabletDateFrom')?.addEventListener('change', () => {
        applyFreyaTabletFilters();
    });

    document.getElementById('freyaTabletDateTo')?.addEventListener('change', () => {
        applyFreyaTabletFilters();
    });

    // Apply Filters button
    document.getElementById('applyFreyaTabletFilters')?.addEventListener('click', () => {
        applyFreyaTabletFilters();
    });
}

// Load production records data
async function loadFreyaTabletData() {
    try {
        showFreyaTabletLoadingState();
        
        // Build query parameters for server-side pagination and sorting
        const params = new URLSearchParams({
            page: freyaTabletCurrentPage,
            limit: freyaTabletItemsPerPage
        });
        
        // Add sorting parameters if active
        if (freyaTabletSortState.column) {
            params.append('sortField', freyaTabletSortState.column);
            params.append('sortDirection', freyaTabletSortState.direction);
        }
        
        // Add filter parameters
        const equipmentFilter = document.getElementById('freyaTabletEquipmentFilter')?.value;
        const dateFrom = document.getElementById('freyaTabletDateFrom')?.value;
        const dateTo = document.getElementById('freyaTabletDateTo')?.value;
        const searchInput = document.getElementById('freyaTabletSearchInput')?.value;
        
        if (equipmentFilter) {
            params.append('equipment', equipmentFilter);
        }
        if (dateFrom) {
            params.append('dateFrom', dateFrom);
        }
        if (dateTo) {
            params.append('dateTo', dateTo);
        }
        if (searchInput) {
            params.append('search', searchInput);
        }
        
        console.log('📡 Loading Freya Tablet data with filters:', Object.fromEntries(params));
        
        const response = await fetch(`${BASE_URL}api/freya-tablet-data?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            freyaTabletData = data.data || [];
            freyaTabletFilteredData = [...freyaTabletData]; // For server-side pagination, filtered data = current page data
            
            // Store pagination info from server
            if (data.pagination) {
                freyaTabletTotalPages = data.pagination.totalPages;
                freyaTabletTotalItems = data.pagination.totalItems;
                freyaTabletCurrentPage = data.pagination.currentPage;
            }
            
            // Update statistics
            updateFreyaTabletStatistics();
            
            // Render table
            renderFreyaTabletTable();
            updateFreyaTabletPagination();
            
            // Update equipment filter
            populateFreyaTabletEquipmentFilter();
            
            console.log(`✅ Loaded ${freyaTabletData.length} production records (page ${freyaTabletCurrentPage}/${freyaTabletTotalPages})`);
        } else {
            throw new Error(data.message || 'Failed to load data');
        }
    } catch (error) {
        console.error('Error loading Freya Tablet data:', error);
        if (typeof showNotification === 'function') {
            showNotification('Failed to load production records: ' + error.message, 'error');
        }
    }
}

/**
 * Show loading state for Freya Tablet
 */
function showFreyaTabletLoadingState() {
    const container = document.getElementById('freyaTabletTableContainer');
    if (container) {
        container.innerHTML = '<div class="p-8 text-center text-gray-500"><i class="ri-loader-4-line animate-spin text-2xl mr-2"></i>Loading production records...</div>';
    }
    
    // Add loading state to statistics
    document.getElementById('freyaTabletTotalRecords').textContent = '-';
    document.getElementById('freyaTabletTotalQuantity').textContent = '-';
    document.getElementById('freyaTabletTotalNG').textContent = '-';
    document.getElementById('freyaTabletAvgCycleTime').textContent = '-';
}

// Populate equipment filter dropdown
function populateFreyaTabletEquipmentFilter() {
    const equipmentFilter = document.getElementById('freyaTabletEquipmentFilter');
    if (!equipmentFilter) return;

    // Get unique equipment values
    const equipmentSet = new Set();
    freyaTabletData.forEach(record => {
        if (record.設備) {
            equipmentSet.add(record.設備);
        }
    });

    // Clear existing options except the first one
    equipmentFilter.innerHTML = '<option value="">All Equipment</option>';

    // Add equipment options
    Array.from(equipmentSet).sort().forEach(equipment => {
        const option = document.createElement('option');
        option.value = equipment;
        option.textContent = equipment;
        equipmentFilter.appendChild(option);
    });
}

// Sort data function
function sortFreyaTabletData(field) {
    // Toggle direction if same field, otherwise default to desc
    if (freyaTabletSortState.column === field) {
        freyaTabletSortState.direction = freyaTabletSortState.direction === 1 ? -1 : 1;
    } else {
        freyaTabletSortState.column = field;
        freyaTabletSortState.direction = -1; // Start with descending
    }

    // Reset to first page and reload data from server with new sort
    freyaTabletCurrentPage = 1;
    loadFreyaTabletData();
}

// Apply filters
function applyFreyaTabletFilters() {
    // Reset to first page and reload data from server with filters
    freyaTabletCurrentPage = 1;
    loadFreyaTabletData();
}

// Update statistics
function updateFreyaTabletStatistics() {
    const totalRecords = freyaTabletFilteredData.length;
    const totalQuantity = freyaTabletFilteredData.reduce((sum, record) => {
        return sum + (parseInt(record.Total || record.Process_Quantity) || 0);
    }, 0);
    const totalNG = freyaTabletFilteredData.reduce((sum, record) => {
        return sum + (parseInt(record.Total_NG) || 0);
    }, 0);
    
    // Calculate average cycle time
    let avgCycleTime = 0;
    const cycleTimeRecords = freyaTabletFilteredData.filter(record => record.Cycle_Time && !isNaN(parseFloat(record.Cycle_Time)));
    if (cycleTimeRecords.length > 0) {
        const totalCycleTime = cycleTimeRecords.reduce((sum, record) => {
            return sum + parseFloat(record.Cycle_Time);
        }, 0);
        avgCycleTime = (totalCycleTime / cycleTimeRecords.length).toFixed(2);
    }

    // Update DOM elements
    document.getElementById('freyaTabletTotalRecords').textContent = totalRecords.toLocaleString();
    document.getElementById('freyaTabletTotalQuantity').textContent = totalQuantity.toLocaleString();
    document.getElementById('freyaTabletTotalNG').textContent = totalNG.toLocaleString();
    document.getElementById('freyaTabletAvgCycleTime').textContent = avgCycleTime + 's';
}

// Render table
function renderFreyaTabletTable() {
    const container = document.getElementById('freyaTabletTableContainer');
    if (!container) return;

    // For server-side pagination, use the data directly without slicing
    const currentPageData = freyaTabletFilteredData;

    if (currentPageData.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="ri-inbox-line text-4xl mb-4"></i>
                <p>No production records found</p>
            </div>
        `;
        return;
    }

    // Create table
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';

    // Table header
    const thead = document.createElement('thead');
    thead.className = 'bg-gray-50';
    thead.innerHTML = `
        <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onclick="sortFreyaTabletData('Date')">
                <div class="flex items-center space-x-1">
                    <span>Date</span>
                    <i class="ri-arrow-up-down-line text-gray-400"></i>
                </div>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onclick="sortFreyaTabletData('設備')">
                <div class="flex items-center space-x-1">
                    <span>Equipment</span>
                    <i class="ri-arrow-up-down-line text-gray-400"></i>
                </div>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onclick="sortFreyaTabletData('品番')">
                <div class="flex items-center space-x-1">
                    <span>Part Number</span>
                    <i class="ri-arrow-up-down-line text-gray-400"></i>
                </div>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onclick="sortFreyaTabletData('Worker_Name')">
                <div class="flex items-center space-x-1">
                    <span>Worker</span>
                    <i class="ri-arrow-up-down-line text-gray-400"></i>
                </div>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onclick="sortFreyaTabletData('Total')">
                <div class="flex items-center space-x-1">
                    <span>Quantity</span>
                    <i class="ri-arrow-up-down-line text-gray-400"></i>
                </div>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onclick="sortFreyaTabletData('Total_NG')">
                <div class="flex items-center space-x-1">
                    <span>NG Count</span>
                    <i class="ri-arrow-up-down-line text-gray-400"></i>
                </div>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onclick="sortFreyaTabletData('Cycle_Time')">
                <div class="flex items-center space-x-1">
                    <span>Cycle Time</span>
                    <i class="ri-arrow-up-down-line text-gray-400"></i>
                </div>
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Order</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
        </tr>
    `;

    // Table body
    const tbody = document.createElement('tbody');
    tbody.className = 'bg-white divide-y divide-gray-200';

    currentPageData.forEach((record, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 cursor-pointer transition-colors';
        row.onclick = () => showFreyaTabletDetail(record);

        // Format date
        const formattedDate = record.Date ? new Date(record.Date).toLocaleDateString('ja-JP') : 'N/A';
        
        // Get work order info
        const workOrderNumber = record.WorkOrder_Info?.workOrderNumber || 'N/A';
        const workOrderStatus = record.WorkOrder_Info?.status || '';
        
        // Count images
        const imageCount = getImageCount(record);

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formattedDate}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.設備 || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>${record.品番 || 'N/A'}</div>
                <div class="text-xs text-gray-500">${record.背番号 || ''}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.Worker_Name || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>${(record.Total || record.Process_Quantity || 0).toLocaleString()}</div>
                <div class="text-xs text-gray-500">Made: ${(record.Process_Quantity || 0).toLocaleString()}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm ${parseInt(record.Total_NG) > 0 ? 'text-red-600' : 'text-gray-900'}">
                ${(record.Total_NG || 0).toLocaleString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.Cycle_Time ? record.Cycle_Time + 's' : 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${workOrderNumber !== 'N/A' ? 
                    `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">${workOrderNumber}</span>` : 
                    '<span class="text-gray-400">No WO</span>'
                }
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${imageCount > 0 ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"><i class="ri-image-line mr-1"></i>${imageCount}</span>` : '<span class="text-gray-400">No images</span>'}
            </td>
        `;

        tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
}

// Count images in a record
function getImageCount(record) {
    let count = 0;
    
    // Count material label images array
    if (record.materialLabelImages && Array.isArray(record.materialLabelImages)) {
        count += record.materialLabelImages.length;
    }
    
    // Count individual image fields
    const imageFields = [
        '初物チェック画像',
        '終物チェック画像',
        '材料ラベル画像'
    ];
    
    imageFields.forEach(field => {
        if (record[field] && typeof record[field] === 'string' && record[field].includes('firebase')) {
            count++;
        }
    });
    
    // Also check for any other firebase URLs in the object
    Object.keys(record).forEach(key => {
        if (typeof record[key] === 'string' && 
            record[key].includes('firebasestorage.googleapis.com') && 
            !imageFields.includes(key) && 
            key !== '材料ラベル画像') {
            count++;
        }
    });
    
    return count;
}

// Show detail modal
function showFreyaTabletDetail(record) {
    const modal = document.getElementById('freyaTabletDetailModal');
    const content = document.getElementById('freyaTabletDetailContent');
    
    if (!modal || !content) return;

    // Build detail content with proper structure for pressDB data
    let detailHTML = `
        <!-- Production Overview -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-2">
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 class="text-lg font-semibold text-gray-900 mb-4">Production Information</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-3">
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Date</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.Date ? new Date(record.Date).toLocaleDateString('ja-JP') : 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Equipment (設備)</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.設備 || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Part Number (品番)</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.品番 || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Background Number (背番号)</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.背番号 || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Worker Name</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.Worker_Name || 'N/A'}</dd>
                            </div>
                        </div>
                        <div class="space-y-3">
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Time Range</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.Time_start || 'N/A'} - ${record.Time_end || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Total Work Hours</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.Total_Work_Hours || 'N/A'} hours</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Material Lot (材料ロット)</dt>
                                <dd class="text-sm text-gray-900 mt-1 break-all">${record.材料ロット || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Comment</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.Comment || 'N/A'}</dd>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Statistics Card -->
            <div class="space-y-4">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 class="font-medium text-blue-900 mb-3">Production Stats</h5>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-sm text-blue-700">Quantity Made:</span>
                            <span class="text-sm font-medium text-blue-900">${(record.Process_Quantity || 0).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-blue-700">Actual Total:</span>
                            <span class="text-sm font-medium text-blue-900">${(record.Total || 0).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-blue-700">Cycle Time:</span>
                            <span class="text-sm font-medium text-blue-900">${record.Cycle_Time ? record.Cycle_Time + 's' : 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-blue-700">Shot Count:</span>
                            <span class="text-sm font-medium text-blue-900">${record.ショット数 || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- NG Analysis -->
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h5 class="font-medium text-red-900 mb-3">NG Analysis</h5>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-sm text-red-700">Total NG:</span>
                            <span class="text-sm font-medium text-red-900">${(record.Total_NG || 0).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-red-700">Non Conforming (Internal):</span>
                            <span class="text-sm font-medium text-red-900">${(record.疵引不良 || 0).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-red-700">Non Conforming (Supplier):</span>
                            <span class="text-sm font-medium text-red-900">${(record.加工不良 || 0).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-red-700">Others:</span>
                            <span class="text-sm font-medium text-red-900">${(record.その他 || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Work Order Information
    if (record.WorkOrder_Info && record.WorkOrder_Info.isWorkOrder) {
        detailHTML += `
            <div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h4 class="text-lg font-semibold text-green-900 mb-4">Work Order Information</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <dt class="text-sm font-medium text-green-700">Work Order Number</dt>
                        <dd class="text-sm text-green-900 mt-1 font-mono">${record.WorkOrder_Info.workOrderNumber || 'N/A'}</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-green-700">Status</dt>
                        <dd class="text-sm text-green-900 mt-1">
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                ${record.WorkOrder_Info.status || 'N/A'}
                            </span>
                        </dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-green-700">SKU</dt>
                        <dd class="text-sm text-green-900 mt-1">${record.WorkOrder_Info.sku || 'N/A'}</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-green-700">Assigned To</dt>
                        <dd class="text-sm text-green-900 mt-1">${record.WorkOrder_Info.assignedTo || 'N/A'}</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-green-700">NC Program Sent</dt>
                        <dd class="text-sm text-green-900 mt-1">${record.WorkOrder_Info.ncProgramSent ? 'Yes' : 'No'}</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-green-700">Target Machines</dt>
                        <dd class="text-sm text-green-900 mt-1">${record.WorkOrder_Info.targetMachines ? record.WorkOrder_Info.targetMachines.join(', ') : 'N/A'}</dd>
                    </div>
                </div>
            </div>
        `;
    }

    // Break Time Data
    if (record.Break_Time_Data) {
        detailHTML += `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <h4 class="text-lg font-semibold text-yellow-900 mb-4">Break Time Information</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        `;
        
        Object.keys(record.Break_Time_Data).forEach(breakKey => {
            const breakData = record.Break_Time_Data[breakKey];
            if (breakData && typeof breakData === 'object' && (breakData.start || breakData.end)) {
                detailHTML += `
                    <div>
                        <dt class="text-sm font-medium text-yellow-700">${breakKey.toUpperCase()}</dt>
                        <dd class="text-sm text-yellow-900 mt-1">${breakData.start || 'N/A'} - ${breakData.end || 'N/A'}</dd>
                    </div>
                `;
            }
        });
        
        detailHTML += `
                </div>
                <div class="flex space-x-6">
                    <div>
                        <dt class="text-sm font-medium text-yellow-700">Total Break Minutes</dt>
                        <dd class="text-sm text-yellow-900 mt-1">${record.Total_Break_Minutes || 0} minutes</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-yellow-700">Total Break Hours</dt>
                        <dd class="text-sm text-yellow-900 mt-1">${record.Total_Break_Hours || 0} hours</dd>
                    </div>
                </div>
            </div>
        `;
    }

    // Quality Check Information
    if (record['2HourQualityCheck'] && record['2HourQualityCheck'].checks) {
        detailHTML += `
            <div class="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                <h4 class="text-lg font-semibold text-purple-900 mb-4">Quality Check Information</h4>
                <div class="mb-4">
                    <span class="text-sm text-purple-700">Total Checks: </span>
                    <span class="text-sm font-medium text-purple-900">${record['2HourQualityCheck'].totalChecks || 0}</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        `;
        
        Object.keys(record['2HourQualityCheck'].checks).forEach(checkKey => {
            const check = record['2HourQualityCheck'].checks[checkKey];
            if (check) {
                detailHTML += `
                    <div class="border border-purple-200 rounded p-3">
                        <h6 class="font-medium text-purple-900">Check ${check.checkNumber || checkKey}</h6>
                        <div class="mt-2 space-y-1">
                            <div class="text-sm">
                                <span class="text-purple-700">Checker: </span>
                                <span class="text-purple-900">${check.checkerName || 'N/A'}</span>
                            </div>
                            <div class="text-sm">
                                <span class="text-purple-700">Time: </span>
                                <span class="text-purple-900">${check.checkTime || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        detailHTML += `
                </div>
            </div>
        `;
    }

    // Images Section
    const imageFields = getImageFields(record);
    if (imageFields.length > 0) {
        detailHTML += `
            <div class="border border-gray-200 rounded-lg p-6">
                <h4 class="text-lg font-semibold text-gray-900 mb-4">Images</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        `;

        imageFields.forEach(({ key, url, label }) => {
            detailHTML += `
                <div class="space-y-2">
                    <div class="text-sm font-medium text-gray-700">${label}</div>
                    <div class="border border-gray-200 rounded-lg overflow-hidden">
                        <img src="${url}" 
                             alt="${label}"
                             class="w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                             onclick="showImageModal('${url}', '${label}')"
                             onerror="this.parentElement.innerHTML='<div class=\\'flex items-center justify-center h-32 bg-gray-100 text-gray-400\\'>Failed to load image</div>'"
                        />
                    </div>
                </div>
            `;
        });

        detailHTML += `
                </div>
            </div>
        `;
    }

    content.innerHTML = detailHTML;
    modal.classList.remove('hidden');
}

// Check if a field contains an image URL
function isImageField(key, value) {
    if (typeof value !== 'string') return false;
    return value.includes('firebasestorage.googleapis.com') || 
           value.includes('firebase') || 
           key.toLowerCase().includes('image') || 
           key.toLowerCase().includes('画像');
}

// Get all image fields with proper labels
function getImageFields(record) {
    const imageFields = [];
    
    // Material label images array
    if (record.materialLabelImages && Array.isArray(record.materialLabelImages)) {
        record.materialLabelImages.forEach((url, index) => {
            imageFields.push({
                key: `materialLabelImages[${index}]`,
                url: url,
                label: `Material Label ${index + 1}`
            });
        });
    }
    
    // Individual image fields with Japanese names
    const namedImageFields = {
        '初物チェック画像': 'First Article Check Image',
        '終物チェック画像': 'Final Article Check Image',
        '材料ラベル画像': 'Material Label Image'
    };
    
    Object.keys(namedImageFields).forEach(key => {
        if (record[key] && typeof record[key] === 'string' && record[key].includes('firebase')) {
            imageFields.push({
                key: key,
                url: record[key],
                label: namedImageFields[key]
            });
        }
    });
    
    return imageFields;
}

// Show image modal
function showImageModal(imageUrl, title) {
    // Create image modal if it doesn't exist
    let imageModal = document.getElementById('imageViewModal');
    if (!imageModal) {
        imageModal = document.createElement('div');
        imageModal.id = 'imageViewModal';
        imageModal.className = 'fixed inset-0 bg-black bg-opacity-75 hidden z-50';
        imageModal.innerHTML = `
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="relative max-w-4xl max-h-full">
                    <button onclick="closeImageModal()" class="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 z-10">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                    <img id="modalImage" src="" alt="" class="max-w-full max-h-screen object-contain rounded-lg" />
                    <div id="modalImageTitle" class="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-3 py-1 rounded"></div>
                </div>
            </div>
        `;
        document.body.appendChild(imageModal);
    }

    document.getElementById('modalImage').src = imageUrl;
    document.getElementById('modalImageTitle').textContent = title;
    imageModal.classList.remove('hidden');
}

// Close image modal
function closeImageModal() {
    const imageModal = document.getElementById('imageViewModal');
    if (imageModal) {
        imageModal.classList.add('hidden');
    }
}

// Close detail modal
function closeFreyaTabletModal() {
    const modal = document.getElementById('freyaTabletDetailModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Update pagination
function updateFreyaTabletPagination() {
    const prevBtn = document.getElementById('freyaTabletPrevPage');
    const nextBtn = document.getElementById('freyaTabletNextPage');
    const paginationNumbers = document.getElementById('freyaTabletPaginationNumbers');

    if (!prevBtn || !nextBtn || !paginationNumbers) return;

    // Update prev/next buttons
    prevBtn.disabled = freyaTabletCurrentPage <= 1;
    nextBtn.disabled = freyaTabletCurrentPage >= freyaTabletTotalPages;
    
    // Update button classes
    prevBtn.className = `px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 ${freyaTabletCurrentPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`;
    nextBtn.className = `px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 ${freyaTabletCurrentPage >= freyaTabletTotalPages ? 'opacity-50 cursor-not-allowed' : ''}`;

    // Generate pagination numbers
    paginationNumbers.innerHTML = '';
    
    if (freyaTabletTotalPages <= 1) return;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, freyaTabletCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(freyaTabletTotalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page and ellipsis
    if (startPage > 1) {
        addFreyaTabletPageButton(paginationNumbers, 1);
        if (startPage > 2) {
            addFreyaTabletEllipsis(paginationNumbers);
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        addFreyaTabletPageButton(paginationNumbers, i);
    }

    // Ellipsis and last page
    if (endPage < freyaTabletTotalPages) {
        if (endPage < freyaTabletTotalPages - 1) {
            addFreyaTabletEllipsis(paginationNumbers);
        }
        addFreyaTabletPageButton(paginationNumbers, freyaTabletTotalPages);
    }
}

function addFreyaTabletPageButton(container, pageNum) {
    const button = document.createElement('button');
    button.textContent = pageNum;
    button.className = `px-3 py-1 border text-sm transition-colors ${
        pageNum === freyaTabletCurrentPage 
            ? 'bg-blue-600 text-white border-blue-600' 
            : 'border-gray-300 hover:bg-gray-50'
    }`;
    button.onclick = () => goToFreyaTabletPage(pageNum);
    container.appendChild(button);
}

function addFreyaTabletEllipsis(container) {
    const ellipsis = document.createElement('span');
    ellipsis.textContent = '...';
    ellipsis.className = 'px-2 text-gray-500';
    container.appendChild(ellipsis);
}

function goToFreyaTabletPage(pageNum) {
    if (pageNum >= 1 && pageNum <= freyaTabletTotalPages && pageNum !== freyaTabletCurrentPage) {
        freyaTabletCurrentPage = pageNum;
        loadFreyaTabletData(); // Reload data from server for new page
    }
}

// Export data to CSV
function exportFreyaTabletData() {
    if (freyaTabletFilteredData.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('No data to export', 'warning');
        }
        return;
    }

    try {
        // Define headers for pressDB structure
        const headers = [
            'Date',
            'Equipment (設備)',
            'Part Number (品番)',
            'Background Number (背番号)',
            'Worker Name',
            'Time Start',
            'Time End',
            'Total Quantity',
            'Process Quantity',
            'Total NG',
            'Cycle Time',
            'Material Lot (材料ロット)',
            'Work Order Number',
            'Comment'
        ];

        // Convert data to CSV format
        const csvContent = [
            headers.join(','),
            ...freyaTabletFilteredData.map(record => [
                record.Date || '',
                record.設備 || '',
                record.品番 || '',
                record.背番号 || '',
                record.Worker_Name || '',
                record.Time_start || '',
                record.Time_end || '',
                record.Total || '',
                record.Process_Quantity || '',
                record.Total_NG || '',
                record.Cycle_Time || '',
                (record.材料ロット || '').replace(/,/g, ';'), // Replace commas
                record.WorkOrder_Info?.workOrderNumber || '',
                (record.Comment || '').replace(/,/g, ';') // Replace commas in comments
            ].map(field => `"${field}"`).join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `freya_tablet_production_records_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (typeof showNotification === 'function') {
            showNotification('Data exported successfully', 'success');
        }
    } catch (error) {
        console.error('Export error:', error);
        if (typeof showNotification === 'function') {
            showNotification('Failed to export data', 'error');
        }
    }
}

// Close modals when clicking outside
document.addEventListener('click', function(event) {
    const detailModal = document.getElementById('freyaTabletDetailModal');
    const imageModal = document.getElementById('imageViewModal');
    
    if (detailModal && event.target === detailModal) {
        closeFreyaTabletModal();
    }
    
    if (imageModal && event.target === imageModal) {
        closeImageModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeFreyaTabletModal();
        closeImageModal();
    }
});
