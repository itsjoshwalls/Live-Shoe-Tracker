# Start API Server
$ErrorActionPreference = "Stop"

# Set environment variables
$env:SUPABASE_URL = "https://zaarnclwuiwxxtecrvvs.supabase.co"
$env:SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphYXJuY2x3dWl3eHh0ZWNydnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzAxMDMsImV4cCI6MjA3NzgwNjEwM30.ixSRWRjaRYQ0kvaJ9gWw2vM4MM2HRtCZa5sfx-ibJak"
$env:PORT = "4000"
$env:NODE_ENV = "development"

Write-Host "🚀 Starting API Server on http://localhost:4000" -ForegroundColor Green
Write-Host "📍 Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start the server
node dist/server.js
