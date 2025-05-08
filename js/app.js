if (!localStorage.getItem("authUser")) {
  window.location.href = "login.html";
}



const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
const roleDisplay = document.getElementById("userRole");
if (roleDisplay) {
  roleDisplay.textContent = currentUser.role || "guest";
}
const role = currentUser.role || "guest"; // Default to guest if no role is found


const roleAccess = {
  admin: ["dashboard", "factories", "processes", "notifications", "analytics", "userManagement", "approvals"],
  班長: ["dashboard", "factories", "approvals"],
  member: ["dashboard"]
};

function setupNavigation() {
  document.querySelectorAll(".nav-btn").forEach(button => {
    const page = button.getAttribute("data-page");
    if (!roleAccess[role]?.includes(page)) {
      button.style.display = "none";  // hide button if no permission
    } else {
      button.addEventListener("click", function () {
        document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
        this.classList.add("active");
        loadPage(page);
      });
    }
  });
}

function toggleDropdown() {
  const dropdown = document.getElementById("dropdownContent");
  dropdown.classList.toggle("hidden");
}

document.addEventListener("click", function (event) {
  const menu = document.getElementById("profileMenu");
  if (!menu.contains(event.target)) {
    document.getElementById("dropdownContent").classList.add("hidden");
  }
});





function logout() {
  localStorage.removeItem("authUser");
  window.location.href = "login.html";
}


// This is a simple JavaScript file to handle the navigation and rendering of different pages in a web application.
// It uses the Fetch API to retrieve data from a server and dynamically updates the HTML content based on user interactions.
document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    loadPage("dashboard"); // Load dashboard by default
});




  
  let currentLang = localStorage.getItem("lang") || "en";
  
  function applyLanguage() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      el.textContent = translations[currentLang][key] || key;
    });
  
    const search = document.getElementById("searchInput");
    if (search) {
      search.placeholder = translations[currentLang].searchPlaceholder;
    }
  }



// Mock data for demonstration purposes
function loadPage(page) {
    const mainContent = document.getElementById("mainContent");

    switch (page) {
        case "dashboard":
            mainContent.innerHTML = `
                <h2 class="text-2xl font-semibold">Factory Overview</h2>
                <div id="factoryCards" class="grid grid-cols-3 gap-6"></div>
            `;
            renderFactoryCards();
            break;

        case "analytics":
            mainContent.innerHTML = `
                <h2 class="text-2xl font-semibold">Defect Rate Analytics</h2>
                <div id="analyticsChart" class="h-80"></div>
                <div id="analyticsChart1" style="width: 100%; height: 400px;"></div>
                <div id="analyticsChart2" style="width: 100%; height: 400px;"></div>
            `;
            fetchFactoryDefects();
            break;

        case "approvals":
            mainContent.innerHTML = `
                <h2 class="text-2xl font-semibold">Approvals</h2>
                <div id="approvalsList"></div>
            `;
            renderApprovals();
            break;

            case "userManagement":
              if (role !== "admin") {
                  mainContent.innerHTML = `<p class="text-red-600 font-semibold">Access Denied</p>`;
                  return;
              }
          
              mainContent.innerHTML = `
             <div class="max-w-6xl mx-auto bg-white p-6 rounded shadow space-y-6">
              <!-- Search and Button -->
              <div class="flex justify-between items-center">
                <input type="text" id="userSearchInput" placeholder="Search users..." class="w-1/2 p-2 border rounded" />
                <button id="toggleCreateUserForm" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create New User</button>
              </div>

              <!-- Create User Form in Separate Card -->
              <div id="createUserFormWrapper" class="hidden">
                <div class="bg-gray-50 border border-gray-200 p-6 rounded shadow">
                  <form id="createUserForm" class="grid grid-cols-2 gap-4">
                    <input required placeholder="First Name" id="firstName" class="border p-2 rounded" />
                    <input required placeholder="Last Name" id="lastName" class="border p-2 rounded" />
                    <input required type="email" placeholder="Email" id="email" class="border p-2 rounded" />
                    <input required placeholder="Username" id="username" class="border p-2 rounded" />
                    <input required type="password" placeholder="Password" id="password" class="border p-2 rounded" />
                    <select id="role" class="border p-2 rounded" required>
                      <option value="admin">admin</option>
                      <option value="班長">班長</option>
                      <option value="member">member</option>
                    </select>
                    <button type="submit" class="col-span-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                      Submit
                    </button>
                  </form>
                </div>
              </div>

              <!-- User Table -->
              <div id="userTableContainer">Loading users...</div>
            </div>
            `;
          
            document.getElementById("toggleCreateUserForm").onclick = () => {
              document.getElementById("createUserFormWrapper").classList.toggle("hidden");
            };
            
            document.getElementById("createUserForm").addEventListener("submit", async (e) => {
              e.preventDefault();
              const body = {
                firstName: document.getElementById("firstName").value.trim(),
                lastName: document.getElementById("lastName").value.trim(),
                email: document.getElementById("email").value.trim(),
                username: document.getElementById("username").value.trim(),
                password: document.getElementById("password").value.trim(),
                role: document.getElementById("role").value
              };
            
              try {
                const res = await fetch(BASE_URL + "createUser", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body)
                });
            
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Failed to create user");
                alert("User created");
                e.target.reset();
                document.getElementById("createUserFormWrapper").classList.add("hidden");
                loadUserTable(); // refresh list
              } catch (err) {
                alert(err.message);
              }
            });
            
            let allUsers = [];
            let sortState = { column: null, direction: 1 };
            
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
            
            window.handleUserSort = function(col) {
              if (sortState.column === col) sortState.direction *= -1;
              else sortState = { column: col, direction: 1 };
              renderUserTable(allUsers);
            };
            
            window.updateUserRole = async (id, newRole) => {
              await fetch(BASE_URL + "updateUserRole", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: id, role: newRole })
              });
            };
            
            window.resetPassword = async (id) => {
              const newPass = prompt("Enter new password:");
              if (!newPass) return;
              await fetch(BASE_URL + "resetPassword", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: id, newPassword: newPass })
              });
              alert("Password reset");
            };
            
            window.editUser = (id) => {
              alert("Edit form coming soon (excluding password). Want it inline or in a modal?");
            };


            window.startEditingUser = (userId) => {
              document.querySelectorAll(`[user-id="${userId}"]`).forEach(el => el.disabled = false);
            
              const actionsCell = document.getElementById(`actions-${userId}`);
              actionsCell.innerHTML = `
                <button class="text-green-600 hover:underline" onclick="saveUser('${userId}')">OK</button>
                <button class="ml-2 text-gray-600 hover:underline" onclick="cancelEdit('${userId}')">Cancel</button>
              `;
            };
            
            window.cancelEdit = (userId) => {
              loadUserTable(); // simply re-fetch and render again
            };
            
            window.saveUser = async (userId) => {
              const inputs = document.querySelectorAll(`[user-id="${userId}"]`);
              const updated = {};
              inputs.forEach(el => {
                const field = el.dataset.field || (el.dataset.role ? "role" : null);
                if (field) updated[field] = el.value;
              });
            
              try {
                const res = await fetch(BASE_URL + "updateUser", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, ...updated })
                });
            
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Failed to update user");
            
                alert("User updated");
                loadUserTable();
              } catch (err) {
                alert(err.message);
              }
            };

            window.deleteUser = async (id) => {
              if (!confirm("Are you sure you want to archive this user?")) return;
            
              try {
                const res = await fetch(BASE_URL + "queries", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    dbName: "Sasaki_Coating_MasterDB",
                    collectionName: "users",
                    query: { _id: id }, // Just send the raw string ID
                    delete: true,
                    username: currentUser.username
                  })
                });
            
                const result = await res.json();
                if (res.ok && result.deletedFromOriginal > 0) {
                  alert(`User archived successfully by ${currentUser.username}.`);
                  loadUserTable();
                } else {
                  alert("No user archived. Check if the user still exists.");
                }
              } catch (err) {
                console.error("Error archiving user:", err);
                alert("Error occurred during archive.");
              }
            };
            
            document.getElementById("userSearchInput").addEventListener("input", (e) => {
              const keyword = e.target.value.toLowerCase();
              const filtered = allUsers.filter(u =>
                u.firstName.toLowerCase().includes(keyword) ||
                u.lastName.toLowerCase().includes(keyword) ||
                u.email.toLowerCase().includes(keyword) ||
                u.username.toLowerCase().includes(keyword)
              );
              renderUserTable(filtered);
            });
            
            loadUserTable();
          
              break;

        case "factories":
            mainContent.innerHTML = `
                <h2 class="text-2xl font-semibold mb-4">Factory List</h2>
                <div id="factoryList" class="grid grid-cols-3 gap-6"></div>
            `;
            renderFactoryList();
            break;

        default:
            mainContent.innerHTML = `<h2 class="text-xl font-semibold">Page Not Found</h2>`;
            break;
    }
}

