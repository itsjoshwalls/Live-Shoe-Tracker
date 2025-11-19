# Run All Scrapers - Automated Collection Script
# This script runs multiple scrapers in sequence and tracks results
# ===================================================================

param(
    [switch]$DryRun,
    [string[]]$Stores = @('undefeated', 'concepts', 'kith', 'bodega', 'feature', 'extraButter', 'atmos', 'lapstonehammer', 'socialStatus', 'aMaManiere')
)

$ErrorActionPreference = "Continue"
$StartTime = Get-Date

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Live Sneaker Tracker - Scraper Run" -ForegroundColor Cyan
Write-Host "  Started: $($StartTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to scrapers directory
Set-Location $PSScriptRoot

# Check environment
if (-not (Test-Path .env)) {
    Write-Host "❌ ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "   Please create .env with FIREBASE_SERVICE_ACCOUNT and SUPABASE credentials" -ForegroundColor Yellow
    exit 1
}

# Create logs directory
$LogDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$LogFile = Join-Path $LogDir "scraper-run-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$ResultsFile = Join-Path $LogDir "scraper-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"

# Results tracking
$Results = @{
    startTime = $StartTime
    stores = @{}
    summary = @{
        totalReleases = 0
        successfulStores = 0
        failedStores = 0
        firestoreWrites = 0
    }
}

Write-Host "📝 Logging to: $LogFile" -ForegroundColor Gray
Write-Host ""

# Run each scraper
foreach ($store in $Stores) {
    Write-Host "🏪 Running scraper: $store" -ForegroundColor White
    Write-Host "   $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
    
    try {
        $Output = node index.js $store 2>&1
        $ExitCode = $LASTEXITCODE
        
        # Log output
        $Output | Out-File -Append $LogFile
        
        # Parse results
        $ReleasesLine = $Output | Select-String "\[.*\] (\d+) releases"
        $FirestoreLine = $Output | Select-String "Firestore: ✅ (\d+)"
        
        $ReleasesCount = 0
        $FirestoreCount = 0
        
        if ($ReleasesLine) {
            $ReleasesCount = [int]$ReleasesLine.Matches.Groups[1].Value
        }
        
        if ($FirestoreLine) {
            $FirestoreCount = [int]$FirestoreLine.Matches.Groups[1].Value
        }
        
        # Store results
        $Results.stores[$store] = @{
            releases = $ReleasesCount
            firestoreWrites = $FirestoreCount
            success = ($ExitCode -eq 0)
            exitCode = $ExitCode
        }
        
        # Update summary
        $Results.summary.totalReleases += $ReleasesCount
        $Results.summary.firestoreWrites += $FirestoreCount
        
        if ($ExitCode -eq 0) {
            $Results.summary.successfulStores++
            Write-Host "   ✅ Success: $ReleasesCount releases, $FirestoreCount to Firestore" -ForegroundColor Green
        } else {
            $Results.summary.failedStores++
            Write-Host "   ❌ Failed with exit code: $ExitCode" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "   ❌ Error: $_" -ForegroundColor Red
        $Results.stores[$store] = @{
            error = $_.Exception.Message
            success = $false
        }
        $Results.summary.failedStores++
    }
    
    Write-Host ""
}

# Calculate duration
$EndTime = Get-Date
$Duration = $EndTime - $StartTime
$Results.endTime = $EndTime
$Results.duration = @{
    totalSeconds = $Duration.TotalSeconds
    formatted = "{0:hh\:mm\:ss}" -f $Duration
}

# Save results to JSON
$Results | ConvertTo-Json -Depth 5 | Out-File $ResultsFile

# Print summary
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Duration: $($Results.duration.formatted)" -ForegroundColor White
Write-Host "Total Releases: $($Results.summary.totalReleases)" -ForegroundColor White
Write-Host "Firestore Writes: $($Results.summary.firestoreWrites)" -ForegroundColor White
Write-Host "Successful Stores: $($Results.summary.successfulStores)" -ForegroundColor Green
Write-Host "Failed Stores: $($Results.summary.failedStores)" -ForegroundColor Red
Write-Host ""
Write-Host "📊 Detailed results saved to: $ResultsFile" -ForegroundColor Gray
Write-Host ""

exit ($Results.summary.failedStores -eq 0 ? 0 : 1)
