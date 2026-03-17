// ═══════════════════════════════════════════════════════════════════════════
//  VIDEO MANUAL CREATOR v2  –  FFmpeg.wasm powered (free, client-side export)
// ═══════════════════════════════════════════════════════════════════════════

// Database config
const VM2_DB         = 'Sasaki_Coating_MasterDB';
const VM2_COLLECTION = 'videoManuals';
const VM2_AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;
const VM2_HISTORY_LIMIT = 150;

// ── Module State ────────────────────────────────────────────────────────────
let vm2 = {
  screen: 'browser',
  playlist: null,
  playlists: [],
  playlistProjects: [],
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
  isRotatingElement: false,
  resizeHandle: null,
  dragOffset: { x: 0, y: 0 },
  rotationData: null,
  isDraggingTimelineBar: false,
  timelineDragData: null,
  isResizingStep: false,
  stepResizeData: null,
  isScrubbing: false,
  ffmpeg: null,
  ffmpegLoaded: false,
  previewRaf: null,
  videoRect: null,
  showDebugVideoRect: false,
  drawMode: null,
  drawShapeData: null,
  dirty: false,
  autosaveTimer: null,
  isAutosaving: false,
  lastSavedAt: null,
  uploadXhr: null,
  uploadInProgress: false,
  mediaInsertMode: null,
  pendingMediaSwitch: null,
  loadingProject: false,
  activeVideoEl: null,
  activeMediaKey: '',
  mediaCache: null,
  mediaPreloadQueue: [],
  mediaPreloading: false,
  revisionPreview: null,
  undoStack: [],
  redoStack: [],
  historyBaseSignature: '',
  suppressHistory: false,
  pendingHistoryRestore: null,
  playlistModelOptions: null,
  playlistModelLoading: false,
  playlistCreating: false,
  playlistUpdating: false,
  projectCreating: false,
  projectUpdating: false,
  playlistSearchQuery: '',
  assetLibraryItems: [],
  assetDeleteInFlightId: null,
  _projectsList: [],
  _editorMounted: false,
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
const vm2PrimaryVideoEl = () => vm2Get('vm2-video');
const vm2Video = () => vm2.activeVideoEl || vm2PrimaryVideoEl();
const vm2PreviewCanvas = () => vm2Get('vm2-preview-canvas');
const vm2CanvasViewport = () => vm2Get('vm2-canvas-viewport');
const vm2DegToRad = (deg) => deg * Math.PI / 180;
const vm2RadToDeg = (rad) => rad * 180 / Math.PI;
const vm2BaseUrl = () => (typeof BASE_URL !== 'undefined' ? BASE_URL : 'http://localhost:3000/');
const vm2NowIso = () => new Date().toISOString();
const vm2DeepClone = (value) => JSON.parse(JSON.stringify(value));
const vm2IsBlobUrl = (value) => typeof value === 'string' && value.startsWith('blob:');
const vm2AuthUser = () => JSON.parse(localStorage.getItem('authUser') || '{}');
const vm2EscapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function vm2FormatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return '';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(size >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function vm2ProjectUsesAsset(assetId) {
  if (!vm2.project || !assetId) return false;
  const normalizedId = String(assetId);
  if (String(vm2.project.currentAssetId || '') === normalizedId) return true;
  if ((vm2.project.assets || []).some((asset) => String(asset?.assetId || asset?._id || '') === normalizedId)) return true;
  return (vm2.project.steps || []).some((step) => String(step?.assetId || '') === normalizedId);
}

function vm2AssetUsageLabel(asset) {
  const usageCount = Math.max(0, Number(asset?.usageCount) || 0);
  if (!usageCount) return 'Unused';
  return usageCount === 1 ? 'Used by 1 project' : `Used by ${usageCount} projects`;
}

function vm2RenderAssetPickerList() {
  const list = vm2Get('vm2-assets-list');
  if (!list) return;

  const assets = Array.isArray(vm2.assetLibraryItems) ? vm2.assetLibraryItems : [];
  if (!assets.length) {
    list.innerHTML = '<p class="col-span-2 text-sm text-gray-400 text-center py-8">No shared videos in this playlist yet. Upload a video to add it to the library.</p>';
    return;
  }

  list.innerHTML = assets.map((asset) => {
    const assetId = String(asset.assetId || asset._id || '');
    const safeAssetId = encodeURIComponent(assetId);
    const safeUrl = encodeURIComponent(asset.downloadUrl || asset.url || '');
    const safeName = vm2EscapeHtml(asset.name || asset.fileName || 'Untitled');
    const safeNameArg = encodeURIComponent(asset.name || asset.fileName || 'Untitled');
    const uploadedAt = asset.uploadedAt ? new Date(asset.uploadedAt).toLocaleDateString() : '';
    const sizeLabel = vm2FormatFileSize(asset.size);
    const usageLabel = vm2AssetUsageLabel(asset);
    const unused = Number(asset.usageCount || 0) === 0;
    const busyDelete = vm2.assetDeleteInFlightId === assetId;
    const deleteDisabled = !unused || vm2ProjectUsesAsset(assetId) || busyDelete;
    const deleteLabel = vm2ProjectUsesAsset(assetId)
      ? 'Linked in current editor'
      : busyDelete
        ? 'Deleting…'
        : 'Delete Unused';
    const usageBadgeClass = unused
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';

    return `
      <div class="rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-colors dark:border-gray-600 dark:bg-gray-800 ${unused ? 'hover:border-amber-300 dark:hover:border-amber-500' : 'hover:border-violet-400 dark:hover:border-violet-500'}">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gray-200 dark:bg-gray-700">
            <i class="ri-film-line text-gray-500"></i>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-gray-800 dark:text-white">${safeName}</p>
                <p class="mt-0.5 text-xs text-gray-400">${[uploadedAt, sizeLabel].filter(Boolean).join(' • ') || 'Shared library asset'}</p>
              </div>
              <span class="inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${usageBadgeClass}">${usageLabel}</span>
            </div>
            <div class="mt-3 flex items-center gap-2">
              <button
                class="rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-600"
                onclick="vm2SelectPlaylistAsset('${safeAssetId}', decodeURIComponent('${safeUrl}'), decodeURIComponent('${safeNameArg}'))">
                Use Video
              </button>
              <button
                class="rounded-lg border px-3 py-1.5 text-xs font-medium transition ${deleteDisabled ? 'cursor-not-allowed border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500' : 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20'}"
                onclick="vm2DeleteUnusedAsset('${safeAssetId}', decodeURIComponent('${safeNameArg}'))"
                ${deleteDisabled ? 'disabled' : ''}>
                ${deleteLabel}
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function vm2EncodeBase64Unicode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function vm2AuthHeaders(extraHeaders = {}) {
  const authUser = vm2AuthUser();
  const hasIdentity = authUser && (authUser.username || authUser.role);
  return {
    ...(hasIdentity ? {
      Authorization: `Bearer ${vm2EncodeBase64Unicode(JSON.stringify({
        username: authUser.username || 'unknown',
        role: authUser.role || 'viewer',
      }))}`,
    } : {}),
    ...extraHeaders,
  };
}

function vm2CreateEmptyProject(overrides = {}) {
  const authUser = vm2AuthUser();
  return {
    _id: null,
    playlistId: null,
    title: 'Untitled1',
    folder: 'root',
    videoUrl: null,
    videoLocalUrl: null,
    videoBlob: null,
    currentAssetId: null,
    assets: [],
    duration: 0,
    width: 1920,
    height: 1080,
    steps: [],
    currentRevisionNumber: 0,
    lastRevisionId: null,
    deployedRevisionId: null,
    deployedRevisionNumber: null,
    deployedRevisionName: null,
    deployedAt: null,
    deployedBy: null,
    deployedVideoUrl: null,
    deployedVideoStoragePath: null,
    deployedVideoMimeType: null,
    deployedVideoFileName: null,
    createdBy: authUser.username || 'admin',
    createdAt: vm2NowIso(),
    ...overrides,
  };
}

function vm2CanDeployProject() {
  const role = vm2AuthUser().role || 'viewer';
  return ['admin', '班長', '課長', '部長', '係長'].includes(role);
}

function vm2ProjectDeploymentLabel(project) {
  if (!project?.deployedRevisionId) return t('vmDeployedLabel') + ': —';
  const revisionLabel = project.deployedRevisionNumber
    ? `${t('vmRevLabel')} ${project.deployedRevisionNumber}`
    : (project.deployedRevisionName || t('vmDeployedLabel'));
  return `${t('vmDeployedLabel')} · ${revisionLabel}`;
}

function vm2SyncPlaylistProjectEntry(projectId, updates = {}) {
  const index = vm2.playlistProjects.findIndex((item) => String(item._id) === String(projectId));
  if (index < 0) return;
  vm2.playlistProjects[index] = {
    ...vm2.playlistProjects[index],
    ...updates,
  };
}

function vm2ResolveMediaUrl(url) {
  if (!url || vm2IsBlobUrl(url) || url.startsWith('data:')) return url;

  try {
    const parsed = new URL(url, window.location.href);
    const needsProxy = parsed.hostname === 'firebasestorage.googleapis.com' || parsed.hostname === 'storage.googleapis.com';
    if (!needsProxy) return parsed.toString();
    return `${vm2BaseUrl()}api/video-manual-media?url=${encodeURIComponent(parsed.toString())}`;
  } catch (_) {
    return url;
  }
}

function vm2GetProjectAssetById(assetId, project = vm2.project) {
  if (!assetId || !Array.isArray(project?.assets)) return null;
  return project.assets.find((item) => String(item.assetId || item._id) === String(assetId)) || null;
}

function vm2GetStepAssetId(step, project = vm2.project) {
  return step?.assetId || project?.currentAssetId || null;
}

function vm2GetStepVideoUrl(step, project = vm2.project) {
  const asset = vm2GetProjectAssetById(vm2GetStepAssetId(step, project), project);
  return asset?.downloadUrl || asset?.url || step?.videoUrl || project?.videoUrl || null;
}

function vm2GetStepSourceKey(step, project = vm2.project) {
  const assetId = vm2GetStepAssetId(step, project);
  if (assetId) return `asset:${assetId}`;
  const url = vm2GetStepVideoUrl(step, project);
  return url ? `url:${url}` : '';
}

function vm2FindStepIndexAtTime(timelineTime, project = vm2.project) {
  const steps = project?.steps || [];
  if (!steps.length) return -1;

  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    const isLast = index === steps.length - 1;
    if (timelineTime < step.startTime) continue;
    if (timelineTime < step.endTime || (isLast && timelineTime <= step.endTime)) {
      return index;
    }
  }

  if (timelineTime <= steps[0].startTime) return 0;
  return steps.length - 1;
}

function vm2GetSequenceDuration(project = vm2.project) {
  if (!project) return 0;
  if (Array.isArray(project.steps) && project.steps.length) {
    return project.steps.reduce((maxEnd, step) => Math.max(maxEnd, step?.endTime || 0), 0);
  }
  return project.duration || 0;
}

function vm2SyncSequenceDuration(project = vm2.project) {
  const duration = vm2GetSequenceDuration(project);
  if (project) project.duration = duration;
  vm2.duration = duration;
  return duration;
}

const VM2_TIMELINE_MIN_ZOOM = 2;
const VM2_TIMELINE_MAX_ZOOM = 200;
const VM2_TIMELINE_ADD_CLIP_WIDTH = 150;
const VM2_TIMELINE_MAX_LANES = 6;

function vm2GetTimelineContentWidth(duration = vm2.duration) {
  const sequencePixelWidth = duration * vm2.timelineZoom;
  return Math.max(800, sequencePixelWidth + VM2_TIMELINE_ADD_CLIP_WIDTH + 12);
}

function vm2GetTimelineMajorStep() {
  const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
  const minLabelPx = 70;
  return steps.find((step) => step * vm2.timelineZoom >= minLabelPx) || steps[steps.length - 1];
}

function vm2GetTimelineMinorStep(majorStep) {
  const candidates = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
  const majorIndex = candidates.indexOf(majorStep);
  if (majorIndex <= 0) return null;

  for (let index = majorIndex - 1; index >= 0; index--) {
    const candidate = candidates[index];
    if (majorStep % candidate === 0 && candidate * vm2.timelineZoom >= 18) {
      return candidate;
    }
  }
  return null;
}

function vm2SetLoadingIndicator(visible, text) {
  if (text === undefined) text = t('vmLoadingVideo');
  const overlay = vm2Get('vm2-loading-overlay');
  const label = vm2Get('vm2-loading-text');
  if (label) label.textContent = text;
  if (overlay) overlay.classList.toggle('hidden', !visible);
}

function vm2GetMediaCacheHost() {
  return vm2Get('vm2-media-cache');
}

function vm2EnsureMediaCacheStore() {
  if (!(vm2.mediaCache instanceof Map)) vm2.mediaCache = new Map();
  return vm2.mediaCache;
}

function vm2ClearManagedMedia(preservePrimary = true) {
  const primaryVideo = vm2PrimaryVideoEl();
  const cache = vm2EnsureMediaCacheStore();
  cache.forEach((entry) => {
    const video = entry.video;
    if (!video) return;
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (video !== primaryVideo) video.remove();
  });
  cache.clear();
  vm2.activeVideoEl = primaryVideo || null;
  vm2.activeMediaKey = '';
  vm2.mediaPreloadQueue = [];
  vm2.mediaPreloading = false;
  vm2.pendingMediaSwitch = null;
  if (!preservePrimary && primaryVideo) {
    primaryVideo.pause();
    primaryVideo.removeAttribute('src');
    primaryVideo.load();
  }
}

function vm2AttachManagedVideo(video) {
  if (!video || video.dataset.vm2Bound === '1') return;
  video.dataset.vm2Bound = '1';
  video.playsInline = true;
  video.preload = 'auto';

  video.addEventListener('timeupdate', () => {
    if (video !== vm2Video()) return;
    vm2OnTimeUpdate();
  });
  video.addEventListener('loadedmetadata', () => {
    const entry = vm2EnsureMediaCacheStore().get(video.dataset.sourceKey || '');
    if (entry) entry.metadataReady = true;
    if (video !== vm2Video()) return;
    vm2OnVideoLoaded();
  });
  video.addEventListener('loadeddata', () => {
    const entry = vm2EnsureMediaCacheStore().get(video.dataset.sourceKey || '');
    if (entry) entry.status = 'ready';
    if (video !== vm2Video()) return;
    vm2OnVideoReady();
  });
  video.addEventListener('error', () => {
    const entry = vm2EnsureMediaCacheStore().get(video.dataset.sourceKey || '');
    if (entry) entry.status = 'error';
    if (video !== vm2Video()) return;
    vm2OnVideoError();
  });
  video.addEventListener('ended', () => {
    if (video !== vm2Video()) return;
    vm2OnEnded();
  });
}

function vm2CreateManagedVideoElement() {
  const video = document.createElement('video');
  video.className = 'absolute pointer-events-none opacity-0';
  video.style.left = '0';
  video.style.top = '0';
  vm2AttachManagedVideo(video);
  vm2GetMediaCacheHost()?.appendChild(video);
  return video;
}

function vm2InitManagedMedia() {
  const primaryVideo = vm2PrimaryVideoEl();
  if (!primaryVideo) return;
  vm2AttachManagedVideo(primaryVideo);
  vm2.activeVideoEl = primaryVideo;
  vm2EnsureMediaCacheStore();
}

function vm2EnsureMediaEntry(url, { local = false, sourceKey = '', usePrimary = false } = {}) {
  if (!url) return null;
  const key = sourceKey || `url:${url}`;
  const cache = vm2EnsureMediaCacheStore();
  const existing = cache.get(key);
  if (existing) return existing;

  const video = usePrimary ? vm2PrimaryVideoEl() : vm2CreateManagedVideoElement();
  if (!video) return null;
  vm2AttachManagedVideo(video);
  video.crossOrigin = local ? '' : 'anonymous';
  video.dataset.sourceKey = key;

  const entry = {
    key,
    url,
    local,
    video,
    status: 'idle',
    metadataReady: false,
    readyPromise: null,
  };
  cache.set(key, entry);
  return entry;
}

function vm2LoadMediaEntry(entry, { showLoader = false, loadingText = null } = {}) {
  if (loadingText === null) loadingText = t('vmLoadingVideo');
  if (!entry) return Promise.reject(new Error('Missing media entry'));
  if (entry.status === 'ready') return Promise.resolve(entry);
  if (entry.readyPromise) {
    if (showLoader) vm2SetLoadingIndicator(true, loadingText);
    return entry.readyPromise;
  }

  if (showLoader) vm2SetLoadingIndicator(true, loadingText);
  entry.status = 'loading';
  entry.readyPromise = new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      entry.status = 'ready';
      entry.readyPromise = null;
      resolve(entry);
    };
    const onError = () => {
      cleanup();
      entry.status = 'error';
      entry.readyPromise = null;
      reject(new Error('Failed to load media source'));
    };
    const cleanup = () => {
      entry.video.removeEventListener('loadeddata', onReady);
      entry.video.removeEventListener('error', onError);
    };
    entry.video.addEventListener('loadeddata', onReady);
    entry.video.addEventListener('error', onError);
  });

  entry.video.pause();
  entry.video.crossOrigin = entry.local ? '' : 'anonymous';
  entry.video.dataset.sourceKey = entry.key;
  entry.video.src = entry.local ? entry.url : vm2ResolveMediaUrl(entry.url);
  entry.video.load();
  return entry.readyPromise;
}

function vm2SetActiveMediaEntry(entry) {
  if (!entry?.video) return;
  const previous = vm2.activeVideoEl;
  if (previous && previous !== entry.video) previous.pause();
  vm2.activeVideoEl = entry.video;
  vm2.activeMediaKey = entry.key;
  vm2.videoRect = null;
  if (entry.video.videoWidth && entry.video.videoHeight) {
    vm2SyncCanvasSize();
  }
}

function vm2GetUniqueProjectSources(project = vm2.project) {
  const sources = [];
  const seen = new Set();
  (project?.steps || []).forEach((step, index) => {
    const url = vm2GetStepVideoUrl(step, project);
    const key = vm2GetStepSourceKey(step, project);
    if (!url || !key || seen.has(key)) return;
    seen.add(key);
    sources.push({ key, url, local: vm2IsBlobUrl(url), usePrimary: index === 0 });
  });
  if (!sources.length) {
    const fallbackUrl = vm2PrimaryVideoUrl(project);
    if (fallbackUrl) {
      sources.push({
        key: vm2GetStepSourceKey(project?.steps?.[0], project) || `url:${fallbackUrl}`,
        url: fallbackUrl,
        local: vm2IsBlobUrl(fallbackUrl),
        usePrimary: true,
      });
    }
  }
  return sources;
}

function vm2QueueProjectMediaPreloads(project = vm2.project, excludeKey = vm2.activeMediaKey) {
  const cache = vm2EnsureMediaCacheStore();
  const queuedKeys = new Set(vm2.mediaPreloadQueue.map((item) => item.key));
  vm2GetUniqueProjectSources(project).forEach((source) => {
    if (!source?.key || source.key === excludeKey || queuedKeys.has(source.key)) return;
    const existing = cache.get(source.key);
    if (existing?.status === 'ready' || existing?.status === 'loading') return;
    vm2.mediaPreloadQueue.push(source);
    queuedKeys.add(source.key);
  });
}

function vm2PrimeProjectMedia(project = vm2.project, { showLoader = false, loadingText = null } = {}) {
  if (loadingText === null) loadingText = t('vmLoadingVideo');
  vm2ClearManagedMedia(true);
  const sources = vm2GetUniqueProjectSources(project);
  if (!sources.length) return;

  const [first, ...rest] = sources;
  const firstEntry = vm2EnsureMediaEntry(first.url, first);
  if (firstEntry) {
    vm2SetActiveMediaEntry(firstEntry);
    void vm2LoadMediaEntry(firstEntry, { showLoader, loadingText }).catch((err) => {
      console.error('[VM2] Primary media load error:', err);
    });
  }

  vm2.mediaPreloadQueue = [];
  rest.forEach((source) => vm2.mediaPreloadQueue.push(source));
  void vm2PreloadProjectMedia();
}

async function vm2PreloadProjectMedia() {
  if (vm2.mediaPreloading) return;
  vm2.mediaPreloading = true;
  try {
    while (vm2.mediaPreloadQueue.length) {
      const next = vm2.mediaPreloadQueue.shift();
      const entry = vm2EnsureMediaEntry(next.url, next);
      if (!entry || entry.status === 'ready') continue;
      try {
        await vm2LoadMediaEntry(entry);
      } catch (err) {
        console.warn('[VM2] Background preload failed:', err);
      }
    }
  } finally {
    vm2.mediaPreloading = false;
  }
}

function vm2PrimaryVideoUrl(project = vm2.project) {
  if (!project) return null;
  const firstStepUrl = vm2GetStepVideoUrl(project.steps?.[0], project);
  if (firstStepUrl) return firstStepUrl;
  if (project.videoLocalUrl) return project.videoLocalUrl;
  if (project.currentAssetId && Array.isArray(project.assets)) {
    const asset = project.assets.find((item) => item.assetId === project.currentAssetId);
    if (asset?.downloadUrl) return asset.downloadUrl;
  }
  return project.videoUrl || null;
}

function vm2SetSaveStatus(text, tone = 'neutral') {
  const el = vm2Get('vm2-save-status');
  if (!el) return;
  const toneClass = tone === 'green'
    ? 'text-green-500'
    : tone === 'red'
      ? 'text-red-500'
      : tone === 'blue'
        ? 'text-blue-500'
        : 'text-gray-400';
  el.className = `text-xs ${toneClass}`;
  el.textContent = text;
}

function vm2EnsureEditable() {
  if (!vm2.revisionPreview) return true;
  alert('Revision preview is read-only. Return to the current project to edit.');
  return false;
}

function vm2MarkDirty(reason = 'Edited') {
  if (vm2.revisionPreview) return;
  vm2PushHistoryState(reason);
}

function vm2HasPersistableProject() {
  return !!vm2.project?._id;
}

// Autosave/PATCH requires a persisted project (has _id).
// Video URL is no longer required — the project doc is created before upload.
function vm2CanPersistWorkingCopy() {
  return !!vm2.project?._id && !vm2.revisionPreview && !vm2.uploadInProgress;
}

// Guards that the editor has a real persisted project before allowing destructive ops.
function vm2EnsureProject() {
  if (vm2.project?._id) return true;
  alert('Please open or create a project from the project browser first.');
  return false;
}

function vm2BuildWorkingProjectPayload() {
  const payload = vm2DeepClone(vm2.project || {});
  delete payload.videoBlob;
  delete payload.videoLocalUrl;
  delete payload.__previewRevisionId;
  payload.steps = (payload.steps || []).map((step) => ({
    ...step,
    elements: (step.elements || []).map((el) => {
      const cleaned = { ...el };
      delete cleaned.imageBlob;
      delete cleaned.audioBlob;
      delete cleaned._imgElement;
      return cleaned;
    }),
  }));
  payload.videoUrl = vm2.project?.videoUrl || null;
  payload.lastEditedAt = vm2NowIso();
  return payload;
}

function vm2BuildRevisionSnapshot() {
  return vm2BuildWorkingProjectPayload();
}

function vm2BuildHistoryEntry(reason = 'Edited') {
  const snapshot = {
    project: vm2BuildWorkingProjectPayload(),
    currentTime: vm2.currentTime || 0,
    currentStepIdx: vm2.currentStepIdx || 0,
    selectedElementId: vm2.selectedElementId || null,
  };
  return {
    reason,
    snapshot,
    signature: JSON.stringify(snapshot),
  };
}

function vm2UpdateUndoRedoButtons() {
  const undoBtn = vm2Get('vm2-undo-btn');
  const redoBtn = vm2Get('vm2-redo-btn');
  const canUndo = !vm2.revisionPreview && vm2.undoStack.length > 1;
  const canRedo = !vm2.revisionPreview && vm2.redoStack.length > 0;

  if (undoBtn) {
    undoBtn.disabled = !canUndo;
    undoBtn.className = `p-1.5 rounded ${canUndo ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50'}`;
    undoBtn.title = canUndo ? t('vmUndoTitle') : t('vmNothingToUndo');
  }

  if (redoBtn) {
    redoBtn.disabled = !canRedo;
    redoBtn.className = `p-1.5 rounded ${canRedo ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50'}`;
    redoBtn.title = canRedo ? t('vmRedoTitle') : t('vmNothingToRedo');
  }
}

function vm2SyncHistoryDirtyState(reason = 'Edited') {
  const currentEntry = vm2.undoStack[vm2.undoStack.length - 1];
  const isDirty = !!currentEntry && currentEntry.signature !== vm2.historyBaseSignature;
  vm2.dirty = isDirty;
  if (vm2.revisionPreview) {
    vm2SetSaveStatus('Revision preview', 'blue');
  } else if (isDirty) {
    vm2SetSaveStatus(`${reason} · autosave pending`);
  } else {
    vm2SetSaveStatus('Loaded', 'green');
  }
  vm2UpdateUndoRedoButtons();
}

function vm2ResetHistory(reason = 'Loaded') {
  vm2.undoStack = [];
  vm2.redoStack = [];
  vm2.historyBaseSignature = '';
  if (vm2.project && !vm2.revisionPreview) {
    const entry = vm2BuildHistoryEntry(reason);
    vm2.undoStack.push(entry);
    vm2.historyBaseSignature = entry.signature;
  }
  vm2SyncHistoryDirtyState(reason);
}

function vm2PushHistoryState(reason = 'Edited') {
  if (vm2.revisionPreview || vm2.suppressHistory || !vm2.project) return;
  const entry = vm2BuildHistoryEntry(reason);
  const lastEntry = vm2.undoStack[vm2.undoStack.length - 1];
  if (lastEntry?.signature === entry.signature) {
    vm2SyncHistoryDirtyState(reason);
    return;
  }
  vm2.undoStack.push(entry);
  if (vm2.undoStack.length > VM2_HISTORY_LIMIT) {
    vm2.undoStack.splice(1, 1);
  }
  if (!vm2.historyBaseSignature && vm2.undoStack[0]) {
    vm2.historyBaseSignature = vm2.undoStack[0].signature;
  }
  vm2.redoStack = [];
  vm2SyncHistoryDirtyState(reason);
}

function vm2ApplyHistoryUiState(state = {}) {
  if (!vm2.project) return;
  const maxStepIdx = Math.max(0, (vm2.project.steps?.length || 1) - 1);
  vm2.currentStepIdx = Math.max(0, Math.min(state.currentStepIdx || 0, maxStepIdx));
  vm2.selectedElementId = state.selectedElementId && vm2FindElement(state.selectedElementId)
    ? state.selectedElementId
    : null;
  const desiredTime = Math.max(0, Math.min(state.currentTime || 0, vm2.duration || vm2.project.duration || 0));
  if (vm2Video()) {
    vm2SeekTo(desiredTime);
  } else {
    vm2.currentTime = desiredTime;
    vm2UpdatePlayhead();
  }
  vm2RenderSteps();
  vm2RenderElements();
  vm2RenderElementsList();
  vm2RenderProps();
}

function vm2RestoreHistoryEntry(entry, reason = 'Edited') {
  if (!entry?.snapshot) return;
  vm2.suppressHistory = true;
  vm2.pendingHistoryRestore = vm2DeepClone(entry.snapshot);
  vm2ApplyProjectState(vm2DeepClone(entry.snapshot.project), {
    readOnlyRevision: null,
    preserveHistory: true,
  });
  const activeVideo = vm2Video();
  if (!vm2PrimaryVideoUrl(vm2.project) || (activeVideo && activeVideo.videoWidth && activeVideo.videoHeight)) {
    const restoreState = vm2.pendingHistoryRestore;
    vm2.pendingHistoryRestore = null;
    vm2ApplyHistoryUiState(restoreState);
  }
  vm2.suppressHistory = false;
  vm2SyncHistoryDirtyState(reason);
}

function vm2BrowserRoot() {
  return vm2Get('vm2-browser-screen');
}

function vm2EditorHost() {
  return vm2Get('vm2-editor-host');
}

function vm2EnsureEditorMounted() {
  if (vm2._editorMounted) return;
  vm2RenderEditorShell();
  vm2._editorMounted = true;
}

function vm2ShowBrowserScreen() {
  vm2.screen = 'browser';
  const browser = vm2BrowserRoot();
  const editor = vm2EditorHost();
  if (browser) browser.classList.remove('hidden');
  if (editor) editor.classList.add('hidden');
  vm2StopPreviewLoop();
}

function vm2ShowEditorScreen() {
  vm2.screen = 'editor';
  const browser = vm2BrowserRoot();
  const editor = vm2EditorHost();
  if (browser) browser.classList.add('hidden');
  if (editor) editor.classList.remove('hidden');
}

function vm2SyncTrashUiState() {
  const trashBtn = vm2Get('vm2-trash-btn');
  const trashPanel = vm2Get('vm2-trash-panel');
  const projectSection = vm2Get('vm2-browser-project-list');
  const emptyState = vm2Get('vm2-browser-project-empty');
  const hasPlaylist = !!vm2.playlist;
  let isShowingTrash = !!trashPanel && !trashPanel.classList.contains('hidden');

  if (!hasPlaylist && isShowingTrash) {
    trashPanel.classList.add('hidden');
    if (projectSection) projectSection.classList.remove('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    isShowingTrash = false;
  }

  if (!trashBtn) return;

  trashBtn.disabled = !hasPlaylist;
  trashBtn.className = `rounded-2xl border px-4 py-2 text-sm font-medium transition ${isShowingTrash
    ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300'
    : hasPlaylist
      ? 'border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
      : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'}`;
  trashBtn.innerHTML = isShowingTrash
    ? `<i class="ri-arrow-left-line mr-1"></i>${t('vmBackToProjects')}`
    : `<i class="ri-delete-bin-line mr-1"></i>${t('vmRecycleBin')}`;
}

function vm2RenderPlaylistBrowser() {
  const playlistList = vm2Get('vm2-playlist-list');
  const playlistMeta = vm2Get('vm2-playlist-meta');
  const projectList = vm2Get('vm2-browser-project-list');
  const projectTitle = vm2Get('vm2-browser-project-title');
  const emptyState = vm2Get('vm2-browser-project-empty');
  const playlistActions = vm2Get('vm2-browser-playlist-actions');
  const createProjectBtn = vm2Get('vm2-create-project-btn');
  const createPlaylistBtn = vm2Get('vm2-create-playlist-btn');
  if (!playlistList || !projectList) return;

  const role = vm2AuthUser().role || 'viewer';
  const canManagePlaylists = ['admin', '課長', '部長', '係長'].includes(role);
  const canEditPlaylistMeta = ['admin', '課長', '部長', '係長'].includes(role);
  const canEditProject = ['admin', '課長', '部長', '係長', '班長'].includes(role);
  const canDeletePlaylists = role === 'admin';
  const searchQuery = (vm2.playlistSearchQuery || '').trim().toLocaleLowerCase();
  const visiblePlaylists = [...vm2.playlists]
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ja', { sensitivity: 'base', numeric: true }))
    .filter((playlist) => {
      if (!searchQuery) return true;
      return [playlist.name, playlist.description, playlist.model]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(searchQuery));
    });
  if (createPlaylistBtn) createPlaylistBtn.classList.toggle('hidden', !canManagePlaylists);
  if (createProjectBtn) createProjectBtn.disabled = !vm2.playlist;
  vm2SyncTrashUiState();

  playlistList.innerHTML = visiblePlaylists.length
    ? visiblePlaylists.map((playlist) => {
        const selected = vm2.playlist && String(vm2.playlist._id) === String(playlist._id);
        const projectCount = Number.isFinite(Number(playlist.projectCount)) ? Number(playlist.projectCount) : 0;
        return `
          <div
            onclick="vm2SelectPlaylist('${playlist._id}')"
            class="w-full cursor-pointer text-left rounded-2xl border px-4 py-3 transition ${selected
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'}">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-gray-900 dark:text-white truncate">${playlist.name || t('vmUntitledPlaylist')}</div>
                <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">${playlist.description || t('vmNoDescriptionYet')}</div>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  ${playlist.model ? `<div class="inline-flex rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold tracking-wide text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">${vm2EscapeHtml(playlist.model)}</div>` : ''}
                </div>
                <div class="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">${t('vmProjectCount')}: ${projectCount}</div>
              </div>
              <span class="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${playlist.privacy === 'public'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : playlist.privacy === 'private'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}">${playlist.privacy || 'internal'}</span>
            </div>
          </div>
        `;
      }).join('')
    : `<div class="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">${searchQuery ? t('vmNoPlaylistsMatchSearch') : t('vmNoPlaylistsYet')}</div>`;

  if (projectTitle) {
    projectTitle.textContent = vm2.playlist ? vm2.playlist.name || t('vmProjectsBtn') : t('vmSelectAPlaylist');
  }

  if (playlistMeta) {
    playlistMeta.textContent = vm2.playlist
      ? `${vm2.playlistProjects.length} ${t('vmProjectCount')}${vm2.playlistProjects.length === 1 ? '' : 's'} · ${vm2.playlist.privacy || t('vmInternalOption')}`
      : t('vmChoosePlaylistToBrowse');
  }

  if (playlistActions) {
    if (vm2.playlist) {
      const actions = [
        canEditPlaylistMeta
          ? `<button onclick="vm2OpenEditPlaylistModal('${vm2.playlist._id}')" class="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition hover:bg-slate-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" title="Edit playlist"><i class="ri-pencil-line mr-1"></i>${t('vmEditPlaylistBtn')}</button>`
          : '',
        canDeletePlaylists
          ? `<button onclick="vm2DeletePlaylist('${vm2.playlist._id}', '${vm2EscapeHtml(vm2.playlist.name || t('vmUntitledPlaylist'))}')" class="rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-500 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20" title="Delete playlist"><i class="ri-delete-bin-line mr-1"></i>${t('vmDeletePlaylistBtn')}</button>`
          : ''
      ].filter(Boolean).join('');
      playlistActions.innerHTML = actions;
      playlistActions.classList.toggle('hidden', !actions);
    } else {
      playlistActions.innerHTML = '';
      playlistActions.classList.add('hidden');
    }
  }

  if (!vm2.playlist || !vm2.playlistProjects.length) {
    projectList.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  projectList.innerHTML = vm2.playlistProjects.map((project) => `
    <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div class="flex flex-col gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <div class="text-sm font-semibold text-gray-900 dark:text-white truncate">${project.title || t('vmUntitledProject')}</div>
            <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${project.deployedRevisionId
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-gray-300'}">${project.deployedRevisionId ? `${t('vmLiveStatus')} ${project.deployedRevisionNumber ? `${t('vmRevLabel')} ${project.deployedRevisionNumber}` : ''}`.trim() : t('vmDraftStatus')}</span>
          </div>
          ${project.description ? `<div class="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${vm2EscapeHtml(project.description)}</div>` : ''}
          <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">${project.stepsCount || 0} ${t('vmStepsRevLabel')} ${project.currentRevisionNumber || 0}</div>
          <div class="mt-1 text-xs ${project.deployedRevisionId ? 'text-emerald-500 dark:text-emerald-300' : 'text-gray-400'}">${vm2ProjectDeploymentLabel(project)}</div>
          <div class="mt-1 text-xs text-gray-400">${t('vmUpdatedAt')} ${new Date(project.updatedAt || project.createdAt).toLocaleDateString()}</div>
        </div>
        <div class="flex items-center gap-1">
          <button onclick="vm2LoadProject('${project._id}')" class="rounded-xl bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600">${t('vmOpen')}</button>
          <button onclick="vm2OpenProjectInfoModal('${project._id}')" class="rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-slate-500 transition hover:bg-slate-100 dark:border-gray-700 dark:hover:bg-gray-700" title="${t('vmProjectInfo')}"><i class="ri-information-line"></i></button>
          ${canEditProject ? `<button onclick="vm2OpenEditProjectModal('${project._id}')" class="rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-slate-500 transition hover:bg-slate-100 dark:border-gray-700 dark:hover:bg-gray-700" title="${t('vmEditProject')}"><i class="ri-pencil-line"></i></button>` : ''}
          <button onclick="vm2DeleteProject('${project._id}', '${(project.title || 'Untitled').replace(/'/g, '\\&apos;')}')" class="rounded-xl border border-red-200 px-2 py-1.5 text-xs text-red-500 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20" title="${t('vmMoveToRecycleBinTitle')}">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

async function vm2DeleteProject(id, title) {
  if (!confirm(`${t('vmMoveToRecycleBinTitle')}: "${title}"\n\n${t('vmDeletedProjectsKept')}`)) return;
  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-projects/${id}`, {
      method: 'DELETE',
      headers: vm2AuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    // Refresh the project list.
    if (vm2.playlist?._id) await vm2SelectPlaylist(String(vm2.playlist._id));
  } catch (err) {
    console.error('[VM2] Delete project error:', err);
    alert('Failed to delete project: ' + err.message);
  }
}

async function vm2ToggleTrashView() {
  const projectSection = vm2Get('vm2-browser-project-list');
  const trashPanel = vm2Get('vm2-trash-panel');
  const emptyState = vm2Get('vm2-browser-project-empty');
  if (!trashPanel) return;
  if (!vm2.playlist) {
    vm2SyncTrashUiState();
    return;
  }

  const isShowingTrash = !trashPanel.classList.contains('hidden');
  if (isShowingTrash) {
    // Return to normal project view.
    trashPanel.classList.add('hidden');
    if (projectSection) projectSection.classList.remove('hidden');
    if (emptyState && !vm2.playlist) emptyState.classList.remove('hidden');
  } else {
    // Show trash panel.
    if (projectSection) projectSection.classList.add('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    trashPanel.classList.remove('hidden');
    await vm2LoadTrash();
  }

  vm2SyncTrashUiState();
}

async function vm2LoadTrash() {
  const list = vm2Get('vm2-trash-list');
  if (!list) return;

  if (!vm2.playlist?._id) {
    list.innerHTML = `<p class="col-span-3 text-sm text-gray-400 text-center py-8">${t('vmSelectPlaylistFirstToView')}</p>`;
    return;
  }

  list.innerHTML = '<p class="col-span-3 text-sm text-gray-400 text-center py-6">Loading…</p>';

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-playlists/${vm2.playlist._id}/trash`, {
      headers: vm2AuthHeaders(),
    });
    if (!res.ok) throw new Error(String(res.status));
    const items = await res.json();

    if (!items.length) {
      list.innerHTML = '<p class="col-span-3 text-sm text-gray-400 text-center py-8">Recycle bin is empty.</p>';
      return;
    }

    const canPermDelete = new Set(['admin', '課長', '係長', '部長']).has(vm2AuthUser().role || '');

    list.innerHTML = items.map((p) => {
      const deletedDate = p.deletedAt ? new Date(p.deletedAt).toLocaleDateString() : '?';
      const daysRemaining = p.daysRemaining ?? '?';
      const urgentClass = daysRemaining <= 3 ? 'text-red-500 font-semibold' : 'text-orange-500';
      const permDeleteBtn = canPermDelete
        ? `<button onclick="vm2PermanentDeleteProject('${p._id}', '${(p.title || 'Untitled').replace(/'/g, '\\&apos;')}')" class="rounded-xl border border-red-300 px-2 py-1.5 text-xs text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30" title="${t('vmDeleteForever')}"><i class="ri-delete-bin-2-fill"></i></button>`
        : '';
      return `
        <div class="rounded-2xl border border-red-100 bg-red-50/60 p-4 dark:border-red-900/40 dark:bg-red-900/10">
          <div class="text-sm font-semibold text-gray-800 dark:text-white truncate">${p.title || t('vmUntitledProject')}</div>
          <div class="mt-1 text-xs text-gray-500">${p.stepsCount || 0} ${t('vmStepsRevLabel')} ${p.currentRevisionNumber || 0}</div>
          <div class="mt-1 text-xs text-gray-400">Deleted ${deletedDate} by ${p.deletedBy || '?'}</div>
          <div class="mt-1 text-xs ${urgentClass}">${daysRemaining} day${daysRemaining === 1 ? '' : 's'} until permanent deletion</div>
          <div class="mt-3 flex gap-2">
            <button onclick="vm2PreviewTrashProject('${p._id}')" class="rounded-xl border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" title="${t('vmPreviewBtn')}">
              <i class="ri-eye-line"></i>
            </button>
            <button onclick="vm2RestoreProject('${p._id}')" class="flex-1 rounded-xl bg-green-500 px-2 py-1.5 text-xs font-medium text-white hover:bg-green-600">
              <i class="ri-arrow-go-back-line mr-1"></i>${t('vmRestore')}
            </button>
            ${permDeleteBtn}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    console.error('[VM2] Load trash error:', err);
    list.innerHTML = `<p class="col-span-3 text-sm text-red-400 text-center py-8">Failed to load recycle bin: ${err.message}</p>`;
  }
}

async function vm2RestoreProject(id) {
  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-projects/${id}/restore`, {
      method: 'POST',
      headers: vm2AuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    await vm2LoadTrash();
    if (vm2.playlist?._id) await vm2SelectPlaylist(String(vm2.playlist._id));
  } catch (err) {
    console.error('[VM2] Restore project error:', err);
    alert('Failed to restore project: ' + err.message);
  }
}

async function vm2PermanentDeleteProject(id, title) {
  if (!confirm(`Permanently delete "${title}"?\n\nThis cannot be undone. The video file will also be removed if no other projects use it.`)) return;
  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-projects/${id}/permanent`, {
      method: 'DELETE',
      headers: vm2AuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    await vm2LoadTrash();
  } catch (err) {
    console.error('[VM2] Permanent delete error:', err);
    alert('Failed to permanently delete: ' + err.message);
  }
}

async function vm2LoadPlaylists() {
  const playlistList = vm2Get('vm2-playlist-list');
  const projectList = vm2Get('vm2-browser-project-list');
  if (playlistList) playlistList.innerHTML = `<div class="text-sm text-gray-400 py-6 text-center">${t('vmLoadingPlaylists')}</div>`;
  if (projectList) projectList.innerHTML = '';

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-playlists`, {
      headers: vm2AuthHeaders(),
    });
    if (!res.ok) throw new Error(String(res.status));
    vm2.playlists = await res.json();
    vm2.playlist = null;
    vm2.playlistProjects = [];
    vm2RenderPlaylistBrowser();
  } catch (err) {
    console.error('[VM2] Load playlists error:', err);
    if (playlistList) {
      playlistList.innerHTML = '<div class="text-sm text-red-400 py-6 text-center">Failed to load playlists</div>';
    }
  }
}

function vm2SetPlaylistSearch(value) {
  vm2.playlistSearchQuery = value || '';
  vm2RenderPlaylistBrowser();
}

async function vm2SelectPlaylist(id) {
  vm2.playlist = vm2.playlists.find((item) => String(item._id) === String(id)) || null;
  vm2.playlistProjects = [];
  vm2RenderPlaylistBrowser();
  if (!vm2.playlist) return;

  const projectList = vm2Get('vm2-browser-project-list');
  if (projectList) {
    projectList.innerHTML = `<div class="text-sm text-gray-400 py-6 text-center">${t('vmLoadingProjects')}</div>`;
  }

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-playlists/${id}/projects`, {
      headers: vm2AuthHeaders(),
    });
    if (!res.ok) throw new Error(String(res.status));
    vm2.playlistProjects = await res.json();
    if (vm2.playlist) vm2.playlist.projectCount = vm2.playlistProjects.length;
    const playlistIndex = vm2.playlists.findIndex((item) => String(item._id) === String(id));
    if (playlistIndex >= 0) vm2.playlists[playlistIndex].projectCount = vm2.playlistProjects.length;
    vm2RenderPlaylistBrowser();
  } catch (err) {
    console.error('[VM2] Load playlist projects error:', err);
    if (projectList) {
      projectList.innerHTML = '<div class="text-sm text-red-400 py-6 text-center">Failed to load projects</div>';
    }
  }
}

async function vm2LoadPlaylistModelOptions(force = false) {
  if (!force && Array.isArray(vm2.playlistModelOptions)) return vm2.playlistModelOptions;
  vm2.playlistModelLoading = true;
  try {
    const res = await fetch(`${vm2BaseUrl()}api/masterdb/models`, {
      headers: vm2AuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    vm2.playlistModelOptions = Array.isArray(data.data) ? data.data : [];
    return vm2.playlistModelOptions;
  } catch (err) {
    console.error('[VM2] Load playlist model options error:', err);
    throw err;
  } finally {
    vm2.playlistModelLoading = false;
  }
}

function vm2BuildPlaylistModelOptionsMarkup(models, selectedModel = '') {
  const uniqueModels = Array.isArray(models) ? Array.from(new Set(models.filter(Boolean))) : [];
  const normalizedSelectedModel = String(selectedModel || '').trim();
  const hasSelectedModel = normalizedSelectedModel && uniqueModels.includes(normalizedSelectedModel);
  const options = [`<option value="">${t('vmNoModelSelected')}</option>`];
  if (normalizedSelectedModel && !hasSelectedModel) {
    options.push(`<option value="${vm2EscapeHtml(normalizedSelectedModel)}">${vm2EscapeHtml(normalizedSelectedModel)}</option>`);
  }
  uniqueModels.forEach((model) => {
    options.push(`<option value="${vm2EscapeHtml(model)}">${vm2EscapeHtml(model)}</option>`);
  });
  return options.join('');
}

function vm2SyncCreatePlaylistSubmitState() {
  const submitBtn = vm2Get('vm2-create-playlist-submit');
  const titleInput = vm2Get('vm2-create-playlist-title');
  if (!submitBtn || !titleInput) return;
  const canSubmit = !vm2.playlistCreating && !!titleInput.value.trim();
  submitBtn.disabled = !canSubmit;
  submitBtn.className = `flex-1 py-2 rounded text-sm text-white ${canSubmit ? 'bg-slate-900 hover:bg-slate-700 dark:bg-sky-500 dark:hover:bg-sky-400' : 'bg-slate-300 cursor-not-allowed dark:bg-gray-700'}`;
}

function vm2OnCreatePlaylistTitleInput() {
  const titleInput = vm2Get('vm2-create-playlist-title');
  if (!titleInput) return;
  const autoModel = titleInput.dataset.autoModel || '';
  const value = titleInput.value.trim();
  titleInput.dataset.manual = value && value !== autoModel ? '1' : '0';
  vm2SyncCreatePlaylistSubmitState();
}

function vm2OnCreatePlaylistModelChange() {
  const titleInput = vm2Get('vm2-create-playlist-title');
  const modelSelect = vm2Get('vm2-create-playlist-model');
  if (!titleInput || !modelSelect) return;
  const selectedModel = modelSelect.value || '';
  const prevAuto = titleInput.dataset.autoModel || '';
  const isManual = titleInput.dataset.manual === '1';
  if (!isManual || !titleInput.value.trim() || titleInput.value.trim() === prevAuto) {
    titleInput.value = selectedModel;
    titleInput.dataset.manual = '0';
  }
  titleInput.dataset.autoModel = selectedModel;
  vm2SyncCreatePlaylistSubmitState();
}

function vm2OnEditPlaylistTitleInput() {
  const titleInput = vm2Get('vm2-edit-playlist-title');
  if (!titleInput) return;
  const autoModel = titleInput.dataset.autoModel || '';
  const value = titleInput.value.trim();
  titleInput.dataset.manual = value && value !== autoModel ? '1' : '0';
  vm2SyncEditPlaylistSubmitState();
}

function vm2OnEditPlaylistModelChange() {
  const titleInput = vm2Get('vm2-edit-playlist-title');
  const modelSelect = vm2Get('vm2-edit-playlist-model');
  if (!titleInput || !modelSelect) return;
  const selectedModel = modelSelect.value || '';
  const prevAuto = titleInput.dataset.autoModel || '';
  const isManual = titleInput.dataset.manual === '1';
  if (!isManual || !titleInput.value.trim() || titleInput.value.trim() === prevAuto) {
    titleInput.value = selectedModel;
    titleInput.dataset.manual = '0';
  }
  titleInput.dataset.autoModel = selectedModel;
  vm2SyncEditPlaylistSubmitState();
}

function vm2CloseCreatePlaylistModal() {
  const modal = vm2Get('vm2-modal-create-playlist');
  if (modal) modal.classList.add('hidden');
  vm2.playlistCreating = false;
  vm2SyncCreatePlaylistSubmitState();
}

async function vm2OpenCreatePlaylistModal() {
  const modal = vm2Get('vm2-modal-create-playlist');
  const modelSelect = vm2Get('vm2-create-playlist-model');
  const titleInput = vm2Get('vm2-create-playlist-title');
  const descInput = vm2Get('vm2-create-playlist-description');
  const privacySelect = vm2Get('vm2-create-playlist-privacy');
  const errorEl = vm2Get('vm2-create-playlist-error');
  const loadingEl = vm2Get('vm2-create-playlist-model-loading');
  if (!modal || !modelSelect || !titleInput || !descInput || !privacySelect || !errorEl || !loadingEl) return;

  modal.classList.remove('hidden');
  titleInput.value = '';
  titleInput.dataset.autoModel = '';
  titleInput.dataset.manual = '0';
  descInput.value = '';
  privacySelect.value = 'internal';
  errorEl.textContent = '';
  loadingEl.textContent = t('vmLoadingModels');
  modelSelect.innerHTML = `<option value="">${t('vmLoadingModels')}</option>`;
  modelSelect.disabled = true;
  vm2.playlistCreating = false;
  vm2SyncCreatePlaylistSubmitState();

  try {
    const models = await vm2LoadPlaylistModelOptions();
    modelSelect.innerHTML = [`<option value="">${t('vmNoModelSelected')}</option>`]
      .concat(models.map((model) => `<option value="${vm2EscapeHtml(model)}">${vm2EscapeHtml(model)}</option>`))
      .join('');
    modelSelect.disabled = false;
    loadingEl.textContent = models.length ? `${models.length} ${t('vmModelsAvailable')}` : t('vmNoModelsFound');
  } catch (err) {
    modelSelect.innerHTML = '<option value="">Failed to load models</option>';
    modelSelect.disabled = true;
    loadingEl.textContent = 'Could not load model list';
    errorEl.textContent = `Model list failed to load: ${err.message}`;
  }
}

async function vm2CreatePlaylist() {
  vm2OpenCreatePlaylistModal();
}

async function vm2SubmitCreatePlaylist() {
  const titleInput = vm2Get('vm2-create-playlist-title');
  const descInput = vm2Get('vm2-create-playlist-description');
  const privacySelect = vm2Get('vm2-create-playlist-privacy');
  const modelSelect = vm2Get('vm2-create-playlist-model');
  const errorEl = vm2Get('vm2-create-playlist-error');
  if (!titleInput || !descInput || !privacySelect || !modelSelect || !errorEl) return;

  const name = titleInput.value.trim() || modelSelect.value.trim();
  const description = descInput.value.trim();
  const privacy = privacySelect.value || 'internal';
  const model = modelSelect.value.trim();

  if (!name) {
    errorEl.textContent = t('vmTitleRequired');
    vm2SyncCreatePlaylistSubmitState();
    return;
  }

  vm2.playlistCreating = true;
  errorEl.textContent = '';
  vm2SyncCreatePlaylistSubmitState();

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-playlists`, {
      method: 'POST',
      headers: vm2AuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name, description, privacy, model: model || null }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    vm2CloseCreatePlaylistModal();
    await vm2LoadPlaylists();
    if (data.insertedId) await vm2SelectPlaylist(String(data.insertedId));
  } catch (err) {
    console.error('[VM2] Create playlist error:', err);
    errorEl.textContent = `Failed to create playlist: ${err.message}`;
  } finally {
    vm2.playlistCreating = false;
    vm2SyncCreatePlaylistSubmitState();
  }
}

function vm2SyncEditPlaylistSubmitState() {
  const submitBtn = vm2Get('vm2-edit-playlist-submit');
  const titleInput = vm2Get('vm2-edit-playlist-title');
  if (!submitBtn || !titleInput) return;
  const canSubmit = !vm2.playlistUpdating && !!titleInput.value.trim();
  submitBtn.disabled = !canSubmit;
  submitBtn.className = `flex-1 py-2 rounded text-sm text-white ${canSubmit ? 'bg-slate-900 hover:bg-slate-700 dark:bg-sky-500 dark:hover:bg-sky-400' : 'bg-slate-300 cursor-not-allowed dark:bg-gray-700'}`;
}

function vm2CloseEditPlaylistModal() {
  const modal = vm2Get('vm2-modal-edit-playlist');
  if (modal) modal.classList.add('hidden');
  vm2.playlistUpdating = false;
  vm2SyncEditPlaylistSubmitState();
}

async function vm2OpenEditPlaylistModal(id) {
  const playlist = vm2.playlists.find((item) => String(item._id) === String(id));
  const modal = vm2Get('vm2-modal-edit-playlist');
  const modelSelect = vm2Get('vm2-edit-playlist-model');
  const titleInput = vm2Get('vm2-edit-playlist-title');
  const descInput = vm2Get('vm2-edit-playlist-description');
  const errorEl = vm2Get('vm2-edit-playlist-error');
  const loadingEl = vm2Get('vm2-edit-playlist-model-loading');
  if (!playlist || !modal || !modelSelect || !titleInput || !descInput || !errorEl || !loadingEl) return;
  modal.dataset.playlistId = String(playlist._id);
  modelSelect.innerHTML = `<option value="">${t('vmLoadingModels')}</option>`;
  modelSelect.disabled = true;
  loadingEl.textContent = t('vmLoadingModels');
  titleInput.value = playlist.name || '';
  titleInput.dataset.autoModel = playlist.model || '';
  titleInput.dataset.manual = playlist.model && playlist.name === playlist.model ? '0' : (playlist.name ? '1' : '0');
  descInput.value = playlist.description || '';
  errorEl.textContent = '';
  vm2.playlistUpdating = false;
  modal.classList.remove('hidden');
  vm2SyncEditPlaylistSubmitState();

  try {
    const models = await vm2LoadPlaylistModelOptions();
    modelSelect.innerHTML = vm2BuildPlaylistModelOptionsMarkup(models, playlist.model || '');
    modelSelect.value = playlist.model || '';
    modelSelect.disabled = false;
    loadingEl.textContent = `${Array.isArray(models) ? models.length : 0} ${t('vmModelsAvailable')}`;
  } catch (err) {
    console.error('[VM2] Load edit playlist model options error:', err);
    modelSelect.innerHTML = vm2BuildPlaylistModelOptionsMarkup([], playlist.model || '');
    modelSelect.value = playlist.model || '';
    modelSelect.disabled = false;
    loadingEl.textContent = 'Failed to load models. You can still save without changing it.';
  }
}

async function vm2SubmitEditPlaylist() {
  const modal = vm2Get('vm2-modal-edit-playlist');
  const modelSelect = vm2Get('vm2-edit-playlist-model');
  const titleInput = vm2Get('vm2-edit-playlist-title');
  const descInput = vm2Get('vm2-edit-playlist-description');
  const errorEl = vm2Get('vm2-edit-playlist-error');
  const playlistId = modal?.dataset.playlistId;
  if (!modal || !modelSelect || !titleInput || !descInput || !errorEl || !playlistId) return;

  const model = (modelSelect.value || '').trim();
  const name = titleInput.value.trim();
  const description = descInput.value.trim();
  if (!name) {
    errorEl.textContent = t('vmTitleRequired');
    vm2SyncEditPlaylistSubmitState();
    return;
  }

  vm2.playlistUpdating = true;
  errorEl.textContent = '';
  vm2SyncEditPlaylistSubmitState();
  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-playlists/${playlistId}`, {
      method: 'PATCH',
      headers: vm2AuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name, description, model: model || null }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    await vm2LoadPlaylists();
    await vm2SelectPlaylist(playlistId);
    vm2CloseEditPlaylistModal();
  } catch (err) {
    console.error('[VM2] Edit playlist error:', err);
    errorEl.textContent = `Failed to update playlist: ${err.message}`;
  } finally {
    vm2.playlistUpdating = false;
    vm2SyncEditPlaylistSubmitState();
  }
}

async function vm2DeletePlaylist(id, name) {
  if (!confirm(`${t('vmDeletePlaylistBtn')}: "${name}"?\n\nThis will permanently delete the playlist, all its projects, and all shared assets.`)) return;
  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-playlists/${id}`, {
      method: 'DELETE',
      headers: vm2AuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    if (vm2.playlist && String(vm2.playlist._id) === String(id)) {
      vm2.playlist = null;
      vm2.playlistProjects = [];
    }
    await vm2LoadPlaylists();
  } catch (err) {
    console.error('[VM2] Delete playlist error:', err);
    alert('Failed to delete playlist: ' + err.message);
  }
}

async function vm2CreateProject() {
  vm2OpenCreateProjectModal();
}

function vm2SyncCreateProjectSubmitState() {
  const submitBtn = vm2Get('vm2-create-project-submit');
  const titleInput = vm2Get('vm2-create-project-title');
  if (!submitBtn || !titleInput) return;
  const canSubmit = !vm2.projectCreating && !!titleInput.value.trim();
  submitBtn.disabled = !canSubmit;
  submitBtn.className = `flex-1 py-2 rounded text-sm text-white ${
    canSubmit
      ? 'bg-slate-900 hover:bg-slate-700 dark:bg-sky-500 dark:hover:bg-sky-400'
      : 'bg-slate-300 cursor-not-allowed dark:bg-gray-700'
  }`;
}

function vm2CloseCreateProjectModal() {
  const modal = vm2Get('vm2-modal-create-project');
  if (modal) modal.classList.add('hidden');
  vm2.projectCreating = false;
  vm2SyncCreateProjectSubmitState();
}

function vm2OpenCreateProjectModal() {
  if (!vm2.playlist?._id) {
    alert(t('vmSelectAPlaylist'));
    return;
  }
  const modal = vm2Get('vm2-modal-create-project');
  const titleInput = vm2Get('vm2-create-project-title');
  const descInput = vm2Get('vm2-create-project-description');
  const errorEl = vm2Get('vm2-create-project-error');
  if (!modal || !titleInput || !descInput || !errorEl) return;
  modal.classList.remove('hidden');
  titleInput.value = '';
  descInput.value = '';
  errorEl.textContent = '';
  vm2.projectCreating = false;
  vm2SyncCreateProjectSubmitState();
  setTimeout(() => titleInput.focus(), 50);
}

async function vm2SubmitCreateProject() {
  const titleInput = vm2Get('vm2-create-project-title');
  const descInput = vm2Get('vm2-create-project-description');
  const errorEl = vm2Get('vm2-create-project-error');
  if (!titleInput || !descInput || !errorEl) return;

  const title = titleInput.value.trim();
  const description = descInput.value.trim();

  if (!title) {
    errorEl.textContent = t('vmTitleRequired');
    vm2SyncCreateProjectSubmitState();
    return;
  }

  vm2.projectCreating = true;
  errorEl.textContent = '';
  vm2SyncCreateProjectSubmitState();

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-playlists/${vm2.playlist._id}/projects`, {
      method: 'POST',
      headers: vm2AuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title, description }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    vm2CloseCreateProjectModal();
    await vm2SelectPlaylist(String(vm2.playlist._id));
    if (data.insertedId) await vm2LoadProject(String(data.insertedId));
  } catch (err) {
    console.error('[VM2] Create project error:', err);
    errorEl.textContent = `Failed to create project: ${err.message}`;
  } finally {
    vm2.projectCreating = false;
    vm2SyncCreateProjectSubmitState();
  }
}

function vm2OpenEditProjectModal(id) {
  const project = (vm2.playlistProjects || []).find((p) => String(p._id) === String(id));
  const modal = vm2Get('vm2-modal-edit-project');
  const titleInput = vm2Get('vm2-edit-project-title');
  const descInput = vm2Get('vm2-edit-project-description');
  const errorEl = vm2Get('vm2-edit-project-error');
  if (!modal || !titleInput || !descInput || !errorEl) return;
  modal.dataset.projectId = id;
  titleInput.value = project?.title || '';
  descInput.value = project?.description || '';
  errorEl.textContent = '';
  vm2.projectUpdating = false;
  vm2SyncEditProjectSubmitState();
  modal.classList.remove('hidden');
  setTimeout(() => titleInput.focus(), 50);
}

function vm2CloseEditProjectModal() {
  const modal = vm2Get('vm2-modal-edit-project');
  if (modal) modal.classList.add('hidden');
  vm2.projectUpdating = false;
  vm2SyncEditProjectSubmitState();
}

function vm2SyncEditProjectSubmitState() {
  const submitBtn = vm2Get('vm2-edit-project-submit');
  const titleInput = vm2Get('vm2-edit-project-title');
  if (!submitBtn || !titleInput) return;
  const canSubmit = !vm2.projectUpdating && !!titleInput.value.trim();
  submitBtn.disabled = !canSubmit;
  submitBtn.className = `flex-1 py-2 rounded text-sm text-white ${
    canSubmit
      ? 'bg-slate-900 hover:bg-slate-700 dark:bg-sky-500 dark:hover:bg-sky-400'
      : 'bg-slate-300 cursor-not-allowed dark:bg-gray-700'
  }`;
}

async function vm2SubmitEditProject() {
  const modal = vm2Get('vm2-modal-edit-project');
  const titleInput = vm2Get('vm2-edit-project-title');
  const descInput = vm2Get('vm2-edit-project-description');
  const errorEl = vm2Get('vm2-edit-project-error');
  if (!modal || !titleInput || !descInput || !errorEl) return;

  const id = modal.dataset.projectId;
  const title = titleInput.value.trim();
  const description = descInput.value.trim();

  if (!title) {
    errorEl.textContent = t('vmTitleRequired');
    return;
  }

  vm2.projectUpdating = true;
  errorEl.textContent = '';
  vm2SyncEditProjectSubmitState();

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-projects/${id}`, {
      method: 'PATCH',
      headers: vm2AuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title, description }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    vm2CloseEditProjectModal();
    if (vm2.playlist?._id) await vm2SelectPlaylist(String(vm2.playlist._id));
    if (vm2.project && String(vm2.project._id) === String(id)) {
      vm2.project.title = title;
      vm2.project.description = description;
    }
  } catch (err) {
    console.error('[VM2] Edit project error:', err);
    errorEl.textContent = `Failed to save: ${err.message}`;
  } finally {
    vm2.projectUpdating = false;
    vm2SyncEditProjectSubmitState();
  }
}

function vm2OpenProjectInfoModal(id) {
  const project = (vm2.playlistProjects || []).find((p) => String(p._id) === String(id));
  if (!project) return;
  const modal = vm2Get('vm2-modal-project-info');
  if (!modal) return;

  const fmt = (d) => d ? new Date(d).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

  const titleEl = modal.querySelector('[data-info="title"]');
  const descEl  = modal.querySelector('[data-info="description"]');
  const statusEl = modal.querySelector('[data-info="status"]');
  const revEl   = modal.querySelector('[data-info="revision"]');
  const deployEl= modal.querySelector('[data-info="deploy"]');
  const stepsEl = modal.querySelector('[data-info="steps"]');
  const createdEl = modal.querySelector('[data-info="created"]');
  const updatedEl = modal.querySelector('[data-info="updated"]');
  const creatorEl = modal.querySelector('[data-info="creator"]');

  if (titleEl)   titleEl.textContent   = project.title || t('vmUntitledProject');
  if (descEl)    descEl.textContent    = project.description || '—';
  if (stepsEl)   stepsEl.textContent   = project.stepsCount || 0;
  if (revEl)     revEl.textContent     = `${t('vmRevLabel')} ${project.currentRevisionNumber || 0}`;
  if (creatorEl) creatorEl.textContent = project.createdBy || '—';
  if (createdEl) createdEl.textContent = fmt(project.createdAt);
  if (updatedEl) updatedEl.textContent = fmt(project.updatedAt);

  if (statusEl) {
    const isLive = !!project.deployedRevisionId;
    statusEl.textContent = isLive ? `${t('vmLiveRevStatus')} ${project.deployedRevisionNumber || 0}` : t('vmDraftStatusLabel');
    statusEl.className = `inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      isLive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
             : 'bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-gray-300'}`;
  }
  if (deployEl) {
    deployEl.textContent = project.deployedAt ? `${fmt(project.deployedAt)} by ${project.deployedBy || '—'}` : '—';
  }

  modal.classList.remove('hidden');
}

function vm2CloseProjectInfoModal() {
  const modal = vm2Get('vm2-modal-project-info');
  if (modal) modal.classList.add('hidden');
}

async function vm2ReturnToBrowser() {
  vm2.revisionPreview = null;
  vm2ShowBrowserScreen();
  const selectedPlaylistId = vm2.playlist?._id ? String(vm2.playlist._id) : null;
  await vm2LoadPlaylists();
  if (selectedPlaylistId) await vm2SelectPlaylist(selectedPlaylistId);
}

function vm2HandleTitleChange(value) {
  if (!vm2.project) return;
  if (!vm2EnsureEditable()) {
    vm2Get('vm2-title').value = vm2.project.title || 'Untitled1';
    return;
  }
  vm2.project.title = value || vm2.project.title || 'Untitled1';
  vm2MarkDirty('Title changed');
}

function vm2SetVideoSource(url, { local = false, sourceKey = '', showLoader = false, loadingText = null } = {}) {
  if (loadingText === null) loadingText = t('vmLoadingVideo');
  if (!url) {
    vm2ClearManagedMedia(false);
    return;
  }
  const entry = vm2EnsureMediaEntry(url, { local, sourceKey, usePrimary: true });
  if (!entry) return;
  vm2SetActiveMediaEntry(entry);
  void vm2LoadMediaEntry(entry, { showLoader, loadingText }).catch((err) => {
    console.error('[VM2] Set video source error:', err);
  });
}

function vm2EnsureStepVideoSource(step, timelineTime, { autoplay = false } = {}) {
  if (!step) return true;

  const desiredUrl = vm2GetStepVideoUrl(step);
  if (!desiredUrl) return true;

  const desiredKey = vm2GetStepSourceKey(step);
  const desiredEntry = vm2EnsureMediaEntry(desiredUrl, {
    local: vm2IsBlobUrl(desiredUrl),
    sourceKey: desiredKey,
    usePrimary: desiredKey === vm2.activeMediaKey || !vm2.activeMediaKey,
  });
  if (!desiredEntry) return true;
  if (vm2.activeMediaKey === desiredKey && (desiredEntry.status === 'ready' || desiredEntry.metadataReady)) return true;

  vm2.pendingMediaSwitch = { timelineTime, autoplay, sourceKey: desiredKey };
  vm2SetActiveMediaEntry(desiredEntry);
  if (desiredEntry.status === 'ready') return true;

  void vm2LoadMediaEntry(desiredEntry, {
    showLoader: true,
    loadingText: 'Loading clip...',
  }).catch((err) => {
    console.error('[VM2] Step media switch error:', err);
  });
  return false;
}

function vm2StartAutosaveLoop() {
  if (vm2.autosaveTimer) clearInterval(vm2.autosaveTimer);
  vm2.autosaveTimer = setInterval(() => {
    if (!vm2.dirty || vm2.isAutosaving || !vm2CanPersistWorkingCopy()) return;
    vm2PersistWorkingProject({ silent: true, reason: 'Autosaved' });
  }, VM2_AUTOSAVE_INTERVAL_MS);
}

function vm2LoadVideoMetadata(url, { local = false } = {}) {
  return new Promise((resolve, reject) => {
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.crossOrigin = local ? '' : 'anonymous';
    probe.onloadedmetadata = () => {
      const result = {
        duration: probe.duration || 0,
        width: probe.videoWidth || 0,
        height: probe.videoHeight || 0,
      };
      probe.src = '';
      resolve(result);
    };
    probe.onerror = () => {
      probe.src = '';
      reject(new Error('Could not load clip metadata'));
    };
    probe.src = local ? url : vm2ResolveMediaUrl(url);
  });
}

function vm2HydrateProjectMedia(project = vm2.project) {
  if (!project?.steps) return;
  project.steps.forEach((step) => {
    (step.elements || []).forEach((el) => {
      if (el.type === 'image' && el.imageUrl && !el._imgElement) {
        const img = new Image();
        if (!vm2IsBlobUrl(el.imageUrl)) img.crossOrigin = 'anonymous';
        img.onload = () => {
          el._imgElement = img;
        };
        img.src = el.imageUrl;
      }
    });
  });
}

async function vm2PersistWorkingProject({ silent = true, reason = 'Saved' } = {}) {
  if (!vm2CanPersistWorkingCopy()) return null;

  vm2.isAutosaving = true;
  vm2SetSaveStatus(reason === 'Autosaved' ? 'Autosaving…' : 'Saving…', 'blue');

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-projects/${vm2.project._id}`, {
      method: 'PATCH',
      headers: vm2AuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(vm2BuildWorkingProjectPayload()),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || String(res.status));
    }

    const data = await res.json();
    if (data.currentRevisionNumber !== undefined) vm2.project.currentRevisionNumber = data.currentRevisionNumber;
    if (data.lastRevisionId !== undefined) vm2.project.lastRevisionId = data.lastRevisionId;
    vm2.dirty = false;
    vm2.lastSavedAt = new Date();
    const timeStamp = vm2.lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const statusText = reason === 'Autosaved' ? `Autosaved at ${timeStamp}` : `${reason} · ${timeStamp}`;
    vm2SetSaveStatus(statusText, 'green');
    return data;
  } catch (err) {
    console.error('[VM2] Persist working project error:', err);
    vm2SetSaveStatus('Save failed — will retry', 'red');
    if (!silent) alert('Failed to save project: ' + err.message);
    return null;
  } finally {
    vm2.isAutosaving = false;
  }
}

function vm2SetReadOnlyBanner(revision) {
  const banner = vm2Get('vm2-readonly-banner');
  const label = vm2Get('vm2-readonly-label');
  if (!banner || !label) return;
  banner.classList.toggle('hidden', !revision);
  if (revision) {
    label.textContent = `${t('vmPreviewingSavedRevision')}: ${revision.revisionName || t('vmUnnamedRevision')} · ${new Date(revision.createdAt).toLocaleString()}`;
  }
}

function vm2ApplyProjectState(project, { readOnlyRevision = null, preserveHistory = false } = {}) {
  vm2.project = {
    _id: null,
    title: 'Untitled1',
    folder: 'root',
    videoUrl: null,
    videoLocalUrl: null,
    videoBlob: null,
    currentAssetId: null,
    assets: [],
    duration: 0,
    width: 1920,
    height: 1080,
    steps: [],
    currentRevisionNumber: 0,
    lastRevisionId: null,
    deployedRevisionId: null,
    deployedRevisionNumber: null,
    deployedRevisionName: null,
    deployedAt: null,
    deployedBy: null,
    deployedVideoUrl: null,
    deployedVideoStoragePath: null,
    deployedVideoMimeType: null,
    deployedVideoFileName: null,
    ...project,
  };

  vm2.currentStepIdx = 0;
  vm2.selectedElementId = null;
  vm2SyncSequenceDuration(vm2.project);
  vm2.playing = false;
  vm2.revisionPreview = readOnlyRevision;
  vm2.dirty = false;
  vm2.videoRect = null;
  vm2HydrateProjectMedia(vm2.project);

  const titleInput = vm2Get('vm2-title');
  if (titleInput) titleInput.value = vm2.project.title || 'Untitled1';
  vm2SetReadOnlyBanner(readOnlyRevision);

  // Show upload zone when no video yet, player area when video is ready.
  // Both states require the project to already be persisted (_id exists).
  const uploadZone = vm2Get('vm2-upload-zone');
  const playerArea = vm2Get('vm2-player-area');
  const sourceUrl = vm2PrimaryVideoUrl(vm2.project);
  if (sourceUrl) {
    if (uploadZone) uploadZone.classList.add('hidden');
    if (playerArea) playerArea.classList.remove('hidden');
    vm2PrimeProjectMedia(vm2.project, {
      showLoader: true,
      loadingText: vm2.loadingProject ? t('vmLoadingProjectVideo') : t('vmLoadingVideo'),
    });
  } else {
    if (uploadZone) uploadZone.classList.remove('hidden');
    if (playerArea) playerArea.classList.add('hidden');
    vm2ClearManagedMedia(false);
    vm2SetLoadingIndicator(false);
  }

  vm2RenderSteps();
  vm2RenderTimeline();
  vm2RenderElements();
  vm2RenderElementsList();
  vm2RenderProps();
  vm2SetSaveStatus(readOnlyRevision ? 'Revision preview' : 'Loaded', readOnlyRevision ? 'blue' : 'green');
  if (!preserveHistory) {
    vm2ResetHistory(readOnlyRevision ? 'Revision preview' : 'Loaded');
  } else {
    vm2UpdateUndoRedoButtons();
  }
}

// ── Page Loader ─────────────────────────────────────────────────────────────
function vm2RenderEditorShell() {
  const host = vm2EditorHost();
  if (!host) return;

  host.innerHTML = `
  <div id="vm2-root" class="flex flex-col bg-gray-100 dark:bg-gray-900" style="height:calc(100vh - 84px);">

    <!-- ═══ TOP BAR ═══ -->
    <div class="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <button onclick="vm2ReturnToBrowser()" class="px-3 py-1.5 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 flex items-center gap-1">
        <i class="ri-arrow-left-line"></i>${t('vmProjectsBtn')}
      </button>
      <button id="vm2-undo-btn" onclick="vm2Undo()" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="${t('vmUndoTitle')}">
        <i class="ri-arrow-go-back-line text-lg"></i>
      </button>
      <button id="vm2-redo-btn" onclick="vm2Redo()" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="${t('vmRedoTitle')}">
        <i class="ri-arrow-go-forward-line text-lg"></i>
      </button>
      <div class="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
      <button onclick="vm2ShowCanvasSize()" class="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center gap-1">
        <i class="ri-aspect-ratio-line"></i>${t('vmResize')}
      </button>
      <div class="flex-1"></div>
      <input id="vm2-title" type="text" value="Untitled1"
        class="text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none dark:text-white px-2 w-48 text-center"
        onchange="vm2HandleTitleChange(this.value)">
      <span id="vm2-save-status" class="text-xs text-gray-400">${t('vmNotSaved')}</span>
      <div class="flex-1"></div>
      <select id="vm2-zoom-select" onchange="vm2SetCanvasZoom(this.value)" class="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300">
        <option value="0.5">50%</option>
        <option value="0.75">75%</option>
        <option value="1">100%</option>
        <option value="1.5">150%</option>
        <option value="fit" selected>Fit</option>
      </select>
      <button onclick="vm2ReturnToBrowser()" class="px-3 py-1.5 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 flex items-center gap-1">
        <i class="ri-folder-open-line"></i>${t('vmBrowse')}
      </button>
      <button onclick="vm2SaveProject()" class="px-3 py-1.5 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 flex items-center gap-1">
        <i class="ri-save-line"></i>${t('vmSaveRevision')}
      </button>
      <button onclick="vm2ShowHistory()" class="px-3 py-1.5 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 flex items-center gap-1">
        <i class="ri-history-line"></i>${t('vmHistoryBtn')}
      </button>
      <button onclick="vm2Export()" class="px-3 py-1.5 rounded text-xs bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1 font-medium">
        <i class="ri-download-line"></i>${t('export')}
      </button>
    </div>

    <div id="vm2-readonly-banner" class="hidden px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-700 text-sm flex items-center gap-3 flex-shrink-0">
      <i class="ri-eye-line"></i>
      <span id="vm2-readonly-label" class="flex-1">${t('vmPreviewingSavedRevision')}</span>
      <button onclick="vm2ExitRevisionPreview()" class="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-xs font-medium">${t('vmBackToCurrent')}</button>
    </div>

    <!-- ═══ MAIN BODY (3 panels) ═══ -->
    <div class="flex flex-1 min-h-0 overflow-hidden">

      <!-- ── LEFT: Steps Panel ────────────────────────────── -->
      <div class="w-48 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div class="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span>${t('vmStepsPanel')}</span>
          <span id="vm2-step-count" class="text-gray-400 font-normal text-xs">0</span>
        </div>
        <div id="vm2-steps-list" class="flex-1 overflow-y-auto p-2 space-y-1"></div>
        <div class="p-2 border-t border-gray-100 dark:border-gray-700">
          <button onclick="vm2AddStep()" class="w-full py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 flex items-center justify-center gap-1">
            <i class="ri-add-line"></i>${t('vmAddStep')}
          </button>
        </div>
      </div>

      <!-- ── CENTER: Canvas + Timeline ────────────────────── -->
      <div class="flex-1 flex flex-col min-w-0 bg-gray-200 dark:bg-gray-950">

        <!-- Upload Zone (shown when no video) -->
        <div id="vm2-upload-zone" class="flex-1 flex items-center justify-center gap-6 p-8 flex-wrap">
          <!-- Option A: upload a new video -->
          <div class="text-center p-10 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors"
               onclick="vm2Get('vm2-file-input').click()"
               ondragover="event.preventDefault(); this.classList.add('border-blue-400')"
               ondragleave="this.classList.remove('border-blue-400')"
               ondrop="vm2HandleDrop(event)">
            <i class="ri-video-upload-line text-5xl text-gray-400 mb-3 block"></i>
            <p class="text-gray-600 dark:text-gray-300 font-medium">${t('vmUploadAVideo')}</p>
            <p class="text-gray-400 text-sm mt-1">${t('vmClickOrDragDrop')}</p>
          </div>
          <!-- Divider -->
          <div class="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-600 select-none">
            <div class="w-px h-10 bg-gray-300 dark:bg-gray-600"></div>
            <span class="text-xs">or</span>
            <div class="w-px h-10 bg-gray-300 dark:bg-gray-600"></div>
          </div>
          <!-- Option B: pick from playlist library -->
          <div class="text-center p-10 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 cursor-pointer transition-colors"
               onclick="vm2ShowAssetPicker()">
            <i class="ri-film-line text-5xl text-gray-400 mb-3 block"></i>
            <p class="text-gray-600 dark:text-gray-300 font-medium">${t('vmPickFromLibrary')}</p>
            <p class="text-gray-400 text-sm mt-1">${t('vmReuseSharedVideo')}</p>
          </div>
          <input id="vm2-file-input" type="file" accept="video/*" class="hidden" onchange="vm2HandleFileSelect(event)">
        </div>

        <!-- Player Area (hidden until video loaded) -->
        <div id="vm2-player-area" class="hidden flex-1 flex flex-col min-h-0 relative">
          
          <!-- Canvas Container -->
          <div id="vm2-canvas-outer" class="flex-1 flex items-center justify-center overflow-auto p-4 bg-gray-800 dark:bg-black"
            onmousedown="vm2OnCanvasMouseDown(event)"
               ondragover="vm2CanvasDragOver(event)"
               ondragleave="vm2CanvasDragLeave(event)"
               ondrop="vm2CanvasDrop(event)">
            <div id="vm2-canvas-viewport" class="relative flex-shrink-0">
              <div id="vm2-canvas-wrapper" class="relative bg-black shadow-2xl" style="transform-origin: top left;">
                <canvas id="vm2-preview-canvas" class="absolute inset-0 pointer-events-none"></canvas>
                <div id="vm2-debug-video-rect" class="absolute pointer-events-none"></div>
                <video id="vm2-video" class="absolute pointer-events-none opacity-0"></video>
                <div id="vm2-media-cache" class="hidden"></div>
                <!-- Elements overlay container -->
                <div id="vm2-elements-container" class="absolute inset-0 pointer-events-none" style="overflow: hidden;">
                  <!-- Dynamic elements rendered here -->
                </div>
                <!-- Selection handles overlay -->
                <div id="vm2-selection-overlay" class="absolute inset-0 pointer-events-none"></div>
              </div>
            </div>
          </div>

          <div id="vm2-loading-overlay" class="hidden absolute inset-0 z-20 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
            <div class="flex flex-col items-center gap-3 rounded-2xl bg-slate-900/90 px-6 py-5 text-white shadow-2xl">
              <div class="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-sky-400"></div>
              <div class="text-center">
                <p class="text-sm font-medium">${t('vmPreparingEditor')}</p>
                <p id="vm2-loading-text" class="mt-1 text-xs text-slate-300">${t('vmLoadingVideo')}</p>
              </div>
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
                 onmousedown="vm2OnTimelineMouseDown(event)">
              
              <!-- Time Ruler -->
              <div id="vm2-time-ruler" class="sticky top-0 h-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-10"></div>
              
              <!-- Tracks Container -->
              <div id="vm2-tracks" class="relative" style="min-height: 150px;">
                <!-- Element Tracks (at top) -->
                <div id="vm2-element-tracks" class="relative" style="z-index: 5; min-height: 80px;"></div>
                <!-- Video/Steps Track (at bottom) -->
                <div id="vm2-video-track" class="relative" style="z-index: 1; height: 32px; margin-top: 12px; margin-bottom: 8px;">
                  <div id="vm2-step-segments" class="h-full"></div>
                </div>
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
          <button id="vm2-tab-elements" onclick="vm2SwitchTab('elements')" class="flex-1 py-2 text-xs font-medium text-blue-500 border-b-2 border-blue-500">${t('vmElementsTab')}</button>
          <button id="vm2-tab-properties" onclick="vm2SwitchTab('properties')" class="flex-1 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">${t('vmPropertiesTab')}</button>
        </div>

        <!-- Elements Panel -->
        <div id="vm2-panel-elements" class="flex-1 overflow-y-auto p-3">
          
          <!-- Text -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">${t('vmTextSection')}</p>
            <div class="grid grid-cols-2 gap-2">
              <button draggable="true"
                ondragstart="vm2ElementPanelDragStart(event,'text','title')"
                onclick="vm2AddElement('text','title')"
                class="py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs font-medium text-gray-700 dark:text-gray-200 cursor-grab active:cursor-grabbing select-none"
                title="Drag onto canvas or click to add">${t('vmTitleElement')}</button>
              <button draggable="true"
                ondragstart="vm2ElementPanelDragStart(event,'text','body')"
                onclick="vm2AddElement('text','body')"
                class="py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300 cursor-grab active:cursor-grabbing select-none"
                title="Drag onto canvas or click to add">${t('vmBodyText')}</button>
            </div>
          </div>

          <!-- Shapes -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">${t('vmShapesSection')}</p>
            <div class="grid grid-cols-4 gap-2">
              <button draggable="true"
                ondragstart="vm2ElementPanelDragStart(event,'shape','rect')"
                onclick="vm2AddElement('shape','rect')"
                class="aspect-square bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center justify-center cursor-grab active:cursor-grabbing select-none" title="Drag or click to add Rectangle">
                <div class="w-6 h-5 bg-gray-800 dark:bg-gray-200 rounded-sm pointer-events-none"></div>
              </button>
              <button draggable="true"
                ondragstart="vm2ElementPanelDragStart(event,'shape','circle')"
                onclick="vm2AddElement('shape','circle')"
                class="aspect-square bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center justify-center cursor-grab active:cursor-grabbing select-none" title="Drag or click to add Circle">
                <div class="w-6 h-6 bg-gray-800 dark:bg-gray-200 rounded-full pointer-events-none"></div>
              </button>
              <button draggable="true"
                ondragstart="vm2ElementPanelDragStart(event,'shape','arrow')"
                onclick="vm2ActivateShapeDraw('arrow')"
                class="aspect-square bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center justify-center cursor-grab active:cursor-grabbing select-none" title="Click, then drag on preview to draw Arrow">
                <i class="ri-arrow-right-up-line text-lg text-gray-800 dark:text-gray-200 pointer-events-none"></i>
              </button>
              <button draggable="true"
                ondragstart="vm2ElementPanelDragStart(event,'shape','line')"
                onclick="vm2ActivateShapeDraw('line')"
                class="aspect-square bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex items-center justify-center cursor-grab active:cursor-grabbing select-none" title="Click, then drag on preview to draw Line">
                <div class="w-6 h-0.5 bg-gray-800 dark:bg-gray-200 rotate-45 pointer-events-none"></div>
              </button>
            </div>
          </div>

          <!-- Images -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">${t('vmImagesSection')}</p>
            <button onclick="vm2Get('vm2-image-input').click()" class="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
              <i class="ri-image-add-line"></i>${t('vmUploadImage')}
            </button>
            <input id="vm2-image-input" type="file" accept="image/*" class="hidden" onchange="vm2HandleImageUpload(event)">
          </div>

          <!-- Audio -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">${t('vmAudioSection')}</p>
            <button onclick="vm2Get('vm2-audio-input').click()" class="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
              <i class="ri-music-add-line"></i>${t('vmUploadAudio')}
            </button>
            <input id="vm2-audio-input" type="file" accept="audio/*" class="hidden" onchange="vm2HandleAudioUpload(event)">
          </div>

          <!-- Step Elements List -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">${t('vmCurrentStepElements')}</p>
            <div id="vm2-elements-list" class="space-y-1 text-xs"></div>
          </div>
        </div>

        <!-- Properties Panel -->
        <div id="vm2-panel-properties" class="hidden flex-1 overflow-y-auto p-3">
          <div id="vm2-props-content">
            <p class="text-xs text-gray-400 italic text-center py-8">${t('vmSelectElementToEdit')}</p>
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
        <button onclick="vm2MatchVideoSize()" class="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm flex items-center justify-center gap-2">
          <i class="ri-aspect-ratio-line"></i>Match Video Size (No Stretch)
        </button>
      </div>
      <div class="flex gap-2 mt-4">
        <button onclick="vm2Get('vm2-modal-canvas').classList.add('hidden')" class="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-sm text-gray-600 dark:text-gray-300">Cancel</button>
        <button onclick="vm2ApplyCanvasSize()" class="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm">Apply</button>
      </div>
    </div>
  </div>

  <!-- Upload Modal -->
  <div id="vm2-modal-upload" class="hidden fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-5 w-80 shadow-2xl text-center">
      <i class="ri-cloud-upload-line text-5xl text-blue-500 mb-2 block"></i>
      <p id="vm2-upload-msg" class="font-semibold text-gray-800 dark:text-white text-sm mb-3">Uploading video…</p>
      <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
        <div id="vm2-upload-bar" class="bg-blue-500 h-2 rounded-full transition-all duration-300" style="width:0%"></div>
      </div>
      <p id="vm2-upload-detail" class="text-xs text-gray-400">This may take a moment</p>
      <button onclick="vm2CancelUpload()" class="mt-4 w-full py-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg hover:bg-red-100 text-sm">Cancel Upload</button>
    </div>
  </div>

  <!-- Export Modal -->
  <div id="vm2-modal-export" class="hidden fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-5 w-96 shadow-2xl">
      <h3 id="vm2-export-title" class="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
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
          <span id="vm2-export-done-label" class="font-medium">Export Complete!</span>
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

  <!-- Asset Library Picker Modal -->
  <div id="vm2-modal-assets" class="hidden fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-5 w-[640px] max-h-[75vh] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 class="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <i class="ri-film-line text-violet-500"></i>Playlist Asset Library
        </h3>
        <button onclick="vm2CloseAssetPicker()" class="text-gray-400 hover:text-gray-600">
          <i class="ri-close-line text-xl"></i>
        </button>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-shrink-0">Pick an existing video to use in this project. Shared uploads stay in the library, and unused ones can be deleted here.</p>
      <div id="vm2-assets-list" class="flex-1 overflow-y-auto grid grid-cols-2 gap-3 content-start"></div>
    </div>
  </div>

  <!-- Add Clip Modal -->
  <div id="vm2-modal-add-clip" class="hidden fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-5 w-[420px] shadow-2xl">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <i class="ri-add-circle-line text-sky-500"></i>Add Clip
        </h3>
        <button onclick="vm2CloseAddClipChooser()" class="text-gray-400 hover:text-gray-600">
          <i class="ri-close-line text-xl"></i>
        </button>
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Append another video clip to the end of the timeline.</p>
      <div class="grid grid-cols-2 gap-3">
        <button onclick="vm2ChooseAddClipUpload()" class="rounded-xl border border-slate-200 dark:border-gray-700 px-4 py-4 text-sm font-medium text-slate-700 dark:text-gray-200 hover:border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/20">
          <i class="ri-video-upload-line mr-1"></i>Upload Video
        </button>
        <button onclick="vm2ChooseAddClipLibrary()" class="rounded-xl border border-slate-200 dark:border-gray-700 px-4 py-4 text-sm font-medium text-slate-700 dark:text-gray-200 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20">
          <i class="ri-film-line mr-1"></i>Pick From Library
        </button>
      </div>
      <button onclick="vm2CloseAddClipChooser()" class="w-full py-2 mt-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-sm text-gray-600 dark:text-gray-300">Cancel</button>
    </div>
  </div>

  <!-- Revision History Modal -->
  <div id="vm2-modal-history" class="hidden fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-5 w-[540px] max-h-[70vh] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 class="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <i class="ri-history-line text-blue-500"></i>${t('vmRevisionHistory')}
        </h3>
        <button onclick="vm2Get('vm2-modal-history').classList.add('hidden')" class="text-gray-400 hover:text-gray-600">
          <i class="ri-close-line text-xl"></i>
        </button>
      </div>
      <div id="vm2-history-meta" class="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300"></div>
      <div id="vm2-history-list" class="flex-1 overflow-y-auto space-y-2"></div>
    </div>
  </div>

  <style>
    #vm2-root { font-family: system-ui, -apple-system, sans-serif; }
    #vm2-canvas-outer.vm2-drop-active { outline: 3px dashed #3b82f6; outline-offset: -3px; }
    #vm2-canvas-outer.vm2-drop-active #vm2-canvas-wrapper { outline: 2px solid #3b82f6; outline-offset: 1px; }
    #vm2-timeline-scroll,
    #vm2-time-ruler,
    #vm2-tracks,
    #vm2-step-segments,
    #vm2-element-tracks {
      user-select: none;
      -webkit-user-select: none;
    }
    body.vm2-no-select,
    body.vm2-no-select * {
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    #vm2-canvas-outer.vm2-draw-mode,
    #vm2-canvas-outer.vm2-draw-mode * {
      cursor: crosshair !important;
    }
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
    .vm2-rotation-stem {
      position: absolute;
      left: 50%;
      top: -28px;
      width: 2px;
      height: 18px;
      background: #3b82f6;
      transform: translateX(-50%);
      pointer-events: none;
    }
    .vm2-rotation-handle {
      position: absolute;
      left: 50%;
      top: -36px;
      width: 14px;
      height: 14px;
      border-radius: 9999px;
      background: white;
      border: 2px solid #3b82f6;
      transform: translateX(-50%);
      pointer-events: auto;
      cursor: grab;
    }
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
    .vm2-step-seg .resize-left,
    .vm2-step-seg .resize-right {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 8px;
      cursor: ew-resize;
      background: rgba(255,255,255,0.3);
      opacity: 0;
      transition: opacity 0.15s;
    }
    .vm2-step-seg:hover .resize-left,
    .vm2-step-seg:hover .resize-right { opacity: 1; }
    .vm2-step-seg .resize-left { left: 0; border-radius: 4px 0 0 4px; }
    .vm2-step-seg .resize-right { right: 0; border-radius: 0 4px 4px 0; }
    #vm2-timeline-scroll {
      scrollbar-color: #94a3b8 #e5e7eb;
      scrollbar-width: auto;
    }
    #vm2-timeline-scroll::-webkit-scrollbar { height: 12px; }
    #vm2-timeline-scroll::-webkit-scrollbar-track {
      background: #e5e7eb;
      border-radius: 9999px;
    }
    #vm2-timeline-scroll::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #94a3b8 0%, #64748b 100%);
      border: 2px solid #e5e7eb;
      border-radius: 9999px;
    }
    #vm2-timeline-scroll::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, #64748b 0%, #475569 100%);
    }
  </style>
  `;

  vm2InitManagedMedia();
  vm2SyncTrashUiState();
  vm2SetSaveStatus(vm2.project?._id ? t('vmNotSaved') : t('vmNotSaved'));
  vm2UpdateUndoRedoButtons();
}

function loadVideoManual2Page() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  main.innerHTML = `
    <div id="vm2-browser-screen" class="min-h-[calc(100vh-120px)] rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-sky-50 p-5 dark:from-gray-900 dark:via-gray-900 dark:to-slate-950">
      <div class="mx-auto flex h-full max-w-7xl flex-col gap-5">
        <div class="flex flex-col gap-4 rounded-[28px] border border-white/60 bg-white/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
          <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">${t('vmVideoManualLibrary')}</p>
              <h2 class="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">${t('vmPlaylistsAndProjects')}</h2>
              <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">${t('vmPlaylistsAndProjectsSubtitle')}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button onclick="vm2LoadPlaylists()" class="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                <i class="ri-refresh-line mr-1"></i>${t('refresh')}
              </button>
              <button onclick="vm2ToggleTrashView()" id="vm2-trash-btn" class="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <i class="ri-delete-bin-line mr-1"></i>${t('vmRecycleBin')}
              </button>
              <button id="vm2-create-playlist-btn" onclick="vm2CreatePlaylist()" class="hidden rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-sky-500 dark:hover:bg-sky-400">
                <i class="ri-stack-line mr-1"></i>${t('vmNewPlaylist')}
              </button>
              <button id="vm2-create-project-btn" onclick="vm2CreateProject()" class="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-gray-700">
                <i class="ri-add-circle-line mr-1"></i>${t('vmNewProject')}
              </button>
            </div>
          </div>
        </div>

        <div class="grid min-h-[620px] gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section class="rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
            <div class="mb-4 flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">${t('vmPlaylistsSection')}</p>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">${t('vmModelGroupsSubtitle')}</p>
              </div>
            </div>
            <div class="mb-4">
              <label for="vm2-playlist-search" class="sr-only">Search playlists</label>
              <div class="relative">
                <i class="ri-search-line pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input id="vm2-playlist-search" type="search" value="${vm2EscapeHtml(vm2.playlistSearchQuery || '')}" oninput="vm2SetPlaylistSearch(this.value)" placeholder="${t('vmSearchPlaylistsPlaceholder')}" class="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              </div>
            </div>
            <div id="vm2-playlist-list" class="space-y-3"></div>
          </section>

          <section class="rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
            <div class="mb-5 flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-gray-800 md:flex-row md:items-end md:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">${t('vmProjectsSection')}</p>
                <h3 id="vm2-browser-project-title" class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">${t('vmSelectAPlaylist')}</h3>
                <p id="vm2-playlist-meta" class="mt-1 text-sm text-slate-500 dark:text-slate-400">${t('vmChoosePlaylistToBrowse')}</p>
                <div id="vm2-browser-playlist-actions" class="hidden mt-3 flex flex-wrap gap-2"></div>
              </div>
            </div>
            <div id="vm2-browser-project-empty" class="rounded-[24px] border border-dashed border-slate-300 px-6 py-14 text-center dark:border-gray-700">
              <i class="ri-folder-open-line text-4xl text-slate-300 dark:text-gray-600"></i>
              <p class="mt-4 text-base font-medium text-slate-700 dark:text-slate-200">${t('vmNoPlaylistSelected')}</p>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">${t('vmPickPlaylistLeft')}</p>
            </div>
            <div id="vm2-browser-project-list" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"></div>

            <!-- Trash panel (hidden by default) -->
            <div id="vm2-trash-panel" class="hidden">
              <div class="mb-4 flex items-center gap-3">
                <i class="ri-delete-bin-2-line text-xl text-red-400"></i>
                <div>
                  <p class="text-sm font-semibold text-slate-800 dark:text-white">${t('vmRecycleBin')}</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">${t('vmDeletedProjectsKept')}</p>
                </div>
              </div>
              <div id="vm2-trash-list" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"></div>
            </div>
          </section>
        </div>
      </div>
    </div>
    <div id="vm2-editor-host" class="hidden"></div>

    <div id="vm2-modal-project-info" class="hidden fixed inset-0 z-[320] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-lg rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_30px_120px_-40px_rgba(15,23,42,0.45)] dark:border-gray-700 dark:bg-gray-900">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">${t('vmProjectInfo')}</p>
            <h3 class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white truncate" data-info="title"></h3>
            <span data-info="status" class="mt-2 inline-block"></span>
          </div>
          <button onclick="vm2CloseProjectInfoModal()" class="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-gray-800 dark:hover:text-gray-200">
            <i class="ri-close-line text-lg"></i>
          </button>
        </div>

        <div class="mt-5 space-y-3">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmDescriptionLabel')}</p>
            <p class="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap" data-info="description"></p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmCurrentRevision')}</p>
              <p class="mt-1 text-sm text-slate-700 dark:text-slate-300" data-info="revision"></p>
            </div>
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmStepsLabel')}</p>
              <p class="mt-1 text-sm text-slate-700 dark:text-slate-300" data-info="steps"></p>
            </div>
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmCreatedBy')}</p>
              <p class="mt-1 text-sm text-slate-700 dark:text-slate-300" data-info="creator"></p>
            </div>
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmCreatedAtLabel')}</p>
              <p class="mt-1 text-sm text-slate-700 dark:text-slate-300" data-info="created"></p>
            </div>
            <div class="col-span-2">
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmLastUpdated')}</p>
              <p class="mt-1 text-sm text-slate-700 dark:text-slate-300" data-info="updated"></p>
            </div>
            <div class="col-span-2">
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmDeployedLabel')}</p>
              <p class="mt-1 text-sm text-slate-700 dark:text-slate-300" data-info="deploy"></p>
            </div>
          </div>
        </div>

        <div class="mt-6">
          <button onclick="vm2CloseProjectInfoModal()" class="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 transition hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">${t('vmClose')}</button>
        </div>
      </div>
    </div>

    <div id="vm2-modal-edit-project" class="hidden fixed inset-0 z-[320] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-lg rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_30px_120px_-40px_rgba(15,23,42,0.45)] dark:border-gray-700 dark:bg-gray-900">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">${t('vmEditProject')}</p>
            <h3 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">${t('vmUpdateProjectDetails')}</h3>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">${t('vmBanchoAndAbove')}</p>
          </div>
          <button onclick="vm2CloseEditProjectModal()" class="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-gray-800 dark:hover:text-gray-200">
            <i class="ri-close-line text-lg"></i>
          </button>
        </div>

        <div class="mt-6 space-y-4">
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmTitleLabel')}</label>
            <input id="vm2-edit-project-title" type="text" oninput="vm2SyncEditProjectSubmitState()" placeholder="${t('vmProjectTitlePlaceholder')}" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmDescriptionLabel')}</label>
            <textarea id="vm2-edit-project-description" rows="4" placeholder="${t('vmDescribeProjectPlaceholder')}" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none"></textarea>
          </div>

          <p id="vm2-edit-project-error" class="min-h-[1.25rem] text-sm text-red-500"></p>
        </div>

        <div class="mt-6 flex gap-3">
          <button onclick="vm2CloseEditProjectModal()" class="flex-1 py-2 rounded border border-slate-200 bg-white text-sm text-slate-600 transition hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">${t('cancel')}</button>
          <button id="vm2-edit-project-submit" onclick="vm2SubmitEditProject()" class="flex-1 py-2 rounded text-sm text-white bg-slate-300 cursor-not-allowed dark:bg-gray-700" disabled>${t('vmSaveChanges')}</button>
        </div>
      </div>
    </div>

    <div id="vm2-modal-create-project" class="hidden fixed inset-0 z-[320] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-lg rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_30px_120px_-40px_rgba(15,23,42,0.45)] dark:border-gray-700 dark:bg-gray-900">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">${t('vmNewProjectLabel')}</p>
            <h3 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">${t('vmCreateProjectSubtitle')}</h3>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">${t('vmCreateProjectInfo')}</p>
          </div>
          <button onclick="vm2CloseCreateProjectModal()" class="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-gray-800 dark:hover:text-gray-200">
            <i class="ri-close-line text-lg"></i>
          </button>
        </div>

        <div class="mt-6 space-y-4">
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmTitleLabel')}</label>
            <input id="vm2-create-project-title" type="text" oninput="vm2SyncCreateProjectSubmitState()" placeholder="${t('vmProjectTitleExamplePlaceholder')}" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmDescriptionLabel')}</label>
            <textarea id="vm2-create-project-description" rows="4" placeholder="${t('vmDescribeProjectPlaceholder')}" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none"></textarea>
          </div>

          <p id="vm2-create-project-error" class="min-h-[1.25rem] text-sm text-red-500"></p>
        </div>

        <div class="mt-6 flex gap-3">
          <button onclick="vm2CloseCreateProjectModal()" class="flex-1 py-2 rounded border border-slate-200 bg-white text-sm text-slate-600 transition hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">${t('cancel')}</button>
          <button id="vm2-create-project-submit" onclick="vm2SubmitCreateProject()" class="flex-1 py-2 rounded text-sm text-white bg-slate-300 cursor-not-allowed dark:bg-gray-700" disabled>${t('vmCreateProjectBtn')}</button>
        </div>
      </div>
    </div>

    <div id="vm2-modal-create-playlist" class="hidden fixed inset-0 z-[320] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-lg rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_30px_120px_-40px_rgba(15,23,42,0.45)] dark:border-gray-700 dark:bg-gray-900">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">${t('vmNewPlaylistLabel')}</p>
            <h3 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">${t('vmCreatePlaylistSubtitle')}</h3>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">${t('vmCreatePlaylistInfo')}</p>
          </div>
          <button onclick="vm2CloseCreatePlaylistModal()" class="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-gray-800 dark:hover:text-gray-200">
            <i class="ri-close-line text-lg"></i>
          </button>
        </div>

        <div class="mt-6 space-y-4">
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmModelLabel')}</label>
            <select id="vm2-create-playlist-model" onchange="vm2OnCreatePlaylistModelChange()" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">${t('vmLoadingModels')}</option>
            </select>
            <p id="vm2-create-playlist-model-loading" class="mt-2 text-xs text-slate-400">${t('vmLoadingModels')}</p>
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmTitleLabel')}</label>
            <input id="vm2-create-playlist-title" type="text" oninput="vm2OnCreatePlaylistTitleInput()" placeholder="${t('vmPlaylistTitlePlaceholder')}" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmDescriptionLabel')}</label>
            <textarea id="vm2-create-playlist-description" rows="4" placeholder="${t('vmOptionalDescriptionPlaceholder')}" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none"></textarea>
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmPrivacyLabel')}</label>
            <select id="vm2-create-playlist-privacy" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="internal">${t('vmInternalOption')}</option>
              <option value="public">${t('vmPublicOption')}</option>
              <option value="private">${t('vmPrivateOption')}</option>
            </select>
          </div>

          <p id="vm2-create-playlist-error" class="min-h-[1.25rem] text-sm text-red-500"></p>
        </div>

        <div class="mt-6 flex gap-3">
          <button onclick="vm2CloseCreatePlaylistModal()" class="flex-1 py-2 rounded border border-slate-200 bg-white text-sm text-slate-600 transition hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">${t('cancel')}</button>
          <button id="vm2-create-playlist-submit" onclick="vm2SubmitCreatePlaylist()" class="flex-1 py-2 rounded text-sm text-white bg-slate-300 cursor-not-allowed dark:bg-gray-700" disabled>${t('vmCreatePlaylistBtn')}</button>
        </div>
      </div>
    </div>

    <div id="vm2-modal-edit-playlist" class="hidden fixed inset-0 z-[320] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-lg rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_30px_120px_-40px_rgba(15,23,42,0.45)] dark:border-gray-700 dark:bg-gray-900">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">${t('vmEditPlaylistLabel')}</p>
            <h3 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">${t('vmUpdatePlaylistDetails')}</h3>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">${t('vmKachoAndAbove')}</p>
          </div>
          <button onclick="vm2CloseEditPlaylistModal()" class="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-gray-800 dark:hover:text-gray-200">
            <i class="ri-close-line text-lg"></i>
          </button>
        </div>

        <div class="mt-6 space-y-4">
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmModelLabel')}</label>
            <select id="vm2-edit-playlist-model" onchange="vm2OnEditPlaylistModelChange()" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">${t('vmLoadingModels')}</option>
            </select>
            <p id="vm2-edit-playlist-model-loading" class="mt-2 text-xs text-slate-400">${t('vmLoadingModels')}</p>
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmTitleLabel')}</label>
            <input id="vm2-edit-playlist-title" type="text" oninput="vm2OnEditPlaylistTitleInput()" placeholder="${t('vmPlaylistTitlePlaceholder')}" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">${t('vmDescriptionLabel')}</label>
            <textarea id="vm2-edit-playlist-description" rows="4" placeholder="${t('vmPlaylistDescriptionPlaceholder')}" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none"></textarea>
          </div>

          <p id="vm2-edit-playlist-error" class="min-h-[1.25rem] text-sm text-red-500"></p>
        </div>

        <div class="mt-6 flex gap-3">
          <button onclick="vm2CloseEditPlaylistModal()" class="flex-1 py-2 rounded border border-slate-200 bg-white text-sm text-slate-600 transition hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">${t('cancel')}</button>
          <button id="vm2-edit-playlist-submit" onclick="vm2SubmitEditPlaylist()" class="flex-1 py-2 rounded text-sm text-white bg-slate-300 cursor-not-allowed dark:bg-gray-700" disabled>${t('vmSaveChanges')}</button>
        </div>
      </div>
    </div>
  `;

  vm2.project = vm2CreateEmptyProject();
  vm2.currentStepIdx = 0;
  vm2.selectedElementId = null;
  vm2.playing = false;
  vm2.videoRect = null;
  vm2.dirty = false;
  vm2.isAutosaving = false;
  vm2.lastSavedAt = null;
  vm2.uploadXhr = null;
  vm2.uploadInProgress = false;
  vm2.mediaInsertMode = null;
  vm2.pendingMediaSwitch = null;
  vm2.loadingProject = false;
  vm2.activeVideoEl = null;
  vm2.activeMediaKey = '';
  vm2.mediaCache = new Map();
  vm2.mediaPreloadQueue = [];
  vm2.mediaPreloading = false;
  vm2.revisionPreview = null;
  vm2._projectsList = [];
  vm2._editorMounted = false;
  vm2StopPreviewLoop();
  vm2StartAutosaveLoop();
  vm2ShowBrowserScreen();
  vm2LoadPlaylists();
}

// ═══════════════════════════════════════════════════════════════════════════
//  FILE HANDLING
// ═══════════════════════════════════════════════════════════════════════════

function vm2HandleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    vm2LoadVideo(file);
  } else if (vm2.mediaInsertMode === 'append') {
    vm2.mediaInsertMode = null;
  }
  event.target.value = '';
}

function vm2HandleDrop(event) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('video/')) vm2LoadVideo(file);
}

async function vm2LoadVideo(file) {
  if (vm2.mediaInsertMode === 'append') {
    await vm2UploadVideoAsset(file);
    return;
  }

  if (!vm2EnsureProject()) return;
  if (!vm2EnsureEditable()) return;
  if (vm2.uploadInProgress) {
    alert('Please wait for the current upload to finish or cancel it first.');
    return;
  }

  if (vm2.project.videoLocalUrl) {
    URL.revokeObjectURL(vm2.project.videoLocalUrl);
  }

  const url = URL.createObjectURL(file);
  vm2.project.videoBlob = file;
  vm2.project.videoLocalUrl = url;
  vm2.project.videoUrl = null;
  vm2.project.currentAssetId = null;
  vm2.project.assets = [];
  vm2.project.steps = [];
  vm2.currentStepIdx = 0;
  vm2.selectedElementId = null;

  vm2SetVideoSource(url, { local: true });

  vm2Get('vm2-upload-zone').classList.add('hidden');
  vm2Get('vm2-player-area').classList.remove('hidden');

  vm2SetSaveStatus('Local preview ready · uploading video…', 'blue');
  vm2UploadVideoAsset(file);
}

function vm2CloseAssetPicker() {
  vm2Get('vm2-modal-assets')?.classList.add('hidden');
  if (vm2.mediaInsertMode === 'append') vm2.mediaInsertMode = null;
}

function vm2OpenAddClipChooser() {
  if (!vm2EnsureProject() || !vm2EnsureEditable()) return;
  if (!vm2.project?.steps?.length) {
    alert('Load the first video before appending another clip.');
    return;
  }
  vm2.mediaInsertMode = 'append';
  vm2Get('vm2-modal-add-clip')?.classList.remove('hidden');
}

function vm2CloseAddClipChooser() {
  vm2Get('vm2-modal-add-clip')?.classList.add('hidden');
  if (vm2.mediaInsertMode === 'append') vm2.mediaInsertMode = null;
}

function vm2ChooseAddClipUpload() {
  vm2Get('vm2-modal-add-clip')?.classList.add('hidden');
  vm2Get('vm2-file-input')?.click();
}

function vm2ChooseAddClipLibrary() {
  vm2Get('vm2-modal-add-clip')?.classList.add('hidden');
  vm2ShowAssetPicker();
}

async function vm2AppendClipAsset(asset) {
  if (!vm2EnsureProject() || !vm2EnsureEditable()) return;

  const assetId = asset.assetId || asset._id;
  const assetUrl = asset.downloadUrl || asset.url;
  if (!assetId || !assetUrl) throw new Error('Clip asset is missing an id or URL');

  if (!Array.isArray(vm2.project.assets)) vm2.project.assets = [];
  if (!vm2.project.assets.some((item) => String(item.assetId || item._id) === String(assetId))) {
    vm2.project.assets.push(asset);
  }

  const meta = await vm2LoadVideoMetadata(assetUrl, { local: vm2IsBlobUrl(assetUrl) });
  const clipDuration = meta.duration || 0;
  if (!clipDuration) throw new Error('Could not determine clip duration');

  const startTime = vm2.duration || vm2.project.duration || 0;
  const newStep = {
    id: vm2Id().replace('el_', 'step_'),
    label: `Step ${vm2.project.steps.length + 1}`,
    description: '',
    startTime,
    endTime: startTime + clipDuration,
    sourceStart: 0,
    sourceEnd: clipDuration,
    assetId,
    muted: false,
    elements: [],
  };

  vm2.project.steps.push(newStep);
  vm2.project.duration = newStep.endTime;
  vm2.duration = newStep.endTime;
  vm2.currentStepIdx = vm2.project.steps.length - 1;
  vm2.selectedElementId = null;

  vm2MarkDirty('Clip added');
  await vm2PersistWorkingProject({ silent: true, reason: 'Added clip' });
  vm2QueueProjectMediaPreloads(vm2.project);
  void vm2PreloadProjectMedia();
  vm2SeekTo(newStep.startTime);
  vm2RenderSteps();
  vm2RenderTimeline();
  vm2RenderElements();
  vm2RenderElementsList();
  vm2RenderProps();
}

// ═══════════════════════════════════════════════════════════════════════════
//  TRASH PREVIEW  (isolated — never touches main editor DOM)
// ═══════════════════════════════════════════════════════════════════════════

const vm2TP = {
  project: null,
  stepIdx: 0,
  raf: null,
  videoRect: null,
  activeVideoEl: null,
  activeMediaKey: '',
  mediaCache: null,
  mediaPreloadQueue: [],
  mediaPreloading: false,
  pendingSwitch: null,
};

function vm2TpGet(id) { return document.getElementById(id); }
const vm2TpPrimaryVideo = () => vm2TpGet('vm2-tp-video');
const vm2TpVideo   = () => vm2TP.activeVideoEl || vm2TpPrimaryVideo();
const vm2TpCanvas  = () => vm2TpGet('vm2-tp-canvas');
const vm2TpWrapper = () => vm2TpGet('vm2-tp-canvas-wrapper');

function vm2TpMediaHost() {
  return vm2TpGet('vm2-tp-media-cache');
}

function vm2TpEnsureMediaCache() {
  if (!(vm2TP.mediaCache instanceof Map)) vm2TP.mediaCache = new Map();
  return vm2TP.mediaCache;
}

function vm2TpClearMedia() {
  const primaryVideo = vm2TpPrimaryVideo();
  const cache = vm2TpEnsureMediaCache();
  cache.forEach((entry) => {
    const video = entry.video;
    if (!video) return;
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (video !== primaryVideo) video.remove();
  });
  cache.clear();
  vm2TP.activeVideoEl = primaryVideo || null;
  vm2TP.activeMediaKey = '';
  vm2TP.mediaPreloadQueue = [];
  vm2TP.mediaPreloading = false;
  vm2TP.pendingSwitch = null;
}

function vm2TpAttachVideo(video) {
  if (!video || video.dataset.vm2tpBound === '1') return;
  video.dataset.vm2tpBound = '1';
  video.playsInline = true;
  video.preload = 'auto';
  video.addEventListener('loadedmetadata', () => {
    const entry = vm2TpEnsureMediaCache().get(video.dataset.sourceKey || '');
    if (entry) entry.metadataReady = true;
    if (video !== vm2TpVideo()) return;
    vm2TrashPreviewOnLoaded();
  });
  video.addEventListener('timeupdate', () => {
    if (video !== vm2TpVideo()) return;
    vm2TrashPreviewOnTimeUpdate();
  });
}

function vm2TpCreateVideo() {
  const video = document.createElement('video');
  video.className = 'absolute pointer-events-none opacity-0';
  video.style.left = '0';
  video.style.top = '0';
  vm2TpAttachVideo(video);
  vm2TpMediaHost()?.appendChild(video);
  return video;
}

function vm2TpInitManagedMedia() {
  const primaryVideo = vm2TpPrimaryVideo();
  if (!primaryVideo) return;
  vm2TpAttachVideo(primaryVideo);
  vm2TP.activeVideoEl = primaryVideo;
  vm2TpEnsureMediaCache();
}

function vm2TpEnsureEntry(url, { sourceKey = '', local = false, usePrimary = false } = {}) {
  if (!url) return null;
  const key = sourceKey || `url:${url}`;
  const cache = vm2TpEnsureMediaCache();
  const existing = cache.get(key);
  if (existing) return existing;

  const video = usePrimary ? vm2TpPrimaryVideo() : vm2TpCreateVideo();
  if (!video) return null;
  vm2TpAttachVideo(video);
  video.crossOrigin = local ? '' : 'anonymous';
  video.dataset.sourceKey = key;
  const entry = { key, url, local, video, status: 'idle', metadataReady: false, readyPromise: null };
  cache.set(key, entry);
  return entry;
}

function vm2TpLoadEntry(entry) {
  if (!entry) return Promise.reject(new Error('Missing trash preview media entry'));
  if (entry.status === 'ready') return Promise.resolve(entry);
  if (entry.readyPromise) return entry.readyPromise;

  entry.status = 'loading';
  entry.readyPromise = new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      entry.status = 'ready';
      entry.readyPromise = null;
      resolve(entry);
    };
    const onError = () => {
      cleanup();
      entry.status = 'error';
      entry.readyPromise = null;
      reject(new Error('Failed to load trash preview clip'));
    };
    const cleanup = () => {
      entry.video.removeEventListener('loadeddata', onReady);
      entry.video.removeEventListener('error', onError);
    };
    entry.video.addEventListener('loadeddata', onReady);
    entry.video.addEventListener('error', onError);
  });

  entry.video.pause();
  entry.video.crossOrigin = entry.local ? '' : 'anonymous';
  entry.video.dataset.sourceKey = entry.key;
  entry.video.src = entry.local ? entry.url : vm2ResolveMediaUrl(entry.url);
  entry.video.load();
  return entry.readyPromise;
}

function vm2TpSetActiveEntry(entry) {
  if (!entry?.video) return;
  const previous = vm2TP.activeVideoEl;
  if (previous && previous !== entry.video) previous.pause();
  vm2TP.activeVideoEl = entry.video;
  vm2TP.activeMediaKey = entry.key;
  vm2TP.videoRect = null;
  if (entry.video.videoWidth && entry.video.videoHeight) {
    vm2TpSyncCanvasSize();
  }
}

function vm2TpQueuePreloads() {
  const cache = vm2TpEnsureMediaCache();
  const queued = new Set(vm2TP.mediaPreloadQueue.map((item) => item.key));
  vm2GetUniqueProjectSources(vm2TP.project).forEach((source) => {
    if (!source?.key || source.key === vm2TP.activeMediaKey || queued.has(source.key)) return;
    const existing = cache.get(source.key);
    if (existing?.status === 'ready' || existing?.status === 'loading') return;
    vm2TP.mediaPreloadQueue.push(source);
    queued.add(source.key);
  });
}

async function vm2TpPreloadQueue() {
  if (vm2TP.mediaPreloading) return;
  vm2TP.mediaPreloading = true;
  try {
    while (vm2TP.mediaPreloadQueue.length) {
      const source = vm2TP.mediaPreloadQueue.shift();
      const entry = vm2TpEnsureEntry(source.url, source);
      if (!entry || entry.status === 'ready') continue;
      try {
        await vm2TpLoadEntry(entry);
      } catch (err) {
        console.warn('[VM2 TrashPreview] Background preload failed:', err);
      }
    }
  } finally {
    vm2TP.mediaPreloading = false;
  }
}

function vm2TpPrimeMedia() {
  vm2TpClearMedia();
  const sources = vm2GetUniqueProjectSources(vm2TP.project);
  if (!sources.length) return;
  const [first, ...rest] = sources;
  const firstEntry = vm2TpEnsureEntry(first.url, { ...first, usePrimary: true });
  if (firstEntry) {
    vm2TpSetActiveEntry(firstEntry);
    void vm2TpLoadEntry(firstEntry).catch((err) => console.error('[VM2 TrashPreview] Primary media load error:', err));
  }
  vm2TP.mediaPreloadQueue = [];
  rest.forEach((source) => vm2TP.mediaPreloadQueue.push(source));
  void vm2TpPreloadQueue();
}

function vm2TpEnsureStepSource(step, { autoplay = false } = {}) {
  if (!step) return true;
  const url = vm2GetStepVideoUrl(step, vm2TP.project);
  const key = vm2GetStepSourceKey(step, vm2TP.project);
  if (!url || !key) return true;
  const entry = vm2TpEnsureEntry(url, {
    sourceKey: key,
    local: vm2IsBlobUrl(url),
    usePrimary: key === vm2TP.activeMediaKey || !vm2TP.activeMediaKey,
  });
  if (!entry) return true;
  if (vm2TP.activeMediaKey === key && (entry.status === 'ready' || entry.metadataReady)) return true;

  vm2TP.pendingSwitch = { stepIdx: vm2TP.stepIdx, autoplay };
  vm2TpSetActiveEntry(entry);
  if (entry.status === 'ready' || entry.metadataReady) return true;
  void vm2TpLoadEntry(entry).catch((err) => console.error('[VM2 TrashPreview] Step switch load error:', err));
  return false;
}

function vm2TpStepStart(step) {
  return step?.sourceStart ?? step?.startTime ?? 0;
}

function vm2TpStepEnd(step) {
  if (!step) return 0;
  if (Number.isFinite(step.sourceEnd)) return step.sourceEnd;
  if (Number.isFinite(step.endTime) && Number.isFinite(step.startTime)) {
    return vm2TpStepStart(step) + Math.max(0, step.endTime - step.startTime);
  }
  return step.endTime ?? vm2TpStepStart(step);
}

function vm2TpSetPlayButton(paused) {
  const btn = vm2TpGet('vm2-tp-play-btn');
  if (btn) btn.innerHTML = paused ? '<i class="ri-play-fill"></i>' : '<i class="ri-pause-fill"></i>';
}

function vm2TpAdvanceStepPlayback() {
  const steps = vm2TP.project?.steps || [];
  const video = vm2TpVideo();
  if (!video || !steps.length) return;

  const nextIdx = vm2TP.stepIdx + 1;
  if (nextIdx >= steps.length) {
    const lastStep = steps[vm2TP.stepIdx];
    video.pause();
    video.currentTime = vm2TpStepEnd(lastStep);
    vm2TpSetPlayButton(true);
    return;
  }

  const currentStep = steps[vm2TP.stepIdx];
  const nextStep = steps[nextIdx];
  const sameSource = vm2GetStepSourceKey(currentStep, vm2TP.project) === vm2GetStepSourceKey(nextStep, vm2TP.project);

  if (sameSource) {
    const currentSrcEnd = vm2TpStepEnd(currentStep);
    const nextSrcStart = vm2TpStepStart(nextStep);
    const isContiguous = Math.abs(nextSrcStart - currentSrcEnd) < 0.08;
    vm2TP.stepIdx = nextIdx;
    vm2TpUpdateStepLabel();
    vm2TpRenderElements();

    if (!isContiguous) {
      const targetTime = Math.min(
        vm2TpStepEnd(nextStep),
        nextSrcStart + 0.01
      );
      video.currentTime = targetTime;
    }

    const playPromise = video.paused ? video.play() : null;
    vm2TpSetPlayButton(false);
    if (playPromise?.catch) playPromise.catch(() => vm2TpSetPlayButton(true));
    return;
  }

  vm2TP.stepIdx = nextIdx;
  vm2TpUpdateStepLabel();
  vm2TpRenderElements();
  if (!vm2TpEnsureStepSource(steps[nextIdx], { autoplay: true })) return;
  const nextVideo = vm2TpVideo();
  if (!nextVideo) return;
  nextVideo.currentTime = vm2TpStepStart(steps[nextIdx]);
  const playPromise = nextVideo.play();
  if (playPromise?.catch) playPromise.catch(() => vm2TpSetPlayButton(true));
}

function vm2EnsureTrashPreviewModal() {
  if (document.getElementById('vm2-modal-trash-preview')) return;
  const el = document.createElement('div');
  el.innerHTML = `<div id="vm2-modal-trash-preview" class="hidden fixed inset-0 z-[400] flex flex-col bg-black">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
      <div class="flex items-center gap-3">
        <span class="text-xs font-semibold uppercase tracking-widest text-red-400"><i class="ri-delete-bin-2-line mr-1"></i>${t('vmRecycleBinPreview')}</span>
        <span id="vm2-tp-title" class="text-sm font-medium text-white truncate max-w-[320px]"></span>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-1.5">
          <button onclick="vm2TrashPreviewPrevStep()" class="w-7 h-7 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center" title="Previous step">
            <i class="ri-arrow-left-s-line text-lg"></i>
          </button>
          <span id="vm2-tp-step-label" class="text-xs text-gray-300 min-w-[80px] text-center">Step 1 / 1</span>
          <button onclick="vm2TrashPreviewNextStep()" class="w-7 h-7 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center" title="Next step">
            <i class="ri-arrow-right-s-line text-lg"></i>
          </button>
        </div>
        <button id="vm2-tp-play-btn" onclick="vm2TrashPreviewTogglePlay()" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
          <i class="ri-play-fill"></i>
        </button>
        <span id="vm2-tp-time" class="text-xs font-mono text-gray-400 w-28 text-right">0:00.0 / 0:00.0</span>
        <button onclick="vm2CloseTrashPreview()" class="ml-2 w-8 h-8 rounded-full bg-white/10 hover:bg-red-500/80 text-white flex items-center justify-center" title="Close preview">
          <i class="ri-close-line text-lg"></i>
        </button>
      </div>
    </div>
    <div id="vm2-tp-canvas-outer" class="flex-1 flex items-center justify-center overflow-hidden bg-black">
      <div id="vm2-tp-canvas-viewport" class="relative flex-shrink-0">
        <div id="vm2-tp-canvas-wrapper" class="relative bg-black shadow-2xl">
          <canvas id="vm2-tp-canvas" class="absolute inset-0 pointer-events-none"></canvas>
          <video id="vm2-tp-video" class="absolute pointer-events-none opacity-0"></video>
          <div id="vm2-tp-media-cache" class="hidden"></div>
          <div id="vm2-tp-elements" class="absolute inset-0 pointer-events-none" style="overflow:hidden;"></div>
        </div>
      </div>
    </div>
    <div class="flex-shrink-0 px-5 py-2 bg-gray-900 border-t border-gray-800 flex items-center gap-3">
      <i class="ri-information-line text-gray-500"></i>
      <span id="vm2-tp-step-desc" class="text-xs text-gray-400">No description</span>
    </div>
  </div>`;
  document.body.appendChild(el.firstElementChild);
  vm2TpInitManagedMedia();
}

async function vm2PreviewTrashProject(id) {
  vm2EnsureTrashPreviewModal();
  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-projects/${id}`, {
      headers: vm2AuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const project = await res.json();

    // Always prefer the revision snapshot when available — it is the authoritative
    // full state (steps + elements). Merge in the working copy's videoUrl in case
    // a video was uploaded after the last explicit save.
    let data = project;
    if (project.lastRevisionId) {
      try {
        const revRes = await fetch(`${vm2BaseUrl()}api/video-revisions/${project.lastRevisionId}`, {
          headers: vm2AuthHeaders(),
        });
        if (revRes.ok) {
          const rev = await revRes.json();
          const snap = rev.snapshot || {};
          data = {
            ...snap,
            _id: project._id,
            playlistId: project.playlistId,
            videoUrl: project.videoUrl || snap.videoUrl || '',
            assets: (project.assets && project.assets.length) ? project.assets : (snap.assets || []),
          };
        }
      } catch (_) { /* fall back to working copy */ }
    }

    vm2TP.project = data;
    vm2TP.stepIdx = 0;
    vm2TP.videoRect = null;
    vm2TP.pendingSwitch = null;

    // Populate header.
    const titleEl = vm2TpGet('vm2-tp-title');
    if (titleEl) titleEl.textContent = data.title || 'Untitled';

    vm2TpGet('vm2-modal-trash-preview')?.classList.remove('hidden');
    vm2TpUpdateStepLabel();
    vm2TpRenderElements();
    vm2TpSyncCanvasSize();

    vm2TpPrimeMedia();

    vm2TpStartLoop();
  } catch (err) {
    console.error('[VM2 TrashPreview] Error:', err);
    alert('Could not load preview: ' + err.message);
  }
}

