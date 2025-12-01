@echo off
echo Starting SSH tunnel to Hetzner server...
echo Keep this window open while developing
echo.
echo Tunnel: localhost:15432 -> 128.140.122.215:5432
echo.
ssh -L 15432:localhost:5432 root@128.140.122.215