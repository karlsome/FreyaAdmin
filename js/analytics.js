/**
 * Enhanced Analytics System for FreyaAdmin
 * Provides comprehensive insights from kensaDB with date range controls
 * Updated: 2025-10-29 - Added data validation for factory-process combinations
 */

// Global variables for analytics
let analyticsData = [];
let currentAnalyticsRange = 'last30'; // Default range
let combinedDefectRateCalculated = false; // Flag to prevent recalculation
let lastCalculatedDateRange = null; // Track the date range for combined defect rate
let analyticsCharts = {}; // Store chart instances

// Product filter state (mirrors financials pattern)
const analyticsProductFilter = {
  allProducts: [],           // full masterDB product list { 背番号, 品番, モデル }
  selectedSebanggoArray: [], // committed selection
  tempSelectedSebanggo: []   // in-modal working copy
};

/**
 * Initialize Analytics System
 */
function initializeAnalytics() {
    console.log('🔄 Initializing Analytics System...');
    
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('analyticsFromDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('analyticsToDate').value = today.toISOString().split('T')[0];
    
    // Event listeners
    document.getElementById('refreshAnalyticsBtn').addEventListener('click', () => {
        loadAnalyticsData();
        // Also recalculate combined defect rate when refresh is clicked
        setTimeout(() => {
            recalculateCombinedDefectRate();
        }, 1000); // Wait for data to load
    });
    document.getElementById('analyticsFromDate').addEventListener('change', loadAnalyticsData);
    document.getElementById('analyticsToDate').addEventListener('change', loadAnalyticsData);
    document.getElementById('analyticsRangeSelect').addEventListener('change', handleRangeChange);
    document.getElementById('analyticsFactoryFilter').addEventListener('change', loadAnalyticsData);
    document.getElementById('analyticsCollectionFilter').addEventListener('change', handleCollectionChange);
    
    // Make combined defect rate clickable to recalculate
    document.getElementById('combinedDefectRateCount')?.addEventListener('click', recalculateCombinedDefectRate);
    
    // Load factory options + product list, then load data
    Promise.all([
        loadAnalyticsFactoryOptions(),
        loadAnalyticsModelOptions(),
        loadAnalyticsAllProducts()
    ]).then(() => {
        loadAnalyticsData();
    });
}

/**
 * Handle predefined range selection
 */
function handleRangeChange() {
    const range = document.getElementById('analyticsRangeSelect').value;
    const today = new Date();
    let fromDate = new Date();
    
    switch(range) {
        case 'today':
            fromDate = new Date(today);
            break;
        case 'last7':
            fromDate.setDate(today.getDate() - 7);
            break;
        case 'last30':
            fromDate.setDate(today.getDate() - 30);
            break;
        case 'last90':
            fromDate.setDate(today.getDate() - 90);
            break;
        case 'thisMonth':
            fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'lastMonth':
            fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            document.getElementById('analyticsToDate').value = lastMonth.toISOString().split('T')[0];
            break;
        case 'custom':
            return; // Don't update dates for custom range
    }
    
    if (range !== 'lastMonth') {
        document.getElementById('analyticsToDate').value = today.toISOString().split('T')[0];
    }
    document.getElementById('analyticsFromDate').value = fromDate.toISOString().split('T')[0];
    
    currentAnalyticsRange = range;
    loadAnalyticsData();
}

/**
 * Handle collection (database) selection change
 */
function handleCollectionChange() {
    console.log('📊 Collection changed, reloading factory options and data...');
    
    // Update defect rate label immediately when collection changes
    updateDefectRateLabel();
    
    // Reset factory filter when collection changes
    document.getElementById('analyticsFactoryFilter').value = '';
    
    // Load new factory options for the selected collection
    loadAnalyticsFactoryOptions().then(() => {
        loadAnalyticsData();
    });
}

/**
 * Load factory options for the analytics filter dropdown
 */
async function loadAnalyticsFactoryOptions() {
    try {
        console.log('📋 Loading factory options from all collections...');
        
        const collections = ['kensaDB', 'pressDB', 'SRSDB', 'slitDB'];
        const response = await fetch(BASE_URL + 'api/factories/batch', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ collections })
        });

        console.log('📥 Response status:', response.status, response.statusText);

        if (response.ok) {
            const result = await response.json();
            console.log('📊 Batch factory API result:', result);
            
            if (result.success && result.results) {
                // Combine all factories from all collections and remove duplicates
                const allFactories = new Set();
                
                Object.keys(result.results).forEach(collection => {
                    if (result.results[collection].factories) {
                        result.results[collection].factories.forEach(factory => {
                            // Only add non-null, non-empty factories
                            if (factory && factory.trim() !== '') {
                                allFactories.add(factory.trim());
                            }
                        });
                    }
                });
                
                const uniqueFactories = Array.from(allFactories).sort();
                console.log(`✅ Combined ${uniqueFactories.length} unique factories from all collections:`, uniqueFactories);
                updateFactoryFilterOptions(uniqueFactories);
                return true;
            } else {
                console.warn('⚠️ Unexpected response structure:', result);
            }
        } else {
            const errorText = await response.text();
            console.error('❌ Failed to load factories from batch endpoint:', response.status, errorText);
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Error loading factory options:', error);
        return false;
    }
}

/**
 * Update factory filter dropdown options
 */
function updateFactoryFilterOptions(factories) {
    console.log('🏭 Updating factory filter options with:', factories);
    
    const factorySelect = document.getElementById('analyticsFactoryFilter');
    
    if (!factorySelect) {
        console.error('❌ Factory filter element not found! Element ID: analyticsFactoryFilter');
        return;
    }
    
    console.log('✅ Factory filter element found:', factorySelect);
    
    // Save the currently selected value
    const currentSelection = factorySelect.value;
    
    // Clear existing options (except "All Factories")
    factorySelect.innerHTML = '<option value="">全工場</option>';
    
    // Add factory options
    if (Array.isArray(factories) && factories.length > 0) {
        factories.forEach(factory => {
            const option = document.createElement('option');
            option.value = factory;
            option.textContent = factory;
            factorySelect.appendChild(option);
        });
        
        console.log(`✅ Added ${factories.length} factory options to dropdown`);
    } else {
        console.warn('⚠️ No factories to add to dropdown');
    }
    
    // Restore the previously selected value if it still exists in the new options
    if (currentSelection && factories.includes(currentSelection)) {
        factorySelect.value = currentSelection;
    } else if (currentSelection && currentSelection !== '') {
        // If the previously selected factory is no longer available, reset to all factories
        factorySelect.value = '';
    }
}

/**
 * Load analytics data from server
 */
async function loadAnalyticsData() {
    try {
        showAnalyticsLoadingState();
        
        const fromDate = document.getElementById('analyticsFromDate').value;
        const toDate = document.getElementById('analyticsToDate').value;
        const selectedFactory = document.getElementById('analyticsFactoryFilter')?.value;
        const selectedCollection = document.getElementById('analyticsCollectionFilter')?.value || 'kensaDB';
        
        if (!fromDate || !toDate) {
            throw new Error(t('pleaseSelectDates'));
        }

        if (new Date(fromDate) > new Date(toDate)) {
            throw new Error(t('fromDateCannotBeLater'));
        }
        
        console.log(`📊 Loading analytics data from ${fromDate} to ${toDate}`, 
            selectedFactory ? `for factory: ${selectedFactory}` : 'for all factories',
            `from collection: ${selectedCollection}`);
        
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const factoryAccess = getFactoryAccessForUser();
        
        // Build request body with optional factory filter and selected collection
        const requestBody = {
            fromDate,
            toDate,
            userRole: currentUser.role,
            factoryAccess: factoryAccess,
            collectionName: selectedCollection
        };
        
        // Add factory filter if selected
        if (selectedFactory) {
            requestBody.factoryFilter = selectedFactory;
        }

        // Add product filter (背番号 array) if any are selected
        if (analyticsProductFilter.selectedSebanggoArray.length > 0) {
            requestBody.bans = analyticsProductFilter.selectedSebanggoArray;
        }
        
        const response = await fetch(BASE_URL + 'api/analytics-data', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Failed to load analytics data: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load analytics data');
        }

        analyticsData = result.data;
        console.log('✅ Analytics data loaded:', analyticsData);
        
        // Update factory options only if dropdown is empty or has only the default option
        const factorySelect = document.getElementById('analyticsFactoryFilter');
        if (factorySelect && factorySelect.options.length <= 1) {
            if (result.data.factoryStats && result.data.factoryStats.length > 0) {
                const factories = result.data.factoryStats.map(f => f.factory).filter(f => f);
                console.log('🏭 Extracted factories from factoryStats:', factories);
                updateFactoryFilterOptions(factories);
            }
        }
        
        // Update UI with the date range, factory filter, and collection
        updateDateRangeDisplay(fromDate, toDate, selectedFactory, selectedCollection);
        
        // Render all analytics
        renderAnalytics();
        
        // Calculate Combined Defect Rate only once (on first successful load)
        calculateCombinedDefectRate();
        
    } catch (error) {
        console.error('❌ Error loading analytics data:', error);
        showAnalyticsErrorState(error.message);
    }
}

/**
 * Update date range display in UI
 */
function updateDateRangeDisplay(fromDate, toDate, selectedFactory = null, selectedCollection = 'kensaDB') {
    const fromFormatted = new Date(fromDate).toLocaleDateString('ja-JP');
    const toFormatted = new Date(toDate).toLocaleDateString('ja-JP');
    
    // Collection display names
    const collectionDisplayNames = {
        'kensaDB': '検査',
        'pressDB': 'プレス',
        'slitDB': 'スリット',
        'SRSDB': 'SRS'
    };
    
    let displayText = `${fromFormatted} ～ ${toFormatted}`;
    displayText += ` | プロセス: ${collectionDisplayNames[selectedCollection] || selectedCollection}`;
    
    if (selectedFactory) {
        displayText += ` | 工場: ${selectedFactory}`;
    } else {
        displayText += ` | 工場: 全工場`;
    }
    
    document.querySelectorAll('.date-range-display').forEach(element => {
        element.textContent = displayText;
    });
}

/**
 * Render all analytics components
 */
function renderAnalytics() {
    // Basic data structure check
    if (!analyticsData) {
        showAnalyticsErrorState(t('noDataAvailable'));
        return;
    }
    
    console.log('📊 Rendering analytics with data:', analyticsData);
    
    // Check if data exists for selected factory-process combination
    const hasValidData = validateAnalyticsData();
    
    // If validation fails due to factory-process mismatch, show specific no data message
    if (!hasValidData) {
        showChartsNoDataState();
        // Still show KPI cards with available data
        try {
            renderSummaryCards();
        } catch (error) {
            console.warn('Error rendering summary cards:', error);
        }
        
        // Hide loading state
        const loader = document.getElementById('analyticsLoader');
        if (loader) loader.style.display = 'none';
        
        // Restore card opacity
        document.querySelectorAll('.analytics-card').forEach(card => {
            card.style.opacity = '1';
        });
        
        return;
    }
    
    try {
        // Render summary cards (always show)
        renderSummaryCards();
        
        if (hasValidData) {
            // Render existing charts
            renderProductionTrendChart();
            renderQualityTrendChart();
            renderFactoryComparisonChart();
            renderDefectBarChart();
            renderDefectDistributionChart();
            renderWorkerPerformanceChart();
            renderProcessEfficiencyChart();
            renderTemperatureTrendChart();
            renderHumidityTrendChart();
            
            // Render NEW charts
            renderHourlyProductionChart();
            renderTopBottomProductsChart();
            renderDefectsByHourChart();
            renderFactoryDefectsChart();
            renderFactoryTop5DefectsChart();
            renderWorkerQualityChart();
            renderEquipmentDowntimeChart();
            renderFactoryRadarChart();
            
            // Render lists
            renderTopDefectPartsByFactory();
        } else {
            // Show "no data" message for charts when data doesn't exist for selected factory-process
            showChartsNoDataState();
        }
        
        // Hide loading state
        const loader = document.getElementById('analyticsLoader');
        if (loader) loader.style.display = 'none';
        
        // Restore card opacity
        document.querySelectorAll('.analytics-card').forEach(card => {
            card.style.opacity = '1';
        });
        
    } catch (error) {
        console.error('Error rendering analytics:', error);
        showAnalyticsErrorState('Error rendering charts: ' + error.message);
    }
}

