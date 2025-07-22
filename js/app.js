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
  admin: ["dashboard", "factories", "processes", "notifications", "analytics", "userManagement", "approvals", "masterDB", "customerManagement", "equipment"],
  部長: ["dashboard", "factories", "processes", "notifications", "analytics", "userManagement", "approvals", "masterDB", "equipment", "customerManagement"], // Same as admin but no customerManagement
  課長: ["dashboard", "factories", "processes", "notifications", "analytics", "userManagement", "approvals", "masterDB", "equipment"], // Same as 部長
  係長: ["dashboard", "factories", "approvals", "masterDB", "equipment"], // Same as 班長 but factory-limited
  班長: ["dashboard", "factories", "approvals", "masterDB", "equipment"],
  member: ["dashboard"]
};

const navItemsConfig = {
  dashboard: { icon: "ri-dashboard-line", label: "dashboard" },
  factories: { icon: "ri-building-line", label: "factories" },
  masterDB: { icon: "ri-settings-line", label: "masterDB" },
  processes: { icon: "ri-settings-line", label: "processes" },
  notifications: { icon: "ri-notification-line", label: "notifications" },
  analytics: { icon: "ri-line-chart-line", label: "analytics" },
  userManagement: { icon: "ri-user-settings-line", label: "userManagement" },
  approvals: { icon: "ri-checkbox-line", label: "approvals", badge: "12" },
  customerManagement: { icon: "ri-user-3-line", label: "customerManagement" },
  equipment: { icon: "ri-tools-line", label: "equipment" },
};

// Navigation functions are now handled in navbar.js to avoid duplicates

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

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (sidebar && overlay) {
    sidebar.classList.toggle("-translate-x-full");
    overlay.classList.toggle("hidden");
  }
}

