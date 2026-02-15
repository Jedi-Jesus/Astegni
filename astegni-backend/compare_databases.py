"""
Database Schema Comparison Tool
Compares local and production databases to identify:
1. Extra tables in local DB
2. New/updated fields in common tables
"""

import psycopg
from psycopg import sql
import json
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Database connections
LOCAL_USER_DB = os.getenv('DATABASE_URL')
LOCAL_ADMIN_DB = os.getenv('ADMIN_DATABASE_URL')

# Production database URLs (we'll need to construct these)
PROD_USER_DB = "postgresql://astegni_user:Astegni2025@128.140.122.215:5432/astegni_user_db"
PROD_ADMIN_DB = "postgresql://astegni_user:Astegni2025@128.140.122.215:5432/astegni_admin_db"


def get_database_schema(connection_string, db_name):
    """Get complete schema information for a database"""
    try:
        conn = psycopg.connect(connection_string)
        cur = conn.cursor()

        # Get all tables
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        tables = [row[0] for row in cur.fetchall()]

        schema = {}
        for table in tables:
            # Get columns for each table
            cur.execute("""
                SELECT
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = %s
                ORDER BY ordinal_position;
            """, (table,))

            columns = []
            for row in cur.fetchall():
                columns.append({
                    'name': row[0],
                    'type': row[1],
                    'max_length': row[2],
                    'nullable': row[3],
                    'default': row[4]
                })

            # Get indexes
            cur.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = %s
                AND schemaname = 'public';
            """, (table,))

            indexes = [{'name': row[0], 'definition': row[1]} for row in cur.fetchall()]

            # Get constraints
            cur.execute("""
                SELECT
                    con.conname,
                    con.contype,
                    pg_get_constraintdef(con.oid)
                FROM pg_constraint con
                JOIN pg_class rel ON rel.oid = con.conrelid
                JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                WHERE nsp.nspname = 'public'
                AND rel.relname = %s;
            """, (table,))

            constraints = [{'name': row[0], 'type': row[1], 'definition': row[2]} for row in cur.fetchall()]

            schema[table] = {
                'columns': columns,
                'indexes': indexes,
                'constraints': constraints
            }

        cur.close()
        conn.close()

        return schema

    except Exception as e:
        print(f"Error connecting to {db_name}: {e}")
        return None


def compare_schemas(local_schema, prod_schema, db_type):
    """Compare two database schemas"""
    print(f"\n{'='*80}")
    print(f"COMPARING {db_type.upper()} DATABASE")
    print(f"{'='*80}\n")

    local_tables = set(local_schema.keys())
    prod_tables = set(prod_schema.keys())

    # Tables only in local
    extra_local_tables = local_tables - prod_tables
    print(f"*** EXTRA TABLES IN LOCAL (not in production): {len(extra_local_tables)}")
    if extra_local_tables:
        for table in sorted(extra_local_tables):
            print(f"  + {table}")
            columns = [col['name'] for col in local_schema[table]['columns']]
            print(f"    Columns: {', '.join(columns)}")
    else:
        print("  None")

    # Tables only in production
    extra_prod_tables = prod_tables - local_tables
    print(f"\n*** EXTRA TABLES IN PRODUCTION (not in local): {len(extra_prod_tables)}")
    if extra_prod_tables:
        for table in sorted(extra_prod_tables):
            print(f"  + {table}")
    else:
        print("  None")

    # Common tables - check for field differences
    common_tables = local_tables & prod_tables
    print(f"\n*** COMMON TABLES: {len(common_tables)}")

    tables_with_differences = []

    for table in sorted(common_tables):
        local_cols = {col['name']: col for col in local_schema[table]['columns']}
        prod_cols = {col['name']: col for col in prod_schema[table]['columns']}

        local_col_names = set(local_cols.keys())
        prod_col_names = set(prod_cols.keys())

        # New columns in local
        new_cols = local_col_names - prod_col_names
        # Removed columns (in prod but not local)
        removed_cols = prod_col_names - local_col_names
        # Modified columns (different type or properties)
        modified_cols = []

        for col_name in local_col_names & prod_col_names:
            local_col = local_cols[col_name]
            prod_col = prod_cols[col_name]

            if (local_col['type'] != prod_col['type'] or
                local_col['nullable'] != prod_col['nullable'] or
                local_col['max_length'] != prod_col['max_length']):
                modified_cols.append({
                    'name': col_name,
                    'local': local_col,
                    'prod': prod_col
                })

        if new_cols or removed_cols or modified_cols:
            tables_with_differences.append(table)
            print(f"\n  -> {table}:")

            if new_cols:
                print(f"    [NEW] NEW COLUMNS IN LOCAL ({len(new_cols)}):")
                for col in sorted(new_cols):
                    col_info = local_cols[col]
                    print(f"       - {col} ({col_info['type']}, nullable={col_info['nullable']})")

            if removed_cols:
                print(f"    [REMOVED] REMOVED COLUMNS (in prod, not in local) ({len(removed_cols)}):")
                for col in sorted(removed_cols):
                    print(f"       - {col}")

            if modified_cols:
                print(f"    [MODIFIED] MODIFIED COLUMNS ({len(modified_cols)}):")
                for col in modified_cols:
                    print(f"       - {col['name']}:")
                    print(f"         Local:  {col['local']['type']} (nullable={col['local']['nullable']})")
                    print(f"         Prod:   {col['prod']['type']} (nullable={col['prod']['nullable']})")

    print(f"\n*** SUMMARY:")
    print(f"  - Extra tables in local: {len(extra_local_tables)}")
    print(f"  - Extra tables in production: {len(extra_prod_tables)}")
    print(f"  - Common tables with differences: {len(tables_with_differences)}")

    return {
        'extra_local_tables': list(extra_local_tables),
        'extra_prod_tables': list(extra_prod_tables),
        'tables_with_differences': tables_with_differences,
        'local_schema': local_schema,
        'prod_schema': prod_schema
    }


def main():
    print("DATABASE SCHEMA COMPARISON")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Get schemas
    print("Fetching LOCAL USER DATABASE schema...")
    local_user_schema = get_database_schema(LOCAL_USER_DB, "Local User DB")

    print("Fetching LOCAL ADMIN DATABASE schema...")
    local_admin_schema = get_database_schema(LOCAL_ADMIN_DB, "Local Admin DB")

    print("Fetching PRODUCTION USER DATABASE schema...")
    prod_user_schema = get_database_schema(PROD_USER_DB, "Production User DB")

    print("Fetching PRODUCTION ADMIN DATABASE schema...")
    prod_admin_schema = get_database_schema(PROD_ADMIN_DB, "Production Admin DB")

    if not all([local_user_schema, local_admin_schema, prod_user_schema, prod_admin_schema]):
        print("[ERROR] Failed to fetch all schemas. Check database connections.")
        return

    # Compare
    user_comparison = compare_schemas(local_user_schema, prod_user_schema, "USER")
    admin_comparison = compare_schemas(local_admin_schema, prod_admin_schema, "ADMIN")

    # Save detailed report
    report = {
        'timestamp': datetime.now().isoformat(),
        'user_db': user_comparison,
        'admin_db': admin_comparison
    }

    report_file = f"database_comparison_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2, default=str)

    print(f"\n[SUCCESS] Detailed report saved to: {report_file}")


if __name__ == "__main__":
    main()
