// Production Planner Module
// Handles production planning with timeline, kanban, and table views

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const PLANNER_CONFIG = {
    workStartTime: '08:45',
    workEndTime: '20:00',
    intervalMinutes: 15,
    defaultCycleTime: 22.5, // 22.5 seconds per piece (default if 秒数 is empty)
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
    actualProduction: [], // pressDB data for actual production
    breaks: [
        { name: 'Lunch Break', start: '12:00', end: '12:45', isDefault: true, id: 'default-lunch' },
        { name: 'Break', start: '15:00', end: '15:15', isDefault: true, id: 'default-break' }
    ],
    activeTab: 'timeline',
    productColors: {},
    colorIndex: 0,
    hideUnavailableEquipment: false // Toggle for hiding greyed out equipment
};

// Color palette for products
const PRODUCT_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#14B8A6', '#F43F5E', '#A855F7', '#22C55E', '#FBBF24',
    '#E879F9', '#2DD4BF', '#FB7185', '#A3E635', '#818CF8'
];

// Get random color from palette or assign next color
function getRandomColor() {
    const color = PRODUCT_COLORS[plannerState.colorIndex % PRODUCT_COLORS.length];
    plannerState.colorIndex++;
    return color;
}

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
    
    // Main tab switching (Goals vs Planning) - using event delegation
    document.addEventListener('click', (e) => {
        const mainTabBtn = e.target.closest('.planner-main-tab-btn');
        if (mainTabBtn) {
            e.preventDefault();
            const mainTab = mainTabBtn.dataset.mainTab || mainTabBtn.getAttribute('data-main-tab');
            if (mainTab) {
                console.log('🔄 Switching to main tab:', mainTab);
                switchPlannerMainTab(mainTab);
            }
        }
    });
    
    // Sub-tab switching (Timeline/Kanban/Table) - using event delegation
    document.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.planner-tab-btn');
        if (tabBtn) {
            e.preventDefault();
            const tab = tabBtn.dataset.tab || tabBtn.getAttribute('data-tab');
            if (tab) {
                console.log('🔄 Switching to sub tab:', tab);
                switchPlannerTab(tab);
            }
        }
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

// Switch between main tabs (Production Goals vs Planning)
function switchPlannerMainTab(tab) {
    console.log('📋 Switching to main tab:', tab, 'Current factory:', plannerState.currentFactory);
    
    // Update tab buttons
    document.querySelectorAll('.planner-main-tab-btn').forEach(btn => {
        const btnTab = btn.dataset.mainTab || btn.getAttribute('data-main-tab');
        if (btnTab === tab) {
            btn.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400');
            btn.classList.add('border-blue-500', 'text-blue-600');
        } else {
            btn.classList.remove('border-blue-500', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400');
        }
    });
    
    // Show/hide content
    document.querySelectorAll('.planner-main-tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    if (tab === 'goals') {
        document.getElementById('planner-goals-tab')?.classList.remove('hidden');
        
        // Re-render goals list when switching to goals tab if factory is selected
        if (plannerState.currentFactory) {
            console.log('🎯 Rendering goals list...');
            console.log('   Goals count:', plannerState.goals.length);
            
            // If goals not loaded yet, load them first
            if (plannerState.goals.length === 0) {
                console.log('⚠️ Goals not loaded, loading now...');
                loadGoals().then(() => {
                    renderGoalList();
                });
            } else {
                renderGoalList();
            }
        }
    } else if (tab === 'planning') {
        document.getElementById('planner-planning-tab')?.classList.remove('hidden');
        
        // Re-render views when switching to planning tab if factory is selected
        if (plannerState.currentFactory) {
            console.log('📊 Rendering planning views...');
            console.log('   Equipment count:', plannerState.equipment.length);
            console.log('   Selected products count:', plannerState.selectedProducts.length);
            console.log('   Actual production count:', plannerState.actualProduction.length);
            
            // Check if we need to load any data
            const needsEquipment = plannerState.equipment.length === 0;
            const needsPlans = plannerState.selectedProducts.length === 0;
            const needsActualProduction = plannerState.actualProduction.length === 0;
            
            if (needsEquipment || needsPlans || needsActualProduction) {
                console.log('⚠️ Loading missing data...');
                console.log('   Needs equipment:', needsEquipment);
                console.log('   Needs plans:', needsPlans);
                console.log('   Needs actual production:', needsActualProduction);
                
                const loadPromises = [];
                
                if (needsEquipment) {
                    loadPromises.push(loadEquipmentForFactory(plannerState.currentFactory));
                }
                
                // Load existing plans to get selectedProducts
                if (needsPlans) {
                    loadPromises.push(loadExistingPlans(plannerState.currentFactory, plannerState.currentDate));
                }
                
                // Load actual production data
                if (needsActualProduction) {
                    loadPromises.push(loadActualProduction(plannerState.currentFactory, plannerState.currentDate));
                }
                
                Promise.all(loadPromises).then(() => {
                    updateSelectedProductsSummary();
                    renderAllViews();
                });
            } else {
                updateSelectedProductsSummary();
                renderAllViews();
            }
        }
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
                
                // Restore previously selected factory from localStorage
                const savedFactory = localStorage.getItem('planner_selected_factory');
                if (savedFactory && result.data.includes(savedFactory)) {
                    factorySelect.value = savedFactory;
                    plannerState.currentFactory = savedFactory;
                    // Trigger change event to load data for saved factory
                    factorySelect.dispatchEvent(new Event('change'));
                }
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
        // Load ALL products from masterDB (not filtered by factory)
        // This ensures we can always look up 収容数 regardless of factory selection
        const response = await fetch(BASE_URL + 'queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dbName: PLANNER_CONFIG.masterDbName,
                collectionName: PLANNER_CONFIG.masterCollection,
                query: {}  // Load all products
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
        
        console.log(`📦 Loaded ${plannerState.products.length} products from masterDB`);
        
        return plannerState.products;
    } catch (error) {
        console.error('❌ Failed to load products:', error);
        return [];
    }
}

async function loadExistingPlans(factory, date) {
    try {
        console.log(`📋 Loading plans for factory: ${factory}, date: ${date}`);
        
        const response = await fetch(BASE_URL + 'queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dbName: 'submittedDB',
                collectionName: 'productionPlansDB',
                query: { 
                    factory: factory,
                    date: date
                }
            })
        });
        
        const plans = await response.json();
        console.log(`📋 Found ${plans.length} plans`, plans);
        
        if (plans.length > 0) {
            const plan = plans[0];
            plannerState.currentPlan = plan;
            plannerState.breaks = plan.breaks || [];
            
            // Restore selected products from plan and recalculate boxes
            plannerState.selectedProducts = plan.products.map(item => {
                // Ensure color is assigned
                if (!plannerState.productColors[item.背番号]) {
                    plannerState.productColors[item.背番号] = getRandomColor();
                }
                
                // Recalculate boxes using current capacity from masterDB
                const boxes = calculateBoxesNeeded(item, item.quantity);
                
                return {
                    ...item,
                    _id: item.goalId || item._id,
                    color: plannerState.productColors[item.背番号],
                    boxes: boxes  // Use recalculated boxes
                };
            });
            
            console.log(`✅ Restored ${plannerState.selectedProducts.length} products from plan`);
        } else {
            plannerState.selectedProducts = [];
            console.log('ℹ️ No existing plan found for this date');
        }
        
        return plans;
    } catch (error) {
        console.error('❌ Failed to load existing plans:', error);
        return [];
    }
}

