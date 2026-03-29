/* ═══════════════════════════════════════════════
   NEON RADIO - DESKTOP APP
   ═══════════════════════════════════════════════ */

// ─── MOBILE REDIRECT ────────────────────────────────────────
(function() {
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|Opera Mini|Mobile/i.test(ua);
  const onIndex = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
  if (isMobile && onIndex) {
    window.location.replace('/mobile.html');
  }
})();

// ─── STATE ──────────────────────────────────────────────────
let streams = [];
let currentIndex = 0;
let isPlaying = false;
let eq = null;
let showToast = null;
let notifCount = 0;
let aboutData = {};

const audio = document.getElementById('audio-player');

// ─── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initClock('clock-display');
  initBattery({ fillId: 'batt-fill', percentId: 'batt-pct', iconId: null });
  showToast = createToastSystem('toast-container');

  await loadStreams();
  setupSearch();
  setupPlayerControls();
  setupVolume();
  setupEqualizer();
  setupNotifModal();
  await loadAboutPanel();

  // Check for stream list auto-update
  setInterval(checkNotifications, 30000);

  showToast('Neon Radio siap! 🎵', 'success', 'Selamat Datang');
});

// ─── LOAD STREAMS ────────────────────────────────────────────
async function loadStreams(query = '') {
  try {
    const url = query ? `/api/streams?q=${encodeURIComponent(query)}` : '/api/streams';
    streams = await apiGet(url);
    renderStreamList();
    if (!query && streams.length > 0) loadStream(0);
  } catch (e) {
    showToast('Gagal memuat daftar stream', 'error', 'Error');
  }
}

function renderStreamList() {
  const list = document.getElementById('stream-list');
  list.innerHTML = '';
  const icons = ['🎵','🎶','🎸','🎹','🎺','🎻','🥁','🎤','📻','🎧'];
  streams.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'stream-item' + (i === currentIndex ? ' active' : '');
    item.innerHTML = `
      <div class="stream-icon">${icons[i % icons.length]}</div>
      <div class="stream-info">
        <div class="stream-name">${s.name}</div>
        <div class="stream-genre">${s.genre} · ${s.bitrate || ''}</div>
      </div>
    `;
    item.addEventListener('click', () => { currentIndex = i; loadStream(i); });
    list.appendChild(item);
  });
}

