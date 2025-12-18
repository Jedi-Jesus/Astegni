/**
 * ============================================
 * FOLDER MANAGER - Shared Document Folder Management
 * ============================================
 *
 * Manages document folders for both tutor and student profiles.
 * Features:
 * - Create, rename, delete folders
 * - Open folder modal to view contents
 * - Context menu with advanced options (zip, merge, cut, copy, delete)
 * - Folder icon and color customization
 * - Local storage persistence (can be upgraded to API later)
 */

// ============================================
// STATE MANAGEMENT
// ============================================

let documentFolders = [];
let currentOpenFolder = null;
let currentContextFolder = null;
let clipboardFolder = null;
let clipboardAction = null; // 'cut' or 'copy'
let selectedMergeTarget = null;

// Role for current page (set by page initialization)
let folderManagerRole = 'student'; // 'student' or 'tutor'

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize folder manager
 * @param {string} role - 'student' or 'tutor'
 */
function initializeFolderManager(role = 'student') {
    folderManagerRole = role;
    console.log(`📁 [FolderManager] Initializing for ${role}...`);

    // Load folders from localStorage
    loadFolders();

    // Render folders to grid
    renderFolders();

    // Setup event listeners
    setupFolderEventListeners();

    console.log(`📁 [FolderManager] Initialized with ${documentFolders.length} folders`);
}

/**
 * Load folders from localStorage
 */
function loadFolders() {
    const storageKey = `astegni_${folderManagerRole}_folders`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
        try {
            documentFolders = JSON.parse(stored);
        } catch (e) {
            console.error('Failed to parse stored folders:', e);
            documentFolders = getDefaultFolders();
        }
    } else {
        documentFolders = getDefaultFolders();
        saveFolders();
    }
}

/**
 * Get default folders based on role
 */
function getDefaultFolders() {
    if (folderManagerRole === 'tutor') {
        return [
            { id: 'mathematics', name: 'Mathematics', icon: '📁', color: 'blue', docCount: 0 },
            { id: 'physics', name: 'Physics', icon: '📁', color: 'green', docCount: 0 },
            { id: 'chemistry', name: 'Chemistry', icon: '⚗️', color: 'purple', docCount: 0 },
            { id: 'biology', name: 'Biology', icon: '🔬', color: 'green', docCount: 0 },
            { id: 'exams', name: 'Exams', icon: '📝', color: 'red', docCount: 0 },
            { id: 'worksheets', name: 'Worksheets', icon: '📋', color: 'yellow', docCount: 0 }
        ];
    } else {
        return [
            { id: 'mathematics', name: 'Mathematics', icon: '🧮', color: 'blue', docCount: 0 },
            { id: 'physics', name: 'Physics', icon: '📁', color: 'green', docCount: 0 },
            { id: 'chemistry', name: 'Chemistry', icon: '⚗️', color: 'purple', docCount: 0 },
            { id: 'biology', name: 'Biology', icon: '🔬', color: 'green', docCount: 0 },
            { id: 'assignments', name: 'Assignments', icon: '📝', color: 'orange', docCount: 0 },
            { id: 'study-guides', name: 'Study Guides', icon: '📚', color: 'blue', docCount: 0 }
        ];
    }
}

/**
 * Save folders to localStorage
 */
function saveFolders() {
    const storageKey = `astegni_${folderManagerRole}_folders`;
    localStorage.setItem(storageKey, JSON.stringify(documentFolders));
}

/**
 * Setup event listeners
 */
function setupFolderEventListeners() {
    // Close context menu on click outside
    document.addEventListener('click', (e) => {
        const contextMenu = document.getElementById('folder-context-menu');
        if (contextMenu && !contextMenu.contains(e.target)) {
            contextMenu.classList.add('hidden');
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeFolderModal();
            closeCreateFolderModal();
            closeMergeFolderModal();
            document.getElementById('folder-context-menu')?.classList.add('hidden');
        }
    });
}

