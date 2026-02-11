// Product PDFs Management (梱包 / 検査基準 / 3点総合)

let currentPDFType = '梱包'; // Default active sub-tab
let allProducts = []; // Cache of all products for filtering

// Initialize Product PDFs page
async function initProductPDFsPage() {
  console.log('📄 Initializing Product PDFs page...');
  
  const content = `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">製品資料管理 / Product PDFs</h2>
        <button onclick="openTrash()" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2">
          <i class="ri-delete-bin-line"></i>
          Trash
        </button>
      </div>

      <!-- Sub-tabs for PDF Types -->
      <div class="border-b border-gray-200 dark:border-gray-700">
        <nav class="-mb-px flex space-x-8">
          <button onclick="switchPDFType('梱包')" id="tab-梱包" class="pdf-type-tab border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600 dark:text-blue-400">
            梱包 (Packing)
          </button>
          <button onclick="switchPDFType('検査基準')" id="tab-検査基準" class="pdf-type-tab border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300">
            検査基準 (Inspection Standards)
          </button>
          <button onclick="switchPDFType('3点総合')" id="tab-3点総合" class="pdf-type-tab border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300">
            3点総合 (3-Point Comprehensive)
          </button>
        </nav>
      </div>

      <!-- Upload Section -->
      <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 class="text-base font-semibold mb-2 text-gray-900 dark:text-white">アップロード / Upload PDF</h3>
        
        <!-- Advanced Filters -->
        <div class="space-y-3 mb-3">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <!-- Filter Type Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter Type</label>
              <select id="filterType" onchange="handleFilterTypeChange()" class="w-full p-1.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
                <option value="model">モデル (Model)</option>
                <option value="sebanggo">背番号 (Serial Number)</option>
              </select>
            </div>

            <!-- Model Filter (shown by default) -->
            <div id="modelFilterContainer">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">モデル / Model</label>
              <select id="modelFilter" onchange="handleModelFilter()" class="w-full p-1.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
                <option value="">Select Model...</option>
              </select>
            </div>

            <!-- Sebanggo Multi-select (hidden by default) -->
            <div id="sebanggoFilterContainer" style="display: none;">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">背番号 / Serial Numbers</label>
              <button onclick="openSebanggoSelector()" class="w-full p-1.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white text-left">
                <span id="selectedCount">Select products...</span>
              </button>
            </div>

            <!-- Selected Products Display -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Selected Products</label>
                <button onclick="openSebanggoSelector()" class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                  Show all
                </button>
              </div>
              <div id="selectedProductsDisplay" class="p-1.5 border dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 h-8 overflow-y-auto">
                None selected
              </div>
            </div>
          </div>

          <!-- Selected Products Tags -->
          <div id="selectedProductsTags" class="flex flex-wrap gap-2 min-h-[1.5rem]"></div>
        </div>

        <!-- PDF Upload -->
        <div class="space-y-2">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              PDF File (will be converted to 1920x1080 image)
            </label>
            <input type="file" id="pdfFileInput" accept=".pdf" class="w-full p-1.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white" />
          </div>

          <button onclick="checkAndUploadPDF()" id="uploadBtn" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed">
            Upload PDF
          </button>

          <!-- Upload Progress -->
          <div id="uploadProgress" class="hidden">
            <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div id="uploadProgressBar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
            </div>
            <p id="uploadStatus" class="text-sm text-gray-600 dark:text-gray-400 mt-2"></p>
          </div>
        </div>
      </div>

      <!-- Uploaded PDFs List -->
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Uploaded PDFs</h3>
        <div id="pdfsList" class="space-y-4">
          <p class="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    </div>

    <!-- Sebanggo Selector Modal -->
    <div id="sebanggoSelectorModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div class="p-4 border-b dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">Select Products (背番号)</h3>
            <button onclick="closeSebanggoSelector()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <i class="ri-close-line text-2xl"></i>
            </button>
          </div>
          <input type="text" id="sebanggoSearch" oninput="filterSebanggoList()" placeholder="Search..." class="w-full mt-3 p-1.5 text-sm border dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white" />
        </div>
        <div class="p-3 overflow-y-auto max-h-[55vh]" id="sebanggoListContainer">
          <p class="text-gray-500">Loading products...</p>
        </div>
        <div class="p-4 border-t dark:border-gray-700 flex items-center justify-between gap-2">
          <div class="flex gap-2">
            <button onclick="checkAllSebanggo()" class="px-3 py-1.5 text-sm border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              Check all
            </button>
            <button onclick="uncheckAllSebanggo()" class="px-3 py-1.5 text-sm border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              Uncheck all
            </button>
          </div>
          <div class="flex gap-2">
            <button onclick="closeSebanggoSelector()" class="px-3 py-1.5 text-sm border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              Cancel
            </button>
            <button onclick="confirmSebanggoSelection()" class="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded">
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('mainContent').innerHTML = content;
  
  // Load products and initial data
  await loadAllProducts();
  await loadModels();
  await loadPDFsList();
}

// Switch between PDF types
function switchPDFType(type) {
  currentPDFType = type;
  
  // Update tab styles
  document.querySelectorAll('.pdf-type-tab').forEach(tab => {
    tab.classList.remove('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
    tab.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400');
  });
  
  const activeTab = document.getElementById(`tab-${type}`);
  activeTab.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400');
  activeTab.classList.add('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
  
  // Reload PDFs list
  loadPDFsList();
}

// Load all products from masterDB
async function loadAllProducts() {
  try {
    const response = await fetch(`${BASE_URL}queries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dbName: 'Sasaki_Coating_MasterDB',
        collectionName: 'masterDB',
        query: {},
        projection: { 背番号: 1, モデル: 1, 品番: 1 }
      })
    });
    
    allProducts = await response.json();
    console.log(`✅ Loaded ${allProducts.length} products`);
  } catch (error) {
    console.error('❌ Error loading products:', error);
  }
}

