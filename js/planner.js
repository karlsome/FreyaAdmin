// Production Planner Module
// Handles production planning with timeline, kanban, and table views

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const PLANNER_CONFIG = {
    workStartTime: '08:45',
    workEndTime: '20:00',
    intervalMinutes: 15,
    defaultCycleTime: 120, // 2 minutes in seconds (default if 秒数 is empty)
    defaultPcPerCycle: 1,
    lunchBreakDuration: 45, // minutes
    shortBreakDuration: 15, // minutes
    dbName: 'submittedDB',
    plansCollection: 'productionPlansDB',
    pressCollection: 'pressDB',
    masterDbName: 'Sasaki_Coating_MasterDB',
    masterCollection: 'masterDB'
};

// Global state
let plannerState = {
    currentFactory: '',
    currentDate: new Date().toISOString().split('T')[0],
    endDate: null, // For date range plans
    equipment: [],
    products: [],
    plans: [],
    currentPlan: null,
    selectedProducts: [],
    breaks: [],
    activeTab: 'timeline',
    productColors: {},
    colorIndex: 0
};

// Color palette for products
const PRODUCT_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#14B8A6', '#F43F5E', '#A855F7', '#22C55E', '#FBBF24',
    '#E879F9', '#2DD4BF', '#FB7185', '#A3E635', '#818CF8'
];

// ============================================
// INITIALIZATION
// ============================================
async function initializePlanner() {
    console.log('📅 Initializing Production Planner...');
    
    // Set default date to today
    const dateInput = document.getElementById('plannerDate');
    if (dateInput) {
        dateInput.value = plannerState.currentDate;
    }
    
    // Load factories
    await loadPlannerFactories();
    
    // Setup event listeners
    setupPlannerEventListeners();
    
    // Apply translations
    if (typeof applyLanguageEnhanced === 'function') {
        applyLanguageEnhanced();
    }
    
    console.log('✅ Production Planner initialized');
}

function setupPlannerEventListeners() {
    // Factory selection
    const factorySelect = document.getElementById('plannerFactory');
    if (factorySelect) {
        factorySelect.addEventListener('change', handleFactoryChange);
    }
    
    // Date selection
    const dateInput = document.getElementById('plannerDate');
    if (dateInput) {
        dateInput.addEventListener('change', handleDateChange);
    }
    
    // End date selection (for range)
    const endDateInput = document.getElementById('plannerEndDate');
    if (endDateInput) {
        endDateInput.addEventListener('change', handleEndDateChange);
    }
    
    // Tab switching
    document.querySelectorAll('.planner-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchPlannerTab(e.target.dataset.tab));
    });
    
    // Product search
    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.addEventListener('input', filterProducts);
    }
}

// ============================================
// DATA LOADING
// ============================================
async function loadPlannerFactories() {
    try {
        const response = await fetch(BASE_URL + 'api/masterdb/factories');
        const result = await response.json();
        
        if (result.success && result.data) {
            const factorySelect = document.getElementById('plannerFactory');
            if (factorySelect) {
                factorySelect.innerHTML = '<option value="" data-i18n="selectFactory">-- Select Factory --</option>';
                result.data.forEach(factory => {
                    const option = document.createElement('option');
                    option.value = factory;
                    option.textContent = factory;
                    factorySelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('❌ Failed to load factories:', error);
        showPlannerNotification('Failed to load factories', 'error');
    }
}

async function loadEquipmentForFactory(factory) {
    try {
        // Get unique equipment from pressDB for the selected factory
        const response = await fetch(BASE_URL + 'queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dbName: PLANNER_CONFIG.dbName,
                collectionName: PLANNER_CONFIG.pressCollection,
                query: { '工場': factory },
                projection: { '設備': 1 }
            })
        });
        
        const data = await response.json();
        
        // Extract unique equipment
        const equipmentSet = new Set();
        data.forEach(item => {
            if (item.設備) {
                equipmentSet.add(item.設備);
            }
        });
        
        plannerState.equipment = Array.from(equipmentSet).sort();
        console.log(`📦 Loaded ${plannerState.equipment.length} equipment for ${factory}`);
        
        return plannerState.equipment;
    } catch (error) {
        console.error('❌ Failed to load equipment:', error);
        return [];
    }
}

async function loadProductsForFactory(factory) {
    try {
        const response = await fetch(BASE_URL + 'queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dbName: PLANNER_CONFIG.masterDbName,
                collectionName: PLANNER_CONFIG.masterCollection,
                query: { '工場': factory }
            })
        });
        
        const data = await response.json();
        plannerState.products = data;
        
        // Assign colors to products
        data.forEach(product => {
            if (!plannerState.productColors[product.背番号]) {
                plannerState.productColors[product.背番号] = PRODUCT_COLORS[plannerState.colorIndex % PRODUCT_COLORS.length];
                plannerState.colorIndex++;
            }
        });
        
        console.log(`📦 Loaded ${plannerState.products.length} products for ${factory}`);
        
        return plannerState.products;
    } catch (error) {
        console.error('❌ Failed to load products:', error);
        return [];
    }
}

async function loadExistingPlans(factory, date) {
    try {
        const response = await fetch(BASE_URL + 'queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dbName: PLANNER_CONFIG.dbName,
                collectionName: PLANNER_CONFIG.plansCollection,
                query: { 
                    '工場': factory,
                    'planDate': date
                }
            })
        });
        
        const data = await response.json();
        plannerState.plans = data;
        
        console.log(`📋 Loaded ${plannerState.plans.length} existing plans`);
        
        return plannerState.plans;
    } catch (error) {
        console.error('❌ Failed to load existing plans:', error);
        return [];
    }
}

// ============================================
// EVENT HANDLERS
// ============================================
async function handleFactoryChange(e) {
    const factory = e.target.value;
    plannerState.currentFactory = factory;
    
    if (!factory) {
        clearPlannerViews();
        return;
    }
    
    showPlannerLoading(true);
    
    try {
        // Load equipment and products in parallel
        await Promise.all([
            loadEquipmentForFactory(factory),
            loadProductsForFactory(factory),
            loadExistingPlans(factory, plannerState.currentDate)
        ]);
        
        // Render views
        renderProductList();
        renderAllViews();
        
    } catch (error) {
        console.error('❌ Error loading factory data:', error);
        showPlannerNotification('Failed to load factory data', 'error');
    } finally {
        showPlannerLoading(false);
    }
}

