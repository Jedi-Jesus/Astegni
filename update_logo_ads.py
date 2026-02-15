"""
Script to replace hardcoded logo ad placeholders with dynamic campaign ads
in all profile pages and view-profile pages.
"""

import re
import os

# Define the replacement HTML
DYNAMIC_AD_WIDGET = '''                    <!-- Dynamic Logo Ad Widget -->
                    <div class="widget-card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                        <div class="widget-header" style="margin-bottom: 0.75rem; display: flex; justify-content: flex-end;">
                            <span style="font-size: 0.65rem; color: var(--text-secondary); background: var(--bg-secondary); padding: 0.2rem 0.5rem; border-radius: 4px;">Ad</span>
                        </div>
                        <!-- Dynamic ad container loaded by AdRotationManager -->
                        <div
                            data-placement="logo"
                            data-profile-type="{profile_type}"
                            class="leaderboard-banner premium-promo"
                            style="min-height: 170px; border-radius: 12px; overflow: hidden; position: relative; background: var(--bg-secondary);">
                            <!-- Ads will be dynamically loaded here -->
                        </div>
                    </div>'''

# Files to update with their profile types
FILES_TO_UPDATE = {
    'profile-pages/tutor-profile.html': 'tutor',
    'profile-pages/student-profile.html': 'student',
    'profile-pages/parent-profile.html': 'parent',
    'profile-pages/advertiser-profile.html': 'advertiser',
    'profile-pages/user-profile.html': 'user',
    'view-profiles/view-tutor.html': 'tutor',
    'view-profiles/view-student.html': 'student',
    'view-profiles/view-parent.html': 'parent',
    'view-profiles/view-advertiser.html': 'advertiser'
}

def replace_logo_ads():
    """Replace hardcoded ad widgets with dynamic ad containers."""

    for file_path, profile_type in FILES_TO_UPDATE.items():
        if not os.path.exists(file_path):
            print(f"ERROR - File not found: {file_path}")
            continue

        print(f"\nProcessing: {file_path} (profile_type: {profile_type})")

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Pattern to match the entire ad widget section
        # This matches from <!-- Ad Widget --> to the end of the widget-card div
        pattern = r'<!-- Ad Widget -->\s*<div class="widget-card"[^>]*?>.*?</div>\s*\n\s*\n(?=\s*<!-- Monthly Earnings|<!-- Earnings|<div class="widget-card")'

        # Simpler pattern: match logo-container and everything until next widget
        pattern = r'<div class="widget-card"[^>]*?>\s*<div class="widget-header"[^>]*?>\s*<span[^>]*?>Ad</span>\s*</div>\s*<div[^>]*?id="[^"]*logo-container[^"]*"[^>]*?>.*?</div>\s*(?:<style>.*?</style>\s*)?(?:<script>.*?</script>\s*)?</div>'

        replacement = DYNAMIC_AD_WIDGET.format(profile_type=profile_type)

        # Use re.DOTALL to match across newlines
        new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"   OK - Updated successfully!")
        else:
            print(f"   WARNING - No changes made (pattern not found)")

if __name__ == '__main__':
    print("=" * 80)
    print("UPDATING LOGO AD CONTAINERS TO DYNAMIC CAMPAIGN ADS")
    print("=" * 80)
    replace_logo_ads()
    print("\n" + "=" * 80)
    print("DONE!")
    print("=" * 80)
