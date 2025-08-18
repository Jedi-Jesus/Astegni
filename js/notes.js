// advanced-notes-dashboard.js

// Global state
let notes = [];
let currentNoteIndex = null;
let currentView = 'dashboard';
let autoSaveTimeout = null;
let wordCountInterval = null;

// Tutor and course suggestions
const tutors = [
  'Dr. Alice Johnson',
  'Prof. Bob Smith',
  'Ms. Clara Williams',
  'Mr. David Brown',
  'Dr. Emma Davis',
  'Prof. Michael Chen',
  'Dr. Sarah Martinez',
  'Mr. James Wilson'
];

const courses = [
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
];

// Background image mapping
const backgroundMap = {
  'math': '../pictures/Math wallpaper 1.jpeg',
  'physics': '../pictures/Physics wall paper 1.jpeg',
  'biology': '../pictures/Biology wallpaper 1.jpeg',
  'chemistry': '../pictures/chemistry wall paper 2.jpeg',
  'geography': '../pictures/Geography wallpaper 1.jpeg',
  'history': '../pictures/History wallpaper 1.jpeg',
  'music': '../pictures/Music.jpeg'
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadNotes();
  renderDashboard();
  updateStats();
  setupEventListeners();
  setupKeyboardShortcuts();
  loadTheme();
  setupAutocomplete();
});

// Load notes from localStorage
function loadNotes() {
  const stored = localStorage.getItem('notes');
  if (stored) {
    notes = JSON.parse(stored);
  } else {
    // Generate sample notes if none exist
    notes = generateSampleNotes();
    localStorage.setItem('notes', JSON.stringify(notes));
  }
}

// Generate sample notes
function generateSampleNotes() {
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
      created: new Date(Date.now() - 30000).toISOString(),
      lastModified: new Date(Date.now() - 25000).toISOString()
    }
  ];
}

// Update statistics
function updateStats() {
  document.getElementById('totalNotes').textContent = notes.length;
  
  const totalWords = notes.reduce((sum, note) => sum + (note.wordCount || 0), 0);
  document.getElementById('totalWords').textContent = formatNumber(totalWords);
  
  const courses = [...new Set(notes.map(n => n.course).filter(Boolean))];
  document.getElementById('totalCourses').textContent = courses.length;
  
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentNotes = notes.filter(n => new Date(n.lastModified || n.created) > weekAgo);
  document.getElementById('recentNotes').textContent = recentNotes.length;
}

// Format number with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Render dashboard
function renderDashboard() {
  const grid = document.getElementById('notesGrid');
  // Clear existing cards except the new note card
  const existingCards = grid.querySelectorAll('.note-card:not(.new-note)');
  existingCards.forEach(card => card.remove());

  // Sort notes based on current selection
  const sortedNotes = sortNotes([...notes]);

  // Add note cards
  sortedNotes.forEach((note, index) => {
    const actualIndex = notes.findIndex(n => n.id === note.id);
    const card = createNoteCard(note, actualIndex);
    grid.appendChild(card);
  });
}

// Sort notes
function sortNotes(notesArray) {
  const sortBy = document.getElementById('sortSelect')?.value || 'date-desc';
  
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
}

