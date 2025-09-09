/**
 * SCNA Machine Downtime Analytics
 * Creates Gantt-style charts showing machine utilization over time
 */

// Global variables for machine analytics
let machineAnalyticsData = [];
let currentMachineFilters = {
    dateFrom: '',
    dateTo: '',
    selectedMachines: []
};
let machineChart = null;
let availableMachineOptions = [];

/**
 * Initialize SCNA Machine Analytics
 */
function initializeSCNAMachineAnalytics() {
    console.log('🚀 Initializing SCNA Machine Analytics...');
    
    // Set default date range (last 7 days)
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    document.getElementById('scnaMachineDateFrom').value = sevenDaysAgo.toISOString().split('T')[0];
    document.getElementById('scnaMachineDateTo').value = today.toISOString().split('T')[0];
    
    // Event listeners
    document.getElementById('refreshSCNAMachineBtn').addEventListener('click', loadSCNAMachineData);
    document.getElementById('scnaMachineDateFrom').addEventListener('change', applyMachineFilters);
    document.getElementById('scnaMachineDateTo').addEventListener('change', applyMachineFilters);
    
    // Load initial data and machine options
    loadMachineOptions();
}

/**
 * Load machine options using the same logic as Work Order assignees
 */
async function loadMachineOptions() {
    try {
        // Load machine options from the work order assignee API
        const response = await fetch(`${BASE_URL}api/workorders/assignees`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load machine options: ${response.status}`);
        }

        const result = await response.json();
        availableMachineOptions = result.success ? result.data : [];
        
        console.log('✅ Machine options loaded:', availableMachineOptions);
        
        // Setup machine checkboxes
        setupMachineCheckboxes();
        
        // Load initial data
        loadSCNAMachineData();
        
    } catch (error) {
        console.error('❌ Error loading machine options:', error);
        availableMachineOptions = [];
        
        // Fallback: load data anyway and extract machines from it
        loadSCNAMachineData();
    }
}

/**
 * Setup machine checkboxes with persistence
 */
function setupMachineCheckboxes() {
    const checkboxContainer = document.getElementById('scnaMachineCheckboxes');
    
    // Load saved preferences
    const savedMachines = JSON.parse(localStorage.getItem('selectedMachines') || '[]');
    
    // If no saved preferences, select all machines by default
    const selectedMachines = savedMachines.length > 0 ? savedMachines : availableMachineOptions;
    
    // Create checkboxes
    checkboxContainer.innerHTML = availableMachineOptions.map(machine => {
        const isChecked = selectedMachines.includes(machine);
        return `
            <div class="flex items-center">
                <input type="checkbox" id="machine_${machine.replace(/[^a-zA-Z0-9]/g, '')}" 
                       value="${machine}" ${isChecked ? 'checked' : ''} 
                       onchange="saveMachineSelection()" class="mr-2">
                <label for="machine_${machine.replace(/[^a-zA-Z0-9]/g, '')}" class="text-sm text-gray-700 cursor-pointer">${machine}</label>
            </div>
        `;
    }).join('');
    
    // Update "All" checkbox state
    updateAllMachinesCheckbox();
}

/**
 * Save machine selection to localStorage
 */
function saveMachineSelection() {
    const checkboxes = document.querySelectorAll('#scnaMachineCheckboxes input[type="checkbox"]');
    const selected = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    
    localStorage.setItem('selectedMachines', JSON.stringify(selected));
    currentMachineFilters.selectedMachines = selected;
    
    // Update "All" checkbox state
    updateAllMachinesCheckbox();
    
    // Apply filters
    applyMachineFilters();
}

/**
 * Toggle all machines selection
 */
function toggleAllMachines(selectAll) {
    const checkboxes = document.querySelectorAll('#scnaMachineCheckboxes input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = selectAll;
    });
    
    // Update All checkbox
    const allCheckbox = document.getElementById('scnaMachineAll');
    if (allCheckbox) {
        allCheckbox.checked = selectAll;
    }
    
    saveMachineSelection();
}

/**
 * Update "All" checkbox state based on individual selections
 */
function updateAllMachinesCheckbox() {
    const checkboxes = document.querySelectorAll('#scnaMachineCheckboxes input[type="checkbox"]');
    const allCheckbox = document.getElementById('scnaMachineAll');
    
    if (allCheckbox && checkboxes.length > 0) {
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        allCheckbox.checked = checkedCount === checkboxes.length;
        allCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
}

/**
 * Apply machine filters
 */
function applyMachineFilters() {
    console.log('🔍 Applying machine filters...');
    loadSCNAMachineData();
}

/**
 * Get selected machines
 */
function getSelectedMachines() {
    const checkboxes = document.querySelectorAll('#scnaMachineCheckboxes input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}
/**
 * Load SCNA machine data from database
 */
async function loadSCNAMachineData() {
    try {
        showSCNAMachineLoadingState();
        
        const fromDate = document.getElementById('scnaMachineDateFrom').value;
        const toDate = document.getElementById('scnaMachineDateTo').value;
        const selectedMachines = getSelectedMachines();
        
        console.log('📊 Loading SCNA machine data...', { fromDate, toDate, selectedMachines });
        
        // If no machines selected, show empty state
        if (selectedMachines.length === 0) {
            showSCNAMachineEmptyState();
            return;
        }
        
        const response = await fetch(`${BASE_URL}api/scna/machine-analytics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dateFrom: fromDate,
                dateTo: toDate,
                machine: 'all' // Load all data, filter on frontend
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to load machine data');
        }

        machineAnalyticsData = result.data || [];
        console.log('✅ SCNA machine data loaded:', machineAnalyticsData.length, 'records');
        
        // Update machine filter options if not loaded yet
        if (availableMachineOptions.length === 0) {
            updateMachineFilterOptionsFromData();
        }
        
        // Render the machine downtime chart
        renderMachineDowntimeChart();
        
    } catch (error) {
        console.error('❌ Error loading SCNA machine data:', error);
        showSCNAMachineErrorState(error.message);
    }
}

