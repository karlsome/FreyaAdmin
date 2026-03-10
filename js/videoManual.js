// ═══════════════════════════════════════════════════════════════
//  VIDEO MANUAL CREATOR  –  powered by Creatomate Render API
// ═══════════════════════════════════════════════════════════════

// Creatomate API calls go through server proxy (API key is server-side)
// Uses global BASE_URL from charts.js
const VM_DB               = 'Sasaki_Coating_MasterDB';
const VM_COLLECTION       = 'videoManuals';

// ── module-level state ──────────────────────────────────────────────────────
let vmProject         = null;   // the full project object
let vmCurrentStepIdx  = 0;      // which step is active
let vmActiveTool      = 'select';
let vmSelectedOvId    = null;   // which overlay is selected
let vmCurrentColor    = '#ff4444';
let vmCurrentFontSize = 22;
let vmDrawing         = false;
let vmDrawStart       = { x: 0, y: 0 };
let vmDrawEnd         = { x: 0, y: 0 };
let vmDraggingOv      = null;   // { id, offsetX, offsetY } when dragging an existing overlay
let vmResizeRAF       = null;   // requestAnimationFrame for canvas resize
let vmLastRenderUrl   = '';     // most recent exported video URL
let vmZoomLevel       = 1;      // canvas zoom level (0.5 to 2)
let vmTimelineZoom    = 1;      // timeline zoom (pixels per second)
let vmDraggingTimelineOv = null; // for dragging overlay bars on timeline
let vmDraggingStep    = null;   // for reordering steps

