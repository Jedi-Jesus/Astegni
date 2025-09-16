// Sample data
const students = [
    { id: 1, name: "Alice Smith", profilePic: "https://via.placeholder.com/40" },
    { id: 2, name: "Bob Johnson", profilePic: "https://via.placeholder.com/40" }
];
const tutors = [
    { id: 1, name: "Dr. Lee", profilePic: "https://via.placeholder.com/40" },
    { id: 2, name: "Prof. Kim", profilePic: "https://via.placeholder.com/40" }
];
let quizzes = [];
let currentQuiz = null;
let currentQuestionIndex = 0;
let studentAnswers = [];
let timerInterval;
let selectedTutorId = null;
let selectedStudentId = null;
let savedQuizProgress = {};
let tempQuiz = null; // Store quiz temporarily for save-to-post flow

// Sanitize HTML to prevent XSS
function sanitizeHTML(html) {
    const allowedTags = ['p', 'b', 'i', 'u', 'ul', 'ol', 'li'];
    const div = document.createElement('div');
    div.innerHTML = html;
    const walker = document.createTreeWalker(div, NodeFilter.SHOW_ELEMENT, {
        acceptNode: node => allowedTags.includes(node.tagName.toLowerCase()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    while (walker.nextNode()) {
        const node = walker.currentNode;
        Array.from(node.attributes).forEach(attr => node.removeAttribute(attr.name));
    }
    return div.innerHTML;
}

// Generate UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Calculate days left until due date
function calculateDaysLeft(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diffInMs = due - now;
    const daysLeft = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'Due today';
}

// Initialize toolbar buttons
function initializeToolbar(toolbarId) {
    const toolbar = document.getElementById(toolbarId);
    if (!toolbar) return;
    const buttons = {
        'boldBtn': 'bold',
        'italicBtn': 'italic',
        'underlineBtn': 'underline',
        'bulletListBtn': 'insertUnorderedList',
        'numberListBtn': 'insertOrderedList'
    };
    Object.entries(buttons).forEach(([btnId, command]) => {
        const button = toolbar.querySelector(`#${btnId}`);
        if (button) {
            button.removeEventListener('click', handleToolbarClick);
            button.addEventListener('click', handleToolbarClick);
            button.removeEventListener('keydown', handleToolbarKeydown);
            button.addEventListener('keydown', handleToolbarKeydown);
        }
    });
}

function handleToolbarClick(e) {
    const command = e.target.dataset.command;
    if (command) {
        document.execCommand(command, false, null);
        document.activeElement.focus();
    }
}

function handleToolbarKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const command = e.target.dataset.command;
        if (command) {
            document.execCommand(command, false, null);
            document.activeElement.focus();
        }
    }
}

// Tutor: Give a Quiz
document.getElementById('giveQuizBtn').addEventListener('click', () => {
    document.getElementById('giveQuizModal').style.display = 'flex';
    updateTutorQuizList();
    document.getElementById('studentSearch').focus();
    initializeToolbar('questionToolbar');
});

// Tutor Quiz Search
document.getElementById('tutorQuizSearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const resultsDiv = document.getElementById('tutorQuizSearchResults');
    resultsDiv.innerHTML = '';
    if (query) {
        resultsDiv.classList.remove('hidden');
        const tutorId = 1; // Assume logged-in tutor
        const filtered = quizzes.filter(q => q.tutorId == tutorId && q.courseName.toLowerCase().includes(query));
        filtered.forEach(quiz => {
            const div = document.createElement('div');
            div.className = 'p-2 hover:bg-gray-200 cursor-pointer';
            div.tabIndex = 0;
            div.innerHTML = `${quiz.courseName} (${quiz.quizType})`;
            div.addEventListener('click', () => {
                currentQuiz = quiz;
                viewQuiz();
                resultsDiv.classList.add('hidden');
                document.getElementById('tutorQuizSearch').value = '';
            });
            div.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    currentQuiz = quiz;
                    viewQuiz();
                    resultsDiv.classList.add('hidden');
                    document.getElementById('tutorQuizSearch').value = '';
                }
            });
            resultsDiv.appendChild(div);
        });
    } else {
        resultsDiv.classList.add('hidden');
    }
});

function updateTutorQuizList() {
    const tutorQuizList = document.getElementById('tutorQuizList');
    tutorQuizList.innerHTML = '';
    const tutorId = 1; // Assume logged-in tutor
    const tutorQuizzes = quizzes.filter(q => q.tutorId == tutorId);
    tutorQuizzes.forEach(quiz => {
        const hasPending = quiz.status === 'posted' && new Date(quiz.dueDate) >= new Date();
        const div = document.createElement('div');
        div.className = `p-2 flex items-center cursor-pointer hover:bg-gray-200`;
        div.tabIndex = 0;
        div.innerHTML = `
            ${quiz.courseName} (${quiz.quizType})
            <span class="notification-icon ${hasPending ? 'active' : ''}"></span>
        `;
        div.addEventListener('click', () => {
            currentQuiz = quiz;
            viewQuiz();
        });
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                currentQuiz = quiz;
                viewQuiz();
            }
        });
        tutorQuizList.appendChild(div);
    });
    updateNotifications();
}

function viewQuiz() {
    document.getElementById('giveQuizModal').style.display = 'none';
    document.getElementById('viewQuizDetailsModal').style.display = 'flex';
    document.getElementById('editQuizSection').classList.add('hidden');
    document.getElementById('viewQuizDetails').classList.remove('hidden');
    document.getElementById('postQuizFromViewBtn').classList.toggle('hidden', currentQuiz?.status === 'posted');
    const quizDetails = document.getElementById('viewQuizDetails');
    quizDetails.innerHTML = '';
    if (!currentQuiz) {
        quizDetails.innerHTML = `<p class="text-red-500">Error: No quiz selected.</p>`;
        return;
    }
    const student = students.find(s => s.id == currentQuiz.studentId) || { name: 'Unknown Student' };
    quizDetails.innerHTML += `<p><strong>Student:</strong> ${student.name}</p>`;
    quizDetails.innerHTML += `<p><strong>Course:</strong> ${currentQuiz.courseName}</p>`;
    quizDetails.innerHTML += `<p><strong>Quiz Type:</strong> ${currentQuiz.quizType}</p>`;
    quizDetails.innerHTML += `<p><strong>Time to Finish:</strong> ${currentQuiz.quizTime} minutes</p>`;
    quizDetails.innerHTML += `<p><strong>Days to Complete:</strong> ${currentQuiz.quizDays}</p>`;
    quizDetails.innerHTML += `<p><strong>Due Date:</strong> ${new Date(currentQuiz.dueDate).toLocaleDateString()} (${calculateDaysLeft(currentQuiz.dueDate)})</p>`;
    (currentQuiz.questions || []).forEach((q, i) => {
        const correctAnswerText = q.correctAnswers ? (Array.isArray(q.correctAnswers) ? q.correctAnswers.join(', ') : q.correctAnswers) : 'N/A';
        quizDetails.innerHTML += `
            <div class="border p-2 mb-2">
                <p><strong>Question ${i + 1}:</strong> ${q.text}</p>
                <p><strong>Type:</strong> ${q.type === 'openEnded' ? 'Open Ended' : q.type === 'trueFalse' ? 'True/False' : 'Multiple Choice'}</p>
                ${q.choices?.length ? `<p><strong>Choices:</strong> ${q.choices.join(', ')}</p>` : ''}
                <p><strong>Correct Answer:</strong> <span class="answer-content">${correctAnswerText}</span></p>
            </div>
        `;
    });
}

