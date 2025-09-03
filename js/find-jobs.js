// ============================================
// ENHANCED FIND JOBS JAVASCRIPT - COMPLETE
// ============================================

// Global Variables
let isLoggedIn = true; // Toggle for authentication state
let favoriteJobs = JSON.parse(localStorage.getItem('favoriteJobs')) || {};
let savedJobs = JSON.parse(localStorage.getItem('savedJobs')) || {};
let jobAlerts = JSON.parse(localStorage.getItem('jobAlerts')) || [];
let currentAdIndex = 0;
let currentView = 'grid';
let filteredJobs = [];
let currentPage = 1;
const jobsPerPage = 12;
let activeFilters = {
  categories: [],
  experience: [],
  schedule: [],
  workplace: [],
  salaryMin: 0,
  location: 'All Locations'
};

// Ad rotation images
const adImages = [
  'https://via.placeholder.com/300x250/FF6B6B/FFFFFF?text=Tech+Jobs+Available',
  'https://via.placeholder.com/300x250/4ECDC4/FFFFFF?text=Remote+Opportunities',
  'https://via.placeholder.com/300x250/45B7D1/FFFFFF?text=Career+Growth'
];

// Enhanced Mock Job Data (Extended)
const jobData = [
  {
    id: 'job1',
    title: 'Senior Software Engineer',
    company: 'Tech Corp Ethiopia',
    companyLink: 'https://techcorp.et',
    agencyPic: 'https://via.placeholder.com/50/FF6B6B/FFFFFF?text=TC',
    coverPhoto: 'https://via.placeholder.com/728x200/4ECDC4/FFFFFF?text=Tech+Corp',
    rating: 4.5,
    phone: '+251-912-345-678',
    email: 'careers@techcorp.et',
    location: 'Addis Ababa, Ethiopia',
    salary: '80,000 - 120,000 ETB',
    salaryMin: 80000,
    salaryMax: 120000,
    type: 'Full-time',
    category: 'Technology',
    experienceLevel: 'senior',
    brief: 'Lead our engineering team in building scalable web applications using modern technologies.',
    description: 'We are seeking an experienced Senior Software Engineer to join our growing team. You will be responsible for designing and implementing robust, scalable web applications using React, Node.js, and cloud technologies. This role offers the opportunity to mentor junior developers and shape our technical architecture.',
    documents: 'Resume, Cover Letter, Portfolio',
    experience: '5+ years in software development',
    period: '2025-08-01 to 2025-08-31',
    postDate: '2025-07-25',
    schedule: 'Full-time',
    workplace: 'Hybrid',
    expectations: 'Strong proficiency in JavaScript/TypeScript, React, Node.js. Experience with AWS or Azure. Excellent problem-solving skills and ability to lead technical discussions. Familiarity with Agile methodologies.',
    benefits: 'Competitive salary, comprehensive health insurance, flexible work arrangements, annual bonuses, professional development budget, stock options, promotion to Lead Engineer within 2 years.',
    featured: true
  },
  {
    id: 'job2',
    title: 'Data Analyst',
    company: 'Data Insights Africa',
    companyLink: 'https://datainsights.africa',
    agencyPic: 'https://via.placeholder.com/50/6C5CE7/FFFFFF?text=DI',
    coverPhoto: 'https://via.placeholder.com/728x200/A8E6CF/FFFFFF?text=Data+Insights',
    rating: 4,
    phone: '+251-912-345-679',
    email: 'jobs@datainsights.africa',
    location: 'Addis Ababa, Ethiopia',
    salary: '60,000 - 90,000 ETB',
    salaryMin: 60000,
    salaryMax: 90000,
    type: 'Full-time',
    category: 'Data & Analytics',
    experienceLevel: 'mid',
    brief: 'Transform data into actionable insights for business growth.',
    description: 'Join our analytics team to work with large datasets and generate insights that drive business decisions. You will be working with modern BI tools and collaborating with stakeholders across the organization.',
    documents: 'Resume, Portfolio of previous work',
    experience: '3+ years in data analysis',
    period: '2025-07-20 to 2025-08-20',
    postDate: '2025-07-18',
    schedule: 'Full-time',
    workplace: 'On-site',
    expectations: 'Expertise in SQL, Python, and data visualization tools (Tableau/Power BI). Strong analytical and communication skills.',
    benefits: 'Health insurance, performance bonuses, career development programs, promotion to Senior Analyst.'
  },
  {
    id: 'job3',
    title: 'UX/UI Designer',
    company: 'Creative Studios',
    companyLink: 'https://creativestudios.et',
    agencyPic: 'https://via.placeholder.com/50/FD79A8/FFFFFF?text=CS',
    coverPhoto: 'https://via.placeholder.com/728x200/FFD3B6/FFFFFF?text=Creative+Studios',
    rating: 5,
    phone: '+251-912-345-680',
    email: 'design@creativestudios.et',
    location: 'Addis Ababa, Ethiopia',
    salary: '70,000 - 100,000 ETB',
    salaryMin: 70000,
    salaryMax: 100000,
    type: 'Full-time',
    category: 'Design',
    experienceLevel: 'mid',
    brief: 'Create beautiful and intuitive user experiences for web and mobile applications.',
    description: 'We are looking for a talented UX/UI Designer to join our creative team. You will be responsible for creating user-centered designs that are both beautiful and functional.',
    documents: 'Resume, Portfolio, Design samples',
    experience: '4+ years in UX/UI design',
    period: '2025-08-01 to 2025-08-25',
    postDate: '2025-07-20',
    schedule: 'Full-time',
    workplace: 'Remote',
    expectations: 'Proficiency in Figma, Adobe Creative Suite. Strong understanding of user-centered design principles. Experience with design systems.',
    benefits: 'Remote work, creative freedom, latest design tools, international projects, promotion opportunities.'
  },
  {
    id: 'job4',
    title: 'Junior Developer',
    company: 'StartUp Hub',
    companyLink: 'https://startuphub.et',
    agencyPic: 'https://via.placeholder.com/50/00B894/FFFFFF?text=SH',
    coverPhoto: 'https://via.placeholder.com/728x200/55EFC4/FFFFFF?text=StartUp+Hub',
    rating: 4.2,
    phone: '+251-912-345-681',
    email: 'jobs@startuphub.et',
    location: 'Addis Ababa, Ethiopia',
    salary: '30,000 - 50,000 ETB',
    salaryMin: 30000,
    salaryMax: 50000,
    type: 'Full-time',
    category: 'Technology',
    experienceLevel: 'entry',
    brief: 'Start your career in a fast-paced startup environment.',
    description: 'Perfect opportunity for fresh graduates or junior developers to learn and grow. Work with modern technologies and experienced mentors.',
    documents: 'Resume, Cover Letter',
    experience: '0-2 years',
    period: '2025-08-01 to 2025-08-31',
    postDate: '2025-07-22',
    schedule: 'Full-time',
    workplace: 'On-site',
    expectations: 'Basic knowledge of HTML, CSS, JavaScript. Eagerness to learn. Good communication skills.',
    benefits: 'Mentorship program, skill development workshops, flexible hours, gym membership.'
  },
  {
    id: 'job5',
    title: 'Part-time Content Writer',
    company: 'Media House Africa',
    companyLink: 'https://mediahouse.africa',
    agencyPic: 'https://via.placeholder.com/50/E17055/FFFFFF?text=MH',
    coverPhoto: 'https://via.placeholder.com/728x200/FAB1A0/FFFFFF?text=Media+House',
    rating: 3.8,
    phone: '+254-712-345-679',
    email: 'content@mediahouse.africa',
    location: 'Dire Dawa, Ethiopia',
    salary: '25,000 - 40,000 ETB',
    salaryMin: 25000,
    salaryMax: 40000,
    type: 'Part-time',
    category: 'Marketing',
    experienceLevel: 'entry',
    brief: 'Create engaging content for digital platforms.',
    description: 'Flexible part-time role perfect for creative writers. Work remotely and set your own schedule.',
    documents: 'Resume, Writing samples',
    experience: '1+ years in content writing',
    period: '2025-07-25 to 2025-08-25',
    postDate: '2025-07-23',
    schedule: 'Part-time',
    workplace: 'Remote',
    expectations: 'Excellent writing skills, SEO knowledge, creativity.',
    benefits: 'Flexible hours, work from anywhere, performance bonuses.'
  },
  {
    id: 'job6',
    title: 'Finance Manager',
    company: 'Banking Solutions Ltd',
    companyLink: 'https://bankingsolutions.et',
    agencyPic: 'https://via.placeholder.com/50/0984E3/FFFFFF?text=BS',
    coverPhoto: 'https://via.placeholder.com/728x200/74B9FF/FFFFFF?text=Banking+Solutions',
    rating: 4.6,
    phone: '+251-912-345-682',
    email: 'hr@bankingsolutions.et',
    location: 'Dire Dawa, Ethiopia',
    salary: '90,000 - 130,000 ETB',
    salaryMin: 90000,
    salaryMax: 130000,
    type: 'Full-time',
    category: 'Finance',
    experienceLevel: 'senior',
    brief: 'Lead financial operations and strategy for growing fintech.',
    description: 'Senior role managing financial planning, analysis, and reporting. Lead a team of financial analysts.',
    documents: 'Resume, Cover Letter, References',
    experience: '7+ years in finance',
    period: '2025-08-01 to 2025-08-30',
    postDate: '2025-07-24',
    schedule: 'Full-time',
    workplace: 'Hybrid',
    expectations: 'CPA or ACCA qualified, experience in fintech, leadership skills.',
    benefits: 'Executive compensation, stock options, health insurance, car allowance.'
  },
  {
    id: 'job7',
    title: 'Freelance Graphic Designer',
    company: 'Design Collective',
    companyLink: 'https://designcollective.et',
    agencyPic: 'https://via.placeholder.com/50/A29BFE/FFFFFF?text=DC',
    coverPhoto: 'https://via.placeholder.com/728x200/D6A2E8/FFFFFF?text=Design+Collective',
    rating: 4.3,
    phone: '+251-912-345-683',
    email: 'projects@designcollective.et',
    location: 'Mekelle, Ethiopia',
    salary: '20,000 - 80,000 ETB',
    salaryMin: 20000,
    salaryMax: 80000,
    type: 'Freelance',
    category: 'Design',
    experienceLevel: 'mid',
    brief: 'Work on exciting design projects with flexibility.',
    description: 'Join our network of freelance designers. Choose projects that interest you and work on your own schedule.',
    documents: 'Portfolio, Rate card',
    experience: '3+ years in graphic design',
    period: 'Ongoing',
    postDate: '2025-07-21',
    schedule: 'Freelance',
    workplace: 'Remote',
    expectations: 'Strong portfolio, Adobe Creative Suite expertise, reliability.',
    benefits: 'Choose your projects, competitive rates, creative freedom.'
  },
  {
    id: 'job8',
    title: 'Healthcare Administrator',
    company: 'Medical Center Plus',
    companyLink: 'https://medcenterplus.et',
    agencyPic: 'https://via.placeholder.com/50/00CEC9/FFFFFF?text=MC',
    coverPhoto: 'https://via.placeholder.com/728x200/81ECEC/FFFFFF?text=Medical+Center',
    rating: 4.4,
    phone: '+251-912-345-684',
    email: 'careers@medcenterplus.et',
    location: 'Mekelle, Ethiopia',
    salary: '65,000 - 85,000 ETB',
    salaryMin: 65000,
    salaryMax: 85000,
    type: 'Full-time',
    category: 'Healthcare',
    experienceLevel: 'mid',
    brief: 'Manage healthcare facility operations and patient services.',
    description: 'Oversee daily operations of our medical center, ensuring quality patient care and efficient administration.',
    documents: 'Resume, Certifications',
    experience: '4+ years in healthcare administration',
    period: '2025-08-05 to 2025-09-05',
    postDate: '2025-07-26',
    schedule: 'Full-time',
    workplace: 'On-site',
    expectations: 'Healthcare management degree, knowledge of regulations, leadership skills.',
    benefits: 'Health insurance, professional development, performance bonuses.'
  },
  {
    id: 'job9',
    title: 'Marketing Manager',
    company: 'Brand Excellence',
    companyLink: 'https://brandexcellence.et',
    agencyPic: 'https://via.placeholder.com/50/FF6B35/FFFFFF?text=BE',
    coverPhoto: 'https://via.placeholder.com/728x200/FFB347/FFFFFF?text=Brand+Excellence',
    rating: 4.7,
    phone: '+251-912-345-685',
    email: 'careers@brandexcellence.et',
    location: 'Addis Ababa, Ethiopia',
    salary: '75,000 - 110,000 ETB',
    salaryMin: 75000,
    salaryMax: 110000,
    type: 'Full-time',
    category: 'Marketing',
    experienceLevel: 'senior',
    brief: 'Drive marketing strategy and brand growth for leading agency.',
    description: 'Lead our marketing team in developing and executing comprehensive marketing strategies across digital and traditional channels.',
    documents: 'Resume, Portfolio, References',
    experience: '6+ years in marketing',
    period: '2025-08-10 to 2025-09-10',
    postDate: '2025-07-27',
    schedule: 'Full-time',
    workplace: 'Hybrid',
    expectations: 'Proven track record in marketing leadership, digital marketing expertise, strong analytical skills.',
    benefits: 'Competitive salary, performance bonuses, flexible work, professional development budget.'
  },
  {
    id: 'job10',
    title: 'Mobile App Developer',
    company: 'App Innovators',
    companyLink: 'https://appinnovators.et',
    agencyPic: 'https://via.placeholder.com/50/667EEA/FFFFFF?text=AI',
    coverPhoto: 'https://via.placeholder.com/728x200/818CF8/FFFFFF?text=App+Innovators',
    rating: 4.3,
    phone: '+251-912-345-686',
    email: 'jobs@appinnovators.et',
    location: 'Gondar, Ethiopia',
    salary: '70,000 - 95,000 ETB',
    salaryMin: 70000,
    salaryMax: 95000,
    type: 'Full-time',
    category: 'Technology',
    experienceLevel: 'mid',
    brief: 'Build innovative mobile applications for iOS and Android.',
    description: 'Join our mobile development team to create cutting-edge applications using React Native and Flutter.',
    documents: 'Resume, Portfolio, GitHub profile',
    experience: '3+ years in mobile development',
    period: '2025-08-15 to 2025-09-15',
    postDate: '2025-07-28',
    schedule: 'Full-time',
    workplace: 'Remote',
    expectations: 'Experience with React Native or Flutter, API integration, app store deployment.',
    benefits: 'Remote work, latest equipment, learning budget, stock options.'
  },
  {
    id: 'job11',
    title: 'English Teacher',
    company: 'International School Ethiopia',
    companyLink: 'https://intschool.et',
    agencyPic: 'https://via.placeholder.com/50/10B981/FFFFFF?text=IS',
    coverPhoto: 'https://via.placeholder.com/728x200/34D399/FFFFFF?text=International+School',
    rating: 4.8,
    phone: '+251-912-345-687',
    email: 'hr@intschool.et',
    location: 'Hawassa, Ethiopia',
    salary: '45,000 - 65,000 ETB',
    salaryMin: 45000,
    salaryMax: 65000,
    type: 'Full-time',
    category: 'Education',
    experienceLevel: 'mid',
    brief: 'Inspire students with engaging English language education.',
    description: 'We seek a passionate English teacher to join our international curriculum team.',
    documents: 'Resume, Teaching certificate, References',
    experience: '3+ years teaching experience',
    period: '2025-08-20 to 2025-09-20',
    postDate: '2025-07-29',
    schedule: 'Full-time',
    workplace: 'On-site',
    expectations: 'Bachelor\'s in English or Education, TEFL/TESOL certification preferred.',
    benefits: 'Housing allowance, health insurance, professional development, paid holidays.'
  },
  {
    id: 'job12',
    title: 'Contract Accountant',
    company: 'Finance Pro Services',
    companyLink: 'https://financepro.et',
    agencyPic: 'https://via.placeholder.com/50/059669/FFFFFF?text=FP',
    coverPhoto: 'https://via.placeholder.com/728x200/10B981/FFFFFF?text=Finance+Pro',
    rating: 4.1,
    phone: '+251-912-345-688',
    email: 'jobs@financepro.et',
    location: 'Addis Ababa, Ethiopia',
    salary: '50,000 - 70,000 ETB',
    salaryMin: 50000,
    salaryMax: 70000,
    type: 'Contract',
    category: 'Finance',
    experienceLevel: 'mid',
    brief: '6-month contract for experienced accountant.',
    description: 'Temporary position to handle financial reporting and compliance for multiple clients.',
    documents: 'Resume, CPA certificate',
    experience: '4+ years in accounting',
    period: '2025-08-01 to 2026-01-31',
    postDate: '2025-07-30',
    schedule: 'Contract',
    workplace: 'Hybrid',
    expectations: 'CPA certified, experience with QuickBooks, strong attention to detail.',
    benefits: 'Competitive hourly rate, flexible schedule, potential for extension.'
  }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupEventListeners();
  setupScrollEffects();
  
  // Initialize counters after DOM is ready
  initializeCounters();
});