function vm2CloseTrashPreview() {
  vm2TpStopLoop();
  vm2TpClearMedia();
  const modal = vm2TpGet('vm2-modal-trash-preview');
  if (modal) modal.classList.add('hidden');
  vm2TP.project = null;
}

function vm2TpStartLoop() {
  if (vm2TP.raf) return;
  const tick = () => {
    vm2TP.raf = requestAnimationFrame(tick);
    vm2TpRenderFrame();
  };
  tick();
}

function vm2TpStopLoop() {
  if (!vm2TP.raf) return;
  cancelAnimationFrame(vm2TP.raf);
  vm2TP.raf = null;
}

function vm2TpRenderFrame() {
  const canvas = vm2TpCanvas();
  const video = vm2TpVideo();
  if (!canvas || !video || !vm2TP.project) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width: pw, height: ph } = vm2TP.project;
  const rect = vm2TP.videoRect || vm2GetVideoDrawRect(
    video.videoWidth || pw, video.videoHeight || ph, pw, ph
  );

  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (rect.drawW > 0 && rect.drawH > 0) {
    ctx.drawImage(video, rect.drawX, rect.drawY, rect.drawW, rect.drawH);
  }
}

function vm2TpSyncCanvasSize() {
  const video  = vm2TpVideo();
  const canvas = vm2TpCanvas();
  const wrapper = vm2TpWrapper();
  const outer   = vm2TpGet('vm2-tp-canvas-outer');
  if (!canvas || !wrapper || !outer || !vm2TP.project) return;

  const { width: pw, height: ph } = vm2TP.project;
  const outerW = outer.clientWidth  || window.innerWidth;
  const outerH = outer.clientHeight || (window.innerHeight - 120);
  const scale  = Math.min(1, outerW / pw, outerH / ph);

  wrapper.style.width  = pw + 'px';
  wrapper.style.height = ph + 'px';
  wrapper.style.overflow = 'hidden';
  wrapper.style.background = '#1a1a2e';
  wrapper.style.transform = `scale(${scale})`;
  wrapper.style.transformOrigin = 'top left';

  const viewport = vm2TpGet('vm2-tp-canvas-viewport');
  if (viewport) {
    viewport.style.width  = Math.round(pw * scale) + 'px';
    viewport.style.height = Math.round(ph * scale) + 'px';
  }

  canvas.width  = pw;
  canvas.height = ph;
  canvas.style.width  = pw + 'px';
  canvas.style.height = ph + 'px';

  if (video) {
    video.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;';
  }

  if (video && video.videoWidth) {
    vm2TP.videoRect = vm2GetVideoDrawRect(video.videoWidth, video.videoHeight, pw, ph);
  }
}