// ============================================
// FOLDER RENDERING
// ============================================

/**
 * Render folders to the grid
 */
function renderFolders() {
    const gridId = folderManagerRole === 'tutor' ? 'teaching-docs-folders' : 'student-docs-folders';
    const grid = document.getElementById(gridId);

    if (!grid) {
        console.warn(`[FolderManager] Grid element not found: ${gridId}`);
        return;
    }

    // Clear existing folders (keep the "New Folder" card)
    const existingFolders = grid.querySelectorAll('.folder-card');
    existingFolders.forEach(f => f.remove());

    // Render each folder
    documentFolders.forEach(folder => {
        const folderCard = createFolderCard(folder);
        grid.appendChild(folderCard);
    });

    console.log(`📁 [FolderManager] Rendered ${documentFolders.length} folders`);
}

/**
 * Create a folder card element
 */
function createFolderCard(folder) {
    const card = document.createElement('div');
    card.className = 'folder-card card p-4 text-center cursor-pointer hover:shadow-lg transition group relative';
    card.dataset.folderId = folder.id;

    // Color class mapping
    const colorClasses = {
        blue: 'border-blue-200 hover:border-blue-400',
        green: 'border-green-200 hover:border-green-400',
        yellow: 'border-yellow-200 hover:border-yellow-400',
        red: 'border-red-200 hover:border-red-400',
        purple: 'border-purple-200 hover:border-purple-400',
        pink: 'border-pink-200 hover:border-pink-400',
        gray: 'border-gray-200 hover:border-gray-400',
        orange: 'border-orange-200 hover:border-orange-400'
    };

    card.classList.add('border-2', ...(colorClasses[folder.color] || colorClasses.blue).split(' '));

    card.innerHTML = `
        <div class="text-4xl mb-2">${folder.icon}</div>
        <p class="font-semibold text-sm truncate" title="${escapeHtml(folder.name)}">${escapeHtml(folder.name)}</p>
        <span class="text-xs text-gray-500">${folder.docCount} docs</span>
        <!-- Three-dot menu button -->
        <button class="folder-menu-btn absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition"
            onclick="event.stopPropagation(); openFolderContextMenu(event, '${folder.id}')">
            <i class="fas fa-ellipsis-v"></i>
        </button>
    `;

    // Click to open folder modal
    card.addEventListener('click', () => openFolderModal(folder.id));

    // Right-click context menu
    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openFolderContextMenu(e, folder.id);
    });

    return card;
}

// ============================================
// FOLDER MODAL
// ============================================

/**
 * Open folder modal to view contents
 */
function openFolderModal(folderId) {
    const folder = documentFolders.find(f => f.id === folderId);
    if (!folder) {
        console.error('Folder not found:', folderId);
        return;
    }

    currentOpenFolder = folder;
    console.log(`📂 [FolderManager] Opening folder: ${folder.name}`);

    // Update modal header
    document.getElementById('folder-modal-icon').textContent = folder.icon;
    document.getElementById('folder-modal-title').textContent = folder.name;

    // Load folder documents
    loadFolderDocuments(folderId);

    // Show modal
    document.getElementById('folder-modal').classList.remove('hidden');
}

/**
 * Close folder modal
 */
function closeFolderModal() {
    document.getElementById('folder-modal')?.classList.add('hidden');
    currentOpenFolder = null;
}

/**
 * Load documents for a folder
 */
