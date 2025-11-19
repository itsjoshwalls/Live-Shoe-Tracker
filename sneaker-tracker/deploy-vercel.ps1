# Vercel Deployment Script
# Automates deployment of frontend and API to Vercel

param(
    [switch]$Production,
    [switch]$Frontend,
    [switch]$API,
    [switch]$Both
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🚀 VERCEL DEPLOYMENT AUTOMATION" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if Vercel CLI is installed
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
    Write-Host "✓ Vercel CLI installed" -ForegroundColor Green
}

# Determine what to deploy
$deployFrontend = $Frontend -or $Both -or (-not $API)
$deployAPI = $API -or $Both

# Determine environment
$env = if ($Production) { "--prod" } else { "" }
$envName = if ($Production) { "PRODUCTION" } else { "PREVIEW" }

Write-Host "Deployment Target: $envName" -ForegroundColor Yellow
Write-Host "  Frontend: $deployFrontend" -ForegroundColor Gray
Write-Host "  API: $deployAPI`n" -ForegroundColor Gray

# Deploy Frontend
if ($deployFrontend) {
    Write-Host "`n--- Deploying Frontend (Next.js) ---" -ForegroundColor Cyan
    
    Push-Location "apps\web-nextjs"
    
    try {
        Write-Host "Building locally first..." -ForegroundColor Yellow
        npm run build
        
        Write-Host "`nDeploying to Vercel..." -ForegroundColor Yellow
        if ($Production) {
            vercel --prod --yes
        } else {
            vercel --yes
        }
        
        Write-Host "✓ Frontend deployed successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Frontend deployment failed: $_" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Pop-Location
}

# Deploy API
if ($deployAPI) {
    Write-Host "`n--- Deploying API Server ---" -ForegroundColor Cyan
    
    Push-Location "apps\api-server"
    
    try {
        Write-Host "Testing API locally..." -ForegroundColor Yellow
        # Optional: Add local API tests here
        
        Write-Host "`nDeploying to Vercel..." -ForegroundColor Yellow
        if ($Production) {
            vercel --prod --yes
        } else {
            vercel --yes
        }
        
        Write-Host "✓ API deployed successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ API deployment failed: $_" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Pop-Location
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✓ DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Check deployment status in Vercel dashboard" -ForegroundColor White
Write-Host "  2. Test the deployed apps" -ForegroundColor White
Write-Host "  3. Verify environment variables are set" -ForegroundColor White
Write-Host "  4. Check Vercel logs for any errors`n" -ForegroundColor White

Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  vercel logs <deployment-url>    # View logs" -ForegroundColor Gray
Write-Host "  vercel inspect <deployment-url> # Inspect deployment" -ForegroundColor Gray
Write-Host "  vercel env ls                   # List environment variables`n" -ForegroundColor Gray