function vm2TrashPreviewOnLoaded() {
  vm2TpSyncCanvasSize();
  // Seek to the start time of the current step.
  const step = vm2TP.project?.steps?.[vm2TP.stepIdx];
  const video = vm2TpVideo();
  if (step && video) {
    video.currentTime = vm2TpStepStart(step);
    if (vm2TP.pendingSwitch?.autoplay) {
      const playPromise = video.play();
      vm2TpSetPlayButton(false);
      if (playPromise?.catch) playPromise.catch(() => vm2TpSetPlayButton(true));
    }
    vm2TP.pendingSwitch = null;
  }
  vm2TpUpdateStepLabel();
  void vm2TpPreloadQueue();
}

function vm2TrashPreviewOnTimeUpdate() {
  const video = vm2TpVideo();
  if (!video || !vm2TP.project) return;
  const step = vm2TP.project.steps?.[vm2TP.stepIdx];
  const srcStart = vm2TpStepStart(step);
  const srcEnd = vm2TpStepEnd(step);

  if (step && !video.paused) {
    if (video.currentTime >= srcEnd - 0.05) {
      vm2TpAdvanceStepPlayback();
      return;
    }
    if (video.currentTime < srcStart) {
      video.currentTime = srcStart;
      return;
    }
  }

  const dur = video.duration || 0;
  const cur = video.currentTime;
  const fmt = vm2Fmt;
  const timeEl = vm2TpGet('vm2-tp-time');
  if (timeEl) timeEl.textContent = `${fmt(cur)} / ${fmt(dur)}`;
}

