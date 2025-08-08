// Enhanced Advanced Notes JavaScript
let notesArray = JSON.parse(localStorage.getItem('notes')) || [];
let currentNoteIndex = null;
let autoSaveTimeout = null;
let wordCountInterval = null;

// Enhanced tutor and course data
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

// Initialize theme
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  }
}

// Toggle theme
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', newTheme);
}

// Enhanced auto-save with status indicator
function autoSaveDraft() {
  clearTimeout(autoSaveTimeout);
  showSaveStatus('saving', 'Auto-saving...');
  
  autoSaveTimeout = setTimeout(() => {
    try {
      const note = {
        id: currentNoteIndex !== null ? notesArray[currentNoteIndex].id : Date.now(),
        date: document.getElementById('note-date').value,
        tutor: document.getElementById('note-tutor').value,
        course: document.getElementById('note-course').value,
        title: document.getElementById('note-title').value || 'Untitled Note',
        tags: document.getElementById('note-tags').value,
        content: document.getElementById('note-content').innerHTML,
        background: document.getElementById('note-content').dataset.background || '',
        wordCount: countWords(document.getElementById('note-content').innerText),
        created: currentNoteIndex !== null ? notesArray[currentNoteIndex].created : new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      // Save to localStorage as draft
      localStorage.setItem('noteDraft', JSON.stringify(note));
      
      // Auto-save to notes array
      if (currentNoteIndex !== null) {
        // Update existing note
        notesArray[currentNoteIndex] = note;
      } else {
        // Check if we should create a new note (has content)
        if (note.content.trim() && note.content !== '<br>' && note.content !== '<div><br></div>') {
          // Add as new note
          notesArray.push(note);
          currentNoteIndex = notesArray.length - 1;
        }
      }
      
      // Save to localStorage
      localStorage.setItem('notes', JSON.stringify(notesArray));
      
      // Update history display
      renderNotesHistory(document.getElementById('history-search')?.value || '');
      
      showSaveStatus('success', 'Auto-saved');
      console.log('Auto-saved note:', note, 'Index:', currentNoteIndex);
    } catch (error) {
      console.error('Auto-save failed:', error);
      showSaveStatus('error', 'Auto-save failed');
    }
  }, 2000);
}

// Show save status
function showSaveStatus(type, message) {
  const status = document.getElementById('save-status');
  status.textContent = message;
  status.className = `text-sm transition-opacity duration-300 ${type}`;
  
  if (type !== 'saving') {
    setTimeout(() => {
      status.className = 'text-sm opacity-0 transition-opacity duration-300';
    }, 3000);
  }
}

// Word and character count
function updateWordCount() {
  const content = document.getElementById('note-content');
  const text = content.innerText || '';
  const words = countWords(text);
  const chars = text.length;
  
  document.getElementById('word-count').textContent = `${words} word${words !== 1 ? 's' : ''}`;
  document.getElementById('char-count').textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Enhanced modal opening
function openNotesModal() {
  try {
    document.getElementById('notes-modal').classList.remove('hidden');
    document.body.classList.add('modal-open');
    
    // Always start with a new note
    newNote();
    
    renderNotesHistory();
    setupEventListeners();
    setupSuggestions();
    updateFormatButtons();
    startWordCountUpdates();
    
    console.log('Notes modal opened with new note');
  } catch (error) {
    console.error('Error opening notes modal:', error);
  }
}

// Load draft
function loadDraft(draft) {
  document.getElementById('note-date').value = draft.date || '';
  document.getElementById('note-tutor').value = draft.tutor || '';
  document.getElementById('note-course').value = draft.course || '';
  document.getElementById('note-title').value = draft.title || '';
  document.getElementById('note-tags').value = draft.tags || '';
  document.getElementById('note-content').innerHTML = draft.content || '';
  if (draft.background) {
    setNoteBackground(draft.background);
  }
}

// Setup event listeners
function setupEventListeners() {
  const inputs = ['note-content', 'note-title', 'note-date', 'note-tutor', 'note-course', 'note-tags'];
  inputs.forEach(id => {
    const element = document.getElementById(id);
    element.removeEventListener('input', autoSaveDraft);
    element.addEventListener('input', autoSaveDraft);
  });
  
  // Keyboard shortcuts
  document.getElementById('note-content').addEventListener('keydown', handleKeyboardShortcuts);
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
  if (e.ctrlKey || e.metaKey) {
    switch(e.key) {
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
      case 's':
        e.preventDefault();
        saveNote();
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

// Start word count updates
function startWordCountUpdates() {
  updateWordCount();
  clearInterval(wordCountInterval);
  wordCountInterval = setInterval(updateWordCount, 1000);
}

// Close modal
function closeNotesModal() {
  document.getElementById('notes-modal').classList.add('hidden');
  document.body.classList.remove('modal-open');
  clearTimeout(autoSaveTimeout);
  clearInterval(wordCountInterval);
  
  // Only remove draft if we have saved content
  if (currentNoteIndex !== null) {
    localStorage.removeItem('noteDraft');
  }
}

// Toggle notes history
function toggleNotesHistory() {
  const history = document.getElementById('notes-history');
  const button = document.querySelector('.history-toggle-btn');
  history.classList.toggle('hidden');
  button.classList.toggle('rotated');
}

// Create new note
function newNote() {
  // Clear form
  document.getElementById('note-date').value = '';
  document.getElementById('note-tutor').value = '';
  document.getElementById('note-course').value = '';
  document.getElementById('note-title').value = '';
  document.getElementById('note-tags').value = '';
  document.getElementById('note-content').innerHTML = '';
  document.getElementById('note-content').style.backgroundImage = '';
  document.getElementById('note-content').dataset.background = '';
  document.getElementById('note-content').classList.remove('has-background');
  
  // Reset current index
  currentNoteIndex = null;
  
  // Clear draft
  localStorage.removeItem('noteDraft');
  
  updateFormatButtons();
  updateWordCount();
  
  // Set current date-time
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('note-date').value = now.toISOString().slice(0, 16);
}

// Duplicate current note
function duplicateCurrentNote() {
  const note = {
    date: document.getElementById('note-date').value,
    tutor: document.getElementById('note-tutor').value,
    course: document.getElementById('note-course').value,
    title: document.getElementById('note-title').value + ' (Copy)',
    tags: document.getElementById('note-tags').value,
    content: document.getElementById('note-content').innerHTML,
    background: document.getElementById('note-content').dataset.background || ''
  };
  
  currentNoteIndex = null;
  document.getElementById('note-title').value = note.title;
  showSaveStatus('success', 'Note duplicated');
}

// Format text
function formatText(command, value = null) {
  document.execCommand(command, false, value);
  document.getElementById('note-content').focus();
  autoSaveDraft();
  updateFormatButtons();
  updateWordCount();
}

// Show highlight colors
function showHighlightColors() {
  const colors = document.getElementById('highlight-colors');
  colors.classList.toggle('hidden');
  
  // Close on outside click
  if (!colors.classList.contains('hidden')) {
    setTimeout(() => {
      document.addEventListener('click', function closeColors(e) {
        if (!e.target.closest('#highlight-colors') && !e.target.closest('#highlight-btn')) {
          colors.classList.add('hidden');
          document.removeEventListener('click', closeColors);
        }
      });
    }, 100);
  }
}

// Toggle export menu
function toggleExportMenu() {
  const menu = document.getElementById('export-menu');
  menu.classList.toggle('hidden');
  
  // Close on outside click
  if (!menu.classList.contains('hidden')) {
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!e.target.closest('.export-dropdown')) {
          menu.classList.add('hidden');
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 100);
  }
}

// Background modal functions
function openBackgroundModal() {
  document.getElementById('background-modal').classList.remove('hidden');
}

function closeBackgroundModal() {
  document.getElementById('background-modal').classList.add('hidden');
}

// Set note background
function setNoteBackground(background) {
  try {
    const noteContent = document.getElementById('note-content');
    const backgroundMap = {
      math: '../pictures/Math wallpaper 1.jpeg',
      physics: '../pictures/Physics wall paper 1.jpeg',
      biology: '../pictures/Biology wallpaper 1.jpeg',
      chemistry: '../pictures/chemistry wall paper 2.jpeg',
      geography: '../pictures/Geography wallpaper 1.jpeg',
      history: '../pictures/History wallpaper 1.jpeg',
      music: '../pictures/Music.jpeg'
    };
    
    const backgroundUrl = backgroundMap[background] || background;
    noteContent.style.backgroundImage = `url('${backgroundUrl}')`;
    noteContent.style.backgroundSize = 'cover';
    noteContent.style.backgroundPosition = 'center';
    noteContent.dataset.background = background;
    noteContent.classList.add('has-background');
    closeBackgroundModal();
    autoSaveDraft();
    console.log('Set background:', backgroundUrl);
  } catch (error) {
    console.error('Error setting background:', error);
  }
}

// Upload background image
function uploadBackgroundImage() {
  const fileInput = document.getElementById('upload-background');
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      setNoteBackground(e.target.result);
    };
    reader.onerror = function (error) {
      console.error('Error reading uploaded image:', error);
    };
    reader.readAsDataURL(file);
  }
}

// Remove note background
function removeNoteBackground() {
  const noteContent = document.getElementById('note-content');
  noteContent.style.backgroundImage = '';
  noteContent.dataset.background = '';
  noteContent.classList.remove('has-background');
  autoSaveDraft();
}

// Save note
function saveNote() {
  try {
    const note = {
      id: currentNoteIndex !== null ? notesArray[currentNoteIndex].id : Date.now(),
      date: document.getElementById('note-date').value,
      tutor: document.getElementById('note-tutor').value,
      course: document.getElementById('note-course').value,
      title: document.getElementById('note-title').value || 'Untitled Note',
      tags: document.getElementById('note-tags').value,
      content: document.getElementById('note-content').innerHTML,
      background: document.getElementById('note-content').dataset.background || '',
      wordCount: countWords(document.getElementById('note-content').innerText),
      created: currentNoteIndex !== null ? notesArray[currentNoteIndex].created : new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    if (currentNoteIndex !== null) {
      notesArray[currentNoteIndex] = note;
    } else {
      notesArray.push(note);
      currentNoteIndex = notesArray.length - 1;
    }
    
    localStorage.setItem('notes', JSON.stringify(notesArray));
    localStorage.removeItem('noteDraft');
    renderNotesHistory();
    showSaveStatus('success', 'Note saved successfully!');
    console.log('Note saved:', note);
  } catch (error) {
    console.error('Error saving note:', error);
    showSaveStatus('error', 'Failed to save note');
  }
}

// Save and close
function saveAndClose() {
  saveNote();
  setTimeout(() => {
    closeNotesModal();
  }, 500);
}

// Render notes history
function renderNotesHistory(searchQuery = '') {
  try {
    const historyContent = document.getElementById('notes-history-content');
    historyContent.innerHTML = '';
    
    let filteredNotes = notesArray.filter(note => {
      const searchLower = searchQuery.toLowerCase();
      return (
        (note.title || '').toLowerCase().includes(searchLower) ||
        (note.course || '').toLowerCase().includes(searchLower) ||
        (note.tutor || '').toLowerCase().includes(searchLower) ||
        (note.tags || '').toLowerCase().includes(searchLower) ||
        (note.date || '').toLowerCase().includes(searchLower)
      );
    });
    
    // Apply sorting
    const sortBy = document.getElementById('sort-by')?.value || 'date-desc';
    filteredNotes = sortNotesByOption(filteredNotes, sortBy);
    
    if (filteredNotes.length === 0) {
      historyContent.innerHTML = '<p class="text-center opacity-60 py-4">No notes found</p>';
      return;
    }
    
    filteredNotes.forEach((note, originalIndex) => {
      const actualIndex = notesArray.indexOf(note);
      const noteCard = createNoteCard(note, actualIndex);
      historyContent.appendChild(noteCard);
    });
  } catch (error) {
    console.error('Error rendering notes history:', error);
  }
}

// Create note card
function createNoteCard(note, index) {
  const noteCard = document.createElement('div');
  noteCard.className = 'note-card';
  
  if (note.background) {
    const backgroundMap = {
      math: '../pictures/Math wallpaper 1.jpeg',
      physics: '../pictures/Physics wall paper 1.jpeg',
      biology: '../pictures/Biology wallpaper 1.jpeg',
      chemistry: '../pictures/chemistry wall paper 2.jpeg',
      geography: '../pictures/Geography wallpaper 1.jpeg',
      history: '../pictures/History wallpaper 1.jpeg',
      music: '../pictures/Music.jpeg'
    };
    const backgroundUrl = backgroundMap[note.background] || note.background;
    noteCard.style.backgroundImage = `url('${backgroundUrl}')`;
    noteCard.classList.add('has-background');
  }
  
  // Format date
  const formattedDate = note.date ? new Date(note.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : 'No date';
  
  // Create tags HTML
  const tagsHTML = note.tags ? note.tags.split(',').map(tag => 
    `<span class="tag">${tag.trim()}</span>`
  ).join('') : '';
  
  noteCard.innerHTML = `
    <div class="note-card-header">
      <h5>${note.title || 'Untitled'}</h5>
      ${note.wordCount ? `<span class="text-xs opacity-60">${note.wordCount} words</span>` : ''}
    </div>
    <div class="note-card-meta">
      <p>📅 ${formattedDate}</p>
      ${note.course ? `<p>📚 ${note.course}</p>` : ''}
      ${note.tutor ? `<p>👤 ${note.tutor}</p>` : ''}
    </div>
    ${tagsHTML ? `<div class="note-card-tags">${tagsHTML}</div>` : ''}
    <div class="note-card-actions">
      <button onclick="loadNote(${index})" class="view-btn">View</button>
      <button onclick="deleteNote(${index})" class="delete-btn">Delete</button>
    </div>
  `;
  
  return noteCard;
}

// Sort notes
function sortNotes() {
  const searchQuery = document.getElementById('history-search').value;
  renderNotesHistory(searchQuery);
}

function sortNotesByOption(notes, option) {
  const sorted = [...notes];
  switch(option) {
    case 'date-desc':
      return sorted.sort((a, b) => new Date(b.lastModified || b.created || 0) - new Date(a.lastModified || a.created || 0));
    case 'date-asc':
      return sorted.sort((a, b) => new Date(a.lastModified || a.created || 0) - new Date(b.lastModified || b.created || 0));
    case 'title':
      return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    case 'course':
      return sorted.sort((a, b) => (a.course || '').localeCompare(b.course || ''));
    default:
      return sorted;
  }
}

// Load note
function loadNote(index) {
  try {
    const note = notesArray[index];
    document.getElementById('note-date').value = note.date || '';
    document.getElementById('note-tutor').value = note.tutor || '';
    document.getElementById('note-course').value = note.course || '';
    document.getElementById('note-title').value = note.title || '';
    document.getElementById('note-tags').value = note.tags || '';
    document.getElementById('note-content').innerHTML = note.content || '';
    
    const noteContent = document.getElementById('note-content');
    if (note.background) {
      const backgroundMap = {
        math: '../pictures/Math wallpaper 1.jpeg',
        physics: '../pictures/Physics wall paper 1.jpeg',
        biology: '../pictures/Biology wallpaper 1.jpeg',
        chemistry: '../pictures/chemistry wall paper 2.jpeg',
        geography: '../pictures/Geography wallpaper 1.jpeg',
        history: '../pictures/History wallpaper 1.jpeg',
        music: '../pictures/Music.jpeg'
      };
      const backgroundUrl = backgroundMap[note.background] || note.background;
      noteContent.style.backgroundImage = `url('${backgroundUrl}')`;
      noteContent.style.backgroundSize = 'cover';
      noteContent.style.backgroundPosition = 'center';
      noteContent.dataset.background = note.background;
      noteContent.classList.add('has-background');
    } else {
      noteContent.style.backgroundImage = '';
      noteContent.dataset.background = '';
      noteContent.classList.remove('has-background');
    }
    
    currentNoteIndex = index;
    updateFormatButtons();
    updateWordCount();
    showSaveStatus('success', 'Note loaded');
    console.log('Loaded note:', note);
  } catch (error) {
    console.error('Error loading note:', error);
    showSaveStatus('error', 'Failed to load note');
  }
}

// Delete note
function deleteNote(index) {
  if (confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
    try {
      const deletedNote = notesArray[index];
      notesArray.splice(index, 1);
      localStorage.setItem('notes', JSON.stringify(notesArray));
      
      // If we're deleting the current note, reset
      if (currentNoteIndex === index) {
        newNote();
      } else if (currentNoteIndex > index) {
        currentNoteIndex--;
      }
      
      renderNotesHistory(document.getElementById('history-search').value);
      showSaveStatus('success', 'Note deleted');
      console.log('Deleted note:', deletedNote);
    } catch (error) {
      console.error('Error deleting note:', error);
      showSaveStatus('error', 'Failed to delete note');
    }
  }
}

// Setup suggestions for tutors and courses
function setupSuggestions() {
  setupAutocomplete('note-tutor', 'note-tutor-suggestions', tutors);
  setupAutocomplete('note-course', 'note-course-suggestions', courses);
}

function setupAutocomplete(inputId, suggestionsId, dataList) {
  const input = document.getElementById(inputId);
  const suggestionsDiv = document.getElementById(suggestionsId);
  
  input.addEventListener('input', () => {
    const query = input.value.toLowerCase();
    suggestionsDiv.innerHTML = '';
    
    if (query) {
      const filtered = dataList.filter(item => item.toLowerCase().includes(query));
      
      // Also add recent entries from existing notes
      const recentEntries = getRecentEntries(inputId === 'note-tutor' ? 'tutor' : 'course');
      const combined = [...new Set([...filtered, ...recentEntries.filter(e => e.toLowerCase().includes(query))])];
      
      if (combined.length) {
        suggestionsDiv.classList.remove('hidden');
        combined.slice(0, 5).forEach(item => {
          const suggestion = document.createElement('div');
          suggestion.className = 'suggestion-item';
          suggestion.textContent = item;
          suggestion.addEventListener('click', () => {
            input.value = item;
            suggestionsDiv.classList.add('hidden');
            autoSaveDraft();
          });
          suggestionsDiv.appendChild(suggestion);
        });
      } else {
        suggestionsDiv.classList.add('hidden');
      }
    } else {
      suggestionsDiv.classList.add('hidden');
    }
  });
  
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestionsDiv.contains(e.target)) {
      suggestionsDiv.classList.add('hidden');
    }
  });
}

// Get recent entries from existing notes
function getRecentEntries(field) {
  const entries = notesArray
    .map(note => note[field])
    .filter(Boolean)
    .reverse();
  return [...new Set(entries)].slice(0, 5);
}

// Update format buttons
function updateFormatButtons() {
  try {
    const buttons = {
      'bold-btn': 'bold',
      'italic-btn': 'italic',
      'underline-btn': 'underline',
      'strikethrough-btn': 'strikeThrough',
      'subscript-btn': 'subscript',
      'superscript-btn': 'superscript'
    };
    
    Object.keys(buttons).forEach(id => {
      const button = document.getElementById(id);
      if (button) {
        const command = buttons[id];
        const isActive = document.queryCommandState(command);
        button.classList.toggle('active', isActive);
      }
    });
  } catch (error) {
    console.error('Error updating format buttons:', error);
  }
}

// Export functions
function exportNoteAsPDF() {
  try {
    const note = getCurrentNote();
    
    // Create a new jsPDF instance
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(note.title || 'Untitled Note', 20, 20);
    
    // Add metadata
    doc.setFontSize(12);
    let yPos = 35;
    if (note.date) {
      doc.text(`Date: ${new Date(note.date).toLocaleString()}`, 20, yPos);
      yPos += 10;
    }
    if (note.course) {
      doc.text(`Course: ${note.course}`, 20, yPos);
      yPos += 10;
    }
    if (note.tutor) {
      doc.text(`Tutor: ${note.tutor}`, 20, yPos);
      yPos += 10;
    }
    if (note.tags) {
      doc.text(`Tags: ${note.tags}`, 20, yPos);
      yPos += 10;
    }
    
    // Add content
    yPos += 10;
    doc.setFontSize(11);
    const content = document.getElementById('note-content').innerText;
    const lines = doc.splitTextToSize(content, 170);
    
    lines.forEach(line => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 20, yPos);
      yPos += 7;
    });
    
    // Save the PDF
    doc.save(`${note.title || 'note'}.pdf`);
    showSaveStatus('success', 'PDF exported successfully');
  } catch (error) {
    console.error('Error exporting PDF:', error);
    showSaveStatus('error', 'Failed to export PDF');
  }
}

