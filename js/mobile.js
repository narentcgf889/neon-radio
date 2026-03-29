/* ═══════════════════════════════════════════════
   NEON RADIO - MOBILE APP
   ═══════════════════════════════════════════════ */

let streams = [];
let currentIndex = 0;
let isPlaying = false;
let eq = null;
let showToast = null;
let aboutData = {};

const audio = document.getElementById('audio-player-m');

// ─── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initClock('clock-m');
  initBatteryMobile();
  showToast = createMobileToast('toast-m');

  await loadStreams();
  setupPlayerControls();
  setupVolume();
  setupEqualizer();
  setupSwipe();
  setupModalDrag();
  await loadAboutMobile();

  showToast('Neon Radio siap! 🎵', 'info');
});

// ─── BATTERY MOBILE ─────────────────────────────────────────
function initBatteryMobile() {
  if (!('getBattery' in navigator)) return;
  navigator.getBattery().then(bat => {
    function update() {
      const pct = Math.round(bat.level * 100);
      const el = document.getElementById('batt-m');
      if (el) el.textContent = `${bat.charging ? '⚡' : '🔋'} ${pct}%`;
    }
    update();
    bat.addEventListener('levelchange', update);
    bat.addEventListener('chargingchange', update);
  }).catch(() => {});
}

// ─── LOAD STREAMS ────────────────────────────────────────────
async function loadStreams(query = '') {
  try {
    const url = query ? `/api/streams?q=${encodeURIComponent(query)}` : '/api/streams';
    streams = await apiGet(url);
    renderStreamList();
    if (!query && streams.length > 0) updatePlayerBar(0);
  } catch (e) {
    showToast('Gagal memuat stream', 'error');
  }
}

const icons = ['🎵','🎶','🎸','🎹','🎺','🎻','🥁','🎤','📻','🎧'];

function renderStreamList() {
  const list = document.getElementById('stream-list-m');
  list.innerHTML = '';
  streams.forEach((s, i) => {
    const card = document.createElement('div');
    card.className = 'stream-card-m' + (i === currentIndex ? ' active' : '');
    card.innerHTML = `
      <div class="sc-icon-m">${icons[i % icons.length]}</div>
      <div class="sc-info-m">
        <div class="sc-name-m">${s.name}</div>
        <div class="sc-genre-m">${s.genre} · ${s.bitrate || ''}</div>
      </div>
      <div class="sc-play-m">${i === currentIndex && isPlaying ? '▶' : '◼'}</div>
    `;
    card.addEventListener('click', () => { currentIndex = i; loadStream(i); });
    list.appendChild(card);
  });
}

// ─── UPDATE PLAYER BAR ───────────────────────────────────────
function updatePlayerBar(index) {
  if (index < 0 || index >= streams.length) return;
  const s = streams[index];
  document.getElementById('mini-name').textContent = s.name;
  document.getElementById('mini-status').textContent = s.genre;
  // Update modal
  document.getElementById('modal-track-name-m').textContent = s.name;
  document.getElementById('modal-track-desc-m').textContent = s.description || '';
  document.getElementById('modal-now-m').textContent = '◉ NOW PLAYING';
}

// ─── LOAD STREAM ────────────────────────────────────────────
function loadStream(index) {
  if (index < 0 || index >= streams.length) return;
  currentIndex = index;
  updatePlayerBar(index);
  updateStreamList();
  setMobileStatus('connecting');
  audio.src = streams[index].url;
  audio.load();
  playMobileAudio();
}

function updateStreamList() {
  document.querySelectorAll('.stream-card-m').forEach((el, i) => {
    el.classList.toggle('active', i === currentIndex);
    const picon = el.querySelector('.sc-play-m');
    if (picon) picon.textContent = (i === currentIndex && isPlaying) ? '▶' : '◼';
  });
}

// ─── PLAY/PAUSE ──────────────────────────────────────────────
function playMobileAudio() {
  if (!eq) {
    eq = new AudioEqualizer(audio);
    eq.init().then(() => {
      eq.resume();
      _mobilePlay();
    });
  } else {
    eq.resume();
    _mobilePlay();
  }
}

function _mobilePlay() {
  const p = audio.play();
  if (p) {
    p.then(() => {
      isPlaying = true;
      setMobileStatus('live');
      updatePlayBtns();
    }).catch(() => {
      setMobileStatus('offline');
      showToast('Gagal memutar. Coba stream lain.', 'error');
    });
  }
}

