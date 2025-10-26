// ==================== NODA WAREHOUSE MANAGEMENT SYSTEM ====================

let currentNodaPage = 1;
let nodaItemsPerPage = 10;
let nodaData = [];
let nodaStatistics = {};
let nodaSortState = { column: null, direction: 1 };

/**
 * Initialize NODA system
 */
function initializeNodaSystem() {
    console.log('🏭 Initializing NODA Warehouse Management System...');
    
    // Get current user data
    const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    
    // Show add request section for authorized roles
    const authorizedRoles = ['admin', '課長', '係長'];
    const addRequestSection = document.getElementById('nodaAddRequestSection');
    
    if (authorizedRoles.includes(currentUser.role)) {
        addRequestSection.style.display = 'flex';
    }
    
    // Leave date filters blank by default - users can set them if they want to filter
    // This will show all picking requests when the page loads
    
    // Event listeners
    setupNodaEventListeners();
    
    // Load initial data
    loadNodaData();
}

/**
 * Setup event listeners for NODA system
 */
function setupNodaEventListeners() {
    // Filter and search listeners
    document.getElementById('refreshNodaBtn').addEventListener('click', loadNodaData);
    document.getElementById('nodaStatusFilter').addEventListener('change', applyNodaFilters);
    document.getElementById('nodaPartNumberFilter').addEventListener('change', applyNodaFilters);
    document.getElementById('nodaBackNumberFilter').addEventListener('change', applyNodaFilters);
    document.getElementById('nodaDateFrom').addEventListener('change', applyNodaFilters);
    document.getElementById('nodaDateTo').addEventListener('change', applyNodaFilters);
    document.getElementById('nodaSearchInput').addEventListener('input', applyNodaFilters);
    
    // Pagination listeners
    document.getElementById('nodaItemsPerPage').addEventListener('change', function() {
        nodaItemsPerPage = parseInt(this.value);
        currentNodaPage = 1;
        renderNodaTable();
    });
    
    document.getElementById('nodaPrevPage').addEventListener('click', () => changeNodaPage(-1));
    document.getElementById('nodaNextPage').addEventListener('click', () => changeNodaPage(1));
}

/**
 * Load NODA data from server
 */
async function loadNodaData() {
    try {
        console.log('📊 Loading NODA data...');
        showNodaLoadingState();
        
        // Build query filters
        const filters = buildNodaQueryFilters();
        
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getNodaRequests',
                filters: filters,
                page: currentNodaPage,
                limit: nodaItemsPerPage,
                sort: nodaSortState
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            nodaData = result.data;
            nodaStatistics = result.statistics;
            
            // Update UI
            updateNodaStatistics();
            renderNodaTable();
            updateNodaPagination(result.pagination);
            loadFilterOptions();
            
            console.log('✅ NODA data loaded successfully');
        } else {
            throw new Error(result.error || 'Failed to load NODA data');
        }
        
    } catch (error) {
        console.error('❌ Error loading NODA data:', error);
        showNodaErrorState(error.message);
    }
}

/**
 * Build query filters from UI controls
 */
function buildNodaQueryFilters() {
    const filters = {};
    
    // Status filter
    const statusFilter = document.getElementById('nodaStatusFilter').value;
    if (statusFilter) {
        filters.status = statusFilter;
    }
    
    // Part number filter
    const partNumberFilter = document.getElementById('nodaPartNumberFilter').value;
    if (partNumberFilter) {
        filters['品番'] = partNumberFilter;
    }
    
    // Back number filter
    const backNumberFilter = document.getElementById('nodaBackNumberFilter').value;
    if (backNumberFilter) {
        filters['背番号'] = backNumberFilter;
    }
    
    // Date range filter
    const dateFrom = document.getElementById('nodaDateFrom').value;
    const dateTo = document.getElementById('nodaDateTo').value;
    
    if (dateFrom || dateTo) {
        filters.dateRange = {};
        if (dateFrom) filters.dateRange.from = dateFrom;
        if (dateTo) filters.dateRange.to = dateTo;
    }
    
    // Search filter
    const searchTerm = document.getElementById('nodaSearchInput').value.trim();
    if (searchTerm) {
        filters.search = searchTerm;
    }
    
    return filters;
}

/**
 * Apply filters and reload data
 */
function applyNodaFilters() {
    currentNodaPage = 1;
    loadNodaData();
}

/**
 * Update statistics display
 */
function updateNodaStatistics() {
    document.getElementById('nodaPendingCount').textContent = nodaStatistics.pending || 0;
    document.getElementById('nodaActiveCount').textContent = nodaStatistics.active || 0;
    document.getElementById('nodaCompleteCount').textContent = nodaStatistics.complete || 0;
    document.getElementById('nodaFailedCount').textContent = nodaStatistics.failed || 0;
}

/**
 * Render NODA table
 */
