

// Check if user is logged in
if (!localStorage.getItem("authUser")) {
  window.location.href = "login.html";
}

// Global navigation configuration - Must be defined early
window.roleAccess = {
  admin: ["dashboard", "factories", "processes", "notifications", "analytics", "userManagement", "approvals", "masterDB", "customerManagement"],
  班長: ["dashboard", "factories", "approvals", "masterDB"],
  member: ["dashboard"]
};

window.navItemsConfig = {
  dashboard: { icon: "ri-dashboard-line", label: "Dashboard" },
  factories: { icon: "ri-building-line", label: "Factories" },
  masterDB: { icon: "ri-settings-line", label: "Master 製品" },
  processes: { icon: "ri-settings-line", label: "Processes" },
  notifications: { icon: "ri-notification-line", label: "Notifications" },
  analytics: { icon: "ri-line-chart-line", label: "Analytics" },
  userManagement: { icon: "ri-user-settings-line", label: "User Management" },
  approvals: { icon: "ri-checkbox-line", label: "Approvals", badge: "12" },
  customerManagement: { icon: "ri-user-3-line", label: "Customer Management" }
};

// Make them available as global constants too
const roleAccess = window.roleAccess;
const navItemsConfig = window.navItemsConfig;

const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
const roleDisplay = document.getElementById("userRole");
if (roleDisplay) {
  roleDisplay.textContent = currentUser.role || "guest";
}
const role = currentUser.role || "guest"; // Default to guest if no role is found

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

function createNavItem(page) {
  const { icon, label, badge } = navItemsConfig[page] || {};
  if (!icon || !label) return null;

  const button = document.createElement("button");
  button.className = "nav-btn flex items-center w-full p-2 text-gray-600 rounded-lg hover:bg-gray-100";
  button.setAttribute("data-page", page);

  button.innerHTML = `
    <i class="${icon} text-lg"></i>
    <span class="ml-3" data-i18n="${page}">${label}</span>
    ${badge ? `<span class="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">${badge}</span>` : ""}
  `;

  const li = document.createElement("li");
  li.appendChild(button);
  return li;
}

function renderSidebarNavigation() {
  const navList = document.getElementById("dynamicNav");
  if (!navList) {
    console.error("dynamicNav element not found!");
    return; // Exit if element doesn't exist
  }
  
  navList.innerHTML = ""; // Clear existing items

  const allowedPages = roleAccess[role] || [];

  allowedPages.forEach(page => {
    const navItem = createNavItem(page);
    if (navItem) navList.appendChild(navItem);
  });

  // Setup nav click handlers (for active styling + loading)
  document.querySelectorAll(".nav-btn").forEach(button => {
    const page = button.getAttribute("data-page");
    button.addEventListener("click", function () {
      document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("bg-gray-100", "text-gray-900"));
      this.classList.add("bg-gray-100", "text-gray-900");
      
      loadPage(page);
    });
  });
}

// Wait for DOM to be ready before rendering navigation
document.addEventListener("DOMContentLoaded", function() {
  renderSidebarNavigation();
});

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
    
    // Check for hash in URL for direct navigation
    const hash = window.location.hash.substring(1);
    if (hash && roleAccess[role]?.includes(hash)) {
        loadPage(hash);
        // Update navigation active state
        setTimeout(() => {
            document.querySelectorAll(".nav-btn").forEach(btn => {
                btn.classList.remove("bg-gray-100", "text-gray-900");
                if (btn.getAttribute("data-page") === hash) {
                    btn.classList.add("bg-gray-100", "text-gray-900");
                }
            });
        }, 100);
    } else {
        loadPage("dashboard"); // Load dashboard by default
    }
});




