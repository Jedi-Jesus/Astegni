"""
Generate SQL migration files for production deployment
"""

import psycopg
from psycopg.rows import dict_row

LOCAL_USER_DB = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"
LOCAL_ADMIN_DB = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db"

def get_table_ddl(conn, table_name):
    """Get CREATE TABLE statement for a table"""
    with conn.cursor() as cur:
        # Get table columns with full definition
        cur.execute(f"""
            SELECT
                column_name,
                data_type,
                character_maximum_length,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = '{table_name}'
            ORDER BY ordinal_position;
        """)
        columns = cur.fetchall()

        # Get constraints
        cur.execute(f"""
            SELECT
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.table_name = '{table_name}'
            ORDER BY tc.constraint_type, kcu.ordinal_position;
        """)
        constraints = cur.fetchall()

        # Build DDL
        ddl = f"CREATE TABLE IF NOT EXISTS \"{table_name}\" (\n"

        col_defs = []
        for col in columns:
            col_def = f"    \"{col['column_name']}\" {col['data_type']}"
            if col['character_maximum_length']:
                col_def += f"({col['character_maximum_length']})"
            if col['is_nullable'] == 'NO':
                col_def += " NOT NULL"
            if col['column_default']:
                col_def += f" DEFAULT {col['column_default']}"
            col_defs.append(col_def)

        ddl += ",\n".join(col_defs)

        # Add constraints
        constraint_defs = []
        for constraint in constraints:
            if constraint['constraint_type'] == 'PRIMARY KEY':
                constraint_defs.append(f"    PRIMARY KEY (\"{constraint['column_name']}\")")
            elif constraint['constraint_type'] == 'FOREIGN KEY':
                constraint_defs.append(
                    f"    FOREIGN KEY (\"{constraint['column_name']}\") REFERENCES \"{constraint['foreign_table_name']}\"(\"{constraint['foreign_column_name']}\")"
                )

        if constraint_defs:
            ddl += ",\n" + ",\n".join(constraint_defs)

        ddl += "\n);\n"
        return ddl

