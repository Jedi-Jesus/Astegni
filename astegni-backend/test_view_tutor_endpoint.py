"""
Test View Tutor Endpoint - Quick Diagnostic Script
Run this to verify the view-tutor endpoint is working correctly
"""

import requests
import json

API_BASE_URL = "http://localhost:8000"

def test_view_tutor_endpoint():
    print("=" * 80)
    print("VIEW TUTOR ENDPOINT DIAGNOSTIC")
    print("=" * 80)
    print()

    # Test 1: Check if backend is running
    print("1️⃣  Testing if backend is running...")
    try:
        response = requests.get(f"{API_BASE_URL}/docs", timeout=2)
        if response.status_code == 200:
            print("   ✅ Backend is running on http://localhost:8000")
        else:
            print(f"   ⚠️  Backend responded with status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Backend is NOT running!")
        print("   💡 Fix: Run 'python app.py' in astegni-backend folder")
        return
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return

    print()

    # Test 2: Get tutor profile
    print("2️⃣  Testing GET /api/view-tutor/1...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/view-tutor/1", timeout=5)

        print(f"   Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()

            print("   ✅ Endpoint is working!")
            print()
            print("   📊 Response Structure:")
            print(f"      - Has 'profile': {' profile' in data}")
            print(f"      - Has 'stats': {'stats' in data}")
            print()

            if 'profile' in data:
                profile = data['profile']
                print("   👤 Profile Data:")
                print(f"      - ID: {profile.get('id')}")
                print(f"      - Username: {profile.get('username')}")
                print(f"      - Full Name: {profile.get('full_name')}")
                print(f"      - Bio: {profile.get('bio', 'N/A')[:50]}..." if profile.get('bio') else "      - Bio: N/A")
                print(f"      - Hero Title: {profile.get('hero_title', 'N/A')}")
                print(f"      - Rating: {profile.get('rating')}")
                print(f"      - Verification Status: {profile.get('verification_status')}")
                print()

                # Check for profile header fields
                print("   🔍 Profile Header Fields Check:")
                print(f"      - full_name: {'✅' if profile.get('full_name') else '❌'} {profile.get('full_name')}")
                print(f"      - username: {'✅' if profile.get('username') else '❌'} {profile.get('username')}")
                print(f"      - bio: {'✅' if profile.get('bio') else '⚠️  (empty)'}")
                print(f"      - rating: {'✅' if profile.get('rating') else '❌'} {profile.get('rating')}")
                print(f"      - profile_picture: {'✅' if profile.get('profile_picture') else '⚠️  (empty)'}")
                print(f"      - cover_image: {'✅' if profile.get('cover_image') else '⚠️  (empty)'}")

        elif response.status_code == 404:
            print("   ❌ Tutor ID 1 not found in database!")
            print("   💡 Fix: Run 'python seed_tutor_data.py' to add sample tutors")

        elif response.status_code == 500:
            print("   ❌ Server error! Check backend terminal for details")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Response: {response.text[:200]}")

        else:
            print(f"   ⚠️  Unexpected status code: {response.status_code}")
            print(f"   Response: {response.text[:200]}")

    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to backend!")
        print("   💡 Fix: Start backend with 'python app.py'")
    except requests.exceptions.Timeout:
        print("   ❌ Request timed out!")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    print()

    # Test 3: Check achievements endpoint
    print("3️⃣  Testing GET /api/view-tutor/1/achievements...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/view-tutor/1/achievements", timeout=5)
        if response.status_code == 200:
            data = response.json()
            count = len(data.get('achievements', []))
            print(f"   ✅ Achievements endpoint working! Found {count} achievements")
        else:
            print(f"   ⚠️  Status {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    print()

    # Test 4: Check certificates endpoint
    print("4️⃣  Testing GET /api/view-tutor/1/certificates...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/view-tutor/1/certificates", timeout=5)
        if response.status_code == 200:
            data = response.json()
            count = len(data.get('certificates', []))
            print(f"   ✅ Certificates endpoint working! Found {count} certificates")
        else:
            print(f"   ⚠️  Status {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    print()

    # Test 5: Check experience endpoint
    print("5️⃣  Testing GET /api/view-tutor/1/experience...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/view-tutor/1/experience", timeout=5)
        if response.status_code == 200:
            data = response.json()
            count = len(data.get('experience', []))
            print(f"   ✅ Experience endpoint working! Found {count} experience records")
        else:
            print(f"   ⚠️  Status {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    print()
    print("=" * 80)
    print("🎯 SUMMARY")
    print("=" * 80)
    print()
    print("✅ If all tests passed:")
    print("   → Backend is working correctly")
    print("   → Problem is likely in frontend (JavaScript, CORS, or browser cache)")
    print("   → Check browser console (F12) for errors")
    print()
    print("❌ If tests failed:")
    print("   → Fix backend issues first")
    print("   → Check DATABASE_URL in .env file")
    print("   → Run database seeders if data is missing")
    print()
    print("📚 For detailed troubleshooting:")
    print("   → See VIEW-TUTOR-PROFILE-HEADER-DEBUG-GUIDE.md")
    print()

if __name__ == "__main__":
    test_view_tutor_endpoint()
