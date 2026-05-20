/**
 * Handles uploading and previewing a CSV file for master data import.
 */
function handleMasterCSVUpload() {
  const file = document.getElementById("csvUploadInput").files[0];
  if (!file) return alert(t('noFileSelected'));

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
        alert(`${t('csvParsingError')}: ${err.message}`);
      }
    });
  };

  reader.readAsArrayBuffer(file);
}

/**
 * Displays a preview of the uploaded CSV data before import.
 */
function sanitizeMasterRecordFields(record = {}) {
  return Object.entries(record).reduce((sanitized, [key, value]) => {
    if (key === "_id" || String(key).trim() !== "") {
      sanitized[key] = value;
    }

    return sanitized;
  }, {});
}

const MASTER_DB_CANONICAL_FIELDS = [
  { key: "品番", label: "品番", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "モデル", label: "モデル", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "背番号", label: "背番号", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "品名", label: "品名", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "形状", label: "形状", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "R/L", label: "R/L", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "色", label: "色", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "顧客/納入先", label: "顧客/納入先", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "備考", label: "備考", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "加工設備", label: "加工設備", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "QR CODE", label: "QR CODE", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "型番", label: "型番", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "材料背番号", label: "材料背番号", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "材料", label: "材料", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "収容数", label: "収容数", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "工場", label: "工場", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "秒数(1pcs何秒)", label: "秒数(1pcs何秒)", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "離型紙上/下", label: "離型紙上/下", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "送りピッチ", label: "送りピッチ", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "SRS", label: "SRS", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "SLIT", label: "SLIT", inputType: "text", schemaType: "select", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "imageURL", label: "画像", inputType: "image", schemaType: "select", showInTable: true, showInSidebar: false, showInCreate: false },
  { key: "pickingIOT", label: "pickingIOT", inputType: "select", schemaType: "select", options: ["", "yes", "no"], showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "pcPerCycle", label: "pcPerCycle", inputType: "number", schemaType: "number", step: "1", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "machineConfig", label: "machineConfig", inputType: "json", schemaType: "json", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "pricePerBox", label: "pricePerBox", inputType: "number", schemaType: "number", step: "any", showInTable: true, showInSidebar: true, showInCreate: true },
  { key: "pricePerPc", label: "pricePerPc", inputType: "number", schemaType: "number", step: "any", showInTable: true, showInSidebar: true, showInCreate: true }
];

const MASTER_DB_CANONICAL_FIELD_KEYS = new Set(MASTER_DB_CANONICAL_FIELDS.map(field => field.key));

function escapeMasterFieldHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isMasterStructuredValue(value) {
  return value !== null && typeof value === "object";
}

function inferMasterFieldInputType(value) {
  if (typeof value === "number") return "number";
  if (isMasterStructuredValue(value)) return "json";
  return "text";
}

function inferMasterFieldSchemaType(value) {
  const inputType = inferMasterFieldInputType(value);
  if (inputType === "number") return "number";
  if (inputType === "json") return "text";
  return "select";
}

function getMasterDbCanonicalFieldDefinitions() {
  return MASTER_DB_CANONICAL_FIELDS.map(field => ({ ...field }));
}

function getMasterDbFieldDefinitions(record = {}) {
  const extraFields = Object.keys(record)
    .filter(key => key !== "_id" && String(key).trim() !== "" && !MASTER_DB_CANONICAL_FIELD_KEYS.has(key))
    .map(key => ({
      key,
      label: key,
      inputType: inferMasterFieldInputType(record[key]),
      schemaType: inferMasterFieldSchemaType(record[key]),
      showInTable: false,
      showInSidebar: true,
      showInCreate: false
    }));

  return [...getMasterDbCanonicalFieldDefinitions(), ...extraFields];
}

function getMasterDbSidebarFieldDefinitions(record = {}) {
  return getMasterDbFieldDefinitions(record).filter(field => field.showInSidebar !== false && field.key !== "imageURL");
}

function getMasterDbCreateFieldDefinitions() {
  return getMasterDbCanonicalFieldDefinitions().filter(field => field.showInCreate !== false && field.key !== "imageURL");
}

function getMasterDbTableFieldDefinitions() {
  return getMasterDbCanonicalFieldDefinitions().filter(field => field.showInTable !== false);
}

function getMasterDbFieldDefinition(key, record = {}) {
  return getMasterDbFieldDefinitions(record).find(field => field.key === key) || {
    key,
    label: key,
    inputType: "text",
    schemaType: "select"
  };
}

