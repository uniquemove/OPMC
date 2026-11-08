@echo off
title ONE PUNCH MAN CHALLENGE - LAUNCHER
cd /d "%~dp0"

echo ========================================================
echo       ONE PUNCH MAN CHALLENGE - KHOI DONG HE THONG
echo ========================================================
echo.
echo [1/3] Dang mo Python AI Service (Port 8000)...
start "OPM AI Service" cmd /k "%~dp0run-ai.bat"

ping 127.0.0.1 -n 3 > nul

echo [2/3] Dang mo Node.js Backend API (Port 5000)...
start "OPM Backend API" cmd /k "%~dp0run-backend.bat"

ping 127.0.0.1 -n 3 > nul

echo [3/3] Dang mo React Frontend (Port 3000)...
start "OPM Frontend" cmd /k "%~dp0run-frontend.bat"

ping 127.0.0.1 -n 3 > nul

echo.
echo ========================================================
echo [OK] Ca 3 cua so dich vu da duoc bat thanh cong!
echo Dang mo trinh duyet tai http://localhost:3000 ...
echo ========================================================
start http://localhost:3000

echo.
echo Giu nguyen cac cua so terminal dang chay de he thong hoat dong.
echo Ban co the an cua so nay hoac dong no sau khi he thong da len.
pause
