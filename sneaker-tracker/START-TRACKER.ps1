#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Live Shoe Tracker - Complete Setup & Launch Script
.DESCRIPTION
    Sets up environment, validates config, and starts the unified tracking system.
    Scrapers → Firestore → Sync → Postgres → Unified UI
#>

param(
    [switch]$SkipInstall,
    [switch]$OnlyFrontend,
    [switch]$RunScraper,
    [int]$ScraperLimit = 50
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = $PSScriptRoot

Write-Host "`n🚀 Live Shoe Tracker - Unified Setup`n" -ForegroundColor Cyan

# Step 1: Validate environment
Write-Host "Step 1: Validating environment..." -ForegroundColor Yellow

$frontendDir = Join-Path $workspaceRoot "apps\web-nextjs"
$scrapersDir = Join-Path $workspaceRoot "packages\scrapers\python"
$serviceAccountPath = "C:\Users\sneak\Downloads\live-sneaker-release-tra-df5a4-firebase-adminsdk-fbsvc-d416112b81.json"

if (-not (Test-Path $serviceAccountPath)) {
    Write-Host "❌ Firebase service account not found at: $serviceAccountPath" -ForegroundColor Red
    Write-Host "   Download from Firebase Console > Project Settings > Service Accounts" -ForegroundColor Gray
    exit 1
}

$envLocalPath = Join-Path $frontendDir ".env.local"
if (-not (Test-Path $envLocalPath)) {
    Write-Host "❌ .env.local not found at: $envLocalPath" -ForegroundColor Red
    Write-Host "   This file should have been created. Check the workspace." -ForegroundColor Gray
    exit 1
}

Write-Host "✓ Environment validated" -ForegroundColor Green

# Step 2: Install dependencies
if (-not $SkipInstall) {
    Write-Host "`nStep 2: Installing dependencies..." -ForegroundColor Yellow
    
    Push-Location $frontendDir
    try {
        pnpm install
        Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
    } finally {
        Pop-Location
    }
    
    Push-Location $scrapersDir
    try {
        python -m pip install -q -r requirements.txt 2>$null
        Write-Host "✓ Python dependencies installed" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Python install skipped (may already be installed)" -ForegroundColor Yellow
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`nStep 2: Skipped (--SkipInstall)" -ForegroundColor Gray
}

# Step 3: Run scraper (optional)
if ($RunScraper) {
    Write-Host "`nStep 3: Running scraper..." -ForegroundColor Yellow
    
    $env:FIREBASE_SERVICE_ACCOUNT = Get-Content $serviceAccountPath -Raw
    
    Push-Location $scrapersDir
    try {
        python soleretriever_scraper_firebase.py --collection all --limit $ScraperLimit
        Write-Host "✓ Scraper completed ($ScraperLimit items)" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Scraper had warnings (check output above)" -ForegroundColor Yellow
    } finally {
        Pop-Location
        Remove-Item Env:\FIREBASE_SERVICE_ACCOUNT -ErrorAction SilentlyContinue
    }
    
    # Sync to Postgres
    Write-Host "`nSyncing Firestore → Postgres..." -ForegroundColor Yellow
    $syncScript = Join-Path $workspaceRoot "scripts\run_sync.ps1"
    if (Test-Path $syncScript) {
        pwsh -NoProfile -ExecutionPolicy Bypass -File $syncScript -Once -SupabaseUrl "https://npvqqzuofwojhbdlozgh.supabase.co"
        Write-Host "✓ Sync completed" -ForegroundColor Green
    } else {
        Write-Host "⚠ Sync script not found, skipping" -ForegroundColor Yellow
    }
} else {
    Write-Host "`nStep 3: Scraper skipped (use -RunScraper to enable)" -ForegroundColor Gray
}

# Step 4: Check ports
Write-Host "`nStep 4: Checking ports..." -ForegroundColor Yellow

$port3002 = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($port3002) {
    Write-Host "⚠ Port 3002 already in use (Next.js may already be running)" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne 'y') { exit 0 }
} else {
    Write-Host "✓ Port 3002 available" -ForegroundColor Green
}

# Step 5: Start frontend
Write-Host "`nStep 5: Starting Next.js frontend..." -ForegroundColor Yellow
Write-Host "URL: http://localhost:3002/unified-dashboard" -ForegroundColor Cyan

Push-Location $frontendDir
try {
    Write-Host "`nPress Ctrl+C to stop the server`n" -ForegroundColor Gray
    pnpm run dev
} finally {
    Pop-Location
}
