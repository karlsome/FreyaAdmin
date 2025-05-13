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
    document.getElementById("userTableContainer").innerHTML = `<p class="text-red-600">Failed to load users</p>`;
    }
}
            
    function renderUserTable(users) {
        if (currentUser.role !== "admin") {
        document.getElementById("userTableContainer").innerHTML = "";
        return;
        }
    
        const headers = ["firstName", "lastName", "email", "username", "role"];
        const tableHTML = `
        <table class="w-full text-sm border">
            <thead class="bg-gray-100">
            <tr>
                ${headers.map(h => `<th class="px-4 py-2">${h.charAt(0).toUpperCase() + h.slice(1)}</th>`).join("")}
                <th class='px-4 py-2'>Actions</th>
            </tr>
            </thead>
            <tbody>
            ${users.map(u => `
                <tr class="border-t" id="userRow-${u._id}">
                ${headers.map(h => `
                    <td class="px-4 py-2">
                    ${h === "role"
                        ? `<select class="border p-1 rounded" disabled data-role user-id="${u._id}">
                            ${["admin", "班長", "member"].map(r => `
                            <option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>
                            `).join("")}
                        </select>`
                        : `<input class="border p-1 rounded w-full" value="${u[h] || ""}" disabled data-field="${h}" user-id="${u._id}" />`}
                    </td>
                `).join("")}
                <td class="px-4 py-2" id="actions-${u._id}">
                    <button class="text-blue-600 hover:underline" onclick="startEditingUser('${u._id}')">Edit</button>
                    <button class="ml-2 text-yellow-600 hover:underline" onclick="resetPassword('${u._id}')">Reset Password</button>
                    <button class="ml-2 text-red-600 hover:underline" onclick="deleteUser('${u._id}')">Delete</button>
                </td>
                </tr>
            `).join("")}
            </tbody>
        </table>
        `;
    
        document.getElementById("userTableContainer").innerHTML = tableHTML;
    }