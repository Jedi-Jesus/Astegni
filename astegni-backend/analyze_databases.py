"""
Database Schema Analysis Tool
Compares local and production databases to identify differences
"""

import psycopg
from psycopg.rows import dict_row
from datetime import datetime
import json

# Database configurations
LOCAL_USER_DB = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"
LOCAL_ADMIN_DB = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db"

PROD_USER_DB = "postgresql://astegni_user:Astegni2025@128.140.122.215:5432/astegni_user_db"
PROD_ADMIN_DB = "postgresql://astegni_user:Astegni2025@128.140.122.215:5432/astegni_admin_db"

def get_database_info(connection_string, db_name):
    """Get comprehensive database information"""
    try:
        with psycopg.connect(connection_string, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                # Get all tables
                cur.execute("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    ORDER BY table_name;
                """)
                tables = [row['table_name'] for row in cur.fetchall()]

                # Get table details for each table
                table_details = {}
                for table in tables:
                    # Get columns
                    cur.execute(f"""
                        SELECT
                            column_name,
                            data_type,
                            is_nullable,
                            column_default
                        FROM information_schema.columns
                        WHERE table_name = '{table}'
                        ORDER BY ordinal_position;
                    """)
                    columns = cur.fetchall()

                    # Get row count
                    cur.execute(f'SELECT COUNT(*) as count FROM "{table}"')
                    row_count = cur.fetchone()['count']

                    # Get constraints
                    cur.execute(f"""
                        SELECT constraint_name, constraint_type
                        FROM information_schema.table_constraints
                        WHERE table_name = '{table}';
                    """)
                    constraints = cur.fetchall()

                    table_details[table] = {
                        'columns': columns,
                        'row_count': row_count,
                        'constraints': constraints
                    }

                return {
                    'database': db_name,
                    'table_count': len(tables),
                    'tables': tables,
                    'table_details': table_details
                }
    except Exception as e:
        return {
            'database': db_name,
            'error': str(e)
        }

def compare_databases(local_info, prod_info, db_type):
    """Compare local and production databases"""
    print(f"\n{'='*80}")
    print(f"COMPARISON: {db_type.upper()}")
    print(f"{'='*80}\n")

    if 'error' in local_info:
        print(f"[ERROR] LOCAL: {local_info['error']}")
        return

    if 'error' in prod_info:
        print(f"[ERROR] PRODUCTION: {prod_info['error']}")
        return

    local_tables = set(local_info['tables'])
    prod_tables = set(prod_info['tables'])

    # New tables in local
    new_tables = local_tables - prod_tables
    if new_tables:
        print(f"[+] NEW TABLES IN LOCAL ({len(new_tables)}):")
        for table in sorted(new_tables):
            details = local_info['table_details'][table]
            print(f"   * {table} ({details['row_count']} rows, {len(details['columns'])} columns)")

    # Removed tables
    removed_tables = prod_tables - local_tables
    if removed_tables:
        print(f"\n[-] TABLES REMOVED FROM LOCAL ({len(removed_tables)}):")
        for table in sorted(removed_tables):
            print(f"   * {table}")

    # Modified tables
    common_tables = local_tables & prod_tables
    modified_tables = []

    for table in sorted(common_tables):
        local_cols = {col['column_name']: col for col in local_info['table_details'][table]['columns']}
        prod_cols = {col['column_name']: col for col in prod_info['table_details'][table]['columns']}

        local_col_names = set(local_cols.keys())
        prod_col_names = set(prod_cols.keys())

        new_cols = local_col_names - prod_col_names
        removed_cols = prod_col_names - local_col_names

        # Check for type changes
        type_changes = []
        for col in local_col_names & prod_col_names:
            if local_cols[col]['data_type'] != prod_cols[col]['data_type']:
                type_changes.append({
                    'column': col,
                    'old_type': prod_cols[col]['data_type'],
                    'new_type': local_cols[col]['data_type']
                })

        if new_cols or removed_cols or type_changes:
            modified_tables.append({
                'table': table,
                'new_cols': new_cols,
                'removed_cols': removed_cols,
                'type_changes': type_changes,
                'local_rows': local_info['table_details'][table]['row_count'],
                'prod_rows': prod_info['table_details'][table]['row_count']
            })

    if modified_tables:
        print(f"\n[~] MODIFIED TABLES ({len(modified_tables)}):")
        for mod in modified_tables:
            print(f"\n   [TABLE] {mod['table']}")
            print(f"      Rows: Local={mod['local_rows']}, Prod={mod['prod_rows']}")

            if mod['new_cols']:
                print(f"      [+] New columns: {', '.join(sorted(mod['new_cols']))}")
            if mod['removed_cols']:
                print(f"      [-] Removed columns: {', '.join(sorted(mod['removed_cols']))}")
            if mod['type_changes']:
                print(f"      [~] Type changes:")
                for tc in mod['type_changes']:
                    print(f"         * {tc['column']}: {tc['old_type']} -> {tc['new_type']}")

    # Summary
    print(f"\n{'─'*80}")
    print(f"SUMMARY:")
    print(f"  Local:      {len(local_tables)} tables")
    print(f"  Production: {len(prod_tables)} tables")
    print(f"  New:        {len(new_tables)} tables")
    print(f"  Removed:    {len(removed_tables)} tables")
    print(f"  Modified:   {len(modified_tables)} tables")
    print(f"{'─'*80}")

def main():
    print(f"\n{'='*80}")
    print(f"DATABASE SCHEMA ANALYSIS - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*80}")

    # Analyze local databases
    print("\n[*] Analyzing LOCAL databases...")
    local_user_info = get_database_info(LOCAL_USER_DB, "LOCAL User DB")
    local_admin_info = get_database_info(LOCAL_ADMIN_DB, "LOCAL Admin DB")

    # Analyze production databases
    print("[*] Analyzing PRODUCTION databases...")
    prod_user_info = get_database_info(PROD_USER_DB, "PROD User DB")
    prod_admin_info = get_database_info(PROD_ADMIN_DB, "PROD Admin DB")

    # Compare User DB
    compare_databases(local_user_info, prod_user_info, "User Database")

    # Compare Admin DB
    compare_databases(local_admin_info, prod_admin_info, "Admin Database")

    # Save detailed report
    report = {
        'timestamp': datetime.now().isoformat(),
        'local': {
            'user_db': local_user_info,
            'admin_db': local_admin_info
        },
        'production': {
            'user_db': prod_user_info,
            'admin_db': prod_admin_info
        }
    }

    with open('database_comparison_report.json', 'w') as f:
        json.dump(report, f, indent=2, default=str)

    print(f"\n[OK] Detailed report saved to: database_comparison_report.json\n")

if __name__ == "__main__":
    main()
