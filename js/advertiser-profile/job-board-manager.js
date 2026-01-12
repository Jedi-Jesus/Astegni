// ============================================
// ADVERTISER JOB BOARD MANAGER
// Handles job posting, editing, and application management
// ============================================

// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Helper function to get auth token
function getAuthToken() {
    return localStorage.getItem('token');
}

// Helper function to make authenticated API calls
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Response:', errorData);

            // Handle different error formats from FastAPI
            let errorMessage;
            if (typeof errorData.detail === 'string') {
                errorMessage = errorData.detail;
            } else if (Array.isArray(errorData.detail)) {
                // Pydantic validation errors come as an array
                errorMessage = errorData.detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
            } else if (typeof errorData.detail === 'object') {
                errorMessage = JSON.stringify(errorData.detail);
            } else {
                errorMessage = JSON.stringify(errorData);
            }

            throw new Error(errorMessage || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

/**
 * Open create job modal
 */
function openCreateJobModal() {
    console.log('📝 Opening create job modal...');
    const modal = document.getElementById('create-job-modal');
    if (modal) {
        console.log('✅ Modal found in DOM');

        // Remove hidden class if present
        modal.classList.remove('hidden');

        // Set display first
        modal.style.display = 'flex';

        // Force a reflow to ensure display change takes effect
        modal.offsetHeight;

        // Add active class to trigger CSS transitions and centering
        modal.classList.add('active');

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        console.log('✅ Modal opened with active class');
    } else {
        console.error('❌ Modal NOT found in DOM! ID: create-job-modal');
        console.log('Available modals:', Array.from(document.querySelectorAll('[id*="modal"]')).map(m => m.id));
    }
}

/**
 * Close create job modal
 */
function closeCreateJobModal() {
    console.log('❌ Closing create job modal...');
    const modal = document.getElementById('create-job-modal');
    if (modal) {
        // Remove active class first (triggers CSS transition)
        modal.classList.remove('active');

        // Wait for transition to complete before hiding
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }, 300);

        // Restore body scroll
        document.body.style.overflow = 'auto';

        // Reset modal to create mode if it was in edit mode
        if (window.editingJobId) {
            resetModalToCreateMode();
        } else {
            clearJobForm();
        }
    }
}

/**
 * Save job as draft
 */
async function saveJobDraft() {
    console.log('💾 Saving job as draft...');

    const formData = collectJobFormData();
    if (!formData) return;

    try {
        // Prepare API request body
        const jobData = {
            title: formData.title,
            description: formData.description,
            requirements: formData.requirements,
            job_type: formData.type,
            location_type: formData.locationType,
            location: formData.location,
            salary_min: formData.salary.min,
            salary_max: formData.salary.max,
            salary_visibility: formData.salary.visibility,
            application_deadline: formData.deadline,
            status: 'draft'
        };

        // Add skills as JSON array if present
        if (formData.skills && formData.skills.length > 0) {
            jobData.metadata = { skills: formData.skills };
        }

        // Call API to save draft
        const result = await apiCall('/api/jobs/posts', 'POST', jobData);

        showNotification('✅ Job saved as draft!', 'success');
        closeCreateJobModal();
        clearJobForm();

        // Reload drafts
        await loadDrafts();
        await updateDraftsCount();

        console.log('✅ Draft saved:', result);
    } catch (error) {
        console.error('Failed to save draft:', error);
        showNotification(`❌ Failed to save draft: ${error.message}`, 'error');
    }
}

/**
 * Post job immediately
 */
async function postJobNow(event) {
    if (event) event.preventDefault();
    console.log('🚀 Posting job now...');

    const formData = collectJobFormData();
    if (!formData) return;

    // Validate required fields
    if (!formData.title || !formData.type || !formData.locationType ||
        !formData.location || !formData.description || !formData.requirements ||
        !formData.deadline) {
        showNotification('❌ Please fill in all required fields', 'error');
        return;
    }

    try {
        // Prepare API request body
        const jobData = {
            title: formData.title,
            description: formData.description,
            requirements: formData.requirements,
            job_type: formData.type,
            location_type: formData.locationType,
            location: formData.location,
            salary_min: formData.salary.min,
            salary_max: formData.salary.max,
            salary_visibility: formData.salary.visibility,
            application_deadline: formData.deadline,
            status: 'active'  // Publish immediately
        };

        // Add skills as JSON array if present
        if (formData.skills && formData.skills.length > 0) {
            jobData.metadata = { skills: formData.skills };
        }

        // Call API to post job
        const result = await apiCall('/api/jobs/posts', 'POST', jobData);

        showNotification('✅ Job posted successfully!', 'success');
        closeCreateJobModal();
        clearJobForm();

        // Switch to active jobs tab to see the posted job
        setTimeout(async () => {
            switchJobTab('active-jobs');
            await loadActiveJobs();
        }, 1500);

        console.log('✅ Job posted:', result);
    } catch (error) {
        console.error('Failed to post job:', error);
        showNotification(`❌ Failed to post job: ${error.message}`, 'error');
    }
}

/**
 * Collect form data from job post form (modal)
 */
function collectJobFormData() {
    const title = document.getElementById('modal-job-title')?.value;
    const type = document.getElementById('modal-job-type')?.value;
    const locationType = document.getElementById('modal-job-location-type')?.value;
    const location = document.getElementById('modal-job-location')?.value;
    const description = document.getElementById('modal-job-description')?.value;
    const requirements = document.getElementById('modal-job-requirements')?.value;
    const salaryMin = document.getElementById('modal-salary-min')?.value;
    const salaryMax = document.getElementById('modal-salary-max')?.value;
    const salaryVisibility = document.getElementById('modal-salary-visibility')?.value || 'public';
    const deadline = document.getElementById('modal-job-deadline')?.value;
    const skills = document.getElementById('modal-job-skills')?.value;

    return {
        title,
        type,
        locationType,
        location,
        description,
        requirements,
        salary: {
            min: salaryMin ? parseInt(salaryMin) : null,
            max: salaryMax ? parseInt(salaryMax) : null,
            visibility: salaryVisibility
        },
        deadline,
        skills: skills ? skills.split(',').map(s => s.trim()) : []
    };
}

/**
 * Clear job form after submission
 */
function clearJobForm() {
    const form = document.getElementById('create-job-form');
    if (form) {
        form.reset();
    }
}

/**
 * Load drafts from API and display them
 */
async function loadDrafts() {
    console.log('📋 Loading drafts from API...');

    const grid = document.getElementById('drafts-grid');
    if (!grid) return;

    try {
        // Call API to get drafts
        const result = await apiCall('/api/jobs/posts?status=draft&page=1&limit=50');
        const drafts = result.jobs || [];

        // Clear grid
        grid.innerHTML = '';

        if (drafts.length === 0) {
            // Show empty state
            grid.innerHTML = `
                <div class="col-span-2 text-center py-12">
                    <div class="text-6xl mb-4">📝</div>
                    <h3 class="text-xl font-bold mb-2">No Drafts Yet</h3>
                    <p class="text-gray-600 mb-6">Save job listings as drafts to continue editing them later</p>
                    <button onclick="openCreateJobModal()" class="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg font-semibold">
                        ➕ Create Your First Job
                    </button>
                </div>
            `;
            return;
        }

        // Display draft cards
        drafts.forEach(draft => {
            const card = createDraftCard(draft);
            grid.insertAdjacentHTML('beforeend', card);
        });

        console.log(`✅ Loaded ${drafts.length} drafts from API`);
    } catch (error) {
        console.error('Failed to load drafts:', error);
        grid.innerHTML = `
            <div class="col-span-2 text-center py-12">
                <div class="text-6xl mb-4">❌</div>
                <h3 class="text-xl font-bold mb-2 text-red-600">Failed to Load Drafts</h3>
                <p class="text-gray-600 mb-6">${error.message}</p>
                <button onclick="loadDrafts()" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-lg font-semibold">
                    🔄 Retry
                </button>
            </div>
        `;
    }
}

/**
 * Create HTML for a draft card
 */