async function loadActualProduction(factory, date) {
    console.log(`📊 === LOAD ACTUAL PRODUCTION START ===`);
    console.log(`📊 Factory: ${factory}`);
    console.log(`📊 Date: ${date}`);
    console.log(`📊 DB: ${PLANNER_CONFIG.dbName}`);
    console.log(`📊 Collection: ${PLANNER_CONFIG.pressCollection}`);
    
    try {
        const requestBody = {
            dbName: PLANNER_CONFIG.dbName,
            collectionName: PLANNER_CONFIG.pressCollection,
            query: { 
                '工場': factory,
                'Date': date
            }
        };
        
        console.log(`📊 Request URL: ${BASE_URL}queries`);
        console.log(`📊 Request body:`, JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(BASE_URL + 'queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        console.log(`📊 Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            console.error('❌ PressDB fetch failed:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            plannerState.actualProduction = [];
            return [];
        }
        
        const data = await response.json();
        console.log(`📦 PressDB raw data received:`, data);
        console.log(`📦 Data type: ${Array.isArray(data) ? 'Array' : typeof data}`);
        console.log(`📦 Number of records returned: ${data.length}`);
        
        if (data.length > 0) {
            console.log(`📦 First record:`, data[0]);
            console.log(`📦 Record keys:`, Object.keys(data[0]));
        } else {
            console.log(`⚠️ No records found in pressDB for ${factory} on ${date}`);
        }
        
        // Process and merge records by equipment and 背番号
        const processedData = processActualProductionData(data);
        plannerState.actualProduction = processedData;
        
        console.log(`✅ Loaded ${data.length} actual production records, processed into ${processedData.length} blocks`);
        console.log(`✅ Processed data:`, processedData);
        console.log(`📊 === LOAD ACTUAL PRODUCTION END ===`);
        
        return processedData;
    } catch (error) {
        console.error('❌ Failed to load actual production:', error);
        console.error('❌ Error stack:', error.stack);
        plannerState.actualProduction = [];
        return [];
    }
}

function processActualProductionData(records) {
    if (!records || records.length === 0) return [];
    
    // Helper function to round time to nearest 15 minutes
    function roundToNearest15(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes;
        const rounded = Math.round(totalMinutes / 15) * 15;
        const newHours = Math.floor(rounded / 60);
        const newMinutes = rounded % 60;
        return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    }
    
    // Group by equipment and 背番号
    const grouped = {};
    
    records.forEach(record => {
        const equipment = record.設備 || '';
        const sebanggo = record.背番号 || '';
        const key = `${equipment}_${sebanggo}`;
        
        if (!grouped[key]) {
            grouped[key] = {
                equipment: equipment,
                背番号: sebanggo,
                品番: record.品番,
                品名: record.品名 || '',
                records: [],
                startTime: null,
                endTime: null,
                totalQuantity: 0
            };
        }
        
        // Round times to nearest 15 minutes
        const startTime = roundToNearest15(record.Time_start || '00:00');
        const endTime = roundToNearest15(record.Time_end || '00:00');
        
        grouped[key].records.push(record);
        grouped[key].totalQuantity += (record.Process_Quantity || 0);
        
        // Track earliest start and latest end
        if (!grouped[key].startTime || startTime < grouped[key].startTime) {
            grouped[key].startTime = startTime;
        }
        if (!grouped[key].endTime || endTime > grouped[key].endTime) {
            grouped[key].endTime = endTime;
        }
    });
    
    return Object.values(grouped);
}

// ============================================
// EVENT HANDLERS
// ============================================
async function handleFactoryChange(e) {
    const factory = e.target.value;
    plannerState.currentFactory = factory;
    
    // Save selected factory to localStorage
    if (factory) {
        localStorage.setItem('planner_selected_factory', factory);
    } else {
        localStorage.removeItem('planner_selected_factory');
    }
    
    if (!factory) {
        clearPlannerViews();
        return;
    }
    
    showPlannerLoading(true);
    
    try {
        // Load equipment, products (for lookups), goals, plans, and actual production in parallel
        await Promise.all([
            loadEquipmentForFactory(factory),
            loadProductsForFactory(factory),
            loadGoals(),
            loadExistingPlans(factory, plannerState.currentDate),
            loadActualProduction(factory, plannerState.currentDate)
        ]);
        
        // Render views
        renderGoalList();
        updateSelectedProductsSummary();
        renderAllViews();
        
    } catch (error) {
        console.error('❌ Error loading factory data:', error);
        showPlannerNotification('Failed to load factory data', 'error');
    } finally {
        showPlannerLoading(false);
    }
}

async function handleDateChange(e) {
    plannerState.currentDate = e.target.value;
    
    if (plannerState.currentFactory) {
        // Ensure products are loaded for capacity lookups
        const loadPromises = [
            loadGoals(),
            loadExistingPlans(plannerState.currentFactory, plannerState.currentDate),
            loadActualProduction(plannerState.currentFactory, plannerState.currentDate)
        ];
        
        // Load products if not already loaded
        if (!plannerState.products || plannerState.products.length === 0) {
            loadPromises.push(loadProductsForFactory(plannerState.currentFactory));
        }
        
        await Promise.all(loadPromises);
        
        renderGoalList();
        updateSelectedProductsSummary();
        renderAllViews();
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
    let capacity = parseInt(product['収容数']) || 0;
    
    // If capacity not in product, look it up from plannerState.products (masterDB)
    if (!capacity && (product.品番 || product.背番号)) {
        const fullProduct = plannerState.products.find(p => 
            (product.品番 && p.品番 === product.品番) || 
            (product.背番号 && p.背番号 === product.背番号)
        );
        if (fullProduct && fullProduct['収容数']) {
            capacity = parseInt(fullProduct['収容数']);
        }
    }
    
    // Default to 1 if still no capacity found
    if (!capacity || capacity <= 0) {
        capacity = 1;
    }
    
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
    let endMinutes = timeToMinutes(PLANNER_CONFIG.workEndTime);
    
    // Extend timeline if any product goes beyond workEndTime
    plannerState.selectedProducts.forEach(product => {
        if (product.startTime && product.estimatedTime) {
            const productStart = timeToMinutes(product.startTime);
            const productDuration = product.estimatedTime.totalSeconds / 60;
            const productEnd = productStart + productDuration;
            if (productEnd > endMinutes) {
                endMinutes = productEnd;
            }
        }
    });
    
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
    console.log('📁 CSV file selected:', input.files);
    
    const file = input.files[0];
    if (!file) {
        console.log('❌ No file selected');
        return;
    }
    
    console.log('📁 File details:', {
        name: file.name,
        type: file.type,
        size: file.size
    });
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        console.log('❌ Invalid file type');
        showPlannerNotification('Please select a valid CSV file', 'error');
        input.value = ''; // Reset input
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        console.log('✓ CSV file loaded, size:', e.target.result.length);
        const csv = e.target.result;
        parseGoalCsv(csv);
        // Reset input so the same file can be uploaded again
        input.value = '';
    };
    reader.onerror = function(e) {
        console.error('❌ Error reading file:', e);
        showPlannerNotification('Error reading file', 'error');
        input.value = '';
    };
    console.log('📖 Starting to read file...');
    reader.readAsText(file, 'Shift_JIS'); // JIS encoding like NODA
};

// Parse goal CSV
async function parseGoalCsv(csvData) {
    try {
        // Show loading overlay
        showCsvLoadingOverlay();
        
        console.log('📋 Parsing Goal CSV...');
        
        const lines = csvData.split(/\r?\n/).filter(line => line.trim());
        console.log(`📋 Found ${lines.length} lines in CSV`);
        
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
                        収容数: result.data.収容数,
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
        
        // Hide loading overlay and show review modal
        hideCsvLoadingOverlay();
        showGoalCsvReviewModal(processedGoals);
        
    } catch (error) {
        console.error('❌ Error parsing CSV:', error);
        hideCsvLoadingOverlay();
        showPlannerNotification('Error parsing CSV: ' + error.message, 'error');
    }
}

// Show CSV loading overlay
function showCsvLoadingOverlay() {
    const overlayHTML = `
        <div id="csvLoadingOverlay" class="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md text-center">
                <div class="flex justify-center mb-4">
                    <svg class="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Processing CSV...</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Please wait while we validate and prepare your data.</p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', overlayHTML);
}

// Hide CSV loading overlay
function hideCsvLoadingOverlay() {
    const overlay = document.getElementById('csvLoadingOverlay');
    if (overlay) overlay.remove();
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
        // Check for duplicates - send each goal with its own date
        const response = await fetch(BASE_URL + 'api/production-goals/check-duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                factory: plannerState.currentFactory,
                items: window._pendingGoals.map(g => ({ 
                    背番号: g.背番号, 
                    品番: g.品番,
                    date: g.date 
                }))
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

// Show duplicate confirmation modal
function showDuplicateConfirmationModal(pendingGoals, duplicates) {
    console.log('📋 Duplicates found:', duplicates);
    console.log('📋 Pending goals:', pendingGoals);
    
    // Create a map of duplicates for quick lookup (key includes date)
    const dupMap = {};
    duplicates.forEach(dup => {
        const key = `${dup.date}_${dup.背番号}_${dup.品番}`;
        dupMap[key] = dup;
    });
    
    // Filter pending goals to show only duplicates
    const duplicateGoals = pendingGoals.filter(goal => {
        const key = `${goal.date}_${goal.背番号}_${goal.品番}`;
        return dupMap[key];
    });
    
    console.log('📋 Matched duplicate goals:', duplicateGoals);
    
    const modalHTML = `
        <div id="duplicateConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
                <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        Duplicate Goals Found
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        ${duplicateGoals.length} goal(s) already exist for this date. Choose an action for each:
                    </p>
                </div>
                
                <div class="flex-1 overflow-y-auto p-6">
                    <div class="space-y-2 mb-4">
                        <label class="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="checkbox" id="applyToAllDuplicates" class="w-4 h-4">
                            <span class="font-medium">Apply action to all duplicates:</span>
                        </label>
                        <select id="applyToAllAction" disabled class="ml-6 p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm">
                            <option value="">Select action...</option>
                            <option value="skip">Skip (keep existing)</option>
                            <option value="add">Add (increase quantity)</option>
                            <option value="overwrite">Overwrite (replace quantity)</option>
                        </select>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm border border-gray-200 dark:border-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th class="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600">背番号</th>
                                    <th class="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600">品番</th>
                                    <th class="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600">品名</th>
                                    <th class="px-3 py-2 text-right border-b border-gray-200 dark:border-gray-600">Existing</th>
                                    <th class="px-3 py-2 text-right border-b border-gray-200 dark:border-gray-600">New</th>
                                    <th class="px-3 py-2 text-right border-b border-gray-200 dark:border-gray-600">Result</th>
                                    <th class="px-3 py-2 text-center border-b border-gray-200 dark:border-gray-600">Action</th>
                                </tr>
                            </thead>
                            <tbody id="duplicateGoalsList">
                                ${duplicateGoals.map((goal, idx) => {
                                    const key = `${goal.date}_${goal.背番号}_${goal.品番}`;
                                    const existing = dupMap[key];
                                    return `
                                        <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50" data-goal-index="${idx}">
                                            <td class="px-3 py-2">${goal.背番号}</td>
                                            <td class="px-3 py-2">${goal.品番}</td>
                                            <td class="px-3 py-2">${goal.品名 || '-'}</td>
                                            <td class="px-3 py-2 text-right font-medium text-blue-600 dark:text-blue-400">${existing.targetQuantity}</td>
                                            <td class="px-3 py-2 text-right font-medium text-green-600 dark:text-green-400">${goal.targetQuantity}</td>
                                            <td class="px-3 py-2 text-right font-bold result-cell" data-existing="${existing.targetQuantity}" data-new="${goal.targetQuantity}">-</td>
                                            <td class="px-3 py-2">
                                                <select class="duplicate-action-select w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-xs" 
                                                        data-goal-id="${existing._id}" 
                                                        data-existing-qty="${existing.targetQuantity}"
                                                        data-new-qty="${goal.targetQuantity}"
                                                        onchange="updateDuplicateResult(this)">
                                                    <option value="skip" selected>Skip</option>
                                                    <option value="add">Add (+${goal.targetQuantity})</option>
                                                    <option value="overwrite">Overwrite</option>
                                                </select>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Note:</strong> Non-duplicate goals will be imported automatically.
                    </p>
                    <div class="flex gap-3">
                        <button onclick="closeDuplicateConfirmModal()" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                        <button onclick="processDuplicateActions()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Confirm & Import</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Enable/disable "apply to all" action dropdown
    document.getElementById('applyToAllDuplicates').addEventListener('change', function(e) {
        const actionSelect = document.getElementById('applyToAllAction');
        actionSelect.disabled = !e.target.checked;
        
        if (e.target.checked && actionSelect.value) {
            // Apply selected action to all rows
            document.querySelectorAll('.duplicate-action-select').forEach(select => {
                select.value = actionSelect.value;
                updateDuplicateResult(select);
            });
        }
    });
    
    // When "apply to all" action changes, update all rows
    document.getElementById('applyToAllAction').addEventListener('change', function(e) {
        if (document.getElementById('applyToAllDuplicates').checked && e.target.value) {
            document.querySelectorAll('.duplicate-action-select').forEach(select => {
                select.value = e.target.value;
                updateDuplicateResult(select);
            });
        }
    });
    
    // Store pending goals and duplicates map for later use
    window._duplicatePendingGoals = pendingGoals;
    window._duplicateMap = dupMap;
}

// Update the result column when action changes
window.updateDuplicateResult = function(selectElement) {
    const row = selectElement.closest('tr');
    const resultCell = row.querySelector('.result-cell');
    const existing = parseInt(resultCell.dataset.existing);
    const newQty = parseInt(resultCell.dataset.new);
    const action = selectElement.value;
    
    let resultText = '-';
    let resultClass = '';
    
    switch(action) {
        case 'skip':
            resultText = existing.toString();
            resultClass = 'text-gray-600 dark:text-gray-400';
            break;
        case 'add':
            resultText = (existing + newQty).toString();
            resultClass = 'text-green-600 dark:text-green-400';
            break;
        case 'overwrite':
            resultText = newQty.toString();
            resultClass = 'text-orange-600 dark:text-orange-400';
            break;
    }
    
    resultCell.textContent = resultText;
    resultCell.className = 'px-3 py-2 text-right font-bold result-cell ' + resultClass;
};

// Close duplicate confirmation modal
window.closeDuplicateConfirmModal = function() {
    const modal = document.getElementById('duplicateConfirmModal');
    if (modal) modal.remove();
    window._duplicatePendingGoals = null;
    window._duplicateMap = null;
};

// Process duplicate actions and save goals
window.processDuplicateActions = async function() {
    const selects = document.querySelectorAll('.duplicate-action-select');
    const updates = [];
    const skippedGoalKeys = new Set();
    
    // Collect update operations
    selects.forEach(select => {
        const action = select.value;
        const goalId = select.dataset.goalId;
        const existingQty = parseInt(select.dataset.existingQty);
        const newQty = parseInt(select.dataset.newQty);
        
        if (action === 'skip') {
            // Mark this goal as skipped (we'll filter it out from new goals)
            const row = select.closest('tr');
            const goalIndex = parseInt(row.dataset.goalIndex);
            const goal = window._duplicatePendingGoals[goalIndex];
            skippedGoalKeys.add(`${goal.date}_${goal.背番号}_${goal.品番}`);
        } else if (action === 'add') {
            updates.push({
                goalId: goalId,
                targetQuantity: existingQty + newQty
            });
            // Also skip from new inserts
            const row = select.closest('tr');
            const goalIndex = parseInt(row.dataset.goalIndex);
            const goal = window._duplicatePendingGoals[goalIndex];
            skippedGoalKeys.add(`${goal.date}_${goal.背番号}_${goal.品番}`);
        } else if (action === 'overwrite') {
            updates.push({
                goalId: goalId,
                targetQuantity: newQty
            });
            // Also skip from new inserts
            const row = select.closest('tr');
            const goalIndex = parseInt(row.dataset.goalIndex);
            const goal = window._duplicatePendingGoals[goalIndex];
            skippedGoalKeys.add(`${goal.date}_${goal.背番号}_${goal.品番}`);
        }
    });
    
    try {
        // Update existing goals based on actions
        if (updates.length > 0) {
            const updatePromises = updates.map(update => 
                updateGoal(update.goalId, { targetQuantity: update.targetQuantity })
            );
            await Promise.all(updatePromises);
        }
        
        // Filter out duplicates from pending goals and save the rest
        const nonDuplicateGoals = window._duplicatePendingGoals.filter(goal => {
            const key = `${goal.date}_${goal.背番号}_${goal.品番}`;
            return !skippedGoalKeys.has(key) && !window._duplicateMap[key];
        });
        
        if (nonDuplicateGoals.length > 0) {
            await saveGoalsBatch(nonDuplicateGoals);
        } else {
            // Only updates were performed, close modals and refresh
            closeDuplicateConfirmModal();
            closeGoalCsvReviewModal();
            await loadGoals();
            renderGoalList();
            showPlannerNotification(`${updates.length} goal(s) updated successfully`, 'success');
        }
        
        closeDuplicateConfirmModal();
        
    } catch (error) {
        console.error('Error processing duplicates:', error);
        showPlannerNotification('Error processing duplicates: ' + error.message, 'error');
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
    console.log('=== CONFIRM MANUAL GOAL START ===');
    
    const product = window._selectedGoalProduct;
    const quantity = parseInt(document.getElementById('manualGoalQuantity')?.value);
    const date = document.getElementById('manualGoalDate')?.value;
    
    console.log('Product:', product);
    console.log('Quantity:', quantity);
    console.log('Date:', date);
    console.log('Current Factory:', plannerState.currentFactory);
    
    if (!product) {
        console.log('❌ No product selected');
        showPlannerNotification('Please select a product', 'warning');
        return;
    }
    
    if (!quantity || quantity <= 0) {
        console.log('❌ Invalid quantity');
        showPlannerNotification('Please enter a valid quantity', 'warning');
        return;
    }
    
    if (!date) {
        console.log('❌ No date selected');
        showPlannerNotification('Please select a date', 'warning');
        return;
    }
    
    try {
        console.log('🔍 Checking for duplicates...');
        console.log('Request URL:', BASE_URL + 'api/production-goals/check-duplicates');
        console.log('Request body:', {
            factory: plannerState.currentFactory,
            items: [{ 背番号: product.背番号, date: date }]
        });
        
        // Check for duplicates
        const dupResponse = await fetch(BASE_URL + 'api/production-goals/check-duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                factory: plannerState.currentFactory,
                items: [{ 背番号: product.背番号, date: date }]
            })
        });
        
        console.log('Duplicate check response status:', dupResponse.status);
        
        const dupResult = await dupResponse.json();
        console.log('Duplicate check result:', dupResult);
        
        if (dupResult.success && dupResult.hasDuplicates) {
            console.log('✓ Duplicates found:', dupResult.duplicates.length);
            console.log('Existing goal:', dupResult.duplicates[0]);
            
            // Close manual goal modal first to avoid modal stacking
            console.log('Closing manual goal modal...');
            closeManualGoalModal();
            
            // Show duplicate confirmation for single goal
            const existing = dupResult.duplicates[0];
            console.log('Showing duplicate modal...');
            showSingleGoalDuplicateModal(product, existing, quantity, date);
        } else {
            console.log('✓ No duplicates found, creating new goal...');
            // Create new goal
            await createNewGoal(product, quantity, date);
        }
        
        console.log('=== CONFIRM MANUAL GOAL END ===');
        
    } catch (error) {
        console.error('❌ Error adding goal:', error);
        console.error('Error stack:', error.stack);
        showPlannerNotification('Error adding goal: ' + error.message, 'error');
    }
};

// Create new goal helper function
async function createNewGoal(product, quantity, date) {
    console.log('📝 Creating new goal...');
    console.log('Product:', product);
    console.log('Quantity:', quantity);
    console.log('Date:', date);
    
    try {
        console.log('Request URL:', BASE_URL + 'api/production-goals');
        console.log('Request body:', {
            factory: plannerState.currentFactory,
            date: date,
            背番号: product.背番号,
            品番: product.品番,
            品名: product.品名,
            収容数: product.収容数,
            targetQuantity: quantity
        });
        
        const response = await fetch(BASE_URL + 'api/production-goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                factory: plannerState.currentFactory,
                date: date,
                背番号: product.背番号,
                品番: product.品番,
                品名: product.品名,
                収容数: product.収容数,
                targetQuantity: quantity,
                createdBy: window.currentUser?.username || 'system'
            })
        });
        
        console.log('Create goal response status:', response.status);
        
        const result = await response.json();
        console.log('Create goal result:', result);
        
        if (result.success) {
            console.log('✓ Goal created successfully');
            await loadGoals();
            renderGoalList();
            closeManualGoalModal();
            showPlannerNotification('Goal added successfully', 'success');
        } else {
            console.error('❌ Failed to create goal:', result.error);
            throw new Error(result.error || 'Failed to create goal');
        }
    } catch (error) {
        console.error('❌ Error creating goal:', error);
        console.error('Error stack:', error.stack);
        showPlannerNotification('Error creating goal: ' + error.message, 'error');
    }
}

// Show duplicate modal for single manual goal
function showSingleGoalDuplicateModal(product, existing, newQuantity, date) {
    const modalHTML = `
        <div id="singleGoalDuplicateModal" class="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
                <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        Duplicate Goal Found
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        A goal for this product already exists on ${date}. What would you like to do?
                    </p>
                </div>
                
                <div class="p-6">
                    <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                        <div class="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <p class="text-gray-600 dark:text-gray-400 mb-1">Product</p>
                                <p class="font-medium text-gray-900 dark:text-white">${product.背番号}</p>
                                <p class="text-xs text-gray-600 dark:text-gray-400">${product.品番}</p>
                            </div>
                            <div>
                                <p class="text-gray-600 dark:text-gray-400 mb-1">Current Quantity</p>
                                <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">${existing.targetQuantity}</p>
                            </div>
                            <div>
                                <p class="text-gray-600 dark:text-gray-400 mb-1">New Quantity</p>
                                <p class="text-2xl font-bold text-green-600 dark:text-green-400">${newQuantity}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <button onclick="handleSingleGoalDuplicateAction('skip')" 
                                class="w-full p-4 text-left border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div class="flex justify-between items-center">
                                <div>
                                    <p class="font-medium text-gray-900 dark:text-white">Skip (Keep Existing)</p>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">Cancel this operation and keep current quantity</p>
                                </div>
                                <div class="text-xl font-bold text-gray-600 dark:text-gray-400">${existing.targetQuantity}</div>
                            </div>
                        </button>
                        
                        <button onclick="handleSingleGoalDuplicateAction('add')" 
                                class="w-full p-4 text-left border-2 border-green-300 dark:border-green-600 rounded-lg hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                            <div class="flex justify-between items-center">
                                <div>
                                    <p class="font-medium text-gray-900 dark:text-white">Add to Existing</p>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">Increase quantity by ${newQuantity}</p>
                                </div>
                                <div class="text-xl font-bold text-green-600 dark:text-green-400">${existing.targetQuantity + newQuantity}</div>
                            </div>
                        </button>
                        
                        <button onclick="handleSingleGoalDuplicateAction('overwrite')" 
                                class="w-full p-4 text-left border-2 border-orange-300 dark:border-orange-600 rounded-lg hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                            <div class="flex justify-between items-center">
                                <div>
                                    <p class="font-medium text-gray-900 dark:text-white">Overwrite</p>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">Replace current quantity with new value</p>
                                </div>
                                <div class="text-xl font-bold text-orange-600 dark:text-orange-400">${newQuantity}</div>
                            </div>
                        </button>
                    </div>
                </div>
                
                <div class="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button onclick="closeSingleGoalDuplicateModal()" 
                            class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Store context for action handler
    window._singleGoalDuplicateContext = {
        product,
        existing,
        newQuantity,
        date
    };
}

// Close single goal duplicate modal
window.closeSingleGoalDuplicateModal = function() {
    const modal = document.getElementById('singleGoalDuplicateModal');
    if (modal) modal.remove();
    window._singleGoalDuplicateContext = null;
};

// Handle single goal duplicate action
window.handleSingleGoalDuplicateAction = async function(action) {
    const context = window._singleGoalDuplicateContext;
    if (!context) return;
    
    const { product, existing, newQuantity, date } = context;
    
    try {
        if (action === 'skip') {
            // Close duplicate modal
            closeSingleGoalDuplicateModal();
            // Don't do anything, just cancel the operation
            return;
        }
        
        if (action === 'add') {
            // Add to existing quantity
            const newTotal = existing.targetQuantity + newQuantity;
            const newRemaining = existing.remainingQuantity + newQuantity;
            await updateGoal(existing._id, { 
                targetQuantity: newTotal, 
                remainingQuantity: newRemaining
            });
            showPlannerNotification(`Goal updated: ${existing.targetQuantity} → ${newTotal}`, 'success');
        } else if (action === 'overwrite') {
            // Replace with new quantity
            const quantityDiff = newQuantity - existing.targetQuantity;
            const newRemaining = Math.max(0, existing.remainingQuantity + quantityDiff);
            await updateGoal(existing._id, { 
                targetQuantity: newQuantity,
                remainingQuantity: newRemaining
            });
            showPlannerNotification(`Goal updated: ${existing.targetQuantity} → ${newQuantity}`, 'success');
        }
        
        await loadGoals();
        renderGoalList();
        closeSingleGoalDuplicateModal();
        
    } catch (error) {
        console.error('Error handling duplicate action:', error);
        showPlannerNotification('Error: ' + error.message, 'error');
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
                createdBy: (window.currentUser?.firstName && window.currentUser?.lastName) 
                    ? `${window.currentUser.firstName} ${window.currentUser.lastName}`
                    : (window.currentUser?.username || 'Unknown')
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
    if (!container) {
        console.warn('⚠️ goalListContainer not found, cannot render goals');
        return;
    }
    
    console.log('🎯 Rendering goal list with', plannerState.goals.length, 'goals');
    
    const searchTerm = document.getElementById('goalSearch')?.value?.toLowerCase() || '';
    
    const filteredGoals = plannerState.goals.filter(goal => {
        if (!searchTerm) return true;
        
        return (
            (goal.品番 || '').toLowerCase().includes(searchTerm) ||
            (goal.背番号 || '').toLowerCase().includes(searchTerm) ||
            (goal.品名 || '').toLowerCase().includes(searchTerm)
        );
    }).sort((a, b) => {
        // Sort by date first
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        
        // Then by completion status (incomplete/red first, completed/green second)
        const aComplete = a.status === 'completed';
        const bComplete = b.status === 'completed';
        if (aComplete !== bComplete) return aComplete ? 1 : -1;
        
        // Finally by 背番号 alphabetically
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
    
    // Add table header
    html += `
        <div class="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 sticky top-0 z-10">
            <div class="flex items-center gap-3 py-2 px-3">
                <div class="w-2"></div>
                <div class="flex-1 grid grid-cols-[2fr_2fr_2fr_2fr_1.5fr_2fr_1fr_1fr] gap-2">
                    <div class="text-xs font-semibold text-gray-700 dark:text-gray-300">背番号</div>
                    <div class="text-xs font-semibold text-gray-700 dark:text-gray-300">品番</div>
                    <div class="text-xs font-semibold text-gray-700 dark:text-gray-300">品名</div>
                    <div class="text-xs font-semibold text-gray-700 dark:text-gray-300">Progress</div>
                    <div class="text-xs font-semibold text-gray-700 dark:text-gray-300">Assigned to</div>
                    <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 text-right">Quantity</div>
                    <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 text-right">Boxes</div>
                    <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 text-right">%</div>
                </div>
            </div>
        </div>
    `;
    
    Object.keys(goalsByDate).sort().forEach(date => {
        const goalsForDate = goalsByDate[date];
        const isToday = date === plannerState.currentDate;
        
        html += `
            <div class="mb-2">
                <div class="bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                    <span>${date}</span>
                    ${isToday ? '<span class="bg-blue-500 text-white px-2 py-0.5 rounded text-[10px]">Today</span>' : ''}
                </div>
                ${goalsForDate.map(goal => renderGoalCard(goal)).join('')}
            </div>
        `;
    });
    
    container.innerHTML = html;
    console.log('✅ Goal list rendered successfully with', Object.keys(goalsByDate).length, 'date groups');
}

function renderGoalCard(goal) {
    const color = plannerState.productColors[goal.背番号] || '#6B7280';
    const percentage = goal.targetQuantity > 0 ? Math.round((goal.scheduledQuantity / goal.targetQuantity) * 100) : 0;
    const isCompleted = goal.remainingQuantity === 0;
    const isInProgress = goal.scheduledQuantity > 0 && goal.remainingQuantity > 0;
    
    // Calculate box quantities with proper capacity lookup
    let capacity = parseInt(goal['収容数']) || 0;
    
    // If capacity not in goal, look it up from plannerState.products (masterDB)
    if (!capacity && (goal.品番 || goal.背番号)) {
        const fullProduct = plannerState.products.find(p => 
            (goal.品番 && p.品番 === goal.品番) || 
            (goal.背番号 && p.背番号 === goal.背番号)
        );
        
        if (fullProduct && fullProduct['収容数']) {
            capacity = parseInt(fullProduct['収容数']);
        }
    }
    
    // Default to 1 if still no capacity found
    if (!capacity || capacity <= 0) {
        capacity = 1;
    }
    
    const scheduledBoxes = Math.ceil(goal.scheduledQuantity / capacity);
    const targetBoxes = Math.ceil(goal.targetQuantity / capacity);
    
    let statusBgClass = '';
    let statusTextClass = '';
    let statusDotColor = '';
    let progressBarColor = '';
    
    if (isCompleted) {
        statusBgClass = 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30';
        statusTextClass = 'text-green-700 dark:text-green-400';
        statusDotColor = '#10B981';
        progressBarColor = 'bg-green-500';
    } else if (isInProgress) {
        statusBgClass = 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30';
        statusTextClass = 'text-yellow-700 dark:text-yellow-400';
        statusDotColor = '#F59E0B';
        progressBarColor = 'bg-yellow-500';
    } else {
        statusBgClass = 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30';
        statusTextClass = 'text-red-700 dark:text-red-400';
        statusDotColor = '#EF4444';
        progressBarColor = 'bg-red-500';
    }
    
    // Get assigned equipment for this goal
    const assignedEquipment = plannerState.selectedProducts
        .filter(p => p.背番号 === goal.背番号)
        .map(p => p.equipment)
        .filter((eq, idx, arr) => arr.indexOf(eq) === idx); // unique
    
    const equipmentDisplay = assignedEquipment.length > 0 
        ? assignedEquipment.join(', ')
        : '-';
    
    // List row format
    return `
        <div class="goal-list-row border-b border-gray-200 dark:border-gray-700 ${statusBgClass} hover:shadow-sm transition-all cursor-pointer" onclick="openBulkEditGoalsModal()">
            <div class="flex items-center gap-3 py-2 px-3">
                <div class="w-2 h-2 rounded-full flex-shrink-0" style="background-color: ${statusDotColor}"></div>
                <div class="flex-1 grid grid-cols-[2fr_2fr_2fr_2fr_1.5fr_2fr_1fr_1fr] gap-2 items-center">
                    <div>
                        <p class="font-medium text-sm text-gray-900 dark:text-white">${goal.背番号 || '-'}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-600 dark:text-gray-400">${goal.品番 || '-'}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-600 dark:text-gray-400 truncate">${goal.品名 || '-'}</p>
                    </div>
                    <div>
                        <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div class="h-2 rounded-full transition-all ${progressBarColor}" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                    <div>
                        <p class="text-xs font-medium text-blue-600 dark:text-blue-400">${equipmentDisplay}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs font-medium ${statusTextClass}">${goal.scheduledQuantity} / ${goal.targetQuantity} pcs</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-gray-600 dark:text-gray-400">${scheduledBoxes}/${targetBoxes}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-xs font-semibold ${statusTextClass}">${percentage}%</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Add goal to timeline (called when clicking on a goal in the list)
function addGoalToTimeline(goalId) {
    const goal = plannerState.goals.find(g => g._id === goalId);
    if (!goal || goal.remainingQuantity === 0) {
        showPlannerNotification('This goal is already completed', 'warning');
        return;
    }
    
    // Switch to Planning tab and show timeline
    switchPlannerMainTab('planning');
    
    // Show notification
    showPlannerNotification('Click on a time slot in the timeline to add this product', 'info');
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

function updateSelectedProductsSummary(searchTerm = '') {
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
    
    // Calculate total matches if searching
    let totalMatches = 0;
    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        totalMatches = plannerState.selectedProducts.filter(item =>
            (item.背番号 || '').toLowerCase().includes(searchLower) ||
            (item.品番 || '').toLowerCase().includes(searchLower)
        ).length;
    }
    
    const searchResultInfo = searchTerm ? `
        <div class="mb-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-[10px] text-blue-700 dark:text-blue-300 flex items-center gap-1">
            <i class="ri-search-line"></i>
            <span>Found ${totalMatches} matching product(s)</span>
        </div>
    ` : '';
    
    const clearAllButton = `
        <div class="mb-1 flex justify-end">
            <button onclick="clearAllSelectedProducts()" 
                    class="px-2 py-0.5 text-[10px] bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1">
                <i class="ri-delete-bin-line text-xs"></i>
                <span>Clear All</span>
            </button>
        </div>
    `;
    
    container.innerHTML = searchResultInfo + clearAllButton + Object.entries(byEquipment).map(([equipment, data]) => {
        // Filter items if search term is provided
        const searchLower = searchTerm.toLowerCase();
        const filteredItems = searchTerm ? data.items.filter(item => 
            (item.背番号 || '').toLowerCase().includes(searchLower) ||
            (item.品番 || '').toLowerCase().includes(searchLower)
        ) : data.items;
        
        // Check if this equipment has any matching items
        const hasMatch = filteredItems.length > 0;
        
        // If searching and no match, hide this equipment group
        if (searchTerm && !hasMatch) {
            return '';
        }
        
        // Calculate time range
        const startTimes = data.items.map(item => timeToMinutes(item.startTime));
        const earliestStart = Math.min(...startTimes);
        const latestEnd = Math.max(...data.items.map((item, idx) => {
            const start = startTimes[idx];
            const duration = item.estimatedTime.totalSeconds / 60;
            return start + duration;
        }));
        
        const timeRange = `${minutesToTime(earliestStart)} - ${minutesToTime(latestEnd)}`;
        const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
        const itemCount = data.items.length;
        const hours = Math.floor(data.totalMinutes / 60);
        const mins = Math.round(data.totalMinutes % 60);
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        const effectiveWork = getEffectiveWorkMinutes();
        const utilization = Math.round((data.totalMinutes / effectiveWork) * 100);
        const isOverCapacity = utilization > 100;
        
        // Auto-expand if searching and has matches
        const isExpanded = searchTerm && hasMatch;
        
        return `
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded mb-1 overflow-hidden ${searchTerm && hasMatch ? 'ring-2 ring-blue-500' : ''}">
                <!-- Collapsed Summary Card -->
                <div class="p-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors" 
                     onclick="toggleEquipmentCard('${equipment}')">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <h4 class="font-medium text-xs text-gray-900 dark:text-white truncate">${equipment}</h4>
                            <div class="text-[10px] text-gray-600 dark:text-gray-300 flex items-center gap-1 flex-wrap">
                                <span>${itemCount} items</span>
                                <span>•</span>
                                <span>${totalQuantity}pcs</span>
                                <span>•</span>
                                <span class="truncate">${timeRange}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 flex-shrink-0">
                            <span class="text-[10px] ${isOverCapacity ? 'text-red-600 font-bold' : 'text-gray-500 dark:text-gray-400'} whitespace-nowrap">
                                ${timeStr} (${utilization}%)
                                ${isOverCapacity ? '<i class="ri-alert-fill ml-0.5"></i>' : ''}
                            </span>
                            <i class="ri-arrow-down-s-line text-base text-gray-500 dark:text-gray-400 transition-transform equipment-card-arrow ${isExpanded ? 'rotate-180' : ''}" 
                               id="arrow-${equipment}"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Expandable Details -->
                <div class="${isExpanded ? '' : 'hidden'} border-t border-gray-200 dark:border-gray-600 p-1 space-y-0.5" id="details-${equipment}">
                    ${filteredItems.map(item => {
                        const startTime = item.startTime;
                        const startMinutes = timeToMinutes(startTime);
                        const durationMinutes = item.estimatedTime.totalSeconds / 60;
                        const endMinutes = startMinutes + durationMinutes;
                        
                        // Find breaks during this product's time
                        const affectingBreaks = plannerState.breaks.filter(brk => {
                            const breakStart = timeToMinutes(brk.start);
                            const breakEnd = timeToMinutes(brk.end);
                            const isForThisEquipment = !brk.equipment || brk.equipment === equipment;
                            return breakStart >= startMinutes && breakStart < endMinutes && isForThisEquipment;
                        }).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
                        
                        // Build time ranges string
                        let timeRanges = '';
                        if (affectingBreaks.length === 0) {
                            timeRanges = `${startTime} - ${minutesToTime(endMinutes)}`;
                        } else {
                            let currentTime = startMinutes;
                            const ranges = [];
                            
                            affectingBreaks.forEach(brk => {
                                const breakStart = timeToMinutes(brk.start);
                                if (currentTime < breakStart) {
                                    ranges.push(`${minutesToTime(currentTime)} - ${minutesToTime(breakStart)}`);
                                }
                                currentTime = timeToMinutes(brk.end);
                            });
                            
                            // Add final range after last break
                            if (currentTime < endMinutes) {
                                ranges.push(`${minutesToTime(currentTime)} - ${minutesToTime(endMinutes)}`);
                            }
                            
                            timeRanges = ranges.join(', ');
                        }
                        
                        // Highlight matched text
                        const highlightText = (text) => {
                            if (!searchTerm || !text) return text;
                            const regex = new RegExp(`(${searchTerm})`, 'gi');
                            return text.replace(regex, '<mark class="bg-yellow-300 dark:bg-yellow-600 px-0.5">$1</mark>');
                        };
                        
                        return `
                        <div class="flex items-center justify-between text-[10px] py-0.5 border-b border-gray-200 dark:border-gray-600 last:border-0 gap-1 ${searchTerm ? 'bg-blue-50 dark:bg-blue-900/20' : ''}">
                            <div class="flex items-center gap-1 flex-1 min-w-0">
                                <div class="w-1 h-1 rounded-full flex-shrink-0" style="background-color: ${item.color}"></div>
                                <span class="text-gray-700 dark:text-gray-300 font-medium truncate">${highlightText(item.背番号)}</span>
                                <span class="text-[9px] text-gray-500 dark:text-gray-400 truncate">${timeRanges}</span>
                            </div>
                            <div class="flex items-center gap-1 flex-shrink-0">
                                <span class="text-gray-500 dark:text-gray-400">${item.quantity}pcs</span>
                                <span class="text-gray-500 dark:text-gray-400">${item.estimatedTime.formattedTime}</span>
                                <button onclick="removeSelectedProduct('${item._id}')" class="text-red-500 hover:text-red-700">
                                    <i class="ri-close-line text-xs"></i>
                                </button>
                            </div>
                        </div>
                    `}).join('')}
                </div>
                ${isOverCapacity ? `
                    <div class="px-1.5 pb-1 text-[10px] text-red-600 dark:text-red-400">
                        <i class="ri-error-warning-line mr-0.5"></i>
                        <span data-i18n="exceedsCapacity">Exceeds daily capacity</span>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function removeSelectedProduct(productId) {
    const index = plannerState.selectedProducts.findIndex(p => p._id === productId);
    if (index !== -1) {
        const product = plannerState.selectedProducts[index];
        
        // Restore goal quantity if this product was from a goal
        if (product.goalId || product._id) {
            const goalId = product.goalId || product._id;
            console.log(`Restoring ${product.quantity} pcs to goal ${goalId}`);
            
            try {
                // Update goal to restore the quantity
                const goal = plannerState.goals.find(g => g._id === goalId);
                if (goal) {
                    const response = await fetch(BASE_URL + `api/production-goals/${goalId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            remainingQuantity: goal.remainingQuantity + product.quantity,
                            scheduledQuantity: goal.scheduledQuantity - product.quantity,
                            status: 'pending' // Reset to pending if removing scheduled quantity
                        })
                    });
                    
                    if (response.ok) {
                        console.log('✅ Goal quantity restored');
                        // Reload goals to reflect changes
                        await loadGoals();
                        renderGoalList();
                    }
                }
            } catch (error) {
                console.error('Error restoring goal quantity:', error);
            }
        }
        
        // Remove from selected products
        plannerState.selectedProducts.splice(index, 1);
        renderProductList();
        updateSelectedProductsSummary();
        renderAllViews();
        
        // Auto-save the plan after deletion
        await savePlanToDatabase();
    }
}

async function clearAllSelectedProducts() {
    if (plannerState.selectedProducts.length === 0) return;
    
    if (!confirm(`Clear all ${plannerState.selectedProducts.length} products from the timeline? This will restore all quantities to their goals.`)) {
        return;
    }
    
    console.log('🗑️ Clearing all products from timeline...');
    
    // Group products by goalId to handle duplicates
    const quantitiesByGoal = {};
    for (const product of plannerState.selectedProducts) {
        if (product.goalId || product._id) {
            const goalId = product.goalId || product._id;
            if (!quantitiesByGoal[goalId]) {
                quantitiesByGoal[goalId] = 0;
            }
            quantitiesByGoal[goalId] += product.quantity;
        }
    }
    
    // Restore all goal quantities
    for (const [goalId, totalQuantity] of Object.entries(quantitiesByGoal)) {
        try {
            const goal = plannerState.goals.find(g => g._id === goalId);
            if (goal) {
                // Calculate the new values based on CURRENT goal state
                const newRemainingQuantity = goal.remainingQuantity + totalQuantity;
                const newScheduledQuantity = Math.max(0, goal.scheduledQuantity - totalQuantity);
                
                console.log(`Restoring ${goal.背番号}: scheduled ${goal.scheduledQuantity} -> ${newScheduledQuantity}, remaining ${goal.remainingQuantity} -> ${newRemainingQuantity}`);
                
                const response = await fetch(BASE_URL + `api/production-goals/${goalId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        remainingQuantity: newRemainingQuantity,
                        scheduledQuantity: newScheduledQuantity,
                        status: newScheduledQuantity === 0 ? 'pending' : (newRemainingQuantity === 0 ? 'completed' : 'in-progress')
                    })
                });
                
                if (!response.ok) {
                    console.error('Failed to restore goal:', await response.text());
                }
            }
        } catch (error) {
            console.error('Error restoring goal quantity:', error);
        }
    }
    
    // Clear all selected products
    plannerState.selectedProducts = [];
    
    // Delete the plan from database (or save empty state)
    await deletePlanFromDatabase();
    
    // Reload goals to ensure fresh state and refresh UI
    await loadGoals();
    renderGoalList();
    renderProductList();
    updateSelectedProductsSummary();
    renderAllViews();
    
    showPlannerNotification('All products cleared from timeline', 'success');
}

// Filter selected products by search term
window.filterSelectedProducts = function(searchTerm) {
    updateSelectedProductsSummary(searchTerm);
};

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
    
    // Calculate current time position for red line
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = timeToMinutes(PLANNER_CONFIG.workStartTime);
    const minutesFromStart = currentMinutes - startMinutes;
    const currentTimePosition = (minutesFromStart / PLANNER_CONFIG.intervalMinutes) * slotWidth + 96; // 96px = equipment column width (24 * 4)
    
    // Build timeline header
    let headerHTML = '<div class="flex-shrink-0 w-24 bg-gray-100 dark:bg-gray-700 border-r dark:border-gray-600 p-2 font-medium text-gray-700 dark:text-gray-300 sticky left-0 z-10" data-i18n="equipment">Equipment</div>';
    
    timeSlots.forEach((slot, index) => {
        // Show all time labels
        const isHourMark = slot.endsWith(':00');
        headerHTML += `
            <div class="flex-shrink-0 border-r dark:border-gray-600 text-center text-xs text-gray-500 dark:text-gray-400 ${isHourMark ? 'font-medium' : ''}" style="width: ${slotWidth}px">
                ${slot}
            </div>
        `;
    });
    
    // Helper function to check if equipment should be greyed out
    function shouldGreyOutEquipment(equipment, dataSource) {
        // If equipment contains comma, it's a group - check if any component has data
        if (equipment.includes(',')) {
            const components = equipment.split(',').map(e => e.trim());
            return components.some(comp => 
                dataSource.some(d => d.equipment === comp)
            );
        }
        
        // If solo equipment, check if it's part of any group that has data
        return plannerState.equipment.some(eq => {
            if (eq.includes(',') && eq.includes(equipment)) {
                const components = eq.split(',').map(e => e.trim());
                if (components.includes(equipment)) {
                    return dataSource.some(d => d.equipment === eq);
                }
            }
            return false;
        });
    }
    
    // Build equipment rows - Planned first, then Actual
    let rowsHTML = '';
    plannerState.equipment.forEach(equipment => {
        const assignedProducts = plannerState.selectedProducts.filter(p => p.equipment === equipment);
        const actualProduction = plannerState.actualProduction.filter(p => p.equipment === equipment);
        
        // Check if rows should be greyed out independently
        const greyOutPlanned = shouldGreyOutEquipment(equipment, plannerState.selectedProducts);
        const greyOutActual = shouldGreyOutEquipment(equipment, plannerState.actualProduction);
        
        console.log(`🔧 ${equipment}: ${assignedProducts.length} planned (grey: ${greyOutPlanned}), ${actualProduction.length} actual (grey: ${greyOutActual})`);
        
        // Planned row
        const plannedRowClasses = greyOutPlanned ? 'opacity-40 pointer-events-none' : '';
        const hidePlannedRow = plannerState.hideUnavailableEquipment && greyOutPlanned;
        
        if (!hidePlannedRow) {
            rowsHTML += `
                <div class="flex border-b dark:border-gray-600 min-h-[60px] ${plannedRowClasses}" data-equipment="${equipment}">
                    <div class="flex-shrink-0 w-24 bg-gray-50 dark:bg-gray-700/50 border-r dark:border-gray-600 p-2 text-sm font-medium text-gray-700 dark:text-gray-300 sticky left-0 z-10">
                        ${equipment}${greyOutPlanned ? ' <span class="text-[10px] text-gray-500">(unavailable)</span>' : ''}
                    </div>
                    <div class="flex-1 flex relative">
                        ${renderTimelineSlots(timeSlots, equipment, assignedProducts, slotWidth)}
                    </div>
                </div>
            `;
        }
        
        // Actual row
        const actualRowClasses = greyOutActual ? 'opacity-40 pointer-events-none' : '';
        const hideActualRow = plannerState.hideUnavailableEquipment && greyOutActual;
        
        if (!hideActualRow) {
            rowsHTML += `
                <div class="flex border-b dark:border-gray-600 min-h-[60px] bg-gray-50/30 dark:bg-gray-900/30 ${actualRowClasses}" data-equipment="${equipment}-actual">
                    <div class="flex-shrink-0 w-24 bg-gray-100 dark:bg-gray-800 border-r dark:border-gray-600 p-2 text-xs font-medium text-gray-600 dark:text-gray-400 sticky left-0 z-10 flex flex-col justify-center">
                        <div>${equipment}${greyOutActual ? ' <span class="text-[9px] text-gray-500">(unavailable)</span>' : ''}</div>
                        <div class="text-[10px] text-gray-500 dark:text-gray-500">Actual</div>
                    </div>
                    <div class="flex-1 flex relative">
                        ${renderActualProductionSlots(timeSlots, equipment, actualProduction, slotWidth)}
                    </div>
                </div>
            `;
        }
    });
    
    container.innerHTML = `
        <!-- Toggle Button -->
        <div class="mb-3 flex items-center justify-end">
            <button onclick="toggleHideUnavailableEquipment()" 
                    class="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        plannerState.hideUnavailableEquipment 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400' 
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }">
                <i class="ri-${ plannerState.hideUnavailableEquipment ? 'eye-off-line' : 'eye-line' }"></i>
                <span>${ plannerState.hideUnavailableEquipment ? 'Show' : 'Hide' } Unavailable Equipment</span>
            </button>
        </div>
        
        <div class="border rounded-lg dark:border-gray-600 overflow-hidden">
            <div class="overflow-auto max-h-[calc(100vh-200px)]">
                <div class="min-w-max relative">
                    <!-- Current Time Indicator -->
                    ${currentMinutes >= startMinutes ? `
                        <div class="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none" 
                             style="left: ${currentTimePosition}px;">
                            <div class="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full"></div>
                        </div>
                    ` : ''}
                    <!-- Header -->
                    <div class="flex border-b dark:border-gray-600 bg-gray-50 dark:bg-gray-700 sticky top-0 z-20">
                        ${headerHTML}
                    </div>
                    <!-- Rows -->
                    <div class="bg-white dark:bg-gray-800">
                        ${rowsHTML}
                    </div>
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
            
            for (let i = 0; i < assignedProducts.length; i++) {
                const product = assignedProducts[i];
                const productStartMinutes = product.startTime ? timeToMinutes(product.startTime) : 0;
                const productDurationMinutes = product.estimatedTime.totalSeconds / 60;
                
                // Calculate actual production minutes used up to this slot (excluding breaks)
                let productionMinutesUsed = 0;
                let currentScanMinute = productStartMinutes;
                
                // Count production minutes from product start to current slot, skipping breaks
                while (currentScanMinute < slotMinutes && productionMinutesUsed < productDurationMinutes) {
                    // Check if current minute is in a break for this equipment
                    const isInBreak = plannerState.breaks.some(brk => {
                        const breakStart = timeToMinutes(brk.start);
                        const breakEnd = timeToMinutes(brk.end);
                        const isForThisEquipment = !brk.equipment || brk.equipment === equipment;
                        return currentScanMinute >= breakStart && currentScanMinute < breakEnd && isForThisEquipment;
                    });
                    
                    if (!isInBreak) {
                        productionMinutesUsed += PLANNER_CONFIG.intervalMinutes;
                    }
                    currentScanMinute += PLANNER_CONFIG.intervalMinutes;
                }
                
                // Debug first iteration
                if (i === 0 && index === 0) {
                    console.log(`🔍 Checking ${product.背番号}: start=${productStartMinutes}min (${product.startTime}), duration=${productDurationMinutes}min, productionMinutesUsed=${productionMinutesUsed}min`);
                }
                
                // This slot is part of the product if:
                // 1. Current slot is at or after product start time
                // 2. We haven't used up all production minutes yet
                // 3. Current slot is not in a break
                if (slotMinutes >= productStartMinutes && productionMinutesUsed < productDurationMinutes) {
                    productForSlot = product;
                    break;
                }
            }
            
            if (productForSlot) {
                // Check if this is the first slot for this specific product
                const productStartMinutes = productForSlot.startTime ? timeToMinutes(productForSlot.startTime) : 0;
                const isFirstSlotForProduct = slotMinutes === productStartMinutes;
                
                html += `
                    <div class="flex-shrink-0 border-r dark:border-gray-500 relative group ${isFirstSlotForProduct ? 'cursor-move' : ''}" 
                         style="width: ${slotWidth}px; background-color: ${productForSlot.color}20"
                         ${isFirstSlotForProduct ? `draggable="true" 
                         ondragstart="handleProductDragStart(event, '${productForSlot._id}', '${equipment}')"
                         ondragend="handleProductDragEnd(event)"` : ''}>
                        <div class="absolute inset-0 flex items-center justify-center text-xs font-medium truncate px-1" 
                             style="color: ${productForSlot.color}" 
                             title="${productForSlot.背番号} - ${productForSlot.quantity}pcs (${isFirstSlotForProduct ? 'Drag to reschedule' : ''})">
                            ${productForSlot.背番号}
                        </div>
                        ${isFirstSlotForProduct ? `
                            <button onclick="event.stopPropagation(); removeSelectedProduct('${productForSlot._id}')" 
                                    class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs hover:bg-red-600 z-10"
                                    title="Delete">
                                <i class="ri-close-line"></i>
                            </button>
                        ` : ''}
                    </div>
                `;
            } else {
                html += `
                    <div class="flex-shrink-0 border-r dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer group relative drop-zone" 
                         style="width: ${slotWidth}px"
                         data-equipment="${equipment}"
                         data-time="${slot}"
                         ondragover="handleTimelineDragOver(event)"
                         ondragleave="handleTimelineDragLeave(event)"
                         ondrop="handleTimelineDrop(event, '${equipment}', '${slot}')"
                         onclick="handleTimelineSlotClick('${equipment}', '${slot}')" 
                         title="Click to add products or drop here to reschedule">
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

function renderActualProductionSlots(timeSlots, equipment, actualProduction, slotWidth) {
    let html = '';
    const currentTime = new Date();
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Helper function to darken a color
    function darkenColor(color) {
        // Convert hex to RGB
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        // Darken by 40%
        const darkR = Math.floor(r * 0.6);
        const darkG = Math.floor(g * 0.6);
        const darkB = Math.floor(b * 0.6);
        
        return `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;
    }
    
    timeSlots.forEach((slot, index) => {
        const slotMinutes = timeToMinutes(slot);
        
        // Find actual production for this slot
        let productForSlot = null;
        let recordsForSlot = [];
        
        for (const prod of actualProduction) {
            const startMinutes = timeToMinutes(prod.startTime);
            const endMinutes = timeToMinutes(prod.endTime);
            
            if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
                productForSlot = prod;
                recordsForSlot = prod.records;
                break;
            }
        }
        
        if (productForSlot) {
            const startMinutes = timeToMinutes(productForSlot.startTime);
            const isFirstSlot = slotMinutes === startMinutes;
            const originalColor = plannerState.productColors[productForSlot.背番号] || '#6B7280';
            const darkColor = darkenColor(originalColor);
            
            html += `
                <div class="flex-shrink-0 border-r dark:border-gray-500 relative group cursor-pointer" 
                     style="width: ${slotWidth}px; background-color: ${darkColor}40"
                     onclick="showActualProductionModal('${equipment}', '${productForSlot.背番号}', ${index})">
                    <div class="absolute inset-0 flex items-center justify-center text-xs font-bold truncate px-1" 
                         style="color: ${darkColor}" 
                         title="${productForSlot.背番号} - Actual Production (Click for details)">
                        ${isFirstSlot ? productForSlot.背番号 : ''}
                    </div>
                </div>
            `;
        } else if (slotMinutes <= currentMinutes) {
            // Show IDLE only up to current time
            html += `
                <div class="flex-shrink-0 border-r dark:border-gray-600 relative" 
                     style="width: ${slotWidth}px; background-color: #1a1a1a">
                    <div class="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-gray-400">
                        ${index % 4 === 0 ? 'IDLE' : ''}
                    </div>
                </div>
            `;
        } else {
            // Future time - show empty
            html += `
                <div class="flex-shrink-0 border-r dark:border-gray-600" 
                     style="width: ${slotWidth}px">
                </div>
            `;
        }
    });
    
    return html;
}

function handleTimelineSlotClick(equipment, timeSlot) {
    // Show context menu to choose: Add Products or Add Break
    const modalHTML = `
        <div id="timelineClickModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                <div class="p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        ${equipment} - ${timeSlot}
                    </h3>
                    
                    <div class="space-y-3">
                        <button onclick="closeTimelineClickModal(); showMultiColumnProductPicker('${equipment}', '${timeSlot}')" 
                                class="w-full p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                            <i class="ri-add-circle-line text-xl"></i>
                            <span data-i18n="addProducts">Add Products</span>
                        </button>
                        
                        <button onclick="closeTimelineClickModal(); showAddBreakModal('${equipment}', '${timeSlot}')" 
                                class="w-full p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
                            <i class="ri-time-line text-xl"></i>
                            <span data-i18n="addBreak">Add Break Time</span>
                        </button>
                        
                        <button onclick="closeTimelineClickModal()" 
                                class="w-full p-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <span data-i18n="cancel">Cancel</span>
                        </button>
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

function closeTimelineClickModal() {
    const modal = document.getElementById('timelineClickModal');
    if (modal) modal.remove();
}

function showAddBreakModal(equipment, timeSlot) {
    const modalHTML = `
        <div id="addBreakModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                <div class="p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4" data-i18n="addBreakTime">Add Break Time</h3>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="equipment">Equipment</label>
                            <select id="breakEquipmentSelect" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                                <option value="">All Equipment</option>
                                ${plannerState.equipment.map(eq => `<option value="${eq}" ${eq === equipment ? 'selected' : ''}>${eq}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="breakName">Break Name</label>
                            <input type="text" id="breakNameInput" value="Break" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="startTime">Start Time</label>
                            <input type="time" id="breakStartTime" value="${timeSlot}" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" data-i18n="endTime">End Time</label>
                            <input type="time" id="breakEndTime" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                        </div>
                    </div>
                    
                    <div class="flex justify-end gap-3 mt-6">
                        <button onclick="closeAddBreakModal()" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" data-i18n="cancel">Cancel</button>
                        <button onclick="confirmAddBreak()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" data-i18n="add">Add</button>
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

async function confirmAddBreak() {
    const equipment = document.getElementById('breakEquipmentSelect').value;
    const name = document.getElementById('breakNameInput').value;
    const startTime = document.getElementById('breakStartTime').value;
    const endTime = document.getElementById('breakEndTime').value;
    
    if (!startTime || !endTime) {
        showPlannerNotification('Please enter start and end time', 'warning');
        return;
    }
    
    const newBreak = {
        id: `break-${Date.now()}`,
        name: name || 'Break',
        start: startTime,
        end: endTime,
        equipment: equipment || null,
        isDefault: false
    };
    
    plannerState.breaks.push(newBreak);
    closeAddBreakModal();
    renderAllViews();
    
    // Auto-save after adding break
    await savePlanToDatabase();
    
    showPlannerNotification('Break time added', 'success');
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
                            ` : assignedProducts.map(item => {
                                // Calculate boxes from masterDB capacity
                                let capacity = parseInt(item['収容数']) || 0;
                                if (!capacity && (item.品番 || item.背番号)) {
                                    const fullProduct = plannerState.products.find(p => 
                                        (item.品番 && p.品番 === item.品番) || 
                                        (item.背番号 && p.背番号 === item.背番号)
                                    );
                                    if (fullProduct && fullProduct['収容数']) {
                                        capacity = parseInt(fullProduct['収容数']);
                                    }
                                }
                                if (!capacity || capacity <= 0) capacity = 1;
                                const boxes = Math.ceil(item.quantity / capacity);
                                
                                return `
                                <div class="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-600 shadow-sm cursor-move"
                                     draggable="true"
                                     ondragstart="handleKanbanDragStart(event, '${item._id}')"
                                     data-product-id="${item._id}">
                                    <div class="flex items-center justify-between mb-2">
                                        <div class="flex items-center gap-2">
                                            <div class="w-3 h-3 rounded-full" style="background-color: ${item.color}"></div>
                                            <span class="font-medium text-gray-900 dark:text-white">${item.背番号}</span>
                                        </div>
                                        <button onclick="event.stopPropagation(); removeSelectedProduct('${item._id}')" 
                                                class="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                title="Delete">
                                            <i class="ri-close-line text-lg"></i>
                                        </button>
                                    </div>
                                    <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                        <div class="flex justify-between">
                                            <span data-i18n="quantity">Quantity</span>
                                            <span>${item.quantity}pcs</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span data-i18n="boxes">Boxes</span>
                                            <span>${boxes}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span data-i18n="time">Time</span>
                                            <span>${item.estimatedTime.formattedTime}</span>
                                        </div>
                                    </div>
                                </div>
                            `}).join('')}
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

async function handleKanbanDrop(event, newEquipment) {
    event.preventDefault();
    const productId = event.dataTransfer.getData('productId');
    
    const product = plannerState.selectedProducts.find(p => p._id === productId);
    if (product && product.equipment !== newEquipment) {
        product.equipment = newEquipment;
        renderAllViews();
        updateSelectedProductsSummary();
        
        // Auto-save after equipment change
        await savePlanToDatabase();
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
                    ${sortedProducts.map(item => {
                        // Calculate boxes from masterDB capacity
                        let capacity = parseInt(item['収容数']) || 0;
                        if (!capacity && (item.品番 || item.背番号)) {
                            const fullProduct = plannerState.products.find(p => 
                                (item.品番 && p.品番 === item.品番) || 
                                (item.背番号 && p.背番号 === item.背番号)
                            );
                            if (fullProduct && fullProduct['収容数']) {
                                capacity = parseInt(fullProduct['収容数']);
                            }
                        }
                        if (!capacity || capacity <= 0) capacity = 1;
                        const boxes = Math.ceil(item.quantity / capacity);
                        
                        return `
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
                            <td class="px-4 py-3 text-right text-gray-900 dark:text-white">${boxes}</td>
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
                    `}).join('')}
                </tbody>
                <tfoot class="bg-gray-100 dark:bg-gray-700 font-semibold">
                    <tr>
                        <td colspan="4" class="px-4 py-3 text-gray-900 dark:text-white" data-i18n="total">Total</td>
                        <td class="px-4 py-3 text-right text-gray-900 dark:text-white">
                            ${sortedProducts.reduce((sum, p) => sum + p.quantity, 0)}
                        </td>
                        <td class="px-4 py-3 text-right text-gray-900 dark:text-white">
                            ${sortedProducts.reduce((sum, item) => {
                                let capacity = parseInt(item['収容数']) || 0;
                                if (!capacity && (item.品番 || item.背番号)) {
                                    const fullProduct = plannerState.products.find(p => 
                                        (item.品番 && p.品番 === item.品番) || 
                                        (item.背番号 && p.背番号 === item.背番号)
                                    );
                                    if (fullProduct && fullProduct['収容数']) {
                                        capacity = parseInt(fullProduct['収容数']);
                                    }
                                }
                                if (!capacity || capacity <= 0) capacity = 1;
                                return sum + Math.ceil(item.quantity / capacity);
                            }, 0)}
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
        const remainingQty = product.remainingQuantity || 0;
        
        // Get 収容数 from product (it comes from masterDB in the goal)
        // First check if it's in the goal object, otherwise try to find it in products list
        let capacity = parseInt(product['収容数']) || 1;
        
        // If not in goal, look it up from the full product in plannerState
        if (!product['収容数'] && product.品番) {
            const fullProduct = plannerState.products.find(p => p.品番 === product.品番 || p.背番号 === product.背番号);
            if (fullProduct && fullProduct['収容数']) {
                capacity = parseInt(fullProduct['収容数']);
            }
        }
        
        const boxes = Math.ceil(remainingQty / capacity);
        
        return `
            <div class="p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 transition-colors"
                 onclick="addToMultiPickerSelected('${product._id}')">
                <div class="flex items-start gap-2">
                    <div class="w-3 h-3 rounded-full mt-0.5" style="background-color: ${color}"></div>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-sm text-gray-900 dark:text-white truncate">${product.背番号 || '-'}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${product.品番 || '-'}</p>
                        <p class="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                            ${remainingQty} pcs / ${boxes} ${boxes === 1 ? 'box' : 'boxes'}
                        </p>
                    </div>
                    <i class="ri-add-circle-line text-blue-500 text-lg"></i>
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
        
        // Get goal info
        const goalQty = product.remainingQuantity || 0;
        const inputQty = product.quantity || 0;
        const remaining = Math.max(0, goalQty - inputQty);
        
        // Get capacity for box calculation
        let capacity = parseInt(product['収容数']) || 1;
        if (!product['収容数'] && product.品番) {
            const fullProduct = plannerState.products.find(p => p.品番 === product.品番 || p.背番号 === product.背番号);
            if (fullProduct && fullProduct['収容数']) {
                capacity = parseInt(fullProduct['収容数']);
            }
        }
        const goalBoxes = Math.ceil(goalQty / capacity);
        const remainingBoxes = Math.ceil(remaining / capacity);
        
        return `
            <div class="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                <div class="flex items-start gap-2 mb-2">
                    <div class="w-3 h-3 rounded-full mt-1" style="background-color: ${color}"></div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-baseline gap-2">
                            <p class="font-medium text-sm text-gray-900 dark:text-white">${product.背番号 || '-'}</p>
                            <p class="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                ${goalQty} pcs / ${goalBoxes} boxes
                            </p>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${product.品名 || '-'}</p>
                    </div>
                    <button onclick="removeFromMultiPickerSelected(${index})" class="text-red-500 hover:text-red-700">
                        <i class="ri-close-line"></i>
                    </button>
                </div>
                <div class="space-y-2">
                    <div>
                        <label class="text-xs text-gray-600 dark:text-gray-400">Quantity</label>
                        <input type="number" id="${product.quantityInputId}" min="1" max="${goalQty}" value="${product.quantity}" 
                               class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                               onchange="updateMultiPickerQuantity(${index}, this.value)">
                        <p class="text-xs mt-1 ${remaining > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}">
                            ${remaining > 0 ? `Remaining: ${remaining} pcs / ${remainingBoxes} boxes` : 'Goal Complete! ✓'}
                        </p>
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
    const product = multiPickerState.selectedProducts[index];
    let qty = parseInt(value) || 1;
    
    // Validate against remaining quantity
    if (product.remainingQuantity && qty > product.remainingQuantity) {
        console.warn(`⚠️ Quantity ${qty} exceeds remaining ${product.remainingQuantity} for ${product.背番号}`);
        showPlannerNotification(`Cannot exceed remaining quantity (${product.remainingQuantity} pcs)`, 'warning');
        qty = product.remainingQuantity;
    }
    
    product.quantity = qty;
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
    // Use the clicked time slot, not the work start time
    let currentTime = timeToMinutes(multiPickerState.startTime);
    const equipment = multiPickerState.equipment;
    
    console.log(`🕒 Starting products at clicked time: ${multiPickerState.startTime} (${currentTime} minutes)`);
    
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
            console.log(`📦 Scheduling ${product.quantity} pcs for goal ${product._id} (${product.背番号})`);
            
            // Find the current goal to check remaining quantity
            const currentGoal = plannerState.goals.find(g => g._id === product._id);
            console.log(`   Current goal state: remaining=${currentGoal?.remainingQuantity}, scheduled=${currentGoal?.scheduledQuantity}, target=${currentGoal?.targetQuantity}`);
            
            if (currentGoal && product.quantity > currentGoal.remainingQuantity) {
                console.error(`⚠️ Cannot schedule ${product.quantity} pcs - only ${currentGoal.remainingQuantity} pcs remaining!`);
                showPlannerNotification(`Cannot schedule ${product.quantity} pcs for ${product.背番号} - only ${currentGoal.remainingQuantity} pcs remaining`, 'error');
                continue; // Skip this product
            }
            
            updatePromises.push(
                fetch(BASE_URL + `api/production-goals/${product._id}/schedule`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantityToSchedule: product.quantity })
                }).then(async response => {
                    if (!response.ok) {
                        const error = await response.json();
                        console.error(`❌ Failed to update goal ${product._id}: ${error.error || 'Unknown error'}`);
                        showPlannerNotification(`Error: ${error.error || 'Failed to update goal'}`, 'error');
                    } else {
                        const result = await response.json();
                        console.log(`✅ Goal ${product._id} updated successfully - remaining: ${result.remainingQuantity}`);
                    }
                    return response;
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
        
        console.log('✅ Goal quantities updated successfully');
        
    } catch (error) {
        console.error('Error updating goal quantities:', error);
        showPlannerNotification('Warning: Some goal quantities may not have been updated', 'warning');
    }
    
    closeMultiColumnPicker();
    renderGoalList();
    updateSelectedProductsSummary();
    renderAllViews();
    
    // Auto-save the plan after adding products
    console.log('💾 Auto-saving plan to database...');
    await savePlanToDatabase();
    
    showPlannerNotification(`Added ${multiPickerState.orderedProducts.length} products to timeline`, 'success');
}

// Save current plan to database
async function savePlanToDatabase() {
    if (!plannerState.currentFactory) {
        return;
    }
    
    // If no products, delete the plan instead of saving empty state
    if (plannerState.selectedProducts.length === 0) {
        await deletePlanFromDatabase();
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
    const fullName = currentUser.firstName && currentUser.lastName 
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : (currentUser.username || 'Unknown');
    
    const planData = {
        factory: plannerState.currentFactory,
        date: plannerState.currentDate,
        createdBy: fullName,
        createdAt: new Date(),
        updatedAt: new Date(),
        breaks: plannerState.breaks,
        products: plannerState.selectedProducts.map(item => ({
            goalId: item.goalId || item._id,
            背番号: item.背番号,
            品番: item.品番,
            品名: item.品名,
            equipment: item.equipment,
            quantity: item.quantity,
            boxes: item.boxes,
            startTime: item.startTime,
            estimatedTime: item.estimatedTime
        }))
    };
    
    try {
        // Check if plan exists for this factory/date
        const existingResponse = await fetch(BASE_URL + 'queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dbName: 'submittedDB',
                collectionName: 'productionPlansDB',
                query: { 
                    factory: plannerState.currentFactory,
                    date: plannerState.currentDate
                }
            })
        });
        
        const existingPlans = await existingResponse.json();
        
        if (existingPlans.length > 0) {
            // Update existing plan
            const planId = existingPlans[0]._id;
            console.log('Updating existing plan:', planId);
            
            const updateResponse = await fetch('http://localhost:3000/api/production-plans/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: planId,
                    factory: planData.factory,
                    date: planData.date,
                    products: planData.products,
                    breaks: planData.breaks,
                    updatedBy: planData.createdBy
                })
            });
            
            if (!updateResponse.ok) {
                const error = await updateResponse.json();
                throw new Error(error.error || 'Failed to update plan');
            }
            
            console.log('✅ Plan updated successfully');
        } else {
            // Create new plan
            console.log('Creating new plan');
            
            const insertResponse = await fetch('http://localhost:3000/api/production-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(planData)
            });
            
            if (!insertResponse.ok) {
                const error = await insertResponse.json();
                throw new Error(error.error || 'Failed to create plan');
            }
            
            console.log('✅ Plan created successfully');
        }
        
    } catch (error) {
        console.error('❌ Error saving plan:', error);
        showPlannerNotification('Warning: Plan may not have been saved', 'warning');
    }
}

