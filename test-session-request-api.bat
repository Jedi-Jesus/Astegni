@echo off
echo Testing Session Request API
echo ============================
echo.

echo 1. Getting a valid token for user 115 (tutor)...
curl -X POST "http://localhost:8000/api/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"jediael.s.abebe@gmail.com\",\"password\":\"SecurePass123\"}" ^
  -s > temp_login.json

echo.
echo Login response saved to temp_login.json
type temp_login.json
echo.
echo.

echo 2. Testing session requests endpoint without status...
curl -X GET "http://localhost:8000/api/tutor/session-requests" ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." ^
  -s

echo.
echo.

echo 3. Testing session requests endpoint with status=pending...
curl -X GET "http://localhost:8000/api/tutor/session-requests?status=pending" ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." ^
  -s

echo.
echo Done!
pause