function createDraftCard(draft) {
    const createdDate = new Date(draft.created_at).toLocaleDateString();
    const title = draft.title || 'Untitled Job';
    const jobType = draft.job_type || 'Full-time';
    const locationType = draft.location_type || 'On-site';
    const location = draft.location || 'Location not specified';
    const description = draft.description || 'No description';

    return `
        <div class="card p-6 hover:shadow-xl transition-all">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-xl font-bold mb-2">${title}</h3>
                    <p class="text-gray-600 text-sm">${jobType} • ${locationType} • ${location}</p>
                </div>
                <span class="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">Draft</span>
            </div>

            <p class="text-sm text-gray-600 mb-4 line-clamp-2">${description}</p>

            <p class="text-xs text-gray-500 mb-4">Created ${createdDate}</p>

            <div class="flex gap-2">
                <button onclick="editDraft(${draft.id})" class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold">
                    ✏️ Continue Editing
                </button>
                <button onclick="deleteDraft(${draft.id})" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm">
                    🗑️
                </button>
            </div>
        </div>
    `;
}

/**
 * Edit a draft
 */
function editDraft(draftId) {
    console.log(`✏️ Editing draft ${draftId}...`);
    // TODO: Load draft data into modal form
    showNotification('📝 Draft editing coming soon!', 'info');
}

/**
 * Delete a draft
 */
async function deleteDraft(draftId) {
    console.log(`🗑️ Deleting draft ${draftId}...`);

    if (!confirm('Are you sure you want to delete this draft?')) {
        return;
    }

    try {
        await apiCall(`/api/jobs/posts/${draftId}`, 'DELETE');
        showNotification('✅ Draft deleted!', 'success');

        // Reload drafts
        await loadDrafts();
        await updateDraftsCount();
    } catch (error) {
        console.error('Failed to delete draft:', error);
        showNotification(`❌ Failed to delete draft: ${error.message}`, 'error');
    }
}

/**
 * Update drafts count badge
 */
async function updateDraftsCount() {
    try {
        const result = await apiCall('/api/jobs/posts?status=draft&page=1&limit=1');
        const count = result.total || 0;

        const countElement = document.getElementById('drafts-count');
        if (countElement) {
            countElement.textContent = count;
        }
    } catch (error) {
        console.error('Failed to update drafts count:', error);
    }
}

/**
 * Load active jobs from API and display them
 */
async function loadActiveJobs() {
    console.log('📋 Loading active jobs from API...');

    const grid = document.getElementById('active-jobs-grid');
    if (!grid) return;

    try {
        // Call API to get active jobs
        const result = await apiCall('/api/jobs/posts?status=active&page=1&limit=50');
        const jobs = result.jobs || [];

        // Clear grid (remove sample cards)
        grid.innerHTML = '';

        if (jobs.length === 0) {
            // Show empty state
            grid.innerHTML = `
                <div class="col-span-2 text-center py-12">
                    <div class="text-6xl mb-4">📢</div>
                    <h3 class="text-xl font-bold mb-2">No Active Jobs</h3>
                    <p class="text-gray-600 mb-6">Post your first job to start receiving applications</p>
                    <button onclick="openCreateJobModal()" class="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg font-semibold">
                        ➕ Post a Job
                    </button>
                </div>
            `;
            return;
        }

        // Display active job cards
        jobs.forEach(job => {
            const card = createActiveJobCard(job);
            grid.insertAdjacentHTML('beforeend', card);
        });

        console.log(`✅ Loaded ${jobs.length} active jobs from API`);
    } catch (error) {
        console.error('Failed to load active jobs:', error);
        grid.innerHTML = `
            <div class="col-span-2 text-center py-12">
                <div class="text-6xl mb-4">❌</div>
                <h3 class="text-xl font-bold mb-2 text-red-600">Failed to Load Jobs</h3>
                <p class="text-gray-600 mb-6">${error.message}</p>
                <button onclick="loadActiveJobs()" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-lg font-semibold">
                    🔄 Retry
                </button>
            </div>
        `;
    }
}

/**
 * Create HTML for an active job card
 */
function createActiveJobCard(job) {
    const postedDate = new Date(job.published_at || job.created_at).toLocaleDateString();
    const deadline = new Date(job.application_deadline).toLocaleDateString();
    const title = job.title || 'Untitled Job';
    const jobType = job.job_type || 'Full-time';
    const locationType = job.location_type || 'On-site';
    const location = job.location || 'Location not specified';
    const views = job.views_count || 0;
    const applications = job.applications_count || 0;

    // Calculate salary display
    let salaryDisplay = 'Negotiable';
    if (job.salary_visibility === 'public') {
        if (job.salary_min && job.salary_max) {
            salaryDisplay = `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} ETB`;
        } else if (job.salary_min) {
            salaryDisplay = `From ${job.salary_min.toLocaleString()} ETB`;
        }
    }

    return `
        <div class="card p-6 hover:shadow-xl transition-all border-l-4 border-green-500">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-xl font-bold mb-2 cursor-pointer hover:text-blue-600 transition-colors" onclick="viewJobDetails(${job.id})">${title}</h3>
                    <p class="text-gray-600 text-sm">${jobType} • ${locationType} • ${location}</p>
                    <p class="text-gray-600 text-sm mt-1">💰 ${salaryDisplay}</p>
                </div>
                <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Active</span>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="bg-blue-50 p-3 rounded-lg text-center">
                    <p class="text-2xl font-bold text-blue-600">${views}</p>
                    <p class="text-xs text-gray-600">Views</p>
                </div>
                <div class="bg-purple-50 p-3 rounded-lg text-center">
                    <p class="text-2xl font-bold text-purple-600">${applications}</p>
                    <p class="text-xs text-gray-600">Applications</p>
                </div>
            </div>

            <p class="text-xs text-gray-500 mb-4">
                Posted ${postedDate} • Closes ${deadline}
            </p>

            <div class="flex gap-2">
                <button onclick="viewJobApplications(${job.id})" class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold">
                    👥 View Applications
                </button>
                <button onclick="editJob(${job.id})" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                    ✏️
                </button>
                <button onclick="closeJob(${job.id})" class="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm">
                    🔒
                </button>
            </div>
        </div>
    `;
}

/**
 * View applications for a job - Opens the job applicants modal
 */
async function viewJobApplications(jobId) {
    console.log(`👥 Viewing applications for job ${jobId}...`);
    await openJobApplicantsModal(jobId);
}

/**
 * Open job applicants modal with list on left and details on right (campaign-style)
 */