// ── utility ─────────────────────────────────────────────────────────────────
function vmFmt(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function vmId() { return 'ov_' + Math.random().toString(36).slice(2, 9); }
function vmGet(id) { return document.getElementById(id); }
function vmStep() { return vmProject?.steps[vmCurrentStepIdx] || null; }
function vmVideo() { return vmGet('vm-video'); }
function vmCanvas() { return vmGet('vm-canvas'); }

// ── PAGE LOADER ──────────────────────────────────────────────────────────────
function loadVideoManualPage() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  main.innerHTML = `
  <div id="vm-root" class="flex flex-col overflow-hidden" style="height:calc(100vh - 84px);">

    <!-- TOP BAR -->
    <div class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <i class="ri-clapperboard-line text-blue-500 text-xl"></i>
      <input id="vm-title" type="text" value="Untitled Manual"
        class="text-base font-semibold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none dark:text-white px-1 w-56"
        onchange="vmProject.title=this.value">
      <div class="flex-1"></div>
      <button onclick="vmLoadExistingProject()" class="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 flex items-center gap-1">
        <i class="ri-folder-open-line"></i>Open
      </button>
      <button onclick="vmSaveProject()" class="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 flex items-center gap-1">
        <i class="ri-save-line"></i>Save
      </button>
      <button onclick="vmShowHistory()" class="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 flex items-center gap-1">
        <i class="ri-history-line"></i>History
      </button>
      <button onclick="vmExportVideo()" id="vm-export-btn"
        class="px-3 py-1 rounded text-xs bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1 font-medium">
        <i class="ri-video-upload-line"></i>Export
      </button>
    </div>

    <!-- 3-PANEL BODY -->
    <div class="flex flex-1 min-h-0">

      <!-- ── LEFT: STEPS PANEL ─────────────────────────────── -->
      <div class="w-44 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div class="px-3 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <span>Steps</span>
          <span id="vm-step-count" class="text-gray-400 font-normal">0</span>
        </div>
        <div id="vm-steps-list" class="flex-1 overflow-y-auto p-2 space-y-1.5"></div>
      </div>

      <!-- ── CENTER: VIDEO ──────────────────────────────────── -->
      <div class="flex-1 flex flex-col bg-gray-900 min-w-0">

        <!-- Upload zone -->
        <div id="vm-upload-zone"
          class="flex-1 flex flex-col items-center justify-center cursor-pointer group"
          onclick="vmGet('vm-file-input').click()"
          ondragover="event.preventDefault()"
          ondrop="vmHandleFileDrop(event)">
          <div class="text-center p-8 rounded-xl border-2 border-dashed border-gray-600 group-hover:border-blue-400 transition-all mx-10">
            <i class="ri-upload-cloud-2-line text-5xl text-gray-500 group-hover:text-blue-400 mb-3 block"></i>
            <p class="text-gray-200 text-lg font-medium">Upload a Video</p>
            <p class="text-gray-500 text-sm mt-1">Click or drag &amp; drop  ·  MP4, MOV, AVI, WebM</p>
            <p class="text-gray-600 text-xs mt-2">Video is uploaded to Creatomate for cloud rendering</p>
          </div>
          <input id="vm-file-input" type="file" accept="video/*" class="hidden" onchange="vmHandleFileSelect(event)">
        </div>

        <!-- Player area (hidden until video loaded) -->
        <div id="vm-player-area" class="hidden flex-1 flex flex-col min-h-0">
          
          <!-- Zoom controls bar -->
          <div class="bg-gray-900 px-3 py-1 flex items-center gap-2 border-b border-gray-700 flex-shrink-0">
            <span class="text-gray-500 text-xs">Zoom:</span>
            <button onclick="vmSetZoom(0.5)" class="vm-zoom-btn px-2 py-0.5 text-xs rounded text-gray-400 hover:text-white hover:bg-gray-700" data-zoom="0.5">50%</button>
            <button onclick="vmSetZoom(0.75)" class="vm-zoom-btn px-2 py-0.5 text-xs rounded text-gray-400 hover:text-white hover:bg-gray-700" data-zoom="0.75">75%</button>
            <button onclick="vmSetZoom(1)" class="vm-zoom-btn px-2 py-0.5 text-xs rounded bg-gray-700 text-white" data-zoom="1">100%</button>
            <button onclick="vmSetZoom(1.5)" class="vm-zoom-btn px-2 py-0.5 text-xs rounded text-gray-400 hover:text-white hover:bg-gray-700" data-zoom="1.5">150%</button>
            <button onclick="vmFitZoom()" class="px-2 py-0.5 text-xs rounded text-gray-400 hover:text-white hover:bg-gray-700">Fit</button>
          </div>

          <!-- video + canvas -->
          <div id="vm-video-outer" class="flex-1 flex items-center justify-center bg-black overflow-auto">
            <div id="vm-video-wrapper" class="relative" style="display:inline-block; line-height:0; transform-origin: center center;">
              <video id="vm-video" class="block"
                style="max-width:none;"
                ontimeupdate="vmOnTimeUpdate()"
                onloadedmetadata="vmOnVideoLoaded()"
                onended="vmOnVideoEnded()"></video>
              <canvas id="vm-canvas" class="absolute top-0 left-0" style="cursor:crosshair;"></canvas>
            </div>
          </div>

          <!-- Enhanced Timeline Section -->
          <div class="bg-gray-800 flex-shrink-0 border-t border-gray-700">
            <!-- Control row -->
            <div class="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700">
              <button onclick="vmTogglePlay()" id="vm-play-btn"
                class="text-white hover:text-blue-300 transition-colors w-6 text-center flex-shrink-0">
                <i class="ri-play-line text-lg"></i>
              </button>
              <button onclick="vmStepBackward()" class="text-gray-400 hover:text-white" title="Previous frame"><i class="ri-skip-back-mini-line"></i></button>
              <button onclick="vmStepForward()" class="text-gray-400 hover:text-white" title="Next frame"><i class="ri-skip-forward-mini-line"></i></button>
              <span id="vm-time" class="text-gray-400 text-xs font-mono w-24 flex-shrink-0">0:00 / 0:00</span>
              <span id="vm-step-label" class="text-gray-500 text-xs truncate flex-1 text-center"></span>
              <button onclick="vmSnapshot()"
                class="flex items-center gap-1 px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded font-medium flex-shrink-0"
                title="Capture current frame as a freeze-frame">
                <i class="ri-camera-line"></i>Snapshot
              </button>
              <button onclick="vmCutHere()"
                class="flex items-center gap-1 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded font-medium flex-shrink-0"
                title="Split video at current position">
                <i class="ri-scissors-cut-line"></i>Cut
              </button>
              <button onclick="vmDeleteCurrentStep()"
                class="p-1 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                title="Delete current step">
                <i class="ri-delete-bin-line text-sm"></i>
              </button>
            </div>

            <!-- Timeline tracks container -->
            <div id="vm-timeline-container" class="relative bg-gray-900" style="height: 120px; overflow-x: auto; overflow-y: hidden;">
              <!-- Click area for seeking (behind everything) -->
              <div class="absolute inset-0 cursor-pointer" style="z-index: 1;" onclick="vmTimelineSeek(event)"></div>
              
              <!-- Time ruler -->
              <div id="vm-time-ruler" class="absolute top-0 left-0 right-0 h-5 bg-gray-900 border-b border-gray-700" style="z-index: 10;"></div>
              
              <!-- Overlay tracks area -->
              <div id="vm-overlay-tracks" class="absolute left-0 right-0" style="top: 22px; bottom: 26px; z-index: 15;">
                <!-- Dynamically filled with overlay bars -->
              </div>

              <!-- Video/Step track at bottom -->
              <div id="vm-video-track" class="absolute left-0 right-0 bottom-0 h-6" style="z-index: 5;">
                <div id="vm-step-segs" class="w-full h-full"></div>
              </div>

              <!-- Playhead -->
              <div id="vm-playhead" class="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none" style="left: 0px; z-index: 25;">
                <div class="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-sm rotate-45"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── RIGHT: TOOLS + PROPS ───────────────────────────── -->
      <div class="w-48 flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto">
        <div class="px-3 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700 flex-shrink-0">Tools</div>

        <!-- Tool grid -->
        <div class="p-2 grid grid-cols-2 gap-1 flex-shrink-0">
          <button id="vm-tool-select" data-tool="select"   onclick="vmSetTool('select')"
            class="vm-tool-btn flex flex-col items-center py-2 rounded text-xs border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
            <i class="ri-cursor-line text-base mb-0.5"></i>Select</button>
          <button id="vm-tool-text" data-tool="text"     onclick="vmSetTool('text')"
            class="vm-tool-btn flex flex-col items-center py-2 rounded text-xs border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
            <i class="ri-text text-base mb-0.5"></i>Text</button>
          <button id="vm-tool-rect" data-tool="rect"     onclick="vmSetTool('rect')"
            class="vm-tool-btn flex flex-col items-center py-2 rounded text-xs border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
            <i class="ri-rectangle-line text-base mb-0.5"></i>Box</button>
          <button id="vm-tool-circle" data-tool="circle"   onclick="vmSetTool('circle')"
            class="vm-tool-btn flex flex-col items-center py-2 rounded text-xs border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
            <i class="ri-circle-line text-base mb-0.5"></i>Circle</button>
          <button id="vm-tool-arrow" data-tool="arrow"    onclick="vmSetTool('arrow')"
            class="vm-tool-btn flex flex-col items-center py-2 rounded text-xs border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors col-span-2">
            <i class="ri-arrow-right-up-line text-base mb-0.5"></i>Arrow</button>
        </div>

        <!-- Colour swatches -->
        <div class="px-2 pb-2 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <p class="text-xs text-gray-400 mt-1.5 mb-1.5">Color</p>
          <div class="flex flex-wrap gap-1.5">
            ${['#ff4444','#ff8800','#ffcc00','#44cc66','#44aaff','#aa44ff','#ff44cc','#ffffff','#000000']
              .map(c => `<div onclick="vmSetColor('${c}')" data-color="${c}"
                class="vm-swatch w-5 h-5 rounded-full cursor-pointer border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                style="background:${c}" title="${c}"></div>`).join('')}
          </div>
        </div>

        <!-- Font size -->
        <div class="px-2 pb-2 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <label class="text-xs text-gray-400 block mt-1.5 mb-1">Font size (px)</label>
          <input id="vm-font-size" type="number" value="22" min="8" max="200"
            class="w-full text-xs p-1 rounded border border-gray-200 dark:border-gray-600 bg-transparent dark:text-white focus:outline-none focus:border-blue-400"
            onchange="vmCurrentFontSize = +this.value">
        </div>

        <!-- Stroke width -->
        <div class="px-2 pb-2 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <label class="text-xs text-gray-400 block mt-1.5 mb-1">Stroke width</label>
          <input id="vm-stroke-w" type="number" value="3" min="1" max="30"
            class="w-full text-xs p-1 rounded border border-gray-200 dark:border-gray-600 bg-transparent dark:text-white focus:outline-none focus:border-blue-400">
        </div>

        <!-- Selected overlay properties -->
        <div id="vm-ov-props" class="flex-1 border-t border-gray-100 dark:border-gray-700 p-2 overflow-y-auto min-h-0">
          <p class="text-xs text-gray-400 italic">Select an overlay to edit.</p>
        </div>

        <!-- Overlays list for current step -->
        <div class="border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div class="px-2 py-1 text-xs font-bold text-gray-400 uppercase tracking-wide">Overlays</div>
          <div id="vm-ov-list" class="px-2 pb-2 space-y-0.5 max-h-44 overflow-y-auto"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── UPLOAD MODAL ─────────────────────────────────────────────────────── -->
  <div id="vm-modal-upload" class="hidden fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-72 shadow-2xl text-center">
      <i class="ri-cloud-upload-line text-5xl text-blue-500 mb-2 block"></i>
      <p id="vm-upload-msg" class="font-semibold text-gray-800 dark:text-white text-sm mb-3">Uploading to Creatomate…</p>
      <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-2">
        <div id="vm-upload-bar" class="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style="width:0%"></div>
      </div>
      <p id="vm-upload-detail" class="text-xs text-gray-400">This may take a moment</p>
    </div>
  </div>

  <!-- ── RENDER MODAL ─────────────────────────────────────────────────────── -->
  <div id="vm-modal-render" class="hidden fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-96 shadow-2xl">
      <div class="flex items-center gap-2 mb-4">
        <i class="ri-video-line text-blue-500 text-lg"></i>
        <h3 class="font-semibold text-gray-800 dark:text-white">Export Video</h3>
      </div>
      <div id="vm-render-working" class="text-center py-4">
        <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-3"></div>
        <p id="vm-render-msg" class="text-sm text-gray-600 dark:text-gray-300">Submitting render…</p>
        <p id="vm-render-sub" class="text-xs text-gray-400 mt-1 font-mono"></p>
      </div>
      <div id="vm-render-done" class="hidden space-y-2">
        <div class="flex items-center gap-2 mb-3 text-green-500">
          <i class="ri-checkbox-circle-line text-2xl"></i>
          <p class="font-medium">Video is ready!</p>
        </div>
        <a id="vm-render-dl" href="#" target="_blank"
          class="flex items-center justify-center gap-2 w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-sm">
          <i class="ri-download-line"></i>Download MP4</a>
        <button onclick="vmCopyLink()"
          class="flex items-center justify-center gap-2 w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 text-sm">
          <i class="ri-links-line"></i>Copy Share Link</button>
      </div>
      <div id="vm-render-err" class="hidden">
        <div class="flex items-center gap-2 text-red-500 mb-2">
          <i class="ri-error-warning-line text-xl"></i><p class="font-medium">Render failed</p>
        </div>
        <p id="vm-render-err-msg" class="text-xs text-gray-500"></p>
      </div>
      <button onclick="vmGet('vm-modal-render').classList.add('hidden')"
        class="mt-4 w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-lg hover:bg-gray-200 text-sm">Close</button>
    </div>
  </div>

  <!-- ── HISTORY MODAL ────────────────────────────────────────────────────── -->
  <div id="vm-modal-history" class="hidden fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 w-[520px] shadow-2xl max-h-[80vh] flex flex-col">
      <div class="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 class="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <i class="ri-history-line text-blue-500"></i>Version History
        </h3>
        <button onclick="vmGet('vm-modal-history').classList.add('hidden')"
          class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><i class="ri-close-line text-xl"></i></button>
      </div>
      <div id="vm-history-list" class="flex-1 overflow-y-auto space-y-2"></div>
    </div>
  </div>

  <!-- ── OPEN PROJECTS MODAL ──────────────────────────────────────────────── -->
  <div id="vm-modal-open" class="hidden fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 w-[520px] shadow-2xl max-h-[80vh] flex flex-col">
      <div class="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 class="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <i class="ri-folder-open-line text-blue-500"></i>Open Project
        </h3>
        <button onclick="vmGet('vm-modal-open').classList.add('hidden')"
          class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><i class="ri-close-line text-xl"></i></button>
      </div>
      <input id="vm-open-search" type="text" placeholder="Search manuals…"
        class="mb-3 w-full p-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:outline-none focus:border-blue-400"
        oninput="vmFilterOpenList(this.value)" flex-shrink-0>
      <div id="vm-open-list" class="flex-1 overflow-y-auto space-y-2"></div>
    </div>
  </div>

  <style>
    .vm-tool-btn.vm-active {
      background-color: #eff6ff;
      border-color: #3b82f6;
      color: #2563eb;
    }
    .dark .vm-tool-btn.vm-active {
      background-color: #1e3a5f;
      border-color: #60a5fa;
      color: #93c5fd;
    }
    .vm-swatch.vm-active {
      outline: 3px solid #3b82f6;
      outline-offset: 2px;
    }
    .vm-step-item.vm-active {
      background-color: #eff6ff;
      border-color: #3b82f6;
    }
    .dark .vm-step-item.vm-active {
      background-color: #1e3a5f;
      border-color: #60a5fa;
    }
    .vm-zoom-btn.active { background-color: #374151; color: white; }
    .vm-overlay-bar {
      position: absolute;
      height: 22px;
      border-radius: 4px;
      cursor: grab;
      display: flex;
      align-items: center;
      padding: 0 10px;
      font-size: 10px;
      color: white;
      white-space: nowrap;
      overflow: visible;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
      transition: opacity 0.15s, box-shadow 0.15s;
      user-select: none;
    }
    .vm-overlay-bar:hover { 
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    }
    .vm-overlay-bar.selected { 
      outline: 2px solid #fff; 
      outline-offset: 1px;
      z-index: 10;
    }
    .vm-overlay-bar .resize-handle {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 10px;
      cursor: ew-resize;
      z-index: 5;
      background: transparent;
    }
    .vm-overlay-bar .resize-handle:hover {
      background: rgba(255,255,255,0.3);
    }
    .vm-overlay-bar .resize-handle.left { left: -3px; border-radius: 4px 0 0 4px; }
    .vm-overlay-bar .resize-handle.right { right: -3px; border-radius: 0 4px 4px 0; }
    .vm-step-drag { cursor: grab; }
    .vm-step-drag:active { cursor: grabbing; }
    .vm-step-drag.dragging { opacity: 0.5; }
    #vm-timeline-container::-webkit-scrollbar { height: 8px; }
    #vm-timeline-container::-webkit-scrollbar-track { background: #1f2937; }
    #vm-timeline-container::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
  </style>
  `;

  // Reset state
  vmProject = {
    _id: null,
    title: 'Untitled Manual',
    videoUrl: null,
    videoLocalUrl: null,
    videoDuration: 0,
    videoWidth: 1920,
    videoHeight: 1080,
    steps: [],
    history: [],
    createdBy: (JSON.parse(localStorage.getItem('authUser') || '{}')).username || 'admin',
    createdAt: new Date().toISOString(),
    lastRenderUrl: null,
  };
  vmCurrentStepIdx = 0;
  vmActiveTool     = 'select';
  vmSelectedOvId   = null;
  vmCurrentColor   = '#ff4444';
  vmCurrentFontSize= 22;
  vmDrawing        = false;

  setTimeout(() => {
    vmSetTool('select');
    vmSetColor('#ff4444');
    vmInitCanvas();
  }, 80);
}

// ── CANVAS INIT ──────────────────────────────────────────────────────────────
function vmInitCanvas() {
  const canvas = vmCanvas();
  if (!canvas) return;
  canvas.addEventListener('mousedown',  vmCMouseDown);
  canvas.addEventListener('mousemove',  vmCMouseMove);
  canvas.addEventListener('mouseup',    vmCMouseUp);
  canvas.addEventListener('mouseleave', vmCMouseUp);
}

// ── TOOL + COLOR SELECTION ───────────────────────────────────────────────────
function vmSetTool(tool) {
  vmActiveTool = tool;
  document.querySelectorAll('.vm-tool-btn').forEach(b => {
    b.classList.toggle('vm-active', b.dataset.tool === tool);
  });
  const canvas = vmCanvas();
  if (canvas) {
    canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
  }
}

function vmSetColor(color) {
  vmCurrentColor = color;
  document.querySelectorAll('.vm-swatch').forEach(el => {
    el.classList.toggle('vm-active', el.dataset.color === color);
  });
  // If an overlay is selected, update its color live
  if (vmSelectedOvId) {
    const ov = vmGetOverlay(vmSelectedOvId);
    if (ov) { ov.color = color; vmRedraw(); vmRenderOvProps(ov); vmRenderOvList(); }
  }
}

// ── FILE HANDLING ────────────────────────────────────────────────────────────
function vmHandleFileSelect(e) {
  const file = e.target.files[0];
  if (file) vmLoadVideoFile(file);
}
function vmHandleFileDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('video/')) vmLoadVideoFile(file);
}

async function vmLoadVideoFile(file) {
  // Show local preview immediately  
  const localUrl = URL.createObjectURL(file);
  vmProject.videoLocalUrl = localUrl;

  const video = vmVideo();
  video.src = localUrl;
  video.load();

  vmGet('vm-upload-zone').classList.add('hidden');
  vmGet('vm-player-area').classList.remove('hidden');

  // Upload to Creatomate in background
  vmUploadToCreatomate(file);
}

async function vmUploadToCreatomate(file) {
  const modal  = vmGet('vm-modal-upload');
  const bar    = vmGet('vm-upload-bar');
  const msg    = vmGet('vm-upload-msg');
  const detail = vmGet('vm-upload-detail');

  modal.classList.remove('hidden');
  msg.textContent    = 'Uploading video…';
  detail.textContent = file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' MB)';
  bar.style.width    = '5%';

  try {
    // Upload raw binary to our own server; server uses Firebase Admin to store it
    // and returns a public Firebase Storage download URL for Creatomate to fetch.
    const url = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', BASE_URL + 'api/upload-video-manual');
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.setRequestHeader('X-File-Name', file.name);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 90) + 5;
          bar.style.width = Math.min(pct, 95) + '%';
          detail.textContent =
            `${(e.loaded / 1024 / 1024).toFixed(1)} / ${(e.total / 1024 / 1024).toFixed(1)} MB`;
        }
      });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText);
          resolve(res.url);
        } else {
          let msg = xhr.status + ' ' + xhr.statusText;
          try { msg = JSON.parse(xhr.responseText).error || msg; } catch (_) {}
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file); // send raw binary
    });

    bar.style.width        = '100%';
    msg.textContent        = '✓ Uploaded successfully';
    detail.textContent     = 'Asset ready for rendering';
    vmProject.videoUrl     = url;

    setTimeout(() => modal.classList.add('hidden'), 1200);

  } catch (err) {
    modal.classList.add('hidden');
    alert('Upload failed: ' + err.message + '\n\nYou can still edit, but Export will not work without a valid upload.');
    console.error('[VM] Upload error', err);
  }
}

// ── VIDEO EVENTS ─────────────────────────────────────────────────────────────
function vmOnVideoLoaded() {
  const video = vmVideo();
  vmProject.videoDuration = video.duration;
  vmProject.videoWidth    = video.videoWidth  || 1920;
  vmProject.videoHeight   = video.videoHeight || 1080;

  // Create first step covering the full video
  if (vmProject.steps.length === 0) {
    vmProject.steps = [{
      id: vmId().replace('ov_', 'step_'),
      label: 'Step 1',
      trimStart: 0,
      trimEnd: video.duration,
      overlays: [],
    }];
    vmCurrentStepIdx = 0;
  }

  vmSyncCanvasSize();
  vmRenderStepsList();
  vmRenderTimeline();
  vmRenderOvList();
  vmRedraw();
}

function vmOnTimeUpdate() {
  const video = vmVideo();
  if (!video || !vmProject) return;
  const t   = video.currentTime;
  const dur = vmProject.videoDuration;

  // Update playhead
  const ph = vmGet('vm-playhead');
  if (ph && dur > 0) ph.style.left = (t / dur * 100) + '%';

  // Update time display
  const td = vmGet('vm-time');
  if (td) td.textContent = vmFmt(t) + ' / ' + vmFmt(dur);

  // Determine which step we're in
  const stepIdx = vmProject.steps.findIndex(s => t >= s.trimStart && t < s.trimEnd);
  const activeIdx = stepIdx >= 0 ? stepIdx : (vmProject.steps.length - 1);

  if (activeIdx !== vmCurrentStepIdx) {
    vmCurrentStepIdx = activeIdx;
    vmRenderStepsList();
    vmRenderOvList();
    vmRedraw();
  }

  // Update step label
  const sl = vmGet('vm-step-label');
  const st = vmStep();
  if (sl && st) sl.textContent = st.label;

  // Loop within current step boundary
  const step = vmStep();
  if (step && t >= step.trimEnd - 0.05) {
    video.pause();
    video.currentTime = step.trimEnd - 0.05;
    vmGet('vm-play-btn').innerHTML = '<i class="ri-play-line text-lg"></i>';
  }
}

function vmOnVideoEnded() {
  const btn = vmGet('vm-play-btn');
  if (btn) btn.innerHTML = '<i class="ri-play-line text-lg"></i>';
}

// ── PLAYBACK ──────────────────────────────────────────────────────────────────
function vmTogglePlay() {
  const video = vmVideo();
  if (!video) return;
  if (video.paused) {
    // If at end of step, restart from step start
    const step = vmStep();
    if (step && video.currentTime >= step.trimEnd - 0.05) {
      video.currentTime = step.trimStart;
    }
    video.play();
    vmGet('vm-play-btn').innerHTML = '<i class="ri-pause-line text-lg"></i>';
  } else {
    video.pause();
    vmGet('vm-play-btn').innerHTML = '<i class="ri-play-line text-lg"></i>';
  }
}

function vmSeekTo(event) {
  const video = vmVideo();
  if (!video || !vmProject) return;
  const bar  = vmGet('vm-timeline');
  const rect = bar.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const time = pct * vmProject.videoDuration;
  video.currentTime = time;

  // Switch to the step at that time
  const idx = vmProject.steps.findIndex(s => time >= s.trimStart && time < s.trimEnd);
  if (idx >= 0 && idx !== vmCurrentStepIdx) {
    vmCurrentStepIdx = idx;
    vmRenderStepsList();
    vmRenderOvList();
    vmRedraw();
  }
}

// ── STEP MANAGEMENT ───────────────────────────────────────────────────────────
function vmCutHere() {
  const video = vmVideo();
  if (!video || !vmProject || vmProject.steps.length === 0) return;

  const t    = video.currentTime;
  const step = vmStep();
  if (!step) return;

  // Must be at least 0.5 s from each edge
  if (t <= step.trimStart + 0.5 || t >= step.trimEnd - 0.5) {
    alert('Move the playhead at least 0.5 s from the step boundaries before cutting.');
    return;
  }

  const newStep = {
    id: vmId().replace('ov_', 'step_'),
    label: 'Step ' + (vmProject.steps.length + 1),
    trimStart: t,
    trimEnd: step.trimEnd,
    overlays: [],
  };

  // Shorten current step
  step.trimEnd = t;

  // Insert new step right after current
  vmProject.steps.splice(vmCurrentStepIdx + 1, 0, newStep);

  // Renumber labels
  vmProject.steps.forEach((s, i) => { s.label = 'Step ' + (i + 1); });

  vmRenderStepsList();
  vmRenderTimeline();
  vmRenderOvList();
  vmRedraw();
}

function vmDeleteCurrentStep() {
  if (!vmProject || vmProject.steps.length <= 1) {
    alert('You need at least one step.');
    return;
  }
  if (!confirm(`Delete "${vmStep()?.label}"? Overlays on this step will be lost.`)) return;

  vmProject.steps.splice(vmCurrentStepIdx, 1);
  vmProject.steps.forEach((s, i) => { s.label = 'Step ' + (i + 1); });

  if (vmCurrentStepIdx >= vmProject.steps.length) vmCurrentStepIdx = vmProject.steps.length - 1;

  const step = vmStep();
  const video = vmVideo();
  if (step && video) video.currentTime = step.trimStart;

  vmRenderStepsList();
  vmRenderTimeline();
  vmRenderOvList();
  vmRedraw();
}

function vmSelectStep(idx) {
  if (!vmProject || idx < 0 || idx >= vmProject.steps.length) return;
  vmCurrentStepIdx = idx;
  const step  = vmStep();
  const video = vmVideo();
  if (step && video) {
    video.currentTime = step.trimStart;
  }
  vmSelectedOvId = null;
  vmRenderStepsList();
  vmRenderTimeline();
  vmRenderOvList();
  vmRenderOvProps(null);
  vmRedraw();
}

// ── RENDER: STEPS LIST (left panel) ─────────────────────────────────────────
function vmRenderStepsList() {
  const list = vmGet('vm-steps-list');
  const cnt  = vmGet('vm-step-count');
  if (!list || !vmProject) return;
  if (cnt) cnt.textContent = vmProject.steps.length;

  const stepColors = ['#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

  list.innerHTML = vmProject.steps.map((s, i) => `
    <div draggable="true" ondragstart="vmStepDragStart(event, ${i})" ondragover="vmStepDragOver(event)" ondrop="vmStepDrop(event, ${i})"
      class="vm-step-item flex flex-col p-2 rounded-lg border cursor-pointer transition-colors
        ${i === vmCurrentStepIdx
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30'
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'}">
      <div class="flex items-center gap-1.5 mb-1">
        <div class="vm-step-drag flex-shrink-0 cursor-grab mr-1 text-gray-400 hover:text-gray-600">⋮⋮</div>
        <div class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:${stepColors[i % stepColors.length]}"></div>
        <input type="text" value="${(s.label || '').replace(/"/g, '&quot;')}" onchange="vmRenameStep(${i}, this.value)" onclick="event.stopPropagation()"
          class="text-xs font-semibold text-gray-700 dark:text-gray-200 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 flex-1 min-w-0" />
        <span class="text-xs text-gray-400 flex-shrink-0">${vmFmt(s.trimEnd - s.trimStart)}</span>
      </div>
      <input type="text" value="${(s.description || '').replace(/"/g, '&quot;')}" placeholder="Description..." onchange="vmSetStepDesc(${i}, this.value)" onclick="vmSelectStep(${i}); event.stopPropagation()"
        class="text-xs text-gray-500 dark:text-gray-400 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 mb-1" />
      <div class="flex justify-between items-center">
        <div class="text-xs text-gray-400">${vmFmt(s.trimStart)} → ${vmFmt(s.trimEnd)}</div>
        <button onclick="vmDeleteStep(${i}); event.stopPropagation()" class="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
      </div>
      ${s.overlays.length > 0
        ? `<div class="flex gap-0.5 mt-1 flex-wrap">${s.overlays.map(ov =>
            `<span class="text-xs px-1 rounded" style="background:${ov.color}22; color:${ov.color}; border:1px solid ${ov.color}44">
              ${ov.type === 'text' ? 'T' : ov.type === 'circle' ? '◯' : ov.type === 'rect' ? '▭' : '→'}
            </span>`).join('')}</div>`
        : ''}
    </div>
  `).join('');
}

// ── STEP EDITING FUNCTIONS ────────────────────────────────────────────────────
function vmRenameStep(idx, newLabel) {
  if (!vmProject || !vmProject.steps[idx]) return;
  vmProject.steps[idx].label = newLabel || ('Step ' + (idx + 1));
  vmRenderEnhancedTimeline();
}

function vmSetStepDesc(idx, desc) {
  if (!vmProject || !vmProject.steps[idx]) return;
  vmProject.steps[idx].description = desc;
}

function vmDeleteStep(idx) {
  if (!vmProject || vmProject.steps.length <= 1) {
    alert('Cannot delete the only step.');
    return;
  }
  if (!confirm('Delete step "' + vmProject.steps[idx].label + '"?')) return;
  vmProject.steps.splice(idx, 1);
  if (vmCurrentStepIdx >= vmProject.steps.length) vmCurrentStepIdx = vmProject.steps.length - 1;
  vmRenderStepsList();
  vmRenderEnhancedTimeline();
}

// ── STEP DRAG & DROP REORDERING ───────────────────────────────────────────────
let vmDraggedStepIdx = null;

function vmStepDragStart(e, idx) {
  vmDraggedStepIdx = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', idx);
  e.target.style.opacity = '0.5';
}

function vmStepDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function vmStepDrop(e, targetIdx) {
  e.preventDefault();
  e.target.style.opacity = '1';
  if (vmDraggedStepIdx === null || vmDraggedStepIdx === targetIdx) return;
  
  const steps = vmProject.steps;
  const [dragged] = steps.splice(vmDraggedStepIdx, 1);
  steps.splice(targetIdx, 0, dragged);
  
  // Recalculate trim times based on new order
  let cumTime = 0;
  steps.forEach((s) => {
    const dur = s.trimEnd - s.trimStart;
    s.trimStart = cumTime;
    s.trimEnd = cumTime + dur;
    cumTime += dur;
  });
  
  vmCurrentStepIdx = targetIdx;
  vmDraggedStepIdx = null;
  vmRenderStepsList();
  vmRenderEnhancedTimeline();
}

// ── RENDER: TIMELINE ─────────────────────────────────────────────────────────
function vmRenderTimeline() {
  const segs = vmGet('vm-step-segs');
  if (!segs || !vmProject || vmProject.videoDuration === 0) return;

  const dur    = vmProject.videoDuration;
  const colors = ['#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

  segs.innerHTML = vmProject.steps.map((s, i) => {
    const pct = ((s.trimEnd - s.trimStart) / dur * 100).toFixed(3);
    const active = i === vmCurrentStepIdx;
    return `<div title="${s.label}: ${vmFmt(s.trimStart)}–${vmFmt(s.trimEnd)}"
      class="h-full flex items-center justify-center text-white text-xs overflow-hidden transition-opacity ${active ? 'opacity-100' : 'opacity-60'}"
      style="width:${pct}%; background:${colors[i % colors.length]}; ${i > 0 ? 'border-left:1px solid rgba(0,0,0,0.2)' : ''}">
    </div>`;
  }).join('');
}

// ── CANVAS RESIZE ─────────────────────────────────────────────────────────────
function vmSyncCanvasSize() {
  const video  = vmVideo();
  const canvas = vmCanvas();
  if (!video || !canvas) return;

  // Use displayed size, not natural size
  const w = video.clientWidth  || video.offsetWidth  || video.videoWidth;
  const h = video.clientHeight || video.offsetHeight || video.videoHeight;
  if (w > 0 && h > 0) {
    canvas.width  = w;
    canvas.height = h;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
  }
  vmRedraw();
}

// Recalculate when the video element is resized (e.g., window resize)
window.addEventListener('resize', () => {
  clearTimeout(vmResizeRAF);
  vmResizeRAF = setTimeout(vmSyncCanvasSize, 150);
});

// ── CANVAS: PERCENTAGE HELPERS ───────────────────────────────────────────────
// All overlay positions stored as % of canvas dimensions (0-100)
function vmPxToRel(px, dim) { return (px / dim) * 100; }
function vmRelToPx(rel, dim) { return (rel / 100) * dim; }

function vmHitTest(ov, mx, my, cw, ch) {
  const x = vmRelToPx(ov.x, cw);
  const y = vmRelToPx(ov.y, ch);
  const w = vmRelToPx(ov.w || 10, cw);
  const h = vmRelToPx(ov.h || 10, ch);

  if (ov.type === 'text') {
    // rough hit box around text
    const ctx = vmCanvas()?.getContext('2d');
    const fSize = vmRelToPx(ov.fontSize || 3, ch);
    if (ctx) {
      ctx.font = `bold ${fSize}px sans-serif`;
      const tw = ctx.measureText(ov.text || '').width;
      return mx >= x && mx <= x + tw && my >= y - fSize && my <= y;
    }
  }
  if (ov.type === 'circle') {
    const rx = w / 2, ry = h / 2;
    const cx2 = x + rx, cy2 = y + ry;
    return ((mx - cx2) ** 2 / rx ** 2 + (my - cy2) ** 2 / ry ** 2) <= 1.2;
  }
  if (ov.type === 'rect') {
    return mx >= x && mx <= x + w && my >= y && my <= y + h;
  }
  if (ov.type === 'arrow') {
    // hit test along the line ± 10px
    const x2 = vmRelToPx(ov.x2, cw);
    const y2 = vmRelToPx(ov.y2, ch);
    const dx = x2 - x, dy = y2 - y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return false;
    const t   = ((mx - x) * dx + (my - y) * dy) / (len * len);
    const tc  = Math.max(0, Math.min(1, t));
    const dist = Math.sqrt((mx - (x + tc * dx)) ** 2 + (my - (y + tc * dy)) ** 2);
    return dist <= 10;
  }
  return false;
}

// ── CANVAS EVENTS ─────────────────────────────────────────────────────────────
function vmCMouseDown(e) {
  const canvas = vmCanvas();
  if (!canvas || !vmStep()) return;
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const mx   = e.clientX - rect.left;
  const my   = e.clientY - rect.top;

  if (vmActiveTool === 'select') {
    // Try to select an overlay
    const step = vmStep();
    vmSelectedOvId = null;
    // iterate reverse so top-drawn overlay wins
    for (let i = step.overlays.length - 1; i >= 0; i--) {
      if (vmHitTest(step.overlays[i], mx, my, canvas.width, canvas.height)) {
        vmSelectedOvId = step.overlays[i].id;
        const ov = step.overlays[i];
        vmDraggingOv = {
          id: ov.id,
          startOvX: ov.x, startOvY: ov.y,
          startMx: vmPxToRel(mx, canvas.width),
          startMy: vmPxToRel(my, canvas.height),
          // for arrow, also track x2/y2
          startOvX2: ov.x2, startOvY2: ov.y2,
        };
        vmRenderOvProps(ov);
        break;
      }
    }
    if (!vmSelectedOvId) { vmRenderOvProps(null); vmDraggingOv = null; }
    vmRenderOvList();
    vmRedraw();
    return;
  }

  if (vmActiveTool === 'text') {
    const txt = prompt('Enter text:');
    if (!txt) return;
    const sw = (vmGet('vm-stroke-w')?.value || 3);
    const step = vmStep();
    const startTime = step.trimStart;
    const endTime = Math.min(step.trimEnd, startTime + 4); // default 4 seconds
    vmStep().overlays.push({
      id: vmId(), type: 'text',
      x: vmPxToRel(mx, canvas.width),
      y: vmPxToRel(my, canvas.height),
      text: txt,
      color: vmCurrentColor,
      fontSize: vmPxToRel(vmCurrentFontSize, canvas.height),  // store as % of canvas height
      startTime: startTime,
      endTime: endTime,
      name: 'Text',
    });
    vmRenderOvList();
    vmRedraw();
    return;
  }

  // Drag-to-draw tools
  vmDrawing  = true;
  vmDrawStart = { x: mx, y: my };
  vmDrawEnd   = { x: mx, y: my };
}

function vmCMouseMove(e) {
  const canvas = vmCanvas();
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const mx   = e.clientX - rect.left;
  const my   = e.clientY - rect.top;

  if (vmActiveTool === 'select' && vmDraggingOv) {
    const ov  = vmGetOverlay(vmDraggingOv.id);
    if (!ov) return;
    const dxRel = vmPxToRel(mx, canvas.width)  - vmDraggingOv.startMx;
    const dyRel = vmPxToRel(my, canvas.height) - vmDraggingOv.startMy;
    ov.x = vmDraggingOv.startOvX + dxRel;
    ov.y = vmDraggingOv.startOvY + dyRel;
    if (ov.type === 'arrow') {
      ov.x2 = vmDraggingOv.startOvX2 + dxRel;
      ov.y2 = vmDraggingOv.startOvY2 + dyRel;
    }
    vmRedraw();
    return;
  }

  if (vmDrawing) {
    vmDrawEnd = { x: mx, y: my };
    vmRedraw(true); // pass preview flag
  }
}

function vmCMouseUp(e) {
  if (vmDraggingOv) {
    vmDraggingOv = null;
    vmRenderOvList();
    return;
  }

  if (!vmDrawing) return;
  vmDrawing = false;

  const canvas = vmCanvas();
  if (!canvas || !vmStep()) return;

  const x1 = vmDrawStart.x, y1 = vmDrawStart.y;
  const x2 = vmDrawEnd.x,   y2 = vmDrawEnd.y;
  if (Math.abs(x2 - x1) < 5 && Math.abs(y2 - y1) < 5) { vmRedraw(); return; }

  const sw = +(vmGet('vm-stroke-w')?.value || 3);

  const step = vmStep();
  const startTime = step.trimStart;
  const endTime = Math.min(step.trimEnd, startTime + 4); // default 4 seconds

  if (vmActiveTool === 'rect') {
    vmStep().overlays.push({
      id: vmId(), type: 'rect',
      x: vmPxToRel(Math.min(x1,x2), canvas.width),
      y: vmPxToRel(Math.min(y1,y2), canvas.height),
      w: vmPxToRel(Math.abs(x2-x1), canvas.width),
      h: vmPxToRel(Math.abs(y2-y1), canvas.height),
      color: vmCurrentColor,
      strokeWidth: sw,
      startTime: startTime,
      endTime: endTime,
      name: 'Rectangle',
    });
  } else if (vmActiveTool === 'circle') {
    vmStep().overlays.push({
      id: vmId(), type: 'circle',
      x: vmPxToRel(Math.min(x1,x2), canvas.width),
      y: vmPxToRel(Math.min(y1,y2), canvas.height),
      w: vmPxToRel(Math.abs(x2-x1), canvas.width),
      h: vmPxToRel(Math.abs(y2-y1), canvas.height),
      color: vmCurrentColor,
      strokeWidth: sw,
      startTime: startTime,
      endTime: endTime,
      name: 'Circle',
    });
  } else if (vmActiveTool === 'arrow') {
    vmStep().overlays.push({
      id: vmId(), type: 'arrow',
      x:  vmPxToRel(x1, canvas.width),
      y:  vmPxToRel(y1, canvas.height),
      x2: vmPxToRel(x2, canvas.width),
      y2: vmPxToRel(y2, canvas.height),
      color: vmCurrentColor,
      strokeWidth: sw,
      startTime: startTime,
      endTime: endTime,
      name: 'Arrow',
    });
  }

  vmRenderOvList();
  vmRedraw();
}

// ── CANVAS: DRAW ──────────────────────────────────────────────────────────────
function vmRedraw(withPreview = false) {
  const canvas = vmCanvas();
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cw  = canvas.width;
  const ch  = canvas.height;

  ctx.clearRect(0, 0, cw, ch);

  const step = vmStep();
  if (!step) return;
  
  // Get current video time for overlay visibility
  const video = vmVideo();
  const currentTime = video ? video.currentTime : step.trimStart;

  // Draw committed overlays - only if within their time range
  step.overlays.forEach(ov => {
    const startTime = ov.startTime !== undefined ? ov.startTime : step.trimStart;
    const endTime = ov.endTime !== undefined ? ov.endTime : step.trimEnd;
    
    // Only draw if current time is within overlay's time range
    if (currentTime >= startTime && currentTime <= endTime) {
      vmDrawOverlay(ctx, ov, cw, ch, ov.id === vmSelectedOvId);
    }
  });

  // Draw preview while dragging
  if (withPreview && vmDrawing) {
    const x1 = vmDrawStart.x, y1 = vmDrawStart.y;
    const x2 = vmDrawEnd.x,   y2 = vmDrawEnd.y;
    const sw  = +(vmGet('vm-stroke-w')?.value || 3);

    ctx.strokeStyle = vmCurrentColor;
    ctx.lineWidth   = sw;
    ctx.setLineDash([6, 3]);
    ctx.globalAlpha = 0.7;

    if (vmActiveTool === 'rect') {
      ctx.strokeRect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2-x1), Math.abs(y2-y1));
    } else if (vmActiveTool === 'circle') {
      const cx = (x1+x2)/2, cy = (y1+y2)/2;
      const rx = Math.abs(x2-x1)/2, ry = Math.abs(y2-y1)/2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
      ctx.stroke();
    } else if (vmActiveTool === 'arrow') {
      vmDrawArrow(ctx, x1, y1, x2, y2, sw);
    }

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

function vmDrawOverlay(ctx, ov, cw, ch, selected = false) {
  const x = vmRelToPx(ov.x, cw);
  const y = vmRelToPx(ov.y, ch);
  const sw = ov.strokeWidth || 3;

  ctx.strokeStyle = ov.color || '#ff4444';
  ctx.fillStyle   = ov.color || '#ff4444';
  ctx.lineWidth   = sw;
  ctx.setLineDash([]);

  if (ov.type === 'rect') {
    const w = vmRelToPx(ov.w, cw);
    const h = vmRelToPx(ov.h, ch);
    ctx.strokeRect(x, y, w, h);
    if (selected) vmDrawSelHandle(ctx, x, y, w, h);
  }

  else if (ov.type === 'circle') {
    const w = vmRelToPx(ov.w, cw);
    const h = vmRelToPx(ov.h, ch);
    const cx = x + w/2, cy = y + h/2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w/2, h/2, 0, 0, Math.PI*2);
    ctx.stroke();
    if (selected) vmDrawSelHandle(ctx, x, y, w, h);
  }

  else if (ov.type === 'text') {
    const fSize = vmRelToPx(ov.fontSize || 3, ch);
    ctx.font      = `bold ${fSize}px sans-serif`;
    ctx.textBaseline = 'bottom';
    // Drop shadow for readability
    ctx.shadowColor   = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur    = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(ov.text || '', x, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
    if (selected) {
      const tw = ctx.measureText(ov.text || '').width;
      ctx.setLineDash([3, 2]);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(x - 2, y - fSize - 2, tw + 4, fSize + 6);
      ctx.setLineDash([]);
    }
  }

  else if (ov.type === 'arrow') {
    const x2 = vmRelToPx(ov.x2, cw);
    const y2 = vmRelToPx(ov.y2, ch);
    vmDrawArrow(ctx, x, y, x2, y2, sw);
    if (selected) {
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI*2);
      ctx.fill();
    }
  }
}

function vmDrawArrow(ctx, x1, y1, x2, y2, sw) {
  const angle     = Math.atan2(y2 - y1, x2 - x1);
  const headLen   = Math.max(12, sw * 4);
  const headAngle = Math.PI / 7;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - headAngle), y2 - headLen * Math.sin(angle - headAngle));
  ctx.lineTo(x2 - headLen * Math.cos(angle + headAngle), y2 - headLen * Math.sin(angle + headAngle));
  ctx.closePath();
  ctx.fill();
}

function vmDrawSelHandle(ctx, x, y, w, h) {
  ctx.setLineDash([3, 2]);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
  ctx.setLineDash([]);
}

// ── OVERLAY PROPERTIES PANEL ─────────────────────────────────────────────────
function vmRenderOvProps(ov) {
  const panel = vmGet('vm-ov-props');
  if (!panel) return;
  if (!ov) {
    panel.innerHTML = '<p class="text-xs text-gray-400 italic">Select an overlay to edit.</p>';
    return;
  }

  // Get step info for default timing
  const step = vmStep();
  const startTime = ov.startTime !== undefined ? ov.startTime : (step ? step.trimStart : 0);
  const endTime = ov.endTime !== undefined ? ov.endTime : (step ? step.trimEnd : 4);

  let html = `<div class="space-y-2">
    <p class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">${ov.type}</p>
    
    <label class="text-xs text-gray-400 block">Name</label>
    <input type="text" value="${(ov.name || ov.type || '').replace(/"/g, '&quot;')}"
      class="w-full text-xs p-1 rounded border border-gray-200 dark:border-gray-600 bg-transparent dark:text-white focus:outline-none focus:border-blue-400"
      onchange="vmOvUpdate('${ov.id}','name',this.value)">
    
    <div class="flex gap-2">
      <div class="flex-1">
        <label class="text-xs text-gray-400 block">Start (s)</label>
        <input type="number" value="${startTime.toFixed(2)}" min="0" step="0.1"
          class="w-full text-xs p-1 rounded border border-gray-200 dark:border-gray-600 bg-transparent dark:text-white focus:outline-none focus:border-blue-400"
          onchange="vmOvUpdate('${ov.id}','startTime',+this.value); vmRenderEnhancedTimeline();">
      </div>
      <div class="flex-1">
        <label class="text-xs text-gray-400 block">End (s)</label>
        <input type="number" value="${endTime.toFixed(2)}" min="0" step="0.1"
          class="w-full text-xs p-1 rounded border border-gray-200 dark:border-gray-600 bg-transparent dark:text-white focus:outline-none focus:border-blue-400"
          onchange="vmOvUpdate('${ov.id}','endTime',+this.value); vmRenderEnhancedTimeline();">
      </div>
    </div>`;

  if (ov.type === 'text') {
    html += `
      <label class="text-xs text-gray-400 block">Text</label>
      <textarea rows="2" class="w-full text-xs p-1 rounded border border-gray-200 dark:border-gray-600 bg-transparent dark:text-white focus:outline-none focus:border-blue-400 resize-none"
        onchange="vmOvUpdate('${ov.id}','text',this.value)">${ov.text || ''}</textarea>
      <label class="text-xs text-gray-400 block">Font size %</label>
      <input type="number" value="${(ov.fontSize||3).toFixed(2)}" min="0.5" max="20" step="0.1"
        class="w-full text-xs p-1 rounded border border-gray-200 dark:border-gray-600 bg-transparent dark:text-white focus:outline-none focus:border-blue-400"
        onchange="vmOvUpdate('${ov.id}','fontSize',+this.value)">`;
  }

  if (ov.strokeWidth !== undefined) {
    html += `
      <label class="text-xs text-gray-400 block">Stroke width</label>
      <input type="number" value="${ov.strokeWidth}" min="1" max="30"
        class="w-full text-xs p-1 rounded border border-gray-200 dark:border-gray-600 bg-transparent dark:text-white focus:outline-none focus:border-blue-400"
        onchange="vmOvUpdate('${ov.id}','strokeWidth',+this.value)">`;
  }

  html += `
    <label class="text-xs text-gray-400 block">Color</label>
    <input type="color" value="${ov.color || '#ff4444'}"
      class="w-full h-7 rounded cursor-pointer border border-gray-200 dark:border-gray-600"
      onchange="vmOvUpdate('${ov.id}','color',this.value)">
    <button onclick="vmDeleteOverlay('${ov.id}')"
      class="w-full mt-1 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-500 text-xs hover:bg-red-100 flex items-center justify-center gap-1">
      <i class="ri-delete-bin-line"></i>Delete overlay</button>
  </div>`;

  panel.innerHTML = html;
}

window.vmOvUpdate = function(id, field, value) {
  const ov = vmGetOverlay(id);
  if (!ov) return;
  ov[field] = value;
  vmRedraw();
};

function vmGetOverlay(id) {
  if (!vmProject) return null;
  for (const step of vmProject.steps) {
    const ov = step.overlays.find(o => o.id === id);
    if (ov) return ov;
  }
  return null;
}

window.vmDeleteOverlay = function(id) {
  if (!vmStep()) return;
  vmStep().overlays = vmStep().overlays.filter(o => o.id !== id);
  if (vmSelectedOvId === id) vmSelectedOvId = null;
  vmRenderOvList();
  vmRenderOvProps(null);
  vmRenderEnhancedTimeline();
  vmRedraw();
};

// ── OVERLAYS LIST (right bottom panel) ───────────────────────────────────────
function vmRenderOvList() {
  const list = vmGet('vm-ov-list');
  if (!list || !vmStep()) { if (list) list.innerHTML = ''; return; }
  const ovs = vmStep().overlays;
  const step = vmStep();
  if (ovs.length === 0) {
    list.innerHTML = '<p class="text-xs text-gray-400 italic py-1">No overlays yet.</p>';
    return;
  }
  list.innerHTML = ovs.map(ov => {
    const startT = ov.startTime !== undefined ? ov.startTime : step.trimStart;
    const endT = ov.endTime !== undefined ? ov.endTime : step.trimEnd;
    const label = ov.name || (ov.type === 'text' ? `"${(ov.text||'').slice(0,10)}"` : ov.type);
    return `
    <div onclick="vmSelectOvFromList('${ov.id}')"
      class="flex items-center gap-1.5 py-1 px-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${ov.id === vmSelectedOvId ? 'bg-blue-50 dark:bg-blue-900/30' : ''}">
      <div class="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-gray-300" style="background:${ov.color}"></div>
      <div class="flex-1 min-w-0">
        <span class="text-xs text-gray-600 dark:text-gray-300 block truncate">${label}</span>
        <span class="text-xs text-gray-400">${vmFmt(startT)} → ${vmFmt(endT)}</span>
      </div>
      <button onclick="event.stopPropagation();vmDeleteOverlay('${ov.id}')" class="text-gray-400 hover:text-red-400 text-xs"><i class="ri-close-line"></i></button>
    </div>`;
  }).join('');
}

window.vmSelectOvFromList = function(id) {
  vmSelectedOvId = id;
  const ov = vmGetOverlay(id);
  vmRenderOvProps(ov);
  vmRenderOvList();
  vmRedraw();
};

// ── SAVE PROJECT ──────────────────────────────────────────────────────────────
async function vmSaveProject() {
  if (!vmProject) return;
  vmProject.title = vmGet('vm-title')?.value || vmProject.title;

  // Push a history snapshot
  const snapshot = {
    savedAt: new Date().toISOString(),
    stepCount: vmProject.steps.length,
    state: JSON.parse(JSON.stringify({ title: vmProject.title, steps: vmProject.steps })),
  };
  vmProject.history = [snapshot, ...(vmProject.history || [])].slice(0, 30);

  const baseUrl = typeof BASE_URL !== 'undefined' ? BASE_URL : 'http://localhost:3000/';

  try {
    const res = await fetch(`${baseUrl}api/video-manuals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vmProject),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || res.status);
    }
    const data = await res.json();
    // Store the new _id on first insert
    if (data.insertedId && !vmProject._id) vmProject._id = data.insertedId;

    vmToast('Project saved ✓', 'green');
  } catch (e) {
    console.error('[VM] Save error', e);
    vmToast('Save failed: ' + e.message, 'red');
  }
}

