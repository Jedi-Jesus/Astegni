// Complete Enhanced Chat Application with All Original Features

// Global State
let selectedFiles = [];
let currentMessageId = null;
let isEditing = false;
let deletedMessages = [];
let deletedMessagesDB = [];
let undoTimeout = null;
let isReadingAll = false;
let currentUtteranceIndex = 0;
let audioQueue = [];
let currentAudio = null;
let isSelecting = false;
let selectedMessageIds = [];
let attachments = [];
let currentAttachmentIndex = -1;
let zoomLevel = 1;

// Media Recording
let mediaMode = 'voice-to-text';
let recognition = null;
let mediaRecorder = null;
let recordedChunks = [];
let stream = null;
let currentTranscript = '';
let videoPreview = null;
let micPermissionGranted = false;
let camPermissionGranted = false;

// Call State
let isCalling = false;
let callMode = null; // Changed to null initially
let isMinimized = false;
let isCallMinimized = false;
let isSenderMainVideo = false; // Changed to false so user sees themselves in small video initially
let callStartTime = null;
let isSpeakerOn = true;
let isMuted = false;

// ElevenLabs Configuration (Replace with your API key)
const ELEVENLABS_API_KEY = 'YOUR_API_KEY_HERE';
let voices = [];
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

const senders = {
  'John Doe': 'male',
  'user': 'female'
};

// Emoji Data
const emojis = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😵', '🤯', '🤠', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '💋', '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🎉', '🎊', '🎈', '🎁', '🎀', '🎄', '🎃', '🎆', '🎇', '✨', '🎐', '🎑', '🎖️', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '⛳', '🏹', '🎣', '🥊', '🥋', '🎽', '⛸️', '🥌', '🎿', '⛷️', '🏂'];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  loadEmojis();
  fetchVoices();
});

function initializeApp() {
  // Setup message input
  const messageInput = document.getElementById('messageInput');
  messageInput.addEventListener('input', handleTyping);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Setup search
  document.getElementById('searchBar').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    searchMessages(searchTerm);
  });

  // Close modals on outside click
  document.addEventListener('click', (e) => {
    if (!document.getElementById('contextMenu').contains(e.target) && !e.target.closest('.message')) {
      hideContextMenu();
    }
  });

  // Select default media mode
  selectMediaMode('voice-to-text');

  // Load voice synthesis voices
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  // Add welcome message
  setTimeout(() => {
    addWelcomeMessage();
  }, 500);
}

function addWelcomeMessage() {
  const welcomeDiv = document.createElement('div');
  welcomeDiv.className = 'message other';
  welcomeDiv.id = `msg-${Date.now()}`;
  welcomeDiv.innerHTML = `
    <div class="message-bubble">
      <div class="message-content">Hey! Welcome to our chat! Feel free to send messages, share files, or start a call. 😊</div>
      <div class="message-meta">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓</div>
    </div>
    <button class="read-aloud-btn" onclick="readAloudMessage('${welcomeDiv.id}')">🔊</button>
  `;
  welcomeDiv.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e, welcomeDiv.id);
  });
  document.getElementById('chatArea').appendChild(welcomeDiv);
}

// Load Emojis
function loadEmojis() {
  const emojiTab = document.getElementById('emojiTab');
  emojis.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn-grid';
    btn.textContent = emoji;
    btn.onclick = () => addEmoji(emoji);
    emojiTab.appendChild(btn);
  });
}

// Fetch ElevenLabs Voices
async function fetchVoices() {
  if (ELEVENLABS_API_KEY === 'YOUR_API_KEY_HERE') {
    console.log('ElevenLabs API key not configured. Using browser TTS.');
    return;
  }
  
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });
    if (response.ok) {
      const data = await response.json();
      voices = data.voices || [];
    }
  } catch (error) {
    console.error('Error fetching voices:', error);
  }
}

// Modal Functions
function openModal() {
  document.getElementById('chatModal').classList.add('show');
  document.getElementById('messageInput').focus();
  simulateJohnTyping();
}

function closeModal() {
  document.getElementById('chatModal').classList.remove('show');
  if (isCalling) {
    endCall();
  }
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  }
  if (recognition && recognition.recognizing) {
    stopVoiceToText();
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}

function minimizeModal() {
  const modalContent = document.getElementById('modalContent');
  modalContent.classList.add('minimized');
  document.getElementById('minimizeBtn').style.display = 'none';
  document.getElementById('maximizeBtn').style.display = 'inline-block';
  
  // Update minimized content to show profile picture, name, maximize and close buttons
  const minimizedContent = `
    <div class="user-info" style="padding: 10px;">
      <img src="https://randomuser.me/api/portraits/men/1.jpg" alt="John Doe" style="width: 40px; height: 40px;">
      <div style="flex: 1; margin-left: 10px;">
        <h2 style="font-size: 16px;">John Doe</h2>
      </div>
      <button class="maximize-btn" onclick="maximizeModal()" style="display: inline-block;">□</button>
      <button class="close-btn" onclick="closeModal()">✕</button>
    </div>
  `;
  
  isMinimized = true;
  updateMinimizedVideoPreview();
}

function maximizeModal() {
  document.getElementById('modalContent').classList.remove('minimized');
  document.getElementById('minimizeBtn').style.display = 'inline-block';
  document.getElementById('maximizeBtn').style.display = 'none';
  isMinimized = false;
  document.getElementById('minimizedVideoPreview').style.display = 'none';
}

