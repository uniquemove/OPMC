@echo off
title OPM Backend API (Port 5000)
cd /d "%~dp0backend"

echo ========================================================
echo [2/3] ONE PUNCH MAN - BACKEND API
echo Dang chay tren: http://localhost:5000
echo ========================================================
echo.

npm run dev

echo.
echo ========================================================
echo [THONG BAO] Backend API da dung.
echo ========================================================
pause
