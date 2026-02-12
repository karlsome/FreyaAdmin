// Product PDFs Management (梱包 / 検査基準 / 3点総合)

let currentPDFType = '梱包'; // Default active sub-tab
let allProducts = []; // Cache of all products for filtering
let pdfListPage = 1;
let pdfListLimit = 25;
let pdfListTotalPages = 1;
let trashPage = 1;
let trashLimit = 25;
let trashTotalPages = 1;
let trashItemsCache = [];
let pdfViewMode = 'grid';
let selectedPdfIds = new Set();
let currentPdfItems = [];
let pdfSearchQuery = '';
let pdfModelFilterValue = '';
let pdfSearchDebounce = null;
let pdfSearchTokens = [];
let pdfSortField = 'uploadedAt';
let pdfSortDir = 'desc';

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
            3点照合 (3-Point Comprehensive)
          </button>
        </nav>
      </div>

      <!-- Upload Section -->
      <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <button onclick="toggleUploadForm()" id="uploadToggleBtn" class="w-full flex items-center justify-between p-2 border dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300">
          <span class="text-sm font-medium">PDF アップロード</span>
          <i id="uploadToggleIcon" class="ri-arrow-down-s-line text-xl"></i>
        </button>
        
        <!-- Upload Form (hidden by default) -->
        <div id="uploadFormContainer" class="hidden mt-4">
        
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
            <button onclick="clearPdfSelection('pdfFileInput')" class="mt-2 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
              Clear selected file
            </button>
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

        <!-- Bulk Upload -->
        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bulk PDF Upload (match by filename)
            </label>
            <input type="file" id="bulkPdfInput" accept=".pdf" multiple class="w-full p-1.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white" />
            <button onclick="clearPdfSelection('bulkPdfInput')" class="mt-2 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
              Clear selected files
            </button>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Matches selected 背番号 by filename (e.g., 310D C74.pdf contains C74)
            </p>
          </div>
          <button onclick="reviewBulkUpload()" id="bulkMatchBtn" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed">
            Match & Review
          </button>
          <div id="bulkUploadProgress" class="hidden">
            <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div id="bulkUploadProgressBar" class="bg-indigo-600 h-2.5 rounded-full" style="width: 0%"></div>
            </div>
            <p id="bulkUploadStatus" class="text-sm text-gray-600 dark:text-gray-400 mt-2"></p>
          </div>
        </div>
        </div>
      </div>

      <!-- Uploaded PDFs List -->
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Uploaded PDFs</h3>
          <div class="flex items-center gap-2">
            <button onclick="setPDFViewMode('grid')" id="pdfViewGrid" class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Grid view">
              <i class="ri-layout-grid-line text-lg"></i>
            </button>
            <button onclick="setPDFViewMode('list')" id="pdfViewList" class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="List view">
              <i class="ri-list-unordered text-lg"></i>
            </button>
          </div>
        </div>
        <div class="flex flex-wrap gap-4 mb-4">
          <div id="pdfSearchContainer" class="p-2 border rounded flex flex-wrap items-center gap-2 flex-1 min-w-64">
            <div id="pdfSearchTags" class="flex flex-wrap gap-2"></div>
            <input type="text" id="pdfSearchInput" oninput="handlePdfSearchInput()" onkeydown="handlePdfSearchKeydown(event)" placeholder="背番号、品番、モデルで検索..." class="outline-none flex-1 min-w-[8rem] bg-transparent" />
          </div>
          <select id="pdfModelFilter" onchange="handlePdfModelFilter()" class="p-2 border rounded">
            <option value="">All Models</option>
          </select>
        </div>
        <div id="pdfsList" class="space-y-4">
          <p class="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
        <div id="pdfPagination" class="mt-4"></div>
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
  setPDFViewMode(pdfViewMode, true);
  
  // Load products and initial data
  await loadAllProducts();
  await loadModels();
  await loadPDFsList();
}

// Switch between PDF types
function switchPDFType(type) {
  currentPDFType = type;
  pdfListPage = 1;
  selectedPdfIds = new Set();
  
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

// Toggle upload form visibility
function toggleUploadForm() {
  const container = document.getElementById('uploadFormContainer');
  const icon = document.getElementById('uploadToggleIcon');
  
  if (container.classList.contains('hidden')) {
    container.classList.remove('hidden');
    icon.classList.remove('ri-arrow-down-s-line');
    icon.classList.add('ri-arrow-up-s-line');
  } else {
    container.classList.add('hidden');
    icon.classList.remove('ri-arrow-up-s-line');
    icon.classList.add('ri-arrow-down-s-line');
  }
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
  const pdfSelect = document.getElementById('pdfModelFilter');
  
  select.innerHTML = '<option value="">Select Model...</option>';
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    select.appendChild(option);
  });

  if (pdfSelect) {
    pdfSelect.innerHTML = '<option value="">All Models</option>';
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      pdfSelect.appendChild(option);
    });
  }
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
let conflictProceedHandler = null;

