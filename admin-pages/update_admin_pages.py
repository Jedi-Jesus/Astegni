import os
import re

def update_admin_page(filepath):
    """Update an admin page with all required changes"""

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if file is empty
    if len(content.strip()) == 0:
        print(f"Skipping empty file: {filepath}")
        return

    # Get admin name from the file to customize modals
    admin_name_match = re.search(r'<h1[^>]*id="adminName">([^<]+)</h1>', content)
    admin_name = admin_name_match.group(1) if admin_name_match else "Admin"

    # Get department info
    dept_match = re.search(r'<span class="text-gray-600">([^<]+)</span>.*?Department:', content)
    department = dept_match.group(1) if dept_match else "Operations"

    # 1. Fix rating section in profile header
    rating_pattern = r'<div class="rating-section mb-3">[\s\S]*?</div>\s*</div>'
    rating_replacement = '''<div class="rating-section mb-3">
                                    <div class="flex items-center gap-4">
                                        <div class="flex items-center gap-2">
                                            <span class="text-2xl font-bold text-yellow-500">4.7</span>
                                            <div class="flex">
                                                <span class="text-yellow-500">★★★★</span>
                                                <span class="text-gray-400">★</span>
                                            </div>
                                            <span class="text-gray-600">(256 reviews)</span>
                                        </div>
                                        <div class="border-l pl-4">
                                            <span class="text-sm text-gray-600">Performance Rating</span>
                                        </div>
                                    </div>
                                </div>'''
    content = re.sub(rating_pattern, rating_replacement, content)

    # 2. Add upload button to cover image
    cover_pattern = r'<div class="cover-image-container">'
    cover_replacement = '<div class="cover-image-container relative">'
    content = content.replace(cover_pattern, cover_replacement)

    cover_img_pattern = r'(<div class="cover-overlay"></div>)'
    cover_img_replacement = r'''\1
                        <!-- Cover Upload Button -->
                        <button onclick="openUploadCoverModal()" class="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-700 p-2 rounded-lg shadow-lg transition-all duration-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                        </button>'''
    content = re.sub(cover_img_pattern, cover_img_replacement, content)

    # 3. Add upload button to profile picture
    profile_pattern = r'(<span\s+class="online-indicator[^>]+></span>)'
    profile_replacement = r'''\1
                                <!-- Profile Picture Upload Button -->
                                <button onclick="openUploadProfileModal()" class="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-all duration-300">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    </svg>
                                </button>'''
    content = re.sub(profile_pattern, profile_replacement, content)

    # 4. Add Edit Profile button after quote
    quote_pattern = r'(<div class="profile-quote[^>]+>[\s\S]*?</div>)'
    quote_replacement = r'''\1

                                <!-- Edit Profile Button -->
                                <div class="mb-4">
                                    <button onclick="openEditProfileModal()" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-all duration-300">
                                        <span class="mr-2">✏️</span>
                                        Edit Profile
                                    </button>
                                </div>'''
    content = re.sub(quote_pattern, quote_replacement, content)

    # 5. Remove Average Rating card from dashboard grid
    avg_rating_pattern = r'<div class="card p-4">\s*<h3[^>]*>Average Rating</h3>[\s\S]*?</div>'
    content = re.sub(avg_rating_pattern, '''<div class="card p-4">
                        <h3 class="text-lg font-semibold">Response Time</h3>
                        <p class="text-2xl font-bold text-blue-500">< 2h</p>
                        <span class="text-sm text-gray-500">Avg response</span>
                    </div>''', content)

    # 6. Restructure page layout with right sidebar for widgets
    # Find the main dashboard content and restructure it
    dashboard_pattern = r'(<!-- Page Header -->[\s\S]*?)(<!-- Achievements and Daily Quota Section -->[\s\S]*?</div>\s*</div>\s*</div>)'

    dashboard_match = re.search(dashboard_pattern, content)
    if dashboard_match:
        main_content = dashboard_match.group(1)
        achievements_section = dashboard_match.group(2)

        # Extract daily quota and fire streak sections
        daily_quota_pattern = r'<!-- Daily Quota Progress -->[\s\S]*?</div>\s*</div>'
        fire_streak_pattern = r'<!-- Fire Streak -->[\s\S]*?</div>\s*</div>'

        # Create new layout with sidebar
        new_layout = f'''<!-- Main Content Area with Sidebar -->
                <div class="flex gap-6">
                    <!-- Left Content Area -->
                    <div class="flex-1">
                        {main_content}

                        <!-- Achievements Section -->
                        <div class="card p-6 mb-8">
                            <h3 class="text-xl font-semibold mb-4">Achievements</h3>
                            <div class="grid grid-cols-3 gap-4">
                                <!-- Achievement badges here -->
                            </div>
                        </div>
                    </div>

                    <!-- Right Sidebar -->
                    <div class="w-80">
                        <!-- Daily Quota Widget -->
                        <div class="card p-4 mb-4 sticky top-24">
                            <h3 class="text-lg font-semibold mb-4">Daily Quota</h3>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Verified</span>
                                    <span class="font-semibold">15/20</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-green-500 h-2 rounded-full" style="width: 75%"></div>
                                </div>

                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Pending</span>
                                    <span class="font-semibold">8/10</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-yellow-500 h-2 rounded-full" style="width: 80%"></div>
                                </div>

                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Rejected</span>
                                    <span class="font-semibold">2/5</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-red-500 h-2 rounded-full" style="width: 40%"></div>
                                </div>

                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Suspended</span>
                                    <span class="font-semibold">1/3</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-orange-500 h-2 rounded-full" style="width: 33%"></div>
                                </div>

                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Archived</span>
                                    <span class="font-semibold">25/30</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-gray-500 h-2 rounded-full" style="width: 83%"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Fire Streak Widget -->
                        <div class="card p-4">
                            <h3 class="text-lg font-semibold mb-4">🔥 Fire Streak</h3>
                            <div class="text-center">
                                <div class="text-4xl font-bold text-orange-500">45</div>
                                <div class="text-sm text-gray-600">Days</div>
                                <div class="mt-4 grid grid-cols-7 gap-1">
                                    <!-- Week visualization -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>'''

        # Replace the old structure with the new one
        content = re.sub(dashboard_pattern, new_layout, content)

    # 7. Add modal functions and HTML before closing body tag
    modal_code = get_modal_code(admin_name, department)

    # Insert modals before </body>
    body_pattern = r'(</script>\s*)(</body>)'
    body_replacement = r'\1' + modal_code + r'\2'
    content = re.sub(body_pattern, body_replacement, content)

    # Write updated content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Updated: {filepath}")