// Thresholds for defect rate classification
const DEFECT_RATE_THRESHOLDS = {
    high: 2.0,
    warning: 1.5
  };
  
  async function renderFactoryCards() {
    const container = document.getElementById("factoryCards");
    container.innerHTML = "Loading factories...";
  
    const factoryNames = ["第一工場", "第二工場", "肥田瀬", "天徳", "倉知", "小瀬", "SCNA", "NFH"];
    const today = new Date().toISOString().split("T")[0];
  
    try {
      const cards = await Promise.all(factoryNames.map(async factory => {
        const res = await fetch(BASE_URL + "queries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dbName: "submittedDB",
            collectionName: "kensaDB",
            query: { 工場: factory, Date: today }
          })
        });
  
        const data = await res.json();
  
        const total = data.reduce((sum, item) => sum + (item.Process_Quantity ?? 0), 0);
        const totalNG = data.reduce((sum, item) => sum + (item.Total_NG ?? 0), 0);
        const defectRate = total > 0 ? ((totalNG / total) * 100).toFixed(2) : "0.00";
  
        // Determine status
        let statusColor = "green";
        let statusText = "Normal";
        if (defectRate >= DEFECT_RATE_THRESHOLDS.high) {
          statusColor = "red";
          statusText = "High Defect Rate";
        } else if (defectRate >= DEFECT_RATE_THRESHOLDS.warning) {
          statusColor = "yellow";
          statusText = "Warning";
        }
  
        const statusStyle = {
          green: "bg-green-100 text-green-800",
          yellow: "bg-yellow-100 text-yellow-800",
          red: "bg-red-100 text-red-800"
        }[statusColor];
  
        return `
          <div 
            class="cursor-pointer bg-white p-6 rounded-lg shadow border hover:shadow-md transition"
            onclick="loadFactoryPage('${factory}')"
          >
            <h4 class="text-lg font-bold mb-2">${factory}</h4>
            <p class="text-sm">Total: <strong>${total}</strong></p>
            <p class="text-sm">Total NG: <strong>${totalNG}</strong></p>
            <p class="text-sm">Defect Rate: 
              <strong class="${statusColor === 'red' ? 'text-red-600' : statusColor === 'yellow' ? 'text-yellow-600' : 'text-green-600'}">
                ${defectRate}%
              </strong>
            </p>
            <span class="inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${statusStyle}">
              ${statusText}
            </span>
          </div>
        `;
      }));
  
      container.innerHTML = cards.join("");
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      container.innerHTML = `<p class="text-red-500">Failed to load data.</p>`;
    }
  }

function renderApprovals() {
    const container = document.getElementById("approvalsList");
    container.innerHTML = mockData.approvals.map(approval => `
        <div class="p-4 bg-white shadow mb-2">
            <h4>${approval.type} - ${approval.factory}</h4>
            <p>${approval.date} | Inspector: ${approval.inspector}</p>
            <span class="text-sm ${approval.status === "pending" ? "text-yellow-500" : "text-green-500"}">${approval.status}</span>
        </div>
    `).join('');
}

function renderFactoryList() {
    const container = document.getElementById("factoryList");
    const factoryNames = ["第一工場", "第二工場", "肥田瀬", "天徳", "倉知", "小瀬", "SCNA", "NFH"];

    container.innerHTML = factoryNames.map(factory => `
        <div class="cursor-pointer bg-white p-6 rounded-lg shadow hover:shadow-lg transition" onclick="loadFactoryPage('${factory}')">
            <h4 class="text-lg font-semibold">${factory}</h4>
            <p class="text-sm text-gray-500">Click to view factory details</p>
        </div>
    `).join('');
}

