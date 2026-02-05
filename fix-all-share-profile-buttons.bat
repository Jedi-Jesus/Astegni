@echo off
echo Fixing all Share Profile buttons to pass event parameter...
echo.

REM Fix student-profile.html
powershell -Command "(gc 'profile-pages\student-profile.html') -replace 'onclick=\"shareProfile\(\)\"', 'onclick=\"shareProfile(event)\"' | Out-File -encoding UTF8 'profile-pages\student-profile.html'"
echo [OK] Fixed student-profile.html

REM Fix parent-profile.html
powershell -Command "(gc 'profile-pages\parent-profile.html') -replace 'onclick=\"shareProfile\(\)\"', 'onclick=\"shareProfile(event)\"' | Out-File -encoding UTF8 'profile-pages\parent-profile.html'"
echo [OK] Fixed parent-profile.html

REM Fix advertiser-profile.html
powershell -Command "(gc 'profile-pages\advertiser-profile.html') -replace 'onclick=\"shareProfile\(\)\"', 'onclick=\"shareProfile(event)\"' | Out-File -encoding UTF8 'profile-pages\advertiser-profile.html'"
echo [OK] Fixed advertiser-profile.html

REM Fix user-profile.html
powershell -Command "(gc 'profile-pages\user-profile.html') -replace 'onclick=\"shareProfile\(\)\"', 'onclick=\"shareProfile(event)\"' | Out-File -encoding UTF8 'profile-pages\user-profile.html'"
echo [OK] Fixed user-profile.html

echo.
echo ========================================
echo All Share Profile buttons fixed!
echo ========================================
echo.
echo Changes made:
echo   onclick="shareProfile()" --^> onclick="shareProfile(event)"
echo.
echo Please refresh your browser and test.
pause
