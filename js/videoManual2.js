// ═══════════════════════════════════════════════════════════════════════════
//  VIDEO MANUAL CREATOR v2  –  FFmpeg.wasm powered (free, client-side export)
// ═══════════════════════════════════════════════════════════════════════════

// Database config
const VM2_DB         = 'Sasaki_Coating_MasterDB';
const VM2_COLLECTION = 'videoManuals';

// ── Module State ────────────────────────────────────────────────────────────
let vm2 = {
  project: null,
  currentStepIdx: 0,
  selectedElementId: null,
  playing: false,
  duration: 0,
  currentTime: 0,
  hoverTime: null,
  timelineZoom: 100, // pixels per second
  canvasZoom: 1,
  isDraggingElement: false,
  isResizingElement: false,
  resizeHandle: null,
  dragOffset: { x: 0, y: 0 },
  isDraggingTimelineBar: false,
  timelineDragData: null,
  ffmpeg: null,
  ffmpegLoaded: false,
};

// ── Utility Functions ───────────────────────────────────────────────────────
const vm2Get = (id) => document.getElementById(id);
const vm2Fmt = (sec) => {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  const ms = Math.floor((sec % 1) * 10);
  return `${m}:${s}.${ms}`;
};
const vm2Id = () => 'el_' + Math.random().toString(36).slice(2, 9);
const vm2Step = () => vm2.project?.steps[vm2.currentStepIdx] || null;
const vm2Video = () => vm2Get('vm2-video');