// Message Functions
function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  const chatArea = document.getElementById('chatArea');
  const isReply = currentMessageId && !isEditing;

  if (text || selectedFiles.length > 0) {
    if (isEditing && currentMessageId) {
      const messageDiv = document.getElementById(currentMessageId);
      if (messageDiv) {
        const content = messageDiv.querySelector('.message-content');
        if (content) content.textContent = text;
      }
      isEditing = false;
      currentMessageId = null;
      input.value = '';
      hideContextMenu();
      return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message user${isReply ? ' reply' : ''}`;
    messageDiv.id = `msg-${Date.now()}`;
    
    let content = '<div class="message-bubble">';
    if (text) {
      content += `<div class="message-content">${text}</div>`;
    }
    
    // Add file attachments
    if (selectedFiles.length > 0) {
      selectedFiles.forEach(file => {
        const url = URL.createObjectURL(file);
        attachments.push({ url, type: file.type, file });
        
        if (file.type.startsWith('image/')) {
          content += `<img src="${url}" alt="${file.name}" onclick="openAttachmentModal('${url}', '${file.type}')">`;
        } else if (file.type.startsWith('video/')) {
          content += `<video src="${url}" controls onclick="openAttachmentModal('${url}', '${file.type}')"></video>`;
        } else if (file.type.startsWith('audio/')) {
          content += `<audio src="${url}" controls></audio>`;
        } else {
          content += `<a href="${url}" target="_blank" onclick="event.preventDefault(); openAttachmentModal('${url}', '${file.type}')">${file.name}</a>`;
        }
      });
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    content += `<div class="message-meta">${timestamp} ✓✓</div>`;
    content += '</div>';
    content += `<button class="read-aloud-btn" onclick="readAloudMessage('${messageDiv.id}')">🔊</button>`;
    
    messageDiv.innerHTML = content;
    messageDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, messageDiv.id);
    });

    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
    
    input.value = '';
    input.style.height = 'auto';
    selectedFiles = [];
    updateFilePreview();
    removeUserTypingIndicator();

    // Simulate reply
    if (!isReply) {
      setTimeout(() => {
        simulateReply();
      }, 2000);
    }

    currentMessageId = null;
    hideContextMenu();
  }
}

function simulateReply() {
  const replies = [
    "Thanks for your message! 😊",
    "That's interesting!",
    "I completely understand.",
    "Tell me more about that.",
    "Great point!",
    "How can I help you with that?",
    "That sounds good to me!",
    "I appreciate you sharing that.",
    "Let me think about that.",
    "Absolutely! 👍"
  ];

  showJohnTypingIndicator();
  
  setTimeout(() => {
    removeJohnTypingIndicator();
    
    const replyDiv = document.createElement('div');
    replyDiv.className = 'message other';
    replyDiv.id = `msg-${Date.now()}`;
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    replyDiv.innerHTML = `
      <div class="message-bubble">
        <div class="message-content">${randomReply}</div>
        <div class="message-meta">${timestamp} ✓✓</div>
      </div>
      <button class="read-aloud-btn" onclick="readAloudMessage('${replyDiv.id}')">🔊</button>
    `;
    
    replyDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, replyDiv.id);
    });
    
    document.getElementById('chatArea').appendChild(replyDiv);
    document.getElementById('chatArea').scrollTop = document.getElementById('chatArea').scrollHeight;
  }, 2000);
}

// Typing Indicators
function handleTyping() {
  const input = document.getElementById('messageInput');
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  
  let userTypingIndicator = document.getElementById('userTypingIndicator');
  const chatArea = document.getElementById('chatArea');
  
  if (input.value.trim() && !userTypingIndicator) {
    userTypingIndicator = document.createElement('div');
    userTypingIndicator.id = 'userTypingIndicator';
    userTypingIndicator.className = 'message user';
    userTypingIndicator.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
    chatArea.appendChild(userTypingIndicator);
    chatArea.scrollTop = chatArea.scrollHeight;
  } else if (!input.value.trim() && userTypingIndicator) {
    userTypingIndicator.remove();
  }
}

function removeUserTypingIndicator() {
  const indicator = document.getElementById('userTypingIndicator');
  if (indicator) indicator.remove();
}

function showJohnTypingIndicator() {
  const typingIndicatorHeader = document.getElementById('typingIndicatorHeader');
  typingIndicatorHeader.style.display = 'block';
  
  const chatArea = document.getElementById('chatArea');
  const typingDiv = document.createElement('div');
  typingDiv.id = 'johnTypingIndicator';
  typingDiv.className = 'message other';
  typingDiv.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
  chatArea.appendChild(typingDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function removeJohnTypingIndicator() {
  const typingIndicatorHeader = document.getElementById('typingIndicatorHeader');
  typingIndicatorHeader.style.display = 'none';
  
  const indicator = document.getElementById('johnTypingIndicator');
  if (indicator) indicator.remove();
}

function simulateJohnTyping() {
  setInterval(() => {
    if (Math.random() > 0.7 && !document.getElementById('johnTypingIndicator')) {
      showJohnTypingIndicator();
      setTimeout(() => {
        removeJohnTypingIndicator();
      }, 3000);
    }
  }, 8000);
}

// Search Messages
function searchMessages(searchTerm) {
  const messages = document.querySelectorAll('.message');
  messages.forEach(msg => {
    const content = msg.querySelector('.message-content');
    if (content) {
      const text = content.textContent.toLowerCase();
      msg.style.display = text.includes(searchTerm) ? 'block' : 'none';
    }
  });
}

// Context Menu
function showContextMenu(event, messageId) {
  currentMessageId = messageId;
  const contextMenu = document.getElementById('contextMenu');
  contextMenu.style.top = `${event.clientY}px`;
  contextMenu.style.left = `${event.clientX}px`;
  contextMenu.classList.add('show');

  const isUserMessage = document.getElementById(messageId).classList.contains('user');
  document.getElementById('editBtn').style.display = isUserMessage && !isSelecting ? 'block' : 'none';
  document.getElementById('deleteBtn').style.display = isUserMessage || isSelecting ? 'block' : 'none';
  document.getElementById('forwardBtn').style.display = isSelecting ? 'block' : 'none';
  document.getElementById('copyBtn').style.display = isSelecting ? 'block' : 'none';
  document.getElementById('selectBtn').style.display = isSelecting ? 'none' : 'block';
  document.getElementById('selectAllBtn').style.display = isSelecting ? 'none' : 'block';
  
  const isPinned = document.getElementById(messageId).classList.contains('pinned');
  document.getElementById('pinBtn').style.display = isPinned ? 'none' : 'block';
  document.getElementById('unpinBtn').style.display = isPinned ? 'block' : 'none';
}

function hideContextMenu() {
  document.getElementById('contextMenu').classList.remove('show');
  currentMessageId = null;
}

// Message Actions (keeping all original functions)
function editMessage() {
  if (currentMessageId) {
    const messageDiv = document.getElementById(currentMessageId);
    if (messageDiv && messageDiv.classList.contains('user')) {
      const content = messageDiv.querySelector('.message-content');
      if (content) {
        document.getElementById('messageInput').value = content.textContent;
        isEditing = true;
        document.getElementById('messageInput').focus();
      }
    }
    hideContextMenu();
  }
}

function showDeletePrompt() {
  const deletePrompt = document.getElementById('deletePrompt');
  const deletePromptText = document.getElementById('deletePromptText');
  const deleteForReceiverLabel = document.getElementById('deleteForReceiverLabel');
  const isUserMessage = document.getElementById(currentMessageId).classList.contains('user');

  if (isSelecting) {
    deletePromptText.textContent = `Delete ${selectedMessageIds.length} selected messages?`;
    deleteForReceiverLabel.style.display = 'block';
  } else {
    deletePromptText.textContent = isUserMessage ? 'Delete this message?' : 'This message will only be deleted for you.';
    deleteForReceiverLabel.style.display = isUserMessage ? 'block' : 'none';
  }

  deletePrompt.classList.add('show');
}

function hideDeletePrompt() {
  document.getElementById('deletePrompt').classList.remove('show');
  document.getElementById('deleteForReceiver').checked = false;
}

function confirmDelete() {
  const deleteForReceiver = document.getElementById('deleteForReceiver').checked;
  deleteMessage(deleteForReceiver);
  hideDeletePrompt();
}

function deleteMessage(deleteForReceiver) {
  if (isSelecting) {
    selectedMessageIds.forEach(id => {
      const msgDiv = document.getElementById(id);
      if (msgDiv) {
        deletedMessages.push({
          id: id,
          content: msgDiv.innerHTML,
          parent: msgDiv.parentElement,
          nextSibling: msgDiv.nextElementSibling
        });
        msgDiv.remove();
      }
    });
    clearSelection();
  } else if (currentMessageId) {
    const messageDiv = document.getElementById(currentMessageId);
    if (messageDiv) {
      deletedMessages.push({
        id: currentMessageId,
        content: messageDiv.innerHTML,
        parent: messageDiv.parentElement,
        nextSibling: messageDiv.nextElementSibling
      });
      messageDiv.remove();
    }
  }

  const undoContainer = document.getElementById('undoContainer');
  undoContainer.classList.add('show');
  clearTimeout(undoTimeout);
  undoTimeout = setTimeout(() => {
    undoContainer.classList.remove('show');
    deletedMessages = [];
  }, 5000);

  hideContextMenu();
}

function undoDelete() {
  deletedMessages.forEach(deleted => {
    const messageDiv = document.createElement('div');
    messageDiv.id = deleted.id;
    messageDiv.innerHTML = deleted.content;
    
    // Re-add event listener
    messageDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, messageDiv.id);
    });
    
    if (deleted.nextSibling) {
      deleted.parent.insertBefore(messageDiv, deleted.nextSibling);
    } else {
      deleted.parent.appendChild(messageDiv);
    }
  });
  
  document.getElementById('undoContainer').classList.remove('show');
  deletedMessages = [];
  clearTimeout(undoTimeout);
}

function copyMessage() {
  if (currentMessageId) {
    const messageDiv = document.getElementById(currentMessageId);
    const content = messageDiv.querySelector('.message-content');
    if (content) {
      navigator.clipboard.writeText(content.textContent);
      showToast('Message copied to clipboard');
    }
    hideContextMenu();
  }
}

function forwardMessage() {
  if (currentMessageId) {
    const messageDiv = document.getElementById(currentMessageId);
    const content = messageDiv.querySelector('.message-content');
    if (content) {
      document.getElementById('messageInput').value = `Forwarded: ${content.textContent}`;
      document.getElementById('messageInput').focus();
    }
    hideContextMenu();
  }
}

function replyMessage() {
  if (currentMessageId) {
    const messageDiv = document.getElementById(currentMessageId);
    const content = messageDiv.querySelector('.message-content');
    if (content) {
      document.getElementById('messageInput').value = `Replying to: "${content.textContent.substring(0, 50)}..."\n`;
      document.getElementById('messageInput').focus();
    }
    hideContextMenu();
  }
}

function pinMessage() {
  if (currentMessageId) {
    const messageDiv = document.getElementById(currentMessageId);
    messageDiv.classList.add('pinned');
    
    const pinnedMessages = document.getElementById('pinnedMessages');
    pinnedMessages.classList.add('show');
    
    const content = messageDiv.querySelector('.message-content');
    if (content) {
      const pinnedItem = document.createElement('div');
      pinnedItem.className = 'pinned-message-item';
      pinnedItem.id = `pinned-${currentMessageId}`;
      pinnedItem.textContent = content.textContent.substring(0, 50) + '...';
      pinnedItem.onclick = () => {
        document.getElementById(currentMessageId).scrollIntoView({ behavior: 'smooth' });
      };
      pinnedMessages.appendChild(pinnedItem);
    }
    
    hideContextMenu();
  }
}

function unpinMessage() {
  if (currentMessageId) {
    const messageDiv = document.getElementById(currentMessageId);
    messageDiv.classList.remove('pinned');
    
    const pinnedItem = document.getElementById(`pinned-${currentMessageId}`);
    if (pinnedItem) pinnedItem.remove();
    
    const pinnedMessages = document.getElementById('pinnedMessages');
    if (pinnedMessages.children.length === 1) {
      pinnedMessages.classList.remove('show');
    }
    
    hideContextMenu();
  }
}

function reactMessage(emoji) {
  if (currentMessageId) {
    const messageDiv = document.getElementById(currentMessageId);
    let reactionsDiv = messageDiv.querySelector('.message-reactions');
    
    if (!reactionsDiv) {
      reactionsDiv = document.createElement('div');
      reactionsDiv.className = 'message-reactions';
      messageDiv.querySelector('.message-bubble').appendChild(reactionsDiv);
    }
    
    const existingReaction = Array.from(reactionsDiv.children).find(r => r.textContent.includes(emoji));
    if (existingReaction) {
      const count = parseInt(existingReaction.querySelector('span')?.textContent || '0') + 1;
      existingReaction.innerHTML = `${emoji} <span>${count}</span>`;
    } else {
      const reaction = document.createElement('div');
      reaction.className = 'reaction';
      reaction.innerHTML = `${emoji} <span>1</span>`;
      reactionsDiv.appendChild(reaction);
    }
    
    hideContextMenu();
  }
}

// Selection Functions
function selectMessage() {
  if (currentMessageId) {
    isSelecting = true;
    const messageDiv = document.getElementById(currentMessageId);
    messageDiv.classList.add('selected');
    selectedMessageIds.push(currentMessageId);
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'message-checkbox';
    checkbox.checked = true;
    checkbox.onchange = (e) => {
      if (!e.target.checked) {
        messageDiv.classList.remove('selected');
        selectedMessageIds = selectedMessageIds.filter(id => id !== currentMessageId);
        if (selectedMessageIds.length === 0) {
          clearSelection();
        }
      }
    };
    messageDiv.prepend(checkbox);
    
    hideContextMenu();
  }
}

function selectAllMessages() {
  isSelecting = true;
  const messages = document.querySelectorAll('.message:not(.typing)');
  selectedMessageIds = [];
  
  messages.forEach(message => {
    message.classList.add('selected');
    selectedMessageIds.push(message.id);
    
    if (!message.querySelector('.message-checkbox')) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'message-checkbox';
      checkbox.checked = true;
      message.prepend(checkbox);
    }
  });
  
  hideContextMenu();
}

function clearSelection() {
  isSelecting = false;
  selectedMessageIds = [];
  document.querySelectorAll('.message.selected').forEach(message => {
    message.classList.remove('selected');
    const checkbox = message.querySelector('.message-checkbox');
    if (checkbox) checkbox.remove();
  });
}

// File Handling
function handleFileChange() {
  const fileInput = document.getElementById('fileInput');
  selectedFiles = Array.from(fileInput.files);
  updateFilePreview();
}

function updateFilePreview() {
  const filePreview = document.getElementById('filePreview');
  
  if (selectedFiles.length > 0) {
    filePreview.classList.add('show');
    filePreview.innerHTML = '<ul>';
    
    selectedFiles.forEach((file, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        ${file.name}
        <button class="file-remove" onclick="removeFile(${index})">✕</button>
      `;
      filePreview.querySelector('ul').appendChild(li);
    });
    
    filePreview.innerHTML += '</ul>';
  } else {
    filePreview.classList.remove('show');
    filePreview.innerHTML = '';
  }
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateFilePreview();
}

