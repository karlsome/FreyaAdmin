// ═══════════════════════════════════════════════════════════════════════════
//  VIDEO MANUAL 2 – Shotstack SDK Integration (Vanilla JS)
// ═══════════════════════════════════════════════════════════════════════════

const VMSS_STORAGE_KEY = 'freya.videoManual.shotstack.project';
const VMSS_API_BASE_URL = () => {
  const base = typeof BASE_URL !== 'undefined' ? BASE_URL : 'http://localhost:3000';
  return base.replace(/\/$/, ''); // Remove trailing slash if present
};

const vmss = {
  edit: null,
  canvas: null,
  timeline: null,
  controls: null,
  ui: null,
  steps: [],
  currentStepIdx: 0,
  selectedClipId: null,
  dirty: false,
  clockTimer: null,
  title: 'Video Manual 2',
  lastRenderId: null,
  lastRenderUrl: null,
  assetSourceMap: {},
  timelineLayoutRaf: null,
  timelineScrollContainer: null,
  onTimelineScroll: null,
  onTimelineWindowResize: null,
  workspaceScrollContainer: null,
  workspaceScrollTopBefore: 0,
  workspaceOverflowBefore: '',
  debugEnabled: false,
  debugListeners: [],
  debugMoveThrottleMs: 120,
  lastDebugMoveAt: 0,
  syncingShapeAsset: false,
  pendingShapeSyncTimer: null,
  onShapePointerRelease: null,
  drawMode: null,
  drawDraft: null,
  previewDrawSurface: null,
  onPreviewDrawPointerDown: null,
  onPreviewDrawPointerMove: null,
  onPreviewDrawPointerUp: null,
};

function loadVideoManualPage() {
  vmssDispose();

  const main = document.getElementById('mainContent');
  if (!main) return;

  const savedProject = vmssReadStoredProject();
  const savedAt = savedProject?.updatedAt ? new Date(savedProject.updatedAt).toLocaleString() : 'No local save yet';

  main.innerHTML = `
    <div class="min-h-[calc(100vh-120px)] rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-sky-50 p-5 dark:from-gray-900 dark:via-gray-900 dark:to-slate-950">
      <div class="mx-auto flex max-w-7xl flex-col gap-5">
        <section class="rounded-[28px] border border-white/60 bg-white/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">Video Manual Workspace</p>
          <div class="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 class="text-3xl font-semibold text-slate-900 dark:text-white">Choose an editor</h2>
              <p class="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">Freya Admin keeps the current workflow and adds a new Shotstack SDK editor as Video Manual 2. This integration stays fully vanilla JS.</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <div class="font-medium text-slate-700 dark:text-white">Shotstack local save</div>
              <div class="mt-1 text-xs">${vmssEscapeHtml(savedAt)}</div>
            </div>
          </div>
        </section>

        <section class="grid gap-5 lg:grid-cols-2">
          <article class="rounded-[28px] border border-white/60 bg-white/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
            <div class="flex items-center justify-between">
              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-gray-800 dark:text-gray-300">Classic</span>
              <i class="ri-movie-2-line text-2xl text-slate-400 dark:text-gray-500"></i>
            </div>
            <h3 class="mt-5 text-2xl font-semibold text-slate-900 dark:text-white">Existing editor</h3>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Open the current Freya video manual workflow exactly as it exists today.</p>
            <button onclick="vmssOpenClassicEditor()" class="mt-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
              <i class="ri-arrow-right-line"></i>Open Classic Editor
            </button>
          </article>

          <article class="rounded-[28px] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-[0_24px_80px_-40px_rgba(14,116,144,0.35)] backdrop-blur dark:border-sky-900/50 dark:from-slate-900 dark:via-gray-900 dark:to-sky-950">
            <div class="flex items-center justify-between">
              <span class="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">Video Manual 2</span>
              <i class="ri-magic-line text-2xl text-sky-500 dark:text-sky-300"></i>
            </div>
            <h3 class="mt-5 text-2xl font-semibold text-slate-900 dark:text-white">Shotstack SDK editor</h3>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-300">Timeline, canvas preview, toolbar controls, and browser export backed by the local Shotstack browser bundle.</p>
            <div class="mt-5 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
              <div class="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 dark:border-sky-900/50 dark:bg-slate-900/60">Vanilla JS integration with no React runtime.</div>
              <div class="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 dark:border-sky-900/50 dark:bg-slate-900/60">Local save in browser storage so you can test immediately.</div>
              <div class="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 dark:border-sky-900/50 dark:bg-slate-900/60">Ready for backend persistence once your API contract is defined.</div>
            </div>
            <div class="mt-6 flex flex-wrap gap-3">
              <button onclick="loadVideoManualShotstackPage()" class="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-600">
                <i class="ri-arrow-right-line"></i>Open Video Manual 2
              </button>
              <button onclick="vmssResetLocalProject()" class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                <i class="ri-delete-bin-line"></i>Reset Local Save
              </button>
            </div>
          </article>
        </section>
      </div>
    </div>
  `;

  if (typeof applyLanguageEnhanced === 'function') {
    applyLanguageEnhanced();
  } else if (typeof applyLanguage === 'function') {
    applyLanguage();
  }
}

function loadVideoManualShotstackPage() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  vmssLockWorkspaceScroll();

  main.innerHTML = `
    <div class="min-h-[calc(100vh-120px)] rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-sky-50 p-4 dark:from-gray-900 dark:via-gray-900 dark:to-slate-950">
      <div class="mx-auto w-full max-w-[1720px]">
        <div id="vmss-editor" class="overflow-hidden rounded-[28px] border border-white/60 bg-white/90 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] dark:border-gray-800 dark:bg-gray-900/90"></div>
      </div>
    </div>
  `;

  vmssBoot().catch((error) => {
    console.error('Failed to boot Shotstack editor:', error);
    const editor = document.getElementById('vmss-editor');
    if (editor) {
      editor.innerHTML = `<div class="p-8 text-sm text-red-600 dark:text-red-400">Failed to load Shotstack editor: ${vmssEscapeHtml(error?.message || String(error))}</div>`;
    }
  });
}

function vmssLockWorkspaceScroll() {
  const scrollContainer = document.querySelector('main.overflow-y-auto');
  if (!scrollContainer) return;

  vmss.workspaceScrollContainer = scrollContainer;
  vmss.workspaceScrollTopBefore = scrollContainer.scrollTop || 0;
  vmss.workspaceOverflowBefore = scrollContainer.style.overflowY || '';

  // Timeline drag math should not depend on an inherited scrolled parent offset.
  scrollContainer.scrollTop = 0;
  scrollContainer.style.overflowY = 'hidden';
}

function vmssUnlockWorkspaceScroll() {
  const scrollContainer = vmss.workspaceScrollContainer;
  if (!scrollContainer) return;

  scrollContainer.style.overflowY = vmss.workspaceOverflowBefore;
  scrollContainer.scrollTop = vmss.workspaceScrollTopBefore;

  vmss.workspaceScrollContainer = null;
  vmss.workspaceScrollTopBefore = 0;
  vmss.workspaceOverflowBefore = '';
}

async function vmssBoot() {
  if (!window.ShotstackStudio) {
    throw new Error('Shotstack SDK bundle is not loaded. Check vendor/shotstack-studio/shotstack-studio.umd.js.');
  }

  await vmssInit('#vmss-editor');

  const storedProject = vmssReadStoredProject();
  const project = storedProject?.edit || vmssCreateDefaultTemplate();
  const title = storedProject?.title || 'Video Manual 2';
  const assetSourceMap = storedProject?.assetSourceMap && typeof storedProject.assetSourceMap === 'object'
    ? storedProject.assetSourceMap
    : {};

  await vmssLoadTemplate(project, { title, assetSourceMap });
}

function vmssCreateDefaultTemplate() {
  return {
    timeline: {
      background: '#0f172a',
      tracks: [
        {
          clips: [
            {
              asset: {
                type: 'rich-text',
                text: 'Video Manual 2',
                font: {
                  family: 'Work Sans',
                  size: 72,
                  weight: 700,
                  color: '#ffffff',
                  opacity: 1,
                },
                align: {
                  horizontal: 'center',
                  vertical: 'middle',
                },
              },
              start: 0,
              length: 4,
              width: 900,
              height: 180,
              offset: { x: 0, y: -0.18 },
            },
          ],
        },
        {
          clips: [
            {
              asset: {
                type: 'rich-text',
                text: 'Use the right panel to add text, shapes, images, or video.',
                font: {
                  family: 'Work Sans',
                  size: 30,
                  weight: 400,
                  color: '#cbd5e1',
                  opacity: 1,
                },
                align: {
                  horizontal: 'center',
                  vertical: 'middle',
                },
              },
              start: 0.3,
              length: 6,
              width: 920,
              height: 120,
              offset: { x: 0, y: 0.08 },
            },
          ],
        },
      ],
    },
    output: {
      format: 'mp4',
      size: {
        width: 1280,
        height: 720,
      },
    },
  };
}