def get_modal_code(admin_name, department):
    """Get the modal code with customized values"""
    return '''
        // Modal Functions
        function openEditProfileModal() {
            const modal = document.getElementById('edit-profile-modal');
            if (modal) modal.classList.remove('hidden');
        }

        function closeEditProfileModal() {
            const modal = document.getElementById('edit-profile-modal');
            if (modal) modal.classList.add('hidden');
        }

        function openUploadProfileModal() {
            const modal = document.getElementById('upload-profile-modal');
            if (modal) modal.classList.remove('hidden');
        }

        function closeUploadProfileModal() {
            const modal = document.getElementById('upload-profile-modal');
            if (modal) modal.classList.add('hidden');
        }

        function openUploadCoverModal() {
            const modal = document.getElementById('upload-cover-modal');
            if (modal) modal.classList.remove('hidden');
        }

        function closeUploadCoverModal() {
            const modal = document.getElementById('upload-cover-modal');
            if (modal) modal.classList.add('hidden');
        }

        async function handleProfilePictureUpload() {
            const fileInput = document.getElementById('profilePictureInput');
            const file = fileInput.files[0];
            if (!file) { alert('Please select a file'); return; }
            if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }

            const uploadBtn = document.getElementById('uploadProfileBtn');
            uploadBtn.textContent = 'Uploading...';
            uploadBtn.disabled = true;

            try {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.querySelectorAll('.profile-avatar').forEach(img => img.src = e.target.result);
                };
                reader.readAsDataURL(file);
                alert('Profile picture updated successfully!');
                closeUploadProfileModal();
            } catch (error) {
                alert('Upload failed: ' + error.message);
            } finally {
                uploadBtn.textContent = 'Upload';
                uploadBtn.disabled = false;
            }
        }

        async function handleCoverImageUpload() {
            const fileInput = document.getElementById('coverImageInput');
            const file = fileInput.files[0];
            if (!file) { alert('Please select a file'); return; }
            if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }

            const uploadBtn = document.getElementById('uploadCoverBtn');
            uploadBtn.textContent = 'Uploading...';
            uploadBtn.disabled = true;

            try {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.querySelectorAll('.cover-img').forEach(img => img.src = e.target.result);
                };
                reader.readAsDataURL(file);
                alert('Cover image updated successfully!');
                closeUploadCoverModal();
            } catch (error) {
                alert('Upload failed: ' + error.message);
            } finally {
                uploadBtn.textContent = 'Upload';
                uploadBtn.disabled = false;
            }
        }

        function handleProfileUpdate(event) {
            event.preventDefault();
            const formData = {
                name: document.getElementById('adminNameInput').value,
                department: document.getElementById('departmentInput').value,
                employeeId: document.getElementById('employeeIdInput').value,
                bio: document.getElementById('bioInput').value,
                quote: document.getElementById('quoteInput').value
            };
            document.getElementById('adminName').textContent = formData.name;
            document.querySelector('.profile-quote span').textContent = `"${formData.quote}"`;
            alert('Profile updated successfully!');
            closeEditProfileModal();
        }

        function previewProfilePicture(event) {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('profilePreviewImg').src = e.target.result;
                    document.getElementById('profilePreview').classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        }

        function previewCoverImage(event) {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('coverPreviewImg').src = e.target.result;
                    document.getElementById('coverPreview').classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        }
    </script>

    <!-- Modals -->
    <div id="edit-profile-modal" class="modal hidden fixed inset-0 z-50 flex items-center justify-center">
        <div class="modal-overlay absolute inset-0 bg-black bg-opacity-50" onclick="closeEditProfileModal()"></div>
        <div class="modal-content relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="modal-header p-6 border-b">
                <h2 class="text-2xl font-bold">Edit Profile</h2>
                <button class="absolute top-6 right-6 text-gray-500 hover:text-gray-700" onclick="closeEditProfileModal()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="modal-body p-6">
                <form id="editProfileForm" onsubmit="handleProfileUpdate(event)">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">Admin Name *</label>
                            <input type="text" id="adminNameInput" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value="''' + admin_name + '''" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Department *</label>
                            <input type="text" id="departmentInput" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value="''' + department + '''" required>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">Employee ID</label>
                            <input type="text" id="employeeIdInput" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value="ADM-2024-001">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Role</label>
                            <select class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option>System Administrator</option>
                                <option>Manager</option>
                                <option>Supervisor</option>
                            </select>
                        </div>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Bio</label>
                        <textarea id="bioInput" rows="3" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">Your bio here</textarea>
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-medium mb-2">Quote</label>
                        <input type="text" id="quoteInput" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value="Your inspiring quote here">
                    </div>
                    <div class="flex justify-end gap-3">
                        <button type="button" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" onclick="closeEditProfileModal()">Cancel</button>
                        <button type="submit" class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Update Profile</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div id="upload-profile-modal" class="modal hidden fixed inset-0 z-50 flex items-center justify-center">
        <div class="modal-overlay absolute inset-0 bg-black bg-opacity-50" onclick="closeUploadProfileModal()"></div>
        <div class="modal-content relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div class="modal-header p-6 border-b">
                <h2 class="text-xl font-bold">Upload Profile Picture</h2>
                <button class="absolute top-6 right-6 text-gray-500 hover:text-gray-700" onclick="closeUploadProfileModal()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="modal-body p-6">
                <div class="upload-area border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <input type="file" id="profilePictureInput" accept="image/*" class="hidden" onchange="previewProfilePicture(event)">
                    <label for="profilePictureInput" class="cursor-pointer">
                        <p class="mt-2 text-sm text-gray-600">
                            <span class="font-medium text-blue-500 hover:text-blue-600">Click to upload</span> or drag and drop
                        </p>
                        <p class="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                    </label>
                </div>
                <div id="profilePreview" class="hidden mb-4">
                    <img id="profilePreviewImg" class="w-32 h-32 mx-auto rounded-full object-cover" alt="Preview">
                </div>
                <div class="flex justify-end gap-3">
                    <button class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" onclick="closeUploadProfileModal()">Cancel</button>
                    <button id="uploadProfileBtn" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600" onclick="handleProfilePictureUpload()">Upload</button>
                </div>
            </div>
        </div>
    </div>

    <div id="upload-cover-modal" class="modal hidden fixed inset-0 z-50 flex items-center justify-center">
        <div class="modal-overlay absolute inset-0 bg-black bg-opacity-50" onclick="closeUploadCoverModal()"></div>
        <div class="modal-content relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div class="modal-header p-6 border-b">
                <h2 class="text-xl font-bold">Upload Cover Image</h2>
                <button class="absolute top-6 right-6 text-gray-500 hover:text-gray-700" onclick="closeUploadCoverModal()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="modal-body p-6">
                <div class="upload-area border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <input type="file" id="coverImageInput" accept="image/*" class="hidden" onchange="previewCoverImage(event)">
                    <label for="coverImageInput" class="cursor-pointer">
                        <p class="mt-2 text-sm text-gray-600">
                            <span class="font-medium text-blue-500 hover:text-blue-600">Click to upload</span> or drag and drop
                        </p>
                        <p class="text-xs text-gray-500">Recommended: 1200x300px (PNG, JPG up to 10MB)</p>
                    </label>
                </div>
                <div id="coverPreview" class="hidden mb-4">
                    <img id="coverPreviewImg" class="w-full h-32 object-cover rounded-lg" alt="Preview">
                </div>
                <div class="flex justify-end gap-3">
                    <button class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" onclick="closeUploadCoverModal()">Cancel</button>
                    <button id="uploadCoverBtn" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600" onclick="handleCoverImageUpload()">Upload</button>
                </div>
            </div>
        </div>
    </div>
'''

# Process all admin HTML files
admin_files = [
    'manage-tutors.html',
    'manage-campaigns.html',
    'manage-courses.html',
    'manage-schools.html',
    'manage-system-settings.html'
]

for filename in admin_files:
    filepath = os.path.join(r'C:\Users\zenna\Downloads\Astegni-v-1.1\admin-pages', filename)
    if os.path.exists(filepath):
        update_admin_page(filepath)
    else:
        print(f"File not found: {filepath}")

print("All admin pages updated successfully!")