// Emoji/GIF Modal
function openEmojiGifModal() {
  document.getElementById('emojiGifModal').classList.add('show');
}

function closeEmojiGifModal() {
  document.getElementById('emojiGifModal').classList.remove('show');
}

function showTab(tabName) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  event.target.classList.add('active');
  document.getElementById(tabName).classList.add('active');
}

function addEmoji(emoji) {
  const input = document.getElementById('messageInput');
  input.value += emoji;
  input.focus();
  closeEmojiGifModal();
}

// Updated Media Recording Functions
function selectMediaMode(mode) {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    // If recording, stop it
    stopRecording();
    return;
  }
  
  if (recognition && recognition.recognizing) {
    stopVoiceToText();
    return;
  }

  // If clicking the same mode that's active, start recording
  if (mediaMode === mode) {
    if (mode === 'voice-to-text') {
      startVoiceToText();
    } else if (mode === 'voice-record' || mode === 'video-record') {
      startRecording(mode === 'video-record');
    }
    return;
  }

  // Otherwise, just switch mode
  mediaMode = mode;
  document.querySelectorAll('.media-btn').forEach(btn => btn.classList.remove('active'));
  
  const btnMap = {
    'voice-to-text': 'voiceToTextBtn',
    'voice-record': 'voiceRecordBtn',
    'video-record': 'videoRecordBtn'
  };
  
  document.getElementById(btnMap[mode]).classList.add('active');
  
  // Hide control and stop buttons when switching modes
  document.getElementById('controlBtn').style.display = 'none';
  document.getElementById('stopBtn').style.display = 'none';
  
  updateStatus(`Selected ${mode.replace('-', ' ')} mode. Click again to start.`);
}