async function loadFactoryPage(factoryName) {
    const mainContent = document.getElementById("mainContent");
    mainContent.innerHTML = `<p>Loading data for ${factoryName}...</p>`;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const isoStart = startDate.toISOString().split("T")[0];
    const isoEnd = new Date().toISOString().split("T")[0];

    const collections = ["pressDB", "SRSDB", "kensaDB", "slitDB"];
    const statsRequests = collections.map(col => ({
        dbName: "submittedDB",
        collectionName: col,
        aggregation: [
            { $match: { 工場: factoryName, Date: { $gte: isoStart, $lte: isoEnd } } },
            {
                $group: {
                    _id: "$設備",
                    totalNG: { $sum: "$Total_NG" },
                    totalProcess: { $sum: "$Process_Quantity" },
                    avgCycle: { $avg: "$Cycle_Time" },
                    count: { $sum: 1 }
                }
            }
        ]
    }));

    const topDefectRequest = {
        dbName: "submittedDB",
        collectionName: "kensaDB",
        aggregation: [
            { $match: { 工場: factoryName, Date: { $gte: isoStart, $lte: isoEnd } } },
            {
                $group: {
                    _id: "$品番",
                    totalNG: { $sum: "$Total_NG" },
                    product: { $first: "$品番" }
                }
            },
            { $sort: { totalNG: -1 } },
            { $limit: 15 }
        ]
    };

    try {
        const [pressData, srsData, kensaData, slitData, topDefects] = await Promise.all([
            ...statsRequests.map(req =>
                fetch(BASE_URL + "queries", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(req)
                }).then(res => res.json())
            ),
            fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(topDefectRequest)
            }).then(res => res.json())
        ]);

        renderFactoryDashboard({
            factoryName,
            pressData,
            srsData,
            kensaData,
            slitData,
            topDefects
        });

    } catch (error) {
        console.error("Error loading factory dashboard:", error);
        mainContent.innerHTML = `<p class="text-red-500">Failed to load data for ${factoryName}</p>`;
    }
}




function renderFactoryDashboard({ factoryName, pressData, srsData, kensaData, slitData, topDefects }) {
    const mainContent = document.getElementById("mainContent");
  
    mainContent.innerHTML = `
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-semibold">${factoryName} - ${translations[currentLang].factoryOverview}</h2>
      </div>
  
      <!-- Filters -->
      <div class="flex flex-wrap items-end gap-4 mb-6">
        <!-- From Date -->
        <div>
          <label class="block text-sm font-medium mb-1" data-i18n="from">From</label>
          <input type="date" id="filterFromDate" class="p-2 border rounded" />
        </div>
  
        <!-- To Date -->
        <div>
          <label class="block text-sm font-medium mb-1" data-i18n="to">To</label>
          <input type="date" id="filterToDate" class="p-2 border rounded" />
        </div>
  
        <!-- 品番 -->
        <div>
          <label class="block text-sm font-medium mb-1" data-i18n="partNumber">Part Number</label>
          <input type="text" id="filterPartNumber" class="p-2 border rounded w-48" placeholder="例: GN200-A0400" />
        </div>
  
        <!-- 背番号 -->
        <div>
          <label class="block text-sm font-medium mb-1" data-i18n="serialNumber">Serial Number</label>
          <input type="text" id="filterSerialNumber" class="p-2 border rounded w-48" placeholder="例: DR042" />
        </div>
  
        <!-- Apply Filters -->
        <div class="mt-6">
          <button id="applyFilterBtn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" data-i18n="applyFilter">
            Apply Filters
          </button>
        </div>
      </div>
  
      <!-- Production Results -->
      <div id="dailyProduction" class="mb-10"></div>
  
      <!-- Detail Sidebar -->
      <div id="detailSidebar" class="fixed top-0 right-0 w-96 h-full bg-white shadow-lg transform translate-x-full transition-transform duration-300 z-50 p-4 overflow-y-auto">
        <button onclick="closeSidebar()" class="mb-4 text-red-500 font-semibold">Close</button>
        <div id="sidebarContent"></div>
      </div>
  
      <!-- Summary Cards -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        ${[["Press", pressData], ["SRS", srsData], ["Slit", slitData], ["Kensa", kensaData]].map(([label, data]) => {
          const totalProc = data.reduce((sum, d) => sum + (d.totalProcess ?? 0), 0);
          const totalNG = data.reduce((sum, d) => sum + (d.totalNG ?? 0), 0);
          const defectRate = totalProc ? ((totalNG / totalProc) * 100).toFixed(2) : 0;
          return `
            <div class="bg-white p-4 rounded shadow">
              <h3 class="font-semibold">${label} Process</h3>
              <p>${translations[currentLang].total}: ${totalProc}</p>
              <p>${translations[currentLang].totalNG}: ${totalNG}</p>
              <p>${translations[currentLang].defectRate}: ${defectRate}%</p>
            </div>
          `;
        }).join("")}
      </div>
  
      <!-- Top Defects -->
      <div class="bg-white p-4 rounded shadow mb-6">
        <h3 class="font-semibold mb-2">${translations[currentLang].topDefectiveProducts || "Top 15 Defective Products"}</h3>
        <ul class="list-disc list-inside">
          ${topDefects.map(p => `<li>${p.product} – ${p.totalNG} ${translations[currentLang].totalNG}</li>`).join("") || "<li>No data</li>"}
        </ul>
      </div>
  
      <!-- Charts -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded shadow">
          <h3 class="font-semibold mb-2">${translations[currentLang].defectRate} per Process</h3>
          <div id="defectRateChart" style="height: 300px;"></div>
        </div>
        <div class="bg-white p-4 rounded shadow">
          <h3 class="font-semibold mb-2">Cycle Time per Process</h3>
          <div id="cycleTimeChart" style="height: 300px;"></div>
        </div>
      </div>
    `;
  
    // Attach event listener for Apply Filters
    document.getElementById("applyFilterBtn").addEventListener("click", () => {
      const from = document.getElementById("filterFromDate").value;
      const to = document.getElementById("filterToDate").value;
      const part = document.getElementById("filterPartNumber").value.trim();
      const serial = document.getElementById("filterSerialNumber").value.trim();
      loadProductionByPeriod(factoryName, from, to, part, serial);
    });
  
    // Load default data for today
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("filterFromDate").value = today;
    document.getElementById("filterToDate").value = today;
    loadProductionByPeriod(factoryName, today, today);
  
    // Run translations
    applyLanguage();
  
    // Render charts
    renderFactoryCharts({ pressData, srsData, slitData, kensaData });
  }