// Load unique models
async function loadModels() {
  const models = [...new Set(allProducts.map(p => p.モデル).filter(Boolean))].sort();
  const select = document.getElementById('modelFilter');
  
  select.innerHTML = '<option value="">Select Model...</option>';
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    select.appendChild(option);
  });
}

// Handle filter type change
function handleFilterTypeChange() {
  const filterType = document.getElementById('filterType').value;
  
  if (filterType === 'model') {
    document.getElementById('modelFilterContainer').style.display = 'block';
    document.getElementById('sebanggoFilterContainer').style.display = 'none';
  } else {
    document.getElementById('modelFilterContainer').style.display = 'none';
    document.getElementById('sebanggoFilterContainer').style.display = 'block';
  }
  
  // Clear selection
  selectedSebanggoArray = [];
  updateSelectedProductsDisplay();
}

// Handle model filter
function handleModelFilter() {
  const selectedModel = document.getElementById('modelFilter').value;
  
  if (selectedModel) {
    selectedSebanggoArray = allProducts
      .filter(p => p.モデル === selectedModel)
      .map(p => p.背番号);
    
    updateSelectedProductsDisplay();
  } else {
    selectedSebanggoArray = [];
    updateSelectedProductsDisplay();
  }
}

// Sebanggo selector
let selectedSebanggoArray = [];
let tempSelectedSebanggo = [];

function openSebanggoSelector() {
  tempSelectedSebanggo = [...selectedSebanggoArray];
  document.getElementById('sebanggoSelectorModal').classList.remove('hidden');
  renderSebanggoList();
}

function closeSebanggoSelector() {
  document.getElementById('sebanggoSelectorModal').classList.add('hidden');
}

function confirmSebanggoSelection() {
  selectedSebanggoArray = [...tempSelectedSebanggo];
  updateSelectedProductsDisplay();
  closeSebanggoSelector();
}

function renderSebanggoList() {
  const container = document.getElementById('sebanggoListContainer');
  const searchTerm = document.getElementById('sebanggoSearch').value.toLowerCase();
  const filterType = document.getElementById('filterType')?.value;
  const selectedModel = document.getElementById('modelFilter')?.value;
  
  const filteredProducts = allProducts.filter(p => {
    const matchesModel = !selectedModel || filterType !== 'model' || p.モデル === selectedModel;
    const matchesSearch =
      p.背番号?.toLowerCase().includes(searchTerm) ||
      p.品番?.toLowerCase().includes(searchTerm) ||
      p.モデル?.toLowerCase().includes(searchTerm);
    return matchesModel && matchesSearch;
  }).sort((a, b) => (a.背番号 || '').localeCompare(b.背番号 || ''));
  
  container.innerHTML = filteredProducts.map(product => {
    const isSelected = tempSelectedSebanggo.includes(product.背番号);
    return `
      <label class="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
        <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSebanggoSelection('${product.背番号}')" class="w-3.5 h-3.5" />
        <div class="flex-1">
          <div class="text-sm font-medium text-gray-900 dark:text-white">${product.背番号}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${product.品番 || ''} • ${product.モデル || ''}</div>
        </div>
      </label>
    `;
  }).join('');
}

