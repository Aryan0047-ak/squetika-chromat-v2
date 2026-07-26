@echo off
title Squetika Chromat Demo v2.0
echo ============================================
echo   Squetika Chromat Demo v2.0
echo   21 CFR Part 11 ^| EU Annex 11 ^| GAMP 5
echo ============================================
echo.

:: Start backend
echo [1/2] Starting backend server...
start "Squetika Backend" cmd /c "cd /d "%~dp0backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000"
timeout /t 4 /nobreak >nul

:: Install frontend deps if needed
if not exist "%~dp0frontend\node_modules" (
    echo [*] Installing frontend dependencies...
    cd /d "%~dp0frontend"
    call npm install
)

:: Start frontend
echo [2/2] Starting frontend dev server...
start "Squetika Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo   Demo is starting up!
echo.
echo   Backend API:  http://localhost:8000
echo   Frontend:     http://localhost:5173
echo   Health:       http://localhost:8000/api/v1/health
echo.
echo   Demo Credentials:
echo     admin@squetika.com   / Admin@123    (Full access)
echo     qa@squetika.com      / QaDemo@123   (QA Manager)
echo     reviewer@squetika.com / Review@123  (Reviewer)
echo     analyst@squetika.com  / Analyst@123 (Analyst)
echo.
echo   Close the terminal windows to stop.
echo ============================================
pause