document.getElementById('editQuizBtn').addEventListener('click', () => {
    if (!currentQuiz) return;
    document.getElementById('viewQuizDetails').classList.add('hidden');
    document.getElementById('editQuizSection').classList.remove('hidden');
    document.getElementById('viewQuizButtons').classList.add('hidden');
    document.getElementById('editQuizButtons').classList.remove('hidden');
    const student = students.find(s => s.id == currentQuiz.studentId) || { name: 'Unknown Student', profilePic: 'https://via.placeholder.com/40' };
    document.getElementById('editSelectedStudent').innerHTML = 
        `<div class="flex items-center"><img src="${student.profilePic}" class="profile-pic mr-2"> ${student.name}</div>`;
    document.getElementById('editSelectedStudent').dataset.studentId = student.id;
    document.getElementById('editCourseName').value = currentQuiz.courseName || '';
    document.getElementById('editQuizType').value = currentQuiz.quizType || '';
    document.getElementById('editQuizTime').value = currentQuiz.quizTime || '20';
    document.getElementById('editQuizDays').value = currentQuiz.quizDays || '';
    const questionsContainer = document.getElementById('editQuestionsContainer');
    questionsContainer.innerHTML = '';
    (currentQuiz.questions || []).forEach((q, index) => {
        const questionId = q.id || generateUUID();
        const questionDiv = document.createElement('div');
        questionDiv.className = 'border p-4 mb-4';
        questionDiv.id = `question-${questionId}`;
        questionDiv.innerHTML = `
            <label class="block">Question:</label>
            <input type="text" class="question-text border p-2 w-full mb-2" value="${q.text}" placeholder="Enter question">
            <label class="block">Question Type:</label>
            <select class="question-type border p-2 w-full mb-2">
                <option value="trueFalse" ${q.type === 'trueFalse' ? 'selected' : ''}>True/False</option>
                <option value="multipleChoice" ${q.type === 'multipleChoice' ? 'selected' : ''}>Multiple Choice</option>
                <option value="openEnded" ${q.type === 'openEnded' ? 'selected' : ''}>Open Ended</option>
            </select>
            <div class="choices-container"></div>
            <button class="remove-question bg-red-500 text-white px-2 py-1 rounded mt-2">Remove</button>
        `;
        questionsContainer.appendChild(questionDiv);
        updateEditQuestionType(questionDiv, q);
        questionDiv.querySelector('.question-type').addEventListener('change', () => updateEditQuestionType(questionDiv, q));
        questionDiv.querySelector('.remove-question').addEventListener('click', () => questionDiv.remove());
    });
    initializeToolbar('editQuestionToolbar');
});

function updateEditQuestionType(questionDiv, question) {
    const type = questionDiv.querySelector('.question-type').value;
    const choicesContainer = questionDiv.querySelector('.choices-container');
    const toolbar = document.getElementById('editQuestionToolbar');
    choicesContainer.innerHTML = '';
    if (type === 'trueFalse') {
        toolbar.classList.add('hidden');
        choicesContainer.innerHTML = `
            <label><input type="radio" name="correct-${questionDiv.id}" value="true" ${question.correctAnswers?.includes('true') ? 'checked' : ''} required> True</label>
            <label><input type="radio" name="correct-${questionDiv.id}" value="false" ${question.correctAnswers?.includes('false') ? 'checked' : ''}> False</label>
        `;
        const radios = choicesContainer.querySelectorAll(`input[name="correct-${questionDiv.id}"]`);
        radios.forEach(radio => {
            radio.removeEventListener('keydown', handleRadioKeydown);
            radio.addEventListener('keydown', handleRadioKeydown);
        });
    } else if (type === 'multipleChoice') {
        toolbar.classList.add('hidden');
        choicesContainer.innerHTML = `
            <div class="choices"></div>
            <button class="add-choice bg-blue-500 text-white px-2 py-1 rounded mt-2">Add Choice</button>
        `;
        (question.choices || []).forEach((choice, index) => {
            const choiceId = generateUUID();
            const choiceDiv = document.createElement('div');
            choiceDiv.className = 'choice flex items-center mb-2';
            choiceDiv.innerHTML = `
                <input type="checkbox" class="correct-choice mr-2" value="${choiceId}" ${question.correctAnswers?.includes(choice) ? 'checked' : ''}>
                <input type="text" class="choice-text border p-2 flex-grow" value="${choice}" placeholder="Enter choice">
                <button class="remove-choice bg-red-500 text-white px-2 py-1 rounded ml-2">Remove</button>
            `;
            choicesContainer.querySelector('.choices').appendChild(choiceDiv);
            choiceDiv.querySelector('.remove-choice').addEventListener('click', () => choiceDiv.remove());
            const checkbox = choiceDiv.querySelector('.correct-choice');
            checkbox.removeEventListener('keydown', handleCheckboxKeydown);
            checkbox.addEventListener('keydown', handleCheckboxKeydown);
        });
        const addChoiceBtn = choicesContainer.querySelector('.add-choice');
        addChoiceBtn.removeEventListener('click', handleAddChoice);
        addChoiceBtn.addEventListener('click', handleAddChoice);
    } else if (type === 'openEnded') {
        toolbar.classList.remove('hidden');
        choicesContainer.innerHTML = `
            <label class="block">Correct Answer (for reference):</label>
            <div class="correct-answer border p-2" contenteditable="true" style="min-height: 100px;">${sanitizeHTML(question.correctAnswers?.[0] || '')}</div>
            <p class="text-sm text-gray-500">Open-ended question. Student answers will be manually graded.</p>
        `;
    }
}

function handleRadioKeydown(e) {
    if (e.key === 'Enter') {
        e.target.checked = true;
        e.target.dispatchEvent(new Event('change'));
    }
}

function handleCheckboxKeydown(e) {
    if (e.key === 'Enter') {
        e.target.checked = !e.target.checked;
        e.target.dispatchEvent(new Event('change'));
    }
}

function handleAddChoice(e) {
    const choicesContainer = e.target.parentElement.querySelector('.choices');
    const newChoiceId = generateUUID();
    const newChoiceDiv = document.createElement('div');
    newChoiceDiv.className = 'choice flex items-center mb-2';
    newChoiceDiv.innerHTML = `
        <input type="checkbox" class="correct-choice mr-2" value="${newChoiceId}">
        <input type="text" class="choice-text border p-2 flex-grow" placeholder="Enter choice">
        <button class="remove-choice bg-red-500 text-white px-2 py-1 rounded ml-2">Remove</button>
    `;
    choicesContainer.appendChild(newChoiceDiv);
    newChoiceDiv.querySelector('.remove-choice').addEventListener('click', () => newChoiceDiv.remove());
    const checkbox = newChoiceDiv.querySelector('.correct-choice');
    checkbox.removeEventListener('keydown', handleCheckboxKeydown);
    checkbox.addEventListener('keydown', handleCheckboxKeydown);
}

document.getElementById('editAddQuestionBtn').addEventListener('click', () => {
    const container = document.getElementById('editQuestionsContainer');
    const questionId = generateUUID();
    const questionDiv = document.createElement('div');
    questionDiv.className = 'border p-4 mb-4';
    questionDiv.id = `question-${questionId}`;
    questionDiv.innerHTML = `
        <label class="block">Question:</label>
        <input type="text" class="question-text border p-2 w-full mb-2" placeholder="Enter question">
        <label class="block">Question Type:</label>
        <select class="question-type border p-2 w-full mb-2">
            <option value="trueFalse">True/False</option>
            <option value="multipleChoice">Multiple Choice</option>
            <option value="openEnded">Open Ended</option>
        </select>
        <div class="choices-container"></div>
        <button class="remove-question bg-red-500 text-white px-2 py-1 rounded mt-2">Remove</button>
    `;
    container.appendChild(questionDiv);
    updateEditQuestionType(questionDiv, { choices: [], correctAnswers: [] });
    questionDiv.querySelector('.question-type').addEventListener('change', () => updateEditQuestionType(questionDiv, { choices: [], correctAnswers: [] }));
    questionDiv.querySelector('.remove-question').addEventListener('click', () => questionDiv.remove());
});

document.getElementById('saveEditQuizBtn').addEventListener('click', () => {
    const quiz = collectEditQuizData();
    if (quiz) {
        const index = quizzes.findIndex(q => q.id === currentQuiz.id);
        quizzes[index] = quiz;
        currentQuiz = quiz;
        updateTutorQuizList();
        updateNotifications();
        alert('Quiz updated!');
        document.getElementById('editQuizSection').classList.add('hidden');
        document.getElementById('viewQuizDetails').classList.remove('hidden');
        document.getElementById('editQuizButtons').classList.add('hidden');
        document.getElementById('viewQuizButtons').classList.remove('hidden');
        viewQuiz();
    }
});

