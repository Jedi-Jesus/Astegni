// ============================================
// EMPLOYER DASHBOARD JAVASCRIPT
// ============================================

// Mock Data
const companyData = {
  name: 'Tech Corp Ethiopia',
  logo: 'https://via.placeholder.com/120/FF6B6B/FFFFFF?text=TC',
  coverPhoto: 'https://via.placeholder.com/1400x300/4ECDC4/FFFFFF?text=Tech+Corp+Cover',
  rating: 4.8,
  reviews: 234,
  followers: 12500,
  phone: '+251-911-123-456',
  email: 'careers@techcorp.et',
  location: 'Addis Ababa, Ethiopia',
  bio: 'Leading technology company in Ethiopia, specializing in innovative software solutions for businesses. We\'re building the future of African tech, one line of code at a time.',
  quote: 'Innovation is our passion, excellence is our standard',
  verified: true,
  socials: {
    facebook: 'https://facebook.com/techcorp',
    twitter: 'https://twitter.com/techcorp',
    linkedin: 'https://linkedin.com/company/techcorp',
    youtube: 'https://youtube.com/techcorp',
    instagram: 'https://instagram.com/techcorp',
    website: 'https://techcorp.et'
  }
};

// Mock Jobs Data
const jobsData = [
  {
    id: 1,
    title: 'Senior Software Engineer',
    applicants: 45,
    views: 1234,
    status: 'active',
    postedDate: '2025-07-20',
    deadline: '2025-08-20'
  },
  {
    id: 2,
    title: 'UX/UI Designer',
    applicants: 32,
    views: 987,
    status: 'active',
    postedDate: '2025-07-22',
    deadline: '2025-08-22'
  },
  {
    id: 3,
    title: 'Project Manager',
    applicants: 28,
    views: 765,
    status: 'paused',
    postedDate: '2025-07-15',
    deadline: '2025-08-15'
  },
  {
    id: 4,
    title: 'Data Analyst',
    applicants: 67,
    views: 2345,
    status: 'active',
    postedDate: '2025-07-25',
    deadline: '2025-08-25'
  },
  {
    id: 5,
    title: 'Marketing Manager',
    applicants: 19,
    views: 543,
    status: 'closed',
    postedDate: '2025-06-01',
    deadline: '2025-07-01'
  }
];

// Mock Videos Data
const videosData = [
  {
    id: 1,
    title: 'Day in the Life at Tech Corp',
    thumbnail: 'https://via.placeholder.com/320x180/FF6B6B/FFFFFF?text=Day+in+Life',
    duration: '5:23',
    views: 12000,
    likes: 234,
    comments: 45,
    uploadDate: '2 days ago',
    type: 'normal'
  },
  {
    id: 2,
    title: 'Our Office Tour',
    thumbnail: 'https://via.placeholder.com/320x180/4ECDC4/FFFFFF?text=Office+Tour',
    duration: '8:45',
    views: 8500,
    likes: 189,
    comments: 32,
    uploadDate: '1 week ago',
    type: 'normal'
  },
  {
    id: 3,
    title: 'Interview Tips from HR',
    thumbnail: 'https://via.placeholder.com/320x180/A8E6CF/FFFFFF?text=Interview+Tips',
    duration: '12:30',
    views: 25000,
    likes: 567,
    comments: 89,
    uploadDate: '2 weeks ago',
    type: 'normal'
  },
  {
    id: 4,
    title: 'Quick Office Tour',
    thumbnail: 'https://via.placeholder.com/180x320/FD79A8/FFFFFF?text=Quick+Tour',
    duration: '0:45',
    views: 50000,
    type: 'shorts'
  },
  {
    id: 5,
    title: 'Tech Stack Preview',
    thumbnail: 'https://via.placeholder.com/180x320/FFD3B6/FFFFFF?text=Tech+Stack',
    duration: '0:30',
    views: 35000,
    type: 'shorts'
  },
  {
    id: 6,
    title: 'Team Introduction',
    thumbnail: 'https://via.placeholder.com/180x320/FFEAA7/FFFFFF?text=Team+Intro',
    duration: '0:58',
    views: 42000,
    type: 'shorts'
  }
];

