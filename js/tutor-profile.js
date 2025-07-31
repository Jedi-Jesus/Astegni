
    // Mock data for tutor and students
    const tutor = {
      name: "Amanuel Tesfaye",
      gender: "Male",
      address: "Not set",
      school: "Not set",
      courses: ["Algebra:hourly:350", "Geometry:hourly:350", "Physics 101:hourly:400"],
      paymentMethod: "Not set",
      bio: "Hi, I'm Amanuel, a passionate tutor with 5 years of experience in teaching Math and Physics. I focus on making complex concepts simple and engaging for students.",
      certifications: "BSc in Physics, Addis Ababa University, 2018\nTeaching Certificate, Ethiopian Ministry of Education, 2019",
      socials: { facebook: "#", linkedin: "#", twitter: "#" },
      rating: null,
      followers: 0,
      profilePicture: "pictures/profile_picture.png",
      coverPhoto: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=150&q=80",
      introVideo: { url: "https://via.placeholder.com/640x360.mp4", desc: "Introduction to my teaching style." },
      clips: [
        { id: "clip1", url: "https://via.placeholder.com/320x180.mp4", desc: "Quick Math tip." },
        { id: "clip2", url: "https://via.placeholder.com/320x180.mp4", desc: "Physics concept explained." }
      ]
    };

    const students = {
      1: {
        name: "Abebe Kebede",
        subjects: ["Math", "Physics"],
        phone: "+251912345678",
        email: "abebe@example.com",
        nextSession: "May 20, 2025, 2:00 PM",
        progress: { overall: 50, math: 60, physics: 40 },
        sessions: [
          { id: 1, date: "May 20, 2025", time: "2:00 PM", duration: "80 min", subjects: ["Math", "Physics"], cost: 1000, status: "Scheduled" }
        ]
      }
    };

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    });

    document.getElementById('mobile-theme-toggle').addEventListener('click', () => {
      document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    });

    // Mobile menu toggle
    document.getElementById('menu-btn').addEventListener('click', () => {
      const mobileMenu = document.getElementById('mobile-menu');
      mobileMenu.classList.toggle('hidden');
    });

    // Modal functions
    function openEditProfileModal() {
      document.getElementById('edit-profile-modal').classList.remove('hidden');
      document.getElementById('profile-name').value = tutor.name;
      document.getElementById('profile-courses').value = tutor.courses.join(",");
      document.getElementById('profile-school').value = tutor.school;
      document.getElementById('payment-method').value = tutor.paymentMethod;
    }

    function closeEditProfileModal() {
      document.getElementById('edit-profile-modal').classList.add('hidden');
    }

    function openEditProfilePictureModal() {
      document.getElementById('edit-profile-picture-modal').classList.remove('hidden');
    }

    function closeEditProfilePictureModal() {
      document.getElementById('edit-profile-picture-modal').classList.add('hidden');
    }

    function openEditCoverPictureModal() {
      document.getElementById('edit-cover-picture-modal').classList.remove('hidden');
    }

    function closeEditCoverPictureModal() {
      document.getElementById('edit-cover-picture-modal').classList.add('hidden');
    }

    function saveProfilePicture() {
      const input = document.getElementById('profile-picture-input');
      if (input.files[0]) {
        tutor.profilePicture = URL.createObjectURL(input.files[0]);
        updateProfileDisplay();
        closeEditProfilePictureModal();
      }
    }

    function saveCoverPicture() {
      const input = document.getElementById('cover-picture-input');
      if (input.files[0]) {
        tutor.coverPhoto = URL.createObjectURL(input.files[0]);
        updateProfileDisplay();
        closeEditCoverPictureModal();
      }
    }

    function toggleEditField(field) {
      const viewElement = document.getElementById(`tutor-${field}`);
      const editElement = document.getElementById(`edit-${field}`);
      const buttonsElement = document.getElementById(`${field}-buttons`);
      const isHidden = editElement.classList.contains('edit-field-hidden');
      if (isHidden) {
        if (field === 'socials') {
          document.getElementById('edit-social-facebook').value = tutor.socials.facebook || '';
          document.getElementById('edit-social-twitter').value = tutor.socials.twitter || '';
          document.getElementById('edit-social-youtube').value = tutor.socials.youtube || '';
          document.getElementById('view-profile-socials').classList.add('edit-field-hidden');
        } else {
          editElement.value = tutor[field].replace(/<br>/g, '\n');
          viewElement.classList.add('edit-field-hidden');
        }
        editElement.classList.remove('edit-field-hidden');
        if (buttonsElement) buttonsElement.classList.remove('edit-field-hidden');
      } else {
        if (field === 'socials') {
          document.getElementById('view-profile-socials').classList.remove('edit-field-hidden');
        } else {
          viewElement.classList.remove('edit-field-hidden');
        }
        editElement.classList.add('edit-field-hidden');
        if (buttonsElement) buttonsElement.classList.add('edit-field-hidden');
      }
    }

    function saveAboutMe() {
      tutor.bio = document.getElementById('edit-about-me').value;
      updateProfileDisplay();
      toggleEditField('about-me');
    }

    function saveCertifications() {
      tutor.certifications = document.getElementById('edit-certifications').value;
      updateProfileDisplay();
      toggleEditField('certifications');
    }

    function saveSocials() {
      tutor.socials = {
        facebook: document.getElementById('edit-social-facebook').value,
        twitter: document.getElementById('edit-social-twitter').value,
        youtube: document.getElementById('edit-social-youtube').value
      };
      updateProfileDisplay();
      toggleEditField('socials');
    }

    function submitProfileEdit() {
      tutor.name = document.getElementById('profile-name').value;
      tutor.courses = document.getElementById('profile-courses').value.split(",");
      tutor.school = document.getElementById('profile-school').value;
      tutor.paymentMethod = document.getElementById('payment-method').value;
      updateProfileDisplay();
      closeEditProfileModal();
    }

    function updateProfileDisplay() {
      document.getElementById('tutor-name').childNodes[0].textContent = tutor.name;
      document.getElementById('tutor-gender').textContent = tutor.gender;
      document.getElementById('tutor-address').textContent = `Address: ${tutor.address}`;
      document.getElementById('tutor-school').textContent = `Teaches: ${tutor.school}`;
      document.getElementById('courses').textContent = `Courses: ${tutor.courses.join(", ")}`;
      document.getElementById('payment-method').textContent = `Payment Method: ${tutor.paymentMethod}`;
      document.getElementById('tutor-bio').innerHTML = tutor.bio.replace(/\n/g, '<br>');
      document.getElementById('tutor-certifications').innerHTML = tutor.certifications.replace(/\n/g, '<br>');
      document.getElementById('social-facebook').href = tutor.socials.facebook;
      document.getElementById('social-linkedin').href = tutor.socials.linkedin;
      document.getElementById('social-twitter').href = tutor.socials.twitter;
      document.getElementById('follower-number').textContent = tutor.followers;
      document.getElementById('profile-picture').src = tutor.profilePicture;
      document.getElementById('cover-photo').style.backgroundImage = `url(${tutor.coverPhoto})`;
      document.getElementById('intro-video').src = tutor.introVideo.url;
      document.getElementById('intro-video-desc').textContent = tutor.introVideo.desc;
      tutor.clips.forEach(clip => {
        document.getElementById(clip.id).src = clip.url;
        document.getElementById(`${clip.id}-desc`).textContent = clip.desc;
      });
      updateRatingDisplay();
    }

    function updateRatingDisplay() {
      const ratingArc = document.getElementById('rating-arc');
      const ratingLabel = document.getElementById('rating-label');
      const ratingStars = document.getElementById('tutor-rating-stars');
      if (tutor.rating) {
        const percentage = (tutor.rating / 5) * 100;
        const dashOffset = 283 - (283 * percentage / 100);
        ratingArc.style.strokeDasharray = '283';
        ratingArc.style.strokeDashoffset = dashOffset;
        ratingLabel.textContent = `${tutor.rating.toFixed(1)}/5`;
        ratingStars.textContent = '★'.repeat(Math.round(tutor.rating)) + '☆'.repeat(5 - Math.round(tutor.rating));
      } else {
        ratingArc.style.strokeDasharray = '0';
        ratingLabel.textContent = 'N/A';
        ratingStars.textContent = 'No rating';
      }
    }

    function openStudentsModal() {
      document.getElementById('students-modal').classList.remove('hidden');
      updateStudentsTable();
      updateOverallProgress();
    }

    function closeStudentsModal() {
      document.getElementById('students-modal').classList.add('hidden');
    }

    function backToStudentsModal() {
      closeStudentDetailsModal();
      openStudentsModal();
    }

    function updateStudentsTable() {
      const tbody = document.getElementById('student-table');
      tbody.innerHTML = '';
      Object.entries(students).forEach(([id, student]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="p-2">${student.name}</td>
          <td class="p-2">${student.subjects.join(', ')}</td>
          <td class="p-2">${student.phone}</td>
          <td class="p-2">${student.email}</td>
          <td class="p-2">${student.nextSession}</td>
          <td class="p-2">
            <div class="relative inline-block progress-circle">
              <svg class="w-12 h-12" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" stroke="#e5e7eb" stroke-width="8" fill="none"/>
                <circle class="student-progress-arc" cx="50" cy="50" r="45" stroke="#3B82F6" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="283" stroke-dashoffset="${283 - (283 * student.progress.overall / 100)}"/>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center font-bold text-sm text-[var(--text)]">${student.progress.overall}%</div>
              <div class="tooltip hidden top-full mt-2 w-48 bg-[var(--modal-bg)] p-3 rounded shadow-lg text-sm text-[var(--text)]">
                <div class="mb-1">Math: <span>${student.progress.math}%</span></div>
                <div class="bg-gray-200 h-2 rounded mb-2">
                  <div class="bg-blue-600 h-2 rounded" style="width:${student.progress.math}%"></div>
                </div>
                <div class="mb-1">Physics: <span>${student.progress.physics}%</span></div>
                <div class="bg-gray-200 h-2 rounded">
                  <div class="bg-green-600 h-2 rounded" style="width:${student.progress.physics}%"></div>
                </div>
              </div>
            </div>
          </td>
          <td class="p-2">
            <button onclick="openStudentDetailsModal(${id})" class="cta-button px-2 py-1 rounded">View</button>
          </td>
        `;
        tbody.appendChild(row);
      });
    }

    function updateOverallProgress() {
      const overallProgressArc = document.getElementById('overall-progress-arc');
      const overallProgressLabel = document.getElementById('overall-progress-label');
      const overallStudentProgress = document.getElementById('overall-student-progress');
      let totalProgress = 0;
      let studentCount = 0;
      Object.values(students).forEach(student => {
        totalProgress += student.progress.overall;
        studentCount++;
      });
      const averageProgress = studentCount ? Math.round(totalProgress / studentCount) : 0;
      const dashOffset = 283 - (283 * averageProgress / 100);
      overallProgressArc.style.strokeDasharray = '283';
      overallProgressArc.style.strokeDashoffset = dashOffset;
      overallProgressLabel.textContent = `${averageProgress}%`;
      overallStudentProgress.innerHTML = Object.entries(students).map(([id, student]) => `
        <div>${student.name}: ${student.progress.overall}%</div>
      `).join('');
    }

    function openStudentDetailsModal(studentId) {
      closeStudentsModal();
      const student = students[studentId];
      const modal = document.getElementById('student-details-modal');
      modal.dataset.studentId = studentId;
      document.getElementById('student-detail-name').textContent = student.name;
      document.getElementById('student-detail-subjects').textContent = `Subjects: ${student.subjects.join(', ')}`;
      document.getElementById('student-detail-session').textContent = `Next Session: ${student.nextSession}`;
      const progressArc = document.getElementById('detail-progress-arc');
      const progressLabel = document.getElementById('detail-progress-label');
      progressArc.style.strokeDasharray = '283';
      progressArc.style.strokeDashoffset = 283 - (283 * student.progress.overall / 100);
      progressLabel.textContent = `${student.progress.overall}%`;
      document.getElementById('detail-subj-math').textContent = `${student.progress.math}%`;
      document.getElementById('detail-bar-math').style.width = `${student.progress.math}%`;
      document.getElementById('detail-subj-physics').textContent = `${student.progress.physics}%`;
      document.getElementById('detail-bar-physics').style.width = `${student.progress.physics}%`;
      const sessionTable = document.getElementById('student-session-history').getElementsByTagName('tbody')[0];
      sessionTable.innerHTML = student.sessions.map(session => `
        <tr>
          <td class="p-2">${session.date}</td>
          <td class="p-2">${session.time}</td>
          <td class="p-2">${session.subjects.join(', ')}</td>
          <td class="p-2">${session.cost} birr</td>
          <td class="p-2">${session.status}</td>
        </tr>
      `).join('');
      modal.classList.remove('hidden');
    }

    function closeStudentDetailsModal() {
      document.getElementById('student-details-modal').classList.add('hidden');
    }

    function openParentProfileModal(studentId) {
      const modal = document.getElementById('parent-profile-modal');
      modal.dataset.studentId = studentId;
      modal.classList.remove('hidden');
    }

    function closeParentProfileModal() {
      document.getElementById('parent-profile-modal').classList.add('hidden');
    }

    function openStudentAnalysisModal(studentId) {
      const student = students[studentId];
      document.getElementById('student-analysis-name').textContent = student.name;
      document.getElementById('analysis-subj-math').textContent = `${student.progress.math}%`;
      document.getElementById('analysis-bar-math').style.width = `${student.progress.math}%`;
      document.getElementById('analysis-subj-physics').textContent = `${student.progress.physics}%`;
      document.getElementById('analysis-bar-physics').style.width = `${student.progress.physics}%`;
      document.getElementById('student-analysis-modal').classList.remove('hidden');
    }

    function closeStudentAnalysisModal() {
      document.getElementById('student-analysis-modal').classList.add('hidden');
    }

    function openSessionSheetModal() {
      document.getElementById('session-sheet-modal').classList.remove('hidden');
    }

    function closeSessionSheetModal() {
      document.getElementById('session-sheet-modal').classList.add('hidden');
    }

    function openSubjectsModal(sessionId) {
      document.getElementById('subjects-modal').dataset.sessionId = sessionId;
      document.getElementById('subjects-modal').classList.remove('hidden');
    }

    function closeSubjectsModal() {
      document.getElementById('subjects-modal').classList.add('hidden');
    }

    function submitSubjects() {
      const sessionId = document.getElementById('subjects-modal').dataset.sessionId;
      const selectedSubjects = Array.from(document.querySelectorAll('#subjects-modal input[type="checkbox"]:checked')).map(input => input.value);
      students[1].sessions.find(s => s.id == sessionId).subjects = selectedSubjects;
      updateStudentsTable();
      closeSubjectsModal();
    }

    function confirmAttendance(sessionId, role) {
      students[1].sessions.find(s => s.id == sessionId).status = "Attended";
      updateStudentsTable();
      document.getElementById(`session-${sessionId}-status`).textContent = "Attended";
      document.getElementById(`session-${sessionId}-confirm`).classList.add('hidden');
      document.getElementById(`session-${sessionId}-wait`).classList.remove('hidden');
      document.getElementById(`session-${sessionId}-makeup`).classList.remove('hidden');
    }

    function confirmWaiting(sessionId, role) {
      students[1].sessions.find(s => s.id == sessionId).status = "Waiting";
      updateStudentsTable();
      document.getElementById(`session-${sessionId}-status`).textContent = "Waiting";
      document.getElementById(`session-${sessionId}-wait`).classList.add('hidden');
      document.getElementById(`session-${sessionId}-makeup`).classList.remove('hidden');
    }

    function proposeMakeup(sessionId) {
      document.getElementById('makeup-modal').dataset.sessionId = sessionId;
      document.getElementById('makeup-modal').classList.remove('hidden');
    }

    function submitMakeup() {
      const sessionId = document.getElementById('makeup-modal').dataset.sessionId;
      const date = document.getElementById('makeup-date').value;
      const time = document.getElementById('makeup-time').value;
      students[1].sessions.find(s => s.id == sessionId).status = `Makeup Proposed: ${date} ${time}`;
      updateStudentsTable();
      document.getElementById(`session-${sessionId}-status`).textContent = `Makeup Proposed: ${date} ${time}`;
      closeMakeupModal();
    }

    function closeMakeupModal() {
      document.getElementById('makeup-modal').classList.add('hidden');
    }

    function openUploadVideoModal() {
      document.getElementById('upload-video-modal').classList.remove('hidden');
    }

    function closeUploadVideoModal() {
      document.getElementById('upload-video-modal').classList.add('hidden');
    }

    function submitVideoUpload() {
      const videoSelect = document.getElementById('video-select').value;
      const videoInput = document.getElementById('upload-video-input');
      const desc = document.getElementById('upload-video-desc-input').value;
      if (videoInput.files[0]) {
        const url = URL.createObjectURL(videoInput.files[0]);
        if (videoSelect === 'intro') {
          tutor.introVideo = { url, desc };
        } else {
          tutor.clips.find(clip => clip.id === videoSelect).url = url;
          tutor.clips.find(clip => clip.id === videoSelect).desc = desc;
        }
        updateProfileDisplay();
        closeUploadVideoModal();
      }
    }

    function openVideoDescModal(videoId) {
      document.getElementById('video-desc-modal').dataset.videoId = videoId;
      const video = videoId === 'intro' ? tutor.introVideo : tutor.clips.find(clip => clip.id === videoId);
      document.getElementById('video-desc-input').value = video.desc;
      document.getElementById('video-desc-modal').classList.remove('hidden');
    }

    function closeVideoDescModal() {
      document.getElementById('video-desc-modal').classList.add('hidden');
    }

    function submitVideoDesc() {
      const videoId = document.getElementById('video-desc-modal').dataset.videoId;
      const desc = document.getElementById('video-desc-input').value;
      if (videoId === 'intro') {
        tutor.introVideo.desc = desc;
      } else {
        tutor.clips.find(clip => clip.id === videoId).desc = desc;
      }
      updateProfileDisplay();
      closeVideoDescModal();
    }

    function openCommentModal() {
      document.getElementById('comment-modal').classList.remove('hidden');
    }

    function closeCommentModal() {
      document.getElementById('comment-modal').classList.add('hidden');
    }

    function openVideoCommentModal(videoId) {
      document.getElementById('comment-modal').dataset.videoId = videoId;
      document.getElementById('comments-list').innerHTML = `<p>Comments for ${videoId} (to be implemented)</p>`;
      document.getElementById('comment-modal').classList.remove('hidden');
    }

    function openShareModal(videoId) {
      const video = videoId === 'intro' ? tutor.introVideo : tutor.clips.find(clip => clip.id === videoId);
      document.getElementById('share-url').value = video.url;
      document.getElementById('share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(video.url)}`;
      document.getElementById('share-instagram').href = `https://www.instagram.com/?url=${encodeURIComponent(video.url)}`;
      document.getElementById('share-youtube').href = `https://www.youtube.com/share?url=${encodeURIComponent(video.url)}`;
      document.getElementById('share-tiktok').href = `https://www.tiktok.com/share?url=${encodeURIComponent(video.url)}`;
      document.getElementById('share-telegram').href = `https://t.me/share/url?url=${encodeURIComponent(video.url)}`;
      document.getElementById('share-modal').classList.remove('hidden');
    }

    function closeShareModal() {
      document.getElementById('share-modal').classList.add('hidden');
    }

    function copyLink() {
      const url = document.getElementById('share-url').value;
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }

    function openReferralModal() {
      const referralCode = 'AMAN123';
      document.getElementById('referral-code-value').textContent = referralCode;
      const referralLink = `https://astegni.et/referral?code=${referralCode}`;
      document.getElementById('referral-link').value = referralLink;
      document.getElementById('referral-share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
      document.getElementById('referral-share-telegram').href = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}`;
      document.getElementById('referral-modal').classList.remove('hidden');
    }

    function closeReferralModal() {
      document.getElementById('referral-modal').classList.add('hidden');
    }

    function copyReferralLink() {
      const referralLink = document.getElementById('referral-link').value;
      navigator.clipboard.writeText(referralLink);
      alert('Referral link copied to clipboard!');
    }

    function openNotificationModal() {
      document.getElementById('notification-modal').classList.remove('hidden');
    }

    function closeNotificationModal() {
      document.getElementById('notification-modal').classList.add('hidden');
    }

    function openChatModal(studentId = null, role = 'student') {
      document.getElementById('chat-modal').dataset.studentId = studentId || '';
      document.getElementById('chat-modal').dataset.role = role;
      document.getElementById('chat-student-name').textContent = studentId ? students[studentId].name : 'Chat';
      document.getElementById('chat-messages').innerHTML = '<p>No messages yet.</p>';
      document.getElementById('chat-modal').classList.remove('hidden');
    }

    function closeChatModal() {
      document.getElementById('chat-modal').classList.add('hidden');
    }

    function sendMessage() {
      const message = document.getElementById('chat-input').value;
      if (message.trim()) {
        const messages = document.getElementById('chat-messages');
        messages.innerHTML += `<p><strong>You:</strong> ${message}</p>`;
        document.getElementById('chat-input').value = '';
        messages.scrollTop = messages.scrollHeight;
      }
    }

    function openVideoCallModal(studentId) {
      document.getElementById('video-call-modal').dataset.studentId = studentId;
      document.getElementById('video-call-modal').classList.remove('hidden');
    }

    function closeVideoCallModal() {
      document.getElementById('video-call-modal').classList.add('hidden');
    }

    function addStudentComment(studentId) {
      document.getElementById('commentStudent').dataset.studentId = studentId;
      document.getElementById('commentStudent').classList.remove('hidden');
    }

    function closeStudentCommentModal() {
      document.getElementById('commentStudent').classList.add('hidden');
    }

    function submitStudentComment(studentId, comment) {
      // Placeholder for submitting comment
      alert(`Comment for student ${studentId}: ${comment}`);
      closeStudentCommentModal();
    }

    function getLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            tutor.address = `${position.coords.latitude}, ${position.coords.longitude}`;
            document.getElementById('profile-location').value = tutor.address;
            updateProfileDisplay();
          },
          () => {
            document.getElementById('location-error').classList.remove('hidden');
          }
        );
      } else {
        document.getElementById('location-error').classList.remove('hidden');
      }
    }

    function captureSelfie() {
      alert('Selfie capture functionality to be implemented.');
    }

    function requestSchoolListing() {
      document.getElementById('school-request-modal').classList.remove('hidden');
    }

    function closeSchoolRequestModal() {
      document.getElementById('school-request-modal').classList.add('hidden');
    }

    function submitSchoolRequest() {
      const schoolName = document.getElementById('request-school-name').value;
      const email = document.getElementById('request-school-email').value;
      if (schoolName && email.includes('@')) {
        alert(`School listing request submitted for ${schoolName}`);
        closeSchoolRequestModal();
      } else {
        document.getElementById('request-school-error').classList.remove('hidden');
        document.getElementById('request-school-email-error').classList.toggle('hidden', email.includes('@'));
      }
    }

    // Initialize profile display
    updateProfileDisplay();