async function deletePlanFromDatabase() {
    if (!plannerState.currentFactory || !plannerState.currentDate) {
        return;
    }
    
    try {
        // Find existing plan for this factory/date
        const existingResponse = await fetch(BASE_URL + 'queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dbName: 'submittedDB',
                collectionName: 'productionPlansDB',
                query: { 
                    factory: plannerState.currentFactory,
                    date: plannerState.currentDate
                }
            })
        });
        
        const existingPlans = await existingResponse.json();
        
        if (existingPlans.length > 0) {
            // Delete the plan
            const planId = existingPlans[0]._id;
            console.log('Deleting plan:', planId);
            
            const deleteResponse = await fetch(`http://localhost:3000/api/production-plans/${planId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!deleteResponse.ok) {
                const error = await deleteResponse.json();
                throw new Error(error.error || 'Failed to delete plan');
            }
            
            console.log('✅ Plan deleted successfully');
            plannerState.currentPlan = null;
        }
    } catch (error) {
        console.error('❌ Error deleting plan:', error);
        showPlannerNotification('Warning: Failed to delete plan from database', 'warning');
    }
}

function findNextAvailableTime(startMinutes, durationMinutes, equipment) {
    let currentMinutes = startMinutes;
    
    // First, check if start time is within a break and skip to break end
    const startInBreak = plannerState.breaks.find(brk => {
        const breakStart = timeToMinutes(brk.start);
        const breakEnd = timeToMinutes(brk.end);
        const isForThisEquipment = !brk.equipment || brk.equipment === equipment;
        return currentMinutes >= breakStart && currentMinutes < breakEnd && isForThisEquipment;
    });
    
    if (startInBreak) {
        currentMinutes = timeToMinutes(startInBreak.end);
    }
    
    // Now check if the product duration will overlap with any breaks
    // If so, we need to account for the break time
    let adjustedEndTime = currentMinutes + durationMinutes;
    
    // Find all breaks that fall within the product's time range
    const overlappingBreaks = plannerState.breaks.filter(brk => {
        const breakStart = timeToMinutes(brk.start);
        const breakEnd = timeToMinutes(brk.end);
        const isForThisEquipment = !brk.equipment || brk.equipment === equipment;
        // Break overlaps if it starts during product time
        return breakStart >= currentMinutes && breakStart < adjustedEndTime && isForThisEquipment;
    }).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    
    // Add break durations to the end time
    overlappingBreaks.forEach(brk => {
        const breakDuration = timeToMinutes(brk.end) - timeToMinutes(brk.start);
        adjustedEndTime += breakDuration;
    });
    
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
    console.log('=== SMART SCHEDULING DEBUG START ===');
    console.log('Current Factory:', plannerState.currentFactory);
    console.log('Current Date:', plannerState.currentDate);
    console.log('Total Goals:', plannerState.goals.length);
    
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
        
        console.log('Goals to schedule (filtered by date and remaining qty):', goalsToSchedule);
        console.log('Goals count:', goalsToSchedule.length);
        
        if (goalsToSchedule.length === 0) {
            showPlannerNotification('No goals with remaining quantity for today', 'warning');
            return;
        }
        
        // Prepare items for API request
        const itemsForRequest = goalsToSchedule.map(g => ({ 背番号: g.背番号, 品番: g.品番 }));
        console.log('Items being sent to API:', itemsForRequest);
        
        // Fetch press history trends
        const requestBody = {
            factory: plannerState.currentFactory,
            items: itemsForRequest
        };
        console.log('API Request Body:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(BASE_URL + 'api/production-goals/press-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        console.log('API Response Status:', response.status);
        const result = await response.json();
        console.log('API Response Result:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch trends');
        }
        
        const trends = result.trends;
        console.log('Trends received:', trends);
        console.log('Number of trends:', Object.keys(trends).length);
        
        // Auto-assign products to equipment based on trends
        const assignments = {};
        let totalAssigned = 0;
        let totalUnassigned = 0;
        
        goalsToSchedule.forEach(goal => {
            const identifier = goal.背番号 || goal.品番;
            console.log(`Processing goal: ${identifier}`);
            console.log('  Full goal object:', goal);
            
            const trend = trends[identifier];
            console.log(`  Trend for ${identifier}:`, trend);
            
            if (trend && trend.mostFrequentEquipment) {
                const equipment = trend.mostFrequentEquipment;
                console.log(`  ✓ ASSIGNED to ${equipment} (confidence: ${trend.frequency}/${trend.totalRecords})`);
                
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
                console.log(`  ✗ NOT ASSIGNED - No trend data found`);
                totalUnassigned++;
            }
        });
        
        console.log('Final assignments:', assignments);
        console.log('Total Assigned:', totalAssigned);
        console.log('Total Unassigned:', totalUnassigned);
        console.log('=== SMART SCHEDULING DEBUG END ===');
        
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
                    <div class="mt-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Schedule until:
                        </label>
                        <input type="time" id="smartSchedulingTimeLimit" value="17:30" 
                               class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                        <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">(Default: 5:30 PM)</span>
                    </div>
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
    
    // Get time limit from input field
    const timeLimitInput = document.getElementById('smartSchedulingTimeLimit');
    const timeLimitValue = timeLimitInput ? timeLimitInput.value : '17:30';
    const MAX_END_TIME = timeToMinutes(timeLimitValue);
    
    try {
        // Sort equipment by confidence level and prepare scheduling queue
        const equipmentQueue = [];
        
        for (const [equipment, products] of Object.entries(assignments)) {
            for (const product of products) {
                equipmentQueue.push({
                    equipment,
                    product,
                    confidence: product.confidence || 0
                });
            }
        }
        
        // Sort by confidence (highest first)
        equipmentQueue.sort((a, b) => b.confidence - a.confidence);
        
        // Try to schedule each product
        for (const item of equipmentQueue) {
            const { equipment, product } = item;
            
            // Find the last scheduled time for this equipment
            const existingProducts = plannerState.selectedProducts.filter(p => p.equipment === equipment);
            let currentTime = timeToMinutes(PLANNER_CONFIG.workStartTime);
            
            // If there are existing products, start after the last one
            if (existingProducts.length > 0) {
                existingProducts.sort((a, b) => {
                    const timeA = a.startTime ? timeToMinutes(a.startTime) : 0;
                    const timeB = b.startTime ? timeToMinutes(b.startTime) : 0;
                    return timeA - timeB;
                });
                
                const lastProduct = existingProducts[existingProducts.length - 1];
                if (lastProduct.startTime) {
                    currentTime = timeToMinutes(lastProduct.startTime) + (lastProduct.estimatedTime.totalSeconds / 60);
                }
            }
            
            const timeInfo = calculateProductionTime(product, product.quantity);
            const productDurationMinutes = timeInfo.totalSeconds / 60;
            const actualStartTime = findNextAvailableTime(currentTime, productDurationMinutes, equipment);
            const actualEndTime = actualStartTime + productDurationMinutes;
            
            console.log(`\n🤖 Smart Scheduling: ${product.背番号} on ${equipment}`);
            console.log(`   Start: ${minutesToTime(actualStartTime)}, End: ${minutesToTime(actualEndTime)}, Limit: ${timeLimitValue}`);
            
            // Check if product would end after time limit
            if (actualEndTime > MAX_END_TIME) {
                console.log(`   ⚠️ Would exceed ${timeLimitValue} limit - trying alternative equipment`);
                
                // Try to find alternative equipment with available capacity
                let scheduled = false;
                const alternativeEquipment = Object.keys(assignments).filter(eq => eq !== equipment);
                
                for (const altEq of alternativeEquipment) {
                    const altExisting = plannerState.selectedProducts.filter(p => p.equipment === altEq);
                    let altCurrentTime = timeToMinutes(PLANNER_CONFIG.workStartTime);
                    
                    if (altExisting.length > 0) {
                        altExisting.sort((a, b) => {
                            const timeA = a.startTime ? timeToMinutes(a.startTime) : 0;
                            const timeB = b.startTime ? timeToMinutes(b.startTime) : 0;
                            return timeA - timeB;
                        });
                        const lastProd = altExisting[altExisting.length - 1];
                        if (lastProd.startTime) {
                            altCurrentTime = timeToMinutes(lastProd.startTime) + (lastProd.estimatedTime.totalSeconds / 60);
                        }
                    }
                    
                    const altStart = findNextAvailableTime(altCurrentTime, productDurationMinutes, altEq);
                    const altEnd = altStart + productDurationMinutes;
                    
                    if (altEnd <= MAX_END_TIME) {
                        console.log(`   ✅ Reassigning to ${altEq} (ends at ${minutesToTime(altEnd)})`);
                        await scheduleProduct(product, altEq, altStart, timeInfo);
                        scheduled = true;
                        break;
                    }
                }
                
                if (!scheduled) {
                    console.log(`   ❌ Could not fit before ${timeLimitValue} on any equipment - skipping`);
                    showPlannerNotification(`${product.背番号} could not fit before ${timeLimitValue}`, 'warning');
                }
                continue;
            }
            
            // Schedule on primary equipment
            await scheduleProduct(product, equipment, actualStartTime, timeInfo);
        }
        
        // Helper function to schedule a product
        async function scheduleProduct(product, equipment, startTime, timeInfo) {
            const boxes = calculateBoxesNeeded(product, product.quantity);
            
            plannerState.selectedProducts.push({
                ...product,
                equipment: equipment,
                boxes: boxes,
                estimatedTime: timeInfo,
                color: plannerState.productColors[product.背番号],
                startTime: minutesToTime(startTime),
                goalId: product._id
            });
            
            // Update goal quantity
            console.log(`📦 Updating goal ${product._id}: scheduling ${product.quantity} pcs on ${equipment}`);
            const response = await fetch(BASE_URL + `api/production-goals/${product._id}/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantityToSchedule: product.quantity })
            });
            
            if (response.ok) {
                console.log(`✅ Goal ${product._id} updated successfully`);
            } else {
                console.error(`❌ Failed to update goal ${product._id}`);
            }
        }
        
        // Reload goals
        await loadGoals();
        
        closeSmartSchedulingModal();
        renderGoalList();
        updateSelectedProductsSummary();
        renderAllViews();
        
        // Auto-save plan after smart scheduling
        console.log('💾 Auto-saving plan after Smart Scheduling...');
        await savePlanToDatabase();
        
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
    const fullName = currentUser.firstName && currentUser.lastName 
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : (currentUser.username || 'Unknown');
    
    const planData = {
        '工場': plannerState.currentFactory,
        'planDate': plannerState.currentDate,
        'endDate': plannerState.endDate,
        'createdBy': fullName,
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
                    // Recalculate boxes to ensure correct capacity
                    const boxes = calculateBoxesNeeded(product, item.quantity);
                    
                    plannerState.selectedProducts.push({
                        ...product,
                        quantity: item.quantity,
                        equipment: item.equipment,
                        boxes: boxes,
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

// ============================================
// SELECTED PRODUCTS CARD TOGGLE
// ============================================
function toggleEquipmentCard(equipment) {
    const details = document.getElementById(`details-${equipment}`);
    const arrow = document.getElementById(`arrow-${equipment}`);
    
    if (details && arrow) {
        details.classList.toggle('hidden');
        arrow.classList.toggle('rotate-180');
    }
}

// ============================================
// DRAG AND DROP FOR TIMELINE
// ============================================
let draggedProduct = null;
let draggedProductEquipment = null;

function handleProductDragStart(event, productId, equipment) {
    draggedProduct = productId;
    draggedProductEquipment = equipment;
    event.target.style.opacity = '0.5';
    event.dataTransfer.effectAllowed = 'move';
    console.log(`🎯 Started dragging product ${productId} from ${equipment}`);
}

function handleProductDragEnd(event) {
    event.target.style.opacity = '1';
}

function handleTimelineDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('bg-green-100', 'dark:bg-green-900/30');
}

function handleTimelineDragLeave(event) {
    event.currentTarget.classList.remove('bg-green-100', 'dark:bg-green-900/30');
}

async function handleTimelineDrop(event, targetEquipment, targetTime) {
    event.preventDefault();
    event.currentTarget.classList.remove('bg-green-100', 'dark:bg-green-900/30');
    
    if (!draggedProduct) return;
    
    console.log(`📍 Dropped product ${draggedProduct} at ${targetEquipment} - ${targetTime}`);
    
    // Find the product
    const productIndex = plannerState.selectedProducts.findIndex(p => p._id === draggedProduct);
    if (productIndex === -1) {
        console.error('Product not found');
        draggedProduct = null;
        return;
    }
    
    const product = plannerState.selectedProducts[productIndex];
    const oldStartTime = product.startTime;
    const oldEquipment = product.equipment;
    
    // Calculate new start time accounting for breaks
    const targetMinutes = timeToMinutes(targetTime);
    const durationMinutes = product.estimatedTime.totalSeconds / 60;
    const newStartTime = findNextAvailableTime(targetMinutes, durationMinutes, targetEquipment);
    
    // Update product
    product.startTime = minutesToTime(newStartTime);
    product.equipment = targetEquipment;
    
    console.log(`✏️ Rescheduled ${product.背番号}: ${oldEquipment} ${oldStartTime} → ${targetEquipment} ${product.startTime}`);
    
    // Update views
    updateSelectedProductsSummary();
    renderAllViews();
    
    // Auto-save
    await savePlanToDatabase();
    
    showPlannerNotification(`${product.背番号} rescheduled to ${product.startTime}`, 'success');
    
    draggedProduct = null;
    draggedProductEquipment = null;
}

// ============================================
// BULK EDIT GOALS MODAL
// ============================================
function openBulkEditGoalsModal() {
    if (!plannerState.currentFactory || !plannerState.currentDate) {
        showPlannerNotification('Please select factory and date first', 'warning');
        return;
    }
    
    // Filter goals for current date and factory
    const currentGoals = plannerState.goals.filter(g => 
        g.date === plannerState.currentDate && g.factory === plannerState.currentFactory
    );
    
    const modalHtml = `
        <div id="bulkEditGoalsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                        Edit Production Goals - ${plannerState.currentFactory} - ${plannerState.currentDate}
                    </h3>
                    <button onclick="closeBulkEditGoalsModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>
                
                <div class="flex-1 overflow-auto p-6">
                    <!-- Bulk Action Buttons -->
                    <div class="mb-4 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <button onclick="toggleSelectAllGoals()" 
                                    class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-2">
                                <i class="ri-checkbox-multiple-line"></i>
                                <span id="selectAllBtnText">Select All</span>
                            </button>
                            <button onclick="deleteSelectedGoals()" 
                                    id="deleteSelectedBtn"
                                    class="px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 flex items-center gap-2 opacity-50 cursor-not-allowed"
                                    disabled>
                                <i class="ri-delete-bin-line"></i>
                                <span>Delete Selected (<span id="selectedCount">0</span>)</span>
                            </button>
                        </div>
                        <button onclick="deleteAllGoals()" 
                                class="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-2">
                            <i class="ri-delete-bin-line"></i>
                            <span>Delete All (${currentGoals.length})</span>
                        </button>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-100 dark:bg-gray-700 sticky top-0">
                                <tr>
                                    <th class="px-4 py-3 text-center w-12">
                                        <input type="checkbox" 
                                               id="selectAllCheckbox"
                                               onchange="toggleSelectAllGoals()"
                                               class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                    </th>
                                    <th class="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold">背番号</th>
                                    <th class="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold">品番</th>
                                    <th class="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold">品名</th>
                                    <th class="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold w-32">Target Qty</th>
                                    <th class="px-4 py-3 text-center text-gray-700 dark:text-gray-300 font-semibold w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="bulkEditGoalsTableBody" class="divide-y divide-gray-200 dark:divide-gray-700">
                                ${currentGoals.map(goal => `
                                    <tr data-goal-id="${goal._id}" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td class="px-4 py-3 text-center">
                                            <input type="checkbox" 
                                                   class="goal-checkbox w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                   value="${goal._id}"
                                                   onchange="updateSelectedCount()">
                                        </td>
                                        <td class="px-4 py-3 text-gray-900 dark:text-white">${goal.背番号 || '-'}</td>
                                        <td class="px-4 py-3 text-gray-900 dark:text-white">${goal.品番 || '-'}</td>
                                        <td class="px-4 py-3 text-gray-600 dark:text-gray-400">${goal.品名 || '-'}</td>
                                        <td class="px-4 py-3">
                                            <input type="number" 
                                                   value="${goal.targetQuantity}" 
                                                   min="1"
                                                   class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                                                   onchange="updateGoalQuantityInTable('${goal._id}', this.value)">
                                        </td>
                                        <td class="px-4 py-3 text-center">
                                            <button onclick="deleteGoalFromTable('${goal._id}')" 
                                                    class="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                                                <i class="ri-delete-bin-line"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Add New Goal Section -->
                    <div class="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Add New Goal</h4>
                        <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
                            <div>
                                <label class="block text-xs text-gray-700 dark:text-gray-300 mb-1">背番号</label>
                                <input type="text" id="newGoal背番号" 
                                       class="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-white text-sm"
                                       placeholder="背番号">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-700 dark:text-gray-300 mb-1">品番</label>
                                <input type="text" id="newGoal品番" 
                                       class="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-white text-sm"
                                       placeholder="品番">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-700 dark:text-gray-300 mb-1">品名</label>
                                <input type="text" id="newGoal品名" 
                                       class="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-white text-sm"
                                       placeholder="品名"
                                       readonly>
                            </div>
                            <div>
                                <label class="block text-xs text-gray-700 dark:text-gray-300 mb-1">Target Qty</label>
                                <input type="number" id="newGoalQuantity" min="1" value="100"
                                       class="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 dark:text-white text-sm">
                            </div>
                            <div class="flex items-end">
                                <button onclick="addNewGoalFromTable()" 
                                        class="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium">
                                    <i class="ri-add-line mr-1"></i>Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button onclick="closeBulkEditGoalsModal()" 
                            class="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Setup auto-fill event listeners after modal is added to DOM
    setTimeout(() => {
        const backNumberInput = document.getElementById('newGoal背番号');
        const partNumberInput = document.getElementById('newGoal品番');
        
        if (backNumberInput) {
            backNumberInput.addEventListener('blur', handleGoalBackNumberBlur);
        }
        if (partNumberInput) {
            partNumberInput.addEventListener('blur', handleGoalPartNumberBlur);
        }
    }, 100);
}

function closeBulkEditGoalsModal() {
    const modal = document.getElementById('bulkEditGoalsModal');
    if (modal) {
        modal.remove();
    }
}

async function updateGoalQuantityInTable(goalId, newQuantity) {
    try {
        const quantity = parseInt(newQuantity);
        if (isNaN(quantity) || quantity < 1) {
            showPlannerNotification('Invalid quantity', 'error');
            return;
        }
        
        const response = await fetch(BASE_URL + `api/production-goals/${goalId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetQuantity: quantity
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update local state with recalculated values
            const goal = plannerState.goals.find(g => g._id === goalId);
            if (goal) {
                const currentScheduled = goal.scheduledQuantity || 0;
                goal.targetQuantity = quantity;
                goal.remainingQuantity = quantity - currentScheduled;
                
                // Update status
                if (goal.remainingQuantity <= 0) {
                    goal.status = 'completed';
                } else if (currentScheduled > 0) {
                    goal.status = 'in-progress';
                } else {
                    goal.status = 'pending';
                }
            }
            
            showPlannerNotification('Goal quantity updated', 'success');
            renderGoalList();
        } else {
            showPlannerNotification('Failed to update goal', 'error');
        }
    } catch (error) {
        console.error('Error updating goal:', error);
        showPlannerNotification('Error updating goal', 'error');
    }
}

async function deleteGoalFromTable(goalId) {
    if (!confirm('Delete this goal? This cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(BASE_URL + `api/production-goals/${goalId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Remove from local state
            plannerState.goals = plannerState.goals.filter(g => g._id !== goalId);
            
            // Remove from table
            const row = document.querySelector(`tr[data-goal-id="${goalId}"]`);
            if (row) {
                row.remove();
            }
            
            showPlannerNotification('Goal deleted', 'success');
            renderGoalList();
        } else {
            showPlannerNotification('Failed to delete goal', 'error');
        }
    } catch (error) {
        console.error('Error deleting goal:', error);
        showPlannerNotification('Error deleting goal', 'error');
    }
}

// Update selected count and enable/disable delete button
window.updateSelectedCount = function() {
    const checkboxes = document.querySelectorAll('.goal-checkbox:checked');
    const count = checkboxes.length;
    const selectedCountEl = document.getElementById('selectedCount');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const totalCheckboxes = document.querySelectorAll('.goal-checkbox').length;
    
    if (selectedCountEl) {
        selectedCountEl.textContent = count;
    }
    
    if (deleteBtn) {
        if (count > 0) {
            deleteBtn.disabled = false;
            deleteBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            deleteBtn.disabled = true;
            deleteBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // Update select all checkbox state
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = count === totalCheckboxes && count > 0;
        selectAllCheckbox.indeterminate = count > 0 && count < totalCheckboxes;
    }
};

// Toggle select all checkboxes
window.toggleSelectAllGoals = function() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.goal-checkbox');
    const selectAllBtn = document.getElementById('selectAllBtnText');
    
    if (!selectAllCheckbox) return;
    
    const shouldCheck = !selectAllCheckbox.checked;
    
    checkboxes.forEach(cb => {
        cb.checked = shouldCheck;
    });
    
    selectAllCheckbox.checked = shouldCheck;
    selectAllCheckbox.indeterminate = false;
    
    if (selectAllBtn) {
        selectAllBtn.textContent = shouldCheck ? 'Deselect All' : 'Select All';
    }
    
    updateSelectedCount();
};

// Delete selected goals
window.deleteSelectedGoals = async function() {
    const checkboxes = document.querySelectorAll('.goal-checkbox:checked');
    const goalIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (goalIds.length === 0) {
        showPlannerNotification('No goals selected', 'warning');
        return;
    }
    
    if (!confirm(`Delete ${goalIds.length} selected goal(s)? This cannot be undone.`)) {
        return;
    }
    
    try {
        let successCount = 0;
        let failCount = 0;
        
        for (const goalId of goalIds) {
            try {
                const response = await fetch(BASE_URL + `api/production-goals/${goalId}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    successCount++;
                    // Remove from local state
                    plannerState.goals = plannerState.goals.filter(g => g._id !== goalId);
                    // Remove from table
                    const row = document.querySelector(`tr[data-goal-id="${goalId}"]`);
                    if (row) row.remove();
                } else {
                    failCount++;
                }
            } catch (error) {
                console.error('Error deleting goal:', goalId, error);
                failCount++;
            }
        }
        
        if (successCount > 0) {
            showPlannerNotification(`${successCount} goal(s) deleted successfully`, 'success');
            renderGoalList();
        }
        
        if (failCount > 0) {
            showPlannerNotification(`${failCount} goal(s) failed to delete`, 'error');
        }
        
        updateSelectedCount();
    } catch (error) {
        console.error('Error deleting goals:', error);
        showPlannerNotification('Error deleting goals', 'error');
    }
};

// Delete all goals
window.deleteAllGoals = async function() {
    const currentGoals = plannerState.goals.filter(g => 
        g.date === plannerState.currentDate && g.factory === plannerState.currentFactory
    );
    
    if (currentGoals.length === 0) {
        showPlannerNotification('No goals to delete', 'warning');
        return;
    }
    
    if (!confirm(`Delete ALL ${currentGoals.length} goal(s) for ${plannerState.currentFactory} on ${plannerState.currentDate}? This cannot be undone.`)) {
        return;
    }
    
    try {
        let successCount = 0;
        let failCount = 0;
        
        for (const goal of currentGoals) {
            try {
                const response = await fetch(BASE_URL + `api/production-goals/${goal._id}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    successCount++;
                    // Remove from local state
                    plannerState.goals = plannerState.goals.filter(g => g._id !== goal._id);
                } else {
                    failCount++;
                }
            } catch (error) {
                console.error('Error deleting goal:', goal._id, error);
                failCount++;
            }
        }
        
        if (successCount > 0) {
            showPlannerNotification(`${successCount} goal(s) deleted successfully`, 'success');
            renderGoalList();
            closeBulkEditGoalsModal();
        }
        
        if (failCount > 0) {
            showPlannerNotification(`${failCount} goal(s) failed to delete`, 'error');
        }
    } catch (error) {
        console.error('Error deleting all goals:', error);
        showPlannerNotification('Error deleting all goals', 'error');
    }
};

// Auto-generation handlers for Add New Goal
async function handleGoalBackNumberBlur() {
    const backNumber = document.getElementById('newGoal背番号')?.value?.trim();
    const partNumberField = document.getElementById('newGoal品番');
    const productNameField = document.getElementById('newGoal品名');
    
    // Only auto-fill if backNumber has value and other fields are empty
    if (!backNumber || partNumberField.value.trim()) {
        return;
    }
    
    try {
        const response = await fetch(BASE_URL + 'api/production-goals/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                searchType: '背番号', 
                searchValue: backNumber 
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            partNumberField.value = result.data.品番 || '';
            productNameField.value = result.data.品名 || '';
            
            // Show brief notification
            showGoalAutoFillNotification('品番 and 品名 auto-filled from masterDB');
        }
    } catch (error) {
        console.error('Error looking up by 背番号:', error);
    }
}

async function handleGoalPartNumberBlur() {
    const partNumber = document.getElementById('newGoal品番')?.value?.trim();
    const backNumberField = document.getElementById('newGoal背番号');
    const productNameField = document.getElementById('newGoal品名');
    
    // Only auto-fill if partNumber has value and other fields are empty
    if (!partNumber || backNumberField.value.trim()) {
        return;
    }
    
    try {
        const response = await fetch(BASE_URL + 'api/production-goals/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                searchType: '品番', 
                searchValue: partNumber 
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            backNumberField.value = result.data.背番号 || '';
            productNameField.value = result.data.品名 || '';
            
            // Show brief notification
            showGoalAutoFillNotification('背番号 and 品名 auto-filled from masterDB');
        }
    } catch (error) {
        console.error('Error looking up by 品番:', error);
    }
}

function showGoalAutoFillNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
    notification.innerHTML = `<i class="ri-magic-line mr-2"></i>${message}`;
    
    document.body.appendChild(notification);
    
    // Fade out and remove after 2 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

async function addNewGoalFromTable() {
    console.log('=== ADD NEW GOAL FROM TABLE START ===');
    
    const 背番号 = document.getElementById('newGoal背番号')?.value?.trim();
    const 品番 = document.getElementById('newGoal品番')?.value?.trim();
    const 品名 = document.getElementById('newGoal品名')?.value?.trim();
    const quantity = parseInt(document.getElementById('newGoalQuantity')?.value);
    
    console.log('Input values:', { 背番号, 品番, 品名, quantity });
    console.log('Current factory:', plannerState.currentFactory);
    console.log('Current date:', plannerState.currentDate);
    
    if (!背番号 || !品番) {
        console.log('❌ Missing required fields');
        showPlannerNotification('背番号 and 品番 are required', 'error');
        return;
    }
    
    if (isNaN(quantity) || quantity < 1) {
        console.log('❌ Invalid quantity');
        showPlannerNotification('Invalid quantity', 'error');
        return;
    }
    
    try {
        // Look up product details from masterDB if needed
        let productData = { 背番号, 品番, 品名 };
        
        console.log('🔍 Looking up product in masterDB...');
        // Try to find additional details from masterDB
        const lookupResponse = await fetch(BASE_URL + 'api/production-goals/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                searchType: '背番号', 
                searchValue: 背番号 
            })
        });
        
        const lookupResult = await lookupResponse.json();
        console.log('Lookup result:', lookupResult);
        
        if (lookupResult.success && lookupResult.data) {
            productData = { ...productData, ...lookupResult.data };
            console.log('✓ Product data enriched from masterDB');
        }
        
        // Check for duplicates BEFORE creating
        console.log('🔍 Checking for duplicates...');
        const dupResponse = await fetch(BASE_URL + 'api/production-goals/check-duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                factory: plannerState.currentFactory,
                items: [{ 背番号, 品番, date: plannerState.currentDate }]
            })
        });
        
        const dupResult = await dupResponse.json();
        console.log('Duplicate check result:', dupResult);
        
        if (dupResult.success && dupResult.hasDuplicates) {
            console.log('✓ Duplicates found:', dupResult.duplicates.length);
            console.log('Existing goal:', dupResult.duplicates[0]);
            
            // Close bulk edit modal first to avoid modal stacking
            console.log('Closing bulk edit modal...');
            closeBulkEditGoalsModal();
            
            // Show duplicate confirmation
            const existing = dupResult.duplicates[0];
            console.log('Showing duplicate modal...');
            showSingleGoalDuplicateModal(productData, existing, quantity, plannerState.currentDate);
            return;
        }
        
        console.log('✓ No duplicates found, creating new goal...');
        
        // Create the goal
        const response = await fetch(BASE_URL + 'api/production-goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                factory: plannerState.currentFactory,
                date: plannerState.currentDate,
                targetQuantity: quantity,
                ...productData
            })
        });
        
        console.log('Create response status:', response.status);
        
        const result = await response.json();
        console.log('Create result:', result);
        
        if (result.success) {
            console.log('✓ Goal created successfully');
            
            // Add to local state
            plannerState.goals.push(result.data);
            
            // Clear inputs
            document.getElementById('newGoal背番号').value = '';
            document.getElementById('newGoal品番').value = '';
            document.getElementById('newGoal品名').value = '';
            document.getElementById('newGoalQuantity').value = '100';
            
            // Refresh modal content
            closeBulkEditGoalsModal();
            openBulkEditGoalsModal();
            
            showPlannerNotification('Goal added successfully', 'success');
            renderGoalList();
        } else {
            showPlannerNotification(result.message || 'Failed to add goal', 'error');
        }
    } catch (error) {
        console.error('Error adding goal:', error);
        showPlannerNotification('Error adding goal', 'error');
    }
}