function renderNodaTable() {
    const container = document.getElementById('nodaTableContainer');
    
    if (nodaData.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="ri-inbox-line text-4xl mb-4"></i>
                <p>${t('noPickingRequestsFound')}</p>
            </div>
        `;
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const canEdit = ['admin', '課長', '係長'].includes(currentUser.role);
    
    const tableHTML = `
        <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b">
                <tr>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortNodaTable('requestNumber')">
                        ${t('requestNumber')} ${getNodaSortArrow('requestNumber')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortNodaTable('requestType')">
                        ${t('type')} ${getNodaSortArrow('requestType')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortNodaTable('status')">
                        Status ${getNodaSortArrow('status')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortNodaTable('品番')">
                        Items ${getNodaSortArrow('品番')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortNodaTable('pickupDate')">
                        Pickup Date ${getNodaSortArrow('pickupDate')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortNodaTable('createdAt')">
                        Created ${getNodaSortArrow('createdAt')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${nodaData.map((item, index) => {
                    const statusInfo = getNodaStatusInfo(item.status);
                    const createdDate = new Date(item.createdAt).toLocaleDateString();
                    
                    // Handle both single and bulk requests
                    const isBulkRequest = item.requestType === 'bulk';
                    const pickupDate = isBulkRequest ? 
                        new Date(item.pickupDate).toLocaleDateString() : 
                        new Date(item.date).toLocaleDateString();
                    
                    let itemsDisplay = '';
                    if (isBulkRequest && item.lineItems) {
                        const totalItems = item.lineItems.length;
                        const pendingItems = item.lineItems.filter(line => line.status === 'pending').length;
                        const completedItems = item.lineItems.filter(line => line.status === 'completed').length;
                        
                        itemsDisplay = `
                            <div class="text-xs">
                                <div class="font-medium">${totalItems} items</div>
                                <div class="text-gray-500">
                                    ${completedItems} done, ${pendingItems} pending
                                </div>
                            </div>
                        `;
                    } else {
                        // Single item request
                        itemsDisplay = `
                            <div class="text-xs">
                                <div class="font-medium">${item.品番}</div>
                                <div class="text-gray-500">${item.背番号} (Qty: ${item.quantity})</div>
                            </div>
                        `;
                    }
                    
                    return `
                        <tr class="border-b hover:bg-gray-50 cursor-pointer ${statusInfo.rowClass}" onclick="openNodaDetail('${item._id}')">
                            <td class="px-4 py-3 font-medium text-blue-600">
                                <span class="hover:underline">
                                    ${item.requestNumber}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                    isBulkRequest ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                }">
                                    <i class="${isBulkRequest ? 'ri-stack-line' : 'ri-file-line'} mr-1"></i>
                                    ${isBulkRequest ? 'Bulk' : 'Single'}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.badgeClass}">
                                    <i class="${statusInfo.icon} mr-1"></i>
                                    ${statusInfo.text}
                                </span>
                            </td>
                            <td class="px-4 py-3">${itemsDisplay}</td>
                            <td class="px-4 py-3">${pickupDate}</td>
                            <td class="px-4 py-3">${createdDate}</td>
                            <td class="px-4 py-3" onclick="event.stopPropagation()">
                                <div class="flex items-center space-x-2">
                                    ${canEdit ? `
                                        <button onclick="editNodaRequest('${item._id}')" class="text-green-600 hover:text-green-800" title="Edit">
                                            <i class="ri-edit-line"></i>
                                        </button>
                                        <button onclick="deleteNodaRequest('${item._id}')" class="text-red-600 hover:text-red-800" title="Delete">
                                            <i class="ri-delete-bin-line"></i>
                                        </button>
                                    ` : `
                                        <span class="text-gray-400 text-sm">Click row to view</span>
                                    `}
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

/**
 * Get status information for display
 */
function getNodaStatusInfo(status) {
    switch (status) {
        case 'pending':
            return { text: 'Pending', icon: 'ri-time-line', badgeClass: 'bg-yellow-100 text-yellow-800', rowClass: '' };
        case 'in-progress':
            return { text: 'In Progress', icon: 'ri-play-line', badgeClass: 'bg-blue-100 text-blue-800', rowClass: '' };
        case 'active':
            return { text: 'Active', icon: 'ri-play-line', badgeClass: 'bg-blue-100 text-blue-800', rowClass: '' };
        case 'completed':
            return { text: 'Completed', icon: 'ri-checkbox-circle-line', badgeClass: 'bg-green-100 text-green-800', rowClass: '' };
        case 'complete':
            return { text: 'Complete', icon: 'ri-checkbox-circle-line', badgeClass: 'bg-green-100 text-green-800', rowClass: '' };
        case 'failed':
            return { text: 'Failed', icon: 'ri-close-circle-line', badgeClass: 'bg-red-100 text-red-800', rowClass: '' };
        default:
            return { text: 'Unknown', icon: 'ri-question-line', badgeClass: 'bg-gray-100 text-gray-800', rowClass: '' };
    }
}

/**
 * Sort NODA table by column
 */
window.sortNodaTable = function(column) {
    if (nodaSortState.column === column) {
        nodaSortState.direction *= -1;
    } else {
        nodaSortState.column = column;
        nodaSortState.direction = 1;
    }
    
    loadNodaData();
};

/**
 * Get sort arrow for column headers
 */
function getNodaSortArrow(column) {
    if (nodaSortState.column !== column) return '';
    return nodaSortState.direction === 1 ? ' ↑' : ' ↓';
}

/**
 * Update pagination controls
 */
function updateNodaPagination(paginationInfo) {
    const pageInfo = document.getElementById('nodaPageInfo');
    const pageNumbers = document.getElementById('nodaPageNumbers');
    const prevBtn = document.getElementById('nodaPrevPage');
    const nextBtn = document.getElementById('nodaNextPage');
    
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
        button.onclick = () => goToNodaPage(i);
        pageNumbers.appendChild(button);
    }
    
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

/**
 * Change page
 */
function changeNodaPage(direction) {
    const newPage = currentNodaPage + direction;
    if (newPage >= 1) {
        currentNodaPage = newPage;
        loadNodaData();
    }
}

/**
 * Go to specific page
 */
window.goToNodaPage = function(page) {
    if (page >= 1) {
        currentNodaPage = page;
        loadNodaData();
    }
};

/**
 * Load filter options (part numbers and back numbers)
 */
async function loadFilterOptions() {
    try {
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
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
                updateNodaFilterOptions(result.data);
            }
        }
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

/**
 * Update filter dropdown options
 */
function updateNodaFilterOptions(options) {
    // Update part number filter
    const partNumberFilter = document.getElementById('nodaPartNumberFilter');
    const currentPartNumber = partNumberFilter.value;
    partNumberFilter.innerHTML = '<option value="">All Part Numbers</option>';
    options.partNumbers.forEach(partNumber => {
        const option = document.createElement('option');
        option.value = partNumber;
        option.textContent = partNumber;
        if (partNumber === currentPartNumber) option.selected = true;
        partNumberFilter.appendChild(option);
    });
    
    // Update back number filter
    const backNumberFilter = document.getElementById('nodaBackNumberFilter');
    const currentBackNumber = backNumberFilter.value;
    backNumberFilter.innerHTML = '<option value="">All Back Numbers</option>';
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
function showNodaLoadingState() {
    const container = document.getElementById('nodaTableContainer');
    container.innerHTML = '<div class="p-8 text-center text-gray-500"><i class="ri-loader-4-line animate-spin text-2xl mr-2"></i>Loading requests...</div>';
}

/**
 * Show error state
 */
function showNodaErrorState(errorMessage) {
    const container = document.getElementById('nodaTableContainer');
    container.innerHTML = `
        <div class="p-8 text-center text-red-500">
            <i class="ri-error-warning-line text-2xl mr-2"></i>
            Error: ${errorMessage}
            <br><button class="mt-2 text-blue-500 hover:underline" onclick="loadNodaData()">Retry</button>
        </div>
    `;
}

// ==================== ADD NEW REQUEST FUNCTIONALITY (MODAL-BASED) ====================

/**
 * Open add request modal
 */
// OLD FUNCTION - DISABLED (replaced by cart-based version below)
/*
window.openNodaAddModal = function() {
    const modal = document.getElementById('nodaAddModal');
    const form = document.getElementById('nodaAddForm');
    
    // Reset form
    form.reset();
    clearNodaAddModalForm();
    
    // Set default pickup date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('modalNodaDate').value = today;
    
    // Setup event listeners for real-time inventory checking and auto-generation
    setupModalInventoryChecking();
    setupModalAutoGeneration();
    
    // Add form submission handler (remove existing first to prevent duplicates)
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Re-setup event listeners after form replacement
    setupModalInventoryChecking();
    setupModalAutoGeneration();
    
    // Add fresh form submission handler
    document.getElementById('nodaAddForm').addEventListener('submit', handleNodaAddFormSubmit);
    
    // Show modal
    modal.classList.remove('hidden');
};
*/

/**
 * Close add request modal (OLD VERSION - DISABLED)
 */
/*
window.closeNodaAddModal = function() {
    const modal = document.getElementById('nodaAddModal');
    modal.classList.add('hidden');
    clearNodaAddModalForm();
};
*/

/**
 * Clear add request modal form
 */
function clearNodaAddModalForm() {
    const partNumberInput = document.getElementById('modalNodaPartNumber');
    const backNumberInput = document.getElementById('modalNodaBackNumber');
    
    partNumberInput.value = '';
    backNumberInput.value = '';
    document.getElementById('modalNodaQuantity').value = '';
    document.getElementById('modalInventoryCheckResult').innerHTML = '';
    
    // Reset auto-generation flags
    partNumberInput.dataset.autoGenerated = 'false';
    backNumberInput.dataset.autoGenerated = 'false';
    
    // Clear any validation states
    const form = document.getElementById('nodaAddForm');
    form.querySelectorAll('.border-red-500').forEach(el => {
        el.classList.remove('border-red-500');
        el.classList.add('border-gray-300');
    });
}

/**
 * Setup inventory checking for modal inputs
 */
function setupModalInventoryChecking() {
    const backNumberInput = document.getElementById('modalNodaBackNumber');
    const quantityInput = document.getElementById('modalNodaQuantity');
    
    // Remove existing listeners to prevent duplicates
    backNumberInput.removeEventListener('input', checkModalInventoryAvailability);
    quantityInput.removeEventListener('input', checkModalInventoryAvailability);
    
    // Add new listeners
    backNumberInput.addEventListener('input', checkModalInventoryAvailability);
    quantityInput.addEventListener('input', checkModalInventoryAvailability);
}

/**
 * Setup auto-generation for part number and back number
 */
function setupModalAutoGeneration() {
    const partNumberInput = document.getElementById('modalNodaPartNumber');
    const backNumberInput = document.getElementById('modalNodaBackNumber');
    
    if (!partNumberInput || !backNumberInput) {
        console.warn('Auto-generation inputs not found');
        return;
    }
    
    // Remove existing listeners to prevent duplicates
    partNumberInput.removeEventListener('blur', handlePartNumberBlur);
    backNumberInput.removeEventListener('blur', handleBackNumberBlur);
    
    // Add blur event listeners (triggered when user leaves the field)
    partNumberInput.addEventListener('blur', handlePartNumberBlur);
    backNumberInput.addEventListener('blur', handleBackNumberBlur);
    
    console.log('✅ Auto-generation listeners attached');
}

/**
 * Handle part number blur for auto-generation
 */
async function handlePartNumberBlur() {
    const partNumber = document.getElementById('modalNodaPartNumber').value.trim();
    const backNumberInput = document.getElementById('modalNodaBackNumber');
    
    console.log('🔍 Part number blur event:', partNumber);
    
    // If part number is empty, clear the back number if it was auto-generated
    if (!partNumber) {
        if (backNumberInput.dataset.autoGenerated === 'true') {
            backNumberInput.value = '';
            backNumberInput.dataset.autoGenerated = 'false';
            // Clear inventory check result
            document.getElementById('modalInventoryCheckResult').innerHTML = '';
        }
        return;
    }
    
    // Don't auto-generate if back number is manually filled (not auto-generated)
    if (backNumberInput.value.trim() && backNumberInput.dataset.autoGenerated !== 'true') {
        console.log('⏭️ Skipping auto-generation - back number manually entered');
        return;
    }
    
    try {
        console.log('🔎 Looking up master data for part number:', partNumber);
        const masterData = await lookupMasterData({ 品番: partNumber });
        if (masterData && masterData.背番号) {
            backNumberInput.value = masterData.背番号;
            backNumberInput.dataset.autoGenerated = 'true';
            showAutoGenerationNotification('背番号', masterData.背番号);
            console.log('✅ Auto-generated back number:', masterData.背番号);
            // Trigger inventory check after auto-generation
            await checkModalInventoryAvailability();
        } else {
            // If no master data found and previous value was auto-generated, clear it
            if (backNumberInput.dataset.autoGenerated === 'true') {
                backNumberInput.value = '';
                backNumberInput.dataset.autoGenerated = 'false';
                showAutoGenerationNotification('背番号', 'cleared (not found in master DB)');
                // Clear inventory check result
                document.getElementById('modalInventoryCheckResult').innerHTML = '';
            }
            console.log('❌ No master data found for part number:', partNumber);
        }
    } catch (error) {
        console.error('Error auto-generating back number:', error);
        // Clear auto-generated value on error
        if (backNumberInput.dataset.autoGenerated === 'true') {
            backNumberInput.value = '';
            backNumberInput.dataset.autoGenerated = 'false';
            document.getElementById('modalInventoryCheckResult').innerHTML = '';
        }
    }
}

/**
 * Handle back number blur for auto-generation
 */
async function handleBackNumberBlur() {
    const backNumber = document.getElementById('modalNodaBackNumber').value.trim();
    const partNumberInput = document.getElementById('modalNodaPartNumber');
    
    console.log('🔍 Back number blur event:', backNumber);
    
    // If back number is empty, clear the part number if it was auto-generated
    if (!backNumber) {
        if (partNumberInput.dataset.autoGenerated === 'true') {
            partNumberInput.value = '';
            partNumberInput.dataset.autoGenerated = 'false';
        }
        // Clear inventory check result
        document.getElementById('modalInventoryCheckResult').innerHTML = '';
        return;
    }
    
    // Don't auto-generate if part number is manually filled (not auto-generated)
    if (partNumberInput.value.trim() && partNumberInput.dataset.autoGenerated !== 'true') {
        console.log('⏭️ Skipping auto-generation - part number manually entered');
        // Always trigger inventory check when back number changes
        await checkModalInventoryAvailability();
        return;
    }
    
    try {
        console.log('🔎 Looking up master data for back number:', backNumber);
        const masterData = await lookupMasterData({ 背番号: backNumber });
        if (masterData && masterData.品番) {
            partNumberInput.value = masterData.品番;
            partNumberInput.dataset.autoGenerated = 'true';
            showAutoGenerationNotification('品番', masterData.品番);
            console.log('✅ Auto-generated part number:', masterData.品番);
        } else {
            // If no master data found and previous value was auto-generated, clear it
            if (partNumberInput.dataset.autoGenerated === 'true') {
                partNumberInput.value = '';
                partNumberInput.dataset.autoGenerated = 'false';
                showAutoGenerationNotification('品番', 'cleared (not found in master DB)');
            }
            console.log('❌ No master data found for back number:', backNumber);
        }
    } catch (error) {
        console.error('Error auto-generating part number:', error);
        // Clear auto-generated value on error
        if (partNumberInput.dataset.autoGenerated === 'true') {
            partNumberInput.value = '';
            partNumberInput.dataset.autoGenerated = 'false';
        }
    }
    
    // Always trigger inventory check when back number changes
    await checkModalInventoryAvailability();
}

/**
 * Lookup master data from database
 */
async function lookupMasterData(query) {
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
 * Get user's full name from database (similar to approvals system)
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
function showAutoGenerationNotification(fieldName, value) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse';
    notification.innerHTML = `
        <i class="ri-information-line mr-1"></i>
        ${t('autoGenerated')} ${fieldName}: ${value}
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

/**
 * Check inventory availability in modal
 */
async function checkModalInventoryAvailability() {
    const backNumber = document.getElementById('modalNodaBackNumber').value.trim();
    const quantity = parseInt(document.getElementById('modalNodaQuantity').value) || 0;
    const resultDiv = document.getElementById('modalInventoryCheckResult');
    
    if (!backNumber) {
        resultDiv.innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'checkInventory',
                背番号: backNumber
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.inventory) {
                // Use availableQuantity (the correct two-stage inventory field)
                const available = result.inventory.availableQuantity || result.inventory.runningQuantity || 0;
                const isEnough = quantity <= available;
                
                resultDiv.innerHTML = `
                    <span class="${isEnough ? 'text-green-600' : 'text-red-600'}">
                        <i class="ri-${isEnough ? 'checkbox-circle' : 'error-warning'}-line mr-1"></i>
                        ${t('availableQuantity')}: ${available} ${quantity > 0 ? `(${isEnough ? t('sufficient') : t('insufficient')})` : ''}
                    </span>
                `;
                
                // Update input border color based on availability
                const quantityInput = document.getElementById('modalNodaQuantity');
                if (quantity > 0) {
                    if (isEnough) {
                        quantityInput.classList.remove('border-red-500');
                        quantityInput.classList.add('border-green-500');
                    } else {
                        quantityInput.classList.remove('border-green-500');
                        quantityInput.classList.add('border-red-500');
                    }
                }
            } else {
                resultDiv.innerHTML = `<span class="text-red-600"><i class="ri-error-warning-line mr-1"></i>${t('itemNotFoundInInventory')}</span>`;
                const backNumberInput = document.getElementById('modalNodaBackNumber');
                backNumberInput.classList.remove('border-green-500');
                backNumberInput.classList.add('border-red-500');
            }
        }
    } catch (error) {
        console.error('Error checking inventory:', error);
        resultDiv.innerHTML = `<span class="text-red-600"><i class="ri-error-warning-line mr-1"></i>${t('errorCheckingInventory')}</span>`;
    }
}

/**
 * Handle form submission
 */
async function handleNodaAddFormSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🚀 Form submission started...');
    
    const partNumber = document.getElementById('modalNodaPartNumber').value.trim();
    const backNumber = document.getElementById('modalNodaBackNumber').value.trim();
    const quantity = parseInt(document.getElementById('modalNodaQuantity').value);
    const date = document.getElementById('modalNodaDate').value;
    
    console.log('📋 Form data:', { partNumber, backNumber, quantity, date });
    
    // Validation
    let hasErrors = false;
    
    if (!partNumber) {
        showFieldError('modalNodaPartNumber', 'Part number is required');
        hasErrors = true;
    }
    
    if (!backNumber) {
        showFieldError('modalNodaBackNumber', 'Back number is required');
        hasErrors = true;
    }
    
    if (!quantity || quantity <= 0) {
        showFieldError('modalNodaQuantity', 'Valid quantity is required');
        hasErrors = true;
    }
    
    if (!date) {
        showFieldError('modalNodaDate', 'Pickup date is required');
        hasErrors = true;
    }
    
    if (hasErrors) {
        console.log('❌ Form validation failed');
        return false;
    }
    
    // Check inventory availability before submission
    try {
        console.log('🔍 Checking inventory...');
        const inventoryCheck = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'checkInventory',
                背番号: backNumber
            })
        });
        
        const inventoryResult = await inventoryCheck.json();
        console.log('📦 Inventory check result:', inventoryResult);
        
        if (!inventoryResult.success) {
            alert('❌ Inventory Error: Item not found in inventory database.\n\nPlease check the back number and try again.');
            showFieldError('modalNodaBackNumber', 'Not found in inventory');
            return false;
        }
        
        const available = inventoryResult.inventory.runningQuantity;
        if (available < quantity) {
            alert(`❌ Insufficient Inventory!\n\nRequested: ${quantity}\nAvailable: ${available}\n\nPlease reduce the quantity or check inventory levels.`);
            showFieldError('modalNodaQuantity', 'Insufficient inventory');
            return false;
        }
        
        console.log('✅ Inventory check passed');
        
    } catch (error) {
        console.error('❌ Error checking inventory:', error);
        alert('❌ Error checking inventory: ' + error.message);
        return false;
    }
    
    // Disable submit button to prevent double submission
    const submitBtn = document.querySelector('#nodaAddForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="ri-loader-4-line animate-spin mr-2"></i>Creating...';
    
    try {
        console.log('💾 Creating request...');
        
        // Get current user information and fetch full name from database
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        console.log('👤 Current user object:', currentUser);
        
        const userName = await getUserFullName(currentUser.username || 'unknown');
        console.log('🏷️ Final userName from database:', userName);
        
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'createRequest',
                data: {
                    品番: partNumber,
                    背番号: backNumber,
                    quantity: quantity,
                    date: date,
                    userName: userName
                }
            })
        });
        
        const result = await response.json();
        console.log('📤 Create request result:', result);
        
        if (result.success) {
            // Show success message with request details
            alert(`✅ Request Created Successfully!\n\nRequest Number: ${result.data.requestNumber}\nPart Number: ${partNumber}\nBack Number: ${backNumber}\nQuantity: ${quantity}`);
            
            // Close modal and refresh only the NODA data (not the entire page)
            closeNodaAddModal();
            await loadNodaData(); // Wait for data to load
            console.log('✅ NODA data refreshed');
        } else {
            console.error('❌ Request creation failed:', result.error);
            alert('❌ Error creating request: ' + (result.error || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('❌ Error creating request:', error);
        alert('❌ Error creating request: ' + error.message);
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
    
    return false; // Prevent any default form submission
}

/**
 * Show field validation error
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    field.classList.remove('border-gray-300', 'border-green-500');
    field.classList.add('border-red-500');
    
    // You could also show the error message in a tooltip or below the field
    // For now, we'll just use the visual border indication
}

/**
 * Legacy function for compatibility (if called from elsewhere)
 */
window.addNodaRequest = function() {
    console.warn('addNodaRequest() is deprecated. Use openNodaAddModal() instead.');
    openNodaAddModal();
};

// ==================== CSV UPLOAD FUNCTIONALITY ====================

/**
 * Trigger CSV upload
 */
window.triggerNodaCsvUpload = function() {
    document.getElementById('nodaCsvFileInput').click();
};

/**
 * Handle CSV file upload
 */
window.handleNodaCsvUpload = function(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        showToast('Please select a valid CSV file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csv = e.target.result;
        parseAndShowCsvReview(csv);
    };
    reader.readAsText(file, 'Shift_JIS'); // JIS encoding
};

/**
 * Parse CSV and show review modal
 */
async function parseAndShowCsvReview(csvData) {
    try {
        console.log('📋 Parsing CSV data...');
        
        // Parse CSV (comma delimited)
        const lines = csvData.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            showToast('CSV file must contain header and at least one data row', 'error');
            return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim());
        console.log('📋 CSV Headers:', headers);
        
        // Detect CSV format based on headers
        let formatType = null;
        let dateColumn = null;
        let itemColumn = null;
        let quantityColumn = null;
        
        // Check for Japanese headers
        if (headers.includes('日付') && headers.includes('背番号') && headers.includes('収容数')) {
            formatType = '背番号';
            dateColumn = '日付';
            itemColumn = '背番号';
            quantityColumn = '収容数';
        } else if (headers.includes('日付') && headers.includes('品番') && headers.includes('収容数')) {
            formatType = '品番';
            dateColumn = '日付';
            itemColumn = '品番';
            quantityColumn = '収容数';
        } else {
            showToast('Invalid CSV format. Expected headers: 日付,背番号,収容数 or 日付,品番,収容数', 'error');
            return;
        }
        
        console.log(`📋 Detected CSV format: ${formatType}`);
        
        // Parse data rows
        const rawItems = [];
        const dates = new Set();
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length < headers.length) continue;
            
            const rowData = {};
            headers.forEach((header, index) => {
                rowData[header] = values[index];
            });
            
            const date = rowData[dateColumn];
            const item = rowData[itemColumn];
            const quantity = parseInt(rowData[quantityColumn]);
            
            if (date && item && quantity > 0) {
                dates.add(date);
                rawItems.push({
                    date: date,
                    [formatType]: item,
                    quantity: quantity,
                    rowIndex: i
                });
            }
        }
        
        // Validate dates (all must be the same)
        if (dates.size === 0) {
            showToast('No valid data rows found in CSV', 'error');
            return;
        }
        
        if (dates.size > 1) {
            showToast(`Invalid CSV: Multiple dates detected (${Array.from(dates).join(', ')}). All items in a picking order must have the same date.`, 'error');
            return;
        }
        
        const pickupDate = Array.from(dates)[0];
        console.log(`📋 Single pickup date detected: ${pickupDate}`);
        console.log(`📋 Found ${rawItems.length} valid items`);
        
        // Process items and auto-fill missing data
        const processedItems = [];
        for (const item of rawItems) {
            const processedItem = { ...item };
            
            try {
                // Auto-fill missing data using master database lookup
                if (formatType === '背番号') {
                    // CSV has 背番号, lookup 品番
                    const lookupResult = await lookupMasterData('背番号', item.背番号);
                    if (lookupResult.success) {
                        processedItem.品番 = lookupResult.data.品番;
                        processedItem.品名 = lookupResult.data.品名;
                    } else {
                        processedItem.品番 = 'Not found';
                        processedItem.error = 'Master data not found';
                    }
                } else {
                    // CSV has 品番, lookup 背番号
                    const lookupResult = await lookupMasterData('品番', item.品番);
                    if (lookupResult.success) {
                        processedItem.背番号 = lookupResult.data.背番号;
                        processedItem.品名 = lookupResult.data.品名;
                    } else {
                        processedItem.背番号 = 'Not found';
                        processedItem.error = 'Master data not found';
                    }
                }
                
                // Check inventory availability
                const backNumber = processedItem.背番号;
                if (backNumber && backNumber !== 'Not found') {
                    const inventoryResult = await getInventoryAvailability(backNumber);
                    if (inventoryResult.success) {
                        processedItem.availableQuantity = inventoryResult.availableQuantity;
                        processedItem.status = inventoryResult.availableQuantity >= processedItem.quantity ? 'Valid' : 'Insufficient';
                    } else {
                        processedItem.availableQuantity = 0;
                        processedItem.status = 'No inventory';
                        processedItem.error = processedItem.error || 'Inventory not found';
                    }
                } else {
                    processedItem.availableQuantity = 0;
                    processedItem.status = 'Invalid';
                }
                
            } catch (error) {
                console.error(`Error processing item ${item[formatType]}:`, error);
                processedItem.error = error.message;
                processedItem.status = 'Error';
            }
            
            processedItems.push(processedItem);
        }
        
        // Show review modal
        showCsvReviewModal(processedItems, pickupDate, formatType);
        
    } catch (error) {
        console.error('Error parsing CSV:', error);
        showToast('Error parsing CSV file: ' + error.message, 'error');
    }
}

/**
 * Lookup master data for auto-fill
 */
async function lookupMasterData(searchType, searchValue) {
    try {
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'lookupMasterData',
                [searchType]: searchValue
            })
        });
        
        const result = await response.json();
        return result;
        
    } catch (error) {
        console.error('Error looking up master data:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Show CSV review modal
 */
function showCsvReviewModal(items, pickupDate, formatType) {
    // Create modal HTML
    const modalHtml = `
        <div id="csvReviewModal" class="fixed inset-0 z-50 overflow-y-auto">
            <div class="flex min-h-screen items-center justify-center p-4">
                <div class="fixed inset-0 bg-black bg-opacity-50"></div>
                <div class="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">CSV Upload Review</h3>
                        <p class="text-sm text-gray-600">Review the parsed data before creating bulk request</p>
                    </div>
                    
                    <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <div class="grid grid-cols-3 gap-4 text-sm">
                            <div><strong>Format Detected:</strong> ${formatType} based CSV</div>
                            <div><strong>Pickup Date:</strong> ${pickupDate}</div>
                            <div><strong>Total Items:</strong> ${items.length}</div>
                        </div>
                    </div>
                    
                    <div class="overflow-y-auto max-h-96 px-6 py-4">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-100 sticky top-0">
                                <tr>
                                    <th class="px-3 py-2 text-left">Row</th>
                                    <th class="px-3 py-2 text-left">品番</th>
                                    <th class="px-3 py-2 text-left">背番号</th>
                                    <th class="px-3 py-2 text-left">品名</th>
                                    <th class="px-3 py-2 text-left">Quantity</th>
                                    <th class="px-3 py-2 text-left">Available</th>
                                    <th class="px-3 py-2 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr class="border-b border-gray-200 ${item.status === 'Valid' ? '' : 'bg-red-50'}">
                                        <td class="px-3 py-2">${item.rowIndex}</td>
                                        <td class="px-3 py-2">${item.品番 || '-'}</td>
                                        <td class="px-3 py-2">${item.背番号 || '-'}</td>
                                        <td class="px-3 py-2 text-xs">${item.品名 || '-'}</td>
                                        <td class="px-3 py-2">${item.quantity}</td>
                                        <td class="px-3 py-2">${item.availableQuantity || 0}</td>
                                        <td class="px-3 py-2">
                                            <span class="px-2 py-1 text-xs font-medium rounded-full ${
                                                item.status === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }">
                                                ${item.status}
                                            </span>
                                            ${item.error ? `<div class="text-xs text-red-600 mt-1">${item.error}</div>` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div class="flex justify-between items-center">
                            <div class="text-sm text-gray-600">
                                Valid: ${items.filter(i => i.status === 'Valid').length} | 
                                Invalid: ${items.filter(i => i.status !== 'Valid').length}
                            </div>
                            <div class="flex space-x-3">
                                <button onclick="closeCsvReviewModal()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button onclick="submitCsvBulkRequest()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${items.filter(i => i.status === 'Valid').length === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
                                    Create Bulk Request (${items.filter(i => i.status === 'Valid').length} items)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Store data for submission
    window.csvReviewData = {
        items: items.filter(i => i.status === 'Valid'), // Only valid items
        pickupDate: pickupDate
    };
}

/**
 * Close CSV review modal
 */
window.closeCsvReviewModal = function() {
    const modal = document.getElementById('csvReviewModal');
    if (modal) {
        modal.remove();
    }
    window.csvReviewData = null;
};

/**
 * Submit CSV bulk request
 */
window.submitCsvBulkRequest = async function() {
    if (!window.csvReviewData || window.csvReviewData.items.length === 0) {
        showToast('No valid items to submit', 'error');
        return;
    }
    
    try {
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const userName = await getUserFullName(currentUser.username || 'unknown');
        
        // Prepare bulk request data (same format as cart system)
        const requestData = {
            action: 'bulkCreateRequests',
            data: {
                items: window.csvReviewData.items.map(item => ({
                    品番: item.品番,
                    背番号: item.背番号,
                    quantity: item.quantity
                })),
                pickupDate: window.csvReviewData.pickupDate
            },
            userName: userName
        };
        
        console.log('📤 Submitting CSV bulk request:', requestData);
        
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Successfully created bulk request: ${result.bulkRequestNumber}`, 'success');
            closeCsvReviewModal();
            loadNodaData(); // Refresh the data
        } else {
            showToast('Error creating bulk request: ' + (result.error || 'Unknown error'), 'error');
        }
        
    } catch (error) {
        console.error('Error submitting CSV bulk request:', error);
        showToast('Error submitting bulk request: ' + error.message, 'error');
    }
};