function pauseMobileAudio() {
  audio.pause();
  isPlaying = false;
  setMobileStatus('offline');
  updatePlayBtns();
}

function updatePlayBtns() {
  const icon = isPlaying ? '⏸' : '▶';
  ['btn-play-mini', 'btn-play-modal'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.textContent = icon;
  });
  const vinyl = document.getElementById('mini-vinyl');
  const bigVinyl = document.getElementById('big-vinyl-m');
  const vizWrap = document.getElementById('viz-wrap-m');
  if (vinyl) vinyl.classList.toggle('playing', isPlaying);
  if (bigVinyl) bigVinyl.classList.toggle('playing', isPlaying);
  if (vizWrap) vizWrap.classList.toggle('playing-m', isPlaying);
  updateStreamList();
}

function setMobileStatus(status) {
  const el = document.getElementById('mini-status');
  if (!el) return;
  if (status === 'live') el.textContent = '● LIVE';
  else if (status === 'connecting') el.textContent = '⟳ Connecting...';
  else el.textContent = streams[currentIndex] ? streams[currentIndex].genre : 'Offline';
}

// ─── CONTROLS ────────────────────────────────────────────────
function setupPlayerControls() {
  // Mini bar
  document.getElementById('btn-play-mini').addEventListener('click', togglePlay);
  document.getElementById('btn-next-mini').addEventListener('click', nextStream);

  // Modal
  document.getElementById('btn-play-modal').addEventListener('click', togglePlay);
  document.getElementById('btn-prev-modal').addEventListener('click', prevStream);
  document.getElementById('btn-next-modal').addEventListener('click', nextStream);

  // Player bar tap => open modal
  document.getElementById('mini-info').addEventListener('click', openPlayerModal);
  document.getElementById('mini-vinyl').addEventListener('click', openPlayerModal);

  // Modal close
  document.getElementById('close-modal-m').addEventListener('click', closePlayerModal);

  // Audio events
  audio.addEventListener('ended', nextStream);
  audio.addEventListener('error', () => {
    setMobileStatus('offline');
    showToast('Stream terputus', 'error');
  });
  audio.addEventListener('waiting', () => setMobileStatus('connecting'));
  audio.addEventListener('playing', () => { isPlaying = true; setMobileStatus('live'); updatePlayBtns(); });

  // Search
  const searchEl = document.getElementById('search-m');
  let timer;
  searchEl.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => loadStreams(searchEl.value.trim()), 350);
  });
}

function togglePlay() {
  if (isPlaying) pauseMobileAudio();
  else {
    if (!audio.src && streams.length > 0) loadStream(currentIndex);
    else playMobileAudio();
  }
}

function prevStream() {
  currentIndex = (currentIndex - 1 + streams.length) % streams.length;
  loadStream(currentIndex);
}
function nextStream() {
  currentIndex = (currentIndex + 1) % streams.length;
  loadStream(currentIndex);
}

// ─── VOLUME ─────────────────────────────────────────────────
// IMPORTANT: Volume slider uses stopPropagation to prevent triggering swipe handlers
function setupVolume() {
  const slider = document.getElementById('vol-slider-m');
  const pct = document.getElementById('vol-pct-m');

  if (!slider) return;
  slider.value = 80;
  audio.volume = 0.8;
  if (pct) pct.textContent = '80%';

  slider.addEventListener('input', (e) => {
    const v = slider.value / 100;
    audio.volume = v;
    if (pct) pct.textContent = slider.value + '%';
  });

  // CRITICAL: Prevent touch events on slider from bubbling to swipe handler
  slider.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: true });
  slider.addEventListener('touchmove', (e) => { e.stopPropagation(); }, { passive: true });
  slider.addEventListener('touchend', (e) => { e.stopPropagation(); });
}

