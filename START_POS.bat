@echo off
title Semesta POS
echo ==========================================
echo   SEMESTA POS - Semesta Plastik
echo ==========================================
echo.
echo Memulai server...
echo Buka browser di: http://localhost:3000
echo.
echo Jangan tutup jendela ini selama POS digunakan.
echo Untuk berhenti, tekan Ctrl+C
echo.
start "" "http://localhost:3000"
timeout /t 2 /nobreak >nul
npm run dev
pause