async function openJobApplicantsModal(jobId, preselectedApplicationId = null) {
    console.log(`📋 Opening applicants modal for job ${jobId}...`);

    try {
        // Fetch job details
        const job = await apiCall(`/api/jobs/posts/${jobId}`);

        // Fetch applications for this job
        const result = await apiCall(`/api/jobs/posts/${jobId}/applications`);
        const applications = result.applications || [];

        // Store current state
        window.currentJobApplicantsModal = {
            jobId: jobId,
            job: job,
            applications: applications,
            selectedApplicationId: preselectedApplicationId
        };

        // Create modal HTML
        const modalHtml = createJobApplicantsModalHtml(job, applications, preselectedApplicationId);

        // Remove existing modal if present
        const existingModal = document.getElementById('job-applicants-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // If there's a preselected application, show its details
        if (preselectedApplicationId) {
            selectApplicant(preselectedApplicationId);
        } else if (applications.length > 0) {
            // Auto-select first applicant
            selectApplicant(applications[0].id);
        }

        console.log(`✅ Job applicants modal opened with ${applications.length} applications`);
    } catch (error) {
        console.error('Failed to open job applicants modal:', error);
        showNotification(`❌ Failed to load applications: ${error.message}`, 'error');
    }
}

/**
 * Create HTML for job applicants modal
 */
function createJobApplicantsModalHtml(job, applications, preselectedId) {
    const applicantsListHtml = applications.length > 0
        ? applications.map(app => createApplicantListItem(app, app.id === preselectedId)).join('')
        : `<div class="empty-applicants-state">
            <div class="text-4xl mb-3">📭</div>
            <p class="font-semibold">No Applications Yet</p>
            <p class="text-sm text-gray-500">Applications will appear here when candidates apply</p>
           </div>`;

    return `
        <div id="job-applicants-modal" class="job-modal-overlay" style="display: flex !important; opacity: 1 !important; visibility: visible !important; z-index: 10000; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); align-items: center; justify-content: center;">
            <div class="modal-container" style="width: 95%; max-width: 1200px; height: 90vh; background: var(--card-bg); border-radius: 16px; position: relative; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4); display: flex; flex-direction: column; overflow: hidden;">

                <!-- Modal Header -->
                <div class="modal-header" style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%);">
                    <div class="flex items-center gap-4">
                        <!-- Hamburger button to toggle applicants list -->
                        <button onclick="toggleApplicantsList()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Toggle Applicants List" id="toggle-applicants-btn">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                        <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl">
                            💼
                        </div>
                        <div>
                            <h2 class="text-xl font-bold">${job.title}</h2>
                            <div class="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                <span class="flex items-center gap-1">
                                    <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                                    ${applications.length} Applications
                                </span>
                                <span>•</span>
                                <span>${job.job_type || 'Full-time'}</span>
                                <span>•</span>
                                <span>${job.location || 'Location not specified'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="closeJobApplicantsModal()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Close">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Modal Body -->
                <div class="modal-body" style="flex: 1; display: flex; overflow: hidden;">

                    <!-- Left Panel: Applicants List -->
                    <div id="applicants-list-panel" class="applicants-list-panel" style="width: 340px; border-right: 1px solid var(--border-color); display: flex; flex-direction: column; background: var(--sidebar-bg, #f8fafc);">

                        <!-- Search & Filter -->
                        <div style="padding: 1rem; border-bottom: 1px solid var(--border-color);">
                            <div class="relative">
                                <input type="text" id="applicant-search-input" placeholder="Search applicants..."
                                       oninput="filterApplicantsList(this.value)"
                                       style="width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.875rem; background: var(--card-bg);">
                                <svg class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                            </div>
                            <div class="flex gap-2 mt-2">
                                <select id="applicant-status-filter" onchange="filterApplicantsByStatus(this.value)"
                                        style="flex: 1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.75rem; background: var(--card-bg);">
                                    <option value="">All Status</option>
                                    <option value="new">🟡 New</option>
                                    <option value="reviewing">👀 Reviewed</option>
                                    <option value="shortlisted">⭐ Shortlisted</option>
                                    <option value="interviewed">🎤 Interviewed</option>
                                    <option value="offered">💼 Offered</option>
                                    <option value="hired">✅ Hired</option>
                                    <option value="rejected">❌ Rejected</option>
                                </select>
                            </div>
                        </div>

                        <!-- Applicants List -->
                        <div id="applicants-list-container" style="flex: 1; overflow-y: auto; padding: 0.5rem;">
                            ${applicantsListHtml}
                        </div>
                    </div>

                    <!-- Right Panel: Applicant Details -->
                    <div class="applicant-details-panel" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                        <div id="applicant-details-content" style="flex: 1; overflow-y: auto; padding: 1.5rem;">
                            ${applications.length > 0 ? `
                                <div class="select-applicant-placeholder" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted);">
                                    <div class="text-6xl mb-4 opacity-50">👆</div>
                                    <h3 class="text-xl font-semibold mb-2">Select an Applicant</h3>
                                    <p>Click on an applicant from the list to view their details</p>
                                </div>
                            ` : `
                                <div class="no-applicants-placeholder" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted);">
                                    <div class="text-6xl mb-4 opacity-50">📭</div>
                                    <h3 class="text-xl font-semibold mb-2">No Applications Yet</h3>
                                    <p class="mb-4">When candidates apply for this position, their applications will appear here</p>
                                    <button onclick="closeJobApplicantsModal()" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                                        Close
                                    </button>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <style>
            #job-applicants-modal .applicant-list-item {
                padding: 1rem;
                margin: 0.25rem 0;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s ease;
                background: var(--card-bg);
                border: 1px solid transparent;
            }
            #job-applicants-modal .applicant-list-item:hover {
                background: var(--hover-bg, #f1f5f9);
                border-color: var(--border-color);
            }
            #job-applicants-modal .applicant-list-item.selected {
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
                border-color: rgba(59, 130, 246, 0.3);
            }
            #job-applicants-modal .applicant-avatar {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: white;
                font-size: 1rem;
            }
            #job-applicants-modal .empty-applicants-state {
                padding: 2rem;
                text-align: center;
                color: var(--text-muted);
            }
            #job-applicants-modal .status-badge {
                padding: 0.25rem 0.5rem;
                border-radius: 999px;
                font-size: 0.7rem;
                font-weight: 600;
                text-transform: uppercase;
            }
        </style>
    `;
}

/**
 * Create list item HTML for an applicant
 */
function createApplicantListItem(app, isSelected = false) {
    const initials = getInitials(app.applicant_name || 'Unknown');
    const appliedDate = app.applied_at ? getRelativeTime(new Date(app.applied_at)) : 'N/A';
    const statusColors = {
        'new': { bg: '#fef3c7', text: '#92400e', icon: '🟡' },
        'reviewing': { bg: '#dbeafe', text: '#1e40af', icon: '👀' },
        'shortlisted': { bg: '#ede9fe', text: '#5b21b6', icon: '⭐' },
        'interviewed': { bg: '#e0e7ff', text: '#3730a3', icon: '🎤' },
        'offered': { bg: '#d1fae5', text: '#065f46', icon: '💼' },
        'hired': { bg: '#bbf7d0', text: '#14532d', icon: '✅' },
        'rejected': { bg: '#fee2e2', text: '#991b1b', icon: '❌' }
    };
    const statusStyle = statusColors[app.status] || { bg: '#f3f4f6', text: '#374151', icon: '📄' };

    // Random gradient for avatar
    const gradients = [
        'from-blue-400 to-blue-600',
        'from-purple-400 to-purple-600',
        'from-green-400 to-green-600',
        'from-pink-400 to-pink-600',
        'from-indigo-400 to-indigo-600',
        'from-teal-400 to-teal-600'
    ];
    const gradient = gradients[app.id % gradients.length];

    return `
        <div class="applicant-list-item ${isSelected ? 'selected' : ''}"
             data-application-id="${app.id}"
             data-status="${app.status}"
             data-name="${(app.applicant_name || '').toLowerCase()}"
             onclick="selectApplicant(${app.id})">
            <div class="flex items-center gap-3">
                <div class="applicant-avatar bg-gradient-to-br ${gradient}">
                    ${initials}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                        <p class="font-semibold text-sm truncate">${app.applicant_name || 'Unknown'}</p>
                        <span class="status-badge" style="background: ${statusStyle.bg}; color: ${statusStyle.text};">
                            ${statusStyle.icon} ${app.status}
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 truncate">${app.applicant_email || 'No email'}</p>
                    <p class="text-xs text-gray-400 mt-1">${appliedDate}</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Toggle applicants list panel visibility (for mobile/responsive)
 */
function toggleApplicantsList() {
    const panel = document.getElementById('applicants-list-panel');
    const toggleBtn = document.getElementById('toggle-applicants-btn');

    if (panel) {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'flex' : 'none';

        // Update button icon
        if (toggleBtn) {
            toggleBtn.innerHTML = isHidden
                ? `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                   </svg>`
                : `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                   </svg>`;
        }
    }
}

/**
 * Select an applicant and show their details
 * Automatically marks application as "reviewing" if it was "new"
 */
async function selectApplicant(applicationId) {
    console.log(`👤 Selecting applicant ${applicationId}...`);

    // Update selection in list
    document.querySelectorAll('#job-applicants-modal .applicant-list-item').forEach(item => {
        item.classList.remove('selected');
        if (parseInt(item.dataset.applicationId) === applicationId) {
            item.classList.add('selected');
        }
    });

    // Get application from stored data
    const modalData = window.currentJobApplicantsModal;
    if (!modalData) return;

    const application = modalData.applications.find(app => app.id === applicationId);
    if (!application) {
        console.error('Application not found:', applicationId);
        return;
    }

    // Update selected ID
    window.currentJobApplicantsModal.selectedApplicationId = applicationId;

    // Auto-mark as "reviewing" if status was "new" (first time viewing)
    if (application.status === 'new') {
        try {
            await apiCall(`/api/jobs/applications/${applicationId}/status`, 'PUT', { status: 'reviewing' });
            application.status = 'reviewing';

            // Update list item appearance
            const listItem = document.querySelector(`#job-applicants-modal .applicant-list-item[data-application-id="${applicationId}"]`);
            if (listItem) {
                listItem.dataset.status = 'reviewing';
                // Update the status badge in the list item
                const badge = listItem.querySelector('.status-badge');
                if (badge) {
                    badge.style.background = '#dbeafe';
                    badge.style.color = '#1e40af';
                    badge.innerHTML = '👀 reviewing';
                }
            }
            console.log(`✅ Application ${applicationId} auto-marked as reviewing`);
        } catch (error) {
            console.error('Failed to auto-update status:', error);
        }
    }

    // Render applicant details
    const detailsContainer = document.getElementById('applicant-details-content');
    if (detailsContainer) {
        detailsContainer.innerHTML = createApplicantDetailsHtml(application, modalData.job);
    }
}