// Main Initialization Function
function initializeApp() {
  setupNavigation();
  setupTheme();
  filteredJobs = [...jobData];
  renderJobList(filteredJobs, document.getElementById('job-list'));
  setupAdRotation();
  setupFilters();
  initializeModals();
  updateJobCount();
  loadSavedState();
}

// Load saved state from localStorage
function loadSavedState() {
  // Update saved jobs badge
  updateSavedJobsBadge();
  
  // Load active alerts
  if (jobAlerts.length > 0) {
    console.log(`You have ${jobAlerts.length} active job alerts`);
  }
}

// Update saved jobs badge count
function updateSavedJobsBadge() {
  const savedCount = Object.keys(savedJobs).length;
  const badge = document.querySelector('#saved-jobs-btn .badge-count');
  if (badge) {
    badge.textContent = savedCount;
    badge.style.display = savedCount > 0 ? 'flex' : 'none';
  }
}

// Navigation Setup
function setupNavigation() {
  const navLinks = document.getElementById('nav-links');
  const mobileMenu = document.getElementById('mobile-menu');

  const loggedInNav = `
    <a href="news.html" class="nav-link">News</a>
    <a href="find-tutors.html" class="nav-link">Find Tutors</a>
    <a href="reels.html" class="nav-link">Reels</a>
    <a href="store.html" class="nav-link">Store</a>
    <a href="find-jobs.html" class="nav-link active">Find Jobs</a>
    <div class="relative group">
      <button id="profile-dropdown-btn" class="nav-link flex items-center">
        Profile
        <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
    </div>
    <button id="theme-toggle" class="theme-toggle-btn">
      <span id="theme-icon" class="text-2xl">☀</span>
    </button>
  `;

  if (navLinks) {
    navLinks.innerHTML = loggedInNav;
  }

  // Mobile menu content
  if (mobileMenu) {
    mobileMenu.innerHTML = `
      <div class="px-4 py-3 space-y-2">
        <a href="news.html" class="block px-3 py-2 nav-link">News</a>
        <a href="find-tutors.html" class="block px-3 py-2 nav-link">Find Tutors</a>
        <a href="reels.html" class="block px-3 py-2 nav-link">Reels</a>
        <a href="store.html" class="block px-3 py-2 nav-link">Store</a>
        <a href="find-jobs.html" class="block px-3 py-2 nav-link active">Find Jobs</a>
        <a href="profile.html" class="block px-3 py-2 nav-link">Profile</a>
      </div>
    `;
  }

  setupMobileMenu();
}

