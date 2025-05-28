

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
  admin: ["dashboard", "factories", "processes", "notifications", "analytics", "userManagement", "approvals","masterDB"],
  班長: ["dashboard", "factories", "approvals","masterDB"],
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

        default:
            mainContent.innerHTML = `<h2 class="text-xl font-semibold">Page Not Found</h2>`;
            break;
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