function handleDateChange(e) {
    plannerState.currentDate = e.target.value;
    
    if (plannerState.currentFactory) {
        loadExistingPlans(plannerState.currentFactory, plannerState.currentDate)
            .then(() => renderAllViews());
    }
}

function handleEndDateChange(e) {
    plannerState.endDate = e.target.value || null;
}

function switchPlannerTab(tab) {
    plannerState.activeTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.planner-tab-btn').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    const activeBtn = document.querySelector(`.planner-tab-btn[data-tab="${tab}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('border-transparent', 'text-gray-500');
        activeBtn.classList.add('border-blue-500', 'text-blue-600');
    }
    
    // Show/hide view containers
    document.querySelectorAll('.planner-view').forEach(view => {
        view.classList.add('hidden');
    });
    
    const activeView = document.getElementById(`planner-${tab}-view`);
    if (activeView) {
        activeView.classList.remove('hidden');
    }
    
    // Re-render the active view
    renderActiveView();
}

// ============================================
// TIME CALCULATIONS
// ============================================
function calculateProductionTime(product, quantity) {
    // Get cycle time in seconds (default 120 seconds = 2 minutes)
    const cycleTimeSeconds = parseFloat(product['秒数(1pcs何秒)']) || PLANNER_CONFIG.defaultCycleTime;
    
    // Get pieces per cycle (default 1)
    const pcPerCycle = parseInt(product.pcPerCycle) || PLANNER_CONFIG.defaultPcPerCycle;
    
    // Calculate number of cycles needed
    const cyclesNeeded = Math.ceil(quantity / pcPerCycle);
    
    // Total time in seconds
    const totalSeconds = cyclesNeeded * cycleTimeSeconds;
    
    // Convert to hours and minutes
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    return {
        totalSeconds,
        hours,
        minutes,
        cyclesNeeded,
        formattedTime: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    };
}

function calculateBoxesNeeded(product, quantity) {
    const capacity = parseInt(product['収容数']) || 1;
    return Math.ceil(quantity / capacity);
}

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function getTimeSlots() {
    const slots = [];
    const startMinutes = timeToMinutes(PLANNER_CONFIG.workStartTime);
    const endMinutes = timeToMinutes(PLANNER_CONFIG.workEndTime);
    
    for (let m = startMinutes; m <= endMinutes; m += PLANNER_CONFIG.intervalMinutes) {
        slots.push(minutesToTime(m));
    }
    
    return slots;
}

function getEffectiveWorkMinutes() {
    const startMinutes = timeToMinutes(PLANNER_CONFIG.workStartTime);
    const endMinutes = timeToMinutes(PLANNER_CONFIG.workEndTime);
    const totalMinutes = endMinutes - startMinutes;
    
    // Subtract breaks
    const breakMinutes = plannerState.breaks.reduce((sum, brk) => {
        const breakStart = timeToMinutes(brk.start);
        const breakEnd = timeToMinutes(brk.end);
        return sum + (breakEnd - breakStart);
    }, 0);
    
    return totalMinutes - breakMinutes;
}

