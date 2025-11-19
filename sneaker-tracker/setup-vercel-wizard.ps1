# Vercel Setup Wizard - Live Shoe Tracker
# Interactive step-by-step Vercel deployment

param(
    [switch]$SkipLogin,
    [switch]$FrontendOnly,
    [switch]$APIOnly
)

$ErrorActionPreference = "Stop"

Write-Host "`n╔═══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   VERCEL DEPLOYMENT WIZARD                        ║" -ForegroundColor Green
Write-Host "║   Live Shoe Tracker - Complete Setup             ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Step 1: Verify Login
Write-Host "━━━ STEP 1/7: Vercel Authentication ━━━" -ForegroundColor Yellow
if (-not $SkipLogin) {
    Write-Host "Checking Vercel login status..." -ForegroundColor Gray
    
    $whoami = vercel whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n⚠️  Not logged in to Vercel" -ForegroundColor Yellow
        Write-Host "`nOpening browser for login..." -ForegroundColor Cyan
        Write-Host "Please complete the authentication in your browser." -ForegroundColor Gray
        
        vercel login
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "`n❌ Login failed. Please try again." -ForegroundColor Red
            exit 1
        }
    }
    
    $whoami = vercel whoami
    Write-Host "✓ Logged in as: $whoami" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipping login check" -ForegroundColor Gray
}

Start-Sleep -Seconds 1

# Step 2: Check Environment Variables
Write-Host "`n━━━ STEP 2/7: Environment Variables Check ━━━" -ForegroundColor Yellow
Write-Host "Checking required environment variables...`n" -ForegroundColor Gray

$envVars = @{
    "SUPABASE_URL" = $env:SUPABASE_URL
    "SUPABASE_ANON_KEY" = $env:SUPABASE_ANON_KEY
    "SUPABASE_SERVICE_ROLE_KEY" = $env:SUPABASE_SERVICE_ROLE_KEY
    "FIREBASE_SERVICE_ACCOUNT" = $env:FIREBASE_SERVICE_ACCOUNT
}

$missing = @()
foreach ($key in $envVars.Keys) {
    if ($envVars[$key]) {
        $preview = $envVars[$key].Substring(0, [Math]::Min(30, $envVars[$key].Length))
        Write-Host "  ✓ $key = $preview..." -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $key = (not set)" -ForegroundColor Yellow
        $missing += $key
    }
}

if ($missing.Count -gt 0) {
    Write-Host "`n⚠️  Missing environment variables: $($missing -join ', ')" -ForegroundColor Yellow
    Write-Host "These will need to be set in Vercel dashboard after deployment." -ForegroundColor Gray
    Write-Host "Press Enter to continue..." -ForegroundColor Cyan
    Read-Host
}

