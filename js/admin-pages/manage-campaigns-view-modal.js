/**
 * Manage Campaigns - View Modal Handler
 * Displays full campaign details in a modal
 */

(function() {
    'use strict';

    const API_BASE_URL = 'https://api.astegni.com';
    let currentCampaign = null;

    /**
     * Open view campaign modal
     */
    window.viewCampaign = async function(campaignId) {
        try {
            // Show loading state
            const modal = document.getElementById('view-campaign-modal');
            if (!modal) {
                console.error('View campaign modal not found in DOM');
                return;
            }
            modal.style.display = 'flex';

            // Fetch all campaigns (we'll find the specific one)
            const adminSession = localStorage.getItem('adminSession');
            const adminId = adminSession ? JSON.parse(adminSession).id : 1;

            const response = await fetch(
                `${API_BASE_URL}/api/manage-campaigns/campaigns?status=&admin_id=${adminId}&limit=100`
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
                <div class="bg-gray-800 rounded-lg p-8 text-white text-center">
                    <i class="fas fa-video text-6xl mb-4"></i>
                    <p class="text-lg">Video Preview</p>
                    <p class="text-sm text-gray-400 mt-2">${campaign.media_url}</p>
                    <p class="text-xs text-gray-500 mt-4">Video playback would display here in production</p>
                </div>
            `;
        } else if (campaign.has_image) {
            mediaType.textContent = 'Image Campaign';
            mediaContent.innerHTML = `
                <div class="bg-gray-200 rounded-lg p-8 text-gray-700 text-center">
                    <i class="fas fa-image text-6xl mb-4"></i>
                    <p class="text-lg">Image Preview</p>
                    <p class="text-sm text-gray-500 mt-2">${campaign.media_url}</p>
                    <p class="text-xs text-gray-400 mt-4">Image would display here in production</p>
                </div>
            `;
        } else {
            mediaType.textContent = 'No Media';
            mediaContent.innerHTML = '<p class="text-gray-500 py-8">No media files attached</p>';
        }

        // Show/hide action buttons based on status
        const approveBtn = document.getElementById('modal-approve-btn');
        const rejectBtn = document.getElementById('modal-reject-btn');
        const suspendBtn = document.getElementById('modal-suspend-btn');

        if (approveBtn) approveBtn.classList.toggle('hidden', campaign.verification_status !== 'pending');
        if (rejectBtn) rejectBtn.classList.toggle('hidden', campaign.verification_status !== 'pending');
        if (suspendBtn) suspendBtn.classList.toggle('hidden', campaign.verification_status !== 'verified');
    }

    /**
     * Close modal
     */
    window.closeViewCampaignModal = function() {
        const modal = document.getElementById('view-campaign-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        currentCampaign = null;
    };

    /**
     * Handle modal actions
     */
    window.handleModalApprove = function() {
        if (currentCampaign && typeof window.approveCampaign === 'function') {
            window.approveCampaign(currentCampaign.id);
            closeViewCampaignModal();
        }
    };

    window.handleModalReject = function() {
        if (currentCampaign && typeof window.rejectCampaign === 'function') {
            window.rejectCampaign(currentCampaign.id);
            closeViewCampaignModal();
        }
    };

    window.handleModalSuspend = function() {
        if (currentCampaign && typeof window.suspendCampaign === 'function') {
            window.suspendCampaign(currentCampaign.id);
            closeViewCampaignModal();
        }
    };

    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('view-campaign-modal');
        if (modal && e.target === modal) {
            closeViewCampaignModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('view-campaign-modal');
            if (modal && modal.style.display === 'flex') {
                closeViewCampaignModal();
            }
        }
    });

    function showNotification(message, type) {
        // Use existing notification function or console
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            const notification = document.createElement('div');
            notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg`;
            notification.className += type === 'success' ? ' bg-green-500 text-white' : ' bg-red-500 text-white';
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                document.body.removeChild(notification);
            }, 3000);
        }
    }

    console.log('✓ Campaign view modal handler loaded');

})();
