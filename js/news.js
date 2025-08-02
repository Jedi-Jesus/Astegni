let isLoggedIn = false; // Toggle to true for logged-in state
    let favoriteNews = {};
    let savedNews = {};
    let historyNews = [];
    let comments = [];
    let isSpeaking = false;
    let utterance = null;
    const adImages = [
      'https://via.placeholder.com/728x90?text=Ad+1',
      'https://via.placeholder.com/728x90?text=Ad+2',
      'https://via.placeholder.com/728x90?text=Ad+3'
    ];
    let currentAdIndex = 0;

    document.addEventListener('DOMContentLoaded', () => {
      const navLinks = document.getElementById('nav-links');
      const mobileMenu = document.getElementById('mobile-menu');

      // Navigation Links
      const loggedInNav = `
        <a href="news.html" class="hover:text-[var(--nav-link-hover)]">News</a>
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

      const loggedOutNav = `
        <a href="login.html" class="hover:text-[var(--nav-link-hover)]">Login</a>
        <a href="register.html" class="hover:text-[var(--nav-link-hover)]">Register</a>
        <button id="theme-toggle" class="flex items-center">
          <span id="theme-icon" class="text-2xl">☀</span>
        </button>
      `;

      const loggedInMobileNav = `
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

      const loggedOutMobileNav = `
        <a href="login.html" class="block py-2 px-4 hover:bg-[var(--button-hover)]">Login</a>
        <a href="register.html" class="block py-2 px-4 hover:bg-[var(--button-hover)]">Register</a>
      `;

      navLinks.innerHTML = isLoggedIn ? loggedInNav : loggedOutNav;
      mobileMenu.innerHTML = isLoggedIn ? loggedInMobileNav : loggedOutMobileNav;

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

      if (isLoggedIn) {
        function toggleProfileDropdown() {
          profileDropdown.classList.toggle('hidden');
        }

        function toggleMobileProfileDropdown() {
          mobileProfileDropdown.classList.toggle('hidden');
        }

        profileDropdownBtn.addEventListener('click', toggleProfileDropdown);
        mobileProfileDropdownBtn.addEventListener('click', toggleMobileProfileDropdown);

        // Close dropdowns on outside click
        document.addEventListener('click', (event) => {
          if (!profileDropdownBtn.contains(event.target) && !profileDropdown.contains(event.target)) {
            profileDropdown.classList.add('hidden');
          }
          if (!mobileProfileDropdownBtn.contains(event.target) && !mobileProfileDropdown.contains(event.target)) {
            mobileProfileDropdown.classList.add('hidden');
          }
        });
      }

      // Mock News Data
      const newsData = [
        {
          id: 'news1',
          title: 'New Tutoring Program Launched',
          image: 'https://via.placeholder.com/320x180',
          date: '2025-07-25',
          author: 'Jane Smith',
          content: 'ASTEGNI has launched a new tutoring program to enhance student learning outcomes...',
          videos: [
            { id: 'video1', src: 'https://via.placeholder.com/320x180.mp4', desc: 'Program Overview' },
            { id: 'video2', src: 'https://via.placeholder.com/320x180.mp4', desc: 'Tutor Training' }
          ]
        },
        {
          id: 'news2',
          title: 'ASTEGNI Partners with Local Schools',
          image: 'https://via.placeholder.com/320x180',
          date: '2025-07-20',
          author: 'John Doe',
          content: 'A new partnership with local schools aims to provide free tutoring sessions...',
          videos: [
            { id: 'video3', src: 'https://via.placeholder.com/320x180.mp4', desc: 'Partnership Highlights' }
          ]
        },
        {
          id: 'news3',
          title: 'Online Learning Tools Updated',
          image: 'https://via.placeholder.com/320x180',
          date: '2025-07-15',
          author: 'Emily Johnson',
          content: 'ASTEGNI has updated its online learning tools to include interactive quizzes...',
          videos: []
        }
      ];

      // Populate News List
      const newsList = document.getElementById('news-list');
      function renderNewsList(data) {
        newsList.innerHTML = data.map(news => `
          <div class="news-card bg-[var(--highlight)] rounded-lg shadow-lg p-4 cursor-pointer" onclick="openNewsDetailModal('${news.id}')">
            <img src="${news.image}" alt="${news.title}" class="w-full h-48 object-cover rounded-lg mb-2">
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-lg font-semibold text-[var(--heading)]">${news.title}</h3>
              <div class="flex space-x-2">
                <svg id="fav-${news.id}" class="w-6 h-6 cursor-pointer ${favoriteNews[news.id] ? 'fill-red-500' : 'fill-none'}" onclick="toggleFavorite('${news.id}', event)" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                </svg>
                <svg id="save-${news.id}" class="w-6 h-6 cursor-pointer ${savedNews[news.id] ? 'fill-yellow-500' : 'fill-none'}" onclick="toggleSave('${news.id}', event)" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                </svg>
              </div>
            </div>
            <p class="text-[var(--text)] text-sm">By ${news.author}</p>
            <p class="text-[var(--text)] text-sm">${news.date}</p>
          </div>
        `).join('');
      }
      renderNewsList(newsData);

      // Filter Buttons Functionality
      const allNewsBtn = document.getElementById('all-news-btn');
      const latestBtn = document.getElementById('latest-btn');
      const historyBtn = document.getElementById('history-btn');
      const favoritesBtn = document.getElementById('favorites-btn');
      const savedBtn = document.getElementById('saved-btn');

      function setActiveButton(activeBtn) {
        [allNewsBtn, latestBtn, historyBtn, favoritesBtn, savedBtn].forEach(btn => {
          btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
          btn.classList.add('bg-gray-600', 'hover:bg-gray-700');
        });
        activeBtn.classList.remove('bg-gray-600', 'hover:bg-gray-700');
        activeBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
      }

      allNewsBtn.addEventListener('click', () => {
        setActiveButton(allNewsBtn);
        renderNewsList(newsData);
      });

      latestBtn.addEventListener('click', () => {
        setActiveButton(latestBtn);
        const today = new Date('2025-07-27');
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        const latestNews = newsData.filter(news => new Date(news.date) >= sevenDaysAgo);
        renderNewsList(latestNews);
      });

      historyBtn.addEventListener('click', () => {
        setActiveButton(historyBtn);
        renderNewsList(historyNews.length > 0 ? historyNews : []);
      });

      favoritesBtn.addEventListener('click', () => {
        setActiveButton(favoritesBtn);
        const favNews = newsData.filter(news => favoriteNews[news.id]);
        renderNewsList(favNews);
      });

      savedBtn.addEventListener('click', () => {
        setActiveButton(savedBtn);
        const saved = newsData.filter(news => savedNews[news.id]);
        renderNewsList(saved);
      });

      // Search Bar Functionality
      const navSearch = document.getElementById('nav-search');
      navSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const newsCards = document.querySelectorAll('.news-card');
        newsCards.forEach(card => {
          const title = card.querySelector('h3').textContent.toLowerCase();
          card.style.display = title.includes(searchTerm) ? 'block' : 'none';
        });
      });

      // Ad Rotation
      const adImage = document.getElementById('ad-image');
      function rotateAd() {
        currentAdIndex = (currentAdIndex + 1) % adImages.length;
        adImage.src = adImages[currentAdIndex];
      }
      setInterval(rotateAd, 7000);

      // Typing Animation
      function typeWriter(element, text, speed, callback) {
        element.textContent = '';
        element.classList.add('typewriter');
        let i = 0;
        function type() {
          if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
          } else {
            element.classList.remove('typewriter');
            if (callback) callback();
          }
        }
        type();
      }

      // Modal Functions
      window.openNewsDetailModal = function(newsId) {
        const news = newsData.find(n => n.id === newsId);
        if (!news) return;

        // Add to history
        if (!historyNews.find(n => n.id === newsId)) {
          historyNews.push(news);
        }

        const modal = document.getElementById('news-detail-modal');
        const titleElement = document.getElementById('news-title');
        const contentElement = document.getElementById('news-content');
        document.getElementById('news-image').src = news.image;
        document.getElementById('news-author').textContent = `By ${news.author}`;
        document.getElementById('news-date').textContent = news.date;

        // Typewriter animation for title, then content
        titleElement.textContent = '';
        contentElement.textContent = '';
        typeWriter(titleElement, news.title, 50, () => {
          typeWriter(contentElement, news.content, 30);
        });

        const videosContainer = document.getElementById('news-videos').querySelector('div');
        videosContainer.innerHTML = news.videos.length > 0
          ? news.videos.map(video => `
              <div>
                <video controls class="w-full rounded-lg" id="${video.id}">
                  <source src="${video.src}" type="video/mp4">
                  Your browser does not support the video tag.
                </video>
                <p class="text-[var(--text)] mt-2">${video.desc}</p>
              </div>
            `).join('')
          : '<p class="text-[var(--text)]">No videos available.</p>';

        const otherNewsContainer = document.getElementById('other-news');
        otherNewsContainer.innerHTML = newsData
          .filter(n => n.id !== newsId)
          .map(n => `
            <div class="news-card bg-[var(--highlight)] rounded-lg shadow-lg p-4 cursor-pointer" onclick="openNewsDetailModal('${n.id}')">
              <img src="${n.image}" alt="${n.title}" class="w-full h-32 object-cover rounded-lg mb-2">
              <h3 class="text-lg font-semibold text-[var(--heading)]">${n.title}</h3>
              <p class="text-[var(--text)] text-sm">By ${n.author}</p>
              <p class="text-[var(--text)] text-sm">${n.date}</p>
            </div>
          `).join('');

        // Read Aloud Setup (Future: Replace with Eleven Labs integration)
        const readBtn = document.getElementById('read-btn');
        const readIcon = document.getElementById('read-icon');
        const stopBtn = document.getElementById('stop-btn');
        const restartBtn = document.getElementById('restart-btn');

        if (utterance) {
          speechSynthesis.cancel();
          isSpeaking = false;
        }

        readBtn.onclick = () => {
          if (isSpeaking) {
            speechSynthesis.pause();
            isSpeaking = false;
            readBtn.innerHTML = `
              <svg id="read-icon" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
              </svg>
              Read
            `;
          } else {
            if (!utterance) {
              utterance = new SpeechSynthesisUtterance(`${news.title}. ${news.content}`);
              utterance.lang = 'en-US';
              utterance.onend = () => {
                isSpeaking = false;
                readBtn.innerHTML = `
                  <svg id="read-icon" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
                  </svg>
                  Read
                `;
                utterance = null;
              };
            }
            speechSynthesis.speak(utterance);
            isSpeaking = true;
            readBtn.innerHTML = `
              <svg id="read-icon" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6"></path>
              </svg>
              Pause
            `;
          }
        };

        stopBtn.onclick = () => {
          speechSynthesis.cancel();
          isSpeaking = false;
          readBtn.innerHTML = `
            <svg id="read-icon" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
            </svg>
            Read
          `;
          utterance = null;
        };

        restartBtn.onclick = () => {
          speechSynthesis.cancel();
          utterance = new SpeechSynthesisUtterance(`${news.title}. ${news.content}`);
          utterance.lang = 'en-US';
          utterance.onend = () => {
            isSpeaking = false;
            readBtn.innerHTML = `
              <svg id="read-icon" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
              </svg>
              Read
            `;
            utterance = null;
          };
          speechSynthesis.speak(utterance);
          isSpeaking = true;
          readBtn.innerHTML = `
            <svg id="read-icon" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6"></path>
            </svg>
            Pause
          `;
        };

        modal.classList.remove('hidden');
      };

      window.closeNewsDetailModal = function() {
        speechSynthesis.cancel();
        isSpeaking = false;
        utterance = null;
        document.getElementById('news-detail-modal').classList.add('hidden');
      };

      window.toggleFavorite = function(newsId, event) {
        event.stopPropagation();
        const favIcon = document.getElementById(`fav-${newsId}`);
        favoriteNews[newsId] = !favoriteNews[newsId];
        favIcon.classList.toggle('fill-red-500', favoriteNews[newsId]);
        favIcon.classList.toggle('fill-none', !favoriteNews[newsId]);
      };

      window.toggleSave = function(newsId, event) {
        event.stopPropagation();
        const saveIcon = document.getElementById(`save-${newsId}`);
        savedNews[newsId] = !savedNews[newsId];
        saveIcon.classList.toggle('fill-yellow-500', savedNews[newsId]);
        saveIcon.classList.toggle('fill-none', !savedNews[newsId]);
      };

      window.openNotesModal = function() {
        document.getElementById('notes-modal').classList.remove('hidden');
      };

      window.closeNotesModal = function() {
        document.getElementById('notes-modal').classList.add('hidden');
      };

      window.openManageFinancesModal = function() {
        document.getElementById('manage-finances-modal').classList.remove('hidden');
      };

      window.closeManageFinancesModal = function() {
        document.getElementById('manage-finances-modal').classList.add('hidden');
      };

      window.openCommentRateModal = function() {
        const modal = document.getElementById('comment-rate-modal');
        modal.classList.remove('hidden');
        document.getElementById('usability-rating').addEventListener('input', () => {
          document.getElementById('usability-value').textContent = document.getElementById('usability-rating').value;
        });
        document.getElementById('service-rating').addEventListener('input', () => {
          document.getElementById('service-value').textContent = document.getElementById('service-rating').value;
        });
      };

      window.closeCommentRateModal = function() {
        document.getElementById('comment-rate-modal').classList.add('hidden');
      };

      window.submitCommentRate = function() {
        const comment = document.getElementById('comment-input').value;
        const usability = document.getElementById('usability-rating').value;
        const service = document.getElementById('service-rating').value;
        if (comment.trim()) {
          comments.push(comment);
          document.getElementById('submitted-comments').innerHTML = comments.map(c => `<p class="text-[var(--text)]">${c}</p>`).join('');
          document.getElementById('comment-input').value = '';
        }
        alert(`Submitted: Comment - ${comment || 'No comment'}, Usability ${usability}/5, Service ${service}/5`);
        closeCommentRateModal();
      };

      window.openShareProfileModal = function() {
        const modal = document.getElementById('share-profile-modal');
        const profileLink = document.getElementById('profile-link');
        profileLink.value = window.location.href;
        document.getElementById('profile-share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
        document.getElementById('profile-share-telegram').href = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}`;
        modal.classList.remove('hidden');
      };

      window.closeShareProfileModal = function() {
        document.getElementById('share-profile-modal').classList.add('hidden');
      };

      window.copyProfileLink = function() {
        const profileLink = document.getElementById('profile-link');
        profileLink.select();
        document.execCommand('copy');
        alert('Link copied to clipboard!');
      };

      window.openNotificationModal = function() {
        alert('Notifications modal to be implemented.');
      };
    });