async function checkPermissions(isVideo) {
  try {
    const constraints = isVideo ? { video: true, audio: true } : { audio: true };
    const testStream = await navigator.mediaDevices.getUserMedia(constraints);
    testStream.getTracks().forEach(track => track.stop());
    return true;
  } catch (e) {
    return false;
  }
}

async function getMediaStream(isVideo) {
  if (stream) return stream;
  
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: isVideo ? { width: 1280, height: 720 } : false
    });
    
    if (isMuted && stream.getAudioTracks().length > 0) {
      stream.getAudioTracks()[0].enabled = false;
    }
    
    return stream;
  } catch (e) {
    updateStatus(`Error accessing ${isVideo ? 'camera/microphone' : 'microphone'}: ${e.message}`);
    return null;
  }
}

// Updated control recording to work as cancel button
async function controlRecording() {
  // This now acts as a cancel button
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    cancelRecording();
  } else if (recognition && recognition.recognizing) {
    stopVoiceToText();
  }
}

function cancelRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    recordedChunks = []; // Clear recorded data
    mediaRecorder.stop();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    
    if (videoPreview) {
      videoPreview.remove();
      videoPreview = null;
    }
    
    document.getElementById('voiceRecording').classList.remove('active');
    document.getElementById('minimizedVideoPreview').style.display = 'none';
    stopRecordingTimer();
    
    // Reset button states
    document.querySelectorAll('.media-btn').forEach(btn => {
      btn.textContent = btn.id === 'voiceToTextBtn' ? '🎤' : 
                       btn.id === 'voiceRecordBtn' ? '🎙️' : '📹';
    });
    
    document.getElementById('controlBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'none';
    
    updateStatus('Recording cancelled');
  }
}