async function vmssInit(containerSelector = '#vmss-editor') {
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.error('Container not found:', containerSelector);
    return;
  }

  vmssRenderEditorShell(container);
  await new Promise((resolve) => setTimeout(resolve, 0));
  vmssBindShellEvents();
}

async function vmssLoadTemplate(templateJsonOrUrl, options = {}) {
  const { Edit, Canvas, Timeline, Controls, UIController } = window.ShotstackStudio;

  let template = templateJsonOrUrl;
  if (typeof templateJsonOrUrl === 'string') {
    const response = await fetch(templateJsonOrUrl);
    template = await response.json();
  }

  vmssDispose();
  vmss.assetSourceMap = options.assetSourceMap && typeof options.assetSourceMap === 'object'
    ? { ...options.assetSourceMap }
    : {};

  vmss.edit = new Edit(template);
  vmss.canvas = new Canvas(vmss.edit);
  vmss.ui = UIController.create(vmss.edit, vmss.canvas, { mergeFields: true });

  await vmss.canvas.load();
  await vmss.edit.load();

  const timelineContainer = document.querySelector('[data-shotstack-timeline]');
  if (timelineContainer) {
    vmssNeutralizeTimelineContainingBlocks();

    vmss.timeline = new Timeline(vmss.edit, timelineContainer, { resizable: true });
    await vmss.timeline.load();

    vmssBindTimelineLayoutWatchers();
    vmssScheduleTimelineRelayout();
  }

  vmss.controls = new Controls(vmss.edit);
  await vmss.controls.load();

  vmssBindEvents();
  vmssBindPreviewDrawHandlers();
  vmssUpdateDrawModeUI();
  vmssSyncStepsFromTracks();
  vmssRenderStepsPanel();
  vmssSetTitle(options.title || vmss.title);
  vmssSetStatus('Ready');
  vmssStartClock();
}

function vmssScheduleTimelineRelayout() {
  if (vmss.timelineLayoutRaf) return;

  vmss.timelineLayoutRaf = window.requestAnimationFrame(() => {
    vmss.timelineLayoutRaf = null;

    // Keep timeline hit-testing aligned after container scroll/resize changes.
    vmss.timeline?.resize?.();
    vmss.timeline?.refresh?.();
  });
}

function vmssDebugLog(label, payload = {}) {
  if (!vmss.debugEnabled) return;
  console.log(`[VMSS DEBUG] ${label}`, payload);
}

function vmssGetLayoutSnapshot() {
  const timeline = document.querySelector('[data-shotstack-timeline]');
  const timelineRect = timeline?.getBoundingClientRect?.();
  const tracksRect = document.querySelector('.ss-timeline-tracks')?.getBoundingClientRect?.();
  const rootRect = document.getElementById('vmss-root')?.getBoundingClientRect?.();
  const mainRect = document.getElementById('mainContent')?.getBoundingClientRect?.();
  const workspace = document.querySelector('main.overflow-y-auto');
  const containingBlockAncestors = vmssGetContainingBlockAncestors(timeline);

  return {
    window: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    },
    timelineRect: timelineRect
      ? {
          left: Math.round(timelineRect.left),
          top: Math.round(timelineRect.top),
          width: Math.round(timelineRect.width),
          height: Math.round(timelineRect.height),
        }
      : null,
    tracksRect: tracksRect
      ? {
          left: Math.round(tracksRect.left),
          top: Math.round(tracksRect.top),
          width: Math.round(tracksRect.width),
          height: Math.round(tracksRect.height),
        }
      : null,
    rootRect: rootRect
      ? {
          left: Math.round(rootRect.left),
          top: Math.round(rootRect.top),
          width: Math.round(rootRect.width),
          height: Math.round(rootRect.height),
        }
      : null,
    mainRect: mainRect
      ? {
          left: Math.round(mainRect.left),
          top: Math.round(mainRect.top),
          width: Math.round(mainRect.width),
          height: Math.round(mainRect.height),
        }
      : null,
    workspaceScroll: workspace
      ? {
          top: workspace.scrollTop,
          left: workspace.scrollLeft,
          overflowY: workspace.style.overflowY || '(default)',
        }
      : null,
    containingBlockAncestors,
  };
}

function vmssGetContainingBlockAncestors(element) {
  const result = [];
  let node = element?.parentElement;

  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const hasContainingBlockEffect =
      style.transform !== 'none' ||
      style.filter !== 'none' ||
      style.perspective !== 'none' ||
      (style.backdropFilter && style.backdropFilter !== 'none') ||
      (style.webkitBackdropFilter && style.webkitBackdropFilter !== 'none') ||
      style.contain === 'paint' ||
      style.willChange.includes('transform') ||
      style.willChange.includes('filter');

    if (hasContainingBlockEffect) {
      result.push({
        tagName: node.tagName,
        id: node.id || null,
        className: node.className || null,
        transform: style.transform,
        filter: style.filter,
        perspective: style.perspective,
        backdropFilter: style.backdropFilter || style.webkitBackdropFilter || 'none',
        contain: style.contain,
        willChange: style.willChange,
      });
    }

    node = node.parentElement;
  }

  return result;
}

function vmssNeutralizeTimelineContainingBlocks() {
  const timeline = document.querySelector('[data-shotstack-timeline]');
  if (!timeline) return;

  let node = timeline.parentElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const hasBackdrop = (style.backdropFilter && style.backdropFilter !== 'none') || (style.webkitBackdropFilter && style.webkitBackdropFilter !== 'none');
    const hasFilter = style.filter && style.filter !== 'none';

    if (hasBackdrop || hasFilter) {
      if (!node.dataset.vmssBackdropFilterBefore) {
        node.dataset.vmssBackdropFilterBefore = node.style.backdropFilter || '';
        node.dataset.vmssWebkitBackdropFilterBefore = node.style.webkitBackdropFilter || '';
        node.dataset.vmssFilterBefore = node.style.filter || '';
      }

      node.style.backdropFilter = 'none';
      node.style.webkitBackdropFilter = 'none';
      node.style.filter = 'none';
    }

    node = node.parentElement;
  }
}

function vmssRestoreTimelineContainingBlocks() {
  const allNodes = document.querySelectorAll('[data-vmss-backdrop-filter-before], [data-vmss-filter-before]');
  allNodes.forEach((node) => {
    node.style.backdropFilter = node.dataset.vmssBackdropFilterBefore || '';
    node.style.webkitBackdropFilter = node.dataset.vmssWebkitBackdropFilterBefore || '';
    node.style.filter = node.dataset.vmssFilterBefore || '';

    delete node.dataset.vmssBackdropFilterBefore;
    delete node.dataset.vmssWebkitBackdropFilterBefore;
    delete node.dataset.vmssFilterBefore;
  });
}

function vmssGetRectSnapshot(element) {
  if (!element?.getBoundingClientRect) return null;
  const rect = element.getBoundingClientRect();
  return {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
  };
}

function vmssGetSelectedClipDataSnapshot() {
  if (!vmss.edit || vmss.currentStepIdx == null || vmss.selectedClipId == null) return null;

  const edit = vmss.edit.getEdit?.();
  const clip = edit?.timeline?.tracks?.[vmss.currentStepIdx]?.clips?.[vmss.selectedClipId];
  if (!clip) return null;

  return {
    trackIndex: vmss.currentStepIdx,
    clipIndex: vmss.selectedClipId,
    start: clip.start,
    length: clip.length,
    offset: clip.offset || null,
    width: clip.width || null,
    height: clip.height || null,
    assetType: clip.asset?.type || null,
    assetText: typeof clip.asset?.text === 'string' ? clip.asset.text.slice(0, 40) : null,
  };
}

function vmssGetClipVisualSnapshot(pointerEvent = null) {
  const selectedByIndex = (vmss.currentStepIdx != null && vmss.selectedClipId != null)
    ? document.querySelector(`.ss-clip[data-track-index="${vmss.currentStepIdx}"][data-clip-index="${vmss.selectedClipId}"]`)
    : null;
  const selectedByClass = document.querySelector('.ss-clip.selected');
  const clipElement = selectedByIndex || selectedByClass;
  const ghostElement = document.querySelector('.ss-drag-ghost');
  const tooltipElement = document.querySelector('.ss-drag-time-tooltip');

  const clipStyle = clipElement ? window.getComputedStyle(clipElement) : null;
  const clipRect = vmssGetRectSnapshot(clipElement);

  let pointerDelta = null;
  if (pointerEvent && clipRect) {
    pointerDelta = {
      xFromClipLeft: Math.round((pointerEvent.clientX - clipRect.left) * 100) / 100,
      yFromClipTop: Math.round((pointerEvent.clientY - clipRect.top) * 100) / 100,
    };
  }

  return {
    selectedClipData: vmssGetSelectedClipDataSnapshot(),
    selectedClipElement: clipElement
      ? {
          className: clipElement.className,
          dataset: {
            clipId: clipElement.dataset.clipId || null,
            trackIndex: clipElement.dataset.trackIndex || null,
            clipIndex: clipElement.dataset.clipIndex || null,
          },
          rect: clipRect,
          cssVars: {
            clipStart: clipStyle?.getPropertyValue('--clip-start')?.trim() || null,
            clipLength: clipStyle?.getPropertyValue('--clip-length')?.trim() || null,
          },
          style: {
            left: clipStyle?.left || null,
            top: clipStyle?.top || null,
            transform: clipStyle?.transform || null,
            position: clipStyle?.position || null,
          },
        }
      : null,
    dragGhost: ghostElement
      ? {
          className: ghostElement.className,
          rect: vmssGetRectSnapshot(ghostElement),
        }
      : null,
    dragTooltip: tooltipElement
      ? {
          text: tooltipElement.textContent || null,
          rect: vmssGetRectSnapshot(tooltipElement),
        }
      : null,
    pointerDelta,
  };
}

