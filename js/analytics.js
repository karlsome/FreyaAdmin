/**
 * Enhanced Analytics System for FreyaAdmin
 * Provides comprehensive insights from kensaDB with date range controls
 */



// Global variables for analytics
let analyticsData = [];
let currentAnalyticsRange = 'last30'; // Default range
let analyticsCharts = {}; // Store chart instances

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
    document.getElementById('refreshAnalyticsBtn').addEventListener('click', loadAnalyticsData);
    document.getElementById('analyticsFromDate').addEventListener('change', loadAnalyticsData);
    document.getElementById('analyticsToDate').addEventListener('change', loadAnalyticsData);
    document.getElementById('analyticsRangeSelect').addEventListener('change', handleRangeChange);
    document.getElementById('analyticsFactoryFilter').addEventListener('change', loadAnalyticsData);
    document.getElementById('analyticsCollectionFilter').addEventListener('change', handleCollectionChange);
    
    // Load factory options first, then load data
    loadFactoryOptions().then(() => {
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
    
    // Reset factory filter when collection changes
    document.getElementById('analyticsFactoryFilter').value = '';
    
    // Load new factory options for the selected collection
    loadFactoryOptions().then(() => {
        loadAnalyticsData();
    });
}

/**
 * Load factory options for the filter dropdown
 */
async function loadFactoryOptions() {
    try {
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const factoryAccess = getFactoryAccessForUser();
        const selectedCollection = document.getElementById('analyticsCollectionFilter')?.value || 'kensaDB';
        
        const response = await fetch(BASE_URL + 'api/approval-factories', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                collectionName: selectedCollection,
                userRole: currentUser.role,
                factoryAccess: factoryAccess
            })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success && result.factories) {
                updateFactoryFilterOptions(result.factories);
            }
        } else {
            // Fallback: load from data
            console.log('Factory API not available, will load from data');
        }
        
    } catch (error) {
        console.error('Error loading factory options:', error);
        // Fallback will be handled when data loads
    }
}

/**
 * Update factory filter dropdown options
 */
function updateFactoryFilterOptions(factories) {
    const factorySelect = document.getElementById('analyticsFactoryFilter');
    if (!factorySelect) return;
    
    // Save the currently selected value
    const currentSelection = factorySelect.value;
    
    // Clear existing options (except "All Factories")
    factorySelect.innerHTML = '<option value="">全工場</option>';
    
    // Add factory options
    factories.forEach(factory => {
        const option = document.createElement('option');
        option.value = factory;
        option.textContent = factory;
        factorySelect.appendChild(option);
    });
    
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
            throw new Error('Please select both from and to dates');
        }
        
        if (new Date(fromDate) > new Date(toDate)) {
            throw new Error('From date cannot be later than to date');
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
                const factories = result.data.factoryStats.map(f => f._id).filter(f => f);
                updateFactoryFilterOptions(factories);
            }
        }
        
        // Update UI with the date range, factory filter, and collection
        updateDateRangeDisplay(fromDate, toDate, selectedFactory, selectedCollection);
        
        // Render all analytics
        renderAnalytics();
        
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
    if (!analyticsData || !analyticsData.summary || analyticsData.summary.length === 0) {
        showAnalyticsErrorState('No data available for the selected date range');
        return;
    }
    
    console.log('📊 Rendering analytics with data:', analyticsData);
    
    try {
        // Render summary cards
        renderSummaryCards();
        
        // Render charts with proper error handling
        renderProductionTrendChart();
        renderQualityTrendChart();
        renderFactoryComparisonChart();
        renderDefectDistributionChart();
        renderWorkerPerformanceChart();
        renderProcessEfficiencyChart();
        renderTemperatureTrendChart();
        renderHumidityTrendChart();
        
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
 * Render summary statistics cards
 */
function renderSummaryCards() {
    // Fix: Handle array structure from server (summary is an array with summary[0] containing the data)
    const summary = analyticsData.summary && analyticsData.summary[0] ? analyticsData.summary[0] : {};
    
    console.log('📊 Summary data:', summary);
    
    document.getElementById('totalProductionCount').textContent = summary.totalProduction?.toLocaleString() || '0';
    document.getElementById('totalDefectsCount').textContent = summary.totalDefects?.toLocaleString() || '0';
    document.getElementById('avgDefectRateCount').textContent = `${summary.avgDefectRate?.toFixed(2) || '0.00'}%`;
    document.getElementById('totalFactoriesCount').textContent = summary.totalFactories || '0';
    document.getElementById('totalWorkersCount').textContent = summary.totalWorkers || '0';
    document.getElementById('avgCycleTimeCount').textContent = `${summary.avgCycleTime?.toFixed(1) || '0.0'}分`;
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
 * Render defect distribution chart (dynamic for all collection types)
 */
function renderDefectDistributionChart() {
    const ctx = document.getElementById('defectDistributionChart').getContext('2d');
    const defectAnalysis = analyticsData.defectAnalysis || [];
    
    console.log('📊 Defect analysis data:', defectAnalysis);
    
    if (analyticsCharts.defectDistribution) {
        analyticsCharts.defectDistribution.destroy();
    }
    
    let counterData = [];
    let labels = [];
    
    if (defectAnalysis.length > 0) {
        const analysis = defectAnalysis[0];
        
        // Use metadata from server if available, otherwise fallback to counter-based
        const defectLabels = analysis.defectLabels || ['カウンター1', 'カウンター2', 'カウンター3', 'カウンター4', 'カウンター5', 'カウンター6', 'カウンター7', 'カウンター8', 'カウンター9', 'カウンター10', 'カウンター11', 'カウンター12'];
        const defectFields = analysis.defectFields || ['counter1Total', 'counter2Total', 'counter3Total', 'counter4Total', 'counter5Total', 'counter6Total', 'counter7Total', 'counter8Total', 'counter9Total', 'counter10Total', 'counter11Total', 'counter12Total'];
        
        // Build chart data using the field mappings
        for (let i = 0; i < defectFields.length; i++) {
            const fieldName = defectFields[i];
            const value = analysis[fieldName] || 0;
            
            if (value > 0) {
                labels.push(defectLabels[i]);
                counterData.push(value);
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
                title: {
                    display: true,
                    text: '不良分布 (プロセス別)'
                },
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

/**
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
        count.textContent = 'エラー';
    });
    
    console.error('Analytics Error:', message);
    
    // Hide loading spinner
    const loader = document.getElementById('analyticsLoader');
    if (loader) loader.style.display = 'none';
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