async function startVoiceToText() {
  if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
    updateStatus('Speech recognition not supported.');
    return;
  }

  const hasPermission = await checkPermissions(false);
  if (!hasPermission) {
    stream = await getMediaStream(false);
    if (!stream) return;
  }

  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.recognizing = true;

  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        currentTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }
    document.getElementById('messageInput').value = currentTranscript + interimTranscript;
    updateStatus('Transcribing...');
  };

  recognition.onerror = (event) => {
    updateStatus(`Speech recognition error: ${event.error}`);
    stopVoiceToText();
  };

  recognition.onend = () => {
    if (recognition.recognizing) {
      try {
        recognition.start();
      } catch (e) {
        stopVoiceToText();
      }
    }
  };

  try {
    recognition.start();
    // Change button to pause icon
    document.getElementById('voiceToTextBtn').textContent = '⏸️';
    // Show cancel button only
    document.getElementById('controlBtn').style.display = 'inline-block';
    document.getElementById('controlBtn').textContent = '❌';
    document.getElementById('stopBtn').style.display = 'none';
    updateStatus('Listening...');
  } catch (e) {
    updateStatus('Error starting speech recognition');
  }
}

function stopVoiceToText() {
  if (recognition && recognition.recognizing) {
    recognition.stop();
    recognition.recognizing = false;
    document.getElementById('voiceToTextBtn').textContent = '🎤';
    document.getElementById('controlBtn').style.display = 'none';
    currentTranscript = '';
    updateStatus('');
  }
}

async function startRecording(isVideo) {
  stream = await getMediaStream(isVideo);
  if (!stream) return;

  try {
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: isVideo ? 'video/webm;codecs=vp8,opus' : 'audio/webm'
    });
    
    recordedChunks = [];

    if (isVideo) {
      videoPreview = document.createElement('div');
      videoPreview.className = 'video-preview';
      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.muted = true;
      videoElement.play();
      videoPreview.appendChild(videoElement);
      document.getElementById('chatArea').appendChild(videoPreview);
      document.getElementById('chatArea').scrollTop = document.getElementById('chatArea').scrollHeight;
      updateMinimizedVideoPreview();
      document.getElementById('videoRecordBtn').textContent = '⏸️';
    } else {
      // Show voice recording indicator
      document.getElementById('voiceRecording').classList.add('active');
      startRecordingTimer();
      document.getElementById('voiceRecordBtn').textContent = '⏸️';
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (videoPreview) {
        videoPreview.remove();
        videoPreview = null;
      }
      
      document.getElementById('voiceRecording').classList.remove('active');
      document.getElementById('minimizedVideoPreview').style.display = 'none';
      stopRecordingTimer();
      
      // Only send if we have recorded data
      if (recordedChunks.length > 0) {
        const blob = new Blob(recordedChunks, { 
          type: isVideo ? 'video/webm' : 'audio/webm' 
        });
        
        const fileName = isVideo ? `video-${Date.now()}.webm` : `audio-${Date.now()}.webm`;
        const file = new File([blob], fileName, { 
          type: isVideo ? 'video/webm' : 'audio/webm' 
        });
        
        selectedFiles = [file];
        updateFilePreview();
        sendMessage();
      }
      
      // Reset button states
      document.getElementById('voiceRecordBtn').textContent = '🎙️';
      document.getElementById('videoRecordBtn').textContent = '📹';
      document.getElementById('controlBtn').style.display = 'none';
      document.getElementById('stopBtn').style.display = 'none';
      updateStatus('');
    };

    mediaRecorder.start();
    // Show cancel button only
    document.getElementById('controlBtn').style.display = 'inline-block';
    document.getElementById('controlBtn').textContent = '❌';
    document.getElementById('stopBtn').style.display = 'none';
    updateStatus(isVideo ? 'Recording video...' : 'Recording audio...');
  } catch (e) {
    updateStatus('Error starting recording');
    if (videoPreview) {
      videoPreview.remove();
      videoPreview = null;
    }
    document.getElementById('voiceRecording').classList.remove('active');
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }
  if (recognition && recognition.recognizing) {
    stopVoiceToText();
  }
}

let recordingInterval;
function startRecordingTimer() {
  let seconds = 0;
  recordingInterval = setInterval(() => {
    seconds++;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById('recordingTime').textContent = 
      `${mins}:${secs.toString().padStart(2, '0')}`;
  }, 1000);
}

function stopRecordingTimer() {
  clearInterval(recordingInterval);
  document.getElementById('recordingTime').textContent = '0:00';
}

// Updated Call Functions
function startOrEndCall() {
  if (isCalling) {
    endCall();
  } else {
    openCallModal(); // Just open modal, don't start call
  }
}

