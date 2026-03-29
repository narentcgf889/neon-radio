@echo off
title Neon Radio Server

echo.
echo  ======================================
echo   NEON RADIO - Server Startup (Windows)
echo  ======================================
echo.

:: Check Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js tidak ditemukan!
  echo Download dari: https://nodejs.org
  pause
  exit /b 1
)

:: Show Node version
for /f "tokens=*" %%i in ('node --version') do echo  Node.js: %%i
echo.

:: Install dependencies if needed
if not exist "node_modules\express" (
  echo  Menginstall dependencies...
  npm install
  echo.
)

:: Create directories
if not exist "data" mkdir data
if not exist "uploads" mkdir uploads

echo  Menjalankan server...
echo  Desktop  : http://localhost:5000/
echo  Mobile   : http://localhost:5000/mobile.html
echo  Admin    : http://localhost:5000/admin.html
echo.
echo  Tekan Ctrl+C untuk berhenti
echo.

node server.js
pause