function vm2TrashPreviewTogglePlay() {
  const step = vm2TP.project?.steps?.[vm2TP.stepIdx];
  if (!step) return;
  if (!vm2TpEnsureStepSource(step, { autoplay: true })) return;
  const video = vm2TpVideo();
  if (!video) return;
  if (video.paused) {
    const srcStart = vm2TpStepStart(step);
    const srcEnd = vm2TpStepEnd(step);
    if (step && (video.currentTime < srcStart || video.currentTime >= srcEnd - 0.05)) {
      video.currentTime = srcStart;
    }
    const playPromise = video.play();
    vm2TpSetPlayButton(false);
    if (playPromise?.catch) playPromise.catch(() => vm2TpSetPlayButton(true));
  } else {
    video.pause();
    vm2TpSetPlayButton(true);
  }
}

function vm2TrashPreviewPrevStep() {
  if (!vm2TP.project?.steps?.length) return;
  vm2TP.stepIdx = Math.max(0, vm2TP.stepIdx - 1);
  vm2TpGoToStep();
}

function vm2TrashPreviewNextStep() {
  if (!vm2TP.project?.steps?.length) return;
  vm2TP.stepIdx = Math.min(vm2TP.project.steps.length - 1, vm2TP.stepIdx + 1);
  vm2TpGoToStep();
}

