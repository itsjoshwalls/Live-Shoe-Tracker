# Windows Task Scheduler Setup for Real-Time News Scraper
# Run this script as Administrator to configure automated scraping

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("realtime", "balanced", "hourly", "quick")]
    [string]$Mode = "realtime",
    
    [switch]$Remove  # Remove existing task
)

# Task configuration based on mode
$schedules = @{
    "realtime" = @{
        "interval" = 15  # minutes
        "description" = "Every 15 minutes (real-time mode)"
    }
    "balanced" = @{
        "interval" = 30
        "description" = "Every 30 minutes (balanced mode)"
    }
    "hourly" = @{
        "interval" = 60
        "description" = "Every hour"
    }
    "quick" = @{
        "interval" = 5
        "description" = "Every 5 minutes (testing only)"
    }
}

$config = $schedules[$Mode]
$taskName = "SneakerNewsRealTimeScraper-$Mode"

# Paths
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcherScript = Join-Path $scriptPath "Launch-NewsScheduler.ps1"

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Task Scheduler Setup for News Scraper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Remove existing task if requested
if ($Remove) {
    Write-Host "Removing task: $taskName" -ForegroundColor Yellow
    try {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
        Write-Host "✓ Task removed successfully" -ForegroundColor Green
    } catch {
        Write-Host "Task not found or already removed" -ForegroundColor Gray
    }
    exit 0
}

# Check if launcher script exists
if (-not (Test-Path $launcherScript)) {
    Write-Host "ERROR: Launcher script not found: $launcherScript" -ForegroundColor Red
    exit 1
}

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Mode: $Mode" -ForegroundColor White
Write-Host "  Interval: $($config.interval) minutes ($($config.description))" -ForegroundColor White
Write-Host "  Task Name: $taskName" -ForegroundColor White
Write-Host "  Script: $launcherScript" -ForegroundColor White
Write-Host ""

# Create scheduled task action
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$launcherScript`" -Mode $Mode" `
    -WorkingDirectory $scriptPath

# Create trigger (repeat every X minutes, indefinitely)
$trigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes $config.interval) `
    -RepetitionDuration ([TimeSpan]::MaxValue)

# Task settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Task principal (run with highest privileges)
$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType Interactive `
    -RunLevel Highest

# Register task
try {
    Write-Host "Creating scheduled task..." -ForegroundColor Cyan
    
    # Remove old task if exists
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    
    # Register new task
    Register-ScheduledTask `
        -TaskName $taskName `
        -Description "Real-time sneaker news scraper ($Mode mode) - runs every $($config.interval) minutes" `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Force | Out-Null
    
    Write-Host "✓ Scheduled task created successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Display task info
    $task = Get-ScheduledTask -TaskName $taskName
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Status: $($task.State)" -ForegroundColor White
    Write-Host "  Next Run: $((Get-ScheduledTask -TaskName $taskName).Triggers[0].StartBoundary)" -ForegroundColor White
    Write-Host ""
    
    # Instructions
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Setup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "The task is now active and will run:" -ForegroundColor White
    Write-Host "  • Every $($config.interval) minutes" -ForegroundColor White
    Write-Host "  • Starting immediately" -ForegroundColor White
    Write-Host "  • Even when you're logged off" -ForegroundColor White
    Write-Host ""
    Write-Host "Management Commands:" -ForegroundColor Cyan
    Write-Host "  View task:" -ForegroundColor White
    Write-Host "    Get-ScheduledTask -TaskName '$taskName' | Format-List" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Run task now:" -ForegroundColor White
    Write-Host "    Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Stop task:" -ForegroundColor White
    Write-Host "    Stop-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Disable task:" -ForegroundColor White
    Write-Host "    Disable-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Enable task:" -ForegroundColor White
    Write-Host "    Enable-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Remove task:" -ForegroundColor White
    Write-Host "    .\Setup-TaskScheduler.ps1 -Mode $Mode -Remove" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Logs Location:" -ForegroundColor Cyan
    Write-Host "  $scriptPath\logs\" -ForegroundColor White
    Write-Host ""
    
    # Prompt to start task now
    $startNow = Read-Host "Start the task now? (Y/N)"
    if ($startNow -eq "Y" -or $startNow -eq "y") {
        Write-Host "Starting task..." -ForegroundColor Cyan
        Start-ScheduledTask -TaskName $taskName
        Start-Sleep -Seconds 2
        Write-Host "✓ Task started! Check logs for progress." -ForegroundColor Green
    }
    
} catch {
    Write-Host "ERROR: Failed to create scheduled task: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Done! Your sneaker news scraper is now running on autopilot. 🚀" -ForegroundColor Green
