@echo off
title OPM AI Service (Port 8000)
cd /d "%~dp0ai-service"

echo ========================================================
echo [1/3] ONE PUNCH MAN - AI SERVICE
echo Dang chay tren: http://localhost:8000
echo ========================================================
echo.

if not exist "venv\Scripts\python.exe" (
    echo [LOI] Khong tim thay venv\Scripts\python.exe!
    pause
    exit /b 1
)

set PYTHONIOENCODING=utf-8
.\venv\Scripts\python.exe main.py

echo.
echo ========================================================
echo [THONG BAO] AI Service da dung.
echo ========================================================
pause
