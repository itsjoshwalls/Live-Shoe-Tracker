# Complete Integration - Connect All Services
# Run this to verify and connect: Firestore, PostgreSQL, Supabase, Frontend

Write-Host "`n🔗 LIVE SHOE TRACKER - COMPLETE CONNECTION TEST`n" -ForegroundColor Cyan

# ============================================================================
# 1. CHECK ALL SERVICES
# ============================================================================

Write-Host "📊 Checking Service Status..." -ForegroundColor Yellow

$services = @(
    @{Name="Next.js Frontend"; Port=3002; Type="HTTP"},
    @{Name="Supabase Studio"; Port=3000; Type="HTTP"},
    @{Name="PostgREST API"; Port=3001; Type="HTTP"},
    @{Name="Supabase Kong Gateway"; Port=8000; Type="HTTP"},
    @{Name="PostgreSQL Database"; Port=5432; Type="TCP"}
)

foreach ($service in $services) {
    $connection = Get-NetTCPConnection -LocalPort $service.Port -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "  ✅ $($service.Name) - Port $($service.Port)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($service.Name) - Port $($service.Port) NOT RUNNING" -ForegroundColor Red
    }
}

# ============================================================================
# 2. TEST POSTGRESQL DATA
# ============================================================================

Write-Host "`n📦 PostgreSQL Database Content..." -ForegroundColor Yellow

try {
    $pgTables = docker exec -it sneaker-tracker-postgres psql -U postgres -d postgres -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;" 2>$null
    Write-Host "  ✅ Tables found:" -ForegroundColor Green
    $pgTables | ForEach-Object { if ($_.Trim()) { Write-Host "     - $($_.Trim())" -ForegroundColor Cyan } }
    
    # Count records
    Write-Host "`n  📊 Record Counts:" -ForegroundColor Cyan
    $counts = docker exec -it sneaker-tracker-postgres psql -U postgres -d postgres -t -c "SELECT COUNT(*) as total_records, 'footlocker_data' as table_name FROM footlocker_data UNION ALL SELECT COUNT(*), 'nike_snkrs_data' FROM nike_snkrs_data UNION ALL SELECT COUNT(*), 'soleretriever_data' FROM soleretriever_data UNION ALL SELECT COUNT(*), 'solesavy_data' FROM solesavy_data;" 2>$null
    $counts | ForEach-Object { if ($_.Trim()) { Write-Host "     $($_.Trim())" -ForegroundColor White } }
} catch {
    Write-Host "  ❌ Could not connect to PostgreSQL" -ForegroundColor Red
}

# ============================================================================
# 3. TEST SUPABASE REST API
# ============================================================================

Write-Host "`n🌐 Testing Supabase REST API (Port 8000)..." -ForegroundColor Yellow

$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/rest/v1/soleretriever_data?limit=1" `
        -Headers @{
            "apikey" = $anonKey
            "Authorization" = "Bearer $anonKey"
        } -TimeoutSec 5
    
    Write-Host "  ✅ Supabase REST API working" -ForegroundColor Green
    Write-Host "     Sample record: $($response[0].title)" -ForegroundColor Cyan
} catch {
    Write-Host "  ❌ Supabase REST API failed: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# 4. TEST FIRESTORE CONNECTION
# ============================================================================

Write-Host "`n🔥 Testing Firestore Connection..." -ForegroundColor Yellow

$servicAccountPath = "C:\Users\sneak\Downloads\live-sneaker-release-tra-df5a4-firebase-adminsdk-fbsvc-d416112b81.json"
if (Test-Path $serviceAccountPath) {
    $env:FIREBASE_SERVICE_ACCOUNT = Get-Content $serviceAccountPath -Raw
    
    try {
        Push-Location "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python"
        $firestoreTest = python firestore_adapter.py --test-query 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Firestore connected" -ForegroundColor Green
            $firestoreTest | Select-String "Found \d+ products" | ForEach-Object {
                Write-Host "     $($_.Line)" -ForegroundColor Cyan
            }
        } else {
            Write-Host "  ❌ Firestore connection failed" -ForegroundColor Red
        }
        Pop-Location
    } catch {
        Write-Host "  ❌ Could not test Firestore" -ForegroundColor Red
        Pop-Location
    }
} else {
    Write-Host "  ⚠️ Service account not found at $serviceAccountPath" -ForegroundColor Yellow
}