// Mobile Menu Setup
function setupMobileMenu() {
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      menuBtn.classList.toggle('active');
      mobileMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!menuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
        menuBtn.classList.remove('active');
        mobileMenu.classList.add('hidden');
      }
    });
  }
}

// Theme Toggle Setup
function setupTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const currentTheme = localStorage.getItem('theme') || 'light';
  
  document.documentElement.setAttribute('data-theme', currentTheme);
  if (themeIcon) {
    themeIcon.textContent = currentTheme === 'light' ? '☀' : '🌙';
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      if (themeIcon) {
        themeIcon.textContent = newTheme === 'light' ? '☀' : '🌙';
      }
    });
  }
}

// Animate Statistics
function animateStats() {
  const stats = document.querySelectorAll('.stat-number[data-count]');
  
  if (stats.length === 0) return;
  
  const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
        const stat = entry.target;
        const target = parseInt(stat.getAttribute('data-count'));
        entry.target.classList.add('animated');
        animateNumber(stat, target);
        observer.unobserve(stat);
      }
    });
  }, observerOptions);

  stats.forEach(stat => {
    if (stat) observer.observe(stat);
  });
}

// Animate number counting
function animateNumber(element, target) {
  let current = 0;
  const increment = target / 50;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
      // Add the + sign for large numbers
      if (target > 1000) {
        element.textContent = formatNumber(target) + '+';
      } else {
        element.textContent = formatNumber(target);
      }
    } else {
      element.textContent = formatNumber(Math.floor(current));
    }
  }, 30);
}

// Format number with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Setup scroll effects
function setupScrollEffects() {
  const backToTop = document.getElementById('back-to-top');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTop?.classList.remove('hidden');
    } else {
      backToTop?.classList.add('hidden');
    }
  });

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Enhanced Job List Rendering
function renderJobList(jobs, container, append = false) {
  if (!container) return;

  const startIndex = append ? currentPage * jobsPerPage : 0;
  const endIndex = append ? (currentPage + 1) * jobsPerPage : jobsPerPage;
  const jobsToRender = jobs.slice(startIndex, endIndex);
  
  const jobCards = jobsToRender.map(job => createJobCard(job)).join('');
  
  if (append) {
    container.innerHTML += jobCards;
  } else {
    container.innerHTML = jobCards;
  }

  attachJobCardListeners();
  updateJobCount();
}

