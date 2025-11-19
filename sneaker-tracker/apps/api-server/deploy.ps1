#!/usr/bin/env pwsh
# Deploy API to Vercel Production
# Run this from ANY directory: just execute the script

$ErrorActionPreference = "Stop"

# Navigate to script's directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

try {
    Write-Host "📍 Working directory: $(Get-Location)" -ForegroundColor Cyan

    # Verify .vercel/project.json exists
    if (-not (Test-Path ".vercel\project.json")) {
        Write-Host "❌ Not linked to Vercel. Run 'vercel link' first." -ForegroundColor Red
        exit 1
    }

    # Read project info
    $projectInfo = Get-Content ".vercel\project.json" | ConvertFrom-Json
    Write-Host "🔗 Project: $($projectInfo.projectName)" -ForegroundColor Green

    # Deploy
    Write-Host "`n🚀 Deploying to production..." -ForegroundColor Cyan
    $output = & vercel --prod --yes 2>&1
    $exitCode = $LASTEXITCODE
    
    Write-Host $output
    
    if ($exitCode -eq 0) {
        Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Deployment failed with exit code $exitCode" -ForegroundColor Red
    }
    
    exit $exitCode
} finally {
    Pop-Location
}
