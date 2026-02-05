// ============================================
// STUDENT COMMUNITY MANAGER - Database Integration
// Complete system for managing Connections, Events, and Clubs
// Adapted from CommunityManager for student profile panel context
// ============================================

// API Base URL
const STUDENT_COMMUNITY_API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

// Cached data for searching
let cachedConnections = [];
let cachedEvents = [];
let cachedClubs = [];

// Pagination settings
const ITEMS_PER_PAGE = 9;
let currentPage = {
  connections: 1,
  events: 1,
  clubs: 1,
  sentRequests: 1,
  receivedRequests: 1
};

// ============================================
// STUDENT-COMMUNITY-PANEL FUNCTIONS (Card-based layout in panel)
// ============================================

// Switch main community tabs (Connections, Events, Clubs, Requests)
function switchCommunityMainTab(section) {
  console.log('Switching to main section:', section);

  // Handle direct requests cards
  if (section === 'requests-sent' || section === 'requests-received') {
    // Hide all main tab content sections
    const mainTabContents = document.querySelectorAll('.community-main-tab-content');
    mainTabContents.forEach(content => {
      content.classList.add('hidden');
    });

    // Show requests content
    const requestsContent = document.getElementById('requests-main-tab-content');
    if (requestsContent) {
      requestsContent.classList.remove('hidden');
    }

    // Update active state on cards
    const mainCards = document.querySelectorAll('.community-main-card');
    mainCards.forEach(card => {
      card.classList.remove('active-community-card');
      card.style.transform = '';
      card.style.boxShadow = '';
    });

    // Add active state to clicked card
    const activeCard = document.getElementById(`${section}-main-tab`);
    if (activeCard) {
      activeCard.classList.add('active-community-card');
      activeCard.style.transform = 'translateY(-4px)';
      activeCard.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
    }

    // IMPORTANT: Fetch data when card is clicked
    const subsection = section === 'requests-sent' ? 'sent' : 'received';
    console.log(`📥 Fetching ${subsection} requests on click...`);
    toggleRequestsSubSection(subsection);
    return;
  }

  // Hide all main tab content sections
  const mainTabContents = document.querySelectorAll('.community-main-tab-content');
  mainTabContents.forEach(content => {
    content.classList.add('hidden');
  });

  // Show the selected section
  const selectedContent = document.getElementById(`${section}-main-tab-content`);
  if (selectedContent) {
    selectedContent.classList.remove('hidden');
  }

  // Update active state on cards
  const mainCards = document.querySelectorAll('.community-main-card');
  mainCards.forEach(card => {
    card.classList.remove('active-community-card');
    // Reset to default style
    card.style.transform = '';
    card.style.boxShadow = '';
  });

  // Add active state to clicked card
  const activeCard = document.getElementById(`${section}-main-tab`);
  if (activeCard) {
    activeCard.classList.add('active-community-card');
    activeCard.style.transform = 'translateY(-4px)';
    activeCard.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
  }

  // Load data for the selected section
  switch (section) {
    case 'connections':
      loadAllConnectionsPanel();
      break;
    case 'events':
      loadEventsPanel();
      break;
    case 'clubs':
      loadClubsPanel();
      break;
    case 'requests':
      loadRequestsPanel();
      break;
  }
}

// Toggle connections sub-sections (All, Tutors, Students, Parents)
function toggleConnectionsSubSection(subsection) {
  console.log('Toggling connections subsection:', subsection);

  // Hide all connection subsections
  const subsections = document.querySelectorAll('.connections-subsection');
  subsections.forEach(section => {
    section.classList.add('hidden');
  });

  // Show selected subsection
  const selectedSubsection = document.getElementById(`${subsection}-connections-subsection`);
  if (selectedSubsection) {
    selectedSubsection.classList.remove('hidden');
  }

  // Update tab button styles
  const tabButtons = document.querySelectorAll('.connections-sub-tab');
  tabButtons.forEach(btn => {
    btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
    btn.classList.add('text-gray-500');
  });

  // Add active style to clicked tab
  const activeTab = document.getElementById(`${subsection}-connections-tab`);
  if (activeTab) {
    activeTab.classList.remove('text-gray-500');
    activeTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
  }
}

// Toggle events sub-sections (Joined, Upcoming, Past)
function toggleEventsSubSection(subsection) {
  console.log('Toggling events subsection:', subsection);

  // Hide all event subsections
  const subsections = document.querySelectorAll('.events-subsection');
  subsections.forEach(section => {
    section.classList.add('hidden');
  });

  // Show selected subsection
  const selectedSubsection = document.getElementById(`${subsection}-events-subsection`);
  if (selectedSubsection) {
    selectedSubsection.classList.remove('hidden');
  }

  // Update card active states
  const eventCards = document.querySelectorAll('.events-subsection').length > 0
    ? document.querySelectorAll('#events-main-tab-content > div:first-child > div')
    : [];

  eventCards.forEach((card, index) => {
    card.classList.remove('active-events-card');
    card.style.transform = '';
    card.style.boxShadow = '';
  });

  // Add active state based on subsection
  const cardIndex = subsection === 'joined' ? 0 : subsection === 'upcoming' ? 1 : 2;
  if (eventCards[cardIndex]) {
    eventCards[cardIndex].classList.add('active-events-card');
    eventCards[cardIndex].style.transform = 'translateY(-4px)';
    eventCards[cardIndex].style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
  }
}

// Toggle clubs sub-sections (Joined, Discover)
function toggleClubsSubSection(subsection) {
  console.log('Toggling clubs subsection:', subsection);

  // Hide all club subsections
  const subsections = document.querySelectorAll('.clubs-subsection');
  subsections.forEach(section => {
    section.classList.add('hidden');
  });

  // Show selected subsection
  const selectedSubsection = document.getElementById(`${subsection}-clubs-subsection`);
  if (selectedSubsection) {
    selectedSubsection.classList.remove('hidden');
  }

  // Update card active states
  const clubCards = document.querySelectorAll('.clubs-subsection').length > 0
    ? document.querySelectorAll('#clubs-main-tab-content > div:first-child > div')
    : [];

  clubCards.forEach((card, index) => {
    card.classList.remove('active-clubs-card');
    card.style.transform = '';
    card.style.boxShadow = '';
  });

  // Add active state based on subsection
  const cardIndex = subsection === 'joined' ? 0 : 1;
  if (clubCards[cardIndex]) {
    clubCards[cardIndex].classList.add('active-clubs-card');
    clubCards[cardIndex].style.transform = 'translateY(-4px)';
    clubCards[cardIndex].style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
  }
}

// Search functions for clubs subsections
function searchJoinedClubs(query) {
  console.log('Searching joined clubs:', query);
  filterClubsBySearch(query, 'joined');
}

function searchDiscoverClubs(query) {
  console.log('Searching discover clubs:', query);
  filterClubsBySearch(query, 'discover');
}

// ============================================
// CONNECTIONS PANEL - DATABASE INTEGRATION
// ============================================