// Mock Playlists Data
const playlistsData = [
  {
    id: 1,
    title: 'Interview Tips & Preparation',
    thumbnail: 'https://via.placeholder.com/320x180/6C5CE7/FFFFFF?text=Interview+Playlist',
    videoCount: 12,
    description: 'Everything you need to know before applying'
  },
  {
    id: 2,
    title: 'Company Culture',
    thumbnail: 'https://via.placeholder.com/320x180/74B9FF/FFFFFF?text=Culture+Playlist',
    videoCount: 8,
    description: 'Get to know our team and work environment'
  },
  {
    id: 3,
    title: 'Career Growth at Tech Corp',
    thumbnail: 'https://via.placeholder.com/320x180/A29BFE/FFFFFF?text=Career+Growth',
    videoCount: 6,
    description: 'Learn about career opportunities and growth paths'
  }
];

// Mock Applicants Data
const applicantsData = [
  {
    id: 1,
    name: 'Abebe Kebede',
    position: 'Senior Software Engineer',
    avatar: 'https://via.placeholder.com/50/74B9FF/FFFFFF?text=AK',
    experience: '5 years',
    skills: ['React', 'Node.js', 'Python'],
    status: 'new',
    appliedDate: '2 hours ago'
  },
  {
    id: 2,
    name: 'Sara Tadesse',
    position: 'UX/UI Designer',
    avatar: 'https://via.placeholder.com/50/A29BFE/FFFFFF?text=ST',
    experience: '3 years',
    skills: ['Figma', 'Adobe XD', 'Sketch'],
    status: 'reviewed',
    appliedDate: '1 day ago'
  },
  {
    id: 3,
    name: 'Michael Haile',
    position: 'Project Manager',
    avatar: 'https://via.placeholder.com/50/6C5CE7/FFFFFF?text=MH',
    experience: '7 years',
    skills: ['Agile', 'Scrum', 'JIRA'],
    status: 'shortlisted',
    appliedDate: '3 days ago'
  },
  {
    id: 4,
    name: 'Helen Alemayehu',
    position: 'Data Analyst',
    avatar: 'https://via.placeholder.com/50/FD79A8/FFFFFF?text=HA',
    experience: '4 years',
    skills: ['Python', 'SQL', 'Tableau'],
    status: 'new',
    appliedDate: '5 hours ago'
  }
];

// Mock Comments Data (only comments directed to the employer)
const commentsData = [
  {
    id: 1,
    author: 'John Doe',
    avatar: 'https://via.placeholder.com/40',
    time: '2 hours ago',
    badge: 'Verified Employee',
    text: 'Great company to work for! The culture is amazing and the benefits are top-notch. Management really cares about employee growth.',
    likes: 24,
    type: 'review',
    reply: {
      author: 'Tech Corp',
      avatar: 'https://via.placeholder.com/32/FF6B6B/FFFFFF?text=TC',
      time: '1 hour ago',
      text: 'Thank you for your kind words! We\'re glad you\'re enjoying your time with us.',
      verified: true
    }
  },
  {
    id: 2,
    author: 'Sarah Johnson',
    avatar: 'https://via.placeholder.com/40',
    time: '1 day ago',
    text: 'I applied for the Software Engineer position last week. When can I expect to hear back?',
    likes: 5,
    type: 'question',
    reply: {
      author: 'Tech Corp',
      avatar: 'https://via.placeholder.com/32/FF6B6B/FFFFFF?text=TC',
      time: '23 hours ago',
      text: 'Hi Sarah! Our HR team reviews applications within 5-7 business days. You should hear from us soon!',
      verified: true
    }
  },
  {
    id: 3,
    author: 'Mike Chen',
    avatar: 'https://via.placeholder.com/40',
    time: '3 days ago',
    badge: 'Former Employee',
    text: 'I worked here for 3 years and it was an incredible journey. The learning opportunities are endless!',
    likes: 45,
    type: 'review',
    reply: null
  },
  {
    id: 4,
    author: 'Emily Davis',
    avatar: 'https://via.placeholder.com/40',
    time: '1 week ago',
    text: 'Your interview tips video was really helpful! Thanks for sharing such valuable content.',
    likes: 67,
    type: 'video',
    reply: {
      author: 'Tech Corp',
      avatar: 'https://via.placeholder.com/32/FF6B6B/FFFFFF?text=TC',
      time: '6 days ago',
      text: 'We\'re happy you found it useful! Check out our playlist for more career tips.',
      verified: true
    }
  },
  {
    id: 5,
    author: 'David Wilson',
    avatar: 'https://via.placeholder.com/40',
    time: '2 weeks ago',
    text: 'Do you offer remote work options for international applicants?',
    likes: 12,
    type: 'question',
    reply: {
      author: 'Tech Corp',
      avatar: 'https://via.placeholder.com/32/FF6B6B/FFFFFF?text=TC',
      time: '2 weeks ago',
      text: 'Yes, we do offer remote positions for certain roles. Please check the job descriptions for specific details.',
      verified: true
    }
  }
];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupVideoTabs();
  renderJobs();
  renderVideos();
  renderApplicants();
  renderComments();
  setupModals();
  setupTheme();
  animateStats();
});