// Create note card element
function createNoteCard(note, index) {
  const card = document.createElement('div');
  card.className = 'note-card';
  card.dataset.index = index;
  card.onclick = () => openNote(index);

  // Add background if exists
  if (note.background) {
    const bgUrl = backgroundMap[note.background] || note.background;
    card.style.backgroundImage = `url('${bgUrl}')`;
    card.classList.add('has-background');
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
        <div class="note-date">📅 ${date}</div>
      </div>
      ${note.favorite ? '<span class="note-favorite">⭐</span>' : ''}
    </div>
    <div class="note-meta">
      ${note.course ? `<div class="note-meta-item">📚 ${note.course}</div>` : ''}
      ${note.tutor ? `<div class="note-meta-item">👤 ${note.tutor}</div>` : ''}
      ${note.wordCount ? `<div class="note-meta-item">📝 ${note.wordCount} words</div>` : ''}
    </div>
    ${preview ? `<div class="note-preview">${preview}</div>` : ''}
    ${tags ? `<div class="note-tags">${tags}</div>` : ''}
  `;

  return card;
}

// Create new note
function createNewNote() {
  const newCard = document.querySelector('.new-note');
  animateCardDealing(newCard, -1);
  
  setTimeout(() => {
    currentNoteIndex = null;
    clearEditor();
    switchToEditor();
    renderHistorySidebar(-1);
    startWordCountUpdates();
    document.getElementById('noteContent').focus();
  }, 400);
}

// Open existing note
function openNote(index) {
  const card = document.querySelector(`[data-index="${index}"]`);
  animateCardDealing(card, index);
  
  setTimeout(() => {
    currentNoteIndex = index;
    loadNoteToEditor(notes[index]);
    switchToEditor();
    renderHistorySidebar(index);
    startWordCountUpdates();
  }, 400);
}

// Animate card dealing
function animateCardDealing(card, clickedIndex) {
  // Clone the card for animation
  const clone = card.cloneNode(true);
  const rect = card.getBoundingClientRect();
  
  clone.style.position = 'fixed';
  clone.style.top = rect.top + 'px';
  clone.style.left = rect.left + 'px';
  clone.style.width = rect.width + 'px';
  clone.style.height = rect.height + 'px';
  clone.style.zIndex = '1000';
  clone.classList.add('card-dealing');
  
  document.body.appendChild(clone);

  // Animate other cards with staggered delay
  const allCards = document.querySelectorAll('.note-card');
  let delay = 100;
  
  allCards.forEach((otherCard) => {
    if (otherCard !== card && !otherCard.classList.contains('new-note')) {
      const otherIndex = parseInt(otherCard.dataset.index);
      if (otherIndex !== clickedIndex) {
        setTimeout(() => {
          const otherClone = otherCard.cloneNode(true);
          const otherRect = otherCard.getBoundingClientRect();
          
          otherClone.style.position = 'fixed';
          otherClone.style.top = otherRect.top + 'px';
          otherClone.style.left = otherRect.left + 'px';
          otherClone.style.width = otherRect.width + 'px';
          otherClone.style.height = otherRect.height + 'px';
          otherClone.style.zIndex = '999';
          otherClone.style.setProperty('--target-y', `${delay}px`);
          otherClone.classList.add('card-dealing');
          
          document.body.appendChild(otherClone);
          
          setTimeout(() => otherClone.remove(), 800);
        }, delay);
        delay += 50;
      }
    }
  });

  setTimeout(() => clone.remove(), 800);
}

// Switch to editor view
function switchToEditor() {
  const dashboard = document.getElementById('dashboard');
  const editor = document.getElementById('editorContainer');
  
  dashboard.style.animation = 'fadeOut 0.3s forwards';
  
  setTimeout(() => {
    dashboard.classList.add('hidden');
    dashboard.style.animation = '';
    editor.classList.add('active');
    currentView = 'editor';
    document.getElementById('editorTitle').textContent = currentNoteIndex === null ? 'New Note' : 'Edit Note';
  }, 300);
}

// Back to dashboard
function backToDashboard() {
  const dashboard = document.getElementById('dashboard');
  const editor = document.getElementById('editorContainer');
  
  // Stop auto-save
  clearTimeout(autoSaveTimeout);
  clearInterval(wordCountInterval);
  
  editor.style.animation = 'fadeOut 0.3s forwards';
  
  setTimeout(() => {
    editor.classList.remove('active');
    editor.style.animation = '';
    dashboard.classList.remove('hidden');
    currentView = 'dashboard';
    renderDashboard();
    updateStats();
  }, 300);
}

// Render history sidebar with clicked card first
function renderHistorySidebar(clickedIndex) {
  const historyCards = document.getElementById('historyCards');
  historyCards.innerHTML = '';

  // Create ordered list with clicked item first
  let orderedNotes = [];
  
  if (clickedIndex === -1) {
    // New note was clicked
    orderedNotes.push({ 
      id: 'new', 
      title: 'New Note', 
      date: new Date().toISOString(),
      isNew: true 
    });
    orderedNotes.push(...notes);
  } else {
    // Existing note was clicked - put it first
    orderedNotes.push(notes[clickedIndex]);
    notes.forEach((note, index) => {
      if (index !== clickedIndex) {
        orderedNotes.push(note);
      }
    });
  }

  // Render history cards with animation
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
          📅 ${date} ${note.course ? `• ${note.course}` : ''}
        </div>
        ${tags ? `<div class="history-card-tags">${tags}</div>` : ''}
      </div>
    `;

    if (!note.isNew) {
      const noteIndex = notes.findIndex(n => n.id === note.id);
      historyCard.onclick = () => switchHistoryNote(noteIndex, historyCard);
    }

    historyCards.appendChild(historyCard);
  });
}

