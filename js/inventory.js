// ==================== INVENTORY MANAGEMENT SYSTEM ====================

let currentInventoryPage = 1;
let inventoryItemsPerPage = 50;
let inventoryData = [];
let inventorySummary = {};
let inventorySortState = { column: null, direction: 1 };
let inventoryAllProducts = [];      // all products from masterDB (for model→sebanggo mapping)
let inventorySelectedSebanggoArray = []; // currently active sebanggo tags
let inventoryThresholdSummary = createDefaultInventoryThresholdSummary();
let inventoryThresholdStatusFilter = 'all';
let inventoryThresholdConfig = getDefaultInventoryThresholdConfig();
let inventoryRepairPreviewItems = [];
let inventoryRefreshLongPressTimer = null;
let inventoryRefreshLongPressTriggered = false;
let inventoryRepairModalContext = { trigger: 'manual', backNumbers: [] };
let inventorySnapshotState = createDefaultInventorySnapshotState();
let inventorySnapshotPendingRequestResolution = null;
let inventorySnapshotRequestOptions = [];
let inventorySnapshotModalMode = 'none';
const INVENTORY_TRANSACTION_PAGE_SIZE_OPTIONS = [10, 50, 100];
const INVENTORY_ADD_HISTORY_PAGE_SIZE_OPTIONS = [10, 50, 100];
let inventoryTransactionsState = createDefaultInventoryTransactionsState();
let inventoryAddHistoryGroups = [];
let inventoryAddHistoryState = createDefaultInventoryAddHistoryState();
let inventoryAddHistoryDetailState = createDefaultInventoryAddHistoryDetailState();

const INVENTORY_SNAPSHOT_START_MINUTES = 8 * 60;
const INVENTORY_SNAPSHOT_END_MINUTES = 17 * 60;
const INVENTORY_SNAPSHOT_INTERVAL_MINUTES = 30;
const INVENTORY_SNAPSHOT_MAX_STEP = (INVENTORY_SNAPSHOT_END_MINUTES - INVENTORY_SNAPSHOT_START_MINUTES) / INVENTORY_SNAPSHOT_INTERVAL_MINUTES;
const INVENTORY_REFRESH_LONG_PRESS_DURATION_MS = 1500;

function createDefaultInventoryTransactionsState() {
    return {
        backNumber: '',
        currentPage: 1,
        itemsPerPage: 10,
        totalPages: 0,
        totalItems: 0
    };
}

function createDefaultInventoryAddHistoryState() {
    return {
        currentPage: 1,
        itemsPerPage: 50,
        totalPages: 0,
        totalItems: 0
    };
}

function createDefaultInventoryAddHistoryDetailState() {
    return {
        timeStamp: '',
        itemCount: 0,
        items: []
    };
}

function normalizeInventoryTransactionsPositiveInteger(value, fallback = 1) {
    const parsedValue = Number.parseInt(value, 10);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function normalizeInventoryTransactionsPageSize(value, fallback = 10) {
    const parsedValue = normalizeInventoryTransactionsPositiveInteger(value, fallback);
    return INVENTORY_TRANSACTION_PAGE_SIZE_OPTIONS.includes(parsedValue) ? parsedValue : fallback;
}

function normalizeInventoryAddHistoryPageSize(value, fallback = 50) {
    const parsedValue = normalizeInventoryTransactionsPositiveInteger(value, fallback);
    return INVENTORY_ADD_HISTORY_PAGE_SIZE_OPTIONS.includes(parsedValue) ? parsedValue : fallback;
}

function getDefaultInventoryThresholdConfig() {
    return {
        global: {
            warning: 10,
            critical: 3
        },
        models: [],
        updatedAt: null,
        updatedBy: ''
    };
}

function normalizeInventoryThresholdBoxValue(value, defaultValue) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
        return defaultValue;
    }

    return Math.round(numericValue * 100) / 100;
}

function createDefaultInventoryThresholdSummary() {
    return {
        totalItems: 0,
        healthyCount: 0,
        warningCount: 0,
        criticalCount: 0
    };
}

function createDefaultInventorySnapshotState() {
    return {
        snapshotAt: null,
        date: '',
        time: '',
        mode: 'manual',
        requestNumber: '',
        pickedAt: null
    };
}

function formatInventoryLocalDateValue(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseInventorySnapshotTimeMinutes(value) {
    const match = /^([0-1]?\d|2[0-3]):([0-5]\d)$/.exec(String(value || '').trim());
    if (!match) {
        return null;
    }

    return (Number(match[1]) * 60) + Number(match[2]);
}

function clampInventorySnapshotMinutes(totalMinutes) {
    return Math.min(
        INVENTORY_SNAPSHOT_END_MINUTES,
        Math.max(INVENTORY_SNAPSHOT_START_MINUTES, totalMinutes)
    );
}

function snapInventorySnapshotMinutes(totalMinutes) {
    const clampedMinutes = clampInventorySnapshotMinutes(totalMinutes);
    const snappedStep = Math.round((clampedMinutes - INVENTORY_SNAPSHOT_START_MINUTES) / INVENTORY_SNAPSHOT_INTERVAL_MINUTES);
    return INVENTORY_SNAPSHOT_START_MINUTES + (snappedStep * INVENTORY_SNAPSHOT_INTERVAL_MINUTES);
}

function formatInventorySnapshotTime(totalMinutes) {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function normalizeInventorySnapshotTimeValue(value) {
    const totalMinutes = parseInventorySnapshotTimeMinutes(value);
    if (totalMinutes === null) {
        return '';
    }

    return formatInventorySnapshotTime(snapInventorySnapshotMinutes(totalMinutes));
}

function getInventorySnapshotStepValue(timeValue) {
    const normalizedTime = normalizeInventorySnapshotTimeValue(timeValue);
    const totalMinutes = parseInventorySnapshotTimeMinutes(normalizedTime);
    if (totalMinutes === null) {
        return 0;
    }

    return Math.round((totalMinutes - INVENTORY_SNAPSHOT_START_MINUTES) / INVENTORY_SNAPSHOT_INTERVAL_MINUTES);
}

function getInventorySnapshotTimeFromStep(stepValue) {
    const numericStep = Number(stepValue);
    const safeStep = Number.isFinite(numericStep)
        ? Math.max(0, Math.min(INVENTORY_SNAPSHOT_MAX_STEP, Math.round(numericStep)))
        : 0;

    return formatInventorySnapshotTime(
        INVENTORY_SNAPSHOT_START_MINUTES + (safeStep * INVENTORY_SNAPSHOT_INTERVAL_MINUTES)
    );
}

function getInventorySnapshotDefaultSelection() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return {
        date: formatInventoryLocalDateValue(now),
        time: normalizeInventorySnapshotTimeValue(currentTime) || '08:00'
    };
}

function getInventorySnapshotSelection() {
    if (
        inventorySnapshotState.mode !== 'request'
        && inventorySnapshotState.snapshotAt
        && inventorySnapshotState.date
        && inventorySnapshotState.time
    ) {
        return {
            date: inventorySnapshotState.date,
            time: inventorySnapshotState.time
        };
    }

    return getInventorySnapshotDefaultSelection();
}

function setInventorySnapshotState(dateValue, timeValue) {
    const normalizedTime = normalizeInventorySnapshotTimeValue(timeValue);
    if (!dateValue || !normalizedTime) {
        return false;
    }

    const snapshotDate = new Date(`${dateValue}T${normalizedTime}:00`);
    if (Number.isNaN(snapshotDate.getTime())) {
        return false;
    }

    inventorySnapshotState = {
        snapshotAt: snapshotDate.toISOString(),
        date: dateValue,
        time: normalizedTime,
        mode: 'manual',
        requestNumber: '',
        pickedAt: null
    };

    return true;
}

function formatInventorySnapshotDisplayValue(dateValue, timeValue) {
    const snapshotDate = new Date(`${dateValue}T${timeValue}:00`);
    if (Number.isNaN(snapshotDate.getTime())) {
        return `${dateValue} ${timeValue}`;
    }

    return snapshotDate.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatInventorySnapshotIsoDisplayValue(snapshotAt) {
    const snapshotDate = new Date(snapshotAt || '');
    if (Number.isNaN(snapshotDate.getTime())) {
        return '';
    }

    return snapshotDate.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatInventorySnapshotIsoTimeValue(snapshotAt) {
    const snapshotDate = new Date(snapshotAt || '');
    if (Number.isNaN(snapshotDate.getTime())) {
        return '';
    }

    return `${String(snapshotDate.getHours()).padStart(2, '0')}:${String(snapshotDate.getMinutes()).padStart(2, '0')}`;
}

function formatInventorySnapshotRequestOptionLabel(requestOption = {}) {
    const requestNumber = String(requestOption?.requestNumber || '').trim();
    const deliveryDate = String(requestOption?.deliveryDate || requestOption?.pickupDate || '').trim();
    const status = String(requestOption?.status || '').trim();
    const completedCount = Number(requestOption?.completedCount) || 0;
    const totalItems = Number(requestOption?.totalItems) || 0;
    const pieces = [requestNumber];

    if (deliveryDate) {
        pieces.push(deliveryDate);
    }

    if (status) {
        pieces.push(status);
    }

    if (totalItems > 0) {
        pieces.push(`${completedCount}/${totalItems}`);
    }

    return pieces.join(' | ');
}

function renderInventorySnapshotRequestOptions(selectedRequestNumber = '') {
    const requestSelect = document.getElementById('inventorySnapshotRequestNumberInput');
    if (!requestSelect) return;

    const _t = typeof t === 'function' ? t : (key) => key;
    const normalizedSelectedRequest = String(selectedRequestNumber || '').trim();
    const options = [
        `<option value="">${escapeInventoryAttribute(_t('inventorySnapshotRequestPlaceholder'))}</option>`
    ];

    inventorySnapshotRequestOptions.forEach((requestOption) => {
        const requestNumber = String(requestOption?.requestNumber || '').trim();
        if (!requestNumber) {
            return;
        }

        options.push(
            `<option value="${escapeInventoryAttribute(requestNumber)}">${escapeInventoryAttribute(formatInventorySnapshotRequestOptionLabel(requestOption))}</option>`
        );
    });

    requestSelect.innerHTML = options.join('');
    requestSelect.disabled = false;
    requestSelect.value = normalizedSelectedRequest && inventorySnapshotRequestOptions.some((requestOption) => requestOption.requestNumber === normalizedSelectedRequest)
        ? normalizedSelectedRequest
        : '';
}

function setInventorySnapshotRequestSelectLoadingState(message) {
    const requestSelect = document.getElementById('inventorySnapshotRequestNumberInput');
    if (!requestSelect) return;

    requestSelect.disabled = true;
    requestSelect.innerHTML = `<option value="">${escapeInventoryAttribute(message)}</option>`;
    requestSelect.value = '';
}

async function loadInventorySnapshotRequestOptions({ force = false } = {}) {
    const selectedRequestNumber = inventorySnapshotState.mode === 'request'
        ? (inventorySnapshotState.requestNumber || '')
        : '';

    if (!force && inventorySnapshotRequestOptions.length > 0) {
        renderInventorySnapshotRequestOptions(selectedRequestNumber);
        updateInventorySnapshotModalPreview();
        return;
    }

    const _t = typeof t === 'function' ? t : (key) => key;
    setInventorySnapshotRequestSelectLoadingState(_t('inventorySnapshotRequestLoading'));

    try {
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getSnapshotRequestOptions'
            })
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success || !Array.isArray(result.data)) {
            throw new Error(result.error || _t('inventorySnapshotRequestLoadFailed'));
        }

        inventorySnapshotRequestOptions = result.data
            .map((requestOption) => ({
                ...requestOption,
                requestNumber: String(requestOption?.requestNumber || '').trim()
            }))
            .filter((requestOption) => requestOption.requestNumber);

        if (inventorySnapshotRequestOptions.length === 0) {
            setInventorySnapshotRequestSelectLoadingState(_t('inventorySnapshotRequestEmpty'));
            return;
        }

        renderInventorySnapshotRequestOptions(selectedRequestNumber);
        updateInventorySnapshotModalPreview();
    } catch (error) {
        console.error('❌ Error loading inventory snapshot request options:', error);
        inventorySnapshotRequestOptions = [];
        setInventorySnapshotRequestSelectLoadingState(_t('inventorySnapshotRequestLoadFailed'));
    }
}

function getInventorySnapshotResolvedRequestValue() {
    return String(
        inventorySnapshotPendingRequestResolution?.requestNumber
        || inventorySnapshotPendingRequestResolution?.requestReference
        || ''
    ).trim();
}

function isInventorySnapshotRequestLoaded() {
    const requestSelect = document.getElementById('inventorySnapshotRequestNumberInput');
    const selectedRequestValue = String(requestSelect?.value || '').trim();
    const resolvedRequestValue = getInventorySnapshotResolvedRequestValue();

    return Boolean(
        inventorySnapshotPendingRequestResolution
        && resolvedRequestValue
        && (!selectedRequestValue || selectedRequestValue === resolvedRequestValue)
    );
}

function updateInventorySnapshotModalLayout() {
    const requestSection = document.getElementById('inventorySnapshotRequestSection');
    const requestSwitcherRow = document.getElementById('inventorySnapshotShowRequestSectionRow');
    const manualSection = document.getElementById('inventorySnapshotManualSection');
    const resetRequestButton = document.getElementById('inventorySnapshotResetRequestBtn');
    const requestLoaded = isInventorySnapshotRequestLoaded();

    if (requestSection) {
        requestSection.classList.toggle('hidden', inventorySnapshotModalMode === 'manual');
    }

    if (requestSwitcherRow) {
        requestSwitcherRow.classList.toggle('hidden', inventorySnapshotModalMode !== 'manual');
    }

    if (manualSection) {
        manualSection.classList.toggle('hidden', inventorySnapshotModalMode === 'request' && requestLoaded);
    }

    if (resetRequestButton) {
        resetRequestButton.classList.toggle('hidden', !requestLoaded);
    }
}

function setInventorySnapshotModalMode(nextMode = 'none') {
    inventorySnapshotModalMode = ['none', 'request', 'manual'].includes(nextMode)
        ? nextMode
        : 'none';

    updateInventorySnapshotModalLayout();
}

function setInventorySnapshotRequestLoadingState(isLoading) {
    const requestSelect = document.getElementById('inventorySnapshotRequestNumberInput');
    const resetRequestButton = document.getElementById('inventorySnapshotResetRequestBtn');

    if (requestSelect && inventorySnapshotRequestOptions.length > 0) {
        requestSelect.disabled = Boolean(isLoading);
        requestSelect.classList.toggle('opacity-70', Boolean(isLoading));
        requestSelect.classList.toggle('cursor-not-allowed', Boolean(isLoading));
    }

    if (resetRequestButton) {
        resetRequestButton.disabled = Boolean(isLoading);
        resetRequestButton.classList.toggle('opacity-70', Boolean(isLoading));
        resetRequestButton.classList.toggle('cursor-not-allowed', Boolean(isLoading));
    }
}

function clearInventorySnapshotRequestSelection({ nextMode = 'none' } = {}) {
    const requestSelect = document.getElementById('inventorySnapshotRequestNumberInput');
    if (requestSelect) {
        requestSelect.value = '';
    }

    inventorySnapshotPendingRequestResolution = null;
    setInventorySnapshotModalMode(nextMode);
}

function activateInventorySnapshotManualMode() {
    clearInventorySnapshotRequestSelection({ nextMode: 'manual' });
}

window.resetInventorySnapshotRequestSelection = function() {
    clearInventorySnapshotRequestSelection({ nextMode: 'none' });
    updateInventorySnapshotModalPreview();
};

window.showInventorySnapshotRequestSelector = function() {
    setInventorySnapshotModalMode('none');
    updateInventorySnapshotModalPreview();

    const requestSelect = document.getElementById('inventorySnapshotRequestNumberInput');
    if (requestSelect) {
        requestSelect.focus();
    }
};

function setInventorySnapshotStateFromResolvedRequest(resolution = {}) {
    const snapshotDate = new Date(resolution?.snapshotAt || '');
    if (Number.isNaN(snapshotDate.getTime())) {
        return false;
    }

    const pickedAtDate = resolution?.pickedAt ? new Date(resolution.pickedAt) : null;
    inventorySnapshotState = {
        snapshotAt: snapshotDate.toISOString(),
        date: formatInventoryLocalDateValue(snapshotDate),
        time: formatInventorySnapshotIsoTimeValue(snapshotDate),
        mode: 'request',
        requestNumber: String(resolution?.requestNumber || resolution?.requestReference || '').trim(),
        pickedAt: pickedAtDate && !Number.isNaN(pickedAtDate.getTime()) ? pickedAtDate.toISOString() : null
    };

    return true;
}

