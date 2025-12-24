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
            let currentRecord = null; // Store the record for this interval
            
            // Check if this time interval has any activity
            const intervalTime = parseTimeToMinutes(timeInterval);
            
            dayData.forEach(workSession => {
                const workStart = parseTimeToMinutes(workSession.Time_start);
                const workEnd = parseTimeToMinutes(workSession.Time_end);
                
                // Check if current interval is within work time
                if (intervalTime >= workStart && intervalTime < workEnd) {
                    currentRecord = workSession; // Store the work session record
                    
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
                workerName,
                record: currentRecord // Include the record for click functionality
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
                },
                record: interval.record // Attach the record data for click events
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
                if (params.data && params.data.tooltip) {
                    return params.data.tooltip.formatter + '<div style="color: #666; margin-top: 4px; font-size: 12px;">💡 Click to view details</div>';
                }
                return params.data.tooltip?.formatter || '';
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
                },
                cursor: 'pointer' // Show pointer cursor to indicate clickability
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
    
    // Add click event handler for opening production record details
    chart.on('click', function(params) {
        // Only handle clicks on the heatmap series (not labels)
        if (params.seriesName === 'Machine Status' && params.data && params.data.record) {
            console.log('🎯 Chart clicked:', params.data.record);
            showMachineAnalyticsDetail(params.data.record);
        }
    });
    
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
/**
 * Export machine analytics data to CSV with advanced options
 */
window.exportSCNAMachineData = function() {
    if (!machineAnalyticsData || machineAnalyticsData.length === 0) {
        alert('No machine data to export');
        return;
    }
    
    const selectedMachines = getSelectedMachines();
    
    // Filter data based on selected machines
    let filteredData = machineAnalyticsData;
    if (selectedMachines.length > 0) {
        filteredData = machineAnalyticsData.filter(item => 
            selectedMachines.includes(item.設備)
        );
    }
    
    if (filteredData.length === 0) {
        alert('No data available for selected machines');
        return;
    }
    
    // Show advanced export options modal
    showMachineAnalyticsExportModal(filteredData);
};

/**
 * Show machine analytics export modal with field selection
 */
async function showMachineAnalyticsExportModal(data) {
    if (!data || data.length === 0) {
        alert("No data to export");
        return;
    }

    // Get all possible headers from the data using flattening
    const allHeaders = getMachineAnalyticsHeaders(data);
    const headers = Array.from(allHeaders).sort();
    
    // Load existing templates for machine analytics
    const templates = await loadMachineAnalyticsTemplates();

    // Create modal HTML
    const modalHTML = `
        <div id="machineAnalyticsExportModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900">Export Options</h3>
                    <p class="text-sm text-gray-600 mt-1">Select columns to export and set their order</p>
                </div>
                
                <div class="p-6 overflow-y-auto max-h-[65vh]">
                    <!-- Template Section -->
                    <div class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div class="flex flex-wrap items-center gap-3 mb-2">
                            <label class="text-sm font-medium text-blue-800">Templates:</label>
                            <select id="machineTemplateSelect" class="flex-1 min-w-[200px] px-3 py-1.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">-- Select Template --</option>
                                ${templates.map(t => `<option value="${t._id}">${t.templateName}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button id="machineTemplateBtn" class="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                                <i class="ri-save-line mr-1"></i>Save Template
                            </button>
                        </div>
                    </div>
                    
                    <!-- Search Section -->
                    <div class="mb-4">
                        <div class="relative">
                            <input type="text" id="machineHeaderSearch" 
                                   placeholder="Search headers..." 
                                   class="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        </div>
                    </div>
                    
                    <!-- Selection Controls -->
                    <div class="mb-4">
                        <div class="flex gap-2 mb-3">
                            <button id="machineSelectAllBtn" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Select All</button>
                            <span class="text-gray-300">|</span>
                            <button id="machineDeselectAllBtn" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Deselect All</button>
                            <span class="text-gray-300">|</span>
                            <button id="machineClearOrderBtn" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Clear Order</button>
                        </div>
                        <p class="text-xs text-gray-500 mb-2">
                            Enter order numbers. Only checked items will be exported.
                        </p>
                    </div>
                    
                    <!-- Headers organized by category -->
                    ${generateMachineHeaderCategories(headers)}
                </div>
                
                <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button id="machineCancelExportBtn" class="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button id="machineExecuteExportBtn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                        <i class="ri-download-line mr-1"></i>Execute Export
                    </button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('machineAnalyticsExportModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Set up event listeners
    setupMachineExportModalEventListeners(data, headers, templates);
}

/**
 * Generate header categories for better organization
 */
function generateMachineHeaderCategories(headers) {
    const categories = {
        'Basic Information': {
            order: 1,
            fields: ['Machine', 'Equipment', 'Date', 'Part Number', 'Background Number', 'Worker Name', 'Factory']
        },
        'Production Times': {
            order: 2,
            fields: ['Start Time', 'End Time', 'Total Work Hours']
        },
        'Production Data': {
            order: 3,
            fields: ['Total Production', 'Process Quantity', 'Material Lot', 'Cycle Time', 'Shot Count', 'Spare Parts Count']
        },
        'Quality Data': {
            order: 4,
            fields: ['Total NG', 'Internal Defects', 'Processing Defects', 'Other Defects', 'Spare']
        },
        'Break Times': {
            order: 5,
            fields: headers.filter(h => h.includes('break') || h.includes('Break'))
        },
        'Quality Checks': {
            order: 6,
            fields: headers.filter(h => h.includes('QualityCheck') || h.includes('2HourQualityCheck'))
        },
        'Work Orders': {
            order: 7,
            fields: headers.filter(h => h.includes('WorkOrder'))
        },
        'Maintenance': {
            order: 8,
            fields: headers.filter(h => h.includes('Maintenance') || h.includes('Trouble'))
        },
        'Images': {
            order: 9,
            fields: headers.filter(h => h.includes('Image') || h.includes('画像'))
        },
        'Other': {
            order: 10,
            fields: []
        }
    };

    // Map Japanese field names to English
    const fieldMapping = getMachineFieldMapping();
    
    // Categorize headers
    const categorizedHeaders = {};
    const usedHeaders = new Set();

    // First pass - assign headers to categories based on matching
    headers.forEach(header => {
        let assigned = false;
        for (const [categoryName, category] of Object.entries(categories)) {
            if (categoryName === 'Other') continue;
            
            const englishHeader = fieldMapping[header] || header;
            if (category.fields.some(field => 
                englishHeader.toLowerCase().includes(field.toLowerCase()) ||
                field.toLowerCase().includes(englishHeader.toLowerCase()) ||
                header.toLowerCase().includes(field.toLowerCase())
            )) {
                if (!categorizedHeaders[categoryName]) categorizedHeaders[categoryName] = [];
                categorizedHeaders[categoryName].push(header);
                usedHeaders.add(header);
                assigned = true;
                break;
            }
        }
        
        // If not assigned to any category, put in 'Other'
        if (!assigned) {
            if (!categorizedHeaders['Other']) categorizedHeaders['Other'] = [];
            categorizedHeaders['Other'].push(header);
        }
    });

    // Generate HTML for each category
    let categoryHTML = '';
    let overallIndex = 0;
    
    Object.entries(categories)
        .sort(([,a], [,b]) => a.order - b.order)
        .forEach(([categoryName, category]) => {
            const categoryHeaders = categorizedHeaders[categoryName] || [];
            if (categoryHeaders.length === 0) return;

            const isBasicProduction = categoryName === 'Basic Information' || categoryName === 'Production Times' || categoryName === 'Production Data';
            
            categoryHTML += `
                <div class="mb-4">
                    <h4 class="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <span>${categoryName}</span>
                        <button type="button" class="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 category-toggle" data-category="${categoryName}">
                            ${isBasicProduction ? 'Select All' : 'Toggle All'}
                        </button>
                    </h4>
                    <div class="grid grid-cols-1 gap-1 border border-gray-200 rounded-md p-3 max-h-60 overflow-y-auto category-headers" data-category="${categoryName}">
                        ${categoryHeaders.map(header => {
                            const englishName = fieldMapping[header] || header;
                            const isDefaultSelected = isBasicProduction;
                            return `
                                <div class="header-item flex items-center p-2 bg-gray-50 rounded border hover:bg-gray-100 transition-colors" data-header="${header}">
                                    <input type="checkbox" id="header_${overallIndex++}" ${isDefaultSelected ? 'checked' : ''} class="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500">
                                    <span class="flex-1 text-sm" title="${header}">
                                        <strong>${englishName}</strong>
                                        ${header !== englishName ? `<span class="text-xs text-gray-500"> (${header})</span>` : ''}
                                    </span>
                                    <input type="number" min="1" placeholder="-" 
                                           class="order-input w-14 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                           value="${isDefaultSelected ? (overallIndex) : ''}">
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });

    // Add overall count
    categoryHTML += `
        <div class="mt-2 text-xs text-gray-500">
            <span id="machineSelectedCount">${headers.filter((_, i) => i < 15).length}</span> / ${headers.length} columns selected
        </div>
    `;

    return categoryHTML;
}

/**
 * Get all machine analytics headers with flattening
 */
function getMachineAnalyticsHeaders(data) {
    const allHeaders = new Set();
    
    data.forEach(item => {
        const flattened = flattenMachineObject(item);
        Object.keys(flattened).forEach(key => allHeaders.add(key));
    });
    
    return allHeaders;
}

/**
 * Flatten machine object with dot notation for nested properties
 */
function flattenMachineObject(obj, prefix = '') {
    const flattened = {};
    
    for (const key in obj) {
        if (obj[key] === null || obj[key] === undefined) {
            flattened[prefix + key] = '';
            continue;
        }
        
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
            const nested = flattenMachineObject(obj[key], prefix + key + '.');
            Object.assign(flattened, nested);
        } else if (Array.isArray(obj[key])) {
            // Handle arrays by joining them or flattening if they contain objects
            if (obj[key].length > 0 && typeof obj[key][0] === 'object') {
                obj[key].forEach((item, index) => {
                    const nested = flattenMachineObject(item, prefix + key + `[${index}].`);
                    Object.assign(flattened, nested);
                });
            } else {
                flattened[prefix + key] = obj[key].join(', ');
            }
        } else {
            flattened[prefix + key] = obj[key];
        }
    }
    
    return flattened;
}

/**
 * Get field mapping from Japanese to English
 */
function getMachineFieldMapping() {
    return {
        // Basic fields
        '設備': 'Machine',
        '品番': 'Part Number',
        '背番号': 'Background Number',
        '工場': 'Factory',
        'Worker_Name': 'Worker Name',
        'Date': 'Date',
        'Time_start': 'Start Time',
        'Time_end': 'End Time',
        'Total_Work_Hours': 'Total Work Hours',
        
        // Production data
        'Total': 'Total Production',
        'Process_Quantity': 'Process Quantity',
        '材料ロット': 'Material Lot',
        'Cycle_Time': 'Cycle Time',
        'ショット数': 'Shot Count',
        'スペアからの部分数': 'Spare Parts Count',
        'Spare': 'Spare',
        
        // Quality data
        'Total_NG': 'Total NG',
        '疵引不良': 'Internal Defects',
        '加工不良': 'Processing Defects',
        'その他': 'Other Defects',
        
        // Break time data
        'Break_Time_Data.break1.start': 'Break 1 Start',
        'Break_Time_Data.break1.end': 'Break 1 End',
        'Break_Time_Data.break2.start': 'Break 2 Start',
        'Break_Time_Data.break2.end': 'Break 2 End',
        'Break_Time_Data.break3.start': 'Break 3 Start',
        'Break_Time_Data.break3.end': 'Break 3 End',
        'Break_Time_Data.break4.start': 'Break 4 Start',
        'Break_Time_Data.break4.end': 'Break 4 End',
        'Total_Break_Minutes': 'Total Break Minutes',
        'Total_Break_Hours': 'Total Break Hours',
        
        // Maintenance
        'Maintenance_Data.totalMinutes': 'Maintenance Minutes',
        'Maintenance_Data.totalHours': 'Maintenance Hours',
        'Total_Trouble_Minutes': 'Trouble Minutes',
        'Total_Trouble_Hours': 'Trouble Hours',
        
        // Quality checks
        '2HourQualityCheck.totalChecks': 'Quality Checks Count',
        '2HourQualityCheck.lastCheckTimestamp': 'Last Check Time',
        
        // Work orders
        'WorkOrder_Info.isWorkOrder': 'Is Work Order',
        'WorkOrder_Info.workOrderNumber': 'Work Order Number',
        'WorkOrder_Info.assignedTo': 'Assigned To',
        'WorkOrder_Info.status': 'Work Order Status',
        'WorkOrder_Info.sku': 'SKU',
        'WorkOrder_Info.ncProgramSent': 'NC Program Sent',
        
        // Images
        '初物チェック画像': 'First Cycle Check Image',
        '終物チェック画像': 'Last Cycle Check Image',
        '材料ラベル画像': 'Material Label Image',
        'materialLabelImageCount': 'Material Label Count',
        
        // Other
        'Comment': 'Comment',
        'shot1': 'Shot 1',
        'shot2': 'Shot 2'
    };
}

/**
 * Setup event listeners for machine export modal
 */
function setupMachineExportModalEventListeners(data, headers, templates) {
    const modal = document.getElementById('machineAnalyticsExportModal');
    const headersList = modal.querySelectorAll('.header-item');
    const searchInput = document.getElementById('machineHeaderSearch');
    const templateSelect = document.getElementById('machineTemplateSelect');

    // Update selected count
    function updateSelectedCount() {
        const checkedCount = modal.querySelectorAll('input[type="checkbox"]:checked').length;
        document.getElementById('machineSelectedCount').textContent = checkedCount;
    }

    // Get next available order number
    function getNextOrderNumber() {
        const orderInputs = modal.querySelectorAll('.order-input');
        let maxOrder = 0;
        orderInputs.forEach(input => {
            const val = parseInt(input.value);
            if (!isNaN(val) && val > maxOrder) {
                maxOrder = val;
            }
        });
        return maxOrder + 1;
    }

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        headersList.forEach(item => {
            const headerName = item.dataset.header.toLowerCase();
            const englishName = item.querySelector('strong').textContent.toLowerCase();
            const matches = headerName.includes(searchTerm) || englishName.includes(searchTerm);
            item.style.display = matches ? 'flex' : 'none';
        });
    });

    // Category toggle buttons
    modal.querySelectorAll('.category-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryName = e.target.dataset.category;
            const categoryContainer = modal.querySelector(`[data-category="${categoryName}"]`);
            const checkboxes = categoryContainer.querySelectorAll('input[type="checkbox"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            
            let nextOrder = getNextOrderNumber();
            checkboxes.forEach(checkbox => {
                const item = checkbox.closest('.header-item');
                const orderInput = item.querySelector('.order-input');
                
                if (allChecked) {
                    // Uncheck all
                    checkbox.checked = false;
                    orderInput.value = '';
                } else {
                    // Check all
                    if (!checkbox.checked) {
                        checkbox.checked = true;
                        orderInput.value = nextOrder++;
                    }
                }
            });
            updateSelectedCount();
        });
    });

    // Select/Deselect all buttons
    document.getElementById('machineSelectAllBtn').onclick = () => {
        let nextOrder = getNextOrderNumber();
        headersList.forEach(item => {
            if (item.style.display !== 'none') {
                const checkbox = item.querySelector('input[type="checkbox"]');
                const orderInput = item.querySelector('.order-input');
                if (!checkbox.checked) {
                    checkbox.checked = true;
                    orderInput.value = nextOrder++;
                }
            }
        });
        updateSelectedCount();
    };

    document.getElementById('machineDeselectAllBtn').onclick = () => {
        headersList.forEach(item => {
            if (item.style.display !== 'none') {
                const checkbox = item.querySelector('input[type="checkbox"]');
                const orderInput = item.querySelector('.order-input');
                checkbox.checked = false;
                orderInput.value = '';
            }
        });
        updateSelectedCount();
    };

    // Clear order button
    document.getElementById('machineClearOrderBtn').onclick = () => {
        modal.querySelectorAll('.order-input').forEach(input => {
            input.value = '';
        });
    };

    // Checkbox change listener
    modal.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const item = e.target.closest('.header-item');
            const orderInput = item.querySelector('.order-input');
            
            if (e.target.checked) {
                orderInput.value = getNextOrderNumber();
            } else {
                orderInput.value = '';
            }
            
            updateSelectedCount();
        }
    });

    // Template select change
    templateSelect.addEventListener('change', async (e) => {
        const templateId = e.target.value;
        if (!templateId) return;
        
        const template = templates.find(t => t._id === templateId);
        if (!template) return;
        
        // Apply template settings
        headersList.forEach(item => {
            item.querySelector('input[type="checkbox"]').checked = false;
            item.querySelector('.order-input').value = '';
        });
        
        // Apply template selections
        if (template.selectedHeaders && template.selectedHeaders.length > 0) {
            template.selectedHeaders.forEach(headerConfig => {
                const item = modal.querySelector(`[data-header="${headerConfig.name}"]`);
                if (item) {
                    item.querySelector('input[type="checkbox"]').checked = true;
                    if (headerConfig.order) {
                        item.querySelector('.order-input').value = headerConfig.order;
                    }
                }
            });
        }
        
        updateSelectedCount();
    });

    // Save template button
    document.getElementById('machineTemplateBtn').onclick = async () => {
        const templateName = prompt('Enter template name:');
        if (!templateName || !templateName.trim()) return;
        
        // Collect selected headers with their orders
        const selectedHeaders = [];
        headersList.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const orderInput = item.querySelector('.order-input');
            if (checkbox.checked) {
                selectedHeaders.push({
                    name: item.dataset.header,
                    order: orderInput.value ? parseInt(orderInput.value) : null
                });
            }
        });
        
        if (selectedHeaders.length === 0) {
            alert('Please select at least one column');
            return;
        }
        
        const templateData = {
            templateName: templateName.trim(),
            processType: 'MachineAnalytics',
            selectedHeaders: selectedHeaders,
            createdBy: 'User',
            createdAt: new Date().toISOString()
        };
        
        const success = await saveMachineAnalyticsTemplate(templateData);
        if (success) {
            alert('Template saved!');
            // Add to dropdown
            const option = document.createElement('option');
            option.value = templateData.templateName;
            option.textContent = templateData.templateName;
            templateSelect.appendChild(option);
        } else {
            alert('Failed to save template');
        }
    };

    // Cancel button
    document.getElementById('machineCancelExportBtn').onclick = () => {
        modal.remove();
    };

    // Execute export button
    document.getElementById('machineExecuteExportBtn').onclick = () => {
        // Collect selected headers with their orders
        const selectedHeadersWithOrder = [];
        
        headersList.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const orderInput = item.querySelector('.order-input');
            if (checkbox.checked) {
                selectedHeadersWithOrder.push({
                    name: item.dataset.header,
                    order: orderInput.value ? parseInt(orderInput.value) : 9999
                });
            }
        });

        if (selectedHeadersWithOrder.length === 0) {
            alert('Please select at least one column');
            return;
        }

        // Sort by order
        selectedHeadersWithOrder.sort((a, b) => a.order - b.order);
        const selectedHeaders = selectedHeadersWithOrder.map(h => h.name);

        modal.remove();

        // Execute the export with selected headers
        executeMachineAnalyticsExport(data, selectedHeaders);
    };

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Initialize selected count
    updateSelectedCount();
}