document.getElementById('deleteQuizBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this quiz?')) {
        quizzes = quizzes.filter(q => q.id !== currentQuiz.id);
        updateTutorQuizList();
        updateNotifications();
        alert('Quiz deleted!');
        document.getElementById('viewQuizDetailsModal').style.display = 'none';
        document.getElementById('giveQuizModal').style.display = 'flex';
        currentQuiz = null;
    }
});

document.getElementById('postQuizFromViewBtn').addEventListener('click', () => {
    if (currentQuiz) {
        currentQuiz.status = 'posted';
        updateTutorQuizList();
        updateNotifications();
        alert('Quiz posted!');
        document.getElementById('viewQuizDetailsModal').style.display = 'none';
        document.getElementById('giveQuizModal').style.display = 'flex';
        currentQuiz = null;
    }
});

document.getElementById('closeViewQuizModalBtn').addEventListener('click', () => {
    document.getElementById('viewQuizDetailsModal').style.display = 'none';
    document.getElementById('giveQuizModal').style.display = 'flex';
    currentQuiz = null;
});

document.getElementById('cancelEditQuizBtn').addEventListener('click', () => {
    document.getElementById('viewQuizDetails').classList.remove('hidden');
    document.getElementById('editQuizSection').classList.add('hidden');
    document.getElementById('viewQuizButtons').classList.remove('hidden');
    document.getElementById('editQuizButtons').classList.add('hidden');
});

function collectEditQuizData() {
    const studentId = document.getElementById('editSelectedStudent').dataset.studentId;
    const courseName = document.getElementById('editCourseName').value.trim();
    const quizType = document.getElementById('editQuizType').value.trim();
    const quizTime = parseInt(document.getElementById('editQuizTime').value);
    const quizDays = parseInt(document.getElementById('editQuizDays').value);
    if (!studentId) {
        alert('Please select a student for editing.');
        return null;
    }
    if (!courseName) {
        alert('Please enter a course name for editing.');
        return null;
    }
    if (!quizType) {
        alert('Please select a quiz type for editing.');
        return null;
    }
    if (!quizTime || isNaN(quizTime) || quizTime <= 0) {
        alert('Please enter a valid time (in minutes) for editing.');
        return null;
    }
    if (!quizDays || isNaN(quizDays) || quizDays <= 0) {
        alert('Please enter a valid number of days for editing.');
        return null;
    }
    const questions = [];
    document.querySelectorAll('#editQuestionsContainer > div').forEach(div => {
        const questionTextInput = div.querySelector('.question-text');
        if (!questionTextInput) {
            console.error(`Edit Question (ID: ${div.id}): .question-text not found, skipping.`);
            return;
        }
        const questionText = questionTextInput.value.trim();
        const questionTypeInput = div.querySelector('.question-type');
        if (!questionTypeInput) {
            console.error(`Edit Question (ID: ${div.id}): .question-type not found, skipping.`);
            return;
        }
        const questionType = questionTypeInput.value;
        if (!questionText || !['trueFalse', 'multipleChoice', 'openEnded'].includes(questionType)) {
            console.warn(`Edit Question (ID: ${div.id}): Invalid text or type, skipping.`);
            return;
        }
        let correctAnswers = [];
        let choices = [];
        if (questionType === 'trueFalse') {
            choices = ['true', 'false'];
            const selected = div.querySelector(`input[name="correct-${div.id}"]:checked`);
            if (selected) correctAnswers = [selected.value];
        } else if (questionType === 'multipleChoice') {
            choices = Array.from(div.querySelectorAll('.choice-text')).map(input => input.value.trim()).filter(v => v);
            correctAnswers = Array.from(div.querySelectorAll('.correct-choice:checked'))
                .map(cb => cb.nextElementSibling?.value.trim())
                .filter(v => v);
            if (choices.length === 0) {
                console.warn(`Edit Question (ID: ${div.id}): No choices provided, skipping.`);
                return;
            }
        } else if (questionType === 'openEnded') {
            const editorContainer = div.querySelector('.correct-answer');
            if (editorContainer) {
                const content = sanitizeHTML(editorContainer.innerHTML.trim());
                if (content && content !== '<p><br></p>') correctAnswers = [content];
            }
        }
        questions.push({ id: div.id, text: questionText, type: questionType, choices, correctAnswers });
    });
    if (questions.length === 0) {
        alert('Please add at least one valid question for editing.');
        return null;
    }
    const postDate = new Date();
    const dueDate = new Date(postDate.getTime() + quizDays * 24 * 60 * 60 * 1000);
    return {
        id: currentQuiz.id,
        tutorId: currentQuiz.tutorId,
        studentId,
        courseName,
        quizType,
        quizTime,
        quizDays,
        dueDate: dueDate.toISOString(),
        postDate: postDate.toISOString(),
        questions,
        status: currentQuiz.status,
        studentAnswers: currentQuiz.studentAnswers || null,
        marks: currentQuiz.marks || null,
        explanations: currentQuiz.explanations || null,
        score: currentQuiz.score || null
    };
}

// Student Search for Quiz Creation
document.getElementById('studentSearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const resultsDiv = document.getElementById('studentSearchResults');
    resultsDiv.innerHTML = '';
    if (query) {
        resultsDiv.classList.remove('hidden');
        const filtered = students.filter(s => s.name.toLowerCase().includes(query));
        filtered.forEach(student => {
            const div = document.createElement('div');
            div.className = 'p-2 hover:bg-gray-200 cursor-pointer flex items-center';
            div.tabIndex = 0;
            div.innerHTML = `<img src="${student.profilePic}" class="profile-pic mr-2"> ${student.name}`;
            div.addEventListener('click', () => selectStudent(student));
            div.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') selectStudent(student);
            });
            resultsDiv.appendChild(div);
        });
    } else {
        resultsDiv.classList.add('hidden');
    }
});

document.getElementById('studentSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const resultsDiv = document.getElementById('studentSearchResults');
        const firstResult = resultsDiv.querySelector('div[tabindex="0"]');
        if (firstResult && !resultsDiv.classList.contains('hidden')) {
            firstResult.focus();
        }
    } else if (e.key === 'Enter') {
        const resultsDiv = document.getElementById('studentSearchResults');
        const firstResult = resultsDiv.querySelector('div[tabindex="0"]');
        if (firstResult && !resultsDiv.classList.contains('hidden')) {
            firstResult.click();
        }
    }
});

function selectStudent(student) {
    document.getElementById('selectedStudent').innerHTML = 
        `<div class="flex items-center"><img src="${student.profilePic}" class="profile-pic mr-2"> ${student.name}</div>`;
    document.getElementById('selectedStudent').dataset.studentId = student.id;
    document.getElementById('studentSearchResults').classList.add('hidden');
    document.getElementById('studentSearch').value = '';
}

// Add Question
document.getElementById('addQuestionBtn').addEventListener('click', () => {
    const container = document.getElementById('questionsContainer');
    if (!container) {
        console.error('Element #questionsContainer not found');
        alert('Error: Questions container not found.');
        return;
    }
    const questionId = generateUUID();
    const questionDiv = document.createElement('div');
    questionDiv.className = 'border p-4 mb-4';
    questionDiv.id = `question-${questionId}`;
    questionDiv.innerHTML = `
        <label class="block">Question:</label>
        <input type="text" class="question-text border p-2 w-full mb-2" placeholder="Enter question">
        <label class="block">Question Type:</label>
        <select class="question-type border p-2 w-full mb-2">
            <option value="trueFalse">True/False</option>
            <option value="multipleChoice">Multiple Choice</option>
            <option value="openEnded">Open Ended</option>
        </select>
        <div class="choices-container"></div>
        <button class="remove-question bg-red-500 text-white px-2 py-1 rounded mt-2">Remove</button>
    `;
    container.appendChild(questionDiv);
    console.log(`Added question div with ID: ${questionDiv.id}`); // Debug log
    updateQuestionType(questionDiv);
    questionDiv.querySelector('.question-type').addEventListener('change', () => {
        console.log(`Question type changed for ID: ${questionDiv.id}`); // Debug log
        updateQuestionType(questionDiv);
    });
    questionDiv.querySelector('.remove-question').addEventListener('click', () => {
        console.log(`Removing question div with ID: ${questionDiv.id}`); // Debug log
        questionDiv.remove();
    });
});

