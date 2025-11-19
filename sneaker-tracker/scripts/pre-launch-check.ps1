#!/usr/bin/env pwsh

Write-Host "🚀 Running pre-launch checklist..." -ForegroundColor Green

# Check Node.js environment
Write-Host "`n📋 Checking Node.js environment..." -ForegroundColor Blue
$nodeVersion = node --version
$npmVersion = pnpm --version
Write-Host "Node.js version: $nodeVersion"
Write-Host "pnpm version: $npmVersion"

# Check environment variables
Write-Host "`n📋 Checking environment variables..." -ForegroundColor Blue
$envFiles = @(
    "./apps/web-nextjs/.env.local",
    "./apps/api-server/.env"
)

foreach ($file in $envFiles) {
    if (Test-Path $file) {
        Write-Host "✅ Found $file"
        $envContent = Get-Content $file
        $requiredVars = @(
            "SUPABASE_URL",
            "NODE_ENV"
        )
        foreach ($var in $requiredVars) {
            if ($envContent -match $var) {
                Write-Host "  ✅ $var is set"
            } else {
                Write-Host "  ❌ Missing $var" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "❌ Missing $file" -ForegroundColor Red
    }
}

# Check dependencies
Write-Host "`n📋 Checking dependencies..." -ForegroundColor Blue
Write-Host "Running pnpm install..."
pnpm install

# Build check
Write-Host "`n📋 Running builds..." -ForegroundColor Blue
$projects = @(
    @{Path="./apps/web-nextjs"; Command="build"},
    @{Path="./apps/api-server"; Command="build"}
)

foreach ($project in $projects) {
    Push-Location $project.Path
    Write-Host "Building $($project.Path)..."
    pnpm run $project.Command
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build successful for $($project.Path)"
    } else {
        Write-Host "❌ Build failed for $($project.Path)" -ForegroundColor Red
    }
    Pop-Location
}

# Database migrations
Write-Host "`n📋 Checking database migrations..." -ForegroundColor Blue
Push-Location "./packages/supabase-migrations"
Write-Host "Running migration status check..."
pnpm run migrate:status
Pop-Location

# Security checks
Write-Host "`n📋 Running security checks..." -ForegroundColor Blue
Write-Host "Checking for security headers..."
$nextConfig = Get-Content "./apps/web-nextjs/next.config.js"
if ($nextConfig -match "headers()") {
    Write-Host "✅ Security headers are configured"
} else {
    Write-Host "❌ Missing security headers configuration" -ForegroundColor Red
}

# API security
Write-Host "`n📋 Checking API security configuration..." -ForegroundColor Blue
$apiConfig = Get-Content "./apps/api-server/src/server.ts"
if ($apiConfig -match "rate-limit") {
    Write-Host "✅ Rate limiting is configured"
} else {
    Write-Host "❌ Missing rate limiting" -ForegroundColor Red
}

# Environment validation
Write-Host "`n📋 Validating production environment..." -ForegroundColor Blue
$prodEnv = "./apps/api-server/.env.production"
if (Test-Path $prodEnv) {
    $envContent = Get-Content $prodEnv
    if ($envContent -match "SUPABASE_SERVICE_ROLE_KEY") {
        Write-Host "✅ Production environment is using service role key"
    } else {
        Write-Host "❌ Production environment should use SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Missing production environment configuration" -ForegroundColor Red
}

# Performance checks
Write-Host "`n📋 Checking performance optimizations..." -ForegroundColor Blue
Write-Host "Running Next.js build analysis..."
Push-Location "./apps/web-nextjs"
pnpm run build
Pop-Location

Write-Host "`n🏁 Pre-launch checklist complete!" -ForegroundColor Green
Write-Host "`nAction items:"
Write-Host "1. Review and fix any ❌ items above"
Write-Host "2. Deploy using 'vercel --prod' after fixing issues"
Write-Host "3. Verify SSL certificates"
Write-Host "4. Test all API endpoints"
Write-Host "5. Monitor error rates after launch"