# ============================================================================
# 5. TEST FRONTEND
# ============================================================================

Write-Host "`n🌍 Testing Frontend (Port 3002)..." -ForegroundColor Yellow

try {
    $frontendTest = Invoke-WebRequest -Uri "http://localhost:3002" -UseBasicParsing -TimeoutSec 5
    if ($frontendTest.StatusCode -eq 200) {
        Write-Host "  ✅ Frontend is running" -ForegroundColor Green
        Write-Host "     URL: http://localhost:3002" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  ❌ Frontend not responding" -ForegroundColor Red
}

# ============================================================================
# 6. INTEGRATION SUMMARY
# ============================================================================

Write-Host "`n📋 INTEGRATION SUMMARY`n" -ForegroundColor Cyan

Write-Host "Your Current Architecture:" -ForegroundColor White
Write-Host ""
Write-Host "  ┌─────────────────┐" -ForegroundColor Gray
Write-Host "  │  USER BROWSER   │" -ForegroundColor White
Write-Host "  └────────┬────────┘" -ForegroundColor Gray
Write-Host "           │" -ForegroundColor Gray
Write-Host "           ▼" -ForegroundColor Gray
Write-Host "  ┌─────────────────┐    Port 3002" -ForegroundColor Gray
Write-Host "  │  Next.js Web    │ ──────────────────┐" -ForegroundColor Green
Write-Host "  └────────┬────────┘                   │" -ForegroundColor Gray
Write-Host "           │                            │" -ForegroundColor Gray
Write-Host "     ┌─────┴──────┐                     │" -ForegroundColor Gray
Write-Host "     │            │                     │" -ForegroundColor Gray
Write-Host "     ▼            ▼                     ▼" -ForegroundColor Gray
Write-Host "┌──────────┐  ┌──────────┐      ┌─────────────┐" -ForegroundColor Gray
Write-Host "│Firestore │  │ Supabase │      │  Supabase   │  Port 8000" -ForegroundColor Cyan
Write-Host "│ (Cloud)  │  │ REST API │      │    Kong     │" -ForegroundColor Cyan
Write-Host "│  30 docs │  │ Port 3001│      │  Gateway    │" -ForegroundColor Cyan
Write-Host "└──────────┘  └────┬─────┘      └──────┬──────┘" -ForegroundColor Gray
Write-Host "                   │                   │" -ForegroundColor Gray
Write-Host "                   └───────┬───────────┘" -ForegroundColor Gray
Write-Host "                           │" -ForegroundColor Gray
Write-Host "                           ▼" -ForegroundColor Gray
Write-Host "                   ┌───────────────┐    Port 5432" -ForegroundColor Gray
Write-Host "                   │  PostgreSQL   │" -ForegroundColor Magenta
Write-Host "                   │   20 records  │" -ForegroundColor Magenta
Write-Host "                   └───────────────┘" -ForegroundColor Gray
Write-Host ""

Write-Host "Data Sources:" -ForegroundColor Yellow
Write-Host "  • Firestore 'sneakers_canonical': ~30 products (from scrapers)" -ForegroundColor White
Write-Host "  • PostgreSQL 'soleretriever_data': 20 products (from earlier scrapes)" -ForegroundColor White
Write-Host ""

Write-Host "Current Frontend Connection:" -ForegroundColor Yellow
Write-Host "  • Dashboard (http://localhost:3002/dashboard) → Firestore ONLY" -ForegroundColor White
Write-Host "  • Live Releases (http://localhost:3002/live-releases) → Firestore ONLY" -ForegroundColor White
Write-Host ""

Write-Host "Available but NOT Connected:" -ForegroundColor Yellow
Write-Host "  • PostgreSQL has 20 products that frontend doesn't show" -ForegroundColor Red
Write-Host "  • Supabase REST API (port 8000) can serve PostgreSQL data" -ForegroundColor Red
Write-Host "  • Scrapers write to Firestore but NOT to PostgreSQL" -ForegroundColor Red
Write-Host ""

# ============================================================================
# 7. INTEGRATION OPTIONS
# ============================================================================

Write-Host "`n🎯 INTEGRATION OPTIONS`n" -ForegroundColor Cyan

Write-Host "Option 1: UNIFIED DASHBOARD (Show data from BOTH sources)" -ForegroundColor Green
Write-Host "  - Frontend queries Firestore AND PostgreSQL" -ForegroundColor White
Write-Host "  - Merge 30 Firestore + 20 PostgreSQL = 50 total products" -ForegroundColor White
Write-Host "  - Command: I'll create unified-dashboard.tsx" -ForegroundColor Cyan
Write-Host ""

Write-Host "Option 2: DUAL-WRITE SCRAPERS (Write to both Firestore + PostgreSQL)" -ForegroundColor Green
Write-Host "  - Scrapers save to Firestore (real-time)" -ForegroundColor White
Write-Host "  - AND also save to PostgreSQL (via Supabase API)" -ForegroundColor White
Write-Host "  - Keep both databases in sync" -ForegroundColor White
Write-Host ""

Write-Host "Option 3: SYNC JOB (One-way Firestore → PostgreSQL)" -ForegroundColor Green
Write-Host "  - Create background script that syncs hourly" -ForegroundColor White
Write-Host "  - Firestore = source of truth" -ForegroundColor White
Write-Host "  - PostgreSQL = analytics/backup" -ForegroundColor White
Write-Host ""

Write-Host "Option 4: MIGRATE TO SUPABASE ONLY (Drop Firestore)" -ForegroundColor Yellow
Write-Host "  - Migrate all Firestore data to PostgreSQL" -ForegroundColor White
Write-Host "  - Update scrapers to write to Supabase" -ForegroundColor White
Write-Host "  - Use Supabase Realtime for live updates" -ForegroundColor White
Write-Host ""

# ============================================================================
# 8. QUICK ACTIONS
# ============================================================================

Write-Host "`n⚡ QUICK ACTIONS`n" -ForegroundColor Cyan

Write-Host "To see PostgreSQL data in browser RIGHT NOW:" -ForegroundColor Yellow
Write-Host "  Invoke-WebRequest -Uri 'http://localhost:8000/rest/v1/soleretriever_data?limit=20' ```" -ForegroundColor White
Write-Host "    -Headers @{'apikey'='$anonKey'} | ```" -ForegroundColor White
Write-Host "    Select-Object -ExpandProperty Content | ConvertFrom-Json | ```" -ForegroundColor White
Write-Host "    Select-Object title, brand, status, scraped_at | Format-Table" -ForegroundColor White
Write-Host ""

Write-Host "To scrape more data to Firestore:" -ForegroundColor Yellow
Write-Host "  cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python" -ForegroundColor White
Write-Host "  `$env:FIREBASE_SERVICE_ACCOUNT = Get-Content '$serviceAccountPath' -Raw" -ForegroundColor White
Write-Host "  python soleretriever_scraper_firebase.py --collection adidas --limit 20" -ForegroundColor White
Write-Host ""

Write-Host "To migrate Firestore → PostgreSQL:" -ForegroundColor Yellow
Write-Host "  cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python" -ForegroundColor White
Write-Host "  `$env:FIREBASE_SERVICE_ACCOUNT = Get-Content '$serviceAccountPath' -Raw" -ForegroundColor White
Write-Host "  python firestore_adapter.py --migrate-to-postgres --source sneakers_canonical --dest soleretriever_data" -ForegroundColor White
Write-Host ""

Write-Host ""
Write-Host "Integration check complete!" -ForegroundColor Green
Write-Host ""
