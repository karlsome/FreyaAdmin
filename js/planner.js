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
    products: [], // All available products from masterDB
    goals: [], // Production quantity goals
    plans: [],
    currentPlan: null,
    selectedProducts: [],
    breaks: [
        { name: 'Lunch Break', start: '12:00', end: '12:45', isDefault: true, id: 'default-lunch' },
        { name: 'Break', start: '15:00', end: '15:15', isDefault: true, id: 'default-break' }
    ],
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
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = e.currentTarget.dataset.tab || e.currentTarget.getAttribute('data-tab');
            if (tab) switchPlannerTab(tab);
        });
    });
    
    // Product search
    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.addEventListener('input', filterProducts);
    }
    
    // Goal search
    const goalSearch = document.getElementById('goalSearch');
    if (goalSearch) {
        goalSearch.addEventListener('input', filterGoals);
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
        // Load equipment, products (for lookups), goals, and plans in parallel
        await Promise.all([
            loadEquipmentForFactory(factory),
            loadProductsForFactory(factory),
            loadGoals(),
            loadExistingPlans(factory, plannerState.currentDate)
        ]);
        
        // Render views
        renderGoalList();
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
        Promise.all([
            loadGoals(),
            loadExistingPlans(plannerState.currentFactory, plannerState.currentDate)
        ]).then(() => {
            renderGoalList();
            renderAllViews();
        });
    }
}

function handleEndDateChange(e) {
    plannerState.endDate = e.target.value || null;
}

function switchPlannerTab(tab) {
    // If tab is an event object, extract the tab name from the button
    if (typeof tab === 'object' && tab.currentTarget) {
        const button = tab.currentTarget;
        tab = button.dataset.tab || button.getAttribute('data-tab');
    } else if (typeof tab === 'object' && tab.target) {
        // Handle clicks on child elements (icon, text)
        const button = tab.target.closest('.planner-tab-btn');
        if (button) {
            tab = button.dataset.tab || button.getAttribute('data-tab');
        }
    }
    
    if (!tab) return;
    
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
// GOAL MANAGEMENT
// ============================================

// Trigger CSV upload for goals
window.triggerGoalCsvUpload = function() {
    document.getElementById('goalCsvFileInput').click();
};

// Handle CSV file upload for goals
window.handleGoalCsvUpload = function(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        showPlannerNotification('Please select a valid CSV file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csv = e.target.result;
        parseGoalCsv(csv);
    };
    reader.readAsText(file, 'Shift_JIS'); // JIS encoding like NODA
};

// Parse goal CSV
async function parseGoalCsv(csvData) {
    try {
        console.log('📋 Parsing Goal CSV...');
        
        const lines = csvData.split('\\n').filter(line => line.trim());
        if (lines.length < 2) {
            showPlannerNotification('CSV must contain header and at least one data row', 'error');
            return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim());
        console.log('📋 CSV Headers:', headers);
        
        // Detect format: 背番号,収容数,日付 or 品番,収容数,日付
        let formatType = null;
        let itemColumn = null;
        
        if (headers.includes('背番号') && headers.includes('収容数') && headers.includes('日付')) {
            formatType = '背番号';
            itemColumn = '背番号';
        } else if (headers.includes('品番') && headers.includes('収容数') && headers.includes('日付')) {
            formatType = '品番';
            itemColumn = '品番';
        } else {
            showPlannerNotification('Invalid CSV format. Expected: 背番号,収容数,日付 or 品番,収容数,日付', 'error');
            return;
        }
        
        console.log(`📋 Detected format: ${formatType}`);
        
        // Parse data rows
        const rawGoals = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length < headers.length) continue;
            
            const rowData = {};
            headers.forEach((header, index) => {
                rowData[header] = values[index];
            });
            
            const item = rowData[itemColumn];
            const quantity = parseInt(rowData['収容数']);
            const date = rowData['日付'];
            
            if (item && quantity > 0 && date) {
                rawGoals.push({
                    [formatType]: item,
                    targetQuantity: quantity,
                    date: date,
                    rowIndex: i
                });
            }
        }
        
        if (rawGoals.length === 0) {
            showPlannerNotification('No valid goals found in CSV', 'error');
            return;
        }
        
        console.log(`📋 Found ${rawGoals.length} valid goals`);
        
        // Auto-fill missing data from masterDB
        const processedGoals = [];
        for (const goal of rawGoals) {
            try {
                const response = await fetch(BASE_URL + 'api/production-goals/lookup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        searchType: formatType,
                        searchValue: goal[formatType],
                        factory: plannerState.currentFactory
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    processedGoals.push({
                        factory: plannerState.currentFactory,
                        date: goal.date,
                        背番号: result.data.背番号,
                        品番: result.data.品番,
                        品名: result.data.品名,
                        targetQuantity: goal.targetQuantity,
                        status: 'valid'
                    });
                } else {
                    processedGoals.push({
                        ...goal,
                        factory: plannerState.currentFactory,
                        status: 'error',
                        error: 'Product not found in masterDB'
                    });
                }
            } catch (error) {
                console.error(`Error processing goal:`, error);
                processedGoals.push({
                    ...goal,
                    factory: plannerState.currentFactory,
                    status: 'error',
                    error: error.message
                });
            }
        }
        
        // Show review modal
        showGoalCsvReviewModal(processedGoals);
        
    } catch (error) {
        console.error('❌ Error parsing CSV:', error);
        showPlannerNotification('Error parsing CSV: ' + error.message, 'error');
    }
}

