// BATCH APPROVAL FIX
// Replace the renderApprovalList function in app.js with this code

async function renderApprovalList() {
    const container = document.getElementById('approvalsListContainer');
    
    // Show loading state
    container.innerHTML = '<div class="p-8 text-center text-gray-500"><i class="ri-loader-4-line animate-spin text-xl mr-2"></i>Loading all data for batch approval...</div>';
    
    try {
        // Load ALL data for list view (not just current page)
        const allData = await loadApprovalDataForListView();
        
        if (allData.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-gray-500">データがありません</div>';
            return;
        }

        // Update the global variable for batch operations
        filteredApprovalData = allData;

        // Sort by Time_start for list view (default) unless another sort is active
        let sortedData = [...allData];
        if (!approvalSortState.column) {
            sortedData.sort((a, b) => {
                const timeA = a.Time_start || '00:00';
                const timeB = b.Time_start || '00:00';
                return timeA.localeCompare(timeB);
            });
        }

        console.log(`📋 Rendering list view with ${sortedData.length} total items for batch operations`);
        
        // Get all possible fields for the current tab
        const allFields = getAllFieldsForTab(currentApprovalTab, sortedData);

        // Create table header
        let headerHTML = `
            <tr>
                <th class="border p-2 w-8">
                    <input type="checkbox" id="selectAllListItems" class="rounded" onchange="toggleSelectAll(this)">
                </th>
                <th class="border p-2 text-left font-medium text-gray-700 bg-yellow-50 cursor-pointer hover:bg-yellow-100" onclick="sortApprovalTable('approvalStatus')">
                    Status${getSortArrow('approvalStatus')}
                </th>`;
                
        // Add dynamic field headers
        allFields.forEach(field => {
            const fieldKey = field.name.includes('.') ? field.name.split('.')[1] : field.name;
            const isClickable = ['Date', 'Time_start', 'Time_end', '工場', '品番', '背番号', 'Worker_Name', '設備'].includes(field.name) || 
                              field.name.includes('加工数') || field.name.includes('不良') || field.name.includes('NG');
            
            if (isClickable) {
                headerHTML += `
                    <th class="border p-2 text-left font-medium text-gray-700 min-w-24 cursor-pointer hover:bg-gray-100 ${field.isGrouped ? 'bg-blue-50 hover:bg-blue-100' : ''}" 
                        onclick="sortApprovalTable('${field.name}')" 
                        title="${field.description || field.name}">
                        ${field.displayName}${getSortArrow(field.name)}
                        ${field.isGrouped ? `<br><span class="text-xs text-blue-600">(${field.group})</span>` : ''}
                    </th>`;
            } else {
                headerHTML += `
                    <th class="border p-2 text-left font-medium text-gray-700 min-w-24 ${field.isGrouped ? 'bg-blue-50' : ''}" title="${field.description || field.name}">
                        ${field.displayName}
                        ${field.isGrouped ? `<br><span class="text-xs text-blue-600">(${field.group})</span>` : ''}
                    </th>`;
            }
        });
        
        headerHTML += '</tr>';

        // Create body rows
        const bodyHTML = sortedData.map((item, index) => createListRow(item, index, allFields)).join('');

        // Create complete table
        const listHTML = `
            <div class="bg-white border rounded-lg overflow-hidden">
                <!-- Batch Operations Summary -->
                <div class="bg-blue-50 border-b p-3">
                    <div class="text-sm text-blue-800">
                        <i class="ri-information-line mr-1"></i>
                        <strong>List View (Batch Approval)</strong> - Total Records: ${sortedData.length}
                    </div>
                </div>
                
                <!-- Excel-like table -->
                <div class="overflow-x-auto">
                    <table class="w-full text-xs border-collapse">
                        <thead class="bg-gray-100 sticky top-0 z-10">
                            ${headerHTML}
                        </thead>
                        <tbody>
                            ${bodyHTML}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = listHTML;

        // Add event listeners for list interactions
        addListEventListeners();
        
    } catch (error) {
        console.error('❌ Error loading data for list view:', error);
        container.innerHTML = '<div class="p-8 text-center text-red-500">Error loading data for batch approval. Please try refreshing.</div>';
    }
}
