"""
Verify that all admin page modals have been updated correctly
"""
import re
import sys
import io

# Force UTF-8 output encoding for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ADMIN_FILES = [
    'admin-pages/manage-campaigns.html',
    'admin-pages/manage-courses.html',
    'admin-pages/manage-schools.html',
    'admin-pages/manage-tutors.html',
    'admin-pages/manage-system-settings.html'
]

REQUIRED_FIELDS = [
    'firstNameInput',
    'fatherNameInput',
    'grandfatherNameInput',
    'adminUsernameInput',
    'emailInput',
    'phoneNumberInput',
    'bioInput',
    'quoteInput',
    'departmentInput',
    'displayEmployeeId',
    'displayAccessLevel',
    'displayResponsibilities'
]

def verify_file(filepath):
    """Verify a single file has all required fields"""
    print(f"Verifying {filepath}...")

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check for profile name id change
        has_username_id = 'id="adminUsername"' in content
        has_old_name_id = 'id="adminName"' in content

        print(f"  Profile Header:")
        if has_username_id:
            print(f"    ✓ Uses id='adminUsername'")
        else:
            print(f"    ✗ Missing id='adminUsername'")

        if has_old_name_id:
            print(f"    ⚠ Still has old id='adminName'")

        # Check for required fields in modal
        print(f"  Edit Profile Modal Fields:")
        missing_fields = []
        for field in REQUIRED_FIELDS:
            if f'id="{field}"' in content:
                print(f"    ✓ {field}")
            else:
                print(f"    ✗ Missing {field}")
                missing_fields.append(field)

        # Check for read-only department
        if 'readonly' in content and 'departmentInput' in content:
            print(f"  ✓ Department field is read-only")
        else:
            print(f"  ⚠ Department field might not be read-only")

        # Check for Ethiopian naming comments
        if 'Ethiopian Naming Convention' in content:
            print(f"  ✓ Ethiopian naming convention comment present")
        else:
            print(f"  ⚠ Ethiopian naming convention comment missing")

        # Check for admin_profile vs admin_profile_stats comments
        if 'admin_profile_stats' in content and 'managed by super admin' in content.lower():
            print(f"  ✓ Clear comments about admin_profile_stats management")
        else:
            print(f"  ⚠ Comments about admin_profile_stats might be missing")

        print()
        return len(missing_fields) == 0 and has_username_id

    except Exception as e:
        print(f"  ✗ Error reading {filepath}: {e}")
        print()
        return False

def main():
    """Main verification function"""
    print("="*80)
    print("ADMIN MODAL UPDATE VERIFICATION")
    print("="*80)
    print()

    all_pass = True
    for filepath in ADMIN_FILES:
        if not verify_file(filepath):
            all_pass = False

    print("="*80)
    if all_pass:
        print("✓ ALL FILES VERIFIED SUCCESSFULLY!")
    else:
        print("⚠ SOME FILES HAVE ISSUES - Please review above")
    print("="*80)

if __name__ == "__main__":
    main()
