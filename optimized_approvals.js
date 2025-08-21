/**
 * Optimized Approval System - Efficient Data Loading
 * This replaces the inefficient loadApprovalData() function in app.js
 * 
 * Key improvements:
 * 1. Load statistics separately using MongoDB aggregation
 * 2. Only load actual table data when needed (paginated)
 * 3. Separate factory list loading
 * 4. Much faster performance for large datasets
 */

// Global variables for optimized approval system
let currentApprovalPage = 1;
let itemsPerPage = 15;  // Default to 15 per page as requested
let approvalSortState = { column: null, direction: 1 };
let currentApprovalTab = 'kensaDB'; // Default tab
let currentApprovalFilters = {};
let currentUserData = {};

/**
 * Initialize the optimized approval system
 */
function initializeOptimizedApprovalSystem() {
    // Get current user data
    currentUserData = JSON.parse(localStorage.getItem("authUser") || "{}");
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFilter').value = today;
    
    // Event listeners
    document.getElementById('refreshBtn').addEventListener('click', refreshApprovalData);
    document.getElementById('factoryFilter').addEventListener('change', applyApprovalFilters);
    document.getElementById('statusFilter').addEventListener('change', applyApprovalFilters);
    document.getElementById('dateFilter').addEventListener('change', applyApprovalFilters);
    document.getElementById('approvalSearchInput').addEventListener('input', applyApprovalFilters);
    document.getElementById('itemsPerPageSelect').addEventListener('change', function() {
        itemsPerPage = parseInt(this.value);
        currentApprovalPage = 1;
        loadApprovalTableData();
    });
    document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));
    
    // Initialize tab styles
    updateTabStyles();
    
    // Load initial data
    refreshApprovalData();
}

/**
 * Switch between approval tabs
 */
window.switchApprovalTab = function(tabName) {
    currentApprovalTab = tabName;
    updateTabStyles();
    refreshApprovalData();
};

/**
 * Refresh all approval data (statistics + table + factories)
 */
async function refreshApprovalData() {
    console.log('🔄 Refreshing approval data for tab:', currentApprovalTab);
    
    try {
        // Show loading state
        showLoadingState();
        
        // Load data in parallel for better performance
        await Promise.all([
            loadApprovalStatistics(),
            loadFactoryList(),
            loadApprovalTableData()
        ]);
        
        console.log('✅ Approval data refresh completed');
        
    } catch (error) {
        console.error('❌ Error refreshing approval data:', error);
        showErrorState(error.message);
    }
}

/**
 * Load approval statistics efficiently using server-side aggregation
 */
