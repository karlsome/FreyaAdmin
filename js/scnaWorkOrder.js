// ==================== SCNA WORK ORDER MANAGEMENT SYSTEM ====================



let currentWorkOrderPage = 1;
let workOrderItemsPerPage = 10;
let totalWorkOrderPages = 1;
let totalWorkOrderItems = 0;
let allWorkOrderData = [];
let filteredWorkOrderData = [];
let workOrderSortState = { column: null, direction: 1 };
let workOrderStatistics = {};

/**
 * Initialize the Work Order system with enhanced modal support
 */
function initializeWorkOrderSystem() {
    console.log('🚀 Initializing SCNA Work Order System with enhanced modals');
    
    // Initialize modal stack manager if not already available
    if (typeof window.modalStackManager === 'undefined') {
        console.log('🔑 Initializing modal stack manager...');
        // Load the modal stack manager
        loadModalStackManager();
    }
    
    // Set default deadline range (from 30 days ago to 30 days in the future)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    document.getElementById('workOrderDateFrom').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('workOrderDateTo').value = thirtyDaysFromNow.toISOString().split('T')[0];
    
    // Event listeners
    document.getElementById('refreshWorkOrderBtn').addEventListener('click', loadWorkOrderData);
    document.getElementById('workOrderStatusFilter').addEventListener('change', applyWorkOrderFilters);
    document.getElementById('workOrderCustomerFilter').addEventListener('change', applyWorkOrderFilters);
    document.getElementById('workOrderAssignFilter').addEventListener('change', applyWorkOrderFilters);
    document.getElementById('workOrderDateFrom').addEventListener('change', applyWorkOrderFilters);
    document.getElementById('workOrderDateTo').addEventListener('change', applyWorkOrderFilters);
    document.getElementById('workOrderSearchInput').addEventListener('input', applyWorkOrderFilters);
    document.getElementById('workOrderItemsPerPage').addEventListener('change', function() {
        workOrderItemsPerPage = parseInt(this.value);
        currentWorkOrderPage = 1;
        loadWorkOrderData(); // Reload data from server with new page size
    });
    document.getElementById('workOrderPrevPage').addEventListener('click', () => changeWorkOrderPage(-1));
    document.getElementById('workOrderNextPage').addEventListener('click', () => changeWorkOrderPage(1));
    
    // Load initial data
    loadWorkOrderData();
}

/**
 * Load work order data from server
 */