function updateQuestionType(questionDiv) {
    if (!questionDiv) {
        console.error('updateQuestionType: questionDiv is null');
        return;
    }
    const typeInput = questionDiv.querySelector('.question-type');
    if (!typeInput) {
        console.error(`updateQuestionType: .question-type not found in questionDiv ID: ${questionDiv.id}`);
        return;
    }
    const type = typeInput.value;
    const choicesContainer = questionDiv.querySelector('.choices-container');
    if (!choicesContainer) {
        console.error(`updateQuestionType: .choices-container not found in questionDiv ID: ${questionDiv.id}`);
        return;
    }
    const toolbar = document.getElementById('questionToolbar');
    choicesContainer.innerHTML = '';
    console.log(`Updating question type to: ${type} for ID: ${questionDiv.id}`); // Debug log
    if (type === 'trueFalse') {
        toolbar.classList.add('hidden');
        choicesContainer.innerHTML = `
            <label><input type="radio" name="correct-${questionDiv.id}" value="true" required> True</label>
            <label><input type="radio" name="correct-${questionDiv.id}" value="false"> False</label>
        `;
        const radios = choicesContainer.querySelectorAll(`input[name="correct-${questionDiv.id}"]`);
        radios.forEach(radio => {
            radio.removeEventListener('keydown', handleRadioKeydown);
            radio.addEventListener('keydown', handleRadioKeydown);
        });
    } else if (type === 'multipleChoice') {
        toolbar.classList.add('hidden');
        choicesContainer.innerHTML = `
            <div class="choices"></div>
            <button class="add-choice bg-blue-500 text-white px-2 py-1 rounded mt-2">Add Choice</button>
        `;
        const choiceId = generateUUID();
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'choice flex items-center mb-2';
        choiceDiv.innerHTML = `
            <input type="checkbox" class="correct-choice mr-2" value="${choiceId}">
            <input type="text" class="choice-text border p-2 flex-grow" placeholder="Enter choice">
            <button class="remove-choice bg-red-500 text-white px-2 py-1 rounded ml-2">Remove</button>
        `;
        choicesContainer.querySelector('.choices').appendChild(choiceDiv);
        choiceDiv.querySelector('.remove-choice').addEventListener('click', () => choiceDiv.remove());
        const checkbox = choiceDiv.querySelector('.correct-choice');
        checkbox.removeEventListener('keydown', handleCheckboxKeydown);
        checkbox.addEventListener('keydown', handleCheckboxKeydown);
        const addChoiceBtn = choicesContainer.querySelector('.add-choice');
        addChoiceBtn.removeEventListener('click', handleAddChoice);
        addChoiceBtn.addEventListener('click', handleAddChoice);
    } else if (type === 'openEnded') {
        toolbar.classList.remove('hidden');
        choicesContainer.innerHTML = `
            <label class="block">Correct Answer (for reference, optional):</label>
            <div class="correct-answer border p-2" contenteditable="true" style="min-height: 100px;"></div>
            <p class="text-sm text-gray-500">Open-ended question. Student answers will be manually graded.</p>
        `;
    }
}

// Save Quiz
document.getElementById('saveQuizBtn').addEventListener('click', () => {
    try {
        const quiz = collectQuizData();
        if (!quiz) {
            alert('Failed to save quiz: Invalid data. Check all fields.');
            return;
        }
        quiz.status = 'saved';
        tempQuiz = quiz; // Store for post
        const existingIndex = quizzes.findIndex(q => q.id === quiz.id);
        if (existingIndex === -1) {
            quizzes.push(quiz);
        } else {
            quizzes[existingIndex] = quiz;
        }
        console.log('Saved Quiz:', quiz); // Debug log
        updateTutorQuizList();
        updateNotifications();
        alert('Quiz saved successfully!');
        document.getElementById('giveQuizModal').style.display = 'none';
        clearQuizForm();
    } catch (error) {
        alert('Error saving quiz: ' + error.message);
        console.error('Save Quiz Error:', error);
    }
});

// Post Quiz
document.getElementById('postQuizBtn').addEventListener('click', () => {
    try {
        const quiz = tempQuiz || collectQuizData();
        if (!quiz) {
            alert('Failed to post quiz: Invalid data. Check all fields.');
            return;
        }
        quiz.status = 'posted';
        const existingIndex = quizzes.findIndex(q => q.id === quiz.id);
        if (existingIndex === -1) {
            quizzes.push(quiz);
        } else {
            quizzes[existingIndex] = quiz;
        }
        console.log('Posted Quiz:', quiz); // Debug log
        updateTutorQuizList();
        updateNotifications();
        alert('Quiz posted successfully!');
        document.getElementById('giveQuizModal').style.display = 'none';
        clearQuizForm();
        tempQuiz = null;
    } catch (error) {
        alert('Error posting quiz: ' + error.message);
        console.error('Post Quiz Error:', error);
    }
});