// Make toggleSidebar globally available
window.toggleSidebar = toggleSidebar;


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
                <h2 class="text-2xl font-semibold mb-4" data-i18n="factoryOverview">Factory Overview</h2>
                <div id="factoryCards" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            </div>
        `;
        renderFactoryCards();
        if (typeof applyLanguageEnhanced === 'function') {
          applyLanguageEnhanced();
        } else if (typeof applyLanguage === 'function') {
          applyLanguage();
        }
        break;

        case "analytics":
            mainContent.innerHTML = `
                <h2 class="text-2xl font-semibold" data-i18n="defectRateAnalytics">Defect Rate Analytics</h2>
                <div id="analyticsChart" class="h-80"></div>
                <div id="analyticsChart1" style="width: 100%; height: 400px;"></div>
                <div id="analyticsChart2" style="width: 100%; height: 400px;"></div>
            `;
            fetchFactoryDefects();
            if (typeof applyLanguageEnhanced === 'function') {
              applyLanguageEnhanced();
            } else if (typeof applyLanguage === 'function') {
              applyLanguage();
            }
            break;        case "approvals":
            mainContent.innerHTML = `
                <h2 class="text-2xl font-semibold mb-6" data-i18n="approvalsTitle">Data Approval System</h2>
                
                <!-- View Options Dropdown -->
                <div class="mb-6 flex justify-between items-center">
                    <div class="flex items-center space-x-4">
                        <label for="viewModeSelect" class="text-sm font-medium text-gray-700" data-i18n="viewMode">View Mode:</label>
                        <select id="viewModeSelect" class="p-2 border rounded bg-white">
                            <option value="table" data-i18n="tableView">Table View (Individual Approval)</option>
                            <option value="list" data-i18n="listView">List View (Batch Approval)</option>
                        </select>
                    </div>
                </div>
                
                <!-- Process Tabs -->
                <div class="border-b border-gray-200 mb-6">
                    <nav class="-mb-px flex space-x-8">
                        <button class="approval-tab-btn py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap active" 
                                data-tab="kensaDB" onclick="switchApprovalTab('kensaDB')" data-i18n="kensa">
                            Inspection (Kensa)
                        </button>
                        <button class="approval-tab-btn py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap" 
                                data-tab="pressDB" onclick="switchApprovalTab('pressDB')" data-i18n="press">
                            Press
                        </button>
                        <button class="approval-tab-btn py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap" 
                                data-tab="SRSDB" onclick="switchApprovalTab('SRSDB')">
                            SRS
                        </button>
                        <button class="approval-tab-btn py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap" 
                                data-tab="slitDB" onclick="switchApprovalTab('slitDB')" data-i18n="slit">
                            Slit
                        </button>
                    </nav>
                </div>

                <!-- Tab Content Container -->
                <div id="approvalTabContent">
                    <!-- Stats Cards -->
                    <div class="grid grid-cols-${role === '班長' ? '6' : '5'} gap-4 mb-6">
                        <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors" onclick="filterByStatus('pending')">
                            <h3 class="text-sm font-medium text-yellow-800" data-i18n="pending">Pending</h3>
                            <p class="text-2xl font-bold text-yellow-900" id="pendingCount">0</p>
                            <p class="text-xs text-yellow-600" data-i18n="pendingApproval">Pending Hancho Approval</p>
                        </div>
                        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors" onclick="filterByStatus('hancho_approved')">
                            <h3 class="text-sm font-medium text-blue-800" data-i18n="hanchoApproved">Hancho Approved</h3>
                            <p class="text-2xl font-bold text-blue-900" id="hanchoApprovedCount">0</p>
                            <p class="text-xs text-blue-600" data-i18n="waitingKacho">Waiting for Kacho Approval</p>
                        </div>
                        <div class="bg-green-50 p-4 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors" onclick="filterByStatus('fully_approved')">
                            <h3 class="text-sm font-medium text-green-800" data-i18n="fullyApproved">Fully Approved</h3>
                            <p class="text-2xl font-bold text-green-900" id="fullyApprovedCount">0</p>
                            <p class="text-xs text-green-600" data-i18n="kachoApprovalComplete">Kacho Approval Complete</p>
                        </div>
                        <div class="bg-red-50 p-4 rounded-lg border border-red-200 cursor-pointer hover:bg-red-100 transition-colors" onclick="filterByStatus('correction_needed')">
                            <h3 class="text-sm font-medium text-red-800" data-i18n="correctionNeeded">Correction Needed</h3>
                            <p class="text-2xl font-bold text-red-900" id="correctionCount">0</p>
                            <p class="text-xs text-red-600" data-i18n="needsCorrection">Needs Correction & Resubmission</p>
                        </div>
                        ${role === '班長' ? `
                        <div class="bg-orange-50 p-4 rounded-lg border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors" onclick="filterByStatus('correction_needed_from_kacho')">
                            <h3 class="text-sm font-medium text-orange-800" data-i18n="kachoRequest">Kacho Correction Request</h3>
                            <p class="text-2xl font-bold text-orange-900" id="kachoRequestCount">0</p>
                            <p class="text-xs text-orange-600" data-i18n="hanchoAction">Hancho Action Required</p>
                        </div>
                        ` : ''}
                        <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors" onclick="filterByStatus('today')">
                            <h3 class="text-sm font-medium text-gray-800" data-i18n="todayTotal">Today's Total</h3>
                            <p class="text-2xl font-bold text-gray-900" id="totalCount">0</p>
                            <p class="text-xs text-gray-600" data-i18n="submittedToday">Submitted Today</p>
                        </div>
                    </div>

                    <!-- Controls -->
                    <div class="flex flex-wrap gap-4 mb-6">
                        <button id="refreshBtn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" data-i18n="dataUpdate">
                            🔄 データ更新
                        </button>
                        <select id="factoryFilter" class="p-2 border rounded">
                            <option value="" data-i18n="allFactories">All 工場</option>
                        </select>
                        <select id="statusFilter" class="p-2 border rounded">
                            <option value="" data-i18n="allStatus">All Status</option>
                            <option value="pending">保留中 (班長承認待ち)</option>
                            <option value="hancho_approved">班長承認済み (課長承認待ち)</option>
                            <option value="fully_approved">完全承認済み</option>
                            <option value="correction_needed">修正要求</option>
                            <option value="correction_needed_from_kacho">課長修正要求（班長対応）</option>
                        </select>
                        <input type="date" id="dateFilter" class="p-2 border rounded">
                        <input type="text" id="approvalSearchInput" placeholder="品番、背番号、作業者で検索..." class="p-2 border rounded flex-1 min-w-64">
                        <select id="itemsPerPageSelect" class="p-2 border rounded">
                            <option value="10">10件表示</option>
                            <option value="50">50件表示</option>
                            <option value="100">100件表示</option>
                        </select>
                    </div>

                    <!-- List View Controls (hidden by default) -->
                    <div id="listViewControls" class="hidden mb-6">
                        <div class="flex flex-wrap gap-4 items-center">
                            <button id="batchApproveBtn" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled data-i18n="batchApproveSelected">
                                Batch Approve Selected
                            </button>
                            <button id="batchRejectBtn" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled data-i18n="batchRejectSelected">
                                Batch Reject Selected
                            </button>
                            <div class="ml-auto">
                                <span id="selectedCount" class="text-sm text-gray-600">0 <span data-i18n="selected">selected</span></span>
                            </div>
                        </div>
                    </div>

                    <!-- Table Container (default view) -->
                    <div class="bg-white rounded-lg shadow border" id="approvalsTableContainer">
                        <div class="p-8 text-center text-gray-500">データを読み込み中...</div>
                    </div>

                    <!-- List Container (hidden by default) -->
                    <div id="approvalsListContainer" class="hidden">
                        <div class="p-8 text-center text-gray-500">データを読み込み中...</div>
                    </div>

                    <!-- Summary Report (for card view) -->
                    <div id="summaryReport" class="hidden mt-6 bg-gray-50 p-6 rounded-lg border">
                        <h3 class="text-lg font-semibold mb-4">Summary Report</h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="summaryStats">
                            <!-- Will be populated dynamically -->
                        </div>
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
            // Initialize view mode listener with persistence
            const savedViewMode = localStorage.getItem('approvalViewMode') || 'table';
            document.getElementById('viewModeSelect').value = savedViewMode;
            toggleViewMode(savedViewMode);
            
            document.getElementById('viewModeSelect').addEventListener('change', function() {
                const viewMode = this.value;
                localStorage.setItem('approvalViewMode', viewMode);
                toggleViewMode(viewMode);
            });
            if (typeof applyLanguageEnhanced === 'function') {
              applyLanguageEnhanced();
            } else if (typeof applyLanguage === 'function') {
              applyLanguage();
            }
            break;

          case "userManagement":
              if (!["admin", "部長", "課長"].includes(role)) {
                  mainContent.innerHTML = `<p class="text-red-600 font-semibold" data-i18n="accessDenied">Access Denied</p>`;
                  return;
              }
          
              mainContent.innerHTML = `
             <div class="max-w-6xl mx-auto bg-white p-6 rounded shadow space-y-6">
              <!-- Search and Button -->
              <div class="flex justify-between items-center">
                <input type="text" id="userSearchInput" data-i18n-placeholder="searchUsers" placeholder="Search users..." class="w-1/2 p-2 border rounded" />
                <button id="toggleCreateUserForm" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" data-i18n="createNewUser">Create New User</button>
              </div>

              <!-- Create User Form in Separate Card -->
              <div id="createUserFormWrapper" class="hidden">
                <div class="bg-gray-50 border border-gray-200 p-6 rounded shadow">
                  <form id="createUserForm" class="grid grid-cols-2 gap-4">
                    <input required data-i18n-placeholder="firstName" placeholder="First Name" id="firstName" class="border p-2 rounded" />
                    <input required data-i18n-placeholder="lastName" placeholder="Last Name" id="lastName" class="border p-2 rounded" />
                    <input required type="email" data-i18n-placeholder="email" placeholder="Email" id="email" class="border p-2 rounded" />
                    <input required data-i18n-placeholder="username" placeholder="Username" id="username" class="border p-2 rounded" />
                    <input required type="password" data-i18n-placeholder="password" placeholder="Password" id="password" class="border p-2 rounded" />
                    <select id="role" class="border p-2 rounded" required onchange="toggleFactorySelection()">
                      <option value="" data-i18n="selectRole">Select Role</option>
                      <option value="admin">admin</option>
                      <option value="部長">部長</option>
                      <option value="課長">課長</option>
                      <option value="係長">係長</option>
                      <option value="班長">班長</option>
                      <option value="member">member</option>
                    </select>
                    
                    <!-- Factory Selection (shown only for 班長 and 係長) -->
                    <div id="factorySelectionContainer" class="col-span-2 hidden">
                      <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="factorySelection">Factory Selection</label>
                      <div class="grid grid-cols-3 gap-2" id="factoryCheckboxes">
                        <!-- Will be populated with factory options -->
                      </div>
                      <input type="hidden" id="selectedFactories" name="factories" />
                    </div>
                    
                    <button type="submit" class="col-span-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" data-i18n="submit">
                      Submit
                    </button>
                  </form>
                </div>
              </div>

              <!-- User Table -->
              <div id="userTableContainer" data-i18n="loadingUsers">Loading users...</div>
            </div>
            `;
          
            document.getElementById("toggleCreateUserForm").onclick = () => {
              document.getElementById("createUserFormWrapper").classList.toggle("hidden");
              // Load factory options when form is opened
              if (!document.getElementById("createUserFormWrapper").classList.contains("hidden")) {
                loadFactoryOptions();
              }
            };
            
            // Function to toggle factory selection based on role
            window.toggleFactorySelection = function() {
              const role = document.getElementById("role").value;
              const factoryContainer = document.getElementById("factorySelectionContainer");
              
              if (role === "班長" || role === "係長") {
                factoryContainer.classList.remove("hidden");
              } else {
                factoryContainer.classList.add("hidden");
                // Clear selected factories for non-factory roles
                document.getElementById("selectedFactories").value = "";
                updateFactoryDisplay();
              }
            };
            
            // Function to load factory options from masterDB
            async function loadFactoryOptions() {
              try {
                const response = await fetch(BASE_URL + "queries", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    dbName: "Sasaki_Coating_MasterDB",
                    collectionName: "masterDB",
                    query: {},
                    projection: { "工場": 1 }
                  })
                });
                
                if (response.ok) {
                  const data = await response.json();
                  const factories = [...new Set(data.map(item => item.工場).filter(Boolean))].sort();
                  renderFactoryCheckboxes(factories);
                }
              } catch (error) {
                console.error("Failed to load factory options:", error);
                // Fallback to default factories
                const defaultFactories = ["第一工場", "第二工場", "肥田瀬", "天徳", "倉知", "小瀬", "SCNA", "NFH"];
                renderFactoryCheckboxes(defaultFactories);
              }
            }
            
            // Function to render factory checkboxes
            function renderFactoryCheckboxes(factories) {
              const container = document.getElementById("factoryCheckboxes");
              container.innerHTML = factories.map(factory => `
                <label class="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                  <input type="checkbox" value="${factory}" onchange="updateSelectedFactories()" class="factory-checkbox">
                  <span class="text-sm">${factory}</span>
                </label>
              `).join('');
            }
            
            // Function to update selected factories
            window.updateSelectedFactories = function() {
              const checkboxes = document.querySelectorAll('.factory-checkbox:checked');
              const selectedFactories = Array.from(checkboxes).map(cb => cb.value);
              document.getElementById("selectedFactories").value = JSON.stringify(selectedFactories);
              updateFactoryDisplay();
            };
            
            // Function to update factory display
            function updateFactoryDisplay() {
              // This can be expanded to show selected factories if needed
            }
            
            document.getElementById("createUserForm").addEventListener("submit", async (e) => {
              e.preventDefault();
              const role = document.getElementById("role").value;
              const selectedFactoriesValue = document.getElementById("selectedFactories").value;
              
              // Validate factory selection for roles that require it
              if ((role === "班長" || role === "係長") && (!selectedFactoriesValue || selectedFactoriesValue === "[]")) {
                alert(`${role} role requires at least one factory assignment.`);
                return;
              }
              
              const body = {
                firstName: document.getElementById("firstName").value.trim(),
                lastName: document.getElementById("lastName").value.trim(),
                email: document.getElementById("email").value.trim(),
                username: document.getElementById("username").value.trim(),
                password: document.getElementById("password").value.trim(),
                role: role
              };
              
              // Add factory data for roles that need it
              if ((role === "班長" || role === "係長") && selectedFactoriesValue) {
                try {
                  body.factory = JSON.parse(selectedFactoriesValue);
                } catch (e) {
                  body.factory = [];
                }
              }
            
              try {
                const res = await fetch(BASE_URL + "createUser", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body)
                });
            
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Failed to create user");
                alert("User created successfully");
                e.target.reset();
                document.getElementById("createUserFormWrapper").classList.add("hidden");
                document.getElementById("factorySelectionContainer").classList.add("hidden");
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
              // Enable all input fields
              document.querySelectorAll(`[user-id="${userId}"]`).forEach(el => el.disabled = false);
              
              // Get user role
              const roleSelect = document.querySelector(`select[user-id="${userId}"][data-role]`);
              const userRole = roleSelect ? roleSelect.value : null;
              
              // Handle factory editing interface
              const factoryDisplay = document.getElementById(`factoryDisplay-${userId}`);
              const factoryEdit = document.getElementById(`factoryEdit-${userId}`);
              
              if (userRole === "班長" || userRole === "係長") {
                // For 班長 and 係長: Hide display mode, show edit mode
                if (factoryDisplay) factoryDisplay.style.display = "none";
                if (factoryEdit) factoryEdit.classList.remove('hidden');
                
                // Ensure factory edit interface is properly populated
                refreshFactoryEditInterface(userId);
              } else {
                // For other roles: Keep display mode hidden, edit mode hidden
                if (factoryDisplay) factoryDisplay.style.display = "none";
                if (factoryEdit) factoryEdit.classList.add('hidden');
              }
            
              const actionsCell = document.getElementById(`actions-${userId}`);
              actionsCell.innerHTML = `
                <button class="text-green-600 hover:underline" onclick="saveUser('${userId}')">OK</button>
                <button class="ml-2 text-gray-600 hover:underline" onclick="cancelEdit('${userId}')">Cancel</button>
              `;
            };
            
            // Function to refresh the factory edit interface with current data
            function refreshFactoryEditInterface(userId) {
              const hiddenInput = document.querySelector(`input.factory-data[user-id="${userId}"]`);
              const selectedContainer = document.getElementById(`selectedFactories-${userId}`);
              
              if (!hiddenInput || !selectedContainer) return;
              
              let currentFactories = [];
              try {
                currentFactories = JSON.parse(hiddenInput.value || '[]');
              } catch (e) {
                currentFactories = [];
              }
              
              // Clear and repopulate the selected factories container
              selectedContainer.innerHTML = '';
              currentFactories.forEach(factory => {
                const tagHTML = `
                  <span class="factory-tag bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                    ${factory}
                    <button type="button" class="ml-1 text-blue-600 hover:text-blue-800" onclick="removeFactoryTag('${userId}', '${factory}')">×</button>
                  </span>
                `;
                selectedContainer.insertAdjacentHTML('beforeend', tagHTML);
              });
            }
            
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
                  if (field === 'factory') {
                    // Handle factory data from hidden input - map 工場 to factory for backend
                    try {
                      updated['factory'] = JSON.parse(el.value || '[]');
                    } catch (e) {
                      updated['factory'] = [];
                    }
                  } else {
                    updated[field] = el.value;
                  }
                }
              });

              console.log('Sending user update:', { userId, ...updated }); // Debug log
            
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
                console.error('Update error:', err);
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
            
            // User table management functions with factory support
            async function loadUserTable() {
              try {
                const res = await fetch(BASE_URL + "queries", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    dbName: "Sasaki_Coating_MasterDB",
                    collectionName: "users",
                    query: {},
                    projection: { password: 0 }
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
              if (!["admin", "部長", "課長"].includes(currentUser.role)) {
                document.getElementById("userTableContainer").innerHTML = "";
                return;
              }

              const headers = ["firstName", "lastName", "email", "username", "role", "factory"];
              const tableHTML = `
                <table class="w-full text-sm border">
                  <thead class="bg-gray-100">
                    <tr>
                      ${headers.map(h => `<th class="px-4 py-2">${h.charAt(0).toUpperCase() + h.slice(1)}</th>`).join("")}
                      <th class='px-4 py-2'>Actions</th>
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
                                    ${["admin", "部長", "課長", "係長", "班長", "member"].map(r => `
                                      <option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>
                                    `).join("")}
                                  </select>`
                                : h === "factory"
                                ? `<div class="factory-container" user-id="${u._id}">
                                    <div class="factory-tags-display" id="factoryDisplay-${u._id}" ${u.role !== "班長" && u.role !== "係長" ? "style='display:none'" : ""}>
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
                                          <option value="">工場を追加</option>
                                          ${["第一工場", "第二工場", "肥田瀬", "天徳", "倉知", "小瀬", "SCNA", "NFH"].map(f => 
                                            `<option value="${f}">${f}</option>`
                                          ).join("")}
                                        </select>
                                      </div>
                                    </div>
                                    <input type="hidden" class="factory-data" data-field="factory" user-id="${u._id}" value='${JSON.stringify(factoryArray)}' />
                                    ${u.role !== "班長" && u.role !== "係長" ? `<span class="text-gray-500 factory-readonly">${factoryDisplayText}</span>` : ""}
                                  </div>`
                                : `<input class="border p-1 rounded w-full" value="${u[h] || ""}" disabled data-field="${h}" user-id="${u._id}" />`}
                            </td>
                          `).join("")}
                          <td class="px-4 py-2" id="actions-${u._id}">
                            <button class="text-blue-600 hover:underline" onclick="startEditingUser('${u._id}')" data-i18n="edit">Edit</button>
                            <button class="ml-2 text-yellow-600 hover:underline" onclick="resetPassword('${u._id}')" data-i18n="resetPassword">Reset Password</button>
                            <button class="ml-2 text-red-600 hover:underline" onclick="deleteUser('${u._id}')" data-i18n="delete">Delete</button>
                          </td>
                        </tr>`;
                    }).join("")}
                  </tbody>
                </table>
              `;

              document.getElementById("userTableContainer").innerHTML = tableHTML;
              
              // Apply translations to the newly rendered table
              if (typeof translateDynamicContent === 'function') {
                translateDynamicContent(document.getElementById("userTableContainer"));
              }
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
              
              // Check if we're in edit mode
              const actionsCell = document.getElementById(`actions-${userId}`);
              const isInEditMode = actionsCell && actionsCell.innerHTML.includes('OK');
              
              if (role === "班長" || role === "係長") {
                if (isInEditMode) {
                  // In edit mode: hide display, show edit interface
                  if (factoryDisplay) factoryDisplay.style.display = "none";
                  if (factoryEdit) factoryEdit.classList.remove('hidden');
                } else {
                  // In view mode: show display, hide edit interface
                  if (factoryDisplay) factoryDisplay.style.display = "block";
                  if (factoryEdit) factoryEdit.classList.add('hidden');
                }
                if (factoryReadonly) factoryReadonly.style.display = "none";
              } else {
                // For roles without factory access: always hide factory interfaces, show readonly text
                if (factoryDisplay) factoryDisplay.style.display = "none";
                if (factoryEdit) factoryEdit.classList.add('hidden');
                if (factoryReadonly) factoryReadonly.style.display = "inline";
              }
            };
            
            loadUserTable();
          
          if (typeof applyLanguageEnhanced === 'function') {
            applyLanguageEnhanced();
          } else if (typeof applyLanguage === 'function') {
            applyLanguage();
          }
              break;

        case "customerManagement":
          if (role !== "admin") {
            mainContent.innerHTML = `<p class="text-red-600 font-semibold" data-i18n="accessDenied">Access Denied</p>`;
            return;
          }

          mainContent.innerHTML = `
            <div class="max-w-6xl mx-auto bg-white p-6 rounded shadow">
              <h1 class="text-2xl font-semibold mb-6" data-i18n="masterUserAdminPanel">Master User Admin Panel</h1>
              <input type="text" id="customerSearchInput" data-i18n-placeholder="searchByUsernameCompanyEmail" placeholder="Search by username, company, or email..." class="w-full p-2 border mb-4 rounded" />

              <form id="createMasterUserForm" class="bg-white p-6 rounded shadow-md mb-6">
                <h2 class="text-xl font-semibold mb-4" data-i18n="createMasterUser">Create Master User</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input id="masterUsername" data-i18n-placeholder="username" placeholder="Username" class="p-2 border rounded" />
                  <input type="password" id="masterPassword" data-i18n-placeholder="password" placeholder="Password" class="p-2 border rounded" />
                  <input id="masterCompany" data-i18n-placeholder="companyName" placeholder="Company Name" class="p-2 border rounded" />
                  <input type="email" id="masterEmail" data-i18n-placeholder="email" placeholder="Email" class="p-2 border rounded" />
                  <input type="date" id="masterValidUntil" class="p-2 border rounded" />
                  <input id="masterDbName" data-i18n-placeholder="databaseName" placeholder="Database Name" class="p-2 border rounded" />
                </div>
                <h3 class="text-md font-semibold mt-4 mb-2" data-i18n="devicesOptional">Devices (optional)</h3>
                <div id="deviceListCreate" class="mb-4"></div>
                <button type="button" onclick="addDeviceRow(document.getElementById('deviceListCreate'))" class="text-blue-600 text-sm mb-4" data-i18n="addDevice">+ Add Device</button>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded w-full" data-i18n="createMasterUser">Create Master User</button>
              </form>

              <table class="w-full text-sm border">
                <thead class="bg-gray-200">
                  <tr>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('username')" data-i18n="username">Username</th>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('company')" data-i18n="companyName">Company</th>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('email')" data-i18n="email">Email</th>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('validUntil')" data-i18n="validUntil">Valid Until</th>
                    <th class="px-3 py-2 cursor-pointer" onclick="sortMasterUserTable('dbName')" data-i18n="database">Database</th>
                    <th class="px-3 py-2" data-i18n="devices">Devices</th>
                    <th class="px-3 py-2" data-i18n="actions">Actions</th>
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
            const search = document.getElementById("customerSearchInput").value.toLowerCase();
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
                    <button class="text-blue-600 mr-2" onclick='openEditModal(${JSON.stringify(u)})' data-i18n="edit">Edit</button>
                    <button class="text-red-600" onclick='deleteMasterUser("${u._id}")' data-i18n="delete">Delete</button>
                  </td>
                </tr>
              `;
            }).join("");
            
            // Apply translations to the newly rendered table
            if (typeof translateDynamicContent === 'function') {
              translateDynamicContent(tbody);
            }
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

          document.getElementById("customerSearchInput").addEventListener("input", renderMasterUserTable);
          fetchMasterUsers();
          if (typeof applyLanguageEnhanced === 'function') {
            applyLanguageEnhanced();
          } else if (typeof applyLanguage === 'function') {
            applyLanguage();
          }
          break;

        case "factories":
          mainContent.innerHTML = `
              <div class="bg-white p-6 rounded-xl shadow mb-6">
                  <h2 class="text-2xl font-semibold mb-4" data-i18n="factoryListTitle">Factory List</h2>
                  <div id="factoryList" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
              </div>
          `;
          renderFactoryList();
          if (typeof applyLanguageEnhanced === 'function') {
            applyLanguageEnhanced();
          } else if (typeof applyLanguage === 'function') {
            applyLanguage();
          }
          break;

        case "masterDB":
          mainContent.innerHTML = `
            <!-- Header Section -->
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-semibold text-gray-800" data-i18n="masterProductManagement">Master Product Management</h2>
              <div class="flex items-center space-x-3">
                <button id="addNewRecordBtn" class="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm">
                  <i class="ri-add-line mr-1"></i><span data-i18n="addNewRecord">Add New Record</span>
                </button>
                <button id="refreshMasterBtn" class="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                  <i class="ri-refresh-line mr-1"></i><span data-i18n="refresh">Refresh</span>
                </button>
              </div>
            </div>

            <!-- Tab Navigation -->
            <div class="bg-white rounded-lg shadow-sm border mb-6">
              <div class="border-b border-gray-200">
                <nav class="flex space-x-8 px-6" aria-label="Tabs">
                  <button id="masterDBTab" class="master-tab-btn py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm whitespace-nowrap" onclick="switchMasterTab('masterDB')">
                    内装品 DB
                  </button>
                  <button id="materialDBTab" class="master-tab-btn py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap" onclick="switchMasterTab('materialDB')">
                    材料 DB
                  </button>
                </nav>
              </div>
            </div>

            <!-- CSV Upload Section -->
            <div class="bg-white p-6 rounded-lg shadow-sm mb-6 border">
              <div class="flex items-center space-x-4">
                <div>
                  <label class="block text-base font-medium text-gray-700 mb-3" data-i18n="csvFile">CSV File</label>
                  <input type="file" id="csvUploadInput" accept=".csv" class="text-base file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:font-medium" />
                </div>
                <button class="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-base font-medium" onclick="handleMasterCSVUpload()">
                  <i class="ri-upload-line mr-2"></i><span data-i18n="uploadPreview">Upload & Preview</span>
                </button>
              </div>
              <div id="csvPreviewContainer" class="mt-6"></div>
            </div>

            <!-- Filters Section -->
            <div class="bg-white p-6 rounded-lg shadow-sm mb-6 border">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Factory / 工程</label>
                  <select id="filterFactory" class="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="" data-i18n="all">All</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="rl">R/L</label>
                  <select id="filterRL" class="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="" data-i18n="all">All</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="color">Color</label>
                  <select id="filterColor" class="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="" data-i18n="all">All</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Equipment / 材料</label>
                  <select id="filterProcess" class="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="" data-i18n="all">All</option>
                  </select>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="search">Search</label>
                  <input type="text" id="masterSearchInput" class="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500" data-i18n-placeholder="searchPlaceholderMaster" placeholder="Search by part number, model, serial number, product name..." />
                </div>
              </div>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div class="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div class="flex items-center">
                  <div class="p-3 bg-blue-100 rounded-lg">
                    <i class="ri-database-line text-blue-600 text-xl"></i>
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">総件数</p>
                    <p class="text-3xl font-bold text-gray-900" id="totalMasterCount">0</p>
                  </div>
                </div>
              </div>
              <div class="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div class="flex items-center">
                  <div class="p-3 bg-green-100 rounded-lg">
                    <i class="ri-image-line text-green-600 text-xl"></i>
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">画像あり</p>
                    <p class="text-3xl font-bold text-gray-900" id="withImageCount">0</p>
                  </div>
                </div>
              </div>
              <div class="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div class="flex items-center">
                  <div class="p-3 bg-yellow-100 rounded-lg">
                    <i class="ri-image-off-line text-yellow-600 text-xl"></i>
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">画像なし</p>
                    <p class="text-3xl font-bold text-gray-900" id="withoutImageCount">0</p>
                  </div>
                </div>
              </div>
              <div class="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div class="flex items-center">
                  <div class="p-3 bg-purple-100 rounded-lg">
                    <i class="ri-filter-line text-purple-600 text-xl"></i>
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">表示中</p>
                    <p class="text-3xl font-bold text-gray-900" id="filteredCount">0</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Table Controls -->
            <div class="bg-white p-4 rounded-lg shadow-sm border mb-4">
              <div class="flex justify-between items-center">
                <div class="flex items-center space-x-2">
                  <label class="text-sm text-gray-600">表示件数:</label>
                  <select id="masterItemsPerPageSelect" class="p-1 border rounded text-sm">
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
            <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div id="masterTableContainer" class="min-h-[600px]">
                <div class="flex items-center justify-center h-96">
                  <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p class="text-gray-500 text-lg">データを読み込み中...</p>
                  </div>
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
                  <button id="masterPrevPageBtn" class="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm" disabled>
                    <i class="ri-arrow-left-line mr-1"></i> 前へ
                  </button>
                  <div id="masterPageNumbers" class="flex space-x-2">
                    <!-- Page numbers will be inserted here -->
                  </div>
                  <button id="masterNextPageBtn" class="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm" disabled>
                    次へ <i class="ri-arrow-right-line ml-1"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Add New Record Modal -->
            <div id="addRecordModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
              <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="text-lg font-semibold text-gray-900" id="modalTitle" data-i18n="addNewRecordModal">Add New Record</h3>
                      <button onclick="closeAddRecordModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="ri-close-line text-xl"></i>
                      </button>
                    </div>
                    
                    <form id="addRecordForm">
                      <!-- Image Upload Section -->
                      <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="productImage">製品画像</label>
                        <div id="newRecordImagePreview" class="mb-3">
                          <div class="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                            <div class="text-center">
                              <i class="ri-image-line text-gray-400 text-2xl mb-2"></i>
                              <p class="text-gray-500 text-sm" data-i18n="noImageAvailable">画像がありません</p>
                            </div>
                          </div>
                        </div>
                        <button type="button" onclick="document.getElementById('newRecordImageInput').click()" class="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                          <i class="ri-upload-line mr-1"></i><span data-i18n="uploadImage">画像をアップロード</span>
                        </button>
                        <input type="file" id="newRecordImageInput" accept="image/*" class="hidden" />
                      </div>

                      <!-- Dynamic Fields Container -->
                      <div id="dynamicFieldsContainer" class="space-y-4 mb-6">
                        <!-- Dynamic input fields will be generated here -->
                      </div>

                      <!-- Action Buttons -->
                      <div class="flex justify-end space-x-3">
                        <button type="button" onclick="closeAddRecordModal()" class="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50" data-i18n="cancel">
                          キャンセル
                        </button>
                        <button type="submit" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                          <i class="ri-save-line mr-1"></i><span data-i18n="save">保存</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          `;

          let masterData = [];
          let filteredMasterData = [];
          let masterSortState = { column: null, direction: 1 };
          let currentMasterPage = 1;
          let masterItemsPerPage = 25;
          let currentMasterTab = 'masterDB'; // Track current tab

          async function loadMasterDB() {
            try {
              const collectionName = currentMasterTab; // Use current tab as collection name
              const res = await fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  dbName: "Sasaki_Coating_MasterDB",
                  collectionName: collectionName,
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

          // Tab switching function
          window.switchMasterTab = function(tabName) {
            currentMasterTab = tabName;
            window.currentMasterTab = currentMasterTab; // Update global variable
            updateMasterTabStyles();
            currentMasterPage = 1; // Reset to first page
            loadMasterDB();
            loadMasterFilters();
          };

          // Update tab button styles
          function updateMasterTabStyles() {
            document.querySelectorAll('.master-tab-btn').forEach(btn => {
              if (btn.id === currentMasterTab + 'Tab') {
                btn.className = 'master-tab-btn py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm whitespace-nowrap';
              } else {
                btn.className = 'master-tab-btn py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm whitespace-nowrap';
              }
            });
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
                <div class="flex items-center justify-center h-96">
                  <div class="text-center">
                    <i class="ri-database-line text-6xl text-gray-400 mb-4"></i>
                    <p class="text-gray-500 text-xl font-medium">データが見つかりません</p>
                    <p class="text-gray-400 mt-2">フィルターを調整するか、新しいデータを追加してください</p>
                  </div>
                </div>
              `;
              updateMasterPagination(0);
              return;
            }

            const startIndex = (currentMasterPage - 1) * masterItemsPerPage;
            const endIndex = startIndex + masterItemsPerPage;
            const pageData = filteredMasterData.slice(startIndex, endIndex);

            // Dynamically determine headers from the first data item
            const firstItem = pageData[0] || filteredMasterData[0];
            if (!firstItem) return;

            // Get all fields except _id and imageURL, then add imageURL at the end
            const dataFields = Object.keys(firstItem).filter(k => k !== "_id" && k !== "imageURL");
            const headers = [
              ...dataFields.map(field => ({ key: field, label: field })),
              { key: "imageURL", label: "画像" }
            ];

            const getSortArrow = (col) => {
              if (masterSortState.column !== col) return '';
              return masterSortState.direction === 1 ? ' ↑' : ' ↓';
            };

            const tableHTML = `
              <div class="overflow-x-auto">
                <table class="w-full text-sm min-w-full">
                  <thead class="bg-gray-50 border-b">
                    <tr>
                      ${headers.map(h => `
                        <th class="px-3 py-2 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors ${h.key === 'imageURL' ? 'w-20' : 'min-w-[100px]'}" onclick="handleMasterSort('${h.key}')">
                          <div class="flex items-center space-x-1">
                            <span>${h.label}</span>
                            <span class="text-xs">${getSortArrow(h.key)}</span>
                          </div>
                        </th>
                      `).join('')}
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    ${pageData.map((row, index) => `
                      <tr class="hover:bg-gray-50 cursor-pointer transition-colors" onclick='showMasterSidebarFromRow(this)' data-row='${encodeURIComponent(JSON.stringify(row))}'>
                        ${dataFields.map(field => {
                          const value = row[field] || "-";
                          const isMainField = field === "品番" || field === "品名" || field === "材料品番" || field === "材料";
                          return `<td class="px-3 py-2 text-sm ${isMainField ? 'font-medium text-blue-600 hover:text-blue-800' : 'text-gray-900'}">${value}</td>`;
                        }).join('')}
                        <td class="px-3 py-2 text-sm">
                          ${row.imageURL 
                            ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><i class="ri-image-line mr-1"></i>あり</span>'
                            : '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"><i class="ri-image-off-line mr-1"></i>なし</span>'
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
              pageBtn.className = `px-3 py-1 text-sm rounded transition-colors ${i === currentMasterPage ? 'bg-blue-600 text-white' : 'border hover:bg-gray-100'}`;
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

          // Add New Record Modal Functions
          let newRecordImageFile = null;

          window.openAddRecordModal = function() {
            const modal = document.getElementById('addRecordModal');
            const modalTitle = document.getElementById('modalTitle');
            
            // Get current language from localStorage or use fallback
            const currentLang = localStorage.getItem("lang") || "en";
            
            // Update modal title based on current tab
            const baseTitle = translations[currentLang]?.addNewRecordModal || "新規レコード追加";
            const tabSuffix = currentMasterTab === 'masterDB' ? ' - 内装品 DB' : ' - 材料 DB';
            modalTitle.textContent = baseTitle + tabSuffix;
            
            // Generate dynamic fields based on current data structure
            generateDynamicFields();
            
            // Reset form
            document.getElementById('addRecordForm').reset();
            resetImagePreview();
            newRecordImageFile = null;
            
            modal.classList.remove('hidden');
            
            // Apply language translations to the modal
            if (typeof applyLanguageEnhanced === 'function') {
              applyLanguageEnhanced();
            } else if (typeof applyLanguage === 'function') {
              applyLanguage();
            }
          };

          window.closeAddRecordModal = function() {
            const modal = document.getElementById('addRecordModal');
            modal.classList.add('hidden');
            newRecordImageFile = null;
          };

          function generateDynamicFields() {
            const container = document.getElementById('dynamicFieldsContainer');
            container.innerHTML = '';

            // Get field structure from existing data or create basic structure
            let fieldsToShow = [];
            
            if (masterData.length > 0) {
              // Use existing data structure but ensure boardData is always included for masterDB only
              const sampleRecord = masterData[0];
              const existingFields = Object.keys(sampleRecord).filter(key => key !== '_id' && key !== 'imageURL');
              
              // Always include boardData if it's not already in the existing fields, but only for masterDB
              if (currentMasterTab === 'masterDB' && !existingFields.includes('boardData')) {
                existingFields.push('boardData');
              }
              
              fieldsToShow = existingFields;
            } else {
              // Default fields based on tab
              if (currentMasterTab === 'masterDB') {
                fieldsToShow = ['品番', 'モデル', '背番号', '品名', '形状', 'R/L', '色', '顧客/納入先', '備考', '加工設備', 'QR CODE', '型番', '材料品番', '材料', 'boardData'];
              } else {
                fieldsToShow = ['品番', 'モデル', '背番号', '品名', '形状', 'R/L', '色', '顧客/納入先', '備考', '次工程', 'QR CODE', '型番', '材料品番', '材料'];
              }
            }

            fieldsToShow.forEach(field => {
              const fieldDiv = document.createElement('div');
              
              // Special handling for boardData field (string input)
              if (field === 'boardData') {
                fieldDiv.innerHTML = `
                  <label class="block text-sm font-medium text-gray-700 mb-1">${field}</label>
                  <input type="text" 
                         name="${field}" 
                         class="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                         placeholder="カンマ区切りで入力してください（例：950A,Cピラー(ア),RH）" />
                  <p class="text-xs text-gray-500 mt-1">カンマ区切りの文字列として保存されます。</p>
                `;
              } else {
                fieldDiv.innerHTML = `
                  <label class="block text-sm font-medium text-gray-700 mb-1">${field}</label>
                  <input type="text" 
                         name="${field}" 
                         class="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                         placeholder="${field}を入力..." />
                `;
              }
              container.appendChild(fieldDiv);
            });
          }

          function resetImagePreview() {
            const preview = document.getElementById('newRecordImagePreview');
            const currentLang = localStorage.getItem("lang") || "en";
            const noImageText = translations[currentLang]?.noImageAvailable || "画像がありません";
            preview.innerHTML = `
              <div class="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                <div class="text-center">
                  <i class="ri-image-line text-gray-400 text-2xl mb-2"></i>
                  <p class="text-gray-500 text-sm">${noImageText}</p>
                </div>
              </div>
            `;
          }

          async function submitNewRecord(formData) {
            try {
              // Prepare record data with ALL fields from the current data structure
              const recordData = {};
              
              // Get all possible fields from existing data structure
              let allFields = [];
              if (masterData.length > 0) {
                // Use existing data structure but ensure boardData is always included for masterDB only
                const sampleRecord = masterData[0];
                const existingFields = Object.keys(sampleRecord).filter(key => key !== '_id' && key !== 'imageURL');
                
                // Always include boardData if it's not already in the existing fields, but only for masterDB
                if (currentMasterTab === 'masterDB' && !existingFields.includes('boardData')) {
                  existingFields.push('boardData');
                }
                
                allFields = existingFields;
              } else {
                // Default fields based on tab if no existing data
                if (currentMasterTab === 'masterDB') {
                  allFields = ['品番', 'モデル', '背番号', '品名', '形状', 'R/L', '色', '顧客/納入先', '備考', '加工設備', 'QR CODE', '型番', '材料品番', '材料', 'boardData'];
                } else {
                  allFields = ['品番', 'モデル', '背番号', '品名', '形状', 'R/L', '色', '顧客/納入先', '備考', '次工程', 'QR CODE', '型番', '材料品番', '材料'];
                }
              }

              // Initialize all fields with empty strings
              allFields.forEach(field => {
                recordData[field] = "";
              });

              // Fill in the data from form elements (overwrite empty strings with actual values)
              const formElements = document.getElementById('addRecordForm').elements;
              for (let element of formElements) {
                if (element.name && allFields.includes(element.name)) {
                  recordData[element.name] = element.value.trim();
                }
              }

              console.log("Record data being inserted:", recordData);

              // Insert record to database using the existing queries endpoint
              const insertRes = await fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  dbName: "Sasaki_Coating_MasterDB",
                  collectionName: currentMasterTab,
                  insertData: recordData
                })
              });

              const insertResult = await insertRes.json();
              
              if (!insertRes.ok || !insertResult.insertedId) {
                throw new Error(insertResult.error || "Failed to insert record");
              }

              // Get the inserted record ID
              const recordId = insertResult.insertedId;

              // Upload image if exists and update the record
              if (newRecordImageFile && recordId) {
                const reader = new FileReader();
                const base64Promise = new Promise((resolve) => {
                  reader.onloadend = () => resolve(reader.result.split(",")[1]);
                  reader.readAsDataURL(newRecordImageFile);
                });
                
                const base64 = await base64Promise;
                const username = currentUser?.username || "unknown";
                
                const imageRes = await fetch(BASE_URL + "uploadMasterImage", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    base64,
                    label: "main",
                    recordId: recordId,
                    username,
                    collectionName: currentMasterTab
                  })
                });
                
                const imageResult = await imageRes.json();
                if (!imageRes.ok) {
                  console.warn("Image upload failed:", imageResult.error);
                  // Don't fail the entire operation if image upload fails
                }
              }

              const currentLang = localStorage.getItem("lang") || "en";
              const successMessage = translations[currentLang]?.recordAddedSuccessfully || "新規レコードが正常に追加されました！";
              alert(successMessage);
              closeAddRecordModal();
              loadMasterDB(); // Refresh data
              
            } catch (error) {
              console.error("Error adding new record:", error);
              const currentLang = localStorage.getItem("lang") || "en";
              const errorMessage = translations[currentLang]?.failedToAddRecord || "レコードの追加に失敗しました: ";
              alert(errorMessage + error.message);
            }
          }

          // Event listeners
          document.getElementById('refreshMasterBtn').addEventListener('click', () => {
            loadMasterDB();
            loadMasterFilters();
          });
          document.getElementById('addNewRecordBtn').addEventListener('click', openAddRecordModal);
          document.getElementById('masterItemsPerPageSelect').addEventListener('change', function() {
            masterItemsPerPage = parseInt(this.value);
            currentMasterPage = 1;
            renderMasterTable();
          });
          document.getElementById('masterPrevPageBtn').addEventListener('click', () => changeMasterPage(-1));
          document.getElementById('masterNextPageBtn').addEventListener('click', () => changeMasterPage(1));

          // Add Record Modal Event Listeners
          document.getElementById('newRecordImageInput').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
              newRecordImageFile = file;
              const reader = new FileReader();
              reader.onload = function(e) {
                const preview = document.getElementById('newRecordImagePreview');
                preview.innerHTML = `
                  <img src="${e.target.result}" alt="Preview" class="w-full h-32 object-contain rounded border bg-gray-50" />
                `;
              };
              reader.readAsDataURL(file);
            }
          });

          document.getElementById('addRecordForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic validation - check if at least one field is filled
            const formElements = document.getElementById('addRecordForm').elements;
            let hasData = false;
            
            for (let element of formElements) {
              if (element.name && element.value.trim()) {
                hasData = true;
                break;
              }
            }
            
            if (!hasData) {
              const currentLang = localStorage.getItem("lang") || "en";
              const alertMessage = translations[currentLang]?.pleaseEnterAtLeastOneField || "少なくとも1つのフィールドに入力してください。";
              alert(alertMessage);
              return;
            }
            
            submitNewRecord();
          });

          // Close modal on background click
          document.getElementById('addRecordModal').addEventListener('click', function(e) {
            if (e.target === this) {
              closeAddRecordModal();
            }
          });

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
              // Dynamic keyword search - search through all text fields
              const searchableFields = Object.keys(item).filter(k => 
                k !== "_id" && k !== "imageURL" && typeof item[k] === 'string'
              );
              const keywordMatch = !keyword || searchableFields.some(key => 
                (item[key] || "").toLowerCase().includes(keyword)
              );

              // Dynamic filtering based on available fields
              let factoryMatch = true;
              let rlMatch = true;
              let colorMatch = true;
              let processMatch = true;

              if (factory) {
                factoryMatch = item["工場"] === factory || item["次工程"] === factory;
              }
              
              if (rl) {
                rlMatch = item["R/L"] === rl;
              }
              
              if (color) {
                colorMatch = item["色"] === color;
              }
              
              if (process) {
                processMatch = item["加工設備"] === process || item["材料"] === process;
              }

              return keywordMatch && factoryMatch && rlMatch && colorMatch && processMatch;
            });

            currentMasterPage = 1;
            updateMasterStats();
            renderMasterTable();
          }

          async function loadMasterFilters() {
            // Clear existing options (except "All")
            ["filterFactory", "filterRL", "filterColor", "filterProcess"].forEach(id => {
              const select = document.getElementById(id);
              if (select) {
                select.innerHTML = '<option value="" data-i18n="all">All</option>';
              }
            });

            if (!masterData.length) return;

            // Dynamically determine which fields to use for filters based on the data structure
            const firstItem = masterData[0];
            const availableFields = Object.keys(firstItem).filter(k => k !== "_id" && k !== "imageURL");
            
            // Define field mapping for common filter categories
            const filterMapping = {
              "工場": "filterFactory",
              "R/L": "filterRL", 
              "色": "filterColor",
              "加工設備": "filterProcess",
              "次工程": "filterFactory", // For materialDB, map 次工程 to factory filter
              "材料": "filterProcess"    // For materialDB, map 材料 to process filter
            };

            // Find fields that match our filter categories
            const fieldsToFilter = availableFields.filter(field => filterMapping[field]);

            for (const field of fieldsToFilter) {
              try {
                const collectionName = currentMasterTab;
                const res = await fetch(BASE_URL + "queries", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    dbName: "Sasaki_Coating_MasterDB",
                    collectionName: collectionName,
                    aggregation: [
                      { $group: { _id: `$${field}` } },
                      { $sort: { _id: 1 } }
                    ]
                  })
                });

                const values = await res.json();
                const selectId = filterMapping[field];
                const select = document.getElementById(selectId);

                if (select && values.length) {
                  values.forEach(v => {
                    if (v._id && v._id.trim()) {
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
          
          // Make currentMasterTab globally accessible
          window.currentMasterTab = currentMasterTab;
          
          if (typeof applyLanguageEnhanced === 'function') {
            applyLanguageEnhanced();
          } else if (typeof applyLanguage === 'function') {
            applyLanguage();
          }
          break;

        case "equipment":
          mainContent.innerHTML = `
            <div class="bg-white p-6 rounded-xl shadow mb-6">
              <h2 class="text-2xl font-semibold mb-4" data-i18n="equipmentTitle">Equipment Management</h2>
              <div id="equipmentFilters" class="mb-6">
                <div class="flex flex-wrap gap-4 mb-4">
                  <div class="flex-1 min-w-48">
                    <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="dateRange">Date Range</label>
                    <div class="flex gap-2">
                      <input type="date" id="equipmentStartDate" class="p-2 border rounded-md">
                      <input type="date" id="equipmentEndDate" class="p-2 border rounded-md">
                    </div>
                  </div>
                  <div class="flex-1 min-w-48">
                    <label class="block text-sm font-medium text-gray-700 mb-2" data-i18n="equipmentFilter">Equipment Filter (by Factory)</label>
                    <div class="mb-2">
                      <button onclick="toggleAllEquipment(true)" class="text-xs text-blue-600 hover:text-blue-800 mr-2" data-i18n="selectAll">Select All</button>
                      <button onclick="toggleAllEquipment(false)" class="text-xs text-blue-600 hover:text-blue-800" data-i18n="deselectAll">Deselect All</button>
                    </div>
                    <div id="equipmentCheckboxes" class="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md bg-gray-50"></div>
                  </div>
                  <div class="flex flex-col justify-end">
                    <button onclick="applyEquipmentFilters()" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700" data-i18n="applyFilters">Apply Filters</button>
                    <button onclick="exportEquipmentPDF()" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 mt-2" data-i18n="exportPDF">Export PDF</button>
                  </div>
                </div>
              </div>
              <div id="equipmentContent" class="space-y-8"></div>
            </div>
          `;
          // Initialize equipment page
          if (typeof window.loadEquipmentData === 'function') {
            window.loadEquipmentData();
          } else {
            console.error('loadEquipmentData function not available');
            // Retry after a short delay to ensure equipment.js is fully loaded
            setTimeout(() => {
              if (typeof window.loadEquipmentData === 'function') {
                window.loadEquipmentData();
              } else {
                console.error('loadEquipmentData still not available after retry');
                document.getElementById('equipmentContent').innerHTML = '<div class="text-center text-gray-500 py-8">Equipment functionality is loading... Please refresh the page if this persists.</div>';
              }
            }, 200);
          }
          if (typeof applyLanguageEnhanced === 'function') {
            applyLanguageEnhanced();
          } else if (typeof applyLanguage === 'function') {
            applyLanguage();
          }
          break;

        default:
            mainContent.innerHTML = `<h2 class="text-xl font-semibold">Page Not Found</h2>`;
            if (typeof applyLanguageEnhanced === 'function') {
              applyLanguageEnhanced();
            } else if (typeof applyLanguage === 'function') {
              applyLanguage();
            }
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
        let currentUserData = JSON.parse(localStorage.getItem("authUser") || "{}");
        
        // Debug log to check user data structure
        console.log('Initial user data from localStorage:', currentUserData);
        
        // If user data is missing factory information, fetch it from database
        if ((currentUserData.role === '班長' || currentUserData.role === '係長') && (!currentUserData.工場 && !currentUserData.factory)) {
            console.log('Factory info missing, fetching from database...');
            currentUserData = await fetchCompleteUserData(currentUserData.username);
        }
        
        // Determine query based on user role and current tab
        let query = {};
        
        // Role-based visibility for 2-step approval system
        if (currentUserData.role === '班長') {
            // 班長 can only see data for their assigned factories (first approval level)
            const userFactories = currentUserData.工場 || currentUserData.factory;
            console.log('班長 factories found:', userFactories);
            
            if (userFactories && userFactories.length > 0) {
                const factoryArray = Array.isArray(userFactories) ? userFactories : [userFactories];
                query = { "工場": { $in: factoryArray } };
                console.log('Applying 班長 factory filter:', query);
            } else {
                console.warn('班長 user has no assigned factories, showing no data');
                query = { "工場": { $in: [] } };
            }
        } else if (currentUserData.role === '係長') {
            // 係長 can only see data for their assigned factories (similar to 班長 but limited access)
            const userFactories = currentUserData.工場 || currentUserData.factory;
            console.log('係長 factories found:', userFactories);
            
            if (userFactories && userFactories.length > 0) {
                const factoryArray = Array.isArray(userFactories) ? userFactories : [userFactories];
                query = { "工場": { $in: factoryArray } };
                console.log('Applying 係長 factory filter:', query);
            } else {
                console.warn('係長 user has no assigned factories, showing no data');
                query = { "工場": { $in: [] } };
            }
        } else if (currentUserData.role === '課長') {
            // 課長 can see all data (to monitor 班長 approvals and do second approval)
            query = {}; // No filter - see everything
            console.log('課長 can see all data');
        } else if (['admin', '部長'].includes(currentUserData.role)) {
            // Admin/部長 can see everything including history
            query = {}; // No filter - see everything
            console.log('Admin/部長 can see all data including history');
        } else {
            // Other roles have no access
            query = { "_id": { $exists: false } }; // Show nothing
            console.log('Role has no approval access');
        }

        console.log('Final query for', currentApprovalTab, ':', query);

        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "submittedDB",
                collectionName: currentApprovalTab,
                query: query
            })
        });

        if (!response.ok) throw new Error('Failed to fetch data');
        
        allApprovalData = await response.json();
        
        console.log('Loaded approval data:', allApprovalData.length, 'items');
        
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
 * Fetch complete user data including factory assignments
 */
