<#
.SYNOPSIS
    Quick start script for Live Shoe Tracker development

.DESCRIPTION
    Starts all local services in the correct order:
    1. Sets up environment variables
    2. Starts Next.js web app
    3. Starts API server
    4. Optionally starts Docker scrapers

.PARAMETER SkipScrapers
    Skip starting Docker scraper containers

.EXAMPLE
    .\start-dev.ps1
    .\start-dev.ps1 -SkipScrapers
#>

param(
    [switch]$SkipScrapers
)

$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "STARTING LIVE SHOE TRACKER" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Load environment from .env file if exists
if (Test-Path ".env") {
    Write-Host "Loading environment from .env file..." -ForegroundColor White
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.+)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "✓ Environment loaded`n" -ForegroundColor Green
} else {
    Write-Host "⚠ No .env file found. Run .\setup-integrations.ps1 first`n" -ForegroundColor Yellow
}

# Start Next.js web app in background
Write-Host "Starting Next.js web app..." -ForegroundColor Yellow
$webJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\web-nextjs"
    npm run dev
}
Write-Host "✓ Next.js starting (Job ID: $($webJob.Id))" -ForegroundColor Green
Write-Host "  URL: http://localhost:3002`n" -ForegroundColor Cyan

# Wait for Next.js to start
Start-Sleep -Seconds 5

# Start API server in background
Write-Host "Starting API server..." -ForegroundColor Yellow
$apiJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\api-server"
    npm start
}
Write-Host "✓ API server starting (Job ID: $($apiJob.Id))" -ForegroundColor Green
Write-Host "  URL: http://localhost:4000`n" -ForegroundColor Cyan

# Start Docker scrapers if not skipped
if (-not $SkipScrapers) {
    Write-Host "Starting Docker scrapers..." -ForegroundColor Yellow
    Set-Location "infra"
    docker-compose up -d raffles-scraper news-aggregator shopify-scraper
    Set-Location ".."
    Write-Host "✓ Scrapers started`n" -ForegroundColor Green
    
    Write-Host "View scraper logs:" -ForegroundColor Cyan
    Write-Host "  docker-compose -f infra\docker-compose.yml logs -f raffles-scraper" -ForegroundColor Gray
    Write-Host "  docker-compose -f infra\docker-compose.yml logs -f news-aggregator`n" -ForegroundColor Gray
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ALL SERVICES STARTED!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Access points:" -ForegroundColor White
Write-Host "  • Web App: http://localhost:3002" -ForegroundColor Cyan
Write-Host "  • API Server: http://localhost:4000" -ForegroundColor Cyan
Write-Host "  • Supabase Dashboard: https://supabase.com/dashboard/project/npvqqzuofwojhbdlozgh`n" -ForegroundColor Cyan

Write-Host "Commands:" -ForegroundColor White
Write-Host "  • Stop web: Stop-Job $($webJob.Id)" -ForegroundColor Gray
Write-Host "  • Stop API: Stop-Job $($apiJob.Id)" -ForegroundColor Gray
if (-not $SkipScrapers) {
    Write-Host "  • Stop scrapers: docker-compose -f infra\docker-compose.yml down`n" -ForegroundColor Gray
}

Write-Host "Press Ctrl+C to stop monitoring job output`n" -ForegroundColor Yellow

# Monitor jobs
while ($true) {
    Start-Sleep -Seconds 5
    
    # Check web job
    if ($webJob.State -eq "Failed") {
        Write-Host "⚠ Next.js job failed!" -ForegroundColor Red
        Receive-Job $webJob
        break
    }
    
    # Check API job
    if ($apiJob.State -eq "Failed") {
        Write-Host "⚠ API server job failed!" -ForegroundColor Red
        Receive-Job $apiJob
        break
    }
}
