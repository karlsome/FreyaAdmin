function handleMasterCSVUpload() {
  const file = document.getElementById("csvUploadInput").files[0];
  if (!file) return alert("No file selected");

  const reader = new FileReader();
  reader.onload = function (e) {
    const sjisArray = new Uint8Array(e.target.result);

    const unicodeArray = Encoding.convert(sjisArray, {
      to: 'UNICODE',
      from: 'SJIS',
      type: 'string'
    });

    Papa.parse(unicodeArray, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        displayCSVPreview(results.data);
      },
      error: function (err) {
        alert("CSV parsing error: " + err.message);
      }
    });
  };

  reader.readAsArrayBuffer(file);
}

function displayCSVPreview(data) {
  const preview = data.slice(0, 5); // show only first 5
  const keys = Object.keys(preview[0]);

  const html = `
    <p class="text-sm text-gray-600 mb-2">Preview (first 5 rows):</p>
    <table class="w-full text-sm border mb-2">
      <thead class="bg-gray-100">
        <tr>${keys.map(k => `<th class="px-2 py-1">${k}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${preview.map(row => `
          <tr>${keys.map(k => `<td class="px-2 py-1">${row[k]}</td>`).join("")}</tr>
        `).join("")}
      </tbody>
    </table>
    <button class="bg-green-500 text-white px-4 py-2 rounded" onclick="confirmMasterInsert()">Insert All to DB</button>
  `;

  window._csvMasterRecords = data;
  document.getElementById("csvPreviewContainer").innerHTML = html;
}

async function confirmMasterInsert() {
  const records = window._csvMasterRecords;
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const role = currentUser.role || "guest";
  const username = currentUser.username;

  if (!records?.length) return alert("No data to insert");

  let successCount = 0;
  let failCount = 0;

  for (const record of records) {
    try {
      const payload = {
        data: record
      };

      if (role === "admin" && username) {
        payload.username = username;
      }

      const res = await fetch(BASE_URL + "submitToMasterDB", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (res.ok && result.insertedId) {
        successCount++;
      } else {
        console.warn("Failed insert:", result);
        failCount++;
      }
    } catch (err) {
      console.error("Insert error:", err);
      failCount++;
    }
  }

  alert(`✅ Success: ${successCount} inserted\n❌ Failed: ${failCount}`);
  loadPage("masterDB"); // Refresh view
}



  function ensureMasterSidebarExists() {
  if (!document.getElementById("masterSidebar")) {
    const sidebar = document.createElement("div");
    sidebar.id = "masterSidebar";
    sidebar.className = "fixed top-0 right-0 w-[600px] h-full bg-white shadow-lg transform translate-x-full transition-transform duration-300 z-50 p-4 overflow-y-auto";
    sidebar.innerHTML = `
      <button onclick="closeMasterSidebar()" class="mb-4 text-red-500 font-semibold">Close</button>
      <div id="masterSidebarContent"></div>
    `;
    document.body.appendChild(sidebar);
  }
}

function showMasterSidebar(data) {
  ensureMasterSidebarExists();

  const container = document.getElementById("masterSidebarContent");
  const sidebar = document.getElementById("masterSidebar");
  const original = JSON.parse(JSON.stringify(data));
  const fields = Object.keys(data).filter(k => k !== "_id");

  const recordId = data._id?.$oid || data._id;
  const username = currentUser?.username || "unknown";

  // Prepare initial image display
  const imageHTML = data.imageURL
    ? `<img id="masterImagePreview" src="${data.imageURL}" alt="Product Image" class="w-full max-h-64 object-contain rounded shadow mb-2" />`
    : `<p class="text-gray-500 mb-2">No image uploaded.</p>`;

  container.innerHTML = `
    <h3 class="text-xl font-bold mb-4">${data["品番"] ?? "Details"}</h3>
    <div class="mb-4" id="masterImageSection">
      <h4 class="text-lg font-semibold">製品画像</h4>
      ${imageHTML}
      <div id="imageActionWrapper" class="hidden mt-2">
        <button onclick="document.getElementById('masterImageUploadInput').click()" class="text-blue-600 underline text-sm">${data.imageURL ? "Update Image" : "Upload Image"}</button>
        <input type="file" id="masterImageUploadInput" accept="image/*" class="hidden" />
      </div>
    </div>

    <div class="space-y-2" id="masterSidebarFields">
      ${fields.map(f => `
        <div class="flex items-center gap-2">
          <label class="font-medium w-32 shrink-0">${f}</label>
          <input type="text" class="editable-master p-1 border rounded w-full bg-gray-100" data-key="${f}" value="${data[f] ?? ""}" disabled />
        </div>
      `).join("")}
    </div>

    <div class="mt-4 flex gap-2">
      <button id="editMasterBtn" class="text-blue-600 underline text-sm">Edit</button>
      <button id="saveMasterBtn" class="hidden bg-green-500 text-white px-3 py-1 rounded text-sm">OK</button>
      <button id="cancelMasterBtn" class="hidden bg-gray-300 text-black px-3 py-1 rounded text-sm">Cancel</button>
    </div>
  `;

  sidebar.classList.remove("translate-x-full");

  const inputs = () => Array.from(document.querySelectorAll(".editable-master"));

  document.getElementById("editMasterBtn").onclick = () => {
    inputs().forEach(i => i.disabled = false);
    document.getElementById("saveMasterBtn").classList.remove("hidden");
    document.getElementById("cancelMasterBtn").classList.remove("hidden");

    // Show image upload controls
    document.getElementById("imageActionWrapper").classList.remove("hidden");
  };

  document.getElementById("cancelMasterBtn").onclick = () => showMasterSidebar(original);

  document.getElementById("saveMasterBtn").onclick = async () => {
    const updated = {};
    inputs().forEach(input => {
      const key = input.dataset.key;
      updated[key] = input.value.trim();
    });

    try {
      const res = await fetch(BASE_URL + "updateMasterRecord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, updates: updated, username })
      });

      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Failed to update");

      alert("Updated successfully.");
      closeMasterSidebar();
      loadPage("masterDB");
    } catch (err) {
      alert("Update failed.");
      console.error(err);
    }
  };

  // Image upload logic
document.getElementById("masterImageUploadInput").addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result.split(",")[1];

      try {
        const res = await fetch(BASE_URL + "uploadMasterImage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64,
            label: "main",
            recordId,
            username
          })
        });

        const result = await res.json();
        if (!res.ok || !result.imageURL) throw new Error(result.error || "Image upload failed");

        alert("Image uploaded successfully.");
        data.imageURL = result.imageURL;
        showMasterSidebar(data); // Refresh
      } catch (err) {
        alert("Image upload failed.");
        console.error(err);
      }
    };

    reader.readAsDataURL(file);
  });
}

function closeMasterSidebar() {
  const sidebar = document.getElementById("masterSidebar");
  if (sidebar) {
    sidebar.classList.add("translate-x-full");
  }
}


async function triggerMasterImageUpload(recordId) {
  const input = document.getElementById("masterImageUploadInput");
  input.click();

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    const storageRef = firebase.storage().ref(); // Assuming Firebase is initialized
    const path = `masterImage/${recordId}_${Date.now()}_${file.name}`;
    const imageRef = storageRef.child(path);

    try {
      const snapshot = await imageRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();

      // Save to masterDB record
      await fetch(BASE_URL + "/updateMasterRecord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          username: currentUser.username,
          updates: { imageURL: downloadURL }
        })
      });

      alert("Image uploaded successfully!");
      loadPage("masterDB");

    } catch (err) {
      console.error("Firebase upload failed:", err);
      alert("Upload failed.");
    }
  };
}