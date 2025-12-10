// Factory Status Module
// Real-time factory production progress visualization



// Global state for factory status
let factoryStatusState = {
    selectedFactory: 'all',
    selectedDate: new Date().toISOString().split('T')[0],
    chartInstance: null,
    refreshInterval: null,
    factories: []
};

// ============================================
// INITIALIZATION
// ============================================
async function initializeFactoryStatus() {
    console.log('🏭 Initializing Factory Status...');
    
    // Load factories
    await loadFactoryStatusFactories();
    
    // Setup event listeners
    setupFactoryStatusEventListeners();
    
    // Initial load
    await loadFactoryStatusData();
    
    // Start auto-refresh (every 60 seconds)
    startFactoryStatusAutoRefresh();
    
    console.log('✅ Factory Status initialized');
}

function setupFactoryStatusEventListeners() {
    const factorySelect = document.getElementById('factoryStatusFactory');
    const dateInput = document.getElementById('factoryStatusDate');
    
    if (factorySelect) {
        factorySelect.addEventListener('change', async (e) => {
            factoryStatusState.selectedFactory = e.target.value;
            await loadFactoryStatusData();
        });
    }
    
    if (dateInput) {
        dateInput.addEventListener('change', async (e) => {
            factoryStatusState.selectedDate = e.target.value;
            await loadFactoryStatusData();
        });
    }
}

// ============================================
// DATA LOADING
// ============================================
async function loadFactoryStatusFactories() {
    try {
        // Fetch from masterDB to get complete factory list (same as planner)
        const response = await fetch(BASE_URL + 'api/masterdb/factories');
        const result = await response.json();
        
        if (result.success && result.data) {
            factoryStatusState.factories = result.data;
        } else {
            // Fallback factory list
            factoryStatusState.factories = ['倉知', '肥田瀬', '第二工場', '天徳', 'SCNA', 'NFH', '小瀬'];
        }
        
        renderFactoryStatusDropdown();
    } catch (error) {
        console.error('Error loading factories:', error);
        factoryStatusState.factories = ['倉知', '肥田瀬', '第二工場', '天徳', 'SCNA', 'NFH', '小瀬'];
        renderFactoryStatusDropdown();
    }
}

function renderFactoryStatusDropdown() {
    const factorySelect = document.getElementById('factoryStatusFactory');
    if (!factorySelect) return;
    
    factorySelect.innerHTML = `
        <option value="all">All Factories</option>
        ${factoryStatusState.factories.map(factory => 
            `<option value="${factory}">${factory}</option>`
        ).join('')}
    `;
}

async function loadFactoryStatusData() {
    console.log('📊 Loading factory status data...');
    showFactoryStatusLoading(true);
    
    try {
        const selectedFactory = factoryStatusState.selectedFactory;
        const selectedDate = factoryStatusState.selectedDate;
        
        // Fetch production goals and actual production in parallel
        const [goalsData, productionData] = await Promise.all([
            fetchProductionGoals(selectedFactory, selectedDate),
            fetchActualProduction(selectedFactory, selectedDate)
        ]);
        
        // Process and render data
        const chartData = processFactoryStatusData(goalsData, productionData);
        renderFactoryStatusChart(chartData);
        
        console.log('✅ Factory status data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading factory status data:', error);
        showFactoryStatusError();
    } finally {
        showFactoryStatusLoading(false);
    }
}

async function fetchProductionGoals(factory, date) {
    try {
        const params = new URLSearchParams();
        if (factory !== 'all') params.append('factory', factory);
        params.append('date', date);
        
        const response = await fetch(`${BASE_URL}api/production-goals/summary?${params}`);
        const result = await response.json();
        
        if (result.success) {
            return result.data || [];
        }
        return [];
    } catch (error) {
        console.error('Error fetching production goals:', error);
        return [];
    }
}

