# Firebase & Google Analytics Setup Script
# Quick setup for Firestore + GA4 integration

Write-Host "=== Firebase & Google Analytics Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Python installation
Write-Host "[1/7] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Install from https://www.python.org/" -ForegroundColor Red
    exit 1
}

# Step 2: Install Firebase dependencies
Write-Host ""
Write-Host "[2/7] Installing Firebase dependencies..." -ForegroundColor Yellow
$requirementsFile = Join-Path $PSScriptRoot "requirements-firebase.txt"

if (Test-Path $requirementsFile) {
    pip install -r $requirementsFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✗ requirements-firebase.txt not found" -ForegroundColor Red
    exit 1
}

# Step 3: Check for service account file
Write-Host ""
Write-Host "[3/7] Checking Firebase service account..." -ForegroundColor Yellow

$serviceAccountPath = $null

# Check common locations
$commonPaths = @(
    "C:\keys\firebase-service-account.json",
    "C:\Users\$env:USERNAME\firebase-service-account.json",
    "$PSScriptRoot\firebase-service-account.json",
    "$PSScriptRoot\..\..\..\firebase-service-account.json"
)

foreach ($path in $commonPaths) {
    if (Test-Path $path) {
        $serviceAccountPath = $path
        Write-Host "✓ Found service account: $path" -ForegroundColor Green
        break
    }
}

if (-not $serviceAccountPath) {
    Write-Host "⚠ Service account not found in common locations" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please download your Firebase service account JSON:" -ForegroundColor Cyan
    Write-Host "1. Go to https://console.firebase.google.com/"
    Write-Host "2. Select your project"
    Write-Host "3. Project Settings → Service Accounts"
    Write-Host "4. Click 'Generate new private key'"
    Write-Host "5. Save as 'firebase-service-account.json'"
    Write-Host ""
    
    $manualPath = Read-Host "Enter path to service account JSON (or press Enter to skip)"
    if ($manualPath -and (Test-Path $manualPath)) {
        $serviceAccountPath = $manualPath
        Write-Host "✓ Service account loaded" -ForegroundColor Green
    } else {
        Write-Host "⚠ Skipping Firebase test (set FIREBASE_SERVICE_ACCOUNT env var later)" -ForegroundColor Yellow
    }
}

