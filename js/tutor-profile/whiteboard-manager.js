/**
 * Whiteboard Manager - Digital Collaborative Whiteboard
 *
 * Handles the complete whiteboard functionality including:
 * - Canvas drawing and text writing
 * - Real-time synchronization
 * - Session management
 * - Chat functionality
 * - Page navigation
 */

class WhiteboardManager {
    constructor() {
        this.API_BASE = `${window.API_BASE_URL || 'http://localhost:8000'}/api/whiteboard`;
        this.currentSession = null;
        this.currentPage = null;
        this.pages = [];
        this.currentTool = 'pen';
        this.strokeColor = '#000000';
        this.strokeWidth = 3;
        this.isDrawing = false;
        this.currentStroke = [];
        this.canvas = null;
        this.ctx = null;
        this.permissions = {
            can_draw: false,
            can_write: false,
            can_erase: false
        };
        this.ws = null;
        this.sessionStartTime = null;
        this.timerInterval = null;
        this.isRecording = false;
        this.recordings = [];
    }

    /**
     * Initialize the whiteboard system
     */
    async initialize() {
        console.log('🎨 Initializing Whiteboard Manager...');
        this.attachModalHTML();
        this.setupEventListeners();
        await this.loadSessionHistory();
        await this.loadStudentsList();
    }