// Create Job Card HTML
function createJobCard(job) {
  const isFavorite = favoriteJobs[job.id] || false;
  const isSaved = savedJobs[job.id] || false;

  return `
    <div class="job-card" data-job-id="${job.id}" data-category="${job.category}" data-experience="${job.experienceLevel}" data-schedule="${job.schedule}" data-workplace="${job.workplace}" data-salary="${job.salaryMin}">
      <div class="job-card-header">
        <img src="${job.agencyPic}" alt="${job.company}" class="company-logo-sm">
        <div class="job-card-info">
          <h3 class="job-card-title">${job.title}</h3>
          <a href="${job.companyLink}" target="_blank" class="job-card-company">${job.company}</a>
          <div class="job-card-rating">${renderStars(job.rating)}</div>
        </div>
      </div>
      
      <div class="job-card-body">
        <p class="job-card-description">${job.brief}</p>
        
        <div class="job-card-tags">
          <span class="job-tag">${job.schedule}</span>
          <span class="job-tag">${job.workplace}</span>
          <span class="job-tag">${job.category}</span>
        </div>
        
        <div class="job-card-meta">
          <div class="job-meta-info">
            <div class="meta-item">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              ${job.location.split(',')[0]}
            </div>
            <div class="meta-item">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              ${job.salary || 'Competitive'}
            </div>
          </div>
          
          <div class="job-card-actions">
            <button onclick="toggleFavorite('${job.id}')" class="job-action-btn ${isFavorite ? 'active' : ''}" title="Add to favorites">
              <svg class="w-5 h-5" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
            </button>
            <button onclick="toggleSave('${job.id}')" class="job-action-btn ${isSaved ? 'active' : ''}" title="Save job">
              <svg class="w-5 h-5" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
              </svg>
            </button>
            <button onclick="openViewJobModal('${job.id}')" class="job-action-btn" title="View details">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Render Star Rating
function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  let stars = '';

  for (let i = 0; i < fullStars; i++) {
    stars += `<svg class="w-4 h-4" style="color: #f59e0b;" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
    </svg>`;
  }

  if (hasHalfStar) {
    stars += `<svg class="w-4 h-4" style="color: #f59e0b;" fill="currentColor" viewBox="0 0 20 20" style="opacity: 0.5;">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
    </svg>`;
  }

  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars += `<svg class="w-4 h-4" style="color: #d1d5db;" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
    </svg>`;
  }

  return stars;
}

// Toggle Favorite
function toggleFavorite(jobId) {
  favoriteJobs[jobId] = !favoriteJobs[jobId];
  localStorage.setItem('favoriteJobs', JSON.stringify(favoriteJobs));
  
  // Update UI
  const cards = document.querySelectorAll(`[data-job-id="${jobId}"]`);
  cards.forEach(card => {
    const btn = card.querySelector('.job-action-btn');
    const svg = btn.querySelector('svg');
    if (favoriteJobs[jobId]) {
      btn.classList.add('active');
      svg.setAttribute('fill', 'currentColor');
    } else {
      btn.classList.remove('active');
      svg.setAttribute('fill', 'none');
    }
  });

  showNotification(favoriteJobs[jobId] ? 'Added to favorites' : 'Removed from favorites');
}

// Toggle Save
function toggleSave(jobId) {
  if (savedJobs[jobId]) {
    delete savedJobs[jobId];
  } else {
    savedJobs[jobId] = jobData.find(job => job.id === jobId);
  }
  
  localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
  updateSavedJobsBadge();
  
  // Update UI
  const cards = document.querySelectorAll(`[data-job-id="${jobId}"]`);
  cards.forEach(card => {
    const btns = card.querySelectorAll('.job-action-btn');
    const saveBtn = btns[1]; // Save button is second
    const svg = saveBtn.querySelector('svg');
    if (savedJobs[jobId]) {
      saveBtn.classList.add('active');
      svg.setAttribute('fill', 'currentColor');
    } else {
      saveBtn.classList.remove('active');
      svg.setAttribute('fill', 'none');
    }
  });

  showNotification(savedJobs[jobId] ? 'Job saved' : 'Job removed from saved');
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in-up';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Setup Filters with live filtering
function setupFilters() {
  // Category filters
  document.querySelectorAll('[data-filter="category"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        activeFilters.categories.push(checkbox.value);
      } else {
        const index = activeFilters.categories.indexOf(checkbox.value);
        if (index > -1) activeFilters.categories.splice(index, 1);
      }
      applyFilters(); // Apply immediately
    });
  });

  // Experience filters
  document.querySelectorAll('[data-filter="experience"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        activeFilters.experience.push(checkbox.value);
      } else {
        const index = activeFilters.experience.indexOf(checkbox.value);
        if (index > -1) activeFilters.experience.splice(index, 1);
      }
      applyFilters(); // Apply immediately
    });
  });

  // Schedule filters
  document.querySelectorAll('[data-filter="schedule"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        activeFilters.schedule.push(checkbox.value);
      } else {
        const index = activeFilters.schedule.indexOf(checkbox.value);
        if (index > -1) activeFilters.schedule.splice(index, 1);
      }
      applyFilters(); // Apply immediately
    });
  });

  // Workplace filters
  document.querySelectorAll('[data-filter="workplace"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        activeFilters.workplace.push(checkbox.value);
      } else {
        const index = activeFilters.workplace.indexOf(checkbox.value);
        if (index > -1) activeFilters.workplace.splice(index, 1);
      }
      applyFilters(); // Apply immediately
    });
  });

  // Salary range
  const salaryRange = document.getElementById('salary-range');
  if (salaryRange) {
    salaryRange.addEventListener('input', (e) => {
      activeFilters.salaryMin = parseInt(e.target.value);
      document.getElementById('salary-value').textContent = formatCurrency(e.target.value);
      applyFilters(); // Apply immediately
    });
  }

  // Location filter
  const locationSelect = document.querySelector('.filter-select');
  if (locationSelect) {
    locationSelect.addEventListener('change', (e) => {
      activeFilters.location = e.target.value;
      applyFilters(); // Apply immediately
    });
  }
}

// Apply Filters
function applyFilters() {
  filteredJobs = jobData.filter(job => {
    // Category filter
    if (activeFilters.categories.length > 0 && !activeFilters.categories.includes(job.category)) {
      return false;
    }
    
    // Experience filter
    if (activeFilters.experience.length > 0 && !activeFilters.experience.includes(job.experienceLevel)) {
      return false;
    }
    
    // Schedule filter
    if (activeFilters.schedule.length > 0 && !activeFilters.schedule.includes(job.schedule)) {
      return false;
    }
    
    // Workplace filter
    if (activeFilters.workplace.length > 0 && !activeFilters.workplace.includes(job.workplace)) {
      return false;
    }
    
    // Salary filter
    if (job.salaryMin < activeFilters.salaryMin) {
      return false;
    }
    
    // Location filter
    if (activeFilters.location !== 'All Locations' && !job.location.includes(activeFilters.location)) {
      return false;
    }
    
    return true;
  });

  currentPage = 1;
  renderJobList(filteredJobs, document.getElementById('job-list'));
  updateJobCount();
  showNotification(`Found ${filteredJobs.length} jobs matching your criteria`);
}

// Clear Filters
function clearFilters() {
  // Reset checkboxes
  document.querySelectorAll('input[type="checkbox"][data-filter]').forEach(checkbox => {
    checkbox.checked = false;
  });

  // Reset salary range
  const salaryRange = document.getElementById('salary-range');
  if (salaryRange) {
    salaryRange.value = 0;
    document.getElementById('salary-value').textContent = '0 ETB';
  }

  // Reset location
  const locationSelect = document.querySelector('.filter-select');
  if (locationSelect) {
    locationSelect.value = 'All Locations';
  }

  // Reset active filters
  activeFilters = {
    categories: [],
    experience: [],
    schedule: [],
    workplace: [],
    salaryMin: 0,
    location: 'All Locations'
  };

  // Re-render all jobs
  filteredJobs = [...jobData];
  currentPage = 1;
  renderJobList(filteredJobs, document.getElementById('job-list'));
  updateJobCount();
  showNotification('Filters cleared');
}

// Update job count display
function updateJobCount() {
  const jobCount = document.querySelector('.job-count');
  if (jobCount) {
    const showing = Math.min(currentPage * jobsPerPage, filteredJobs.length);
    jobCount.textContent = `Showing 1-${showing} of ${filteredJobs.length} jobs`;
  }
}

// Handle search
function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  
  if (query.length === 0) {
    filteredJobs = [...jobData];
  } else {
    filteredJobs = jobData.filter(job => 
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.category.toLowerCase().includes(query) ||
      job.location.toLowerCase().includes(query) ||
      job.description.toLowerCase().includes(query)
    );
  }
  
  currentPage = 1;
  renderJobList(filteredJobs, document.getElementById('job-list'));
  updateJobCount();
}

// Handle sort
function handleSort(e) {
  const sortBy = e.target.value;
  
  switch(sortBy) {
    case 'Most Recent':
      filteredJobs.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
      break;
    case 'Most Relevant':
      // Sort by rating for now
      filteredJobs.sort((a, b) => b.rating - a.rating);
      break;
    case 'Salary: High to Low':
      filteredJobs.sort((a, b) => b.salaryMax - a.salaryMax);
      break;
    case 'Salary: Low to High':
      filteredJobs.sort((a, b) => a.salaryMin - b.salaryMin);
      break;
  }
  
  renderJobList(filteredJobs, document.getElementById('job-list'));
}

// Load more jobs
function loadMoreJobs() {
  currentPage++;
  renderJobList(filteredJobs, document.getElementById('job-list'), true);
  updateJobCount();
  
  // Hide load more button if all jobs are displayed
  if (currentPage * jobsPerPage >= filteredJobs.length) {
    document.querySelector('.load-more-btn').style.display = 'none';
  }
}

// Switch view (grid/list)
function switchView(view) {
  currentView = view;
  const jobList = document.getElementById('job-list');
  
  // Update view buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.view === view) {
      btn.classList.add('active');
    }
  });
  
  // Update grid class
  if (view === 'list') {
    jobList.classList.remove('job-grid');
    jobList.classList.add('job-list');
  } else {
    jobList.classList.remove('job-list');
    jobList.classList.add('job-grid');
  }
}

// Show saved jobs
function showSavedJobs() {
  const savedJobsArray = Object.values(savedJobs);
  if (savedJobsArray.length === 0) {
    showNotification('No saved jobs yet');
    return;
  }
  
  // Render only saved jobs
  filteredJobs = savedJobsArray;
  currentPage = 1;
  renderJobList(filteredJobs, document.getElementById('job-list'));
  updateJobCount();
  showNotification(`Showing ${savedJobsArray.length} saved jobs`);
}

// Ad rotation
function setupAdRotation() {
  setInterval(() => {
    currentAdIndex = (currentAdIndex + 1) % adImages.length;
    const adImage = document.getElementById('ad-image');
    if (adImage) {
      adImage.src = adImages[currentAdIndex];
    }
  }, 5000);
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Attach Event Listeners
function attachJobCardListeners() {
  document.querySelectorAll('.job-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button') && !e.target.closest('a')) {
        const jobId = card.dataset.jobId;
        openViewJobModal(jobId);
      }
    });
  });
}

// Setup Event Listeners
function setupEventListeners() {
  // Search functionality
  const navSearch = document.getElementById('nav-search');
  if (navSearch) {
    navSearch.addEventListener('input', debounce(handleSearch, 300));
  }

  // Search filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      const filterType = chip.textContent.trim();
      if (filterType === 'All Jobs') {
        filteredJobs = [...jobData];
      } else if (filterType === 'Remote') {
        filteredJobs = jobData.filter(job => job.workplace === 'Remote');
      } else if (filterType === 'Full-time') {
        filteredJobs = jobData.filter(job => job.schedule === 'Full-time');
      } else if (filterType === 'Tech') {
        filteredJobs = jobData.filter(job => job.category === 'Technology');
      }
      
      renderJobList(filteredJobs, document.getElementById('job-list'));
      updateJobCount();
    });
  });

  // Action buttons
  const findJobsBtn = document.getElementById('find-jobs-btn');
  const savedJobsBtn = document.getElementById('saved-jobs-btn');

  if (findJobsBtn) findJobsBtn.addEventListener('click', openFindJobsModal);
  if (savedJobsBtn) savedJobsBtn.addEventListener('click', showSavedJobs);

  // View toggle buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);
    });
  });

  // Load more button
  const loadMoreBtn = document.querySelector('.load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreJobs);
  }

  // Salary range slider
  const salaryRange = document.getElementById('salary-range');
  if (salaryRange) {
    salaryRange.addEventListener('input', (e) => {
      document.getElementById('salary-value').textContent = formatCurrency(e.target.value);
    });
  }

  // Filter buttons (only clear button now)
  document.querySelector('.clear-filters-btn')?.addEventListener('click', clearFilters);
  
  // Sort dropdown
  document.querySelector('.sort-select')?.addEventListener('change', handleSort);

  // Job alert button
  document.querySelector('.alert-btn')?.addEventListener('click', setupJobAlert);

  // Tab navigation
  setupTabNavigation();
}

// Setup job alert
function setupJobAlert() {
  const modal = createAlertModal();
  document.body.appendChild(modal);
}

// Create alert modal
function createAlertModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">Set Up Job Alerts</h3>
        <button onclick="this.closest('.modal-overlay').remove()" class="modal-close">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label required">Alert Name</label>
          <input type="text" id="alert-name" class="form-input" placeholder="e.g., Senior Developer Jobs">
        </div>
        
        <div class="form-group">
          <label class="form-label required">Keywords</label>
          <input type="text" id="alert-keywords" class="form-input" placeholder="e.g., React, Node.js, Senior">
        </div>
        
        <div class="form-group">
          <label class="form-label">Category</label>
          <select id="alert-category" class="form-select">
            <option>All Categories</option>
            <option>Technology</option>
            <option>Finance</option>
            <option>Healthcare</option>
            <option>Education</option>
            <option>Marketing</option>
            <option>Design</option>
            <option>Data & Analytics</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Location</label>
          <input type="text" id="alert-location" class="form-input" placeholder="e.g., Addis Ababa">
        </div>
        
        <div class="form-group">
          <label class="form-label">Frequency</label>
          <select id="alert-frequency" class="form-select">
            <option>Daily</option>
            <option>Weekly</option>
            <option>Instantly</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="alert-email" class="form-checkbox" checked>
            <span>Send email notifications</span>
          </label>
        </div>
        
        <div class="modal-footer">
          <button onclick="this.closest('.modal-overlay').remove()" class="btn-cancel">Cancel</button>
          <button onclick="saveJobAlert()" class="btn-submit">Create Alert</button>
        </div>
      </div>
    </div>
  `;
  return modal;
}

