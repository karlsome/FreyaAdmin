/**
 * Enhanced Approval System with Efficient Pagination
 * Uses the new pagination API for better performance
 */

// Enhanced approval system variables
let approvalPaginationManager = null;
let currentApprovalFilters = {};
let currentApprovalPage = 1;
let currentApprovalTab = 'kensaDB';

/**
 * Initialize the enhanced approval system with pagination
 */
function initializeEnhancedApprovalSystem() {
    console.log('Initializing enhanced approval system with pagination...');
    
    // Initialize pagination manager for approvals
    approvalPaginationManager = new PaginationManager({
        defaultPageSize: 15,
        onDataLoad: (result) => {
            console.log(`Loaded ${result.data.length} approval records`);
            renderApprovalData(result.data, result.pagination);
            updateApprovalStats(result.data);
            updateApprovalPaginationUI(result.pagination);
        },
        onError: (error) => {
            console.error('Approval data loading error:', error);
            showApprovalError(error.message);
        },
        onLoadingStart: () => {
            showApprovalLoading();
        },
        onLoadingEnd: () => {
            hideApprovalLoading();
        }
    });
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFilter').value = today;
    
    // Setup event listeners
    setupApprovalEventListeners();
    
    // Load initial data
    loadApprovalDataWithPagination();
}

/**
 * Setup event listeners for approval system
 */
function setupApprovalEventListeners() {
    document.getElementById('refreshBtn')?.addEventListener('click', loadApprovalDataWithPagination);
    document.getElementById('factoryFilter')?.addEventListener('change', applyApprovalFiltersWithPagination);
    document.getElementById('statusFilter')?.addEventListener('change', applyApprovalFiltersWithPagination);
    document.getElementById('dateFilter')?.addEventListener('change', applyApprovalFiltersWithPagination);
    document.getElementById('approvalSearchInput')?.addEventListener('input', debounce(applyApprovalFiltersWithPagination, 500));
    
    document.getElementById('itemsPerPageSelect')?.addEventListener('change', function() {
        approvalPaginationManager.defaultPageSize = parseInt(this.value);
        loadApprovalDataWithPagination();
    });
}

/**
 * Load approval data with efficient pagination
 */
async function loadApprovalDataWithPagination(page = 1) {
    const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userRole = currentUser.role || "guest";
    const factoryAccess = currentUser.factories || [];
    
    // Build query based on current filters
    const query = buildApprovalQuery();
    
    try {
        await approvalPaginationManager.loadData({
            useSpecializedApi: 'approval-paginate',
            collectionName: currentApprovalTab,
            query: query,
            userRole: userRole,
            factoryAccess: factoryAccess,
            page: page,
            limit: approvalPaginationManager.defaultPageSize
        });
    } catch (error) {
        console.error('Failed to load approval data:', error);
    }
}

/**
 * Build approval query based on current filters
 */
