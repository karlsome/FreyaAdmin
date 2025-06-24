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
  admin: ["dashboard", "factories", "processes", "notifications", "analytics", "userManagement", "approvals", "masterDB", "customerManagement"],
  班長: ["dashboard", "factories", "approvals", "masterDB"],
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

const navItemsConfig = {
  dashboard: { icon: "ri-dashboard-line", label: "Dashboard" },
  factories: { icon: "ri-building-line", label: "Factories" },
  masterDB: { icon: "ri-settings-line", label: "Master 製品" },
  processes: { icon: "ri-settings-line", label: "Processes" },
  notifications: { icon: "ri-notification-line", label: "Notifications" },
  analytics: { icon: "ri-line-chart-line", label: "Analytics" },
  userManagement: { icon: "ri-user-settings-line", label: "User Management" },
  approvals: { icon: "ri-checkbox-line", label: "Approvals", badge: "12" },
  customerManagement: { icon: "ri-user-3-line", label: "Customer Management" },
};

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
      loadPage(page); // You must define loadPage(page) elsewhere
    });
  });
}
renderSidebarNavigation();

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
            break;        case "approvals":
            mainContent.innerHTML = `
                <h2 class="text-2xl font-semibold mb-6">データ承認システム</h2>
                
                <!-- Process Tabs -->
                <div class="border-b border-gray-200 mb-6">
                    <nav class="-mb-px flex space-x-8">
                        <button class="approval-tab-btn py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap active" 
                                data-tab="kensaDB" onclick="switchApprovalTab('kensaDB')">
                            検査 (Kensa)
                        </button>
                        <button class="approval-tab-btn py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap" 
                                data-tab="pressDB" onclick="switchApprovalTab('pressDB')">
                            プレス (Press)
                        </button>
                        <button class="approval-tab-btn py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap" 
                                data-tab="SRSDB" onclick="switchApprovalTab('SRSDB')">
                            SRS
                        </button>
                        <button class="approval-tab-btn py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap" 
                                data-tab="slitDB" onclick="switchApprovalTab('slitDB')">
                            スリット (Slit)
                        </button>
                    </nav>
                </div>

                <!-- Tab Content Container -->
                <div id="approvalTabContent">
                    <!-- Stats Cards -->
                    <div class="grid grid-cols-4 gap-4 mb-6">
                        <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <h3 class="text-sm font-medium text-yellow-800">保留中</h3>
                            <p class="text-2xl font-bold text-yellow-900" id="pendingCount">0</p>
                        </div>
                        <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h3 class="text-sm font-medium text-green-800">承認済み</h3>
                            <p class="text-2xl font-bold text-green-900" id="approvedCount">0</p>
                        </div>
                        <div class="bg-red-50 p-4 rounded-lg border border-red-200">
                            <h3 class="text-sm font-medium text-red-800">修正要求</h3>
                            <p class="text-2xl font-bold text-red-900" id="correctionCount">0</p>
                        </div>
                        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h3 class="text-sm font-medium text-blue-800">今日の総数</h3>
                            <p class="text-2xl font-bold text-blue-900" id="totalCount">0</p>
                        </div>
                    </div>

                    <!-- Controls -->
                    <div class="flex flex-wrap gap-4 mb-6">
                        <button id="refreshBtn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                            🔄 データ更新
                        </button>
                        <select id="factoryFilter" class="p-2 border rounded">
                            <option value="">All 工場</option>
                        </select>
                        <select id="statusFilter" class="p-2 border rounded">
                            <option value="">All Status</option>
                            <option value="pending">保留中</option>
                            <option value="approved">承認済み</option>
                            <option value="correction_needed">修正要求</option>
                        </select>
                        <input type="date" id="dateFilter" class="p-2 border rounded">
                        <input type="text" id="approvalSearchInput" placeholder="品番、背番号、作業者で検索..." class="p-2 border rounded flex-1 min-w-64">
                        <select id="itemsPerPageSelect" class="p-2 border rounded">
                            <option value="10">10件表示</option>
                            <option value="50">50件表示</option>
                            <option value="100">100件表示</option>
                        </select>
                    </div>

                    <!-- Table Container -->
                    <div class="bg-white rounded-lg shadow border" id="approvalsTableContainer">
                        <div class="p-8 text-center text-gray-500">データを読み込み中...</div>
                    </div>

                    <!-- Pagination -->
                    <div class="flex items-center justify-between mt-6">
                        <div class="text-sm text-gray-700" id="pageInfo">0件中 0-0件を表示</div>
                        <div class="flex items-center space-x-2">
                            <button id="prevPageBtn" class="p-2 border rounded hover:bg-gray-50" disabled>前へ</button>
                            <div id="pageNumbers" class="flex space-x-1"></div>
                            <button id="nextPageBtn" class="p-2 border rounded hover:bg-gray-50" disabled>次へ</button>
                        </div>
                    </div>
                </div>

                <!-- Approval Modal -->
                <div id="approvalModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                            <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                                <h3 class="text-lg font-semibold">データ承認</h3>
                                <button onclick="closeApprovalModal()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                            </div>
                            <div id="approvalModalContent" class="p-6"></div>
                        </div>
                    </div>
                </div>
            `;
            initializeApprovalSystem();
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

          // Master User Management JavaScript functionality
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
            <!-- Header Section -->
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-semibold text-gray-800">Master 製品管理</h2>
              <div class="flex items-center space-x-3">
                <button id="refreshMasterBtn" class="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                  <i class="ri-refresh-line mr-1"></i>更新
                </button>
              </div>
            </div>

            <!-- CSV Upload Section -->
            <div class="bg-white p-4 rounded-lg shadow-sm mb-6 border">
              <div class="flex items-center space-x-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">CSVファイル</label>
                  <input type="file" id="csvUploadInput" accept=".csv" class="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                <button class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm" onclick="handleMasterCSVUpload()">
                  <i class="ri-upload-line mr-1"></i>アップロード & プレビュー
                </button>
              </div>
              <div id="csvPreviewContainer" class="mt-4"></div>
            </div>

            <!-- Filters Section -->
            <div class="bg-white p-4 rounded-lg shadow-sm mb-6 border">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">工場</label>
                  <select id="filterFactory" class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">すべて</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">R/L</label>
                  <select id="filterRL" class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">すべて</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">色</label>
                  <select id="filterColor" class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">すべて</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">加工設備</label>
                  <select id="filterProcess" class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">すべて</option>
                  </select>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs font-medium text-gray-700 mb-1">検索</label>
                  <input type="text" id="masterSearchInput" class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="品番、モデル、背番号、品名で検索..." />
                </div>
              </div>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div class="bg-white p-4 rounded-lg shadow-sm border">
                <div class="flex items-center">
                  <div class="p-2 bg-blue-100 rounded-lg">
                    <i class="ri-database-line text-blue-600"></i>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-600">総件数</p>
                    <p class="text-2xl font-bold text-gray-900" id="totalMasterCount">0</p>
                  </div>
                </div>
              </div>
              <div class="bg-white p-4 rounded-lg shadow-sm border">
                <div class="flex items-center">
                  <div class="p-2 bg-green-100 rounded-lg">
                    <i class="ri-image-line text-green-600"></i>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-600">画像あり</p>
                    <p class="text-2xl font-bold text-gray-900" id="withImageCount">0</p>
                  </div>
                </div>
              </div>
              <div class="bg-white p-4 rounded-lg shadow-sm border">
                <div class="flex items-center">
                  <div class="p-2 bg-yellow-100 rounded-lg">
                    <i class="ri-image-off-line text-yellow-600"></i>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-600">画像なし</p>
                    <p class="text-2xl font-bold text-gray-900" id="withoutImageCount">0</p>
                  </div>
                </div>
              </div>
              <div class="bg-white p-4 rounded-lg shadow-sm border">
                <div class="flex items-center">
                  <div class="p-2 bg-purple-100 rounded-lg">
                    <i class="ri-filter-line text-purple-600"></i>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-600">表示中</p>
                    <p class="text-2xl font-bold text-gray-900" id="filteredCount">0</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Table Controls -->
            <div class="bg-white p-4 rounded-lg shadow-sm border mb-4">
              <div class="flex justify-between items-center">
                <div class="flex items-center space-x-3">
                  <label class="text-sm font-medium text-gray-700">表示件数:</label>
                  <select id="masterItemsPerPageSelect" class="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="10">10件</option>
                    <option value="25" selected>25件</option>
                    <option value="50">50件</option>
                    <option value="100">100件</option>
                  </select>
                </div>
                <div class="text-sm text-gray-600" id="masterPageInfo">
                  0件中 0-0件を表示
                </div>
              </div>
            </div>

            <!-- Table Container -->
            <div class="bg-white rounded-lg shadow-sm border">
              <div id="masterTableContainer" class="min-h-[400px] flex items-center justify-center">
                <div class="text-center">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p class="text-gray-500">データを読み込み中...</p>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div class="bg-white p-4 rounded-lg shadow-sm border mt-4">
              <div class="flex justify-between items-center">
                <div class="text-sm text-gray-600" id="masterPaginationInfo">
                  0件中 0-0件を表示
                </div>
                <div class="flex items-center space-x-2">
                  <button id="masterPrevPageBtn" class="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                    <i class="ri-arrow-left-line"></i> 前へ
                  </button>
                  <div id="masterPageNumbers" class="flex space-x-1">
                    <!-- Page numbers will be inserted here -->
                  </div>
                  <button id="masterNextPageBtn" class="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                    次へ <i class="ri-arrow-right-line"></i>
                  </button>
                </div>
              </div>
            </div>
          `;

          let masterData = [];
          let filteredMasterData = [];
          let masterSortState = { column: null, direction: 1 };
          let currentMasterPage = 1;
          let masterItemsPerPage = 25;

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
              filteredMasterData = [...masterData];
              updateMasterStats();
              renderMasterTable();
            } catch (err) {
              console.error("Failed to load masterDB:", err);
              document.getElementById("masterTableContainer").innerHTML = `<div class="text-center py-8"><p class="text-red-500">データの読み込みに失敗しました</p></div>`;
            }
          }

          function updateMasterStats() {
            const total = masterData.length;
            const withImage = masterData.filter(item => item.imageURL).length;
            const withoutImage = total - withImage;
            const filtered = filteredMasterData.length;

            document.getElementById('totalMasterCount').textContent = total;
            document.getElementById('withImageCount').textContent = withImage;
            document.getElementById('withoutImageCount').textContent = withoutImage;
            document.getElementById('filteredCount').textContent = filtered;
          }

          function renderMasterTable() {
            if (!filteredMasterData.length) {
              document.getElementById("masterTableContainer").innerHTML = `
                <div class="text-center py-8">
                  <i class="ri-database-line text-4xl text-gray-400 mb-2"></i>
                  <p class="text-gray-500">データが見つかりません</p>
                </div>
              `;
              updateMasterPagination(0);
              return;
            }

            const startIndex = (currentMasterPage - 1) * masterItemsPerPage;
            const endIndex = startIndex + masterItemsPerPage;
            const pageData = filteredMasterData.slice(startIndex, endIndex);

            const headers = [
              { key: "品番", label: "品番" },
              { key: "モデル", label: "モデル" },
              { key: "背番号", label: "背番号" },
              { key: "品名", label: "品名" },
              { key: "形状", label: "形状" },
              { key: "R/L", label: "R/L" },
              { key: "色", label: "色" },
              { key: "工場", label: "工場" },
              { key: "加工設備", label: "加工設備" },
              { key: "imageURL", label: "画像" }
            ];

            const getSortArrow = (col) => {
              if (masterSortState.column !== col) return '';
              return masterSortState.direction === 1 ? ' ↑' : ' ↓';
            };

            const tableHTML = `
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 border-b">
                    <tr>
                      ${headers.map(h => `
                        <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100 ${h.key === 'imageURL' ? 'w-20' : ''}" onclick="handleMasterSort('${h.key}')">
                          ${h.label}${getSortArrow(h.key)}
                        </th>
                      `).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${pageData.map(row => `
                      <tr class="border-b hover:bg-gray-50 cursor-pointer" onclick='showMasterSidebarFromRow(this)' data-row='${encodeURIComponent(JSON.stringify(row))}'>
                        <td class="px-4 py-3 font-medium text-blue-600">${row["品番"] || ""}</td>
                        <td class="px-4 py-3">${row["モデル"] || ""}</td>
                        <td class="px-4 py-3">${row["背番号"] || ""}</td>
                        <td class="px-4 py-3">${row["品名"] || ""}</td>
                        <td class="px-4 py-3">${row["形状"] || ""}</td>
                        <td class="px-4 py-3">${row["R/L"] || ""}</td>
                        <td class="px-4 py-3">${row["色"] || ""}</td>
                        <td class="px-4 py-3">${row["工場"] || ""}</td>
                        <td class="px-4 py-3">${row["加工設備"] || ""}</td>
                        <td class="px-4 py-3">
                          ${row.imageURL 
                            ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><i class="ri-image-line mr-1"></i>あり</span>'
                            : '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><i class="ri-image-off-line mr-1"></i>なし</span>'
                          }
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `;

            document.getElementById("masterTableContainer").innerHTML = tableHTML;
            updateMasterPagination(filteredMasterData.length);
          }

          function updateMasterPagination(totalItems) {
            const totalPages = Math.ceil(totalItems / masterItemsPerPage);
            const pageInfo = document.getElementById('masterPageInfo');
            const paginationInfo = document.getElementById('masterPaginationInfo');
            const pageNumbers = document.getElementById('masterPageNumbers');
            const prevBtn = document.getElementById('masterPrevPageBtn');
            const nextBtn = document.getElementById('masterNextPageBtn');

            if (totalItems === 0) {
              pageInfo.textContent = '0件中 0-0件を表示';
              paginationInfo.textContent = '0件中 0-0件を表示';
              pageNumbers.innerHTML = '';
              prevBtn.disabled = true;
              nextBtn.disabled = true;
              return;
            }

            const startItem = (currentMasterPage - 1) * masterItemsPerPage + 1;
            const endItem = Math.min(currentMasterPage * masterItemsPerPage, totalItems);
            const infoText = `${totalItems}件中 ${startItem}-${endItem}件を表示`;
            
            pageInfo.textContent = infoText;
            paginationInfo.textContent = infoText;

            // Generate page numbers
            pageNumbers.innerHTML = '';
            const startPage = Math.max(1, currentMasterPage - 2);
            const endPage = Math.min(totalPages, currentMasterPage + 2);

            for (let i = startPage; i <= endPage; i++) {
              const pageBtn = document.createElement('button');
              pageBtn.className = `px-3 py-2 text-sm rounded-lg ${i === currentMasterPage ? 'bg-blue-500 text-white' : 'border border-gray-300 hover:bg-gray-50'}`;
              pageBtn.textContent = i;
              pageBtn.onclick = () => goToMasterPage(i);
              pageNumbers.appendChild(pageBtn);
            }

            prevBtn.disabled = currentMasterPage === 1;
            nextBtn.disabled = currentMasterPage === totalPages;
          }

          function goToMasterPage(page) {
            currentMasterPage = page;
            renderMasterTable();
          }

          function changeMasterPage(direction) {
            const totalPages = Math.ceil(filteredMasterData.length / masterItemsPerPage);
            const newPage = currentMasterPage + direction;
            
            if (newPage >= 1 && newPage <= totalPages) {
              currentMasterPage = newPage;
              renderMasterTable();
            }
          }

          window.handleMasterSort = (col) => {
            if (masterSortState.column === col) {
              masterSortState.direction *= -1;
            } else {
              masterSortState.column = col;
              masterSortState.direction = 1;
            }

            filteredMasterData.sort((a, b) => {
              const valA = (a[col] || "").toString();
              const valB = (b[col] || "").toString();
              return valA.localeCompare(valB, "ja") * masterSortState.direction;
            });

            currentMasterPage = 1;
            renderMasterTable();
          };

          window.showMasterSidebarFromRow = (el) => {
            const data = JSON.parse(decodeURIComponent(el.getAttribute("data-row")));
            showMasterSidebar(data);
          };

          // Event listeners
          document.getElementById('refreshMasterBtn').addEventListener('click', loadMasterDB);
          document.getElementById('masterItemsPerPageSelect').addEventListener('change', function() {
            masterItemsPerPage = parseInt(this.value);
            currentMasterPage = 1;
            renderMasterTable();
          });
          document.getElementById('masterPrevPageBtn').addEventListener('click', () => changeMasterPage(-1));
          document.getElementById('masterNextPageBtn').addEventListener('click', () => changeMasterPage(1));

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

            filteredMasterData = masterData.filter(item => {
              const keywordMatch = ["品番", "モデル", "背番号", "品名", "工場", "加工設備"]
                .some(key => (item[key] || "").toLowerCase().includes(keyword));

              const factoryMatch = !factory || item["工場"] === factory;
              const rlMatch = !rl || item["R/L"] === rl;
              const colorMatch = !color || item["色"] === color;
              const processMatch = !process || item["加工設備"] === process;

              return keywordMatch && factoryMatch && rlMatch && colorMatch && processMatch;
            });

            currentMasterPage = 1;
            updateMasterStats();
            renderMasterTable();
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

        default:
            mainContent.innerHTML = `<h2 class="text-xl font-semibold">Page Not Found</h2>`;
            break;
    }
}


