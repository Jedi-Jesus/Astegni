// System Media Manager
// Handles system media upload, display, and separate image/video galleries with category sidebar

// API Configuration
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'https://api.astegni.com';
}

// State
let systemMedia = {
    images: [],
    videos: []
};
let currentMediaType = 'image'; // 'image' or 'video'
let currentViewingMedia = null; // Currently viewing media item
let activeImageCategory = 'all';
let activeVideoCategory = 'all';

// Category definitions
const imageCategories = [
    { id: 'all', label: 'All Images', icon: 'fa-images' },
    { id: 'logo', label: 'Logos', icon: 'fa-tag' },
    { id: 'favicon', label: 'Favicons', icon: 'fa-star' },
    { id: 'background', label: 'Backgrounds', icon: 'fa-image' },
    { id: 'banner', label: 'Banners', icon: 'fa-flag' },
    { id: 'icon', label: 'Icons', icon: 'fa-icons' },
    { id: 'other', label: 'Other', icon: 'fa-folder' }
];

const videoCategories = [
    { id: 'all', label: 'All Videos', icon: 'fa-video' },
    { id: 'intro', label: 'Intro Videos', icon: 'fa-play-circle' },
    { id: 'tutorial', label: 'Tutorials', icon: 'fa-graduation-cap' },
    { id: 'promo', label: 'Promotional', icon: 'fa-bullhorn' },
    { id: 'other', label: 'Other', icon: 'fa-folder' }
];

// ============================================
// LOAD FUNCTIONS
// ============================================

async function loadSystemMedia() {
    console.log('loadSystemMedia() called');

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('No auth token found, loading defaults');
            systemMedia = getDefaultSystemMedia();
            updateMediaCounts();
            updateMediaPreviews();
            return;
        }

        console.log('Fetching system media from API...');
        const response = await fetch(`${window.API_BASE_URL}/api/admin/media/system-media`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response data:', data);

        if (data.success) {
            systemMedia.images = data.images || [];
            systemMedia.videos = data.videos || [];
            console.log(`Loaded ${systemMedia.images.length} images, ${systemMedia.videos.length} videos`);
            updateMediaCounts();
            updateMediaPreviews();
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error loading system media:', error);
        systemMedia = getDefaultSystemMedia();
        updateMediaCounts();
        updateMediaPreviews();
    }
}

function getDefaultSystemMedia() {
    return {
        images: [
            { id: 1, name: 'logo.png', url: '/system_images/logo.png', type: 'logo', size: 45000, uploaded_at: '2024-01-15' },
            { id: 2, name: 'favicon.ico', url: '/system_images/favicon.ico', type: 'favicon', size: 4096, uploaded_at: '2024-01-15' },
            { id: 3, name: 'hero-bg.jpg', url: '/system_images/hero-bg.jpg', type: 'background', size: 250000, uploaded_at: '2024-01-20' },
            { id: 4, name: 'banner-main.jpg', url: '/system_images/banner-main.jpg', type: 'banner', size: 180000, uploaded_at: '2024-01-22' },
            { id: 5, name: 'icon-user.svg', url: '/system_images/icon-user.svg', type: 'icon', size: 2048, uploaded_at: '2024-01-25' }
        ],
        videos: [
            { id: 1, name: 'intro-video.mp4', url: '/system_videos/intro.mp4', type: 'intro', size: 15000000, duration: '2:30', uploaded_at: '2024-01-18' },
            { id: 2, name: 'tutorial-getting-started.mp4', url: '/system_videos/tutorial-1.mp4', type: 'tutorial', size: 25000000, duration: '5:45', uploaded_at: '2024-01-28' },
            { id: 3, name: 'promo-2024.mp4', url: '/system_videos/promo.mp4', type: 'promo', size: 35000000, duration: '1:00', uploaded_at: '2024-02-01' }
        ]
    };
}

// ============================================
// UPDATE COUNTS & PREVIEWS
// ============================================

