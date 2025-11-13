// allUsers is defined in app.js as a global variable

// Sorting state for both tables
let userSortState = { column: null, direction: 1 }; // 1 for ascending, -1 for descending
let workerSortState = { column: null, direction: 1 };

async function loadUserTable() {
    try {
    const res = await fetch(BASE_URL + "queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        dbName: "Sasaki_Coating_MasterDB",            // Replace with your actual DB name
        collectionName: "users",          // Replace with your users collection name
        query: {},
        projection: { password: 0 }       // Exclude password field
        })
    });

    allUsers = await res.json();
    renderUserTable(allUsers);
    } catch (err) {
    console.error("Failed to load users:", err);
    document.getElementById("userTableContainer").innerHTML = `<p class="text-red-600">${t('failedToLoadUsers')}</p>`;
    }
}
         function renderUserTable(users) {
    if (currentUser.role !== "admin") {
    document.getElementById("userTableContainer").innerHTML = "";
    return;
    }

    const headers = ["firstName", "lastName", "email", "username", "role", "factory"];
    const tableHTML = `
    <table class="w-full text-sm border">
        <thead class="bg-gray-100">
        <tr>
            ${headers.map(h => {
                const sortIcon = userSortState.column === h 
                    ? (userSortState.direction === 1 ? ' ▲' : ' ▼') 
                    : '';
                return `<th class="px-4 py-2 cursor-pointer hover:bg-gray-200" onclick="sortUsers('${h}')">${t(h)}${sortIcon}</th>`;
            }).join("")}
            <th class='px-4 py-2'>${t('actions')}</th>
        </tr>
        </thead>
        <tbody>
        ${users.map(u => {
            // Handle factory data - support both string and array formats
            const userFactories = u.工場 || u.factory || [];
            const factoryArray = Array.isArray(userFactories) ? userFactories : (userFactories ? [userFactories] : []);
            const factoryDisplayText = factoryArray.length > 0 ? factoryArray.join(', ') : '-';
            
            return `
            <tr class="border-t" id="userRow-${u._id}">
            ${headers.map(h => `
                <td class="px-4 py-2">
                ${h === "role"
                    ? `<select class="border p-1 rounded" disabled data-role user-id="${u._id}" onchange="toggleEditFactoryField('${u._id}', this.value)">
                        ${["admin", "班長", "係長", "課長", "member"].map(r => `
                        <option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>
                        `).join("")}
                    </select>`
                    : h === "factory"
                    ? `<div class="factory-container" user-id="${u._id}">
                        <div class="factory-tags-display" id="factoryDisplay-${u._id}" ${u.role !== "班長" ? "style='display:none'" : ""}>
                            ${factoryArray.map(f => `<span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">${f}</span>`).join('')}
                            ${factoryArray.length === 0 ? '<span class="text-gray-500 text-xs">工場未設定</span>' : ''}
                        </div>
                        <div class="factory-tags-edit hidden" id="factoryEdit-${u._id}">
                            <div class="factory-tag-input-container">
                                <div class="selected-factories flex flex-wrap gap-1 mb-2" id="selectedFactories-${u._id}">
                                    ${factoryArray.map(f => `
                                        <span class="factory-tag bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                                            ${f}
                                            <button type="button" class="ml-1 text-blue-600 hover:text-blue-800" onclick="removeFactoryTag('${u._id}', '${f}')">×</button>
                                        </span>
                                    `).join('')}
                                </div>
                                <select class="border p-1 rounded text-xs" onchange="addFactoryTag('${u._id}', this.value); this.value='';">
                                    <option value="">${t('addFactory')}</option>
                                    ${["第一工場", "第二工場", "肥田瀬", "天徳", "倉知", "小瀬", "SCNA", "NFH"].map(f => 
                                        `<option value="${f}">${f}</option>`
                                    ).join("")}
                                </select>
                            </div>
                        </div>
                        <input type="hidden" class="factory-data" data-field="factory" user-id="${u._id}" value='${JSON.stringify(factoryArray)}' />
                        ${u.role !== "班長" ? `<span class="text-gray-500 factory-readonly">${factoryDisplayText}</span>` : ""}
                    </div>`
                    : `<input class="border p-1 rounded w-full" value="${u[h] || ""}" disabled data-field="${h}" user-id="${u._id}" />`}
                </td>
            `).join("")}
            <td class="px-4 py-2" id="actions-${u._id}">
                <button class="text-blue-600 hover:underline" onclick="startEditingUser('${u._id}')">${t('edit')}</button>
                <button class="ml-2 text-yellow-600 hover:underline" onclick="resetPassword('${u._id}')">${t('resetPassword')}</button>
                <button class="ml-2 text-red-600 hover:underline" onclick="deleteUser('${u._id}')">${t('delete')}</button>
            </td>
            </tr>`;
        }).join("")}
        </tbody>
    </table>
    `;

    document.getElementById("userTableContainer").innerHTML = tableHTML;
}

