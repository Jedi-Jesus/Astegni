"""
Test script for recommended topics endpoint
Run this to verify the endpoint works before restarting the server
"""

import asyncio
from admin_recommended_topics_endpoints import get_recommended_topics, get_recommended_course_topics, get_recommended_school_topics

async def test_endpoints():
    print("\n=== Testing Recommended Topics Endpoints ===\n")

    try:
        # Test combined endpoint
        print("1. Testing /api/admin/recommended-topics (combined)...")
        result = await get_recommended_topics(limit=10)
        print(f"   ✓ Success! Found {result['total']} topics")
        if result['topics']:
            print(f"   Sample topic: {result['topics'][0]}")
        print()

        # Test courses endpoint
        print("2. Testing /api/admin/recommended-topics/courses...")
        result = await get_recommended_course_topics(limit=10)
        print(f"   ✓ Success! Found {result['total']} course topics")
        if result['topics']:
            print(f"   Sample: {result['topics'][0]}")
        print()

        # Test schools endpoint
        print("3. Testing /api/admin/recommended-topics/schools...")
        result = await get_recommended_school_topics(limit=10)
        print(f"   ✓ Success! Found {result['total']} school topics")
        if result['topics']:
            print(f"   Sample: {result['topics'][0]}")
        print()

        print("=== All tests passed! ===")
        print("\nThe endpoint is ready to use once you restart the backend server.")
        print("Run: python app.py")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nPlease check:")
        print("1. Database connection is working")
        print("2. courses and schools tables exist")
        print("3. DATABASE_URL is set in .env file")

if __name__ == "__main__":
    asyncio.run(test_endpoints())