// ==================== EXPORT FUNCTIONALITY ====================

/**
 * Export NODA data to CSV
 */
window.exportNodaData = async function() {
    try {
        const filters = buildNodaQueryFilters();
        
        const response = await fetch(`${BASE_URL}/api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'exportRequests',
                filters: filters
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                downloadNodaCsv(result.data);
            } else {
                alert('Error exporting data: ' + result.error);
            }
        } else {
            alert('Error exporting data');
        }
        
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Error exporting data: ' + error.message);
    }
};

/**
 * Download CSV file
 */
function downloadNodaCsv(data) {
    if (data.length === 0) {
        alert('No data to export');
        return;
    }
    
    const headers = ['Request Number', 'Status', '品番', '背番号', 'Pickup Date', 'Quantity', 'Created At'];
    const csvContent = [
        headers.join(','),
        ...data.map(item => [
            item.requestNumber,
            item.status,
            item.品番,
            item.背番号,
            new Date(item.date).toLocaleDateString(),
            item.quantity,
            new Date(item.createdAt).toLocaleString()
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `noda_requests_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==================== MODAL FUNCTIONALITY ====================

/**
 * Open NODA detail modal
 */
window.openNodaDetail = async function(requestId) {
    try {
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getRequestById',
                requestId: requestId
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showNodaDetailModal(result.data, false); // false = view mode
            } else {
                alert('Error loading request details: ' + result.error);
            }
        }
        
    } catch (error) {
        console.error('Error loading request details:', error);
        alert('Error loading request details: ' + error.message);
    }
};

/**
 * Open NODA edit modal
 */
window.editNodaRequest = async function(requestId) {
    try {
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getRequestById',
                requestId: requestId
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showNodaDetailModal(result.data, true); // true = edit mode
            } else {
                alert('Error loading request details: ' + result.error);
            }
        }
        
    } catch (error) {
        console.error('Error loading request details:', error);
        alert('Error loading request details: ' + error.message);
    }
};