// ==================== APPROVAL SYSTEM ====================

let currentApprovalPage = 1;
let itemsPerPage = 10;
let allApprovalData = [];
let filteredApprovalData = [];
let approvalSortState = { column: null, direction: 1 };
let currentApprovalTab = 'kensaDB'; // Default tab

/**
 * Initialize the approval system
 */
function initializeApprovalSystem() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFilter').value = today;
    
    // Event listeners
    document.getElementById('refreshBtn').addEventListener('click', loadApprovalData);
    document.getElementById('factoryFilter').addEventListener('change', applyApprovalFilters);
    document.getElementById('statusFilter').addEventListener('change', applyApprovalFilters);
    document.getElementById('dateFilter').addEventListener('change', applyApprovalFilters);
    document.getElementById('approvalSearchInput').addEventListener('input', applyApprovalFilters);
    document.getElementById('itemsPerPageSelect').addEventListener('change', function() {
        itemsPerPage = parseInt(this.value);
        currentApprovalPage = 1;
        renderApprovalTable();
    });
    document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));
    
    // Initialize tab styles
    updateTabStyles();
    
    // Load initial data
    loadApprovalData();
}

/**
 * Switch between approval tabs
 */
window.switchApprovalTab = function(tabName) {
    currentApprovalTab = tabName;
    updateTabStyles();
    loadApprovalData();
};