function updateMediaCounts() {
    const imageCount = document.getElementById('system-images-count');
    const videoCount = document.getElementById('system-videos-count');

    if (imageCount) {
        imageCount.textContent = `${systemMedia.images.length} image${systemMedia.images.length !== 1 ? 's' : ''}`;
    }
    if (videoCount) {
        videoCount.textContent = `${systemMedia.videos.length} video${systemMedia.videos.length !== 1 ? 's' : ''}`;
    }
}

function updateMediaPreviews() {
    // Image thumbnails preview
    const imagePreview = document.getElementById('system-images-preview');
    if (imagePreview) {
        const previewImages = systemMedia.images.slice(0, 4);
        if (previewImages.length === 0) {
            imagePreview.innerHTML = '<span class="text-xs text-gray-400">No images uploaded</span>';
        } else {
            imagePreview.innerHTML = previewImages.map(img => `
                <div class="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                    <img src="${img.url}" alt="${img.name}" class="w-full h-full object-cover">
                </div>
            `).join('') + (systemMedia.images.length > 4 ? `
                <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs text-gray-500">
                    +${systemMedia.images.length - 4}
                </div>
            ` : '');
        }
    }

    // Video thumbnails preview
    const videoPreview = document.getElementById('system-videos-preview');
    if (videoPreview) {
        const previewVideos = systemMedia.videos.slice(0, 4);
        if (previewVideos.length === 0) {
            videoPreview.innerHTML = '<span class="text-xs text-gray-400">No videos uploaded</span>';
        } else {
            videoPreview.innerHTML = previewVideos.map(vid => `
                <div class="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-800 flex items-center justify-center">
                    <i class="fas fa-play text-white text-xs"></i>
                </div>
            `).join('') + (systemMedia.videos.length > 4 ? `
                <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs text-gray-500">
                    +${systemMedia.videos.length - 4}
                </div>
            ` : '');
        }
    }
}

// ============================================
// IMAGE GALLERY MODAL
// ============================================

function openImageGalleryModal() {
    const modal = document.getElementById('image-gallery-modal');
    if (!modal) {
        console.error('Image gallery modal not found');
        return;
    }

    activeImageCategory = 'all';
    renderImageCategorySidebar();
    renderImageGalleryContent();

    modal.classList.remove('hidden');
}