// ── Page Loader ─────────────────────────────────────────────────────────────
function loadVideoManual2Page() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  main.innerHTML = `
  <div id="vm2-root" class="flex flex-col bg-gray-100 dark:bg-gray-900" style="height:calc(100vh - 84px);">

    <!-- ═══ TOP BAR ═══ -->
    <div class="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <button onclick="vm2Undo()" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Undo">
        <i class="ri-arrow-go-back-line text-lg"></i>
      </button>
      <button onclick="vm2Redo()" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Redo">
        <i class="ri-arrow-go-forward-line text-lg"></i>
      </button>
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
      <button onclick="vm2ShowCanvasSize()" class="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center gap-1">
        <i class="ri-aspect-ratio-line"></i>Resize
      </button>
      <div class="flex-1"></div>
      <input id="vm2-title" type="text" value="Untitled Manual"
        class="text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none dark:text-white px-2 w-48 text-center"
        onchange="vm2.project.title=this.value">
      <div class="flex-1"></div>
      <select id="vm2-zoom-select" onchange="vm2SetCanvasZoom(this.value)" class="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300">
        <option value="0.5">50%</option>
        <option value="0.75">75%</option>
        <option value="1" selected>100%</option>
        <option value="1.5">150%</option>
        <option value="fit">Fit</option>
      </select>
      <button onclick="vm2OpenProject()" class="px-3 py-1.5 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 flex items-center gap-1">
        <i class="ri-folder-open-line"></i>Open
      </button>
      <button onclick="vm2SaveProject()" class="px-3 py-1.5 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 flex items-center gap-1">
        <i class="ri-save-line"></i>Save
      </button>
      <button onclick="vm2Export()" class="px-3 py-1.5 rounded text-xs bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1 font-medium">
        <i class="ri-download-line"></i>Export
      </button>
    </div>

    <!-- ═══ MAIN BODY (3 panels) ═══ -->
    <div class="flex flex-1 min-h-0 overflow-hidden">

      <!-- ── LEFT: Steps Panel ────────────────────────────── -->
      <div class="w-48 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span>Steps</span>
          <span id="vm2-step-count" class="text-gray-400 font-normal text-xs">0</span>
        </div>
        <div id="vm2-steps-list" class="flex-1 overflow-y-auto p-2 space-y-1"></div>
        <div class="p-2 border-t border-gray-100 dark:border-gray-700">
          <button onclick="vm2AddStep()" class="w-full py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 flex items-center justify-center gap-1">
            <i class="ri-add-line"></i>Add Step
          </button>
        </div>
      </div>

      <!-- ── CENTER: Canvas + Timeline ────────────────────── -->
      <div class="flex-1 flex flex-col min-w-0 bg-gray-200 dark:bg-gray-950">

        <!-- Upload Zone (shown when no video) -->
        <div id="vm2-upload-zone" class="flex-1 flex items-center justify-center">
          <div class="text-center p-10 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors"
               onclick="vm2Get('vm2-file-input').click()"
               ondragover="event.preventDefault(); this.classList.add('border-blue-400')"
               ondragleave="this.classList.remove('border-blue-400')"
               ondrop="vm2HandleDrop(event)">
            <i class="ri-video-upload-line text-5xl text-gray-400 mb-3 block"></i>
            <p class="text-gray-600 dark:text-gray-300 font-medium">Upload a Video</p>
            <p class="text-gray-400 text-sm mt-1">Click or drag & drop · MP4, MOV, WebM</p>
          </div>
          <input id="vm2-file-input" type="file" accept="video/*" class="hidden" onchange="vm2HandleFileSelect(event)">
        </div>

        <!-- Player Area (hidden until video loaded) -->
        <div id="vm2-player-area" class="hidden flex-1 flex flex-col min-h-0">
          
          <!-- Canvas Container -->
          <div id="vm2-canvas-outer" class="flex-1 flex items-center justify-center overflow-auto p-4 bg-gray-800 dark:bg-black">
            <div id="vm2-canvas-wrapper" class="relative bg-black shadow-2xl" style="transform-origin: center center;">
              <video id="vm2-video" class="block"
                ontimeupdate="vm2OnTimeUpdate()"
                onloadedmetadata="vm2OnVideoLoaded()"
                onended="vm2OnEnded()"></video>
              <!-- Elements overlay container -->
              <div id="vm2-elements-container" class="absolute inset-0 pointer-events-none" style="overflow: hidden;">
                <!-- Dynamic elements rendered here -->
              </div>
              <!-- Selection handles overlay -->
              <div id="vm2-selection-overlay" class="absolute inset-0 pointer-events-none"></div>
            </div>
          </div>

          <!-- ═══ TIMELINE SECTION ═══ -->
          <div class="bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 flex-shrink-0">
            
            <!-- Timeline Controls -->
            <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <button onclick="vm2TogglePlay()" id="vm2-play-btn" class="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center">
                <i class="ri-play-fill text-lg"></i>
              </button>
              <span id="vm2-time-display" class="text-xs font-mono text-gray-600 dark:text-gray-300 w-28">0:00.0 / 0:00.0</span>
              <div class="flex-1"></div>
              <button onclick="vm2CutAtPlayhead()" class="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded flex items-center gap-1" title="Split clip at playhead">
                <i class="ri-scissors-cut-line"></i>Split Clip
              </button>
              <div class="flex items-center gap-1 text-xs text-gray-500">
                <span>Timeline Scale</span>
                <button onclick="vm2ZoomTimeline(-20)" class="w-6 h-6 rounded hover:bg-gray-200 dark:hover:bg-gray-700">−</button>
                <button onclick="vm2ZoomTimeline(20)" class="w-6 h-6 rounded hover:bg-gray-200 dark:hover:bg-gray-700">+</button>
                <button onclick="vm2FitTimeline()" class="px-2 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700">Fit View</button>
              </div>
            </div>

            <!-- Timeline Tracks -->
            <div id="vm2-timeline-scroll" class="relative overflow-x-auto overflow-y-hidden" style="height: 180px;"
                 onmousemove="vm2OnTimelineMouseMove(event)"
                 onmouseleave="vm2OnTimelineMouseLeave()"
                 onclick="vm2OnTimelineClick(event)">
              
              <!-- Time Ruler -->
              <div id="vm2-time-ruler" class="sticky top-0 h-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-10"></div>
              
              <!-- Tracks Container -->
              <div id="vm2-tracks" class="relative" style="min-height: 150px;">
                <!-- Video Track -->
                <div id="vm2-video-track" class="absolute left-0 right-0 h-8 top-1" style="z-index: 1;">
                  <div id="vm2-step-segments" class="h-full"></div>
                </div>
                <!-- Element Tracks -->
                <div id="vm2-element-tracks" class="absolute left-0 right-0" style="top: 36px; z-index: 5;"></div>
              </div>

              <!-- Hover Indicator (gray) -->
              <div id="vm2-hover-indicator" class="absolute top-0 bottom-0 w-px bg-gray-400 pointer-events-none opacity-0 z-20"></div>
              
              <!-- Playhead (blue) -->
              <div id="vm2-playhead" class="absolute top-0 bottom-0 w-0.5 bg-blue-500 pointer-events-none z-30" style="left: 0;">
                <div class="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-sm rotate-45"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── RIGHT: Elements + Properties ─────────────────── -->
      <div class="w-56 flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        
        <!-- Tab Switcher -->
        <div class="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button id="vm2-tab-elements" onclick="vm2SwitchTab('elements')" class="flex-1 py-2 text-xs font-medium text-blue-500 border-b-2 border-blue-500">Elements</button>
          <button id="vm2-tab-properties" onclick="vm2SwitchTab('properties')" class="flex-1 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Properties</button>
        </div>

        <!-- Elements Panel -->
        <div id="vm2-panel-elements" class="flex-1 overflow-y-auto p-3">
          
          <!-- Text -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Text</p>
            <div class="grid grid-cols-2 gap-2">
              <button onclick="vm2AddElement('text', 'title')" class="py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs font-medium text-gray-700 dark:text-gray-200">Title</button>
              <button onclick="vm2AddElement('text', 'body')" class="py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300">Body Text</button>
            </div>
          </div>

          <!-- Shapes -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Shapes</p>
            <div class="grid grid-cols-4 gap-2">
              <button onclick="vm2AddElement('shape', 'rect')" class="aspect-square bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center justify-center" title="Rectangle">
                <div class="w-6 h-5 bg-gray-800 dark:bg-gray-200 rounded-sm"></div>
              </button>
              <button onclick="vm2AddElement('shape', 'circle')" class="aspect-square bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center justify-center" title="Circle">
                <div class="w-6 h-6 bg-gray-800 dark:bg-gray-200 rounded-full"></div>
              </button>
              <button onclick="vm2AddElement('shape', 'arrow')" class="aspect-square bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center justify-center" title="Arrow">
                <i class="ri-arrow-right-up-line text-lg text-gray-800 dark:text-gray-200"></i>
              </button>
              <button onclick="vm2AddElement('shape', 'line')" class="aspect-square bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center justify-center" title="Line">
                <div class="w-6 h-0.5 bg-gray-800 dark:bg-gray-200 rotate-45"></div>
              </button>
            </div>
          </div>

          <!-- Images -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Images</p>
            <button onclick="vm2Get('vm2-image-input').click()" class="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
              <i class="ri-image-add-line"></i>Upload Image
            </button>
            <input id="vm2-image-input" type="file" accept="image/*" class="hidden" onchange="vm2HandleImageUpload(event)">
          </div>

          <!-- Audio -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Audio</p>
            <button onclick="vm2Get('vm2-audio-input').click()" class="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
              <i class="ri-music-add-line"></i>Upload Audio
            </button>
            <input id="vm2-audio-input" type="file" accept="audio/*" class="hidden" onchange="vm2HandleAudioUpload(event)">
          </div>

          <!-- Step Elements List -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Current Step Elements</p>
            <div id="vm2-elements-list" class="space-y-1 text-xs"></div>
          </div>
        </div>

        <!-- Properties Panel -->
        <div id="vm2-panel-properties" class="hidden flex-1 overflow-y-auto p-3">
          <div id="vm2-props-content">
            <p class="text-xs text-gray-400 italic text-center py-8">Select an element to edit its properties</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ MODALS ═══ -->
  
  <!-- Canvas Size Modal -->
  <div id="vm2-modal-canvas" class="hidden fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-5 w-80 shadow-2xl">
      <h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <i class="ri-aspect-ratio-line text-blue-500"></i>Canvas Size
      </h3>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-500 block mb-1">Width</label>
            <input id="vm2-canvas-w" type="number" value="1920" class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
          </div>
          <div>
            <label class="text-xs text-gray-500 block mb-1">Height</label>
            <input id="vm2-canvas-h" type="number" value="1080" class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
          </div>
        </div>
        <div>
          <label class="text-xs text-gray-500 block mb-1">Presets</label>
          <select onchange="vm2ApplyPreset(this.value)" class="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
            <option value="">Custom</option>
            <option value="1920x1080">1080p (1920×1080)</option>
            <option value="1280x720">720p (1280×720)</option>
            <option value="1080x1920">Vertical (1080×1920)</option>
            <option value="1080x1080">Square (1080×1080)</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2 mt-4">
        <button onclick="vm2Get('vm2-modal-canvas').classList.add('hidden')" class="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-sm text-gray-600 dark:text-gray-300">Cancel</button>
        <button onclick="vm2ApplyCanvasSize()" class="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm">Apply</button>
      </div>
    </div>
  </div>

  <!-- Export Modal -->
  <div id="vm2-modal-export" class="hidden fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-5 w-96 shadow-2xl">
      <h3 class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <i class="ri-download-line text-blue-500"></i>Export Video
      </h3>
      <div id="vm2-export-progress" class="py-6 text-center">
        <div class="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p id="vm2-export-status" class="text-sm text-gray-600 dark:text-gray-300">Initializing FFmpeg...</p>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
          <div id="vm2-export-bar" class="bg-blue-500 h-2 rounded-full transition-all" style="width: 0%"></div>
        </div>
        <p id="vm2-export-detail" class="text-xs text-gray-400 mt-2"></p>
      </div>
      <div id="vm2-export-done" class="hidden py-4">
        <div class="flex items-center gap-2 text-green-500 mb-4 justify-center">
          <i class="ri-checkbox-circle-line text-2xl"></i>
          <span class="font-medium">Export Complete!</span>
        </div>
        <a id="vm2-export-download" href="#" download="video-manual.mp4" class="block w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded text-center text-sm font-medium">
          <i class="ri-download-line mr-1"></i>Download Video
        </a>
      </div>
      <div id="vm2-export-error" class="hidden py-4">
        <div class="flex items-center gap-2 text-red-500 mb-2">
          <i class="ri-error-warning-line text-xl"></i>
          <span class="font-medium">Export Failed</span>
        </div>
        <p id="vm2-export-error-msg" class="text-xs text-gray-500"></p>
      </div>
      <button onclick="vm2CloseExportModal()" class="w-full py-2 mt-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-sm text-gray-600 dark:text-gray-300">Close</button>
    </div>
  </div>

  <!-- Open Project Modal -->
  <div id="vm2-modal-open" class="hidden fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-5 w-[500px] max-h-[70vh] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 class="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <i class="ri-folder-open-line text-blue-500"></i>Open Project
        </h3>
        <button onclick="vm2Get('vm2-modal-open').classList.add('hidden')" class="text-gray-400 hover:text-gray-600">
          <i class="ri-close-line text-xl"></i>
        </button>
      </div>
      <input id="vm2-open-search" type="text" placeholder="Search projects..." class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white mb-3" oninput="vm2FilterProjects(this.value)">
      <div id="vm2-projects-list" class="flex-1 overflow-y-auto space-y-2"></div>
    </div>
  </div>

  <style>
    #vm2-root { font-family: system-ui, -apple-system, sans-serif; }
    .vm2-step-item { transition: all 0.15s; }
    .vm2-step-item.active { background: #eff6ff; border-color: #3b82f6; }
    .dark .vm2-step-item.active { background: #1e3a8a20; border-color: #60a5fa; }
    .vm2-element-handle {
      position: absolute;
      width: 10px;
      height: 10px;
      background: white;
      border: 2px solid #3b82f6;
      border-radius: 2px;
      pointer-events: auto;
      cursor: pointer;
    }
    .vm2-element-handle.nw { top: -5px; left: -5px; cursor: nwse-resize; }
    .vm2-element-handle.ne { top: -5px; right: -5px; cursor: nesw-resize; }
    .vm2-element-handle.sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
    .vm2-element-handle.se { bottom: -5px; right: -5px; cursor: nwse-resize; }
    .vm2-element-handle.n { top: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
    .vm2-element-handle.s { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
    .vm2-element-handle.w { left: -5px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }
    .vm2-element-handle.e { right: -5px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }
    .vm2-timeline-bar {
      position: absolute;
      height: 24px;
      border-radius: 4px;
      cursor: grab;
      display: flex;
      align-items: center;
      padding: 0 8px;
      font-size: 10px;
      color: white;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      user-select: none;
      transition: opacity 0.1s;
    }
    .vm2-timeline-bar:hover { opacity: 0.9; }
    .vm2-timeline-bar.selected { outline: 2px solid white; outline-offset: 1px; }
    .vm2-timeline-bar .resize-left,
    .vm2-timeline-bar .resize-right {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 8px;
      cursor: ew-resize;
    }
    .vm2-timeline-bar .resize-left { left: 0; }
    .vm2-timeline-bar .resize-right { right: 0; }
    #vm2-timeline-scroll::-webkit-scrollbar { height: 8px; }
    #vm2-timeline-scroll::-webkit-scrollbar-track { background: #1f2937; }
    #vm2-timeline-scroll::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
  </style>
  `;

  // Initialize project state
  vm2.project = {
    _id: null,
    title: 'Untitled Manual',
    videoUrl: null,
    videoBlob: null,
    duration: 0,
    width: 1920,
    height: 1080,
    steps: [],
    createdBy: (JSON.parse(localStorage.getItem('authUser') || '{}')).username || 'admin',
    createdAt: new Date().toISOString(),
  };

  vm2.currentStepIdx = 0;
  vm2.selectedElementId = null;
  vm2.playing = false;

  vm2RenderSteps();
}