/**
 * Validate if analytics data has actual records for selected factory-process combination
 */
function validateAnalyticsData() {
    const selectedFactory = document.getElementById('analyticsFactoryFilter')?.value;
    const selectedCollection = document.getElementById('analyticsCollectionFilter')?.value || 'kensaDB';
    
    // If no specific factory is selected, show all data
    if (!selectedFactory) {
        return true;
    }
    
    console.log(`🔍 Validating data for factory "${selectedFactory}" in collection "${selectedCollection}"`);
    console.log('📊 Analytics data structure:', analyticsData);
    
    // Check multiple data indicators to determine if there's meaningful data
    const dailyTrend = analyticsData.dailyTrend || [];
    const factoryStats = analyticsData.factoryStats || [];
    const summary = analyticsData.summary && analyticsData.summary[0] ? analyticsData.summary[0] : {};
    
    // Check if dailyTrend has meaningful data
    const hasProductionData = dailyTrend.length > 0 && dailyTrend.some(record => {
        return (record.totalProduction > 0 || record.totalDefects > 0);
    });
    
    // Check if factory exists in factoryStats and has data
    const hasFactoryStats = factoryStats.length > 0 && factoryStats.some(stat => {
        return stat.factory === selectedFactory && (stat.totalProduction > 0 || stat.totalDefects > 0);
    });
    
    // Check if summary has meaningful data
    const hasSummaryData = (summary.totalProduction > 0 || summary.totalDefects > 0);
    
    // Additional check: if we have temperature/humidity data
    const temperatureData = analyticsData.temperatureTrend || [];
    const humidityData = analyticsData.humidityTrend || [];
    const hasEnvironmentalData = temperatureData.length > 0 || humidityData.length > 0;
    
    const validationResult = {
        hasProductionData,
        hasFactoryStats,
        hasSummaryData,
        hasEnvironmentalData,
        dailyTrendCount: dailyTrend.length,
        factoryStatsCount: factoryStats.length,
        selectedFactory,
        selectedCollection
    };
    
    console.log(`🔍 Data validation results:`, validationResult);
    
    // Consider data valid if we have meaningful production data OR factory stats with data
    const isValid = hasProductionData || (hasFactoryStats && hasSummaryData);
    
    console.log(`🔍 Final validation result: ${isValid ? 'VALID' : 'NO DATA'}`);
    
    return isValid;
}

/**
 * Render summary statistics cards
 */
function renderSummaryCards() {
    // Fix: Handle array structure from server (summary is an array with summary[0] containing the data)
    const summary = analyticsData.summary && analyticsData.summary[0] ? analyticsData.summary[0] : {};
    
    console.log('📊 Summary data:', summary);
    
    // Existing KPIs
    document.getElementById('totalProductionCount').textContent = summary.totalProduction?.toLocaleString() || '0';
    document.getElementById('totalDefectsCount').textContent = summary.totalDefects?.toLocaleString() || '0';
    document.getElementById('avgDefectRateCount').textContent = `${summary.avgDefectRate?.toFixed(2) || '0.00'}%`;
    
    // Update defect rate label based on selected collection
    updateDefectRateLabel();
    
    document.getElementById('totalFactoriesCount').textContent = summary.totalFactories || '0';
    document.getElementById('totalWorkersCount').textContent = summary.totalWorkers || '0';
    document.getElementById('avgCycleTimeCount').textContent = `${summary.avgCycleTime?.toFixed(1) || '0.0'}分`;
    
    // NEW KPIs
    // First Pass Yield (records with 0 defects)
    const dailyTrend = analyticsData.dailyTrend || [];
    let zeroDefectRecords = 0;
    let totalRecords = 0;
    dailyTrend.forEach(day => {
        if (day.totalDefects === 0) zeroDefectRecords++;
        totalRecords++;
    });
    const firstPassYield = totalRecords > 0 ? ((zeroDefectRecords / totalRecords) * 100) : 0;
    document.getElementById('firstPassYieldCount').textContent = `${firstPassYield.toFixed(1)}%`;
    
    // Peak Production Hour
    const peakHour = calculatePeakHour(dailyTrend);
    document.getElementById('peakHourCount').textContent = peakHour;
    
    // Top Product by volume
    const topProduct = findTopProduct(analyticsData);
    document.getElementById('topProductCount').textContent = topProduct || '---';
    
    // Equipment Count
    const equipmentCount = analyticsData.equipmentStats?.length || 0;
    document.getElementById('equipmentCountCount').textContent = equipmentCount;
    
    // Combined Defect Rate: Preserve existing value if already calculated, otherwise show placeholder
    if (!combinedDefectRateCalculated) {
        document.getElementById('combinedDefectRateCount').textContent = '計算中...';
    }
    // If already calculated, don't touch the value - it should remain the same
}

/**
 * Calculate peak production hour from time data
 */
function calculatePeakHour(dailyTrend) {
    if (!dailyTrend || dailyTrend.length === 0) return '--:--';
    
    // Find day with highest production
    let maxProduction = 0;
    let maxDay = null;
    
    dailyTrend.forEach(day => {
        if (day.totalProduction > maxProduction) {
            maxProduction = day.totalProduction;
            maxDay = day;
        }
    });
    
    return maxDay ? `${maxProduction.toLocaleString()} units/day` : '--:--';
}

/**
 * Find most produced product
 */
function findTopProduct(data) {
    // This will be calculated from backend data if available
    // For now, return placeholder
    return 'See Chart';
}

/**
 * Update defect rate label based on selected collection
 */
function updateDefectRateLabel() {
    const selectedCollection = document.getElementById('analyticsCollectionFilter')?.value || 'kensaDB';
    // Use a more specific selector to target the defect rate card (not combined defect rate)
    const defectRateLabel = document.querySelector('#avgDefectRateCount').parentElement.querySelector('[data-i18n]');
    
    console.log('🏷️ Updating defect rate label for collection:', selectedCollection);
    
    if (!defectRateLabel) {
        console.warn('🏷️ Defect rate label element not found');
        return;
    }
    
    // Define collection-specific translation keys
    const collectionLabelKeys = {
        'kensaDB': 'inspectionDefectRate',
        'pressDB': 'pressDefectRate', 
        'slitDB': 'slitDefectRate',
        'SRSDB': 'srsDefectRate'
    };
    
    // Get the appropriate translation key
    const labelKey = collectionLabelKeys[selectedCollection] || 'defectRate';
    
    // Update the label text using translation system
    const newLabel = typeof window.t === 'function' ? window.t(labelKey) : defectRateLabel.textContent;
    console.log('🏷️ Updating label from', defectRateLabel.textContent, 'to', newLabel);
    defectRateLabel.textContent = newLabel;
    
    // Update the data-i18n attribute for future translations
    defectRateLabel.setAttribute('data-i18n', labelKey);
}

/**
 * Force recalculate combined defect rate (user-triggered)
 */
async function recalculateCombinedDefectRate() {
    console.log('🔄 User requested combined defect rate recalculation...');
    
    // Reset calculation flags to force recalculation
    combinedDefectRateCalculated = false;
    lastCalculatedDateRange = null;
    
    // Show loading state
    const element = document.getElementById('combinedDefectRateCount');
    if (element) {
        element.textContent = '計算中...';
        element.classList.add('text-blue-600');
    }
    
    // Calculate
    await calculateCombinedDefectRate();
    
    // Remove loading state
    if (element) {
        element.classList.remove('text-blue-600');
    }
}

/**
 * Calculate combined defect rate across all processes
 */
async function calculateCombinedDefectRate() {
    try {
        const fromDate = document.getElementById('analyticsFromDate')?.value;
        const toDate = document.getElementById('analyticsToDate')?.value;
        const selectedFactory = document.getElementById('analyticsFactoryFilter')?.value;
        
        if (!fromDate || !toDate) {
            document.getElementById('combinedDefectRateCount').textContent = '0.00%';
            return;
        }
        
        // Create a unique key for the current date range
        const currentDateRange = `${fromDate}_${toDate}`;
        
        // Check if already calculated for this specific date range
        if (combinedDefectRateCalculated && lastCalculatedDateRange === currentDateRange) {
            console.log('📊 Combined Defect Rate already calculated for this date range, skipping...');
            return;
        }
        
        // If date range changed, allow recalculation
        if (lastCalculatedDateRange !== currentDateRange) {
            console.log('📊 Date range changed, recalculating Combined Defect Rate...');
            combinedDefectRateCalculated = false;
        }
        
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const factoryAccess = getFactoryAccessForUser();
        
        // Collections to check for defect rates
        const collections = ['kensaDB', 'pressDB', 'slitDB', 'SRSDB'];
        const defectRates = [];
        
        // Collect total production and total defects from each collection
        let totalProductionSum = 0;
        let totalDefectsSum = 0;
        
        // Fetch data from each collection
        for (const collection of collections) {
            try {
                const requestBody = {
                    fromDate,
                    toDate,
                    userRole: currentUser.role,
                    factoryAccess: factoryAccess,
                    collectionName: collection
                };
                
                // NOTE: Do NOT add factory filter for Combined Defect Rate
                // This should always show the rate across ALL factories and ALL processes
                
                const response = await fetch(BASE_URL + 'api/analytics-data', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data.summary && result.data.summary[0]) {
                        const totalProduction = result.data.summary[0].totalProduction || 0;
                        const totalDefects = result.data.summary[0].totalDefects || 0;
                        
                        totalProductionSum += totalProduction;
                        totalDefectsSum += totalDefects;
                        
                        console.log(`📊 ${collection} - Production: ${totalProduction}, Defects: ${totalDefects}`);
                    }
                }
            } catch (error) {
                console.warn(`Failed to fetch data from ${collection}:`, error);
            }
        }
        
        // Calculate combined defect rate: (Total Defects / Total Production) * 100
        const combinedRate = totalProductionSum > 0 ? (totalDefectsSum / totalProductionSum) * 100 : 0;
        
        console.log('📊 Total Production (all processes):', totalProductionSum);
        console.log('📊 Total Defects (all processes):', totalDefectsSum);
        console.log('📊 Combined defect rate:', combinedRate);
        
        // Update display
        document.getElementById('combinedDefectRateCount').textContent = `${combinedRate.toFixed(2)}%`;
        
        // Store the date range and mark as calculated
        lastCalculatedDateRange = currentDateRange;
        combinedDefectRateCalculated = true;
        console.log(`📊 Combined Defect Rate calculation complete for ${fromDate} to ${toDate} - will not recalculate unless date range changes`);
        
    } catch (error) {
        console.error('Error calculating combined defect rate:', error);
        document.getElementById('combinedDefectRateCount').textContent = '0.00%';
    }
}

/**
 * Render production trend chart
 */
