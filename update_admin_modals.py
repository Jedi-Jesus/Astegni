"""
Batch update edit-profile-modal and profile-name in all admin pages
"""
import re
import os
import sys
import io

# Force UTF-8 output encoding for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Files to update
ADMIN_FILES = [
    'admin-pages/manage-courses.html',
    'admin-pages/manage-schools.html',
    'admin-pages/manage-tutors.html',
    'admin-pages/manage-contents.html',
    'admin-pages/manage-customers.html',
    'admin-pages/manage-system-settings.html'
]

# New modal template
NEW_MODAL = '''    <!-- Edit Profile Modal -->
    <!-- This modal ONLY edits admin_profile table fields (personal information) -->
    <!-- admin_profile_stats fields (employee_id, access_level, etc.) are managed by super admin or system -->
    <div id="edit-profile-modal" class="modal hidden">
        <div class="modal-overlay" onclick="closeEditProfileModal()"></div>
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2 class="text-xl font-bold">Edit Profile</h2>
                <button class="modal-close" onclick="closeEditProfileModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="editProfileForm" onsubmit="handleProfileUpdate(event)">
                    <!-- Ethiopian Naming Convention -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div class="form-group">
                            <label class="block text-sm font-medium mb-1">First Name *</label>
                            <input type="text" id="firstNameInput"
                                class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Abebe" required>
                        </div>
                        <div class="form-group">
                            <label class="block text-sm font-medium mb-1">Father's Name *</label>
                            <input type="text" id="fatherNameInput"
                                class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Kebede" required>
                        </div>
                        <div class="form-group">
                            <label class="block text-sm font-medium mb-1">Grandfather's Name *</label>
                            <input type="text" id="grandfatherNameInput"
                                class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Tesfa" required>
                        </div>
                    </div>

                    <!-- Username (Display Name) -->
                    <div class="form-group mb-4">
                        <label class="block text-sm font-medium mb-1">Username (Display Name) *</label>
                        <input type="text" id="adminUsernameInput"
                            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., abebe_kebede" required>
                        <p class="text-xs text-gray-500 mt-1">This will be displayed as your admin username</p>
                    </div>

                    <!-- Contact Information -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div class="form-group">
                            <label class="block text-sm font-medium mb-1">Email</label>
                            <input type="email" id="emailInput"
                                class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="admin@astegni.et">
                        </div>
                        <div class="form-group">
                            <label class="block text-sm font-medium mb-1">Phone Number</label>
                            <input type="tel" id="phoneNumberInput"
                                class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="+251911234567">
                        </div>
                    </div>

                    <!-- Department (Read-only, managed by super admin) -->
                    <div class="form-group mb-4">
                        <label class="block text-sm font-medium mb-1">Department</label>
                        <input type="text" id="departmentInput"
                            class="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                            readonly
                            title="Department is managed by Super Admin">
                        <p class="text-xs text-gray-500 mt-1">Department is managed by Super Admin</p>
                    </div>

                    <!-- Bio -->
                    <div class="form-group mb-4">
                        <label class="block text-sm font-medium mb-1">Bio</label>
                        <textarea id="bioInput" rows="3"
                            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Tell us about yourself..."></textarea>
                    </div>

                    <!-- Quote -->
                    <div class="form-group mb-4">
                        <label class="block text-sm font-medium mb-1">Quote</label>
                        <input type="text" id="quoteInput"
                            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your personal quote or motto">
                    </div>

                    <!-- Read-only Stats Information (for reference) -->
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                        <h3 class="text-sm font-semibold mb-2 text-gray-700">Account Information (Read-only)</h3>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span class="text-gray-600">Employee ID:</span>
                                <span id="displayEmployeeId" class="font-medium ml-2">-</span>
                            </div>
                            <div>
                                <span class="text-gray-600">Access Level:</span>
                                <span id="displayAccessLevel" class="font-medium ml-2">-</span>
                            </div>
                            <div class="col-span-2">
                                <span class="text-gray-600">Responsibilities:</span>
                                <span id="displayResponsibilities" class="font-medium ml-2">-</span>
                            </div>
                        </div>
                        <p class="text-xs text-gray-500 mt-2">These fields are managed by Super Admin</p>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn-secondary px-4 py-2 border rounded-lg hover:bg-gray-100"
                            onclick="closeEditProfileModal()">Cancel</button>
                        <button type="submit"
                            class="btn-primary px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Update
                            Profile</button>
                    </div>
                </form>
            </div>
        </div>
    </div>'''

def update_file(filepath):
    """Update a single file"""
    print(f"Updating {filepath}...")

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Replace the edit-profile-modal section
        # Pattern to match from <!-- Edit Profile Modal --> to the closing </div> before <!-- Upload Profile Picture Modal -->
        pattern = r'<!-- Edit Profile Modal -->.*?</div>\s*\n\s*<!-- Upload Profile Picture Modal -->'

        replacement = NEW_MODAL + '\n\n    <!-- Upload Profile Picture Modal -->'

        new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

        if new_content == content:
            print(f"  Warning: No changes made to {filepath} - pattern not found")
            return False

        # Also update profile-name id and content
        new_content = re.sub(
            r'<h1 class="profile-name" id="adminName">.*?</h1>',
            '<h1 class="profile-name" id="adminUsername">admin_username</h1>',
            new_content
        )

        # Write back
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"  ✓ Successfully updated {filepath}")
        return True

    except Exception as e:
        print(f"  ✗ Error updating {filepath}: {e}")
        return False

def main():
    """Main update function"""
    print("="*80)
    print("UPDATING ADMIN PAGE EDIT-PROFILE MODALS")
    print("="*80)
    print()

    success_count = 0
    for filepath in ADMIN_FILES:
        if update_file(filepath):
            success_count += 1
        print()

    print("="*80)
    print(f"Update complete: {success_count}/{len(ADMIN_FILES)} files updated successfully")
    print("="*80)

if __name__ == "__main__":
    main()