// ═══════════════════════════════════════════════════════════════════════════
//  FILE HANDLING
// ═══════════════════════════════════════════════════════════════════════════

function vm2HandleFileSelect(event) {
  const file = event.target.files[0];
  if (file) vm2LoadVideo(file);
}

function vm2HandleDrop(event) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('video/')) vm2LoadVideo(file);
}

async function vm2LoadVideo(file) {
  const url = URL.createObjectURL(file);
  vm2.project.videoBlob = file;
  
  const video = vm2Video();
  video.src = url;
  video.load();

  vm2Get('vm2-upload-zone').classList.add('hidden');
  vm2Get('vm2-player-area').classList.remove('hidden');
}

function vm2OnVideoLoaded() {
  const video = vm2Video();
  vm2.duration = video.duration;
  vm2.project.duration = video.duration;
  vm2.project.width = video.videoWidth || 1920;
  vm2.project.height = video.videoHeight || 1080;

  // Create first step if none
  if (vm2.project.steps.length === 0) {
    vm2.project.steps = [{
      id: vm2Id().replace('el_', 'step_'),
      label: 'Step 1',
      description: '',
      startTime: 0,
      endTime: video.duration,
      elements: [],
    }];
  }

  vm2SyncCanvasSize();
  vm2RenderSteps();
  vm2RenderTimeline();
  vm2RenderElements();
}

function vm2OnTimeUpdate() {
  const video = vm2Video();
  if (!video) return;
  
  vm2.currentTime = video.currentTime;
  
  // Update time display
  const display = vm2Get('vm2-time-display');
  if (display) {
    display.textContent = vm2Fmt(vm2.currentTime) + ' / ' + vm2Fmt(vm2.duration);
  }

  // Update playhead position
  vm2UpdatePlayhead();

  // Check if we need to switch steps
  const stepIdx = vm2.project.steps.findIndex(s => 
    vm2.currentTime >= s.startTime && vm2.currentTime < s.endTime
  );
  if (stepIdx >= 0 && stepIdx !== vm2.currentStepIdx) {
    vm2.currentStepIdx = stepIdx;
    vm2RenderSteps();
    vm2RenderElements();
  }

  // Update visible elements
  vm2UpdateVisibleElements();
}

function vm2OnEnded() {
  vm2.playing = false;
  const btn = vm2Get('vm2-play-btn');
  if (btn) btn.innerHTML = '<i class="ri-play-fill text-lg"></i>';
}

// ═══════════════════════════════════════════════════════════════════════════
//  PLAYBACK
// ═══════════════════════════════════════════════════════════════════════════

function vm2TogglePlay() {
  const video = vm2Video();
  if (!video) return;

  if (video.paused) {
    video.play();
    vm2.playing = true;
    vm2Get('vm2-play-btn').innerHTML = '<i class="ri-pause-fill text-lg"></i>';
  } else {
    video.pause();
    vm2.playing = false;
    vm2Get('vm2-play-btn').innerHTML = '<i class="ri-play-fill text-lg"></i>';
  }
}

function vm2SeekTo(time) {
  const video = vm2Video();
  if (!video) return;
  video.currentTime = Math.max(0, Math.min(time, vm2.duration));
  vm2OnTimeUpdate();
}

// ═══════════════════════════════════════════════════════════════════════════
//  CANVAS / ZOOM
// ═══════════════════════════════════════════════════════════════════════════

function vm2SyncCanvasSize() {
  const video = vm2Video();
  const wrapper = vm2Get('vm2-canvas-wrapper');
  if (!video || !wrapper) return;

  wrapper.style.width = vm2.project.width + 'px';
  wrapper.style.height = vm2.project.height + 'px';
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.objectFit = 'contain';

  vm2ApplyCanvasZoomTransform();
}

function vm2SetCanvasZoom(value) {
  if (value === 'fit') {
    vm2FitCanvas();
  } else {
    vm2.canvasZoom = parseFloat(value);
    vm2ApplyCanvasZoomTransform();
  }
}

function vm2FitCanvas() {
  const outer = vm2Get('vm2-canvas-outer');
  if (!outer) return;
  
  const rect = outer.getBoundingClientRect();
  const padding = 40;
  const availW = rect.width - padding * 2;
  const availH = rect.height - padding * 2;
  
  const scaleW = availW / vm2.project.width;
  const scaleH = availH / vm2.project.height;
  vm2.canvasZoom = Math.min(scaleW, scaleH, 1);
  
  vm2ApplyCanvasZoomTransform();
  
  // Update dropdown
  const select = vm2Get('vm2-zoom-select');
  if (select) select.value = 'fit';
}

function vm2ApplyCanvasZoomTransform() {
  const wrapper = vm2Get('vm2-canvas-wrapper');
  if (!wrapper) return;
  wrapper.style.transform = `scale(${vm2.canvasZoom})`;
}

function vm2ShowCanvasSize() {
  vm2Get('vm2-canvas-w').value = vm2.project.width;
  vm2Get('vm2-canvas-h').value = vm2.project.height;
  vm2Get('vm2-modal-canvas').classList.remove('hidden');
}

function vm2ApplyPreset(preset) {
  if (!preset) return;
  const [w, h] = preset.split('x').map(Number);
  vm2Get('vm2-canvas-w').value = w;
  vm2Get('vm2-canvas-h').value = h;
}

function vm2ApplyCanvasSize() {
  vm2.project.width = parseInt(vm2Get('vm2-canvas-w').value) || 1920;
  vm2.project.height = parseInt(vm2Get('vm2-canvas-h').value) || 1080;
  vm2SyncCanvasSize();
  vm2Get('vm2-modal-canvas').classList.add('hidden');
}

// ═══════════════════════════════════════════════════════════════════════════
//  STEPS
// ═══════════════════════════════════════════════════════════════════════════

function vm2RenderSteps() {
  const list = vm2Get('vm2-steps-list');
  const count = vm2Get('vm2-step-count');
  if (!list || !vm2.project) return;

  count.textContent = vm2.project.steps.length;
  
  list.innerHTML = vm2.project.steps.map((step, i) => `
    <div class="vm2-step-item p-2 rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${i === vm2.currentStepIdx ? 'active' : ''}"
         onclick="vm2SelectStep(${i})"
         draggable="true"
         ondragstart="vm2StepDragStart(event, ${i})"
         ondragover="event.preventDefault()"
         ondrop="vm2StepDrop(event, ${i})">
      <div class="flex items-center gap-2">
        <span class="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-medium">${i + 1}</span>
        <input type="text" value="${step.label}" 
               class="flex-1 text-xs bg-transparent border-none focus:outline-none dark:text-white truncate"
               onclick="event.stopPropagation()"
               onchange="vm2.project.steps[${i}].label = this.value; vm2RenderTimeline()">
      </div>
      <div class="text-[10px] text-gray-400 mt-1 pl-7">${vm2Fmt(step.startTime)} – ${vm2Fmt(step.endTime)}</div>
      ${vm2.project.steps.length > 1 ? `
        <button onclick="event.stopPropagation(); vm2DeleteStep(${i})" class="absolute top-1 right-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
          <i class="ri-close-line text-sm"></i>
        </button>
      ` : ''}
    </div>
  `).join('');
}

function vm2SelectStep(idx) {
  vm2.currentStepIdx = idx;
  vm2.selectedElementId = null;
  
  const step = vm2.project.steps[idx];
  if (step) {
    vm2SeekTo(step.startTime);
  }
  
  vm2RenderSteps();
  vm2RenderElements();
  vm2RenderProps();
}

function vm2AddStep() {
  const lastStep = vm2.project.steps[vm2.project.steps.length - 1];
  if (!lastStep) return;
  
  // Add step at current playhead position, or at end if at end
  const t = vm2.currentTime;
  const currentStep = vm2Step();
  
  if (currentStep && t > currentStep.startTime + 0.5 && t < currentStep.endTime - 0.5) {
    // Split current step
    vm2CutAtPlayhead();
  } else {
    // Just create a marker at current position
    alert('Move playhead inside a step and use "Split Clip" to create a new step');
  }
}

