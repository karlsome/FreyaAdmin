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
                        ${t('status')} ${getNodaSortArrow('status')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortNodaTable('品番')">
                        ${t('items')} ${getNodaSortArrow('品番')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortNodaTable('pickupDate')">
                        ${t('pickupDate').replace(':', '')} ${getNodaSortArrow('pickupDate')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortNodaTable('createdAt')">
                        ${t('createdAt')} ${getNodaSortArrow('createdAt')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700">${t('actions')}</th>
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
                                <div class="font-medium">${totalItems} ${t('items')}</div>
                                <div class="text-gray-500">
                                    ${completedItems} ${t('done')}, ${pendingItems} ${t('statusPending').toLowerCase()}
                                </div>
                            </div>
                        `;
                    } else {
                        // Single item request
                        itemsDisplay = `
                            <div class="text-xs">
                                <div class="font-medium">${item.品番}</div>
                                <div class="text-gray-500">${item.背番号} (${t('qty')}: ${item.quantity})</div>
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
            return { text: t('statusPending'), icon: 'ri-time-line', badgeClass: 'bg-yellow-100 text-yellow-800', rowClass: '' };
        case 'in-progress':
            return { text: t('statusInProgress'), icon: 'ri-play-line', badgeClass: 'bg-blue-100 text-blue-800', rowClass: '' };
        case 'active':
            return { text: t('statusActive'), icon: 'ri-play-line', badgeClass: 'bg-blue-100 text-blue-800', rowClass: '' };
        case 'completed':
            return { text: t('statusComplete'), icon: 'ri-checkbox-circle-line', badgeClass: 'bg-green-100 text-green-800', rowClass: '' };
        case 'complete':
            return { text: t('statusComplete'), icon: 'ri-checkbox-circle-line', badgeClass: 'bg-green-100 text-green-800', rowClass: '' };
        case 'failed':
            return { text: t('statusFailed'), icon: 'ri-close-circle-line', badgeClass: 'bg-red-100 text-red-800', rowClass: '' };
        default:
            return { text: t('statusUnknown'), icon: 'ri-question-line', badgeClass: 'bg-gray-100 text-gray-800', rowClass: '' };
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
    partNumberFilter.innerHTML = `<option value="">${t('allPartNumbers')}</option>`;
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
            alert(t('alertInventoryError'));
            showFieldError('modalNodaBackNumber', 'Not found in inventory');
            return false;
        }
        
        const available = inventoryResult.inventory.runningQuantity;
        if (available < quantity) {
            alert(`${t('alertInsufficientInventory')}\n\n${t('alertRequested')} ${quantity}\n${t('alertAvailable')} ${available}\n\n${t('alertReduceQuantity')}`);
            showFieldError('modalNodaQuantity', 'Insufficient inventory');
            return false;
        }
        
        console.log('✅ Inventory check passed');
        
    } catch (error) {
        console.error('❌ Error checking inventory:', error);
        alert(t('alertErrorCheckingInventory') + error.message);
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
            alert(`${t('alertRequestCreatedSuccess')}\n\n${t('alertRequestNumber')} ${result.data.requestNumber}\n${t('partNumber')}: ${partNumber}\n${t('backNumber')}: ${backNumber}\n${t('quantity')}: ${quantity}`);
            
            // Close modal and refresh only the NODA data (not the entire page)
            closeNodaAddModal();
            await loadNodaData(); // Wait for data to load
            console.log('✅ NODA data refreshed');
        } else {
            console.error('❌ Request creation failed:', result.error);
            alert(t('alertErrorCreatingRequest') + (result.error || t('unknownError')));
        }
        
    } catch (error) {
        console.error('❌ Error creating request:', error);
        alert(t('alertErrorCreatingRequest') + error.message);
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
                alert(t('alertErrorExportingData') + result.error);
            }
        } else {
            alert(t('alertErrorExportingData'));
        }
        
    } catch (error) {
        console.error('Error exporting data:', error);
        alert(t('alertErrorExportingData') + error.message);
    }
};

/**
 * Download CSV file
 */
function downloadNodaCsv(data) {
    if (data.length === 0) {
        alert(t('alertNoDataToExport'));
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
                alert(t('alertErrorLoadingRequestDetails') + result.error);
            }
        }
        
    } catch (error) {
        console.error('Error loading request details:', error);
        alert(t('alertErrorLoadingRequestDetails') + error.message);
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
                alert(t('alertErrorLoadingRequestDetails') + result.error);
            }
        }
        
    } catch (error) {
        console.error('Error loading request details:', error);
        alert(t('alertErrorLoadingRequestDetails') + error.message);
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
        alert(t('alertFillAllFields'));
        return;
    }
    
    if (updatedData.quantity <= 0) {
        alert(t('alertQuantityGreaterThanZero'));
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
            alert(t('alertRequestUpdatedSuccess'));
            closeNodaModal();
            loadNodaData();
        } else {
            alert(t('alertErrorUpdatingRequest') + (result.error || t('unknownError')));
        }
        
    } catch (error) {
        console.error('Error updating request:', error);
        alert(t('alertErrorUpdatingRequest') + error.message);
    }
};

/**
 * Delete NODA request
 */