/**
 * Create HTML for applicant details panel
 * Status is automatic based on actions:
 * - new: Application hasn't been opened
 * - reviewing: Application has been viewed
 * - shortlisted: Schedule interview was clicked
 * - interviewed: Interview was completed
 * - offered: Offer was sent
 * - hired: Offer accepted
 * - rejected: Rejected by employer
 */
function createApplicantDetailsHtml(app, job) {
    const appliedDate = app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }) : 'N/A';

    const statusColors = {
        'new': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '🟡 New' },
        'reviewing': { bg: 'bg-blue-100', text: 'text-blue-700', label: '👀 Reviewed' },
        'shortlisted': { bg: 'bg-purple-100', text: 'text-purple-700', label: '⭐ Shortlisted' },
        'interviewed': { bg: 'bg-indigo-100', text: 'text-indigo-700', label: '🎤 Interviewed' },
        'offered': { bg: 'bg-green-100', text: 'text-green-700', label: '💼 Offered' },
        'hired': { bg: 'bg-green-200', text: 'text-green-800', label: '✅ Hired' },
        'rejected': { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Rejected' }
    };
    const status = statusColors[app.status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: app.status };

    // Random gradient for avatar
    const gradients = [
        'from-blue-400 to-blue-600',
        'from-purple-400 to-purple-600',
        'from-green-400 to-green-600',
        'from-pink-400 to-pink-600',
        'from-indigo-400 to-indigo-600'
    ];
    const gradient = gradients[app.id % gradients.length];

    // Experience count (from app data or placeholder)
    const experienceCount = app.experience_count || 0;
    const experienceDocuments = app.experience_documents || [];

    return `
        <div class="applicant-details">
            <!-- Header with Avatar and Name -->
            <div class="flex items-start gap-4 mb-6">
                <div class="w-20 h-20 bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    ${getInitials(app.applicant_name || 'Unknown')}
                </div>
                <div class="flex-1">
                    <h2 class="text-2xl font-bold mb-1">${app.applicant_name || 'Unknown Applicant'}</h2>
                    <div class="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
                        <span class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                            ${app.applicant_email || 'No email'}
                        </span>
                        <span class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                            </svg>
                            ${app.applicant_phone || 'No phone'}
                        </span>
                    </div>
                    <span class="inline-flex px-3 py-1 rounded-full text-sm font-semibold ${status.bg} ${status.text}">
                        ${status.label}
                    </span>
                </div>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-3 gap-4 mb-6">
                <div class="p-4 bg-gray-50 rounded-lg text-center">
                    <div class="text-2xl font-bold text-blue-600">${appliedDate.split(',')[0]}</div>
                    <div class="text-xs text-gray-500">Applied</div>
                </div>
                <div class="p-4 bg-gray-50 rounded-lg text-center">
                    <div class="text-2xl font-bold text-purple-600">${app.expected_salary ? (app.expected_salary / 1000).toFixed(0) + 'K' : '-'}</div>
                    <div class="text-xs text-gray-500">Expected (ETB)</div>
                </div>
                <div class="p-4 bg-gray-50 rounded-lg text-center">
                    <div class="text-2xl font-bold text-green-600">${experienceCount}</div>
                    <div class="text-xs text-gray-500">Years Experience</div>
                </div>
            </div>

            <!-- Cover Letter -->
            <div class="mb-6">
                <h3 class="font-semibold text-lg mb-3 flex items-center gap-2">
                    <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    Cover Letter
                </h3>
                <div class="p-4 bg-gray-50 rounded-lg text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    ${app.cover_letter || 'No cover letter provided.'}
                </div>
            </div>

            <!-- Experience Documents Section -->
            <div class="mb-6">
                <h3 class="font-semibold text-lg mb-3 flex items-center gap-2">
                    <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    Experience Documents
                </h3>
                ${experienceDocuments.length > 0 ? `
                    <div class="space-y-2">
                        ${experienceDocuments.map(doc => `
                            <a href="${doc.url}" target="_blank" class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <svg class="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-2 10H7v-2h4v2zm6 0h-4v-2h4v2zm0-4H7V8h10v2z"/>
                                </svg>
                                <div class="flex-1">
                                    <p class="font-medium">${doc.name || 'Document'}</p>
                                    <p class="text-xs text-gray-500">${doc.type || 'PDF'}</p>
                                </div>
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                </svg>
                            </a>
                        `).join('')}
                    </div>
                ` : `
                    <div class="p-4 bg-gray-50 rounded-lg text-gray-500 italic text-center">
                        <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        No experience documents uploaded
                    </div>
                `}
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3">
                <button onclick="contactApplicantFromModal(${app.id})" class="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    Contact
                </button>
                <button onclick="scheduleInterviewFromModal(${app.id})" class="flex-1 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-semibold flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    Schedule Interview
                </button>
                <button onclick="rejectApplicantFromModal(${app.id})" class="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    Reject
                </button>
            </div>
        </div>
    `;
}

/**
 * Filter applicants list by search text
 */
function filterApplicantsList(searchText) {
    const search = searchText.toLowerCase();
    document.querySelectorAll('#job-applicants-modal .applicant-list-item').forEach(item => {
        const name = item.dataset.name || '';
        item.style.display = name.includes(search) ? 'block' : 'none';
    });
}

/**
 * Filter applicants by status
 */