async function fetchCompleteUserData(username) {
    try {
        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "Sasaki_Coating_MasterDB",
                collectionName: "users",
                query: { username: username },
                projection: { password: 0 }
            })
        });

        if (!response.ok) throw new Error('Failed to fetch user data');
        
        const users = await response.json();
        if (users.length > 0) {
            const completeUserData = users[0];
            console.log('Fetched complete user data:', completeUserData);
            
            // Update localStorage with complete user data
            localStorage.setItem("authUser", JSON.stringify(completeUserData));
            
            return completeUserData;
        } else {
            console.error('User not found in database');
            return JSON.parse(localStorage.getItem("authUser") || "{}");
        }
    } catch (error) {
        console.error('Error fetching complete user data:', error);
        return JSON.parse(localStorage.getItem("authUser") || "{}");
    }
}

/**
 * Load factory filter options
 */
function loadFactoryFilterOptions() {
    const factoryFilter = document.getElementById('factoryFilter');
    const factories = [...new Set(allApprovalData.map(item => item.工場))].filter(Boolean);
    
    factoryFilter.innerHTML = '<option value="" data-i18n="allFactories">All Factories</option>' + 
        factories.map(factory => `<option value="${factory}">${factory}</option>`).join('');
}

/**
 * Filter by status when clicking on stat cards
 */