/**
 * Update machine filter options from loaded data (fallback)
 */
function updateMachineFilterOptionsFromData() {
    const machines = [...new Set(machineAnalyticsData.map(item => item.設備))].filter(Boolean);
    
    if (machines.length > 0 && availableMachineOptions.length === 0) {
        availableMachineOptions = machines;
        setupMachineCheckboxes();
    }
}

/**
 * Show empty state when no machines selected
 */
function showSCNAMachineEmptyState() {
    const chartContainer = document.getElementById('machineDowntimeChart');
    chartContainer.innerHTML = `
        <div class="flex items-center justify-center h-96 text-gray-500">
            <div class="text-center">
                <i class="ri-checkbox-blank-line text-4xl mb-2"></i>
                <p>No machines selected</p>
                <p class="text-sm">Please select at least one machine to view the analytics</p>
            </div>
        </div>
    `;
}

/**
 * Render machine downtime Gantt chart
 */
function renderMachineDowntimeChart() {
    const chartContainer = document.getElementById('machineDowntimeChart');
    
    if (!chartContainer) {
        console.error('Machine downtime chart container not found');
        return;
    }
    
    // Filter data based on selected machines
    const selectedMachines = getSelectedMachines();
    let filteredData = machineAnalyticsData;
    
    if (selectedMachines.length > 0) {
        filteredData = machineAnalyticsData.filter(item => selectedMachines.includes(item.設備));
    }
    
    if (filteredData.length === 0) {
        chartContainer.innerHTML = `
            <div class="flex items-center justify-center h-96 text-gray-500">
                <div class="text-center">
                    <i class="ri-calendar-line text-4xl mb-2"></i>
                    <p>No machine data found for the selected period</p>
                </div>
            </div>
        `;
        return;
    }

    // Get unique machines from filtered data
    const machines = selectedMachines.filter(machine => 
        filteredData.some(item => item.設備 === machine)
    );
    
    // Clear container and create charts for each machine
    chartContainer.innerHTML = '';
    
    machines.forEach(machine => {
        // Create container for this machine
        const machineContainer = document.createElement('div');
        machineContainer.className = 'mb-8';
        machineContainer.innerHTML = `
            <div class="bg-yellow-200 text-gray-700 px-4 py-2 rounded-t font-semibold text-center">
                ${machine}
            </div>
            <div id="chart-${machine.replace(/[^a-zA-Z0-9]/g, '')}" style="width: 100%; height: 400px; border: 1px solid #e5e7eb; border-top: none;"></div>
        `;
        chartContainer.appendChild(machineContainer);
        
        // Initialize chart for this machine
        const chartId = `chart-${machine.replace(/[^a-zA-Z0-9]/g, '')}`;
        const chartElement = document.getElementById(chartId);
        
        if (chartElement) {
            renderMachineChart(machine, filteredData.filter(item => item.設備 === machine), chartElement);
        }
    });
}