function openCallModal() {
  // Just open the modal without starting a call
  document.getElementById('callModal').classList.add('show');
  updateCallModal();
  
  // Update call modal header if needed
  if (document.querySelector('.call-user-info')) {
    const callUserInfo = document.querySelector('.call-user-info');
    // Add rating and typing indicator info
    if (!callUserInfo.querySelector('.rating-container')) {
      const ratingDiv = document.createElement('div');
      ratingDiv.innerHTML = `
        <div class="rating-container" style="margin-top: 8px;">
          <span class="rating-stars" style="color: #f59e0b;">★★★★★</span> <span style="color: white;">(50 People)</span>
        </div>
        <p id="callTypingIndicator" class="typing-indicator-header" style="display: none;">
          <span>.</span><span>.</span><span>.</span>
        </p>
      `;
      callUserInfo.appendChild(ratingDiv);
    }
  }
}

function closeCallModal() {
  document.getElementById('callModal').classList.remove('show');
  if (isCalling) {
    endCall();
  }
}

function minimizeCallModal() {
  const callModalContent = document.querySelector('.call-modal-content');
  callModalContent.classList.add('minimized');
  document.getElementById('callMinimizeBtn').style.display = 'none';
  document.getElementById('callMaximizeBtn').style.display = 'inline-block';
  isCallMinimized = true;
  updateMinimizedVideoPreview();
}

function maximizeCallModal() {
  const callModalContent = document.querySelector('.call-modal-content');
  callModalContent.classList.remove('minimized');
  document.getElementById('callMinimizeBtn').style.display = 'inline-block';
  document.getElementById('callMaximizeBtn').style.display = 'none';
  isCallMinimized = false;
  document.getElementById('minimizedVideoPreview').style.display = 'none';
  updateCallModal();
}

async function toggleVideoCall() {
  if (isCalling && callMode === 'video') {
    // If already on video call, ask for confirmation to end
    if (confirm('End video call?')) {
      endCall();
    }
  } else if (isCalling && callMode === 'voice') {
    // Switching from voice to video
    if (confirm('Switch to video call?')) {
      callMode = 'video';
      stream = await getMediaStream(true);
      updateCallModal();
      updateCallButtons();
    }
  } else {
    // Start new video call
    callMode = 'video';
    await startCall();
  }
}

async function toggleVoiceCall() {
  if (isCalling && callMode === 'voice') {
    // If already on voice call, ask for confirmation to end
    if (confirm('End voice call?')) {
      endCall();
    }
  } else if (isCalling && callMode === 'video') {
    // Switching from video to voice
    if (confirm('Switch to voice call?')) {
      callMode = 'voice';
      if (stream) {
        stream.getVideoTracks().forEach(track => track.stop());
      }
      updateCallModal();
      updateCallButtons();
    }
  } else {
    // Start new voice call
    callMode = 'voice';
    await startCall();
  }
}

function updateCallButtons() {
  const videoBtn = document.getElementById('switchToVideoBtn');
  const voiceBtn = document.getElementById('switchToVoiceBtn');
  
  // Reset both buttons
  videoBtn.classList.remove('active');
  voiceBtn.classList.remove('active');
  
  // Highlight active mode
  if (callMode === 'video') {
    videoBtn.classList.add('active');
  } else if (callMode === 'voice') {
    voiceBtn.classList.add('active');
  }
}

async function startCall() {
  if (!callMode) return; // Don't start if no mode selected
  
  isCalling = true;
  callStartTime = Date.now();
  
  const callBtn = document.getElementById('callBtn');
  callBtn.classList.add('active');
  callBtn.textContent = '⏹️';
  
  stream = await getMediaStream(callMode === 'video');
  if (!stream) {
    endCall();
    return;
  }
  
  updateCallModal();
  updateCallButtons();
  startCallTimer();
}

function endCall() {
  if (!isCalling) return;
  
  isCalling = false;
  const callDuration = Math.floor((Date.now() - callStartTime) / 1000);
  
  const callBtn = document.getElementById('callBtn');
  callBtn.classList.remove('active');
  callBtn.textContent = '📞';
  
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  
  // Add call history message
  const chatArea = document.getElementById('chatArea');
  const callHistoryDiv = document.createElement('div');
  callHistoryDiv.className = 'message user call-history';
  callHistoryDiv.id = `msg-${Date.now()}`;
  
  const mins = Math.floor(callDuration / 60);
  const secs = callDuration % 60;
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  callHistoryDiv.innerHTML = `
    <div class="message-bubble">
      <div class="message-content">${callMode === 'video' ? '📹' : '📞'} ${callMode} call - ${mins}:${secs.toString().padStart(2, '0')}</div>
      <div class="message-meta">${timestamp} ✓✓</div>
    </div>
    <button class="read-aloud-btn" onclick="readAloudMessage('${callHistoryDiv.id}')">🔊</button>
  `;
  
  callHistoryDiv.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e, callHistoryDiv.id);
  });
  
  chatArea.appendChild(callHistoryDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
  
  // Reset call mode
  callMode = null;
  updateCallButtons();
  stopCallTimer();
  closeCallModal();
}

let callInterval;
function startCallTimer() {
  let seconds = 0;
  callInterval = setInterval(() => {
    seconds++;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    // Update call timer display if needed
  }, 1000);
}

function stopCallTimer() {
  clearInterval(callInterval);
}

function toggleSpeaker() {
  isSpeakerOn = !isSpeakerOn;
  const speakerBtn = document.getElementById('speakerBtn');
  speakerBtn.textContent = isSpeakerOn ? '🔊' : '🔇';
  
  // Only toggle active class, no red color for muted state
  if (isSpeakerOn) {
    speakerBtn.classList.add('active');
  } else {
    speakerBtn.classList.remove('active');
  }
  
  updateStatus(isSpeakerOn ? 'Speaker on' : 'Speaker muted');
}