function vm2CutAtPlayhead() {
  const t = vm2.currentTime;
  const step = vm2Step();
  if (!step) return;
  
  if (t <= step.startTime + 0.5 || t >= step.endTime - 0.5) {
    alert('Playhead must be at least 0.5s from step boundaries');
    return;
  }

  const newStep = {
    id: vm2Id().replace('el_', 'step_'),
    label: `Step ${vm2.project.steps.length + 1}`,
    description: '',
    startTime: t,
    endTime: step.endTime,
    elements: [],
  };

  step.endTime = t;
  vm2.project.steps.splice(vm2.currentStepIdx + 1, 0, newStep);

  // Renumber
  vm2.project.steps.forEach((s, i) => s.label = `Step ${i + 1}`);

  vm2RenderSteps();
  vm2RenderTimeline();
}

function vm2DeleteStep(idx) {
  if (vm2.project.steps.length <= 1) {
    alert('Cannot delete the only step');
    return;
  }
  if (!confirm(`Delete "${vm2.project.steps[idx].label}"?`)) return;

  // Expand adjacent step to fill the gap
  const deleted = vm2.project.steps[idx];
  if (idx > 0) {
    vm2.project.steps[idx - 1].endTime = deleted.endTime;
  } else if (vm2.project.steps.length > 1) {
    vm2.project.steps[1].startTime = deleted.startTime;
  }

  vm2.project.steps.splice(idx, 1);
  vm2.project.steps.forEach((s, i) => s.label = `Step ${i + 1}`);

  if (vm2.currentStepIdx >= vm2.project.steps.length) {
    vm2.currentStepIdx = vm2.project.steps.length - 1;
  }

  vm2RenderSteps();
  vm2RenderTimeline();
}

function vm2StepDragStart(event, idx) {
  event.dataTransfer.setData('text/plain', idx);
}

function vm2StepDrop(event, targetIdx) {
  event.preventDefault();
  const sourceIdx = parseInt(event.dataTransfer.getData('text/plain'));
  if (sourceIdx === targetIdx) return;

  const [moved] = vm2.project.steps.splice(sourceIdx, 1);
  vm2.project.steps.splice(targetIdx, 0, moved);
  
  // Re-calculate times based on new order
  let time = 0;
  vm2.project.steps.forEach((s, i) => {
    const duration = s.endTime - s.startTime;
    s.startTime = time;
    s.endTime = time + duration;
    s.label = `Step ${i + 1}`;
    time += duration;
  });

  if (vm2.currentStepIdx === sourceIdx) {
    vm2.currentStepIdx = targetIdx;
  }

  vm2RenderSteps();
  vm2RenderTimeline();
}

// ═══════════════════════════════════════════════════════════════════════════
//  ELEMENTS (Text, Shapes, Images, Audio)
// ═══════════════════════════════════════════════════════════════════════════

function vm2AddElement(type, subtype) {
  const step = vm2Step();
  if (!step) {
    alert('Load a video first');
    return;
  }

  const id = vm2Id();
  const centerX = vm2.project.width / 2;
  const centerY = vm2.project.height / 2;

  let element = {
    id,
    type,
    subtype,
    x: centerX - 100,
    y: centerY - 50,
    width: 200,
    height: 100,
    startTime: step.startTime,
    endTime: step.endTime,
    opacity: 100,
    rotation: 0,
    locked: false,
    color: '#3b82f6',
    backgroundColor: 'transparent',
  };

  // Type-specific defaults
  if (type === 'text') {
    element.text = subtype === 'title' ? 'Title Text' : 'Body text here';
    element.fontSize = subtype === 'title' ? 48 : 24;
    element.fontFamily = 'system-ui';
    element.fontWeight = subtype === 'title' ? 'bold' : 'normal';
    element.color = '#ffffff';
    element.textAlign = 'center';
    element.width = 400;
    element.height = subtype === 'title' ? 80 : 60;
    element.x = centerX - 200;
    element.y = centerY - (element.height / 2);
  } else if (type === 'shape') {
    element.strokeColor = '#ffffff';
    element.strokeWidth = 3;
    element.fill = subtype === 'rect' || subtype === 'circle';
    if (subtype === 'arrow' || subtype === 'line') {
      element.width = 150;
      element.height = 100;
      element.fill = false;
    }
    if (subtype === 'circle') {
      element.width = 100;
      element.height = 100;
    }
  }

  step.elements.push(element);
  vm2.selectedElementId = id;

  vm2RenderElements();
  vm2RenderTimeline();
  vm2RenderElementsList();
  vm2RenderProps();
  vm2SwitchTab('properties');
}

async function vm2HandleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const step = vm2Step();
  if (!step) {
    alert('Load a video first');
    return;
  }

  const url = URL.createObjectURL(file);
  
  // Get image dimensions
  const img = new Image();
  img.onload = () => {
    const maxW = vm2.project.width * 0.5;
    const maxH = vm2.project.height * 0.5;
    let w = img.width;
    let h = img.height;
    
    if (w > maxW) { h *= maxW / w; w = maxW; }
    if (h > maxH) { w *= maxH / h; h = maxH; }

    const element = {
      id: vm2Id(),
      type: 'image',
      imageUrl: url,
      imageBlob: file,
      x: (vm2.project.width - w) / 2,
      y: (vm2.project.height - h) / 2,
      width: w,
      height: h,
      startTime: step.startTime,
      endTime: step.endTime,
      opacity: 100,
      rotation: 0,
      locked: false,
    };

    step.elements.push(element);
    vm2.selectedElementId = element.id;

    vm2RenderElements();
    vm2RenderTimeline();
    vm2RenderElementsList();
    vm2RenderProps();
    vm2SwitchTab('properties');
  };
  img.src = url;

  event.target.value = '';
}

async function vm2HandleAudioUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const step = vm2Step();
  if (!step) {
    alert('Load a video first');
    return;
  }

  const url = URL.createObjectURL(file);

  const element = {
    id: vm2Id(),
    type: 'audio',
    audioUrl: url,
    audioBlob: file,
    name: file.name,
    startTime: step.startTime,
    endTime: step.endTime,
    volume: 100,
  };

  step.elements.push(element);
  vm2.selectedElementId = element.id;

  vm2RenderElements();
  vm2RenderTimeline();
  vm2RenderElementsList();
  vm2RenderProps();
  vm2SwitchTab('properties');

  event.target.value = '';
}

function vm2RenderElements() {
  const container = vm2Get('vm2-elements-container');
  if (!container) return;

  container.innerHTML = '';
  
  const step = vm2Step();
  if (!step) return;

  step.elements.forEach(el => {
    if (el.type === 'audio') return; // Audio has no visual

    const div = document.createElement('div');
    div.id = 'vm2-el-' + el.id;
    div.className = 'vm2-element absolute pointer-events-auto cursor-move';
    div.style.cssText = `
      left: ${el.x}px;
      top: ${el.y}px;
      width: ${el.width}px;
      height: ${el.height}px;
      opacity: ${el.opacity / 100};
      transform: rotate(${el.rotation || 0}deg);
    `;

    // Render based on type
    if (el.type === 'text') {
      div.innerHTML = `
        <div style="
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: ${el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center'};
          font-size: ${el.fontSize}px;
          font-family: ${el.fontFamily};
          font-weight: ${el.fontWeight};
          color: ${el.color};
          background: ${el.backgroundColor || 'transparent'};
          text-align: ${el.textAlign};
          padding: 8px;
          box-sizing: border-box;
          overflow: hidden;
        ">${el.text}</div>
      `;
    } else if (el.type === 'shape') {
      if (el.subtype === 'rect') {
        div.innerHTML = `<div style="width:100%;height:100%;background:${el.fill ? el.strokeColor : 'transparent'};border:${el.strokeWidth}px solid ${el.strokeColor};border-radius:4px;box-sizing:border-box;"></div>`;
      } else if (el.subtype === 'circle') {
        div.innerHTML = `<div style="width:100%;height:100%;background:${el.fill ? el.strokeColor : 'transparent'};border:${el.strokeWidth}px solid ${el.strokeColor};border-radius:50%;box-sizing:border-box;"></div>`;
      } else if (el.subtype === 'arrow' || el.subtype === 'line') {
        div.innerHTML = `
          <svg width="100%" height="100%" viewBox="0 0 ${el.width} ${el.height}" style="overflow:visible;">
            <defs>
              <marker id="arrowhead-${el.id}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="${el.strokeColor}" />
              </marker>
            </defs>
            <line x1="0" y1="${el.height}" x2="${el.width}" y2="0" 
                  stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}"
                  ${el.subtype === 'arrow' ? `marker-end="url(#arrowhead-${el.id})"` : ''} />
          </svg>
        `;
      }
    } else if (el.type === 'image') {
      div.innerHTML = `<img src="${el.imageUrl}" style="width:100%;height:100%;object-fit:contain;">`;
    }

    // Click to select
    div.addEventListener('mousedown', (e) => {
      if (el.locked) return;
      e.stopPropagation();
      vm2.selectedElementId = el.id;
      vm2.isDraggingElement = true;
      vm2.dragOffset = {
        x: e.clientX - el.x * vm2.canvasZoom,
        y: e.clientY - el.y * vm2.canvasZoom,
      };
      vm2RenderElements();
      vm2RenderProps();
      vm2SwitchTab('properties');
    });

    container.appendChild(div);
  });

  vm2RenderSelectionHandles();
}

