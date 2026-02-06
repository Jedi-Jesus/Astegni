import re
import os

def replace_ad_with_promo(content):
    """
    Replace all ad- patterns with promo- patterns while avoiding:
    - add-, added-, address-, admin-, advertiser-
    """
    # Replace class selectors like .ad-stat-card
    content = re.sub(r'\.ad-([a-z][a-z-]*)', r'.promo-\1', content)

    # Replace body.sidebar-active .ad-placeholder
    content = content.replace('body.sidebar-active .ad-', 'body.sidebar-active .promo-')

    # Replace premium-ad with premium-promo
    content = content.replace('premium-ad', 'premium-promo')

    return content

# List of additional CSS files to update
css_files = [
    r'c:\Users\zenna\Downloads\Astegni\css\advertiser-profile\advertiser-profile.css',
    r'c:\Users\zenna\Downloads\Astegni\css\tutor-profile\right-widgets.css',
    r'c:\Users\zenna\Downloads\Astegni\admin-pages\css\admin-profile\admin.css',
]

for css_file in css_files:
    if os.path.exists(css_file):
        print(f"Processing: {css_file}")

        # Backup first
        backup_file = css_file + '.backup'
        if not os.path.exists(backup_file):
            with open(css_file, 'r', encoding='utf-8') as f:
                backup_content = f.read()
            with open(backup_file, 'w', encoding='utf-8') as f:
                f.write(backup_content)
            print(f"  [OK] Backed up to: {backup_file}")

        with open(css_file, 'r', encoding='utf-8') as f:
            content = f.read()

        updated_content = replace_ad_with_promo(content)

        with open(css_file, 'w', encoding='utf-8') as f:
            f.write(updated_content)

        print(f"  [OK] Updated: {css_file}")
    else:
        print(f"  [ERROR] File not found: {css_file}")

print("\nAdditional CSS files updated successfully!")