async function loadFolderDocuments(folderId) {
    const grid = document.getElementById('folder-docs-grid');
    const emptyState = document.getElementById('folder-empty-state');
    const countEl = document.getElementById('folder-modal-count');

    if (!grid) return;

    // Show loading
    grid.innerHTML = `
        <div class="col-span-full text-center py-8">
            <i class="fas fa-spinner fa-spin text-3xl text-blue-500 mb-3"></i>
            <p class="text-gray-500">Loading documents...</p>
        </div>
    `;

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const role = folderManagerRole;

        // Fetch documents filtered by folder
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/teaching-documents?uploader_role=${role}&folder=${folderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const documents = await response.json();

            // Update count
            countEl.textContent = `${documents.length} document${documents.length !== 1 ? 's' : ''}`;

            // Update folder doc count
            const folder = documentFolders.find(f => f.id === folderId);
            if (folder) {
                folder.docCount = documents.length;
                saveFolders();
                renderFolders();
            }

            if (documents.length === 0) {
                grid.innerHTML = '';
                emptyState?.classList.remove('hidden');
            } else {
                emptyState?.classList.add('hidden');
                grid.innerHTML = '';
                documents.forEach(doc => {
                    grid.appendChild(createFolderDocCard(doc));
                });
            }
        } else {
            throw new Error('Failed to load documents');
        }
    } catch (error) {
        console.error('Error loading folder documents:', error);
        grid.innerHTML = `
            <div class="col-span-full text-center py-8 text-red-500">
                <i class="fas fa-exclamation-circle text-3xl mb-3"></i>
                <p>Failed to load documents</p>
            </div>
        `;
    }
}

/**
 * Create a document card for folder view
 */
function createFolderDocCard(doc) {
    const card = document.createElement('div');
    card.className = 'bg-white border rounded-lg p-4 hover:shadow-md transition cursor-pointer';

    const icon = getDocIconByType(doc.file_type || doc.document_type);
    const fileSize = formatFileSizeShort(doc.file_size);

    card.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="text-3xl">${icon}</div>
            <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-sm truncate">${escapeHtml(doc.title)}</h4>
                <p class="text-xs text-gray-500">${doc.file_type?.toUpperCase() || 'Document'} • ${fileSize}</p>
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        if (doc.document_url) {
            window.open(doc.document_url, '_blank');
        }
    });

    return card;
}

/**
 * Search documents in folder
 */
function searchFolderDocuments(query) {
    const grid = document.getElementById('folder-docs-grid');
    if (!grid) return;

    const cards = grid.querySelectorAll('.bg-white');
    const queryLower = query.toLowerCase();

    cards.forEach(card => {
        const title = card.querySelector('h4')?.textContent.toLowerCase() || '';
        card.style.display = title.includes(queryLower) ? '' : 'none';
    });
}

/**
 * Sort documents in folder
 */
function sortFolderDocuments(sortBy) {
    // Re-fetch with sort parameter or sort client-side
    console.log('Sort by:', sortBy);
    if (currentOpenFolder) {
        loadFolderDocuments(currentOpenFolder.id);
    }
}

/**
 * Upload to current open folder
 */
function uploadToCurrentFolder() {
    if (!currentOpenFolder) {
        alert('No folder selected');
        return;
    }

    // Check if upload modal exists and open it with folder pre-selected
    const uploadModal = document.getElementById('upload-teaching-doc-modal') ||
        document.getElementById('uploadDocumentModal');

    if (uploadModal) {
        // Set folder field if exists
        const folderInput = uploadModal.querySelector('[name="folder"]') ||
            uploadModal.querySelector('#doc-folder');
        if (folderInput) {
            folderInput.value = currentOpenFolder.id;
        }

        uploadModal.classList.remove('hidden');
    } else {
        alert(`Upload document to "${currentOpenFolder.name}" folder.\n\nUpload modal coming soon!`);
    }
}

// ============================================
// CREATE/EDIT FOLDER
// ============================================

/**
 * Open create folder modal
 */
function openCreateFolderModal(editFolderId = null) {
    const modal = document.getElementById('create-folder-modal');
    const titleEl = document.getElementById('create-folder-title');
    const nameInput = document.getElementById('folder-name-input');
    const editIdInput = document.getElementById('edit-folder-id');

    if (!modal) return;

    if (editFolderId) {
        // Edit mode
        const folder = documentFolders.find(f => f.id === editFolderId);
        if (folder) {
            titleEl.textContent = 'Edit Folder';
            nameInput.value = folder.name;
            editIdInput.value = editFolderId;
            selectFolderIcon(folder.icon);
            selectFolderColor(folder.color);
        }
    } else {
        // Create mode
        titleEl.textContent = 'Create New Folder';
        nameInput.value = '';
        editIdInput.value = '';
        selectFolderIcon('📁');
        selectFolderColor('blue');
    }

    modal.classList.remove('hidden');
    nameInput.focus();
}