/**
 * Show NODA detail/edit modal
 */
function showNodaDetailModal(request, isEditMode = false) {
    const modal = document.getElementById('nodaDetailModal');
    const content = document.getElementById('nodaDetailContent');
    
    const statusInfo = getNodaStatusInfo(request.status);
    const createdDate = new Date(request.createdAt).toLocaleString();
    
    // Handle both single and bulk requests
    const isBulkRequest = request.requestType === 'bulk';
    const pickupDate = isBulkRequest ? 
        new Date(request.pickupDate).toLocaleDateString() : 
        new Date(request.date).toLocaleDateString();
    
    let contentHTML = '';
    
    if (isBulkRequest) {
        // Check if request is pending and in edit mode for "Add More Items" functionality
        const canAddMoreItems = isEditMode && request.status === 'pending';
        
        // Bulk request display
        contentHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Request Number</label>
                            <p class="mt-1 text-lg font-semibold text-blue-600">${request.requestNumber}</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Type</label>
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                <i class="ri-stack-line mr-1"></i>
                                Bulk Request
                            </span>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Overall Status</label>
                            <div class="mt-1">
                                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.badgeClass}">
                                    <i class="${statusInfo.icon} mr-1"></i>
                                    ${statusInfo.text}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Pickup Date</label>
                            <p class="mt-1 text-gray-900">${pickupDate}</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Total Items</label>
                            <p class="mt-1 text-gray-900">${request.totalItems || (request.lineItems ? request.lineItems.length : 0)}</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Created At</label>
                            <p class="mt-1 text-gray-600">${createdDate}</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Created By</label>
                            <p class="mt-1 text-gray-600">${request.createdBy || 'Unknown'}</p>
                        </div>
                    </div>
                </div>
                
                ${canAddMoreItems ? `
                    <!-- Tab Navigation for Edit Mode -->
                    <div class="border-t pt-6">
                        <nav class="flex space-x-1 mb-4">
                            <button id="existingItemsTab" onclick="switchEditTab('existing')" class="edit-tab-button active px-4 py-2 border-b-2 border-blue-500 text-blue-600 font-medium">
                                <i class="ri-list-check mr-2"></i>Existing Items
                            </button>
                            <button id="addItemsTab" onclick="switchEditTab('add')" class="edit-tab-button px-4 py-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                                <i class="ri-add-line mr-2"></i>Add More Items
                            </button>
                        </nav>
                        
                        <!-- Existing Items Tab -->
                        <div id="existingItemsContent" class="edit-tab-content">
                ` : `
                    <!-- Line Items Table -->
                    <div class="border-t pt-6">
                `}
                        <h4 class="text-lg font-medium text-gray-900 mb-4">Line Items</h4>
                        <div class="overflow-x-auto">
                            <table class="min-w-full border border-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Line #</th>
                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">品番</th>
                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">背番号</th>
                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        ${isEditMode ? '<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>' : ''}
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${request.lineItems ? request.lineItems.map(lineItem => {
                                        const lineStatusInfo = getNodaStatusInfo(lineItem.status);
                                        return `
                                            <tr>
                                                <td class="px-4 py-2 text-sm font-medium text-gray-900">${lineItem.lineNumber}</td>
                                                <td class="px-4 py-2 text-sm text-gray-900">${lineItem.品番}</td>
                                                <td class="px-4 py-2 text-sm text-gray-900">${lineItem.背番号}</td>
                                                <td class="px-4 py-2 text-sm text-gray-900">${lineItem.quantity}</td>
                                                <td class="px-4 py-2 text-sm">
                                                    ${isEditMode ? `
                                                        <select id="lineStatus_${lineItem.lineNumber}" class="text-xs px-2 py-1 border border-gray-300 rounded" onchange="updateLineItemStatus('${request._id}', ${lineItem.lineNumber}, this.value)">
                                                            <option value="pending" ${lineItem.status === 'pending' ? 'selected' : ''}>Pending</option>
                                                            <option value="in-progress" ${lineItem.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                                            <option value="completed" ${lineItem.status === 'completed' ? 'selected' : ''} ${lineItem.status === 'in-progress' ? 'disabled' : ''}>Completed ${lineItem.status === 'in-progress' ? '(ESP32 Only)' : ''}</option>
                                                        </select>
                                                        ${lineItem.status === 'in-progress' ? '<div class="text-xs text-orange-600 mt-1">⚠️ Only ESP32 can complete in-progress items</div>' : ''}
                                                    ` : `
                                                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${lineStatusInfo.badgeClass}">
                                                            <i class="${lineStatusInfo.icon} mr-1"></i>
                                                            ${lineStatusInfo.text}
                                                        </span>
                                                    `}
                                                </td>
                                                ${isEditMode ? `
                                                    <td class="px-4 py-2 text-sm">
                                                        <button onclick="markLineItemCompleted('${request._id}', ${lineItem.lineNumber})" class="text-green-600 hover:text-green-800 text-xs" ${lineItem.status === 'completed' ? 'disabled' : ''}>
                                                            <i class="ri-check-line"></i> Complete
                                                        </button>
                                                    </td>
                                                ` : ''}
                                            </tr>
                                        `;
                                    }).join('') : '<tr><td colspan="6" class="text-center py-4 text-gray-500">No line items found</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                ${canAddMoreItems ? `
                        </div>
                        
                        <!-- Add More Items Tab -->
                        <div id="addItemsContent" class="edit-tab-content hidden">
                            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                <div class="flex">
                                    <i class="ri-information-line text-yellow-600 mr-2"></i>
                                    <div>
                                        <h5 class="text-sm font-medium text-yellow-800">Add More Items</h5>
                                        <p class="text-sm text-yellow-700 mt-1">You can add more items to this picking request. Items will be added to the same pickup date (${pickupDate}).</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Add Items Options -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div class="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                                    <div class="text-center">
                                        <i class="ri-add-box-line text-3xl text-blue-600 mb-3"></i>
                                        <h3 class="text-lg font-medium text-gray-900 mb-2">Add Single Item</h3>
                                        <p class="text-sm text-gray-600 mb-4">Add individual items one by one</p>
                                        <button onclick="showAddSingleItemForm()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                            <i class="ri-add-line mr-2"></i>Add Item
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-green-400 transition-colors">
                                    <div class="text-center">
                                        <i class="ri-file-upload-line text-3xl text-green-600 mb-3"></i>
                                        <h3 class="text-lg font-medium text-gray-900 mb-2">Upload CSV</h3>
                                        <p class="text-sm text-gray-600 mb-4">Bulk add items from CSV file</p>
                                        <button onclick="triggerEditCsvUpload()" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                                            <i class="ri-upload-line mr-2"></i>Upload CSV
                                        </button>
                                        <input type="file" id="editCsvFileInput" accept=".csv" style="display: none;" onchange="handleEditCsvUpload(this)">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Single Item Add Form (Initially Hidden) -->
                            <div id="singleItemAddForm" class="hidden bg-gray-50 rounded-lg p-6 mb-6">
                                <h4 class="text-lg font-medium text-gray-900 mb-4">Add Single Item</h4>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">品番</label>
                                        <input type="text" id="editModal品番" class="w-full p-2 border border-gray-300 rounded-md" placeholder="Enter part number">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">背番号</label>
                                        <input type="text" id="editModal背番号" class="w-full p-2 border border-gray-300 rounded-md" placeholder="Enter back number">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                                        <input type="number" id="editModalQuantity" min="1" class="w-full p-2 border border-gray-300 rounded-md" placeholder="Enter quantity">
                                    </div>
                                </div>
                                
                                <div id="editModalInventoryResult" class="mt-4"></div>
                                
                                <div class="flex justify-end space-x-3 mt-4">
                                    <button onclick="cancelAddSingleItem()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                                        Cancel
                                    </button>
                                    <button onclick="addSingleItemToRequest('${request._id}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                        <i class="ri-add-line mr-2"></i>Add Item
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Added Items Cart -->
                            <div id="editAddedItemsCart" class="hidden bg-blue-50 rounded-lg p-6">
                                <h4 class="text-lg font-medium text-gray-900 mb-4">
                                    <i class="ri-shopping-cart-line mr-2"></i>Items to Add
                                    <span id="editCartItemCount" class="text-sm text-gray-600 ml-2">(0 items)</span>
                                </h4>
                                <div id="editCartItemsList" class="space-y-2 mb-4"></div>
                                <div class="flex justify-end space-x-3">
                                    <button onclick="clearEditCart()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                                        Clear All
                                    </button>
                                    <button onclick="submitAddedItems('${request._id}')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                        <i class="ri-check-line mr-2"></i>Add All Items
                                    </button>
                                </div>
                            </div>
                        </div>
                ` : ''}
                    </div>
                
                <div class="flex justify-end pt-6 border-t">
                    <button onclick="closeNodaModal()" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        `;
    } else {
        // Single request display (existing functionality)
        contentHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Request Number</label>
                            <p class="mt-1 text-lg font-semibold text-blue-600">${request.requestNumber}</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Type</label>
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                <i class="ri-file-line mr-1"></i>
                                Single Request
                            </span>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Status</label>
                            <div class="mt-1">
                                ${isEditMode ? `
                                    <select id="editStatus" class="w-full p-2 border border-gray-300 rounded-md">
                                        <option value="pending" ${request.status === 'pending' ? 'selected' : ''}>Pending</option>
                                        <option value="active" ${request.status === 'active' ? 'selected' : ''}>Active</option>
                                        <option value="complete" ${request.status === 'complete' ? 'selected' : ''}>Complete</option>
                                        <option value="failed" ${request.status === 'failed' ? 'selected' : ''}>Failed</option>
                                    </select>
                                ` : `
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.badgeClass}">
                                        <i class="${statusInfo.icon} mr-1"></i>
                                        ${statusInfo.text}
                                    </span>
                                `}
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">品番</label>
                            ${isEditMode ? `
                                <input type="text" id="edit品番" value="${request.品番}" class="mt-1 w-full p-2 border border-gray-300 rounded-md">
                            ` : `
                                <p class="mt-1 text-gray-900">${request.品番}</p>
                            `}
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">背番号</label>
                            ${isEditMode ? `
                                <input type="text" id="edit背番号" value="${request.背番号}" class="mt-1 w-full p-2 border border-gray-300 rounded-md">
                            ` : `
                                <p class="mt-1 text-gray-900">${request.背番号}</p>
                            `}
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Pickup Date</label>
                            ${isEditMode ? `
                                <input type="date" id="editDate" value="${request.date}" class="mt-1 w-full p-2 border border-gray-300 rounded-md">
                            ` : `
                                <p class="mt-1 text-gray-900">${pickupDate}</p>
                            `}
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Quantity</label>
                            ${isEditMode ? `
                                <input type="number" id="editQuantity" value="${request.quantity}" min="1" class="mt-1 w-full p-2 border border-gray-300 rounded-md">
                            ` : `
                                <p class="mt-1 text-gray-900">${request.quantity}</p>
                            `}
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Created At</label>
                            <p class="mt-1 text-gray-600">${createdDate}</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Created By</label>
                            <p class="mt-1 text-gray-600">${request.createdBy || 'Unknown'}</p>
                        </div>
                    </div>
                </div>
                
                ${isEditMode ? `
                    <div class="flex justify-end space-x-3 pt-6 border-t">
                        <button onclick="closeNodaModal()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                            Cancel
                        </button>
                        <button onclick="saveNodaRequest('${request._id}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            Save Changes
                        </button>
                    </div>
                ` : `
                    <div class="flex justify-end pt-6 border-t">
                        <button onclick="closeNodaModal()" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                            Close
                        </button>
                    </div>
                `}
            </div>
        `;
    }
    
    content.innerHTML = contentHTML;
    modal.classList.remove('hidden');
}

/**
 * Close NODA modal
 */
window.closeNodaModal = function() {
    const modal = document.getElementById('nodaDetailModal');
    modal.classList.add('hidden');
};

/**
 * Save NODA request changes
 */
window.saveNodaRequest = async function(requestId) {
    const updatedData = {
        status: document.getElementById('editStatus').value,
        品番: document.getElementById('edit品番').value.trim(),
        背番号: document.getElementById('edit背番号').value.trim(),
        date: document.getElementById('editDate').value,
        quantity: parseInt(document.getElementById('editQuantity').value)
    };
    
    // Validation
    if (!updatedData.品番 || !updatedData.背番号 || !updatedData.date || !updatedData.quantity) {
        alert('Please fill in all fields');
        return;
    }
    
    if (updatedData.quantity <= 0) {
        alert('Quantity must be greater than 0');
        return;
    }
    
    try {
        const response = await fetch(`${BASE_URL}/api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'updateRequest',
                requestId: requestId,
                data: updatedData
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Request updated successfully!');
            closeNodaModal();
            loadNodaData();
        } else {
            alert('Error updating request: ' + (result.error || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error updating request:', error);
        alert('Error updating request: ' + error.message);
    }
};

/**
 * Delete NODA request
 */
window.deleteNodaRequest = async function(requestId) {
    if (!confirm('Are you sure you want to delete this request?')) {
        return;
    }
    
    try {
        // Get current user information
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const userName = await getUserFullName(currentUser.username || 'Unknown User');
        
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'deleteRequest',
                requestId: requestId,
                userName: userName
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Request deleted successfully!');
            loadNodaData();
        } else {
            alert('Error deleting request: ' + (result.error || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error deleting request:', error);
        alert('Error deleting request: ' + error.message);
    }
};

// ==================== BULK REQUEST CART SYSTEM ====================

// Cart state management
let nodaCart = [];
let currentStep = 1;

// Persistent cart storage
const CART_STORAGE_KEY = 'nodaCart';
const CART_DATE_STORAGE_KEY = 'nodaCartPickupDate';

/**
 * Load cart from localStorage
 */
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        const savedDate = localStorage.getItem(CART_DATE_STORAGE_KEY);
        
        if (savedCart) {
            nodaCart = JSON.parse(savedCart);
        }
        
        if (savedDate) {
            const bulkPickupDate = document.getElementById('bulkPickupDate');
            if (bulkPickupDate) {
                bulkPickupDate.value = savedDate;
            }
        }
        
        updateCartDisplay();
    } catch (error) {
        console.error('Error loading cart from storage:', error);
        nodaCart = [];
    }
}

/**
 * Save cart to localStorage
 */
function saveCartToStorage() {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nodaCart));
        
        const bulkPickupDate = document.getElementById('bulkPickupDate');
        if (bulkPickupDate && bulkPickupDate.value) {
            localStorage.setItem(CART_DATE_STORAGE_KEY, bulkPickupDate.value);
        }
    } catch (error) {
        console.error('Error saving cart to storage:', error);
    }
}

