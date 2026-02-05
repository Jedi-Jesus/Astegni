"""
Test CORS for DELETE method on role management endpoints
Run this after starting the backend server
"""

import requests

BASE_URL = "http://localhost:8000"

def test_cors_preflight():
    """Test CORS preflight (OPTIONS) request"""
    print("Testing CORS preflight for /api/role/remove...")

    response = requests.options(
        f"{BASE_URL}/api/role/remove",
        headers={
            "Origin": "http://localhost:8081",
            "Access-Control-Request-Method": "DELETE",
            "Access-Control-Request-Headers": "content-type,authorization"
        }
    )

    print(f"Status Code: {response.status_code}")
    print(f"CORS Headers:")
    for header, value in response.headers.items():
        if "access-control" in header.lower():
            print(f"  {header}: {value}")

    # Check if DELETE is allowed
    allow_methods = response.headers.get("Access-Control-Allow-Methods", "")
    if "DELETE" in allow_methods or "*" in allow_methods:
        print("✅ DELETE method is allowed")
    else:
        print("❌ DELETE method is NOT allowed")
        print(f"   Allowed methods: {allow_methods}")

    return response

def test_cors_deactivate():
    """Test CORS preflight for /api/role/deactivate"""
    print("\nTesting CORS preflight for /api/role/deactivate...")

    response = requests.options(
        f"{BASE_URL}/api/role/deactivate",
        headers={
            "Origin": "http://localhost:8081",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization"
        }
    )

    print(f"Status Code: {response.status_code}")
    print(f"CORS Headers:")
    for header, value in response.headers.items():
        if "access-control" in header.lower():
            print(f"  {header}: {value}")

    # Check if POST is allowed
    allow_methods = response.headers.get("Access-Control-Allow-Methods", "")
    if "POST" in allow_methods or "*" in allow_methods:
        print("✅ POST method is allowed")
    else:
        print("❌ POST method is NOT allowed")
        print(f"   Allowed methods: {allow_methods}")

    return response

if __name__ == "__main__":
    print("=" * 60)
    print("CORS Testing for Role Management Endpoints")
    print("=" * 60)

    try:
        # Test preflight for DELETE
        test_cors_preflight()

        # Test preflight for POST
        test_cors_deactivate()

        print("\n" + "=" * 60)
        print("Testing complete!")
        print("=" * 60)

    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to backend server")
        print("   Make sure the backend is running on http://localhost:8000")
        print("   Run: cd astegni-backend && python app.py")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