// Switch to different note from history
function switchHistoryNote(index, cardElement) {
  // Save current note first
  if (hasUnsavedChanges()) {
    autoSave();
  }
  
  currentNoteIndex = index;
  loadNoteToEditor(notes[index]);
  
  // Update active state
  document.querySelectorAll('.history-card').forEach(card => {
    card.classList.remove('active');
  });
  cardElement.classList.add('active');
}

// Load note to editor
function loadNoteToEditor(note) {
  document.getElementById('noteTitle').value = note.title || '';
  document.getElementById('noteDate').value = note.date || '';
  document.getElementById('noteCourse').value = note.course || '';
  document.getElementById('noteTutor').value = note.tutor || '';
  document.getElementById('noteTags').value = note.tags || '';
  
  const contentEditor = document.getElementById('noteContent');
  contentEditor.innerHTML = note.content || '';
  
  // Set background if exists
  if (note.background) {
    const bgUrl = backgroundMap[note.background] || note.background;
    contentEditor.style.backgroundImage = `url('${bgUrl}')`;
    contentEditor.classList.add('has-background');
    contentEditor.dataset.background = note.background;
  } else {
    contentEditor.style.backgroundImage = '';
    contentEditor.classList.remove('has-background');
    contentEditor.dataset.background = '';
  }
  
  // Update favorite button
  const favoriteBtn = document.getElementById('favoriteBtn');
  if (note.favorite) {
    favoriteBtn.classList.add('active');
    favoriteBtn.innerHTML = '<span>⭐</span> Favorited';
  } else {
    favoriteBtn.classList.remove('active');
    favoriteBtn.innerHTML = '<span>⭐</span>';
  }
  
  updateWordCount();
}

// Clear editor
function clearEditor() {
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteDate').value = new Date().toISOString().slice(0, 16);
  document.getElementById('noteCourse').value = '';
  document.getElementById('noteTutor').value = '';
  document.getElementById('noteTags').value = '';
  document.getElementById('noteContent').innerHTML = '';
  document.getElementById('noteContent').style.backgroundImage = '';
  document.getElementById('noteContent').classList.remove('has-background');
  document.getElementById('noteContent').dataset.background = '';
  
  const favoriteBtn = document.getElementById('favoriteBtn');
  favoriteBtn.classList.remove('active');
  favoriteBtn.innerHTML = '<span>⭐</span>';
  
  updateWordCount();
}

// Check for unsaved changes
function hasUnsavedChanges() {
  if (currentNoteIndex === null) {
    // New note - check if any content exists
    return document.getElementById('noteTitle').value || 
           document.getElementById('noteContent').innerHTML;
  } else {
    // Existing note - compare with saved version
    const note = notes[currentNoteIndex];
    return document.getElementById('noteTitle').value !== (note.title || '') ||
           document.getElementById('noteContent').innerHTML !== (note.content || '');
  }
}

