# Client Portal - Windows deployment script
#
# Non-interactive replacement for stop-all.bat + backup-db.ps1 + git pull + start-all.bat.
# Runs the four steps in order, bails on first failure, and auto-rolls back the
# git pull if the API doesn't come back up healthy.
#
# USAGE
#   Regular deploy:
#     powershell.exe -ExecutionPolicy Bypass -File deploy.ps1
#
#   Dry-run - describes every step without touching the box.
#   Prints which processes would be killed, which commits would land,
#   and whether pip / npm would run. Nothing is stopped, pulled, or started:
#     powershell.exe -ExecutionPolicy Bypass -File deploy.ps1 -DryRun
#
#   Skip DB backup (fast redeploy after a small tweak):
#     powershell.exe -ExecutionPolicy Bypass -File deploy.ps1 -SkipBackup
#
#   Deploy from a branch other than main:
#     powershell.exe -ExecutionPolicy Bypass -File deploy.ps1 -Branch feature/foo
#
#   Reinstall pip deps even if requirements.txt didn't change:
#     powershell.exe -ExecutionPolicy Bypass -File deploy.ps1 -ForcePipInstall
#
#   Override the DB user (host, port) used for the backup step. Useful when
#   the app connects as a role that's not in DATABASE_URI (e.g. because the
#   URI has no user embedded, or you have a distinct backup role):
#     powershell.exe -ExecutionPolicy Bypass -File deploy.ps1 -DbUser client_portal_user
#
# EXITS
#   0 = success (services healthy)
#   1 = a step failed and could not be undone
#   2 = deploy was rolled back (git reset --hard to the previous HEAD) because
#       the API failed its post-start health check

