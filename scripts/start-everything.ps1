<#
start-everything.ps1

Starts core services for the unified sneaker tracker on Windows PowerShell.
- Next.js web app (apps/web-nextjs)
- API server (apps/api-server)
- Playwright monitor (packages/scrapers)

Requires pnpm. Each service runs in its own background job. Use Get-Job to inspect.
#>

Set-StrictMode -Version Latest

function Start-ServiceJob([string]$Name, [ScriptBlock]$Block) {
    Write-Host "[start] $Name" -ForegroundColor Cyan
    $job = Start-Job -Name $Name -ScriptBlock $Block
    return $job
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Split-Path -Parent $root
$sneakerRoot = Join-Path $repoRoot 'sneaker-tracker'

# Ensure pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Error "pnpm is required. Install from https://pnpm.io/installation"
    exit 1
}

# Jobs
$jobs = @()

# Web (Next.js)
$jobs += Start-ServiceJob -Name 'web-nextjs' -Block {
    Set-Location "$using:sneakerRoot/apps/web-nextjs"
    pnpm install
    pnpm run dev
}

# API server
$jobs += Start-ServiceJob -Name 'api-server' -Block {
    Set-Location "$using:sneakerRoot/apps/api-server"
    pnpm install
    pnpm run dev
}

# Scrapers: Playwright monitor
$jobs += Start-ServiceJob -Name 'scrapers-monitor' -Block {
    Set-Location "$using:sneakerRoot/packages/scrapers"
    pnpm install
    # Ensure Playwright browsers are installed (first time only)
    npx playwright install
    pnpm run monitor
}

# Desktop Electron app
$jobs += Start-ServiceJob -Name 'desktop-electron' -Block {
    Set-Location "$using:sneakerRoot/apps/desktop-electron"
    pnpm install
    pnpm run start
}

Write-Host "All services starting in background jobs:" -ForegroundColor Green
$jobs | ForEach-Object { Write-Host " - $($_.Name) (Id=$($_.Id))" }
Write-Host "Use 'Get-Job' and 'Receive-Job -Keep -Id <id>' to view logs. Use 'Stop-Job -Id <id>' to stop a service." -ForegroundColor Yellow