    /**
     * Attach whiteboard modal HTML to the page
     */
    attachModalHTML() {
        const modalHTML = `
            <!-- Whiteboard Modal -->
            <div class="whiteboard-modal-overlay" id="whiteboardModal">
                <div class="whiteboard-modal" id="whiteboardModalContainer">
                    <!-- Header -->
                    <div class="whiteboard-header">
                        <div class="whiteboard-header-left">
                            <button class="header-icon-btn mobile-toggle-history" id="mobileToggleHistory" title="Toggle History">
                                <i class="fas fa-bars"></i>
                                <span class="tutor-name-subtitle" id="tutorNameSubtitle"></span>
                            </button>
                            <div class="whiteboard-title">
                                <i class="fas fa-chalkboard-teacher"></i>
                                <span id="whiteboardSessionTitle">Digital Whiteboard</span>
                            </div>
                        </div>
                        <div class="whiteboard-session-info">
                            <div class="session-status">
                                <span class="status-indicator"></span>
                                <span id="sessionStatusText">Live Session</span>
                            </div>
                            <div class="session-timer">
                                <i class="far fa-clock"></i>
                                <span id="sessionTimer">00:00:00</span>
                            </div>
                        </div>
                        <div class="whiteboard-header-right">
                            <button class="header-icon-btn mobile-toggle-chat" id="mobileToggleChat" title="Toggle Chat">
                                <i class="fas fa-comments"></i>
                            </button>
                            <button class="header-icon-btn" id="minimizeWhiteboard" title="Minimize">
                                <i class="fas fa-window-minimize"></i>
                            </button>
                            <button class="header-icon-btn" id="maximizeWhiteboard" title="Maximize">
                                <i class="fas fa-expand"></i>
                            </button>
                            <button class="header-icon-btn close-btn" id="closeWhiteboard" title="Close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Body: 3-Column Layout -->
                    <div class="whiteboard-body">
                        <!-- LEFT SIDEBAR: VS Code Style with Icon Bar -->
                        <div class="whiteboard-sidebar">
                            <!-- Icon Bar -->
                            <div class="sidebar-icon-bar">
                                <button class="sidebar-icon-btn" data-panel="students" title="Students">
                                    <i class="fas fa-user-graduate"></i>
                                </button>
                                <button class="sidebar-icon-btn active" data-panel="history" title="Session History">
                                    <i class="fas fa-history"></i>
                                </button>
                                <button class="sidebar-icon-btn" data-panel="recordings" title="Recordings">
                                    <i class="fas fa-video"></i>
                                </button>
                                <button class="sidebar-icon-btn" data-panel="files" title="Files">
                                    <i class="fas fa-folder"></i>
                                </button>
                                <button class="sidebar-icon-btn" data-panel="coursework" title="Coursework">
                                    <i class="fas fa-clipboard-list"></i>
                                </button>
                                <button class="sidebar-icon-btn" data-panel="settings" title="Settings">
                                    <i class="fas fa-cog"></i>
                                </button>
                            </div>

                            <!-- Collapsible Content Area -->
                            <div class="sidebar-content" id="sidebarContent">
                                <!-- Students Panel -->
                                <div class="sidebar-panel" id="studentsPanel">
                                    <div class="sidebar-panel-header">
                                        <h3>
                                            <i class="fas fa-user-graduate"></i>
                                            Students
                                        </h3>
                                    </div>
                                    <div class="sidebar-search-bar">
                                        <i class="fas fa-search"></i>
                                        <input type="text" id="studentsSearch" placeholder="Search students...">
                                    </div>
                                    <div class="students-list" id="studentsList">
                                        <!-- Students will be dynamically loaded -->
                                    </div>
                                </div>

                                <!-- History Panel -->
                                <div class="sidebar-panel active" id="historyPanel">
                                    <div class="sidebar-panel-header">
                                        <h3>
                                            <i class="fas fa-history"></i>
                                            Session History
                                        </h3>
                                        <button class="new-session-btn" id="newSessionBtn">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    </div>
                                    <div class="sidebar-search-bar">
                                        <i class="fas fa-search"></i>
                                        <input type="text" id="historySearch" placeholder="Search sessions...">
                                    </div>
                                    <div class="session-history-list" id="sessionHistoryList">
                                        <!-- Session cards will be dynamically loaded -->
                                    </div>
                                </div>

                                <!-- Recordings Panel -->
                                <div class="sidebar-panel" id="recordingsPanel">
                                    <div class="sidebar-panel-header">
                                        <h3>
                                            <i class="fas fa-video"></i>
                                            Recordings
                                        </h3>
                                    </div>
                                    <div class="sidebar-search-bar">
                                        <i class="fas fa-search"></i>
                                        <input type="text" id="recordingsSearch" placeholder="Search recordings...">
                                    </div>
                                    <div class="recordings-list" id="recordingsList">
                                        <!-- Recordings will be dynamically loaded -->
                                    </div>
                                </div>

                                <!-- Files Panel -->
                                <div class="sidebar-panel" id="filesPanel">
                                    <div class="sidebar-panel-header">
                                        <h3>
                                            <i class="fas fa-folder"></i>
                                            Files
                                        </h3>
                                        <button class="new-session-btn" id="uploadFileBtn">
                                            <i class="fas fa-upload"></i>
                                        </button>
                                    </div>
                                    <div class="sidebar-search-bar">
                                        <i class="fas fa-search"></i>
                                        <input type="text" id="filesSearch" placeholder="Search files...">
                                    </div>
                                    <div class="files-list" id="filesList">
                                        <div class="file-item">
                                            <div class="file-item-icon">
                                                <i class="fas fa-file-pdf"></i>
                                            </div>
                                            <div class="file-item-info">
                                                <span class="file-item-name">Lesson_Plan.pdf</span>
                                                <div class="file-item-actions">
                                                    <button class="file-action-btn" onclick="whiteboardManager.downloadFile('lesson_plan.pdf')">
                                                        <i class="fas fa-download"></i>
                                                    </button>
                                                    <button class="file-action-btn danger" onclick="whiteboardManager.deleteFile('lesson_plan.pdf')">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="file-item">
                                            <div class="file-item-icon">
                                                <i class="fas fa-file-image"></i>
                                            </div>
                                            <div class="file-item-info">
                                                <span class="file-item-name">Diagram.png</span>
                                                <div class="file-item-actions">
                                                    <button class="file-action-btn" onclick="whiteboardManager.downloadFile('diagram.png')">
                                                        <i class="fas fa-download"></i>
                                                    </button>
                                                    <button class="file-action-btn danger" onclick="whiteboardManager.deleteFile('diagram.png')">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="file-item">
                                            <div class="file-item-icon">
                                                <i class="fas fa-file-word"></i>
                                            </div>
                                            <div class="file-item-info">
                                                <span class="file-item-name">Notes.docx</span>
                                                <div class="file-item-actions">
                                                    <button class="file-action-btn" onclick="whiteboardManager.downloadFile('notes.docx')">
                                                        <i class="fas fa-download"></i>
                                                    </button>
                                                    <button class="file-action-btn danger" onclick="whiteboardManager.deleteFile('notes.docx')">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Coursework Panel -->
                                <div class="sidebar-panel" id="courseworkPanel">
                                    <div class="sidebar-panel-header">
                                        <h3>
                                            <i class="fas fa-clipboard-list"></i>
                                            Coursework
                                        </h3>
                                        <button class="new-session-btn" id="createCourseworkBtn" title="Create Coursework">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    </div>
                                    <div class="sidebar-search-bar">
                                        <i class="fas fa-search"></i>
                                        <input type="text" id="courseworkSearch" placeholder="Search coursework...">
                                    </div>
                                    <div class="coursework-list" id="courseworkList">
                                        <!-- Coursework will be dynamically loaded -->
                                        <div class="empty-state">
                                            <i class="fas fa-clipboard-list"></i>
                                            <p>No coursework yet</p>
                                            <button class="btn-primary" onclick="whiteboardManager.createCourseworkForCurrentStudent()">
                                                <i class="fas fa-plus"></i> Create Coursework
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Settings Panel -->
                                <div class="sidebar-panel" id="settingsPanel">
                                    <div class="sidebar-panel-header">
                                        <h3>
                                            <i class="fas fa-cog"></i>
                                            Settings
                                        </h3>
                                    </div>
                                    <div class="sidebar-search-bar">
                                        <i class="fas fa-search"></i>
                                        <input type="text" id="settingsSearch" placeholder="Search settings...">
                                    </div>
                                    <div class="settings-list">
                                        <div class="setting-item">
                                            <label>Grid</label>
                                            <input type="checkbox" checked>
                                        </div>
                                        <div class="setting-item">
                                            <label>Snap to Grid</label>
                                            <input type="checkbox">
                                        </div>
                                        <div class="setting-item">
                                            <label>Auto-save</label>
                                            <input type="checkbox" checked>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- CENTER: Canvas Area -->
                        <div class="whiteboard-canvas-area">
                            <!-- Toolbar -->
                            <div class="whiteboard-toolbar">
                                <div class="toolbar-section">
                                    <!-- Drawing Tools -->
                                    <button class="tool-button active" data-tool="pen" title="Pen (P)">
                                        <i class="fas fa-pen tool-icon"></i>
                                    </button>
                                    <button class="tool-button" data-tool="eraser" title="Eraser (E)">
                                        <i class="fas fa-eraser tool-icon"></i>
                                    </button>
                                    <button class="tool-button" data-tool="text" title="Text (T)">
                                        <i class="fas fa-font tool-icon"></i>
                                    </button>

                                    <span class="toolbar-divider"></span>

                                    <!-- Shapes -->
                                    <button class="tool-button" data-tool="line" title="Line (L)">
                                        <i class="fas fa-minus tool-icon"></i>
                                    </button>
                                    <button class="tool-button" data-tool="rectangle" title="Rectangle (R)">
                                        <i class="far fa-square tool-icon"></i>
                                    </button>
                                    <button class="tool-button" data-tool="circle" title="Circle (C)">
                                        <i class="far fa-circle tool-icon"></i>
                                    </button>
                                    <button class="tool-button" data-tool="arrow" title="Arrow (A)">
                                        <i class="fas fa-long-arrow-alt-right tool-icon"></i>
                                    </button>
                                </div>

                                <div class="toolbar-section">
                                    <!-- Color Picker -->
                                    <div class="color-picker-wrapper">
                                        <div class="color-display" id="colorDisplay" style="background-color: #000000;"></div>
                                        <input type="color" id="strokeColor" value="#000000">
                                    </div>

                                    <!-- Stroke Width -->
                                    <div class="stroke-width-selector">
                                        <i class="fas fa-minus" style="font-size: 0.7rem;"></i>
                                        <input type="range" id="strokeWidth" min="1" max="20" value="3">
                                        <i class="fas fa-minus" style="font-size: 1.2rem;"></i>
                                        <span class="width-display" id="widthDisplay">3px</span>
                                    </div>
                                </div>

                                <div class="toolbar-section">
                                    <!-- Actions -->
                                    <button class="tool-button" id="undoBtn" title="Undo (Ctrl+Z)">
                                        <i class="fas fa-undo tool-icon"></i>
                                        Undo
                                    </button>
                                    <button class="tool-button" id="clearBtn" title="Clear Page">
                                        <i class="fas fa-trash tool-icon"></i>
                                        Clear
                                    </button>
                                    <button class="tool-button" id="shareBtn" title="Share Canvas (Allow others to write)">
                                        <i class="fas fa-share-alt tool-icon"></i>
                                        Share
                                    </button>
                                    <button class="tool-button" id="saveBtn" title="Save Session">
                                        <i class="fas fa-save tool-icon"></i>
                                        Save
                                    </button>
                                </div>
                            </div>

                            <!-- Canvas -->
                            <div class="canvas-container" id="canvasContainer">
                                <canvas id="whiteboardCanvas" width="1200" height="800"></canvas>
                            </div>

                            <!-- Page Navigation -->
                            <div class="page-navigation">
                                <div class="page-info">
                                    <i class="fas fa-file-alt"></i>
                                    <span id="pageInfo">Page 1 of 1</span>
                                </div>
                                <div class="page-controls">
                                    <button class="page-nav-btn" id="prevPageBtn">
                                        <i class="fas fa-chevron-left"></i> Previous
                                    </button>
                                    <button class="page-nav-btn add-page-btn" id="addPageBtn">
                                        <i class="fas fa-plus"></i> Add Page
                                    </button>
                                    <button class="page-nav-btn" id="nextPageBtn">
                                        Next <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- RIGHT SIDEBAR: Video & Chat -->
                        <div class="whiteboard-communication">
                            <!-- Video Section -->
                            <div class="video-section">
                                <div class="video-header">
                                    <span>
                                        <i class="fas fa-video"></i>
                                        Video Chat
                                    </span>
                                    <button class="record-btn" id="recordBtn">
                                        <i class="fas fa-circle"></i>
                                        Record
                                    </button>
                                </div>

                                <!-- Video Grid Container -->
                                <div class="video-grid-container">
                                    <!-- Main Video Row: Tutor + One Student -->
                                    <div class="main-video-row">
                                        <!-- Tutor Video -->
                                        <div class="video-placeholder main-video" id="tutorVideoPlaceholder">
                                            <img src="/uploads/system_images/system_profile_pictures/tutor-.jpg"
                                                 alt="Tutor"
                                                 class="video-avatar"
                                                 id="tutorVideoAvatar">
                                            <div class="video-participant-name" id="tutorVideoParticipantName">
                                                Teacher Name
                                            </div>
                                            <div class="video-status-badge">
                                                <i class="fas fa-circle"></i>
                                                Online
                                            </div>
                                        </div>

                                        <!-- Main Student Video -->
                                        <div class="video-placeholder main-video" id="mainStudentVideoPlaceholder">
                                            <img src="/uploads/system_images/system_profile_pictures/student-college-girl.jpg"
                                                 alt="Student"
                                                 class="video-avatar"
                                                 id="mainStudentVideoAvatar">
                                            <div class="video-participant-name" id="mainStudentVideoParticipantName">
                                                Student 1
                                            </div>
                                            <div class="video-status-badge">
                                                <i class="fas fa-circle"></i>
                                                Online
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Student Video Grid (2 placeholders) -->
                                    <div class="student-video-grid">
                                        <div class="student-video-placeholder">
                                            <img src="/uploads/system_images/system_profile_pictures/student-teenage-boy.jpg" alt="Student 2" class="student-avatar">
                                            <div class="student-name">Student 2</div>
                                            <div class="student-status online">
                                                <i class="fas fa-circle"></i>
                                            </div>
                                        </div>
                                        <div class="student-video-placeholder">
                                            <img src="/uploads/system_images/system_profile_pictures/student-college-boy.jpg" alt="Student 3" class="student-avatar">
                                            <div class="student-name">Student 3</div>
                                            <div class="student-status offline">
                                                <i class="fas fa-circle"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Chat Section -->
                            <div class="chat-section">
                                <div class="chat-header">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-comments"></i>
                                        Live Chat
                                    </div>
                                    <div class="chat-recipient-selector">
                                        <label for="chatRecipient">Send to:</label>
                                        <select id="chatRecipient" class="chat-recipient-dropdown">
                                            <option value="group">Everyone</option>
                                            <option value="tutor">Tutor</option>
                                            <!-- Students will be added dynamically -->
                                        </select>
                                    </div>
                                </div>
                                <div class="chat-messages" id="chatMessages">
                                    <!-- Chat messages will be dynamically loaded -->
                                </div>
                                <div class="chat-input-area">
                                    <div class="chat-input-wrapper">
                                        <input type="text"
                                               id="chatMessageInput"
                                               placeholder="Type a message..."
                                               maxlength="500">
                                        <button class="send-message-btn" id="sendMessageBtn">
                                            <i class="fas fa-paper-plane"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Modal controls
        document.getElementById('closeWhiteboard').addEventListener('click', () => this.closeModal());
        document.getElementById('minimizeWhiteboard').addEventListener('click', () => this.minimizeModal());
        document.getElementById('maximizeWhiteboard').addEventListener('click', () => this.maximizeModal());

        // Mobile toggle buttons in header
        document.getElementById('mobileToggleHistory').addEventListener('click', () => this.toggleMobileSidebar('history'));
        document.getElementById('mobileToggleChat').addEventListener('click', () => this.toggleMobileSidebar('chat'));

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentSession) {
                this.closeModal();
            }
        });

        // Canvas setup
        this.canvas = document.getElementById('whiteboardCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Resize canvas to fit container
        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();

        // Sidebar icon buttons (VS Code style)
        document.querySelectorAll('.sidebar-icon-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSidebarPanel(e.currentTarget.dataset.panel);
            });
        });

        // Canvas drawing events - Mouse
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Canvas drawing events - Touch
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        });

        // Tool selection
        document.querySelectorAll('.tool-button[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTool(e.currentTarget.dataset.tool);
            });
        });

        // Color picker
        const colorInput = document.getElementById('strokeColor');
        const colorDisplay = document.getElementById('colorDisplay');

        colorDisplay.addEventListener('click', () => colorInput.click());
        colorInput.addEventListener('input', (e) => {
            this.strokeColor = e.target.value;
            colorDisplay.style.backgroundColor = e.target.value;
        });

        // Stroke width
        document.getElementById('strokeWidth').addEventListener('input', (e) => {
            this.strokeWidth = parseInt(e.target.value);
            document.getElementById('widthDisplay').textContent = `${e.target.value}px`;
        });

        // Page navigation
        document.getElementById('prevPageBtn').addEventListener('click', () => this.previousPage());
        document.getElementById('nextPageBtn').addEventListener('click', () => this.nextPage());
        document.getElementById('addPageBtn').addEventListener('click', () => this.addNewPage());

        // Actions
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearPage());
        document.getElementById('shareBtn').addEventListener('click', () => this.shareCanvas());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveSession());

        // Recording
        document.getElementById('recordBtn').addEventListener('click', () => this.toggleRecording());

        // Chat
        document.getElementById('sendMessageBtn').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chatMessageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.currentSession) return;

            // Tool shortcuts (only if not typing in input)
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                switch(e.key.toLowerCase()) {
                    case 'p': this.selectTool('pen'); break;
                    case 'e': this.selectTool('eraser'); break;
                    case 't': this.selectTool('text'); break;
                    case 'l': this.selectTool('line'); break;
                    case 'r': this.selectTool('rectangle'); break;
                    case 'c': this.selectTool('circle'); break;
                    case 'a': this.selectTool('arrow'); break;
                }
            }

            // Undo
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
        });
    }

    /**
     * Open whiteboard modal with a session
     * @param {number|null} sessionId - Optional session ID to open
     * @param {number|null} studentId - Optional student ID to create/find session for
     */
    async openWhiteboard(sessionId = null, studentId = null) {
        try {
            // Case 1: Opening with a specific student (from Students panel)
            if (studentId && !sessionId) {
                // Find or create a session with this student
                const sessions = await this.loadSessionHistory();
                const existingSession = sessions.find(s =>
                    s.student_id === studentId &&
                    (s.status === 'in-progress' || s.status === 'scheduled')
                );

                if (existingSession) {
                    sessionId = existingSession.id;
                } else {
                    this.showNotification('No active session with this student. Please book a session first.', 'warning');
                    return;
                }
            }

            // Case 2: Opening from Digital Whiteboard card - open with any available session or blank board
            if (!sessionId && !studentId) {
                const sessions = await this.loadSessionHistory();

                if (sessions && sessions.length > 0) {
                    // Find in-progress session or use the first one
                    const activeSession = sessions.find(s => s.status === 'in-progress') || sessions[0];
                    sessionId = activeSession.id;
                } else {
                    // No sessions available - open blank whiteboard
                    document.getElementById('whiteboardModal').classList.add('active');
                    this.switchSidebarPanel('students');
                    this.showNotification('Whiteboard opened. Select a student to start a session or use as blank board.', 'info');

                    // Initialize blank canvas
                    this.canvas = document.getElementById('whiteboardCanvas');
                    this.ctx = this.canvas.getContext('2d');
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                    // Create a temporary page for drawing
                    this.currentPage = {
                        id: 'temp',
                        page_number: 1,
                        background_color: '#FFFFFF',
                        strokes: []
                    };
                    this.pages = [this.currentPage];
                    this.updatePageInfo();

                    return;
                }
            }

            // Case 3: Opening with specific session ID (from session history or found session)
            // Load session data
            await this.loadSession(sessionId);

            // Show modal
            document.getElementById('whiteboardModal').classList.add('active');

            // Start timer
            this.startSessionTimer();

            // Load chat messages
            await this.loadChatMessages();

            console.log('✅ Whiteboard opened successfully');
        } catch (error) {
            console.error('❌ Error opening whiteboard:', error);
            this.showNotification('Failed to open whiteboard', 'error');
        }
    }

    /**
     * Close whiteboard modal
     */
    closeModal() {
        const overlay = document.getElementById('whiteboardModal');
        const modal = document.getElementById('whiteboardModalContainer');

        overlay.classList.remove('active', 'minimized-state');
        modal.classList.remove('minimized', 'maximized');

        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        // Disconnect WebSocket
        if (this.ws) {
            this.ws.close();
        }

        this.currentSession = null;
    }

    /**
     * Minimize whiteboard modal
     */
    minimizeModal() {
        const modal = document.getElementById('whiteboardModalContainer');
        const overlay = document.getElementById('whiteboardModal');
        const minimizeBtn = document.getElementById('minimizeWhiteboard');
        const maximizeBtn = document.getElementById('maximizeWhiteboard');

        if (modal.classList.contains('minimized')) {
            // Restore
            modal.classList.remove('minimized');
            overlay.classList.remove('minimized-state');
            minimizeBtn.innerHTML = '<i class="fas fa-window-minimize"></i>';
        } else {
            // Minimize
            modal.classList.add('minimized');
            modal.classList.remove('maximized');
            overlay.classList.add('minimized-state');
            minimizeBtn.innerHTML = '<i class="fas fa-window-restore"></i>';
            maximizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    }

    /**
     * Maximize whiteboard modal
     */
    maximizeModal() {
        const modal = document.getElementById('whiteboardModalContainer');
        const overlay = document.getElementById('whiteboardModal');
        const maximizeBtn = document.getElementById('maximizeWhiteboard');

        if (modal.classList.contains('maximized')) {
            // Restore
            modal.classList.remove('maximized');
            maximizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
        } else {
            // Maximize
            modal.classList.add('maximized');
            modal.classList.remove('minimized');
            overlay.classList.remove('minimized-state');
            maximizeBtn.innerHTML = '<i class="fas fa-compress"></i>';
        }

        // Resize canvas after maximize/restore
        setTimeout(() => this.resizeCanvas(), 100);
    }

    /**
     * Switch sidebar panel (VS Code style)
     */
    switchSidebarPanel(panel) {
        // Update icon buttons
        document.querySelectorAll('.sidebar-icon-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.panel === panel);
        });

        // Update panels
        document.querySelectorAll('.sidebar-panel').forEach(p => {
            p.classList.toggle('active', p.id === `${panel}Panel`);
        });
    }

    /**
     * Load session history
     */
    async loadSessionHistory() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');

            if (!token || !user || !user.id) return [];

            const userType = (user.roles && user.roles.includes('tutor')) ? 'tutor' : 'student';
            const response = await fetch(
                `${this.API_BASE}/sessions/history/${userType}/${user.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (data.success) {
                this.renderSessionHistory(data.sessions);
                return data.sessions;
            }
        } catch (error) {
            console.error('Error loading session history:', error);
        }

        return [];
    }