/**
 * Clear cart storage
 */
function clearCartStorage() {
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem(CART_DATE_STORAGE_KEY);
    nodaCart = [];
}

/**
 * Open NODA add modal and reset to step 1
 */
function openNodaAddModal() {
    currentStep = 1;
    loadCartFromStorage();
    showStep(1);
    document.getElementById('nodaAddModal').classList.remove('hidden');
    
    // Set default pickup date to tomorrow if not set
    const bulkPickupDate = document.getElementById('bulkPickupDate');
    if (!bulkPickupDate.value) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        bulkPickupDate.value = tomorrow.toISOString().split('T')[0];
        saveCartToStorage();
    }
    
    // Setup auto-fill and inventory checking
    setupModalAutoGeneration();
    setupModalInventoryChecking();
}

/**
 * Close NODA add modal
 */
function closeNodaAddModal() {
    document.getElementById('nodaAddModal').classList.add('hidden');
    resetModalForm();
}

/**
 * Reset modal form
 */
function resetModalForm() {
    const partNumberInput = document.getElementById('modalNodaPartNumber');
    const backNumberInput = document.getElementById('modalNodaBackNumber');
    const quantityInput = document.getElementById('modalNodaQuantity');
    const resultDiv = document.getElementById('modalInventoryCheckResult');
    
    if (partNumberInput) {
        partNumberInput.value = '';
        partNumberInput.dataset.autoGenerated = 'false';
    }
    
    if (backNumberInput) {
        backNumberInput.value = '';
        backNumberInput.dataset.autoGenerated = 'false';
    }
    
    if (quantityInput) {
        quantityInput.value = '';
    }
    
    if (resultDiv) {
        resultDiv.innerHTML = '';
    }
}

/**
 * Show specific step in the modal
 */
function showStep(step) {
    currentStep = step;
    
    // Hide all steps
    document.getElementById('addItemStep').classList.add('hidden');
    document.getElementById('reviewCartStep').classList.add('hidden');
    document.getElementById('submitStep').classList.add('hidden');
    
    // Reset step indicators
    resetStepIndicators();
    
    // Show current step
    switch(step) {
        case 1:
            document.getElementById('addItemStep').classList.remove('hidden');
            setStepActive('step1Indicator');
            break;
        case 2:
            document.getElementById('reviewCartStep').classList.remove('hidden');
            setStepActive('step2Indicator');
            populateReviewStep();
            break;
        case 3:
            document.getElementById('submitStep').classList.remove('hidden');
            setStepActive('step3Indicator');
            populateSubmitStep();
            break;
    }
}

