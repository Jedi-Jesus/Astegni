// ============================================
// PARENT COMMUNITY MANAGER - Database Integration
// Complete system for managing Connections, Events, and Clubs
// ============================================

class ParentCommunityManager {
  constructor() {
    this.API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
    this.currentSection = 'main'; // main, connections, events, clubs
    this.currentConnectionTab = 'all'; // all, requested, tutors, students, parents
    this.currentEventTab = 'all'; // all, scheduled, joined
    this.currentClubTab = 'all'; // all, mine, discover, joined
    this.allConnections = [];
    this.requestedConnections = [];
    this.allEvents = [];
    this.allClubs = [];
    // Pagination settings
    this.eventsPage = 1;
    this.eventsPerPage = 6;
    this.clubsPage = 1;
    this.clubsPerPage = 6;
    this.init();
  }

  async init() {
    console.log('🚀 Initializing Parent Community Manager...');
    await this.loadInitialCounts();
  }

  // ============================================
  // LOAD INITIAL COUNTS
  // ============================================
  async loadInitialCounts() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, counts will remain at 0');
        return;
      }

      // Get active role from JWT token (e.g., 'parent')
      let activeRole = 'parent'; // Default to parent for this manager
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        activeRole = payload.role || 'parent';
      } catch (e) {
        console.warn('Could not parse role from token, defaulting to parent');
      }

      // Fetch connections count (status=accepted is the new schema, filtered by role/profile_id)
      const connectionsResponse = await fetch(`${this.API_BASE_URL}/api/connections?status=accepted&role=${activeRole}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (connectionsResponse.ok) {
        const connections = await connectionsResponse.json();
        this.allConnections = connections;
        const connectionsCount = connections.length;
        // Update all connection count elements
        document.querySelectorAll('#connections-count, #connections-total-count').forEach(el => {
          el.textContent = connectionsCount;
        });
        console.log(`✓ Loaded ${connectionsCount} connections for role: ${activeRole}`);
      }

      // Fetch requested connections count (status=pending, direction=incoming - new schema, filtered by role/profile_id)
      const requestedResponse = await fetch(`${this.API_BASE_URL}/api/connections?status=pending&direction=incoming&role=${activeRole}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (requestedResponse.ok) {
        const requested = await requestedResponse.json();
        this.requestedConnections = requested;
        const requestsCount = requested.length;
        // Update all requests count elements
        document.querySelectorAll('#requests-count, #received-requests-count').forEach(el => {
          el.textContent = requestsCount;
        });
        console.log(`✓ Loaded ${requestsCount} requested connections`);
      }

      // Fetch events count (filtered by role/profile_id)
      const eventsResponse = await fetch(`${this.API_BASE_URL}/api/events?role=${activeRole}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        this.allEvents = eventsData.events || [];
        const eventsCount = this.allEvents.length;
        document.querySelectorAll('#events-count, #events-total-count').forEach(el => {
          el.textContent = eventsCount;
        });
        console.log(`✓ Loaded ${eventsCount} events for role: ${activeRole}`);
      }

      // Fetch clubs count (filtered by role/profile_id)
      const clubsResponse = await fetch(`${this.API_BASE_URL}/api/clubs?role=${activeRole}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (clubsResponse.ok) {
        const clubsData = await clubsResponse.json();
        this.allClubs = clubsData.clubs || [];
        const clubsCount = this.allClubs.length;
        document.querySelectorAll('#clubs-count, #clubs-total-count').forEach(el => {
          el.textContent = clubsCount;
        });
        console.log(`✓ Loaded ${clubsCount} clubs for role: ${activeRole}`);
      }

    } catch (error) {
      console.error('Error loading initial counts:', error);
    }
  }

  // ============================================
  // SECTION SWITCHING
  // ============================================
  switchSection(section) {
    this.currentSection = section;

    // Hide all sections
    const sections = ['connections-section', 'events-section', 'clubs-section'];
    sections.forEach(s => {
      const el = document.getElementById(s);
      if (el) el.style.display = 'none';
    });

    // Update tab styling
    document.querySelectorAll('.community-main-tab').forEach(tab => {
      const tabSection = tab.getAttribute('data-section');
      const isActive = tabSection === section;

      tab.style.background = isActive ? 'var(--button-bg)' : 'transparent';
      tab.style.color = isActive ? 'white' : 'var(--text)';

      if (isActive) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Show/hide main tabs
    const mainTabs = document.querySelector('.community-tabs');
    if (mainTabs) {
      mainTabs.style.display = section === 'main' ? 'flex' : 'none';
    }

    if (section !== 'main') {
      const sectionEl = document.getElementById(`${section}-section`);
      if (sectionEl) {
        sectionEl.style.display = 'block';
        // Load data for the section
        if (section === 'connections') {
          this.loadConnections();
        } else if (section === 'events') {
          this.loadEvents();
        } else if (section === 'clubs') {
          this.loadClubs();
        }
      }
    }
  }

  // ============================================
  // CONNECTIONS TAB SWITCHING
  // ============================================
  switchConnectionTab(tab) {
    this.currentConnectionTab = tab;

    // Update tab styles
    document.querySelectorAll('.connection-tab').forEach(btn => {
      const isActive = btn.dataset.tab === tab;
      btn.style.background = isActive ? 'var(--button-bg)' : 'var(--background)';
      btn.style.borderColor = isActive ? 'var(--button-bg)' : 'var(--border-color)';
      btn.style.color = isActive ? 'white' : 'var(--text)';

      const filterCount = btn.querySelector('.filter-count');
      if (filterCount) {
        filterCount.style.background = isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(var(--button-bg-rgb), 0.15)';
        filterCount.style.color = isActive ? 'white' : 'var(--button-bg)';
      }
    });

    // Filter and display connections
    this.displayConnections(tab);
  }

  // ============================================
  // EVENT TAB SWITCHING
  // ============================================
  switchEventTab(tab) {
    this.currentEventTab = tab;

    // Update tab styles
    document.querySelectorAll('.event-tab').forEach(btn => {
      const isActive = btn.dataset.tab === tab;
      btn.style.background = isActive ? 'var(--button-bg)' : 'var(--background)';
      btn.style.borderColor = isActive ? 'var(--button-bg)' : 'var(--border-color)';
      btn.style.color = isActive ? 'white' : 'var(--text)';
    });

    // Filter and display events
    this.displayEvents(tab);
  }

  // ============================================
  // CLUB TAB SWITCHING
  // ============================================
  switchClubTab(tab) {
    this.currentClubTab = tab;

    // Update tab styles
    document.querySelectorAll('.club-tab').forEach(btn => {
      const isActive = btn.dataset.tab === tab;
      btn.style.background = isActive ? 'var(--button-bg)' : 'var(--background)';
      btn.style.borderColor = isActive ? 'var(--button-bg)' : 'var(--border-color)';
      btn.style.color = isActive ? 'white' : 'var(--text)';
    });

    // Filter and display clubs
    this.displayClubs(tab);
  }

  // ============================================
  // LOAD CONNECTIONS FROM DATABASE
  // ============================================
  async loadConnections() {
    const grid = document.getElementById('connections-grid');
    if (!grid) return;

    grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i><p style="margin-top: 1rem;">Loading connections...</p></div>';

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        grid.innerHTML = this.getEmptyState('connections', 'Please log in to view connections');
        return;
      }

      // Get active role from JWT token (e.g., 'parent')
      let activeRole = 'parent';
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        activeRole = payload.role || 'parent';
      } catch (e) {
        console.warn('Could not parse role from token, defaulting to parent');
      }

      // Use status=accepted (new schema), filtered by role/profile_id
      const response = await fetch(`${this.API_BASE_URL}/api/connections?status=accepted&role=${activeRole}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch connections');

      this.allConnections = await response.json();
      this.updateConnectionCounts();
      this.displayConnections(this.currentConnectionTab);

    } catch (error) {
      console.error('Error loading connections:', error);
      grid.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-danger);"><p>Failed to load connections</p><button onclick="parentCommunityManager.loadConnections()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--button-bg); color: white; border: none; border-radius: 6px; cursor: pointer;">Retry</button></div>`;
    }
  }

  // Update connection filter counts
  updateConnectionCounts() {
    const counts = {
      all: this.allConnections.length,
      requested: this.requestedConnections.length,
      tutors: 0,
      students: 0,
      parents: 0
    };

    this.allConnections.forEach(conn => {
      const otherUser = this.getOtherUser(conn);
      const roles = otherUser.roles || [];

      if (roles.includes('tutor')) counts.tutors++;
      if (roles.includes('student')) counts.students++;
      if (roles.includes('parent')) counts.parents++;
    });

    // Update badge counts
    document.querySelectorAll('.connection-tab .filter-count, .filter-btn .filter-count').forEach(badge => {
      const role = badge.getAttribute('data-role');
      if (counts[role] !== undefined) {
        badge.textContent = counts[role];
      }
    });
  }

  // Display connections based on selected tab
  displayConnections(tab) {
    const grid = document.getElementById('connections-grid');
    if (!grid) return;

    let filteredConnections = [];

    if (tab === 'requested') {
      // Show requested/pending connections
      filteredConnections = this.requestedConnections;
    } else if (tab === 'all') {
      // Show all connected connections
      filteredConnections = this.allConnections;
    } else {
      // Filter by role (tutors, students, parents)
      filteredConnections = this.allConnections.filter(conn => {
        const otherUser = this.getOtherUser(conn);
        const roles = otherUser.roles || [];
        return roles.includes(tab === 'tutors' ? 'tutor' : tab === 'students' ? 'student' : 'parent');
      });
    }

    if (filteredConnections.length === 0) {
      const emptyMessage = tab === 'requested' ? 'No pending connection requests' :
                          tab === 'all' ? 'No connections yet' : `No ${tab} yet`;
      grid.innerHTML = this.getEmptyState('connections', emptyMessage);
      return;
    }

    // Use createRequestedConnectionCard for requested tab, otherwise use createConnectionCard
    if (tab === 'requested') {
      grid.innerHTML = filteredConnections.map(conn => this.createRequestedConnectionCard(conn)).join('');
    } else {
      grid.innerHTML = filteredConnections.map(conn => this.createConnectionCard(conn)).join('');
    }
  }

  // Create connection card HTML
  createConnectionCard(conn) {
    const otherUser = this.getOtherUser(conn);
    const connectedDate = conn.created_at ? new Date(conn.created_at) : null;
    const connectedDays = connectedDate ? Math.floor((new Date() - connectedDate) / (1000 * 60 * 60 * 24)) : 0;
    const connectedText = connectedDays === 0 ? 'Connected today' :
                         connectedDays === 1 ? 'Connected yesterday' :
                         `Connected ${connectedDays} days ago`;

    const primaryRole = otherUser.profileType
      ? otherUser.profileType.charAt(0).toUpperCase() + otherUser.profileType.slice(1)
      : (otherUser.roles || []).includes('student') ? 'Student' :
        (otherUser.roles || []).includes('tutor') ? 'Tutor' :
        (otherUser.roles || []).includes('parent') ? 'Parent' : 'User';

    return `
      <div class="connection-card" style="background: var(--card-bg); border-radius: 12px; padding: 1.5rem; border: 1px solid rgba(var(--border-rgb), 0.1); transition: all 0.2s ease;" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseleave="this.style.boxShadow='none'">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
          <div style="position: relative;">
            <img src="${otherUser.avatar || '../uploads/system_images/system_profile_pictures/man-user.png'}" alt="${otherUser.name}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);">
            ${otherUser.isOnline ? '<span style="position: absolute; bottom: 0; right: 0; width: 14px; height: 14px; background: #10b981; border: 2px solid var(--card-bg); border-radius: 50%;"></span>' : ''}
          </div>
          <div style="flex: 1; min-width: 0;">
            <h4 style="font-weight: 600; color: var(--heading); font-size: 1rem; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${otherUser.name}</h4>
            <p style="margin: 0.25rem 0; font-size: 0.85rem;">
              <span style="color: var(--text-muted); margin-right: 0.25rem;">Connected as</span>
              <span style="display: inline-block; padding: 0.15rem 0.5rem; background: var(--primary-color, #3b82f6); color: white; border-radius: 4px; font-size: 0.7rem; font-weight: 500;">${primaryRole}</span>
            </p>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; background: var(--background); border-radius: 8px; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">
            <i class="fas fa-envelope" style="opacity: 0.7; width: 16px;"></i>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${otherUser.email || 'No email provided'}</span>
          </div>
          ${connectedDate ? `
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">
            <i class="fas fa-calendar" style="opacity: 0.7; width: 16px;"></i>
            <span title="${connectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}">${connectedText}</span>
          </div>
          ` : ''}
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button onclick="parentCommunityManager.navigateToProfile(${otherUser.profileId}, '${otherUser.profileType || ''}')" style="flex: 1; padding: 0.625rem; background: transparent; color: var(--button-bg, #3b82f6); border: 1px solid var(--button-bg, #3b82f6); border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 500; transition: all 0.2s ease;" onmouseover="this.style.background='var(--button-bg, #3b82f6)'; this.style.color='white'" onmouseout="this.style.background='transparent'; this.style.color='var(--button-bg, #3b82f6)'">
            <i class="fas fa-user" style="margin-right: 0.25rem;"></i> View Profile
          </button>
          <button onclick="parentCommunityManager.messageUser(JSON.parse(this.dataset.user))" data-user="${this.encodeUserDataForOnclick(otherUser)}" style="flex: 1; padding: 0.625rem; background: var(--button-bg, #3b82f6); color: white; border: none; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 500; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
            <i class="fas fa-comment" style="margin-right: 0.25rem;"></i> Message
          </button>
        </div>
      </div>
    `;
  }

  // Create requested connection card HTML (with Accept/Reject buttons)
  createRequestedConnectionCard(conn) {
    const otherUser = this.getOtherUser(conn);
    const requestedDate = conn.created_at ? new Date(conn.created_at) : null;
    const requestedDays = requestedDate ? Math.floor((new Date() - requestedDate) / (1000 * 60 * 60 * 24)) : 0;
    const requestedText = requestedDays === 0 ? 'Requested today' :
                         requestedDays === 1 ? 'Requested yesterday' :
                         `Requested ${requestedDays} days ago`;

    const primaryRole = otherUser.profileType
      ? otherUser.profileType.charAt(0).toUpperCase() + otherUser.profileType.slice(1)
      : (otherUser.roles || []).includes('student') ? 'Student' :
        (otherUser.roles || []).includes('tutor') ? 'Tutor' :
        (otherUser.roles || []).includes('parent') ? 'Parent' : 'User';

    return `
      <div class="connection-card" style="background: var(--card-bg); border-radius: 12px; padding: 1.5rem; border: 2px solid #fbbf24; transition: all 0.2s ease;" onmouseenter="this.style.boxShadow='0 4px 12px rgba(251,191,36,0.3)'" onmouseleave="this.style.boxShadow='none'">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
          <div style="position: relative;">
            <img src="${otherUser.avatar || '../uploads/system_images/system_profile_pictures/man-user.png'}" alt="${otherUser.name}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid #fbbf24;">
            <span style="position: absolute; bottom: 0; right: 0; width: 14px; height: 14px; background: #fbbf24; border: 2px solid var(--card-bg); border-radius: 50%;"></span>
          </div>
          <div style="flex: 1; min-width: 0;">
            <h4 style="font-weight: 600; color: var(--heading); font-size: 1rem; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${otherUser.name}</h4>
            <p style="margin: 0.25rem 0; font-size: 0.85rem;">
              <span style="color: var(--text-muted); margin-right: 0.25rem;">Wants to connect as</span>
              <span style="display: inline-block; padding: 0.15rem 0.5rem; background: #fbbf24; color: white; border-radius: 4px; font-size: 0.7rem; font-weight: 500;">${primaryRole}</span>
            </p>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; background: rgba(251,191,36,0.1); border-radius: 8px; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">
            <i class="fas fa-envelope" style="opacity: 0.7; width: 16px;"></i>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${otherUser.email || 'No email provided'}</span>
          </div>
          ${requestedDate ? `
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">
            <i class="fas fa-clock" style="opacity: 0.7; width: 16px;"></i>
            <span title="${requestedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}">${requestedText}</span>
          </div>
          ` : ''}
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button onclick="parentCommunityManager.messageUser(JSON.parse(this.dataset.user))" data-user="${this.encodeUserDataForOnclick(otherUser)}" style="padding: 0.625rem 1rem; background: var(--button-bg, #3b82f6); color: white; border: none; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 500; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
            <i class="fas fa-comment" style="margin-right: 0.25rem;"></i> Message
          </button>
          <button onclick="parentCommunityManager.acceptConnection(${conn.id})" style="flex: 1; padding: 0.625rem; background: #10b981; color: white; border: none; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 500; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
            <i class="fas fa-check" style="margin-right: 0.25rem;"></i> Accept
          </button>
          <button onclick="parentCommunityManager.rejectConnection(${conn.id})" style="flex: 1; padding: 0.625rem; background: #ef4444; color: white; border: none; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 500; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
            <i class="fas fa-times" style="margin-right: 0.25rem;"></i> Reject
          </button>
          <button onclick="parentCommunityManager.navigateToProfile(${otherUser.profileId}, '${otherUser.profileType || ''}')" style="padding: 0.625rem 1rem; background: transparent; color: var(--button-bg, #3b82f6); border: 1px solid var(--button-bg, #3b82f6); border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 500; transition: all 0.2s ease;" onmouseover="this.style.background='var(--button-bg, #3b82f6)'; this.style.color='white'" onmouseout="this.style.background='transparent'; this.style.color='var(--button-bg, #3b82f6)'">
            <i class="fas fa-user" style="margin-right: 0.25rem;"></i>
          </button>
        </div>
      </div>
    `;
  }

  // Accept connection request
  async acceptConnection(connectionId) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to accept connections');
        return;
      }

      const response = await fetch(`${this.API_BASE_URL}/api/connections/${connectionId}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Connection accepted successfully!');
        // Reload connections
        await this.loadConnections();
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
  async rejectConnection(connectionId) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to reject connections');
        return;
      }

      const response = await fetch(`${this.API_BASE_URL}/api/connections/${connectionId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Connection request rejected');
        // Reload connections
        await this.loadConnections();
      } else {
        const error = await response.json();
        alert(`Failed to reject connection: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error rejecting connection:', error);
      alert('Failed to reject connection. Please try again.');
    }
  }

  // ============================================
  // LOAD EVENTS FROM DATABASE
  // ============================================
  async loadEvents() {
    const grid = document.getElementById('events-grid');
    if (!grid) return;

    grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i><p style="margin-top: 1rem;">Loading events...</p></div>';

    try {
      const token = localStorage.getItem('token');

      // Get active role from JWT token
      let activeRole = 'parent';
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          activeRole = payload.role || 'parent';
        } catch (e) {
          console.warn('Could not parse role from token, defaulting to parent');
        }
      }

      const response = await fetch(`${this.API_BASE_URL}/api/events?role=${activeRole}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();
      this.allEvents = data.events || [];
      this.displayEvents(this.currentEventTab);

    } catch (error) {
      console.error('Error loading events:', error);
      grid.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-danger);"><p>Failed to load events</p><button onclick="parentCommunityManager.loadEvents()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--button-bg); color: white; border: none; border-radius: 6px; cursor: pointer;">Retry</button></div>`;
    }
  }

  // Display events based on selected tab with pagination
  displayEvents(tab) {
    const grid = document.getElementById('events-grid');
    if (!grid) return;

    // Get current user ID for "mine" filtering
    const token = localStorage.getItem('token');
    let currentUserId = null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUserId = parseInt(payload.sub);
      } catch (e) {}
    }

    let filteredEvents = this.allEvents;
    const now = new Date();

    if (tab === 'joined') {
      filteredEvents = this.allEvents.filter(event => event.joined_status === true);
    } else if (tab === 'mine') {
      // Events created by the current user
      filteredEvents = this.allEvents.filter(event => event.created_by === currentUserId);
    } else if (tab === 'scheduled') {
      // Upcoming events (not past)
      filteredEvents = this.allEvents.filter(event => new Date(event.start_datetime) > now);
    }
    // 'all' tab shows all events (no filtering needed)

    // Update tab button styles
    this.updateEventTabStyles(tab);

    if (filteredEvents.length === 0) {
      const messages = {
        'all': 'No events available',
        'mine': 'You haven\'t created any events yet',
        'scheduled': 'No scheduled events',
        'joined': 'No joined events yet'
      };
      grid.innerHTML = this.getEmptyState('events', messages[tab] || 'No events available');
      this.renderEventsPagination(0);
      return;
    }

    // Apply pagination
    const totalPages = Math.ceil(filteredEvents.length / this.eventsPerPage);
    if (this.eventsPage > totalPages) this.eventsPage = 1;

    const startIndex = (this.eventsPage - 1) * this.eventsPerPage;
    const paginatedEvents = filteredEvents.slice(startIndex, startIndex + this.eventsPerPage);

    grid.innerHTML = paginatedEvents.map(event => this.createEventCard(event)).join('');
    this.renderEventsPagination(filteredEvents.length);
  }

  // Update event tab button styles
  updateEventTabStyles(activeTab) {
    const tabs = ['all', 'mine', 'scheduled', 'joined'];
    tabs.forEach(tab => {
      const btn = document.getElementById(`events-tab-${tab}`);
      if (btn) {
        if (tab === activeTab) {
          btn.className = 'px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white transition-all';
        } else {
          btn.className = 'px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all';
        }
      }
    });
  }

  // Render events pagination
  renderEventsPagination(totalItems) {
    const paginationDiv = document.getElementById('events-pagination');
    if (!paginationDiv) return;

    const totalPages = Math.ceil(totalItems / this.eventsPerPage);

    if (totalPages <= 1) {
      paginationDiv.innerHTML = '';
      return;
    }

    let html = `
      <button onclick="parentCommunityManager.goToEventsPage(${this.eventsPage - 1})"
              class="px-3 py-1 rounded-lg ${this.eventsPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
              ${this.eventsPage === 1 ? 'disabled' : ''}>
        Previous
      </button>
      <span class="text-sm text-gray-600">Page ${this.eventsPage} of ${totalPages}</span>
      <button onclick="parentCommunityManager.goToEventsPage(${this.eventsPage + 1})"
              class="px-3 py-1 rounded-lg ${this.eventsPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
              ${this.eventsPage === totalPages ? 'disabled' : ''}>
        Next
      </button>
    `;
    paginationDiv.innerHTML = html;
  }

  // Go to specific events page
  goToEventsPage(page) {
    const totalPages = Math.ceil(this.getFilteredEvents().length / this.eventsPerPage);
    if (page < 1 || page > totalPages) return;
    this.eventsPage = page;
    this.displayEvents(this.currentEventTab);
  }

  // Get filtered events based on current tab
  getFilteredEvents() {
    const token = localStorage.getItem('token');
    let currentUserId = null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUserId = parseInt(payload.sub);
      } catch (e) {}
    }

    const now = new Date();
    if (this.currentEventTab === 'joined') {
      return this.allEvents.filter(event => event.joined_status === true);
    } else if (this.currentEventTab === 'mine') {
      return this.allEvents.filter(event => event.created_by === currentUserId);
    } else if (this.currentEventTab === 'scheduled') {
      return this.allEvents.filter(event => new Date(event.start_datetime) > now);
    }
    return this.allEvents;
  }

  // Filter events by tab (called from HTML)
  filterEventsByTab(tab) {
    this.currentEventTab = tab;
    this.eventsPage = 1; // Reset to first page
    this.displayEvents(tab);
  }

  // Create event card HTML
  createEventCard(event) {
    const startDate = new Date(event.start_datetime);
    const isOnline = event.is_online || (event.location && event.location.toLowerCase() === 'online');

    return `
      <div class="event-card" style="background: var(--card-bg); border-radius: 12px; padding: 1.5rem; border: 1px solid rgba(var(--border-rgb), 0.1); transition: all 0.2s ease; display: flex; flex-direction: column; gap: 1rem;" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseleave="this.style.boxShadow='none'">
        ${event.event_picture ? `<img src="${event.event_picture}" alt="${event.title}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 8px;">` : ''}
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.75rem;">
            <h3 style="font-size: 1.125rem; font-weight: 600; color: var(--heading); margin: 0; flex: 1;">${event.title}</h3>
            <span style="padding: 0.375rem 0.75rem; background: ${isOnline ? '#10b981' : 'var(--button-bg)'}; color: white; border-radius: 6px; font-size: 0.75rem; font-weight: 600; white-space: nowrap;">${isOnline ? 'Online' : 'In-Person'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.85rem;">
              <span>📅</span>
              <span>${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.85rem;">
              <span>🕐</span>
              <span>${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.85rem;">
              <span>📍</span>
              <span>${event.location || 'TBA'}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.85rem;">
              <span>👥</span>
              <span>${event.registered_count || 0}/${event.available_seats || 'Unlimited'} registered</span>
            </div>
            ${event.price > 0 ? `<div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.85rem;"><span>💰</span><span>${event.price} ${CurrencyManager.getSymbol()}</span></div>` : '<div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.85rem;"><span>🎁</span><span>Free</span></div>'}
          </div>
          <p style="color: var(--text); font-size: 0.9rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 1rem;">${event.description || 'No description available'}</p>
        </div>
        <div style="display: flex; gap: 0.5rem; margin-top: auto;">
          <button onclick="alert('View event details coming soon!')" style="flex: 1; padding: 0.625rem; background: transparent; color: var(--button-bg); border: 1px solid var(--button-bg); border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 500; transition: all 0.2s ease;" onmouseover="this.style.background='var(--button-bg)'; this.style.color='white'" onmouseout="this.style.background='transparent'; this.style.color='var(--button-bg)'">
            View Details
          </button>
          <button onclick="alert('Join event feature coming soon!')" style="flex: 1; padding: 0.625rem; background: var(--button-bg); color: white; border: none; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 500; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
            Join Event
          </button>
        </div>
      </div>
    `;
  }

  // ============================================
  // LOAD CLUBS FROM DATABASE
  // ============================================
  async loadClubs() {
    const grid = document.getElementById('clubs-grid');
    if (!grid) return;

    grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i><p style="margin-top: 1rem;">Loading clubs...</p></div>';

    try {
      const token = localStorage.getItem('token');

      // Get active role from JWT token
      let activeRole = 'parent';
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          activeRole = payload.role || 'parent';
        } catch (e) {
          console.warn('Could not parse role from token, defaulting to parent');
        }
      }

      const response = await fetch(`${this.API_BASE_URL}/api/clubs?role=${activeRole}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) throw new Error('Failed to fetch clubs');

      const data = await response.json();
      this.allClubs = data.clubs || [];
      this.displayClubs(this.currentClubTab);

    } catch (error) {
      console.error('Error loading clubs:', error);
      grid.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-danger);"><p>Failed to load clubs</p><button onclick="parentCommunityManager.loadClubs()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--button-bg); color: white; border: none; border-radius: 6px; cursor: pointer;">Retry</button></div>`;
    }
  }

  // Display clubs based on selected tab with pagination
  displayClubs(tab) {
    const grid = document.getElementById('clubs-grid');
    if (!grid) return;

    // Get current user ID for "mine" filtering
    const token = localStorage.getItem('token');
    let currentUserId = null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUserId = parseInt(payload.sub);
      } catch (e) {}
    }

    let filteredClubs = this.allClubs;

    if (tab === 'joined') {
      filteredClubs = this.allClubs.filter(club => club.joined_status === true);
    } else if (tab === 'mine') {
      // Clubs created by the current user
      filteredClubs = this.allClubs.filter(club => club.created_by === currentUserId);
    } else if (tab === 'discover') {
      // Clubs not joined yet (excluding mine)
      filteredClubs = this.allClubs.filter(club => !club.joined_status && club.created_by !== currentUserId);
    }
    // 'all' tab shows all clubs (no filtering needed)

    // Update tab button styles
    this.updateClubTabStyles(tab);

    if (filteredClubs.length === 0) {
      const messages = {
        'all': 'No clubs available',
        'mine': 'You haven\'t created any clubs yet',
        'discover': 'No new clubs to discover',
        'joined': 'No clubs joined yet'
      };
      grid.innerHTML = this.getEmptyState('clubs', messages[tab] || 'No clubs available');
      this.renderClubsPagination(0);
      return;
    }

    // Apply pagination
    const totalPages = Math.ceil(filteredClubs.length / this.clubsPerPage);
    if (this.clubsPage > totalPages) this.clubsPage = 1;

    const startIndex = (this.clubsPage - 1) * this.clubsPerPage;
    const paginatedClubs = filteredClubs.slice(startIndex, startIndex + this.clubsPerPage);

    grid.innerHTML = paginatedClubs.map(club => this.createClubCard(club)).join('');
    this.renderClubsPagination(filteredClubs.length);
  }

  // Update club tab button styles
  updateClubTabStyles(activeTab) {
    const tabs = ['all', 'mine', 'discover', 'joined'];
    tabs.forEach(tab => {
      const btn = document.getElementById(`clubs-tab-${tab}`);
      if (btn) {
        if (tab === activeTab) {
          btn.className = 'px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white transition-all';
        } else {
          btn.className = 'px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all';
        }
      }
    });
  }

  // Render clubs pagination
  renderClubsPagination(totalItems) {
    const paginationDiv = document.getElementById('clubs-pagination');
    if (!paginationDiv) return;

    const totalPages = Math.ceil(totalItems / this.clubsPerPage);

    if (totalPages <= 1) {
      paginationDiv.innerHTML = '';
      return;
    }

    let html = `
      <button onclick="parentCommunityManager.goToClubsPage(${this.clubsPage - 1})"
              class="px-3 py-1 rounded-lg ${this.clubsPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
              ${this.clubsPage === 1 ? 'disabled' : ''}>
        Previous
      </button>
      <span class="text-sm text-gray-600">Page ${this.clubsPage} of ${totalPages}</span>
      <button onclick="parentCommunityManager.goToClubsPage(${this.clubsPage + 1})"
              class="px-3 py-1 rounded-lg ${this.clubsPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
              ${this.clubsPage === totalPages ? 'disabled' : ''}>
        Next
      </button>
    `;
    paginationDiv.innerHTML = html;
  }

  // Go to specific clubs page
  goToClubsPage(page) {
    const totalPages = Math.ceil(this.getFilteredClubs().length / this.clubsPerPage);
    if (page < 1 || page > totalPages) return;
    this.clubsPage = page;
    this.displayClubs(this.currentClubTab);
  }

  // Get filtered clubs based on current tab
  getFilteredClubs() {
    const token = localStorage.getItem('token');
    let currentUserId = null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUserId = parseInt(payload.sub);
      } catch (e) {}
    }

    if (this.currentClubTab === 'joined') {
      return this.allClubs.filter(club => club.joined_status === true);
    } else if (this.currentClubTab === 'mine') {
      return this.allClubs.filter(club => club.created_by === currentUserId);
    } else if (this.currentClubTab === 'discover') {
      return this.allClubs.filter(club => !club.joined_status && club.created_by !== currentUserId);
    }
    return this.allClubs;
  }

  // Filter clubs by tab (called from HTML)
  filterClubsByTab(tab) {
    this.currentClubTab = tab;
    this.clubsPage = 1; // Reset to first page
    this.displayClubs(tab);
  }

  // Create club card HTML
  createClubCard(club) {
    return `
      <div class="club-card" style="background: var(--card-bg); border-radius: 12px; padding: 1.5rem; border: 1px solid rgba(var(--border-rgb), 0.1); transition: all 0.2s ease; display: flex; flex-direction: column; gap: 1rem;" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseleave="this.style.boxShadow='none'">
        ${club.club_picture ? `<img src="${club.club_picture}" alt="${club.title}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 8px;">` : ''}
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.75rem;">
            <h3 style="font-size: 1.125rem; font-weight: 600; color: var(--heading); margin: 0; flex: 1;">${club.title}</h3>
            <span style="padding: 0.375rem 0.75rem; background: var(--button-bg); color: white; border-radius: 6px; font-size: 0.75rem; font-weight: 600; white-space: nowrap;">${club.category || 'General'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.85rem;">
              <span>📚</span>
              <span>${club.category || 'General'}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.85rem;">
              <span>👥</span>
              <span>${club.member_count || 0}/${club.member_limit || 'Unlimited'} members</span>
            </div>
            ${club.is_paid ? `<div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.85rem;"><span>💰</span><span>${club.membership_fee} ${CurrencyManager.getSymbol()}</span></div>` : '<div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.85rem;"><span>🎁</span><span>Free</span></div>'}
          </div>
          <p style="color: var(--text); font-size: 0.9rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 1rem;">${club.description || 'No description available'}</p>
        </div>
        <div style="display: flex; gap: 0.5rem; margin-top: auto;">
          <button onclick="alert('View club details coming soon!')" style="flex: 1; padding: 0.625rem; background: transparent; color: var(--button-bg); border: 1px solid var(--button-bg); border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 500; transition: all 0.2s ease;" onmouseover="this.style.background='var(--button-bg)'; this.style.color='white'" onmouseout="this.style.background='transparent'; this.style.color='var(--button-bg)'">
            View Details
          </button>
          <button onclick="alert('Join club feature coming soon!')" style="flex: 1; padding: 0.625rem; background: var(--button-bg); color: white; border: none; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 500; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
            Join Club
          </button>
        </div>
      </div>
    `;
  }

  // ============================================
  // SEARCH FUNCTIONS
  // ============================================
  searchConnections(query) {
    if (!query.trim()) {
      this.displayConnections(this.currentConnectionTab);
      return;
    }

    const filtered = this.allConnections.filter(conn => {
      const otherUser = this.getOtherUser(conn);
      const searchLower = query.toLowerCase();
      return (
        (otherUser.name && otherUser.name.toLowerCase().includes(searchLower)) ||
        (otherUser.email && otherUser.email.toLowerCase().includes(searchLower)) ||
        (otherUser.roles && otherUser.roles.some(role => role.toLowerCase().includes(searchLower)))
      );
    });

    const grid = document.getElementById('connections-grid');
    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);"><i class="fas fa-search" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i><p>No results found for "${query}"</p></div>`;
    } else {
      grid.innerHTML = filtered.map(conn => this.createConnectionCard(conn)).join('');
    }
  }

  searchEvents(query) {
    if (!query.trim()) {
      this.displayEvents(this.currentEventTab);
      return;
    }

    const filtered = this.allEvents.filter(event => {
      const searchLower = query.toLowerCase();
      return (
        (event.title && event.title.toLowerCase().includes(searchLower)) ||
        (event.location && event.location.toLowerCase().includes(searchLower)) ||
        (event.type && event.type.toLowerCase().includes(searchLower)) ||
        (event.description && event.description.toLowerCase().includes(searchLower))
      );
    });

    const grid = document.getElementById('events-grid');
    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);"><i class="fas fa-search" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i><p>No results found for "${query}"</p></div>`;
    } else {
      grid.innerHTML = filtered.map(event => this.createEventCard(event)).join('');
    }
  }

  searchClubs(query) {
    if (!query.trim()) {
      this.displayClubs(this.currentClubTab);
      return;
    }

    const filtered = this.allClubs.filter(club => {
      const searchLower = query.toLowerCase();
      return (
        (club.title && club.title.toLowerCase().includes(searchLower)) ||
        (club.category && club.category.toLowerCase().includes(searchLower)) ||
        (club.description && club.description.toLowerCase().includes(searchLower))
      );
    });

    const grid = document.getElementById('clubs-grid');
    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);"><i class="fas fa-search" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i><p>No results found for "${query}"</p></div>`;
    } else {
      grid.innerHTML = filtered.map(club => this.createClubCard(club)).join('');
    }
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  getOtherUser(connection) {
    const currentUserId = this.getCurrentUserId();

    // New API schema uses: requested_by, recipient_id, requester_name, recipient_name, etc.
    const isRequester = connection.requested_by === currentUserId;

    if (isRequester) {
      // Current user is the requester, show the recipient
      return {
        id: connection.recipient_id,
        name: connection.recipient_name || 'Unknown User',
        email: connection.recipient_email || '',
        avatar: connection.recipient_profile_picture || null,
        roles: connection.recipient_roles || [],
        profileType: connection.recipient_type || null,
        profileId: connection.recipient_profile_id || null,
        isOnline: false
      };
    } else {
      // Current user is the recipient, show the requester
      return {
        id: connection.requested_by,
        name: connection.requester_name || 'Unknown User',
        email: connection.requester_email || '',
        avatar: connection.requester_profile_picture || null,
        roles: connection.requester_roles || [],
        profileType: connection.requester_type || null,
        profileId: connection.requester_profile_id || null,
        isOnline: false
      };
    }
  }

  getCurrentUserId() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return parseInt(payload.sub) || null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  getEmptyState(type, message) {
    const emojis = {
      connections: '👥',
      events: '📅',
      clubs: '🎭'
    };

    return `
      <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; text-align: center;">
        <div style="font-size: 5rem; margin-bottom: 1.5rem; opacity: 0.3;">${emojis[type] || '🔍'}</div>
        <h3 style="font-size: 1.5rem; font-weight: 600; color: var(--heading); margin: 0 0 0.5rem;">${message}</h3>
        <p style="font-size: 0.95rem; color: var(--text-muted); max-width: 400px; margin: 0;">Start connecting with tutors, students, and parents in your community.</p>
      </div>
    `;
  }

  navigateToProfile(profileId, profileType) {
    let profileUrl;

    if (profileType === 'student') {
      profileUrl = `../view-profiles/view-student.html?id=${profileId}`;
    } else if (profileType === 'tutor') {
      profileUrl = `../view-profiles/view-tutor.html?id=${profileId}`;
    } else if (profileType === 'parent') {
      profileUrl = `../view-profiles/view-parent.html?id=${profileId}`;
    } else {
      profileUrl = `../view-profiles/view-student.html?id=${profileId}`;
    }

    console.log(`🔗 Navigating to ${profileType} profile: ${profileUrl}`);
    window.location.href = profileUrl;
  }

  messageUser(user) {
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
  encodeUserDataForOnclick(user) {
    return JSON.stringify(user).replace(/"/g, '&quot;');
  }
}

// ============================================
// GLOBAL FUNCTIONS (for onclick handlers)
// ============================================
function switchCommunitySection(section) {
  if (window.parentCommunityManager) {
    window.parentCommunityManager.switchSection(section);
  }
}

function switchConnectionTab(tab) {
  if (window.parentCommunityManager) {
    window.parentCommunityManager.switchConnectionTab(tab);
  }
}

function switchEventTab(tab) {
  if (window.parentCommunityManager) {
    window.parentCommunityManager.switchEventTab(tab);
  }
}

function switchClubTab(tab) {
  if (window.parentCommunityManager) {
    window.parentCommunityManager.switchClubTab(tab);
  }
}

function searchConnections(query) {
  if (window.parentCommunityManager) {
    window.parentCommunityManager.searchConnections(query);
  }
}

function searchEvents(query) {
  if (window.parentCommunityManager) {
    window.parentCommunityManager.searchEvents(query);
  }
}

function searchClubs(query) {
  if (window.parentCommunityManager) {
    window.parentCommunityManager.searchClubs(query);
  }
}

// Filter events by tab (called from HTML buttons)
function filterEventsByTab(tab) {
  if (window.parentCommunityManager) {
    window.parentCommunityManager.filterEventsByTab(tab);
  }
}

// Filter clubs by tab (called from HTML buttons)
function filterClubsByTab(tab) {
  if (window.parentCommunityManager) {
    window.parentCommunityManager.filterClubsByTab(tab);
  }
}

// ============================================
// PARENT-COMMUNITY-PANEL FUNCTIONS (Card-based layout in panel)
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

  // Load data for the section
  if (window.parentCommunityManager) {
    if (section === 'events') {
      window.parentCommunityManager.loadEvents();
    } else if (section === 'clubs') {
      window.parentCommunityManager.loadClubs();
    }
  }
}