/**
 * Update tab button styles
 */
function updateTabStyles() {
    document.querySelectorAll('.approval-tab-btn').forEach(btn => {
        if (btn.dataset.tab === currentApprovalTab) {
            btn.className = 'approval-tab-btn py-2 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm whitespace-nowrap active';
        } else {
            btn.className = 'approval-tab-btn py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap';
        }
    });
}

/**
 * Load approval data from database
 */
async function loadApprovalData() {
    try {
        const currentUserData = JSON.parse(localStorage.getItem("authUser") || "{}");
        
        // Determine query based on user role and current tab
        let query = {};
        if (currentUserData.role === '班長' && currentUserData.factory) {
            // 班長 can only see data for their assigned factory
            const userFactories = Array.isArray(currentUserData.factory) ? currentUserData.factory : [currentUserData.factory];
            query = { "工場": { $in: userFactories } };
        }

        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "submittedDB",
                collectionName: currentApprovalTab, // Use current tab as collection name
                query: query
            })
        });

        if (!response.ok) throw new Error('Failed to fetch data');
        
        allApprovalData = await response.json();
        
        // Load factory filter options
        loadFactoryFilterOptions();
        
        // Apply filters and render
        applyApprovalFilters();
        
    } catch (error) {
        console.error('Error loading approval data:', error);
        document.getElementById('approvalsTableContainer').innerHTML = 
            '<div class="p-8 text-center text-red-500">データの読み込みに失敗しました</div>';
    }
}

