/**
 * Notes Manager - Handles notes editor modal functionality
 * Provides rich text editing, voice/video recording, transcription, and text-to-speech
 */

const NotesManager = {
    // State
    notes: [],
    currentNoteIndex: null,
    autoSaveTimeout: null,
    wordCountInterval: null,
    pendingChanges: false,

    // Media Recording State
    mediaRecorder: null,
    audioChunks: [],
    videoChunks: [],
    recordingTimer: null,
    recordingStartTime: 0,
    audioStream: null,
    videoStream: null,
    currentCamera: 'user',
    recordedBlob: null,

    // Transcription State
    recognition: null,
    isTranscribing: false,

    // TTS State
    synth: window.speechSynthesis,
    utterance: null,
    isSpeaking: false,

    // Suggestions Data
    tutors: [
        'Dr. Alice Johnson', 'Prof. Bob Smith', 'Ms. Clara Williams',
        'Mr. David Brown', 'Dr. Emma Davis', 'Prof. Michael Chen',
        'Dr. Sarah Martinez', 'Mr. James Wilson'
    ],
    courses: [
        'Mathematics 101', 'Physics 201', 'Chemistry 301',
        'Biology 101', 'Computer Science 201', 'History 101',
        'English Literature', 'Economics 201', 'Psychology 101', 'Statistics 301'
    ],

    // Background mapping
    backgroundMap: {
        'math': '../pictures/Math wallpaper 1.jpeg',
        'physics': '../pictures/Physics wall paper 1.jpeg',
        'biology': '../pictures/Biology wallpaper 1.jpeg',
        'chemistry': '../pictures/chemistry wall paper 2.jpeg',
        'geography': '../pictures/Geography wallpaper 1.jpeg',
        'history': '../pictures/History wallpaper 1.jpeg',
        'music': '../pictures/Music.jpeg'
    },

    // ============================================
    // INITIALIZATION
    // ============================================

    init() {
        this.loadNotes();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupAutocomplete();
        this.populateTTSVoices();
    },

    loadNotes() {
        const stored = localStorage.getItem('astegni_notes');
        if (stored) {
            this.notes = JSON.parse(stored);
        }
    },

    saveNotesToStorage() {
        localStorage.setItem('astegni_notes', JSON.stringify(this.notes));
    },

    setupEventListeners() {
        // Close button
        const closeBtn = document.getElementById('notesCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Back button
        const backBtn = document.getElementById('notesBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.backToDashboard());
        }

        // Save button
        const saveBtn = document.getElementById('notesSaveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveNote());
        }

        // Favorite button
        const favoriteBtn = document.getElementById('notesFavoriteBtn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => this.toggleFavorite());
        }

        // Delete button
        const deleteBtn = document.getElementById('notesDeleteBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteCurrentNote());
        }

        // Duplicate button
        const duplicateBtn = document.getElementById('notesDuplicateBtn');
        if (duplicateBtn) {
            duplicateBtn.addEventListener('click', () => this.duplicateNote());
        }

        // Export dropdown
        const exportBtn = document.getElementById('notesExportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.toggleExportMenu());
        }

        // Toggle sidebar
        const toggleSidebarBtn = document.getElementById('notesToggleSidebar');
        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener('click', () => this.toggleHistorySidebar());
        }

        // Highlight button
        const highlightBtn = document.getElementById('notesHighlightBtn');
        if (highlightBtn) {
            highlightBtn.addEventListener('click', () => this.showHighlightColors());
        }

        // History search
        const historySearch = document.getElementById('notesHistorySearch');
        if (historySearch) {
            historySearch.addEventListener('input', (e) => this.searchHistory(e.target.value));
        }

        // Auto-save on input
        const formInputs = ['noteTitleInput', 'noteDateInput', 'noteCourseInput', 'noteTutorInput', 'noteTagsInput'];
        formInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.triggerAutoSave());
            }
        });

        // Content editor
        const contentEditor = document.getElementById('noteContentEditor');
        if (contentEditor) {
            contentEditor.addEventListener('input', () => {
                this.updateWordCount();
                this.triggerAutoSave();
            });

            contentEditor.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text/plain');
                document.execCommand('insertText', false, text);
                this.updateWordCount();
                this.triggerAutoSave();
            });
        }

        // TTS sliders
        const ttsRate = document.getElementById('notesTTSRate');
        if (ttsRate) {
            ttsRate.addEventListener('input', (e) => {
                document.getElementById('notesTTSRateValue').textContent = e.target.value + 'x';
            });
        }

        const ttsPitch = document.getElementById('notesTTSPitch');
        if (ttsPitch) {
            ttsPitch.addEventListener('input', (e) => {
                document.getElementById('notesTTSPitchValue').textContent = e.target.value;
            });
        }

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notes-dropdown')) {
                const exportMenu = document.getElementById('notesExportMenu');
                if (exportMenu) exportMenu.classList.remove('show');
            }
            if (!e.target.closest('.notes-highlight-wrapper')) {
                const highlightColors = document.getElementById('notesHighlightColors');
                if (highlightColors) highlightColors.classList.remove('show');
            }
        });
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('notesEditorModal');
            if (!modal || !modal.classList.contains('active')) return;

            if (e.key === 'Escape') {
                // Check if sub-modals are open
                const subModals = [
                    'notesVoiceRecorderModal', 'notesVideoRecorderModal',
                    'notesTranscriptionModal', 'notesTTSModal', 'notesBackgroundModal'
                ];
                let closedSubModal = false;
                subModals.forEach(id => {
                    const subModal = document.getElementById(id);
                    if (subModal && subModal.classList.contains('show')) {
                        subModal.classList.remove('show');
                        closedSubModal = true;
                    }
                });
                if (!closedSubModal) {
                    this.cancelEdit();
                }
            }

            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        this.saveNote();
                        break;
                    case 'b':
                        e.preventDefault();
                        this.formatText('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.formatText('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.formatText('underline');
                        break;
                    case 'd':
                        e.preventDefault();
                        this.duplicateNote();
                        break;
                }
            }
        });
    },

    setupAutocomplete() {
        this.setupAutocompleteForInput('noteCourseInput', 'notesCourseSuggestions', this.courses);
        this.setupAutocompleteForInput('noteTutorInput', 'notesTutorSuggestions', this.tutors);
    },

    setupAutocompleteForInput(inputId, suggestionsId, dataList) {
        const input = document.getElementById(inputId);
        const suggestionsDiv = document.getElementById(suggestionsId);

        if (!input || !suggestionsDiv) return;

        input.addEventListener('input', () => {
            const query = input.value.toLowerCase();
            suggestionsDiv.innerHTML = '';

            if (query) {
                // Filter from predefined list
                const filtered = dataList.filter(item => item.toLowerCase().includes(query));

                // Add from existing notes
                const field = inputId === 'noteCourseInput' ? 'course' : 'tutor';
                const fromNotes = [...new Set(this.notes.map(n => n[field]).filter(Boolean))];
                const combined = [...new Set([...filtered, ...fromNotes.filter(e => e.toLowerCase().includes(query))])];

                if (combined.length > 0) {
                    suggestionsDiv.classList.add('show');
                    combined.slice(0, 5).forEach(item => {
                        const suggestion = document.createElement('div');
                        suggestion.className = 'notes-suggestion-item';
                        suggestion.textContent = item;
                        suggestion.onclick = () => {
                            input.value = item;
                            suggestionsDiv.classList.remove('show');
                            this.triggerAutoSave();
                        };
                        suggestionsDiv.appendChild(suggestion);
                    });
                } else {
                    suggestionsDiv.classList.remove('show');
                }
            } else {
                suggestionsDiv.classList.remove('show');
            }
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                suggestionsDiv.classList.remove('show');
            }
        });
    },

    // ============================================
    // MODAL MANAGEMENT
    // ============================================

    openModal(noteIndex = null) {
        this.loadNotes();
        const modal = document.getElementById('notesEditorModal');
        if (modal) {
            modal.classList.add('active');

            if (noteIndex !== null && noteIndex >= 0 && noteIndex < this.notes.length) {
                this.currentNoteIndex = noteIndex;
                this.loadNoteToEditor(this.notes[noteIndex]);
                document.getElementById('notesEditorTitle').textContent = 'Edit Note';
            } else {
                this.currentNoteIndex = null;
                this.clearEditor();
                document.getElementById('notesEditorTitle').textContent = 'New Note';
            }

            this.renderHistorySidebar();
            this.startWordCountUpdates();
        }
    },

    closeModal() {
        if (this.pendingChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
                return;
            }
        }

        const modal = document.getElementById('notesEditorModal');
        if (modal) {
            modal.classList.remove('active');
        }

        this.stopWordCountUpdates();
        this.cleanup();
    },

    backToDashboard() {
        if (this.pendingChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to go back?')) {
                return;
            }
        }

        this.closeModal();

        // Trigger panel update if NotesPanelManager exists
        if (typeof NotesPanelManager !== 'undefined') {
            NotesPanelManager.renderDashboard();
            NotesPanelManager.updateStats();
        }
    },

    cleanup() {
        clearTimeout(this.autoSaveTimeout);
        clearInterval(this.wordCountInterval);
        this.pendingChanges = false;

        // Stop any ongoing recordings
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }

        // Stop TTS
        if (this.synth.speaking) {
            this.synth.cancel();
        }

        // Stop transcription
        if (this.recognition) {
            this.recognition.stop();
            this.isTranscribing = false;
        }
    },

    // ============================================
    // NOTE CRUD OPERATIONS
    // ============================================

    loadNoteToEditor(note) {
        document.getElementById('noteTitleInput').value = note.title || '';
        document.getElementById('noteDateInput').value = note.date || '';
        document.getElementById('noteCourseInput').value = note.course || '';
        document.getElementById('noteTutorInput').value = note.tutor || '';
        document.getElementById('noteTagsInput').value = note.tags || '';

        const contentEditor = document.getElementById('noteContentEditor');
        contentEditor.innerHTML = note.content || '';

        // Set background
        if (note.background) {
            const bgUrl = this.backgroundMap[note.background] || note.background;
            contentEditor.style.backgroundImage = `url('${bgUrl}')`;
            contentEditor.classList.add('has-background');
            contentEditor.dataset.background = note.background;
        } else {
            contentEditor.style.backgroundImage = '';
            contentEditor.classList.remove('has-background');
            contentEditor.dataset.background = '';
        }

        // Update favorite button
        const favoriteBtn = document.getElementById('notesFavoriteBtn');
        if (note.favorite) {
            favoriteBtn.classList.add('active');
        } else {
            favoriteBtn.classList.remove('active');
        }

        // Load media if exists
        if (note.media && note.media.length > 0) {
            this.loadMediaToEditor(note.media);
        } else {
            this.clearMediaContainer();
        }

        this.updateWordCount();
        this.pendingChanges = false;
    },

    clearEditor() {
        document.getElementById('noteTitleInput').value = '';
        document.getElementById('noteDateInput').value = new Date().toISOString().slice(0, 16);
        document.getElementById('noteCourseInput').value = '';
        document.getElementById('noteTutorInput').value = '';
        document.getElementById('noteTagsInput').value = '';

        const contentEditor = document.getElementById('noteContentEditor');
        contentEditor.innerHTML = '';
        contentEditor.style.backgroundImage = '';
        contentEditor.classList.remove('has-background');
        contentEditor.dataset.background = '';

        const favoriteBtn = document.getElementById('notesFavoriteBtn');
        favoriteBtn.classList.remove('active');

        this.clearMediaContainer();
        this.updateWordCount();
        this.pendingChanges = false;
    },

    clearMediaContainer() {
        const container = document.getElementById('notesMediaContainer');
        const items = document.getElementById('notesMediaItems');
        if (container) container.classList.remove('has-media');
        if (items) items.innerHTML = '';
    },

    collectNoteData() {
        const mediaItems = document.querySelectorAll('#notesMediaItems .notes-media-item audio, #notesMediaItems .notes-media-item video');
        const mediaData = [];

        mediaItems.forEach(item => {
            mediaData.push({
                type: item.tagName.toLowerCase(),
                src: item.src,
                timestamp: item.parentElement.querySelector('.notes-media-timestamp')?.textContent || ''
            });
        });

        const contentEditor = document.getElementById('noteContentEditor');

        return {
            id: this.currentNoteIndex !== null ? this.notes[this.currentNoteIndex].id : Date.now(),
            title: document.getElementById('noteTitleInput').value || 'Untitled Note',
            date: document.getElementById('noteDateInput').value,
            course: document.getElementById('noteCourseInput').value,
            tutor: document.getElementById('noteTutorInput').value,
            tags: document.getElementById('noteTagsInput').value,
            content: contentEditor.innerHTML,
            background: contentEditor.dataset.background || '',
            media: mediaData,
            hasMedia: mediaData.length > 0,
            favorite: this.currentNoteIndex !== null ? this.notes[this.currentNoteIndex].favorite : false,
            wordCount: this.countWords(contentEditor.innerText),
            created: this.currentNoteIndex !== null ? this.notes[this.currentNoteIndex].created : new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
    },

    saveNote() {
        const noteData = this.collectNoteData();

        if (this.currentNoteIndex !== null) {
            this.notes[this.currentNoteIndex] = noteData;
        } else {
            this.notes.unshift(noteData);
            this.currentNoteIndex = 0;
        }

        this.saveNotesToStorage();
        this.pendingChanges = false;

        this.showSaveStatus('success', 'Note saved successfully!');
        document.getElementById('notesLastSaved').textContent = `Last saved: ${new Date().toLocaleTimeString()}`;

        this.renderHistorySidebar();
    },

    saveAndClose() {
        this.saveNote();
        setTimeout(() => {
            this.backToDashboard();
        }, 500);
    },

    cancelEdit() {
        this.backToDashboard();
    },

    deleteCurrentNote() {
        if (this.currentNoteIndex === null) {
            this.backToDashboard();
            return;
        }

        if (confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
            this.notes.splice(this.currentNoteIndex, 1);
            this.saveNotesToStorage();
            this.showSaveStatus('success', 'Note deleted');
            setTimeout(() => {
                this.backToDashboard();
            }, 500);
        }
    },

    duplicateNote() {
        const noteData = this.collectNoteData();
        noteData.id = Date.now();
        noteData.title = (noteData.title || 'Untitled') + ' (Copy)';
        noteData.favorite = false;
        noteData.created = new Date().toISOString();
        noteData.lastModified = new Date().toISOString();

        this.notes.unshift(noteData);
        this.saveNotesToStorage();

        this.currentNoteIndex = 0;
        document.getElementById('noteTitleInput').value = noteData.title;
        this.showSaveStatus('success', 'Note duplicated');
        this.renderHistorySidebar();
    },

    toggleFavorite() {
        if (this.currentNoteIndex !== null) {
            this.notes[this.currentNoteIndex].favorite = !this.notes[this.currentNoteIndex].favorite;
            this.saveNotesToStorage();

            const favoriteBtn = document.getElementById('notesFavoriteBtn');
            if (this.notes[this.currentNoteIndex].favorite) {
                favoriteBtn.classList.add('active');
                this.showSaveStatus('success', 'Added to favorites');
            } else {
                favoriteBtn.classList.remove('active');
                this.showSaveStatus('success', 'Removed from favorites');
            }
        }
    },

    // ============================================
    // AUTO-SAVE
    // ============================================

    triggerAutoSave() {
        this.pendingChanges = true;
        const indicator = document.getElementById('notesAutoSaveIndicator');
        if (indicator) {
            indicator.classList.add('saving');
        }

        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.performAutoSave();
        }, 2000);
    },

    performAutoSave() {
        if (!this.pendingChanges) return;

        const noteData = this.collectNoteData();

        if (this.currentNoteIndex !== null) {
            this.notes[this.currentNoteIndex] = noteData;
            this.saveNotesToStorage();
        } else {
            // Save as draft for new notes
            localStorage.setItem('astegni_notes_draft', JSON.stringify(noteData));
        }

        this.pendingChanges = false;
        const indicator = document.getElementById('notesAutoSaveIndicator');
        if (indicator) {
            indicator.classList.remove('saving');
        }

        document.getElementById('notesLastSaved').textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
        this.showSaveStatus('success', 'Auto-saved');
    },

    // ============================================
    // WORD COUNT
    // ============================================

    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    },

    updateWordCount() {
        const content = document.getElementById('noteContentEditor');
        const text = content.innerText || '';
        const words = this.countWords(text);
        const chars = text.length;

        document.getElementById('notesWordCount').textContent = `${words} word${words !== 1 ? 's' : ''}`;
        document.getElementById('notesCharCount').textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
    },

    startWordCountUpdates() {
        this.updateWordCount();
        clearInterval(this.wordCountInterval);
        this.wordCountInterval = setInterval(() => this.updateWordCount(), 1000);
    },

    stopWordCountUpdates() {
        clearInterval(this.wordCountInterval);
    },

    // ============================================
    // FORMATTING
    // ============================================

    formatText(command, value = null) {
        document.execCommand(command, false, value);
        document.getElementById('noteContentEditor').focus();
        this.updateWordCount();
        this.triggerAutoSave();
    },

    showHighlightColors() {
        const colors = document.getElementById('notesHighlightColors');
        colors.classList.toggle('show');
    },

    toggleExportMenu() {
        const menu = document.getElementById('notesExportMenu');
        menu.classList.toggle('show');
    },

    // ============================================
    // HISTORY SIDEBAR
    // ============================================

    toggleHistorySidebar() {
        const sidebar = document.getElementById('notesHistorySidebar');
        sidebar.classList.toggle('collapsed');
    },

    renderHistorySidebar() {
        const container = document.getElementById('notesHistoryCards');
        if (!container) return;

        container.innerHTML = '';

        // Put current note first if editing
        let orderedNotes = [];
        if (this.currentNoteIndex === null) {
            orderedNotes.push({ id: 'new', title: 'New Note', date: new Date().toISOString(), isNew: true });
            orderedNotes.push(...this.notes);
        } else {
            orderedNotes.push(this.notes[this.currentNoteIndex]);
            this.notes.forEach((note, index) => {
                if (index !== this.currentNoteIndex) {
                    orderedNotes.push(note);
                }
            });
        }

        orderedNotes.forEach((note, i) => {
            const card = document.createElement('div');
            card.className = 'notes-history-card';
            if (i === 0) card.classList.add('active');

            const date = new Date(note.date || note.created).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });

            const tags = note.tags ? note.tags.split(',').slice(0, 2).map(tag =>
                `<span class="notes-history-card-tag">${tag.trim()}</span>`
            ).join('') : '';

            card.innerHTML = `
                <div class="notes-history-card-content">
                    <div class="notes-history-card-title">${note.title || 'Untitled'}</div>
                    <div class="notes-history-card-meta">
                        ${date} ${note.course ? `• ${note.course}` : ''}
                    </div>
                    ${tags ? `<div class="notes-history-card-tags">${tags}</div>` : ''}
                </div>
            `;

            if (!note.isNew) {
                const noteIndex = this.notes.findIndex(n => n.id === note.id);
                card.onclick = () => this.switchToNote(noteIndex, card);
            }

            container.appendChild(card);
        });
    },

    switchToNote(index, cardElement) {
        // Save current note first
        if (this.pendingChanges) {
            this.performAutoSave();
        }

        this.currentNoteIndex = index;
        this.loadNoteToEditor(this.notes[index]);
        document.getElementById('notesEditorTitle').textContent = 'Edit Note';

        // Update active state
        document.querySelectorAll('.notes-history-card').forEach(card => {
            card.classList.remove('active');
        });
        cardElement.classList.add('active');
    },

    searchHistory(query) {
        const cards = document.querySelectorAll('.notes-history-card');
        query = query.toLowerCase();

        cards.forEach(card => {
            const content = card.textContent.toLowerCase();
            card.style.display = content.includes(query) ? '' : 'none';
        });
    },

    // ============================================
    // SAVE STATUS
    // ============================================

    showSaveStatus(type, message) {
        const status = document.getElementById('notesSaveStatus');
        if (!status) return;

        status.textContent = message;
        status.className = `notes-save-status ${type}`;

        if (type !== 'saving') {
            setTimeout(() => {
                status.className = 'notes-save-status';
            }, 3000);
        }
    },

    // ============================================
    // EXPORT FUNCTIONS
    // ============================================

    exportAsPDF() {
        try {
            if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
                alert('PDF library not loaded. Please try again.');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const title = document.getElementById('noteTitleInput').value || 'Untitled Note';
            const content = document.getElementById('noteContentEditor').innerText;

            doc.setFontSize(20);
            doc.text(title, 20, 20);

            doc.setFontSize(12);
            const lines = doc.splitTextToSize(content, 170);
            let yPos = 35;

            lines.forEach(line => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(line, 20, yPos);
                yPos += 7;
            });

            doc.save(`${title}.pdf`);
            this.showSaveStatus('success', 'PDF exported successfully');
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.showSaveStatus('error', 'Failed to export PDF');
        }
    },

    exportAsWord() {
        try {
            const title = document.getElementById('noteTitleInput').value || 'Untitled Note';
            const content = document.getElementById('noteContentEditor').innerHTML;

            const htmlContent = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
                <head><meta charset='utf-8'><title>${title}</title></head>
                <body><h1>${title}</h1>${content}</body>
                </html>
            `;

            const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title}.doc`;
            a.click();
            URL.revokeObjectURL(url);

            this.showSaveStatus('success', 'Word document exported');
        } catch (error) {
            console.error('Error exporting Word:', error);
            this.showSaveStatus('error', 'Failed to export Word document');
        }
    },

    exportAsMarkdown() {
        try {
            const title = document.getElementById('noteTitleInput').value || 'Untitled Note';
            const content = document.getElementById('noteContentEditor');

            let markdown = `# ${title}\n\n`;
            let html = content.innerHTML;
            html = html.replace(/<b>(.*?)<\/b>/g, '**$1**');
            html = html.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
            html = html.replace(/<i>(.*?)<\/i>/g, '*$1*');
            html = html.replace(/<em>(.*?)<\/em>/g, '*$1*');
            html = html.replace(/<br>/g, '\n');
            html = html.replace(/<\/p>/g, '\n\n');
            html = html.replace(/<[^>]+>/g, '');
            markdown += html;

            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title}.md`;
            a.click();
            URL.revokeObjectURL(url);

            this.showSaveStatus('success', 'Markdown exported');
        } catch (error) {
            console.error('Error exporting Markdown:', error);
            this.showSaveStatus('error', 'Failed to export Markdown');
        }
    },

    exportAsHTML() {
        try {
            const title = document.getElementById('noteTitleInput').value || 'Untitled Note';
            const content = document.getElementById('noteContentEditor').innerHTML;

            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        h1 { color: #F59E0B; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${content}
</body>
</html>
            `;

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title}.html`;
            a.click();
            URL.revokeObjectURL(url);

            this.showSaveStatus('success', 'HTML exported');
        } catch (error) {
            console.error('Error exporting HTML:', error);
            this.showSaveStatus('error', 'Failed to export HTML');
        }
    },

    // ============================================
    // BACKGROUND
    // ============================================

    openBackgroundModal() {
        document.getElementById('notesBackgroundModal').classList.add('show');
    },

    closeBackgroundModal() {
        document.getElementById('notesBackgroundModal').classList.remove('show');
    },

    setBackground(background) {
        const contentEditor = document.getElementById('noteContentEditor');
        const bgUrl = this.backgroundMap[background] || background;

        contentEditor.style.backgroundImage = `url('${bgUrl}')`;
        contentEditor.classList.add('has-background');
        contentEditor.dataset.background = background;

        this.closeBackgroundModal();
        this.triggerAutoSave();
    },

    uploadBackground() {
        const fileInput = document.getElementById('notesUploadBackground');
        const file = fileInput.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.setBackground(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    },

    removeBackground() {
        const contentEditor = document.getElementById('noteContentEditor');
        contentEditor.style.backgroundImage = '';
        contentEditor.classList.remove('has-background');
        contentEditor.dataset.background = '';
        this.triggerAutoSave();
    },

    // ============================================
    // VOICE RECORDING
    // ============================================

    async openVoiceRecorder() {
        document.getElementById('notesVoiceRecorderModal').classList.add('show');
        try {
            this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.initializeWaveform();
        } catch (err) {
            console.error('Error accessing microphone:', err);
            document.getElementById('notesVoiceStatus').textContent = 'Microphone access denied';
            document.getElementById('notesVoiceStatus').classList.add('error');
        }
    },

    closeVoiceRecorder() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        document.getElementById('notesVoiceRecorderModal').classList.remove('show');
        this.resetVoiceRecorder();
    },

    toggleVoiceRecording() {
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
            this.startVoiceRecording();
        } else if (this.mediaRecorder.state === 'recording') {
            this.pauseVoiceRecording();
        } else if (this.mediaRecorder.state === 'paused') {
            this.resumeVoiceRecording();
        }
    },

    async startVoiceRecording() {
        this.audioChunks = [];

        if (!this.audioStream) {
            try {
                this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (err) {
                console.error('Error accessing microphone:', err);
                return;
            }
        }

        this.mediaRecorder = new MediaRecorder(this.audioStream);

        this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            this.recordedBlob = audioBlob;
            const audioUrl = URL.createObjectURL(audioBlob);
            const playback = document.getElementById('notesVoicePlayback');
            playback.src = audioUrl;
            playback.style.display = 'block';
            document.getElementById('notesSaveVoiceBtn').disabled = false;
        };

        this.mediaRecorder.start();
        this.startRecordingTimer('Voice');

        const recordBtn = document.getElementById('notesVoiceRecordBtn');
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = '<span class="record-icon"><i class="fas fa-circle"></i></span> Recording...';
        document.getElementById('notesVoicePauseBtn').disabled = false;
        document.getElementById('notesVoiceStopBtn').disabled = false;
        document.getElementById('notesVoiceStatus').textContent = 'Recording in progress...';
    },

    pauseVoiceRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
            clearInterval(this.recordingTimer);
            document.getElementById('notesVoiceRecordBtn').innerHTML = '<span class="record-icon"><i class="fas fa-play"></i></span> Resume';
            document.getElementById('notesVoicePauseBtn').disabled = true;
            document.getElementById('notesVoiceStatus').textContent = 'Recording paused';
        }
    },

    resumeVoiceRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
            this.startRecordingTimer('Voice', true);
            document.getElementById('notesVoiceRecordBtn').innerHTML = '<span class="record-icon"><i class="fas fa-circle"></i></span> Recording...';
            document.getElementById('notesVoicePauseBtn').disabled = false;
            document.getElementById('notesVoiceStatus').textContent = 'Recording resumed...';
        }
    },

    stopVoiceRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            clearInterval(this.recordingTimer);
            const recordBtn = document.getElementById('notesVoiceRecordBtn');
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '<span class="record-icon"><i class="fas fa-circle"></i></span> Start Recording';
            document.getElementById('notesVoicePauseBtn').disabled = true;
            document.getElementById('notesVoiceStopBtn').disabled = true;
            document.getElementById('notesVoiceStatus').textContent = 'Recording complete';
            document.getElementById('notesVoiceStatus').classList.add('success');
        }
    },

    saveVoiceNote() {
        if (!this.recordedBlob) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            this.addMediaToNote('audio', reader.result);
            this.closeVoiceRecorder();
        };
        reader.readAsDataURL(this.recordedBlob);
    },

    resetVoiceRecorder() {
        this.recordedBlob = null;
        this.audioChunks = [];
        document.getElementById('notesVoiceTimer').textContent = '00:00';
        document.getElementById('notesVoicePlayback').style.display = 'none';
        document.getElementById('notesSaveVoiceBtn').disabled = true;
        document.getElementById('notesVoiceStatus').textContent = 'Ready to record';
        document.getElementById('notesVoiceStatus').classList.remove('error', 'success');
        const recordBtn = document.getElementById('notesVoiceRecordBtn');
        recordBtn.classList.remove('recording');
        recordBtn.innerHTML = '<span class="record-icon"><i class="fas fa-circle"></i></span> Start Recording';
    },

    initializeWaveform() {
        const canvas = document.getElementById('notesVoiceWaveform');
        if (!canvas || !this.audioStream) return;

        const ctx = canvas.getContext('2d');
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(this.audioStream);

        source.connect(analyser);
        analyser.fftSize = 256;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);

            ctx.fillStyle = 'rgba(245, 158, 11, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                ctx.fillStyle = `rgb(245, ${158 + barHeight / 2}, 11)`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };

        draw();
    },

    // ============================================
    // VIDEO RECORDING
    // ============================================

    async openVideoRecorder() {
        document.getElementById('notesVideoRecorderModal').classList.add('show');
        try {
            const constraints = {
                video: { facingMode: this.currentCamera },
                audio: true
            };
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            const preview = document.getElementById('notesVideoPreview');
            preview.srcObject = this.videoStream;
        } catch (err) {
            console.error('Error accessing camera:', err);
            document.getElementById('notesVideoStatus').textContent = 'Camera access denied';
            document.getElementById('notesVideoStatus').classList.add('error');
        }
    },

    closeVideoRecorder() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
        document.getElementById('notesVideoRecorderModal').classList.remove('show');
        this.resetVideoRecorder();
    },

    toggleVideoRecording() {
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
            this.startVideoRecording();
        } else if (this.mediaRecorder.state === 'recording') {
            this.pauseVideoRecording();
        } else if (this.mediaRecorder.state === 'paused') {
            this.resumeVideoRecording();
        }
    },

    async startVideoRecording() {
        this.videoChunks = [];

        if (!this.videoStream) {
            try {
                const constraints = {
                    video: { facingMode: this.currentCamera },
                    audio: true
                };
                this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                document.getElementById('notesVideoPreview').srcObject = this.videoStream;
            } catch (err) {
                console.error('Error accessing camera:', err);
                return;
            }
        }

        this.mediaRecorder = new MediaRecorder(this.videoStream);

        this.mediaRecorder.ondataavailable = (event) => {
            this.videoChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
            const videoBlob = new Blob(this.videoChunks, { type: 'video/webm' });
            this.recordedBlob = videoBlob;
            const videoUrl = URL.createObjectURL(videoBlob);
            const playback = document.getElementById('notesVideoPlayback');
            playback.src = videoUrl;
            playback.style.display = 'block';
            document.getElementById('notesVideoPreview').style.display = 'none';
            document.getElementById('notesSaveVideoBtn').disabled = false;
        };

        this.mediaRecorder.start();
        this.startRecordingTimer('Video');

        const recordBtn = document.getElementById('notesVideoRecordBtn');
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = '<span class="record-icon"><i class="fas fa-circle"></i></span> Recording...';
        document.getElementById('notesVideoPauseBtn').disabled = false;
        document.getElementById('notesVideoStopBtn').disabled = false;
        document.getElementById('notesVideoStatus').textContent = 'Recording in progress...';
    },

    pauseVideoRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
            clearInterval(this.recordingTimer);
            document.getElementById('notesVideoRecordBtn').innerHTML = '<span class="record-icon"><i class="fas fa-play"></i></span> Resume';
            document.getElementById('notesVideoPauseBtn').disabled = true;
            document.getElementById('notesVideoStatus').textContent = 'Recording paused';
        }
    },

    resumeVideoRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
            this.startRecordingTimer('Video', true);
            document.getElementById('notesVideoRecordBtn').innerHTML = '<span class="record-icon"><i class="fas fa-circle"></i></span> Recording...';
            document.getElementById('notesVideoPauseBtn').disabled = false;
            document.getElementById('notesVideoStatus').textContent = 'Recording resumed...';
        }
    },

    stopVideoRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            clearInterval(this.recordingTimer);
            const recordBtn = document.getElementById('notesVideoRecordBtn');
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '<span class="record-icon"><i class="fas fa-circle"></i></span> Start Recording';
            document.getElementById('notesVideoPauseBtn').disabled = true;
            document.getElementById('notesVideoStopBtn').disabled = true;
            document.getElementById('notesVideoStatus').textContent = 'Recording complete';
            document.getElementById('notesVideoStatus').classList.add('success');
        }
    },

    saveVideoNote() {
        if (!this.recordedBlob) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            this.addMediaToNote('video', reader.result);
            this.closeVideoRecorder();
        };
        reader.readAsDataURL(this.recordedBlob);
    },

    async switchCamera() {
        this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';

        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
        }

        try {
            const constraints = {
                video: { facingMode: this.currentCamera },
                audio: true
            };
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            document.getElementById('notesVideoPreview').srcObject = this.videoStream;
        } catch (err) {
            console.error('Error switching camera:', err);
        }
    },

    resetVideoRecorder() {
        this.recordedBlob = null;
        this.videoChunks = [];
        document.getElementById('notesVideoTimer').textContent = '00:00';
        document.getElementById('notesVideoPlayback').style.display = 'none';
        document.getElementById('notesVideoPreview').style.display = 'block';
        document.getElementById('notesSaveVideoBtn').disabled = true;
        document.getElementById('notesVideoStatus').textContent = 'Camera ready';
        document.getElementById('notesVideoStatus').classList.remove('error', 'success');
        const recordBtn = document.getElementById('notesVideoRecordBtn');
        recordBtn.classList.remove('recording');
        recordBtn.innerHTML = '<span class="record-icon"><i class="fas fa-circle"></i></span> Start Recording';
    },

    startRecordingTimer(type, resume = false) {
        if (!resume) {
            this.recordingStartTime = Date.now();
        }

        this.recordingTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            document.getElementById(`notes${type}Timer`).textContent = `${minutes}:${seconds}`;
        }, 100);
    },

    // ============================================
    // MEDIA MANAGEMENT
    // ============================================

    addMediaToNote(type, data) {
        const container = document.getElementById('notesMediaContainer');
        const itemsContainer = document.getElementById('notesMediaItems');

        container.classList.add('has-media');

        const mediaItem = document.createElement('div');
        mediaItem.className = 'notes-media-item';

        const timestamp = new Date().toLocaleString();

        if (type === 'audio') {
            mediaItem.innerHTML = `
                <span class="notes-media-item-type">Voice</span>
                <button class="notes-media-item-delete" onclick="NotesManager.deleteMediaItem(this)">×</button>
                <audio controls src="${data}"></audio>
                <div class="notes-media-timestamp">${timestamp}</div>
            `;
        } else if (type === 'video') {
            mediaItem.innerHTML = `
                <span class="notes-media-item-type">Video</span>
                <button class="notes-media-item-delete" onclick="NotesManager.deleteMediaItem(this)">×</button>
                <video controls src="${data}" style="width: 100%; max-width: 300px;"></video>
                <div class="notes-media-timestamp">${timestamp}</div>
            `;
        }

        itemsContainer.appendChild(mediaItem);
        this.triggerAutoSave();
    },

    deleteMediaItem(button) {
        const mediaItem = button.parentElement;
        mediaItem.remove();

        const container = document.getElementById('notesMediaContainer');
        const remainingItems = container.querySelectorAll('.notes-media-item');

        if (remainingItems.length === 0) {
            container.classList.remove('has-media');
        }

        this.triggerAutoSave();
    },

    loadMediaToEditor(mediaData) {
        if (!mediaData || mediaData.length === 0) return;

        const container = document.getElementById('notesMediaContainer');
        const itemsContainer = document.getElementById('notesMediaItems');

        container.classList.add('has-media');
        itemsContainer.innerHTML = '';

        mediaData.forEach(item => {
            const mediaItem = document.createElement('div');
            mediaItem.className = 'notes-media-item';

            if (item.type === 'audio') {
                mediaItem.innerHTML = `
                    <span class="notes-media-item-type">Voice</span>
                    <button class="notes-media-item-delete" onclick="NotesManager.deleteMediaItem(this)">×</button>
                    <audio controls src="${item.src}"></audio>
                    <div class="notes-media-timestamp">${item.timestamp}</div>
                `;
            } else if (item.type === 'video') {
                mediaItem.innerHTML = `
                    <span class="notes-media-item-type">Video</span>
                    <button class="notes-media-item-delete" onclick="NotesManager.deleteMediaItem(this)">×</button>
                    <video controls src="${item.src}" style="width: 100%; max-width: 300px;"></video>
                    <div class="notes-media-timestamp">${item.timestamp}</div>
                `;
            }

            itemsContainer.appendChild(mediaItem);
        });
    },

    // ============================================
    // TRANSCRIPTION
    // ============================================

    openTranscription() {
        document.getElementById('notesTranscriptionModal').classList.add('show');
    },

    closeTranscription() {
        if (this.recognition) {
            this.recognition.stop();
            this.isTranscribing = false;
        }
        document.getElementById('notesTranscriptionModal').classList.remove('show');
    },

    toggleTranscription() {
        if (this.isTranscribing) {
            this.stopTranscription();
        } else {
            this.startTranscription();
        }
    },

    startTranscription() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in this browser. Please use Chrome.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = document.getElementById('notesContinuousTranscription').checked;
        this.recognition.interimResults = true;
        this.recognition.lang = document.getElementById('notesTranscriptionLang').value;

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            const textDiv = document.getElementById('notesTranscriptionText');
            textDiv.innerHTML = textDiv.innerHTML.replace(/<span class="interim">.*?<\/span>/g, '') +
                               finalTranscript +
                               '<span class="interim" style="color: #888;">' + interimTranscript + '</span>';
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            document.getElementById('notesTranscriptionStatus').textContent = 'Error: ' + event.error;
        };

        this.recognition.onend = () => {
            if (this.isTranscribing && document.getElementById('notesContinuousTranscription').checked) {
                this.recognition.start();
            } else {
                this.isTranscribing = false;
                document.getElementById('notesStartTranscribeBtn').innerHTML = '<i class="fas fa-microphone"></i> Start Listening';
                document.querySelector('.notes-voice-wave').style.animation = 'none';
            }
        };

        this.recognition.start();
        this.isTranscribing = true;
        document.getElementById('notesStartTranscribeBtn').innerHTML = '<i class="fas fa-stop"></i> Stop Listening';
        document.getElementById('notesTranscriptionStatus').textContent = 'Listening...';
        document.querySelector('.notes-voice-wave').style.animation = '';
    },

    stopTranscription() {
        if (this.recognition) {
            this.isTranscribing = false;
            this.recognition.stop();
        }
    },

    clearTranscription() {
        document.getElementById('notesTranscriptionText').innerHTML = '';
    },

    insertTranscription() {
        const text = document.getElementById('notesTranscriptionText').innerText;
        if (text.trim()) {
            const contentEditor = document.getElementById('noteContentEditor');
            contentEditor.innerHTML += '<p>' + text + '</p>';
            this.updateWordCount();
            this.triggerAutoSave();
        }
        this.closeTranscription();
    },

    // ============================================
    // TEXT TO SPEECH
    // ============================================

    openTextToSpeech() {
        document.getElementById('notesTTSModal').classList.add('show');
        this.populateTTSVoices();
    },

    closeTextToSpeech() {
        if (this.synth.speaking) {
            this.synth.cancel();
        }
        document.getElementById('notesTTSModal').classList.remove('show');
    },

    populateTTSVoices() {
        const voiceSelect = document.getElementById('notesTTSVoice');
        if (!voiceSelect) return;

        const populateVoices = () => {
            const voices = this.synth.getVoices();
            voiceSelect.innerHTML = '';

            voices.forEach((voice, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${voice.name} (${voice.lang})`;
                voiceSelect.appendChild(option);
            });
        };

        populateVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoices;
        }
    },

    useNoteContent() {
        const noteContent = document.getElementById('noteContentEditor').innerText;
        document.getElementById('notesTTSText').value = noteContent;
    },

    playTextToSpeech() {
        const text = document.getElementById('notesTTSText').value;
        if (!text.trim()) {
            alert('Please enter some text to speak.');
            return;
        }

        if (this.synth.speaking && this.synth.paused) {
            this.synth.resume();
            return;
        }

        this.utterance = new SpeechSynthesisUtterance(text);

        const voices = this.synth.getVoices();
        const voiceIndex = document.getElementById('notesTTSVoice').value;
        if (voices[voiceIndex]) {
            this.utterance.voice = voices[voiceIndex];
        }

        this.utterance.rate = parseFloat(document.getElementById('notesTTSRate').value);
        this.utterance.pitch = parseFloat(document.getElementById('notesTTSPitch').value);

        this.utterance.onstart = () => {
            this.isSpeaking = true;
            document.getElementById('notesTTSPlayBtn').innerHTML = '<i class="fas fa-play"></i> Playing...';
            document.getElementById('notesTTSPauseBtn').disabled = false;
            document.getElementById('notesTTSStopBtn').disabled = false;
            document.getElementById('notesTTSStatus').textContent = 'Speaking...';
        };

        this.utterance.onend = () => {
            this.isSpeaking = false;
            document.getElementById('notesTTSPlayBtn').innerHTML = '<i class="fas fa-play"></i> Play';
            document.getElementById('notesTTSPauseBtn').disabled = true;
            document.getElementById('notesTTSStopBtn').disabled = true;
            document.getElementById('notesTTSStatus').textContent = 'Finished';
            document.getElementById('notesTTSProgress').style.width = '100%';
        };

        this.utterance.onerror = (event) => {
            console.error('TTS error:', event);
            document.getElementById('notesTTSStatus').textContent = 'Error occurred';
        };

        this.synth.speak(this.utterance);
    },

    pauseTextToSpeech() {
        if (this.synth.speaking && !this.synth.paused) {
            this.synth.pause();
            document.getElementById('notesTTSPlayBtn').innerHTML = '<i class="fas fa-play"></i> Resume';
            document.getElementById('notesTTSStatus').textContent = 'Paused';
        }
    },

    stopTextToSpeech() {
        this.synth.cancel();
        this.isSpeaking = false;
        document.getElementById('notesTTSPlayBtn').innerHTML = '<i class="fas fa-play"></i> Play';
        document.getElementById('notesTTSPauseBtn').disabled = true;
        document.getElementById('notesTTSStopBtn').disabled = true;
        document.getElementById('notesTTSStatus').textContent = 'Stopped';
        document.getElementById('notesTTSProgress').style.width = '0%';
    },

    saveAsAudioNote() {
        // Note: Browser TTS cannot directly export to audio file
        // This would require server-side processing or Web Audio API recording
        alert('Audio export requires server-side processing. The spoken text has been added to your note content.');
        const text = document.getElementById('notesTTSText').value;
        if (text.trim()) {
            const contentEditor = document.getElementById('noteContentEditor');
            contentEditor.innerHTML += '<p><em>[TTS Content]</em> ' + text + '</p>';
            this.updateWordCount();
            this.triggerAutoSave();
        }
        this.closeTextToSpeech();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    NotesManager.init();
});