// ==================== USER SORTING ====================

window.sortUsers = function(column) {
    // Toggle direction if same column, otherwise reset to ascending
    if (userSortState.column === column) {
        userSortState.direction *= -1;
    } else {
        userSortState.column = column;
        userSortState.direction = 1;
    }
    
    const sorted = [...window.allUsers].sort((a, b) => {
        let valA, valB;
        
        if (column === 'factory') {
            // Handle factory array sorting
            const factoryA = a.工場 || a.factory || [];
            const factoryB = b.工場 || b.factory || [];
            const arrA = Array.isArray(factoryA) ? factoryA : (factoryA ? [factoryA] : []);
            const arrB = Array.isArray(factoryB) ? factoryB : (factoryB ? [factoryB] : []);
            valA = arrA.join(',').toLowerCase();
            valB = arrB.join(',').toLowerCase();
        } else {
            valA = (a[column] || '').toString().toLowerCase();
            valB = (b[column] || '').toString().toLowerCase();
        }
        
        if (valA < valB) return -1 * userSortState.direction;
        if (valA > valB) return 1 * userSortState.direction;
        return 0;
    });
    
    renderUserTable(sorted);
};

// ==================== USER SEARCH ====================

window.searchUsers = function() {
    const searchTerm = document.getElementById('userSearchInput').value.toLowerCase();
    
    if (!searchTerm) {
        renderUserTable(window.allUsers);
        return;
    }
    
    const filtered = window.allUsers.filter(u => {
        const firstName = (u.firstName || '').toLowerCase();
        const lastName = (u.lastName || '').toLowerCase();
        return firstName.includes(searchTerm) || lastName.includes(searchTerm);
    });
    
    renderUserTable(filtered);
};

// Factory tag management functions
window.addFactoryTag = function(userId, factory) {
    if (!factory) return;
    
    const hiddenInput = document.querySelector(`input.factory-data[user-id="${userId}"]`);
    const selectedContainer = document.getElementById(`selectedFactories-${userId}`);
    
    if (!hiddenInput || !selectedContainer) return;
    
    let currentFactories = [];
    try {
        currentFactories = JSON.parse(hiddenInput.value || '[]');
    } catch (e) {
        currentFactories = [];
    }
    
    // Don't add if already exists
    if (currentFactories.includes(factory)) return;
    
    currentFactories.push(factory);
    hiddenInput.value = JSON.stringify(currentFactories);
    
    // Add visual tag
    const tagHTML = `
        <span class="factory-tag bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
            ${factory}
            <button type="button" class="ml-1 text-blue-600 hover:text-blue-800" onclick="removeFactoryTag('${userId}', '${factory}')">×</button>
        </span>
    `;
    selectedContainer.insertAdjacentHTML('beforeend', tagHTML);
};

