/* ═══════════════════════════════════════════════
   NEON RADIO - ADMIN PANEL
   ═══════════════════════════════════════════════ */

let showToast = null;
let currentFmPath = '';
let currentFile = null;
let editorDirty = false;

// ─── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initClock('admin-clock');
  initBattery({ percentId: 'admin-batt-pct' });
  showToast = createAdminToast('toast-admin');

  const auth = await apiGet('/api/check-auth');
  if (auth.success) {
    showDashboard(auth.user);
  } else {
    showLoginScreen();
  }
});

// ─── LOGIN ───────────────────────────────────────────────────
function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-layout').style.display = 'none';
}

function showDashboard(user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-layout').style.display = 'flex';
  document.getElementById('admin-user').textContent = `👤 ${user.username}`;
  navigateTo('dashboard');
  loadNotifBadge();
  setInterval(loadNotifBadge, 15000);
}

async function doLogin() {
  const url = document.getElementById('li-url').value.trim();
  const user = document.getElementById('li-user').value.trim();
  const pass = document.getElementById('li-pass').value.trim();
  const src = document.getElementById('li-srcpass').value.trim();
  const err = document.getElementById('login-error');

  if (!user || !pass) { err.textContent = 'Username dan password wajib diisi'; err.style.display = 'block'; return; }

  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = 'Memverifikasi...';

  try {
    const res = await apiPost('/api/login', { username: user, password: pass });
    if (res.success) {
      // Save icecast connection if provided
      if (url) {
        await apiPost('/api/icecast', { icecast_url: url, username: user, password: pass, source_password: src, name: 'Default Server' });
      }
      err.style.display = 'none';
      showDashboard(res.user);
      showToast('Login berhasil! Selamat datang.', 'success');
    } else {
      err.textContent = res.message || 'Login gagal';
      err.style.display = 'block';
    }
  } catch (e) {
    err.textContent = 'Server error. Pastikan server berjalan.';
    err.style.display = 'block';
  }
  btn.disabled = false; btn.textContent = '🚀 LOGIN';
}

async function doLogout() {
  await apiPost('/api/logout', {});
  showLoginScreen();
  showToast('Logout berhasil', 'info');
}

// ─── NAVIGATION ──────────────────────────────────────────────
function navigateTo(panel) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const panelEl = document.getElementById(`panel-${panel}`);
  const navEl = document.querySelector(`[data-panel="${panel}"]`);
  if (panelEl) panelEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  // Load panel data
  switch (panel) {
    case 'dashboard': loadDashboard(); break;
    case 'streams': loadStreamsPanel(); break;
    case 'icecast': loadIcecastPanel(); break;
    case 'notifications': loadNotificationsPanel(); break;
    case 'filemanager': initFileManager(); break;
    case 'users': loadUsersPanel(); break;
    case 'settings': loadSettingsPanel(); break;
    case 'about': loadAboutPanel(); break;
  }
}

// ─── DASHBOARD ───────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [streamsData, notifs, db] = await Promise.all([
      apiGet('/api/streams'),
      apiGet('/api/notifications'),
      apiGet('/api/settings')
    ]);
    document.getElementById('stat-streams').textContent = streamsData.length;
    document.getElementById('stat-notifs').textContent = notifs.filter(n => !n.read).length;
    document.getElementById('stat-title').textContent = db.settings?.site_title || 'Neon Radio';

    const recentList = document.getElementById('recent-notifs');
    recentList.innerHTML = '';
    const iconMap = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    notifs.slice(0, 8).forEach(n => {
      const div = document.createElement('div');
      div.className = `notif-panel-item ${n.read ? '' : 'unread'} ${n.type}`;
      div.innerHTML = `
        <div class="np-icon">${iconMap[n.type] || '🔔'}</div>
        <div class="np-body">
          <div class="np-msg">${n.message}</div>
          ${n.detail ? `<div class="np-detail">${n.detail}</div>` : ''}
          <div class="np-time">${formatTime(n.timestamp)}</div>
        </div>
      `;
      recentList.appendChild(div);
    });
  } catch (e) { showToast('Gagal memuat dashboard', 'error'); }
}