// Save job alert
function saveJobAlert() {
  const alert = {
    id: Date.now(),
    name: document.getElementById('alert-name').value,
    keywords: document.getElementById('alert-keywords').value,
    category: document.getElementById('alert-category').value,
    location: document.getElementById('alert-location').value,
    frequency: document.getElementById('alert-frequency').value,
    email: document.getElementById('alert-email').checked,
    createdAt: new Date().toISOString()
  };
  
  if (!alert.name || !alert.keywords) {
    showNotification('Please fill in required fields');
    return;
  }
  
  jobAlerts.push(alert);
  localStorage.setItem('jobAlerts', JSON.stringify(jobAlerts));
  
  document.querySelector('.modal-overlay').remove();
  showNotification('Job alert created successfully!');
}

// Salary Calculator Function
function openSalaryCalculator() {
  const modal = createSalaryCalculatorModal();
  document.body.appendChild(modal);
}

// Create Salary Calculator Modal
function createSalaryCalculatorModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">Salary Calculator</h3>
        <button onclick="this.closest('.modal-overlay').remove()" class="modal-close">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Job Category</label>
          <select id="calc-category" class="form-select" onchange="updateSalaryEstimate()">
            <option value="technology">Technology</option>
            <option value="finance">Finance</option>
            <option value="healthcare">Healthcare</option>
            <option value="education">Education</option>
            <option value="marketing">Marketing</option>
            <option value="design">Design</option>
            <option value="data">Data & Analytics</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Experience Level</label>
          <select id="calc-experience" class="form-select" onchange="updateSalaryEstimate()">
            <option value="entry">Entry Level (0-2 years)</option>
            <option value="mid">Mid Level (3-5 years)</option>
            <option value="senior">Senior Level (5-10 years)</option>
            <option value="executive">Executive (10+ years)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Location</label>
          <select id="calc-location" class="form-select" onchange="updateSalaryEstimate()">
            <option value="addis">Addis Ababa</option>
            <option value="dire">Dire Dawa</option>
            <option value="mekelle">Mekelle</option>
            <option value="gondar">Gondar</option>
            <option value="hawassa">Hawassa</option>
            <option value="other">Other Cities</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Additional Skills</label>
          <div class="space-y-2">
            <label class="checkbox-label">
              <input type="checkbox" class="form-checkbox" value="5" onchange="updateSalaryEstimate()">
              <span>Leadership/Management</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" class="form-checkbox" value="10" onchange="updateSalaryEstimate()">
              <span>International Experience</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" class="form-checkbox" value="8" onchange="updateSalaryEstimate()">
              <span>Advanced Certifications</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" class="form-checkbox" value="7" onchange="updateSalaryEstimate()">
              <span>Multiple Languages</span>
            </label>
          </div>
        </div>
        
        <div class="salary-result-card" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1)); border-radius: 12px; padding: 1.5rem; margin-top: 2rem;">
          <h4 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">Estimated Salary Range</h4>
          <div id="salary-result" style="font-size: 2rem; font-weight: 700; color: var(--button-bg); margin-bottom: 0.5rem;">
            30,000 - 50,000 ETB
          </div>
          <p style="font-size: 0.875rem; color: var(--text-muted);">Per month (before taxes)</p>
          
          <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(0,0,0,0.1);">
            <h5 style="font-weight: 600; margin-bottom: 0.75rem;">Salary Breakdown</h5>
            <div style="space-y-2">
              <div style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                <span>Base Salary:</span>
                <span id="base-salary">25,000 ETB</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                <span>Experience Bonus:</span>
                <span id="exp-bonus">5,000 ETB</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                <span>Skills Premium:</span>
                <span id="skills-premium">0 ETB</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                <span>Location Adjustment:</span>
                <span id="location-adj">0 ETB</span>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
            <p style="font-size: 0.875rem; color: var(--text);">
              <strong>Note:</strong> This is an estimate based on market data. Actual salaries may vary based on company, specific role, and negotiation.
            </p>
          </div>
        </div>
        
        <div class="modal-footer" style="margin-top: 2rem;">
          <button onclick="this.closest('.modal-overlay').remove()" class="btn-cancel">Close</button>
          <button onclick="saveSalaryCalculation()" class="btn-primary">Save Calculation</button>
        </div>
      </div>
    </div>
  `;
  return modal;
}

// Update Salary Estimate
function updateSalaryEstimate() {
  const category = document.getElementById('calc-category')?.value;
  const experience = document.getElementById('calc-experience')?.value;
  const location = document.getElementById('calc-location')?.value;
  
  // Base salaries by category (in ETB)
  const baseSalaries = {
    technology: { entry: 25000, mid: 50000, senior: 80000, executive: 120000 },
    finance: { entry: 30000, mid: 60000, senior: 90000, executive: 130000 },
    healthcare: { entry: 28000, mid: 55000, senior: 85000, executive: 125000 },
    education: { entry: 20000, mid: 35000, senior: 50000, executive: 70000 },
    marketing: { entry: 22000, mid: 45000, senior: 70000, executive: 100000 },
    design: { entry: 23000, mid: 48000, senior: 75000, executive: 110000 },
    data: { entry: 27000, mid: 58000, senior: 88000, executive: 128000 }
  };
  
  // Location multipliers
  const locationMultipliers = {
    addis: 1.2,
    dire: 1.0,
    mekelle: 0.95,
    gondar: 0.9,
    hawassa: 0.92,
    other: 0.85
  };
  
  let baseSalary = baseSalaries[category]?.[experience] || 30000;
  let locationAdjustment = baseSalary * (locationMultipliers[location] - 1);
  
  // Calculate skills premium
  let skillsBonus = 0;
  document.querySelectorAll('.modal-body input[type="checkbox"]:checked').forEach(checkbox => {
    skillsBonus += (baseSalary * parseInt(checkbox.value) / 100);
  });
  
  // Experience bonus
  const expBonuses = { entry: 0, mid: 5000, senior: 10000, executive: 20000 };
  const expBonus = expBonuses[experience] || 0;
  
  const minSalary = Math.round(baseSalary + locationAdjustment + skillsBonus);
  const maxSalary = Math.round(minSalary * 1.3); // 30% range
  
  // Update display
  document.getElementById('salary-result').textContent = `${formatNumber(minSalary)} - ${formatNumber(maxSalary)} ETB`;
  document.getElementById('base-salary').textContent = `${formatNumber(baseSalary)} ETB`;
  document.getElementById('exp-bonus').textContent = `${formatNumber(expBonus)} ETB`;
  document.getElementById('skills-premium').textContent = `${formatNumber(Math.round(skillsBonus))} ETB`;
  document.getElementById('location-adj').textContent = `${formatNumber(Math.round(locationAdjustment))} ETB`;
}

// Save Salary Calculation
function saveSalaryCalculation() {
  const calculation = {
    category: document.getElementById('calc-category')?.value,
    experience: document.getElementById('calc-experience')?.value,
    location: document.getElementById('calc-location')?.value,
    result: document.getElementById('salary-result')?.textContent,
    savedAt: new Date().toISOString()
  };
  
  const savedCalculations = JSON.parse(localStorage.getItem('salaryCalculations') || '[]');
  savedCalculations.push(calculation);
  localStorage.setItem('salaryCalculations', JSON.stringify(savedCalculations));
  
  document.querySelector('.modal-overlay').remove();
  showNotification('Salary calculation saved!');
}

// Create alert modal
function createAlertModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">Set Up Job Alerts</h3>
        <button onclick="this.closest('.modal-overlay').remove()" class="modal-close">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label required">Alert Name</label>
          <input type="text" id="alert-name" class="form-input" placeholder="e.g., Senior Developer Jobs">
        </div>
        
        <div class="form-group">
          <label class="form-label required">Keywords</label>
          <input type="text" id="alert-keywords" class="form-input" placeholder="e.g., React, Node.js, Senior">
        </div>
        
        <div class="form-group">
          <label class="form-label">Category</label>
          <select id="alert-category" class="form-select">
            <option>All Categories</option>
            <option>Technology</option>
            <option>Finance</option>
            <option>Healthcare</option>
            <option>Education</option>
            <option>Marketing</option>
            <option>Design</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Location</label>
          <input type="text" id="alert-location" class="form-input" placeholder="e.g., Addis Ababa">
        </div>
        
        <div class="form-group">
          <label class="form-label">Frequency</label>
          <select id="alert-frequency" class="form-select">
            <option>Daily</option>
            <option>Weekly</option>
            <option>Instantly</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="alert-email" class="form-checkbox" checked>
            <span>Send email notifications</span>
          </label>
        </div>
        
        <div class="modal-footer">
          <button onclick="this.closest('.modal-overlay').remove()" class="btn-cancel">Cancel</button>
          <button onclick="saveJobAlert()" class="btn-submit">Create Alert</button>
        </div>
      </div>
    </div>
  `;
  return modal;
}