/**
 * Load factory filter options
 */
function loadFactoryFilterOptions() {
    const factoryFilter = document.getElementById('factoryFilter');
    const factories = [...new Set(allApprovalData.map(item => item.工場))].filter(Boolean);
    
    factoryFilter.innerHTML = '<option value="">All 工場</option>' + 
        factories.map(factory => `<option value="${factory}">${factory}</option>`).join('');
}

/**
 * Apply filters to approval data
 */
function applyApprovalFilters() {
    const factoryFilter = document.getElementById('factoryFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    const searchTerm = document.getElementById('approvalSearchInput').value.toLowerCase();

    filteredApprovalData = allApprovalData.filter(item => {
        const factoryMatch = !factoryFilter || item.工場 === factoryFilter;
        const statusMatch = !statusFilter || 
            (statusFilter === 'pending' && (!item.approvalStatus || item.approvalStatus === 'pending')) ||
            (statusFilter === 'approved' && item.approvalStatus === 'approved') ||
            (statusFilter === 'correction_needed' && item.approvalStatus === 'correction_needed');
        const dateMatch = !dateFilter || item.Date === dateFilter;
        const searchMatch = !searchTerm || 
            (item.品番 && item.品番.toLowerCase().includes(searchTerm)) ||
            (item.背番号 && item.背番号.toLowerCase().includes(searchTerm)) ||
            (item.Worker_Name && item.Worker_Name.toLowerCase().includes(searchTerm));

        return factoryMatch && statusMatch && dateMatch && searchMatch;
    });

    currentApprovalPage = 1;
    renderApprovalTable();
    updateStats();
}

/**
 * Update statistics cards
 */
function updateStats() {
    const pending = allApprovalData.filter(item => !item.approvalStatus || item.approvalStatus === 'pending').length;
    const approved = allApprovalData.filter(item => item.approvalStatus === 'approved').length;
    const correction = allApprovalData.filter(item => item.approvalStatus === 'correction_needed').length;
    const today = new Date().toISOString().split('T')[0];
    const todayTotal = allApprovalData.filter(item => item.Date === today).length;

    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('approvedCount').textContent = approved;
    document.getElementById('correctionCount').textContent = correction;
    document.getElementById('totalCount').textContent = todayTotal;
}

/**
 * Render the approval table
 */
function renderApprovalTable() {
    const container = document.getElementById('approvalsTableContainer');
    
    if (filteredApprovalData.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-gray-500">データがありません</div>';
        updatePagination(0);
        return;
    }

    const startIndex = (currentApprovalPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredApprovalData.slice(startIndex, endIndex);

    // Get columns based on current tab
    const columns = getTableColumns(currentApprovalTab);

    const tableHTML = `
        <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b">
                <tr>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('approvalStatus')">
                        状態 ${getSortArrow('approvalStatus')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('Date')">
                        日付・時間 ${getSortArrow('Date')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('工場')">
                        工場 ${getSortArrow('工場')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('品番')">
                        品番 ${getSortArrow('品番')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('背番号')">
                        背番号 ${getSortArrow('背番号')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('Worker_Name')">
                        作業者 ${getSortArrow('Worker_Name')}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('${getQuantityField(currentApprovalTab)}')">
                        数量 ${getSortArrow(getQuantityField(currentApprovalTab))}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('${getNGField(currentApprovalTab)}')">
                        NG ${getSortArrow(getNGField(currentApprovalTab))}
                    </th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700">不良率</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortApprovalTable('approvedBy')">
                        承認者 ${getSortArrow('approvedBy')}
                    </th>
                </tr>
            </thead>
            <tbody>
                ${pageData.map(item => {
                    const statusInfo = getStatusInfo(item);
                    const quantityField = getQuantityField(currentApprovalTab);
                    const ngField = getNGField(currentApprovalTab);
                    const quantity = item[quantityField] || 0;
                    const ngCount = item[ngField] || 0;
                    const defectRate = quantity > 0 ? ((ngCount / quantity) * 100).toFixed(2) : '0.00';
                    
                    return `
                        <tr class="border-b hover:bg-gray-50 cursor-pointer ${statusInfo.rowClass}" onclick="openApprovalDetail('${item._id}')">
                            <td class="px-4 py-3">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.badgeClass}">
                                    <i class="${statusInfo.icon} mr-1"></i>
                                    ${statusInfo.text}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <div class="text-sm font-medium">${item.Date}</div>
                                <div class="text-xs text-gray-500">${item.Time_start} - ${item.Time_end}</div>
                            </td>
                            <td class="px-4 py-3">${item.工場 || '-'}</td>
                            <td class="px-4 py-3 font-medium">${item.品番 || '-'}</td>
                            <td class="px-4 py-3">${item.背番号 || '-'}</td>
                            <td class="px-4 py-3">${item.Worker_Name || '-'}</td>
                            <td class="px-4 py-3 font-medium">${quantity.toLocaleString()}</td>
                            <td class="px-4 py-3 ${ngCount > 0 ? 'text-red-600 font-medium' : ''}">${ngCount}</td>
                            <td class="px-4 py-3 ${parseFloat(defectRate) > 0 ? 'text-red-600 font-medium' : ''}">${defectRate}%</td>
                            <td class="px-4 py-3 text-sm text-gray-600">${item.approvedBy || '-'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
    updatePagination(filteredApprovalData.length);
}

/**
 * Get table columns based on collection
 */
function getTableColumns(tabName) {
    const baseColumns = ['approvalStatus', 'Date', '工場', '品番', '背番号', 'Worker_Name'];
    
    switch (tabName) {
        case 'kensaDB':
            return [...baseColumns, 'Process_Quantity', 'Total_NG', 'approvedBy'];
        case 'pressDB':
            return [...baseColumns, 'Total', 'Total_NG', 'approvedBy'];
        case 'SRSDB':
            return [...baseColumns, 'Total', 'SRS_Total_NG', 'approvedBy'];
        case 'slitDB':
            return [...baseColumns, 'Total', 'Total_NG', 'approvedBy'];
        default:
            return [...baseColumns, 'Process_Quantity', 'Total_NG', 'approvedBy'];
    }
}

/**
 * Get quantity field based on collection
 */
function getQuantityField(tabName) {
    switch (tabName) {
        case 'kensaDB':
            return 'Process_Quantity';
        case 'pressDB':
        case 'SRSDB':
        case 'slitDB':
            return 'Total';
        default:
            return 'Process_Quantity';
    }
}

/**
 * Get NG field based on collection
 */
function getNGField(tabName) {
    switch (tabName) {
        case 'SRSDB':
            return 'SRS_Total_NG';
        default:
            return 'Total_NG';
    }
}

/**
 * Sort approval table by column
 */
window.sortApprovalTable = function(column) {
    if (approvalSortState.column === column) {
        approvalSortState.direction *= -1;
    } else {
        approvalSortState.column = column;
        approvalSortState.direction = 1;
    }

    filteredApprovalData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        if (aVal === undefined) aVal = '';
        if (bVal === undefined) bVal = '';
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return -1 * approvalSortState.direction;
        if (aVal > bVal) return 1 * approvalSortState.direction;
        return 0;
    });

    renderApprovalTable();
};

