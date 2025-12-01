#!/usr/bin/env python3
"""
Script to extract all modals from tutor-profile.html into separate files.
"""
import re
import os

# Read the HTML file
html_file_path = r"c:\Users\zenna\Downloads\Astegni\profile-pages\tutor-profile.html"
output_dir = r"c:\Users\zenna\Downloads\Astegni\profile-pages\modals\tutor-profile"

# Modal IDs to extract (based on grep results)
modal_ids = [
    "communityModal",
    "customFilterModal",
    "verify-personal-info-modal",
    "payment-method-modal",
    "subscription-modal",
    "plan-details-modal",
    "switchSubscriptionModal",
    "unsubscribeModal1",
    "unsubscribeConfirm1",
    "unsubscribeConfirm2",
    "unsubscribePasswordModal",
    "unsubscribeFinalModal",
    "leave-astegni-modal",
    "deleteModal1",
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
    "coverUploadModal",
    "profileUploadModal",
    "storyUploadModal",
    "coming-soon-modal",
    "create-event-modal",
    "create-club-modal",
    "adAnalyticsModal",
    "quizMainModal",
    "quizGiveModal",
    "quizMyQuizzesModal",
    "quizViewAnswersModal",
    "quizViewDetailsModal",
    "studentDetailsModal",
    "package-management-modal",
    "uploadDocumentModal",
    "certificationModal",
    "achievementModal",
    "experienceModal",
    "verificationFeeModal",
    "verificationModal",
    "viewAchievementModal",
    "viewCertificationModal",
    "viewExperienceModal",
    "storyViewerModal",
]

def find_modal_bounds(content, modal_id):
    """Find the start and end positions of a modal in the content."""
    # Pattern to find the modal opening tag
    pattern = rf'<div[^>]*id="{modal_id}"[^>]*>'

    match = re.search(pattern, content)
    if not match:
        # Try reverse (class before id)
        pattern = rf'<div[^>]*id="{modal_id}"[^>]*>'
        match = re.search(pattern, content, re.IGNORECASE)

    if not match:
        return None, None

    start_pos = match.start()

    # Find the matching closing tag by counting nested divs
    depth = 0
    pos = start_pos

    while pos < len(content):
        # Find next tag
        tag_match = re.search(r'<(/?)div[^>]*>', content[pos:])
        if not tag_match:
            break

        pos += tag_match.start()
        is_closing = tag_match.group(1) == '/'

        if is_closing:
            if depth == 0:
                # Found the matching closing tag
                end_pos = pos + tag_match.end()
                return start_pos, end_pos
            depth -= 1
        else:
            depth += 1

        pos += tag_match.end()

    return None, None

def get_modal_name(modal_id):
    """Convert modal ID to a descriptive filename."""
    # Convert camelCase to kebab-case
    name = re.sub(r'([a-z])([A-Z])', r'\1-\2', modal_id)
    name = name.lower()
    name = name.replace('modal', '')
    name = name.strip('-')
    if not name:
        name = 'modal'
    return f"{name}-modal.html"

def get_modal_description(modal_id, content):
    """Extract a description from the modal content."""
    descriptions = {
        "communityModal": "Community management modal - connections, followers, following",
        "customFilterModal": "Custom filter modal for tutor search",
        "verify-personal-info-modal": "Personal information verification modal",
        "payment-method-modal": "Payment method setup modal for receiving earnings",
        "subscription-modal": "Subscription and storage plans modal",
        "plan-details-modal": "Subscription plan details modal",
        "switchSubscriptionModal": "Switch subscription plan modal",
        "unsubscribeModal1": "Unsubscription reason collection modal (step 1)",
        "unsubscribeConfirm1": "Unsubscription first confirmation modal",
        "unsubscribeConfirm2": "Unsubscription cancellation fee confirmation modal",
        "unsubscribePasswordModal": "Unsubscription password confirmation modal",
        "unsubscribeFinalModal": "Unsubscription completion farewell modal",
        "leave-astegni-modal": "Leave Astegni platform modal",
        "deleteModal1": "Account deletion reason collection modal",
        "deleteVerifyModal": "Account deletion verification modal",
        "deleteSubscriptionCheckModal": "Active subscriptions check before deletion modal",
        "deletePasswordModal": "Account deletion password confirmation modal",
        "deleteFinalModal": "Account deletion completion farewell modal",
        "edit-profile-modal": "Edit tutor profile information modal",
        "otp-confirmation-modal": "OTP confirmation modal for profile changes",
        "otp-verification-modal": "OTP verification code entry modal",
        "scheduleModal": "Create/edit teaching schedule modal",
        "viewScheduleModal": "View teaching schedule details modal",
        "viewRequestModal": "View session request details modal",
        "coverUploadModal": "Cover photo upload modal with image cropping",
        "profileUploadModal": "Profile picture upload modal with image cropping",
        "storyUploadModal": "Story upload modal",
        "coming-soon-modal": "Coming soon feature announcement modal",
        "create-event-modal": "Create educational event modal",
        "create-club-modal": "Create educational club/study group modal",
        "adAnalyticsModal": "Advertisement analytics and performance modal",
        "quizMainModal": "Quiz system main menu modal",
        "quizGiveModal": "Give quiz to students modal",
        "quizMyQuizzesModal": "View my quizzes modal",
        "quizViewAnswersModal": "View quiz answers modal",
        "quizViewDetailsModal": "View quiz details modal",
        "studentDetailsModal": "Student details and progress tracking modal",
        "package-management-modal": "Package management modal for tutoring packages",
        "uploadDocumentModal": "Upload document/resource modal",
        "certificationModal": "Add certification modal",
        "achievementModal": "Add achievement modal",
        "experienceModal": "Add teaching experience modal",
        "verificationFeeModal": "Verification fee payment modal",
        "verificationModal": "Tutor verification application modal",
        "viewAchievementModal": "View achievement details modal",
        "viewCertificationModal": "View certification details modal",
        "viewExperienceModal": "View experience details modal",
        "storyViewerModal": "Story viewer modal",
    }
    return descriptions.get(modal_id, f"Modal: {modal_id}")