function collectQuizData() {
    console.log('Collecting quiz data...'); // Debug log
    const selectedStudent = document.getElementById('selectedStudent');
    if (!selectedStudent) {
        console.error('Element #selectedStudent not found');
        alert('Error: Student selection element not found.');
        return null;
    }
    const studentId = selectedStudent.dataset.studentId;
    console.log('Student ID:', studentId); // Debug log
    if (!studentId) {
        alert('Please select a student.');
        return null;
    }

    const courseNameInput = document.getElementById('courseName');
    if (!courseNameInput) {
        console.error('Element #courseName not found');
        alert('Error: Course name element not found.');
        return null;
    }
    const courseName = courseNameInput.value.trim();
    console.log('Course Name:', courseName); // Debug log
    if (!courseName) {
        alert('Please enter a course name.');
        return null;
    }

    const quizTypeInput = document.getElementById('quizType');
    if (!quizTypeInput) {
        console.error('Element #quizType not found');
        alert('Error: Quiz type element not found.');
        return null;
    }
    const quizType = quizTypeInput.value.trim();
    console.log('Quiz Type:', quizType); // Debug log
    if (!quizType) {
        alert('Please select a quiz type.');
        return null;
    }

    const quizTimeInput = document.getElementById('quizTime');
    if (!quizTimeInput) {
        console.error('Element #quizTime not found');
        alert('Error: Quiz time element not found.');
        return null;
    }
    const quizTime = parseInt(quizTimeInput.value);
    console.log('Quiz Time:', quizTime); // Debug log
    if (!quizTime || isNaN(quizTime) || quizTime <= 0) {
        alert('Please enter a valid time (in minutes).');
        return null;
    }

    const quizDaysInput = document.getElementById('quizDays');
    if (!quizDaysInput) {
        console.error('Element #quizDays not found');
        alert('Error: Quiz days element not found.');
        return null;
    }
    const quizDays = parseInt(quizDaysInput.value);
    console.log('Quiz Days:', quizDays); // Debug log
    if (!quizDays || isNaN(quizDays) || quizDays <= 0) {
        alert('Please enter a valid number of days.');
        return null;
    }

    const questions = [];
    const questionDivs = document.querySelectorAll('#questionsContainer > div');
    console.log('Number of questions:', questionDivs.length); // Debug log
    if (questionDivs.length === 0) {
        alert('Please add at least one question.');
        return null;
    }

    for (const [index, div] of Array.from(questionDivs).entries()) {
        console.log(`Processing question ${index + 1}, ID: ${div.id}`); // Debug log
        const questionTextInput = div.querySelector('.question-text');
        if (!questionTextInput) {
            console.error(`Question ${index + 1} (ID: ${div.id}): .question-text not found, skipping.`);
            continue; // Skip invalid question
        }
        const questionText = questionTextInput.value.trim();
        console.log(`Question ${index + 1} Text:`, questionText); // Debug log
        if (!questionText) {
            console.warn(`Question ${index + 1} (ID: ${div.id}): Empty question text, skipping.`);
            continue;
        }

        const questionTypeInput = div.querySelector('.question-type');
        if (!questionTypeInput) {
            console.error(`Question ${index + 1} (ID: ${div.id}): .question-type not found, skipping.`);
            continue;
        }
        const questionType = questionTypeInput.value;
        console.log(`Question ${index + 1} Type:`, questionType); // Debug log
        if (!['trueFalse', 'multipleChoice', 'openEnded'].includes(questionType)) {
            console.warn(`Question ${index + 1} (ID: ${div.id}): Invalid question type, skipping.`);
            continue;
        }

        let correctAnswers = [];
        let choices = [];
        if (questionType === 'trueFalse') {
            choices = ['true', 'false'];
            const selected = div.querySelector(`input[name="correct-${div.id}"]:checked`);
            console.log(`Question ${index + 1} True/False Selected:`, selected ? selected.value : 'none'); // Debug log
            if (selected) {
                correctAnswers = [selected.value];
            } else {
                console.warn(`Question ${index + 1} (ID: ${div.id}): No correct answer selected for true/false.`);
            }
        } else if (questionType === 'multipleChoice') {
            choices = Array.from(div.querySelectorAll('.choice-text')).map(input => input.value.trim()).filter(v => v);
            console.log(`Question ${index + 1} Choices:`, choices); // Debug log
            correctAnswers = Array.from(div.querySelectorAll('.correct-choice:checked'))
                .map(cb => cb.nextElementSibling?.value.trim())
                .filter(v => v);
            console.log(`Question ${index + 1} Correct Answers:`, correctAnswers); // Debug log
            if (choices.length === 0) {
                console.warn(`Question ${index + 1} (ID: ${div.id}): No choices provided, skipping.`);
                continue;
            }
        } else if (questionType === 'openEnded') {
            const editorContainer = div.querySelector('.correct-answer');
            if (editorContainer) {
                const content = sanitizeHTML(editorContainer.innerHTML.trim());
                if (content && content !== '<p><br></p>') {
                    correctAnswers = [content];
                }
                console.log(`Question ${index + 1} Open-Ended Answer:`, content); // Debug log
            }
        }

        questions.push({ id: div.id, text: questionText, type: questionType, choices, correctAnswers });
    }

    if (questions.length === 0) {
        alert('Please add at least one valid question with text and type.');
        return null;
    }

    const postDate = new Date();
    const dueDate = new Date(postDate.getTime() + quizDays * 24 * 60 * 60 * 1000);
    const quiz = {
        id: tempQuiz?.id || generateUUID(),
        tutorId: 1,
        studentId,
        courseName,
        quizType,
        quizTime,
        quizDays,
        dueDate: dueDate.toISOString(),
        postDate: postDate.toISOString(),
        questions,
        status: 'draft'
    };
    console.log('Collected Quiz Data:', quiz); // Debug log
    return quiz;
}

function clearQuizForm() {
    const selectedStudent = document.getElementById('selectedStudent');
    if (selectedStudent) {
        selectedStudent.innerHTML = '';
        selectedStudent.dataset.studentId = '';
    }
    const courseName = document.getElementById('courseName');
    if (courseName) courseName.value = '';
    const quizType = document.getElementById('quizType');
    if (quizType) quizType.value = '';
    const quizTime = document.getElementById('quizTime');
    if (quizTime) quizTime.value = '20';
    const quizDays = document.getElementById('quizDays');
    if (quizDays) quizDays.value = '';
    const questionsContainer = document.getElementById('questionsContainer');
    if (questionsContainer) questionsContainer.innerHTML = '';
    tempQuiz = null;
}

// Close Give Quiz Modal
document.getElementById('closeQuizModalBtn').addEventListener('click', () => {
    document.getElementById('giveQuizModal').style.display = 'none';
    clearQuizForm();
});

// Student: My Quizzes
document.getElementById('myQuizzesBtn').addEventListener('click', () => {
    document.getElementById('myQuizzesModal').style.display = 'flex';
    if (tutors.length > 0 && !selectedTutorId) {
        selectedTutorId = tutors[0].id;
    }
    updateTutorList();
    updateQuizTable();
    document.getElementById('tutorSearch').focus();
});

// Close My Quizzes Modal
document.getElementById('closeMyQuizzesModalBtn').addEventListener('click', () => {
    document.getElementById('myQuizzesModal').style.display = 'none';
    selectedTutorId = null;
});

// Tutor Search for My Quizzes
document.getElementById('tutorSearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const resultsDiv = document.getElementById('tutorSearchResults');
    resultsDiv.innerHTML = '';
    if (query) {
        resultsDiv.classList.remove('hidden');
        const filtered = tutors.filter(t => t.name.toLowerCase().includes(query));
        filtered.forEach(tutor => {
            const div = document.createElement('div');
            div.className = 'p-2 hover:bg-gray-200 cursor-pointer flex items-center';
            div.tabIndex = 0;
            div.innerHTML = `<img src="${tutor.profilePic}" class="profile-pic mr-2"> ${tutor.name}`;
            div.addEventListener('click', () => {
                selectedTutorId = tutor.id;
                updateTutorList();
                updateQuizTable();
                resultsDiv.classList.add('hidden');
                document.getElementById('tutorSearch').value = '';
            });
            div.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    selectedTutorId = tutor.id;
                    updateTutorList();
                    updateQuizTable();
                    resultsDiv.classList.add('hidden');
                    document.getElementById('tutorSearch').value = '';
                }
            });
            resultsDiv.appendChild(div);
        });
    } else {
        resultsDiv.classList.add('hidden');
    }
});

function updateTutorList() {
    const tutorList = document.getElementById('tutorList');
    tutorList.innerHTML = '';
    const studentId = 1; // Assume logged-in student
    tutors.forEach(tutor => {
        const hasQuiz = quizzes.some(q => 
            q.tutorId === tutor.id && 
            q.studentId == studentId && 
            (q.status === 'posted' || q.status === 'completed') && 
            new Date(q.dueDate) >= new Date()
        );
        const div = document.createElement('div');
        div.className = `p-2 flex items-center cursor-pointer ${selectedTutorId === tutor.id ? 'bg-blue-100' : 'hover:bg-gray-200'}`;
        div.tabIndex = 0;
        div.innerHTML = `
            <img src="${tutor.profilePic}" class="profile-pic mr-2">
            ${tutor.name}
            <span class="notification-icon ${hasQuiz ? 'active' : ''}"></span>
        `;
        div.addEventListener('click', () => {
            selectedTutorId = tutor.id;
            updateTutorList();
            updateQuizTable();
        });
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                selectedTutorId = tutor.id;
                updateTutorList();
                updateQuizTable();
            }
        });
        tutorList.appendChild(div);
    });
}

