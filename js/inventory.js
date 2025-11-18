// ==================== INVENTORY MANAGEMENT SYSTEM ====================

let currentInventoryPage = 1;
let inventoryItemsPerPage = 10;
let inventoryData = [];
let inventorySummary = {};
let inventorySortState = { column: null, direction: 1 };

/**
 * Initialize Inventory system
 */
function initializeInventorySystem() {
    console.log('📦 Initializing Inventory Management System...');
    
    // Get current user data
    const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    
    // Show add inventory section for authorized roles
    const authorizedRoles = ['admin', '課長', '係長'];
    const addInventorySection = document.getElementById('inventoryAddSection');
    
    if (authorizedRoles.includes(currentUser.role)) {
        addInventorySection.style.display = 'flex';
    }
    
    // Event listeners
    setupInventoryEventListeners();
    
    // Load initial data
    loadInventoryData();
}

/**
 * Setup event listeners for Inventory system
 */
function setupInventoryEventListeners() {
    // Filter and search listeners
    document.getElementById('refreshInventoryBtn').addEventListener('click', loadInventoryData);
    document.getElementById('inventoryPartNumberFilter').addEventListener('change', applyInventoryFilters);
    document.getElementById('inventoryBackNumberFilter').addEventListener('change', applyInventoryFilters);
    document.getElementById('inventorySearchInput').addEventListener('input', debounce(applyInventoryFilters, 500));
    
    // Pagination listeners
    document.getElementById('inventoryItemsPerPage').addEventListener('change', (e) => {
        inventoryItemsPerPage = parseInt(e.target.value);
        currentInventoryPage = 1;
        loadInventoryData();
    });
    
    document.getElementById('inventoryPrevPage').addEventListener('click', () => changeInventoryPage(-1));
    document.getElementById('inventoryNextPage').addEventListener('click', () => changeInventoryPage(1));
    
    // Add inventory form submission
    const addInventoryForm = document.getElementById('addInventoryForm');
    if (addInventoryForm) {
        addInventoryForm.addEventListener('submit', handleInventoryAddFormSubmit);
    }
}

/**
 * Load inventory data from API
 */
async function loadInventoryData() {
    try {
        showInventoryLoadingState();
        
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getInventoryData',
                filters: buildInventoryQueryFilters(),
                page: currentInventoryPage,
                limit: inventoryItemsPerPage,
                sort: inventorySortState
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                console.log('📊 Raw inventory data received:', result.data);
                inventoryData = result.data;
                inventorySummary = result.summary;
                updateInventorySummary();
                renderInventoryTable();
                updateInventoryPagination(result.pagination);
                loadInventoryFilterOptions();
                
                console.log('✅ Inventory data loaded successfully');
            } else {
                throw new Error(result.error || 'Failed to load inventory data');
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading inventory data:', error);
        showInventoryErrorState(error.message);
    }
}

/**
 * Build query filters from UI controls
 */
function buildInventoryQueryFilters() {
    const filters = {};
    
    // Part number filter
    const partNumberFilter = document.getElementById('inventoryPartNumberFilter').value;
    if (partNumberFilter) {
        filters['品番'] = partNumberFilter;
    }
    
    // Back number filter
    const backNumberFilter = document.getElementById('inventoryBackNumberFilter').value;
    if (backNumberFilter) {
        filters['背番号'] = backNumberFilter;
    }
    
    // Search filter
    const searchTerm = document.getElementById('inventorySearchInput').value.trim();
    if (searchTerm) {
        filters.search = searchTerm;
    }
    
    return filters;
}

/**
 * Apply filters and reload data
 */
function applyInventoryFilters() {
    currentInventoryPage = 1;
    loadInventoryData();
}

/**
 * Update summary display
 */
function updateInventorySummary() {
    document.getElementById('inventoryTotalItems').textContent = inventorySummary.totalItems || 0;
    document.getElementById('inventoryPhysicalStock').textContent = inventorySummary.totalPhysicalStock || 0;
    document.getElementById('inventoryReservedStock').textContent = inventorySummary.totalReservedStock || 0;
    document.getElementById('inventoryAvailableStock').textContent = inventorySummary.totalAvailableStock || 0;
}

/**
 * Render inventory table
 */