window.deleteNodaRequest = async function(requestId) {
    if (!confirm(t('alertConfirmDeleteRequest'))) {
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
            alert(t('alertRequestDeletedSuccess'));
            loadNodaData();
        } else {
            alert(t('alertErrorDeletingRequest') + (result.error || t('unknownError')));
        }
        
    } catch (error) {
        console.error('Error deleting request:', error);
        alert(t('alertErrorDeletingRequest') + error.message);
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
        alert(t('alertFillAllFields'));
        return;
    }
    
    if (quantity <= 0) {
        alert(t('alertQuantityGreaterThanZero'));
        return;
    }
    
    // Check if item already exists in cart
    const existingItemIndex = nodaCart.findIndex(item => item.背番号 === backNumber);
    if (existingItemIndex !== -1) {
        if (confirm(t('alertItemExistsInCart').replace('{backNumber}', backNumber))) {
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
                alert(t('alertItemNotFoundInInventory'));
                return;
            }
            
            const availableQuantity = result.inventory.availableQuantity || 0;
            if (availableQuantity < quantity) {
                alert(`${t('alertInsufficientInventory')} ${t('alertAvailable')}: ${availableQuantity}, ${t('alertRequested')}: ${quantity}`);
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
            alert(t('alertErrorCheckingInventoryTryAgain'));
            return;
        }
    }
    
    // Save and update display
    saveCartToStorage();
    updateCartDisplay();
    resetModalForm();
    
    // Show success message
    showToast(t('alertItemAddedToCart').replace('{backNumber}', backNumber), 'success');
}

/**
 * Remove item from cart
 */
function removeFromCart(backNumber) {
    if (confirm(t('alertConfirmRemoveFromCart').replace('{backNumber}', backNumber))) {
        nodaCart = nodaCart.filter(item => item.背番号 !== backNumber);
        saveCartToStorage();
        updateCartDisplay();
        showToast(t('alertItemRemovedFromCart').replace('{backNumber}', backNumber), 'info');
    }
}

/**
 * Update cart display
 */
function updateCartDisplay() {
    const cartItemsList = document.getElementById('cartItemsList');
    const cartItemCount = document.getElementById('cartItemCount');
    const proceedToReviewBtn = document.getElementById('proceedToReviewBtn');
    
    // Update item count - using innerHTML to preserve the data-i18n structure
    cartItemCount.innerHTML = `<span>${nodaCart.length}</span> <span data-i18n="items">${t('items')}</span>`;
    
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
        alert(t('alertAddAtLeastOneItem'));
        return;
    }
    
    const pickupDate = document.getElementById('bulkPickupDate').value;
    if (!pickupDate) {
        alert(t('alertSelectPickupDate'));
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
        alert(t('alertNoItemsToSubmit'));
        return;
    }
    
    const pickupDate = document.getElementById('bulkPickupDate').value;
    if (!pickupDate) {
        alert(t('alertSelectPickupDate'));
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
            alert(`${t('alertBulkRequestSubmitted')}\n${t('alertRequestNumber')}: ${result.bulkRequestNumber}\n${t('alertProcessedItems')}: ${result.processedItems}\n${t('alertFailedItems')}: ${result.failedItems}`);
            
            // Reload data
            loadNodaData();
        } else {
            throw new Error(result.error || t('alertFailedSubmitBulkRequest'));
        }
        
    } catch (error) {
        console.error('Error submitting bulk request:', error);
        alert(t('alertErrorSubmittingBulkRequest') + error.message);
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
        alert(t('alertErrorUpdatingLineItem') + error.message);
    }
};

/**
 * Mark line item as completed
 */
