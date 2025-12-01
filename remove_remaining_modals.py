#!/usr/bin/env python3
"""
Remove remaining 5 modals from tutor-profile.html
"""

import re

SOURCE_FILE = r"c:\Users\zenna\Downloads\Astegni\profile-pages\tutor-profile.html"

REMAINING_MODALS = [
    "unsubscribeModal1",
    "unsubscribeConfirm1",
    "unsubscribeConfirm2",
    "deleteModal1",
    "communityModal"
]

def find_modal_bounds(content, modal_id):
    """Find the start and end position of a modal"""
    pattern = rf'<div[^>]*id="{modal_id}"[^>]*>'
    match = re.search(pattern, content)

    if not match:
        return None, None

    start_pos = match.start()
    div_count = 0
    pos = start_pos

    while pos < len(content):
        tag_match = re.match(r'<(/?)div[\s>]', content[pos:])
        if tag_match:
            if tag_match.group(1) == '/':
                div_count -= 1
            else:
                div_count += 1

            if div_count == 0:
                end_match = re.search(r'>', content[pos:])
                if end_match:
                    return start_pos, pos + end_match.end()

        pos += 1

    return start_pos, None

def main():
    print("Removing remaining 5 modals from tutor-profile.html...")

    with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    original_size = len(content)
    removed_count = 0

    for modal_id in REMAINING_MODALS:
        start, end = find_modal_bounds(content, modal_id)

        if start is not None and end is not None:
            comment = f"\n    <!-- Modal '{modal_id}' moved to modals/tutor-profile/{modal_id}.html -->\n"
            content = content[:start] + comment + content[end:]
            removed_count += 1
            print(f"Removed: {modal_id}")

    new_size = len(content)

    with open(SOURCE_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\nRemoved {removed_count}/5 modals")
    print(f"Size: {original_size:,} -> {new_size:,} bytes")
    print("Done!")

if __name__ == "__main__":
    main()