# Step 4: Set Firebase environment variable
if ($serviceAccountPath) {
    Write-Host ""
    Write-Host "[4/7] Setting FIREBASE_SERVICE_ACCOUNT..." -ForegroundColor Yellow
    $env:FIREBASE_SERVICE_ACCOUNT = Get-Content $serviceAccountPath -Raw
    Write-Host "✓ Environment variable set (session only)" -ForegroundColor Green
    
    # Offer to set permanently
    $setPermanent = Read-Host "Set permanently for this user? (y/n)"
    if ($setPermanent -eq 'y') {
        [System.Environment]::SetEnvironmentVariable('FIREBASE_SERVICE_ACCOUNT', $env:FIREBASE_SERVICE_ACCOUNT, 'User')
        Write-Host "✓ Set permanently (restart terminal to take effect)" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "[4/7] Skipping Firebase environment variable" -ForegroundColor Yellow
}

# Step 5: Google Analytics setup
Write-Host ""
Write-Host "[5/7] Setting up Google Analytics..." -ForegroundColor Yellow

if (-not $env:GA_MEASUREMENT_ID) {
    Write-Host ""
    Write-Host "Get your GA4 Measurement ID:" -ForegroundColor Cyan
    Write-Host "1. Go to https://analytics.google.com/"
    Write-Host "2. Admin → Data Streams → Web"
    Write-Host "3. Copy Measurement ID (format: G-XXXXXXXXXX)"
    Write-Host ""
    
    $measurementId = Read-Host "Enter GA4 Measurement ID (or press Enter to skip)"
    if ($measurementId) {
        $env:GA_MEASUREMENT_ID = $measurementId
        Write-Host "✓ GA_MEASUREMENT_ID set" -ForegroundColor Green
        
        $setPermanent = Read-Host "Set permanently? (y/n)"
        if ($setPermanent -eq 'y') {
            [System.Environment]::SetEnvironmentVariable('GA_MEASUREMENT_ID', $measurementId, 'User')
        }
    } else {
        Write-Host "⚠ Skipping Google Analytics" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ GA_MEASUREMENT_ID already set: $env:GA_MEASUREMENT_ID" -ForegroundColor Green
}

if ($env:GA_MEASUREMENT_ID -and -not $env:GA_API_SECRET) {
    Write-Host ""
    Write-Host "Get your GA4 API Secret:" -ForegroundColor Cyan
    Write-Host "1. Admin → Data Streams → Web"
    Write-Host "2. Measurement Protocol API secrets → Create"
    Write-Host "3. Copy secret value"
    Write-Host ""
    
    $apiSecret = Read-Host "Enter GA4 API Secret (or press Enter to skip)"
    if ($apiSecret) {
        $env:GA_API_SECRET = $apiSecret
        Write-Host "✓ GA_API_SECRET set" -ForegroundColor Green
        
        $setPermanent = Read-Host "Set permanently? (y/n)"
        if ($setPermanent -eq 'y') {
            [System.Environment]::SetEnvironmentVariable('GA_API_SECRET', $apiSecret, 'User')
        }
    }
}

# Step 6: Test Firestore connection
if ($serviceAccountPath) {
    Write-Host ""
    Write-Host "[6/7] Testing Firestore connection..." -ForegroundColor Yellow
    
    python firestore_adapter.py --service-account $serviceAccountPath --collection sneakers_test --test-save --test-query
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Firestore connection successful" -ForegroundColor Green
    } else {
        Write-Host "✗ Firestore test failed" -ForegroundColor Red
        Write-Host "Check error messages above and verify service account permissions" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "[6/7] Skipping Firestore test (no service account)" -ForegroundColor Yellow
}

# Step 7: Test Google Analytics
if ($env:GA_MEASUREMENT_ID -and $env:GA_API_SECRET) {
    Write-Host ""
    Write-Host "[7/7] Testing Google Analytics..." -ForegroundColor Yellow
    
    python analytics_tracker.py --measurement-id $env:GA_MEASUREMENT_ID --api-secret $env:GA_API_SECRET --test-event
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Google Analytics test event sent" -ForegroundColor Green
        Write-Host ""
        Write-Host "Check GA4 Realtime dashboard in ~1 minute:" -ForegroundColor Cyan
        Write-Host "https://analytics.google.com/analytics/web/ → Reports → Realtime"
    } else {
        Write-Host "✗ Google Analytics test failed" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "[7/7] Skipping Google Analytics test (missing credentials)" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Environment Variables:" -ForegroundColor Yellow
Write-Host "  FIREBASE_SERVICE_ACCOUNT: $(if ($env:FIREBASE_SERVICE_ACCOUNT) { '✓ Set' } else { '✗ Not set' })"
Write-Host "  GA_MEASUREMENT_ID: $(if ($env:GA_MEASUREMENT_ID) { '✓ Set' } else { '✗ Not set' })"
Write-Host "  GA_API_SECRET: $(if ($env:GA_API_SECRET) { '✓ Set' } else { '✗ Not set' })"

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run a test scrape:"
Write-Host "   python soleretriever_scraper_firebase.py --collection jordan --limit 5"
Write-Host ""
Write-Host "2. Migrate existing PostgreSQL data:"
Write-Host "   python firestore_adapter.py --migrate"
Write-Host ""
Write-Host "3. View setup guide:"
Write-Host "   FIREBASE-SETUP.md"
Write-Host ""

# Offer to run test scrape
$runTest = Read-Host "Run test scrape now? (y/n)"
if ($runTest -eq 'y') {
    Write-Host ""
    Write-Host "Running test scrape..." -ForegroundColor Cyan
    
    if ($serviceAccountPath) {
        python soleretriever_scraper_firebase.py --collection jordan --limit 5 --service-account $serviceAccountPath
    } else {
        python soleretriever_scraper_firebase.py --collection jordan --limit 5
    }
}

Write-Host ""
Write-Host "Setup script complete!" -ForegroundColor Green
