#!/usr/bin/env python3
"""
Remove all modals from tutor-profile.html and add modal loader integration
"""

import re

# File paths
SOURCE_FILE = r"c:\Users\zenna\Downloads\Astegni\profile-pages\tutor-profile.html"
OUTPUT_FILE = r"c:\Users\zenna\Downloads\Astegni\profile-pages\tutor-profile.html"
BACKUP_FILE = r"c:\Users\zenna\Downloads\Astegni\profile-pages\tutor-profile-backup.html"

# Modal IDs to remove
MODAL_IDS = [
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

def find_modal_bounds(content, modal_id):
    """Find the start and end position of a modal in the HTML"""
    # Find the modal opening tag
    pattern = rf'<div[^>]*id="{modal_id}"[^>]*>'
    match = re.search(pattern, content)

    if not match:
        return None, None

    start_pos = match.start()

    # Count divs to find matching closing tag
    div_count = 0
    pos = start_pos

    while pos < len(content):
        # Check for div tags
        tag_match = re.match(r'<(/?)div[\s>]', content[pos:])
        if tag_match:
            if tag_match.group(1) == '/':
                div_count -= 1
            else:
                div_count += 1

            if div_count == 0:
                # Found matching closing tag
                end_match = re.search(r'>', content[pos:])
                if end_match:
                    end_pos = pos + end_match.end()
                    return start_pos, end_pos

        pos += 1

    return start_pos, None

def remove_modals(content):
    """Remove all modals from the HTML content"""
    removed_count = 0

    for modal_id in MODAL_IDS:
        start, end = find_modal_bounds(content, modal_id)

        if start is not None and end is not None:
            # Add comment marking removal
            comment = f"\n    <!-- Modal '{modal_id}' moved to modals/tutor-profile/{modal_id}.html -->\n"

            # Remove the modal and add comment
            content = content[:start] + comment + content[end:]
            removed_count += 1
            print(f"Removed: {modal_id}")
        else:
            print(f"Not found or failed: {modal_id}")

    return content, removed_count

def add_modal_loader(content):
    """Add modal loader script before </body>"""

    # Modal loader integration code
    loader_code = """
    <!-- ==================== MODAL LOADER INTEGRATION ==================== -->
    <!-- Modal Container: All modals will be loaded here dynamically -->
    <div id="modal-container"></div>

    <!-- Modal Loader Script: Handles lazy loading of modals -->
    <script src="../modals/tutor-profile/modal-loader.js"></script>

    <!--
        LAZY LOADING ENABLED (Performance Mode)
        Modals will load automatically when first accessed.
        No manual preloading required - modal-loader.js handles this.
    -->
    <!-- ================================================================== -->

"""

    # Find </body> tag
    body_end = content.rfind('</body>')

    if body_end != -1:
        content = content[:body_end] + loader_code + content[body_end:]
        print("\nAdded modal loader integration before </body>")
    else:
        print("\nWARNING: Could not find </body> tag")

    return content

def main():
    print("=" * 70)
    print("REMOVING MODALS FROM TUTOR-PROFILE.HTML")
    print("=" * 70)
    print()

    # Read source file
    print(f"Reading: {SOURCE_FILE}")
    with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    original_size = len(content)
    print(f"Original size: {original_size:,} bytes\n")

    # Backup original file
    print(f"Creating backup: {BACKUP_FILE}")
    with open(BACKUP_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Backup created successfully\n")

    # Remove modals
    print("Removing modals...\n")
    content, removed_count = remove_modals(content)
    print(f"\nRemoved {removed_count}/{len(MODAL_IDS)} modals\n")

    # Add modal loader
    print("Adding modal loader integration...")
    content = add_modal_loader(content)

    # Write output
    new_size = len(content)
    size_reduction = original_size - new_size
    reduction_percent = (size_reduction / original_size) * 100

    print(f"\nWriting to: {OUTPUT_FILE}")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Original size:     {original_size:,} bytes")
    print(f"New size:          {new_size:,} bytes")
    print(f"Size reduction:    {size_reduction:,} bytes ({reduction_percent:.1f}%)")
    print(f"Modals removed:    {removed_count}/{len(MODAL_IDS)}")
    print(f"Backup created:    {BACKUP_FILE}")
    print(f"Output file:       {OUTPUT_FILE}")
    print("=" * 70)
    print("\nSUCCESS! Tutor profile HTML is now clean and uses lazy loading.")
    print("\nModals location: c:\\Users\\zenna\\Downloads\\Astegni\\modals\\tutor-profile\\")
    print("Modal loader:    ../modals/tutor-profile/modal-loader.js")
    print("\nLazy loading is enabled - modals load automatically when accessed.")
    print("=" * 70)

if __name__ == "__main__":
    main()