function renderMachineChart(machineName, machineData, chartElement) {
    const chart = echarts.init(chartElement);
    
    // Create time intervals (5:00 AM to 3:15 PM in 15-min intervals)
    const timeIntervals = [];
    for (let hour = 5; hour <= 15; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            if (hour === 15 && minute > 15) break; // Stop at 15:15
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            timeIntervals.push(timeStr);
        }
    }
    
    // Get unique dates and sort them
    const dates = [...new Set(machineData.map(item => item.Date))].sort();
    
    // Create the basic heatmap data structure
    const heatmapData = [];
    const labelData = []; // Separate array for labels to avoid duplication
    
    dates.forEach((date, dateIndex) => {
        const dayData = machineData.filter(item => item.Date === date);
        
        // First pass: create basic heatmap data for each 15-min interval
        const rowData = [];
        timeIntervals.forEach((timeInterval, timeIndex) => {
            // Default to downtime
            let color = '#6B7280'; // Gray for downtime
            let productName = '';
            let status = 'Downtime';
            let workerName = '';
            
            // Check if this time interval has any activity
            const intervalTime = parseTimeToMinutes(timeInterval);
            
            dayData.forEach(workSession => {
                const workStart = parseTimeToMinutes(workSession.Time_start);
                const workEnd = parseTimeToMinutes(workSession.Time_end);
                
                // Check if current interval is within work time
                if (intervalTime >= workStart && intervalTime < workEnd) {
                    // Check if it's break time
                    let isBreakTime = false;
                    if (workSession.Break_Time_Data) {
                        ['break1', 'break2', 'break3', 'break4'].forEach(breakKey => {
                            const breakData = workSession.Break_Time_Data[breakKey];
                            if (breakData && breakData.start && breakData.end) {
                                const breakStart = parseTimeToMinutes(breakData.start);
                                const breakEnd = parseTimeToMinutes(breakData.end);
                                if (intervalTime >= breakStart && intervalTime < breakEnd) {
                                    isBreakTime = true;
                                }
                            }
                        });
                    }
                    
                    if (isBreakTime) {
                        color = '#EF4444'; // Red for break
                        status = 'Break';
                        productName = 'Break Time';
                        workerName = workSession.Worker_Name || 'N/A';
                    } else {
                        color = '#3B82F6'; // Blue for working
                        status = 'Production';
                        productName = workSession.品番 || 'Production';
                        workerName = workSession.Worker_Name || 'N/A';
                    }
                }
            });
            
            rowData.push({
                timeIndex,
                color,
                productName,
                status,
                timeInterval,
                workerName
            });
        });
        
        // Second pass: group consecutive intervals with same product name
        const groupedSegments = [];
        let currentSegment = null;
        
        rowData.forEach((interval, index) => {
            if (interval.status === 'Production') {
                if (!currentSegment || 
                    currentSegment.productName !== interval.productName || 
                    currentSegment.endIndex !== index - 1) {
                    // Start new segment
                    if (currentSegment) {
                        groupedSegments.push(currentSegment);
                    }
                    currentSegment = {
                        startIndex: index,
                        endIndex: index,
                        productName: interval.productName,
                        color: interval.color,
                        status: interval.status
                    };
                } else {
                    // Extend current segment
                    currentSegment.endIndex = index;
                }
            } else {
                // Non-production interval, close current segment if any
                if (currentSegment) {
                    groupedSegments.push(currentSegment);
                    currentSegment = null;
                }
            }
        });
        
        // Close final segment if exists
        if (currentSegment) {
            groupedSegments.push(currentSegment);
        }
        
        // Third pass: create heatmap data and labels
        rowData.forEach((interval, timeIndex) => {
            // Add heatmap cell
            heatmapData.push({
                value: [timeIndex, dateIndex, 1],
                itemStyle: { color: interval.color },
                tooltip: {
                    formatter: `<div>
                        <div><strong>Machine:</strong> ${machineName}</div>
                        <div><strong>Date:</strong> ${date}</div>
                        <div><strong>Time:</strong> ${interval.timeInterval}</div>
                        <div><strong>Status:</strong> ${interval.status}</div>
                        ${interval.productName ? `<div><strong>Product:</strong> ${interval.productName}</div>` : ''}
                        ${(interval.status === 'Production' || interval.status === 'Break') && interval.workerName ? `<div><strong>Worker:</strong> ${interval.workerName}</div>` : ''}
                    </div>`
                }
            });
        });
        
        // Add labels for grouped segments
        groupedSegments.forEach(segment => {
            if (segment.status === 'Production') {
                const startTime = timeIntervals[segment.startIndex];
                const endTime = timeIntervals[segment.endIndex];
                const midIndex = Math.floor((segment.startIndex + segment.endIndex) / 2);
                
                labelData.push({
                    coord: [midIndex, dateIndex],
                    value: segment.productName,
                    textStyle: {
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 'bold',
                        align: 'center'
                    }
                });
            }
        });
    });
    
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                return params.data.tooltip.formatter;
            }
        },
        grid: {
            top: 40,
            bottom: 80,
            left: 100,
            right: 40
        },
        xAxis: {
            type: 'category',
            data: timeIntervals,
            axisLabel: {
                rotate: 45,
                fontSize: 10
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: '#e5e7eb'
                }
            }
        },
        yAxis: {
            type: 'category',
            data: dates,
            axisLabel: {
                fontSize: 12
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: '#e5e7eb'
                }
            }
        },
        series: [
            {
                name: 'Machine Status',
                type: 'heatmap',
                data: heatmapData,
                emphasis: {
                    itemStyle: {
                        borderColor: '#333',
                        borderWidth: 1
                    }
                },
                label: {
                    show: false // Disable default labels
                }
            },
            {
                name: 'Product Labels',
                type: 'scatter',
                coordinateSystem: 'cartesian2d',
                data: labelData.map(label => ({
                    value: [label.coord[0], label.coord[1]],
                    label: {
                        show: true,
                        position: 'inside',
                        formatter: label.value,
                        color: label.textStyle.color,
                        fontSize: label.textStyle.fontSize,
                        fontWeight: label.textStyle.fontWeight
                    }
                })),
                symbolSize: 0, // Hide the scatter points, only show labels
                tooltip: {
                    show: false
                }
            }
        ]
    };
    
    chart.setOption(option);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (chart) {
            chart.resize();
        }
    });
}

