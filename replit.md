# Neon Radio

A full-featured Icecast stream radio player with neon theme.

## Architecture

- **Backend**: Node.js + Express (`server.js`) on port 5000
- **Database**: JSON files in `data/` directory (no external DB)
- **Frontend**: Pure HTML/CSS/JS, 3 views

## Pages

| Path | Description |
|------|-------------|
| `/` | Desktop player (redirects to mobile on phones) |
| `/mobile.html` | Mobile player |
| `/admin.html` | Admin panel (login required) |

## Default Admin Credentials
- **Username**: admin
- **Password**: admin123

## File Structure

```
├── server.js           # Express backend
├── index.html          # Desktop player
├── mobile.html         # Mobile player
├── admin.html          # Admin panel
├── css/
│   ├── style.css       # Desktop styles
│   ├── mobile.css      # Mobile styles
│   └── admin.css       # Admin styles
├── js/
│   ├── common.js       # Shared utils (clock, battery, toast, AudioEqualizer, API)
│   ├── app.js          # Desktop logic
│   ├── mobile.js       # Mobile logic
│   └── admin.js        # Admin logic
├── data/
│   ├── streams.json    # Radio stream URLs
│   └── db.json         # Users, settings, about, notifications
├── uploads/            # File manager uploads
├── run.bat             # Windows run script
└── run.sh              # Linux/Termux run script
```

## Features

### Desktop Player
- Neon theme with glowing effects
- Vinyl disc animation
- 8 default streams (configurable via admin)
- Search streams
- Equalizer (Bass, Mid, Treble, Presence) with Web Audio API
- Reverb effect (convolver node)
- 10 EQ presets
- Clock + Battery status
- Notification bell
- About panel with social media links
- Mobile redirect

### Mobile Player
- Full-screen stream list
- Bottom mini player bar
- Expanded player modal (tap vinyl/track name)
- Swipe left/right on player bar to change stream
- Volume slider isolated from swipe gestures (touch events stopped)
- Equalizer + reverb in expanded modal
- About section with social media links
- Clock + Battery

### Admin Panel
- Login form: URL Icecast, username, password, source password
- Dashboard with stats and recent notifications
- Stream management (CRUD)
- Icecast server management
- Notification panel (with error/warning/info/success types)
- File Manager (neovim-style editor, image/video/audio preview)
- User management
- Settings
- About & social media editor

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/login | Login |
| POST | /api/logout | Logout |
| GET | /api/check-auth | Check auth status |
| GET | /api/streams | Get all streams |
| POST | /api/streams | Add stream (auth) |
| PUT | /api/streams/:id | Update stream (auth) |
| DELETE | /api/streams/:id | Delete stream (auth) |
| GET | /api/icecast | Get Icecast servers (auth) |
| POST | /api/icecast | Add Icecast server (auth) |
| DELETE | /api/icecast/:id | Delete server (auth) |
| GET | /api/notifications | Get notifications (auth) |
| POST | /api/notifications/read-all | Mark all read (auth) |
| DELETE | /api/notifications | Clear all (auth) |
| GET | /api/files | List files (auth) |
| GET | /api/file | Read file (auth) |
| POST | /api/file | Write file (auth) |
| DELETE | /api/file | Delete file (auth) |
| POST | /api/upload | Upload files (auth) |
| GET | /api/settings | Get settings & about |
| POST | /api/settings | Save settings & about (auth) |
| GET | /api/users | List users (auth) |
| POST | /api/users | Add user (auth) |
| DELETE | /api/users/:id | Delete user (auth) |

## Running Locally (Termux/Linux)
```bash
bash run.sh
```

## Running Locally (Windows)
```
run.bat
```