function toggleMute() {
  isMuted = !isMuted;
  const muteBtn = document.getElementById('muteBtn');
  muteBtn.textContent = isMuted ? '🔇' : '🎤';
  muteBtn.classList.toggle('muted', isMuted);
  
  if (stream && stream.getAudioTracks().length > 0) {
    stream.getAudioTracks()[0].enabled = !isMuted;
  }
  updateStatus(isMuted ? 'Microphone muted' : 'Microphone on');
}

async function shareScreen() {
  if (!isCalling || callMode !== 'video') {
    updateStatus('Screen sharing is only available during video calls');
    return;
  }
  
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    // Handle screen sharing
    updateStatus('Screen sharing started');
    
    screenStream.getVideoTracks()[0].onended = () => {
      updateStatus('Screen sharing stopped');
    };
  } catch (e) {
    updateStatus('Error sharing screen');
  }
}

function swapVideo() {
  isSenderMainVideo = !isSenderMainVideo;
  updateCallModal();
}

function updateCallModal() {
  const callVideo = document.getElementById('callVideo');
  const voiceCallAnimation = document.getElementById('voiceCallAnimation');
  const swapVideoBtn = document.getElementById('swapVideoBtn');
  
  callVideo.innerHTML = '';
  voiceCallAnimation.classList.remove('active');
  swapVideoBtn.style.display = 'none';
  
  if (!isCalling) {
    // Show default state when not calling
    const placeholder = document.createElement('div');
    placeholder.style.color = '#9ca3af';
    placeholder.style.textAlign = 'center';
    placeholder.innerHTML = 'Select voice or video call to start';
    callVideo.appendChild(placeholder);
  } else if (callMode === 'voice') {
    voiceCallAnimation.classList.add('active');
    callVideo.appendChild(voiceCallAnimation);
  } else if (callMode === 'video' && stream) {
    // User sees themselves in small video by default
    const mainVideo = document.createElement('video');
    mainVideo.className = 'main-video';
    mainVideo.srcObject = isSenderMainVideo ? stream : stream; // This would be remote stream in real app
    mainVideo.autoplay = true;
    mainVideo.muted = isSenderMainVideo;
    callVideo.appendChild(mainVideo);
    
    const insetVideo = document.createElement('video');
    insetVideo.className = 'inset-video';
    insetVideo.srcObject = !isSenderMainVideo ? stream : stream; // This would be local stream
    insetVideo.autoplay = true;
    insetVideo.muted = true;
    callVideo.appendChild(insetVideo);
    
    swapVideoBtn.style.display = 'inline-block';
  }
  
  updateMinimizedVideoPreview();
}

function updateMinimizedVideoPreview() {
  const minimizedVideo = document.getElementById('minimizedVideo');
  const preview = document.getElementById('minimizedVideoPreview');
  
  if ((mediaMode === 'video-record' && mediaRecorder && mediaRecorder.state === 'recording') || 
      (isCalling && callMode === 'video' && isCallMinimized)) {
    if (stream) {
      minimizedVideo.srcObject = stream;
      minimizedVideo.play().catch(e => console.error('Error playing video:', e));
      preview.style.display = 'block';
    }
  } else {
    minimizedVideo.srcObject = null;
    preview.style.display = 'none';
  }
}

// Fixed Text-to-Speech Functions
function getVoiceIdForSender(sender) {
  if (voices.length === 0) return DEFAULT_VOICE_ID;
  const gender = senders[sender] || 'unknown';
  const voice = voices.find(v => v.name && v.name.toLowerCase().includes(gender));
  return voice ? voice.voice_id : DEFAULT_VOICE_ID;
}

async function readAloudMessage(messageId) {
  const messageDiv = document.getElementById(messageId);
  const content = messageDiv.querySelector('.message-content');
  const text = content?.textContent || '';
  
  if (!text) return;
  
  const sender = messageDiv.classList.contains('user') ? 'user' : 'John Doe';
  
  if (voices.length > 0 && ELEVENLABS_API_KEY !== 'YOUR_API_KEY_HERE') {
    try {
      const voiceId = getVoiceIdForSender(sender);
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });
      
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        updateStatus(`Reading message`);
        return;
      }
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
    }
  }
  
  // Fallback to browser TTS
  useBrowserTTS(text, sender);
}

function useBrowserTTS(text, sender) {
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const gender = senders[sender] || 'unknown';
  const voice = voices.find(v => v.name.toLowerCase().includes(gender)) || voices[0];
  
  if (voice) utterance.voice = voice;
  utterance.rate = 1.0;
  utterance.pitch = gender === 'male' ? 0.9 : 1.1;
  
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  updateStatus('Reading message');
}

// Fixed Read All Messages
function readAllMessages() {
  if (isReadingAll) {
    stopReading();
    return;
  }
  
  isReadingAll = true;
  document.getElementById('readAllBtn').textContent = '⏸️';
  document.getElementById('stopReadBtn').style.display = 'inline-block';
  document.getElementById('restartReadBtn').style.display = 'inline-block';
  
  audioQueue = [];
  const messages = document.querySelectorAll('.message:not(.typing):not(.video-preview)');
  
  messages.forEach(message => {
    const content = message.querySelector('.message-content');
    const text = content?.textContent || '';
    if (text) {
      const sender = message.classList.contains('user') ? 'user' : 'John Doe';
      audioQueue.push({ text, sender, id: message.id });
    }
  });
  
  currentUtteranceIndex = 0;
  if (audioQueue.length > 0) {
    playNextAudio();
  } else {
    stopReading();
    updateStatus('No messages to read');
  }
}

