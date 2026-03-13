// ═══════════════════════════════════════════════════════════════════════════
//  VIDEO MANUAL CREATOR v2  –  FFmpeg.wasm powered (free, client-side export)
// ═══════════════════════════════════════════════════════════════════════════

// Database config
const VM2_DB         = 'Sasaki_Coating_MasterDB';
const VM2_COLLECTION = 'videoManuals';
const VM2_AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;

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
  revisionPreview: null,
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
const vm2Video = () => vm2Get('vm2-video');
const vm2PreviewCanvas = () => vm2Get('vm2-preview-canvas');
const vm2CanvasViewport = () => vm2Get('vm2-canvas-viewport');
const vm2DegToRad = (deg) => deg * Math.PI / 180;
const vm2RadToDeg = (rad) => rad * 180 / Math.PI;
const vm2BaseUrl = () => (typeof BASE_URL !== 'undefined' ? BASE_URL : 'http://localhost:3000/');
const vm2NowIso = () => new Date().toISOString();
const vm2DeepClone = (value) => JSON.parse(JSON.stringify(value));
const vm2IsBlobUrl = (value) => typeof value === 'string' && value.startsWith('blob:');
const vm2AuthUser = () => JSON.parse(localStorage.getItem('authUser') || '{}');

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
    createdBy: authUser.username || 'admin',
    createdAt: vm2NowIso(),
    ...overrides,
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
  vm2.dirty = true;
  vm2SetSaveStatus(`${reason} · autosave pending`);
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

