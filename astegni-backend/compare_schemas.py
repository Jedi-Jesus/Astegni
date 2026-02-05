"""
Compare local and production database schemas
"""

import json

def load_schema(filename):
    with open(filename, 'r') as f:
        return json.load(f)

def compare_schemas():
    print("="*80)
    print("DATABASE SCHEMA COMPARISON - LOCAL vs PRODUCTION")
    print("="*80)

    local = load_schema('local_db_schema.json')
    prod = load_schema('prod_db_schema.json')

    # Compare User DB
    print("\n" + "="*80)
    print("USER DATABASE")
    print("="*80)

    local_user_tables = set(local['user_db']['tables'])
    prod_user_tables = set(prod['user_db']['tables'])

    new_tables = local_user_tables - prod_user_tables
    removed_tables = prod_user_tables - local_user_tables
    common_tables = local_user_tables & prod_user_tables

    print(f"\nLocal: {len(local_user_tables)} tables")
    print(f"Production: {len(prod_user_tables)} tables")

    if new_tables:
        print(f"\n[NEW TABLES] {len(new_tables)} tables need to be created on production:")
        for table in sorted(new_tables):
            schema = local['user_db']['schema'][table]
            print(f"  * {table}: {len(schema['columns'])} columns, {schema['row_count']} rows locally")

    if removed_tables:
        print(f"\n[REMOVED TABLES] {len(removed_tables)} tables exist in production but not locally:")
        for table in sorted(removed_tables):
            print(f"  * {table}")

    # Check for column differences in common tables
    modified_tables = []
    for table in sorted(common_tables):
        local_cols = {col['column_name']: col for col in local['user_db']['schema'][table]['columns']}
        prod_cols = {col['column_name']: col for col in prod['user_db']['schema'][table]['columns']}

        local_col_names = set(local_cols.keys())
        prod_col_names = set(prod_cols.keys())

        new_cols = local_col_names - prod_col_names
        removed_cols = prod_col_names - local_col_names

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
                'type_changes': type_changes
            })

    if modified_tables:
        print(f"\n[MODIFIED TABLES] {len(modified_tables)} tables have schema differences:")
        for mod in modified_tables:
            print(f"\n  [{mod['table']}]")
            if mod['new_cols']:
                print(f"    + New columns: {', '.join(sorted(mod['new_cols']))}")
            if mod['removed_cols']:
                print(f"    - Removed columns: {', '.join(sorted(mod['removed_cols']))}")
            if mod['type_changes']:
                print(f"    ~ Type changes:")
                for tc in mod['type_changes']:
                    print(f"      * {tc['column']}: {tc['old_type']} -> {tc['new_type']}")

    # Compare Admin DB
    print("\n" + "="*80)
    print("ADMIN DATABASE")
    print("="*80)

    local_admin_tables = set(local['admin_db']['tables'])
    prod_admin_tables = set(prod['admin_db']['tables'])

    new_admin_tables = local_admin_tables - prod_admin_tables
    removed_admin_tables = prod_admin_tables - local_admin_tables
    common_admin_tables = local_admin_tables & prod_admin_tables

    print(f"\nLocal: {len(local_admin_tables)} tables")
    print(f"Production: {len(prod_admin_tables)} tables")

    if new_admin_tables:
        print(f"\n[NEW TABLES] {len(new_admin_tables)} tables need to be created on production:")
        for table in sorted(new_admin_tables):
            schema = local['admin_db']['schema'][table]
            print(f"  * {table}: {len(schema['columns'])} columns, {schema['row_count']} rows locally")

    if removed_admin_tables:
        print(f"\n[REMOVED TABLES] {len(removed_admin_tables)} tables exist in production but not locally:")
        for table in sorted(removed_admin_tables):
            print(f"  * {table}")

    # Check for column differences in admin common tables
    modified_admin_tables = []
    for table in sorted(common_admin_tables):
        local_cols = {col['column_name']: col for col in local['admin_db']['schema'][table]['columns']}
        prod_cols = {col['column_name']: col for col in prod['admin_db']['schema'][table]['columns']}

        local_col_names = set(local_cols.keys())
        prod_col_names = set(prod_cols.keys())

        new_cols = local_col_names - prod_col_names
        removed_cols = prod_col_names - local_col_names

        type_changes = []
        for col in local_col_names & prod_col_names:
            if local_cols[col]['data_type'] != prod_cols[col]['data_type']:
                type_changes.append({
                    'column': col,
                    'old_type': prod_cols[col]['data_type'],
                    'new_type': local_cols[col]['data_type']
                })

        if new_cols or removed_cols or type_changes:
            modified_admin_tables.append({
                'table': table,
                'new_cols': new_cols,
                'removed_cols': removed_cols,
                'type_changes': type_changes
            })

    if modified_admin_tables:
        print(f"\n[MODIFIED TABLES] {len(modified_admin_tables)} tables have schema differences:")
        for mod in modified_admin_tables:
            print(f"\n  [{mod['table']}]")
            if mod['new_cols']:
                print(f"    + New columns: {', '.join(sorted(mod['new_cols']))}")
            if mod['removed_cols']:
                print(f"    - Removed columns: {', '.join(sorted(mod['removed_cols']))}")
            if mod['type_changes']:
                print(f"    ~ Type changes:")
                for tc in mod['type_changes']:
                    print(f"      * {tc['column']}: {tc['old_type']} -> {tc['new_type']}")

    # Summary
    print("\n" + "="*80)
    print("DEPLOYMENT SUMMARY")
    print("="*80)
    print(f"\nUSER DATABASE:")
    print(f"  - New tables to create: {len(new_tables)}")
    print(f"  - Tables to modify: {len(modified_tables)}")
    print(f"  - Tables to remove: {len(removed_tables)}")

    print(f"\nADMIN DATABASE:")
    print(f"  - New tables to create: {len(new_admin_tables)}")
    print(f"  - Tables to modify: {len(modified_admin_tables)}")
    print(f"  - Tables to remove: {len(removed_admin_tables)}")

    total_changes = len(new_tables) + len(modified_tables) + len(new_admin_tables) + len(modified_admin_tables)
    print(f"\nTOTAL CHANGES REQUIRED: {total_changes}")

    if total_changes > 0:
        print("\n[NEXT STEPS]")
        print("1. Backup production databases")
        print("2. Export local database changes as SQL")
        print("3. Transfer SQL files to production")
        print("4. Apply changes on production")
        print("5. Commit and push code changes")
        print("6. Verify deployment")
    else:
        print("\n[STATUS] Databases are in sync!")

    print("="*80)

if __name__ == "__main__":
    compare_schemas()
