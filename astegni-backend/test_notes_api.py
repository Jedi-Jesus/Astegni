"""
Quick test script to verify notes API is working
"""

import requests
import json

API_BASE = "http://localhost:8000"

print("=" * 70)
print("Testing Notes API")
print("=" * 70)

# Step 1: Login to get token
print("\n1. Logging in...")
login_response = requests.post(
    f"{API_BASE}/api/login",
    json={
        "email": "jediael.s.abebe@gmail.com",
        "password": "@JesusJediael1234"
    }
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

token = login_response.json()["access_token"]
print("✓ Login successful")

headers = {"Authorization": f"Bearer {token}"}

# Step 2: Get notes stats
print("\n2. Getting notes statistics...")
stats_response = requests.get(f"{API_BASE}/api/notes/stats", headers=headers)

if stats_response.status_code != 200:
    print(f"❌ Stats request failed: {stats_response.status_code}")
    print(stats_response.text)
    exit(1)

stats = stats_response.json()
print(f"✓ Stats retrieved successfully:")
print(f"  - Total notes: {stats['total_notes']}")
print(f"  - Total words: {stats['total_words']}")
print(f"  - Total courses: {stats['total_courses']}")
print(f"  - Recent notes: {stats['recent_notes']}")
print(f"  - Favorite notes: {stats['favorite_notes']}")
print(f"  - Notes with media: {stats['notes_with_media']}")

# Step 3: Create a test note
print("\n3. Creating a test note...")
note_data = {
    "title": "Test Note from API",
    "content": "<h3>Testing Notes System</h3><p>This is a test note created via the API!</p>",
    "course": "Computer Science 101",
    "tutor": "Dr. Test",
    "tags": "test, api, backend",
    "is_favorite": False,
    "word_count": 12
}

create_response = requests.post(
    f"{API_BASE}/api/notes/",
    headers=headers,
    json=note_data
)

if create_response.status_code != 201:
    print(f"❌ Note creation failed: {create_response.status_code}")
    print(create_response.text)
    exit(1)

note = create_response.json()
note_id = note['id']
print(f"✓ Note created successfully (ID: {note_id})")

# Step 4: Get all notes
print("\n4. Fetching all notes...")
list_response = requests.get(f"{API_BASE}/api/notes/", headers=headers)

if list_response.status_code != 200:
    print(f"❌ List request failed: {list_response.status_code}")
    print(list_response.text)
    exit(1)

notes = list_response.json()
print(f"✓ Found {len(notes)} note(s)")

# Step 5: Get specific note
print(f"\n5. Getting note {note_id}...")
get_response = requests.get(f"{API_BASE}/api/notes/{note_id}", headers=headers)

if get_response.status_code != 200:
    print(f"❌ Get request failed: {get_response.status_code}")
    print(get_response.text)
    exit(1)

note_detail = get_response.json()
print(f"✓ Retrieved note: {note_detail['title']}")

# Step 6: Toggle favorite
print(f"\n6. Toggling favorite status...")
favorite_response = requests.patch(
    f"{API_BASE}/api/notes/{note_id}/favorite",
    headers=headers
)

if favorite_response.status_code != 200:
    print(f"❌ Toggle favorite failed: {favorite_response.status_code}")
    print(favorite_response.text)
    exit(1)

updated_note = favorite_response.json()
print(f"✓ Favorite toggled: {updated_note['is_favorite']}")

# Step 7: Delete test note
print(f"\n7. Deleting test note...")
delete_response = requests.delete(f"{API_BASE}/api/notes/{note_id}", headers=headers)

if delete_response.status_code != 204:
    print(f"❌ Delete failed: {delete_response.status_code}")
    print(delete_response.text)
    exit(1)

print("✓ Note deleted successfully")

print("\n" + "=" * 70)
print("✅ All tests passed! Notes API is working correctly!")
print("=" * 70)
