#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test all Live Shoe Tracker connections
#>

Write-Host "`n╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   LIVE SHOE TRACKER - CONNECTION TEST      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Wait for server
Write-Host "Waiting for Next.js..." -ForegroundColor Gray
Start-Sleep -Seconds 3

$tests = @()

# Test 1: API Route
Write-Host "1. Testing API Route (Postgres via Next.js)..." -ForegroundColor Yellow
try {
    $api = Invoke-RestMethod -Uri "http://localhost:3002/api/releases?limit=2" -TimeoutSec 5
    Write-Host "   ✅ SUCCESS: $($api.count) total records" -ForegroundColor Green
    if ($api.data.Count -gt 0) {
        Write-Host "   Sample: $($api.data[0].title) ($($api.data[0].brand))" -ForegroundColor Gray
    }
    $tests += @{ Name = "API Route"; Status = "✅" }
} catch {
    Write-Host "   ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $tests += @{ Name = "API Route"; Status = "❌" }
}

# Test 2: Frontend Homepage
Write-Host "`n2. Testing Frontend Homepage..." -ForegroundColor Yellow
try {
    $home = Invoke-WebRequest -Uri "http://localhost:3002/" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ SUCCESS: Status $($home.StatusCode)" -ForegroundColor Green
    $tests += @{ Name = "Homepage"; Status = "✅" }
} catch {
    Write-Host "   ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $tests += @{ Name = "Homepage"; Status = "❌" }
}

# Test 3: Unified Dashboard Page
Write-Host "`n3. Testing Unified Dashboard Page..." -ForegroundColor Yellow
try {
    $unified = Invoke-WebRequest -Uri "http://localhost:3002/unified-dashboard" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ SUCCESS: Status $($unified.StatusCode)" -ForegroundColor Green
    $tests += @{ Name = "Unified Dashboard"; Status = "✅" }
} catch {
    Write-Host "   ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $tests += @{ Name = "Unified Dashboard"; Status = "❌" }
}

# Test 4: PostgREST Direct
Write-Host "`n4. Testing PostgREST (Direct Supabase)..." -ForegroundColor Yellow
try {
    $pg = Invoke-RestMethod -Uri "http://localhost:3001/soleretriever_data?select=title&limit=2" -TimeoutSec 5
    Write-Host "   ✅ SUCCESS: $($pg.Count) records" -ForegroundColor Green
    $tests += @{ Name = "PostgREST"; Status = "✅" }
} catch {
    Write-Host "   ⚠️  SKIPPED: PostgREST not running (optional for local dev)" -ForegroundColor Yellow
    $tests += @{ Name = "PostgREST"; Status = "⚠️" }
}

# Summary
Write-Host "`n╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              TEST SUMMARY                    ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝`n" -ForegroundColor Cyan

foreach ($test in $tests) {
    Write-Host "  $($test.Status) $($test.Name)"
}

$passed = ($tests | Where-Object { $_.Status -eq "✅" }).Count
$total = $tests.Count

Write-Host "`n📊 Result: $passed/$total tests passed" -ForegroundColor Cyan

if ($passed -eq $total) {
    Write-Host "`n🎉 ALL SYSTEMS OPERATIONAL!" -ForegroundColor Green
    Write-Host "`n🌐 Access your tracker:" -ForegroundColor Cyan
    Write-Host "   • Unified Dashboard: http://localhost:3002/unified-dashboard" -ForegroundColor White
    Write-Host "   • Live Releases:     http://localhost:3002/live-releases" -ForegroundColor White
    Write-Host "   • API Endpoint:      http://localhost:3002/api/releases" -ForegroundColor White
} else {
    Write-Host "`n⚠️  Some tests failed. Check errors above." -ForegroundColor Yellow
}

Write-Host ""
