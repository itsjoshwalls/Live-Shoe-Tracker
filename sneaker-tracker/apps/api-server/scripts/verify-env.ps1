param(
    [switch]$Json
)

$required = @(
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_ANON_KEY'
)

$presence = foreach ($k in $required) {
    $val = [Environment]::GetEnvironmentVariable($k)
    [PSCustomObject]@{
        Key = $k
        Present = [bool]$val
        ValuePreview = if ($val) { $val.Substring(0, [Math]::Min(12,$val.Length)) + '...' } else { $null }
    }
}

$effectiveKey = if ($env:SUPABASE_SERVICE_ROLE_KEY) { 'SUPABASE_SERVICE_ROLE_KEY' } elseif ($env:SUPABASE_SERVICE_KEY) { 'SUPABASE_SERVICE_KEY' } elseif ($env:SUPABASE_ANON_KEY) { 'SUPABASE_ANON_KEY' } else { 'NONE' }

$urlPresent = [bool]$env:SUPABASE_URL
$allPresent = $urlPresent -and $effectiveKey -ne 'NONE'

$result = [PSCustomObject]@{
    Timestamp = (Get-Date).ToString('o')
    EffectiveAuthKey = $effectiveKey
    URLPresent = $urlPresent
    AllPresent = $allPresent
    Variables = $presence
}

if ($Json) { $result | ConvertTo-Json -Depth 4; exit }

Write-Host "\nSupabase Environment Verification" -ForegroundColor Cyan
$result.Variables | Format-Table -AutoSize
Write-Host "Effective Key: $($result.EffectiveAuthKey)" -ForegroundColor Yellow
Write-Host "URL Present: $($result.URLPresent)" -ForegroundColor Yellow
if ($result.AllPresent) { Write-Host "Status: OK" -ForegroundColor Green } else { Write-Host "Status: MISSING VARIABLES" -ForegroundColor Red }