function closeImageGalleryModal() {
    const modal = document.getElementById('image-gallery-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function renderImageCategorySidebar() {
    const sidebar = document.getElementById('image-category-filters');
    if (!sidebar) return;

    // Count images per category
    const categoryCounts = { all: systemMedia.images.length };
    systemMedia.images.forEach(img => {
        const cat = img.type || 'other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    sidebar.innerHTML = imageCategories.map(cat => {
        const count = categoryCounts[cat.id] || 0;
        const isActive = activeImageCategory === cat.id;
        return `
            <button onclick="filterImagesByCategory('${cat.id}')"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-700'}">
                <i class="fas ${cat.icon} w-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}"></i>
                <span class="flex-1 text-sm">${cat.label}</span>
                <span class="text-xs ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'} px-2 py-0.5 rounded-full">${count}</span>
            </button>
        `;
    }).join('');

    // Update count in header
    const countEl = document.getElementById('image-gallery-count');
    if (countEl) {
        countEl.textContent = `${systemMedia.images.length} image${systemMedia.images.length !== 1 ? 's' : ''}`;
    }
}

function filterImagesByCategory(category) {
    activeImageCategory = category;
    renderImageCategorySidebar();
    renderImageGalleryContent();

    // Update title
    const titleEl = document.getElementById('image-gallery-title');
    if (titleEl) {
        const cat = imageCategories.find(c => c.id === category);
        titleEl.textContent = cat ? cat.label : 'All Images';
    }
}

function renderImageGalleryContent() {
    const content = document.getElementById('image-gallery-content');
    if (!content) return;

    let images = systemMedia.images;
    if (activeImageCategory !== 'all') {
        images = images.filter(img => (img.type || 'other') === activeImageCategory);
    }

    if (images.length === 0) {
        content.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <i class="fas fa-images text-5xl mb-4"></i>
                <p class="text-lg font-semibold">No images found</p>
                <p class="text-sm">Upload images to see them here</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            ${images.map(img => `
                <div class="group relative rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer bg-white"
                    onclick="openMediaViewer('image', ${img.id})">
                    <div class="aspect-square bg-gray-100">
                        <img src="${img.url}" alt="${img.name}" class="w-full h-full object-cover">
                    </div>
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div class="absolute bottom-0 left-0 right-0 p-3">
                            <p class="text-white text-sm font-medium truncate">${img.name}</p>
                            <p class="text-white/70 text-xs capitalize">${img.type || 'other'}</p>
                        </div>
                    </div>
                    <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button onclick="event.stopPropagation(); copyMediaUrl('${img.url}')"
                            class="w-8 h-8 bg-white/90 text-gray-700 rounded-lg flex items-center justify-center text-sm hover:bg-white shadow"
                            title="Copy URL">
                            <i class="fas fa-link"></i>
                        </button>
                        <button onclick="event.stopPropagation(); deleteSystemMedia('image', ${img.id})"
                            class="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center text-sm hover:bg-red-600 shadow"
                            title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ============================================
// VIDEO GALLERY MODAL
// ============================================

function openVideoGalleryModal() {
    const modal = document.getElementById('video-gallery-modal');
    if (!modal) {
        console.error('Video gallery modal not found');
        return;
    }

    activeVideoCategory = 'all';
    renderVideoCategorySidebar();
    renderVideoGalleryContent();

    modal.classList.remove('hidden');
}

function closeVideoGalleryModal() {
    const modal = document.getElementById('video-gallery-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function renderVideoCategorySidebar() {
    const sidebar = document.getElementById('video-category-filters');
    if (!sidebar) return;

    // Count videos per category
    const categoryCounts = { all: systemMedia.videos.length };
    systemMedia.videos.forEach(vid => {
        const cat = vid.type || 'other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    sidebar.innerHTML = videoCategories.map(cat => {
        const count = categoryCounts[cat.id] || 0;
        const isActive = activeVideoCategory === cat.id;
        return `
            <button onclick="filterVideosByCategory('${cat.id}')"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${isActive ? 'bg-green-100 text-green-700 font-medium' : 'hover:bg-gray-100 text-gray-700'}">
                <i class="fas ${cat.icon} w-4 ${isActive ? 'text-green-600' : 'text-gray-400'}"></i>
                <span class="flex-1 text-sm">${cat.label}</span>
                <span class="text-xs ${isActive ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'} px-2 py-0.5 rounded-full">${count}</span>
            </button>
        `;
    }).join('');

    // Update count in header
    const countEl = document.getElementById('video-gallery-count');
    if (countEl) {
        countEl.textContent = `${systemMedia.videos.length} video${systemMedia.videos.length !== 1 ? 's' : ''}`;
    }
}

function filterVideosByCategory(category) {
    activeVideoCategory = category;
    renderVideoCategorySidebar();
    renderVideoGalleryContent();

    // Update title
    const titleEl = document.getElementById('video-gallery-title');
    if (titleEl) {
        const cat = videoCategories.find(c => c.id === category);
        titleEl.textContent = cat ? cat.label : 'All Videos';
    }
}

function renderVideoGalleryContent() {
    const content = document.getElementById('video-gallery-content');
    if (!content) return;

    let videos = systemMedia.videos;
    if (activeVideoCategory !== 'all') {
        videos = videos.filter(vid => (vid.type || 'other') === activeVideoCategory);
    }

    if (videos.length === 0) {
        content.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <i class="fas fa-video text-5xl mb-4"></i>
                <p class="text-lg font-semibold">No videos found</p>
                <p class="text-sm">Upload videos to see them here</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${videos.map(vid => `
                <div class="group relative rounded-xl overflow-hidden border-2 border-gray-200 hover:border-green-400 hover:shadow-lg transition-all cursor-pointer bg-white"
                    onclick="openMediaViewer('video', ${vid.id})">
                    <div class="aspect-video bg-gray-900 flex items-center justify-center relative">
                        <i class="fas fa-play-circle text-5xl text-white/80 group-hover:text-white group-hover:scale-110 transition-all"></i>
                        ${vid.duration ? `<span class="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded">${vid.duration}</span>` : ''}
                    </div>
                    <div class="p-3 bg-white">
                        <p class="text-sm font-medium truncate">${vid.name}</p>
                        <p class="text-xs text-gray-500 capitalize">${vid.type || 'other'} • ${formatFileSize(vid.size)}</p>
                    </div>
                    <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button onclick="event.stopPropagation(); copyMediaUrl('${vid.url}')"
                            class="w-8 h-8 bg-white/90 text-gray-700 rounded-lg flex items-center justify-center text-sm hover:bg-white shadow"
                            title="Copy URL">
                            <i class="fas fa-link"></i>
                        </button>
                        <button onclick="event.stopPropagation(); deleteSystemMedia('video', ${vid.id})"
                            class="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center text-sm hover:bg-red-600 shadow"
                            title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ============================================
// MEDIA VIEWER MODAL
// ============================================

function openMediaViewer(mediaType, mediaId) {
    const mediaList = mediaType === 'image' ? systemMedia.images : systemMedia.videos;
    const media = mediaList.find(m => m.id === mediaId);

    if (!media) {
        console.error('Media not found:', mediaType, mediaId);
        return;
    }

    currentViewingMedia = { ...media, mediaType };

    const modal = document.getElementById('media-viewer-modal');
    if (!modal) return;

    // Update header info
    document.getElementById('media-viewer-title').textContent = media.name;
    document.getElementById('media-viewer-category').textContent = (media.type || 'other').charAt(0).toUpperCase() + (media.type || 'other').slice(1);
    document.getElementById('media-viewer-size').textContent = formatFileSize(media.size);
    document.getElementById('media-viewer-date').textContent = media.uploaded_at ? `Uploaded: ${media.uploaded_at}` : '';

    // Render media content
    const content = document.getElementById('media-viewer-content');
    if (mediaType === 'image') {
        content.innerHTML = `<img src="${media.url}" alt="${media.name}" class="max-w-full max-h-[60vh] object-contain">`;
    } else {
        content.innerHTML = `
            <video controls class="max-w-full max-h-[60vh]" autoplay>
                <source src="${media.url}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    }

    modal.classList.remove('hidden');
}

function closeMediaViewer() {
    const modal = document.getElementById('media-viewer-modal');
    if (modal) {
        modal.classList.add('hidden');
        // Stop video if playing
        const video = modal.querySelector('video');
        if (video) {
            video.pause();
        }
    }
    currentViewingMedia = null;
}

function copyCurrentMediaUrl() {
    if (!currentViewingMedia) return;
    copyMediaUrl(currentViewingMedia.url);
}

function deleteCurrentMedia() {
    if (!currentViewingMedia) return;
    deleteSystemMedia(currentViewingMedia.mediaType, currentViewingMedia.id);
    closeMediaViewer();
}

// ============================================
// UPLOAD MODAL FUNCTIONS
// ============================================

function openSystemMediaUploadModal(defaultType = 'image') {
    const modal = document.getElementById('system-media-upload-modal');
    if (!modal) {
        console.error('System media upload modal not found');
        return;
    }

    // Reset form
    document.getElementById('system-media-upload-form').reset();
    document.getElementById('media-type-select').value = defaultType;
    currentMediaType = defaultType;
    updateMediaUploadFields();
    clearMediaPreview();

    modal.classList.remove('hidden');
}

function closeSystemMediaUploadModal() {
    const modal = document.getElementById('system-media-upload-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function updateMediaUploadFields() {
    const mediaType = document.getElementById('media-type-select').value;
    currentMediaType = mediaType;

    const imageFields = document.getElementById('image-upload-fields');
    const videoFields = document.getElementById('video-upload-fields');
    const fileInput = document.getElementById('media-file-input');
    const categorySelect = document.getElementById('media-category');

    if (mediaType === 'image') {
        if (imageFields) imageFields.classList.remove('hidden');
        if (videoFields) videoFields.classList.add('hidden');
        if (fileInput) fileInput.accept = 'image/*';
        // Update category options for images
        if (categorySelect) {
            categorySelect.innerHTML = `
                <option value="logo">Logo</option>
                <option value="favicon">Favicon</option>
                <option value="background">Background</option>
                <option value="banner">Banner</option>
                <option value="icon">Icon</option>
                <option value="other">Other</option>
            `;
        }
    } else {
        if (imageFields) imageFields.classList.add('hidden');
        if (videoFields) videoFields.classList.remove('hidden');
        if (fileInput) fileInput.accept = 'video/*';
        // Update category options for videos
        if (categorySelect) {
            categorySelect.innerHTML = `
                <option value="intro">Intro Video</option>
                <option value="tutorial">Tutorial</option>
                <option value="promo">Promotional</option>
                <option value="other">Other</option>
            `;
        }
    }

    clearMediaPreview();
}

function handleMediaFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const previewContainer = document.getElementById('media-preview-container');
    const previewImage = document.getElementById('media-preview-image');
    const previewVideo = document.getElementById('media-preview-video');
    const fileName = document.getElementById('selected-file-name');

    if (fileName) fileName.textContent = file.name;

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (previewImage) {
                previewImage.src = e.target.result;
                previewImage.classList.remove('hidden');
            }
            if (previewVideo) previewVideo.classList.add('hidden');
            if (previewContainer) previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        if (previewVideo) {
            previewVideo.src = url;
            previewVideo.classList.remove('hidden');
        }
        if (previewImage) previewImage.classList.add('hidden');
        if (previewContainer) previewContainer.classList.remove('hidden');
    }
}

function clearMediaPreview() {
    const previewContainer = document.getElementById('media-preview-container');
    const previewImage = document.getElementById('media-preview-image');
    const previewVideo = document.getElementById('media-preview-video');
    const fileName = document.getElementById('selected-file-name');

    if (previewContainer) previewContainer.classList.add('hidden');
    if (previewImage) {
        previewImage.src = '';
        previewImage.classList.add('hidden');
    }
    if (previewVideo) {
        previewVideo.src = '';
        previewVideo.classList.add('hidden');
    }
    if (fileName) fileName.textContent = 'No file selected';
}

async function saveSystemMedia(event) {
    event.preventDefault();

    const fileInput = document.getElementById('media-file-input');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file to upload');
        return;
    }

    const mediaType = document.getElementById('media-type-select').value;
    const mediaName = document.getElementById('media-name').value.trim() || file.name;
    const mediaCategory = document.getElementById('media-category').value;

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', mediaType);
        formData.append('name', mediaName);
        formData.append('category', mediaCategory);

        console.log('Uploading system media:', { mediaType, mediaName, mediaCategory });

        const response = await fetch(`${window.API_BASE_URL}/api/admin/media/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload media');
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to upload media');
        }

        await loadSystemMedia();
        closeSystemMediaUploadModal();
        alert('Media uploaded successfully!');

    } catch (error) {
        console.error('Error uploading media:', error);
        alert('Failed to upload media. Please try again.');
    }
}

async function deleteSystemMedia(mediaType, mediaId) {
    const mediaList = mediaType === 'image' ? systemMedia.images : systemMedia.videos;
    const media = mediaList.find(m => m.id === mediaId);

    if (!media) return;

    if (!confirm(`Are you sure you want to delete "${media.name}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/media/${mediaType}/${mediaId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete media');
        }

        // Remove from local state
        if (mediaType === 'image') {
            systemMedia.images = systemMedia.images.filter(m => m.id !== mediaId);
            renderImageCategorySidebar();
            renderImageGalleryContent();
        } else {
            systemMedia.videos = systemMedia.videos.filter(m => m.id !== mediaId);
            renderVideoCategorySidebar();
            renderVideoGalleryContent();
        }

        updateMediaCounts();
        updateMediaPreviews();
        alert('Media deleted successfully!');

    } catch (error) {
        console.error('Error deleting media:', error);
        alert('Failed to delete media. Please try again.');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function copyMediaUrl(url) {
    const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
    navigator.clipboard.writeText(fullUrl).then(() => {
        alert('URL copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy URL:', err);
    });
}

// ============================================
// EXPORTS & INITIALIZATION
// ============================================

// Export functions to window
window.loadSystemMedia = loadSystemMedia;
window.updateMediaCounts = updateMediaCounts;
window.updateMediaPreviews = updateMediaPreviews;

// Image gallery functions
window.openImageGalleryModal = openImageGalleryModal;
window.closeImageGalleryModal = closeImageGalleryModal;
window.filterImagesByCategory = filterImagesByCategory;

// Video gallery functions
window.openVideoGalleryModal = openVideoGalleryModal;
window.closeVideoGalleryModal = closeVideoGalleryModal;
window.filterVideosByCategory = filterVideosByCategory;

// Media viewer functions
window.openMediaViewer = openMediaViewer;
window.closeMediaViewer = closeMediaViewer;
window.copyCurrentMediaUrl = copyCurrentMediaUrl;
window.deleteCurrentMedia = deleteCurrentMedia;

// Upload functions
window.openSystemMediaUploadModal = openSystemMediaUploadModal;
window.closeSystemMediaUploadModal = closeSystemMediaUploadModal;
window.updateMediaUploadFields = updateMediaUploadFields;
window.handleMediaFileSelect = handleMediaFileSelect;
window.saveSystemMedia = saveSystemMedia;
window.deleteSystemMedia = deleteSystemMedia;
window.copyMediaUrl = copyMediaUrl;

// ESC key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const imageGallery = document.getElementById('image-gallery-modal');
        const videoGallery = document.getElementById('video-gallery-modal');
        const mediaViewer = document.getElementById('media-viewer-modal');
        const uploadModal = document.getElementById('system-media-upload-modal');

        if (mediaViewer && !mediaViewer.classList.contains('hidden')) {
            closeMediaViewer();
        } else if (imageGallery && !imageGallery.classList.contains('hidden')) {
            closeImageGalleryModal();
        } else if (videoGallery && !videoGallery.classList.contains('hidden')) {
            closeVideoGalleryModal();
        } else if (uploadModal && !uploadModal.classList.contains('hidden')) {
            closeSystemMediaUploadModal();
        }
    }
});

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('System Media Manager initialized');

    const imagesCount = document.getElementById('system-images-count');
    if (imagesCount) {
        console.log('System media section found, loading media...');
        loadSystemMedia();
    } else {
        console.log('System media section NOT FOUND on page load');
        setTimeout(() => {
            const imagesCountDelayed = document.getElementById('system-images-count');
            if (imagesCountDelayed) {
                console.log('System media section found after delay, loading media...');
                loadSystemMedia();
            }
        }, 500);
    }
});

// Also load when media panel becomes visible
document.addEventListener('panelChanged', function(event) {
    if (event.detail && event.detail.panelName === 'media') {
        console.log('Media panel activated, loading system media...');
        setTimeout(() => loadSystemMedia(), 100);
    }
});