// Auto-save functionality
function autoSave() {
  clearTimeout(autoSaveTimeout);
  
  autoSaveTimeout = setTimeout(() => {
    const noteData = {
      id: currentNoteIndex !== null ? notes[currentNoteIndex].id : Date.now(),
      title: document.getElementById('noteTitle').value || 'Untitled Note',
      date: document.getElementById('noteDate').value,
      course: document.getElementById('noteCourse').value,
      tutor: document.getElementById('noteTutor').value,
      tags: document.getElementById('noteTags').value,
      content: document.getElementById('noteContent').innerHTML,
      background: document.getElementById('noteContent').dataset.background || '',
      favorite: currentNoteIndex !== null ? notes[currentNoteIndex].favorite : false,
      wordCount: countWords(document.getElementById('noteContent').innerText),
      created: currentNoteIndex !== null ? notes[currentNoteIndex].created : new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    // Save to localStorage as draft
    localStorage.setItem('noteDraft', JSON.stringify(noteData));
    
    showSaveStatus('saving', 'Auto-saving...');
    
    setTimeout(() => {
      showSaveStatus('success', 'Auto-saved');
      document.getElementById('lastSaved').textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
    }, 500);
  }, 2000);
}

// Save note
function saveNote() {
  const noteData = {
    id: currentNoteIndex !== null ? notes[currentNoteIndex].id : Date.now(),
    title: document.getElementById('noteTitle').value || 'Untitled Note',
    date: document.getElementById('noteDate').value,
    course: document.getElementById('noteCourse').value,
    tutor: document.getElementById('noteTutor').value,
    tags: document.getElementById('noteTags').value,
    content: document.getElementById('noteContent').innerHTML,
    background: document.getElementById('noteContent').dataset.background || '',
    favorite: currentNoteIndex !== null ? notes[currentNoteIndex].favorite : false,
    wordCount: countWords(document.getElementById('noteContent').innerText),
    created: currentNoteIndex !== null ? notes[currentNoteIndex].created : new Date().toISOString(),
    lastModified: new Date().toISOString()
  };

  if (currentNoteIndex !== null) {
    notes[currentNoteIndex] = noteData;
  } else {
    notes.unshift(noteData);
    currentNoteIndex = 0;
  }

  localStorage.setItem('notes', JSON.stringify(notes));
  localStorage.removeItem('noteDraft');
  
  showSaveStatus('success', 'Note saved successfully!');
  document.getElementById('lastSaved').textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
  
  // Update history sidebar
  renderHistorySidebar(currentNoteIndex);
}

// Save and close
function saveAndClose() {
  saveNote();
  setTimeout(() => {
    backToDashboard();
  }, 500);
}

// Cancel edit
function cancelEdit() {
  if (hasUnsavedChanges()) {
    if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
      backToDashboard();
    }
  } else {
    backToDashboard();
  }
}

// Delete current note
function deleteCurrentNote() {
  if (currentNoteIndex === null) {
    backToDashboard();
    return;
  }
  
  if (confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
    notes.splice(currentNoteIndex, 1);
    localStorage.setItem('notes', JSON.stringify(notes));
    showSaveStatus('success', 'Note deleted');
    setTimeout(() => {
      backToDashboard();
    }, 500);
  }
}

// Duplicate note
function duplicateNote() {
  const noteData = {
    id: Date.now(),
    title: (document.getElementById('noteTitle').value || 'Untitled') + ' (Copy)',
    date: document.getElementById('noteDate').value,
    course: document.getElementById('noteCourse').value,
    tutor: document.getElementById('noteTutor').value,
    tags: document.getElementById('noteTags').value,
    content: document.getElementById('noteContent').innerHTML,
    background: document.getElementById('noteContent').dataset.background || '',
    favorite: false,
    wordCount: countWords(document.getElementById('noteContent').innerText),
    created: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };

  notes.unshift(noteData);
  localStorage.setItem('notes', JSON.stringify(notes));
  
  currentNoteIndex = 0;
  document.getElementById('noteTitle').value = noteData.title;
  showSaveStatus('success', 'Note duplicated');
  
  // Update history sidebar
  renderHistorySidebar(0);
}

// Toggle favorite
function toggleFavorite() {
  const favoriteBtn = document.getElementById('favoriteBtn');
  
  if (currentNoteIndex !== null) {
    notes[currentNoteIndex].favorite = !notes[currentNoteIndex].favorite;
    localStorage.setItem('notes', JSON.stringify(notes));
    
    if (notes[currentNoteIndex].favorite) {
      favoriteBtn.classList.add('active');
      favoriteBtn.innerHTML = '<span>⭐</span> Favorited';
    } else {
      favoriteBtn.classList.remove('active');
      favoriteBtn.innerHTML = '<span>⭐</span>';
    }
    
    showSaveStatus('success', notes[currentNoteIndex].favorite ? 'Added to favorites' : 'Removed from favorites');
  }
}