async function loadDailyProduction(factory, date) {
    const dailyContainer = document.getElementById("dailyProduction");
    dailyContainer.innerHTML = "Loading daily data...";

    const processes = [
        { name: "Kensa", collection: "kensaDB" },
        { name: "Press", collection: "pressDB" },
        { name: "SRS", collection: "SRSDB" },
        { name: "Slit", collection: "slitDB" }
    ];

    try {
        const results = await Promise.all(processes.map(proc =>
            fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dbName: "submittedDB",
                    collectionName: proc.collection,
                    query: { 工場: factory, Date: date }
                })
            }).then(res => res.json())
        ));

        dailyContainer.innerHTML = processes.map((proc, i) => {
          const data = results[i];
        
          const bgMap = {
            kensa: "bg-yellow-50",
            srs: "bg-gray-100",
            press: "bg-green-50",
            slit: "bg-blue-50"
          };
          const name = proc.name.toLowerCase();
          const bgClass = bgMap[name] || "bg-white";
        
          return `
          
            <div class="${bgClass} p-4 rounded shadow">
              <h3 class="font-semibold mb-2">${proc.name} Process (${data.length})</h3>
              <ul class="divide-y divide-gray-200">
                ${data.map(item => `
                  <li class="py-2 cursor-pointer hover:bg-gray-100 rounded px-2"
                      onclick='showSidebarFromElement(this)'
                      data-item='${encodeURIComponent(JSON.stringify(item))}'>
                    ${item.品番} - ${item.背番号}
                  </li>
                `).join("")}
              </ul>
            </div>
          `;
        }).join("");

    } catch (err) {
        console.error("Error loading daily production:", err);
        dailyContainer.innerHTML = `<p class="text-red-500">Failed to load daily data</p>`;
    }
}

function showSidebarFromElement(el) {
    const item = JSON.parse(decodeURIComponent(el.dataset.item));
    showSidebar(item);
}




// function showSidebar(item) {
//   const sidebar = document.getElementById("detailSidebar");
//   const content = document.getElementById("sidebarContent");

//   const entries = [];

//   // Detect process by presence of unique fields
//   const isKensa = item?.Counters !== undefined;
//   const isSRS = item?.["SRSコード"] !== undefined;
//   const isPress = item?.["ショット数"] !== undefined;
//   const isSlit = !isKensa && !isSRS && !isPress;

//   if (isKensa) {
//     entries.push(
//       ["品番", item["品番"]],
//       ["背番号", item["背番号"]],
//       ["工場", item["工場"]],
//       ["日付", item["Date"]],
//       ["作業者", item["Worker_Name"]],
//       ["設備", item["設備"]],
//       ["数量", item["Process_Quantity"]],
//       ["残数量", item["Remaining_Quantity"]],
//       ["不良数", item["Total_NG"]],
//       ["開始", item["Time_start"]],
//       ["終了", item["Time_end"]],
//       ["製造ロット", item["製造ロット"]],
//       ["コメント", item["Comment"]],
//       ["サイクルタイム", item["Cycle_Time"]]
//     );

//     // Add counters (counter-1 to counter-12)
//     for (let i = 1; i <= 12; i++) {
//       const key = `counter-${i}`;
//       entries.push([key, item?.Counters?.[key] ?? 0]);
//     }
//   } else if (isPress) {
//     entries.push(
//       ["品番", item["品番"]],
//       ["背番号", item["背番号"]],
//       ["工場", item["工場"]],
//       ["日付", item["Date"]],
//       ["作業者", item["Worker_Name"]],
//       ["設備", item["設備"]],
//       ["数量", item["Process_Quantity"]],
//       ["不良数", item["Total_NG"]],
//       ["開始", item["Time_start"]],
//       ["終了", item["Time_end"]],
//       ["材料ロット", item["材料ロット"]],
//       ["疵引不良", item["疵引不良"]],
//       ["加工不良", item["加工不良"]],
//       ["その他", item["その他"]],
//       ["サイクルタイム", item["Cycle_Time"]],
//       ["ショット数", item["ショット数"]],
//       ["コメント", item["Comment"]]
//     );
//   } else if (isSRS) {
//     entries.push(
//       ["品番", item["品番"]],
//       ["背番号", item["背番号"]],
//       ["工場", item["工場"]],
//       ["日付", item["Date"]],
//       ["作業者", item["Worker_Name"]],
//       ["設備", item["設備"]],
//       ["数量", item["Process_Quantity"]],
//       ["不良数", item["SRS_Total_NG"]],
//       ["開始", item["Time_start"]],
//       ["終了", item["Time_end"]],
//       ["製造ロット", item["製造ロット"]],
//       ["サイクルタイム", item["Cycle_Time"]],
//       ["SRSコード", item["SRSコード"]],
//       ["くっつき・めくれ", item["くっつき・めくれ"]],
//       ["シワ", item["シワ"]],
//       ["転写位置ズレ", item["転写位置ズレ"]],
//       ["転写不良", item["転写不良"]],
//       ["その他", item["その他"]],
//       ["コメント", item["Comment"]]
//     );
//   } else if (isSlit) {
//     entries.push(
//       ["品番", item["品番"]],
//       ["背番号", item["背番号"]],
//       ["工場", item["工場"]],
//       ["日付", item["Date"]],
//       ["作業者", item["Worker_Name"]],
//       ["設備", item["設備"]],
//       ["数量", item["Process_Quantity"]],
//       ["不良数", item["Total_NG"]],
//       ["開始", item["Time_start"]],
//       ["終了", item["Time_end"]],
//       ["製造ロット", item["製造ロット"]],
//       ["サイクルタイム", item["Cycle_Time"]],
//       ["疵引不良", item["疵引不良"]],
//       ["加工不良", item["加工不良"]],
//       ["その他", item["その他"]],
//       ["コメント", item["Comment"]]
//     );
//   }

//   content.innerHTML = `
//   <h3 class="text-xl font-bold mb-4">${item["品番"] ?? "データ"}</h3>
//   <div class="space-y-1">
//     ${entries.map(([label, value]) => `<p><strong>${label}:</strong> ${value ?? "-"}</p>`).join("")}
//   </div>
//   <div class="mt-4">
//     <img id="dynamicImage" src="" class="w-full rounded shadow" style="display:none;">
//   </div>
// `;
// picLINK(item["背番号"], item["品番"]);

//   sidebar.classList.remove("translate-x-full");
// }