window.filterByStatus = function(status) {
    const statusFilter = document.getElementById('statusFilter');
    
    if (status === 'today') {
        // Filter by today's date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dateFilter').value = today;
        statusFilter.value = '';
    } else {
        // Clear date filter and set status filter
        document.getElementById('dateFilter').value = '';
        statusFilter.value = status;
    }
    
    // Apply filters
    applyApprovalFilters();
};

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
        
        // Updated status matching for 2-step approval
        const statusMatch = !statusFilter || 
            (statusFilter === 'pending' && (!item.approvalStatus || item.approvalStatus === 'pending')) ||
            (statusFilter === 'hancho_approved' && item.approvalStatus === 'hancho_approved') ||
            (statusFilter === 'fully_approved' && item.approvalStatus === 'fully_approved') ||
            (statusFilter === 'correction_needed' && item.approvalStatus === 'correction_needed') ||
            (statusFilter === 'correction_needed_from_kacho' && item.approvalStatus === 'correction_needed_from_kacho');
            
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
 * Update statistics cards with clickable functionality
 */
function updateStats() {
    const pending = allApprovalData.filter(item => !item.approvalStatus || item.approvalStatus === 'pending').length;
    const hanchoApproved = allApprovalData.filter(item => item.approvalStatus === 'hancho_approved').length;
    const fullyApproved = allApprovalData.filter(item => item.approvalStatus === 'fully_approved').length;
    const correction = allApprovalData.filter(item => 
        item.approvalStatus === 'correction_needed' || item.approvalStatus === 'correction_needed_from_kacho'
    ).length;
    const kachoRequest = allApprovalData.filter(item => item.approvalStatus === 'correction_needed_from_kacho').length;
    const today = new Date().toISOString().split('T')[0];
    const todayTotal = allApprovalData.filter(item => item.Date === today).length;

    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('hanchoApprovedCount').textContent = hanchoApproved;
    document.getElementById('fullyApprovedCount').textContent = fullyApproved;
    document.getElementById('correctionCount').textContent = correction;
    if (role === '班長') {
        const kachoRequestElement = document.getElementById('kachoRequestCount');
        if (kachoRequestElement) {
            kachoRequestElement.textContent = kachoRequest;
        }
    }
    document.getElementById('totalCount').textContent = todayTotal;
}