// ── SHOW HISTORY ──────────────────────────────────────────────────────────────
function vmShowHistory() {
  const list = vmGet('vm-history-list');
  if (!list || !vmProject) return;
  const hist = vmProject.history || [];

  if (hist.length === 0) {
    list.innerHTML = '<p class="text-sm text-gray-400 text-center py-6">No saved versions yet.<br>Click Save to create a snapshot.</p>';
  } else {
    list.innerHTML = hist.map((h, i) => `
      <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-800 dark:text-white">${h.state?.title || 'Untitled'}</p>
          <p class="text-xs text-gray-400">${new Date(h.savedAt).toLocaleString()} · ${h.stepCount} step${h.stepCount !== 1 ? 's' : ''}</p>
        </div>
        <button onclick="vmRevertToSnapshot(${i})"
          class="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded hover:bg-blue-100">
          Revert</button>
      </div>
    `).join('');
  }

  vmGet('vm-modal-history').classList.remove('hidden');
}

window.vmRevertToSnapshot = function(idx) {
  if (!confirm('Revert to this version? Current unsaved changes will be lost.')) return;
  const snap = vmProject.history[idx];
  if (!snap || !snap.state) return;
  vmProject.title = snap.state.title;
  vmProject.steps = JSON.parse(JSON.stringify(snap.state.steps));
  vmGet('vm-title').value = vmProject.title;
  vmCurrentStepIdx = 0;
  vmSelectedOvId   = null;
  vmRenderStepsList();
  vmRenderTimeline();
  vmRenderOvList();
  vmRenderOvProps(null);
  vmRedraw();
  vmGet('vm-modal-history').classList.add('hidden');
  vmToast('Reverted to snapshot ✓', 'blue');
};