function exportNoteAsDoc() {
  try {
    const note = getCurrentNote();
    
    // Check if htmlDocx is loaded
    if (typeof htmlDocx === 'undefined') {
      // Fallback: export as HTML with .doc extension
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>${note.title || 'Untitled Note'}</title>
          <style>
            body { 
              font-family: 'Times New Roman', serif; 
              font-size: 12pt;
              line-height: 1.6;
              margin: 1in;
            }
            h1 { 
              font-size: 18pt; 
              font-weight: bold;
              margin-bottom: 12pt;
            }
            .metadata { 
              margin-bottom: 12pt;
            }
            .metadata p { 
              margin: 6pt 0;
            }
            .content { 
              margin-top: 24pt;
            }
          </style>
        </head>
        <body>
          <h1>${note.title || 'Untitled Note'}</h1>
          <div class="metadata">
            ${note.date ? `<p><b>Date:</b> ${new Date(note.date).toLocaleString()}</p>` : ''}
            ${note.course ? `<p><b>Course:</b> ${note.course}</p>` : ''}
            ${note.tutor ? `<p><b>Tutor:</b> ${note.tutor}</p>` : ''}
            ${note.tags ? `<p><b>Tags:</b> ${note.tags}</p>` : ''}
            ${note.wordCount ? `<p><b>Word Count:</b> ${note.wordCount}</p>` : ''}
          </div>
          <hr>
          <div class="content">
            ${note.content}
          </div>
        </body>
        </html>
      `;
      
      const blob = new Blob(['\ufeff', htmlContent], { 
        type: 'application/msword'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title || 'note'}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSaveStatus('success', 'Word document exported');
    } else {
      // Use htmlDocx if available
      const htmlContent = `
        <html>
          <head>
            <meta charset="UTF-8">
          </head>
          <body>
            <h1>${note.title || 'Untitled Note'}</h1>
            <p><strong>Date:</strong> ${note.date ? new Date(note.date).toLocaleString() : 'No date'}</p>
            <p><strong>Course:</strong> ${note.course || 'No course'}</p>
            <p><strong>Tutor:</strong> ${note.tutor || 'No tutor'}</p>
            <p><strong>Tags:</strong> ${note.tags || 'No tags'}</p>
            <p><strong>Word Count:</strong> ${note.wordCount || 0}</p>
            <hr/>
            <div>${note.content}</div>
          </body>
        </html>
      `;
      
      const converted = htmlDocx.asBlob(htmlContent);
      const url = URL.createObjectURL(converted);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title || 'note'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSaveStatus('success', 'Word document exported');
    }
  } catch (error) {
    console.error('Error exporting DOC:', error);
    
    // Final fallback: export as RTF
    try {
      const note = getCurrentNote();
      const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24
${note.title || 'Untitled Note'}\\par
\\par
${note.date ? `Date: ${new Date(note.date).toLocaleString()}\\par` : ''}
${note.course ? `Course: ${note.course}\\par` : ''}
${note.tutor ? `Tutor: ${note.tutor}\\par` : ''}
${note.tags ? `Tags: ${note.tags}\\par` : ''}
\\par
${note.content.replace(/<[^>]*>/g, '').replace(/\n/g, '\\par ')}
}`;
      
      const blob = new Blob([rtfContent], { type: 'application/rtf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title || 'note'}.rtf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSaveStatus('success', 'Document exported as RTF');
    } catch (rtfError) {
      showSaveStatus('error', 'Failed to export document');
    }
  }
}

function exportNoteAsMarkdown() {
  try {
    const note = getCurrentNote();
    const content = document.getElementById('note-content');
    
    // Convert HTML to Markdown (basic conversion)
    let markdown = `# ${note.title || 'Untitled Note'}\n\n`;
    
    if (note.date) markdown += `**Date:** ${new Date(note.date).toLocaleString()}\n`;
    if (note.course) markdown += `**Course:** ${note.course}\n`;
    if (note.tutor) markdown += `**Tutor:** ${note.tutor}\n`;
    if (note.tags) markdown += `**Tags:** ${note.tags}\n`;
    markdown += '\n---\n\n';
    
    // Convert content (basic HTML to Markdown)
    let htmlContent = content.innerHTML;
    htmlContent = htmlContent.replace(/<b>(.*?)<\/b>/g, '**$1**');
    htmlContent = htmlContent.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
    htmlContent = htmlContent.replace(/<i>(.*?)<\/i>/g, '*$1*');
    htmlContent = htmlContent.replace(/<em>(.*?)<\/em>/g, '*$1*');
    htmlContent = htmlContent.replace(/<u>(.*?)<\/u>/g, '$1');
    htmlContent = htmlContent.replace(/<br>/g, '\n');
    htmlContent = htmlContent.replace(/<div>/g, '\n');
    htmlContent = htmlContent.replace(/<\/div>/g, '');
    htmlContent = htmlContent.replace(/<ul>/g, '\n');
    htmlContent = htmlContent.replace(/<\/ul>/g, '\n');
    htmlContent = htmlContent.replace(/<li>/g, '- ');
    htmlContent = htmlContent.replace(/<\/li>/g, '\n');
    htmlContent = htmlContent.replace(/<ol>/g, '\n');
    htmlContent = htmlContent.replace(/<\/ol>/g, '\n');
    htmlContent = htmlContent.replace(/<[^>]+>/g, '');
    
    markdown += htmlContent;
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title || 'note'}.md`;
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
    const note = getCurrentNote();
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title || 'Untitled Note'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    .metadata {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
    .metadata p { margin: 5px 0; }
    .tags {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    .tag {
      background: #3498db;
      color: white;
      padding: 3px 10px;
      border-radius: 15px;
      font-size: 12px;
    }
    .content {
      background: white;
      padding: 20px;
      border: 1px solid #e1e4e8;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <h1>${note.title || 'Untitled Note'}</h1>
  <div class="metadata">
    ${note.date ? `<p><strong>Date:</strong> ${new Date(note.date).toLocaleString()}</p>` : ''}
    ${note.course ? `<p><strong>Course:</strong> ${note.course}</p>` : ''}
    ${note.tutor ? `<p><strong>Tutor:</strong> ${note.tutor}</p>` : ''}
    ${note.wordCount ? `<p><strong>Word Count:</strong> ${note.wordCount}</p>` : ''}
    ${note.tags ? `
      <div class="tags">
        ${note.tags.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}
      </div>
    ` : ''}
  </div>
  <div class="content">
    ${note.content}
  </div>
</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title || 'note'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showSaveStatus('success', 'HTML exported');
  } catch (error) {
    console.error('Error exporting HTML:', error);
    showSaveStatus('error', 'Failed to export HTML');
  }
}

// Get current note
function getCurrentNote() {
  return {
    date: document.getElementById('note-date').value,
    tutor: document.getElementById('note-tutor').value,
    course: document.getElementById('note-course').value,
    title: document.getElementById('note-title').value || 'Untitled Note',
    tags: document.getElementById('note-tags').value,
    content: document.getElementById('note-content').innerHTML,
    wordCount: countWords(document.getElementById('note-content').innerText)
  };
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  try {
    initializeTheme();
    
    // Search functionality
    const searchInput = document.getElementById('history-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        renderNotesHistory(searchInput.value);
      });
    }
    
    // Escape key handling
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const backgroundModal = document.getElementById('background-modal');
        const notesModal = document.getElementById('notes-modal');
        
        if (!backgroundModal.classList.contains('hidden')) {
          closeBackgroundModal();
        } else if (!notesModal.classList.contains('hidden')) {
          closeNotesModal();
        }
      }
    });
    
    // Content editing events
    const noteContent = document.getElementById('note-content');
    if (noteContent) {
      noteContent.addEventListener('keyup', updateFormatButtons);
      noteContent.addEventListener('mouseup', updateFormatButtons);
      noteContent.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
        autoSaveDraft();
      });
    }
    
    console.log('Advanced Notes App initialized');
  } catch (error) {
    console.error('Error initializing app:', error);
  }
});