def generate_user_db_migration():
    """Generate migration SQL for user database"""
    sql = []
    sql.append("-- USER DATABASE MIGRATION")
    sql.append("-- Generated: $(date +%Y-%m-%d)")
    sql.append("-- IMPORTANT: Review this file before running on production!")
    sql.append("")

    with psycopg.connect(LOCAL_USER_DB, row_factory=dict_row) as conn:
        # New tables to create
        new_tables = [
            'chat_two_step_verification',
            'credentials_backup_role_based',
            'enrollment_payments',
            'overdue_payments',
            'pinned_messages',
            'price_suggestion_analytics',
            'referral_clicks',
            'referral_registrations',
            'student_investments',
            'subscription_metrics',
            'user_investments',
            'user_referral_codes',
            'whiteboard_sessions_legacy_backup_20260110_101940'
        ]

        sql.append("-- CREATE NEW TABLES")
        sql.append("")
        for table in new_tables:
            print(f"Processing table: {table}")
            try:
                ddl = get_table_ddl(conn, table)
                sql.append(f"-- {table}")
                sql.append(ddl)
                sql.append("")
            except Exception as e:
                print(f"Error getting DDL for {table}: {e}")

        # Modifications for existing tables
        sql.append("-- ALTER EXISTING TABLES")
        sql.append("")

        modifications = {
            'advertiser_profiles': {
                'add': ['brand_ids TEXT', 'scheduled_deletion_at TIMESTAMP'],
                'drop': ['location', 'profile_picture', 'socials']
            },
            'campaign_profile': {
                'add': ['target_audiences JSONB', 'target_placements JSONB', 'target_regions JSONB'],
                'drop': ['daily_budget']
            },
            'chat_active_sessions': {
                'add': ['is_online BOOLEAN DEFAULT TRUE', 'last_active_at TIMESTAMP'],
                'drop': ['last_active']
            },
            'conversations': {
                'add': ['created_by_user_id INTEGER'],
                'drop': []
            },
            'courses': {
                'add': ['last_search_increment TIMESTAMP', 'search_count INTEGER DEFAULT 0', 'trending_score NUMERIC(10,2)'],
                'drop': []
            },
            'credentials': {
                'add': ['years VARCHAR(20)'],
                'drop': []
            },
            'enrolled_students': {
                'add': [
                    'agreed_price NUMERIC(10,2)',
                    'cancelled_sessions INTEGER DEFAULT 0',
                    'completed_sessions INTEGER DEFAULT 0',
                    'payment_due_date DATE',
                    'payment_received_date DATE',
                    'payment_status VARCHAR(20)',
                    'total_sessions INTEGER DEFAULT 0'
                ],
                'drop': []
            },
            'notes': {
                'add': ['search_vector TSVECTOR'],
                'drop': []
            },
            'requested_sessions': {
                'add': ['counter_offer_price NUMERIC(10,2)'],
                'drop': []
            },
            'schools': {
                'add': ['last_search_increment TIMESTAMP', 'search_count INTEGER DEFAULT 0', 'trending_score NUMERIC(10,2)'],
                'drop': []
            },
            'sessions': {
                'add': [
                    'attendance_marked_at TIMESTAMP',
                    'attendance_marked_by INTEGER',
                    'attendance_notes TEXT',
                    'attendance_source VARCHAR(20)'
                ],
                'drop': []
            },
            'student_profiles': {
                'add': ['scheduled_deletion_at TIMESTAMP'],
                'drop': ['hobbies', 'languages', 'location', 'profile_picture']
            },
            'tutor_profiles': {
                'add': [
                    'last_search_increment TIMESTAMP',
                    'scheduled_deletion_at TIMESTAMP',
                    'search_count INTEGER DEFAULT 0',
                    'trending_score NUMERIC(10,2)'
                ],
                'drop': ['languages', 'location', 'profile_picture', 'social_links', 'subscription_expires_at', 'subscription_plan_id', 'subscription_started_at']
            },
            'user_profiles': {
                'add': ['scheduled_deletion_at TIMESTAMP'],
                'drop': ['languages', 'location', 'profile_picture', 'social_links']
            },
            'users': {
                'add': [
                    'accent_color VARCHAR(7)',
                    'color_palette VARCHAR(20)',
                    'country_code VARCHAR(5)',
                    'currency VARCHAR(3)',
                    'display_density VARCHAR(20)',
                    'display_location BOOLEAN DEFAULT FALSE',
                    'enable_animations BOOLEAN DEFAULT TRUE',
                    'font_family VARCHAR(50)',
                    'font_size VARCHAR(20)',
                    'google_email VARCHAR(255)',
                    'hobbies TEXT[]',
                    'languages TEXT[]',
                    'last_name VARCHAR(100)',
                    'location VARCHAR(255)',
                    'oauth_provider VARCHAR(50)',
                    'reduce_motion BOOLEAN DEFAULT FALSE',
                    'sidebar_position VARCHAR(20)',
                    'social_links JSONB',
                    'subscription_expires_at TIMESTAMP',
                    'subscription_plan_id INTEGER',
                    'subscription_started_at TIMESTAMP',
                    'theme VARCHAR(20)'
                ],
                'drop': []
            },
            'whiteboard_canvas_data': {
                'add': ['profile_id INTEGER', 'profile_type VARCHAR(20)'],
                'drop': []
            },
            'whiteboard_sessions': {
                'add': [
                    'connection_logs JSONB',
                    'participant_profile_ids INTEGER[]',
                    'participant_profile_types VARCHAR(20)[]',
                    'student_connected_at TIMESTAMP',
                    'student_disconnected_at TIMESTAMP',
                    'student_last_activity_at TIMESTAMP',
                    'student_profile_ids INTEGER[]',
                    'student_total_active_seconds INTEGER DEFAULT 0',
                    'tutor_connected_at TIMESTAMP',
                    'tutor_disconnected_at TIMESTAMP',
                    'tutor_last_activity_at TIMESTAMP',
                    'tutor_total_active_seconds INTEGER DEFAULT 0'
                ],
                'drop': ['attendance_status', 'student_id', 'tutor_id']
            }
        }

        for table, changes in modifications.items():
            sql.append(f"-- {table}")
            for col in changes['add']:
                sql.append(f"ALTER TABLE \"{table}\" ADD COLUMN IF NOT EXISTS {col};")
            for col in changes['drop']:
                sql.append(f"-- ALTER TABLE \"{table}\" DROP COLUMN IF EXISTS \"{col}\";  -- COMMENTED: Manual review required")
            sql.append("")

        # Drop tutor_investments
        sql.append("-- DROP DEPRECATED TABLES")
        sql.append("-- DROP TABLE IF EXISTS tutor_investments;  -- COMMENTED: Manual review required")
        sql.append("")

    return "\n".join(sql)

