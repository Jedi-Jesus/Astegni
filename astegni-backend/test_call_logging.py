"""
Test Call Logging Implementation
==================================
Quick test to verify call logs are being created and updated properly
"""

import sys
sys.path.insert(0, 'app.py modules')

from models import SessionLocal, CallLog
from sqlalchemy import func, desc

def test_call_logging():
    db = SessionLocal()

    try:
        print("\n" + "="*60)
        print("CALL LOGGING TEST")
        print("="*60)

        # Get total count
        total = db.query(func.count(CallLog.id)).scalar()
        print(f"\nTotal call logs in database: {total}")

        # Get recent calls
        recent_calls = db.query(CallLog).order_by(desc(CallLog.started_at)).limit(10).all()

        print("\nRecent 10 calls:")
        print("-" * 60)
        print(f"{'ID':<5} {'Type':<7} {'Status':<12} {'Started':<20} {'Duration'}")
        print("-" * 60)

        for call in recent_calls:
            duration_str = f"{call.duration_seconds}s" if call.duration_seconds else "N/A"
            started = call.started_at.strftime("%Y-%m-%d %H:%M:%S") if call.started_at else "N/A"
            print(f"{call.id:<5} {call.call_type:<7} {call.status:<12} {started:<20} {duration_str}")

        # Count by status
        print("\nCalls by status:")
        print("-" * 60)

        statuses = db.query(
            CallLog.status,
            func.count(CallLog.id).label('count')
        ).group_by(CallLog.status).all()

        for status, count in statuses:
            print(f"  {status:<15} : {count}")

        # Check for proper updates (calls with duration)
        ended_calls_with_duration = db.query(func.count(CallLog.id)).filter(
            CallLog.status == 'ended',
            CallLog.duration_seconds.isnot(None),
            CallLog.duration_seconds > 0
        ).scalar()

        ended_calls_total = db.query(func.count(CallLog.id)).filter(
            CallLog.status == 'ended'
        ).scalar()

        print("\nQuality Check:")
        print("-" * 60)
        print(f"  Ended calls with duration: {ended_calls_with_duration}/{ended_calls_total}")

        if ended_calls_total > 0 and ended_calls_with_duration == ended_calls_total:
            print("  [OK] All ended calls have durations - PERFECT!")
        elif ended_calls_with_duration > 0:
            print("  [WARN] Some ended calls missing durations")
        else:
            print("  [INFO] No ended calls with duration yet")

        # Check for cancelled calls
        cancelled = db.query(func.count(CallLog.id)).filter(
            CallLog.status == 'cancelled'
        ).scalar()

        print(f"  Cancelled calls: {cancelled}")

        # Check for answered calls
        answered = db.query(func.count(CallLog.id)).filter(
            CallLog.status == 'answered'
        ).scalar()

        print(f"  Answered calls: {answered}")

        print("\n" + "="*60)
        print("Test complete! Make some test calls to see updates.")
        print("="*60 + "\n")

    finally:
        db.close()

if __name__ == "__main__":
    test_call_logging()