// ─── SWIPE GESTURE (Player Bar) ─────────────────────────────
function setupSwipe() {
  const playerBar = document.getElementById('player-bar-m');
  let startX = 0, startY = 0;
  let isSwiping = false;
  const THRESHOLD = 80;
  const VERTICAL_THRESHOLD = 50;

  playerBar.addEventListener('touchstart', (e) => {
    // Don't handle swipe if touch starts on volume slider or controls
    if (e.target.closest('.player-volume-m') || e.target.closest('.mini-controls')) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isSwiping = false;
  }, { passive: true });

  playerBar.addEventListener('touchmove', (e) => {
    if (e.target.closest('.player-volume-m')) return;
    const dx = e.touches[0].clientX - startX;
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (dy > VERTICAL_THRESHOLD) return; // vertical scroll, ignore
    if (Math.abs(dx) > 15) isSwiping = true;
  }, { passive: true });

  playerBar.addEventListener('touchend', (e) => {
    if (e.target.closest('.player-volume-m') || !isSwiping) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = Math.abs(e.changedTouches[0].clientY - startY);
    if (dy > VERTICAL_THRESHOLD) return;
    if (dx < -THRESHOLD) nextStream();
    else if (dx > THRESHOLD) prevStream();
    isSwiping = false;
  });
}

// ─── MODAL DRAG ──────────────────────────────────────────────
function setupModalDrag() {
  const modal = document.getElementById('player-modal-m');
  const handle = document.getElementById('modal-drag-handle');
  let startY = 0;
  let isDragging = false;

  handle.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  handle.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0) modal.style.transform = `translateY(${dy}px)`;
  }, { passive: true });

  handle.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const dy = e.changedTouches[0].clientY - startY;
    if (dy > 100) {
      closePlayerModal();
    } else {
      modal.style.transform = '';
    }
  });
}

// ─── PLAYER MODAL ────────────────────────────────────────────
function openPlayerModal() {
  const modal = document.getElementById('player-modal-m');
  modal.style.transform = '';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closePlayerModal() {
  const modal = document.getElementById('player-modal-m');
  modal.classList.remove('open');
  modal.style.transform = '';
  document.body.style.overflow = '';
}

// ─── EQUALIZER MOBILE ────────────────────────────────────────
function setupEqualizer() {
  const bands = [
    { id: 'eq-bass-m', valId: 'eq-val-bass-m', method: 'setBass' },
    { id: 'eq-mid-m', valId: 'eq-val-mid-m', method: 'setMid' },
    { id: 'eq-treble-m', valId: 'eq-val-treble-m', method: 'setTreble' },
    { id: 'eq-presence-m', valId: 'eq-val-presence-m', method: 'setPresence' }
  ];

  bands.forEach(band => {
    const slider = document.getElementById(band.id);
    const val = document.getElementById(band.valId);
    if (!slider) return;
    slider.value = 0;
    if (val) val.textContent = '0';

    slider.addEventListener('input', (e) => {
      e.stopPropagation();
      const db = parseInt(slider.value);
      if (val) val.textContent = (db >= 0 ? '+' : '') + db;
      if (eq && eq.initialized) eq[band.method](db);
    });

    // Prevent swipe on EQ sliders
    slider.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    slider.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
    slider.addEventListener('touchend', e => e.stopPropagation());
  });

  // Reverb
  const revSlider = document.getElementById('reverb-m');
  const revVal = document.getElementById('rev-val-m');
  if (revSlider) {
    revSlider.value = 0;
    if (revVal) revVal.textContent = '0%';
    revSlider.addEventListener('input', (e) => {
      e.stopPropagation();
      const v = revSlider.value / 100;
      if (revVal) revVal.textContent = revSlider.value + '%';
      if (eq && eq.initialized) eq.setReverb(v);
    });
    revSlider.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    revSlider.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
    revSlider.addEventListener('touchend', e => e.stopPropagation());
  }

  // Presets
  document.querySelectorAll('.preset-btn-m').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      document.querySelectorAll('.preset-btn-m').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (!eq || !eq.initialized) { showToast('Putar stream dulu', 'info'); return; }
      const p = eq.applyPreset(preset);
      if (p && revSlider && revVal) {
        revSlider.value = Math.round(p.reverb * 100);
        revVal.textContent = revSlider.value + '%';
      }
      showToast(`Preset: ${preset}`, 'success');
    });
  });
}

// ─── ABOUT MOBILE ────────────────────────────────────────────
async function loadAboutMobile() {
  try {
    aboutData = await loadAbout();
    const container = document.getElementById('about-links-m');
    renderAboutLinksMobile(aboutData, container);
  } catch (e) {}
}