// Toggle history sidebar
function toggleHistorySidebar() {
  const sidebar = document.querySelector('.history-sidebar');
  sidebar.classList.toggle('collapsed');
}

// Format text
function formatText(command, value = null) {
  document.execCommand(command, false, value);
  document.getElementById('noteContent').focus();
  updateWordCount();
  autoSave();
}

// Show highlight colors
function showHighlightColors() {
  const colors = document.getElementById('highlightColors');
  colors.classList.toggle('show');
  
  // Close on outside click
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

// Toggle export menu
function toggleExportMenu() {
  const menu = document.getElementById('exportMenu');
  menu.classList.toggle('show');
  
  // Close on outside click
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

// Background modal functions
function openBackgroundModal() {
  document.getElementById('backgroundModal').classList.add('show');
}

function closeBackgroundModal() {
  document.getElementById('backgroundModal').classList.remove('show');
}

function setNoteBackground(background) {
  const noteContent = document.getElementById('noteContent');
  const bgUrl = backgroundMap[background] || background;
  
  noteContent.style.backgroundImage = `url('${bgUrl}')`;
  noteContent.classList.add('has-background');
  noteContent.dataset.background = background;
  
  closeBackgroundModal();
  autoSave();
}

function uploadBackgroundImage() {
  const fileInput = document.getElementById('uploadBackground');
  const file = fileInput.files[0];
  
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      setNoteBackground(e.target.result);
    };
    reader.readAsDataURL(file);
  }
}

function removeNoteBackground() {
  const noteContent = document.getElementById('noteContent');
  noteContent.style.backgroundImage = '';
  noteContent.classList.remove('has-background');
  noteContent.dataset.background = '';
  autoSave();
}

// Word count functionality
function updateWordCount() {
  const content = document.getElementById('noteContent');
  const text = content.innerText || '';
  const words = countWords(text);
  const chars = text.length;
  
  document.getElementById('wordCount').textContent = `${words} word${words !== 1 ? 's' : ''}`;
  document.getElementById('charCount').textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function startWordCountUpdates() {
  updateWordCount();
  clearInterval(wordCountInterval);
  wordCountInterval = setInterval(updateWordCount, 1000);
}

// Show save status
function showSaveStatus(type, message) {
  const status = document.getElementById('save-status');
  status.textContent = message;
  status.className = `save-status ${type}`;
  
  if (type !== 'saving') {
    setTimeout(() => {
      status.className = 'save-status';
    }, 3000);
  }
}

// Export functions
function exportNoteAsPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const title = document.getElementById('noteTitle').value || 'Untitled Note';
    const date = document.getElementById('noteDate').value;
    const course = document.getElementById('noteCourse').value;
    const tutor = document.getElementById('noteTutor').value;
    const tags = document.getElementById('noteTags').value;
    const content = document.getElementById('noteContent').innerText;
    
    // Add content to PDF
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
    showSaveStatus('success', 'PDF exported successfully');
  } catch (error) {
    console.error('Error exporting PDF:', error);
    showSaveStatus('error', 'Failed to export PDF');
  }
}

function exportNoteAsDoc() {
  try {
    const title = document.getElementById('noteTitle').value || 'Untitled Note';
    const content = document.getElementById('noteContent').innerHTML;
    
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
    
    showSaveStatus('success', 'Word document exported');
  } catch (error) {
    console.error('Error exporting DOC:', error);
    showSaveStatus('error', 'Failed to export Word document');
  }
}

function exportNoteAsMarkdown() {
  try {
    const title = document.getElementById('noteTitle').value || 'Untitled Note';
    const content = document.getElementById('noteContent');
    
    let markdown = `# ${title}\n\n`;
    
    // Basic HTML to Markdown conversion
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
    
    showSaveStatus('success', 'Markdown exported');
  } catch (error) {
    console.error('Error exporting Markdown:', error);
    showSaveStatus('error', 'Failed to export Markdown');
  }
}

