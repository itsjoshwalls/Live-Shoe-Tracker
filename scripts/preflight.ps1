param(
    [ValidateSet('shoe-tracker','web-nextjs')]
    [string]$App = 'shoe-tracker',
    [int[]]$Ports = @()
)

Set-StrictMode -Version Latest

function Fail($msg) { Write-Host "❌ $msg" -ForegroundColor Red; exit 1 }
function Warn($msg) { Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Ok($msg) { Write-Host "✅ $msg" -ForegroundColor Green }

Write-Host "Running preflight for: $App" -ForegroundColor Cyan

# Node version
try {
  $nodeVer = (& node --version) 2>$null
} catch { Fail "Node.js not found in PATH. Install Node >=18 <25." }

if (-not $nodeVer) { Fail "Node.js not found in PATH. Install Node >=18 <25." }
$nodeVer = $nodeVer.TrimStart('v')
$major = [int]($nodeVer.Split('.')[0])
if ($major -lt 18 -or $major -ge 25) {
  Warn "Node version is v$nodeVer (expected >=18 <25). Some tools may fail."
} else { Ok "Node version: v$nodeVer" }

# pnpm presence (used by monorepo)
$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if ($null -eq $pnpm) {
  Warn "pnpm not found. Monorepo prefers pnpm; falling back to npm where applicable."
} else { Ok "pnpm available: $($pnpm.Source)" }

# Port checks (supply override or use defaults by app)
if (-not $Ports -or $Ports.Length -eq 0) {
  switch ($App) {
    'shoe-tracker' { $Ports = @(5173) }
    'web-nextjs' { $Ports = @(3000) }
  }
}

function Test-Port($Port) {
  $inUse = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  return $null -ne $inUse
}

foreach ($p in $Ports) {
  if (Test-Port $p) {
    Warn "Port $p appears to be in use. You may need to stop the other process or choose a different port."
  } else {
    Ok "Port $p is free."
  }
}

# App-specific env checks
switch ($App) {
  'shoe-tracker' {
    $cfg = $env:VITE_FIREBASE_CONFIG_JSON
    if (-not $cfg) {
      Warn "VITE_FIREBASE_CONFIG_JSON is not set. The app will show a setup screen until configured."
    } else {
      try { $null = $cfg | ConvertFrom-Json; Ok "VITE_FIREBASE_CONFIG_JSON looks like valid JSON." } catch { Warn "VITE_FIREBASE_CONFIG_JSON is set but not valid JSON." }
    }
    if ($env:VITE_FIRESTORE_COLLECTION) { Ok "VITE_FIRESTORE_COLLECTION=$($env:VITE_FIRESTORE_COLLECTION)" } else { Warn "VITE_FIRESTORE_COLLECTION not set (defaults to 'sneakers')." }
  }
  'web-nextjs' {
    if (-not $env:NEXT_PUBLIC_SUPABASE_URL) { Warn "NEXT_PUBLIC_SUPABASE_URL missing." } else { Ok "Supabase URL present." }
    if (-not $env:NEXT_PUBLIC_SUPABASE_ANON_KEY) { Warn "NEXT_PUBLIC_SUPABASE_ANON_KEY missing." } else { Ok "Supabase anon key present." }
    if ($env:NEXT_PUBLIC_FIREBASE_CONFIG) {
      try { $null = $env:NEXT_PUBLIC_FIREBASE_CONFIG | ConvertFrom-Json; Ok "Firebase client config JSON present." } catch { Warn "NEXT_PUBLIC_FIREBASE_CONFIG is set but invalid JSON." }
    } else {
      Warn "NEXT_PUBLIC_FIREBASE_CONFIG not set (only required if Firebase features are used)."
    }
  }
}

Write-Host "Preflight completed." -ForegroundColor Cyan