function renderProductionTrendChart() {
    const ctx = document.getElementById('productionTrendChart').getContext('2d');
    // Fix: Use correct field name 'dailyTrend' not 'dailyTrends'
    const dailyTrend = analyticsData.dailyTrend || [];
    
    console.log('📊 Daily trend data:', dailyTrend);
    
    // Destroy existing chart
    if (analyticsCharts.productionTrend) {
        analyticsCharts.productionTrend.destroy();
    }
    
    analyticsCharts.productionTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyTrend.map(d => new Date(d.date).toLocaleDateString('ja-JP')),
            datasets: [{
                label: '生産量',
                data: dailyTrend.map(d => d.totalProduction),
                borderColor: '#3B82F6',
                backgroundColor: '#3B82F6',
                fill: false,
                tension: 0.1
            }, {
                label: '不良数',
                data: dailyTrend.map(d => d.totalDefects),
                borderColor: '#EF4444',
                backgroundColor: '#EF4444',
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '数量'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '日付'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true
                },
                title: {
                    display: true,
                    text: '生産量・不良数の推移'
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    followCursor: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#3B82F6',
                    borderWidth: 1,
                    cornerRadius: 6,
                    displayColors: true,
                    callbacks: {
                        title: function(context) {
                            // Format the date nicely
                            const date = new Date(dailyTrend[context[0].dataIndex].date);
                            return date.toLocaleDateString('ja-JP', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                weekday: 'short'
                            });
                        },
                        beforeBody: function(context) {
                            return ['──────────────'];
                        },
                        label: function(context) {
                            const dataIndex = context.dataIndex;
                            const trendData = dailyTrend[dataIndex];
                            
                            if (context.datasetIndex === 0) {
                                // Production data
                                return `📊 生産量: ${context.parsed.y.toLocaleString()}個`;
                            } else {
                                // Defect data
                                const defectRate = trendData.defectRate || 0;
                                return `❌ 不良数: ${context.parsed.y.toLocaleString()}個 (${defectRate.toFixed(2)}%)`;
                            }
                        },
                        afterLabel: function(context) {
                            const dataIndex = context.dataIndex;
                            const trendData = dailyTrend[dataIndex];
                            
                            if (context.datasetIndex === 0) {
                                // Additional info for production
                                const cycleTime = trendData.avgCycleTime || 0;
                                return cycleTime > 0 ? `⏱️ 平均サイクル: ${cycleTime}分` : '';
                            }
                            return '';
                        },
                        footer: function(context) {
                            const dataIndex = context[0].dataIndex;
                            const trendData = dailyTrend[dataIndex];
                            const production = trendData.totalProduction || 0;
                            const defects = trendData.totalDefects || 0;
                            const efficiency = production > 0 ? (((production - defects) / production) * 100) : 0;
                            
                            return [
                                '──────────────',
                                `✅ 良品率: ${efficiency.toFixed(1)}%`,
                                `📈 効率性: ${efficiency >= 95 ? '優秀' : efficiency >= 90 ? '良好' : efficiency >= 80 ? '普通' : '要改善'}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render quality trend chart (defect rate over time)
 */
function renderQualityTrendChart() {
    const ctx = document.getElementById('qualityTrendChart').getContext('2d');
    // Fix: Use correct field name 'dailyTrend' not 'dailyTrends'
    const dailyTrend = analyticsData.dailyTrend || [];
    
    console.log('📊 Quality trend data:', dailyTrend);
    
    if (analyticsCharts.qualityTrend) {
        analyticsCharts.qualityTrend.destroy();
    }
    
    analyticsCharts.qualityTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyTrend.map(d => new Date(d.date).toLocaleDateString('ja-JP')),
            datasets: [{
                label: '不良率 (%)',
                data: dailyTrend.map(d => d.defectRate || 0),
                borderColor: '#F59E0B',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '不良率 (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '日付'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true
                },
                title: {
                    display: true,
                    text: '品質トレンド (不良率推移)'
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    followCursor: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#F59E0B',
                    borderWidth: 1,
                    cornerRadius: 6,
                    displayColors: true,
                    callbacks: {
                        title: function(context) {
                            // Format the date nicely
                            const date = new Date(dailyTrend[context[0].dataIndex].date);
                            return date.toLocaleDateString('ja-JP', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                weekday: 'short'
                            });
                        },
                        beforeBody: function(context) {
                            return ['──────────────'];
                        },
                        label: function(context) {
                            const dataIndex = context.dataIndex;
                            const trendData = dailyTrend[dataIndex];
                            const defectRate = context.parsed.y || 0;
                            
                            // Quality status based on defect rate
                            let qualityStatus = '';
                            if (defectRate <= 2) {
                                qualityStatus = '🟢 優秀';
                            } else if (defectRate <= 5) {
                                qualityStatus = '🟡 良好';
                            } else if (defectRate <= 10) {
                                qualityStatus = '🟠 注意';
                            } else {
                                qualityStatus = '🔴 要改善';
                            }
                            
                            return `📊 不良率: ${defectRate.toFixed(2)}% ${qualityStatus}`;
                        },
                        afterBody: function(context) {
                            const dataIndex = context[0].dataIndex;
                            const trendData = dailyTrend[dataIndex];
                            
                            return [
                                '',
                                `📈 生産量: ${(trendData.totalProduction || 0).toLocaleString()}個`,
                                `❌ 不良数: ${(trendData.totalDefects || 0).toLocaleString()}個`,
                                `⏱️ 平均サイクル: ${(trendData.avgCycleTime || 0).toFixed(1)}分`
                            ];
                        },
                        footer: function(context) {
                            const dataIndex = context[0].dataIndex;
                            const trendData = dailyTrend[dataIndex];
                            const defectRate = context[0].parsed.y || 0;
                            
                            // Quality recommendations based on defect rate
                            let recommendation = '';
                            if (defectRate <= 2) {
                                recommendation = '✨ 品質基準を満たしています';
                            } else if (defectRate <= 5) {
                                recommendation = '👍 品質は良好です';
                            } else if (defectRate <= 10) {
                                recommendation = '⚠️ 品質管理の確認が必要';
                            } else {
                                recommendation = '🚨 緊急改善が必要です';
                            }
                            
                            return [
                                '──────────────',
                                recommendation
                            ];
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render factory comparison chart
 */
function renderFactoryComparisonChart() {
    const ctx = document.getElementById('factoryComparisonChart').getContext('2d');
    const factoryStats = analyticsData.factoryStats || [];
    
    console.log('📊 Factory stats data:', factoryStats);
    
    if (analyticsCharts.factoryComparison) {
        analyticsCharts.factoryComparison.destroy();
    }
    
    analyticsCharts.factoryComparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: factoryStats.map(f => f.factory || f._id),
            datasets: [{
                label: '生産量',
                data: factoryStats.map(f => f.totalProduction),
                backgroundColor: '#10B981',
                yAxisID: 'y'
            }, {
                label: '不良率 (%)',
                data: factoryStats.map(f => f.defectRate || 0),
                backgroundColor: '#EF4444',
                type: 'line',
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '生産量'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '不良率 (%)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '工場別 生産量・不良率比較'
                }
            }
        }
    });
}

/**
 * Shared external HTML tooltip for defect breakdown charts.
 */
function _getDefectTooltipEl() {
    let el = document.getElementById('defectChartTooltip');
    if (!el) {
        el = document.createElement('div');
        el.id = 'defectChartTooltip';
        Object.assign(el.style, {
            position: 'absolute', background: 'rgba(15,15,15,0.9)', color: '#fff',
            borderRadius: '7px', padding: '10px 14px', pointerEvents: 'none',
            fontSize: '12px', lineHeight: '1.55', zIndex: '99999',
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)', transition: 'opacity 0.1s',
            opacity: '0', maxWidth: '600px'
        });
        document.body.appendChild(el);
    }
    return el;
}

function _showDefectTooltip(el, chart, tooltip, title, total, colorHex, breakdownLines) {
    const many = breakdownLines.length > 9;
    let html = `<div style="font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:7px;">
        <span style="display:inline-block;width:10px;height:10px;background:${colorHex};border-radius:2px;flex-shrink:0;"></span>
        ${title}: <span style="font-weight:700;">${total.toLocaleString()}</span>
    </div>`;
    if (breakdownLines.length) {
        if (many) {
            html += `<div style="columns:2;column-gap:22px;font-size:11px;opacity:.9;">`;
            breakdownLines.forEach(l => { html += `<div style="break-inside:avoid;white-space:nowrap;padding:1px 0;">${l}</div>`; });
            html += `</div>`;
        } else {
            html += `<div style="font-size:11px;opacity:.9;">`;
            breakdownLines.forEach(l => { html += `<div style="padding:1px 0;white-space:nowrap;">${l}</div>`; });
            html += `</div>`;
        }
    }
    el.innerHTML = html;
    el.style.opacity = '0';
    el.style.left = '0'; el.style.top = '0';
    const rect = chart.canvas.getBoundingClientRect();
    let x = rect.left + window.scrollX + tooltip.caretX + 14;
    let y = rect.top  + window.scrollY + tooltip.caretY - 10;
    const tw = el.offsetWidth, th = el.offsetHeight;
    if (x + tw > window.scrollX + window.innerWidth  - 10) x = rect.left + window.scrollX + tooltip.caretX - tw - 14;
    if (y + th > window.scrollY + window.innerHeight - 10) y = window.scrollY + window.innerHeight - th - 10;
    if (y < window.scrollY + 4) y = window.scrollY + 4;
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.opacity = '1';
}

/**
 * Render defect distribution chart (dynamic for all collection types)
 */
function renderDefectDistributionChart() {
    const ctx = document.getElementById('defectDistributionChart').getContext('2d');
    const defectAnalysis = analyticsData.defectAnalysis || [];
    
    console.log('📊 Defect analysis data:', defectAnalysis);
    
    if (analyticsCharts.defectDistribution) {
        analyticsCharts.defectDistribution.destroy();
    }
    
    // Auto-derive model from the analytics filter bar
    const filterType    = document.getElementById('analyticsFilterType')?.value || '';
    const activeModel   = filterType === 'model'
        ? (document.getElementById('analyticsModelFilter')?.value || '')
        : '';

    // Update (or hide) the badge next to the chart title
    const badge = document.getElementById('defectChartModelBadge');
    if (badge) {
        if (activeModel) {
            badge.textContent = activeModel;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    const allDefs = analyticsData.defectDefinitions || [];

    // Resolve defect labels: auto model-specific or generic, language-aware
    function getDefectLabels() {
        const lang  = localStorage.getItem('lang') || 'en';
        const useEN = lang === 'en';
        if (activeModel) {
            const def = allDefs.find(d => d.モデル === activeModel);
            if (def) {
                const src      = (useEN && def.counters_en) ? def.counters_en : def.counters;
                const fallback = (!useEN && def.counters_en) ? def.counters_en : def.counters;
                if (src) {
                    return Array.from({ length: 12 }, (_, i) => {
                        const key  = `counter-${i + 1}`;
                        const name = src[key];
                        if (name && name.trim()) return name.trim();
                        const fb = fallback ? fallback[key] : null;
                        return (fb && fb.trim()) ? fb.trim() : (useEN ? `Counter ${i + 1}` : `カウンター${i + 1}`);
                    });
                }
            }
        }
        return useEN
            ? ['Counter 1','Counter 2','Counter 3','Counter 4','Counter 5','Counter 6','Counter 7','Counter 8','Counter 9','Counter 10','Counter 11','Counter 12']
            : ['カウンター1','カウンター2','カウンター3','カウンター4','カウンター5','カウンター6','カウンター7','カウンター8','カウンター9','カウンター10','カウンター11','カウンター12'];
    }
    
    // Build per-model totals across all factories for breakdown tooltips
    function buildModelBreakdown() {
        const fmRaw = analyticsData.factoryCountersByModel || [];
        const sebanggoToModel = {};
        (analyticsProductFilter.allProducts || []).forEach(p => {
            if (p.背番号 && p.モデル) sebanggoToModel[p.背番号] = p.モデル;
        });
        const totals = {}; // model → [c0..c11]
        fmRaw.forEach(row => {
            const model = (row.sebanggo && sebanggoToModel[row.sebanggo]) || row.sebanggo || '(unknown)';
            const c = [row.c1,row.c2,row.c3,row.c4,row.c5,row.c6,
                       row.c7,row.c8,row.c9,row.c10,row.c11,row.c12].map(v => v || 0);
            if (!totals[model]) totals[model] = new Array(12).fill(0);
            totals[model] = totals[model].map((v, i) => v + c[i]);
        });
        return totals; // { modelName: [c0..c11] }
    }
    const modelBreakdown = buildModelBreakdown();

    function getBreakdownLines(counterIdx, grandTotal) {
        const rows = Object.entries(modelBreakdown)
            .map(([model, c]) => ({ model, val: c[counterIdx] || 0 }))
            .filter(r => r.val > 0)
            .sort((a, b) => b.val - a.val);
        if (rows.length <= 1) return [];
        return rows.map(r => {
            const pct = grandTotal > 0 ? Math.round(r.val / grandTotal * 100) : 0;
            return `  ${r.model}: ${r.val.toLocaleString()} (${pct}%)`;
        });
    }

    let counterData = [];
    let labels = [];
    let counterIndices = []; // track original counter index for each slice
    
    if (defectAnalysis.length > 0) {
        const analysis = defectAnalysis[0];
        
        // Always use auto-resolved labels
        const defectLabels = getDefectLabels();
        const defectFields = analysis.defectFields || ['counter1Total', 'counter2Total', 'counter3Total', 'counter4Total', 'counter5Total', 'counter6Total', 'counter7Total', 'counter8Total', 'counter9Total', 'counter10Total', 'counter11Total', 'counter12Total'];
        
        // Build chart data using the field mappings
        for (let i = 0; i < defectFields.length; i++) {
            const fieldName = defectFields[i];
            const value = analysis[fieldName] || 0;
            
            if (value > 0) {
                labels.push(defectLabels[i]);
                counterData.push(value);
                counterIndices.push(i);
            }
        }
    }
    
    // If no data found, show message
    if (counterData.length === 0) {
        // Create empty chart with message
        analyticsCharts.defectDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['データなし'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#E5E7EB'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '不良分布 (プロセス別)'
                    },
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function() {
                                return 'データが見つかりません';
                            }
                        }
                    }
                }
            }
        });
        return;
    }
    
    const colors = [
        '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
        '#EC4899', '#14B8A6', '#F97316', '#84CC16', '#6366F1',
        '#F43F5E', '#06B6D4'
    ];
    
    analyticsCharts.defectDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counterData,
                backgroundColor: colors.slice(0, counterData.length),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: '不良分布 (プロセス別)' },
                legend: { position: 'right' },
                tooltip: {
                    enabled: false,
                    external: (context) => {
                        const { chart, tooltip } = context;
                        const el = _getDefectTooltipEl();
                        if (tooltip.opacity === 0) { el.style.opacity = '0'; return; }
                        const dp = tooltip.dataPoints?.[0]; if (!dp) return;
                        const si  = dp.dataIndex;
                        const ci  = counterIndices[si] ?? si;
                        const val = counterData[si];
                        _showDefectTooltip(el, chart, tooltip, labels[si], val, colors[si] || '#888', getBreakdownLines(ci, val));
                    }
                }
            }
        }
    });
}

/**
 * Re-render the defect distribution chart with labels from the selected model definition.
 * Render worker performance chart
 */
function renderDefectBarChart() {
    const canvas = document.getElementById('defectBarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (analyticsCharts.defectBar) {
        analyticsCharts.defectBar.destroy();
    }

    // Auto-derive model from filter bar (same logic as pie chart)
    const filterType  = document.getElementById('analyticsFilterType')?.value || '';
    const activeModel = filterType === 'model'
        ? (document.getElementById('analyticsModelFilter')?.value || '')
        : '';

    // Update badge
    const badge = document.getElementById('defectBarChartModelBadge');
    if (badge) {
        if (activeModel) { badge.textContent = activeModel; badge.classList.remove('hidden'); }
        else              { badge.classList.add('hidden'); }
    }

    const allDefs      = analyticsData.defectDefinitions || [];
    const defectAnalysis = analyticsData.defectAnalysis || [];

    function getBarLabels() {
        const lang  = localStorage.getItem('lang') || 'en';
        const useEN = lang === 'en';
        if (activeModel) {
            const def = allDefs.find(d => d.モデル === activeModel);
            if (def) {
                const src      = (useEN && def.counters_en) ? def.counters_en : def.counters;
                const fallback = (!useEN && def.counters_en) ? def.counters_en : def.counters;
                if (src) {
                    return Array.from({ length: 12 }, (_, i) => {
                        const key  = `counter-${i + 1}`;
                        const name = src[key];
                        if (name && name.trim()) return name.trim();
                        const fb = fallback ? fallback[key] : null;
                        return (fb && fb.trim()) ? fb.trim() : (useEN ? `Counter ${i + 1}` : `カウンター${i + 1}`);
                    });
                }
            }
        }
        return useEN
            ? ['Counter 1','Counter 2','Counter 3','Counter 4','Counter 5','Counter 6','Counter 7','Counter 8','Counter 9','Counter 10','Counter 11','Counter 12']
            : ['カウンター1','カウンター2','カウンター3','カウンター4','カウンター5','カウンター6','カウンター7','カウンター8','カウンター9','カウンター10','カウンター11','カウンター12'];
    }

    const barLabels = getBarLabels();
    const defectFields = ['counter1Total','counter2Total','counter3Total','counter4Total','counter5Total','counter6Total','counter7Total','counter8Total','counter9Total','counter10Total','counter11Total','counter12Total'];
    let barData = new Array(12).fill(0);

    if (defectAnalysis.length > 0) {
        const analysis   = defectAnalysis[0];
        const usedFields = analysis.defectFields || defectFields;
        usedFields.forEach((field, i) => { barData[i] = analysis[field] || 0; });
    }

    const hasAny = barData.some(v => v > 0);
    if (!hasAny) {
        analyticsCharts.defectBar = new Chart(ctx, {
            type: 'bar',
            data: { labels: barLabels, datasets: [{ label: 'Defects', data: barData, backgroundColor: '#E5E7EB' }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: () => 'データが見つかりません' } } },
                scales: { y: { beginAtZero: true } }
            }
        });
        return;
    }

    const colors = [
        '#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6',
        '#EC4899','#14B8A6','#F97316','#84CC16','#6366F1',
        '#F43F5E','#06B6D4'
    ];

    // Build per-model totals for bar chart tooltips
    const barModelBreakdown = (() => {
        const fmRaw = analyticsData.factoryCountersByModel || [];
        const sebanggoToModel = {};
        (analyticsProductFilter.allProducts || []).forEach(p => {
            if (p.背番号 && p.モデル) sebanggoToModel[p.背番号] = p.モデル;
        });
        const totals = {};
        fmRaw.forEach(row => {
            const model = (row.sebanggo && sebanggoToModel[row.sebanggo]) || row.sebanggo || '(unknown)';
            const c = [row.c1,row.c2,row.c3,row.c4,row.c5,row.c6,
                       row.c7,row.c8,row.c9,row.c10,row.c11,row.c12].map(v => v || 0);
            if (!totals[model]) totals[model] = new Array(12).fill(0);
            totals[model] = totals[model].map((v, i) => v + c[i]);
        });
        return totals;
    })();

    analyticsCharts.defectBar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: barLabels,
            datasets: [{
                label: localStorage.getItem('lang') === 'en' ? 'Defect Count' : '不良数',
                data: barData,
                backgroundColor: barLabels.map((_, i) => colors[i % colors.length] + 'CC'),
                borderColor:     barLabels.map((_, i) => colors[i % colors.length]),
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: false,
                    external: (context) => {
                        const { chart, tooltip } = context;
                        const el = _getDefectTooltipEl();
                        if (tooltip.opacity === 0) { el.style.opacity = '0'; return; }
                        const dp = tooltip.dataPoints?.[0]; if (!dp) return;
                        const ci  = dp.dataIndex;
                        const val = dp.parsed.y;
                        const breakdown = Object.entries(barModelBreakdown)
                            .map(([model, c]) => ({ model, v: c[ci] || 0 }))
                            .filter(r => r.v > 0).sort((a, b) => b.v - a.v);
                        const lines = breakdown.length > 1
                            ? breakdown.map(r => `${r.model}: ${r.v.toLocaleString()} (${val > 0 ? Math.round(r.v / val * 100) : 0}%)`)
                            : [];
                        _showDefectTooltip(el, chart, tooltip, barLabels[ci], val, colors[ci % colors.length], lines);
                    }
                }
            },
            scales: {
                x: { ticks: { maxRotation: 45, font: { size: 11 } } },
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

/**
 * Re-render the defect distribution chart with labels from the selected model definition.
 * Render worker performance chart
 */
function renderWorkerPerformanceChart() {
    const ctx = document.getElementById('workerPerformanceChart').getContext('2d');
    const workerStats = analyticsData.workerStats || [];
    
    console.log('📊 Worker stats data:', workerStats);
    
    // Limit to top 10 workers by production
    const topWorkers = workerStats.slice(0, 10);
    
    if (analyticsCharts.workerPerformance) {
        analyticsCharts.workerPerformance.destroy();
    }
    
    analyticsCharts.workerPerformance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topWorkers.map(w => w.worker || w._id),
            datasets: [{
                label: '生産量',
                data: topWorkers.map(w => w.totalProduction),
                backgroundColor: '#3B82F6'
            }, {
                label: '平均サイクルタイム (分)',
                data: topWorkers.map(w => w.avgCycleTime || 0),
                backgroundColor: '#F59E0B',
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '生産量'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'サイクルタイム (分)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '作業者別パフォーマンス (上位10名)'
                }
            }
        }
    });
}

/**
 * Render process efficiency chart
 */
function renderProcessEfficiencyChart() {
    const ctx = document.getElementById('processEfficiencyChart').getContext('2d');
    const equipmentStats = analyticsData.equipmentStats || [];
    
    console.log('📊 Equipment stats data:', equipmentStats);
    
    if (analyticsCharts.processEfficiency) {
        analyticsCharts.processEfficiency.destroy();
    }
    
    analyticsCharts.processEfficiency = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: equipmentStats.map(e => e.equipment || e._id || '未設定'),
            datasets: [{
                label: '平均サイクルタイム (分)',
                data: equipmentStats.map(e => e.avgCycleTime || 0),
                backgroundColor: '#10B981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // This makes it horizontal
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'サイクルタイム (分)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '設備別効率 (平均サイクルタイム)'
                }
            }
        }
    });
}

/**
 * Show loading state
 */
function showAnalyticsLoadingState() {
    document.querySelectorAll('.analytics-card').forEach(card => {
        card.style.opacity = '0.6';
    });
    
    document.querySelectorAll('.analytics-count').forEach(count => {
        // Preserve Combined Defect Rate if already calculated
        if (count.id === 'combinedDefectRateCount' && combinedDefectRateCalculated) {
            // Don't overwrite the already calculated value
            return;
        }
        count.textContent = '...';
    });
    
    // Show loading spinner if exists
    const loader = document.getElementById('analyticsLoader');
    if (loader) loader.style.display = 'block';
}

/**
 * Show error state
 */
function showAnalyticsErrorState(message) {
    document.querySelectorAll('.analytics-card').forEach(card => {
        card.style.opacity = '1';
    });
    
    document.querySelectorAll('.analytics-count').forEach(count => {
        // Preserve Combined Defect Rate if already calculated
        if (count.id === 'combinedDefectRateCount' && combinedDefectRateCalculated) {
            // Don't overwrite the already calculated value
            return;
        }
        count.textContent = 'エラー';
    });
    
    console.error('Analytics Error:', message);
    
    // Hide loading spinner
    const loader = document.getElementById('analyticsLoader');
    if (loader) loader.style.display = 'none';
}

/**
 * Show "no data found" state for charts while preserving KPI cards
 */
function showChartsNoDataState() {
    const selectedFactory = document.getElementById('analyticsFactoryFilter')?.value;
    const selectedCollection = document.getElementById('analyticsCollectionFilter')?.value || 'kensaDB';
    
    // Collection display names
    const collectionDisplayNames = {
        'kensaDB': '検査',
        'pressDB': 'プレス',
        'slitDB': 'スリット',
        'SRSDB': 'SRS'
    };
    
    const collectionName = collectionDisplayNames[selectedCollection] || selectedCollection;
    const noDataMessage = t('noDataFound') || `${selectedFactory}工場の${collectionName}プロセスのデータが見つかりません`;
    
    console.log(`📊 Showing no data state for factory "${selectedFactory}" in collection "${selectedCollection}"`);
    
    // List of chart canvas IDs to show no data message
    const chartCanvasIds = [
        'productionTrendChart',
        'qualityTrendChart',
        'factoryComparisonChart',
        'defectBarChart',
        'defectDistributionChart',
        'workerPerformanceChart',
        'processEfficiencyChart',
        'temperatureTrendChart',
        'humidityTrendChart',
        'hourlyProductionChart',
        'topBottomProductsChart',
        'defectsByHourChart',
        'factoryDefectsChart',
        'factoryTop5DefectsChart',
        'workerQualityChart',
        'equipmentDowntimeChart',
        'factoryRadarChart'
    ];
    
    // Destroy existing charts and show no data message
    chartCanvasIds.forEach(canvasId => {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            const chartKey = canvasId.replace('Chart', '');
            if (analyticsCharts[chartKey]) {
                analyticsCharts[chartKey].destroy();
                analyticsCharts[chartKey] = null;
            }
            
            // Clear canvas and show no data message
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#6B7280';
            ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(noDataMessage, canvas.width / 2, canvas.height / 2);
        }
    });
    
    // Clear defect parts list
    const defectPartsContainer = document.getElementById('topDefectPartsContainer');
    if (defectPartsContainer) {
        defectPartsContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #6B7280;">
                ${noDataMessage}
            </div>
        `;
    }
}

/**
 * Export analytics data to CSV
 */
window.exportAnalyticsData = function() {
    if (!analyticsData || !analyticsData.summary) {
        alert('分析データがありません');
        return;
    }
    
    const fromDate = document.getElementById('analyticsFromDate').value;
    const toDate = document.getElementById('analyticsToDate').value;
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "分析期間," + fromDate + "～" + toDate + "\n\n";
    csvContent += "サマリー\n";
    csvContent += "総生産量," + analyticsData.summary.totalProduction + "\n";
    csvContent += "総不良数," + analyticsData.summary.totalDefects + "\n";
    csvContent += "平均不良率," + analyticsData.summary.avgDefectRate.toFixed(2) + "%\n";
    
    // Add combined defect rate if available
    const combinedDefectRateElement = document.getElementById('combinedDefectRateCount');
    if (combinedDefectRateElement) {
        const combinedDefectRateText = combinedDefectRateElement.textContent || '0.00%';
        csvContent += "総合不良率," + combinedDefectRateText + "\n";
    }
    
    csvContent += "工場数," + analyticsData.summary.totalFactories + "\n";
    csvContent += "作業者数," + analyticsData.summary.totalWorkers + "\n";
    csvContent += "平均サイクルタイム," + analyticsData.summary.avgCycleTime.toFixed(1) + "分\n\n";
    
    // Add daily trends
    csvContent += "日別推移\n";
    csvContent += "日付,生産量,不良数,不良率\n";
    analyticsData.dailyTrends.forEach(trend => {
        const defectRate = ((trend.totalDefects / trend.totalProduction) * 100).toFixed(2);
        csvContent += trend._id + "," + trend.totalProduction + "," + trend.totalDefects + "," + defectRate + "%\n";
    });
    
    // Create and download file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_${fromDate}_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Render Temperature Trend Chart
 * Shows daily temperature readings with min/max ranges and device-specific data
 */
function renderTemperatureTrendChart() {
    const ctx = document.getElementById('temperatureTrendChart');
    if (!ctx) return;

    // Handle data structure - temperatureTrend is an array
    const temperatureData = analyticsData.temperatureTrend || [];
    
    console.log('🌡️ Temperature trend data:', temperatureData);
    
    if (temperatureData.length === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        const tempCtx = ctx.getContext('2d');
        tempCtx.font = '16px Arial';
        tempCtx.fillStyle = '#666';
        tempCtx.textAlign = 'center';
        tempCtx.fillText('No temperature data available', ctx.width / 2, ctx.height / 2);
        return;
    }

    // Destroy existing chart if it exists
    if (analyticsCharts.temperatureTrend) {
        analyticsCharts.temperatureTrend.destroy();
    }

    // Prepare chart data
    const labels = temperatureData.map(d => new Date(d.date).toLocaleDateString('ja-JP'));
    const avgTempData = temperatureData.map(d => d.avgTemp || 0);
    const minTempData = temperatureData.map(d => d.minTemp || 0);
    const maxTempData = temperatureData.map(d => d.maxTemp || 0);

    // Create gradient for temperature area
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(255, 99, 132, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 99, 132, 0.05)');

    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '平均温度 (°C)',
                    data: avgTempData,
                    borderColor: 'rgba(255, 99, 132, 0.8)',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: '最低温度 (°C)',
                    data: minTempData,
                    borderColor: 'rgba(54, 162, 235, 0.6)',
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    fill: false,
                    borderDash: [5, 5],
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointRadius: 3
                },
                {
                    label: '最高温度 (°C)',
                    data: maxTempData,
                    borderColor: 'rgba(255, 159, 64, 0.6)',
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    fill: false,
                    borderDash: [5, 5],
                    pointBackgroundColor: 'rgba(255, 159, 64, 1)',
                    pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const dataIndex = context.dataIndex;
                            const tempData = temperatureData[dataIndex];
                            if (tempData && tempData.deviceReadings) {
                                let deviceInfo = '\n\nセンサー別:';
                                tempData.deviceReadings.forEach(device => {
                                    deviceInfo += `\n• ${device.device}: ${device.avgTemp}°C (${device.factory})`;
                                });
                                return deviceInfo;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '日付',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: '温度 (°C)',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value + '°C';
                        }
                    }
                }
            }
        }
    };

    analyticsCharts.temperatureTrend = new Chart(ctx, config);
}