// Show CSV review modal
function showGoalCsvReviewModal(goals) {
    const validGoals = goals.filter(g => g.status === 'valid');
    const errorGoals = goals.filter(g => g.status === 'error');
    
    const modalHTML = `
        <div id="goalCsvReviewModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white" data-i18n="reviewGoals">Review Goals</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        ${validGoals.length} valid, ${errorGoals.length} errors
                    </p>
                </div>
                
                <div class="flex-1 overflow-y-auto p-6">
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th class="px-4 py-2 text-left">日付</th>
                                    <th class="px-4 py-2 text-left">背番号</th>
                                    <th class="px-4 py-2 text-left">品番</th>
                                    <th class="px-4 py-2 text-left">品名</th>
                                    <th class="px-4 py-2 text-right">数量</th>
                                    <th class="px-4 py-2 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${goals.map(goal => `
                                    <tr class="${goal.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' : ''}">
                                        <td class="px-4 py-2">${goal.date}</td>
                                        <td class="px-4 py-2">${goal.背番号 || '-'}</td>
                                        <td class="px-4 py-2">${goal.品番 || '-'}</td>
                                        <td class="px-4 py-2">${goal.品名 || '-'}</td>
                                        <td class="px-4 py-2 text-right">${goal.targetQuantity}</td>
                                        <td class="px-4 py-2 text-center">
                                            ${goal.status === 'valid' ? '<span class="text-green-600">✓</span>' : '<span class="text-red-600" title="' + (goal.error || '') + '">✗</span>'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button onclick="closeGoalCsvReviewModal()" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" data-i18n="cancel">Cancel</button>
                    ${validGoals.length > 0 ? `<button onclick="confirmGoalCsvUpload()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Import ${validGoals.length} Goals</button>` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    if (typeof applyLanguageEnhanced === 'function') {
        applyLanguageEnhanced();
    }
    
    // Store for confirmation
    window._pendingGoals = validGoals;
}

window.closeGoalCsvReviewModal = function() {
    const modal = document.getElementById('goalCsvReviewModal');
    if (modal) modal.remove();
    window._pendingGoals = null;
};

window.confirmGoalCsvUpload = async function() {
    if (!window._pendingGoals || window._pendingGoals.length === 0) return;
    
    try {
        // Check for duplicates
        const response = await fetch(BASE_URL + 'api/production-goals/check-duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                factory: plannerState.currentFactory,
                date: plannerState.currentDate,
                items: window._pendingGoals.map(g => ({ 背番号: g.背番号, 品番: g.品番 }))
            })
        });
        
        const dupResult = await response.json();
        
        if (dupResult.success && dupResult.hasDuplicates) {
            // Show duplicate confirmation modal
            showDuplicateConfirmationModal(window._pendingGoals, dupResult.duplicates);
        } else {
            // No duplicates, proceed to save
            await saveGoalsBatch(window._pendingGoals);
        }
    } catch (error) {
        console.error('Error checking duplicates:', error);
        showPlannerNotification('Error: ' + error.message, 'error');
    }
};