function filterSebanggoList() {
  renderSebanggoList();
}

function toggleSebanggoSelection(sebanggo) {
  const index = tempSelectedSebanggo.indexOf(sebanggo);
  if (index > -1) {
    tempSelectedSebanggo.splice(index, 1);
  } else {
    tempSelectedSebanggo.push(sebanggo);
  }
}

function checkAllSebanggo() {
  tempSelectedSebanggo = getVisibleSebanggoList();
  renderSebanggoList();
}

function uncheckAllSebanggo() {
  tempSelectedSebanggo = [];
  renderSebanggoList();
}

function getVisibleSebanggoList() {
  const searchTerm = document.getElementById('sebanggoSearch').value.toLowerCase();
  const filterType = document.getElementById('filterType')?.value;
  const selectedModel = document.getElementById('modelFilter')?.value;

  return allProducts
    .filter(p => {
      const matchesModel = !selectedModel || filterType !== 'model' || p.モデル === selectedModel;
      const matchesSearch =
        p.背番号?.toLowerCase().includes(searchTerm) ||
        p.品番?.toLowerCase().includes(searchTerm) ||
        p.モデル?.toLowerCase().includes(searchTerm);
      return matchesModel && matchesSearch;
    })
    .map(p => p.背番号)
    .filter(Boolean);
}

function updateSelectedProductsDisplay() {
  const display = document.getElementById('selectedProductsDisplay');
  const tags = document.getElementById('selectedProductsTags');
  const count = document.getElementById('selectedCount');
  
  if (selectedSebanggoArray.length === 0) {
    display.textContent = 'None selected';
    tags.innerHTML = '';
    if (count) count.textContent = 'Select products...';
    return;
  }
  
  display.textContent = `${selectedSebanggoArray.length} products selected`;
  if (count) count.textContent = `${selectedSebanggoArray.length} selected`;
  
  // Show first 10 as tags
  tags.innerHTML = selectedSebanggoArray.slice(0, 10).map(sebanggo => `
    <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
      ${sebanggo}
      <button onclick="removeSebanggoFromSelection('${sebanggo}')" class="hover:text-blue-600">
        <i class="ri-close-line"></i>
      </button>
    </span>
  `).join('') + (selectedSebanggoArray.length > 10 ? `
    <button onclick="openSebanggoSelector()" class="text-gray-500 text-sm hover:text-gray-700 dark:hover:text-gray-300">
      +${selectedSebanggoArray.length - 10} more (Show all)
    </button>
  ` : '');
}

function removeSebanggoFromSelection(sebanggo) {
  selectedSebanggoArray = selectedSebanggoArray.filter(s => s !== sebanggo);
  updateSelectedProductsDisplay();
}

