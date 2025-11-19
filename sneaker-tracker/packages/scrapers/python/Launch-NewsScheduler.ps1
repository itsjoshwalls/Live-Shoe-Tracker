# Real-Time News Scraper Launcher for Windows Task Scheduler
# This script runs the BeautifulSoup news scraper with proper error handling and logging

param(
    [string]$Mode = "realtime",  # realtime (15min), balanced (30min), hourly, quick (5min)
    [int]$Articles = 20,
    [string]$LogDir = "logs",
    [switch]$Once,  # Run once then exit (for testing)
    [switch]$Verbose
)

# Script configuration
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonScript = Join-Path $scriptPath "realtime_scheduler.py"
$envFile = Join-Path $scriptPath ".env"
$logFile = Join-Path $scriptPath $LogDir "launcher.log"

# Ensure logs directory exists
$logDirPath = Join-Path $scriptPath $LogDir
if (-not (Test-Path $logDirPath)) {
    New-Item -ItemType Directory -Path $logDirPath -Force | Out-Null
}

# Logging function
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Write to console
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN"  { Write-Host $logMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        default { Write-Host $logMessage }
    }
    
    # Append to log file
    Add-Content -Path $logFile -Value $logMessage
}

# Start
Write-Log "========================================" "INFO"
Write-Log "Real-Time News Scraper Launcher" "INFO"
Write-Log "Mode: $Mode | Articles: $Articles" "INFO"
Write-Log "========================================" "INFO"

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Log "Python version: $pythonVersion" "INFO"
} catch {
    Write-Log "ERROR: Python not found. Install Python 3.9+ and add to PATH." "ERROR"
    exit 1
}

# Check if .env file exists
if (-not (Test-Path $envFile)) {
    Write-Log "WARNING: .env file not found at $envFile" "WARN"
    Write-Log "Create .env with SUPABASE_URL and SUPABASE_KEY" "WARN"
}

# Check if script exists
if (-not (Test-Path $pythonScript)) {
    Write-Log "ERROR: Python script not found: $pythonScript" "ERROR"
    exit 1
}

# Check dependencies
Write-Log "Checking dependencies..." "INFO"
$requiredPackages = @("apscheduler", "beautifulsoup4", "requests", "supabase", "lxml")
$missingPackages = @()

foreach ($package in $requiredPackages) {
    $checkCmd = "python -c `"import $package`" 2>&1"
    $result = Invoke-Expression $checkCmd
    if ($LASTEXITCODE -ne 0) {
        $missingPackages += $package
    }
}

if ($missingPackages.Count -gt 0) {
    Write-Log "ERROR: Missing Python packages: $($missingPackages -join ', ')" "ERROR"
    Write-Log "Run: pip install -r requirements.txt" "ERROR"
    exit 1
} else {
    Write-Log "All dependencies installed ✓" "SUCCESS"
}

# Build Python command
$pythonArgs = @("realtime_scheduler.py", "--mode", $Mode, "--articles", $Articles)

if ($Once) {
    $pythonArgs += "--once"
}

if ($Verbose) {
    $pythonArgs += "--verbose"
}

Write-Log "Running: python $($pythonArgs -join ' ')" "INFO"

# Run Python script
try {
    # Change to script directory (for relative paths)
    Push-Location $scriptPath
    
    # Execute Python script
    $process = Start-Process -FilePath "python" -ArgumentList $pythonArgs -NoNewWindow -Wait -PassThru
    
    Pop-Location
    
    # Check exit code
    if ($process.ExitCode -eq 0) {
        Write-Log "Scraper completed successfully (exit code: 0)" "SUCCESS"
    } else {
        Write-Log "Scraper exited with code: $($process.ExitCode)" "WARN"
    }
    
    exit $process.ExitCode
    
} catch {
    Write-Log "ERROR: Failed to run scraper: $_" "ERROR"
    Pop-Location
    exit 1
}