// Setup Main Tabs
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      
      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Show corresponding panel
      tabPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `${tabName}-tab`) {
          panel.classList.add('active');
        }
      });
    });
  });
}

// Setup Video Sub-tabs
function setupVideoTabs() {
  const videoTabButtons = document.querySelectorAll('.video-tab-btn');
  const videoPanels = document.querySelectorAll('.video-panel');
  
  videoTabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const videoTab = button.dataset.videoTab;
      
      // Update active states
      videoTabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Show corresponding panel
      videoPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `${videoTab}-videos`) {
          panel.classList.add('active');
        }
      });
      
      // Render appropriate content
      if (videoTab === 'all') {
        renderAllVideos();
      } else if (videoTab === 'normal') {
        renderNormalVideos();
      } else if (videoTab === 'shorts') {
        renderShorts();
      } else if (videoTab === 'playlists') {
        renderPlaylists();
      }
    });
  });
}

// Render Jobs Table
function renderJobs() {
  const jobsList = document.getElementById('employer-jobs-list');
  if (!jobsList) return;
  
  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>Job Title</th>
          <th>Applicants</th>
          <th>Views</th>
          <th>Status</th>
          <th>Posted</th>
          <th>Deadline</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${jobsData.map(job => `
          <tr class="job-row">
            <td class="job-title-cell">${job.title}</td>
            <td><span class="applicants-count">${job.applicants}</span></td>
            <td>${job.views.toLocaleString()}</td>
            <td><span class="job-status ${job.status}">${job.status}</span></td>
            <td>${formatDate(job.postedDate)}</td>
            <td>${formatDate(job.deadline)}</td>
            <td>
              <div class="job-actions">
                <button class="action-btn" onclick="viewJobDetails(${job.id})" title="View">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                </button>
                <button class="action-btn" onclick="editJob(${job.id})" title="Edit">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button class="action-btn" onclick="toggleJobStatus(${job.id})" title="Toggle Status">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    ${job.status === 'active' ? 
                      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>' :
                      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
                    }
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  jobsList.innerHTML = tableHTML;
}

// Render All Videos
function renderAllVideos() {
  const container = document.querySelector('#all-videos .videos-grid');
  if (!container) return;
  
  const normalVideos = videosData.filter(v => v.type === 'normal');
  container.innerHTML = normalVideos.map(video => createVideoCard(video)).join('');
}

// Render Normal Videos
function renderNormalVideos() {
  const container = document.querySelector('#normal-videos .videos-grid');
  if (!container) return;
  
  const normalVideos = videosData.filter(v => v.type === 'normal');
  container.innerHTML = normalVideos.map(video => createVideoCard(video)).join('');
}

// Render Shorts
function renderShorts() {
  const container = document.querySelector('#shorts-videos .shorts-grid');
  if (!container) return;
  
  const shorts = videosData.filter(v => v.type === 'shorts');
  container.innerHTML = shorts.map(video => `
    <div class="shorts-card" onclick="playVideo(${video.id})">
      <div class="shorts-thumbnail">
        <img src="${video.thumbnail}" alt="${video.title}">
        <span class="shorts-badge">Shorts</span>
      </div>
      <div class="shorts-info">
        <h4 class="shorts-title">${video.title}</h4>
        <span class="shorts-views">${formatViews(video.views)} views</span>
      </div>
    </div>
  `).join('');
}

// Render Playlists
function renderPlaylists() {
  const container = document.querySelector('#playlists-videos .playlists-grid');
  if (!container) return;
  
  container.innerHTML = playlistsData.map(playlist => `
    <div class="playlist-card" onclick="openPlaylist(${playlist.id})">
      <div class="playlist-thumbnail">
        <img src="${playlist.thumbnail}" alt="${playlist.title}">
        <div class="playlist-overlay">
          <span class="playlist-count">${playlist.videoCount} videos</span>
        </div>
      </div>
      <div class="playlist-info">
        <h3 class="playlist-title">${playlist.title}</h3>
        <p class="playlist-description">${playlist.description}</p>
        <button class="playlist-play-btn" onclick="playPlaylist(${playlist.id}, event)">Play All</button>
      </div>
    </div>
  `).join('');
}

// Create Video Card
function createVideoCard(video) {
  return `
    <div class="video-card" onclick="playVideo(${video.id})">
      <div class="video-thumbnail">
        <img src="${video.thumbnail}" alt="${video.title}">
        <span class="video-duration">${video.duration}</span>
        <div class="video-overlay">
          <button class="play-btn">
            <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="video-info">
        <h3 class="video-title">${video.title}</h3>
        <div class="video-meta">
          <span class="video-views">${formatViews(video.views)} views</span>
          <span class="video-date">${video.uploadDate}</span>
        </div>
        <div class="video-actions">
          <button class="video-action-btn" onclick="likeVideo(${video.id}, event)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
            </svg>
            <span>${video.likes}</span>
          </button>
          <button class="video-action-btn" onclick="openVideoComments(${video.id}, event)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <span>${video.comments}</span>
          </button>
          <button class="video-action-btn" onclick="shareVideo(${video.id}, event)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Render Applicants
function renderApplicants() {
  const container = document.getElementById('applicants-list');
  if (!container) return;
  
  container.innerHTML = applicantsData.map(applicant => `
    <div class="applicant-card">
      <div class="applicant-header">
        <img src="${applicant.avatar}" alt="${applicant.name}" class="applicant-avatar">
        <div class="applicant-info">
          <h4>${applicant.name}</h4>
          <p class="applicant-position">${applicant.position}</p>
        </div>
      </div>
      <div class="applicant-meta">
        ${applicant.skills.map(skill => 
          `<span class="meta-tag">${skill}</span>`
        ).join('')}
      </div>
      <p class="applicant-experience">${applicant.experience} experience</p>
      <p class="applicant-time">Applied ${applicant.appliedDate}</p>
      <div class="applicant-actions">
        <button class="view-btn" onclick="viewApplicant(${applicant.id})">View Profile</button>
        <button class="reject-btn" onclick="rejectApplicant(${applicant.id})">Reject</button>
      </div>
    </div>
  `).join('');
}

// Render Comments (Only comments directed to employer)
function renderComments() {
  const container = document.querySelector('.comment-thread');
  if (!container) return;
  
  container.innerHTML = commentsData.map(comment => `
    <div class="comment">
      <img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar">
      <div class="comment-content">
        <div class="comment-header">
          <span class="comment-author">${comment.author}</span>
          <span class="comment-time">${comment.time}</span>
          ${comment.badge ? `<span class="comment-badge">${comment.badge}</span>` : ''}
        </div>
        <p class="comment-text">${comment.text}</p>
        <div class="comment-actions">
          <button class="comment-action" onclick="likeComment(${comment.id})">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
            </svg>
            <span>${comment.likes}</span>
          </button>
          <button class="comment-action" onclick="replyToComment(${comment.id})">Reply</button>
        </div>
        
        ${comment.reply ? `
          <div class="comment-reply">
            <img src="${comment.reply.avatar}" alt="${comment.reply.author}" class="reply-avatar">
            <div class="reply-content">
              <div class="reply-header">
                <span class="reply-author">${comment.reply.author}</span>
                ${comment.reply.verified ? `
                  <span class="verified-badge-small">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                  </span>
                ` : ''}
                <span class="reply-time">${comment.reply.time}</span>
              </div>
              <p class="reply-text">${comment.reply.text}</p>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Setup Modals
function setupModals() {
  // Close modals when clicking outside
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });
  
  // ESC key to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.add('hidden');
      });
    }
  });
  
  // Setup comment filters
  document.querySelectorAll('.comment-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.comment-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterComments(btn.textContent.toLowerCase());
    });
  });
}