function updateQuizTable() {
    const tbody = document.getElementById('quizTableBody');
    tbody.innerHTML = '';
    const studentId = 1; // Assume logged-in student
    const filteredQuizzes = quizzes.filter(q => 
        q.studentId == studentId && 
        (!selectedTutorId || q.tutorId == selectedTutorId) &&
        (q.status === 'posted' || q.status === 'completed') &&
        new Date(q.dueDate) >= new Date()
    );
    filteredQuizzes.forEach(quiz => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="border p-2">${quiz.courseName}</td>
            <td class="border p-2">${quiz.quizType}</td>
            <td class="border p-2">${quiz.score || '-'}</td>
            <td class="border p-2">${quiz.quizTime} min</td>
            <td class="border p-2">${new Date(quiz.dueDate).toLocaleDateString()} (${calculateDaysLeft(quiz.dueDate)})</td>
            <td class="border p-2">
                ${quiz.score ? 
                    `<button class="view-score bg-blue-500 text-white px-2 py-1 rounded" data-quiz-id="${quiz.id}">View Score</button>` :
                    `<button class="view-quiz bg-blue-500 text-white px-2 py-1 rounded" data-quiz-id="${quiz.id}">View Quiz</button>`
                }
            </td>
        `;
        tbody.appendChild(row);
        if (quiz.score) {
            row.querySelector('.view-score').addEventListener('click', () => {
                currentQuiz = quizzes.find(q => q.id === quiz.id);
                showScoreDetails();
            });
        } else {
            row.querySelector('.view-quiz').addEventListener('click', () => {
                currentQuiz = quizzes.find(q => q.id === quiz.id);
                showViewQuizModal();
            });
        }
    });
    updateNotifications();
}

function updateNotifications() {
    const studentId = 1; // Assume logged-in student
    const tutorId = 1; // Assume logged-in tutor
    const hasPendingQuizzes = quizzes.some(q => 
        q.studentId == studentId && 
        q.status === 'posted' && 
        new Date(q.dueDate) >= new Date()
    );
    document.getElementById('myQuizzesNotification').classList.toggle('active', hasPendingQuizzes);
    
    const hasPendingAnswers = quizzes.some(q => 
        q.tutorId == tutorId && 
        q.studentAnswers
    );
    document.getElementById('viewAnswersNotification').classList.toggle('active', hasPendingAnswers);

    const hasTutorQuizzes = quizzes.some(q => 
        q.tutorId == tutorId && 
        q.status === 'posted' && 
        new Date(q.dueDate) >= new Date()
    );
    document.getElementById('tutorQuizzesNotification').classList.toggle('active', hasTutorQuizzes);
}

function showViewQuizModal() {
    document.getElementById('myQuizzesModal').style.display = 'none';
    document.getElementById('viewQuizModal').style.display = 'flex';
    const contentDiv = document.getElementById('quizWarningContent');
    const buttonsDiv = document.getElementById('quizWarningButtons');
    if (!currentQuiz) {
        contentDiv.innerHTML = `<p class="text-red-500">Error: No quiz selected.</p>`;
        buttonsDiv.innerHTML = `
            <button id="closeViewQuizModalBtn" class="bg-red-500 text-white px-4 py-2 rounded">Close</button>
        `;
        document.getElementById('closeViewQuizModalBtn').addEventListener('click', closeViewQuizModal);
        return;
    }
    if (currentQuiz.status === 'completed') {
        contentDiv.innerHTML = `<p class="mb-4">You have already taken this quiz.</p>`;
        buttonsDiv.innerHTML = `
            <button id="closeViewQuizModalBtn" class="bg-red-500 text-white px-4 py-2 rounded">Close</button>
        `;
        document.getElementById('closeViewQuizModalBtn').addEventListener('click', closeViewQuizModal);
    } else {
        const hasProgress = savedQuizProgress[currentQuiz.id];
        contentDiv.innerHTML = `
            <p class="mb-4">Only start when you're ready. If you feel you want to finish the quiz some other time after you start taking the quiz, don't worry just cancel. You'll resume when you're ready.</p>
        `;
        buttonsDiv.innerHTML = `
            <button id="${hasProgress ? 'resumeQuizBtn' : 'startQuizBtn'}" class="bg-blue-500 text-white px-4 py-2 rounded">${hasProgress ? 'Resume Quiz' : 'Start Quiz'}</button>
            <button id="closeViewQuizModalBtn" class="bg-red-500 text-white px-4 py-2 rounded ml-4">Close</button>
        `;
        document.getElementById(hasProgress ? 'resumeQuizBtn' : 'startQuizBtn').addEventListener('click', hasProgress ? resumeQuiz : startQuiz);
        document.getElementById('closeViewQuizModalBtn').addEventListener('click', closeViewQuizModal);
    }
}

function startQuiz() {
    if (!currentQuiz) return;
    document.getElementById('viewQuizModal').style.display = 'none';
    document.getElementById('takeQuizModal').style.display = 'flex';
    currentQuestionIndex = 0;
    studentAnswers = Array(currentQuiz.questions.length).fill(null);
    savedQuizProgress[currentQuiz.id] = { timeLeft: currentQuiz.quizTime * 60, currentQuestionIndex: 0, studentAnswers: studentAnswers };
    startTimer();
    showQuestion();
    initializeToolbar('answerToolbar');
}

function resumeQuiz() {
    if (!currentQuiz || !savedQuizProgress[currentQuiz.id]) {
        alert('No progress found for this quiz.');
        closeViewQuizModal();
        return;
    }
    document.getElementById('viewQuizModal').style.display = 'none';
    document.getElementById('takeQuizModal').style.display = 'flex';
    const progress = savedQuizProgress[currentQuiz.id];
    currentQuestionIndex = progress.currentQuestionIndex || 0;
    studentAnswers = progress.studentAnswers || Array(currentQuiz.questions.length).fill(null);
    startTimer(progress.timeLeft);
    showQuestion();
    initializeToolbar('answerToolbar');
}

function closeViewQuizModal() {
    document.getElementById('viewQuizModal').style.display = 'none';
    document.getElementById('myQuizzesModal').style.display = 'flex';
    updateQuizTable();
    currentQuiz = null;
    studentAnswers = [];
}

function showScoreDetails() {
    document.getElementById('myQuizzesModal').style.display = 'none';
    document.getElementById('viewScoreModal').style.display = 'flex';
    const scoreDetails = document.getElementById('scoreDetails');
    scoreDetails.innerHTML = '';
    if (!currentQuiz) {
        scoreDetails.innerHTML = `<p class="text-red-500">Error: No quiz selected.</p>`;
        return;
    }
    const student = students.find(s => s.id == currentQuiz.studentId) || { name: 'Unknown Student' };
    scoreDetails.innerHTML += `<p><strong>Student:</strong> ${student.name}</p>`;
    scoreDetails.innerHTML += `<p><strong>Course:</strong> ${currentQuiz.courseName}</p>`;
    scoreDetails.innerHTML += `<p><strong>Quiz Type:</strong> ${currentQuiz.quizType}</p>`;
    scoreDetails.innerHTML += `<p><strong>Score:</strong> ${currentQuiz.score || 'Not fully graded'}</p>`;
    (currentQuiz.questions || []).forEach((q, i) => {
        const answer = currentQuiz.studentAnswers && currentQuiz.studentAnswers[i] !== null && currentQuiz.studentAnswers[i] !== '' ? currentQuiz.studentAnswers[i] : 'No answer provided';
        const answerText = q.type === 'openEnded' ? sanitizeHTML(answer) : Array.isArray(answer) ? answer.join(', ') : answer;
        const mark = currentQuiz.marks ? currentQuiz.marks[i] : null;
        const explanation = currentQuiz.explanations ? currentQuiz.explanations[i] : '';
        const correctAnswerText = q.correctAnswers ? (Array.isArray(q.correctAnswers) ? q.correctAnswers.join(', ') : q.correctAnswers) : 'N/A';
        scoreDetails.innerHTML += `
            <div class="border p-2 mb-2 relative">
                <p><strong>Question ${i + 1}:</strong> ${q.text}</p>
                <p><strong>Your Answer:</strong> <span class="answer-content">${answerText}</span></p>
                <p><strong>Correct Answer:</strong> <span class="answer-content">${correctAnswerText}</span></p>
                <p><strong>Status:</strong> ${mark ? (mark === 'correct' ? 'Correct ✅' : 'Incorrect ❌') : 'Not graded'}</p>
                ${explanation && mark === 'wrong' ? `<p><strong>Explanation:</strong> <span class="explanation-content">${sanitizeHTML(explanation)}</span></p>` : ''}
            </div>
        `;
    });
}

document.getElementById('closeViewScoreModalBtn').addEventListener('click', () => {
    document.getElementById('viewScoreModal').style.display = 'none';
    document.getElementById('myQuizzesModal').style.display = 'flex';
    updateQuizTable();
    currentQuiz = null;
    studentAnswers = [];
});

// Tutor: View Answers
document.getElementById('viewAnswersBtn').addEventListener('click', () => {
    document.getElementById('viewAnswersModal').style.display = 'flex';
    if (students.length > 0 && !selectedStudentId) {
        selectedStudentId = students[0].id;
    }
    updateStudentList();
    updateAnswerTable();
    document.getElementById('studentAnswerSearch').focus();
});

// Student Search for View Answers
document.getElementById('studentAnswerSearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const resultsDiv = document.getElementById('studentAnswerSearchResults');
    resultsDiv.innerHTML = '';
    if (query) {
        resultsDiv.classList.remove('hidden');
        const filtered = students.filter(s => s.name.toLowerCase().includes(query));
        filtered.forEach(student => {
            const div = document.createElement('div');
            div.className = 'p-2 hover:bg-gray-200 cursor-pointer flex items-center';
            div.tabIndex = 0;
            div.innerHTML = `<img src="${student.profilePic}" class="profile-pic mr-2"> ${student.name}`;
            div.addEventListener('click', () => {
                selectedStudentId = student.id;
                updateStudentList();
                updateAnswerTable();
                resultsDiv.classList.add('hidden');
                document.getElementById('studentAnswerSearch').value = '';
            });
            div.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    selectedStudentId = student.id;
                    updateStudentList();
                    updateAnswerTable();
                    resultsDiv.classList.add('hidden');
                    document.getElementById('studentAnswerSearch').value = '';
                }
            });
            resultsDiv.appendChild(div);
        });
    } else {
        resultsDiv.classList.add('hidden');
    }
});

function updateStudentList() {
    const studentList = document.getElementById('studentList');
    studentList.innerHTML = '';
    const tutorId = 1; // Assume logged-in tutor
    students.forEach(student => {
        const hasAnswer = quizzes.some(q => 
            q.studentId === student.id && 
            q.tutorId == tutorId && 
            q.studentAnswers
        );
        const div = document.createElement('div');
        div.className = `p-2 flex items-center cursor-pointer ${selectedStudentId === student.id ? 'bg-blue-100' : 'hover:bg-gray-200'}`;
        div.tabIndex = 0;
        div.innerHTML = `
            <img src="${student.profilePic}" class="profile-pic mr-2">
            ${student.name}
            <span class="notification-icon ${hasAnswer ? 'active' : ''}"></span>
        `;
        div.addEventListener('click', () => {
            selectedStudentId = student.id;
            updateStudentList();
            updateAnswerTable();
        });
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                selectedStudentId = student.id;
                updateStudentList();
                updateAnswerTable();
            }
        });
        studentList.appendChild(div);
    });
}

function updateAnswerTable() {
    const tbody = document.getElementById('answerTableBody');
    tbody.innerHTML = '';
    const tutorId = 1; // Assume logged-in tutor
    const filteredQuizzes = quizzes.filter(q => 
        q.tutorId == tutorId && 
        q.studentId && 
        q.studentAnswers && 
        (!selectedStudentId || q.studentId == selectedStudentId)
    );
    filteredQuizzes.forEach(quiz => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="border p-2">${quiz.courseName}</td>
            <td class="border p-2">${quiz.quizType}</td>
            <td class="border p-2">${new Date(quiz.dueDate).toLocaleDateString()} (${calculateDaysLeft(quiz.dueDate)})</td>
            <td class="border p-2">${quiz.score ? 'Graded' : 'Pending'}</td>
            <td class="border p-2">
                <button class="view-answer bg-blue-500 text-white px-2 py-1 rounded" data-quiz-id="${quiz.id}">View</button>
            </td>
        `;
        tbody.appendChild(row);
        row.querySelector('.view-answer').addEventListener('click', () => {
            currentQuiz = quizzes.find(q => q.id === quiz.id);
            showStudentAnswers();
        });
    });
}