# Step 3: Deploy Frontend (Next.js)
if (-not $APIOnly) {
    Write-Host "`n━━━ STEP 3/7: Deploy Frontend (Next.js) ━━━" -ForegroundColor Yellow
    
    Push-Location "apps\web-nextjs"
    
    Write-Host "`n📁 Current directory: apps/web-nextjs" -ForegroundColor Gray
    Write-Host "`nThis will:" -ForegroundColor Cyan
    Write-Host "  1. Link your project to Vercel (creates .vercel folder)" -ForegroundColor White
    Write-Host "  2. Deploy to production" -ForegroundColor White
    Write-Host "  3. Generate deployment URL`n" -ForegroundColor White
    
    Write-Host "Starting deployment..." -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray
    
    # Deploy with production flag
    vercel --prod --yes
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ Frontend deployed successfully!" -ForegroundColor Green
        
        # Get the deployment URL
        $deploymentUrl = vercel ls --prod 2>&1 | Select-String -Pattern "https://" | Select-Object -First 1
        Write-Host "Frontend URL: $deploymentUrl" -ForegroundColor Cyan
        
        # Save project IDs
        if (Test-Path ".vercel\project.json") {
            $projectInfo = Get-Content ".vercel\project.json" | ConvertFrom-Json
            Write-Host "`nProject Info:" -ForegroundColor Yellow
            Write-Host "  Organization ID: $($projectInfo.orgId)" -ForegroundColor Gray
            Write-Host "  Project ID: $($projectInfo.projectId)" -ForegroundColor Gray
            Write-Host "  (Save these for GitHub Actions setup)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "`n❌ Frontend deployment failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Pop-Location
}

# Step 4: Deploy API Server
if (-not $FrontendOnly) {
    Write-Host "`n━━━ STEP 4/7: Deploy API Server ━━━" -ForegroundColor Yellow
    
    Push-Location "apps\api-server"
    
    Write-Host "`n📁 Current directory: apps/api-server" -ForegroundColor Gray
    Write-Host "`nDeploying API server..." -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray
    
    vercel --prod --yes
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ API deployed successfully!" -ForegroundColor Green
        
        # Get the deployment URL
        $apiUrl = vercel ls --prod 2>&1 | Select-String -Pattern "https://" | Select-Object -First 1
        Write-Host "API URL: $apiUrl" -ForegroundColor Cyan
        
        # Save API URL to file for frontend reference
        $apiUrl | Out-File "..\..\API_URL.txt" -Encoding UTF8
    } else {
        Write-Host "`n❌ API deployment failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Pop-Location
}

# Step 5: Environment Variables Setup
Write-Host "`n━━━ STEP 5/7: Environment Variables Configuration ━━━" -ForegroundColor Yellow
Write-Host "`nYou need to set these in Vercel Dashboard:" -ForegroundColor Cyan
Write-Host "(Go to: vercel.com/dashboard → Your Project → Settings → Environment Variables)`n" -ForegroundColor Gray

Write-Host "Frontend (web-nextjs) Variables:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "NEXT_PUBLIC_SUPABASE_URL              = https://npvqqzuofwojhbdlozgh.supabase.co" -ForegroundColor White
Write-Host "NEXT_PUBLIC_SUPABASE_ANON_KEY         = $env:SUPABASE_ANON_KEY" -ForegroundColor White
if ($env:FIREBASE_CLIENT_CONFIG) {
    Write-Host "NEXT_PUBLIC_FIREBASE_CONFIG           = (from your Firebase console)" -ForegroundColor White
}
Write-Host "NEXT_PUBLIC_GA_MEASUREMENT_ID         = (optional - your GA4 ID)`n" -ForegroundColor White

Write-Host "API Server (api-server) Variables:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "SUPABASE_URL                          = https://npvqqzuofwojhbdlozgh.supabase.co" -ForegroundColor White
Write-Host "SUPABASE_SERVICE_ROLE_KEY             = (service role key from Supabase)" -ForegroundColor White
Write-Host "FIREBASE_SERVICE_ACCOUNT              = (your service account JSON)" -ForegroundColor White
Write-Host "NODE_ENV                              = production`n" -ForegroundColor White

Write-Host "Setting these via CLI (recommended):" -ForegroundColor Cyan
Write-Host "  cd apps/web-nextjs" -ForegroundColor Gray
Write-Host "  vercel env add NEXT_PUBLIC_SUPABASE_URL production" -ForegroundColor Gray
Write-Host "  (paste value when prompted)`n" -ForegroundColor Gray

$response = Read-Host "Do you want to set environment variables now via CLI? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "`nSetting Frontend environment variables..." -ForegroundColor Yellow
    Push-Location "apps\web-nextjs"
    
    if ($env:SUPABASE_URL) {
        Write-Host "Setting NEXT_PUBLIC_SUPABASE_URL..." -ForegroundColor Gray
        Write-Output $env:SUPABASE_URL | vercel env add NEXT_PUBLIC_SUPABASE_URL production
    }
    
    if ($env:SUPABASE_ANON_KEY) {
        Write-Host "Setting NEXT_PUBLIC_SUPABASE_ANON_KEY..." -ForegroundColor Gray
        Write-Output $env:SUPABASE_ANON_KEY | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
    }
    
    Pop-Location
    
    Write-Host "`nSetting API environment variables..." -ForegroundColor Yellow
    Push-Location "apps\api-server"
    
    if ($env:SUPABASE_URL) {
        Write-Host "Setting SUPABASE_URL..." -ForegroundColor Gray
        Write-Output $env:SUPABASE_URL | vercel env add SUPABASE_URL production
    }
    
    if ($env:SUPABASE_SERVICE_ROLE_KEY) {
        Write-Host "Setting SUPABASE_SERVICE_ROLE_KEY..." -ForegroundColor Gray
        Write-Output $env:SUPABASE_SERVICE_ROLE_KEY | vercel env add SUPABASE_SERVICE_ROLE_KEY production
    }
    
    Pop-Location
    
    Write-Host "✓ Environment variables set" -ForegroundColor Green
}

