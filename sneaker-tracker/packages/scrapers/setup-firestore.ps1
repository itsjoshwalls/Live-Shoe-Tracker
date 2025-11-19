# Helper script to add Firebase credentials to .env
# Usage: .\setup-firestore.ps1 C:\path\to\serviceAccount.json

param(
    [Parameter(Mandatory=$false)]
    [string]$ServiceAccountPath
)

$ErrorActionPreference = "Stop"

Write-Host "=== Firestore Setup Helper ===" -ForegroundColor Cyan
Write-Host ""

# If no path provided, prompt user
if (-not $ServiceAccountPath) {
    Write-Host "📁 Please provide your Firebase service account JSON file path:" -ForegroundColor Yellow
    Write-Host "   Example: C:\Users\sneak\Downloads\serviceAccount.json" -ForegroundColor Gray
    Write-Host ""
    $ServiceAccountPath = Read-Host "Path"
}

# Verify file exists
if (-not (Test-Path $ServiceAccountPath)) {
    Write-Host "❌ File not found: $ServiceAccountPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found service account file" -ForegroundColor Green

# Read and validate JSON
try {
    $json = Get-Content $ServiceAccountPath -Raw
    $parsed = $json | ConvertFrom-Json
    
    Write-Host "📋 Project ID: $($parsed.project_id)" -ForegroundColor Cyan
    Write-Host "📧 Client Email: $($parsed.client_email)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Invalid JSON file: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Convert to single-line (compress)
$compressed = $json | ConvertFrom-Json | ConvertTo-Json -Compress

Write-Host ""
Write-Host "🔧 Updating .env file..." -ForegroundColor Yellow

# Check if .env exists
$envPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "  Creating new .env file" -ForegroundColor Gray
    Copy-Item (Join-Path $PSScriptRoot ".env.example") $envPath
}

# Read current .env
$envContent = Get-Content $envPath -Raw

# Update or add FIREBASE_SERVICE_ACCOUNT
if ($envContent -match '(?m)^FIREBASE_SERVICE_ACCOUNT=.*$') {
    # Replace existing
    $envContent = $envContent -replace '(?m)^FIREBASE_SERVICE_ACCOUNT=.*$', "FIREBASE_SERVICE_ACCOUNT=$compressed"
    Write-Host "  ✅ Updated FIREBASE_SERVICE_ACCOUNT" -ForegroundColor Green
} else {
    # Add new
    $envContent += "`nFIREBASE_SERVICE_ACCOUNT=$compressed`n"
    Write-Host "  ✅ Added FIREBASE_SERVICE_ACCOUNT" -ForegroundColor Green
}

# Write back
$envContent | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "✅ Firestore configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🧪 Testing connection..." -ForegroundColor Cyan

# Test the connection
.\test-db-config.ps1

Write-Host ""
Write-Host "🎉 Ready to use Firestore!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Run scraper: npm run scrape:shopify undefeated" -ForegroundColor Gray
Write-Host "  2. Check for dual writes in output (🔥 Firestore + 💾 NDJSON)" -ForegroundColor Gray
Write-Host "  3. Verify data in Firebase Console:" -ForegroundColor Gray
Write-Host "     https://console.firebase.google.com/project/$($parsed.project_id)/firestore" -ForegroundColor Gray
Write-Host ""