function renderInventorySnapshotBanner() {
    const container = document.getElementById('inventorySnapshotBanner');
    if (!container) return;

    const _t = typeof t === 'function' ? t : (key) => key;
    const isSnapshotActive = Boolean(inventorySnapshotState.snapshotAt);

    if (!isSnapshotActive) {
        container.innerHTML = `
            <div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div class="flex items-start gap-3">
                        <div class="rounded-2xl bg-emerald-600/10 p-3 text-emerald-700">
                            <i class="ri-pulse-line text-xl"></i>
                        </div>
                        <div>
                            <div class="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">${_t('inventorySnapshotLive')}</div>
                            <p class="mt-3 text-sm text-emerald-900">${_t('inventorySnapshotCurrentViewLive')}</p>
                        </div>
                    </div>
                    <button type="button" onclick="openInventorySnapshotModal()" class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">
                        <i class="ri-time-line mr-2"></i>
                        ${_t('inventorySnapshotButton')}
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const isRequestSnapshot = inventorySnapshotState.mode === 'request' && inventorySnapshotState.requestNumber;
    const snapshotLabel = isRequestSnapshot
        ? formatInventorySnapshotIsoDisplayValue(inventorySnapshotState.snapshotAt)
        : formatInventorySnapshotDisplayValue(inventorySnapshotState.date, inventorySnapshotState.time);
    const requestLabel = escapeInventoryAttribute(inventorySnapshotState.requestNumber);
    const pickedAtLabel = formatInventorySnapshotIsoDisplayValue(inventorySnapshotState.pickedAt) || snapshotLabel;
    container.innerHTML = `
        <div class="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 shadow-sm">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div class="flex items-start gap-3">
                    <div class="rounded-2xl bg-indigo-600/10 p-3 text-indigo-700">
                        <i class="ri-history-line text-xl"></i>
                    </div>
                    <div>
                        <div class="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">${_t('inventorySnapshotActive')}</div>
                        ${isRequestSnapshot
                            ? `<p class="mt-3 text-sm text-indigo-950">${_t('inventorySnapshotCurrentViewBeforeRequest')} <span class="font-semibold">${requestLabel}</span>.</p>`
                            : `<p class="mt-3 text-sm text-indigo-950">${_t('inventorySnapshotCurrentViewAt')} <span class="font-semibold">${snapshotLabel}</span>.</p>`}
                        ${isRequestSnapshot && pickedAtLabel
                            ? `<p class="mt-2 text-xs text-indigo-800">${_t('inventorySnapshotResolvedPickAt')} <span class="font-semibold">${pickedAtLabel}</span>.</p>`
                            : ''}
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                    <button type="button" onclick="openInventorySnapshotModal()" class="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50">
                        <i class="ri-edit-2-line mr-2"></i>
                        ${_t('inventorySnapshotEdit')}
                    </button>
                    <button type="button" onclick="clearInventorySnapshot()" class="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50">
                        <i class="ri-close-circle-line mr-2"></i>
                        ${_t('inventorySnapshotClear')}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function syncInventorySnapshotModalFields(selection = getInventorySnapshotSelection()) {
    const _t = typeof t === 'function' ? t : (key) => key;
    const dateInput = document.getElementById('inventorySnapshotDateInput');
    const timeInput = document.getElementById('inventorySnapshotTimeInput');
    const sliderInput = document.getElementById('inventorySnapshotTimeSlider');
    const requestSelect = document.getElementById('inventorySnapshotRequestNumberInput');

    inventorySnapshotModalMode = inventorySnapshotState.mode === 'request' && inventorySnapshotState.requestNumber
        ? 'request'
        : (inventorySnapshotState.mode === 'manual' && inventorySnapshotState.snapshotAt ? 'manual' : 'none');

    inventorySnapshotPendingRequestResolution = inventorySnapshotState.mode === 'request' && inventorySnapshotState.snapshotAt
        ? {
            requestReference: inventorySnapshotState.requestNumber || '',
            requestNumber: inventorySnapshotState.requestNumber || '',
            snapshotAt: inventorySnapshotState.snapshotAt,
            pickedAt: inventorySnapshotState.pickedAt || null
        }
        : null;

    if (requestSelect) {
        const selectedRequestNumber = inventorySnapshotState.mode === 'request' ? (inventorySnapshotState.requestNumber || '') : '';
        if (inventorySnapshotRequestOptions.length > 0) {
            renderInventorySnapshotRequestOptions(selectedRequestNumber);
        } else {
            setInventorySnapshotRequestSelectLoadingState(_t('inventorySnapshotRequestLoading'));
        }
    }

    if (dateInput) {
        dateInput.value = selection.date;
    }

    if (timeInput) {
        timeInput.value = selection.time;
    }

    if (sliderInput) {
        sliderInput.value = String(getInventorySnapshotStepValue(selection.time));
    }

    setInventorySnapshotRequestLoadingState(false);
    updateInventorySnapshotModalLayout();
    updateInventorySnapshotModalPreview();
}

window.updateInventorySnapshotModalPreview = function() {
    const _t = typeof t === 'function' ? t : (key) => key;
    const requestSelect = document.getElementById('inventorySnapshotRequestNumberInput');
    const dateInput = document.getElementById('inventorySnapshotDateInput');
    const timeInput = document.getElementById('inventorySnapshotTimeInput');
    const sliderInput = document.getElementById('inventorySnapshotTimeSlider');
    const selectedTime = document.getElementById('inventorySnapshotSelectedTime');
    const preview = document.getElementById('inventorySnapshotPreview');
    const previewMeta = document.getElementById('inventorySnapshotPreviewMeta');

    if (!timeInput || !selectedTime || !preview) return;

    const requestValue = String(requestSelect?.value || '').trim();
    if (requestValue) {
        const resolvedRequestValue = getInventorySnapshotResolvedRequestValue();

        if (inventorySnapshotPendingRequestResolution && requestValue === resolvedRequestValue) {
            const requestSnapshotLabel = formatInventorySnapshotIsoDisplayValue(inventorySnapshotPendingRequestResolution.snapshotAt);
            const pickedAtLabel = formatInventorySnapshotIsoDisplayValue(inventorySnapshotPendingRequestResolution.pickedAt) || requestSnapshotLabel;

            selectedTime.textContent = formatInventorySnapshotIsoTimeValue(inventorySnapshotPendingRequestResolution.snapshotAt) || '--:--';
            preview.textContent = `${_t('inventorySnapshotPreviewBeforeRequest')} ${requestValue}`;

            if (previewMeta) {
                previewMeta.textContent = pickedAtLabel
                    ? `${_t('inventorySnapshotResolvedPickAt')} ${pickedAtLabel}.`
                    : '';
            }
            return;
        }

        selectedTime.textContent = '--:--';
        preview.textContent = '--';
        if (previewMeta) {
            previewMeta.textContent = requestSelect?.disabled
                ? _t('inventorySnapshotResolvingRequest')
                : _t('inventorySnapshotRequestResolveHint');
        }
        return;
    }

    const normalizedTime = normalizeInventorySnapshotTimeValue(timeInput.value);
    if (normalizedTime && timeInput.value !== normalizedTime) {
        timeInput.value = normalizedTime;
    }

    if (sliderInput && normalizedTime) {
        sliderInput.value = String(getInventorySnapshotStepValue(normalizedTime));
    }

    selectedTime.textContent = normalizedTime || '--:--';
    if (previewMeta) {
        previewMeta.textContent = '';
    }

    if (dateInput?.value && normalizedTime) {
        preview.textContent = formatInventorySnapshotDisplayValue(dateInput.value, normalizedTime);
        return;
    }

    preview.textContent = '--';
};

window.handleInventorySnapshotDateInput = function(dateValue) {
    const dateInput = document.getElementById('inventorySnapshotDateInput');
    if (dateInput) {
        dateInput.value = dateValue;
    }

    activateInventorySnapshotManualMode();
    updateInventorySnapshotModalPreview();
};

window.handleInventorySnapshotSliderInput = function(stepValue) {
    const timeInput = document.getElementById('inventorySnapshotTimeInput');
    if (!timeInput) return;

    activateInventorySnapshotManualMode();
    timeInput.value = getInventorySnapshotTimeFromStep(stepValue);
    updateInventorySnapshotModalPreview();
};

window.handleInventorySnapshotTimeInput = function(timeValue) {
    const timeInput = document.getElementById('inventorySnapshotTimeInput');
    if (!timeInput) return;

    const normalizedTime = normalizeInventorySnapshotTimeValue(timeValue);
    if (normalizedTime) {
        timeInput.value = normalizedTime;
    }

    activateInventorySnapshotManualMode();
    updateInventorySnapshotModalPreview();
};

window.handleInventorySnapshotRequestInput = async function(requestValue) {
    const normalizedValue = String(requestValue || '').trim();
    const resolvedRequestValue = getInventorySnapshotResolvedRequestValue();

    if (!normalizedValue) {
        clearInventorySnapshotRequestSelection({ nextMode: 'none' });
        updateInventorySnapshotModalPreview();
        return;
    }

    if (inventorySnapshotPendingRequestResolution && normalizedValue === resolvedRequestValue) {
        setInventorySnapshotModalMode('request');
        updateInventorySnapshotModalPreview();
        return;
    }

    inventorySnapshotPendingRequestResolution = null;
    setInventorySnapshotModalMode('request');
    updateInventorySnapshotModalPreview();
    await resolveInventorySnapshotRequest();
};

window.resolveInventorySnapshotRequest = async function() {
    const _t = typeof t === 'function' ? t : (key) => key;
    const requestSelect = document.getElementById('inventorySnapshotRequestNumberInput');
    const requestReference = String(requestSelect?.value || '').trim();

    if (!requestReference) {
        alert(_t('inventorySnapshotRequestRequired'));
        return;
    }

    try {
        setInventorySnapshotRequestLoadingState(true);
        inventorySnapshotPendingRequestResolution = null;
        updateInventorySnapshotModalPreview();

        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'resolveSnapshotForRequest',
                requestReference
            })
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success || !result.data?.snapshotAt) {
            throw new Error(result.error || _t('inventorySnapshotRequestNotFound'));
        }

        inventorySnapshotPendingRequestResolution = {
            requestReference,
            requestNumber: String(result.data.requestNumber || requestReference).trim(),
            snapshotAt: result.data.snapshotAt,
            pickedAt: result.data.pickedAt || null
        };

        if (requestSelect) {
            requestSelect.value = inventorySnapshotPendingRequestResolution.requestNumber;
        }

        setInventorySnapshotModalMode('request');
        updateInventorySnapshotModalPreview();
    } catch (error) {
        console.error('❌ Error resolving inventory snapshot request:', error);
        if (requestSelect) {
            requestSelect.value = '';
        }
        inventorySnapshotPendingRequestResolution = null;
        setInventorySnapshotModalMode('none');
        updateInventorySnapshotModalPreview();
        alert(error.message || _t('inventorySnapshotRequestNotFound'));
    } finally {
        setInventorySnapshotRequestLoadingState(false);
    }
};

window.openInventorySnapshotModal = async function() {
    const modal = document.getElementById('inventorySnapshotModal');
    if (!modal) return;

    syncInventorySnapshotModalFields();
    modal.classList.remove('hidden');
    await loadInventorySnapshotRequestOptions();
};

window.closeInventorySnapshotModal = function() {
    const modal = document.getElementById('inventorySnapshotModal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.applyInventorySnapshot = function() {
    const _t = typeof t === 'function' ? t : (key) => key;
    const requestSelect = document.getElementById('inventorySnapshotRequestNumberInput');
    const dateInput = document.getElementById('inventorySnapshotDateInput');
    const timeInput = document.getElementById('inventorySnapshotTimeInput');
    const requestReference = String(requestSelect?.value || '').trim();
    const dateValue = String(dateInput?.value || '').trim();
    const normalizedTime = normalizeInventorySnapshotTimeValue(timeInput?.value || '');

    if (requestReference) {
        const resolvedRequestValue = String(
            inventorySnapshotPendingRequestResolution?.requestNumber
            || inventorySnapshotPendingRequestResolution?.requestReference
            || ''
        ).trim();

        if (!inventorySnapshotPendingRequestResolution || requestReference !== resolvedRequestValue) {
            alert(_t('inventorySnapshotRequestResolveRequired'));
            return;
        }

        if (!setInventorySnapshotStateFromResolvedRequest(inventorySnapshotPendingRequestResolution)) {
            alert(_t('inventorySnapshotRequestNotFound'));
            return;
        }

        currentInventoryPage = 1;
        renderInventorySnapshotBanner();
        closeInventorySnapshotModal();
        loadInventoryData();
        return;
    }

    if (!dateValue) {
        alert(_t('inventorySnapshotDateRequired'));
        return;
    }

    if (!normalizedTime) {
        alert(_t('inventorySnapshotTimeInvalid'));
        return;
    }

    if (timeInput) {
        timeInput.value = normalizedTime;
    }

    if (!setInventorySnapshotState(dateValue, normalizedTime)) {
        alert(_t('inventorySnapshotTimeInvalid'));
        return;
    }

    currentInventoryPage = 1;
    renderInventorySnapshotBanner();
    closeInventorySnapshotModal();
    loadInventoryData();
};

window.clearInventorySnapshot = function() {
    const hadSnapshot = Boolean(inventorySnapshotState.snapshotAt);
    inventorySnapshotPendingRequestResolution = null;
    inventorySnapshotState = createDefaultInventorySnapshotState();
    renderInventorySnapshotBanner();
    closeInventorySnapshotModal();

    if (hadSnapshot) {
        currentInventoryPage = 1;
        loadInventoryData();
    }
};

function normalizeInventoryThresholdConfig(config = {}) {
    const fallback = getDefaultInventoryThresholdConfig();
    const globalWarning = normalizeInventoryThresholdBoxValue(config?.global?.warning, fallback.global.warning);
    const globalCritical = normalizeInventoryThresholdBoxValue(
        config?.global?.critical,
        Math.min(fallback.global.critical, globalWarning)
    );

    const normalizedModels = Array.isArray(config?.models)
        ? config.models
            .map((rule) => {
                const model = String(rule?.model || '').trim();
                if (!model) {
                    return null;
                }

                const warning = normalizeInventoryThresholdBoxValue(rule?.warning, globalWarning);
                const critical = normalizeInventoryThresholdBoxValue(rule?.critical, Math.min(globalCritical, warning));

                return {
                    model,
                    warning,
                    critical: Math.min(critical, warning)
                };
            })
            .filter(Boolean)
            .sort((left, right) => left.model.localeCompare(right.model))
        : [];

    return {
        global: {
            warning: globalWarning,
            critical: Math.min(globalCritical, globalWarning)
        },
        models: normalizedModels,
        updatedAt: config?.updatedAt || null,
        updatedBy: config?.updatedBy || ''
    };
}

function normalizeInventoryThresholdSummary(summary = {}) {
    const defaults = createDefaultInventoryThresholdSummary();

    return {
        totalItems: Number(summary?.totalItems) || defaults.totalItems,
        healthyCount: Number(summary?.healthyCount) || defaults.healthyCount,
        warningCount: Number(summary?.warningCount) || defaults.warningCount,
        criticalCount: Number(summary?.criticalCount) || defaults.criticalCount
    };
}

/**
 * Initialize Inventory system
 */
function initializeInventorySystem() {
    console.log('📦 Initializing Inventory Management System...');
    
    // Get current user data
    const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    
    // Show add inventory section for authorized roles
    const authorizedRoles = ['admin', '課長', '係長'];
    const addInventorySection = document.getElementById('inventoryAddSection');
    
    if (authorizedRoles.includes(currentUser.role)) {
        addInventorySection.style.display = 'flex';
    }
    
    // Show reset all button for admin only
    const resetAllSection = document.getElementById('inventoryResetAllSection');
    if (currentUser.role === 'admin' && resetAllSection) {
        resetAllSection.style.display = 'flex';
    }

    const thresholdSection = document.getElementById('inventoryThresholdSection');
    if (currentUser.role === 'admin' && thresholdSection) {
        thresholdSection.style.display = 'flex';
        loadInventoryThresholdConfig({ silent: true });
    }

    const itemsPerPageSelect = document.getElementById('inventoryItemsPerPage');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.value = String(inventoryItemsPerPage);
    }

    renderInventorySnapshotBanner();
    
    // Event listeners
    setupInventoryEventListeners();

    // Load model options and all products for tagging
    loadInventoryModelOptions();
    loadInventoryAllProducts();
    
    // Load initial data
    loadInventoryData();
}

function handleInventoryRefreshButtonClick(event) {
    if (inventoryRefreshLongPressTriggered) {
        event.preventDefault();
        event.stopPropagation();
        inventoryRefreshLongPressTriggered = false;
        return;
    }

    loadInventoryData();
}

function setupInventoryRefreshLongPress(button) {
    const startLongPress = (event) => {
        if (event.type === 'mousedown' && event.button !== 0) {
            return;
        }

        clearTimeout(inventoryRefreshLongPressTimer);
        inventoryRefreshLongPressTriggered = false;
        inventoryRefreshLongPressTimer = setTimeout(async () => {
            inventoryRefreshLongPressTriggered = true;
            try {
                await openInventoryRepairModal({ trigger: 'refresh-hold' });
            } catch (error) {
                console.error('Failed to open inventory repair modal:', error);
            }
        }, INVENTORY_REFRESH_LONG_PRESS_DURATION_MS);
    };

    const cancelLongPress = () => {
        clearTimeout(inventoryRefreshLongPressTimer);
        inventoryRefreshLongPressTimer = null;
    };

    button.addEventListener('mousedown', startLongPress);
    button.addEventListener('touchstart', startLongPress, { passive: true });
    button.addEventListener('mouseup', cancelLongPress);
    button.addEventListener('mouseleave', cancelLongPress);
    button.addEventListener('touchend', cancelLongPress);
    button.addEventListener('touchcancel', cancelLongPress);
}

/**
 * Setup event listeners for Inventory system
 */
function setupInventoryEventListeners() {
    const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");

    // Filter and search listeners
    const refreshInventoryBtn = document.getElementById('refreshInventoryBtn');
    if (refreshInventoryBtn) {
        refreshInventoryBtn.addEventListener('click', handleInventoryRefreshButtonClick);
        if (currentUser.role === 'admin') {
            setupInventoryRefreshLongPress(refreshInventoryBtn);
            refreshInventoryBtn.title = 'Click to refresh. Hold for 1.5 seconds to repair reserved / available.';
        }
    }
    document.getElementById('inventoryPartNumberFilter').addEventListener('change', applyInventoryFilters);
    document.getElementById('inventoryBackNumberFilter').addEventListener('change', applyInventoryFilters);
    document.getElementById('inventorySearchInput').addEventListener('input', debounce(applyInventoryFilters, 500));

    // Model filter → tag system
    const modelFilter = document.getElementById('inventoryModelFilter');
    if (modelFilter) modelFilter.addEventListener('change', handleInventoryModelFilter);
    
    // Pagination listeners
    document.getElementById('inventoryItemsPerPage').addEventListener('change', (e) => {
        inventoryItemsPerPage = parseInt(e.target.value);
        currentInventoryPage = 1;
        loadInventoryData();
    });
    
    document.getElementById('inventoryPrevPage').addEventListener('click', () => changeInventoryPage(-1));
    document.getElementById('inventoryNextPage').addEventListener('click', () => changeInventoryPage(1));
    
    // Add inventory form submission
    const addInventoryForm = document.getElementById('addInventoryForm');
    if (addInventoryForm) {
        addInventoryForm.addEventListener('submit', handleInventoryAddFormSubmit);
    }
}