// ─── LOAD & PLAY STREAM ──────────────────────────────────────
function loadStream(index) {
  if (index < 0 || index >= streams.length) return;
  currentIndex = index;
  const s = streams[index];

  // Update UI
  document.getElementById('track-name').textContent = s.name;
  document.getElementById('track-desc').textContent = s.description || '';
  document.getElementById('track-bitrate').textContent = s.bitrate ? `● ${s.bitrate} · ${s.genre}` : s.genre;
  document.getElementById('now-playing-label').textContent = '◉ NOW PLAYING';

  // Mark active
  document.querySelectorAll('.stream-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });

  // Load audio
  setStatus('connecting');
  audio.src = s.url;
  audio.load();
  playAudio();
}

function playAudio() {
  if (!eq) {
    eq = new AudioEqualizer(audio);
    eq.init().then(() => {
      eq.resume();
      _doPlay();
    });
  } else {
    eq.resume();
    _doPlay();
  }
}

function _doPlay() {
  const p = audio.play();
  if (p) {
    p.then(() => {
      isPlaying = true;
      updatePlayBtn();
      setStatus('live');
      startVisualizer();
    }).catch(e => {
      setStatus('offline');
      showToast('Gagal memutar stream. Coba stream lain.', 'error', 'Error Streaming');
    });
  }
}

function pauseAudio() {
  audio.pause();
  isPlaying = false;
  updatePlayBtn();
  stopVisualizer();
  setStatus('offline');
}

// ─── STATUS ──────────────────────────────────────────────────
function setStatus(s) {
  const el = document.getElementById('stream-status');
  if (s === 'live') {
    el.className = 'stream-status status-live';
    el.innerHTML = '<div class="status-dot"></div> LIVE';
    document.querySelector('.vinyl').classList.add('playing');
    document.querySelector('.visualizer').classList.add('playing');
  } else if (s === 'connecting') {
    el.className = 'stream-status status-connecting';
    el.innerHTML = '<div class="status-dot"></div> CONNECTING...';
    document.querySelector('.vinyl').classList.remove('playing');
  } else {
    el.className = 'stream-status status-offline';
    el.innerHTML = '<div class="status-dot"></div> OFFLINE';
    document.querySelector('.vinyl').classList.remove('playing');
    document.querySelector('.visualizer').classList.remove('playing');
  }
}

// ─── PLAYER CONTROLS ────────────────────────────────────────
function setupPlayerControls() {
  document.getElementById('btn-play').addEventListener('click', () => {
    if (isPlaying) pauseAudio();
    else { if (!audio.src) loadStream(currentIndex); else playAudio(); }
  });
  document.getElementById('btn-prev').addEventListener('click', prevStream);
  document.getElementById('btn-next').addEventListener('click', nextStream);
  document.getElementById('btn-stop').addEventListener('click', () => {
    audio.pause(); audio.src = ''; isPlaying = false;
    updatePlayBtn(); setStatus('offline'); stopVisualizer();
  });

  audio.addEventListener('ended', nextStream);
  audio.addEventListener('error', () => {
    setStatus('offline');
    showToast('Stream terputus atau tidak tersedia', 'error', 'Error Stream');
  });
  audio.addEventListener('waiting', () => setStatus('connecting'));
  audio.addEventListener('playing', () => { setStatus('live'); isPlaying = true; updatePlayBtn(); });
}

function updatePlayBtn() {
  const btn = document.getElementById('btn-play');
  btn.innerHTML = isPlaying ? '⏸' : '▶';
}

function prevStream() {
  currentIndex = (currentIndex - 1 + streams.length) % streams.length;
  loadStream(currentIndex);
}
function nextStream() {
  currentIndex = (currentIndex + 1) % streams.length;
  loadStream(currentIndex);
}

// ─── VOLUME ──────────────────────────────────────────────────
function setupVolume() {
  const slider = document.getElementById('vol-slider');
  const pct = document.getElementById('vol-pct');
  const icon = document.getElementById('vol-icon');
  slider.value = 80;
  audio.volume = 0.8;
  pct.textContent = '80%';

  slider.addEventListener('input', () => {
    const v = slider.value / 100;
    audio.volume = v;
    pct.textContent = slider.value + '%';
    icon.textContent = v === 0 ? '🔇' : v < 0.5 ? '🔉' : '🔊';
  });

  icon.addEventListener('click', () => {
    audio.muted = !audio.muted;
    icon.textContent = audio.muted ? '🔇' : (audio.volume < 0.5 ? '🔉' : '🔊');
  });
}

// ─── VISUALIZER ─────────────────────────────────────────────
let vizInterval = null;
function startVisualizer() {
  const bars = document.querySelectorAll('.viz-bar');
  bars.forEach(b => { b.style.height = ''; });
}
function stopVisualizer() {
  const bars = document.querySelectorAll('.viz-bar');
  bars.forEach(b => { b.style.height = '5px'; });
}

// ─── EQUALIZER ───────────────────────────────────────────────
function setupEqualizer() {
  const bands = ['bass', 'mid', 'treble', 'presence'];
  const methods = ['setBass', 'setMid', 'setTreble', 'setPresence'];

  bands.forEach((band, i) => {
    const slider = document.getElementById(`eq-${band}`);
    const val = document.getElementById(`eq-val-${band}`);
    if (!slider || !val) return;
    slider.value = 0;
    val.textContent = '0dB';
    slider.addEventListener('input', () => {
      const db = parseInt(slider.value);
      val.textContent = (db >= 0 ? '+' : '') + db + 'dB';
      if (eq && eq.initialized) eq[methods[i]](db);
    });
  });

  // Reverb
  const revSlider = document.getElementById('reverb-slider');
  const revPct = document.getElementById('reverb-pct');
  if (revSlider) {
    revSlider.value = 0;
    revPct.textContent = '0%';
    revSlider.addEventListener('input', () => {
      const v = revSlider.value / 100;
      revPct.textContent = revSlider.value + '%';
      if (eq && eq.initialized) eq.setReverb(v);
    });
  }

  // Presets
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (!eq || !eq.initialized) {
        showToast('Putar stream dulu untuk menggunakan EQ', 'info', 'EQ');
        return;
      }
      const p = eq.applyPreset(preset);
      // Sync sliders
      if (p) {
        const sync = (id, val) => {
          const el = document.getElementById(id);
          const elv = document.getElementById(id.replace('eq-', 'eq-val-'));
          if (el) { el.value = val; if (elv) elv.textContent = (val >= 0 ? '+' : '') + val + 'dB'; }
        };
        sync('eq-bass', p.bass); sync('eq-mid', p.mid);
        sync('eq-treble', p.treble); sync('eq-presence', p.presence);
        if (revSlider) {
          revSlider.value = Math.round(p.reverb * 100);
          revPct.textContent = revSlider.value + '%';
        }
      }
      showToast(`Preset "${preset}" diterapkan`, 'success', 'Equalizer');
    });
  });
}