function showSidebar(item) {
  const sidebar = document.getElementById("detailSidebar");
  const content = document.getElementById("sidebarContent");
  const originalItem = JSON.parse(JSON.stringify(item));
  const factoryName = item["工場"]; // Required for reload

  let processType = "";
  const labelToKeyMap = {
    "品番": "品番", "背番号": "背番号", "工場": "工場", "日付": "Date",
    "作業者": "Worker_Name", "設備": "設備", "数量": "Process_Quantity",
    "残数量": "Remaining_Quantity", "不良数": "Total_NG", "Total": "Total",
    "開始": "Time_start", "終了": "Time_end", "製造ロット": "製造ロット",
    "コメント": "Comment", "サイクルタイム": "Cycle_Time", "ショット数": "ショット数",
    "材料ロット": "材料ロット", "疵引不良": "疵引不良", "加工不良": "加工不良",
    "その他": "その他", "SRSコード": "SRSコード", "くっつき・めくれ": "くっつき・めくれ",
    "シワ": "シワ", "転写位置ズレ": "転写位置ズレ", "転写不良": "転写不良",
    ...Array.from({ length: 12 }, (_, i) => [`counter-${i + 1}`, `Counters.counter-${i + 1}`])
      .reduce((acc, [k, v]) => (acc[k] = v, acc), {})
  };

  const entries = [];
  const isKensa = item?.Counters !== undefined;
  const isSRS = item?.["SRSコード"] !== undefined;
  const isPress = item?.["ショット数"] !== undefined;
  const isSlit = !isKensa && !isSRS && !isPress;

  if (isKensa) {
    processType = "kensaDB";
    const fields = ["品番", "背番号", "工場", "日付", "作業者", "設備", "数量", "残数量", "不良数", "Total", "開始", "終了", "製造ロット", "コメント", "サイクルタイム"];
    fields.forEach(label => entries.push([label, item[labelToKeyMap[label]] ?? ""]));
    for (let i = 1; i <= 12; i++) entries.push([`counter-${i}`, item?.Counters?.[`counter-${i}`] ?? 0]);
  } else if (isPress) {
    processType = "pressDB";
    const fields = ["品番", "背番号", "工場", "日付", "作業者", "設備", "数量", "不良数", "Total", "開始", "終了", "材料ロット", "疵引不良", "加工不良", "その他", "サイクルタイム", "ショット数", "コメント"];
    fields.forEach(label => entries.push([label, item[labelToKeyMap[label]] ?? ""]));
  } else if (isSRS) {
    processType = "SRSDB";
    const fields = ["品番", "背番号", "工場", "日付", "作業者", "設備", "数量", "不良数", "Total", "開始", "終了", "製造ロット", "サイクルタイム", "SRSコード", "くっつき・めくれ", "シワ", "転写位置ズレ", "転写不良", "その他", "コメント"];
    fields.forEach(label => entries.push([label, item[labelToKeyMap[label]] ?? ""]));
  } else if (isSlit) {
    processType = "slitDB";
    const fields = ["品番", "背番号", "工場", "日付", "作業者", "設備", "数量", "不良数", "Total", "開始", "終了", "製造ロット", "サイクルタイム", "疵引不良", "加工不良", "その他", "コメント"];
    fields.forEach(label => entries.push([label, item[labelToKeyMap[label]] ?? ""]));
  }

  content.innerHTML = `
    <h3 class="text-xl font-bold mb-4">${item["品番"] ?? "データ"}</h3>
    <div class="space-y-2" id="sidebarFields">
      ${entries.map(([label, value]) => `
        <div class="flex justify-between items-center">
          <label class="font-medium w-28">${label}</label>
          <input type="text" class="editable-input p-1 border rounded w-60 bg-gray-100" data-label="${label}" value="${value ?? ""}" disabled />
        </div>
      `).join("")}
    </div>
    <div class="mt-4 flex gap-2">
      <button id="editSidebarBtn" class="text-blue-600 underline text-sm">Edit</button>
      <button id="saveSidebarBtn" class="hidden bg-green-500 text-white px-3 py-1 rounded text-sm">OK</button>
      <button id="cancelSidebarBtn" class="hidden bg-gray-300 text-black px-3 py-1 rounded text-sm">Cancel</button>
    </div>
    <div class="mt-4">
      <img id="dynamicImage" src="" class="w-full rounded shadow" style="display:none;">
    </div>
  `;

  sidebar.classList.remove("translate-x-full");
  picLINK(item["背番号"], item["品番"]);

  const inputs = () => Array.from(document.querySelectorAll(".editable-input"));

  function recalculateLive() {
    const get = label => {
      const el = inputs().find(i => i.dataset.label === label);
      return el ? el.value.trim() : null;
    };
    const set = (label, value) => {
      const el = inputs().find(i => i.dataset.label === label);
      if (el) el.value = value;
    };
  
    const start = new Date(`1970-01-01T${get("開始") || "00:00"}:00Z`);
    const end = new Date(`1970-01-01T${get("終了") || "00:00"}:00Z`);
    const quantity = Number(get("数量")) || 1;
  
    const durationInSeconds = Math.max(0, (end - start) / 1000);
    const cycleTime = durationInSeconds / quantity;
    set("サイクルタイム", cycleTime.toFixed(2));
  
    let totalNG = 0;
    if (isKensa) for (let i = 1; i <= 12; i++) totalNG += Number(get(`counter-${i}`)) || 0;
    else if (isPress || isSlit) ["疵引不良", "加工不良", "その他"].forEach(f => totalNG += Number(get(f)) || 0);
    else if (isSRS) ["くっつき・めくれ", "シワ", "転写位置ズレ", "転写不良", "その他"].forEach(f => totalNG += Number(get(f)) || 0);
  
    set("不良数", totalNG);
    set("Total", quantity - totalNG);
  }

  document.getElementById("editSidebarBtn").onclick = () => {
    inputs().forEach(i => {
      i.disabled = false;
      i.addEventListener("input", () => {
        recalculateLive();
        validateInputs();
      });
    });
    document.getElementById("saveSidebarBtn").classList.remove("hidden");
    document.getElementById("cancelSidebarBtn").classList.remove("hidden");
  };

  document.getElementById("cancelSidebarBtn").onclick = () => showSidebar(originalItem);

  document.getElementById("saveSidebarBtn").onclick = async () => {
    const updatedFields = {}, counters = {};
    let processQty = 0;

    inputs().forEach(input => {
      const label = input.dataset.label;
      const key = labelToKeyMap[label];
      const val = input.value.trim();

      if (key.startsWith("Counters.")) {
        const counterKey = key.split(".")[1];
        counters[counterKey] = Number(val) || 0;
        updatedFields["Counters"] = counters;
      } else {
        updatedFields[key] = isNaN(val) ? val : Number(val);
        if (key === "Process_Quantity") processQty = Number(val);
      }
    });

    // Calculate cycle time again for final save
    if (updatedFields["Time_start"] && updatedFields["Time_end"] && processQty > 0) {
      const start = new Date(`1970-01-01T${updatedFields["Time_start"]}:00Z`);
      const end = new Date(`1970-01-01T${updatedFields["Time_end"]}:00Z`);
      const diffSeconds = (end - start) / 1000;
      updatedFields["Cycle_Time"] = Math.max(diffSeconds / processQty, 0);
    }

    // Calculate Total_NG and Total
    let totalNG = 0;
    if (isKensa) Object.values(counters).forEach(v => totalNG += v || 0);
    else if (isPress || isSlit) ["疵引不良", "加工不良", "その他"].forEach(f => totalNG += Number(updatedFields[f]) || 0);
    else if (isSRS) ["くっつき・めくれ", "シワ", "転写位置ズレ", "転写不良", "その他"].forEach(f => totalNG += Number(updatedFields[f]) || 0);

    updatedFields["Total_NG"] = totalNG;
    updatedFields["Total"] = processQty - totalNG;

    const updatePayload = {
      dbName: "submittedDB",
      collectionName: processType,
      query: {
        品番: originalItem["品番"],
        背番号: originalItem["背番号"],
        Date: originalItem["Date"]
      },
      update: { $set: updatedFields }
    };

    try {
      const res = await fetch(BASE_URL + "queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload)
      });
      await res.json();
      alert("Updated successfully.");

      // Reload factory page
      closeSidebar();
      loadFactoryPage(factoryName);
    } catch (err) {
      alert("Update failed.");
      console.error(err);
    }
  };
}