window.removeFactoryTag = function(userId, factory) {
    const hiddenInput = document.querySelector(`input.factory-data[user-id="${userId}"]`);
    
    if (!hiddenInput) return;
    
    let currentFactories = [];
    try {
        currentFactories = JSON.parse(hiddenInput.value || '[]');
    } catch (e) {
        currentFactories = [];
    }
    
    currentFactories = currentFactories.filter(f => f !== factory);
    hiddenInput.value = JSON.stringify(currentFactories);
    
    // Remove visual tag
    const tagElements = document.querySelectorAll(`#selectedFactories-${userId} .factory-tag`);
    tagElements.forEach(tag => {
        if (tag.textContent.trim().startsWith(factory)) {
            tag.remove();
        }
    });
};

// Updated factory field toggle function for editing users
window.toggleEditFactoryField = function(userId, role) {
    const factoryDisplay = document.getElementById(`factoryDisplay-${userId}`);
    const factoryEdit = document.getElementById(`factoryEdit-${userId}`);
    const factoryReadonly = document.querySelector(`tr#userRow-${userId} .factory-readonly`);
    
    if (role === "班長") {
        if (factoryDisplay) factoryDisplay.style.display = "block";
        if (factoryEdit) factoryEdit.style.display = "block";
        if (factoryReadonly) factoryReadonly.style.display = "none";
    } else {
        if (factoryDisplay) factoryDisplay.style.display = "none";
        if (factoryEdit) factoryEdit.style.display = "none";
        if (factoryReadonly) factoryReadonly.style.display = "inline";
    }
};

// ==================== TAB MANAGEMENT ====================
let currentTab = localStorage.getItem('userManagementTab') || 'admin';
window.allWorkers = []; // Make allWorkers global

window.switchTab = function(tab) {
    console.log('🔄 switchTab called with:', tab);
    currentTab = tab;
    localStorage.setItem('userManagementTab', tab);
    
    // Update tab styling
    const adminTab = document.getElementById('adminMemberTab');
    const factoryTab = document.getElementById('factoryMemberTab');
    const adminContent = document.getElementById('adminMemberContent');
    const factoryContent = document.getElementById('factoryMemberContent');
    
    console.log('📊 Elements found:', {
        adminTab: !!adminTab,
        factoryTab: !!factoryTab,
        adminContent: !!adminContent,
        factoryContent: !!factoryContent
    });
    
    if (tab === 'admin') {
        console.log('👤 Switching to Admin tab');
        adminTab.className = 'px-6 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600';
        factoryTab.className = 'px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
        adminContent.classList.remove('hidden');
        factoryContent.classList.add('hidden');
    } else {
        console.log('🏭 Switching to Factory tab');
        adminTab.className = 'px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
        factoryTab.className = 'px-6 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600';
        adminContent.classList.add('hidden');
        factoryContent.classList.remove('hidden');
        
        // Load workers when switching to factory tab
        console.log('📦 Current allWorkers length:', window.allWorkers.length);
        if (window.allWorkers.length === 0) {
            console.log('⏳ Loading workers...');
            loadWorkerTable();
        } else {
            console.log('✅ Workers already loaded, count:', window.allWorkers.length);
            console.log('🎨 Re-rendering existing workers...');
            renderWorkerTable(window.allWorkers);
        }
    }
};

// Check if user can view factory member tab
function canViewFactoryTab() {
    const allowedRoles = ['admin', '課長', '部長', '係長'];
    return allowedRoles.includes(currentUser.role);
}

// Hide factory tab if user doesn't have permission
function updateTabVisibility() {
    const factoryTab = document.getElementById('factoryMemberTab');
    if (factoryTab && !canViewFactoryTab()) {
        factoryTab.style.display = 'none';
    }
}

// ==================== WORKER TABLE MANAGEMENT ====================

