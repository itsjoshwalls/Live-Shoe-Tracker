# Supabase Docker Setup Script
# Sets up local Supabase instance with all schemas

param(
    [switch]$Start,
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Logs,
    [switch]$InitSchemas,
    [switch]$Clean
)

$infraPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$composeFile = Join-Path $infraPath "docker-compose.supabase.yml"
$envFile = Join-Path $infraPath ".env.supabase"
$envExample = Join-Path $infraPath ".env.supabase.example"
$schemasPath = Join-Path $infraPath "..\packages\scrapers\python\schemas"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Supabase Docker Manager" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    $dockerRunning = docker info 2>$null
    if (-not $dockerRunning) {
        Write-Host "ERROR: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: Docker is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Check for .env file
if (-not (Test-Path $envFile)) {
    Write-Host "No .env.supabase file found. Creating from example..." -ForegroundColor Yellow
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Host "✓ Created .env.supabase from example" -ForegroundColor Green
        Write-Host "⚠ IMPORTANT: Edit infra\.env.supabase and set your passwords!" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "ERROR: .env.supabase.example not found!" -ForegroundColor Red
        exit 1
    }
}

# Start Supabase
if ($Start -or $Restart) {
    if ($Restart) {
        Write-Host "Stopping existing containers..." -ForegroundColor Yellow
        docker-compose -f $composeFile --env-file $envFile down
    }
    
    Write-Host "Starting Supabase containers..." -ForegroundColor Cyan
    docker-compose -f $composeFile --env-file $envFile up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Supabase started successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Access points:" -ForegroundColor Cyan
        Write-Host "  Supabase Studio: http://localhost:3000" -ForegroundColor White
        Write-Host "  PostgreSQL: localhost:5432" -ForegroundColor White
        Write-Host "  PostgREST API: http://localhost:3001" -ForegroundColor White
        Write-Host "  Realtime: http://localhost:4000" -ForegroundColor White
        Write-Host "  pgAdmin: http://localhost:5050" -ForegroundColor White
        Write-Host ""
        Write-Host "Waiting for services to be healthy..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # Check if postgres is ready
        $retries = 0
        while ($retries -lt 30) {
            $pgReady = docker exec sneaker-tracker-postgres pg_isready -U postgres 2>$null
            if ($pgReady -match "accepting connections") {
                Write-Host "✓ PostgreSQL is ready!" -ForegroundColor Green
                break
            }
            Write-Host "Waiting for PostgreSQL... ($retries/30)" -ForegroundColor Gray
            Start-Sleep -Seconds 2
            $retries++
        }
    } else {
        Write-Host "✗ Failed to start Supabase" -ForegroundColor Red
        exit 1
    }
}

# Initialize schemas
if ($InitSchemas) {
    Write-Host "Initializing database schemas..." -ForegroundColor Cyan
    
    # Check if schemas directory exists
    if (-not (Test-Path $schemasPath)) {
        Write-Host "ERROR: Schemas directory not found: $schemasPath" -ForegroundColor Red
        exit 1
    }
    
    # Get all .sql files
    $sqlFiles = Get-ChildItem -Path $schemasPath -Filter "*.sql" | Sort-Object Name
    
    if ($sqlFiles.Count -eq 0) {
        Write-Host "No SQL schema files found in $schemasPath" -ForegroundColor Yellow
    } else {
        Write-Host "Found $($sqlFiles.Count) schema file(s)" -ForegroundColor White
        
        foreach ($file in $sqlFiles) {
            Write-Host "  Running: $($file.Name)..." -ForegroundColor Gray
            
            # Read SQL file
            $sql = Get-Content $file.FullName -Raw
            
            # Execute via docker exec
            $sql | docker exec -i sneaker-tracker-postgres psql -U postgres -d postgres
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ $($file.Name) executed successfully" -ForegroundColor Green
            } else {
                Write-Host "  ✗ $($file.Name) failed" -ForegroundColor Red
            }
        }
        
        Write-Host ""
        Write-Host "✓ Schema initialization complete!" -ForegroundColor Green
    }
}

# Stop Supabase
if ($Stop) {
    Write-Host "Stopping Supabase containers..." -ForegroundColor Yellow
    docker-compose -f $composeFile --env-file $envFile down
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Supabase stopped" -ForegroundColor Green
    }
}

# Show logs
if ($Logs) {
    Write-Host "Showing logs (Ctrl+C to exit)..." -ForegroundColor Cyan
    docker-compose -f $composeFile --env-file $envFile logs -f
}

# Clean (remove volumes)
if ($Clean) {
    Write-Host "⚠ WARNING: This will DELETE all data in the database!" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? (yes/no)"
    
    if ($confirm -eq "yes") {
        Write-Host "Stopping and removing containers + volumes..." -ForegroundColor Yellow
        docker-compose -f $composeFile --env-file $envFile down -v
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ All containers and data removed" -ForegroundColor Green
        }
    } else {
        Write-Host "Clean cancelled" -ForegroundColor Gray
    }
}

# Show help if no flags
if (-not ($Start -or $Stop -or $Restart -or $Logs -or $InitSchemas -or $Clean)) {
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "  .\Setup-Supabase.ps1 -Start          Start Supabase containers" -ForegroundColor White
    Write-Host "  .\Setup-Supabase.ps1 -Stop           Stop Supabase containers" -ForegroundColor White
    Write-Host "  .\Setup-Supabase.ps1 -Restart        Restart Supabase containers" -ForegroundColor White
    Write-Host "  .\Setup-Supabase.ps1 -InitSchemas    Run all SQL schemas" -ForegroundColor White
    Write-Host "  .\Setup-Supabase.ps1 -Logs           Show container logs" -ForegroundColor White
    Write-Host "  .\Setup-Supabase.ps1 -Clean          Remove all data (DESTRUCTIVE)" -ForegroundColor White
    Write-Host ""
    Write-Host "Combined:" -ForegroundColor Cyan
    Write-Host "  .\Setup-Supabase.ps1 -Start -InitSchemas" -ForegroundColor White
    Write-Host ""
}

Write-Host ""

