Param(
  [string]$ProjectRoot = "$Env:USERPROFILE\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker",
  [switch]$List,
  [switch]$Diff,
  [switch]$Push
)

Write-Host "[Invoke-Migrations] Starting..." -ForegroundColor Cyan

# Check for Supabase CLI (use npx as fallback)
$UseNpx = $false
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Host "Supabase CLI not found globally. Using npx supabase..." -ForegroundColor Yellow
  $UseNpx = $true
}

$MigrationsPath = Join-Path $ProjectRoot 'packages/supabase-migrations'
if (-not (Test-Path $MigrationsPath)) {
  Write-Error "Migrations path not found: $MigrationsPath"; exit 1
}

Set-Location $MigrationsPath

if ($UseNpx) {
  $SupabaseCmd = "npx"
  $SupabaseArgs = @("supabase")
} else {
  $SupabaseCmd = "supabase"
  $SupabaseArgs = @()
}

if ($List) {
  Write-Host "Listing migrations..." -ForegroundColor Cyan
  if ($UseNpx) {
    & $SupabaseCmd @SupabaseArgs migration list
  } else {
    & $SupabaseCmd migration list
  }
  exit $LASTEXITCODE
}

if ($Diff) {
  Write-Host "Creating diff migration..." -ForegroundColor Cyan
  if ($UseNpx) {
    & $SupabaseCmd @SupabaseArgs migration new auto_commit
  } else {
    & $SupabaseCmd migration new auto_commit
  }
  exit $LASTEXITCODE
}

Write-Host "Pushing migrations to Supabase..." -ForegroundColor Green
Write-Host "Note: Ensure 'supabase login' or SUPABASE_ACCESS_TOKEN is set." -ForegroundColor Yellow

if ($UseNpx) {
  & $SupabaseCmd @SupabaseArgs db push
} else {
  & $SupabaseCmd db push
}

if ($LASTEXITCODE -eq 0) {
  Write-Host "[Invoke-Migrations] Complete" -ForegroundColor Green
} else {
  Write-Error "[Invoke-Migrations] Failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}
