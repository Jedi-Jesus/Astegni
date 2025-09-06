
    let followingStatus = {};
    let followerCount = 0;

    document.addEventListener('DOMContentLoaded', () => {
      const desktopNav = document.getElementById('desktop-nav');
      const mobileMenu = document.getElementById('mobile-menu');

      const navLinks = `
        <a href="news.html" class="hover:text-[var(--nav-link-hover)]">News</a>
        <a href="find-tutors.html" class="hover:text-[var(--nav-link-hover)]">Find tutors</a>
        <a href="reels.html" class="hover:text-[var(--nav-link-hover)]">Reels</a>
        <a href="store.html" class="hover:text-[var(--nav-link-hover)]">Store</a>
        <a href="find-a-job.html" class="hover:text-[var(--nav-link-hover)]">Find a Job</a>
        <div class="relative">
          <button id="profile-dropdown-btn" class="flex items-center hover:text-[var(--nav-link-hover)]">
            Profile
            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          <div id="profile-dropdown" class="hidden absolute z-30 bg-[var(--modal-bg)] rounded-lg shadow-lg mt-2 w-48">
            <a href="view-profile.html" class="block px-4 py-2 hover:bg-[var(--button-hover)]">View Profile</a>
            <button onclick="openNotesModal()" class="block w-full text-left px-4 py-2 hover:bg-[var(--button-hover)]">Notes</button>
            <button onclick="openManageFinancesModal()" class="block w-full text-left px-4 py-2 hover:bg-[var(--button-hover)]">Manage Finances</button>
            <button onclick="openCommentRateModal()" class="block w-full text-left px-4 py-2 hover:bg-[var(--button-hover)]">Comment & Rate</button>
            <button onclick="openShareProfileModal()" class="block w-full text-left px-4 py-2 hover:bg-[var(--button-hover)]">Share Us</button>
          </div>
        </div>
        <a href="#" onclick="openNotificationModal()" class="relative hover:text-[var(--nav-link-hover)]">
          Notifications
          <span id="notification-dot" class="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full hidden"></span>
        </a>
        <button id="theme-toggle" class="flex items-center">
          <span id="theme-icon" class="text-2xl">☀</span>
        </button>
      `;

      const mobileNavLinks = `
        <a href="news.html" class="block py-2 px-4 hover:bg-[var(--button-hover)]">News</a>
        <a href="reels.html" class="block py-2 px-4 hover:bg-[var(--button-hover)]">Reels</a>
        <a href="store.html" class="block py-2 px-4 hover:bg-[var(--button-hover)]">Store</a>
        <a href="find-a-job.html" class="block py-2 px-4 hover:bg-[var(--button-hover)]">Find a Job</a>
        <div class="relative">
          <button id="mobile-profile-dropdown-btn" class="flex items-center w-full py-2 px-4 hover:bg-[var(--button-hover)]">
            Profile
            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          <div id="mobile-profile-dropdown" class="hidden bg-[var(--modal-bg)] rounded-lg shadow-lg mt-2 w-full">
            <a href="view-profile.html" class="block px-4 py-2 hover:bg-[var(--button-hover)]">View Profile</a>
            <button onclick="openNotesModal()" class="block w-full text-left px-4 py-2 hover:bg-[var(--button-hover)]">Notes</button>
            <button onclick="openManageFinancesModal()" class="block w-full text-left px-4 py-2 hover:bg-[var(--button-hover)]">Manage Finances</button>
            <button onclick="openCommentRateModal()" class="block w-full text-left px-4 py-2 hover:bg-[var(--button-hover)]">Comment & Rate</button>
            <button onclick="openShareProfileModal()" class="block w-full text-left px-4 py-2 hover:bg-[var(--button-hover)]">Share Us</button>
          </div>
        </div>
        <button onclick="openNotificationModal()" class="block py-2 px-4 hover:bg-[var(--button-hover)] w-full text-left relative">
          Notifications
          <span id="mobile-notification-dot" class="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full hidden"></span>
        </button>
      `;

      desktopNav.innerHTML = navLinks;
      mobileMenu.innerHTML = mobileNavLinks;

      // Theme Toggle
      const themeToggle = document.getElementById('theme-toggle');
      const themeIcon = document.getElementById('theme-icon');
      const currentTheme = localStorage.getItem('theme') || 'light';
      document.documentElement.setAttribute('data-theme', currentTheme);
      themeIcon.textContent = currentTheme === 'light' ? '☀' : '🌙';

      themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeIcon.textContent = newTheme === 'light' ? '☀' : '🌙';
      });

      // Mobile Menu Toggle
      const menuBtn = document.getElementById('menu-btn');
      menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
      });

      // Profile Dropdown Toggle
      const profileDropdownBtn = document.getElementById('profile-dropdown-btn');
      const profileDropdown = document.getElementById('profile-dropdown');
      const mobileProfileDropdownBtn = document.getElementById('mobile-profile-dropdown-btn');
      const mobileProfileDropdown = document.getElementById('mobile-profile-dropdown');

      function toggleProfileDropdown() {
        profileDropdown.classList.toggle('hidden');
      }

      function toggleMobileProfileDropdown() {
        mobileProfileDropdown.classList.toggle('hidden');
      }

      profileDropdownBtn.addEventListener('click', toggleProfileDropdown);
      mobileProfileDropdownBtn.addEventListener('click', toggleMobileProfileDropdown);

      // Video Tabs
      const tabs = document.querySelectorAll('.tab');
      const tabContents = document.querySelectorAll('.tab-content');

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tabContents.forEach(content => content.classList.remove('active'));

          tab.classList.add('active');
          document.getElementById(tab.dataset.tab).classList.add('active');
        });
      });

      // Video Search
      const videoSearch = document.getElementById('video-search');
      videoSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const videos = document.querySelectorAll('.tab-content.active video');
        const videoDescriptions = document.querySelectorAll('.tab-content.active p[id$="-desc"]');

        videos.forEach((video, index) => {
          const desc = videoDescriptions[index].textContent.toLowerCase();
          const parentDiv = video.closest('div');
          parentDiv.style.display = desc.includes(searchTerm) ? 'block' : 'none';
        });
      });

      // Mock data for tutor profile
      const tutorData = {
        name: "John Doe",
        rating: 4.5,
        raters: 50,
        followers: 120,
        courses: ["Mathematics", "Physics", "Chemistry"],
        grades: ["Grade 9", "Grade 10", "Grade 11"],
        experiences: ["5 years teaching Mathematics", "3 years tutoring Physics"],
        teachesAt: "Addis Ababa University",
        tutoringMode: "Online and In-Person",
        bio: "Experienced tutor specializing in Math and Physics with over 5 years of teaching experience.",
        certifications: ["Mathematics Certification", "Physics Teaching License"],
        achievements: ["Best Tutor Award 2023", "Outstanding Educator 2024"],
        socials: [
          { platform: "LinkedIn", url: "https://linkedin.com/in/johndoe" },
          { platform: "Twitter", url: "https://twitter.com/johndoe" }
        ]
      };

      // Initialize follower count
      followerCount = tutorData.followers;

      // Populate tutor profile
      document.getElementById('tutor-name').textContent = tutorData.name;
      document.getElementById('tutor-rating-stars').textContent = '★★★★☆';
      document.getElementById('tutor-rating-count').textContent = `(${tutorData.raters} people)`;
      document.getElementById('follower-number').textContent = tutorData.followers;
      document.getElementById('tutor-courses').textContent = `Courses: ${tutorData.courses.join(', ')}`;
      document.getElementById('tutor-grades').textContent = `Grades: ${tutorData.grades.join(', ')}`;
      document.getElementById('tutor-experiences').textContent = `Experiences: ${tutorData.experiences.join(', ')}`;
      document.getElementById('tutor-school').textContent = `Teaches at: ${tutorData.teachesAt}`;
      document.getElementById('tutor-mode').textContent = `Tutoring Mode: ${tutorData.tutoringMode}`;
      document.getElementById('tutor-bio').textContent = tutorData.bio;
      document.getElementById('view-profile-socials').innerHTML = tutorData.socials.map(social => `
        <a href="${social.url}" target="_blank" class="text-blue-500 hover:underline">${social.platform}</a>
      `).join('');

      // Update rating arc
      const ratingArc = document.getElementById('rating-arc');
      const ratingLabel = document.getElementById('rating-label');
      const rating = tutorData.rating;
      const circumference = 2 * Math.PI * 45;
      const offset = circumference - (rating / 5) * circumference;
      ratingArc.style.strokeDashoffset = offset;
      ratingLabel.textContent = rating.toFixed(1);

      // Populate modals with mock data
      document.getElementById('certifications-list').innerHTML = tutorData.certifications.map(cert => `<p class="text-[var(--text)]">${cert}</p>`).join('');
      document.getElementById('achievements-list').innerHTML = tutorData.achievements.map(ach => `<p class="text-[var(--text)]">${ach}</p>`).join('');
    });

    // Modal Functions
    function openToolsModal() {
      document.getElementById('tools-modal').classList.remove('hidden');
    }

    function closeToolsModal() {
      document.getElementById('tools-modal').classList.add('hidden');
    }

    // Improved handleNavLinkClick function for coming soon features
