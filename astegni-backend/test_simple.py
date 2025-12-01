import requests

# Login
r = requests.post("http://localhost:8000/api/login", data={
    "username": "jediael.s.abebe@gmail.com",
    "password": "@JesusJediael1234"
})
token = r.json()["access_token"]
print("Token obtained:", token[:30])

# Test endpoint
headers = {"Authorization": f"Bearer {token}"}
r = requests.get("http://localhost:8000/api/student/documents?document_type=achievement", headers=headers)
print(f"\nStatus: {r.status_code}")
print(f"Response: {r.text[:500]}")
