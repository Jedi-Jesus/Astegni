#!/usr/bin/env python3
"""
Modal Extractor for tutor-profile.html
Extracts all modals into separate files in modals/tutor-profile/
"""

import re
import os
from pathlib import Path

# Define file paths
SOURCE_FILE = r"c:\Users\zenna\Downloads\Astegni\profile-pages\tutor-profile.html"
OUTPUT_DIR = r"c:\Users\zenna\Downloads\Astegni\profile-pages\modals\tutor-profile"
REFACTORED_FILE = r"c:\Users\zenna\Downloads\Astegni\profile-pages\tutor-profile-refactored.html"

# Modal definitions with their IDs
MODALS = [
    "communityModal",
    "customFilterModal",
    "verify-personal-info-modal",
    "payment-method-modal",
    "subscription-modal",
    "plan-details-modal",
    "switchSubscriptionModal",
    "unsubscribePasswordModal",
    "unsubscribeFinalModal",
    "leave-astegni-modal",
    "deleteVerifyModal",
    "deleteSubscriptionCheckModal",
    "deletePasswordModal",
    "deleteFinalModal",
    "edit-profile-modal",
    "otp-confirmation-modal",
    "otp-verification-modal",
    "scheduleModal",
    "viewScheduleModal",
    "viewRequestModal",
    "coming-soon-modal",
    "create-event-modal",
    "create-club-modal",
    "uploadDocumentModal",
    "certificationModal",
    "achievementModal",
    "experienceModal",
    "verificationFeeModal",
    "verificationModal",
    "viewAchievementModal",
    "viewCertificationModal",
    "viewExperienceModal",
    "adAnalyticsModal",
    "coverUploadModal",
    "profileUploadModal",
    "storyUploadModal",
    "quizMainModal",
    "quizGiveModal",
    "quizMyQuizzesModal",
    "quizViewAnswersModal",
    "quizViewDetailsModal",
    "studentDetailsModal",
    "package-management-modal",
    "storyViewerModal",
]

def convert_to_filename(modal_id):
    """Convert camelCase or kebab-case ID to kebab-case filename"""
    # Convert camelCase to kebab-case
    name = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', modal_id)
    name = re.sub('([a-z0-9])([A-Z])', r'\1-\2', name).lower()
    return f"{name}.html"

def extract_modal(content, modal_id):
    """Extract a single modal from the HTML content"""
    # Try different patterns to find the modal
    patterns = [
        # Pattern 1: Standard modal with id
        rf'<div[^>]*id="{modal_id}"[^>]*>.*?</div>\s*(?=\n\s*(?:<div|<script|</body|<!--))',
        # Pattern 2: Alternative - find opening and count divs to closing
        rf'<div[^>]*id="{modal_id}"[^>]*>',
    ]

    for pattern in patterns:
        match = re.search(pattern, content, re.DOTALL)
        if match:
            start_pos = match.start()

            # Find the matching closing tag by counting div tags
            div_count = 0
            pos = start_pos
            in_tag = False
            tag_name = ""

            while pos < len(content):
                char = content[pos]

                if char == '<':
                    # Check if it's an opening or closing tag
                    tag_match = re.match(r'<(/?)div[\s>]', content[pos:])
                    if tag_match:
                        if tag_match.group(1) == '/':
                            div_count -= 1
                        else:
                            div_count += 1

                        if div_count == 0:
                            # Found the matching closing tag
                            end_match = re.search(r'>', content[pos:])
                            if end_match:
                                end_pos = pos + end_match.end()
                                return content[start_pos:end_pos]

                pos += 1

            # If we couldn't find the end, take a reasonable chunk
            end_match = re.search(r'\n\s*(?:<div[^>]*id="|<script)', content[start_pos + 100:])
            if end_match:
                return content[start_pos:start_pos + 100 + end_match.start()]

    return None

def main():
    print("Starting modal extraction from tutor-profile.html...")
    print(f"Output directory: {OUTPUT_DIR}\n")

    # Read the source file
    with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Track extraction results
    extracted = []
    failed = []

    # Extract each modal
    for modal_id in MODALS:
        filename = convert_to_filename(modal_id)
        filepath = os.path.join(OUTPUT_DIR, filename)

        print(f"Extracting: {modal_id} -> {filename}")

        modal_html = extract_modal(content, modal_id)

        if modal_html:
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
            failed.append(modal_id)
            print(f"   [FAIL] Failed to extract")

    # Summary
    print(f"\n{'='*60}")
    print(f"EXTRACTION SUMMARY")
    print(f"{'='*60}")
    print(f"Successfully extracted: {len(extracted)}/{len(MODALS)}")
    print(f"Failed to extract: {len(failed)}/{len(MODALS)}")

    if failed:
        print(f"\nFailed modals:")
        for modal_id in failed:
            print(f"   - {modal_id}")

    # Create summary file
    summary_file = os.path.join(OUTPUT_DIR, "00-EXTRACTION-SUMMARY.txt")
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write("MODAL EXTRACTION SUMMARY\n")
        f.write("="*60 + "\n\n")
        f.write(f"Total modals found: {len(MODALS)}\n")
        f.write(f"Successfully extracted: {len(extracted)}\n")
        f.write(f"Failed to extract: {len(failed)}\n\n")

        f.write("EXTRACTED MODALS:\n")
        f.write("-"*60 + "\n")
        for modal_id, filename in extracted:
            f.write(f"{modal_id:40} → {filename}\n")

        if failed:
            f.write("\n\nFAILED MODALS:\n")
            f.write("-"*60 + "\n")
            for modal_id in failed:
                f.write(f"- {modal_id}\n")

    print(f"\nSummary written to: {summary_file}")
    print(f"\nExtraction complete!")

if __name__ == "__main__":
    main()