function clearPdfSelection(inputId) {
  const input = document.getElementById(inputId);
  if (input) input.value = '';
}

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
function showConflictModal(conflicts, onProceed) {
  const { existing, newProducts, pdfType } = conflicts;
  conflictProceedHandler = typeof onProceed === 'function' ? onProceed : null;
  
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

  if (conflictProceedHandler) {
    const handler = conflictProceedHandler;
    conflictProceedHandler = null;
    handler(resolutions);
  } else {
    // Proceed with upload, passing resolution choices
    uploadProductPDF(resolutions);
  }
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

// Bulk upload: match filenames to selected 背番号
let bulkMatchCache = null;

function reviewBulkUpload() {
  const fileInput = document.getElementById('bulkPdfInput');
  const files = Array.from(fileInput.files || []);

  if (files.length === 0) {
    alert('Please select PDF files for bulk upload');
    return;
  }

  if (selectedSebanggoArray.length === 0) {
    alert('Please select at least one product before bulk upload');
    return;
  }

  bulkMatchCache = buildBulkMatch(files, selectedSebanggoArray);
  showBulkMatchModal(bulkMatchCache);
}

function buildBulkMatch(files, sebanggoList) {
  const matched = [];
  const toAssign = [];
  const matchedSebanggo = new Set();

  files.forEach(file => {
    const matches = findSebanggoMatches(file.name, sebanggoList);
    if (matches.length === 1) {
      matched.push({ file, sebanggo: matches[0] });
      matchedSebanggo.add(matches[0]);
    } else {
      toAssign.push({ file, candidates: matches });
    }
  });

  const unassignedSebanggo = sebanggoList.filter(s => !matchedSebanggo.has(s));

  return {
    matched,
    toAssign,
    unassignedSebanggo
  };
}

function findSebanggoMatches(fileName, sebanggoList) {
  const upperName = String(fileName || '').toUpperCase();
  return sebanggoList.filter(sebanggo => {
    if (!sebanggo) return false;
    return upperName.includes(String(sebanggo).toUpperCase());
  });
}

function showBulkMatchModal(matchData) {
  const { matched, toAssign, unassignedSebanggo } = matchData;
  const total = matched.length + toAssign.length;

  const modal = document.createElement('div');
  modal.id = 'bulkMatchModal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';

  const matchedHTML = matched.length === 0
    ? '<p class="text-sm text-gray-500 dark:text-gray-400">No automatic matches found.</p>'
    : matched.map(item => `
      <div class="flex items-center justify-between py-2 border-b dark:border-gray-700">
        <div class="text-sm text-gray-900 dark:text-white">${item.file.name}</div>
        <div class="text-sm font-semibold text-green-700 dark:text-green-300">${item.sebanggo}</div>
      </div>
    `).join('');

  const assignHTML = toAssign.length === 0
    ? '<p class="text-sm text-gray-500 dark:text-gray-400">No unmatched files.</p>'
    : toAssign.map((item, index) => {
      const candidates = item.candidates.length > 0 ? `Candidates: ${item.candidates.join(', ')}` : 'No filename match';
      const options = ['<option value="">Skip this file</option>']
        .concat(selectedSebanggoArray.map(s => `<option value="${s}">${s}</option>`))
        .join('');
      return `
        <div class="py-2 border-b dark:border-gray-700">
          <div class="text-sm text-gray-900 dark:text-white">${item.file.name}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${candidates}</div>
          <select data-assign-index="${index}" class="mt-2 w-full p-1.5 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white text-sm">
            ${options}
          </select>
        </div>
      `;
    }).join('');

  const unassignedHTML = unassignedSebanggo.length === 0
    ? '<p class="text-sm text-gray-500 dark:text-gray-400">All selected 背番号 have a file match.</p>'
    : `<p class="text-sm text-gray-700 dark:text-gray-300">${unassignedSebanggo.join(', ')}</p>`;

  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden">
      <div class="p-5 border-b dark:border-gray-700 flex items-start justify-between">
        <div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Bulk Upload Match Summary</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total files: <span class="font-semibold">${total}</span> • Matched: <span class="font-semibold text-green-700 dark:text-green-300">${matched.length}</span> • Unmatched: <span class="font-semibold text-yellow-700 dark:text-yellow-300">${toAssign.length}</span>
          </p>
        </div>
        <button onclick="closeBulkMatchModal()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <i class="ri-close-line text-2xl"></i>
        </button>
      </div>

      <div class="p-5 overflow-y-auto max-h-[60vh] space-y-4">
        <div>
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Matched Files</h4>
          <div class="border dark:border-gray-700 rounded p-3 bg-gray-50 dark:bg-gray-900">
            ${matchedHTML}
          </div>
        </div>

        <div>
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Unmatched Files (manual assign)</h4>
          <div class="border dark:border-gray-700 rounded p-3">
            ${assignHTML}
          </div>
        </div>

        <div>
          <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Selected 背番号 Without a File</h4>
          <div class="border dark:border-gray-700 rounded p-3 bg-gray-50 dark:bg-gray-900">
            ${unassignedHTML}
          </div>
        </div>
      </div>

      <div class="p-5 border-t dark:border-gray-700 flex justify-end gap-3">
        <button onclick="closeBulkMatchModal()" class="px-4 py-2 border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          Cancel
        </button>
        <button onclick="confirmBulkUpload()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded">
          Confirm Upload
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function closeBulkMatchModal() {
  const modal = document.getElementById('bulkMatchModal');
  if (modal) modal.remove();
}

async function confirmBulkUpload() {
  const modal = document.getElementById('bulkMatchModal');
  if (!modal || !bulkMatchCache) return;

  const assignments = [...bulkMatchCache.matched.map(item => ({
    file: item.file,
    sebanggo: item.sebanggo
  }))];

  const selects = modal.querySelectorAll('select[data-assign-index]');
  selects.forEach(select => {
    const index = Number(select.getAttribute('data-assign-index'));
    const sebanggo = select.value;
    const file = bulkMatchCache.toAssign[index]?.file;
    if (sebanggo && file) {
      assignments.push({ file, sebanggo });
    }
  });

  closeBulkMatchModal();

  if (assignments.length === 0) {
    alert('No files assigned for upload');
    return;
  }

  await checkBulkConflictsAndUpload(assignments);
}

async function checkBulkConflictsAndUpload(assignments) {
  const sebanggoArray = assignments.map(item => item.sebanggo);

  try {
    const response = await fetch(`${BASE_URL}api/check-existing-pdfs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfType: currentPDFType,
        背番号Array: sebanggoArray
      })
    });

    const conflicts = await response.json();

    if (conflicts.hasConflicts) {
      showConflictModal(conflicts, (resolutions) => {
        proceedBulkUploadWithResolutions(assignments, resolutions);
      });
      return;
    }
  } catch (error) {
    console.error('Error checking existing PDFs (bulk):', error);
  }

  proceedBulkUploadWithResolutions(assignments, {});
}

async function proceedBulkUploadWithResolutions(assignments, resolutions) {
  const filteredAssignments = assignments.filter(item => resolutions[item.sebanggo] !== 'skip');
  if (filteredAssignments.length === 0) {
    alert('All matched products were skipped');
    return;
  }

  await uploadBulkAssignments(filteredAssignments, resolutions);
}

async function uploadBulkAssignments(assignments, resolutions = {}) {
  const progress = document.getElementById('bulkUploadProgress');
  const progressBar = document.getElementById('bulkUploadProgressBar');
  const status = document.getElementById('bulkUploadStatus');
  const bulkBtn = document.getElementById('bulkMatchBtn');

  bulkBtn.disabled = true;
  progress.classList.remove('hidden');
  progressBar.style.width = '0%';

  let successCount = 0;
  const failures = [];

  for (let i = 0; i < assignments.length; i += 1) {
    const { file, sebanggo } = assignments[i];
    status.textContent = `Uploading ${i + 1}/${assignments.length}: ${file.name}`;
    progressBar.style.width = `${Math.round((i / assignments.length) * 100)}%`;

    try {
      const resolution = resolutions[sebanggo];
      const resolutionMap = resolution ? { [sebanggo]: resolution } : {};
      await uploadSinglePDFFile(file, [sebanggo], resolutionMap);
      successCount += 1;
    } catch (error) {
      failures.push({ fileName: file.name, error: error.message });
    }
  }

  progressBar.style.width = '100%';
  status.textContent = `Bulk upload complete. Success: ${successCount}, Failed: ${failures.length}`;

  setTimeout(() => {
    progress.classList.add('hidden');
    progressBar.style.width = '0%';
    const bulkInput = document.getElementById('bulkPdfInput');
    if (bulkInput) bulkInput.value = '';
    bulkBtn.disabled = false;
    loadPDFsList();
  }, 2000);

  if (failures.length > 0) {
    console.error('❌ Bulk upload failures:', failures);
    alert(`Some files failed to upload: ${failures.length}`);
  }
}

async function uploadSinglePDFFile(file, sebanggoArray, resolutions = {}) {
  const pdfBase64 = await readFileAsDataUrl(file);
  const imageBase64 = await convertPDFToImage(pdfBase64);
  const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');

  const uploadResponse = await fetch(`${BASE_URL}api/upload-product-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pdfType: currentPDFType,
      背番号Array: sebanggoArray,
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

  const imageResponse = await fetch(`${BASE_URL}api/upload-pdf-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentId: uploadResult.documentId,
      imageBase64,
      pdfType: currentPDFType
    })
  });

  const imageResult = await imageResponse.json();
  if (!imageResult.success) {
    throw new Error(imageResult.error || 'Image upload failed');
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
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
  const pagination = document.getElementById('pdfPagination');
  container.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Loading...</p>';
  if (pagination) pagination.innerHTML = '';
  
  try {
    const includeHinban = pdfViewMode === 'list' || pdfViewMode === 'grid' ? '&includeHinban=1' : '';
    const searchParam = pdfSearchQuery ? `&q=${encodeURIComponent(pdfSearchQuery)}` : '';
    const modelParam = pdfModelFilterValue ? `&model=${encodeURIComponent(pdfModelFilterValue)}` : '';
    const sortParam = pdfViewMode === 'list'
      ? `&sortField=${encodeURIComponent(pdfSortField)}&sortDir=${encodeURIComponent(pdfSortDir)}`
      : '';
    const response = await fetch(`${BASE_URL}api/product-pdfs-by-type/${currentPDFType}?page=${pdfListPage}&limit=${pdfListLimit}${includeHinban}${searchParam}${modelParam}${sortParam}`);
    const data = await response.json();
    const pdfs = Array.isArray(data) ? data : (data.items || []);
    const meta = Array.isArray(data) ? {
      page: 1,
      limit: pdfs.length,
      total: pdfs.length,
      totalPages: 1
    } : data;
    pdfListTotalPages = meta.totalPages || 1;
    
    currentPdfItems = pdfs;
    selectedPdfIds = new Set();

    if (pdfs.length === 0) {
      container.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No PDFs uploaded yet</p>';
      renderPDFPagination(meta);
      return;
    }
    
    container.innerHTML = pdfViewMode === 'list'
      ? renderPDFListView(pdfs)
      : renderPDFGridView(pdfs);

    renderPDFPagination(meta);
    
  } catch (error) {
    console.error('❌ Error loading PDFs:', error);
    container.innerHTML = '<p class="text-red-500">Error loading PDFs</p>';
    if (pagination) pagination.innerHTML = '';
  }
}

function handlePdfSearchInput() {
  const input = document.getElementById('pdfSearchInput');
  const nextValue = input?.value || '';
  updatePdfSearchQuery(nextValue);
}

function handlePdfSearchKeydown(event) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    const input = document.getElementById('pdfSearchInput');
    const value = input?.value || '';
    const tokens = value.split(/[\s,]+/).filter(Boolean);
    if (tokens.length === 0) return;

    tokens.forEach(token => addPdfSearchToken(token));
    if (input) input.value = '';
    updatePdfSearchQuery('');
    return;
  }

  if (event.key === 'Backspace') {
    const input = document.getElementById('pdfSearchInput');
    if (input && input.value === '' && pdfSearchTokens.length > 0) {
      pdfSearchTokens.pop();
      renderPdfSearchTags();
      updatePdfSearchQuery('');
    }
  }
}

function addPdfSearchToken(token) {
  const normalized = token.trim();
  if (!normalized) return;
  if (pdfSearchTokens.includes(normalized)) return;
  pdfSearchTokens.push(normalized);
  renderPdfSearchTags();
}

function removePdfSearchToken(token) {
  pdfSearchTokens = pdfSearchTokens.filter(t => t !== token);
  renderPdfSearchTags();
  updatePdfSearchQuery(document.getElementById('pdfSearchInput')?.value || '');
}

function renderPdfSearchTags() {
  const container = document.getElementById('pdfSearchTags');
  if (!container) return;
  container.innerHTML = pdfSearchTokens.map(token => `
    <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
      ${token}
      <button type="button" class="text-blue-600 hover:text-blue-800" onclick="removePdfSearchToken('${token}')">×</button>
    </span>
  `).join('');
}

function updatePdfSearchQuery(currentInput) {
  const parts = [...pdfSearchTokens];
  const trimmed = String(currentInput || '').trim();
  if (trimmed) parts.push(trimmed);
  pdfSearchQuery = parts.join(' ');
  pdfListPage = 1;

  if (pdfSearchDebounce) {
    clearTimeout(pdfSearchDebounce);
  }

  pdfSearchDebounce = setTimeout(() => {
    loadPDFsList();
  }, 300);
}

function handlePdfModelFilter() {
  const select = document.getElementById('pdfModelFilter');
  pdfModelFilterValue = select?.value || '';
  pdfListPage = 1;
  loadPDFsList();
}

function renderPDFGridView(pdfs) {
  const allSelected = currentPdfItems.length > 0 && selectedPdfIds.size === currentPdfItems.length;
  const selectedCount = selectedPdfIds.size;
  const disabledAttr = selectedCount === 0 ? 'disabled' : '';
  const disabledClass = selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : '';

  return `
    <div class="flex items-center justify-between mb-2 text-sm text-gray-600 dark:text-gray-400">
      <div class="flex items-center gap-2">
        <input type="checkbox" ${allSelected ? 'checked' : ''} onchange="togglePdfSelectAll(this)" />
        <span>${selectedCount} selected</span>
      </div>
      <button onclick="deleteSelectedPDFs()" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs ${disabledClass}" ${disabledAttr}>
        Delete Selected
      </button>
    </div>
    <div class="space-y-4">
      ${pdfs.map(pdf => {
        const checked = selectedPdfIds.has(pdf._id) ? 'checked' : '';
        return `
          <div class="relative border dark:border-gray-700 rounded-lg p-2 hover:shadow-lg transition cursor-pointer" onclick="${pdf.imageURL ? `previewPDFImage('${pdf.imageURL}', '${pdf.背番号Array.join(', ')}', '${pdf.fileName}')` : ''}">
            <div class="absolute top-2 left-2" onclick="event.stopPropagation()">
              <input type="checkbox" ${checked} onchange="togglePdfSelection('${pdf._id}')" />
            </div>
            <div class="flex items-start gap-3 pl-6">
              <!-- Thumbnail -->
              <div class="w-24 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                ${pdf.imageURL ? `<img src="${pdf.imageURL}" alt="${pdf.fileName}" class="w-full h-full object-contain rounded" />` : '<i class="ri-file-pdf-line text-3xl text-gray-400"></i>'}
              </div>
              
              <!-- Info -->
              <div class="flex-1">
                <h4 class="text-sm font-bold text-gray-900 dark:text-white">
                  ${pdf.背番号Array.slice(0, 8).join(', ')}${pdf.背番号Array.length > 8 ? ` +${pdf.背番号Array.length - 8} more` : ''}
                </h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  ${Array.isArray(pdf.hinbanList) && pdf.hinbanList.length
                    ? pdf.hinbanList.map(h => h.品番).filter(Boolean).slice(0, 6).join(', ')
                    : '-'
                  }
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  ${pdf.fileName}
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  ${pdf.uploadedBy} • ${formatDateTime(pdf.uploadedAt)}
                </p>
              </div>
              
              <!-- Actions -->
              <div class="flex gap-2" onclick="event.stopPropagation()">
                <a href="${pdf.pdfURL}" target="_blank" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View Original PDF">
                  <i class="ri-file-pdf-line text-xl"></i>
                </a>
                ${pdf.imageURL ? `<a href="${pdf.imageURL}" target="_blank" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Open in New Tab"><i class="ri-external-link-line text-xl"></i></a>` : ''}
                <button onclick="deletePDF('${pdf._id}')" class="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600 dark:text-red-400" title="Delete">
                  <i class="ri-delete-bin-line text-xl"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderPDFListView(pdfs) {
  const selectedCount = selectedPdfIds.size;
  const allSelected = currentPdfItems.length > 0 && selectedPdfIds.size === currentPdfItems.length;
  const disabledAttr = selectedCount === 0 ? 'disabled' : '';
  const disabledClass = selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : '';
  return `
    <div class="flex items-center justify-between mb-2 text-sm text-gray-600 dark:text-gray-400">
      <span>${selectedCount} selected</span>
      <button onclick="deleteSelectedPDFs()" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs ${disabledClass}" ${disabledAttr}>
        Delete Selected
      </button>
    </div>
    <div class="overflow-x-auto border dark:border-gray-700 rounded">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
          <tr>
            <th class="px-3 py-2 text-left">
              <input type="checkbox" ${allSelected ? 'checked' : ''} onchange="togglePdfSelectAll(this)" />
            </th>
            <th class="px-3 py-2 text-left cursor-pointer select-none" onclick="togglePdfSort('sebanggo')">
              背番号 ${getPdfSortIcon('sebanggo')}
            </th>
            <th class="px-3 py-2 text-left cursor-pointer select-none" onclick="togglePdfSort('hinban')">
              品番 ${getPdfSortIcon('hinban')}
            </th>
            <th class="px-3 py-2 text-left cursor-pointer select-none" onclick="togglePdfSort('fileName')">
              File ${getPdfSortIcon('fileName')}
            </th>
            <th class="px-3 py-2 text-left cursor-pointer select-none" onclick="togglePdfSort('uploader')">
              Uploader ${getPdfSortIcon('uploader')}
            </th>
            <th class="px-3 py-2 text-left cursor-pointer select-none" onclick="togglePdfSort('uploadedAt')">
              Uploaded ${getPdfSortIcon('uploadedAt')}
            </th>
            <th class="px-3 py-2 text-left cursor-pointer select-none" onclick="togglePdfSort('updatedAt')">
              Updated ${getPdfSortIcon('updatedAt')}
            </th>
            <th class="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y dark:divide-gray-700">
          ${pdfs.map(pdf => {
            const sebanggoText = pdf.背番号Array?.length
              ? `${pdf.背番号Array.slice(0, 6).join(', ')}${pdf.背番号Array.length > 6 ? ` +${pdf.背番号Array.length - 6} more` : ''}`
              : '-';
            const hinbanText = Array.isArray(pdf.hinbanList) && pdf.hinbanList.length
              ? pdf.hinbanList.map(h => h.品番).filter(Boolean).slice(0, 6).join(', ')
              : '-';
            const checked = selectedPdfIds.has(pdf._id) ? 'checked' : '';
            return `
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td class="px-3 py-2">
                  <input type="checkbox" ${checked} onchange="togglePdfSelection('${pdf._id}')" />
                </td>
                <td class="px-3 py-2 font-semibold text-gray-900 dark:text-white">${sebanggoText}</td>
                <td class="px-3 py-2 text-gray-600 dark:text-gray-300">${hinbanText}</td>
                <td class="px-3 py-2 text-gray-600 dark:text-gray-300">${pdf.fileName}</td>
                <td class="px-3 py-2 text-gray-600 dark:text-gray-300">${pdf.uploadedBy || '-'}</td>
                <td class="px-3 py-2 text-gray-600 dark:text-gray-300">${formatDateTime(pdf.uploadedAt)}</td>
                <td class="px-3 py-2 text-gray-600 dark:text-gray-300">${formatDateTime(pdf.updatedAt || pdf.uploadedAt)}</td>
                <td class="px-3 py-2 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <a href="${pdf.pdfURL}" target="_blank" class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View Original PDF">
                      <i class="ri-file-pdf-line"></i>
                    </a>
                    ${pdf.imageURL ? `<a href="${pdf.imageURL}" target="_blank" class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Open in New Tab"><i class="ri-external-link-line"></i></a>` : ''}
                    <button onclick="deletePDF('${pdf._id}')" class="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600 dark:text-red-400" title="Delete">
                      <i class="ri-delete-bin-line"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function setPDFViewMode(mode, skipReload = false) {
  pdfViewMode = mode;
  const gridBtn = document.getElementById('pdfViewGrid');
  const listBtn = document.getElementById('pdfViewList');
  if (gridBtn && listBtn) {
    gridBtn.classList.toggle('bg-gray-100', mode === 'grid');
    gridBtn.classList.toggle('dark:bg-gray-700', mode === 'grid');
    listBtn.classList.toggle('bg-gray-100', mode === 'list');
    listBtn.classList.toggle('dark:bg-gray-700', mode === 'list');
  }
  pdfListPage = 1;
  selectedPdfIds = new Set();
  if (!skipReload) {
    loadPDFsList();
  }
}

function togglePdfSort(field) {
  if (pdfSortField === field) {
    pdfSortDir = pdfSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    pdfSortField = field;
    pdfSortDir = 'asc';
  }
  pdfListPage = 1;
  loadPDFsList();
}

function getPdfSortIcon(field) {
  if (pdfSortField !== field) {
    return '<i class="ri-arrow-up-down-line ml-1 text-xs opacity-50"></i>';
  }

  return pdfSortDir === 'asc'
    ? '<i class="ri-arrow-up-s-line ml-1 text-xs"></i>'
    : '<i class="ri-arrow-down-s-line ml-1 text-xs"></i>';
}

function togglePdfSelection(id) {
  if (selectedPdfIds.has(id)) {
    selectedPdfIds.delete(id);
  } else {
    selectedPdfIds.add(id);
  }
  renderCurrentPdfView();
}

function togglePdfSelectAll(checkbox) {
  if (checkbox.checked) {
    selectedPdfIds = new Set(currentPdfItems.map(item => item._id));
  } else {
    selectedPdfIds = new Set();
  }
  renderCurrentPdfView();
}

function renderCurrentPdfView() {
  const container = document.getElementById('pdfsList');
  if (!container) return;
  container.innerHTML = pdfViewMode === 'list'
    ? renderPDFListView(currentPdfItems)
    : renderPDFGridView(currentPdfItems);
}

async function deleteSelectedPDFs() {
  if (selectedPdfIds.size === 0) {
    alert('No PDFs selected');
    return;
  }

  if (!confirm(`Delete ${selectedPdfIds.size} PDF(s)?`)) return;

  try {
    const response = await fetch(`${BASE_URL}api/product-pdf-batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentIds: Array.from(selectedPdfIds) })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Batch delete failed');
    }

    selectedPdfIds = new Set();
    loadPDFsList();
  } catch (error) {
    console.error('❌ Error batch deleting PDFs:', error);
    alert('Error deleting selected PDFs');
  }
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderPDFPagination(meta) {
  const container = document.getElementById('pdfPagination');
  if (!container) return;

  const page = meta?.page || 1;
  const limit = meta?.limit || pdfListLimit;
  const total = meta?.total || 0;
  const totalPages = meta?.totalPages || 1;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const prevDisabled = page <= 1 ? 'opacity-50 pointer-events-none' : '';
  const nextDisabled = page >= totalPages ? 'opacity-50 pointer-events-none' : '';

  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
      <div class="flex items-center gap-3">
        <span>Showing ${start}-${end} of ${total}</span>
        <label class="flex items-center gap-2">
          <span>Per page</span>
          <select id="pdfPageSize" onchange="changePDFPageSize()" class="p-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
            ${[10, 25, 50, 100].map(size => `<option value="${size}" ${size === limit ? 'selected' : ''}>${size}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="changePDFPage(${page - 1})" class="px-2 py-1 border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${prevDisabled}">
          Prev
        </button>
        <span>Page ${page} / ${totalPages}</span>
        <button onclick="changePDFPage(${page + 1})" class="px-2 py-1 border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${nextDisabled}">
          Next
        </button>
      </div>
    </div>
  `;
}

function changePDFPage(nextPage) {
  if (nextPage < 1 || nextPage > pdfListTotalPages) return;
  pdfListPage = nextPage;
  loadPDFsList();
}

function changePDFPageSize() {
  const select = document.getElementById('pdfPageSize');
  const nextLimit = parseInt(select?.value, 10) || 25;
  pdfListLimit = nextLimit;
  pdfListPage = 1;
  loadPDFsList();
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
    trashPage = 1;

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
          <div class="flex items-center gap-2">
            <button onclick="recoverAllTrash()" class="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded">
              Recover All
            </button>
            <button onclick="deleteAllTrash()" class="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded">
              Delete All
            </button>
            <button onclick="closeTrash()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <i class="ri-close-line text-2xl"></i>
            </button>
          </div>
        </div>
        <div class="p-6 overflow-y-auto max-h-[60vh]" id="trashContent">
          <p class="text-gray-500 dark:text-gray-400 text-center py-8">Loading...</p>
        </div>
        <div class="px-6 pb-6" id="trashPagination"></div>
      </div>
    `;
    
    document.body.appendChild(modal);
    loadTrashPage();
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
  if (!Array.isArray(items) || items.length === 0) {
    return '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Trash is empty</p>';
  }

  return `
    <div class="space-y-3">
      ${items.map(pdf => {
        const deletedDate = new Date(pdf.deletedAt);
        const daysAgo = Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, 30 - daysAgo);
        const title = pdf.背番号Array?.length
          ? `${pdf.背番号Array.slice(0, 8).join(', ')}${pdf.背番号Array.length > 8 ? ` +${pdf.背番号Array.length - 8} more` : ''}`
          : 'Unknown';
        
        return `
          <div class="border dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition">
            <div class="flex items-start gap-3">
              <!-- Thumbnail -->
              <div class="w-24 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                ${pdf.imageURL ? `<img src="${pdf.imageURL}" alt="${pdf.fileName}" class="w-full h-full object-contain rounded" />` : '<i class="ri-file-pdf-line text-4xl text-gray-400"></i>'}
              </div>
              
              <!-- Info -->
              <div class="flex-1">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white">${title}</h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${pdf.fileName}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Type: <span class="font-medium">${pdf.pdfType}</span>
                    </p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
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
                <div class="flex gap-2 mt-2">
                  <button onclick="recoverPDF('${pdf._id}')" class="px-2.5 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded">
                    <i class="ri-refresh-line"></i> Recover
                  </button>
                  <button onclick="permanentlyDeletePDF('${pdf._id}', '${pdf.fileName}')" class="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded">
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

async function loadTrashPage() {
  const content = document.getElementById('trashContent');
  const pagination = document.getElementById('trashPagination');
  if (!content) return;

  content.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Loading...</p>';
  if (pagination) pagination.innerHTML = '';

  try {
    const response = await fetch(`${BASE_URL}api/product-pdfs-trash?page=${trashPage}&limit=${trashLimit}`);
    const data = await response.json();
    const items = Array.isArray(data) ? data : (data.items || []);
    const meta = Array.isArray(data) ? {
      page: 1,
      limit: items.length,
      total: items.length,
      totalPages: 1
    } : data;

    trashTotalPages = meta.totalPages || 1;
    trashItemsCache = items;
    content.innerHTML = renderTrashItems(items);
    renderTrashPagination(meta);
  } catch (error) {
    console.error('❌ Error loading trash:', error);
    content.innerHTML = '<p class="text-red-500 text-center py-8">Error loading trash</p>';
    if (pagination) pagination.innerHTML = '';
  }
}

async function recoverAllTrash() {
  if (!trashItemsCache.length) {
    alert('Trash is empty');
    return;
  }

  if (!confirm(`Recover all ${trashItemsCache.length} items?`)) return;

  try {
    for (const item of trashItemsCache) {
      await fetch(`${BASE_URL}api/product-pdf-recover/${item._id}`, { method: 'POST' });
    }
    loadTrashPage();
    loadPDFsList();
  } catch (error) {
    console.error('❌ Error recovering all trash items:', error);
    alert('Error recovering all items');
  }
}

async function deleteAllTrash() {
  if (!trashItemsCache.length) {
    alert('Trash is empty');
    return;
  }

  if (!confirm(`⚠️ WARNING: Permanently delete all ${trashItemsCache.length} items? This cannot be undone.`)) return;
  if (!confirm('Final confirmation: Delete all permanently?')) return;

  try {
    for (const item of trashItemsCache) {
      await fetch(`${BASE_URL}api/product-pdf-permanent/${item._id}`, { method: 'DELETE' });
    }
    loadTrashPage();
  } catch (error) {
    console.error('❌ Error deleting all trash items:', error);
    alert('Error deleting all items');
  }
}

function renderTrashPagination(meta) {
  const container = document.getElementById('trashPagination');
  if (!container) return;

  const page = meta?.page || 1;
  const limit = meta?.limit || trashLimit;
  const total = meta?.total || 0;
  const totalPages = meta?.totalPages || 1;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const prevDisabled = page <= 1 ? 'opacity-50 pointer-events-none' : '';
  const nextDisabled = page >= totalPages ? 'opacity-50 pointer-events-none' : '';

  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
      <div class="flex items-center gap-3">
        <span>Showing ${start}-${end} of ${total}</span>
        <label class="flex items-center gap-2">
          <span>Per page</span>
          <select id="trashPageSize" onchange="changeTrashPageSize()" class="p-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
            ${[10, 25, 50, 100].map(size => `<option value="${size}" ${size === limit ? 'selected' : ''}>${size}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="changeTrashPage(${page - 1})" class="px-2 py-1 border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${prevDisabled}">
          Prev
        </button>
        <span>Page ${page} / ${totalPages}</span>
        <button onclick="changeTrashPage(${page + 1})" class="px-2 py-1 border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${nextDisabled}">
          Next
        </button>
      </div>
    </div>
  `;
}

function changeTrashPage(nextPage) {
  if (nextPage < 1 || nextPage > trashTotalPages) return;
  trashPage = nextPage;
  loadTrashPage();
}

function changeTrashPageSize() {
  const select = document.getElementById('trashPageSize');
  const nextLimit = parseInt(select?.value, 10) || 25;
  trashLimit = nextLimit;
  trashPage = 1;
  loadTrashPage();
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
      loadTrashPage();
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
      loadTrashPage();
    } else {
      alert('Failed to permanently delete PDF');
    }
  } catch (error) {
    console.error('❌ Error permanently deleting PDF:', error);
    alert('Error permanently deleting PDF');
  }
}

// Preview PDF Image
function previewPDFImage(imageURL, sebanggoList, fileName) {
  const modal = document.createElement('div');
  modal.id = 'imagePreviewModal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center';
  modal.onclick = () => modal.remove();
  
  modal.innerHTML = `
    <div class="relative max-w-7xl max-h-[95vh] w-full h-full flex flex-col items-center justify-center p-4">
      <button onclick="document.getElementById('imagePreviewModal').remove()" class="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2" title="Close">
        <i class="ri-close-line text-3xl"></i>
      </button>
      <div class="text-center mb-4">
        <h3 class="text-lg font-bold text-white">${sebanggoList}</h3>
        <p class="text-sm text-gray-300 mt-1">${fileName}</p>
      </div>
      <img src="${imageURL}" alt="${fileName}" class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" onclick="event.stopPropagation()" />
      <div class="mt-4 flex gap-3">
        <a href="${imageURL}" target="_blank" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2">
          <i class="ri-external-link-line"></i>
          Open in New Tab
        </a>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Export functions to global scope
window.initProductPDFsPage = initProductPDFsPage;
window.switchPDFType = switchPDFType;
window.toggleUploadForm = toggleUploadForm;
window.handleFilterTypeChange = handleFilterTypeChange;
window.handleModelFilter = handleModelFilter;
window.clearPdfSelection = clearPdfSelection;
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
window.reviewBulkUpload = reviewBulkUpload;
window.closeBulkMatchModal = closeBulkMatchModal;
window.confirmBulkUpload = confirmBulkUpload;
window.changePDFPage = changePDFPage;
window.changePDFPageSize = changePDFPageSize;
window.changeTrashPage = changeTrashPage;
window.changeTrashPageSize = changeTrashPageSize;
window.recoverAllTrash = recoverAllTrash;
window.deleteAllTrash = deleteAllTrash;
window.handlePdfSearchInput = handlePdfSearchInput;
window.handlePdfModelFilter = handlePdfModelFilter;
window.closeConflictModal = closeConflictModal;
window.handlePdfSearchKeydown = handlePdfSearchKeydown;
window.removePdfSearchToken = removePdfSearchToken;
window.togglePdfSort = togglePdfSort;
window.proceedWithConflictResolution = proceedWithConflictResolution;
window.deletePDF = deletePDF;
window.openTrash = openTrash;
window.closeTrash = closeTrash;
window.recoverPDF = recoverPDF;
window.permanentlyDeletePDF = permanentlyDeletePDF;
window.previewPDFImage = previewPDFImage;