function vm2TpGoToStep() {
  const step  = vm2TP.project?.steps?.[vm2TP.stepIdx];
  const video = vm2TpVideo();
  if (video) video.pause();
  if (step && vm2TpEnsureStepSource(step)) {
    const activeVideo = vm2TpVideo();
    if (activeVideo) activeVideo.currentTime = vm2TpStepStart(step);
  }
  vm2TpSetPlayButton(true);
  vm2TpUpdateStepLabel();
  vm2TpRenderElements();
}

function vm2TpUpdateStepLabel() {
  const steps = vm2TP.project?.steps || [];
  const step  = steps[vm2TP.stepIdx];
  const labelEl = vm2TpGet('vm2-tp-step-label');
  const descEl  = vm2TpGet('vm2-tp-step-desc');
  if (labelEl) labelEl.textContent = `Step ${vm2TP.stepIdx + 1} / ${steps.length || 1}`;
  if (descEl)  descEl.textContent  = step?.description || step?.label || 'No description';
}

function vm2TpRenderElements() {
  const container = vm2TpGet('vm2-tp-elements');
  if (!container || !vm2TP.project) return;
  const step = vm2TP.project.steps?.[vm2TP.stepIdx];
  const elements = (step?.elements || []).filter(el => el.type !== 'audio');
  container.innerHTML = '';

  elements.forEach(el => {
    const div = document.createElement('div');
    div.className = 'absolute pointer-events-none';
    div.style.cssText = `left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;opacity:${el.opacity / 100};transform:rotate(${el.rotation || 0}deg);`;

    if (el.type === 'text') {
      div.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:${el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center'};font-size:${el.fontSize}px;font-family:${el.fontFamily};font-weight:${el.fontWeight};color:${el.color};background:${el.backgroundColor || 'transparent'};text-align:${el.textAlign};padding:8px;box-sizing:border-box;overflow:hidden;">${el.text}</div>`;
    } else if (el.type === 'shape') {
      if (el.subtype === 'rect') {
        div.innerHTML = `<div style="width:100%;height:100%;background:${el.fill ? el.strokeColor : 'transparent'};border:${el.strokeWidth}px solid ${el.strokeColor};border-radius:4px;box-sizing:border-box;"></div>`;
      } else if (el.subtype === 'circle') {
        div.innerHTML = `<div style="width:100%;height:100%;background:${el.fill ? el.strokeColor : 'transparent'};border:${el.strokeWidth}px solid ${el.strokeColor};border-radius:50%;box-sizing:border-box;"></div>`;
      } else if (el.subtype === 'arrow' || el.subtype === 'line') {
        const { startX, startY, endX, endY } = vm2GetShapeLocalEndpoints(el);
        div.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${el.width} ${el.height}" style="overflow:visible;"><defs><marker id="vm2tp-arrow-${el.id}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${el.strokeColor}" /></marker></defs><line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" ${el.subtype === 'arrow' ? `marker-end="url(#vm2tp-arrow-${el.id})"` : ''} /></svg>`;
      }
    } else if (el.type === 'image' && el.imageUrl && !vm2IsBlobUrl(el.imageUrl)) {
      div.innerHTML = `<img src="${vm2ResolveMediaUrl(el.imageUrl)}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:contain;" />`;
    }

    container.appendChild(div);
  });
}

async function vm2ShowAssetPicker() {
  if (!vm2EnsureProject()) return;
  const modal = vm2Get('vm2-modal-assets');
  const list = vm2Get('vm2-assets-list');
  if (!modal || !list) return;

  const playlistId = vm2.playlist?._id;
  modal.classList.remove('hidden');

  if (!playlistId) {
    list.innerHTML = '<p class="col-span-2 text-sm text-gray-400 text-center py-8">No playlist selected. Open a project from the project browser to access library assets.</p>';
    return;
  }

  list.innerHTML = '<p class="col-span-2 text-sm text-gray-400 text-center py-8">Loading library…</p>';

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-playlists/${playlistId}/assets`, {
      headers: vm2AuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    vm2.assetLibraryItems = await res.json();
    vm2.assetDeleteInFlightId = null;
    vm2RenderAssetPickerList();
  } catch (err) {
    console.error('[VM2] Asset picker error:', err);
    list.innerHTML = `<p class="col-span-2 text-sm text-red-400 text-center py-8">Failed to load assets: ${err.message}</p>`;
  }
}

async function vm2DeleteUnusedAsset(assetId, assetName) {
  if (!vm2.playlist?._id || !vm2EnsureEditable()) return;

  const normalizedId = String(decodeURIComponent(assetId || ''));
  const decodedName = String(assetName || 'this asset');

  if (vm2ProjectUsesAsset(normalizedId)) {
    alert('This asset is still linked in the current editor. Unlink or replace it before deleting.');
    return;
  }

  if (!confirm(`Delete unused asset "${decodedName}" from the playlist library?\n\nThis removes the Firebase file too.`)) {
    return;
  }

  vm2.assetDeleteInFlightId = normalizedId;
  vm2RenderAssetPickerList();

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-playlists/${vm2.playlist._id}/assets/${encodeURIComponent(normalizedId)}`, {
      method: 'DELETE',
      headers: vm2AuthHeaders(),
    });

    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body?.usageCount > 0) {
          message = `Asset is still used by ${body.usageCount} active project${body.usageCount === 1 ? '' : 's'}.`;
        } else if (body?.error) {
          message = body.error;
        }
      } catch (_) {}
      throw new Error(message);
    }

    vm2.assetLibraryItems = (vm2.assetLibraryItems || []).filter((asset) => String(asset.assetId || asset._id || '') !== normalizedId);
    vm2.assetDeleteInFlightId = null;
    vm2RenderAssetPickerList();
  } catch (err) {
    vm2.assetDeleteInFlightId = null;
    vm2RenderAssetPickerList();
    alert(`Failed to delete asset: ${err.message}`);
  }
}

async function vm2SelectPlaylistAsset(assetId, downloadUrl, name) {
  if (!vm2EnsureProject() || !vm2EnsureEditable()) return;

  const isAppend = vm2.mediaInsertMode === 'append';
  const sharedAsset = { assetId, name, downloadUrl, shared: true };

  // Close the picker.
  vm2Get('vm2-modal-assets')?.classList.add('hidden');

  if (isAppend) {
    vm2.mediaInsertMode = null;
    await vm2AppendClipAsset(sharedAsset);
    return;
  }

  // Clear any previous local video blob.
  if (vm2.project.videoLocalUrl) URL.revokeObjectURL(vm2.project.videoLocalUrl);
  vm2.project.videoBlob = null;
  vm2.project.videoLocalUrl = null;

  // Apply the shared asset.
  vm2.project.videoUrl = downloadUrl;
  vm2.project.currentAssetId = assetId;
  if (!vm2.project.assets) vm2.project.assets = [];
  // Avoid duplicate entries.
  if (!vm2.project.assets.some((a) => (a.assetId || a._id) === assetId)) {
    vm2.project.assets.push(sharedAsset);
  }

  // If the project had steps from a previous video, ask user.
  if (vm2.project.steps?.length) {
    const keep = confirm(`Replace video with "${name}"?\n\nKeep existing steps? Choose Cancel to clear all steps and start fresh.`);
    if (!keep) {
      vm2.project.steps = [];
      vm2.currentStepIdx = 0;
      vm2.selectedElementId = null;
    }
  }

  vm2SetVideoSource(downloadUrl, { local: false, sourceKey: vm2GetStepSourceKey(vm2.project.steps?.[0], vm2.project) || `asset:${assetId}` });
  vm2Get('vm2-upload-zone')?.classList.add('hidden');
  vm2Get('vm2-player-area')?.classList.remove('hidden');

  vm2MarkDirty('Asset linked');
  vm2SetSaveStatus('Shared video linked · saving…', 'blue');
  await vm2PersistWorkingProject({ silent: true, reason: 'Linked playlist asset' });

  vm2RenderSteps();
  vm2RenderTimeline();
  vm2RenderElements();
}

// ── Client-side H.264 Transcode (FFmpeg.wasm) ──────────────────────────────
let _vm2FetchFile = null;

async function vm2EnsureFfmpegLoaded() {
  if (vm2.ffmpegLoaded && vm2.ffmpeg) return vm2.ffmpeg;
  const ffmpegBase = `${window.location.origin}/vendor/ffmpeg`;
  const { FFmpeg } = await import(`${ffmpegBase}/ffmpeg/index.js`);
  const util = await import(`${ffmpegBase}/util/index.js`);
  _vm2FetchFile = util.fetchFile;
  // Use the single-threaded core package so browser encoding works without
  // SharedArrayBuffer / COOP+COEP headers.
  const baseURL = `${ffmpegBase}/core`;
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: `${baseURL}/ffmpeg-core.js`,
    wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    workerURL: '',
  });
  vm2.ffmpeg = ffmpeg;
  vm2.ffmpegLoaded = true;
  return ffmpeg;
}

async function vm2TranscodeToH264(file, onProgress) {
  const ffmpeg = await vm2EnsureFfmpegLoaded();
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const inputName = `input.${ext}`;
  const outputName = 'output.mp4';
  const onProg = ({ progress }) => onProgress?.(Math.max(0, Math.min(1, progress)));
  ffmpeg.on('progress', onProg);
  try {
    await ffmpeg.writeFile(inputName, await _vm2FetchFile(file));
    await ffmpeg.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y', outputName,
    ]);
    const data = await ffmpeg.readFile(outputName);
    const stem = file.name.replace(/\.[^.]+$/, '');
    return new File([data.buffer], `${stem}.mp4`, { type: 'video/mp4' });
  } finally {
    ffmpeg.off('progress', onProg);
    try { await ffmpeg.deleteFile(inputName); } catch (_) {}
    try { await ffmpeg.deleteFile(outputName); } catch (_) {}
  }
}

function vm2SetExportModalTitle(title) {
  const titleEl = vm2Get('vm2-export-title');
  if (titleEl) titleEl.innerHTML = `<i class="ri-download-line text-blue-500"></i>${title}`;
}

function vm2ResetExportModal(title = 'Export Video') {
  vm2SetExportModalTitle(title);
  vm2Get('vm2-modal-export').classList.remove('hidden');
  vm2Get('vm2-export-progress').classList.remove('hidden');
  vm2Get('vm2-export-done').classList.add('hidden');
  vm2Get('vm2-export-error').classList.add('hidden');
  vm2Get('vm2-export-bar').style.width = '0%';
  vm2Get('vm2-export-status').textContent = 'Preparing export...';
  vm2Get('vm2-export-detail').textContent = '';
}

function vm2SetExportProgress(status, detail = '', percent = null) {
  const statusEl = vm2Get('vm2-export-status');
  const detailEl = vm2Get('vm2-export-detail');
  const bar = vm2Get('vm2-export-bar');
  if (statusEl) statusEl.textContent = status;
  if (detailEl) detailEl.textContent = detail;
  if (bar && Number.isFinite(percent)) bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function vm2ShowExportDone({ label = 'Export Complete!', downloadUrl = '', downloadName = '', buttonLabel = 'Download Video' } = {}) {
  vm2Get('vm2-export-progress').classList.add('hidden');
  vm2Get('vm2-export-error').classList.add('hidden');
  vm2Get('vm2-export-done').classList.remove('hidden');

  const labelEl = vm2Get('vm2-export-done-label');
  if (labelEl) labelEl.textContent = label;

  const downloadEl = vm2Get('vm2-export-download');
  if (downloadEl) {
    if (downloadUrl) {
      downloadEl.classList.remove('hidden');
      downloadEl.href = downloadUrl;
      downloadEl.download = downloadName || 'video-manual.mp4';
      downloadEl.innerHTML = `<i class="ri-download-line mr-1"></i>${buttonLabel}`;
    } else {
      downloadEl.classList.add('hidden');
      downloadEl.removeAttribute('href');
    }
  }
}

function vm2ShowExportError(message) {
  vm2Get('vm2-export-progress').classList.add('hidden');
  vm2Get('vm2-export-done').classList.add('hidden');
  vm2Get('vm2-export-error').classList.remove('hidden');
  vm2Get('vm2-export-error-msg').textContent = message;
}

function vm2GetFlattenedDeploymentSize(project) {
  const sourceW = Math.max(2, Number(project?.width) || 1920);
  const sourceH = Math.max(2, Number(project?.height) || 1080);
  const scale = Math.min(1280 / sourceW, 720 / sourceH, 1);
  const makeEven = (value) => Math.max(2, Math.round(value / 2) * 2);
  return {
    width: makeEven(sourceW * scale),
    height: makeEven(sourceH * scale),
  };
}

async function vm2PrepareProjectImagesForRender(project) {
  if (!project?.steps?.length) return;

  const imageElements = project.steps
    .flatMap((step) => step.elements || [])
    .filter((el) => el?.type === 'image' && el.imageUrl);

  const imageCache = new Map();
  await Promise.all(imageElements.map((el) => new Promise((resolve) => {
    if (el._imgElement) return resolve();

    const cached = imageCache.get(el.imageUrl);
    if (cached) {
      el._imgElement = cached;
      return resolve();
    }

    const img = new Image();
    if (!vm2IsBlobUrl(el.imageUrl)) img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(el.imageUrl, img);
      el._imgElement = img;
      resolve();
    };
    img.onerror = () => {
      console.warn('[VM2 Export] Failed to preload image overlay:', el.imageUrl);
      resolve();
    };
    img.src = vm2ResolveMediaUrl(el.imageUrl);
  })));
}

async function vm2UploadVideoBinary(file, { playlistId = null, uploadFolder = 'videoManuals', onProgress = null } = {}) {
  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    vm2.uploadXhr = xhr;
    xhr.open('POST', `${vm2BaseUrl()}api/upload-video-manual`);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.setRequestHeader('X-File-Name', file.name);
    xhr.setRequestHeader('X-Upload-Folder', uploadFolder);
    if (playlistId) xhr.setRequestHeader('X-Playlist-Id', playlistId);
    Object.entries(vm2AuthHeaders()).forEach(([header, value]) => {
      xhr.setRequestHeader(header, value);
    });

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(event.loaded, event.total, event);
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        let errorMessage = `${xhr.status} ${xhr.statusText}`;
        try {
          errorMessage = JSON.parse(xhr.responseText).error || errorMessage;
        } catch (_) {}
        reject(new Error(errorMessage));
      }
    };
    xhr.onabort = () => reject(new Error('Upload canceled'));
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}

async function vm2UploadVideoAsset(file) {
  const isAppend = vm2.mediaInsertMode === 'append';
  const modal = vm2Get('vm2-modal-upload');
  const bar = vm2Get('vm2-upload-bar');
  const msg = vm2Get('vm2-upload-msg');
  const detail = vm2Get('vm2-upload-detail');

  modal.classList.remove('hidden');
  msg.textContent = 'Preparing video…';
  detail.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
  bar.style.width = '5%';
  vm2.uploadInProgress = true;
  vm2SetSaveStatus('Preparing video…', 'blue');

  try {
    msg.textContent = 'Uploading video…';
    vm2SetSaveStatus('Uploading video…', 'blue');

    const result = await vm2UploadVideoBinary(file, {
      playlistId: vm2.playlist?._id || null,
      uploadFolder: 'videoManuals',
      onProgress: (loaded, total) => {
        const pct = 5 + Math.round((loaded / total) * 85);
        bar.style.width = Math.min(pct, 95) + '%';
        detail.textContent = `${(loaded / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024).toFixed(1)} MB`;
      },
    });

    bar.style.width = '100%';
    msg.textContent = 'Upload complete';
    detail.textContent = 'Refresh recovery is now available.';

    const asset = {
      assetId: result.assetId,
      name: file.name,
      fileName: result.fileName || file.name,
      mimeType: result.mimeType || file.type || 'video/mp4',
      storagePath: result.storagePath,
      downloadUrl: result.url,
      uploadedAt: result.uploadedAt || vm2NowIso(),
      status: 'uploaded',
    };

    if (isAppend) {
      vm2.mediaInsertMode = null;
      await vm2AppendClipAsset(asset);
      setTimeout(() => modal.classList.add('hidden'), 1000);
      return;
    }

    vm2.project.videoUrl = asset.downloadUrl;
    vm2.project.currentAssetId = asset.assetId;
    vm2.project.assets = [asset];
    vm2MarkDirty('Video uploaded');
    await vm2PersistWorkingProject({ silent: true, reason: 'Uploaded' });

    setTimeout(() => modal.classList.add('hidden'), 1000);
  } catch (err) {
    modal.classList.add('hidden');
    if (isAppend) vm2.mediaInsertMode = null;
    if (err.message === 'Upload canceled') {
      if (!isAppend) vm2ResetCanceledUpload();
    } else {
      console.error('[VM2] Upload error:', err);
      vm2SetSaveStatus('Upload failed', 'red');
      alert('Video upload failed: ' + err.message + '\n\nRefresh recovery is not available until upload completes.');
    }
  } finally {
    vm2.uploadInProgress = false;
    vm2.uploadXhr = null;
  }
}

function vm2CancelUpload() {
  if (!vm2.uploadXhr || !vm2.uploadInProgress) return;
  if (!confirm('Cancel upload and remove the local video from the editor?')) return;
  vm2.uploadXhr.abort();
}

function vm2ResetCanceledUpload() {
  if (vm2.project?.videoLocalUrl) {
    URL.revokeObjectURL(vm2.project.videoLocalUrl);
  }
  vm2.project.videoBlob = null;
  vm2.project.videoLocalUrl = null;
  vm2.project.videoUrl = null;
  vm2.project.currentAssetId = null;
  vm2.project.assets = [];
  vm2.project.steps = [];
  vm2.project.duration = 0;
  vm2.duration = 0;
  vm2.currentStepIdx = 0;
  vm2.selectedElementId = null;
  vm2ClearManagedMedia(false);
  vm2SetVideoSource('', { local: true });
  vm2Get('vm2-upload-zone').classList.remove('hidden');
  vm2Get('vm2-player-area').classList.add('hidden');
  vm2RenderSteps();
  vm2RenderTimeline();
  vm2RenderElements();
  vm2RenderElementsList();
  vm2RenderProps();
  vm2SetSaveStatus('Upload canceled', 'blue');
}

function vm2OnVideoLoaded() {
  const video = vm2Video();
  const pendingSwitch = vm2.pendingMediaSwitch;
  if (!pendingSwitch) {
    vm2.duration = video.duration;
    vm2.project.duration = video.duration;
  }
  
  // Store native video dimensions for reference, but DON'T override project canvas size.
  // Canvas stays at its set size (default 1920x1080), video fits inside with object-fit:contain.
  vm2.project.nativeVideoWidth = video.videoWidth;
  vm2.project.nativeVideoHeight = video.videoHeight;



  // Create first step if none
  if (vm2.project.steps.length === 0) {
    vm2.project.steps = [{
      id: vm2Id().replace('el_', 'step_'),
      label: 'Step 1',
      description: '',
      startTime: 0,
      endTime: video.duration,
      sourceStart: 0,
      sourceEnd: video.duration,
      assetId: vm2.project.currentAssetId || null,
      muted: false,
      elements: [],
    }];
  }

  vm2SyncSequenceDuration(vm2.project);

  vm2SyncCanvasSize();
  vm2StartPreviewLoop();

  if (pendingSwitch) {
    vm2.pendingMediaSwitch = null;
    vm2SeekTo(pendingSwitch.timelineTime, { autoplay: pendingSwitch.autoplay });
    return;
  }

  if (vm2.pendingHistoryRestore) {
    const restoreState = vm2.pendingHistoryRestore;
    vm2.pendingHistoryRestore = null;
    vm2ApplyHistoryUiState(restoreState);
    return;
  }

  vm2RenderSteps();
  vm2RenderTimeline();
  vm2RenderElements();
}

function vm2OnVideoReady() {
  vm2.loadingProject = false;
  vm2SetLoadingIndicator(false);
  void vm2PreloadProjectMedia();
}

function vm2OnVideoError() {
  vm2.loadingProject = false;
  vm2SetLoadingIndicator(false);
  vm2SetSaveStatus('Video failed to load', 'red');
}

function vm2OnTimeUpdate() {
  const video = vm2Video();
  if (!video || !vm2.project || !vm2.project.steps.length) return;

  // We rely on vm2.currentStepIdx to know which step we are currently "inside"
  let activeStepIdx = vm2.currentStepIdx;
  let activeStep = vm2.project.steps[activeStepIdx];
  if (!activeStep) return;

  let srcPos = video.currentTime;
  let srcStart = activeStep.sourceStart ?? activeStep.startTime;
  let srcEnd = activeStep.sourceEnd ?? activeStep.endTime;

  // If playing, strictly enforce the active step's boundaries
  if (vm2.playing) {
    if (srcPos >= srcEnd - 0.05) { // Reaching the end of the current clip
      // Jump to the next step
      activeStepIdx++;
      if (activeStepIdx < vm2.project.steps.length) {
        const nextStep = vm2.project.steps[activeStepIdx];
        const sameSource = vm2GetStepSourceKey(activeStep, vm2.project) === vm2GetStepSourceKey(nextStep, vm2.project);

        if (sameSource) {
          const currentSrcEnd = activeStep.sourceEnd ?? activeStep.endTime;
          const nextSrcStart = nextStep.sourceStart ?? nextStep.startTime;
          const nextSrcEnd = nextStep.sourceEnd ?? nextStep.endTime;
          const isContiguous = Math.abs(nextSrcStart - currentSrcEnd) < 0.08;
          vm2.currentStepIdx = activeStepIdx;

          if (!isContiguous) {
            const targetTime = Math.min(nextSrcEnd, nextSrcStart + 0.01);
            video.currentTime = targetTime;
          }

          video.muted = !!nextStep.muted;
          vm2.playing = true;
          const btn = vm2Get('vm2-play-btn');
          if (btn) btn.innerHTML = '<i class="ri-pause-fill text-lg"></i>';
          vm2.currentTime = nextStep.startTime;

          const display = vm2Get('vm2-time-display');
          if (display) {
            display.textContent = vm2Fmt(vm2.currentTime) + ' / ' + vm2Fmt(vm2.duration);
          }

          vm2UpdatePlayhead();
          vm2RenderSteps();
          vm2RenderElements();
          vm2UpdateVisibleElements();

          const playPromise = video.paused ? video.play() : null;
          if (playPromise?.catch) {
            playPromise.catch(() => {
              vm2.playing = false;
              if (btn) btn.innerHTML = '<i class="ri-play-fill text-lg"></i>';
            });
          }
          return;
        }

        vm2SeekTo(vm2.project.steps[activeStepIdx].startTime, {
          autoplay: true,
          stepIdx: activeStepIdx,
        });
        return;
      } else {
        // Reached the end of the entire sequence
        video.pause();
        vm2.playing = false;
        const btn = vm2Get('vm2-play-btn');
        if (btn) btn.innerHTML = '<i class="ri-play-fill text-lg"></i>';
        
        vm2.currentTime = vm2.duration;
        vm2SeekTo(vm2.duration);
        return;
      }
    } else if (srcPos < srcStart) {
      // Somehow we are before the start? Correct it.
      video.currentTime = srcStart;
      return;
    }
  }

  // Map the valid source position back to timeline time
  const offset = Math.max(0, srcPos - srcStart);
  vm2.currentTime = activeStep.startTime + offset;

  // Clamp just in case
  if (vm2.currentTime > activeStep.endTime) {
     vm2.currentTime = activeStep.endTime;
  }

  // Update time display
  const display = vm2Get('vm2-time-display');
  if (display) {
    display.textContent = vm2Fmt(vm2.currentTime) + ' / ' + vm2Fmt(vm2.duration);
  }

  // Update playhead
  vm2UpdatePlayhead();
  vm2UpdateVisibleElements();
}

function vm2OnEnded() {
  vm2.playing = false;
  const btn = vm2Get('vm2-play-btn');
  if (btn) btn.innerHTML = '<i class="ri-play-fill text-lg"></i>';
}

function vm2GetVideoDrawRect(nativeW, nativeH, projectW, projectH) {
  if (!nativeW || !nativeH || !projectW || !projectH) {
    return { drawX: 0, drawY: 0, drawW: projectW || 0, drawH: projectH || 0 };
  }

  const videoRatio = nativeW / nativeH;
  const projectRatio = projectW / projectH;

  if (videoRatio > projectRatio) {
    const drawW = projectW;
    const drawH = projectW / videoRatio;
    return {
      drawX: 0,
      drawY: (projectH - drawH) / 2,
      drawW,
      drawH,
    };
  }

  const drawH = projectH;
  const drawW = projectH * videoRatio;
  return {
    drawX: (projectW - drawW) / 2,
    drawY: 0,
    drawW,
    drawH,
  };
}

function vm2StartPreviewLoop() {
  if (vm2.previewRaf) return;

  const tick = () => {
    vm2.previewRaf = requestAnimationFrame(tick);
    vm2RenderPreviewFrame();
  };

  tick();
}

function vm2StopPreviewLoop() {
  if (!vm2.previewRaf) return;
  cancelAnimationFrame(vm2.previewRaf);
  vm2.previewRaf = null;
}

function vm2RenderPreviewFrame() {
  const canvas = vm2PreviewCanvas();
  const video = vm2Video();
  if (!canvas || !video || !vm2.project) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = vm2.videoRect || vm2GetVideoDrawRect(
    video.videoWidth || vm2.project.width,
    video.videoHeight || vm2.project.height,
    vm2.project.width,
    vm2.project.height
  );

  // During scrubbing/seeking the browser can briefly drop below current-frame
  // readiness. Keep the last rendered frame instead of flashing black.
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.seeking) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (rect.drawW > 0 && rect.drawH > 0) {
    ctx.drawImage(video, rect.drawX, rect.drawY, rect.drawW, rect.drawH);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  PLAYBACK
// ═══════════════════════════════════════════════════════════════════════════

function vm2TogglePlay() {
  const video = vm2Video();
  if (!video) return;

  if (video.paused) {
    vm2SeekTo(vm2.currentTime, { autoplay: true });
  } else {
    video.pause();
    vm2.playing = false;
    vm2Get('vm2-play-btn').innerHTML = '<i class="ri-play-fill text-lg"></i>';
  }
}

function vm2SeekTo(timelineTime, { autoplay = false, stepIdx = null } = {}) {
  let video = vm2Video();
  if (!video || !vm2.project) return;

  // Clamp timelineTime within total duration
  timelineTime = Math.max(0, Math.min(timelineTime, vm2.duration));

  let step = null;
  if (Number.isInteger(stepIdx) && stepIdx >= 0 && stepIdx < vm2.project.steps.length) {
    step = vm2.project.steps[stepIdx];
    vm2.currentStepIdx = stepIdx;
  } else if (vm2.project.steps.length > 0) {
    // Find the step that contains this timeline position. Boundaries belong to
    // the next step so playback can advance continuously across adjacent clips.
    const resolvedStepIdx = vm2FindStepIndexAtTime(timelineTime, vm2.project);
    if (resolvedStepIdx >= 0) {
      step = vm2.project.steps[resolvedStepIdx];
      vm2.currentStepIdx = resolvedStepIdx;
    } else {
      // If exact match not found (e.g. at boundaries), snap to closest
      step = timelineTime <= vm2.project.steps[0].startTime
        ? vm2.project.steps[0]
        : vm2.project.steps[vm2.project.steps.length - 1];
      vm2.currentStepIdx = timelineTime <= vm2.project.steps[0].startTime ? 0 : vm2.project.steps.length - 1;
    }
  }

  if (step) {
    if (!vm2EnsureStepVideoSource(step, timelineTime, { autoplay })) {
      vm2.currentTime = timelineTime;
      vm2RenderSteps();
      vm2RenderElements();
      vm2UpdateVisibleElements();
      return;
    }

    video = vm2Video();
    if (!video) return;

    // Translate timeline position → source video position
    const offset = Math.max(0, timelineTime - step.startTime);
    const srcPos = (step.sourceStart ?? step.startTime) + offset;
    const videoDuration = video.duration || vm2.duration;
    // Don't exceed the step's source clip!
    const activeSrcEnd = step.sourceEnd ?? step.endTime;
    video.currentTime = Math.max(0, Math.min(srcPos, activeSrcEnd, videoDuration));
    // Apply the clip's mute state
    video.muted = !!step.muted;
    if (autoplay) {
      const playPromise = video.play();
      vm2.playing = true;
      vm2Get('vm2-play-btn').innerHTML = '<i class="ri-pause-fill text-lg"></i>';
      if (playPromise?.catch) {
        playPromise.catch(() => {
          vm2.playing = false;
          vm2Get('vm2-play-btn').innerHTML = '<i class="ri-play-fill text-lg"></i>';
        });
      }
    }
  }

  vm2.currentTime = timelineTime;
  vm2UpdatePlayhead();
  const display = vm2Get('vm2-time-display');
  if (display) display.textContent = vm2Fmt(vm2.currentTime) + ' / ' + vm2Fmt(vm2.duration);
  vm2RenderSteps();
  vm2RenderElements();
  vm2UpdateVisibleElements();
}

// ═══════════════════════════════════════════════════════════════════════════
//  CANVAS / ZOOM
// ═══════════════════════════════════════════════════════════════════════════

function vm2SyncCanvasSize() {
  const video = vm2Video();
  const wrapper = vm2Get('vm2-canvas-wrapper');
  const previewCanvas = vm2PreviewCanvas();
  const debugRect = vm2Get('vm2-debug-video-rect');
  if (!video || !wrapper || !previewCanvas || !debugRect) return;

  wrapper.style.width = vm2.project.width + 'px';
  wrapper.style.height = vm2.project.height + 'px';
  wrapper.style.overflow = 'hidden';
  wrapper.style.position = 'relative'; // ensure children position correctly
  // Show a visible background for the canvas so users can see letterbox/pillarbox areas
  wrapper.style.background = '#1a1a2e';

  previewCanvas.width = vm2.project.width;
  previewCanvas.height = vm2.project.height;
  previewCanvas.style.width = vm2.project.width + 'px';
  previewCanvas.style.height = vm2.project.height + 'px';

  const nativeW = video.videoWidth || vm2.project.width;
  const nativeH = video.videoHeight || vm2.project.height;
  const projectW = vm2.project.width;
  const projectH = vm2.project.height;
  const { drawX, drawY, drawW, drawH } = vm2GetVideoDrawRect(nativeW, nativeH, projectW, projectH);

  // Keep the video element as a hidden media source for playback and export.
  video.style.position = 'absolute';
  video.style.left = '0';
  video.style.top = '0';
  video.style.width = '1px';
  video.style.height = '1px';
  video.style.objectFit = 'contain';
  video.style.margin = '0';
  video.style.padding = '0';
  video.style.display = 'block';

  debugRect.style.left = drawX + 'px';
  debugRect.style.top = drawY + 'px';
  debugRect.style.width = drawW + 'px';
  debugRect.style.height = drawH + 'px';
  debugRect.style.border = vm2.showDebugVideoRect ? '4px solid #00ff00' : 'none';
  debugRect.style.boxSizing = 'border-box';
  debugRect.style.zIndex = '1';
  debugRect.style.display = vm2.showDebugVideoRect ? 'block' : 'none';

  vm2.videoRect = { drawX, drawY, drawW, drawH };

  console.log('[VM2] Preview video rect:', { drawX, drawY, drawW, drawH, projectW, projectH, nativeW, nativeH });

  vm2RenderPreviewFrame();
  vm2ApplyCanvasZoomTransform();
  
  // Auto-fit on first sync
  if (!vm2._initialFitDone) {
    vm2._initialFitDone = true;
    setTimeout(() => vm2FitCanvas(), 50);
  }
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
  const viewport = vm2CanvasViewport();
  const wrapper = vm2Get('vm2-canvas-wrapper');
  if (!wrapper || !viewport || !vm2.project) return;

  viewport.style.width = (vm2.project.width * vm2.canvasZoom) + 'px';
  viewport.style.height = (vm2.project.height * vm2.canvasZoom) + 'px';
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

function vm2MatchVideoSize() {
  const video = vm2Video();
  if (!video || !video.videoWidth) {
    alert('Please load a video first');
    return;
  }
  // Set canvas to match video's native dimensions (no stretching!)
  vm2Get('vm2-canvas-w').value = video.videoWidth;
  vm2Get('vm2-canvas-h').value = video.videoHeight;
  // Apply immediately
  vm2.project.width = video.videoWidth;
  vm2.project.height = video.videoHeight;
  vm2SyncCanvasSize();
  vm2Get('vm2-modal-canvas').classList.add('hidden');
  console.log('[VM2] Canvas matched to video:', video.videoWidth, 'x', video.videoHeight);
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
    <div class="vm2-step-item relative p-2 rounded border border-gray-200 dark:border-gray-600 cursor-grab hover:bg-gray-50 dark:hover:bg-gray-700 group ${i === vm2.currentStepIdx ? 'active' : ''}"
         onclick="vm2SelectStep(${i})"
         draggable="true"
         ondragstart="vm2StepDragStart(event, ${i})"
         ondragover="event.preventDefault(); this.classList.add('ring-2', 'ring-blue-400')"
         ondragleave="this.classList.remove('ring-2', 'ring-blue-400')"
         ondrop="this.classList.remove('ring-2', 'ring-blue-400'); vm2StepDrop(event, ${i})">
      <div class="flex items-center gap-2">
        <i class="ri-draggable text-gray-400 cursor-grab flex-shrink-0"></i>
        <span class="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-medium flex-shrink-0">${i + 1}</span>
        <input type="text" value="${step.label}" 
               class="flex-1 text-xs font-medium bg-transparent border-none focus:outline-none dark:text-white truncate"
               onclick="event.stopPropagation()"
           onchange="vm2SelectStep(${i}); vm2UpdateStepProp('label', this.value)">
      </div>
      <div class="text-[10px] text-gray-400 mt-1 pl-10">${vm2Fmt(step.startTime)} – ${vm2Fmt(step.endTime)}</div>
      <input type="text" value="${step.description || ''}" 
             placeholder="Add description..."
             class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 ml-10 w-[calc(100%-2.5rem)] bg-transparent border-none focus:outline-none truncate placeholder-gray-300 dark:placeholder-gray-600"
             onclick="event.stopPropagation()"
              onchange="vm2SelectStep(${i}); vm2UpdateStepProp('description', this.value)">
      ${vm2.project.steps.length > 1 ? `
        <button onclick="event.stopPropagation(); vm2DeleteStep(${i})" class="absolute top-1 right-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
          <i class="ri-close-line text-sm"></i>
        </button>
      ` : ''}
    </div>
  `).join('');
}

function vm2SelectStep(idx, clickEvent) {
  vm2.currentStepIdx = idx;
  vm2.selectedElementId = null;

  const step = vm2.project.steps[idx];
  if (step) {
    let seekTime;
    if (clickEvent) {
      // Compute the timeline position from where the user actually clicked
      const scroll = vm2Get('vm2-timeline-scroll');
      if (scroll) {
        const rect = scroll.getBoundingClientRect();
        const x = clickEvent.clientX - rect.left + scroll.scrollLeft;
        seekTime = Math.max(step.startTime, Math.min(x / vm2.timelineZoom, step.endTime));
      }
    }
    // Fall back to just inside the step start if no click position available
    if (seekTime === undefined) seekTime = step.startTime + 0.001;
    vm2SeekTo(seekTime);
    // Re-assert the intended step index in case vm2SeekTo snapped at a boundary
    vm2.currentStepIdx = idx;
  }
  
  vm2RenderSteps();
  vm2RenderElements();
  vm2RenderProps();
  vm2SwitchTab('properties');
}

function vm2UpdateStepProp(prop, value) {
  if (!vm2EnsureEditable()) return;
  const step = vm2Step();
  if (!step) return;
  
  step[prop] = value;
  vm2MarkDirty('Step updated');
  
  vm2RenderSteps();
  vm2RenderTimeline();
  // Don't re-render props to avoid losing focus
}

function vm2ToggleStepMute(idx) {
  if (!vm2EnsureEditable()) return;
  const step = vm2.project.steps[idx];
  if (!step) return;
  step.muted = !step.muted;
  vm2MarkDirty('Step audio updated');
  // Apply immediately to the video if this is the active step
  if (idx === vm2.currentStepIdx) {
    const video = vm2Video();
    if (video) video.muted = !!step.muted;
  }
  vm2RenderTimeline();
  vm2RenderProps();
}

function vm2AddStep() {
  if (!vm2EnsureProject()) return;
  if (!vm2EnsureEditable()) return;
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
  if (!vm2EnsureEditable()) return;
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
    sourceStart: (step.sourceStart ?? step.startTime) + (t - step.startTime),
    sourceEnd: step.sourceEnd ?? step.endTime,
    assetId: step.assetId || vm2.project.currentAssetId || null,
    muted: false,
    elements: [],
  };

  // Move elements that start after or at 't' to the new step without cutting them
  const remainingElements = [];
  step.elements.forEach(el => {
    if (el.startTime >= t) {
      newStep.elements.push(el);
    } else {
      remainingElements.push(el);
    }
  });
  step.elements = remainingElements;

  step.endTime = t;
  step.sourceEnd = (step.sourceStart ?? step.startTime) + (t - step.startTime);
  vm2.project.steps.splice(vm2.currentStepIdx + 1, 0, newStep);

  // Renumber only if empty
  vm2.project.steps.forEach((s, i) => {
    if (!s.label) {
      s.label = `Step ${i + 1}`;
    }
  });

  vm2MarkDirty('Clip split');

  vm2RenderSteps();
  vm2RenderTimeline();
}

function vm2UpdateTimelinePositions() {
  let time = 0;
  vm2.project.steps.forEach((s, i) => {
    const srcDuration = (s.sourceEnd ?? s.endTime) - (s.sourceStart ?? s.startTime);
    s.startTime = time;
    s.endTime = time + srcDuration;

    // Elements are independent global-timeline objects and must NOT be shifted
    // when video clips are reordered or deleted. Their startTime/endTime are
    // absolute timeline positions that the user explicitly placed.

    if (!s.label) {
      s.label = `Step ${i + 1}`;
    }
    time += srcDuration;
  });
  vm2.project.duration = time;
  vm2.duration = time;
}

function vm2DeleteStep(idx) {
  if (!vm2EnsureEditable()) return;
  if (vm2.project.steps.length <= 1) {
    if (!confirm('Delete the last step? This will reset the project but keep the video.')) return;
    
    // Reset to single step covering full video
    vm2.project.steps = [{
      id: vm2Id().replace('el_', 'step_'),
      label: 'Step 1',
      description: '',
      startTime: 0,
      endTime: vm2.duration,
      sourceStart: 0,
      sourceEnd: vm2.duration,
      muted: false,
      elements: [],
    }];
    vm2.currentStepIdx = 0;
    vm2.selectedElementId = null;
    vm2MarkDirty('Project reset');
    vm2SeekTo(0);
    vm2RenderSteps();
    vm2RenderTimeline();
    vm2RenderElements();
    vm2RenderProps();
    return;
  }
  if (!confirm(`Delete "${vm2.project.steps[idx].label}"?`)) return;

  // Rescue elements so they don't get deleted when a video clip is removed
  const elementsToRescue = vm2.project.steps[idx].elements;
  vm2.project.steps.splice(idx, 1);
  
  if (vm2.project.steps.length > 0 && elementsToRescue && elementsToRescue.length > 0) {
    const parentStep = idx > 0 ? vm2.project.steps[idx - 1] : vm2.project.steps[0];
    parentStep.elements.push(...elementsToRescue);
  }

  vm2UpdateTimelinePositions();
  vm2MarkDirty('Step deleted');

  if (vm2.currentStepIdx >= vm2.project.steps.length) {
    vm2.currentStepIdx = vm2.project.steps.length - 1;
  }

  vm2SeekTo(vm2.project.steps[vm2.currentStepIdx]?.startTime ?? 0);
  vm2RenderSteps();
  vm2RenderTimeline();
}

function vm2StepDragStart(event, idx) {
  event.dataTransfer.setData('text/plain', idx);
  event.dataTransfer.effectAllowed = 'move';
  event.target.style.opacity = '0.5';
}

function vm2StepDragEnd(event) {
  event.target.style.opacity = '1';
}

function vm2StepDrop(event, targetIdx) {
  if (!vm2EnsureEditable()) return;
  event.preventDefault();
  const sourceIdx = parseInt(event.dataTransfer.getData('text/plain'));
  if (sourceIdx === targetIdx) return;

  const [moved] = vm2.project.steps.splice(sourceIdx, 1);
  vm2.project.steps.splice(targetIdx, 0, moved);
  
  vm2UpdateTimelinePositions();

  if (vm2.currentStepIdx === sourceIdx) {
    vm2.currentStepIdx = targetIdx;
  }

  vm2MarkDirty('Step reordered');
  vm2RenderSteps();
  vm2RenderTimeline();
}

function vm2StepResizeStart(event, idx, side) {
  if (!vm2EnsureEditable()) return;
  event.preventDefault();
  event.stopPropagation();
  
  const step = vm2.project.steps[idx];
  if (!step) return;
  
  vm2.isResizingStep = true;
  document.body.classList.add('vm2-no-select');
  vm2.stepResizeData = {
    idx,
    side,
    startX: event.clientX,
    originalStart: step.startTime,
    originalEnd: step.endTime,
    originalSourceStart: step.sourceStart ?? step.startTime,
    originalSourceEnd: step.sourceEnd ?? step.endTime,
  };
}

function vm2ConstrainElementsToStep(step) {
  // Elements are completely independent now globally, so we no longer crop them to step bounds.
  return;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ELEMENTS (Text, Shapes, Images, Audio)
// ═══════════════════════════════════════════════════════════════════════════

// ── Drag-from-panel helpers ────────────────────────────────────────────────

function vm2ElementPanelDragStart(event, type, subtype) {
  // Store the element type/subtype so the canvas drop handler can read it
  event.dataTransfer.setData('application/vm2-element', JSON.stringify({ type, subtype }));
  event.dataTransfer.effectAllowed = 'copy';

  // Build a small ghost image matching the element shape
  const ghost = document.createElement('div');
  ghost.style.cssText = 'position:fixed;top:-200px;left:-200px;pointer-events:none;' +
    'width:60px;height:60px;display:flex;align-items:center;justify-content:center;' +
    'background:#3b82f6;border-radius:8px;color:white;font-size:11px;font-weight:600;';
  const label = subtype === 'rect' ? '▬' : subtype === 'circle' ? '●' :
                subtype === 'arrow' ? '↗' : subtype === 'line' ? '╱' :
                subtype === 'title' ? 'T' : 'T';
  ghost.textContent = label;
  document.body.appendChild(ghost);
  event.dataTransfer.setDragImage(ghost, 30, 30);
  setTimeout(() => document.body.removeChild(ghost), 0);
}

function vm2CanvasDragOver(event) {
  // Only accept our custom element drags
  if (!event.dataTransfer.types.includes('application/vm2-element')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  vm2Get('vm2-canvas-outer')?.classList.add('vm2-drop-active');
}

function vm2CanvasDragLeave(event) {
  // Only clear when leaving the outer container entirely
  const outer = vm2Get('vm2-canvas-outer');
  if (outer && !outer.contains(event.relatedTarget)) {
    outer.classList.remove('vm2-drop-active');
  }
}

function vm2CanvasDrop(event) {
  if (!vm2EnsureEditable()) return;
  const outer = vm2Get('vm2-canvas-outer');
  if (outer) outer.classList.remove('vm2-drop-active');

  const raw = event.dataTransfer.getData('application/vm2-element');
  if (!raw) return;
  event.preventDefault();

  let type, subtype;
  try { ({ type, subtype } = JSON.parse(raw)); } catch { return; }

  if (!vm2Step()) { alert('Load a video first'); return; }

  // Map the drop position from viewport → canvas pixel coordinates.
  // getBoundingClientRect() already accounts for the CSS scale transform.
  const wrapper = vm2Get('vm2-canvas-wrapper');
  const rect = wrapper.getBoundingClientRect();
  const dropX = (event.clientX - rect.left) / vm2.canvasZoom;
  const dropY = (event.clientY - rect.top)  / vm2.canvasZoom;

  vm2AddElement(type, subtype, dropX, dropY);
}

function vm2SetDrawMode(mode) {
  vm2.drawMode = mode;
  const outer = vm2Get('vm2-canvas-outer');
  if (outer) {
    outer.classList.toggle('vm2-draw-mode', !!mode);
  }
}

function vm2ActivateShapeDraw(subtype) {
  if (!vm2EnsureEditable()) return;
  if (!vm2Step()) {
    alert('Load a video first');
    return;
  }

  vm2.selectedElementId = null;
  vm2SetDrawMode({ type: 'shape', subtype });
  vm2RenderElements();
  vm2RenderProps();
}

function vm2CanvasPointFromEvent(event) {
  const wrapper = vm2Get('vm2-canvas-wrapper');
  if (!wrapper) return null;

  const rect = wrapper.getBoundingClientRect();
  const rawX = (event.clientX - rect.left) / vm2.canvasZoom;
  const rawY = (event.clientY - rect.top) / vm2.canvasZoom;

  return {
    x: Math.max(0, Math.min(rawX, vm2.project.width)),
    y: Math.max(0, Math.min(rawY, vm2.project.height)),
  };
}

function vm2GetShapeLocalEndpoints(el) {
  const startNormX = el.startNormX ?? 0;
  const startNormY = el.startNormY ?? 1;
  const endNormX = el.endNormX ?? 1;
  const endNormY = el.endNormY ?? 0;

  return {
    startX: startNormX * el.width,
    startY: startNormY * el.height,
    endX: endNormX * el.width,
    endY: endNormY * el.height,
  };
}

function vm2NormalizeAngle(angle) {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

function vm2SnapAngle(angle, increment = 15) {
  return Math.round(angle / increment) * increment;
}

function vm2ConstrainPointAngle(startPoint, endPoint, incrementDegrees = 45) {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const distance = Math.hypot(dx, dy);
  if (!distance) return endPoint;

  const angle = Math.atan2(dy, dx);
  const snapped = Math.round(angle / vm2DegToRad(incrementDegrees)) * vm2DegToRad(incrementDegrees);
  return {
    x: startPoint.x + Math.cos(snapped) * distance,
    y: startPoint.y + Math.sin(snapped) * distance,
  };
}

function vm2UpdateRotation(value, refreshProps = false) {
  if (!vm2EnsureEditable()) return;
  const el = vm2FindElement(vm2.selectedElementId);
  if (!el) return;

  el.rotation = vm2NormalizeAngle(Number(value) || 0);
  vm2MarkDirty('Rotation updated');
  vm2RenderElements();

  if (refreshProps) vm2RenderProps();
}

function vm2NudgeRotation(delta) {
  if (!vm2EnsureEditable()) return;
  const el = vm2FindElement(vm2.selectedElementId);
  if (!el) return;
  vm2UpdateRotation((el.rotation || 0) + delta, true);
}

function vm2UpdateDrawnShapeGeometry(el, startPoint, endPoint) {
  const minX = Math.min(startPoint.x, endPoint.x);
  const minY = Math.min(startPoint.y, endPoint.y);
  const width = Math.max(Math.abs(endPoint.x - startPoint.x), 1);
  const height = Math.max(Math.abs(endPoint.y - startPoint.y), 1);

  el.x = minX;
  el.y = minY;
  el.width = width;
  el.height = height;
  el.startNormX = (startPoint.x - minX) / width;
  el.startNormY = (startPoint.y - minY) / height;
  el.endNormX = (endPoint.x - minX) / width;
  el.endNormY = (endPoint.y - minY) / height;
}

function vm2IsElementVisibleAtTime(el, time) {
  const withinTiming = time >= el.startTime && time < el.endTime;
  if (!withinTiming) return false;
  if (!el.blink) return true;

  // 1 Hz blink: 0.5s visible, 0.5s hidden.
  const elapsed = Math.max(0, time - el.startTime);
  return (elapsed % 1) < 0.5;
}

function vm2StartRotationDrag(event, el) {
  const wrapper = vm2Get('vm2-canvas-wrapper');
  if (!wrapper) return;

  const rect = wrapper.getBoundingClientRect();
  const centerX = rect.left + (el.x + el.width / 2) * vm2.canvasZoom;
  const centerY = rect.top + (el.y + el.height / 2) * vm2.canvasZoom;

  vm2.isRotatingElement = true;
  vm2.rotationData = {
    centerX,
    centerY,
    startPointerAngle: vm2RadToDeg(Math.atan2(event.clientY - centerY, event.clientX - centerX)),
    originalRotation: el.rotation || 0,
  };
  document.body.classList.add('vm2-no-select');
}

function vm2OnCanvasMouseDown(event) {
  if (!vm2EnsureEditable()) return;
  if (!vm2.drawMode || event.button !== 0 || !vm2.project) return;

  const point = vm2CanvasPointFromEvent(event);
  if (!point) return;

  event.preventDefault();
  document.body.classList.add('vm2-no-select');

  const element = vm2AddElement(vm2.drawMode.type, vm2.drawMode.subtype, point.x, point.y, {
    deferRender: true,
    initialWidth: 1,
    initialHeight: 1,
    startNormX: 0,
    startNormY: 0,
    endNormX: 1,
    endNormY: 1,
  });
  if (!element) return;

  vm2UpdateDrawnShapeGeometry(element, point, point);
  vm2.drawShapeData = {
    elementId: element.id,
    startPoint: point,
  };
  vm2SetDrawMode(null);
  vm2RenderElements();
  vm2RenderTimeline();
  vm2RenderElementsList();
  vm2RenderProps();
  vm2SwitchTab('properties');
}

function vm2AddElement(type, subtype, dropX, dropY, options = {}) {
  if (!vm2EnsureProject()) return;
  if (!vm2EnsureEditable()) return;
  const step = vm2Step();
  if (!step) {
    alert('Upload a video first to add elements.');
    return;
  }

  const id = vm2Id();
  const centerX = vm2.project.width / 2;
  const centerY = vm2.project.height / 2;

  // Default 4-second duration, starting at current playhead position
  const elementStart = Math.max(0, Math.min(vm2.currentTime, vm2.duration - 4));
  const elementEnd = Math.min(elementStart + 4, vm2.duration);

  let nextLayer = 0;
  vm2.project.steps.forEach(s => s.elements?.forEach(e => {
    if ((e.layer || 0) >= nextLayer) nextLayer = (e.layer || 0) + 1;
  }));

  let element = {
    id,
    type,
    subtype,
    layer: nextLayer,
    timelineLane: vm2GetDefaultTimelineLaneForRange(elementStart, elementEnd),
    x: centerX - 100,
    y: centerY - 50,
    width: options.initialWidth ?? 200,
    height: options.initialHeight ?? 100,
    startTime: elementStart,
    endTime: elementEnd,
    opacity: 100,
    blink: false,
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
    element.strokeColor = '#ef4444'; // Red color
    element.strokeWidth = 3;
    element.fill = false; // No fill by default
    if (subtype === 'arrow' || subtype === 'line') {
      element.width = options.initialWidth ?? 150;
      element.height = options.initialHeight ?? 100;
      element.fill = false;
      element.x = centerX - 75;
      element.y = centerY - 50;
      element.startNormX = options.startNormX ?? 0;
      element.startNormY = options.startNormY ?? 1;
      element.endNormX = options.endNormX ?? 1;
      element.endNormY = options.endNormY ?? 0;
    }
    if (subtype === 'circle') {
      element.width = 100;
      element.height = 100;
      element.x = centerX - 50;
      element.y = centerY - 50;
    }
    if (subtype === 'rect') {
      element.width = 200;
      element.height = 100;
      element.x = centerX - 100;
      element.y = centerY - 50;
    }
  }

  // If the element was dragged onto the canvas, center it on the drop point
  // and keep it within canvas bounds.
  if (dropX !== undefined && dropY !== undefined) {
    element.x = Math.max(0, Math.min(dropX - element.width  / 2, vm2.project.width  - element.width));
    element.y = Math.max(0, Math.min(dropY - element.height / 2, vm2.project.height - element.height));
  }

  step.elements.push(element);
  vm2.selectedElementId = id;
  vm2MarkDirty('Element added');

  if (!options.deferRender) {
    vm2RenderElements();
    vm2RenderTimeline();
    vm2RenderElementsList();
    vm2RenderProps();
    vm2SwitchTab('properties');
  }

  return element;
}

async function vm2HandleImageUpload(event) {
  if (!vm2EnsureEditable()) return;
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

    const elementStart = Math.max(step.startTime, Math.min(vm2.currentTime, step.endTime - 4));
    const elementEnd = Math.min(elementStart + 4, step.endTime);

    const element = {
      id: vm2Id(),
      type: 'image',
      imageUrl: url,
      imageBlob: file,
      timelineLane: vm2GetDefaultTimelineLaneForRange(elementStart, elementEnd),
      x: (vm2.project.width - w) / 2,
      y: (vm2.project.height - h) / 2,
      width: w,
      height: h,
      startTime: elementStart,
      endTime: elementEnd,
      opacity: 100,
      rotation: 0,
      locked: false,
    };

    step.elements.push(element);
    vm2.selectedElementId = element.id;
  vm2MarkDirty('Image added');

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
  if (!vm2EnsureEditable()) return;
  const file = event.target.files[0];
  if (!file) return;

  const step = vm2Step();
  if (!step) {
    alert('Load a video first');
    return;
  }

  const url = URL.createObjectURL(file);

  const elementStart = Math.max(step.startTime, Math.min(vm2.currentTime, step.endTime - 4));
  const elementEnd = Math.min(elementStart + 4, step.endTime);

  const element = {
    id: vm2Id(),
    type: 'audio',
    audioUrl: url,
    audioBlob: file,
    name: file.name,
    timelineLane: vm2GetDefaultTimelineLaneForRange(elementStart, elementEnd),
    startTime: elementStart,
    endTime: elementEnd,
    volume: 100,
  };

  step.elements.push(element);
  vm2.selectedElementId = element.id;
  vm2MarkDirty('Audio added');

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
  
  if (!vm2.project) return;
  const allElements = vm2.project.steps.reduce((acc, s) => acc.concat(s.elements || []), []);

  allElements.forEach(el => {
    if (el.layer === undefined) el.layer = 0;
  });
  
  // Highest layer renders first (behind), layer 0 renders last (on top)
  allElements.sort((a, b) => b.layer - a.layer);

  allElements.forEach(el => {
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
        const { startX, startY, endX, endY } = vm2GetShapeLocalEndpoints(el);
        div.innerHTML = `
          <svg width="100%" height="100%" viewBox="0 0 ${el.width} ${el.height}" style="overflow:visible;">
            <defs>
              <marker id="arrowhead-${el.id}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="${el.strokeColor}" />
              </marker>
            </defs>
            <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" 
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
      if (vm2.drawMode) return;
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

  vm2UpdateVisibleElements();
  vm2RenderSelectionHandles();
}

function vm2RenderSelectionHandles() {
  const overlay = vm2Get('vm2-selection-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';

  if (!vm2.selectedElementId || vm2.revisionPreview) return;

  if (!vm2.project) return;
  const allElements = vm2.project.steps.reduce((acc, s) => acc.concat(s.elements || []), []);

  const el = allElements.find(e => e.id === vm2.selectedElementId);
  if (!el || el.type === 'audio') return;
  if (!vm2IsElementVisibleAtTime(el, vm2.currentTime)) return;

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
      if (vm2.drawMode) return;
      e.stopPropagation();
      vm2.isResizingElement = true;
      vm2.resizeHandle = h;
      vm2.dragOffset = { x: e.clientX, y: e.clientY, el: { ...el } };
    });
    box.appendChild(handle);
  });

  if (el.type === 'shape' && (el.subtype === 'arrow' || el.subtype === 'line')) {
    const stem = document.createElement('div');
    stem.className = 'vm2-rotation-stem';
    box.appendChild(stem);

    const rotationHandle = document.createElement('div');
    rotationHandle.className = 'vm2-rotation-handle';
    rotationHandle.title = 'Drag to rotate. Hold Shift to snap.';
    rotationHandle.addEventListener('mousedown', (e) => {
      if (vm2.drawMode) return;
      e.preventDefault();
      e.stopPropagation();
      vm2StartRotationDrag(e, el);
    });
    box.appendChild(rotationHandle);
  }

  overlay.appendChild(box);
}

function vm2UpdateVisibleElements() {
  if (!vm2.project) return;
  const allElements = vm2.project.steps.reduce((acc, s) => acc.concat(s.elements || []), []);

  allElements.forEach(el => {
    const div = vm2Get('vm2-el-' + el.id);
    if (!div) return;

    const visible = vm2IsElementVisibleAtTime(el, vm2.currentTime);
    div.style.display = visible ? 'block' : 'none';
  });
}

function vm2RenderElementsList() {
  const list = vm2Get('vm2-elements-list');
  if (!list) return;

  if (!vm2.project) return;
  const allElements = vm2.project.steps.reduce((acc, s) => acc.concat(s.elements || []), []);

  if (allElements.length === 0) {
    list.innerHTML = '<p class="text-gray-400 italic text-center py-2">No elements</p>';
    return;
  }

  allElements.forEach(el => {
    if (el.layer === undefined) el.layer = 0;
  });
  // Top layer (0) first in list
  allElements.sort((a, b) => a.layer - b.layer);

  list.innerHTML = allElements.map(el => `
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
  if (!vm2EnsureEditable()) return;
  const result = vm2FindElementWithStep(id);
  if (!result) return;
  const { el, step } = result;

  const idx = step.elements.findIndex(e => e.id === id);
  if (idx >= 0) {
    step.elements.splice(idx, 1);
    if (vm2.selectedElementId === id) vm2.selectedElementId = null;
    vm2MarkDirty('Element deleted');
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

  const step = vm2Step();
  if (!step) {
    container.innerHTML = '<p class="text-xs text-gray-400 italic text-center py-8">Load a video first</p>';
    return;
  }

  // If no element selected, show step properties
  if (!vm2.selectedElementId) {
    container.innerHTML = `
      <!-- Step Properties -->
      <div class="mb-4">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
          <i class="ri-film-line"></i>Step ${vm2.currentStepIdx + 1}
        </p>
        <div class="mb-3">
          <label class="text-[10px] text-gray-400">Title</label>
          <input type="text" value="${step.label}" onchange="vm2UpdateStepProp('label', this.value)"
            class="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white">
        </div>
        <div class="mb-3">
          <label class="text-[10px] text-gray-400">Description</label>
          <textarea onchange="vm2UpdateStepProp('description', this.value)" rows="3"
            class="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 dark:text-white resize-none" placeholder="Describe this step...">${step.description || ''}</textarea>
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
            <input type="text" value="${vm2Fmt(step.startTime)}" readonly
              class="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          </div>
          <div>
            <label class="text-[10px] text-gray-400">End</label>
            <input type="text" value="${vm2Fmt(step.endTime)}" readonly
              class="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          </div>
        </div>
        <p class="text-[10px] text-gray-400 mt-1">Duration: ${vm2Fmt(step.endTime - step.startTime)}</p>
      </div>

      <!-- Audio -->
      <div class="mb-4">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
          <i class="ri-volume-up-line"></i>Audio
        </p>
        <button onclick="vm2ToggleStepMute(${vm2.currentStepIdx})"
          class="w-full py-2 flex items-center justify-center gap-2 rounded text-xs font-medium border transition-colors
            ${step.muted
              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-100'
              : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}">
          <i class="${step.muted ? 'ri-volume-mute-line' : 'ri-volume-up-line'}"></i>
          ${step.muted ? 'Unmute Clip' : 'Mute Clip'}
        </button>
      </div>

      <!-- Delete button -->
      <button onclick="vm2DeleteStep(${vm2.currentStepIdx})" class="w-full py-2 mt-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs flex items-center justify-center gap-1">
        <i class="ri-delete-bin-line"></i>${vm2.project.steps.length > 1 ? 'Delete Step' : 'Reset Step'}
      </button>
    `;
    return;
  }

  const el = vm2FindElement(vm2.selectedElementId);
  if (!el) {
    vm2.selectedElementId = null;
    return vm2RenderProps();
  }

  let html = `
    <!-- Layer / General -->
    <div class="mb-4">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
        <i class="ri-stack-line"></i>Layer & Align
      </p>
      <div class="flex gap-1 mb-2">
        <button onclick="vm2LayerElement('up')" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs" title="Bring Forward">
          <i class="ri-arrow-up-line"></i>
        </button>
        <button onclick="vm2LayerElement('down')" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs" title="Send Backward">
          <i class="ri-arrow-down-line"></i>
        </button>
        <button onclick="vm2LayerElement('front')" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs" title="Bring to Front">
          <i class="ri-arrow-up-double-line"></i>
        </button>
        <button onclick="vm2LayerElement('back')" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs" title="Send to Back">
          <i class="ri-arrow-down-double-line"></i>
        </button>
      </div>
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

    ${el.type !== 'audio' ? `
      <div class="mb-4">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
          <i class="ri-flashlight-line"></i>Blink
        </p>
        <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" ${el.blink ? 'checked' : ''} onchange="vm2UpdateProp('blink', this.checked)">
          <span>Blink at 1 Hz</span>
        </label>
        <p class="text-[10px] text-gray-400 mt-1">Visible for 0.5s, hidden for 0.5s.</p>
      </div>
    ` : ''}

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

    if (el.subtype === 'arrow' || el.subtype === 'line') {
      const rotationValue = vm2NormalizeAngle(el.rotation || 0);
      html += `
        <div class="mb-4">
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
            <i class="ri-refresh-line"></i>Rotate ${el.subtype === 'arrow' ? 'Arrow' : 'Line'}
          </p>
          <div class="flex gap-1 mb-2">
            <button onclick="vm2NudgeRotation(-45)" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs">-45°</button>
            <button onclick="vm2NudgeRotation(-15)" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs">-15°</button>
            <button onclick="vm2UpdateRotation(0, true)" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs">Reset</button>
            <button onclick="vm2NudgeRotation(15)" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs">+15°</button>
            <button onclick="vm2NudgeRotation(45)" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-xs">+45°</button>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <input type="range" min="0" max="360" value="${rotationValue}"
              oninput="vm2UpdateRotation(this.value); this.nextElementSibling.textContent=Math.round(this.value)+'°'"
              onchange="vm2UpdateRotation(this.value, true)"
              class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer">
            <span class="text-xs text-gray-500 w-10 text-right">${Math.round(rotationValue)}°</span>
          </div>
          <p class="text-[10px] text-gray-400">Drag the rotation handle above the selection box. Hold Shift to snap.</p>
        </div>
      `;
    }
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
  if (!vm2EnsureEditable()) return;
  const el = vm2FindElement(vm2.selectedElementId);
  if (!el) return;

  el[prop] = value;
  vm2MarkDirty('Element updated');

  vm2RenderElements();
  vm2RenderTimeline();
  if (prop !== 'opacity') vm2RenderProps();
}

function vm2AlignElement(alignment) {
  if (!vm2EnsureEditable()) return;
  const el = vm2FindElement(vm2.selectedElementId);
  if (!el) return;

  switch (alignment) {
    case 'left': el.x = 0; break;
    case 'center-h': el.x = (vm2.project.width - el.width) / 2; break;
    case 'right': el.x = vm2.project.width - el.width; break;
    case 'top': el.y = 0; break;
    case 'center-v': el.y = (vm2.project.height - el.height) / 2; break;
    case 'bottom': el.y = vm2.project.height - el.height; break;
  }

  vm2MarkDirty('Element aligned');
  vm2RenderElements();
  vm2RenderProps();
}

function vm2LayerElement(action) {
  if (!vm2EnsureEditable()) return;
  const result = vm2FindElementWithStep(vm2.selectedElementId);
  if (!result) return;
  const { el } = result;

  const allElements = vm2.project.steps.reduce((acc, s) => acc.concat(s.elements || []), []);
  allElements.forEach(e => { if (e.layer === undefined) e.layer = 0; });
  
  const maxLayer = Math.max(0, ...allElements.map(e => e.layer));
  
  if (action === 'up' && el.layer > 0) { // Bring Forward (visually higher track, lower layer num)
    const swap = allElements.find(e => e.layer === el.layer - 1);
    if (swap) swap.layer++;
    el.layer--;
  }
  else if (action === 'down' && el.layer < maxLayer) { // Send Backward (visually lower track, higher layer num)
    const swap = allElements.find(e => e.layer === el.layer + 1);
    if (swap) swap.layer--;
    el.layer++;
  }
  else if (action === 'front' && el.layer > 0) { // Bring to Top
    allElements.forEach(e => {
      if (e.layer < el.layer) e.layer++;
    });
    el.layer = 0;
  }
  else if (action === 'back' && el.layer < maxLayer) { // Send to Bottom
    allElements.forEach(e => {
      if (e.layer > el.layer) e.layer--;
    });
    el.layer = maxLayer;
  }

  vm2MarkDirty('Layer changed');
  vm2RenderElements();
  vm2RenderTimeline();
  vm2RenderElementsList();
  vm2RenderProps();
}

// ═══════════════════════════════════════════════════════════════════════════
//  TIMELINE
// ═══════════════════════════════════════════════════════════════════════════

function vm2TimelineBarsOverlap(a, b) {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

function vm2GetTimelineLaneNeighbors(elementId, laneIndex, project = vm2.project) {
  const laneLayout = vm2BuildTimelineLaneLayout(project);
  const target = vm2FindElement(elementId);
  if (!target) {
    return { laneLayout, previous: null, next: null };
  }

  const laneElements = [];
  laneLayout.laneById.forEach((lane, id) => {
    if (lane !== laneIndex || id === elementId) return;
    const other = vm2FindElement(id);
    if (other) laneElements.push(other);
  });

  let previous = null;
  let next = null;
  laneElements.forEach((other) => {
    if (other.endTime <= target.startTime) {
      if (!previous || other.endTime > previous.endTime) previous = other;
    }
    if (other.startTime >= target.endTime) {
      if (!next || other.startTime < next.startTime) next = other;
    }
  });

  return { laneLayout, previous, next };
}

function vm2BuildTimelineLaneLayout(project = vm2.project) {
  const elements = [];
  project?.steps?.forEach((step, stepIdx) => {
    (step.elements || []).forEach((el) => {
      elements.push({ ...el, stepIdx });
    });
  });

  if (!elements.length) {
    return { elements, laneById: new Map(), laneCount: 1 };
  }

  const laneOccupants = [];
  const laneById = new Map();
  const sorted = [...elements].sort((a, b) => {
    if (a.startTime !== b.startTime) return a.startTime - b.startTime;
    if (a.endTime !== b.endTime) return a.endTime - b.endTime;
    const aPref = Number.isFinite(a.timelineLane) ? a.timelineLane : Number.MAX_SAFE_INTEGER;
    const bPref = Number.isFinite(b.timelineLane) ? b.timelineLane : Number.MAX_SAFE_INTEGER;
    if (aPref !== bPref) return aPref - bPref;
    return (a.layer || 0) - (b.layer || 0);
  });

  sorted.forEach((el) => {
    const hasExplicitLane = Number.isFinite(el.timelineLane);
    const preferredLane = hasExplicitLane
      ? Math.max(0, Math.min(VM2_TIMELINE_MAX_LANES - 1, Math.floor(el.timelineLane)))
      : 0;
    let lane = preferredLane;

    const canUseLane = (laneIndex) => {
      const occupants = laneOccupants[laneIndex] || [];
      return occupants.every(existing => !vm2TimelineBarsOverlap(existing, el));
    };

    if (!hasExplicitLane) {
      while (lane < VM2_TIMELINE_MAX_LANES && !canUseLane(lane)) lane++;
      if (lane >= VM2_TIMELINE_MAX_LANES) {
        lane = VM2_TIMELINE_MAX_LANES - 1;
      }
    }

    if (!laneOccupants[lane]) laneOccupants[lane] = [];
    laneOccupants[lane].push(el);
    laneById.set(el.id, lane);
  });

  const usedLanes = [...new Set([...laneById.values()].sort((a, b) => a - b))];
  const denseLaneMap = new Map(usedLanes.map((lane, idx) => [lane, idx]));
  const denseLaneById = new Map();
  laneById.forEach((lane, id) => {
    denseLaneById.set(id, denseLaneMap.get(lane) || 0);
  });

  return {
    elements,
    laneById: denseLaneById,
    laneCount: Math.max(1, Math.min(VM2_TIMELINE_MAX_LANES, usedLanes.length)),
  };
}

function vm2GetDefaultTimelineLaneForRange(startTime, endTime, { excludeId = null, project = vm2.project } = {}) {
  const laneLayout = vm2BuildTimelineLaneLayout(project);
  let highestOccupiedLane = -1;

  laneLayout.laneById.forEach((lane, id) => {
    if (id === excludeId) return;
    const other = vm2FindElement(id);
    if (!other) return;
    if (other.startTime < endTime && startTime < other.endTime) {
      highestOccupiedLane = Math.max(highestOccupiedLane, lane);
    }
  });

  return Math.max(0, Math.min(VM2_TIMELINE_MAX_LANES - 1, highestOccupiedLane + 1));
}

function vm2RenderTimeline() {
  if (!vm2.project) return;

  const sequenceDuration = vm2SyncSequenceDuration(vm2.project);
  if (sequenceDuration <= 0) return;

  const sequencePixelWidth = sequenceDuration * vm2.timelineZoom;
  const timelineContentWidth = vm2GetTimelineContentWidth(sequenceDuration);
  const rowHeight = 28;
  const rowGap = 4;
  const laneInset = 8;
  const videoTrackHeight = 32;
  const trackGap = 12;
  const trackBottomMargin = 8;
  const rulerHeight = 24;
  const scrollChromeAllowance = 14;
  const { elements: allTimelineElements, laneById, laneCount } = vm2BuildTimelineLaneLayout(vm2.project);
  const elementTracksHeight = Math.max(80, laneCount * (rowHeight + rowGap) - rowGap + laneInset);
  const tracksHeight = elementTracksHeight + trackGap + videoTrackHeight + trackBottomMargin;

  const tracksHost = vm2Get('vm2-tracks');
  if (tracksHost) {
    tracksHost.style.height = tracksHeight + 'px';
    tracksHost.style.minHeight = tracksHeight + 'px';
  }

  const scroll = vm2Get('vm2-timeline-scroll');
  if (scroll) {
    scroll.style.height = Math.max(180, rulerHeight + tracksHeight + scrollChromeAllowance) + 'px';
  }

  const videoTrack = vm2Get('vm2-video-track');
  if (videoTrack) {
    videoTrack.style.height = videoTrackHeight + 'px';
    videoTrack.style.marginTop = trackGap + 'px';
    videoTrack.style.marginBottom = trackBottomMargin + 'px';
  }

  const ruler = vm2Get('vm2-time-ruler');
  if (ruler) {
    ruler.style.width = timelineContentWidth + 'px';
    let rulerHtml = '';
    const majorStep = vm2GetTimelineMajorStep();
    const minorStep = vm2GetTimelineMinorStep(majorStep);

    if (minorStep) {
      for (let t = minorStep; t < sequenceDuration; t += minorStep) {
        const isMajorTick = Math.abs((t / majorStep) - Math.round(t / majorStep)) < 1e-6;
        if (isMajorTick) continue;
        const x = t * vm2.timelineZoom;
        rulerHtml += `
          <div class="absolute w-px h-1.5 bg-gray-200 dark:bg-gray-700" style="left: ${x}px; bottom: 0;"></div>
        `;
      }
    }

    for (let t = 0; t <= sequenceDuration + 1e-6; t += majorStep) {
      const x = t * vm2.timelineZoom;
      rulerHtml += `
        <div class="absolute text-[10px] text-gray-500" style="left: ${x}px; top: 4px;">${vm2Fmt(t)}</div>
        <div class="absolute w-px h-2 bg-gray-300 dark:bg-gray-600" style="left: ${x}px; bottom: 0;"></div>
      `;
    }
    ruler.innerHTML = rulerHtml;
  }

  const segs = vm2Get('vm2-step-segments');
  if (segs) {
    segs.style.width = timelineContentWidth + 'px';
    segs.innerHTML = vm2.project.steps.map((step, i) => {
      const left = step.startTime * vm2.timelineZoom;
      const width = (step.endTime - step.startTime) * vm2.timelineZoom;
      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#6366f1'];
      const color = colors[i % colors.length];
      return `
        <div class="absolute h-full rounded flex items-center px-2 text-xs text-white font-medium overflow-hidden vm2-step-seg transition-all duration-200"
             style="left: ${left}px; width: ${width}px; background: ${color};"
             draggable="true"
             ondragstart="vm2StepDragStart(event, ${i})"
             ondragend="vm2StepDragEnd(event)"
             ondragover="event.preventDefault(); this.style.transform='scale(0.95)'; this.style.boxShadow='0 0 0 2px #3b82f6 inset'"
             ondragleave="this.style.transform='scale(1)'; this.style.boxShadow='none'"
             ondrop="this.style.transform='scale(1)'; this.style.boxShadow='none'; vm2StepDrop(event, ${i})"
             onclick="vm2SelectStep(${i}, event)"
             title="${step.label}: ${vm2Fmt(step.startTime)} - ${vm2Fmt(step.endTime)}${step.muted ? ' [Muted]' : ''}">
          <div class="resize-left" onmousedown="event.stopPropagation(); vm2StepResizeStart(event, ${i}, 'left')"></div>
          <span class="flex-1 truncate px-2">${step.label}</span>
          ${step.muted ? '<i class="ri-volume-mute-line opacity-80 flex-shrink-0 mr-1"></i>' : ''}
          <div class="resize-right" onmousedown="event.stopPropagation(); vm2StepResizeStart(event, ${i}, 'right')"></div>
        </div>
      `;
    }).join('') + `
      <button class="absolute h-full rounded border border-dashed border-sky-300 bg-sky-50/80 px-3 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-900/20 dark:text-sky-300 dark:hover:bg-sky-900/30"
              style="left: ${sequencePixelWidth + 12}px; width: 120px;"
              onclick="vm2OpenAddClipChooser()">
        <i class="ri-add-line mr-1"></i>Add Clip
      </button>
    `;
  }

  const tracks = vm2Get('vm2-element-tracks');
  if (tracks) {
    tracks.style.width = timelineContentWidth + 'px';
    tracks.style.height = elementTracksHeight + 'px';
    tracks.style.minHeight = elementTracksHeight + 'px';

    vm2.project.steps.forEach((step) => {
      (step.elements || []).forEach((el) => {
        const assignedLane = laneById.get(el.id);
        if (assignedLane !== undefined) {
          el.timelineLane = assignedLane;
        }
      });
    });

    const typeColors = {
      text: '#f59e0b',
      shape: '#10b981',
      image: '#6366f1',
      audio: '#ec4899',
    };

    tracks.innerHTML = allTimelineElements.map(el => {
      const left = el.startTime * vm2.timelineZoom;
      const width = Math.max((el.endTime - el.startTime) * vm2.timelineZoom, 20);
      const lane = laneById.get(el.id) || 0;
      const top = (laneCount - lane - 1) * (rowHeight + rowGap);
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
    
    if (vm2.isScrubbing) {
      vm2SeekTo(time);
    }
  }
}

function vm2OnTimelineMouseLeave() {
  const hover = vm2Get('vm2-hover-indicator');
  if (hover) hover.style.opacity = '0';
  vm2.hoverTime = null;
}

function vm2OnTimelineMouseDown(event) {
  // Don't scrub if clicking on a bar or a handle or a step segment
  if (event.target.closest('.vm2-timeline-bar') || event.target.closest('.resize-left') || event.target.closest('.resize-right') || event.target.closest('.vm2-step-seg')) return;
  event.preventDefault();
  
  const scroll = vm2Get('vm2-timeline-scroll');
  if (!scroll || vm2.duration <= 0) return;

  const rect = scroll.getBoundingClientRect();
  const x = event.clientX - rect.left + scroll.scrollLeft;
  const time = Math.max(0, Math.min(x / vm2.timelineZoom, vm2.duration));
  
  vm2.isScrubbing = true;
  document.body.classList.add('vm2-no-select');
  vm2SeekTo(time);
}

function vm2ZoomTimeline(delta) {
  let nextZoom = vm2.timelineZoom;

  if (delta < 0) {
    const zoomOutStep = Math.max(1, Math.min(Math.abs(delta), vm2.timelineZoom * 0.2));
    nextZoom = vm2.timelineZoom - zoomOutStep;
  } else if (delta > 0) {
    const zoomInStep = Math.max(1, Math.min(Math.abs(delta), Math.max(vm2.timelineZoom * 0.2, 1)));
    nextZoom = vm2.timelineZoom + zoomInStep;
  }

  vm2.timelineZoom = Math.max(VM2_TIMELINE_MIN_ZOOM, Math.min(VM2_TIMELINE_MAX_ZOOM, nextZoom));
  vm2RenderTimeline();
}

function vm2FitTimeline() {
  const scroll = vm2Get('vm2-timeline-scroll');
  if (!scroll || vm2.duration <= 0) return;

  const availWidth = Math.max(0, scroll.clientWidth - 20 - VM2_TIMELINE_ADD_CLIP_WIDTH);
  const nextZoom = availWidth / vm2.duration;
  vm2.timelineZoom = Math.max(VM2_TIMELINE_MIN_ZOOM, Math.min(VM2_TIMELINE_MAX_ZOOM, nextZoom));
  vm2RenderTimeline();
  scroll.scrollLeft = 0;
}

// Timeline bar interactions
function vm2TimelineBarMouseDown(event, id) {
  if (!vm2EnsureEditable()) return;
  if (event.target.classList.contains('resize-left') || event.target.classList.contains('resize-right')) return;
  
  event.preventDefault();
  event.stopPropagation();
  vm2.selectedElementId = id;
  vm2.isDraggingTimelineBar = true;
  document.body.classList.add('vm2-no-select');
  
  const el = vm2FindElement(id);
  if (el) {
    const laneLayout = vm2BuildTimelineLaneLayout(vm2.project);
    vm2.timelineDragData = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      originalStart: el.startTime,
      originalEnd: el.endTime,
      originalLane: laneLayout.laneById.get(el.id) || 0,
      originalAssignedLane: laneLayout.laneById.get(el.id) || 0,
    };
  }

  vm2RenderElements();
  vm2RenderTimeline();
  vm2RenderElementsList();
  vm2RenderProps();
  vm2SwitchTab('properties');
}

function vm2TimelineResizeStart(event, id, side) {
  if (!vm2EnsureEditable()) return;
  event.preventDefault();
  event.stopPropagation();
  vm2.selectedElementId = id;
  vm2.isDraggingTimelineBar = true;
  document.body.classList.add('vm2-no-select');
  
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

function vm2FindElementWithStep(id) {
  for (const step of vm2.project.steps) {
    const el = step.elements.find(e => e.id === id);
    if (el) return { el, step };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  GLOBAL MOUSE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('mousemove', (event) => {
  if (vm2.drawShapeData) {
    let point = vm2CanvasPointFromEvent(event);
    const element = vm2FindElement(vm2.drawShapeData.elementId);
    if (point && element) {
      if (event.shiftKey) {
        point = vm2ConstrainPointAngle(vm2.drawShapeData.startPoint, point, 45);
      }
      vm2UpdateDrawnShapeGeometry(element, vm2.drawShapeData.startPoint, point);
      vm2RenderElements();
    }
  }

  // Timeline Scrubbing global drag
  if (vm2.isScrubbing) {
    const scroll = vm2Get('vm2-timeline-scroll');
    if (!scroll) return;
    const rect = scroll.getBoundingClientRect();
    const x = event.clientX - rect.left + scroll.scrollLeft;
    const time = Math.max(0, Math.min(x / vm2.timelineZoom, vm2.duration));
    vm2SeekTo(time);
  }

  // Element dragging on canvas
  if (vm2.isDraggingElement && vm2.selectedElementId) {
    const el = vm2FindElement(vm2.selectedElementId);
    if (!el) return;

    el.x = (event.clientX - vm2.dragOffset.x) / vm2.canvasZoom;
    el.y = (event.clientY - vm2.dragOffset.y) / vm2.canvasZoom;

    vm2RenderElements();
  }

  // Element resizing on canvas
  if (vm2.isResizingElement && vm2.selectedElementId && vm2.resizeHandle) {
    const el = vm2FindElement(vm2.selectedElementId);
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

  if (vm2.isRotatingElement && vm2.selectedElementId && vm2.rotationData) {
    const el = vm2FindElement(vm2.selectedElementId);
    if (!el) return;

    const pointerAngle = vm2RadToDeg(Math.atan2(
      event.clientY - vm2.rotationData.centerY,
      event.clientX - vm2.rotationData.centerX
    ));
    let nextRotation = vm2.rotationData.originalRotation + (pointerAngle - vm2.rotationData.startPointerAngle);
    if (event.shiftKey) {
      nextRotation = vm2SnapAngle(nextRotation, 15);
    }
    el.rotation = vm2NormalizeAngle(nextRotation);
    vm2RenderElements();
  }

  // Timeline bar dragging
  if (vm2.isDraggingTimelineBar && vm2.timelineDragData) {
    const result = vm2FindElementWithStep(vm2.timelineDragData.id);
    if (!result) return;
    const { el, step } = result;

    const dx = event.clientX - vm2.timelineDragData.startX;
    const dy = event.clientY - vm2.timelineDragData.startY;
    const dt = dx / vm2.timelineZoom;
    const activeLane = Number.isFinite(el.timelineLane) ? el.timelineLane : (vm2.timelineDragData.originalLane || 0);
    const { laneLayout, previous, next } = vm2GetTimelineLaneNeighbors(el.id, activeLane, vm2.project);

    if (vm2.timelineDragData.side === 'left') {
      const minStart = previous ? previous.endTime : 0;
      el.startTime = Math.max(minStart, Math.min(vm2.timelineDragData.originalStart + dt, el.endTime - 0.1));
    } else if (vm2.timelineDragData.side === 'right') {
      const maxEnd = next ? next.startTime : vm2.duration;
      el.endTime = Math.min(maxEnd, Math.max(vm2.timelineDragData.originalEnd + dt, el.startTime + 0.1));
    } else {
      const duration = vm2.timelineDragData.originalEnd - vm2.timelineDragData.originalStart;
      let newStart = vm2.timelineDragData.originalStart + dt;
      const minStart = previous ? previous.endTime : 0;
      const maxStart = next ? next.startTime - duration : vm2.duration - duration;
      newStart = Math.max(minStart, Math.min(newStart, maxStart));
      el.startTime = newStart;
      el.endTime = newStart + duration;

      // Vertical track dragging logic
      const rowHeight = 28;
      const rowGap = 4;
      const totalH = rowHeight + rowGap;
      const layerShift = Math.round(dy / totalH);
      let highestOtherLane = -1;
      laneLayout.laneById.forEach((lane, id) => {
        if (id !== el.id) highestOtherLane = Math.max(highestOtherLane, lane);
      });
      const maxAllowedLane = Math.min(VM2_TIMELINE_MAX_LANES - 1, highestOtherLane + 1);
      const requestedLane = vm2.timelineDragData.originalLane - layerShift;
      const newLane = Math.max(0, Math.min(maxAllowedLane, requestedLane));
      const currentLane = laneLayout.laneById.get(el.id) || 0;
      const targetHasConflict = [...laneLayout.laneById.entries()].some(([id, lane]) => {
        if (id === el.id || lane !== newLane) return false;
        const other = vm2FindElement(id);
        return other ? vm2TimelineBarsOverlap(other, el) : false;
      });

      if (newLane !== currentLane && !targetHasConflict) {
        el.timelineLane = newLane;
        vm2.timelineDragData.originalLane = newLane;
        vm2.timelineDragData.startY = event.clientY; // reset base
      }
    }

    vm2RenderTimeline();
  }

  // Step/video clip resizing
  if (vm2.isResizingStep && vm2.stepResizeData) {
    const d = vm2.stepResizeData;
    const step = vm2.project.steps[d.idx];
    if (!step) return;

    const dx = event.clientX - d.startX;
    const dt = dx / vm2.timelineZoom;
    const minDuration = 0.5; // Minimum step duration

    if (d.side === 'left') {
      // Resize left - trim beginning of this step, expand previous step
      let newStart = d.originalStart + dt;
      newStart = Math.max(0, Math.min(newStart, d.originalEnd - minDuration));
      const newSourceStart = d.originalSourceStart + (newStart - d.originalStart);
      
      // If previous step exists, adjust its end time and source end
      if (d.idx > 0) {
        const prevStep = vm2.project.steps[d.idx - 1];
        newStart = Math.max(prevStep.startTime + minDuration, newStart);
        prevStep.endTime = newStart;
        prevStep.sourceEnd = newSourceStart;
        vm2ConstrainElementsToStep(prevStep);
      }
      step.startTime = newStart;
      step.sourceStart = newSourceStart;
    } else if (d.side === 'right') {
      // Resize right - trim end of this step, expand next step
      let newEnd = d.originalEnd + dt;
      newEnd = Math.min(vm2.duration, Math.max(newEnd, d.originalStart + minDuration));
      const newSourceEnd = d.originalSourceEnd + (newEnd - d.originalEnd);
      
      // If next step exists, adjust its start time and source start
      if (d.idx < vm2.project.steps.length - 1) {
        const nextStep = vm2.project.steps[d.idx + 1];
        newEnd = Math.min(nextStep.endTime - minDuration, newEnd);
        nextStep.startTime = newEnd;
        nextStep.sourceStart = newSourceEnd;
        vm2ConstrainElementsToStep(nextStep);
      }
      step.endTime = newEnd;
      step.sourceEnd = newSourceEnd;
    }

    // Constrain current step's elements
    vm2ConstrainElementsToStep(step);

    vm2SyncSequenceDuration(vm2.project);

    vm2RenderTimeline();
    vm2RenderSteps();
  }
});

document.addEventListener('mouseup', () => {
  let shouldMarkDirty = false;

  if (vm2.drawShapeData) {
    const element = vm2FindElement(vm2.drawShapeData.elementId);
    if (element) {
      element.width = Math.max(element.width, 20);
      element.height = Math.max(element.height, 20);
      shouldMarkDirty = true;
    }
    vm2.drawShapeData = null;
    vm2RenderElements();
    vm2RenderTimeline();
    vm2RenderElementsList();
    vm2RenderProps();
  }

  if (vm2.isDraggingElement || vm2.isResizingElement) {
    shouldMarkDirty = true;
    vm2.isDraggingElement = false;
    vm2.isResizingElement = false;
    vm2.resizeHandle = null;
    vm2RenderProps();
  }

  if (vm2.isRotatingElement) {
    shouldMarkDirty = true;
    vm2.isRotatingElement = false;
    vm2.rotationData = null;
    vm2RenderProps();
  }

  if (vm2.isDraggingTimelineBar) {
    shouldMarkDirty = true;
    if (vm2.timelineDragData) {
      const result = vm2FindElementWithStep(vm2.timelineDragData.id);
      if (result) {
        const { el, step: oldStep } = result;
        const newStep = vm2.project.steps.find(s => el.startTime >= s.startTime && el.startTime < s.endTime) || vm2.project.steps[vm2.project.steps.length - 1];
        if (newStep && newStep !== oldStep) {
          oldStep.elements = oldStep.elements.filter(e => e.id !== el.id);
          newStep.elements.push(el);
        }
      }
    }
    vm2.isDraggingTimelineBar = false;
    vm2.timelineDragData = null;
    vm2RenderTimeline();
    vm2RenderProps();
  }

  if (vm2.isResizingStep) {
    shouldMarkDirty = true;
    vm2.isResizingStep = false;
    vm2.stepResizeData = null;
  }
    
    if (vm2.isScrubbing) {
      vm2.isScrubbing = false;
    }

  document.body.classList.remove('vm2-no-select');

  if (shouldMarkDirty && !vm2.revisionPreview) {
    vm2MarkDirty('Timeline updated');
  }
});

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

document.addEventListener('keydown', (event) => {
  const target = event.target;
  const isEditable = target instanceof HTMLElement && (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );

  if (isEditable || event.repeat) return;

  if (event.code === 'Space') {
    event.preventDefault();
    vm2TogglePlay();
  }
});
async function vm2SaveProject() {
  if (!vm2EnsureProject() || !vm2EnsureEditable()) return;
  if (vm2.uploadInProgress) {
    alert('Please wait for the video upload to finish before saving a revision.');
    return;
  }
  if (!vm2.project.videoUrl) {
    alert('Upload a video before saving a revision.');
    return;
  }

  vm2.project.title = vm2Get('vm2-title')?.value || vm2.project.title || 'Untitled1';
  const defaultRevisionName = `${vm2.project.title || 'Untitled'} Rev ${String((vm2.project.currentRevisionNumber || 0) + 1).padStart(2, '0')}`;
  const revisionName = prompt('Revision name:', defaultRevisionName);
  if (!revisionName) return;

  // Autosave the working copy first so the revision snapshot is fresh.
  await vm2PersistWorkingProject({ silent: true, reason: 'Saved working copy' });

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-projects/${vm2.project._id}/revisions`, {
      method: 'POST',
      headers: vm2AuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        revisionName,
        snapshot: vm2BuildRevisionSnapshot(),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || String(res.status));
    }

    const data = await res.json();
    vm2.project.currentRevisionNumber = data.revisionNumber || vm2.project.currentRevisionNumber;
    vm2.project.lastRevisionId = data.revisionId || vm2.project.lastRevisionId;
    await vm2PersistWorkingProject({ silent: true, reason: 'Revision saved' });
    alert('Revision saved!');
    vm2ShowHistory();
  } catch (err) {
    console.error('[VM2] Save revision error:', err);
    alert('Failed to save revision: ' + err.message);
  }
}

async function vm2OpenProject() {
  await vm2ReturnToBrowser();
}

async function vm2ShowHistory() {
  const list = vm2Get('vm2-history-list');
  const meta = vm2Get('vm2-history-meta');
  if (!list) return;

  vm2Get('vm2-modal-history').classList.remove('hidden');

  if (!vm2.project?._id) {
    if (meta) meta.textContent = 'Select a saved project to view revision deployment status.';
    list.innerHTML = '<p class="text-sm text-gray-400 text-center py-6">Save a working project first.</p>';
    return;
  }

  if (meta) {
    const deploymentText = vm2.project.deployedRevisionId
      ? `Factory live revision: ${vm2.project.deployedRevisionName || `Rev ${vm2.project.deployedRevisionNumber || '?'}`} · Deployed ${new Date(vm2.project.deployedAt || Date.now()).toLocaleString()}`
      : 'Factory live revision: Not deployed';
    meta.innerHTML = `<div class="flex items-center justify-between gap-3"><span>${deploymentText}</span>${vm2CanDeployProject() && vm2.project.deployedRevisionId ? '<button onclick="vm2UndeployProject()" class="rounded border border-amber-200 px-2 py-1 text-[11px] font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/20">Undeploy</button>' : ''}</div>`;
  }

  list.innerHTML = '<p class="text-sm text-gray-400 text-center py-6">Loading revisions…</p>';

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-projects/${vm2.project._id}/revisions`, {
      headers: vm2AuthHeaders(),
    });
    if (!res.ok) throw new Error(String(res.status));
    const revisions = await res.json();

    if (!revisions.length) {
      list.innerHTML = `<p class="text-sm text-gray-400 text-center py-6">${t('vmNoRevisionsYet')}<br>${t('vmUseRevisionToCreate')}</p>`;
      return;
    }

    list.innerHTML = revisions.map((revision) => `
      <div class="rounded-lg border ${revision.isDeployed ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/60 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-gray-700'} p-3">
        <div class="flex items-start gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-white truncate">${revision.revisionName || t('vmUnnamedRevision')}</p>
              ${revision.isDeployed ? '<span class="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">LIVE</span>' : ''}
            </div>
            <p class="text-xs text-gray-400">Revision ${revision.revisionNumber || '?'} · ${revision.folder || 'root'} · ${new Date(revision.createdAt).toLocaleString()}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="vm2PreviewRevision('${revision._id}')" class="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded hover:bg-blue-100">Preview</button>
            ${!vm2.revisionPreview ? `<button onclick="vm2RestoreRevisionAsWorkingCopy('${revision._id}')" class="px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300">Restore</button>` : ''}
            ${vm2CanDeployProject() && !vm2.revisionPreview ? (revision.isDeployed
              ? '<span class="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Deployed</span>'
              : `<button onclick="vm2DeployRevision('${revision._id}')" class="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300">Deploy</button>`)
              : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<p class="text-sm text-red-400 text-center py-6">Failed to load revisions: ${err.message}</p>`;
  }
}

async function vm2DeployRevision(revisionId) {
  if (!vm2.project?._id) return;
  vm2ResetExportModal('Deploy Revision');

  try {
    const revisionRes = await fetch(`${vm2BaseUrl()}api/video-revisions/${revisionId}`, {
      headers: vm2AuthHeaders(),
    });
    if (!revisionRes.ok) {
      const err = await revisionRes.json().catch(() => ({}));
      throw new Error(err.error || `Failed to load revision ${revisionId}`);
    }

    const revision = await revisionRes.json();
    const deployProject = vm2DeepClone(revision.snapshot || {});
    if (!deployProject?.steps?.length) {
      throw new Error('Selected revision has no steps to deploy.');
    }

    deployProject.title = deployProject.title || vm2.project.title || 'video-manual';
    const targetSize = vm2GetFlattenedDeploymentSize(deployProject);
    const safeTitle = String(deployProject.title || 'video-manual').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'video-manual';

    const webmBlob = await vm2RenderProjectToWebmBlob(deployProject, {
      width: targetSize.width,
      height: targetSize.height,
      onProgress: ({ percent, status, detail }) => {
        vm2SetExportProgress(status, detail, percent * 0.55);
      },
    });

    vm2SetExportProgress('Converting flattened video to H.264...', `${targetSize.width}x${targetSize.height} optimized for Raspberry Pi playback`, 56);
    const flattenedFile = await vm2TranscodeToH264(
      new File([webmBlob], `${safeTitle}-rev-${revision.revisionNumber || 'deploy'}.webm`, { type: 'video/webm' }),
      (progress) => {
        vm2SetExportProgress(
          'Converting flattened video to H.264...',
          `${Math.round(progress * 100)}% transcoded`,
          56 + (progress * 24)
        );
      }
    );

    vm2.uploadInProgress = true;
    vm2SetExportProgress('Uploading flattened deployment video...', `${flattenedFile.name} (${(flattenedFile.size / 1024 / 1024).toFixed(1)} MB)`, 80);
    const flattenedUpload = await vm2UploadVideoBinary(flattenedFile, {
      uploadFolder: 'videoManualDeployed',
      onProgress: (loaded, total) => {
        const percent = 80 + ((loaded / total) * 18);
        vm2SetExportProgress(
          'Uploading flattened deployment video...',
          `${(loaded / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024).toFixed(1)} MB`,
          percent
        );
      },
    });

    vm2SetExportProgress('Activating deployed revision...', 'Saving deployed playback source', 99);
    const res = await fetch(`${vm2BaseUrl()}api/video-projects/${vm2.project._id}/deploy`, {
      method: 'POST',
      headers: vm2AuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        revisionId,
        deployedVideo: {
          url: flattenedUpload.url,
          storagePath: flattenedUpload.storagePath,
          mimeType: flattenedUpload.mimeType || flattenedFile.type || 'video/mp4',
          fileName: flattenedUpload.fileName || flattenedFile.name,
          uploadedAt: flattenedUpload.uploadedAt || vm2NowIso(),
        },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || String(res.status));
    }

    const data = await res.json();
    const deployedAt = data.deployedAt || vm2NowIso();
    vm2.project.deployedRevisionId = data.revisionId || revisionId;
    vm2.project.deployedRevisionNumber = data.revisionNumber || null;
    vm2.project.deployedRevisionName = data.revisionName || null;
    vm2.project.deployedAt = deployedAt;
    vm2.project.deployedBy = data.deployedBy || vm2AuthUser().username || 'unknown';
    vm2.project.deployedVideoUrl = data.deployedVideoUrl || flattenedUpload.url;
    vm2.project.deployedVideoStoragePath = data.deployedVideoStoragePath || flattenedUpload.storagePath || null;
    vm2.project.deployedVideoMimeType = data.deployedVideoMimeType || flattenedUpload.mimeType || flattenedFile.type || 'video/mp4';
    vm2.project.deployedVideoFileName = data.deployedVideoFileName || flattenedUpload.fileName || flattenedFile.name;
    vm2.project.updatedAt = deployedAt;
    vm2SyncPlaylistProjectEntry(vm2.project._id, {
      deployedRevisionId: vm2.project.deployedRevisionId,
      deployedRevisionNumber: vm2.project.deployedRevisionNumber,
      deployedRevisionName: vm2.project.deployedRevisionName,
      deployedAt: vm2.project.deployedAt,
      deployedBy: vm2.project.deployedBy,
      deployedVideoUrl: vm2.project.deployedVideoUrl,
      deployedVideoStoragePath: vm2.project.deployedVideoStoragePath,
      deployedVideoMimeType: vm2.project.deployedVideoMimeType,
      deployedVideoFileName: vm2.project.deployedVideoFileName,
      updatedAt: vm2.project.updatedAt,
    });
    vm2SetSaveStatus(`Deployed ${data.revisionName || `Rev ${data.revisionNumber || '?'}`}`, 'green');
    vm2RenderPlaylistBrowser();
    await vm2ShowHistory();
    vm2SetExportProgress('Deployment complete', 'Factory playback will now use the flattened Raspberry Pi video.', 100);
    vm2ShowExportDone({
      label: 'Deployment Complete!',
      downloadUrl: vm2.project.deployedVideoUrl,
      downloadName: vm2.project.deployedVideoFileName,
      buttonLabel: 'Download Flattened MP4',
    });
  } catch (err) {
    console.error('[VM2] Deploy revision error:', err);
    vm2ShowExportError(err.message);
    alert('Failed to deploy revision: ' + err.message);
  } finally {
    vm2.uploadInProgress = false;
    vm2.uploadXhr = null;
  }
}

async function vm2UndeployProject() {
  if (!vm2.project?._id) return;
  if (!confirm(`Hide "${vm2.project.title || 'Untitled Project'}" from the factory side?`)) return;
  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-projects/${vm2.project._id}/undeploy`, {
      method: 'POST',
      headers: vm2AuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || String(res.status));
    }

    vm2.project.deployedRevisionId = null;
    vm2.project.deployedRevisionNumber = null;
    vm2.project.deployedRevisionName = null;
    vm2.project.deployedAt = null;
    vm2.project.deployedBy = null;
    vm2.project.deployedVideoUrl = null;
    vm2.project.deployedVideoStoragePath = null;
    vm2.project.deployedVideoMimeType = null;
    vm2.project.deployedVideoFileName = null;
    vm2.project.updatedAt = vm2NowIso();
    vm2SyncPlaylistProjectEntry(vm2.project._id, {
      deployedRevisionId: null,
      deployedRevisionNumber: null,
      deployedRevisionName: null,
      deployedAt: null,
      deployedBy: null,
      updatedAt: vm2.project.updatedAt,
    });
    vm2SetSaveStatus('Undeployed', 'green');
    vm2RenderPlaylistBrowser();
    await vm2ShowHistory();
  } catch (err) {
    console.error('[VM2] Undeploy project error:', err);
    alert('Failed to undeploy project: ' + err.message);
  }
}

async function vm2RestoreRevisionAsWorkingCopy(revisionId) {
  if (!vm2.project?._id) return;
  if (!confirm('Restore this revision as your working copy? Your current unsaved changes will be overwritten. You can then save it as a new revision.')) return;
  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-revisions/${revisionId}`, {
      headers: vm2AuthHeaders(),
    });
    if (!res.ok) throw new Error(String(res.status));
    const revision = await res.json();
    const snapshot = vm2DeepClone(revision.snapshot || {});

    // Preserve identity and deployment metadata from the live project
    snapshot._id = vm2.project._id;
    snapshot.playlistId = vm2.project.playlistId;
    snapshot.currentRevisionNumber = vm2.project.currentRevisionNumber;
    snapshot.lastRevisionId = vm2.project.lastRevisionId;
    snapshot.deployedRevisionId = vm2.project.deployedRevisionId;
    snapshot.deployedRevisionNumber = vm2.project.deployedRevisionNumber;
    snapshot.deployedRevisionName = vm2.project.deployedRevisionName;
    snapshot.deployedAt = vm2.project.deployedAt;
    snapshot.deployedBy = vm2.project.deployedBy;

    vm2ApplyProjectState(snapshot, { readOnlyRevision: null });
    vm2MarkDirty('Restored from revision');
    vm2Get('vm2-modal-history')?.classList.add('hidden');
    await vm2PersistWorkingProject({ silent: true, reason: 'Restored from revision' });
    vm2SetSaveStatus(`Restored from ${revision.revisionName || `Rev ${revision.revisionNumber || '?'}`} — save a new revision when ready`, 'blue');
  } catch (err) {
    console.error('[VM2] Restore revision as working copy error:', err);
    alert('Failed to restore revision: ' + err.message);
  }
}

async function vm2PreviewRevision(revisionId) {
  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-revisions/${revisionId}`, {
      headers: vm2AuthHeaders(),
    });
    if (!res.ok) throw new Error(String(res.status));
    const revision = await res.json();
    const snapshot = vm2DeepClone(revision.snapshot || {});
    snapshot._id = revision.projectId;
    snapshot.__previewRevisionId = revision._id;
    snapshot.currentRevisionNumber = revision.revisionNumber || snapshot.currentRevisionNumber || 0;
    vm2ApplyProjectState(snapshot, { readOnlyRevision: revision });
    vm2Get('vm2-modal-history').classList.add('hidden');
  } catch (err) {
    console.error('[VM2] Preview revision error:', err);
    alert('Failed to preview revision: ' + err.message);
  }
}

function vm2ExitRevisionPreview() {
  if (!vm2.revisionPreview || !vm2.project?._id) return;
  vm2LoadProject(vm2.project._id);
}

async function vm2LoadProjectsList() {
  const list = vm2Get('vm2-projects-list');
  if (!list) return;

  list.innerHTML = '<p class="text-center text-gray-400 py-4">Loading...</p>';

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-playlists`, {
      headers: vm2AuthHeaders(),
    });
    if (!res.ok) throw new Error(String(res.status));
    const playlists = await res.json();

    if (!playlists.length) {
      list.innerHTML = '<p class="text-center text-gray-400 py-4">No playlists available</p>';
      return;
    }

    vm2._projectsList = playlists;
    vm2RenderProjectsList(playlists);
  } catch (err) {
    console.error('[VM2] Load projects list error:', err);
    list.innerHTML = '<p class="text-center text-red-400 py-4">Failed to load projects</p>';
  }
}

function vm2RenderProjectsList(projects) {
  const list = vm2Get('vm2-projects-list');
  if (!list) return;

  list.innerHTML = projects.map(p => `
    <div class="p-3 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
         onclick="vm2SelectPlaylist('${p._id}')">
      <div class="font-medium text-gray-800 dark:text-white text-sm">${p.name || 'Untitled Playlist'}</div>
      <div class="text-xs text-gray-400 mt-1">${p.privacy || 'internal'} · ${new Date(p.updatedAt || p.createdAt).toLocaleDateString()}</div>
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
  vm2EnsureEditorMounted();
  vm2ShowEditorScreen();
  vm2.loadingProject = true;
  vm2SetLoadingIndicator(true, 'Loading project...');

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-projects/${id}`, {
      headers: vm2AuthHeaders(),
    });
    if (!res.ok) throw new Error(String(res.status));
    const project = await res.json();

    vm2.playlist = vm2.playlists.find((item) => String(item._id) === String(project.playlistId)) || vm2.playlist;

    // If the working copy has no video but a saved revision exists, auto-restore
    // from the latest revision so the user lands in a fully usable state.
    if (!project.videoUrl && project.lastRevisionId) {
      try {
        const revRes = await fetch(`${vm2BaseUrl()}api/video-revisions/${project.lastRevisionId}`, {
          headers: vm2AuthHeaders(),
        });
        if (revRes.ok) {
          const revision = await revRes.json();
          const snapshot = vm2DeepClone(revision.snapshot || {});
          // Merge revision snapshot into the project doc so _id, playlistId, etc. are preserved.
          const restored = { ...snapshot, _id: project._id, playlistId: project.playlistId };
          vm2ApplyProjectState(restored, { readOnlyRevision: null });
          vm2SetSaveStatus(`Restored from ${revision.revisionName || 'latest revision'}`, 'green');
          if (!vm2PrimaryVideoUrl(restored)) {
            vm2.loadingProject = false;
            vm2SetLoadingIndicator(false);
          }
          return;
        }
      } catch (revErr) {
        console.warn('[VM2] Could not auto-restore from revision, falling back to working copy:', revErr);
      }
    }

    vm2ApplyProjectState(project, { readOnlyRevision: null });
    vm2SetSaveStatus('Project loaded', 'green');
    if (!vm2PrimaryVideoUrl(project)) {
      vm2.loadingProject = false;
      vm2SetLoadingIndicator(false);
    }
  } catch (err) {
    vm2.loadingProject = false;
    vm2SetLoadingIndicator(false);
    console.error('[VM2] Load error:', err);
    alert('Failed to load project: ' + err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORT (FFmpeg.wasm)
// ═══════════════════════════════════════════════════════════════════════════

function vm2CreateExportMediaPool(project = vm2.project) {
  const host = document.createElement('div');
  host.className = 'hidden';
  document.body.appendChild(host);

  const audioContext = window.AudioContext ? new AudioContext() : null;
  const destination = audioContext?.createMediaStreamDestination?.() || null;
  const entries = new Map();

  const ensureEntry = (source) => {
    const existing = entries.get(source.key);
    if (existing) return existing;

    const video = document.createElement('video');
    video.className = 'absolute pointer-events-none opacity-0';
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = source.local ? '' : 'anonymous';
    video.muted = true;
    host.appendChild(video);

    const entry = {
      ...source,
      video,
      gainNode: null,
      readyPromise: null,
      status: 'idle',
    };

    if (audioContext && destination && audioContext.createMediaElementSource) {
      try {
        const sourceNode = audioContext.createMediaElementSource(video);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;
        sourceNode.connect(gainNode);
        gainNode.connect(destination);
        entry.gainNode = gainNode;
        video.muted = false;
      } catch (err) {
        console.warn('[VM2 Export] Could not create audio source for clip:', err);
      }
    }

    entries.set(source.key, entry);
    return entry;
  };

  const loadEntry = (entry) => {
    if (!entry) return Promise.reject(new Error('Missing export media entry'));
    if (entry.status === 'ready') return Promise.resolve(entry);
    if (entry.readyPromise) return entry.readyPromise;

    entry.status = 'loading';
    entry.readyPromise = new Promise((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        entry.status = 'ready';
        entry.readyPromise = null;
        resolve(entry);
      };
      const onError = () => {
        cleanup();
        entry.status = 'error';
        entry.readyPromise = null;
        reject(new Error('Failed to load media source'));
      };
      const cleanup = () => {
        entry.video.removeEventListener('loadeddata', onLoaded);
        entry.video.removeEventListener('error', onError);
      };

      entry.video.addEventListener('loadeddata', onLoaded);
      entry.video.addEventListener('error', onError);
      entry.video.pause();
      entry.video.crossOrigin = entry.local ? '' : 'anonymous';
      entry.video.src = entry.local ? entry.url : vm2ResolveMediaUrl(entry.url);
      entry.video.load();
    });

    return entry.readyPromise;
  };

  return {
    entries,
    destination,
    ensureEntry,
    async loadAll() {
      const sources = vm2GetUniqueProjectSources(project);
      const queue = sources.map((source) => loadEntry(ensureEntry(source)));
      await Promise.all(queue);
      if (audioContext?.state === 'suspended') {
        try {
          await audioContext.resume();
        } catch (_) {}
      }
    },
    async cleanup() {
      entries.forEach((entry) => {
        try { entry.video.pause(); } catch (_) {}
        try { entry.video.removeAttribute('src'); } catch (_) {}
        try { entry.video.load(); } catch (_) {}
        try { entry.video.remove(); } catch (_) {}
      });
      entries.clear();
      try { host.remove(); } catch (_) {}
      if (audioContext && audioContext.state !== 'closed') {
        try {
          await audioContext.close();
        } catch (_) {}
      }
    },
  };
}

async function vm2RenderProjectToWebmBlob(project, { width, height, frameRate = 30, onProgress } = {}) {
  if (!project?.steps?.length) throw new Error('Please load a video first');

  const originalStepIdx = vm2.currentStepIdx;
  let exportPool = null;

  try {
    onProgress?.({ percent: 5, status: 'Preparing clip sources...', detail: 'Loading video clips into export pool' });

    exportPool = vm2CreateExportMediaPool(project);
    await exportPool.loadAll();
    await vm2PrepareProjectImagesForRender(project);

    const projectW = Math.max(2, Number(project.width) || 1920);
    const projectH = Math.max(2, Number(project.height) || 1080);
    const outputW = Math.max(2, Number(width) || projectW);
    const outputH = Math.max(2, Number(height) || projectH);
    const scaleX = outputW / projectW;
    const scaleY = outputH / projectH;
    const duration = Math.max(0.01, vm2GetSequenceDuration(project));
    const sources = vm2GetUniqueProjectSources(project);

    onProgress?.({ percent: 10, status: 'Rendering video with overlays...', detail: `Rendering ${outputW}x${outputH}` });

    const canvas = document.createElement('canvas');
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create export canvas context');

    const stream = canvas.captureStream(frameRate);
    if (exportPool.destination) {
      exportPool.destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
    }

    const preferredMimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';
    const mediaRecorder = new MediaRecorder(stream, { mimeType: preferredMimeType });

    const chunks = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    let isRecording = true;
    let isSwitching = false;
    let activeEntry = null;

    const setActiveEntry = async (step, { autoplay = false } = {}) => {
      const key = vm2GetStepSourceKey(step, project);
      const source = sources.find((item) => item.key === key);
      const entry = key ? exportPool.entries.get(key) || (source ? exportPool.ensureEntry(source) : null) : null;
      if (!entry) return null;

      exportPool.entries.forEach((item) => {
        if (item.gainNode) item.gainNode.gain.value = 0;
        if (item !== entry) item.video.pause();
      });

      activeEntry = entry;
      if (entry.gainNode) entry.gainNode.gain.value = step?.muted ? 0 : 1;
      entry.video.currentTime = vm2TpStepStart(step);
      entry.video.playbackRate = 1;
      if (autoplay) await entry.video.play();
      return entry;
    };

    const renderFrame = () => {
      if (!isRecording || isSwitching || !activeEntry) return;

      const video = activeEntry.video;
      const activeStepIdx = vm2.currentStepIdx;
      const activeStep = project.steps[activeStepIdx];
      let effectiveTime = video.currentTime;

      if (activeStep) {
        if (video.currentTime >= (activeStep.sourceEnd ?? activeStep.endTime) - 0.05) {
          if (activeStepIdx + 1 < project.steps.length) {
            vm2.currentStepIdx++;
            const nextStep = project.steps[vm2.currentStepIdx];
            isSwitching = true;
            setActiveEntry(nextStep, { autoplay: true })
              .then(() => {
                isSwitching = false;
                requestAnimationFrame(renderFrame);
              })
              .catch((err) => {
                isRecording = false;
                isSwitching = false;
                try {
                  mediaRecorder.stop();
                } catch (_) {}
                console.error('[VM2 Export] Clip switch error:', err);
              });
            return;
          }

          isRecording = false;
          video.pause();
          try {
            mediaRecorder.stop();
          } catch (_) {}
          return;
        }

        const offset = video.currentTime - (activeStep.sourceStart ?? activeStep.startTime);
        effectiveTime = activeStep.startTime + offset;
        if (activeEntry.gainNode) activeEntry.gainNode.gain.value = activeStep.muted ? 0 : 1;
      }

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const { drawX, drawY, drawW, drawH } = vm2GetVideoDrawRect(
        video.videoWidth || projectW,
        video.videoHeight || projectH,
        outputW,
        outputH
      );
      ctx.drawImage(video, drawX, drawY, drawW, drawH);

      const visibleElements = project.steps
        .reduce((acc, step) => acc.concat(step.elements || []), [])
        .filter((el) => el.type !== 'audio' && vm2IsElementVisibleAtTime(el, effectiveTime))
        .slice()
        .sort((a, b) => (Number(b.layer) || 0) - (Number(a.layer) || 0));

      visibleElements.forEach((el) => {
        vm2DrawElementOnCanvas(ctx, el, scaleX, scaleY, 0, 0);
      });

      const progress = effectiveTime / duration;
      onProgress?.({
        percent: Math.min(95, 10 + (progress * 85)),
        status: 'Rendering video with overlays...',
        detail: `${Math.round(progress * 100)}% rendered`,
      });

      requestAnimationFrame(renderFrame);
    };

    mediaRecorder.start();

    return await new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        exportPool.entries.forEach((entry) => entry.video.pause());
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };

      vm2.currentStepIdx = 0;
      setActiveEntry(project.steps[0], { autoplay: true })
        .then(() => {
          requestAnimationFrame(renderFrame);
        })
        .catch((err) => {
          console.error('[VM2 Export] Initial clip start error:', err);
          try {
            mediaRecorder.stop();
          } catch (_) {}
          reject(err);
        });
    });
  } finally {
    vm2.currentStepIdx = originalStepIdx;
    if (exportPool) await exportPool.cleanup();
  }
}

async function vm2Export() {
  if (!vm2.project?.steps?.length) {
    alert('Please load a video first');
    return;
  }

  vm2ResetExportModal('Export Video');

  try {
    const blob = await vm2RenderProjectToWebmBlob(vm2.project, {
      onProgress: ({ percent, status, detail }) => vm2SetExportProgress(status, detail, percent),
    });
    const url = URL.createObjectURL(blob);
    vm2SetExportProgress('Export complete', 'Your browser-rendered video is ready.', 100);
    vm2ShowExportDone({
      label: 'Export Complete!',
      downloadUrl: url,
      downloadName: (vm2.project.title || 'video-manual') + '.webm',
      buttonLabel: 'Download Video',
    });
  } catch (err) {
    console.error('[VM2] Export error:', err);
    vm2ShowExportError(err.message);
  }
}

// Helper function to draw element on canvas for export.
function vm2DrawElementOnCanvas(ctx, el, sx = 1, sy = 1, ox = 0, oy = 0) {
  // Convert project-space (what the editor uses) into canvas-space.
  const x  = (el.x - ox) * sx;
  const y  = (el.y - oy) * sy;
  const w  = el.width  * sx;
  const h  = el.height * sy;

  ctx.save();
  ctx.globalAlpha = (el.opacity || 100) / 100;

  if (el.rotation) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(el.rotation * Math.PI / 180);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  
  if (el.type === 'text') {
    ctx.fillStyle = el.color || '#ffffff';
    ctx.textAlign = el.textAlign || 'center';
    ctx.textBaseline = 'middle';

    const textX = el.textAlign === 'left' ? x : el.textAlign === 'right' ? x + w : x + w / 2;
    ctx.font = `${el.fontWeight || 'normal'} ${el.fontSize * sy}px ${el.fontFamily || 'system-ui'}`;
    ctx.fillText(el.text, textX, y + h / 2);
  } else if (el.type === 'shape') {
    ctx.strokeStyle = el.strokeColor || '#ffffff';
    ctx.lineWidth = (el.strokeWidth || 3) * Math.min(sx, sy);

    if (el.subtype === 'rect') {
      if (el.fill) {
        ctx.fillStyle = el.strokeColor;
        ctx.fillRect(x, y, w, h);
      } else {
        ctx.strokeRect(x, y, w, h);
      }
    } else if (el.subtype === 'circle') {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      if (el.fill) {
        ctx.fillStyle = el.strokeColor;
        ctx.fill();
      } else {
        ctx.stroke();
      }
    } else if (el.subtype === 'arrow' || el.subtype === 'line') {
      const localPoints = vm2GetShapeLocalEndpoints(el);
      const startX = x + localPoints.startX * sx;
      const startY = y + localPoints.startY * sy;
      const endX = x + localPoints.endX * sx;
      const endY = y + localPoints.endY * sy;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      if (el.subtype === 'arrow') {
        const angle = Math.atan2(endY - startY, endX - startX);
        const headLen = 15 * Math.min(sx, sy);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }
  } else if (el.type === 'image' && el._imgElement) {
    ctx.drawImage(el._imgElement, x, y, w, h);
  }

  ctx.restore();
}

function vm2CloseExportModal() {
  vm2Get('vm2-modal-export').classList.add('hidden');
}

// ═══════════════════════════════════════════════════════════════════════════
//  UNDO / REDO
// ═══════════════════════════════════════════════════════════════════════════

function vm2Undo() {
  if (vm2.revisionPreview || vm2.undoStack.length <= 1) {
    vm2UpdateUndoRedoButtons();
    return;
  }
  const current = vm2.undoStack.pop();
  if (current) vm2.redoStack.push(current);
  const previous = vm2.undoStack[vm2.undoStack.length - 1];
  if (!previous) return;
  vm2RestoreHistoryEntry(previous, 'Undo');
}

function vm2Redo() {
  if (vm2.revisionPreview || vm2.redoStack.length === 0) {
    vm2UpdateUndoRedoButtons();
    return;
  }
  const next = vm2.redoStack.pop();
  if (!next) return;
  vm2.undoStack.push(next);
  vm2RestoreHistoryEntry(next, 'Redo');
}

// ═══════════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════════

// Auto-load if navigating to video manual page
if (typeof window !== 'undefined') {
  window.loadVideoManual2Page = loadVideoManual2Page;
  window.vm2LoadPlaylists = vm2LoadPlaylists;
  window.vm2SelectPlaylist = vm2SelectPlaylist;
  window.vm2CreatePlaylist = vm2CreatePlaylist;
  window.vm2SetPlaylistSearch = vm2SetPlaylistSearch;
  window.vm2OpenCreatePlaylistModal = vm2OpenCreatePlaylistModal;
  window.vm2CloseCreatePlaylistModal = vm2CloseCreatePlaylistModal;
  window.vm2SubmitCreatePlaylist = vm2SubmitCreatePlaylist;
  window.vm2OnCreatePlaylistModelChange = vm2OnCreatePlaylistModelChange;
  window.vm2OnCreatePlaylistTitleInput = vm2OnCreatePlaylistTitleInput;
  window.vm2OnEditPlaylistModelChange = vm2OnEditPlaylistModelChange;
  window.vm2OnEditPlaylistTitleInput = vm2OnEditPlaylistTitleInput;
  window.vm2OpenEditPlaylistModal = vm2OpenEditPlaylistModal;
  window.vm2CloseEditPlaylistModal = vm2CloseEditPlaylistModal;
  window.vm2SubmitEditPlaylist = vm2SubmitEditPlaylist;
  window.vm2SyncEditPlaylistSubmitState = vm2SyncEditPlaylistSubmitState;
  window.vm2DeletePlaylist = vm2DeletePlaylist;
  window.vm2CreateProject = vm2CreateProject;
  window.vm2OpenCreateProjectModal = vm2OpenCreateProjectModal;
  window.vm2CloseCreateProjectModal = vm2CloseCreateProjectModal;
  window.vm2SubmitCreateProject = vm2SubmitCreateProject;
  window.vm2SyncCreateProjectSubmitState = vm2SyncCreateProjectSubmitState;
  window.vm2OpenEditProjectModal = vm2OpenEditProjectModal;
  window.vm2CloseEditProjectModal = vm2CloseEditProjectModal;
  window.vm2SubmitEditProject = vm2SubmitEditProject;
  window.vm2SyncEditProjectSubmitState = vm2SyncEditProjectSubmitState;
  window.vm2OpenProjectInfoModal = vm2OpenProjectInfoModal;
  window.vm2CloseProjectInfoModal = vm2CloseProjectInfoModal;
  window.vm2Undo = vm2Undo;
  window.vm2Redo = vm2Redo;
  window.vm2ReturnToBrowser = vm2ReturnToBrowser;
  window.vm2ShowAssetPicker = vm2ShowAssetPicker;
  window.vm2CloseAssetPicker = vm2CloseAssetPicker;
  window.vm2SelectPlaylistAsset = vm2SelectPlaylistAsset;
  window.vm2DeleteUnusedAsset = vm2DeleteUnusedAsset;
  window.vm2OpenAddClipChooser = vm2OpenAddClipChooser;
  window.vm2CloseAddClipChooser = vm2CloseAddClipChooser;
  window.vm2ChooseAddClipUpload = vm2ChooseAddClipUpload;
  window.vm2ChooseAddClipLibrary = vm2ChooseAddClipLibrary;
  window.vm2DeleteProject = vm2DeleteProject;
  window.vm2ToggleTrashView = vm2ToggleTrashView;
  window.vm2RestoreProject = vm2RestoreProject;
  window.vm2PermanentDeleteProject = vm2PermanentDeleteProject;
  window.vm2PreviewTrashProject = vm2PreviewTrashProject;
  window.vm2CloseTrashPreview = vm2CloseTrashPreview;
  window.vm2TrashPreviewTogglePlay = vm2TrashPreviewTogglePlay;
  window.vm2TrashPreviewPrevStep = vm2TrashPreviewPrevStep;
  window.vm2TrashPreviewNextStep = vm2TrashPreviewNextStep;
  window.vm2TrashPreviewOnLoaded = vm2TrashPreviewOnLoaded;
  window.vm2TrashPreviewOnTimeUpdate = vm2TrashPreviewOnTimeUpdate;
  window.addEventListener('beforeunload', (event) => {
    if (!vm2) return;
    const shouldWarn = vm2.uploadInProgress || (!!vm2.dirty && !vm2.revisionPreview);
    if (!shouldWarn) return;
    event.preventDefault();
    event.returnValue = '';
  });
}