// Save job alert
function saveJobAlert() {
  const alert = {
    id: Date.now(),
    name: document.getElementById('alert-name').value,
    keywords: document.getElementById('alert-keywords').value,
    category: document.getElementById('alert-category').value,
    location: document.getElementById('alert-location').value,
    frequency: document.getElementById('alert-frequency').value,
    email: document.getElementById('alert-email').checked,
    createdAt: new Date().toISOString()
  };
  
  if (!alert.name || !alert.keywords) {
    showNotification('Please fill in required fields');
    return;
  }
  
  jobAlerts.push(alert);
  localStorage.setItem('jobAlerts', JSON.stringify(jobAlerts));
  
  document.querySelector('.modal-overlay').remove();
  showNotification('Job alert created successfully!');
}

// Tab navigation setup
function setupTabNavigation() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = {
    'applicants-tab': 'applicants-content',
    'job-posts-tab': 'job-posts-content',
    'publish-job-tab': 'publish-job-content'
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Show corresponding panel
      Object.values(panels).forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.add('hidden');
      });

      const activePanel = document.getElementById(panels[tab.id]);
      if (activePanel) {
        activePanel.classList.remove('hidden');
      }
    });
  });
}

// Initialize modals
function initializeModals() {
  // Close modals when clicking overlay
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.add('hidden');
    }
  });
}

