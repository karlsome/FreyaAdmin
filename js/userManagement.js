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
            ${headers.map(h => `<th class="px-4 py-2">${t(h)}</th>`).join("")}
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