function renderInventoryTable() {
    const container = document.getElementById('inventoryTableContainer');
    
    if (inventoryData.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="ri-inbox-line text-4xl mb-4"></i>
                <p>${t('noInventoryItemsFound')}</p>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <div class="overflow-x-auto -mx-4 sm:mx-0">
        <table class="w-full text-xs sm:text-sm">
            <thead class="bg-gray-50 border-b">
                <tr>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('品番')">
                        ${t('partNumber')} ${getInventorySortArrow('品番')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('背番号')">
                        ${t('serialNumber')} ${getInventorySortArrow('背番号')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('工場')">
                        ${t('factory')} ${getInventorySortArrow('工場')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('physicalQuantity')">
                        ${t('physicalStock')} ${getInventorySortArrow('physicalQuantity')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('reservedQuantity')">
                        ${t('reservedStock')} ${getInventorySortArrow('reservedQuantity')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('availableQuantity')">
                        ${t('availableStock')} ${getInventorySortArrow('availableQuantity')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('lastUpdated')">
                        ${t('lastUpdated')} ${getInventorySortArrow('lastUpdated')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700">${t('actions')}</th>
                </tr>
            </thead>
            <tbody>
                ${inventoryData.map((item, index) => {
                    const lastUpdated = new Date(item.lastUpdated).toLocaleDateString();
                    const availabilityStatus = getAvailabilityStatus(item.availableQuantity);
                    
                    return `
                        <tr class="border-b hover:bg-gray-50 cursor-pointer" onclick="openInventoryTransactions('${item.背番号}')">
                            <td class="px-2 sm:px-4 py-2 sm:py-3 font-medium text-blue-600">
                                <span class="hover:underline">
                                    ${item.品番}
                                </span>
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3 font-medium">
                                ${item.背番号}
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3 text-gray-700">
                                <span class="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800">
                                    <i class="ri-building-line mr-1 text-xs"></i>
                                    ${item.工場 || '-'}
                                </span>
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3">
                                <span class="text-green-600 font-medium">${item.physicalQuantity}</span>
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3">
                                <span class="text-yellow-600 font-medium">${item.reservedQuantity}</span>
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3">
                                <span class="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${availabilityStatus.badgeClass}">
                                    <i class="${availabilityStatus.icon} mr-1 text-xs"></i>
                                    ${item.availableQuantity}
                                </span>
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 whitespace-nowrap">
                                ${lastUpdated}
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3" onclick="event.stopPropagation()">
                                <button onclick="openInventoryTransactions('${item.背番号}')" class="text-blue-600 hover:text-blue-800" title="${t('viewTransactions')}">
                                    <i class="ri-history-line text-base sm:text-lg"></i>
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
 * Get availability status information for display
 */
function getAvailabilityStatus(availableQuantity) {
    if (availableQuantity <= 0) {
        return { icon: 'ri-close-circle-line', badgeClass: 'bg-red-100 text-red-800' };
    } else if (availableQuantity <= 10) {
        return { icon: 'ri-error-warning-line', badgeClass: 'bg-yellow-100 text-yellow-800' };
    } else {
        return { icon: 'ri-checkbox-circle-line', badgeClass: 'bg-green-100 text-green-800' };
    }
}

/**
 * Sort inventory table by column
 */
window.sortInventoryTable = function(column) {
    if (inventorySortState.column === column) {
        inventorySortState.direction *= -1;
    } else {
        inventorySortState.column = column;
        inventorySortState.direction = 1;
    }
    
    loadInventoryData();
};

/**
 * Get sort arrow for column headers
 */
function getInventorySortArrow(column) {
    if (inventorySortState.column !== column) return '';
    return inventorySortState.direction === 1 ? ' ↑' : ' ↓';
}

/**
 * Update pagination controls
 */
function updateInventoryPagination(paginationInfo) {
    const pageInfo = document.getElementById('inventoryPageInfo');
    const pageNumbers = document.getElementById('inventoryPageNumbers');
    const prevBtn = document.getElementById('inventoryPrevPage');
    const nextBtn = document.getElementById('inventoryNextPage');
    
    if (!paginationInfo || paginationInfo.totalItems === 0) {
        pageInfo.textContent = t('noItemsToDisplay');
        pageNumbers.innerHTML = '';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    
    const { currentPage, totalPages, totalItems, itemsPerPage } = paginationInfo;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    pageInfo.textContent = `${totalItems}件中 ${startItem}-${endItem}件を表示`;
    
    // Generate page numbers
    pageNumbers.innerHTML = '';
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        const button = document.createElement('button');
        button.className = `px-3 py-1 border rounded text-sm ${i === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`;
        button.textContent = i;
        button.onclick = () => goToInventoryPage(i);
        pageNumbers.appendChild(button);
    }
    
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

/**
 * Change page
 */
function changeInventoryPage(direction) {
    const newPage = currentInventoryPage + direction;
    if (newPage >= 1) {
        currentInventoryPage = newPage;
        loadInventoryData();
    }
}

/**
 * Go to specific page
 */
window.goToInventoryPage = function(page) {
    if (page >= 1) {
        currentInventoryPage = page;
        loadInventoryData();
    }
};

/**
 * Load filter options (part numbers and back numbers)
 */
async function loadInventoryFilterOptions() {
    try {
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getFilterOptions'
            })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                updateInventoryFilterOptions(result.data);
            }
        }
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

/**
 * Update filter dropdown options
 */
function updateInventoryFilterOptions(options) {
    // Update part number filter
    const partNumberFilter = document.getElementById('inventoryPartNumberFilter');
    const currentPartNumber = partNumberFilter.value;
    partNumberFilter.innerHTML = `<option value="">${t('allPartNumbers')}</option>`;
    options.partNumbers.forEach(partNumber => {
        const option = document.createElement('option');
        option.value = partNumber;
        option.textContent = partNumber;
        if (partNumber === currentPartNumber) option.selected = true;
        partNumberFilter.appendChild(option);
    });

    // Update back number filter
    const backNumberFilter = document.getElementById('inventoryBackNumberFilter');
    const currentBackNumber = backNumberFilter.value;
    backNumberFilter.innerHTML = `<option value="">${t('allBackNumbers')}</option>`;
    options.backNumbers.forEach(backNumber => {
        const option = document.createElement('option');
        option.value = backNumber;
        option.textContent = backNumber;
        if (backNumber === currentBackNumber) option.selected = true;
        backNumberFilter.appendChild(option);
    });
}

/**
 * Show loading state
 */
function showInventoryLoadingState() {
    const container = document.getElementById('inventoryTableContainer');
    container.innerHTML = `<div class="p-8 text-center text-gray-500"><i class="ri-loader-4-line animate-spin text-2xl mr-2"></i>${t('loadingInventory')}</div>`;
}

/**
 * Show error state
 */
function showInventoryErrorState(errorMessage) {
    const container = document.getElementById('inventoryTableContainer');
    container.innerHTML = `
        <div class="p-8 text-center text-red-500">
            <i class="ri-error-warning-line text-2xl mr-2"></i>
            Error: ${errorMessage}
            <br><button class="mt-2 text-blue-500 hover:underline" onclick="loadInventoryData()">Retry</button>
        </div>
    `;
}

// ==================== INVENTORY TRANSACTIONS MODAL ====================

/**
 * Open inventory transactions modal
 */
window.openInventoryTransactions = async function(backNumber) {
    try {
        const modal = document.getElementById('inventoryTransactionsModal');
        const content = document.getElementById('inventoryTransactionsContent');
        
        // Show loading state
        content.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="ri-loader-4-line animate-spin text-2xl mr-2"></i>
                ${t('loadingTransactions')}
            </div>
        `;
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Fetch transactions
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getItemTransactions',
                背番号: backNumber
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                renderInventoryTransactions(result.data, backNumber);
            } else {
                throw new Error(result.error || 'Failed to load transactions');
            }
        } else {
            throw new Error('Failed to fetch transactions');
        }
        
    } catch (error) {
        console.error('Error opening inventory transactions:', error);
        const content = document.getElementById('inventoryTransactionsContent');
        content.innerHTML = `
            <div class="p-8 text-center text-red-500">
                <i class="ri-error-warning-line text-2xl mr-2"></i>
                Error loading transactions: ${error.message}
            </div>
        `;
    }
};

/**
 * Render inventory transactions
 */
function renderInventoryTransactions(transactions, backNumber) {
    const content = document.getElementById('inventoryTransactionsContent');
    
    if (transactions.length === 0) {
        content.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="ri-inbox-line text-4xl mb-4"></i>
                <p>${t('noTransactionsFound')} ${backNumber}</p>
            </div>
        `;
        return;
    }
    
    // Sort transactions by timestamp (newest first)
    transactions.sort((a, b) => new Date(b.timeStamp) - new Date(a.timeStamp));
    
    const currentItem = transactions[0]; // Latest transaction has current state
    
    const contentHTML = `
        <div class="space-y-6">
            <!-- Current State Summary -->
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="text-lg font-semibold text-blue-900">${t('serialNumber')}: ${backNumber}</h4>
                    ${currentItem.工場 ? `
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-600 text-white">
                            <i class="ri-building-line mr-1.5"></i>
                            ${currentItem.工場}
                        </span>
                    ` : ''}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="text-center">
                        <p class="text-sm text-blue-600">${t('partNumber')}</p>
                        <p class="text-lg font-bold text-blue-900">${currentItem.品番}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-green-600">${t('physicalStock')}</p>
                        <p class="text-lg font-bold text-green-700">${currentItem.physicalQuantity || 0}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-yellow-600">${t('reservedStock')}</p>
                        <p class="text-lg font-bold text-yellow-700">${currentItem.reservedQuantity || 0}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-purple-600">${t('availableStock')}</p>
                        <p class="text-lg font-bold text-purple-700">${currentItem.availableQuantity || currentItem.runningQuantity || 0}</p>
                    </div>
                </div>
            </div>

            <!-- Transaction History -->
            <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-4">${t('transactionHistory')}</h4>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm border border-gray-200 rounded-lg">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left font-medium text-gray-700">${t('dateTime')}</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-700">${t('action')}</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-700">${t('physical')}</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-700">${t('reserved')}</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-700">${t('available')}</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-700">${t('source')}</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-700">${t('note')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions.map((transaction, index) => {
                                const timestamp = new Date(transaction.timeStamp).toLocaleString();
                                const actionInfo = getTransactionActionInfo(transaction.action);
                                
                                return `
                                    <tr class="border-b hover:bg-gray-50 ${index === 0 ? 'bg-blue-50' : ''}">
                                        <td class="px-4 py-3 text-gray-600">${timestamp}</td>
                                        <td class="px-4 py-3">
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionInfo.badgeClass}">
                                                <i class="${actionInfo.icon} mr-1"></i>
                                                ${transaction.action}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-green-600 font-medium">${transaction.physicalQuantity || transaction.runningQuantity || 0}</td>
                                        <td class="px-4 py-3 text-yellow-600 font-medium">${transaction.reservedQuantity || 0}</td>
                                        <td class="px-4 py-3 text-purple-600 font-medium">${transaction.availableQuantity || transaction.runningQuantity || 0}</td>
                                        <td class="px-4 py-3 text-gray-600 text-xs">${transaction.source || t('system')}</td>
                                        <td class="px-4 py-3 text-gray-600 text-xs">${transaction.note || transaction.migrationNote || '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    content.innerHTML = contentHTML;
}

/**
 * Get transaction action information for display
 */
function getTransactionActionInfo(action) {
    if (action.includes('Reservation')) {
        return { icon: 'ri-bookmark-line', badgeClass: 'bg-yellow-100 text-yellow-800' };
    } else if (action.includes('Completed') || action.includes('Picked')) {
        return { icon: 'ri-checkbox-circle-line', badgeClass: 'bg-green-100 text-green-800' };
    } else if (action.includes('Failed') || action.includes('Cancelled')) {
        return { icon: 'ri-close-circle-line', badgeClass: 'bg-red-100 text-red-800' };
    } else if (action.includes('Migration') || action.includes('Setup')) {
        return { icon: 'ri-settings-line', badgeClass: 'bg-blue-100 text-blue-800' };
    } else if (action.includes('Delivery') || action.includes('Stock')) {
        return { icon: 'ri-truck-line', badgeClass: 'bg-purple-100 text-purple-800' };
    } else {
        return { icon: 'ri-information-line', badgeClass: 'bg-gray-100 text-gray-800' };
    }
}

/**
 * Close inventory transactions modal
 */
window.closeInventoryTransactionsModal = function() {
    const modal = document.getElementById('inventoryTransactionsModal');
    modal.classList.add('hidden');
};

// ==================== ADD INVENTORY FUNCTIONALITY ====================

/**
 * Open add inventory modal
 */
window.openInventoryAddModal = function() {
    const modal = document.getElementById('inventoryAddModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Clear form
    clearInventoryAddModalForm();
    
    // Setup autofill functionality
    setupInventoryModalAutoGeneration();
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('addInventory品番').focus();
    }, 100);
};

/**
 * Close add inventory modal
 */
window.closeInventoryAddModal = function() {
    const modal = document.getElementById('inventoryAddModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    clearInventoryAddModalForm();
};

/**
 * Clear add inventory modal form
 */
function clearInventoryAddModalForm() {
    document.getElementById('addInventory品番').value = '';
    document.getElementById('addInventory背番号').value = '';
    document.getElementById('addInventoryQuantity').value = '';
    
    // Clear any error states
    const errorElements = document.querySelectorAll('.inventory-field-error');
    errorElements.forEach(el => el.remove());
    
    // Reset field styles
    const fields = ['addInventory品番', 'addInventory背番号', 'addInventoryQuantity'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.remove('border-red-500');
        }
    });
}

/**
 * Setup auto-generation for part number and back number
 */
function setupInventoryModalAutoGeneration() {
    const partNumberField = document.getElementById('addInventory品番');
    const backNumberField = document.getElementById('addInventory背番号');
    
    // Remove existing listeners to avoid duplicates
    partNumberField.removeEventListener('blur', handleInventoryPartNumberBlur);
    backNumberField.removeEventListener('blur', handleInventoryBackNumberBlur);
    
    // Add new listeners
    partNumberField.addEventListener('blur', handleInventoryPartNumberBlur);
    backNumberField.addEventListener('blur', handleInventoryBackNumberBlur);
}

/**
 * Handle part number blur for auto-generation
 */
async function handleInventoryPartNumberBlur() {
    const partNumber = document.getElementById('addInventory品番').value.trim();
    const backNumberField = document.getElementById('addInventory背番号');
    
    if (partNumber && !backNumberField.value.trim()) {
        try {
            const masterData = await lookupInventoryMasterData({ 品番: partNumber });
            if (masterData && masterData.背番号) {
                backNumberField.value = masterData.背番号;
                showInventoryAutoGenerationNotification('背番号', masterData.背番号);
            }
        } catch (error) {
            console.error('Error looking up master data:', error);
        }
    }
}

/**
 * Handle back number blur for auto-generation
 */
async function handleInventoryBackNumberBlur() {
    const backNumber = document.getElementById('addInventory背番号').value.trim();
    const partNumberField = document.getElementById('addInventory品番');
    
    if (backNumber && !partNumberField.value.trim()) {
        try {
            const masterData = await lookupInventoryMasterData({ 背番号: backNumber });
            if (masterData && masterData.品番) {
                partNumberField.value = masterData.品番;
                showInventoryAutoGenerationNotification('品番', masterData.品番);
            }
        } catch (error) {
            console.error('Error looking up master data:', error);
        }
    }
}

/**
 * Lookup master data from database
 */
async function lookupInventoryMasterData(query) {
    try {
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'lookupMasterData',
                ...query
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                return result.data;
            }
        }
        return null;
    } catch (error) {
        console.error('Error looking up master data:', error);
        return null;
    }
}

/**
 * Show auto-generation notification
 */
function showInventoryAutoGenerationNotification(fieldName, value) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
    notification.textContent = `${fieldName} ${t('autoFilled')}: ${value}`;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

/**
 * Handle add inventory form submission
 */
async function handleInventoryAddFormSubmit(event) {
    event.preventDefault();
    
    const partNumber = document.getElementById('addInventory品番').value.trim();
    const backNumber = document.getElementById('addInventory背番号').value.trim();
    const quantity = parseInt(document.getElementById('addInventoryQuantity').value.trim());
    
    // Validate required fields
    let hasErrors = false;

    if (!partNumber) {
        showInventoryFieldError('addInventory品番', t('partNumberRequired'));
        hasErrors = true;
    }

    if (!backNumber) {
        showInventoryFieldError('addInventory背番号', t('serialNumberRequired'));
        hasErrors = true;
    }

    if (!quantity || quantity <= 0) {
        showInventoryFieldError('addInventoryQuantity', t('quantityMustBePositive'));
        hasErrors = true;
    }
    
    if (hasErrors) return;
    
    // Validate that part number and back number exist in master database
    try {
        const masterData = await lookupInventoryMasterData({ 品番: partNumber, 背番号: backNumber });
        if (!masterData) {
            showInventoryFieldError('addInventory品番', 'Part number and back number combination not found in master database');
            return;
        }
    } catch (error) {
        showInventoryFieldError('addInventory品番', 'Error validating master data');
        return;
    }
    
    try {
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        
        // Get user full name
        const userFullName = await getUserFullName(currentUser.username);
        
        // Get current date in YYYY-MM-DD format
        const currentDate = new Date().toISOString().split('T')[0];
        
        const inventoryData = {
            品番: partNumber,
            背番号: backNumber,
            physicalQuantityChange: quantity,
            action: 'Manual Inventory Add',
            source: `Freya Admin - ${userFullName || currentUser.username || 'Unknown User'}`,
            Date: currentDate,
            timeStamp: new Date()
        };
        
        // Submit the request
        const response = await fetch(`${BASE_URL}api/inventory/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(inventoryData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Close modal and refresh data
            closeInventoryAddModal();
            
            // Add a small delay to ensure database transaction is complete
            setTimeout(() => {
                console.log('🔄 Refreshing inventory data after adding inventory...');
                loadInventoryData();
            }, 500);
            
            // Show success message
            alert(`${t('successfullyAdded')} ${quantity} ${t('units')} ${backNumber}`);
        } else {
            throw new Error(result.message || 'Failed to add inventory');
        }

    } catch (error) {
        console.error('Error adding inventory:', error);
        alert(`${t('errorAddingInventory')}: ${error.message}`);
    }
}

/**
 * Show field validation error
 */
function showInventoryFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Remove existing error
    const existingError = field.parentNode.querySelector('.inventory-field-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add error styling
    field.classList.add('border-red-500');
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'inventory-field-error text-red-500 text-sm mt-1';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
    
    // Remove error on input
    const removeError = () => {
        field.classList.remove('border-red-500');
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
        field.removeEventListener('input', removeError);
    };
    field.addEventListener('input', removeError);
}

/**
 * Get user's full name from database (same as NODA system)
 */
async function getUserFullName(username) {
    try {
        const response = await fetch(`${BASE_URL}queries`, {
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
                return `${user.firstName || ''} ${user.lastName || ''}`.trim() || username;
            }
        }
        return username; // Fallback to username if full name not found
    } catch (error) {
        console.error('Error getting user full name:', error);
        return username;
    }
}

// ==================== EXPORT FUNCTIONALITY ====================

/**
 * Export inventory data to CSV
 */
window.exportInventoryData = async function() {
    try {
        showInventoryLoadingState();
        
        const filters = buildInventoryQueryFilters();
        const queryParams = new URLSearchParams();
        
        // Add filters to query
        Object.keys(filters).forEach(key => {
            queryParams.append(key, JSON.stringify(filters[key]));
        });
        
        queryParams.append('export', 'true');
        
        const response = await fetch(`${BASE_URL}/api/inventory/data?${queryParams}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        downloadInventoryCSV(data.data);
        
        loadInventoryData(); // Restore normal view
    } catch (error) {
        console.error('Error exporting inventory data:', error);
        showInventoryErrorState('Failed to export inventory data');
    }
};

/**
 * Download inventory data as CSV
 */
function downloadInventoryCSV(data) {
    if (!data || data.length === 0) {
        alert(t('noDataToExport'));
        return;
    }
    
    const headers = ['品番', '背番号', 'Physical Stock', 'Reserved Stock', 'Available Stock', 'Last Updated'];
    const csvContent = [
        headers.join(','),
        ...data.map(item => [
            `"${item.品番 || ''}"`,
            `"${item.背番号 || ''}"`,
            item.physicalQuantity || 0,
            item.reservedQuantity || 0,
            item.availableQuantity || 0,
            `"${new Date(item.lastUpdated).toLocaleString('ja-JP')}"`
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_data_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// ==================== UTILITY FUNCTIONS ====================

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

// Make functions globally available
window.initializeInventorySystem = initializeInventorySystem;