// ── OPEN EXISTING PROJECT ─────────────────────────────────────────────────────
async function vmLoadExistingProject() {
  const baseUrl = typeof BASE_URL !== 'undefined' ? BASE_URL : 'http://localhost:3000/';
  try {
    const res  = await fetch(`${baseUrl}api/video-manuals`);
    if (!res.ok) throw new Error(res.status);
    const docs = await res.json();
    vmShowOpenModal(Array.isArray(docs) ? docs : []);
  } catch (e) {
    alert('Could not fetch projects: ' + e.message);
  }
}

let _vmAllProjects = [];
function vmShowOpenModal(docs) {
  _vmAllProjects = docs;
  vmFilterOpenList('');
  vmGet('vm-modal-open').classList.remove('hidden');
}

window.vmFilterOpenList = function(q) {
  const list = vmGet('vm-open-list');
  if (!list) return;
  const filtered = _vmAllProjects.filter(d =>
    !q || (d.title || '').toLowerCase().includes(q.toLowerCase())
  );
  if (filtered.length === 0) {
    list.innerHTML = '<p class="text-sm text-gray-400 text-center py-6">No projects found.</p>';
    return;
  }
  list.innerHTML = filtered.map(d => `
    <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
      onclick="vmOpenProject('${d._id}')">
      <i class="ri-video-line text-blue-400 text-xl flex-shrink-0"></i>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-800 dark:text-white truncate">${d.title || 'Untitled'}</p>
        <p class="text-xs text-gray-400">${d.steps?.length || 0} steps · by ${d.createdBy || '?'} · ${new Date(d.createdAt).toLocaleDateString()}</p>
      </div>
      <i class="ri-arrow-right-s-line text-gray-400"></i>
    </div>
  `).join('');
};

