# Task Scheduler Quick Setup Script
# Run this as Administrator to create the scheduled task
# ========================================================

# Require Administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "❌ This script must be run as Administrator" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Task Scheduler Setup" -ForegroundColor Cyan
Write-Host "  Live Sneaker Tracker" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$TaskName = "Live-Sneaker-Tracker-Hourly"
$ScriptPath = Join-Path $PSScriptRoot "run-all-scrapers.ps1"
$WorkingDir = $PSScriptRoot

# Verify script exists
if (-not (Test-Path $ScriptPath)) {
    Write-Host "❌ ERROR: Could not find run-all-scrapers.ps1" -ForegroundColor Red
    Write-Host "   Expected: $ScriptPath" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "📝 Task Name: $TaskName" -ForegroundColor White
Write-Host "📂 Script: $ScriptPath" -ForegroundColor White
Write-Host "📁 Working Directory: $WorkingDir" -ForegroundColor White
Write-Host ""

# Check if task already exists
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($ExistingTask) {
    Write-Host "⚠️  Task already exists!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to replace it? (Y/N)"
    if ($response -ne 'Y' -and $response -ne 'y') {
        Write-Host "Cancelled." -ForegroundColor Gray
        exit 0
    }
    
    Write-Host "🗑️  Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create action
Write-Host "⚙️  Creating task action..." -ForegroundColor Cyan
$Action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$ScriptPath`"" `
    -WorkingDirectory $WorkingDir

# Create trigger (hourly, starting at next hour)
$NextHour = (Get-Date).AddHours(1).Date.AddHours((Get-Date).AddHours(1).Hour)
Write-Host "⏰ Creating trigger (hourly, next run: $($NextHour.ToString('yyyy-MM-dd HH:mm')))..." -ForegroundColor Cyan
$Trigger = New-ScheduledTaskTrigger `
    -Once `
    -At $NextHour `
    -RepetitionInterval (New-TimeSpan -Hours 1)

# Create settings
Write-Host "⚙️  Configuring settings..." -ForegroundColor Cyan
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances IgnoreNew

# Create principal (run as current user)
Write-Host "👤 Setting user context ($env:USERNAME)..." -ForegroundColor Cyan
$Principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType S4U `
    -RunLevel Highest

# Register task
Write-Host "📋 Registering task..." -ForegroundColor Cyan
try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Settings $Settings `
        -Principal $Principal `
        -Description "Hourly scraper for Live Sneaker Tracker - collects data from sneaker retailers and writes to Firestore + Supabase" `
        -Force | Out-Null
    
    Write-Host ""
    Write-Host "✅ Task created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📅 Next scheduled run: $($NextHour.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor White
    Write-Host "🔁 Repeats: Every 1 hour" -ForegroundColor White
    Write-Host ""
    
    # Test run option
    Write-Host "Would you like to run a test now? (Y/N)" -ForegroundColor Yellow
    $testResponse = Read-Host
    
    if ($testResponse -eq 'Y' -or $testResponse -eq 'y') {
        Write-Host ""
        Write-Host "🚀 Starting test run..." -ForegroundColor Cyan
        Start-ScheduledTask -TaskName $TaskName
        
        Start-Sleep -Seconds 2
        
        $TaskInfo = Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo
        Write-Host "   Last Run: $($TaskInfo.LastRunTime)" -ForegroundColor White
        Write-Host "   Last Result: $($TaskInfo.LastTaskResult) $(if ($TaskInfo.LastTaskResult -eq 0) { '✅' } else { '❌' })" -ForegroundColor White
        
        Write-Host ""
        Write-Host "📊 Check logs directory for results:" -ForegroundColor Cyan
        Write-Host "   $WorkingDir\logs\" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "================================" -ForegroundColor Gray
    Write-Host "  Useful Commands" -ForegroundColor Gray
    Write-Host "================================" -ForegroundColor Gray
    Write-Host "View task status:" -ForegroundColor Yellow
    Write-Host "  Get-ScheduledTask -TaskName '$TaskName' | Select-Object State, LastRunTime, NextRunTime" -ForegroundColor White
    Write-Host ""
    Write-Host "Run manually:" -ForegroundColor Yellow
    Write-Host "  Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host ""
    Write-Host "View logs:" -ForegroundColor Yellow
    Write-Host "  Get-ChildItem logs\scraper-run-*.log | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content -Tail 50" -ForegroundColor White
    Write-Host ""
    Write-Host "Disable task:" -ForegroundColor Yellow
    Write-Host "  Disable-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    Write-Host ""
    Write-Host "Remove task:" -ForegroundColor Yellow
    Write-Host "  Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ ERROR: Failed to create task" -ForegroundColor Red
    Write-Host "   $_" -ForegroundColor Red
    Write-Host ""
    pause
    exit 1
}

pause