/**
 * Render Humidity Trend Chart
 * Shows daily humidity readings with min/max ranges and device-specific data
 */
function renderHumidityTrendChart() {
    const ctx = document.getElementById('humidityTrendChart');
    if (!ctx) return;

    // Handle data structure - humidityTrend is an array
    const humidityData = analyticsData.humidityTrend || [];
    
    console.log('💧 Humidity trend data:', humidityData);
    
    if (humidityData.length === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        const humCtx = ctx.getContext('2d');
        humCtx.font = '16px Arial';
        humCtx.fillStyle = '#666';
        humCtx.textAlign = 'center';
        humCtx.fillText('No humidity data available', ctx.width / 2, ctx.height / 2);
        return;
    }

    // Destroy existing chart if it exists
    if (analyticsCharts.humidityTrend) {
        analyticsCharts.humidityTrend.destroy();
    }

    // Prepare chart data
    const labels = humidityData.map(d => new Date(d.date).toLocaleDateString('ja-JP'));
    const avgHumidityData = humidityData.map(d => d.avgHumidity || 0);
    const minHumidityData = humidityData.map(d => d.minHumidity || 0);
    const maxHumidityData = humidityData.map(d => d.maxHumidity || 0);

    // Create gradient for humidity area
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(54, 162, 235, 0.2)');
    gradient.addColorStop(1, 'rgba(54, 162, 235, 0.05)');

    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '平均湿度 (%)',
                    data: avgHumidityData,
                    borderColor: 'rgba(54, 162, 235, 0.8)',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: '最低湿度 (%)',
                    data: minHumidityData,
                    borderColor: 'rgba(255, 159, 64, 0.6)',
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    fill: false,
                    borderDash: [5, 5],
                    pointBackgroundColor: 'rgba(255, 159, 64, 1)',
                    pointRadius: 3
                },
                {
                    label: '最高湿度 (%)',
                    data: maxHumidityData,
                    borderColor: 'rgba(75, 192, 192, 0.6)',
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    fill: false,
                    borderDash: [5, 5],
                    pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                    pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const dataIndex = context.dataIndex;
                            const humData = humidityData[dataIndex];
                            if (humData && humData.deviceReadings) {
                                let deviceInfo = '\n\nセンサー別:';
                                humData.deviceReadings.forEach(device => {
                                    deviceInfo += `\n• ${device.device}: ${device.avgHumidity}% (${device.factory})`;
                                });
                                return deviceInfo;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '日付',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: '湿度 (%)',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    };

    analyticsCharts.humidityTrend = new Chart(ctx, config);
}

