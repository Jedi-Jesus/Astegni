/**
 * Coursework Manager for Tutor Profile
 * Handles coursework creation, management, and student assessment
 */

class CourseworkManager {
    constructor() {
        this.courseworks = [];
        this.currentCoursework = null;
        this.currentQuestionIndex = 0;
        this.studentAnswers = [];
        this.timerInterval = null;
        this.selectedStudentId = null;
        this.questionEditors = {}; // Store Quill instances for questions
        this.answerEditors = {}; // Store Quill instances for answers
        this.API_BASE_URL = 'http://localhost:8000';

        // Sample data - using real student IDs from database
        this.students = [
            { id: 112, name: "Abebe Kebede", profilePic: "../uploads/system_images/system_profile_pictures/student-college-boy.jpg" },
            { id: 93, name: "Tigist Mekonnen", profilePic: "../uploads/system_images/system_profile_pictures/student-college-girl.jpg" },
            { id: 94, name: "Dawit Alemayehu", profilePic: "../uploads/system_images/system_profile_pictures/student-teenage-boy.jpg" },
            { id: 95, name: "Helen Bekele", profilePic: "../uploads/system_images/system_profile_pictures/student-teenage-girl.jpg" },
            { id: 98, name: "J (Multi-role)", profilePic: "../uploads/system_images/system_profile_pictures/student-kid-boy.jpg" }
        ];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCourseworksFromAPI();
    }

    // ========== API HELPER METHODS ==========

    async getAuthToken() {
        return localStorage.getItem('token') || localStorage.getItem('access_token');
    }

    async apiRequest(endpoint, method = 'GET', body = null) {
        const token = await this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            method,
            headers
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}${endpoint}`, options);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    // ========== MODAL MANAGEMENT ==========

    openMainModal() {
        const modal = document.getElementById('courseworkMainModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.updateNotifications();
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.coursework-modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = 'auto';
    }

    openGiveCourseworkModal() {
        this.closeAllModals();
        const modal = document.getElementById('courseworkGiveModal');
        if (modal) {
            modal.classList.add('active');
            this.resetCourseworkForm();
            this.updateCourseworkList();

            // Focus on student search
            setTimeout(() => {
                const studentSearch = document.getElementById('courseworkStudentSearch');
                if (studentSearch) studentSearch.focus();
            }, 100);
        }
    }

    openMyCourseworksModal() {
        this.closeAllModals();
        const modal = document.getElementById('courseworkMyCourseworksModal');
        if (modal) {
            modal.classList.add('active');
            this.loadMyCourseworks();
        }
    }

    openViewAnswersModal() {
        this.closeAllModals();
        const modal = document.getElementById('courseworkViewAnswersModal');
        if (modal) {
            modal.classList.add('active');
            this.loadStudentAnswers();
        }
    }

    // ========== COURSEWORK CREATION ==========

    resetCourseworkForm() {
        // Clear form fields
        document.getElementById('courseworkCourseName').value = '';
        document.getElementById('courseworkType').value = '';
        document.getElementById('courseworkTime').value = '20';
        document.getElementById('courseworkDays').value = '';

        // Clear selected student
        this.selectedStudentId = null;
        document.getElementById('courseworkSelectedStudent').innerHTML = '';

        // Clear questions
        document.getElementById('courseworkQuestionsContainer').innerHTML = '';
        this.questionEditors = {};

        this.currentCoursework = null;
    }

    setupStudentSearch() {
        const searchInput = document.getElementById('courseworkStudentSearch');
        const resultsDiv = document.getElementById('courseworkStudentSearchResults');

        if (!searchInput || !resultsDiv) return;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();

            if (query.length === 0) {
                resultsDiv.classList.add('hidden');
                return;
            }

            const filtered = this.students.filter(s =>
                s.name.toLowerCase().includes(query)
            );

            if (filtered.length === 0) {
                resultsDiv.innerHTML = '<div class="coursework-dropdown-item">No students found</div>';
                resultsDiv.classList.remove('hidden');
                return;
            }

            resultsDiv.innerHTML = filtered.map(student => `
                <div class="coursework-dropdown-item" onclick="courseworkManager.selectStudent(${student.id})">
                    <img src="${student.profilePic}" alt="${student.name}">
                    <span>${student.name}</span>
                </div>
            `).join('');

            resultsDiv.classList.remove('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.coursework-student-search-wrapper')) {
                resultsDiv.classList.add('hidden');
            }
        });
    }

    selectStudent(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return;

        this.selectedStudentId = studentId;

        const selectedDiv = document.getElementById('courseworkSelectedStudent');
        selectedDiv.innerHTML = `
            <div class="coursework-selected-item">
                <img src="${student.profilePic}" alt="${student.name}">
                <span>${student.name}</span>
                <button class="coursework-selected-item-remove" onclick="courseworkManager.removeStudent()">✕</button>
            </div>
        `;

        // Clear search
        document.getElementById('courseworkStudentSearch').value = '';
        document.getElementById('courseworkStudentSearchResults').classList.add('hidden');
    }

    removeStudent() {
        this.selectedStudentId = null;
        document.getElementById('courseworkSelectedStudent').innerHTML = '';
    }

    addQuestion() {
        const container = document.getElementById('courseworkQuestionsContainer');
        const questionNumber = container.children.length + 1;
        const questionId = `question_${Date.now()}_${questionNumber}`;

        const questionHtml = `
            <div class="coursework-question-item" data-question-id="${questionId}">
                <span class="coursework-question-number">Question ${questionNumber}</span>
                <button class="coursework-question-remove" onclick="courseworkManager.removeQuestion('${questionId}')">✕</button>