// Modal Functions
function openFindJobsModal() {
  const modal = document.getElementById('find-jobs-modal');
  if (modal) {
    modal.classList.remove('hidden');
    // Populate with all jobs
    const listContainer = document.getElementById('find-jobs-list');
    if (listContainer) {
      const jobCards = jobData.map(job => createJobCard(job)).join('');
      listContainer.innerHTML = jobCards;
    }
    
    // Setup live search for modal
    const modalSearchInput = modal.querySelector('.modal-search-input');
    if (modalSearchInput) {
      modalSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        let filteredModalJobs = jobData;
        
        if (query.length > 0) {
          filteredModalJobs = jobData.filter(job => 
            job.title.toLowerCase().includes(query) ||
            job.company.toLowerCase().includes(query) ||
            job.category.toLowerCase().includes(query) ||
            job.location.toLowerCase().includes(query) ||
            job.description.toLowerCase().includes(query)
          );
        }
        
        const jobCards = filteredModalJobs.map(job => createJobCard(job)).join('');
        listContainer.innerHTML = jobCards || '<p class="text-center text-gray-500 py-4">No jobs found matching your search</p>';
        attachJobCardListeners();
      });
    }
  }
}

function closeFindJobsModal() {
  document.getElementById('find-jobs-modal')?.classList.add('hidden');
}

function openViewJobModal(jobId) {
  const job = jobData.find(j => j.id === jobId);
  if (!job) return;

  const modal = document.getElementById('view-job-modal');
  if (!modal) return;

  // Populate modal with job data
  document.getElementById('view-job-title').textContent = job.title;
  document.getElementById('view-job-cover').src = job.coverPhoto;
  document.getElementById('view-job-agency-pic').src = job.agencyPic;
  document.getElementById('view-job-company').textContent = job.company;
  document.getElementById('view-job-company').href = job.companyLink;
  document.getElementById('view-job-rating').innerHTML = renderStars(job.rating);
  document.getElementById('view-job-location').textContent = job.location;
  document.getElementById('view-job-schedule').textContent = job.schedule;
  document.getElementById('view-job-workplace').textContent = job.workplace;
  document.getElementById('view-job-experience').textContent = job.experience;
  document.getElementById('view-job-post-date').textContent = formatDate(job.postDate);
  document.getElementById('view-job-period').textContent = job.period;
  document.getElementById('view-job-description').textContent = job.description;
  document.getElementById('view-job-expectations').textContent = job.expectations;
  document.getElementById('view-job-benefits').textContent = job.benefits;
  document.getElementById('view-job-documents').textContent = job.documents;

  // Store current job ID for resume submission
  modal.dataset.currentJobId = jobId;

  modal.classList.remove('hidden');
}

function closeViewJobModal() {
  document.getElementById('view-job-modal')?.classList.add('hidden');
}

function openPostJobsModal() {
  const modal = document.getElementById('post-jobs-modal');
  if (modal) {
    modal.classList.remove('hidden');
    // Load sample applicants
    loadApplicants();
  }
}

function closePostJobsModal() {
  document.getElementById('post-jobs-modal')?.classList.add('hidden');
}

function closeResumeModal() {
  document.getElementById('resume-modal')?.classList.add('hidden');
}

function closeCertificationModal() {
  document.getElementById('certification-modal')?.classList.add('hidden');
}