async function loadWorkOrderData() {
    try {
        showWorkOrderLoadingState();
        
        console.log('📡 Loading work order data...');
        
        const filters = buildWorkOrderQueryFilters();
        const response = await fetch(`${BASE_URL}api/workorders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getWorkOrders',
                filters: filters,
                page: currentWorkOrderPage,
                limit: workOrderItemsPerPage,
                sort: workOrderSortState
            })
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }

        const response_data = await response.json();
        
        // Handle the structured response from server
        if (response_data.success && Array.isArray(response_data.data)) {
            allWorkOrderData = response_data.data;
            filteredWorkOrderData = response_data.data;
            
            // Use statistics from server if available, otherwise calculate from data
            if (response_data.statistics) {
                workOrderStatistics = response_data.statistics;
            } else {
                workOrderStatistics = calculateWorkOrderStatisticsFromData(response_data.data);
            }
            
            // Store pagination info
            if (response_data.pagination) {
                totalWorkOrderPages = response_data.pagination.totalPages;
                totalWorkOrderItems = response_data.pagination.totalItems;
            }
            
            console.log('✅ Work order data loaded:', {
                total: allWorkOrderData.length,
                statistics: workOrderStatistics,
                pagination: response_data.pagination
            });
            
            updateWorkOrderStatisticsDisplay();
            loadWorkOrderFilterOptions();
            renderWorkOrderTable();
        } else {
            throw new Error('Invalid data format received from server: ' + JSON.stringify(response_data));
        }
        
    } catch (error) {
        console.error('❌ Error loading work order data:', error);
        showWorkOrderErrorState(error.message);
    }
}

/**
 * Build query filters from UI controls
 */
function buildWorkOrderQueryFilters() {
    const filters = {};
    
    // Status filter
    const statusFilter = document.getElementById('workOrderStatusFilter')?.value;
    if (statusFilter) {
        filters.Status = statusFilter;
    }
    
    // Customer filter
    const customerFilter = document.getElementById('workOrderCustomerFilter')?.value;
    if (customerFilter) {
        filters['Customer-Custom fields'] = customerFilter;
    }
    
    // Assign filter
    const assignFilter = document.getElementById('workOrderAssignFilter')?.value;
    if (assignFilter) {
        filters['Assign to-Custom fields'] = assignFilter;
    }
    
    // Date range filter
    const dateFrom = document.getElementById('workOrderDateFrom')?.value;
    const dateTo = document.getElementById('workOrderDateTo')?.value;
    
    if (dateFrom || dateTo) {
        filters.dateRange = {};
        if (dateFrom) filters.dateRange.from = dateFrom;
        if (dateTo) filters.dateRange.to = dateTo;
    }
    
    // Search filter
    const searchTerm = document.getElementById('workOrderSearchInput')?.value?.toLowerCase();
    if (searchTerm) {
        filters.search = searchTerm;
    }
    
    console.log('🔍 Built work order query filters:', filters);
    
    // Debug: Log the actual date values being sent
    if (filters.dateRange) {
        console.log('📅 Date range details:', {
            fromInput: dateFrom,
            toInput: dateTo,
            fromParsed: filters.dateRange.from,
            toParsed: filters.dateRange.to,
            fromDate: new Date(filters.dateRange.from),
            toDate: new Date(filters.dateRange.to)
        });
    }
    
    return filters;
}

/**
 * Calculate statistics from work order data
 */
function calculateWorkOrderStatisticsFromData(data) {
    const now = new Date();
    
    const statistics = {
        total: data.length,
        entered: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0
    };
    
    data.forEach(order => {
        // Count by status
        switch (order.Status) {
            case 'Entered':
                statistics.entered++;
                break;
            case 'In Progress':
                statistics.inProgress++;
                break;
            case 'Completed':
                statistics.completed++;
                break;
            case 'Cancelled':
                statistics.cancelled++;
                break;
        }
        
        // Count overdue orders
        if (order.Deadline && order.Status !== 'Completed' && order.Status !== 'Cancelled') {
            const deadlineDate = new Date(order.Deadline);
            if (deadlineDate < now) {
                statistics.overdue++;
            }
        }
    });
    
    return statistics;
}

/**
 * Load filter options for dropdowns
 */
async function loadWorkOrderFilterOptions() {
    try {
        // Extract unique values from loaded data
        const customers = [...new Set(allWorkOrderData.map(item => item['Customer-Custom fields']).filter(Boolean))];
        const assignees = [...new Set(allWorkOrderData.map(item => item['Assign to-Custom fields']).filter(Boolean))];
        
        // Update customer filter
        const customerFilter = document.getElementById('workOrderCustomerFilter');
        const currentCustomer = customerFilter.value;
        customerFilter.innerHTML = '<option value="" data-i18n="allCustomers">All Customers</option>';
        customers.forEach(customer => {
            customerFilter.innerHTML += `<option value="${customer}">${customer}</option>`;
        });
        customerFilter.value = currentCustomer;
        
        // Update assignee filter
        const assignFilter = document.getElementById('workOrderAssignFilter');
        const currentAssign = assignFilter.value;
        assignFilter.innerHTML = '<option value="" data-i18n="allAssignees">All Assignees</option>';
        assignees.forEach(assignee => {
            assignFilter.innerHTML += `<option value="${assignee}">${assignee}</option>`;
        });
        assignFilter.value = currentAssign;
        
    } catch (error) {
        console.error('❌ Error loading filter options:', error);
    }
}

/**
 * Update statistics display
 */
function updateWorkOrderStatisticsDisplay() {
    document.getElementById('totalWorkOrders').textContent = workOrderStatistics.total || 0;
    document.getElementById('inProgressOrders').textContent = workOrderStatistics.inProgress || 0;
    document.getElementById('completedOrders').textContent = workOrderStatistics.completed || 0;
    document.getElementById('overdueOrders').textContent = workOrderStatistics.overdue || 0;
}

/**
 * Show loading state
 */
function showWorkOrderLoadingState() {
    const container = document.getElementById('workOrdersTableContainer');
    container.innerHTML = '<div class="p-8 text-center text-gray-500"><i class="ri-loader-4-line animate-spin text-2xl mr-2"></i>Loading work orders...</div>';
    
    // Add loading state to statistics
    document.querySelectorAll('[id*="Orders"]').forEach(element => {
        element.textContent = '-';
    });
}

/**
 * Show error state
 */
function showWorkOrderErrorState(errorMessage) {
    const container = document.getElementById('workOrdersTableContainer');
    container.innerHTML = `<div class="p-8 text-center text-red-500">
        <i class="ri-error-warning-line text-2xl mr-2"></i>
        Error: ${errorMessage}
        <br><button class="mt-2 text-blue-500 hover:underline" onclick="loadWorkOrderData()">Retry</button>
    </div>`;
}

/**
 * Apply filters to work order data
 */
function applyWorkOrderFilters() {
    console.log('🔍 Applying work order filters...');
    currentWorkOrderPage = 1;
    loadWorkOrderData();
}

/**
 * Render work order table
 */
function renderWorkOrderTable() {
    const container = document.getElementById('workOrdersTableContainer');
    
    if (filteredWorkOrderData.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-gray-500">No work orders found</div>';
        updateWorkOrderPagination(0);
        return;
    }

    // For server-side pagination, use the data directly without slicing
    // The server already sent us the correct page data
    const pageData = filteredWorkOrderData;

    const table = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th onclick="sortWorkOrderTable('Number')" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                        Work Order # ${getSortArrow('Number')}
                    </th>
                    <th onclick="sortWorkOrderTable('Status')" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                        Status ${getSortArrow('Status')}
                    </th>
                    <th onclick="sortWorkOrderTable('Customer-Custom fields')" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                        Customer ${getSortArrow('Customer-Custom fields')}
                    </th>
                    <th onclick="sortWorkOrderTable('P_SKU-Custom fields')" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                        Product SKU ${getSortArrow('P_SKU-Custom fields')}
                    </th>
                    <th onclick="sortWorkOrderTable('Assign to-Custom fields')" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                        Assigned To ${getSortArrow('Assign to-Custom fields')}
                    </th>
                    <th onclick="sortWorkOrderTable('Estimated cost')" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                        Cost ${getSortArrow('Estimated cost')}
                    </th>
                    <th onclick="sortWorkOrderTable('Deadline')" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                        Deadline ${getSortArrow('Deadline')}
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                    </th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${pageData.map(item => createWorkOrderRow(item)).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = table;
    
    // Use total items from server for pagination, not local data length
    updateWorkOrderPagination(totalWorkOrderItems);
}

/**
 * Create individual work order table row
 */
function createWorkOrderRow(item) {
    const statusColor = getStatusColor(item.Status);
    const deadlineStatus = getDeadlineStatus(item.Deadline);
    const formattedCost = item['Estimated cost'] ? `$${parseFloat(item['Estimated cost']).toFixed(2)}` : 'N/A';
    const formattedDeadline = item.Deadline ? new Date(item.Deadline).toLocaleDateString() : 'N/A';
    
    return `
        <tr class="hover:bg-gray-50 cursor-pointer" onclick="openWorkOrderDetail('${item._id}')">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${item.Number || 'N/A'}</div>
                <div class="text-sm text-gray-500">${item.Owner || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">
                    ${item.Status || 'Unknown'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${item['Customer-Custom fields'] || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${item['P_SKU-Custom fields'] || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${item['Assign to-Custom fields'] || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${formattedCost}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 ${deadlineStatus.class}">${formattedDeadline}</div>
                ${deadlineStatus.badge}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium" onclick="event.stopPropagation()">
                <button onclick="editWorkOrder('${item._id}')" class="text-green-600 hover:text-green-900">
                    <i class="ri-edit-line"></i> Edit
                </button>
            </td>
        </tr>
    `;
}

/**
 * Get status color classes
 */
function getStatusColor(status) {
    switch (status) {
        case 'Entered':
            return 'bg-yellow-100 text-yellow-800';
        case 'In Progress':
            return 'bg-blue-100 text-blue-800';
        case 'Completed':
            return 'bg-green-100 text-green-800';
        case 'Cancelled':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

/**
 * Get deadline status
 */
function getDeadlineStatus(deadline) {
    if (!deadline) return { class: '', badge: '' };
    
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return {
            class: 'text-red-600',
            badge: '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 ml-2">Overdue</span>'
        };
    } else if (diffDays <= 3) {
        return {
            class: 'text-orange-600',
            badge: '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 ml-2">Due Soon</span>'
        };
    }
    
    return { class: '', badge: '' };
}

/**
 * Sort work order table
 */
window.sortWorkOrderTable = function(column) {
    if (workOrderSortState.column === column) {
        workOrderSortState.direction *= -1;
    } else {
        workOrderSortState.column = column;
        workOrderSortState.direction = 1;
    }
    
    filteredWorkOrderData.sort((a, b) => {
        let aVal = a[column] || '';
        let bVal = b[column] || '';
        
        // Handle different data types
        if (column === 'Estimated cost') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
        } else if (column === 'Deadline' || column === 'Date and time') {
            aVal = new Date(aVal) || new Date(0);
            bVal = new Date(bVal) || new Date(0);
        } else {
            aVal = aVal.toString().toLowerCase();
            bVal = bVal.toString().toLowerCase();
        }
        
        if (aVal < bVal) return -1 * workOrderSortState.direction;
        if (aVal > bVal) return 1 * workOrderSortState.direction;
        return 0;
    });
    
    currentWorkOrderPage = 1;
    renderWorkOrderTable();
};

/**
 * Get sort arrow for column headers
 */
function getSortArrow(column) {
    if (workOrderSortState.column !== column) {
        return '<i class="ri-expand-up-down-line text-gray-400 ml-1"></i>';
    }
    
    return workOrderSortState.direction === 1 
        ? '<i class="ri-arrow-up-line text-blue-500 ml-1"></i>' 
        : '<i class="ri-arrow-down-line text-blue-500 ml-1"></i>';
}

/**
 * Update pagination controls with numbered buttons
 */
function updateWorkOrderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / workOrderItemsPerPage);
    const prevBtn = document.getElementById('workOrderPrevPage');
    const nextBtn = document.getElementById('workOrderNextPage');
    const paginationContainer = document.getElementById('workOrderPaginationNumbers');
    
    // Update prev/next button states
    prevBtn.disabled = currentWorkOrderPage <= 1;
    nextBtn.disabled = currentWorkOrderPage >= totalPages;
    
    prevBtn.classList.toggle('opacity-50', currentWorkOrderPage <= 1);
    nextBtn.classList.toggle('opacity-50', currentWorkOrderPage >= totalPages);
    
    // Generate numbered pagination buttons
    generateWorkOrderPaginationNumbers(totalPages, paginationContainer);
}

/**
 * Generate numbered pagination buttons
 */
function generateWorkOrderPaginationNumbers(totalPages, container) {
    let paginationHtml = '';
    
    // Calculate which pages to show
    const maxVisiblePages = 7; // Show up to 7 page numbers
    let startPage = 1;
    let endPage = totalPages;
    
    if (totalPages > maxVisiblePages) {
        const halfVisible = Math.floor(maxVisiblePages / 2);
        
        if (currentWorkOrderPage <= halfVisible + 1) {
            // Near the beginning
            endPage = maxVisiblePages - 1;
        } else if (currentWorkOrderPage >= totalPages - halfVisible) {
            // Near the end
            startPage = totalPages - maxVisiblePages + 2;
        } else {
            // In the middle
            startPage = currentWorkOrderPage - halfVisible;
            endPage = currentWorkOrderPage + halfVisible;
        }
    }
    
    // First page (always show if not already visible)
    if (startPage > 1) {
        paginationHtml += `
            <button onclick="goToWorkOrderPage(1)" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 ${currentWorkOrderPage === 1 ? 'bg-blue-500 text-white border-blue-500' : ''}">
                1
            </button>
        `;
        
        if (startPage > 2) {
            paginationHtml += `<span class="px-2 text-gray-400">...</span>`;
        }
    }
    
    // Generate visible page numbers
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentWorkOrderPage;
        paginationHtml += `
            <button onclick="goToWorkOrderPage(${i})" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 ${isActive ? 'bg-blue-500 text-white border-blue-500' : ''}">
                ${i}
            </button>
        `;
    }
    
    // Last page (always show if not already visible)
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += `<span class="px-2 text-gray-400">...</span>`;
        }
        
        paginationHtml += `
            <button onclick="goToWorkOrderPage(${totalPages})" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 ${currentWorkOrderPage === totalPages ? 'bg-blue-500 text-white border-blue-500' : ''}">
                ${totalPages}
            </button>
        `;
    }
    
    container.innerHTML = paginationHtml;
}

/**
 * Go to specific page
 */
window.goToWorkOrderPage = function(pageNumber) {
    if (pageNumber >= 1 && pageNumber <= totalWorkOrderPages && pageNumber !== currentWorkOrderPage) {
        currentWorkOrderPage = pageNumber;
        loadWorkOrderData();
    }
};

/**
 * Change page
 */
function changeWorkOrderPage(direction) {
    const newPage = currentWorkOrderPage + direction;
    
    if (newPage >= 1 && newPage <= totalWorkOrderPages) {
        currentWorkOrderPage = newPage;
        // Reload data from server for the new page
        loadWorkOrderData();
    }
}

/**
 * Open work order detail modal
 */
window.openWorkOrderDetail = async function(workOrderId) {
    try {
        const workOrder = allWorkOrderData.find(item => item._id === workOrderId);
        if (!workOrder) {
            console.error('Work order not found:', workOrderId);
            return;
        }
        
        const modal = document.getElementById('workOrderDetailModal');
        const content = document.getElementById('workOrderDetailContent');
        
        const statusColor = getStatusColor(workOrder.Status);
        const deadlineStatus = getDeadlineStatus(workOrder.Deadline);
        const formattedCost = workOrder['Estimated cost'] ? `$${parseFloat(workOrder['Estimated cost']).toFixed(2)}` : 'N/A';
        const formattedDeadline = workOrder.Deadline ? new Date(workOrder.Deadline).toLocaleDateString() : 'N/A';
        const formattedDateTime = workOrder['Date and time'] ? new Date(workOrder['Date and time']).toLocaleString() : 'N/A';
        
        content.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Work Order Number</label>
                        <p class="text-lg font-semibold text-gray-900">${workOrder.Number || 'N/A'}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Status</label>
                        <span class="inline-flex px-2 py-1 text-sm font-semibold rounded-full ${statusColor}">
                            ${workOrder.Status || 'Unknown'}
                        </span>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Customer</label>
                        <p class="text-gray-900">${workOrder['Customer-Custom fields'] || 'N/A'}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Product SKU</label>
                        <p class="text-gray-900">${workOrder['P_SKU-Custom fields'] || 'N/A'}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Assigned To</label>
                        <p class="text-gray-900">${workOrder['Assign to-Custom fields'] || 'N/A'}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Owner</label>
                        <p class="text-gray-900">${workOrder.Owner || 'N/A'}</p>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Created Date & Time</label>
                        <p class="text-gray-900">${formattedDateTime}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Deadline</label>
                        <p class="text-gray-900 ${deadlineStatus.class}">${formattedDeadline} ${deadlineStatus.badge}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Estimated Cost</label>
                        <p class="text-lg font-semibold text-gray-900">${formattedCost}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Quantity Status</label>
                        <p class="text-gray-900">${workOrder['Quantity status'] || 'N/A'}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Time Track</label>
                        <p class="text-gray-900">${workOrder['Time track'] || 'N/A'}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Material Loading (%)</label>
                        <div class="flex items-center">
                            <div class="w-full bg-gray-200 rounded-full h-2.5">
                                <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${workOrder['Material loading (%)'] || 0}%"></div>
                            </div>
                            <span class="ml-2 text-sm text-gray-600">${workOrder['Material loading (%)'] || 0}%</span>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Finished Goods Note (%)</label>
                        <div class="flex items-center">
                            <div class="w-full bg-gray-200 rounded-full h-2.5">
                                <div class="bg-green-600 h-2.5 rounded-full" style="width: ${workOrder['Finished goods note (%)'] || 0}%"></div>
                            </div>
                            <span class="ml-2 text-sm text-gray-600">${workOrder['Finished goods note (%)'] || 0}%</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-6 flex justify-end space-x-3">
                <button onclick="editWorkOrder('${workOrder._id}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <i class="ri-edit-line mr-2"></i>Edit Work Order
                </button>
                <button onclick="closeWorkOrderModal()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                    Close
                </button>
            </div>
        `;
        
        modal.classList.remove('hidden');
        
    } catch (error) {
        console.error('❌ Error opening work order detail:', error);
        alert('Error opening work order details. Please try again.');
    }
};

/**
 * Close work order modal
 */
window.closeWorkOrderModal = function() {
    const modal = document.getElementById('workOrderDetailModal');
    modal.classList.add('hidden');
};

/**
 * Edit work order
 */
window.editWorkOrder = async function(workOrderId) {
    try {
        console.log('Loading work order for edit:', workOrderId);
        
        // Load work order data
        const response = await fetch(`${BASE_URL}api/workorders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getWorkOrderById',
                workOrderId: workOrderId
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to load work order: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error('Failed to load work order data');
        }

        const workOrder = result.data;
        
        // Load assignee options for dropdown
        await loadAssigneeOptions();
        
        // Show edit modal
        showEditWorkOrderModal(workOrder);
        
    } catch (error) {
        console.error('Error loading work order for edit:', error);
        alert('Failed to load work order data: ' + error.message);
    }
};

/**
 * Load unique assignee options from database
 */
async function loadAssigneeOptions() {
    try {
        const response = await fetch(`${BASE_URL}api/workorders/assignees`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load assignee options: ${response.status}`);
        }

        const result = await response.json();
        window.assigneeOptions = result.success ? result.data : [];
        
    } catch (error) {
        console.error('Error loading assignee options:', error);
        window.assigneeOptions = [];
    }
}

/**
 * Show edit work order modal
 */
function showEditWorkOrderModal(workOrder) {
    const assigneeOptionsHtml = (window.assigneeOptions || []).map(assignee => 
        `<option value="${assignee}" ${workOrder['Assign to-Custom fields'] === assignee ? 'selected' : ''}>${assignee}</option>`
    ).join('');

    const modalHtml = `
        <div id="editWorkOrderModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-medium text-gray-900">Edit Work Order</h3>
                        <button onclick="closeEditWorkOrderModal()" class="text-gray-400 hover:text-gray-600">
                            <i class="ri-close-line text-xl"></i>
                        </button>
                    </div>
                    
                    <form id="editWorkOrderForm" class="space-y-4">
                        <input type="hidden" id="editWorkOrderId" value="${workOrder._id}">
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Work Order Number</label>
                                <input type="text" id="editNumber" value="${workOrder.Number || ''}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select id="editStatus" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="Entered" ${workOrder.Status === 'Entered' ? 'selected' : ''}>Entered</option>
                                    <option value="In Progress" ${workOrder.Status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                    <option value="Completed" ${workOrder.Status === 'Completed' ? 'selected' : ''}>Completed</option>
                                    <option value="Cancelled" ${workOrder.Status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                                <input type="text" id="editCustomer" value="${workOrder['Customer-Custom fields'] || ''}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Product SKU</label>
                                <input type="text" id="editProductSKU" value="${workOrder['P_SKU-Custom fields'] || ''}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                                <select id="editAssignedTo" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Select Assignee</option>
                                    ${assigneeOptionsHtml}
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Owner</label>
                                <input type="text" id="editOwner" value="${workOrder.Owner || ''}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Estimated Cost</label>
                                <input type="number" step="0.01" id="editEstimatedCost" value="${workOrder['Estimated cost'] || ''}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                                <input type="datetime-local" id="editDeadline" 
                                       value="${workOrder.Deadline ? formatDateTimeForInput(workOrder.Deadline) : ''}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Material Loading (%)</label>
                                <input type="number" min="0" max="100" id="editMaterialLoading" value="${workOrder['Material loading (%)'] || 0}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Finished Goods Note (%)</label>
                                <input type="number" min="0" max="100" id="editFinishedGoodsNote" value="${workOrder['Finished goods note (%)'] || 0}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Quantity Status</label>
                                <input type="text" id="editQuantityStatus" value="${workOrder['Quantity status'] || ''}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Time Track</label>
                                <input type="text" id="editTimeTrack" value="${workOrder['Time track'] || ''}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>
                        
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" onclick="closeEditWorkOrderModal()" 
                                    class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                                Cancel
                            </button>
                            <button type="submit" 
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Add form submit handler
    document.getElementById('editWorkOrderForm').addEventListener('submit', handleEditWorkOrderSubmit);
    
    // Register with modal stack manager for ESC key support
    if (window.modalStackManager) {
        modalStackManager.pushModal('editWorkOrderModal', () => {
            closeEditWorkOrderModal();
        });
    }
}

/**
 * Format date for datetime-local input
 */
function formatDateTimeForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
}

/**
 * Close edit work order modal
 */
window.closeEditWorkOrderModal = function() {
    const modal = document.getElementById('editWorkOrderModal');
    if (modal) {
        modal.remove();
    }
    
    // Remove from modal stack
    if (window.modalStackManager) {
        modalStackManager.popModal('editWorkOrderModal');
    }
};

/**
 * Handle edit work order form submission
 */
async function handleEditWorkOrderSubmit(event) {
    event.preventDefault();
    
    try {
        const workOrderId = document.getElementById('editWorkOrderId').value;
        
        const updatedData = {
            'Number': document.getElementById('editNumber').value,
            'Status': document.getElementById('editStatus').value,
            'Customer-Custom fields': document.getElementById('editCustomer').value,
            'P_SKU-Custom fields': document.getElementById('editProductSKU').value,
            'Assign to-Custom fields': document.getElementById('editAssignedTo').value,
            'Owner': document.getElementById('editOwner').value,
            'Estimated cost': parseFloat(document.getElementById('editEstimatedCost').value) || 0,
            'Deadline': document.getElementById('editDeadline').value ? new Date(document.getElementById('editDeadline').value).toISOString() : null,
            'Material loading (%)': parseInt(document.getElementById('editMaterialLoading').value) || 0,
            'Finished goods note (%)': parseInt(document.getElementById('editFinishedGoodsNote').value) || 0,
            'Quantity status': document.getElementById('editQuantityStatus').value,
            'Time track': document.getElementById('editTimeTrack').value
        };

        // Show loading state
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Saving...';
        submitButton.disabled = true;

        const response = await fetch(`${BASE_URL}api/workorders/${workOrderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: updatedData,
                username: 'Admin' // TODO: Get from user session
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to update work order: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to update work order');
        }

        console.log('✅ Work order updated successfully');
        closeEditWorkOrderModal();
        
        // Refresh the work order data
        await loadWorkOrderData();
        
        // Show success message
        alert('Work order updated successfully!');
        
    } catch (error) {
        console.error('❌ Error updating work order:', error);
        alert('Failed to update work order: ' + error.message);
        
        // Reset button state
        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

/**
 * Export work order data to CSV
 */
window.exportWorkOrderData = function() {
    try {
        const headers = [
            'Work Order Number',
            'Status',
            'Customer',
            'Product SKU',
            'Assigned To',
            'Owner',
            'Created Date',
            'Deadline',
            'Estimated Cost',
            'Quantity Status',
            'Time Track',
            'Material Loading (%)',
            'Finished Goods Note (%)'
        ];
        
        const csvData = filteredWorkOrderData.map(item => [
            item.Number || '',
            item.Status || '',
            item['Customer-Custom fields'] || '',
            item['P_SKU-Custom fields'] || '',
            item['Assign to-Custom fields'] || '',
            item.Owner || '',
            item['Date and time'] ? new Date(item['Date and time']).toLocaleString() : '',
            item.Deadline ? new Date(item.Deadline).toLocaleDateString() : '',
            item['Estimated cost'] || '',
            item['Quantity status'] || '',
            item['Time track'] || '',
            item['Material loading (%)'] || '',
            item['Finished goods note (%)'] || ''
        ]);
        
        let csvContent = headers.join(',') + '\n';
        csvData.forEach(row => {
            csvContent += row.map(field => `"${field}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `work_orders_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ Work order data exported successfully');
        
    } catch (error) {
        console.error('❌ Error exporting work order data:', error);
        alert('Error exporting data. Please try again.');
    }
};

/**
 * Trigger file input for JSON upload
 */
window.triggerJsonUpload = function() {
    const fileInput = document.getElementById('jsonFileInput');
    if (fileInput) {
        fileInput.click();
    } else {
        console.error('JSON file input not found');
    }
};

/**
 * Handle JSON file upload
 */
window.handleJsonFileUpload = async function(input) {
    const file = input.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
        alert('Please select a valid JSON file.');
        return;
    }

    try {
        // Read file content
        const fileContent = await readFileAsText(file);
        let workOrderData;

        try {
            workOrderData = JSON.parse(fileContent);
        } catch (parseError) {
            alert('Invalid JSON format. Please check your file and try again.');
            console.error('JSON parse error:', parseError);
            return;
        }

        // Validate data structure
        if (!Array.isArray(workOrderData)) {
            alert('JSON file must contain an array of work orders.');
            return;
        }

        if (workOrderData.length === 0) {
            alert('JSON file is empty.');
            return;
        }

        // Validate each work order structure
        const requiredFields = ['Number', 'Status', 'Customer-Custom fields', 'P_SKU-Custom fields'];
        const invalidOrders = [];

        workOrderData.forEach((order, index) => {
            const missingFields = requiredFields.filter(field => !order.hasOwnProperty(field) || order[field] === null || order[field] === '');
            if (missingFields.length > 0) {
                invalidOrders.push({ index: index + 1, missingFields });
            }
        });

        if (invalidOrders.length > 0) {
            const errorMessage = `Invalid work orders found:\n${invalidOrders.map(item => 
                `Order ${item.index}: Missing ${item.missingFields.join(', ')}`
            ).join('\n')}`;
            alert(errorMessage);
            return;
        }

        console.log(`📁 Processing ${workOrderData.length} work orders from JSON file`);

        // Upload the data
        await uploadWorkOrderData(workOrderData);

    } catch (error) {
        console.error('❌ Error processing JSON file:', error);
        alert('Error reading file. Please try again.');
    } finally {
        // Clear the file input
        input.value = '';
    }
};

/**
 * Upload work order data to server
 */
async function uploadWorkOrderData(workOrderData, overwrite = false) {
    try {
        // Show loading state
        const uploadButton = document.querySelector('[onclick="triggerJsonUpload()"]');
        const originalText = uploadButton.innerHTML;
        uploadButton.innerHTML = '<i class="ri-loader-line mr-2 animate-spin"></i>Uploading...';
        uploadButton.disabled = true;

        const response = await fetch(`${BASE_URL}api/workorders/bulk-upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                workOrders: workOrderData,
                username: getCurrentUsername() || 'system',
                overwrite: overwrite
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Handle the upload result
            let message = `Upload completed!\n`;
            
            // Show successfully uploaded work orders
            if (result.inserted > 0) {
                message += `✅ Successfully uploaded: ${result.inserted} work orders\n`;
                if (result.uploadedNumbers && result.uploadedNumbers.length > 0) {
                    message += `   Work Orders: ${result.uploadedNumbers.join(', ')}\n`;
                }
            }
            
            if (result.duplicates && result.duplicates.length > 0 && !overwrite) {
                message += `⚠️ Duplicates found: ${result.duplicates.length} work orders\n`;
                
                // Ask user what to do with duplicates
                const duplicateNumbers = result.duplicates.map(dup => dup.Number).join(', ');
                const overwriteConfirm = confirm(
                    `${message}   Duplicate Work Orders: ${duplicateNumbers}\n\nDo you want to overwrite the existing work orders?\n\nClick OK to overwrite, Cancel to skip duplicates.`
                );

                if (overwriteConfirm) {
                    // Upload duplicates with overwrite flag
                    await uploadWorkOrderData(result.duplicates, true);
                } else {
                    alert(`${message}   Skipped Work Orders: ${duplicateNumbers}`);
                }
            } else {
                alert(message);
            }

            // Show errors if any
            if (result.errors && result.errors.length > 0) {
                console.warn('Upload errors:', result.errors);
                const errorMessage = result.errors.map(err => 
                    `${err.workOrderNumber}: ${err.error}`
                ).join('\n');
                alert(`Some errors occurred during upload:\n${errorMessage}`);
            }

            // Refresh the data table
            await loadWorkOrderData();

        } else {
            throw new Error(result.message || result.error || 'Upload failed');
        }

    } catch (error) {
        console.error('❌ Error uploading work order data:', error);
        alert(`Upload failed: ${error.message}`);
    } finally {
        // Restore button state
        const uploadButton = document.querySelector('[onclick="triggerJsonUpload()"]');
        uploadButton.innerHTML = '<i class="ri-upload-line mr-2"></i><span data-i18n="jsonUpload">Upload JSON</span>';
        uploadButton.disabled = false;
    }
}

/**
 * Helper function to read file as text
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

/**
 * Get current username (assuming it's stored somewhere in the app)
 */
function getCurrentUsername() {
    // This should be implemented based on your authentication system
    // For now, return a default value
    return localStorage.getItem('username') || 'admin';
}

/**
 * Load modal stack manager if not already loaded
 */
function loadModalStackManager() {
    if (typeof window.modalStackManager !== 'undefined') return;
    
    // Simple inline modal stack manager
    class ModalStackManager {
        constructor() {
            this.modalStack = [];
            this.setupEscapeListener();
        }

        pushModal(modalId, closeFunction = null) {
            const modal = { id: modalId, closeFunction: closeFunction };
            this.modalStack.push(modal);
            console.log(`📋 Modal opened: ${modalId}, Stack: [${this.modalStack.map(m => m.id).join(', ')}]`);
        }

        popModal(modalId = null) {
            if (this.modalStack.length === 0) return null;
            
            let removedModal;
            if (modalId) {
                const index = this.modalStack.findIndex(m => m.id === modalId);
                if (index !== -1) {
                    removedModal = this.modalStack.splice(index, 1)[0];
                }
            } else {
                removedModal = this.modalStack.pop();
            }
            
            if (removedModal) {
                console.log(`📋 Modal closed: ${removedModal.id}, Remaining: [${this.modalStack.map(m => m.id).join(', ')}]`);
            }
            return removedModal;
        }

        closeTopModal() {
            const topModal = this.modalStack[this.modalStack.length - 1];
            if (!topModal) return false;

            console.log(`🔑 ESC pressed - closing modal: ${topModal.id}`);

            if (topModal.closeFunction) {
                topModal.closeFunction();
            } else {
                const modal = document.getElementById(topModal.id);
                if (modal) {
                    modal.classList.add('hidden');
                    modal.style.display = 'none';
                }
            }

            this.popModal(topModal.id);
            return true;
        }

        setupEscapeListener() {
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' || event.keyCode === 27) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.closeTopModal();
                }
            });
        }
    }

    window.modalStackManager = new ModalStackManager();
    console.log('🔑 Modal stack manager initialized');
}

/**
 * Enhanced work order detail modal with ESC support
 */
window.showWorkOrderDetails = function(workOrderId) {
    console.log('📄 Opening work order details modal for:', workOrderId);
    
    // Your existing modal opening logic here
    const modal = document.getElementById('workOrderDetailModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        // Register in modal stack
        if (window.modalStackManager) {
            modalStackManager.pushModal('workOrderDetailModal', () => {
                closeWorkOrderDetails();
            });
        }
    }
};

/**
 * Close work order detail modal
 */
window.closeWorkOrderDetails = function() {
    const modal = document.getElementById('workOrderDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    
    // Remove from modal stack
    if (window.modalStackManager) {
        modalStackManager.popModal('workOrderDetailModal');
    }
};

/**
 * Enhanced work order edit modal with ESC support  
 * This function works with your existing dynamic modal creation system
 */
// The original editWorkOrder function works properly with dynamic modal creation

// Make functions globally available
window.initializeWorkOrderSystem = initializeWorkOrderSystem;
window.loadWorkOrderData = loadWorkOrderData;
window.applyWorkOrderFilters = applyWorkOrderFilters;

console.log('✅ SCNA Work Order Management System loaded');