function vm2RenderSelectionHandles() {
  const overlay = vm2Get('vm2-selection-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';

  if (!vm2.selectedElementId) return;

  const step = vm2Step();
  if (!step) return;

  const el = step.elements.find(e => e.id === vm2.selectedElementId);
  if (!el || el.type === 'audio') return;

  const box = document.createElement('div');
  box.className = 'absolute border-2 border-blue-500 pointer-events-none';
  box.style.cssText = `
    left: ${el.x}px;
    top: ${el.y}px;
    width: ${el.width}px;
    height: ${el.height}px;
    transform: rotate(${el.rotation || 0}deg);
  `;

  // Resize handles
  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  handles.forEach(h => {
    const handle = document.createElement('div');
    handle.className = `vm2-element-handle ${h}`;
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      vm2.isResizingElement = true;
      vm2.resizeHandle = h;
      vm2.dragOffset = { x: e.clientX, y: e.clientY, el: { ...el } };
    });
    box.appendChild(handle);
  });

  overlay.appendChild(box);
}

function vm2UpdateVisibleElements() {
  const step = vm2Step();
  if (!step) return;

  step.elements.forEach(el => {
    const div = vm2Get('vm2-el-' + el.id);
    if (!div) return;

    const visible = vm2.currentTime >= el.startTime && vm2.currentTime < el.endTime;
    div.style.display = visible ? 'block' : 'none';
  });
}

function vm2RenderElementsList() {
  const list = vm2Get('vm2-elements-list');
  if (!list) return;

  const step = vm2Step();
  if (!step || step.elements.length === 0) {
    list.innerHTML = '<p class="text-gray-400 italic text-center py-2">No elements</p>';
    return;
  }

  list.innerHTML = step.elements.map(el => `
    <div class="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${vm2.selectedElementId === el.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}"
         onclick="vm2SelectElement('${el.id}')">
      <i class="${vm2GetElementIcon(el)} text-gray-500"></i>
      <span class="flex-1 truncate text-gray-700 dark:text-gray-300">${vm2GetElementName(el)}</span>
      <button onclick="event.stopPropagation(); vm2DeleteElement('${el.id}')" class="text-gray-400 hover:text-red-500">
        <i class="ri-delete-bin-line"></i>
      </button>
    </div>
  `).join('');
}

function vm2GetElementIcon(el) {
  if (el.type === 'text') return 'ri-text';
  if (el.type === 'image') return 'ri-image-line';
  if (el.type === 'audio') return 'ri-music-line';
  if (el.type === 'shape') {
    if (el.subtype === 'rect') return 'ri-rectangle-line';
    if (el.subtype === 'circle') return 'ri-circle-line';
    if (el.subtype === 'arrow') return 'ri-arrow-right-up-line';
    return 'ri-subtract-line';
  }
  return 'ri-shapes-line';
}

function vm2GetElementName(el) {
  if (el.type === 'text') return el.text.slice(0, 20) || 'Text';
  if (el.type === 'image') return 'Image';
  if (el.type === 'audio') return el.name || 'Audio';
  if (el.type === 'shape') return el.subtype.charAt(0).toUpperCase() + el.subtype.slice(1);
  return 'Element';
}

function vm2SelectElement(id) {
  vm2.selectedElementId = id;
  vm2RenderElements();
  vm2RenderElementsList();
  vm2RenderProps();
  vm2SwitchTab('properties');
}

