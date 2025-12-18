// manage-schools.js - School Management Module
// Handles all school management functionality for the admin panel

(function() {
    'use strict';

    // School management specific functions
    window.openAddSchoolModal = function() {
        const modal = document.getElementById('add-school-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    window.closeAddSchoolModal = function() {
        const modal = document.getElementById('add-school-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            // Reset form
            resetSchoolForm();
        }
    };

    // Store the uploaded document file
    let schoolDocumentFile = null;

    window.handleSchoolDocumentSelect = function(event) {
        const file = event.target.files[0];
        if (file) {
            // Validate file size (10MB max)
            const maxSize = 10 * 1024 * 1024; // 10MB in bytes
            if (file.size > maxSize) {
                showNotification('File size exceeds 10MB limit', 'error');
                event.target.value = ''; // Clear the input
                return;
            }

            // Validate file type
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                showNotification('Invalid file type. Please upload PDF, DOC, or DOCX', 'error');
                event.target.value = ''; // Clear the input
                return;
            }

            // Store the file
            schoolDocumentFile = file;

            // Show preview
            const preview = document.getElementById('documentPreview');
            const documentName = document.getElementById('documentName');
            const documentSize = document.getElementById('documentSize');

            if (preview && documentName && documentSize) {
                documentName.textContent = file.name;
                documentSize.textContent = formatFileSize(file.size);
                preview.classList.remove('hidden');
            }
        }
    };

    window.removeSchoolDocument = function() {
        // Clear the file input
        const fileInput = document.getElementById('schoolDocument');
        if (fileInput) {
            fileInput.value = '';
        }

        // Clear the stored file
        schoolDocumentFile = null;

        // Hide preview
        const preview = document.getElementById('documentPreview');
        if (preview) {
            preview.classList.add('hidden');
        }
    };

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    function resetSchoolForm() {
        // Clear all form fields
        const fields = ['schoolName', 'schoolType', 'schoolLevel', 'schoolLocation', 'schoolEmail', 'schoolPhone'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
            }
        });

        // Clear document upload
        removeSchoolDocument();
    }

    window.saveSchool = function() {
        // Get form values
        const schoolName = document.getElementById('schoolName').value.trim();
        const schoolType = document.getElementById('schoolType').value;
        const schoolLevel = document.getElementById('schoolLevel').value;
        const schoolLocation = document.getElementById('schoolLocation').value.trim();
        const schoolEmail = document.getElementById('schoolEmail').value.trim();
        const schoolPhone = document.getElementById('schoolPhone').value.trim();

        // Validate required fields
        if (!schoolName || !schoolType || !schoolLevel || !schoolLocation || !schoolEmail || !schoolPhone) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(schoolEmail)) {
            showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Validate phone format (Ethiopian phone numbers)
        const phoneRegex = /^(\+251|0)?[79]\d{8}$/;
        const cleanPhone = schoolPhone.replace(/\s+/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            showNotification('Please enter a valid Ethiopian phone number', 'error');
            return;
        }

        // Validate document upload
        if (!schoolDocumentFile) {
            showNotification('Please upload the school registration document', 'error');
            return;
        }

        // Create school data object
        const schoolData = {
            name: schoolName,
            type: schoolType,
            level: schoolLevel,
            location: schoolLocation,
            email: schoolEmail,
            phone: schoolPhone,
            document: schoolDocumentFile.name,
            documentSize: schoolDocumentFile.size,
            submittedAt: new Date().toISOString()
        };

        // TODO: Implement API call to save school data and upload document
        console.log('Saving school:', schoolData);
        console.log('Document file:', schoolDocumentFile);

        // For now, just show success message
        closeAddSchoolModal();
        showNotification('School added successfully!', 'success');

        // TODO: Refresh the school list/table after successful save
    };

    // Sample school data storage (in real app, this would come from backend)
    const schoolsData = {
        'SCH-001': {
            id: 'SCH-001',
            name: 'Addis Ababa Academy',
            type: 'Private',
            level: 'High School',
            location: 'Addis Ababa, Bole',
            email: 'info@addisacademy.edu.et',
            phone: '+251 91 234 5678',
            students: 1250,
            rating: 4.8,
            status: 'Verified',
            establishedYear: 2010,
            principal: 'Dr. Abebe Kebede',
            documents: [
                { name: 'School License.pdf', size: '2.5 MB', uploadDate: 'Dec 15, 2024' },
                { name: 'Registration Certificate.pdf', size: '1.8 MB', uploadDate: 'Dec 15, 2024' }
            ]
        },
        'REQ-SCH-005': {
            id: 'REQ-SCH-005',
            name: 'Unity International School',
            type: 'International',
            level: 'Elementary',
            location: 'Hawassa',
            email: 'admin@unityschool.edu.et',
            phone: '+251 92 345 6789',
            students: 450,
            status: 'Pending',
            submittedDate: '3 days ago',
            documents: [
                { name: 'School_License_Unity.pdf', size: '3.2 MB', uploadDate: 'Jan 5, 2025' },
                { name: 'Tax_Clearance.pdf', size: '1.1 MB', uploadDate: 'Jan 5, 2025' },
                { name: 'Building_Permit.pdf', size: '2.7 MB', uploadDate: 'Jan 5, 2025' }
            ]
        },
        'REJ-SCH-002': {
            id: 'REJ-SCH-002',
            name: 'Excellence Academy',
            type: 'Private',
            level: 'Elementary',
            location: 'Dire Dawa',
            email: 'contact@excellence.edu.et',
            phone: '+251 93 456 7890',
            status: 'Rejected',
            rejectedDate: 'Jan 5, 2025',
            rejectionReason: 'Incomplete Documentation',
            documents: [
                { name: 'Partial_License.pdf', size: '1.5 MB', uploadDate: 'Jan 3, 2025' }
            ]
        },
        'SUS-SCH-001': {
            id: 'SUS-SCH-001',
            name: 'Bright Future School',
            type: 'Private',
            level: 'High School',
            location: 'Bahir Dar',
            email: 'info@brightfuture.edu.et',
            phone: '+251 94 567 8901',
            students: 780,
            status: 'Suspended',
            suspendedDate: 'Dec 20, 2024',
            suspensionReason: 'Policy Violation',
            documents: [
                { name: 'School_License_BF.pdf', size: '2.1 MB', uploadDate: 'Nov 10, 2024' },
                { name: 'Registration_Cert.pdf', size: '1.9 MB', uploadDate: 'Nov 10, 2024' }
            ]
        }
    };

    window.viewSchool = function(schoolId) {
        const school = schoolsData[schoolId];
        if (!school) {
            showNotification('School not found', 'error');
            return;
        }

        const modal = document.getElementById('view-school-modal');
        const content = document.getElementById('schoolDetailsContent');

        if (!modal || !content) return;

        // Build the details HTML
        let detailsHTML = `
            <div class="border-b pb-4 mb-4">
                <h3 class="text-2xl font-bold text-blue-600">${school.name}</h3>
                <p class="text-gray-500">ID: ${school.id}</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-sm text-gray-600 font-semibold">Type</p>
                    <p class="text-lg">${school.type}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-600 font-semibold">Level</p>
                    <p class="text-lg">${school.level}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-600 font-semibold">Location</p>
                    <p class="text-lg">${school.location}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-600 font-semibold">Email</p>
                    <p class="text-lg">${school.email || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-600 font-semibold">Phone</p>
                    <p class="text-lg">${school.phone || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-600 font-semibold">Status</p>
                    <p class="text-lg"><span class="px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(school.status)}">${school.status}</span></p>
                </div>
        `;

        if (school.students) {
            detailsHTML += `
                <div>
                    <p class="text-sm text-gray-600 font-semibold">Number of Students</p>
                    <p class="text-lg">${school.students.toLocaleString()}</p>
                </div>
            `;
        }

        if (school.rating) {
            detailsHTML += `
                <div>
                    <p class="text-sm text-gray-600 font-semibold">Rating</p>
                    <p class="text-lg">⭐ ${school.rating}/5.0</p>
                </div>
            `;
        }

        if (school.establishedYear) {
            detailsHTML += `
                <div>
                    <p class="text-sm text-gray-600 font-semibold">Established</p>
                    <p class="text-lg">${school.establishedYear}</p>
                </div>
            `;
        }

        if (school.principal) {
            detailsHTML += `
                <div>
                    <p class="text-sm text-gray-600 font-semibold">Principal</p>
                    <p class="text-lg">${school.principal}</p>
                </div>
            `;
        }

        if (school.rejectionReason) {
            detailsHTML += `
                <div class="col-span-2 mt-4 p-4 bg-red-50 rounded-lg">
                    <p class="text-sm text-gray-600 font-semibold">Rejection Reason</p>
                    <p class="text-red-700">${school.rejectionReason}</p>
                    <p class="text-xs text-gray-500 mt-1">Rejected on: ${school.rejectedDate}</p>
                </div>
            `;
        }

        if (school.suspensionReason) {
            detailsHTML += `
                <div class="col-span-2 mt-4 p-4 bg-orange-50 rounded-lg">
                    <p class="text-sm text-gray-600 font-semibold">Suspension Reason</p>
                    <p class="text-orange-700">${school.suspensionReason}</p>
                    <p class="text-xs text-gray-500 mt-1">Suspended on: ${school.suspendedDate}</p>
                </div>
            `;
        }

        detailsHTML += `</div>`;

        // Add documents section
        if (school.documents && school.documents.length > 0) {
            detailsHTML += `
                <div class="mt-6 border-t pt-4">
                    <h4 class="text-lg font-semibold mb-3">📄 Uploaded Documents</h4>
                    <div class="space-y-2">
            `;

            school.documents.forEach(doc => {
                detailsHTML += `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                        <div class="flex items-center gap-3">
                            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                                <p class="font-semibold text-gray-800">${doc.name}</p>
                                <p class="text-sm text-gray-500">${doc.size} • Uploaded: ${doc.uploadDate}</p>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="viewDocument('${doc.name}')" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                                View
                            </button>
                            <button onclick="downloadDocument('${doc.name}')" class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
                                Download
                            </button>
                        </div>
                    </div>
                `;
            });

            detailsHTML += `
                    </div>
                </div>
            `;
        } else {
            detailsHTML += `
                <div class="mt-6 border-t pt-4">
                    <p class="text-gray-500 text-center py-4">No documents uploaded</p>
                </div>
            `;
        }

        content.innerHTML = detailsHTML;
        modal.classList.remove('hidden');
    };

    // Document view and download handlers
    window.viewDocument = function(docName) {
        showNotification(`Opening ${docName}...`, 'info');
        // TODO: Implement document viewer
        console.log('Viewing document:', docName);
    };

    window.downloadDocument = function(docName) {
        showNotification(`Downloading ${docName}...`, 'success');
        // TODO: Implement document download
        console.log('Downloading document:', docName);
    };

    window.closeViewSchoolModal = function() {
        const modal = document.getElementById('view-school-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.editSchool = function(schoolId) {
        const school = schoolsData[schoolId];
        if (!school) {
            showNotification('School not found', 'error');
            return;
        }

        // Populate the edit form
        document.getElementById('editSchoolId').value = school.id;
        document.getElementById('editSchoolName').value = school.name;
        document.getElementById('editSchoolType').value = school.type;
        document.getElementById('editSchoolLevel').value = school.level;
        document.getElementById('editSchoolLocation').value = school.location;
        document.getElementById('editSchoolEmail').value = school.email || '';
        document.getElementById('editSchoolPhone').value = school.phone || '';
        document.getElementById('editSchoolStudents').value = school.students || '';

        // Open the modal
        const modal = document.getElementById('edit-school-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    window.closeEditSchoolModal = function() {
        const modal = document.getElementById('edit-school-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.handleSchoolUpdate = function(event) {
        event.preventDefault();

        const schoolId = document.getElementById('editSchoolId').value;
        const schoolData = {
            id: schoolId,
            name: document.getElementById('editSchoolName').value,
            type: document.getElementById('editSchoolType').value,
            level: document.getElementById('editSchoolLevel').value,
            location: document.getElementById('editSchoolLocation').value,
            email: document.getElementById('editSchoolEmail').value,
            phone: document.getElementById('editSchoolPhone').value,
            students: document.getElementById('editSchoolStudents').value
        };

        // TODO: Implement API call to update school
        console.log('Updating school:', schoolData);

        // Update local data
        if (schoolsData[schoolId]) {
            Object.assign(schoolsData[schoolId], schoolData);
        }

        closeEditSchoolModal();
        showNotification('School updated successfully!', 'success');
    };

    window.suspendSchool = function(schoolId) {
        if (!confirm('Are you sure you want to suspend this school? This action will temporarily disable their access.')) {
            return;
        }

        const reason = prompt('Please enter the reason for suspension:');
        if (!reason) {
            showNotification('Suspension cancelled - reason required', 'info');
            return;
        }

        // Update school status
        if (schoolsData[schoolId]) {
            schoolsData[schoolId].status = 'Suspended';
            schoolsData[schoolId].suspensionReason = reason;
            schoolsData[schoolId].suspendedDate = new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }

        // TODO: Implement API call to suspend school
        console.log(`Suspending school ${schoolId} with reason: ${reason}`);

        showNotification(`School ${schoolId} has been suspended. Refresh to see changes.`, 'warning');

        // Refresh the table after a short delay
        setTimeout(() => {
            location.reload();
        }, 1500);
    };

    window.deleteSchool = function(schoolId) {
        if (!confirm('Are you sure you want to permanently delete this school? This action cannot be undone.')) {
            return;
        }

        // Second confirmation for safety
        const confirmation = prompt('Type "DELETE" to confirm permanent deletion:');
        if (confirmation !== 'DELETE') {
            showNotification('Deletion cancelled', 'info');
            return;
        }

        // Remove from data
        delete schoolsData[schoolId];

        // TODO: Implement API call to delete school
        console.log(`Deleting school ${schoolId}`);

        showNotification(`School ${schoolId} has been permanently deleted. Refreshing...`, 'success');

        // Refresh the table after a short delay
        setTimeout(() => {
            location.reload();
        }, 1500);
    };

    window.reviewSchoolRequest = function(requestId) {
        // Open the view modal for review
        viewSchool(requestId);
    };

    window.approveSchool = function(requestId) {
        if (!confirm(`Are you sure you want to approve ${requestId}? This will grant them full access to the platform.`)) {
            return;
        }

        // Update school status
        if (schoolsData[requestId]) {
            schoolsData[requestId].status = 'Verified';
            schoolsData[requestId].approvedDate = new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            // Generate new ID for verified school
            const newId = 'SCH-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
            schoolsData[newId] = { ...schoolsData[requestId], id: newId };
            delete schoolsData[requestId];
        }

        // TODO: Implement API call to approve school
        console.log('Approving school:', requestId);
        showNotification(`School ${requestId} approved successfully! Switching to verified panel...`, 'success');

        // Switch to verified panel after a short delay
        setTimeout(() => {
            if (typeof window.switchPanel === 'function') {
                window.switchPanel('verified');
            }
            location.reload();
        }, 1500);
    };

    window.rejectSchool = function(requestId) {
        const reason = prompt('Please enter the reason for rejection:');
        if (!reason) {
            showNotification('Rejection cancelled - reason required', 'info');
            return;
        }

        // Update school status
        if (schoolsData[requestId]) {
            schoolsData[requestId].status = 'Rejected';
            schoolsData[requestId].rejectionReason = reason;
            schoolsData[requestId].rejectedDate = new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            // Generate new ID for rejected school
            const newId = 'REJ-SCH-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
            schoolsData[newId] = { ...schoolsData[requestId], id: newId };
            delete schoolsData[requestId];
        }

        // TODO: Implement API call to reject school
        console.log(`Rejecting school ${requestId} with reason: ${reason}`);
        showNotification(`School ${requestId} has been rejected. Switching to rejected panel...`, 'warning');

        // Switch to rejected panel after a short delay
        setTimeout(() => {
            if (typeof window.switchPanel === 'function') {
                window.switchPanel('rejected');
            }
            location.reload();
        }, 1500);
    };

    window.reconsiderSchool = function(rejectedId) {
        if (!confirm('Are you sure you want to reconsider this rejected application?')) {
            return;
        }

        // Update school status
        if (schoolsData[rejectedId]) {
            schoolsData[rejectedId].status = 'Pending';
            delete schoolsData[rejectedId].rejectionReason;
            delete schoolsData[rejectedId].rejectedDate;
            // Generate new ID for pending school
            const newId = 'REQ-SCH-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
            schoolsData[newId] = { ...schoolsData[rejectedId], id: newId };
            delete schoolsData[rejectedId];
        }

        // TODO: Implement API call to move back to pending
        console.log('Reconsidering school:', rejectedId);
        showNotification(`School ${rejectedId} moved back to pending review. Switching to requests panel...`, 'info');

        // Switch to requests panel after a short delay
        setTimeout(() => {
            if (typeof window.switchPanel === 'function') {
                window.switchPanel('requested');
            }
            location.reload();
        }, 1500);
    };

    window.reinstateSchool = function(suspendedId) {
        if (!confirm('Are you sure you want to reinstate this suspended school?')) {
            return;
        }

        // Update school status
        if (schoolsData[suspendedId]) {
            schoolsData[suspendedId].status = 'Verified';
            delete schoolsData[suspendedId].suspensionReason;
            delete schoolsData[suspendedId].suspendedDate;
            // Generate new ID for verified school
            const newId = 'SCH-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
            schoolsData[newId] = { ...schoolsData[suspendedId], id: newId };
            delete schoolsData[suspendedId];
        }

        // TODO: Implement API call to reinstate school
        console.log('Reinstating school:', suspendedId);
        showNotification(`School ${suspendedId} reinstated successfully! Switching to verified panel...`, 'success');

        // Switch to verified panel after a short delay
        setTimeout(() => {
            if (typeof window.switchPanel === 'function') {
                window.switchPanel('verified');
            }
            location.reload();
        }, 1500);
    };

    // Helper function to get status badge classes
    function getStatusClass(status) {
        switch(status) {
            case 'Verified':
                return 'bg-green-100 text-green-800';
            case 'Pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'Rejected':
                return 'bg-red-100 text-red-800';
            case 'Suspended':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    window.openSchoolReports = function() {
        console.log('Opening school reports');
        showNotification('School Reports feature coming soon!', 'info');
    };

    window.openVerificationGuidelines = function() {
        console.log('Opening verification guidelines');
        showNotification('Verification Guidelines feature coming soon!', 'info');
    };

    window.openSchoolSettings = function() {
        console.log('Opening school settings');
        showNotification('School Settings feature coming soon!', 'info');
    };

    window.openEditProfileModal = function() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    window.closeEditProfileModal = function() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.openUploadProfileModal = function() {
        const modal = document.getElementById('upload-profile-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    window.closeUploadProfileModal = function() {
        const modal = document.getElementById('upload-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.openUploadCoverModal = function() {
        const modal = document.getElementById('upload-cover-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    window.closeUploadCoverModal = function() {
        const modal = document.getElementById('upload-cover-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.handleProfileUpdate = function(event) {
        event.preventDefault();
        // Implement profile update logic
        const adminName = document.getElementById('adminNameInput').value;
        const adminNameDisplay = document.getElementById('adminName');
        if (adminNameDisplay) {
            adminNameDisplay.textContent = adminName;
        }
        closeEditProfileModal();
        showNotification('Profile updated successfully!', 'success');
    };

    window.previewProfilePicture = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('profilePreview');
                const previewImg = document.getElementById('profilePreviewImg');
                if (preview && previewImg) {
                    previewImg.src = e.target.result;
                    preview.classList.remove('hidden');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    window.previewCoverImage = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('coverPreview');
                const previewImg = document.getElementById('coverPreviewImg');
                if (preview && previewImg) {
                    previewImg.src = e.target.result;
                    preview.classList.remove('hidden');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    window.handleProfilePictureUpload = function() {
        // Implement profile picture upload logic
        console.log('Uploading profile picture...');
        closeUploadProfileModal();
        showNotification('Profile picture uploaded successfully!', 'success');
    };

    window.handleCoverImageUpload = function() {
        // Implement cover image upload logic
        console.log('Uploading cover image...');
        closeUploadCoverModal();
        showNotification('Cover image uploaded successfully!', 'success');
    };

    window.logout = function() {
        if (confirm('Are you sure you want to logout?')) {
            // Implement logout logic
            console.log('Logging out...');
            showNotification('Logging out...', 'info');
            // Redirect to login page
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
        }
    };

    // Notification helper function
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0`;

        // Set color based on type
        switch(type) {
            case 'success':
                notification.className += ' bg-green-500 text-white';
                break;
            case 'warning':
                notification.className += ' bg-yellow-500 text-white';
                break;
            case 'error':
                notification.className += ' bg-red-500 text-white';
                break;
            default:
                notification.className += ' bg-blue-500 text-white';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        // Check if we're on the school management page
        if (window.location.href.includes('manage-schools.html')) {
            console.log('School Management Module initialized');

            // Add keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    // Close all modals
                    closeAddSchoolModal();
                    closeEditProfileModal();
                    closeUploadProfileModal();
                    closeUploadCoverModal();
                    closeViewSchoolModal();
                    closeEditSchoolModal();
                }
            });

            // Initialize panel state from URL
            const urlParams = new URLSearchParams(window.location.search);
            const panel = urlParams.get('panel');
            if (panel) {
                // switchPanel function is provided by panel-manager.js
                if (typeof window.switchPanel === 'function') {
                    window.switchPanel(panel);
                }
            }
        }
    });
})();