// ═══════════════════════════════════════════════════════════════════════════
//  VIDEO MANUAL CREATOR – Shotstack SDK Integration (Vanilla JS)
//  Proof-of-concept showing steps panel synced with Shotstack tracks/clips
// ═══════════════════════════════════════════════════════════════════════════

// ── State ───────────────────────────────────────────────────────────────────
const vmss = {
  edit: null,
  canvas: null,
  timeline: null,
  controls: null,
  ui: null,
  
  // Step-to-track mapping (each "step" = a track in Shotstack)
  steps: [],
  currentStepIdx: 0,
  selectedClipId: null,
  
  // Project metadata
  project: null,
  dirty: false,
};

// ── Initialize Shotstack ────────────────────────────────────────────────────
async function vmssInit(containerSelector = '#vmss-editor') {
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.error('Container not found:', containerSelector);
    return;
  }

  // Render the editor shell
  vmssRenderEditorShell(container);

  // Wait for DOM to be ready
  await new Promise(r => setTimeout(r, 0));
}

// ── Load a template/project ─────────────────────────────────────────────────
async function vmssLoadTemplate(templateJsonOrUrl) {
  const { Edit, Canvas, Timeline, Controls, UIController } = window.ShotstackStudio;
  
  // Fetch template if URL provided
  let template = templateJsonOrUrl;
  if (typeof templateJsonOrUrl === 'string') {
    const response = await fetch(templateJsonOrUrl);
    template = await response.json();
  }

  // Dispose existing instances
  vmssDispose();

  // Create Edit instance
  vmss.edit = new Edit(template);
  
  // Create Canvas - it auto-attaches to [data-shotstack-studio]
  vmss.canvas = new Canvas(vmss.edit);
  
  // Create UI Controller
  vmss.ui = UIController.create(vmss.edit, vmss.canvas, { mergeFields: true });
  
  // Load canvas first
  await vmss.canvas.load();
  await vmss.edit.load();

  // Create Timeline
  const timelineContainer = document.querySelector('[data-shotstack-timeline]');
  if (timelineContainer) {
    vmss.timeline = new Timeline(vmss.edit, timelineContainer, { resizable: true });
    await vmss.timeline.load();
  }

  // Create Controls (keyboard shortcuts)
  vmss.controls = new Controls(vmss.edit);
  await vmss.controls.load();

  // Register custom toolbar buttons
  vmssRegisterToolbarButtons();

  // Bind events
  vmssBindEvents();

  // Sync steps from tracks
  vmssSyncStepsFromTracks();
  vmssRenderStepsPanel();

  console.log('Shotstack editor loaded');
}

// ── Dispose ─────────────────────────────────────────────────────────────────
function vmssDispose() {
  vmss.controls?.dispose?.();
  vmss.timeline?.dispose?.();
  vmss.ui?.dispose?.();
  vmss.canvas?.dispose?.();
  vmss.edit = null;
  vmss.canvas = null;
  vmss.timeline = null;
  vmss.controls = null;
  vmss.ui = null;
}

