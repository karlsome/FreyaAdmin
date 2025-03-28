document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    loadPage("dashboard"); // Load dashboard by default
});

function setupNavigation() {
    document.querySelectorAll(".nav-btn").forEach(button => {
        button.addEventListener("click", function () {
            document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");

            const page = this.getAttribute("data-page"); // Get the page name
            loadPage(page);
        });
    });
}

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
            mainContent.innerHTML = `
                <h2 class="text-2xl font-semibold">User Management</h2>
                <div id="usersList"></div>
            `;
            renderUsers();
            break;

        default:
            mainContent.innerHTML = `<h2 class="text-xl font-semibold">Page Not Found</h2>`;
            break;
    }
}

function renderFactoryCards() {
    const container = document.getElementById("factoryCards");
    container.innerHTML = mockData.factories.map(factory => `
        <div class="bg-white p-6 rounded-lg shadow">
            <h4>${factory.name}</h4>
            <p>${factory.location}</p>
            <span class="text-xs px-2 py-1 bg-gray-200 rounded">${factory.status}</span>
            <p class="text-lg">${factory.performance}%</p>
        </div>
    `).join('');
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