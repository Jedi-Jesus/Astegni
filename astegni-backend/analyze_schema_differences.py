"""
Analyze Schema Differences
This script compares local and production schemas from JSON files
"""

import json
import sys
from datetime import datetime


def load_schema(filename):
    """Load schema from JSON file"""
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filename}: {e}")
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
            print(f"    Columns ({len(columns)}): {', '.join(columns[:10])}")
            if len(columns) > 10:
                print(f"    ... and {len(columns) - 10} more columns")
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
                print(f"    [REMOVED] COLUMNS IN PROD, NOT IN LOCAL ({len(removed_cols)}):")
                for col in sorted(removed_cols):
                    print(f"       - {col}")

            if modified_cols:
                print(f"    [MODIFIED] MODIFIED COLUMNS ({len(modified_cols)}):")
                for col in modified_cols:
                    print(f"       - {col['name']}:")
                    print(f"         Local:  {col['local']['type']} (nullable={col['local']['nullable']})")
                    print(f"         Prod:   {col['prod']['type']} (nullable={col['prod']['nullable']})")

    print(f"\n*** SUMMARY FOR {db_type.upper()}:")
    print(f"  - Total local tables: {len(local_tables)}")
    print(f"  - Total production tables: {len(prod_tables)}")
    print(f"  - Extra tables in local: {len(extra_local_tables)}")
    print(f"  - Extra tables in production: {len(extra_prod_tables)}")
    print(f"  - Common tables: {len(common_tables)}")
    print(f"  - Common tables with differences: {len(tables_with_differences)}")

    return {
        'extra_local_tables': sorted(list(extra_local_tables)),
        'extra_prod_tables': sorted(list(extra_prod_tables)),
        'tables_with_differences': tables_with_differences,
        'local_table_count': len(local_tables),
        'prod_table_count': len(prod_tables)
    }


def generate_migration_sql(local_schema, prod_schema, db_name):
    """Generate SQL to sync production with local"""
    print(f"\n{'='*80}")
    print(f"MIGRATION SQL FOR {db_name.upper()}")
    print(f"{'='*80}\n")

    sql_statements = []
    local_tables = set(local_schema.keys())
    prod_tables = set(prod_schema.keys())

    # New tables in local
    new_tables = local_tables - prod_tables
    if new_tables:
        print(f"-- Tables to create: {len(new_tables)}")
        for table in sorted(new_tables):
            sql_statements.append(f"-- TODO: Create table {table}")
            sql_statements.append(f"-- This table has {len(local_schema[table]['columns'])} columns")

    # Common tables with new columns
    common_tables = local_tables & prod_tables
    for table in sorted(common_tables):
        local_cols = {col['name']: col for col in local_schema[table]['columns']}
        prod_cols = {col['name']: col for col in prod_schema[table]['columns']}

        new_cols = set(local_cols.keys()) - set(prod_cols.keys())

        if new_cols:
            sql_statements.append(f"\n-- Add new columns to {table}")
            for col_name in sorted(new_cols):
                col = local_cols[col_name]
                nullable = "NULL" if col['nullable'] == 'YES' else "NOT NULL"
                col_type = col['type'].upper()
                if col['max_length']:
                    col_type = f"{col_type}({col['max_length']})"

                default_clause = ""
                if col['default']:
                    default_clause = f" DEFAULT {col['default']}"

                sql_statements.append(
                    f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_name} {col_type}{default_clause} {nullable};"
                )

    if sql_statements:
        print("\n".join(sql_statements))
    else:
        print("-- No migration needed, production is up to date")

    return sql_statements


def main():
    print("="*80)
    print("DATABASE SCHEMA COMPARISON TOOL")
    print("="*80)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Try to find the most recent schema files
    import glob
    local_files = sorted(glob.glob("local_schemas_*.json"), reverse=True)
    prod_files = sorted(glob.glob("production_schemas_*.json"), reverse=True)

    if not local_files:
        print("[ERROR] No local schema files found. Run get_local_schema.py first.")
        return

    local_file = local_files[0]
    print(f"Using local schema: {local_file}")

    if not prod_files:
        print("[WARNING] No production schema files found.")
        print("You need to:")
        print("  1. SSH into production server: ssh root@128.140.122.215")
        print("  2. Run production_commands.sh or get_prod_schema.py")
        print("  3. Download the resulting production_schemas_*.json file")
        print("\nFor now, will only show local database statistics.\n")

        # Show local stats only
        local_data = load_schema(local_file)
        if local_data:
            print(f"Local User DB: {local_data['user_db_table_count']} tables")
            print(f"Local Admin DB: {local_data['admin_db_table_count']} tables")
            print(f"\nLocal User DB tables:")
            for table in sorted(local_data['user_db'].keys()):
                col_count = len(local_data['user_db'][table]['columns'])
                print(f"  - {table} ({col_count} columns)")
        return

    prod_file = prod_files[0]
    print(f"Using production schema: {prod_file}")

    # Load schemas
    local_data = load_schema(local_file)
    prod_data = load_schema(prod_file)

    if not local_data or not prod_data:
        print("[ERROR] Failed to load schema files.")
        return

    # Compare User DB
    user_comparison = compare_schemas(
        local_data['user_db'],
        prod_data['user_db'],
        "USER"
    )

    # Compare Admin DB
    admin_comparison = compare_schemas(
        local_data['admin_db'],
        prod_data['admin_db'],
        "ADMIN"
    )

    # Generate migration SQL
    user_migration = generate_migration_sql(
        local_data['user_db'],
        prod_data['user_db'],
        "USER DB"
    )

    admin_migration = generate_migration_sql(
        local_data['admin_db'],
        prod_data['admin_db'],
        "ADMIN DB"
    )

    # Save detailed report
    report = {
        'timestamp': datetime.now().isoformat(),
        'local_file': local_file,
        'prod_file': prod_file,
        'user_db': user_comparison,
        'admin_db': admin_comparison,
        'user_migration_sql': user_migration,
        'admin_migration_sql': admin_migration
    }

    report_file = f"schema_comparison_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2, default=str)

    print(f"\n[SUCCESS] Detailed report saved to: {report_file}")

    # Save migration SQL to file
    if user_migration or admin_migration:
        sql_file = f"migration_sync_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        with open(sql_file, 'w') as f:
            f.write("-- Migration SQL to sync production with local\n")
            f.write(f"-- Generated: {datetime.now().isoformat()}\n\n")
            if user_migration:
                f.write("-- USER DATABASE\n")
                f.write("\n".join(user_migration))
                f.write("\n\n")
            if admin_migration:
                f.write("-- ADMIN DATABASE\n")
                f.write("\n".join(admin_migration))
        print(f"[SUCCESS] Migration SQL saved to: {sql_file}")


if __name__ == "__main__":
    main()
