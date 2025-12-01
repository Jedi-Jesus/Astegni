#!/usr/bin/env python3
"""
Script to create parent-profile.html that EXACTLY resembles student-profile.html structure
while incorporating parent-specific features from old-pages/parent-profile.html
"""

import re

# Read source files
with open('profile-pages/student-profile.html', 'r', encoding='utf-8') as f:
    student_html = f.read()

with open('old-pages/parent-profile.html', 'r', encoding='utf-8') as f:
    old_parent_html = f.read()

# Start building parent profile
parent_html = student_html

# 1. Update title
parent_html = parent_html.replace(
    '<title>ASTEGNI - Student Profile</title>',
    '<title>ASTEGNI - Parent Profile</title>'
)

# 2. Update CSS reference
parent_html = parent_html.replace(
    '<link rel="stylesheet" href="../css/tutor-profile/tutor-profile.css">',
    '<link rel="stylesheet" href="../css/parent-profile/parent-profile.css">'
)

# 3. Update sidebar title
parent_html = parent_html.replace(
    '<h3>Student Dashboard</h3>',
    '<h3>Parent Dashboard</h3>'
)

# 4. Replace sidebar navigation links with parent-specific ones
sidebar_section = '''<a href="#" onclick="switchPanel('dashboard'); return false;" class="sidebar-link active">
                    <span class="sidebar-icon">🏠</span>
                    <span>Dashboard</span>
                </a>
                <a href="#" onclick="switchPanel('my-children'); return false;" class="sidebar-link">
                    <span class="sidebar-icon">👶</span>
                    <span>My Children</span>
                    <span class="badge-count">3</span>
                </a>
                <a href="#" onclick="switchPanel('children-courses'); return false;" class="sidebar-link">
                    <span class="sidebar-icon">📚</span>
                    <span>Children's Courses</span>
                </a>
                <a href="#" onclick="switchPanel('find-tutors'); return false;" class="sidebar-link">
                    <span class="sidebar-icon">👨‍🏫</span>
                    <span>Find Tutors</span>
                </a>
                <a href="#" onclick="switchPanel('family-schedule'); return false;" class="sidebar-link">
                    <span class="sidebar-icon">📅</span>
                    <span>Family Schedule</span>
                </a>
                <a href="#" onclick="switchPanel('progress-tracking'); return false;" class="sidebar-link">
                    <span class="sidebar-icon">📊</span>
                    <span>Progress Tracking</span>
                </a>
                <a href="#" onclick="switchPanel('parent-community'); return false;" class="sidebar-link">
                    <span class="sidebar-icon">👥</span>
                    <span>Parent Community</span>
                </a>
                <a href="#" onclick="switchPanel('parenting-blog'); return false;" class="sidebar-link">
                    <span class="sidebar-icon">📝</span>
                    <span>Parenting Blog</span>
                </a>
                <hr class="my-4 border-gray-300">
                <a href="../Plug-ins/notes.html" class="sidebar-link">
                    <span class="sidebar-icon">📝</span>
                    <span>Family Notes</span>
                </a>
                <a href="#" onclick="switchPanel('ratings-and-reviews'); return false;" class="sidebar-link">
                    <span class="sidebar-icon">⭐</span>
                    <span>Ratings & Reviews</span>
                </a>
                <a href="#" onclick="switchPanel('payment-center'); return false;" class="sidebar-link">
                    <span class="sidebar-icon">💳</span>
                    <span>Payment Center</span>
                </a>
                <a href="#" onclick="switchPanel('settings'); return false;" class="sidebar-link">
                    <span class="sidebar-icon">⚙️</span>
                    <span>Settings</span>
                </a>'''

# Replace sidebar links (find between <h3>Student Dashboard</h3> and <!-- Quick Stats Section -->)
pattern = r'(<h3>Parent Dashboard</h3>\s*)(.*?)(\s*<!-- Quick Stats Section -->)'
parent_html = re.sub(pattern, r'\1' + sidebar_section + r'\3', parent_html, flags=re.DOTALL)

# 5. Update Quick Stats content for parent context
quick_stats = '''<div class="mt-6 p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 shadow-sm">
                    <h4 class="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span class="text-lg">📊</span>
                        <span>Quick Stats</span>
                    </h4>
                    <div class="space-y-3">
                        <div class="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm hover:shadow transition-shadow">
                            <span class="text-xs font-medium text-gray-700 flex items-center gap-2">
                                <span class="text-purple-500">👶</span>
                                Children Enrolled
                            </span>
                            <span class="font-bold text-base text-purple-600 px-3 py-1 bg-purple-100 rounded-full">3</span>
                        </div>
                        <div class="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm hover:shadow transition-shadow">
                            <span class="text-xs font-medium text-gray-700 flex items-center gap-2">
                                <span class="text-green-500">📈</span>
                                Family Progress
                            </span>
                            <span class="font-bold text-base text-green-600 px-3 py-1 bg-green-100 rounded-full">85%</span>
                        </div>
                        <div class="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm hover:shadow transition-shadow">
                            <span class="text-xs font-medium text-gray-700 flex items-center gap-2">
                                <span class="text-orange-500">👨‍🏫</span>
                                Active Tutors
                            </span>
                            <span class="font-bold text-base text-orange-600 px-3 py-1 bg-orange-100 rounded-full">5</span>
                        </div>
                    </div>
                </div>'''

pattern = r'(<div class="mt-6 p-5 bg-gradient-to-br.*?<!-- Quick Stats Section -->)(.*?)(</div>\s*</div>\s*</div>\s*</div>\s*</aside>)'
parent_html = re.sub(pattern, r'\1\n                ' + quick_stats + r'\n            \3', parent_html, flags=re.DOTALL)

print("Building parent-profile.html...")
print(f"Generated {len(parent_html)} characters")

# Write the file
with open('profile-pages/parent-profile-new.html', 'w', encoding='utf-8') as f:
    f.write(parent_html)

print("✅ Created profile-pages/parent-profile-new.html")
print("Next: Manual integration of right sidebar and bottom widgets needed")