function vmssAttachTimelineDebug(timelineContainer) {
  vmssDetachTimelineDebug();

  const makeHandler = (eventName) => (event) => {
    if (!vmss.debugEnabled) return;

    if (eventName === 'pointermove' && event.buttons !== 1) {
      return;
    }

    if (eventName === 'pointermove') {
      const now = performance.now();
      if (now - vmss.lastDebugMoveAt < vmss.debugMoveThrottleMs) return;
      vmss.lastDebugMoveAt = now;
    }

    vmssDebugLog(`timeline:${eventName}`, {
      pointer: {
        pointerType: event.pointerType,
        button: event.button,
        buttons: event.buttons,
        clientX: event.clientX,
        clientY: event.clientY,
      },
      clipVisual: vmssGetClipVisualSnapshot(event),
      layout: vmssGetLayoutSnapshot(),
    });
  };

  const events = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
  events.forEach((eventName) => {
    const handler = makeHandler(eventName);
    timelineContainer.addEventListener(eventName, handler, { passive: true });
    vmss.debugListeners.push({ target: timelineContainer, eventName, handler });
  });

  vmssDebugLog('timeline:debug-attached', {
    clipVisual: vmssGetClipVisualSnapshot(),
    layout: vmssGetLayoutSnapshot(),
  });
}

function vmssDetachTimelineDebug() {
  vmss.debugListeners.forEach(({ target, eventName, handler }) => {
    target.removeEventListener(eventName, handler);
  });
  vmss.debugListeners = [];
}

function vmssBindTimelineLayoutWatchers() {
  vmssUnbindTimelineLayoutWatchers();

  const scrollContainer = document.querySelector('main.overflow-y-auto');
  if (scrollContainer) {
    vmss.timelineScrollContainer = scrollContainer;
    vmss.onTimelineScroll = () => vmssScheduleTimelineRelayout();
    scrollContainer.addEventListener('scroll', vmss.onTimelineScroll, { passive: true });
  }

  vmss.onTimelineWindowResize = () => vmssScheduleTimelineRelayout();
  window.addEventListener('resize', vmss.onTimelineWindowResize);
}

function vmssUnbindTimelineLayoutWatchers() {
  if (vmss.timelineScrollContainer && vmss.onTimelineScroll) {
    vmss.timelineScrollContainer.removeEventListener('scroll', vmss.onTimelineScroll);
  }

  if (vmss.onTimelineWindowResize) {
    window.removeEventListener('resize', vmss.onTimelineWindowResize);
  }

  if (vmss.timelineLayoutRaf) {
    window.cancelAnimationFrame(vmss.timelineLayoutRaf);
    vmss.timelineLayoutRaf = null;
  }

  vmss.timelineScrollContainer = null;
  vmss.onTimelineScroll = null;
  vmss.onTimelineWindowResize = null;
}

function vmssScheduleSelectedShapeSync(delay = 0) {
  if (vmss.pendingShapeSyncTimer) {
    window.clearTimeout(vmss.pendingShapeSyncTimer);
  }

  vmss.pendingShapeSyncTimer = window.setTimeout(() => {
    vmss.pendingShapeSyncTimer = null;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        vmssSyncSelectedShapeAsset();
      });
    });
  }, Math.max(0, delay));
}

function vmssBindShapeSyncWatchers() {
  vmssUnbindShapeSyncWatchers();

  vmss.onShapePointerRelease = () => {
    vmssScheduleSelectedShapeSync();
  };

  window.addEventListener('pointerup', vmss.onShapePointerRelease, true);
  window.addEventListener('pointercancel', vmss.onShapePointerRelease, true);
}

function vmssUnbindShapeSyncWatchers() {
  if (vmss.pendingShapeSyncTimer) {
    window.clearTimeout(vmss.pendingShapeSyncTimer);
    vmss.pendingShapeSyncTimer = null;
  }

  if (vmss.onShapePointerRelease) {
    window.removeEventListener('pointerup', vmss.onShapePointerRelease, true);
    window.removeEventListener('pointercancel', vmss.onShapePointerRelease, true);
    vmss.onShapePointerRelease = null;
  }
}

function vmssDispose() {
  if (vmss.clockTimer) {
    window.clearInterval(vmss.clockTimer);
    vmss.clockTimer = null;
  }

  vmssCancelShapeDraw();
  vmssUnbindTimelineLayoutWatchers();
  vmssUnbindShapeSyncWatchers();
  vmssUnbindPreviewDrawHandlers();
  vmssDetachTimelineDebug();
  vmssRestoreTimelineContainingBlocks();
  vmssUnlockWorkspaceScroll();

  vmss.controls?.dispose?.();
  vmss.timeline?.dispose?.();
  vmss.ui?.dispose?.();
  vmss.canvas?.dispose?.();

  vmss.edit = null;
  vmss.canvas = null;
  vmss.timeline = null;
  vmss.controls = null;
  vmss.ui = null;
  vmss.steps = [];
  vmss.currentStepIdx = 0;
  vmss.selectedClipId = null;
  vmss.assetSourceMap = {};
}

function vmssRememberAssetSource(previewUrl, publicUrl) {
  if (!previewUrl || !publicUrl) return;
  vmss.assetSourceMap[previewUrl] = publicUrl;
}

function vmssPrepareEditForRender(editJson) {
  const preparedEdit = JSON.parse(JSON.stringify(editJson));
  const unresolvedSources = [];

  (preparedEdit.timeline?.tracks || []).forEach((track) => {
    (track.clips || []).forEach((clip) => {
      if (!clip?.asset?.src || typeof clip.asset.src !== 'string') return;

      const currentSrc = clip.asset.src;
      const mappedSrc = vmss.assetSourceMap[currentSrc];

      if (mappedSrc) {
        clip.asset.src = mappedSrc;
        return;
      }

      if (currentSrc.startsWith('blob:') || currentSrc.includes('/api/video-manuals/stream/')) {
        unresolvedSources.push(currentSrc);
      }
    });
  });

  if (unresolvedSources.length) {
    throw new Error('Some uploaded assets are still using preview URLs. Wait for upload to finish, then try export again.');
  }

  return preparedEdit;
}

function vmssExtractShapeStyle(svgSrc) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgSrc, 'image/svg+xml');
  const root = doc.documentElement;
  const shapeType = root?.getAttribute('data-vmss-shape');
  const drawable = root?.querySelector('rect, ellipse, circle, line, polyline, path');

  return {
    shapeType,
    stroke: drawable?.getAttribute('stroke') || '#ef4444',
    fill: drawable?.getAttribute('fill') || '#fecaca',
    strokeWidth: Number(drawable?.getAttribute('stroke-width') || 3),
  };
}

