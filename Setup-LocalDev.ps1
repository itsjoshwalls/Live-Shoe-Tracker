# Live Shoe Tracker - Setup Helper Script
# Run this from the project root: .\Setup-LocalDev.ps1

Write-Host "🚀 Live Shoe Tracker - Local Development Setup" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

$projectRoot = $PSScriptRoot
$functionsDir = Join-Path $projectRoot "functions"

# Step 1: Check if Node.js is installed
Write-Host "✓ Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found! Please install Node.js from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Step 2: Check if Firebase CLI is installed
Write-Host "`n✓ Checking Firebase CLI..." -ForegroundColor Yellow
try {
    $firebaseVersion = firebase --version
    Write-Host "  Firebase CLI version: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Firebase CLI not found! Installing..." -ForegroundColor Red
    npm install -g firebase-tools
}

# Step 3: Install function dependencies
Write-Host "`n✓ Installing function dependencies..." -ForegroundColor Yellow
Set-Location $functionsDir
if (Test-Path "package.json") {
    npm install
    Write-Host "  Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "  ✗ package.json not found in functions directory!" -ForegroundColor Red
    exit 1
}

# Step 4: Setup environment file
Write-Host "`n✓ Setting up environment variables..." -ForegroundColor Yellow
$envExample = Join-Path $functionsDir ".env.example"
$envFile = Join-Path $functionsDir ".env"

if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    Write-Host "  Created .env file from template" -ForegroundColor Green
    Write-Host "  ⚠️  IMPORTANT: Update .env with your webhooks and credentials!" -ForegroundColor Yellow
} else {
    Write-Host "  .env file already exists" -ForegroundColor Green
}

# Step 5: Check for service account key
Write-Host "`n✓ Checking for service account key..." -ForegroundColor Yellow
$serviceAccountKey = Join-Path $functionsDir "serviceAccountKey.json"

if (Test-Path $serviceAccountKey) {
    Write-Host "  Service account key found!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Service account key NOT found!" -ForegroundColor Yellow
    Write-Host "  Please download it from Firebase Console:" -ForegroundColor Yellow
    Write-Host "  1. Go to Firebase Console → Settings → Service Accounts" -ForegroundColor White
    Write-Host "  2. Click 'Generate New Private Key'" -ForegroundColor White
    Write-Host "  3. Save as: functions/serviceAccountKey.json" -ForegroundColor White
}

# Step 6: Check Firestore files
Write-Host "`n✓ Checking Firestore configuration..." -ForegroundColor Yellow
Set-Location $projectRoot

$requiredFiles = @(
    "firebase.json",
    "firestore.rules",
    "firestore.indexes.json",
    "firestore.seed.json"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file missing!" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "`n  ⚠️  Some configuration files are missing!" -ForegroundColor Red
    exit 1
}

# Step 7: Prompt to seed data
Write-Host "`n✓ Ready to seed Firestore!" -ForegroundColor Yellow
$seedNow = Read-Host "  Do you want to seed initial data now? (y/N)"

if ($seedNow -eq "y" -or $seedNow -eq "Y") {
    if (Test-Path $serviceAccountKey) {
        Set-Location $functionsDir
        Write-Host "  Seeding Firestore..." -ForegroundColor Cyan
        npm run seed
        Write-Host "  ✓ Seeding complete!" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Cannot seed without service account key!" -ForegroundColor Red
    }
}

# Step 8: Final instructions
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "✓ Setup Complete!" -ForegroundColor Green
Write-Host "================================================`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update functions/.env with your webhook URLs" -ForegroundColor White
Write-Host "2. Ensure serviceAccountKey.json is in functions/ directory" -ForegroundColor White
Write-Host "3. Start emulators: firebase emulators:start" -ForegroundColor White
Write-Host "4. Open Emulator UI: http://localhost:4000`n" -ForegroundColor White

Write-Host "Quick Commands:" -ForegroundColor Yellow
Write-Host "  Start emulators:  firebase emulators:start" -ForegroundColor Cyan
Write-Host "  Seed data:        npm run seed --prefix functions" -ForegroundColor Cyan
Write-Host "  Deploy:           firebase deploy`n" -ForegroundColor Cyan

Set-Location $projectRoot
Write-Host "Happy coding! 🚀" -ForegroundColor Green
