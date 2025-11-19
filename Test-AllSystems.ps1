# Application Test Suite
# Tests all running applications and scrapers

Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Live Shoe Tracker - Complete System Test Suite        ║" -ForegroundColor Cyan  
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$results = @{
    Docker = @{}
    Databases = @{}
    WebApps = @{}
    APIs = @{}
    Scrapers = @{}
}

# === DOCKER CONTAINERS ===
Write-Host "█ Testing Docker Containers..." -ForegroundColor Yellow
$containers = docker ps --filter "name=sneaker-tracker" --format "{{.Names}},{{.Status}}" | ForEach-Object {
    $parts = $_ -split ','
    $name = $parts[0] -replace 'sneaker-tracker-', ''
    $status = if ($parts[1] -match 'healthy') { '✅ Healthy' } 
              elseif ($parts[1] -match 'unhealthy') { '⚠️ Unhealthy' }
              else { '✅ Running' }
    $results.Docker[$name] = $status
    Write-Host "  $name`: $status" -ForegroundColor $(if ($status -match '✅') { 'Green' } else { 'Yellow' })
}

# === DATABASE TABLES ===
Write-Host "`n█ Testing Database Tables..." -ForegroundColor Yellow
$tables = @('solesavy_data', 'soleretriever_data', 'footlocker_data', 'nike_snkrs_data', 'news_articles')
foreach ($table in $tables) {
    try {
        $count = docker exec sneaker-tracker-postgres psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM $table;" 2>&1
        if ($count -match '\d+') {
            $results.Databases[$table] = "✅ $($count.Trim()) rows"
            Write-Host "  $table`: ✅ $($count.Trim()) rows" -ForegroundColor Green
        } else {
            $results.Databases[$table] = "❌ Not found"
            Write-Host "  $table`: ❌ Not found" -ForegroundColor Red
        }
    } catch {
        $results.Databases[$table] = "❌ Error"
        Write-Host "  $table`: ❌ Error" -ForegroundColor Red
    }
}

# === WEB APPLICATIONS ===
Write-Host "`n█ Testing Web Applications..." -ForegroundColor Yellow

# API Server
try {
    $api = Invoke-WebRequest -Uri "http://localhost:4000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $results.WebApps['API Server'] = "✅ Running (port 4000)"
    Write-Host "  API Server: ✅ http://localhost:4000 ($($api.StatusCode))" -ForegroundColor Green
} catch {
    $results.WebApps['API Server'] = "❌ Not responding"
    Write-Host "  API Server: ❌ Not responding" -ForegroundColor Red
}

# Next.js Web
try {
    $web = Invoke-WebRequest -Uri "http://localhost:3002" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $results.WebApps['Next.js Web'] = "✅ Running (port 3002)"
    Write-Host "  Next.js Web: ✅ http://localhost:3002 ($($web.StatusCode))" -ForegroundColor Green
} catch {
    $results.WebApps['Next.js Web'] = "❌ Not responding"
    Write-Host "  Next.js Web: ❌ Not responding" -ForegroundColor Red
}

# Supabase Studio
try {
    $studio = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $results.WebApps['Supabase Studio'] = "✅ Running (port 3000)"
    Write-Host "  Supabase Studio: ✅ http://localhost:3000 ($($studio.StatusCode))" -ForegroundColor Green
} catch {
    $results.WebApps['Supabase Studio'] = "⚠️ Unhealthy (starting)"
    Write-Host "  Supabase Studio: ⚠️ Starting..." -ForegroundColor Yellow
}

# === PYTHON SCRAPERS ===
Write-Host "`n█ Testing Python Scrapers..." -ForegroundColor Yellow

Push-Location "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python"

# Test each scraper
$scraperTests = @(
    @{Name='Sole Retriever'; Command='python soleretriever_scraper.py --collection jordan --limit 3 --no-save'},
    @{Name='SoleSavy'; Command='python solesavy_scraper.py --mode news --limit 3 --no-save'},
    @{Name='Foot Locker'; Command='python footlocker_scraper.py --category jordan --limit 3 --no-save'},
    @{Name='Nike SNKRS'; Command='python nike_snkrs_scraper.py --mode upcoming --limit 3 --no-save'}
)

foreach ($test in $scraperTests) {
    Write-Host "  Testing $($test.Name)..." -ForegroundColor Cyan -NoNewline
    try {
        $output = Invoke-Expression "$($test.Command) 2>&1" | Out-String
        if ($output -match 'scraped: (\d+)') {
            $count = $matches[1]
            if ($count -gt 0) {
                $results.Scrapers[$test.Name] = "✅ $count products"
                Write-Host " ✅ $count products" -ForegroundColor Green
            } else {
                $results.Scrapers[$test.Name] = "⚠️ 0 products (selectors need update)"
                Write-Host " ⚠️ 0 products" -ForegroundColor Yellow
            }
        } else {
            $results.Scrapers[$test.Name] = "⚠️ Unknown"
            Write-Host " ⚠️ Unable to parse" -ForegroundColor Yellow
        }
    } catch {
        $results.Scrapers[$test.Name] = "❌ Error"
        Write-Host " ❌ Error" -ForegroundColor Red
    }
}

Pop-Location

# === SUMMARY ===
Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    TEST SUMMARY                          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Docker Containers:" -ForegroundColor Yellow
$results.Docker.GetEnumerator() | ForEach-Object { Write-Host "  $($_.Key): $($_.Value)" }

Write-Host "`nDatabases:" -ForegroundColor Yellow
$results.Databases.GetEnumerator() | ForEach-Object { Write-Host "  $($_.Key): $($_.Value)" }

Write-Host "`nWeb Applications:" -ForegroundColor Yellow
$results.WebApps.GetEnumerator() | ForEach-Object { Write-Host "  $($_.Key): $($_.Value)" }

Write-Host "`nScrapers:" -ForegroundColor Yellow
$results.Scrapers.GetEnumerator() | ForEach-Object { Write-Host "  $($_.Key): $($_.Value)" }

Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                   QUICK ACCESS URLS                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
Write-Host "  Next.js Web:      http://localhost:3002" -ForegroundColor Green
Write-Host "  API Server:       http://localhost:4000" -ForegroundColor Green
Write-Host "  Supabase Studio:  http://localhost:3000" -ForegroundColor Green
Write-Host "  Supabase API:     http://localhost:8000" -ForegroundColor Green
Write-Host ""

# === RECOMMENDATIONS ===
$warnings = @()
$criticalIssues = @()

if ($results.Scrapers.Values -match '⚠️ 0 products') {
    $warnings += "Scrapers returning 0 products - CSS selectors need updating"
}

if ($results.WebApps.Values -match '❌') {
    $criticalIssues += "Some web apps are not running"
}

if ($warnings.Count -gt 0) {
    Write-Host "⚠️  WARNINGS:" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "   • $_" -ForegroundColor Yellow }
    Write-Host ""
}

if ($criticalIssues.Count -gt 0) {
    Write-Host "❌ CRITICAL ISSUES:" -ForegroundColor Red
    $criticalIssues | ForEach-Object { Write-Host "   • $_" -ForegroundColor Red }
    Write-Host ""
}

Write-Host "✅ System test complete!`n" -ForegroundColor Green
