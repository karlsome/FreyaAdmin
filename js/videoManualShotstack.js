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

  main.innerHTML = `
    <div class="min-h-[calc(100vh-120px)] rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-sky-50 p-4 dark:from-gray-900 dark:via-gray-900 dark:to-slate-950">
      <div class="mx-auto w-full max-w-[1720px]">
        <div id="vmss-editor" class="overflow-hidden rounded-[28px] border border-white/60 bg-white/90 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/90"></div>
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
    vmss.timeline = new Timeline(vmss.edit, timelineContainer, { resizable: true });
    await vmss.timeline.load();
  }

  vmss.controls = new Controls(vmss.edit);
  await vmss.controls.load();

  vmssRegisterToolbarButtons();
  vmssBindEvents();
  vmssSyncStepsFromTracks();
  vmssRenderStepsPanel();
  vmssSetTitle(options.title || vmss.title);
  vmssSetStatus('Ready');
  vmssStartClock();
}

function vmssDispose() {
  if (vmss.clockTimer) {
    window.clearInterval(vmss.clockTimer);
    vmss.clockTimer = null;
  }

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

function vmssRegisterToolbarButtons() {
  if (!vmss.ui) return;

  vmss.ui.registerButton({
    id: 'add-title',
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3H13"/><path d="M8 3V13"/><path d="M5 13H11"/></svg>`,
    tooltip: 'Add Title',
  });

  vmss.ui.registerButton({
    id: 'add-body-text',
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h12M2 8h10M2 12h8"/></svg>`,
    tooltip: 'Add Body Text',
  });

  vmss.ui.registerButton({
    id: 'add-rect',
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/></svg>`,
    tooltip: 'Add Rectangle',
    dividerBefore: true,
  });

  vmss.ui.registerButton({
    id: 'add-circle',
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/></svg>`,
    tooltip: 'Add Circle',
  });

  vmss.ui.registerButton({
    id: 'add-arrow',
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13L13 3M13 3H6M13 3v7"/></svg>`,
    tooltip: 'Add Arrow',
  });

  vmss.ui.registerButton({
    id: 'add-image',
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/><circle cx="5.5" cy="6.5" r="1.5"/><path d="M14 13l-3-4-2 2.5L6 8l-4 5"/></svg>`,
    tooltip: 'Add Image',
    dividerBefore: true,
  });

  vmss.ui.on('button:add-title', ({ position }) => {
    vmssAddTextClip('Title', position, { fontSize: 72, fontWeight: 600 });
  });

  vmss.ui.on('button:add-body-text', ({ position }) => {
    vmssAddTextClip('Body text here', position, { fontSize: 36, fontWeight: 400 });
  });

  vmss.ui.on('button:add-rect', ({ position }) => {
    vmssAddShapeClip('rect', position, { fill: '#ef4444', stroke: '#dc2626', strokeWidth: 3 });
  });

  vmss.ui.on('button:add-circle', ({ position }) => {
    vmssAddShapeClip('circle', position, { fill: 'none', stroke: '#ef4444', strokeWidth: 4 });
  });

  vmss.ui.on('button:add-arrow', ({ position }) => {
    vmssAddShapeClip('arrow', position, { stroke: '#ef4444', strokeWidth: 4 });
  });

  vmss.ui.on('button:add-image', () => {
    const input = document.getElementById('vmss-image-input');
    if (input) input.click();
  });
}

function vmssBindEvents() {
  if (!vmss.edit) return;

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
  });

  vmss.edit.events.on('clip:deleted', () => {
    vmssMarkDirty();
    vmssRenderStepsPanel();
  });

  vmss.edit.events.on('clip:selected', (data) => {
    vmss.selectedClipId = data?.clipIndex ?? null;
    vmss.currentStepIdx = data?.trackIndex ?? 0;
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
    fill = 'none',
    stroke = '#ef4444',
    strokeWidth = 3,
    width = 200,
    height = 100,
  } = options;

  let svgContent;

  switch (shapeType) {
    case 'rect':
      svgContent = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${width - strokeWidth}" height="${height - strokeWidth}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="4"/></svg>`;
      break;
    case 'circle': {
      const radius = Math.min(width, height) / 2 - strokeWidth;
      svgContent = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><circle cx="${width / 2}" cy="${height / 2}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/></svg>`;
      break;
    }
    case 'arrow':
      svgContent = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${stroke}"/></marker></defs><line x1="10" y1="${height - 10}" x2="${width - 20}" y2="20" stroke="${stroke}" stroke-width="${strokeWidth}" marker-end="url(#arrowhead)"/></svg>`;
      break;
    case 'line':
      svgContent = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="${height - 10}" x2="${width - 10}" y2="10" stroke="${stroke}" stroke-width="${strokeWidth}"/></svg>`;
      break;
    default:
      console.warn('Unknown shape type:', shapeType);
      return;
  }

  await vmss.edit.addTrack(0, {
    clips: [{
      asset: {
        type: 'svg',
        src: svgContent,
        opacity: 1,
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
          <div class="flex flex-1 items-center justify-center overflow-hidden bg-gray-800 dark:bg-black">
            <div data-shotstack-studio class="h-full w-full"></div>
          </div>

          <div class="flex-shrink-0 border-t border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
              <button onclick="vmssTogglePlay()" id="vmss-play-btn" class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600">
                <i class="ri-play-fill text-lg"></i>
              </button>
              <span id="vmss-time-display" class="w-20 font-mono text-xs text-gray-600 dark:text-gray-300">0:00.0</span>
              <div class="flex-1"></div>
              <button onclick="vmss.timeline?.zoomOut()" class="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 dark:bg-gray-700">−</button>
              <button onclick="vmss.timeline?.zoomIn()" class="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 dark:bg-gray-700">+</button>
            </div>
            <div data-shotstack-timeline style="height: 160px; overflow: hidden;"></div>
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
                <button onclick="vmssAddShapeClip('arrow', vmss.edit?.playbackTime || 0)" class="flex aspect-square items-center justify-center rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600" title="Arrow"><i class="ri-arrow-right-up-line text-lg text-gray-800 dark:text-gray-200"></i></button>
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
window.vmssAddImageClip = vmssAddImageClip;
window.vmssAddVideoClip = vmssAddVideoClip;
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
