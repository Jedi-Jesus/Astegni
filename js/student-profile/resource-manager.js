// Resource Manager for Student Profile
// Handles downloading resources from tutors and managing student's resource library

class ResourceManager {
    constructor() {
        this.storageKey = 'student_resources';
        this.resources = this.loadResources();
    }

    // Load resources from localStorage
    loadResources() {
        const saved = localStorage.getItem(this.storageKey);
        return saved ? JSON.parse(saved) : [];
    }

    // Save resources to localStorage
    saveResources() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.resources));
    }

    // Download resource from tutor and add to student's library
    downloadResource(resourceData) {
        const resource = {
            id: Date.now(),
            name: resourceData.name || 'Untitled Resource',
            type: resourceData.type || 'document',
            fileType: resourceData.fileType || 'PDF',
            size: resourceData.size || '0 KB',
            tutorName: resourceData.tutorName || 'Unknown Tutor',
            downloadedAt: new Date().toISOString(),
            category: resourceData.category || 'other',
            url: resourceData.url || '#',
            icon: this.getIconForType(resourceData.fileType || resourceData.type)
        };

        // Check if resource already exists
        const exists = this.resources.find(r =>
            r.name === resource.name && r.tutorName === resource.tutorName
        );

        if (exists) {
            this.showNotification('Resource already in your library', 'info');
            return;
        }

        // Add to resources
        this.resources.unshift(resource);
        this.saveResources();

        // Show success notification
        this.showNotification(`Downloaded: ${resource.name}`, 'success');

        // Refresh the resources grid if on student profile
        if (window.location.href.includes('student-profile.html')) {
            this.renderResources();
        }

        return resource;
    }

    // Get icon based on file type
    getIconForType(fileType) {
        const typeUpper = (fileType || '').toUpperCase();
        const iconMap = {
            'PDF': '📄',
            'DOCX': '📝',
            'DOC': '📝',
            'PPTX': '📊',
            'PPT': '📊',
            'XLSX': '📈',
            'XLS': '📈',
            'TXT': '📃',
            'VIDEO': '🎬',
            'IMAGE': '🖼️',
            'AUDIO': '🎵'
        };
        return iconMap[typeUpper] || '📁';
    }

    // Render resources in the grid
    renderResources() {
        const grid = document.getElementById('resources-grid');
        if (!grid) return;

        if (this.resources.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-6xl mb-4">📚</div>
                    <p class="text-gray-600">No resources yet. Download resources from your tutors to get started!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.resources.map((resource, index) => `
            <div class="card p-6 hover:shadow-lg transition">
                <div class="flex items-start justify-between mb-4">
                    <div class="text-5xl">${resource.icon}</div>
                    <div class="relative">
                        <button class="text-gray-500 hover:text-gray-700"
                            onclick="toggleResourceMenu(${resource.id})">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
                <h4 class="text-lg font-bold mb-2">${resource.name}</h4>
                <p class="text-sm text-gray-600 mb-2">${resource.fileType} • ${resource.size}</p>
                <p class="text-xs text-gray-500 mb-3">From: ${resource.tutorName}</p>
                <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>Downloaded: ${this.formatDate(resource.downloadedAt)}</span>
                </div>
                <div class="mt-4 flex gap-2">
                    <button class="btn-secondary px-4 py-2 rounded text-sm flex-1"
                        onclick="resourceManager.viewResource(${resource.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-secondary px-4 py-2 rounded text-sm flex-1"
                        onclick="resourceManager.removeResource(${resource.id})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `).join('');

        // Update stats
        this.updateStats();
    }

    // Format date for display
    formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    }

    // Update resource statistics
    updateStats() {
        const totalFiles = this.resources.length;
        const notes = this.resources.filter(r => r.category === 'notes').length;
        const assignments = this.resources.filter(r => r.category === 'assignments').length;

        // Calculate total storage (simulated)
        const totalStorage = this.resources.reduce((sum, r) => {
            const sizeNum = parseFloat(r.size);
            const unit = r.size.includes('GB') ? 1024 : (r.size.includes('KB') ? 0.001 : 1);
            return sum + (sizeNum * unit);
        }, 0);

        // Update stat displays
        const stats = [
            { selector: '.card p:contains("Total Files") + p', value: totalFiles },
            { selector: '.card p:contains("Notes") + p', value: notes },
            { selector: '.card p:contains("Assignments") + p', value: assignments },
            { selector: '.card p:contains("Storage Used") + p', value: `${totalStorage.toFixed(1)} MB` }
        ];

        // Note: This is a simplified update, actual implementation may vary
    }

    // View resource
    viewResource(resourceId) {
        const resource = this.resources.find(r => r.id === resourceId);
        if (!resource) return;

        // Open resource in new tab or show viewer modal
        if (resource.url && resource.url !== '#') {
            window.open(resource.url, '_blank');
        } else {
            this.showNotification('Resource preview not available', 'info');
        }
    }

    // Remove resource from library
    removeResource(resourceId) {
        if (!confirm('Remove this resource from your library?')) return;

        this.resources = this.resources.filter(r => r.id !== resourceId);
        this.saveResources();
        this.renderResources();
        this.showNotification('Resource removed', 'success');
    }

    // Filter resources by category
    filterResources(category) {
        const grid = document.getElementById('resources-grid');
        if (!grid) return;

        const filtered = category === 'all'
            ? this.resources
            : this.resources.filter(r => r.category === category);

        // Update filter buttons
        document.querySelectorAll('.flex.gap-2.mb-6 button').forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-200');
        });
        event.target.classList.add('bg-blue-500', 'text-white');
        event.target.classList.remove('bg-gray-200');

        // Render filtered resources
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-6xl mb-4">📂</div>
                    <p class="text-gray-600">No ${category} resources found</p>
                </div>
            `;
            return;
        }

        // Similar rendering logic as renderResources but with filtered array
        grid.innerHTML = filtered.map((resource) => `
            <div class="card p-6 hover:shadow-lg transition">
                <div class="flex items-start justify-between mb-4">
                    <div class="text-5xl">${resource.icon}</div>
                    <div class="relative">
                        <button class="text-gray-500 hover:text-gray-700"
                            onclick="toggleResourceMenu(${resource.id})">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
                <h4 class="text-lg font-bold mb-2">${resource.name}</h4>
                <p class="text-sm text-gray-600 mb-2">${resource.fileType} • ${resource.size}</p>
                <p class="text-xs text-gray-500 mb-3">From: ${resource.tutorName}</p>
                <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>Downloaded: ${this.formatDate(resource.downloadedAt)}</span>
                </div>
                <div class="mt-4 flex gap-2">
                    <button class="btn-secondary px-4 py-2 rounded text-sm flex-1"
                        onclick="resourceManager.viewResource(${resource.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-secondary px-4 py-2 rounded text-sm flex-1"
                        onclick="resourceManager.removeResource(${resource.id})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Initialize resource manager
