// Navigation utilities and functions
// roleAccess and navItemsConfig are defined in app.js to ensure proper loading order
// But we make sure they're available globally here too

// Ensure navigation config is globally available
if (typeof window !== 'undefined') {
  window.roleAccess = window.roleAccess || {
    admin: ["dashboard", "factories", "processes", "notifications", "analytics", "userManagement", "approvals", "masterDB", "customerManagement", "equipment"],
    部長: ["dashboard", "factories", "processes", "notifications", "analytics", "userManagement", "approvals", "masterDB", "equipment"],
    課長: ["dashboard", "factories", "processes", "notifications", "analytics", "userManagement", "approvals", "masterDB", "equipment"],
    係長: ["dashboard", "factories", "approvals", "masterDB", "equipment"],
    班長: ["dashboard", "factories", "approvals", "masterDB"],
    member: ["dashboard"]
  };

  window.navItemsConfig = window.navItemsConfig || {
    dashboard: { icon: "ri-dashboard-line", label: "Dashboard" },
    factories: { icon: "ri-building-line", label: "Factories" },
    masterDB: { icon: "ri-settings-line", label: "Master 製品" },
    processes: { icon: "ri-settings-line", label: "Processes" },
    notifications: { icon: "ri-notification-line", label: "Notifications" },
    analytics: { icon: "ri-line-chart-line", label: "Analytics" },
    userManagement: { icon: "ri-user-settings-line", label: "User Management" },
    approvals: { icon: "ri-checkbox-line", label: "Approvals", badge: "12" },
    customerManagement: { icon: "ri-user-3-line", label: "Customer Management" },
    equipment: { icon: "ri-tools-line", label: "Equipment" }
  };
}

/**
 * Toggles the visibility of the sidebar and its overlay for mobile responsiveness.
 */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  // Ensure elements exist before attempting to manipulate them
  if (sidebar && overlay) {
    sidebar.classList.toggle('-translate-x-full'); // Toggles the translation for showing/hiding
    overlay.classList.toggle('hidden');           // Toggles the overlay visibility
  }
}

/**
 * Toggles the visibility of the profile dropdown menu.
 */
function toggleDropdown() {
  const dropdown = document.getElementById('dropdownContent');
  if (dropdown) { // Ensure dropdown element exists
    dropdown.classList.toggle('hidden'); // Toggles the hidden class
  }
}

/**
 * Handles the user logout process by clearing local storage and redirecting to the login page.
 */
function logout() {
  localStorage.removeItem('authUser'); // Remove user session data
  window.location.href = 'login.html';  // Redirect to login page
}

/**
 * Creates and returns a single navigation list item (<li>) with a button.
 * The button is configured with icon, label, and dynamic click behavior.
 * @param {string} page - The identifier for the page (e.g., 'dashboard', 'customerManagement').
 * @param {string} role - The current user's role, used for context (though not directly used in this function's logic).
 * @returns {HTMLLIElement | null} The created list item element, or null if config is missing.
 */