# Read the file
with open(html_file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Create output directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

# Extract each modal
extracted_modals = []
failed_modals = []

for modal_id in modal_ids:
    start, end = find_modal_bounds(content, modal_id)

    if start is None or end is None:
        failed_modals.append(modal_id)
        print(f"[FAIL] Failed to extract: {modal_id}")
        continue

    modal_content = content[start:end]
    filename = get_modal_name(modal_id)
    description = get_modal_description(modal_id, modal_content)

    # Create the modal file with header comment
    modal_file_content = f"""<!--
    Modal: {modal_id}
    Purpose: {description}
    Extracted from: tutor-profile.html
-->

{modal_content}
"""

    output_path = os.path.join(output_dir, filename)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(modal_file_content)

    extracted_modals.append({
        'id': modal_id,
        'filename': filename,
        'description': description,
        'start': start,
        'end': end
    })
    print(f"[OK] Extracted: {modal_id} -> {filename}")

# Generate replacement markers for the original file
replacements = []
for modal in sorted(extracted_modals, key=lambda x: x['start'], reverse=True):
    replacement_comment = f"""
    <!--
        ========================================
        MODAL EXTRACTED: {modal['id']}
        ========================================
        File: modals/tutor-profile/{modal['filename']}
        Purpose: {modal['description']}

        To load this modal, use JavaScript:
        fetch('modals/tutor-profile/{modal['filename']}')
            .then(response => response.text())
            .then(html => {{
                document.getElementById('modal-container').innerHTML = html;
            }});
        ========================================
    -->"""

    replacements.append({
        'start': modal['start'],
        'end': modal['end'],
        'comment': replacement_comment
    })

# Apply replacements to content
modified_content = content
for replacement in replacements:
    modified_content = (
        modified_content[:replacement['start']] +
        replacement['comment'] +
        modified_content[replacement['end']:]
    )

# Save the modified file
modified_file_path = html_file_path.replace('.html', '-refactored.html')
with open(modified_file_path, 'w', encoding='utf-8') as f:
    f.write(modified_content)

# Generate summary report
summary = f"""
================================================================================
MODAL EXTRACTION SUMMARY
================================================================================

Total Modals Found: {len(modal_ids)}
Successfully Extracted: {len(extracted_modals)}
Failed: {len(failed_modals)}

EXTRACTED MODALS:
--------------------------------------------------------------------------------
"""

for modal in sorted(extracted_modals, key=lambda x: x['filename']):
    summary += f"\n[OK] {modal['id']}\n"
    summary += f"   File: modals/tutor-profile/{modal['filename']}\n"
    summary += f"   Purpose: {modal['description']}\n"

if failed_modals:
    summary += f"\n\nFAILED MODALS:\n"
    summary += "--------------------------------------------------------------------------------\n"
    for modal_id in failed_modals:
        summary += f"[FAIL] {modal_id}\n"

summary += f"""

OUTPUT FILES:
--------------------------------------------------------------------------------
- Refactored HTML: {modified_file_path}
- Modal Files: {output_dir}
- Total Modal Files: {len(extracted_modals)}

INTEGRATION GUIDE:
--------------------------------------------------------------------------------
To integrate the extracted modals back into your application:

1. Create a modal container in tutor-profile.html:
   <div id="modal-container"></div>

2. Load modals dynamically as needed:
   function loadModal(modalName) {{
       fetch(`modals/tutor-profile/${{modalName}}`)
           .then(response => response.text())
           .then(html => {{
               const container = document.getElementById('modal-container');
               container.innerHTML = html;
           }});
   }}

3. Or preload all modals on page load:
   const modals = {[m['filename'] for m in extracted_modals]};
   modals.forEach(loadModal);

================================================================================
"""

print(summary)

# Save summary to file
summary_path = os.path.join(output_dir, '00-EXTRACTION-SUMMARY.txt')
with open(summary_path, 'w', encoding='utf-8') as f:
    f.write(summary)

print(f"\n[INFO] Summary saved to: {summary_path}")