function vmssCreateShapeSvg(shapeType, width, height, options = {}) {
  const fill = options.fill || '#fecaca';
  const stroke = options.stroke || '#ef4444';
  const safeStrokeWidth = Math.max(2, Number(options.strokeWidth) || 3);
  const strokePadding = safeStrokeWidth + 14;

  switch (shapeType) {
    case 'rect': {
      const inset = strokePadding;
      return `<svg xmlns="http://www.w3.org/2000/svg" data-vmss-shape="rect" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="${inset}" y="${inset}" width="${Math.max(1, width - (inset * 2))}" height="${Math.max(1, height - (inset * 2))}" rx="12" fill="${fill}" fill-opacity="0.35" stroke="${stroke}" stroke-width="${safeStrokeWidth}"/></svg>`;
    }
    case 'circle': {
      const radiusX = Math.max(8, (width / 2) - strokePadding);
      const radiusY = Math.max(8, (height / 2) - strokePadding);
      const centerX = width / 2;
      const centerY = height / 2;
      const ovalPath = [
        `M ${centerX - radiusX} ${centerY}`,
        `A ${radiusX} ${radiusY} 0 1 0 ${centerX + radiusX} ${centerY}`,
        `A ${radiusX} ${radiusY} 0 1 0 ${centerX - radiusX} ${centerY}`,
      ].join(' ');
      return `<svg xmlns="http://www.w3.org/2000/svg" data-vmss-shape="circle" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${ovalPath}" fill="${fill}" fill-opacity="0.35" stroke="${stroke}" stroke-width="${safeStrokeWidth}"/></svg>`;
    }
    case 'arrow': {
      const margin = strokePadding + 6;
      const leftX = margin;
      const rightX = width - margin;
      const centerY = height / 2;
      const usableHeight = Math.max(18, height - (margin * 2));
      const headLength = Math.max(18, Math.min(width * 0.28, usableHeight * 1.1));
      const shaftHalf = Math.max(4, usableHeight * 0.16);
      const bodyRight = Math.max(leftX + 12, rightX - headLength);
      const topY = centerY - (usableHeight / 2);
      const bottomY = centerY + (usableHeight / 2);
      const arrowPath = [
        `M ${leftX} ${centerY - shaftHalf}`,
        `L ${bodyRight} ${centerY - shaftHalf}`,
        `L ${bodyRight} ${topY}`,
        `L ${rightX} ${centerY}`,
        `L ${bodyRight} ${bottomY}`,
        `L ${bodyRight} ${centerY + shaftHalf}`,
        `L ${leftX} ${centerY + shaftHalf}`,
        'Z',
      ].join(' ');
      return `<svg xmlns="http://www.w3.org/2000/svg" data-vmss-shape="arrow" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${arrowPath}" fill="${fill}" fill-opacity="0.35" stroke="${stroke}" stroke-width="${safeStrokeWidth}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    case 'line': {
      const margin = strokePadding + 8;
      const centerY = height / 2;
      return `<svg xmlns="http://www.w3.org/2000/svg" data-vmss-shape="line" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><line x1="${margin}" y1="${centerY}" x2="${width - margin}" y2="${centerY}" stroke="${stroke}" stroke-width="${safeStrokeWidth}" stroke-linecap="butt"/></svg>`;
    }
    default:
      return '';
  }
}

function vmssSyncSelectedShapeAsset() {
  if (vmss.syncingShapeAsset || !vmss.edit || vmss.currentStepIdx == null || vmss.selectedClipId == null) {
    return;
  }

  const clipId = vmss.edit.getClipId?.(vmss.currentStepIdx, vmss.selectedClipId);
  const resolvedClip = vmss.edit.getResolvedClip?.(vmss.currentStepIdx, vmss.selectedClipId);
  if (!clipId || !resolvedClip || resolvedClip.asset?.type !== 'svg' || typeof resolvedClip.asset?.src !== 'string') {
    return;
  }

  const shapeStyle = vmssExtractShapeStyle(resolvedClip.asset.src);
  if (!shapeStyle.shapeType || !Number.isFinite(resolvedClip.width) || !Number.isFinite(resolvedClip.height)) {
    return;
  }

  const nextSvg = vmssCreateShapeSvg(
    shapeStyle.shapeType,
    Math.max(50, Math.round(resolvedClip.width)),
    Math.max(50, Math.round(resolvedClip.height)),
    shapeStyle,
  );

  if (!nextSvg || nextSvg === resolvedClip.asset.src) {
    return;
  }

  vmss.syncingShapeAsset = true;
  vmss.edit.updateClipInDocument?.(clipId, {
    asset: {
      ...resolvedClip.asset,
      src: nextSvg,
    },
  });
  vmss.edit.resolveClip?.(clipId);
  vmss.syncingShapeAsset = false;
}

function vmssBindEvents() {
  if (!vmss.edit) return;

  vmssBindShapeSyncWatchers();

  vmss.edit.events.on('track:added', () => {
    vmssSyncStepsFromTracks();
    vmssRenderStepsPanel();
  });

  vmss.edit.events.on('track:removed', () => {
    vmssSyncStepsFromTracks();
    vmssRenderStepsPanel();
  });

  vmss.edit.events.on('clip:added', () => {
    vmssMarkDirty();
    vmssRenderStepsPanel();
  });

  vmss.edit.events.on('clip:updated', () => {
    vmssMarkDirty();
    vmssSyncSelectedShapeAsset();
    vmssScheduleSelectedShapeSync(40);

    vmssDebugLog('clip:updated', {
      selectedClipId: vmss.selectedClipId,
      currentStepIdx: vmss.currentStepIdx,
      playbackTime: vmss.edit?.playbackTime || 0,
      clipVisual: vmssGetClipVisualSnapshot(),
    });
  });

  vmss.edit.events.on('clip:deleted', () => {
    vmssMarkDirty();
    vmssRenderStepsPanel();
  });

  vmss.edit.events.on('clip:selected', (data) => {
    vmss.selectedClipId = data?.clipIndex ?? null;
    vmss.currentStepIdx = data?.trackIndex ?? 0;
    vmssSyncSelectedShapeAsset();
    vmssScheduleSelectedShapeSync();

    vmssDebugLog('clip:selected', {
      selectedClipId: vmss.selectedClipId,
      currentStepIdx: vmss.currentStepIdx,
      data,
      clipVisual: vmssGetClipVisualSnapshot(),
      layout: vmssGetLayoutSnapshot(),
    });

    vmssRenderStepsPanel();
  });

  vmss.edit.events.on('selection:cleared', () => {
    vmss.selectedClipId = null;
    vmssRenderStepsPanel();
  });

  vmss.edit.events.on('edit:changed', () => {
    vmssMarkDirty();
  });

  vmss.edit.events.on('playback:play', () => {
    vmssUpdatePlayButton(true);
  });

  vmss.edit.events.on('playback:pause', () => {
    vmssUpdatePlayButton(false);
  });
}

function vmssSyncStepsFromTracks() {
  if (!vmss.edit) {
    vmss.steps = [];
    return;
  }

  const edit = vmss.edit.getEdit();
  const tracks = edit?.timeline?.tracks || [];

  vmss.steps = tracks.map((track, index) => {
    const clips = track.clips || [];
    const firstClip = clips[0];
    const lastClip = clips[clips.length - 1];
    const startTime = firstClip?.start ?? 0;
    const endTime = lastClip ? lastClip.start + (lastClip.length || 0) : 5;
    const clipText = firstClip?.asset?.text;
    const assetType = firstClip?.asset?.type;
    const derivedLabel = typeof clipText === 'string' && clipText.trim()
      ? clipText.trim().slice(0, 32)
      : assetType
        ? `${assetType.charAt(0).toUpperCase()}${assetType.slice(1)} ${index + 1}`
        : `Step ${index + 1}`;

    return {
      trackIndex: index,
      label: derivedLabel,
      description: '',
      startTime,
      endTime,
      clipCount: clips.length,
    };
  });
}

async function vmssAddTextClip(text, startTime = 0, options = {}) {
  if (!vmss.edit) return;

  const {
    fontSize = 48,
    fontWeight = 600,
    fontFamily = 'Work Sans',
    color = '#ffffff',
    align = 'center',
  } = options;

  await vmss.edit.addTrack(0, {
    clips: [{
      asset: {
        type: 'rich-text',
        text,
        font: {
          family: fontFamily,
          size: fontSize,
          weight: fontWeight,
          color,
          opacity: 1,
        },
        align: {
          horizontal: align,
          vertical: 'middle',
        },
      },
      start: startTime,
      length: 5,
      width: 600,
      height: 150,
    }],
  });

  vmssSyncStepsFromTracks();
  vmssRenderStepsPanel();
}

async function vmssAddShapeClip(shapeType, startTime = 0, options = {}) {
  if (!vmss.edit) return;

  const {
    fill = '#fecaca',
    stroke = '#ef4444',
    strokeWidth = 3,
    width = 200,
    height = 100,
    clipLength = 5,
    offset,
    position,
    transform,
    opacity = 1,
  } = options;

  let clipWidth = width;
  let clipHeight = height;

  switch (shapeType) {
    case 'rect': {
      clipWidth = options.width ?? 220;
      clipHeight = options.height ?? 120;
      break;
    }
    case 'circle': {
      clipWidth = options.width ?? 180;
      clipHeight = options.height ?? 180;
      break;
    }
    case 'arrow': {
      clipWidth = options.width ?? 240;
      clipHeight = options.height ?? 140;
      break;
    }
    case 'line': {
      clipWidth = options.width ?? 240;
      clipHeight = options.height ?? 120;
      break;
    }
    default:
      console.warn('Unknown shape type:', shapeType);
      return;
  }

  const svgContent = vmssCreateShapeSvg(shapeType, clipWidth, clipHeight, {
    fill,
    stroke,
    strokeWidth,
  });

  await vmss.edit.addTrack(0, {
    clips: [{
      asset: {
        type: 'svg',
        src: svgContent,
        opacity,
      },
      start: startTime,
      length: clipLength,
      width: clipWidth,
      height: clipHeight,
      ...(offset ? { offset } : {}),
      ...(position ? { position } : {}),
      ...(transform ? { transform } : {}),
    }],
  });

  vmssSyncStepsFromTracks();
  vmssRenderStepsPanel();
}

async function vmssAddImageClip(imageUrl, startTime = 0, options = {}) {
  if (!vmss.edit) return;

  const { width = 400, height = 300 } = options;

  await vmss.edit.addTrack(0, {
    clips: [{
      asset: {
        type: 'image',
        src: imageUrl,
      },
      start: startTime,
      length: 5,
      width,
      height,
    }],
  });

  vmssSyncStepsFromTracks();
  vmssRenderStepsPanel();
}

async function vmssAddVideoClip(videoUrl, startTime = 0, options = {}) {
  if (!vmss.edit) return;

  const { trim = 0, volume = 1, firebaseDocId } = options;

  // If Firebase doc ID is provided, use the proxy endpoint to bypass CORS
  let clipVideoUrl = videoUrl;
  if (firebaseDocId) {
    clipVideoUrl = `${VMSS_API_BASE_URL()}/api/video-manuals/stream/${firebaseDocId}`;
    console.log('Using proxy URL for video:', clipVideoUrl);
  }

  await vmss.edit.addTrack(0, {
    clips: [{
      asset: {
        type: 'video',
        src: clipVideoUrl,
        trim,
        volume,
      },
      start: startTime,
      length: 10,
    }],
  });

  vmssSyncStepsFromTracks();
  vmssRenderStepsPanel();
}

async function vmssAddStep() {
  if (!vmss.edit) return;

  await vmss.edit.addTrack(vmss.steps.length, { clips: [] });
  vmssSyncStepsFromTracks();
  vmssRenderStepsPanel();
}

async function vmssDeleteStep(stepIndex) {
  if (!vmss.edit || stepIndex < 0 || stepIndex >= vmss.steps.length) return;

  await vmss.edit.deleteTrack(stepIndex);

  if (vmss.currentStepIdx >= vmss.steps.length - 1) {
    vmss.currentStepIdx = Math.max(0, vmss.steps.length - 2);
  }

  vmssSyncStepsFromTracks();
  vmssRenderStepsPanel();
}

function vmssSelectStep(stepIndex) {
  if (stepIndex < 0 || stepIndex >= vmss.steps.length) return;

  vmss.currentStepIdx = stepIndex;
  const step = vmss.steps[stepIndex];

  if (vmss.edit && step) {
    vmss.edit.seek(step.startTime + 0.001);
  }

  vmssRenderStepsPanel();
}

function vmssTogglePlay() {
  if (!vmss.edit) return;

  if (vmss.edit.isPlaying) {
    vmss.edit.pause();
  } else {
    vmss.edit.play();
  }
}

function vmssUpdatePlayButton(isPlaying) {
  const btn = document.getElementById('vmss-play-btn');
  if (!btn) return;

  const icon = btn.querySelector('i');
  if (icon) {
    icon.className = isPlaying ? 'ri-pause-fill text-lg' : 'ri-play-fill text-lg';
  }
}

function vmssMarkDirty() {
  vmss.dirty = true;
  vmssSetStatus('Unsaved changes');
}

function vmssSetStatus(message) {
  const status = document.getElementById('vmss-save-status');
  if (status) status.textContent = message;
}

function vmssSetTitle(title) {
  vmss.title = title || 'Video Manual 2';
  const input = document.getElementById('vmss-title');
  if (input) input.value = vmss.title;
}

function vmssBindShellEvents() {
  const input = document.getElementById('vmss-title');
  if (input && !input.dataset.listenerBound) {
    input.dataset.listenerBound = 'true';
    input.addEventListener('input', (event) => {
      vmss.title = event.target.value || 'Video Manual 2';
      vmssMarkDirty();
    });
  }

  vmssBindPreviewDrawHandlers();
  vmssUpdateDrawModeUI();
}

function vmssClamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function vmssGetCanvasViewportSize() {
  const editJson = vmss.edit?.getEdit?.();
  const width = Number(editJson?.output?.size?.width);
  const height = Number(editJson?.output?.size?.height);

  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width, height };
  }

  const preset = editJson?.output?.resolution;
  const presets = {
    preview: { width: 512, height: 288 },
    mobile: { width: 640, height: 360 },
    sd: { width: 1024, height: 576 },
    hd: { width: 1280, height: 720 },
    fhd: { width: 1920, height: 1080 },
    1080: { width: 1920, height: 1080 },
    '4k': { width: 3840, height: 2160 },
  };

  return presets[preset] || { width: 1280, height: 720 };
}

function vmssGetDrawPointFromEvent(event, surface) {
  const rect = surface?.getBoundingClientRect?.();
  if (!rect || !rect.width || !rect.height) return null;

  return {
    x: vmssClamp(event.clientX - rect.left, 0, rect.width),
    y: vmssClamp(event.clientY - rect.top, 0, rect.height),
  };
}

function vmssClearDrawPreview() {
  const overlay = document.getElementById('vmss-draw-overlay');
  if (overlay) {
    overlay.innerHTML = '';
  }
}

function vmssRenderArrowDrawPreview() {
  const overlay = document.getElementById('vmss-draw-overlay');
  const draft = vmss.drawDraft;
  if (!overlay) return;

  if (!draft) {
    overlay.innerHTML = '';
    return;
  }

  const width = Math.max(1, overlay.clientWidth || 1);
  const height = Math.max(1, overlay.clientHeight || 1);
  const strokeWidth = 4;
  const head = Math.max(12, Math.min(28, Math.hypot(draft.currentX - draft.startX, draft.currentY - draft.startY) * 0.2));
  const tipX = draft.currentX;
  const tipY = draft.currentY;
  const angle = Math.atan2(draft.currentY - draft.startY, draft.currentX - draft.startX);
  const leftX = tipX - (head * Math.cos(angle - Math.PI / 6));
  const leftY = tipY - (head * Math.sin(angle - Math.PI / 6));
  const rightX = tipX - (head * Math.cos(angle + Math.PI / 6));
  const rightY = tipY - (head * Math.sin(angle + Math.PI / 6));

  overlay.innerHTML = `<svg viewBox="0 0 ${width} ${height}" class="h-full w-full overflow-visible"><line x1="${draft.startX}" y1="${draft.startY}" x2="${tipX}" y2="${tipY}" stroke="#38bdf8" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="0.9"/><path d="M ${leftX} ${leftY} L ${tipX} ${tipY} L ${rightX} ${rightY}" fill="none" stroke="#38bdf8" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/></svg>`;
}

function vmssUpdateDrawModeUI() {
  const overlay = document.getElementById('vmss-draw-overlay');
  const hint = document.getElementById('vmss-draw-hint');
  const arrowButton = document.getElementById('vmss-shape-arrow-btn');
  const drawingArrow = vmss.drawMode === 'arrow';

  if (overlay) {
    overlay.classList.toggle('hidden', !drawingArrow);
    overlay.classList.toggle('pointer-events-none', !drawingArrow);
    overlay.classList.toggle('pointer-events-auto', drawingArrow);
    overlay.classList.toggle('cursor-crosshair', drawingArrow);
  }

  if (hint) {
    hint.classList.toggle('hidden', !drawingArrow || !!vmss.drawDraft);
  }

  if (arrowButton) {
    arrowButton.classList.toggle('bg-sky-100', drawingArrow);
    arrowButton.classList.toggle('text-sky-700', drawingArrow);
    arrowButton.classList.toggle('ring-2', drawingArrow);
    arrowButton.classList.toggle('ring-sky-300', drawingArrow);
    arrowButton.classList.toggle('dark:bg-sky-900/40', drawingArrow);
    arrowButton.classList.toggle('dark:text-sky-200', drawingArrow);
  }

  if (!drawingArrow) {
    vmssClearDrawPreview();
  }
}

function vmssCancelShapeDraw() {
  vmss.drawDraft = null;
  vmss.drawMode = null;
  vmssUpdateDrawModeUI();
}

function vmssStartShapeDraw(mode) {
  vmss.drawDraft = null;
  vmss.drawMode = vmss.drawMode === mode ? null : mode;
  vmssUpdateDrawModeUI();
}

async function vmssCommitArrowDraw(draft, surface) {
  if (!vmss.edit || !draft || !surface) return;

  const rect = surface.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const viewport = vmssGetCanvasViewportSize();
  const scaleX = viewport.width / rect.width;
  const scaleY = viewport.height / rect.height;
  const deltaX = (draft.currentX - draft.startX) * scaleX;
  const deltaY = (draft.currentY - draft.startY) * scaleY;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance < 36) {
    return;
  }

  const centerX = ((draft.startX + draft.currentX) / 2) * scaleX;
  const centerY = ((draft.startY + draft.currentY) / 2) * scaleY;
  const rotation = Math.round((Math.atan2(deltaY, deltaX) * 180 / Math.PI) * 10) / 10;
  const arrowHeight = Math.max(36, Math.min(180, distance * 0.22));

  await vmssAddShapeClip('arrow', vmss.edit?.playbackTime || 0, {
    width: Math.max(80, Math.round(distance)),
    height: Math.round(arrowHeight),
    offset: {
      x: Number(((centerX - (viewport.width / 2)) / viewport.width).toFixed(4)),
      y: Number((((viewport.height / 2) - centerY) / viewport.height).toFixed(4)),
    },
    transform: {
      rotate: {
        angle: rotation,
      },
    },
  });
}

function vmssBindPreviewDrawHandlers() {
  vmssUnbindPreviewDrawHandlers();

  const surface = document.getElementById('vmss-draw-overlay');
  if (!surface) return;

  vmss.previewDrawSurface = surface;

  vmss.onPreviewDrawPointerDown = (event) => {
    if (vmss.drawMode !== 'arrow' || event.button !== 0) return;

    const point = vmssGetDrawPointFromEvent(event, surface);
    if (!point) return;

    event.preventDefault();
    event.stopPropagation();

    vmss.drawDraft = {
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
    };

    surface.setPointerCapture?.(event.pointerId);
    vmssUpdateDrawModeUI();
    vmssRenderArrowDrawPreview();
  };

  vmss.onPreviewDrawPointerMove = (event) => {
    if (!vmss.drawDraft || vmss.drawDraft.pointerId !== event.pointerId) return;

    const point = vmssGetDrawPointFromEvent(event, surface);
    if (!point) return;

    event.preventDefault();
    event.stopPropagation();

    vmss.drawDraft.currentX = point.x;
    vmss.drawDraft.currentY = point.y;
    vmssRenderArrowDrawPreview();
  };

  vmss.onPreviewDrawPointerUp = async (event) => {
    if (!vmss.drawDraft || vmss.drawDraft.pointerId !== event.pointerId) return;

    const isCancelled = event.type === 'pointercancel';
    const point = vmssGetDrawPointFromEvent(event, surface);
    if (point && !isCancelled) {
      vmss.drawDraft.currentX = point.x;
      vmss.drawDraft.currentY = point.y;
    }

    const draft = vmss.drawDraft;
    vmss.drawDraft = null;

    event.preventDefault();
    event.stopPropagation();

    surface.releasePointerCapture?.(event.pointerId);
    vmssUpdateDrawModeUI();

    if (!isCancelled) {
      await vmssCommitArrowDraw(draft, surface);
    }

    vmssCancelShapeDraw();
  };

  surface.addEventListener('pointerdown', vmss.onPreviewDrawPointerDown);
  surface.addEventListener('pointermove', vmss.onPreviewDrawPointerMove);
  surface.addEventListener('pointerup', vmss.onPreviewDrawPointerUp);
  surface.addEventListener('pointercancel', vmss.onPreviewDrawPointerUp);
}

function vmssUnbindPreviewDrawHandlers() {
  if (vmss.previewDrawSurface && vmss.onPreviewDrawPointerDown) {
    vmss.previewDrawSurface.removeEventListener('pointerdown', vmss.onPreviewDrawPointerDown);
  }

  if (vmss.previewDrawSurface && vmss.onPreviewDrawPointerMove) {
    vmss.previewDrawSurface.removeEventListener('pointermove', vmss.onPreviewDrawPointerMove);
  }

  if (vmss.previewDrawSurface && vmss.onPreviewDrawPointerUp) {
    vmss.previewDrawSurface.removeEventListener('pointerup', vmss.onPreviewDrawPointerUp);
    vmss.previewDrawSurface.removeEventListener('pointercancel', vmss.onPreviewDrawPointerUp);
  }

  vmss.previewDrawSurface = null;
  vmss.onPreviewDrawPointerDown = null;
  vmss.onPreviewDrawPointerMove = null;
  vmss.onPreviewDrawPointerUp = null;
  vmss.drawDraft = null;
  vmssClearDrawPreview();
}

function vmssStartClock() {
  vmssUpdateClock();
  vmss.clockTimer = window.setInterval(vmssUpdateClock, 150);
}

function vmssUpdateClock() {
  const display = document.getElementById('vmss-time-display');
  if (!display || !vmss.edit) return;
  display.textContent = vmssFormatTime(vmss.edit.playbackTime || 0);
}

function vmssGetSelectedClipContext() {
  if (!vmss.edit || vmss.currentStepIdx == null || vmss.selectedClipId == null) {
    return null;
  }

  const editJson = vmss.edit.getEdit?.();
  const clip = editJson?.timeline?.tracks?.[vmss.currentStepIdx]?.clips?.[vmss.selectedClipId];
  const clipId = vmss.edit.getClipId?.(vmss.currentStepIdx, vmss.selectedClipId);

  if (!clip || !clipId) {
    return null;
  }

  return {
    clip,
    clipId,
    trackIndex: vmss.currentStepIdx,
    clipIndex: vmss.selectedClipId,
  };
}

async function vmssTrimSelectedClip() {
  const context = vmssGetSelectedClipContext();
  if (!context) {
    alert('Select a video clip to trim.');
    return;
  }

  const { clip, trackIndex, clipIndex } = context;
  if (clip.asset?.type !== 'video') {
    alert('Trim is currently available for video clips only.');
    return;
  }

  const clipStart = Number(clip.start);
  const clipLength = Number(clip.length);
  const playhead = Number(vmss.edit?.playbackTime);

  if (!Number.isFinite(clipStart) || !Number.isFinite(clipLength) || clipLength <= 0) {
    alert('The selected clip cannot be trimmed because its timing is not numeric.');
    return;
  }

  if (!Number.isFinite(playhead)) {
    alert('The timeline playhead is not available.');
    return;
  }

  const splitOffset = playhead - clipStart;
  if (splitOffset <= 0.05 || splitOffset >= clipLength - 0.05) {
    alert('Move the playhead inside the selected clip to trim it.');
    return;
  }

  const editJson = JSON.parse(JSON.stringify(vmss.edit.getEdit()));
  const track = editJson?.timeline?.tracks?.[trackIndex];
  if (!track?.clips?.[clipIndex]) {
    alert('Could not find the selected clip in the timeline.');
    return;
  }

  const sourceClip = track.clips[clipIndex];
  const sourceTrim = Number(sourceClip.asset?.trim) || 0;
  const firstClip = {
    ...sourceClip,
    length: Number(splitOffset.toFixed(3)),
  };
  const secondClip = {
    ...sourceClip,
    start: Number(playhead.toFixed(3)),
    length: Number((clipLength - splitOffset).toFixed(3)),
    asset: {
      ...sourceClip.asset,
      trim: Number((sourceTrim + splitOffset).toFixed(3)),
    },
  };

  if (secondClip.alias) {
    delete secondClip.alias;
  }

  track.clips.splice(clipIndex, 1, firstClip, secondClip);

  await vmssLoadTemplate(editJson, {
    title: vmss.title,
    assetSourceMap: vmss.assetSourceMap,
  });

  vmss.edit?.seek?.(playhead + 0.001);
  vmss.currentStepIdx = trackIndex;
  vmss.selectedClipId = null;
  vmssMarkDirty();
  vmssSetStatus(`Clip split at ${vmssFormatTime(playhead)}`);
}

function vmssRenderEditorShell(container) {
  container.innerHTML = `
    <div id="vmss-root" class="flex flex-col bg-gray-100 dark:bg-gray-900" style="height:calc(100vh - 150px); min-height: 860px;">
      <div class="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
        <button onclick="vmssGoBack()" class="flex items-center gap-1 rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">
          <i class="ri-arrow-left-line"></i>Back
        </button>
        <button onclick="vmss.edit?.undo()" class="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" title="Undo">
          <i class="ri-arrow-go-back-line text-lg"></i>
        </button>
        <button onclick="vmss.edit?.redo()" class="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" title="Redo">
          <i class="ri-arrow-go-forward-line text-lg"></i>
        </button>
        <div class="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
        <button onclick="vmssLoadStarterProject()" class="flex items-center gap-1 rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
          <i class="ri-sparkling-line"></i>Starter
        </button>
        <button onclick="vmssRestoreLocalProject()" class="flex items-center gap-1 rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
          <i class="ri-history-line"></i>Restore
        </button>
        <div class="flex-1"></div>
        <input id="vmss-title" type="text" value="Video Manual 2" class="w-56 border-b border-transparent bg-transparent px-2 text-center text-sm font-medium hover:border-gray-300 focus:border-blue-400 focus:outline-none dark:text-white">
        <span id="vmss-save-status" class="text-xs text-gray-400">Loading...</span>
        <div class="flex-1"></div>
        <button onclick="vmssSaveProject()" class="flex items-center gap-1 rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">
          <i class="ri-save-line"></i>Save
        </button>
        <button onclick="vmssExport()" class="flex items-center gap-1 rounded bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600">
          <i class="ri-download-line"></i>Export
        </button>
      </div>

      <div class="flex min-h-0 flex-1 overflow-hidden">
        <div class="flex w-52 flex-shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div class="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <span>Steps (Tracks)</span>
            <span id="vmss-step-count" class="text-xs font-normal text-gray-400">0</span>
          </div>
          <div id="vmss-steps-list" class="flex-1 space-y-1 overflow-y-auto p-2">
            <p class="py-4 text-center text-xs text-gray-400">Load a template to see steps</p>
          </div>
          <div class="border-t border-gray-100 p-2 dark:border-gray-700">
            <button onclick="vmssAddStep()" class="flex w-full items-center justify-center gap-1 rounded bg-gray-100 py-1.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
              <i class="ri-add-line"></i>Add Step
            </button>
          </div>
        </div>

        <div class="flex min-w-0 flex-1 flex-col bg-gray-200 dark:bg-gray-950">
          <div id="vmss-preview-surface" class="relative flex flex-1 items-center justify-center overflow-hidden bg-gray-800 dark:bg-black">
            <div data-shotstack-studio class="h-full w-full"></div>
            <div id="vmss-draw-overlay" class="pointer-events-none absolute inset-0 z-10 hidden"></div>
            <div id="vmss-draw-hint" class="pointer-events-none absolute left-4 top-4 z-20 hidden rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm">Drag on the preview to draw an arrow</div>
          </div>

          <div class="flex-shrink-0 border-t border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
              <button onclick="vmssTogglePlay()" id="vmss-play-btn" class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600">
                <i class="ri-play-fill text-lg"></i>
              </button>
              <span id="vmss-time-display" class="w-20 font-mono text-xs text-gray-600 dark:text-gray-300">0:00.0</span>
              <div class="flex-1"></div>
              <button onclick="vmssTrimSelectedClip()" class="inline-flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200" title="Trim selected video clip">
                <i class="ri-scissors-cut-line"></i>Trim
              </button>
            </div>
            <div data-shotstack-timeline style="height: 160px; position: relative;"></div>
          </div>
        </div>

        <div class="flex w-56 flex-shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div class="border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">Add Elements</div>

          <div class="flex-1 overflow-y-auto p-3">
            <div class="mb-4">
              <p class="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Text</p>
              <div class="grid grid-cols-2 gap-2">
                <button onclick="vmssAddTextClip('Title', vmss.edit?.playbackTime || 0, {fontSize: 72, fontWeight: 600})" class="rounded bg-gray-100 py-3 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Title</button>
                <button onclick="vmssAddTextClip('Body text', vmss.edit?.playbackTime || 0, {fontSize: 36, fontWeight: 400})" class="rounded bg-gray-100 py-3 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">Body Text</button>
              </div>
            </div>

            <div class="mb-4">
              <p class="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Shapes</p>
              <div class="grid grid-cols-4 gap-2">
                <button onclick="vmssAddShapeClip('rect', vmss.edit?.playbackTime || 0)" class="flex aspect-square items-center justify-center rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600" title="Rectangle"><div class="h-5 w-6 rounded-sm border-2 border-gray-800 dark:border-gray-200"></div></button>
                <button onclick="vmssAddShapeClip('circle', vmss.edit?.playbackTime || 0)" class="flex aspect-square items-center justify-center rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600" title="Circle"><div class="h-6 w-6 rounded-full border-2 border-gray-800 dark:border-gray-200"></div></button>
                <button id="vmss-shape-arrow-btn" onclick="vmssStartShapeDraw('arrow')" class="flex aspect-square items-center justify-center rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600" title="Draw Arrow"><i class="ri-arrow-right-up-line text-lg text-gray-800 dark:text-gray-200"></i></button>
                <button onclick="vmssAddShapeClip('line', vmss.edit?.playbackTime || 0)" class="flex aspect-square items-center justify-center rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600" title="Line"><div class="h-0.5 w-6 rotate-45 bg-gray-800 dark:bg-gray-200"></div></button>
              </div>
            </div>

            <div class="mb-4">
              <p class="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Media</p>
              <button onclick="document.getElementById('vmss-image-input').click()" class="mb-2 flex w-full items-center justify-center gap-2 rounded bg-gray-100 py-3 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"><i class="ri-image-add-line"></i>Upload Image</button>
              <button onclick="document.getElementById('vmss-video-input').click()" class="flex w-full items-center justify-center gap-2 rounded bg-gray-100 py-3 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"><i class="ri-video-add-line"></i>Upload Video</button>
              <input id="vmss-image-input" type="file" accept="image/*" class="hidden" onchange="vmssHandleImageUpload(event)">
              <input id="vmss-video-input" type="file" accept="video/*" class="hidden" onchange="vmssHandleVideoUpload(event)">
            </div>

            <div class="mb-4">
              <p class="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Quick Actions</p>
              <button onclick="vmssDeleteSelectedClip()" class="flex w-full items-center justify-center gap-2 rounded bg-red-50 py-2 text-xs text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"><i class="ri-delete-bin-line"></i>Delete Selected</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function vmssRenderStepsPanel() {
  const list = document.getElementById('vmss-steps-list');
  const count = document.getElementById('vmss-step-count');
  if (!list) return;

  if (count) count.textContent = String(vmss.steps.length);

  if (!vmss.steps.length) {
    list.innerHTML = '<p class="py-4 text-center text-xs text-gray-400">No tracks or steps yet</p>';
    return;
  }

  list.innerHTML = vmss.steps.map((step, index) => `
    <div class="group relative cursor-pointer rounded border p-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${index === vmss.currentStepIdx ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600'}" onclick="vmssSelectStep(${index})">
      <div class="flex items-center gap-2">
        <span class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-blue-100 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">${index + 1}</span>
        <span class="flex-1 truncate text-xs font-medium dark:text-white">${vmssEscapeHtml(step.label)}</span>
        <span class="text-[10px] text-gray-400">${step.clipCount} clip${step.clipCount !== 1 ? 's' : ''}</span>
      </div>
      <div class="mt-1 pl-7 text-[10px] text-gray-400">${vmssFormatTime(step.startTime)} - ${vmssFormatTime(step.endTime)}</div>
      ${vmss.steps.length > 1 ? `<button onclick="event.stopPropagation(); vmssDeleteStep(${index})" class="absolute right-1 top-1 text-gray-400 opacity-0 hover:text-red-500 group-hover:opacity-100"><i class="ri-close-line text-sm"></i></button>` : ''}
    </div>
  `).join('');
}

async function vmssHandleImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  vmssSetStatus('Uploading image to Firebase...');

  // For performance, we can use blob URL for preview while uploading to Firebase
  const url = URL.createObjectURL(file);
  const image = new Image();

  image.onload = async () => {
    const maxWidth = 600;
    const scale = image.width > maxWidth ? maxWidth / image.width : 1;

    // Add the clip with blob URL first for immediate feedback
    await vmssAddImageClip(url, vmss.edit?.playbackTime || 0, {
      width: Math.round(image.width * scale),
      height: Math.round(image.height * scale),
    });

    vmssSetStatus('Image added (uploading to Firebase...)');

    // Upload to Firebase in background
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result;
        
        try {
          const response = await fetch(`${VMSS_API_BASE_URL()}/api/video-manuals/upload-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64Data,
              fileName: file.name,
              projectTitle: vmss.title || 'Video Manual 2'
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.warn('Image backup to Firebase failed:', errorData.error);
            vmssSetStatus('Image added (backup upload failed, but local copy retained)');
            return;
          }

          const result = await response.json();
          vmssRememberAssetSource(url, result.downloadUrl);
          vmssSetStatus('Image added and backed up to Firebase');
          console.log('✅ Image uploaded to Firebase:', result.downloadUrl);

        } catch (error) {
          console.warn('Image backup to Firebase failed:', error);
          vmssSetStatus('Image added (backup failed, but local copy retained)');
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.warn('Could not upload image to Firebase:', error);
    }
  };

  image.src = url;
  event.target.value = '';
}

async function vmssHandleVideoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  vmssSetStatus('Uploading video to Firebase...');

  try {
    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      
      try {
        // Upload to Firebase via API
        const response = await fetch(`${VMSS_API_BASE_URL()}/api/video-manuals/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoBase64: base64Data,
            fileName: file.name,
            projectTitle: vmss.title || 'Video Manual 2',
            factory: ''
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const result = await response.json();
        const persistentUrl = result.downloadUrl;
        const previewUrl = `${VMSS_API_BASE_URL()}/api/video-manuals/stream/${result.documentId}`;
        vmssRememberAssetSource(previewUrl, persistentUrl);

        // Add video clip with persistent Firebase URL
        await vmssAddVideoClip(persistentUrl, vmss.edit?.playbackTime || 0, {
          firebaseDocId: result.documentId
        });

        vmssSetStatus('Video uploaded and added');
        console.log('✅ Video uploaded to Firebase:', persistentUrl);

      } catch (error) {
        console.error('❌ Video upload failed:', error);
        vmssSetStatus('Video upload failed: ' + error.message);
        alert(`Video upload failed: ${error.message}`);
      }
    };

    reader.readAsDataURL(file);
    event.target.value = '';

  } catch (error) {
    console.error('❌ Error reading file:', error);
    vmssSetStatus('Error reading file');
    alert(`Error: ${error.message}`);
  }
}

async function vmssDeleteSelectedClip() {
  if (!vmss.edit || vmss.selectedClipId === null) {
    alert('No clip selected');
    return;
  }

  await vmss.edit.deleteClip(vmss.currentStepIdx, vmss.selectedClipId);
  vmss.selectedClipId = null;
}

async function vmssExport() {
  if (!vmss.edit) {
    alert('No project loaded');
    return;
  }

  vmssClearRenderActions();
  vmss.lastRenderId = null;
  vmss.lastRenderUrl = null;
  vmssSetStatus('Preparing render request...');

  try {
    // Get the edit JSON from Shotstack
    const editJson = vmssPrepareEditForRender(vmss.edit.getEdit());

    // Send to backend for cloud rendering
    const response = await fetch(`${VMSS_API_BASE_URL()}/api/video-manuals/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        editJson: editJson,
        projectTitle: vmss.title || 'Video Manual 2'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Render request failed');
    }

    const result = await response.json();
    const renderId = result.renderId;

    vmssSetStatus('Render queued on Shotstack Sandbox (Free)...');
    console.log('✅ Render queued:', renderId);

    // Poll for render status
    await vmssWaitForRender(renderId);

  } catch (error) {
    console.error('❌ Export failed:', error);
    vmssSetStatus('Export failed: ' + error.message);
    alert(`Export failed: ${error.message}`);
  }
}

async function vmssWaitForRender(renderId) {
  const maxAttempts = 120; // 10 minutes with 5-second intervals
  let attempts = 0;

  const checkStatus = async () => {
    const response = await fetch(`${VMSS_API_BASE_URL()}/api/video-manuals/render-status/${renderId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to check render status');
    }

    const result = await response.json();
    const { status, downloadUrl, progress } = result;

    if (status === 'done') {
      vmss.lastRenderId = renderId;
      vmss.lastRenderUrl = downloadUrl || null;
      vmssSetStatus('✅ Render complete!');
      vmssShowRenderComplete(renderId, downloadUrl);
      return true;
    }

    if (status === 'failed') {
      throw new Error(result.message || 'Render failed on Shotstack');
    }

    if (status === 'queued' || status === 'fetching' || status === 'rendering' || status === 'saving' || status === 'processing') {
      const progressText = progress ? ` (${progress}%)` : '';
      vmssSetStatus(`Shotstack status: ${status}${progressText}`);
      
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Render timeout (10 minutes)');
      }

      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      return await checkStatus();
    }

    return false;
  };

  return await checkStatus();
}

function vmssClearRenderActions() {
  const container = document.getElementById('vmss-render-actions');
  if (container) {
    container.remove();
  }
}

function vmssShowRenderComplete(renderId, downloadUrl) {
  const status = document.getElementById('vmss-save-status');
  if (!status) return;

  vmssClearRenderActions();

  const actions = document.createElement('div');
  actions.id = 'vmss-render-actions';
  actions.className = 'ml-3 inline-flex items-center gap-2';

  const downloadButton = document.createElement('button');
  downloadButton.className = 'inline-flex items-center gap-2 rounded bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600';
  downloadButton.innerHTML = '<i class="ri-download-line"></i>Download Video';
  downloadButton.onclick = () => {
    window.open(`${VMSS_API_BASE_URL()}/api/video-manuals/download/${renderId}`, '_blank');
  };

  actions.appendChild(downloadButton);

  if (downloadUrl) {
    const openButton = document.createElement('button');
    openButton.className = 'inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50';
    openButton.innerHTML = '<i class="ri-external-link-line"></i>Open URL';
    openButton.onclick = () => {
      window.open(downloadUrl, '_blank');
    };

    const copyButton = document.createElement('button');
    copyButton.className = 'inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50';
    copyButton.innerHTML = '<i class="ri-file-copy-line"></i>Copy URL';
    copyButton.onclick = async () => {
      try {
        await navigator.clipboard.writeText(downloadUrl);
        vmssSetStatus('Render URL copied');
      } catch (error) {
        console.error('Failed to copy render URL:', error);
        alert(downloadUrl);
      }
    };

    actions.appendChild(openButton);
    actions.appendChild(copyButton);
  }

  status.parentElement.appendChild(actions);
  console.log('✅ Video ready for download:', downloadUrl);
}

async function vmssSaveProject() {
  if (!vmss.edit) {
    alert('No project loaded');
    return;
  }

  const payload = {
    title: vmss.title,
    edit: vmss.edit.getEdit(),
    assetSourceMap: vmss.assetSourceMap,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(VMSS_STORAGE_KEY, JSON.stringify(payload));
  vmss.dirty = false;
  vmssSetStatus('Saved locally');
  console.log('Shotstack project JSON:', payload.edit);
}

function vmssGoBack() {
  if (vmss.dirty && !confirm('You have unsaved changes. Are you sure you want to leave?')) {
    return;
  }

  loadVideoManualPage();
}

function vmssOpenClassicEditor() {
  if (typeof loadVideoManual2Page === 'function') {
    loadVideoManual2Page();
  }
}

function vmssReadStoredProject() {
  try {
    const raw = localStorage.getItem(VMSS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse stored Shotstack project:', error);
    return null;
  }
}

async function vmssRestoreLocalProject() {
  const storedProject = vmssReadStoredProject();
  if (!storedProject?.edit) {
    alert('No saved Shotstack project found in local storage.');
    return;
  }

  await vmssLoadTemplate(storedProject.edit, {
    title: storedProject.title || 'Video Manual 2',
    assetSourceMap: storedProject.assetSourceMap || {},
  });
  vmss.dirty = false;
  vmssSetStatus('Restored local save');
}

async function vmssLoadStarterProject() {
  await vmssLoadTemplate(vmssCreateDefaultTemplate(), { title: 'Video Manual 2' });
  vmss.dirty = false;
  vmssSetStatus('Starter project loaded');
}

function vmssResetLocalProject() {
  localStorage.removeItem(VMSS_STORAGE_KEY);
  if (document.getElementById('vmss-editor')) {
    vmssLoadStarterProject();
  } else {
    loadVideoManualPage();
  }
}

function vmssFormatTime(sec) {
  let safeSeconds = Number(sec);
  if (!Number.isFinite(safeSeconds) || safeSeconds < 0) safeSeconds = 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
  const tenths = Math.floor((safeSeconds % 1) * 10);
  return `${minutes}:${seconds}.${tenths}`;
}

function vmssEscapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.loadVideoManualPage = loadVideoManualPage;
window.loadVideoManualShotstackPage = loadVideoManualShotstackPage;
window.vmss = vmss;
window.vmssInit = vmssInit;
window.vmssLoadTemplate = vmssLoadTemplate;
window.vmssAddTextClip = vmssAddTextClip;
window.vmssAddShapeClip = vmssAddShapeClip;
window.vmssStartShapeDraw = vmssStartShapeDraw;
window.vmssAddImageClip = vmssAddImageClip;
window.vmssAddVideoClip = vmssAddVideoClip;
window.vmssTrimSelectedClip = vmssTrimSelectedClip;
window.vmssAddStep = vmssAddStep;
window.vmssDeleteStep = vmssDeleteStep;
window.vmssSelectStep = vmssSelectStep;
window.vmssTogglePlay = vmssTogglePlay;
window.vmssExport = vmssExport;
window.vmssSaveProject = vmssSaveProject;
window.vmssGoBack = vmssGoBack;
window.vmssOpenClassicEditor = vmssOpenClassicEditor;
window.vmssRestoreLocalProject = vmssRestoreLocalProject;
window.vmssLoadStarterProject = vmssLoadStarterProject;
window.vmssResetLocalProject = vmssResetLocalProject;
window.vmssDeleteSelectedClip = vmssDeleteSelectedClip;
window.vmssHandleImageUpload = vmssHandleImageUpload;
window.vmssHandleVideoUpload = vmssHandleVideoUpload;
window.vmssSetDebug = function vmssSetDebug(enabled) {
  vmss.debugEnabled = Boolean(enabled);
  console.log('[VMSS DEBUG] enabled =', vmss.debugEnabled);
};
window.vmssDumpLayout = function vmssDumpLayout() {
  const snapshot = vmssGetLayoutSnapshot();
  console.log('[VMSS DEBUG] layout snapshot', snapshot);
  return snapshot;
};
window.vmssDumpClipVisual = function vmssDumpClipVisual() {
  const snapshot = vmssGetClipVisualSnapshot();
  console.log('[VMSS DEBUG] clip visual snapshot', snapshot);
  return snapshot;
};