// Mock data for demonstration purposes
function loadPage(page) {
    const mainContent = document.getElementById("mainContent");

    switch (page) {
        case "dashboard":
        mainContent.innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow mb-6">
                <h2 class="text-2xl font-semibold mb-4">Factory Overview</h2>
                <div id="factoryCards" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            </div>
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
            
            // window.saveUser = async (userId) => {
            //   const inputs = document.querySelectorAll(`[user-id="${userId}"]`);
            //   const updated = {};
            //   inputs.forEach(el => {
            //     const field = el.dataset.field || (el.dataset.role ? "role" : null);
            //     if (field) updated[field] = el.value;
            //   });
            
            //   try {
            //     const res = await fetch(BASE_URL + "updateUser", {
            //       method: "POST",
            //       headers: { "Content-Type": "application/json" },
            //       body: JSON.stringify({ userId, ...updated })
            //     });
            
            //     const result = await res.json();
            //     if (!res.ok) throw new Error(result.error || "Failed to update user");
            
            //     alert("User updated");
            //     loadUserTable();
            //   } catch (err) {
            //     alert(err.message);
            //   }
            // };

            window.saveUser = async (userId) => {
              const inputs = document.querySelectorAll(`[user-id="${userId}"]`);
              const updated = {};
              inputs.forEach(el => {
                // Corrected line below
                const field = el.dataset.field || (el.hasAttribute('data-role') ? "role" : null);
                if (field) {
                  updated[field] = el.value;
                }
              });
            
              try {
                const res = await fetch(BASE_URL + "updateUser", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, ...updated }) // Spread updated properties
                });
            
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Failed to update user");
            
                alert("User updated");
                loadUserTable(); // Reloads the table to show updated data and reset edit states
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
              <div class="bg-white p-6 rounded-xl shadow mb-6">
                  <h2 class="text-2xl font-semibold mb-4">Factory List</h2>
                  <div id="factoryList" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
              </div>
          `;
          renderFactoryList();
          break;

        case "masterDB":
          mainContent.innerHTML = `
            <h2 class="text-2xl font-semibold mb-4">Master 製品一覧</h2>
            <div class="bg-white p-4 rounded shadow mb-6">
              <h3 class="text-lg font-semibold mb-2">Upload Master Data CSV</h3>
              <input type="file" id="csvUploadInput" accept=".csv" class="mb-2" />
              <button class="bg-blue-500 text-white px-4 py-2 rounded" onclick="handleMasterCSVUpload()">Upload & Preview</button>
              <div id="csvPreviewContainer" class="mt-4"></div>
            </div>

            <!-- Filter Dropdowns -->
            <div class="mb-4 flex gap-4">
              <select id="filterFactory" class="p-2 border rounded"><option value="">All 工場</option></select>
              <select id="filterRL" class="p-2 border rounded"><option value="">All R/L</option></select>
              <select id="filterColor" class="p-2 border rounded"><option value="">All 色</option></select>
              <select id="filterProcess" class="p-2 border rounded"><option value="">All 加工設備</option></select>
            </div>

            <!-- Search Input -->
            <div class="mb-4">
              <input type="text" id="masterSearchInput" class="w-1/2 p-2 border rounded" placeholder="Search by 品番, モデル, 背番号, 品名..." />
            </div>

            <div id="masterTableContainer">Loading...</div>
          `;

          let masterData = [];
          let masterSortState = { column: null, direction: 1 };

          async function loadMasterDB() {
            try {
              const res = await fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  dbName: "Sasaki_Coating_MasterDB",
                  collectionName: "masterDB",
                  query: {},
                  projection: {}
                })
              });

              masterData = await res.json();
              renderMasterTable(masterData);
            } catch (err) {
              console.error("Failed to load masterDB:", err);
              document.getElementById("masterTableContainer").innerHTML = `<p class="text-red-500">Error loading data.</p>`;
            }
          }

          function renderMasterTable(data) {
            if (!data.length) {
              document.getElementById("masterTableContainer").innerHTML = `<p>No data found.</p>`;
              return;
            }

            const headers = [
              "品番", "モデル", "背番号", "品名", "形状", "R/L", "色", "顧客/納入先", "備考",
              "加工設備", "QR CODE", "型番", "材料背番号", "材料", "収容数", "工場", "秒数(1pcs何秒)",
              "離型紙上/下", "送りピッチ", "SRS", "SLIT"
            ];

            const arrow = col =>
              masterSortState.column === col
                ? masterSortState.direction > 0 ? " ↑" : " ↓"
                : "";

            const tableHTML = `
              <div class="overflow-auto max-h-[70vh]">
                <table class="w-full text-sm border">
                  <thead class="bg-gray-100 sticky top-0">
                    <tr>
                      ${headers.map(h => `<th class="px-4 py-2 cursor-pointer" onclick="handleMasterSort('${h}')">${h}${arrow(h)}</th>`).join("")}
                    </tr>
                  </thead>
                  <tbody>
                    ${data.map(row => `
                      <tr class="border-t hover:bg-gray-50 cursor-pointer"
                          onclick='showMasterSidebarFromRow(this)'
                          data-row='${encodeURIComponent(JSON.stringify(row))}'>
                        ${headers.map(h => `<td class="px-4 py-2">${row[h] ?? ""}</td>`).join("")}
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            `;

            document.getElementById("masterTableContainer").innerHTML = tableHTML;
          }

          window.handleMasterSort = (col) => {
            if (masterSortState.column === col) {
              masterSortState.direction *= -1;
            } else {
              masterSortState.column = col;
              masterSortState.direction = 1;
            }

            const sorted = [...masterData].sort((a, b) => {
              const valA = (a[col] || "").toString();
              const valB = (b[col] || "").toString();
              return valA.localeCompare(valB, "ja") * masterSortState.direction;
            });

            renderMasterTable(sorted);
          };

          window.showMasterSidebarFromRow = (el) => {
            const data = JSON.parse(decodeURIComponent(el.getAttribute("data-row")));
            showMasterSidebar(data);
          };

          // Filtering logic
          document.getElementById("masterSearchInput").addEventListener("input", applyMasterFilters);
          ["filterFactory", "filterRL", "filterColor", "filterProcess"].forEach(id => {
            document.getElementById(id).addEventListener("change", applyMasterFilters);
          });

          function applyMasterFilters() {
            const keyword = document.getElementById("masterSearchInput").value.toLowerCase();
            const factory = document.getElementById("filterFactory").value;
            const rl = document.getElementById("filterRL").value;
            const color = document.getElementById("filterColor").value;
            const process = document.getElementById("filterProcess").value;

            const filtered = masterData.filter(item => {
              const keywordMatch = ["品番", "モデル", "背番号", "品名", "工場", "加工設備"]
                .some(key => (item[key] || "").toLowerCase().includes(keyword));

              const factoryMatch = !factory || item["工場"] === factory;
              const rlMatch = !rl || item["R/L"] === rl;
              const colorMatch = !color || item["色"] === color;
              const processMatch = !process || item["加工設備"] === process;

              return keywordMatch && factoryMatch && rlMatch && colorMatch && processMatch;
            });

            renderMasterTable(filtered);
          }

          async function loadMasterFilters() {
            const fields = ["工場", "R/L", "色", "加工設備"];
            const dropdownMap = {
              "工場": "filterFactory",
              "R/L": "filterRL",
              "色": "filterColor",
              "加工設備": "filterProcess"
            };

            for (const field of fields) {
              try {
                const res = await fetch(BASE_URL + "queries", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    dbName: "Sasaki_Coating_MasterDB",
                    collectionName: "masterDB",
                    aggregation: [
                      { $group: { _id: `$${field}` } },
                      { $sort: { _id: 1 } }
                    ]
                  })
                });

                const values = await res.json();
                const select = document.getElementById(dropdownMap[field]);

                if (select && values.length) {
                  values.forEach(v => {
                    if (v._id) {
                      const option = document.createElement("option");
                      option.value = v._id;
                      option.textContent = v._id;
                      select.appendChild(option);
                    }
                  });
                }
              } catch (err) {
                console.error(`Failed to load filter for ${field}`, err);
              }
            }
          }

          loadMasterDB();
          loadMasterFilters();
          break;

        case "customerManagement":
          if (role !== "admin") {
            mainContent.innerHTML = `<p class="text-red-600 font-semibold">Access Denied</p>`;
            return;
          }

          mainContent.innerHTML = `
            <div class="max-w-6xl mx-auto bg-white p-6 rounded shadow">
              <h1 class="text-2xl font-semibold mb-6">Master User Admin Panel</h1>
              <input type="text" id="searchInput" placeholder="Search by username, company, or email..." class="w-full p-2 border mb-4 rounded" />

              <form id="createMasterUserForm" class="bg-white p-6 rounded shadow-md mb-6">
                <h2 class="text-xl font-semibold mb-4">Create Master User</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input id="masterUsername" placeholder="Username" class="p-2 border rounded" />
                  <input type="password" id="masterPassword" placeholder="Password" class="p-2 border rounded" />
                  <input id="masterCompany" placeholder="Company Name" class="p-2 border rounded" />
                  <input type="email" id="masterEmail" placeholder="Email" class="p-2 border rounded" />
                  <input type="date" id="masterValidUntil" class="p-2 border rounded" />
                  <input id="masterDbName" placeholder="Database Name" class="p-2 border rounded" />
                </div>
                <h3 class="text-md font-semibold mt-4 mb-2">Devices (optional)</h3>
                <div id="deviceListCreate" class="mb-4"></div>
                <button type="button" onclick="addDeviceRow(document.getElementById('deviceListCreate'))" class="text-blue-600 text-sm mb-4">+ Add Device</button>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded w-full">Create Master User</button>
              </form>

              <table class="w-full text-sm border">
                <thead class="bg-gray-200">
                  <tr>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('username')">Username</th>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('company')">Company</th>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('email')">Email</th>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('validUntil')">Valid Until</th>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('dbName')">Database</th>
                    <th class="px-3 py-2">Devices</th>
                    <th class="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody id="masterUsersTable"></tbody>
              </table>
            </div>

            <!-- Edit Modal -->
            <div id="editModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
              <div class="bg-white p-6 rounded shadow max-w-2xl w-full">
                <h2 class="text-lg font-semibold mb-4">Edit Master User</h2>
                <form id="editMasterUserForm" class="grid gap-4">
                  <input hidden id="editId" />
                  <input id="editCompany" placeholder="Company Name" class="border p-2 rounded" />
                  <input type="email" id="editEmail" placeholder="Email" class="border p-2 rounded" />
                  <input type="date" id="editValidUntil" class="border p-2 rounded" />
                  <input id="editDbName" placeholder="Database Name" class="border p-2 rounded" />

                  <h3 class="text-md font-semibold mt-2">Devices</h3>
                  <div id="deviceListContainer"></div>
                  <button type="button" onclick="addDeviceRow(document.getElementById('deviceListContainer'))" class="text-blue-600 text-sm">+ Add Device</button>

                  <div class="flex justify-end gap-2">
                    <button type="button" onclick="closeEditModal()" class="bg-gray-300 px-3 py-1 rounded">Cancel</button>
                    <button type="submit" class="bg-green-600 text-white px-3 py-1 rounded">Save</button>
                  </div>
                </form>
              </div>
            </div>
          `;

          // Customer Management JavaScript functionality
          const masterUserURL = "https://kurachi.onrender.com";
          let masterUsers = [];
          let masterUserSortKey = "";
          let masterUserSortDirection = 1;

          function generateUniqueID() {
            return Math.random().toString(36).substring(2, 8).toUpperCase();
          }

          window.addDeviceRow = function(container, device = {}) {
            const id = device.uniqueId || generateUniqueID();
            const div = document.createElement("div");
            div.className = "device-row grid grid-cols-1 md:grid-cols-3 gap-2 mb-2 items-center";
            div.innerHTML = `
              <input placeholder="Device Name" class="device-name border p-2 rounded" value="${device.name || ""}" />
              <input placeholder="Unique ID" class="device-uid border p-2 rounded" value="${id}" readonly />
              <div class="flex gap-2">
                <input placeholder="Brand" class="device-brand border p-2 rounded w-full" value="${device.brand || ""}" />
                <button class="bg-red-500 text-white px-2 rounded" onclick="this.closest('.device-row').remove()">&times;</button>
              </div>`;
            container.appendChild(div);
          };

          async function fetchMasterUsers() {
            try {
              const res = await fetch(`${masterUserURL}/masterUsers`);
              masterUsers = await res.json();
              renderMasterUserTable();
            } catch (err) {
              console.error("Failed to fetch master users:", err);
            }
          }

          function renderMasterUserTable() {
            const search = document.getElementById("searchInput").value.toLowerCase();
            let filtered = masterUsers.filter(u =>
              u.username.toLowerCase().includes(search) ||
              u.company.toLowerCase().includes(search) ||
              u.email.toLowerCase().includes(search)
            );

            if (masterUserSortKey) {
              filtered.sort((a, b) => {
                const aVal = (a[masterUserSortKey] || "").toLowerCase?.() ?? "";
                const bVal = (b[masterUserSortKey] || "").toLowerCase?.() ?? "";
                return (aVal > bVal ? 1 : -1) * masterUserSortDirection;
              });
            }

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const tbody = document.getElementById("masterUsersTable");
            tbody.innerHTML = filtered.map(u => {
              const validDate = new Date(u.validUntil);
              const isExpiring =
                validDate.getMonth() === currentMonth &&
                validDate.getFullYear() === currentYear;

              const rowClass = isExpiring ? "bg-yellow-100 text-red-600 font-semibold" : "";

              return `
                <tr class="border-t ${rowClass}">
                  <td class="px-3 py-2">${u.username}</td>
                  <td class="px-3 py-2">${u.company}</td>
                  <td class="px-3 py-2">${u.email}</td>
                  <td class="px-3 py-2">${u.validUntil?.split("T")[0]}</td>
                  <td class="px-3 py-2">${u.dbName}</td>
                  <td class="px-3 py-2">${(u.devices || []).length}</td>
                  <td class="px-3 py-2">
                    <button class="text-blue-600 mr-2" onclick='openEditModal(${JSON.stringify(u)})'>Edit</button>
                    <button class="text-red-600" onclick='deleteMasterUser("${u._id}")'>Delete</button>
                  </td>
                </tr>
              `;
            }).join("");
          }

          window.openEditModal = function(user) {
            document.getElementById("editId").value = user._id;
            document.getElementById("editCompany").value = user.company;
            document.getElementById("editEmail").value = user.email;
            document.getElementById("editValidUntil").value = user.validUntil?.split("T")[0];
            document.getElementById("editDbName").value = user.dbName;
            const container = document.getElementById("deviceListContainer");
            container.innerHTML = "";
            (user.devices || []).forEach(d => addDeviceRow(container, d));
            document.getElementById("editModal").classList.remove("hidden");
            document.getElementById("editModal").classList.add("flex");
          };

          window.closeEditModal = function() {
            document.getElementById("editModal").classList.add("hidden");
            document.getElementById("editModal").classList.remove("flex");
          };

          window.sortMasterUserTable = function(key) {
            masterUserSortKey = key;
            masterUserSortDirection *= -1;
            renderMasterUserTable();
          };

          window.deleteMasterUser = async function(id) {
            if (!confirm("Are you sure?")) return;
            try {
              const res = await fetch(`${masterUserURL}/deleteMasterUser`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
              });
              if (res.ok) {
                alert("Deleted");
                fetchMasterUsers();
              }
            } catch (err) {
              console.error("Failed to delete master user:", err);
            }
          };

          // Form submission handlers
          document.getElementById("editMasterUserForm").onsubmit = async (e) => {
            e.preventDefault();
            const container = document.getElementById("deviceListContainer");
            const devices = Array.from(container.querySelectorAll(".device-row")).map(row => ({
              name: row.querySelector(".device-name").value.trim(),
              uniqueId: row.querySelector(".device-uid").value.trim(),
              brand: row.querySelector(".device-brand").value.trim()
            }));
            const ids = devices.map(d => d.uniqueId);
            if (new Set(ids).size !== ids.length) return alert("Duplicate device uniqueID found.");
            
            const body = {
              id: document.getElementById("editId").value,
              company: document.getElementById("editCompany").value,
              email: document.getElementById("editEmail").value,
              validUntil: document.getElementById("editValidUntil").value,
              dbName: document.getElementById("editDbName").value,
              devices
            };
            
            try {
              const res = await fetch(`${masterUserURL}/updateMasterUser`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
              });
              if (res.ok) {
                alert("Updated");
                closeEditModal();
                fetchMasterUsers();
              }
            } catch (err) {
              console.error("Failed to update master user:", err);
            }
          };

          document.getElementById("createMasterUserForm").onsubmit = async (e) => {
            e.preventDefault();
            const devices = Array.from(document.getElementById("deviceListCreate").querySelectorAll(".device-row")).map(row => ({
              name: row.querySelector(".device-name").value.trim(),
              uniqueId: row.querySelector(".device-uid").value.trim(),
              brand: row.querySelector(".device-brand").value.trim()
            }));
            const ids = devices.map(d => d.uniqueId);
            if (new Set(ids).size !== ids.length) return alert("Duplicate device uniqueID found.");
            
            const body = {
              username: document.getElementById("masterUsername").value,
              password: document.getElementById("masterPassword").value,
              company: document.getElementById("masterCompany").value,
              email: document.getElementById("masterEmail").value,
              validUntil: document.getElementById("masterValidUntil").value,
              dbName: document.getElementById("masterDbName").value,
              devices
            };
            
            try {
              const res = await fetch(`${masterUserURL}/createMasterUser`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
              });
              if (res.ok) {
                alert("Master user created");
                e.target.reset();
                document.getElementById("deviceListCreate").innerHTML = "";
                fetchMasterUsers();
              }
            } catch (err) {
              console.error("Failed to create master user:", err);
            }
          };

          document.getElementById("searchInput").addEventListener("input", renderMasterUserTable);
          fetchMasterUsers();
          break;

        default:
            mainContent.innerHTML = `<h2 class="text-xl font-semibold">Page Not Found</h2>`;
            break;
    }
}

// Make loadPage globally available for navbar.js
window.loadPage = loadPage;


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