// ─── NOTIFICATION BADGE ──────────────────────────────────────
async function loadNotifBadge() {
  try {
    const notifs = await apiGet('/api/notifications');
    const unread = notifs.filter(n => !n.read).length;
    const badge = document.getElementById('notif-nav-badge');
    if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'inline' : 'none'; }
  } catch (e) {}
}

// ─── STREAMS PANEL ───────────────────────────────────────────
let allStreams = [];
async function loadStreamsPanel() {
  try {
    allStreams = await apiGet('/api/streams');
    renderStreamsTable();
  } catch (e) { showToast('Gagal memuat streams', 'error'); }
}

function renderStreamsTable(filter = '') {
  const body = document.getElementById('streams-table-body');
  body.innerHTML = '';
  const filtered = filter ? allStreams.filter(s =>
    s.name.toLowerCase().includes(filter) || s.genre.toLowerCase().includes(filter)
  ) : allStreams;

  filtered.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.id}</td>
      <td><strong style="color:#00ffff">${s.name}</strong></td>
      <td>${s.genre}</td>
      <td style="font-size:11px;color:#7070aa;max-width:180px;overflow:hidden;text-overflow:ellipsis">${s.url}</td>
      <td>${s.bitrate || '-'}</td>
      <td>
        <button class="btn btn-cyan btn-xs" onclick="editStream(${s.id})">✏️ Edit</button>
        <button class="btn btn-red btn-xs" onclick="deleteStream(${s.id})">🗑️ Hapus</button>
        <button class="btn btn-green btn-xs" onclick="testStream('${s.url}')">▶ Test</button>
      </td>
    `;
    body.appendChild(tr);
  });
}

function filterStreams() {
  const q = document.getElementById('stream-search').value.toLowerCase();
  renderStreamsTable(q);
}

function showAddStreamForm() {
  document.getElementById('stream-form-card').style.display = 'block';
  document.getElementById('stream-form-id').value = '';
  document.getElementById('sf-name').value = '';
  document.getElementById('sf-url').value = '';
  document.getElementById('sf-genre').value = '';
  document.getElementById('sf-bitrate').value = '';
  document.getElementById('sf-desc').value = '';
  document.getElementById('stream-form-title').textContent = '➕ TAMBAH STREAM';
}

function editStream(id) {
  const s = allStreams.find(x => x.id == id);
  if (!s) return;
  document.getElementById('stream-form-card').style.display = 'block';
  document.getElementById('stream-form-id').value = s.id;
  document.getElementById('sf-name').value = s.name;
  document.getElementById('sf-url').value = s.url;
  document.getElementById('sf-genre').value = s.genre;
  document.getElementById('sf-bitrate').value = s.bitrate || '';
  document.getElementById('sf-desc').value = s.description || '';
  document.getElementById('stream-form-title').textContent = '✏️ EDIT STREAM';
}

async function saveStream() {
  const id = document.getElementById('stream-form-id').value;
  const data = {
    name: document.getElementById('sf-name').value.trim(),
    url: document.getElementById('sf-url').value.trim(),
    genre: document.getElementById('sf-genre').value.trim(),
    bitrate: document.getElementById('sf-bitrate').value.trim(),
    description: document.getElementById('sf-desc').value.trim()
  };
  if (!data.name || !data.url) { showToast('Nama dan URL wajib diisi', 'warning'); return; }
  try {
    if (id) { await apiPut(`/api/streams/${id}`, data); showToast('Stream diperbarui', 'success'); }
    else { await apiPost('/api/streams', data); showToast('Stream ditambahkan', 'success'); }
    document.getElementById('stream-form-card').style.display = 'none';
    loadStreamsPanel();
  } catch (e) { showToast('Gagal menyimpan stream', 'error'); }
}

async function deleteStream(id) {
  if (!confirm('Hapus stream ini?')) return;
  try {
    await apiDelete(`/api/streams/${id}`);
    showToast('Stream dihapus', 'warning');
    loadStreamsPanel();
  } catch (e) { showToast('Gagal menghapus', 'error'); }
}

function testStream(url) {
  const audio = new Audio(url);
  audio.volume = 0.5;
  audio.play().then(() => {
    showToast('Stream OK! Sedang memutar tes...', 'success');
    setTimeout(() => audio.pause(), 5000);
  }).catch(() => showToast('Stream tidak dapat diputar', 'error'));
}

// ─── ICECAST PANEL ───────────────────────────────────────────
async function loadIcecastPanel() {
  try {
    const servers = await apiGet('/api/icecast');
    const body = document.getElementById('icecast-table-body');
    body.innerHTML = '';
    servers.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.name}</td>
        <td style="font-size:12px">${s.icecast_url}</td>
        <td>${s.username}</td>
        <td><span class="badge badge-cyan">${s.connected ? 'Connected' : 'Idle'}</span></td>
        <td>${formatTime(s.added)}</td>
        <td>
          <button class="btn btn-green btn-xs" onclick="connectIcecast(${s.id})">🔗 Connect</button>
          <button class="btn btn-red btn-xs" onclick="deleteIcecast(${s.id})">🗑️ Hapus</button>
        </td>
      `;
      body.appendChild(tr);
    });
    if (servers.length === 0) body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#7070aa;padding:20px">Belum ada server Icecast</td></tr>';
  } catch (e) { showToast('Gagal memuat Icecast servers', 'error'); }
}

