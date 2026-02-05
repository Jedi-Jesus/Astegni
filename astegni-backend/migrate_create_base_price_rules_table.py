"""
Migration: Create base_price_rules table
For storing starting price rules for new tutors without market data
"""

import psycopg
from datetime import datetime

# Database connection - ADMIN DATABASE
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db"

def migrate():
    """Create base_price_rules table"""

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Creating base_price_rules table...")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS base_price_rules (
                id SERIAL PRIMARY KEY,
                rule_name VARCHAR(200) NOT NULL,
                subject_category VARCHAR(100) NOT NULL,
                session_format VARCHAR(50) NOT NULL,
                base_price_per_hour DECIMAL(10, 2) NOT NULL CHECK (base_price_per_hour > 0),
                credential_bonus DECIMAL(10, 2) DEFAULT 0 CHECK (credential_bonus >= 0),
                priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP
            );
        """)

        # Create partial unique index for active rules only
        print("Creating unique constraint for active rules...")
        cur.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_rules
            ON base_price_rules(subject_category, session_format)
            WHERE is_active = TRUE;
        """)

        # Create indexes for faster lookups
        print("Creating indexes...")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_base_price_active
            ON base_price_rules(is_active)
            WHERE is_active = TRUE;
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_base_price_priority
            ON base_price_rules(priority, created_at DESC);
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_base_price_lookup
            ON base_price_rules(subject_category, session_format, is_active);
        """)

        # Insert default base price rules
        print("Inserting default base price rules...")

        default_rules = [
            {
                'rule_name': 'Default - All Subjects & Formats',
                'subject_category': 'all',
                'session_format': 'all',
                'base_price': 50.00,
                'credential_bonus': 10.00,
                'priority': 3
            },
            {
                'rule_name': 'Mathematics Online',
                'subject_category': 'mathematics',
                'session_format': 'Online',
                'base_price': 60.00,
                'credential_bonus': 15.00,
                'priority': 1
            },
            {
                'rule_name': 'Computer Science & IT',
                'subject_category': 'computer_science',
                'session_format': 'all',
                'base_price': 75.00,
                'credential_bonus': 20.00,
                'priority': 1
            },
            {
                'rule_name': 'Languages - All Formats',
                'subject_category': 'languages',
                'session_format': 'all',
                'base_price': 45.00,
                'credential_bonus': 10.00,
                'priority': 2
            }
        ]

        for rule in default_rules:
            cur.execute("""
                INSERT INTO base_price_rules
                (rule_name, subject_category, session_format, base_price_per_hour, credential_bonus, priority, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                ON CONFLICT DO NOTHING
            """, (
                rule['rule_name'],
                rule['subject_category'],
                rule['session_format'],
                rule['base_price'],
                rule['credential_bonus'],
                rule['priority']
            ))

        conn.commit()

        # Verify table
        cur.execute("SELECT COUNT(*) FROM base_price_rules")
        count = cur.fetchone()[0]

        print(f"\nMigration completed successfully!")
        print(f"base_price_rules table created with {count} default rules")
        print("\nDefault rules:")

        cur.execute("""
            SELECT rule_name, subject_category, session_format, base_price_per_hour, credential_bonus, priority
            FROM base_price_rules
            ORDER BY priority ASC, created_at DESC
        """)

        for row in cur.fetchall():
            print(f"  - {row[0]}: {row[3]} ETB/hr (subject: {row[1]}, format: {row[2]}, priority: {row[5]}, bonus: +{row[4]} ETB/credential)")

    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        raise

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    migrate()