function filterApplicantsByStatus(status) {
    document.querySelectorAll('#job-applicants-modal .applicant-list-item').forEach(item => {
        if (!status || item.dataset.status === status) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

/**
 * Update applicant status from modal
 */
async function updateApplicantStatusFromModal(applicationId, newStatus) {
    try {
        await apiCall(`/api/jobs/applications/${applicationId}/status`, 'PUT', { status: newStatus });
        showNotification('✅ Status updated!', 'success');

        // Update in local data
        if (window.currentJobApplicantsModal) {
            const app = window.currentJobApplicantsModal.applications.find(a => a.id === applicationId);
            if (app) {
                app.status = newStatus;
            }

            // Update list item appearance
            const listItem = document.querySelector(`#job-applicants-modal .applicant-list-item[data-application-id="${applicationId}"]`);
            if (listItem) {
                listItem.dataset.status = newStatus;
                const newItemHtml = createApplicantListItem({ ...app, status: newStatus }, true);
                listItem.outerHTML = newItemHtml;
            }
        }

        // Also update the applications tab count
        await updateApplicationsCount();
    } catch (error) {
        console.error('Failed to update status:', error);
        showNotification(`❌ Failed to update status: ${error.message}`, 'error');
    }
}

/**
 * Contact applicant from modal
 */
function contactApplicantFromModal(applicationId) {
    console.log(`💬 Contacting applicant ${applicationId}...`);
    showNotification('💬 Opening chat...', 'info');
    // TODO: Integrate with chat modal
}

/**
 * Schedule interview from modal
 * Automatically marks application as "shortlisted"
 */
async function scheduleInterviewFromModal(applicationId) {
    console.log(`📅 Scheduling interview for applicant ${applicationId}...`);

    // Auto-mark as "shortlisted" when scheduling interview
    try {
        await apiCall(`/api/jobs/applications/${applicationId}/status`, 'PUT', { status: 'shortlisted' });

        // Update local data
        if (window.currentJobApplicantsModal) {
            const app = window.currentJobApplicantsModal.applications.find(a => a.id === applicationId);
            if (app) {
                app.status = 'shortlisted';

                // Update list item appearance
                const listItem = document.querySelector(`#job-applicants-modal .applicant-list-item[data-application-id="${applicationId}"]`);
                if (listItem) {
                    listItem.dataset.status = 'shortlisted';
                    const badge = listItem.querySelector('.status-badge');
                    if (badge) {
                        badge.style.background = '#ede9fe';
                        badge.style.color = '#5b21b6';
                        badge.innerHTML = '⭐ shortlisted';
                    }
                }

                // Re-render applicant details to show updated status
                const detailsContainer = document.getElementById('applicant-details-content');
                if (detailsContainer) {
                    detailsContainer.innerHTML = createApplicantDetailsHtml(app, window.currentJobApplicantsModal.job);
                }
            }
        }

        showNotification('⭐ Applicant shortlisted! Interview scheduling coming soon!', 'success');
        console.log(`✅ Application ${applicationId} marked as shortlisted`);
    } catch (error) {
        console.error('Failed to shortlist applicant:', error);
        showNotification(`❌ Failed to shortlist: ${error.message}`, 'error');
    }
}

/**
 * Reject applicant from modal
 * Automatically marks application as "rejected"
 */
async function rejectApplicantFromModal(applicationId) {
    console.log(`❌ Rejecting applicant ${applicationId}...`);

    // Confirm rejection
    if (!confirm('Are you sure you want to reject this applicant? This action cannot be undone.')) {
        return;
    }

    try {
        await apiCall(`/api/jobs/applications/${applicationId}/status`, 'PUT', { status: 'rejected' });

        // Update local data
        if (window.currentJobApplicantsModal) {
            const app = window.currentJobApplicantsModal.applications.find(a => a.id === applicationId);
            if (app) {
                app.status = 'rejected';

                // Update list item appearance
                const listItem = document.querySelector(`#job-applicants-modal .applicant-list-item[data-application-id="${applicationId}"]`);
                if (listItem) {
                    listItem.dataset.status = 'rejected';
                    const badge = listItem.querySelector('.status-badge');
                    if (badge) {
                        badge.style.background = '#fee2e2';
                        badge.style.color = '#991b1b';
                        badge.innerHTML = '❌ rejected';
                    }
                }

                // Re-render applicant details to show updated status
                const detailsContainer = document.getElementById('applicant-details-content');
                if (detailsContainer) {
                    detailsContainer.innerHTML = createApplicantDetailsHtml(app, window.currentJobApplicantsModal.job);
                }
            }
        }

        showNotification('❌ Applicant rejected', 'info');
        console.log(`✅ Application ${applicationId} marked as rejected`);
    } catch (error) {
        console.error('Failed to reject applicant:', error);
        showNotification(`❌ Failed to reject: ${error.message}`, 'error');
    }
}

/**
 * Close job applicants modal
 */
function closeJobApplicantsModal() {
    const modal = document.getElementById('job-applicants-modal');
    if (modal) {
        modal.remove();
    }
    document.body.style.overflow = 'auto';
    window.currentJobApplicantsModal = null;
}

/**
 * Edit a job - Load job data into the create modal for editing
 */
async function editJob(jobId) {
    console.log(`✏️ Editing job ${jobId}...`);

    try {
        // Fetch job details from API
        const job = await apiCall(`/api/jobs/posts/${jobId}`);

        // Store the editing job ID
        window.editingJobId = jobId;

        // Populate the form with job data
        document.getElementById('modal-job-title').value = job.title || '';
        document.getElementById('modal-job-type').value = job.job_type || '';
        document.getElementById('modal-job-location-type').value = job.location_type || '';
        document.getElementById('modal-job-location').value = job.location || '';
        document.getElementById('modal-job-description').value = job.description || '';
        document.getElementById('modal-job-requirements').value = job.requirements || '';
        document.getElementById('modal-salary-min').value = job.salary_min || '';
        document.getElementById('modal-salary-max').value = job.salary_max || '';
        document.getElementById('modal-salary-visibility').value = job.salary_visibility || 'public';

        // Format deadline date for input
        if (job.application_deadline) {
            const deadline = new Date(job.application_deadline);
            document.getElementById('modal-job-deadline').value = deadline.toISOString().split('T')[0];
        }

        // Handle skills array
        if (job.skills && Array.isArray(job.skills)) {
            document.getElementById('modal-job-skills').value = job.skills.join(', ');
        }

        // Update modal title to show we're editing
        const modalTitle = document.querySelector('#create-job-modal .modal-header h2');
        if (modalTitle) {
            modalTitle.innerHTML = '<span>✏️</span> Edit Job Listing';
        }

        // Update the Post button to say "Update"
        const postBtn = document.querySelector('#create-job-modal .modal-footer button:last-child');
        if (postBtn) {
            postBtn.innerHTML = '💾 Update Job';
            postBtn.onclick = () => updateJob(jobId);
        }

        // Open the modal
        openCreateJobModal();

        console.log(`✅ Job ${jobId} loaded for editing`);
    } catch (error) {
        console.error('Failed to load job for editing:', error);
        showNotification(`❌ Failed to load job: ${error.message}`, 'error');
    }
}

/**
 * Update an existing job
 */
async function updateJob(jobId) {
    console.log(`💾 Updating job ${jobId}...`);

    const formData = collectJobFormData();
    if (!formData) return;

    try {
        const jobData = {
            title: formData.title,
            description: formData.description,
            requirements: formData.requirements,
            job_type: formData.type,
            location_type: formData.locationType,
            location: formData.location,
            salary_min: formData.salary.min,
            salary_max: formData.salary.max,
            salary_visibility: formData.salary.visibility,
            application_deadline: formData.deadline,
            skills: formData.skills
        };

        await apiCall(`/api/jobs/posts/${jobId}`, 'PUT', jobData);

        showNotification('✅ Job updated successfully!', 'success');
        closeCreateJobModal();
        resetModalToCreateMode();

        // Reload the current view
        await loadActiveJobs();
        await updateActiveJobsCount();

        console.log(`✅ Job ${jobId} updated`);
    } catch (error) {
        console.error('Failed to update job:', error);
        showNotification(`❌ Failed to update job: ${error.message}`, 'error');
    }
}

/**
 * Reset modal back to create mode
 */
function resetModalToCreateMode() {
    window.editingJobId = null;

    const modalTitle = document.querySelector('#create-job-modal .modal-header h2');
    if (modalTitle) {
        modalTitle.innerHTML = '<span>✏️</span> Create New Job Listing';
    }

    const postBtn = document.querySelector('#create-job-modal .modal-footer button:last-child');
    if (postBtn) {
        postBtn.innerHTML = '🚀 Post Job Now';
        postBtn.onclick = postJobNow;
    }

    clearJobForm();
}

/**
 * View job details in a modal
 */
async function viewJobDetails(jobId) {
    console.log(`👁️ Viewing job details for ${jobId}...`);

    try {
        // Fetch job details
        const job = await apiCall(`/api/jobs/posts/${jobId}`);

        // Calculate salary display
        let salaryDisplay = 'Negotiable';
        if (job.salary_visibility === 'public') {
            if (job.salary_min && job.salary_max) {
                salaryDisplay = `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} ETB`;
            } else if (job.salary_min) {
                salaryDisplay = `From ${job.salary_min.toLocaleString()} ETB`;
            }
        }

        // Format dates
        const postedDate = job.published_at ? new Date(job.published_at).toLocaleDateString() : 'Not published';
        const deadline = job.application_deadline ? new Date(job.application_deadline).toLocaleDateString() : 'N/A';
        const createdDate = job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A';

        // Build skills HTML
        const skillsHtml = job.skills && job.skills.length > 0
            ? job.skills.map(skill => `<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">${skill}</span>`).join(' ')
            : '<span class="text-gray-500">No skills specified</span>';

        // Status badge
        const statusColors = {
            'active': 'bg-green-100 text-green-700',
            'draft': 'bg-yellow-100 text-yellow-700',
            'closed': 'bg-gray-200 text-gray-700',
            'paused': 'bg-orange-100 text-orange-700'
        };
        const statusClass = statusColors[job.status] || 'bg-gray-100 text-gray-700';

        // Create modal HTML
        const modalHtml = `
            <div id="job-details-modal" class="job-modal-overlay" style="display: flex !important; opacity: 1 !important; visibility: visible !important; z-index: 10000; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); align-items: center; justify-content: center;">
                <div class="modal-container" style="max-width: 700px; max-height: 85vh; overflow-y: auto; background: var(--card-bg); border-radius: 12px; position: relative; margin: 1rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                    <div class="modal-header" style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 class="text-2xl font-bold">${job.title}</h2>
                            <p class="text-gray-600 text-sm mt-1">${job.job_type || 'Full-time'} • ${job.location_type || 'On-site'} • ${job.location || 'Location not specified'}</p>
                        </div>
                        <button onclick="closeJobDetailsModal()" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="modal-body" style="padding: 1.5rem;">
                        <!-- Status & Stats -->
                        <div class="flex flex-wrap gap-4 mb-6">
                            <span class="px-3 py-1 ${statusClass} rounded-full text-sm font-semibold capitalize">${job.status}</span>
                            <span class="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">👁️ ${job.views || 0} views</span>
                            <span class="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">📄 ${job.applications_count || 0} applications</span>
                        </div>

                        <!-- Salary -->
                        <div class="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                            <h4 class="font-semibold text-green-800 mb-1">💰 Salary Range</h4>
                            <p class="text-2xl font-bold text-green-700">${salaryDisplay}</p>
                        </div>

                        <!-- Description -->
                        <div class="mb-6">
                            <h4 class="font-semibold mb-2">📝 Job Description</h4>
                            <div class="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">${job.description || 'No description provided'}</div>
                        </div>

                        <!-- Requirements -->
                        <div class="mb-6">
                            <h4 class="font-semibold mb-2">✅ Requirements</h4>
                            <div class="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">${job.requirements || 'No requirements specified'}</div>
                        </div>

                        <!-- Skills -->
                        <div class="mb-6">
                            <h4 class="font-semibold mb-2">🔧 Required Skills</h4>
                            <div class="flex flex-wrap gap-2">${skillsHtml}</div>
                        </div>

                        <!-- Dates -->
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                                <p class="text-xs text-gray-500">Created</p>
                                <p class="font-semibold">${createdDate}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Published</p>
                                <p class="font-semibold">${postedDate}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Deadline</p>
                                <p class="font-semibold text-red-600">${deadline}</p>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer" style="padding: 1.5rem; border-top: 1px solid var(--border-color); display: flex; gap: 0.75rem; justify-content: flex-end;">
                        <button onclick="closeJobDetailsModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                            Close
                        </button>
                        <button onclick="closeJobDetailsModal(); viewJobApplications(${job.id})" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                            👥 View Applications
                        </button>
                        <button onclick="closeJobDetailsModal(); editJob(${job.id})" class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                            ✏️ Edit Job
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('job-details-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        console.log(`✅ Job details modal opened for job ${jobId}`);
    } catch (error) {
        console.error('Failed to load job details:', error);
        showNotification(`❌ Failed to load job details: ${error.message}`, 'error');
    }
}

/**
 * Close job details modal
 */
function closeJobDetailsModal() {
    const modal = document.getElementById('job-details-modal');
    if (modal) {
        modal.remove();
    }
    document.body.style.overflow = 'auto';
}

/**
 * Close a job
 */
async function closeJob(jobId) {
    if (!confirm('Are you sure you want to close this job posting?')) {
        return;
    }

    try {
        await apiCall(`/api/jobs/posts/${jobId}/status`, 'PUT', { status: 'closed' });
        showNotification('✅ Job closed successfully!', 'success');

        // Reload active jobs and update counts
        await loadActiveJobs();
        await updateClosedJobsCount();
    } catch (error) {
        console.error('Failed to close job:', error);
        showNotification(`❌ Failed to close job: ${error.message}`, 'error');
    }
}

/**
 * Load closed jobs from API and display them
 */
async function loadClosedJobs() {
    console.log('📋 Loading closed jobs from API...');

    const grid = document.getElementById('closed-jobs-grid');
    if (!grid) return;

    try {
        // Call API to get closed jobs
        const result = await apiCall('/api/jobs/posts?status=closed&page=1&limit=50');
        const jobs = result.jobs || [];

        // Clear grid
        grid.innerHTML = '';

        if (jobs.length === 0) {
            // Show empty state
            grid.innerHTML = `
                <div class="col-span-2 text-center py-12">
                    <div class="text-6xl mb-4">📁</div>
                    <h3 class="text-xl font-bold mb-2">No Closed Jobs</h3>
                    <p class="text-gray-600 mb-6">Jobs you close or that expire will appear here</p>
                </div>
            `;
            return;
        }

        // Display closed job cards
        jobs.forEach(job => {
            const card = createClosedJobCard(job);
            grid.insertAdjacentHTML('beforeend', card);
        });

        console.log(`✅ Loaded ${jobs.length} closed jobs from API`);
    } catch (error) {
        console.error('Failed to load closed jobs:', error);
        grid.innerHTML = `
            <div class="col-span-2 text-center py-12">
                <div class="text-6xl mb-4">❌</div>
                <h3 class="text-xl font-bold mb-2 text-red-600">Failed to Load Closed Jobs</h3>
                <p class="text-gray-600 mb-6">${error.message}</p>
                <button onclick="loadClosedJobs()" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-lg font-semibold">
                    🔄 Retry
                </button>
            </div>
        `;
    }
}

/**
 * Create HTML for a closed job card
 */
function createClosedJobCard(job) {
    const closedDate = job.closed_at ? new Date(job.closed_at).toLocaleDateString() : 'N/A';
    const title = job.title || 'Untitled Job';
    const jobType = job.job_type || 'Full-time';
    const locationType = job.location_type || 'On-site';
    const location = job.location || 'Location not specified';
    const views = job.views || 0;
    const applications = job.applications_count || 0;
    const status = job.status === 'filled' ? 'Filled' : 'Closed';
    const statusClass = job.status === 'filled' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700';

    return `
        <div class="card p-6 opacity-75 hover:opacity-100 transition-all">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-xl font-bold mb-2">${title}</h3>
                    <p class="text-gray-600 text-sm">${jobType} • ${locationType} • ${location}</p>
                </div>
                <span class="px-3 py-1 ${statusClass} rounded-full text-xs font-semibold">${status}</span>
            </div>

            <div class="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div class="text-center">
                    <p class="text-2xl font-bold text-gray-600">${views}</p>
                    <p class="text-xs text-gray-600">Total Views</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-gray-600">${applications}</p>
                    <p class="text-xs text-gray-600">Applications</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-green-600">-</p>
                    <p class="text-xs text-gray-600">Hired</p>
                </div>
            </div>

            <p class="text-sm text-gray-600 mb-4">Closed ${closedDate}</p>

            <div class="flex gap-2">
                <button onclick="repostJob(${job.id})" class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold">
                    🔄 Repost Job
                </button>
                <button onclick="viewJobAnalytics(${job.id})" class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                    📊 View Analytics
                </button>
            </div>
        </div>
    `;
}

/**
 * Repost a closed job
 */
async function repostJob(jobId) {
    console.log(`🔄 Reposting job ${jobId}...`);

    try {
        await apiCall(`/api/jobs/posts/${jobId}/status`, 'PUT', { status: 'active' });
        showNotification('✅ Job reposted successfully!', 'success');

        // Reload both tabs and update counts
        await loadClosedJobs();
        await loadActiveJobs();
        await updateClosedJobsCount();

        // Switch to active jobs tab
        switchJobTab('active-jobs');
    } catch (error) {
        console.error('Failed to repost job:', error);
        showNotification(`❌ Failed to repost job: ${error.message}`, 'error');
    }
}

/**
 * View job analytics
 */
function viewJobAnalytics(jobId) {
    console.log(`📊 Viewing analytics for job ${jobId}...`);
    switchJobTab('analytics');
    showNotification('📊 Analytics loaded', 'info');
}

/**
 * Update closed jobs count badge
 */
async function updateClosedJobsCount() {
    try {
        const result = await apiCall('/api/jobs/posts?status=closed&page=1&limit=1');
        const count = result.total || 0;

        const countElement = document.getElementById('closed-jobs-count');
        if (countElement) {
            countElement.textContent = count;
        }
    } catch (error) {
        console.error('Failed to update closed jobs count:', error);
    }
}

/**
 * Load applications from API and display them
 */
async function loadApplications() {
    console.log('📋 Loading applications from API...');

    const tbody = document.getElementById('applications-tbody');
    if (!tbody) return;

    try {
        // Call API to get applications
        const result = await apiCall('/api/jobs/applications?page=1&limit=50');
        const applications = result.applications || [];

        // Clear tbody
        tbody.innerHTML = '';

        if (applications.length === 0) {
            // Show empty state
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-12 text-center">
                        <div class="text-6xl mb-4">📄</div>
                        <h3 class="text-xl font-bold mb-2">No Applications Yet</h3>
                        <p class="text-gray-600">Applications for your job posts will appear here</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Display application rows
        applications.forEach(app => {
            const row = createApplicationRow(app);
            tbody.insertAdjacentHTML('beforeend', row);
        });

        // Also populate job filter dropdown
        await populateJobFilter();

        console.log(`✅ Loaded ${applications.length} applications from API`);
    } catch (error) {
        console.error('Failed to load applications:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center">
                    <div class="text-6xl mb-4">❌</div>
                    <h3 class="text-xl font-bold mb-2 text-red-600">Failed to Load Applications</h3>
                    <p class="text-gray-600 mb-6">${error.message}</p>
                    <button onclick="loadApplications()" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-lg font-semibold">
                        🔄 Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * Create HTML for an application row
 */
function createApplicationRow(app) {
    const appliedDate = app.applied_at ? getRelativeTime(new Date(app.applied_at)) : 'N/A';
    const initials = getInitials(app.applicant_name || 'Unknown');
    const statusColors = {
        'new': 'bg-yellow-100 text-yellow-700',
        'reviewing': 'bg-blue-100 text-blue-700',
        'shortlisted': 'bg-purple-100 text-purple-700',
        'interviewed': 'bg-indigo-100 text-indigo-700',
        'offered': 'bg-green-100 text-green-700',
        'hired': 'bg-green-200 text-green-800',
        'rejected': 'bg-red-100 text-red-700'
    };
    const statusClass = statusColors[app.status] || 'bg-gray-100 text-gray-700';

    return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        ${initials}
                    </div>
                    <div>
                        <p class="font-semibold">${app.applicant_name || 'Unknown'}</p>
                        <p class="text-sm text-gray-600">${app.applicant_email || ''}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <p class="font-medium">${app.job_title || 'Unknown Job'}</p>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
                ${appliedDate}
            </td>
            <td class="px-6 py-4">
                <select onchange="updateApplicationStatus(${app.id}, this.value)" class="px-3 py-1 rounded-full text-xs font-semibold border-0 ${statusClass}">
                    <option value="new" ${app.status === 'new' ? 'selected' : ''}>🟡 New</option>
                    <option value="reviewing" ${app.status === 'reviewing' ? 'selected' : ''}>👀 Reviewing</option>
                    <option value="shortlisted" ${app.status === 'shortlisted' ? 'selected' : ''}>⭐ Shortlisted</option>
                    <option value="interviewed" ${app.status === 'interviewed' ? 'selected' : ''}>🎤 Interviewed</option>
                    <option value="offered" ${app.status === 'offered' ? 'selected' : ''}>💼 Offered</option>
                    <option value="hired" ${app.status === 'hired' ? 'selected' : ''}>✅ Hired</option>
                    <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>❌ Rejected</option>
                </select>
            </td>
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    <button onclick="viewResume(${app.id})" class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                        View Resume
                    </button>
                    <button onclick="contactApplicant(${app.id})" class="px-3 py-1 border rounded text-sm hover:bg-gray-50">
                        Contact
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Get initials from a name
 */
function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

/**
 * Get relative time string
 */
function getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
}

/**
 * Update application status
 */
async function updateApplicationStatus(applicationId, newStatus) {
    try {
        await apiCall(`/api/jobs/applications/${applicationId}/status`, 'PUT', { status: newStatus });
        showNotification('✅ Status updated!', 'success');
        await updateApplicationsCount();
    } catch (error) {
        console.error('Failed to update status:', error);
        showNotification(`❌ Failed to update status: ${error.message}`, 'error');
    }
}

/**
 * View resume - Opens the job applicants modal with the specific application selected
 */
async function viewResume(applicationId) {
    console.log(`📄 Viewing resume for application ${applicationId}...`);

    try {
        // First, we need to find which job this application belongs to
        const result = await apiCall(`/api/jobs/applications?page=1&limit=100`);
        const application = result.applications?.find(app => app.id === applicationId);

        if (!application) {
            showNotification('❌ Application not found', 'error');
            return;
        }

        // Open the job applicants modal with this application preselected
        await openJobApplicantsModal(application.job_id, applicationId);
    } catch (error) {
        console.error('Failed to view resume:', error);
        showNotification(`❌ Failed to load application: ${error.message}`, 'error');
    }
}

/**
 * Contact applicant
 */
function contactApplicant(applicationId) {
    console.log(`💬 Contacting applicant ${applicationId}...`);
    showNotification('💬 Opening chat...', 'info');
    // Could integrate with chat modal here
}

/**
 * View application details in a modal
 */
async function viewApplication(applicationId) {
    console.log(`👁️ Viewing application ${applicationId}...`);

    try {
        // Fetch application details
        const result = await apiCall(`/api/jobs/applications?page=1&limit=100`);
        const application = result.applications?.find(app => app.id === applicationId);

        if (!application) {
            showNotification('❌ Application not found', 'error');
            return;
        }

        // Status badge colors
        const statusColors = {
            'new': 'bg-yellow-100 text-yellow-700',
            'reviewing': 'bg-blue-100 text-blue-700',
            'shortlisted': 'bg-purple-100 text-purple-700',
            'interviewed': 'bg-indigo-100 text-indigo-700',
            'offered': 'bg-green-100 text-green-700',
            'hired': 'bg-green-200 text-green-800',
            'rejected': 'bg-red-100 text-red-700'
        };
        const statusClass = statusColors[application.status] || 'bg-gray-100 text-gray-700';

        // Format dates
        const appliedDate = application.applied_at ? new Date(application.applied_at).toLocaleDateString() : 'N/A';
        const reviewedDate = application.reviewed_at ? new Date(application.reviewed_at).toLocaleDateString() : 'Not yet reviewed';

        // Create modal HTML
        const modalHtml = `
            <div id="application-details-modal" class="job-modal-overlay" style="display: flex !important; opacity: 1 !important; visibility: visible !important; z-index: 10000; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); align-items: center; justify-content: center;">
                <div class="modal-container" style="max-width: 600px; max-height: 85vh; overflow-y: auto; background: var(--card-bg); border-radius: 12px; position: relative; margin: 1rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                    <div class="modal-header" style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <div class="flex items-center gap-4">
                            <div class="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                ${getInitials(application.applicant_name || 'Unknown')}
                            </div>
                            <div>
                                <h2 class="text-xl font-bold">${application.applicant_name || 'Unknown Applicant'}</h2>
                                <p class="text-gray-600 text-sm">${application.applicant_email || ''}</p>
                                <p class="text-gray-500 text-sm">${application.applicant_phone || 'No phone provided'}</p>
                            </div>
                        </div>
                        <button onclick="closeApplicationDetailsModal()" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="modal-body" style="padding: 1.5rem;">
                        <!-- Job Applied For -->
                        <div class="mb-4 p-3 bg-blue-50 rounded-lg">
                            <p class="text-xs text-blue-600 font-semibold">Applied for:</p>
                            <p class="text-lg font-bold text-blue-800">${application.job_title || 'Unknown Job'}</p>
                        </div>

                        <!-- Status & Dates -->
                        <div class="flex flex-wrap gap-4 mb-6">
                            <span class="px-3 py-1 ${statusClass} rounded-full text-sm font-semibold capitalize">${application.status}</span>
                            <span class="text-sm text-gray-600">📅 Applied: ${appliedDate}</span>
                            ${application.rating ? `<span class="text-sm text-yellow-600">⭐ Rating: ${application.rating}/5</span>` : ''}
                        </div>

                        <!-- Cover Letter -->
                        <div class="mb-6">
                            <h4 class="font-semibold mb-2">📝 Cover Letter</h4>
                            <div class="text-gray-700 bg-gray-50 p-4 rounded-lg max-h-48 overflow-y-auto">
                                ${application.cover_letter || 'No cover letter provided'}
                            </div>
                        </div>

                        <!-- Resume -->
                        <div class="mb-6">
                            <h4 class="font-semibold mb-2">📄 Resume</h4>
                            ${application.resume_url
                                ? `<a href="${application.resume_url}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                                    📄 View Resume PDF
                                   </a>`
                                : '<p class="text-gray-500 italic">No resume uploaded</p>'
                            }
                        </div>

                        <!-- Expected Salary -->
                        ${application.expected_salary ? `
                        <div class="mb-6 p-4 bg-green-50 rounded-lg">
                            <h4 class="font-semibold text-green-800 mb-1">💰 Expected Salary</h4>
                            <p class="text-2xl font-bold text-green-700">${application.expected_salary.toLocaleString()} ETB</p>
                        </div>
                        ` : ''}

                        <!-- Status Update -->
                        <div class="p-4 bg-gray-50 rounded-lg">
                            <h4 class="font-semibold mb-2">📊 Update Status</h4>
                            <select onchange="updateApplicationStatus(${application.id}, this.value); closeApplicationDetailsModal();" class="w-full p-3 border rounded-lg">
                                <option value="new" ${application.status === 'new' ? 'selected' : ''}>🟡 New</option>
                                <option value="reviewing" ${application.status === 'reviewing' ? 'selected' : ''}>👀 Reviewing</option>
                                <option value="shortlisted" ${application.status === 'shortlisted' ? 'selected' : ''}>⭐ Shortlisted</option>
                                <option value="interviewed" ${application.status === 'interviewed' ? 'selected' : ''}>🎤 Interviewed</option>
                                <option value="offered" ${application.status === 'offered' ? 'selected' : ''}>💼 Offered</option>
                                <option value="hired" ${application.status === 'hired' ? 'selected' : ''}>✅ Hired</option>
                                <option value="rejected" ${application.status === 'rejected' ? 'selected' : ''}>❌ Rejected</option>
                            </select>
                        </div>
                    </div>

                    <div class="modal-footer" style="padding: 1.5rem; border-top: 1px solid var(--border-color); display: flex; gap: 0.75rem; justify-content: flex-end;">
                        <button onclick="closeApplicationDetailsModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                            Close
                        </button>
                        <button onclick="contactApplicant(${application.id})" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                            💬 Contact Applicant
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('application-details-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        console.log(`✅ Application details modal opened for application ${applicationId}`);
    } catch (error) {
        console.error('Failed to load application details:', error);
        showNotification(`❌ Failed to load application: ${error.message}`, 'error');
    }
}

/**
 * Close application details modal
 */
function closeApplicationDetailsModal() {
    const modal = document.getElementById('application-details-modal');
    if (modal) {
        modal.remove();
    }
    document.body.style.overflow = 'auto';
}

/**
 * Populate job filter dropdown with active jobs
 */
async function populateJobFilter() {
    const filter = document.getElementById('applications-job-filter');
    if (!filter) return;

    try {
        const result = await apiCall('/api/jobs/posts?status=active&page=1&limit=100');
        const jobs = result.jobs || [];

        // Keep the "All Jobs" option
        filter.innerHTML = '<option value="">All Jobs</option>';

        jobs.forEach(job => {
            const option = document.createElement('option');
            option.value = job.id;
            option.textContent = job.title;
            filter.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to populate job filter:', error);
    }
}

/**
 * Update applications count badge
 */
async function updateApplicationsCount() {
    try {
        const result = await apiCall('/api/jobs/applications?page=1&limit=1');
        const count = result.total || 0;

        const countElement = document.getElementById('applications-count');
        if (countElement) {
            countElement.textContent = count;
        }
    } catch (error) {
        console.error('Failed to update applications count:', error);
    }
}

/**
 * Load job analytics from API
 */
async function loadJobAnalytics() {
    console.log('📊 Loading job analytics from API...');

    try {
        const analytics = await apiCall('/api/jobs/analytics/overview');

        // Update analytics cards
        document.getElementById('analytics-total-posts').textContent = analytics.total_posts || 0;
        document.getElementById('analytics-total-applications').textContent = analytics.total_applications || 0;
        document.getElementById('analytics-total-hires').textContent = analytics.total_hires || 0;
        document.getElementById('analytics-avg-days').textContent = analytics.avg_days_to_hire?.toFixed(0) || 0;
        document.getElementById('analytics-total-views').textContent = (analytics.total_views || 0).toLocaleString();
        document.getElementById('analytics-conversion-rate').textContent = `${(analytics.conversion_rate || 0).toFixed(1)}%`;

        console.log('✅ Analytics loaded:', analytics);
    } catch (error) {
        console.error('Failed to load analytics:', error);
        // Set all to 0 on error
        document.getElementById('analytics-total-posts').textContent = '0';
        document.getElementById('analytics-total-applications').textContent = '0';
        document.getElementById('analytics-total-hires').textContent = '0';
        document.getElementById('analytics-avg-days').textContent = '0';
        document.getElementById('analytics-total-views').textContent = '0';
        document.getElementById('analytics-conversion-rate').textContent = '0%';
    }
}

/**
 * Load analytics from API
 */
async function loadAnalytics() {
    console.log('📊 Loading analytics from API...');

    try {
        const analytics = await apiCall('/api/jobs/analytics/overview');

        // Update analytics cards
        updateAnalyticsCard('total-posts', analytics.total_posts || 0);
        updateAnalyticsCard('total-applications', analytics.total_applications || 0);
        updateAnalyticsCard('total-hires', analytics.total_hires || 0);
        updateAnalyticsCard('avg-days-to-hire', analytics.avg_days_to_hire?.toFixed(1) || '0.0');
        updateAnalyticsCard('total-views', analytics.total_views || 0);
        updateAnalyticsCard('conversion-rate', `${analytics.conversion_rate?.toFixed(2) || '0.00'}%`);

        console.log('✅ Analytics loaded:', analytics);
    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
}

/**
 * Update an analytics card value
 */
function updateAnalyticsCard(cardId, value) {
    // Find the card by ID or data attribute
    const card = document.querySelector(`[data-metric="${cardId}"]`);
    if (card) {
        const valueElement = card.querySelector('.text-3xl, .text-4xl');
        if (valueElement) {
            valueElement.textContent = value;
        }
    }
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        'bg-blue-500'
    } text-white font-semibold`;
    notification.textContent = message;
    notification.style.animation = 'slideInRight 0.3s ease-out';

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Initialize job board manager
 */
async function initJobBoardManager() {
    console.log('💼 Initializing Job Board Manager...');

    // Load initial data and counts
    await Promise.all([
        updateDraftsCount(),
        loadDrafts(),
        updateActiveJobsCount(),
        updateClosedJobsCount(),
        updateApplicationsCount()
    ]);

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCreateJobModal();
        }
    });

    // Close modal when clicking outside
    const modal = document.getElementById('create-job-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCreateJobModal();
            }
        });
    }

    console.log('✅ Job Board Manager initialized with API integration');
}

/**
 * Update active jobs count badge
 */
async function updateActiveJobsCount() {
    try {
        const result = await apiCall('/api/jobs/posts?status=active&page=1&limit=1');
        const count = result.total || 0;
        const countElement = document.getElementById('active-jobs-count');
        if (countElement) {
            countElement.textContent = count;
        }
    } catch (error) {
        console.error('Failed to load active jobs count:', error);
    }
}

// Export functions to window for onclick handlers
window.openCreateJobModal = openCreateJobModal;
window.closeCreateJobModal = closeCreateJobModal;
window.saveJobDraft = saveJobDraft;
window.postJobNow = postJobNow;
window.loadActiveJobs = loadActiveJobs;
window.loadDrafts = loadDrafts;
window.loadAnalytics = loadAnalytics;
window.editDraft = editDraft;
window.deleteDraft = deleteDraft;
window.viewJobApplications = viewJobApplications;
window.editJob = editJob;
window.updateJob = updateJob;
window.resetModalToCreateMode = resetModalToCreateMode;
window.viewJobDetails = viewJobDetails;
window.closeJobDetailsModal = closeJobDetailsModal;
window.closeJob = closeJob;
window.loadClosedJobs = loadClosedJobs;
window.repostJob = repostJob;
window.viewJobAnalytics = viewJobAnalytics;
window.loadApplications = loadApplications;
window.updateApplicationStatus = updateApplicationStatus;
window.viewResume = viewResume;
window.contactApplicant = contactApplicant;
window.viewApplication = viewApplication;
window.closeApplicationDetailsModal = closeApplicationDetailsModal;
window.loadJobAnalytics = loadJobAnalytics;
window.openJobApplicantsModal = openJobApplicantsModal;
window.closeJobApplicantsModal = closeJobApplicantsModal;
window.selectApplicant = selectApplicant;
window.filterApplicantsList = filterApplicantsList;
window.filterApplicantsByStatus = filterApplicantsByStatus;
window.updateApplicantStatusFromModal = updateApplicantStatusFromModal;
window.contactApplicantFromModal = contactApplicantFromModal;
window.scheduleInterviewFromModal = scheduleInterviewFromModal;
window.rejectApplicantFromModal = rejectApplicantFromModal;
window.toggleApplicantsList = toggleApplicantsList;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJobBoardManager);
} else {
    initJobBoardManager();
}

console.log('✅ Job Board Manager module loaded with API integration');