/**
 * Get sort arrow for column headers
 */
function getSortArrow(column) {
    if (approvalSortState.column !== column) return '';
    return approvalSortState.direction === 1 ? ' ↑' : ' ↓';
}

/**
 * Get status information for display
 */
function getStatusInfo(item) {
    if (!item.approvalStatus || item.approvalStatus === 'pending') {
        return { text: '保留中', icon: 'ri-time-line', badgeClass: 'bg-yellow-100 text-yellow-800', rowClass: 'bg-yellow-50' };
    } else if (item.approvalStatus === 'approved') {
        return { text: '承認済み', icon: 'ri-check-line', badgeClass: 'bg-green-100 text-green-800', rowClass: '' };
    } else if (item.approvalStatus === 'correction_needed') {
        return { text: '修正要求', icon: 'ri-error-warning-line', badgeClass: 'bg-red-100 text-red-800', rowClass: 'bg-red-50' };
    }
    return { text: '不明', icon: 'ri-question-line', badgeClass: 'bg-gray-100 text-gray-800', rowClass: '' };
}

/**
 * Update pagination controls
 */
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (totalItems === 0) {
        pageInfo.textContent = '0件中 0-0件を表示';
        pageNumbers.innerHTML = '';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    const startItem = (currentApprovalPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentApprovalPage * itemsPerPage, totalItems);
    pageInfo.textContent = `${totalItems}件中 ${startItem}-${endItem}件を表示`;

    // Generate page numbers
    pageNumbers.innerHTML = '';
    const startPage = Math.max(1, currentApprovalPage - 2);
    const endPage = Math.min(totalPages, currentApprovalPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = `px-3 py-1 border rounded ${i === currentApprovalPage ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'}`;
        pageBtn.onclick = () => goToPage(i);
        pageNumbers.appendChild(pageBtn);
    }

    prevBtn.disabled = currentApprovalPage === 1;
    nextBtn.disabled = currentApprovalPage === totalPages;
}

/**
 * Change page
 */
function changePage(direction) {
    const totalPages = Math.ceil(filteredApprovalData.length / itemsPerPage);
    const newPage = currentApprovalPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentApprovalPage = newPage;
        renderApprovalTable();
    }
}

/**
 * Go to specific page
 */