function exportNoteAsHTML() {
  try {
    const title = document.getElementById('noteTitle').value || 'Untitled Note';
    const content = document.getElementById('noteContent').innerHTML;
    
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
    
    showSaveStatus('success', 'HTML exported');
  } catch (error) {
    console.error('Error exporting HTML:', error);
    showSaveStatus('error', 'Failed to export HTML');
  }
}

// Theme management
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  
  const themeBtn = document.querySelector('.theme-toggle');
  if (newTheme === 'dark') {
    themeBtn.innerHTML = '<span class="theme-icon">☀️</span><span class="theme-text">Light Mode</span>';
  } else {
    themeBtn.innerHTML = '<span class="theme-icon">🌙</span><span class="theme-text">Dark Mode</span>';
  }
  
  localStorage.setItem('theme', newTheme);
}

function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  if (savedTheme === 'dark') {
    const themeBtn = document.querySelector('.theme-toggle');
    themeBtn.innerHTML = '<span class="theme-icon">☀️</span><span class="theme-text">Light Mode</span>';
  }
}

// Setup autocomplete
function setupAutocomplete() {
  setupAutocompleteForInput('noteCourse', 'courseSuggestions', courses);
  setupAutocompleteForInput('noteTutor', 'tutorSuggestions', tutors);
}

function setupAutocompleteForInput(inputId, suggestionsId, dataList) {
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
      const recentEntries = [...new Set(notes.map(n => n[field]).filter(Boolean))];
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
            autoSave();
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

// Setup event listeners
function setupEventListeners() {
  // Search functionality
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.note-card:not(.new-note)');
    
    cards.forEach(card => {
      const title = card.querySelector('.note-title').textContent.toLowerCase();
      const content = card.textContent.toLowerCase();
      const visible = title.includes(query) || content.includes(query);
      card.style.display = visible ? '' : 'none';
    });
  });
  
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      const filter = e.target.dataset.filter;
      const cards = document.querySelectorAll('.note-card:not(.new-note)');
      
      cards.forEach(card => {
        const index = parseInt(card.dataset.index);
        const note = notes[index];
        
        if (filter === 'all') {
          card.style.display = '';
        } else if (filter === 'recent') {
          const isRecent = new Date(note.lastModified || note.created) > 
                          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          card.style.display = isRecent ? '' : 'none';
        } else if (filter === 'favorites') {
          card.style.display = note.favorite ? '' : 'none';
        }
      });
    });
  });
  
  // Sort select
  document.getElementById('sortSelect').addEventListener('change', renderDashboard);
  
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
  
  // Auto-save on input
  const editorInputs = ['noteTitle', 'noteDate', 'noteCourse', 'noteTutor', 'noteTags'];
  editorInputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', autoSave);
    }
  });
  
  // Content editor events
  const noteContent = document.getElementById('noteContent');
  if (noteContent) {
    noteContent.addEventListener('input', () => {
      updateWordCount();
      autoSave();
    });
    
    noteContent.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
      updateWordCount();
      autoSave();
    });
  }
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Global shortcuts
    if (e.key === 'Escape') {
      if (document.getElementById('backgroundModal').classList.contains('show')) {
        closeBackgroundModal();
      } else if (currentView === 'editor') {
        cancelEdit();
      }
    }
    
    // Editor shortcuts
    if (currentView === 'editor') {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 's':
            e.preventDefault();
            saveNote();
            break;
          case 'b':
            e.preventDefault();
            formatText('bold');
            break;
          case 'i':
            e.preventDefault();
            formatText('italic');
            break;
          case 'u':
            e.preventDefault();
            formatText('underline');
            break;
          case 'd':
            e.preventDefault();
            duplicateNote();
            break;
          case 'z':
            if (!e.shiftKey) {
              e.preventDefault();
              formatText('undo');
            }
            break;
          case 'y':
            e.preventDefault();
            formatText('redo');
            break;
        }
      }
    }
  });
}

// Open in new window
window.open('advanced-notes.html', 'NotesWindow', 'width=1200,height=800');

// Open with new note
window.open('advanced-notes.html?action=new', 'NotesWindow');

// Open specific note
window.open('advanced-notes.html?noteId=123456', 'NotesWindow');