function formatMasterDbFieldInputValue(key, value, record = {}) {
  const fieldDefinition = getMasterDbFieldDefinition(key, record);

  if (fieldDefinition.inputType === "json") {
    if (value === "" || value === null || value === undefined) {
      return "";
    }

    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }

  return value === null || value === undefined ? "" : String(value);
}

function parseMasterDbFieldInputValue(key, rawValue, record = {}) {
  const fieldDefinition = getMasterDbFieldDefinition(key, record);
  const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;

  if (fieldDefinition.inputType === "number") {
    if (value === "") return "";

    const parsedNumber = Number(value);
    if (Number.isNaN(parsedNumber)) {
      throw new Error(`${fieldDefinition.label} は数値で入力してください`);
    }

    return parsedNumber;
  }

  if (fieldDefinition.inputType === "json") {
    if (value === "") return "";

    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error(`${fieldDefinition.label} は有効なJSON形式で入力してください`);
    }
  }

  return value;
}

function formatMasterDbFieldValueForTable(key, value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (key === "machineConfig" && isMasterStructuredValue(value)) {
    const machineCount = Object.keys(value).length;
    return machineCount > 0 ? `${machineCount} machines` : "-";
  }

  if (isMasterStructuredValue(value)) {
    return JSON.stringify(value);
  }

  return String(value);
}

function renderMasterSidebarField(fieldDefinition, value, record = {}) {
  const serializedValue = formatMasterDbFieldInputValue(fieldDefinition.key, value, record);
  const escapedKey = escapeMasterFieldHtml(fieldDefinition.key);
  const escapedLabel = escapeMasterFieldHtml(fieldDefinition.label || fieldDefinition.key);
  const escapedValue = escapeMasterFieldHtml(serializedValue);
  const inputClasses = "editable-master p-1 border rounded w-full bg-gray-100 disabled:bg-gray-100 disabled:text-gray-700";

  if (fieldDefinition.inputType === "json") {
    return `
      <div class="flex items-start gap-2">
        <label class="font-medium w-32 shrink-0 pt-2">${escapedLabel}</label>
        <div class="w-full">
          <textarea class="${inputClasses} min-h-[140px] p-2 font-mono text-xs" data-key="${escapedKey}" data-field-type="json" disabled>${escapedValue}</textarea>
          <p class="text-xs text-gray-500 mt-1">JSON</p>
        </div>
      </div>
    `;
  }

  if (fieldDefinition.inputType === "select") {
    const options = (fieldDefinition.options || [""])
      .map(option => {
        const escapedOption = escapeMasterFieldHtml(option);
        const selected = option === serializedValue ? "selected" : "";
        const label = option === "" ? "-" : escapedOption;
        return `<option value="${escapedOption}" ${selected}>${label}</option>`;
      })
      .join("");

    return `
      <div class="flex items-center gap-2">
        <label class="font-medium w-32 shrink-0">${escapedLabel}</label>
        <select class="${inputClasses}" data-key="${escapedKey}" data-field-type="select" disabled>
          ${options}
        </select>
      </div>
    `;
  }

  const htmlInputType = fieldDefinition.inputType === "number" ? "number" : "text";
  const stepAttribute = fieldDefinition.inputType === "number" ? `step="${fieldDefinition.step || "any"}"` : "";

  return `
    <div class="flex items-center gap-2">
      <label class="font-medium w-32 shrink-0">${escapedLabel}</label>
      <input type="${htmlInputType}" ${stepAttribute} class="${inputClasses}" data-key="${escapedKey}" data-field-type="${fieldDefinition.inputType}" value="${escapedValue}" disabled />
    </div>
  `;
}

window.getMasterDbCanonicalFieldDefinitions = getMasterDbCanonicalFieldDefinitions;
window.getMasterDbFieldDefinitions = getMasterDbFieldDefinitions;
window.getMasterDbSidebarFieldDefinitions = getMasterDbSidebarFieldDefinitions;
window.getMasterDbCreateFieldDefinitions = getMasterDbCreateFieldDefinitions;
window.getMasterDbTableFieldDefinitions = getMasterDbTableFieldDefinitions;
window.getMasterDbFieldDefinition = getMasterDbFieldDefinition;
window.formatMasterDbFieldInputValue = formatMasterDbFieldInputValue;
window.parseMasterDbFieldInputValue = parseMasterDbFieldInputValue;
window.formatMasterDbFieldValueForTable = formatMasterDbFieldValueForTable;

