@echo off
REM ==========================================================================
REM Client Portal - Windows Startup Script
REM ==========================================================================
REM Usage: start-all.bat
REM   Starts the API server (which also serves the React build) and the
REM   backup scheduler.
REM
REM Prerequisites:
REM   - Python 3.9+ with venv at services\venv
REM   - React app built: cd webapp\customer-app && npm run build
REM   - config.env in project root (copy from config.env.example)
REM ==========================================================================

echo Starting Client Portal Services...
echo.

REM Load config from config.env if it exists
if exist "%~dp0config.env" (
    echo Loading configuration from config.env...
    for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0config.env") do (
        REM Skip comments and blank lines
        echo %%a | findstr /r "^#" >nul 2>&1
        if errorlevel 1 (
            if not "%%a"=="" (
                set "%%a=%%b"
            )
        )
    )
) else (
    echo WARNING: config.env not found. Using default settings.
    echo Copy config.env.example to config.env and edit for your environment.
    echo.
)

REM Create data directory if needed
if not exist "%~dp0data" mkdir "%~dp0data"
if not exist "%~dp0backups" mkdir "%~dp0backups"

REM Activate Python venv
call "%~dp0services\venv\Scripts\activate.bat"

REM Start API server (also serves React build from webapp\customer-app\build)
echo Starting API server (serves both API and web app)...
start "ClientPortal-API" cmd /c "cd /d %~dp0 && python services\api\customer_api.py"

REM Wait for API to start
timeout /t 3 /nobreak >nul

REM Start backup scheduler
echo Starting backup scheduler (12 AM and 12 PM daily)...
start "ClientPortal-Backup" cmd /c "cd /d %~dp0 && python services\backup_scheduler.py"

echo.
echo =============================================
echo   Services started successfully!
echo.
echo   App: http://localhost:5000
echo   Backup: 12 AM and 12 PM daily
echo =============================================
echo.
echo To stop: close the command windows titled
echo   ClientPortal-API, ClientPortal-Backup
echo.
pause
