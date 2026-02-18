@echo off
REM ==========================================================================
REM Client Portal - Stop Services
REM ==========================================================================
REM Usage: stop-all.bat
REM   Stops the API server, backup scheduler, and web app.
REM ==========================================================================

setlocal enabledelayedexpansion

echo =============================================
echo   Client Portal - Stopping Services
echo =============================================
echo.

set "PIDS_FILE=%~dp0.pids"
set "STOPPED=0"

REM --- Method 1: Use saved PIDs ---
if not exist "%PIDS_FILE%" goto :no_pids

echo [..] Reading saved process IDs...
for /f "usebackq tokens=1,* delims==" %%a in ("%PIDS_FILE%") do set "%%a=%%b"

REM Delete PID file immediately after reading (before file handle issues)
del /f /q "%~dp0.pids" >nul 2>&1

if not defined API_PYTHON_PID goto :skip_api_pid
echo [..] Stopping API server (PID: !API_PYTHON_PID!)...
taskkill /pid !API_PYTHON_PID! /f >nul 2>&1
echo [OK] API server stopped
set "STOPPED=1"
:skip_api_pid

if defined API_PID taskkill /pid !API_PID! /f >nul 2>&1

if not defined BACKUP_PYTHON_PID goto :skip_backup_pid
echo [..] Stopping backup scheduler (PID: !BACKUP_PYTHON_PID!)...
taskkill /pid !BACKUP_PYTHON_PID! /f >nul 2>&1
echo [OK] Backup scheduler stopped
set "STOPPED=1"
:skip_backup_pid

if defined BACKUP_PID taskkill /pid !BACKUP_PID! /f >nul 2>&1

if not defined WEB_PID goto :skip_web_pid
echo [..] Stopping web app (PID: !WEB_PID!)...
taskkill /pid !WEB_PID! /f >nul 2>&1
echo [OK] Web app stopped
set "STOPPED=1"
:skip_web_pid

:no_pids

REM --- Method 2: Find by window title (fallback) ---
echo [..] Closing service windows...

taskkill /fi "WINDOWTITLE eq ClientPortal-API*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq ClientPortal-Backup*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq ClientPortal-WebApp*" /f >nul 2>&1

REM --- Method 3: Find by process command line (final fallback) ---
for /f "tokens=2" %%p in ('wmic process where "commandline like '%%customer_api%%' and name='python.exe'" get processid /format:value 2^>nul ^| findstr "="') do (
    echo [..] Killing remaining API process (PID: %%p)...
    taskkill /pid %%p /f >nul 2>&1
    set "STOPPED=1"
)

for /f "tokens=2" %%p in ('wmic process where "commandline like '%%backup_scheduler%%' and name='python.exe'" get processid /format:value 2^>nul ^| findstr "="') do (
    echo [..] Killing remaining backup process (PID: %%p)...
    taskkill /pid %%p /f >nul 2>&1
    set "STOPPED=1"
)

REM --- Clean up PID file (fallback) ---
if exist "%~dp0.pids" del /f /q "%~dp0.pids" >nul 2>&1

echo.
echo =============================================
echo   All services stopped.
echo =============================================
echo.
pause