// Make functions globally available
window.initializePlanner = initializePlanner;
window.handleFactoryChange = handleFactoryChange;
window.switchPlannerMainTab = switchPlannerMainTab;
window.addGoalToTimeline = addGoalToTimeline;
window.switchPlannerTab = switchPlannerTab;
window.toggleProductSelection = toggleProductSelection;
window.updateQuantityPreview = updateQuantityPreview;
window.closeAddProductModal = closeAddProductModal;
window.confirmAddProduct = confirmAddProduct;
window.removeSelectedProduct = removeSelectedProduct;
window.clearAllSelectedProducts = clearAllSelectedProducts;
window.editSelectedProduct = editSelectedProduct;
window.handleKanbanDragStart = handleKanbanDragStart;
window.handleKanbanDragOver = handleKanbanDragOver;
window.handleKanbanDrop = handleKanbanDrop;
window.handleTimelineSlotClick = handleTimelineSlotClick;
// ============================================
// ACTUAL PRODUCTION MODAL
// ============================================
window.showActualProductionModal = function(equipment, sebanggo, slotIndex) {
    // Find the actual production data for this equipment and sebanggo
    const actualProd = plannerState.actualProduction.find(p => 
        p.equipment === equipment && p.背番号 === sebanggo
    );
    
    if (!actualProd || !actualProd.records || actualProd.records.length === 0) {
        console.error('No actual production data found for', equipment, sebanggo);
        return;
    }
    
    const records = actualProd.records;
    
    // Combine data from all records
    const totalQuantity = records.reduce((sum, r) => sum + (r.Process_Quantity || 0), 0);
    const totalNG = records.reduce((sum, r) => sum + (r.Total_NG || 0), 0);
    const firstRecord = records[0];
    
    const modalHTML = `
        <div id="actualProductionModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
                    <div class="flex items-center justify-between">
                        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">${firstRecord.品番}</h2>
                        <button onclick="closeActualProductionModal()" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            <i class="ri-close-line text-2xl"></i>
                        </button>
                    </div>
                </div>
                
                <div class="p-6 space-y-6">
                    <!-- Basic Info -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">品番</label>
                            <div class="text-lg font-semibold text-gray-900 dark:text-white">${firstRecord.品番}</div>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">背番号</label>
                            <div class="text-lg font-semibold text-gray-900 dark:text-white">${sebanggo}</div>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">工場</label>
                            <div class="text-lg font-semibold text-gray-900 dark:text-white">${firstRecord.工場}</div>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">日付</label>
                            <div class="text-lg font-semibold text-gray-900 dark:text-white">${firstRecord.Date}</div>
                        </div>
                    </div>
                    
                    <!-- Production Records -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Production Records (${records.length})</h3>
                        <div class="space-y-4">
                            ${records.map((record, idx) => `
                                <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                    <div class="grid grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">作業者</label>
                                            <div class="font-medium text-gray-900 dark:text-white">${record.Worker_Name || '-'}</div>
                                        </div>
                                        <div>
                                            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">設備</label>
                                            <div class="font-medium text-gray-900 dark:text-white">${record.設備}</div>
                                        </div>
                                        <div>
                                            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Time</label>
                                            <div class="font-medium text-gray-900 dark:text-white">${record.Time_start} - ${record.Time_end}</div>
                                        </div>
                                    </div>
                                    
                                    <div class="grid grid-cols-4 gap-4 mb-4">
                                        <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                                            <label class="block text-xs text-blue-600 dark:text-blue-400 mb-1">数量</label>
                                            <div class="text-xl font-bold text-blue-700 dark:text-blue-300">${record.Process_Quantity}</div>
                                        </div>
                                        <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                                            <label class="block text-xs text-red-600 dark:text-red-400 mb-1">不良数</label>
                                            <div class="text-xl font-bold text-red-700 dark:text-red-300">${record.Total_NG}</div>
                                        </div>
                                        <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                                            <label class="block text-xs text-green-600 dark:text-green-400 mb-1">Total</label>
                                            <div class="text-xl font-bold text-green-700 dark:text-green-300">${record.Total}</div>
                                        </div>
                                        <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded">
                                            <label class="block text-xs text-purple-600 dark:text-purple-400 mb-1">Spare</label>
                                            <div class="text-xl font-bold text-purple-700 dark:text-purple-300">${record.Spare}</div>
                                        </div>
                                    </div>
                                    
                                    <div class="grid grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">材料ロット</label>
                                            <div class="text-sm text-gray-900 dark:text-white">${record.材料ロット || '-'}</div>
                                        </div>
                                        <div>
                                            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Cycle Time</label>
                                            <div class="text-sm text-gray-900 dark:text-white">${record.Cycle_Time || '-'}s</div>
                                        </div>
                                        <div>
                                            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">ショット数</label>
                                            <div class="text-sm text-gray-900 dark:text-white">${record.ショット数 || '-'}</div>
                                        </div>
                                    </div>
                                    
                                    <div class="grid grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">疵引不良</label>
                                            <div class="text-sm text-gray-900 dark:text-white">${record.疵引不良 || 0}</div>
                                        </div>
                                        <div>
                                            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">加工不良</label>
                                            <div class="text-sm text-gray-900 dark:text-white">${record.加工不良 || 0}</div>
                                        </div>
                                        <div>
                                            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">その他</label>
                                            <div class="text-sm text-gray-900 dark:text-white">${record.その他 || 0}</div>
                                        </div>
                                    </div>
                                    
                                    ${record.Comment ? `
                                        <div class="mb-4">
                                            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Comment</label>
                                            <div class="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50 p-2 rounded">${record.Comment}</div>
                                        </div>
                                    ` : ''}
                                    
                                    <!-- Images -->
                                    ${record.初物チェック画像 || record.終物チェック画像 || (record.materialLabelImages && record.materialLabelImages.length > 0) ? `
                                        <div class="mt-4">
                                            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-2">Images</label>
                                            <div class="grid grid-cols-3 gap-2">
                                                ${record.初物チェック画像 ? `
                                                    <div>
                                                        <p class="text-xs text-gray-500 mb-1">初物チェック</p>
                                                        <img src="${record.初物チェック画像}" class="w-full h-32 object-cover rounded" onclick="window.open('${record.初物チェック画像}', '_blank')">
                                                    </div>
                                                ` : ''}
                                                ${record.終物チェック画像 ? `
                                                    <div>
                                                        <p class="text-xs text-gray-500 mb-1">終物チェック</p>
                                                        <img src="${record.終物チェック画像}" class="w-full h-32 object-cover rounded" onclick="window.open('${record.終物チェック画像}', '_blank')">
                                                    </div>
                                                ` : ''}
                                                ${record.materialLabelImages && record.materialLabelImages.length > 0 ? record.materialLabelImages.slice(0, 1).map(img => `
                                                    <div>
                                                        <p class="text-xs text-gray-500 mb-1">材料ラベル</p>
                                                        <img src="${img}" class="w-full h-32 object-cover rounded" onclick="window.open('${img}', '_blank')">
                                                    </div>
                                                `).join('') : ''}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Summary -->
                    <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Summary</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm text-gray-600 dark:text-gray-400">Total Quantity</label>
                                <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">${totalQuantity} pcs</div>
                            </div>
                            <div>
                                <label class="block text-sm text-gray-600 dark:text-gray-400">Total NG</label>
                                <div class="text-2xl font-bold text-red-600 dark:text-red-400">${totalNG} pcs</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.closeActualProductionModal = function() {
    const modal = document.getElementById('actualProductionModal');
    if (modal) modal.remove();
};

// Toggle hide/show unavailable equipment
window.toggleHideUnavailableEquipment = function() {
    plannerState.hideUnavailableEquipment = !plannerState.hideUnavailableEquipment;
    renderTimelineView();
};

window.handleProductDragStart = handleProductDragStart;
window.handleProductDragEnd = handleProductDragEnd;
window.handleTimelineDragOver = handleTimelineDragOver;
window.handleTimelineDragLeave = handleTimelineDragLeave;
window.handleTimelineDrop = handleTimelineDrop;
window.closeTimelineClickModal = closeTimelineClickModal;
window.showActualProductionModal = showActualProductionModal;
window.closeActualProductionModal = closeActualProductionModal;
window.showAddBreakModal = showAddBreakModal;
window.closeAddBreakModal = closeAddBreakModal;
window.confirmAddBreak = confirmAddBreak;
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
window.openBulkEditGoalsModal = openBulkEditGoalsModal;
window.closeBulkEditGoalsModal = closeBulkEditGoalsModal;
window.updateGoalQuantityInTable = updateGoalQuantityInTable;
window.deleteGoalFromTable = deleteGoalFromTable;
window.addNewGoalFromTable = addNewGoalFromTable;
window.handleGoalBackNumberBlur = handleGoalBackNumberBlur;
window.handleGoalPartNumberBlur = handleGoalPartNumberBlur;
window.toggleEquipmentCard = toggleEquipmentCard;