window.handleNavLinkClick = function(e, link) {
    // Define coming soon features
    const comingSoonFeatures = ['news', 'store', 'find-jobs'];
    
    // Check if it's a coming soon feature
    if (comingSoonFeatures.includes(link)) {
        e.preventDefault();
        e.stopPropagation();
        openComingSoonModal(link);
        return false;
    }
    
    // Existing protected pages logic
    if (APP_STATE.isLoggedIn) return true;
    
    const protectedPages = ['find-tutors', 'reels'];
    if (protectedPages.includes(link)) {
        e.preventDefault();
        e.stopPropagation();
        showToast(`Please login to access ${link.replace("-", " ")}`, "warning");
        openModal("login-modal");
        return false;
    }
    
    return true;
};


    function openNotificationModal() {
      document.getElementById('notification-modal').classList.remove('hidden');
    }

    function closeNotificationModal() {
      document.getElementById('notification-modal').classList.add('hidden');
    }

    function openNotesModal() {
      alert('This is notes modal');
    }

    function openCertificationsModal() {
      document.getElementById('certifications-modal').classList.remove('hidden');
    }

    function closeCertificationsModal() {
      document.getElementById('certifications-modal').classList.add('hidden');
    }

    function openAchievementsModal() {
      document.getElementById('achievements-modal').classList.remove('hidden');
    }

    function closeAchievementsModal() {
      document.getElementById('achievements-modal').classList.add('hidden');
    }
    function openCommentModal() {
      document.getElementById('comment-modal').classList.remove('hidden');
      document.getElementById('comments-list').innerHTML = '<p class="text-[var(--text)]">No comments yet.</p>';
    }

    function closeCommentModal() {
      document.getElementById('comment-modal').classList.add('hidden');
    }
    
    function openPackagesModal() {
      document.getElementById('packagesModal').classList.remove('hidden');
    }

    function closePackages() {
      document.getElementById('packagesModal').classList.add('hidden');
    }

    function openPlaylistModal(playlistId) {
      const modal = document.getElementById('playlist-modal');
      const title = document.getElementById('playlist-modal-title');
      const videoPlayer = document.getElementById('playlist-video-player');
      const videoDesc = document.getElementById('playlist-video-desc');
      const videoList = document.getElementById('playlist-video-list');

      title.textContent = playlistId.replace('-', ' ').toUpperCase();
      videoPlayer.querySelector('source').src = `https://via.placeholder.com/640x360.mp4`;
      videoPlayer.load();
      videoDesc.textContent = `${playlistId.replace('-', ' ')} Playlist Video`;
      videoList.innerHTML = `
        <div class="mb-2 cursor-pointer" onclick="playVideo('video1')">${playlistId} Video 1</div>
        <div class="mb-2 cursor-pointer" onclick="playVideo('video2')">${playlistId} Video 2</div>
      `;
      modal.classList.remove('hidden');
    }

    function playVideo(videoId) {
      const videoPlayer = document.getElementById('playlist-video-player');
      videoPlayer.querySelector('source').src = `https://via.placeholder.com/640x360.mp4?${videoId}`;
      videoPlayer.load();
      videoPlayer.play();
    }

    function closePlaylistModal() {
      document.getElementById('playlist-modal').classList.add('hidden');
    }

    function openCommentRateModal() {
      const modal = document.getElementById('comment-rate-modal');
      modal.classList.remove('hidden');
      document.getElementById('usability-rating').addEventListener('input', () => {
        document.getElementById('usability-value').textContent = document.getElementById('usability-rating').value;
      });
      document.getElementById('service-rating').addEventListener('input', () => {
        document.getElementById('service-value').textContent = document.getElementById('service-rating').value;
      });
    }

    function closeCommentRateModal() {
      document.getElementById('comment-rate-modal').classList.add('hidden');
    }

    function submitCommentRate() {
      const comment = document.getElementById('comment-input').value;
      const usability = document.getElementById('usability-rating').value;
      const service = document.getElementById('service-rating').value;
      alert(`Submitted: Comment - ${comment || 'No comment'}, Usability ${usability}/5, Service ${service}/5`);
      closeCommentRateModal();
    }

    function openShareProfileModal() {
      const modal = document.getElementById('share-profile-modal');
      const profileLink = document.getElementById('profile-link');
      profileLink.value = window.location.href;
      document.getElementById('profile-share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
      document.getElementById('profile-share-telegram').href = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}`;
      modal.classList.remove('hidden');
    }

    function closeShareProfileModal() {
      document.getElementById('share-profile-modal').classList.add('hidden');
    }

    function copyProfileLink() {
      const profileLink = document.getElementById('profile-link');
      profileLink.select();
      document.execCommand('copy');
      alert('Profile link copied to clipboard!');
    }

    function openRequestSessionModal() {
      document.getElementById('request-session-modal').classList.remove('hidden');
    }

    function closeRequestSessionModal() {
      document.getElementById('request-session-modal').classList.add('hidden');
    }

    function toggleChildSearch() {
      const childInput = document.getElementById('session-child');
      const childSuggestions = document.getElementById('session-child-suggestions');
      const selfCheckbox = document.getElementById('session-self');
      childInput.disabled = selfCheckbox.checked;
      if (selfCheckbox.checked) {
        childSuggestions.classList.add('hidden');
      }
    }

    function submitSessionRequest() {
      const child = document.getElementById('session-child').value;
      const courses = Array.from(document.querySelectorAll('.session-course:checked')).map(cb => cb.value);
      const days = Array.from(document.querySelectorAll('input[type="checkbox"]:not(.session-course):checked')).map(cb => cb.value);
      const date = document.getElementById('session-date').value;
      const time = document.getElementById('session-time').value;
      const duration = document.getElementById('session-duration').value;
      const mode = document.getElementById('session-mode').value;

      alert(`Session requested: ${child}, Courses: ${courses.join(', ') || 'None'}, ${days.join(', ') || 'No days'}, ${date}, ${time}, ${duration} minutes, ${mode}`);
      closeRequestSessionModal();
    }

    function openVideoCallModal() {
      document.getElementById('video-call-modal').classList.remove('hidden');
    }

    function closeVideoCallModal() {
      document.getElementById('video-call-modal').classList.add('hidden');
    }

    function openShareModal(videoId) {
      const modal = document.getElementById('share-modal');
      const shareUrl = document.getElementById('share-url');
      shareUrl.value = `${window.location.href}#${videoId}`;
      document.getElementById('share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl.value)}`;
      document.getElementById('share-telegram').href = `https://t.me/share/url?url=${encodeURIComponent(shareUrl.value)}`;
      modal.classList.remove('hidden');
    }

    function closeShareModal() {
      document.getElementById('share-modal').classList.add('hidden');
    }

    function copyLink() {
      const shareUrl = document.getElementById('share-url');
      shareUrl.select();
      document.execCommand('copy');
      alert('Link copied to clipboard!');
    }

    function openManageFinancesModal() {
      alert('Manage Finances modal to be implemented.');
    }

    function followTutor() {
      const followIcon = document.getElementById('follow-icon');
      const tutorId = 'tutor123'; // Mock tutor ID
      const followerNumber = document.getElementById('follower-number');

      if (followingStatus[tutorId]) {
        followingStatus[tutorId] = false;
        followerCount--;
        followIcon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        `;
      } else {
        followingStatus[tutorId] = true;
        followerCount++;
        followIcon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
        `;
      }
      followerNumber.textContent = followerCount;
    }
    function toggleFollowButton() {
      const followButton = document.getElementById('follow-button');
      if (followButton.classList.contains('following')) {
        followButton.classList.remove('following');
        followButton.textContent = 'Follow';
      } else {
        followButton.classList.add('following');
        followButton.textContent = 'Following';
      }
    }