/**
 * Render the approval table
 */
function renderApprovalTable() {
    const container = document.getElementById('approvalsTableContainer');
    
    // Check if we're in list view mode
    const viewMode = document.getElementById('viewModeSelect').value;
    if (viewMode === 'list') {
        renderApprovalList();
        generateSummaryReport();
        return;
    }
    
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

    // Render appropriate view based on current mode
    const viewMode = document.getElementById('viewModeSelect').value;
    if (viewMode === 'list') {
        renderApprovalList();
        generateSummaryReport();
    } else {
        renderApprovalTable();
    }
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
    } else if (item.approvalStatus === 'hancho_approved') {
        return { text: '班長承認済み', icon: 'ri-user-check-line', badgeClass: 'bg-blue-100 text-blue-800', rowClass: 'bg-blue-50' };
    } else if (item.approvalStatus === 'fully_approved') {
        return { text: '完全承認済み', icon: 'ri-check-double-line', badgeClass: 'bg-green-100 text-green-800', rowClass: '' };
    } else if (item.approvalStatus === 'correction_needed') {
        return { text: '修正要求', icon: 'ri-error-warning-line', badgeClass: 'bg-red-100 text-red-800', rowClass: 'bg-red-50' };
    } else if (item.approvalStatus === 'correction_needed_from_kacho') {
        return { text: '課長修正要求（班長対応）', icon: 'ri-error-warning-line', badgeClass: 'bg-orange-100 text-orange-800', rowClass: 'bg-orange-50' };
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
    
    let statusHTML = `<div class="space-y-3">`;
    
    // Current status display
    statusHTML += `<div class="flex items-center space-x-2">`;
    
    if (!item.approvalStatus || item.approvalStatus === 'pending') {
        statusHTML += `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <i class="ri-time-line mr-1"></i>保留中（班長承認待ち）
            </span>
        `;
        
        // 班長 can approve in first step
        if (currentUser.role === '班長') {
            statusHTML += `
                <button onclick="approveItem('${item._id}')" class="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                    班長承認
                </button>
                <button onclick="requestCorrection('${item._id}')" class="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">
                    修正要求
                </button>
            `;
        }
    } else if (item.approvalStatus === 'hancho_approved') {
        statusHTML += `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <i class="ri-user-check-line mr-1"></i>班長承認済み（課長承認待ち）
            </span>
        `;
        
        // 課長, admin, 部長 can approve in second step
        if (['課長', 'admin', '部長'].includes(currentUser.role)) {
            statusHTML += `
                <button onclick="approveItem('${item._id}')" class="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                    課長承認
                </button>
                <button onclick="requestCorrection('${item._id}')" class="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">
                    修正要求
                </button>
            `;
        }
        
        if (item.hanchoApprovedBy) {
            statusHTML += `<div class="text-xs text-gray-600">班長承認: ${item.hanchoApprovedBy}</div>`;
        }
        if (item.hanchoApprovedAt) {
            statusHTML += `<div class="text-xs text-gray-600">${new Date(item.hanchoApprovedAt).toLocaleString('ja-JP')}</div>`;
        }
    } else if (item.approvalStatus === 'fully_approved') {
        statusHTML += `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <i class="ri-check-double-line mr-1"></i>完全承認済み
            </span>
        `;
        
        if (item.hanchoApprovedBy && item.kachoApprovedBy) {
            statusHTML += `
                <div class="text-xs text-gray-600 space-y-1">
                    <div>班長承認: ${item.hanchoApprovedBy} (${new Date(item.hanchoApprovedAt).toLocaleString('ja-JP')})</div>
                    <div>課長承認: ${item.kachoApprovedBy} (${new Date(item.kachoApprovedAt).toLocaleString('ja-JP')})</div>
                </div>
            `;
        }
    } else if (item.approvalStatus === 'correction_needed') {
        statusHTML += `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <i class="ri-error-warning-line mr-1"></i>修正要求
            </span>
        `;
        if (item.correctionBy) {
            statusHTML += `<div class="text-xs text-gray-600">要求者: ${item.correctionBy}</div>`;
        }
        if (item.correctionComment) {
            statusHTML += `<div class="mt-2 text-xs text-gray-600 bg-red-50 p-2 rounded">${item.correctionComment}</div>`;
        }
    } else if (item.approvalStatus === 'correction_needed_from_kacho') {
        statusHTML += `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                <i class="ri-error-warning-line mr-1"></i>課長修正要求（班長対応）
            </span>
        `;
        
        // 班長 can edit data and re-approve
        if (currentUser.role === '班長') {
            statusHTML += `
                <button onclick="approveItem('${item._id}')" class="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                    修正完了・再承認
                </button>
            `;
        }
        
        if (item.correctionBy) {
            statusHTML += `<div class="text-xs text-gray-600">修正要求者: ${item.correctionBy}</div>`;
        }
        if (item.correctionComment) {
            statusHTML += `<div class="mt-2 text-xs text-gray-600 bg-orange-50 p-2 rounded">${item.correctionComment}</div>`;
        }
    }
    
    statusHTML += `</div>`;
    
    // Version history
    if (item.approvalHistory && item.approvalHistory.length > 0) {
        statusHTML += `
            <div class="mt-3">
                <h5 class="text-sm font-medium text-gray-900 mb-2">承認履歴</h5>
                <div class="space-y-1 max-h-80 overflow-y-auto border rounded-lg bg-white p-3">
                    ${item.approvalHistory.map(history => `
                        <div class="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <div class="font-medium">${history.action} - ${history.user}</div>
                            <div>${new Date(history.timestamp).toLocaleString('ja-JP')}</div>
                            ${history.comment ? `<div class="mt-1">${history.comment}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    statusHTML += `</div>`;
    
    return statusHTML;
}

/**
 * Close approval modal
 */
window.closeApprovalModal = function() {
    document.getElementById('approvalModal').classList.add('hidden');
};

/**
 * Approve an item (2-step approval process)
 */
window.approveItem = async function(itemId) {
    try {
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const item = allApprovalData.find(d => d._id === itemId);
        
        // Get user's full name for display
        const userFullName = await getUserFullName(currentUser.username);
        
        let newStatus, approvalField, approvalByField, actionText;
        
        // Determine next approval step based on current status and user role
        if ((!item.approvalStatus || item.approvalStatus === 'pending') && currentUser.role === '班長') {
            // First step: 班長 approval
            newStatus = 'hancho_approved';
            approvalField = 'hanchoApprovedBy';
            approvalByField = 'hanchoApprovedAt';
            actionText = '班長承認';
        } else if (item.approvalStatus === 'hancho_approved' && ['課長', 'admin', '部長'].includes(currentUser.role)) {
            // Second step: 課長 approval
            newStatus = 'fully_approved';
            approvalField = 'kachoApprovedBy';
            approvalByField = 'kachoApprovedAt';
            actionText = '課長承認';
        } else if (item.approvalStatus === 'correction_needed_from_kacho' && currentUser.role === '班長') {
            // Re-approval after 課長 correction request
            newStatus = 'hancho_approved';
            approvalField = 'hanchoApprovedBy';
            approvalByField = 'hanchoApprovedAt';
            actionText = '修正完了・再承認';
        } else {
            alert("承認権限がありません");
            return;
        }
        
        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "submittedDB",
                collectionName: currentApprovalTab,
                query: { _id: itemId },
                update: {
                    $set: {
                        approvalStatus: newStatus,
                        [approvalField]: userFullName,
                        [approvalByField]: new Date()
                    },
                    $push: {
                        approvalHistory: {
                            action: actionText,
                            user: userFullName,
                            timestamp: new Date()
                        }
                    }
                }
            })
        });
        
        if (!response.ok) throw new Error('Failed to approve item');
        
        let stepMessage;
        if (actionText === '修正完了・再承認') {
            stepMessage = '修正完了・班長再承認（課長承認待ち）';
        } else if (newStatus === 'hancho_approved') {
            stepMessage = '班長承認完了（課長承認待ち）';
        } else {
            stepMessage = '課長承認完了（承認完了）';
        }
        
        alert(stepMessage);
        closeApprovalModal();
        loadApprovalData();
        
    } catch (error) {
        console.error('Error approving item:', error);
        alert("承認に失敗しました");
    }
};

/**
 * Get user's full name for display
 */
async function getUserFullName(username) {
    try {
        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "Sasaki_Coating_MasterDB",
                collectionName: "users",
                query: { username: username },
                projection: { firstName: 1, lastName: 1 }
            })
        });

        if (response.ok) {
            const users = await response.json();
            if (users.length > 0) {
                const user = users[0];
                return `${user.lastName || ''} ${user.firstName || ''}`.trim() || username;
            }
        }
        return username; // Fallback to username if full name not found
    } catch (error) {
        console.error('Error getting user full name:', error);
        return username;
    }
}

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
        const userFullName = await getUserFullName(currentUser.username);
        const item = allApprovalData.find(d => d._id === itemId);
        
        let newStatus, targetRole;
        
        // Determine correction logic based on current status and user role
        if (currentUser.role === '班長' && (!item.approvalStatus || item.approvalStatus === 'pending')) {
            // Scenario 2: 班長 requests correction - goes back to submitter (original logic)
            newStatus = 'correction_needed';
            targetRole = 'submitter';
        } else if (['課長', 'admin', '部長'].includes(currentUser.role) && item.approvalStatus === 'hancho_approved') {
            // Scenario 1: 課長 requests correction after 班長 approval - goes back to 班長
            newStatus = 'correction_needed_from_kacho';
            targetRole = '班長';
        } else {
            alert("修正要求権限がありません");
            return;
        }
        
        const response = await fetch(BASE_URL + "queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dbName: "submittedDB",
                collectionName: currentApprovalTab,
                query: { _id: itemId },
                update: {
                    $set: {
                        approvalStatus: newStatus,
                        correctionBy: userFullName,
                        correctionAt: new Date(),
                        correctionComment: comment,
                        correctionTarget: targetRole
                    },
                    $push: {
                        approvalHistory: {
                            action: '修正要求',
                            user: userFullName,
                            timestamp: new Date(),
                            comment: comment,
                            target: targetRole
                        }
                    }
                }
            })
        });
        
        if (!response.ok) throw new Error('Failed to request correction');
        
        const targetMessage = targetRole === '班長' ? 
            "修正要求を送信しました（班長による修正が必要）" : 
            "修正要求を送信しました（提出者による修正が必要）";
        alert(targetMessage);
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

// ============================================
// NEW VIEW MODE FUNCTIONALITY
// ============================================

/**
 * Toggle between table and list view modes
 */
function toggleViewMode(viewMode) {
    const tableContainer = document.getElementById('approvalsTableContainer');
    const listContainer = document.getElementById('approvalsListContainer');
    const listControls = document.getElementById('listViewControls');
    const summaryReport = document.getElementById('summaryReport');
    const pagination = document.querySelector('.flex.items-center.justify-between.mt-6');

    if (viewMode === 'list') {
        // Show list view
        tableContainer.classList.add('hidden');
        listContainer.classList.remove('hidden');
        listControls.classList.remove('hidden');
        summaryReport.classList.remove('hidden');
        pagination.classList.add('hidden');
        
        // Initialize list view
        initializeListView();
        renderApprovalList();
        generateSummaryReport();
    } else {
        // Show table view (default)
        tableContainer.classList.remove('hidden');
        listContainer.classList.add('hidden');
        listControls.classList.add('hidden');
        summaryReport.classList.add('hidden');
        pagination.classList.remove('hidden');
        
        // Render table view
        renderApprovalTable();
    }
}

/**
 * Initialize list view event listeners
 */
function initializeListView() {
    // Batch approval buttons
    document.getElementById('batchApproveBtn').addEventListener('click', handleBatchApproval);
    document.getElementById('batchRejectBtn').addEventListener('click', handleBatchReject);
}

/**
 * Render approval data as structured list
 */
function renderApprovalList() {
    const container = document.getElementById('approvalsListContainer');
    
    if (filteredApprovalData.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-gray-500">データがありません</div>';
        return;
    }

    // Sort by Time_start for list view (default) unless another sort is active
    let sortedData = [...filteredApprovalData];
    if (!approvalSortState.column) {
        sortedData.sort((a, b) => {
            const timeA = a.Time_start || '00:00';
            const timeB = b.Time_start || '00:00';
            return timeA.localeCompare(timeB);
        });
    }

    // Get all possible fields for the current tab
    const allFields = getAllFieldsForTab(currentApprovalTab, sortedData);

    // Create comprehensive table structure
    const listHTML = `
        <div class="bg-white border rounded-lg overflow-hidden">
            <!-- Excel-like table -->
            <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                    <thead class="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <th class="border p-2 w-8">
                                <input type="checkbox" id="selectAllListItems" class="rounded" onchange="toggleSelectAll(this)">
                            </th>
                            <th class="border p-2 text-left font-medium text-gray-700 bg-yellow-50 cursor-pointer hover:bg-yellow-100" onclick="sortApprovalTable('approvalStatus')">
                                Status${getSortArrow('approvalStatus')}
                            </th>
                            ${allFields.map(field => {
                                const fieldKey = field.name.includes('.') ? field.name.split('.')[1] : field.name;
                                const isClickable = ['Date', 'Time_start', 'Time_end', '工場', '品番', '背番号', 'Worker_Name', '設備'].includes(field.name) || 
                                                  field.name.includes('加工数') || field.name.includes('不良') || field.name.includes('NG');
                                
                                if (isClickable) {
                                    return `
                                        <th class="border p-2 text-left font-medium text-gray-700 min-w-24 cursor-pointer hover:bg-gray-100 ${field.isGrouped ? 'bg-blue-50 hover:bg-blue-100' : ''}" 
                                            onclick="sortApprovalTable('${field.name}')" 
                                            title="${field.description || field.name}">
                                            ${field.displayName}${getSortArrow(field.name)}
                                            ${field.isGrouped ? `<br><span class="text-xs text-blue-600">(${field.group})</span>` : ''}
                                        </th>
                                    `;
                                } else {
                                    return `
                                        <th class="border p-2 text-left font-medium text-gray-700 min-w-24 ${field.isGrouped ? 'bg-blue-50' : ''}" title="${field.description || field.name}">
                                            ${field.displayName}
                                            ${field.isGrouped ? `<br><span class="text-xs text-blue-600">(${field.group})</span>` : ''}
                                        </th>
                                    `;
                                }
                            }).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedData.map((item, index) => createListRow(item, index, allFields)).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = listHTML;

    // Add event listeners for list interactions
    addListEventListeners();
}

/**
 * Get all possible fields for the current tab
 */
function getAllFieldsForTab(tabName, data) {
    const fields = [];
    
    // Basic fields (always shown)
    const basicFields = [
        { name: 'Date', displayName: '日付', group: null },
        { name: 'Time_start', displayName: '開始時間', group: null },
        { name: 'Time_end', displayName: '終了時間', group: null },
        { name: '工場', displayName: '工場', group: null },
        { name: '品番', displayName: '品番', group: null },
        { name: '背番号', displayName: '背番号', group: null },
        { name: 'Worker_Name', displayName: '作業者', group: null },
        { name: '設備', displayName: '設備', group: null }
    ];

    // Add basic fields that exist in data
    basicFields.forEach(field => {
        if (data.some(item => item[field.name] !== undefined && item[field.name] !== null && item[field.name] !== '')) {
            fields.push(field);
        }
    });

    // Process-specific fields
    const processFields = [];
    
    if (tabName === 'kensaDB') {
        processFields.push(
            { name: 'Process_Quantity', displayName: '処理数', group: null },
            { name: 'Remaining_Quantity', displayName: '残り数', group: null },
            { name: 'Total', displayName: 'Total', group: null },
            { name: 'Total_NG', displayName: 'Total NG', group: null },
            { name: '製造ロット', displayName: '製造ロット', group: null }
        );

        // Add counter fields
        const sampleItem = data.find(item => item.Counters);
        if (sampleItem && sampleItem.Counters) {
            Object.keys(sampleItem.Counters).forEach(counter => {
                processFields.push({
                    name: `Counters.${counter}`,
                    displayName: counter,
                    group: 'Counters',
                    isGrouped: true
                });
            });
        }
    } else if (tabName === 'pressDB') {
        processFields.push(
            { name: 'Total', displayName: 'Total', group: null },
            { name: 'Total_NG', displayName: 'Total NG', group: null },
            { name: '材料ロット', displayName: '材料ロット', group: null },
            { name: 'Cycle_Time', displayName: 'サイクル時間', group: null },
            { name: 'ショット数', displayName: 'ショット数', group: null },
            { name: '疵引処理数', displayName: '疵引処理数', group: 'NG Details', isGrouped: true },
            { name: '疵引不良', displayName: '疵引不良', group: 'NG Details', isGrouped: true },
            { name: '加工不良', displayName: '加工不良', group: 'NG Details', isGrouped: true },
            { name: 'その他', displayName: 'その他', group: 'NG Details', isGrouped: true }
        );
    } else if (tabName === 'SRSDB') {
        processFields.push(
            { name: 'Total', displayName: 'Total', group: null },
            { name: 'SRS_Total_NG', displayName: 'SRS Total NG', group: null },
            { name: 'くっつき・めくれ', displayName: 'くっつき・めくれ', group: 'SRS Details', isGrouped: true },
            { name: 'シワ', displayName: 'シワ', group: 'SRS Details', isGrouped: true },
            { name: '転写位置ズレ', displayName: '転写位置ズレ', group: 'SRS Details', isGrouped: true },
            { name: '転写不良', displayName: '転写不良', group: 'SRS Details', isGrouped: true },
            { name: '文字欠け', displayName: '文字欠け', group: 'SRS Details', isGrouped: true }
        );
    } else if (tabName === 'slitDB') {
        processFields.push(
            { name: 'Total', displayName: 'Total', group: null },
            { name: 'Total_NG', displayName: 'Total NG', group: null },
            { name: '疵引不良', displayName: '疵引不良', group: 'NG Details', isGrouped: true },
            { name: '加工不良', displayName: '加工不良', group: 'NG Details', isGrouped: true },
            { name: 'その他', displayName: 'その他', group: 'NG Details', isGrouped: true }
        );
    }

    // Add process fields that exist in data
    processFields.forEach(field => {
        if (field.name.includes('.')) {
            // Handle nested fields like Counters.counter-1
            const [parent, child] = field.name.split('.');
            if (data.some(item => item[parent] && item[parent][child] !== undefined)) {
                fields.push(field);
            }
        } else {
            if (data.some(item => item[field.name] !== undefined && item[field.name] !== null && item[field.name] !== '')) {
                fields.push(field);
            }
        }
    });

    // Add image fields
    const imageFields = [];
    const sampleItem = data[0];
    if (sampleItem) {
        Object.keys(sampleItem).forEach(key => {
            if (key.includes('画像') && sampleItem[key]) {
                imageFields.push({
                    name: key,
                    displayName: key.replace('画像', ' Image'),
                    group: 'Images',
                    isGrouped: true,
                    isImage: true
                });
            }
        });
    }

    fields.push(...imageFields);

    // Add common fields at the end
    const endFields = [
        { name: 'Spare', displayName: 'Spare', group: null },
        { name: 'Comment', displayName: 'Comment', group: null }
    ];

    endFields.forEach(field => {
        if (data.some(item => item[field.name] !== undefined && item[field.name] !== null && item[field.name] !== '')) {
            fields.push(field);
        }
    });

    return fields;
}

/**
 * Create individual list row
 */
function createListRow(item, index, allFields) {
    const statusInfo = getStatusInfo(item);
    
    // Check for obvious wrong data
    const hasWrongData = detectWrongData(item);
    const wrongDataClass = hasWrongData ? 'bg-red-100 border-red-300' : '';
    
    const rowClass = 'hover:bg-gray-50 ' + statusInfo.rowClass + ' ' + wrongDataClass + ' ' + (index % 2 === 0 ? 'bg-gray-25' : '');
    
    let rowHtml = '<tr class="' + rowClass + '" onclick="openApprovalDetail(\'' + item._id + '\')" style="cursor: pointer;">';
    
    // Checkbox column
    rowHtml += '<td class="border p-2 text-center" onclick="event.stopPropagation();">';
    
    // Check if item should be disabled for current user role
    const isDisabled = shouldDisableCheckbox(item, currentUser.role);
    const disabledAttr = isDisabled ? ' disabled' : '';
    const disabledClass = isDisabled ? ' opacity-50 cursor-not-allowed' : '';
    
    rowHtml += '<input type="checkbox" class="list-checkbox rounded' + disabledClass + '" data-item-id="' + item._id + '" onchange="updateBatchButtons()"' + disabledAttr + '>';
    rowHtml += '</td>';
    
    // Status column
    rowHtml += '<td class="border p-2">';
    rowHtml += '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ' + statusInfo.badgeClass + '">';
    rowHtml += '<i class="' + statusInfo.icon + ' mr-1"></i>';
    rowHtml += statusInfo.text;
    if (hasWrongData) {
        rowHtml += ' ⚠️';
    }
    rowHtml += '</span>';
    rowHtml += '</td>';
    
    // Data columns
    allFields.forEach(field => {
        let value = '';
        let cellClass = 'border p-2 text-sm';
        
        if (field.name.includes('.')) {
            // Handle nested fields like Counters.counter-1
            const [parent, child] = field.name.split('.');
            value = item[parent] && item[parent][child] !== undefined ? item[parent][child] : '';
        } else {
            value = item[field.name] !== undefined ? item[field.name] : '';
        }

        // Special formatting
        if (field.isImage && value) {
            value = '✅ OK';
            cellClass += ' text-green-600 font-medium text-center';
        } else if (field.name.includes('不良') && value > 0) {
            cellClass += ' text-red-600 font-medium';
        } else if (field.name.includes('NG') && value > 0) {
            cellClass += ' text-red-600 font-medium';
        } else if (typeof value === 'number' && value > 0) {
            value = value.toLocaleString();
        } else if (typeof value === 'number' && value < 0) {
            // Highlight negative numbers
            cellClass += ' text-red-600 font-medium bg-red-50';
        }

        // Highlight grouped fields
        if (field.isGrouped) {
            cellClass += ' bg-blue-25';
        }

        rowHtml += '<td class="' + cellClass + '" title="' + field.displayName + ': ' + value + '">' + (value || '-') + '</td>';
    });
    
    rowHtml += '</tr>';
    
    return rowHtml;
}

/**
 * Check if checkbox should be disabled for current user and item status
 */
function shouldDisableCheckbox(item, userRole) {
    const status = item.approvalStatus;
    
    // If user is 班長 (hancho)
    if (userRole === '班長') {
        // Disable if already hancho approved, fully approved, or rejected
        if (status === 'hancho_approved' || 
            status === 'fully_approved' || 
            status === 'rejected' ||
            status === 'correction_needed_from_kacho') {
            return true;
        }
    }
    
    // If user is 課長 or higher
    if (['課長', '部長', 'admin'].includes(userRole)) {
        // Disable if fully approved or rejected (final states)
        if (status === 'fully_approved' || status === 'rejected') {
            return true;
        }
    }
    
    return false;
}

/**
 * Detect obvious wrong data in an item
 */
function detectWrongData(item) {
    const issues = [];
    
    // Check for time start equals time end
    const startTimeFields = ['Time_start', '開始時刻', 'start_time'];
    const endTimeFields = ['Time_end', '終了時刻', 'end_time'];
    
    for (const startField of startTimeFields) {
        for (const endField of endTimeFields) {
            if (item[startField] && item[endField] && item[startField] === item[endField]) {
                issues.push("Time start equals time end: " + item[startField]);
            }
        }
    }
    
    // Check for negative quantities
    const quantityFields = ['Total', 'Process_Quantity', '数量', 'quantity', 'total'];
    for (const field of quantityFields) {
        if (item[field] && typeof item[field] === 'number' && item[field] < 0) {
            issues.push("Negative quantity: " + field + " = " + item[field]);
        }
    }
    
    // Check counters for negative values
    if (item.Counters) {
        Object.entries(item.Counters).forEach(([key, value]) => {
            if (typeof value === 'number' && value < 0) {
                issues.push("Negative counter: " + key + " = " + value);
            }
        });
    }
    
    // Log detected issues for debugging
    if (issues.length > 0) {
        console.log("Wrong data detected in item " + item._id + ":", issues);
    }
    
    return issues.length > 0;
}

/**
 * Add event listeners for list interactions
 */
function addListEventListeners() {
    // Update batch button states when checkboxes change
    const checkboxes = document.querySelectorAll('.list-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateBatchButtons);
    });
}

/**
 * Toggle select all functionality
 */
window.toggleSelectAll = function(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.list-checkbox:not(:disabled)');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    updateBatchButtons();
};

/**
 * Update batch button states based on selected items
 */
function updateBatchButtons() {
    const checkboxes = document.querySelectorAll('.list-checkbox:checked:not(:disabled)');
    const approveBtn = document.getElementById('batchApproveBtn');
    const rejectBtn = document.getElementById('batchRejectBtn');
    const selectedCount = document.getElementById('selectedCount');

    const selectedLength = checkboxes.length;
    const isEnabled = selectedLength > 0;

    approveBtn.disabled = !isEnabled;
    rejectBtn.disabled = !isEnabled;
    selectedCount.textContent = selectedLength + " " + (window.t ? window.t('selected') : 'selected');
}

/**
 * Create organized field data for card display
 */
function createFieldData(item) {
    const fieldGroups = [];
    
    // Basic fields (ungrouped)
    const basicFields = [
        { key: 'Date', label: '日付' },
        { key: '設備', label: '設備' },
        { key: 'Process_Quantity', label: '処理数' },
        { key: 'Remaining_Quantity', label: '残り数' },
        { key: 'Total', label: 'Total' },
        { key: 'Spare', label: 'Spare' },
        { key: 'Cycle_Time', label: 'サイクル時間' },
        { key: '製造ロット', label: '製造ロット' },
        { key: '材料ロット', label: '材料ロット' },
        { key: 'ショット数', label: 'ショット数' }
    ];

    const basicGroup = {
        groupName: null,
        fields: basicFields
            .filter(field => item[field.key] !== undefined && item[field.key] !== null && item[field.key] !== '')
            .map(field => ({
                label: field.label,
                value: item[field.key],
                isImage: false,
                isNegative: false
            }))
    };

    if (basicGroup.fields.length > 0) {
        fieldGroups.push(basicGroup);
    }

    // Counters group (for kensaDB)
    if (item.Counters && typeof item.Counters === 'object') {
        const counterFields = Object.entries(item.Counters)
            .filter(([key, value]) => value > 0)
            .map(([key, value]) => ({
                label: key,
                value: value,
                isImage: false,
                isNegative: true
            }));

        if (counterFields.length > 0) {
            fieldGroups.push({
                groupName: 'Counters',
                fields: counterFields
            });
        }
    }

    // NG fields group (for pressDB, slitDB)
    const ngFields = [
        { key: '疵引不良', label: '疵引不良' },
        { key: '加工不良', label: '加工不良' },
        { key: 'その他', label: 'その他' },
        { key: '疵引処理数', label: '疵引処理数' }
    ];

    const ngGroup = {
        groupName: 'NG Details',
        fields: ngFields
            .filter(field => item[field.key] !== undefined && item[field.key] !== null && item[field.key] !== '')
            .map(field => ({
                label: field.label,
                value: item[field.key],
                isImage: false,
                isNegative: field.key.includes('不良') && item[field.key] > 0
            }))
    };

    if (ngGroup.fields.length > 0) {
        fieldGroups.push(ngGroup);
    }

    // SRS specific fields (for SRSDB)
    if (currentApprovalTab === 'SRSDB') {
        const srsFields = [
            { key: 'くっつき・めくれ', label: 'くっつき・めくれ' },
            { key: 'シワ', label: 'シワ' },
            { key: '転写位置ズレ', label: '転写位置ズレ' },
            { key: '転写不良', label: '転写不良' },
            { key: '文字欠け', label: '文字欠け' }
        ];

        const srsGroup = {
            groupName: 'SRS Details',
            fields: srsFields
                .filter(field => item[field.key] !== undefined && item[field.key] !== null && item[field.key] !== '')
                .map(field => ({
                    label: field.label,
                    value: item[field.key],
                    isImage: false,
                    isNegative: item[field.key] > 0
                }))
        };

        if (srsGroup.fields.length > 0) {
            fieldGroups.push(srsGroup);
        }
    }

    // Images group
    const imageFields = Object.keys(item)
        .filter(key => key.includes('画像') && item[key])
        .map(key => ({
            label: key,
            value: 'Available',
            isImage: true,
            isNegative: false
        }));

    if (imageFields.length > 0) {
        fieldGroups.push({
            groupName: 'Images',
            fields: imageFields
        });
    }

    return fieldGroups;
}

/**
 * Add event listeners for card interactions
 */
function addCardEventListeners() {
    // Update batch button states when checkboxes change
    const checkboxes = document.querySelectorAll('.card-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateBatchButtons);
    });
}

/**
 * Update batch button states based on selected items
 */
function updateBatchButtons() {
    const checkboxes = document.querySelectorAll('.list-checkbox:checked:not(:disabled)');
    const approveBtn = document.getElementById('batchApproveBtn');
    const rejectBtn = document.getElementById('batchRejectBtn');
    const selectedCount = document.getElementById('selectedCount');

    const selectedLength = checkboxes.length;
    const isEnabled = selectedLength > 0;

    approveBtn.disabled = !isEnabled;
    rejectBtn.disabled = !isEnabled;
    selectedCount.textContent = selectedLength + " " + (window.t ? window.t('selected') : 'selected');
}

/**
 * Handle batch approval
 */
async function handleBatchApproval() {
    const selectedItems = Array.from(document.querySelectorAll('.list-checkbox:checked:not(:disabled)'))
        .map(checkbox => checkbox.dataset.itemId);

    console.log('Debug: Selected items for batch approval:', selectedItems);

    if (selectedItems.length === 0) {
        alert('承認するアイテムを選択してください');
        return;
    }

    if (!confirm(selectedItems.length + "件のアイテムを一括承認しますか？")) {
        return;
    }

    try {
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        console.log('Debug: Current user:', currentUser);
        
        const userFullName = await getUserFullName(currentUser.username);
        console.log('Debug: User full name:', userFullName);
        
        const promises = selectedItems.map(async (itemId) => {
            const item = allApprovalData.find(d => d._id === itemId);
            console.log('Debug: Processing item ' + itemId + ':', item);
            
            if (!item) {
                throw new Error('Item ' + itemId + ': データが見つかりません');
            }
            
            // Check approval permissions and determine status
            let newStatus, approvalField, approvalByField, actionText;
            
            console.log('Debug: Item ' + itemId + ' - Current status: ' + item.approvalStatus + ', User role: ' + currentUser.role);
            
            if ((!item.approvalStatus || item.approvalStatus === 'pending') && currentUser.role === '班長') {
                newStatus = 'hancho_approved';
                approvalField = 'hanchoApprovedBy';
                approvalByField = 'hanchoApprovedAt';
                actionText = '班長承認';
            } else if (item.approvalStatus === 'hancho_approved' && ['課長', 'admin', '部長'].includes(currentUser.role)) {
                newStatus = 'fully_approved';
                approvalField = 'kachoApprovedBy';
                approvalByField = 'kachoApprovedAt';
                actionText = '課長承認';
            } else if (item.approvalStatus === 'correction_needed_from_kacho' && currentUser.role === '班長') {
                newStatus = 'hancho_approved';
                approvalField = 'hanchoApprovedBy';
                approvalByField = 'hanchoApprovedAt';
                actionText = '修正完了・再承認';
            } else {
                throw new Error('Item ' + itemId + ': 承認権限がありません (Status: ' + item.approvalStatus + ', Role: ' + currentUser.role + ')');
            }

            console.log('Debug: Item ' + itemId + ' - New status: ' + newStatus + ', Action: ' + actionText);

            return fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dbName: "submittedDB",
                    collectionName: currentApprovalTab,
                    query: { _id: itemId },
                    update: {
                        $set: {
                            approvalStatus: newStatus,
                            [approvalField]: userFullName,
                            [approvalByField]: new Date()
                        },
                        $push: {
                            approvalHistory: {
                                action: actionText,
                                user: userFullName,
                                timestamp: new Date(),
                                batchOperation: true
                            }
                        }
                    }
                })
            });
        });

        const results = await Promise.all(promises);
        console.log('Debug: Batch approval results:', results);
        
        alert(selectedItems.length + '件のアイテムを一括承認しました');
        
        // Clear selections and reload data
        document.querySelectorAll('.list-checkbox:checked').forEach(checkbox => checkbox.checked = false);
        updateBatchButtons();
        loadApprovalData();
        
    } catch (error) {
        console.error('Batch approval error:', error);
        alert('一括承認に失敗しました: ' + error.message);
    }
}