function validateInputs() {
  const intFields = ["数量", "残数量", "不良数", "Total", "疵引不良", "加工不良", "その他", "ショット数", ...Array.from({ length: 12 }, (_, i) => `counter-${i + 1}`)];
  const timeFields = ["開始", "終了"];
  const errorDiv = document.getElementById("inputError") || (() => {
    const div = document.createElement("div");
    div.id = "inputError";
    div.className = "text-red-500 text-sm mt-2";
    document.getElementById("sidebarFields").appendChild(div);
    return div;
  })();

  const inputs = document.querySelectorAll(".editable-input");
  let isValid = true;
  let messages = [];

  inputs.forEach(input => {
    const label = input.dataset.label;
    const value = input.value.trim();

    if (intFields.includes(label)) {
      if (!/^\d+$/.test(value)) {
        isValid = false;
        messages.push(`${label} must be an integer`);
        input.classList.add("border-red-500");
      } else {
        input.classList.remove("border-red-500");
      }
    }

    if (timeFields.includes(label)) {
      if (!/^\d{2}:\d{2}$/.test(value) || Number(value.split(":")[0]) > 23 || Number(value.split(":")[1]) > 59) {
        isValid = false;
        messages.push(`${label} must be in 24-hour HH:mm format`);
        input.classList.add("border-red-500");
      } else {
        input.classList.remove("border-red-500");
      }
    }
  });

  if (!isValid) {
    errorDiv.innerHTML = messages.join("<br>");
  } else {
    errorDiv.innerHTML = "";
  }

  document.getElementById("saveSidebarBtn").disabled = !isValid;
}



function closeSidebar() {
    document.getElementById("detailSidebar").classList.add("translate-x-full");
}

const picURL = 'https://script.google.com/macros/s/AKfycbwHUW1ia8hNZG-ljsguNq8K4LTPVnB6Ng_GLXIHmtJTdUgGGd2WoiQo9ToF-7PvcJh9bA/exec';

function picLINK(背番号, 品番 = null) {
    fetchImageFromSheet(背番号)
        .then(link => {
            if (!link || link.includes("not found")) {
                if (品番) return fetchImageFromSheet(品番);
                throw new Error("Image not found and no fallback.");
                console.log("Image not found for both 品番 and 背番号");
            }
            return link;
        })
        .then(finalLink => {
            if (finalLink && !finalLink.includes("not found")) {
                updateImageSrc(finalLink);
                console.log("Image loaded successfully:", finalLink);
            }
        })
        .catch(error => console.error("Image load error:", error));
}

