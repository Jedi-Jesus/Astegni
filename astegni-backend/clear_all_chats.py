"""
Clear All Chats from Database
==============================
This script removes all chat-related data from the database.

CAUTION: This action is IRREVERSIBLE!
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def clear_all_chats():
    """Clear all chat data from the database"""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cur = conn.cursor()

    try:
        print("=" * 60)
        print("CLEARING ALL CHAT DATA FROM DATABASE")
        print("=" * 60)

        # Get counts before deletion
        print("\n[DATA] Current data counts:")

        tables_to_check = [
            'chat_messages',
            'conversations',
            'conversation_participants',
            'message_reactions',
            'message_read_receipts',
            'pinned_messages',
            'blocked_chat_contacts',
            'chat_active_sessions',
            'chat_privacy_reports',
            'whiteboard_chat_messages'
        ]

        counts = {}
        for table in tables_to_check:
            cur.execute(f"SELECT COUNT(*) as count FROM {table}")
            count = cur.fetchone()['count']
            counts[table] = count
            print(f"   {table}: {count}")

        total_records = sum(counts.values())
        print(f"\n   TOTAL RECORDS TO DELETE: {total_records}")

        if total_records == 0:
            print("\n[OK] No chat data found. Database is already clean!")
            return

        # Confirm deletion
        print("\n" + "=" * 60)
        print("[WARNING]  WARNING: This will permanently delete ALL chat data!")
        print("=" * 60)
        response = input("\nType 'DELETE ALL' to confirm: ")

        if response != "DELETE ALL":
            print("\n[ERROR] Operation cancelled. No data was deleted.")
            return

        print("\n[DELETE]  Deleting data...")

        # Delete in correct order (respecting foreign key constraints)
        deletion_order = [
            'message_reactions',           # References chat_messages
            'message_read_receipts',       # References chat_messages
            'pinned_messages',             # References chat_messages
            'whiteboard_chat_messages',    # Separate chat for whiteboard
            'chat_messages',               # References conversations
            'conversation_participants',   # References conversations
            'blocked_chat_contacts',       # Independent
            'chat_active_sessions',        # Independent
            'chat_privacy_reports',        # Independent
            'conversations',               # Parent table
        ]

        deleted_counts = {}
        for table in deletion_order:
            cur.execute(f"DELETE FROM {table}")
            deleted = cur.rowcount
            deleted_counts[table] = deleted
            print(f"   OK Deleted {deleted} records from {table}")

        # Commit the transaction
        conn.commit()

        print("\n" + "=" * 60)
        print("[OK] ALL CHAT DATA SUCCESSFULLY DELETED")
        print("=" * 60)
        print(f"\nTotal records deleted: {sum(deleted_counts.values())}")

        # Verify deletion
        print("\n[DATA] Verification (all should be 0):")
        for table in tables_to_check:
            cur.execute(f"SELECT COUNT(*) as count FROM {table}")
            count = cur.fetchone()['count']
            status = "OK" if count == 0 else "X"
            print(f"   {status} {table}: {count}")

        print("\n[OK] Chat database cleared successfully!")
        print("\nNote: User accounts, profiles, and other data remain intact.")
        print("Only chat/messaging data has been removed.")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Error clearing chats: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cur.close()
        conn.close()


def quick_clear_no_confirm():
    """Quick clear without confirmation (use with caution)"""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cur = conn.cursor()

    try:
        print("Quick clearing all chat data...")

        deletion_order = [
            'message_reactions',
            'message_read_receipts',
            'pinned_messages',
            'whiteboard_chat_messages',
            'chat_messages',
            'conversation_participants',
            'blocked_chat_contacts',
            'chat_active_sessions',
            'chat_privacy_reports',
            'conversations',
        ]

        total_deleted = 0
        for table in deletion_order:
            cur.execute(f"DELETE FROM {table}")
            total_deleted += cur.rowcount

        conn.commit()
        print(f"SUCCESS: Deleted {total_deleted} records from {len(deletion_order)} tables")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    import sys

    # Check for --force flag
    if "--force" in sys.argv:
        quick_clear_no_confirm()
    else:
        clear_all_chats()
