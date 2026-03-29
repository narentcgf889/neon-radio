/* ═══════════════════════════════════════════════
   NEON RADIO - COMMON UTILITIES
   ═══════════════════════════════════════════════ */

// ─── CLOCK ─────────────────────────────────────────────────
function initClock(elementId) {
  function update() {
    const el = document.getElementById(elementId);
    if (!el) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
  }
  update();
  setInterval(update, 1000);
}

// ─── BATTERY ────────────────────────────────────────────────
function initBattery(opts = {}) {
  const { fillId, percentId, iconId, wrapId } = opts;
  function updateUI(battery) {
    const pct = Math.round(battery.level * 100);
    const charging = battery.charging;
    if (percentId) {
      const el = document.getElementById(percentId);
      if (el) el.textContent = `${pct}%`;
    }
    if (fillId) {
      const fill = document.getElementById(fillId);
      if (fill) {
        fill.style.width = `${pct}%`;
        fill.className = 'battery-fill' + (pct <= 20 ? ' low' : '') + (charging ? ' charging' : '');
      }
    }
    if (iconId) {
      const icon = document.getElementById(iconId);
      if (icon) {
        if (charging) icon.textContent = '🔋⚡';
        else if (pct <= 20) icon.textContent = '🪫';
        else icon.textContent = '🔋';
      }
    }
    if (wrapId) {
      const wrap = document.getElementById(wrapId);
      if (wrap) {
        const pspan = wrap.querySelector('.batt-pct');
        if (pspan) pspan.textContent = `${pct}%`;
        const ichg = wrap.querySelector('.batt-charging');
        if (ichg) ichg.textContent = charging ? ' ⚡' : '';
      }
    }
  }
  if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
      updateUI(battery);
      battery.addEventListener('levelchange', () => updateUI(battery));
      battery.addEventListener('chargingchange', () => updateUI(battery));
    }).catch(() => {});
  } else {
    if (percentId) { const el = document.getElementById(percentId); if (el) el.textContent = 'N/A'; }
  }
}

// ─── TOAST NOTIFICATIONS ────────────────────────────────────
function createToastSystem(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const iconMap = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  return function showToast(msg, type = 'info', title = '', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${iconMap[type] || 'ℹ️'}</div>
      <div class="toast-body">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-msg">${msg}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
  };
}

function createMobileToast(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const iconMap = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  return function showToast(msg, type = 'info', duration = 3000) {
    const item = document.createElement('div');
    item.className = `toast-m-item ${type}`;
    item.innerHTML = `<span>${iconMap[type]}</span> <span>${msg}</span>`;
    container.appendChild(item);
    setTimeout(() => item.remove(), duration);
  };
}

function createAdminToast(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const iconMap = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  return function showToast(msg, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast-a ${type}`;
    toast.innerHTML = `<span>${iconMap[type]}</span> <span style="flex:1">${msg}</span> <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#7070aa;cursor:pointer;font-size:14px">✕</button>`;
    container.appendChild(toast);
    if (duration > 0) setTimeout(() => toast.remove(), duration);
  };
}

// ─── AUDIO CONTEXT + EQUALIZER ──────────────────────────────
class AudioEqualizer {
  constructor(audioElement) {
    this.audio = audioElement;
    this.ctx = null;
    this.source = null;
    this.bass = null;
    this.mid = null;
    this.treble = null;
    this.presence = null;
    this.convolver = null;
    this.reverbGain = null;
    this.dryGain = null;
    this.masterGain = null;
    this.initialized = false;
    this.reverbAmount = 0;
    this.impulseBuffer = null;
  }

  async init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.source = this.ctx.createMediaElementSource(this.audio);

      // Filter chain
      this.bass = this.ctx.createBiquadFilter();
      this.bass.type = 'lowshelf';
      this.bass.frequency.value = 120;

      this.mid = this.ctx.createBiquadFilter();
      this.mid.type = 'peaking';
      this.mid.frequency.value = 1000;
      this.mid.Q.value = 0.8;

      this.treble = this.ctx.createBiquadFilter();
      this.treble.type = 'highshelf';
      this.treble.frequency.value = 4000;

      this.presence = this.ctx.createBiquadFilter();
      this.presence.type = 'peaking';
      this.presence.frequency.value = 6000;
      this.presence.Q.value = 1.5;

      this.masterGain = this.ctx.createGain();
      this.dryGain = this.ctx.createGain();
      this.reverbGain = this.ctx.createGain();
      this.convolver = this.ctx.createConvolver();

      // Create impulse response for reverb
      this.impulseBuffer = this._createImpulse(2.5, 3.5);
      this.convolver.buffer = this.impulseBuffer;

      // Connect: source -> bass -> mid -> treble -> presence -> masterGain
      //         masterGain -> dryGain -> destination
      //         masterGain -> convolver -> reverbGain -> destination
      this.source.connect(this.bass);
      this.bass.connect(this.mid);
      this.mid.connect(this.treble);
      this.treble.connect(this.presence);
      this.presence.connect(this.masterGain);