async function loadApprovalStatistics() {
    try {
        // Ensure we have complete user data
        if ((currentUserData.role === '班長' || currentUserData.role === '係長') && 
            (!currentUserData.工場 && !currentUserData.factory)) {
            console.log('Factory info missing, fetching from database...');
            currentUserData = await fetchCompleteUserData(currentUserData.username);
        }

        // Determine factory access
        const factoryAccess = getFactoryAccessForUser();
        
        // Build filters for statistics
        const filters = buildQueryFilters();

        console.log('📊 Loading approval statistics...');

        const response = await fetch('/api/approval-stats', {
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load statistics');
        }

        console.log('✅ Statistics loaded:', result.statistics);
        
        // Update statistics display
        updateStatisticsDisplay(result.statistics);
        
    } catch (error) {
        console.error('❌ Error loading approval statistics:', error);
        // Show error in statistics cards
        document.querySelectorAll('[id$="Count"]').forEach(element => {
            element.textContent = '?';
            element.parentElement.classList.add('opacity-50');
        });
    }
}

/**
 * Load factory list for filter dropdown
 */
async function loadFactoryList() {
    try {
        // Determine factory access
        const factoryAccess = getFactoryAccessForUser();

        console.log('🏭 Loading factory list...');

        const response = await fetch('/api/approval-factories', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                collectionName: currentApprovalTab,
                userRole: currentUserData.role,
                factoryAccess: factoryAccess
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load factory list');
        }

        console.log('✅ Factory list loaded:', result.factories);
        
        // Update factory filter dropdown
        updateFactoryFilterOptions(result.factories);
        
    } catch (error) {
        console.error('❌ Error loading factory list:', error);
        // Fallback to basic factory filter
        const factoryFilter = document.getElementById('factoryFilter');
        factoryFilter.innerHTML = '<option value="" data-i18n="allFactories">All Factories</option>';
    }
}

/**
 * Load paginated approval table data
 */
async function loadApprovalTableData() {
    try {
        // Determine factory access
        const factoryAccess = getFactoryAccessForUser();
        
        // Build filters for table data
        const filters = buildQueryFilters();

        console.log(`📄 Loading approval table data: Page ${currentApprovalPage}, Limit ${itemsPerPage}`);

        const response = await fetch('/api/approval-paginate', {
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load table data');
        }

        console.log(`✅ Table data loaded: ${result.data.length} items, Page ${result.pagination.currentPage}/${result.pagination.totalPages}`);
        
        // Update table display
        renderApprovalTable(result.data, result.pagination);
        
    } catch (error) {
        console.error('❌ Error loading approval table data:', error);
        const container = document.getElementById('approvalsTableContainer');
        container.innerHTML = '<div class="p-8 text-center text-red-500">テーブルデータの読み込みに失敗しました</div>';
    }
}

/**
 * Get factory access for current user
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
 * Build query filters based on current filter settings
 */
function buildQueryFilters() {
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
        } else {
            filters.approvalStatus = statusFilter;
        }
    }
    
    // Date filter
    const dateFilter = document.getElementById('dateFilter')?.value;
    if (dateFilter) {
        filters.Date = dateFilter;
    }
    
    // Search filter
    const searchTerm = document.getElementById('approvalSearchInput')?.value?.toLowerCase();
    if (searchTerm) {
        filters.$or = [
            { 品番: { $regex: searchTerm, $options: 'i' } },
            { 背番号: { $regex: searchTerm, $options: 'i' } },
            { Worker_Name: { $regex: searchTerm, $options: 'i' } }
        ];
    }
    
    console.log('🔍 Built query filters:', filters);
    return filters;
}

/**
 * Update statistics display in the cards
 */
function updateStatisticsDisplay(statistics) {
    document.getElementById('pendingCount').textContent = statistics.pending || 0;
    document.getElementById('hanchoApprovedCount').textContent = statistics.hanchoApproved || 0;
    document.getElementById('fullyApprovedCount').textContent = statistics.fullyApproved || 0;
    document.getElementById('correctionCount').textContent = statistics.correctionNeeded || 0;
    document.getElementById('totalCount').textContent = statistics.todayTotal || 0;
    
    // Update 班長-specific card if it exists
    if (currentUserData.role === '班長') {
        const kachoRequestElement = document.getElementById('kachoRequestCount');
        if (kachoRequestElement) {
            kachoRequestElement.textContent = statistics.correctionNeededFromKacho || 0;
        }
    }
    
    // Remove loading opacity
    document.querySelectorAll('[id$="Count"]').forEach(element => {
        element.parentElement.classList.remove('opacity-50');
    });
}

/**
 * Update factory filter dropdown options
 */
function updateFactoryFilterOptions(factories) {
    const factoryFilter = document.getElementById('factoryFilter');
    const currentValue = factoryFilter.value;
    
    factoryFilter.innerHTML = '<option value="" data-i18n="allFactories">All Factories</option>';
    
    factories.forEach(factory => {
        const option = document.createElement('option');
        option.value = factory;
        option.textContent = factory;
        if (factory === currentValue) {
            option.selected = true;
        }
        factoryFilter.appendChild(option);
    });
}

/**
 * Apply filters and reload data
 */
function applyApprovalFilters() {
    console.log('🔍 Applying filters...');
    currentApprovalPage = 1; // Reset to first page
    
    // Reload both statistics and table data
    Promise.all([
        loadApprovalStatistics(),
        loadApprovalTableData()
    ]).catch(error => {
        console.error('❌ Error applying filters:', error);
    });
}

/**
 * Change page
 */