window.markLineItemCompleted = async function(requestId, lineNumber) {
    if (confirm(t('alertMarkLineItemCompleted').replace('{lineNumber}', lineNumber))) {
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
        alert(t('alertFillAllFields'));
        return;
    }
    
    if (quantity <= 0) {
        alert(t('alertQuantityGreaterThanZero'));
        return;
    }
    
    // Check if item already exists in edit cart
    const existingItemIndex = editCart.findIndex(item => item.背番号 === backNumber);
    if (existingItemIndex !== -1) {
        if (confirm(t('alertItemExistsInEditCart').replace('{backNumber}', backNumber))) {
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
    
    cartItemCount.textContent = `(${editCart.length} ${t('items')})`;
    
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
    if (confirm(t('alertConfirmRemoveFromEditCart').replace('{backNumber}', backNumber))) {
        editCart = editCart.filter(item => item.背番号 !== backNumber);
        updateEditCartDisplay();
        showToast(t('alertItemRemovedFromEditCart').replace('{backNumber}', backNumber), 'info');
    }
};

/**
 * Clear edit cart
 */
window.clearEditCart = function() {
    if (confirm(t('alertConfirmClearEditCart'))) {
        editCart = [];
        updateEditCartDisplay();
        showToast(t('alertEditCartCleared'), 'info');
    }
};

/**
 * Submit added items to existing request
 */
window.submitAddedItems = async function(requestId) {
    if (editCart.length === 0) {
        alert(t('alertNoItemsInEditCart'));
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
            alert(`${t('alertItemsAddedSuccess')}\n${t('alertAddedItems')}: ${result.addedItems}\n${t('alertFailedItems')}: ${result.failedItems || 0}`);
            
            // Reload data
            loadNodaData();
        } else {
            throw new Error(result.error || t('alertFailedAddItems'));
        }
        
    } catch (error) {
        console.error('Error adding items to request:', error);
        alert(t('alertErrorAddingItems') + error.message);
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
        alert(t('alertSelectCsvFile'));
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
            alert(t('alertCsvFileEmpty'));
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
            alert(t('alertInvalidCsvFormat'));
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
        showToast(t('alertCsvProcessed').replace('{success}', successCount).replace('{failed}', failCount), successCount > 0 ? 'success' : 'error');
        
    } catch (error) {
        console.error('Error parsing CSV:', error);
        alert(t('alertErrorParsingCsv') + error.message);
    }
}

// ==================== GEN SYNC FUNCTIONALITY ====================

/**
 * Open GEN Sync Modal
 */
window.openGenSyncModal = function() {
    const modalHTML = `
        <div id="genSyncModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <i class="ri-cloud-line text-3xl text-indigo-600"></i>
                            <div>
                                <h3 class="text-xl font-bold text-gray-900 dark:text-white">Sync from GEN</h3>
                                <p class="text-sm text-gray-600 dark:text-gray-400">Automatically retrieve and create picking request from GEN data</p>
                            </div>
                        </div>
                        <button onclick="closeGenSyncModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <i class="ri-close-line text-2xl"></i>
                        </button>
                    </div>
                </div>
                
                <div class="p-6">
                    <!-- Date Selection -->
                    <div id="genDateSelection" class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            📅 Select Delivery Date
                        </label>
                        <input type="date" id="genSyncDate" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
                        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">This will be the delivery date for the picking request</p>
                    </div>
                    
                    <!-- Progress Bar (Hidden Initially) -->
                    <div id="genSyncProgress" class="hidden mb-6">
                        <div class="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div id="genSyncProgressBar" class="bg-indigo-600 h-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                        <p id="genSyncProgressText" class="mt-2 text-sm text-center text-gray-600 dark:text-gray-400"></p>
                    </div>
                    
                    <!-- Duplicate Selector (Hidden Initially) -->
                    <div id="genDuplicateSelector" class="hidden mb-6">
                        <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                            <div class="flex items-start space-x-2">
                                <i class="ri-alert-line text-yellow-600 dark:text-yellow-400 text-xl mt-0.5"></i>
                                <div>
                                    <h4 class="font-semibold text-yellow-800 dark:text-yellow-300">⚠️ Duplicate Entries Detected</h4>
                                    <p class="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                                        Multiple entries with the same 背番号 were found. Please select which to include:
                                    </p>
                                    <ul class="text-xs text-yellow-600 dark:text-yellow-500 mt-2 space-y-1">
                                        <li>✓ Check one or more entries to include them</li>
                                        <li>✓ If multiple are checked, quantities will be summed</li>
                                        <li>✓ If none are checked, the item will be excluded</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <div id="genDuplicateList" class="space-y-4 max-h-96 overflow-y-auto">
                            <!-- Duplicate groups will be inserted here -->
                        </div>
                        
                        <div class="mt-4 flex justify-end">
                            <button onclick="proceedWithDuplicateSelection()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                                <i class="ri-arrow-right-line mr-2"></i>Continue to Comparison
                            </button>
                        </div>
                    </div>
                    
                    <!-- Comparison View (Hidden Initially) -->
                    <div id="genComparisonView" class="hidden">
                        <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">📋 Data Comparison</h4>
                        <div id="genComparisonList" class="space-y-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <!-- Comparison items will be inserted here -->
                        </div>
                        <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div class="flex items-start space-x-2">
                                <i class="ri-information-line text-blue-600 dark:text-blue-400 mt-0.5"></i>
                                <div class="text-sm text-blue-800 dark:text-blue-300">
                                    <p><strong>Legend:</strong></p>
                                    <p>• White background: Existing items (quantities will be updated)</p>
                                    <p>• Light green background: New items (will be added)</p>
                                    <p>• Light red background: Items not in GEN (will be removed)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Error Message (Hidden Initially) -->
                    <div id="genSyncError" class="hidden mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div class="flex items-start space-x-2">
                            <i class="ri-error-warning-line text-red-600 dark:text-red-400 text-xl mt-0.5"></i>
                            <div>
                                <h5 class="font-semibold text-red-800 dark:text-red-300">Error</h5>
                                <p id="genSyncErrorText" class="text-sm text-red-700 dark:text-red-400 mt-1"></p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div class="flex justify-end space-x-3">
                        <button onclick="closeGenSyncModal()" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                            Cancel
                        </button>
                        <button id="genSyncFetchBtn" onclick="fetchFromGen()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                            <i class="ri-download-cloud-line mr-2"></i>Fetch from GEN
                        </button>
                        <button id="genSyncOverwriteBtn" onclick="overwriteWithGenData()" class="hidden px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            <i class="ri-check-line mr-2"></i>Overwrite Existing
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('genSyncDate').value = today;
};

/**
 * Close GEN Sync Modal
 */
window.closeGenSyncModal = function() {
    const modal = document.getElementById('genSyncModal');
    if (modal) {
        modal.remove();
    }
    // Clear any stored comparison data
    window.genComparisonData = null;
};

/**
 * Update progress bar
 */
function updateGenProgress(percent, message) {
    const progressBar = document.getElementById('genSyncProgressBar');
    const progressText = document.getElementById('genSyncProgressText');
    const progressContainer = document.getElementById('genSyncProgress');
    
    if (percent > 0) {
        progressContainer.classList.remove('hidden');
        progressBar.style.width = `${percent}%`;
        progressText.textContent = message;
    } else {
        progressContainer.classList.add('hidden');
    }
}

/**
 * Show error message
 */
function showGenError(message) {
    const errorContainer = document.getElementById('genSyncError');
    const errorText = document.getElementById('genSyncErrorText');
    
    errorText.textContent = message;
    errorContainer.classList.remove('hidden');
}

/**
 * Hide error message
 */
function hideGenError() {
    const errorContainer = document.getElementById('genSyncError');
    errorContainer.classList.add('hidden');
}

/**
 * Fetch data from GEN
 */
window.fetchFromGen = async function() {
    const dateInput = document.getElementById('genSyncDate');
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        showGenError('Please select a delivery date');
        return;
    }
    
    hideGenError();
    updateGenProgress(10, '🔌 Connecting to GEN...');
    
    // Disable fetch button
    const fetchBtn = document.getElementById('genSyncFetchBtn');
    fetchBtn.disabled = true;
    fetchBtn.innerHTML = '<div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Processing...';
    
    try {
        // Use BASE_URL from charts.js
        const API_BASE_URL = typeof BASE_URL !== 'undefined' ? BASE_URL : 'http://localhost:3000';
        
        updateGenProgress(30, '📥 Fetching data from GEN...');
        
        const response = await fetch(`${API_BASE_URL}extract-tokens`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fromDate: selectedDate,
                toDate: selectedDate,
                workerFilter: 'gen_all'
            })
        });
        
        updateGenProgress(60, '📄 Parsing CSV data...');
        
        if (!response.ok) {
            const errorData = await response.text();
            let errorMessage = 'Failed to fetch data from GEN';
            try {
                const parsed = JSON.parse(errorData);
                errorMessage = parsed.error || errorMessage;
            } catch (e) {
                errorMessage = errorData || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const csvBlob = await response.blob();
        
        // Decode Shift-JIS properly
        const arrayBuffer = await csvBlob.arrayBuffer();
        const decoder = new TextDecoder('shift-jis');
        const csvText = decoder.decode(arrayBuffer);
        
        updateGenProgress(70, 'Validating items...');
        
        // Parse CSV (Shift-JIS encoded, comma-delimited)
        const parsedData = await parseGenCSV(csvText);
        
        updateGenProgress(80, 'Checking inventory...');
        
        // Validate and enrich data
        const validatedData = await validateGenData(parsedData, selectedDate);
        
        updateGenProgress(90, 'Preparing comparison...');
        
        // Check for existing picking request for this date
        const existingRequest = await checkExistingPickingRequest(selectedDate);
        
        // Detect duplicates (same 背番号 + same date)
        const duplicateGroups = detectDuplicates(validatedData, selectedDate);
        
        updateGenProgress(100, 'Complete!');
        
        // Store data for later use
        window.genComparisonData = {
            newData: validatedData,
            existingData: existingRequest,
            deliveryDate: selectedDate,
            duplicateGroups: duplicateGroups
        };
        
        // If duplicates exist, show duplicate selector first
        if (Object.keys(duplicateGroups).length > 0) {
            displayDuplicateSelector(duplicateGroups, existingRequest, selectedDate);
            
            // Hide date selection, show duplicate selector
            document.getElementById('genDateSelection').classList.add('hidden');
            document.getElementById('genDuplicateSelector').classList.remove('hidden');
            document.getElementById('genSyncFetchBtn').classList.add('hidden');
        } else {
            // No duplicates, proceed directly to comparison
            displayComparisonView(validatedData, existingRequest);
            
            // Hide date selection, show comparison
            document.getElementById('genDateSelection').classList.add('hidden');
            document.getElementById('genComparisonView').classList.remove('hidden');
            document.getElementById('genSyncFetchBtn').classList.add('hidden');
            document.getElementById('genSyncOverwriteBtn').classList.remove('hidden');
        }
        
        setTimeout(() => updateGenProgress(0, ''), 1000);
        
    } catch (error) {
        console.error('Error fetching from GEN:', error);
        showGenError(error.message);
        updateGenProgress(0, '');
        
        // Re-enable fetch button
        fetchBtn.disabled = false;
        fetchBtn.innerHTML = '<i class="ri-download-cloud-line mr-2"></i>Fetch from GEN';
    }
};

/**
 * Detect duplicates (same 背番号 + same date)
 */
function detectDuplicates(validatedData, deliveryDate) {
    const groups = {};
    
    validatedData.forEach(item => {
        const key = `${item.背番号}_${deliveryDate}`;
        
        if (!groups[key]) {
            groups[key] = {
                背番号: item.背番号,
                品番: item.品番,
                deliveryDate: deliveryDate,
                entries: []
            };
        }
        
        groups[key].entries.push(item);
    });
    
    // Filter to only groups with duplicates (more than 1 entry)
    const duplicates = {};
    Object.keys(groups).forEach(key => {
        if (groups[key].entries.length > 1) {
            duplicates[key] = groups[key];
        }
    });
    
    console.log('Detected duplicate groups:', duplicates);
    return duplicates;
}

/**
 * Display duplicate selector UI
 */
function displayDuplicateSelector(duplicateGroups, existingData, deliveryDate) {
    const duplicateList = document.getElementById('genDuplicateList');
    duplicateList.innerHTML = '';
    
    // Get existing quantities for auto-selection
    let existingItems = [];
    if (existingData) {
        if (existingData.lineItems && Array.isArray(existingData.lineItems)) {
            existingItems = existingData.lineItems;
        } else if (existingData.items && Array.isArray(existingData.items)) {
            existingItems = existingData.items;
        }
    }
    const existingMap = new Map(existingItems.map(item => [item.背番号, item.quantity]));
    
    Object.values(duplicateGroups).forEach(group => {
        const existingQty = existingMap.get(group.背番号);
        
        let groupHTML = `
            <div class="border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/10">
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <h5 class="font-semibold text-gray-900 dark:text-white">
                            ${group.背番号} <span class="text-gray-500 dark:text-gray-400">- ${group.品番}</span>
                        </h5>
                        ${existingQty ? `<p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Current quantity: ${existingQty}</p>` : ''}
                    </div>
                    <span class="bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-1 rounded">
                        ${group.entries.length} duplicates
                    </span>
                </div>
                
                <div class="space-y-2">
        `;
        
        group.entries.forEach((entry, index) => {
            // Auto-select entries that DON'T match existing quantity
            const shouldAutoCheck = existingQty ? entry.quantity !== existingQty : index === 0;
            const checkboxId = `dup_${group.背番号}_${index}`;
            
            groupHTML += `
                <label class="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer">
                    <input type="checkbox" 
                           id="${checkboxId}"
                           data-seban="${group.背番号}"
                           data-quantity="${entry.quantity}"
                           data-index="${index}"
                           class="duplicate-checkbox w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                           ${shouldAutoCheck ? 'checked' : ''}>
                    <div class="flex-1">
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-gray-900 dark:text-white">${entry.quantity} pieces</span>
                            ${existingQty === entry.quantity ? '<span class="text-xs text-blue-600 dark:text-blue-400">(Matches current)</span>' : ''}
                            ${shouldAutoCheck && existingQty ? '<span class="text-xs text-green-600 dark:text-green-400">✓ Auto-selected</span>' : ''}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Available stock: ${entry.availableQuantity}
                        </div>
                    </div>
                </label>
            `;
        });
        
        groupHTML += `
                </div>
                <div class="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
                    <span id="summary_${group.背番号}" class="font-medium"></span>
                </div>
            </div>
        `;
        
        duplicateList.insertAdjacentHTML('beforeend', groupHTML);
        
        // Update summary for this group
        updateDuplicateSummary(group.背番号);
    });
    
    // Add event listeners to update summaries
    document.querySelectorAll('.duplicate-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const seban = e.target.dataset.seban;
            updateDuplicateSummary(seban);
        });
    });
}

/**
 * Update duplicate selection summary
 */
function updateDuplicateSummary(seban) {
    const checkboxes = document.querySelectorAll(`.duplicate-checkbox[data-seban="${seban}"]`);
    const checked = Array.from(checkboxes).filter(cb => cb.checked);
    const summaryEl = document.getElementById(`summary_${seban}`);
    
    if (checked.length === 0) {
        summaryEl.innerHTML = '❌ No entries selected - this item will be <strong>excluded</strong>';
    } else if (checked.length === 1) {
        const qty = checked[0].dataset.quantity;
        summaryEl.innerHTML = `✓ Selected: <strong>${qty} pieces</strong>`;
    } else {
        const totalQty = checked.reduce((sum, cb) => sum + parseInt(cb.dataset.quantity), 0);
        summaryEl.innerHTML = `✓ Multiple selected - will be <strong>summed to ${totalQty} pieces</strong>`;
    }
}

/**
 * Proceed with duplicate selection
 */
window.proceedWithDuplicateSelection = function() {
    const duplicateGroups = window.genComparisonData.duplicateGroups;
    const originalData = window.genComparisonData.newData;
    const existingData = window.genComparisonData.existingData;
    
    // Build resolved data based on checkbox selections
    const resolvedData = [];
    const processedSebans = new Set();
    
    // Process items with duplicates
    Object.values(duplicateGroups).forEach(group => {
        const seban = group.背番号;
        const checkboxes = document.querySelectorAll(`.duplicate-checkbox[data-seban="${seban}"]`);
        const checked = Array.from(checkboxes).filter(cb => cb.checked);
        
        processedSebans.add(seban);
        
        if (checked.length === 0) {
            // No selection - exclude this item
            console.log(`Excluding ${seban} - no checkboxes selected`);
        } else if (checked.length === 1) {
            // Single selection
            const index = parseInt(checked[0].dataset.index);
            const selectedEntry = group.entries[index];
            resolvedData.push(selectedEntry);
            console.log(`Selected single entry for ${seban}: ${selectedEntry.quantity}`);
        } else {
            // Multiple selections - sum quantities
            const totalQty = checked.reduce((sum, cb) => sum + parseInt(cb.dataset.quantity), 0);
            const firstEntry = group.entries[0];
            
            resolvedData.push({
                ...firstEntry,
                quantity: totalQty
            });
            console.log(`Summed ${checked.length} entries for ${seban}: ${totalQty}`);
        }
    });
    
    // Add items without duplicates
    originalData.forEach(item => {
        if (!processedSebans.has(item.背番号)) {
            resolvedData.push(item);
        }
    });
    
    console.log('Resolved data after duplicate selection:', resolvedData);
    
    // Update stored data
    window.genComparisonData.newData = resolvedData;
    
    // Show comparison view
    displayComparisonView(resolvedData, existingData);
    
    // Hide duplicate selector, show comparison
    document.getElementById('genDuplicateSelector').classList.add('hidden');
    document.getElementById('genComparisonView').classList.remove('hidden');
    document.getElementById('genSyncOverwriteBtn').classList.remove('hidden');
};

/**
 * Parse GEN CSV data
 */
async function parseGenCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
        throw new Error('CSV file is empty or invalid');
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log('CSV Headers detected:', headers);
    
    // Expected headers: 収容数,日付,背番号
    const 収容数Index = headers.findIndex(h => h.includes('収容数'));
    const 日付Index = headers.findIndex(h => h.includes('日付'));
    const 背番号Index = headers.findIndex(h => h.includes('背番号'));
    
    if (収容数Index === -1 || 日付Index === -1 || 背番号Index === -1) {
        console.error('Header detection failed:', { 収容数Index, 日付Index, 背番号Index });
        throw new Error('CSV headers invalid. Expected: 収容数, 日付, 背番号');
    }
    
    const items = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        
        if (values.length < 3) continue;
        
        const 背番号 = values[背番号Index]?.trim();
        const 収容数 = parseInt(values[収容数Index]?.trim()) || 0;
        const 日付 = values[日付Index]?.trim();
        
        if (背番号 && 収容数 > 0) {
            items.push({ 背番号, 収容数, 日付 });
        }
    }
    
    console.log(`Parsed ${items.length} items from GEN CSV`);
    return items;
}

/**
 * Validate GEN data against masterDB and inventory
 */
async function validateGenData(parsedData, deliveryDate) {
    const validatedItems = [];
    const errors = [];
    
    console.log('Starting validation for', parsedData.length, 'items');
    
    for (const item of parsedData) {
        try {
            console.log(`\nValidating ${item.背番号}...`);
            
            // 1. Query masterDB for this 背番号 with pickingIOT="yes"
            const queryPayload = {
                dbName: 'Sasaki_Coating_MasterDB',
                collectionName: 'masterDB',
                query: { 
                    背番号: item.背番号,
                    pickingIOT: 'yes'
                }
            };
            
            console.log('Querying masterDB:', JSON.stringify(queryPayload, null, 2));
            
            const masterResponse = await fetch(`${BASE_URL}queries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(queryPayload)
            });
            
            if (!masterResponse.ok) {
                console.error(`masterDB fetch failed for ${item.背番号}:`, masterResponse.status, masterResponse.statusText);
                errors.push(`${item.背番号}: Database query failed`);
                continue;
            }
            
            const masterData = await masterResponse.json();
            console.log(`masterDB response for ${item.背番号}:`, masterData);
            
            if (!masterData || masterData.length === 0) {
                console.warn(`${item.背番号} not found in masterDB or pickingIOT != 'yes'`);
                errors.push(`${item.背番号}: Not configured for picking (pickingIOT must be 'yes')`);
                continue;
            }
            
            console.log(`Found in masterDB:`, masterData[0].品番, 'pickingIOT:', masterData[0].pickingIOT);
            
            const masterItem = masterData[0];
            const 品番 = masterItem.品番;
            
            // 2. Check inventory using the same API as CSV upload
            console.log(`Checking inventory for 背番号: ${item.背番号}`);
            
            const inventoryResponse = await fetch(`${BASE_URL}api/noda-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'checkInventory',
                    背番号: item.背番号
                })
            });
            
            if (!inventoryResponse.ok) {
                console.error(`Inventory check failed for ${item.背番号}:`, inventoryResponse.status);
                errors.push(`${item.背番号} (${品番}): Inventory query failed`);
                continue;
            }
            
            const inventoryResult = await inventoryResponse.json();
            console.log(`Inventory response for ${item.背番号}:`, inventoryResult);
            
            if (!inventoryResult.success || !inventoryResult.inventory) {
                console.warn(`${item.背番号} (${品番}) not found in inventory`);
                errors.push(`${item.背番号} (${品番}): Not found in inventory`);
                continue;
            }
            
            const availableQuantity = inventoryResult.inventory.availableQuantity || 0;
            
            console.log(`Stock check: need ${item.収容数}, available ${availableQuantity}`);
            
            if (availableQuantity < item.収容数) {
                console.warn(`${item.背番号} (${品番}) insufficient stock`);
                errors.push(`${item.背番号} (${品番}): Insufficient stock (need ${item.収容数}, have ${availableQuantity})`);
                continue;
            }
            
            // 3. Item is valid, add to list
            console.log(`${item.背番号} validated successfully`);
            validatedItems.push({
                背番号: item.背番号,
                品番: 品番,
                quantity: item.収容数,
                deliveryDate: deliveryDate,
                masterData: masterItem,
                availableQuantity: availableQuantity
            });
            
        } catch (error) {
            console.error(`Error validating ${item.背番号}:`, error);
            errors.push(`${item.背番号}: ${error.message}`);
        }
    }
    
    console.log(`\nValidation Summary:`);
    console.log(`   Valid items: ${validatedItems.length}`);
    console.log(`   Failed items: ${errors.length}`);
    
    if (errors.length > 0) {
        console.warn(`\nValidation errors:`, errors);
    }
    
    if (validatedItems.length === 0) {
        throw new Error(`No valid items found. Errors:\n${errors.join('\n')}`);
    }
    
    console.log(`✅ Validated ${validatedItems.length} items`);
    return validatedItems;
}

/**
 * Check if picking request already exists for the given date
 */
async function checkExistingPickingRequest(deliveryDate) {
    try {
        console.log(`Checking for existing request with date: ${deliveryDate}`);
        
        const response = await fetch(`${BASE_URL}queries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dbName: 'submittedDB',
                collectionName: 'nodaRequestDB',
                query: { pickupDate: deliveryDate }
            })
        });
        
        const data = await response.json();
        
        console.log(`Query result:`, data);
        
        if (data && data.length > 0) {
            console.log(`Found existing picking request for ${deliveryDate}:`, data[0]);
            return data[0]; // Return first matching request
        }
        
        console.log(`No existing picking request found for ${deliveryDate}`);
        return null;
    } catch (error) {
        console.error('Error checking existing request:', error);
        return null;
    }
}