/**
 * Reset step indicators
 */
function resetStepIndicators() {
    ['step1Indicator', 'step2Indicator', 'step3Indicator'].forEach(id => {
        const element = document.getElementById(id);
        element.classList.remove('text-blue-600');
        element.classList.add('text-gray-400');
        element.querySelector('div').classList.remove('bg-blue-600');
        element.querySelector('div').classList.add('bg-gray-300');
    });
}

/**
 * Set step as active
 */
function setStepActive(stepId) {
    const element = document.getElementById(stepId);
    element.classList.remove('text-gray-400');
    element.classList.add('text-blue-600');
    element.querySelector('div').classList.remove('bg-gray-300');
    element.querySelector('div').classList.add('bg-blue-600');
}

/**
 * Add item to cart with validation
 */
async function addItemToCart() {
    const partNumber = document.getElementById('modalNodaPartNumber').value.trim();
    const backNumber = document.getElementById('modalNodaBackNumber').value.trim();
    const quantity = parseInt(document.getElementById('modalNodaQuantity').value);
    const pickupDate = document.getElementById('bulkPickupDate').value;
    
    // Validation
    if (!partNumber || !backNumber || !quantity || !pickupDate) {
        alert('Please fill in all fields');
        return;
    }
    
    if (quantity <= 0) {
        alert('Quantity must be greater than 0');
        return;
    }
    
    // Check if item already exists in cart
    const existingItemIndex = nodaCart.findIndex(item => item.背番号 === backNumber);
    if (existingItemIndex !== -1) {
        if (confirm(`Item ${backNumber} already exists in cart. Do you want to update the quantity?`)) {
            nodaCart[existingItemIndex].quantity = quantity;
            nodaCart[existingItemIndex].品番 = partNumber; // Update part number in case it changed
        } else {
            return;
        }
    } else {
        // Check inventory availability using the same function as the display
        try {
            const response = await fetch(`${BASE_URL}api/noda-requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'checkInventory',
                    背番号: backNumber
                })
            });
            
            const result = await response.json();
            
            if (!result.success || !result.inventory) {
                alert('Item not found in inventory');
                return;
            }
            
            const availableQuantity = result.inventory.availableQuantity || 0;
            if (availableQuantity < quantity) {
                alert(`Insufficient inventory. Available: ${availableQuantity}, Requested: ${quantity}`);
                return;
            }
            
            // Add new item to cart
            nodaCart.push({
                品番: partNumber,
                背番号: backNumber,
                quantity: quantity,
                availableQuantity: availableQuantity,
                addedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error checking inventory:', error);
            alert('Error checking inventory. Please try again.');
            return;
        }
    }
    
    // Save and update display
    saveCartToStorage();
    updateCartDisplay();
    resetModalForm();
    
    // Show success message
    showToast(`Item ${backNumber} added to cart successfully!`, 'success');
}

/**
 * Remove item from cart
 */
function removeFromCart(backNumber) {
    if (confirm(`Are you sure you want to remove ${backNumber} from the cart?`)) {
        nodaCart = nodaCart.filter(item => item.背番号 !== backNumber);
        saveCartToStorage();
        updateCartDisplay();
        showToast(`Item ${backNumber} removed from cart`, 'info');
    }
}

/**
 * Update cart display
 */
function updateCartDisplay() {
    const cartItemsList = document.getElementById('cartItemsList');
    const cartItemCount = document.getElementById('cartItemCount');
    const proceedToReviewBtn = document.getElementById('proceedToReviewBtn');
    
    // Update item count
    cartItemCount.textContent = `${nodaCart.length} items`;
    
    // Enable/disable proceed button
    proceedToReviewBtn.disabled = nodaCart.length === 0;
    
    if (nodaCart.length === 0) {
        cartItemsList.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="ri-shopping-cart-line text-4xl text-gray-300"></i>
                <p class="mt-2 text-sm">No items in cart</p>
            </div>
        `;
        return;
    }
    
    // Display cart items
    cartItemsList.innerHTML = nodaCart.map(item => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex-1">
                <div class="flex items-center space-x-4">
                    <span class="font-medium text-gray-900">${item.背番号}</span>
                    <span class="text-gray-600">${item.品番}</span>
                    <span class="text-sm text-gray-500">Qty: ${item.quantity}</span>
                    <span class="text-xs text-green-600">Available: ${item.availableQuantity}</span>
                </div>
            </div>
            <button onclick="removeFromCart('${item.背番号}')" class="text-red-500 hover:text-red-700">
                <i class="ri-delete-bin-line"></i>
            </button>
        </div>
    `).join('');
}

/**
 * Proceed to review step
 */
function proceedToReview() {
    if (nodaCart.length === 0) {
        alert('Please add at least one item to the cart');
        return;
    }
    
    const pickupDate = document.getElementById('bulkPickupDate').value;
    if (!pickupDate) {
        alert('Please select a pickup date');
        return;
    }
    
    showStep(2);
}

/**
 * Populate review step
 */
async function populateReviewStep() {
    const pickupDate = document.getElementById('bulkPickupDate').value;
    document.getElementById('reviewPickupDate').textContent = new Date(pickupDate).toLocaleDateString();
    
    const reviewTableBody = document.getElementById('reviewTableBody');
    
    // Show loading
    reviewTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-4">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span class="ml-2">Checking inventory...</span>
            </td>
        </tr>
    `;
    
    // Re-validate all items
    const validatedItems = [];
    for (const item of nodaCart) {
        try {
            const inventoryCheck = await getInventoryAvailability(item.背番号);
            validatedItems.push({
                ...item,
                currentAvailable: inventoryCheck.availableQuantity || 0,
                status: inventoryCheck.success && inventoryCheck.availableQuantity >= item.quantity ? 'Valid' : 
                        inventoryCheck.success ? 'Insufficient Stock' : 'Error checking inventory'
            });
        } catch (error) {
            validatedItems.push({
                ...item,
                currentAvailable: 0,
                status: 'Error checking inventory'
            });
        }
    }
    
    // Update display
    reviewTableBody.innerHTML = validatedItems.map(item => `
        <tr>
            <td class="px-4 py-2 border-b">${item.品番}</td>
            <td class="px-4 py-2 border-b">${item.背番号}</td>
            <td class="px-4 py-2 border-b">${item.quantity}</td>
            <td class="px-4 py-2 border-b">${item.currentAvailable}</td>
            <td class="px-4 py-2 border-b">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${
                    item.status === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">${item.status}</span>
            </td>
        </tr>
    `).join('');
}

/**
 * Go back to add items step
 */
function backToAddItems() {
    showStep(1);
}

/**
 * Proceed to submit step
 */
function proceedToSubmit() {
    showStep(3);
}

/**
 * Populate submit step
 */
function populateSubmitStep() {
    const pickupDate = document.getElementById('bulkPickupDate').value;
    document.getElementById('submitPickupDate').textContent = new Date(pickupDate).toLocaleDateString();
    document.getElementById('submitTotalItems').textContent = `${nodaCart.length} items`;
}

/**
 * Go back to review step
 */
function backToReview() {
    showStep(2);
}

/**
 * Submit bulk request
 */
async function submitBulkRequest() {
    const submitProgress = document.getElementById('submitProgress');
    const submitBulkRequestBtn = document.getElementById('submitBulkRequestBtn');
    const backToReviewBtn = document.getElementById('backToReviewBtn');
    
    if (nodaCart.length === 0) {
        alert('No items in cart to submit');
        return;
    }
    
    const pickupDate = document.getElementById('bulkPickupDate').value;
    if (!pickupDate) {
        alert('Please select a pickup date');
        return;
    }
    
    // Show progress
    submitProgress.classList.remove('hidden');
    submitBulkRequestBtn.disabled = true;
    backToReviewBtn.disabled = true;
    
    try {
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const userName = await getUserFullName(currentUser.username || 'Unknown User');
        
        const requestData = {
            action: 'bulkCreateRequests',
            data: {
                pickupDate: pickupDate,
                items: nodaCart.map(item => ({
                    品番: item.品番,
                    背番号: item.背番号,
                    quantity: parseInt(item.quantity)
                }))
            },
            userName: userName
        };
        
        console.log('Submitting bulk request:', requestData);
        
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Clear cart and close modal
            clearCartStorage();
            closeNodaAddModal();
            
            // Show success message
            alert(`Bulk request submitted successfully!\nRequest Number: ${result.bulkRequestNumber}\nProcessed Items: ${result.processedItems}\nFailed Items: ${result.failedItems}`);
            
            // Reload data
            loadNodaData();
        } else {
            throw new Error(result.error || 'Failed to submit bulk request');
        }
        
    } catch (error) {
        console.error('Error submitting bulk request:', error);
        alert('Error submitting bulk request: ' + error.message);
    } finally {
        // Hide progress
        submitProgress.classList.add('hidden');
        submitBulkRequestBtn.disabled = false;
        backToReviewBtn.disabled = false;
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white font-medium transition-opacity duration-300 ${
        type === 'success' ? 'bg-green-600' : 
        type === 'error' ? 'bg-red-600' : 
        type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
    }`;
    toast.textContent = message;
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

/**
 * Setup auto-generation for part number and back number in cart system
 */
function setupModalAutoGeneration() {
    const partNumberInput = document.getElementById('modalNodaPartNumber');
    const backNumberInput = document.getElementById('modalNodaBackNumber');
    
    if (!partNumberInput || !backNumberInput) {
        console.warn('Auto-generation inputs not found in cart modal');
        return;
    }
    
    // Remove existing listeners to prevent duplicates
    partNumberInput.removeEventListener('blur', handleCartPartNumberBlur);
    backNumberInput.removeEventListener('blur', handleCartBackNumberBlur);
    
    // Add blur event listeners for auto-fill
    partNumberInput.addEventListener('blur', handleCartPartNumberBlur);
    backNumberInput.addEventListener('blur', handleCartBackNumberBlur);
    
    console.log('✅ Cart auto-generation listeners attached');
}

/**
 * Setup inventory checking for cart modal inputs
 */
function setupModalInventoryChecking() {
    const backNumberInput = document.getElementById('modalNodaBackNumber');
    const quantityInput = document.getElementById('modalNodaQuantity');
    
    if (!backNumberInput || !quantityInput) {
        console.warn('Inventory checking inputs not found in cart modal');
        return;
    }
    
    // Remove existing listeners to prevent duplicates
    backNumberInput.removeEventListener('input', checkCartInventoryAvailability);
    quantityInput.removeEventListener('input', checkCartInventoryAvailability);
    
    // Add new listeners
    backNumberInput.addEventListener('input', checkCartInventoryAvailability);
    quantityInput.addEventListener('input', checkCartInventoryAvailability);
    
    console.log('✅ Cart inventory checking listeners attached');
}

/**
 * Handle part number blur for auto-generation in cart
 */
async function handleCartPartNumberBlur() {
    const partNumber = document.getElementById('modalNodaPartNumber').value.trim();
    const backNumberInput = document.getElementById('modalNodaBackNumber');
    
    console.log('🔍 Cart part number blur event:', partNumber);
    
    // If part number is empty, clear the back number if it was auto-generated
    if (!partNumber) {
        if (backNumberInput.dataset.autoGenerated === 'true') {
            backNumberInput.value = '';
            backNumberInput.dataset.autoGenerated = 'false';
            document.getElementById('modalInventoryCheckResult').innerHTML = '';
            console.log('🧹 Cleared auto-generated back number');
        }
        return;
    }
    
    // If back number was manually entered by user, don't override it
    if (backNumberInput.value && backNumberInput.dataset.autoGenerated !== 'true') {
        console.log('📝 Back number manually entered, skipping auto-generation');
        return;
    }
    
    try {
        console.log(`🔍 Looking up back number for part number: ${partNumber}`);
        
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'lookupMasterData',
                品番: partNumber
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.背番号) {
            backNumberInput.value = result.data.背番号;
            backNumberInput.dataset.autoGenerated = 'true';
            console.log(`✅ Auto-generated back number: ${result.data.背番号}`);
            
            // Trigger inventory check for the auto-generated back number
            checkCartInventoryAvailability();
        } else {
            console.log(`❌ No back number found for part number: ${partNumber}`);
            if (backNumberInput.dataset.autoGenerated === 'true') {
                backNumberInput.value = '';
                backNumberInput.dataset.autoGenerated = 'false';
                document.getElementById('modalInventoryCheckResult').innerHTML = '';
            }
        }
        
    } catch (error) {
        console.error('Error looking up back number:', error);
    }
}

/**
 * Handle back number blur for auto-generation in cart
 */
async function handleCartBackNumberBlur() {
    const backNumber = document.getElementById('modalNodaBackNumber').value.trim();
    const partNumberInput = document.getElementById('modalNodaPartNumber');
    
    console.log('🔍 Cart back number blur event:', backNumber);
    
    // If back number is empty, clear the part number if it was auto-generated
    if (!backNumber) {
        if (partNumberInput.dataset.autoGenerated === 'true') {
            partNumberInput.value = '';
            partNumberInput.dataset.autoGenerated = 'false';
            console.log('🧹 Cleared auto-generated part number');
        }
        document.getElementById('modalInventoryCheckResult').innerHTML = '';
        return;
    }
    
    // If part number was manually entered by user, don't override it
    if (partNumberInput.value && partNumberInput.dataset.autoGenerated !== 'true') {
        console.log('📝 Part number manually entered, skipping auto-generation');
        // Still check inventory even if not auto-generating
        checkCartInventoryAvailability();
        return;
    }
    
    try {
        console.log(`🔍 Looking up part number for back number: ${backNumber}`);
        
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'lookupMasterData',
                背番号: backNumber
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.品番) {
            partNumberInput.value = result.data.品番;
            partNumberInput.dataset.autoGenerated = 'true';
            console.log(`✅ Auto-generated part number: ${result.data.品番}`);
        } else {
            console.log(`❌ No part number found for back number: ${backNumber}`);
            if (partNumberInput.dataset.autoGenerated === 'true') {
                partNumberInput.value = '';
                partNumberInput.dataset.autoGenerated = 'false';
            }
        }
        
        // Always trigger inventory check for back number (whether auto-generated or manual)
        checkCartInventoryAvailability();
        
    } catch (error) {
        console.error('Error looking up part number:', error);
        // Still check inventory even if lookup fails
        checkCartInventoryAvailability();
    }
}

/**
 * Check inventory availability for cart items (returns data for review step)
 */
async function getInventoryAvailability(backNumber) {
    try {
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'checkInventory',
                背番号: backNumber
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.inventory) {
            const available = result.inventory.availableQuantity || 0;
            
            // For review step validation, don't subtract the item's own quantity from cart
            // Just return the base available quantity since we're validating what's already committed
            return {
                success: true,
                availableQuantity: available,
                totalAvailable: available
            };
        } else {
            return {
                success: false,
                availableQuantity: 0,
                error: 'Item not found in inventory'
            };
        }
        
    } catch (error) {
        console.error('Error checking inventory:', error);
        return {
            success: false,
            availableQuantity: 0,
            error: 'Error checking inventory'
        };
    }
}

/**
 * Check inventory availability for cart items
 */
async function checkCartInventoryAvailability() {
    const backNumber = document.getElementById('modalNodaBackNumber').value.trim();
    const quantity = parseInt(document.getElementById('modalNodaQuantity').value) || 0;
    const resultDiv = document.getElementById('modalInventoryCheckResult');
    
    if (!backNumber) {
        resultDiv.innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'checkInventory',
                背番号: backNumber
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.inventory) {
            const available = result.inventory.availableQuantity || 0;
            
            // Calculate quantity already in cart for this item
            const existingCartItem = nodaCart.find(item => item.背番号 === backNumber);
            const cartQuantity = existingCartItem ? existingCartItem.quantity : 0;
            
            // Calculate remaining available after considering cart
            const remainingAvailable = Math.max(0, available - cartQuantity);
            
            let statusClass, statusText;
            
            if (quantity > 0 && remainingAvailable >= quantity) {
                statusClass = 'text-green-600';
                statusText = `Available: ${remainingAvailable}`;
            } else if (quantity > 0 && remainingAvailable < quantity) {
                statusClass = 'text-red-600';
                statusText = `Insufficient! Available: ${remainingAvailable}, Requested: ${quantity}`;
            } else {
                statusClass = 'text-blue-600';
                statusText = `Available: ${remainingAvailable}`;
            }
            
            // Show cart info if item is already in cart
            if (cartQuantity > 0) {
                statusText += ` (${cartQuantity} in cart)`;
            }
            
            resultDiv.innerHTML = `<span class="${statusClass} text-xs font-medium">${statusText}</span>`;
            
        } else {
            resultDiv.innerHTML = '<span class="text-red-600 text-xs">Item not found in inventory</span>';
        }
        
    } catch (error) {
        console.error('Error checking inventory:', error);
        resultDiv.innerHTML = '<span class="text-orange-600 text-xs">Error checking inventory</span>';
    }
}

// Make functions globally available
window.initializeNodaSystem = initializeNodaSystem;
window.openNodaAddModal = openNodaAddModal;
window.closeNodaAddModal = closeNodaAddModal;
window.addItemToCart = addItemToCart;
window.removeFromCart = removeFromCart;
window.proceedToReview = proceedToReview;
window.backToAddItems = backToAddItems;
window.proceedToSubmit = proceedToSubmit;
window.backToReview = backToReview;
window.submitBulkRequest = submitBulkRequest;

// ==================== LINE ITEM STATUS MANAGEMENT ====================

/**
 * Update line item status
 */
window.updateLineItemStatus = async function(requestId, lineNumber, newStatus) {
    try {
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'updateLineItemStatus',
                requestId: requestId,
                data: {
                    lineNumber: lineNumber,
                    status: newStatus
                }
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            let message = `Line item ${lineNumber} status updated to ${newStatus}`;
            
            // Show additional message if inventory was reversed
            if (result.inventoryReversed) {
                message += ` (Inventory transaction reversed)`;
                showToast(message, 'warning');
            } else {
                showToast(message, 'success');
            }
            
            // Refresh the data to show updated status
            loadNodaData();
        } else {
            throw new Error(result.error || 'Failed to update line item status');
        }
        
    } catch (error) {
        console.error('Error updating line item status:', error);
        alert('Error updating line item status: ' + error.message);
    }
};

/**
 * Mark line item as completed
 */
window.markLineItemCompleted = async function(requestId, lineNumber) {
    if (confirm(`Mark line item ${lineNumber} as completed?`)) {
        await updateLineItemStatus(requestId, lineNumber, 'completed');
    }
};

// ==================== ENHANCED EDIT FUNCTIONALITY ====================

// Edit cart for adding items to existing request
let editCart = [];
let currentEditRequestId = null;

/**
 * Switch tabs in edit modal
 */
window.switchEditTab = function(tabName) {
    // Update tab buttons
    document.querySelectorAll('.edit-tab-button').forEach(btn => {
        btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });

    // Update content
    document.querySelectorAll('.edit-tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    if (tabName === 'existing') {
        document.getElementById('existingItemsTab').classList.add('active', 'border-blue-500', 'text-blue-600');
        document.getElementById('existingItemsTab').classList.remove('border-transparent', 'text-gray-500');
        document.getElementById('existingItemsContent').classList.remove('hidden');
    } else if (tabName === 'add') {
        document.getElementById('addItemsTab').classList.add('active', 'border-blue-500', 'text-blue-600');
        document.getElementById('addItemsTab').classList.remove('border-transparent', 'text-gray-500');
        document.getElementById('addItemsContent').classList.remove('hidden');
        
        // Setup auto-fill and inventory checking for edit modal
        setupEditModalAutoGeneration();
    }
};

/**
 * Show single item add form
 */
window.showAddSingleItemForm = function() {
    const form = document.getElementById('singleItemAddForm');
    form.classList.remove('hidden');
    
    // Clear form fields
    document.getElementById('editModal品番').value = '';
    document.getElementById('editModal背番号').value = '';
    document.getElementById('editModalQuantity').value = '';
    document.getElementById('editModalInventoryResult').innerHTML = '';
    
    // Focus on first field
    document.getElementById('editModal品番').focus();
};

/**
 * Cancel single item addition
 */
window.cancelAddSingleItem = function() {
    const form = document.getElementById('singleItemAddForm');
    form.classList.add('hidden');
};

/**
 * Setup auto-generation for edit modal inputs
 */
function setupEditModalAutoGeneration() {
    const partNumberInput = document.getElementById('editModal品番');
    const backNumberInput = document.getElementById('editModal背番号');
    const quantityInput = document.getElementById('editModalQuantity');
    
    if (!partNumberInput || !backNumberInput || !quantityInput) {
        return; // Elements not ready yet
    }
    
    // Remove existing listeners to prevent duplicates
    partNumberInput.removeEventListener('blur', handleEditModalPartNumberBlur);
    backNumberInput.removeEventListener('blur', handleEditModalBackNumberBlur);
    quantityInput.removeEventListener('input', checkEditModalInventoryAvailability);
    backNumberInput.removeEventListener('input', checkEditModalInventoryAvailability);
    
    // Add new listeners
    partNumberInput.addEventListener('blur', handleEditModalPartNumberBlur);
    backNumberInput.addEventListener('blur', handleEditModalBackNumberBlur);
    quantityInput.addEventListener('input', checkEditModalInventoryAvailability);
    backNumberInput.addEventListener('input', checkEditModalInventoryAvailability);
    
    console.log('✅ Edit modal auto-generation listeners attached');
}

/**
 * Handle part number blur for auto-generation in edit modal
 */
async function handleEditModalPartNumberBlur() {
    const partNumber = document.getElementById('editModal品番').value.trim();
    const backNumberInput = document.getElementById('editModal背番号');
    
    if (!partNumber) {
        if (backNumberInput.dataset.autoGenerated === 'true') {
            backNumberInput.value = '';
            backNumberInput.dataset.autoGenerated = 'false';
            document.getElementById('editModalInventoryResult').innerHTML = '';
        }
        return;
    }
    
    if (backNumberInput.value && backNumberInput.dataset.autoGenerated !== 'true') {
        return;
    }
    
    try {
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'lookupMasterData',
                品番: partNumber
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.背番号) {
            backNumberInput.value = result.data.背番号;
            backNumberInput.dataset.autoGenerated = 'true';
            checkEditModalInventoryAvailability();
        } else {
            if (backNumberInput.dataset.autoGenerated === 'true') {
                backNumberInput.value = '';
                backNumberInput.dataset.autoGenerated = 'false';
                document.getElementById('editModalInventoryResult').innerHTML = '';
            }
        }
        
    } catch (error) {
        console.error('Error looking up back number:', error);
    }
}

/**
 * Handle back number blur for auto-generation in edit modal
 */
async function handleEditModalBackNumberBlur() {
    const backNumber = document.getElementById('editModal背番号').value.trim();
    const partNumberInput = document.getElementById('editModal品番');
    
    if (!backNumber) {
        if (partNumberInput.dataset.autoGenerated === 'true') {
            partNumberInput.value = '';
            partNumberInput.dataset.autoGenerated = 'false';
        }
        document.getElementById('editModalInventoryResult').innerHTML = '';
        return;
    }
    
    if (partNumberInput.value && partNumberInput.dataset.autoGenerated !== 'true') {
        checkEditModalInventoryAvailability();
        return;
    }
    
    try {
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'lookupMasterData',
                背番号: backNumber
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.品番) {
            partNumberInput.value = result.data.品番;
            partNumberInput.dataset.autoGenerated = 'true';
        } else {
            if (partNumberInput.dataset.autoGenerated === 'true') {
                partNumberInput.value = '';
                partNumberInput.dataset.autoGenerated = 'false';
            }
        }
        
        checkEditModalInventoryAvailability();
        
    } catch (error) {
        console.error('Error looking up part number:', error);
        checkEditModalInventoryAvailability();
    }
}

/**
 * Check inventory availability in edit modal
 */
async function checkEditModalInventoryAvailability() {
    const backNumber = document.getElementById('editModal背番号').value.trim();
    const quantity = parseInt(document.getElementById('editModalQuantity').value) || 0;
    const resultDiv = document.getElementById('editModalInventoryResult');
    
    if (!backNumber) {
        resultDiv.innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'checkInventory',
                背番号: backNumber
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.inventory) {
            const available = result.inventory.availableQuantity || 0;
            
            // Calculate quantity already in edit cart for this item
            const existingCartItem = editCart.find(item => item.背番号 === backNumber);
            const cartQuantity = existingCartItem ? existingCartItem.quantity : 0;
            
            const remainingAvailable = Math.max(0, available - cartQuantity);
            
            let statusClass, statusText;
            
            if (quantity > 0 && remainingAvailable >= quantity) {
                statusClass = 'text-green-600';
                statusText = `Available: ${remainingAvailable}`;
            } else if (quantity > 0 && remainingAvailable < quantity) {
                statusClass = 'text-red-600';
                statusText = `Insufficient! Available: ${remainingAvailable}, Requested: ${quantity}`;
            } else {
                statusClass = 'text-blue-600';
                statusText = `Available: ${remainingAvailable}`;
            }
            
            if (cartQuantity > 0) {
                statusText += ` (${cartQuantity} in edit cart)`;
            }
            
            resultDiv.innerHTML = `<span class="${statusClass} text-xs font-medium">${statusText}</span>`;
            
        } else {
            resultDiv.innerHTML = '<span class="text-red-600 text-xs">Item not found in inventory</span>';
        }
        
    } catch (error) {
        console.error('Error checking inventory:', error);
        resultDiv.innerHTML = '<span class="text-orange-600 text-xs">Error checking inventory</span>';
    }
}

/**
 * Add single item to edit cart
 */
window.addSingleItemToRequest = function(requestId) {
    const partNumber = document.getElementById('editModal品番').value.trim();
    const backNumber = document.getElementById('editModal背番号').value.trim();
    const quantity = parseInt(document.getElementById('editModalQuantity').value);
    
    // Validation
    if (!partNumber || !backNumber || !quantity) {
        alert('Please fill in all fields');
        return;
    }
    
    if (quantity <= 0) {
        alert('Quantity must be greater than 0');
        return;
    }
    
    // Check if item already exists in edit cart
    const existingItemIndex = editCart.findIndex(item => item.背番号 === backNumber);
    if (existingItemIndex !== -1) {
        if (confirm(`Item ${backNumber} already exists in edit cart. Do you want to update the quantity?`)) {
            editCart[existingItemIndex].quantity = quantity;
            editCart[existingItemIndex].品番 = partNumber;
        } else {
            return;
        }
    } else {
        // Add new item to edit cart
        editCart.push({
            品番: partNumber,
            背番号: backNumber,
            quantity: quantity,
            addedAt: new Date().toISOString()
        });
    }
    
    currentEditRequestId = requestId;
    updateEditCartDisplay();
    cancelAddSingleItem();
    showToast(`Item ${backNumber} added to edit cart!`, 'success');
};

/**
 * Update edit cart display
 */
function updateEditCartDisplay() {
    const cartDiv = document.getElementById('editAddedItemsCart');
    const cartItemsList = document.getElementById('editCartItemsList');
    const cartItemCount = document.getElementById('editCartItemCount');
    
    cartItemCount.textContent = `(${editCart.length} items)`;
    
    if (editCart.length === 0) {
        cartDiv.classList.add('hidden');
        return;
    }
    
    cartDiv.classList.remove('hidden');
    
    cartItemsList.innerHTML = editCart.map(item => `
        <div class="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div class="flex-1">
                <div class="flex items-center space-x-4">
                    <span class="font-medium text-gray-900">${item.背番号}</span>
                    <span class="text-gray-600">${item.品番}</span>
                    <span class="text-sm text-gray-500">Qty: ${item.quantity}</span>
                </div>
            </div>
            <button onclick="removeFromEditCart('${item.背番号}')" class="text-red-500 hover:text-red-700">
                <i class="ri-delete-bin-line"></i>
            </button>
        </div>
    `).join('');
}

/**
 * Remove item from edit cart
 */
window.removeFromEditCart = function(backNumber) {
    if (confirm(`Remove ${backNumber} from edit cart?`)) {
        editCart = editCart.filter(item => item.背番号 !== backNumber);
        updateEditCartDisplay();
        showToast(`Item ${backNumber} removed from edit cart`, 'info');
    }
};

/**
 * Clear edit cart
 */
window.clearEditCart = function() {
    if (confirm('Clear all items from edit cart?')) {
        editCart = [];
        updateEditCartDisplay();
        showToast('Edit cart cleared', 'info');
    }
};

/**
 * Submit added items to existing request
 */
window.submitAddedItems = async function(requestId) {
    if (editCart.length === 0) {
        alert('No items in edit cart to add');
        return;
    }
    
    try {
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const userName = await getUserFullName(currentUser.username || 'Unknown User');
        
        const requestData = {
            action: 'addItemsToRequest',
            requestId: requestId,
            data: {
                items: editCart.map(item => ({
                    品番: item.品番,
                    背番号: item.背番号,
                    quantity: parseInt(item.quantity)
                }))
            },
            userName: userName
        };
        
        console.log('📤 Adding items to existing request:', requestData);
        
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Clear edit cart and close modal
            editCart = [];
            currentEditRequestId = null;
            closeNodaModal();
            
            // Show success message
            alert(`Items added successfully!\nAdded Items: ${result.addedItems}\nFailed Items: ${result.failedItems || 0}`);
            
            // Reload data
            loadNodaData();
        } else {
            throw new Error(result.error || 'Failed to add items to request');
        }
        
    } catch (error) {
        console.error('Error adding items to request:', error);
        alert('Error adding items to request: ' + error.message);
    }
};

/**
 * Trigger CSV upload for edit mode
 */
window.triggerEditCsvUpload = function() {
    document.getElementById('editCsvFileInput').click();
};

/**
 * Handle CSV file upload for edit mode
 */
window.handleEditCsvUpload = function(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        parseEditCsvAndAddToCart(e.target.result);
    };
    reader.readAsText(file, 'Shift_JIS'); // JIS encoding
};

/**
 * Parse CSV and add to edit cart
 */
async function parseEditCsvAndAddToCart(csvData) {
    try {
        const lines = csvData.trim().split('\n');
        
        if (lines.length === 0) {
            alert('CSV file is empty');
            return;
        }
        
        // Parse header to detect format
        const header = lines[0].trim();
        let isBackNumberFormat = false;
        
        if (header.includes('背番号') || header.includes('back')) {
            isBackNumberFormat = true;
            console.log('📊 Detected 背番号-based CSV format');
        } else if (header.includes('品番') || header.includes('part')) {
            isBackNumberFormat = false;
            console.log('📊 Detected 品番-based CSV format');
        } else {
            alert('Invalid CSV format. Header must contain either 品番 or 背番号');
            return;
        }
        
        const dataLines = lines.slice(1);
        let successCount = 0;
        let failCount = 0;
        
        for (const line of dataLines) {
            const columns = line.split(',').map(col => col.trim());
            
            if (columns.length < 3) {
                console.warn('Skipping line with insufficient columns:', line);
                failCount++;
                continue;
            }
            
            const date = columns[0];
            const itemCode = columns[1];
            const quantity = parseInt(columns[2]);
            
            if (!itemCode || !quantity || quantity <= 0) {
                console.warn('Skipping invalid line:', line);
                failCount++;
                continue;
            }
            
            try {
                let 品番, 背番号;
                
                if (isBackNumberFormat) {
                    背番号 = itemCode;
                    // Lookup 品番 from 背番号
                    const lookupResponse = await fetch(`${BASE_URL}api/noda-requests`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'lookupMasterData',
                            背番号: 背番号
                        })
                    });
                    const lookupResult = await lookupResponse.json();
                    品番 = lookupResult.success && lookupResult.data ? lookupResult.data.品番 : '';
                } else {
                    品番 = itemCode;
                    // Lookup 背番号 from 品番
                    const lookupResponse = await fetch(`${BASE_URL}api/noda-requests`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'lookupMasterData',
                            品番: 品番
                        })
                    });
                    const lookupResult = await lookupResponse.json();
                    背番号 = lookupResult.success && lookupResult.data ? lookupResult.data.背番号 : '';
                }
                
                if (!品番 || !背番号) {
                    console.warn(`Could not resolve item code: ${itemCode}`);
                    failCount++;
                    continue;
                }
                
                // Check if item already exists in edit cart
                const existingItemIndex = editCart.findIndex(item => item.背番号 === 背番号);
                if (existingItemIndex !== -1) {
                    editCart[existingItemIndex].quantity += quantity;
                } else {
                    editCart.push({
                        品番: 品番,
                        背番号: 背番号,
                        quantity: quantity,
                        addedAt: new Date().toISOString()
                    });
                }
                
                successCount++;
                
            } catch (error) {
                console.error(`Error processing line: ${line}`, error);
                failCount++;
            }
        }
        
        updateEditCartDisplay();
        showToast(`CSV processed: ${successCount} items added, ${failCount} failed`, successCount > 0 ? 'success' : 'error');
        
    } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file: ' + error.message);
    }
}