def generate_admin_db_migration():
    """Generate migration SQL for admin database"""
    sql = []
    sql.append("-- ADMIN DATABASE MIGRATION")
    sql.append("-- Generated: $(date +%Y-%m-%d)")
    sql.append("")

    with psycopg.connect(LOCAL_ADMIN_DB, row_factory=dict_row) as conn:
        # New tables
        new_tables = ['base_price_rules', 'subscription_features']

        sql.append("-- CREATE NEW TABLES")
        sql.append("")
        for table in new_tables:
            print(f"Processing table: {table}")
            try:
                ddl = get_table_ddl(conn, table)
                sql.append(f"-- {table}")
                sql.append(ddl)
                sql.append("")
            except Exception as e:
                print(f"Error getting DDL for {table}: {e}")

        # Modifications
        sql.append("-- ALTER EXISTING TABLES")
        sql.append("")

        modifications = {
            'affiliate_tiers': {
                'add': ['business_type VARCHAR(50)'],
                'drop': []
            },
            'astegni_reviews': {
                'add': [
                    'ease_of_use INTEGER',
                    'features_quality INTEGER',
                    'pricing INTEGER',
                    'support_quality INTEGER',
                    'would_recommend BOOLEAN'
                ],
                'drop': ['customer_service', 'employee_satisfaction', 'platform_satisfaction', 'reviewer_role']
            },
            'cpi_settings': {
                'add': ['country VARCHAR(5)'],
                'drop': []
            },
            'subscription_plans': {
                'add': ['country VARCHAR(5)'],
                'drop': ['features', 'subscription_type']
            },
            'verification_fee': {
                'add': ['country VARCHAR(5)'],
                'drop': []
            }
        }

        for table, changes in modifications.items():
            sql.append(f"-- {table}")
            for col in changes['add']:
                sql.append(f"ALTER TABLE \"{table}\" ADD COLUMN IF NOT EXISTS {col};")
            for col in changes['drop']:
                sql.append(f"-- ALTER TABLE \"{table}\" DROP COLUMN IF EXISTS \"{col}\";  -- COMMENTED: Manual review required")
            sql.append("")

    return "\n".join(sql)

def main():
    print("Generating migration SQL files...")

    # Generate User DB migration
    print("\n[1/2] Generating User DB migration...")
    user_migration = generate_user_db_migration()
    with open('migration_user_db.sql', 'w') as f:
        f.write(user_migration)
    print("Created: migration_user_db.sql")

    # Generate Admin DB migration
    print("\n[2/2] Generating Admin DB migration...")
    admin_migration = generate_admin_db_migration()
    with open('migration_admin_db.sql', 'w') as f:
        f.write(admin_migration)
    print("Created: migration_admin_db.sql")

    print("\n[DONE] Migration files created successfully!")
    print("\nNext steps:")
    print("1. Review both SQL files carefully")
    print("2. Transfer to production: scp migration_*.sql root@128.140.122.215:/tmp/")
    print("3. Apply on production")

if __name__ == "__main__":
    main()