function createNavItem(page, role) {
  // Destructure icon, label, and badge from the navItemsConfig
  const { icon, label, badge } = navItemsConfig[page] || {};

  // If essential config is missing, log a warning and return null
  if (!icon || !label) {
    console.warn(`Missing icon or label in navItemsConfig for page: ${page}. Skipping navigation item creation.`);
    return null;
  }

  const li = document.createElement('li');
  const button = document.createElement('button');
  // Add common classes for styling and identification
  button.className = 'nav-btn w-full flex items-center p-2 text-gray-600 rounded-lg hover:bg-gray-100';
  button.setAttribute('data-page', page); // Store the page identifier as a data attribute

  // Populate the button's inner HTML with icon, label, and optional badge
  button.innerHTML = `
    <i class="${icon} text-lg"></i>
    <span class="ml-3" data-i18n="${page}">${label}</span>
    ${badge ? `<span class="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">${badge}</span>` : ''}
  `;

  // Attach a click event listener to the button
  button.addEventListener('click', () => {
    // Remove active styling from all other navigation buttons
    document.querySelectorAll('#dynamicNav .nav-btn').forEach(btn => {
      btn.classList.remove('bg-gray-100', 'text-gray-900');
    });
    // Add active styling to the currently clicked button
    button.classList.add('bg-gray-100', 'text-gray-900');

    // Handle navigation logic
    // For all pages, attempt to load content dynamically using the loadPage function.
    // This assumes `loadPage` is defined in `app.js` or another loaded script.
    if (typeof window.loadPage === 'function') {
      window.loadPage(page);
    } else {
      // Fallback: If `loadPage` is not found, log a warning and perform a full page redirect
      console.warn(`'loadPage' function not found. Cannot load "${page}" dynamically. Redirecting to its HTML file.`);
      window.location.href = `${page}.html`;
    }

    // Hide sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  });

  li.appendChild(button); // Append the button to the list item
  return li;             // Return the fully constructed list item
}

/**
 * Renders the sidebar navigation dynamically based on the user's role.
 * Clears existing navigation items and populates with allowed pages.
 */
function renderSidebarNavigation() {
  const dynamicNav = document.getElementById('dynamicNav');
  if (!dynamicNav) {
    console.error('dynamicNav element not found. Cannot render sidebar navigation.');
    return; // Exit if the navigation container is not found
  }

  dynamicNav.innerHTML = ''; // Clear any existing navigation items

  // Get the current user's role from local storage, defaulting to 'guest'
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const userRole = currentUser.role || "guest";

  // Get the list of pages accessible to the current role
  const allowedPages = roleAccess[userRole] || [];

  // Iterate through allowed pages and create a navigation item for each
  allowedPages.forEach(page => {
    const navItem = createNavItem(page, userRole);
    if (navItem) { // Only append if a valid nav item was created
      dynamicNav.appendChild(navItem);
    }
  });

  // Update the displayed user role in the header (if the element exists)
  const roleDisplay = document.getElementById("userRole");
  if (roleDisplay) {
    roleDisplay.textContent = userRole;
  }
}

// Event listener for when the entire HTML document has been loaded and parsed.
document.addEventListener("DOMContentLoaded", function() {
  // Check if the main sidebar structure is already present in the DOM.
  // This prevents injecting duplicate HTML if the page already includes it statically.
  if (!document.getElementById('sidebar')) {
    // Construct the common HTML layout for the sidebar, header, and main content area.
    // This template will be injected into the <body>.
    const commonLayoutHTML = `
      <div id="sidebarOverlay" class="fixed inset-0 bg-black bg-opacity-30 hidden z-40 md:hidden" onclick="toggleSidebar()"></div>
      <div class="relative flex flex-col md:flex-row min-h-screen">
        <!-- Sidebar HTML -->
        <aside id="sidebar"
          class="fixed md:fixed md:top-0 md:left-0 md:h-screen w-64 bg-white border-r border-gray-200 flex flex-col transition-transform transform -translate-x-full md:translate-x-0 z-50">
          <div class="p-4 border-b border-gray-200 flex justify-center items-center">
            <a href="index.html">
              <img src="src/logo.png" alt="Sasaki Coating Logo" class="h-16" />
            </a>
          </div>
          <nav class="flex-1 overflow-y-auto p-4">
            <ul id="dynamicNav" class="space-y-2"></ul>
          </nav>
        </aside>

        <!-- Main Content Area HTML -->
        <main class="flex-1 flex flex-col overflow-y-auto md:ml-64 min-h-screen">
          <!-- Header HTML -->
          <header class="bg-white border-b border-gray-200 p-4">
            <div class="flex items-center justify-between">
              <div class="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
                <button id="mobileMenuButton" class="md:hidden text-gray-600 focus:outline-none text-2xl">
                  <i class="ri-menu-line"></i>
                </button>
                <select id="languageSelector" class="p-2 border rounded bg-white text-sm">
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                </select>
              </div>

              <div class="relative" id="profileMenu">
                <button onclick="toggleDropdown()" class="focus:outline-none">
                  <img src="https://i.pravatar.cc/40" class="w-10 h-10 rounded-full border" alt="Profile" />
                </button>
                <div id="dropdownContent" class="hidden absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-50">
                  <div class="px-4 py-2 text-sm text-gray-700">
                    Role: <span id="userRole">admin</span>
                  </div>
                  <div class="border-t"></div>
                  <button onclick="logout()" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </header>
          <div id="pageContent" class="p-6">
            <!-- This div will hold the specific content of each individual HTML page -->
          </div>
        </main>
      </div>
    `;

    // Inject the common layout HTML at the beginning of the <body>
    document.body.insertAdjacentHTML('afterbegin', commonLayoutHTML);

    // After the common layout is injected, render the dynamic navigation items
    renderSidebarNavigation();

    // Attach event listeners to the newly created elements
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    if (mobileMenuButton) {
      mobileMenuButton.addEventListener('click', toggleSidebar);
    }

    // Event listener to close the profile dropdown when clicking outside of it
    document.addEventListener("click", function (event) {
      const profileMenu = document.getElementById("profileMenu");
      const dropdownContent = document.getElementById("dropdownContent");
      if (profileMenu && dropdownContent && !profileMenu.contains(event.target)) {
        dropdownContent.classList.add("hidden");
      }
    });

    // Move the original content of the HTML page into the `#pageContent` div.
    // This is crucial because `navbar.js` now takes control of the overall page structure.
    const pageContentDiv = document.getElementById('pageContent');
    if (pageContentDiv) {
      // Get all direct children of the body
      const bodyChildren = Array.from(document.body.children);
      bodyChildren.forEach(child => {
        // Exclude the newly injected main layout container, the sidebar overlay, and script/style tags
        const injectedLayoutContainer = document.querySelector('.relative.flex.flex-col.min-h-screen');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        if (child !== injectedLayoutContainer &&
            child !== sidebarOverlay &&
            child.tagName.toLowerCase() !== 'script' &&
            child.tagName.toLowerCase() !== 'style') {
          // Move the child element into the #pageContent div
          pageContentDiv.appendChild(child);
        }
      });
    }
  } else {
    // If the sidebar structure already exists (meaning the HTML page *itself* has the sidebar/header defined statically)
    // then just render the dynamic navigation. This assumes the HTML page is designed to
    // include the sidebar and header HTML directly, and simply needs the nav items populated.
    renderSidebarNavigation();

    // Attach event listeners to existing elements in this scenario
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    if (mobileMenuButton) {
      mobileMenuButton.addEventListener('click', toggleSidebar);
    }
    document.addEventListener("click", function (event) {
      const profileMenu = document.getElementById("profileMenu");
      const dropdownContent = document.getElementById("dropdownContent");
      if (profileMenu && dropdownContent && !profileMenu.contains(event.target)) {
        dropdownContent.classList.add("hidden");
      }
    });
  }

  // Initial authentication check on DOMContentLoaded
  // This ensures that if the user is not authenticated, they are redirected
  if (!localStorage.getItem("authUser")) {
    window.location.href = "login.html";
  }
});