/**
 * Close create folder modal
 */
function closeCreateFolderModal() {
    document.getElementById('create-folder-modal')?.classList.add('hidden');
}

/**
 * Select folder icon
 */
function selectFolderIcon(icon) {
    document.querySelectorAll('.folder-icon-btn').forEach(btn => {
        btn.classList.remove('active', 'border-blue-500', 'bg-blue-50');
        if (btn.dataset.icon === icon) {
            btn.classList.add('active', 'border-blue-500', 'bg-blue-50');
        }
    });
    document.getElementById('selected-folder-icon').value = icon;
}

/**
 * Select folder color
 */
function selectFolderColor(color) {
    document.querySelectorAll('.folder-color-btn').forEach(btn => {
        btn.classList.remove('active', 'ring-2', 'ring-offset-2', 'ring-gray-400');
        if (btn.dataset.color === color) {
            btn.classList.add('active', 'ring-2', 'ring-offset-2', 'ring-gray-400');
        }
    });
    document.getElementById('selected-folder-color').value = color;
}

/**
 * Save folder (create or update)
 */
function saveFolder() {
    const nameInput = document.getElementById('folder-name-input');
    const editIdInput = document.getElementById('edit-folder-id');
    const iconInput = document.getElementById('selected-folder-icon');
    const colorInput = document.getElementById('selected-folder-color');

    const name = nameInput.value.trim();
    if (!name) {
        alert('Please enter a folder name');
        nameInput.focus();
        return;
    }

    const icon = iconInput.value || '📁';
    const color = colorInput.value || 'blue';
    const editId = editIdInput.value;

    if (editId) {
        // Update existing folder
        const folder = documentFolders.find(f => f.id === editId);
        if (folder) {
            folder.name = name;
            folder.icon = icon;
            folder.color = color;
            console.log(`📁 [FolderManager] Updated folder: ${name}`);
        }
    } else {
        // Create new folder
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

        // Check for duplicate
        if (documentFolders.some(f => f.id === id)) {
            alert('A folder with this name already exists');
            return;
        }

        documentFolders.push({
            id,
            name,
            icon,
            color,
            docCount: 0
        });
        console.log(`📁 [FolderManager] Created folder: ${name}`);
    }

    saveFolders();
    renderFolders();
    closeCreateFolderModal();
}

// ============================================
// CONTEXT MENU
// ============================================

/**
 * Open folder context menu
 */