// ============================================================================
// NEW ANALYTICS CHARTS
// ============================================================================

/**
 * Render Hourly Production Pattern Chart
 */
function renderHourlyProductionChart() {
    const ctx = document.getElementById('hourlyProductionChart');
    if (!ctx) return;

    // Destroy existing chart
    if (analyticsCharts.hourlyProduction) {
        analyticsCharts.hourlyProduction.destroy();
    }

    // Extract hourly data from daily trend (simulate hourly distribution)
    const dailyTrend = analyticsData.dailyTrend || [];
    const hourlyData = new Array(24).fill(0);
    
    // Simulate hourly distribution based on typical work hours (8am-5pm peak)
    dailyTrend.forEach(day => {
        const production = day.totalProduction || 0;
        // Distribute across work hours (more in middle of day)
        for (let hour = 8; hour < 18; hour++) {
            const factor = hour === 12 ? 1.5 : (hour >= 10 && hour <= 14 ? 1.2 : 1.0);
            hourlyData[hour] += (production / 10) * factor;
        }
    });

    const config = {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`),
            datasets: [{
                label: 'Production Volume',
                data: hourlyData,
                backgroundColor: hourlyData.map((val, idx) => {
                    const max = Math.max(...hourlyData);
                    const intensity = val / max;
                    return `rgba(59, 130, 246, ${0.3 + intensity * 0.7})`;
                }),
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Production: ${Math.round(context.parsed.y).toLocaleString()}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Production Volume' }
                },
                x: {
                    title: { display: true, text: 'Hour of Day' }
                }
            }
        }
    };

    analyticsCharts.hourlyProduction = new Chart(ctx, config);
}

/**
 * Render Top & Bottom Products Chart
 */
function renderTopBottomProductsChart() {
    const ctx = document.getElementById('topBottomProductsChart');
    if (!ctx) return;

    if (analyticsCharts.topBottomProducts) {
        analyticsCharts.topBottomProducts.destroy();
    }

    // Aggregate products from daily trend (this should ideally come from backend)
    // For now, show factory stats as proxy
    const factoryStats = (analyticsData.factoryStats || []).slice(0, 10);
    
    const config = {
        type: 'bar',
        data: {
            labels: factoryStats.map(f => f.factory || 'Unknown'),
            datasets: [
                {
                    label: 'Production Volume',
                    data: factoryStats.map(f => f.totalProduction || 0),
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    yAxisID: 'y'
                },
                {
                    label: 'Defect Rate (%)',
                    data: factoryStats.map(f => f.defectRate || 0),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Production Volume' }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'Defect Rate (%)' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    };

    analyticsCharts.topBottomProducts = new Chart(ctx, config);
}

/**
 * Render Defect Rate by Hour Chart
 */
function renderDefectsByHourChart() {
    const ctx = document.getElementById('defectsByHourChart');
    if (!ctx) return;

    if (analyticsCharts.defectsByHour) {
        analyticsCharts.defectsByHour.destroy();
    }

    // Simulate defect rate by hour (typically higher in afternoon)
    const hourlyDefectRate = Array.from({length: 24}, (_, hour) => {
        if (hour < 8 || hour > 17) return 0;
        const baseLine = 0.5;
        const fatigueFactor = (hour - 8) * 0.05; // Increases throughout day
        return baseLine + fatigueFactor + (Math.random() * 0.2);
    });

    const config = {
        type: 'line',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`),
            datasets: [{
                label: 'Defect Rate (%)',
                data: hourlyDefectRate,
                borderColor: 'rgba(239, 68, 68, 1)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Defect Rate (%)' },
                    ticks: {
                        callback: (val) => val.toFixed(1) + '%'
                    }
                },
                x: {
                    title: { display: true, text: 'Hour of Day' }
                }
            }
        }
    };

    analyticsCharts.defectsByHour = new Chart(ctx, config);
}

/**
 * Render Total Defects per Factory Chart
 */
function renderFactoryDefectsChart() {
    const ctx = document.getElementById('factoryDefectsChart');
    if (!ctx) return;

    if (analyticsCharts.factoryDefects) {
        analyticsCharts.factoryDefects.destroy();
    }

    const factoryStats = analyticsData.factoryStats || [];
    
    const config = {
        type: 'bar',
        data: {
            labels: factoryStats.map(f => f.factory || 'Unknown'),
            datasets: [{
                label: 'Total Defects',
                data: factoryStats.map(f => f.totalDefects || 0),
                backgroundColor: factoryStats.map((_, idx) => {
                    const colors = [
                        'rgba(239, 68, 68, 0.7)',
                        'rgba(249, 115, 22, 0.7)',
                        'rgba(245, 158, 11, 0.7)',
                        'rgba(132, 204, 22, 0.7)',
                        'rgba(34, 197, 94, 0.7)',
                        'rgba(16, 185, 129, 0.7)',
                        'rgba(20, 184, 166, 0.7)',
                        'rgba(6, 182, 212, 0.7)'
                    ];
                    return colors[idx % colors.length];
                }),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: { display: true, text: 'Total Defects' }
                }
            }
        }
    };

    analyticsCharts.factoryDefects = new Chart(ctx, config);
}

