import re
import os

def replace_ad_with_promo(content):
    """
    Replace all ad- patterns with promo- patterns while avoiding:
    - add-, added-, address-, admin-, advertiser-
    """
    # Replace #adAnalyticsModal with #promoAnalyticsModal
    content = content.replace('#adAnalyticsModal', '#promoAnalyticsModal')
    content = content.replace('.adAnalyticsModal', '.promoAnalyticsModal')

    # Replace class selectors like .ad-stat-card
    content = re.sub(r'\.ad-([a-z][a-z-]*)', r'.promo-\1', content)

    # Replace ID selectors like #ad-container
    content = re.sub(r'#ad-([a-z][a-z-]*)', r'#promo-\1', content)

    # Replace function names and variables
    content = re.sub(r'\bad-([a-z][a-z-]*)', r'promo-\1', content)

    # Replace comments
    content = content.replace('/* Ad ', '/* Promo ')
    content = content.replace('Ad Analytics', 'Promo Analytics')
    content = content.replace('Ad Container', 'Promo Container')
    content = content.replace('Ad Section', 'Promo Section')
    content = content.replace('Ad Placeholder', 'Promo Placeholder')
    content = content.replace('Ad Modal', 'Promo Modal')

    # Replace premium-ad with premium-promo
    content = content.replace('premium-ad', 'premium-promo')

    # Replace ad-container with promo-container
    content = content.replace('ad-container', 'promo-container')

    return content

# List of CSS files to update
css_files = [
    r'c:\Users\zenna\Downloads\Astegni\css\common-modals\ad-modal.css',
    r'c:\Users\zenna\Downloads\Astegni\css\index\index-ad.css',
    r'c:\Users\zenna\Downloads\Astegni\css\reels\grid-ad-section.css',
    r'c:\Users\zenna\Downloads\Astegni\admin-pages\css\root\ad-placeholder.css',
    r'c:\Users\zenna\Downloads\Astegni\css\root\ad-placeholder.css',
]

for css_file in css_files:
    if os.path.exists(css_file):
        print(f"Processing: {css_file}")
        with open(css_file, 'r', encoding='utf-8') as f:
            content = f.read()

        updated_content = replace_ad_with_promo(content)

        with open(css_file, 'w', encoding='utf-8') as f:
            f.write(updated_content)

        print(f"[OK] Updated: {css_file}")
    else:
        print(f"[ERROR] File not found: {css_file}")

print("\nCSS files updated successfully!")
