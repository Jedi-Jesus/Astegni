"""
Quick check to see if Market Pricing system is ready
"""

import requests

def check_backend():
    """Check if backend is running"""
    print("Checking backend status...")
    try:
        response = requests.get("http://localhost:8000/docs", timeout=2)
        if response.status_code == 200:
            print("[OK] Backend is running on port 8000")
            return True
        else:
            print("[ERROR] Backend responded but with error:", response.status_code)
            return False
    except requests.exceptions.ConnectionError:
        print("[ERROR] Backend is NOT running on port 8000")
        print("\nTo start backend:")
        print("  cd astegni-backend")
        print("  python app.py")
        return False
    except Exception as e:
        print(f"[ERROR] Error checking backend: {e}")
        return False

def check_market_pricing_routes():
    """Check if market pricing routes are available"""
    print("\nChecking market pricing routes...")
    try:
        # Try to access one of the routes (will fail with 401 if route exists, 404 if not)
        response = requests.get("http://localhost:8000/api/market-pricing/analytics/summary", timeout=2)

        if response.status_code == 401:
            print("[OK] Market pricing routes are loaded (401 Unauthorized - auth required)")
            return True
        elif response.status_code == 404:
            print("[ERROR] Market pricing routes NOT found (404)")
            print("\nThe backend needs to be RESTARTED to load the new routes:")
            print("  1. Stop the current backend (Ctrl+C in backend terminal)")
            print("  2. cd astegni-backend")
            print("  3. python app.py")
            return False
        else:
            print(f"[INFO] Unexpected response: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("[ERROR] Cannot check routes - backend not running")
        return False
    except Exception as e:
        print(f"[ERROR] Error checking routes: {e}")
        return False

def check_database_table():
    """Check if analytics table exists"""
    print("\nChecking database table...")
    try:
        import psycopg
        import os
        from dotenv import load_dotenv

        load_dotenv()
        database_url = os.getenv("DATABASE_URL")

        if not database_url:
            print("[ERROR] DATABASE_URL not found in .env")
            return False

        conn = psycopg.connect(database_url)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'price_suggestion_analytics'
                );
            """)
            exists = cur.fetchone()[0]

            if exists:
                print("[OK] price_suggestion_analytics table exists")

                # Count rows
                cur.execute("SELECT COUNT(*) FROM price_suggestion_analytics")
                count = cur.fetchone()[0]
                print(f"  - Current records: {count}")
                return True
            else:
                print("[ERROR] price_suggestion_analytics table NOT found")
                print("\nRun migration:")
                print("  python migrate_create_price_suggestion_analytics.py")
                return False

        conn.close()
    except Exception as e:
        print(f"[ERROR] Database check failed: {e}")
        return False

def check_frontend_files():
    """Check if frontend files are updated"""
    print("\nChecking frontend files...")
    try:
        import os

        js_file = os.path.join("..", "js", "tutor-profile", "market-trend-functions.js")

        if os.path.exists(js_file):
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()

            if 'applySuggestedPrice' in content and 'API_BASE_URL}/api/market-pricing' in content:
                print("[OK] Frontend files are updated with new API calls")
                return True
            else:
                print("[ERROR] Frontend files need updating")
                return False
        else:
            print("[ERROR] market-trend-functions.js not found")
            return False
    except Exception as e:
        print(f"[ERROR] Frontend check failed: {e}")
        return False

def main():
    print("=" * 70)
    print("MARKET PRICING SYSTEM - READINESS CHECK")
    print("=" * 70)

    backend_ok = check_backend()
    routes_ok = check_market_pricing_routes() if backend_ok else False
    db_ok = check_database_table()
    frontend_ok = check_frontend_files()

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Backend Running:     {'[YES]' if backend_ok else '[NO]'}")
    print(f"Routes Loaded:       {'[YES]' if routes_ok else '[NO]'}")
    print(f"Database Ready:      {'[YES]' if db_ok else '[NO]'}")
    print(f"Frontend Updated:    {'[YES]' if frontend_ok else '[NO]'}")

    if all([backend_ok, routes_ok, db_ok, frontend_ok]):
        print("\n[SUCCESS] SYSTEM IS READY! You can test the market pricing feature.")
        print("\nNext steps:")
        print("  1. Open http://localhost:8081 in browser")
        print("  2. Login as tutor")
        print("  3. Go to Package Management modal")
        print("  4. Click Market Trends > Suggest My Price")
    else:
        print("\n[WARNING] SYSTEM NOT READY - Fix the issues above first")

        if not backend_ok:
            print("\n1. START BACKEND FIRST")
        elif not routes_ok:
            print("\n1. RESTART BACKEND to load new routes")
        if not db_ok:
            print("2. RUN MIGRATION")

    print("=" * 70)

if __name__ == "__main__":
    main()