/**
 * Load inventory data from API
 */
async function loadInventoryData() {
    try {
        showInventoryLoadingState();
        
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getInventoryData',
                filters: buildInventoryQueryFilters(),
                page: currentInventoryPage,
                limit: inventoryItemsPerPage,
                sort: inventorySortState
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                console.log('📊 Raw inventory data received:', result.data);
                inventoryData = result.data;
                inventorySummary = result.summary;
                inventoryThresholdSummary = normalizeInventoryThresholdSummary(result.thresholdSummary);
                inventoryItemsPerPage = Number(result?.pagination?.itemsPerPage) || inventoryItemsPerPage;

                const itemsPerPageSelect = document.getElementById('inventoryItemsPerPage');
                if (itemsPerPageSelect) {
                    itemsPerPageSelect.value = String(inventoryItemsPerPage);
                }

                if (inventorySnapshotState.snapshotAt && result.snapshotAt) {
                    inventorySnapshotState.snapshotAt = result.snapshotAt;
                }

                renderInventorySnapshotBanner();
                updateInventorySummary();
                renderInventoryTable();
                updateInventoryPagination(result.pagination);
                loadInventoryFilterOptions();
                
                console.log('✅ Inventory data loaded successfully');
            } else {
                throw new Error(result.error || 'Failed to load inventory data');
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading inventory data:', error);
        showInventoryErrorState(error.message);
    }
}

/**
 * Build query filters from UI controls
 */
function buildInventoryQueryFilters({ includeSnapshot = true } = {}) {
    const filters = {};
    
    // Part number filter
    const partNumberFilter = document.getElementById('inventoryPartNumberFilter').value;
    if (partNumberFilter) {
        filters['品番'] = partNumberFilter;
    }
    
    // Back number filter (single — only used when model tagging is NOT active)
    const backNumberFilter = document.getElementById('inventoryBackNumberFilter').value;
    if (backNumberFilter && inventorySelectedSebanggoArray.length === 0) {
        filters['背番号'] = backNumberFilter;
    }

    // Model tag filter — passes array of sebanggo to backend
    if (inventorySelectedSebanggoArray.length > 0) {
        filters.sebanggoArray = inventorySelectedSebanggoArray;
    }
    
    // Search filter
    const searchTerm = document.getElementById('inventorySearchInput').value.trim();
    if (searchTerm) {
        filters.search = searchTerm;
    }

    if (inventoryThresholdStatusFilter && inventoryThresholdStatusFilter !== 'all') {
        filters.thresholdStatus = inventoryThresholdStatusFilter;
    }

    if (includeSnapshot && inventorySnapshotState.snapshotAt) {
        filters.snapshotAt = inventorySnapshotState.snapshotAt;
    }
    
    return filters;
}

/**
 * Apply filters and reload data
 */
function applyInventoryFilters() {
    currentInventoryPage = 1;
    loadInventoryData();
}

/**
 * Update summary display
 */
function updateInventorySummary() {
    document.getElementById('inventoryTotalItems').textContent = inventorySummary.totalItems || 0;
    document.getElementById('inventoryPhysicalStock').textContent = inventorySummary.totalPhysicalStock || 0;
    document.getElementById('inventoryReservedStock').textContent = inventorySummary.totalReservedStock || 0;
    document.getElementById('inventoryAvailableStock').textContent = inventorySummary.totalAvailableStock || 0;
    renderInventoryThresholdSummary();
}