/**
 * Display comparison view
 */
function displayComparisonView(newData, existingData) {
    const comparisonList = document.getElementById('genComparisonList');
    comparisonList.innerHTML = '';
    
    console.log('=== Comparison Debug ===');
    console.log('New data:', newData);
    console.log('Existing data:', existingData);
    console.log('Existing data structure:', existingData ? {
        hasItems: !!existingData.items,
        hasLineItems: !!existingData.lineItems,
        keys: Object.keys(existingData)
    } : 'No existing data');
    
    // Create maps for easy lookup
    const newDataMap = new Map(newData.map(item => [item.背番号, item]));
    
    // Check if existing data uses 'items' or 'lineItems' property
    let existingItems = [];
    if (existingData) {
        if (existingData.lineItems && Array.isArray(existingData.lineItems)) {
            existingItems = existingData.lineItems;
            console.log('Using lineItems from existing data');
        } else if (existingData.items && Array.isArray(existingData.items)) {
            existingItems = existingData.items;
            console.log('Using items from existing data');
        } else {
            console.warn('Existing data has unexpected structure');
        }
    }
    
    const existingDataMap = new Map(existingItems.map(item => [item.背番号, item]));
    
    console.log('New data map size:', newDataMap.size);
    console.log('Existing data map size:', existingDataMap.size);
    console.log('New data keys:', Array.from(newDataMap.keys()));
    console.log('Existing data keys:', Array.from(existingDataMap.keys()));
    
    // Get all unique 背番号
    const all背番号 = new Set([...newDataMap.keys(), ...existingDataMap.keys()]);
    
    let hasAnyChanges = false;
    
    all背番号.forEach(背番号 => {
        const newItem = newDataMap.get(背番号);
        const existingItem = existingDataMap.get(背番号);
        
        console.log(`\nComparing ${背番号}:`, {
            hasNew: !!newItem,
            hasExisting: !!existingItem,
            newQty: newItem?.quantity,
            existingQty: existingItem?.quantity,
            qtyMatch: newItem?.quantity === existingItem?.quantity
        });
        
        let bgColor, content, icon;
        
        if (newItem && existingItem) {
            // Item exists in both - check if quantity changed
            const qtyChanged = newItem.quantity !== existingItem.quantity;
            
            console.log(`  Both exist. Qty changed: ${qtyChanged} (${existingItem.quantity} → ${newItem.quantity})`);
            
            if (qtyChanged) {
                // Quantity changed - will be updated (GREEN)
                bgColor = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
                icon = '🔄';
                hasAnyChanges = true;
                content = `
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <span class="font-semibold">${背番号}</span>
                            <span class="text-gray-600 dark:text-gray-400 mx-2">|</span>
                            <span class="text-sm text-gray-700 dark:text-gray-300">${newItem.品番}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="text-red-600 dark:text-red-400 line-through">${existingItem.quantity}</span>
                            <i class="ri-arrow-right-line text-gray-400"></i>
                            <span class="text-green-600 dark:text-green-400 font-semibold">${newItem.quantity}</span>
                        </div>
                    </div>
                `;
            } else {
                // Same quantity - no change (WHITE)
                bgColor = 'bg-white dark:bg-gray-800';
                icon = '✓';
                content = `
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <span class="font-semibold">${背番号}</span>
                            <span class="text-gray-600 dark:text-gray-400 mx-2">|</span>
                            <span class="text-sm text-gray-700 dark:text-gray-300">${newItem.品番}</span>
                            <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">(No changes)</span>
                        </div>
                        <div class="text-gray-600 dark:text-gray-400">${newItem.quantity}</div>
                    </div>
                `;
            }
        } else if (newItem && !existingItem) {
            // New item - will be added
            bgColor = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
            icon = '✨';
            hasAnyChanges = true;
            content = `
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <span class="font-semibold">${背番号}</span>
                        <span class="text-gray-600 dark:text-gray-400 mx-2">|</span>
                        <span class="text-sm text-gray-700 dark:text-gray-300">${newItem.品番}</span>
                        <span class="ml-2 text-xs text-green-600 dark:text-green-400 font-medium">(NEW)</span>
                    </div>
                    <div class="text-green-600 dark:text-green-400 font-semibold">${newItem.quantity}</div>
                </div>
            `;
        } else if (!newItem && existingItem) {
            // Item not in GEN - will be removed
            bgColor = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
            icon = '🗑️';
            hasAnyChanges = true;
            content = `
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <span class="font-semibold text-red-600 dark:text-red-400">${背番号}</span>
                        <span class="text-gray-600 dark:text-gray-400 mx-2">|</span>
                        <span class="text-sm text-gray-500 dark:text-gray-400">${existingItem.品番 || 'Unknown'}</span>
                        <span class="ml-2 text-xs text-red-600 dark:text-red-400 font-medium">(WILL BE DELETED)</span>
                    </div>
                    <div class="text-red-600 dark:text-red-400">${existingItem.quantity}</div>
                </div>
            `;
        }
        
        const itemHTML = `
            <div class="${bgColor} border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-all hover:shadow-md">
                <div class="flex items-center space-x-3">
                    <span class="text-xl">${icon}</span>
                    <div class="flex-1">
                        ${content}
                    </div>
                </div>
            </div>
        `;
        
        comparisonList.insertAdjacentHTML('beforeend', itemHTML);
    });
    
    // If no changes detected, show a message
    if (!hasAnyChanges) {
        comparisonList.innerHTML = `
            <div class="text-center py-12">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
                    <i class="ri-check-line text-3xl text-green-600 dark:text-green-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Changes Detected</h3>
                <p class="text-gray-600 dark:text-gray-400">The GEN data matches the existing picking request. All items have the same quantities.</p>
                <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">No update is needed.</p>
            </div>
        `;
        
        // Hide the overwrite button since there's nothing to update
        document.getElementById('genSyncOverwriteBtn').classList.add('hidden');
    }
}