// Helper function to parse time string to minutes since midnight
function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Process machine data for Gantt chart format
 */
function processMachineDataForGantt(data) {
    const machines = [...new Set(data.map(item => item.設備))].filter(Boolean);
    const workingData = [];
    const breakData = [];
    const downtimeData = [];
    
    // Fixed shift times: 5:00 AM to 3:15 PM
    const SHIFT_START_HOUR = 5;
    const SHIFT_START_MINUTE = 0;
    const SHIFT_END_HOUR = 15;
    const SHIFT_END_MINUTE = 15;
    
    // Get all unique dates and sort them
    const dates = [...new Set(data.map(item => item.Date))].sort();
    
    // Process each date and machine combination
    dates.forEach(date => {
        machines.forEach((machine, machineIndex) => {
            // Create shift start/end times for this date
            const shiftStart = new Date(date);
            shiftStart.setHours(SHIFT_START_HOUR, SHIFT_START_MINUTE, 0, 0);
            
            const shiftEnd = new Date(date);
            shiftEnd.setHours(SHIFT_END_HOUR, SHIFT_END_MINUTE, 0, 0);
            
            // Get all work sessions for this machine on this date
            const machineWorkSessions = data.filter(item => 
                item.設備 === machine && item.Date === date
            ).sort((a, b) => a.Time_start.localeCompare(b.Time_start));
            
            // Create timeline segments array to track time periods
            const timeSegments = [];
            
            if (machineWorkSessions.length === 0) {
                // No work sessions - entire shift is downtime
                downtimeData.push({
                    name: 'No Work',
                    value: [
                        machineIndex,
                        shiftStart.getTime(),
                        shiftEnd.getTime(),
                        (shiftEnd - shiftStart) / (1000 * 60 * 60),
                        'no-work'
                    ],
                    itemStyle: {
                        color: '#D1D5DB'
                    },
                    machineName: machine,
                    productName: 'No Work Scheduled',
                    worker: 'N/A',
                    startTime: '05:00',
                    endTime: '15:15',
                    duration: '10.25',
                    statusText: 'No Work'
                });
                return;
            }
            
            let currentTime = shiftStart.getTime();
            
            machineWorkSessions.forEach(session => {
                const workStart = new Date(`${date}T${session.Time_start}:00`);
                const workEnd = new Date(`${date}T${session.Time_end}:00`);
                
                // Clamp work times to shift boundaries
                const clampedWorkStart = Math.max(workStart.getTime(), shiftStart.getTime());
                const clampedWorkEnd = Math.min(workEnd.getTime(), shiftEnd.getTime());
                
                // Add downtime before work starts (if any)
                if (currentTime < clampedWorkStart) {
                    const downtimeHours = (clampedWorkStart - currentTime) / (1000 * 60 * 60);
                    downtimeData.push({
                        name: 'Downtime',
                        value: [
                            machineIndex,
                            currentTime,
                            clampedWorkStart,
                            downtimeHours,
                            'downtime'
                        ],
                        itemStyle: {
                            color: '#9CA3AF'
                        },
                        machineName: machine,
                        productName: 'Machine Idle',
                        worker: 'N/A',
                        startTime: new Date(currentTime).toTimeString().substr(0, 5),
                        endTime: new Date(clampedWorkStart).toTimeString().substr(0, 5),
                        duration: downtimeHours.toFixed(1),
                        statusText: 'Downtime'
                    });
                }
                
                // Add working time
                const workHours = (clampedWorkEnd - clampedWorkStart) / (1000 * 60 * 60);
                workingData.push({
                    name: 'Working',
                    value: [
                        machineIndex,
                        clampedWorkStart,
                        clampedWorkEnd,
                        workHours,
                        'working'
                    ],
                    itemStyle: {
                        color: '#3B82F6'
                    },
                    machineName: machine,
                    productName: session.品番 || 'N/A',
                    worker: session.Worker_Name || 'N/A',
                    startTime: session.Time_start,
                    endTime: session.Time_end,
                    duration: workHours.toFixed(1),
                    statusText: 'Production Work',
                    breakInfo: formatBreakInfo(session.Break_Time_Data)
                });
                
                // Add break times within this work session
                if (session.Break_Time_Data) {
                    ['break1', 'break2', 'break3', 'break4'].forEach(breakKey => {
                        const breakTime = session.Break_Time_Data[breakKey];
                        if (breakTime && breakTime.start && breakTime.end) {
                            const breakStart = new Date(`${date}T${breakTime.start}:00`);
                            const breakEnd = new Date(`${date}T${breakTime.end}:00`);
                            
                            // Only add break if it's within the work session and shift
                            if (breakStart.getTime() >= clampedWorkStart && 
                                breakEnd.getTime() <= clampedWorkEnd &&
                                breakStart.getTime() >= shiftStart.getTime() &&
                                breakEnd.getTime() <= shiftEnd.getTime()) {
                                
                                const breakHours = (breakEnd - breakStart) / (1000 * 60 * 60);
                                breakData.push({
                                    name: 'Break',
                                    value: [
                                        machineIndex,
                                        breakStart.getTime(),
                                        breakEnd.getTime(),
                                        breakHours,
                                        'break'
                                    ],
                                    itemStyle: {
                                        color: '#EF4444'
                                    },
                                    machineName: machine,
                                    productName: 'Break Time',
                                    worker: session.Worker_Name || 'N/A',
                                    startTime: breakTime.start,
                                    endTime: breakTime.end,
                                    duration: breakHours.toFixed(1),
                                    statusText: 'Break Time'
                                });
                            }
                        }
                    });
                }
                
                currentTime = Math.max(currentTime, clampedWorkEnd);
            });
            
            // Add final downtime if work ends before shift end
            if (currentTime < shiftEnd.getTime()) {
                const finalDowntimeHours = (shiftEnd.getTime() - currentTime) / (1000 * 60 * 60);
                downtimeData.push({
                    name: 'Downtime',
                    value: [
                        machineIndex,
                        currentTime,
                        shiftEnd.getTime(),
                        finalDowntimeHours,
                        'downtime'
                    ],
                    itemStyle: {
                        color: '#9CA3AF'
                    },
                    machineName: machine,
                    productName: 'Machine Idle',
                    worker: 'N/A',
                    startTime: new Date(currentTime).toTimeString().substr(0, 5),
                    endTime: '15:15',
                    duration: finalDowntimeHours.toFixed(1),
                    statusText: 'Downtime'
                });
            }
        });
    });
    
    return {
        machines,
        workingData,
        breakData,
        downtimeData
    };
}