// Check for existing PDFs before upload
async function checkAndUploadPDF() {
  const fileInput = document.getElementById('pdfFileInput');
  
  if (!fileInput.files[0]) {
    alert('Please select a PDF file');
    return;
  }
  
  if (selectedSebanggoArray.length === 0) {
    alert('Please select at least one product');
    return;
  }
  
  // Check for existing PDFs
  try {
    const response = await fetch(`${BASE_URL}api/check-existing-pdfs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfType: currentPDFType,
        背番号Array: selectedSebanggoArray
      })
    });
    
    const conflicts = await response.json();
    
    if (conflicts.hasConflicts) {
      // Show conflict resolution modal
      showConflictModal(conflicts);
    } else {
      // No conflicts, proceed with upload
      uploadProductPDF();
    }
  } catch (error) {
    console.error('Error checking existing PDFs:', error);
    alert('Error checking for existing PDFs. Proceed anyway?') && uploadProductPDF();
  }
}

// Show conflict resolution modal
function showConflictModal(conflicts) {
  const { existing, newProducts, pdfType } = conflicts;
  
  const modal = document.createElement('div');
  modal.id = 'conflictModal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
  
  const existingHTML = existing.map(item => {
    const dates = item.pdfs.map(p => new Date(p.uploadedAt).toLocaleDateString('ja-JP')).join(', ');
    const count = item.pdfs.length;
    return `
      <div class="border-b dark:border-gray-700 py-3">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-semibold text-gray-900 dark:text-white">${item.背番号}</span>
            <span class="text-sm text-gray-500 dark:text-gray-400 ml-2">${count} existing PDF${count > 1 ? 's' : ''}</span>
          </div>
          ${count > 1 ? `
            <select id="action-${item.背番号}" class="text-sm border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-white">
              <option value="all">Overwrite all</option>
              <option value="newest">Overwrite newest only</option>
              <option value="skip">Skip this product</option>
            </select>
          ` : `
            <select id="action-${item.背番号}" class="text-sm border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-white">
              <option value="overwrite">Overwrite</option>
              <option value="skip">Skip this product</option>
            </select>
          `}
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">Uploaded: ${dates}</div>
      </div>
    `;
  }).join('');
  
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
      <div class="p-6 border-b dark:border-gray-700">
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">⚠️ Existing PDFs Detected</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
          <span class="font-semibold">${existing.length}</span> product(s) already have <span class="font-semibold">${pdfType}</span> PDFs.
          ${newProducts.length > 0 ? `Upload will apply to the remaining <span class="font-semibold">${newProducts.length}</span> product(s).` : ''}
        </p>
      </div>
      
      <div class="p-6 overflow-y-auto max-h-[50vh]">
        <h4 class="font-semibold text-gray-900 dark:text-white mb-3">Products with existing PDFs:</h4>
        ${existingHTML}
        
        ${newProducts.length > 0 ? `
          <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
            <h4 class="font-semibold text-blue-900 dark:text-blue-300 mb-2">New products (no conflicts):</h4>
            <div class="text-sm text-blue-800 dark:text-blue-400">${newProducts.join(', ')}</div>
          </div>
        ` : ''}
      </div>
      
      <div class="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
        <button onclick="closeConflictModal()" class="px-4 py-2 border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          Cancel
        </button>
        <button onclick="proceedWithConflictResolution()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
          Continue Upload
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function closeConflictModal() {
  const modal = document.getElementById('conflictModal');
  if (modal) modal.remove();
}

async function proceedWithConflictResolution() {
  // Collect user choices for each conflicted product
  const resolutions = {};
  const modal = document.getElementById('conflictModal');
  const selects = modal.querySelectorAll('select[id^="action-"]');
  
  selects.forEach(select => {
    const sebanggo = select.id.replace('action-', '');
    resolutions[sebanggo] = select.value;
  });
  
  closeConflictModal();
  
  // Proceed with upload, passing resolution choices
  uploadProductPDF(resolutions);
}

// Upload PDF
async function uploadProductPDF(resolutions = {}) {
  const fileInput = document.getElementById('pdfFileInput');
  const uploadBtn = document.getElementById('uploadBtn');
  const progress = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('uploadProgressBar');
  const status = document.getElementById('uploadStatus');
  
  if (!fileInput.files[0]) {
    alert('Please select a PDF file');
    return;
  }
  
  if (selectedSebanggoArray.length === 0) {
    alert('Please select at least one product');
    return;
  }
  
  uploadBtn.disabled = true;
  progress.classList.remove('hidden');
  status.textContent = 'Reading PDF file...';
  progressBar.style.width = '10%';
  
  try {
    const file = fileInput.files[0];
    
    // Read file as base64
    const reader = new FileReader();
    const pdfBase64 = await new Promise((resolve) => {
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
    
    status.textContent = 'Converting PDF to image (1920x1080)...';
    progressBar.style.width = '30%';
    
    // Convert PDF to image using pdf.js
    const imageBase64 = await convertPDFToImage(pdfBase64);
    
    status.textContent = 'Uploading PDF...';
    progressBar.style.width = '50%';
    
    // Upload PDF
    const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
    const uploadResponse = await fetch(`${BASE_URL}api/upload-product-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfType: currentPDFType,
        背番号Array: selectedSebanggoArray,
        pdfBase64,
        fileName: file.name,
        uploadedBy: currentUser.username || 'admin',
        resolutions: resolutions
      })
    });
    
    const uploadResult = await uploadResponse.json();
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Upload failed');
    }
    
    status.textContent = 'Uploading converted image...';
    progressBar.style.width = '70%';
    
    // Upload image
    await fetch(`${BASE_URL}api/upload-pdf-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: uploadResult.documentId,
        imageBase64,
        pdfType: currentPDFType
      })
    });
    
    status.textContent = 'Upload complete!';
    progressBar.style.width = '100%';
    
    setTimeout(() => {
      progress.classList.add('hidden');
      progressBar.style.width = '0%';
      fileInput.value = '';
      selectedSebanggoArray = [];
      updateSelectedProductsDisplay();
      loadPDFsList();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    status.textContent = `Error: ${error.message}`;
    alert(`Upload failed: ${error.message}`);
  } finally {
    uploadBtn.disabled = false;
  }
}

// Convert PDF to 1920x1080 image using PDF.js
async function convertPDFToImage(pdfBase64) {
  // Load PDF.js library if not already loaded
  if (typeof pdfjsLib === 'undefined') {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  
  const loadingTask = pdfjsLib.getDocument(pdfBase64);
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  
  // Calculate scale to fit 1920x1080
  const targetWidth = 1920;
  const targetHeight = 1080;
  const viewport = page.getViewport({ scale: 1.0 });
  const scale = Math.min(targetWidth / viewport.width, targetHeight / viewport.height);
  const scaledViewport = page.getViewport({ scale });
  
  // Render to canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  
  // Fill background with white
  context.fillStyle = 'white';
  context.fillRect(0, 0, targetWidth, targetHeight);
  
  // Center the PDF content
  const offsetX = (targetWidth - scaledViewport.width) / 2;
  const offsetY = (targetHeight - scaledViewport.height) / 2;
  
  context.translate(offsetX, offsetY);
  
  await page.render({
    canvasContext: context,
    viewport: scaledViewport
  }).promise;
  
  return canvas.toDataURL('image/jpeg', 0.95);
}

// Load script helper
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Load PDFs list
async function loadPDFsList() {
  const container = document.getElementById('pdfsList');
  container.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Loading...</p>';
  
  try {
    const response = await fetch(`${BASE_URL}api/product-pdfs-by-type/${currentPDFType}`);
    const pdfs = await response.json();
    
    if (pdfs.length === 0) {
      container.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No PDFs uploaded yet</p>';
      return;
    }
    
    container.innerHTML = pdfs.map(pdf => `
      <div class="border dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition">
        <div class="flex items-start gap-4">
          <!-- Thumbnail -->
          <div class="w-32 h-20 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
            ${pdf.imageURL ? `<img src="${pdf.imageURL}" alt="${pdf.fileName}" class="w-full h-full object-contain rounded" />` : '<i class="ri-file-pdf-line text-4xl text-gray-400"></i>'}
          </div>
          
          <!-- Info -->
          <div class="flex-1">
            <h4 class="font-semibold text-gray-900 dark:text-white">${pdf.fileName}</h4>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              ${pdf.背番号Array.length} products: ${pdf.背番号Array.slice(0, 5).join(', ')}${pdf.背番号Array.length > 5 ? '...' : ''}
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Uploaded by ${pdf.uploadedBy} on ${new Date(pdf.uploadedAt).toLocaleString('ja-JP')}
            </p>
          </div>
          
          <!-- Actions -->
          <div class="flex gap-2">
            <a href="${pdf.pdfURL}" target="_blank" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View Original PDF">
              <i class="ri-file-pdf-line text-xl"></i>
            </a>
            ${pdf.imageURL ? `<a href="${pdf.imageURL}" target="_blank" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View Image"><i class="ri-image-line text-xl"></i></a>` : ''}
            <button onclick="deletePDF('${pdf._id}')" class="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600 dark:text-red-400" title="Delete">
              <i class="ri-delete-bin-line text-xl"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('❌ Error loading PDFs:', error);
    container.innerHTML = '<p class="text-red-500">Error loading PDFs</p>';
  }
}

