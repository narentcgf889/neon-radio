# 🎵 NEON RADIO

> Icecast Stream Radio Player dengan tema Neon — Desktop, Mobile & Admin Panel

![Neon Radio](https://img.shields.io/badge/Neon-Radio-00ffff?style=for-the-badge&logo=radio&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

---

## 📸 Preview

| Desktop | Mobile | Admin |
|---------|--------|-------|
| Vinyl player + Equalizer | Bottom player bar | Login + Dashboard |
| Stream list + Search | Swipe to change stream | File Manager + Editor |
| Reverb + 10 EQ Presets | Expanded modal player | Icecast server manager |

---

## ✨ Fitur

### 🖥️ Desktop
- Tema neon dengan animasi glowing
- Vinyl disc berputar saat playing
- Daftar stream dengan search
- **Equalizer 4 band** (Bass, Mid, Treble, Presence) — Web Audio API
- **Reverb effect** (Convolver Node)
- 10 preset EQ (Flat, Bass, Vocal, Rock, Jazz, Pop, Classical, Electronic, Lo-Fi, Concert)
- Visualizer animasi
- Jam digital & indikator baterai
- Notifikasi toast
- Panel About dengan semua sosial media
- Auto redirect ke versi Mobile jika diakses dari HP

### 📱 Mobile
- Stream list full-screen
- Bottom mini player bar
- Expanded player modal (tap vinyl untuk buka)
- **Swipe kiri/kanan** untuk ganti stream
- Volume slider (dipisah dari gesture swipe — bug fixed ✅)
- Equalizer + Reverb di modal
- Clock & Battery di top bar
- About & sosmed

### ⚙️ Admin Panel
- Login: URL Icecast, username, password, source password
- **Dashboard** — statistik & notifikasi terbaru
- **Stream Manager** — tambah, edit, hapus, test stream
- **Icecast Server Manager** — hubungkan server Icecast
- **Panel Notifikasi** — log error, warning, info, success
- **File Manager** — neovim-style editor + preview gambar/video/audio
- **User Manager** — tambah & hapus user
- **Settings** — pengaturan situs
- **About Editor** — edit semua link sosial media

---

## 📁 Struktur File

```
neon-radio/
├── server.js            # Backend Express.js
├── index.html           # Halaman Desktop
├── mobile.html          # Halaman Mobile
├── admin.html           # Admin Panel
│
├── css/
│   ├── style.css        # Style Desktop
│   ├── mobile.css       # Style Mobile
│   └── admin.css        # Style Admin
│
├── js/
│   ├── common.js        # Utilities bersama (clock, battery, EQ, API, toast)
│   ├── app.js           # Logika Desktop
│   ├── mobile.js        # Logika Mobile
│   └── admin.js         # Logika Admin
│
├── data/
│   ├── streams.json     # Daftar URL stream radio
│   └── db.json          # Database (users, settings, notifikasi, about)
│
├── uploads/             # Folder untuk File Manager
│
├── run.bat              # Script jalankan di Windows
├── run.sh               # Script jalankan di Termux/Linux
└── package.json         # Dependencies Node.js
```

---

## 🚀 Cara Menjalankan

### Termux (Android)
```bash
# Install Node.js dulu jika belum
pkg install nodejs

# Clone repo
git clone https://github.com/username/neon-radio.git
cd neon-radio

# Jalankan
bash run.sh
```

### Linux / VPS
```bash
git clone https://github.com/username/neon-radio.git
cd neon-radio
bash run.sh
```

### Windows
```batch
run.bat
```

### Manual
```bash
npm install
node server.js
```

Server berjalan di: **http://localhost:5000**

---

## 🌐 URL Halaman

| Halaman | URL |
|---------|-----|
| Desktop | http://localhost:5000/ |
| Mobile  | http://localhost:5000/mobile.html |
| Admin   | http://localhost:5000/admin.html |

---

## 🔐 Login Admin Default

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

> ⚠️ Ganti password di `data/db.json` setelah pertama login!

---

## 🔌 Menghubungkan Icecast

1. Buka Admin Panel → **Icecast Server**
2. Isi form:
   - **URL Icecast**: `http://server-kamu:8000`
   - **Username**: admin Icecast
   - **Password**: password admin
   - **Source Password**: password source Icecast
3. Klik **Tambah Server**

Untuk menambah stream baru:
1. Admin → **Streams** → **Tambah Stream**
2. Masukkan URL stream Icecast (contoh: `http://server:8000/stream`)

---

## 🎛️ Equalizer

| Band | Frekuensi | Fungsi |
|------|-----------|--------|
| Bass | 120 Hz | Boost/cut nada rendah |
| Mid | 1000 Hz | Boost/cut nada tengah |
| Treble | 4000 Hz | Boost/cut nada tinggi |
| Presence | 6000 Hz | Kejelasan suara |
| Reverb | — | Efek ruangan |

---

## 🗄️ Database

Data disimpan di file JSON lokal (tidak butuh database eksternal):

- `data/db.json` — users, settings, notifikasi, about/sosmed
- `data/streams.json` — daftar URL stream radio

---

## 📦 Dependencies

```json
{
  "express": "^4.18.2",
  "express-session": "^1.17.3",
  "multer": "^1.4.5-lts.1",
  "cors": "^2.8.5"
}
```

---

## 📡 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/login` | Login |
| POST | `/api/logout` | Logout |
| GET | `/api/check-auth` | Cek status login |
| GET | `/api/streams` | Ambil semua stream |
| POST | `/api/streams` | Tambah stream |
| PUT | `/api/streams/:id` | Edit stream |
| DELETE | `/api/streams/:id` | Hapus stream |
| GET | `/api/icecast` | Daftar Icecast server |
| POST | `/api/icecast` | Tambah server |
| GET | `/api/notifications` | Ambil notifikasi |
| GET | `/api/files` | List file manager |
| POST | `/api/file` | Simpan file |
| POST | `/api/upload` | Upload file |
| GET | `/api/settings` | Ambil settings & about |
| POST | `/api/settings` | Simpan settings & about |

---

## 📱 Sosial Media

Semua link sosmed bisa diubah lewat **Admin → About & Sosial Media**

---

## 📄 Lisensi

MIT License — bebas digunakan dan dimodifikasi.
