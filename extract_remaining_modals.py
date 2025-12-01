#!/usr/bin/env python3
"""
Extract remaining 5 modals from tutor-profile.html
"""

import re
import os

# File paths
SOURCE_FILE = r"c:\Users\zenna\Downloads\Astegni\profile-pages\tutor-profile.html"
OUTPUT_DIR = r"c:\Users\zenna\Downloads\Astegni\modals\tutor-profile"

# Remaining modal IDs to extract
REMAINING_MODALS = [
    "unsubscribeModal1",
    "unsubscribeConfirm1",
    "unsubscribeConfirm2",
    "deleteModal1",
    "communityModal"  # Duplicate - appears twice
]

def convert_to_filename(modal_id):
    """Convert camelCase or kebab-case ID to kebab-case filename"""
    name = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', modal_id)
    name = re.sub('([a-z0-9])([A-Z])', r'\1-\2', name).lower()
    return f"{name}.html"

def find_modal_bounds(content, modal_id):
    """Find the start and end position of a modal in the HTML"""
    pattern = rf'<div[^>]*id="{modal_id}"[^>]*>'
    match = re.search(pattern, content)

    if not match:
        return None, None

    start_pos = match.start()

    # Count divs to find matching closing tag
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
                    end_pos = pos + end_match.end()
                    return start_pos, end_pos

        pos += 1

    return start_pos, None

def main():
    print("=" * 70)
    print("EXTRACTING REMAINING 5 MODALS")
    print("=" * 70)
    print()

    # Read source file
    with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    extracted = []

    for modal_id in REMAINING_MODALS:
        filename = convert_to_filename(modal_id)
        filepath = os.path.join(OUTPUT_DIR, filename)

        print(f"Extracting: {modal_id} -> {filename}")

        start, end = find_modal_bounds(content, modal_id)

        if start is not None and end is not None:
            modal_html = content[start:end]

            # Add header comment
            header = f"""<!--
  Modal: {modal_id}
  Extracted from: tutor-profile.html
  Purpose: [Auto-extracted modal component]
-->

"""
            # Write to file
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(header + modal_html.strip() + '\n')

            extracted.append((modal_id, filename))
            print(f"   [OK] Extracted successfully")
        else:
            print(f"   [FAIL] Failed to extract")

    print()
    print("=" * 70)
    print(f"EXTRACTED {len(extracted)}/{len(REMAINING_MODALS)} MODALS")
    print("=" * 70)

    for modal_id, filename in extracted:
        print(f"  {modal_id:30} -> {filename}")

if __name__ == "__main__":
    main()
