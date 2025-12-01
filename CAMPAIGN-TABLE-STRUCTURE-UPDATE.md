# Campaign Table Structure Update

## Overview

This guide shows how to update the campaign tables to show only the required fields and add a view modal.

## Required Fields

### Table Columns (All Panels)
1. Company Name
2. Campaign Name
3. Ad Type
4. Target Audience
5. Actions (View button)

### View Modal Fields (All Details)
1. Company Name
2. Campaign Name
3. Campaign Objective
4. Ad Type
5. Target Audience
6. Target Region
7. Campaign Socials (Facebook, Instagram, Twitter, TikTok, YouTube)
8. Campaign Description
9. Start Date
10. End Date
11. Verification Status

## HTML Changes

### 1. Update Table Headers (All 4 Panels)

Replace all table headers in requested, verified, rejected, and suspended panels with:

```html
<thead>
    <tr>
        <th class="p-4 text-left">Company Name</th>
        <th class="p-4 text-left">Campaign Name</th>
        <th class="p-4 text-left">Ad Type</th>
        <th class="p-4 text-left">Target Audience</th>
        <th class="p-4 text-left">Actions</th>
    </tr>
</thead>
```

### 2. Update Loading States

Update colspan from 6 or 7 to 5:

```html
<td colspan="5" class="p-8 text-center text-gray-500">
    <div class="text-4xl mb-4">⏳</div>
    <div>Loading campaigns...</div>
</td>
```

### 3. Add View Campaign Modal

Add this modal before the closing `</body>` tag:

```html
<!-- View Campaign Modal -->
<div id="view-campaign-modal" class="modal fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50" style="display: none;">
    <div class="modal-content bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="modal-header p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
            <h2 class="text-2xl font-bold">Campaign Details</h2>
            <button onclick="closeViewCampaignModal()" class="text-gray-500 hover:text-gray-700 text-3xl leading-none">
                ×
            </button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Company Information -->
                <div class="col-span-2 bg-blue-50 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold mb-3 text-blue-900">Company Information</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm font-medium text-gray-600">Company Name</label>
                            <p id="modal-company-name" class="text-lg font-semibold">--</p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-gray-600">Verification Status</label>
                            <div id="modal-verification-status" class="mt-1">--</div>
                        </div>
                    </div>
                </div>

                <!-- Campaign Details -->
                <div class="col-span-2">
                    <h3 class="text-lg font-semibold mb-3">Campaign Details</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="text-sm font-medium text-gray-600">Campaign Name</label>
                            <p id="modal-campaign-name" class="text-base">--</p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-gray-600">Campaign Objective</label>
                            <p id="modal-campaign-objective" class="text-base">--</p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-gray-600">Description</label>
                            <p id="modal-campaign-description" class="text-base text-gray-700">--</p>
                        </div>
                    </div>
                </div>

                <!-- Campaign Settings -->
                <div>
                    <h3 class="text-lg font-semibold mb-3">Campaign Settings</h3>
                    <div class="space-y-3">
                        <div>
                            <label class="text-sm font-medium text-gray-600">Ad Type</label>
                            <p id="modal-ad-type" class="text-base">--</p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-gray-600">Start Date</label>
                            <p id="modal-start-date" class="text-base">--</p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-gray-600">End Date</label>
                            <p id="modal-end-date" class="text-base">--</p>
                        </div>
                    </div>
                </div>

                <!-- Targeting -->
                <div>
                    <h3 class="text-lg font-semibold mb-3">Targeting</h3>
                    <div class="space-y-3">
                        <div>
                            <label class="text-sm font-medium text-gray-600">Target Audience</label>
                            <div id="modal-target-audience" class="flex flex-wrap gap-2 mt-1">--</div>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-gray-600">Target Region</label>
                            <div id="modal-target-region" class="flex flex-wrap gap-2 mt-1">--</div>
                        </div>
                    </div>
                </div>

                <!-- Social Media Links -->
                <div class="col-span-2">
                    <h3 class="text-lg font-semibold mb-3">Campaign Social Media</h3>
                    <div id="modal-campaign-socials" class="flex flex-wrap gap-3">
                        <!-- Social media links will be inserted here -->
                    </div>
                </div>

                <!-- Media Preview -->
                <div class="col-span-2" id="modal-media-preview">
                    <h3 class="text-lg font-semibold mb-3">Campaign Media</h3>
                    <div class="bg-gray-100 rounded-lg p-4">
                        <p id="modal-media-type" class="text-sm text-gray-600 mb-2">--</p>
                        <div id="modal-media-content" class="text-center">
                            <!-- Media will be inserted here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer p-6 border-t bg-gray-50 flex justify-end gap-3">
            <button onclick="closeViewCampaignModal()"
                class="px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100">
                Close
            </button>
            <button id="modal-approve-btn" onclick="handleModalApprove()"
                class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 hidden">
                <i class="fas fa-check"></i> Approve
            </button>
            <button id="modal-reject-btn" onclick="handleModalReject()"
                class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 hidden">
                <i class="fas fa-times"></i> Reject
            </button>
            <button id="modal-suspend-btn" onclick="handleModalSuspend()"
                class="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 hidden">
                <i class="fas fa-pause"></i> Suspend
            </button>
        </div>
    </div>
</div>
```

