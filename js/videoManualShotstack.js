// ═══════════════════════════════════════════════════════════════════════════
//  VIDEO MANUAL 2 – Shotstack SDK Integration (Vanilla JS)
// ═══════════════════════════════════════════════════════════════════════════

const VMSS_STORAGE_KEY = 'freya.videoManual.shotstack.project';
const VMSS_API_BASE_URL = () => {
  const base = typeof BASE_URL !== 'undefined' ? BASE_URL : 'http://localhost:3000';
  return base.replace(/\/$/, ''); // Remove trailing slash if present
};
const VMSS_PROJECTS_API_BASE = () => `${VMSS_API_BASE_URL()}/api/video-manuals-studio`;

const vmss = {
  screen: 'browser',
  editorMounted: false,
  playlist: null,
  playlists: [],
  playlistProjects: [],
  project: null,
  revisionPreview: null,
  trashOpen: false,
  playlistSearchQuery: '',
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
  addElementsLayoutRaf: null,
  onAddElementsWindowResize: null,
  onAddElementsOutsidePointerDown: null,
  onAddElementsEscapeKeyDown: null,
  addElementsOpen: false,
  addElementsCategory: 'text',
};

function vmssGet(id) {
  return document.getElementById(id);
}

function vmssEncodeBase64Unicode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function vmssAuthUser() {
  try {
    return JSON.parse(localStorage.getItem('authUser') || '{}');
  } catch (_) {
    return {};
  }
}

function vmssAuthHeaders(extraHeaders = {}) {
  const authUser = vmssAuthUser();
  const hasIdentity = authUser && (authUser.username || authUser.role);
  return {
    ...(hasIdentity ? {
      Authorization: `Bearer ${vmssEncodeBase64Unicode(JSON.stringify({
        username: authUser.username || 'unknown',
        role: authUser.role || 'viewer',
      }))}`,
    } : {}),
    ...extraHeaders,
  };
}

function vmssCanManagePlaylists() {
  return ['admin', '課長', '部長', '係長'].includes(vmssAuthUser().role || 'viewer');
}

function vmssCanEditProjects() {
  return ['admin', '課長', '部長', '係長', '班長'].includes(vmssAuthUser().role || 'viewer');
}