/**
 * Execute machine analytics CSV export with selected headers
 */
function executeMachineAnalyticsExport(data, selectedHeaders) {
    const fromDate = document.getElementById('scnaMachineDateFrom').value;
    const toDate = document.getElementById('scnaMachineDateTo').value;
    const fieldMapping = getMachineFieldMapping();
    
    // Flatten all data first
    const flattenedData = data.map(item => flattenMachineObject(item));
    
    // Create CSV content with English headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Machine Analytics Export\n";
    csvContent += `Period,${fromDate} to ${toDate}\n\n`;
    
    // Create header row with English names
    const englishHeaders = selectedHeaders.map(header => fieldMapping[header] || header);
    csvContent += englishHeaders.join(',') + '\n';
    
    // Add data rows
    flattenedData.forEach(row => {
        const values = selectedHeaders.map(header => {
            let value = row[header];
            if (value === null || value === undefined) {
                return "";
            }
            
            // Handle special formatting
            if (header === 'Date' && value) {
                value = new Date(value).toLocaleDateString('en-CA');
            }
            
            // Convert value to string and escape commas
            const str = String(value);
            return str.includes(',') ? `"${str}"` : str;
        });
        
        csvContent += values.join(',') + '\n';
    });
    
    // Create and download file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `scna_machine_analytics_custom_${fromDate}_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`✅ Exported ${flattenedData.length} records with ${selectedHeaders.length} columns`);
}

