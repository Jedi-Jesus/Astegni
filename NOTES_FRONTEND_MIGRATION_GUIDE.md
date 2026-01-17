# Notes Frontend Migration Guide

## Overview

This guide helps you migrate the notes panel from localStorage to backend API in all profile pages.

## Files to Update

1. `js/common-modals/advanced-notes.js` - Main notes manager
2. `profile-pages/tutor-profile.html` - Remove localStorage references
3. `profile-pages/student-profile.html` - Remove localStorage references
4. `profile-pages/parent-profile.html` - Remove localStorage references
5. `profile-pages/advertiser-profile.html` - Remove localStorage references

## Step 1: Update advanced-notes.js

### A. Add API Configuration (Top of file)

```javascript
const NotesManager = {
  // Add at the very top
  API_BASE_URL: window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://api.astegni.com',

  // Keep existing state...
  notes: [],
  currentNoteIndex: null,
  currentNoteId: null, // ADD THIS - track backend note ID
  // ...rest of state
```

### B. Replace loadNotes() Method

**OLD (localStorage):**
```javascript
loadNotes() {
  const stored = localStorage.getItem('astegni_notes');
  if (stored) {
    this.notes = JSON.parse(stored);
  } else {
    this.notes = this.generateSampleNotes();
    this.saveNotesToStorage();
  }
}
```

**NEW (Backend API):**
```javascript
async loadNotes() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${this.API_BASE_URL}/api/notes/?limit=100&sort_by=date_desc`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load notes');
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
      favorite: note.is_favorite,
      wordCount: note.word_count,
      hasMedia: note.has_media,
      created: note.created_at,
      lastModified: note.last_modified
    }));

    console.log(`Loaded ${this.notes.length} notes from backend`);
  } catch (error) {
    console.error('Failed to load notes:', error);
    this.notes = [];
  }
}
```

### C. Replace saveNote() Method

**OLD (localStorage):**
```javascript
saveNote() {
  const noteData = this.collectNoteData();

  if (this.currentNoteIndex !== null) {
    this.notes[this.currentNoteIndex] = noteData;
  } else {
    noteData.id = Date.now();
    noteData.created = new Date().toISOString();
    this.notes.unshift(noteData);
    this.currentNoteIndex = 0;
  }

  noteData.lastModified = new Date().toISOString();
  this.saveNotesToStorage();
  this.showSaveStatus('success', 'Note saved');
  this.renderHistorySidebar(this.currentNoteIndex);
}
```

**NEW (Backend API):**
```javascript
async saveNote() {
  const noteData = this.collectNoteData();

  try {
    const token = localStorage.getItem('token');
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

      if (!response.ok) throw new Error('Failed to update note');
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

      if (!response.ok) throw new Error('Failed to create note');
      savedNote = await response.json();

      // Add to local array
      this.notes.unshift(this.transformNoteFromAPI(savedNote));
      this.currentNoteIndex = 0;
      this.currentNoteId = savedNote.id;
    }

    this.showSaveStatus('success', 'Note saved to cloud');
    this.renderHistorySidebar(this.currentNoteIndex);
  } catch (error) {
    this.showSaveStatus('error', 'Failed to save: ' + error.message);
    console.error('Save error:', error);
  }
}
```

### D. Add Helper Method

```javascript
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
    favorite: apiNote.is_favorite,
    wordCount: apiNote.word_count,
    hasMedia: apiNote.has_media,
    created: apiNote.created_at,
    lastModified: apiNote.last_modified
  };
}
```

### E. Update collectNoteData() Method

**Change field names to match backend API:**

```javascript
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
    is_favorite: false, // Changed from 'favorite'
    word_count: wordCount // Changed from 'wordCount'
  };
}
```

### F. Replace deleteCurrentNote() Method

**NEW:**
```javascript
async deleteCurrentNote() {
  if (!this.currentNoteId) return;

  if (!confirm('Are you sure you want to delete this note?')) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${this.API_BASE_URL}/api/notes/${this.currentNoteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to delete note');

    // Remove from local array
    this.notes = this.notes.filter(n => n.id !== this.currentNoteId);

    this.closeEditor();
    this.renderDashboard();
    this.showSuccess('Note deleted successfully');
  } catch (error) {
    this.showError('Failed to delete note: ' + error.message);
  }
}
```

### G. Replace toggleFavorite() Method

**NEW:**
```javascript
async toggleFavorite() {
  if (!this.currentNoteId) return;

  try {
    const token = localStorage.getItem('token');
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
    if (favoriteBtn) {
      favoriteBtn.innerHTML = updatedNote.is_favorite
        ? '<i class="fas fa-star" style="color: gold;"></i>'
        : '<i class="fas fa-star"></i>';
    }

    this.renderDashboard();
  } catch (error) {
    this.showError('Failed to toggle favorite: ' + error.message);
  }
}
```

### H. Update Voice/Video Upload Methods

**Replace saveVoiceNote():**
```javascript
async saveVoiceNote() {
  if (!this.recordedBlob || !this.currentNoteId) {
    alert('Please record audio first and ensure note is saved');
    return;
  }

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
}
```

**Replace saveVideoNote():**
```javascript
async saveVideoNote() {
  if (!this.recordedBlob || !this.currentNoteId) {
    alert('Please record video first and ensure note is saved');
    return;
  }

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
}
```

### I. Update openEditor() Method

**Find this line:**
```javascript
openEditor(noteIndex = null) {
  this.currentNoteIndex = noteIndex;
  // ...
```

**Add after it:**
```javascript
openEditor(noteIndex = null) {
  this.currentNoteIndex = noteIndex;
  this.currentNoteId = noteIndex !== null ? this.notes[noteIndex].id : null; // ADD THIS LINE

  // ...rest of method
```

### J. Update init() Method

**Change to async:**
```javascript
async init() {
  await this.loadNotes(); // Make it await
  this.renderDashboard();
  this.updateStats();
  this.setupEventListeners();
  this.setupKeyboardShortcuts();
  this.setupAutocomplete();
  this.initializeAutoSave();
  this.populateVoices();
  console.log('NotesManager initialized with backend API');
}
```

### K. Remove/Deprecate localStorage Methods

**Replace these methods:**
```javascript
saveNotesToStorage() {
  console.warn('saveNotesToStorage() is deprecated. Notes are saved to backend automatically.');
}

generateSampleNotes() {
  console.warn('generateSampleNotes() is deprecated. Load from backend instead.');
  return [];
}
```

## Step 2: Update Profile Pages

### Remove references to localStorage in HTML

**In all profile pages (tutor-profile.html, student-profile.html, etc.):**

No changes needed in HTML! The notes panel will automatically use the backend API once advanced-notes.js is updated.

## Step 3: Optional - Add Statistics Panel

**Update updateStats() to use backend:**

```javascript
async updateStats() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${this.API_BASE_URL}/api/notes/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) return;

    const stats = await response.json();

    // Update dashboard stats UI
    const statsContainer = document.getElementById('notesStats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${stats.total_notes}</div>
          <div class="stat-label">Total Notes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.total_courses}</div>
          <div class="stat-label">Courses</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.favorite_notes}</div>
          <div class="stat-label">Favorites</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.notes_with_media}</div>
          <div class="stat-label">With Media</div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}