                <div class="coursework-form-group">
                    <label class="coursework-form-label">
                        <span>📝</span> Question Text
                    </label>
                    <div id="${questionId}_editor" class="coursework-editor-wrapper"></div>
                </div>

                <div class="coursework-form-group">
                    <label class="coursework-form-label">
                        <span>📊</span> Question Type
                    </label>
                    <select class="coursework-form-select" onchange="courseworkManager.handleQuestionTypeChange('${questionId}', this.value)">
                        <option value="">Select Type</option>
                        <option value="multipleChoice">Multiple Choice</option>
                        <option value="trueFalse">True/False</option>
                        <option value="openEnded">Open Ended</option>
                    </select>
                </div>

                <div id="${questionId}_options" class="coursework-question-options hidden"></div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', questionHtml);

        // Initialize Quill editor for this question
        setTimeout(() => {
            this.initQuestionEditor(questionId);
        }, 100);

        // Update question numbers
        this.updateQuestionNumbers();
    }

    initQuestionEditor(questionId) {
        const editorId = `${questionId}_editor`;
        const container = document.getElementById(editorId);

        if (!container || this.questionEditors[questionId]) return;

        // Create toolbar
        const toolbarId = `${editorId}_toolbar`;
        container.innerHTML = `
            <div id="${toolbarId}"></div>
            <div id="${editorId}_container"></div>
        `;

        const quill = new Quill(`#${editorId}_container`, {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: `#${toolbarId}`,
                    handlers: {}
                }
            },
            placeholder: 'Enter your question here...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            }
        });

        this.questionEditors[questionId] = quill;
    }

    handleQuestionTypeChange(questionId, type) {
        const optionsDiv = document.getElementById(`${questionId}_options`);

        if (!type) {
            optionsDiv.classList.add('hidden');
            return;
        }

        optionsDiv.classList.remove('hidden');

        if (type === 'multipleChoice') {
            optionsDiv.innerHTML = `
                <div class="coursework-form-group">
                    <label class="coursework-form-label">
                        <span>✓</span> Multiple Choice Options
                    </label>
                    <div class="space-y-2">
                        <input type="text" class="coursework-form-input" placeholder="Option A" data-option="A">
                        <input type="text" class="coursework-form-input" placeholder="Option B" data-option="B">
                        <input type="text" class="coursework-form-input" placeholder="Option C" data-option="C">
                        <input type="text" class="coursework-form-input" placeholder="Option D" data-option="D">
                    </div>
                </div>
                <div class="coursework-form-group">
                    <label class="coursework-form-label">
                        <span>✅</span> Correct Answer
                    </label>
                    <select class="coursework-form-select" data-correct-answer>
                        <option value="">Select correct answer</option>
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                    </select>
                </div>
            `;
        } else if (type === 'trueFalse') {
            optionsDiv.innerHTML = `
                <div class="coursework-form-group">
                    <label class="coursework-form-label">
                        <span>✅</span> Correct Answer
                    </label>
                    <select class="coursework-form-select" data-correct-answer>
                        <option value="">Select correct answer</option>
                        <option value="true">True</option>
                        <option value="false">False</option>
                    </select>
                </div>
            `;
        } else if (type === 'openEnded') {
            optionsDiv.innerHTML = `
                <div class="coursework-form-group">
                    <label class="coursework-form-label">
                        <span>📝</span> Sample Answer (Optional)
                    </label>
                    <div id="${questionId}_answer_editor" class="coursework-editor-wrapper"></div>
                </div>
            `;

            // Initialize rich text editor for answer
            setTimeout(() => {
                this.initAnswerEditor(`${questionId}_answer`);
            }, 100);
        }
    }

    initAnswerEditor(editorId) {
        const container = document.getElementById(`${editorId}_editor`);

        if (!container || this.answerEditors[editorId]) return;

        const toolbarId = `${editorId}_toolbar`;
        container.innerHTML = `
            <div id="${toolbarId}"></div>
            <div id="${editorId}_container"></div>
        `;

        const quill = new Quill(`#${editorId}_container`, {
            theme: 'snow',
            placeholder: 'Enter sample answer...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            }
        });

        this.answerEditors[editorId] = quill;
    }

    removeQuestion(questionId) {
        const questionItem = document.querySelector(`[data-question-id="${questionId}"]`);
        if (questionItem) {
            // Cleanup editors
            if (this.questionEditors[questionId]) {
                delete this.questionEditors[questionId];
            }

            questionItem.remove();
            this.updateQuestionNumbers();
        }
    }

    updateQuestionNumbers() {
        const questions = document.querySelectorAll('.coursework-question-item');
        questions.forEach((q, index) => {
            const numberSpan = q.querySelector('.coursework-question-number');
            if (numberSpan) {
                numberSpan.textContent = `Question ${index + 1}`;
            }
        });
    }

    // ========== COURSEWORK SAVING ==========

    validateCourseworkForm() {
        if (!this.selectedStudentId) {
            this.showToast('Please select a student', 'error');
            return false;
        }

        const courseName = document.getElementById('courseworkCourseName').value.trim();
        if (!courseName) {
            this.showToast('Please enter course name', 'error');
            return false;
        }

        const quizType = document.getElementById('courseworkType').value;
        if (!quizType) {
            this.showToast('Please select courseworktype', 'error');
            return false;
        }

        const quizTime = document.getElementById('courseworkTime').value;
        if (!quizTime || quizTime < 1) {
            this.showToast('Please enter valid time limit', 'error');
            return false;
        }

        const quizDays = document.getElementById('courseworkDays').value;
        if (!quizDays || quizDays < 1) {
            this.showToast('Please enter days to complete', 'error');
            return false;
        }

        const questions = document.querySelectorAll('.coursework-question-item');
        if (questions.length === 0) {
            this.showToast('Please add at least one question', 'error');
            return false;
        }

        return true;
    }

    collectCourseworkData() {
        const courseName = document.getElementById('courseworkCourseName').value.trim();
        const quizType = document.getElementById('courseworkType').value;
        const quizTime = parseInt(document.getElementById('courseworkTime').value);
        const quizDays = parseInt(document.getElementById('courseworkDays').value);

        const questions = [];
        const questionItems = document.querySelectorAll('.coursework-question-item');

        questionItems.forEach(item => {
            const questionId = item.getAttribute('data-question-id');
            const quillEditor = this.questionEditors[questionId];
            const questionText = quillEditor ? quillEditor.root.innerHTML : '';

            const typeSelect = item.querySelector('.coursework-form-select');
            const questionType = typeSelect ? typeSelect.value : '';

            const question = {
                text: questionText,
                type: questionType,
                points: 1
            };

            // Get options and correct answer based on type
            if (questionType === 'multipleChoice') {
                const options = item.querySelectorAll('[data-option]');
                question.choices = Array.from(options).map(o => o.value.trim()).filter(v => v);

                const correctAnswer = item.querySelector('[data-correct-answer]');
                question.correctAnswer = correctAnswer ? correctAnswer.value : '';
            } else if (questionType === 'trueFalse') {
                const correctAnswer = item.querySelector('[data-correct-answer]');
                question.correctAnswer = correctAnswer ? correctAnswer.value : '';
            } else if (questionType === 'openEnded') {
                const answerEditor = this.answerEditors[`${questionId}_answer`];
                question.sampleAnswer = answerEditor ? answerEditor.root.innerHTML : '';
            }

            questions.push(question);
        });

        return {
            studentId: this.selectedStudentId,
            courseName,
            quizType,
            quizTime,
            quizDays,
            questions
        };
    }

    async saveCoursework() {
        if (!this.validateCourseworkForm()) return;

        const quizData = this.collectCourseworkData();

        try {
            let response;
            if (this.currentCoursework&& this.currentCoursework.id) {
                // Update existing coursework
                response = await this.apiRequest(`/api/coursework/${this.currentCoursework.id}`, 'PUT', {
                    course_name: quizData.courseName,
                    quiz_type: quizData.quizType,
                    time_limit: quizData.quizTime,
                    days_to_complete: quizData.quizDays,
                    questions: quizData.questions,
                    status: 'draft'
                });
            } else {
                // Create new coursework
                response = await this.apiRequest('/api/coursework/create', 'POST', {
                    student_id: quizData.studentId,
                    course_name: quizData.courseName,
                    quiz_type: quizData.quizType,
                    time_limit: quizData.quizTime,
                    days_to_complete: quizData.quizDays,
                    questions: quizData.questions,
                    status: 'draft'
                });
            }

            this.showToast('Courseworksaved successfully!', 'success');
            await this.loadCourseworksFromAPI();
            this.updateCourseworkList();

            // Clear the form after saving
            this.resetCourseworkForm();
        } catch (error) {
            this.showToast('Error saving coursework: ' + error.message, 'error');
        }
    }

    async postCoursework() {
        if (!this.validateCourseworkForm()) return;

        const quizData = this.collectCourseworkData();

        try {
            let response;
            if (this.currentCoursework&& this.currentCoursework.id) {
                // Update existing courseworkand post it
                response = await this.apiRequest(`/api/coursework/${this.currentCoursework.id}`, 'PUT', {
                    course_name: quizData.courseName,
                    quiz_type: quizData.quizType,
                    time_limit: quizData.quizTime,
                    days_to_complete: quizData.quizDays,
                    questions: quizData.questions,
                    status: 'posted'
                });
            } else {
                // Create new courseworkand post it
                response = await this.apiRequest('/api/coursework/create', 'POST', {
                    student_id: quizData.studentId,
                    course_name: quizData.courseName,
                    quiz_type: quizData.quizType,
                    time_limit: quizData.quizTime,
                    days_to_complete: quizData.quizDays,
                    questions: quizData.questions,
                    status: 'posted'
                });
            }

            this.showToast('Courseworkposted successfully!', 'success');
            await this.loadCourseworksFromAPI();

            // Clear the form after posting
            this.resetCourseworkForm();

            this.closeAllModals();
            this.updateNotifications();
        } catch (error) {
            this.showToast('Error posting coursework: ' + error.message, 'error');
        }
    }

    // ========== STORAGE ==========

    async loadCourseworksFromAPI() {
        try {
            const response = await this.apiRequest('/api/coursework/tutor/list');
            if (response.success) {
                this.courseworks = response.courseworks || [];
            }
        } catch (error) {
            console.error('Error loading courseworks from API:', error);
            // Fallback to localStorage for offline support
            this.loadCourseworksFromStorage();
        }
    }

    saveCourseworksToStorage() {
        try {
            localStorage.setItem('tutorCourseworks', JSON.stringify(this.courseworks));
        } catch (e) {
            console.error('Error saving courseworks:', e);
        }
    }

    loadCourseworksFromStorage() {
        try {
            const stored = localStorage.getItem('tutorCourseworks');
            if (stored) {
                this.courseworks = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error loading courseworks:', e);
            this.courseworks = [];
        }
    }

    // ========== UI UPDATES ==========

    updateCourseworkList() {
        const listContainer = document.getElementById('courseworkTutorList');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (this.courseworks.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No courseworks yet</p>';
            return;
        }

        this.courseworks.forEach(coursework => {
            const student = this.students.find(s => s.id === coursework.studentId);
            const studentName = student ? student.name : 'Unknown';

            const quizItem = document.createElement('div');
            quizItem.className = 'p-3 hover:bg-gray-100 cursor-pointer rounded transition';
            quizItem.innerHTML = `
                <div class="font-semibold">${coursework.courseName}</div>
                <div class="text-sm text-gray-600">${studentName} • ${coursework.quizType}</div>
                <div class="text-xs text-gray-500">${coursework.status === 'posted' ? 'Posted' : 'Draft'}</div>
            `;

            quizItem.addEventListener('click', () => {
                this.viewCourseworkDetails(coursework.id);
            });

            listContainer.appendChild(quizItem);
        });
    }

    viewCourseworkDetails(quizId) {
        const coursework= this.courseworks.find(q => q.id === quizId);
        if (!coursework) return;

        this.currentCoursework= coursework;
        this.openViewCourseworkDetailsModal();
    }

    openViewCourseworkDetailsModal() {
        if (!this.currentCoursework) return;

        this.closeAllModals();
        const modal = document.getElementById('courseworkViewDetailsModal');
        if (!modal) return;

        modal.classList.add('active');
        this.renderCourseworkDetails();
    }

    renderCourseworkDetails() {
        const detailsContainer = document.getElementById('courseworkDetailsContent');
        if (!detailsContainer) return;

        const coursework= this.currentCoursework;
        const student = this.students.find(s => s.id === coursework.studentId);
        const studentName = student ? student.name : 'Unknown Student';

        const dueDate = new Date(coursework.dueDate);
        const dueDateStr = dueDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let detailsHTML = `
            <div class="coursework-details-header">
                <div class="coursework-detail-row">
                    <div class="coursework-detail-student">
                        <div class="coursework-detail-label-subheader">Student</div>
                        <div class="coursework-detail-value-large">👤 ${studentName}</div>
                    </div>
                </div>

                <div class="coursework-detail-row">
                    <div class="coursework-detail-course">
                        <div class="coursework-detail-label-subheader">Course</div>
                        <div class="coursework-detail-value-large">📖 ${coursework.courseName}</div>
                    </div>
                </div>

                <div class="coursework-detail-row coursework-detail-row-multi">
                    <div class="coursework-detail-item-compact">
                        <span class="coursework-detail-label">📊 CourseworkType:</span>
                        <span class="coursework-detail-value">${coursework.quizType}</span>
                    </div>
                    <div class="coursework-detail-item-compact">
                        <span class="coursework-detail-label">⏱️ Time Limit:</span>
                        <span class="coursework-detail-value">${coursework.quizTime} min</span>
                    </div>
                    <div class="coursework-detail-item-compact">
                        <span class="coursework-detail-label">📅 Due Date:</span>
                        <span class="coursework-detail-value">${dueDateStr}</span>
                    </div>
                </div>

                <div class="coursework-detail-row">
                    <div class="coursework-detail-item-compact">
                        <span class="coursework-detail-label">📌 Status:</span>
                        <span class="coursework-status-badge ${coursework.status === 'posted' ? 'status-posted' : 'status-draft'}">
                            ${coursework.status === 'posted' ? '✓ Posted' : '📝 Draft'}
                        </span>
                    </div>
                </div>
            </div>

            <div class="coursework-questions-preview">
                <h3 class="coursework-section-title">Questions (${coursework.questions.length})</h3>
        `;

        coursework.questions.forEach((q, index) => {
            detailsHTML += `
                <div class="coursework-question-preview">
                    <div class="coursework-question-header">
                        <span class="coursework-question-number">Question ${index + 1}</span>
                        <span class="coursework-question-type-badge">${this.formatQuestionType(q.type)}</span>
                    </div>
                    <div class="coursework-question-text">${q.text}</div>
            `;

            if (q.type === 'multipleChoice' && q.choices) {
                detailsHTML += '<div class="coursework-choices">';
                q.choices.forEach((choice, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const isCorrect = q.correctAnswer === letter;
                    detailsHTML += `
                        <div class="coursework-choice ${isCorrect ? 'correct-choice' : ''}">
                            <span class="choice-letter">${letter}.</span>
                            <span>${choice}</span>
                            ${isCorrect ? '<span class="correct-indicator">✓</span>' : ''}
                        </div>
                    `;
                });
                detailsHTML += '</div>';
            } else if (q.type === 'trueFalse') {
                detailsHTML += `
                    <div class="coursework-answer">
                        <strong>Correct Answer:</strong>
                        <span class="correct-answer">${q.correctAnswer === 'true' ? 'True' : 'False'}</span>
                    </div>
                `;
            } else if (q.type === 'openEnded' && q.sampleAnswer) {
                detailsHTML += `
                    <div class="coursework-answer">
                        <strong>Sample Answer:</strong>
                        <div class="sample-answer">${q.sampleAnswer}</div>
                    </div>
                `;
            }

            detailsHTML += '</div>';
        });

        detailsHTML += '</div>';

        detailsContainer.innerHTML = detailsHTML;

        // Update buttons visibility
        const postBtn = document.getElementById('courseworkPostFromViewBtn');
        const editBtn = document.getElementById('courseworkEditBtn');
        const deleteBtn = document.getElementById('courseworkDeleteBtn');

        if (postBtn) {
            postBtn.style.display = coursework.status === 'posted' ? 'none' : 'inline-flex';
        }
    }

    formatQuestionType(type) {
        const types = {
            'multipleChoice': 'Multiple Choice',
            'trueFalse': 'True/False',
            'openEnded': 'Open Ended'
        };
        return types[type] || type;
    }

    editCurrentCoursework() {
        if (!this.currentCoursework) return;

        // Close view modal and open edit modal
        this.closeAllModals();
        this.loadCourseworkForEditing(this.currentCoursework);
        this.openGiveCourseworkModal();
    }

    loadCourseworkForEditing(coursework) {
        // Populate form with courseworkdata
        document.getElementById('courseworkCourseName').value = coursework.courseName;
        document.getElementById('courseworkType').value = coursework.quizType;
        document.getElementById('courseworkTime').value = coursework.quizTime;
        document.getElementById('courseworkDays').value = coursework.quizDays;

        // Select student
        this.selectedStudentId = coursework.studentId;
        const student = this.students.find(s => s.id === coursework.studentId);
        if (student) {
            const selectedDiv = document.getElementById('courseworkSelectedStudent');
            selectedDiv.innerHTML = `
                <div class="coursework-selected-item">
                    <img src="${student.profilePic}" alt="${student.name}">
                    <span>${student.name}</span>
                    <button class="coursework-selected-item-remove" onclick="courseworkManager.removeStudent()">✕</button>
                </div>
            `;
        }

        // Clear and rebuild questions
        const container = document.getElementById('courseworkQuestionsContainer');
        container.innerHTML = '';
        this.questionEditors = {};
        this.answerEditors = {};

        coursework.questions.forEach((question, index) => {
            this.addQuestion();

            // Wait for editor to initialize, then populate
            setTimeout(() => {
                const questionItems = document.querySelectorAll('.coursework-question-item');
                const questionItem = questionItems[index];
                if (!questionItem) return;

                const questionId = questionItem.getAttribute('data-question-id');

                // Set question text in Quill editor
                const quillEditor = this.questionEditors[questionId];
                if (quillEditor) {
                    quillEditor.root.innerHTML = question.text;
                }

                // Set question type
                const typeSelect = questionItem.querySelector('.coursework-form-select');
                if (typeSelect) {
                    typeSelect.value = question.type;
                    this.handleQuestionTypeChange(questionId, question.type);

                    // Wait for options to render
                    setTimeout(() => {
                        if (question.type === 'multipleChoice') {
                            const options = questionItem.querySelectorAll('[data-option]');
                            question.choices.forEach((choice, i) => {
                                if (options[i]) options[i].value = choice;
                            });
                            const correctAnswer = questionItem.querySelector('[data-correct-answer]');
                            if (correctAnswer) correctAnswer.value = question.correctAnswer;
                        } else if (question.type === 'trueFalse') {
                            const correctAnswer = questionItem.querySelector('[data-correct-answer]');
                            if (correctAnswer) correctAnswer.value = question.correctAnswer;
                        } else if (question.type === 'openEnded' && question.sampleAnswer) {
                            const answerEditor = this.answerEditors[`${questionId}_answer`];
                            if (answerEditor) {
                                answerEditor.root.innerHTML = question.sampleAnswer;
                            }
                        }
                    }, 200);
                }
            }, 100 * (index + 1));
        });
    }

    async deleteCurrentCoursework() {
        if (!this.currentCoursework) return;

        if (!confirm('Are you sure you want to delete this coursework? This action cannot be undone.')) {
            return;
        }

        try {
            await this.apiRequest(`/api/coursework/${this.currentCoursework.id}`, 'DELETE');
            this.showToast('Courseworkdeleted successfully!', 'success');
            await this.loadCourseworksFromAPI();
            this.closeAllModals();
            this.currentCoursework = null;
        } catch (error) {
            this.showToast('Error deleting coursework: ' + error.message, 'error');
        }
    }

    async postCurrentCoursework() {
        if (!this.currentCoursework) return;

        const student = this.students.find(s => s.id === this.currentCoursework.student_id || s.id === this.currentCoursework.studentId);
        const studentName = student ? student.name : 'Unknown Student';

        if (!confirm(`Are you sure you want to post this courseworkto ${studentName}?`)) {
            return;
        }

        try {
            await this.apiRequest(`/api/coursework/${this.currentCoursework.id}`, 'PUT', {
                status: 'posted'
            });
            this.showToast('Courseworkposted successfully!', 'success');
            await this.loadCourseworksFromAPI();
            this.closeAllModals();
            this.updateNotifications();
        } catch (error) {
            this.showToast('Error posting coursework: ' + error.message, 'error');
        }
    }

    loadMyCourseworks() {
        // This would load courseworks for the current student
        // For now, show sample data
        const tableBody = document.getElementById('courseworkMyTableBody');
        if (!tableBody) return;

        // Filter courseworks assigned to current user (assuming student ID = 1)
        const myCourseworks = this.courseworks.filter(q => q.studentId === 1 && q.status === 'posted');

        if (myCourseworks.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-8">No courseworks assigned yet</td></tr>';
            return;
        }

        tableBody.innerHTML = myCourseworks.map(coursework => {
            const dueDate = new Date(coursework.dueDate);
            const dueDateStr = dueDate.toLocaleDateString();
            const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));

            return `
                <tr>
                    <td>${coursework.courseName}</td>
                    <td>${coursework.quizType}</td>
                    <td>-</td>
                    <td>${coursework.quizTime} min</td>
                    <td>${dueDateStr} (${daysLeft > 0 ? daysLeft + ' days left' : 'Due today'})</td>
                    <td>
                        <button class="coursework-btn coursework-btn-edit" onclick="courseworkManager.takeCoursework('${coursework.id}')">
                            <span>📝</span> Take Coursework
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    takeCoursework(quizId) {
        this.showToast('Courseworktaking feature coming in Phase 2!', 'info');
    }

    loadStudentAnswers() {
        // This would load student submissions
        // For now, create sample data
        const tableBody = document.getElementById('courseworkAnswerTableBody');
        if (!tableBody) return;

        // Sample: Show submitted courseworks with mock data
        const submittedCourseworks = this.courseworks.filter(q => q.status === 'posted').slice(0, 3);

        if (submittedCourseworks.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500 py-8">No answers submitted yet</td></tr>';
            return;
        }

        tableBody.innerHTML = submittedCourseworks.map((coursework, index) => {
            const student = this.students.find(s => s.id === coursework.studentId);
            const studentName = student ? student.name : 'Unknown';
            const dueDate = new Date(coursework.dueDate);
            const dueDateStr = dueDate.toLocaleDateString();
            const statuses = ['Submitted', 'Not Submitted', 'In Progress'];
            const status = statuses[index % statuses.length];

            return `
                <tr>
                    <td>${coursework.courseName}</td>
                    <td>${coursework.quizType}</td>
                    <td>${dueDateStr}</td>
                    <td>
                        <span class="coursework-status-badge ${status === 'Submitted' ? 'status-posted' : 'status-draft'}">
                            ${status}
                        </span>
                    </td>
                    <td>
                        ${status === 'Submitted' ? `
                            <button class="coursework-btn coursework-btn-edit" onclick="courseworkManager.gradeCoursework('${coursework.id}')">
                                <span>✏️</span> Grade
                            </button>
                        ` : '-'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    gradeCoursework(quizId) {
        const coursework= this.courseworks.find(q => q.id === quizId);
        if (!coursework) return;

        this.currentCoursework= coursework;
        this.openGradingModal();
    }

    openGradingModal() {
        this.closeAllModals();
        const modal = document.getElementById('courseworkGradingModal');
        if (!modal) {
            // Create modal dynamically if it doesn't exist
            this.createGradingModal();
            return;
        }

        modal.classList.add('active');
        this.renderGradingContent();
    }

    createGradingModal() {
        // This would be added to HTML, for now show toast
        this.showToast('Grading interface coming in Phase 2!', 'info');
    }

    renderGradingContent() {
        const container = document.getElementById('courseworkGradingContent');
        if (!container) return;

        const coursework= this.currentCoursework;
        const student = this.students.find(s => s.id === coursework.studentId);

        let html = `
            <div class="grading-header">
                <h3>${student ? student.name : 'Unknown'}'s Answers</h3>
                <p>Course: ${coursework.courseName}</p>
            </div>
            <div class="grading-questions">
        `;

        coursework.questions.forEach((q, index) => {
            // Mock student answer
            const studentAnswer = this.getMockStudentAnswer(q);

            html += `
                <div class="grading-question-item">
                    <div class="coursework-question-header">
                        <span class="coursework-question-number">Question ${index + 1}</span>
                    </div>
                    <div class="coursework-question-text">${q.text}</div>
                    <div class="student-answer-section">
                        <strong>Student's Answer:</strong>
                        <div class="student-answer">${studentAnswer}</div>
                    </div>
                    ${q.type !== 'openEnded' ? `
                        <div class="correct-answer-section">
                            <strong>Correct Answer:</strong>
                            <div class="correct-answer">${this.getCorrectAnswerDisplay(q)}</div>
                        </div>
                    ` : ''}
                    <div class="marking-buttons">
                        <button class="coursework-mark-correct-btn" onclick="courseworkManager.markAnswer('${q.id}', true)">
                            <span>✓</span> Correct
                        </button>
                        <button class="coursework-mark-wrong-btn" onclick="courseworkManager.markAnswer('${q.id}', false)">
                            <span>✗</span> Wrong
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    getMockStudentAnswer(question) {
        if (question.type === 'multipleChoice') {
            return 'Option C';
        } else if (question.type === 'trueFalse') {
            return 'True';
        } else {
            return '<p>This is a sample student answer for the open-ended question. The student wrote a detailed response explaining their understanding of the topic.</p>';
        }
    }

    getCorrectAnswerDisplay(question) {
        if (question.type === 'multipleChoice') {
            return `Option ${question.correctAnswer}`;
        } else if (question.type === 'trueFalse') {
            return question.correctAnswer === 'true' ? 'True' : 'False';
        }
        return 'N/A';
    }

    markAnswer(questionId, isCorrect) {
        // Store marking in courseworkdata
        if (!this.currentCoursework.grades) {
            this.currentCoursework.grades = {};
        }

        this.currentCoursework.grades[questionId] = isCorrect;

        // Update UI
        const button = event.target.closest('button');
        const container = button.parentElement;
        const correctBtn = container.querySelector('.coursework-mark-correct-btn');
        const wrongBtn = container.querySelector('.coursework-mark-wrong-btn');

        correctBtn.classList.remove('active');
        wrongBtn.classList.remove('active');

        if (isCorrect) {
            correctBtn.classList.add('active');
        } else {
            wrongBtn.classList.add('active');
        }

        this.showToast(`Answer marked as ${isCorrect ? 'correct' : 'wrong'}`, 'success');
    }

    updateNotifications() {
        // Count new/pending items
        const postedCourseworks = this.courseworks.filter(q => q.status === 'posted').length;

        const badge = document.querySelector('.coursework-notification-badge');
        if (badge) {
            if (postedCourseworks > 0) {
                badge.textContent = postedCourseworks;
                badge.classList.add('active');
            } else {
                badge.classList.remove('active');
            }
        }
    }

    // ========== UTILITIES ==========

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('courseworkToast');
        if (!toast) return;

        const icon = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        }[type] || 'ℹ️';

        toast.className = `coursework-toast-notification active ${type}`;
        toast.innerHTML = `
            <span class="coursework-toast-icon">${icon}</span>
            <span class="coursework-toast-message">${message}</span>
        `;

        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }
}

// Initialize CourseworkManager
let courseworkManager;

document.addEventListener('DOMContentLoaded', () => {
    courseworkManager = new CourseworkManager();

    // Setup student search after DOM is ready
    setTimeout(() => {
        if (courseworkManager) {
            courseworkManager.setupStudentSearch();
        }
    }, 500);
});

// Global function for HTML onclick
function openCourseworkMaker() {
    if (courseworkManager) {
        courseworkManager.openMainModal();
    }
}

// ============================================
// STUDENT COURSEWORK MANAGER
// Manages courseworks for specific students
// ============================================

const StudentCourseworkManager = {
    currentStudentId: null,
    courseworks: [],
    currentTab: 'active',

    /**
     * Initialize the manager with a student ID
     */
    init(studentId) {
        this.currentStudentId = studentId;
        console.log('📝 StudentCourseworkManager initialized for student:', studentId);
    },

    /**
     * Switch between coursework tabs
     */
    switchTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('.coursework-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Load courseworks for the selected tab
        this.loadCourseworks(tab);
    },

    /**
     * Load courseworks for the current student from courseworkManager
     */
    async loadCourseworks(status = 'active') {
        const container = document.getElementById('student-courseworks');
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p>Loading courseworks...</p>
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

            // Check if courseworkManager exists
            if (typeof courseworkManager === 'undefined') {
                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-yellow-500">
                        <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                        <p>courseworkManager not loaded</p>
                        <p class="text-sm mt-2">Please ensure coursework-manager.js is included</p>
                    </div>
                `;
                return;
            }

            // Get all courseworks from courseworkManager
            let allCourseworks = courseworkManager.courseworks || [];

            // Filter courseworks for this specific student by status
            let studentCourseworks = allCourseworks.filter(coursework => {
                const matchesStudent = coursework.studentId === this.currentStudentId ||
                                      coursework.student_id === this.currentStudentId ||
                                      (Array.isArray(coursework.students) && coursework.students.includes(this.currentStudentId));

                // Filter by status/tab
                if (status === 'active') {
                    return matchesStudent && !coursework.posted && !coursework.isCompleted;
                } else if (status === 'completed') {
                    return matchesStudent && coursework.isCompleted;
                } else if (status === 'draft') {
                    return matchesStudent && !coursework.posted && !coursework.isCompleted;
                }
                return matchesStudent;
            });

            this.courseworks = studentCourseworks;

            if (studentCourseworks.length === 0) {
                const emptyMessages = {
                    'active': 'No active courseworks',
                    'completed': 'No completed courseworks',
                    'draft': 'No draft courseworks'
                };

                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-gray-500">
                        <i class="fas fa-clipboard-list text-3xl mb-3"></i>
                        <p>${emptyMessages[status]}</p>
                        <p class="text-sm mt-2">Create a new coursework to get started</p>
                    </div>
                `;
                return;
            }

            // Render coursework cards
            container.innerHTML = studentCourseworks.map(coursework => this.renderCourseworkCard(coursework)).join('');

        } catch (error) {
            console.error('Error loading courseworks:', error);
            container.innerHTML = `
                <div class="col-span-full card p-6 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                    <p>Failed to load courseworks</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Render a coursework card
     */
    renderCourseworkCard(coursework) {
        const statusColors = {
            'active': 'bg-green-100 text-green-800',
            'completed': 'bg-blue-100 text-blue-800',
            'draft': 'bg-yellow-100 text-yellow-800',
            'expired': 'bg-gray-100 text-gray-800'
        };

        const statusIcons = {
            'active': '▶️',
            'completed': '✅',
            'draft': '📝',
            'expired': '⏰'
        };

        const createdDate = new Date(coursework.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const dueDate = coursework.due_date ? new Date(coursework.due_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : 'No deadline';

        const statusClass = statusColors[coursework.status] || 'bg-gray-100 text-gray-800';
        const statusIcon = statusIcons[coursework.status] || '📝';

        const score = coursework.score !== null ? `${coursework.score}/${coursework.total_points}` : 'Not graded';

        return `
            <div class="card p-4 hover:shadow-lg transition">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-bold text-lg">${coursework.title}</h4>
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${statusClass}">
                        ${statusIcon} ${coursework.status}
                    </span>
                </div>

                <div class="space-y-2 mb-4">
                    <div class="flex items-center gap-2 text-sm">
                        <i class="fas fa-book text-gray-500"></i>
                        <span style="color: var(--text-secondary);">${coursework.subject || 'General'}</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm">
                        <i class="fas fa-question-circle text-gray-500"></i>
                        <span style="color: var(--text-secondary);">
                            ${coursework.question_count || 0} question${coursework.question_count !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div class="flex items-center gap-2 text-sm">
                        <i class="fas fa-calendar text-gray-500"></i>
                        <span style="color: var(--text-secondary);">Due: ${dueDate}</span>
                    </div>
                    ${coursework.status === 'completed' ? `
                        <div class="flex items-center gap-2 text-sm">
                            <i class="fas fa-trophy text-yellow-500"></i>
                            <span class="font-medium" style="color: var(--primary-color);">Score: ${score}</span>
                        </div>
                    ` : ''}
                    ${coursework.description ? `
                        <div class="text-sm text-gray-600 mt-2">
                            ${coursework.description}
                        </div>
                    ` : ''}
                </div>

                <div class="flex gap-2">
                    ${coursework.status === 'active' ? `
                        <button
                            onclick="StudentCourseworkManager.assignCoursework(${coursework.id})"
                            class="flex-1 btn-primary"
                            style="padding: 8px; font-size: 0.875rem;">
                            <i class="fas fa-paper-plane"></i> Assign
                        </button>
                    ` : coursework.status === 'completed' ? `
                        <button
                            onclick="StudentCourseworkManager.viewResults(${coursework.id})"
                            class="flex-1 btn-secondary"
                            style="padding: 8px; font-size: 0.875rem;">
                            <i class="fas fa-chart-bar"></i> View Results
                        </button>
                    ` : `
                        <button
                            onclick="StudentCourseworkManager.editCoursework(${coursework.id})"
                            class="flex-1 btn-secondary"
                            style="padding: 8px; font-size: 0.875rem;">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    `}
                    <button
                        onclick="StudentCourseworkManager.deleteCoursework(${coursework.id})"
                        class="btn-secondary"
                        style="padding: 8px; font-size: 0.875rem;"
                        title="Delete coursework">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Create a new coursework - Opens courseworkManager modal with student pre-selected
     */
    createNewCoursework() {
        if (!this.currentStudentId) {
            alert('❌ No student selected');
            return;
        }

        // Check if courseworkManager exists (from coursework-manager.js)
        if (typeof courseworkManager !== 'undefined') {
            // Pre-select this student in the coursework manager
            courseworkManager.selectedStudentId = this.currentStudentId;

            // Open the Give Coursework modal
            courseworkManager.openGiveCourseworkModal();

            // Pre-populate the student search with the student's name (if available)
            setTimeout(() => {
                const student = courseworkManager.students?.find(s => s.id === this.currentStudentId);
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
            alert('❌ courseworkManager not loaded. Please ensure coursework-manager.js is included.');
        }
    },

    /**
     * Edit an existing coursework - Opens courseworkManager edit modal
     */
    editCoursework(courseworkId) {
        if (typeof courseworkManager !== 'undefined') {
            const coursework = courseworkManager.courseworks.find(q => q.id === courseworkId);
            if (coursework) {
                courseworkManager.loadCourseworkForEditing(coursework);
            }
        } else {
            alert('❌ courseworkManager not loaded');
        }
    },

    /**
     * Assign/Post coursework to student
     */
    async assignCoursework(courseworkId) {
        if (typeof courseworkManager !== 'undefined') {
            const coursework = courseworkManager.courseworks.find(q => q.id === courseworkId);
            if (coursework) {
                if (confirm(`Post "${coursework.courseName}" coursework to the student?`)) {
                    try {
                        await courseworkManager.postCoursework(courseworkId);
                        this.loadCourseworks(this.currentTab); // Reload
                    } catch (error) {
                        console.error('Error posting coursework:', error);
                    }
                }
            }
        } else {
            alert('❌ courseworkManager not loaded');
        }
    },

    /**
     * View coursework results - Opens courseworkManager view answers modal
     */
    viewResults(courseworkId = null) {
        if (typeof courseworkManager !== 'undefined') {
            // Open the View Answers modal
            courseworkManager.openViewAnswersModal();

            // If specific coursework ID provided, filter to that coursework
            if (courseworkId) {
                setTimeout(() => {
                    // Filter the answers view to this student
                    console.log('Viewing results for coursework:', courseworkId, 'student:', this.currentStudentId);
                }, 100);
            }
        } else {
            alert('❌ courseworkManager not loaded');
        }
    },

    /**
     * Delete a coursework - Delegates to courseworkManager
     */
    async deleteCoursework(courseworkId) {
        if (typeof courseworkManager !== 'undefined') {
            const coursework = courseworkManager.courseworks.find(q => q.id === courseworkId);
            if (coursework && confirm(`Delete coursework "${coursework.courseName}"?`)) {
                try {
                    await courseworkManager.deleteCoursework(courseworkId);
                    this.loadCourseworks(this.currentTab); // Reload
                } catch (error) {
                    console.error('Error deleting coursework:', error);
                }
            }
        } else {
            alert('❌ courseworkManager not loaded');
        }
    }
};

// Export to window
window.StudentCourseworkManager = StudentCourseworkManager;
