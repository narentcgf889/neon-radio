const express = require('express');
const session = require('express-session');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const STREAMS_PATH = path.join(__dirname, 'data', 'streams.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = req.query.path ? path.join(UPLOAD_DIR, req.query.path) : UPLOAD_DIR;
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'neon-radio-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 86400000 }
}));
app.use(express.static(__dirname));

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}
function readStreams() {
  return JSON.parse(fs.readFileSync(STREAMS_PATH, 'utf8'));
}
function writeStreams(data) {
  fs.writeFileSync(STREAMS_PATH, JSON.stringify(data, null, 2));
}

function addNotification(type, message, detail = '') {
  const db = readDB();
  db.notifications.unshift({
    id: Date.now(),
    type,
    message,
    detail,
    timestamp: new Date().toISOString(),
    read: false
  });
  if (db.notifications.length > 100) db.notifications = db.notifications.slice(0, 100);
  writeDB(db);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ success: false, message: 'Unauthorized' });
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) {
    addNotification('error', 'Login gagal', `Percobaan login dari user: ${username}`);
    return res.json({ success: false, message: 'Username atau password salah' });
  }
  req.session.user = { id: user.id, username: user.username, role: user.role };
  addNotification('info', 'Login berhasil', `User ${username} login`);
  res.json({ success: true, user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  const username = req.session.user ? req.session.user.username : 'unknown';
  req.session.destroy();
  addNotification('info', 'Logout', `User ${username} logout`);
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ success: true, user: req.session.user });
  } else {
    res.json({ success: false });
  }
});

// ─── STREAMS ─────────────────────────────────────────────────────────────────
app.get('/api/streams', (req, res) => {
  const streams = readStreams();
  const q = req.query.q ? req.query.q.toLowerCase() : '';
  const filtered = q ? streams.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.genre.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q)
  ) : streams;
  res.json(filtered);
});

app.post('/api/streams', requireAuth, (req, res) => {
  const streams = readStreams();
  const newStream = { ...req.body, id: Date.now() };
  streams.push(newStream);
  writeStreams(streams);
  addNotification('success', 'Stream ditambahkan', `Stream: ${newStream.name}`);
  res.json({ success: true, stream: newStream });
});

app.put('/api/streams/:id', requireAuth, (req, res) => {
  const streams = readStreams();
  const idx = streams.findIndex(s => s.id == req.params.id);
  if (idx === -1) return res.json({ success: false, message: 'Stream tidak ditemukan' });
  streams[idx] = { ...streams[idx], ...req.body };
  writeStreams(streams);
  addNotification('success', 'Stream diperbarui', `Stream: ${streams[idx].name}`);
  res.json({ success: true, stream: streams[idx] });
});

app.delete('/api/streams/:id', requireAuth, (req, res) => {
  let streams = readStreams();
  const stream = streams.find(s => s.id == req.params.id);
  streams = streams.filter(s => s.id != req.params.id);
  writeStreams(streams);
  addNotification('warning', 'Stream dihapus', `Stream: ${stream ? stream.name : req.params.id}`);
  res.json({ success: true });
});

// ─── ICECAST SERVERS ─────────────────────────────────────────────────────────
app.get('/api/icecast', requireAuth, (req, res) => {
  const db = readDB();
  res.json(db.icecast_servers || []);
});

app.post('/api/icecast', requireAuth, (req, res) => {
  const db = readDB();
  const { icecast_url, username, password, source_password, name } = req.body;
  if (!icecast_url) return res.json({ success: false, message: 'URL Icecast diperlukan' });
  const server = { id: Date.now(), name: name || 'Icecast Server', icecast_url, username, password, source_password, connected: false, added: new Date().toISOString() };
  db.icecast_servers.push(server);
  writeDB(db);
  addNotification('success', 'Icecast server ditambahkan', `Server: ${icecast_url}`);
  res.json({ success: true, server });
});

app.delete('/api/icecast/:id', requireAuth, (req, res) => {
  const db = readDB();
  db.icecast_servers = (db.icecast_servers || []).filter(s => s.id != req.params.id);
  writeDB(db);
  addNotification('warning', 'Icecast server dihapus', `ID: ${req.params.id}`);
  res.json({ success: true });
});

// ─── SETTINGS & ABOUT ────────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const db = readDB();
  res.json({ settings: db.settings, about: db.about });
});