function showStudentAnswers() {
    document.getElementById('viewAnswersModal').style.display = 'none';
    document.getElementById('viewIndividualAnswerModal').style.display = 'flex';
    const answerDetails = document.getElementById('answerDetails');
    answerDetails.innerHTML = '';
    if (!currentQuiz) {
        answerDetails.innerHTML = `<p class="text-red-500">Error: No quiz selected.</p>`;
        return;
    }
    const student = students.find(s => s.id == currentQuiz.studentId) || { name: 'Unknown Student' };
    answerDetails.innerHTML += `<p><strong>Student:</strong> ${student.name}</p>`;
    answerDetails.innerHTML += `<p><strong>Course:</strong> ${currentQuiz.courseName}</p>`;
    answerDetails.innerHTML += `<p><strong>Quiz Type:</strong> ${currentQuiz.quizType}</p>`;
    if (!currentQuiz.studentId) {
        answerDetails.innerHTML += `<p class="text-red-500"><strong>Error:</strong> No student ID associated with this quiz.</p>`;
    }
    (currentQuiz.questions || []).forEach((q, i) => {
        const answer = currentQuiz.studentAnswers && currentQuiz.studentAnswers[i] !== null && currentQuiz.studentAnswers[i] !== '' ? currentQuiz.studentAnswers[i] : 'No answer provided';
        const answerText = q.type === 'openEnded' ? sanitizeHTML(answer) : Array.isArray(answer) ? answer.join(', ') : answer;
        const mark = currentQuiz.marks ? currentQuiz.marks[i] : null;
        const explanation = currentQuiz.explanations ? currentQuiz.explanations[i] || '' : '';
        const correctAnswerText = q.correctAnswers ? (Array.isArray(q.correctAnswers) ? q.correctAnswers.join(', ') : q.correctAnswers) : 'N/A';
        answerDetails.innerHTML += `
            <div class="border p-2 mb-2">
                <p><strong>Question ${i + 1}:</strong> ${q.text}</p>
                <p><strong>Student Answer:</strong> <span class="answer-content">${answerText}</span></p>
                <p><strong>Correct Answer:</strong> <span class="answer-content">${correctAnswerText}</span></p>
                <label class="block mt-2">Mark:</label>
                <select class="mark-answer border p-2 w-full mb-2" data-question-index="${i}">
                    <option value="">Select Mark</option>
                    <option value="correct" ${mark === 'correct' ? 'selected' : ''}>Correct</option>
                    <option value="wrong" ${mark === 'wrong' ? 'selected' : ''}>Incorrect</option>
                </select>
                <label class="block">Explanation (if incorrect):</label>
                <div class="explanation border p-2" contenteditable="true" style="min-height: 60px; ${mark === 'wrong' ? '' : 'display: none;'}">${sanitizeHTML(explanation)}</div>
            </div>
        `;
    });
    document.querySelectorAll('.mark-answer').forEach(select => {
        select.addEventListener('change', (e) => {
            const index = e.target.dataset.questionIndex;
            const explanationDiv = e.target.nextElementSibling.nextElementSibling;
            explanationDiv.style.display = e.target.value === 'wrong' ? 'block' : 'none';
        });
    });
    initializeToolbar('answerToolbar');
}

document.getElementById('submitScoreBtn').addEventListener('click', () => {
    if (!currentQuiz) return;
    const marks = [];
    const explanations = [];
    let allGraded = true;
    document.querySelectorAll('.mark-answer').forEach(select => {
        const mark = select.value;
        const index = select.dataset.questionIndex;
        if (!mark) allGraded = false;
        marks[index] = mark;
        const explanationDiv = select.nextElementSibling.nextElementSibling;
        explanations[index] = mark === 'wrong' ? sanitizeHTML(explanationDiv.innerHTML.trim()) : '';
    });
    if (!allGraded) {
        alert('Please grade all questions before submitting.');
        return;
    }
    currentQuiz.marks = marks;
    currentQuiz.explanations = explanations;
    currentQuiz.score = marks.filter(m => m === 'correct').length + '/' + marks.length;
    currentQuiz.status = 'completed';
    updateStudentList();
    updateAnswerTable();
    updateNotifications();
    alert('Score submitted!');
    document.getElementById('viewIndividualAnswerModal').style.display = 'none';
    document.getElementById('viewAnswersModal').style.display = 'flex';
});

document.getElementById('closeIndividualAnswerModalBtn').addEventListener('click', () => {
    document.getElementById('viewIndividualAnswerModal').style.display = 'none';
    document.getElementById('viewAnswersModal').style.display = 'flex';
    currentQuiz = null;
    studentAnswers = [];
});