function buildApprovalQuery() {
    const factoryFilter = document.getElementById('factoryFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const dateFilter = document.getElementById('dateFilter')?.value || '';
    const searchTerm = document.getElementById('approvalSearchInput')?.value?.toLowerCase() || '';
    
    let query = {};
    
    // Factory filter
    if (factoryFilter) {
        query.工場 = factoryFilter;
    }
    
    // Date filter
    if (dateFilter) {
        query.Date = dateFilter;
    }
    
    // Status filter
    if (statusFilter) {
        if (statusFilter === 'pending') {
            query.$or = [
                { approvalStatus: { $exists: false } },
                { approvalStatus: 'pending' }
            ];
        } else {
            query.approvalStatus = statusFilter;
        }
    }
    
    // Search filter (品番, 背番号, Worker_Name)
    if (searchTerm) {
        query.$or = [
            { 品番: { $regex: searchTerm, $options: 'i' } },
            { 背番号: { $regex: searchTerm, $options: 'i' } },
            { Worker_Name: { $regex: searchTerm, $options: 'i' } }
        ];
    }
    
    return query;
}

/**
 * Apply filters with pagination
 */
function applyApprovalFiltersWithPagination() {
    currentApprovalPage = 1;
    loadApprovalDataWithPagination(1);
}

/**
 * Switch approval tabs with pagination
 */
window.switchApprovalTabWithPagination = function(tabName) {
    currentApprovalTab = tabName;
    updateTabStyles();
    currentApprovalPage = 1;
    approvalPaginationManager.reset();
    loadApprovalDataWithPagination(1);
};

/**
 * Render approval data in the UI
 */
function renderApprovalData(data, pagination) {
    const container = document.getElementById('approvalsTableContainer');
    
    if (!container) {
        console.warn('Approval container not found');
        return;
    }
    
    if (data.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="ri-inbox-line text-4xl text-gray-400 mb-4"></i>
                <h3 class="text-lg font-medium text-gray-900 mb-2">データがありません</h3>
                <p class="text-gray-500">条件に一致するデータが見つかりませんでした</p>
            </div>
        `;
        return;
    }
    
    // Get columns based on current tab
    const columns = getTableColumns(currentApprovalTab);
    
    const tableHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b">
                    <tr>
                        <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('approvalStatus')">
                            状態
                        </th>
                        <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('Date')">
                            日付・時間
                        </th>
                        <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('工場')">
                            工場
                        </th>
                        <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('品番')">
                            品番
                        </th>
                        <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('背番号')">
                            背番号
                        </th>
                        <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('Worker_Name')">
                            作業者
                        </th>
                        <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('${getQuantityField(currentApprovalTab)}')">
                            数量
                        </th>
                        <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('${getNGField(currentApprovalTab)}')">
                            NG
                        </th>
                        <th class="px-4 py-3 text-left font-medium text-gray-700">不良率</th>
                        <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('approvedBy')">
                            承認者
                        </th>
                        <th class="px-4 py-3 text-left font-medium text-gray-700">操作</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${data.map((item, index) => {
                        const statusInfo = getStatusInfo(item);
                        const quantityField = getQuantityField(currentApprovalTab);
                        const ngField = getNGField(currentApprovalTab);
                        const quantity = item[quantityField] || 0;
                        const ngCount = item[ngField] || 0;
                        const defectRate = quantity > 0 ? ((ngCount / quantity) * 100).toFixed(2) : '0.00';
                        
                        return `
                            <tr class="hover:bg-gray-50 ${statusInfo.rowClass}">
                                <td class="px-4 py-3">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.badgeClass}">
                                        <i class="${statusInfo.icon} mr-1"></i>
                                        ${statusInfo.text}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-gray-900">
                                    <div class="font-medium">${item.Date || '-'}</div>
                                    <div class="text-xs text-gray-500">${item.Time_start || '-'} - ${item.Time_end || '-'}</div>
                                </td>
                                <td class="px-4 py-3 text-gray-900">${item.工場 || '-'}</td>
                                <td class="px-4 py-3 font-medium text-gray-900">${item.品番 || '-'}</td>
                                <td class="px-4 py-3 text-gray-900">${item.背番号 || '-'}</td>
                                <td class="px-4 py-3 text-gray-900">${item.Worker_Name || '-'}</td>
                                <td class="px-4 py-3 text-gray-900 font-medium">${quantity.toLocaleString()}</td>
                                <td class="px-4 py-3 text-red-600 font-medium">${ngCount}</td>
                                <td class="px-4 py-3">
                                    <span class="font-medium ${parseFloat(defectRate) > 0 ? 'text-red-600' : 'text-green-600'}">
                                        ${defectRate}%
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-gray-900">${item.approvedBy || '-'}</td>
                                <td class="px-4 py-3">
                                    <button 
                                        onclick="openApprovalDetail('${item._id}')"
                                        class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                        詳細
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
}

/**
 * Update approval statistics
 */
function updateApprovalStats(data) {
    const pending = data.filter(item => !item.approvalStatus || item.approvalStatus === 'pending').length;
    const hanchoApproved = data.filter(item => item.approvalStatus === 'hancho_approved').length;
    const fullyApproved = data.filter(item => item.approvalStatus === 'fully_approved').length;
    const correction = data.filter(item => 
        item.approvalStatus === 'correction_needed' || item.approvalStatus === 'correction_needed_from_kacho'
    ).length;
    
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('hanchoApprovedCount').textContent = hanchoApproved;
    document.getElementById('fullyApprovedCount').textContent = fullyApproved;
    document.getElementById('correctionCount').textContent = correction;
}

/**
 * Update pagination UI
 */
function updateApprovalPaginationUI(pagination) {
    const paginationContainer = document.getElementById('approvalPaginationContainer');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = approvalPaginationManager.generatePaginationHTML({
        showPageNumbers: true,
        showFirstLast: true,
        showInfo: true
    });
}

/**
 * Show loading state
 */
function showApprovalLoading() {
    const container = document.getElementById('approvalsTableContainer');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="ri-loader-4-line animate-spin text-3xl text-blue-500 mb-4"></i>
                <div class="text-gray-600">データを読み込み中...</div>
            </div>
        `;
    }
}

/**
 * Hide loading state
 */
function hideApprovalLoading() {
    // Loading will be replaced by data or error message
}

/**
 * Show error message
 */
function showApprovalError(message) {
    const container = document.getElementById('approvalsTableContainer');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="ri-error-warning-line text-3xl text-red-500 mb-4"></i>
                <div class="text-red-600 font-medium mb-2">データの読み込みに失敗しました</div>
                <div class="text-gray-600 text-sm">${message}</div>
                <button 
                    onclick="loadApprovalDataWithPagination()"
                    class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    再試行
                </button>
            </div>
        `;
    }
}

/**
 * Debounce function for search input
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Make pagination functions globally available
 */
window.paginationManager = approvalPaginationManager;

/**
 * Initialize when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the approvals page
    if (document.getElementById('approvalsTableContainer')) {
        // Initialize enhanced approval system when the script loads
        if (typeof PaginationManager !== 'undefined') {
            initializeEnhancedApprovalSystem();
        } else {
            // Wait for pagination manager to load
            const checkPagination = setInterval(() => {
                if (typeof PaginationManager !== 'undefined') {
                    clearInterval(checkPagination);
                    initializeEnhancedApprovalSystem();
                }
            }, 100);
        }
    }
});

// Export functions for global access
window.loadApprovalDataWithPagination = loadApprovalDataWithPagination;
window.switchApprovalTabWithPagination = switchApprovalTabWithPagination;
window.applyApprovalFiltersWithPagination = applyApprovalFiltersWithPagination;