// ─── SEARCH ──────────────────────────────────────────────────
function setupSearch() {
  const inp = document.getElementById('search-input');
  let timer;
  inp.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => loadStreams(inp.value.trim()), 350);
  });
}

// ─── NOTIFICATIONS MODAL ────────────────────────────────────
async function checkNotifications() {
  try {
    const auth = await apiGet('/api/check-auth');
    if (!auth.success) return;
    const notifs = await apiGet('/api/notifications');
    const unread = notifs.filter(n => !n.read).length;
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? 'flex' : 'none';
      notifCount = unread;
    }
  } catch (e) {}
}

function setupNotifModal() {
  const btn = document.getElementById('notif-btn');
  if (btn) btn.addEventListener('click', openNotifModal);
}

async function openNotifModal() {
  const overlay = document.getElementById('notif-modal');
  if (!overlay) return;
  overlay.style.display = 'flex';

  const list = document.getElementById('notif-list');
  list.innerHTML = '<div style="text-align:center;padding:20px;color:#7070aa">Memuat notifikasi...</div>';

  try {
    const auth = await apiGet('/api/check-auth');
    if (!auth.success) {
      list.innerHTML = '<div style="text-align:center;padding:20px;color:#7070aa">Login admin untuk melihat notifikasi</div>';
      return;
    }
    const notifs = await apiGet('/api/notifications');
    list.innerHTML = '';
    if (notifs.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:20px;color:#7070aa">Tidak ada notifikasi</div>';
      return;
    }
    const iconMap = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    notifs.slice(0, 30).forEach(n => {
      const item = document.createElement('div');
      item.className = `notif-item ${n.read ? '' : 'unread'} notif-${n.type}`;
      item.innerHTML = `
        <div><strong>${iconMap[n.type] || '🔔'} ${n.message}</strong></div>
        ${n.detail ? `<div style="font-size:12px;color:#7070aa">${n.detail}</div>` : ''}
        <div class="notif-time">${formatTime(n.timestamp)}</div>
      `;
      list.appendChild(item);
    });
  } catch (e) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:#ff3333">Gagal memuat notifikasi</div>';
  }
}

function closeNotifModal() {
  const overlay = document.getElementById('notif-modal');
  if (overlay) overlay.style.display = 'none';
}

// ─── ABOUT PANEL ─────────────────────────────────────────────
async function loadAboutPanel() {
  try {
    aboutData = await loadAbout();
    const container = document.getElementById('about-links');
    renderAboutLinks(aboutData, container, 'about-link');
  } catch (e) {}
}

// ─── OPEN ABOUT ──────────────────────────────────────────────
function openAboutModal() {
  document.getElementById('about-modal').style.display = 'flex';
}
function closeAboutModal() {
  document.getElementById('about-modal').style.display = 'none';
}