function renderInventoryThresholdSummary() {
    const container = document.getElementById('inventoryThresholdSummary');
    if (!container) return;

    const summary = normalizeInventoryThresholdSummary(inventoryThresholdSummary);
    const totalCount = summary.totalItems;
    const filters = [
        {
            key: 'all',
            label: 'All',
            count: totalCount,
            icon: 'ri-stack-line',
            classes: 'border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100'
        },
        {
            key: 'critical',
            label: 'Critical',
            count: summary.criticalCount,
            icon: 'ri-alarm-warning-line',
            classes: 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100'
        },
        {
            key: 'warning',
            label: 'Low',
            count: summary.warningCount,
            icon: 'ri-error-warning-line',
            classes: 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
        },
        {
            key: 'healthy',
            label: 'Healthy',
            count: summary.healthyCount,
            icon: 'ri-checkbox-circle-line',
            classes: 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
        }
    ];

    container.innerHTML = `
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
                <div class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <i class="ri-bar-chart-box-line text-amber-500"></i>
                    Inventory Alerts
                </div>
                <p class="mt-1 text-xs text-gray-500">Thresholds are based on Boxes In Stock (physical boxes). Model rules override the global default.</p>
            </div>
            <div class="flex flex-wrap gap-2">
                ${filters.map((filter) => {
                    const isActive = inventoryThresholdStatusFilter === filter.key;
                    return `
                        <button
                            type="button"
                            onclick="setInventoryThresholdStatusFilter('${filter.key}')"
                            class="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${filter.classes} ${isActive ? 'ring-2 ring-offset-2 ring-slate-300' : ''}">
                            <i class="${filter.icon}"></i>
                            <span>${filter.label}</span>
                            <span class="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold">${filter.count}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Render inventory table
 */
function renderInventoryTable() {
    const container = document.getElementById('inventoryTableContainer');
    
    if (inventoryData.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="ri-inbox-line text-4xl mb-4"></i>
                <p>${t('noInventoryItemsFound')}</p>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <div class="overflow-x-auto -mx-4 sm:mx-0">
        <table class="w-full text-xs sm:text-sm">
            <thead class="bg-gray-50 border-b">
                <tr>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('品番')">
                        ${t('partNumber')} ${getInventorySortArrow('品番')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('背番号')">
                        ${t('serialNumber')} ${getInventorySortArrow('背番号')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('工場')">
                        ${t('factory')} ${getInventorySortArrow('工場')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('physicalQuantity')">
                        ${t('physicalStock')} ${getInventorySortArrow('physicalQuantity')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('stockBoxCount')">
                        ${t('stockBoxCount')} ${getInventorySortArrow('stockBoxCount')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('reservedQuantity')">
                        ${t('reservedStock')} ${getInventorySortArrow('reservedQuantity')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('availableQuantity')">
                        ${t('availableStock')} ${getInventorySortArrow('availableQuantity')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onclick="sortInventoryTable('lastUpdated')">
                        ${t('lastUpdated')} ${getInventorySortArrow('lastUpdated')}
                    </th>
                    <th class="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-700">${t('actions')}</th>
                </tr>
            </thead>
            <tbody>
                ${inventoryData.map((item, index) => {
                    const lastUpdated = new Date(item.lastUpdated).toLocaleDateString();
                    const availabilityStatus = getAvailabilityStatus(item);
                    const thresholdTooltip = escapeInventoryAttribute(buildInventoryThresholdTooltip(item, availabilityStatus));
                    
                    return `
                        <tr class="border-b cursor-pointer ${availabilityStatus.rowClass}" onclick="openInventoryTransactions('${item.背番号}')">
                            <td class="px-2 sm:px-4 py-2 sm:py-3 font-medium text-blue-600">
                                <span class="hover:underline">
                                    ${item.品番}
                                </span>
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3 font-medium">
                                ${item.背番号}
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3 text-gray-700">
                                <span class="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800">
                                    <i class="ri-building-line mr-1 text-xs"></i>
                                    ${item.工場 || '-'}
                                </span>
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3">
                                <span class="text-green-600 font-medium">${item.physicalQuantity}</span>
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3">
                                <span class="text-sky-600 font-medium">${formatInventoryBoxCount(item.stockBoxCount)}</span>
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3">
                                <span class="text-yellow-600 font-medium">${item.reservedQuantity}</span>
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3">
                                <span title="${thresholdTooltip}" class="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${availabilityStatus.badgeClass}">
                                    <i class="${availabilityStatus.icon} mr-1 text-xs"></i>
                                    ${item.availableQuantity}
                                </span>
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 whitespace-nowrap">
                                ${lastUpdated}
                            </td>
                            <td class="px-2 sm:px-4 py-2 sm:py-3" onclick="event.stopPropagation()">
                                <button onclick="openInventoryTransactions('${item.背番号}')" class="text-blue-600 hover:text-blue-800" title="${t('viewTransactions')}">
                                    <i class="ri-history-line text-base sm:text-lg"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
}

/**
 * Get availability status information for display
 */
function getAvailabilityStatus(item) {
    const status = String(item?.thresholdStatus || '').trim().toLowerCase();

    if (status === 'critical') {
        return {
            status,
            label: 'Critical',
            icon: 'ri-alarm-warning-line',
            badgeClass: 'bg-red-100 text-red-800',
            rowClass: 'bg-red-50 hover:bg-red-100'
        };
    }

    if (status === 'warning') {
        return {
            status,
            label: 'Low',
            icon: 'ri-error-warning-line',
            badgeClass: 'bg-amber-100 text-amber-800',
            rowClass: 'hover:bg-amber-50'
        };
    }

    return {
        status: 'healthy',
        label: 'Healthy',
        icon: 'ri-checkbox-circle-line',
        badgeClass: 'bg-green-100 text-green-800',
        rowClass: 'hover:bg-gray-50'
    };
}

function buildInventoryThresholdTooltip(item, availabilityStatus) {
    if (!Number.isFinite(Number(item?.stockBoxCount))) {
        return 'Box-based threshold unavailable. Capacity per box is missing for this item.';
    }

    const source = item?.thresholdSource === 'model'
        ? `Model rule${item?.model ? ` (${item.model})` : ''}`
        : 'Global rule';

    return `${availabilityStatus.label} alert. ${source}. Boxes in stock: ${formatInventoryBoxCount(item?.stockBoxCount)}. Warning <= ${formatInventoryBoxCount(item?.thresholdWarning)} boxes, Critical <= ${formatInventoryBoxCount(item?.thresholdCritical)} boxes.`;
}

function escapeInventoryAttribute(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

window.setInventoryThresholdStatusFilter = function(status) {
    inventoryThresholdStatusFilter = status || 'all';
    currentInventoryPage = 1;
    loadInventoryData();
};

function formatInventoryBoxCount(boxCount) {
    const numericValue = Number(boxCount);
    if (!Number.isFinite(numericValue)) {
        return '-';
    }

    const isWholeNumber = Math.abs(numericValue - Math.round(numericValue)) < 0.000001;
    return numericValue.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: isWholeNumber ? 0 : 2
    });
}

// ==================== INVENTORY ADD HISTORY ====================

function formatInventoryAddHistoryDateLabel(timeStamp) {
    const dateValue = new Date(timeStamp || '');
    if (Number.isNaN(dateValue.getTime())) {
        return '--';
    }

    return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;
}

function formatInventoryAddHistoryTimeLabel(timeStamp) {
    const dateValue = new Date(timeStamp || '');
    if (Number.isNaN(dateValue.getTime())) {
        return '--:--';
    }

    return `${String(dateValue.getHours()).padStart(2, '0')}:${String(dateValue.getMinutes()).padStart(2, '0')}`;
}

function formatInventoryAddHistoryCountLabel(itemCount) {
    const _t = typeof t === 'function' ? t : (key) => key;
    const normalizedCount = Number(itemCount) || 0;
    return `${normalizedCount.toLocaleString()} ${_t('inventoryAddHistoryItemsLabel')}`;
}

function setInventoryAddHistoryListLoadingState(message) {
    const content = document.getElementById('inventoryAddHistoryListContent');
    if (!content) {
        return;
    }

    content.innerHTML = `
        <div class="p-8 text-center text-gray-500">
            <i class="ri-loader-4-line animate-spin text-2xl mr-2"></i>
            ${escapeInventoryAttribute(message)}
        </div>
    `;
}

function showInventoryAddHistoryListError(message) {
    const content = document.getElementById('inventoryAddHistoryListContent');
    if (!content) {
        return;
    }

    content.innerHTML = `
        <div class="p-8 text-center text-red-500">
            <i class="ri-error-warning-line text-2xl mr-2"></i>
            ${escapeInventoryAttribute(message)}
        </div>
    `;
}

function renderInventoryAddHistoryGroups(groups = [], paginationInfo = inventoryAddHistoryState) {
    const content = document.getElementById('inventoryAddHistoryListContent');
    if (!content) {
        return;
    }

    const _t = typeof t === 'function' ? t : (key) => key;
    const groupList = Array.isArray(groups) ? groups : [];
    const totalPages = Number(paginationInfo?.totalPages) || 0;

    if (groupList.length === 0) {
        content.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="ri-inbox-line text-4xl mb-4"></i>
                <p>${_t('inventoryAddHistoryEmpty')}</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="space-y-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p class="text-sm text-gray-500">${getInventoryAddHistoryPageRangeLabel(paginationInfo)}</p>
                <label class="inline-flex items-center gap-2 text-sm text-gray-600">
                    <span>${_t('itemsPerPage')}</span>
                    <select
                        class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        onchange="changeInventoryAddHistoryPageSize(this.value)">
                        ${INVENTORY_ADD_HISTORY_PAGE_SIZE_OPTIONS.map((pageSize) => `
                            <option value="${pageSize}" ${pageSize === paginationInfo.itemsPerPage ? 'selected' : ''}>${pageSize}</option>
                        `).join('')}
                    </select>
                </label>
            </div>

            <div class="space-y-3">
                ${groupList.map((group) => {
                    const timeStamp = String(group?.timeStamp || '').trim();
                    const encodedTimeStamp = encodeURIComponent(timeStamp);
                    const dateLabel = formatInventoryAddHistoryDateLabel(timeStamp);
                    const timeLabel = formatInventoryAddHistoryTimeLabel(timeStamp);

                    return `
                        <button
                            type="button"
                            onclick="openInventoryAddHistoryDetail('${encodedTimeStamp}')"
                            class="group w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50/60">
                            <div class="flex items-center justify-between gap-4">
                                <div class="min-w-0">
                                    <p class="text-sm font-semibold text-slate-900">${escapeInventoryAttribute(`${dateLabel} | ${timeLabel}`)}</p>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">${escapeInventoryAttribute(formatInventoryAddHistoryCountLabel(group?.itemCount))}</span>
                                    <i class="ri-arrow-right-line text-lg text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600"></i>
                                </div>
                            </div>
                        </button>
                    `;
                }).join('')}
            </div>

            ${totalPages > 1 ? `
                <div class="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <p class="text-sm text-gray-500">${_t('page')} ${paginationInfo.currentPage} / ${totalPages}</p>
                    <div class="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onclick="changeInventoryAddHistoryPage(-1)"
                            class="px-3 py-2 border rounded-lg text-sm transition-colors ${paginationInfo.currentPage <= 1 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
                            ${paginationInfo.currentPage <= 1 ? 'disabled' : ''}>
                            ${_t('previous')}
                        </button>
                        ${buildInventoryAddHistoryPageButtons(paginationInfo)}
                        <button
                            type="button"
                            onclick="changeInventoryAddHistoryPage(1)"
                            class="px-3 py-2 border rounded-lg text-sm transition-colors ${paginationInfo.currentPage >= totalPages ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
                            ${paginationInfo.currentPage >= totalPages ? 'disabled' : ''}>
                            ${_t('next')}
                        </button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function getInventoryAddHistoryPageRangeLabel(paginationInfo) {
    const totalItems = Number(paginationInfo?.totalItems) || 0;
    if (totalItems === 0) {
        return t('noItemsToDisplay');
    }

    const currentPage = Number(paginationInfo?.currentPage) || 1;
    const itemsPerPage = Number(paginationInfo?.itemsPerPage) || 50;
    const startItem = ((currentPage - 1) * itemsPerPage) + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return `${startItem}-${endItem} / ${totalItems}`;
}

function buildInventoryAddHistoryPageButtons(paginationInfo) {
    const currentPage = Number(paginationInfo?.currentPage) || 1;
    const totalPages = Number(paginationInfo?.totalPages) || 0;
    let buttonsHtml = '';

    for (let pageNumber = Math.max(1, currentPage - 2); pageNumber <= Math.min(totalPages, currentPage + 2); pageNumber++) {
        buttonsHtml += `
            <button
                type="button"
                onclick="goToInventoryAddHistoryPage(${pageNumber})"
                class="px-3 py-2 border rounded-lg text-sm transition-colors ${pageNumber === currentPage ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
                ${pageNumber === currentPage ? 'aria-current="page"' : ''}>
                ${pageNumber}
            </button>
        `;
    }

    return buttonsHtml;
}

async function loadInventoryAddHistoryGroups(options = {}) {
    const _t = typeof t === 'function' ? t : (key) => key;
    const nextPage = normalizeInventoryTransactionsPositiveInteger(
        options.page ?? inventoryAddHistoryState.currentPage,
        1
    );
    const nextItemsPerPage = normalizeInventoryAddHistoryPageSize(
        options.itemsPerPage ?? inventoryAddHistoryState.itemsPerPage,
        50
    );

    inventoryAddHistoryState = {
        ...inventoryAddHistoryState,
        currentPage: nextPage,
        itemsPerPage: nextItemsPerPage
    };

    setInventoryAddHistoryListLoadingState(_t('inventoryAddHistoryLoading'));

    try {
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getInventoryAddHistoryGroups',
                page: nextPage,
                limit: nextItemsPerPage
            })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || _t('inventoryAddHistoryLoadFailed'));
        }

        const paginationInfo = result.pagination || {};
        inventoryAddHistoryGroups = Array.isArray(result.data) ? result.data : [];
        inventoryAddHistoryState = {
            currentPage: normalizeInventoryTransactionsPositiveInteger(
                paginationInfo.currentPage,
                nextPage
            ),
            itemsPerPage: normalizeInventoryAddHistoryPageSize(
                paginationInfo.itemsPerPage,
                nextItemsPerPage
            ),
            totalPages: Math.max(0, Number(paginationInfo.totalPages) || 0),
            totalItems: Math.max(0, Number(paginationInfo.totalItems) || 0)
        };

        renderInventoryAddHistoryGroups(inventoryAddHistoryGroups, inventoryAddHistoryState);
    } catch (error) {
        console.error('Error loading inventory add history:', error);
        showInventoryAddHistoryListError(error.message || _t('inventoryAddHistoryLoadFailed'));
    }
}

window.openInventoryAddHistoryModal = async function() {
    const modal = document.getElementById('inventoryAddHistoryModal');
    if (!modal) {
        return;
    }

    inventoryAddHistoryGroups = [];
    inventoryAddHistoryState = createDefaultInventoryAddHistoryState();
    closeInventoryAddHistoryDetailModal();
    modal.classList.remove('hidden');
    await loadInventoryAddHistoryGroups({
        page: inventoryAddHistoryState.currentPage,
        itemsPerPage: inventoryAddHistoryState.itemsPerPage
    });
};

window.closeInventoryAddHistoryModal = function() {
    const modal = document.getElementById('inventoryAddHistoryModal');
    if (modal) {
        modal.classList.add('hidden');
    }

    closeInventoryAddHistoryDetailModal();
};

window.changeInventoryAddHistoryPage = async function(direction) {
    const targetPage = inventoryAddHistoryState.currentPage + Number(direction || 0);
    if (targetPage < 1 || (inventoryAddHistoryState.totalPages > 0 && targetPage > inventoryAddHistoryState.totalPages)) {
        return;
    }

    await loadInventoryAddHistoryGroups({
        page: targetPage,
        itemsPerPage: inventoryAddHistoryState.itemsPerPage
    });
};

window.goToInventoryAddHistoryPage = async function(page) {
    const targetPage = normalizeInventoryTransactionsPositiveInteger(page, 1);
    if (targetPage < 1 || (inventoryAddHistoryState.totalPages > 0 && targetPage > inventoryAddHistoryState.totalPages)) {
        return;
    }

    await loadInventoryAddHistoryGroups({
        page: targetPage,
        itemsPerPage: inventoryAddHistoryState.itemsPerPage
    });
};

window.changeInventoryAddHistoryPageSize = async function(pageSize) {
    await loadInventoryAddHistoryGroups({
        page: 1,
        itemsPerPage: normalizeInventoryAddHistoryPageSize(pageSize, 50)
    });
};

function setInventoryAddHistoryDetailLoadingState(selectedGroup = null) {
    const content = document.getElementById('inventoryAddHistoryDetailContent');
    const meta = document.getElementById('inventoryAddHistoryDetailMeta');
    if (!content) {
        return;
    }

    if (meta) {
        meta.textContent = selectedGroup?.timeStamp
            ? `${formatInventoryAddHistoryDateLabel(selectedGroup.timeStamp)} | ${formatInventoryAddHistoryTimeLabel(selectedGroup.timeStamp)} | ${formatInventoryAddHistoryCountLabel(selectedGroup.itemCount)}`
            : '';
    }

    content.innerHTML = `
        <div class="p-8 text-center text-gray-500">
            <i class="ri-loader-4-line animate-spin text-2xl mr-2"></i>
            ${escapeInventoryAttribute(typeof t === 'function' ? t('inventoryAddHistoryDetailLoading') : 'Loading inserted items...')}
        </div>
    `;
}

function showInventoryAddHistoryDetailError(message, selectedGroup = null) {
    const content = document.getElementById('inventoryAddHistoryDetailContent');
    const meta = document.getElementById('inventoryAddHistoryDetailMeta');
    if (!content) {
        return;
    }

    if (meta) {
        meta.textContent = selectedGroup?.timeStamp
            ? `${formatInventoryAddHistoryDateLabel(selectedGroup.timeStamp)} | ${formatInventoryAddHistoryTimeLabel(selectedGroup.timeStamp)}`
            : '';
    }

    content.innerHTML = `
        <div class="p-8 text-center text-red-500">
            <i class="ri-error-warning-line text-2xl mr-2"></i>
            ${escapeInventoryAttribute(message)}
        </div>
    `;
}

function renderInventoryAddHistoryDetail(items = [], meta = {}) {
    const content = document.getElementById('inventoryAddHistoryDetailContent');
    const metaLabel = document.getElementById('inventoryAddHistoryDetailMeta');
    if (!content) {
        return;
    }

    const _t = typeof t === 'function' ? t : (key) => key;
    const itemList = Array.isArray(items) ? items : [];
    const timeStamp = String(meta?.timeStamp || '').trim();
    const itemCount = Number(meta?.itemCount) || itemList.length;
    const totalInsertedQuantity = itemList.reduce((sum, item) => {
        return sum + (Number(item?.insertedQuantity) || 0);
    }, 0);
    const totalBoxQuantity = itemList.reduce((sum, item) => {
        const numericBoxQuantity = Number(item?.boxQuantity);
        return sum + (Number.isFinite(numericBoxQuantity) ? numericBoxQuantity : 0);
    }, 0);

    inventoryAddHistoryDetailState = {
        timeStamp,
        itemCount,
        items: itemList
    };

    if (metaLabel) {
        metaLabel.textContent = timeStamp
            ? `${formatInventoryAddHistoryDateLabel(timeStamp)} | ${formatInventoryAddHistoryTimeLabel(timeStamp)} | ${formatInventoryAddHistoryCountLabel(itemCount)}`
            : '';
    }

    if (itemList.length === 0) {
        content.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="ri-inbox-line text-4xl mb-4"></i>
                <p>${_t('inventoryAddHistoryNoItems')}</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="min-w-full text-sm">
                <thead class="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th class="px-4 py-3 text-left font-medium text-slate-700">${_t('serialNumber')}</th>
                        <th class="px-4 py-3 text-left font-medium text-slate-700">${_t('partNumber')}</th>
                        <th class="px-4 py-3 text-left font-medium text-slate-700">${_t('inventoryAddHistoryInsertedQuantity')}</th>
                        <th class="px-4 py-3 text-left font-medium text-slate-700">${_t('inventoryAddHistoryBoxQuantity')}</th>
                        <th class="px-4 py-3 text-left font-medium text-slate-700">${_t('inventoryAddHistoryInsertedBy')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemList.map((item) => `
                        <tr class="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80">
                            <td class="px-4 py-3 font-semibold text-slate-900">${escapeInventoryAttribute(item?.背番号 || '-')}</td>
                            <td class="px-4 py-3 text-slate-700">${escapeInventoryAttribute(item?.品番 || '-')}</td>
                            <td class="px-4 py-3 font-medium text-emerald-700">${Number(item?.insertedQuantity || 0).toLocaleString()}</td>
                            <td class="px-4 py-3 font-medium text-sky-700">${formatInventoryBoxCount(item?.boxQuantity)}</td>
                            <td class="px-4 py-3 font-medium text-slate-700">${escapeInventoryAttribute(item?.insertedBy || '-')}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot class="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                        <td colspan="2" class="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-600">${_t('total')}</td>
                        <td class="px-4 py-3 text-sm font-bold text-emerald-700">${totalInsertedQuantity.toLocaleString()}</td>
                        <td class="px-4 py-3 text-sm font-bold text-sky-700">${formatInventoryBoxCount(totalBoxQuantity)}</td>
                        <td class="px-4 py-3 text-sm text-slate-400">-</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}

window.openInventoryAddHistoryDetail = async function(encodedTimeStamp) {
    const selectedTimeStamp = decodeURIComponent(String(encodedTimeStamp || '').trim());
    if (!selectedTimeStamp) {
        return;
    }

    const selectedGroup = inventoryAddHistoryGroups.find((group) => group.timeStamp === selectedTimeStamp) || {
        timeStamp: selectedTimeStamp,
        itemCount: 0
    };

    const modal = document.getElementById('inventoryAddHistoryDetailModal');
    if (!modal) {
        return;
    }

    const _t = typeof t === 'function' ? t : (key) => key;
    setInventoryAddHistoryDetailLoadingState(selectedGroup);
    modal.classList.remove('hidden');

    try {
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getInventoryAddHistoryItems',
                timeStamp: selectedTimeStamp
            })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || _t('inventoryAddHistoryDetailLoadFailed'));
        }

        renderInventoryAddHistoryDetail(result.data, {
            timeStamp: result?.meta?.timeStamp || selectedTimeStamp,
            itemCount: result?.meta?.itemCount ?? selectedGroup.itemCount
        });
    } catch (error) {
        console.error('Error loading inventory add history detail:', error);
        showInventoryAddHistoryDetailError(error.message || _t('inventoryAddHistoryDetailLoadFailed'), selectedGroup);
    }
};

window.closeInventoryAddHistoryDetailModal = function() {
    const modal = document.getElementById('inventoryAddHistoryDetailModal');
    const metaLabel = document.getElementById('inventoryAddHistoryDetailMeta');
    const content = document.getElementById('inventoryAddHistoryDetailContent');

    if (modal) {
        modal.classList.add('hidden');
    }

    if (metaLabel) {
        metaLabel.textContent = '';
    }

    if (content) {
        content.innerHTML = '';
    }

    inventoryAddHistoryDetailState = createDefaultInventoryAddHistoryDetailState();
};

// ==================== END INVENTORY ADD HISTORY ====================

/**
 * Sort inventory table by column
 */
window.sortInventoryTable = function(column) {
    if (inventorySortState.column === column) {
        inventorySortState.direction *= -1;
    } else {
        inventorySortState.column = column;
        inventorySortState.direction = 1;
    }
    
    loadInventoryData();
};

/**
 * Get sort arrow for column headers
 */
function getInventorySortArrow(column) {
    if (inventorySortState.column !== column) return '';
    return inventorySortState.direction === 1 ? ' ↑' : ' ↓';
}

/**
 * Update pagination controls
 */
function updateInventoryPagination(paginationInfo) {
    const pageInfo = document.getElementById('inventoryPageInfo');
    const pageNumbers = document.getElementById('inventoryPageNumbers');
    const prevBtn = document.getElementById('inventoryPrevPage');
    const nextBtn = document.getElementById('inventoryNextPage');
    
    if (!paginationInfo || paginationInfo.totalItems === 0) {
        pageInfo.textContent = t('noItemsToDisplay');
        pageNumbers.innerHTML = '';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    
    const { currentPage, totalPages, totalItems, itemsPerPage } = paginationInfo;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    pageInfo.textContent = `${totalItems}件中 ${startItem}-${endItem}件を表示`;
    
    // Generate page numbers
    pageNumbers.innerHTML = '';
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        const button = document.createElement('button');
        button.className = `px-3 py-1 border rounded text-sm ${i === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`;
        button.textContent = i;
        button.onclick = () => goToInventoryPage(i);
        pageNumbers.appendChild(button);
    }
    
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

/**
 * Change page
 */
function changeInventoryPage(direction) {
    const newPage = currentInventoryPage + direction;
    if (newPage >= 1) {
        currentInventoryPage = newPage;
        loadInventoryData();
    }
}

/**
 * Go to specific page
 */
window.goToInventoryPage = function(page) {
    if (page >= 1) {
        currentInventoryPage = page;
        loadInventoryData();
    }
};

/**
 * Load filter options (part numbers and back numbers)
 */
async function loadInventoryFilterOptions() {
    try {
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getFilterOptions'
            })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                updateInventoryFilterOptions(result.data);
            }
        }
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

// ==================== MODEL FILTER & TAGGING ====================

async function loadInventoryModelOptions() {
    const modelSelect = document.getElementById('inventoryModelFilter');
    if (!modelSelect) return;
    const loadingText = (typeof t === 'function') ? t('loading') : 'Loading...';
    modelSelect.innerHTML = `<option value="">${loadingText}</option>`;
    modelSelect.disabled = true;
    try {
        const baseUrl = typeof BASE_URL !== 'undefined' ? BASE_URL : (window.BASE_URL || 'http://localhost:3000/');
        const response = await fetch(`${baseUrl}api/masterdb/models`);
        const data = await response.json();
        const allModelsText = (typeof t === 'function') ? t('allModels') : 'All Models';
        if (response.ok && data.success && Array.isArray(data.data)) {
            const options = [`<option value="">${allModelsText}</option>`];
            data.data.forEach(model => options.push(`<option value="${model}">${model}</option>`));
            modelSelect.innerHTML = options.join('');
        } else {
            modelSelect.innerHTML = `<option value="">${allModelsText}</option>`;
        }
    } catch (error) {
        console.error('Failed to load inventory model options:', error);
        const allModelsText = (typeof t === 'function') ? t('allModels') : 'All Models';
        modelSelect.innerHTML = `<option value="">${allModelsText}</option>`;
    } finally {
        modelSelect.disabled = false;
    }
}

async function loadInventoryAllProducts() {
    try {
        const baseUrl = typeof BASE_URL !== 'undefined' ? BASE_URL : (window.BASE_URL || 'http://localhost:3000/');
        const response = await fetch(`${baseUrl}api/masterdb/products`);
        const data = await response.json();
        inventoryAllProducts = (response.ok && data.success && Array.isArray(data.data)) ? data.data : [];
    } catch (error) {
        console.error('Failed to load inventory products:', error);
        inventoryAllProducts = [];
    }
}

function handleInventoryModelFilter() {
    const selectedModel = document.getElementById('inventoryModelFilter').value;
    if (selectedModel) {
        inventorySelectedSebanggoArray = inventoryAllProducts
            .filter(p => p.モデル === selectedModel)
            .map(p => p.背番号)
            .filter(Boolean);
    } else {
        inventorySelectedSebanggoArray = [];
    }
    updateInventorySelectedProductsDisplay();
    currentInventoryPage = 1;
    loadInventoryData();
}

function updateInventorySelectedProductsDisplay() {
    const display = document.getElementById('inventorySelectedProductsDisplay');
    const tags = document.getElementById('inventorySelectedProductsTags');
    const _t = typeof t === 'function' ? t : k => k;

    if (inventorySelectedSebanggoArray.length === 0) {
        if (display) display.textContent = _t('noneSelected') || 'None selected';
        if (tags) tags.innerHTML = '';
        return;
    }

    if (display) display.textContent = `${inventorySelectedSebanggoArray.length} ${_t('selectedProducts') || 'products selected'}`;

    if (tags) {
        const visibleTags = inventorySelectedSebanggoArray.slice(0, 10).map(seb => `
            <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                ${seb}
                <button onclick="removeInventorySebanggoFromSelection('${seb}')" class="hover:text-blue-600 ml-1">
                    <i class="ri-close-line"></i>
                </button>
            </span>
        `).join('');
        const overflow = inventorySelectedSebanggoArray.length > 10
            ? `<span class="text-xs text-gray-500">+${inventorySelectedSebanggoArray.length - 10} more</span>`
            : '';
        tags.innerHTML = visibleTags + overflow;
    }
}

function removeInventorySebanggoFromSelection(sebanggo) {
    inventorySelectedSebanggoArray = inventorySelectedSebanggoArray.filter(s => s !== sebanggo);
    // If all tags cleared, also reset model dropdown
    if (inventorySelectedSebanggoArray.length === 0) {
        const modelFilter = document.getElementById('inventoryModelFilter');
        if (modelFilter) modelFilter.value = '';
    }
    updateInventorySelectedProductsDisplay();
    currentInventoryPage = 1;
    loadInventoryData();
}

async function loadInventoryThresholdConfig({ silent = false } = {}) {
    try {
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getThresholdConfig'
            })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to load threshold rules');
        }

        inventoryThresholdConfig = normalizeInventoryThresholdConfig(result.data);
        return inventoryThresholdConfig;
    } catch (error) {
        console.error('Failed to load inventory threshold config:', error);
        if (!silent) {
            const drawerContent = document.getElementById('inventoryThresholdDrawerContent');
            if (drawerContent) {
                drawerContent.innerHTML = `
                    <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <div class="flex items-start gap-3">
                            <i class="ri-error-warning-line text-lg"></i>
                            <div>
                                <p class="font-semibold">Unable to load threshold rules</p>
                                <p class="mt-1">${error.message}</p>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        throw error;
    }
}

function setInventoryThresholdDrawerLoadingState(message = 'Loading threshold rules...') {
    const drawerContent = document.getElementById('inventoryThresholdDrawerContent');
    if (!drawerContent) return;

    drawerContent.innerHTML = `
        <div class="flex items-center justify-center py-10 text-sm text-gray-500">
            <i class="ri-loader-4-line animate-spin mr-2"></i>
            ${message}
        </div>
    `;
}

async function ensureInventoryThresholdModelsLoaded() {
    if (!inventoryAllProducts.length) {
        await loadInventoryAllProducts();
    }

    const modelSelect = document.getElementById('inventoryModelFilter');
    if (!modelSelect || modelSelect.options.length <= 1) {
        await loadInventoryModelOptions();
    }
}

function getInventoryAvailableModels() {
    const models = new Set();

    inventoryAllProducts.forEach((product) => {
        const model = String(product?.モデル || '').trim();
        if (model) {
            models.add(model);
        }
    });

    if (models.size === 0) {
        const modelSelect = document.getElementById('inventoryModelFilter');
        if (modelSelect) {
            Array.from(modelSelect.options).forEach((option) => {
                const model = String(option.value || '').trim();
                if (model) {
                    models.add(model);
                }
            });
        }
    }

    return Array.from(models).sort((left, right) => left.localeCompare(right));
}

function buildInventoryThresholdUpdatedText(config) {
    if (!config?.updatedAt) {
        return 'Defaults apply until an admin saves a new rule set.';
    }

    const updatedDate = new Date(config.updatedAt);
    if (Number.isNaN(updatedDate.getTime())) {
        return config.updatedBy
            ? `Last updated by ${config.updatedBy}`
            : 'Threshold rules were updated previously.';
    }

    const formattedDate = updatedDate.toLocaleString();
    return config.updatedBy
        ? `Last updated ${formattedDate} by ${config.updatedBy}`
        : `Last updated ${formattedDate}`;
}

function buildInventoryThresholdModelOptions(selectedModel = '') {
    const availableModels = getInventoryAvailableModels();
    const modelSet = new Set(availableModels);
    const normalizedSelectedModel = String(selectedModel || '').trim();

    if (normalizedSelectedModel && !modelSet.has(normalizedSelectedModel)) {
        availableModels.unshift(normalizedSelectedModel);
    }

    const options = ['<option value="">Select model</option>'];
    availableModels.forEach((model) => {
        const isSelected = model === normalizedSelectedModel ? 'selected' : '';
        options.push(`<option value="${escapeInventoryAttribute(model)}" ${isSelected}>${model}</option>`);
    });

    return options.join('');
}

function renderInventoryThresholdModelRow(rule = {}) {
    const warningValue = Number(rule?.warning);
    const criticalValue = Number(rule?.critical);

    return `
        <div class="rounded-xl border border-gray-200 bg-gray-50 p-4" data-threshold-model-row>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Model</label>
                    <select data-field="model" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
                        ${buildInventoryThresholdModelOptions(rule?.model || '')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Warning <= boxes</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        data-field="warning"
                        value="${Number.isFinite(warningValue) ? warningValue : ''}"
                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
                </div>
                <div class="flex items-end gap-3">
                    <div class="flex-1">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Critical <= boxes</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            data-field="critical"
                            value="${Number.isFinite(criticalValue) ? criticalValue : ''}"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
                    </div>
                    <button type="button" onclick="removeInventoryThresholdModelRow(this)" class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors" title="Remove model rule">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function refreshInventoryThresholdModelState() {
    const rows = document.querySelectorAll('#inventoryThresholdModelRows [data-threshold-model-row]');
    const emptyState = document.getElementById('inventoryThresholdModelEmptyState');
    const count = document.getElementById('inventoryThresholdModelRuleCount');

    if (emptyState) {
        emptyState.classList.toggle('hidden', rows.length > 0);
    }

    if (count) {
        count.textContent = `${rows.length} rule${rows.length === 1 ? '' : 's'}`;
    }
}

function renderInventoryThresholdDrawerContent() {
    const drawerContent = document.getElementById('inventoryThresholdDrawerContent');
    if (!drawerContent) return;

    const config = normalizeInventoryThresholdConfig(inventoryThresholdConfig);

    drawerContent.innerHTML = `
        <div class="space-y-6">
            <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <div class="flex items-start gap-3">
                    <i class="ri-information-line text-lg text-amber-600 mt-0.5"></i>
                    <div>
                        <p class="text-sm font-semibold text-amber-900">Alert evaluation</p>
                        <p class="mt-1 text-sm text-amber-800">Items at or below the critical physical box count turn red. Items above critical but at or below warning turn amber.</p>
                        <p class="mt-2 text-xs text-amber-700">${buildInventoryThresholdUpdatedText(config)}</p>
                    </div>
                </div>
            </div>

            <div class="rounded-2xl border border-gray-200 p-5">
                <div class="mb-4">
                    <h4 class="text-lg font-semibold text-gray-900">Global Default</h4>
                    <p class="mt-1 text-sm text-gray-500">This applies to every inventory item unless a model override exists. Values are in Boxes In Stock (physical boxes).</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Warning threshold (boxes)</label>
                        <input
                            type="number"
                            id="inventoryThresholdGlobalWarning"
                            min="0"
                            step="0.01"
                            value="${config.global.warning}"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Critical threshold (boxes)</label>
                        <input
                            type="number"
                            id="inventoryThresholdGlobalCritical"
                            min="0"
                            step="0.01"
                            value="${config.global.critical}"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200">
                    </div>
                </div>
            </div>

            <div class="rounded-2xl border border-gray-200 p-5">
                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                        <h4 class="text-lg font-semibold text-gray-900">Model Overrides</h4>
                        <p class="mt-1 text-sm text-gray-500">Use overrides when a specific model needs tighter or looser limits than the global default.</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span id="inventoryThresholdModelRuleCount" class="text-xs font-semibold uppercase tracking-wide text-gray-500"></span>
                        <button type="button" onclick="addInventoryThresholdModelRow()" class="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors">
                            <i class="ri-add-line mr-2"></i>
                            Add model rule
                        </button>
                    </div>
                </div>

                <div id="inventoryThresholdModelEmptyState" class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                    No model overrides yet. The global threshold will be used for every item.
                </div>

                <div id="inventoryThresholdModelRows" class="space-y-3">
                    ${config.models.map((rule) => renderInventoryThresholdModelRow(rule)).join('')}
                </div>
            </div>
        </div>
    `;

    refreshInventoryThresholdModelState();
}

window.openInventoryThresholdDrawer = async function() {
    const drawer = document.getElementById('inventoryThresholdDrawer');
    if (!drawer) return;

    drawer.classList.remove('hidden');
    setInventoryThresholdDrawerLoadingState();

    try {
        await ensureInventoryThresholdModelsLoaded();
        await loadInventoryThresholdConfig({ silent: false });
        renderInventoryThresholdDrawerContent();
    } catch (error) {
        console.error('Unable to open inventory threshold drawer:', error);
    }
};

window.closeInventoryThresholdDrawer = function() {
    const drawer = document.getElementById('inventoryThresholdDrawer');
    if (drawer) {
        drawer.classList.add('hidden');
    }
};

window.addInventoryThresholdModelRow = async function() {
    await ensureInventoryThresholdModelsLoaded();

    const rowsContainer = document.getElementById('inventoryThresholdModelRows');
    if (!rowsContainer) return;

    rowsContainer.insertAdjacentHTML('beforeend', renderInventoryThresholdModelRow());
    refreshInventoryThresholdModelState();
};

window.removeInventoryThresholdModelRow = function(button) {
    const row = button?.closest('[data-threshold-model-row]');
    if (row) {
        row.remove();
        refreshInventoryThresholdModelState();
    }
};

function parseInventoryThresholdInputValue(value, label) {
    const numericValue = Number(String(value ?? '').trim());
    if (!Number.isFinite(numericValue) || numericValue < 0) {
        throw new Error(`${label} must be 0 or higher.`);
    }

    return Math.round(numericValue * 100) / 100;
}

function collectInventoryThresholdConfigFromForm() {
    const globalWarning = parseInventoryThresholdInputValue(
        document.getElementById('inventoryThresholdGlobalWarning')?.value,
        'Global warning threshold (boxes)'
    );
    const globalCritical = parseInventoryThresholdInputValue(
        document.getElementById('inventoryThresholdGlobalCritical')?.value,
        'Global critical threshold (boxes)'
    );

    if (globalCritical > globalWarning) {
        throw new Error('Global critical threshold cannot exceed the warning threshold.');
    }

    const seenModels = new Set();
    const modelRules = Array.from(document.querySelectorAll('#inventoryThresholdModelRows [data-threshold-model-row]'))
        .map((row) => {
            const model = String(row.querySelector('[data-field="model"]')?.value || '').trim();
            const warningRaw = row.querySelector('[data-field="warning"]')?.value;
            const criticalRaw = row.querySelector('[data-field="critical"]')?.value;

            if (!model && !String(warningRaw || '').trim() && !String(criticalRaw || '').trim()) {
                return null;
            }

            if (!model) {
                throw new Error('Select a model for every override rule.');
            }

            if (seenModels.has(model)) {
                throw new Error(`Model override already exists for ${model}.`);
            }

            const warning = parseInventoryThresholdInputValue(warningRaw, `${model} warning threshold (boxes)`);
            const critical = parseInventoryThresholdInputValue(criticalRaw, `${model} critical threshold (boxes)`);

            if (critical > warning) {
                throw new Error(`Critical threshold cannot exceed warning threshold for ${model}.`);
            }

            seenModels.add(model);
            return {
                model,
                warning,
                critical
            };
        })
        .filter(Boolean);

    return {
        global: {
            warning: globalWarning,
            critical: globalCritical
        },
        models: modelRules
    };
}

window.saveInventoryThresholdConfig = async function() {
    const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
    if (currentUser.role !== 'admin') {
        alert('Only admin can update threshold rules.');
        return;
    }

    try {
        const config = collectInventoryThresholdConfigFromForm();
        const fullNameElement = document.getElementById('userFullName');
        const fullName = fullNameElement ? fullNameElement.textContent.trim() : (currentUser.username || 'admin');

        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'saveThresholdConfig',
                role: currentUser.role,
                submittedBy: currentUser.username || 'admin',
                fullName,
                config
            })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to save threshold rules');
        }

        inventoryThresholdConfig = normalizeInventoryThresholdConfig(result.data);
        closeInventoryThresholdDrawer();
        await loadInventoryData();
        alert('Inventory threshold rules saved.');
    } catch (error) {
        console.error('Failed to save inventory threshold config:', error);
        alert(error.message || 'Failed to save threshold rules.');
    }
};

// ==================== END MODEL FILTER & TAGGING ====================

/**
 * Update filter dropdown options
 */
function updateInventoryFilterOptions(options) {
    // Update part number filter
    const partNumberFilter = document.getElementById('inventoryPartNumberFilter');
    const currentPartNumber = partNumberFilter.value;
    partNumberFilter.innerHTML = `<option value="">${t('allPartNumbers')}</option>`;
    options.partNumbers.forEach(partNumber => {
        const option = document.createElement('option');
        option.value = partNumber;
        option.textContent = partNumber;
        if (partNumber === currentPartNumber) option.selected = true;
        partNumberFilter.appendChild(option);
    });

    // Update back number filter
    const backNumberFilter = document.getElementById('inventoryBackNumberFilter');
    const currentBackNumber = backNumberFilter.value;
    backNumberFilter.innerHTML = `<option value="">${t('allBackNumbers')}</option>`;
    options.backNumbers.forEach(backNumber => {
        const option = document.createElement('option');
        option.value = backNumber;
        option.textContent = backNumber;
        if (backNumber === currentBackNumber) option.selected = true;
        backNumberFilter.appendChild(option);
    });
}

/**
 * Show loading state
 */
function showInventoryLoadingState(overrideLabel = '') {
    const container = document.getElementById('inventoryTableContainer');
    const loadingLabel = overrideLabel || (inventorySnapshotState.snapshotAt
        ? t('loadingInventorySnapshot')
        : t('loadingInventory'));
    container.innerHTML = `<div class="p-8 text-center text-gray-500"><i class="ri-loader-4-line animate-spin text-2xl mr-2"></i>${loadingLabel}</div>`;
}

/**
 * Show error state
 */
function showInventoryErrorState(errorMessage) {
    const container = document.getElementById('inventoryTableContainer');
    container.innerHTML = `
        <div class="p-8 text-center text-red-500">
            <i class="ri-error-warning-line text-2xl mr-2"></i>
            Error: ${errorMessage}
            <br><button class="mt-2 text-blue-500 hover:underline" onclick="loadInventoryData()">Retry</button>
        </div>
    `;
}

// ==================== INVENTORY TRANSACTIONS MODAL ====================

/**
 * Open inventory transactions modal
 */
window.openInventoryTransactions = async function(backNumber, options = {}) {
    const normalizedBackNumber = String(backNumber || '').trim();
    if (!normalizedBackNumber) {
        return;
    }

    const isSameItem = inventoryTransactionsState.backNumber === normalizedBackNumber;
    const nextPage = normalizeInventoryTransactionsPositiveInteger(
        options.page ?? (isSameItem ? inventoryTransactionsState.currentPage : 1),
        1
    );
    const nextItemsPerPage = normalizeInventoryTransactionsPageSize(
        options.itemsPerPage ?? (isSameItem ? inventoryTransactionsState.itemsPerPage : 10),
        10
    );

    inventoryTransactionsState = {
        ...inventoryTransactionsState,
        backNumber: normalizedBackNumber,
        currentPage: nextPage,
        itemsPerPage: nextItemsPerPage
    };

    try {
        const modal = document.getElementById('inventoryTransactionsModal');
        const content = document.getElementById('inventoryTransactionsContent');
        
        // Show loading state
        content.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="ri-loader-4-line animate-spin text-2xl mr-2"></i>
                ${t('loadingTransactions')}
            </div>
        `;
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Fetch transactions
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getItemTransactions',
                背番号: normalizedBackNumber,
                page: nextPage,
                limit: nextItemsPerPage
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                const paginationInfo = result.pagination || {};
                const currentPage = Number(paginationInfo.currentPage) > 0
                    ? Number(paginationInfo.currentPage)
                    : nextPage;
                const totalPages = Number(paginationInfo.totalPages) >= 0
                    ? Number(paginationInfo.totalPages)
                    : 0;
                const totalItems = Number(paginationInfo.totalItems) >= 0
                    ? Number(paginationInfo.totalItems)
                    : 0;
                const itemsPerPage = normalizeInventoryTransactionsPageSize(
                    paginationInfo.itemsPerPage,
                    nextItemsPerPage
                );

                inventoryTransactionsState = {
                    backNumber: normalizedBackNumber,
                    currentPage: totalPages > 0 ? currentPage : 1,
                    itemsPerPage,
                    totalPages,
                    totalItems
                };

                renderInventoryTransactions(
                    Array.isArray(result.data) ? result.data : [],
                    normalizedBackNumber,
                    result.currentItem || null,
                    inventoryTransactionsState
                );
            } else {
                throw new Error(result.error || 'Failed to load transactions');
            }
        } else {
            throw new Error('Failed to fetch transactions');
        }
        
    } catch (error) {
        console.error('Error opening inventory transactions:', error);
        const content = document.getElementById('inventoryTransactionsContent');
        content.innerHTML = `
            <div class="p-8 text-center text-red-500">
                <i class="ri-error-warning-line text-2xl mr-2"></i>
                Error loading transactions: ${error.message}
            </div>
        `;
    }
};

/**
 * Render inventory transactions
 */
function renderInventoryTransactions(transactions, backNumber, currentItem = null, paginationInfo = inventoryTransactionsState) {
    const content = document.getElementById('inventoryTransactionsContent');
    const transactionList = Array.isArray(transactions) ? transactions : [];
    const currentStateItem = currentItem || transactionList[0] || null;
    
    if (!currentStateItem) {
        content.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="ri-inbox-line text-4xl mb-4"></i>
                <p>${t('noTransactionsFound')} ${backNumber}</p>
            </div>
        `;
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const isAdmin = currentUser.role === 'admin';
    const currentPhysicalQuantity = currentStateItem.physicalQuantity ?? currentStateItem.runningQuantity ?? 0;
    const currentStockBoxCount = currentStateItem.stockBoxCount;
    const currentReservedQuantity = currentStateItem.reservedQuantity ?? 0;
    const currentAvailableQuantity = currentStateItem.availableQuantity ?? currentStateItem.runningQuantity ?? 0;
    const currentPage = Number(paginationInfo.currentPage) || 1;
    const totalPages = Number(paginationInfo.totalPages) || 0;
    
    const contentHTML = `
        <div class="space-y-6">
            <!-- Current State Summary -->
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="text-lg font-semibold text-blue-900">${t('serialNumber')}: ${backNumber}</h4>
                    ${currentStateItem.工場 ? `
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-600 text-white">
                            <i class="ri-building-line mr-1.5"></i>
                            ${currentStateItem.工場}
                        </span>
                    ` : ''}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div class="text-center">
                        <p class="text-sm text-blue-600">${t('partNumber')}</p>
                        <p class="text-lg font-bold text-blue-900">${currentStateItem.品番}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-green-600">${t('physicalStock')}</p>
                        <p class="text-lg font-bold text-green-700">${currentPhysicalQuantity}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-yellow-600">${t('reservedStock')}</p>
                        <p class="text-lg font-bold text-yellow-700">${currentReservedQuantity}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-sky-600">${t('stockBoxCount')}</p>
                        <p class="text-lg font-bold text-sky-700">${formatInventoryBoxCount(currentStockBoxCount)}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-purple-600">${t('availableStock')}</p>
                        <p class="text-lg font-bold text-purple-700">${currentAvailableQuantity}</p>
                    </div>
                </div>
            </div>

            ${isAdmin ? `
            <!-- Admin Controls -->
            <div class="flex flex-wrap justify-end gap-2">
                <button 
                    onclick="toggleAdminInventoryAdjustment()"
                    class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors flex items-center">
                    <i class="ri-edit-2-line mr-2"></i>
                    現在在庫を調整
                </button>
                <button 
                    onclick="toggleAdminReset()"
                    class="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors flex items-center">
                    <i class="ri-refresh-line mr-2"></i>
                    在庫リセット
                </button>
            </div>

            <div id="adminInventoryAdjustSection" class="bg-indigo-50 p-4 rounded-lg border border-indigo-200 hidden">
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <h4 class="text-lg font-semibold text-indigo-900">管理者 在庫調整</h4>
                        <p class="text-sm text-indigo-700">棚卸しと同じ方式で現在の物理在庫を更新し、新しい履歴を追加します。引当在庫は維持され、利用可能在庫は自動で再計算されます。</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">現在の物理在庫</label>
                        <div class="px-3 py-2 rounded-lg bg-white border border-indigo-100 text-gray-900 font-semibold">${currentPhysicalQuantity}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">現在の引当在庫</label>
                        <div class="px-3 py-2 rounded-lg bg-white border border-indigo-100 text-gray-900 font-semibold">${currentReservedQuantity}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">新しい物理在庫</label>
                        <input type="number" id="adminInventoryAdjustPhysical" min="0" step="1" value="${currentPhysicalQuantity}" class="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    </div>
                </div>
                <button 
                    onclick="submitInventoryAdjustment(decodeURIComponent('${encodeURIComponent(backNumber)}'), decodeURIComponent('${encodeURIComponent(currentStateItem.品番 || '')}'), decodeURIComponent('${encodeURIComponent(currentStateItem.工場 || '')}'), ${currentPhysicalQuantity})"
                    class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
                    <i class="ri-save-line mr-2"></i>
                    在庫を更新
                </button>
            </div>

            <!-- Admin Reset Controls (Hidden by default) -->
            <div id="adminResetSection" class="bg-red-50 p-4 rounded-lg border border-red-200 hidden">
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <h4 class="text-lg font-semibold text-red-900">管理者リセット</h4>
                        <p class="text-sm text-red-600">在庫をゼロにリセットします（監査証跡が作成されます）</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" id="resetPhysical" class="w-4 h-4 text-red-600 rounded focus:ring-red-500" checked>
                        <span class="text-sm text-gray-700">物理在庫をリセット（利用可能も自動リセット）</span>
                    </label>
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" id="resetReserved" class="w-4 h-4 text-red-600 rounded focus:ring-red-500">
                        <span class="text-sm text-gray-700">引当在庫をリセット</span>
                    </label>
                </div>
                <button 
                    onclick="confirmInventoryReset(decodeURIComponent('${encodeURIComponent(backNumber)}'), decodeURIComponent('${encodeURIComponent(currentStateItem.品番 || '')}'), ${currentPhysicalQuantity}, ${currentReservedQuantity}, ${currentAvailableQuantity}, decodeURIComponent('${encodeURIComponent(currentStateItem.工場 || '')}'))"
                    class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
                    <i class="ri-refresh-line mr-2"></i>
                    在庫をリセット
                </button>
            </div>
            ` : ''}

            <!-- Transaction History -->
            <div>
                <div class="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h4 class="text-lg font-semibold text-gray-900">${t('transactionHistory')}</h4>
                        <p class="text-sm text-gray-500">${getInventoryTransactionsPageRangeLabel(paginationInfo)}</p>
                    </div>
                    <label class="inline-flex items-center gap-2 text-sm text-gray-600">
                        <span>${t('itemsPerPage')}</span>
                        <select
                            id="inventoryTransactionsItemsPerPage"
                            class="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onchange="changeInventoryTransactionsPageSize(this.value)">
                            ${INVENTORY_TRANSACTION_PAGE_SIZE_OPTIONS.map((pageSize) => `
                                <option value="${pageSize}" ${pageSize === paginationInfo.itemsPerPage ? 'selected' : ''}>${pageSize}</option>
                            `).join('')}
                        </select>
                    </label>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm border border-gray-200 rounded-lg">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left font-medium text-gray-700">${t('dateTime')}</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-700">${t('action')}</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-700">${t('physical')}</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-700">${t('reserved')}</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-700">${t('available')}</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-700">${t('source')}</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-700">${t('note')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactionList.map((transaction, index) => {
                                const timestamp = new Date(transaction.timeStamp).toLocaleString();
                                const actionInfo = getTransactionActionInfo(transaction.action);
                                const physicalValue = transaction.physicalQuantity ?? transaction.runningQuantity ?? 0;
                                const reservedValue = transaction.reservedQuantity ?? 0;
                                const availableValue = transaction.availableQuantity ?? transaction.runningQuantity ?? 0;
                                
                                return `
                                    <tr class="border-b hover:bg-gray-50 ${currentPage === 1 && index === 0 ? 'bg-blue-50' : ''}">
                                        <td class="px-4 py-3 text-gray-600">${timestamp}</td>
                                        <td class="px-4 py-3">
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionInfo.badgeClass}">
                                                <i class="${actionInfo.icon} mr-1"></i>
                                                ${transaction.action}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-green-600 font-medium">${physicalValue}</td>
                                        <td class="px-4 py-3 text-yellow-600 font-medium">${reservedValue}</td>
                                        <td class="px-4 py-3 text-purple-600 font-medium">${availableValue}</td>
                                        <td class="px-4 py-3 text-gray-600 text-xs">${transaction.source || t('system')}</td>
                                        <td class="px-4 py-3 text-gray-600 text-xs">${transaction.note || transaction.migrationNote || '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                ${totalPages > 1 ? `
                    <div class="flex flex-col gap-3 mt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p class="text-sm text-gray-500">${t('page')} ${currentPage} / ${totalPages}</p>
                        <div class="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onclick="changeInventoryTransactionsPage(-1)"
                                class="px-3 py-2 border rounded-lg text-sm transition-colors ${currentPage <= 1 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
                                ${currentPage <= 1 ? 'disabled' : ''}>
                                ${t('previous')}
                            </button>
                            ${buildInventoryTransactionsPageButtons(paginationInfo)}
                            <button
                                type="button"
                                onclick="changeInventoryTransactionsPage(1)"
                                class="px-3 py-2 border rounded-lg text-sm transition-colors ${currentPage >= totalPages ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
                                ${currentPage >= totalPages ? 'disabled' : ''}>
                                ${t('next')}
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    content.innerHTML = contentHTML;
}

function getInventoryTransactionsPageRangeLabel(paginationInfo) {
    const totalItems = Number(paginationInfo.totalItems) || 0;
    if (totalItems === 0) {
        return t('noItemsToDisplay');
    }

    const currentPage = Number(paginationInfo.currentPage) || 1;
    const itemsPerPage = Number(paginationInfo.itemsPerPage) || 10;
    const startItem = ((currentPage - 1) * itemsPerPage) + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return `${startItem}-${endItem} / ${totalItems}`;
}

function buildInventoryTransactionsPageButtons(paginationInfo) {
    const currentPage = Number(paginationInfo.currentPage) || 1;
    const totalPages = Number(paginationInfo.totalPages) || 0;
    let buttonsHtml = '';

    for (let pageNumber = Math.max(1, currentPage - 2); pageNumber <= Math.min(totalPages, currentPage + 2); pageNumber++) {
        buttonsHtml += `
            <button
                type="button"
                onclick="goToInventoryTransactionsPage(${pageNumber})"
                class="px-3 py-2 border rounded-lg text-sm transition-colors ${pageNumber === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
                ${pageNumber === currentPage ? 'aria-current="page"' : ''}>
                ${pageNumber}
            </button>
        `;
    }

    return buttonsHtml;
}

window.changeInventoryTransactionsPage = async function(direction) {
    if (!inventoryTransactionsState.backNumber) {
        return;
    }

    const targetPage = inventoryTransactionsState.currentPage + Number(direction || 0);
    if (targetPage < 1 || (inventoryTransactionsState.totalPages > 0 && targetPage > inventoryTransactionsState.totalPages)) {
        return;
    }

    await openInventoryTransactions(inventoryTransactionsState.backNumber, {
        page: targetPage,
        itemsPerPage: inventoryTransactionsState.itemsPerPage
    });
};

window.goToInventoryTransactionsPage = async function(page) {
    const targetPage = normalizeInventoryTransactionsPositiveInteger(page, 1);
    if (!inventoryTransactionsState.backNumber) {
        return;
    }

    await openInventoryTransactions(inventoryTransactionsState.backNumber, {
        page: targetPage,
        itemsPerPage: inventoryTransactionsState.itemsPerPage
    });
};

window.changeInventoryTransactionsPageSize = async function(pageSize) {
    if (!inventoryTransactionsState.backNumber) {
        return;
    }

    await openInventoryTransactions(inventoryTransactionsState.backNumber, {
        page: 1,
        itemsPerPage: normalizeInventoryTransactionsPageSize(pageSize, 10)
    });
};

/**
 * Get transaction action information for display
 */
function getTransactionActionInfo(action) {
    if (action.includes('Reservation')) {
        return { icon: 'ri-bookmark-line', badgeClass: 'bg-yellow-100 text-yellow-800' };
    } else if (action.includes('棚卸し')) {
        return { icon: 'ri-scales-3-line', badgeClass: 'bg-indigo-100 text-indigo-800' };
    } else if (action.includes('Completed') || action.includes('Picked')) {
        return { icon: 'ri-checkbox-circle-line', badgeClass: 'bg-green-100 text-green-800' };
    } else if (action.includes('Failed') || action.includes('Cancelled')) {
        return { icon: 'ri-close-circle-line', badgeClass: 'bg-red-100 text-red-800' };
    } else if (action.includes('Migration') || action.includes('Setup')) {
        return { icon: 'ri-settings-line', badgeClass: 'bg-blue-100 text-blue-800' };
    } else if (action.includes('Delivery') || action.includes('Stock')) {
        return { icon: 'ri-truck-line', badgeClass: 'bg-purple-100 text-purple-800' };
    } else {
        return { icon: 'ri-information-line', badgeClass: 'bg-gray-100 text-gray-800' };
    }
}

/**
 * Close inventory transactions modal
 */
window.closeInventoryTransactionsModal = function() {
    const modal = document.getElementById('inventoryTransactionsModal');
    modal.classList.add('hidden');
    inventoryTransactionsState = createDefaultInventoryTransactionsState();
    // Reset admin section visibility when closing modal
    const adminSection = document.getElementById('adminResetSection');
    if (adminSection) {
        adminSection.classList.add('hidden');
    }
    const adjustSection = document.getElementById('adminInventoryAdjustSection');
    if (adjustSection) {
        adjustSection.classList.add('hidden');
    }
};

/**
 * Toggle admin reset section visibility
 */
window.toggleAdminReset = function() {
    const adminSection = document.getElementById('adminResetSection');
    const adjustSection = document.getElementById('adminInventoryAdjustSection');
    if (adjustSection) {
        adjustSection.classList.add('hidden');
    }
    if (adminSection) {
        adminSection.classList.toggle('hidden');
    }
};

/**
 * Toggle admin inventory adjustment section visibility
 */
window.toggleAdminInventoryAdjustment = function() {
    const adjustSection = document.getElementById('adminInventoryAdjustSection');
    const adminSection = document.getElementById('adminResetSection');
    if (adminSection) {
        adminSection.classList.add('hidden');
    }
    if (adjustSection) {
        adjustSection.classList.toggle('hidden');
        if (!adjustSection.classList.contains('hidden')) {
            const input = document.getElementById('adminInventoryAdjustPhysical');
            if (input) {
                input.focus();
                input.select();
            }
        }
    }
};

/**
 * Submit admin inventory adjustment using tanaoroshi-style transaction logic
 */
window.submitInventoryAdjustment = async function(backNumber, partNumber, factory, currentPhysical) {
    const quantityInput = document.getElementById('adminInventoryAdjustPhysical');
    const newPhysicalQuantity = Number(quantityInput ? quantityInput.value : NaN);

    if (!Number.isFinite(newPhysicalQuantity) || newPhysicalQuantity < 0) {
        alert('新しい物理在庫を正しく入力してください');
        return;
    }

    const normalizedNewPhysicalQuantity = Math.floor(newPhysicalQuantity);
    const difference = normalizedNewPhysicalQuantity - Number(currentPhysical || 0);
    const confirmMessage = `現在在庫を更新しますか？\n\n背番号: ${backNumber}\n品番: ${partNumber}\n物理在庫: ${currentPhysical} → ${normalizedNewPhysicalQuantity}\n差分: ${difference >= 0 ? '+' : ''}${difference}\n\n新しい履歴が追加されます。`;

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
        const fullNameElement = document.getElementById('userFullName');
        const fullName = fullNameElement ? fullNameElement.textContent.trim() : (currentUser.username || 'admin');

        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'adjustInventory',
                backNumber: backNumber,
                partNumber: partNumber,
                factory: factory,
                newPhysicalQuantity: normalizedNewPhysicalQuantity,
                submittedBy: currentUser.username || 'admin',
                fullName: fullName,
                role: currentUser.role || ''
            })
        });

        if (!response.ok) {
            throw new Error('Failed to adjust inventory');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Inventory adjustment failed');
        }

        alert('✅ 現在在庫が更新されました');
        await openInventoryTransactions(backNumber, {
            page: 1,
            itemsPerPage: inventoryTransactionsState.itemsPerPage
        });
        loadInventoryData();
    } catch (error) {
        console.error('Error adjusting inventory:', error);
        alert('❌ 在庫更新に失敗しました: ' + error.message);
    }
};

/**
 * Confirm inventory reset
 */
window.confirmInventoryReset = async function(backNumber, partNumber, currentPhysical, currentReserved, currentAvailable, factory) {
    const resetPhysical = document.getElementById('resetPhysical').checked;
    const resetReserved = document.getElementById('resetReserved').checked;
    // Available is automatically reset when physical is reset
    const resetAvailable = resetPhysical;
    
    if (!resetPhysical && !resetReserved) {
        alert('少なくとも1つの項目を選択してください');
        return;
    }
    
    // Check if there's actually anything to reset
    const hasPhysicalToReset = resetPhysical && (currentPhysical !== 0 || currentAvailable !== 0);
    const hasReservedToReset = resetReserved && currentReserved !== 0;
    
    if (!hasPhysicalToReset && !hasReservedToReset) {
        alert('リセットする必要はありません。\n\n選択した在庫はすでにゼロです。');
        return;
    }
    
    const resetItems = [];
    if (resetPhysical) {
        resetItems.push(`物理在庫: ${currentPhysical} → 0`);
        resetItems.push(`利用可能: ${currentAvailable} → 0`);
    }
    if (resetReserved) resetItems.push(`引当在庫: ${currentReserved} → 0`);
    
    const confirmMessage = `在庫をリセットしますか？\n\n背番号: ${backNumber}\n品番: ${partNumber}\n\n${resetItems.join('\n')}\n\n⚠️ この操作は取り消せません。監査証跡が作成されます。`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const fullNameElement = document.getElementById('userFullName');
        const fullName = fullNameElement ? fullNameElement.textContent.trim() : (currentUser.username || 'admin');
        
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'resetInventory',
                backNumber: backNumber,
                partNumber: partNumber,
                currentPhysical: currentPhysical,
                currentReserved: currentReserved,
                currentAvailable: currentAvailable,
                resetPhysical: resetPhysical,
                resetReserved: resetReserved,
                resetAvailable: resetAvailable,
                factory: factory,
                submittedBy: currentUser.username || 'admin',
                fullName: fullName
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to reset inventory');
        }
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ 在庫がリセットされました');
            closeInventoryTransactionsModal();
            loadInventoryData(); // Reload inventory table
        } else {
            throw new Error(result.error || 'Reset failed');
        }
        
    } catch (error) {
        console.error('Error resetting inventory:', error);
        alert('❌ 在庫のリセットに失敗しました: ' + error.message);
    }
};

// ==================== ADD INVENTORY FUNCTIONALITY ====================

/**
 * Open add inventory modal
 */
window.openInventoryAddModal = function() {
    const modal = document.getElementById('inventoryAddModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Clear form
    clearInventoryAddModalForm();
    
    // Setup autofill functionality
    setupInventoryModalAutoGeneration();
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('addInventory品番').focus();
    }, 100);
};

/**
 * Close add inventory modal
 */
window.closeInventoryAddModal = function() {
    const modal = document.getElementById('inventoryAddModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    clearInventoryAddModalForm();
};

/**
 * Clear add inventory modal form
 */
function clearInventoryAddModalForm() {
    document.getElementById('addInventory品番').value = '';
    document.getElementById('addInventory背番号').value = '';
    document.getElementById('addInventoryQuantity').value = '';
    
    // Clear any error states
    const errorElements = document.querySelectorAll('.inventory-field-error');
    errorElements.forEach(el => el.remove());
    
    // Reset field styles
    const fields = ['addInventory品番', 'addInventory背番号', 'addInventoryQuantity'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.remove('border-red-500');
        }
    });
}

/**
 * Setup auto-generation for part number and back number
 */
function setupInventoryModalAutoGeneration() {
    const partNumberField = document.getElementById('addInventory品番');
    const backNumberField = document.getElementById('addInventory背番号');
    
    // Remove existing listeners to avoid duplicates
    partNumberField.removeEventListener('blur', handleInventoryPartNumberBlur);
    backNumberField.removeEventListener('blur', handleInventoryBackNumberBlur);
    
    // Add new listeners
    partNumberField.addEventListener('blur', handleInventoryPartNumberBlur);
    backNumberField.addEventListener('blur', handleInventoryBackNumberBlur);
}

/**
 * Handle part number blur for auto-generation
 */
async function handleInventoryPartNumberBlur() {
    const partNumber = document.getElementById('addInventory品番').value.trim();
    const backNumberField = document.getElementById('addInventory背番号');
    
    if (partNumber && !backNumberField.value.trim()) {
        try {
            const masterData = await lookupInventoryMasterData({ 品番: partNumber });
            if (masterData && masterData.背番号) {
                backNumberField.value = masterData.背番号;
                showInventoryAutoGenerationNotification('背番号', masterData.背番号);
            }
        } catch (error) {
            console.error('Error looking up master data:', error);
        }
    }
}

/**
 * Handle back number blur for auto-generation
 */
async function handleInventoryBackNumberBlur() {
    const backNumber = document.getElementById('addInventory背番号').value.trim();
    const partNumberField = document.getElementById('addInventory品番');
    
    if (backNumber && !partNumberField.value.trim()) {
        try {
            const masterData = await lookupInventoryMasterData({ 背番号: backNumber });
            if (masterData && masterData.品番) {
                partNumberField.value = masterData.品番;
                showInventoryAutoGenerationNotification('品番', masterData.品番);
            }
        } catch (error) {
            console.error('Error looking up master data:', error);
        }
    }
}

/**
 * Lookup master data from database
 */
async function lookupInventoryMasterData(query) {
    try {
        const response = await fetch(`${BASE_URL}api/noda-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'lookupMasterData',
                ...query
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                return result.data;
            }
        }
        return null;
    } catch (error) {
        console.error('Error looking up master data:', error);
        return null;
    }
}

/**
 * Show auto-generation notification
 */
function showInventoryAutoGenerationNotification(fieldName, value) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
    notification.textContent = `${fieldName} ${t('autoFilled')}: ${value}`;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

/**
 * Handle add inventory form submission
 */
async function handleInventoryAddFormSubmit(event) {
    event.preventDefault();
    
    const partNumber = document.getElementById('addInventory品番').value.trim();
    const backNumber = document.getElementById('addInventory背番号').value.trim();
    const quantity = parseInt(document.getElementById('addInventoryQuantity').value.trim());
    
    // Validate required fields
    let hasErrors = false;

    if (!partNumber) {
        showInventoryFieldError('addInventory品番', t('partNumberRequired'));
        hasErrors = true;
    }

    if (!backNumber) {
        showInventoryFieldError('addInventory背番号', t('serialNumberRequired'));
        hasErrors = true;
    }

    if (!quantity || quantity <= 0) {
        showInventoryFieldError('addInventoryQuantity', t('quantityMustBePositive'));
        hasErrors = true;
    }
    
    if (hasErrors) return;
    
    // Validate that part number and back number exist in master database
    try {
        const masterData = await lookupInventoryMasterData({ 品番: partNumber, 背番号: backNumber });
        if (!masterData) {
            showInventoryFieldError('addInventory品番', 'Part number and back number combination not found in master database');
            return;
        }
    } catch (error) {
        showInventoryFieldError('addInventory品番', 'Error validating master data');
        return;
    }
    
    try {
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        
        // Get user full name
        const userFullName = await getUserFullName(currentUser.username);
        
        // Get current date in YYYY-MM-DD format
        const currentDate = new Date().toISOString().split('T')[0];
        
        const inventoryData = {
            品番: partNumber,
            背番号: backNumber,
            physicalQuantityChange: quantity,
            action: 'Manual Inventory Add',
            source: `Freya Admin - ${userFullName || currentUser.username || 'Unknown User'}`,
            Date: currentDate,
            timeStamp: new Date()
        };
        
        // Submit the request
        const response = await fetch(`${BASE_URL}api/inventory/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(inventoryData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Close modal and refresh data
            closeInventoryAddModal();
            
            // Add a small delay to ensure database transaction is complete
            setTimeout(() => {
                console.log('🔄 Refreshing inventory data after adding inventory...');
                loadInventoryData();
            }, 500);
            
            // Show success message
            alert(`${t('successfullyAdded')} ${quantity} ${t('units')} ${backNumber}`);
        } else {
            throw new Error(result.message || 'Failed to add inventory');
        }

    } catch (error) {
        console.error('Error adding inventory:', error);
        alert(`${t('errorAddingInventory')}: ${error.message}`);
    }
}

/**
 * Show field validation error
 */
function showInventoryFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Remove existing error
    const existingError = field.parentNode.querySelector('.inventory-field-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add error styling
    field.classList.add('border-red-500');
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'inventory-field-error text-red-500 text-sm mt-1';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
    
    // Remove error on input
    const removeError = () => {
        field.classList.remove('border-red-500');
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
        field.removeEventListener('input', removeError);
    };
    field.addEventListener('input', removeError);
}

/**
 * Get user's full name from database (same as NODA system)
 */
async function getUserFullName(username) {
    try {
        const response = await fetch(`${BASE_URL}queries`, {
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
                return `${user.firstName || ''} ${user.lastName || ''}`.trim() || username;
            }
        }
        return username; // Fallback to username if full name not found
    } catch (error) {
        console.error('Error getting user full name:', error);
        return username;
    }
}

// ==================== EXPORT FUNCTIONALITY ====================

/**
 * Export inventory data to CSV
 */
window.closeInventoryExportChoiceModal = function() {
    const modal = document.getElementById('inventoryExportChoiceModal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.openInventoryExportChoiceModal = function() {
    const modal = document.getElementById('inventoryExportChoiceModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

async function executeInventoryCsvExport({ includeSnapshot = true, exportVariant = 'current' } = {}) {
    try {
        showInventoryLoadingState(t('inventoryExportPreparing'));
        
        const filters = buildInventoryQueryFilters({ includeSnapshot });
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'exportInventoryData',
                filters
            })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        downloadInventoryCSV(data.data, {
            exportVariant,
            snapshotAt: includeSnapshot ? inventorySnapshotState.snapshotAt : null
        });
        
        loadInventoryData(); // Restore normal view
    } catch (error) {
        console.error('Error exporting inventory data:', error);
        showInventoryErrorState('Failed to export inventory data');
    }
}

window.exportInventoryData = async function() {
    if (inventorySnapshotState.snapshotAt) {
        openInventoryExportChoiceModal();
        return;
    }

    await executeInventoryCsvExport({
        includeSnapshot: false,
        exportVariant: 'current'
    });
};

window.exportInventorySnapshotCsv = async function() {
    closeInventoryExportChoiceModal();
    await executeInventoryCsvExport({
        includeSnapshot: true,
        exportVariant: 'snapshot'
    });
};

window.exportCurrentInventoryCsv = async function() {
    closeInventoryExportChoiceModal();
    await executeInventoryCsvExport({
        includeSnapshot: false,
        exportVariant: 'current'
    });
};

function buildInventoryCsvFileName({ exportVariant = 'current', snapshotAt = null } = {}) {
    if (exportVariant === 'snapshot' && snapshotAt) {
        const snapshotDate = new Date(snapshotAt);
        if (!Number.isNaN(snapshotDate.getTime())) {
            const datePart = formatInventoryLocalDateValue(snapshotDate);
            const timePart = `${String(snapshotDate.getHours()).padStart(2, '0')}${String(snapshotDate.getMinutes()).padStart(2, '0')}`;
            return `inventory_snapshot_${datePart}_${timePart}.csv`;
        }
    }

    return `inventory_data_${new Date().toISOString().split('T')[0]}.csv`;
}

/**
 * Download inventory data as CSV
 */
function downloadInventoryCSV(data, { exportVariant = 'current', snapshotAt = null } = {}) {
    if (!data || data.length === 0) {
        alert(t('noDataToExport'));
        return;
    }
    
    const headers = ['品番', '背番号', 'Model', 'Physical Stock', 'Boxes In Stock', 'Reserved Stock', 'Available Stock', 'Threshold Status', 'Warning Threshold (Boxes)', 'Critical Threshold (Boxes)', 'Threshold Rule', 'Last Updated'];
    const csvContent = [
        headers.join(','),
        ...data.map(item => [
            `"${item.品番 || ''}"`,
            `"${item.背番号 || ''}"`,
            `"${item.model || ''}"`,
            item.physicalQuantity || 0,
            formatInventoryBoxCount(item.stockBoxCount),
            item.reservedQuantity || 0,
            item.availableQuantity || 0,
            `"${item.thresholdStatus || ''}"`,
            item.thresholdWarning ?? '',
            item.thresholdCritical ?? '',
            `"${item.thresholdSource || ''}"`,
            `"${new Date(item.lastUpdated).toLocaleString('ja-JP')}"`
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = buildInventoryCsvFileName({ exportVariant, snapshotAt });
    link.click();
    URL.revokeObjectURL(link.href);
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Debounce function for search input
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==================== BATCH RESET FUNCTIONALITY ====================

let batchResetFilters = [];
let batchResetFilteredItems = [];
let batchResetSelectedItems = [];

function ensureInventoryRepairModal() {
    let modal = document.getElementById('inventoryRepairModal');
    if (modal) {
        return modal;
    }

    const modalHTML = `
        <div id="inventoryRepairModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-[70]">
            <div class="flex min-h-screen items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div class="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
                        <div>
                            <h2 class="text-xl font-semibold text-gray-900">Repair Reserved / Available</h2>
                            <p class="mt-1 text-sm text-gray-500">Reserved is recalculated from open NODA line items. Available is recalculated as physical - reserved and may be negative.</p>
                        </div>
                        <button id="inventoryRepairCloseBtn" onclick="closeInventoryRepairModal()" class="text-gray-400 hover:text-gray-600">
                            <i class="ri-close-line text-2xl"></i>
                        </button>
                    </div>
                    <div id="inventoryRepairModalBanner" class="px-6 py-4 border-b border-gray-200 bg-slate-50"></div>
                    <div id="inventoryRepairModalContent" class="flex-1 overflow-auto px-6 py-4"></div>
                    <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
                        <div id="inventoryRepairSelectionSummary" class="text-sm text-gray-500">Loading repair preview...</div>
                        <div class="flex items-center gap-3">
                            <button onclick="closeInventoryRepairModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                                Close
                            </button>
                            <button id="inventoryRepairApplyBtn" onclick="applyInventoryRepair()" disabled class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                Apply Repair
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById('inventoryRepairModal');
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeInventoryRepairModal();
        }
    });

    return modal;
}

function formatInventoryRepairNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toLocaleString() : '-';
}

function formatInventoryRepairRequestSummary(requestNumbers = []) {
    const normalizedRequestNumbers = [...new Set((requestNumbers || []).map((value) => String(value || '').trim()).filter(Boolean))];
    if (normalizedRequestNumbers.length <= 4) {
        return normalizedRequestNumbers.join(', ');
    }

    return `${normalizedRequestNumbers.slice(0, 4).join(', ')} +${normalizedRequestNumbers.length - 4} more`;
}

function renderInventoryRepairBanner(summary = {}) {
    const banner = document.getElementById('inventoryRepairModalBanner');
    if (!banner) return;

    const mismatchCount = Number(summary?.mismatchCount) || 0;
    const totalTrackedItems = Number(summary?.totalTrackedItems) || 0;

    if (inventoryRepairModalContext.trigger === 'batch-reset') {
        banner.className = 'px-6 py-4 border-b border-emerald-200 bg-emerald-50';
        banner.innerHTML = `
            <div class="flex flex-col gap-1 text-sm text-emerald-900">
                <div class="font-semibold">Batch reset completed. Repair is optional.</div>
                <div>${inventoryRepairModalContext.successCount || 0} inventory item(s) were reset${inventoryRepairModalContext.batchResetId ? ` (Batch ID: ${escapeInventoryAttribute(inventoryRepairModalContext.batchResetId)})` : ''}.</div>
                <div>${mismatchCount} open NODA-linked item(s) in this scope need repair out of ${totalTrackedItems} tracked item(s).</div>
            </div>
        `;
        return;
    }

    banner.className = 'px-6 py-4 border-b border-blue-200 bg-blue-50';
    banner.innerHTML = `
        <div class="flex flex-col gap-1 text-sm text-blue-900">
            <div class="font-semibold">Long-press repair preview</div>
            <div>This preview shows open NODA items whose reserved or available values do not match the latest inventory state.</div>
            <div>${mismatchCount} mismatch item(s) found across ${totalTrackedItems} tracked open NODA item(s).</div>
        </div>
    `;
}

function setInventoryRepairLoadingState() {
    const content = document.getElementById('inventoryRepairModalContent');
    const selectionSummary = document.getElementById('inventoryRepairSelectionSummary');
    const applyButton = document.getElementById('inventoryRepairApplyBtn');

    if (content) {
        content.innerHTML = `
            <div class="flex items-center justify-center py-16 text-sm text-gray-500">
                <i class="ri-loader-4-line animate-spin mr-2"></i>
                Loading repair preview...
            </div>
        `;
    }

    if (selectionSummary) {
        selectionSummary.textContent = 'Loading repair preview...';
    }

    if (applyButton) {
        applyButton.disabled = true;
    }
}

function getSelectedInventoryRepairBackNumbers() {
    return Array.from(document.querySelectorAll('.inventory-repair-item-checkbox:checked'))
        .map((checkbox) => checkbox.dataset.backNumber || '')
        .filter(Boolean);
}

window.toggleSelectAllInventoryRepair = function() {
    const selectAllCheckbox = document.getElementById('inventoryRepairSelectAll');
    const rowCheckboxes = document.querySelectorAll('.inventory-repair-item-checkbox');
    rowCheckboxes.forEach((checkbox) => {
        checkbox.checked = Boolean(selectAllCheckbox?.checked);
    });
    updateInventoryRepairSelectionState();
};

window.updateInventoryRepairSelectionState = function() {
    const rowCheckboxes = Array.from(document.querySelectorAll('.inventory-repair-item-checkbox'));
    const selectedBackNumbers = getSelectedInventoryRepairBackNumbers();
    const selectAllCheckbox = document.getElementById('inventoryRepairSelectAll');
    const selectionSummary = document.getElementById('inventoryRepairSelectionSummary');
    const applyButton = document.getElementById('inventoryRepairApplyBtn');

    if (selectAllCheckbox) {
        selectAllCheckbox.checked = rowCheckboxes.length > 0 && selectedBackNumbers.length === rowCheckboxes.length;
        selectAllCheckbox.indeterminate = selectedBackNumbers.length > 0 && selectedBackNumbers.length < rowCheckboxes.length;
    }

    if (selectionSummary) {
        selectionSummary.textContent = rowCheckboxes.length === 0
            ? 'No mismatches found.'
            : `${selectedBackNumbers.length} of ${rowCheckboxes.length} item(s) selected for repair`;
    }

    if (applyButton) {
        applyButton.disabled = selectedBackNumbers.length === 0;
    }
};

function renderInventoryRepairPreview(previewResult = {}) {
    const content = document.getElementById('inventoryRepairModalContent');
    const items = Array.isArray(previewResult.data) ? previewResult.data : [];
    const summary = previewResult.summary || {};

    inventoryRepairPreviewItems = items;
    renderInventoryRepairBanner(summary);

    if (!content) {
        return;
    }

    if (items.length === 0) {
        content.innerHTML = `
            <div class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-500">
                <i class="ri-checkbox-circle-line text-4xl text-emerald-500"></i>
                <div class="mt-3 text-lg font-semibold text-gray-800">No repair needed</div>
                <p class="mt-2 text-sm text-gray-500">The latest inventory records already match the open NODA requests for this scope.</p>
            </div>
        `;
        updateInventoryRepairSelectionState();
        return;
    }

    content.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Tracked Items</div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">${formatInventoryRepairNumber(summary.totalTrackedItems || items.length)}</div>
                </div>
                <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-wide text-amber-700">Mismatch Items</div>
                    <div class="mt-2 text-2xl font-semibold text-amber-900">${formatInventoryRepairNumber(summary.mismatchCount || items.length)}</div>
                </div>
                <div class="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-wide text-blue-700">Open NODA Lines</div>
                    <div class="mt-2 text-2xl font-semibold text-blue-900">${formatInventoryRepairNumber(summary.totalOpenLineCount || 0)}</div>
                </div>
            </div>

            <div class="overflow-x-auto border border-gray-200 rounded-xl">
                <table class="w-full text-sm">
                    <thead class="bg-gray-100 border-b border-gray-200">
                        <tr>
                            <th class="px-3 py-3 text-left">
                                <input id="inventoryRepairSelectAll" type="checkbox" checked onchange="toggleSelectAllInventoryRepair()" class="w-4 h-4 text-indigo-600 rounded" title="Select all repair rows">
                            </th>
                            <th class="px-3 py-3 text-left font-medium text-gray-700">品番</th>
                            <th class="px-3 py-3 text-left font-medium text-gray-700">背番号</th>
                            <th class="px-3 py-3 text-right font-medium text-gray-700">Physical</th>
                            <th class="px-3 py-3 text-right font-medium text-gray-700">Reserved Now</th>
                            <th class="px-3 py-3 text-right font-medium text-gray-700">Reserved Repair</th>
                            <th class="px-3 py-3 text-right font-medium text-gray-700">Available Now</th>
                            <th class="px-3 py-3 text-right font-medium text-gray-700">Available Repair</th>
                            <th class="px-3 py-3 text-right font-medium text-gray-700">Delta</th>
                            <th class="px-3 py-3 text-left font-medium text-gray-700">Source Requests</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item) => {
                            const reservedDeltaClass = item.deltaReservedQuantity === 0
                                ? 'text-gray-500'
                                : item.deltaReservedQuantity > 0
                                    ? 'text-amber-700 font-semibold'
                                    : 'text-green-700 font-semibold';
                            const availableRepairClass = item.repairedAvailableQuantity < 0 ? 'text-red-700 font-semibold' : 'text-slate-900 font-semibold';
                            const availableNowClass = item.currentAvailableQuantity < 0 ? 'text-red-700 font-semibold' : 'text-gray-700';
                            const requestSummary = formatInventoryRepairRequestSummary(item.requestNumbers || []);

                            return `
                                <tr class="border-b border-gray-100 hover:bg-indigo-50/40">
                                    <td class="px-3 py-3 align-top">
                                        <input
                                            type="checkbox"
                                            class="inventory-repair-item-checkbox w-4 h-4 text-indigo-600 rounded"
                                            data-back-number="${escapeInventoryAttribute(item.背番号)}"
                                            checked
                                            onchange="updateInventoryRepairSelectionState()">
                                    </td>
                                    <td class="px-3 py-3 align-top font-medium text-gray-900">${escapeInventoryAttribute(item.品番 || '-')}</td>
                                    <td class="px-3 py-3 align-top font-medium text-gray-900">${escapeInventoryAttribute(item.背番号)}</td>
                                    <td class="px-3 py-3 align-top text-right text-gray-700">${formatInventoryRepairNumber(item.currentPhysicalQuantity)}</td>
                                    <td class="px-3 py-3 align-top text-right text-gray-700">${formatInventoryRepairNumber(item.currentReservedQuantity)}</td>
                                    <td class="px-3 py-3 align-top text-right font-semibold text-amber-700">${formatInventoryRepairNumber(item.repairedReservedQuantity)}</td>
                                    <td class="px-3 py-3 align-top text-right ${availableNowClass}">${formatInventoryRepairNumber(item.currentAvailableQuantity)}</td>
                                    <td class="px-3 py-3 align-top text-right ${availableRepairClass}">${formatInventoryRepairNumber(item.repairedAvailableQuantity)}</td>
                                    <td class="px-3 py-3 align-top text-right ${reservedDeltaClass}">
                                        R ${item.deltaReservedQuantity >= 0 ? '+' : ''}${formatInventoryRepairNumber(item.deltaReservedQuantity)}<br>
                                        <span class="${item.deltaAvailableQuantity === 0 ? 'text-gray-500' : item.deltaAvailableQuantity > 0 ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}">
                                            A ${item.deltaAvailableQuantity >= 0 ? '+' : ''}${formatInventoryRepairNumber(item.deltaAvailableQuantity)}
                                        </span>
                                    </td>
                                    <td class="px-3 py-3 align-top text-xs text-gray-600">
                                        <div class="font-medium text-gray-800">${formatInventoryRepairNumber(item.requestCount || 0)} request(s), ${formatInventoryRepairNumber(item.openLineCount || 0)} line(s)</div>
                                        <div class="mt-1 break-words">${escapeInventoryAttribute(requestSummary || 'n/a')}</div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    updateInventoryRepairSelectionState();
}

function renderInventoryRepairError(error) {
    const content = document.getElementById('inventoryRepairModalContent');
    const selectionSummary = document.getElementById('inventoryRepairSelectionSummary');
    const applyButton = document.getElementById('inventoryRepairApplyBtn');

    if (content) {
        content.innerHTML = `
            <div class="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center text-red-700">
                <i class="ri-error-warning-line text-4xl"></i>
                <div class="mt-3 text-lg font-semibold">Failed to load repair preview</div>
                <p class="mt-2 text-sm">${escapeInventoryAttribute(error.message || 'Unknown error')}</p>
            </div>
        `;
    }

    if (selectionSummary) {
        selectionSummary.textContent = 'Repair preview unavailable.';
    }

    if (applyButton) {
        applyButton.disabled = true;
    }
}

async function fetchInventoryRepairPreview(backNumbers = []) {
    const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
    const response = await fetch(`${BASE_URL}api/inventory-management`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'previewRepairReservedAvailable',
            role: currentUser.role,
            backNumbers
        })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load repair preview');
    }

    return result;
}

async function openInventoryRepairModal(options = {}) {
    const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
    if (currentUser.role !== 'admin') {
        alert('Only admin can use inventory repair.');
        return false;
    }

    inventoryRepairModalContext = {
        trigger: options.trigger || 'manual',
        backNumbers: Array.isArray(options.backNumbers) ? options.backNumbers : [],
        successCount: Number(options.successCount) || 0,
        batchResetId: options.batchResetId || ''
    };

    const modal = ensureInventoryRepairModal();
    modal.classList.remove('hidden');
    setInventoryRepairLoadingState();
    renderInventoryRepairBanner({ totalTrackedItems: 0, mismatchCount: 0, totalOpenLineCount: 0 });

    try {
        const previewResult = await fetchInventoryRepairPreview(inventoryRepairModalContext.backNumbers);
        renderInventoryRepairPreview(previewResult);
        return true;
    } catch (error) {
        console.error('Inventory repair preview error:', error);
        renderInventoryRepairError(error);
        return false;
    }
}

window.closeInventoryRepairModal = function() {
    const modal = document.getElementById('inventoryRepairModal');
    if (modal) {
        modal.classList.add('hidden');
    }

    inventoryRepairPreviewItems = [];
    inventoryRepairModalContext = { trigger: 'manual', backNumbers: [] };
};

window.applyInventoryRepair = async function() {
    const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
    if (currentUser.role !== 'admin') {
        alert('Only admin can apply inventory repair.');
        return;
    }

    const selectedBackNumbers = getSelectedInventoryRepairBackNumbers();
    if (selectedBackNumbers.length === 0) {
        alert('Select at least one item to repair.');
        return;
    }

    const fullNameElement = document.getElementById('userFullName');
    const fullName = fullNameElement ? fullNameElement.textContent.trim() : (currentUser.username || 'admin');
    const applyButton = document.getElementById('inventoryRepairApplyBtn');
    const closeButton = document.getElementById('inventoryRepairCloseBtn');
    const originalButtonText = applyButton ? applyButton.textContent : 'Apply Repair';

    if (applyButton) {
        applyButton.disabled = true;
        applyButton.textContent = 'Applying...';
    }

    if (closeButton) {
        closeButton.disabled = true;
    }

    try {
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'repairReservedAvailable',
                role: currentUser.role,
                selectedBackNumbers,
                submittedBy: currentUser.username || 'admin',
                fullName
            })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to apply inventory repair');
        }

        closeInventoryRepairModal();
        await loadInventoryData();
        alert(`✅ Inventory repair completed.\n\nRepaired: ${result.successCount || 0} item(s)`);
    } catch (error) {
        console.error('Inventory repair apply error:', error);
        alert('❌ Inventory repair failed: ' + error.message);
    } finally {
        if (applyButton) {
            applyButton.disabled = false;
            applyButton.textContent = originalButtonText;
        }

        if (closeButton) {
            closeButton.disabled = false;
        }
    }
};

/**
 * Open batch reset modal
 */
window.openBatchResetModal = async function() {
    // Create modal HTML
    const modalHTML = `
        <div id="batchResetModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                <!-- Header -->
                <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <h2 class="text-lg font-bold text-gray-900">一括在庫リセット</h2>
                    <button onclick="closeBatchResetModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                </div>

                <!-- Filters Section -->
                <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-sm font-semibold text-gray-700">
                            <i class="ri-filter-3-line mr-1"></i>Advanced Filters
                        </h3>
                        <button onclick="addBatchResetFilter()" class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                            <i class="ri-add-line mr-1"></i>Add Filter
                        </button>
                    </div>
                    <div id="batchResetFiltersContainer" class="space-y-2"></div>
                </div>

                <!-- Results Section -->
                <div id="batchResetResultsSection" class="flex-1 overflow-y-auto px-4 py-3">
                    <div class="text-center text-gray-500 py-8">
                        <i class="ri-loader-4-line animate-spin text-3xl text-blue-600"></i>
                        <p class="mt-2 text-sm">Loading all items...</p>
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div class="text-xs text-gray-600">
                        <span id="batchResetSelectedCount">0</span> items selected
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="closeBatchResetModal()" class="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">
                            Cancel
                        </button>
                        <button id="batchResetBtn" onclick="confirmBatchReset()" disabled class="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            <i class="ri-refresh-line mr-1"></i>Reset Selected
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Load all items by default (no filters)
    await loadAllBatchResetItems();
};

/**
 * Close batch reset modal
 */
window.closeBatchResetModal = function() {
    const modal = document.getElementById('batchResetModal');
    if (modal) {
        modal.remove();
    }
    batchResetFilters = [];
    batchResetFilteredItems = [];
    batchResetSelectedItems = [];
};

/**
 * Add filter row
 */
window.addBatchResetFilter = async function() {
    const container = document.getElementById('batchResetFiltersContainer');
    const filterId = Date.now();
    
    const filterHTML = `
        <div class="flex items-center space-x-2" data-filter-id="${filterId}">
            <select class="px-2 py-1.5 border border-gray-300 rounded text-sm flex-1" onchange="updateBatchResetFilterInput(${filterId}); applyBatchResetFilters();">
                <option value="">Select Field...</option>
                <option value="品番">品番</option>
                <option value="背番号">背番号</option>
                <option value="工場">工場</option>
                <option value="モデル">モデル</option>
            </select>
            <select class="px-2 py-1.5 border border-gray-300 rounded text-sm" data-operator="${filterId}" onchange="applyBatchResetFilters();">
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
            </select>
            <div data-value-container="${filterId}" class="flex-1">
                <input type="text" class="px-2 py-1.5 border border-gray-300 rounded text-sm w-full" data-value="${filterId}" placeholder="Enter value..." onblur="applyBatchResetFilters();">
            </div>
            <button onclick="removeBatchResetFilter(${filterId})" class="p-1.5 text-red-600 hover:bg-red-50 rounded">
                <i class="ri-delete-bin-line text-lg"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', filterHTML);
};

/**
 * Remove filter row
 */
window.removeBatchResetFilter = function(filterId) {
    const filterRow = document.querySelector(`[data-filter-id="${filterId}"]`);
    if (filterRow) {
        filterRow.remove();
    }
};

/**
 * Update filter input based on field type
 */
window.updateBatchResetFilterInput = async function(filterId) {
    const filterRow = document.querySelector(`[data-filter-id="${filterId}"]`);
    if (!filterRow) return;
    
    const fieldSelect = filterRow.querySelector('select');
    const valueContainer = filterRow.querySelector(`[data-value-container="${filterId}"]`);
    const selectedField = fieldSelect.value;
    
    // If モデル is selected, fetch dropdown options
    if (selectedField === 'モデル') {
        try {
            // Fetch distinct モデル values from masterDB
            const response = await fetch(`${BASE_URL}queries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dbName: 'Sasaki_Coating_MasterDB',
                    collectionName: 'masterDB',
                    query: {},
                    projection: { 'モデル': 1 }
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const models = [...new Set(data.map(item => item.モデル).filter(Boolean))].sort();
                
                // Create dropdown
                valueContainer.innerHTML = `
                    <select class="px-2 py-1.5 border border-gray-300 rounded text-sm w-full" data-value="${filterId}" onchange="applyBatchResetFilters();">
                        <option value="">Select Model...</option>
                        ${models.map(model => `<option value="${model}">${model}</option>`).join('')}
                    </select>
                `;
            } else {
                console.error('Failed to fetch models');
            }
        } catch (error) {
            console.error('Error fetching models:', error);
        }
    } else if (selectedField === '工場') {
        try {
            // Fetch distinct factory values
            const response = await fetch(`${BASE_URL}queries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dbName: 'Sasaki_Coating_MasterDB',
                    collectionName: 'masterDB',
                    query: {},
                    projection: { '工場': 1 }
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const factories = [...new Set(data.map(item => item.工場).filter(Boolean))].sort();
                
                // Create dropdown
                valueContainer.innerHTML = `
                    <select class="px-2 py-1.5 border border-gray-300 rounded text-sm w-full" data-value="${filterId}" onchange="applyBatchResetFilters();">
                        <option value="">Select Factory...</option>
                        ${factories.map(factory => `<option value="${factory}">${factory}</option>`).join('')}
                    </select>
                `;
            }
        } catch (error) {
            console.error('Error fetching factories:', error);
        }
    } else {
        // Default to text input for other fields
        valueContainer.innerHTML = `
            <input type="text" class="px-2 py-1.5 border border-gray-300 rounded text-sm w-full" data-value="${filterId}" placeholder="Enter value..." onblur="applyBatchResetFilters();">
        `;
    }
};

/**
 * Load all items without filters (default behavior)
 */
window.loadAllBatchResetItems = async function() {
    const resultsSection = document.getElementById('batchResetResultsSection');
    
    try {
        // Fetch ALL inventory data without filters
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'getBatchResetItems',
                filters: [] // Empty filters = get all
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            batchResetFilteredItems = result.data;
            renderBatchResetResults(result.data);
        } else {
            throw new Error(result.error || 'Failed to fetch items');
        }
    } catch (error) {
        console.error('Error loading items:', error);
        resultsSection.innerHTML = `<div class="text-center text-red-500 py-8"><i class="ri-error-warning-line text-3xl mb-2"></i><p class="text-sm">Error: ${error.message}</p></div>`;
    }
};

/**
 * Apply filters and show results
 */
window.applyBatchResetFilters = async function() {
    const filterRows = document.querySelectorAll('#batchResetFiltersContainer [data-filter-id]');
    const filters = [];
    
    filterRows.forEach(row => {
        const field = row.querySelector('select').value;
        const operator = row.querySelector('[data-operator]').value;
        const valueElement = row.querySelector('[data-value]');
        const value = valueElement ? (valueElement.value || valueElement.textContent || '').trim() : '';
        
        if (field && value) {
            filters.push({ field, operator, value });
        }
    });
    
    // Show loading
    const resultsSection = document.getElementById('batchResetResultsSection');
    resultsSection.innerHTML = '<div class="text-center py-8"><i class="ri-loader-4-line animate-spin text-3xl text-blue-600"></i><p class="mt-2 text-sm text-gray-600">Loading...</p></div>';
    
    try {
        // Fetch filtered inventory data
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'getBatchResetItems',
                filters: filters
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            batchResetFilteredItems = result.data;
            renderBatchResetResults(result.data);
        } else {
            throw new Error(result.error || 'Failed to fetch items');
        }
    } catch (error) {
        console.error('Error applying filters:', error);
        resultsSection.innerHTML = `<div class="text-center text-red-500 py-8"><i class="ri-error-warning-line text-3xl mb-2"></i><p class="text-sm">Error: ${error.message}</p></div>`;
    }
};

/**
 * Render filtered results with checkboxes
 */
function renderBatchResetResults(items) {
    const resultsSection = document.getElementById('batchResetResultsSection');
    
    if (items.length === 0) {
        resultsSection.innerHTML = '<div class="text-center text-gray-500 py-8"><i class="ri-inbox-line text-3xl mb-2"></i><p class="text-sm">No items found</p></div>';
        return;
    }
    
    const resultsHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-gray-900">${items.length} items found</h3>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-2 py-1.5 text-left">
                                <input type="checkbox" id="selectAllBatchReset" onchange="toggleSelectAllBatchReset()" class="w-3.5 h-3.5 text-blue-600 rounded" title="Select All">
                            </th>
                            <th class="px-2 py-1.5 text-left">品番</th>
                            <th class="px-2 py-1.5 text-left">背番号</th>
                            <th class="px-2 py-1.5 text-right">Physical</th>
                            <th class="px-2 py-1.5 text-right">Reserved</th>
                            <th class="px-2 py-1.5 text-right">Available</th>
                            <th class="px-2 py-1.5 text-left">工場</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item, index) => {
                            const isAllZero = item.physicalQuantity === 0 && item.reservedQuantity === 0 && item.availableQuantity === 0;
                            const rowClass = isAllZero ? 'bg-gray-50 text-gray-400' : '';
                            return `
                                <tr class="border-b ${rowClass}">
                                    <td class="px-2 py-1.5">
                                        <input type="checkbox" 
                                            class="batch-reset-item-checkbox w-3.5 h-3.5 text-blue-600 rounded" 
                                            data-item-index="${index}"
                                            ${isAllZero ? 'disabled' : ''}
                                            onchange="updateBatchResetSelection()">
                                    </td>
                                    <td class="px-2 py-1.5 font-medium">${item.品番}</td>
                                    <td class="px-2 py-1.5">${item.背番号}</td>
                                    <td class="px-2 py-1.5 text-right ${item.physicalQuantity > 0 ? 'text-green-600 font-medium' : ''}">${item.physicalQuantity}</td>
                                    <td class="px-2 py-1.5 text-right ${item.reservedQuantity > 0 ? 'text-yellow-600 font-medium' : ''}">${item.reservedQuantity}</td>
                                    <td class="px-2 py-1.5 text-right ${item.availableQuantity > 0 ? 'text-purple-600 font-medium' : ''}">${item.availableQuantity}</td>
                                    <td class="px-2 py-1.5">${item.工場 || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    resultsSection.innerHTML = resultsHTML;
}

/**
 * Toggle select all
 */
window.toggleSelectAllBatchReset = function() {
    const selectAll = document.getElementById('selectAllBatchReset').checked;
    const checkboxes = document.querySelectorAll('.batch-reset-item-checkbox:not([disabled])');
    checkboxes.forEach(cb => cb.checked = selectAll);
    updateBatchResetSelection();
};

/**
 * Update selection count and button state
 */
window.updateBatchResetSelection = function() {
    const checkboxes = document.querySelectorAll('.batch-reset-item-checkbox:checked');
    const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.itemIndex));
    batchResetSelectedItems = selectedIndices.map(i => batchResetFilteredItems[i]);
    
    document.getElementById('batchResetSelectedCount').textContent = batchResetSelectedItems.length;
    document.getElementById('batchResetBtn').disabled = batchResetSelectedItems.length === 0;
};

/**
 * Confirm batch reset (first confirmation)
 */
window.confirmBatchReset = function() {
    if (batchResetSelectedItems.length === 0) return;
    
    const summaryItems = batchResetSelectedItems.slice(0, 5).map(item => 
        `${item.背番号} (${item.品番}): Physical=${item.physicalQuantity}, Reserved=${item.reservedQuantity}, Available=${item.availableQuantity}`
    ).join('\n');
    
    const more = batchResetSelectedItems.length > 5 ? `\n...and ${batchResetSelectedItems.length - 5} more items` : '';
    
    const message = `Reset ${batchResetSelectedItems.length} items to zero?\n\n${summaryItems}${more}\n\nContinue?`;
    
    if (confirm(message)) {
        showFinalBatchResetConfirmation();
    }
};

/**
 * Show final scary confirmation
 */
function showFinalBatchResetConfirmation() {
    const message = `⚠️ この操作は全ての選択された在庫をゼロにリセットします。履歴から元に戻すことも可能ですが、慎重に確認してください。\n\n本当に実行しますか？`;
    
    if (confirm(message)) {
        executeBatchReset();
    }
}

/**
 * Execute batch reset
 */
async function executeBatchReset() {
    const currentUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const fullNameElement = document.getElementById('userFullName');
    const fullName = fullNameElement ? fullNameElement.textContent.trim() : (currentUser.username || 'admin');
    
    // Show progress modal
    const progressModal = createProgressModal();
    document.body.appendChild(progressModal);
    
    try {
        const response = await fetch(`${BASE_URL}api/inventory-management`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'batchResetInventory',
                items: batchResetSelectedItems,
                submittedBy: currentUser.username || 'admin',
                fullName: fullName
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            await showBatchResetResults(result);
        } else {
            throw new Error(result.error || 'Batch reset failed');
        }
    } catch (error) {
        console.error('Batch reset error:', error);
        alert('❌ バッチリセットに失敗しました: ' + error.message);
        progressModal.remove();
    }
}

/**
 * Create progress modal
 */
function createProgressModal() {
    const modal = document.createElement('div');
    modal.id = 'batchResetProgressModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-8 max-w-md w-full text-center">
            <i class="ri-loader-4-line animate-spin text-6xl text-blue-600 mb-4"></i>
            <h3 class="text-xl font-semibold mb-2">Processing Reset...</h3>
            <p class="text-gray-600">Please wait while we reset the inventory items.</p>
        </div>
    `;
    return modal;
}

/**
 * Show batch reset results
 */
async function showBatchResetResults(result) {
    // Remove progress modal
    const progressModal = document.getElementById('batchResetProgressModal');
    if (progressModal) progressModal.remove();

    const repairScopeBackNumbers = [...new Set(batchResetSelectedItems.map((item) => String(item?.背番号 || '').trim()).filter(Boolean))];
    
    // Close batch reset modal
    closeBatchResetModal();

    // Reload inventory data
    await loadInventoryData();

    if (repairScopeBackNumbers.length > 0) {
        await openInventoryRepairModal({
            trigger: 'batch-reset',
            backNumbers: repairScopeBackNumbers,
            successCount: result.successCount,
            batchResetId: result.batchResetId
        });
        return;
    }

    alert(`✅ Batch Reset Completed!\n\nSuccessfully reset: ${result.successCount} items\nBatch ID: ${result.batchResetId}\n\nInventory has been updated.`);
}

// Make functions globally available
window.initializeInventorySystem = initializeInventorySystem;
window.openInventoryRepairModal = openInventoryRepairModal;