      this.masterGain.connect(this.dryGain);
      this.masterGain.connect(this.convolver);

      this.dryGain.connect(this.ctx.destination);
      this.convolver.connect(this.reverbGain);
      this.reverbGain.connect(this.ctx.destination);

      this.dryGain.gain.value = 1;
      this.reverbGain.gain.value = 0;

      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext init failed:', e);
    }
  }

  _createImpulse(duration, decay) {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buf = this.ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buf;
  }

  setBass(db) { if (this.bass) this.bass.gain.value = db; }
  setMid(db) { if (this.mid) this.mid.gain.value = db; }
  setTreble(db) { if (this.treble) this.treble.gain.value = db; }
  setPresence(db) { if (this.presence) this.presence.gain.value = db; }

  setReverb(amount) {
    if (!this.reverbGain || !this.dryGain) return;
    this.reverbAmount = Math.max(0, Math.min(1, amount));
    this.reverbGain.gain.value = this.reverbAmount;
    this.dryGain.gain.value = 1 - (this.reverbAmount * 0.5);
  }

  applyPreset(preset) {
    const presets = {
      flat:     { bass: 0, mid: 0, treble: 0, presence: 0, reverb: 0 },
      bass:     { bass: 8, mid: -2, treble: -1, presence: 0, reverb: 0 },
      vocal:    { bass: -2, mid: 4, treble: 3, presence: 2, reverb: 0.1 },
      rock:     { bass: 5, mid: -3, treble: 6, presence: 4, reverb: 0.05 },
      jazz:     { bass: 3, mid: 1, treble: -2, presence: -1, reverb: 0.2 },
      pop:      { bass: 2, mid: 3, treble: 4, presence: 3, reverb: 0.05 },
      classical:{ bass: 1, mid: 0, treble: 2, presence: 1, reverb: 0.35 },
      electronic:{ bass: 7, mid: -2, treble: 5, presence: 3, reverb: 0.1 },
      lofi:     { bass: 4, mid: 2, treble: -6, presence: -4, reverb: 0.25 },
      concert:  { bass: 3, mid: 1, treble: 2, presence: 2, reverb: 0.5 }
    };
    const p = presets[preset] || presets.flat;
    this.setBass(p.bass);
    this.setMid(p.mid);
    this.setTreble(p.treble);
    this.setPresence(p.presence);
    this.setReverb(p.reverb);
    return p;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }
}

// ─── API HELPERS ─────────────────────────────────────────────
async function apiGet(url) {
  const res = await fetch(url);
  return res.json();
}
async function apiPost(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}
async function apiDelete(url) {
  const res = await fetch(url, { method: 'DELETE' });
  return res.json();
}
async function apiPut(url, data) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

// ─── ABOUT DATA LOADER ──────────────────────────────────────
async function loadAbout() {
  const data = await apiGet('/api/settings');
  return data.about || {};
}

// ─── SOCIAL ICON MAP ────────────────────────────────────────
const SOCIAL_ICONS = {
  tiktok: { icon: '🎵', label: 'TikTok' },
  whatsapp: { icon: '💬', label: 'WhatsApp' },
  discord: { icon: '🎮', label: 'Discord' },
  instagram: { icon: '📸', label: 'Instagram' },
  twitter: { icon: '🐦', label: 'Twitter / X' },
  youtube: { icon: '▶️', label: 'YouTube' },
  telegram: { icon: '✈️', label: 'Telegram' },
  facebook: { icon: '👥', label: 'Facebook' },
  github: { icon: '💻', label: 'GitHub' },
  email: { icon: '📧', label: 'Email' }
};

function renderAboutLinks(about, containerEl, linkClass) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
  Object.entries(about).forEach(([key, url]) => {
    if (!url) return;
    const s = SOCIAL_ICONS[key];
    if (!s) return;
    const href = key === 'email' ? `mailto:${url}` : url;
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = linkClass;
    a.innerHTML = `<span class="al-icon">${s.icon}</span><span class="al-name">${s.label}</span><span class="al-val">${url.replace('https://','').replace('http://','')}</span>`;
    containerEl.appendChild(a);
  });
}

function renderAboutLinksMobile(about, containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
  Object.entries(about).forEach(([key, url]) => {
    if (!url) return;
    const s = SOCIAL_ICONS[key];
    if (!s) return;
    const href = key === 'email' ? `mailto:${url}` : url;
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'about-link-m';
    a.innerHTML = `<span>${s.icon}</span><span>${s.label}</span>`;
    containerEl.appendChild(a);
  });
}

// ─── FORMAT BYTES ────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

// ─── FORMAT TIME ────────────────────────────────────────────
function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('id-ID');
}
