import urllib.request
import urllib.parse
import json

# Simple test without using requests library
try:
    # Test health endpoint
    response = urllib.request.urlopen('http://localhost:8000/health')
    data = json.loads(response.read())
    print("Health check:", data)

    # Login
    login_data = urllib.parse.urlencode({
        'username': 'admin@astegni.com',
        'password': 'Admin2025!'
    }).encode()

    req = urllib.request.Request('http://localhost:8000/api/login',
                                 data=login_data,
                                 headers={'Content-Type': 'application/x-www-form-urlencoded'})

    response = urllib.request.urlopen(req)
    login_result = json.loads(response.read())
    print("Login successful!")

    token = login_result['access_token']

    # Test admin endpoint
    req = urllib.request.Request('http://localhost:8000/api/admin/tutors/pending?page=1&limit=5',
                                headers={'Authorization': f'Bearer {token}'})

    response = urllib.request.urlopen(req)
    data = json.loads(response.read())
    print(f"Found {data['total']} pending tutors")
    print("SUCCESS! Admin endpoints are working!")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()