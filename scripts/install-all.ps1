<#
install-all.ps1

Installs dependencies for subprojects in this repository.

Behavior:
- Runs `npm install` in `shoe-tracker` and `live-shoe-tracker` if those directories exist.
- For `sneaker-tracker`, prefers `pnpm install` when `pnpm` is available, otherwise falls back to `npm install`.
#>

Set-StrictMode -Version Latest

function Install-ForProject($path, $usePnpm = $false) {
    if (-not (Test-Path $path)) {
        Write-Host "[skipping] $path not found"
        return
    }
    Push-Location $path
    try {
        Write-Host "[install] Running install in: $path"
        if ($usePnpm) {
            if (Get-Command pnpm -ErrorAction SilentlyContinue) {
                pnpm install
            } else {
                Write-Host "pnpm not found — falling back to npm install for $path"
                npm install
            }
        } else {
            npm install
        }
    } catch {
        Write-Error "Install failed in $path : $_"
        Exit 1
    } finally {
        Pop-Location
    }
}

Write-Host "Starting installs for subprojects..."

Install-ForProject -path 'shoe-tracker' -usePnpm:$false
Install-ForProject -path 'live-shoe-tracker' -usePnpm:$false
Install-ForProject -path 'sneaker-tracker' -usePnpm:$true

Write-Host "All installs finished."