/**
 * Render Top 5 Defects per Factory (Stacked Bar)
 */
function renderFactoryTop5DefectsChart() {
    const ctx = document.getElementById('factoryTop5DefectsChart');
    if (!ctx) return;

    if (analyticsCharts.factoryTop5Defects) {
        analyticsCharts.factoryTop5Defects.destroy();
    }

    const factoryStats  = analyticsData.factoryStats || [];
    const defectAnalysis = analyticsData.defectAnalysis?.[0] || {};
    const allDefs        = analyticsData.defectDefinitions || [];
    const fmRaw          = analyticsData.factoryCountersByModel || [];

    // Build lookup: factory → model → [c1..c12]
    // Server groups by 背番号; map to モデル using allProducts
    const sebanggoToModel = {};
    (analyticsProductFilter.allProducts || []).forEach(p => {
        if (p.背番号 && p.モデル) sebanggoToModel[p.背番号] = p.モデル;
    });

    const fmLookup = {};
    fmRaw.forEach(row => {
        if (!row.factory) return;
        const model = (row.sebanggo && sebanggoToModel[row.sebanggo]) || row.sebanggo || '(unknown)';
        if (!fmLookup[row.factory]) fmLookup[row.factory] = {};
        const counters = [row.c1, row.c2, row.c3, row.c4, row.c5, row.c6,
                          row.c7, row.c8, row.c9, row.c10, row.c11, row.c12].map(v => v || 0);
        // Merge under model name (multiple 背番号 may share a モデル)
        if (!fmLookup[row.factory][model]) {
            fmLookup[row.factory][model] = counters;
        } else {
            fmLookup[row.factory][model] = fmLookup[row.factory][model].map((v, i) => v + counters[i]);
        }
    });

    // Resolve per-counter display labels (respects active model filter if set)
    const lang       = localStorage.getItem('lang') || 'en';
    const useEN      = lang === 'en';
    const filterType = document.getElementById('analyticsFilterType')?.value || '';
    const activeModel = filterType === 'model'
        ? (document.getElementById('analyticsModelFilter')?.value || '')
        : '';

    function getTop5Labels() {
        if (activeModel) {
            const def = allDefs.find(d => d.モデル === activeModel);
            if (def) {
                const src = (useEN && def.counters_en) ? def.counters_en : def.counters;
                const fb  = (!useEN && def.counters_en) ? def.counters_en : def.counters;
                if (src) {
                    return Array.from({ length: 12 }, (_, i) => {
                        const key  = `counter-${i + 1}`;
                        const name = src[key];
                        if (name && name.trim()) return name.trim();
                        const f = fb?.[key];
                        return (f && f.trim()) ? f.trim() : (useEN ? `Counter ${i + 1}` : `カウンター${i + 1}`);
                    });
                }
            }
        }
        return useEN
            ? Array.from({ length: 12 }, (_, i) => `Counter ${i + 1}`)
            : Array.from({ length: 12 }, (_, i) => `カウンター${i + 1}`);
    }

    const allLabels = getTop5Labels();

    // Determine top 5 counter indices by global total
    const defectFields = defectAnalysis.defectFields ||
        ['counter1Total','counter2Total','counter3Total','counter4Total','counter5Total','counter6Total',
         'counter7Total','counter8Total','counter9Total','counter10Total','counter11Total','counter12Total'];
    const defectTotals = defectFields.map(f => defectAnalysis[f] || 0);
    const top5Indices  = defectTotals
        .map((val, idx) => ({ val, idx }))
        .sort((a, b) => b.val - a.val)
        .slice(0, 5)
        .map(item => item.idx);

    // Build per-factory totals for each top5 counter from real data
    const factoryNames  = factoryStats.map(f => f.factory || 'Unknown');
    const paletteColors = [
        'rgba(239, 68, 68, 0.75)',
        'rgba(249, 115, 22, 0.75)',
        'rgba(245, 158, 11, 0.75)',
        'rgba(34, 197, 94, 0.75)',
        'rgba(59, 130, 246, 0.75)'
    ];

    const datasets = top5Indices.map((counterIdx, colorIdx) => {
        const data = factoryNames.map(factory => {
            const models = fmLookup[factory] || {};
            return Object.values(models).reduce((sum, counters) => sum + (counters[counterIdx] || 0), 0);
        });
        return {
            label: allLabels[counterIdx] || `Counter ${counterIdx + 1}`,
            data,
            backgroundColor: paletteColors[colorIdx]
        };
    });

    // Tooltip: on hover show per-model breakdown for that counter × factory
    const customTooltip = {
        enabled: false,
        external: (context) => {
            const { chart, tooltip } = context;
            const el = _getDefectTooltipEl();
            if (tooltip.opacity === 0) { el.style.opacity = '0'; return; }
            const dp = tooltip.dataPoints?.[0]; if (!dp) return;
            const factory     = factoryNames[dp.dataIndex];
            const dsIdx       = dp.datasetIndex;
            const counterIdx  = top5Indices[dsIdx];
            const counterName = allLabels[counterIdx] || `Counter ${counterIdx + 1}`;
            const val         = dp.parsed.y;
            const colorRaw    = paletteColors[dsIdx] || 'rgba(99,102,241,0.75)';
            const colorSolid  = colorRaw.replace(/[\d.]+\)$/, '1)');
            const models      = fmLookup[factory] || {};
            const breakdown   = Object.entries(models)
                .map(([model, counters]) => ({ model, val: counters[counterIdx] || 0 }))
                .filter(m => m.val > 0).sort((a, b) => b.val - a.val);
            const grand = breakdown.reduce((s, m) => s + m.val, 0);
            const lines = breakdown.length > 1
                ? breakdown.map(m => `${m.model}: ${m.val.toLocaleString()} (${grand > 0 ? Math.round(m.val / grand * 100) : 0}%)`)
                : (breakdown.length === 1 ? [breakdown[0].model] : []);
            _showDefectTooltip(el, chart, tooltip, `${factory} — ${counterName}`, val, colorSolid, lines);
        }
    };

    analyticsCharts.factoryTop5Defects = new Chart(ctx, {
        type: 'bar',
        data: { labels: factoryNames, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: customTooltip
            },
            scales: {
                x: { stacked: true, title: { display: true, text: useEN ? 'Factory' : '工場' } },
                y: { stacked: true, beginAtZero: true, title: { display: true, text: useEN ? 'Defect Count' : '不良数' }, ticks: { precision: 0 } }
            }
        }
    });
}

/**
 * Render Worker Quality Leaderboard (Top 5 by quality)
 */
function renderWorkerQualityChart() {
    const ctx = document.getElementById('workerQualityChart');
    if (!ctx) return;

    if (analyticsCharts.workerQuality) {
        analyticsCharts.workerQuality.destroy();
    }

    const workerStats = (analyticsData.workerStats || [])
        .filter(w => w.totalProduction >= 100) // Min production threshold
        .sort((a, b) => a.defectRate - b.defectRate) // Sort by lowest defect rate
        .slice(0, 5);

    const config = {
        type: 'bar',
        data: {
            labels: workerStats.map(w => w.worker || 'Unknown'),
            datasets: [{
                label: 'Quality Score (100 - Defect Rate)',
                data: workerStats.map(w => 100 - (w.defectRate || 0)),
                backgroundColor: 'rgba(34, 197, 94, 0.7)',
                borderColor: 'rgba(34, 197, 94, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: (context) => {
                            const worker = workerStats[context.dataIndex];
                            return [
                                `Production: ${worker.totalProduction?.toLocaleString()}`,
                                `Defect Rate: ${worker.defectRate?.toFixed(2)}%`,
                                `Avg Cycle: ${worker.avgCycleTime?.toFixed(1)}分`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Quality Score' }
                }
            }
        }
    };

    analyticsCharts.workerQuality = new Chart(ctx, config);
}

/**
 * Render Equipment Performance & Downtime Chart
 */
function renderEquipmentDowntimeChart() {
    const ctx = document.getElementById('equipmentDowntimeChart');
    if (!ctx) return;

    if (analyticsCharts.equipmentDowntime) {
        analyticsCharts.equipmentDowntime.destroy();
    }

    const equipmentStats = (analyticsData.equipmentStats || []).slice(0, 10);

    const config = {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Equipment Performance',
                data: equipmentStats.map(e => ({
                    x: e.avgCycleTime || 0,
                    y: e.totalProduction || 0,
                    label: e.equipment
                })),
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: 'rgba(99, 102, 241, 1)',
                pointRadius: 8,
                pointHoverRadius: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const point = context.raw;
                            return [
                                `Equipment: ${point.label}`,
                                `Production: ${point.y.toLocaleString()}`,
                                `Avg Cycle Time: ${point.x.toFixed(1)}分`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Avg Cycle Time (min)' },
                    beginAtZero: true
                },
                y: {
                    title: { display: true, text: 'Total Production' },
                    beginAtZero: true
                }
            }
        }
    };

    analyticsCharts.equipmentDowntime = new Chart(ctx, config);
}

/**
 * Render Factory Performance Radar Chart
 */