async function addIcecastServer() {
  const data = {
    icecast_url: document.getElementById('ic-url').value.trim(),
    name: document.getElementById('ic-name').value.trim() || 'Icecast Server',
    username: document.getElementById('ic-user').value.trim(),
    password: document.getElementById('ic-pass').value.trim(),
    source_password: document.getElementById('ic-srcpass').value.trim()
  };
  if (!data.icecast_url) { showToast('URL Icecast diperlukan', 'warning'); return; }
  try {
    await apiPost('/api/icecast', data);
    showToast('Server Icecast ditambahkan', 'success');
    loadIcecastPanel();
    ['ic-url','ic-name','ic-user','ic-pass','ic-srcpass'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  } catch (e) { showToast('Gagal menambahkan server', 'error'); }
}

async function deleteIcecast(id) {
  if (!confirm('Hapus server ini?')) return;
  await apiDelete(`/api/icecast/${id}`);
  showToast('Server dihapus', 'warning');
  loadIcecastPanel();
}

function connectIcecast(id) {
  showToast('Menghubungkan ke Icecast... (simulasi)', 'info');
}

// ─── NOTIFICATIONS PANEL ────────────────────────────────────
async function loadNotificationsPanel() {
  try {
    const notifs = await apiGet('/api/notifications');
    const container = document.getElementById('notif-panel-list');
    container.innerHTML = '';
    const iconMap = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    if (notifs.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:30px;color:#7070aa">Tidak ada notifikasi</div>';
      return;
    }
    notifs.forEach(n => {
      const div = document.createElement('div');
      div.className = `notif-panel-item ${n.read ? '' : 'unread'} ${n.type}`;
      div.innerHTML = `
        <div class="np-icon">${iconMap[n.type] || '🔔'}</div>
        <div class="np-body">
          <div class="np-msg">${n.message}</div>
          ${n.detail ? `<div class="np-detail">${n.detail}</div>` : ''}
          <div class="np-time">${formatTime(n.timestamp)}</div>
        </div>
        <span class="badge ${n.read ? 'badge-cyan' : 'badge-orange'}">${n.read ? 'Read' : 'Unread'}</span>
      `;
      container.appendChild(div);
    });
  } catch (e) { showToast('Gagal memuat notifikasi', 'error'); }
}

async function markAllRead() {
  await apiPost('/api/notifications/read-all', {});
  showToast('Semua notifikasi ditandai dibaca', 'success');
  loadNotificationsPanel();
  loadNotifBadge();
}

async function clearAllNotifs() {
  if (!confirm('Hapus semua notifikasi?')) return;
  await apiDelete('/api/notifications');
  showToast('Notifikasi dihapus', 'warning');
  loadNotificationsPanel();
}

// ─── USERS PANEL ────────────────────────────────────────────
async function loadUsersPanel() {
  try {
    const users = await apiGet('/api/users');
    const body = document.getElementById('users-table-body');
    body.innerHTML = '';
    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.id}</td>
        <td><strong>${u.username}</strong></td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-cyan' : 'badge-green'}">${u.role}</span></td>
        <td>${u.created ? new Date(u.created).toLocaleDateString('id-ID') : '-'}</td>
        <td>
          ${u.username !== 'admin' ? `<button class="btn btn-red btn-xs" onclick="deleteUser(${u.id})">🗑️ Hapus</button>` : '<span style="color:#7070aa;font-size:12px">Protected</span>'}
        </td>
      `;
      body.appendChild(tr);
    });
  } catch (e) { showToast('Gagal memuat users', 'error'); }
}

async function addUser() {
  const username = document.getElementById('new-username').value.trim();
  const password = document.getElementById('new-password').value.trim();
  const role = document.getElementById('new-role').value;
  if (!username || !password) { showToast('Username dan password wajib', 'warning'); return; }
  try {
    const res = await apiPost('/api/users', { username, password, role });
    if (res.success) { showToast('User dibuat', 'success'); loadUsersPanel(); document.getElementById('new-username').value = ''; document.getElementById('new-password').value = ''; }
    else showToast(res.message, 'error');
  } catch (e) { showToast('Gagal membuat user', 'error'); }
}

async function deleteUser(id) {
  if (!confirm('Hapus user ini?')) return;
  const res = await apiDelete(`/api/users/${id}`);
  if (res.success) { showToast('User dihapus', 'warning'); loadUsersPanel(); }
  else showToast(res.message, 'error');
}

// ─── SETTINGS PANEL ─────────────────────────────────────────
async function loadSettingsPanel() {
  try {
    const data = await apiGet('/api/settings');
    const s = data.settings || {};
    document.getElementById('set-title').value = s.site_title || '';
    document.getElementById('set-theme').value = s.theme_color || '#00ffff';
    document.getElementById('set-maxstreams').value = s.max_streams || 50;
  } catch (e) { showToast('Gagal memuat pengaturan', 'error'); }
}

async function saveSettings() {
  const settings = {
    site_title: document.getElementById('set-title').value.trim(),
    theme_color: document.getElementById('set-theme').value,
    max_streams: parseInt(document.getElementById('set-maxstreams').value)
  };
  try {
    await apiPost('/api/settings', { settings });
    showToast('Pengaturan disimpan', 'success');
  } catch (e) { showToast('Gagal menyimpan pengaturan', 'error'); }
}

// ─── ABOUT PANEL ────────────────────────────────────────────
async function loadAboutPanel() {
  try {
    const data = await apiGet('/api/settings');
    const a = data.about || {};
    Object.keys(a).forEach(key => {
      const el = document.getElementById(`ab-${key}`);
      if (el) el.value = a[key] || '';
    });
  } catch (e) { showToast('Gagal memuat data about', 'error'); }
}

async function saveAbout() {
  const keys = ['tiktok','whatsapp','discord','instagram','twitter','youtube','telegram','facebook','github','email'];
  const about = {};
  keys.forEach(k => { const el = document.getElementById(`ab-${k}`); if (el) about[k] = el.value.trim(); });
  try {
    await apiPost('/api/settings', { about });
    showToast('Data about disimpan', 'success');
  } catch (e) { showToast('Gagal menyimpan about', 'error'); }
}

// ─── FILE MANAGER ────────────────────────────────────────────
let selectedFile = null;

async function initFileManager() {
  currentFmPath = '';
  document.getElementById('fm-path').value = '/';
  await loadFiles('');
}

async function loadFiles(path) {
  currentFmPath = path || '';
  try {
    const data = await apiGet(`/api/files?path=${encodeURIComponent(path || '')}`);
    document.getElementById('fm-path').value = '/' + (data.path || '');
    renderFileList(data.items, data.path);
  } catch (e) { showToast('Gagal memuat file', 'error'); }
}

const FILE_ICONS = {
  dir: '📁', image: '🖼️', video: '🎬', audio: '🎵', text: '📄',
  file: '📄', '.json': '🗒️', '.js': '⚡', '.css': '🎨', '.html': '🌐',
  '.md': '📝', '.sh': '⚙️', '.bat': '⚙️', '.py': '🐍'
};

function getIcon(item) {
  return FILE_ICONS[item.type] || FILE_ICONS[item.ext] || '📄';
}

function renderFileList(items, basePath) {
  const container = document.getElementById('fm-files');
  container.innerHTML = '';
  selectedFile = null;

  // Back button
  if (basePath && basePath !== '') {
    const back = document.createElement('div');
    back.className = 'fm-item';
    back.innerHTML = `<div class="fm-icon">⬆️</div><div class="fm-name">..</div>`;
    back.addEventListener('click', () => {
      const parts = currentFmPath.split('/').filter(Boolean);
      parts.pop();
      loadFiles(parts.join('/'));
    });
    container.appendChild(back);
  }

  items.sort((a, b) => {
    if (a.type === 'dir' && b.type !== 'dir') return -1;
    if (a.type !== 'dir' && b.type === 'dir') return 1;
    return a.name.localeCompare(b.name);
  });

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'fm-item';
    div.innerHTML = `
      <div class="fm-icon">${getIcon(item)}</div>
      <div class="fm-name">${item.name}</div>
      <div class="fm-size">${item.type === 'dir' ? '' : formatBytes(item.size)}</div>
      <div class="fm-actions">
        ${item.type === 'dir' ? '' : `<button class="btn btn-cyan btn-xs" onclick="event.stopPropagation();openFile('${currentFmPath}/${item.name}','${item.type}')">👁️</button>`}
        <button class="btn btn-red btn-xs" onclick="event.stopPropagation();deleteFile('${currentFmPath}/${item.name}')">🗑️</button>
      </div>
    `;
    div.addEventListener('click', () => {
      document.querySelectorAll('.fm-item').forEach(i => i.classList.remove('selected'));
      div.classList.add('selected');
      selectedFile = { path: (currentFmPath ? currentFmPath + '/' : '') + item.name, type: item.type, name: item.name };
      if (item.type === 'dir') loadFiles(selectedFile.path);
      else openFile(selectedFile.path, item.type);
    });
    container.appendChild(div);
  });
}

async function openFile(filePath, type) {
  // Hide both, then show appropriate
  document.getElementById('fm-editor').classList.remove('open');
  document.getElementById('fm-preview').classList.remove('open');
  document.getElementById('fm-files').style.display = '';

  const path = filePath.replace(/^\/+/, '');

  if (type === 'text' || type === 'file') {
    // Show editor
    try {
      const data = await apiGet(`/api/file?path=${encodeURIComponent(path)}`);
      document.getElementById('fm-editor-filename').textContent = path;
      document.getElementById('fm-editor-textarea').value = data.content || '';
      document.getElementById('fm-editor').classList.add('open');
      document.getElementById('fm-files').style.display = 'none';
      currentFile = path;
      editorDirty = false;
      updateEditorStatus();

      document.getElementById('fm-editor-textarea').addEventListener('input', () => {
        editorDirty = true;
        updateEditorStatus();
      }, { once: true });
    } catch (e) { showToast('Gagal membuka file', 'error'); }
  } else if (['image','video','audio'].includes(type)) {
    // Show preview
    const preview = document.getElementById('fm-preview');
    const nameEl = document.getElementById('fm-preview-name');
    if (nameEl) nameEl.textContent = path.split('/').pop();
    preview.innerHTML = `<div id="fm-preview-name" style="color:#7070aa;font-size:13px">${path.split('/').pop()}</div>`;

    const streamUrl = `/api/file-stream?path=${encodeURIComponent(path)}`;
    if (type === 'image') {
      const img = document.createElement('img');
      img.src = streamUrl;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '70vh';
      img.style.borderRadius = '8px';
      img.style.border = '1px solid #00ffff22';
      preview.appendChild(img);
    } else if (type === 'video') {
      const vid = document.createElement('video');
      vid.src = streamUrl; vid.controls = true;
      vid.style.maxWidth = '100%'; vid.style.maxHeight = '70vh';
      preview.appendChild(vid);
    } else if (type === 'audio') {
      const aud = document.createElement('audio');
      aud.src = streamUrl; aud.controls = true;
      aud.style.width = '100%';
      preview.appendChild(aud);
    }
    preview.classList.add('open');
    document.getElementById('fm-files').style.display = 'none';
  }
}

function updateEditorStatus() {
  const bar = document.getElementById('fm-editor-statusbar');
  if (!bar) return;
  const textarea = document.getElementById('fm-editor-textarea');
  const lines = textarea.value.split('\n').length;
  const chars = textarea.value.length;
  bar.innerHTML = `<span>${currentFile}</span> <span>${lines} baris</span> <span>${chars} karakter</span> <span style="color:${editorDirty?'#ff6600':'#7070aa'}">${editorDirty ? '● Belum disimpan' : '✓ Tersimpan'}</span>`;
}

async function saveFile() {
  if (!currentFile) return;
  const content = document.getElementById('fm-editor-textarea').value;
  try {
    await apiPost('/api/file', { path: currentFile, content });
    editorDirty = false;
    updateEditorStatus();
    showToast('File disimpan', 'success');
  } catch (e) { showToast('Gagal menyimpan file', 'error'); }
}

function closeEditor() {
  if (editorDirty && !confirm('Ada perubahan yang belum disimpan. Lanjutkan?')) return;
  document.getElementById('fm-editor').classList.remove('open');
  document.getElementById('fm-preview').classList.remove('open');
  document.getElementById('fm-files').style.display = '';
  currentFile = null; editorDirty = false;
}

async function deleteFile(path) {
  if (!confirm(`Hapus "${path}"?`)) return;
  try {
    await apiDelete(`/api/file?path=${encodeURIComponent(path.replace(/^\/+/,''))}`);
    showToast('File dihapus', 'warning');
    loadFiles(currentFmPath);
  } catch (e) { showToast('Gagal menghapus file', 'error'); }
}

function newFile() {
  const name = prompt('Nama file baru (contoh: test.txt):');
  if (!name) return;
  const path = (currentFmPath ? currentFmPath + '/' : '') + name;
  document.getElementById('fm-editor-filename').textContent = path;
  document.getElementById('fm-editor-textarea').value = '';
  document.getElementById('fm-editor').classList.add('open');
  document.getElementById('fm-preview').classList.remove('open');
  document.getElementById('fm-files').style.display = 'none';
  currentFile = path; editorDirty = true;
  updateEditorStatus();
}

async function newFolder() {
  const name = prompt('Nama folder baru:');
  if (!name) return;
  const path = (currentFmPath ? currentFmPath + '/' : '') + name;
  try {
    await apiPost('/api/mkdir', { path });
    showToast('Folder dibuat', 'success');
    loadFiles(currentFmPath);
  } catch (e) { showToast('Gagal membuat folder', 'error'); }
}

function triggerUpload() { document.getElementById('fm-upload-input').click(); }

async function uploadFiles(input) {
  const files = input.files;
  if (!files || files.length === 0) return;
  const formData = new FormData();
  for (const f of files) formData.append('files', f);
  try {
    const res = await fetch(`/api/upload?path=${encodeURIComponent(currentFmPath)}`, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) { showToast(`${data.files.length} file diupload`, 'success'); loadFiles(currentFmPath); }
    else showToast('Upload gagal', 'error');
  } catch (e) { showToast('Gagal upload', 'error'); }
  input.value = '';
}

function refreshFiles() { loadFiles(currentFmPath); }

// Editor keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (document.getElementById('fm-editor').classList.contains('open')) {
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveFile(); }
    if (e.key === 'Escape') closeEditor();
    if (e.ctrlKey && e.key === 'z') { /* native undo */ }
  }
});

// Tab key in editor
document.addEventListener('DOMContentLoaded', () => {
  const ta = document.getElementById('fm-editor-textarea');
  if (ta) {
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
        ta.selectionStart = ta.selectionEnd = start + 2;
        editorDirty = true;
        updateEditorStatus();
      }
    });

    ta.addEventListener('input', updateEditorStatus);
  }
});