// Modal Functions
window.openPostJobModal = function() {
  document.getElementById('post-job-modal').classList.remove('hidden');
  currentStep = 1;
  updateFormSteps();
}

window.closePostJobModal = function() {
  document.getElementById('post-job-modal').classList.add('hidden');
}

window.openUploadVideoModal = function() {
  document.getElementById('upload-video-modal').classList.remove('hidden');
}

window.closeUploadVideoModal = function() {
  document.getElementById('upload-video-modal').classList.add('hidden');
}

window.openCreatePlaylistModal = function() {
  document.getElementById('create-playlist-modal').classList.remove('hidden');
}

window.closeCreatePlaylistModal = function() {
  document.getElementById('create-playlist-modal').classList.add('hidden');
}

// Multi-step form for job posting
let currentStep = 1;
const totalSteps = 4;

function updateFormSteps() {
  // Update progress indicators
  document.querySelectorAll('.progress-step').forEach((step, index) => {
    if (index + 1 < currentStep) {
      step.classList.add('completed');
      step.classList.remove('active');
    } else if (index + 1 === currentStep) {
      step.classList.add('active');
      step.classList.remove('completed');
    } else {
      step.classList.remove('active', 'completed');
    }
  });
  
  // Show/hide form steps
  document.querySelectorAll('.form-step').forEach((step, index) => {
    step.classList.toggle('active', index + 1 === currentStep);
  });
  
  // Update buttons
  document.getElementById('prev-btn').style.display = currentStep > 1 ? 'block' : 'none';
  document.getElementById('next-btn').style.display = currentStep < totalSteps ? 'block' : 'none';
  document.getElementById('publish-btn').style.display = currentStep === totalSteps ? 'block' : 'none';
}

