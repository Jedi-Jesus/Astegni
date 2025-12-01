@echo off
echo =====================================================
echo MANAGE CAMPAIGNS - QUICK START SCRIPT
echo =====================================================
echo.

echo Step 1: Seeding campaign data...
echo.
python seed_campaign_data.py

echo.
echo =====================================================
echo Campaign data has been seeded!
echo =====================================================
echo.
echo Next steps:
echo 1. Start backend: python app.py
echo 2. Start frontend: python -m http.server 8080 (from project root)
echo 3. Open: http://localhost:8080/admin-pages/manage-campaigns.html
echo.
echo For full setup guide, see: MANAGE-CAMPAIGNS-SETUP-GUIDE.md
echo.
pause