function fetchImageFromSheet(headerValue) {
    return fetch(`${picURL}?link=${headerValue}`)
        .then(res => res.ok ? res.text() : Promise.reject("Image not found"))
        .then(data => data.replace(/"/g, ''));
}

function updateImageSrc(link) {
    const imageElement = document.getElementById("dynamicImage");
    if (!imageElement) return;
    const cleanedLink = link.replace(/.*\/d\/(.*?)\/.*/, 'https://drive.google.com/uc?export=view&id=$1');
    imageElement.src = cleanedLink;
    imageElement.alt = "Product Image";
    imageElement.style.display = "block";
}



async function loadProductionByPeriod(factory, from, to, part = "", serial = "") {
    const container = document.getElementById("dailyProduction");
    container.innerHTML = "Loading production data...";
  
    const processes = [
      { name: "Kensa", collection: "kensaDB" },
      { name: "Press", collection: "pressDB" },
      { name: "SRS", collection: "SRSDB" },
      { name: "Slit", collection: "slitDB" }
    ];
  
    const isSingleDay = from === to;
  
    const getQuery = (start, end) => {
      const query = {
        工場: factory,
        Date: {
          $gte: new Date(start).toISOString().split("T")[0],
          $lte: new Date(end).toISOString().split("T")[0]
        }
      };
      if (part) query["品番"] = part;
      if (serial) query["背番号"] = serial;
      return query;
    };
  
    try {
      if (isSingleDay) {
        const dateObj = new Date(from);
        const weekStart = new Date(dateObj); weekStart.setDate(dateObj.getDate() - 6);
        const monthStart = new Date(dateObj); monthStart.setDate(dateObj.getDate() - 29);
  
        const [dailyResults, weeklyResults, monthlyResults] = await Promise.all(
          [from, weekStart, monthStart].map((start) =>
            Promise.all(processes.map(proc =>
              fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  dbName: "submittedDB",
                  collectionName: proc.collection,
                  query: getQuery(start, dateObj)
                })
              }).then(res => res.json())
            ))
          )
        );
  
        const dataBySection = {
          Daily: dailyResults,
          Weekly: weeklyResults,
          Monthly: monthlyResults
        };
  
        const sortStates = {
          Daily: {},
          Weekly: {},
          Monthly: {}
        };
  
        window.handleSectionSort = (section, processName, column) => {
          const state = sortStates[section];
          if (state.process === processName && state.column === column) {
            state.direction *= -1;
          } else {
            state.process = processName;
            state.column = column;
            state.direction = 1;
          }
          renderSections(); // re-render
        };
  
        function renderSections() {
          container.innerHTML = Object.entries(dataBySection).map(([label, results], index) => `
            <div class="mb-8">
              ${index > 0 ? '<hr class="my-6 border-t-2 border-gray-300">' : ''}
              <h3 class="text-2xl font-semibold mb-4">${label} Production</h3>
              <div class="grid grid-cols-2 gap-4">
                ${processes.map((proc, i) => {
                  const original = results[i];
                  if (!original?.length) return `<div class="bg-white p-4 rounded shadow">${proc.name} Process (0)</div>`;
  
                  const state = sortStates[label];
                  let sorted = [...original];
  
                  if (state.process === proc.name && state.column) {
                    sorted.sort((a, b) => {
                      const valA = a[state.column] ?? "";
                      const valB = b[state.column] ?? "";
                      return valA.toString().localeCompare(valB.toString(), "ja") * state.direction;
                    });
                  }
  
                  const arrow = (col) =>
                    state.process === proc.name && state.column === col
                      ? state.direction > 0 ? " ↑" : " ↓"
                      : "";
  
                  const summary = groupAndSummarize(sorted);
  
                  const bgClassMap = {
                    Kensa: "bg-yellow-50",
                    Press: "bg-green-50",
                    SRS: "bg-gray-100",
                    Slit: "bg-blue-50"
                  };
                  
                  const bgClass = bgClassMap[proc.name] || "bg-white";
                  
                  return `
                    <div class="${bgClass} p-4 rounded shadow">
                      <h4 class="font-semibold mb-2">${proc.name} Process (${sorted.length})</h4>
                      <table class="w-full text-sm mb-2">
                        <thead>
                          <tr class="border-b font-semibold text-left">
                            <th class="cursor-pointer" onclick="handleSectionSort('${label}', '${proc.name}', '品番')">品番${arrow("品番")}</th>
                            <th class="cursor-pointer" onclick="handleSectionSort('${label}', '${proc.name}', '背番号')">背番号${arrow("背番号")}</th>
                            <th class="cursor-pointer" onclick="handleSectionSort('${label}', '${proc.name}', 'Worker_Name')">作業者${arrow("Worker_Name")}</th>
                            <th class="cursor-pointer" onclick="handleSectionSort('${label}', '${proc.name}', 'Date')">日付${arrow("Date")}</th>
                            <th class="cursor-pointer" onclick="handleSectionSort('${label}', '${proc.name}', 'Total')">Total${arrow("Total")}</th>
                            <th class="cursor-pointer" onclick="handleSectionSort('${label}', '${proc.name}', 'Total_NG')">Total NG${arrow("Total_NG")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${sorted.map(item => `
                            <tr class="cursor-pointer hover:bg-gray-100"
                                onclick='showSidebarFromElement(this)'
                                data-item='${encodeURIComponent(JSON.stringify(item))}'>
                              <td>${item.品番 ?? "-"}</td>
                              <td>${item.背番号 ?? "-"}</td>
                              <td>${item.Worker_Name ?? "-"}</td>
                              <td>${item.Date ?? "-"}</td>
                              <td>${item.Total ?? item.Process_Quantity ?? 0}</td>
                              <td>${item.Total_NG ?? 0}</td>
                            </tr>
                          `).join("")}
                        </tbody>
                      </table>
  
                      <div class="mt-4">
                        <h5 class="font-semibold mb-2">${label} Summary</h5>
                        <table class="w-full text-sm border-t mb-2">
                          <thead>
                            <tr class="border-b font-semibold text-left">
                              <th>品番</th><th>背番号</th><th>Total</th><th>Total NG</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${summary.map(row => `
                              <tr>
                                <td>${row.品番}</td>
                                <td>${row.背番号}</td>
                                <td>${row.Total}</td>
                                <td>${row.Total_NG}</td>
                              </tr>
                            `).join("")}
                          </tbody>
                        </table>
                        <div class="flex gap-4">
                          <button onclick='exportToCSV(${JSON.stringify(summary)})' class="text-blue-600 underline text-sm">Export CSV</button>
                          <button onclick='exportToPDFGrouped([{ name: "${proc.name}", summary: ${JSON.stringify(summary)} }], "${label} ${proc.name} Summary")' class="text-blue-600 underline text-sm">Export PDF</button>
                        </div>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `).join("");
        }
  
        renderSections();
      }
   else {
        const processOrder = ["Kensa", "Press", "SRS", "Slit"];
        const summaryByProcess = [];
  
        const resultsByProcess = await Promise.all(processes.map(proc =>
          fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dbName: "submittedDB",
              collectionName: proc.collection,
              query: getQuery(from, to)
            })
          }).then(res => res.json())
        ));
  
        let sortState = { process: null, column: null, direction: 1 };
  
        window.handleSort = (processName, column) => {
          if (sortState.process === processName && sortState.column === column) {
            sortState.direction *= -1;
          } else {
            sortState = { process: processName, column, direction: 1 };
          }
          renderFilteredTables();
        };
  
        function renderFilteredTables() {
          container.innerHTML = processOrder.map((procLabel, index) => {
            const records = resultsByProcess[index];
            if (!records.length) return "";
  
            const sorted = [...records].sort((a, b) => {
              if (sortState.process === procLabel && sortState.column) {
                const valA = a[sortState.column] ?? "";
                const valB = b[sortState.column] ?? "";
                return (valA.toString().localeCompare(valB.toString(), "ja")) * sortState.direction;
              }
              return 0;
            });
  
            const summary = groupAndSummarize(sorted);
            summaryByProcess.push({ name: procLabel, summary });
  
            const arrow = col =>
              sortState.process === procLabel && sortState.column === col
                ? sortState.direction > 0 ? " ↑" : " ↓"
                : "";
  
            return `
              <div class="bg-white p-4 rounded shadow mb-6">
                <h3 class="text-xl font-semibold mb-2">${procLabel} Process (${sorted.length})</h3>
                <table class="w-full text-sm mb-2">
                  <thead>
                    <tr class="border-b font-semibold text-left">
                      <th class="cursor-pointer" onclick="handleSort('${procLabel}', '品番')">品番${arrow("品番")}</th>
                      <th class="cursor-pointer" onclick="handleSort('${procLabel}', '背番号')">背番号${arrow("背番号")}</th>
                      <th class="cursor-pointer" onclick="handleSort('${procLabel}', 'Worker_Name')">作業者${arrow("Worker_Name")}</th>
                      <th class="cursor-pointer" onclick="handleSort('${procLabel}', 'Date')">日付${arrow("Date")}</th>
                      <th class="cursor-pointer" onclick="handleSort('${procLabel}', 'Total')">Total${arrow("Total")}</th>
                      <th class="cursor-pointer" onclick="handleSort('${procLabel}', 'Total_NG')">Total NG${arrow("Total_NG")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sorted.map(item => `
                      <tr class="cursor-pointer hover:bg-gray-100"
                          onclick='showSidebarFromElement(this)'
                          data-item='${encodeURIComponent(JSON.stringify(item))}'>
                        <td>${item.品番 ?? "-"}</td>
                        <td>${item.背番号 ?? "-"}</td>
                        <td>${item.Worker_Name ?? "-"}</td>
                        <td>${item.Date ?? "-"}</td>
                        <td>${item.Total ?? item.Process_Quantity ?? 0}</td>
                        <td>${item.Total_NG ?? 0}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
  
                <div class="mt-4">
                  <h5 class="font-semibold mb-2">${procLabel} Summary</h5>
                  <table class="w-full text-sm border-t mb-2">
                    <thead>
                      <tr class="border-b font-semibold text-left">
                        <th>品番</th><th>背番号</th><th>Total</th><th>Total NG</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${summary.map(row => `
                        <tr>
                          <td>${row.品番}</td>
                          <td>${row.背番号}</td>
                          <td>${row.Total}</td>
                          <td>${row.Total_NG}</td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          }).join("") + `
            <div class="bg-white p-4 rounded shadow mt-8">
              <h3 class="text-lg font-semibold mb-4">Summary by Process</h3>
              ${summaryByProcess.map(proc => {
                if (!proc.summary.length) return "";
                return `
                  <div class="mb-6">
                    <h4 class="font-semibold mb-2 border-b pb-1">${proc.name} Summary</h4>
                    <table class="w-full text-sm mb-2">
                      <thead>
                        <tr class="border-b font-semibold text-left">
                          <th>品番</th><th>背番号</th><th>Total</th><th>Total NG</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${proc.summary.map(row => `
                          <tr>
                            <td>${row.品番}</td>
                            <td>${row.背番号}</td>
                            <td>${row.Total}</td>
                            <td>${row.Total_NG}</td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  </div>
                `;
              }).join("")}
              <div class="flex gap-4">
                <button onclick='exportToCSVGrouped(${JSON.stringify(summaryByProcess)})' class="text-blue-600 underline text-sm">Export CSV</button>
                <button onclick='exportToPDFGrouped(${JSON.stringify(summaryByProcess)})' class="text-blue-600 underline text-sm">Export PDF</button>
              </div>
            </div>
          `;
        }
  
        renderFilteredTables();
      }
    } catch (err) {
      console.error("Error loading production data:", err);
      container.innerHTML = `<p class="text-red-500">Failed to load production data</p>`;
    }
  }




function getFilterQuery(factory, from, to, part, serial) {
  const query = {
    工場: factory,
    Date: {
      $gte: from || "2000-01-01",
      $lte: to || new Date().toISOString().split("T")[0]
    }
  };

  if (part) query["品番"] = part;
  if (serial) query["背番号"] = serial;

  return query;
}

function groupAndSummarize(records) {
    const grouped = {};

    records.forEach(item => {
        const key = `${item.品番 || "不明"}|${item.背番号 || "不明"}`;
        if (!grouped[key]) {
            grouped[key] = {
                品番: item.品番 || "不明",
                背番号: item.背番号 || "不明",
                Total: 0,
                Total_NG: 0
            };
        }
        grouped[key].Total += item.Total ?? item.Process_Quantity ?? 0;
        grouped[key].Total_NG += item.Total_NG ?? 0;
    });

    return Object.values(grouped);
}

function exportToCSV(data, filename = "export.csv") {
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => row[h] ?? "").join(","));
    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

async function exportToPDF(data, filename = "export.pdf") {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text("Monthly Summary", 14, 15);

    const headers = ["品番", "背番号", "Total", "Total NG"];
    const rows = data.map(row => [row.品番, row.背番号, row.Total.toString(), row.Total_NG.toString()]);

    doc.autoTable({
        startY: 20,
        head: [headers],
        body: rows,
        styles: { fontSize: 10 }
    });

    doc.save(filename);
}


function exportToCSVGrouped(processSummaries, filename = "summary.csv") {
    const rows = [];
  
    processSummaries.forEach(proc => {
      if (proc.summary.length) {
        rows.push([`${proc.name} Summary`]);
        rows.push(["品番", "背番号", "Total", "Total NG"]);
        proc.summary.forEach(row => {
          rows.push([row.品番, row.背番号, row.Total, row.Total_NG]);
        });
        rows.push([]); // blank line between groups
      }
    });
  
    const csv = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  function exportToPDFGrouped(processSummaries, filename = "summary.pdf") {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(14);
    let y = 15;
  
    processSummaries.forEach(proc => {
      if (proc.summary.length === 0) return;
  
      doc.text(`${proc.name} Summary`, 14, y);
      y += 6;
  
      const headers = ["品番", "背番号", "Total", "Total NG"];
      const rows = proc.summary.map(r => [r.品番, r.背番号, r.Total.toString(), r.Total_NG.toString()]);
  
      doc.autoTable({
        startY: y,
        head: [headers],
        body: rows,
        theme: 'striped',
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 }
      });
  
      y = doc.lastAutoTable.finalY + 10;
    });
  
    doc.save(filename);
  }







document.getElementById("languageSelector").value = currentLang;
document.getElementById("languageSelector").addEventListener("change", (e) => {
  currentLang = e.target.value;
  localStorage.setItem("lang", currentLang);
  applyLanguage();
});
applyLanguage();


document.getElementById("applyFilterBtn").addEventListener("click", () => {
    const from = document.getElementById("filterFromDate").value;
    const to = document.getElementById("filterToDate").value;
    const part = document.getElementById("filterPartNumber").value.trim();
    const serial = document.getElementById("filterSerialNumber").value.trim();
  
    loadProductionByPeriod(currentFactory, from, to, part, serial);
  });