/**
 * Load machine analytics templates (mock implementation)
 */
async function loadMachineAnalyticsTemplates() {
    try {
        // Check localStorage for saved templates
        const savedTemplates = localStorage.getItem('machineAnalyticsTemplates');
        if (savedTemplates) {
            return JSON.parse(savedTemplates);
        }
        
        // Return default template
        return [{
            _id: 'default-basic',
            templateName: 'Basic Production Data',
            processType: 'MachineAnalytics',
            selectedHeaders: [
                { name: '設備', order: 1 },
                { name: 'Date', order: 2 },
                { name: '品番', order: 3 },
                { name: 'Worker_Name', order: 4 },
                { name: 'Time_start', order: 5 },
                { name: 'Time_end', order: 6 },
                { name: 'Total_Work_Hours', order: 7 },
                { name: 'Total', order: 8 },
                { name: 'Total_Break_Minutes', order: 9 }
            ],
            createdBy: 'System',
            createdAt: new Date().toISOString()
        }];
    } catch (error) {
        console.error('Error loading templates:', error);
        return [];
    }
}

/**
 * Save machine analytics template
 */
async function saveMachineAnalyticsTemplate(templateData) {
    try {
        const existingTemplates = await loadMachineAnalyticsTemplates();
        templateData._id = `template-${Date.now()}`;
        existingTemplates.push(templateData);
        
        localStorage.setItem('machineAnalyticsTemplates', JSON.stringify(existingTemplates));
        return true;
    } catch (error) {
        console.error('Error saving template:', error);
        return false;
    }
}

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