function displayCSVPreview(data) {
  const sanitizedData = data.map(record => sanitizeMasterRecordFields(record));
  const preview = sanitizedData.slice(0, 5); // show only first 5
  const keys = Object.keys(preview[0]);

  const html = `
    <p class="text-sm text-gray-600 mb-2">${t('csvPreviewTitle')}</p>
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
    <button class="bg-green-500 text-white px-4 py-2 rounded" onclick="confirmMasterInsert()">${t('insertAllToDatabase')}</button>
  `;

  window._csvMasterRecords = sanitizedData;
  document.getElementById("csvPreviewContainer").innerHTML = html;
}

/**
 * Confirms and inserts the uploaded master data into the database.
 */
async function confirmMasterInsert() {
  const records = window._csvMasterRecords;
  const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const role = currentUser.role || "guest";
  const username = currentUser.username;

  if (!records?.length) return alert(t('noDataToInsert'));

  // Get current tab to determine which collection to insert into
  // Map materialDB tab to materialMasterDB2 collection
  const currentTab = window.currentMasterTab || 'masterDB';
  const collectionName = currentTab === 'materialDB' ? 'materialMasterDB2' : currentTab;

  let successCount = 0;
  let failCount = 0;

  for (const record of records) {
    try {
      const payload = {
        data: record,
        collectionName: collectionName // Add collection name to payload
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

  alert(t('insertSuccessMessage').replace('{successCount}', successCount).replace('{failCount}', failCount));
  // Reload data without switching tabs by calling loadMasterDB if available
  if (typeof loadMasterDB === 'function') {
    loadMasterDB();
  } else {
    loadPage("masterDB"); // Fallback
  }
}

/**
 * Ensures the master sidebar DOM element exists, creating it if needed.
 */
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

/**
 * Shows the right-side master detail sidebar with all information for a master record.
 * @param {Object} data - The master record data
 */
function showMasterSidebar(data) {
  ensureMasterSidebarExists();

  const container = document.getElementById("masterSidebarContent");
  const sidebar = document.getElementById("masterSidebar");
  const original = JSON.parse(JSON.stringify(data));
  const currentTab = window.currentMasterTab || "masterDB";
  const fieldDefinitions = currentTab === "masterDB"
    ? getMasterDbSidebarFieldDefinitions(data)
    : Object.keys(data)
        .filter(k => k !== "_id" && String(k).trim() !== "")
        .map(key => ({ key, label: key, inputType: "text" }));

  const recordId = data._id?.$oid || data._id;
  const username = currentUser?.username || "unknown";

  // Prepare initial image display
  const imageHTML = data.imageURL
    ? `<img id="masterImagePreview" src="${data.imageURL}" alt="Product Image" class="w-full max-h-64 object-contain rounded shadow mb-2" />`
    : `<p class="text-gray-500 mb-2">No image uploaded.</p>`;

  container.innerHTML = `
    <h3 class="text-xl font-bold mb-4">${data["品番"] || data["品名"] || data["材料品番"] || "Details"}</h3>
    <div class="mb-4" id="masterImageSection">
      <h4 class="text-lg font-semibold">製品画像</h4>
      ${imageHTML}
      <div id="imageActionWrapper" class="hidden mt-2">
        <button onclick="document.getElementById('masterImageUploadInput').click()" class="text-blue-600 underline text-sm">${data.imageURL ? "Update Image" : "Upload Image"}</button>
        <input type="file" id="masterImageUploadInput" accept="image/*" class="hidden" />
      </div>
    </div>

    <div class="space-y-2" id="masterSidebarFields">
      ${fieldDefinitions.map(fieldDefinition => renderMasterSidebarField(fieldDefinition, data[fieldDefinition.key], data)).join("")}
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
    let validationError = null;

    inputs().forEach(input => {
      if (validationError) return;

      const key = input.dataset.key || "";
      if (!key.trim()) return;

      try {
        if (currentTab === "masterDB") {
          updated[key] = parseMasterDbFieldInputValue(key, input.value, data);
        } else {
          updated[key] = input.value.trim();
        }
      } catch (error) {
        validationError = error;
      }
    });

    if (validationError) {
      alert(validationError.message);
      return;
    }

    try {
      // Get current tab to determine which collection to update
      // Map materialDB tab to materialMasterDB2 collection
      const collectionName = currentTab === 'materialDB' ? 'materialMasterDB2' : currentTab;
      
      const res = await fetch(BASE_URL + "updateMasterRecord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          recordId, 
          updates: updated, 
          username,
          collectionName: collectionName // Add collection name
        })
      });

      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Failed to update");

      alert(t('updatedSuccessfully'));
      closeMasterSidebar();
      // Reload data without switching tabs by calling loadMasterDB if available
      if (typeof loadMasterDB === 'function') {
        loadMasterDB();
      } else {
        loadPage("masterDB");
      }
    } catch (err) {
      alert(t('updateFailed'));
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

      // Show loading overlay
      showMasterImageUploadLoading();

      try {
        // Get current tab to determine which collection to update
        // Map materialDB tab to materialMasterDB2 collection
        const currentTab = window.currentMasterTab || 'masterDB';
        const collectionName = currentTab === 'materialDB' ? 'materialMasterDB2' : currentTab;
        
        const res = await fetch(BASE_URL + "uploadMasterImage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64,
            label: "main",
            recordId,
            username,
            collectionName: collectionName // Add collection name
          })
        });

        const result = await res.json();
        
        // Hide loading overlay
        hideMasterImageUploadLoading();
        
        if (!res.ok || !result.imageURL) throw new Error(result.error || "Image upload failed");

        alert(t('imageUploadedSuccessfully'));
        data.imageURL = result.imageURL;
        showMasterSidebar(data); // Refresh
      } catch (err) {
        // Hide loading overlay
        hideMasterImageUploadLoading();
        alert(t('imageUploadFailed'));
        console.error(err);
      }
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Closes the right-side master detail sidebar.
 */
function closeMasterSidebar() {
  const sidebar = document.getElementById("masterSidebar");
  if (sidebar) {
    sidebar.classList.add("translate-x-full");
  }
}

/**
 * Shows the image upload loading overlay with animated loader
 */
function showMasterImageUploadLoading() {
  // Remove existing overlay if present
  hideMasterImageUploadLoading();
  
  const overlay = document.createElement('div');
  overlay.id = 'masterImageUploadOverlay';
  overlay.className = 'fixed inset-0 bg-black bg-opacity-60 z-[60] flex flex-col items-center justify-center';
  overlay.innerHTML = `
    <div class="loader">
      <div class="circle">
        <div class="dot"></div>
        <div class="outline"></div>
      </div>
      <div class="circle">
        <div class="dot"></div>
        <div class="outline"></div>
      </div>
      <div class="circle">
        <div class="dot"></div>
        <div class="outline"></div>
      </div>
      <div class="circle">
        <div class="dot"></div>
        <div class="outline"></div>
      </div>
      <div class="circle">
        <div class="dot"></div>
        <div class="outline"></div>
      </div>
    </div>
    <p class="text-white text-lg font-semibold mt-6">Uploading image...</p>
  `;
  
  document.body.appendChild(overlay);
}

/**
 * Hides the image upload loading overlay
 */
function hideMasterImageUploadLoading() {
  const overlay = document.getElementById('masterImageUploadOverlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Handles uploading a new image for a master record.
 * @param {string} recordId - The record ID to update
 */
async function triggerMasterImageUpload(recordId) {
  const input = document.getElementById("masterImageUploadInput");
  input.click();

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    // Show loading overlay
    showMasterImageUploadLoading();

    const storageRef = firebase.storage().ref(); // Assuming Firebase is initialized
    const path = `masterImage/${recordId}_${Date.now()}_${file.name}`;
    const imageRef = storageRef.child(path);

    try {
      const snapshot = await imageRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();

      // Get current tab to determine which collection to update
      // Map materialDB tab to materialMasterDB2 collection
      const currentTab = window.currentMasterTab || 'masterDB';
      const collectionName = currentTab === 'materialDB' ? 'materialMasterDB2' : currentTab;

      // Save to masterDB record
      await fetch(BASE_URL + "/updateMasterRecord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          username: currentUser.username,
          updates: { imageURL: downloadURL },
          collectionName: collectionName // Add collection name
        })
      });

      // Hide loading overlay
      hideMasterImageUploadLoading();

      alert(t('imageUploadedSuccessfully'));
      // Reload data without switching tabs by calling loadMasterDB if available
      if (typeof loadMasterDB === 'function') {
        loadMasterDB();
      } else {
        loadPage("masterDB");
      }

    } catch (err) {
      // Hide loading overlay
      hideMasterImageUploadLoading();
      console.error("Firebase upload failed:", err);
      alert(t('uploadFailed'));
    }
  };
}

// Ensure master sidebar closes when clicking outside (desktop and mobile)
document.addEventListener("mousedown", function(event) {
  const sidebar = document.getElementById("masterSidebar");
  if (!sidebar || sidebar.classList.contains("translate-x-full")) return; // Sidebar not open
  if (!sidebar.contains(event.target)) {
    closeMasterSidebar();
  }
});