function goToPage(page) {
    currentApprovalPage = page;
    renderApprovalTable();
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

/**
 * Open approval detail modal with images
 */
window.openApprovalDetail = function(itemId) {
    const item = allApprovalData.find(d => d._id === itemId);
    if (!item) return;

    const modal = document.getElementById('approvalModal');
    const content = document.getElementById('approvalModalContent');
    
    // Calculate defect rate
    const quantityField = getQuantityField(currentApprovalTab);
    const ngField = getNGField(currentApprovalTab);
    const quantity = item[quantityField] || 0;
    const ngCount = item[ngField] || 0;
    const defectRate = quantity > 0 ? ((ngCount / quantity) * 100).toFixed(2) : '0.00';
    
    // Get counter/NG details based on tab
    const counterDetails = getCounterDetails(item, currentApprovalTab);
    
    // Get images for this process type
    const processImages = getProcessImages(item, currentApprovalTab);
    
    // Get all fields from the item, excluding system fields
    const excludeFields = ['_id', 'approvalStatus', 'approvedBy', 'approvedAt', 'approvalComment', 'correctionBy', 'correctionAt', 'correctionComment', 'approvalHistory'];
    const allFields = Object.entries(item)
        .filter(([key, value]) => !excludeFields.includes(key) && value !== null && value !== undefined && value !== '')
        .sort(([a], [b]) => a.localeCompare(b));
    
    // Separate Counters object for special handling
    const countersIndex = allFields.findIndex(([key]) => key === 'Counters');
    let countersObject = null;
    if (countersIndex !== -1) {
        countersObject = allFields[countersIndex][1];
        allFields.splice(countersIndex, 1); // Remove Counters from main fields
    }
    
    content.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Complete Information -->
            <div class="lg:col-span-2 space-y-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">基本情報</h4>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div><span class="text-gray-600">品番:</span> <span class="font-medium">${item.品番 || '-'}</span></div>
                        <div><span class="text-gray-600">背番号:</span> <span class="font-medium">${item.背番号 || '-'}</span></div>
                        <div><span class="text-gray-600">工場:</span> <span class="font-medium">${item.工場 || '-'}</span></div>
                        <div><span class="text-gray-600">設備:</span> <span class="font-medium">${item.設備 || '-'}</span></div>
                        <div><span class="text-gray-600">作業者:</span> <span class="font-medium">${item.Worker_Name || '-'}</span></div>
                        <div><span class="text-gray-600">日付:</span> <span class="font-medium">${item.Date || '-'}</span></div>
                        <div><span class="text-gray-600">開始:</span> <span class="font-medium">${item.Time_start || '-'}</span></div>
                        <div><span class="text-gray-600">終了:</span> <span class="font-medium">${item.Time_end || '-'}</span></div>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">生産実績</h4>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div><span class="text-gray-600">処理数量:</span> <span class="font-medium">${quantity.toLocaleString()}</span></div>
                        <div><span class="text-gray-600">不良数:</span> <span class="font-medium text-red-600">${ngCount}</span></div>
                        <div><span class="text-gray-600">不良率:</span> <span class="font-medium ${parseFloat(defectRate) > 0 ? 'text-red-600' : 'text-green-600'}">${defectRate}%</span></div>
                        <div><span class="text-gray-600">サイクルタイム:</span> <span class="font-medium">${item.Cycle_Time || '-'}秒</span></div>
                        ${item.製造ロット ? `<div class="col-span-2"><span class="text-gray-600">製造ロット:</span> <span class="font-medium">${item.製造ロット}</span></div>` : ''}
                        ${item.材料ロット ? `<div class="col-span-2"><span class="text-gray-600">材料ロット:</span> <span class="font-medium">${item.材料ロット}</span></div>` : ''}
                        ${item.SRSコード ? `<div class="col-span-2"><span class="text-gray-600">SRSコード:</span> <span class="font-medium">${item.SRSコード}</span></div>` : ''}
                        ${item.ショット数 ? `<div><span class="text-gray-600">ショット数:</span> <span class="font-medium">${item.ショット数}</span></div>` : ''}
                        ${item.Spare ? `<div><span class="text-gray-600">予備:</span> <span class="font-medium">${item.Spare}</span></div>` : ''}
                    </div>
                </div>
                
                ${counterDetails ? `
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">不良詳細</h4>
                    <div class="text-sm space-y-1">
                        ${counterDetails}
                    </div>
                </div>
                ` : ''}
                
                <!-- Complete MongoDB Data -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">完全データ (MongoDB) - 編集可能</h4>
                    <div class="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto p-2">
                        ${countersObject ? `
                            <div class="bg-white p-2 rounded border">
                                <label class="block text-xs font-medium text-gray-600 mb-2">Counters (個別設定)</label>
                                <div class="grid grid-cols-2 gap-2">
                                    ${Object.entries(countersObject).map(([counterKey, counterValue]) => `
                                        <div class="flex items-center space-x-2">
                                            <label class="text-xs text-gray-600 min-w-0 flex-shrink-0">${counterKey}:</label>
                                            <input type="number" 
                                                   value="${counterValue}" 
                                                   class="flex-1 p-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                   data-field="Counters.${counterKey}"
                                                   data-item-id="${item._id}"
                                                   min="0">
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${allFields.map(([key, value]) => `
                            <div class="bg-white p-2 rounded border">
                                <label class="block text-xs font-medium text-gray-600 mb-1">${key}</label>
                                <input type="text" 
                                       value="${typeof value === 'object' ? JSON.stringify(value) : value}" 
                                       class="w-full p-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                       data-field="${key}"
                                       data-item-id="${item._id}">
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${item.Comment ? `
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">コメント</h4>
                    <div class="text-sm">${item.Comment}</div>
                </div>
                ` : ''}
                
                <!-- Approval Status -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">承認状況</h4>
                    ${getApprovalStatusHTML(item)}
                </div>
            </div>
            
            <!-- Images Section -->
            <div class="space-y-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">提出画像</h4>
                    <div class="space-y-3">
                        ${processImages.submitted}
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">マスター参考画像</h4>
                    <div class="space-y-3">
                        ${processImages.master}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    
    // Add input change listeners for editable fields
    setTimeout(() => {
        addInputChangeListeners();
    }, 100);
};

/**
 * Get counter/NG details based on process type
 */
function getCounterDetails(item, tabName) {
    switch (tabName) {
        case 'kensaDB':
            if (item.Counters && typeof item.Counters === 'object') {
                const activeCounters = Object.entries(item.Counters).filter(([key, value]) => value > 0);
                if (activeCounters.length === 0) {
                    return '<div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center"><span class="text-green-700 font-medium">✅ 不良なし</span></div>';
                }
                return `
                    <div class="grid grid-cols-2 gap-3">
                        ${activeCounters.map(([key, value]) => `
                            <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                <div class="text-xs text-gray-600 font-medium">${key}</div>
                                <div class="text-lg font-bold text-red-600">${value}</div>
                                <div class="text-xs text-gray-500">件</div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            return null;
            
        case 'pressDB':
            const pressCounters = [
                ['疵引不良', item.疵引不良 || 0],
                ['加工不良', item.加工不良 || 0],
                ['その他', item.その他 || 0]
            ];
            const activePressCounters = pressCounters.filter(([key, value]) => value > 0);
            if (activePressCounters.length === 0) {
                return '<div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center"><span class="text-green-700 font-medium">✅ 不良なし</span></div>';
            }
            return `
                <div class="grid grid-cols-2 gap-3">
                    ${activePressCounters.map(([key, value]) => `
                        <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                            <div class="text-xs text-gray-600 font-medium">${key}</div>
                            <div class="text-lg font-bold text-red-600">${value}</div>
                            <div class="text-xs text-gray-500">件</div>
                        </div>
                    `).join('')}
                </div>
            `;
            
        case 'SRSDB':
            const srsCounters = [
                ['くっつき・めくれ', item['くっつき・めくれ'] || 0],
                ['シワ', item.シワ || 0],
                ['転写位置ズレ', item.転写位置ズレ || 0],
                ['転写不良', item.転写不良 || 0],
                ['文字欠け', item.文字欠け || 0],
                ['その他', item.その他 || 0]
            ];
            const activeSrsCounters = srsCounters.filter(([key, value]) => value > 0);
            if (activeSrsCounters.length === 0) {
                return '<div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center"><span class="text-green-700 font-medium">✅ 不良なし</span></div>';
            }
            return `
                <div class="grid grid-cols-2 gap-3">
                    ${activeSrsCounters.map(([key, value]) => `
                        <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                            <div class="text-xs text-gray-600 font-medium">${key}</div>
                            <div class="text-lg font-bold text-red-600">${value}</div>
                            <div class="text-xs text-gray-500">件</div>
                        </div>
                    `).join('')}
                </div>
            `;
            
        case 'slitDB':
            const slitCounters = [
                ['疵引不良', item.疵引不良 || 0],
                ['加工不良', item.加工不良 || 0],
                ['その他', item.その他 || 0]
            ];
            const activeSlitCounters = slitCounters.filter(([key, value]) => value > 0);
            if (activeSlitCounters.length === 0) {
                return '<div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center"><span class="text-green-700 font-medium">✅ 不良なし</span></div>';
            }
            return `
                <div class="grid grid-cols-2 gap-3">
                    ${activeSlitCounters.map(([key, value]) => `
                        <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                            <div class="text-xs text-gray-600 font-medium">${key}</div>
                            <div class="text-lg font-bold text-red-600">${value}</div>
                            <div class="text-xs text-gray-500">件</div>
                        </div>
                    `).join('')}
                </div>
            `;
            
        default:
            return null;
    }
}

/**
 * Get process images based on tab
 */
function getProcessImages(item, tabName) {
    const submittedImages = [];
    
    // Common images for all processes
    if (item['初物チェック画像']) {
        submittedImages.push(`
            <div>
                <label class="text-sm font-medium text-gray-700 mb-1 block">初物チェック</label>
                <img src="${item['初物チェック画像']}" alt="初物チェック" class="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-75 transition-opacity" onclick="window.open('${item['初物チェック画像']}', '_blank')" title="クリックで拡大表示">
            </div>
        `);
    }
    
    // Process-specific images
    if (tabName === 'pressDB') {
        if (item['終物チェック画像']) {
            submittedImages.push(`
                <div>
                    <label class="text-sm font-medium text-gray-700 mb-1 block">終物チェック</label>
                    <img src="${item['終物チェック画像']}" alt="終物チェック" class="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-75 transition-opacity" onclick="window.open('${item['終物チェック画像']}', '_blank')" title="クリックで拡大表示">
                </div>
            `);
        }
        if (item['材料ラベル画像']) {
            submittedImages.push(`
                <div>
                    <label class="text-sm font-medium text-gray-700 mb-1 block">材料ラベル</label>
                    <img src="${item['材料ラベル画像']}" alt="材料ラベル" class="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-75 transition-opacity" onclick="window.open('${item['材料ラベル画像']}', '_blank')" title="クリックで拡大表示">
                </div>
            `);
        }
    }
    
    // Master reference image using picLINK function
    let masterImageHTML = `
        <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">マスター画像 (${item.背番号})</label>
            <div id="masterImageContainer-${item._id}" class="w-full h-32 bg-gray-100 rounded border flex items-center justify-center cursor-pointer hover:opacity-75 transition-opacity">
                <span class="text-gray-500 text-sm">画像を読み込み中...</span>
            </div>
        </div>
    `;
    
    // Try to load master image
    setTimeout(() => {
        loadMasterImage(item.品番, item.背番号, `masterImageContainer-${item._id}`);
    }, 100);
    
    return {
        submitted: submittedImages.length > 0 ? submittedImages.join('') : '<div class="text-gray-500">提出画像なし</div>',
        master: masterImageHTML
    };
}

/**
 * Load master image using database query like in factories.js
 */
async function loadMasterImage(品番, 背番号, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Show loading state
    container.innerHTML = '<div class="text-gray-500 text-center text-sm flex items-center justify-center h-full"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>読み込み中...</div>';
    
    try {
        // First try to find by 品番
        let query = { 品番: 品番 };
        if (!品番 && 背番号) {
            // If no 品番, try with 背番号
            query = { 背番号: 背番号 };
        }

        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "Sasaki_Coating_MasterDB",
                collectionName: "masterDB",
                query: query,
                projection: { imageURL: 1, 品番: 1, 背番号: 1, 品名: 1 }
            })
        });

        const results = await response.json();

        if (results && results.length > 0 && results[0].imageURL) {
            const masterData = results[0];
            container.innerHTML = `<img src="${masterData.imageURL}" alt="マスター画像" class="w-full h-full object-cover rounded cursor-pointer hover:opacity-75 transition-opacity" onclick="window.open('${masterData.imageURL}', '_blank')" title="クリックで拡大表示">`;
            container.onclick = () => window.open(masterData.imageURL, '_blank');
        } else {
            // Try alternative search if first attempt failed
            if (品番 && 背番号) {
                // If we searched by 品番 first, try 背番号
                const altResponse = await fetch(BASE_URL + "queries", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        dbName: "Sasaki_Coating_MasterDB",
                        collectionName: "masterDB",
                        query: { 背番号: 背番号 },
                        projection: { imageURL: 1, 品番: 1, 背番号: 1, 品名: 1 }
                    })
                });

                const altResults = await altResponse.json();
                
                if (altResults && altResults.length > 0 && altResults[0].imageURL) {
                    const masterData = altResults[0];
                    container.innerHTML = `<img src="${masterData.imageURL}" alt="マスター画像" class="w-full h-full object-cover rounded cursor-pointer hover:opacity-75 transition-opacity" onclick="window.open('${masterData.imageURL}', '_blank')" title="クリックで拡大表示">`;
                    container.onclick = () => window.open(masterData.imageURL, '_blank');
                } else {
                    // No image found
                    container.innerHTML = '<div class="text-gray-500 text-center text-sm">マスター画像なし</div>';
                }
            } else {
                // No image found
                container.innerHTML = '<div class="text-gray-500 text-center text-sm">マスター画像なし</div>';
            }
        }
    } catch (error) {
        console.error("Master image load error:", error);
        container.innerHTML = '<div class="text-gray-500 text-center text-sm">画像読み込みエラー</div>';
    }
}

/**
 * Get approval status HTML
 */
function getApprovalStatusHTML(item) {
    const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const canApprove = ['admin', '班長', '係長', '課長'].includes(currentUser.role);
    
    let statusHTML = `<div class="flex items-center space-x-2 mb-3">`;
    
    if (!item.approvalStatus || item.approvalStatus === 'pending') {
        statusHTML += `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <i class="ri-time-line mr-1"></i>承認待ち
            </span>
        `;
        
        if (canApprove) {
            statusHTML += `
                <button onclick="approveItem('${item._id}')" class="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                    承認
                </button>
                <button onclick="requestCorrection('${item._id}')" class="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">
                    修正要求
                </button>
            `;
        }
    } else if (item.approvalStatus === 'approved') {
        statusHTML += `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <i class="ri-check-line mr-1"></i>承認済み
            </span>
        `;
        if (item.approvedBy) {
            statusHTML += `<span class="text-xs text-gray-600">承認者: ${item.approvedBy}</span>`;
        }
        if (item.approvedAt) {
            statusHTML += `<span class="text-xs text-gray-600">${new Date(item.approvedAt).toLocaleString('ja-JP')}</span>`;
        }
    } else if (item.approvalStatus === 'correction_needed') {
        statusHTML += `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <i class="ri-error-warning-line mr-1"></i>修正要求
            </span>
        `;
        if (item.correctionComment) {
            statusHTML += `<div class="mt-2 text-xs text-gray-600 bg-red-50 p-2 rounded">${item.correctionComment}</div>`;
        }
    }
    
    statusHTML += `</div>`;
    
    // Version history
    if (item.approvalHistory && item.approvalHistory.length > 0) {
        statusHTML += `
            <div class="mt-3">
                <h5 class="text-sm font-medium text-gray-900 mb-2">承認履歴</h5>
                <div class="space-y-1 max-h-32 overflow-y-auto">
                    ${item.approvalHistory.map(history => `
                        <div class="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <div class="flex justify-between">
                                <span>${history.action} - ${history.user}</span>
                                <span>${new Date(history.timestamp).toLocaleString('ja-JP')}</span>
                            </div>
                            ${history.comment ? `<div class="mt-1">${history.comment}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    return statusHTML;
}

/**
 * Close approval modal
 */
window.closeApprovalModal = function() {
    document.getElementById('approvalModal').classList.add('hidden');
};

/**
 * Approve an item
 */
window.approveItem = async function(itemId) {
    const comment = prompt("承認コメント (任意):");
    if (comment === null) return; // User cancelled
    
    try {
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        
        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "submittedDB",
                collectionName: currentApprovalTab,
                query: { _id: itemId },
                update: {
                    $set: {
                        approvalStatus: 'approved',
                        approvedBy: currentUser.username,
                        approvedAt: new Date(),
                        approvalComment: comment
                    },
                    $push: {
                        approvalHistory: {
                            action: '承認',
                            user: currentUser.username,
                            timestamp: new Date(),
                            comment: comment
                        }
                    }
                }
            })
        });
        
        if (!response.ok) throw new Error('Failed to approve item');
        
        alert("承認しました");
        closeApprovalModal();
        loadApprovalData();
        
    } catch (error) {
        console.error('Error approving item:', error);
        alert("承認に失敗しました");
    }
};

/**
 * Request correction for an item
 */
window.requestCorrection = async function(itemId) {
    const comment = prompt("修正要求の理由を入力してください:");
    if (!comment || comment.trim() === "") {
        alert("修正要求の理由を入力してください");
        return;
    }
    
    try {
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        
        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "submittedDB",
                collectionName: currentApprovalTab,
                query: { _id: itemId },
                update: {
                    $set: {
                        approvalStatus: 'correction_needed',
                        correctionBy: currentUser.username,
                        correctionAt: new Date(),
                        correctionComment: comment
                    },
                    $push: {
                        approvalHistory: {
                            action: '修正要求',
                            user: currentUser.username,
                            timestamp: new Date(),
                            comment: comment
                        }
                    }
                }
            })
        });
        
        if (!response.ok) throw new Error('Failed to request correction');
        
        alert("修正要求を送信しました");
        closeApprovalModal();
        loadApprovalData();
        
    } catch (error) {
        console.error('Error requesting correction:', error);
        alert("修正要求の送信に失敗しました");
    }
};

/**
 * Save edited field value to database
 */
window.saveFieldValue = function(fieldName, newValue, itemId) {
    // Add save functionality - can be implemented when backend is ready
    console.log('Field updated:', { fieldName, newValue, itemId });
    // This would make an API call to update the specific field
    // For now, we'll just log it
};

// Add event listeners for input changes after modal is created
function addInputChangeListeners() {
    const inputs = document.querySelectorAll('input[data-field]');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            const fieldName = this.dataset.field;
            const newValue = this.value;
            const itemId = this.dataset.itemId;
            
            // Visual feedback for unsaved changes
            this.style.backgroundColor = '#fef3c7'; // yellow background
            this.title = '変更が保存待ちです';
            
            // You can implement auto-save or add a save button
            // saveFieldValue(fieldName, newValue, itemId);
        });
        
        input.addEventListener('focus', function() {
            this.style.backgroundColor = '#ffffff';
            this.title = '';
        });
    });
}

// Call this function after the modal is opened
// addInputChangeListeners();