// ============================================
// PRODUCT LIST & SELECTION
// ============================================
function renderProductList() {
    const container = document.getElementById('productListContainer');
    if (!container) return;
    
    const searchTerm = document.getElementById('productSearch')?.value?.toLowerCase() || '';
    
    const filteredProducts = plannerState.products.filter(product => {
        if (!searchTerm) return true;
        
        return (
            (product.品番 || '').toLowerCase().includes(searchTerm) ||
            (product.背番号 || '').toLowerCase().includes(searchTerm) ||
            (product.品名 || '').toLowerCase().includes(searchTerm) ||
            (product.モデル || '').toLowerCase().includes(searchTerm)
        );
    }).sort((a, b) => {
        // Sort alphabetically by 背番号
        const aSerial = (a.背番号 || '').toLowerCase();
        const bSerial = (b.背番号 || '').toLowerCase();
        return aSerial.localeCompare(bSerial);
    });
    
    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="ri-inbox-line text-4xl mb-2"></i>
                <p data-i18n="noProductsFound">No products found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredProducts.map(product => {
        const color = plannerState.productColors[product.背番号] || '#6B7280';
        const isSelected = plannerState.selectedProducts.some(p => p._id === product._id);
        
        return `
            <div class="product-card p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}"
                 onclick="toggleProductSelection('${product._id}')"
                 data-product-id="${product._id}">
                <div class="flex items-center gap-3">
                    <div class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${color}"></div>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-sm text-gray-900 dark:text-white truncate">${product.背番号 || '-'}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${product.品番 || '-'}</p>
                        <p class="text-xs text-gray-400 dark:text-gray-500 truncate">${product.品名 || '-'}</p>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <p class="text-xs text-gray-500 dark:text-gray-400">収容: ${product['収容数'] || '-'}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">秒数: ${product['秒数(1pcs何秒)'] || '120'}s</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterProducts() {
    renderProductList();
}

function toggleProductSelection(productId) {
    const product = plannerState.products.find(p => p._id === productId);
    if (!product) return;
    
    const index = plannerState.selectedProducts.findIndex(p => p._id === productId);
    
    if (index === -1) {
        // Add to selection - show quantity input modal
        showAddProductModal(product);
    } else {
        // Remove from selection
        plannerState.selectedProducts.splice(index, 1);
        renderProductList();
        updateSelectedProductsSummary();
    }
}

function showAddProductModal(product) {
    const color = plannerState.productColors[product.背番号] || '#6B7280';
    const capacity = parseInt(product['収容数']) || 1;
    
    const modalHTML = `
        <div id="addProductModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                <div class="p-6">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-4 h-4 rounded-full" style="background-color: ${color}"></div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${product.背番号}</h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400">${product.品名 || product.品番}</p>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="targetQuantity">Target Quantity</label>
                            <input type="number" id="productQuantity" min="1" value="${capacity}" 
                                   class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                   oninput="updateQuantityPreview('${product._id}')">
                        </div>
                        
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p class="text-gray-500 dark:text-gray-400" data-i18n="boxesNeeded">Boxes Needed</p>
                                    <p id="boxesPreview" class="text-lg font-semibold text-gray-900 dark:text-white">1</p>
                                </div>
                                <div>
                                    <p class="text-gray-500 dark:text-gray-400" data-i18n="estimatedTime">Estimated Time</p>
                                    <p id="timePreview" class="text-lg font-semibold text-gray-900 dark:text-white">-</p>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="assignToEquipment">Assign to Equipment</label>
                            <select id="equipmentSelect" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                                <option value="" data-i18n="selectEquipment">-- Select Equipment --</option>
                                ${plannerState.equipment.map(eq => `<option value="${eq}">${eq}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="flex justify-end gap-3 mt-6">
                        <button onclick="closeAddProductModal()" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" data-i18n="cancel">Cancel</button>
                        <button onclick="confirmAddProduct('${product._id}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" data-i18n="addToPlan">Add to Plan</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Store product reference for preview calculations
    window.currentAddProduct = product;
    updateQuantityPreview(product._id);
    
    // Apply translations
    if (typeof applyLanguageEnhanced === 'function') {
        applyLanguageEnhanced();
    }
}

function updateQuantityPreview(productId) {
    const product = window.currentAddProduct;
    if (!product) return;
    
    const quantity = parseInt(document.getElementById('productQuantity')?.value) || 1;
    const boxes = calculateBoxesNeeded(product, quantity);
    const time = calculateProductionTime(product, quantity);
    
    document.getElementById('boxesPreview').textContent = boxes;
    document.getElementById('timePreview').textContent = time.formattedTime;
}

function closeAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) modal.remove();
    window.currentAddProduct = null;
}

function confirmAddProduct(productId) {
    const product = window.currentAddProduct;
    if (!product) return;
    
    const quantity = parseInt(document.getElementById('productQuantity')?.value) || 1;
    const equipment = document.getElementById('equipmentSelect')?.value;
    
    if (!equipment) {
        showPlannerNotification('Please select equipment', 'warning');
        return;
    }
    
    const timeInfo = calculateProductionTime(product, quantity);
    const boxes = calculateBoxesNeeded(product, quantity);
    
    plannerState.selectedProducts.push({
        ...product,
        quantity,
        equipment,
        boxes,
        estimatedTime: timeInfo,
        color: plannerState.productColors[product.背番号]
    });
    
    closeAddProductModal();
    renderProductList();
    updateSelectedProductsSummary();
    renderAllViews();
}

function updateSelectedProductsSummary() {
    const container = document.getElementById('selectedProductsSummary');
    if (!container) return;
    
    if (plannerState.selectedProducts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <p data-i18n="noProductsSelected">No products selected</p>
            </div>
        `;
        return;
    }
    
    // Group by equipment
    const byEquipment = {};
    plannerState.selectedProducts.forEach(item => {
        if (!byEquipment[item.equipment]) {
            byEquipment[item.equipment] = {
                items: [],
                totalMinutes: 0
            };
        }
        byEquipment[item.equipment].items.push(item);
        byEquipment[item.equipment].totalMinutes += item.estimatedTime.totalSeconds / 60;
    });
    
    container.innerHTML = Object.entries(byEquipment).map(([equipment, data]) => {
        const hours = Math.floor(data.totalMinutes / 60);
        const mins = Math.round(data.totalMinutes % 60);
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        const effectiveWork = getEffectiveWorkMinutes();
        const utilization = Math.round((data.totalMinutes / effectiveWork) * 100);
        const isOverCapacity = utilization > 100;
        
        return `
            <div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-3">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-gray-900 dark:text-white">${equipment}</h4>
                    <span class="text-sm ${isOverCapacity ? 'text-red-600 font-bold' : 'text-gray-500 dark:text-gray-400'}">
                        ${timeStr} (${utilization}%)
                        ${isOverCapacity ? '<i class="ri-alert-fill ml-1"></i>' : ''}
                    </span>
                </div>
                <div class="space-y-2">
                    ${data.items.map(item => `
                        <div class="flex items-center justify-between text-sm">
                            <div class="flex items-center gap-2">
                                <div class="w-2 h-2 rounded-full" style="background-color: ${item.color}"></div>
                                <span class="text-gray-700 dark:text-gray-300">${item.背番号}</span>
                            </div>
                            <div class="flex items-center gap-4">
                                <span class="text-gray-500 dark:text-gray-400">${item.quantity}pcs</span>
                                <span class="text-gray-500 dark:text-gray-400">${item.estimatedTime.formattedTime}</span>
                                <button onclick="removeSelectedProduct('${item._id}')" class="text-red-500 hover:text-red-700">
                                    <i class="ri-close-line"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${isOverCapacity ? `
                    <div class="mt-2 text-xs text-red-600 dark:text-red-400">
                        <i class="ri-error-warning-line mr-1"></i>
                        <span data-i18n="exceedsCapacity">Exceeds daily capacity</span>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function removeSelectedProduct(productId) {
    const index = plannerState.selectedProducts.findIndex(p => p._id === productId);
    if (index !== -1) {
        plannerState.selectedProducts.splice(index, 1);
        renderProductList();
        updateSelectedProductsSummary();
        renderAllViews();
    }
}

// ============================================
// VIEW RENDERING
// ============================================
function renderAllViews() {
    renderTimelineView();
    renderKanbanView();
    renderTableView();
}

function renderActiveView() {
    switch (plannerState.activeTab) {
        case 'timeline':
            renderTimelineView();
            break;
        case 'kanban':
            renderKanbanView();
            break;
        case 'table':
            renderTableView();
            break;
    }
}

function clearPlannerViews() {
    plannerState.equipment = [];
    plannerState.products = [];
    plannerState.selectedProducts = [];
    
    document.getElementById('productListContainer').innerHTML = '';
    document.getElementById('selectedProductsSummary').innerHTML = '';
    document.getElementById('timelineContainer').innerHTML = '';
    document.getElementById('kanbanContainer').innerHTML = '';
    document.getElementById('tableContainer').innerHTML = '';
}

// ============================================
// TIMELINE VIEW
// ============================================
function renderTimelineView() {
    const container = document.getElementById('timelineContainer');
    if (!container) return;
    
    if (plannerState.equipment.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="ri-calendar-line text-4xl mb-2"></i>
                <p data-i18n="selectFactoryFirst">Please select a factory first</p>
            </div>
        `;
        return;
    }
    
    const timeSlots = getTimeSlots();
    const slotWidth = 60; // pixels per 15-minute slot
    
    // Build timeline header
    let headerHTML = '<div class="flex-shrink-0 w-24 bg-gray-100 dark:bg-gray-700 border-r dark:border-gray-600 p-2 font-medium text-gray-700 dark:text-gray-300" data-i18n="equipment">Equipment</div>';
    
    timeSlots.forEach((slot, index) => {
        // Only show hour labels
        const showLabel = slot.endsWith(':00') || slot.endsWith(':45') && index === 0;
        headerHTML += `
            <div class="flex-shrink-0 border-r dark:border-gray-600 text-center text-xs text-gray-500 dark:text-gray-400 ${showLabel ? 'font-medium' : ''}" style="width: ${slotWidth}px">
                ${showLabel ? slot : ''}
            </div>
        `;
    });
    
    // Build equipment rows
    let rowsHTML = '';
    plannerState.equipment.forEach(equipment => {
        const assignedProducts = plannerState.selectedProducts.filter(p => p.equipment === equipment);
        
        rowsHTML += `
            <div class="flex border-b dark:border-gray-600 min-h-[60px]" data-equipment="${equipment}">
                <div class="flex-shrink-0 w-24 bg-gray-50 dark:bg-gray-700/50 border-r dark:border-gray-600 p-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    ${equipment}
                </div>
                <div class="flex-1 flex relative">
                    ${renderTimelineSlots(timeSlots, equipment, assignedProducts, slotWidth)}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = `
        <div class="overflow-x-auto border rounded-lg dark:border-gray-600">
            <div class="min-w-max">
                <!-- Header -->
                <div class="flex border-b dark:border-gray-600 bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                    ${headerHTML}
                </div>
                <!-- Rows -->
                <div class="bg-white dark:bg-gray-800">
                    ${rowsHTML}
                </div>
            </div>
        </div>
        
        <!-- Legend -->
        <div class="mt-4 flex flex-wrap gap-4">
            <div class="flex items-center gap-2 text-sm">
                <div class="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <span data-i18n="breakTime">Break Time</span>
            </div>
            ${Object.entries(plannerState.productColors).slice(0, 10).map(([name, color]) => `
                <div class="flex items-center gap-2 text-sm">
                    <div class="w-4 h-4 rounded" style="background-color: ${color}"></div>
                    <span>${name}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function renderTimelineSlots(timeSlots, equipment, assignedProducts, slotWidth) {
    let html = '';
    let currentMinutes = timeToMinutes(PLANNER_CONFIG.workStartTime);
    let productIndex = 0;
    
    timeSlots.forEach((slot, index) => {
        const slotMinutes = timeToMinutes(slot);
        
        // Check if this slot is a break
        const isBreak = plannerState.breaks.some(brk => {
            const breakStart = timeToMinutes(brk.start);
            const breakEnd = timeToMinutes(brk.end);
            return slotMinutes >= breakStart && slotMinutes < breakEnd;
        });
        
        if (isBreak) {
            html += `
                <div class="flex-shrink-0 bg-gray-300 dark:bg-gray-600 border-r dark:border-gray-500" style="width: ${slotWidth}px" title="Break Time"></div>
            `;
        } else {
            // Check if any product is scheduled for this slot
            let productForSlot = null;
            let accumulatedMinutes = 0;
            
            for (let i = 0; i < assignedProducts.length; i++) {
                const product = assignedProducts[i];
                const productMinutes = product.estimatedTime.totalSeconds / 60;
                
                if (slotMinutes >= currentMinutes + accumulatedMinutes && 
                    slotMinutes < currentMinutes + accumulatedMinutes + productMinutes) {
                    productForSlot = product;
                    break;
                }
                accumulatedMinutes += productMinutes;
            }
            
            if (productForSlot) {
                html += `
                    <div class="flex-shrink-0 border-r dark:border-gray-500 relative group" 
                         style="width: ${slotWidth}px; background-color: ${productForSlot.color}20">
                        <div class="absolute inset-0 flex items-center justify-center text-xs font-medium truncate px-1" 
                             style="color: ${productForSlot.color}" 
                             title="${productForSlot.背番号} - ${productForSlot.quantity}pcs">
                            ${index === 0 || timeSlots[index - 1] !== slot ? productForSlot.背番号 : ''}
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="flex-shrink-0 border-r dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer group relative" 
                         style="width: ${slotWidth}px"
                         onclick="handleTimelineSlotClick('${equipment}', '${slot}')" 
                         title="Click to add products">
                        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <i class="ri-add-circle-line text-blue-500 text-lg"></i>
                        </div>
                    </div>
                `;
            }
        }
    });
    
    return html;
}

function handleTimelineSlotClick(equipment, timeSlot) {
    // Open multi-column product picker modal
    showMultiColumnProductPicker(equipment, timeSlot);
}

// ============================================
// KANBAN VIEW
// ============================================
function renderKanbanView() {
    const container = document.getElementById('kanbanContainer');
    if (!container) return;
    
    if (plannerState.equipment.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="ri-layout-column-line text-4xl mb-2"></i>
                <p data-i18n="selectFactoryFirst">Please select a factory first</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="flex gap-4 overflow-x-auto pb-4">
            ${plannerState.equipment.map(equipment => {
                const assignedProducts = plannerState.selectedProducts.filter(p => p.equipment === equipment);
                const totalMinutes = assignedProducts.reduce((sum, p) => sum + p.estimatedTime.totalSeconds / 60, 0);
                const hours = Math.floor(totalMinutes / 60);
                const mins = Math.round(totalMinutes % 60);
                const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                const effectiveWork = getEffectiveWorkMinutes();
                const utilization = Math.round((totalMinutes / effectiveWork) * 100);
                const isOverCapacity = utilization > 100;
                
                return `
                    <div class="flex-shrink-0 w-72 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                        <div class="p-3 border-b dark:border-gray-600 bg-white dark:bg-gray-800 rounded-t-lg">
                            <div class="flex items-center justify-between">
                                <h3 class="font-semibold text-gray-900 dark:text-white">${equipment}</h3>
                                <span class="text-xs px-2 py-1 rounded-full ${isOverCapacity ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}">
                                    ${timeStr}
                                </span>
                            </div>
                            <div class="mt-2">
                                <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div class="h-2 rounded-full transition-all ${isOverCapacity ? 'bg-red-500' : 'bg-blue-500'}" 
                                         style="width: ${Math.min(utilization, 100)}%"></div>
                                </div>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${utilization}% <span data-i18n="utilization">utilization</span></p>
                            </div>
                        </div>
                        <div class="p-3 space-y-2 min-h-[200px] max-h-[400px] overflow-y-auto"
                             ondrop="handleKanbanDrop(event, '${equipment}')"
                             ondragover="handleKanbanDragOver(event)">
                            ${assignedProducts.length === 0 ? `
                                <div class="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                                    <i class="ri-drag-drop-line text-2xl mb-2"></i>
                                    <p data-i18n="dropProductsHere">Drop products here</p>
                                </div>
                            ` : assignedProducts.map(item => `
                                <div class="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-600 shadow-sm cursor-move"
                                     draggable="true"
                                     ondragstart="handleKanbanDragStart(event, '${item._id}')"
                                     data-product-id="${item._id}">
                                    <div class="flex items-center gap-2 mb-2">
                                        <div class="w-3 h-3 rounded-full" style="background-color: ${item.color}"></div>
                                        <span class="font-medium text-gray-900 dark:text-white">${item.背番号}</span>
                                    </div>
                                    <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                        <div class="flex justify-between">
                                            <span data-i18n="quantity">Quantity</span>
                                            <span>${item.quantity}pcs</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span data-i18n="boxes">Boxes</span>
                                            <span>${item.boxes}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span data-i18n="time">Time</span>
                                            <span>${item.estimatedTime.formattedTime}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Kanban drag and drop
function handleKanbanDragStart(event, productId) {
    event.dataTransfer.setData('productId', productId);
}

function handleKanbanDragOver(event) {
    event.preventDefault();
}

function handleKanbanDrop(event, newEquipment) {
    event.preventDefault();
    const productId = event.dataTransfer.getData('productId');
    
    const product = plannerState.selectedProducts.find(p => p._id === productId);
    if (product && product.equipment !== newEquipment) {
        product.equipment = newEquipment;
        renderAllViews();
        updateSelectedProductsSummary();
    }
}

// ============================================
// TABLE VIEW
// ============================================
function renderTableView() {
    const container = document.getElementById('tableContainer');
    if (!container) return;
    
    if (plannerState.selectedProducts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="ri-table-line text-4xl mb-2"></i>
                <p data-i18n="noProductsInPlan">No products in the plan</p>
            </div>
        `;
        return;
    }
    
    // Sort by equipment then by product
    const sortedProducts = [...plannerState.selectedProducts].sort((a, b) => {
        if (a.equipment !== b.equipment) return a.equipment.localeCompare(b.equipment);
        return (a.背番号 || '').localeCompare(b.背番号 || '');
    });
    
    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300" data-i18n="equipment">Equipment</th>
                        <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300" data-i18n="serialNumber">Serial No.</th>
                        <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300" data-i18n="partNumber">Part Number</th>
                        <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300" data-i18n="productName">Product Name</th>
                        <th class="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300" data-i18n="quantity">Quantity</th>
                        <th class="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300" data-i18n="boxes">Boxes</th>
                        <th class="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300" data-i18n="estimatedTime">Est. Time</th>
                        <th class="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300" data-i18n="actions">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
                    ${sortedProducts.map(item => `
                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td class="px-4 py-3">
                                <span class="font-medium text-gray-900 dark:text-white">${item.equipment}</span>
                            </td>
                            <td class="px-4 py-3">
                                <div class="flex items-center gap-2">
                                    <div class="w-2 h-2 rounded-full" style="background-color: ${item.color}"></div>
                                    <span class="text-gray-900 dark:text-white">${item.背番号 || '-'}</span>
                                </div>
                            </td>
                            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">${item.品番 || '-'}</td>
                            <td class="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">${item.品名 || '-'}</td>
                            <td class="px-4 py-3 text-right text-gray-900 dark:text-white">${item.quantity}</td>
                            <td class="px-4 py-3 text-right text-gray-900 dark:text-white">${item.boxes}</td>
                            <td class="px-4 py-3 text-right text-gray-900 dark:text-white">${item.estimatedTime.formattedTime}</td>
                            <td class="px-4 py-3 text-center">
                                <button onclick="editSelectedProduct('${item._id}')" class="text-blue-600 hover:text-blue-800 mr-2">
                                    <i class="ri-edit-line"></i>
                                </button>
                                <button onclick="removeSelectedProduct('${item._id}')" class="text-red-600 hover:text-red-800">
                                    <i class="ri-delete-bin-line"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot class="bg-gray-100 dark:bg-gray-700 font-semibold">
                    <tr>
                        <td colspan="4" class="px-4 py-3 text-gray-900 dark:text-white" data-i18n="total">Total</td>
                        <td class="px-4 py-3 text-right text-gray-900 dark:text-white">
                            ${sortedProducts.reduce((sum, p) => sum + p.quantity, 0)}
                        </td>
                        <td class="px-4 py-3 text-right text-gray-900 dark:text-white">
                            ${sortedProducts.reduce((sum, p) => sum + p.boxes, 0)}
                        </td>
                        <td class="px-4 py-3 text-right text-gray-900 dark:text-white">
                            ${formatTotalTime(sortedProducts.reduce((sum, p) => sum + p.estimatedTime.totalSeconds, 0))}
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}

function formatTotalTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.round((totalSeconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function editSelectedProduct(productId) {
    const product = plannerState.selectedProducts.find(p => p._id === productId);
    if (!product) return;
    
    // Show edit modal similar to add modal
    const originalProduct = plannerState.products.find(p => p._id === productId);
    if (originalProduct) {
        // Remove the current selection
        removeSelectedProduct(productId);
        // Re-add with modal
        showAddProductModal(originalProduct);
    }
}

// ============================================
// MULTI-COLUMN PRODUCT PICKER
// ============================================
let multiPickerState = {
    equipment: null,
    startTime: null,
    availableProducts: [],
    selectedProducts: [],
    orderedProducts: []
};

function showMultiColumnProductPicker(equipment, startTime) {
    multiPickerState = {
        equipment: equipment,
        startTime: startTime,
        availableProducts: [...plannerState.products].sort((a, b) => {
            const aSerial = (a.背番号 || '').toLowerCase();
            const bSerial = (b.背番号 || '').toLowerCase();
            return aSerial.localeCompare(bSerial);
        }),
        selectedProducts: [],
        orderedProducts: []
    };
    
    const modalHTML = `
        <div id="multiPickerModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-[80vh] flex flex-col">
                <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white" data-i18n="addProductsToTimeline">Add Products to Timeline</h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                <span data-i18n="equipment">Equipment</span>: <strong>${equipment}</strong> | 
                                <span data-i18n="startTime">Start Time</span>: <strong>${startTime}</strong>
                            </p>
                        </div>
                        <button onclick="closeMultiColumnPicker()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <i class="ri-close-line text-2xl"></i>
                        </button>
                    </div>
                </div>
                
                <div class="flex-1 flex overflow-hidden">
                    <!-- Column 1: Available Products -->
                    <div class="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                        <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                            <h4 class="font-semibold text-gray-900 dark:text-white mb-2" data-i18n="availableProducts">Available Products</h4>
                            <input type="text" id="multiPickerSearch" 
                                   class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" 
                                   placeholder="Search..." 
                                   oninput="filterMultiPickerProducts()">
                        </div>
                        <div id="multiPickerAvailable" class="flex-1 overflow-y-auto p-3 space-y-2">
                            <!-- Will be populated -->
                        </div>
                    </div>
                    
                    <!-- Column 2: Selected Products with Quantities -->
                    <div class="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                        <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                            <h4 class="font-semibold text-gray-900 dark:text-white" data-i18n="selectedWithQuantities">Selected & Quantities</h4>
                        </div>
                        <div id="multiPickerSelected" class="flex-1 overflow-y-auto p-3 space-y-2">
                            <div class="text-center py-8 text-gray-400">
                                <i class="ri-arrow-left-line text-3xl mb-2"></i>
                                <p class="text-sm" data-i18n="clickProductsToAdd">Click products to add</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Column 3: Order Arrangement -->
                    <div class="w-1/3 flex flex-col">
                        <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                            <h4 class="font-semibold text-gray-900 dark:text-white" data-i18n="productionOrder">Production Order</h4>
                        </div>
                        <div id="multiPickerOrdered" class="flex-1 overflow-y-auto p-3 space-y-2">
                            <div class="text-center py-8 text-gray-400">
                                <i class="ri-arrow-left-line text-3xl mb-2"></i>
                                <p class="text-sm" data-i18n="addQuantitiesFirst">Add quantities first</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                            <span id="multiPickerStats">0 products selected</span>
                        </div>
                        <div class="flex gap-3">
                            <button onclick="closeMultiColumnPicker()" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" data-i18n="cancel">Cancel</button>
                            <button onclick="confirmMultiPickerSelection()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" data-i18n="addToTimeline">Add to Timeline</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    renderMultiPickerAvailable();
    
    if (typeof applyLanguageEnhanced === 'function') {
        applyLanguageEnhanced();
    }
}

function closeMultiColumnPicker() {
    const modal = document.getElementById('multiPickerModal');
    if (modal) modal.remove();
    multiPickerState = { equipment: null, startTime: null, availableProducts: [], selectedProducts: [], orderedProducts: [] };
}

function filterMultiPickerProducts() {
    renderMultiPickerAvailable();
}

function renderMultiPickerAvailable() {
    const container = document.getElementById('multiPickerAvailable');
    if (!container) return;
    
    const searchTerm = document.getElementById('multiPickerSearch')?.value?.toLowerCase() || '';
    
    const filtered = multiPickerState.availableProducts.filter(product => {
        // Don't show already selected products
        if (multiPickerState.selectedProducts.some(p => p._id === product._id)) return false;
        
        if (!searchTerm) return true;
        return (
            (product.品番 || '').toLowerCase().includes(searchTerm) ||
            (product.背番号 || '').toLowerCase().includes(searchTerm) ||
            (product.品名 || '').toLowerCase().includes(searchTerm)
        );
    });
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-gray-400 text-sm">No products found</div>';
        return;
    }
    
    container.innerHTML = filtered.map(product => {
        const color = plannerState.productColors[product.背番号] || '#6B7280';
        return `
            <div class="p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 transition-colors"
                 onclick="addToMultiPickerSelected('${product._id}')">
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" style="background-color: ${color}"></div>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-sm text-gray-900 dark:text-white truncate">${product.背番号 || '-'}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${product.品番 || '-'}</p>
                    </div>
                    <i class="ri-add-circle-line text-blue-500"></i>
                </div>
            </div>
        `;
    }).join('');
}

function addToMultiPickerSelected(productId) {
    const product = multiPickerState.availableProducts.find(p => p._id === productId);
    if (!product) return;
    
    const capacity = parseInt(product['収容数']) || 1;
    
    multiPickerState.selectedProducts.push({
        ...product,
        quantity: capacity,
        quantityInputId: `qty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    
    renderMultiPickerAvailable();
    renderMultiPickerSelected();
    updateMultiPickerStats();
}

function renderMultiPickerSelected() {
    const container = document.getElementById('multiPickerSelected');
    if (!container) return;
    
    if (multiPickerState.selectedProducts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="ri-arrow-left-line text-3xl mb-2"></i>
                <p class="text-sm" data-i18n="clickProductsToAdd">Click products to add</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = multiPickerState.selectedProducts.map((product, index) => {
        const color = plannerState.productColors[product.背番号] || '#6B7280';
        const timeInfo = calculateProductionTime(product, product.quantity);
        const boxes = calculateBoxesNeeded(product, product.quantity);
        
        return `
            <div class="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                <div class="flex items-start gap-2 mb-2">
                    <div class="w-3 h-3 rounded-full mt-1" style="background-color: ${color}"></div>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-sm text-gray-900 dark:text-white truncate">${product.背番号 || '-'}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${product.品名 || '-'}</p>
                    </div>
                    <button onclick="removeFromMultiPickerSelected(${index})" class="text-red-500 hover:text-red-700">
                        <i class="ri-close-line"></i>
                    </button>
                </div>
                <div class="space-y-2">
                    <div>
                        <label class="text-xs text-gray-600 dark:text-gray-400">Quantity</label>
                        <input type="number" id="${product.quantityInputId}" min="1" value="${product.quantity}" 
                               class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                               onchange="updateMultiPickerQuantity(${index}, this.value)">
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 grid grid-cols-2 gap-2">
                        <div>Boxes: <strong>${boxes}</strong></div>
                        <div>Time: <strong>${timeInfo.formattedTime}</strong></div>
                    </div>
                    <button onclick="moveToOrderColumn(${index})" 
                            class="w-full p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded text-xs hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <i class="ri-arrow-right-line mr-1"></i>Move to Order
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function removeFromMultiPickerSelected(index) {
    multiPickerState.selectedProducts.splice(index, 1);
    renderMultiPickerAvailable();
    renderMultiPickerSelected();
    updateMultiPickerStats();
}

function updateMultiPickerQuantity(index, value) {
    const qty = parseInt(value) || 1;
    multiPickerState.selectedProducts[index].quantity = qty;
    renderMultiPickerSelected();
}

function moveToOrderColumn(index) {
    const product = multiPickerState.selectedProducts.splice(index, 1)[0];
    multiPickerState.orderedProducts.push(product);
    renderMultiPickerSelected();
    renderMultiPickerOrdered();
    updateMultiPickerStats();
}

function renderMultiPickerOrdered() {
    const container = document.getElementById('multiPickerOrdered');
    if (!container) return;
    
    if (multiPickerState.orderedProducts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="ri-arrow-left-line text-3xl mb-2"></i>
                <p class="text-sm" data-i18n="addQuantitiesFirst">Add quantities first</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = multiPickerState.orderedProducts.map((product, index) => {
        const color = plannerState.productColors[product.背番号] || '#6B7280';
        const timeInfo = calculateProductionTime(product, product.quantity);
        const boxes = calculateBoxesNeeded(product, product.quantity);
        
        return `
            <div class="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 relative">
                <div class="absolute -left-3 -top-3 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    ${index + 1}
                </div>
                <div class="flex items-start gap-2 mb-2">
                    <div class="w-3 h-3 rounded-full mt-1" style="background-color: ${color}"></div>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-sm text-gray-900 dark:text-white truncate">${product.背番号 || '-'}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${product.品名 || '-'}</p>
                    </div>
                    <button onclick="removeFromOrderColumn(${index})" class="text-red-500 hover:text-red-700">
                        <i class="ri-close-line"></i>
                    </button>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 grid grid-cols-3 gap-1">
                    <div>Qty: <strong>${product.quantity}</strong></div>
                    <div>Box: <strong>${boxes}</strong></div>
                    <div>Time: <strong>${timeInfo.formattedTime}</strong></div>
                </div>
                <div class="mt-2 flex gap-1">
                    ${index > 0 ? `<button onclick="moveOrderUp(${index})" class="flex-1 p-1 bg-gray-100 dark:bg-gray-700 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600"><i class="ri-arrow-up-line"></i></button>` : ''}
                    ${index < multiPickerState.orderedProducts.length - 1 ? `<button onclick="moveOrderDown(${index})" class="flex-1 p-1 bg-gray-100 dark:bg-gray-700 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600"><i class="ri-arrow-down-line"></i></button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function removeFromOrderColumn(index) {
    const product = multiPickerState.orderedProducts.splice(index, 1)[0];
    multiPickerState.selectedProducts.push(product);
    renderMultiPickerSelected();
    renderMultiPickerOrdered();
    updateMultiPickerStats();
}

function moveOrderUp(index) {
    if (index === 0) return;
    const temp = multiPickerState.orderedProducts[index];
    multiPickerState.orderedProducts[index] = multiPickerState.orderedProducts[index - 1];
    multiPickerState.orderedProducts[index - 1] = temp;
    renderMultiPickerOrdered();
}

function moveOrderDown(index) {
    if (index === multiPickerState.orderedProducts.length - 1) return;
    const temp = multiPickerState.orderedProducts[index];
    multiPickerState.orderedProducts[index] = multiPickerState.orderedProducts[index + 1];
    multiPickerState.orderedProducts[index + 1] = temp;
    renderMultiPickerOrdered();
}

function updateMultiPickerStats() {
    const statsEl = document.getElementById('multiPickerStats');
    if (!statsEl) return;
    
    const total = multiPickerState.selectedProducts.length + multiPickerState.orderedProducts.length;
    const ordered = multiPickerState.orderedProducts.length;
    
    statsEl.textContent = `${total} products selected | ${ordered} ready for timeline`;
}

function confirmMultiPickerSelection() {
    if (multiPickerState.orderedProducts.length === 0) {
        showPlannerNotification('Please move products to the order column', 'warning');
        return;
    }
    
    // Add all ordered products to the selected products state
    multiPickerState.orderedProducts.forEach(product => {
        const timeInfo = calculateProductionTime(product, product.quantity);
        const boxes = calculateBoxesNeeded(product, product.quantity);
        
        plannerState.selectedProducts.push({
            ...product,
            equipment: multiPickerState.equipment,
            boxes: boxes,
            estimatedTime: timeInfo,
            color: plannerState.productColors[product.背番号],
            startTime: multiPickerState.startTime
        });
    });
    
    closeMultiColumnPicker();
    renderProductList();
    updateSelectedProductsSummary();
    renderAllViews();
    
    showPlannerNotification(`Added ${multiPickerState.orderedProducts.length} products to timeline`, 'success');
}

// ============================================
// BREAK TIME MANAGEMENT
// ============================================
function showBreakTimeModal() {
    const modalHTML = `
        <div id="breakTimeModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                <div class="p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4" data-i18n="manageBreakTimes">Manage Break Times</h3>
                    
                    <div id="breakTimeList" class="space-y-3 mb-4">
                        ${plannerState.breaks.map((brk, index) => `
                            <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <input type="text" value="${brk.name || ''}" placeholder="Break name" 
                                       class="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                       onchange="updateBreak(${index}, 'name', this.value)">
                                <input type="time" value="${brk.start}" 
                                       class="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                       onchange="updateBreak(${index}, 'start', this.value)">
                                <span class="text-gray-500">-</span>
                                <input type="time" value="${brk.end}" 
                                       class="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                       onchange="updateBreak(${index}, 'end', this.value)">
                                <button onclick="removeBreak(${index})" class="text-red-500 hover:text-red-700">
                                    <i class="ri-delete-bin-line"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    
                    <button onclick="addBreak()" class="w-full p-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors">
                        <i class="ri-add-line mr-1"></i>
                        <span data-i18n="addBreakTime">Add Break Time</span>
                    </button>
                    
                    <div class="flex justify-end gap-3 mt-6">
                        <button onclick="closeBreakTimeModal()" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" data-i18n="close">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    if (typeof applyLanguageEnhanced === 'function') {
        applyLanguageEnhanced();
    }
}

function closeBreakTimeModal() {
    const modal = document.getElementById('breakTimeModal');
    if (modal) modal.remove();
    renderAllViews();
}

function addBreak() {
    plannerState.breaks.push({
        name: '',
        start: '12:00',
        end: '12:45'
    });
    closeBreakTimeModal();
    showBreakTimeModal();
}

function updateBreak(index, field, value) {
    if (plannerState.breaks[index]) {
        plannerState.breaks[index][field] = value;
    }
}

function removeBreak(index) {
    plannerState.breaks.splice(index, 1);
    closeBreakTimeModal();
    showBreakTimeModal();
}

// ============================================
// PLAN SAVE & LOAD
// ============================================
async function savePlan() {
    if (!plannerState.currentFactory) {
        showPlannerNotification('Please select a factory', 'warning');
        return;
    }
    
    if (plannerState.selectedProducts.length === 0) {
        showPlannerNotification('Please add products to the plan', 'warning');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
    
    const planData = {
        '工場': plannerState.currentFactory,
        'planDate': plannerState.currentDate,
        'endDate': plannerState.endDate,
        'createdBy': currentUser.username || 'unknown',
        'createdAt': new Date().toISOString(),
        'breaks': plannerState.breaks,
        'items': plannerState.selectedProducts.map(item => ({
            productId: item._id,
            背番号: item.背番号,
            品番: item.品番,
            品名: item.品名,
            equipment: item.equipment,
            quantity: item.quantity,
            boxes: item.boxes,
            estimatedTime: item.estimatedTime
        }))
    };
    
    try {
        const response = await fetch(BASE_URL + 'queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dbName: PLANNER_CONFIG.dbName,
                collectionName: PLANNER_CONFIG.plansCollection,
                insertData: planData
            })
        });
        
        if (response.ok) {
            showPlannerNotification('Plan saved successfully!', 'success');
            // Reload plans
            await loadExistingPlans(plannerState.currentFactory, plannerState.currentDate);
        } else {
            throw new Error('Failed to save plan');
        }
    } catch (error) {
        console.error('❌ Error saving plan:', error);
        showPlannerNotification('Failed to save plan', 'error');
    }
}

async function loadPlan(planId) {
    try {
        const response = await fetch(BASE_URL + 'queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dbName: PLANNER_CONFIG.dbName,
                collectionName: PLANNER_CONFIG.plansCollection,
                query: { _id: planId }
            })
        });
        
        const plans = await response.json();
        if (plans.length > 0) {
            const plan = plans[0];
            plannerState.currentPlan = plan;
            plannerState.breaks = plan.breaks || [];
            
            // Reconstruct selected products
            plannerState.selectedProducts = [];
            for (const item of plan.items) {
                const product = plannerState.products.find(p => p._id === item.productId);
                if (product) {
                    plannerState.selectedProducts.push({
                        ...product,
                        quantity: item.quantity,
                        equipment: item.equipment,
                        boxes: item.boxes,
                        estimatedTime: item.estimatedTime,
                        color: plannerState.productColors[product.背番号]
                    });
                }
            }
            
            renderProductList();
            updateSelectedProductsSummary();
            renderAllViews();
            
            showPlannerNotification('Plan loaded successfully', 'success');
        }
    } catch (error) {
        console.error('❌ Error loading plan:', error);
        showPlannerNotification('Failed to load plan', 'error');
    }
}

// ============================================
// CALENDAR VIEW (for viewing historical plans)
// ============================================
function showPlannerCalendar() {
    // Simple calendar modal showing plans for the month
    const modalHTML = `
        <div id="plannerCalendarModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white" data-i18n="planCalendar">Plan Calendar</h3>
                        <button onclick="closePlannerCalendar()" class="text-gray-500 hover:text-gray-700">
                            <i class="ri-close-line text-xl"></i>
                        </button>
                    </div>
                    <div id="calendarContent" class="min-h-[400px]">
                        <!-- Calendar will be rendered here -->
                        <p class="text-center text-gray-500 py-8" data-i18n="calendarComingSoon">Calendar view coming soon...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    if (typeof applyLanguageEnhanced === 'function') {
        applyLanguageEnhanced();
    }
}

function closePlannerCalendar() {
    const modal = document.getElementById('plannerCalendarModal');
    if (modal) modal.remove();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showPlannerLoading(show) {
    const loader = document.getElementById('plannerLoader');
    if (loader) {
        loader.classList.toggle('hidden', !show);
    }
}

function showPlannerNotification(message, type = 'info') {
    // Create toast notification
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Make functions globally available
window.initializePlanner = initializePlanner;
window.handleFactoryChange = handleFactoryChange;
window.switchPlannerTab = switchPlannerTab;
window.toggleProductSelection = toggleProductSelection;
window.updateQuantityPreview = updateQuantityPreview;
window.closeAddProductModal = closeAddProductModal;
window.confirmAddProduct = confirmAddProduct;
window.removeSelectedProduct = removeSelectedProduct;
window.editSelectedProduct = editSelectedProduct;
window.handleKanbanDragStart = handleKanbanDragStart;
window.handleKanbanDragOver = handleKanbanDragOver;
window.handleKanbanDrop = handleKanbanDrop;
window.handleTimelineSlotClick = handleTimelineSlotClick;
window.showBreakTimeModal = showBreakTimeModal;
window.closeBreakTimeModal = closeBreakTimeModal;
window.addBreak = addBreak;
window.updateBreak = updateBreak;
window.removeBreak = removeBreak;
window.savePlan = savePlan;
window.loadPlan = loadPlan;
window.showPlannerCalendar = showPlannerCalendar;
window.closePlannerCalendar = closePlannerCalendar;
window.filterProducts = filterProducts;
window.showMultiColumnProductPicker = showMultiColumnProductPicker;
window.closeMultiColumnPicker = closeMultiColumnPicker;
window.filterMultiPickerProducts = filterMultiPickerProducts;
window.addToMultiPickerSelected = addToMultiPickerSelected;
window.removeFromMultiPickerSelected = removeFromMultiPickerSelected;
window.updateMultiPickerQuantity = updateMultiPickerQuantity;
window.moveToOrderColumn = moveToOrderColumn;
window.removeFromOrderColumn = removeFromOrderColumn;
window.moveOrderUp = moveOrderUp;
window.moveOrderDown = moveOrderDown;
window.confirmMultiPickerSelection = confirmMultiPickerSelection;