param(
    [switch]$SkipBackup,
    [switch]$SkipHealthCheck,
    [switch]$ForcePipInstall,
    [switch]$NoRollback,
    [switch]$DryRun,
    [string]$Branch          = "main",
    [string]$Remote          = "origin",
    [int]   $HealthTimeoutSec = 90,
    # Override DB connection for the backup step. When empty, values are
    # derived from DATABASE_URI in config.env, and backup-db.ps1's own
    # defaults are used for anything still missing.
    [string]$DbUser          = "",
    [string]$DbHost          = "",
    [int]   $DbPort          = 0
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Say($msg) { Write-Host $msg -ForegroundColor Cyan }
function OK($msg)  { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Warn($msg){ Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function DryNote($msg) { Write-Host "  [DRY] $msg" -ForegroundColor Magenta }
function Die($msg, $code = 1) {
    Write-Host ""
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
    exit $code
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
$banner = if ($DryRun) { "Client Portal Deploy DRY-RUN - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" }
          else         { "Client Portal Deploy - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" }
Write-Host "  $banner" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "  Every destructive step will be described, not executed." -ForegroundColor Magenta
}
Write-Host "======================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------
# Load config.env so we know which port to health-check against.
# Same one-line pattern the .bat files use.
# ------------------------------------------------------------------
$config = @{}
$configFile = Join-Path $PSScriptRoot "config.env"
if (Test-Path $configFile) {
    Get-Content $configFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+?)\s*=\s*(.*?)\s*$') { $config[$Matches[1]] = $Matches[2] }
    }
}
$apiPort = if ($config['API_PORT']) { [int]$config['API_PORT'] } else { 5001 }

# Derive DB connection details from DATABASE_URI when present. Anything we
# can't parse falls through to backup-db.ps1's defaults (postgres user,
# localhost, port 5432, database 'client_portal'). Explicit -DbUser /
# -DbHost / -DbPort flags on the deploy.ps1 command line always win over
# whatever the URI says.
$dbName = 'client_portal'
$uriUser = $null
$uriHost = $null
$uriPort = 0
$dbUri  = $config['DATABASE_URI']
if ($dbUri) {
    if ($dbUri -match '/([^/?]+)(\?|$)')                 { $dbName  = $Matches[1] }
    # user only present when the URI contains an '@' sentinel; without it,
    # postgresql://localhost/dbname would incorrectly parse 'localhost' as user.
    if ($dbUri -match 'postgresql://([^:@/]+)[^@]*@')    { $uriUser = $Matches[1] }
    if ($dbUri -match '@([^:/?]+)')                      { $uriHost = $Matches[1] }
    if ($dbUri -match '@[^:/?]+:(\d+)/')                 { $uriPort = [int]$Matches[1] }
}

# Final effective values: CLI wins, URI is next, else fall through to
# backup-db.ps1's defaults by leaving these as null/0.
$effDbUser = if ($DbUser)     { $DbUser } elseif ($uriUser) { $uriUser } else { $null }
$effDbHost = if ($DbHost)     { $DbHost } elseif ($uriHost) { $uriHost } else { $null }
$effDbPort = if ($DbPort -gt 0) { $DbPort } elseif ($uriPort -gt 0) { $uriPort } else { $null }

# ==================================================================
# STEP 1 - STOP services
# ==================================================================
Say ""
Say "[1/4] Stopping services..."

if ($DryRun) {
    $pidsFile = Join-Path $PSScriptRoot ".pids"
    if (Test-Path $pidsFile) {
        DryNote "would kill PIDs listed in $pidsFile"
        Get-Content $pidsFile | ForEach-Object { DryNote "  $_" }
    } else {
        DryNote "no .pids file present"
    }
    foreach ($port in @($apiPort, 3000)) {
        $procs = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                 Select-Object -ExpandProperty OwningProcess -Unique
        if ($procs) {
            DryNote "would kill listener(s) on port ${port}: $($procs -join ', ')"
        } else {
            DryNote "port $port is idle"
        }
    }
    $cmdlineHits = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" -ErrorAction SilentlyContinue |
                   Where-Object { $_.CommandLine -match 'customer_api\.py|backup_scheduler\.py' } |
                   Select-Object -ExpandProperty ProcessId
    if ($cmdlineHits) {
        DryNote "would kill python.exe by command-line match: $($cmdlineHits -join ', ')"
    }
    OK "stop step described"
} else {
    $pidsFile = Join-Path $PSScriptRoot ".pids"
    if (Test-Path $pidsFile) {
        Get-Content $pidsFile | ForEach-Object {
            if ($_ -match '^\s*[A-Z_]+=(\d+)\s*$') {
                $procId = [int]$Matches[1]
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
        Remove-Item $pidsFile -Force -ErrorAction SilentlyContinue
    }

    # Nuclear fallback: whatever is on the API port + React dev server port
    foreach ($port in @($apiPort, 3000)) {
        Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique |
            ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    }

    # Also catch anything by command line
    Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'customer_api\.py|backup_scheduler\.py' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

    Start-Sleep -Seconds 2
    OK "services stopped"
}

# ==================================================================
# STEP 2 - BACKUP database
# ==================================================================
Say ""
if ($SkipBackup) {
    Say "[2/4] DB backup skipped (-SkipBackup flag was passed)"
} elseif ($DryRun) {
    Say "[2/4] Backing up database ($dbName)..."
    $backupScript = Join-Path $PSScriptRoot "backup-db.ps1"
    if (-not (Test-Path $backupScript)) {
        DryNote "backup-db.ps1 NOT FOUND at $backupScript - real deploy would abort here"
    } else {
        $argDesc = "-DbName $dbName"
        if ($effDbUser) { $argDesc += " -DbUser $effDbUser" }
        if ($effDbHost) { $argDesc += " -DbHost $effDbHost" }
        if ($effDbPort) { $argDesc += " -DbPort $effDbPort" }
        DryNote "would run: powershell -File '$backupScript' $argDesc"
        $bkDir = if ($config['BACKUP_DIR']) { $config['BACKUP_DIR'] } else { 'C:\backups\client_portal' }
        DryNote "backups typically land in $bkDir"
    }
    OK "backup step described"
} else {
    Say "[2/4] Backing up database ($dbName)..."
    $backupScript = Join-Path $PSScriptRoot "backup-db.ps1"
    if (-not (Test-Path $backupScript)) { Die "backup-db.ps1 not found. Aborting before pull." }
    $backupArgs = @{ DbName = $dbName }
    if ($effDbUser) { $backupArgs['DbUser'] = $effDbUser }
    if ($effDbHost) { $backupArgs['DbHost'] = $effDbHost }
    if ($effDbPort) { $backupArgs['DbPort'] = $effDbPort }
    & $backupScript @backupArgs
    if ($LASTEXITCODE -ne 0) { Die "backup-db.ps1 exited with code $LASTEXITCODE. Aborting before pull." }
    OK "backup complete"
}

# ==================================================================
# STEP 3 - GIT pull
# ==================================================================
Say ""
Say "[3/4] Pulling $Remote/$Branch..."

$preCommit = (git rev-parse HEAD).Trim()
if (-not $preCommit) { Die "git rev-parse HEAD failed. Is this a git checkout?" }

git fetch $Remote $Branch
if ($LASTEXITCODE -ne 0) { Die "git fetch failed. Aborting." }

if ($DryRun) {
    $targetCommit = (git rev-parse "$Remote/$Branch").Trim()
    DryNote "would: git reset --hard $Remote/$Branch"
    DryNote "  local  : $($preCommit.Substring(0,7))"
    DryNote "  target : $($targetCommit.Substring(0,7))"
    if ($preCommit -eq $targetCommit) {
        DryNote "  no code changes to apply"
    } else {
        Write-Host ""
        Write-Host "  Incoming commits:" -ForegroundColor Magenta
        git log --oneline "$preCommit..$targetCommit" | ForEach-Object { Write-Host "    $_" -ForegroundColor Magenta }
        Write-Host ""
        $changed = git diff --name-only $preCommit $targetCommit
        DryNote "changed files:"
        $changed | ForEach-Object { Write-Host "    $_" -ForegroundColor Magenta }
        if ($changed -match 'services/requirements\.txt') {
            DryNote "requirements.txt would trigger: pip install -r services\requirements.txt"
        }
        $buildDir = Join-Path $PSScriptRoot "webapp\customer-app\build"
        if (($changed -match 'webapp/customer-app/') -and (Test-Path $buildDir)) {
            DryNote "frontend + existing build/ would trigger: npm run build"
        } elseif ($changed -match 'webapp/customer-app/') {
            DryNote "frontend changed but no build/ present - real deploy would SKIP npm build (dev-server mode)"
        }
    }
    $postCommit = $preCommit  # keep the rest of the script sane
    OK "pull step described"
} else {
    # Use reset --hard rather than pull so we survive force-pushes (like today's revert).
    git reset --hard "$Remote/$Branch"
    if ($LASTEXITCODE -ne 0) { Die "git reset --hard failed. Aborting." }
    $postCommit = (git rev-parse HEAD).Trim()
}

if ($preCommit -eq $postCommit) {
    OK "already at $postCommit - no code changes to apply"
} else {
    OK "$($preCommit.Substring(0,7)) → $($postCommit.Substring(0,7))"
    Write-Host ""
    git log --oneline "$preCommit..$postCommit"
    Write-Host ""

    # If services/requirements.txt changed, install
    $changed = git diff --name-only $preCommit $postCommit
    if (($changed -match 'services/requirements\.txt') -or $ForcePipInstall) {
        Say "  requirements.txt changed - running pip install..."
        $venvPy = Join-Path $PSScriptRoot "services\venv\Scripts\python.exe"
        if (-not (Test-Path $venvPy)) { Die "venv python not found at $venvPy" }
        & $venvPy -m pip install -r (Join-Path $PSScriptRoot "services\requirements.txt")
        if ($LASTEXITCODE -ne 0) { Die "pip install failed. Rolling back."; exit 1 }
        OK "pip install complete"
    }

    # If frontend changed AND a build/ already exists (i.e. prod mode), rebuild it.
    $buildDir = Join-Path $PSScriptRoot "webapp\customer-app\build"
    if (($changed -match 'webapp/customer-app/') -and (Test-Path $buildDir)) {
        Say "  frontend changed - running npm run build..."
        Push-Location (Join-Path $PSScriptRoot "webapp\customer-app")
        npm run build
        $npmExit = $LASTEXITCODE
        Pop-Location
        if ($npmExit -ne 0) { Die "npm run build failed." }
        OK "npm build complete"
    }
}

# ==================================================================
# STEP 4 - START services (invokes start-all.bat non-interactively)
# ==================================================================
Say ""
Say "[4/4] Starting services..."

$startBat = Join-Path $PSScriptRoot "start-all.bat"
if (-not (Test-Path $startBat)) { Die "start-all.bat not found." }

if ($DryRun) {
    DryNote "would launch: cmd /c `"$startBat`" <nul  (WindowStyle Minimized)"
    DryNote "would poll GET http://127.0.0.1:$apiPort/api/health up to $HealthTimeoutSec s"
    DryNote "on health failure, would roll back to $($preCommit.Substring(0,7)) and restart"
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Magenta
    Write-Host "  DRY-RUN complete - nothing changed on this box." -ForegroundColor Magenta
    Write-Host "  Re-run without -DryRun to actually deploy." -ForegroundColor Magenta
    Write-Host "======================================================" -ForegroundColor Magenta
    exit 0
}

# Launch start-all.bat detached so its trailing `pause` doesn't block us.
# Piping `<nul` gives it EOF on stdin so the pause resolves immediately.
Start-Process -FilePath "cmd.exe" -ArgumentList "/c","`"$startBat`" <nul" -WorkingDirectory $PSScriptRoot -WindowStyle Minimized

if ($SkipHealthCheck) {
    OK "start-all.bat launched (health check skipped)"
    exit 0
}

# ------- Health check -------
Say "  waiting for API on port $apiPort..."
$healthUrl = "http://127.0.0.1:$apiPort/api/health"
$deadline  = (Get-Date).AddSeconds($HealthTimeoutSec)
$healthy   = $false
while ((Get-Date) -lt $deadline) {
    try {
        $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { $healthy = $true; break }
    } catch {
        # not up yet
    }
    Start-Sleep -Seconds 2
}

if ($healthy) {
    Write-Host ""
    OK "API healthy on port $apiPort"
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Green
    Write-Host "  Deploy complete - HEAD is $($postCommit.Substring(0,7))" -ForegroundColor Green
    Write-Host "======================================================" -ForegroundColor Green
    exit 0
}

# ------- Health check failed. Roll back? -------
Write-Host ""
Warn "API did not become healthy within $HealthTimeoutSec seconds."

if ($NoRollback -or ($preCommit -eq $postCommit)) {
    Warn "Not rolling back (either -NoRollback or nothing was pulled)."
    Warn "Investigate the ClientPortal-API window for the traceback."
    exit 2
}

Say ""
Say "Rolling back to $($preCommit.Substring(0,7))..."

# Stop whatever the new code started
foreach ($port in @($apiPort, 3000)) {
    Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}
Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'customer_api\.py|backup_scheduler\.py' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

git reset --hard $preCommit
if ($LASTEXITCODE -ne 0) { Die "git reset to $preCommit failed. Manual intervention required." 1 }

Say "Restarting on rolled-back code..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/c","`"$startBat`" <nul" -WorkingDirectory $PSScriptRoot -WindowStyle Minimized

# Verify rollback is healthy
$deadline = (Get-Date).AddSeconds($HealthTimeoutSec)
$healthy = $false
while ((Get-Date) -lt $deadline) {
    try {
        $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { $healthy = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}

Write-Host ""
if ($healthy) {
    Write-Host "======================================================" -ForegroundColor Yellow
    Write-Host "  Deploy ROLLED BACK - HEAD is $($preCommit.Substring(0,7))" -ForegroundColor Yellow
    Write-Host "  New commits are not applied. Investigate before retrying." -ForegroundColor Yellow
    Write-Host "======================================================" -ForegroundColor Yellow
    exit 2
} else {
    Die "Rollback attempted but API is still down. Manual intervention required. DB backup is in the configured BackupDir." 1
}