/**
 * Custom render function for Gantt chart items
 */
function renderGanttItem(params, api) {
    const categoryIndex = api.value(0);
    const start = api.coord([api.value(1), categoryIndex]);
    const end = api.coord([api.value(2), categoryIndex]);
    const height = api.size([0, 1])[1] * 0.6;
    
    // Get color from data or use fallback
    let color = '#3B82F6'; // Default blue
    
    if (params.data && params.data.itemStyle && params.data.itemStyle.color) {
        color = params.data.itemStyle.color;
    } else if (params.seriesName === 'Break Time') {
        color = '#EF4444'; // Red for breaks
    } else if (params.seriesName === 'Downtime') {
        color = '#9CA3AF'; // Gray for downtime
    } else if (params.data && params.data.value && params.data.value[4] === 'no-work') {
        color = '#D1D5DB'; // Light gray for no work
    }
    
    const rectShape = echarts.graphic.clipRectByRect({
        x: start[0],
        y: start[1] - height / 2,
        width: end[0] - start[0],
        height: height
    }, {
        x: params.coordSys.x,
        y: params.coordSys.y,
        width: params.coordSys.width,
        height: params.coordSys.height
    });
    
    return rectShape && {
        type: 'rect',
        transition: ['shape'],
        shape: rectShape,
        style: {
            fill: color,
            stroke: '#fff',
            lineWidth: 1
        }
    };
}

