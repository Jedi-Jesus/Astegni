/**
 * Advanced Notes Manager - Backend API Version
 * Manages notes functionality with cloud sync via backend API
 *
 * Features:
 * - Cloud-synced notes across devices
 * - Rich text editor modal
 * - Voice/Video recording upload to Backblaze B2
 * - Speech-to-text transcription
 * - Text-to-speech
 * - Background customization
 * - Auto-save to backend
 * - Full-text search
 * - Export to PDF, Word, Markdown, HTML
 */

const NotesManager = {
  // API Configuration
  API_BASE_URL: window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://api.astegni.com',

  // State
  notes: [],
  currentNoteIndex: null,
  currentNoteId: null,
  autoSaveTimeout: null,
  wordCountInterval: null,
  pendingChanges: false,
  isLoading: false,

  // Media recording state
  mediaRecorder: null,
  audioChunks: [],
  videoChunks: [],
  recordingTimer: null,
  recordingStartTime: 0,
  audioStream: null,
  videoStream: null,
  currentCamera: 'user',
  recordedBlob: null,

  // Speech recognition
  recognition: null,
  isTranscribing: false,

  // Text-to-speech
  synth: window.speechSynthesis,
  currentUtterance: null,

  // Cache for autocomplete
  tutorsCache: [],
  coursesCache: [],

  // Background image mapping
  backgroundMap: {
    'math': '../../pictures/Math wallpaper 1.jpeg',
    'physics': '../../pictures/Physics wall paper 1.jpeg',
    'biology': '../../pictures/Biology wallpaper 1.jpeg',
    'chemistry': '../../pictures/chemistry wall paper 2.jpeg',
    'geography': '../../pictures/Geography wallpaper 1.jpeg',
    'history': '../../pictures/History wallpaper 1.jpeg',
    'music': '../../pictures/Music.jpeg'
  },

  // ============================================
  // INITIALIZATION
  // ============================================

  async init() {
    await this.loadNotes();
    this.renderDashboard();
    await this.updateStats();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    await this.setupAutocomplete();
    this.initializeAutoSave();
    this.populateVoices();
    console.log('NotesManager initialized with backend API');
  },

  // ============================================
  // API HELPERS
  // ============================================

  getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated. Please log in.');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  },

  async apiRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.showError('Session expired. Please log in again.');
          // Optionally redirect to login
          // window.location.href = '/index.html';
          throw new Error('Unauthorized');
        }
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `Request failed: ${response.status}`);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  },

  // ============================================
  // DATA MANAGEMENT (BACKEND)
  // ============================================

  async loadNotes() {
    try {
      this.isLoading = true;
      this.showLoadingState('Loading notes...');

      const notes = await this.apiRequest('/api/notes/?limit=100&sort_by=date_desc');

      // Transform backend response to match existing format
      this.notes = notes.map(note => ({
        id: note.id,
        title: note.title,
        date: note.date,
        course: note.course || '',
        tutor: note.tutor || '',
        tags: note.tags || '',
        content: note.content || '',
        background: note.background || '',
        backgroundUrl: note.background_url || '',
        favorite: note.is_favorite,
        wordCount: note.word_count,
        hasMedia: note.has_media,
        media: [], // Will load on demand
        created: note.created_at,
        lastModified: note.last_modified
      }));

      this.hideLoadingState();
      this.isLoading = false;
      console.log(`Loaded ${this.notes.length} notes from backend`);
    } catch (error) {
      this.hideLoadingState();
      this.isLoading = false;
      this.showError('Failed to load notes: ' + error.message);
      console.error('Load notes error:', error);
      // Keep empty notes array
      this.notes = [];
    }
  },

  async saveNote() {
    const noteData = this.collectNoteData();

    try {
      let savedNote;

      if (this.currentNoteId) {
        // Update existing note
        savedNote = await this.apiRequest(`/api/notes/${this.currentNoteId}`, {
          method: 'PUT',
          body: JSON.stringify(noteData)
        });

        // Update in local array
        const index = this.notes.findIndex(n => n.id === this.currentNoteId);
        if (index !== -1) {
          this.notes[index] = this.transformNoteFromAPI(savedNote);
          this.currentNoteIndex = index;
        }
      } else {
        // Create new note
        savedNote = await this.apiRequest('/api/notes/', {
          method: 'POST',
          body: JSON.stringify(noteData)
        });

        // Add to local array
        this.notes.unshift(this.transformNoteFromAPI(savedNote));
        this.currentNoteIndex = 0;
        this.currentNoteId = savedNote.id;
      }

      this.showSaveStatus('success', 'Note saved to cloud');
      this.pendingChanges = false;
      this.renderHistorySidebar(this.currentNoteIndex);
      await this.updateStats();

    } catch (error) {
      this.showSaveStatus('error', 'Failed to save: ' + error.message);
      console.error('Save error:', error);
    }
  },

  async deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await this.apiRequest(`/api/notes/${noteId}`, {
        method: 'DELETE'
      });

      // Remove from local array
      this.notes = this.notes.filter(n => n.id !== noteId);

      this.renderDashboard();
      await this.updateStats();
      this.showSuccess('Note deleted successfully');

    } catch (error) {
      this.showError('Failed to delete note: ' + error.message);
      console.error('Delete error:', error);
    }
  },

  async toggleFavorite() {
    if (!this.currentNoteId) return;

    try {
      const updatedNote = await this.apiRequest(`/api/notes/${this.currentNoteId}/favorite`, {
        method: 'PATCH'
      });

      // Update local state
      const index = this.notes.findIndex(n => n.id === this.currentNoteId);
      if (index !== -1) {
        this.notes[index].favorite = updatedNote.is_favorite;
        this.currentNoteIndex = index;
      }

      // Update UI
      const favoriteBtn = document.getElementById('favoriteBtn');
      if (favoriteBtn) {
        favoriteBtn.innerHTML = updatedNote.is_favorite
          ? '<i class="fas fa-star" style="color: gold;"></i>'
          : '<i class="fas fa-star"></i>';
      }

      this.renderDashboard();

    } catch (error) {
      this.showError('Failed to toggle favorite: ' + error.message);
      console.error('Toggle favorite error:', error);
    }
  },

  async duplicateNote() {
    if (!this.currentNoteId) return;

    try {
      const duplicatedNote = await this.apiRequest(`/api/notes/${this.currentNoteId}/duplicate`, {
        method: 'POST'
      });

      // Add to local array
      this.notes.unshift(this.transformNoteFromAPI(duplicatedNote));

      this.renderDashboard();
      await this.updateStats();
      this.showSuccess('Note duplicated successfully');

    } catch (error) {
      this.showError('Failed to duplicate note: ' + error.message);
      console.error('Duplicate error:', error);
    }
  },

  // ============================================
  // MEDIA UPLOAD (BACKEND)
  // ============================================

  async saveVoiceNote() {
    if (!this.recordedBlob || !this.currentNoteId) return;

    try {
      const formData = new FormData();
      formData.append('file', this.recordedBlob, 'voice.webm');
      formData.append('media_type', 'audio');

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${this.API_BASE_URL}/api/notes/${this.currentNoteId}/media?media_type=audio`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const media = await response.json();
      console.log('Voice note uploaded:', media);

      // Update note's hasMedia flag
      const index = this.notes.findIndex(n => n.id === this.currentNoteId);
      if (index !== -1) {
        this.notes[index].hasMedia = true;
      }

      this.closeVoiceRecorder();
      this.showSuccess('Voice note uploaded successfully');

    } catch (error) {
      this.showError('Failed to upload voice note: ' + error.message);
      console.error('Voice upload error:', error);
    }
  },

  async saveVideoNote() {
    if (!this.recordedBlob || !this.currentNoteId) return;

    try {
      const formData = new FormData();
      formData.append('file', this.recordedBlob, 'video.webm');
      formData.append('media_type', 'video');

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${this.API_BASE_URL}/api/notes/${this.currentNoteId}/media?media_type=video`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const media = await response.json();
      console.log('Video note uploaded:', media);

      // Update note's hasMedia flag
      const index = this.notes.findIndex(n => n.id === this.currentNoteId);
      if (index !== -1) {
        this.notes[index].hasMedia = true;
      }

      this.closeVideoRecorder();
      this.showSuccess('Video note uploaded successfully');

    } catch (error) {
      this.showError('Failed to upload video note: ' + error.message);
      console.error('Video upload error:', error);
    }
  },

  // ============================================
  // STATISTICS (BACKEND)
  // ============================================

  async updateStats() {
    try {
      const stats = await this.apiRequest('/api/notes/stats');

      // Update dashboard stats
      const statsContainer = document.getElementById('notesStats');
      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-file-alt"></i></div>
            <div class="stat-content">
              <div class="stat-value">${stats.total_notes}</div>
              <div class="stat-label">Total Notes</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-book"></i></div>
            <div class="stat-content">
              <div class="stat-value">${stats.total_courses}</div>
              <div class="stat-label">Courses</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-star"></i></div>
            <div class="stat-content">
              <div class="stat-value">${stats.favorite_notes}</div>
              <div class="stat-label">Favorites</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon"><i class="fas fa-microphone"></i></div>
            <div class="stat-content">
              <div class="stat-value">${stats.notes_with_media}</div>
              <div class="stat-label">With Media</div>
            </div>
          </div>
        `;
      }

    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  },

  // ============================================
  // AUTOCOMPLETE (BACKEND)
  // ============================================

  async setupAutocomplete() {
    try {
      // Load courses and tutors from backend
      this.coursesCache = await this.apiRequest('/api/notes/courses');
      this.tutorsCache = await this.apiRequest('/api/notes/tutors');

      console.log(`Loaded ${this.coursesCache.length} courses and ${this.tutorsCache.length} tutors`);
    } catch (error) {
      console.error('Failed to load autocomplete data:', error);
      // Fallback to empty arrays
      this.coursesCache = [];
      this.tutorsCache = [];
    }

    // Setup autocomplete listeners (keep existing implementation)
    const courseInput = document.getElementById('noteCourse');
    const tutorInput = document.getElementById('noteTutor');

    if (courseInput) {
      courseInput.addEventListener('input', () => this.showSuggestions('course', courseInput.value));
      courseInput.addEventListener('focus', () => this.showSuggestions('course', courseInput.value));
    }

    if (tutorInput) {
      tutorInput.addEventListener('input', () => this.showSuggestions('tutor', tutorInput.value));
      tutorInput.addEventListener('focus', () => this.showSuggestions('tutor', tutorInput.value));
    }
  },

  showSuggestions(type, query) {
    const data = type === 'course' ? this.coursesCache : this.tutorsCache;
    const dropdown = document.getElementById(type === 'course' ? 'courseSuggestions' : 'tutorSuggestions');

    if (!dropdown) return;

    const filtered = query
      ? data.filter(item => item.toLowerCase().includes(query.toLowerCase()))
      : data;

    if (filtered.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    dropdown.innerHTML = filtered.slice(0, 5).map(item => `
      <div class="suggestion-item" onclick="NotesManager.selectSuggestion('${type}', '${item.replace(/'/g, "\\'")}')">${item}</div>
    `).join('');

    dropdown.style.display = 'block';
  },

  selectSuggestion(type, value) {
    const input = document.getElementById(type === 'course' ? 'noteCourse' : 'noteTutor');
    const dropdown = document.getElementById(type === 'course' ? 'courseSuggestions' : 'tutorSuggestions');

    if (input) input.value = value;
    if (dropdown) dropdown.style.display = 'none';
  },

  // ============================================
  // HELPER METHODS
  // ============================================

  transformNoteFromAPI(apiNote) {
    return {
      id: apiNote.id,
      title: apiNote.title,
      date: apiNote.date,
      course: apiNote.course || '',
      tutor: apiNote.tutor || '',
      tags: apiNote.tags || '',
      content: apiNote.content || '',
      background: apiNote.background || '',
      backgroundUrl: apiNote.background_url || '',
      favorite: apiNote.is_favorite,
      wordCount: apiNote.word_count,
      hasMedia: apiNote.has_media,
      media: apiNote.media || [],
      created: apiNote.created_at,
      lastModified: apiNote.last_modified
    };
  },

  collectNoteData() {
    const titleInput = document.getElementById('noteTitle');
    const dateInput = document.getElementById('noteDate');
    const courseInput = document.getElementById('noteCourse');
    const tutorInput = document.getElementById('noteTutor');
    const tagsInput = document.getElementById('noteTags');
    const contentEditor = document.getElementById('noteContent');

    const content = contentEditor ? contentEditor.innerHTML : '';
    const wordCount = this.countWords(content);

    return {
      title: titleInput?.value || 'Untitled Note',
      date: dateInput?.value || new Date().toISOString(),
      course: courseInput?.value || '',
      tutor: tutorInput?.value || '',
      tags: tagsInput?.value || '',
      content: content,
      background: this.currentBackground || '',
      background_url: this.currentBackgroundUrl || '',
      is_favorite: false, // Will be toggled separately
      word_count: wordCount
    };
  },

  countWords(html) {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').filter(word => word.length > 0).length : 0;
  },

  showLoadingState(message) {
    const dashboard = document.getElementById('notesDashboard');
    if (dashboard) {
      dashboard.innerHTML = `
        <div class="loading-state">
          <i class="fas fa-spinner fa-spin fa-3x"></i>
          <p>${message}</p>
        </div>
      `;
    }
  },

  hideLoadingState() {
    // Will be replaced by renderDashboard()
  },

  showSaveStatus(type, message) {
    const indicator = document.getElementById('lastSaved');
    if (!indicator) return;

    indicator.textContent = message;
    indicator.style.color = type === 'success' ? 'var(--success-color)' : 'var(--danger-color)';

    setTimeout(() => {
      indicator.style.color = '';
    }, 3000);
  },

  showSuccess(message) {
    // Use existing notification system or create simple alert
    if (window.showNotification) {
      window.showNotification(message, 'success');
    } else {
      console.log('SUCCESS:', message);
    }
  },

  showError(message) {
    // Use existing notification system or create simple alert
    if (window.showNotification) {
      window.showNotification(message, 'error');
    } else {
      console.error('ERROR:', message);
      alert(message);
    }
  },

  // IMPORTANT: Keep all existing methods from the original file:
  // - renderDashboard()
  // - openEditor()
  // - closeEditor()
  // - formatText()
  // - All media recording functions
  // - All transcription functions
  // - All TTS functions
  // - Export functions
  // etc.

  // These are not changed, just the data persistence layer

  // Original localStorage methods - DEPRECATED (keep for migration)
  saveNotesToStorage() {
    console.warn('saveNotesToStorage() is deprecated. Notes are now saved to backend API.');
  },

  loadNotesFromStorage() {
    console.warn('loadNotesFromStorage() is deprecated. Use loadNotes() instead.');
  }
};

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NotesManager.init());
} else {
  NotesManager.init();
}
