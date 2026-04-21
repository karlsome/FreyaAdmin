const productionCapabilityState = {
  filters: {
    factory: '',
    model: '',
    search: '',
  },
  pagination: {
    page: 1,
    limit: 25,
    totalCount: 0,
    totalPages: 1,
  },
  factories: [],
  models: [],
  products: [],
  selectedProductKey: null,
  selectedProduct: null,
  selectedCapability: null,
  equipmentOptions: [],
  editorMachines: [],
  enabled: true,
  loadingList: false,
  loadingDetail: false,
  metaLoaded: false,
  notice: null,
};

function escapeProductionCapabilityHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getProductionCapabilityProductKey(product = {}) {
  return `${product['工場'] || ''}::${product['背番号'] || ''}::${product['品番'] || ''}`;
}

function getProductionCapabilityStatusTone(status) {
  switch (status) {
    case 'mapped':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'disabled':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'empty':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    default:
      return 'bg-rose-100 text-rose-700 border-rose-200';
  }
}

function getProductionCapabilityStatusLabel(status) {
  switch (status) {
    case 'mapped':
      return 'Mapped';
    case 'disabled':
      return 'Disabled';
    case 'empty':
      return 'No Machines';
    default:
      return 'Unmapped';
  }
}

function cloneProductionCapabilityMachines(machines = []) {
  return machines.map((machine) => ({ ...machine }));
}

function getProductionCapabilityNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getProductionCapabilityEquipmentNames(equipment = '') {
  return String(equipment || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

function getProductionCapabilityDefaultsForMachine(product = {}, equipment = '') {
  const cycleTimeValue = getProductionCapabilityNumber(product?.['秒数(1pcs何秒)']);
  const boxQuantityValue = getProductionCapabilityNumber(product?.['収容数']);
  const rootPcPerCycle = getProductionCapabilityNumber(product?.pcPerCycle);
  const machineConfig = product?.machineConfig && typeof product.machineConfig === 'object'
    ? product.machineConfig
    : null;
  const equipmentNames = getProductionCapabilityEquipmentNames(equipment);

  let pcPerCycleValue = rootPcPerCycle;
  let pcPerCycleSource = rootPcPerCycle !== null ? 'masterDB.pcPerCycle' : null;
  let pcPerCycleNote = null;

  if (machineConfig && equipmentNames.length > 0) {
    if (equipmentNames.length === 1) {
      const machineDefaults = machineConfig[equipmentNames[0]];
      const machinePcPerCycle = getProductionCapabilityNumber(machineDefaults?.pcPerCycle);

      if (machinePcPerCycle !== null) {
        pcPerCycleValue = machinePcPerCycle;
        pcPerCycleSource = `masterDB.machineConfig.${equipmentNames[0]}.pcPerCycle`;
      }
    } else {
      const machineValues = equipmentNames
        .map((name) => getProductionCapabilityNumber(machineConfig[name]?.pcPerCycle))
        .filter((value) => value !== null);

      if (
        machineValues.length === equipmentNames.length
        && machineValues.length > 0
        && machineValues.every((value) => value === machineValues[0])
      ) {
        pcPerCycleValue = machineValues[0];
        pcPerCycleSource = `shared machineConfig for ${equipmentNames.join(', ')}`;
      } else if (machineValues.length > 0) {
        pcPerCycleNote = `MachineConfig values differ across ${equipmentNames.join(', ')}. Blank will fall back to the root masterDB value.`;
      }
    }
  }

  return {
    cycleTimeSeconds: {
      value: cycleTimeValue,
      sourceLabel: cycleTimeValue !== null ? 'masterDB.秒数(1pcs何秒)' : null,
      note: null,
    },
    pcPerCycle: {
      value: pcPerCycleValue,
      sourceLabel: pcPerCycleSource,
      note: pcPerCycleNote,
    },
    boxQuantity: {
      value: boxQuantityValue,
      sourceLabel: boxQuantityValue !== null ? 'masterDB.収容数' : null,
      note: null,
    },
  };
}

function getProductionCapabilityDefaultPlaceholder(defaultInfo = {}, suffix = '') {
  if (defaultInfo?.value === null || defaultInfo?.value === undefined) {
    return 'Blank = use masterDB/default';
  }

  return suffix ? `${defaultInfo.value} ${suffix}` : String(defaultInfo.value);
}

function getProductionCapabilityOverrideHint(currentValue, defaultInfo = {}, suffix = '') {
  const hasOverride = currentValue !== '' && currentValue !== null && currentValue !== undefined;
  const defaultValue = defaultInfo?.value;
  const defaultText = defaultValue === null || defaultValue === undefined
    ? 'the planner fallback'
    : `${defaultValue}${suffix ? ` ${suffix}` : ''} from ${defaultInfo.sourceLabel}`;

  if (hasOverride) {
    return `Override saved. Leave blank to use ${defaultText}.`;
  }

  if (defaultInfo?.note) {
    return defaultInfo.note;
  }

  return `Blank will use ${defaultText}.`;
}

function getProductionCapabilityCurrentUser() {
  return JSON.parse(localStorage.getItem('authUser') || '{}');
}

function renderProductionCapabilityNotice() {
  if (!productionCapabilityState.notice) {
    return '';
  }

  const tone = productionCapabilityState.notice.type === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return `
    <div class="rounded-xl border px-4 py-3 text-sm font-medium ${tone}">
      ${escapeProductionCapabilityHtml(productionCapabilityState.notice.text)}
    </div>
  `;
}

function renderProductionCapabilitySummaryCards() {
  const mappedCount = productionCapabilityState.products.filter((product) => product.mappingStatus === 'mapped').length;
  const unmappedCount = productionCapabilityState.products.filter((product) => product.mappingStatus === 'unmapped').length;
  const selectedFactory = productionCapabilityState.filters.factory || 'All factories';

  return `
    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Filtered Products</p>
        <p class="mt-2 text-3xl font-semibold text-slate-900">${productionCapabilityState.pagination.totalCount}</p>
      </div>
      <div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Mapped On Page</p>
        <p class="mt-2 text-3xl font-semibold text-emerald-900">${mappedCount}</p>
      </div>
      <div class="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Current Factory</p>
        <p class="mt-2 truncate text-xl font-semibold text-blue-900">${escapeProductionCapabilityHtml(selectedFactory)}</p>
        <p class="mt-1 text-xs text-blue-700">${unmappedCount} unmapped products visible</p>
      </div>
    </div>
  `;
}

function renderProductionCapabilityFilters() {
  const factoryOptions = ['<option value="">All factories</option>']
    .concat(productionCapabilityState.factories.map((factory) => `
      <option value="${escapeProductionCapabilityHtml(factory)}" ${productionCapabilityState.filters.factory === factory ? 'selected' : ''}>${escapeProductionCapabilityHtml(factory)}</option>
    `))
    .join('');

  const modelOptions = ['<option value="">All models</option>']
    .concat(productionCapabilityState.models.map((model) => `
      <option value="${escapeProductionCapabilityHtml(model)}" ${productionCapabilityState.filters.model === model ? 'selected' : ''}>${escapeProductionCapabilityHtml(model)}</option>
    `))
    .join('');

  return `
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_120px_auto_auto]">
      <label class="block text-sm font-medium text-slate-700">
        <span class="mb-2 block">Factory</span>
        <select id="productionCapabilityFactoryFilter" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          ${factoryOptions}
        </select>
      </label>
      <label class="block text-sm font-medium text-slate-700">
        <span class="mb-2 block">Model</span>
        <select id="productionCapabilityModelFilter" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          ${modelOptions}
        </select>
      </label>
      <label class="block text-sm font-medium text-slate-700">
        <span class="mb-2 block">Search</span>
        <input id="productionCapabilitySearchInput" type="text" value="${escapeProductionCapabilityHtml(productionCapabilityState.filters.search)}" placeholder="Search 背番号 / 品番 / 品名 / モデル" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" onkeydown="handleProductionCapabilitySearchKeydown(event)" />
      </label>
      <label class="block text-sm font-medium text-slate-700">
        <span class="mb-2 block">Per page</span>
        <select id="productionCapabilityLimit" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          <option value="10" ${productionCapabilityState.pagination.limit === 10 ? 'selected' : ''}>10</option>
          <option value="25" ${productionCapabilityState.pagination.limit === 25 ? 'selected' : ''}>25</option>
          <option value="50" ${productionCapabilityState.pagination.limit === 50 ? 'selected' : ''}>50</option>
        </select>
      </label>
      <button onclick="applyProductionCapabilityFilters()" class="self-end rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700">
        Apply
      </button>
      <button onclick="clearProductionCapabilityFilters()" class="self-end rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
        Clear
      </button>
    </div>
  `;
}

function renderProductionCapabilityProductList() {
  if (productionCapabilityState.loadingList) {
    return `
      <div class="flex min-h-[420px] items-center justify-center">
        <div class="text-center">
          <div class="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900"></div>
          <p class="mt-3 text-sm text-slate-500">Loading products...</p>
        </div>
      </div>
    `;
  }

  if (!productionCapabilityState.products.length) {
    return `
      <div class="flex min-h-[420px] items-center justify-center px-8 text-center">
        <div>
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <i class="ri-node-tree text-3xl"></i>
          </div>
          <p class="mt-4 text-lg font-semibold text-slate-900">No products found</p>
          <p class="mt-2 text-sm text-slate-500">Adjust the filters or search terms and try again.</p>
        </div>
      </div>
    `;
  }

  return productionCapabilityState.products.map((product, index) => {
    const active = getProductionCapabilityProductKey(product) === productionCapabilityState.selectedProductKey;
    const statusTone = getProductionCapabilityStatusTone(product.mappingStatus);

    return `
      <button type="button" onclick="selectProductionCapabilityProduct(${index})" class="w-full border-b border-slate-200 px-4 py-4 text-left transition hover:bg-slate-50 ${active ? 'bg-blue-50' : 'bg-white'}">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate text-sm font-semibold text-slate-900">${escapeProductionCapabilityHtml(product['背番号'] || '-')}</span>
              <span class="rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusTone}">${getProductionCapabilityStatusLabel(product.mappingStatus)}</span>
            </div>
            <p class="mt-1 truncate text-sm text-blue-700">${escapeProductionCapabilityHtml(product['品番'] || '-')}</p>
            <p class="mt-2 truncate text-xs text-slate-500">${escapeProductionCapabilityHtml(product['モデル'] || 'No model')}</p>
            <p class="mt-1 truncate text-xs text-slate-400">${escapeProductionCapabilityHtml(product['工場'] || 'No factory')}</p>
          </div>
          <div class="shrink-0 text-right">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Machines</p>
            <p class="mt-1 text-lg font-semibold text-slate-900">${product.machineCount || 0}</p>
            <p class="mt-1 max-w-[110px] truncate text-[11px] text-slate-500">${escapeProductionCapabilityHtml(product.preferredMachine || 'None')}</p>
          </div>
        </div>
      </button>
    `;
  }).join('');
}

function renderProductionCapabilityPagination() {
  const { page, totalPages, totalCount, limit } = productionCapabilityState.pagination;

  if (!totalCount) {
    return '<p class="text-sm text-slate-400">0 results</p>';
  }

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalCount);

  return `
    <div class="flex items-center justify-between gap-4">
      <p class="text-sm text-slate-500">Showing ${start}-${end} of ${totalCount}</p>
      <div class="flex items-center gap-2">
        <button onclick="goToProductionCapabilityPage(${page - 1})" class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 ${page <= 1 ? 'cursor-not-allowed opacity-40 hover:bg-white' : ''}" ${page <= 1 ? 'disabled' : ''}>Prev</button>
        <span class="min-w-[88px] text-center text-sm font-medium text-slate-600">Page ${page} / ${Math.max(totalPages, 1)}</span>
        <button onclick="goToProductionCapabilityPage(${page + 1})" class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 ${page >= totalPages ? 'cursor-not-allowed opacity-40 hover:bg-white' : ''}" ${page >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    </div>
  `;
}

function renderProductionCapabilityMachineRows() {
  if (!productionCapabilityState.editorMachines.length) {
    return `
      <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
        <p class="text-sm font-medium text-slate-700">No machine mappings yet</p>
        <p class="mt-2 text-xs text-slate-500">Add one or more explicit machines for this 背番号 / 品番 pair.</p>
      </div>
    `;
  }

  return productionCapabilityState.editorMachines.map((machine, index) => {
    const defaults = getProductionCapabilityDefaultsForMachine(
      productionCapabilityState.selectedProduct,
      machine['設備'] || ''
    );

    return `
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4" data-capability-row-index="${index}">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Machine ${index + 1}</p>
            <p class="mt-1 text-sm font-medium text-slate-900">Priority ${index + 1}</p>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="moveProductionCapabilityMachine(${index}, -1)" class="rounded-lg border border-slate-300 px-2.5 py-2 text-slate-600 transition hover:bg-white ${index === 0 ? 'cursor-not-allowed opacity-40 hover:bg-slate-50' : ''}" ${index === 0 ? 'disabled' : ''}><i class="ri-arrow-up-line"></i></button>
            <button type="button" onclick="moveProductionCapabilityMachine(${index}, 1)" class="rounded-lg border border-slate-300 px-2.5 py-2 text-slate-600 transition hover:bg-white ${index === productionCapabilityState.editorMachines.length - 1 ? 'cursor-not-allowed opacity-40 hover:bg-slate-50' : ''}" ${index === productionCapabilityState.editorMachines.length - 1 ? 'disabled' : ''}><i class="ri-arrow-down-line"></i></button>
            <button type="button" onclick="removeProductionCapabilityMachine(${index})" class="rounded-lg border border-rose-200 px-2.5 py-2 text-rose-600 transition hover:bg-rose-50"><i class="ri-delete-bin-line"></i></button>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label class="block text-sm font-medium text-slate-700 lg:col-span-2">
            <span class="mb-2 block">Equipment</span>
            <input id="pcEquipment_${index}" type="text" list="productionCapabilityEquipmentOptions" value="${escapeProductionCapabilityHtml(machine['設備'] || '')}" placeholder="Select or type equipment name" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </label>
          <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
            <input id="pcMachineEnabled_${index}" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" ${machine.enabled !== false ? 'checked' : ''} />
            <span>Machine enabled</span>
          </label>
          <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
            <input id="pcPreferred_${index}" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" ${machine.preferred === true ? 'checked' : ''} />
            <span>Preferred machine</span>
          </label>
          <label class="block text-sm font-medium text-slate-700">
            <span class="mb-2 block">Cycle time override (optional)</span>
            <input id="pcCycleTime_${index}" type="number" min="0" step="0.1" value="${machine.cycleTimeSeconds ?? ''}" placeholder="${escapeProductionCapabilityHtml(getProductionCapabilityDefaultPlaceholder(defaults.cycleTimeSeconds, 'sec'))}" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            <p class="mt-1 text-xs text-slate-500">${escapeProductionCapabilityHtml(getProductionCapabilityOverrideHint(machine.cycleTimeSeconds, defaults.cycleTimeSeconds, 'sec'))}</p>
          </label>
          <label class="block text-sm font-medium text-slate-700">
            <span class="mb-2 block">PC per cycle override (optional)</span>
            <input id="pcPerCycle_${index}" type="number" min="0" step="1" value="${machine.pcPerCycle ?? ''}" placeholder="${escapeProductionCapabilityHtml(getProductionCapabilityDefaultPlaceholder(defaults.pcPerCycle, 'pcs'))}" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            <p class="mt-1 text-xs text-slate-500">${escapeProductionCapabilityHtml(getProductionCapabilityOverrideHint(machine.pcPerCycle, defaults.pcPerCycle, 'pcs'))}</p>
          </label>
          <label class="block text-sm font-medium text-slate-700 lg:col-span-2">
            <span class="mb-2 block">Box quantity override (optional)</span>
            <input id="pcBoxOverride_${index}" type="number" min="0" step="1" value="${machine.boxQuantityOverride ?? ''}" placeholder="${escapeProductionCapabilityHtml(getProductionCapabilityDefaultPlaceholder(defaults.boxQuantity, 'pcs/box'))}" class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            <p class="mt-1 text-xs text-slate-500">${escapeProductionCapabilityHtml(getProductionCapabilityOverrideHint(machine.boxQuantityOverride, defaults.boxQuantity, 'pcs/box'))}</p>
          </label>
        </div>
      </div>
    `;
  }).join('');
}

function renderProductionCapabilityDetailPanel() {
  if (productionCapabilityState.loadingDetail) {
    return `
      <div class="flex min-h-[640px] items-center justify-center">
        <div class="text-center">
          <div class="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900"></div>
          <p class="mt-3 text-sm text-slate-500">Loading product capability...</p>
        </div>
      </div>
    `;
  }

  if (!productionCapabilityState.selectedProduct) {
    return `
      <div class="flex min-h-[640px] items-center justify-center px-10 text-center">
        <div>
          <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
            <i class="ri-settings-5-line text-4xl"></i>
          </div>
          <p class="mt-5 text-xl font-semibold text-slate-900">Select a product</p>
          <p class="mt-2 text-sm text-slate-500">Choose a 背番号 / 品番 pair from the left side to define its machine capability mapping.</p>
        </div>
      </div>
    `;
  }

  const product = productionCapabilityState.selectedProduct;
  const capability = productionCapabilityState.selectedCapability;
  const activeMachines = productionCapabilityState.editorMachines.filter((machine) => machine.enabled !== false).length;
  const status = !capability
    ? 'unmapped'
    : capability.enabled === false
      ? 'disabled'
      : activeMachines > 0
        ? 'mapped'
        : 'empty';
  const statusTone = getProductionCapabilityStatusTone(status);

  return `
    <div class="flex h-full flex-col">
      <div class="border-b border-slate-200 px-6 py-5">
        <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div class="flex min-w-0 gap-4">
            <div class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              ${product.imageURL
                ? `<img src="${escapeProductionCapabilityHtml(product.imageURL)}" alt="${escapeProductionCapabilityHtml(product['品番'] || '')}" class="h-full w-full object-cover" />`
                : '<i class="ri-image-line text-3xl text-slate-300"></i>'}
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="truncate text-2xl font-semibold text-slate-900">${escapeProductionCapabilityHtml(product['背番号'] || '-')}</h3>
                <span class="rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone}">${getProductionCapabilityStatusLabel(status)}</span>
              </div>
              <p class="mt-2 text-base font-medium text-blue-700">${escapeProductionCapabilityHtml(product['品番'] || '-')}</p>
              <p class="mt-2 text-sm text-slate-500">${escapeProductionCapabilityHtml(product['品名'] || 'No product name')}</p>
              <div class="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span class="rounded-full bg-slate-100 px-2.5 py-1">${escapeProductionCapabilityHtml(product['工場'] || 'No factory')}</span>
                <span class="rounded-full bg-slate-100 px-2.5 py-1">${escapeProductionCapabilityHtml(product['モデル'] || 'No model')}</span>
                <span class="rounded-full bg-slate-100 px-2.5 py-1">Box ${escapeProductionCapabilityHtml(product['収容数'] || '-')}</span>
                <span class="rounded-full bg-slate-100 px-2.5 py-1">Material ${escapeProductionCapabilityHtml(product['材料背番号'] || product['材料'] || '-')}</span>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Active machines</p>
            <p class="mt-2 text-3xl font-semibold text-slate-900">${activeMachines}</p>
            <p class="mt-1 text-xs text-slate-500">${productionCapabilityState.equipmentOptions.length} factory machines available</p>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-6">
        <div class="space-y-6">
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Capability controls</p>
                <p class="mt-2 text-sm text-slate-600">Use this mapping as the scheduling source of truth for eligible machines and priority. <span class="font-mono text-slate-700">masterDB.加工設備</span> remains reference only.</p>
              </div>
              <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input id="pcEnabledToggle" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" ${productionCapabilityState.enabled !== false ? 'checked' : ''} />
                <span>Capability mapping enabled</span>
              </label>
            </div>

            <div class="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Leave cycle time, PC per cycle, and box quantity blank unless a machine needs an exception. Blank means the planner falls back to masterDB defaults: <span class="font-mono">秒数(1pcs何秒)</span>, <span class="font-mono">pcPerCycle</span> or <span class="font-mono">machineConfig</span>, and <span class="font-mono">収容数</span>.
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Eligible machines</p>
                <h4 class="mt-2 text-lg font-semibold text-slate-900">Explicit machine eligibility and overrides</h4>
              </div>
              <button type="button" onclick="addProductionCapabilityMachine()" class="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700">
                <i class="ri-add-line mr-2"></i>Add machine
              </button>
            </div>

            ${productionCapabilityState.equipmentOptions.length === 0 ? `
              <div class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                No equipment history was found in pressDB for ${escapeProductionCapabilityHtml(product['工場'] || 'this factory')} yet. You can still type equipment names manually and save the mapping now.
              </div>
            ` : ''}

            <datalist id="productionCapabilityEquipmentOptions">
              ${productionCapabilityState.equipmentOptions.map((equipment) => `<option value="${escapeProductionCapabilityHtml(equipment)}"></option>`).join('')}
            </datalist>

            <div class="mt-5 space-y-4">
              ${renderProductionCapabilityMachineRows()}
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-slate-200 px-6 py-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-slate-500">Saved as <span class="font-medium text-slate-700">${escapeProductionCapabilityHtml(product['工場'] || '-')} / ${escapeProductionCapabilityHtml(product['背番号'] || '-')} / ${escapeProductionCapabilityHtml(product['品番'] || '-')}</span></p>
          <div class="flex items-center gap-3">
            <button type="button" onclick="reloadProductionCapabilityDetail()" class="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              Reload detail
            </button>
            <button type="button" onclick="saveProductionCapabilityMapping()" class="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700">
              Save mapping
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProductionCapabilityManager() {
  const container = document.getElementById('productionCapabilityContainer');
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="space-y-6">
      <section class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-6">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Phase 1</p>
              <h2 class="mt-3 text-2xl font-semibold text-slate-900">Production Capability Source Of Truth</h2>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Manage explicit machine eligibility for each 背番号 / 品番 pair. This page owns machine choice and priority. Timing and quantity fields stay in masterDB unless a specific machine needs an override.</p>
            </div>
            <div class="rounded-2xl border border-blue-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
              Official v1 scope: explicit machine mapping here, masterDB defaults for timing and quantity.
            </div>
          </div>
        </div>
        <div class="space-y-5 px-6 py-6">
          ${renderProductionCapabilityNotice()}
          ${renderProductionCapabilityFilters()}
          ${renderProductionCapabilitySummaryCards()}
        </div>
      </section>

      <section class="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-200 px-5 py-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Product queue</p>
                <h3 class="mt-2 text-lg font-semibold text-slate-900">Filtered master products</h3>
              </div>
              <div class="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">${productionCapabilityState.pagination.totalCount} total</div>
            </div>
          </div>
          <div class="max-h-[720px] overflow-y-auto">
            ${renderProductionCapabilityProductList()}
          </div>
          <div class="border-t border-slate-200 px-5 py-4">
            ${renderProductionCapabilityPagination()}
          </div>
        </div>

        <div class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm min-h-[720px]">
          ${renderProductionCapabilityDetailPanel()}
        </div>
      </section>
    </div>
  `;
}

async function loadProductionCapabilityMeta() {
  const [factoriesResponse, modelsResponse] = await Promise.all([
    fetch(`${BASE_URL}api/masterdb/factories`),
    fetch(`${BASE_URL}api/masterdb/models`),
  ]);

  const factoriesPayload = await factoriesResponse.json();
  const modelsPayload = await modelsResponse.json();

  productionCapabilityState.factories = Array.isArray(factoriesPayload?.data) ? factoriesPayload.data : [];
  productionCapabilityState.models = Array.isArray(modelsPayload?.data) ? modelsPayload.data : [];
  productionCapabilityState.metaLoaded = true;
}

async function loadProductionCapabilityProducts(options = {}) {
  const preserveSelection = options.preserveSelection !== false;
  productionCapabilityState.loadingList = true;
  renderProductionCapabilityManager();

  try {
    const response = await fetch(`${BASE_URL}api/production-capability/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: productionCapabilityState.pagination.page,
        limit: productionCapabilityState.pagination.limit,
        factory: productionCapabilityState.filters.factory,
        model: productionCapabilityState.filters.model,
        search: productionCapabilityState.filters.search,
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Failed to load production capability products');
    }

    productionCapabilityState.products = Array.isArray(payload.data) ? payload.data : [];
    productionCapabilityState.pagination.totalCount = payload.pagination?.totalCount || 0;
    productionCapabilityState.pagination.totalPages = payload.pagination?.totalPages || 1;

    const selectedProduct = preserveSelection
      ? productionCapabilityState.products.find((product) => getProductionCapabilityProductKey(product) === productionCapabilityState.selectedProductKey)
      : null;

    productionCapabilityState.loadingList = false;
    renderProductionCapabilityManager();

    if (selectedProduct) {
      await loadProductionCapabilityDetail(selectedProduct);
      return;
    }

    if (productionCapabilityState.products.length > 0) {
      await loadProductionCapabilityDetail(productionCapabilityState.products[0]);
      return;
    }

    productionCapabilityState.selectedProductKey = null;
    productionCapabilityState.selectedProduct = null;
    productionCapabilityState.selectedCapability = null;
    productionCapabilityState.editorMachines = [];
    productionCapabilityState.equipmentOptions = [];
    renderProductionCapabilityManager();
  } catch (error) {
    productionCapabilityState.loadingList = false;
    productionCapabilityState.notice = {
      type: 'error',
      text: error.message,
    };
    renderProductionCapabilityManager();
  }
}

async function loadProductionCapabilityDetail(product) {
  if (!product) {
    return;
  }

  productionCapabilityState.selectedProductKey = getProductionCapabilityProductKey(product);
  productionCapabilityState.loadingDetail = true;
  renderProductionCapabilityManager();

  try {
    const params = new URLSearchParams({
      sebanggo: product['背番号'] || '',
      hinban: product['品番'] || '',
      factory: product['工場'] || '',
    });

    const [detailResponse, equipmentResponse] = await Promise.all([
      fetch(`${BASE_URL}api/production-capability/detail?${params.toString()}`),
      fetch(`${BASE_URL}api/production-capability/equipment?factory=${encodeURIComponent(product['工場'] || '')}`),
    ]);

    const detailPayload = await detailResponse.json();
    const equipmentPayload = await equipmentResponse.json();

    if (!detailResponse.ok || !detailPayload.success) {
      throw new Error(detailPayload.error || 'Failed to load capability detail');
    }
    if (!equipmentResponse.ok || !equipmentPayload.success) {
      throw new Error(equipmentPayload.error || 'Failed to load equipment options');
    }

    productionCapabilityState.selectedProduct = detailPayload.product;
    productionCapabilityState.selectedCapability = detailPayload.capability;
    productionCapabilityState.enabled = detailPayload.capability?.enabled !== false;
    productionCapabilityState.editorMachines = cloneProductionCapabilityMachines(detailPayload.capability?.machines || []);
    productionCapabilityState.equipmentOptions = Array.isArray(equipmentPayload.data) ? equipmentPayload.data : [];
    productionCapabilityState.loadingDetail = false;
    renderProductionCapabilityManager();
  } catch (error) {
    productionCapabilityState.loadingDetail = false;
    productionCapabilityState.notice = {
      type: 'error',
      text: error.message,
    };
    renderProductionCapabilityManager();
  }
}

function syncProductionCapabilityFormState() {
  const enabledToggle = document.getElementById('pcEnabledToggle');
  if (enabledToggle) {
    productionCapabilityState.enabled = enabledToggle.checked;
  }

  const rows = Array.from(document.querySelectorAll('[data-capability-row-index]'));
  productionCapabilityState.editorMachines = rows.map((row) => {
    const index = parseInt(row.getAttribute('data-capability-row-index'), 10);
    return {
      設備: document.getElementById(`pcEquipment_${index}`)?.value || '',
      enabled: document.getElementById(`pcMachineEnabled_${index}`)?.checked !== false,
      preferred: document.getElementById(`pcPreferred_${index}`)?.checked === true,
      cycleTimeSeconds: document.getElementById(`pcCycleTime_${index}`)?.value || '',
      pcPerCycle: document.getElementById(`pcPerCycle_${index}`)?.value || '',
      boxQuantityOverride: document.getElementById(`pcBoxOverride_${index}`)?.value || '',
    };
  });
}

window.loadProductionCapabilityManager = async function loadProductionCapabilityManager() {
  renderProductionCapabilityManager();

  try {
    if (!productionCapabilityState.metaLoaded) {
      await loadProductionCapabilityMeta();
    }
    await loadProductionCapabilityProducts();
  } catch (error) {
    productionCapabilityState.notice = {
      type: 'error',
      text: error.message,
    };
    renderProductionCapabilityManager();
  }
};

window.applyProductionCapabilityFilters = async function applyProductionCapabilityFilters() {
  productionCapabilityState.filters.factory = document.getElementById('productionCapabilityFactoryFilter')?.value || '';
  productionCapabilityState.filters.model = document.getElementById('productionCapabilityModelFilter')?.value || '';
  productionCapabilityState.filters.search = document.getElementById('productionCapabilitySearchInput')?.value.trim() || '';
  productionCapabilityState.pagination.limit = parseInt(document.getElementById('productionCapabilityLimit')?.value || '25', 10) || 25;
  productionCapabilityState.pagination.page = 1;
  productionCapabilityState.notice = null;
  await loadProductionCapabilityProducts({ preserveSelection: false });
};

window.clearProductionCapabilityFilters = async function clearProductionCapabilityFilters() {
  productionCapabilityState.filters = {
    factory: '',
    model: '',
    search: '',
  };
  productionCapabilityState.pagination.page = 1;
  productionCapabilityState.pagination.limit = 25;
  productionCapabilityState.notice = null;
  renderProductionCapabilityManager();
  await loadProductionCapabilityProducts({ preserveSelection: false });
};

window.handleProductionCapabilitySearchKeydown = async function handleProductionCapabilitySearchKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    await applyProductionCapabilityFilters();
  }
};

window.goToProductionCapabilityPage = async function goToProductionCapabilityPage(page) {
  if (page < 1 || page > productionCapabilityState.pagination.totalPages) {
    return;
  }
  productionCapabilityState.pagination.page = page;
  await loadProductionCapabilityProducts();
};

window.selectProductionCapabilityProduct = async function selectProductionCapabilityProduct(index) {
  const product = productionCapabilityState.products[index];
  if (!product) {
    return;
  }
  productionCapabilityState.notice = null;
  await loadProductionCapabilityDetail(product);
};

window.addProductionCapabilityMachine = function addProductionCapabilityMachine() {
  syncProductionCapabilityFormState();
  productionCapabilityState.editorMachines.push({
    設備: '',
    enabled: true,
    preferred: productionCapabilityState.editorMachines.length === 0,
    cycleTimeSeconds: '',
    pcPerCycle: '',
    boxQuantityOverride: '',
  });
  renderProductionCapabilityManager();
};

window.removeProductionCapabilityMachine = function removeProductionCapabilityMachine(index) {
  syncProductionCapabilityFormState();
  productionCapabilityState.editorMachines.splice(index, 1);
  renderProductionCapabilityManager();
};

window.moveProductionCapabilityMachine = function moveProductionCapabilityMachine(index, direction) {
  syncProductionCapabilityFormState();
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= productionCapabilityState.editorMachines.length) {
    return;
  }

  const nextMachines = cloneProductionCapabilityMachines(productionCapabilityState.editorMachines);
  const temp = nextMachines[index];
  nextMachines[index] = nextMachines[nextIndex];
  nextMachines[nextIndex] = temp;
  productionCapabilityState.editorMachines = nextMachines;
  renderProductionCapabilityManager();
};

window.reloadProductionCapabilityDetail = async function reloadProductionCapabilityDetail() {
  if (!productionCapabilityState.selectedProduct) {
    return;
  }
  productionCapabilityState.notice = null;
  await loadProductionCapabilityDetail(productionCapabilityState.selectedProduct);
};

window.saveProductionCapabilityMapping = async function saveProductionCapabilityMapping() {
  if (!productionCapabilityState.selectedProduct) {
    return;
  }

  syncProductionCapabilityFormState();

  const user = getProductionCapabilityCurrentUser();

  try {
    const response = await fetch(`${BASE_URL}api/production-capability/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: productionCapabilityState.selectedProduct,
        enabled: productionCapabilityState.enabled,
        machines: productionCapabilityState.editorMachines,
        username: user.username || 'system',
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Failed to save production capability mapping');
    }

    productionCapabilityState.notice = {
      type: 'success',
      text: `Saved capability mapping for ${productionCapabilityState.selectedProduct['背番号']} / ${productionCapabilityState.selectedProduct['品番']}`,
    };

    await loadProductionCapabilityProducts();
  } catch (error) {
    productionCapabilityState.notice = {
      type: 'error',
      text: error.message,
    };
    renderProductionCapabilityManager();
  }
};