@echo off
cd /d %~dp0
echo Running system tables migration...
python migrate_system_tables_to_admin_db.py
echo.
echo Done!
pause