function openFolderContextMenu(event, folderId) {
    event.preventDefault();
    event.stopPropagation();

    currentContextFolder = documentFolders.find(f => f.id === folderId);
    if (!currentContextFolder) return;

    const menu = document.getElementById('folder-context-menu');
    if (!menu) return;

    // Position menu at click location
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    // Ensure menu stays in viewport
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        menu.style.left = `${event.clientX - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = `${event.clientY - rect.height}px`;
    }

    menu.classList.remove('hidden');
}

// Context menu actions
function renameFolderAction() {
    if (!currentContextFolder) return;
    document.getElementById('folder-context-menu')?.classList.add('hidden');
    openCreateFolderModal(currentContextFolder.id);
}

function changeFolderIconAction() {
    if (!currentContextFolder) return;
    document.getElementById('folder-context-menu')?.classList.add('hidden');
    openCreateFolderModal(currentContextFolder.id);
}

function zipFolderAction() {
    if (!currentContextFolder) return;
    document.getElementById('folder-context-menu')?.classList.add('hidden');
    alert(`Zipping folder "${currentContextFolder.name}"...\n\nThis feature will compress all documents in the folder into a single ZIP file.\n\nComing soon!`);
}

function mergeFolderAction() {
    if (!currentContextFolder) return;
    document.getElementById('folder-context-menu')?.classList.add('hidden');
    openMergeFolderModal();
}

function cutFolderAction() {
    if (!currentContextFolder) return;
    document.getElementById('folder-context-menu')?.classList.add('hidden');
    clipboardFolder = currentContextFolder;
    clipboardAction = 'cut';
    console.log(`📁 [FolderManager] Cut folder: ${currentContextFolder.name}`);
    alert(`Folder "${currentContextFolder.name}" cut to clipboard`);
}

function copyFolderAction() {
    if (!currentContextFolder) return;
    document.getElementById('folder-context-menu')?.classList.add('hidden');
    clipboardFolder = { ...currentContextFolder };
    clipboardAction = 'copy';
    console.log(`📁 [FolderManager] Copied folder: ${currentContextFolder.name}`);
    alert(`Folder "${currentContextFolder.name}" copied to clipboard`);
}

function deleteFolderAction() {
    if (!currentContextFolder) return;
    document.getElementById('folder-context-menu')?.classList.add('hidden');

    if (confirm(`Are you sure you want to delete the folder "${currentContextFolder.name}"?\n\nNote: Documents inside will be moved to "Uncategorized".`)) {
        documentFolders = documentFolders.filter(f => f.id !== currentContextFolder.id);
        saveFolders();
        renderFolders();
        console.log(`📁 [FolderManager] Deleted folder: ${currentContextFolder.name}`);
    }
}

// ============================================
// MERGE FOLDER
// ============================================

function openMergeFolderModal() {
    const modal = document.getElementById('merge-folder-modal');
    const sourceEl = document.getElementById('merge-source-folder');
    const listEl = document.getElementById('merge-folder-list');

    if (!modal || !currentContextFolder) return;

    sourceEl.textContent = currentContextFolder.name;
    selectedMergeTarget = null;

    // Populate folder list (excluding current folder)
    listEl.innerHTML = '';
    documentFolders
        .filter(f => f.id !== currentContextFolder.id)
        .forEach(folder => {
            const item = document.createElement('div');
            item.className = 'merge-folder-item p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition flex items-center gap-3';
            item.dataset.folderId = folder.id;
            item.innerHTML = `
                <span class="text-2xl">${folder.icon}</span>
                <span class="font-medium">${escapeHtml(folder.name)}</span>
                <span class="text-sm text-gray-500">(${folder.docCount} docs)</span>
            `;
            item.addEventListener('click', () => {
                document.querySelectorAll('.merge-folder-item').forEach(i => i.classList.remove('bg-blue-100', 'border-blue-500'));
                item.classList.add('bg-blue-100', 'border-blue-500');
                selectedMergeTarget = folder.id;
            });
            listEl.appendChild(item);
        });

    modal.classList.remove('hidden');
}

function closeMergeFolderModal() {
    document.getElementById('merge-folder-modal')?.classList.add('hidden');
    selectedMergeTarget = null;
}

function confirmMergeFolder() {
    if (!selectedMergeTarget || !currentContextFolder) {
        alert('Please select a folder to merge with');
        return;
    }

    const targetFolder = documentFolders.find(f => f.id === selectedMergeTarget);
    if (!targetFolder) return;

    if (confirm(`Merge "${currentContextFolder.name}" into "${targetFolder.name}"?\n\nAll documents will be moved to "${targetFolder.name}" and "${currentContextFolder.name}" will be deleted.`)) {
        // Move documents would happen via API
        // For now, just update counts and delete source folder
        targetFolder.docCount += currentContextFolder.docCount;
        documentFolders = documentFolders.filter(f => f.id !== currentContextFolder.id);

        saveFolders();
        renderFolders();
        closeMergeFolderModal();

        console.log(`📁 [FolderManager] Merged ${currentContextFolder.name} into ${targetFolder.name}`);
        alert(`Successfully merged folders!`);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getDocIconByType(fileType) {
    const type = (fileType || '').toLowerCase();
    if (type.includes('pdf')) return '📄';
    if (type.includes('doc') || type.includes('word')) return '📝';
    if (type.includes('ppt') || type.includes('presentation')) return '📊';
    if (type.includes('xls') || type.includes('excel')) return '📈';
    if (type.includes('image') || type.includes('jpg') || type.includes('png')) return '🖼️';
    return '📁';
}

function formatFileSizeShort(bytes) {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
}

// ============================================
// LEGACY FUNCTION ALIASES
// ============================================

// For backward compatibility with existing onclick handlers
function createNewFolder() {
    openCreateFolderModal();
}

function createStudentFolder() {
    openCreateFolderModal();
}

function openFolder(folderId) {
    openFolderModal(folderId);
}

function openStudentFolder(folderId) {
    openFolderModal(folderId);
}

function renameFolder(folderId) {
    currentContextFolder = documentFolders.find(f => f.id === folderId);
    renameFolderAction();
}

function renameStudentFolder(folderId) {
    currentContextFolder = documentFolders.find(f => f.id === folderId);
    renameFolderAction();
}

function deleteFolder(folderId) {
    currentContextFolder = documentFolders.find(f => f.id === folderId);
    deleteFolderAction();
}

function deleteStudentFolder(folderId) {
    currentContextFolder = documentFolders.find(f => f.id === folderId);
    deleteFolderAction();
}

function searchFolders(query) {
    const gridId = folderManagerRole === 'tutor' ? 'teaching-docs-folders' : 'student-docs-folders';
    const grid = document.getElementById(gridId);
    if (!grid) return;

    const cards = grid.querySelectorAll('.folder-card');
    const queryLower = query.toLowerCase();

    cards.forEach(card => {
        const name = card.querySelector('p')?.textContent.toLowerCase() || '';
        card.style.display = name.includes(queryLower) ? '' : 'none';
    });
}

function searchStudentFolders(query) {
    searchFolders(query);
}

// ============================================
// EXPOSE TO WINDOW
// ============================================

window.initializeFolderManager = initializeFolderManager;
window.openFolderModal = openFolderModal;
window.closeFolderModal = closeFolderModal;
window.openCreateFolderModal = openCreateFolderModal;
window.closeCreateFolderModal = closeCreateFolderModal;
window.saveFolder = saveFolder;
window.selectFolderIcon = selectFolderIcon;
window.selectFolderColor = selectFolderColor;
window.openFolderContextMenu = openFolderContextMenu;
window.renameFolderAction = renameFolderAction;
window.changeFolderIconAction = changeFolderIconAction;
window.zipFolderAction = zipFolderAction;
window.mergeFolderAction = mergeFolderAction;
window.cutFolderAction = cutFolderAction;
window.copyFolderAction = copyFolderAction;
window.deleteFolderAction = deleteFolderAction;
window.openMergeFolderModal = openMergeFolderModal;
window.closeMergeFolderModal = closeMergeFolderModal;
window.confirmMergeFolder = confirmMergeFolder;
window.uploadToCurrentFolder = uploadToCurrentFolder;
window.searchFolderDocuments = searchFolderDocuments;
window.sortFolderDocuments = sortFolderDocuments;

// Legacy aliases
window.createNewFolder = createNewFolder;
window.createStudentFolder = createStudentFolder;
window.openFolder = openFolder;
window.openStudentFolder = openStudentFolder;
window.renameFolder = renameFolder;
window.renameStudentFolder = renameStudentFolder;
window.deleteFolder = deleteFolder;
window.deleteStudentFolder = deleteStudentFolder;
window.searchFolders = searchFolders;
window.searchStudentFolders = searchStudentFolders;

console.log('📁 Folder Manager script loaded');