    /**
     * Render session history cards
     */
    renderSessionHistory(sessions) {
        const container = document.getElementById('sessionHistoryList');

        if (!sessions || sessions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p>No sessions yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sessions.map(session => `
            <div class="session-card ${session.status === 'in-progress' ? 'active' : ''}"
                 data-session-id="${session.id}">
                <div class="session-card-header" onclick="whiteboardManager.toggleSessionCard(${session.id})">
                    <div>
                        <h4 class="session-card-title">${session.session_title}</h4>
                        <p class="session-card-date">
                            ${new Date(session.scheduled_start).toLocaleDateString()}
                        </p>
                    </div>
                    <button class="session-toggle">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="session-card-body">
                    <div class="session-detail-item">
                        <i class="fas fa-book"></i>
                        <span>${session.subject} - ${session.grade_level}</span>
                    </div>
                    <div class="session-detail-item">
                        <i class="fas fa-user"></i>
                        <span>${session.other_user_name}</span>
                    </div>
                    <div class="session-detail-item">
                        <i class="fas fa-circle"></i>
                        <span class="permission-badge ${session.status !== 'in-progress' ? 'disabled' : ''}">
                            ${session.status}
                        </span>
                    </div>
                    <div class="session-actions">
                        <button class="session-action-btn" onclick="whiteboardManager.loadSession(${session.id})">
                            <i class="fas fa-play"></i> Open
                        </button>
                        <button class="session-action-btn" onclick="whiteboardManager.downloadSession(${session.id})">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="session-action-btn danger" onclick="whiteboardManager.deleteSession(${session.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Toggle session card expansion
     */
    toggleSessionCard(sessionId) {
        const card = document.querySelector(`[data-session-id="${sessionId}"]`);
        card.classList.toggle('expanded');
    }

    /**
     * Download session data
     */
    async downloadSession(sessionId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE}/sessions/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                // Create JSON file with session data
                const sessionData = {
                    session: data.session,
                    pages: data.session.pages || [],
                    downloaded_at: new Date().toISOString()
                };

                const dataStr = JSON.stringify(sessionData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);

                const link = document.createElement('a');
                link.href = url;
                link.download = `${data.session.session_title}_${Date.now()}.json`;
                link.click();

                URL.revokeObjectURL(url);
                this.showNotification('Session data downloaded successfully', 'success');
            }
        } catch (error) {
            console.error('Error downloading session:', error);
            this.showNotification('Failed to download session', 'error');
        }
    }

    /**
     * Delete a session
     */
    async deleteSession(sessionId) {
        if (!confirm('Delete this session? This cannot be undone.')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE}/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Session deleted successfully', 'success');
                await this.loadSessionHistory();
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            this.showNotification('Failed to delete session', 'error');
        }
    }

    /**
     * Load a specific session
     */
    async loadSession(sessionId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE}/sessions/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.currentSession = data.session;
                this.pages = data.session.pages || [];
                this.permissions = data.session.student_permissions || {
                    can_draw: false,
                    can_write: false,
                    can_erase: false
                };

                // Update UI
                document.getElementById('whiteboardSessionTitle').textContent =
                    data.session.session_title;

                // Update tutor name subtitle
                const tutorNameSubtitle = document.getElementById('tutorNameSubtitle');
                if (tutorNameSubtitle && data.session.other_user_name) {
                    tutorNameSubtitle.textContent = data.session.other_user_name;
                }

                // Load first page
                if (this.pages.length > 0) {
                    this.loadPage(0);
                }

                // Update page info
                this.updatePageInfo();

                // Load recordings for this session
                await this.loadRecordings();

                // Populate student list in chat recipient dropdown
                this.populateStudentDropdown();

                console.log('✅ Session loaded:', this.currentSession);
            }
        } catch (error) {
            console.error('Error loading session:', error);
        }
    }

    /**
     * Load a specific page
     */
    loadPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= this.pages.length) return;

        this.currentPage = this.pages[pageIndex];

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Set background color
        this.ctx.fillStyle = this.currentPage.background_color || '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw all strokes
        if (this.currentPage.strokes) {
            this.currentPage.strokes.forEach(stroke => {
                this.drawStroke(stroke);
            });
        }

        this.updatePageInfo();
    }

    /**
     * Draw a stroke on canvas
     */
    drawStroke(stroke) {
        const data = stroke.stroke_data;

        this.ctx.strokeStyle = data.color || '#000000';
        this.ctx.lineWidth = data.width || 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        switch (stroke.stroke_type) {
            case 'pen':
            case 'eraser':
                if (data.points && data.points.length > 0) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(data.points[0][0], data.points[0][1]);
                    for (let i = 1; i < data.points.length; i++) {
                        this.ctx.lineTo(data.points[i][0], data.points[i][1]);
                    }
                    this.ctx.stroke();
                }
                break;

            case 'text':
                this.ctx.font = `${data.fontSize || 16}px ${data.fontFamily || 'Arial'}`;
                this.ctx.fillStyle = data.color || '#000000';
                this.ctx.fillText(data.text, data.x, data.y);
                break;

            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(data.startX, data.startY);
                this.ctx.lineTo(data.endX, data.endY);
                this.ctx.stroke();
                break;

            case 'rectangle':
                this.ctx.strokeRect(data.x, data.y, data.width, data.height);
                break;

            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(data.x, data.y, data.radius, 0, 2 * Math.PI);
                this.ctx.stroke();
                break;
        }
    }

    /**
     * Start drawing on canvas
     */
    startDrawing(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.currentTool === 'text') {
            this.addText(x, y);
            return;
        }

        this.isDrawing = true;
        this.currentStroke = [[x, y]];
    }

    /**
     * Draw on canvas
     */
    draw(e) {
        if (!this.isDrawing) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.currentStroke.push([x, y]);

        // Draw locally
        this.ctx.strokeStyle = this.strokeColor;
        this.ctx.lineWidth = this.strokeWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        const points = this.currentStroke;
        if (points.length > 1) {
            this.ctx.beginPath();
            this.ctx.moveTo(points[points.length - 2][0], points[points.length - 2][1]);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        }
    }

    /**
     * Stop drawing
     */
    async stopDrawing() {
        if (!this.isDrawing) return;

        this.isDrawing = false;

        if (this.currentStroke.length > 1) {
            // Save stroke to server
            await this.saveStroke({
                stroke_type: this.currentTool,
                stroke_data: {
                    points: this.currentStroke,
                    color: this.strokeColor,
                    width: this.strokeWidth
                }
            });
        }

        this.currentStroke = [];
    }

    /**
     * Add text to canvas
     */
    addText(x, y) {
        const text = prompt('Enter text:');
        if (!text) return;

        // Draw text locally
        this.ctx.font = `${this.strokeWidth * 6}px Arial`;
        this.ctx.fillStyle = this.strokeColor;
        this.ctx.fillText(text, x, y);

        // Save to server
        this.saveStroke({
            stroke_type: 'text',
            stroke_data: {
                text: text,
                x: x,
                y: y,
                fontSize: this.strokeWidth * 6,
                fontFamily: 'Arial',
                color: this.strokeColor
            }
        });
    }

    /**
     * Save stroke to server
     */
    async saveStroke(stroke) {
        if (!this.currentPage) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE}/canvas/stroke`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    page_id: this.currentPage.id,
                    ...stroke
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log('✅ Stroke saved');
            }
        } catch (error) {
            console.error('Error saving stroke:', error);
        }
    }