// Load all connections and display in the panel
async function loadAllConnectionsPanel() {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  const grid = document.getElementById('all-connections-grid');

  if (!grid) return;
  if (!token) {
    grid.innerHTML = '<div class="col-span-3 text-center py-8 text-gray-500">Please log in to view connections</div>';
    return;
  }

  grid.innerHTML = '<div class="col-span-3 text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i><p class="text-gray-500 mt-2">Loading connections...</p></div>';

  // Get active role from JWT token
  let activeRole = 'student';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    activeRole = payload.role || 'student';
  } catch (e) {
    console.warn('Could not parse role from token, defaulting to student');
  }

  try {
    // Fetch accepted connections (filtered by role/profile_id)
    const response = await fetch(`${STUDENT_COMMUNITY_API_BASE_URL}/api/connections?status=accepted&role=${activeRole}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch connections');

    const connections = await response.json();
    cachedConnections = connections;

    if (connections.length === 0) {
      grid.innerHTML = '<div class="col-span-3 text-center py-8"><span class="text-4xl">👥</span><p class="text-gray-500 mt-2">No connections yet</p><p class="text-sm text-gray-400">Start connecting with tutors, students, and parents!</p></div>';
      return;
    }

    displayConnectionsInGrid(grid, connections);
    updateConnectionCounts(connections);
    console.log(`✓ Loaded ${connections.length} connections`);

  } catch (error) {
    console.error('Error loading connections:', error);
    grid.innerHTML = '<div class="col-span-3 text-center py-8 text-red-500">Failed to load connections. Please try again.</div>';
  }
}

// Display connections in a grid with pagination
function displayConnectionsInGrid(grid, connections, page = 1) {
  const currentUserId = getCurrentUserId();
  currentPage.connections = page;

  // Calculate pagination
  const totalPages = Math.ceil(connections.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedConnections = connections.slice(startIndex, endIndex);

  if (paginatedConnections.length === 0 && page === 1) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <span class="text-5xl block mb-4">👥</span>
        <p class="text-lg font-medium" style="color: var(--heading);">No connections yet</p>
        <p class="text-sm mt-1" style="color: var(--text-muted);">Start connecting with tutors, students, and parents!</p>
      </div>
    `;
    return;
  }

  const cardsHtml = paginatedConnections.map(conn => {
    const otherUser = getOtherUserFromConnection(conn, currentUserId);
    const connectedDate = conn.created_at ? new Date(conn.created_at) : null;
    const connectedText = connectedDate ? getTimeAgo(connectedDate) : 'Recently';

    const primaryRole = otherUser.profileType
      ? otherUser.profileType.charAt(0).toUpperCase() + otherUser.profileType.slice(1)
      : 'User';

    const roleEmoji = otherUser.profileType === 'tutor' ? '👨‍🏫' :
                      otherUser.profileType === 'student' ? '👨‍🎓' :
                      otherUser.profileType === 'parent' ? '👨‍👩‍👧' : '👤';

    return `
      <div class="connection-card" data-role="${otherUser.profileType || 'user'}"
           onclick="navigateToProfile(${otherUser.profileId}, '${otherUser.profileType}')">
        <div class="connection-header">
          <div class="connection-avatar">
            <img src="${otherUser.avatar || '../uploads/system_images/system_profile_pictures/man-user.png'}"
                 alt="${otherUser.name}">
          </div>
          <div class="connection-info">
            <h4 class="connection-name">${otherUser.name}</h4>
            <div class="connection-role">
              <span>${roleEmoji}</span>
              <span>${primaryRole}</span>
            </div>
          </div>
        </div>
        <div class="connection-meta">
          <div class="meta-item">
            <i class="fas fa-clock"></i>
            <span>Connected ${connectedText}</span>
          </div>
        </div>
        <div class="connection-actions">
          <button class="action-btn" onclick="event.stopPropagation(); messageConnection(JSON.parse(this.dataset.user))" data-user="${encodeUserDataForOnclick(otherUser)}">
            <i class="fas fa-comment"></i>
            Message
          </button>
          <button class="action-btn primary" onclick="event.stopPropagation(); navigateToProfile(${otherUser.profileId}, '${otherUser.profileType}')">
            <i class="fas fa-user"></i>
            Profile
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Add pagination controls
  const paginationHtml = totalPages > 1 ? createPaginationControls('connections', page, totalPages) : '';

  grid.innerHTML = cardsHtml + paginationHtml;
}

// Get other user from connection object
function getOtherUserFromConnection(connection, currentUserId) {
  if (connection.requested_by === currentUserId) {
    return {
      id: connection.recipient_id,
      profileId: connection.recipient_profile_id,
      name: connection.recipient_name || 'Unknown User',
      email: connection.recipient_email || '',
      avatar: connection.recipient_profile_picture || null,
      profileType: connection.recipient_type || null
    };
  } else {
    return {
      id: connection.requested_by,
      profileId: connection.requester_profile_id,
      name: connection.requester_name || 'Unknown User',
      email: connection.requester_email || '',
      avatar: connection.requester_profile_picture || null,
      profileType: connection.requester_type || null
    };
  }
}

// Update connection counts for filtered tabs
function updateConnectionCounts(connections) {
  const currentUserId = getCurrentUserId();
  const counts = { all: connections.length, tutors: 0, students: 0, parents: 0 };

  connections.forEach(conn => {
    const otherUser = getOtherUserFromConnection(conn, currentUserId);
    if (otherUser.profileType === 'tutor') counts.tutors++;
    else if (otherUser.profileType === 'student') counts.students++;
    else if (otherUser.profileType === 'parent') counts.parents++;
  });

  // Update tab counts if elements exist
  const allTab = document.getElementById('all-connections-tab');
  const tutorsTab = document.getElementById('tutors-connections-tab');
  const studentsTab = document.getElementById('students-connections-tab');
  const parentsTab = document.getElementById('parents-connections-tab');

  if (allTab) allTab.innerHTML = `All Connections <span class="ml-1 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">${counts.all}</span>`;
  if (tutorsTab) tutorsTab.innerHTML = `Tutors <span class="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">${counts.tutors}</span>`;
  if (studentsTab) studentsTab.innerHTML = `Students <span class="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">${counts.students}</span>`;
  if (parentsTab) parentsTab.innerHTML = `Parents <span class="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">${counts.parents}</span>`;
}

// Load connections filtered by role
async function loadConnectionsByRole(role) {
  const grid = document.getElementById(`${role}-connections-grid`);
  if (!grid) return;

  // If we have cached connections, filter and display
  if (cachedConnections.length > 0) {
    const currentUserId = getCurrentUserId();
    const filtered = cachedConnections.filter(conn => {
      const otherUser = getOtherUserFromConnection(conn, currentUserId);
      return role === 'all' || otherUser.profileType === role.replace('s', ''); // tutors -> tutor
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="col-span-3 text-center py-8"><span class="text-4xl">${role === 'tutor' ? '👨‍🏫' : role === 'student' ? '👨‍🎓' : '👨‍👩‍👧'}</span><p class="text-gray-500 mt-2">No ${role} connections yet</p></div>`;
      return;
    }

    displayConnectionsInGrid(grid, filtered);
  } else {
    // Load from API if not cached
    await loadAllConnectionsPanel();
    loadConnectionsByRole(role);
  }
}

// Filter connections by search query
function filterConnectionsBySearch(query, role) {
  const gridId = role === 'all' ? 'all-connections-grid' : `${role}-connections-grid`;
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const currentUserId = getCurrentUserId();
  const searchLower = query.toLowerCase().trim();

  let filtered = cachedConnections;

  // Filter by role first
  if (role !== 'all') {
    const roleType = role.replace('s', ''); // tutors -> tutor
    filtered = filtered.filter(conn => {
      const otherUser = getOtherUserFromConnection(conn, currentUserId);
      return otherUser.profileType === roleType;
    });
  }

  // Then filter by search query
  if (searchLower) {
    filtered = filtered.filter(conn => {
      const otherUser = getOtherUserFromConnection(conn, currentUserId);
      return (otherUser.name && otherUser.name.toLowerCase().includes(searchLower)) ||
             (otherUser.email && otherUser.email.toLowerCase().includes(searchLower));
    });
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-3 text-center py-8"><i class="fas fa-search text-3xl text-gray-300"></i><p class="text-gray-500 mt-2">No results found for "${query}"</p></div>`;
    return;
  }

  displayConnectionsInGrid(grid, filtered);
}

// Search handlers for connections
function searchAllConnections(query) {
  filterConnectionsBySearch(query, 'all');
}

