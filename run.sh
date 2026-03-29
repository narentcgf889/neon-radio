#!/bin/bash
# ─── NEON RADIO SERVER (Termux / Linux) ───────────────────────

echo ""
echo " ======================================"
echo "  NEON RADIO - Server Startup (Termux)"
echo " ======================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo " [ERROR] Node.js tidak ditemukan!"
  echo " Termux: pkg install nodejs"
  echo " Linux : sudo apt install nodejs npm"
  exit 1
fi

echo " Node.js: $(node --version)"
echo " NPM    : $(npm --version)"
echo ""

# Install dependencies
if [ ! -d "node_modules/express" ]; then
  echo " Menginstall dependencies..."
  npm install
  echo ""
fi

# Create required directories
mkdir -p data uploads

echo " Menjalankan server..."
echo ""
echo " Desktop  : http://localhost:5000/"
echo " Mobile   : http://localhost:5000/mobile.html"
echo " Admin    : http://localhost:5000/admin.html"
echo ""
echo " Tekan Ctrl+C untuk berhenti"
echo ""

node server.js
