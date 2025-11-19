# Quick Deployment Script for Live Shoe Tracker
# Run this from the shoe-tracker/ directory

Write-Host "🚀 Live Shoe Tracker - Full Deployment Script" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Firebase CLI not found. Install with: npm install -g firebase-tools" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Firebase CLI installed" -ForegroundColor Green

# Step 1: Install function dependencies
Write-Host ""
Write-Host "Step 1: Installing function dependencies..." -ForegroundColor Yellow
cd functions
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
cd ..
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Step 2: Deploy security rules and indexes
Write-Host ""
Write-Host "Step 2: Deploying Firestore rules and indexes..." -ForegroundColor Yellow
firebase deploy --only firestore:rules,firestore:indexes
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy rules/indexes" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Rules and indexes deployed" -ForegroundColor Green

# Step 3: Seed initial data
Write-Host ""
Write-Host "Step 3: Seeding Firestore with initial data..." -ForegroundColor Yellow
$seed = Read-Host "Do you want to seed Firestore? This will add test data. (y/N)"
if ($seed -eq "y" -or $seed -eq "Y") {
    cd functions
    node scripts/seedFirestore.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Seeding failed" -ForegroundColor Red
    } else {
        Write-Host "✅ Firestore seeded" -ForegroundColor Green
    }
    cd ..
} else {
    Write-Host "⏭️ Skipped seeding" -ForegroundColor Yellow
}

# Step 4: Deploy Cloud Functions
Write-Host ""
Write-Host "Step 4: Deploying all Cloud Functions..." -ForegroundColor Yellow
Write-Host "⚠️ This may take several minutes..." -ForegroundColor Yellow
firebase deploy --only functions
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Functions deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ All functions deployed" -ForegroundColor Green

# Step 5: Configure alerts (optional)
Write-Host ""
Write-Host "Step 5: Configure alert webhooks (optional)..." -ForegroundColor Yellow
$configAlerts = Read-Host "Do you want to configure Discord/Slack webhooks? (y/N)"
if ($configAlerts -eq "y" -or $configAlerts -eq "Y") {
    $discordWebhook = Read-Host "Enter Discord webhook URL (or press Enter to skip)"
    if ($discordWebhook) {
        firebase functions:config:set alerts.discord_webhook="$discordWebhook"
        Write-Host "✅ Discord webhook configured" -ForegroundColor Green
    }
    
    $slackWebhook = Read-Host "Enter Slack webhook URL (or press Enter to skip)"
    if ($slackWebhook) {
        firebase functions:config:set alerts.slack_webhook="$slackWebhook"
        Write-Host "✅ Slack webhook configured" -ForegroundColor Green
    }
    
    if ($discordWebhook -or $slackWebhook) {
        Write-Host "Redeploying functions to pick up config..." -ForegroundColor Yellow
        firebase deploy --only functions
        Write-Host "✅ Functions redeployed with new config" -ForegroundColor Green
    }
} else {
    Write-Host "⏭️ Skipped alert configuration" -ForegroundColor Yellow
}

# Final summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test health endpoint: curl https://us-central1-YOUR_PROJECT.cloudfunctions.net/health"
Write-Host "2. Test metrics endpoint: curl https://us-central1-YOUR_PROJECT.cloudfunctions.net/metrics"
Write-Host "3. Run a manual scraper: curl 'https://us-central1-YOUR_PROJECT.cloudfunctions.net/runScraper?retailer=nike'"
Write-Host "4. Check Firebase Console for function logs and execution"
Write-Host "5. Update frontend to use new collections (see IMPLEMENTATION-GUIDE.md)"
Write-Host ""
Write-Host "📚 Full docs: IMPLEMENTATION-GUIDE.md" -ForegroundColor Cyan
Write-Host ""