async function loadWorkerTable() {
    console.log('🔧 loadWorkerTable() called');
    console.log('🌐 BASE_URL:', BASE_URL);
    try {
        console.log('📡 Fetching workers from workerDB...');
        const res = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "Sasaki_Coating_MasterDB",
                collectionName: "workerDB",
                query: {},
                projection: {}
            })
        });

        console.log('📥 Response status:', res.status, res.ok);
        window.allWorkers = await res.json();
        console.log('✅ Workers loaded, count:', window.allWorkers.length);
        renderWorkerTable(window.allWorkers);
    } catch (err) {
        console.error("❌ Failed to load workers:", err);
        document.getElementById("workerTableContainer").innerHTML = `<p class="text-red-600">Failed to load workers</p>`;
    }
}

function renderWorkerTable(workers) {
    console.log('🎨 renderWorkerTable() called with', workers.length, 'workers');
    console.log('🔐 canViewFactoryTab():', canViewFactoryTab());
    console.log('👤 currentUser.role:', currentUser?.role);
    
    if (!canViewFactoryTab()) {
        console.log('⛔ User cannot view factory tab');
        document.getElementById("workerTableContainer").innerHTML = "";
        return;
    }

    const columns = [
        { field: 'Name', label: 'Name' },
        { field: 'ID number', label: 'ID Number' },
        { field: '部署', label: '部署' },
        { field: 'Picture', label: 'Picture' }
    ];

    const tableHTML = `
    <table class="w-full text-sm border">
        <thead class="bg-gray-100">
        <tr>
            ${columns.map(col => {
                const sortIcon = workerSortState.column === col.field
                    ? (workerSortState.direction === 1 ? ' ▲' : ' ▼')
                    : '';
                return `<th class="px-4 py-2 cursor-pointer hover:bg-gray-200" onclick="sortWorkers('${col.field}')">${col.label}${sortIcon}</th>`;
            }).join("")}
            <th class="px-4 py-2">Actions</th>
        </tr>
        </thead>
        <tbody>
        ${workers.map(w => {
            // Handle department data - convert comma-separated string to array
            const deptString = w.部署 || '';
            const deptArray = deptString ? deptString.split(',').map(d => d.trim()) : [];
            
            return `
            <tr class="border-t" id="workerRow-${w._id}">
                <td class="px-4 py-2">
                    <input class="border p-1 rounded w-full" value="${w.Name || ""}" disabled data-field="Name" worker-id="${w._id}" />
                </td>
                <td class="px-4 py-2">
                    <input class="border p-1 rounded w-full" value="${w['ID number'] || ""}" disabled data-field="ID number" worker-id="${w._id}" />
                </td>
                <td class="px-4 py-2">
                    <div class="dept-container" worker-id="${w._id}">
                        <div class="dept-tags-display" id="deptDisplay-${w._id}">
                            ${deptArray.map(d => `<span class="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">${d}</span>`).join('')}
                            ${deptArray.length === 0 ? '<span class="text-gray-500 text-xs">部署未設定</span>' : ''}
                        </div>
                        <div class="dept-tags-edit hidden" id="deptEdit-${w._id}">
                            <div class="dept-tag-input-container">
                                <div class="selected-departments flex flex-wrap gap-1 mb-2" id="selectedDepartments-${w._id}">
                                    ${deptArray.map(d => `
                                        <span class="dept-tag bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                                            ${d}
                                            <button type="button" class="ml-1 text-green-600 hover:text-green-800" onclick="removeDepartmentTag('${w._id}', '${d}')">×</button>
                                        </span>
                                    `).join('')}
                                </div>
                                <select class="border p-1 rounded text-xs" onchange="addDepartmentTag('${w._id}', this.value); this.value='';">
                                    <option value="">Add Department</option>
                                    ${["第一工場", "第二工場", "肥田瀬", "天徳", "倉知", "小瀬", "SCNA", "NFH"].map(d => 
                                        `<option value="${d}">${d}</option>`
                                    ).join("")}
                                </select>
                            </div>
                        </div>
                        <input type="hidden" class="dept-data" data-field="部署" worker-id="${w._id}" value='${JSON.stringify(deptArray)}' />
                    </div>
                </td>
                <td class="px-4 py-2">
                    <input class="border p-1 rounded w-full" value="${w.Picture || ""}" disabled data-field="Picture" worker-id="${w._id}" />
                </td>
                <td class="px-4 py-2" id="workerActions-${w._id}">
                    <button class="text-blue-600 hover:underline" onclick="startEditingWorker('${w._id}')">Edit</button>
                    <button class="ml-2 text-red-600 hover:underline" onclick="deleteWorker('${w._id}')">Delete</button>
                </td>
            </tr>`;
        }).join("")}
        </tbody>
    </table>
    `;

    document.getElementById("workerTableContainer").innerHTML = tableHTML;
}

