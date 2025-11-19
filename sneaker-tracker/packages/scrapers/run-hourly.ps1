# Automated Hourly Scraping Script
# Run this script via Windows Task Scheduler every hour

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "=== Sneaker Tracker Hourly Run ===" -ForegroundColor Cyan
Write-Host "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

# Load environment variables (if .env exists)
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "  Loaded env: $key" -ForegroundColor DarkGray
        }
    }
}

# Run all enabled Shopify scrapers
Write-Host "`n📦 Running Shopify scrapers..." -ForegroundColor Yellow
$shopifyStores = @('undefeated', 'kith', 'concepts', 'bodega', 'feature', 'bait', 'oneness', 'saintalfred', 'notreshop', 'unionla')
npm run scrape:shopify $shopifyStores

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️ Shopify scraping had errors" -ForegroundColor Red
}

# Import all new NDJSON files to Supabase AND Firestore
Write-Host "`n💾 Importing to databases..." -ForegroundColor Yellow

$outputFiles = Get-ChildItem output\*.ndjson -File | 
    Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-2) } |
    Sort-Object LastWriteTime -Descending

if ($outputFiles.Count -eq 0) {
    Write-Host "  No new files to import" -ForegroundColor Gray
} else {
    Write-Host "  Found $($outputFiles.Count) new file(s)" -ForegroundColor Gray
    
    foreach ($file in $outputFiles) {
        Write-Host "  Importing: $($file.Name)" -ForegroundColor Cyan
        
        # Import to Supabase (if configured)
        if ($env:SUPABASE_URL) {
            npm run import:supabase $file.FullName
            if ($LASTEXITCODE -eq 0) {
                Write-Host "    ✅ Supabase success" -ForegroundColor Green
            } else {
                Write-Host "    ❌ Supabase failed" -ForegroundColor Red
            }
        }
        
        # Import to Firestore (if configured)
        if ($env:FIREBASE_SERVICE_ACCOUNT) {
            npm run import:firestore $file.FullName
            if ($LASTEXITCODE -eq 0) {
                Write-Host "    ✅ Firestore success" -ForegroundColor Green
            } else {
                Write-Host "    ❌ Firestore failed" -ForegroundColor Red
            }
        }
    }
}

# Optional: Clean up old NDJSON files (keep last 48 hours)
Write-Host "`n🧹 Cleaning old files..." -ForegroundColor Yellow
$oldFiles = Get-ChildItem output\*.ndjson -File | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddHours(-48) }

if ($oldFiles.Count -gt 0) {
    Write-Host "  Removing $($oldFiles.Count) old file(s)" -ForegroundColor Gray
    $oldFiles | Remove-Item -Force
} else {
    Write-Host "  No old files to remove" -ForegroundColor Gray
}

Write-Host "`n✅ Hourly run completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
Write-Host "================================================`n" -ForegroundColor Cyan
