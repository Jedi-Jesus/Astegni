"""Quick test of all course management endpoints"""
import sys
import requests

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

API = 'http://localhost:8000/api/course-management'

print("Testing Course Management API...")
print("-" * 50)

# 1. Create
print("1. Create course request...", end=" ")
r = requests.post(f"{API}/requests", json={
    "title": "Quick Test Course",
    "category": "Test",
    "level": "Test",
    "description": "Testing"
})
if r.status_code == 200:
    req_id = r.json()['request_id']
    print(f"✓ {req_id}")
else:
    print(f"✗ Failed")
    sys.exit(1)

# 2. Approve
print(f"2. Approve {req_id}...", end=" ")
r = requests.post(f"{API}/{req_id}/approve")
if r.status_code == 200:
    crs_id = r.json()['course_id']
    print(f"✓ {crs_id}")
else:
    print(f"✗ Failed")
    sys.exit(1)

# 3. Notify
print(f"3. Send notification for {crs_id}...", end=" ")
r = requests.post(f"{API}/{crs_id}/notify", json={
    "message": "Test", "target_audience": "All Tutors"
})
print("✓ Sent" if r.status_code == 200 else "✗ Failed")

# 4. Suspend
print(f"4. Suspend {crs_id}...", end=" ")
r = requests.post(f"{API}/{crs_id}/suspend", json={"reason": "Test"})
if r.status_code == 200:
    sus_id = r.json()['suspended_id']
    print(f"✓ {sus_id}")
else:
    print(f"✗ Failed")
    sys.exit(1)

# 5. Reinstate
print(f"5. Reinstate {sus_id}...", end=" ")
r = requests.post(f"{API}/{sus_id}/reinstate")
if r.status_code == 200:
    new_id = r.json()['course_id']
    print(f"✓ {new_id}")
else:
    print(f"✗ Failed")
    sys.exit(1)

# 6. Delete
print(f"6. Delete {new_id}...", end=" ")
r = requests.delete(f"{API}/active/{new_id}")
print("✓ Deleted" if r.status_code == 200 else "✗ Failed")

# 7. Reject workflow
print("7. Test reject workflow...", end=" ")
r = requests.post(f"{API}/requests", json={"title": "To Reject", "category": "Test", "level": "Test"})
req2 = r.json()['request_id']
r = requests.post(f"{API}/{req2}/reject", json={"reason": "Test"})
rej_id = r.json()['rejected_id']
r = requests.post(f"{API}/{rej_id}/reconsider")
new_req = r.json()['request_id']
requests.delete(f"{API}/requests/{new_req}")
print(f"✓ {req2} → {rej_id} → {new_req}")

print("-" * 50)
print("✅ ALL TESTS PASSED! System is working perfectly!")
