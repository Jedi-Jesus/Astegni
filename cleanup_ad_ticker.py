"""
Script to remove leftover hardcoded ad ticker code from all profile pages.
Cleans up the HTML, CSS, and JavaScript that was left behind after logo ad migration.
"""

import re
import os

# Files to clean up
FILES_TO_CLEAN = [
    'profile-pages/tutor-profile.html',
    'profile-pages/student-profile.html',
    'profile-pages/parent-profile.html',
    'profile-pages/advertiser-profile.html',
    'profile-pages/user-profile.html',
    'view-profiles/view-tutor.html',
    'view-profiles/view-student.html',
    'view-profiles/view-parent.html',
    'view-profiles/view-advertiser.html'
]

def cleanup_ad_ticker(file_path):
    """Remove leftover ad ticker code from a file."""

    if not os.path.exists(file_path):
        print(f"ERROR - File not found: {file_path}")
        return False

    print(f"\nProcessing: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Pattern 1: Remove ad-ticker div and its contents
    # Matches: <div id="ad-ticker-..." ...>...</div>
    ticker_pattern = r'<div id="ad-ticker-[^"]*"[^>]*>.*?</div>\s*</div>'
    content = re.sub(ticker_pattern, '</div>', content, flags=re.DOTALL)

    # Pattern 2: Remove <style> blocks containing ticker animations
    # Matches: <style>...@keyframes ticker...ad-message...</style>
    style_pattern = r'<style>\s*@keyframes ticker[^<]*?\.ad-message[^<]*?</style>'
    content = re.sub(style_pattern, '', content, flags=re.DOTALL)

    # Pattern 3: Remove <script> blocks containing ticker rotation logic
    # Matches: <script>(function() { ... rotateMessages ... })();</script>
    script_pattern = r'<script>\s*\(function\(\)\s*\{[^<]*?rotateMessages[^<]*?\}\)\(\);\s*</script>'
    content = re.sub(script_pattern, '', content, flags=re.DOTALL)

    # Pattern 4: Clean up extra blank lines (more than 2 consecutive)
    content = re.sub(r'\n{3,}', '\n\n', content)

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"   OK - Cleaned up successfully!")
        return True
    else:
        print(f"   INFO - No leftover code found (already clean)")
        return False

if __name__ == '__main__':
    print("=" * 80)
    print("CLEANING UP LEFTOVER AD TICKER CODE")
    print("=" * 80)

    cleaned_count = 0
    for file_path in FILES_TO_CLEAN:
        if cleanup_ad_ticker(file_path):
            cleaned_count += 1

    print("\n" + "=" * 80)
    print(f"DONE! Cleaned {cleaned_count}/{len(FILES_TO_CLEAN)} file(s)")
    print("=" * 80)
