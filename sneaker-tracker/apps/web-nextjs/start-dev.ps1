#!/usr/bin/env pwsh
#
# START-DEV.ps1 - Start Next.js with OneDrive workaround
#

Set-Location $PSScriptRoot

Write-Host "`n🚀 Live Shoe Tracker - Starting Dev Server" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# OneDrive symlink fix
Write-Host "`n🗑️  Clearing .next cache (OneDrive fix)..." -ForegroundColor Yellow
Remove-Item -Path .next -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500
Write-Host "   ✓ Cache cleared" -ForegroundColor Green
Write-Host "   💡 See ONEDRIVE-FIX.md for long-term solutions" -ForegroundColor Gray

Write-Host "`n🎯 Starting Next.js on port 3002..." -ForegroundColor Cyan
Write-Host "   Location: $PSScriptRoot" -ForegroundColor Gray
Write-Host ""

npx next dev -p 3002