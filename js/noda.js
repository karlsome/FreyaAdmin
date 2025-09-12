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
    
    // Set default dates for filters
    const today = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    document.getElementById('nodaDateFrom').value = today;
    document.getElementById('nodaDateTo').value = weekFromNow;
    
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
                <p>No picking requests found matching your criteria.</p>
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
                        Request # ${getNodaSortArrow('requestNumber')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortNodaTable('status')">
                        Status ${getNodaSortArrow('status')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortNodaTable('品番')">
                        品番 ${getNodaSortArrow('品番')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortNodaTable('背番号')">
                        背番号 ${getNodaSortArrow('背番号')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortNodaTable('date')">
                        Pickup Date ${getNodaSortArrow('date')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortNodaTable('quantity')">
                        Quantity ${getNodaSortArrow('quantity')}
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
                    const pickupDate = new Date(item.date).toLocaleDateString();
                    
                    return `
                        <tr class="border-b hover:bg-gray-50 cursor-pointer ${statusInfo.rowClass}" onclick="openNodaDetail('${item._id}')">
                            <td class="px-4 py-3 font-medium text-blue-600">
                                <span class="hover:underline">
                                    ${item.requestNumber}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.badgeClass}">
                                    <i class="${statusInfo.icon} mr-1"></i>
                                    ${statusInfo.text}
                                </span>
                            </td>
                            <td class="px-4 py-3">${item.品番}</td>
                            <td class="px-4 py-3">${item.背番号}</td>
                            <td class="px-4 py-3">${pickupDate}</td>
                            <td class="px-4 py-3">${item.quantity}</td>
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
        case 'active':
            return { text: 'Active', icon: 'ri-play-line', badgeClass: 'bg-blue-100 text-blue-800', rowClass: '' };
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
        pageInfo.textContent = 'No items to display';
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

/**
 * Close add request modal
 */
window.closeNodaAddModal = function() {
    const modal = document.getElementById('nodaAddModal');
    modal.classList.add('hidden');
    clearNodaAddModalForm();
};

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
        Auto-generated ${fieldName}: ${value}
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
                const available = result.inventory.runningQuantity;
                const isEnough = quantity <= available;
                
                resultDiv.innerHTML = `
                    <span class="${isEnough ? 'text-green-600' : 'text-red-600'}">
                        <i class="ri-${isEnough ? 'checkbox-circle' : 'error-warning'}-line mr-1"></i>
                        Available: ${available} ${quantity > 0 ? `(${isEnough ? 'Sufficient' : 'Insufficient'})` : ''}
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
                resultDiv.innerHTML = '<span class="text-red-600"><i class="ri-error-warning-line mr-1"></i>Not found in inventory</span>';
                const backNumberInput = document.getElementById('modalNodaBackNumber');
                backNumberInput.classList.remove('border-green-500');
                backNumberInput.classList.add('border-red-500');
            }
        }
    } catch (error) {
        console.error('Error checking inventory:', error);
        resultDiv.innerHTML = '<span class="text-red-600"><i class="ri-error-warning-line mr-1"></i>Error checking inventory</span>';
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
        alert('Please select a valid CSV file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csv = e.target.result;
        parseAndUploadNodaCsv(csv);
    };
    reader.readAsText(file);
};

/**
 * Parse and upload CSV data
 */
async function parseAndUploadNodaCsv(csvData) {
    try {
        const lines = csvData.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Expected headers: 品番, 背番号, Date, Quantity
        const requiredHeaders = ['品番', '背番号', 'Date', 'Quantity'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            alert(`Missing required columns: ${missingHeaders.join(', ')}`);
            return;
        }
        
        const requests = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const request = {};
            
            headers.forEach((header, index) => {
                request[header] = values[index];
            });
            
            // Validate required fields
            if (request['品番'] && request['背番号'] && request['Date'] && request['Quantity']) {
                request.quantity = parseInt(request['Quantity']);
                requests.push(request);
            }
        }
        
        if (requests.length === 0) {
            alert('No valid requests found in CSV');
            return;
        }
        
        // Upload requests
        // Get current user information and fetch full name from database
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        console.log('👤 CSV Upload - Current user object:', currentUser);
        
        const userName = await getUserFullName(currentUser.username || 'unknown');
        console.log('🏷️ CSV Upload - Final userName from database:', userName);
        
        const response = await fetch(`${BASE_URL}/api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'bulkCreateRequests',
                data: requests,
                userName: userName
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Successfully uploaded ${result.successCount} requests!`);
            if (result.failedCount > 0) {
                alert(`${result.failedCount} requests failed due to insufficient inventory`);
            }
            loadNodaData();
        } else {
            alert('Error uploading CSV: ' + (result.error || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file: ' + error.message);
    }
}

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
        const response = await fetch(`${BASE_URL}/api/noda-requests`, {
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
    const pickupDate = new Date(request.date).toLocaleDateString();
    
    content.innerHTML = `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Request Number</label>
                        <p class="mt-1 text-lg font-semibold text-blue-600">${request.requestNumber}</p>
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
        const response = await fetch(`${BASE_URL}/api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'deleteRequest',
                requestId: requestId
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

// Make functions globally available
window.initializeNodaSystem = initializeNodaSystem;