function searchTutorConnections(query) {
  filterConnectionsBySearch(query, 'tutor');
}

function searchStudentConnections(query) {
  filterConnectionsBySearch(query, 'student');
}

function searchParentConnections(query) {
  filterConnectionsBySearch(query, 'parent');
}

// ============================================
// EVENTS PANEL - DATABASE INTEGRATION
// ============================================

// Current active filter for events panel
let currentEventsFilter = 'joined';

// Load all events
async function loadEventsPanel() {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');

  // Get active role from JWT token
  let activeRole = 'student';
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      activeRole = payload.role || 'student';
    } catch (e) {
      console.warn('Could not parse role from token, defaulting to student');
    }
  }

  try {
    const response = await fetch(`${STUDENT_COMMUNITY_API_BASE_URL}/api/events?role=${activeRole}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    if (!response.ok) throw new Error('Failed to fetch events');

    const data = await response.json();
    cachedEvents = data.events || [];

    // Categorize events
    const now = new Date();
    const joinedEvents = cachedEvents.filter(e => e.joined_status);
    const upcomingEvents = cachedEvents.filter(e => new Date(e.start_datetime) > now);
    const pastEvents = cachedEvents.filter(e => new Date(e.start_datetime) <= now);

    // Update counts
    updateElement('joined-events-count', joinedEvents.length);
    updateElement('upcoming-events-count', upcomingEvents.length);
    updateElement('past-events-count', pastEvents.length);

    // Display events based on current filter (default: joined)
    filterEventsPanelBy(currentEventsFilter);

    console.log(`✓ Loaded ${cachedEvents.length} events`);

  } catch (error) {
    console.error('Error loading events:', error);
    const grid = document.getElementById('events-panel-grid');
    if (grid) grid.innerHTML = '<div class="col-span-full text-center py-8" style="color: var(--text-muted);">Failed to load events</div>';
  }
}

// Filter events panel by type (joined, upcoming, past)
function filterEventsPanelBy(filterType) {
  currentEventsFilter = filterType;
  const now = new Date();
  let events = cachedEvents;

  // Filter by type
  switch (filterType) {
    case 'joined':
      events = events.filter(e => e.joined_status);
      break;
    case 'upcoming':
      events = events.filter(e => new Date(e.start_datetime) > now);
      break;
    case 'past':
      events = events.filter(e => new Date(e.start_datetime) <= now);
      break;
  }

  // Update filter button styles
  const filterBtns = document.querySelectorAll('#events-main-tab-content .filter-btn');
  filterBtns.forEach(btn => {
    const isActive = btn.dataset.filter === filterType;
    if (isActive) {
      btn.style.background = 'var(--button-bg)';
      btn.style.color = 'white';
      btn.style.border = 'none';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text)';
      btn.style.border = '1px solid var(--border-color)';
    }
  });

  // Display in the unified grid
  displayEventsInGrid('events-panel-grid', events, filterType);
}

// Search events panel
function searchEventsPanel(query) {
  const searchLower = query.toLowerCase().trim();
  const now = new Date();
  let events = cachedEvents;

  // Filter by current type first
  switch (currentEventsFilter) {
    case 'joined':
      events = events.filter(e => e.joined_status);
      break;
    case 'upcoming':
      events = events.filter(e => new Date(e.start_datetime) > now);
      break;
    case 'past':
      events = events.filter(e => new Date(e.start_datetime) <= now);
      break;
  }

  // Then filter by search
  if (searchLower) {
    events = events.filter(e =>
      (e.title && e.title.toLowerCase().includes(searchLower)) ||
      (e.description && e.description.toLowerCase().includes(searchLower)) ||
      (e.location && e.location.toLowerCase().includes(searchLower))
    );
  }

  displayEventsInGrid('events-panel-grid', events, currentEventsFilter);
}

// Display events in grid with pagination
function displayEventsInGrid(gridId, events, type, page = 1) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  currentPage.events = page;

  // Calculate pagination
  const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEvents = events.slice(startIndex, endIndex);

  if (paginatedEvents.length === 0 && page === 1) {
    const emptyMessages = {
      joined: { icon: '✅', text: 'No joined events', subtext: 'Join events to see them here!' },
      upcoming: { icon: '📅', text: 'No upcoming events', subtext: 'Check back later for new events!' },
      past: { icon: '📜', text: 'No past events', subtext: 'Your attended events will appear here' }
    };
    const msg = emptyMessages[type] || emptyMessages.joined;
    grid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <span class="text-5xl block mb-4">${msg.icon}</span>
        <p class="text-lg font-medium" style="color: var(--heading);">${msg.text}</p>
        <p class="text-sm mt-1" style="color: var(--text-muted);">${msg.subtext}</p>
      </div>
    `;
    return;
  }

  const cardsHtml = paginatedEvents.map(event => {
    const startDate = new Date(event.start_datetime);
    const isOnline = event.is_online || (event.location && event.location.toLowerCase() === 'online');

    return `
      <div class="event-card">
        ${event.event_picture ? `<img src="${event.event_picture}" alt="${event.title}" class="event-image">` : ''}
        <div class="event-header">
          <h3>${event.title}</h3>
          <div class="event-badges">
            <span class="event-badge">${isOnline ? '🌐 Online' : '📍 In-person'}</span>
            ${event.joined_status ? '<span class="creative-badge participating">✅ Joined</span>' : ''}
          </div>
        </div>
        <div class="event-details">
          <div class="event-detail-item">
            <span>📅</span>
            <span>${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div class="event-detail-item">
            <span>🕐</span>
            <span>${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="event-detail-item">
            <span>📍</span>
            <span>${event.location || 'TBA'}</span>
          </div>
          <div class="event-detail-item">
            <span>👥</span>
            <span>${event.registered_count || 0}/${event.available_seats || 'Unlimited'} attendees</span>
          </div>
        </div>
        <p class="event-description">${event.description || 'No description available'}</p>
        <div class="event-actions">
          <button class="action-btn" onclick="viewEventDetails(${event.id})">
            <i class="fas fa-info-circle"></i>
            Details
          </button>
          ${!event.joined_status ? `
            <button class="action-btn primary" onclick="joinEvent(${event.id})">
              <i class="fas fa-plus"></i>
              Join Event
            </button>
          ` : `
            <button class="action-btn" disabled style="opacity: 0.7; cursor: default;">
              <i class="fas fa-check"></i>
              Joined
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');

  // Add pagination controls
  const paginationHtml = totalPages > 1 ? createPaginationControls('events-' + type, page, totalPages, type) : '';

  grid.innerHTML = cardsHtml + paginationHtml;
}

// Toggle events subsections (handled by existing function, add data loading)
const originalToggleEventsSubSection = toggleEventsSubSection;
toggleEventsSubSection = function(subsection) {
  // Call original function for UI updates
  originalToggleEventsSubSection(subsection);

  // Load data for the subsection
  const now = new Date();
  let events = cachedEvents;

  switch (subsection) {
    case 'joined':
      events = cachedEvents.filter(e => e.joined_status);
      displayEventsInGrid('joined-events-grid', events, 'joined');
      break;
    case 'upcoming':
      events = cachedEvents.filter(e => new Date(e.start_datetime) > now);
      displayEventsInGrid('upcoming-events-grid', events, 'upcoming');
      break;
    case 'past':
      events = cachedEvents.filter(e => new Date(e.start_datetime) <= now);
      displayEventsInGrid('past-events-grid', events, 'past');
      break;
  }
};

// Search events
function filterEventsBySearch(query, type) {
  const gridId = `${type}-events-grid`;
  const searchLower = query.toLowerCase().trim();
  const now = new Date();

  let events = cachedEvents;

  // Filter by type first
  switch (type) {
    case 'joined':
      events = events.filter(e => e.joined_status);
      break;
    case 'upcoming':
      events = events.filter(e => new Date(e.start_datetime) > now);
      break;
    case 'past':
      events = events.filter(e => new Date(e.start_datetime) <= now);
      break;
  }

  // Then filter by search
  if (searchLower) {
    events = events.filter(e =>
      (e.title && e.title.toLowerCase().includes(searchLower)) ||
      (e.description && e.description.toLowerCase().includes(searchLower)) ||
      (e.location && e.location.toLowerCase().includes(searchLower))
    );
  }

  displayEventsInGrid(gridId, events, type);
}

function searchJoinedEvents(query) {
  filterEventsBySearch(query, 'joined');
}

function searchUpcomingEvents(query) {
  filterEventsBySearch(query, 'upcoming');
}

function searchPastEvents(query) {
  filterEventsBySearch(query, 'past');
}

// ============================================
// CLUBS PANEL - DATABASE INTEGRATION
// ============================================

// Current active filter for clubs panel
let currentClubsFilter = 'joined';

// Load all clubs
async function loadClubsPanel() {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');

  // Get active role from JWT token
  let activeRole = 'student';
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      activeRole = payload.role || 'student';
    } catch (e) {
      console.warn('Could not parse role from token, defaulting to student');
    }
  }

  try {
    const response = await fetch(`${STUDENT_COMMUNITY_API_BASE_URL}/api/clubs?role=${activeRole}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    if (!response.ok) throw new Error('Failed to fetch clubs');

    const data = await response.json();
    cachedClubs = data.clubs || [];

    // Categorize clubs
    const joinedClubs = cachedClubs.filter(c => c.joined_status);
    const discoverClubs = cachedClubs.filter(c => !c.joined_status);

    // Update counts
    updateElement('joined-clubs-count', joinedClubs.length);
    updateElement('discover-clubs-count', discoverClubs.length);

    // Display clubs based on current filter (default: joined)
    filterClubsPanelBy(currentClubsFilter);

    console.log(`✓ Loaded ${cachedClubs.length} clubs`);

  } catch (error) {
    console.error('Error loading clubs:', error);
    const grid = document.getElementById('clubs-panel-grid');
    if (grid) grid.innerHTML = '<div class="col-span-full text-center py-8" style="color: var(--text-muted);">Failed to load clubs</div>';
  }
}

// Filter clubs panel by type (joined, discover)
function filterClubsPanelBy(filterType) {
  currentClubsFilter = filterType;
  let clubs = cachedClubs;

  // Filter by type
  switch (filterType) {
    case 'joined':
      clubs = clubs.filter(c => c.joined_status);
      break;
    case 'discover':
      clubs = clubs.filter(c => !c.joined_status);
      break;
  }

  // Update filter button styles
  const filterBtns = document.querySelectorAll('#clubs-main-tab-content .filter-btn');
  filterBtns.forEach(btn => {
    const isActive = btn.dataset.filter === filterType;
    if (isActive) {
      btn.style.background = 'var(--button-bg)';
      btn.style.color = 'white';
      btn.style.border = 'none';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text)';
      btn.style.border = '1px solid var(--border-color)';
    }
  });

  // Display in the unified grid
  displayClubsInGrid('clubs-panel-grid', clubs, filterType);
}

// Search clubs panel
function searchClubsPanel(query) {
  const searchLower = query.toLowerCase().trim();
  let clubs = cachedClubs;

  // Filter by current type first
  switch (currentClubsFilter) {
    case 'joined':
      clubs = clubs.filter(c => c.joined_status);
      break;
    case 'discover':
      clubs = clubs.filter(c => !c.joined_status);
      break;
  }

  // Then filter by search
  if (searchLower) {
    clubs = clubs.filter(c =>
      (c.title && c.title.toLowerCase().includes(searchLower)) ||
      (c.description && c.description.toLowerCase().includes(searchLower)) ||
      (c.category && c.category.toLowerCase().includes(searchLower))
    );
  }

  displayClubsInGrid('clubs-panel-grid', clubs, currentClubsFilter);
}

// Display clubs in grid with pagination
function displayClubsInGrid(gridId, clubs, type, page = 1) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  currentPage.clubs = page;

  // Calculate pagination
  const totalPages = Math.ceil(clubs.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedClubs = clubs.slice(startIndex, endIndex);

  if (paginatedClubs.length === 0 && page === 1) {
    const emptyMessages = {
      joined: { icon: '🎭', text: 'No joined clubs', subtext: 'Join clubs to see them here!' },
      discover: { icon: '🔍', text: 'No clubs to discover', subtext: 'Check back later for new clubs!' }
    };
    const msg = emptyMessages[type] || emptyMessages.joined;
    grid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <span class="text-5xl block mb-4">${msg.icon}</span>
        <p class="text-lg font-medium" style="color: var(--heading);">${msg.text}</p>
        <p class="text-sm mt-1" style="color: var(--text-muted);">${msg.subtext}</p>
      </div>
    `;
    return;
  }

  const cardsHtml = paginatedClubs.map(club => {
    return `
      <div class="club-card">
        ${club.club_picture ? `<img src="${club.club_picture}" alt="${club.title}" class="event-image">` : ''}
        <div class="club-header">
          <h3>${club.title}</h3>
          <div class="event-badges">
            <span class="club-category">${club.category || 'General'}</span>
            ${club.joined_status ? '<span class="creative-badge member">✅ Member</span>' : ''}
          </div>
        </div>
        <div class="club-details">
          <div class="club-detail-item">
            <span>👥</span>
            <span>${club.current_members || club.member_count || 0}/${club.member_limit || 'Unlimited'} members</span>
          </div>
          <div class="club-detail-item">
            <span>💰</span>
            <span>${club.is_paid ? `${club.membership_fee} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}` : 'Free to join'}</span>
          </div>
        </div>
        <p class="club-description">${club.description || 'No description available'}</p>
        <div class="club-actions">
          <button class="action-btn" onclick="viewClubDetails(${club.id})">
            <i class="fas fa-info-circle"></i>
            Details
          </button>
          ${!club.joined_status ? `
            <button class="action-btn primary" onclick="joinClub(${club.id})">
              <i class="fas fa-plus"></i>
              Join Club
            </button>
          ` : `
            <button class="action-btn" disabled style="opacity: 0.7; cursor: default;">
              <i class="fas fa-check"></i>
              Member
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');

  // Add pagination controls
  const paginationHtml = totalPages > 1 ? createPaginationControls('clubs-' + type, page, totalPages, type) : '';

  grid.innerHTML = cardsHtml + paginationHtml;
}

// Toggle clubs subsections (handled by existing function, add data loading)
const originalToggleClubsSubSection = toggleClubsSubSection;
toggleClubsSubSection = function(subsection) {
  // Call original function for UI updates
  originalToggleClubsSubSection(subsection);

  // Load data for the subsection
  switch (subsection) {
    case 'joined':
      const joinedClubs = cachedClubs.filter(c => c.joined_status);
      displayClubsInGrid('joined-clubs-grid', joinedClubs, 'joined');
      break;
    case 'discover':
      const discoverClubs = cachedClubs.filter(c => !c.joined_status);
      displayClubsInGrid('discover-clubs-grid', discoverClubs, 'discover');
      break;
  }
};

// Search clubs
function filterClubsBySearch(query, type) {
  const gridId = `${type}-clubs-grid`;
  const searchLower = query.toLowerCase().trim();

  let clubs = cachedClubs;

  // Filter by type first
  switch (type) {
    case 'joined':
      clubs = clubs.filter(c => c.joined_status);
      break;
    case 'discover':
      clubs = clubs.filter(c => !c.joined_status);
      break;
  }

  // Then filter by search
  if (searchLower) {
    clubs = clubs.filter(c =>
      (c.title && c.title.toLowerCase().includes(searchLower)) ||
      (c.description && c.description.toLowerCase().includes(searchLower)) ||
      (c.category && c.category.toLowerCase().includes(searchLower))
    );
  }

  displayClubsInGrid(gridId, clubs, type);
}

// ============================================
// REQUESTS PANEL - UNIFIED GRID (NEW)
// ============================================

// Cached requests data
let cachedSentRequests = [];
let cachedReceivedRequests = [];

// Current active filter for requests panel
let currentRequestsFilter = 'received';

// Load requests panel data
async function loadRequestsPanel() {
  const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  const grid = document.getElementById('requests-panel-grid');

  if (!token) {
    if (grid) grid.innerHTML = '<div class="col-span-full text-center py-8" style="color: var(--text-muted);">Please log in to view requests</div>';
    return;
  }

  // Get active role from JWT token
  let activeRole = 'student';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    activeRole = payload.role || 'student';
  } catch (e) {
    console.warn('Could not parse role from token, defaulting to student');
  }

  try {
    // Fetch both sent and received requests in parallel (filtered by role/profile_id)
    const [sentResponse, receivedResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/connections?status=pending&direction=outgoing&role=${activeRole}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${API_BASE_URL}/api/connections?status=pending&direction=incoming&role=${activeRole}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    if (sentResponse.ok) {
      cachedSentRequests = await sentResponse.json();
    }
    if (receivedResponse.ok) {
      cachedReceivedRequests = await receivedResponse.json();
    }

    // Update counts (both in filter buttons and main cards)
    updateElement('sent-requests-count', cachedSentRequests.length);
    updateElement('received-requests-count', cachedReceivedRequests.length);
    updateElement('sent-requests-count-main', cachedSentRequests.length);
    updateElement('received-requests-count-main', cachedReceivedRequests.length);

    // Display based on current filter (default: received)
    filterRequestsPanelBy(currentRequestsFilter);

    console.log(`✓ Loaded ${cachedSentRequests.length} sent, ${cachedReceivedRequests.length} received requests`);

  } catch (error) {
    console.error('Error loading requests:', error);
    if (grid) grid.innerHTML = '<div class="col-span-full text-center py-8" style="color: var(--text-muted);">Failed to load requests</div>';
  }
}

// Filter requests panel by type (sent, received)
function filterRequestsPanelBy(filterType) {
  currentRequestsFilter = filterType;
  const requests = filterType === 'sent' ? cachedSentRequests : cachedReceivedRequests;

  // Update filter button styles
  const filterBtns = document.querySelectorAll('#requests-main-tab-content .filter-btn');
  filterBtns.forEach(btn => {
    const isActive = btn.dataset.filter === filterType;
    if (isActive) {
      btn.style.background = 'var(--button-bg)';
      btn.style.color = 'white';
      btn.style.border = 'none';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text)';
      btn.style.border = '1px solid var(--border-color)';
    }
  });

  // Display in the unified grid
  displayRequestsInGrid('requests-panel-grid', requests, filterType);
}

// Search requests panel
function searchRequestsPanel(query) {
  const searchLower = query.toLowerCase().trim();
  let requests = currentRequestsFilter === 'sent' ? cachedSentRequests : cachedReceivedRequests;
  const currentUserId = getCurrentUserId();

  // Filter by search
  if (searchLower) {
    requests = requests.filter(req => {
      const otherUser = getOtherUserFromConnection(req, currentUserId);
      return (otherUser.name && otherUser.name.toLowerCase().includes(searchLower)) ||
             (otherUser.email && otherUser.email.toLowerCase().includes(searchLower));
    });
  }

  displayRequestsInGrid('requests-panel-grid', requests, currentRequestsFilter);
}

// Display requests in grid with pagination
function displayRequestsInGrid(gridId, requests, type, page = 1) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  currentPage.sentRequests = type === 'sent' ? page : currentPage.sentRequests;
  currentPage.receivedRequests = type === 'received' ? page : currentPage.receivedRequests;

  // Calculate pagination
  const totalPages = Math.ceil(requests.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRequests = requests.slice(startIndex, endIndex);

  if (paginatedRequests.length === 0 && page === 1) {
    const emptyMessages = {
      sent: { icon: '📤', text: 'No sent requests', subtext: 'Send connection requests to connect with others!' },
      received: { icon: '📥', text: 'No received requests', subtext: 'Connection requests will appear here' }
    };
    const msg = emptyMessages[type] || emptyMessages.received;
    grid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <span class="text-5xl block mb-4">${msg.icon}</span>
        <p class="text-lg font-medium" style="color: var(--heading);">${msg.text}</p>
        <p class="text-sm mt-1" style="color: var(--text-muted);">${msg.subtext}</p>
      </div>
    `;
    return;
  }

  const currentUserId = getCurrentUserId();
  const cardsHtml = paginatedRequests.map(request => {
    const otherUser = getOtherUserFromConnection(request, currentUserId);
    const createdDate = request.created_at ? new Date(request.created_at) : null;
    const timeAgo = createdDate ? getTimeAgo(createdDate) : 'Recently';

    const primaryRole = otherUser.profileType
      ? otherUser.profileType.charAt(0).toUpperCase() + otherUser.profileType.slice(1)
      : 'User';

    const roleEmoji = otherUser.profileType === 'tutor' ? '👨‍🏫' :
                      otherUser.profileType === 'student' ? '👨‍🎓' :
                      otherUser.profileType === 'parent' ? '👨‍👩‍👧' : '👤';

    if (type === 'sent') {
      return `
        <div class="connection-card" data-status="pending">
          <div class="connection-header">
            <div class="connection-avatar">
              <img src="${otherUser.avatar || '../uploads/system_images/system_profile_pictures/man-user.png'}"
                   alt="${otherUser.name}">
            </div>
            <div class="connection-info">
              <h4 class="connection-name">${otherUser.name}</h4>
              <div class="connection-role">
                <span>${roleEmoji}</span>
                <span>${primaryRole}</span>
              </div>
            </div>
          </div>
          <div class="connection-meta">
            <div class="meta-item">
              <i class="fas fa-clock"></i>
              <span>Sent ${timeAgo}</span>
            </div>
            <div class="meta-item">
              <span class="creative-badge" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem;">
                ⏳ Pending
              </span>
            </div>
          </div>
          <div class="connection-actions">
            <button class="action-btn" onclick="messageConnection(JSON.parse(this.dataset.user))" data-user="${encodeUserDataForOnclick(otherUser)}">
              <i class="fas fa-comment"></i>
              Message
            </button>
            <button class="action-btn" onclick="navigateToProfile(${otherUser.profileId}, '${otherUser.profileType}')">
              <i class="fas fa-user"></i>
              Profile
            </button>
            <button class="action-btn danger" onclick="cancelConnectionRequest(${request.id})">
              <i class="fas fa-times"></i>
              Cancel
            </button>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="connection-card" data-status="pending">
          <div class="connection-header">
            <div class="connection-avatar">
              <img src="${otherUser.avatar || '../uploads/system_images/system_profile_pictures/man-user.png'}"
                   alt="${otherUser.name}">
            </div>
            <div class="connection-info">
              <h4 class="connection-name">${otherUser.name}</h4>
              <div class="connection-role">
                <span>${roleEmoji}</span>
                <span>${primaryRole}</span>
              </div>
            </div>
          </div>
          <div class="connection-meta">
            <div class="meta-item">
              <i class="fas fa-clock"></i>
              <span>Received ${timeAgo}</span>
            </div>
            <div class="meta-item">
              <span class="creative-badge" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem;">
                📩 New Request
              </span>
            </div>
          </div>
          <div class="connection-actions">
            <button class="action-btn" onclick="messageConnection(JSON.parse(this.dataset.user))" data-user="${encodeUserDataForOnclick(otherUser)}">
              <i class="fas fa-comment"></i>
              Message
            </button>
            <button class="action-btn primary" onclick="acceptConnectionRequest(${request.id})">
              <i class="fas fa-check"></i>
              Accept
            </button>
            <button class="action-btn danger" onclick="rejectConnectionRequest(${request.id})">
              <i class="fas fa-times"></i>
              Reject
            </button>
          </div>
        </div>
      `;
    }
  }).join('');

  // Add pagination controls
  const paginationHtml = totalPages > 1 ? createPaginationControls('requests-' + type, page, totalPages, type) : '';

  grid.innerHTML = cardsHtml + paginationHtml;
}

// ============================================
// NAVIGATION & ACTION FUNCTIONS
// ============================================

// Navigate to user profile
function navigateToProfile(profileId, profileType) {
  let url;
  switch (profileType) {
    case 'tutor':
      url = `../view-profiles/view-tutor.html?id=${profileId}`;
      break;
    case 'student':
      url = `../view-profiles/view-student.html?id=${profileId}`;
      break;
    case 'parent':
      url = `../view-profiles/view-parent.html?id=${profileId}`;
      break;
    default:
      url = `../view-profiles/view-student.html?id=${profileId}`;
  }
  window.location.href = url;
}

// Message a connection - opens chat modal
function messageConnection(user) {
  console.log('Opening chat with user:', user);

  // Close community panel/modal if open
  if (typeof closeCommunityModal === 'function') {
    closeCommunityModal();
  }

  // Open chat modal with the target user
  if (typeof openChatModal === 'function') {
    // Build target user object for chat modal
    const targetUser = {
      id: user.id || user.userId,
      user_id: user.id || user.userId,
      profile_id: user.profileId,
      full_name: user.name,
      name: user.name,
      profile_picture: user.avatar,
      avatar: user.avatar,
      role: user.profileType,
      profile_type: user.profileType,
      is_online: user.isOnline || false
    };
    openChatModal(targetUser);
    console.log('Chat modal opened for user:', targetUser);
  } else if (typeof ChatModalManager !== 'undefined' && ChatModalManager.openChatWithUser) {
    // Alternative: use ChatModalManager directly
    ChatModalManager.openChatWithUser({
      id: user.id || user.userId,
      profile_id: user.profileId,
      full_name: user.name,
      profile_picture: user.avatar,
      role: user.profileType
    });
    console.log('Chat modal opened via ChatModalManager');
  } else {
    console.error('Chat modal not available');
    alert('Chat feature is not available. Please refresh the page.');
  }
}

// Helper to encode user data for onclick handlers
function encodeUserDataForOnclick(user) {
  return JSON.stringify(user).replace(/"/g, '&quot;');
}

// View event details
function viewEventDetails(eventId) {
  console.log('Viewing event:', eventId);
  alert('Event details coming soon!');
}

// Join an event
async function joinEvent(eventId) {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  if (!token) {
    alert('Please log in to join events');
    return;
  }

  try {
    const response = await fetch(`${STUDENT_COMMUNITY_API_BASE_URL}/api/events/${eventId}/join`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      alert('Successfully joined the event!');
      loadEventsPanel(); // Refresh events
    } else {
      const error = await response.json();
      alert(`Failed to join event: ${error.detail || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error joining event:', error);
    alert('Failed to join event. Please try again.');
  }
}

// View club details
function viewClubDetails(clubId) {
  console.log('Viewing club:', clubId);
  alert('Club details coming soon!');
}

// Join a club
async function joinClub(clubId) {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  if (!token) {
    alert('Please log in to join clubs');
    return;
  }

  try {
    const response = await fetch(`${STUDENT_COMMUNITY_API_BASE_URL}/api/clubs/${clubId}/join`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      alert('Successfully joined the club!');
      loadClubsPanel(); // Refresh clubs
    } else {
      const error = await response.json();
      alert(`Failed to join club: ${error.detail || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error joining club:', error);
    alert('Failed to join club. Please try again.');
  }
}

// Helper function to update element text content
function updateElement(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ============================================
// REQUESTS SUB-SECTION FUNCTIONS
// ============================================

// Toggle between sent and received requests subsections
function toggleRequestsSubSection(subsection) {
  console.log('Toggling requests subsection:', subsection);

  // Hide all requests subsections
  const subsections = document.querySelectorAll('.requests-subsection');
  subsections.forEach(section => {
    section.classList.add('hidden');
  });

  // Show selected subsection
  const selectedSubsection = document.getElementById(`${subsection}-requests-subsection`);
  if (selectedSubsection) {
    selectedSubsection.classList.remove('hidden');
  }

  // Update card active states
  const requestCards = document.querySelectorAll('#requests-main-tab-content > div:first-child > div');

  requestCards.forEach(card => {
    card.classList.remove('active-requests-card');
    card.style.transform = '';
    card.style.boxShadow = '';
  });

  // Add active state based on subsection
  const cardIndex = subsection === 'sent' ? 0 : 1;
  if (requestCards[cardIndex]) {
    requestCards[cardIndex].classList.add('active-requests-card');
    requestCards[cardIndex].style.transform = 'translateY(-4px)';
    requestCards[cardIndex].style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
  }

  // Load data for the subsection if not already loaded
  if (subsection === 'sent') {
    loadSentRequests();
  } else if (subsection === 'received') {
    loadReceivedRequests();
  }
}

// Filter sent requests by status
function filterSentRequests(status) {
  console.log('Filtering sent requests by status:', status);

  // Update active tab styling
  const tabs = document.querySelectorAll('.sent-requests-status-tab');
  tabs.forEach(tab => {
    const tabStatus = tab.getAttribute('data-status');
    if (tabStatus === status) {
      // Active tab
      tab.classList.remove('border-transparent', 'text-gray-600');
      tab.classList.add('border-blue-600', 'text-blue-600');
    } else {
      // Inactive tab
      tab.classList.remove('border-blue-600', 'text-blue-600');
      tab.classList.add('border-transparent', 'text-gray-600');
    }
  });

  // Filter the list
  const sentRequestsList = document.getElementById('sent-requests-list');
  if (!sentRequestsList) return;

  const allItems = sentRequestsList.querySelectorAll('[data-status]');
  allItems.forEach(item => {
    const itemStatus = item.getAttribute('data-status');
    if (status === 'all' || itemStatus === status) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

// Filter received requests by status
function filterReceivedRequests(status) {
  console.log('Filtering received requests by status:', status);

  // Update active tab styling
  const tabs = document.querySelectorAll('.received-requests-status-tab');
  tabs.forEach(tab => {
    const tabStatus = tab.getAttribute('data-status');
    if (tabStatus === status) {
      // Active tab
      tab.classList.remove('border-transparent', 'text-gray-600');
      tab.classList.add('border-green-600', 'text-green-600');
    } else {
      // Inactive tab
      tab.classList.remove('border-green-600', 'text-green-600');
      tab.classList.add('border-transparent', 'text-gray-600');
    }
  });

  // Filter the list
  const receivedRequestsList = document.getElementById('received-requests-list');
  if (!receivedRequestsList) return;

  const allItems = receivedRequestsList.querySelectorAll('[data-status]');
  allItems.forEach(item => {
    const itemStatus = item.getAttribute('data-status');
    if (status === 'all' || itemStatus === status) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

// ============================================
// LOAD REQUESTS DATA FROM API
// ============================================

// Load request counts and update summary cards
async function loadRequestCounts() {
  const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');

  if (!token) {
    console.log('No token found, cannot load request counts');
    return;
  }

  // Get active role from JWT token
  let activeRole = 'student';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    activeRole = payload.role || 'student';
  } catch (e) {
    console.warn('Could not parse role from token, defaulting to student');
  }

  try {
    // Get connection stats (filtered by role/profile_id)
    const response = await fetch(`${API_BASE_URL}/api/connections/stats?role=${activeRole}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const stats = await response.json();

      // Update sent requests count (outgoing requests)
      const sentCount = stats.outgoing_requests || 0;
      const sentCountElements = document.querySelectorAll('#sent-requests-count');
      sentCountElements.forEach(el => {
        el.textContent = sentCount;
      });

      // Update received requests count (incoming requests)
      const receivedCount = stats.incoming_requests || 0;
      const receivedCountElements = document.querySelectorAll('#received-requests-count');
      receivedCountElements.forEach(el => {
        el.textContent = receivedCount;
      });

      // Update connections count
      const connectionsCount = stats.total_connections || 0;
      document.querySelectorAll('#connections-count, #connections-total-count').forEach(el => {
        el.textContent = connectionsCount;
      });

      // Update requests count badge
      document.querySelectorAll('#requests-count').forEach(el => {
        el.textContent = receivedCount;
      });

      console.log(`✓ Loaded request counts for role ${activeRole}: ${sentCount} sent, ${receivedCount} received, ${connectionsCount} connections`);
    }
  } catch (error) {
    console.error('Error loading request counts:', error);
  }
}

// Load sent requests
async function loadSentRequests() {
  const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  const listElement = document.getElementById('sent-requests-list');

  if (!listElement) return;
  if (!token) {
    listElement.innerHTML = '<p class="text-center text-gray-500 py-8">Please log in to view sent requests</p>';
    return;
  }

  // Get active role from JWT token
  let activeRole = 'student';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    activeRole = payload.role || 'student';
  } catch (e) {
    console.warn('Could not parse role from token, defaulting to student');
  }

  listElement.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i><p class="text-gray-500 mt-2">Loading sent requests...</p></div>';

  try {
    // Get outgoing connection requests (status=pending, direction=outgoing, filtered by role/profile_id)
    const response = await fetch(`${API_BASE_URL}/api/connections?status=pending&direction=outgoing&role=${activeRole}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const requests = await response.json();

      if (requests.length === 0) {
        listElement.innerHTML = '<div class="text-center py-8"><span class="text-4xl">📤</span><p class="text-gray-500 mt-2">No sent requests yet</p></div>';
        return;
      }

      // Display requests
      listElement.innerHTML = requests.map(req => createRequestCard(req, 'sent')).join('');
      console.log(`✓ Loaded ${requests.length} sent requests`);
    } else {
      listElement.innerHTML = '<p class="text-center text-red-500 py-8">Failed to load sent requests</p>';
    }
  } catch (error) {
    console.error('Error loading sent requests:', error);
    listElement.innerHTML = '<p class="text-center text-red-500 py-8">Error loading sent requests</p>';
  }
}

// Load received requests
async function loadReceivedRequests() {
  const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  const listElement = document.getElementById('received-requests-list');

  if (!listElement) return;
  if (!token) {
    listElement.innerHTML = '<p class="text-center text-gray-500 py-8">Please log in to view received requests</p>';
    return;
  }

  // Get active role from JWT token
  let activeRole = 'student';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    activeRole = payload.role || 'student';
  } catch (e) {
    console.warn('Could not parse role from token, defaulting to student');
  }

  listElement.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i><p class="text-gray-500 mt-2">Loading received requests...</p></div>';

  try {
    // Get incoming connection requests (status=pending, direction=incoming, filtered by role/profile_id)
    const response = await fetch(`${API_BASE_URL}/api/connections?status=pending&direction=incoming&role=${activeRole}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const requests = await response.json();

      if (requests.length === 0) {
        listElement.innerHTML = '<div class="text-center py-8"><span class="text-4xl">📥</span><p class="text-gray-500 mt-2">No received requests yet</p></div>';
        return;
      }

      // Display requests
      listElement.innerHTML = requests.map(req => createRequestCard(req, 'received')).join('');
      console.log(`✓ Loaded ${requests.length} received requests`);
    } else {
      listElement.innerHTML = '<p class="text-center text-red-500 py-8">Failed to load received requests</p>';
    }
  } catch (error) {
    console.error('Error loading received requests:', error);
    listElement.innerHTML = '<p class="text-center text-red-500 py-8">Error loading received requests</p>';
  }
}

// Create request card HTML - styled like community modal cards
function createRequestCard(request, type) {
  // Determine which user to display (the "other" user)
  const currentUserId = getCurrentUserId();
  const otherUser = getOtherUserFromConnection(request, currentUserId);

  const createdDate = request.created_at ? new Date(request.created_at) : null;
  const timeAgo = createdDate ? getTimeAgo(createdDate) : 'Recently';

  // Status for filtering
  const status = 'pending';

  const primaryRole = otherUser.profileType
    ? otherUser.profileType.charAt(0).toUpperCase() + otherUser.profileType.slice(1)
    : 'User';

  const roleEmoji = otherUser.profileType === 'tutor' ? '👨‍🏫' :
                    otherUser.profileType === 'student' ? '👨‍🎓' :
                    otherUser.profileType === 'parent' ? '👨‍👩‍👧' : '👤';

  if (type === 'sent') {
    // Sent request card - styled like connection-card
    return `
      <div class="connection-card" data-status="${status}">
        <div class="connection-header">
          <div class="connection-avatar">
            <img src="${otherUser.avatar || '../uploads/system_images/system_profile_pictures/man-user.png'}"
                 alt="${otherUser.name}">
          </div>
          <div class="connection-info">
            <h4 class="connection-name">${otherUser.name}</h4>
            <div class="connection-role">
              <span>${roleEmoji}</span>
              <span>${primaryRole}</span>
            </div>
          </div>
        </div>
        <div class="connection-meta">
          <div class="meta-item">
            <i class="fas fa-clock"></i>
            <span>Sent ${timeAgo}</span>
          </div>
          <div class="meta-item">
            <span class="creative-badge" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem;">
              ⏳ Pending
            </span>
          </div>
        </div>
        <div class="connection-actions">
          <button class="action-btn" onclick="navigateToProfile(${otherUser.profileId}, '${otherUser.profileType}')">
            <i class="fas fa-user"></i>
            View Profile
          </button>
          <button class="action-btn danger" onclick="cancelConnectionRequest(${request.id})">
            <i class="fas fa-times"></i>
            Cancel
          </button>
        </div>
      </div>
    `;
  } else {
    // Received request card - styled like connection-card
    return `
      <div class="connection-card" data-status="${status}">
        <div class="connection-header">
          <div class="connection-avatar">
            <img src="${otherUser.avatar || '../uploads/system_images/system_profile_pictures/man-user.png'}"
                 alt="${otherUser.name}">
          </div>
          <div class="connection-info">
            <h4 class="connection-name">${otherUser.name}</h4>
            <div class="connection-role">
              <span>${roleEmoji}</span>
              <span>${primaryRole}</span>
            </div>
          </div>
        </div>
        <div class="connection-meta">
          <div class="meta-item">
            <i class="fas fa-clock"></i>
            <span>Received ${timeAgo}</span>
          </div>
          <div class="meta-item">
            <span class="creative-badge" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem;">
              📩 New Request
            </span>
          </div>
        </div>
        <div class="connection-actions">
          <button class="action-btn primary" onclick="acceptConnectionRequest(${request.id})">
            <i class="fas fa-check"></i>
            Accept
          </button>
          <button class="action-btn danger" onclick="rejectConnectionRequest(${request.id})">
            <i class="fas fa-times"></i>
            Reject
          </button>
        </div>
      </div>
    `;
  }
}

// Helper function to get current user ID from token
function getCurrentUserId() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return parseInt(payload.sub) || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// Helper function to get time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

// ============================================
// CONNECTION REQUEST ACTION HANDLERS
// ============================================

// Accept connection request
async function acceptConnectionRequest(connectionId) {
  const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');

  if (!token) {
    alert('Please log in to accept connections');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'accepted' })
    });

    if (response.ok) {
      alert('Connection accepted successfully!');
      // Reload requests panel to refresh the grid
      await loadRequestsPanel();
      // Also refresh connections if visible
      if (cachedConnections.length > 0) {
        await loadAllConnectionsPanel();
      }
    } else {
      const error = await response.json();
      alert(`Failed to accept connection: ${error.detail || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error accepting connection:', error);
    alert('Failed to accept connection. Please try again.');
  }
}

// Reject connection request
async function rejectConnectionRequest(connectionId) {
  const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');

  if (!token) {
    alert('Please log in to reject connections');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'rejected' })
    });

    if (response.ok) {
      alert('Connection request rejected');
      // Reload requests panel to refresh the grid
      await loadRequestsPanel();
    } else {
      const error = await response.json();
      alert(`Failed to reject connection: ${error.detail || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error rejecting connection:', error);
    alert('Failed to reject connection. Please try again.');
  }
}

// Cancel connection request (for sent requests)
async function cancelConnectionRequest(connectionId) {
  const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');

  if (!token) {
    alert('Please log in to cancel requests');
    return;
  }

  if (!confirm('Are you sure you want to cancel this connection request?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      alert('Connection request cancelled');
      // Reload requests panel to refresh the grid
      await loadRequestsPanel();
    } else {
      const error = await response.json();
      alert(`Failed to cancel request: ${error.detail || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error cancelling request:', error);
    alert('Failed to cancel request. Please try again.');
  }
}

// Load request counts for the main cards (async, doesn't block UI)
async function loadRequestCounts() {
  const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');

  if (!token) return;

  // Get active role from JWT token
  let activeRole = 'student';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    activeRole = payload.role || 'student';
  } catch (e) {
    console.warn('Could not parse role from token, defaulting to student');
  }

  try {
    // Fetch sent requests count
    const sentResponse = await fetch(`${API_BASE_URL}/api/connections?status=pending&direction=outgoing&role=${activeRole}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (sentResponse.ok) {
      const sentRequests = await sentResponse.json();
      updateElement('sent-requests-count-main', sentRequests.length);
    }

    // Fetch received requests count
    const receivedResponse = await fetch(`${API_BASE_URL}/api/connections?status=pending&direction=incoming&role=${activeRole}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (receivedResponse.ok) {
      const receivedRequests = await receivedResponse.json();
      updateElement('received-requests-count-main', receivedRequests.length);
    }
  } catch (error) {
    console.warn('Could not load request counts:', error);
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on the student profile page with community panel
  if (document.getElementById('community-panel')) {
    console.log('✅ Student Community Panel functions loaded');

    // Set up observer to load data when community panel becomes visible
    const communityPanel = document.getElementById('community-panel');
    if (communityPanel) {
      const panelObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (!communityPanel.classList.contains('hidden')) {
              // Load connections by default when panel is shown
              loadAllConnectionsPanel();
              loadRequestCounts(); // Load counts for request cards
              panelObserver.disconnect();
            }
          }
        });
      });

      panelObserver.observe(communityPanel, { attributes: true });

      // If panel is already visible, load immediately
      if (!communityPanel.classList.contains('hidden')) {
        loadAllConnectionsPanel();
        loadRequestCounts(); // Load counts for request cards
      }
    }

    // Also set up observer for requests tab
    const requestsMainTab = document.getElementById('requests-main-tab-content');
    if (requestsMainTab) {
      const requestsObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (!requestsMainTab.classList.contains('hidden')) {
              loadRequestCounts();
              loadSentRequests();
            }
          }
        });
      });

      requestsObserver.observe(requestsMainTab, { attributes: true });
    }
  }
});

// ============================================
// PAGINATION CONTROLS
// ============================================

// Create pagination controls HTML
function createPaginationControls(section, currentPage, totalPages, subType = null) {
  if (totalPages <= 1) return '';

  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  let pagesHtml = '';

  // Previous button
  pagesHtml += `
    <button class="action-btn ${currentPage === 1 ? 'disabled' : ''}"
            onclick="goToPage('${section}', ${currentPage - 1}, '${subType}')"
            ${currentPage === 1 ? 'disabled' : ''}>
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  // First page if not in range
  if (startPage > 1) {
    pagesHtml += `
      <button class="action-btn" onclick="goToPage('${section}', 1, '${subType}')">1</button>
    `;
    if (startPage > 2) {
      pagesHtml += `<span style="color: var(--text-muted); padding: 0 0.5rem;">...</span>`;
    }
  }

  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    pagesHtml += `
      <button class="action-btn ${i === currentPage ? 'primary' : ''}"
              onclick="goToPage('${section}', ${i}, '${subType}')">
        ${i}
      </button>
    `;
  }

  // Last page if not in range
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pagesHtml += `<span style="color: var(--text-muted); padding: 0 0.5rem;">...</span>`;
    }
    pagesHtml += `
      <button class="action-btn" onclick="goToPage('${section}', ${totalPages}, '${subType}')">${totalPages}</button>
    `;
  }

  // Next button
  pagesHtml += `
    <button class="action-btn ${currentPage === totalPages ? 'disabled' : ''}"
            onclick="goToPage('${section}', ${currentPage + 1}, '${subType}')"
            ${currentPage === totalPages ? 'disabled' : ''}>
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  return `
    <div class="col-span-full flex items-center justify-center gap-2 mt-6 pt-6" style="border-top: 1px solid var(--border-color);">
      <span style="color: var(--text-muted); font-size: 0.875rem; margin-right: 1rem;">
        Page ${currentPage} of ${totalPages}
      </span>
      ${pagesHtml}
    </div>
  `;
}

// Go to specific page
function goToPage(section, page, subType) {
  const currentUserId = getCurrentUserId();
  const now = new Date();

  switch (section) {
    case 'connections':
      const allGrid = document.getElementById('all-connections-grid');
      if (allGrid) displayConnectionsInGrid(allGrid, cachedConnections, page);
      break;

    // Events panel - uses unified grid now
    case 'events-joined':
      const joinedEvents = cachedEvents.filter(e => e.joined_status);
      displayEventsInGrid('events-panel-grid', joinedEvents, 'joined', page);
      break;

    case 'events-upcoming':
      const upcomingEvents = cachedEvents.filter(e => new Date(e.start_datetime) > now);
      displayEventsInGrid('events-panel-grid', upcomingEvents, 'upcoming', page);
      break;

    case 'events-past':
      const pastEvents = cachedEvents.filter(e => new Date(e.start_datetime) <= now);
      displayEventsInGrid('events-panel-grid', pastEvents, 'past', page);
      break;

    // Clubs panel - uses unified grid now
    case 'clubs-joined':
      const joinedClubs = cachedClubs.filter(c => c.joined_status);
      displayClubsInGrid('clubs-panel-grid', joinedClubs, 'joined', page);
      break;

    case 'clubs-discover':
      const discoverClubs = cachedClubs.filter(c => !c.joined_status);
      displayClubsInGrid('clubs-panel-grid', discoverClubs, 'discover', page);
      break;

    // Requests panel - uses unified grid now
    case 'requests-sent':
      displayRequestsInGrid('requests-panel-grid', cachedSentRequests, 'sent', page);
      break;

    case 'requests-received':
      displayRequestsInGrid('requests-panel-grid', cachedReceivedRequests, 'received', page);
      break;
  }
}

// ============================================
// INITIALIZATION FUNCTION (called from init.js)
// ============================================
function initStudentCommunityPanel() {
  console.log('🚀 Initializing Student Community Panel...');

  // Load connections data if panel is visible
  const communityPanel = document.getElementById('community-panel');
  if (communityPanel && !communityPanel.classList.contains('hidden')) {
    loadAllConnectionsPanel();
  }
}