// ==================== WORKER SORTING ====================

window.sortWorkers = function(column) {
    // Toggle direction if same column, otherwise reset to ascending
    if (workerSortState.column === column) {
        workerSortState.direction *= -1;
    } else {
        workerSortState.column = column;
        workerSortState.direction = 1;
    }
    
    const sorted = [...window.allWorkers].sort((a, b) => {
        let valA = (a[column] || '').toString().toLowerCase();
        let valB = (b[column] || '').toString().toLowerCase();
        
        if (valA < valB) return -1 * workerSortState.direction;
        if (valA > valB) return 1 * workerSortState.direction;
        return 0;
    });
    
    renderWorkerTable(sorted);
};

// ==================== DEPARTMENT TAG MANAGEMENT ====================

window.addDepartmentTag = function(workerId, department) {
    if (!department) return;
    
    const hiddenInput = document.querySelector(`input.dept-data[worker-id="${workerId}"]`);
    const selectedContainer = document.getElementById(`selectedDepartments-${workerId}`);
    
    if (!hiddenInput || !selectedContainer) return;
    
    let currentDepartments = [];
    try {
        currentDepartments = JSON.parse(hiddenInput.value || '[]');
    } catch (e) {
        currentDepartments = [];
    }
    
    if (currentDepartments.includes(department)) return;
    
    currentDepartments.push(department);
    hiddenInput.value = JSON.stringify(currentDepartments);
    
    const tagHTML = `
        <span class="dept-tag bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
            ${department}
            <button type="button" class="ml-1 text-green-600 hover:text-green-800" onclick="removeDepartmentTag('${workerId}', '${department}')">×</button>
        </span>
    `;
    selectedContainer.insertAdjacentHTML('beforeend', tagHTML);
};

window.removeDepartmentTag = function(workerId, department) {
    const hiddenInput = document.querySelector(`input.dept-data[worker-id="${workerId}"]`);
    
    if (!hiddenInput) return;
    
    let currentDepartments = [];
    try {
        currentDepartments = JSON.parse(hiddenInput.value || '[]');
    } catch (e) {
        currentDepartments = [];
    }
    
    currentDepartments = currentDepartments.filter(d => d !== department);
    hiddenInput.value = JSON.stringify(currentDepartments);
    
    const tagElements = document.querySelectorAll(`#selectedDepartments-${workerId} .dept-tag`);
    tagElements.forEach(tag => {
        if (tag.textContent.trim().startsWith(department)) {
            tag.remove();
        }
    });
};

// Department tag management for create worker form
let newWorkerDepartments = [];

window.addDepartmentToNewWorker = function(department) {
    if (!department || newWorkerDepartments.includes(department)) return;
    
    newWorkerDepartments.push(department);
    document.getElementById('newWorkerDepartments').value = newWorkerDepartments.join(',');
    
    const container = document.getElementById('createWorkerDepartments');
    const tagHTML = `
        <span class="dept-tag bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
            ${department}
            <button type="button" class="ml-1 text-green-600 hover:text-green-800" onclick="removeDepartmentFromNewWorker('${department}')">×</button>
        </span>
    `;
    container.insertAdjacentHTML('beforeend', tagHTML);
};