app.post('/api/settings', requireAuth, (req, res) => {
  const db = readDB();
  if (req.body.settings) db.settings = { ...db.settings, ...req.body.settings };
  if (req.body.about) db.about = { ...db.about, ...req.body.about };
  writeDB(db);
  addNotification('success', 'Pengaturan disimpan', '');
  res.json({ success: true });
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
app.get('/api/notifications', requireAuth, (req, res) => {
  const db = readDB();
  res.json(db.notifications || []);
});

app.post('/api/notifications/read-all', requireAuth, (req, res) => {
  const db = readDB();
  db.notifications = (db.notifications || []).map(n => ({ ...n, read: true }));
  writeDB(db);
  res.json({ success: true });
});

app.delete('/api/notifications', requireAuth, (req, res) => {
  const db = readDB();
  db.notifications = [];
  writeDB(db);
  res.json({ success: true });
});

// ─── FILE MANAGER ─────────────────────────────────────────────────────────────
function safeResolvePath(reqPath) {
  const base = UPLOAD_DIR;
  const resolved = path.resolve(base, reqPath || '');
  if (!resolved.startsWith(base)) throw new Error('Path tidak aman');
  return resolved;
}

app.get('/api/files', requireAuth, (req, res) => {
  try {
    const dir = safeResolvePath(req.query.path || '');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const items = fs.readdirSync(dir).map(name => {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      const ext = path.extname(name).toLowerCase();
      let type = 'file';
      if (stat.isDirectory()) type = 'dir';
      else if (['.jpg','.jpeg','.png','.gif','.webp','.svg','.bmp'].includes(ext)) type = 'image';
      else if (['.mp4','.webm','.ogg','.mov','.avi'].includes(ext)) type = 'video';
      else if (['.mp3','.wav','.flac','.aac','.m4a','.ogg'].includes(ext)) type = 'audio';
      else if (['.txt','.js','.css','.html','.json','.md','.py','.sh','.bat','.xml','.yaml','.yml','.ts','.jsx','.tsx','.php','.sql','.env','.ini','.conf','.log'].includes(ext)) type = 'text';
      return { name, type, size: stat.size, modified: stat.mtime, ext };
    });
    const relPath = path.relative(UPLOAD_DIR, dir);
    res.json({ items, path: relPath || '' });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

app.get('/api/file', requireAuth, (req, res) => {
  try {
    const filePath = safeResolvePath(req.query.path || '');
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ success: true, content });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

app.post('/api/file', requireAuth, (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    const resolved = safeResolvePath(filePath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content || '', 'utf8');
    addNotification('success', 'File disimpan', filePath);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

app.post('/api/mkdir', requireAuth, (req, res) => {
  try {
    const { path: dirPath } = req.body;
    const resolved = safeResolvePath(dirPath);
    fs.mkdirSync(resolved, { recursive: true });
    addNotification('success', 'Folder dibuat', dirPath);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

app.delete('/api/file', requireAuth, (req, res) => {
  try {
    const filePath = safeResolvePath(req.query.path || '');
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      fs.rmdirSync(filePath, { recursive: true });
    } else {
      fs.unlinkSync(filePath);
    }
    addNotification('warning', 'File/folder dihapus', req.query.path);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

app.post('/api/upload', requireAuth, upload.array('files'), (req, res) => {
  const files = req.files.map(f => f.originalname);
  addNotification('success', 'File diupload', files.join(', '));
  res.json({ success: true, files });
});

app.get('/api/file-stream', requireAuth, (req, res) => {
  try {
    const filePath = safeResolvePath(req.query.path || '');
    res.sendFile(filePath);
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// ─── USERS ────────────────────────────────────────────────────────────────────
app.get('/api/users', requireAuth, (req, res) => {
  const db = readDB();
  res.json(db.users.map(u => ({ id: u.id, username: u.username, role: u.role, created: u.created })));
});

app.post('/api/users', requireAuth, (req, res) => {
  const db = readDB();
  const { username, password, role } = req.body;
  if (db.users.find(u => u.username === username)) {
    return res.json({ success: false, message: 'Username sudah digunakan' });
  }
  const user = { id: Date.now(), username, password, role: role || 'user', created: new Date().toISOString() };
  db.users.push(user);
  writeDB(db);
  addNotification('success', 'User dibuat', `Username: ${username}`);
  res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
});

app.delete('/api/users/:id', requireAuth, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id == req.params.id);
  if (user && user.username === 'admin') return res.json({ success: false, message: 'Tidak bisa hapus admin utama' });
  db.users = db.users.filter(u => u.id != req.params.id);
  writeDB(db);
  addNotification('warning', 'User dihapus', `ID: ${req.params.id}`);
  res.json({ success: true });
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎵 Neon Radio Server running on http://0.0.0.0:${PORT}`);
  console.log(`   Desktop  : http://localhost:${PORT}/`);
  console.log(`   Mobile   : http://localhost:${PORT}/mobile.html`);
  console.log(`   Admin    : http://localhost:${PORT}/admin.html\n`);
});
