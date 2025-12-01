@echo off
cls
echo =====================================================
echo CAMPAIGN MANAGEMENT - COMPLETE SETUP
echo =====================================================
echo.
echo This script will:
echo 1. Add campaign_socials field to database
echo 2. Seed campaigns with complete data
echo 3. Show next steps
echo.
pause

echo.
echo [1/2] Adding campaign_socials field...
echo.
python migrate_add_campaign_socials.py

echo.
echo [2/2] Seeding campaign data...
echo.
python seed_campaign_data.py

echo.
echo =====================================================
echo SETUP COMPLETE!
echo =====================================================
echo.
echo Next Steps:
echo.
echo 1. Start Backend:
echo    cd astegni-backend
echo    python app.py
echo.
echo 2. Start Frontend (new terminal from project root):
echo    python -m http.server 8080
echo.
echo 3. Open Browser:
echo    http://localhost:8080/admin-pages/manage-campaigns.html
echo.
echo 4. Create Admin Session (browser console):
echo    localStorage.setItem('adminSession', JSON.stringify({
echo        id: 1,
echo        email: 'admin@astegni.et',
echo        department: 'manage-campaigns'
echo    }));
echo.
echo 5. Refresh page and test:
echo    - View campaign details (click View button)
echo    - Search campaigns
echo    - Filter by industry/ad type
echo    - Approve/reject/suspend campaigns
echo.
echo See CAMPAIGN-TABLE-STRUCTURE-UPDATE.md for full details
echo.
pause
