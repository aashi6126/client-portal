@echo off
REM ==========================================================================
REM Client Portal - Start Services
REM ==========================================================================
REM Usage: start-all.bat
REM   Starts the API server and backup scheduler.
REM
REM Prerequisites:
REM   - Python 3.9+ with venv at services\venv
REM   - React app built: cd webapp\customer-app && npm run build
REM   - config.env in project root (copy from config.env.example)
REM ==========================================================================

setlocal enabledelayedexpansion

echo =============================================
echo   Client Portal - Starting Services
echo =============================================
echo.

REM --- Check for running instances ---
if exist "%~dp0.pids" (
    echo WARNING: Services may already be running.
    echo Run stop-all.bat first, or delete .pids file if stale.
    echo.
    pause
    exit /b 1
)

REM --- Load config from config.env ---
echo [DEBUG] Step 1: Checking config.env...
if not exist "%~dp0config.env" goto :no_config
echo [DEBUG] Step 2: config.env found, loading...
for /f "usebackq eol=# delims=" %%a in ("%~dp0config.env") do set "%%a"
echo [DEBUG] Step 3: config loaded
goto :done_config
:no_config
echo [!!] WARNING: config.env not found. Using default settings.
echo     Copy config.env.example to config.env and edit for your environment.
echo.
:done_config

echo [DEBUG] Step 4: Create directories...
REM --- Create directories if needed ---
if defined BACKUP_DIR (
    if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
)
if not exist "%~dp0backups" mkdir "%~dp0backups"

echo [DEBUG] Step 5: Check Python venv...
REM --- Check Python venv ---
if not exist "%~dp0services\venv\Scripts\python.exe" (
    echo [!!] ERROR: Python venv not found at services\venv
    echo     Run: python -m venv services\venv
    echo     Then: services\venv\Scripts\activate ^&^& pip install -r services\requirements.txt
    pause
    exit /b 1
)

set "PYTHON=%~dp0services\venv\Scripts\python.exe"

echo [DEBUG] Step 6: Check React build...
REM --- Build React app (so Flask can serve it on port 5000) ---
if not exist "%~dp0webapp\customer-app\package.json" goto :skip_build
if exist "%~dp0webapp\customer-app\build\index.html" echo [OK] React build found && goto :skip_build
echo [..] Building React app...
pushd "%~dp0webapp\customer-app"
call npm run build
popd
if exist "%~dp0webapp\customer-app\build\index.html" echo [OK] React app built successfully
if not exist "%~dp0webapp\customer-app\build\index.html" echo [!!] WARNING: React build failed.
:skip_build
echo [DEBUG] Step 7: Starting services...

REM --- Start API server ---
echo [..] Starting API server...
start "ClientPortal-API" /min cmd /c "cd /d %~dp0 && "%PYTHON%" services\api\customer_api.py"

REM Get the PID of the cmd window we just launched
timeout /t 2 /nobreak >nul

REM Find the python process for customer_api
for /f "tokens=2" %%p in ('tasklist /fi "WINDOWTITLE eq ClientPortal-API*" /fo list 2^>nul ^| findstr "PID:"') do (
    set "API_PID=%%p"
)

REM Also find python.exe running customer_api
for /f "tokens=2" %%p in ('wmic process where "commandline like '%%customer_api%%' and name='python.exe'" get processid /format:value 2^>nul ^| findstr "="') do (
    set "API_PYTHON_PID=%%p"
)

echo [OK] API server started

REM --- Wait for API to be ready ---
echo [..] Waiting for API to be ready...
timeout /t 3 /nobreak >nul
echo [OK] API ready at http://localhost:%API_PORT%

REM --- Start backup scheduler ---
echo [..] Starting backup scheduler...
start "ClientPortal-Backup" /min cmd /c "cd /d %~dp0 && "%PYTHON%" services\backup_scheduler.py"

timeout /t 1 /nobreak >nul

for /f "tokens=2" %%p in ('tasklist /fi "WINDOWTITLE eq ClientPortal-Backup*" /fo list 2^>nul ^| findstr "PID:"') do (
    set "BACKUP_PID=%%p"
)

for /f "tokens=2" %%p in ('wmic process where "commandline like '%%backup_scheduler%%' and name='python.exe'" get processid /format:value 2^>nul ^| findstr "="') do (
    set "BACKUP_PYTHON_PID=%%p"
)

echo [OK] Backup scheduler started (12 AM and 12 PM daily)

REM --- Start Web App (React dev server) ---
echo [..] Starting web app...
start "ClientPortal-WebApp" /min cmd /c "cd /d %~dp0webapp\customer-app && npm start"

timeout /t 2 /nobreak >nul

for /f "tokens=2" %%p in ('tasklist /fi "WINDOWTITLE eq ClientPortal-WebApp*" /fo list 2^>nul ^| findstr "PID:"') do (
    set "WEB_PID=%%p"
)

echo [OK] Web app starting at http://localhost:3000

REM --- Save PIDs to file for stop script ---
(
    echo API_PID=!API_PID!
    echo API_PYTHON_PID=!API_PYTHON_PID!
    echo BACKUP_PID=!BACKUP_PID!
    echo BACKUP_PYTHON_PID=!BACKUP_PYTHON_PID!
    echo WEB_PID=!WEB_PID!
) > "%~dp0.pids"

REM --- Default port if not set ---
if not defined API_PORT set "API_PORT=5000"

echo.
echo =============================================
echo   All services started successfully!
echo =============================================
echo.
echo   URLS:
echo     App:     http://localhost:!API_PORT!
echo     Dev:     http://localhost:3000 (React dev server)
echo.
echo   PROCESSES:
echo     API Server          PID: !API_PYTHON_PID!
echo     Backup Scheduler    PID: !BACKUP_PYTHON_PID!  (runs at 12 AM and 12 PM)
echo     Web App (React)     PID: !WEB_PID!
echo.
echo   To stop all: run stop-all.bat
echo =============================================
echo.
pause