window.vmOpenProject = async function(id) {
  const baseUrl = typeof BASE_URL !== 'undefined' ? BASE_URL : 'http://localhost:3000/';
  try {
    const res = await fetch(`${baseUrl}api/video-manuals/${id}`);
    if (!res.ok) { alert('Project not found.'); return; }
    const doc = await res.json();
    vmProject = doc;
    vmGet('vm-title').value    = doc.title || 'Untitled Manual';
    vmCurrentStepIdx           = 0;
    vmSelectedOvId             = null;

    vmGet('vm-modal-open').classList.add('hidden');

    if (doc.videoUrl) {
      // Load video from Creatomate URL
      const video = vmVideo();
      // Only works if the video element is visible — show it
      vmGet('vm-upload-zone').classList.add('hidden');
      vmGet('vm-player-area').classList.remove('hidden');
      video.src = doc.videoUrl;
      video.load();
      vmToast(`Opened "${doc.title}"`, 'blue');
    } else {
      vmRenderStepsList();
      vmRenderTimeline();
      vmRenderOvList();
      vmToast(`Opened "${doc.title}" (no video attached)`, 'blue');
    }
  } catch (e) {
    alert('Failed to open project: ' + e.message);
  }
};

// ── EXPORT / RENDER ───────────────────────────────────────────────────────────
async function vmExportVideo() {
  if (!vmProject || vmProject.steps.length === 0) {
    alert('Nothing to export — add at least one step.');
    return;
  }
  if (!vmProject.videoUrl) {
    alert('Video has not finished uploading to Creatomate yet.\nPlease wait for the upload to complete.');
    return;
  }

  const modal   = vmGet('vm-modal-render');
  const working = vmGet('vm-render-working');
  const done    = vmGet('vm-render-done');
  const errDiv  = vmGet('vm-render-err');
  const msgEl   = vmGet('vm-render-msg');
  const subEl   = vmGet('vm-render-sub');

  modal.classList.remove('hidden');
  working.classList.remove('hidden');
  done.classList.add('hidden');
  errDiv.classList.add('hidden');
  msgEl.textContent = 'Building render source…';
  subEl.textContent = '';

  try {
    const source = vmBuildCreatomateSource();

    msgEl.textContent = 'Submitting to Creatomate…';
    const submitRes = await fetch(`${BASE_URL}api/creatomate/renders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source }),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      throw new Error(`Creatomate error ${submitRes.status}: ${errText}`);
    }

    const renders = await submitRes.json();
    const render  = Array.isArray(renders) ? renders[0] : renders;

    msgEl.textContent = 'Rendering in cloud…';
    subEl.textContent = `ID: ${render.id}`;

    // Poll for completion
    const finalRender = await vmPollRender(render.id, subEl);

    if (finalRender.status === 'succeeded') {
      vmLastRenderUrl = finalRender.url;
      vmGet('vm-render-dl').href = finalRender.url;
      working.classList.add('hidden');
      done.classList.remove('hidden');

      // Save render URL to project
      vmProject.lastRenderUrl = finalRender.url;
      vmSaveProject();
    } else {
      throw new Error('Render failed with status: ' + finalRender.status + ' — ' + (finalRender.error_message || ''));
    }

  } catch (err) {
    working.classList.add('hidden');
    errDiv.classList.remove('hidden');
    vmGet('vm-render-err-msg').textContent = err.message;
    console.error('[VM] Export error', err);
  }
}

async function vmPollRender(renderId, subEl) {
  const maxAttempts = 120;  // 2 min
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 4000));

    const res = await fetch(`${BASE_URL}api/creatomate/renders/${renderId}`);
    if (!res.ok) throw new Error(`Poll error ${res.status}`);

    const render = await res.json();
    const pct    = render.render_progress ? Math.round(render.render_progress * 100) : 0;
    if (subEl) subEl.textContent = `${render.status} — ${pct}%`;

    if (render.status === 'succeeded' || render.status === 'failed') return render;
  }
  throw new Error('Render timed out after 2 minutes');
}

// ── BUILD CREATOMATE SOURCE JSON ──────────────────────────────────────────────
// Creatomate render script uses snake_case for ALL property names.
function vmBuildCreatomateSource() {
  const elements = [];
  let cumulativeTime = 0; // seconds into the output timeline
  
  // Build a map of step start times in output timeline
  const stepOutputTimes = [];
  let runningTime = 0;
  vmProject.steps.forEach(step => {
    stepOutputTimes.push(runningTime);
    runningTime += step.trimEnd - step.trimStart;
  });

  vmProject.steps.forEach((step, stepIdx) => {
    const stepDuration = step.trimEnd - step.trimStart;

    // ── Video clip ────────────────────────────────────────────
    elements.push({
      type:          'video',
      track:         1,
      time:          cumulativeTime,   // explicit output start time (seconds)
      source:        vmProject.videoUrl,
      trim_start:    step.trimStart,   // number (seconds), no 's' suffix needed
      trim_duration: stepDuration,
    });

    // ── Overlays for this step ────────────────────────────────
    let ovTrack = 2;
    step.overlays.forEach(ov => {
      // Calculate overlay timing
      // startTime/endTime are in absolute video time, convert to output timeline
      const ovStartVideo = ov.startTime !== undefined ? ov.startTime : step.trimStart;
      const ovEndVideo = ov.endTime !== undefined ? ov.endTime : step.trimEnd;
      
      // Convert video timestamp to output timeline
      // Find which parts of the overlay are visible in each step
      const ovStartInStep = Math.max(ovStartVideo, step.trimStart);
      const ovEndInStep = Math.min(ovEndVideo, step.trimEnd);
      
      // Skip if overlay doesn't appear in this step
      if (ovStartInStep >= ovEndInStep) return;
      
      const ovOutputStart = cumulativeTime + (ovStartInStep - step.trimStart);
      const ovDuration = ovEndInStep - ovStartInStep;
      
      // Base properties shared by all overlay types
      const el = {
        track:    ovTrack++,
        time:     ovOutputStart,
        duration: ovDuration,
        x_anchor: '0%',
        y_anchor: '0%',
      };

      if (ov.type === 'text') {
        el.type        = 'text';
        el.text        = ov.text || '';
        el.x           = ov.x + '%';
        // Offset Y up by roughly the font size to match canvas positioning
        el.y           = (ov.y - (ov.fontSize || 14)) + '%';
        // Let text auto-size (null = fit to content)
        el.width       = null;
        el.height      = null;
        el.fill_color  = ov.color || '#ffffff';
        el.font_weight = 700;
        el.font_size   = (ov.fontSize || 14) + ' vmin';
        el.shadow_color = '#000000';
        el.shadow_blur  = '1 vmin';
        el.shadow_x     = '0.5 vmin';
        el.shadow_y     = '0.5 vmin';
      }

      else if (ov.type === 'rect') {
        el.type         = 'shape';
        // Use center-anchored positioning (convert from top-left)
        el.x            = (ov.x + ov.w / 2) + '%';
        el.y            = (ov.y + ov.h / 2) + '%';
        el.width        = ov.w + '%';
        el.height       = ov.h + '%';
        el.x_anchor     = '50%';
        el.y_anchor     = '50%';
        // SVG path for rectangle (boxed coords 0-100)
        el.path         = 'M 0 0 L 100 0 L 100 100 L 0 100 Z';
        el.stroke_color = ov.color || '#ff4444';
        // Convert canvas stroke to vmin (editor 3 ≈ 0.5 vmin)
        el.stroke_width = ((ov.strokeWidth || 3) / 6).toFixed(1) + ' vmin';
      }

      else if (ov.type === 'circle') {
        el.type         = 'shape';
        // Use center-anchored positioning (convert from top-left)
        el.x            = (ov.x + ov.w / 2) + '%';
        el.y            = (ov.y + ov.h / 2) + '%';
        el.width        = ov.w + '%';
        el.height       = ov.h + '%';
        el.x_anchor     = '50%';
        el.y_anchor     = '50%';
        // SVG path for ellipse using cubic bezier curves (boxed coords 0-100)
        el.path         = 'M 50 0 C 77.6 0 100 22.4 100 50 C 100 77.6 77.6 100 50 100 C 22.4 100 0 77.6 0 50 C 0 22.4 22.4 0 50 0 Z';
        el.stroke_color = ov.color || '#ff4444';
        // Convert canvas stroke to vmin (editor 3 ≈ 0.5 vmin)
        el.stroke_width = ((ov.strokeWidth || 3) / 6).toFixed(1) + ' vmin';
      }

      else if (ov.type === 'arrow') {
        // Approximate arrow with a bold → text symbol centred on the line midpoint
        el.type        = 'text';
        el.text        = '➜';
        el.x           = ((ov.x + ov.x2) / 2) + '%';
        el.y           = ((ov.y + ov.y2) / 2) + '%';
        el.width       = '10%';
        el.height      = '10%';
        el.fill_color  = ov.color || '#ff4444';
        el.font_size   = '6 vmin';
        el.font_weight = 900;
        el.x_anchor    = '50%';
        el.y_anchor    = '50%';
      }

      elements.push(el);
    });

    cumulativeTime += stepDuration;
  });

  return {
    output_format: 'mp4',
    width:         vmProject.videoWidth  || 1920,
    height:        vmProject.videoHeight || 1080,
    frame_rate:    30,
    elements,
  };
}

// ── COPY SHARE LINK ───────────────────────────────────────────────────────────
window.vmCopyLink = function() {
  if (!vmLastRenderUrl) { alert('No render URL available.'); return; }
  navigator.clipboard.writeText(vmLastRenderUrl)
    .then(() => vmToast('Link copied to clipboard ✓', 'green'))
    .catch(() => {
      prompt('Copy this link:', vmLastRenderUrl);
    });
};

// ── TOAST NOTIFICATION ────────────────────────────────────────────────────────
function vmToast(msg, color = 'green') {
  const colors = {
    green: 'bg-green-500',
    red:   'bg-red-500',
    blue:  'bg-blue-500',
  };
  const toast = document.createElement('div');
  toast.className = `fixed bottom-6 right-6 z-[400] px-4 py-2 rounded-lg text-white text-sm shadow-lg ${colors[color] || colors.green} transition-opacity`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NEW FEATURES: ZOOM, TIMELINE, SNAPSHOT, STEP EDITING
// ═══════════════════════════════════════════════════════════════════════════════

// ── ZOOM CONTROLS ─────────────────────────────────────────────────────────────
function vmSetZoom(level) {
  vmZoomLevel = level;
  const wrapper = vmGet('vm-video-wrapper');
  const video = vmVideo();
  if (!wrapper || !video) return;
  
  wrapper.style.transform = `scale(${level})`;
  
  // Update zoom button states
  document.querySelectorAll('.vm-zoom-btn').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.dataset.zoom) === level);
    btn.classList.toggle('bg-gray-700', parseFloat(btn.dataset.zoom) === level);
    btn.classList.toggle('text-white', parseFloat(btn.dataset.zoom) === level);
  });
  
  vmSyncCanvasSize();
}

function vmFitZoom() {
  const video = vmVideo();
  const outer = vmGet('vm-video-outer');
  if (!video || !outer) return;
  
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  const ow = outer.clientWidth - 40;
  const oh = outer.clientHeight - 40;
  
  const scaleX = ow / vw;
  const scaleY = oh / vh;
  const fit = Math.min(scaleX, scaleY, 1);
  
  vmSetZoom(Math.round(fit * 100) / 100);
}

// ── FRAME STEPPING ────────────────────────────────────────────────────────────
function vmStepForward() {
  const video = vmVideo();
  if (!video) return;
  video.currentTime = Math.min(video.currentTime + (1/30), video.duration);
}

function vmStepBackward() {
  const video = vmVideo();
  if (!video) return;
  video.currentTime = Math.max(video.currentTime - (1/30), 0);
}

// ── SNAPSHOT (FREEZE FRAME) ───────────────────────────────────────────────────
function vmSnapshot() {
  const video = vmVideo();
  if (!video || !vmProject || !vmStep()) return;
  
  const t = video.currentTime;
  const step = vmStep();
  
  // Check if we're at least 0.1s from edges
  if (t <= step.trimStart + 0.1 || t >= step.trimEnd - 0.1) {
    alert('Move playhead away from step boundaries to create a snapshot.');
    return;
  }
  
  const freezeDuration = parseFloat(prompt('Freeze duration (seconds):', '3') || '0');
  if (freezeDuration <= 0) return;
  
  // Create a new step that's a freeze frame
  const freezeStep = {
    id: vmId().replace('ov_', 'step_'),
    label: 'Freeze ' + (vmProject.steps.length + 1),
    description: 'Freeze frame at ' + vmFmt(t),
    trimStart: t,
    trimEnd: t + 0.001, // tiny duration, we'll use freeze
    freezeDuration: freezeDuration,
    freezeTime: t, // the exact frame to freeze
    overlays: [],
  };
  
  // Split current step
  const oldEnd = step.trimEnd;
  step.trimEnd = t;
  
  // Create continuation step
  const contStep = {
    id: vmId().replace('ov_', 'step_'),
    label: 'Step ' + (vmProject.steps.length + 2),
    trimStart: t,
    trimEnd: oldEnd,
    overlays: [],
  };
  
  // Insert freeze and continuation after current
  vmProject.steps.splice(vmCurrentStepIdx + 1, 0, freezeStep, contStep);
  
  // Renumber
  vmProject.steps.forEach((s, i) => {
    if (!s.label.startsWith('Freeze')) s.label = 'Step ' + (i + 1);
  });
  
  vmRenderStepsList();
  vmRenderEnhancedTimeline();
  vmToast('Freeze frame inserted', 'purple');
}

// ── ENHANCED TIMELINE RENDERING ───────────────────────────────────────────────
function vmRenderEnhancedTimeline() {
  const container = vmGet('vm-timeline-container');
  const ruler = vmGet('vm-time-ruler');
  const tracks = vmGet('vm-overlay-tracks');
  const segs = vmGet('vm-step-segs');
  if (!container || !vmProject || vmProject.videoDuration === 0) return;
  
  const dur = vmProject.videoDuration;
  const pxPerSec = 50 * vmTimelineZoom; // 50px per second at zoom 1
  const totalWidth = dur * pxPerSec;
  
  container.style.width = totalWidth + 'px';
  
  // Render time ruler
  ruler.innerHTML = '';
  ruler.style.width = totalWidth + 'px';
  for (let t = 0; t <= dur; t++) {
    const major = t % 5 === 0;
    const tick = document.createElement('div');
    tick.className = 'absolute text-gray-500';
    tick.style.left = (t * pxPerSec) + 'px';
    tick.innerHTML = major 
      ? `<div class="h-3 w-px bg-gray-600"></div><span class="text-xs ml-1">${vmFmt(t)}</span>`
      : `<div class="h-1.5 w-px bg-gray-700"></div>`;
    ruler.appendChild(tick);
  }
  
  // Render step segments
  const colors = ['#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
  segs.innerHTML = vmProject.steps.map((s, i) => {
    const left = s.trimStart * pxPerSec;
    const width = (s.trimEnd - s.trimStart) * pxPerSec;
    const active = i === vmCurrentStepIdx;
    return `<div onclick="vmSelectStep(${i})" title="${s.label}"
      class="h-full flex items-center justify-center text-white text-xs cursor-pointer ${active ? '' : 'opacity-60'}"
      style="position:absolute; left:${left}px; width:${width}px; background:${colors[i % colors.length]};">
      ${width > 40 ? s.label : ''}
    </div>`;
  }).join('');
  segs.style.width = totalWidth + 'px';
  segs.style.position = 'relative';
  
  // Render overlay tracks
  vmRenderOverlayTracks(tracks, pxPerSec, totalWidth);
}

function vmRenderOverlayTracks(tracksEl, pxPerSec, totalWidth) {
  if (!tracksEl || !vmProject) return;
  
  tracksEl.innerHTML = '';
  tracksEl.style.width = totalWidth + 'px';
  
  // Collect all overlays from all steps with their timing
  const allOverlays = [];
  vmProject.steps.forEach((step, stepIdx) => {
    step.overlays.forEach(ov => {
      // Calculate overlay timing - default to full step duration, or use stored timing
      const startTime = ov.startTime !== undefined ? ov.startTime : step.trimStart;
      const endTime = ov.endTime !== undefined ? ov.endTime : step.trimEnd;
      allOverlays.push({
        ...ov,
        stepIdx,
        startTime,
        endTime,
        duration: endTime - startTime,
      });
    });
  });
  
  // Assign overlays to tracks using non-overlapping row algorithm
  const trackRows = [];
  allOverlays.forEach((ov) => {
    let placed = false;
    for (let row = 0; row < trackRows.length; row++) {
      const lastInRow = trackRows[row];
      if (ov.startTime >= lastInRow.endTime) {
        trackRows[row] = ov;
        ov.row = row;
        placed = true;
        break;
      }
    }
    if (!placed) {
      ov.row = trackRows.length;
      trackRows.push(ov);
    }
  });
  
  allOverlays.forEach((ov) => {
    const bar = document.createElement('div');
    bar.className = `vm-overlay-bar ${ov.id === vmSelectedOvId ? 'selected' : ''}`;
    bar.style.left = (ov.startTime * pxPerSec) + 'px';
    bar.style.width = Math.max(30, ov.duration * pxPerSec) + 'px';
    bar.style.top = (ov.row * 26) + 'px';
    bar.style.background = ov.color || '#ff4444';
    bar.dataset.ovId = ov.id;
    bar.dataset.stepIdx = ov.stepIdx;
    bar.dataset.startTime = ov.startTime;
    bar.dataset.endTime = ov.endTime;
    
    const icon = ov.type === 'text' ? 'T' : ov.type === 'circle' ? '◯' : ov.type === 'rect' ? '▭' : '→';
    const label = ov.name || (ov.type === 'text' ? (ov.text || '').slice(0, 10) : ov.type);
    bar.innerHTML = `
      <div class="resize-handle left" data-side="left"></div>
      <span class="flex-1 flex items-center overflow-hidden pointer-events-none">
        <span class="mr-1">${icon}</span>
        <span class="truncate">${label}</span>
      </span>
      <div class="resize-handle right" data-side="right"></div>
    `;
    
    // Store refs for handlers
    const ovId = ov.id;
    const stepIdx = ov.stepIdx;
    const currentPxPerSec = pxPerSec;
    
    bar.addEventListener('click', (e) => {
      e.stopPropagation();
      vmSelectOverlayOnTimeline(ovId, stepIdx);
    });
    
    bar.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.resize-handle');
      if (handle) {
        e.preventDefault();
        e.stopPropagation();
        vmStartResizeOverlayBar(e, ovId, stepIdx, handle.dataset.side, currentPxPerSec);
      } else if (!e.target.classList.contains('resize-handle')) {
        e.preventDefault();
        vmStartDragOverlayBar(e, ovId, stepIdx, currentPxPerSec);
      }
    });
    
    tracksEl.appendChild(bar);
  });
  
  // Adjust track area height based on actual rows used
  const numRows = trackRows.length || 1;
  const trackHeight = Math.max(60, numRows * 26 + 10);
  tracksEl.style.height = trackHeight + 'px';
}

function vmSelectOverlayOnTimeline(ovId, stepIdx) {
  if (stepIdx !== vmCurrentStepIdx) {
    vmCurrentStepIdx = stepIdx;
    const step = vmStep();
    const video = vmVideo();
    if (step && video) video.currentTime = step.trimStart;
  }
  vmSelectedOvId = ovId;
  const ov = vmGetOverlay(ovId);
  vmRenderOvProps(ov);
  vmRenderOvList();
  vmRenderEnhancedTimeline();
  vmRedraw();
}

// ── OVERLAY TIMELINE DRAGGING ─────────────────────────────────────────────────
function vmStartDragOverlayBar(e, ovId, stepIdx, pxPerSec) {
  e.preventDefault();
  const startX = e.clientX;
  const step = vmProject.steps[stepIdx];
  if (!step) return;
  const overlay = step.overlays.find(o => o.id === ovId);
  if (!overlay) return;
  
  const origStart = overlay.startTime !== undefined ? overlay.startTime : step.trimStart;
  const origEnd = overlay.endTime !== undefined ? overlay.endTime : step.trimEnd;
  const duration = origEnd - origStart;
  
  // Visual feedback
  document.body.style.cursor = 'grabbing';
  
  const onMove = (me) => {
    const dx = me.clientX - startX;
    const dt = dx / pxPerSec;
    const newStart = Math.max(0, origStart + dt);
    const newEnd = Math.min(vmProject.videoDuration, newStart + duration);
    
    overlay.startTime = newStart;
    overlay.endTime = newEnd;
    vmRenderEnhancedTimeline();
  };
  
  const onUp = () => {
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    vmRenderOvProps(overlay);
  };
  
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function vmStartResizeOverlayBar(e, ovId, stepIdx, side, pxPerSec) {
  e.preventDefault();
  e.stopPropagation();
  const startX = e.clientX;
  const step = vmProject.steps[stepIdx];
  if (!step) return;
  const overlay = step.overlays.find(o => o.id === ovId);
  if (!overlay) return;
  
  const origStart = overlay.startTime !== undefined ? overlay.startTime : step.trimStart;
  const origEnd = overlay.endTime !== undefined ? overlay.endTime : step.trimEnd;
  
  // Visual feedback
  document.body.style.cursor = 'ew-resize';
  
  const onMove = (me) => {
    const dx = me.clientX - startX;
    const dt = dx / pxPerSec;
    
    if (side === 'left') {
      overlay.startTime = Math.max(0, Math.min(origEnd - 0.5, origStart + dt));
    } else {
      overlay.endTime = Math.min(vmProject.videoDuration, Math.max(origStart + 0.5, origEnd + dt));
    }
    vmRenderEnhancedTimeline();
  };
  
  const onUp = () => {
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    vmRenderOvProps(overlay);
  };
  
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ── TIMELINE SEEK ─────────────────────────────────────────────────────────────
function vmTimelineSeek(e) {
  const container = vmGet('vm-timeline-container');
  const video = vmVideo();
  if (!container || !video || !vmProject) return;
  
  const rect = container.getBoundingClientRect();
  const scrollLeft = container.scrollLeft;
  const x = e.clientX - rect.left + scrollLeft;
  const pxPerSec = 50 * vmTimelineZoom;
  const time = Math.max(0, Math.min(vmProject.videoDuration, x / pxPerSec));
  
  video.currentTime = time;
  
  // Switch to the step at that time
  const idx = vmProject.steps.findIndex(s => time >= s.trimStart && time < s.trimEnd);
  if (idx >= 0 && idx !== vmCurrentStepIdx) {
    vmCurrentStepIdx = idx;
    vmRenderStepsList();
    vmRenderOvList();
    vmRedraw();
  }
  
  vmUpdatePlayhead();
}

function vmUpdatePlayhead() {
  const ph = vmGet('vm-playhead');
  const video = vmVideo();
  if (!ph || !video || !vmProject) return;
  
  const pxPerSec = 50 * vmTimelineZoom;
  const left = video.currentTime * pxPerSec;
  ph.style.left = left + 'px';
}

// ── UPDATE EXISTING FUNCTIONS ─────────────────────────────────────────────────
// Override vmRenderTimeline to use enhanced version
const _originalVmRenderTimeline = typeof vmRenderTimeline === 'function' ? vmRenderTimeline : null;
vmRenderTimeline = function() {
  vmRenderEnhancedTimeline();
};

// Override vmOnTimeUpdate to update new playhead
const _originalVmOnTimeUpdate = vmOnTimeUpdate;
vmOnTimeUpdate = function() {
  _originalVmOnTimeUpdate();
  vmUpdatePlayhead();
};

// ── WINDOW EXPORTS (for onclick handlers) ─────────────────────────────────────
window.vmSetZoom = vmSetZoom;
window.vmFitZoom = vmFitZoom;
window.vmStepForward = vmStepForward;
window.vmStepBackward = vmStepBackward;
window.vmSnapshot = vmSnapshot;
window.vmTimelineSeek = vmTimelineSeek;
window.vmRenameStep = vmRenameStep;
window.vmSetStepDesc = vmSetStepDesc;
window.vmDeleteStep = vmDeleteStep;
window.vmStepDragStart = vmStepDragStart;
window.vmStepDragOver = vmStepDragOver;
window.vmStepDrop = vmStepDrop;
window.vmRenderEnhancedTimeline = vmRenderEnhancedTimeline;