/**
 * Show machine analytics detail modal
 */
function showMachineAnalyticsDetail(record) {
    const modal = document.getElementById('machineAnalyticsDetailModal');
    const content = document.getElementById('machineAnalyticsDetailContent');
    
    if (!modal || !content || !record) {
        console.warn('Modal elements or record not found');
        return;
    }

    // Build detail content similar to Freya Tablet modal structure
    let detailHTML = `
        <!-- Production Overview -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-2">
                <div class="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 class="text-lg font-semibold text-gray-900 mb-4">Production Information</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-3">
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Date</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.Date ? new Date(record.Date).toLocaleDateString('ja-JP') : 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Equipment (設備)</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.設備 || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Part Number (品番)</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.品番 || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Background Number (背番号)</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.背番号 || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Worker Name</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.Worker_Name || 'N/A'}</dd>
                            </div>
                        </div>
                        <div class="space-y-3">
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Time Range</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.Time_start || 'N/A'} - ${record.Time_end || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Total Work Hours</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.Total_Work_Hours || 'N/A'} hours</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Material Lot (材料ロット)</dt>
                                <dd class="text-sm text-gray-900 mt-1 break-all">${record.材料ロット || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm font-medium text-gray-500">Comment</dt>
                                <dd class="text-sm text-gray-900 mt-1">${record.Comment || 'N/A'}</dd>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Statistics Card -->
            <div class="space-y-4">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 class="font-medium text-blue-900 mb-3">Production Stats</h5>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-sm text-blue-700">Quantity Made:</span>
                            <span class="text-sm font-medium text-blue-900">${(record.Process_Quantity || 0).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-blue-700">Actual Total:</span>
                            <span class="text-sm font-medium text-blue-900">${(record.Total || 0).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-blue-700">Cycle Time:</span>
                            <span class="text-sm font-medium text-blue-900">${record.Cycle_Time ? record.Cycle_Time + 's' : 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-blue-700">Shot Count:</span>
                            <span class="text-sm font-medium text-blue-900">${record.ショット数 || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- NG Analysis -->
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h5 class="font-medium text-red-900 mb-3">NG Analysis</h5>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-sm text-red-700">Total NG:</span>
                            <span class="text-sm font-medium text-red-900">${(record.Total_NG || 0).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-red-700">Non Conforming (Internal):</span>
                            <span class="text-sm font-medium text-red-900">${(record.疵引不良 || 0).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-red-700">Non Conforming (Supplier):</span>
                            <span class="text-sm font-medium text-red-900">${(record.加工不良 || 0).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm text-red-700">Others:</span>
                            <span class="text-sm font-medium text-red-900">${(record.その他 || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Work Order Information (if available)
    if (record.WorkOrder_Info && record.WorkOrder_Info.isWorkOrder) {
        detailHTML += `
            <div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h4 class="text-lg font-semibold text-green-900 mb-4">Work Order Information</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <dt class="text-sm font-medium text-green-700">Work Order Number</dt>
                        <dd class="text-sm text-green-900 mt-1 font-mono">${record.WorkOrder_Info.workOrderNumber || 'N/A'}</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-green-700">Status</dt>
                        <dd class="text-sm text-green-900 mt-1">
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                ${record.WorkOrder_Info.status || 'N/A'}
                            </span>
                        </dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-green-700">SKU</dt>
                        <dd class="text-sm text-green-900 mt-1">${record.WorkOrder_Info.sku || 'N/A'}</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-green-700">Assigned To</dt>
                        <dd class="text-sm text-green-900 mt-1">${record.WorkOrder_Info.assignedTo || 'N/A'}</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-green-700">NC Program Sent</dt>
                        <dd class="text-sm text-green-900 mt-1">${record.WorkOrder_Info.ncProgramSent ? 'Yes' : 'No'}</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-green-700">Target Machines</dt>
                        <dd class="text-sm text-green-900 mt-1">${record.WorkOrder_Info.targetMachines ? record.WorkOrder_Info.targetMachines.join(', ') : 'N/A'}</dd>
                    </div>
                </div>
            </div>
        `;
    }

    // Break Time Data (if available)
    if (record.Break_Time_Data) {
        detailHTML += `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <h4 class="text-lg font-semibold text-yellow-900 mb-4">Break Time Information</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        `;
        
        Object.keys(record.Break_Time_Data).forEach(breakKey => {
            const breakData = record.Break_Time_Data[breakKey];
            if (breakData && typeof breakData === 'object' && (breakData.start || breakData.end)) {
                detailHTML += `
                    <div>
                        <dt class="text-sm font-medium text-yellow-700">${breakKey.toUpperCase()}</dt>
                        <dd class="text-sm text-yellow-900 mt-1">${breakData.start || 'N/A'} - ${breakData.end || 'N/A'}</dd>
                    </div>
                `;
            }
        });
        
        detailHTML += `
                </div>
                <div class="flex space-x-6">
                    <div>
                        <dt class="text-sm font-medium text-yellow-700">Total Break Minutes</dt>
                        <dd class="text-sm text-yellow-900 mt-1">${record.Total_Break_Minutes || 0} minutes</dd>
                    </div>
                    <div>
                        <dt class="text-sm font-medium text-yellow-700">Total Break Hours</dt>
                        <dd class="text-sm text-yellow-900 mt-1">${record.Total_Break_Hours || 0} hours</dd>
                    </div>
                </div>
            </div>
        `;
    }

    // Quality Check Information (if available)
    if (record['2HourQualityCheck'] && record['2HourQualityCheck'].checks) {
        detailHTML += `
            <div class="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                <h4 class="text-lg font-semibold text-purple-900 mb-4">Quality Check Information</h4>
                <div class="mb-4">
                    <span class="text-sm text-purple-700">Total Checks: </span>
                    <span class="text-sm font-medium text-purple-900">${record['2HourQualityCheck'].totalChecks || 0}</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        `;
        
        Object.keys(record['2HourQualityCheck'].checks).forEach(checkKey => {
            const check = record['2HourQualityCheck'].checks[checkKey];
            if (check) {
                // Convert timestamp to Indiana (Eastern) time
                let displayTime = 'N/A';
                if (check.timestamp) {
                    try {
                        const date = new Date(check.timestamp);
                        // Convert to Eastern Time (Indiana)
                        displayTime = date.toLocaleString('en-US', {
                            timeZone: 'America/Indiana/Indianapolis',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        });
                    } catch (error) {
                        console.warn('Error converting timestamp:', error);
                        displayTime = check.checkTime || 'N/A';
                    }
                }
                
                detailHTML += `
                    <div class="border border-purple-200 rounded p-3">
                        <h6 class="font-medium text-purple-900">Check ${check.checkNumber || checkKey}</h6>
                        <div class="mt-2 space-y-1">
                            <div class="text-sm">
                                <span class="text-purple-700">Checker: </span>
                                <span class="text-purple-900">${check.checkerName || 'N/A'}</span>
                            </div>
                            <div class="text-sm">
                                <span class="text-purple-700">Time (Indiana): </span>
                                <span class="text-purple-900">${displayTime}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        detailHTML += `
                </div>
            </div>
        `;
    }

    // Images Section
    const imageFields = getMachineAnalyticsImageFields(record);
    if (imageFields.length > 0) {
        detailHTML += `
            <div class="border border-gray-200 rounded-lg p-6">
                <h4 class="text-lg font-semibold text-gray-900 mb-4">Images</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        `;

        imageFields.forEach(({ key, url, label }) => {
            detailHTML += `
                <div class="space-y-2">
                    <div class="text-sm font-medium text-gray-700">${label}</div>
                    <div class="border border-gray-200 rounded-lg overflow-hidden">
                        <img src="${url}" 
                             alt="${label}"
                             class="w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                             onclick="showMachineAnalyticsImageModal('${url}', '${label}')"
                             onerror="this.parentElement.innerHTML='<div class=\\'flex items-center justify-center h-32 bg-gray-100 text-gray-400\\'>Failed to load image</div>'"
                        />
                    </div>
                </div>
            `;
        });

        detailHTML += `
                </div>
            </div>
        `;
    }

    content.innerHTML = detailHTML;
    
    // Show modal using same pattern as enhanced modal stack
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    
    console.log('✅ Machine analytics detail modal opened for:', record.設備, record.品番);
}