// Toggle connections sub-sections (All, Tutors, Children, Parents)
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

// Search functions for connections subsections
function searchAllConnections(query) {
  console.log('Searching all connections:', query);
  // TODO: Implement search functionality
}

function searchTutorConnections(query) {
  console.log('Searching tutor connections:', query);
  // TODO: Implement search functionality
}

function searchChildrenConnections(query) {
  console.log('Searching children connections:', query);
  // TODO: Implement search functionality
}

function searchParentConnections(query) {
  console.log('Searching parent connections:', query);
  // TODO: Implement search functionality
}

// Search functions for events subsections
function searchJoinedEvents(query) {
  console.log('Searching joined events:', query);
  // TODO: Implement search functionality
}

function searchUpcomingEvents(query) {
  console.log('Searching upcoming events:', query);
  // TODO: Implement search functionality
}

function searchPastEvents(query) {
  console.log('Searching past events:', query);
  // TODO: Implement search functionality
}

// Search functions for clubs subsections
function searchJoinedClubs(query) {
  console.log('Searching joined clubs:', query);
  // TODO: Implement search functionality
}

function searchDiscoverClubs(query) {
  console.log('Searching discover clubs:', query);
  // TODO: Implement search functionality
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

  // IMPORTANT: Fetch data when subsection is toggled
  console.log(`📥 Fetching ${subsection} requests data...`);
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
  const token = localStorage.getItem('token');

  if (!token) {
    console.log('No token found, cannot load request counts');
    return;
  }

  // Get active role from JWT token (e.g., 'parent')
  let activeRole = 'parent';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    activeRole = payload.role || 'parent';
  } catch (e) {
    console.warn('Could not parse role from token, defaulting to parent');
  }

  try {
    // Get connection stats filtered by role/profile_id
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

      // Update total connections count
      const connectionsCount = stats.total_connections || 0;
      const connectionsCountElements = document.querySelectorAll('#connections-count, #connections-total-count');
      connectionsCountElements.forEach(el => {
        el.textContent = connectionsCount;
      });

      // Update total requests count (incoming only for the badge)
      const requestsCountElements = document.querySelectorAll('#requests-count');
      requestsCountElements.forEach(el => {
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
  const token = localStorage.getItem('token');
  const listElement = document.getElementById('sent-requests-list');

  if (!listElement) return;
  if (!token) {
    listElement.innerHTML = '<p class="text-center text-gray-500 py-8">Please log in to view sent requests</p>';
    return;
  }

  // Get active role from JWT token
  let activeRole = 'parent';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    activeRole = payload.role || 'parent';
  } catch (e) {
    console.warn('Could not parse role from token, defaulting to parent');
  }

  listElement.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i><p class="text-gray-500 mt-2">Loading sent requests...</p></div>';

  try {
    // Get outgoing connection requests (status=pending, direction=outgoing - new schema, filtered by role)
    const response = await fetch(`${API_BASE_URL}/api/connections?status=pending&direction=outgoing&role=${activeRole}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const requests = await response.json();

      // Update count in main card (on community panel main view)
      const mainCountElement = document.getElementById('sent-requests-count-main');
      if (mainCountElement) {
        mainCountElement.textContent = requests.length;
      }

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
  const token = localStorage.getItem('token');
  const listElement = document.getElementById('received-requests-list');

  if (!listElement) return;
  if (!token) {
    listElement.innerHTML = '<p class="text-center text-gray-500 py-8">Please log in to view received requests</p>';
    return;
  }

  // Get active role from JWT token
  let activeRole = 'parent';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    activeRole = payload.role || 'parent';
  } catch (e) {
    console.warn('Could not parse role from token, defaulting to parent');
  }

  listElement.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i><p class="text-gray-500 mt-2">Loading received requests...</p></div>';

  try {
    // Get incoming connection requests (status=pending, direction=incoming - new schema, filtered by role)
    const response = await fetch(`${API_BASE_URL}/api/connections?status=pending&direction=incoming&role=${activeRole}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const requests = await response.json();

      // Update count in main card (on community panel main view)
      const mainCountElement = document.getElementById('received-requests-count-main');
      if (mainCountElement) {
        mainCountElement.textContent = requests.length;
      }

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

// Helper to encode user data for onclick handlers (standalone function)
function encodeUserDataForOnclickStandalone(user) {
  return JSON.stringify(user).replace(/"/g, '&quot;');
}

// Message user from request card (standalone function)
function messageUserFromRequest(user) {
  console.log('Opening chat with user from request card:', user);

  // Open chat modal with the target user
  if (typeof openChatModal === 'function') {
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
      is_online: false
    };
    openChatModal(targetUser);
    console.log('Chat modal opened for user:', targetUser);
  } else if (typeof ChatModalManager !== 'undefined' && ChatModalManager.openChatWithUser) {
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

// Create request card HTML
function createRequestCard(request, type) {
  // Determine which user to display (the "other" user)
  // New API schema uses: requested_by, recipient_id, requester_name, recipient_name, etc.
  const currentUserId = getCurrentUserId();
  const isRequester = request.requested_by === currentUserId;

  // For sent requests (type='sent'), we show the recipient
  // For received requests (type='received'), we show the requester
  const otherUser = {
    id: isRequester ? request.recipient_id : request.requested_by,
    name: isRequester ? request.recipient_name : request.requester_name,
    email: isRequester ? request.recipient_email : request.requester_email,
    avatar: isRequester ? request.recipient_profile_picture : request.requester_profile_picture,
    profileType: isRequester ? request.recipient_type : request.requester_type,
    profileId: isRequester ? request.recipient_profile_id : request.requester_profile_id,
    roles: isRequester ? request.recipient_roles : request.requester_roles
  };

  const createdDate = request.requested_at ? new Date(request.requested_at) : null;
  const timeAgo = createdDate ? getTimeAgo(createdDate) : 'Recently';

  // Status for filtering
  const status = 'pending'; // All connecting requests are pending

  const profileBadge = otherUser.profileType
    ? `<span class="inline-block px-2 py-1 text-xs font-medium rounded" style="background: var(--button-bg); color: white;">${otherUser.profileType.charAt(0).toUpperCase() + otherUser.profileType.slice(1)}</span>`
    : '';

  if (type === 'sent') {
    // Sent request card
    return `
      <div class="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all" data-status="${status}">
        <div class="flex items-center gap-3">
          <img src="${otherUser.avatar || '../uploads/system_images/system_profile_pictures/man-user.png'}"
               alt="${otherUser.name}"
               class="w-12 h-12 rounded-full object-cover border-2 border-gray-200">
          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-gray-800 truncate">${otherUser.name}</h4>
            <p class="text-sm text-gray-600 truncate">${otherUser.email}</p>
            <div class="flex items-center gap-2 mt-1">
              ${profileBadge}
              <span class="text-xs text-gray-500">${timeAgo}</span>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <span class="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Pending</span>
            <button onclick="messageUserFromRequest(JSON.parse(this.dataset.user))" data-user="${encodeUserDataForOnclickStandalone(otherUser)}"
                    class="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-all">
              <i class="fas fa-comment mr-1"></i> Message
            </button>
            <button onclick="cancelConnectionRequest(${request.id})"
                    class="px-3 py-1 bg-red-50 text-red-600 text-xs font-medium rounded hover:bg-red-100 transition-all">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;
  } else {
    // Received request card
    return `
      <div class="p-4 border-2 border-green-200 rounded-lg hover:border-green-300 transition-all" data-status="${status}">
        <div class="flex items-center gap-3">
          <img src="${otherUser.avatar || '../uploads/system_images/system_profile_pictures/man-user.png'}"
               alt="${otherUser.name}"
               class="w-12 h-12 rounded-full object-cover border-2 border-green-200">
          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-gray-800 truncate">${otherUser.name}</h4>
            <p class="text-sm text-gray-600 truncate">${otherUser.email}</p>
            <div class="flex items-center gap-2 mt-1">
              ${profileBadge}
              <span class="text-xs text-gray-500">${timeAgo}</span>
            </div>
          </div>
          <div class="flex gap-2">
            <button onclick="messageUserFromRequest(JSON.parse(this.dataset.user))" data-user="${encodeUserDataForOnclickStandalone(otherUser)}"
                    class="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 transition-all">
              <i class="fas fa-comment mr-1"></i> Message
            </button>
            <button onclick="acceptConnectionRequest(${request.id})"
                    class="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded hover:bg-green-600 transition-all">
              <i class="fas fa-check mr-1"></i> Accept
            </button>
            <button onclick="rejectConnectionRequest(${request.id})"
                    class="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded hover:bg-red-600 transition-all">
              <i class="fas fa-times mr-1"></i> Reject
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

// Helper function to get current user ID from token
function getCurrentUserId() {
  try {
    const token = localStorage.getItem('token');
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
  const token = localStorage.getItem('token');

  if (!token) {
    alert('Please log in to accept connections');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}/accept`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      alert('Connection accepted successfully!');
      // Reload received requests and update counts
      await loadReceivedRequests();
      await loadRequestCounts();
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
  const token = localStorage.getItem('token');

  if (!token) {
    alert('Please log in to reject connections');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/connections/${connectionId}/reject`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      alert('Connection request rejected');
      // Reload received requests and update counts
      await loadReceivedRequests();
      await loadRequestCounts();
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
  const token = localStorage.getItem('token');

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
      // Reload sent requests and update counts
      await loadSentRequests();
      await loadRequestCounts();
    } else {
      const error = await response.json();
      alert(`Failed to cancel request: ${error.detail || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error cancelling request:', error);
    alert('Failed to cancel request. Please try again.');
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on the parent profile page
  if (document.getElementById('community-panel')) {
    window.parentCommunityManager = new ParentCommunityManager();
    console.log('✅ Parent Community Manager initialized');
    console.log('✅ Parent Community Panel functions loaded');

    // Load request counts when Requests tab becomes visible
    const requestsMainTab = document.getElementById('requests-main-tab-content');
    if (requestsMainTab) {
      // Create observer to load counts when tab is shown
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (!requestsMainTab.classList.contains('hidden')) {
              loadRequestCounts();
              observer.disconnect(); // Load only once
            }
          }
        });
      });

      observer.observe(requestsMainTab, { attributes: true });

      // If already visible, load immediately
      if (!requestsMainTab.classList.contains('hidden')) {
        loadRequestCounts();
      }
    }
  }
});