const resourceManager = new ResourceManager();

// Global function for downloading resources (called from tutor profile)
function downloadResource(resourceId, resourceData) {
    // If called with just an ID from tutor profile sample resources
    if (typeof resourceId === 'number' && !resourceData) {
        // Sample data for tutor resources
        const sampleResources = {
            1: {
                name: 'Mathematics Grade 10 Notes',
                type: 'document',
                fileType: 'PDF',
                size: '2.5 MB',
                tutorName: 'Dr. Abebe Kebede',
                category: 'notes',
                url: '#'
            },
            2: {
                name: 'Physics Chapter 5 Slides',
                type: 'presentation',
                fileType: 'PPTX',
                size: '8.3 MB',
                tutorName: 'Dr. Abebe Kebede',
                category: 'notes',
                url: '#'
            },
            3: {
                name: 'Chemistry Practice Worksheet',
                type: 'document',
                fileType: 'DOCX',
                size: '450 KB',
                tutorName: 'Dr. Abebe Kebede',
                category: 'assignments',
                url: '#'
            },
            4: {
                name: 'Biology Lab Manual',
                type: 'document',
                fileType: 'PDF',
                size: '5.2 MB',
                tutorName: 'Dr. Abebe Kebede',
                category: 'textbooks',
                url: '#'
            },
            5: {
                name: 'Algebra Study Guide',
                type: 'document',
                fileType: 'PDF',
                size: '1.8 MB',
                tutorName: 'Dr. Abebe Kebede',
                category: 'study-guides',
                url: '#'
            },
            6: {
                name: 'English Grammar Exercises',
                type: 'document',
                fileType: 'DOCX',
                size: '920 KB',
                tutorName: 'Dr. Abebe Kebede',
                category: 'assignments',
                url: '#'
            }
        };

        resourceData = sampleResources[resourceId];
    }

    if (resourceData) {
        resourceManager.downloadResource(resourceData);
    }
}

// Global functions for resource management
function viewResource(resourceId) {
    resourceManager.viewResource(resourceId);
}

function filterResources(category) {
    resourceManager.filterResources(category);
}

function toggleResourceMenu(resourceId) {
    // Placeholder for menu toggle functionality
    console.log('Toggle menu for resource:', resourceId);
}

function openUploadResourceModal() {
    if (window.openComingSoonModal) {
        window.openComingSoonModal('Upload Resource');
    }
}

function createFolder() {
    if (window.openComingSoonModal) {
        window.openComingSoonModal('Create Folder');
    }
}

function openLabSimulator() {
    if (window.openComingSoonModal) {
        window.openComingSoonModal('Lab Simulator');
    }
}

function openDigitalWhiteboard() {
    if (window.openComingSoonModal) {
        window.openComingSoonModal('Digital Whiteboard');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.href.includes('student-profile.html')) {
        // Render resources when on student profile
        setTimeout(() => {
            resourceManager.renderResources();
        }, 500);
    }
});
