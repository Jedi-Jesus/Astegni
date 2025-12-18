/**
 * ═══════════════════════════════════════════════════════════
 * COURSE REQUEST MANAGER
 * Handles the course request modal functionality
 * ═══════════════════════════════════════════════════════════
 */

// Use existing API_BASE_URL if available, otherwise define it
const COURSE_REQUEST_API_URL = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : (window.API_BASE_URL || 'http://localhost:8000');

// State for course request
let courseRequestLanguages = [];
let courseRequestLessonTitles = [];
let courseRequestTags = [];

/**
 * Open the course request modal
 */
window.openCourseRequestModal = async function() {
    let modal = document.getElementById('course-request-modal');

    // If modal not in DOM, try to load it via ModalLoader
    if (!modal) {
        // Try using ModalLoader if available
        if (typeof ModalLoader !== 'undefined' && ModalLoader.load) {
            try {
                await ModalLoader.load('course-request-modal');
                modal = document.getElementById('course-request-modal');
            } catch (e) {
                console.error('[CourseRequestManager] Failed to load modal via ModalLoader:', e);
            }
        }

        // If still not found, fetch directly
        if (!modal) {
            try {
                const response = await fetch('../modals/common-modals/course-request-modal.html');
                if (response.ok) {
                    const html = await response.text();
                    const container = document.getElementById('modal-container') || document.body;
                    container.insertAdjacentHTML('beforeend', html);
                    modal = document.getElementById('course-request-modal');
                }
            } catch (e) {
                console.error('[CourseRequestManager] Failed to fetch modal:', e);
            }
        }
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        document.body.style.overflow = 'hidden';

        // Reset form
        resetCourseRequestForm();
    } else {
        console.error('[CourseRequestManager] Course request modal not found');
        alert('Failed to load course request modal. Please refresh the page and try again.');
    }
};

/**
 * Close the course request modal
 */
window.closeCourseRequestModal = function() {
    const modal = document.getElementById('course-request-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        document.body.style.overflow = '';
    }
};

/**
 * Reset the course request form
 */
function resetCourseRequestForm() {
    // Reset form fields
    const form = document.getElementById('courseRequestForm');
    if (form) form.reset();

    // Reset thumbnail
    const thumbnailPreview = document.getElementById('courseRequestThumbnailPreview');
    if (thumbnailPreview) {
        thumbnailPreview.innerHTML = `
            <i class="fas fa-cloud-upload-alt" style="font-size: 2.5rem; color: #9ca3af; margin-bottom: 0.5rem;"></i>
            <p style="margin: 0; color: #6b7280; font-weight: 500;">Click to upload thumbnail</p>
            <span style="font-size: 0.8rem; color: #9ca3af;">PNG, JPG, GIF up to 5MB</span>
        `;
    }
    const thumbnailInput = document.getElementById('courseRequestThumbnail');
    if (thumbnailInput) thumbnailInput.value = '';

    // Reset custom category
    const customCategoryInput = document.getElementById('courseRequestCustomCategory');
    if (customCategoryInput) {
        customCategoryInput.style.display = 'none';
        customCategoryInput.value = '';
    }

    // Reset languages
    courseRequestLanguages = [];
    const languageTagsContainer = document.getElementById('courseRequestLanguageTagsContainer');
    if (languageTagsContainer) languageTagsContainer.innerHTML = '';

    // Reset tags
    courseRequestTags = [];
    const tagsContainer = document.getElementById('courseRequestTagsContainer');
    if (tagsContainer) tagsContainer.innerHTML = '';

    // Reset lesson titles
    courseRequestLessonTitles = [];
    const lessonTitlesContainer = document.getElementById('courseRequestLessonTitlesContainer');
    if (lessonTitlesContainer) {
        lessonTitlesContainer.innerHTML = '<p style="margin: 0; color: #6b7280; font-size: 0.9rem;">Enter number of lessons above to add lesson titles</p>';
    }
}

/**
 * Trigger thumbnail file input
 */
window.triggerCourseRequestThumbnailUpload = function() {
    const input = document.getElementById('courseRequestThumbnailInput');
    if (input) input.click();
};

/**
 * Handle thumbnail upload
 */
window.handleCourseRequestThumbnailUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('courseRequestThumbnailPreview');
        if (preview) {
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 150px; border-radius: 8px; object-fit: cover;">`;
        }
        const hiddenInput = document.getElementById('courseRequestThumbnail');
        if (hiddenInput) hiddenInput.value = e.target.result;
    };
    reader.readAsDataURL(file);
};

/**
 * Toggle custom category input
 */
window.toggleCourseRequestCustomCategory = function() {
    const select = document.getElementById('courseRequestCategory');
    const customInput = document.getElementById('courseRequestCustomCategory');

    if (select && customInput) {
        if (select.value === 'Other') {
            customInput.style.display = 'block';
            customInput.required = true;
        } else {
            customInput.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }
};

/**
 * Handle language keypress (Enter to add)
 */
window.handleCourseRequestLanguageKeypress = function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addCourseRequestLanguageTag();
    }
};

/**
 * Add language tag from input
 */
window.addCourseRequestLanguageTag = function() {
    const input = document.getElementById('courseRequestLanguageInput');
    if (!input || !input.value.trim()) return;

    const language = input.value.trim();
    addCourseRequestLanguage(language);
    input.value = '';
};

/**
 * Add language from suggestion
 */
window.addCourseRequestLanguageSuggestion = function(language) {
    addCourseRequestLanguage(language);
};

/**
 * Add language to the list
 */
function addCourseRequestLanguage(language) {
    if (courseRequestLanguages.includes(language)) {
        return; // Already added
    }

    courseRequestLanguages.push(language);
    renderCourseRequestLanguageTags();
}

/**
 * Remove language from the list
 */
window.removeCourseRequestLanguage = function(language) {
    courseRequestLanguages = courseRequestLanguages.filter(l => l !== language);
    renderCourseRequestLanguageTags();
};

/**
 * Render language tags
 */
function renderCourseRequestLanguageTags() {
    const container = document.getElementById('courseRequestLanguageTagsContainer');
    if (!container) return;

    container.innerHTML = courseRequestLanguages.map(lang => `
        <span style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.75rem; background: #3b82f6; color: white; border-radius: 20px; font-size: 0.875rem; font-weight: 500;">
            ${lang}
            <button type="button" onclick="removeCourseRequestLanguage('${lang}')" style="background: none; border: none; color: white; cursor: pointer; padding: 0; display: flex; align-items: center;">
                <i class="fas fa-times" style="font-size: 0.75rem;"></i>
            </button>
        </span>
    `).join('');
}

/**
 * Handle tag keypress (Enter to add)
 */
window.handleCourseRequestTagKeypress = function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addCourseRequestTag();
    }
};

/**
 * Add tag from input
 */
window.addCourseRequestTag = function() {
    const input = document.getElementById('courseRequestTagInput');
    if (!input || !input.value.trim()) return;

    const tag = input.value.trim().toLowerCase();
    addCourseRequestTagToList(tag);
    input.value = '';
};

/**
 * Add tag from suggestion
 */
window.addCourseRequestTagSuggestion = function(tag) {
    addCourseRequestTagToList(tag);
};

/**
 * Add tag to the list
 */
function addCourseRequestTagToList(tag) {
    if (courseRequestTags.includes(tag)) {
        return; // Already added
    }

    courseRequestTags.push(tag);
    renderCourseRequestTags();
}

/**
 * Remove tag from the list
 */
window.removeCourseRequestTag = function(tag) {
    courseRequestTags = courseRequestTags.filter(t => t !== tag);
    renderCourseRequestTags();
};

/**
 * Render tags
 */
function renderCourseRequestTags() {
    const container = document.getElementById('courseRequestTagsContainer');
    if (!container) return;

    container.innerHTML = courseRequestTags.map(tag => `
        <span style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.75rem; background: #10b981; color: white; border-radius: 20px; font-size: 0.875rem; font-weight: 500;">
            ${tag}
            <button type="button" onclick="removeCourseRequestTag('${tag}')" style="background: none; border: none; color: white; cursor: pointer; padding: 0; display: flex; align-items: center;">
                <i class="fas fa-times" style="font-size: 0.75rem;"></i>
            </button>
        </span>
    `).join('');
}

