"""Direct test of tutor packages endpoint"""
import requests
import json

# Get token from user
token = input("Paste your JWT token (from browser localStorage.getItem('token')): ").strip()

url = "http://localhost:8000/api/tutor/packages"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

print(f"\nTesting: GET {url}")
print(f"Headers: {headers}\n")

try:
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}\n")

    try:
        print(f"Response JSON: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response Text: {response.text}")
except Exception as e:
    print(f"Error: {e}")
