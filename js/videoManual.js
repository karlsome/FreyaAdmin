// ═══════════════════════════════════════════════════════════════
//  VIDEO MANUAL CREATOR  –  powered by Creatomate Render API
// ═══════════════════════════════════════════════════════════════

const CREATOMATE_API_KEY  = '4f11b47d461448cebe1d6a6dd41d54bd1ba6b10e55a9115740d8bc099222f2c244e5ddd6114b8423b267e85f43fe340e';
const CREATOMATE_BASE     = 'https://api.creatomate.com/v1';
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
          <!-- video + canvas -->
          <div id="vm-video-outer" class="flex-1 flex items-center justify-center bg-black overflow-hidden">
            <div id="vm-video-wrapper" class="relative" style="display:inline-block; line-height:0;">
              <video id="vm-video" class="block"
                style="max-width:100%; max-height:calc(100vh - 250px);"
                ontimeupdate="vmOnTimeUpdate()"
                onloadedmetadata="vmOnVideoLoaded()"
                onended="vmOnVideoEnded()"></video>
              <canvas id="vm-canvas" class="absolute top-0 left-0" style="cursor:crosshair;"></canvas>
            </div>
          </div>

          <!-- Timeline + controls -->
          <div class="bg-gray-800 px-3 pt-2 pb-2 flex-shrink-0">
            <!-- Step-coloured progress bar -->
            <div id="vm-timeline"
              class="relative h-5 mb-2 rounded overflow-hidden cursor-pointer select-none"
              onclick="vmSeekTo(event)"
              title="Click to seek">
              <div id="vm-step-segs" class="absolute inset-0 flex"></div>
              <div id="vm-playhead" class="absolute top-0 h-full w-0.5 bg-white pointer-events-none shadow-md" style="left:0%"></div>
            </div>
            <!-- Control row -->
            <div class="flex items-center gap-2">
              <button onclick="vmTogglePlay()" id="vm-play-btn"
                class="text-white hover:text-blue-300 transition-colors w-5 text-center flex-shrink-0">
                <i class="ri-play-line text-lg"></i>
              </button>
              <span id="vm-time" class="text-gray-400 text-xs font-mono w-24 flex-shrink-0">0:00 / 0:00</span>
              <span id="vm-step-label" class="text-gray-500 text-xs truncate flex-1 text-center"></span>
              <button onclick="vmCutHere()"
                class="flex items-center gap-1 px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded font-semibold flex-shrink-0"
                title="Split video at current playback position — creates a new step">
                <i class="ri-scissors-cut-line"></i>Cut Here
              </button>
              <button onclick="vmDeleteCurrentStep()"
                class="p-1 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                title="Delete current step">
                <i class="ri-delete-bin-line text-sm"></i>
              </button>
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
    <div onclick="vmSelectStep(${i})"
      class="vm-step-item flex flex-col p-2 rounded-lg border cursor-pointer transition-colors
        ${i === vmCurrentStepIdx
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30'
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'}">
      <div class="flex items-center gap-1.5 mb-1">
        <div class="w-2.5 h-2.5 rounded-sm flex-shrink-0" style="background:${stepColors[i % stepColors.length]}"></div>
        <span class="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate flex-1">${s.label}</span>
        <span class="text-xs text-gray-400">${vmFmt(s.trimEnd - s.trimStart)}</span>
      </div>
      <div class="text-xs text-gray-400">${vmFmt(s.trimStart)} → ${vmFmt(s.trimEnd)}</div>
      ${s.overlays.length > 0
        ? `<div class="flex gap-0.5 mt-1 flex-wrap">${s.overlays.map(ov =>
            `<span class="text-xs px-1 rounded" style="background:${ov.color}22; color:${ov.color}; border:1px solid ${ov.color}44">
              ${ov.type === 'text' ? 'T' : ov.type === 'circle' ? '◯' : ov.type === 'rect' ? '▭' : '→'}
            </span>`).join('')}</div>`
        : ''}
    </div>
  `).join('');
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
    vmStep().overlays.push({
      id: vmId(), type: 'text',
      x: vmPxToRel(mx, canvas.width),
      y: vmPxToRel(my, canvas.height),
      text: txt,
      color: vmCurrentColor,
      fontSize: vmPxToRel(vmCurrentFontSize, canvas.height),  // store as % of canvas height
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

  if (vmActiveTool === 'rect') {
    vmStep().overlays.push({
      id: vmId(), type: 'rect',
      x: vmPxToRel(Math.min(x1,x2), canvas.width),
      y: vmPxToRel(Math.min(y1,y2), canvas.height),
      w: vmPxToRel(Math.abs(x2-x1), canvas.width),
      h: vmPxToRel(Math.abs(y2-y1), canvas.height),
      color: vmCurrentColor,
      strokeWidth: sw,
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

  // Draw committed overlays
  step.overlays.forEach(ov => {
    vmDrawOverlay(ctx, ov, cw, ch, ov.id === vmSelectedOvId);
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

  let html = `<div class="space-y-2">
    <p class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">${ov.type}</p>`;

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
  vmRedraw();
};

// ── OVERLAYS LIST (right bottom panel) ───────────────────────────────────────
function vmRenderOvList() {
  const list = vmGet('vm-ov-list');
  if (!list || !vmStep()) { if (list) list.innerHTML = ''; return; }
  const ovs = vmStep().overlays;
  if (ovs.length === 0) {
    list.innerHTML = '<p class="text-xs text-gray-400 italic py-1">No overlays yet.</p>';
    return;
  }
  list.innerHTML = ovs.map(ov => `
    <div onclick="vmSelectOvFromList('${ov.id}')"
      class="flex items-center gap-1.5 py-0.5 px-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${ov.id === vmSelectedOvId ? 'bg-blue-50 dark:bg-blue-900/30' : ''}">
      <div class="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-gray-300" style="background:${ov.color}"></div>
      <span class="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">
        ${ov.type === 'text' ? `"${(ov.text||'').slice(0,14)}${ov.text?.length > 14 ? '…' : ''}"` : ov.type}
      </span>
      <button onclick="event.stopPropagation();vmDeleteOverlay('${ov.id}')" class="text-gray-400 hover:text-red-400 text-xs"><i class="ri-close-line"></i></button>
    </div>
  `).join('');
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
    const submitRes = await fetch(`${CREATOMATE_BASE}/renders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CREATOMATE_API_KEY}`,
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

    const res = await fetch(`${CREATOMATE_BASE}/renders/${renderId}`, {
      headers: { 'Authorization': `Bearer ${CREATOMATE_API_KEY}` },
    });
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

  vmProject.steps.forEach((step) => {
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
      // Base properties shared by all overlay types
      const el = {
        track:    ovTrack++,
        time:     cumulativeTime,      // same output start as its video clip
        duration: stepDuration,
        x_anchor: '0%',
        y_anchor: '0%',
      };

      if (ov.type === 'text') {
        el.type        = 'text';
        el.text        = ov.text || '';
        el.x           = ov.x + '%';
        el.y           = ov.y + '%';
        el.width       = '80%';
        el.height      = '20%';
        el.fill_color  = ov.color || '#ffffff';
        el.font_weight = 700;
        el.font_size   = (ov.fontSize || 5) + ' vmin';
        el.shadow_color = '#000000';
        el.shadow_blur  = '3 vmin';
        el.shadow_x     = '2 vmin';
        el.shadow_y     = '2 vmin';
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
        el.stroke_width = (ov.strokeWidth || 3) + ' vmin';
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
        el.stroke_width = (ov.strokeWidth || 3) + ' vmin';
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