// Next/Previous buttons
document.getElementById('next-btn')?.addEventListener('click', () => {
  if (currentStep < totalSteps) {
    currentStep++;
    updateFormSteps();
    if (currentStep === totalSteps) {
      generateJobPreview();
    }
  }
});

document.getElementById('prev-btn')?.addEventListener('click', () => {
  if (currentStep > 1) {
    currentStep--;
    updateFormSteps();
  }
});

// Generate job preview
function generateJobPreview() {
  const preview = document.querySelector('.job-preview');
  if (!preview) return;
  
  const title = document.getElementById('job-title')?.value || 'Job Title';
  const location = document.getElementById('job-location')?.value || 'Location';
  const type = document.getElementById('job-type')?.value || 'Full-time';
  const summary = document.getElementById('job-summary')?.value || 'Job summary will appear here...';
  
  preview.innerHTML = `
    <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">${title}</h3>
    <div style="display: flex; gap: 1rem; margin-bottom: 1rem; color: var(--text-muted); font-size: 0.875rem;">
      <span>📍 ${location}</span>
      <span>💼 ${type}</span>
      <span>🏢 Tech Corp Ethiopia</span>
    </div>
    <p style="line-height: 1.6; color: var(--text);">${summary}</p>
    <div style="margin-top: 2rem; padding: 1rem; background: rgba(var(--button-bg-rgb), 0.1); border-radius: 8px;">
      <p style="font-size: 0.875rem; color: var(--text-muted);">This is a preview of how your job posting will appear to candidates.</p>
    </div>
  `;
}