/**
 * Handle batch reject
 */
async function handleBatchReject() {
    const selectedItems = Array.from(document.querySelectorAll('.list-checkbox:checked:not(:disabled)'))
        .map(checkbox => checkbox.dataset.itemId);

    if (selectedItems.length === 0) {
        alert('却下するアイテムを選択してください');
        return;
    }

    const comment = prompt("却下理由を入力してください:");
    if (!comment || comment.trim() === "") {
        alert("却下理由を入力してください");
        return;
    }

    if (!confirm(selectedItems.length + '件のアイテムを一括却下しますか？')) {
        return;
    }

    try {
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const userFullName = await getUserFullName(currentUser.username);
        
        const promises = selectedItems.map(async (itemId) => {
            const item = allApprovalData.find(d => d._id === itemId);
            
            let newStatus, targetRole;
            
            if (currentUser.role === '班長' && (!item.approvalStatus || item.approvalStatus === 'pending')) {
                newStatus = 'correction_needed';
                targetRole = 'submitter';
            } else if (['課長', 'admin', '部長'].includes(currentUser.role) && item.approvalStatus === 'hancho_approved') {
                newStatus = 'correction_needed_from_kacho';
                targetRole = '班長';
            } else {
                throw new Error('Item ' + itemId + ': 却下権限がありません');
            }

            return fetch(BASE_URL + "queries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dbName: "submittedDB",
                    collectionName: currentApprovalTab,
                    query: { _id: itemId },
                    update: {
                        $set: {
                            approvalStatus: newStatus,
                            correctionBy: userFullName,
                            correctionAt: new Date(),
                            correctionComment: comment,
                            correctionTarget: targetRole
                        },
                        $push: {
                            approvalHistory: {
                                action: '修正要求',
                                user: userFullName,
                                timestamp: new Date(),
                                comment: comment,
                                target: targetRole,
                                batchOperation: true
                            }
                        }
                    }
                })
            });
        });

        await Promise.all(promises);
        
        alert(selectedItems.length + '件のアイテムを一括却下しました');
        
        // Clear selections and reload data
        document.querySelectorAll('.list-checkbox:checked').forEach(checkbox => checkbox.checked = false);
        updateBatchButtons();
        loadApprovalData();
        
    } catch (error) {
        console.error('Batch reject error:', error);
        alert('一括却下に失敗しました: ' + error.message);
    }
}

