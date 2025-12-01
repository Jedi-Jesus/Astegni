@echo off
echo ============================================
echo Testing View Tutor Fix for ID 85
echo ============================================
echo.

echo Step 1: Testing API endpoint...
echo.
curl -s http://localhost:8000/api/view-tutor/85 > temp_tutor_85.json

echo Checking if API returned valid JSON...
python -m json.tool temp_tutor_85.json > nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] API returned valid JSON
    echo.
    echo Profile data preview:
    python -c "import json; data=json.load(open('temp_tutor_85.json')); print(f'  Name: {data[\"profile\"][\"full_name\"]}'); print(f'  Username: {data[\"profile\"][\"username\"]}'); print(f'  Courses: {data[\"profile\"][\"courses\"]}'); print(f'  Rating: {data[\"profile\"][\"rating\"]}'); print(f'  Reviews: {data[\"profile\"][\"rating_count\"]}')"
) else (
    echo [ERROR] API returned invalid response
    echo Response:
    type temp_tutor_85.json
    goto :cleanup
)

echo.
echo Step 2: Checking related data counts...
echo.
curl -s "http://localhost:8000/api/view-tutor/85/reviews?limit=100" > temp_reviews.json
curl -s "http://localhost:8000/api/view-tutor/85/achievements" > temp_achievements.json
curl -s "http://localhost:8000/api/view-tutor/85/certificates" > temp_certificates.json
curl -s "http://localhost:8000/api/view-tutor/85/experience" > temp_experience.json
curl -s "http://localhost:8000/api/view-tutor/85/videos" > temp_videos.json
curl -s "http://localhost:8000/api/view-tutor/85/packages" > temp_packages.json

python -c "import json; reviews=json.load(open('temp_reviews.json')); achievements=json.load(open('temp_achievements.json')); certificates=json.load(open('temp_certificates.json')); experience=json.load(open('temp_experience.json')); videos=json.load(open('temp_videos.json')); packages=json.load(open('temp_packages.json')); print(f'  Reviews: {len(reviews[\"reviews\"])}'); print(f'  Achievements: {len(achievements[\"achievements\"])}'); print(f'  Certificates: {len(certificates[\"certificates\"])}'); print(f'  Experience: {len(experience[\"experience\"])}'); print(f'  Videos: {len(videos[\"videos\"])}'); print(f'  Packages: {len(packages[\"packages\"])}')"

echo.
echo ============================================
echo Test Complete!
echo ============================================
echo.
echo Next steps:
echo 1. Open http://localhost:8080/view-profiles/view-tutor.html?id=85
echo 2. Press Ctrl+Shift+R to hard reload (clear cache)
echo 3. Check browser console (F12) for loading messages
echo 4. Verify sections show REAL data or "No data"
echo.

:cleanup
del temp_*.json 2>nul
pause
