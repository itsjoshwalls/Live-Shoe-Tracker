param(
  [string]$Source = 'sneakers_canonical',
  [string]$Table = 'soleretriever_data',
  [string]$SupabaseUrl = 'http://localhost:8000',
  [switch]$Once,
  [switch]$DirectPg
)

Write-Host "\nRunning Firestore → Supabase sync..." -ForegroundColor Cyan

# Load Firebase service account
$serviceAccountPath = "C:\Users\sneak\Downloads\live-sneaker-release-tra-df5a4-firebase-adminsdk-fbsvc-d416112b81.json"
if (-not (Test-Path $serviceAccountPath)) {
  Write-Host "Service account not found at $serviceAccountPath" -ForegroundColor Red
  exit 1
}
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content $serviceAccountPath -Raw

# Load Supabase service role key (prefer environment, else read from API server .env)
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
  $apiEnv = "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\api-server\.env"
  if (Test-Path $apiEnv) {
    $line = (Get-Content $apiEnv | Where-Object { $_ -match '^SUPABASE_SERVICE_ROLE_KEY=' } | Select-Object -First 1)
    if ($line) {
      $env:SUPABASE_SERVICE_ROLE_KEY = $line -replace '^SUPABASE_SERVICE_ROLE_KEY=', ''
    }
  }
}
# Load anon key as well (for apikey header)
if (-not $env:SUPABASE_ANON_KEY) {
  $apiEnv = "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\api-server\.env"
  if (Test-Path $apiEnv) {
    $line = (Get-Content $apiEnv | Where-Object { $_ -match '^SUPABASE_ANON_KEY=' } | Select-Object -First 1)
    if ($line) {
      $env:SUPABASE_ANON_KEY = $line -replace '^SUPABASE_ANON_KEY=', ''
    }
  }
}
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
  Write-Host "Missing SUPABASE_SERVICE_ROLE_KEY. Set it in env or in apps/api-server/.env" -ForegroundColor Red
  exit 1
}
$env:SUPABASE_URL = $SupabaseUrl

# Load Postgres creds into env if not set
if (-not $env:POSTGRES_HOST -or -not $env:POSTGRES_PASSWORD) {
  $apiEnv = "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\api-server\.env"
  if (Test-Path $apiEnv) {
    (Get-Content $apiEnv).ForEach({
      if ($_ -match '^POSTGRES_HOST=') { $env:POSTGRES_HOST = $_ -replace '^POSTGRES_HOST=', '' }
      if ($_ -match '^POSTGRES_PORT=') { $env:POSTGRES_PORT = $_ -replace '^POSTGRES_PORT=', '' }
      if ($_ -match '^POSTGRES_DB=') { $env:POSTGRES_DB = $_ -replace '^POSTGRES_DB=', '' }
      if ($_ -match '^POSTGRES_USER=') { $env:POSTGRES_USER = $_ -replace '^POSTGRES_USER=', '' }
      if ($_ -match '^POSTGRES_PASSWORD=') { $env:POSTGRES_PASSWORD = $_ -replace '^POSTGRES_PASSWORD=', '' }
    })
  }
}

# Run sync once
Push-Location "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\python"
try {
  if ($DirectPg) {
    python sync_firestore_to_supabase.py --source $Source --table $Table --direct-pg
  } else {
    # Disable auth header when using direct PostgREST on 3001
    if ($SupabaseUrl -match '3001') { $env:SUPABASE_USE_AUTH = '0' } else { $env:SUPABASE_USE_AUTH = '1' }
    python sync_firestore_to_supabase.py --source $Source --table $Table --supabase-url $SupabaseUrl
  }
} finally {
  Pop-Location
}

if (-not $Once) {
  Write-Host "\nTip: Schedule hourly sync with Windows Task Scheduler:" -ForegroundColor Yellow
  Write-Host "  Register-ScheduledTask -Action (New-ScheduledTaskAction -Execute 'pwsh' -Argument '-File `"$PSCommandPath`" -Once') -Trigger (New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Hours 1)) -TaskName 'SneakerTracker-FirestoreSync' -Description 'Sync Firestore to Supabase hourly'" -ForegroundColor White
}
