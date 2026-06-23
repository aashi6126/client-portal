# Client Portal - PostgreSQL restore script (Windows)
#
# Restores a pg_dump custom-format archive (produced by backup-db.ps1) into a
# PostgreSQL database. By default, runs interactively: lists available backups,
# lets you pick one, confirms before touching anything.
#
# USAGE
#   Interactive picker (default):
#     powershell.exe -ExecutionPolicy Bypass -File restore-db.ps1
#
#   Restore a specific file:
#     powershell.exe -ExecutionPolicy Bypass -File restore-db.ps1 -File C:\backups\client_portal\client_portal_2026-06-22_020000.dump
#
#   Restore into a DIFFERENT db (safe: inspect before swapping):
#     powershell.exe -ExecutionPolicy Bypass -File restore-db.ps1 -TargetDb client_portal_restore_test
#     (the target db must already exist; create it first with: createdb client_portal_restore_test)
#
#   Non-interactive (automation):
#     powershell.exe -ExecutionPolicy Bypass -File restore-db.ps1 -File <path> -Force
#
# AUTHENTICATION
#   Set $env:PGPASSWORD or use %APPDATA%\postgresql\pgpass.conf - same as backup-db.ps1.

param(
    [string]$File         = "",          # specific .dump file; empty = interactive picker
    [string]$BackupDir    = "C:\backups\client_portal",
    [string]$TargetDb     = "client_portal",
    [string]$DbHost       = "localhost",
    [int]   $DbPort       = 5432,
    [string]$DbUser       = "postgres",
    [string]$PgRestoreExe = "",          # auto-detect if empty
    [string]$PsqlExe      = "",          # auto-detect if empty
    [switch]$Force                       # skip confirmation prompts
)

$ErrorActionPreference = "Stop"

function Find-PgTool {
    param([string]$ToolName, [string]$Override)
    if ($Override -and (Test-Path $Override)) { return $Override }

    $candidates = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName "bin\$ToolName" }
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }

    $onPath = Get-Command $ToolName -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }

    throw "$ToolName not found. Install PostgreSQL or pass the override parameter."
}

function Confirm-Action {
    param([string]$Prompt)
    if ($Force) { return $true }
    $reply = Read-Host "$Prompt [y/N]"
    return $reply -match '^[yY]'
}

# ----- Locate tools -----
$pgRestore = Find-PgTool -ToolName "pg_restore.exe" -Override $PgRestoreExe
$psql      = Find-PgTool -ToolName "psql.exe"       -Override $PsqlExe

Write-Host ("=" * 60)
Write-Host "CLIENT PORTAL - DATABASE RESTORE"
Write-Host ("=" * 60)
Write-Host "pg_restore: $pgRestore"
Write-Host "Target:     $TargetDb on ${DbHost}:${DbPort} (user: $DbUser)"
Write-Host ("-" * 60)

# ----- Pick the backup file -----
if (-not $File) {
    if (-not (Test-Path $BackupDir)) {
        throw "Backup directory not found: $BackupDir"
    }

    $dumps = Get-ChildItem -Path $BackupDir -Filter "*.dump" |
        Sort-Object LastWriteTime -Descending
    if (-not $dumps) {
        throw "No .dump files found in $BackupDir"
    }

    Write-Host "Available backups in ${BackupDir}:"
    Write-Host ""
    for ($i = 0; $i -lt $dumps.Count; $i++) {
        $d = $dumps[$i]
        $sizeKB = [math]::Round($d.Length / 1KB, 1)
        $age    = [math]::Round(((Get-Date) - $d.LastWriteTime).TotalHours, 1)
        $line = "  [{0,2}] {1,-50} {2,10} KB   {3} ({4}h ago)" -f $i, $d.Name, $sizeKB, $d.LastWriteTime.ToString("yyyy-MM-dd HH:mm"), $age
        Write-Host $line
    }
    Write-Host ""

    $choice = Read-Host "Select backup number to restore (or blank to cancel)"
    if (-not $choice) { Write-Host "Cancelled."; exit 0 }
    if ($choice -notmatch '^\d+$' -or [int]$choice -ge $dumps.Count) {
        throw "Invalid selection: $choice"
    }
    $File = $dumps[[int]$choice].FullName
}

if (-not (Test-Path $File)) {
    throw "Backup file not found: $File"
}

$fileSize = [math]::Round((Get-Item $File).Length / 1KB, 1)
Write-Host ""
Write-Host "Selected backup: $File  (${fileSize} KB)"
Write-Host ""

# ----- Confirm destructive action -----
Write-Host "WARNING: This will OVERWRITE all data in database '$TargetDb'." -ForegroundColor Yellow
if (-not (Confirm-Action -Prompt "Continue?")) {
    Write-Host "Cancelled."
    exit 0
}

# ----- Check for active connections -----
$env:PGCLIENTENCODING = "UTF8"
$connCheckArgs = @(
    "--host=$DbHost", "--port=$DbPort", "--username=$DbUser",
    "--dbname=postgres", "--no-password", "--tuples-only", "--no-align",
    "--command=SELECT COUNT(*) FROM pg_stat_activity WHERE datname = '$TargetDb' AND pid <> pg_backend_pid();"
)
$connOutput = & $psql @connCheckArgs 2>&1
$activeConns = 0
if ($LASTEXITCODE -eq 0) {
    [int]::TryParse(($connOutput | Select-Object -First 1).ToString().Trim(), [ref]$activeConns) | Out-Null
}

if ($activeConns -gt 0) {
    Write-Host ""
    Write-Host "Found $activeConns active connection(s) to '$TargetDb' - pg_restore will block." -ForegroundColor Yellow
    if (Confirm-Action -Prompt "Terminate them now?") {
        $termArgs = @(
            "--host=$DbHost", "--port=$DbPort", "--username=$DbUser",
            "--dbname=postgres", "--no-password",
            "--command=SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TargetDb' AND pid <> pg_backend_pid();"
        )
        & $psql @termArgs | Out-Null
        Write-Host "Active connections terminated."
    } else {
        Write-Host "Stop your Flask app (and any open psql sessions) on '$TargetDb' before retrying."
        exit 1
    }
}

# ----- Restore -----
Write-Host ""
Write-Host "Restoring..."
Write-Host ("-" * 60)

$restoreArgs = @(
    "--host=$DbHost", "--port=$DbPort", "--username=$DbUser",
    "--dbname=$TargetDb",
    "--clean", "--if-exists",
    "--no-password",
    "--verbose",
    $File
)

$logFile = "$File.restore.log"
$startArgs = @{
    FilePath              = $pgRestore
    ArgumentList          = $restoreArgs
    NoNewWindow           = $true
    Wait                  = $true
    PassThru              = $true
    RedirectStandardError = $logFile
}
$proc = Start-Process @startArgs

if ($proc.ExitCode -ne 0) {
    Write-Host ("-" * 60)
    Write-Host "FAILED - pg_restore exit code $($proc.ExitCode). Last 30 log lines:" -ForegroundColor Red
    if (Test-Path $logFile) { Get-Content $logFile | Select-Object -Last 30 | Write-Host }
    Write-Host ""
    Write-Host "Full log: $logFile"
    exit 1
}

Write-Host ("-" * 60)
Write-Host "SUCCESS - restored $File into database '$TargetDb'" -ForegroundColor Green
Write-Host "Log: $logFile"

# Note: pg_restore often prints harmless warnings to stderr (e.g. role does not exist).
# A zero exit code means the restore itself succeeded.
exit 0