// Delete PDF
async function deletePDF(documentId) {
  if (!confirm('Are you sure you want to delete this PDF?')) return;
  
  try {
    const response = await fetch(`${BASE_URL}api/product-pdf/${documentId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      loadPDFsList();
    } else {
      alert('Failed to delete PDF');
    }
  } catch (error) {
    console.error('❌ Error deleting PDF:', error);
    alert('Error deleting PDF');
  }
}

// Trash Management
async function openTrash() {
  try {
    const response = await fetch(`${BASE_URL}api/product-pdfs-trash`);
    const trashedPDFs = await response.json();
    
    // Create trash modal
    const modal = document.createElement('div');
    modal.id = 'trashModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[85vh] overflow-hidden">
        <div class="p-6 border-b dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">🗑️ Trash</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">PDFs will be permanently deleted after 30 days</p>
          </div>
          <button onclick="closeTrash()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <i class="ri-close-line text-2xl"></i>
          </button>
        </div>
        <div class="p-6 overflow-y-auto max-h-[65vh]" id="trashContent">
          ${trashedPDFs.length === 0 ? '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Trash is empty</p>' : renderTrashItems(trashedPDFs)}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('❌ Error loading trash:', error);
    alert('Error loading trash');
  }
}

function closeTrash() {
  const modal = document.getElementById('trashModal');
  if (modal) modal.remove();
}

function renderTrashItems(items) {
  return `
    <div class="space-y-4">
      ${items.map(pdf => {
        const deletedDate = new Date(pdf.deletedAt);
        const daysAgo = Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, 30 - daysAgo);
        
        return `
          <div class="border dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition">
            <div class="flex items-start gap-4">
              <!-- Thumbnail -->
              <div class="w-32 h-20 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                ${pdf.imageURL ? `<img src="${pdf.imageURL}" alt="${pdf.fileName}" class="w-full h-full object-contain rounded" />` : '<i class="ri-file-pdf-line text-4xl text-gray-400"></i>'}
              </div>
              
              <!-- Info -->
              <div class="flex-1">
                <div class="flex items-start justify-between">
                  <div>
                    <h4 class="font-semibold text-gray-900 dark:text-white">${pdf.fileName}</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Type: <span class="font-medium">${pdf.pdfType}</span>
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      ${pdf.背番号Array.length} products: ${pdf.背番号Array.slice(0, 5).join(', ')}${pdf.背番号Array.length > 5 ? '...' : ''}
                    </p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Deleted ${daysAgo} days ago • ${daysLeft} days until permanent deletion
                    </p>
                  </div>
                  
                  <!-- Warning Badge -->
                  ${daysLeft <= 7 ? `
                    <span class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full">
                      ⚠️ ${daysLeft} days left
                    </span>
                  ` : ''}
                </div>
                
                <!-- Actions -->
                <div class="flex gap-2 mt-3">
                  <button onclick="recoverPDF('${pdf._id}')" class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">
                    <i class="ri-refresh-line"></i> Recover
                  </button>
                  <button onclick="permanentlyDeletePDF('${pdf._id}', '${pdf.fileName}')" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm">
                    <i class="ri-delete-bin-line"></i> Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function recoverPDF(documentId) {
  if (!confirm('Are you sure you want to recover this PDF?')) return;
  
  try {
    const response = await fetch(`${BASE_URL}api/product-pdf-recover/${documentId}`, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('PDF recovered successfully!');
      closeTrash();
      loadPDFsList(); // Refresh the main list
    } else {
      alert('Failed to recover PDF');
    }
  } catch (error) {
    console.error('❌ Error recovering PDF:', error);
    alert('Error recovering PDF');
  }
}

async function permanentlyDeletePDF(documentId, fileName) {
  if (!confirm(`⚠️ WARNING: This will permanently delete "${fileName}" from both MongoDB and Firebase Storage.\n\nThis action CANNOT be undone!\n\nAre you sure?`)) return;
  
  // Double confirmation for permanent deletion
  if (!confirm('Final confirmation: Delete permanently?')) return;
  
  try {
    const response = await fetch(`${BASE_URL}api/product-pdf-permanent/${documentId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('PDF permanently deleted from all locations');
      closeTrash();
      openTrash(); // Reopen trash to refresh
    } else {
      alert('Failed to permanently delete PDF');
    }
  } catch (error) {
    console.error('❌ Error permanently deleting PDF:', error);
    alert('Error permanently deleting PDF');
  }
}

// Export functions to global scope
window.initProductPDFsPage = initProductPDFsPage;
window.switchPDFType = switchPDFType;
window.handleFilterTypeChange = handleFilterTypeChange;
window.handleModelFilter = handleModelFilter;
window.openSebanggoSelector = openSebanggoSelector;
window.closeSebanggoSelector = closeSebanggoSelector;
window.confirmSebanggoSelection = confirmSebanggoSelection;
window.filterSebanggoList = filterSebanggoList;
window.toggleSebanggoSelection = toggleSebanggoSelection;
window.checkAllSebanggo = checkAllSebanggo;
window.uncheckAllSebanggo = uncheckAllSebanggo;
window.removeSebanggoFromSelection = removeSebanggoFromSelection;
window.checkAndUploadPDF = checkAndUploadPDF;
window.uploadProductPDF = uploadProductPDF;
window.closeConflictModal = closeConflictModal;
window.proceedWithConflictResolution = proceedWithConflictResolution;
window.deletePDF = deletePDF;
window.openTrash = openTrash;
window.closeTrash = closeTrash;
window.recoverPDF = recoverPDF;
window.permanentlyDeletePDF = permanentlyDeletePDF;