```

## Step 4: Update Autocomplete

**Replace setupAutocomplete() to load from backend:**

```javascript
async setupAutocomplete() {
  // Load courses and tutors from backend
  try {
    const token = localStorage.getItem('token');

    const coursesResponse = await fetch(`${this.API_BASE_URL}/api/notes/courses`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const tutorsResponse = await fetch(`${this.API_BASE_URL}/api/notes/tutors`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (coursesResponse.ok) {
      this.courses = await coursesResponse.json();
    }
    if (tutorsResponse.ok) {
      this.tutors = await tutorsResponse.json();
    }
  } catch (error) {
    console.error('Failed to load autocomplete data:', error);
  }

  // Rest of setupAutocomplete() stays the same...
}
```

## Testing Checklist

After migration, test:

- [ ] Load notes from backend on page load
- [ ] Create new note saves to backend
- [ ] Update existing note saves changes
- [ ] Delete note removes from backend
- [ ] Toggle favorite updates backend
- [ ] Voice recording uploads to B2
- [ ] Video recording uploads to B2
- [ ] Autocomplete loads user's courses/tutors
- [ ] Stats panel shows correct data
- [ ] Search/filter works
- [ ] No localStorage errors in console

## Rollback Plan

If issues occur, keep the original `advanced-notes.js` file backed up:

```bash
cp js/common-modals/advanced-notes.js js/common-modals/advanced-notes-backup.js
```

Then restore if needed:

```bash
cp js/common-modals/advanced-notes-backup.js js/common-modals/advanced-notes.js
```

## Summary

All changes are in `js/common-modals/advanced-notes.js`. No HTML changes needed. The key changes are:

1. Add API_BASE_URL configuration
2. Make methods async (loadNotes, saveNote, deleteNote, etc.)
3. Use fetch() to call backend API
4. Transform API responses to match existing format
5. Update media upload to use FormData
6. Load autocomplete from backend
7. Track currentNoteId for backend operations

**Result:** Notes will be cloud-synced across all devices automatically!