function changePage(direction) {
    const newPage = currentApprovalPage + direction;
    if (newPage >= 1) {
        currentApprovalPage = newPage;
        loadApprovalTableData();
    }
}

/**
 * Go to specific page
 */
function goToPage(page) {
    if (page >= 1) {
        currentApprovalPage = page;
        loadApprovalTableData();
    }
}

/**
 * Filter by status when clicking on stat cards
 */
window.filterByStatus = function(status) {
    const statusFilter = document.getElementById('statusFilter');
    
    if (status === 'today') {
        statusFilter.value = 'today';
    } else if (status === 'pending') {
        statusFilter.value = 'pending';
    } else {
        statusFilter.value = status;
    }
    
    // Apply filters
    applyApprovalFilters();
};

/**
 * Show loading state
 */
function showLoadingState() {
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
 * Show error state
 */
function showErrorState(errorMessage) {
    const container = document.getElementById('approvalsTableContainer');
    container.innerHTML = `<div class="p-8 text-center text-red-500">
        <i class="ri-error-warning-line text-2xl mr-2"></i>
        エラー: ${errorMessage}
        <br><button class="mt-2 text-blue-500 hover:underline" onclick="refreshApprovalData()">再試行</button>
    </div>`;
}

/**
 * Render the approval table with paginated data
 */
function renderApprovalTable(data, pagination) {
    const container = document.getElementById('approvalsTableContainer');
    
    if (data.length === 0) {
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
                ${data.map((item, index) => {
                    const quantityField = getQuantityField(currentApprovalTab);
                    const ngField = getNGField(currentApprovalTab);
                    const quantity = item[quantityField] || 0;
                    const ngCount = item[ngField] || 0;
                    const defectRate = quantity > 0 ? ((ngCount / quantity) * 100).toFixed(2) : '0.00';
                    const statusInfo = getStatusInfo(item);
                    
                    return `
                        <tr class="${statusInfo.rowClass} border-b hover:bg-gray-50 cursor-pointer" 
                            onclick="openApprovalDetail('${item._id}')">
                            <td class="px-4 py-3">
                                <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${statusInfo.badgeClass}">
                                    <i class="${statusInfo.icon} mr-1"></i>
                                    ${statusInfo.text}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <div class="font-medium">${item.Date}</div>
                                <div class="text-gray-500 text-xs">${item.Time_start || '--:--'}</div>
                            </td>
                            <td class="px-4 py-3">${item.工場 || '-'}</td>
                            <td class="px-4 py-3 font-mono text-sm">${item.品番 || '-'}</td>
                            <td class="px-4 py-3">${item.背番号 || '-'}</td>
                            <td class="px-4 py-3">${item.Worker_Name || '-'}</td>
                            <td class="px-4 py-3 font-medium">${quantity}</td>
                            <td class="px-4 py-3 ${ngCount > 0 ? 'text-red-600 font-medium' : ''}">${ngCount}</td>
                            <td class="px-4 py-3 ${parseFloat(defectRate) > 5 ? 'text-red-600 font-medium' : ''}">${defectRate}%</td>
                            <td class="px-4 py-3 text-xs">${item.approvedBy || item.hanchoApprovedBy || '-'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
    updatePagination(pagination.totalRecords, pagination);
}

/**
 * Update pagination controls
 */
function updatePagination(totalItems, paginationInfo) {
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

    const currentPage = paginationInfo.currentPage;
    const totalPages = paginationInfo.totalPages;
    const startItem = paginationInfo.startIndex;
    const endItem = paginationInfo.endIndex;

    pageInfo.textContent = `${totalItems}件中 ${startItem}-${endItem}件を表示`;

    // Generate page numbers
    pageNumbers.innerHTML = '';
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.className = `px-3 py-1 text-sm rounded ${
            i === currentPage
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`;
        button.onclick = () => goToPage(i);
        pageNumbers.appendChild(button);
    }

    prevBtn.disabled = !paginationInfo.hasPrevious;
    nextBtn.disabled = !paginationInfo.hasNext;
}

// Export the initialization function to replace the old one
window.initializeApprovalSystem = initializeOptimizedApprovalSystem;

console.log('✅ Optimized approval system loaded');