function vm2DeleteElement(id) {
  const step = vm2Step();
  if (!step) return;

  const idx = step.elements.findIndex(e => e.id === id);
  if (idx >= 0) {
    step.elements.splice(idx, 1);
    if (vm2.selectedElementId === id) vm2.selectedElementId = null;
    vm2RenderElements();
    vm2RenderTimeline();
    vm2RenderElementsList();
    vm2RenderProps();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROPERTIES PANEL
// ═══════════════════════════════════════════════════════════════════════════

function vm2SwitchTab(tab) {
  const elementsTab = vm2Get('vm2-tab-elements');
  const propsTab = vm2Get('vm2-tab-properties');
  const elementsPanel = vm2Get('vm2-panel-elements');
  const propsPanel = vm2Get('vm2-panel-properties');

  if (tab === 'elements') {
    elementsTab.className = 'flex-1 py-2 text-xs font-medium text-blue-500 border-b-2 border-blue-500';
    propsTab.className = 'flex-1 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300';
    elementsPanel.classList.remove('hidden');
    propsPanel.classList.add('hidden');
  } else {
    propsTab.className = 'flex-1 py-2 text-xs font-medium text-blue-500 border-b-2 border-blue-500';
    elementsTab.className = 'flex-1 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300';
    propsPanel.classList.remove('hidden');
    elementsPanel.classList.add('hidden');
  }

  vm2RenderElementsList();
}

function vm2RenderProps() {
  const container = vm2Get('vm2-props-content');
  if (!container) return;

  if (!vm2.selectedElementId) {
    container.innerHTML = '<p class="text-xs text-gray-400 italic text-center py-8">Select an element to edit its properties</p>';
    return;
  }

  const step = vm2Step();
  if (!step) return;

  const el = step.elements.find(e => e.id === vm2.selectedElementId);
  if (!el) return;

  let html = `
    <!-- Layer / General -->
    <div class="mb-4">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
        <i class="ri-stack-line"></i>Layer
      </p>
      <div class="flex gap-1 mb-2">
        <button onclick="vm2AlignElement('left')" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs" title="Align Left">
          <i class="ri-align-left"></i>
        </button>
        <button onclick="vm2AlignElement('center-h')" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs" title="Center Horizontally">
          <i class="ri-align-center"></i>
        </button>
        <button onclick="vm2AlignElement('right')" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs" title="Align Right">
          <i class="ri-align-right"></i>
        </button>
      </div>
      <div class="flex gap-1 mb-2">
        <button onclick="vm2AlignElement('top')" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs" title="Align Top">
          <i class="ri-align-top"></i>
        </button>
        <button onclick="vm2AlignElement('center-v')" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs" title="Center Vertically">
          <i class="ri-align-vertically"></i>
        </button>
        <button onclick="vm2AlignElement('bottom')" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs" title="Align Bottom">
          <i class="ri-align-bottom"></i>
        </button>
      </div>
    </div>

    <!-- Transform -->
    <div class="mb-4">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
        <i class="ri-drag-move-line"></i>Transform
      </p>
      <div class="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label class="text-[10px] text-gray-400">X</label>
          <input type="number" value="${Math.round(el.x)}" onchange="vm2UpdateProp('x', +this.value)"
            class="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
        </div>
        <div>
          <label class="text-[10px] text-gray-400">Y</label>
          <input type="number" value="${Math.round(el.y)}" onchange="vm2UpdateProp('y', +this.value)"
            class="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
        </div>
        <div>
          <label class="text-[10px] text-gray-400">Width</label>
          <input type="number" value="${Math.round(el.width)}" onchange="vm2UpdateProp('width', +this.value)"
            class="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
        </div>
        <div>
          <label class="text-[10px] text-gray-400">Height</label>
          <input type="number" value="${Math.round(el.height)}" onchange="vm2UpdateProp('height', +this.value)"
            class="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
        </div>
      </div>
      <div>
        <label class="text-[10px] text-gray-400">Rotation</label>
        <input type="number" value="${el.rotation || 0}" onchange="vm2UpdateProp('rotation', +this.value)"
          class="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
      </div>
    </div>

    <!-- Opacity -->
    <div class="mb-4">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
        <i class="ri-contrast-2-line"></i>Opacity
      </p>
      <div class="flex items-center gap-2">
        <input type="range" min="0" max="100" value="${el.opacity}" oninput="vm2UpdateProp('opacity', +this.value)"
          class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer">
        <span class="text-xs text-gray-500 w-8 text-right">${el.opacity}%</span>
      </div>
    </div>

    <!-- Timing -->
    <div class="mb-4">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
        <i class="ri-time-line"></i>Timing
      </p>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-[10px] text-gray-400">Start</label>
          <input type="number" step="0.1" value="${el.startTime.toFixed(1)}" onchange="vm2UpdateProp('startTime', +this.value)"
            class="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
        </div>
        <div>
          <label class="text-[10px] text-gray-400">End</label>
          <input type="number" step="0.1" value="${el.endTime.toFixed(1)}" onchange="vm2UpdateProp('endTime', +this.value)"
            class="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
        </div>
      </div>
    </div>
  `;

  // Type-specific properties
  if (el.type === 'text') {
    html += `
      <!-- Text Properties -->
      <div class="mb-4">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
          <i class="ri-text"></i>Text
        </p>
        <textarea onchange="vm2UpdateProp('text', this.value)" rows="2"
          class="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white resize-none mb-2">${el.text}</textarea>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label class="text-[10px] text-gray-400">Font Size</label>
            <input type="number" value="${el.fontSize}" onchange="vm2UpdateProp('fontSize', +this.value)"
              class="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
          </div>
          <div>
            <label class="text-[10px] text-gray-400">Weight</label>
            <select onchange="vm2UpdateProp('fontWeight', this.value)"
              class="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
              <option value="normal" ${el.fontWeight === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="bold" ${el.fontWeight === 'bold' ? 'selected' : ''}>Bold</option>
            </select>
          </div>
        </div>
        <div class="mb-2">
          <label class="text-[10px] text-gray-400">Text Color</label>
          <input type="color" value="${el.color}" onchange="vm2UpdateProp('color', this.value)"
            class="w-full h-8 border border-gray-200 dark:border-gray-600 rounded cursor-pointer">
        </div>
        <div class="mb-2">
          <label class="text-[10px] text-gray-400">Background</label>
          <input type="color" value="${el.backgroundColor === 'transparent' ? '#000000' : el.backgroundColor}" onchange="vm2UpdateProp('backgroundColor', this.value)"
            class="w-full h-8 border border-gray-200 dark:border-gray-600 rounded cursor-pointer">
        </div>
        <div class="flex gap-1">
          <button onclick="vm2UpdateProp('textAlign', 'left')" class="flex-1 py-1.5 ${el.textAlign === 'left' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'} hover:bg-gray-200 rounded text-xs">
            <i class="ri-align-left"></i>
          </button>
          <button onclick="vm2UpdateProp('textAlign', 'center')" class="flex-1 py-1.5 ${el.textAlign === 'center' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'} hover:bg-gray-200 rounded text-xs">
            <i class="ri-align-center"></i>
          </button>
          <button onclick="vm2UpdateProp('textAlign', 'right')" class="flex-1 py-1.5 ${el.textAlign === 'right' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'} hover:bg-gray-200 rounded text-xs">
            <i class="ri-align-right"></i>
          </button>
        </div>
      </div>
    `;
  } else if (el.type === 'shape') {
    html += `
      <!-- Shape Properties -->
      <div class="mb-4">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
          <i class="ri-shapes-line"></i>Shape
        </p>
        <div class="mb-2">
          <label class="text-[10px] text-gray-400">Stroke Color</label>
          <input type="color" value="${el.strokeColor}" onchange="vm2UpdateProp('strokeColor', this.value)"
            class="w-full h-8 border border-gray-200 dark:border-gray-600 rounded cursor-pointer">
        </div>
        <div class="mb-2">
          <label class="text-[10px] text-gray-400">Stroke Width</label>
          <input type="number" value="${el.strokeWidth}" min="1" max="20" onchange="vm2UpdateProp('strokeWidth', +this.value)"
            class="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
        </div>
        ${el.subtype === 'rect' || el.subtype === 'circle' ? `
          <div class="flex items-center gap-2">
            <input type="checkbox" id="vm2-fill" ${el.fill ? 'checked' : ''} onchange="vm2UpdateProp('fill', this.checked)">
            <label for="vm2-fill" class="text-xs text-gray-600 dark:text-gray-300">Fill shape</label>
          </div>
        ` : ''}
      </div>
    `;
  } else if (el.type === 'audio') {
    html += `
      <!-- Audio Properties -->
      <div class="mb-4">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
          <i class="ri-volume-up-line"></i>Audio
        </p>
        <div>
          <label class="text-[10px] text-gray-400">Volume</label>
          <div class="flex items-center gap-2">
            <input type="range" min="0" max="100" value="${el.volume || 100}" oninput="vm2UpdateProp('volume', +this.value)"
              class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer">
            <span class="text-xs text-gray-500 w-8 text-right">${el.volume || 100}%</span>
          </div>
        </div>
      </div>
    `;
  }

  // Delete button
  html += `
    <button onclick="vm2DeleteElement('${el.id}')" class="w-full py-2 mt-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs flex items-center justify-center gap-1">
      <i class="ri-delete-bin-line"></i>Delete Element
    </button>
  `;

  container.innerHTML = html;
}

function vm2UpdateProp(prop, value) {
  const step = vm2Step();
  if (!step) return;

  const el = step.elements.find(e => e.id === vm2.selectedElementId);
  if (!el) return;

  el[prop] = value;

  vm2RenderElements();
  vm2RenderTimeline();
  if (prop !== 'opacity') vm2RenderProps();
}

function vm2AlignElement(alignment) {
  const step = vm2Step();
  if (!step) return;

  const el = step.elements.find(e => e.id === vm2.selectedElementId);
  if (!el) return;

  switch (alignment) {
    case 'left': el.x = 0; break;
    case 'center-h': el.x = (vm2.project.width - el.width) / 2; break;
    case 'right': el.x = vm2.project.width - el.width; break;
    case 'top': el.y = 0; break;
    case 'center-v': el.y = (vm2.project.height - el.height) / 2; break;
    case 'bottom': el.y = vm2.project.height - el.height; break;
  }

  vm2RenderElements();
  vm2RenderProps();
}

// ═══════════════════════════════════════════════════════════════════════════
//  TIMELINE
// ═══════════════════════════════════════════════════════════════════════════

function vm2RenderTimeline() {
  if (!vm2.project || vm2.duration <= 0) return;

  const timelineWidth = Math.max(vm2.duration * vm2.timelineZoom, 800);

  // Time ruler
  const ruler = vm2Get('vm2-time-ruler');
  if (ruler) {
    ruler.style.width = timelineWidth + 'px';
    let rulerHtml = '';
    const step = vm2.timelineZoom >= 80 ? 1 : vm2.timelineZoom >= 40 ? 2 : 5;
    for (let t = 0; t <= vm2.duration; t += step) {
      const x = t * vm2.timelineZoom;
      rulerHtml += `
        <div class="absolute text-[10px] text-gray-500" style="left: ${x}px; top: 4px;">${vm2Fmt(t)}</div>
        <div class="absolute w-px h-2 bg-gray-300 dark:bg-gray-600" style="left: ${x}px; bottom: 0;"></div>
      `;
    }
    ruler.innerHTML = rulerHtml;
  }

  // Step segments (video track)
  const segs = vm2Get('vm2-step-segments');
  if (segs) {
    segs.style.width = timelineWidth + 'px';
    segs.innerHTML = vm2.project.steps.map((step, i) => {
      const left = step.startTime * vm2.timelineZoom;
      const width = (step.endTime - step.startTime) * vm2.timelineZoom;
      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#6366f1'];
      const color = colors[i % colors.length];
      return `
        <div class="absolute h-full rounded cursor-pointer flex items-center px-2 text-xs text-white font-medium overflow-hidden"
             style="left: ${left}px; width: ${width}px; background: ${color};"
             onclick="vm2SelectStep(${i})"
             title="${step.label}">
          ${step.label}
        </div>
      `;
    }).join('');
  }

  // Element tracks
  const tracks = vm2Get('vm2-element-tracks');
  if (tracks) {
    tracks.style.width = timelineWidth + 'px';
    
    // Gather all elements from all steps
    const allElements = [];
    vm2.project.steps.forEach((step, stepIdx) => {
      step.elements.forEach(el => {
        allElements.push({ ...el, stepIdx });
      });
    });

    // Sort by start time and layout into rows
    allElements.sort((a, b) => a.startTime - b.startTime);
    
    const rowHeight = 28;
    const rowGap = 4;
    const rows = [];
    
    allElements.forEach(el => {
      let placed = false;
      for (let r = 0; r < rows.length; r++) {
        const lastEnd = rows[r];
        if (el.startTime >= lastEnd) {
          rows[r] = el.endTime;
          el.row = r;
          placed = true;
          break;
        }
      }
      if (!placed) {
        el.row = rows.length;
        rows.push(el.endTime);
      }
    });

    tracks.style.height = (rows.length * (rowHeight + rowGap) + 10) + 'px';

    const typeColors = {
      text: '#f59e0b',
      shape: '#10b981',
      image: '#6366f1',
      audio: '#ec4899',
    };

    tracks.innerHTML = allElements.map(el => {
      const left = el.startTime * vm2.timelineZoom;
      const width = Math.max((el.endTime - el.startTime) * vm2.timelineZoom, 20);
      const top = el.row * (rowHeight + rowGap);
      const color = typeColors[el.type] || '#6b7280';
      const selected = vm2.selectedElementId === el.id;
      const icon = vm2GetElementIcon(el);
      
      return `
        <div class="vm2-timeline-bar ${selected ? 'selected' : ''}"
             style="left: ${left}px; width: ${width}px; top: ${top}px; background: ${color};"
             data-id="${el.id}"
             onmousedown="vm2TimelineBarMouseDown(event, '${el.id}')">
          <div class="resize-left" onmousedown="vm2TimelineResizeStart(event, '${el.id}', 'left')"></div>
          <i class="${icon} mr-1"></i>
          <span class="truncate">${vm2GetElementName(el)}</span>
          <div class="resize-right" onmousedown="vm2TimelineResizeStart(event, '${el.id}', 'right')"></div>
        </div>
      `;
    }).join('');
  }

  vm2UpdatePlayhead();
}

function vm2UpdatePlayhead() {
  const playhead = vm2Get('vm2-playhead');
  if (!playhead || vm2.duration <= 0) return;
  
  const x = vm2.currentTime * vm2.timelineZoom;
  playhead.style.left = x + 'px';
}

function vm2OnTimelineMouseMove(event) {
  const scroll = vm2Get('vm2-timeline-scroll');
  const hover = vm2Get('vm2-hover-indicator');
  if (!scroll || !hover || vm2.duration <= 0) return;

  const rect = scroll.getBoundingClientRect();
  const x = event.clientX - rect.left + scroll.scrollLeft;
  const time = x / vm2.timelineZoom;
  
  if (time >= 0 && time <= vm2.duration) {
    hover.style.left = x + 'px';
    hover.style.opacity = '1';
    vm2.hoverTime = time;
  }
}

function vm2OnTimelineMouseLeave() {
  const hover = vm2Get('vm2-hover-indicator');
  if (hover) hover.style.opacity = '0';
  vm2.hoverTime = null;
}

function vm2OnTimelineClick(event) {
  // Don't seek if clicking on a bar
  if (event.target.closest('.vm2-timeline-bar')) return;
  
  const scroll = vm2Get('vm2-timeline-scroll');
  if (!scroll || vm2.duration <= 0) return;

  const rect = scroll.getBoundingClientRect();
  const x = event.clientX - rect.left + scroll.scrollLeft;
  const time = Math.max(0, Math.min(x / vm2.timelineZoom, vm2.duration));
  
  vm2SeekTo(time);
}

function vm2ZoomTimeline(delta) {
  vm2.timelineZoom = Math.max(20, Math.min(200, vm2.timelineZoom + delta));
  vm2RenderTimeline();
}

function vm2FitTimeline() {
  const scroll = vm2Get('vm2-timeline-scroll');
  if (!scroll || vm2.duration <= 0) return;
  
  const availWidth = scroll.clientWidth - 20;
  vm2.timelineZoom = availWidth / vm2.duration;
  vm2RenderTimeline();
}

// Timeline bar interactions
function vm2TimelineBarMouseDown(event, id) {
  if (event.target.classList.contains('resize-left') || event.target.classList.contains('resize-right')) return;
  
  event.stopPropagation();
  vm2.selectedElementId = id;
  vm2.isDraggingTimelineBar = true;
  
  const el = vm2FindElement(id);
  if (el) {
    vm2.timelineDragData = {
      id,
      startX: event.clientX,
      originalStart: el.startTime,
      originalEnd: el.endTime,
    };
  }

  vm2RenderElements();
  vm2RenderTimeline();
  vm2RenderElementsList();
  vm2RenderProps();
  vm2SwitchTab('properties');
}

function vm2TimelineResizeStart(event, id, side) {
  event.stopPropagation();
  vm2.selectedElementId = id;
  vm2.isDraggingTimelineBar = true;
  
  const el = vm2FindElement(id);
  if (el) {
    vm2.timelineDragData = {
      id,
      side,
      startX: event.clientX,
      originalStart: el.startTime,
      originalEnd: el.endTime,
    };
  }

  vm2RenderElements();
  vm2RenderTimeline();
  vm2RenderProps();
}

function vm2FindElement(id) {
  for (const step of vm2.project.steps) {
    const el = step.elements.find(e => e.id === id);
    if (el) return el;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  GLOBAL MOUSE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('mousemove', (event) => {
  // Element dragging on canvas
  if (vm2.isDraggingElement && vm2.selectedElementId) {
    const step = vm2Step();
    if (!step) return;
    
    const el = step.elements.find(e => e.id === vm2.selectedElementId);
    if (!el) return;

    el.x = (event.clientX - vm2.dragOffset.x) / vm2.canvasZoom;
    el.y = (event.clientY - vm2.dragOffset.y) / vm2.canvasZoom;

    vm2RenderElements();
  }

  // Element resizing on canvas
  if (vm2.isResizingElement && vm2.selectedElementId && vm2.resizeHandle) {
    const step = vm2Step();
    if (!step) return;
    
    const el = step.elements.find(e => e.id === vm2.selectedElementId);
    if (!el) return;

    const dx = (event.clientX - vm2.dragOffset.x) / vm2.canvasZoom;
    const dy = (event.clientY - vm2.dragOffset.y) / vm2.canvasZoom;
    const orig = vm2.dragOffset.el;

    const h = vm2.resizeHandle;
    if (h.includes('e')) { el.width = Math.max(20, orig.width + dx); }
    if (h.includes('w')) { el.x = orig.x + dx; el.width = Math.max(20, orig.width - dx); }
    if (h.includes('s')) { el.height = Math.max(20, orig.height + dy); }
    if (h.includes('n')) { el.y = orig.y + dy; el.height = Math.max(20, orig.height - dy); }

    vm2RenderElements();
  }

  // Timeline bar dragging
  if (vm2.isDraggingTimelineBar && vm2.timelineDragData) {
    const el = vm2FindElement(vm2.timelineDragData.id);
    if (!el) return;

    const dx = event.clientX - vm2.timelineDragData.startX;
    const dt = dx / vm2.timelineZoom;

    if (vm2.timelineDragData.side === 'left') {
      el.startTime = Math.max(0, Math.min(vm2.timelineDragData.originalStart + dt, el.endTime - 0.1));
    } else if (vm2.timelineDragData.side === 'right') {
      el.endTime = Math.min(vm2.duration, Math.max(vm2.timelineDragData.originalEnd + dt, el.startTime + 0.1));
    } else {
      // Move both
      const duration = vm2.timelineDragData.originalEnd - vm2.timelineDragData.originalStart;
      let newStart = vm2.timelineDragData.originalStart + dt;
      newStart = Math.max(0, Math.min(newStart, vm2.duration - duration));
      el.startTime = newStart;
      el.endTime = newStart + duration;
    }

    vm2RenderTimeline();
  }
});

document.addEventListener('mouseup', () => {
  if (vm2.isDraggingElement || vm2.isResizingElement) {
    vm2.isDraggingElement = false;
    vm2.isResizingElement = false;
    vm2.resizeHandle = null;
    vm2RenderProps();
  }

  if (vm2.isDraggingTimelineBar) {
    vm2.isDraggingTimelineBar = false;
    vm2.timelineDragData = null;
    vm2RenderProps();
  }
});

// Click outside to deselect
document.addEventListener('click', (event) => {
  if (!vm2.project) return;
  
  const canvas = vm2Get('vm2-canvas-wrapper');
  const propsPanel = vm2Get('vm2-panel-properties');
  
  if (canvas && !canvas.contains(event.target) && 
      propsPanel && !propsPanel.contains(event.target) &&
      !event.target.closest('.vm2-timeline-bar') &&
      !event.target.closest('#vm2-elements-list')) {
    // vm2.selectedElementId = null;
    // vm2RenderElements();
    // vm2RenderTimeline();
    // vm2RenderProps();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SAVE / LOAD
// ═══════════════════════════════════════════════════════════════════════════

async function vm2SaveProject() {
  if (!vm2.project) return;

  // Prepare data (strip blob URLs)
  const saveData = {
    ...vm2.project,
    videoUrl: vm2.project.videoUrl || null,
    videoBlob: null,
    updatedAt: new Date().toISOString(),
  };

  // Strip blob URLs from elements
  saveData.steps = saveData.steps.map(step => ({
    ...step,
    elements: step.elements.map(el => {
      const cleaned = { ...el };
      if (cleaned.imageBlob) delete cleaned.imageBlob;
      if (cleaned.audioBlob) delete cleaned.audioBlob;
      return cleaned;
    }),
  }));

  try {
    const method = vm2.project._id ? 'PUT' : 'POST';
    const url = vm2.project._id 
      ? `${BASE_URL}api/db/${VM2_DB}/${VM2_COLLECTION}/${vm2.project._id}`
      : `${BASE_URL}api/db/${VM2_DB}/${VM2_COLLECTION}`;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saveData),
    });

    if (!res.ok) throw new Error('Save failed');

    const result = await res.json();
    if (result.insertedId) vm2.project._id = result.insertedId;

    alert('Project saved!');
  } catch (err) {
    console.error('[VM2] Save error:', err);
    alert('Failed to save project: ' + err.message);
  }
}

async function vm2OpenProject() {
  vm2Get('vm2-modal-open').classList.remove('hidden');
  await vm2LoadProjectsList();
}

async function vm2LoadProjectsList() {
  const list = vm2Get('vm2-projects-list');
  if (!list) return;

  list.innerHTML = '<p class="text-center text-gray-400 py-4">Loading...</p>';

  try {
    const res = await fetch(`${BASE_URL}api/db/${VM2_DB}/${VM2_COLLECTION}`);
    const projects = await res.json();

    if (!projects.length) {
      list.innerHTML = '<p class="text-center text-gray-400 py-4">No saved projects</p>';
      return;
    }

    vm2._projectsList = projects;
    vm2RenderProjectsList(projects);
  } catch (err) {
    list.innerHTML = '<p class="text-center text-red-400 py-4">Failed to load projects</p>';
  }
}

function vm2RenderProjectsList(projects) {
  const list = vm2Get('vm2-projects-list');
  if (!list) return;

  list.innerHTML = projects.map(p => `
    <div class="p-3 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
         onclick="vm2LoadProject('${p._id}')">
      <div class="font-medium text-gray-800 dark:text-white text-sm">${p.title || 'Untitled'}</div>
      <div class="text-xs text-gray-400 mt-1">${p.steps?.length || 0} steps · ${new Date(p.updatedAt || p.createdAt).toLocaleDateString()}</div>
    </div>
  `).join('');
}

function vm2FilterProjects(query) {
  if (!vm2._projectsList) return;
  const filtered = vm2._projectsList.filter(p => 
    p.title?.toLowerCase().includes(query.toLowerCase())
  );
  vm2RenderProjectsList(filtered);
}

async function vm2LoadProject(id) {
  try {
    const res = await fetch(`${BASE_URL}api/db/${VM2_DB}/${VM2_COLLECTION}/${id}`);
    const project = await res.json();

    vm2.project = project;
    vm2.currentStepIdx = 0;
    vm2.selectedElementId = null;
    vm2.duration = project.duration || 0;

    vm2Get('vm2-modal-open').classList.add('hidden');
    vm2Get('vm2-title').value = project.title || 'Untitled';

    // If video URL exists, load it
    if (project.videoUrl) {
      const video = vm2Video();
      video.src = project.videoUrl;
      video.load();
      vm2Get('vm2-upload-zone').classList.add('hidden');
      vm2Get('vm2-player-area').classList.remove('hidden');
    }

    vm2RenderSteps();
    vm2RenderTimeline();
    vm2RenderElements();

  } catch (err) {
    console.error('[VM2] Load error:', err);
    alert('Failed to load project');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORT (FFmpeg.wasm)
// ═══════════════════════════════════════════════════════════════════════════

async function vm2Export() {
  if (!vm2.project || !vm2.project.videoBlob) {
    alert('Please load a video first');
    return;
  }

  vm2Get('vm2-modal-export').classList.remove('hidden');
  vm2Get('vm2-export-progress').classList.remove('hidden');
  vm2Get('vm2-export-done').classList.add('hidden');
  vm2Get('vm2-export-error').classList.add('hidden');
  vm2Get('vm2-export-bar').style.width = '0%';
  vm2Get('vm2-export-status').textContent = 'Loading FFmpeg...';

  try {
    // Load FFmpeg if not loaded
    if (!vm2.ffmpegLoaded) {
      vm2Get('vm2-export-status').textContent = 'Loading FFmpeg (first time may take a moment)...';
      
      // Dynamic import FFmpeg
      const { FFmpeg } = await import('https://esm.sh/@ffmpeg/ffmpeg@0.12.10');
      const { fetchFile, toBlobURL } = await import('https://esm.sh/@ffmpeg/util@0.12.1');
      
      vm2.ffmpeg = new FFmpeg();
      
      // Load with CORS-friendly URLs
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await vm2.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      vm2.ffmpegLoaded = true;
      vm2._fetchFile = fetchFile;
    }

    vm2Get('vm2-export-status').textContent = 'Processing video...';
    vm2Get('vm2-export-bar').style.width = '10%';

    const ffmpeg = vm2.ffmpeg;
    const fetchFile = vm2._fetchFile;

    // Write input video
    await ffmpeg.writeFile('input.mp4', await fetchFile(vm2.project.videoBlob));
    vm2Get('vm2-export-bar').style.width = '30%';

    // Build filter complex for overlays
    // For simplicity, we'll create a basic version that handles text overlays
    // A full implementation would handle all element types
    
    let filterComplex = '';
    let filterCount = 0;
    let lastOutput = '0:v';
    
    // Collect all elements and create FFmpeg filters
    vm2.project.steps.forEach(step => {
      step.elements.forEach(el => {
        if (el.type === 'text') {
          // FFmpeg drawtext filter
          const text = el.text.replace(/'/g, "\\'").replace(/:/g, "\\:");
          const filter = `drawtext=text='${text}':fontsize=${el.fontSize}:fontcolor=${el.color}:x=${Math.round(el.x)}:y=${Math.round(el.y)}:enable='between(t,${el.startTime},${el.endTime})'`;
          
          if (filterComplex) filterComplex += ',';
          filterComplex += filter;
          filterCount++;
        }
        // Note: Shapes and images would need more complex handling
        // For a complete implementation, consider drawing to canvas and overlaying
      });
    });

    vm2Get('vm2-export-status').textContent = 'Encoding video...';
    vm2Get('vm2-export-bar').style.width = '50%';

    // Run FFmpeg
    let args = ['-i', 'input.mp4'];
    
    if (filterComplex) {
      args.push('-vf', filterComplex);
    }
    
    args.push('-c:a', 'copy', '-y', 'output.mp4');

    // Set up progress handler
    ffmpeg.on('progress', ({ progress }) => {
      const pct = 50 + progress * 45;
      vm2Get('vm2-export-bar').style.width = pct + '%';
      vm2Get('vm2-export-detail').textContent = Math.round(progress * 100) + '% encoded';
    });

    await ffmpeg.exec(args);

    vm2Get('vm2-export-bar').style.width = '95%';
    vm2Get('vm2-export-status').textContent = 'Finalizing...';

    // Read output
    const data = await ffmpeg.readFile('output.mp4');
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);

    vm2Get('vm2-export-bar').style.width = '100%';
    vm2Get('vm2-export-progress').classList.add('hidden');
    vm2Get('vm2-export-done').classList.remove('hidden');
    vm2Get('vm2-export-download').href = url;
    vm2Get('vm2-export-download').download = (vm2.project.title || 'video-manual') + '.mp4';

    // Cleanup
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('output.mp4');

  } catch (err) {
    console.error('[VM2] Export error:', err);
    vm2Get('vm2-export-progress').classList.add('hidden');
    vm2Get('vm2-export-error').classList.remove('hidden');
    vm2Get('vm2-export-error-msg').textContent = err.message;
  }
}

function vm2CloseExportModal() {
  vm2Get('vm2-modal-export').classList.add('hidden');
}

// ═══════════════════════════════════════════════════════════════════════════
//  UNDO / REDO (placeholder)
// ═══════════════════════════════════════════════════════════════════════════

function vm2Undo() {
  // TODO: Implement undo stack
  console.log('[VM2] Undo - not implemented yet');
}

function vm2Redo() {
  // TODO: Implement redo stack
  console.log('[VM2] Redo - not implemented yet');
}

// ═══════════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════════

// Auto-load if navigating to video manual page
if (typeof window !== 'undefined') {
  window.loadVideoManual2Page = loadVideoManual2Page;
}