/**
 * Format break time information for tooltip
 */
function formatBreakInfo(breakData) {
    if (!breakData) return null;
    
    const breaks = [];
    ['break1', 'break2', 'break3', 'break4'].forEach(breakKey => {
        const breakTime = breakData[breakKey];
        if (breakTime && breakTime.start && breakTime.end) {
            breaks.push(`${breakTime.start}-${breakTime.end}`);
        }
    });
    
    return breaks.length > 0 ? breaks.join(', ') : null;
}

/**
 * Show loading state
 */
function showSCNAMachineLoadingState() {
    const container = document.getElementById('machineDowntimeChart');
    if (container) {
        container.innerHTML = `
            <div class="flex items-center justify-center h-96 text-gray-500">
                <div class="text-center">
                    <i class="ri-loader-4-line animate-spin text-3xl mb-2"></i>
                    <p>Loading machine analytics...</p>
                </div>
            </div>
        `;
    }
}

/**
 * Show error state
 */
function showSCNAMachineErrorState(message) {
    const container = document.getElementById('machineDowntimeChart');
    if (container) {
        container.innerHTML = `
            <div class="flex items-center justify-center h-96 text-red-500">
                <div class="text-center">
                    <i class="ri-error-warning-line text-3xl mb-2"></i>
                    <p>Error loading machine data</p>
                    <p class="text-sm text-gray-600 mt-1">${message}</p>
                    <button onclick="loadSCNAMachineData()" class="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Retry
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * Export machine analytics data to CSV
 */
window.exportSCNAMachineData = function() {
    if (!machineAnalyticsData || machineAnalyticsData.length === 0) {
        alert('No machine data to export');
        return;
    }
    
    const fromDate = document.getElementById('scnaMachineDateFrom').value;
    const toDate = document.getElementById('scnaMachineDateTo').value;
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Machine Analytics Export\n";
    csvContent += `Period,${fromDate} to ${toDate}\n\n`;
    csvContent += "Machine,Date,Product,Worker,Start Time,End Time,Duration (h),Total Production,Break Minutes\n";
    
    machineAnalyticsData.forEach(item => {
        const duration = item.Total_Work_Hours || 0;
        const breakMinutes = item.Total_Break_Minutes || 0;
        
        csvContent += [
            item.設備 || '',
            item.Date || '',
            item.品番 || '',
            item.Worker_Name || '',
            item.Time_start || '',
            item.Time_end || '',
            duration,
            item.Total || 0,
            breakMinutes
        ].join(',') + '\n';
    });
    
    // Create and download file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `scna_machine_analytics_${fromDate}_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Show loading state
 */
function showSCNAMachineLoadingState() {
    const container = document.getElementById('machineDowntimeChart');
    container.innerHTML = '<div class="p-8 text-center text-gray-500"><i class="ri-loader-4-line animate-spin text-2xl mr-2"></i>Loading machine analytics...</div>';
}

/**
 * Show error state
 */
function showSCNAMachineErrorState(errorMessage) {
    const container = document.getElementById('machineDowntimeChart');
    container.innerHTML = `<div class="p-8 text-center text-red-500">
        <i class="ri-error-warning-line text-2xl mr-2"></i>
        Error: ${errorMessage}
        <br><button class="mt-2 text-blue-500 hover:underline" onclick="loadSCNAMachineData()">Retry</button>
    </div>`;
}

// Make functions globally available
window.initializeSCNAMachineAnalytics = initializeSCNAMachineAnalytics;
window.loadSCNAMachineData = loadSCNAMachineData;
window.toggleAllMachines = toggleAllMachines;
window.saveMachineSelection = saveMachineSelection;

console.log('✅ SCNA Machine Analytics module loaded');