// Load applicants for employer dashboard
function loadApplicants() {
  const container = document.getElementById('applicants-list');
  if (!container) return;

  const applicantCards = `
    <div class="applicant-card">
      <div class="flex items-center gap-3 mb-3">
        <img src="https://via.placeholder.com/50/74B9FF/FFFFFF?text=AK" alt="Applicant" class="w-12 h-12 rounded-full">
        <div>
          <h4 class="font-semibold">Abebe Kebede</h4>
          <p class="text-sm text-gray-500">Applied 2 hours ago</p>
        </div>
      </div>
      <p class="text-sm mb-3">Senior Software Engineer position</p>
      <div class="flex gap-2">
        <button class="btn-sm primary">View Profile</button>
        <button class="btn-sm secondary">Download Resume</button>
      </div>
    </div>
    <div class="applicant-card">
      <div class="flex items-center gap-3 mb-3">
        <img src="https://via.placeholder.com/50/A29BFE/FFFFFF?text=SM" alt="Applicant" class="w-12 h-12 rounded-full">
        <div>
          <h4 class="font-semibold">Sarah Mumbi</h4>
          <p class="text-sm text-gray-500">Applied 1 day ago</p>
        </div>
      </div>
      <p class="text-sm mb-3">Data Analyst position</p>
      <div class="flex gap-2">
        <button class="btn-sm primary">View Profile</button>
        <button class="btn-sm secondary">Download Resume</button>
      </div>
    </div>
  `;

  container.innerHTML = applicantCards;
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

// Submit Resume
function submitResume() {
  const resumeText = document.getElementById('resume-text').value;
  const resumeFile = document.getElementById('resume-upload').files[0];
  const saveResume = document.getElementById('save-resume').checked;
  
  if (!resumeText && !resumeFile) {
    showNotification('Please provide a resume');
    return;
  }
  
  // Get the job ID from the view modal
  const viewModal = document.getElementById('view-job-modal');
  const jobId = viewModal.dataset.currentJobId;
  const job = jobData.find(j => j.id === jobId);
  
  // Save application
  const application = {
    jobId: jobId,
    jobTitle: job.title,
    company: job.company,
    resumeText: resumeText,
    resumeFile: resumeFile ? resumeFile.name : null,
    saveResume: saveResume,
    appliedAt: new Date().toISOString()
  };
  
  // Store in localStorage (in real app, send to server)
  const applications = JSON.parse(localStorage.getItem('applications') || '[]');
  applications.push(application);
  localStorage.setItem('applications', JSON.stringify(applications));
  
  if (saveResume && resumeText) {
    localStorage.setItem('savedResume', resumeText);
  }
  
  closeResumeModal();
  showNotification('Application submitted successfully!');
}

// Submit Certification
function submitCertification() {
  const certFiles = document.getElementById('certification-upload').files;
  
  if (certFiles.length === 0) {
    showNotification('Please select certification files');
    return;
  }
  
  // Get the job ID from the view modal
  const viewModal = document.getElementById('view-job-modal');
  const jobId = viewModal.dataset.currentJobId;
  
  // Save certifications
  const certifications = Array.from(certFiles).map(file => ({
    name: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString()
  }));
  
  // Store in localStorage (in real app, send to server)
  const storedCerts = JSON.parse(localStorage.getItem('certifications') || '{}');
  storedCerts[jobId] = certifications;
  localStorage.setItem('certifications', JSON.stringify(storedCerts));
  
  closeCertificationModal();
  showNotification('Certifications uploaded successfully! Verification pending.');
}

// Publish Job (Employer)
function publishJob() {
  const jobData = {
    title: document.getElementById('job-title').value,
    company: document.getElementById('company-name').value,
    companyLink: document.getElementById('company-link').value,
    phone: document.getElementById('company-phone').value,
    email: document.getElementById('company-email').value,
    location: document.getElementById('job-location').value,
    brief: document.getElementById('job-brief').value,
    description: document.getElementById('job-description').value,
    documents: document.getElementById('job-documents').value,
    experience: document.getElementById('job-experience').value,
    period: document.getElementById('job-period').value,
    schedule: document.getElementById('job-schedule').value,
    workplace: document.getElementById('job-workplace').value,
    expectations: document.getElementById('job-expectations').value,
    benefits: document.getElementById('job-benefits').value
  };
  
  // Validate required fields
  if (!jobData.title || !jobData.company || !jobData.phone || !jobData.email || 
      !jobData.location || !jobData.brief || !jobData.description) {
    showNotification('Please fill in all required fields');
    return;
  }
  
  // Store job (in real app, send to server)
  const publishedJobs = JSON.parse(localStorage.getItem('publishedJobs') || '[]');
  publishedJobs.push({
    ...jobData,
    id: `job_${Date.now()}`,
    publishedAt: new Date().toISOString(),
    status: 'active'
  });
  localStorage.setItem('publishedJobs', JSON.stringify(publishedJobs));
  
  // Reset form
  document.getElementById('publish-job-form').reset();
  
  showNotification('Job published successfully!');
  
  // Switch to job posts tab
  document.getElementById('job-posts-tab').click();
  loadPublishedJobs();
}

// Load published jobs
function loadPublishedJobs() {
  const publishedJobs = JSON.parse(localStorage.getItem('publishedJobs') || '[]');
  const container = document.getElementById('job-posts-list');
  
  if (!container) return;
  
  if (publishedJobs.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500">No published jobs yet</p>';
    return;
  }
  
  const jobCards = publishedJobs.map(job => `
    <div class="job-card">
      <h3 class="font-semibold text-lg mb-2">${job.title}</h3>
      <p class="text-sm text-gray-600 mb-2">${job.company}</p>
      <p class="text-sm mb-3">${job.brief}</p>
      <div class="flex justify-between items-center">
        <span class="text-xs text-gray-500">Published ${formatDate(job.publishedAt)}</span>
        <div class="flex gap-2">
          <button class="btn-sm secondary">Edit</button>
          <button class="btn-sm primary">View Applicants</button>
        </div>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = jobCards;
}

// Close Applicant View Modal
function closeApplicantViewModal() {
  document.getElementById('applicant-view-modal')?.classList.add('hidden');
}

// Close Job Post View Modal
function closeJobPostViewModal() {
  document.getElementById('job-post-view-modal')?.classList.add('hidden');
}

// Enhanced Mock Applicant Data
const applicantData = [
  {
    id: 'applicant1',
    name: 'Abebe Kebede',
    profilePic: 'https://via.placeholder.com/50/74B9FF/FFFFFF?text=AK',
    coverPhoto: 'https://via.placeholder.com/728x200/DFE6E9/2D3436?text=Professional+Profile',
    rating: 4.5,
    phone: '+251-912-345-680',
    email: 'abebe.kebede@email.com',
    location: 'Addis Ababa, Ethiopia',
    bio: 'Experienced software engineer with 7+ years building scalable applications. Passionate about clean code, system design, and mentoring junior developers.',
    quote: 'Code is poetry written in logic.',
    experience: '7 years',
    skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS'],
    socials: {
      facebook: 'https://facebook.com/abebe',
      linkedin: 'https://linkedin.com/in/abebe',
      twitter: 'https://twitter.com/abebe',
      github: 'https://github.com/abebe'
    },
    documents: 'Resume, Cover Letter, Certificates, GitHub Portfolio'
  },
  {
    id: 'applicant2',
    name: 'Sarah Mumbi',
    profilePic: 'https://via.placeholder.com/50/A29BFE/FFFFFF?text=SM',
    coverPhoto: 'https://via.placeholder.com/728x200/FFEAA7/2D3436?text=Data+Expert',
    rating: 4,
    phone: '+254-712-345-678',
    email: 'sarah.mumbi@email.com',
    location: 'Nairobi, Kenya',
    bio: 'Data analyst specialized in extracting actionable insights from complex datasets. Expert in machine learning and predictive analytics.',
    quote: 'Data tells stories that drive decisions.',
    experience: '5 years',
    skills: ['Python', 'SQL', 'Tableau', 'Machine Learning', 'Statistics'],
    socials: {
      facebook: 'https://facebook.com/sarah',
      linkedin: 'https://linkedin.com/in/sarah',
      twitter: 'https://twitter.com/sarah',
      kaggle: 'https://kaggle.com/sarah'
    },
    documents: 'Resume, Portfolio, Kaggle Profile'
  }
];

// Setup resume and certification button handlers
document.addEventListener('DOMContentLoaded', () => {
  // Resume button handler
  const resumeBtn = document.getElementById('resume-btn');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      const resumeModal = document.getElementById('resume-modal');
      if (resumeModal) {
        resumeModal.classList.remove('hidden');
        
        // Load saved resume if exists
        const savedResume = localStorage.getItem('savedResume');
        if (savedResume) {
          document.getElementById('resume-text').value = savedResume;
        }
      }
    });
  }
  
  // Certification button handler
  const certBtn = document.getElementById('certification-btn');
  if (certBtn) {
    certBtn.addEventListener('click', () => {
      const certModal = document.getElementById('certification-modal');
      if (certModal) {
        certModal.classList.remove('hidden');
        
        // Load existing certifications if any
        const viewModal = document.getElementById('view-job-modal');
        const jobId = viewModal.dataset.currentJobId;
        const storedCerts = JSON.parse(localStorage.getItem('certifications') || '{}');
        
        if (storedCerts[jobId]) {
          const certList = document.getElementById('certification-list');
          if (certList) {
            certList.innerHTML = storedCerts[jobId].map(cert => `
              <div class="flex items-center justify-between p-2 bg-gray-50 rounded mb-2">
                <span class="text-sm">${cert.name}</span>
                <span class="text-xs text-green-600">✓ Uploaded</span>
              </div>
            `).join('');
          }
        }
      }
    });
  }
});

// Add custom styles for list view
const style = document.createElement('style');
style.textContent = `
  .job-list .job-card {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .job-list .job-card-header {
    margin-right: 2rem;
  }
  
  .job-list .job-card-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .job-list .job-card-description {
    display: none;
  }
  
  .job-list .job-card-tags {
    margin-right: 2rem;
  }
  
  .animate-slide-in-up {
    animation: slideInUp 0.3s ease-out;
  }
  
  @keyframes slideInUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);

// Initialize counter animation for stats
function initializeCounters() {
  // Set actual counts based on data
  const jobCount = document.querySelector('[data-count="2547"]');
  const companyCount = document.querySelector('[data-count="892"]');
  const candidateCount = document.querySelector('[data-count="15234"]');
  
  if (jobCount) {
    jobCount.setAttribute('data-count', jobData.length * 100); // Multiply for demo
    jobCount.textContent = '0';
  }
  if (companyCount) {
    const uniqueCompanies = new Set(jobData.map(j => j.company)).size;
    companyCount.setAttribute('data-count', uniqueCompanies * 50); // Multiply for demo
    companyCount.textContent = '0';
  }
  if (candidateCount) {
    candidateCount.setAttribute('data-count', '15234');
    candidateCount.textContent = '0';
  }
  
  // Trigger animation after a short delay
  setTimeout(() => {
    animateStats();
  }, 500);
}

// Call on page load
document.addEventListener('DOMContentLoaded', initializeCounters);

console.log('Find Jobs page initialized successfully!');