/**
 * Update lesson title inputs based on number of lessons
 */
window.updateCourseRequestLessonTitles = function() {
    const numLessons = parseInt(document.getElementById('courseRequestLessons')?.value) || 0;
    const container = document.getElementById('courseRequestLessonTitlesContainer');

    if (!container) return;

    if (numLessons <= 0) {
        container.innerHTML = '<p style="margin: 0; color: #6b7280; font-size: 0.9rem;">Enter number of lessons above to add lesson titles</p>';
        courseRequestLessonTitles = [];
        return;
    }

    // Preserve existing titles
    const existingTitles = [...courseRequestLessonTitles];
    courseRequestLessonTitles = [];

    let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
    for (let i = 1; i <= numLessons; i++) {
        const existingTitle = existingTitles[i - 1] || '';
        courseRequestLessonTitles.push(existingTitle);
        html += `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="width: 30px; height: 30px; background: #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: #374151; flex-shrink: 0;">${i}</span>
                <input type="text"
                       placeholder="Lesson ${i} title"
                       value="${existingTitle}"
                       onchange="courseRequestLessonTitles[${i - 1}] = this.value"
                       style="flex: 1; padding: 0.5rem 0.75rem; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; font-size: 0.9rem;">
            </div>
        `;
    }
    html += '</div>';

    container.innerHTML = html;
};

/**
 * Submit course request
 */
window.submitCourseRequest = async function() {
    const name = document.getElementById('courseRequestName')?.value?.trim();
    let category = document.getElementById('courseRequestCategory')?.value;
    const customCategory = document.getElementById('courseRequestCustomCategory')?.value?.trim();
    const level = document.getElementById('courseRequestLevel')?.value;
    const duration = document.getElementById('courseRequestDuration')?.value;
    const lessons = document.getElementById('courseRequestLessons')?.value;
    const description = document.getElementById('courseRequestDescription')?.value?.trim();
    const thumbnail = document.getElementById('courseRequestThumbnail')?.value;

    // Use custom category if "Other" selected
    if (category === 'Other' && customCategory) {
        category = customCategory;
    }

    // Validate required fields
    if (!name) {
        alert('Please enter a course name');
        return;
    }
    if (!category) {
        alert('Please select a category');
        return;
    }
    if (!level) {
        alert('Please select a grade level');
        return;
    }

    // Collect lesson titles from the form
    const lessonInputs = document.querySelectorAll('#courseRequestLessonTitlesContainer input[type="text"]');
    const lessonTitles = Array.from(lessonInputs).map(input => input.value.trim()).filter(t => t);

    // Map to backend expected field names (PackageCourseRequest model)
    const courseData = {
        course_name: name,
        course_category: category,
        course_level: level,
        duration: duration ? parseInt(duration) : 0,
        lessons: lessons ? parseInt(lessons) : 0,
        course_description: description || null,
        language: courseRequestLanguages.length > 0 ? courseRequestLanguages : ["English"],
        tags: courseRequestTags.length > 0 ? courseRequestTags : [],
        lesson_title: lessonTitles,
        thumbnail: thumbnail || null
    };

    // Show loading state
    const submitBtn = document.getElementById('submitCourseRequestBtn');
    const originalContent = submitBtn?.innerHTML;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            alert('You must be logged in to submit a course request.');
            return;
        }
        const response = await fetch(`${COURSE_REQUEST_API_URL}/api/tutor/packages/course-request`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(courseData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Course request submitted:', result);

            // Show success message
            alert('Course request submitted successfully! It will be reviewed by an admin.');

            // Close modal
            closeCourseRequestModal();

            // Refresh requests panel if function exists
            if (typeof loadTutorRequests === 'function') {
                loadTutorRequests();
            }
        } else {
            const error = await response.text();
            console.error('Failed to submit course request:', error);
            alert('Failed to submit course request. Please try again.');
        }
    } catch (error) {
        console.error('Error submitting course request:', error);
        alert('Error submitting course request. Please try again.');
    } finally {
        // Restore button state
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalContent;
        }
    }
};

// Close modal on ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('course-request-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeCourseRequestModal();
        }
    }
});