## JavaScript Update File

Create a new file: `js/admin-pages/manage-campaigns-view-modal.js`

```javascript
/**
 * Manage Campaigns - View Modal Handler
 * Displays full campaign details in a modal
 */

(function() {
    'use strict';

    const API_BASE_URL = 'http://localhost:8000';
    let currentCampaign = null;

    /**
     * Open view campaign modal
     */
    window.viewCampaign = async function(campaignId) {
        try {
            // Show loading state
            const modal = document.getElementById('view-campaign-modal');
            modal.style.display = 'flex';

            // Fetch campaign details
            const response = await fetch(
                `${API_BASE_URL}/api/manage-campaigns/campaigns?status=&admin_id=1`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const campaign = data.campaigns.find(c => c.id === campaignId);

            if (!campaign) {
                throw new Error('Campaign not found');
            }

            currentCampaign = campaign;
            populateModal(campaign);

        } catch (error) {
            console.error('Failed to load campaign:', error);
            showNotification('Failed to load campaign details', 'error');
            closeViewCampaignModal();
        }
    };

    /**
     * Populate modal with campaign data
     */
    function populateModal(campaign) {
        // Company Information
        document.getElementById('modal-company-name').textContent =
            campaign.company_name || 'N/A';

        // Verification Status Badge
        const statusBadges = {
            'pending': '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Pending</span>',
            'verified': '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Verified</span>',
            'rejected': '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>',
            'suspended': '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">Suspended</span>'
        };
        document.getElementById('modal-verification-status').innerHTML =
            statusBadges[campaign.verification_status] || statusBadges['pending'];

        // Campaign Details
        document.getElementById('modal-campaign-name').textContent =
            campaign.campaign_name || 'N/A';

        document.getElementById('modal-campaign-objective').textContent =
            (campaign.campaign_objective || 'N/A').replace(/_/g, ' ').toUpperCase();

        document.getElementById('modal-campaign-description').textContent =
            campaign.description || 'No description provided';

        // Campaign Settings
        document.getElementById('modal-ad-type').textContent =
            (campaign.ad_type || 'N/A').toUpperCase();

        document.getElementById('modal-start-date').textContent =
            campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            }) : 'N/A';

        document.getElementById('modal-end-date').textContent =
            campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            }) : 'N/A';

        // Target Audience
        const audienceContainer = document.getElementById('modal-target-audience');
        audienceContainer.innerHTML = '';
        if (campaign.target_audience && campaign.target_audience.length > 0) {
            campaign.target_audience.forEach(audience => {
                const badge = document.createElement('span');
                badge.className = 'px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm';
                badge.textContent = audience.replace(/_/g, ' ');
                audienceContainer.appendChild(badge);
            });
        } else {
            audienceContainer.textContent = 'Not specified';
        }

        // Target Region
        const regionContainer = document.getElementById('modal-target-region');
        regionContainer.innerHTML = '';
        if (campaign.target_region && campaign.target_region.length > 0) {
            campaign.target_region.forEach(region => {
                const badge = document.createElement('span');
                badge.className = 'px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm';
                badge.textContent = region;
                regionContainer.appendChild(badge);
            });
        } else {
            regionContainer.textContent = 'Not specified';
        }

        // Campaign Socials
        const socialsContainer = document.getElementById('modal-campaign-socials');
        socialsContainer.innerHTML = '';
        if (campaign.campaign_socials && Object.keys(campaign.campaign_socials).length > 0) {
            const socialIcons = {
                facebook: 'fa-facebook',
                instagram: 'fa-instagram',
                twitter: 'fa-twitter',
                tiktok: 'fa-tiktok',
                youtube: 'fa-youtube'
            };

            Object.entries(campaign.campaign_socials).forEach(([platform, url]) => {
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.className = 'flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition';
                link.innerHTML = `
                    <i class="fab ${socialIcons[platform]} text-xl"></i>
                    <span class="capitalize">${platform}</span>
                `;
                socialsContainer.appendChild(link);
            });
        } else {
            socialsContainer.innerHTML = '<p class="text-gray-500">No social media links provided</p>';
        }

        // Media Preview
        const mediaContent = document.getElementById('modal-media-content');
        const mediaType = document.getElementById('modal-media-type');

        if (campaign.has_video) {
            mediaType.textContent = 'Video Campaign';
            mediaContent.innerHTML = `
                <video controls class="w-full max-h-96 rounded-lg">
                    <source src="${campaign.media_url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
        } else if (campaign.has_image) {
            mediaType.textContent = 'Image Campaign';
            mediaContent.innerHTML = `
                <img src="${campaign.media_url}" alt="Campaign Media"
                     class="w-full max-h-96 object-contain rounded-lg">
            `;
        } else {
            mediaType.textContent = 'No Media';
            mediaContent.innerHTML = '<p class="text-gray-500 py-8">No media files attached</p>';
        }

        // Show/hide action buttons based on status
        document.getElementById('modal-approve-btn').classList.toggle('hidden',
            campaign.verification_status !== 'pending');
        document.getElementById('modal-reject-btn').classList.toggle('hidden',
            campaign.verification_status !== 'pending');
        document.getElementById('modal-suspend-btn').classList.toggle('hidden',
            campaign.verification_status !== 'verified');
    }

    /**
     * Close modal
     */
    window.closeViewCampaignModal = function() {
        const modal = document.getElementById('view-campaign-modal');
        modal.style.display = 'none';
        currentCampaign = null;
    };

    /**
     * Handle modal actions
     */
    window.handleModalApprove = function() {
        if (currentCampaign) {
            approveCampaign(currentCampaign.id);
            closeViewCampaignModal();
        }
    };

    window.handleModalReject = function() {
        if (currentCampaign) {
            rejectCampaign(currentCampaign.id);
            closeViewCampaignModal();
        }
    };

    window.handleModalSuspend = function() {
        if (currentCampaign) {
            suspendCampaign(currentCampaign.id);
            closeViewCampaignModal();
        }
    };

    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('view-campaign-modal');
        if (e.target === modal) {
            closeViewCampaignModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeViewCampaignModal();
        }
    });

    function showNotification(message, type) {
        // Use existing notification function
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

})();
```

## Add Script to HTML

Add before the closing `</body>` tag:

```html
<!-- View modal handler -->
<script src="../js/admin-pages/manage-campaigns-view-modal.js"></script>
```

## Testing Steps

1. Run migration: `python migrate_add_campaign_socials.py`
2. Seed campaigns: `python seed_campaign_data.py`
3. Start backend: `python app.py`
4. Open manage-campaigns.html
5. Click "View" button on any campaign
6. Verify all fields display correctly

## What's Different

- **Old**: Tables showed 6-7 columns with budgets, dates, performance metrics
- **New**: Tables show 5 columns: Company, Campaign, Ad Type, Audience, Actions
- **Old**: No detailed view
- **New**: View modal shows ALL campaign details including socials

This creates a cleaner, more focused table view with all details accessible via the view button.
