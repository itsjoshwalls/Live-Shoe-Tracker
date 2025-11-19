@echo off
cd /d "%~dp0"
echo Starting API Server...
node -r dotenv/config dist\server.js
