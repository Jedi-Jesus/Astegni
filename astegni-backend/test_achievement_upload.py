import requests
import json
from io import BytesIO

# Get authentication token first
login_response = requests.post('http://localhost:8000/api/login', json={
    'email': 'tutor@example.com',  # Update with actual test tutor credentials
    'password': 'password123'
})

if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

token = login_response.json().get('access_token')
print(f"Login successful, token: {token[:20]}...")

# Prepare achievement data
files = {
    'certificate_file': ('test_cert.pdf', BytesIO(b'PDF content here'), 'application/pdf')
}

data = {
    'title': 'Test Achievement',
    'description': 'Test Description',
    'category': 'award',
    'icon': '🏆',
    'color': 'gold',
    'year': '2024',
    'issuer': 'Test Issuer',
    'is_featured': 'on'
}

headers = {
    'Authorization': f'Bearer {token}'
}

# Send request
print("\nSending achievement creation request...")
response = requests.post(
    'http://localhost:8000/api/tutor/achievements',
    files=files,
    data=data,
    headers=headers
)

print(f"\nResponse Status: {response.status_code}")
print(f"Response Body:")
try:
    print(json.dumps(response.json(), indent=2))
except:
    print(response.text)
