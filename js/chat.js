// =============================================
// ENHANCED CHAT APPLICATION - COMPLETE JS
// =============================================

const ChatApp = {
  // State Management
  state: {
    currentUser: {
      id: 'user-1',
      name: 'You',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      occupation: 'Software Developer',
      status: 'online'
    },
    selectedChat: null,
    messages: {},
    typingTimer: null,
    isTyping: false,
    mediaRecorder: null,
    videoRecorder: null,
    recognition: null,
    recordingStartTime: null,
    currentStream: null,
    callTimer: null,
    callDuration: 0,
    videoStream: null,
    recordedVideo: null,
    recordedAudio: null,
    speechSynthesis: window.speechSynthesis,
    currentUtterance: null,
    isReading: false,
    readingIndex: 0,
    selectedTab: 'all',
    replyingTo: null,
    pinnedMessages: [],
    contextMenuTarget: null,
    selectedMembers: [],
    blockedContacts: [],
    deletedChats: [],
    isMinimized: false,
    lastSeenTimes: {
      '1': new Date(Date.now() - 2 * 60000), // 2 minutes ago
      '2': new Date(Date.now() - 86400000), // Yesterday
      '3': new Date(Date.now() - 3 * 86400000), // 3 days ago
      '4': new Date(Date.now() - 172800000) // 2 days ago
    }
  },

  // Initialize
  init() {
    this.setupEventListeners();
    this.initializeChat();
    this.loadEmojis();
    this.loadSampleGIFs();
    this.checkPermissions();
    this.updateLastSeenStatus();
    console.log('Chat Application Initialized');
  },

  // Setup Event Listeners
  setupEventListeners() {
    // Message input
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      messageInput.addEventListener('input', () => {
        this.handleTyping();
        this.autoResizeTextarea(messageInput);
      });

      messageInput.addEventListener('paste', (e) => {
        this.handlePaste(e);
      });
    }

    // Contact search
    const contactSearch = document.getElementById('contactSearch');
    if (contactSearch) {
      contactSearch.addEventListener('input', _.debounce((e) => {
        this.searchContacts(e.target.value);
      }, 300));
    }

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        ChatApp.handleTabChange(this.dataset.tab);
      });
    });

    // Contact items
    document.querySelectorAll('.contact-item').forEach(item => {
      item.addEventListener('click', function() {
        ChatApp.selectChat(this.dataset.userId);
      });
    });

    // GIF search
    const gifSearch = document.getElementById('gifSearch');
    if (gifSearch) {
      gifSearch.addEventListener('input', _.debounce(() => {
        this.searchGIFs();
      }, 500));
    }

    // File input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.handleFileSelection(e);
      });
    }

    // Context menu prevention
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.message-bubble')) {
        e.preventDefault();
        this.showContextMenu(e);
      }
    });

    // Close context menu on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu')) {
        this.hideContextMenu();
      }
    });

    // Window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        document.getElementById('chatSidebar').classList.remove('active');
      }
    });

    // Auto-update last seen
    setInterval(() => this.updateLastSeenStatus(), 60000); // Update every minute
  },

  // Initialize Chat
  initializeChat() {
    const firstContact = document.querySelector('.contact-item');
    if (firstContact) {
      this.selectChat(firstContact.dataset.userId);
    }
  },

  // Select Chat
  selectChat(userId) {
    if (this.state.deletedChats.includes(userId)) {
      this.showToast('This chat has been deleted', 'error');
      return;
    }

    if (this.state.blockedContacts.includes(userId)) {
      this.showToast('This contact is blocked', 'warning');
    }

    // Update active state
    document.querySelectorAll('.contact-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const selectedContact = document.querySelector(`[data-user-id="${userId}"]`);
    if (selectedContact) {
      selectedContact.classList.add('active');
      
      // Update header
      const name = selectedContact.querySelector('h4').textContent;
      const occupation = selectedContact.querySelector('.contact-occupation').textContent;
      const avatar = selectedContact.querySelector('.contact-avatar')?.src || 
                     selectedContact.querySelector('.group-avatar span')?.textContent;
      
      this.updateChatHeader(name, occupation, avatar, userId);
      
      // Clear unread
      const unreadCount = selectedContact.querySelector('.unread-count');
      if (unreadCount) {
        unreadCount.style.display = 'none';
      }
      
      // Load messages
      this.loadMessages(userId);
      
      // Update state
      this.state.selectedChat = userId;
      
      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        document.getElementById('chatSidebar').classList.remove('active');
      }

      // Update last seen
      this.updateLastSeenForUser(userId);
    }
  },

  // Update Chat Header
  updateChatHeader(name, occupation, avatar, userId) {
    // Main header
    const userNameElem = document.querySelector('.user-basic-info h2');
    const userOccupationElem = document.querySelector('.user-occupation-header');
    const userAvatarElem = document.getElementById('userAvatar');
    const lastSeenElem = document.getElementById('lastSeen');
    
    if (userNameElem) userNameElem.textContent = name;
    if (userOccupationElem) userOccupationElem.textContent = occupation;
    if (userAvatarElem && avatar && avatar.startsWith('http')) {
      userAvatarElem.src = avatar;
    }
    if (lastSeenElem) {
      lastSeenElem.textContent = this.getLastSeenText(userId);
    }
    
    // Info panel
    const infoPanelName = document.getElementById('infoPanelName');
    const infoPanelOccupation = document.getElementById('infoPanelOccupation');
    const infoPanelAvatar = document.getElementById('infoPanelAvatar');
    const infoPanelLastSeen = document.getElementById('infoPanelLastSeen');
    
    if (infoPanelName) infoPanelName.textContent = name;
    if (infoPanelOccupation) infoPanelOccupation.textContent = occupation;
    if (infoPanelAvatar && avatar && avatar.startsWith('http')) {
      infoPanelAvatar.src = avatar;
    }
    if (infoPanelLastSeen) {
      infoPanelLastSeen.textContent = `Last seen ${this.getLastSeenText(userId)}`;
    }
    
    // Call modal
    const callUserName = document.getElementById('callUserName');
    const callUserOccupation = document.getElementById('callUserOccupation');
    const callUserAvatar = document.getElementById('callUserAvatar');
    
    if (callUserName) callUserName.textContent = name;
    if (callUserOccupation) callUserOccupation.textContent = occupation;
    if (callUserAvatar && avatar && avatar.startsWith('http')) {
      callUserAvatar.src = avatar;
    }
  },

  // Get Last Seen Text
  getLastSeenText(userId) {
    const lastSeen = this.state.lastSeenTimes[userId];
    if (!lastSeen) return 'recently';
    
    const now = new Date();
    const diff = now - lastSeen;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return lastSeen.toLocaleDateString();
  },

  // Update Last Seen Status
  updateLastSeenStatus() {
    const lastSeenElem = document.getElementById('lastSeen');
    if (lastSeenElem && this.state.selectedChat) {
      lastSeenElem.textContent = this.getLastSeenText(this.state.selectedChat);
    }
  },

  // Update Last Seen For User
  updateLastSeenForUser(userId) {
    // Simulate updating last seen when selecting chat
    if (Math.random() > 0.5) {
      this.state.lastSeenTimes[userId] = new Date();
      setTimeout(() => this.updateLastSeenStatus(), 2000);
    }
  },

  // Load Messages
  loadMessages(userId) {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;
    
    // Clear current messages
    chatArea.innerHTML = `
      <div class="date-divider">
        <span>Today</span>
      </div>
    `;
    
    // Sample messages
    const sampleMessages = [
      {
        id: 'msg-1',
        text: 'Hey! How\'s the project going?',
        sender: 'John Doe',
        avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
        time: '2:25 PM',
        sent: false
      },
      {
        id: 'msg-2',
        text: 'It\'s going great! Just finished the UI design.',
        sender: 'You',
        time: '2:28 PM',
        sent: true
      },
      {
        id: 'msg-3',
        text: 'That\'s awesome! Can\'t wait to see it.',
        sender: 'John Doe',
        avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
        time: '2:30 PM',
        sent: false
      }
    ];
    
    sampleMessages.forEach(msg => this.displayMessage(msg));
    this.scrollToBottom();
  },

  // Display Message
  displayMessage(messageData) {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${messageData.sent ? 'sent' : ''}`;
    messageElement.dataset.messageId = messageData.id;
    
    let messageHTML = '';
    
    if (!messageData.sent) {
      messageHTML += `<img src="${messageData.avatar}" alt="${messageData.sender}" class="message-avatar">`;
    }
    
    messageHTML += '<div class="message-content">';
    messageHTML += `<div class="message-bubble">`;
    
    if (messageData.replyTo) {
      messageHTML += `
        <div class="reply-reference">
          <strong>${messageData.replyTo.sender}</strong>
          <p>${messageData.replyTo.text}</p>
        </div>
      `;
    }
    
    if (messageData.audio) {
      messageHTML += `
        <div class="message-audio">
          <audio controls>
            <source src="${messageData.audio}" type="audio/wav">
          </audio>
        </div>
      `;
    } else if (messageData.video) {
      messageHTML += `
        <div class="message-video">
          <video controls>
            <source src="${messageData.video}" type="video/webm">
          </video>
        </div>
      `;
    } else {
      messageHTML += `<p class="message-text">${messageData.text}</p>`;
    }
    
    messageHTML += '</div>';
    messageHTML += `<span class="message-time">${messageData.time}</span>`;
    messageHTML += '</div>';
    
    messageElement.innerHTML = messageHTML;
    chatArea.appendChild(messageElement);
  },

  // Send Message
  sendMessage() {
    const input = document.getElementById('messageInput');
    const messageText = input.value.trim();
    
    if (!messageText && !this.state.recordedAudio && !this.state.recordedVideo) return;
    
    const messageData = {
      id: `msg-${Date.now()}`,
      text: messageText,
      sender: 'You',
      time: this.formatTime(new Date()),
      sent: true,
      replyTo: this.state.replyingTo,
      audio: this.state.recordedAudio,
      video: this.state.recordedVideo
    };
    
    this.displayMessage(messageData);
    
    // Clear input and recordings
    input.value = '';
    this.autoResizeTextarea(input);
    this.state.recordedAudio = null;
    this.state.recordedVideo = null;
    
    // Clear reply
    if (this.state.replyingTo) {
      this.cancelReply();
    }
    
    // Scroll to bottom
    this.scrollToBottom();
    
    // Update last message in sidebar
    this.updateLastMessage(this.state.selectedChat, messageText || '🎤 Voice message' || '📹 Video message');
    
    // Simulate response
    setTimeout(() => this.simulateResponse(), 2000);
  },

  // Simulate Response
  simulateResponse() {
    const responses = [
      'That sounds great!',
      'I agree with you.',
      'Let me think about it...',
      'Sure, no problem!',
      'Thanks for letting me know.'
    ];
    
    const messageData = {
      id: `msg-${Date.now()}`,
      text: responses[Math.floor(Math.random() * responses.length)],
      sender: document.querySelector('.user-basic-info h2').textContent,
      avatar: document.getElementById('userAvatar').src,
      time: this.formatTime(new Date()),
      sent: false
    };
    
    this.displayMessage(messageData);
    this.scrollToBottom();
    this.updateLastMessage(this.state.selectedChat, messageData.text);
  },

  // Handle Typing
  handleTyping() {
    const typingIndicator = document.getElementById('userTypingIndicator');
    
    if (!this.state.isTyping) {
      this.state.isTyping = true;
      if (typingIndicator) {
        typingIndicator.classList.add('active');
      }
    }
    
    clearTimeout(this.state.typingTimer);
    this.state.typingTimer = setTimeout(() => {
      this.state.isTyping = false;
      if (typingIndicator) {
        typingIndicator.classList.remove('active');
      }
    }, 1000);
  },

  // Tab Change Handler
  handleTabChange(tab) {
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    this.state.selectedTab = tab;
    
    // Show/hide create group button
    const createGroupBtn = document.getElementById('createGroupBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    
    if (createGroupBtn && newChatBtn) {
      if (tab === 'groups') {
        createGroupBtn.style.display = 'flex';
        newChatBtn.style.display = 'none';
      } else {
        createGroupBtn.style.display = 'none';
        newChatBtn.style.display = 'flex';
      }
    }
    
    // Filter contacts
    this.filterContacts(tab);
  },

  // Filter Contacts
  filterContacts(filter) {
    const contacts = document.querySelectorAll('.contact-item');
    
    contacts.forEach(contact => {
      const category = contact.dataset.category;
      const hasUnread = contact.querySelector('.unread-count');
      const isUnread = hasUnread && hasUnread.style.display !== 'none';
      
      switch(filter) {
        case 'all':
          contact.style.display = 'flex';
          break;
        case 'personal':
          contact.style.display = category === 'personal' ? 'flex' : 'none';
          break;
        case 'groups':
          contact.style.display = category === 'groups' ? 'flex' : 'none';
          break;
        case 'unread':
          contact.style.display = isUnread ? 'flex' : 'none';
          break;
        case 'archived':
          contact.style.display = 'none';
          break;
      }
    });
  },

  // Voice Recording Functions
  async startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.state.mediaRecorder = new MediaRecorder(stream);
      
      const audioChunks = [];
      
      this.state.mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
      };
      
      this.state.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        this.state.recordedAudio = URL.createObjectURL(audioBlob);
        this.sendVoiceMessage();
        stream.getTracks().forEach(track => track.stop());
      };
      
      this.state.mediaRecorder.start();
      this.state.recordingStartTime = Date.now();
      
      // Show recording UI
      document.getElementById('voiceRecording').classList.add('active');
      document.getElementById('voiceRecordBtn').classList.add('active');
      
      // Start timer
      this.updateRecordingTimer();
      
      this.showToast('Recording voice message...', 'info');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      this.showToast('Could not access microphone', 'error');
    }
  },

  stopVoiceRecording() {
    if (this.state.mediaRecorder && this.state.mediaRecorder.state === 'recording') {
      this.state.mediaRecorder.stop();
      document.getElementById('voiceRecording').classList.remove('active');
      document.getElementById('voiceRecordBtn').classList.remove('active');
    }
  },

  sendVoiceMessage() {
    if (this.state.recordedAudio) {
      this.sendMessage();
      this.showToast('Voice message sent!', 'success');
    }
  },

  updateRecordingTimer() {
    const updateTimer = () => {
      if (this.state.mediaRecorder && this.state.mediaRecorder.state === 'recording') {
        const elapsed = Math.floor((Date.now() - this.state.recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        const timerElem = document.getElementById('recordingTime');
        if (timerElem) {
          timerElem.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        const videoTimerElem = document.getElementById('videoTimer');
        if (videoTimerElem && this.state.videoRecorder) {
          videoTimerElem.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        requestAnimationFrame(updateTimer);
      }
    };
    updateTimer();
  },

  // Voice to Text
  async startVoiceToText() {
    if (!('webkitSpeechRecognition' in window)) {
      this.showToast('Speech recognition not supported', 'error');
      return;
    }
    
    const btn = document.getElementById('voiceToTextBtn');
    
    if (!this.state.recognition) {
      this.state.recognition = new webkitSpeechRecognition();
      this.state.recognition.continuous = true;
      this.state.recognition.interimResults = true;
      
      this.state.recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        const input = document.getElementById('messageInput');
        if (input) {
          const currentText = input.value;
          const lastResult = event.results[event.results.length - 1];
          
          if (lastResult.isFinal) {
            input.value = currentText + ' ' + lastResult[0].transcript;
          } else {
            // Show interim results
            input.value = currentText + ' [' + lastResult[0].transcript + ']';
          }
          
          this.autoResizeTextarea(input);
        }
      };
      
      this.state.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.showToast('Speech recognition error', 'error');
        btn.classList.remove('listening');
      };
      
      this.state.recognition.onend = () => {
        btn.classList.remove('listening');
      };
    }
    
    if (btn.classList.contains('listening')) {
      this.state.recognition.stop();
      btn.classList.remove('listening');
    } else {
      this.state.recognition.start();
      btn.classList.add('listening');
      this.showToast('Listening... Speak now', 'info');
    }
  },

  // Read Messages Functions
  readAllMessages() {
    if (!this.state.speechSynthesis) {
      this.showToast('Text-to-speech not supported', 'error');
      return;
    }
    
    const messages = document.querySelectorAll('.message-text');
    if (messages.length === 0) {
      this.showToast('No messages to read', 'info');
      return;
    }
    
    this.state.isReading = true;
    this.state.readingIndex = 0;
    
    document.getElementById('readAllBtn').style.display = 'none';
    document.getElementById('stopReadBtn').style.display = 'block';
    
    this.readMessage(this.state.readingIndex);
    this.showToast('Reading messages...', 'info');
  },

  readMessage(index) {
    const messages = document.querySelectorAll('.message-text');
    
    if (index >= 0 && index < messages.length && this.state.isReading) {
      const message = messages[index];
      const utterance = new SpeechSynthesisUtterance(message.textContent);
      
      // Highlight current message
      document.querySelectorAll('.message').forEach(m => m.classList.remove('reading'));
      message.closest('.message').classList.add('reading');
      
      utterance.onend = () => {
        if (this.state.isReading && index < messages.length - 1) {
          this.state.readingIndex++;
          this.readMessage(this.state.readingIndex);
        } else {
          this.stopReading();
        }
      };
      
      this.state.currentUtterance = utterance;
      this.state.speechSynthesis.speak(utterance);
    }
  },

  readPreviousMessage() {
    if (this.state.readingIndex > 0) {
      this.state.speechSynthesis.cancel();
      this.state.readingIndex--;
      this.readMessage(this.state.readingIndex);
      this.showToast('Reading previous message', 'info');
    }
  },

  readNextMessage() {
    const messages = document.querySelectorAll('.message-text');
    if (this.state.readingIndex < messages.length - 1) {
      this.state.speechSynthesis.cancel();
      this.state.readingIndex++;
      this.readMessage(this.state.readingIndex);
      this.showToast('Reading next message', 'info');
    }
  },

  restartReading() {
    this.state.speechSynthesis.cancel();
    this.state.readingIndex = 0;
    this.state.isReading = true;
    
    document.getElementById('readAllBtn').style.display = 'none';
    document.getElementById('stopReadBtn').style.display = 'block';
    
    this.readMessage(0);
    this.showToast('Restarting from beginning', 'info');
  },

  stopReading() {
    this.state.isReading = false;
    if (this.state.speechSynthesis) {
      this.state.speechSynthesis.cancel();
    }
    
    document.getElementById('readAllBtn').style.display = 'block';
    document.getElementById('stopReadBtn').style.display = 'none';
    
    // Remove highlighting
    document.querySelectorAll('.message').forEach(m => m.classList.remove('reading'));
  },

  // Video Recording
  async openVideoRecording() {
    const modal = document.getElementById('videoRecordModal');
    if (modal) {
      modal.classList.add('active');
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const preview = document.getElementById('videoPreview');
        if (preview) {
          preview.srcObject = stream;
          this.state.videoStream = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        this.showToast('Could not access camera', 'error');
      }
    }
  },

  startVideoRecording() {
    if (!this.state.videoStream) {
      this.showToast('No video stream available', 'error');
      return;
    }
    
    const chunks = [];
    this.state.videoRecorder = new MediaRecorder(this.state.videoStream);
    
    this.state.videoRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };
    
    this.state.videoRecorder.onstop = () => {
      const videoBlob = new Blob(chunks, { type: 'video/webm' });
      this.state.recordedVideo = URL.createObjectURL(videoBlob);
      
      // Show preview
      const preview = document.getElementById('videoPreview');
      if (preview) {
        preview.src = this.state.recordedVideo;
        preview.controls = true;
      }
      
      // Update buttons
      document.getElementById('deleteVideoBtn').style.display = 'inline-flex';
      document.getElementById('sendVideoBtn').style.display = 'inline-flex';
    };
    
    this.state.videoRecorder.start();
    this.state.recordingStartTime = Date.now();
    
    // Update UI
    document.getElementById('startVideoBtn').style.display = 'none';
    document.getElementById('stopVideoBtn').style.display = 'inline-flex';
    document.getElementById('recordingIndicator').classList.add('active');
    
    // Start timer
    this.updateRecordingTimer();
    
    this.showToast('Recording video...', 'info');
  },

  stopVideoRecording() {
    if (this.state.videoRecorder && this.state.videoRecorder.state === 'recording') {
      this.state.videoRecorder.stop();
      
      document.getElementById('stopVideoBtn').style.display = 'none';
      document.getElementById('recordingIndicator').classList.remove('active');
    }
  },

  deleteVideoRecording() {
    this.state.recordedVideo = null;
    
    // Reset preview
    const preview = document.getElementById('videoPreview');
    if (preview && this.state.videoStream) {
      preview.srcObject = this.state.videoStream;
      preview.controls = false;
    }
    
    // Reset buttons
    document.getElementById('startVideoBtn').style.display = 'inline-flex';
    document.getElementById('deleteVideoBtn').style.display = 'none';
    document.getElementById('sendVideoBtn').style.display = 'none';
    document.getElementById('videoTimer').textContent = '00:00';
    
    this.showToast('Video deleted', 'info');
  },

  sendVideoMessage() {
    if (!this.state.recordedVideo) {
      this.showToast('No video to send', 'error');
      return;
    }
    
    this.sendMessage();
    this.closeVideoRecording();
    this.showToast('Video message sent!', 'success');
  },

  closeVideoRecording() {
    const modal = document.getElementById('videoRecordModal');
    if (modal) {
      modal.classList.remove('active');
    }
    
    if (this.state.videoStream) {
      this.state.videoStream.getTracks().forEach(track => track.stop());
      this.state.videoStream = null;
    }
    
    this.state.videoRecorder = null;
    this.state.recordedVideo = null;
    
    // Reset UI
    document.getElementById('startVideoBtn').style.display = 'inline-flex';
    document.getElementById('stopVideoBtn').style.display = 'none';
    document.getElementById('deleteVideoBtn').style.display = 'none';
    document.getElementById('sendVideoBtn').style.display = 'none';
    document.getElementById('recordingIndicator').classList.remove('active');
    document.getElementById('videoTimer').textContent = '00:00';
  },

  // New Chat Functions
  startNewChat() {
    const modal = document.getElementById('newChatModal');
    if (modal) {
      modal.classList.add('active');
      this.loadContactsForSelection();
    }
  },

  loadContactsForSelection() {
    const list = document.getElementById('contactsSelectList');
    if (!list) return;
    
    const contacts = [
      { id: 'user-5', name: 'Alice Brown', avatar: 'https://randomuser.me/api/portraits/women/5.jpg' },
      { id: 'user-6', name: 'Bob Wilson', avatar: 'https://randomuser.me/api/portraits/men/6.jpg' },
      { id: 'user-7', name: 'Carol Davis', avatar: 'https://randomuser.me/api/portraits/women/7.jpg' },
      { id: 'user-8', name: 'David Miller', avatar: 'https://randomuser.me/api/portraits/men/8.jpg' }
    ];
    
    list.innerHTML = '';
    contacts.forEach(contact => {
      const item = document.createElement('div');
      item.className = 'contact-select-item';
      item.dataset.userId = contact.id;
      item.innerHTML = `
        <img src="${contact.avatar}" alt="${contact.name}">
        <span>${contact.name}</span>
      `;
      item.onclick = () => this.selectContactForChat(contact.id, item);
      list.appendChild(item);
    });
  },

  selectContactForChat(userId, element) {
    document.querySelectorAll('.contact-select-item').forEach(item => {
      item.classList.remove('selected');
    });
    element.classList.add('selected');
    this.state.selectedContactForChat = userId;
  },

  startChatWithSelected() {
    if (!this.state.selectedContactForChat) {
      this.showToast('Please select a contact', 'error');
      return;
    }
    
    this.closeNewChatModal();
    this.showToast('Starting new chat...', 'success');
    
    // In real app, this would create a new chat
    setTimeout(() => {
      this.selectChat(this.state.selectedContactForChat);
    }, 500);
  },

  closeNewChatModal() {
    const modal = document.getElementById('newChatModal');
    if (modal) {
      modal.classList.remove('active');
    }
    this.state.selectedContactForChat = null;
  },

  // Create Group Functions
  createGroup() {
    const modal = document.getElementById('createGroupModal');
    if (modal) {
      modal.classList.add('active');
      this.loadMembersForSelection();
    }
  },

  loadMembersForSelection() {
    const list = document.getElementById('membersList');
    if (!list) return;
    
    const members = [
      { id: 'user-1', name: 'John Doe', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
      { id: 'user-2', name: 'Jane Smith', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
      { id: 'user-3', name: 'Mike Johnson', avatar: 'https://randomuser.me/api/portraits/men/3.jpg' },
      { id: 'user-4', name: 'Sarah Williams', avatar: 'https://randomuser.me/api/portraits/women/4.jpg' }
    ];
    
    list.innerHTML = '';
    members.forEach(member => {
      const item = document.createElement('div');
      item.className = 'member-item';
      item.dataset.userId = member.id;
      item.innerHTML = `
        <img src="${member.avatar}" alt="${member.name}">
        <span>${member.name}</span>
      `;
      item.onclick = () => this.toggleMemberSelection(member, item);
      list.appendChild(item);
    });
  },

  toggleMemberSelection(member, element) {
    element.classList.toggle('selected');
    
    const index = this.state.selectedMembers.findIndex(m => m.id === member.id);
    if (index > -1) {
      this.state.selectedMembers.splice(index, 1);
    } else {
      this.state.selectedMembers.push(member);
    }
    
    this.updateSelectedMembersDisplay();
  },

  updateSelectedMembersDisplay() {
    const container = document.getElementById('selectedMembers');
    if (!container) return;
    
    container.innerHTML = '';
    this.state.selectedMembers.forEach(member => {
      const chip = document.createElement('div');
      chip.className = 'selected-member-chip';
      chip.innerHTML = `
        <span>${member.name}</span>
        <button onclick="ChatApp.removeMember('${member.id}')">×</button>
      `;
      container.appendChild(chip);
    });
  },

  removeMember(memberId) {
    this.state.selectedMembers = this.state.selectedMembers.filter(m => m.id !== memberId);
    
    const element = document.querySelector(`.member-item[data-user-id="${memberId}"]`);
    if (element) {
      element.classList.remove('selected');
    }
    
    this.updateSelectedMembersDisplay();
  },

  createNewGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    const groupDescription = document.getElementById('groupDescription').value.trim();
    
    if (!groupName) {
      this.showToast('Please enter a group name', 'error');
      return;
    }
    
    if (this.state.selectedMembers.length < 2) {
      this.showToast('Please select at least 2 members', 'error');
      return;
    }
    
    this.closeCreateGroupModal();
    this.showToast(`Group "${groupName}" created successfully!`, 'success');
    
    // Add new group to contacts list
    const contactsList = document.getElementById('contactsList');
    const newGroup = document.createElement('div');
    newGroup.className = 'contact-item group';
    newGroup.dataset.userId = `group-${Date.now()}`;
    newGroup.dataset.category = 'groups';
    newGroup.innerHTML = `
      <div class="contact-avatar-wrapper">
        <div class="group-avatar">
          <span>👥</span>
        </div>
      </div>
      <div class="contact-info">
        <div class="contact-header">
          <h4>${groupName}</h4>
          <span class="message-time">Now</span>
        </div>
        <span class="contact-occupation">${this.state.selectedMembers.length + 1} members</span>
        <div class="contact-preview">
          <p class="last-message">Group created</p>
        </div>
      </div>
    `;
    newGroup.onclick = function() {
      ChatApp.selectChat(this.dataset.userId);
    };
    
    contactsList.appendChild(newGroup);
    
    // Select the new group
    setTimeout(() => {
      this.selectChat(newGroup.dataset.userId);
    }, 500);
  },

  closeCreateGroupModal() {
    const modal = document.getElementById('createGroupModal');
    if (modal) {
      modal.classList.remove('active');
    }
    
    // Reset form
    document.getElementById('groupName').value = '';
    document.getElementById('groupDescription').value = '';
    this.state.selectedMembers = [];
    this.updateSelectedMembersDisplay();
  },

  // Block Contact
  blockContact() {
    if (!this.state.selectedChat) return;
    
    if (confirm('Are you sure you want to block this contact?')) {
      this.state.blockedContacts.push(this.state.selectedChat);
      
      // Update UI
      const chatMain = document.getElementById('chatMain');
      if (chatMain) {
        chatMain.classList.add('chat-blocked');
      }
      
      this.showToast('Contact blocked', 'info');
      
      // Disable input
      const messageInput = document.getElementById('messageInput');
      if (messageInput) {
        messageInput.disabled = true;
        messageInput.placeholder = 'You have blocked this contact';
      }
    }
  },

  // Delete Chat
  deleteChat() {
    if (!this.state.selectedChat) return;
    
    if (confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      this.state.deletedChats.push(this.state.selectedChat);
      
      // Remove from contacts list
      const contactItem = document.querySelector(`[data-user-id="${this.state.selectedChat}"]`);
      if (contactItem) {
        contactItem.classList.add('chat-deleted');
      }
      
      // Clear chat area
      const chatArea = document.getElementById('chatArea');
      if (chatArea) {
        chatArea.innerHTML = '<div class="empty-state">Chat deleted</div>';
      }
      
      this.showToast('Chat deleted', 'info');
      
      // Select first available chat
      setTimeout(() => {
        const firstContact = document.querySelector('.contact-item:not(.chat-deleted)');
        if (firstContact) {
          this.selectChat(firstContact.dataset.userId);
        }
      }, 500);
    }
  },

  // Minimize/Maximize Chat
  minimizeChat() {
    const container = document.getElementById('chatContainer');
    const badge = document.getElementById('minimizedBadge');
    
    if (container && badge) {
      container.classList.add('minimized');
      badge.style.display = 'flex';
      this.state.isMinimized = true;
      
      // Update badge with current chat info
      const avatar = document.getElementById('userAvatar');
      if (avatar) {
        badge.querySelector('img').src = avatar.src;
      }
    }
  },

  maximizeChat() {
    const container = document.getElementById('chatContainer');
    const badge = document.getElementById('minimizedBadge');
    
    if (container && badge) {
      container.classList.remove('minimized');
      badge.style.display = 'none';
      this.state.isMinimized = false;
    }
  },

  closeChat() {
    if (confirm('Are you sure you want to close this chat window?')) {
      window.close();
      // If window.close() doesn't work (browser restriction), hide the chat
      const container = document.getElementById('chatContainer');
      if (container) {
        container.style.display = 'none';
      }
      this.showToast('Chat closed', 'info');
    }
  },

  // Media Tab Functions
  showMediaTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.media-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update content
    document.querySelectorAll('.media-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    const tabContent = document.getElementById(`${tabName}Tab`);
    if (tabContent) {
      tabContent.classList.add('active');
    }
  },

  viewMedia(element) {
    // In real app, this would open a media viewer
    this.showToast('Opening media viewer...', 'info');
  },

  playVideo(element) {
    // In real app, this would play the video
    this.showToast('Playing video...', 'info');
  },

  // Context Menu Functions
  showContextMenu(event) {
    const menu = document.getElementById('contextMenu');
    const messageElem = event.target.closest('.message');
    
    if (menu && messageElem) {
      menu.style.left = event.clientX + 'px';
      menu.style.top = event.clientY + 'px';
      menu.classList.add('active');
      
      this.state.contextMenuTarget = messageElem;
      
      // Update pin/unpin button
      const pinBtn = document.getElementById('pinBtn');
      const unpinBtn = document.getElementById('unpinBtn');
      const messageId = messageElem.dataset.messageId;
      
      if (this.state.pinnedMessages.includes(messageId)) {
        pinBtn.style.display = 'none';
        unpinBtn.style.display = 'flex';
      } else {
        pinBtn.style.display = 'flex';
        unpinBtn.style.display = 'none';
      }
    }
  },

  hideContextMenu() {
    const menu = document.getElementById('contextMenu');
    if (menu) {
      menu.classList.remove('active');
    }
  },

  editMessage() {
    if (!this.state.contextMenuTarget) return;
    
    const messageText = this.state.contextMenuTarget.querySelector('.message-text');
    if (messageText) {
      const newText = prompt('Edit message:', messageText.textContent);
      if (newText !== null && newText.trim()) {
        messageText.textContent = newText;
        
        // Add edited indicator
        const timeElem = this.state.contextMenuTarget.querySelector('.message-time');
        if (timeElem && !timeElem.querySelector('.edited-indicator')) {
          const edited = document.createElement('span');
          edited.className = 'edited-indicator';
          edited.textContent = ' (edited)';
          timeElem.appendChild(edited);
        }
        
        this.showToast('Message edited', 'success');
      }
    }
    
    this.hideContextMenu();
  },

  deleteMessage() {
    if (!this.state.contextMenuTarget) return;
    
    if (confirm('Delete this message?')) {
      this.state.contextMenuTarget.remove();
      this.showToast('Message deleted', 'info');
    }
    
    this.hideContextMenu();
  },

  forwardMessage() {
    this.showToast('Forward message feature', 'info');
    this.hideContextMenu();
  },

  copyMessage() {
    if (!this.state.contextMenuTarget) return;
    
    const messageText = this.state.contextMenuTarget.querySelector('.message-text');
    if (messageText) {
      navigator.clipboard.writeText(messageText.textContent);
      this.showToast('Message copied to clipboard', 'success');
    }
    
    this.hideContextMenu();
  },

  selectMessage() {
    if (this.state.contextMenuTarget) {
      this.state.contextMenuTarget.classList.add('selected');
      this.showToast('Message selected', 'info');
    }
    this.hideContextMenu();
  },

  pinMessage() {
    if (!this.state.contextMenuTarget) return;
    
    const messageId = this.state.contextMenuTarget.dataset.messageId;
    if (!this.state.pinnedMessages.includes(messageId)) {
      this.state.pinnedMessages.push(messageId);
      
      // Show pinned messages section
      const pinnedSection = document.getElementById('pinnedMessages');
      if (pinnedSection) {
        pinnedSection.classList.add('active');
        
        // Add to pinned list
        const messageText = this.state.contextMenuTarget.querySelector('.message-text');
        if (messageText) {
          const pinnedList = pinnedSection.querySelector('.pinned-messages-list');
          const pinnedItem = document.createElement('div');
          pinnedItem.className = 'pinned-message-item';
          pinnedItem.innerHTML = `
            <p>${messageText.textContent}</p>
            <button onclick="ChatApp.unpinMessageDirect('${messageId}')">×</button>
          `;
          pinnedList.appendChild(pinnedItem);
        }
      }
      
      this.showToast('Message pinned', 'success');
    }
    
    this.hideContextMenu();
  },

  unpinMessage() {
    if (!this.state.contextMenuTarget) return;
    
    const messageId = this.state.contextMenuTarget.dataset.messageId;
    this.unpinMessageDirect(messageId);
    
    this.hideContextMenu();
  },

  unpinMessageDirect(messageId) {
    const index = this.state.pinnedMessages.indexOf(messageId);
    if (index > -1) {
      this.state.pinnedMessages.splice(index, 1);
      
      // Remove from pinned list
      const pinnedSection = document.getElementById('pinnedMessages');
      if (pinnedSection) {
        const pinnedList = pinnedSection.querySelector('.pinned-messages-list');
        const items = pinnedList.querySelectorAll('.pinned-message-item');
        items.forEach(item => {
          if (item.querySelector('button').onclick.toString().includes(messageId)) {
            item.remove();
          }
        });
        
        // Hide section if no pinned messages
        if (this.state.pinnedMessages.length === 0) {
          pinnedSection.classList.remove('active');
        }
      }
      
      this.showToast('Message unpinned', 'info');
    }
  },

  starMessage() {
    if (this.state.contextMenuTarget) {
      this.state.contextMenuTarget.classList.toggle('starred');
      this.showToast('Message starred', 'success');
    }
    this.hideContextMenu();
  },

  messageInfo() {
    this.showToast('Message info', 'info');
    this.hideContextMenu();
  },

  replyMessage() {
    if (!this.state.contextMenuTarget) return;
    
    const messageText = this.state.contextMenuTarget.querySelector('.message-text');
    const messageSender = this.state.contextMenuTarget.classList.contains('sent') ? 
                          'You' : document.querySelector('.user-basic-info h2').textContent;
    
    if (messageText) {
      const replyPreview = document.getElementById('replyPreview');
      if (replyPreview) {
        replyPreview.classList.add('active');
        replyPreview.querySelector('.reply-text').textContent = messageText.textContent;
        
        this.state.replyingTo = {
          sender: messageSender,
          text: messageText.textContent
        };
      }
    }
    
    this.hideContextMenu();
  },

  cancelReply() {
    const replyPreview = document.getElementById('replyPreview');
    if (replyPreview) {
      replyPreview.classList.remove('active');
    }
    this.state.replyingTo = null;
  },

  reactMessage(emoji) {
    if (this.state.contextMenuTarget) {
      // Add reaction to message
      let reactions = this.state.contextMenuTarget.querySelector('.message-reactions');
      if (!reactions) {
        reactions = document.createElement('div');
        reactions.className = 'message-reactions';
        this.state.contextMenuTarget.querySelector('.message-content').appendChild(reactions);
      }
      
      // Check if reaction already exists
      let existingReaction = Array.from(reactions.children).find(r => 
        r.querySelector('.reaction-emoji').textContent === emoji
      );
      
      if (existingReaction) {
        // Increment count
        const count = existingReaction.querySelector('.reaction-count');
        count.textContent = parseInt(count.textContent) + 1;
      } else {
        // Add new reaction
        const reaction = document.createElement('div');
        reaction.className = 'reaction';
        reaction.innerHTML = `
          <span class="reaction-emoji">${emoji}</span>
          <span class="reaction-count">1</span>
        `;
        reactions.appendChild(reaction);
      }
      
      this.showToast(`Reacted with ${emoji}`, 'success');
    }
    
    this.hideContextMenu();
  },

  // Helper Functions
  formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  },

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  },

  scrollToBottom() {
    const chatArea = document.getElementById('chatArea');
    if (chatArea) {
      requestAnimationFrame(() => {
        chatArea.scrollTop = chatArea.scrollHeight;
      });
    }
  },

  updateLastMessage(userId, text) {
    const contactItem = document.querySelector(`[data-user-id="${userId}"]`);
    if (contactItem) {
      const lastMessage = contactItem.querySelector('.last-message');
      const messageTime = contactItem.querySelector('.message-time');
      
      if (lastMessage) lastMessage.textContent = text;
      if (messageTime) messageTime.textContent = this.formatTime(new Date());
    }
  },

  searchContacts(searchTerm) {
    const lowerSearch = searchTerm.toLowerCase();
    
    document.querySelectorAll('.contact-item').forEach(item => {
      const name = item.querySelector('h4').textContent.toLowerCase();
      const lastMessage = item.querySelector('.last-message')?.textContent.toLowerCase() || '';
      
      if (name.includes(lowerSearch) || lastMessage.includes(lowerSearch)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  },

  handlePaste(e) {
    const items = e.clipboardData.items;
    
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = item.getAsFile();
        this.handlePastedImage(blob);
        break;
      }
    }
  },

  handlePastedImage(blob) {
    const file = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type });
    this.showToast(`Image pasted: ${file.name}`, 'info');
  },

  showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };
    
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  checkPermissions() {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  },

  // Load Emojis
  loadEmojis() {
    const emojiTab = document.getElementById('emojiTab');
    if (!emojiTab) return;
    
    const emojis = ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤙','💪','🖕','✍️','🙏','🦶','🦵','👂','👃','👣','👁️','👀','🧠','🦷','🦴','👅','👄'];
    
    emojiTab.innerHTML = '';
    emojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'emoji-btn';
      btn.textContent = emoji;
      btn.onclick = () => this.insertEmoji(emoji);
      emojiTab.appendChild(btn);
    });
  },

  insertEmoji(emoji) {
    const input = document.getElementById('messageInput');
    if (input) {
      const cursorPos = input.selectionStart;
      const textBefore = input.value.substring(0, cursorPos);
      const textAfter = input.value.substring(cursorPos);
      
      input.value = textBefore + emoji + textAfter;
      input.focus();
      input.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
      
      this.closeEmojiGifModal();
    }
  },

  loadSampleGIFs() {
    const gifGrid = document.getElementById('gifGrid');
    if (!gifGrid) return;
    
    const sampleGIFs = [
      'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
      'https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif',
      'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
      'https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif'
    ];
    
    gifGrid.innerHTML = '';
    sampleGIFs.forEach(url => {
      const gifItem = document.createElement('div');
      gifItem.className = 'gif-item';
      gifItem.innerHTML = `<img src="${url}" alt="GIF" onclick="ChatApp.sendGIF('${url}')">`;
      gifGrid.appendChild(gifItem);
    });
  },

  searchGIFs() {
    const searchTerm = document.getElementById('gifSearch').value;
    if (!searchTerm) {
      this.loadSampleGIFs();
      return;
    }
    
    // In a real app, this would search a GIF API
    this.showToast(`Searching for "${searchTerm}"...`, 'info');
    setTimeout(() => this.loadSampleGIFs(), 1000);
  },

  sendGIF(url) {
    const messageData = {
      id: `msg-${Date.now()}`,
      text: `<img src="${url}" style="max-width: 200px; border-radius: 8px;">`,
      sender: 'You',
      time: this.formatTime(new Date()),
      sent: true,
      isGIF: true
    };
    
    const chatArea = document.getElementById('chatArea');
    if (chatArea) {
      const messageElement = document.createElement('div');
      messageElement.className = 'message sent';
      messageElement.innerHTML = `
        <div class="message-content">
          <div class="message-bubble">
            ${messageData.text}
          </div>
          <span class="message-time">${messageData.time}</span>
        </div>
      `;
      chatArea.appendChild(messageElement);
    }
    
    this.scrollToBottom();
    this.closeEmojiGifModal();
    this.showToast('GIF sent!', 'success');
  },

  handleFileSelection(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      files.forEach(file => {
        this.showToast(`File selected: ${file.name}`, 'info');
      });
    }
  }
};

// Global Functions (for onclick handlers)
function toggleSidebar() {
  const sidebar = document.getElementById('chatSidebar');
  sidebar.classList.toggle('active');
}

function toggleInfo() {
  const infoPanel = document.getElementById('chatInfoPanel');
  infoPanel.classList.toggle('active');
}

function toggleSearch() {
  const searchContainer = document.getElementById('searchContainer');
  searchContainer.classList.toggle('active');
  if (searchContainer.classList.contains('active')) {
    document.getElementById('searchBar').focus();
  }
}

function sendMessage() {
  ChatApp.sendMessage();
}

function startNewChat() {
  ChatApp.startNewChat();
}

function createGroup() {
  ChatApp.createGroup();
}

function closeNewChatModal() {
  ChatApp.closeNewChatModal();
}

function startChatWithSelected() {
  ChatApp.startChatWithSelected();
}

function closeCreateGroupModal() {
  ChatApp.closeCreateGroupModal();
}

function createNewGroup() {
  ChatApp.createNewGroup();
}

function openSettings() {
  const modal = document.getElementById('settingsModal');
  if (modal) modal.classList.add('active');
}

function closeSettings() {
  const modal = document.getElementById('settingsModal');
  if (modal) modal.classList.remove('active');
}

function saveSettings() {
  ChatApp.showToast('Settings saved!', 'success');
  closeSettings();
}

function minimizeChat() {
  ChatApp.minimizeChat();
}

function maximizeChat() {
  ChatApp.maximizeChat();
}

function closeChat() {
  ChatApp.closeChat();
}

function startVoiceCall() {
  ChatApp.startVoiceCall();
}

function startVideoCall() {
  ChatApp.startVideoCall();
}

function endCall() {
  ChatApp.endCall();
}

function closeCallModal() {
  ChatApp.endCall();
}

function minimizeCallModal() {
  ChatApp.showToast('Call minimized', 'info');
}

function maximizeCallModal() {
  ChatApp.showToast('Call maximized', 'info');
}

function toggleVideo() {
  const localVideo = document.getElementById('localVideo');
  const voiceAnimation = document.getElementById('voiceCallAnimation');
  
  if (localVideo.style.display === 'none') {
    ChatApp.startVideoCall();
  } else {
    localVideo.style.display = 'none';
    document.getElementById('remoteVideo').style.display = 'none';
    voiceAnimation.style.display = 'flex';
    ChatApp.showToast('Switched to voice call', 'info');
  }
}

function shareScreen() {
  ChatApp.showToast('Screen sharing started', 'info');
}

function toggleSpeaker() {
  const btn = document.getElementById('speakerBtn');
  btn.classList.toggle('active');
  ChatApp.showToast(btn.classList.contains('active') ? 'Speaker on' : 'Speaker off', 'info');
}

function toggleMute() {
  const btn = document.getElementById('muteBtn');
  btn.classList.toggle('active');
  btn.textContent = btn.classList.contains('active') ? '🔇' : '🎤';
  ChatApp.showToast(btn.classList.contains('active') ? 'Muted' : 'Unmuted', 'info');
}

function swapVideos() {
  ChatApp.swapVideos();
}

function readAllMessages() {
  ChatApp.readAllMessages();
}

function stopReading() {
  ChatApp.stopReading();
}

function readPreviousMessage() {
  ChatApp.readPreviousMessage();
}

function readNextMessage() {
  ChatApp.readNextMessage();
}

function restartReading() {
  ChatApp.restartReading();
}

function startVoiceToText() {
  ChatApp.startVoiceToText();
}

function toggleVoiceRecording() {
  const btn = document.getElementById('voiceRecordBtn');
  if (btn.classList.contains('active')) {
    ChatApp.stopVoiceRecording();
  } else {
    ChatApp.startVoiceRecording();
  }
}

function cancelRecording() {
  ChatApp.stopVoiceRecording();
  ChatApp.showToast('Recording cancelled', 'info');
}

function openVideoRecording() {
  ChatApp.openVideoRecording();
}

function closeVideoRecording() {
  ChatApp.closeVideoRecording();
}

function startVideoRecording() {
  ChatApp.startVideoRecording();
}

function stopVideoRecording() {
  ChatApp.stopVideoRecording();
}

function deleteVideoRecording() {
  ChatApp.deleteVideoRecording();
}

function sendVideoMessage() {
  ChatApp.sendVideoMessage();
}

function openEmojiGifModal() {
  const modal = document.getElementById('emojiGifModal');
  if (modal) modal.classList.add('active');
}

function closeEmojiGifModal() {
  const modal = document.getElementById('emojiGifModal');
  if (modal) modal.classList.remove('active');
}

function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');
}

function handleFileChange() {
  ChatApp.handleFileSelection(event);
}

function editMessage() {
  ChatApp.editMessage();
}

function deleteMessage() {
  ChatApp.deleteMessage();
}

function forwardMessage() {
  ChatApp.forwardMessage();
}

function copyMessage() {
  ChatApp.copyMessage();
}

function selectMessage() {
  ChatApp.selectMessage();
}

function pinMessage() {
  ChatApp.pinMessage();
}

function unpinMessage() {
  ChatApp.unpinMessage();
}

function starMessage() {
  ChatApp.starMessage();
}

function messageInfo() {
  ChatApp.messageInfo();
}

function replyMessage() {
  ChatApp.replyMessage();
}

function cancelReply() {
  ChatApp.cancelReply();
}

function reactMessage(emoji) {
  ChatApp.reactMessage(emoji);
}

function blockContact() {
  ChatApp.blockContact();
}

function deleteChat() {
  ChatApp.deleteChat();
}

function showMediaTab(tabName) {
  ChatApp.showMediaTab(tabName);
}

function viewMedia(element) {
  ChatApp.viewMedia(element);
}

function playVideo(element) {
  ChatApp.playVideo(element);
}

// Call Functions
ChatApp.startVoiceCall = async function() {
  const modal = document.getElementById('callModal');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('voiceCallAnimation').style.display = 'flex';
    document.getElementById('localVideo').style.display = 'none';
    document.getElementById('remoteVideo').style.display = 'none';
    
    this.startCallTimer();
    this.showToast('Voice call connected', 'success');
  }
};

ChatApp.startVideoCall = async function() {
  const modal = document.getElementById('callModal');
  if (modal) {
    modal.classList.add('active');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.state.currentStream = stream;
      
      const localVideo = document.getElementById('localVideo');
      if (localVideo) {
        localVideo.srcObject = stream;
        localVideo.style.display = 'block';
      }
      
      document.getElementById('voiceCallAnimation').style.display = 'none';
      document.getElementById('remoteVideo').style.display = 'block';
      
      this.startCallTimer();
      this.showToast('Video call connected', 'success');
    } catch (error) {
      console.error('Error accessing camera:', error);
      this.showToast('Could not access camera', 'error');
      this.startVoiceCall();
    }
  }
};

ChatApp.startCallTimer = function() {
  this.state.callDuration = 0;
  this.state.callTimer = setInterval(() => {
    this.state.callDuration++;
    const minutes = Math.floor(this.state.callDuration / 60);
    const seconds = this.state.callDuration % 60;
    
    const timerElem = document.getElementById('callTimer');
    if (timerElem) {
      timerElem.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }, 1000);
};

ChatApp.swapVideos = function() {
  const localVideo = document.getElementById('localVideo');
  const remoteVideo = document.getElementById('remoteVideo');
  
  if (localVideo && remoteVideo) {
    localVideo.classList.toggle('main-video');
    localVideo.classList.toggle('pip-video');
    remoteVideo.classList.toggle('main-video');
    remoteVideo.classList.toggle('pip-video');
    
    this.showToast('Videos swapped', 'info');
  }
};

ChatApp.endCall = function() {
  const modal = document.getElementById('callModal');
  if (modal) {
    modal.classList.remove('active');
  }
  
  if (this.state.callTimer) {
    clearInterval(this.state.callTimer);
    this.state.callTimer = null;
  }
  
  if (this.state.currentStream) {
    this.state.currentStream.getTracks().forEach(track => track.stop());
    this.state.currentStream = null;
  }
  
  document.getElementById('callTimer').textContent = '00:00';
  document.getElementById('localVideo').srcObject = null;
  
  this.showToast('Call ended', 'info');
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  ChatApp.init();
});

// ============================================
// INSTITUTE CHAT INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    // Check if we're opening chat with an institute
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('userId') && urlParams.get('type') === 'institute') {
        // Extract institute information from URL
        const instituteData = {
            userId: urlParams.get('userId'),
            name: urlParams.get('name'),
            avatar: urlParams.get('avatar'),
            occupation: urlParams.get('occupation'),
            type: urlParams.get('type'),
            email: urlParams.get('email'),
            phone: urlParams.get('phone'),
            verified: urlParams.get('verified') === 'true'
        };

        // Update the chat UI with institute information
        updateChatWithInstitute(instituteData);
    }
});

function updateChatWithInstitute(instituteData) {
    // Update the active contact in sidebar
    const contactsList = document.getElementById('contactsList');
    if (contactsList) {
        // Remove active from all contacts
        document.querySelectorAll('.contact-item').forEach(item => {
            item.classList.remove('active');
        });

        // Create or update institute contact
        let instituteContact = document.querySelector(`[data-user-id="${instituteData.userId}"]`);
        
        if (!instituteContact) {
            // Create new institute contact at the top
            instituteContact = document.createElement('div');
            instituteContact.className = 'contact-item active';
            instituteContact.setAttribute('data-user-id', instituteData.userId);
            instituteContact.setAttribute('data-category', 'institute');
            instituteContact.innerHTML = `
                <div class="contact-avatar-wrapper">
                    <img src="${instituteData.avatar}" alt="${instituteData.name}" class="contact-avatar">
                    <span class="status-indicator online"></span>
                    ${instituteData.verified ? '<span class="verified-badge" style="position: absolute; top: 0; right: 0; background: #F59E0B; color: white; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 10px;">✓</span>' : ''}
                </div>
                <div class="contact-info">
                    <div class="contact-header">
                        <h4>${instituteData.name}</h4>
                        <span class="message-time">Now</span>
                    </div>
                    <span class="contact-occupation">${instituteData.occupation}</span>
                    <div class="contact-preview">
                        <p class="last-message">Start a conversation...</p>
                    </div>
                </div>
            `;
            
            // Add to top of contacts list
            contactsList.insertBefore(instituteContact, contactsList.firstChild);
        } else {
            instituteContact.classList.add('active');
        }

        // Update main chat header
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.querySelector('.user-basic-info h2');
        const userOccupation = document.querySelector('.user-occupation-header');
        const userEmail = document.querySelector('.user-email span');
        const userPhone = document.querySelector('.contact-phone');
        
        if (userAvatar) userAvatar.src = instituteData.avatar;
        if (userName) {
            userName.innerHTML = instituteData.name;
            if (instituteData.verified) {
                userName.innerHTML += ' <span style="color: #F59E0B; font-size: 0.8em;">✓</span>';
            }
        }
        if (userOccupation) userOccupation.textContent = instituteData.occupation;
        if (userEmail) userEmail.textContent = `✉️ ${instituteData.email}`;
        if (userPhone) userPhone.textContent = `📞 ${instituteData.phone}`;

        // Update info panel
        const infoPanelAvatar = document.getElementById('infoPanelAvatar');
        const infoPanelName = document.getElementById('infoPanelName');
        const infoPanelOccupation = document.getElementById('infoPanelOccupation');
        
        if (infoPanelAvatar) infoPanelAvatar.src = instituteData.avatar;
        if (infoPanelName) {
            infoPanelName.innerHTML = instituteData.name;
            if (instituteData.verified) {
                infoPanelName.innerHTML += ' <span style="color: #F59E0B;">✓</span>';
            }
        }
        if (infoPanelOccupation) infoPanelOccupation.textContent = instituteData.occupation;

        // Clear chat area and add welcome message
        const chatArea = document.getElementById('chatArea');
        if (chatArea) {
            chatArea.innerHTML = `
                <div class="date-divider">
                    <span>Today</span>
                </div>
                <div class="message">
                    <img src="${instituteData.avatar}" alt="${instituteData.name}" class="message-avatar">
                    <div class="message-content">
                        <div class="message-bubble">
                            <p class="message-text">Welcome to ${instituteData.name}! How can we help you today?</p>
                        </div>
                        <span class="message-time">Just now</span>
                    </div>
                </div>
            `;
        }

        // Show a toast notification
        showToast(`Connected with ${instituteData.name}`, 'success');
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#10b981' : '#F59E0B'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideInUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}