function vm2RenderPlaylistBrowser() {
  const playlistList = vm2Get('vm2-playlist-list');
  const playlistMeta = vm2Get('vm2-playlist-meta');
  const projectList = vm2Get('vm2-browser-project-list');
  const projectTitle = vm2Get('vm2-browser-project-title');
  const emptyState = vm2Get('vm2-browser-project-empty');
  const createProjectBtn = vm2Get('vm2-create-project-btn');
  const createPlaylistBtn = vm2Get('vm2-create-playlist-btn');
  if (!playlistList || !projectList) return;

  const role = vm2AuthUser().role || 'viewer';
  const canManagePlaylists = ['admin', '課長', '部長', '係長'].includes(role);
  if (createPlaylistBtn) createPlaylistBtn.classList.toggle('hidden', !canManagePlaylists);
  if (createProjectBtn) createProjectBtn.disabled = !vm2.playlist;

  playlistList.innerHTML = vm2.playlists.length
    ? vm2.playlists.map((playlist) => {
        const selected = vm2.playlist && String(vm2.playlist._id) === String(playlist._id);
        return `
          <button
            onclick="vm2SelectPlaylist('${playlist._id}')"
            class="w-full text-left rounded-2xl border px-4 py-3 transition ${selected
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'}">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-gray-900 dark:text-white truncate">${playlist.name || 'Untitled Playlist'}</div>
                <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">${playlist.description || 'No description yet'}</div>
              </div>
              <span class="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${playlist.privacy === 'public'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : playlist.privacy === 'private'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}">${playlist.privacy || 'internal'}</span>
            </div>
          </button>
        `;
      }).join('')
    : '<div class="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No playlists yet.</div>';

  if (projectTitle) {
    projectTitle.textContent = vm2.playlist ? vm2.playlist.name || 'Projects' : 'Select a playlist';
  }

  if (playlistMeta) {
    playlistMeta.textContent = vm2.playlist
      ? `${vm2.playlistProjects.length} project${vm2.playlistProjects.length === 1 ? '' : 's'} · ${vm2.playlist.privacy || 'internal'}`
      : 'Choose a playlist to browse projects';
  }

  if (!vm2.playlist || !vm2.playlistProjects.length) {
    projectList.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  projectList.innerHTML = vm2.playlistProjects.map((project) => `
    <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="text-sm font-semibold text-gray-900 dark:text-white truncate">${project.title || 'Untitled Project'}</div>
          <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">${project.stepsCount || 0} steps · Rev ${project.currentRevisionNumber || 0}</div>
          <div class="mt-1 text-xs text-gray-400">Updated ${new Date(project.updatedAt || project.createdAt).toLocaleDateString()}</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="vm2LoadProject('${project._id}')" class="rounded-xl bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600">Open</button>
          <button onclick="vm2DeleteProject('${project._id}', '${(project.title || 'Untitled').replace(/'/g, '\\&apos;')}')" class="rounded-xl border border-red-200 px-2 py-1.5 text-xs text-red-500 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20" title="Move to recycle bin">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

async function vm2DeleteProject(id, title) {
  if (!confirm(`Move "${title}" to the recycle bin?\n\nIt will be permanently deleted after 30 days.`)) return;
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
  const trashBtn = vm2Get('vm2-trash-btn');
  if (!trashPanel) return;

  const isShowingTrash = !trashPanel.classList.contains('hidden');
  if (isShowingTrash) {
    // Return to normal project view.
    trashPanel.classList.add('hidden');
    if (projectSection) projectSection.classList.remove('hidden');
    if (emptyState && !vm2.playlist) emptyState.classList.remove('hidden');
    if (trashBtn) {
      trashBtn.classList.remove('bg-red-50', 'text-red-600', 'border-red-300');
      trashBtn.innerHTML = '<i class="ri-delete-bin-line mr-1"></i>Recycle Bin';
    }
  } else {
    // Show trash panel.
    if (projectSection) projectSection.classList.add('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    trashPanel.classList.remove('hidden');
    if (trashBtn) {
      trashBtn.classList.add('bg-red-50', 'text-red-600', 'border-red-300');
      trashBtn.innerHTML = '<i class="ri-arrow-left-line mr-1"></i>Back to Projects';
    }
    await vm2LoadTrash();
  }
}

async function vm2LoadTrash() {
  const list = vm2Get('vm2-trash-list');
  if (!list) return;

  if (!vm2.playlist?._id) {
    list.innerHTML = '<p class="col-span-3 text-sm text-gray-400 text-center py-8">Select a playlist first to view its recycle bin.</p>';
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
        ? `<button onclick="vm2PermanentDeleteProject('${p._id}', '${(p.title || 'Untitled').replace(/'/g, '\\&apos;')}')" class="rounded-xl border border-red-300 px-2 py-1.5 text-xs text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30" title="Delete forever"><i class="ri-delete-bin-2-fill"></i></button>`
        : '';
      return `
        <div class="rounded-2xl border border-red-100 bg-red-50/60 p-4 dark:border-red-900/40 dark:bg-red-900/10">
          <div class="text-sm font-semibold text-gray-800 dark:text-white truncate">${p.title || 'Untitled'}</div>
          <div class="mt-1 text-xs text-gray-500">${p.stepsCount || 0} steps · Rev ${p.currentRevisionNumber || 0}</div>
          <div class="mt-1 text-xs text-gray-400">Deleted ${deletedDate} by ${p.deletedBy || '?'}</div>
          <div class="mt-1 text-xs ${urgentClass}">${daysRemaining} day${daysRemaining === 1 ? '' : 's'} until permanent deletion</div>
          <div class="mt-3 flex gap-2">
            <button onclick="vm2PreviewTrashProject('${p._id}')" class="rounded-xl border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" title="Preview">
              <i class="ri-eye-line"></i>
            </button>
            <button onclick="vm2RestoreProject('${p._id}')" class="flex-1 rounded-xl bg-green-500 px-2 py-1.5 text-xs font-medium text-white hover:bg-green-600">
              <i class="ri-arrow-go-back-line mr-1"></i>Restore
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
  if (playlistList) playlistList.innerHTML = '<div class="text-sm text-gray-400 py-6 text-center">Loading playlists...</div>';
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

async function vm2SelectPlaylist(id) {
  vm2.playlist = vm2.playlists.find((item) => String(item._id) === String(id)) || null;
  vm2.playlistProjects = [];
  vm2RenderPlaylistBrowser();
  if (!vm2.playlist) return;

  const projectList = vm2Get('vm2-browser-project-list');
  if (projectList) {
    projectList.innerHTML = '<div class="text-sm text-gray-400 py-6 text-center">Loading projects...</div>';
  }

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-playlists/${id}/projects`, {
      headers: vm2AuthHeaders(),
    });
    if (!res.ok) throw new Error(String(res.status));
    vm2.playlistProjects = await res.json();
    vm2RenderPlaylistBrowser();
  } catch (err) {
    console.error('[VM2] Load playlist projects error:', err);
    if (projectList) {
      projectList.innerHTML = '<div class="text-sm text-red-400 py-6 text-center">Failed to load projects</div>';
    }
  }
}

async function vm2CreatePlaylist() {
  const name = prompt('Playlist name:');
  if (!name) return;
  const description = prompt('Description:', '') || '';
  const privacy = prompt('Privacy (public/internal/private):', 'internal') || 'internal';

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-playlists`, {
      method: 'POST',
      headers: vm2AuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name, description, privacy }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    await vm2LoadPlaylists();
    if (data.insertedId) await vm2SelectPlaylist(String(data.insertedId));
  } catch (err) {
    console.error('[VM2] Create playlist error:', err);
    alert('Failed to create playlist: ' + err.message);
  }
}

async function vm2CreateProject() {
  if (!vm2.playlist?._id) {
    alert('Select a playlist first.');
    return;
  }

  const title = prompt('Project title:');
  if (!title) return;

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-playlists/${vm2.playlist._id}/projects`, {
      method: 'POST',
      headers: vm2AuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    await vm2SelectPlaylist(String(vm2.playlist._id));
    if (data.insertedId) await vm2LoadProject(String(data.insertedId));
  } catch (err) {
    console.error('[VM2] Create project error:', err);
    alert('Failed to create project: ' + err.message);
  }
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

function vm2SetVideoSource(url, { local = false, sourceKey = '' } = {}) {
  const video = vm2Video();
  if (!video) return;
  const resolvedUrl = local ? url : vm2ResolveMediaUrl(url);
  video.pause();
  video.crossOrigin = local ? '' : 'anonymous';
  video.dataset.sourceKey = sourceKey || (url ? `url:${url}` : '');
  video.src = resolvedUrl || '';
  video.load();
}

function vm2EnsureStepVideoSource(step, timelineTime, { autoplay = false } = {}) {
  const video = vm2Video();
  if (!video || !step) return true;

  const desiredUrl = vm2GetStepVideoUrl(step);
  if (!desiredUrl) return true;

  const desiredKey = vm2GetStepSourceKey(step);
  if ((video.dataset.sourceKey || '') === desiredKey) return true;

  vm2.pendingMediaSwitch = { timelineTime, autoplay };
  vm2SetVideoSource(desiredUrl, {
    local: vm2IsBlobUrl(desiredUrl),
    sourceKey: desiredKey,
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
    label.textContent = `Previewing ${revision.revisionName || 'revision'} · ${new Date(revision.createdAt).toLocaleString()}`;
  }
}

function vm2ApplyProjectState(project, { readOnlyRevision = null } = {}) {
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
    vm2SetVideoSource(sourceUrl, {
      local: vm2IsBlobUrl(sourceUrl),
      sourceKey: vm2GetStepSourceKey(vm2.project.steps?.[0], vm2.project),
    });
  } else {
    if (uploadZone) uploadZone.classList.remove('hidden');
    if (playerArea) playerArea.classList.add('hidden');
  }

  vm2RenderSteps();
  vm2RenderTimeline();
  vm2RenderElements();
  vm2RenderElementsList();
  vm2RenderProps();
  vm2SetSaveStatus(readOnlyRevision ? 'Revision preview' : 'Loaded', readOnlyRevision ? 'blue' : 'green');
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
        <i class="ri-arrow-left-line"></i>Projects
      </button>
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
      <input id="vm2-title" type="text" value="Untitled1"
        class="text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none dark:text-white px-2 w-48 text-center"
        onchange="vm2HandleTitleChange(this.value)">
      <span id="vm2-save-status" class="text-xs text-gray-400">Not saved</span>
      <div class="flex-1"></div>
      <select id="vm2-zoom-select" onchange="vm2SetCanvasZoom(this.value)" class="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300">
        <option value="0.5">50%</option>
        <option value="0.75">75%</option>
        <option value="1">100%</option>
        <option value="1.5">150%</option>
        <option value="fit" selected>Fit</option>
      </select>
      <button onclick="vm2ReturnToBrowser()" class="px-3 py-1.5 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 flex items-center gap-1">
        <i class="ri-folder-open-line"></i>Browse
      </button>
      <button onclick="vm2SaveProject()" class="px-3 py-1.5 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 flex items-center gap-1">
        <i class="ri-save-line"></i>Save Revision
      </button>
      <button onclick="vm2ShowHistory()" class="px-3 py-1.5 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 flex items-center gap-1">
        <i class="ri-history-line"></i>History
      </button>
      <button onclick="vm2Export()" class="px-3 py-1.5 rounded text-xs bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1 font-medium">
        <i class="ri-download-line"></i>Export
      </button>
    </div>

    <div id="vm2-readonly-banner" class="hidden px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-700 text-sm flex items-center gap-3 flex-shrink-0">
      <i class="ri-eye-line"></i>
      <span id="vm2-readonly-label" class="flex-1">Previewing saved revision</span>
      <button onclick="vm2ExitRevisionPreview()" class="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-xs font-medium">Back To Current</button>
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
        <div id="vm2-upload-zone" class="flex-1 flex items-center justify-center gap-6 p-8 flex-wrap">
          <!-- Option A: upload a new video -->
          <div class="text-center p-10 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors"
               onclick="vm2Get('vm2-file-input').click()"
               ondragover="event.preventDefault(); this.classList.add('border-blue-400')"
               ondragleave="this.classList.remove('border-blue-400')"
               ondrop="vm2HandleDrop(event)">
            <i class="ri-video-upload-line text-5xl text-gray-400 mb-3 block"></i>
            <p class="text-gray-600 dark:text-gray-300 font-medium">Upload a Video</p>
            <p class="text-gray-400 text-sm mt-1">Click or drag & drop · MP4, MOV, WebM</p>
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
            <p class="text-gray-600 dark:text-gray-300 font-medium">Pick from Library</p>
            <p class="text-gray-400 text-sm mt-1">Reuse a shared video from this playlist</p>
          </div>
          <input id="vm2-file-input" type="file" accept="video/*" class="hidden" onchange="vm2HandleFileSelect(event)">
        </div>

        <!-- Player Area (hidden until video loaded) -->
        <div id="vm2-player-area" class="hidden flex-1 flex flex-col min-h-0">
          
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
                <video id="vm2-video" class="absolute pointer-events-none opacity-0"
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
              <div id="vm2-tracks" class="relative" style="min-height: 150px; display: flex; flex-direction: column;">
                <!-- Element Tracks (at top) -->
                <div id="vm2-element-tracks" class="relative flex-1" style="z-index: 5; min-height: 80px;"></div>
                <!-- Video/Steps Track (at bottom) -->
                <div id="vm2-video-track" class="relative h-8 flex-shrink-0 mt-4 mb-2" style="z-index: 1;">
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
          <button id="vm2-tab-elements" onclick="vm2SwitchTab('elements')" class="flex-1 py-2 text-xs font-medium text-blue-500 border-b-2 border-blue-500">Elements</button>
          <button id="vm2-tab-properties" onclick="vm2SwitchTab('properties')" class="flex-1 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Properties</button>
        </div>

        <!-- Elements Panel -->
        <div id="vm2-panel-elements" class="flex-1 overflow-y-auto p-3">
          
          <!-- Text -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Text</p>
            <div class="grid grid-cols-2 gap-2">
              <button draggable="true"
                ondragstart="vm2ElementPanelDragStart(event,'text','title')"
                onclick="vm2AddElement('text','title')"
                class="py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs font-medium text-gray-700 dark:text-gray-200 cursor-grab active:cursor-grabbing select-none"
                title="Drag onto canvas or click to add">Title</button>
              <button draggable="true"
                ondragstart="vm2ElementPanelDragStart(event,'text','body')"
                onclick="vm2AddElement('text','body')"
                class="py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300 cursor-grab active:cursor-grabbing select-none"
                title="Drag onto canvas or click to add">Body Text</button>
            </div>
          </div>

          <!-- Shapes -->
          <div class="mb-4">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Shapes</p>
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
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-3 flex-shrink-0">Pick an existing video to use in this project. The video will be shared — it won't be re-uploaded.</p>
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
          <i class="ri-history-line text-blue-500"></i>Revision History
        </h3>
        <button onclick="vm2Get('vm2-modal-history').classList.add('hidden')" class="text-gray-400 hover:text-gray-600">
          <i class="ri-close-line text-xl"></i>
        </button>
      </div>
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
    #vm2-timeline-scroll::-webkit-scrollbar { height: 8px; }
    #vm2-timeline-scroll::-webkit-scrollbar-track { background: #1f2937; }
    #vm2-timeline-scroll::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
  </style>
  `;

  vm2SetSaveStatus(vm2.project?._id ? 'Loaded' : 'Not saved');
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
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">Video Manual Library</p>
              <h2 class="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Playlists and projects</h2>
              <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Choose a playlist first, then open one of its projects. Editing starts only after a real project exists.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button onclick="vm2LoadPlaylists()" class="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                <i class="ri-refresh-line mr-1"></i>Refresh
              </button>
              <button onclick="vm2ToggleTrashView()" id="vm2-trash-btn" class="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <i class="ri-delete-bin-line mr-1"></i>Recycle Bin
              </button>
              <button id="vm2-create-playlist-btn" onclick="vm2CreatePlaylist()" class="hidden rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-sky-500 dark:hover:bg-sky-400">
                <i class="ri-stack-line mr-1"></i>New Playlist
              </button>
              <button id="vm2-create-project-btn" onclick="vm2CreateProject()" class="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-gray-700">
                <i class="ri-add-circle-line mr-1"></i>New Project
              </button>
            </div>
          </div>
        </div>

        <div class="grid min-h-[620px] gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section class="rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
            <div class="mb-4 flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Playlists</p>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Model groups and access boundaries</p>
              </div>
            </div>
            <div id="vm2-playlist-list" class="space-y-3"></div>
          </section>

          <section class="rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
            <div class="mb-5 flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-gray-800 md:flex-row md:items-end md:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Projects</p>
                <h3 id="vm2-browser-project-title" class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Select a playlist</h3>
                <p id="vm2-playlist-meta" class="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a playlist to browse projects</p>
              </div>
            </div>
            <div id="vm2-browser-project-empty" class="rounded-[24px] border border-dashed border-slate-300 px-6 py-14 text-center dark:border-gray-700">
              <i class="ri-folder-open-line text-4xl text-slate-300 dark:text-gray-600"></i>
              <p class="mt-4 text-base font-medium text-slate-700 dark:text-slate-200">No playlist selected</p>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Pick a playlist on the left to see its projects.</p>
            </div>
            <div id="vm2-browser-project-list" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"></div>

            <!-- Trash panel (hidden by default) -->
            <div id="vm2-trash-panel" class="hidden">
              <div class="mb-4 flex items-center gap-3">
                <i class="ri-delete-bin-2-line text-xl text-red-400"></i>
                <div>
                  <p class="text-sm font-semibold text-slate-800 dark:text-white">Recycle Bin</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">Deleted projects are kept for 30 days then permanently removed.</p>
                </div>
              </div>
              <div id="vm2-trash-list" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"></div>
            </div>
          </section>
        </div>
      </div>
    </div>
    <div id="vm2-editor-host" class="hidden"></div>
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
};

function vm2TpGet(id) { return document.getElementById(id); }
const vm2TpVideo   = () => vm2TpGet('vm2-tp-video');
const vm2TpCanvas  = () => vm2TpGet('vm2-tp-canvas');
const vm2TpWrapper = () => vm2TpGet('vm2-tp-canvas-wrapper');

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

  vm2TP.stepIdx = nextIdx;
  vm2TpUpdateStepLabel();
  vm2TpRenderElements();
  video.currentTime = vm2TpStepStart(steps[nextIdx]);
  const playPromise = video.play();
  if (playPromise?.catch) playPromise.catch(() => vm2TpSetPlayButton(true));
}

function vm2EnsureTrashPreviewModal() {
  if (document.getElementById('vm2-modal-trash-preview')) return;
  const el = document.createElement('div');
  el.innerHTML = `<div id="vm2-modal-trash-preview" class="hidden fixed inset-0 z-[400] flex flex-col bg-black">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
      <div class="flex items-center gap-3">
        <span class="text-xs font-semibold uppercase tracking-widest text-red-400"><i class="ri-delete-bin-2-line mr-1"></i>Recycle Bin Preview</span>
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
          <video id="vm2-tp-video" class="absolute pointer-events-none opacity-0"
            ontimeupdate="vm2TrashPreviewOnTimeUpdate()"
            onloadedmetadata="vm2TrashPreviewOnLoaded()"></video>
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

    // Populate header.
    const titleEl = vm2TpGet('vm2-tp-title');
    if (titleEl) titleEl.textContent = data.title || 'Untitled';

    vm2TpGet('vm2-modal-trash-preview')?.classList.remove('hidden');
    vm2TpUpdateStepLabel();
    vm2TpRenderElements();
    vm2TpSyncCanvasSize();

    const video = vm2TpVideo();
    if (video) {
      video.pause();
      const url = data.videoUrl ? vm2ResolveMediaUrl(data.videoUrl) : '';
      video.crossOrigin = 'anonymous';
      video.src = url || '';
      if (url) video.load();
    }

    vm2TpStartLoop();
  } catch (err) {
    console.error('[VM2 TrashPreview] Error:', err);
    alert('Could not load preview: ' + err.message);
  }
}

function vm2CloseTrashPreview() {
  vm2TpStopLoop();
  const video = vm2TpVideo();
  if (video) { video.pause(); video.src = ''; }
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
  if (step && video) video.currentTime = vm2TpStepStart(step);
  vm2TpUpdateStepLabel();
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
  const video = vm2TpVideo();
  if (!video) return;
  if (video.paused) {
    const step = vm2TP.project?.steps?.[vm2TP.stepIdx];
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
  if (step && video) {
    video.pause();
    video.currentTime = vm2TpStepStart(step);
    vm2TpSetPlayButton(true);
  }
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
    const assets = await res.json();

    if (!assets.length) {
      list.innerHTML = '<p class="col-span-2 text-sm text-gray-400 text-center py-8">No shared videos in this playlist yet. Upload a video to add it to the library.</p>';
      return;
    }

    list.innerHTML = assets.map((a) => {
      const safeId = encodeURIComponent(a._id || a.assetId);
      const safeUrl = encodeURIComponent(a.downloadUrl || a.url || '');
      const safeName = (a.name || a.fileName || 'Untitled').replace(/'/g, '&#39;');
      const uploadedAt = a.uploadedAt ? new Date(a.uploadedAt).toLocaleDateString() : '';
      return `
        <button
          class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-left w-full"
          onclick="vm2SelectPlaylistAsset('${safeId}', decodeURIComponent('${safeUrl}'), '${safeName}')">
          <div class="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <i class="ri-film-line text-gray-500"></i>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-800 dark:text-white truncate">${safeName}</p>
            <p class="text-xs text-gray-400 mt-0.5">${uploadedAt}</p>
          </div>
        </button>`;
    }).join('');
  } catch (err) {
    console.error('[VM2] Asset picker error:', err);
    list.innerHTML = `<p class="col-span-2 text-sm text-red-400 text-center py-8">Failed to load assets: ${err.message}</p>`;
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

async function vm2UploadVideoAsset(file) {
  const isAppend = vm2.mediaInsertMode === 'append';
  const modal = vm2Get('vm2-modal-upload');
  const bar = vm2Get('vm2-upload-bar');
  const msg = vm2Get('vm2-upload-msg');
  const detail = vm2Get('vm2-upload-detail');

  modal.classList.remove('hidden');
  msg.textContent = 'Uploading video…';
  detail.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
  bar.style.width = '5%';
  vm2.uploadInProgress = true;
  vm2SetSaveStatus('Uploading video…', 'blue');

  try {
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      vm2.uploadXhr = xhr;
      xhr.open('POST', `${vm2BaseUrl()}api/upload-video-manual`);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.setRequestHeader('X-File-Name', file.name);
      if (vm2.playlist?._id) xhr.setRequestHeader('X-Playlist-Id', vm2.playlist._id);
      Object.entries(vm2AuthHeaders()).forEach(([header, value]) => {
        xhr.setRequestHeader(header, value);
      });

      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) return;
        const pct = Math.round((event.loaded / event.total) * 90) + 5;
        bar.style.width = Math.min(pct, 95) + '%';
        detail.textContent = `${(event.loaded / 1024 / 1024).toFixed(1)} / ${(event.total / 1024 / 1024).toFixed(1)} MB`;
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

  vm2RenderSteps();
  vm2RenderTimeline();
  vm2RenderElements();
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
        vm2SeekTo(vm2.project.steps[activeStepIdx].startTime, { autoplay: true });
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

function vm2SeekTo(timelineTime, { autoplay = false } = {}) {
  const video = vm2Video();
  if (!video || !vm2.project) return;

  // Clamp timelineTime within total duration
  timelineTime = Math.max(0, Math.min(timelineTime, vm2.duration));

  // Find the step that contains this timeline position. Boundaries belong to
  // the next step so playback can advance continuously across adjacent clips.
  const stepIdx = vm2FindStepIndexAtTime(timelineTime, vm2.project);

  let step = null;
  if (stepIdx >= 0) {
    step = vm2.project.steps[stepIdx];
    vm2.currentStepIdx = stepIdx; // Update tracking!
  } else if (vm2.project.steps.length > 0) {
    // If exact match not found (e.g. at boundaries), snap to closest
    step = timelineTime <= vm2.project.steps[0].startTime 
           ? vm2.project.steps[0] 
           : vm2.project.steps[vm2.project.steps.length - 1];
    vm2.currentStepIdx = timelineTime <= vm2.project.steps[0].startTime ? 0 : vm2.project.steps.length - 1;
  }

  if (step) {
    if (!vm2EnsureStepVideoSource(step, timelineTime, { autoplay })) {
      vm2.currentTime = timelineTime;
      vm2RenderSteps();
      vm2RenderElements();
      vm2UpdateVisibleElements();
      return;
    }

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
}

// ═══════════════════════════════════════════════════════════════════════════
//  TIMELINE
// ═══════════════════════════════════════════════════════════════════════════

function vm2RenderTimeline() {
  if (!vm2.project) return;

  const sequenceDuration = vm2SyncSequenceDuration(vm2.project);
  if (sequenceDuration <= 0) return;

  const timelineWidth = Math.max(sequenceDuration * vm2.timelineZoom, 800);
  const timelineContentWidth = timelineWidth + 150;

  // Time ruler
  const ruler = vm2Get('vm2-time-ruler');
  if (ruler) {
    ruler.style.width = timelineContentWidth + 'px';
    let rulerHtml = '';
    const step = vm2.timelineZoom >= 80 ? 1 : vm2.timelineZoom >= 40 ? 2 : 5;
    for (let t = 0; t <= sequenceDuration; t += step) {
      const x = t * vm2.timelineZoom;
      rulerHtml += `
        <div class="absolute text-[10px] text-gray-500" style="left: ${x}px; top: 4px;">${vm2Fmt(t)}</div>
        <div class="absolute w-px h-2 bg-gray-300 dark:bg-gray-600" style="left: ${x}px; bottom: 0;"></div>
      `;
    }
    ruler.innerHTML = rulerHtml;
  }

  // Step segments (video track) - draggable to reorder
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
              style="left: ${timelineWidth + 12}px; width: 120px;"
              onclick="vm2OpenAddClipChooser()">
        <i class="ri-add-line mr-1"></i>Add Clip
      </button>
    `;
  }

  // Element tracks
  const tracks = vm2Get('vm2-element-tracks');
  if (tracks) {
    tracks.style.width = timelineContentWidth + 'px';
    
    // Gather all elements from all steps
    const allElements = [];
    vm2.project.steps.forEach((step, stepIdx) => {
      step.elements.forEach(el => {
        allElements.push({ ...el, stepIdx });
      });
    });

    // Assure elements have a layer
    allElements.forEach(el => {
      if (el.layer === undefined) el.layer = 0;
    });

    const maxLayer = Math.max(0, ...allElements.map(el => el.layer));
    const rowHeight = 28;
    const rowGap = 4;
    
    tracks.style.height = ((maxLayer + 1) * (rowHeight + rowGap) + 10) + 'px';

    const typeColors = {
      text: '#f59e0b',
      shape: '#10b981',
      image: '#6366f1',
      audio: '#ec4899',
    };

    tracks.innerHTML = allElements.map(el => {
      const left = el.startTime * vm2.timelineZoom;
      const width = Math.max((el.endTime - el.startTime) * vm2.timelineZoom, 20);
      const top = el.layer * (rowHeight + rowGap);
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
  if (!vm2EnsureEditable()) return;
  if (event.target.classList.contains('resize-left') || event.target.classList.contains('resize-right')) return;
  
  event.preventDefault();
  event.stopPropagation();
  vm2.selectedElementId = id;
  vm2.isDraggingTimelineBar = true;
  document.body.classList.add('vm2-no-select');
  
  const el = vm2FindElement(id);
  if (el) {
    vm2.timelineDragData = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      originalStart: el.startTime,
      originalEnd: el.endTime,
      originalLayer: el.layer || 0,
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

    if (vm2.timelineDragData.side === 'left') {
      el.startTime = Math.max(0, Math.min(vm2.timelineDragData.originalStart + dt, el.endTime - 0.1));
    } else if (vm2.timelineDragData.side === 'right') {
      el.endTime = Math.min(vm2.duration, Math.max(vm2.timelineDragData.originalEnd + dt, el.startTime + 0.1));
    } else {
      const duration = vm2.timelineDragData.originalEnd - vm2.timelineDragData.originalStart;
      let newStart = vm2.timelineDragData.originalStart + dt;
      newStart = Math.max(0, Math.min(newStart, vm2.duration - duration));
      el.startTime = newStart;
      el.endTime = newStart + duration;

      // Vertical track dragging logic
      const rowHeight = 28;
      const rowGap = 4;
      const totalH = rowHeight + rowGap;
      const layerShift = Math.round(dy / totalH);
      const newLayer = Math.max(0, vm2.timelineDragData.originalLayer + layerShift);
      
      if (newLayer !== el.layer) {
        // Swap layer with any element at that layer to simulate reordering
        const allElements = vm2.project.steps.reduce((acc, s) => acc.concat(s.elements || []), []);
        const clash = allElements.find(e => e.id !== el.id && e.layer === newLayer);
        if (clash) {
          clash.layer = el.layer;
        }
        el.layer = newLayer;
        vm2.timelineDragData.originalLayer = newLayer;
        vm2.timelineDragData.startY = event.clientY; // reset base
        
        vm2RenderElements(); // because z-index changed
        vm2RenderElementsList();
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
  if (!list) return;

  vm2Get('vm2-modal-history').classList.remove('hidden');

  if (!vm2.project?._id) {
    list.innerHTML = '<p class="text-sm text-gray-400 text-center py-6">Save a working project first.</p>';
    return;
  }

  list.innerHTML = '<p class="text-sm text-gray-400 text-center py-6">Loading revisions…</p>';

  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-projects/${vm2.project._id}/revisions`, {
      headers: vm2AuthHeaders(),
    });
    if (!res.ok) throw new Error(String(res.status));
    const revisions = await res.json();

    if (!revisions.length) {
      list.innerHTML = '<p class="text-sm text-gray-400 text-center py-6">No revisions yet.<br>Use Save Revision to create one.</p>';
      return;
    }

    list.innerHTML = revisions.map((revision) => `
      <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 dark:text-white truncate">${revision.revisionName || 'Unnamed revision'}</p>
          <p class="text-xs text-gray-400">Revision ${revision.revisionNumber || '?'} · ${revision.folder || 'root'} · ${new Date(revision.createdAt).toLocaleString()}</p>
        </div>
        <button onclick="vm2PreviewRevision('${revision._id}')" class="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded hover:bg-blue-100">Preview</button>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<p class="text-sm text-red-400 text-center py-6">Failed to load revisions: ${err.message}</p>`;
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
  try {
    const res = await fetch(`${vm2BaseUrl()}api/video-projects/${id}`, {
      headers: vm2AuthHeaders(),
    });
    if (!res.ok) throw new Error(String(res.status));
    const project = await res.json();

    vm2EnsureEditorMounted();
    vm2.playlist = vm2.playlists.find((item) => String(item._id) === String(project.playlistId)) || vm2.playlist;
    vm2ShowEditorScreen();

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
          return;
        }
      } catch (revErr) {
        console.warn('[VM2] Could not auto-restore from revision, falling back to working copy:', revErr);
      }
    }

    vm2ApplyProjectState(project, { readOnlyRevision: null });
    vm2SetSaveStatus('Project loaded', 'green');
  } catch (err) {
    console.error('[VM2] Load error:', err);
    alert('Failed to load project: ' + err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORT (FFmpeg.wasm)
// ═══════════════════════════════════════════════════════════════════════════

async function vm2Export() {
  const video = vm2Video();
  if (!vm2.project || !video || !video.currentSrc) {
    alert('Please load a video first');
    return;
  }

  vm2Get('vm2-modal-export').classList.remove('hidden');
  vm2Get('vm2-export-progress').classList.remove('hidden');
  vm2Get('vm2-export-done').classList.add('hidden');
  vm2Get('vm2-export-error').classList.add('hidden');
  vm2Get('vm2-export-bar').style.width = '0%';
  vm2Get('vm2-export-status').textContent = 'Preparing export...';

  try {
    // For now, use canvas-based export (records the preview with overlays)
    // This approach works without CORS issues
    vm2Get('vm2-export-status').textContent = 'Rendering video with overlays...';
    vm2Get('vm2-export-detail').textContent = 'Using browser-based rendering';
    
    // Create a canvas to composite video + overlays.
    // Use PROJECT dimensions to match preview exactly.
    const nativeW = video.videoWidth || vm2.project.width;
    const nativeH = video.videoHeight || vm2.project.height;
    const projectW = vm2.project.width;
    const projectH = vm2.project.height;
    
    // Canvas matches project (preview) size
    const canvas = document.createElement('canvas');
    canvas.width  = projectW;
    canvas.height = projectH;
    const ctx = canvas.getContext('2d');
    
    const { drawX, drawY, drawW, drawH } = vm2GetVideoDrawRect(nativeW, nativeH, projectW, projectH);
    
    console.log('[VM2 Export] Video rect:', { drawX, drawY, drawW, drawH, projectW, projectH, nativeW, nativeH });
    
    // Set up MediaRecorder
    const stream = canvas.captureStream(30);
    
    // Try to get audio from video
    if (video.captureStream) {
      try {
        const videoStream = video.captureStream();
        const audioTracks = videoStream.getAudioTracks();
        audioTracks.forEach(track => stream.addTrack(track));
      } catch (e) {
        console.log('Could not capture audio:', e);
      }
    }
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9' 
        : 'video/webm'
    });
    
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    // Start recording
    mediaRecorder.start();
    
    let isRecording = true;

    const renderFrame = () => {
      if (!isRecording) return;
      
      // Manage non-linear timeline playback routing for export!
      const activeStepIdx = vm2.currentStepIdx;
      const activeStep = vm2.project.steps[activeStepIdx];
      
      let effectiveTime = video.currentTime;
      let shouldRender = true;

      if (activeStep) {
        // If we crossed the end boundary for this step's source clip
        if (video.currentTime >= (activeStep.sourceEnd ?? activeStep.endTime) - 0.05) {
          if (activeStepIdx + 1 < vm2.project.steps.length) {
            vm2.currentStepIdx++;
            const nextStep = vm2.project.steps[vm2.currentStepIdx];
            video.currentTime = nextStep.sourceStart ?? nextStep.startTime;
            video.muted = !!nextStep.muted;
            shouldRender = false; // Skip drawing this split-second
          } else {
            // Reached the end of the last step, stop!
            isRecording = false;
            video.pause();
            mediaRecorder.stop();
            return;
          }
        }
        
        // Calculate effective timeline time for overlays
        if (shouldRender) {
          const offset = video.currentTime - (activeStep.sourceStart ?? activeStep.startTime);
          effectiveTime = activeStep.startTime + offset;
          // Apply per-clip mute state (affects the captureStream audio track)
          video.muted = !!activeStep.muted;
        }
      }

      if (shouldRender) {
        // Fill with dark background (same as preview wrapper background for letterbox/pillarbox areas)
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame using contain logic (same as preview's object-fit:contain)
        ctx.drawImage(video, drawX, drawY, drawW, drawH);
        
        // Draw overlays at their project-space coordinates (no transform needed
        // since canvas is sized to project dimensions)
        vm2.project.steps.forEach(step => {
          step.elements.forEach(el => {
            if (el.type !== 'audio' && vm2IsElementVisibleAtTime(el, effectiveTime)) {
              vm2DrawElementOnCanvas(ctx, el, 1, 1, 0, 0);
            }
          });
        });
        
        // Update progress
        const progress = effectiveTime / vm2.duration;
        vm2Get('vm2-export-bar').style.width = Math.min((progress * 95), 100) + '%';
        vm2Get('vm2-export-detail').textContent = `${Math.round(progress * 100)}% rendered`;
      }
      
      requestAnimationFrame(renderFrame);
    };
    
    // Play video and render each frame
    // Mute is driven per-step; prime it from the first step now
    video.muted = !!(vm2.project.steps[0]?.muted);
    video.playbackRate = 1;
    
    await new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        isRecording = false;
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        vm2Get('vm2-export-bar').style.width = '100%';
        vm2Get('vm2-export-progress').classList.add('hidden');
        vm2Get('vm2-export-done').classList.remove('hidden');
        vm2Get('vm2-export-download').href = url;
        vm2Get('vm2-export-download').download = (vm2.project.title || 'video-manual') + '.webm';
        
        // Reset playback state – restore mute to whatever the current step says
        video.muted = !!(vm2.project.steps[vm2.currentStepIdx]?.muted);
        video.ontimeupdate = vm2OnTimeUpdate; // Restore original handler
        resolve();
      };
      
      // Override standard ontimeupdate to capture via renderFrame
      video.ontimeupdate = null; // Disable original handler during export
      
      // Start playback at the very first step's source slice
      if (vm2.project.steps.length > 0) {
        vm2.currentStepIdx = 0;
        video.currentTime = vm2.project.steps[0].sourceStart ?? vm2.project.steps[0].startTime;
        video.play().then(() => {
          requestAnimationFrame(renderFrame); // Start the render loop
        });
      } else {
        mediaRecorder.stop();
      }
    });

  } catch (err) {
    console.error('[VM2] Export error:', err);
    vm2Get('vm2-export-progress').classList.add('hidden');
    vm2Get('vm2-export-error').classList.remove('hidden');
    vm2Get('vm2-export-error-msg').textContent = err.message;
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
  window.vm2LoadPlaylists = vm2LoadPlaylists;
  window.vm2SelectPlaylist = vm2SelectPlaylist;
  window.vm2CreatePlaylist = vm2CreatePlaylist;
  window.vm2CreateProject = vm2CreateProject;
  window.vm2ReturnToBrowser = vm2ReturnToBrowser;
  window.vm2ShowAssetPicker = vm2ShowAssetPicker;
  window.vm2CloseAssetPicker = vm2CloseAssetPicker;
  window.vm2SelectPlaylistAsset = vm2SelectPlaylistAsset;
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
