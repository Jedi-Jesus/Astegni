"""
Test login and brand creation for user 143
"""
import requests
import json

API_BASE = "http://localhost:8000"

print("=" * 60)
print("Testing User 143 Login and Brand Creation")
print("=" * 60)

# Step 1: Login as user 143
print("\n[1/4] Logging in as user 143...")
login_response = requests.post(
    f"{API_BASE}/api/login",
    data={"username": "contact@astegni.com", "password": "@ContactAstegni1234"}
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

login_data = login_response.json()
token = login_data["access_token"]
user_data = login_data["user"]

print(f"✅ Login successful!")
print(f"   User ID: {user_data['id']}")
print(f"   Roles: {user_data.get('roles', [])}")
print(f"   Role IDs: {user_data.get('role_ids', {})}")
print(f"   Advertiser ID: {user_data.get('role_ids', {}).get('advertiser', 'NOT FOUND')}")

# Step 2: Get advertiser profile
print("\n[2/4] Fetching advertiser profile...")
profile_response = requests.get(
    f"{API_BASE}/api/advertiser/profile",
    headers={"Authorization": f"Bearer {token}"}
)

if profile_response.status_code != 200:
    print(f"❌ Profile fetch failed: {profile_response.status_code}")
    print(profile_response.text)
else:
    profile_data = profile_response.json()
    print(f"✅ Profile fetched successfully!")
    print(f"   Profile ID: {profile_data.get('id')}")
    print(f"   User ID: {profile_data.get('user_id')}")

# Step 3: Get existing brands
print("\n[3/4] Fetching existing brands...")
brands_response = requests.get(
    f"{API_BASE}/api/advertiser/brands",
    headers={"Authorization": f"Bearer {token}"}
)

if brands_response.status_code != 200:
    print(f"❌ Brands fetch failed: {brands_response.status_code}")
    print(brands_response.text)
else:
    brands_data = brands_response.json()
    print(f"✅ Brands fetched successfully!")
    print(f"   Total brands: {brands_data.get('total', 0)}")
    print(f"   Brands: {[b['name'] for b in brands_data.get('brands', [])]}")

# Step 4: Create a test brand
print("\n[4/4] Creating test brand...")
brand_payload = {
    "name": "Test Brand from User 143",
    "bio": "This is a test brand created by user 143",
    "industry": "Technology",
    "website": "https://testbrand143.com",
    "brand_color": "#FF5733"
}

create_response = requests.post(
    f"{API_BASE}/api/advertiser/brands",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    },
    json=brand_payload
)

if create_response.status_code != 200:
    print(f"❌ Brand creation failed: {create_response.status_code}")
    print(create_response.text)
else:
    create_data = create_response.json()
    print(f"✅ Brand created successfully!")
    print(f"   Brand ID: {create_data.get('brand_id')}")
    print(f"   Brand Name: {create_data.get('brand', {}).get('name')}")

print("\n" + "=" * 60)
print("Test Complete!")
print("=" * 60)
