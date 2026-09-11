@echo off
cd /d "%~dp0"
echo TeamViewer Worlds
echo Open http://localhost:5173 in your browser once the server is ready.
echo Leave this window open while exploring. Press Ctrl+C to stop.
node scripts/server.mjs
if errorlevel 1 pause
