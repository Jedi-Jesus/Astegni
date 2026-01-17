/**
 * Advanced Notes Manager
 * Manages notes functionality for profile pages (tutor, student, parent)
 *
 * Features:
 * - Dashboard view with notes grid
 * - Rich text editor modal
 * - Voice/Video recording
 * - Speech-to-text transcription
 * - Text-to-speech
 * - Background customization
 * - Auto-save functionality
 * - Export to PDF, Word, Markdown, HTML
 */

const NotesManager = {
  // API Configuration
  API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
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

  // Suggestions data
  tutors: [
    'Dr. Alice Johnson',
    'Prof. Bob Smith',
    'Ms. Clara Williams',
    'Mr. David Brown',
    'Dr. Emma Davis',
    'Prof. Michael Chen',
    'Dr. Sarah Martinez',
    'Mr. James Wilson'
  ],

  courses: [
    'Mathematics 101',
    'Physics 201',
    'Chemistry 301',
    'Biology 101',
    'Computer Science 201',
    'History 101',
    'English Literature',
    'Economics 201',
    'Psychology 101',
    'Statistics 301'
  ],

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
    this.updateStats();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.setupAutocomplete();
    this.initializeAutoSave();
    this.populateVoices();
    console.log('NotesManager initialized with backend API');
  },

  // ============================================
  // DATA MANAGEMENT
  // ============================================

  async loadNotes() {
    try {
      this.isLoading = true;
      // Try multiple token keys for compatibility
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');

      if (!token) {
        console.warn('No auth token found. User needs to log in.');
        console.log('Available localStorage keys:', Object.keys(localStorage));
        this.notes = [];
        this.isLoading = false;
        return;
      }

      const response = await fetch(`${this.API_BASE_URL}/api/notes/?limit=100&sort_by=date_desc`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Session expired. Please log in again.');
          this.notes = [];
          this.isLoading = false;
          return;
        }
        throw new Error(`Failed to load notes: ${response.status}`);
      }

      const notes = await response.json();

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
        media: [],
        created: note.created_at,
        lastModified: note.last_modified
      }));

      this.isLoading = false;
      console.log(`Loaded ${this.notes.length} notes from backend`);
    } catch (error) {
      this.isLoading = false;
      console.error('Load notes error:', error);
      this.notes = [];
    }
  },

  saveNotesToStorage() {
    console.warn('saveNotesToStorage() is deprecated. Notes are saved to backend automatically.');
  },

  generateSampleNotes() {
    return [
      {
        id: Date.now() - 10000,
        title: 'Introduction to Calculus',
        date: '2024-01-15T10:00',
        course: 'Mathematics 101',
        tutor: 'Dr. Alice Johnson',
        tags: 'calculus, derivatives, exam',
        content: '<h3>Key Concepts in Differential Calculus</h3><p>Understanding the fundamentals of derivatives and their applications...</p>',
        background: '',
        favorite: true,
        wordCount: 156,
        hasMedia: false,
        media: [],
        created: new Date(Date.now() - 10000).toISOString(),
        lastModified: new Date(Date.now() - 5000).toISOString()
      },
      {
        id: Date.now() - 20000,
        title: 'Physics Lab Report',
        date: '2024-01-14T14:30',
        course: 'Physics 201',
        tutor: 'Prof. Bob Smith',
        tags: 'lab, experiment, report',
        content: '<h3>Experiment on Pendulum Motion</h3><p>Observing the relationship between length and period...</p>',
        background: '',
        favorite: false,
        wordCount: 243,
        hasMedia: false,
        media: [],
        created: new Date(Date.now() - 20000).toISOString(),
        lastModified: new Date(Date.now() - 15000).toISOString()
      },
      {
        id: Date.now() - 30000,
        title: 'Chemistry Equations',
        date: '2024-01-13T09:15',
        course: 'Chemistry 301',
        tutor: 'Dr. Clara Williams',
        tags: 'equations, balancing, practice',
        content: '<h3>Important Chemical Equations</h3><ul><li>H2 + O2 → H2O</li><li>2Na + Cl2 → 2NaCl</li></ul>',
        background: 'chemistry',
        favorite: false,
        wordCount: 89,
        hasMedia: false,
        media: [],
        created: new Date(Date.now() - 30000).toISOString(),
        lastModified: new Date(Date.now() - 25000).toISOString()
      }
    ];
  },

  // ============================================
  // DASHBOARD / PANEL FUNCTIONS
  // ============================================

  updateStats() {
    const totalNotesEl = document.getElementById('totalNotes');
    const totalWordsEl = document.getElementById('totalWords');
    const totalCoursesEl = document.getElementById('totalCourses');
    const recentNotesEl = document.getElementById('recentNotes');

    if (totalNotesEl) totalNotesEl.textContent = this.notes.length;

    const totalWords = this.notes.reduce((sum, note) => sum + (note.wordCount || 0), 0);
    if (totalWordsEl) totalWordsEl.textContent = this.formatNumber(totalWords);

    const courses = [...new Set(this.notes.map(n => n.course).filter(Boolean))];
    if (totalCoursesEl) totalCoursesEl.textContent = courses.length;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentNotes = this.notes.filter(n => new Date(n.lastModified || n.created) > weekAgo);
    if (recentNotesEl) recentNotesEl.textContent = recentNotes.length;
  },

  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  renderDashboard() {
    const grid = document.getElementById('notesGrid');
    if (!grid) return;

    // Clear existing cards except the new note card
    const existingCards = grid.querySelectorAll('.note-card:not(.new-note)');
    existingCards.forEach(card => card.remove());

    // Sort notes
    const sortedNotes = this.sortNotesArray([...this.notes]);

    // Add note cards
    sortedNotes.forEach((note, index) => {
      const actualIndex = this.notes.findIndex(n => n.id === note.id);
      const card = this.createNoteCard(note, actualIndex);
      grid.appendChild(card);
    });
  },

  sortNotesArray(notesArray) {
    const sortSelect = document.getElementById('sortSelect');
    const sortBy = sortSelect ? sortSelect.value : 'date-desc';

    switch(sortBy) {
      case 'date-desc':
        return notesArray.sort((a, b) => new Date(b.lastModified || b.created) - new Date(a.lastModified || a.created));
      case 'date-asc':
        return notesArray.sort((a, b) => new Date(a.lastModified || a.created) - new Date(b.lastModified || b.created));
      case 'title':
        return notesArray.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'course':
        return notesArray.sort((a, b) => (a.course || '').localeCompare(b.course || ''));
      default:
        return notesArray;
    }
  },

  createNoteCard(note, index) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.index = index;
    card.onclick = () => this.openNote(index);

    // Add background if exists
    if (note.background) {
      const bgUrl = this.backgroundMap[note.background] || note.background;
      card.style.backgroundImage = `url('${bgUrl}')`;
      card.classList.add('has-background');
    }

    // Add media indicator classes
    if (note.hasMedia) {
      card.classList.add('has-media');
      if (note.media && note.media.some(m => m.type === 'video')) {
        card.classList.add('has-video');
      }
    }

    const date = new Date(note.date || note.created).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const tags = note.tags ? note.tags.split(',').map(tag =>
      `<span class="tag">${tag.trim()}</span>`
    ).join('') : '';

    // Extract plain text preview from HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = note.content || '';
    const preview = tempDiv.textContent.substring(0, 100) + (tempDiv.textContent.length > 100 ? '...' : '');

    card.innerHTML = `
      <div class="note-card-header">
        <div>
          <div class="note-title">${note.title || 'Untitled'}</div>
          <div class="note-date"><i class="fas fa-calendar-alt"></i> ${date}</div>
        </div>
        ${note.favorite ? '<span class="note-favorite"><i class="fas fa-star"></i></span>' : ''}
      </div>
      <div class="note-meta">
        ${note.course ? `<div class="note-meta-item"><i class="fas fa-book"></i> ${note.course}</div>` : ''}
        ${note.tutor ? `<div class="note-meta-item"><i class="fas fa-user"></i> ${note.tutor}</div>` : ''}
        ${note.wordCount ? `<div class="note-meta-item"><i class="fas fa-align-left"></i> ${note.wordCount} words</div>` : ''}
        ${note.hasMedia ? `<div class="note-meta-item"><i class="fas fa-microphone"></i> Media</div>` : ''}
      </div>
      ${preview ? `<div class="note-preview">${preview}</div>` : ''}
      ${tags ? `<div class="note-tags">${tags}</div>` : ''}
    `;

    return card;
  },

  searchNotes(query) {
    query = query.toLowerCase();
    const cards = document.querySelectorAll('.note-card:not(.new-note)');

    cards.forEach(card => {
      const index = parseInt(card.dataset.index);
      const note = this.notes[index];
      const searchText = `${note.title} ${note.course} ${note.tutor} ${note.tags} ${note.content}`.toLowerCase();
      card.style.display = searchText.includes(query) ? '' : 'none';
    });
  },

  filterNotes(filter, buttonElement) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (buttonElement) buttonElement.classList.add('active');

    const cards = document.querySelectorAll('.note-card:not(.new-note)');

    cards.forEach(card => {
      const index = parseInt(card.dataset.index);
      const note = this.notes[index];

      switch(filter) {
        case 'all':
          card.style.display = '';
          break;
        case 'recent':
          const isRecent = new Date(note.lastModified || note.created) >
                          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          card.style.display = isRecent ? '' : 'none';
          break;
        case 'favorites':
          card.style.display = note.favorite ? '' : 'none';
          break;
        case 'media':
          card.style.display = note.hasMedia ? '' : 'none';
          break;
      }
    });
  },

  sortNotes() {
    this.renderDashboard();
  },

  // ============================================
  // EDITOR MODAL FUNCTIONS
  // ============================================

  createNewNote() {
    this.currentNoteIndex = null;
    this.currentNoteId = null;
    this.clearEditor();
    this.openEditorModal();
    this.renderHistorySidebar(-1);
    this.startWordCountUpdates();

    const noteContent = document.getElementById('noteContent');
    if (noteContent) noteContent.focus();
  },

  openNote(index) {
    this.currentNoteIndex = index;
    this.currentNoteId = this.notes[index] ? this.notes[index].id : null;
    this.loadNoteToEditor(this.notes[index]);
    this.openEditorModal();
    this.renderHistorySidebar(index);
    this.startWordCountUpdates();
  },

  openEditorModal() {
    const modal = document.getElementById('notesEditorModal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }

    const title = document.getElementById('editorTitle');
    if (title) {
      title.textContent = this.currentNoteIndex === null ? 'New Note' : 'Edit Note';
    }
  },

  closeEditor() {
    if (this.hasUnsavedChanges()) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }

    this.closeEditorModal();
  },

  closeEditorModal() {
    const modal = document.getElementById('notesEditorModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }

    // Stop auto-save
    clearTimeout(this.autoSaveTimeout);
    clearInterval(this.wordCountInterval);

    // Refresh dashboard
    this.renderDashboard();
    this.updateStats();
  },

  loadNoteToEditor(note) {
    const titleEl = document.getElementById('noteTitle');
    const dateEl = document.getElementById('noteDate');
    const courseEl = document.getElementById('noteCourse');
    const tutorEl = document.getElementById('noteTutor');
    const tagsEl = document.getElementById('noteTags');
    const contentEl = document.getElementById('noteContent');
    const favoriteBtn = document.getElementById('favoriteBtn');

    if (titleEl) titleEl.value = note.title || '';
    if (dateEl) dateEl.value = note.date || '';
    if (courseEl) courseEl.value = note.course || '';
    if (tutorEl) tutorEl.value = note.tutor || '';
    if (tagsEl) tagsEl.value = note.tags || '';

    if (contentEl) {
      contentEl.innerHTML = note.content || '';

      // Set background if exists
      if (note.background) {
        const bgUrl = this.backgroundMap[note.background] || note.background;
        contentEl.style.backgroundImage = `url('${bgUrl}')`;
        contentEl.classList.add('has-background');
        contentEl.dataset.background = note.background;
      } else {
        contentEl.style.backgroundImage = '';
        contentEl.classList.remove('has-background');
        contentEl.dataset.background = '';
      }
    }

    // Update favorite button
    if (favoriteBtn) {
      if (note.favorite) {
        favoriteBtn.classList.add('active');
        favoriteBtn.innerHTML = '<i class="fas fa-star"></i> Favorited';
      } else {
        favoriteBtn.classList.remove('active');
        favoriteBtn.innerHTML = '<i class="fas fa-star"></i>';
      }
    }

    // Load media
    if (note.media && note.media.length > 0) {
      this.loadMediaToEditor(note.media);
    }

    this.updateWordCount();
  },

  clearEditor() {
    const titleEl = document.getElementById('noteTitle');
    const dateEl = document.getElementById('noteDate');
    const courseEl = document.getElementById('noteCourse');
    const tutorEl = document.getElementById('noteTutor');
    const tagsEl = document.getElementById('noteTags');
    const contentEl = document.getElementById('noteContent');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const mediaContainer = document.getElementById('mediaContainer');

    if (titleEl) titleEl.value = '';
    if (dateEl) dateEl.value = new Date().toISOString().slice(0, 16);
    if (courseEl) courseEl.value = '';
    if (tutorEl) tutorEl.value = '';
    if (tagsEl) tagsEl.value = '';

    if (contentEl) {
      contentEl.innerHTML = '';
      contentEl.style.backgroundImage = '';
      contentEl.classList.remove('has-background');
      contentEl.dataset.background = '';
    }

    if (favoriteBtn) {
      favoriteBtn.classList.remove('active');
      favoriteBtn.innerHTML = '<i class="fas fa-star"></i>';
    }

    if (mediaContainer) {
      mediaContainer.innerHTML = '';
      mediaContainer.classList.remove('has-media');
    }

    this.updateWordCount();
  },

  hasUnsavedChanges() {
    const titleEl = document.getElementById('noteTitle');
    const contentEl = document.getElementById('noteContent');

    if (this.currentNoteIndex === null) {
      return (titleEl && titleEl.value) || (contentEl && contentEl.innerHTML);
    } else {
      const note = this.notes[this.currentNoteIndex];
      return (titleEl && titleEl.value !== (note.title || '')) ||
             (contentEl && contentEl.innerHTML !== (note.content || ''));
    }
  },

  renderHistorySidebar(clickedIndex) {
    const historyCards = document.getElementById('historyCards');
    if (!historyCards) return;

    historyCards.innerHTML = '';

    // Create ordered list with clicked item first
    let orderedNotes = [];

    if (clickedIndex === -1) {
      orderedNotes.push({
        id: 'new',
        title: 'New Note',
        date: new Date().toISOString(),
        isNew: true
      });
      orderedNotes.push(...this.notes);
    } else {
      orderedNotes.push(this.notes[clickedIndex]);
      this.notes.forEach((note, index) => {
        if (index !== clickedIndex) {
          orderedNotes.push(note);
        }
      });
    }

    // Render history cards
    orderedNotes.forEach((note, i) => {
      const historyCard = document.createElement('div');
      historyCard.className = 'history-card';
      historyCard.style.animationDelay = `${i * 0.1}s`;

      if (i === 0) {
        historyCard.classList.add('active');
      }

      const date = new Date(note.date || note.created).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      const tags = note.tags ? note.tags.split(',').slice(0, 2).map(tag =>
        `<span class="history-card-tag">${tag.trim()}</span>`
      ).join('') : '';

      historyCard.innerHTML = `
        <div class="history-card-content">
          <div class="history-card-title">${note.title || 'Untitled'}</div>
          <div class="history-card-meta">
            <i class="fas fa-calendar-alt"></i> ${date} ${note.course ? `• ${note.course}` : ''}
          </div>
          ${tags ? `<div class="history-card-tags">${tags}</div>` : ''}
        </div>
      `;

      if (!note.isNew) {
        const noteIndex = this.notes.findIndex(n => n.id === note.id);
        historyCard.onclick = () => this.switchHistoryNote(noteIndex, historyCard);
      }

      historyCards.appendChild(historyCard);
    });
  },

  switchHistoryNote(index, cardElement) {
    // Save current note first
    if (this.hasUnsavedChanges()) {
      this.triggerAutoSave();
    }

    this.currentNoteIndex = index;
    this.loadNoteToEditor(this.notes[index]);

    // Update active state
    document.querySelectorAll('.history-card').forEach(card => {
      card.classList.remove('active');
    });
    cardElement.classList.add('active');
  },

  toggleHistorySidebar() {
    const sidebar = document.querySelector('.history-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
    }
  },

  // ============================================
  // SAVE / DELETE FUNCTIONS
  // ============================================

  async saveNote() {
    const noteData = this.collectNoteData();

    try {
      // Try multiple token keys for compatibility
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');

      if (!token) {
        console.error('No token found in localStorage');
        console.log('Available localStorage keys:', Object.keys(localStorage));
        alert('Please log in to save notes');
        return;
      }

      let savedNote;

      if (this.currentNoteId) {
        // Update existing note
        const response = await fetch(`${this.API_BASE_URL}/api/notes/${this.currentNoteId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(noteData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Update note failed:', response.status, errorText);
          throw new Error(`Failed to update note: ${response.status}`);
        }
        savedNote = await response.json();

        // Update in local array
        const index = this.notes.findIndex(n => n.id === this.currentNoteId);
        if (index !== -1) {
          this.notes[index] = this.transformNoteFromAPI(savedNote);
          this.currentNoteIndex = index;
        }
      } else {
        // Create new note
        const response = await fetch(`${this.API_BASE_URL}/api/notes/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(noteData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Create note failed:', response.status, errorText);
          throw new Error(`Failed to create note: ${response.status}`);
        }
        savedNote = await response.json();

        // Add to local array
        this.notes.unshift(this.transformNoteFromAPI(savedNote));
        this.currentNoteIndex = 0;
        this.currentNoteId = savedNote.id;
      }

      localStorage.removeItem('noteDraft');
      this.showSaveStatus('success', 'Note saved to cloud!');

      const lastSaved = document.getElementById('lastSaved');
      if (lastSaved) {
        lastSaved.textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
      }

      // Update history sidebar
      this.renderHistorySidebar(this.currentNoteIndex);
    } catch (error) {
      this.showSaveStatus('error', 'Failed to save: ' + error.message);
      console.error('Save error:', error);
    }
  },

  saveAndClose() {
    this.saveNote();
    setTimeout(() => {
      this.closeEditorModal();
    }, 500);
  },

  cancelEdit() {
    if (this.hasUnsavedChanges()) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        this.closeEditorModal();
      }
    } else {
      this.closeEditorModal();
    }
  },

  async deleteCurrentNote() {
    if (!this.currentNoteId) {
      this.closeEditorModal();
      return;
    }

    if (confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const response = await fetch(`${this.API_BASE_URL}/api/notes/${this.currentNoteId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to delete note');

        // Remove from local array
        this.notes = this.notes.filter(n => n.id !== this.currentNoteId);
        this.showSaveStatus('success', 'Note deleted');
        setTimeout(() => {
          this.closeEditorModal();
        }, 500);
      } catch (error) {
        alert('Failed to delete note: ' + error.message);
        console.error('Delete error:', error);
      }
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
    const titleEl = document.getElementById('noteTitle');
    if (titleEl) titleEl.value = noteData.title;

    this.showSaveStatus('success', 'Note duplicated');
    this.renderHistorySidebar(0);
  },

  async toggleFavorite() {
    if (!this.currentNoteId) return;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const response = await fetch(`${this.API_BASE_URL}/api/notes/${this.currentNoteId}/favorite`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to toggle favorite');
      const updatedNote = await response.json();

      // Update local state
      const index = this.notes.findIndex(n => n.id === this.currentNoteId);
      if (index !== -1) {
        this.notes[index].favorite = updatedNote.is_favorite;
      }

      // Update UI
      const favoriteBtn = document.getElementById('favoriteBtn');
      if (updatedNote.is_favorite) {
        if (favoriteBtn) {
          favoriteBtn.classList.add('active');
          favoriteBtn.innerHTML = '<i class="fas fa-star"></i> Favorited';
        }
        this.showSaveStatus('success', 'Added to favorites');
      } else {
        if (favoriteBtn) {
          favoriteBtn.classList.remove('active');
          favoriteBtn.innerHTML = '<i class="fas fa-star"></i>';
        }
        this.showSaveStatus('success', 'Removed from favorites');
      }

      this.renderDashboard();
    } catch (error) {
      alert('Failed to toggle favorite: ' + error.message);
      console.error('Toggle favorite error:', error);
    }
  },

  collectNoteData() {
    const titleEl = document.getElementById('noteTitle');
    const dateEl = document.getElementById('noteDate');
    const courseEl = document.getElementById('noteCourse');
    const tutorEl = document.getElementById('noteTutor');
    const tagsEl = document.getElementById('noteTags');
    const contentEl = document.getElementById('noteContent');

    const content = contentEl ? contentEl.innerHTML : '';
    const wordCount = this.countWords(contentEl ? contentEl.innerText : '');

    // Return format matching backend API
    return {
      title: titleEl ? titleEl.value || 'Untitled Note' : 'Untitled Note',
      date: dateEl ? (dateEl.value || new Date().toISOString()) : new Date().toISOString(),
      course: courseEl ? courseEl.value : '',
      tutor: tutorEl ? tutorEl.value : '',
      tags: tagsEl ? tagsEl.value : '',
      content: content,
      background: contentEl ? contentEl.dataset.background || '' : '',
      background_url: '',
      is_favorite: false, // Will be set separately via toggleFavorite
      word_count: wordCount
    };
  },

  // Transform backend API response to match frontend format
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

  // ============================================
  // AUTO-SAVE FUNCTIONALITY
  // ============================================

  initializeAutoSave() {
    // Save on window blur
    window.addEventListener('blur', () => {
      if (this.pendingChanges) {
        this.performAutoSave();
      }
    });

    // Save before closing
    window.addEventListener('beforeunload', (e) => {
      if (this.pendingChanges) {
        this.performAutoSave();
        e.preventDefault();
        e.returnValue = '';
      }
    });
  },

  triggerAutoSave() {
    this.pendingChanges = true;
    clearTimeout(this.autoSaveTimeout);

    const indicator = document.getElementById('autoSaveIndicator');
    if (indicator) {
      indicator.classList.add('saving');
    }

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
      localStorage.setItem('noteDraft', JSON.stringify(noteData));
    }

    this.pendingChanges = false;

    const indicator = document.getElementById('autoSaveIndicator');
    if (indicator) {
      indicator.classList.remove('saving');
    }

    const lastSaved = document.getElementById('lastSaved');
    if (lastSaved) {
      lastSaved.textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
    }

    this.showSaveStatus('success', 'Auto-saved');

    setTimeout(() => {
      const status = document.getElementById('save-status');
      if (status) status.className = 'save-status';
    }, 2000);
  },

  // ============================================
  // TEXT FORMATTING
  // ============================================

  formatText(command, value = null) {
    document.execCommand(command, false, value);
    const noteContent = document.getElementById('noteContent');
    if (noteContent) noteContent.focus();
    this.updateWordCount();
    this.triggerAutoSave();
  },

  showHighlightColors() {
    const colors = document.getElementById('highlightColors');
    if (colors) {
      colors.classList.toggle('show');

      if (colors.classList.contains('show')) {
        setTimeout(() => {
          document.addEventListener('click', function closeColors(e) {
            if (!e.target.closest('.highlight-colors') && !e.target.closest('.toolbar-btn')) {
              colors.classList.remove('show');
              document.removeEventListener('click', closeColors);
            }
          });
        }, 100);
      }
    }
  },

  updateWordCount() {
    const content = document.getElementById('noteContent');
    if (!content) return;

    const text = content.innerText || '';
    const words = this.countWords(text);
    const chars = text.length;

    const wordCountEl = document.getElementById('wordCount');
    const charCountEl = document.getElementById('charCount');

    if (wordCountEl) wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    if (charCountEl) charCountEl.textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
  },

  countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  },

  startWordCountUpdates() {
    this.updateWordCount();
    clearInterval(this.wordCountInterval);
    this.wordCountInterval = setInterval(() => this.updateWordCount(), 1000);
  },

  showSaveStatus(type, message) {
    const status = document.getElementById('save-status');
    if (!status) return;

    status.textContent = message;
    status.className = `save-status ${type}`;

    if (type !== 'saving') {
      setTimeout(() => {
        status.className = 'save-status';
      }, 3000);
    }
  },

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  toggleExportMenu() {
    const menu = document.getElementById('exportMenu');
    if (menu) {
      menu.classList.toggle('show');

      if (menu.classList.contains('show')) {
        setTimeout(() => {
          document.addEventListener('click', function closeMenu(e) {
            if (!e.target.closest('.dropdown')) {
              menu.classList.remove('show');
              document.removeEventListener('click', closeMenu);
            }
          });
        }, 100);
      }
    }
  },

  exportNoteAsPDF() {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const title = document.getElementById('noteTitle')?.value || 'Untitled Note';
      const date = document.getElementById('noteDate')?.value;
      const course = document.getElementById('noteCourse')?.value;
      const tutor = document.getElementById('noteTutor')?.value;
      const tags = document.getElementById('noteTags')?.value;
      const content = document.getElementById('noteContent')?.innerText;

      doc.setFontSize(20);
      doc.text(title, 20, 20);

      doc.setFontSize(12);
      let yPos = 35;

      if (date) {
        doc.text(`Date: ${new Date(date).toLocaleString()}`, 20, yPos);
        yPos += 10;
      }
      if (course) {
        doc.text(`Course: ${course}`, 20, yPos);
        yPos += 10;
      }
      if (tutor) {
        doc.text(`Tutor: ${tutor}`, 20, yPos);
        yPos += 10;
      }
      if (tags) {
        doc.text(`Tags: ${tags}`, 20, yPos);
        yPos += 10;
      }

      yPos += 10;
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(content, 170);

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

  exportNoteAsDoc() {
    try {
      const title = document.getElementById('noteTitle')?.value || 'Untitled Note';
      const content = document.getElementById('noteContent')?.innerHTML;

      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
        <head><meta charset='utf-8'><title>${title}</title></head>
        <body>
          <h1>${title}</h1>
          ${content}
        </body>
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
      console.error('Error exporting DOC:', error);
      this.showSaveStatus('error', 'Failed to export Word document');
    }
  },

  exportNoteAsMarkdown() {
    try {
      const title = document.getElementById('noteTitle')?.value || 'Untitled Note';
      const content = document.getElementById('noteContent');

      let markdown = `# ${title}\n\n`;

      let html = content?.innerHTML || '';
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

  exportNoteAsHTML() {
    try {
      const title = document.getElementById('noteTitle')?.value || 'Untitled Note';
      const content = document.getElementById('noteContent')?.innerHTML;

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
  // BACKGROUND FUNCTIONS
  // ============================================

  openBackgroundModal() {
    const modal = document.getElementById('backgroundModal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('show');
    }
  },

  closeBackgroundModal() {
    const modal = document.getElementById('backgroundModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  },

  setNoteBackground(background) {
    const noteContent = document.getElementById('noteContent');
    if (!noteContent) return;

    const bgUrl = this.backgroundMap[background] || background;

    noteContent.style.backgroundImage = `url('${bgUrl}')`;
    noteContent.classList.add('has-background');
    noteContent.dataset.background = background;

    this.closeBackgroundModal();
    this.triggerAutoSave();
  },

  uploadBackgroundImage() {
    const fileInput = document.getElementById('uploadBackground');
    const file = fileInput?.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.setNoteBackground(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  },

  removeNoteBackground() {
    const noteContent = document.getElementById('noteContent');
    if (!noteContent) return;

    noteContent.style.backgroundImage = '';
    noteContent.classList.remove('has-background');
    noteContent.dataset.background = '';
    this.triggerAutoSave();
  },

  // ============================================
  // VOICE RECORDING FUNCTIONS
  // ============================================

  async openVoiceRecorder() {
    const modal = document.getElementById('voiceRecorderModal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('show');
    }

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.initializeWaveform();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      const status = document.getElementById('voiceStatus');
      if (status) {
        status.textContent = 'Microphone access denied';
        status.classList.add('error');
      }
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
    const modal = document.getElementById('voiceRecorderModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
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
      const playback = document.getElementById('voicePlayback');
      if (playback) {
        playback.src = audioUrl;
        playback.style.display = 'block';
      }
      const saveBtn = document.getElementById('saveVoiceBtn');
      if (saveBtn) saveBtn.disabled = false;
    };

    this.mediaRecorder.start();
    this.startRecordingTimer('voice');

    const recordBtn = document.getElementById('voiceRecordBtn');
    if (recordBtn) {
      recordBtn.classList.add('recording');
      recordBtn.innerHTML = '<span class="record-icon"></span> Recording...';
    }

    const pauseBtn = document.getElementById('voicePauseBtn');
    const stopBtn = document.getElementById('voiceStopBtn');
    if (pauseBtn) pauseBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = false;

    const status = document.getElementById('voiceStatus');
    if (status) status.textContent = 'Recording in progress...';
  },

  pauseVoiceRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      clearInterval(this.recordingTimer);

      const recordBtn = document.getElementById('voiceRecordBtn');
      if (recordBtn) recordBtn.innerHTML = '<i class="fas fa-play"></i> Resume';

      const pauseBtn = document.getElementById('voicePauseBtn');
      if (pauseBtn) pauseBtn.disabled = true;

      const status = document.getElementById('voiceStatus');
      if (status) status.textContent = 'Recording paused';
    }
  },

  resumeVoiceRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.startRecordingTimer('voice', true);

      const recordBtn = document.getElementById('voiceRecordBtn');
      if (recordBtn) recordBtn.innerHTML = '<span class="record-icon"></span> Recording...';

      const pauseBtn = document.getElementById('voicePauseBtn');
      if (pauseBtn) pauseBtn.disabled = false;

      const status = document.getElementById('voiceStatus');
      if (status) status.textContent = 'Recording resumed...';
    }
  },

  stopVoiceRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      clearInterval(this.recordingTimer);

      const recordBtn = document.getElementById('voiceRecordBtn');
      if (recordBtn) {
        recordBtn.classList.remove('recording');
        recordBtn.innerHTML = '<span class="record-icon"></span> Start Recording';
      }

      const pauseBtn = document.getElementById('voicePauseBtn');
      const stopBtn = document.getElementById('voiceStopBtn');
      if (pauseBtn) pauseBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = true;

      const status = document.getElementById('voiceStatus');
      if (status) {
        status.textContent = 'Recording complete';
        status.classList.add('success');
      }
    }
  },

  async saveVoiceNote() {
    if (!this.recordedBlob) return;

    if (!this.currentNoteId) {
      alert('Please save the note first before adding voice recordings');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', this.recordedBlob, 'voice.webm');

      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
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

      if (!response.ok) throw new Error('Upload failed');

      const media = await response.json();
      console.log('Voice note uploaded:', media);

      // Update hasMedia flag
      const index = this.notes.findIndex(n => n.id === this.currentNoteId);
      if (index !== -1) {
        this.notes[index].hasMedia = true;
      }

      this.closeVoiceRecorder();
      alert('Voice note uploaded successfully!');
    } catch (error) {
      alert('Failed to upload voice note: ' + error.message);
      console.error('Voice upload error:', error);
    }
  },

  resetVoiceRecorder() {
    this.recordedBlob = null;
    this.audioChunks = [];

    const timer = document.getElementById('voiceTimer');
    const playback = document.getElementById('voicePlayback');
    const saveBtn = document.getElementById('saveVoiceBtn');
    const status = document.getElementById('voiceStatus');
    const recordBtn = document.getElementById('voiceRecordBtn');

    if (timer) timer.textContent = '00:00';
    if (playback) playback.style.display = 'none';
    if (saveBtn) saveBtn.disabled = true;
    if (status) {
      status.textContent = 'Ready to record';
      status.classList.remove('error', 'success');
    }
    if (recordBtn) recordBtn.classList.remove('recording');
  },

  initializeWaveform() {
    const canvas = document.getElementById('voiceWaveform');
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
  // VIDEO RECORDING FUNCTIONS
  // ============================================

  async openVideoRecorder() {
    const modal = document.getElementById('videoRecorderModal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('show');
    }

    try {
      const constraints = {
        video: { facingMode: this.currentCamera },
        audio: true
      };
      this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      const preview = document.getElementById('videoPreview');
      if (preview) preview.srcObject = this.videoStream;
    } catch (err) {
      console.error('Error accessing camera:', err);
      const status = document.getElementById('videoStatus');
      if (status) {
        status.textContent = 'Camera access denied';
        status.classList.add('error');
      }
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
    const modal = document.getElementById('videoRecorderModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
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
        const preview = document.getElementById('videoPreview');
        if (preview) preview.srcObject = this.videoStream;
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
      const playback = document.getElementById('videoPlayback');
      const preview = document.getElementById('videoPreview');
      if (playback) {
        playback.src = videoUrl;
        playback.style.display = 'block';
      }
      if (preview) preview.style.display = 'none';
      const saveBtn = document.getElementById('saveVideoBtn');
      if (saveBtn) saveBtn.disabled = false;
    };

    this.mediaRecorder.start();
    this.startRecordingTimer('video');

    const recordBtn = document.getElementById('videoRecordBtn');
    if (recordBtn) {
      recordBtn.classList.add('recording');
      recordBtn.innerHTML = '<span class="record-icon"></span> Recording...';
    }

    const pauseBtn = document.getElementById('videoPauseBtn');
    const stopBtn = document.getElementById('videoStopBtn');
    if (pauseBtn) pauseBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = false;

    const status = document.getElementById('videoStatus');
    if (status) status.textContent = 'Recording in progress...';
  },

  pauseVideoRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      clearInterval(this.recordingTimer);

      const recordBtn = document.getElementById('videoRecordBtn');
      if (recordBtn) recordBtn.innerHTML = '<i class="fas fa-play"></i> Resume';

      const pauseBtn = document.getElementById('videoPauseBtn');
      if (pauseBtn) pauseBtn.disabled = true;

      const status = document.getElementById('videoStatus');
      if (status) status.textContent = 'Recording paused';
    }
  },

  resumeVideoRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.startRecordingTimer('video', true);

      const recordBtn = document.getElementById('videoRecordBtn');
      if (recordBtn) recordBtn.innerHTML = '<span class="record-icon"></span> Recording...';

      const pauseBtn = document.getElementById('videoPauseBtn');
      if (pauseBtn) pauseBtn.disabled = false;

      const status = document.getElementById('videoStatus');
      if (status) status.textContent = 'Recording resumed...';
    }
  },

  stopVideoRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      clearInterval(this.recordingTimer);

      const recordBtn = document.getElementById('videoRecordBtn');
      if (recordBtn) {
        recordBtn.classList.remove('recording');
        recordBtn.innerHTML = '<span class="record-icon"></span> Start Recording';
      }

      const pauseBtn = document.getElementById('videoPauseBtn');
      const stopBtn = document.getElementById('videoStopBtn');
      if (pauseBtn) pauseBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = true;

      const status = document.getElementById('videoStatus');
      if (status) {
        status.textContent = 'Recording complete';
        status.classList.add('success');
      }
    }
  },

  async saveVideoNote() {
    if (!this.recordedBlob) return;

    if (!this.currentNoteId) {
      alert('Please save the note first before adding video recordings');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', this.recordedBlob, 'video.webm');

      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
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

      if (!response.ok) throw new Error('Upload failed');

      const media = await response.json();
      console.log('Video note uploaded:', media);

      // Update hasMedia flag
      const index = this.notes.findIndex(n => n.id === this.currentNoteId);
      if (index !== -1) {
        this.notes[index].hasMedia = true;
      }

      this.closeVideoRecorder();
      alert('Video note uploaded successfully!');
    } catch (error) {
      alert('Failed to upload video note: ' + error.message);
      console.error('Video upload error:', error);
    }
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
      const preview = document.getElementById('videoPreview');
      if (preview) preview.srcObject = this.videoStream;
    } catch (err) {
      console.error('Error switching camera:', err);
    }
  },

  resetVideoRecorder() {
    this.recordedBlob = null;
    this.videoChunks = [];

    const timer = document.getElementById('videoTimer');
    const playback = document.getElementById('videoPlayback');
    const preview = document.getElementById('videoPreview');
    const saveBtn = document.getElementById('saveVideoBtn');
    const status = document.getElementById('videoStatus');
    const recordBtn = document.getElementById('videoRecordBtn');

    if (timer) timer.textContent = '00:00';
    if (playback) playback.style.display = 'none';
    if (preview) preview.style.display = 'block';
    if (saveBtn) saveBtn.disabled = true;
    if (status) {
      status.textContent = 'Camera ready';
      status.classList.remove('error', 'success');
    }
    if (recordBtn) recordBtn.classList.remove('recording');
  },

  startRecordingTimer(type, resume = false) {
    if (!resume) {
      this.recordingStartTime = Date.now();
    }

    this.recordingTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      const timerEl = document.getElementById(`${type}Timer`);
      if (timerEl) timerEl.textContent = `${minutes}:${seconds}`;
    }, 100);
  },

  // ============================================
  // MEDIA MANAGEMENT
  // ============================================

  addMediaToNote(type, data) {
    const mediaContainer = document.getElementById('mediaContainer');
    if (!mediaContainer) return;

    mediaContainer.classList.add('has-media');

    let itemsDiv = mediaContainer.querySelector('.media-items');
    if (!itemsDiv) {
      itemsDiv = document.createElement('div');
      itemsDiv.className = 'media-items';
      mediaContainer.appendChild(itemsDiv);
    }

    const mediaItem = document.createElement('div');
    mediaItem.className = 'media-item';

    const timestamp = new Date().toLocaleString();

    if (type === 'audio') {
      mediaItem.innerHTML = `
        <span class="media-item-type"><i class="fas fa-music"></i> Voice</span>
        <button class="media-item-delete" onclick="NotesManager.deleteMedia(this)">&times;</button>
        <audio controls src="${data}"></audio>
        <div class="media-timestamp">${timestamp}</div>
      `;
    } else if (type === 'video') {
      mediaItem.innerHTML = `
        <span class="media-item-type"><i class="fas fa-video"></i> Video</span>
        <button class="media-item-delete" onclick="NotesManager.deleteMedia(this)">&times;</button>
        <video controls src="${data}" style="width: 100%; max-width: 400px;"></video>
        <div class="media-timestamp">${timestamp}</div>
      `;
    }

    itemsDiv.appendChild(mediaItem);
    this.triggerAutoSave();
  },

  deleteMedia(button) {
    const mediaItem = button.parentElement;
    mediaItem.remove();

    const mediaContainer = document.getElementById('mediaContainer');
    const remainingItems = mediaContainer?.querySelectorAll('.media-item');

    if (remainingItems && remainingItems.length === 0) {
      mediaContainer.classList.remove('has-media');
    }

    this.triggerAutoSave();
  },

  loadMediaToEditor(mediaData) {
    if (!mediaData || mediaData.length === 0) return;

    const mediaContainer = document.getElementById('mediaContainer');
    if (!mediaContainer) return;

    mediaContainer.classList.add('has-media');

    let itemsDiv = mediaContainer.querySelector('.media-items');
    if (!itemsDiv) {
      itemsDiv = document.createElement('div');
      itemsDiv.className = 'media-items';
      mediaContainer.appendChild(itemsDiv);
    }

    itemsDiv.innerHTML = '';

    mediaData.forEach(item => {
      const mediaItem = document.createElement('div');
      mediaItem.className = 'media-item';

      if (item.type === 'audio') {
        mediaItem.innerHTML = `
          <span class="media-item-type"><i class="fas fa-music"></i> Voice</span>
          <button class="media-item-delete" onclick="NotesManager.deleteMedia(this)">&times;</button>
          <audio controls src="${item.src}"></audio>
          <div class="media-timestamp">${item.timestamp}</div>
        `;
      } else if (item.type === 'video') {
        mediaItem.innerHTML = `
          <span class="media-item-type"><i class="fas fa-video"></i> Video</span>
          <button class="media-item-delete" onclick="NotesManager.deleteMedia(this)">&times;</button>
          <video controls src="${item.src}" style="width: 100%; max-width: 400px;"></video>
          <div class="media-timestamp">${item.timestamp}</div>
        `;
      }

      itemsDiv.appendChild(mediaItem);
    });
  },

  // ============================================
  // TRANSCRIPTION (SPEECH TO TEXT)
  // ============================================

  startTranscription() {
    const modal = document.getElementById('transcriptionModal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('show');
    }
  },

  closeTranscription() {
    if (this.recognition) {
      this.recognition.stop();
      this.isTranscribing = false;
    }
    const modal = document.getElementById('transcriptionModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  },

  toggleTranscription() {
    if (this.isTranscribing) {
      this.stopTranscribing();
    } else {
      this.startTranscribing();
    }
  },

  startTranscribing() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    const langSelect = document.getElementById('transcriptionLang');
    const continuous = document.getElementById('continuousTranscription');

    this.recognition.lang = langSelect ? langSelect.value : 'en-US';
    this.recognition.continuous = continuous ? continuous.checked : true;
    this.recognition.interimResults = true;

    const transcriptionText = document.getElementById('transcriptionText');
    const transcriptionStatus = document.getElementById('transcriptionStatus');
    const startBtn = document.getElementById('startTranscribeBtn');
    const waveContainer = document.querySelector('.voice-wave');

    this.recognition.onstart = () => {
      this.isTranscribing = true;
      if (startBtn) startBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Listening';
      if (transcriptionStatus) transcriptionStatus.textContent = 'Listening...';
      if (waveContainer) waveContainer.classList.add('active');
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (transcriptionText) {
        transcriptionText.innerHTML = transcriptionText.innerHTML.replace(/<span class="interim">.*<\/span>/g, '');
        if (finalTranscript) {
          transcriptionText.innerHTML += finalTranscript;
        }
        if (interimTranscript) {
          transcriptionText.innerHTML += `<span class="interim">${interimTranscript}</span>`;
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (transcriptionStatus) transcriptionStatus.textContent = `Error: ${event.error}`;
    };

    this.recognition.onend = () => {
      this.isTranscribing = false;
      if (startBtn) startBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Listening';
      if (transcriptionStatus) transcriptionStatus.textContent = 'Stopped';
      if (waveContainer) waveContainer.classList.remove('active');
    };

    this.recognition.start();
  },

  stopTranscribing() {
    if (this.recognition) {
      this.recognition.stop();
    }
  },

  clearTranscription() {
    const transcriptionText = document.getElementById('transcriptionText');
    if (transcriptionText) transcriptionText.innerHTML = '';
  },

  insertTranscription() {
    const transcriptionText = document.getElementById('transcriptionText');
    const noteContent = document.getElementById('noteContent');

    if (transcriptionText && noteContent) {
      const text = transcriptionText.innerText;
      if (text) {
        noteContent.innerHTML += `<p>${text}</p>`;
        this.triggerAutoSave();
      }
    }

    this.closeTranscription();
  },

  // ============================================
  // TEXT TO SPEECH
  // ============================================

  openTextToSpeech() {
    const modal = document.getElementById('ttsModal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('show');
    }
    this.populateVoices();
    this.setupTTSSliders();
  },

  closeTextToSpeech() {
    this.stopTextToSpeech();
    const modal = document.getElementById('ttsModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  },

  populateVoices() {
    const voiceSelect = document.getElementById('ttsVoice');
    if (!voiceSelect) return;

    const populateList = () => {
      const voices = this.synth.getVoices();
      voiceSelect.innerHTML = '';

      voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(option);
      });
    };

    populateList();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = populateList;
    }
  },

  setupTTSSliders() {
    const rateSlider = document.getElementById('ttsRate');
    const pitchSlider = document.getElementById('ttsPitch');
    const volumeSlider = document.getElementById('ttsVolume');
    const rateValue = document.getElementById('ttsRateValue');
    const pitchValue = document.getElementById('ttsPitchValue');
    const volumeValue = document.getElementById('ttsVolumeValue');

    if (rateSlider && rateValue) {
      rateSlider.oninput = () => {
        rateValue.textContent = `${rateSlider.value}x`;
      };
    }

    if (pitchSlider && pitchValue) {
      pitchSlider.oninput = () => {
        pitchValue.textContent = pitchSlider.value;
      };
    }

    if (volumeSlider && volumeValue) {
      volumeSlider.oninput = () => {
        volumeValue.textContent = `${Math.round(volumeSlider.value * 100)}%`;
      };
    }
  },

  useNoteContent() {
    const noteContent = document.getElementById('noteContent');
    const ttsText = document.getElementById('ttsText');

    if (noteContent && ttsText) {
      ttsText.value = noteContent.innerText;
    }
  },

  playTextToSpeech() {
    const ttsText = document.getElementById('ttsText');
    const voiceSelect = document.getElementById('ttsVoice');
    const rateSlider = document.getElementById('ttsRate');
    const pitchSlider = document.getElementById('ttsPitch');
    const volumeSlider = document.getElementById('ttsVolume');

    if (!ttsText || !ttsText.value.trim()) {
      alert('Please enter text to convert to speech.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(ttsText.value);

    const voices = this.synth.getVoices();
    if (voiceSelect && voices[voiceSelect.value]) {
      utterance.voice = voices[voiceSelect.value];
    }

    if (rateSlider) utterance.rate = parseFloat(rateSlider.value);
    if (pitchSlider) utterance.pitch = parseFloat(pitchSlider.value);
    if (volumeSlider) utterance.volume = parseFloat(volumeSlider.value);

    const playBtn = document.getElementById('ttsPlayBtn');
    const pauseBtn = document.getElementById('ttsPauseBtn');
    const stopBtn = document.getElementById('ttsStopBtn');
    const ttsStatus = document.getElementById('ttsStatus');

    utterance.onstart = () => {
      if (playBtn) playBtn.disabled = true;
      if (pauseBtn) pauseBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = false;
      if (ttsStatus) ttsStatus.textContent = 'Playing...';
    };

    utterance.onend = () => {
      if (playBtn) playBtn.disabled = false;
      if (pauseBtn) pauseBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = true;
      if (ttsStatus) ttsStatus.textContent = 'Finished';
    };

    utterance.onerror = (event) => {
      console.error('TTS error:', event);
      if (ttsStatus) ttsStatus.textContent = 'Error';
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  },

  pauseTextToSpeech() {
    if (this.synth.speaking) {
      if (this.synth.paused) {
        this.synth.resume();
        const pauseBtn = document.getElementById('ttsPauseBtn');
        if (pauseBtn) pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
      } else {
        this.synth.pause();
        const pauseBtn = document.getElementById('ttsPauseBtn');
        if (pauseBtn) pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
      }
    }
  },

  stopTextToSpeech() {
    this.synth.cancel();

    const playBtn = document.getElementById('ttsPlayBtn');
    const pauseBtn = document.getElementById('ttsPauseBtn');
    const stopBtn = document.getElementById('ttsStopBtn');
    const ttsStatus = document.getElementById('ttsStatus');

    if (playBtn) playBtn.disabled = false;
    if (pauseBtn) {
      pauseBtn.disabled = true;
      pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    }
    if (stopBtn) stopBtn.disabled = true;
    if (ttsStatus) ttsStatus.textContent = 'Stopped';
  },

  downloadAudio() {
    alert('Audio download feature requires a text-to-speech API with audio file generation capability.');
  },

  saveAsAudioNote() {
    alert('Saving as audio note requires a text-to-speech API with audio file generation capability.');
  },

  // ============================================
  // MEDIA TRANSCRIPTION
  // ============================================

  closeMediaTranscription() {
    const modal = document.getElementById('mediaTranscriptionModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  },

  startMediaTranscription() {
    alert('Media transcription requires an external speech-to-text API for audio/video file processing.');
  },

  insertMediaTranscription() {
    const transcriptionResult = document.getElementById('mediaTranscriptionResult');
    const noteContent = document.getElementById('noteContent');

    if (transcriptionResult && noteContent) {
      const text = transcriptionResult.innerText;
      if (text) {
        noteContent.innerHTML += `<p>${text}</p>`;
        this.triggerAutoSave();
      }
    }

    this.closeMediaTranscription();
  },

  // ============================================
  // EVENT LISTENERS & KEYBOARD SHORTCUTS
  // ============================================

  setupEventListeners() {
    // Auto-save on input for editor fields
    const editorInputs = ['noteTitle', 'noteDate', 'noteCourse', 'noteTutor', 'noteTags'];
    editorInputs.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('input', () => this.triggerAutoSave());
      }
    });

    // Content editor events
    const noteContent = document.getElementById('noteContent');
    if (noteContent) {
      noteContent.addEventListener('input', () => {
        this.updateWordCount();
        this.triggerAutoSave();
      });

      noteContent.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
        this.updateWordCount();
        this.triggerAutoSave();
      });
    }

    // History search
    const historySearch = document.getElementById('historySearch');
    if (historySearch) {
      historySearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.history-card');

        cards.forEach(card => {
          const content = card.textContent.toLowerCase();
          card.style.display = content.includes(query) ? '' : 'none';
        });
      });
    }
  },

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const editorModal = document.getElementById('notesEditorModal');
      const isEditorOpen = editorModal && editorModal.classList.contains('show');

      // Escape key
      if (e.key === 'Escape') {
        if (document.getElementById('backgroundModal')?.classList.contains('show')) {
          this.closeBackgroundModal();
        } else if (document.getElementById('voiceRecorderModal')?.classList.contains('show')) {
          this.closeVoiceRecorder();
        } else if (document.getElementById('videoRecorderModal')?.classList.contains('show')) {
          this.closeVideoRecorder();
        } else if (document.getElementById('transcriptionModal')?.classList.contains('show')) {
          this.closeTranscription();
        } else if (document.getElementById('ttsModal')?.classList.contains('show')) {
          this.closeTextToSpeech();
        } else if (isEditorOpen) {
          this.cancelEdit();
        }
      }

      // Editor shortcuts
      if (isEditorOpen && (e.ctrlKey || e.metaKey)) {
        switch(e.key) {
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
    this.setupAutocompleteForInput('noteCourse', 'courseSuggestions', this.courses);
    this.setupAutocompleteForInput('noteTutor', 'tutorSuggestions', this.tutors);
  },

  setupAutocompleteForInput(inputId, suggestionsId, dataList) {
    const input = document.getElementById(inputId);
    const suggestionsDiv = document.getElementById(suggestionsId);

    if (!input || !suggestionsDiv) return;

    input.addEventListener('input', () => {
      const query = input.value.toLowerCase();
      suggestionsDiv.innerHTML = '';

      if (query) {
        const filtered = dataList.filter(item => item.toLowerCase().includes(query));

        // Add recent entries from existing notes
        const field = inputId === 'noteCourse' ? 'course' : 'tutor';
        const recentEntries = [...new Set(this.notes.map(n => n[field]).filter(Boolean))];
        const combined = [...new Set([...filtered, ...recentEntries.filter(e => e.toLowerCase().includes(query))])];

        if (combined.length > 0) {
          suggestionsDiv.classList.add('show');
          combined.slice(0, 5).forEach(item => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion-item';
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

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.classList.remove('show');
      }
    });
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if notes panel exists
  if (document.getElementById('notesGrid') || document.getElementById('notes-panel')) {
    NotesManager.init();
  }
});

// Export for global access
window.NotesManager = NotesManager;