    /**
     * Select a tool
     */
    selectTool(tool) {
        this.currentTool = tool;

        // Update UI
        document.querySelectorAll('.tool-button[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });

        // Update cursor
        if (tool === 'text') {
            this.canvas.style.cursor = 'text';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    /**
     * Clear current page
     */
    clearPage() {
        if (!confirm('Clear entire page? This cannot be undone.')) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Undo last stroke
     */
    undo() {
        // TODO: Implement undo functionality
        console.log('Undo not yet implemented');
    }

    /**
     * Save session
     */
    saveSession() {
        this.showNotification('Session saved successfully', 'success');
    }

    /**
     * Share canvas - Allow others to write on canvas
     */
    async shareCanvas() {
        if (!this.currentSession) {
            this.showNotification('No active session to share', 'warning');
            return;
        }

        // TODO: Implement actual share functionality with permissions API
        // This will allow selecting students/participants and granting them write permissions

        // Placeholder: Show a notification
        this.showNotification('Share functionality coming soon! This will allow you to grant write permissions to students.', 'info');

        console.log('Share canvas clicked - would show modal to select participants and grant permissions:', {
            sessionId: this.currentSession.id,
            currentPermissions: this.permissions
        });

        // Future implementation will:
        // 1. Show modal with list of session participants
        // 2. Allow toggling can_draw, can_write, can_erase permissions per student
        // 3. Send API request to update permissions: PUT /api/whiteboard/sessions/{id}/permissions
        // 4. Broadcast permission changes via WebSocket to affected students
    }

    /**
     * Page navigation
     */
    previousPage() {
        const currentIndex = this.pages.indexOf(this.currentPage);
        if (currentIndex > 0) {
            this.loadPage(currentIndex - 1);
        }
    }

    nextPage() {
        const currentIndex = this.pages.indexOf(this.currentPage);
        if (currentIndex < this.pages.length - 1) {
            this.loadPage(currentIndex + 1);
        }
    }

    async addNewPage() {
        // TODO: Create new page via API
        this.showNotification('Add page not yet implemented', 'info');
    }

    /**
     * Update page info display
     */
    updatePageInfo() {
        const currentIndex = this.pages.indexOf(this.currentPage);
        document.getElementById('pageInfo').textContent =
            `Page ${currentIndex + 1} of ${this.pages.length}`;

        // Update button states
        document.getElementById('prevPageBtn').disabled = currentIndex === 0;
        document.getElementById('nextPageBtn').disabled = currentIndex === this.pages.length - 1;
    }

    /**
     * Load chat messages
     */
    async loadChatMessages() {
        if (!this.currentSession) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${this.API_BASE}/chat/${this.currentSession.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (data.success) {
                this.renderChatMessages(data.messages);
            }
        } catch (error) {
            console.error('Error loading chat messages:', error);
        }
    }

    /**
     * Render chat messages
     */
    renderChatMessages(messages) {
        const container = document.getElementById('chatMessages');
        const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');

        container.innerHTML = messages.map(msg => {
            const isSent = msg.sender_id === user.id;
            return `
                <div class="chat-message ${isSent ? 'sent' : ''}">
                    <img src="/uploads/system_images/system_profile_pictures/tutor-.jpg"
                         alt="Avatar"
                         class="message-avatar">
                    <div class="message-content">
                        <div class="message-sender">${msg.sender_name}</div>
                        <div class="message-bubble">${msg.message_text}</div>
                        <div class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Send chat message
     */
    async sendChatMessage() {
        const input = document.getElementById('chatMessageInput');
        const message = input.value.trim();

        if (!message || !this.currentSession) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE}/chat/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: this.currentSession.id,
                    message_text: message
                })
            });

            const data = await response.json();

            if (data.success) {
                input.value = '';
                await this.loadChatMessages();
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    /**
     * Start session timer
     */
    startSessionTimer() {
        this.sessionStartTime = new Date();

        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((new Date() - this.sessionStartTime) / 1000);
            const hours = Math.floor(elapsed / 3600);
            const minutes = Math.floor((elapsed % 3600) / 60);
            const seconds = elapsed % 60;

            document.getElementById('sessionTimer').textContent =
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // TODO: Integrate with existing notification system
    }

    /**
     * Toggle sidebar (works on both desktop and mobile)
     */
    toggleMobileSidebar(sidebar) {
        const historyElement = document.querySelector('.whiteboard-sidebar');
        const chatElement = document.querySelector('.whiteboard-communication');

        if (sidebar === 'history') {
            // On desktop: toggle collapsed class
            // On mobile: toggle mobile-active class
            if (window.innerWidth > 968) {
                historyElement.classList.toggle('collapsed');
            } else {
                historyElement.classList.toggle('mobile-active');
                chatElement.classList.remove('mobile-active');
            }
        } else if (sidebar === 'chat') {
            chatElement.classList.toggle('mobile-active');
            historyElement.classList.remove('mobile-active');
        }
    }

    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        if (!this.canvas) return;

        const container = document.getElementById('canvasContainer');
        if (!container) return;

        // Get container dimensions
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Set canvas size to fit container while maintaining aspect ratio
        const aspectRatio = 3 / 2; // 1200:800 = 3:2
        let canvasWidth = containerWidth - 40; // 20px padding on each side
        let canvasHeight = canvasWidth / aspectRatio;

        // If height exceeds container, scale by height instead
        if (canvasHeight > containerHeight - 40) {
            canvasHeight = containerHeight - 40;
            canvasWidth = canvasHeight * aspectRatio;
        }

        // Only resize if dimensions changed significantly (avoid constant resizing)
        if (Math.abs(this.canvas.width - canvasWidth) > 10) {
            // Save current canvas content
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

            // Resize canvas
            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;

            // Restore canvas content (scaled)
            this.ctx.putImageData(imageData, 0, 0);

            // Reload current page if exists
            if (this.currentPage) {
                this.loadPage(this.pages.indexOf(this.currentPage));
            }
        }
    }

    /**
     * Delete current page
     */
    async deletePage() {
        if (!this.currentPage || this.pages.length <= 1) {
            this.showNotification('Cannot delete the only page', 'warning');
            return;
        }

        if (!confirm('Delete this page? This cannot be undone.')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE}/pages/${this.currentPage.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                // Remove from local pages array
                const currentIndex = this.pages.indexOf(this.currentPage);
                this.pages.splice(currentIndex, 1);

                // Load previous or first page
                const newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
                this.loadPage(newIndex);

                this.showNotification('Page deleted successfully', 'success');
            }
        } catch (error) {
            console.error('Error deleting page:', error);
            this.showNotification('Failed to delete page', 'error');
        }
    }

    /**
     * Download canvas as image
     */
    downloadCanvas() {
        if (!this.canvas) return;

        try {
            // Create a download link
            const link = document.createElement('a');
            const sessionTitle = this.currentSession?.session_title || 'whiteboard';
            const pageNum = this.pages.indexOf(this.currentPage) + 1;
            link.download = `${sessionTitle}_page${pageNum}_${Date.now()}.png`;

            // Convert canvas to blob
            this.canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);

                this.showNotification('Canvas downloaded successfully', 'success');
            });
        } catch (error) {
            console.error('Error downloading canvas:', error);
            this.showNotification('Failed to download canvas', 'error');
        }
    }

    /**
     * Toggle recording
     */
    async toggleRecording() {
        if (!this.currentSession) return;

        const recordBtn = document.getElementById('recordBtn');

        if (this.isRecording) {
            // Stop recording
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${this.API_BASE}/recordings/stop?session_id=${this.currentSession.id}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (data.success) {
                    this.isRecording = false;
                    recordBtn.classList.remove('recording');
                    recordBtn.innerHTML = '<i class="fas fa-circle"></i> Record';

                    this.showNotification('Recording stopped', 'success');

                    // Save recording with board snapshot
                    await this.saveRecording();
                }
            } catch (error) {
                console.error('Error stopping recording:', error);
                this.showNotification('Failed to stop recording', 'error');
            }
        } else {
            // Start recording
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${this.API_BASE}/recordings/start?session_id=${this.currentSession.id}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (data.success) {
                    this.isRecording = true;
                    recordBtn.classList.add('recording');
                    recordBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';

                    this.showNotification('Recording started', 'success');
                }
            } catch (error) {
                console.error('Error starting recording:', error);
                this.showNotification('Failed to start recording', 'error');
            }
        }
    }

    /**
     * Save recording to database
     */
    async saveRecording() {
        if (!this.currentSession) return;

        try {
            const token = localStorage.getItem('token');
            const recordingTitle = `${this.currentSession.session_title} - ${new Date().toLocaleDateString()}`;

            const response = await fetch(`${this.API_BASE}/recordings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: this.currentSession.id,
                    recording_title: recordingTitle,
                    recording_type: 'screen',
                    file_url: null, // Will be set when actual video file is uploaded
                    duration_seconds: null
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Recording saved successfully', 'success');
                await this.loadRecordings();
            }
        } catch (error) {
            console.error('Error saving recording:', error);
            this.showNotification('Failed to save recording', 'error');
        }
    }

    /**
     * Load recordings for current session
     */
    async loadRecordings() {
        if (!this.currentSession) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${this.API_BASE}/recordings/session/${this.currentSession.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (data.success) {
                this.recordings = data.recordings;
                this.renderRecordings();
            }
        } catch (error) {
            console.error('Error loading recordings:', error);
        }
    }

    /**
     * Render recordings list (in Recordings panel)
     */
    renderRecordings() {
        const container = document.getElementById('recordingsList');

        if (!this.recordings || this.recordings.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-video" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p>No recordings yet</p>
                    <p style="font-size: 0.75rem;">Click Record button to start</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.recordings.map(recording => {
            const duration = recording.duration_seconds
                ? `${Math.floor(recording.duration_seconds / 60)}:${String(recording.duration_seconds % 60).padStart(2, '0')}`
                : 'N/A';

            const date = new Date(recording.recording_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            return `
                <div class="recording-item" data-recording-id="${recording.id}">
                    <div class="recording-header">
                        <i class="fas fa-circle recording-icon"></i>
                        <div class="recording-info">
                            <h4>${recording.recording_title}</h4>
                            <p>${date}</p>
                            <div class="recording-meta">
                                <span><i class="fas fa-clock"></i> ${duration}</span>
                                <span><i class="fas fa-circle"></i> ${recording.recording_type}</span>
                            </div>
                        </div>
                    </div>
                    <div class="recording-actions">
                        <button class="recording-action-btn" onclick="whiteboardManager.playRecording(${recording.id})">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="recording-action-btn" onclick="whiteboardManager.downloadRecording(${recording.id})">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="recording-action-btn danger" onclick="whiteboardManager.deleteRecording(${recording.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Play recording (show board snapshot)
     */
    async playRecording(recordingId) {
        const recording = this.recordings.find(r => r.id === recordingId);
        if (!recording || !recording.board_snapshot) {
            this.showNotification('Recording data not available', 'warning');
            return;
        }

        // TODO: Implement playback of board snapshot
        // For now, just show notification
        this.showNotification('Recording playback coming soon', 'info');
    }

    /**
     * Download recording
     */
    async downloadRecording(recordingId) {
        const recording = this.recordings.find(r => r.id === recordingId);
        if (!recording) return;

        if (recording.file_url) {
            // Download actual video file
            window.open(recording.file_url, '_blank');
        } else {
            // Download board snapshot as JSON
            const dataStr = JSON.stringify(recording.board_snapshot, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${recording.recording_title}_snapshot.json`;
            link.click();

            URL.revokeObjectURL(url);
            this.showNotification('Board snapshot downloaded', 'success');
        }
    }

    /**
     * Delete recording
     */
    async deleteRecording(recordingId) {
        if (!confirm('Delete this recording? This cannot be undone.')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.API_BASE}/recordings/${recordingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Recording deleted successfully', 'success');
                await this.loadRecordings();
            }
        } catch (error) {
            console.error('Error deleting recording:', error);
            this.showNotification('Failed to delete recording', 'error');
        }
    }

    /**
     * Load and render students list in Students panel
     */
    async loadStudentsList() {
        const container = document.getElementById('studentsList');

        // Sample student data - replace with actual API call
        const students = [
            {
                id: 1,
                name: 'Abebe Bekele',
                profile_picture: '/uploads/system_images/system_profile_pictures/student-college-boy.jpg',
                classes: 'Mathematics, Physics'
            },
            {
                id: 2,
                name: 'Tigist Mekonnen',
                profile_picture: '/uploads/system_images/system_profile_pictures/student-college-girl.jpg',
                classes: 'Chemistry, Biology'
            },
            {
                id: 3,
                name: 'Dawit Tadesse',
                profile_picture: '/uploads/system_images/system_profile_pictures/student-teenage-boy.jpg',
                classes: 'English, History'
            },
            {
                id: 4,
                name: 'Meron Hailu',
                profile_picture: '/uploads/system_images/system_profile_pictures/student-teenage-girl.jpg',
                classes: 'Mathematics, Computer Science'
            }
        ];

        if (!students || students.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-user-graduate" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p>No students yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = students.map(student => `
            <div class="student-card" data-student-id="${student.id}">
                <img src="${student.profile_picture}"
                     alt="${student.name}"
                     class="student-card-avatar">
                <div class="student-card-info">
                    <h4 class="student-card-name">${student.name}</h4>
                    <p class="student-card-classes">${student.classes}</p>
                </div>
            </div>
        `).join('');

        // Add click handlers to student cards
        container.querySelectorAll('.student-card').forEach(card => {
            card.addEventListener('click', () => {
                const studentId = card.dataset.studentId;
                this.openWhiteboardWithStudent(studentId);
            });
        });

        // Setup search functionality
        const searchInput = document.getElementById('studentsSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                container.querySelectorAll('.student-card').forEach(card => {
                    const name = card.querySelector('.student-card-name').textContent.toLowerCase();
                    const classes = card.querySelector('.student-card-classes').textContent.toLowerCase();
                    const matches = name.includes(searchTerm) || classes.includes(searchTerm);
                    card.style.display = matches ? 'flex' : 'none';
                });
            });
        }
    }

    /**
     * Open whiteboard with a specific student
     */
    async openWhiteboardWithStudent(studentId) {
        console.log('Opening whiteboard for student:', studentId);
        await this.openWhiteboard(null, studentId);
    }

    /**
     * Download file
     */
    downloadFile(fileName) {
        // TODO: Implement actual file download from server
        this.showNotification(`Downloading ${fileName}...`, 'info');
        console.log('Download file:', fileName);
    }

    /**
     * Delete file
     */
    async deleteFile(fileName) {
        if (!confirm(`Delete ${fileName}? This cannot be undone.`)) return;

        // TODO: Implement actual file deletion via API
        this.showNotification(`${fileName} deleted successfully`, 'success');
        console.log('Delete file:', fileName);
    }

    /**
     * Populate student dropdown for chat recipients
     */
    populateStudentDropdown() {
        const dropdown = document.getElementById('chatRecipient');
        if (!dropdown || !this.currentSession) return;

        // Get existing options
        const baseOptions = `
            <option value="group">Everyone</option>
            <option value="tutor">Tutor</option>
        `;

        // Add student options (mock data for now)
        const studentOptions = `
            <option value="student_1">Student 1</option>
            <option value="student_2">Student 2</option>
            <option value="student_3">Student 3</option>
        `;

        dropdown.innerHTML = baseOptions + studentOptions;
    }

    /**
     * Create coursework for the current student in the whiteboard session
     */
    createCourseworkForCurrentStudent() {
        if (!this.currentSession) {
            alert('⚠️ Please start a session first');
            return;
        }

        // Get student ID from current session
        const studentId = this.currentSession.student_id;

        if (!studentId) {
            alert('⚠️ No student selected for this session');
            return;
        }

        // Check if courseworkManager exists
        if (typeof courseworkManager !== 'undefined') {
            // Close whiteboard modal
            this.closeModal();

            // Pre-select the student
            courseworkManager.selectedStudentId = studentId;

            // Open coursework creation modal
            courseworkManager.openGiveCourseworkModal();

            // Pre-populate student info
            setTimeout(() => {
                const student = courseworkManager.students?.find(s => s.id === studentId);
                if (student) {
                    const selectedDiv = document.getElementById('courseworkSelectedStudent');
                    if (selectedDiv) {
                        selectedDiv.innerHTML = `
                            <div class="selected-student">
                                <img src="${student.profilePicture || '/uploads/system_images/system_profile_pictures/woman-user.jpg'}" alt="${student.name}">
                                <div>
                                    <strong>${student.name}</strong>
                                    <p>${student.grade}</p>
                                </div>
                            </div>
                        `;
                    }
                }
            }, 100);
        } else {
            alert('❌ Coursework Manager not loaded. Please ensure coursework-manager.js is included.');
        }
    }

    /**
     * Load coursework for the current student
     */
    async loadCourseworkForStudent(studentId) {
        const courseworkListEl = document.getElementById('courseworkList');
        if (!courseworkListEl) return;

        try {
            // Check if courseworkManager exists
            if (typeof courseworkManager === 'undefined') {
                courseworkListEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Coursework Manager not loaded</p>
                    </div>
                `;
                return;
            }

            // Get all coursework
            let allCoursework = courseworkManager.courseworks || [];

            // Filter for this student
            let studentCoursework = allCoursework.filter(cw =>
                cw.studentId === studentId ||
                cw.student_id === studentId ||
                (Array.isArray(cw.students) && cw.students.includes(studentId))
            );

            if (studentCoursework.length === 0) {
                courseworkListEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-clipboard-list"></i>
                        <p>No coursework yet</p>
                        <button class="btn-primary" onclick="whiteboardManager.createCourseworkForCurrentStudent()">
                            <i class="fas fa-plus"></i> Create Coursework
                        </button>
                    </div>
                `;
                return;
            }

            // Render coursework list
            const courseworkHTML = studentCoursework.map(cw => `
                <div class="session-card" onclick="courseworkManager.viewCourseworkDetails('${cw.id}')">
                    <div class="session-card-header">
                        <span class="session-name">${cw.courseName || cw.course_name}</span>
                        <span class="session-status ${cw.status}">${cw.status}</span>
                    </div>
                    <div class="session-card-details">
                        <span class="session-time">
                            <i class="far fa-calendar"></i>
                            ${cw.courseworkType || cw.coursework_type}
                        </span>
                        <span class="session-duration">
                            <i class="far fa-clock"></i>
                            ${cw.timeLimit || cw.time_limit || 0} min
                        </span>
                    </div>
                </div>
            `).join('');

            courseworkListEl.innerHTML = courseworkHTML;

        } catch (error) {
            console.error('Error loading coursework:', error);
            courseworkListEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load coursework</p>
                </div>
            `;
        }
    }
}

// Initialize whiteboard manager
const whiteboardManager = new WhiteboardManager();

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    whiteboardManager.initialize();
});

// ============================================
// STUDENT WHITEBOARD MANAGER
// Manages whiteboard sessions for specific students
// ============================================

const StudentWhiteboardManager = {
    currentStudentId: null,
    sessions: [],

    /**
     * Initialize the manager with a student ID
     */
    init(studentId) {
        this.currentStudentId = studentId;
        console.log('📝 StudentWhiteboardManager initialized for student:', studentId);
    },

    /**
     * Load whiteboard sessions for the current student from whiteboardManager
     */
    async loadSessions() {
        const container = document.getElementById('student-whiteboard-sessions');
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p>Loading whiteboard sessions...</p>
            </div>
        `;

        try {
            // Get student ID from the modal
            if (!this.currentStudentId) {
                console.warn('No student ID set');
                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-gray-500">
                        <p>Student information not available</p>
                    </div>
                `;
                return;
            }

            // Check if whiteboardManager exists
            if (typeof whiteboardManager === 'undefined') {
                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-yellow-500">
                        <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                        <p>whiteboardManager not loaded</p>
                        <p class="text-sm mt-2">Please ensure whiteboard-manager.js is included</p>
                    </div>
                `;
                return;
            }

            // Load all sessions from whiteboardManager
            const allSessions = await whiteboardManager.loadSessionHistory();

            // Filter sessions for this specific student
            const studentSessions = allSessions.filter(session =>
                session.student_id === this.currentStudentId ||
                session.studentId === this.currentStudentId
            );

            this.sessions = studentSessions;

            if (studentSessions.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-gray-500">
                        <i class="fas fa-chalkboard text-3xl mb-3"></i>
                        <p>No whiteboard sessions yet</p>
                        <p class="text-sm mt-2">Create your first session to get started</p>
                    </div>
                `;
                return;
            }

            // Render session cards
            container.innerHTML = studentSessions.map(session => this.renderSessionCard(session)).join('');

        } catch (error) {
            console.error('Error loading whiteboard sessions:', error);
            container.innerHTML = `
                <div class="col-span-full card p-6 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                    <p>Failed to load whiteboard sessions</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Render a session card
     */
    renderSessionCard(session) {
        const statusColors = {
            'scheduled': 'bg-blue-100 text-blue-800',
            'in-progress': 'bg-green-100 text-green-800',
            'completed': 'bg-gray-100 text-gray-800',
            'cancelled': 'bg-red-100 text-red-800'
        };

        const statusIcons = {
            'scheduled': '📅',
            'in-progress': '▶️',
            'completed': '✅',
            'cancelled': '❌'
        };

        const sessionDate = new Date(session.session_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const statusClass = statusColors[session.status] || 'bg-gray-100 text-gray-800';
        const statusIcon = statusIcons[session.status] || '📝';

        return `
            <div class="card p-4 hover:shadow-lg transition">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-bold text-lg">${session.session_title || 'Whiteboard Session'}</h4>
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${statusClass}">
                        ${statusIcon} ${session.status}
                    </span>
                </div>

                <div class="space-y-2 mb-4">
                    <div class="flex items-center gap-2 text-sm">
                        <i class="fas fa-calendar text-gray-500"></i>
                        <span style="color: var(--text-secondary);">${sessionDate}</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm">
                        <i class="fas fa-file text-gray-500"></i>
                        <span style="color: var(--text-secondary);">
                            ${session.page_count || 0} page${session.page_count !== 1 ? 's' : ''}
                        </span>
                    </div>
                    ${session.description ? `
                        <div class="text-sm text-gray-600 mt-2">
                            ${session.description}
                        </div>
                    ` : ''}
                </div>

                <div class="flex gap-2">
                    ${session.status === 'scheduled' ? `
                        <button
                            onclick="StudentWhiteboardManager.startSession(${session.id})"
                            class="flex-1 btn-primary"
                            style="padding: 8px; font-size: 0.875rem;">
                            <i class="fas fa-play"></i> Start Session
                        </button>
                    ` : session.status === 'in-progress' ? `
                        <button
                            onclick="StudentWhiteboardManager.openSession(${session.id})"
                            class="flex-1 btn-primary"
                            style="padding: 8px; font-size: 0.875rem;">
                            <i class="fas fa-chalkboard"></i> Continue
                        </button>
                    ` : `
                        <button
                            onclick="StudentWhiteboardManager.viewSession(${session.id})"
                            class="flex-1 btn-secondary"
                            style="padding: 8px; font-size: 0.875rem;">
                            <i class="fas fa-eye"></i> View
                        </button>
                    `}
                    <button
                        onclick="StudentWhiteboardManager.deleteSession(${session.id})"
                        class="btn-secondary"
                        style="padding: 8px; font-size: 0.875rem;"
                        title="Delete session">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Create a new whiteboard session - Opens whiteboardManager with student pre-selected
     */
    async createNewSession() {
        if (!this.currentStudentId) {
            alert('❌ No student selected');
            return;
        }

        // Check if whiteboardManager exists
        if (typeof whiteboardManager === 'undefined') {
            alert('❌ whiteboardManager not loaded. Please ensure whiteboard-manager.js is included.');
            return;
        }

        // Open whiteboard with this student ID
        // whiteboardManager will handle creating/finding a session
        await whiteboardManager.openWhiteboardWithStudent(this.currentStudentId);

        // After the whiteboard is closed, reload the sessions
        // (Note: This will auto-refresh when returning to this view)
    },

    /**
     * Start a scheduled session - Opens whiteboardManager
     */
    async startSession(sessionId) {
        if (typeof whiteboardManager !== 'undefined') {
            await whiteboardManager.openWhiteboard(sessionId);
        } else {
            alert('❌ whiteboardManager not loaded');
        }
    },

    /**
     * Open a session (launches whiteboard modal)
     */
    openSession(sessionId) {
        if (typeof whiteboardManager !== 'undefined') {
            whiteboardManager.openWhiteboard(sessionId);
        } else {
            alert('❌ whiteboardManager not loaded');
        }
    },

    /**
     * View a completed session (read-only)
     */
    viewSession(sessionId) {
        this.openSession(sessionId);
    },

    /**
     * Delete a session - Delegates to whiteboardManager
     */
    async deleteSession(sessionId) {
        // For now, just show a message
        // The actual delete functionality should be in whiteboardManager
        alert('🗑️ Delete functionality: This should be implemented in whiteboardManager.\n\nFor now, sessions can be deleted from the main Teaching Tools panel.');
    }
};

// Export to window
window.StudentWhiteboardManager = StudentWhiteboardManager;