window.removeDepartmentFromNewWorker = function(department) {
    newWorkerDepartments = newWorkerDepartments.filter(d => d !== department);
    document.getElementById('newWorkerDepartments').value = newWorkerDepartments.join(',');
    
    const tagElements = document.querySelectorAll('#createWorkerDepartments .dept-tag');
    tagElements.forEach(tag => {
        if (tag.textContent.trim().startsWith(department)) {
            tag.remove();
        }
    });
};

// ==================== WORKER CRUD OPERATIONS ====================

window.startEditingWorker = function(workerId) {
    const row = document.getElementById(`workerRow-${workerId}`);
    const inputs = row.querySelectorAll('input[data-field]');
    const deptDisplay = document.getElementById(`deptDisplay-${workerId}`);
    const deptEdit = document.getElementById(`deptEdit-${workerId}`);
    const actionsCell = document.getElementById(`workerActions-${workerId}`);
    
    inputs.forEach(input => input.disabled = false);
    if (deptDisplay) deptDisplay.classList.add('hidden');
    if (deptEdit) deptEdit.classList.remove('hidden');
    
    actionsCell.innerHTML = `
        <button class="text-green-600 hover:underline" onclick="saveWorker('${workerId}')">Save</button>
        <button class="ml-2 text-gray-600 hover:underline" onclick="cancelEditWorker('${workerId}')">Cancel</button>
    `;
};

window.cancelEditWorker = function(workerId) {
    loadWorkerTable();
};

window.saveWorker = async function(workerId) {
    const row = document.getElementById(`workerRow-${workerId}`);
    const inputs = row.querySelectorAll('input[data-field]:not([type="hidden"])');
    const deptInput = row.querySelector('input.dept-data');
    
    const updatedData = {
        workerId: workerId
    };
    
    inputs.forEach(input => {
        const field = input.getAttribute('data-field');
        updatedData[field] = input.value;
    });
    
    // Handle departments - convert array back to comma-separated string
    if (deptInput) {
        try {
            const deptArray = JSON.parse(deptInput.value || '[]');
            updatedData['部署'] = deptArray.join(',');
        } catch (e) {
            updatedData['部署'] = '';
        }
    }
    
    try {
        const res = await fetch(BASE_URL + "updateWorker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedData)
        });
        
        const result = await res.json();
        
        if (res.ok) {
            alert("Worker updated successfully!");
            loadWorkerTable();
        } else {
            alert(result.error || "Failed to update worker");
        }
    } catch (err) {
        console.error("Error updating worker:", err);
        alert("Error updating worker");
    }
};

window.deleteWorker = async function(workerId) {
    if (!confirm("Are you sure you want to delete this worker?")) return;
    
    try {
        const res = await fetch(BASE_URL + "deleteWorker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                workerId: workerId
            })
        });
        
        const result = await res.json();
        
        if (res.ok) {
            alert("Worker deleted successfully!");
            loadWorkerTable();
        } else {
            alert(result.error || "Failed to delete worker");
        }
    } catch (err) {
        console.error("Error deleting worker:", err);
        alert("Error deleting worker");
    }
};

// ==================== WORKER SEARCH ====================

window.searchWorkers = function() {
    const searchTerm = document.getElementById('workerSearchInput').value.toLowerCase();
    
    if (!searchTerm) {
        renderWorkerTable(window.allWorkers);
        return;
    }
    
    const filtered = window.allWorkers.filter(w => {
        const name = (w.Name || '').toLowerCase();
        const idNumber = (w['ID number'] || '').toLowerCase();
        const dept = (w.部署 || '').toLowerCase();
        
        return name.includes(searchTerm) || 
               idNumber.includes(searchTerm) || 
               dept.includes(searchTerm);
    });
    
    renderWorkerTable(filtered);
};