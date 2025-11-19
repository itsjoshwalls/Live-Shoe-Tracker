# Apply Supabase Migration Script
# Runs the latest migration SQL file against Supabase database

param(
    [string]$MigrationFile = "migrations\20251118_raffles_news_prices.sql",
    [switch]$DryRun
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Supabase Migration Runner" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# Check for Supabase CLI
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCli) {
    Write-Host "`nSupabase CLI not found. Attempting Node.js migration..." -ForegroundColor Yellow
    
    if (Test-Path "apply-migration.js") {
        Write-Host "Running apply-migration.js..." -ForegroundColor Cyan
        node apply-migration.js $MigrationFile
        exit $LASTEXITCODE
    } else {
        Write-Host "ERROR: No migration tool available" -ForegroundColor Red
        Write-Host "Install Supabase CLI: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
        exit 1
    }
}

# Use Supabase CLI
Write-Host "`nUsing Supabase CLI to apply migration..." -ForegroundColor Green
Write-Host "Migration file: $MigrationFile" -ForegroundColor Gray

if ($DryRun) {
    Write-Host "`n[DRY RUN] Would execute migration:" -ForegroundColor Yellow
    Get-Content $MigrationFile | Select-Object -First 20
    Write-Host "`n... (truncated)" -ForegroundColor Gray
    exit 0
}

# Apply migration
supabase db push --file $MigrationFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n? Migration applied successfully" -ForegroundColor Green
} else {
    Write-Host "`n? Migration failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