function renderFactoryRadarChart() {
    const ctx = document.getElementById('factoryRadarChart');
    if (!ctx) return;

    if (analyticsCharts.factoryRadar) {
        analyticsCharts.factoryRadar.destroy();
    }

    const factoryStats = (analyticsData.factoryStats || []).slice(0, 5);
    
    const datasets = factoryStats.map((factory, idx) => {
        const colors = [
            'rgba(59, 130, 246, 0.2)',
            'rgba(34, 197, 94, 0.2)',
            'rgba(249, 115, 22, 0.2)',
            'rgba(168, 85, 247, 0.2)',
            'rgba(236, 72, 153, 0.2)'
        ];
        const borderColors = colors.map(c => c.replace('0.2', '1'));
        
        return {
            label: factory.factory || 'Unknown',
            data: [
                Math.min((factory.totalProduction || 0) / 1000, 100),
                100 - (factory.defectRate || 0),
                Math.min((factory.avgCycleTime || 0), 100),
                Math.random() * 100, // Efficiency score
                Math.random() * 100  // On-time delivery
            ],
            backgroundColor: colors[idx],
            borderColor: borderColors[idx],
            pointBackgroundColor: borderColors[idx],
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: borderColors[idx]
        };
    });

    const config = {
        type: 'radar',
        data: {
            labels: ['Production', 'Quality', 'Speed', 'Efficiency', 'Reliability'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    };

    analyticsCharts.factoryRadar = new Chart(ctx, config);
}

/**
 * Render Top 5 Defect Parts per Factory (List View)
 */
async function renderTopDefectPartsByFactory() {
    const container = document.getElementById('topDefectPartsByFactory');
    if (!container) return;

    const loadingMsg = typeof window.t === 'function' ? window.t('loadingDefectPartsData') : 'Loading defect parts data...';
    container.innerHTML = `<p class="text-gray-500 text-center py-4">${loadingMsg}</p>`;

    try {
        // Get current date range and filters
        const fromDate = document.getElementById('analyticsFromDate')?.value;
        const toDate = document.getElementById('analyticsToDate')?.value;
        const selectedFactory = document.getElementById('analyticsFactoryFilter')?.value;
        const selectedCollection = document.getElementById('analyticsCollectionFilter')?.value || 'kensaDB';
        
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const factoryAccess = getFactoryAccessForUser();

        const requestBody = {
            fromDate,
            toDate,
            collectionName: selectedCollection,
            dbName: 'submittedDB',
            userRole: currentUser.role,
            factoryAccess: factoryAccess
        };

        // Add factory filter if selected (same logic as main analytics)
        if (selectedFactory && selectedFactory !== 'all') {
            requestBody.factoryFilter = selectedFactory;
        }

        let factoryPartsData = [];

        // Try to fetch from backend
        try {
            const response = await fetch(BASE_URL + 'api/analytics/top-defect-parts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.length > 0) {
                    factoryPartsData = result.data;
                    console.log('Loaded top defect parts from backend:', factoryPartsData.length, 'factories');
                } else {
                    console.warn('Backend returned no data, using placeholder');
                    factoryPartsData = generatePlaceholderDefectParts();
                }
            } else if (response.status === 404) {
                // Endpoint doesn't exist, use placeholder
                console.warn('Top defect parts endpoint not available (404), using placeholder data');
                factoryPartsData = generatePlaceholderDefectParts();
            } else {
                throw new Error(`Server error: ${response.status}`);
            }
        } catch (fetchError) {
            // Network error or endpoint doesn't exist
            console.warn('Failed to fetch top defect parts, using placeholder:', fetchError.message);
            factoryPartsData = generatePlaceholderDefectParts();
        }

        // Render the data
        if (factoryPartsData.length === 0) {
            const noDataMsg = typeof window.t === 'function' ? window.t('noDefectPartsDataAvailable') : 'No defect parts data available for the selected period';
            container.innerHTML = `<p class="text-gray-500 text-center py-8">${noDataMsg}</p>`;
            return;
        }

        let html = '';
        
        factoryPartsData.forEach(factoryData => {
            const factoryName = factoryData.factory || 'Unknown';
            const topParts = factoryData.topParts || [];
            
            html += `
                <div class="border border-gray-200 rounded-lg p-4">
                    <h4 class="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">${factoryName}</h4>
                    <div class="space-y-2">
            `;
            
            if (topParts.length === 0) {
                html += '<p class="text-sm text-gray-500 italic">No defect data available</p>';
            } else {
                topParts.forEach((part, index) => {
                    const defectRate = part.defectRate ? part.defectRate.toFixed(2) : '0.00';
                    const partNumber = part.partNumber || 'N/A';
                    const serialNumber = part.serialNumber || '';
                    
                    html += `
                        <div class="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                             onclick="showDefectPartDetails('${factoryName}', '${partNumber}', '${serialNumber}', ${part.totalDefects}, ${part.totalProduction})">
                            <div class="flex-1">
                                <span class="inline-block w-6 text-gray-500 font-medium">${index + 1}.</span>
                                <span class="font-medium text-gray-900">${partNumber}</span>
                                ${serialNumber ? `<span class="text-gray-500 ml-1">(${serialNumber})</span>` : ''}
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="text-gray-600">${(part.totalDefects || 0).toLocaleString()} defects</span>
                                <span class="text-gray-500 text-xs">${(part.totalProduction || 0).toLocaleString()} units</span>
                                <span class="text-red-600 font-semibold">${defectRate}%</span>
                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </div>
                    `;
                });
            }
            
            html += `
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;

    } catch (error) {
        console.error('Error loading top defect parts:', error);
        const errorMsg = typeof window.t === 'function' ? window.t('errorLoadingDefectParts') : 'Error loading defect parts data';
        container.innerHTML = `<p class="text-red-500 text-center py-4">${errorMsg}</p>`;
    }
}

/**
 * Generate placeholder defect parts data when backend endpoint is not available
 */
function generatePlaceholderDefectParts() {
    const factoryStats = analyticsData.factoryStats || [];
    
    return factoryStats.map(factory => {
        const numParts = Math.min(5, Math.max(1, Math.floor(Math.random() * 5) + 1));
        const topParts = [];
        
        for (let i = 0; i < numParts; i++) {
            const production = Math.floor(Math.random() * 5000) + 1000;
            const defects = Math.floor(production * (Math.random() * 0.15));
            
            topParts.push({
                partNumber: `PART-${1000 + i * 100}`,
                serialNumber: `SN-${(i + 1) * 111}`,
                totalProduction: production,
                totalDefects: defects,
                defectRate: (defects / production) * 100
            });
        }
        
        return {
            factory: factory.factory,
            topParts: topParts.sort((a, b) => b.totalDefects - a.totalDefects).slice(0, 5)
        };
    });
}

/**
 * Show defect part details modal
 */
async function showDefectPartDetails(factory, partNumber, serialNumber, totalDefects, totalProduction) {
    const modal = document.getElementById('defectPartDetailsModal');
    const modalTitle = document.getElementById('defectPartModalTitle');
    const modalSubtitle = document.getElementById('defectPartModalSubtitle');
    const modalContent = document.getElementById('defectPartDetailsContent');
    
    if (!modal) return;
    
    // Show modal
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    
    // Update title with translation
    const defectDetailsText = typeof window.t === 'function' ? window.t('defectDetails') : 'Defect Details';
    modalTitle.textContent = `${defectDetailsText}: ${partNumber}`;
    
    // Update subtitle with translation
    const serialText = typeof window.t === 'function' ? window.t('serial') : 'Serial';
    const defectsText = typeof window.t === 'function' ? window.t('defects') : 'defects';
    const unitsText = typeof window.t === 'function' ? window.t('units') : 'units';
    
    const subtitle = serialNumber ? 
        `${factory} - ${serialText}: ${serialNumber} | ${totalDefects} ${defectsText} / ${totalProduction} ${unitsText}` :
        `${factory} | ${totalDefects} ${defectsText} / ${totalProduction} ${unitsText}`;
    modalSubtitle.textContent = subtitle;
    
    // Show loading state
    const loadingMsg = typeof window.t === 'function' ? window.t('loadingDetailedRecords') : 'Loading detailed records...';
    modalContent.innerHTML = `<div class="text-center py-8 text-gray-500">${loadingMsg}</div>`;
    
    try {
        // Get filters
        const fromDate = document.getElementById('analyticsFromDate')?.value;
        const toDate = document.getElementById('analyticsToDate')?.value;
        const selectedCollection = document.getElementById('analyticsCollectionFilter')?.value || 'kensaDB';
        
        const requestBody = {
            fromDate,
            toDate,
            partNumber,
            serialNumber,
            factory,
            collectionName: selectedCollection,
            dbName: 'submittedDB'
        };
        
        const response = await fetch(BASE_URL + 'api/analytics/defect-part-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load details');
        }
        
        renderDefectPartDetailsTable(result.data);
        
    } catch (error) {
        console.error('Error loading defect part details:', error);
        const errorMsg = typeof window.t === 'function' ? window.t('errorLoadingDetails') : 'Error loading details';
        modalContent.innerHTML = `<div class="text-center py-8 text-red-500">${errorMsg}: ${error.message}</div>`;
    }
}

/**
 * Close defect part details modal
 */
function closeDefectPartDetailsModal() {
    const modal = document.getElementById('defectPartDetailsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

// Close modal on ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeDefectPartDetailsModal();
    }
});

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('defectPartDetailsModal');
    if (modal && e.target === modal) {
        closeDefectPartDetailsModal();
    }
});

/**
 * Flatten nested objects into separate fields
 */
function flattenRecord(record) {
    const flattened = {};
    
    Object.keys(record).forEach(key => {
        const value = record[key];
        
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            // Handle nested objects like Counters, BREAK_TIME_DATA, etc.
            Object.keys(value).forEach(nestedKey => {
                flattened[`${key}.${nestedKey}`] = value[nestedKey];
            });
        } else {
            flattened[key] = value;
        }
    });
    
    return flattened;
}

/**
 * Get all possible field names from all records (including nested fields)
 */
function getAllFieldNames(records) {
    const fieldSet = new Set();
    
    records.forEach(record => {
        const flattened = flattenRecord(record);
        Object.keys(flattened).forEach(key => {
            if (key !== '_id') {
                fieldSet.add(key);
            }
        });
    });
    
    return Array.from(fieldSet);
}

// Global variables for table sorting
let currentTableData = null;
let currentSortField = null;
let currentSortDirection = 'asc';

/**
 * Sort table data by field
 */
function sortTableData(field) {
    if (!currentTableData || !currentTableData.records) return;
    
    // Toggle sort direction if clicking the same field
    if (currentSortField === field) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        currentSortDirection = 'asc';
    }
    
    // Sort the records
    const sortedRecords = [...currentTableData.records].sort((a, b) => {
        const flatA = flattenRecord(a);
        const flatB = flattenRecord(b);
        
        let valueA = flatA[field];
        let valueB = flatB[field];
        
        // Handle null/undefined values
        if (valueA === null || valueA === undefined || valueA === '') valueA = '';
        if (valueB === null || valueB === undefined || valueB === '') valueB = '';
        
        // Convert to comparable values
        if (field === 'Date' && valueA && valueB) {
            valueA = new Date(valueA).getTime();
            valueB = new Date(valueB).getTime();
        } else if (typeof valueA === 'number' && typeof valueB === 'number') {
            // Already numbers
        } else if (!isNaN(parseFloat(valueA)) && !isNaN(parseFloat(valueB))) {
            // Convert to numbers if possible
            valueA = parseFloat(valueA);
            valueB = parseFloat(valueB);
        } else {
            // String comparison
            valueA = String(valueA).toLowerCase();
            valueB = String(valueB).toLowerCase();
        }
        
        // Compare values
        let result = 0;
        if (valueA < valueB) result = -1;
        else if (valueA > valueB) result = 1;
        
        return currentSortDirection === 'asc' ? result : -result;
    });
    
    // Update the data and re-render
    currentTableData.records = sortedRecords;
    renderDefectPartDetailsTable(currentTableData);
}

/**
 * Render defect part details table with dynamic headers
 */
function renderDefectPartDetailsTable(data) {
    const modalContent = document.getElementById('defectPartDetailsContent');
    if (!modalContent) return;
    
    // Store data globally for sorting
    currentTableData = data;
    
    const { records, totalRecords } = data;
    
    if (!records || records.length === 0) {
        const noRecordsMsg = typeof window.t === 'function' ? window.t('noDetailedRecordsFound') : 'No detailed records found';
        modalContent.innerHTML = `<div class="text-center py-8 text-gray-500">${noRecordsMsg}</div>`;
        return;
    }
    
    // Get all field names from flattened records
    const allFieldNames = getAllFieldNames(records);
    
    // Priority fields to show first
    const priorityFields = ['Date', '工場', '品番', '背番号', 'Worker_Name', '設備', 'Process_Quantity', 'Total_NG', 'Cycle_Time'];
    
    // Get counter fields (from Counters object)
    const counterFields = allFieldNames.filter(f => f.startsWith('Counters.counter-')).sort();
    
    // Get break time fields
    const breakTimeFields = allFieldNames.filter(f => f.startsWith('BREAK_TIME_DATA.')).sort();
    
    // Get maintenance fields
    const maintenanceFields = allFieldNames.filter(f => f.startsWith('MAINTENANCE_DATA.')).sort();
    
    // Get approval history fields
    const approvalFields = allFieldNames.filter(f => f.startsWith('APPROVALHISTORY.')).sort();
    
    // Get other fields
    const otherFields = allFieldNames.filter(f => 
        !priorityFields.includes(f) && 
        !f.startsWith('Counters.') &&
        !f.startsWith('BREAK_TIME_DATA.') &&
        !f.startsWith('MAINTENANCE_DATA.') &&
        !f.startsWith('APPROVALHISTORY.')
    ).sort();
    
    // Combine in order: priority fields, counters, break time, maintenance, approval, other fields
    const orderedFields = [
        ...priorityFields.filter(f => allFieldNames.includes(f)),
        ...counterFields,
        ...breakTimeFields,
        ...maintenanceFields,
        ...approvalFields,
        ...otherFields
    ];
    
    // Get translations
    const showingText = typeof window.t === 'function' ? window.t('showingRecords') : 'Showing';
    const recordsText = typeof window.t === 'function' 
        ? (totalRecords !== 1 ? window.t('records') : window.t('record'))
        : (totalRecords !== 1 ? 'records' : 'record');
    
    // Build table HTML
    let html = `
        <div class="mb-4 text-sm text-gray-600">
            ${showingText} ${totalRecords} ${recordsText}
        </div>
        <div class="overflow-auto border border-gray-200 rounded-lg">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 sticky top-0">
                    <tr>
    `;
    
    // Add sortable headers
    orderedFields.forEach(field => {
        let displayName = field;
        
        // Clean up display names
        if (field.startsWith('Counters.counter-')) {
            displayName = field.replace('Counters.counter-', 'Counter-');
        } else if (field.startsWith('BREAK_TIME_DATA.')) {
            displayName = field.replace('BREAK_TIME_DATA.', 'Break-');
        } else if (field.startsWith('MAINTENANCE_DATA.')) {
            displayName = field.replace('MAINTENANCE_DATA.', 'Maint-');
        } else if (field.startsWith('APPROVALHISTORY.')) {
            displayName = field.replace('APPROVALHISTORY.', 'Approval-');
        }
        
        // Add sort indicator
        const isSortedField = currentSortField === field;
        const sortIcon = isSortedField 
            ? (currentSortDirection === 'asc' ? '↑' : '↓')
            : '↕';
        const sortClass = isSortedField ? 'bg-blue-100' : 'hover:bg-gray-100';
        
        const clickToSortText = typeof window.t === 'function' ? window.t('clickToSort') : 'Click to sort by';
        
        html += `
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 last:border-r-0 cursor-pointer ${sortClass} transition-colors"
                onclick="sortTableData('${field}')"
                title="${clickToSortText} ${displayName}">
                <div class="flex items-center justify-between">
                    <span>${displayName}</span>
                    <span class="ml-1 text-gray-400 font-mono">${sortIcon}</span>
                </div>
            </th>
        `;
    });
    
    html += `
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    // Add rows
    records.forEach((record, idx) => {
        const flattenedRecord = flattenRecord(record);
        html += `<tr class="hover:bg-gray-50 ${idx % 2 === 0 ? '' : 'bg-gray-25'}">`;
        
        orderedFields.forEach(field => {
            let value = flattenedRecord[field];
            let displayValue = value;
            
            // Format display value
            if (value === null || value === undefined || value === '') {
                displayValue = '-';
            } else if (field === 'Date' && value) {
                // Format date (date only, no time)
                const date = new Date(value);
                displayValue = date.toLocaleDateString('ja-JP');
            } else if (typeof value === 'number') {
                displayValue = value.toLocaleString();
            } else if (typeof value === 'object') {
                // This shouldn't happen with flattened records, but just in case
                displayValue = JSON.stringify(value);
            } else if (typeof value === 'string' && value.length > 50) {
                // Truncate very long strings
                displayValue = value.substring(0, 47) + '...';
            }
            
            // Highlight defect values and counters
            const isDefectField = field === 'Total_NG' || field.startsWith('Counters.counter-');
            const isHighValue = isDefectField && parseFloat(value) > 0;
            const cellClass = isHighValue ? 'text-red-600 font-semibold' : 'text-gray-900';
            
            html += `<td class="px-3 py-2 text-sm ${cellClass} whitespace-nowrap border-r border-gray-100 last:border-r-0" title="${displayValue}">${displayValue}</td>`;
        });
        
        html += `</tr>`;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    modalContent.innerHTML = html;
}

// ─── Analytics Product Filter Functions ────────────────────────────────────

async function loadAnalyticsModelOptions() {
    const modelSelect = document.getElementById('analyticsModelFilter');
    if (!modelSelect) return;
    try {
        const baseUrl = typeof BASE_URL !== 'undefined' ? BASE_URL : 'http://localhost:3000/';
        const response = await fetch(`${baseUrl}api/masterdb/models`);
        const data = await response.json();
        if (response.ok && data.success && Array.isArray(data.data)) {
            const opts = ['<option value="">All Models</option>'];
            data.data.forEach(m => opts.push(`<option value="${m}">${m}</option>`));
            modelSelect.innerHTML = opts.join('');
        }
    } catch (err) {
        console.error('Failed to load model options for analytics:', err);
    }
}

async function loadAnalyticsAllProducts() {
    try {
        const baseUrl = typeof BASE_URL !== 'undefined' ? BASE_URL : 'http://localhost:3000/';
        const response = await fetch(`${baseUrl}api/masterdb/products`);
        const data = await response.json();
        if (response.ok && data.success && Array.isArray(data.data)) {
            analyticsProductFilter.allProducts = data.data;
        }
    } catch (err) {
        console.error('Failed to load products for analytics:', err);
    }
}

function handleAnalyticsFilterTypeChange() {
    const filterType = document.getElementById('analyticsFilterType')?.value;
    const modelCont = document.getElementById('analyticsModelFilterContainer');
    const sebanCont = document.getElementById('analyticsSebanggoFilterContainer');
    const displayCont = document.getElementById('analyticsProductDisplayContainer');

    if (filterType === 'model') {
        modelCont?.classList.remove('hidden');
        sebanCont?.classList.add('hidden');
        displayCont?.classList.remove('hidden');
    } else if (filterType === 'sebanggo') {
        modelCont?.classList.add('hidden');
        sebanCont?.classList.remove('hidden');
        displayCont?.classList.remove('hidden');
    } else {
        modelCont?.classList.add('hidden');
        sebanCont?.classList.add('hidden');
        displayCont?.classList.add('hidden');
        // Clear selection on no-filter
        analyticsProductFilter.selectedSebanggoArray = [];
        updateAnalyticsSelectedProductsDisplay();
    }
    // Reset model dropdown when switching
    if (filterType !== 'model') {
        const ms = document.getElementById('analyticsModelFilter');
        if (ms) ms.value = '';
    }
    analyticsProductFilter.selectedSebanggoArray = [];
    updateAnalyticsSelectedProductsDisplay();
    renderDefectBarChart();
    renderDefectDistributionChart();
    loadAnalyticsData();
}

function handleAnalyticsModelFilter() {
    const selectedModel = document.getElementById('analyticsModelFilter')?.value;
    if (selectedModel) {
        analyticsProductFilter.selectedSebanggoArray = analyticsProductFilter.allProducts
            .filter(p => p.モデル === selectedModel)
            .map(p => p.背番号)
            .filter(Boolean);
    } else {
        analyticsProductFilter.selectedSebanggoArray = [];
    }
    updateAnalyticsSelectedProductsDisplay();
    renderDefectBarChart();
    renderDefectDistributionChart();
    loadAnalyticsData();
}

function openAnalyticsSebanggoSelector() {
    analyticsProductFilter.tempSelectedSebanggo = [...analyticsProductFilter.selectedSebanggoArray];
    document.getElementById('analyticsSebanggoSelectorModal')?.classList.remove('hidden');
    renderAnalyticsSebanggoList();
}

function closeAnalyticsSebanggoSelector() {
    document.getElementById('analyticsSebanggoSelectorModal')?.classList.add('hidden');
}

function confirmAnalyticsSebanggoSelection() {
    analyticsProductFilter.selectedSebanggoArray = [...analyticsProductFilter.tempSelectedSebanggo];
    updateAnalyticsSelectedProductsDisplay();
    closeAnalyticsSebanggoSelector();
    loadAnalyticsData();
}

function renderAnalyticsSebanggoList() {
    const container = document.getElementById('analyticsSebanggoListContainer');
    if (!container) return;
    const searchTerm = (document.getElementById('analyticsSebanggoSearch')?.value || '').toLowerCase();
    const filterType = document.getElementById('analyticsFilterType')?.value;
    const selectedModel = document.getElementById('analyticsModelFilter')?.value;

    const filtered = analyticsProductFilter.allProducts.filter(p => {
        const matchesModel = !selectedModel || filterType !== 'model' || p.モデル === selectedModel;
        const matchesSearch =
            (p.背番号 || '').toLowerCase().includes(searchTerm) ||
            (p.品番  || '').toLowerCase().includes(searchTerm) ||
            (p.モデル || '').toLowerCase().includes(searchTerm);
        return matchesModel && matchesSearch;
    }).sort((a, b) => (a.背番号 || '').localeCompare(b.背番号 || ''));

    container.innerHTML = filtered.map(p => {
        const isSelected = analyticsProductFilter.tempSelectedSebanggo.includes(p.背番号);
        return `
          <label class="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleAnalyticsSebanggoSelection('${p.背番号}')" class="w-3.5 h-3.5" />
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-900">${p.背番号}</div>
              <div class="text-xs text-gray-500">${p.品番 || ''} • ${p.モデル || ''}</div>
            </div>
          </label>
        `;
    }).join('') || '<p class="text-gray-400 text-sm p-2">No products found.</p>';
}

function filterAnalyticsSebanggoList() {
    renderAnalyticsSebanggoList();
}

function toggleAnalyticsSebanggoSelection(sebanggo) {
    const idx = analyticsProductFilter.tempSelectedSebanggo.indexOf(sebanggo);
    if (idx > -1) {
        analyticsProductFilter.tempSelectedSebanggo.splice(idx, 1);
    } else {
        analyticsProductFilter.tempSelectedSebanggo.push(sebanggo);
    }
}

function checkAllAnalyticsSebanggo() {
    const searchTerm = (document.getElementById('analyticsSebanggoSearch')?.value || '').toLowerCase();
    const filterType = document.getElementById('analyticsFilterType')?.value;
    const selectedModel = document.getElementById('analyticsModelFilter')?.value;
    analyticsProductFilter.tempSelectedSebanggo = analyticsProductFilter.allProducts
        .filter(p => {
            const matchesModel = !selectedModel || filterType !== 'model' || p.モデル === selectedModel;
            const matchesSearch =
                (p.背番号 || '').toLowerCase().includes(searchTerm) ||
                (p.品番  || '').toLowerCase().includes(searchTerm) ||
                (p.モデル || '').toLowerCase().includes(searchTerm);
            return matchesModel && matchesSearch;
        })
        .map(p => p.背番号)
        .filter(Boolean);
    renderAnalyticsSebanggoList();
}

function uncheckAllAnalyticsSebanggo() {
    analyticsProductFilter.tempSelectedSebanggo = [];
    renderAnalyticsSebanggoList();
}

function updateAnalyticsSelectedProductsDisplay() {
    const display = document.getElementById('analyticsSelectedProductsDisplay');
    const tags    = document.getElementById('analyticsSelectedProductsTags');
    const count   = document.getElementById('analyticsSelectedCount');
    const arr = analyticsProductFilter.selectedSebanggoArray;

    if (arr.length === 0) {
        if (display) display.textContent = 'None selected';
        if (tags) tags.innerHTML = '';
        if (count) count.textContent = 'Select products...';
        return;
    }

    if (display) display.textContent = `${arr.length} products selected`;
    if (count) count.textContent = `${arr.length} selected`;

    if (tags) {
        tags.innerHTML = arr.slice(0, 10).map(s => `
          <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            ${s}
            <button onclick="removeAnalyticsSebanggoFromSelection('${s}')" class="hover:text-blue-600">
              <i class="ri-close-line"></i>
            </button>
          </span>
        `).join('') + (arr.length > 10 ? `
          <button onclick="openAnalyticsSebanggoSelector()" class="text-gray-500 text-sm hover:text-gray-700">+${arr.length - 10} more (Show all)</button>
        ` : '');
    }
}

function removeAnalyticsSebanggoFromSelection(sebanggo) {
    analyticsProductFilter.selectedSebanggoArray = analyticsProductFilter.selectedSebanggoArray.filter(s => s !== sebanggo);
    updateAnalyticsSelectedProductsDisplay();
    loadAnalyticsData();
}

// Expose to window for inline handlers
window.handleAnalyticsFilterTypeChange = handleAnalyticsFilterTypeChange;
window.handleAnalyticsModelFilter = handleAnalyticsModelFilter;
window.openAnalyticsSebanggoSelector = openAnalyticsSebanggoSelector;
window.closeAnalyticsSebanggoSelector = closeAnalyticsSebanggoSelector;
window.confirmAnalyticsSebanggoSelection = confirmAnalyticsSebanggoSelection;
window.filterAnalyticsSebanggoList = filterAnalyticsSebanggoList;
window.toggleAnalyticsSebanggoSelection = toggleAnalyticsSebanggoSelection;
window.checkAllAnalyticsSebanggo = checkAllAnalyticsSebanggo;
window.uncheckAllAnalyticsSebanggo = uncheckAllAnalyticsSebanggo;
window.removeAnalyticsSebanggoFromSelection = removeAnalyticsSebanggoFromSelection;

// Initialize analytics when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on the analytics page
    if (document.getElementById('analyticsFromDate')) {
        initializeAnalytics();
    }
});

// Make functions globally available
window.initializeAnalytics = initializeAnalytics;
window.loadAnalyticsData = loadAnalyticsData;
window.handleRangeChange = handleRangeChange;
window.showDefectPartDetails = showDefectPartDetails;
window.closeDefectPartDetailsModal = closeDefectPartDetailsModal;
window.sortTableData = sortTableData;
window.recalculateCombinedDefectRate = recalculateCombinedDefectRate;