async function fetchActualProduction(factory, date) {
    try {
        const response = await fetch(`${BASE_URL}queries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dbName: 'submittedDB',
                collectionName: 'pressDB',
                aggregation: [
                    {
                        $match: {
                            Date: date,
                            ...(factory !== 'all' ? { 工場: factory } : {})
                        }
                    },
                    {
                        $group: {
                            _id: '$工場',
                            totalQuantity: { $sum: '$Process_Quantity' }
                        }
                    }
                ]
            })
        });
        
        const data = await response.json();
        return data || [];
    } catch (error) {
        console.error('Error fetching actual production:', error);
        return [];
    }
}

function processFactoryStatusData(goalsData, productionData) {
    // If specific factory selected, return single factory data
    if (factoryStatusState.selectedFactory !== 'all') {
        const factory = factoryStatusState.selectedFactory;
        const goal = goalsData.find(g => g._id === factory);
        const production = productionData.find(p => p._id === factory);
        
        return [{
            factory: factory,
            goal: goal?.totalTargetQuantity || 0,
            current: production?.totalQuantity || 0,
            percentage: goal?.totalTargetQuantity > 0 
                ? Math.round((production?.totalQuantity || 0) / goal.totalTargetQuantity * 100) 
                : 0
        }];
    }
    
    // All factories - combine data
    const factoryMap = {};
    
    // Add goals
    goalsData.forEach(goal => {
        if (!factoryMap[goal._id]) {
            factoryMap[goal._id] = { factory: goal._id, goal: 0, current: 0 };
        }
        factoryMap[goal._id].goal = goal.totalTargetQuantity || 0;
    });
    
    // Add production
    productionData.forEach(prod => {
        if (!factoryMap[prod._id]) {
            factoryMap[prod._id] = { factory: prod._id, goal: 0, current: 0 };
        }
        factoryMap[prod._id].current = prod.totalQuantity || 0;
    });
    
    // Calculate percentages and sort by factory order
    const result = Object.values(factoryMap).map(item => ({
        ...item,
        percentage: item.goal > 0 ? Math.round((item.current / item.goal) * 100) : 0
    }));
    
    // Sort by factory order (same as screenshot)
    const factoryOrder = ['倉知', '肥田瀬', '第二工場', '天徳'];
    result.sort((a, b) => {
        const aIndex = factoryOrder.indexOf(a.factory);
        const bIndex = factoryOrder.indexOf(b.factory);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
    
    return result;
}

// ============================================
// CHART RENDERING
// ============================================
function renderFactoryStatusChart(data) {
    const chartContainer = document.getElementById('factoryStatusChart');
    if (!chartContainer) return;
    
    // Destroy previous chart instance
    if (factoryStatusState.chartInstance) {
        factoryStatusState.chartInstance.dispose();
    }
    
    // Initialize ECharts
    factoryStatusState.chartInstance = echarts.init(chartContainer);
    
    // Prepare data
    const factories = data.map(d => d.factory);
    const currentProduction = data.map(d => d.current);
    const goals = data.map(d => d.goal);
    const percentages = data.map(d => d.percentage);
    
    // Calculate max Y-axis value (highest goal + 20% padding)
    const maxGoal = Math.max(...goals, ...currentProduction);
    const maxYAxis = maxGoal > 0 ? Math.ceil(maxGoal * 1.2 / 1000) * 1000 : 5000;
    
    // Chart options
    const option = {
        backgroundColor: 'transparent',
        grid: {
            left: '5%',
            right: '5%',
            bottom: '15%',
            top: '10%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: factories,
            axisLabel: {
                fontSize: 14,
                fontWeight: 'bold',
                color: '#374151',
                interval: 0
            },
            axisLine: {
                lineStyle: {
                    color: '#e5e7eb'
                }
            }
        },
        yAxis: {
            type: 'value',
            max: maxYAxis,
            axisLabel: {
                fontSize: 12,
                color: '#6b7280'
            },
            splitLine: {
                lineStyle: {
                    color: '#f3f4f6',
                    type: 'dashed'
                }
            }
        },
        series: [
            {
                name: 'Current Production',
                type: 'bar',
                data: currentProduction.map((value, index) => ({
                    value: value,
                    itemStyle: {
                        color: '#60a5fa', // Blue-400
                        borderRadius: [4, 4, 0, 0]
                    },
                    label: {
                        show: true,
                        position: 'inside',
                        formatter: (params) => {
                            return `{value|${params.value} pcs}\n{percentage|${percentages[params.dataIndex]}%}`;
                        },
                        rich: {
                            value: {
                                fontSize: 14,
                                fontWeight: 'bold',
                                color: '#ffffff',
                                lineHeight: 20
                            },
                            percentage: {
                                fontSize: 12,
                                color: '#ffffff',
                                lineHeight: 18
                            }
                        }
                    }
                })),
                barWidth: '50%',
                animationDuration: 1000,
                animationEasing: 'cubicOut'
            },
            {
                name: 'Goal',
                type: 'line',
                data: goals.map((value, index) => {
                    // Only show goal line if goal exists
                    return value > 0 ? value : null;
                }),
                lineStyle: {
                    color: '#ef4444', // Red-500
                    width: 3,
                    type: 'solid'
                },
                symbol: 'circle',
                symbolSize: 0,
                label: {
                    show: true,
                    position: 'top',
                    formatter: (params) => {
                        return params.value > 0 ? `Goal: ${params.value}` : '';
                    },
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: '#ef4444',
                    backgroundColor: '#ffffff',
                    padding: [4, 8],
                    borderRadius: 4,
                    shadowBlur: 4,
                    shadowColor: 'rgba(0, 0, 0, 0.1)'
                },
                z: 10
            }
        ],
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: (params) => {
                const index = params[0].dataIndex;
                const factory = factories[index];
                const current = currentProduction[index];
                const goal = goals[index];
                const percentage = percentages[index];
                
                let html = `<div class="p-2">
                    <div class="font-bold mb-2">${factory}</div>
                    <div class="text-blue-600">Current: ${current} pcs</div>`;
                
                if (goal > 0) {
                    html += `<div class="text-red-600">Goal: ${goal} pcs</div>
                    <div class="text-gray-600">Progress: ${percentage}%</div>`;
                } else {
                    html += `<div class="text-yellow-600">No goal set</div>`;
                }
                
                html += `</div>`;
                return html;
            },
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            textStyle: {
                color: '#374151'
            }
        }
    };
    
    factoryStatusState.chartInstance.setOption(option);
    
    // Responsive resize
    window.addEventListener('resize', () => {
        if (factoryStatusState.chartInstance) {
            factoryStatusState.chartInstance.resize();
        }
    });
}

// ============================================
// AUTO REFRESH
// ============================================
function startFactoryStatusAutoRefresh() {
    // Clear existing interval
    if (factoryStatusState.refreshInterval) {
        clearInterval(factoryStatusState.refreshInterval);
    }
    
    // Refresh every 60 seconds (1 minute)
    factoryStatusState.refreshInterval = setInterval(async () => {
        console.log('🔄 Auto-refreshing factory status...');
        await loadFactoryStatusData();
    }, 60000);
}

function stopFactoryStatusAutoRefresh() {
    if (factoryStatusState.refreshInterval) {
        clearInterval(factoryStatusState.refreshInterval);
        factoryStatusState.refreshInterval = null;
    }
}

// ============================================
// UI HELPERS
// ============================================
function showFactoryStatusLoading(show) {
    const loader = document.getElementById('factoryStatusLoader');
    const chart = document.getElementById('factoryStatusChart');
    
    if (loader) loader.classList.toggle('hidden', !show);
    if (chart) chart.classList.toggle('opacity-50', show);
}

function showFactoryStatusError() {
    const chartContainer = document.getElementById('factoryStatusChart');
    if (!chartContainer) return;
    
    chartContainer.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="text-center">
                <i class="ri-error-warning-line text-6xl text-red-500 mb-4"></i>
                <p class="text-gray-600 dark:text-gray-400">Failed to load factory status data</p>
                <button onclick="loadFactoryStatusData()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Retry
                </button>
            </div>
        </div>
    `;
}

// ============================================
// CLEANUP
// ============================================
function cleanupFactoryStatus() {
    stopFactoryStatusAutoRefresh();
    
    if (factoryStatusState.chartInstance) {
        factoryStatusState.chartInstance.dispose();
        factoryStatusState.chartInstance = null;
    }
}

// Export for use in app.js
window.initializeFactoryStatus = initializeFactoryStatus;
window.cleanupFactoryStatus = cleanupFactoryStatus;
