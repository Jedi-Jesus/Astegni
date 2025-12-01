@echo off
echo Starting Cloudflare Tunnel to expose local server...
echo This will give you a public URL for testing
echo.
echo Make sure your FastAPI server is running on localhost:8000
echo.
cloudflared tunnel --url http://localhost:8000