/**
 * Overwrite existing picking request with GEN data
 */
window.overwriteWithGenData = async function() {
    if (!window.genComparisonData) {
        showGenError('No comparison data available');
        return;
    }
    
    const { newData, existingData, deliveryDate } = window.genComparisonData;
    
    const overwriteBtn = document.getElementById('genSyncOverwriteBtn');
    overwriteBtn.disabled = true;
    overwriteBtn.innerHTML = '<div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Creating...';
    
    try {
        updateGenProgress(10, '🔄 Preparing picking request...');
        
        // Format items for nodaDB
        const items = newData.map(item => ({
            背番号: item.背番号,
            品番: item.品番,
            quantity: item.quantity,
            status: 'pending',
            timestamp: new Date().toISOString()
        }));
        
        updateGenProgress(50, '💾 Saving to database...');
        
        if (existingData) {
            // Update existing request
            const updateResponse = await fetch(`${BASE_URL}update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dbName: 'submittedDB',
                    collectionName: 'nodaDB',
                    query: { _id: { $oid: existingData._id.$oid } },
                    update: {
                        $set: {
                            items: items,
                            updatedAt: new Date().toISOString(),
                            updatedBy: currentUser.username || 'system',
                            syncedFromGEN: true
                        }
                    }
                })
            });
            
            if (!updateResponse.ok) {
                throw new Error('Failed to update picking request');
            }
            
            console.log('Updated existing picking request');
        } else {
            // Create new request using bulk request API
            const insertResponse = await fetch(`${BASE_URL}api/noda-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'bulkCreateRequests',
                    data: {
                        items: items,
                        pickupDate: deliveryDate
                    },
                    userName: currentUser.username || 'system'
                })
            });
            
            if (!insertResponse.ok) {
                throw new Error('Failed to create picking request');
            }
            
            const result = await insertResponse.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to create picking request');
            }
            
            console.log('Created new picking request:', result.bulkRequestNumber);
        }
        
        updateGenProgress(100, '✅ Complete!');
        
        // Show success message
        showToast(existingData ? 'Picking request updated successfully!' : 'Picking request created successfully!', 'success');
        
        // Close modal and refresh data
        setTimeout(() => {
            closeGenSyncModal();
            loadNodaData();
        }, 1000);
        
    } catch (error) {
        console.error('Error overwriting with GEN data:', error);
        showGenError(error.message);
        updateGenProgress(0, '');
        
        overwriteBtn.disabled = false;
        overwriteBtn.innerHTML = '<i class="ri-check-line mr-2"></i>Overwrite Existing';
    }
};