// Show manual goal input modal
window.showManualGoalInput = function() {
    if (!plannerState.currentFactory) {
        showPlannerNotification('Please select a factory first', 'warning');
        return;
    }
    
    const modalHTML = `
        <div id="manualGoalModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white" data-i18n="addProductionGoals">Add Production Goals</h3>
                </div>
                
                <div class="flex-1 overflow-y-auto p-6">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="date">Date</label>
                            <input type="date" id="manualGoalDate" value="${plannerState.currentDate}" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="searchProducts">Search Product</label>
                            <input type="text" id="manualGoalProductSearch" placeholder="Search by 背番号, 品番, or 品名..." class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                        </div>
                        
                        <div id="manualGoalProductList" class="border border-gray-300 dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto">
                            <!-- Products will be loaded here -->
                        </div>
                        
                        <div id="manualGoalSelectedProduct" class="hidden">
                            <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                <p class="text-sm font-medium text-gray-900 dark:text-white mb-2" data-i18n="selectedProduct">Selected Product:</p>
                                <div id="selectedProductInfo"></div>
                                <div class="mt-3">
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="targetQuantity">Target Quantity</label>
                                    <input type="number" id="manualGoalQuantity" min="1" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button onclick="closeManualGoalModal()" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" data-i18n="cancel">Cancel</button>
                    <button onclick="confirmManualGoal()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors" data-i18n="addGoal">Add Goal</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Load products
    renderManualGoalProductList();
    
    // Setup search
    document.getElementById('manualGoalProductSearch').addEventListener('input', renderManualGoalProductList);
    
    if (typeof applyLanguageEnhanced === 'function') {
        applyLanguageEnhanced();
    }
};

function renderManualGoalProductList() {
    const searchTerm = document.getElementById('manualGoalProductSearch')?.value?.toLowerCase() || '';
    const container = document.getElementById('manualGoalProductList');
    
    if (!container) return;
    
    const filteredProducts = plannerState.products.filter(p => {
        if (!searchTerm) return true;
        return (
            (p.背番号 || '').toLowerCase().includes(searchTerm) ||
            (p.品番 || '').toLowerCase().includes(searchTerm) ||
            (p.品名 || '').toLowerCase().includes(searchTerm)
        );
    }).slice(0, 50); // Limit to 50 for performance
    
    container.innerHTML = filteredProducts.map(product => `
        <div class="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0"
             onclick="selectManualGoalProduct('${product.背番号}')">
            <div class="flex items-center justify-between">
                <div>
                    <p class="font-medium text-gray-900 dark:text-white">${product.背番号}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">${product.品番} - ${product.品名 || ''}</p>
                </div>
            </div>
        </div>
    `).join('');
}

window.selectManualGoalProduct = function(seiban) {
    const product = plannerState.products.find(p => p.背番号 === seiban);
    if (!product) return;
    
    window._selectedGoalProduct = product;
    
    document.getElementById('manualGoalSelectedProduct').classList.remove('hidden');
    document.getElementById('selectedProductInfo').innerHTML = `
        <p class="text-sm"><strong>${product.背番号}</strong> - ${product.品番}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">${product.品名 || ''}</p>
    `;
    
    document.getElementById('manualGoalQuantity').focus();
};

window.closeManualGoalModal = function() {
    const modal = document.getElementById('manualGoalModal');
    if (modal) modal.remove();
    window._selectedGoalProduct = null;
};

window.confirmManualGoal = async function() {
    const product = window._selectedGoalProduct;
    const quantity = parseInt(document.getElementById('manualGoalQuantity')?.value);
    const date = document.getElementById('manualGoalDate')?.value;
    
    if (!product) {
        showPlannerNotification('Please select a product', 'warning');
        return;
    }
    
    if (!quantity || quantity <= 0) {
        showPlannerNotification('Please enter a valid quantity', 'warning');
        return;
    }
    
    if (!date) {
        showPlannerNotification('Please select a date', 'warning');
        return;
    }
    
    try {
        // Check for duplicates
        const dupResponse = await fetch(BASE_URL + 'api/production-goals/check-duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                factory: plannerState.currentFactory,
                date: date,
                items: [{ 背番号: product.背番号 }]
            })
        });
        
        const dupResult = await dupResponse.json();
        
        if (dupResult.success && dupResult.hasDuplicates) {
            // Ask user: overwrite or add?
            const existing = dupResult.duplicates[0].existing;
            const choice = await showDuplicateChoiceModal(product, existing, quantity);
            
            if (choice === 'cancel') return;
            
            if (choice === 'overwrite') {
                // Update existing goal
                await updateGoal(existing._id, { targetQuantity: quantity, remainingQuantity: quantity });
            } else if (choice === 'add') {
                // Add to existing quantity
                const newTotal = existing.targetQuantity + quantity;
                await updateGoal(existing._id, { 
                    targetQuantity: newTotal, 
                    remainingQuantity: existing.remainingQuantity + quantity 
                });
            }
        } else {
            // Create new goal
            await fetch(BASE_URL + 'api/production-goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    factory: plannerState.currentFactory,
                    date: date,
                    背番号: product.背番号,
                    品番: product.品番,
                    品名: product.品名,
                    targetQuantity: quantity,
                    createdBy: window.currentUser?.username || 'system'
                })
            });
        }
        
        await loadGoals();
        renderGoalList();
        closeManualGoalModal();
        showPlannerNotification('Goal added successfully', 'success');
        
    } catch (error) {
        console.error('Error adding goal:', error);
        showPlannerNotification('Error adding goal: ' + error.message, 'error');
    }
};

// Load goals from database
async function loadGoals() {
    try {
        const params = new URLSearchParams({
            factory: plannerState.currentFactory,
            date: plannerState.currentDate
        });
        
        const response = await fetch(BASE_URL + 'api/production-goals?' + params);
        const result = await response.json();
        
        if (result.success) {
            plannerState.goals = result.data;
            console.log(`📋 Loaded ${plannerState.goals.length} goals`);
            
            // Assign colors to goals
            plannerState.goals.forEach(goal => {
                if (!plannerState.productColors[goal.背番号]) {
                    plannerState.productColors[goal.背番号] = PRODUCT_COLORS[plannerState.colorIndex % PRODUCT_COLORS.length];
                    plannerState.colorIndex++;
                }
            });
        }
        
        return plannerState.goals;
    } catch (error) {
        console.error('❌ Error loading goals:', error);
        return [];
    }
}

// Save goals batch
async function saveGoalsBatch(goals) {
    try {
        const response = await fetch(BASE_URL + 'api/production-goals/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                goals: goals,
                createdBy: window.currentUser?.username || 'system'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeGoalCsvReviewModal();
            await loadGoals();
            renderGoalList();
            showPlannerNotification(`${result.insertedCount} goals imported successfully`, 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error saving goals:', error);
        showPlannerNotification('Error saving goals: ' + error.message, 'error');
    }
}

// Update goal
async function updateGoal(goalId, updates) {
    try {
        const response = await fetch(BASE_URL + `api/production-goals/${goalId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error updating goal:', error);
        throw error;
    }
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
    
    // Break time blocks at the top
    const breakTimeBlocks = `
        <div class="mb-4 space-y-2">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase" data-i18n="breakTimeBlocks">Break Time Blocks</p>
            <div class="break-block p-3 border-2 border-dashed border-orange-300 dark:border-orange-600 rounded-lg cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                 onclick="addBreakToTimeline(45)">
                <div class="flex items-center gap-2">
                    <i class="ri-restaurant-line text-orange-500 text-lg"></i>
                    <div class="flex-1">
                        <p class="font-medium text-sm text-gray-900 dark:text-white" data-i18n="lunchBreak">Lunch Break</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">45 minutes</p>
                    </div>
                </div>
            </div>
            <div class="break-block p-3 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                 onclick="addBreakToTimeline(15)">
                <div class="flex items-center gap-2">
                    <i class="ri-cup-line text-blue-500 text-lg"></i>
                    <div class="flex-1">
                        <p class="font-medium text-sm text-gray-900 dark:text-white" data-i18n="shortBreak">Short Break</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">15 minutes</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (filteredProducts.length === 0) {
        container.innerHTML = breakTimeBlocks + `
            <div class="text-center py-8 text-gray-500">
                <i class="ri-inbox-line text-4xl mb-2"></i>
                <p data-i18n="noProductsFound">No products found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = breakTimeBlocks + filteredProducts.map(product => {
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

// Render goal list (replaces product list)
function renderGoalList() {
    const container = document.getElementById('goalListContainer');
    if (!container) return;
    
    const searchTerm = document.getElementById('goalSearch')?.value?.toLowerCase() || '';
    
    const filteredGoals = plannerState.goals.filter(goal => {
        if (!searchTerm) return true;
        
        return (
            (goal.品番 || '').toLowerCase().includes(searchTerm) ||
            (goal.背番号 || '').toLowerCase().includes(searchTerm) ||
            (goal.品名 || '').toLowerCase().includes(searchTerm)
        );
    }).sort((a, b) => {
        // Sort by date, then by 背番号
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const aSerial = (a.背番号 || '').toLowerCase();
        const bSerial = (b.背番号 || '').toLowerCase();
        return aSerial.localeCompare(bSerial);
    });
    
    if (filteredGoals.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="ri-target-line text-4xl mb-2"></i>
                <p data-i18n="noGoalsSet">No goals set</p>
            </div>
        `;
        return;
    }
    
    // Group by date
    const goalsByDate = {};
    filteredGoals.forEach(goal => {
        if (!goalsByDate[goal.date]) {
            goalsByDate[goal.date] = [];
        }
        goalsByDate[goal.date].push(goal);
    });
    
    let html = '';
    
    Object.keys(goalsByDate).sort().forEach(date => {
        const goalsForDate = goalsByDate[date];
        const isToday = date === plannerState.currentDate;
        
        html += `
            <div class="mb-4">
                <div class="sticky top-0 bg-gray-100 dark:bg-gray-700 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                    <span>${date}</span>
                    ${isToday ? '<span class="bg-blue-500 text-white px-2 py-0.5 rounded text-xs">Today</span>' : ''}
                </div>
                ${goalsForDate.map(goal => renderGoalCard(goal)).join('')}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderGoalCard(goal) {
    const color = plannerState.productColors[goal.背番号] || '#6B7280';
    const percentage = goal.targetQuantity > 0 ? Math.round((goal.scheduledQuantity / goal.targetQuantity) * 100) : 0;
    const isCompleted = goal.remainingQuantity === 0;
    const isInProgress = goal.scheduledQuantity > 0 && goal.remainingQuantity > 0;
    
    let statusBgClass = '';
    let statusTextClass = '';
    
    if (isCompleted) {
        statusBgClass = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
        statusTextClass = 'text-green-700 dark:text-green-400';
    } else if (isInProgress) {
        statusBgClass = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700';
        statusTextClass = 'text-blue-700 dark:text-blue-400';
    } else {
        statusBgClass = 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
        statusTextClass = 'text-gray-700 dark:text-gray-400';
    }
    
    return `
        <div class="goal-card p-3 border rounded-lg ${statusBgClass} mb-2">
            <div class="flex items-center gap-3 mb-2">
                <div class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${color}"></div>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm ${statusTextClass} truncate">${goal.背番号 || '-'}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${goal.品番 || '-'}</p>
                </div>
                <button onclick="deleteGoal('${goal._id}')" class="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
            
            <div class="space-y-1">
                <div class="flex justify-between text-xs ${statusTextClass}">
                    <span><strong>${goal.remainingQuantity}</strong> / ${goal.targetQuantity} pcs</span>
                    <span>${percentage}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                    <div class="h-1.5 rounded-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}" style="width: ${percentage}%"></div>
                </div>
            </div>
        </div>
    `;
}

function filterProducts() {
    renderProductList();
}

function filterGoals() {
    renderGoalList();
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
        
        // Check if this slot is a break for this equipment or global break
        const breakAtSlot = plannerState.breaks.find(brk => {
            const breakStart = timeToMinutes(brk.start);
            const breakEnd = timeToMinutes(brk.end);
            const isInBreakTime = slotMinutes >= breakStart && slotMinutes < breakEnd;
            const isForThisEquipment = !brk.equipment || brk.equipment === equipment;
            return isInBreakTime && isForThisEquipment;
        });
        
        const isBreak = breakAtSlot !== undefined;
        
        if (isBreak) {
            const isFirstSlot = index === 0 || !plannerState.breaks.some(brk => {
                const breakStart = timeToMinutes(brk.start);
                const breakEnd = timeToMinutes(brk.end);
                const prevSlotMinutes = timeToMinutes(timeSlots[index - 1]);
                const isForThisEquipment = !brk.equipment || brk.equipment === equipment;
                return prevSlotMinutes >= breakStart && prevSlotMinutes < breakEnd && isForThisEquipment;
            });
            
            html += `
                <div class="flex-shrink-0 bg-gray-300 dark:bg-gray-600 border-r dark:border-gray-500 relative group" 
                     style="width: ${slotWidth}px" 
                     title="${breakAtSlot.name || 'Break Time'}">
                    ${isFirstSlot ? `
                        <div class="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
                            ${breakAtSlot.name || 'Break'}
                        </div>
                        <button onclick="removeBreakTime('${breakAtSlot.id}', '${equipment}')" 
                                class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs hover:bg-red-600"
                                title="Remove break">
                            ×
                        </button>
                    ` : ''}
                </div>
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

function addBreakToTimeline(durationMinutes) {
    // Show modal to select equipment and time
    const modalHTML = `
        <div id="addBreakModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                <div class="p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        <span data-i18n="addBreakTime">Add Break Time</span> (${durationMinutes} min)
                    </h3>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="equipment">Equipment</label>
                            <select id="breakEquipment" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                                <option value="" data-i18n="selectEquipment">-- Select Equipment --</option>
                                ${plannerState.equipment.map(eq => `<option value="${eq}">${eq}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="startTime">Start Time</label>
                            <input type="time" id="breakStartTime" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="breakName">Break Name (Optional)</label>
                            <input type="text" id="breakName" placeholder="e.g., Lunch, Coffee Break" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                        </div>
                    </div>
                    
                    <div class="flex justify-end gap-3 mt-6">
                        <button onclick="closeAddBreakModal()" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" data-i18n="cancel">Cancel</button>
                        <button onclick="confirmAddBreak(${durationMinutes})" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" data-i18n="add">Add</button>
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

function closeAddBreakModal() {
    const modal = document.getElementById('addBreakModal');
    if (modal) modal.remove();
}

function confirmAddBreak(durationMinutes) {
    const equipment = document.getElementById('breakEquipment')?.value;
    const startTime = document.getElementById('breakStartTime')?.value;
    const name = document.getElementById('breakName')?.value || (durationMinutes === 45 ? 'Lunch Break' : 'Break');
    
    if (!equipment || !startTime) {
        showPlannerNotification('Please select equipment and start time', 'warning');
        return;
    }
    
    // Calculate end time
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + durationMinutes;
    const endTime = minutesToTime(endMinutes);
    
    // Check if break already exists at this time for this equipment
    const existingBreak = plannerState.breaks.find(b => 
        b.equipment === equipment &&
        b.start === startTime
    );
    
    if (existingBreak) {
        showPlannerNotification('A break already exists at this time for this equipment', 'warning');
        return;
    }
    
    // Add break
    plannerState.breaks.push({
        name: name,
        start: startTime,
        end: endTime,
        equipment: equipment,
        isDefault: false,
        id: `break-${Date.now()}`
    });
    
    closeAddBreakModal();
    renderAllViews();
    showPlannerNotification('Break time added', 'success');
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
    // Filter goals that have remaining quantity > 0 for the current date
    const availableGoals = plannerState.goals.filter(g => 
        g.remainingQuantity > 0 && g.date === plannerState.currentDate
    ).sort((a, b) => {
        const aSerial = (a.背番号 || '').toLowerCase();
        const bSerial = (b.背番号 || '').toLowerCase();
        return aSerial.localeCompare(bSerial);
    });
    
    multiPickerState = {
        equipment: equipment,
        startTime: startTime,
        availableProducts: availableGoals,
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

async function confirmMultiPickerSelection() {
    if (multiPickerState.orderedProducts.length === 0) {
        showPlannerNotification('Please move products to the order column', 'warning');
        return;
    }
    
    // Calculate actual start times, skipping breaks
    let currentTime = timeToMinutes(multiPickerState.startTime);
    const equipment = multiPickerState.equipment;
    
    // Add all ordered products to the selected products state and update goal quantities
    const updatePromises = [];
    
    for (const product of multiPickerState.orderedProducts) {
        const timeInfo = calculateProductionTime(product, product.quantity);
        const boxes = calculateBoxesNeeded(product, product.quantity);
        const productDurationMinutes = timeInfo.totalSeconds / 60;
        
        // Find actual start time, skipping any breaks
        const actualStartTime = findNextAvailableTime(currentTime, productDurationMinutes, equipment);
        
        plannerState.selectedProducts.push({
            ...product,
            equipment: equipment,
            boxes: boxes,
            estimatedTime: timeInfo,
            color: plannerState.productColors[product.背番号],
            startTime: minutesToTime(actualStartTime),
            goalId: product._id // Store goal ID for tracking
        });
        
        // Update goal quantity in database
        if (product._id) {
            updatePromises.push(
                fetch(BASE_URL + `api/production-goals/${product._id}/schedule`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantityToSchedule: product.quantity })
                })
            );
        }
        
        // Update current time for next product
        currentTime = actualStartTime + productDurationMinutes;
    }
    
    // Wait for all goal updates to complete
    try {
        await Promise.all(updatePromises);
        
        // Reload goals to reflect new quantities
        await loadGoals();
        
    } catch (error) {
        console.error('Error updating goal quantities:', error);
        showPlannerNotification('Warning: Some goal quantities may not have been updated', 'warning');
    }
    
    closeMultiColumnPicker();
    renderGoalList();
    updateSelectedProductsSummary();
    renderAllViews();
    
    showPlannerNotification(`Added ${multiPickerState.orderedProducts.length} products to timeline`, 'success');
}

function findNextAvailableTime(startMinutes, durationMinutes, equipment) {
    let currentMinutes = startMinutes;
    let remainingDuration = durationMinutes;
    
    while (remainingDuration > 0) {
        // Check if current time falls within a break
        const breakAtTime = plannerState.breaks.find(brk => {
            const breakStart = timeToMinutes(brk.start);
            const breakEnd = timeToMinutes(brk.end);
            const isForThisEquipment = !brk.equipment || brk.equipment === equipment;
            return currentMinutes >= breakStart && currentMinutes < breakEnd && isForThisEquipment;
        });
        
        if (breakAtTime) {
            // Skip to end of break
            const breakEnd = timeToMinutes(breakAtTime.end);
            currentMinutes = breakEnd;
        } else {
            // Check if we'll hit a break during this product's duration
            const productEnd = currentMinutes + remainingDuration;
            const breakDuring = plannerState.breaks.find(brk => {
                const breakStart = timeToMinutes(brk.start);
                const breakEnd = timeToMinutes(brk.end);
                const isForThisEquipment = !brk.equipment || brk.equipment === equipment;
                return breakStart > currentMinutes && breakStart < productEnd && isForThisEquipment;
            });
            
            if (breakDuring) {
                // Calculate time until break
                const breakStart = timeToMinutes(breakDuring.start);
                const timeUntilBreak = breakStart - currentMinutes;
                remainingDuration -= timeUntilBreak;
                currentMinutes = timeToMinutes(breakDuring.end);
            } else {
                // No break, we're done
                break;
            }
        }
    }
    
    return currentMinutes;
}

function removeBreakTime(breakId, equipment) {
    const breakIndex = plannerState.breaks.findIndex(b => b.id === breakId);
    if (breakIndex === -1) return;
    
    const breakToRemove = plannerState.breaks[breakIndex];
    
    // Check if it's a default break and for all equipment
    if (breakToRemove.isDefault && !breakToRemove.equipment) {
        // Remove default break for all equipment
        plannerState.breaks.splice(breakIndex, 1);
    } else if (breakToRemove.equipment === equipment) {
        // Remove equipment-specific break
        plannerState.breaks.splice(breakIndex, 1);
    } else {
        // If it's a global break but we're removing from specific equipment,
        // we need to convert it to equipment-specific breaks for other equipment
        const otherEquipment = plannerState.equipment.filter(eq => eq !== equipment);
        plannerState.breaks.splice(breakIndex, 1);
        
        // Add break for other equipment
        otherEquipment.forEach(eq => {
            plannerState.breaks.push({
                ...breakToRemove,
                equipment: eq,
                isDefault: false,
                id: `break-${eq}-${Date.now()}`
            });
        });
    }
    
    renderAllViews();
    showPlannerNotification('Break time removed', 'success');
}

// ============================================
// SMART SCHEDULING
// ============================================
window.showSmartSchedulingModal = async function() {
    if (!plannerState.currentFactory) {
        showPlannerNotification('Please select a factory first', 'warning');
        return;
    }
    
    if (plannerState.goals.length === 0) {
        showPlannerNotification('Please set production goals first', 'warning');
        return;
    }
    
    showPlannerNotification('Analyzing production trends...', 'info');
    
    try {
        // Get goals for current date with remaining quantity
        const goalsToSchedule = plannerState.goals.filter(g => 
            g.date === plannerState.currentDate && g.remainingQuantity > 0
        );
        
        if (goalsToSchedule.length === 0) {
            showPlannerNotification('No goals with remaining quantity for today', 'warning');
            return;
        }
        
        // Fetch press history trends
        const response = await fetch(BASE_URL + 'api/production-goals/press-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                factory: plannerState.currentFactory,
                items: goalsToSchedule.map(g => ({ 背番号: g.背番号, 品番: g.品番 }))
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch trends');
        }
        
        const trends = result.trends;
        
        // Auto-assign products to equipment based on trends
        const assignments = {};
        let totalAssigned = 0;
        let totalUnassigned = 0;
        
        goalsToSchedule.forEach(goal => {
            const identifier = goal.背番号 || goal.品番;
            const trend = trends[identifier];
            
            if (trend && trend.mostFrequentEquipment) {
                const equipment = trend.mostFrequentEquipment;
                if (!assignments[equipment]) {
                    assignments[equipment] = [];
                }
                assignments[equipment].push({
                    ...goal,
                    quantity: goal.remainingQuantity,
                    confidence: trend.frequency / trend.totalRecords
                });
                totalAssigned++;
            } else {
                totalUnassigned++;
            }
        });
        
        // Show confirmation modal
        showSmartSchedulingConfirmation(assignments, totalAssigned, totalUnassigned);
        
    } catch (error) {
        console.error('Error in smart scheduling:', error);
        showPlannerNotification('Error: ' + error.message, 'error');
    }
};

function showSmartSchedulingConfirmation(assignments, totalAssigned, totalUnassigned) {
    const modalHTML = `
        <div id="smartSchedulingModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white" data-i18n="smartScheduling">Smart Scheduling</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        ${totalAssigned} products assigned, ${totalUnassigned} without history
                    </p>
                </div>
                
                <div class="flex-1 overflow-y-auto p-6">
                    ${Object.entries(assignments).map(([equipment, products]) => `
                        <div class="mb-6">
                            <h4 class="font-semibold text-gray-900 dark:text-white mb-3">
                                <i class="ri-tools-line mr-2"></i>${equipment}
                            </h4>
                            <div class="space-y-2">
                                ${products.map(p => `
                                    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div>
                                            <p class="font-medium text-gray-900 dark:text-white">${p.背番号} - ${p.品番}</p>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">${p.remainingQuantity} pcs remaining</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                                ${Math.round(p.confidence * 100)}% confidence
                                            </p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button onclick="closeSmartSchedulingModal()" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" data-i18n="cancel">Cancel</button>
                    <button onclick="confirmSmartScheduling()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">Apply Smart Schedule</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Store assignments for confirmation
    window._smartSchedulingAssignments = assignments;
    
    if (typeof applyLanguageEnhanced === 'function') {
        applyLanguageEnhanced();
    }
}

window.closeSmartSchedulingModal = function() {
    const modal = document.getElementById('smartSchedulingModal');
    if (modal) modal.remove();
    window._smartSchedulingAssignments = null;
};

window.confirmSmartScheduling = async function() {
    const assignments = window._smartSchedulingAssignments;
    if (!assignments) return;
    
    try {
        // For each equipment, schedule products sequentially
        for (const [equipment, products] of Object.entries(assignments)) {
            let currentTime = timeToMinutes(PLANNER_CONFIG.workStartTime);
            
            for (const product of products) {
                const timeInfo = calculateProductionTime(product, product.quantity);
                const boxes = calculateBoxesNeeded(product, product.quantity);
                const productDurationMinutes = timeInfo.totalSeconds / 60;
                
                // Find actual start time, skipping breaks
                const actualStartTime = findNextAvailableTime(currentTime, productDurationMinutes, equipment);
                
                plannerState.selectedProducts.push({
                    ...product,
                    equipment: equipment,
                    boxes: boxes,
                    estimatedTime: timeInfo,
                    color: plannerState.productColors[product.背番号],
                    startTime: minutesToTime(actualStartTime),
                    goalId: product._id
                });
                
                // Update goal quantity
                await fetch(BASE_URL + `api/production-goals/${product._id}/schedule`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantityToSchedule: product.quantity })
                });
                
                currentTime = actualStartTime + productDurationMinutes;
            }
        }
        
        // Reload goals
        await loadGoals();
        
        closeSmartSchedulingModal();
        renderGoalList();
        updateSelectedProductsSummary();
        renderAllViews();
        
        showPlannerNotification('Smart scheduling applied successfully!', 'success');
        
    } catch (error) {
        console.error('Error applying smart scheduling:', error);
        showPlannerNotification('Error: ' + error.message, 'error');
    }
};

// ============================================
// DUPLICATE HANDLING
// ============================================
function showDuplicateChoiceModal(product, existing, newQuantity) {
    return new Promise((resolve) => {
        const modalHTML = `
            <div id="duplicateChoiceModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                    <div class="p-6">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            <i class="ri-alert-line text-yellow-500 mr-2"></i>Duplicate Goal Found
                        </h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            A goal for <strong>${product.背番号}</strong> on <strong>${existing.date}</strong> already exists with ${existing.targetQuantity} pcs.
                        </p>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            What would you like to do?
                        </p>
                        
                        <div class="space-y-3">
                            <button onclick="resolveDuplicateChoice('overwrite')" 
                                    class="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-left">
                                <div class="font-medium">Overwrite</div>
                                <div class="text-sm opacity-90">Replace with ${newQuantity} pcs</div>
                            </button>
                            
                            <button onclick="resolveDuplicateChoice('add')" 
                                    class="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left">
                                <div class="font-medium">Add</div>
                                <div class="text-sm opacity-90">Total will be ${existing.targetQuantity + newQuantity} pcs</div>
                            </button>
                            
                            <button onclick="resolveDuplicateChoice('cancel')" 
                                    class="w-full px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        window.resolveDuplicateChoice = function(choice) {
            const modal = document.getElementById('duplicateChoiceModal');
            if (modal) modal.remove();
            resolve(choice);
        };
    });
}

window.deleteGoal = async function(goalId) {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    
    try {
        const response = await fetch(BASE_URL + `api/production-goals/${goalId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadGoals();
            renderGoalList();
            showPlannerNotification('Goal deleted', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error deleting goal:', error);
        showPlannerNotification('Error deleting goal: ' + error.message, 'error');
    }
};

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
