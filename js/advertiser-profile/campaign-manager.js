// ============================================
// CAMPAIGN MANAGER
// Handles campaign creation, editing, and management
// ============================================

const CampaignManager = {
    currentFilter: 'all',
    campaigns: [],

    // Initialize campaign manager
    initialize() {
        this.loadCampaigns();
    },

    // Load campaigns from API
    async loadCampaigns(status = 'all') {
        try {
            const response = await AdvertiserProfileAPI.getCampaigns(status);
            this.campaigns = response.campaigns || [];
            this.renderCampaigns();
        } catch (error) {
            console.error('Error loading campaigns:', error);
            // Show empty state
            this.renderEmptyState();
        }
    },

    // Render campaigns list
    renderCampaigns() {
        const container = document.getElementById('campaignsList');
        if (!container) return;

        if (this.campaigns.length === 0) {
            this.renderEmptyState();
            return;
        }

        const html = this.campaigns.map(campaign => this.createCampaignCard(campaign)).join('');
        container.innerHTML = html;
    },

    // Create campaign card HTML
    createCampaignCard(campaign) {
        const statusColors = {
            active: '#22c55e',
            paused: '#f59e0b',
            completed: '#6b7280',
            draft: '#667eea'
        };

        const statusColor = statusColors[campaign.status] || '#6b7280';
        const progress = campaign.budget > 0 ? Math.min((campaign.spent / campaign.budget) * 100, 100) : 0;
        const daysLeft = this.calculateDaysLeft(campaign.end_date);

        return `
            <div class="campaign-card card" data-campaign-id="${campaign.id}">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem 0; color: var(--heading);">
                            ${campaign.name}
                        </h3>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <span style="background: ${statusColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                                ${campaign.status.toUpperCase()}
                            </span>
                            <span style="color: var(--text-muted); font-size: 0.875rem;">
                                ${campaign.type || 'General'}
                            </span>
                        </div>
                    </div>
                    <div class="campaign-actions" style="display: flex; gap: 0.5rem;">
                        <button onclick="CampaignManager.editCampaign(${campaign.id})"
                                class="icon-btn"
                                title="Edit Campaign"
                                style="padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border); background: var(--card-bg); cursor: pointer; transition: all 0.3s;">
                            ✏️
                        </button>
                        <button onclick="CampaignManager.deleteCampaign(${campaign.id})"
                                class="icon-btn"
                                title="Delete Campaign"
                                style="padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border); background: var(--card-bg); cursor: pointer; transition: all 0.3s;">
                            🗑️
                        </button>
                    </div>
                </div>

                ${campaign.description ? `
                    <p style="color: var(--text); margin-bottom: 1rem; font-size: 0.875rem;">
                        ${campaign.description}
                    </p>
                ` : ''}

                <!-- Campaign Stats -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Budget</div>
                        <div style="font-weight: 600; color: var(--heading);">${campaign.budget ? campaign.budget.toLocaleString() : '0'} ETB</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Spent</div>
                        <div style="font-weight: 600; color: var(--heading);">${campaign.spent ? campaign.spent.toLocaleString() : '0'} ETB</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">CTR</div>
                        <div style="font-weight: 600; color: var(--heading);">${campaign.ctr || '0.0'}%</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Days Left</div>
                        <div style="font-weight: 600; color: var(--heading);">${daysLeft}</div>
                    </div>
                </div>

                <!-- Budget Progress Bar -->
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.875rem;">
                        <span style="color: var(--text-muted);">Budget Progress</span>
                        <span style="font-weight: 600; color: var(--heading);">${progress.toFixed(1)}%</span>
                    </div>
                    <div style="background: var(--highlight-bg); height: 8px; border-radius: 10px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #667eea, #764ba2); width: ${progress}%; height: 100%; border-radius: 10px; transition: width 0.3s;"></div>
                    </div>
                </div>

                <!-- Campaign Date Range -->
                <div style="display: flex; justify-content: space-between; font-size: 0.875rem; color: var(--text-muted);">
                    <span>📅 ${this.formatDate(campaign.start_date)} - ${this.formatDate(campaign.end_date)}</span>
                    ${campaign.target_audience ? `
                        <span>🎯 ${Array.isArray(campaign.target_audience) ? campaign.target_audience.join(', ') : campaign.target_audience}</span>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // Render empty state
    renderEmptyState() {
        const container = document.getElementById('campaignsList');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted); grid-column: 1 / -1;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📢</div>
                <p>No campaigns yet. Create your first campaign to get started!</p>
            </div>
        `;
    },

    // Calculate days left until end date
    calculateDaysLeft(endDate) {
        if (!endDate) return 'N/A';
        const today = new Date();
        const end = new Date(endDate);
        const diffTime = end - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Ended';
        if (diffDays === 0) return 'Today';
        return `${diffDays} days`;
    },

    // Format date
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    // Edit campaign
    editCampaign(campaignId) {
        // TODO: Implement edit campaign modal
        console.log('Edit campaign:', campaignId);
        alert('Edit campaign feature coming soon!');
    },

    // Delete campaign
    async deleteCampaign(campaignId) {
        if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
            return;
        }

        try {
            await AdvertiserProfileAPI.deleteCampaign(campaignId);

            // Remove from local array
            this.campaigns = this.campaigns.filter(c => c.id !== campaignId);

            // Re-render
            this.renderCampaigns();

            // Show success message
            this.showNotification('Campaign deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting campaign:', error);
            this.showNotification('Failed to delete campaign', 'error');
        }
    },

    // Show notification
    showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            alert(message);
        }
    }
};

// ============================================
// GLOBAL FUNCTIONS FOR HTML ONCLICK
// ============================================

// Open create campaign modal
function openCreateCampaignModal() {
    const modal = document.getElementById('create-campaign-modal');
    if (modal) {
        // initializationManager.js sets inline style="display: none" on all modals
        // So we need to change style.display, not just remove the 'hidden' class
        modal.classList.remove('hidden');
        modal.style.display = 'flex'; // Override inline style
        document.body.style.overflow = 'hidden'; // Prevent scrolling

        // Set default dates (today and 30 days from now)
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 30);

        document.getElementById('campaignStartDate').value = today.toISOString().split('T')[0];
        document.getElementById('campaignEndDate').value = endDate.toISOString().split('T')[0];

        // Add ESC key handler
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeCreateCampaignModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
}

// Close create campaign modal
function closeCreateCampaignModal() {
    const modal = document.getElementById('create-campaign-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none'; // Set inline style back to none
        document.body.style.overflow = ''; // Restore scrolling
        document.getElementById('createCampaignForm').reset();

        // Reset media preview
        const previewContainer = document.getElementById('mediaPreview');
        if (previewContainer) {
            previewContainer.innerHTML = 'No media selected';
            previewContainer.style.color = 'var(--text-muted)';
        }
    }
}

// Save campaign (create new)
async function saveCampaign() {
    const form = document.getElementById('createCampaignForm');

    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Get the submit button
    const submitBtn = document.querySelector('#create-campaign-modal .btn-primary');
    const originalText = submitBtn.textContent;

    try {
        // Show loading state
        submitBtn.textContent = 'Uploading Media...';
        submitBtn.disabled = true;

        // Upload campaign media first (if file is selected)
        let mediaUrl = null;
        const mediaFileInput = document.getElementById('campaignMediaFile');
        if (mediaFileInput && mediaFileInput.files.length > 0) {
            const mediaFile = mediaFileInput.files[0];

            console.log('📤 Uploading campaign media to Backblaze...');
            const uploadResponse = await AdvertiserProfileAPI.uploadCampaignMedia(mediaFile);

            if (uploadResponse && uploadResponse.url) {
                mediaUrl = uploadResponse.url;
                console.log('✅ Media uploaded:', mediaUrl);
            }
        }

        // Update button text
        submitBtn.textContent = 'Creating Campaign...';

        // Get form values
        const campaignData = {
            name: document.getElementById('campaignName').value,
            ad_type: document.getElementById('campaignType').value,
            description: document.getElementById('campaignDescription').value,
            start_date: document.getElementById('campaignStartDate').value,
            end_date: document.getElementById('campaignEndDate').value,
            target_audience: Array.from(document.getElementById('campaignAudience').selectedOptions).map(opt => opt.value),
            locations: Array.from(document.getElementById('campaignRegions').selectedOptions).map(opt => opt.value),
            objective: document.getElementById('campaignGoal').value,
            landing_page_url: document.getElementById('campaignURL').value,
            creative_urls: mediaUrl ? [mediaUrl] : []  // Add uploaded media URL
        };

        // Call API to create campaign
        const response = await AdvertiserProfileAPI.createCampaign(campaignData);

        // Add to campaigns array (extract campaign from response)
        const newCampaign = response.campaign || response;
        CampaignManager.campaigns.unshift(newCampaign);

        // Re-render campaigns
        CampaignManager.renderCampaigns();

        // Close modal
        closeCreateCampaignModal();

        // Show success message
        CampaignManager.showNotification('Campaign created and submitted for verification!', 'success');

        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

    } catch (error) {
        console.error('Error creating campaign:', error);
        CampaignManager.showNotification(error.message || 'Failed to create campaign', 'error');

        // Reset button
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
}

// Filter campaigns by status
function filterCampaigns(status) {
    // Update active button
    document.querySelectorAll('.campaign-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-status') === status) {
            btn.classList.add('active');
        }
    });

    // Update current filter
    CampaignManager.currentFilter = status;

    // Reload campaigns with filter
    CampaignManager.loadCampaigns(status);
}

// Handle campaign media file selection and preview
function handleCampaignMediaSelect(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('mediaPreview');

    if (!file) {
        previewContainer.innerHTML = 'No media selected';
        previewContainer.style.color = 'var(--text-muted)';
        return;
    }

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
        previewContainer.innerHTML = '❌ Invalid file type. Please select an image or video.';
        previewContainer.style.color = '#ef4444';
        event.target.value = '';
        return;
    }

    // Validate file size
    const maxSize = isImage ? 5 * 1024 * 1024 : 200 * 1024 * 1024;
    if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        previewContainer.innerHTML = `❌ File too large. Max size: ${maxSizeMB}MB`;
        previewContainer.style.color = '#ef4444';
        event.target.value = '';
        return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        if (isImage) {
            previewContainer.innerHTML = `
                <div style="text-align: center;">
                    <img src="${e.target.result}"
                         style="max-width: 100%; max-height: 300px; border-radius: 8px; margin-bottom: 0.5rem;">
                    <div style="color: var(--text-muted); font-size: 0.875rem;">
                        📸 ${file.name} (${(file.size / 1024).toFixed(2)} KB)
                    </div>
                </div>
            `;
        } else {
            previewContainer.innerHTML = `
                <div style="text-align: center;">
                    <video src="${e.target.result}"
                           controls
                           style="max-width: 100%; max-height: 300px; border-radius: 8px; margin-bottom: 0.5rem;">
                    </video>
                    <div style="color: var(--text-muted); font-size: 0.875rem;">
                        🎬 ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                </div>
            `;
        }
        previewContainer.style.color = 'var(--text)';
    };
    reader.readAsDataURL(file);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the advertiser profile page
    if (document.getElementById('campaignsList')) {
        CampaignManager.initialize();
    }

    // Add event listener for media file input
    const mediaFileInput = document.getElementById('campaignMediaFile');
    if (mediaFileInput) {
        mediaFileInput.addEventListener('change', handleCampaignMediaSelect);
    }
});
