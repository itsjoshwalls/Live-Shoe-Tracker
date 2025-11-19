<#
.SYNOPSIS
    Complete integration setup for Live Shoe Tracker
    Sets up Firebase, Supabase, Google Analytics, GitHub, and Docker

.DESCRIPTION
    This script configures all necessary integrations for local development:
    - Supabase (production database)
    - Firebase (authentication & Firestore)
    - Google Analytics (tracking)
    - GitHub (repository connection)
    - Docker (containerized scrapers)

.EXAMPLE
    .\setup-integrations.ps1
#>

param(
    [switch]$SkipDocker,
    [switch]$SkipGitHub,
    [switch]$Interactive = $true
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "LIVE SHOE TRACKER - INTEGRATION SETUP" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# ============================================================================
# 1. SUPABASE SETUP
# ============================================================================
Write-Host "Step 1/5: Supabase Configuration" -ForegroundColor Green
Write-Host "----------------------------------------`n" -ForegroundColor Gray

$SUPABASE_URL = "https://npvqqzuofwojhbdlozgh.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdnFxenVvZndvamhiZGxvemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNzk2MTQsImV4cCI6MjA3ODY1NTYxNH0.4FjKNA85WkaF6K_9lj9L2-hnAsIDxz1dR_h1OMqyg8E"
$SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdnFxenVvZndvamhiZGxvemdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA3OTYxNCwiZXhwIjoyMDc4NjU1NjE0fQ.X-NWR22vzkXbGl5GNBdFYQF47Y2r7B8Tz1J2rgH_kmk"

# Set environment variables
$env:SUPABASE_URL = $SUPABASE_URL
$env:SUPABASE_ANON_KEY = $SUPABASE_ANON_KEY
$env:SUPABASE_SERVICE_ROLE_KEY = $SUPABASE_SERVICE_ROLE_KEY
$env:SUPABASE_SERVICE_KEY = $SUPABASE_SERVICE_ROLE_KEY  # Alias for compatibility

Write-Host "✓ Supabase URL: $SUPABASE_URL" -ForegroundColor White
Write-Host "✓ Anon Key: $($SUPABASE_ANON_KEY.Substring(0, 30))..." -ForegroundColor White
Write-Host "✓ Service Role Key: $($SUPABASE_SERVICE_ROLE_KEY.Substring(0, 30))...`n" -ForegroundColor White

# ============================================================================
# 2. FIREBASE SETUP
# ============================================================================
Write-Host "Step 2/5: Firebase Configuration" -ForegroundColor Green
Write-Host "----------------------------------------`n" -ForegroundColor Gray

$FIREBASE_CLIENT_CONFIG = '{"projectId":"live-sneaker-release-tra-df5a4","apiKey":"AIzaSyCwGR3zbZ5d7IADy8mfXGK6nXKV2qftLU8","authDomain":"live-sneaker-release-tra-df5a4.firebaseapp.com","storageBucket":"live-sneaker-release-tra-df5a4.firebasestorage.app","messagingSenderId":"502208285918","appId":"1:502208285918:web:ffa300e2d11831fd9e464f","measurementId":"G-MBQ55CK0BJ"}'

$env:NEXT_PUBLIC_FIREBASE_CONFIG = $FIREBASE_CLIENT_CONFIG
$env:VITE_FIREBASE_CONFIG_JSON = $FIREBASE_CLIENT_CONFIG

Write-Host "✓ Firebase Client Config Set" -ForegroundColor White
Write-Host "  Project: live-sneaker-release-tra-df5a4`n" -ForegroundColor Gray

# Check for Firebase service account
$serviceAccountPath = "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\firebase-service-account.json"
if (Test-Path $serviceAccountPath) {
    $env:FIREBASE_SERVICE_ACCOUNT = Get-Content $serviceAccountPath -Raw
    Write-Host "✓ Firebase Service Account loaded from:" -ForegroundColor White
    Write-Host "  $serviceAccountPath`n" -ForegroundColor Gray
} else {
    Write-Host "⚠ Firebase Service Account not found at:" -ForegroundColor Yellow
    Write-Host "  $serviceAccountPath" -ForegroundColor Gray
    Write-Host "  Download from: https://console.firebase.google.com/project/live-sneaker-release-tra-df5a4/settings/serviceaccounts/adminsdk`n" -ForegroundColor Gray
}

# ============================================================================
# 3. GOOGLE ANALYTICS SETUP
# ============================================================================
Write-Host "Step 3/5: Google Analytics Configuration" -ForegroundColor Green
Write-Host "----------------------------------------`n" -ForegroundColor Gray

$GA_MEASUREMENT_ID = "G-MBQ55CK0BJ"
$GA_API_SECRET = "0M7G1M1fRkmGl3LLVdFhgA"

$env:NEXT_PUBLIC_GA_MEASUREMENT_ID = $GA_MEASUREMENT_ID
$env:GA_API_SECRET = $GA_API_SECRET

Write-Host "✓ GA Measurement ID: $GA_MEASUREMENT_ID" -ForegroundColor White
Write-Host "✓ GA API Secret: $($GA_API_SECRET.Substring(0, 10))...`n" -ForegroundColor White

# ============================================================================
# 4. GITHUB SETUP
# ============================================================================
if (-not $SkipGitHub) {
    Write-Host "Step 4/5: GitHub Configuration" -ForegroundColor Green
    Write-Host "----------------------------------------`n" -ForegroundColor Gray

    # Check if git is initialized
    if (Test-Path ".git") {
        Write-Host "✓ Git repository already initialized" -ForegroundColor White
        
        # Get current remote
        $remote = git remote get-url origin 2>$null
        if ($remote) {
            Write-Host "✓ GitHub remote: $remote`n" -ForegroundColor White
        } else {
            Write-Host "⚠ No GitHub remote configured" -ForegroundColor Yellow
            if ($Interactive) {
                $setupGitHub = Read-Host "Configure GitHub remote now? (y/n)"
                if ($setupGitHub -eq 'y') {
                    $repoUrl = Read-Host "Enter GitHub repository URL (e.g., https://github.com/username/live-shoe-tracker.git)"
                    git remote add origin $repoUrl
                    Write-Host "✓ GitHub remote added`n" -ForegroundColor Green
                }
            }
        }
    } else {
        Write-Host "⚠ Git not initialized in this directory" -ForegroundColor Yellow
        if ($Interactive) {
            $initGit = Read-Host "Initialize git repository now? (y/n)"
            if ($initGit -eq 'y') {
                git init
                Write-Host "✓ Git repository initialized`n" -ForegroundColor Green
            }
        }
    }
}

# ============================================================================
# 5. DOCKER SETUP
# ============================================================================
if (-not $SkipDocker) {
    Write-Host "Step 5/5: Docker Configuration" -ForegroundColor Green
    Write-Host "----------------------------------------`n" -ForegroundColor Gray

    # Check if Docker is running
    $dockerRunning = docker info 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker is running" -ForegroundColor White
        
        # Create .env file for docker-compose
        $dockerEnvPath = "infra\.env"
        $dockerEnvContent = @"
# Supabase
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Scraper Intervals (seconds)
SHOPIFY_SCRAPE_INTERVAL=300
SNKRS_SCRAPE_INTERVAL=180
CONFIRMED_SCRAPE_INTERVAL=180
SUPREME_SCRAPE_INTERVAL=300
RAFFLES_SCRAPE_INTERVAL=600
QUEUES_SCRAPE_INTERVAL=120
STOCKX_SCRAPE_INTERVAL=3600

# Database (if using local postgres)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=sneaker_tracker
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/sneaker_tracker
"@
        
        Set-Content -Path $dockerEnvPath -Value $dockerEnvContent
        Write-Host "✓ Created Docker environment file: $dockerEnvPath`n" -ForegroundColor White
        
        if ($Interactive) {
            $startDocker = Read-Host "Start Docker containers now? (y/n)"
            if ($startDocker -eq 'y') {
                Write-Host "`nStarting Docker containers..." -ForegroundColor Yellow
                cd infra
                docker-compose up -d
                cd ..
                Write-Host "✓ Docker containers started`n" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "⚠ Docker is not running" -ForegroundColor Yellow
        Write-Host "  Please start Docker Desktop and run this script again`n" -ForegroundColor Gray
    }
}

# ============================================================================
# CREATE MASTER .ENV FILE
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Creating Master .env File" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

$masterEnvPath = ".env"
$masterEnvContent = @"
# =============================================================================
# LIVE SHOE TRACKER - MASTER ENVIRONMENT CONFIGURATION
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# =============================================================================

# -----------------------------------------------------------------------------
# SUPABASE (Production Database)
# -----------------------------------------------------------------------------
SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# -----------------------------------------------------------------------------
# FIREBASE (Authentication & Firestore)
# -----------------------------------------------------------------------------
# Client-side config (Next.js, Vite)
NEXT_PUBLIC_FIREBASE_CONFIG=$FIREBASE_CLIENT_CONFIG
VITE_FIREBASE_CONFIG_JSON=$FIREBASE_CLIENT_CONFIG
NEXT_PUBLIC_FIREBASE_ENV=production

# Server-side service account (set manually or via script)
# FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# -----------------------------------------------------------------------------
# GOOGLE ANALYTICS
# -----------------------------------------------------------------------------
NEXT_PUBLIC_GA_MEASUREMENT_ID=$GA_MEASUREMENT_ID
GA_API_SECRET=$GA_API_SECRET

# -----------------------------------------------------------------------------
# FIRESTORE COLLECTIONS
# -----------------------------------------------------------------------------
VITE_FIRESTORE_COLLECTION=sneakers_canonical
NEXT_PUBLIC_FIRESTORE_MILEAGE_COLLECTION=sneakers

# -----------------------------------------------------------------------------
# SCRAPER INTERVALS (Docker)
# -----------------------------------------------------------------------------
SHOPIFY_SCRAPE_INTERVAL=300
SNKRS_SCRAPE_INTERVAL=180
CONFIRMED_SCRAPE_INTERVAL=180
SUPREME_SCRAPE_INTERVAL=300
RAFFLES_SCRAPE_INTERVAL=600
QUEUES_SCRAPE_INTERVAL=120
STOCKX_SCRAPE_INTERVAL=3600

# -----------------------------------------------------------------------------
# OPTIONAL: ML/AI SERVICES
# -----------------------------------------------------------------------------
# ML_API_URL=
# ML_API_KEY=
"@

Set-Content -Path $masterEnvPath -Value $masterEnvContent
Write-Host "✓ Created master .env file: $masterEnvPath`n" -ForegroundColor Green

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Environment variables set in current session:" -ForegroundColor White
Write-Host "  ✓ SUPABASE_URL" -ForegroundColor Green
Write-Host "  ✓ SUPABASE_ANON_KEY" -ForegroundColor Green
Write-Host "  ✓ SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Green
Write-Host "  ✓ NEXT_PUBLIC_FIREBASE_CONFIG" -ForegroundColor Green
Write-Host "  ✓ NEXT_PUBLIC_GA_MEASUREMENT_ID" -ForegroundColor Green

if ($env:FIREBASE_SERVICE_ACCOUNT) {
    Write-Host "  ✓ FIREBASE_SERVICE_ACCOUNT" -ForegroundColor Green
} else {
    Write-Host "  ⚠ FIREBASE_SERVICE_ACCOUNT (not set)" -ForegroundColor Yellow
}

Write-Host "`nFiles created:" -ForegroundColor White
Write-Host "  • .env (master configuration)" -ForegroundColor Cyan
if (Test-Path "infra\.env") {
    Write-Host "  • infra\.env (Docker configuration)" -ForegroundColor Cyan
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Start Next.js: cd apps\web-nextjs && npm run dev" -ForegroundColor White
Write-Host "  2. Start API server: cd apps\api-server && npm start" -ForegroundColor White
Write-Host "  3. Run scrapers: cd infra && docker-compose up -d" -ForegroundColor White
Write-Host "  4. View app: http://localhost:3002`n" -ForegroundColor White

Write-Host "To persist environment variables for future sessions:" -ForegroundColor Cyan
Write-Host '  Add them to your PowerShell profile or use: dotenv' -ForegroundColor Gray
Write-Host "`n"
