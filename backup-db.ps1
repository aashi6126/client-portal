# Client Portal - PostgreSQL backup script (Windows)
#
# Produces a timestamped pg_dump custom-format archive that can be restored with:
#   pg_restore --clean --if-exists -d client_portal <backup file>
#
# USAGE
#   Manual:        powershell.exe -File backup-db.ps1
#   With overrides: powershell.exe -File backup-db.ps1 -DbName client_portal -BackupDir D:\backups\client_portal
#   Scheduled:     register in Task Scheduler -> Action: Start a program
#                    Program:  powershell.exe
#                    Arguments: -ExecutionPolicy Bypass -File "C:\path\to\backup-db.ps1"
#
# AUTHENTICATION
#   Set the PGPASSWORD environment variable before running, OR put credentials in
#   %APPDATA%\postgresql\pgpass.conf (more secure; survives reboots without env vars).
#   Format:  hostname:port:database:username:password

param(
    [string]$DbName     = "client_portal",
    [string]$DbHost     = "localhost",
    [int]   $DbPort     = 5432,
    [string]$DbUser     = "postgres",
    [string]$BackupDir  = "C:\backups\client_portal",
    [string]$PgDumpExe  = "",     # auto-detect if empty
    [int]   $RetainDays = 14      # delete backups older than this many days (0 = keep forever)
)

$ErrorActionPreference = "Stop"

function Find-PgDump {
    if ($PgDumpExe -and (Test-Path $PgDumpExe)) { return $PgDumpExe }

    # Search default PostgreSQL install locations (newest version first)
    $candidates = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName "bin\pg_dump.exe" }

    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }

    # Fall back to PATH
    $onPath = Get-Command pg_dump.exe -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }

    throw "pg_dump.exe not found. Install PostgreSQL or pass -PgDumpExe '<full path>'."
}

# ----- Header -----
Write-Host ("=" * 60)
Write-Host "CLIENT PORTAL - DATABASE BACKUP"
Write-Host ("=" * 60)

$pgDump = Find-PgDump
Write-Host "pg_dump:    $pgDump"
Write-Host "Database:   $DbName on ${DbHost}:${DbPort} (user: $DbUser)"
Write-Host "Output dir: $BackupDir"

# ----- Prepare output path -----
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Host "Created backup directory."
}

$timestamp  = Get-Date -Format "yyyy-MM-dd_HHmmss"
$outFile    = Join-Path $BackupDir "${DbName}_${timestamp}.dump"
$logFile    = Join-Path $BackupDir "${DbName}_${timestamp}.log"

Write-Host "Writing:    $outFile"
Write-Host ("-" * 60)

# ----- Run pg_dump -----
$pgDumpArgs = @(
    "--host=$DbHost",
    "--port=$DbPort",
    "--username=$DbUser",
    "--format=custom",
    "--no-password",          # never prompt; rely on PGPASSWORD or pgpass.conf
    "--verbose",
    "--file=$outFile",
    $DbName
)

$startArgs = @{
    FilePath              = $pgDump
    ArgumentList          = $pgDumpArgs
    NoNewWindow           = $true
    Wait                  = $true
    PassThru              = $true
    RedirectStandardError = $logFile
}
$proc = Start-Process @startArgs

if ($proc.ExitCode -ne 0) {
    Write-Host "FAILED - pg_dump exit code $($proc.ExitCode). Log:" -ForegroundColor Red
    if (Test-Path $logFile) { Get-Content $logFile | Select-Object -Last 30 | Write-Host }
    if (Test-Path $outFile) { Remove-Item $outFile -Force }
    exit 1
}

# ----- Verify -----
if (-not (Test-Path $outFile) -or (Get-Item $outFile).Length -eq 0) {
    Write-Host "FAILED - output file is missing or empty." -ForegroundColor Red
    exit 1
}

$sizeKB = [math]::Round((Get-Item $outFile).Length / 1KB, 1)
Write-Host ("-" * 60)
Write-Host "SUCCESS - $outFile  (${sizeKB} KB)"  -ForegroundColor Green

# ----- Retention: prune old backups -----
if ($RetainDays -gt 0) {
    $cutoff = (Get-Date).AddDays(-$RetainDays)
    $old = Get-ChildItem -Path $BackupDir -Filter "${DbName}_*.dump" |
           Where-Object { $_.LastWriteTime -lt $cutoff }
    if ($old) {
        Write-Host ""
        Write-Host "Pruning backups older than $RetainDays day(s):"
        foreach ($f in $old) {
            Write-Host "  delete  $($f.Name)"
            Remove-Item $f.FullName -Force
            $matchingLog = $f.FullName -replace '\.dump$', '.log'
            if (Test-Path $matchingLog) { Remove-Item $matchingLog -Force }
        }
    }
}

exit 0
