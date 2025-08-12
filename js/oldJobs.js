
    let isLoggedIn = false; // Toggle to true for logged-in state
    let favoriteJobs = {};
    let savedJobs = {};
    const adImages = [
      'https://via.placeholder.com/728x90?text=Ad+1',
      'https://via.placeholder.com/728x90?text=Ad+2',
      'https://via.placeholder.com/728x90?text=Ad+3'
    ];
    let currentAdIndex = 0;

    // Mock Job Data
    const jobData = [
      {
        id: 'job1',
        title: 'Software Engineer',
        company: 'Tech Corp',
        companyLink: 'https://techcorp.com',
        agencyPic: 'https://via.placeholder.com/50',
        coverPhoto: 'https://via.placeholder.com/728x200',
        rating: 4,
        phone: '+251-912-345-678',
        email: 'hr@techcorp.com',
        location: 'Addis Ababa, Ethiopia',
        brief: 'Develop and maintain web applications.',
        description: 'Join our team to build scalable web applications using modern technologies like React and Node.js...',
        documents: 'Resume, Cover Letter',
        experience: '3+ years in software development',
        period: '2025-08-01 to 2025-08-15',
        postDate: '2025-07-25',
        schedule: 'Full-time',
        workplace: 'Remote',
        expectations: 'Proficiency in JavaScript, teamwork, and problem-solving skills.',
        benefits: 'Health insurance, remote work allowance, promotion to senior roles after 2 years.'
      },
      {
        id: 'job2',
        title: 'Data Analyst',
        company: 'Data Insights',
        companyLink: 'https://datainsights.com',
        agencyPic: 'https://via.placeholder.com/50',
        coverPhoto: 'https://via.placeholder.com/728x200',
        rating: 3,
        phone: '+251-912-345-679',
        email: 'jobs@datainsights.com',
        location: 'Nairobi, Kenya',
        brief: 'Analyze data to provide business insights.',
        description: 'Work with large datasets to generate actionable insights for business growth...',
        documents: 'Resume, Portfolio',
        experience: '2+ years in data analysis',
        period: '2025-07-20 to 2025-08-10',
        postDate: '2025-07-18',
        schedule: 'Part-time',
        workplace: 'On-site',
        expectations: 'Expertise in SQL and Python, strong analytical skills.',
        benefits: 'Flexible hours, annual bonuses, promotion to lead analyst.'
      }
    ];

    // Mock Applicant Data
    const applicantData = [
      {
        id: 'applicant1',
        name: 'Abebe Kebede',
        profilePic: 'https://via.placeholder.com/50',
        coverPhoto: 'https://via.placeholder.com/728x200',
        rating: 4,
        phone: '+251-912-345-680',
        email: 'abebe@example.com',
        location: 'Addis Ababa, Ethiopia',
        bio: 'Experienced software engineer with a passion for building scalable applications.',
        quote: 'Code is poetry.',
        socials: {
          facebook: 'https://facebook.com/abebe',
          linkedin: 'https://linkedin.com/in/abebe',
          twitter: 'https://twitter.com/abebe'
        },
        documents: 'Resume, Cover Letter, Certificates'
      },
      {
        id: 'applicant2',
        name: 'Sarah Mumbi',
        profilePic: 'https://via.placeholder.com/50',
        coverPhoto: 'https://via.placeholder.com/728x200',
        rating: 3,
        phone: '+254-712-345-678',
        email: 'sarah@example.com',
        location: 'Nairobi, Kenya',
        bio: 'Data analyst skilled in extracting insights from complex datasets.',
        quote: 'Data tells stories.',
        socials: {
          facebook: 'https://facebook.com/sarah',
          linkedin: 'https://linkedin.com/in/sarah',
          twitter: 'https://twitter.com/sarah'
        },
        documents: 'Resume, Portfolio'
      }
    ];

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

        document.addEventListener('click', (event) => {
          if (!profileDropdownBtn.contains(event.target) && !profileDropdown.contains(event.target)) {
            profileDropdown.classList.add('hidden');
          }
          if (!mobileProfileDropdownBtn.contains(event.target) && !mobileProfileDropdown.contains(event.target)) {
            mobileProfileDropdown.classList.add('hidden');
          }
        });
      }

      // Job List Rendering
      const jobList = document.getElementById('job-list');
      const findJobsList = document.getElementById('find-jobs-list');
      function renderJobList(data, container) {
        container.innerHTML = data.map(job => `
          <div class="job-card bg-[var(--highlight)] rounded-lg shadow-lg p-4">
            <div class="flex items-center mb-2">
              <img src="${job.agencyPic}" alt="${job.company}" class="w-10 h-10 rounded-full mr-2">
              <div>
                <a href="${job.companyLink}" target="_blank" class="text-lg font-semibold text-[var(--nav-link-hover)]">${job.company}</a>
                <div class="flex">${renderStars(job.rating)}</div>
              </div>
            </div>
            <h3 class="text-xl font-bold text-[var(--heading)]">${job.title}</h3>
            <p class="text-[var(--text)] text-sm">${job.brief}</p>
            <p class="text-[var(--text)] text-sm">Contact: ${job.phone}, ${job.email}</p>
            <p class="text-[var(--text)] text-sm">Location: ${job.location}</p>
            <p class="text-[var(--text)] text-sm">Documents: ${job.documents}</p>
            <p class="text-[var(--text)] text-sm">Experience: ${job.experience}</p>
            <p class="text-[var(--text)] text-sm">Open Period: ${job.period}</p>
            <p class="text-[var(--text)] text-sm">Posted: ${job.postDate}</p>
            <p class="text-[var(--text)] text-sm">Schedule: ${job.schedule}</p>
            <p class="text-[var(--text)] text-sm">Workplace: ${job.workplace}</p>
            <div class="flex space-x-2 mt-2">
              <button onclick="openViewJobModal('${job.id}')" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">View Job</button>
              <svg id="fav-${job.id}" class="w-6 h-6 cursor-pointer ${favoriteJobs[job.id] ? 'fill-red-500' : 'fill-none'}" onclick="toggleFavorite('${job.id}', event)" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
              <svg id="save-${job.id}" class="w-6 h-6 cursor-pointer ${savedJobs[job.id] ? 'fill-yellow-500' : 'fill-none'}" onclick="toggleSave('${job.id}', event)" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
              </svg>
            </div>
          </div>
        `).join('');
      }

      // Render Stars for Rating
      function renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
          stars += `<svg class="w-4 h-4 ${i <= rating ? 'fill-yellow-400' : 'fill-gray-300'}" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
          </svg>`;
        }
        return stars;
      }

      renderJobList(jobData, jobList);
      renderJobList(jobData, findJobsList);

      // Search Bar Functionality
      const navSearch = document.getElementById('nav-search');
      navSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const jobCards = document.querySelectorAll('.job-card');
        jobCards.forEach(card => {
          const title = card.querySelector('h3').textContent.toLowerCase();
          const company = card.querySelector('a').textContent.toLowerCase();
          card.style.display = title.includes(searchTerm) || company.includes(searchTerm) ? 'block' : 'none';
        });
      });

      // Ad Rotation
      const adImage = document.getElementById('ad-image');
      function rotateAd() {
        currentAdIndex = (currentAdIndex + 1) % adImages.length;
        adImage.src = adImages[currentAdIndex];
      }
      setInterval(rotateAd, 7000);

      // Modal Functions
      window.openFindJobsModal = function() {
        renderJobList(jobData, findJobsList);
        document.getElementById('find-jobs-modal').classList.remove('hidden');
      };

      window.closeFindJobsModal = function() {
        document.getElementById('find-jobs-modal').classList.add('hidden');
      };

      window.openViewJobModal = function(jobId) {
        const job = jobData.find(j => j.id === jobId);
        if (!job) return;

        document.getElementById('view-job-title').textContent = job.title;
        document.getElementById('view-job-cover').src = job.coverPhoto;
        document.getElementById('view-job-agency-pic').src = job.agencyPic;
        document.getElementById('view-job-company').textContent = job.company;
        document.getElementById('view-job-company').href = job.companyLink;
        document.getElementById('view-job-rating').innerHTML = renderStars(job.rating);
        document.getElementById('view-job-contact').textContent = `Contact: ${job.phone}, ${job.email}`;
        document.getElementById('view-job-location').textContent = `Location: ${job.location}`;
        document.getElementById('view-job-brief').textContent = job.brief;
        document.getElementById('view-job-documents').textContent = `Documents: ${job.documents}`;
        document.getElementById('view-job-experience').textContent = `Experience: ${job.experience}`;
        document.getElementById('view-job-period').textContent = `Open Period: ${job.period}`;
        document.getElementById('view-job-post-date').textContent = `Posted: ${job.postDate}`;
        document.getElementById('view-job-schedule').textContent = `Schedule: ${job.schedule}`;
        document.getElementById('view-job-workplace').textContent = `Workplace: ${job.workplace}`;
        document.getElementById('view-job-description').textContent = job.description;
        document.getElementById('view-job-expectations').textContent = job.expectations;
        document.getElementById('view-job-benefits').textContent = job.benefits;

        document.getElementById('resume-btn').onclick = () => openResumeModal();
        document.getElementById('certification-btn').onclick = () => openCertificationModal();

        document.getElementById('view-job-modal').classList.remove('hidden');
      };

      window.closeViewJobModal = function() {
        document.getElementById('view-job-modal').classList.add('hidden');
      };

      window.openResumeModal = function() {
        document.getElementById('resume-modal').classList.remove('hidden');
      };

      window.closeResumeModal = function() {
        document.getElementById('resume-modal').classList.add('hidden');
      };

      window.submitResume = function() {
        const resumeText = document.getElementById('resume-text').value;
        const resumeFile = document.getElementById('resume-upload').files[0];
        const saveResume = document.getElementById('save-resume').checked;
        alert(`Resume submitted: ${resumeText || 'File uploaded'}, Save for other applications: ${saveResume}`);
        closeResumeModal();
      };

      window.openCertificationModal = function() {
        const certificationList = document.getElementById('certification-list');
        certificationList.innerHTML = '<p class="text-[var(--text)]">No certifications uploaded yet.</p>'; // Mock
        document.getElementById('certification-modal').classList.remove('hidden');
      };

      window.closeCertificationModal = function() {
        document.getElementById('certification-modal').classList.add('hidden');
      };

      window.submitCertification = function() {
        const files = document.getElementById('certification-upload').files;
        alert(`Uploaded ${files.length} certification(s). Verification may take some time.`);
        closeCertificationModal();
      };

      window.openPostJobsModal = function() {
        document.getElementById('post-jobs-modal').classList.remove('hidden');
        showTab('applicants');
      };

      window.closePostJobsModal = function() {
        document.getElementById('post-jobs-modal').classList.add('hidden');
      };

      // Tab Switching
      const applicantsTab = document.getElementById('applicants-tab');
      const jobPostsTab = document.getElementById('job-posts-tab');
      const publishJobTab = document.getElementById('publish-job-tab');
      const applicantsContent = document.getElementById('applicants-content');
      const jobPostsContent = document.getElementById('job-posts-content');
      const publishJobContent = document.getElementById('publish-job-content');

      function showTab(tab) {
        [applicantsTab, jobPostsTab, publishJobTab].forEach(t => t.classList.remove('tab-active'));
        [applicantsContent, jobPostsContent, publishJobContent].forEach(c => c.classList.add('hidden'));

        if (tab === 'applicants') {
          applicantsTab.classList.add('tab-active');
          applicantsContent.classList.remove('hidden');
          renderApplicantsList();
        } else if (tab === 'job-posts') {
          jobPostsTab.classList.add('tab-active');
          jobPostsContent.classList.remove('hidden');
          renderJobPostsList();
        } else if (tab === 'publish-job') {
          publishJobTab.classList.add('tab-active');
          publishJobContent.classList.remove('hidden');
        }
      }

      applicantsTab.addEventListener('click', () => showTab('applicants'));
      jobPostsTab.addEventListener('click', () => showTab('job-posts'));
      publishJobTab.addEventListener('click', () => showTab('publish-job'));

      function renderApplicantsList() {
        const applicantsList = document.getElementById('applicants-list');
        applicantsList.innerHTML = applicantData.map(applicant => `
          <div class="bg-[var(--highlight)] rounded-lg shadow-lg p-4">
            <div class="flex items-center mb-2">
              <img src="${applicant.profilePic}" alt="${applicant.name}" class="w-10 h-10 rounded-full mr-2">
              <div>
                <h4 class="text-lg font-semibold text-[var(--heading)]">${applicant.name}</h4>
                <div class="flex">${renderStars(applicant.rating)}</div>
              </div>
            </div>
            <p class="text-[var(--text)] text-sm">Contact: ${applicant.phone}, ${applicant.email}</p>
            <p class="text-[var(--text)] text-sm">Location: ${applicant.location}</p>
            <button onclick="openApplicantViewModal('${applicant.id}')" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 mt-2">View Applicant</button>
          </div>
        `).join('');
      }

      function renderJobPostsList() {
        const jobPostsList = document.getElementById('job-posts-list');
        renderJobList(jobData, jobPostsList);
      }

      window.openApplicantViewModal = function(applicantId) {
        const applicant = applicantData.find(a => a.id === applicantId);
        if (!applicant) return;

        document.getElementById('applicant-cover').src = applicant.coverPhoto;
        document.getElementById('applicant-profile-pic').src = applicant.profilePic;
        document.getElementById('applicant-name').textContent = applicant.name;
        document.getElementById('applicant-rating').innerHTML = renderStars(applicant.rating);
        document.getElementById('applicant-contact').textContent = `Contact: ${applicant.phone}, ${applicant.email}`;
        document.getElementById('applicant-location').textContent = `Location: ${applicant.location}`;
        document.getElementById('applicant-bio').textContent = applicant.bio;
        document.getElementById('applicant-quote').textContent = `"${applicant.quote}"`;
        document.getElementById('applicant-documents').textContent = `Documents: ${applicant.documents}`;
        document.getElementById('applicant-socials').innerHTML = `
          <a href="${applicant.socials.facebook}" target="_blank" class="text-[var(--nav-link-hover)]">Facebook</a>
          <a href="${applicant.socials.linkedin}" target="_blank" class="text-[var(--nav-link-hover)]">LinkedIn</a>
          <a href="${applicant.socials.twitter}" target="_blank" class="text-[var(--nav-link-hover)]">Twitter</a>
        `;

        document.getElementById('applicant-view-modal').classList.remove('hidden');
      };

      window.closeApplicantViewModal = function() {
        document.getElementById('applicant-view-modal').classList.add('hidden');
      };

      window.openJobPostViewModal = function(jobId) {
        const job = jobData.find(j => j.id === jobId);
        if (!job) return;

        document.getElementById('job-post-title').textContent = job.title;
        document.getElementById('job-post-cover').src = job.coverPhoto;
        document.getElementById('job-post-agency-pic').src = job.agencyPic;
        document.getElementById('job-post-company').textContent = job.company;
        document.getElementById('job-post-company').href = job.companyLink;
        document.getElementById('job-post-rating').innerHTML = renderStars(job.rating);
        document.getElementById('job-post-contact').textContent = `Contact: ${job.phone}, ${job.email}`;
        document.getElementById('job-post-location').textContent = `Location: ${job.location}`;
        document.getElementById('job-post-brief').textContent = job.brief;
        document.getElementById('job-post-documents').textContent = `Documents: ${job.documents}`;
        document.getElementById('job-post-experience').textContent = `Experience: ${job.experience}`;
        document.getElementById('job-post-period').textContent = `Open Period: ${job.period}`;
        document.getElementById('job-post-post-date').textContent = `Posted: ${job.postDate}`;
        document.getElementById('job-post-schedule').textContent = `Schedule: ${job.schedule}`;
        document.getElementById('job-post-workplace').textContent = `Workplace: ${job.workplace}`;
        document.getElementById('job-post-description').textContent = job.description;
        document.getElementById('job-post-expectations').textContent = job.expectations;
        document.getElementById('job-post-benefits').textContent = job.benefits;

        document.getElementById('job-post-view-modal').classList.remove('hidden');
      };

      window.closeJobPostViewModal = function() {
        document.getElementById('job-post-view-modal').classList.add('hidden');
      };

      window.publishJob = function() {
        const job = {
          id: `job${jobData.length + 1}`,
          title: document.getElementById('job-title').value,
          company: document.getElementById('company-name').value,
          companyLink: document.getElementById('company-link').value,
          agencyPic: document.getElementById('agency-pic-upload').files[0] ? URL.createObjectURL(document.getElementById('agency-pic-upload').files[0]) : 'https://via.placeholder.com/50',
          coverPhoto: document.getElementById('job-cover-upload').files[0] ? URL.createObjectURL(document.getElementById('job-cover-upload').files[0]) : 'https://via.placeholder.com/728x200',
          rating: 0,
          phone: document.getElementById('company-phone').value,
          email: document.getElementById('company-email').value,
          location: document.getElementById('job-location').value,
          brief: document.getElementById('job-brief').value,
          description: document.getElementById('job-description').value,
          documents: document.getElementById('job-documents').value,
          experience: document.getElementById('job-experience').value,
          period: document.getElementById('job-period').value,
          postDate: '2025-07-27',
          schedule: document.getElementById('job-schedule').value,
          workplace: document.getElementById('job-workplace').value,
          expectations: document.getElementById('job-expectations').value,
          benefits: document.getElementById('job-benefits').value
        };
        jobData.push(job);
        alert('Job published successfully!');
        document.getElementById('publish-job-form').reset();
        showTab('job-posts');
        renderJobPostsList();
      };

      window.toggleFavorite = function(jobId, event) {
        event.stopPropagation();
        const favIcon = document.getElementById(`fav-${jobId}`);
        favoriteJobs[jobId] = !favoriteJobs[jobId];
        favIcon.classList.toggle('fill-red-500', favoriteJobs[jobId]);
        favIcon.classList.toggle('fill-none', !favoriteJobs[jobId]);
      };

      window.toggleSave = function(jobId, event) {
        event.stopPropagation();
        const saveIcon = document.getElementById(`save-${jobId}`);
        savedJobs[jobId] = !savedJobs[jobId];
        saveIcon.classList.toggle('fill-yellow-500', savedJobs[jobId]);
        saveIcon.classList.toggle('fill-none', !savedJobs[jobId]);
      };

      window.openNotesModal = function() {
        alert('Notes modal to be implemented.');
      };

      window.openManageFinancesModal = function() {
        alert('Manage Finances modal to be implemented.');
      };

      window.openCommentRateModal = function() {
        alert('Comment & Rate modal to be implemented.');
      };

      window.openShareProfileModal = function() {
        alert('Share Profile modal to be implemented.');
      };

      window.openNotificationModal = function() {
        alert('Notifications modal to be implemented.');
      };

      // Initialize
      document.getElementById('find-jobs-btn').addEventListener('click', openFindJobsModal);
      document.getElementById('post-jobs-btn').addEventListener('click', openPostJobsModal);
    });
  