/**
 * Generate summary report for card view
 */
function generateSummaryReport() {
    if (filteredApprovalData.length === 0) {
        document.getElementById('summaryStats').innerHTML = '<div class="col-span-4 text-center text-gray-500">データがありません</div>';
        return;
    }

    // Calculate time range
    const timeStarts = filteredApprovalData
        .map(item => item.Time_start)
        .filter(time => time)
        .sort();
    
    const timeEnds = filteredApprovalData
        .map(item => item.Time_end)
        .filter(time => time)
        .sort();

    const earliestStart = timeStarts[0] || '00:00';
    const latestEnd = timeEnds[timeEnds.length - 1] || '23:59';

    // Calculate time difference in hours
    const startTime = new Date(`2000-01-01T${earliestStart}:00`);
    const endTime = new Date(`2000-01-01T${latestEnd}:00`);
    let totalHours = (endTime - startTime) / (1000 * 60 * 60);
    if (totalHours < 0) totalHours += 24; // Handle day overflow

    // Calculate statistics
    const quantityField = getQuantityField(currentApprovalTab);
    const ngField = getNGField(currentApprovalTab);
    
    const totalQuantity = filteredApprovalData.reduce((sum, item) => sum + (item[quantityField] || 0), 0);
    const totalNG = filteredApprovalData.reduce((sum, item) => sum + (item[ngField] || 0), 0);
    const totalShots = filteredApprovalData.reduce((sum, item) => sum + (item.ショット数 || 0), 0);
    
    const defectRate = totalQuantity > 0 ? ((totalNG / totalQuantity) * 100).toFixed(2) : '0.00';
    const shotsPerHour = totalHours > 0 ? (totalShots / totalHours).toFixed(1) : '0.0';
    const shotsPerDay = totalShots;
    const efficiency = totalQuantity > 0 ? (((totalQuantity - totalNG) / totalQuantity) * 100).toFixed(2) : '100.00';

    // Calculate downtime (simplified - could be enhanced)
    const workingData = filteredApprovalData.filter(item => item.Time_start && item.Time_end);
    const totalWorkTime = workingData.reduce((sum, item) => {
        const start = new Date(`2000-01-01T${item.Time_start}:00`);
        const end = new Date(`2000-01-01T${item.Time_end}:00`);
        let duration = (end - start) / (1000 * 60 * 60);
        if (duration < 0) duration += 24;
        return sum + duration;
    }, 0);
    const downtime = Math.max(0, totalHours - totalWorkTime).toFixed(1);

    const summaryHTML = `
        <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">${shotsPerHour}</div>
            <div class="text-sm text-gray-600">ショット/時間</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-green-600">${shotsPerDay}</div>
            <div class="text-sm text-gray-600">ショット/日</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">${efficiency}%</div>
            <div class="text-sm text-gray-600">効率</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold ${parseFloat(defectRate) > 0 ? 'text-red-600' : 'text-gray-600'}">${defectRate}%</div>
            <div class="text-sm text-gray-600">不良率</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">${downtime}h</div>
            <div class="text-sm text-gray-600">ダウンタイム</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-gray-600">${totalHours.toFixed(1)}h</div>
            <div class="text-sm text-gray-600">稼働時間</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-indigo-600">${earliestStart}</div>
            <div class="text-sm text-gray-600">開始時刻</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-indigo-600">${latestEnd}</div>
            <div class="text-sm text-gray-600">終了時刻</div>
        </div>
    `;

    document.getElementById('summaryStats').innerHTML = summaryHTML;
}