// Action Functions
window.viewJobDetails = function(jobId) {
  showNotification(`Viewing details for job #${jobId}`);
}

window.editJob = function(jobId) {
  showNotification(`Editing job #${jobId}`);
  openPostJobModal();
}

window.toggleJobStatus = function(jobId) {
  const job = jobsData.find(j => j.id === jobId);
  if (job) {
    job.status = job.status === 'active' ? 'paused' : 'active';
    renderJobs();
    showNotification(`Job status updated to ${job.status}`);
  }
}

window.playVideo = function(videoId) {
  showNotification(`Playing video #${videoId}`);
}

window.likeVideo = function(videoId, event) {
  event.stopPropagation();
  const video = videosData.find(v => v.id === videoId);
  if (video) {
    video.likes++;
    renderAllVideos();
    showNotification('Video liked!');
  }
}

window.openVideoComments = function(videoId, event) {
  event.stopPropagation();
  showNotification(`Opening comments for video #${videoId}`);
}

window.shareVideo = function(videoId, event) {
  event.stopPropagation();
  showNotification('Video link copied to clipboard!');
}

window.openPlaylist = function(playlistId) {
  showNotification(`Opening playlist #${playlistId}`);
}

window.playPlaylist = function(playlistId, event) {
  event.stopPropagation();
  showNotification(`Playing all videos in playlist #${playlistId}`);
}

window.viewApplicant = function(applicantId) {
  showNotification(`Viewing applicant #${applicantId}`);
}

window.rejectApplicant = function(applicantId) {
  if (confirm('Are you sure you want to reject this applicant?')) {
    const index = applicantsData.findIndex(a => a.id === applicantId);
    if (index > -1) {
      applicantsData.splice(index, 1);
      renderApplicants();
      showNotification('Applicant rejected');
    }
  }
}

window.likeComment = function(commentId) {
  const comment = commentsData.find(c => c.id === commentId);
  if (comment) {
    comment.likes++;
    renderComments();
    showNotification('Comment liked!');
  }
}

window.replyToComment = function(commentId) {
  const replyText = prompt('Enter your reply:');
  if (replyText) {
    const comment = commentsData.find(c => c.id === commentId);
    if (comment) {
      comment.reply = {
        author: 'Tech Corp',
        avatar: 'https://via.placeholder.com/32/FF6B6B/FFFFFF?text=TC',
        time: 'Just now',
        text: replyText,
        verified: true
      };
      renderComments();
      showNotification('Reply posted!');
    }
  }
}

// Filter Comments
function filterComments(filter) {
  let filtered = commentsData;
  
  if (filter === 'reviews') {
    filtered = commentsData.filter(c => c.type === 'review');
  } else if (filter === 'questions') {
    filtered = commentsData.filter(c => c.type === 'question');
  } else if (filter === 'videos') {
    filtered = commentsData.filter(c => c.type === 'video');
  }
  
  // Re-render with filtered data
  const container = document.querySelector('.comment-thread');
  if (container) {
    const temp = commentsData;
    commentsData = filtered;
    renderComments();
    commentsData = temp; // Restore original data
  }
}

// Theme Setup
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

// Animate Stats
function animateStats() {
  const statValues = document.querySelectorAll('.stat-value');
  
  statValues.forEach(stat => {
    const target = parseInt(stat.textContent);
    if (!target) return;
    
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      stat.textContent = Math.floor(current);
    }, 30);
  });
}

// Show Notification
function showNotification(message, type = 'info') {
  // Remove existing notifications
  document.querySelectorAll('.notification-toast').forEach(n => n.remove());
  
  const notification = document.createElement('div');
  notification.className = `notification-toast ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      ${getNotificationIcon(type)}
      <span>${message}</span>
    </div>
  `;
  
  // Style the notification
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 400px;
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Get Notification Icon
function getNotificationIcon(type) {
  const icons = {
    success: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>',
    error: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>',
    info: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>'
  };
  return icons[type] || icons.info;
}

// Utility Functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatViews(views) {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + 'M';
  } else if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K';
  }
  return views.toString();
}

// Initialize videos on load
renderAllVideos();

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(style);