// ── Register toolbar buttons ────────────────────────────────────────────────
function vmssRegisterToolbarButtons() {
  if (!vmss.ui) return;

  // Add Title Text
  vmss.ui.registerButton({
    id: 'add-title',
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3H13"/><path d="M8 3V13"/><path d="M5 13H11"/></svg>`,
    tooltip: 'Add Title',
  });

  // Add Body Text
  vmss.ui.registerButton({
    id: 'add-body-text',
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h12M2 8h10M2 12h8"/></svg>`,
    tooltip: 'Add Body Text',
  });

  // Add Rectangle
  vmss.ui.registerButton({
    id: 'add-rect',
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/></svg>`,
    tooltip: 'Add Rectangle',
    dividerBefore: true,
  });

  // Add Circle
  vmss.ui.registerButton({
    id: 'add-circle',
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/></svg>`,
    tooltip: 'Add Circle',
  });

  // Add Arrow
  vmss.ui.registerButton({
    id: 'add-arrow',
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13L13 3M13 3H6M13 3v7"/></svg>`,
    tooltip: 'Add Arrow',
  });

  // Add Image
  vmss.ui.registerButton({
    id: 'add-image',
    icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/><circle cx="5.5" cy="6.5" r="1.5"/><path d="M14 13l-3-4-2 2.5L6 8l-4 5"/></svg>`,
    tooltip: 'Add Image',
    dividerBefore: true,
  });

  // Button handlers
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
    // Trigger file picker
    const input = document.getElementById('vmss-image-input');
    if (input) input.click();
  });
}

// ── Bind Shotstack events ───────────────────────────────────────────────────
function vmssBindEvents() {
  if (!vmss.edit) return;

  // Track changes for step sync
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

// ── Step <-> Track Sync ─────────────────────────────────────────────────────
function vmssSyncStepsFromTracks() {
  if (!vmss.edit) {
    vmss.steps = [];
    return;
  }

  const edit = vmss.edit.getEdit();
  const tracks = edit?.timeline?.tracks || [];

  // Build steps from tracks
  vmss.steps = tracks.map((track, index) => {
    const clips = track.clips || [];
    const firstClip = clips[0];
    const lastClip = clips[clips.length - 1];

    // Calculate step timing from clips
    const startTime = firstClip?.start ?? 0;
    const endTime = lastClip ? (lastClip.start + (lastClip.length || 0)) : 5;

    // Try to get a label from clip metadata or generate one
    const label = track.label || `Step ${index + 1}`;

    return {
      trackIndex: index,
      label,
      description: track.description || '',
      startTime,
      endTime,
      clipCount: clips.length,
    };
  });
}

// ── Add Elements ────────────────────────────────────────────────────────────

// Add a text clip using rich-text asset
async function vmssAddTextClip(text, startTime = 0, options = {}) {
  if (!vmss.edit) return;

  const {
    fontSize = 48,
    fontWeight = 600,
    fontFamily = 'Work Sans',
    color = '#ffffff',
    align = 'center',
  } = options;

  // Add to a new track at top (index 0)
  await vmss.edit.addTrack(0, {
    clips: [{
      asset: {
        type: 'rich-text',
        text: text,
        font: {
          family: fontFamily,
          size: fontSize,
          weight: fontWeight,
          color: color,
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

// Add a shape clip using SVG asset
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
      svgContent = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${strokeWidth/2}" y="${strokeWidth/2}" width="${width - strokeWidth}" height="${height - strokeWidth}" 
          fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="4"/>
      </svg>`;
      break;

    case 'circle':
      const radius = Math.min(width, height) / 2 - strokeWidth;
      svgContent = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${width/2}" cy="${height/2}" r="${radius}" 
          fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      </svg>`;
      break;

    case 'arrow':
      svgContent = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="${stroke}"/>
          </marker>
        </defs>
        <line x1="10" y1="${height - 10}" x2="${width - 20}" y2="20" 
          stroke="${stroke}" stroke-width="${strokeWidth}" marker-end="url(#arrowhead)"/>
      </svg>`;
      break;

    case 'line':
      svgContent = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <line x1="10" y1="${height - 10}" x2="${width - 10}" y2="10" 
          stroke="${stroke}" stroke-width="${strokeWidth}"/>
      </svg>`;
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
      width: width,
      height: height,
    }],
  });

  vmssSyncStepsFromTracks();
  vmssRenderStepsPanel();
}

// Add image clip
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
      width: width,
      height: height,
    }],
  });

  vmssSyncStepsFromTracks();
  vmssRenderStepsPanel();
}

// Add video clip
async function vmssAddVideoClip(videoUrl, startTime = 0, options = {}) {
  if (!vmss.edit) return;

  const { trim = 0, volume = 1 } = options;

  await vmss.edit.addTrack(0, {
    clips: [{
      asset: {
        type: 'video',
        src: videoUrl,
        trim: trim,
        volume: volume,
      },
      start: startTime,
      length: 10,
    }],
  });

  vmssSyncStepsFromTracks();
  vmssRenderStepsPanel();
}

// ── Step Operations ─────────────────────────────────────────────────────────

async function vmssAddStep() {
  if (!vmss.edit) return;

  const position = vmss.edit.playbackTime || 0;
  
  // Add an empty track (step)
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
  
  // Seek to step start time
  if (vmss.edit && step) {
    vmss.edit.seek(step.startTime + 0.001);
  }
  
  vmssRenderStepsPanel();
}

// ── Playback Controls ───────────────────────────────────────────────────────
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

// ── Dirty State ─────────────────────────────────────────────────────────────
function vmssMarkDirty() {
  vmss.dirty = true;
  const status = document.getElementById('vmss-save-status');
  if (status) status.textContent = 'Unsaved changes';
}

// ── Render Editor Shell ─────────────────────────────────────────────────────
function vmssRenderEditorShell(container) {
  container.innerHTML = `
  <div id="vmss-root" class="flex flex-col bg-gray-100 dark:bg-gray-900" style="height:calc(100vh - 84px);">

    <!-- ═══ TOP BAR ═══ -->
    <div class="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <button onclick="vmssGoBack()" class="px-3 py-1.5 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 flex items-center gap-1">
        <i class="ri-arrow-left-line"></i>Back
      </button>
      <button onclick="vmss.edit?.undo()" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Undo">
        <i class="ri-arrow-go-back-line text-lg"></i>
      </button>
      <button onclick="vmss.edit?.redo()" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Redo">
        <i class="ri-arrow-go-forward-line text-lg"></i>
      </button>
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
      <div class="flex-1"></div>
      <input id="vmss-title" type="text" value="Untitled Project"
        class="text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none dark:text-white px-2 w-48 text-center">
      <span id="vmss-save-status" class="text-xs text-gray-400">Not saved</span>
      <div class="flex-1"></div>
      <button onclick="vmssSaveProject()" class="px-3 py-1.5 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 flex items-center gap-1">
        <i class="ri-save-line"></i>Save
      </button>
      <button onclick="vmssExport()" class="px-3 py-1.5 rounded text-xs bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1 font-medium">
        <i class="ri-download-line"></i>Export
      </button>
    </div>

    <!-- ═══ MAIN BODY (3 panels) ═══ -->
    <div class="flex flex-1 min-h-0 overflow-hidden">

      <!-- ── LEFT: Steps Panel ────────────────────────────── -->
      <div class="w-52 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span>Steps (Tracks)</span>
          <span id="vmss-step-count" class="text-gray-400 font-normal text-xs">0</span>
        </div>
        <div id="vmss-steps-list" class="flex-1 overflow-y-auto p-2 space-y-1">
          <p class="text-xs text-gray-400 text-center py-4">Load a template to see steps</p>
        </div>
        <div class="p-2 border-t border-gray-100 dark:border-gray-700">
          <button onclick="vmssAddStep()" class="w-full py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 flex items-center justify-center gap-1">
            <i class="ri-add-line"></i>Add Step
          </button>
        </div>
      </div>

      <!-- ── CENTER: Canvas + Timeline ────────────────────── -->
      <div class="flex-1 flex flex-col min-w-0 bg-gray-200 dark:bg-gray-950">
        
        <!-- Shotstack Canvas Container -->
        <div class="flex-1 flex items-center justify-center overflow-hidden bg-gray-800 dark:bg-black">
          <div data-shotstack-studio class="w-full h-full"></div>
        </div>

        <!-- Timeline Controls -->
        <div class="bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 flex-shrink-0">
          <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <button onclick="vmssTogglePlay()" id="vmss-play-btn" class="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center">
              <i class="ri-play-fill text-lg"></i>
            </button>
            <span id="vmss-time-display" class="text-xs font-mono text-gray-600 dark:text-gray-300 w-20">0:00</span>
            <div class="flex-1"></div>
            <button onclick="vmss.timeline?.zoomOut()" class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 rounded">−</button>
            <button onclick="vmss.timeline?.zoomIn()" class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 rounded">+</button>
          </div>

          <!-- Shotstack Timeline Container -->
          <div data-shotstack-timeline style="height: 180px; overflow: hidden;"></div>
        </div>
      </div>

      <!-- ── RIGHT: Elements Panel ─────────────────────────── -->
      <div class="w-56 flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        
        <div class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
          Add Elements
        </div>

        <div class="flex-1 overflow-y-auto p-3">
          
          <!-- Text -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Text</p>
            <div class="grid grid-cols-2 gap-2">
              <button onclick="vmssAddTextClip('Title', vmss.edit?.playbackTime || 0, {fontSize: 72, fontWeight: 600})"
                class="py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs font-medium text-gray-700 dark:text-gray-200">
                Title
              </button>
              <button onclick="vmssAddTextClip('Body text', vmss.edit?.playbackTime || 0, {fontSize: 36, fontWeight: 400})"
                class="py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300">
                Body Text
              </button>
            </div>
          </div>

          <!-- Shapes -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Shapes</p>
            <div class="grid grid-cols-4 gap-2">
              <button onclick="vmssAddShapeClip('rect', vmss.edit?.playbackTime || 0)"
                class="aspect-square bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center justify-center" title="Rectangle">
                <div class="w-6 h-5 border-2 border-gray-800 dark:border-gray-200 rounded-sm"></div>
              </button>
              <button onclick="vmssAddShapeClip('circle', vmss.edit?.playbackTime || 0)"
                class="aspect-square bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center justify-center" title="Circle">
                <div class="w-6 h-6 border-2 border-gray-800 dark:border-gray-200 rounded-full"></div>
              </button>
              <button onclick="vmssAddShapeClip('arrow', vmss.edit?.playbackTime || 0)"
                class="aspect-square bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center justify-center" title="Arrow">
                <i class="ri-arrow-right-up-line text-lg text-gray-800 dark:text-gray-200"></i>
              </button>
              <button onclick="vmssAddShapeClip('line', vmss.edit?.playbackTime || 0)"
                class="aspect-square bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center justify-center" title="Line">
                <div class="w-6 h-0.5 bg-gray-800 dark:bg-gray-200 rotate-45"></div>
              </button>
            </div>
          </div>

          <!-- Media -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Media</p>
            <button onclick="document.getElementById('vmss-image-input').click()" 
              class="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2 mb-2">
              <i class="ri-image-add-line"></i>Upload Image
            </button>
            <button onclick="document.getElementById('vmss-video-input').click()" 
              class="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
              <i class="ri-video-add-line"></i>Upload Video
            </button>
            <input id="vmss-image-input" type="file" accept="image/*" class="hidden" onchange="vmssHandleImageUpload(event)">
            <input id="vmss-video-input" type="file" accept="video/*" class="hidden" onchange="vmssHandleVideoUpload(event)">
          </div>

          <!-- Quick Actions -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Quick Actions</p>
            <button onclick="vmssDeleteSelectedClip()" 
              class="w-full py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-xs text-red-600 dark:text-red-400 flex items-center justify-center gap-2">
              <i class="ri-delete-bin-line"></i>Delete Selected
            </button>
          </div>

        </div>
      </div>

    </div>
  </div>
  `;
}

// ── Render Steps Panel ──────────────────────────────────────────────────────
function vmssRenderStepsPanel() {
  const list = document.getElementById('vmss-steps-list');
  const count = document.getElementById('vmss-step-count');
  if (!list) return;

  if (count) count.textContent = vmss.steps.length;

  if (!vmss.steps.length) {
    list.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">No tracks/steps yet</p>';
    return;
  }

  list.innerHTML = vmss.steps.map((step, i) => `
    <div class="vmss-step-item relative p-2 rounded border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 group ${i === vmss.currentStepIdx ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600'}"
         onclick="vmssSelectStep(${i})">
      <div class="flex items-center gap-2">
        <span class="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-medium flex-shrink-0">${i + 1}</span>
        <span class="flex-1 text-xs font-medium dark:text-white truncate">${vmssEscapeHtml(step.label)}</span>
        <span class="text-[10px] text-gray-400">${step.clipCount} clip${step.clipCount !== 1 ? 's' : ''}</span>
      </div>
      <div class="text-[10px] text-gray-400 mt-1 pl-7">${vmssFormatTime(step.startTime)} – ${vmssFormatTime(step.endTime)}</div>
      ${vmss.steps.length > 1 ? `
        <button onclick="event.stopPropagation(); vmssDeleteStep(${i})" class="absolute top-1 right-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
          <i class="ri-close-line text-sm"></i>
        </button>
      ` : ''}
    </div>
  `).join('');
}

// ── File Upload Handlers ────────────────────────────────────────────────────
async function vmssHandleImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  // Create blob URL for local preview
  const url = URL.createObjectURL(file);
  
  // Get image dimensions
  const img = new Image();
  img.onload = async () => {
    const maxWidth = 600;
    const scale = img.width > maxWidth ? maxWidth / img.width : 1;
    
    await vmssAddImageClip(url, vmss.edit?.playbackTime || 0, {
      width: Math.round(img.width * scale),
      height: Math.round(img.height * scale),
    });
  };
  img.src = url;

  event.target.value = '';
}

async function vmssHandleVideoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  await vmssAddVideoClip(url, vmss.edit?.playbackTime || 0);
  
  event.target.value = '';
}

// ── Delete Selected Clip ────────────────────────────────────────────────────
async function vmssDeleteSelectedClip() {
  if (!vmss.edit || vmss.selectedClipId === null) {
    alert('No clip selected');
    return;
  }

  await vmss.edit.deleteClip(vmss.currentStepIdx, vmss.selectedClipId);
  vmss.selectedClipId = null;
}

// ── Export ──────────────────────────────────────────────────────────────────
async function vmssExport() {
  if (!vmss.edit || !vmss.canvas) {
    alert('No project loaded');
    return;
  }

  const { VideoExporter } = window.ShotstackStudio;
  
  try {
    const exporter = new VideoExporter(vmss.edit, vmss.canvas);
    await exporter.export('video-manual.mp4', 25);
    console.log('Export complete');
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed: ' + error.message);
  }
}

// ── Save Project ────────────────────────────────────────────────────────────
async function vmssSaveProject() {
  if (!vmss.edit) {
    alert('No project loaded');
    return;
  }

  const editJson = vmss.edit.getEdit();
  console.log('Project JSON:', editJson);
  
  // Here you would save to your backend
  // Example: await fetch('/api/save', { method: 'POST', body: JSON.stringify(editJson) });
  
  vmss.dirty = false;
  const status = document.getElementById('vmss-save-status');
  if (status) status.textContent = 'Saved';
  
  alert('Project saved (check console for JSON)');
}

// ── Navigation ──────────────────────────────────────────────────────────────
function vmssGoBack() {
  if (vmss.dirty) {
    if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
      return;
    }
  }
  // Navigate back - implement as needed
  console.log('Navigate back');
}

// ── Utility Functions ───────────────────────────────────────────────────────
function vmssFormatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  const ms = Math.floor((sec % 1) * 10);
  return `${m}:${s}.${ms}`;
}

function vmssEscapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Expose to global scope ──────────────────────────────────────────────────
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
window.vmssDeleteSelectedClip = vmssDeleteSelectedClip;
window.vmssHandleImageUpload = vmssHandleImageUpload;
window.vmssHandleVideoUpload = vmssHandleVideoUpload;