# Step 6: Update Frontend API URL
Write-Host "`n━━━ STEP 6/7: Link Frontend to API ━━━" -ForegroundColor Yellow

if (Test-Path "API_URL.txt") {
    $apiUrl = Get-Content "API_URL.txt" -Raw
    Write-Host "Your API URL: $apiUrl" -ForegroundColor Cyan
    Write-Host "`nAdding API URL to frontend environment..." -ForegroundColor Yellow
    
    Push-Location "apps\web-nextjs"
    Write-Output $apiUrl | vercel env add NEXT_PUBLIC_API_URL production
    Pop-Location
    
    Write-Host "✓ API URL configured" -ForegroundColor Green
}

# Step 7: GitHub Actions Setup
Write-Host "`n━━━ STEP 7/7: GitHub Actions Integration (Optional) ━━━" -ForegroundColor Yellow
Write-Host "`nTo enable auto-deployment on git push, add these GitHub Secrets:" -ForegroundColor Cyan
Write-Host "(GitHub → Repository → Settings → Secrets and variables → Actions)`n" -ForegroundColor Gray

Write-Host "Required Secrets:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

if (Test-Path "apps\web-nextjs\.vercel\project.json") {
    $webProject = Get-Content "apps\web-nextjs\.vercel\project.json" | ConvertFrom-Json
    Write-Host "VERCEL_ORG_ID         = $($webProject.orgId)" -ForegroundColor White
    Write-Host "VERCEL_PROJECT_ID     = $($webProject.projectId)" -ForegroundColor White
}

Write-Host "VERCEL_TOKEN          = (create at: vercel.com/account/tokens)" -ForegroundColor White
Write-Host "SUPABASE_URL          = $env:SUPABASE_URL" -ForegroundColor White
Write-Host "SUPABASE_ANON_KEY     = (your anon key)" -ForegroundColor White
Write-Host "SUPABASE_SERVICE_ROLE_KEY = (your service role key)" -ForegroundColor White

# Final Summary
Write-Host "`n╔═══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ✓ DEPLOYMENT COMPLETE!                          ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test your deployments (URLs shown above)" -ForegroundColor White
Write-Host "  2. Verify environment variables in Vercel dashboard" -ForegroundColor White
Write-Host "  3. Check deployment logs: vercel logs <url>" -ForegroundColor White
Write-Host "  4. Set up custom domain (optional)" -ForegroundColor White
Write-Host "  5. Configure GitHub Actions (optional)`n" -ForegroundColor White

Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  vercel                    # Deploy to preview" -ForegroundColor Gray
Write-Host "  vercel --prod             # Deploy to production" -ForegroundColor Gray
Write-Host "  vercel logs <url>         # View logs" -ForegroundColor Gray
Write-Host "  vercel env ls             # List env variables" -ForegroundColor Gray
Write-Host "  vercel domains add <domain>  # Add custom domain`n" -ForegroundColor Gray

Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  • VERCEL-DEPLOYMENT.md    # Complete deployment guide" -ForegroundColor Cyan
Write-Host "  • SETUP-COMPLETE.md       # Full setup summary`n" -ForegroundColor Cyan

Write-Host "========================================`n" -ForegroundColor Cyan
