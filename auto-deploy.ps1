# Client Portal - nightly auto-deploy wrapper
#
# Fetches from the git remote, compares local HEAD to <remote>/<branch>, and
# invokes deploy.ps1 ONLY when there are new commits. Emits a transcript of
# every run (whether or not it deploys) into logs\auto-deploy for morning
# review. Designed for unattended execution via Windows Task Scheduler.
#
# USAGE
#   Manual test (does NOT deploy - prints what would happen):
#     powershell.exe -ExecutionPolicy Bypass -File auto-deploy.ps1 -DryRun
#
#   Manual run (equivalent to what Task Scheduler will do):
#     powershell.exe -ExecutionPolicy Bypass -File auto-deploy.ps1
#
# EXIT CODES
#   0 = up-to-date (no deploy needed) OR deploy succeeded
#   1 = a step failed (fetch, comparison, or deploy.ps1 returned 1)
#   2 = deploy was rolled back by deploy.ps1's health check
#
# TASK SCHEDULER REGISTRATION (run once, from an elevated PowerShell)
#
#   # Runs nightly at 23:00 as SYSTEM. Works out of the box if the repo
#   # remote uses SSH with a key at C:\ProgramData\ssh\keys, or HTTPS with
#   # a token in the URL. If git-auth is per-user, use the -User variant
#   # below instead.
#   $action  = New-ScheduledTaskAction -Execute "powershell.exe" `
#                -Argument '-ExecutionPolicy Bypass -File "C:\ClientPortal\auto-deploy.ps1"' `
#                -WorkingDirectory "C:\ClientPortal"
#   $trigger = New-ScheduledTaskTrigger -Daily -At 11:00pm
#   $princ   = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
#   $set     = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
#                -DontStopIfGoingOnBatteries -StartWhenAvailable
#   Register-ScheduledTask -TaskName "ClientPortal-AutoDeploy" `
#                -Action $action -Trigger $trigger -Principal $princ -Settings $set
#
#   # Alternative: run as the current logged-on user (use this if git-auth
#   # relies on Windows Credential Manager or a per-user SSH key):
#   $princ = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
#                -LogonType Interactive -RunLevel Highest
#   # ...then Register-ScheduledTask with that $princ instead.
#
# UTILITY
#   Get-ScheduledTaskInfo -TaskName "ClientPortal-AutoDeploy"     # last-run info
#   Start-ScheduledTask   -TaskName "ClientPortal-AutoDeploy"     # fire manually
#   Unregister-ScheduledTask -TaskName "ClientPortal-AutoDeploy" -Confirm:$false

param(
    [switch]$DryRun,
    [string]$Branch     = "main",
    [string]$Remote     = "origin",
    [string]$LogDir     = "",   # defaults to <script dir>\logs\auto-deploy
    [int]   $RetainDays = 30    # prune older transcript files
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# ----- Log setup -----
if (-not $LogDir) {
    $LogDir = Join-Path $PSScriptRoot "logs\auto-deploy"
}
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$logFile   = Join-Path $LogDir "auto-deploy_$timestamp.log"

Start-Transcript -Path $logFile -Append | Out-Null
$transcriptOn = $true

try {
    Write-Host ("=" * 60)
    Write-Host "CLIENT PORTAL - AUTO-DEPLOY  ($([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss')))"
    Write-Host ("=" * 60)
    Write-Host "Working dir: $PSScriptRoot"
    Write-Host "Branch:      $Remote/$Branch"
    Write-Host "Dry run:     $DryRun"
    Write-Host ""

    # ----- Fetch -----
    Write-Host "Fetching $Remote..."
    & git fetch --quiet $Remote 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Host "git fetch failed (exit $LASTEXITCODE). Aborting." -ForegroundColor Red
        exit 1
    }

    # ----- Compare local vs remote HEAD -----
    $localSha  = (& git rev-parse "HEAD").Trim()
    $remoteRef = "$Remote/$Branch"
    $remoteSha = (& git rev-parse $remoteRef).Trim()

    Write-Host "Local  HEAD: $localSha"
    Write-Host "Remote HEAD: $remoteSha"

    if ($localSha -eq $remoteSha) {
        Write-Host "No new commits. Nothing to deploy." -ForegroundColor Green
        exit 0
    }

    # ----- List incoming commits (for the transcript) -----
    Write-Host ""
    Write-Host "New commits pending:"
    & git --no-pager log --oneline "$localSha..$remoteSha" | Out-Host
    Write-Host ""

    if ($DryRun) {
        Write-Host "[DRY] Would invoke deploy.ps1 now. Skipping actual deploy." -ForegroundColor Magenta
        exit 0
    }

    # ----- Invoke deploy.ps1 -----
    $deployScript = Join-Path $PSScriptRoot "deploy.ps1"
    if (-not (Test-Path $deployScript)) {
        Write-Host "deploy.ps1 not found at $deployScript. Aborting." -ForegroundColor Red
        exit 1
    }
    Write-Host "Invoking deploy.ps1 -Branch $Branch -Remote $Remote..."
    Write-Host ("-" * 60)
    & powershell.exe -ExecutionPolicy Bypass -File $deployScript -Branch $Branch -Remote $Remote
    $deployExit = $LASTEXITCODE
    Write-Host ("-" * 60)
    Write-Host "deploy.ps1 exited with code $deployExit"

    switch ($deployExit) {
        0 { Write-Host "SUCCESS - services healthy on new commit." -ForegroundColor Green }
        1 { Write-Host "FAILED  - deploy step errored out. See transcript above." -ForegroundColor Red }
        2 { Write-Host "ROLLED BACK - deploy failed health check and reset to previous HEAD." -ForegroundColor Yellow }
        default { Write-Host "Unknown exit code $deployExit from deploy.ps1." -ForegroundColor Yellow }
    }
    exit $deployExit
}
catch {
    Write-Host "auto-deploy fatal error: $_" -ForegroundColor Red
    exit 1
}
finally {
    # ----- Prune old transcripts -----
    if ($RetainDays -gt 0) {
        try {
            $cutoff = (Get-Date).AddDays(-$RetainDays)
            Get-ChildItem -Path $LogDir -Filter "auto-deploy_*.log" -ErrorAction SilentlyContinue |
                Where-Object { $_.LastWriteTime -lt $cutoff } |
                ForEach-Object {
                    Write-Host "Pruning old log: $($_.Name)"
                    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
                }
        } catch {
            Write-Host "Log prune failed: $_" -ForegroundColor Yellow
        }
    }
    if ($transcriptOn) { Stop-Transcript | Out-Null }
}
