# Hybrid Scraper Runner - Node.js + Python
# Runs both JavaScript and Python scrapers in optimal sequence
# PowerShell 7+ required

param(
    [string]$Mode = "quick",  # quick, full, python-only, nodejs-only
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"
$WarningPreference = if ($Verbose) { "Continue" } else { "SilentlyContinue" }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🚀 Live Shoe Tracker - Hybrid Scraper" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Configuration
$ScraperRoot = $PSScriptRoot
$PythonDir = Join-Path $ScraperRoot "python"
$LogDir = Join-Path $ScraperRoot "logs"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# Ensure logs directory
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

# Store lists by mode
$StoreConfig = @{
    "quick" = @{
        "nodejs" = @('undefeated', 'kith', 'concepts', 'bodega')
        "python" = @('goat')
    }
    "full" = @{
        "nodejs" = @(
            'nike', 'snkrs', 'adidas', 'footlocker', 'champs',
            'undefeated', 'kith', 'concepts', 'bodega', 'feature',
            'extraButter', 'atmos', 'lapstonehammer', 'socialStatus',
            'aMaManiere', 'bait', 'oneness', 
            'saintalfred', 'sneakerpolitics', 'notreshop', 'unionla',
            'jimmyjazz', 'packershoes', 'einhalb43'
        )
        "python" = @('goat', 'confirmed_us', 'confirmed_eu')
    }
    "python-only" = @{
        "nodejs" = @()
        "python" = @('goat', 'confirmed_us', 'confirmed_eu', 'confirmed_de')
    }
    "nodejs-only" = @{
        "nodejs" = @(
            'undefeated', 'kith', 'concepts', 'bodega', 'feature',
            'saintalfred', 'sneakerpolitics', 'notreshop', 'unionla',
            'jimmyjazz', 'packershoes', 'einhalb43'
        )
        "python" = @()
    }
}

$Stores = $StoreConfig[$Mode]
if (!$Stores) {
    Write-Host "❌ Invalid mode: $Mode" -ForegroundColor Red
    Write-Host "Valid modes: quick, full, python-only, nodejs-only" -ForegroundColor Yellow
    exit 1
}

# Stats
$Stats = @{
    nodejsSuccess = 0
    nodejsFailed = 0
    nodejsReleases = 0
    pythonSuccess = 0
    pythonFailed = 0
    pythonReleases = 0
}

$StartTime = Get-Date

# ===========================================
# Node.js Scrapers
# ===========================================
if ($Stores.nodejs.Count -gt 0) {
    Write-Host "📦 Running Node.js Scrapers ($($Stores.nodejs.Count) stores)`n" -ForegroundColor Green
    
    foreach ($store in $Stores.nodejs) {
        Write-Host "  ► $store..." -NoNewline -ForegroundColor White
        
        try {
            $output = node index.js $store 2>&1 | Out-String
            
            if ($LASTEXITCODE -eq 0) {
                # Parse release count from output
                if ($output -match '(\d+)\s+releases') {
                    $count = [int]$Matches[1]
                    $Stats.nodejsReleases += $count
                    Write-Host " ✓ $count releases" -ForegroundColor Green
                } else {
                    Write-Host " ✓ Success" -ForegroundColor Green
                }
                $Stats.nodejsSuccess++
            } else {
                Write-Host " ✗ Failed" -ForegroundColor Red
                $Stats.nodejsFailed++
            }
            
            # Log output
            $logFile = Join-Path $LogDir "nodejs-$store-$Timestamp.log"
            $output | Out-File $logFile -Encoding UTF8
            
        } catch {
            Write-Host " ✗ Error: $_" -ForegroundColor Red
            $Stats.nodejsFailed++
        }
        
        Start-Sleep -Milliseconds 1500
    }
    
    Write-Host ""
}

# ===========================================
# Python Scrapers
# ===========================================
if ($Stores.python.Count -gt 0) {
    Write-Host "🐍 Running Python Scrapers ($($Stores.python.Count) scrapers)`n" -ForegroundColor Green
    
    # Check if venv exists
    $venvPath = Join-Path $PythonDir "venv"
    $pythonExe = if (Test-Path $venvPath) {
        Join-Path $venvPath "Scripts\python.exe"
    } else {
        "python"
    }
    
    # Check venv
    if (!(Test-Path $venvPath)) {
        Write-Host "⚠️  Python venv not found. Run setup:" -ForegroundColor Yellow
        Write-Host "   cd python && python -m venv venv && .\venv\Scripts\Activate.ps1 && pip install -r requirements.txt" -ForegroundColor Gray
        Write-Host "   Skipping Python scrapers..." -ForegroundColor Yellow
    } else {
        Push-Location $PythonDir
        
        foreach ($scraper in $Stores.python) {
            Write-Host "  ► $scraper..." -NoNewline -ForegroundColor White
            
            try {
                $scriptFile = ""
                $args = @()
                
                # Map scraper name to file
                switch ($scraper) {
                    "goat" {
                        $scriptFile = "goat_scraper.py"
                    }
                    "confirmed_us" {
                        $scriptFile = "adidas_confirmed_scraper.py"
                        $args = @("US")
                    }
                    "confirmed_eu" {
                        $scriptFile = "adidas_confirmed_scraper.py"
                        $args = @("EU")
                    }
                    "confirmed_de" {
                        $scriptFile = "adidas_confirmed_scraper.py"
                        $args = @("DE")
                    }
                    default {
                        # Assume Shopify generic
                        $scriptFile = "base_scraper.py"
                        $args = @($scraper, "https://$scraper.com")
                    }
                }
                
                $fullScriptPath = Join-Path $PythonDir $scriptFile
                if (!(Test-Path $fullScriptPath)) {
                    Write-Host " ✗ Script not found: $scriptFile" -ForegroundColor Red
                    $Stats.pythonFailed++
                    continue
                }
                
                # Run Python scraper
                $output = & $pythonExe $scriptFile @args 2>&1 | Out-String
                
                if ($LASTEXITCODE -eq 0) {
                    # Parse stats from output
                    if ($output -match 'Releases Found:\s*(\d+)') {
                        $count = [int]$Matches[1]
                        $Stats.pythonReleases += $count
                        Write-Host " ✓ $count releases" -ForegroundColor Green
                    } else {
                        Write-Host " ✓ Success" -ForegroundColor Green
                    }
                    $Stats.pythonSuccess++
                } else {
                    Write-Host " ✗ Failed" -ForegroundColor Red
                    $Stats.pythonFailed++
                }
                
                # Log output
                $logFile = Join-Path $LogDir "python-$scraper-$Timestamp.log"
                $output | Out-File $logFile -Encoding UTF8
                
            } catch {
                Write-Host " ✗ Error: $_" -ForegroundColor Red
                $Stats.pythonFailed++
            }
            
            Start-Sleep -Milliseconds 2000
        }
        
        Pop-Location
        Write-Host ""
    }
}

# ===========================================
# Summary
# ===========================================
$Duration = (Get-Date) - $StartTime
$TotalSuccess = $Stats.nodejsSuccess + $Stats.pythonSuccess
$TotalFailed = $Stats.nodejsFailed + $Stats.pythonFailed
$TotalReleases = $Stats.nodejsReleases + $Stats.pythonReleases

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Node.js Scrapers: $($Stats.nodejsSuccess) success, $($Stats.nodejsFailed) failed ($($Stats.nodejsReleases) releases)" -ForegroundColor $(if ($Stats.nodejsFailed -eq 0) { 'Green' } else { 'Yellow' })
Write-Host "Python Scrapers:  $($Stats.pythonSuccess) success, $($Stats.pythonFailed) failed ($($Stats.pythonReleases) releases)" -ForegroundColor $(if ($Stats.pythonFailed -eq 0) { 'Green' } else { 'Yellow' })
Write-Host "Total:            $TotalSuccess success, $TotalFailed failed ($TotalReleases releases)" -ForegroundColor $(if ($TotalFailed -eq 0) { 'Green' } else { 'Yellow' })
Write-Host "Duration:         $($Duration.TotalSeconds.ToString('0.0'))s" -ForegroundColor Gray
Write-Host "Logs:             $LogDir" -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Cyan

# Save summary JSON
$summaryFile = Join-Path $LogDir "summary-$Timestamp.json"
@{
    mode = $Mode
    timestamp = $Timestamp
    duration_seconds = $Duration.TotalSeconds
    nodejs = @{
        success = $Stats.nodejsSuccess
        failed = $Stats.nodejsFailed
        releases = $Stats.nodejsReleases
    }
    python = @{
        success = $Stats.pythonSuccess
        failed = $Stats.pythonFailed
        releases = $Stats.pythonReleases
    }
    total = @{
        success = $TotalSuccess
        failed = $TotalFailed
        releases = $TotalReleases
    }
} | ConvertTo-Json -Depth 5 | Out-File $summaryFile -Encoding UTF8

Write-Host "✅ Complete! Summary saved to: $summaryFile`n" -ForegroundColor Green