function loadVideoManualPage() {
  vmssDispose();

  const main = document.getElementById('mainContent');
  if (!main) return;

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
              <div class="font-medium text-slate-700 dark:text-white">Shotstack project browser</div>
              <div class="mt-1 text-xs">Playlists, projects, recycle bin, and revision history are server-backed.</div>
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
              <div class="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 dark:border-sky-900/50 dark:bg-slate-900/60">Playlist and project browser before editing.</div>
              <div class="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3 dark:border-sky-900/50 dark:bg-slate-900/60">Server-backed working copies and revision history for the Shotstack JSON schema.</div>
            </div>
            <div class="mt-6 flex flex-wrap gap-3">
              <button onclick="loadVideoManualShotstackPage()" class="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-600">
                <i class="ri-arrow-right-line"></i>Open Project Browser
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

function vmssBrowserRoot() {
  return vmssGet('vmss-browser-screen');
}

function vmssEditorHost() {
  return vmssGet('vmss-editor-host');
}

function vmssShowBrowserScreen() {
  vmss.screen = 'browser';
  const browser = vmssBrowserRoot();
  const editor = vmssEditorHost();
  if (browser) browser.classList.remove('hidden');
  if (editor) editor.classList.add('hidden');
  vmssUnlockWorkspaceScroll();
}

function vmssShowEditorScreen() {
  vmss.screen = 'editor';
  const browser = vmssBrowserRoot();
  const editor = vmssEditorHost();
  if (browser) browser.classList.add('hidden');
  if (editor) editor.classList.remove('hidden');
  vmssLockWorkspaceScroll();
}

async function vmssEnsureEditorMounted() {
  const host = vmssEditorHost();
  if (!host || vmss.editorMounted) return;

  host.innerHTML = `
    <div class="mx-auto w-full max-w-[1720px]">
      <div id="vmss-editor" class="overflow-visible rounded-[28px] border border-white/60 bg-white/90 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] dark:border-gray-800 dark:bg-gray-900/90"></div>
    </div>
  `;

  await vmssInit('#vmss-editor');
  vmss.editorMounted = true;
}

function vmssSyncTrashUiState() {
  const trashBtn = vmssGet('vmss-trash-btn');
  const hasPlaylist = !!vmss.playlist;
  if (!trashBtn) return;

  trashBtn.disabled = !hasPlaylist;
  trashBtn.classList.toggle('opacity-60', !hasPlaylist);
  trashBtn.classList.toggle('cursor-not-allowed', !hasPlaylist);
  trashBtn.classList.toggle('border-red-200', vmss.trashOpen && hasPlaylist);
  trashBtn.classList.toggle('bg-red-50', vmss.trashOpen && hasPlaylist);
  trashBtn.classList.toggle('text-red-600', vmss.trashOpen && hasPlaylist);
}

function vmssRenderProjectBrowser() {
  const playlistList = vmssGet('vmss-playlist-list');
  const projectList = vmssGet('vmss-browser-project-list');
  const emptyState = vmssGet('vmss-browser-project-empty');
  const projectTitle = vmssGet('vmss-browser-project-title');
  const playlistMeta = vmssGet('vmss-playlist-meta');
  const createProjectBtn = vmssGet('vmss-create-project-btn');
  const createPlaylistBtn = vmssGet('vmss-create-playlist-btn');
  if (!playlistList || !projectList) return;

  const searchQuery = String(vmss.playlistSearchQuery || '').trim().toLocaleLowerCase();
  const visiblePlaylists = [...vmss.playlists]
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ja', { sensitivity: 'base', numeric: true }))
    .filter((playlist) => {
      if (!searchQuery) return true;
      return [playlist.name, playlist.description, playlist.model]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(searchQuery));
    });

  if (createPlaylistBtn) createPlaylistBtn.classList.toggle('hidden', !vmssCanManagePlaylists());
  if (createProjectBtn) createProjectBtn.disabled = !vmss.playlist || !vmssCanEditProjects();
  vmssSyncTrashUiState();

  playlistList.innerHTML = visiblePlaylists.length
    ? visiblePlaylists.map((playlist) => {
        const selected = vmss.playlist && String(vmss.playlist._id) === String(playlist._id);
        const projectCount = Number.isFinite(Number(playlist.projectCount)) ? Number(playlist.projectCount) : 0;
        return `
          <div onclick="vmssSelectPlaylist('${playlist._id}')" class="w-full cursor-pointer text-left rounded-2xl border px-4 py-3 transition ${selected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'}">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-gray-900 dark:text-white truncate">${vmssEscapeHtml(playlist.name || 'Untitled Playlist')}</div>
                <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">${vmssEscapeHtml(playlist.description || 'No description yet')}</div>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  ${playlist.model ? `<div class="inline-flex rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold tracking-wide text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">${vmssEscapeHtml(playlist.model)}</div>` : ''}
                </div>
                <div class="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">Project Count: ${projectCount}</div>
              </div>
              <span class="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${playlist.privacy === 'public'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : playlist.privacy === 'private'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}">${vmssEscapeHtml(playlist.privacy || 'internal')}</span>
            </div>
          </div>
        `;
      }).join('')
    : `<div class="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">${searchQuery ? 'No playlists match that search.' : 'No playlists yet.'}</div>`;

  if (projectTitle) {
    projectTitle.textContent = vmss.playlist ? vmss.playlist.name || 'Projects' : 'Select a Playlist';
  }

  if (playlistMeta) {
    playlistMeta.textContent = vmss.playlist
      ? `${vmss.playlistProjects.length} project${vmss.playlistProjects.length === 1 ? '' : 's'} · ${vmss.playlist.privacy || 'internal'}`
      : 'Choose a playlist to browse Shotstack projects.';
  }

  if (!vmss.playlist || !vmss.playlistProjects.length) {
    projectList.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  projectList.innerHTML = vmss.playlistProjects.map((project) => `
    <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div class="flex flex-col gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <div class="text-sm font-semibold text-gray-900 dark:text-white truncate">${vmssEscapeHtml(project.title || 'Untitled Project')}</div>
            <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${project.currentRevisionNumber
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-gray-300'}">${project.currentRevisionNumber ? `REV ${project.currentRevisionNumber}` : 'DRAFT'}</span>
          </div>
          ${project.description ? `<div class="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${vmssEscapeHtml(project.description)}</div>` : ''}
          <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">${project.tracksCount || 0} tracks · Updated ${new Date(project.updatedAt || project.createdAt).toLocaleDateString()}</div>
        </div>
        <div class="flex items-center gap-1">
          <button onclick="vmssLoadProject('${project._id}')" class="rounded-xl bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600">Open</button>
          <button onclick="vmssShowHistory('${project._id}')" class="rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-slate-500 transition hover:bg-slate-100 dark:border-gray-700 dark:hover:bg-gray-700" title="History"><i class="ri-history-line"></i></button>
          <button onclick="vmssDeleteProject('${project._id}', '${vmssEscapeHtml((project.title || 'Untitled').replace(/'/g, '\\&#39;'))}')" class="rounded-xl border border-red-200 px-2 py-1.5 text-xs text-red-500 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20" title="Move to recycle bin"><i class="ri-delete-bin-line"></i></button>
        </div>
      </div>
    </div>
  `).join('');
}

async function vmssLoadPlaylists() {
  const playlistList = vmssGet('vmss-playlist-list');
  const projectList = vmssGet('vmss-browser-project-list');
  if (playlistList) playlistList.innerHTML = '<div class="text-sm text-gray-400 py-6 text-center">Loading playlists…</div>';
  if (projectList) projectList.innerHTML = '';

  try {
    const res = await fetch(`${VMSS_PROJECTS_API_BASE()}/playlists`, { headers: vmssAuthHeaders() });
    if (!res.ok) throw new Error(String(res.status));
    vmss.playlists = await res.json();
    vmss.playlist = null;
    vmss.playlistProjects = [];
    vmss.trashOpen = false;
    vmssRenderProjectBrowser();
  } catch (error) {
    console.error('[VMSS] Load playlists error:', error);
    if (playlistList) playlistList.innerHTML = '<div class="text-sm text-red-400 py-6 text-center">Failed to load playlists</div>';
  }
}

function vmssSetPlaylistSearch(value) {
  vmss.playlistSearchQuery = value || '';
  vmssRenderProjectBrowser();
}

async function vmssSelectPlaylist(id) {
  vmss.playlist = vmss.playlists.find((item) => String(item._id) === String(id)) || null;
  vmss.playlistProjects = [];
  vmss.trashOpen = false;
  vmssRenderProjectBrowser();
  if (!vmss.playlist) return;

  const projectList = vmssGet('vmss-browser-project-list');
  if (projectList) {
    projectList.innerHTML = '<div class="text-sm text-gray-400 py-6 text-center">Loading projects…</div>';
  }

  try {
    const res = await fetch(`${VMSS_PROJECTS_API_BASE()}/playlists/${id}/projects`, { headers: vmssAuthHeaders() });
    if (!res.ok) throw new Error(String(res.status));
    vmss.playlistProjects = await res.json();
    if (vmss.playlist) vmss.playlist.projectCount = vmss.playlistProjects.length;
    vmssRenderProjectBrowser();
  } catch (error) {
    console.error('[VMSS] Load playlist projects error:', error);
    if (projectList) projectList.innerHTML = '<div class="text-sm text-red-400 py-6 text-center">Failed to load projects</div>';
  }
}

async function vmssCreatePlaylist() {
  if (!vmssCanManagePlaylists()) return;

  const name = window.prompt('Playlist name');
  if (!name || !name.trim()) return;
  const description = window.prompt('Playlist description', '') || '';

  try {
    const res = await fetch(`${VMSS_PROJECTS_API_BASE()}/playlists`, {
      method: 'POST',
      headers: vmssAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: name.trim(), description }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    await vmssLoadPlaylists();
    if (data.insertedId) await vmssSelectPlaylist(String(data.insertedId));
  } catch (error) {
    alert(`Failed to create playlist: ${error.message}`);
  }
}

async function vmssCreateProject() {
  if (!vmss.playlist?._id) {
    alert('Select a playlist first.');
    return;
  }

  const title = window.prompt('Project title');
  if (!title || !title.trim()) return;
  const description = window.prompt('Project description', '') || '';

  try {
    const res = await fetch(`${VMSS_PROJECTS_API_BASE()}/playlists/${vmss.playlist._id}/projects`, {
      method: 'POST',
      headers: vmssAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title: title.trim(), description }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    await vmssSelectPlaylist(String(vmss.playlist._id));
    if (data.insertedId) await vmssLoadProject(String(data.insertedId));
  } catch (error) {
    alert(`Failed to create project: ${error.message}`);
  }
}

async function vmssDeleteProject(id, title) {
  if (!window.confirm(`Move "${title}" to recycle bin?`)) return;

  try {
    const res = await fetch(`${VMSS_PROJECTS_API_BASE()}/projects/${id}`, {
      method: 'DELETE',
      headers: vmssAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    if (vmss.playlist?._id) await vmssSelectPlaylist(String(vmss.playlist._id));
  } catch (error) {
    alert(`Failed to delete project: ${error.message}`);
  }
}

async function vmssToggleTrashView() {
  const projectSection = vmssGet('vmss-browser-project-list');
  const trashPanel = vmssGet('vmss-trash-panel');
  const emptyState = vmssGet('vmss-browser-project-empty');
  if (!trashPanel) return;
  if (!vmss.playlist) {
    vmssSyncTrashUiState();
    return;
  }

  vmss.trashOpen = !vmss.trashOpen;
  if (vmss.trashOpen) {
    if (projectSection) projectSection.classList.add('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    trashPanel.classList.remove('hidden');
    await vmssLoadTrash();
  } else {
    trashPanel.classList.add('hidden');
    if (projectSection) projectSection.classList.remove('hidden');
    if (emptyState && !vmss.playlistProjects.length) emptyState.classList.remove('hidden');
  }

  vmssSyncTrashUiState();
}

async function vmssLoadTrash() {
  const list = vmssGet('vmss-trash-list');
  if (!list) return;
  if (!vmss.playlist?._id) {
    list.innerHTML = '<p class="col-span-3 text-sm text-gray-400 text-center py-8">Select a playlist first.</p>';
    return;
  }

  list.innerHTML = '<p class="col-span-3 text-sm text-gray-400 text-center py-6">Loading…</p>';

  try {
    const res = await fetch(`${VMSS_PROJECTS_API_BASE()}/playlists/${vmss.playlist._id}/trash`, { headers: vmssAuthHeaders() });
    if (!res.ok) throw new Error(String(res.status));
    const items = await res.json();

    if (!items.length) {
      list.innerHTML = '<p class="col-span-3 text-sm text-gray-400 text-center py-8">Recycle bin is empty.</p>';
      return;
    }

    const canPermDelete = new Set(['admin', '課長', '係長', '部長']).has(vmssAuthUser().role || '');
    list.innerHTML = items.map((project) => {
      const deletedDate = project.deletedAt ? new Date(project.deletedAt).toLocaleDateString() : '?';
      const daysRemaining = project.daysRemaining ?? '?';
      const safeTitle = vmssEscapeHtml(project.title || 'Untitled');
      return `
        <div class="rounded-2xl border border-red-100 bg-red-50/60 p-4 dark:border-red-900/40 dark:bg-red-900/10">
          <div class="text-sm font-semibold text-gray-800 dark:text-white truncate">${safeTitle}</div>
          <div class="mt-1 text-xs text-gray-500">${project.tracksCount || 0} tracks · Rev ${project.currentRevisionNumber || 0}</div>
          <div class="mt-1 text-xs text-gray-400">Deleted ${deletedDate} by ${vmssEscapeHtml(project.deletedBy || '?')}</div>
          <div class="mt-1 text-xs text-orange-500">${daysRemaining} day${daysRemaining === 1 ? '' : 's'} until permanent deletion</div>
          <div class="mt-3 flex gap-2">
            <button onclick="vmssRestoreProject('${project._id}')" class="flex-1 rounded-xl bg-green-500 px-2 py-1.5 text-xs font-medium text-white hover:bg-green-600"><i class="ri-arrow-go-back-line mr-1"></i>Restore</button>
            ${canPermDelete ? `<button onclick="vmssPermanentDeleteProject('${project._id}', '${safeTitle.replace(/'/g, '\\&#39;')}')" class="rounded-xl border border-red-300 px-2 py-1.5 text-xs text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30" title="Delete forever"><i class="ri-delete-bin-2-fill"></i></button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    list.innerHTML = `<p class="col-span-3 text-sm text-red-400 text-center py-8">Failed to load recycle bin: ${vmssEscapeHtml(error.message)}</p>`;
  }
}

async function vmssRestoreProject(id) {
  try {
    const res = await fetch(`${VMSS_PROJECTS_API_BASE()}/projects/${id}/restore`, {
      method: 'POST',
      headers: vmssAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    await vmssLoadTrash();
    if (vmss.playlist?._id) await vmssSelectPlaylist(String(vmss.playlist._id));
  } catch (error) {
    alert(`Failed to restore project: ${error.message}`);
  }
}

async function vmssPermanentDeleteProject(id, title) {
  if (!window.confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;

  try {
    const res = await fetch(`${VMSS_PROJECTS_API_BASE()}/projects/${id}/permanent`, {
      method: 'DELETE',
      headers: vmssAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));
    await vmssLoadTrash();
    if (vmss.playlist?._id) await vmssSelectPlaylist(String(vmss.playlist._id));
  } catch (error) {
    alert(`Failed to permanently delete project: ${error.message}`);
  }
}

function loadVideoManualShotstackPage() {
  const main = document.getElementById('mainContent');
  if (!main) return;

  main.innerHTML = `
    <div id="vmss-browser-screen" class="min-h-[calc(100vh-120px)] rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-sky-50 p-5 dark:from-gray-900 dark:via-gray-900 dark:to-slate-950">
      <div class="mx-auto flex h-full max-w-7xl flex-col gap-5">
        <div class="flex flex-col gap-4 rounded-[28px] border border-white/60 bg-white/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
          <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">Video Manual Library</p>
              <h2 class="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Playlists and projects</h2>
              <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Choose a playlist first, then open one of its Shotstack projects. Editing starts only after a real project exists.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button onclick="vmssLoadPlaylists()" class="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                <i class="ri-refresh-line mr-1"></i>Refresh
              </button>
              <button onclick="vmssToggleTrashView()" id="vmss-trash-btn" class="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <i class="ri-delete-bin-line mr-1"></i>Recycle Bin
              </button>
              <button id="vmss-create-playlist-btn" onclick="vmssCreatePlaylist()" class="hidden rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-sky-500 dark:hover:bg-sky-400">
                <i class="ri-stack-line mr-1"></i>New Playlist
              </button>
              <button id="vmss-create-project-btn" onclick="vmssCreateProject()" class="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-gray-700">
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
            <div class="mb-4">
              <label for="vmss-playlist-search" class="sr-only">Search playlists</label>
              <div class="relative">
                <i class="ri-search-line pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input id="vmss-playlist-search" type="search" value="${vmssEscapeHtml(vmss.playlistSearchQuery || '')}" oninput="vmssSetPlaylistSearch(this.value)" placeholder="Search playlists..." class="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              </div>
            </div>
            <div id="vmss-playlist-list" class="space-y-3"></div>
          </section>

          <section class="rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
            <div class="mb-5 flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-gray-800 md:flex-row md:items-end md:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Projects</p>
                <h3 id="vmss-browser-project-title" class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Select a Playlist</h3>
                <p id="vmss-playlist-meta" class="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a playlist to browse Shotstack projects.</p>
              </div>
            </div>
            <div id="vmss-browser-project-empty" class="rounded-[24px] border border-dashed border-slate-300 px-6 py-14 text-center dark:border-gray-700">
              <i class="ri-folder-open-line text-4xl text-slate-300 dark:text-gray-600"></i>
              <p class="mt-4 text-base font-medium text-slate-700 dark:text-slate-200">No playlist selected</p>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Pick a playlist on the left to browse projects.</p>
            </div>
            <div id="vmss-browser-project-list" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"></div>

            <div id="vmss-trash-panel" class="hidden">
              <div class="mb-4 flex items-center gap-3">
                <i class="ri-delete-bin-2-line text-xl text-red-400"></i>
                <div>
                  <p class="text-sm font-semibold text-slate-800 dark:text-white">Recycle Bin</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">Deleted Shotstack projects stay here temporarily before permanent removal.</p>
                </div>
              </div>
              <div id="vmss-trash-list" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3"></div>
            </div>
          </section>
        </div>
      </div>
    </div>
    <div id="vmss-editor-host" class="hidden min-h-[calc(100vh-120px)] rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-sky-50 p-4 dark:from-gray-900 dark:via-gray-900 dark:to-slate-950"></div>
    <div id="vmss-modal-history" class="hidden fixed inset-0 z-[320] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_30px_120px_-40px_rgba(15,23,42,0.45)] dark:border-gray-700 dark:bg-gray-900">
        <div class="mb-4 flex items-center justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">Revision History</p>
            <h3 class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Project History</h3>
          </div>
          <button onclick="vmssCloseHistory()" class="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"><i class="ri-close-line text-lg"></i></button>
        </div>
        <div id="vmss-history-meta" class="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300"></div>
        <div id="vmss-history-list" class="flex-1 space-y-2 overflow-y-auto"></div>
      </div>
    </div>
  `;

  vmss.editorMounted = false;
  vmss.screen = 'browser';
  vmss.project = null;
  vmss.revisionPreview = null;
  vmssShowBrowserScreen();
  void vmssLoadPlaylists();
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

function vmssBuildWorkingProjectPayload() {
  if (!vmss.edit) return null;

  return {
    title: vmss.title,
    description: vmss.project?.description || '',
    status: 'draft',
    edit: vmss.edit.getEdit(),
    assetSourceMap: vmss.assetSourceMap,
    settings: {
      output: vmss.edit.getEdit()?.output || null,
    },
  };
}

function vmssProjectNeedsRevisionFallback(project) {
  if (!project?.edit || typeof project.edit !== 'object') return true;

  const tracks = project.edit?.timeline?.tracks || [];
  const hasAnyClips = tracks.some((track) => (track?.clips || []).length > 0);
  if (!hasAnyClips) return true;

  const hasMediaReference = tracks.some((track) => (track?.clips || []).some((clip) => {
    const source = clip?.asset?.src;
    return typeof source === 'string' && source.trim().length > 0;
  }));
  const hasSavedAssetMap = !!project.assetSourceMap && Object.keys(project.assetSourceMap).length > 0;

  return hasSavedAssetMap && !hasMediaReference;
}

async function vmssFetchRevisionSnapshot(revisionId) {
  if (!revisionId) return null;

  const revisionRes = await fetch(`${VMSS_PROJECTS_API_BASE()}/revisions/${revisionId}`, {
    headers: vmssAuthHeaders(),
  });
  if (!revisionRes.ok) {
    throw new Error(String(revisionRes.status));
  }

  return revisionRes.json();
}

function vmssSyncPlaylistProjectEntry(projectId, updates = {}) {
  const index = vmss.playlistProjects.findIndex((item) => String(item._id) === String(projectId));
  if (index < 0) return;

  vmss.playlistProjects[index] = {
    ...vmss.playlistProjects[index],
    ...updates,
  };
}

async function vmssLoadProject(id) {
  await vmssEnsureEditorMounted();
  vmssShowEditorScreen();

  try {
    const res = await fetch(`${VMSS_PROJECTS_API_BASE()}/projects/${id}`, {
      headers: vmssAuthHeaders(),
    });
    if (!res.ok) throw new Error(String(res.status));
    const project = await res.json();

    let resolvedProject = project;
    vmss.playlist = vmss.playlists.find((item) => String(item._id) === String(project.playlistId)) || vmss.playlist;
    vmss.revisionPreview = null;

    if (project.lastRevisionId && vmssProjectNeedsRevisionFallback(project)) {
      try {
        const revision = await vmssFetchRevisionSnapshot(project.lastRevisionId);
        const snapshot = revision?.snapshot || {};
        if (snapshot?.edit) {
          resolvedProject = {
            ...project,
            ...snapshot,
            _id: project._id,
            playlistId: project.playlistId,
            title: snapshot.title || project.title,
            description: snapshot.description || project.description,
            currentRevisionNumber: project.currentRevisionNumber,
            lastRevisionId: project.lastRevisionId,
          };
        }
      } catch (revisionError) {
        console.warn('[VMSS] Failed to restore latest revision during load, falling back to working copy:', revisionError);
      }
    }

    vmss.project = resolvedProject;

    await vmssLoadTemplate(resolvedProject.edit || vmssCreateDefaultTemplate(), {
      title: resolvedProject.title || 'Video Manual 2',
      assetSourceMap: resolvedProject.assetSourceMap || {},
    });

    vmssLockWorkspaceScroll();
    vmss.dirty = false;
    vmssSetStatus(resolvedProject !== project ? 'Restored from latest revision' : 'Project loaded');
  } catch (error) {
    console.error('[VMSS] Load project error:', error);
    alert(`Failed to load project: ${error.message}`);
    vmssShowBrowserScreen();
  }
}

async function vmssPersistWorkingProject({ silent = true, reason = 'Saved' } = {}) {
  if (!vmss.project?._id || !vmss.edit) return null;

  vmssSetStatus(reason === 'Autosaved' ? 'Autosaving…' : 'Saving…');

  try {
    const res = await fetch(`${VMSS_PROJECTS_API_BASE()}/projects/${vmss.project._id}`, {
      method: 'PATCH',
      headers: vmssAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(vmssBuildWorkingProjectPayload()),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));

    vmss.project = {
      ...vmss.project,
      ...vmssBuildWorkingProjectPayload(),
      currentRevisionNumber: data.currentRevisionNumber ?? vmss.project.currentRevisionNumber ?? 0,
      lastRevisionId: data.lastRevisionId ?? vmss.project.lastRevisionId ?? null,
      updatedAt: data.updatedAt || new Date().toISOString(),
      lastEditedAt: data.lastEditedAt || new Date().toISOString(),
    };
    vmssSyncPlaylistProjectEntry(vmss.project._id, {
      title: vmss.project.title,
      description: vmss.project.description,
      currentRevisionNumber: vmss.project.currentRevisionNumber,
      updatedAt: vmss.project.updatedAt,
      tracksCount: vmss.project.edit?.timeline?.tracks?.length || 0,
    });
    vmss.dirty = false;
    vmssSetStatus(reason);
    return data;
  } catch (error) {
    console.error('[VMSS] Save project error:', error);
    vmssSetStatus('Save failed');
    if (!silent) alert(`Failed to save project: ${error.message}`);
    return null;
  }
}

async function vmssSaveRevision() {
  if (!vmss.project?._id || !vmss.edit) {
    alert('Open a project first.');
    return;
  }

  const defaultRevisionName = `${vmss.title || 'Untitled'} Rev ${String((vmss.project.currentRevisionNumber || 0) + 1).padStart(2, '0')}`;
  const revisionName = window.prompt('Revision name:', defaultRevisionName);
  if (!revisionName) return;

  const workingCopySave = await vmssPersistWorkingProject({ silent: true, reason: 'Working copy saved' });
  if (!workingCopySave) {
    alert('Working copy could not be saved, so the revision was not created.');
    return;
  }

  try {
    const res = await fetch(`${VMSS_PROJECTS_API_BASE()}/projects/${vmss.project._id}/revisions`, {
      method: 'POST',
      headers: vmssAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        revisionName,
        snapshot: vmssBuildWorkingProjectPayload(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));

    vmss.project.currentRevisionNumber = data.revisionNumber || vmss.project.currentRevisionNumber || 0;
    vmss.project.lastRevisionId = data.revisionId || vmss.project.lastRevisionId || null;
    vmssSyncPlaylistProjectEntry(vmss.project._id, {
      currentRevisionNumber: vmss.project.currentRevisionNumber,
      updatedAt: new Date().toISOString(),
    });
    vmssSetStatus('Revision saved');
    await vmssShowHistory(vmss.project._id);
  } catch (error) {
    console.error('[VMSS] Save revision error:', error);
    alert(`Failed to save revision: ${error.message}`);
  }
}

function vmssCloseHistory() {
  vmssGet('vmss-modal-history')?.classList.add('hidden');
}

async function vmssShowHistory(projectId = vmss.project?._id) {
  const modal = vmssGet('vmss-modal-history');
  const list = vmssGet('vmss-history-list');
  const meta = vmssGet('vmss-history-meta');
  if (!modal || !list) return;

  modal.classList.remove('hidden');
  if (!projectId) {
    if (meta) meta.textContent = 'Select a saved project to view history.';
    list.innerHTML = '<p class="text-sm text-gray-400 text-center py-6">Save a project first.</p>';
    return;
  }

  if (meta) {
    meta.textContent = vmss.project && String(vmss.project._id) === String(projectId)
      ? `Current working revision: ${vmss.project.currentRevisionNumber || 0}`
      : 'Revision history for selected project';
  }

  list.innerHTML = '<p class="text-sm text-gray-400 text-center py-6">Loading revisions…</p>';

  try {
    const res = await fetch(`${VMSS_PROJECTS_API_BASE()}/projects/${projectId}/revisions`, {
      headers: vmssAuthHeaders(),
    });
    if (!res.ok) throw new Error(String(res.status));
    const revisions = await res.json();

    if (!revisions.length) {
      list.innerHTML = '<p class="text-sm text-gray-400 text-center py-6">No revisions saved yet.</p>';
      return;
    }

    list.innerHTML = revisions.map((revision) => `
      <div class="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <div class="flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-gray-800 dark:text-white">${vmssEscapeHtml(revision.revisionName || 'Unnamed Revision')}</p>
            <p class="text-xs text-gray-400">Revision ${revision.revisionNumber || '?'} · ${new Date(revision.createdAt).toLocaleString()}</p>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Saved by ${vmssEscapeHtml(revision.createdBy || 'unknown')}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button onclick="vmssRestoreRevisionAsWorkingCopy('${revision._id}', '${projectId}')" class="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300">Restore</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    list.innerHTML = `<p class="text-sm text-red-400 text-center py-6">Failed to load revisions: ${vmssEscapeHtml(error.message)}</p>`;
  }
}

async function vmssRestoreRevisionAsWorkingCopy(revisionId, projectId) {
  if (!window.confirm('Restore this revision as the current working copy?')) return;

  try {
    const revisionRes = await fetch(`${VMSS_PROJECTS_API_BASE()}/revisions/${revisionId}`, {
      headers: vmssAuthHeaders(),
    });
    if (!revisionRes.ok) throw new Error(String(revisionRes.status));
    const revision = await revisionRes.json();
    const snapshot = revision.snapshot || {};

    const res = await fetch(`${VMSS_PROJECTS_API_BASE()}/projects/${projectId}`, {
      method: 'PATCH',
      headers: vmssAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: snapshot.title || vmss.project?.title || 'Video Manual 2',
        description: snapshot.description || vmss.project?.description || '',
        edit: snapshot.edit || vmssCreateDefaultTemplate(),
        assetSourceMap: snapshot.assetSourceMap || {},
        settings: snapshot.settings || {},
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || String(res.status));

    await vmssLoadProject(projectId);
    vmssCloseHistory();
    vmssSetStatus(`Restored ${revision.revisionName || `Rev ${revision.revisionNumber || '?'}`}`);
  } catch (error) {
    alert(`Failed to restore revision: ${error.message}`);
  }
}

async function vmssReturnToBrowser() {
  if (vmss.dirty && !window.confirm('You have unsaved changes. Return to the project browser anyway?')) {
    return;
  }

  const selectedPlaylistId = vmss.playlist?._id ? String(vmss.playlist._id) : null;
  vmssShowBrowserScreen();
  await vmssLoadPlaylists();
  if (selectedPlaylistId) {
    await vmssSelectPlaylist(selectedPlaylistId);
  }
}

function vmssCreateDefaultTemplate() {
  return {
    timeline: {
      background: '#ffffff',
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
                  color: '#111111',
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
                  color: '#111111',
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
      fps: 24,
      size: {
        width: 1920,
        height: 1080,
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

  template = vmssSanitizeEditTemplate(template);

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
  vmssHideFloatingCanvasToolbar();
  vmssHideFloatingSelectionToolbars();

  vmssBindEvents();
  vmssBindPreviewDrawHandlers();
  vmssBindAddElementsLayoutWatchers();
  vmssUpdateDrawModeUI();
  vmssUpdateAddElementsUI();
  vmssSyncStepsFromTracks();
  vmssRenderStepsPanel();
  vmssSyncSelectionActionButtons();
  vmssSetTitle(options.title || vmss.title);
  vmssSetStatus('Ready');
  vmssStartClock();
}

function vmssSanitizeEditTemplate(template) {
  if (!template || typeof template !== 'object') {
    return vmssCreateDefaultTemplate();
  }

  const sanitized = JSON.parse(JSON.stringify(template));
  const tracks = sanitized?.timeline?.tracks;
  if (Array.isArray(tracks)) {
    sanitized.timeline.tracks = tracks.map((track) => {
      if (!track || typeof track !== 'object') return { clips: [] };
      const rawClips = Array.isArray(track.clips) ? track.clips : [];
      return {
        clips: rawClips.map((clip) => vmssNormalizeImportedClipSource(clip)),
      };
    });
  }

  return sanitized;
}

function vmssNormalizeImportedClipSource(clip) {
  if (!clip || typeof clip !== 'object') return clip;
  if (!clip.asset || typeof clip.asset !== 'object') {
    const { transition, effect, ...baseClip } = clip;
    return baseClip;
  }

  const { transition, effect, ...baseClip } = clip;
  const normalizedClip = {
    ...baseClip,
    asset: {
      ...baseClip.asset,
    },
  };

  const source = normalizedClip.asset.src;
  if (typeof source !== 'string' || !source.trim()) return normalizedClip;

  const normalized = vmssNormalizePlayableMediaSource(source);
  if (!normalized) return normalizedClip;

  if (normalized.publicUrl !== normalized.previewUrl) {
    vmssRememberAssetSource(normalized.previewUrl, normalized.publicUrl);
  }

  return {
    ...normalizedClip,
    asset: {
      ...normalizedClip.asset,
      src: normalized.previewUrl,
    },
  };
}

function vmssNormalizePlayableMediaSource(sourceUrl) {
  if (typeof sourceUrl !== 'string' || !sourceUrl.trim()) return null;
  if (sourceUrl.startsWith('blob:') || sourceUrl.startsWith('data:')) {
    return { previewUrl: sourceUrl, publicUrl: sourceUrl };
  }
  if (sourceUrl.includes('/api/video-manuals/stream/') || sourceUrl.includes('/api/video-manual-media?url=')) {
    return { previewUrl: sourceUrl, publicUrl: sourceUrl };
  }

  try {
    const parsed = new URL(sourceUrl, window.location.href);
    const needsProxy = parsed.hostname === 'firebasestorage.googleapis.com' || parsed.hostname === 'storage.googleapis.com';
    if (!needsProxy) {
      return { previewUrl: parsed.toString(), publicUrl: parsed.toString() };
    }

    return {
      previewUrl: `${VMSS_API_BASE_URL()}/api/video-manual-media?url=${encodeURIComponent(parsed.toString())}`,
      publicUrl: parsed.toString(),
    };
  } catch (_) {
    return { previewUrl: sourceUrl, publicUrl: sourceUrl };
  }
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
  vmssUnbindAddElementsLayoutWatchers();
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
    vmssSyncSelectionActionButtons();
  });

  vmss.edit.events.on('clip:updated', () => {
    vmssMarkDirty();
    vmssSyncSelectedShapeAsset();
    vmssScheduleSelectedShapeSync(40);
    vmssRenderSelectedDrawerProperties();
    window.requestAnimationFrame(() => vmssHideFloatingSelectionToolbars());

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
    vmssSyncSelectionActionButtons();
  });

  vmss.edit.events.on('clip:selected', (data) => {
    vmss.selectedClipId = data?.clipIndex ?? null;
    vmss.currentStepIdx = data?.trackIndex ?? 0;
    vmssSyncSelectedShapeAsset();
    vmssScheduleSelectedShapeSync();
    vmssOpenSelectedClipInDrawer();
    window.requestAnimationFrame(() => vmssHideFloatingSelectionToolbars());

    vmssDebugLog('clip:selected', {
      selectedClipId: vmss.selectedClipId,
      currentStepIdx: vmss.currentStepIdx,
      data,
      clipVisual: vmssGetClipVisualSnapshot(),
      layout: vmssGetLayoutSnapshot(),
    });

    vmssRenderStepsPanel();
    vmssSyncSelectionActionButtons();
  });

  vmss.edit.events.on('selection:cleared', () => {
    vmss.selectedClipId = null;
    vmssRenderSelectedDrawerProperties();
    vmssHideFloatingSelectionToolbars();
    vmssRenderStepsPanel();
    vmssSyncSelectionActionButtons();
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
    color = '#111111',
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
  const targetTrackIndex = vmss.steps.length;

  // If Firebase doc ID is provided, use the proxy endpoint to bypass CORS
  let clipVideoUrl = videoUrl;
  if (firebaseDocId) {
    clipVideoUrl = `${VMSS_API_BASE_URL()}/api/video-manuals/stream/${firebaseDocId}`;
    console.log('Using proxy URL for video:', clipVideoUrl);
  }

  await vmss.edit.addTrack(targetTrackIndex, {
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

function vmssSyncSelectionActionButtons() {
  const deleteButton = document.getElementById('vmss-delete-selected-btn');
  const trimButton = document.getElementById('vmss-trim-selected-btn');
  const selection = vmssGetSelectedClipDataSnapshot();
  const hasSelection = !!selection;
  const canTrim = selection?.assetType === 'video';

  if (deleteButton) {
    deleteButton.disabled = !hasSelection;
    deleteButton.classList.toggle('opacity-50', !hasSelection);
    deleteButton.classList.toggle('cursor-not-allowed', !hasSelection);
    deleteButton.classList.toggle('hover:bg-red-100', hasSelection);
    deleteButton.classList.toggle('dark:hover:bg-red-900/40', hasSelection);
  }

  if (trimButton) {
    trimButton.disabled = !canTrim;
    trimButton.classList.toggle('opacity-50', !canTrim);
    trimButton.classList.toggle('cursor-not-allowed', !canTrim);
    trimButton.classList.toggle('hover:bg-gray-300', canTrim);
    trimButton.classList.toggle('dark:hover:bg-gray-700', canTrim);
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
  vmssBindAddElementsLayoutWatchers();
  vmssUpdateDrawModeUI();
  vmssUpdateAddElementsUI();
}

function vmssBindAddElementsLayoutWatchers() {
  if (vmss.onAddElementsWindowResize || vmss.onAddElementsOutsidePointerDown || vmss.onAddElementsEscapeKeyDown) return;

  vmss.onAddElementsWindowResize = () => {
    vmssScheduleAddElementsLayout();
  };

  vmss.onAddElementsOutsidePointerDown = (event) => {
    if (!vmss.addElementsOpen) return;

    const shell = document.getElementById('vmss-add-elements-shell');
    const target = event.target;
    if (!shell || !(target instanceof Node) || shell.contains(target)) return;
    if (target.closest('[data-vmss-preserve-selection]')) return;

    vmssCloseAddElementsPanel();
  };

  vmss.onAddElementsEscapeKeyDown = (event) => {
    if (!vmss.addElementsOpen || event.key !== 'Escape') return;

    vmssCloseAddElementsPanel();
  };

  window.addEventListener('resize', vmss.onAddElementsWindowResize);
  document.addEventListener('pointerdown', vmss.onAddElementsOutsidePointerDown, true);
  document.addEventListener('keydown', vmss.onAddElementsEscapeKeyDown, true);
}

function vmssUnbindAddElementsLayoutWatchers() {
  if (vmss.addElementsLayoutRaf) {
    window.cancelAnimationFrame(vmss.addElementsLayoutRaf);
    vmss.addElementsLayoutRaf = null;
  }

  if (vmss.onAddElementsWindowResize) {
    window.removeEventListener('resize', vmss.onAddElementsWindowResize);
    vmss.onAddElementsWindowResize = null;
  }

  if (vmss.onAddElementsOutsidePointerDown) {
    document.removeEventListener('pointerdown', vmss.onAddElementsOutsidePointerDown, true);
    vmss.onAddElementsOutsidePointerDown = null;
  }

  if (vmss.onAddElementsEscapeKeyDown) {
    document.removeEventListener('keydown', vmss.onAddElementsEscapeKeyDown, true);
    vmss.onAddElementsEscapeKeyDown = null;
  }
}

function vmssScheduleAddElementsLayout() {
  if (vmss.addElementsLayoutRaf) return;

  vmss.addElementsLayoutRaf = window.requestAnimationFrame(() => {
    vmss.addElementsLayoutRaf = null;
    vmssUpdateAddElementsLayout();
  });
}

function vmssUpdateAddElementsLayout() {
  const shell = document.getElementById('vmss-add-elements-shell');
  const content = document.getElementById('vmss-add-elements-content');
  const workspace = document.getElementById('vmss-workspace-main');
  if (!shell || !content) return;

  const editorRect = document.getElementById('vmss-root')?.getBoundingClientRect?.();
  const shellRect = shell.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const gutter = 12;
  const desiredWidth = 312;
  const minWidth = 220;
  const leftBoundary = Math.max(gutter, editorRect?.left ?? gutter);
  const rightBoundary = Math.min(viewportWidth - gutter, editorRect?.right ?? (viewportWidth - gutter));
  const availableRight = Math.max(0, rightBoundary - shellRect.right - gutter);
  const availableLeft = Math.max(0, shellRect.left - leftBoundary - gutter);
  const openLeft = availableRight < minWidth && availableLeft > availableRight;
  const usableSpace = openLeft ? availableLeft : availableRight;
  const fallbackSpace = openLeft ? availableRight : availableLeft;
  const maxUsableSpace = Math.max(usableSpace, fallbackSpace);
  const panelWidth = maxUsableSpace >= minWidth
    ? Math.min(desiredWidth, maxUsableSpace)
    : maxUsableSpace;

  if (panelWidth <= 0) {
    if (workspace) {
      workspace.style.marginRight = '0px';
      workspace.style.marginLeft = '0px';
    }
    return;
  }

  content.style.width = `${panelWidth}px`;
  content.style.left = openLeft ? 'auto' : '100%';
  content.style.right = openLeft ? '100%' : 'auto';
  content.style.borderLeftWidth = openLeft ? '0px' : '1px';
  content.style.borderRightWidth = openLeft ? '1px' : '0px';
  content.style.transformOrigin = openLeft ? 'right center' : 'left center';
  content.style.marginLeft = !openLeft && vmss.addElementsOpen ? '12px' : '0px';
  content.style.marginRight = openLeft && vmss.addElementsOpen ? '12px' : '0px';

  if (workspace) {
    workspace.style.marginRight = openLeft && vmss.addElementsOpen ? `${panelWidth + 12}px` : '0px';
    workspace.style.marginLeft = !openLeft && vmss.addElementsOpen ? `${panelWidth + 12}px` : '0px';
  }
}

function vmssSetAddElementsCategory(category) {
  const selection = vmssGetSelectedInspectorContext();
  const selectionCategory = selection?.category || null;

  if (selection && selectionCategory === category) {
    vmssClearSelectedClipFocus();
    vmss.addElementsOpen = false;
  } else if (selection && selectionCategory !== category) {
    vmssClearSelectedClipFocus();
    vmss.addElementsCategory = category;
    vmss.addElementsOpen = true;
  } else if (vmss.addElementsOpen && vmss.addElementsCategory === category) {
    vmss.addElementsOpen = false;
  } else {
    vmss.addElementsCategory = category;
    vmss.addElementsOpen = true;
  }

  vmssUpdateAddElementsUI();
}

function vmssCloseAddElementsPanel() {
  if (vmssGetSelectedInspectorContext()) {
    vmssClearSelectedClipFocus();
  }

  vmss.addElementsOpen = false;
  vmssUpdateAddElementsUI();
}

function vmssClearSelectedClipFocus() {
  vmss.selectedClipId = null;
  vmss.edit?.selectionManager?.clearSelection?.();
  document.querySelectorAll('.ss-clip.selected').forEach((element) => {
    element.classList.remove('selected');
  });
  vmssRenderSelectedDrawerProperties();
  vmssRenderStepsPanel();
  vmssHideFloatingSelectionToolbars();
  vmssSyncSelectionActionButtons();
}

function vmssGetAddElementsCategoryForClip(clip) {
  const assetType = clip?.asset?.type;

  if (['rich-text', 'text', 'title', 'caption', 'rich-caption'].includes(assetType)) {
    return 'text';
  }

  if (assetType === 'svg' || assetType === 'shape') {
    return 'shapes';
  }

  if (['video', 'image', 'audio'].includes(assetType)) {
    return 'media';
  }

  return null;
}

function vmssExtractNativeShapeStyle(asset, clip) {
  const shapeType = asset?.shape === 'rectangle'
    ? 'rect'
    : asset?.shape === 'circle'
      ? 'circle'
      : asset?.shape === 'line'
        ? 'line'
        : '';

  return {
    shapeType,
    fill: asset?.fill?.opacity === 0 ? '#00000000' : (asset?.fill?.color || '#fecaca'),
    stroke: asset?.stroke?.color || '#ef4444',
    strokeWidth: Number(asset?.stroke?.width || 3),
    width: Number(asset?.width || clip?.width || 200),
    height: Number(asset?.height || clip?.height || 100),
  };
}

function vmssBuildNativeShapeAsset(shapeType, width, height, options = {}) {
  const clipWidth = Math.max(24, Math.round(Number(width) || 180));
  const clipHeight = Math.max(24, Math.round(Number(height) || 100));
  const strokeWidth = Math.max(1, Math.round(Number(options.strokeWidth) || 3));
  const fillColor = options.fill === '#00000000' ? '#000000' : (options.fill || '#fecaca');
  const fillOpacity = options.fill === '#00000000' ? 0 : 0.35;
  const strokeColor = options.stroke || '#ef4444';

  if (shapeType === 'rect') {
    return {
      type: 'shape',
      shape: 'rectangle',
      width: clipWidth,
      height: clipHeight,
      rectangle: {
        width: Math.max(8, clipWidth - (strokeWidth * 2)),
        height: Math.max(8, clipHeight - (strokeWidth * 2)),
      },
      fill: { color: fillColor, opacity: fillOpacity },
      stroke: { color: strokeColor, width: strokeWidth },
    };
  }

  if (shapeType === 'circle') {
    return {
      type: 'shape',
      shape: 'circle',
      width: clipWidth,
      height: clipHeight,
      circle: {
        radius: Math.max(8, Math.floor((Math.min(clipWidth, clipHeight) - (strokeWidth * 2)) / 2)),
      },
      fill: { color: fillColor, opacity: fillOpacity },
      stroke: { color: strokeColor, width: strokeWidth },
    };
  }

  return {
    type: 'shape',
    shape: 'line',
    width: clipWidth,
    height: clipHeight,
    line: {
      length: Math.max(12, clipWidth - (strokeWidth * 2)),
      thickness: strokeWidth,
    },
    fill: { color: '#000000', opacity: 0 },
    stroke: { color: strokeColor, width: strokeWidth },
  };
}

function vmssGetAddElementsCategoryLabel(category) {
  const labels = {
    text: 'Text',
    shapes: 'Shapes',
    media: 'Media',
    background: 'Background',
    advanced: 'Advanced',
  };

  return labels[category] || 'Add Elements';
}

function vmssGetSelectedInspectorContext() {
  const context = vmssGetSelectedClipContext();
  if (!context) return null;

  const resolvedClip = vmss.edit?.getResolvedClip?.(context.trackIndex, context.clipIndex) || context.clip;
  const category = vmssGetAddElementsCategoryForClip(resolvedClip || context.clip);

  return {
    ...context,
    resolvedClip,
    category,
  };
}

function vmssOpenSelectedClipInDrawer() {
  const selection = vmssGetSelectedInspectorContext();
  if (!selection?.category) return;

  vmss.addElementsCategory = selection.category;
  vmss.addElementsOpen = true;
  vmssUpdateAddElementsUI();
}

function vmssUpdateAddElementsUI() {
  const isOpen = !!vmss.addElementsOpen;
  const nextCategory = vmss.addElementsCategory || 'text';
  const content = document.getElementById('vmss-add-elements-content');

  vmssScheduleAddElementsLayout();
  vmssSyncAddElementsSelectionState();
  vmssRenderSelectedDrawerProperties();

  document.querySelectorAll('[data-vmss-add-category]').forEach((button) => {
    const isActive = isOpen && button.getAttribute('data-vmss-add-category') === nextCategory;
    button.classList.toggle('bg-cyan-500', isActive);
    button.classList.toggle('text-white', isActive);
    button.classList.toggle('shadow-sm', isActive);
    button.classList.toggle('dark:bg-cyan-500', isActive);
    button.classList.toggle('bg-slate-100', !isActive);
    button.classList.toggle('text-slate-500', !isActive);
    button.classList.toggle('hover:bg-slate-200', !isActive);
    button.classList.toggle('dark:bg-gray-700', !isActive);
    button.classList.toggle('dark:text-gray-300', !isActive);
    button.classList.toggle('dark:hover:bg-gray-600', !isActive);
  });

  if (content) {
    content.classList.toggle('pointer-events-none', !isOpen);
    content.classList.toggle('opacity-0', !isOpen);
    content.classList.toggle('translate-x-3', !isOpen);
    content.classList.toggle('pointer-events-auto', isOpen);
    content.classList.toggle('opacity-100', isOpen);
    content.classList.toggle('translate-x-0', isOpen);
  }

  document.querySelectorAll('[data-vmss-add-panel]').forEach((panel) => {
    panel.classList.toggle('hidden', !isOpen || panel.getAttribute('data-vmss-add-panel') !== nextCategory);
  });
}

function vmssShowComingSoon(label) {
  vmssSetStatus(`${label} is coming soon`);
}

function vmssNormalizeHexColor(color) {
  const value = String(color || '').trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(value)) return value;

  if (/^#[0-9A-F]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }

  return null;
}

function vmssGetCurrentAddElementsState() {
  const editJson = vmss.edit?.getEdit?.() || {};
  const width = Number(editJson?.output?.size?.width) || 1920;
  const height = Number(editJson?.output?.size?.height) || 1080;
  const fps = Number(editJson?.output?.fps ?? editJson?.output?.frameRate) || 24;
  const normalizedBackground = vmssNormalizeHexColor(editJson?.timeline?.background);

  return {
    preset: `${width}x${height}`,
    fps: String(fps),
    background: normalizedBackground || String(editJson?.timeline?.background || '#FFFFFF').trim().toUpperCase(),
    normalizedBackground,
  };
}

function vmssSyncAddElementsSelectionState() {
  const state = vmssGetCurrentAddElementsState();
  const backgroundInput = document.getElementById('vmss-background-color-input');

  if (backgroundInput && state.normalizedBackground) {
    backgroundInput.value = state.normalizedBackground;
  }

  document.querySelectorAll('[data-vmss-output-preset]').forEach((button) => {
    const isActive = button.getAttribute('data-vmss-output-preset') === state.preset;
    vmssToggleAddElementsOptionState(button, isActive);
  });

  document.querySelectorAll('[data-vmss-output-fps]').forEach((button) => {
    const isActive = button.getAttribute('data-vmss-output-fps') === state.fps;
    vmssToggleAddElementsOptionState(button, isActive);
  });

  document.querySelectorAll('[data-vmss-bg-color]').forEach((button) => {
    const isActive = button.getAttribute('data-vmss-bg-color') === state.background;
    button.classList.toggle('ring-2', isActive);
    button.classList.toggle('ring-cyan-500', isActive);
    button.classList.toggle('ring-offset-2', isActive);
    button.classList.toggle('dark:ring-offset-gray-800', isActive);
    button.classList.toggle('shadow-sm', isActive);

    button.querySelectorAll('[data-vmss-current-icon]').forEach((icon) => {
      icon.classList.toggle('hidden', !isActive);
    });
  });
}

function vmssToggleAddElementsOptionState(button, isActive) {
  button.classList.toggle('border-cyan-400', isActive);
  button.classList.toggle('bg-cyan-50', isActive);
  button.classList.toggle('text-cyan-700', isActive);
  button.classList.toggle('shadow-sm', isActive);
  button.classList.toggle('dark:border-cyan-400/60', isActive);
  button.classList.toggle('dark:bg-cyan-500/15', isActive);
  button.classList.toggle('dark:text-cyan-200', isActive);

  button.classList.toggle('border-transparent', !isActive);
  button.classList.toggle('bg-gray-100', !isActive);
  button.classList.toggle('text-gray-700', !isActive);
  button.classList.toggle('dark:bg-gray-700', !isActive);
  button.classList.toggle('dark:text-gray-200', !isActive);

  button.querySelectorAll('[data-vmss-option-meta]').forEach((meta) => {
    meta.classList.toggle('text-cyan-600', isActive);
    meta.classList.toggle('dark:text-cyan-200', isActive);
    meta.classList.toggle('text-gray-400', !isActive);
  });
}

function vmssRenderSelectedDrawerProperties() {
  const selection = vmssGetSelectedInspectorContext();
  const title = document.getElementById('vmss-add-elements-title');

  if (title) {
    title.textContent = selection?.category
      ? `${vmssGetAddElementsCategoryLabel(selection.category)} Properties`
      : 'Add Elements';
  }

  document.querySelectorAll('[data-vmss-selection-properties]').forEach((container) => {
    const category = container.getAttribute('data-vmss-selection-properties');
    const shouldShow = !!selection && !!selection.category && category === selection.category;

    container.classList.toggle('hidden', !shouldShow);
    container.innerHTML = shouldShow ? vmssBuildSelectedPropertiesMarkup(selection) : '';
  });

  document.querySelectorAll('[data-vmss-add-panel]').forEach((panel) => {
    const panelCategory = panel.getAttribute('data-vmss-add-panel');
    const hideAddContent = !!selection && !!selection.category && panelCategory === selection.category;

    panel.querySelectorAll('[data-vmss-add-only]').forEach((section) => {
      section.classList.toggle('hidden', hideAddContent);
    });
  });
}

function vmssNormalizePropertyMarkup(markup) {
  return markup
    .replace('mb-4 rounded-[22px] border border-cyan-100 bg-cyan-50/70 p-4 shadow-sm dark:border-cyan-500/20 dark:bg-cyan-500/10', 'mb-4 p-1')
    .replace('rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-700 dark:bg-slate-900/60 dark:text-cyan-200', 'rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300')
    .replaceAll('space-y-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60', 'space-y-3 border-t border-slate-200 pt-3 dark:border-gray-700')
    .replaceAll('text-sm font-semibold', 'text-xs font-semibold')
    .replaceAll('text-xs font-medium', 'text-[11px] font-medium')
    .replaceAll('px-3 py-2 text-sm', 'px-2.5 py-2 text-xs')
    .replaceAll('focus:border-cyan-400', 'focus:border-slate-400')
    .replaceAll('text-cyan-700', 'text-slate-700')
    .replaceAll('bg-cyan-500 text-white hover:bg-cyan-600', 'bg-slate-700 text-white hover:bg-slate-800');
}

function vmssBuildSelectedPropertiesMarkup(selection) {
  const clip = selection.clip || {};
  const resolvedClip = selection.resolvedClip || clip;
  const asset = clip.asset || {};
  const resolvedAsset = resolvedClip.asset || asset;
  const assetType = resolvedAsset.type || asset.type || 'clip';
  const width = vmssGetStaticNumericValue(resolvedClip.width ?? clip.width, 400);
  const height = vmssGetStaticNumericValue(resolvedClip.height ?? clip.height, 200);
  const start = vmssGetStaticNumericValue(clip.start, 0);
  const length = vmssGetStaticNumericValue(clip.length, 5);
  const opacity = vmssGetStaticNumericValue(clip.opacity ?? resolvedClip.opacity, 1);
  const scale = vmssGetStaticNumericValue(clip.scale ?? resolvedClip.scale, 1);
  const offsetX = vmssGetStaticNumericValue((clip.offset || resolvedClip.offset)?.x, 0);
  const offsetY = vmssGetStaticNumericValue((clip.offset || resolvedClip.offset)?.y, 0);
  const rotate = vmssGetStaticNumericValue((clip.transform || resolvedClip.transform)?.rotate?.angle, 0);
  const transitionIn = clip.transition?.in || '';
  const transitionOut = clip.transition?.out || '';
  const effect = clip.effect || '';
  const trackLabel = `Track ${selection.trackIndex + 1}`;
  const header = assetType === 'video'
    ? 'Selected Video'
    : assetType === 'image'
      ? 'Selected Image'
      : assetType === 'audio'
        ? 'Selected Audio'
        : selection.category === 'shapes'
          ? 'Selected Shape'
          : 'Selected Text';
  const keyframesValue = vmssEscapeHtml(vmssBuildSelectedKeyframePayload(selection));

  const transformSection = `
    <section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60">
      <div>
        <p class="text-sm font-semibold text-slate-900 dark:text-white">Transform</p>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>Scale</span>
          <input type="number" step="0.05" min="0.05" value="${scale}" onchange="vmssSetSelectedClipScale(this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
        </label>
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>Opacity</span>
          <input type="number" step="0.05" min="0" max="1" value="${opacity}" onchange="vmssSetSelectedClipOpacity(this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
        </label>
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>X Position</span>
          <input type="number" step="0.05" min="-1" max="1" value="${offsetX}" onchange="vmssSetSelectedClipOffset('x', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
        </label>
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>Y Position</span>
          <input type="number" step="0.05" min="-1" max="1" value="${offsetY}" onchange="vmssSetSelectedClipOffset('y', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
        </label>
      </div>
      <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
        <span>Rotation</span>
        <input type="number" step="1" min="-360" max="360" value="${rotate}" onchange="vmssSetSelectedClipRotation(this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
      </label>
    </section>`;

  const timingSection = `
    <section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60">
      <div>
        <p class="text-sm font-semibold text-slate-900 dark:text-white">Timing</p>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>Start</span>
          <input type="number" step="0.1" min="0" value="${start}" onchange="vmssSetSelectedClipTiming('start', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
        </label>
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>Length</span>
          <input type="number" step="0.1" min="0.1" value="${length}" onchange="vmssSetSelectedClipTiming('length', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
        </label>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>Transition In</span>
          <select onchange="vmssSetSelectedClipTransition('in', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
            ${vmssBuildSelectOptions(['', 'fade', 'zoom', 'slideLeft', 'slideRight', 'slideUp', 'slideDown', 'carouselLeft', 'carouselRight', 'carouselUp', 'carouselDown', 'reveal', 'wipeRight', 'wipeLeft'], transitionIn, 'None')}
          </select>
        </label>
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>Transition Out</span>
          <select onchange="vmssSetSelectedClipTransition('out', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
            ${vmssBuildSelectOptions(['', 'fade', 'zoom', 'slideLeft', 'slideRight', 'slideUp', 'slideDown', 'carouselLeft', 'carouselRight', 'carouselUp', 'carouselDown', 'reveal', 'wipeRight', 'wipeLeft'], transitionOut, 'None')}
          </select>
        </label>
      </div>
      <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
        <span>Effect</span>
        <select onchange="vmssSetSelectedClipEffect(this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
          ${vmssBuildSelectOptions(['', 'zoomIn', 'zoomOut', 'slideLeft', 'slideRight', 'slideUp', 'slideDown'], effect, 'None')}
        </select>
      </label>
    </section>`;

  const sizeSection = `
    <section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60">
      <div>
        <p class="text-sm font-semibold text-slate-900 dark:text-white">Size & Position</p>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>Width</span>
          <input type="number" step="1" min="1" value="${width}" onchange="vmssSetSelectedClipDimension('width', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
        </label>
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>Height</span>
          <input type="number" step="1" min="1" value="${height}" onchange="vmssSetSelectedClipDimension('height', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
        </label>
      </div>
    </section>`;

  const keyframeSection = `
    <section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60">
      <div>
        <p class="text-sm font-semibold text-slate-900 dark:text-white">Keyframes</p>
        <p class="text-xs text-slate-500 dark:text-gray-400">Edit animated values as JSON for scale, opacity, offsetX, offsetY, rotate${selection.category === 'media' ? ', volume' : ''}.</p>
      </div>
      <textarea rows="8" onchange="vmssSetSelectedClipKeyframes(this.value)" class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">${keyframesValue}</textarea>
    </section>`;

  let assetFields = '';

  if (selection.category === 'text') {
    const text = typeof resolvedAsset.text === 'string' ? resolvedAsset.text : '';
    const font = resolvedAsset.font || {};
    const fontSize = Number(font.size) || 48;
    const fontWeight = Number(font.weight) || 400;
    const color = vmssNormalizeHexColor(font.color) || '#111111';
    const fontFamily = font.family || 'Work Sans';
    const lineHeight = vmssGetStaticNumericValue(font.lineHeight, 1);
    const horizontalAlign = asset.align?.horizontal || resolvedAsset.align?.horizontal || 'center';
    const verticalAlign = asset.align?.vertical || resolvedAsset.align?.vertical || 'middle';
    const backgroundColor = vmssNormalizeHexColor(asset.background?.color || resolvedAsset.background?.color) || '#FFFFFF';
    const backgroundOpacity = vmssGetStaticNumericValue(asset.background?.opacity ?? resolvedAsset.background?.opacity, 0);
    const strokeColor = vmssNormalizeHexColor(asset.stroke?.color || resolvedAsset.stroke?.color) || '#000000';
    const strokeWidth = vmssGetStaticNumericValue(asset.stroke?.width ?? resolvedAsset.stroke?.width, 0);

    assetFields = `
      <section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60">
        <div>
          <p class="text-sm font-semibold text-slate-900 dark:text-white">Style</p>
        </div>
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>Text</span>
          <textarea rows="3" onchange="vmssSetSelectedTextContent(this.value)" class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">${vmssEscapeHtml(text)}</textarea>
        </label>
        <div class="grid grid-cols-2 gap-2">
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
            <span>Font</span>
            <select onchange="vmssSetSelectedTextFontFamily(this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
              ${vmssBuildSelectOptions(['Work Sans', 'Montserrat', 'Open Sans', 'Roboto', 'Lato', 'Merriweather', 'Playfair Display', 'Oswald'], fontFamily)}
            </select>
          </label>
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
            <span>Font Size</span>
            <input type="number" step="1" min="8" value="${fontSize}" onchange="vmssSetSelectedTextFontSize(this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
          </label>
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
            <span>Weight</span>
            <select onchange="vmssSetSelectedTextFontWeight(this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
              ${[300, 400, 500, 600, 700, 800].map((value) => `<option value="${value}" ${fontWeight === value ? 'selected' : ''}>${value}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
            <span>Horizontal Align</span>
            <select onchange="vmssSetSelectedTextAlign('horizontal', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
              ${vmssBuildSelectOptions(['left', 'center', 'right'], horizontalAlign)}
            </select>
          </label>
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
            <span>Vertical Align</span>
            <select onchange="vmssSetSelectedTextAlign('vertical', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
              ${vmssBuildSelectOptions(['top', 'middle', 'bottom'], verticalAlign)}
            </select>
          </label>
        </div>
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>Line Height</span>
          <input type="number" step="0.1" min="0.5" value="${lineHeight}" onchange="vmssSetSelectedTextLineHeight(this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
        </label>
      </section>
      <section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60">
        <div>
          <p class="text-sm font-semibold text-slate-900 dark:text-white">Color</p>
        </div>
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>Text Color</span>
          <input type="color" value="${color}" onchange="vmssSetSelectedTextColor(this.value)" class="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1 dark:border-gray-600 dark:bg-gray-800">
        </label>
        <div class="grid grid-cols-2 gap-2">
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
            <span>Background</span>
            <input type="color" value="${backgroundColor}" onchange="vmssSetSelectedTextBackgroundColor(this.value)" class="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1 dark:border-gray-600 dark:bg-gray-800">
          </label>
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
            <span>BG Opacity</span>
            <input type="number" step="0.05" min="0" max="1" value="${backgroundOpacity}" onchange="vmssSetSelectedTextBackgroundOpacity(this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
          </label>
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
            <span>Stroke Color</span>
            <input type="color" value="${strokeColor}" onchange="vmssSetSelectedTextStrokeColor(this.value)" class="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1 dark:border-gray-600 dark:bg-gray-800">
          </label>
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
            <span>Stroke Width</span>
            <input type="number" step="1" min="0" value="${strokeWidth}" onchange="vmssSetSelectedTextStrokeWidth(this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
          </label>
        </div>
      </section>`;
  } else if (selection.category === 'media') {
    const volume = Number(asset.volume ?? resolvedAsset.volume);
    const trim = vmssGetStaticNumericValue(asset.trim ?? resolvedAsset.trim, 0);
    const crop = asset.crop || resolvedAsset.crop || {};
    const cropTop = vmssGetStaticNumericValue(crop.top, 0);
    const cropRight = vmssGetStaticNumericValue(crop.right, 0);
    const cropBottom = vmssGetStaticNumericValue(crop.bottom, 0);
    const cropLeft = vmssGetStaticNumericValue(crop.left, 0);
    const muted = volume <= 0;

    assetFields = `
      <section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60">
        <div>
          <p class="text-sm font-semibold text-slate-900 dark:text-white">Video</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
            <span>Trim</span>
            <input type="number" step="0.1" min="0" value="${trim}" onchange="vmssSetSelectedMediaTrim(this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
          </label>
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
            <span>Volume</span>
            <input type="number" step="0.05" min="0" max="1" value="${Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 1}" onchange="vmssSetSelectedMediaVolume(this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
          </label>
        </div>
        <button onclick="vmssToggleSelectedMediaMute()" class="inline-flex items-center justify-center gap-2 rounded-xl ${muted ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'bg-gray-100 text-slate-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'} px-3 py-2 text-xs font-semibold">
          <i class="${muted ? 'ri-volume-mute-line' : 'ri-volume-up-line'}"></i>${muted ? 'Unmute' : 'Mute'}
        </button>
      </section>
      <section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60">
        <div>
          <p class="text-sm font-semibold text-slate-900 dark:text-white">Crop</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400"><span>Top</span><input type="number" step="0.01" min="0" max="1" value="${cropTop}" onchange="vmssSetSelectedVideoCrop('top', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"></label>
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400"><span>Right</span><input type="number" step="0.01" min="0" max="1" value="${cropRight}" onchange="vmssSetSelectedVideoCrop('right', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"></label>
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400"><span>Bottom</span><input type="number" step="0.01" min="0" max="1" value="${cropBottom}" onchange="vmssSetSelectedVideoCrop('bottom', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"></label>
          <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400"><span>Left</span><input type="number" step="0.01" min="0" max="1" value="${cropLeft}" onchange="vmssSetSelectedVideoCrop('left', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"></label>
        </div>
      </section>`;
  } else if (selection.category === 'shapes') {
    const shapeStyle = resolvedAsset.type === 'shape'
      ? vmssExtractNativeShapeStyle(resolvedAsset, selection.resolvedClip)
      : vmssExtractShapeStyle(typeof resolvedAsset.src === 'string' ? resolvedAsset.src : '');
    const fill = vmssNormalizeHexColor(shapeStyle.fill) || '#FECACA';
    const stroke = vmssNormalizeHexColor(shapeStyle.stroke) || '#EF4444';
    const strokeWidth = Number(shapeStyle.strokeWidth) || 3;

    assetFields = `
      <div class="grid grid-cols-2 gap-2">
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>Fill</span>
          <input type="color" value="${fill}" onchange="vmssSetSelectedShapeStyle('fill', this.value)" class="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1 dark:border-gray-600 dark:bg-gray-800">
        </label>
        <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
          <span>Stroke</span>
          <input type="color" value="${stroke}" onchange="vmssSetSelectedShapeStyle('stroke', this.value)" class="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1 dark:border-gray-600 dark:bg-gray-800">
        </label>
      </div>
      <label class="space-y-1 text-xs font-medium text-slate-500 dark:text-gray-400">
        <span>Stroke Width</span>
        <input type="number" min="1" step="1" value="${strokeWidth}" onchange="vmssSetSelectedShapeStyle('strokeWidth', this.value)" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
      </label>`;
  }

  return vmssNormalizePropertyMarkup(`
    <section class="mb-4 rounded-[22px] border border-cyan-100 bg-cyan-50/70 p-4 shadow-sm dark:border-cyan-500/20 dark:bg-cyan-500/10">
      <div class="mb-3 flex items-start justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-slate-900 dark:text-white">${header}</p>
          <p class="text-xs text-slate-500 dark:text-gray-400">${trackLabel}</p>
        </div>
        <span class="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-700 dark:bg-slate-900/60 dark:text-cyan-200">${vmssEscapeHtml(vmssGetAddElementsCategoryLabel(selection.category))}</span>
      </div>
      <div class="space-y-3">
        ${assetFields}
        ${transformSection}
        ${timingSection}
        ${sizeSection}
        ${keyframeSection}
      </div>
    </section>`);
}

function vmssApplySelectedClipUpdate(update, statusMessage = 'Clip updated') {
  const context = vmssGetSelectedClipContext();
  if (!context) return;

  vmss.edit?.updateClipInDocument?.(context.clipId, update);
  vmss.edit?.resolveClip?.(context.clipId);
  vmss.canvas?.refresh?.();
  vmss.timeline?.refresh?.();
  vmssMarkDirty();
  vmssRenderSelectedDrawerProperties();
  vmssSetStatus(statusMessage);
}

function vmssGetStaticNumericValue(value, fallback = 0) {
  return Array.isArray(value) ? fallback : (Number.isFinite(Number(value)) ? Number(value) : fallback);
}

function vmssBuildSelectOptions(values, selectedValue, emptyLabel = null) {
  const options = [];

  if (emptyLabel !== null) {
    options.push(`<option value="" ${selectedValue === '' ? 'selected' : ''}>${emptyLabel}</option>`);
  }

  values.filter((value) => value !== '').forEach((value) => {
    options.push(`<option value="${vmssEscapeHtml(value)}" ${selectedValue === value ? 'selected' : ''}>${vmssEscapeHtml(value)}</option>`);
  });

  return options.join('');
}

function vmssBuildSelectedKeyframePayload(selection) {
  const clip = selection.clip || {};
  const keyframes = {};

  if (Array.isArray(clip.scale)) keyframes.scale = clip.scale;
  if (Array.isArray(clip.opacity)) keyframes.opacity = clip.opacity;
  if (Array.isArray(clip.offset?.x)) keyframes.offsetX = clip.offset.x;
  if (Array.isArray(clip.offset?.y)) keyframes.offsetY = clip.offset.y;
  if (Array.isArray(clip.transform?.rotate?.angle)) keyframes.rotate = clip.transform.rotate.angle;
  if (selection.category === 'media' && Array.isArray(clip.asset?.volume)) keyframes.volume = clip.asset.volume;

  return JSON.stringify(keyframes, null, 2);
}

function vmssSetSelectedClipTiming(field, value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return;

  const safeValue = field === 'length'
    ? Math.max(0.1, Number(numericValue.toFixed(3)))
    : Math.max(0, Number(numericValue.toFixed(3)));

  vmssApplySelectedClipUpdate({ [field]: safeValue }, `${field === 'start' ? 'Start' : 'Length'} updated`);
}

function vmssSetSelectedClipDimension(field, value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return;

  vmssApplySelectedClipUpdate({ [field]: Math.max(1, Math.round(numericValue)) }, `${field === 'width' ? 'Width' : 'Height'} updated`);
}

function vmssSetSelectedClipOffset(field, value) {
  const selection = vmssGetSelectedInspectorContext();
  const numericValue = Number(value);
  if (!selection || !Number.isFinite(numericValue)) return;

  vmssApplySelectedClipUpdate({
    offset: {
      ...(selection.clip.offset || {}),
      [field]: Number(numericValue.toFixed(4)),
    },
  }, `${field.toUpperCase()} position updated`);
}

function vmssSetSelectedClipScale(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return;

  vmssApplySelectedClipUpdate({ scale: Math.max(0.05, Number(numericValue.toFixed(3))) }, 'Scale updated');
}

function vmssSetSelectedClipOpacity(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return;

  vmssApplySelectedClipUpdate({ opacity: Math.max(0, Math.min(1, Number(numericValue.toFixed(2)))) }, 'Opacity updated');
}

function vmssSetSelectedClipRotation(value) {
  const selection = vmssGetSelectedInspectorContext();
  const numericValue = Number(value);
  if (!selection || !Number.isFinite(numericValue)) return;

  vmssApplySelectedClipUpdate({
    transform: {
      ...(selection.clip.transform || {}),
      rotate: {
        ...((selection.clip.transform || {}).rotate || {}),
        angle: Number(numericValue.toFixed(2)),
      },
    },
  }, 'Rotation updated');
}

function vmssSetSelectedClipTransition(direction, value) {
  const selection = vmssGetSelectedInspectorContext();
  if (!selection || !['in', 'out'].includes(direction)) return;

  const nextTransition = {
    ...(selection.clip.transition || {}),
    [direction]: value || undefined,
  };

  if (!nextTransition.in && !nextTransition.out) {
    vmssApplySelectedClipUpdate({ transition: undefined }, 'Transition updated');
    return;
  }

  vmssApplySelectedClipUpdate({ transition: nextTransition }, 'Transition updated');
}

function vmssSetSelectedClipEffect(value) {
  vmssApplySelectedClipUpdate({ effect: value || undefined }, 'Effect updated');
}

function vmssSetSelectedClipKeyframes(value) {
  const selection = vmssGetSelectedInspectorContext();
  if (!selection) return;

  try {
    const parsed = value.trim() ? JSON.parse(value) : {};
    const update = {};

    if (Array.isArray(parsed.scale)) update.scale = parsed.scale;
    if (Array.isArray(parsed.opacity)) update.opacity = parsed.opacity;
    if (Array.isArray(parsed.offsetX) || Array.isArray(parsed.offsetY)) {
      update.offset = {
        ...(selection.clip.offset || {}),
        ...(Array.isArray(parsed.offsetX) ? { x: parsed.offsetX } : {}),
        ...(Array.isArray(parsed.offsetY) ? { y: parsed.offsetY } : {}),
      };
    }
    if (Array.isArray(parsed.rotate)) {
      update.transform = {
        ...(selection.clip.transform || {}),
        rotate: {
          ...((selection.clip.transform || {}).rotate || {}),
          angle: parsed.rotate,
        },
      };
    }
    if (selection.category === 'media' && Array.isArray(parsed.volume)) {
      update.asset = {
        ...selection.clip.asset,
        volume: parsed.volume,
      };
    }

    vmssApplySelectedClipUpdate(update, 'Keyframes updated');
  } catch (error) {
    vmssSetStatus('Keyframes JSON is invalid');
  }
}

function vmssSetSelectedTextContent(value) {
  const selection = vmssGetSelectedInspectorContext();
  if (!selection || selection.category !== 'text') return;

  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      text: value,
    },
  }, 'Text updated');
}

function vmssSetSelectedTextFontSize(value) {
  const selection = vmssGetSelectedInspectorContext();
  const numericValue = Number(value);
  if (!selection || selection.category !== 'text' || !Number.isFinite(numericValue)) return;

  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      font: {
        ...(selection.clip.asset?.font || {}),
        size: Math.max(8, Math.round(numericValue)),
      },
    },
  }, 'Font size updated');
}

function vmssSetSelectedTextFontWeight(value) {
  const selection = vmssGetSelectedInspectorContext();
  const numericValue = Number(value);
  if (!selection || selection.category !== 'text' || !Number.isFinite(numericValue)) return;

  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      font: {
        ...(selection.clip.asset?.font || {}),
        weight: Math.max(100, Math.round(numericValue)),
      },
    },
  }, 'Font weight updated');
}

function vmssSetSelectedTextFontFamily(value) {
  const selection = vmssGetSelectedInspectorContext();
  if (!selection || selection.category !== 'text' || !value) return;

  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      font: {
        ...(selection.clip.asset?.font || {}),
        family: value,
      },
    },
  }, 'Font family updated');
}

function vmssSetSelectedTextColor(value) {
  const selection = vmssGetSelectedInspectorContext();
  const color = vmssNormalizeHexColor(value);
  if (!selection || selection.category !== 'text' || !color) return;

  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      font: {
        ...(selection.clip.asset?.font || {}),
        color,
      },
    },
  }, 'Text color updated');
}

function vmssSetSelectedTextAlign(axis, value) {
  const selection = vmssGetSelectedInspectorContext();
  if (!selection || selection.category !== 'text' || !['horizontal', 'vertical'].includes(axis)) return;

  const currentAlign = selection.clip.asset?.align || selection.clip.asset?.alignment || {};
  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      align: {
        ...currentAlign,
        [axis]: value,
      },
    },
  }, 'Alignment updated');
}

function vmssSetSelectedTextLineHeight(value) {
  const selection = vmssGetSelectedInspectorContext();
  const numericValue = Number(value);
  if (!selection || selection.category !== 'text' || !Number.isFinite(numericValue)) return;

  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      font: {
        ...(selection.clip.asset?.font || {}),
        lineHeight: Math.max(0.5, Number(numericValue.toFixed(2))),
      },
    },
  }, 'Line height updated');
}

function vmssSetSelectedTextBackgroundColor(value) {
  const selection = vmssGetSelectedInspectorContext();
  const color = vmssNormalizeHexColor(value);
  if (!selection || selection.category !== 'text' || !color) return;

  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      background: {
        ...(selection.clip.asset?.background || {}),
        color,
      },
    },
  }, 'Background color updated');
}

function vmssSetSelectedTextBackgroundOpacity(value) {
  const selection = vmssGetSelectedInspectorContext();
  const numericValue = Number(value);
  if (!selection || selection.category !== 'text' || !Number.isFinite(numericValue)) return;

  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      background: {
        ...(selection.clip.asset?.background || {}),
        opacity: Math.max(0, Math.min(1, Number(numericValue.toFixed(2)))),
      },
    },
  }, 'Background opacity updated');
}

function vmssSetSelectedTextStrokeColor(value) {
  const selection = vmssGetSelectedInspectorContext();
  const color = vmssNormalizeHexColor(value);
  if (!selection || selection.category !== 'text' || !color) return;

  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      stroke: {
        ...(selection.clip.asset?.stroke || {}),
        color,
      },
    },
  }, 'Stroke color updated');
}

function vmssSetSelectedTextStrokeWidth(value) {
  const selection = vmssGetSelectedInspectorContext();
  const numericValue = Number(value);
  if (!selection || selection.category !== 'text' || !Number.isFinite(numericValue)) return;

  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      stroke: {
        ...(selection.clip.asset?.stroke || {}),
        width: Math.max(0, Math.round(numericValue)),
      },
    },
  }, 'Stroke width updated');
}

function vmssSetSelectedMediaVolume(value) {
  const selection = vmssGetSelectedInspectorContext();
  const numericValue = Number(value);
  if (!selection || selection.category !== 'media' || !Number.isFinite(numericValue)) return;

  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      volume: Math.max(0, Math.min(1, Number(numericValue.toFixed(2)))),
    },
  }, 'Volume updated');
}

function vmssSetSelectedMediaTrim(value) {
  const selection = vmssGetSelectedInspectorContext();
  const numericValue = Number(value);
  if (!selection || selection.category !== 'media' || !Number.isFinite(numericValue)) return;

  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      trim: Math.max(0, Number(numericValue.toFixed(3))),
    },
  }, 'Trim updated');
}

function vmssToggleSelectedMediaMute() {
  const selection = vmssGetSelectedInspectorContext();
  if (!selection || selection.category !== 'media') return;

  const currentVolume = vmssGetStaticNumericValue(selection.clip.asset?.volume ?? selection.resolvedClip?.asset?.volume, 1);
  const nextVolume = currentVolume > 0 ? 0 : 1;
  vmssSetSelectedMediaVolume(String(nextVolume));
}

function vmssSetSelectedVideoCrop(field, value) {
  const selection = vmssGetSelectedInspectorContext();
  const numericValue = Number(value);
  if (!selection || selection.category !== 'media' || !Number.isFinite(numericValue)) return;

  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      crop: {
        ...(selection.clip.asset?.crop || {}),
        [field]: Math.max(0, Math.min(1, Number(numericValue.toFixed(3)))),
      },
    },
  }, 'Crop updated');
}

function vmssSetSelectedShapeStyle(field, value) {
  const selection = vmssGetSelectedInspectorContext();
  if (!selection || selection.category !== 'shapes') return;

  if (selection.resolvedClip?.asset?.type === 'shape') {
    const currentStyle = vmssExtractNativeShapeStyle(selection.resolvedClip.asset, selection.resolvedClip);
    if (!currentStyle.shapeType) return;

    const nextStyle = {
      ...currentStyle,
      [field]: field === 'strokeWidth' ? Math.max(1, Number(value) || currentStyle.strokeWidth) : (vmssNormalizeHexColor(value) || currentStyle[field]),
    };

    vmssApplySelectedClipUpdate({
      asset: vmssBuildNativeShapeAsset(
        currentStyle.shapeType,
        Number(selection.resolvedClip?.width ?? selection.clip.width) || currentStyle.width,
        Number(selection.resolvedClip?.height ?? selection.clip.height) || currentStyle.height,
        nextStyle,
      ),
    }, 'Shape updated');
    return;
  }

  const svgSource = typeof selection.resolvedClip?.asset?.src === 'string'
    ? selection.resolvedClip.asset.src
    : selection.clip.asset?.src;
  if (typeof svgSource !== 'string' || !svgSource) return;

  const currentStyle = vmssExtractShapeStyle(svgSource);
  if (!currentStyle.shapeType) return;

  const nextStyle = {
    ...currentStyle,
    [field]: field === 'strokeWidth' ? Math.max(1, Number(value) || currentStyle.strokeWidth) : (vmssNormalizeHexColor(value) || currentStyle[field]),
  };

  const nextSvg = vmssCreateShapeSvg(
    currentStyle.shapeType,
    Math.max(50, Math.round(Number(selection.resolvedClip?.width ?? selection.clip.width) || 200)),
    Math.max(50, Math.round(Number(selection.resolvedClip?.height ?? selection.clip.height) || 100)),
    nextStyle,
  );

  vmssApplySelectedClipUpdate({
    asset: {
      ...selection.clip.asset,
      src: nextSvg,
    },
  }, 'Shape updated');
}

function vmssHideFloatingCanvasToolbar() {
  document.querySelectorAll('.ss-canvas-toolbar').forEach((element) => {
    element.style.display = 'none';
  });
}

function vmssHideFloatingSelectionToolbars() {
  const hideNow = () => {
    document.querySelectorAll('.ss-toolbar, .ss-clip-toolbar, .ss-text-toolbar, .ss-rich-text-toolbar, .ss-media-toolbar, .ss-svg-toolbar, .ss-asset-toolbar, .ss-text-to-speech-toolbar, .ss-rich-caption-toolbar').forEach((element) => {
      if (element.classList.contains('ss-canvas-toolbar')) return;
      element.style.display = 'none';
    });
  };

  hideNow();
  window.setTimeout(hideNow, 0);
}

async function vmssSetBackgroundColor(color) {
  if (!vmss.edit || typeof color !== 'string' || !color.trim()) return;

  await vmss.edit.setTimelineBackground?.(color);
  vmss.canvas?.refresh?.();
  vmssMarkDirty();
  vmssSyncAddElementsSelectionState();
  vmssSetStatus(`Background set to ${color}`);
}

async function vmssSetOutputPreset(width, height) {
  if (!vmss.edit) return;

  const safeWidth = Number(width);
  const safeHeight = Number(height);
  if (!Number.isFinite(safeWidth) || !Number.isFinite(safeHeight)) return;

  await vmss.edit.setOutputSize?.(safeWidth, safeHeight);
  vmss.canvas?.resize?.();
  vmssScheduleTimelineRelayout();
  vmssMarkDirty();
  vmssSyncAddElementsSelectionState();
  vmssSetStatus(`Canvas size set to ${safeWidth} x ${safeHeight}`);
}

async function vmssSetOutputFps(fps) {
  if (!vmss.edit) return;

  const safeFps = Number(fps);
  if (!Number.isFinite(safeFps) || safeFps <= 0) return;

  await vmss.edit.setOutputFps?.(safeFps);
  vmssMarkDirty();
  vmssSyncAddElementsSelectionState();
  vmssSetStatus(`Frame rate set to ${safeFps} FPS`);
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

  return presets[preset] || { width: 1920, height: 1080 };
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
    <div id="vmss-root" class="flex flex-col bg-gray-100 dark:bg-gray-900" style="height:calc(100vh - 150px); min-height:min(860px, calc(100vh - 150px));">
      <div class="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
        <button onclick="vmssGoBack()" class="flex items-center gap-1 rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">
          <i class="ri-arrow-left-line"></i>Projects
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
        <button onclick="vmssSaveRevision()" class="flex items-center gap-1 rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
          <i class="ri-git-commit-line"></i>Save Revision
        </button>
        <button onclick="vmssShowHistory()" class="flex items-center gap-1 rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
          <i class="ri-history-line"></i>History
        </button>
        <div class="flex-1"></div>
        <input id="vmss-title" type="text" value="Video Manual 2" class="w-full max-w-[220px] border-b border-transparent bg-transparent px-2 text-center text-sm font-medium hover:border-gray-300 focus:border-blue-400 focus:outline-none dark:text-white sm:w-56 sm:max-w-none">
        <span id="vmss-save-status" class="text-xs text-gray-400">Loading...</span>
        <div class="flex-1"></div>
        <button onclick="vmssSaveProject()" class="flex items-center gap-1 rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">
          <i class="ri-save-line"></i>Save
        </button>
        <button onclick="vmssExport()" class="flex items-center gap-1 rounded bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600">
          <i class="ri-download-line"></i>Export
        </button>
      </div>

      <div class="flex min-h-0 flex-1 overflow-visible">
        <div class="flex w-44 flex-shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 xl:w-52">
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

        <div id="vmss-workspace-main" class="flex min-w-0 flex-1 flex-col bg-gray-200 transition-[margin] duration-200 dark:bg-gray-950">
          <div id="vmss-preview-surface" class="relative flex flex-1 items-center justify-center overflow-hidden bg-gray-800 dark:bg-black">
            <div data-shotstack-studio class="h-full w-full"></div>
            <div id="vmss-draw-overlay" class="pointer-events-none absolute inset-0 z-10 hidden"></div>
            <div id="vmss-draw-hint" class="pointer-events-none absolute left-4 top-4 z-20 hidden rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm">Drag on the preview to draw an arrow</div>
          </div>

          <div class="flex-shrink-0 border-t border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
            <div class="flex flex-wrap items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
              <button onclick="vmssTogglePlay()" id="vmss-play-btn" class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600">
                <i class="ri-play-fill text-lg"></i>
              </button>
              <span id="vmss-time-display" class="w-20 font-mono text-xs text-gray-600 dark:text-gray-300">0:00.0</span>
              <button id="vmss-trim-selected-btn" data-vmss-preserve-selection="true" onclick="vmssTrimSelectedClip()" disabled class="inline-flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs opacity-50 cursor-not-allowed dark:bg-gray-700 dark:text-gray-200" title="Trim selected video clip">
                <i class="ri-scissors-cut-line"></i>Trim
              </button>
              <button id="vmss-delete-selected-btn" data-vmss-preserve-selection="true" onclick="vmssDeleteSelectedClip()" disabled class="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs text-red-600 opacity-50 cursor-not-allowed dark:bg-red-900/20 dark:text-red-400" title="Delete selected clip">
                <i class="ri-delete-bin-line"></i>Delete
              </button>
              <div class="flex-1"></div>
            </div>
            <div data-shotstack-timeline style="height: 160px; position: relative;"></div>
          </div>
        </div>

        <div id="vmss-add-elements-shell" class="relative z-10 w-[4.5rem] flex-shrink-0 overflow-visible border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 xl:w-20">
          <div class="flex w-[4.5rem] flex-shrink-0 flex-col border-r border-gray-200 bg-slate-50 p-2 dark:border-gray-700 dark:bg-gray-900/80 xl:w-20">
            <div class="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400">Add</div>
            <div class="space-y-2">
              <button data-vmss-add-category="text" onclick="vmssSetAddElementsCategory('text')" class="flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] font-semibold transition">
                <i class="ri-text text-lg"></i>
                <span>Text</span>
              </button>
              <button data-vmss-add-category="shapes" onclick="vmssSetAddElementsCategory('shapes')" class="flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] font-semibold transition">
                <i class="ri-shape-line text-lg"></i>
                <span>Shapes</span>
              </button>
              <button data-vmss-add-category="media" onclick="vmssSetAddElementsCategory('media')" class="flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] font-semibold transition">
                <i class="ri-clapperboard-line text-lg"></i>
                <span>Media</span>
              </button>
              <button data-vmss-add-category="background" onclick="vmssSetAddElementsCategory('background')" class="flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] font-semibold transition">
                <i class="ri-palette-line text-lg"></i>
                <span>Background</span>
              </button>
              <button data-vmss-add-category="advanced" onclick="vmssSetAddElementsCategory('advanced')" class="flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] font-semibold transition">
                <i class="ri-settings-3-line text-lg"></i>
                <span>Advanced</span>
              </button>
            </div>
          </div>

          <div id="vmss-add-elements-content" class="pointer-events-none absolute left-full top-0 z-30 flex h-full w-72 translate-x-3 flex-col overflow-hidden border-l border-gray-200 bg-white opacity-0 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.22)] transition-all duration-200 dark:border-gray-700 dark:bg-gray-800">
            <div id="vmss-add-elements-title" class="border-b border-gray-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">Add Elements</div>

            <div class="flex-1 overflow-y-auto p-4">
              <div data-vmss-add-panel="text" class="space-y-4">
                <div data-vmss-selection-properties="text" class="hidden"></div>
                <div data-vmss-add-only class="space-y-4">
                  <div>
                    <p class="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Text Presets</p>
                    <div class="grid gap-2">
                      <button onclick="vmssAddTextClip('Title', vmss.edit?.playbackTime || 0, {fontSize: 72, fontWeight: 600})" class="rounded-2xl bg-gray-100 px-4 py-4 text-left text-sm font-semibold text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600">Headline Title</button>
                      <button onclick="vmssAddTextClip('Subtitle', vmss.edit?.playbackTime || 0, {fontSize: 44, fontWeight: 500})" class="rounded-2xl bg-gray-100 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Subtitle</button>
                      <button onclick="vmssAddTextClip('Body text', vmss.edit?.playbackTime || 0, {fontSize: 36, fontWeight: 400})" class="rounded-2xl bg-gray-100 px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">Paragraph</button>
                    </div>
                  </div>
                  <div>
                    <div class="mb-2 flex items-center justify-between">
                      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Fonts</p>
                      <button onclick="vmssShowComingSoon('Custom fonts')" class="rounded-full bg-cyan-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-cyan-600">Upload</button>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      <button onclick="vmssAddTextClip('Work Sans', vmss.edit?.playbackTime || 0, {fontFamily: 'Work Sans', fontSize: 36, fontWeight: 500})" class="rounded-2xl bg-gray-100 px-3 py-6 text-center text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Work Sans</button>
                      <button onclick="vmssShowComingSoon('More fonts')" class="rounded-2xl bg-gray-100 px-3 py-6 text-center text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">More Fonts</button>
                    </div>
                  </div>
                </div>
              </div>

              <div data-vmss-add-panel="shapes" class="hidden space-y-4">
                <div data-vmss-selection-properties="shapes" class="hidden"></div>
                <div data-vmss-add-only>
                  <p class="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Shape Tools</p>
                  <div class="grid grid-cols-2 gap-2">
                    <button onclick="vmssAddShapeClip('rect', vmss.edit?.playbackTime || 0)" class="flex flex-col items-center justify-center gap-3 rounded-2xl bg-gray-100 px-4 py-5 text-sm font-semibold text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"><div class="h-8 w-10 rounded-sm border-2 border-gray-800 dark:border-gray-100"></div><span>Rectangle</span></button>
                    <button onclick="vmssAddShapeClip('circle', vmss.edit?.playbackTime || 0)" class="flex flex-col items-center justify-center gap-3 rounded-2xl bg-gray-100 px-4 py-5 text-sm font-semibold text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"><div class="h-10 w-10 rounded-full border-2 border-gray-800 dark:border-gray-100"></div><span>Circle</span></button>
                    <button id="vmss-shape-arrow-btn" onclick="vmssStartShapeDraw('arrow')" class="flex flex-col items-center justify-center gap-3 rounded-2xl bg-gray-100 px-4 py-5 text-sm font-semibold text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"><i class="ri-arrow-right-up-line text-2xl"></i><span>Arrow</span></button>
                    <button onclick="vmssAddShapeClip('line', vmss.edit?.playbackTime || 0)" class="flex flex-col items-center justify-center gap-3 rounded-2xl bg-gray-100 px-4 py-5 text-sm font-semibold text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"><div class="h-0.5 w-10 bg-gray-800 dark:bg-gray-100"></div><span>Line</span></button>
                  </div>
                </div>
              </div>

              <div data-vmss-add-panel="media" class="hidden space-y-4">
                <div data-vmss-selection-properties="media" class="hidden"></div>
                <div data-vmss-add-only>
                  <p class="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Media Uploads</p>
                  <div class="grid gap-2">
                    <button onclick="document.getElementById('vmss-image-input').click()" class="flex items-center justify-between rounded-2xl bg-gray-100 px-4 py-4 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"><span class="inline-flex items-center gap-2"><i class="ri-image-add-line"></i>Photos</span><i class="ri-arrow-right-line text-base text-gray-400"></i></button>
                    <button onclick="document.getElementById('vmss-video-input').click()" class="flex items-center justify-between rounded-2xl bg-gray-100 px-4 py-4 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"><span class="inline-flex items-center gap-2"><i class="ri-video-add-line"></i>Video</span><i class="ri-arrow-right-line text-base text-gray-400"></i></button>
                    <button onclick="vmssShowComingSoon('Audio uploads')" class="flex items-center justify-between rounded-2xl bg-gray-100 px-4 py-4 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"><span class="inline-flex items-center gap-2"><i class="ri-volume-up-line"></i>Audio</span><span class="text-[11px] font-semibold uppercase tracking-wide text-cyan-500">Soon</span></button>
                  </div>
                  <input id="vmss-image-input" type="file" accept="image/*" class="hidden" onchange="vmssHandleImageUpload(event)">
                  <input id="vmss-video-input" type="file" accept="video/*" class="hidden" onchange="vmssHandleVideoUpload(event)">
                </div>
              </div>

              <div data-vmss-add-panel="background" class="hidden space-y-4">
                <div>
                  <p class="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Canvas Background</p>
                  <input id="vmss-background-color-input" type="color" value="#ffffff" onchange="vmssSetBackgroundColor(event.target.value)" class="mb-3 h-12 w-full cursor-pointer rounded-2xl border border-gray-200 bg-white p-1 dark:border-gray-600 dark:bg-gray-700">
                  <div class="grid grid-cols-4 gap-2">
                    <button data-vmss-bg-color="#FFFFFF" onclick="vmssSetBackgroundColor('#FFFFFF')" class="relative flex h-10 items-center justify-center rounded-full border border-gray-300 bg-white transition"><span data-vmss-current-icon class="hidden text-cyan-600"><i class="ri-check-line text-lg"></i></span></button>
                    <button data-vmss-bg-color="#000000" onclick="vmssSetBackgroundColor('#000000')" class="relative flex h-10 items-center justify-center rounded-full border border-gray-300 bg-black transition"><span data-vmss-current-icon class="hidden text-white"><i class="ri-check-line text-lg"></i></span></button>
                    <button data-vmss-bg-color="#F3F4F6" onclick="vmssSetBackgroundColor('#F3F4F6')" class="relative flex h-10 items-center justify-center rounded-full border border-gray-300 bg-gray-100 transition"><span data-vmss-current-icon class="hidden text-cyan-600"><i class="ri-check-line text-lg"></i></span></button>
                    <button data-vmss-bg-color="#E0F2FE" onclick="vmssSetBackgroundColor('#E0F2FE')" class="relative flex h-10 items-center justify-center rounded-full border border-gray-300 bg-sky-100 transition"><span data-vmss-current-icon class="hidden text-cyan-600"><i class="ri-check-line text-lg"></i></span></button>
                    <button data-vmss-bg-color="#DCFCE7" onclick="vmssSetBackgroundColor('#DCFCE7')" class="relative flex h-10 items-center justify-center rounded-full border border-gray-300 bg-green-100 transition"><span data-vmss-current-icon class="hidden text-cyan-600"><i class="ri-check-line text-lg"></i></span></button>
                    <button data-vmss-bg-color="#FEF3C7" onclick="vmssSetBackgroundColor('#FEF3C7')" class="relative flex h-10 items-center justify-center rounded-full border border-gray-300 bg-amber-100 transition"><span data-vmss-current-icon class="hidden text-cyan-600"><i class="ri-check-line text-lg"></i></span></button>
                    <button data-vmss-bg-color="#FCE7F3" onclick="vmssSetBackgroundColor('#FCE7F3')" class="relative flex h-10 items-center justify-center rounded-full border border-gray-300 bg-pink-100 transition"><span data-vmss-current-icon class="hidden text-cyan-600"><i class="ri-check-line text-lg"></i></span></button>
                    <button data-vmss-bg-color="#EDE9FE" onclick="vmssSetBackgroundColor('#EDE9FE')" class="relative flex h-10 items-center justify-center rounded-full border border-gray-300 bg-violet-100 transition"><span data-vmss-current-icon class="hidden text-cyan-600"><i class="ri-check-line text-lg"></i></span></button>
                  </div>
                </div>
              </div>

              <div data-vmss-add-panel="advanced" class="hidden space-y-4">
                <div>
                  <p class="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Resolution</p>
                  <div class="grid gap-2">
                    <button data-vmss-output-preset="1920x1080" onclick="vmssSetOutputPreset(1920, 1080)" class="flex items-center justify-between rounded-2xl border border-transparent bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"><span>1920 x 1080</span><span data-vmss-option-meta class="text-xs text-gray-400">16:9</span></button>
                    <button data-vmss-output-preset="1280x720" onclick="vmssSetOutputPreset(1280, 720)" class="flex items-center justify-between rounded-2xl border border-transparent bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"><span>1280 x 720</span><span data-vmss-option-meta class="text-xs text-gray-400">HD</span></button>
                    <button data-vmss-output-preset="1080x1920" onclick="vmssSetOutputPreset(1080, 1920)" class="flex items-center justify-between rounded-2xl border border-transparent bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"><span>1080 x 1920</span><span data-vmss-option-meta class="text-xs text-gray-400">Vertical</span></button>
                    <button data-vmss-output-preset="1080x1080" onclick="vmssSetOutputPreset(1080, 1080)" class="flex items-center justify-between rounded-2xl border border-transparent bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"><span>1080 x 1080</span><span data-vmss-option-meta class="text-xs text-gray-400">Square</span></button>
                  </div>
                </div>
                <div>
                  <p class="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Frame Rate</p>
                  <div class="grid grid-cols-2 gap-2">
                    <button data-vmss-output-fps="24" onclick="vmssSetOutputFps(24)" class="flex items-center justify-center rounded-2xl border border-transparent bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"><span>24 FPS</span></button>
                    <button data-vmss-output-fps="25" onclick="vmssSetOutputFps(25)" class="flex items-center justify-center rounded-2xl border border-transparent bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"><span>25 FPS</span></button>
                    <button data-vmss-output-fps="30" onclick="vmssSetOutputFps(30)" class="flex items-center justify-center rounded-2xl border border-transparent bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"><span>30 FPS</span></button>
                    <button data-vmss-output-fps="60" onclick="vmssSetOutputFps(60)" class="flex items-center justify-center rounded-2xl border border-transparent bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"><span>60 FPS</span></button>
                  </div>
                </div>
              </div>
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
  if (!vmss.project?._id) {
    alert('Open a project first.');
    return;
  }

  await vmssPersistWorkingProject({ silent: false, reason: 'Saved' });
}

async function vmssGoBack() {
  await vmssReturnToBrowser();
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
window.vmssSetAddElementsCategory = vmssSetAddElementsCategory;
window.vmssAddImageClip = vmssAddImageClip;
window.vmssAddVideoClip = vmssAddVideoClip;
window.vmssSetBackgroundColor = vmssSetBackgroundColor;
window.vmssSetOutputPreset = vmssSetOutputPreset;
window.vmssSetOutputFps = vmssSetOutputFps;
window.vmssSetSelectedClipTiming = vmssSetSelectedClipTiming;
window.vmssSetSelectedClipDimension = vmssSetSelectedClipDimension;
window.vmssSetSelectedClipOffset = vmssSetSelectedClipOffset;
window.vmssSetSelectedClipScale = vmssSetSelectedClipScale;
window.vmssSetSelectedClipOpacity = vmssSetSelectedClipOpacity;
window.vmssSetSelectedClipRotation = vmssSetSelectedClipRotation;
window.vmssSetSelectedClipTransition = vmssSetSelectedClipTransition;
window.vmssSetSelectedClipEffect = vmssSetSelectedClipEffect;
window.vmssSetSelectedClipKeyframes = vmssSetSelectedClipKeyframes;
window.vmssSetSelectedTextContent = vmssSetSelectedTextContent;
window.vmssSetSelectedTextFontSize = vmssSetSelectedTextFontSize;
window.vmssSetSelectedTextFontWeight = vmssSetSelectedTextFontWeight;
window.vmssSetSelectedTextFontFamily = vmssSetSelectedTextFontFamily;
window.vmssSetSelectedTextColor = vmssSetSelectedTextColor;
window.vmssSetSelectedTextAlign = vmssSetSelectedTextAlign;
window.vmssSetSelectedTextLineHeight = vmssSetSelectedTextLineHeight;
window.vmssSetSelectedTextBackgroundColor = vmssSetSelectedTextBackgroundColor;
window.vmssSetSelectedTextBackgroundOpacity = vmssSetSelectedTextBackgroundOpacity;
window.vmssSetSelectedTextStrokeColor = vmssSetSelectedTextStrokeColor;
window.vmssSetSelectedTextStrokeWidth = vmssSetSelectedTextStrokeWidth;
window.vmssSetSelectedMediaVolume = vmssSetSelectedMediaVolume;
window.vmssSetSelectedMediaTrim = vmssSetSelectedMediaTrim;
window.vmssToggleSelectedMediaMute = vmssToggleSelectedMediaMute;
window.vmssSetSelectedVideoCrop = vmssSetSelectedVideoCrop;
window.vmssSetSelectedShapeStyle = vmssSetSelectedShapeStyle;
window.vmssTrimSelectedClip = vmssTrimSelectedClip;
window.vmssShowComingSoon = vmssShowComingSoon;
window.vmssAddStep = vmssAddStep;
window.vmssDeleteStep = vmssDeleteStep;
window.vmssSelectStep = vmssSelectStep;
window.vmssTogglePlay = vmssTogglePlay;
window.vmssExport = vmssExport;
window.vmssSaveProject = vmssSaveProject;
window.vmssSaveRevision = vmssSaveRevision;
window.vmssShowHistory = vmssShowHistory;
window.vmssCloseHistory = vmssCloseHistory;
window.vmssRestoreRevisionAsWorkingCopy = vmssRestoreRevisionAsWorkingCopy;
window.vmssGoBack = vmssGoBack;
window.vmssReturnToBrowser = vmssReturnToBrowser;
window.vmssOpenClassicEditor = vmssOpenClassicEditor;
window.vmssLoadPlaylists = vmssLoadPlaylists;
window.vmssSetPlaylistSearch = vmssSetPlaylistSearch;
window.vmssSelectPlaylist = vmssSelectPlaylist;
window.vmssCreatePlaylist = vmssCreatePlaylist;
window.vmssCreateProject = vmssCreateProject;
window.vmssLoadProject = vmssLoadProject;
window.vmssDeleteProject = vmssDeleteProject;
window.vmssToggleTrashView = vmssToggleTrashView;
window.vmssRestoreProject = vmssRestoreProject;
window.vmssPermanentDeleteProject = vmssPermanentDeleteProject;
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
