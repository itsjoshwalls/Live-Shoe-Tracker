# 🚀 Launch-SneakerTracker.ps1
# Auto-start your Vite React sneaker tracking app in OneDrive safely

# --- SETTINGS ---
$projectPath = "C:\Users\sneak\OneDrive\Desktop\Live Shoe Tracker\shoe-tracker"

# --- SCRIPT START ---
Write-Host "Starting Sneaker Tracker..." -ForegroundColor Cyan

# Go to your project folder
if (Test-Path $projectPath) {
    Set-Location $projectPath
} else {
    Write-Host "❌ Folder not found: $projectPath" -ForegroundColor Red
    exit
}

# Ensure node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies (first time setup)..." -ForegroundColor Yellow
    npm install
}

# Kill any existing Node/Vite processes (optional cleanup)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Start your Vite dev server
Write-Host "⚡ Running npm run dev..." -ForegroundColor Green
Start-Process powershell -ArgumentList "npm run dev" -WorkingDirectory $projectPath

# Wait a moment for server to start
Start-Sleep -Seconds 3

# Auto-open your local dev URL
Start-Process "http://localhost:5173"

Write-Host "✅ Sneaker Tracker launched successfully!" -ForegroundColor Cyan