async function playNextAudio() {
  if (currentUtteranceIndex >= audioQueue.length || !isReadingAll) {
    stopReading();
    return;
  }
  
  const { text, sender, id } = audioQueue[currentUtteranceIndex];
  
  // Scroll to current message
  const messageEl = document.getElementById(id);
  if (messageEl) {
    messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  // Try ElevenLabs first
  if (voices.length > 0 && ELEVENLABS_API_KEY !== 'YOUR_API_KEY_HERE') {
    try {
      const voiceId = getVoiceIdForSender(sender);
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });
      
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        currentAudio = new Audio(audioUrl);
        
        currentAudio.onended = () => {
          currentUtteranceIndex++;
          playNextAudio();
        };
        
        currentAudio.onerror = () => {
          console.error('Audio playback error');
          currentUtteranceIndex++;
          playNextAudio();
        };
        
        currentAudio.play();
        return;
      }
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
    }
  }
  
  // Fallback to browser TTS
  const utterance = new SpeechSynthesisUtterance(text);
  const browserVoices = window.speechSynthesis.getVoices();
  const gender = senders[sender] || 'unknown';
  const voice = browserVoices.find(v => v.name.toLowerCase().includes(gender)) || browserVoices[0];
  
  if (voice) utterance.voice = voice;
  utterance.rate = 1.0;
  utterance.pitch = gender === 'male' ? 0.9 : 1.1;
  
  utterance.onend = () => {
    currentUtteranceIndex++;
    playNextAudio();
  };
  
  utterance.onerror = () => {
    console.error('TTS error');
    currentUtteranceIndex++;
    playNextAudio();
  };
  
  currentAudio = utterance;
  window.speechSynthesis.speak(utterance);
}

function stopReading() {
  isReadingAll = false;
  
  if (currentAudio instanceof Audio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  } else if (currentAudio) {
    window.speechSynthesis.cancel();
  }
  
  currentAudio = null;
  audioQueue = [];
  currentUtteranceIndex = 0;
  
  document.getElementById('readAllBtn').textContent = '🔊';
  document.getElementById('stopReadBtn').style.display = 'none';
  document.getElementById('restartReadBtn').style.display = 'none';
  
  updateStatus('Stopped reading');
}

function restartReading() {
  stopReading();
  setTimeout(() => {
    readAllMessages();
  }, 100);
}

// Attachment Modal functions (keeping all original)
function openAttachmentModal(url, type) {
  const viewer = document.getElementById('attachmentViewer');
  const modal = document.getElementById('attachmentModal');
  
  viewer.innerHTML = '';
  currentAttachmentIndex = attachments.findIndex(att => att.url === url);
  zoomLevel = 1;
  
  let element;
  if (type.startsWith('image/')) {
    element = document.createElement('img');
    element.src = url;
    element.style.transform = `scale(${zoomLevel})`;
  } else if (type.startsWith('video/')) {
    element = document.createElement('video');
    element.src = url;
    element.controls = true;
  } else if (type.startsWith('audio/')) {
    element = document.createElement('audio');
    element.src = url;
    element.controls = true;
  } else if (type === 'application/pdf') {
    element = document.createElement('iframe');
    element.src = url;
  } else {
    element = document.createElement('div');
    element.textContent = 'Preview not available. Click Download to view.';
  }
  
  viewer.appendChild(element);
  modal.classList.add('show');
}

function closeAttachmentModal() {
  document.getElementById('attachmentModal').classList.remove('show');
}

function downloadAttachment() {
  if (currentAttachmentIndex >= 0) {
    const { url, file } = attachments[currentAttachmentIndex];
    const a = document.createElement('a');
    a.href = url;
    a.download = file?.name || 'attachment';
    a.click();
  }
}

function toggleFullScreen() {
  const modal = document.getElementById('attachmentModal');
  if (!document.fullscreenElement) {
    modal.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function previousAttachment() {
  if (currentAttachmentIndex > 0) {
    currentAttachmentIndex--;
    const { url, type } = attachments[currentAttachmentIndex];
    openAttachmentModal(url, type);
  }
}

function nextAttachment() {
  if (currentAttachmentIndex < attachments.length - 1) {
    currentAttachmentIndex++;
    const { url, type } = attachments[currentAttachmentIndex];
    openAttachmentModal(url, type);
  }
}

function forwardAttachment() {
  if (currentAttachmentIndex >= 0) {
    selectedFiles = [attachments[currentAttachmentIndex].file];
    updateFilePreview();
    closeAttachmentModal();
    document.getElementById('messageInput').focus();
  }
}

function replayAttachment() {
  const video = document.querySelector('#attachmentViewer video');
  if (video) {
    video.currentTime = 0;
    video.play();
  }
}

// Continuation of copyAttachmentLink and remaining functions

function copyAttachmentLink() {
 if (currentAttachmentIndex >= 0) {
   navigator.clipboard.writeText(attachments[currentAttachmentIndex].url);
   showToast('Link copied to clipboard');
 }
}

function zoomAttachment(factor) {
 const img = document.querySelector('#attachmentViewer img');
 if (img) {
   zoomLevel *= factor;
   zoomLevel = Math.min(Math.max(zoomLevel, 0.5), 3);
   img.style.transform = `scale(${zoomLevel})`;
 }
}

// Utility Functions
function updateStatus(message) {
 document.getElementById('status').textContent = message;
 if (message) {
   setTimeout(() => {
     document.getElementById('status').textContent = '';
   }, 3000);
 }
}

function showToast(message, type = 'info') {
 const container = document.getElementById('toastContainer');
 const toast = document.createElement('div');
 toast.className = `toast ${type}`;
 toast.textContent = message;
 
 container.appendChild(toast);
 
 setTimeout(() => {
   toast.style.animation = 'toastSlide 0.3s ease reverse';
   setTimeout(() => toast.remove(), 300);
 }, 3000);
}

// Initialize app
console.log('Enhanced Chat Application loaded successfully!');