document.getElementById('closeViewAnswersModalBtn').addEventListener('click', () => {
    document.getElementById('viewAnswersModal').style.display = 'none';
    selectedStudentId = null;
    currentQuiz = null;
});

function startTimer(seconds = currentQuiz?.quizTime * 60) {
    if (!currentQuiz) return;
    let timeLeft = seconds;
    document.getElementById('timerDisplay').textContent = `Time Left: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
    timerInterval = setInterval(() => {
        timeLeft--;
        savedQuizProgress[currentQuiz.id].timeLeft = timeLeft;
        document.getElementById('timerDisplay').textContent = `Time Left: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert('Time is up!');
            submitQuiz();
        }
    }, 1000);
}

function showQuestion() {
    if (!currentQuiz) return;
    const question = currentQuiz.questions[currentQuestionIndex];
    const questionDiv = document.getElementById('currentQuestion');
    const toolbar = document.getElementById('answerToolbar');
    questionDiv.innerHTML = `<p><strong>Question ${currentQuestionIndex + 1}:</strong> ${question.text}</p>`;
    if (question.type === 'trueFalse') {
        toolbar.classList.add('hidden');
        questionDiv.innerHTML += `
            <label><input type="radio" name="answer" value="true" ${studentAnswers[currentQuestionIndex] === 'true' ? 'checked' : ''}> True</label>
            <label><input type="radio" name="answer" value="false" ${studentAnswers[currentQuestionIndex] === 'false' ? 'checked' : ''}> False</label>
        `;
        const radios = questionDiv.querySelectorAll('input[name="answer"]');
        radios.forEach(radio => {
            radio.removeEventListener('change', saveCurrentAnswer);
            radio.addEventListener('change', saveCurrentAnswer);
            radio.removeEventListener('keydown', handleRadioKeydown);
            radio.addEventListener('keydown', handleRadioKeydown);
        });
    } else if (question.type === 'multipleChoice') {
        toolbar.classList.add('hidden');
        question.choices.forEach(choice => {
            questionDiv.innerHTML += `
                <label><input type="checkbox" name="answer" value="${choice}" ${studentAnswers[currentQuestionIndex]?.includes(choice) ? 'checked' : ''}> ${choice}</label>
            `;
        });
        const checkboxes = questionDiv.querySelectorAll('input[name="answer"]');
        checkboxes.forEach(cb => {
            cb.removeEventListener('change', saveCurrentAnswer);
            cb.addEventListener('change', saveCurrentAnswer);
            cb.removeEventListener('keydown', handleCheckboxKeydown);
            cb.addEventListener('keydown', handleCheckboxKeydown);
        });
    } else if (question.type === 'openEnded') {
        toolbar.classList.remove('hidden');
        questionDiv.innerHTML += `
            <label class="block">Your Answer:</label>
            <div id="answerEditor" class="border p-2" contenteditable="true" style="min-height: 100px;">${sanitizeHTML(studentAnswers[currentQuestionIndex] || '')}</div>
        `;
        const editor = document.getElementById('answerEditor');
        editor.removeEventListener('input', saveCurrentAnswer);
        editor.addEventListener('input', saveCurrentAnswer);
    }
    updateNavigationButtons();
    document.getElementById('questionsLeft').textContent = `Questions Left: ${currentQuiz.questions.length - currentQuestionIndex - 1}`;
}

function saveCurrentAnswer() {
    if (!currentQuiz) return;
    const question = currentQuiz.questions[currentQuestionIndex];
    if (question.type === 'trueFalse') {
        const selected = document.querySelector('input[name="answer"]:checked');
        studentAnswers[currentQuestionIndex] = selected ? selected.value : null;
    } else if (question.type === 'multipleChoice') {
        const selected = Array.from(document.querySelectorAll('input[name="answer"]:checked')).map(cb => cb.value);
        studentAnswers[currentQuestionIndex] = selected.length > 0 ? selected : null;
    } else if (question.type === 'openEnded') {
        const editor = document.getElementById('answerEditor');
        const content = sanitizeHTML(editor.innerHTML.trim());
        studentAnswers[currentQuestionIndex] = content !== '' && content !== '<p><br></p>' ? content : null;
    }
    savedQuizProgress[currentQuiz.id].studentAnswers = studentAnswers;
    savedQuizProgress[currentQuiz.id].currentQuestionIndex = currentQuestionIndex;
}
function updateNavigationButtons() {
    const buttonsDiv = document.getElementById('quizNavigationButtons');
    buttonsDiv.innerHTML = '';
    if (currentQuestionIndex > 0) {
        buttonsDiv.innerHTML += `<button id="prevQuestionBtn" class="bg-blue-500 text-white px-4 py-2 rounded">Previous</button>`;
        const prevBtn = document.getElementById('prevQuestionBtn');
        prevBtn.removeEventListener('click', handlePrevQuestion);
        prevBtn.addEventListener('click', handlePrevQuestion);
    }
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        buttonsDiv.innerHTML += `<button id="nextQuestionBtn" class="bg-blue-500 text-white px-4 py-2 rounded ml-2">Next</button>`;
        const nextBtn = document.getElementById('nextQuestionBtn');
        nextBtn.removeEventListener('click', handleNextQuestion);
        nextBtn.addEventListener('click', handleNextQuestion);
    } else {
        buttonsDiv.innerHTML += `<button id="submitQuizBtn" class="bg-green-500 text-white px-4 py-2 rounded ml-2">Submit Quiz</button>`;
        const submitBtn = document.getElementById('submitQuizBtn');
        submitBtn.removeEventListener('click', submitQuiz);
        submitBtn.addEventListener('click', submitQuiz);
    }
}

function handlePrevQuestion() {
    if (!currentQuiz) return;
    saveCurrentAnswer();
    currentQuestionIndex--;
    savedQuizProgress[currentQuiz.id].currentQuestionIndex = currentQuestionIndex;
    showQuestion();
}

function handleNextQuestion() {
    if (!currentQuiz) return;
    saveCurrentAnswer();
    currentQuestionIndex++;
    savedQuizProgress[currentQuiz.id].currentQuestionIndex = currentQuestionIndex;
    showQuestion();
}

function submitQuiz() {
    if (!currentQuiz) {
        alert('Error: No quiz selected.');
        return;
    }
    saveCurrentAnswer();
    clearInterval(timerInterval);
    currentQuiz.studentAnswers = studentAnswers;
    currentQuiz.status = 'completed';
    const existingIndex = quizzes.findIndex(q => q.id === currentQuiz.id);
    if (existingIndex !== -1) {
        quizzes[existingIndex] = currentQuiz;
    } else {
        quizzes.push(currentQuiz);
    }
    delete savedQuizProgress[currentQuiz.id];
    updateQuizTable();
    updateNotifications();
    alert('Quiz submitted successfully!');
    document.getElementById('takeQuizModal').style.display = 'none';
    document.getElementById('myQuizzesModal').style.display = 'flex';
    currentQuiz = null;
    studentAnswers = [];
    currentQuestionIndex = 0;
    document.getElementById('timerDisplay').textContent = '';
}

document.getElementById('cancelQuizBtn').addEventListener('click', () => {
    if (!currentQuiz) return;
    if (confirm('Are you sure you want to cancel? Your progress will be saved.')) {
        clearInterval(timerInterval);
        saveCurrentAnswer();
        savedQuizProgress[currentQuiz.id].studentAnswers = studentAnswers;
        savedQuizProgress[currentQuiz.id].currentQuestionIndex = currentQuestionIndex;
        document.getElementById('takeQuizModal').style.display = 'none';
        document.getElementById('myQuizzesModal').style.display = 'flex';
        updateQuizTable();
        currentQuiz = null;
        studentAnswers = [];
        currentQuestionIndex = 0;
        document.getElementById('timerDisplay').textContent = '';
    }
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    updateTutorQuizList();
    updateTutorList();
    updateQuizTable();
    updateNotifications();
});