/**
 * Close machine analytics detail modal
 */
function closeMachineAnalyticsModal() {
    const modal = document.getElementById('machineAnalyticsDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

/**
 * Get all image fields from a machine analytics record
 */
function getMachineAnalyticsImageFields(record) {
    const imageFields = [];
    
    // Material label images array
    if (record.materialLabelImages && Array.isArray(record.materialLabelImages)) {
        record.materialLabelImages.forEach((url, index) => {
            imageFields.push({
                key: `materialLabelImages[${index}]`,
                url: url,
                label: `Material Label ${index + 1}`
            });
        });
    }
    
    // Individual image fields with Japanese names
    const namedImageFields = {
        '初物チェック画像': 'First Article Check Image',
        '終物チェック画像': 'Final Article Check Image',
        '材料ラベル画像': 'Material Label Image'
    };
    
    Object.keys(namedImageFields).forEach(key => {
        if (record[key] && typeof record[key] === 'string' && record[key].includes('firebase')) {
            imageFields.push({
                key: key,
                url: record[key],
                label: namedImageFields[key]
            });
        }
    });
    
    return imageFields;
}

/**
 * Show image modal for machine analytics
 */
function showMachineAnalyticsImageModal(imageUrl, title) {
    // Create image modal if it doesn't exist
    let imageModal = document.getElementById('machineAnalyticsImageModal');
    if (!imageModal) {
        imageModal = document.createElement('div');
        imageModal.id = 'machineAnalyticsImageModal';
        imageModal.className = 'fixed inset-0 bg-black bg-opacity-75 hidden z-50';
        imageModal.innerHTML = `
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="relative max-w-4xl max-h-full">
                    <button onclick="closeMachineAnalyticsImageModal()" class="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 z-10">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                    <img id="machineAnalyticsModalImage" src="" alt="" class="max-w-full max-h-screen object-contain rounded-lg" />
                    <div id="machineAnalyticsModalImageTitle" class="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-3 py-1 rounded"></div>
                </div>
            </div>
        `;
        document.body.appendChild(imageModal);
    }

    document.getElementById('machineAnalyticsModalImage').src = imageUrl;
    document.getElementById('machineAnalyticsModalImageTitle').textContent = title;
    imageModal.classList.remove('hidden');
}

/**
 * Close machine analytics image modal
 */
function closeMachineAnalyticsImageModal() {
    const imageModal = document.getElementById('machineAnalyticsImageModal');
    if (imageModal) {
        imageModal.classList.add('hidden');
    }
}

// Make functions globally available
window.initializeSCNAMachineAnalytics = initializeSCNAMachineAnalytics;
window.loadSCNAMachineData = loadSCNAMachineData;
window.toggleAllMachines = toggleAllMachines;
window.saveMachineSelection = saveMachineSelection;
window.showMachineAnalyticsDetail = showMachineAnalyticsDetail;
window.closeMachineAnalyticsModal = closeMachineAnalyticsModal;
window.showMachineAnalyticsImageModal = showMachineAnalyticsImageModal;
window.closeMachineAnalyticsImageModal = closeMachineAnalyticsImageModal;

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeMachineAnalyticsModal();
        closeMachineAnalyticsImageModal();
    }
});

console.log('✅ SCNA Machine Analytics module loaded');
