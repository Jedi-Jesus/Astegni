// ============================================
// COMMUNITY MANAGER - Database Integration
// ============================================

// Helper function to get token from localStorage (checks both 'token' and 'access_token')
function getAuthToken() {
  return localStorage.getItem('token') || localStorage.getItem('access_token');
}

// Helper function to safely encode user data for onclick handlers
function encodeUserForOnclick(user) {
  const safeUser = {
    id: user.id || null,
    profileId: user.profileId || null,
    name: (user.name || 'Unknown User'),
    avatar: (user.avatar || ''),
    profileType: (user.profileType || '')
  };
  // Use HTML entity encoding for the JSON string to safely embed in onclick
  return JSON.stringify(safeUser).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

class CommunityManager {
  constructor() {
    // Use global API_BASE_URL or fallback to localhost
    this.API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
    this.modal = null;
    this.currentTab = "followers";
    this.followers = [];
    this.following = [];
    this.clubs = [];
    this.searchQuery = "";
    this.stats = null;
    this.initModal();
    this.initializeBadges(); // Initialize badges to 0 first
    this.loadBadgeCounts(); // Then load badge counts from API
  }

  initModal() {
    this.modal = document.getElementById("communityModal");
    if (this.modal) {
      this.attachEvents();
    }
  }

  initializeBadges() {
    // Set all badges to 0 initially
    const allCountBadge = document.getElementById('all-count');
    const requestsBadge = document.getElementById('requests-badge');
    const connectionsBadge = document.getElementById('connections-badge');
    const receivedCountBadge = document.getElementById('received-count');
    const sentCountBadge = document.getElementById('sent-count');

    if (allCountBadge) {
      allCountBadge.textContent = '0';
      console.log('✓ Initialized all-count badge to 0');
    } else {
      console.warn('⚠ all-count badge element not found');
    }

    if (requestsBadge) {
      requestsBadge.textContent = '0';
      console.log('✓ Initialized requests-badge to 0');
    } else {
      console.warn('⚠ requests-badge element not found');
    }

    if (connectionsBadge) {
      connectionsBadge.textContent = '0';
      console.log('✓ Initialized connections-badge to 0');
    } else {
      console.warn('⚠ connections-badge element not found');
    }

    if (receivedCountBadge) {
      receivedCountBadge.textContent = '0';
      console.log('✓ Initialized received-count badge to 0');
    }

    if (sentCountBadge) {
      sentCountBadge.textContent = '0';
      console.log('✓ Initialized sent-count badge to 0');
    }
  }

  // Get role from JWT token
  getActiveRole() {
    const token = getAuthToken();
    if (!token) return 'student';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || 'student';
    } catch (e) {
      console.warn('Could not parse role from token, defaulting to student');
      return 'student';
    }
  }

  async loadBadgeCounts() {
    try {
      const token = getAuthToken();
      if (!token) {
        console.log('No token found, badge counts will remain at 0');
        return;
      }

      const activeRole = this.getActiveRole();

      // Fetch connection stats with role parameter
      const statsResponse = await fetch(`${this.API_BASE_URL}/api/connections/stats?role=${activeRole}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!statsResponse.ok) {
        console.warn('Failed to fetch connection stats, badge counts will remain at 0');
        return;
      }

      this.stats = await statsResponse.json();

      // Fetch events count with role parameter
      const eventsResponse = await fetch(`${this.API_BASE_URL}/api/events?role=${activeRole}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const eventsData = eventsResponse.ok ? await eventsResponse.json() : { count: 0 };
      const eventsCount = eventsData.count ?? (Array.isArray(eventsData.events) ? eventsData.events.length : 0);

      // Update badge counts in the DOM (no clubs)
      this.updateBadgeCounts(eventsCount);

      // Update profile header stats
      this.updateProfileHeaderStats();

    } catch (error) {
      console.error('Error loading badge counts:', error);
      console.log('Badge counts will remain at 0');
    }
  }

  updateProfileHeaderStats() {
    // Update profile header connection stats
    const profileHeaderRequestsCount = document.getElementById('profile-header-requests-count');
    const profileHeaderConnectionsCount = document.getElementById('profile-header-connections-count');

    if (this.stats) {
      const incomingRequests = this.stats.incoming_requests || 0;
      const outgoingRequests = this.stats.outgoing_requests || 0;
      const totalRequests = incomingRequests + outgoingRequests;
      const totalConnections = this.stats.connected_count || 0;

      if (profileHeaderRequestsCount) {
        profileHeaderRequestsCount.textContent = totalRequests;
        console.log(`✓ Updated profile header requests count to: ${totalRequests}`);
      }

      if (profileHeaderConnectionsCount) {
        profileHeaderConnectionsCount.textContent = totalConnections;
        console.log(`✓ Updated profile header connections count to: ${totalConnections}`);
      }
    } else {
      console.warn('⚠️ Stats not loaded, profile header counts remain at 0');
    }
  }

  updateBadgeCounts(eventsCount) {
    // Calculate total count
    const totalConnections = this.stats ? this.stats.connected_count : 0;
    const incomingRequests = this.stats ? this.stats.incoming_requests : 0;
    const outgoingRequests = this.stats ? this.stats.outgoing_requests : 0;
    const totalRequests = incomingRequests + outgoingRequests;
    const totalCount = totalConnections + totalRequests + eventsCount;

    console.log('📊 Updating badge counts:', {
      totalConnections,
      incomingRequests,
      outgoingRequests,
      totalRequests,
      eventsCount,
      totalCount
    });

    // Update "All" badge
    const allCountBadge = document.getElementById('all-count');
    if (allCountBadge) {
      allCountBadge.textContent = totalCount;
      console.log(`✓ Updated all-count to: ${totalCount}`);
    } else {
      console.warn('⚠ all-count badge element not found during update');
    }

    // Update "Requests" badge (total incoming + outgoing requests)
    const requestsBadge = document.getElementById('requests-badge');
    if (requestsBadge) {
      requestsBadge.textContent = totalRequests;
      console.log(`✓ Updated requests-badge to: ${totalRequests}`);
    } else {
      console.warn('⚠ requests-badge element not found during update');
    }

    // Update "Request Received" tab count (incoming requests)
    const receivedCountBadge = document.getElementById('received-count');
    if (receivedCountBadge) {
      receivedCountBadge.textContent = incomingRequests;
      console.log(`✓ Updated received-count to: ${incomingRequests}`);
    }

    // Update "Request Sent" tab count (outgoing requests)
    const sentCountBadge = document.getElementById('sent-count');
    if (sentCountBadge) {
      sentCountBadge.textContent = outgoingRequests;
      console.log(`✓ Updated sent-count to: ${outgoingRequests}`);
    }

    // Update "Connections" badge (established connections)
    const connectionsBadge = document.getElementById('connections-badge');
    if (connectionsBadge) {
      connectionsBadge.textContent = totalConnections;
      console.log(`✓ Updated connections-badge to: ${totalConnections}`);
    } else {
      console.warn('⚠ connections-badge element not found during update');
    }

    // ============================================
    // UPDATE SIDEBAR COUNT BADGES (NEW!)
    // ============================================

    // Update sidebar "Connections" count badge
    const sidebarConnectionsCount = document.getElementById('connections-count');
    if (sidebarConnectionsCount) {
      sidebarConnectionsCount.textContent = totalConnections;
      console.log(`✓ Updated sidebar connections-count to: ${totalConnections}`);
    } else {
      console.warn('⚠ connections-count badge element not found in sidebar');
    }

    // Update sidebar "Requests" count badge
    const sidebarRequestsCount = document.getElementById('requests-count');
    if (sidebarRequestsCount) {
      sidebarRequestsCount.textContent = totalRequests;
      console.log(`✓ Updated sidebar requests-count to: ${totalRequests}`);
    } else {
      console.warn('⚠ requests-count badge element not found in sidebar');
    }

    // Update sidebar "Events" count badge
    const sidebarEventsCount = document.getElementById('events-count');
    if (sidebarEventsCount) {
      sidebarEventsCount.textContent = eventsCount;
      console.log(`✓ Updated sidebar events-count to: ${eventsCount}`);
    } else {
      console.warn('⚠ events-count badge element not found in sidebar');
    }

    // Store for filter counts
    this.eventsCount = eventsCount;
  }

  attachEvents() {
    // Tab switching
    document.querySelectorAll(".community-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabType = tab.dataset.tab;
        this.switchTab(tabType);
      });
    });

    // Search functionality
    const searchInput = document.querySelector(
      ".community-modal .search-input"
    );
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.filterCommunity(e.target.value);
      });
    }

    // Search functionality for received requests
    const receivedSearchInput = document.getElementById('received-search');
    if (receivedSearchInput) {
      receivedSearchInput.addEventListener("input", (e) => {
        this.searchRequestTab('received', e.target.value);
      });
    }

    // Search functionality for sent requests
    const sentSearchInput = document.getElementById('sent-search');
    if (sentSearchInput) {
      sentSearchInput.addEventListener("input", (e) => {
        this.searchRequestTab('sent', e.target.value);
      });
    }

    // Close button
    const closeBtn = this.modal?.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }

    // Overlay close
    const overlay = this.modal?.querySelector(".modal-overlay");
    if (overlay) {
      overlay.addEventListener("click", () => this.close());
    }
  }

  async open(type = "followers") {
    this.currentTab = type;
    const modal = document.getElementById("communityModal");
    if (modal) {
      modal.classList.add("show");
      modal.style.display = "flex";
      this.updateModalTitle(type);

      // Set active tab
      document.querySelectorAll(".community-tab").forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.tab === type);
      });

      // Load content from database
      await this.loadContent(type);
    }
  }

  close() {
    const modal = document.getElementById("communityModal");
    if (modal) {
      modal.classList.remove("show");
      setTimeout(() => {
        modal.style.display = "none";
      }, 300);
    }
  }

  async switchTab(type) {
    this.currentTab = type;
    document.querySelectorAll(".community-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === type);
    });
    this.searchQuery = ""; // Reset search
    const searchInput = document.querySelector(".community-modal .search-input");
    if (searchInput) searchInput.value = "";

    this.updateModalTitle(type);
    await this.loadContent(type);
  }

  updateModalTitle(type) {
    const title = document.getElementById("communityModalTitle");
    if (title) {
      const titles = {
        followers: "Connections (Incoming)",
        following: "Connections (Outgoing)",
        groups: "Community Groups",
        clubs: "Study Clubs",
      };
      title.textContent = titles[type] || "Community";
    }
  }

  async loadContent(type) {
    const communityList = document.getElementById("communityList");
    if (!communityList) return;

    // Show loading state
    communityList.innerHTML = '<div class="loading-state">Loading...</div>';

    try {
      switch (type) {
        case "followers":
          await this.loadFollowers(communityList);
          break;
        case "following":
          await this.loadFollowing(communityList);
          break;
        case "groups":
          await this.loadGroups(communityList);
          break;
        case "clubs":
          await this.loadClubs(communityList);
          break;
      }
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
      communityList.innerHTML = `
        <div class="error-state">
          <p>Failed to load ${type}. Please try again.</p>
          <button class="btn-primary" onclick="window.communityManager.loadContent('${type}')">Retry</button>
        </div>
      `;
    }
  }

  // Load data for section grids (all, requests, connections)
  async loadSectionGrid(section, category = 'all') {
    const gridId = section === 'all' ? 'allGrid' :
                   section === 'requests' ? 'requestsGrid' :
                   section === 'events' ? 'eventsGrid' :
                   section === 'clubs' ? 'clubsGrid' :
                   'connectionsGrid';

    const grid = document.getElementById(gridId);
    if (!grid) return;

    // Initialize filter counts to 0 for this section
    this.initializeFilterCounts(section);

    // Show loading state
    grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading from database...</div>';

    try {
      const token = getAuthToken();
      if (!token) {
        grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Please log in to view connections</div>';
        return;
      }

      if (section === 'events') {
        await this.loadEventsGrid(grid);
      } else if (section === 'clubs') {
        await this.loadClubsGrid(grid);
      } else {
        await this.loadConnectionsGrid(section, category, grid);
      }
    } catch (error) {
      console.error(`Error loading ${section} grid:`, error);
      grid.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-danger);">
          <p>Failed to load data. Please try again.</p>
          <button onclick="window.communityManager.loadSectionGrid('${section}', '${category}')"
                  style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--button-bg); color: white; border: none; border-radius: 6px; cursor: pointer;">
            Retry
          </button>
        </div>
      `;
    }
  }

  initializeFilterCounts(section) {
    // Initialize all filter counts to 0 for the given section
    const sectionElement = document.getElementById(`${section}-section`);
    if (!sectionElement) return;

    const filterCounts = sectionElement.querySelectorAll('.filter-count[data-role]');
    filterCounts.forEach(countElement => {
      countElement.textContent = '0';
    });
  }

  async loadConnectionsGrid(section, category, grid) {
    const token = getAuthToken();

    let status = '';
    let direction = '';

    // Map section to API parameters (NEW STATUS VALUES)
    if (section === 'requests') {
      status = 'pending';  // NEW: was 'connecting'
      direction = 'incoming'; // Only show incoming requests
    } else if (section === 'connections') {
      status = 'accepted';  // NEW: was 'connected'
      direction = 'all';
    } else if (section === 'all') {
      status = 'accepted'; // NEW: was 'connected' - Show all accepted for "all" section
      direction = 'all';
    }

    // Get current user's active role from JWT token
    let activeRole = null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      activeRole = payload.role; // e.g., 'parent', 'student', 'tutor'
    } catch (e) {
      console.warn('Could not parse role from token');
    }

    // Build query parameters
    let queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    if (direction) queryParams.append('direction', direction);
    // Add role parameter to filter by profile_id instead of user_id
    if (activeRole) queryParams.append('role', activeRole);

    const response = await fetch(`${this.API_BASE_URL}/api/connections?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch connections');
    }

    const connections = await response.json();

    // Filter by category if needed (category filter by user role)
    let filteredConnections = connections;
    if (category !== 'all') {
      // Filter connections based on user's roles (they may have multiple roles)
      filteredConnections = connections.filter(conn => {
        const otherUser = this.getOtherUser(conn);
        const roles = otherUser.roles || [];

        // Map category to role check
        // Note: 'children' is used in parent profile as alias for 'student'
        if (category === 'students' || category === 'student' || category === 'children') {
          return roles.includes('student');
        } else if (category === 'parents' || category === 'parent') {
          return roles.includes('parent');
        } else if (category === 'tutors' || category === 'tutor') {
          return roles.includes('tutor');
        }
        return true;
      });
    }

    // Update filter counts dynamically
    this.updateFilterCounts(section, connections);

    // Display connections
    this.displayConnectionsGrid(grid, filteredConnections, section);
  }

  // Load Request Tab (received or sent)
  async loadRequestTab(tab, category = 'all') {
    // FIXED: Correct grid IDs to match HTML
    const gridId = tab === 'received' ? 'receivedRequestsGrid' : 'sentRequestsGrid';
    const grid = document.getElementById(gridId);

    if (!grid) {
      console.error(`❌ Grid element ${gridId} not found in DOM`);
      return;
    }

    console.log(`✅ Found grid element: ${gridId}`);

    // Initialize filter counts - FIXED: Correct content IDs
    const contentId = tab === 'received' ? 'received-requests-content' : 'sent-requests-content';
    const contentElement = document.getElementById(contentId);
    if (contentElement) {
      const filterCounts = contentElement.querySelectorAll('.filter-count[data-role]');
      filterCounts.forEach(countElement => {
        countElement.textContent = '0';
      });
    }

    // Show loading state
    grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading from database...</div>';

    try {
      const token = getAuthToken();
      if (!token) {
        grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Please log in to view requests</div>';
        return;
      }

      // Determine direction based on tab
      const direction = tab === 'received' ? 'incoming' : 'outgoing';

      // Get current user's active role from JWT token
      let activeRole = null;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        activeRole = payload.role; // e.g., 'parent', 'student', 'tutor'
      } catch (e) {
        console.warn('Could not parse role from token');
      }

      // Build query parameters
      let queryParams = new URLSearchParams();
      queryParams.append('status', 'pending');  // NEW: was 'connecting'
      queryParams.append('direction', direction);
      // Add role parameter to filter by profile_id instead of user_id
      if (activeRole) queryParams.append('role', activeRole);

      const response = await fetch(`${this.API_BASE_URL}/api/connections?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const requests = await response.json();

      // Filter by category if needed
      let filteredRequests = requests;
      if (category !== 'all') {
        filteredRequests = requests.filter(conn => {
          const otherUser = this.getOtherUser(conn);
          const roles = otherUser.roles || [];

          // Note: 'children' is used in parent profile as alias for 'student'
          if (category === 'students' || category === 'student' || category === 'children') {
            return roles.includes('student');
          } else if (category === 'parents' || category === 'parent') {
            return roles.includes('parent');
          } else if (category === 'tutors' || category === 'tutor') {
            return roles.includes('tutor');
          }
          return true;
        });
      }

      // Update filter counts
      this.updateRequestFilterCounts(tab, requests);

      // Display requests
      this.displayRequestsGrid(grid, filteredRequests, tab);

    } catch (error) {
      console.error(`Error loading ${tab} requests:`, error);
      grid.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-danger);">
          <p>Failed to load requests. Please try again.</p>
          <button onclick="window.communityManager.loadRequestTab('${tab}', '${category}')"
                  style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--button-bg); color: white; border: none; border-radius: 6px; cursor: pointer;">
            Retry
          </button>
        </div>
      `;
    }
  }

  updateRequestFilterCounts(tab, allRequests) {
    // Count requests by role
    const counts = {
      all: allRequests.length,
      students: 0,
      parents: 0,
      tutors: 0
    };

    allRequests.forEach(conn => {
      const otherUser = this.getOtherUser(conn);
      const roles = otherUser.roles || [];

      if (roles.includes('student')) counts.students++;
      if (roles.includes('parent')) counts.parents++;
      if (roles.includes('tutor')) counts.tutors++;
    });

    // Update filter count badges
    // Try both possible ID formats (different pages use different naming)
    const possibleIds = tab === 'received'
      ? ['received-content', 'received-requests-content']
      : ['sent-content', 'sent-requests-content'];

    let contentElement = null;
    for (const id of possibleIds) {
      contentElement = document.getElementById(id);
      if (contentElement) break;
    }

    if (contentElement) {
      const filterCounts = contentElement.querySelectorAll('.filter-count[data-role]');
      filterCounts.forEach(countElement => {
        const role = countElement.getAttribute('data-role');

        // Note: 'children' is used in parent profile for students
        if (role === 'all') {
          countElement.textContent = counts.all;
        } else if (role === 'students' || role === 'children') {
          countElement.textContent = counts.students;
        } else if (role === 'parents') {
          countElement.textContent = counts.parents;
        } else if (role === 'tutors') {
          countElement.textContent = counts.tutors;
        }
      });
    }
  }

  displayRequestsGrid(grid, requests, tab) {
    const isReceived = tab === 'received';

    if (requests.length === 0) {
      const emptyMessage = isReceived ? 'No incoming requests' : 'No outgoing requests';
      grid.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">${isReceived ? '📩' : '📤'}</div>
          <p>${emptyMessage}</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = requests.map(conn => {
      const otherUser = this.getOtherUser(conn);

      // Get user role badge
      const primaryRole = otherUser.profileType
        ? otherUser.profileType.charAt(0).toUpperCase() + otherUser.profileType.slice(1)
        : (otherUser.roles || []).includes('student') ? 'Student' :
          (otherUser.roles || []).includes('tutor') ? 'Tutor' :
          (otherUser.roles || []).includes('parent') ? 'Parent' :
          (otherUser.roles || []).includes('admin') ? 'Admin' : 'User';

      return `
        <div class="connection-card" data-connection-id="${conn.id}" data-user-id="${otherUser.id}"
             style="background: var(--card-bg); border-radius: 12px; padding: 1rem; border: 1px solid rgba(var(--border-rgb), 0.1); transition: all 0.2s ease; cursor: default;"
             onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
             onmouseleave="this.style.boxShadow='none'">
          <div class="connection-header" style="position: relative;">
            <img src="${otherUser.avatar || '../uploads/system_images/system_profile_pictures/man-user.png'}"
                 alt="${otherUser.name}"
                 style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; cursor: default;">
            ${otherUser.isOnline ? '<span style="position: absolute; top: 0; right: 0; width: 12px; height: 12px; background: #10b981; border: 2px solid white; border-radius: 50%;"></span>' : ''}
          </div>
          <div class="connection-info" style="margin-top: 0.75rem;">
            <h4 style="font-weight: 600; color: var(--heading); font-size: 0.95rem; margin: 0; cursor: pointer; transition: color 0.2s; user-select: none;"
                onclick="window.communityManager.navigateToProfileByType(${otherUser.profileId}, '${otherUser.profileType || ''}')"
                onmouseover="this.style.color='var(--primary-color, #3b82f6)'"
                onmouseout="this.style.color='var(--heading)'">${otherUser.name}</h4>
            <p style="margin: 0.25rem 0;">
              <span style="font-size: 0.65rem; color: var(--text-muted); margin-right: 0.25rem;">Role</span>
              <span style="display: inline-block; padding: 0.15rem 0.5rem; background: var(--primary-color, #3b82f6); color: white; border-radius: 4px; font-size: 0.7rem; font-weight: 500;">${primaryRole}</span>
            </p>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.5rem 0 0 0;">
              ${otherUser.email || 'No email provided'}
            </p>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.5rem 0 0 0;">
              <i class="fas fa-clock" style="opacity: 0.7; margin-right: 0.25rem;"></i>
              <span>${isReceived ? 'Pending your approval' : 'Awaiting response'}</span>
            </p>
          </div>
          ${isReceived ? `
            <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
              <button onclick="window.communityManager.acceptConnection(${conn.id})"
                      style="flex: 1; padding: 0.5rem; background: var(--button-bg, #3b82f6); color: white; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 500; transition: opacity 0.2s;"
                      onmouseover="this.style.opacity='0.8'"
                      onmouseout="this.style.opacity='1'">
                Accept
              </button>
              <button onclick="window.communityManager.rejectConnection(${conn.id})"
                      style="flex: 1; padding: 0.5rem; background: transparent; color: var(--text-muted); border: 1px solid rgba(var(--border-rgb, 229, 231, 235), 0.3); border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 500; transition: all 0.2s;"
                      onmouseover="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.color='#ef4444'; this.style.borderColor='#ef4444'"
                      onmouseout="this.style.background='transparent'; this.style.color='var(--text-muted)'; this.style.borderColor='rgba(var(--border-rgb, 229, 231, 235), 0.3)'">
                Decline
              </button>
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
              <button onclick="window.communityManager.messageUser(JSON.parse(this.dataset.user))" data-user="${encodeUserForOnclick(otherUser)}"
                      style="flex: 1; padding: 0.5rem; background: var(--button-bg, #3b82f6); color: white; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 500; transition: opacity 0.2s;"
                      onmouseover="this.style.opacity='0.8'"
                      onmouseout="this.style.opacity='1'">
                <i class="fas fa-comment" style="margin-right: 0.25rem;"></i> Message
              </button>
            </div>
          ` : `
            <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
              <button onclick="window.communityManager.messageUser(JSON.parse(this.dataset.user))" data-user="${encodeUserForOnclick(otherUser)}"
                      style="flex: 1; padding: 0.5rem; background: var(--button-bg, #3b82f6); color: white; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 500; transition: opacity 0.2s;"
                      onmouseover="this.style.opacity='0.8'"
                      onmouseout="this.style.opacity='1'">
                <i class="fas fa-comment" style="margin-right: 0.25rem;"></i> Message
              </button>
              <button onclick="window.communityManager.cancelSentRequest(${conn.id})"
                      style="flex: 1; padding: 0.5rem; background: transparent; color: var(--text-muted); border: 1px solid rgba(var(--border-rgb, 229, 231, 235), 0.3); border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 500; transition: all 0.2s;"
                      onmouseover="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.color='#ef4444'; this.style.borderColor='#ef4444'"
                      onmouseout="this.style.background='transparent'; this.style.color='var(--text-muted)'; this.style.borderColor='rgba(var(--border-rgb, 229, 231, 235), 0.3)'">
                <i class="fas fa-times" style="margin-right: 0.25rem;"></i> Cancel
              </button>
            </div>
          `}
        </div>
      `;
    }).join('');
  }

  async cancelSentRequest(connectionId) {
    if (!confirm("Are you sure you want to cancel this connection request?")) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${this.API_BASE_URL}/api/connections/${connectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok || response.status === 204) {
        this.showToast("Request cancelled successfully", "success");
        // Reload the sent requests tab
        await this.loadRequestTab('sent', 'all');
        // Reload badge counts
        await this.loadBadgeCounts();
      } else {
        throw new Error('Failed to cancel request');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      this.showToast("Failed to cancel request", "error");
    }
  }

  async searchRequestTab(tab, query) {
    const gridId = tab === 'received' ? 'receivedGrid' : 'sentGrid';
    const grid = document.getElementById(gridId);

    if (!grid) return;

    try {
      const token = getAuthToken();
      if (!token) {
        grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Please log in to search requests</div>';
        return;
      }

      // Show loading state
      grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';

      // Determine direction based on tab
      const direction = tab === 'received' ? 'incoming' : 'outgoing';

      // Build query parameters
      let queryParams = new URLSearchParams();
      queryParams.append('status', 'pending');  // NEW: was 'connecting'
      queryParams.append('direction', direction);

      const response = await fetch(`${this.API_BASE_URL}/api/connections?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const requests = await response.json();

      // Filter requests by search query
      const filtered = query.trim() === ''
        ? requests
        : requests.filter(conn => {
            const otherUser = this.getOtherUser(conn);
            const searchLower = query.toLowerCase();
            return (
              (otherUser.name && otherUser.name.toLowerCase().includes(searchLower)) ||
              (otherUser.email && otherUser.email.toLowerCase().includes(searchLower)) ||
              (otherUser.roles && otherUser.roles.some(role => role.toLowerCase().includes(searchLower)))
            );
          });

      // Display filtered results
      if (filtered.length === 0) {
        grid.innerHTML = `
          <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <i class="fas fa-search" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
            <p style="font-size: 1rem; font-weight: 500;">No results found for "${query}"</p>
            <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.5rem;">Try different keywords</p>
          </div>
        `;
      } else {
        this.displayRequestsGrid(grid, filtered, tab);
      }

    } catch (error) {
      console.error(`Error searching ${tab} requests:`, error);
      grid.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-danger);">
          <p>Failed to search requests. Please try again.</p>
          <button onclick="window.communityManager.loadRequestTab('${tab}', 'all')"
                  style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--button-bg); color: white; border: none; border-radius: 6px; cursor: pointer;">
            Retry
          </button>
        </div>
      `;
    }
  }

  async loadEventsGrid(grid) {
    const token = getAuthToken();
    const currentUserId = this.getCurrentUserId();
    const activeRole = this.getActiveRole();

    const response = await fetch(`${this.API_BASE_URL}/api/events?role=${activeRole}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }

    const data = await response.json();
    const events = data.events || [];  // Backend already filters, no need to filter again

    if (events.length === 0) {
      grid.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-muted);"><div style="font-size: 3rem; margin-bottom: 1rem;">📅</div><p>No events available</p></div>';
      return;
    }

    grid.innerHTML = events.map(event => {
      const startDate = new Date(event.start_datetime);
      const isOnline = event.is_online || (event.location && event.location.toLowerCase() === 'online');

      // Determine badge text based on backend response
      const isSystemEvent = event.is_system;  // From manage_uploads check
      const isOwnEvent = event.created_by === currentUserId;  // User ID match
      const hasJoined = event.joined_status;  // joined_status boolean from DB

      let badgeText = 'System Event';
      if (isOwnEvent) {
        badgeText = 'Your Event';
      } else if (hasJoined && isSystemEvent) {
        badgeText = 'Participating';  // Joined a system event
      } else if (hasJoined) {
        badgeText = 'Enrolled';  // Joined another tutor's event
      }

      return `
        <div class="event-card">
          ${event.event_picture ? `<img src="${event.event_picture}" alt="${event.title}" class="event-image">` : ''}
          <div class="event-header">
            <h3>${event.title}</h3>
            <span class="event-badge ${isOnline ? 'online' : ''}">${badgeText}</span>
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
              <span>${event.registered_count || 0}/${event.available_seats || 'Unlimited'} registered</span>
            </div>
            ${event.price > 0 ? `
            <div class="event-detail-item">
              <span>💰</span>
              <span>${event.price} ETB</span>
            </div>
            ` : '<div class="event-detail-item"><span>🎁</span><span>Free</span></div>'}
          </div>
          <p class="event-description">${event.description || 'No description available'}</p>
          <div class="event-actions">
            <button class="action-btn" onclick="viewEvent(${event.id})">View Details</button>
            <button class="action-btn primary" onclick="joinEvent(${event.id})">Join Event</button>
          </div>
        </div>
      `;
    }).join('');
  }

  async loadClubsGrid(grid) {
    const token = getAuthToken();
    const currentUserId = this.getCurrentUserId();
    const activeRole = this.getActiveRole();

    const response = await fetch(`${this.API_BASE_URL}/api/clubs?role=${activeRole}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch clubs');
    }

    const data = await response.json();
    const clubs = data.clubs || [];  // Backend already filters, no need to filter again

    if (clubs.length === 0) {
      grid.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-muted);"><div style="font-size: 3rem; margin-bottom: 1rem;">🎭</div><p>No clubs available</p></div>';
      return;
    }

    grid.innerHTML = clubs.map(club => {
      // Determine badge text based on backend response
      const isSystemClub = club.is_system;  // From manage_uploads check
      const isOwnClub = club.created_by === currentUserId;  // User ID match
      const hasJoined = club.joined_status;  // joined_status boolean from DB

      let badgeText = 'System Club';
      if (isOwnClub) {
        badgeText = 'Your Club';
      } else if (hasJoined && isSystemClub) {
        badgeText = 'Member';  // Member of a system club
      } else if (hasJoined) {
        badgeText = 'Joined';  // Joined another tutor's club
      }

      return `
        <div class="club-card">
          ${club.club_picture ? `<img src="${club.club_picture}" alt="${club.title}" class="event-image">` : ''}
          <div class="event-header">
            <h3>${club.title}</h3>
            <span class="club-category">${badgeText}</span>
          </div>
          <div class="event-details">
            <div class="event-detail-item">
              <span>📚</span>
              <span>${club.category || 'General'}</span>
            </div>
            <div class="event-detail-item">
              <span>👥</span>
              <span>${club.current_members || club.member_count || 0}/${club.member_limit || 'Unlimited'} members</span>
            </div>
            ${club.is_paid ? `
            <div class="event-detail-item">
              <span>💰</span>
              <span>${club.membership_fee} ETB</span>
            </div>
            ` : '<div class="event-detail-item"><span>🎁</span><span>Free</span></div>'}
          </div>
          <p class="event-description">${club.description || 'No description available'}</p>
          <div class="event-actions">
            <button class="action-btn" onclick="viewClub(${club.id})">View Details</button>
            <button class="action-btn primary" onclick="joinClub(${club.id})">Join Club</button>
          </div>
        </div>
      `;
    }).join('');
  }

  displayConnectionsGrid(grid, connections, section) {
    if (connections.length === 0) {
      const emptyMessage = section === 'requests' ? 'No requests found' : 'No connections found';
      grid.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <p>${emptyMessage}</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = connections.map(conn => {
      const otherUser = this.getOtherUser(conn);
      const isPending = section === 'requests';

      // Calculate connection duration (API returns connected_at for accepted connections)
      const connectedDate = conn.connected_at ? new Date(conn.connected_at) : null;
      const connectedDays = connectedDate ? Math.floor((new Date() - connectedDate) / (1000 * 60 * 60 * 24)) : 0;
      const connectedText = connectedDays === 0 ? 'Connected today' :
                           connectedDays === 1 ? 'Connected yesterday' :
                           `Connected ${connectedDays} days ago`;

      // Get user role badge - use the role they connected as (profileType)
      // This ensures the badge shows the correct role even for multi-role users
      const primaryRole = otherUser.profileType
        ? otherUser.profileType.charAt(0).toUpperCase() + otherUser.profileType.slice(1)
        : (otherUser.roles || []).includes('student') ? 'Student' :
          (otherUser.roles || []).includes('tutor') ? 'Tutor' :
          (otherUser.roles || []).includes('parent') ? 'Parent' :
          (otherUser.roles || []).includes('admin') ? 'Admin' : 'User';

      return `
        <div class="connection-card" data-connection-id="${conn.id}" data-user-id="${otherUser.id}"
             style="background: var(--card-bg); border-radius: 12px; padding: 1rem; border: 1px solid rgba(var(--border-rgb), 0.1); transition: all 0.2s ease; cursor: default;"
             onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
             onmouseleave="this.style.boxShadow='none'">
          <div class="connection-header" style="position: relative;">
            <img src="${otherUser.avatar || '../uploads/system_images/system_profile_pictures/man-user.png'}"
                 alt="${otherUser.name}"
                 style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; cursor: default;">
            ${otherUser.isOnline ? '<span style="position: absolute; top: 0; right: 0; width: 12px; height: 12px; background: #10b981; border: 2px solid white; border-radius: 50%;"></span>' : ''}
          </div>
          <div class="connection-info" style="margin-top: 0.75rem;">
            <h4 style="font-weight: 600; color: var(--heading); font-size: 0.95rem; margin: 0; cursor: pointer; transition: color 0.2s; user-select: none;"
                onclick="window.communityManager.navigateToProfileByType(${otherUser.profileId}, '${otherUser.profileType || ''}')"
                onmouseover="this.style.color='var(--primary-color, #3b82f6)'"
                onmouseout="this.style.color='var(--heading)'">${otherUser.name}</h4>
            <p style="margin: 0.25rem 0;">
              <span style="font-size: 0.65rem; color: var(--text-muted); margin-right: 0.25rem;">Connected as</span>
              <span style="display: inline-block; padding: 0.15rem 0.5rem; background: var(--primary-color, #3b82f6); color: white; border-radius: 4px; font-size: 0.7rem; font-weight: 500;">${primaryRole}</span>
            </p>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.5rem 0 0 0;">
              ${otherUser.email || 'No email provided'}
            </p>
            ${!isPending && connectedDate ? `
            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.5rem 0 0 0;">
              <i class="fas fa-calendar" style="opacity: 0.7; margin-right: 0.25rem;"></i>
              <span title="${connectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}">${connectedText}</span>
            </p>
            ` : ''}
            ${isPending ? `
            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.5rem 0 0 0;">
              <i class="fas fa-clock" style="opacity: 0.7; margin-right: 0.25rem;"></i>
              <span>Pending request</span>
            </p>
            ` : ''}
          </div>
          ${isPending ? `
            <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
              <button onclick="window.communityManager.acceptConnection(${conn.id})"
                      style="flex: 1; padding: 0.5rem; background: var(--button-bg, #3b82f6); color: white; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 500; transition: opacity 0.2s;"
                      onmouseover="this.style.opacity='0.8'"
                      onmouseout="this.style.opacity='1'">
                Accept
              </button>
              <button onclick="window.communityManager.rejectConnection(${conn.id})"
                      style="flex: 1; padding: 0.5rem; background: transparent; color: var(--text-muted); border: 1px solid rgba(var(--border-rgb, 229, 231, 235), 0.3); border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 500; transition: all 0.2s;"
                      onmouseover="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.color='#ef4444'; this.style.borderColor='#ef4444'"
                      onmouseout="this.style.background='transparent'; this.style.color='var(--text-muted)'; this.style.borderColor='rgba(var(--border-rgb, 229, 231, 235), 0.3)'">
                Decline
              </button>
            </div>
          ` : `
            <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
              <button onclick="window.communityManager.messageUser(JSON.parse(this.dataset.user))" data-user="${encodeUserForOnclick(otherUser)}"
                      style="flex: 1; padding: 0.5rem; background: var(--button-bg, #3b82f6); color: white; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 500; transition: opacity 0.2s;"
                      onmouseover="this.style.opacity='0.8'"
                      onmouseout="this.style.opacity='1'">
                <i class="fas fa-comment" style="margin-right: 0.25rem;"></i> Message
              </button>
            </div>
          `}
        </div>
      `;
    }).join('');
  }

  updateFilterCounts(section, allConnections) {
    // First, determine if we're looking at "connections" section or "all" section or "requests"
    // We need to filter based on connection status
    let connections = allConnections;

    // For the "connections" section, only count those with status "accepted" (NEW: was "connected")
    if (section === 'connections') {
      connections = allConnections.filter(conn => conn.status === 'accepted');
    } else if (section === 'requests') {
      connections = allConnections.filter(conn => conn.status === 'pending');  // NEW: was 'connecting'
    } else if (section === 'all') {
      connections = allConnections.filter(conn => conn.status === 'accepted');
    }

    // Count connections by role (only count connections, not all users)
    const counts = {
      all: connections.length,
      students: 0,
      parents: 0,
      tutors: 0
    };

    connections.forEach(conn => {
      const otherUser = this.getOtherUser(conn);
      // Count by ALL roles the user has (not just the role they connected as)
      // This shows the full picture of what roles exist in your network
      const roles = otherUser.roles || [];

      if (roles.includes('student')) counts.students++;
      if (roles.includes('parent')) counts.parents++;
      if (roles.includes('tutor')) counts.tutors++;
    });

    // Update filter count badges using data-role attribute
    const sectionElement = document.getElementById(`${section}-section`);
    if (sectionElement) {
      const filterCounts = sectionElement.querySelectorAll('.filter-count[data-role]');
      filterCounts.forEach(countElement => {
        const role = countElement.getAttribute('data-role');

        // Set the count based on the role
        // Note: 'children' is used in parent profile for students
        if (role === 'all') {
          countElement.textContent = counts.all;
        } else if (role === 'students' || role === 'children') {
          countElement.textContent = counts.students;
        } else if (role === 'parents') {
          countElement.textContent = counts.parents;
        } else if (role === 'tutors') {
          countElement.textContent = counts.tutors;
        }
      });
    }
  }

  async loadFollowers(container) {
    try {
      const token = getAuthToken();
      if (!token) {
        container.innerHTML = '<div class="empty-state">Please log in to view connections</div>';
        return;
      }

      // Fetch incoming connections (people who connected with you)
      const response = await fetch(`${this.API_BASE_URL}/api/connections?direction=incoming&status=accepted`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }

      const connections = await response.json();
      this.followers = connections;

      if (connections.length === 0) {
        container.innerHTML = '<div class="empty-state">No incoming connections yet</div>';
        return;
      }

      // Render followers
      container.innerHTML = connections
        .map((conn, index) => {
          const otherUser = this.getOtherUser(conn);
          return `
            <div class="follower-card animated-entry" style="animation-delay: ${index * 0.05}s">
              <div class="follower-header">
                <img src="${otherUser.avatar || 'uploads/system_images/system_profile_pictures/man-user.png'}"
                     alt="${otherUser.name}"
                     class="follower-avatar">
                ${otherUser.isOnline ? '<span class="online-badge"></span>' : ""}
              </div>
              <div class="follower-info">
                <h4>${otherUser.name}</h4>
                <p>${otherUser.email || ''}</p>
              </div>
              <div class="follower-actions">
                <button class="btn-connect" onclick="window.communityManager.acceptConnection(${conn.id})">
                  Accept
                </button>
                <button class="btn-disconnect" onclick="window.communityManager.rejectConnection(${conn.id})">
                  Decline
                </button>
              </div>
            </div>
          `;
        })
        .join("");
    } catch (error) {
      console.error('Error loading followers:', error);
      container.innerHTML = '<div class="error-state">Failed to load incoming connections</div>';
    }
  }

  async loadFollowing(container) {
    try {
      const token = getAuthToken();
      if (!token) {
        container.innerHTML = '<div class="empty-state">Please log in to view connections</div>';
        return;
      }

      // Fetch outgoing connections (people you connected with)
      const response = await fetch(`${this.API_BASE_URL}/api/connections?direction=outgoing&status=accepted`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }

      const connections = await response.json();
      this.following = connections;

      if (connections.length === 0) {
        container.innerHTML = '<div class="empty-state">No outgoing connections yet</div>';
        return;
      }

      // Render following
      container.innerHTML = connections
        .map((conn, index) => {
          const otherUser = this.getOtherUser(conn);
          return `
            <div class="follower-card animated-entry" style="animation-delay: ${index * 0.05}s">
              <div class="follower-header">
                <img src="${otherUser.avatar || 'uploads/system_images/system_profile_pictures/man-user.png'}"
                     alt="${otherUser.name}"
                     class="follower-avatar">
                ${otherUser.isOnline ? '<span class="online-badge"></span>' : ""}
              </div>
              <div class="follower-info">
                <h4>${otherUser.name}</h4>
                <p>${otherUser.email || ''}</p>
              </div>
              <div class="follower-actions">
                <button class="btn-disconnect" onclick="window.communityManager.disconnectUser(${conn.id})">
                  Disconnect
                </button>
                <button class="btn-connect" onclick="window.communityManager.messageUser(JSON.parse(this.dataset.user))" data-user="${encodeUserForOnclick(otherUser)}">
                  Message
                </button>
              </div>
            </div>
          `;
        })
        .join("");
    } catch (error) {
      console.error('Error loading following:', error);
      container.innerHTML = '<div class="error-state">Failed to load outgoing connections</div>';
    }
  }

  async loadGroups(container) {
    // Groups functionality - using events from database
    try {
      const token = getAuthToken();
      const currentUserId = this.getCurrentUserId();
      const activeRole = this.getActiveRole();

      const response = await fetch(`${this.API_BASE_URL}/api/events?role=${activeRole}`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      const events = data.events || [];  // Backend already filters

      if (events.length === 0) {
        container.innerHTML = '<div class="empty-state">No community events available</div>';
        return;
      }

      container.innerHTML = events.map(event => {
        const startDate = new Date(event.start_datetime);
        const isOnline = event.is_online || (event.location && event.location.toLowerCase() === 'online');

        // Determine badge text based on backend response
        const isSystemEvent = event.is_system;  // From manage_uploads check
        const isOwnEvent = event.created_by === currentUserId;  // User ID match
        const hasJoined = event.joined_status;  // joined_status boolean from DB

        let badgeText = 'System Event';
        if (isOwnEvent) {
          badgeText = 'Your Event';
        } else if (hasJoined && isSystemEvent) {
          badgeText = 'Participating';  // Joined a system event
        } else if (hasJoined) {
          badgeText = 'Enrolled';  // Joined another tutor's event
        }

        return `
          <div class="event-card">
            ${event.event_picture ? `<img src="${event.event_picture}" alt="${event.title}" class="event-image">` : ''}
            <div class="event-header">
              <h3>${event.title}</h3>
              <span class="event-badge ${isOnline ? 'online' : ''}">${badgeText}</span>
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
                <span>${event.registered_count || 0}/${event.available_seats || 'Unlimited'} registered</span>
              </div>
              ${event.price > 0 ? `
              <div class="event-detail-item">
                <span>💰</span>
                <span>${event.price} ETB</span>
              </div>
              ` : '<div class="event-detail-item"><span>🎁</span><span>Free</span></div>'}
            </div>
            <p class="event-description">${event.description || 'No description available'}</p>
            <div class="event-actions">
              <button class="action-btn" onclick="viewEvent(${event.id})">View Details</button>
              <button class="action-btn primary" onclick="joinEvent(${event.id})">Join Event</button>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Error loading events:', error);
      container.innerHTML = '<div class="error-state">Failed to load community events</div>';
    }
  }

  async loadClubs(container) {
    try {
      const token = getAuthToken();
      const currentUserId = this.getCurrentUserId();

      const response = await fetch(`${this.API_BASE_URL}/api/clubs`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });

      if (!response.ok) {
        throw new Error('Failed to fetch clubs');
      }

      const data = await response.json();
      const clubs = data.clubs || [];  // Backend already filters

      this.clubs = clubs;

      if (clubs.length === 0) {
        container.innerHTML = '<div class="empty-state">No study clubs available</div>';
        return;
      }

      container.innerHTML = clubs.map(club => {
        // Determine badge text based on backend response
        const isSystemClub = club.is_system;  // From manage_uploads check
        const isOwnClub = club.created_by === currentUserId;  // User ID match
        const hasJoined = club.joined_status;  // joined_status boolean from DB

        let badgeText = 'System Club';
        if (isOwnClub) {
          badgeText = 'Your Club';
        } else if (hasJoined && isSystemClub) {
          badgeText = 'Member';  // Member of a system club
        } else if (hasJoined) {
          badgeText = 'Joined';  // Joined another tutor's club
        }

        return `
          <div class="club-card">
            ${club.club_picture ? `<img src="${club.club_picture}" alt="${club.title}" class="event-image">` : ''}
            <div class="event-header">
              <h3>${club.title}</h3>
              <span class="club-category">${badgeText}</span>
            </div>
            <div class="event-details">
              <div class="event-detail-item">
                <span>📚</span>
                <span>${club.category || 'General'}</span>
              </div>
              <div class="event-detail-item">
                <span>👥</span>
                <span>${club.current_members || club.member_count || 0}/${club.member_limit || 'Unlimited'} members</span>
              </div>
              ${club.is_paid ? `
              <div class="event-detail-item">
                <span>💰</span>
                <span>${club.membership_fee} ETB</span>
              </div>
              ` : '<div class="event-detail-item"><span>🎁</span><span>Free</span></div>'}
            </div>
            <p class="event-description">${club.description || 'No description available'}</p>
            <div class="event-actions">
              <button class="action-btn" onclick="viewClub(${club.id})">View Details</button>
              <button class="action-btn primary" onclick="joinClub(${club.id})">Join Club</button>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Error loading clubs:', error);
      container.innerHTML = '<div class="error-state">Failed to load study clubs</div>';
    }
  }

  filterCommunity(searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    const cards = document.querySelectorAll('.follower-card, .group-card, .club-card');

    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      if (text.includes(searchLower)) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  getOtherUser(connection) {
    const currentUserId = this.getCurrentUserId();

    // UPDATED SCHEMA: requested_by, requester_type, recipient_id, recipient_type, requester_profile_id, recipient_profile_id
    if (connection.requested_by === currentUserId) {
      // Other user is the recipient
      return {
        id: connection.recipient_id,
        profileId: connection.recipient_profile_id,  // NEW: Direct profile ID from database
        name: connection.recipient_name || 'Unknown User',
        email: connection.recipient_email || '',
        avatar: connection.recipient_profile_picture || null,
        roles: connection.recipient_roles || [],  // May not be provided by API
        profileType: connection.recipient_type || null,  // Role they connected as
        isOnline: false
      };
    } else {
      // Other user is the requester
      return {
        id: connection.requested_by,
        profileId: connection.requester_profile_id,  // NEW: Direct profile ID from database
        name: connection.requester_name || 'Unknown User',
        email: connection.requester_email || '',
        avatar: connection.requester_profile_picture || null,
        roles: connection.requester_roles || [],  // May not be provided by API
        profileType: connection.requester_type || null,  // Role they connected as
        isOnline: false
      };
    }
  }

  getCurrentUserId() {
    try {
      const token = getAuthToken();
      if (!token) return null;

      const payload = JSON.parse(atob(token.split('.')[1]));
      // JWT tokens use 'sub' for subject (user ID), not 'id'
      return parseInt(payload.sub) || null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  async acceptConnection(connectionId) {
    try {
      const token = getAuthToken();
      const response = await fetch(`${this.API_BASE_URL}/api/connections/${connectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'accepted' })  // NEW: was 'connected'
      });

      if (response.ok) {
        this.showToast("✅ Connection accepted!", "success");
        await this.loadContent(this.currentTab);
        // Reload badge counts to update profile header stats
        await this.loadBadgeCounts();
      } else {
        throw new Error('Failed to accept connection');
      }
    } catch (error) {
      console.error('Error accepting connection:', error);
      this.showToast("❌ Failed to accept connection", "error");
    }
  }

  async rejectConnection(connectionId) {
    try {
      const token = getAuthToken();
      const response = await fetch(`${this.API_BASE_URL}/api/connections/${connectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'rejected' })  // NEW: was 'connection_failed'
      });

      if (response.ok) {
        this.showToast("Connection declined", "info");
        await this.loadContent(this.currentTab);
        // Reload badge counts to update profile header stats
        await this.loadBadgeCounts();
      } else {
        throw new Error('Failed to reject connection');
      }
    } catch (error) {
      console.error('Error rejecting connection:', error);
      this.showToast("❌ Failed to decline connection", "error");
    }
  }

  async disconnectUser(connectionId) {
    if (!confirm("Are you sure you want to disconnect from this user?")) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${this.API_BASE_URL}/api/connections/${connectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'disconnect' })
      });

      if (response.ok) {
        this.showToast("👋 Disconnected successfully", "info");
        await this.loadContent(this.currentTab);
        // Reload badge counts to update profile header stats
        await this.loadBadgeCounts();
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      this.showToast("❌ Failed to disconnect", "error");
    }
  }

  messageUser(userIdOrObject, userName = null, userAvatar = null, userProfileId = null, userProfileType = null) {
    // Support both object and individual parameters for backward compatibility
    let userId, name, avatar, profileId, profileType;

    if (typeof userIdOrObject === 'object' && userIdOrObject !== null) {
      // Called with a single object
      userId = userIdOrObject.id;
      name = userIdOrObject.name;
      avatar = userIdOrObject.avatar;
      profileId = userIdOrObject.profileId;
      profileType = userIdOrObject.profileType;
    } else {
      // Called with individual parameters
      userId = userIdOrObject;
      name = userName;
      avatar = userAvatar;
      profileId = userProfileId;
      profileType = userProfileType;
    }

    console.log('Message user:', userId, name, avatar, profileId, profileType);

    // Close the community modal
    if (typeof closeCommunityModal === 'function') {
      closeCommunityModal();
    } else {
      // Fallback: manually close the modal
      const communityModal = document.getElementById('communityModal');
      if (communityModal) {
        communityModal.classList.add('hidden');
        communityModal.style.display = 'none';
        document.body.style.overflow = '';
      }
    }

    // Open chat modal with the target user
    if (typeof openChatModal === 'function') {
      const targetUser = {
        id: userId,
        user_id: userId,
        profile_id: profileId,
        full_name: name,
        name: name,
        profile_picture: avatar,
        avatar: avatar,
        role: profileType,
        profile_type: profileType,
        is_online: false
      };
      openChatModal(targetUser);
    } else {
      console.error('openChatModal function not found');
      this.showToast("Chat feature not available", "error");
    }
  }

  async joinEvent(eventId) {
    this.showToast("✅ Event registration coming soon!", "info");
    console.log('Join event:', eventId);
  }

  async viewClubDetails(clubId) {
    this.showToast("📖 Club details coming soon!", "info");
    console.log('View club:', clubId);
  }

  // Search connections from database
  async searchConnections(query, section) {
    const gridId = section === 'all' ? 'allGrid' :
                   section === 'requests' ? 'requestsGrid' :
                   'connectionsGrid';

    const grid = document.getElementById(gridId);
    if (!grid) return;

    try {
      const token = getAuthToken();
      if (!token) {
        grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Please log in to search connections</div>';
        return;
      }

      // Show loading state
      grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';

      // Determine API parameters based on section (NEW STATUS VALUES)
      let status = '';
      let direction = '';

      if (section === 'requests') {
        status = 'pending';  // NEW: was 'connecting'
        direction = 'incoming';
      } else if (section === 'connections') {
        status = 'accepted';  // NEW: was 'connected'
        direction = 'all';
      } else if (section === 'all') {
        status = 'accepted';  // NEW: was 'connected'
        direction = 'all';
      }

      // Build query parameters
      let queryParams = new URLSearchParams();
      if (status) queryParams.append('status', status);
      if (direction) queryParams.append('direction', direction);

      const response = await fetch(`${this.API_BASE_URL}/api/connections?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }

      const connections = await response.json();

      // Filter connections by search query
      const filtered = query.trim() === ''
        ? connections
        : connections.filter(conn => {
            const otherUser = this.getOtherUser(conn);
            const searchLower = query.toLowerCase();
            return (
              (otherUser.name && otherUser.name.toLowerCase().includes(searchLower)) ||
              (otherUser.email && otherUser.email.toLowerCase().includes(searchLower)) ||
              (otherUser.roles && otherUser.roles.some(role => role.toLowerCase().includes(searchLower)))
            );
          });

      // Display filtered results
      if (filtered.length === 0) {
        grid.innerHTML = `
          <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <i class="fas fa-search" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
            <p style="font-size: 1rem; font-weight: 500;">No results found for "${query}"</p>
            <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.5rem;">Try different keywords</p>
          </div>
        `;
      } else {
        this.displayConnectionsGrid(grid, filtered, section);
      }

    } catch (error) {
      console.error(`Error searching ${section}:`, error);
      grid.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-danger);">
          <p>Failed to search connections. Please try again.</p>
          <button onclick="window.communityManager.loadSectionGrid('${section}', 'all')"
                  style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--button-bg); color: white; border: none; border-radius: 6px; cursor: pointer;">
            Retry
          </button>
        </div>
      `;
    }
  }

  showToast(message, type = 'info') {
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast(message, type);
    } else {
      console.log(`[${type}] ${message}`);
      alert(message);
    }
  }

  // Get the appropriate view profile URL based on user roles
  getViewProfileUrl(userId, roles) {
    // Priority order: student > tutor > parent > admin
    if (roles.includes('student')) {
      return `../view-profiles/view-student.html?id=${userId}`;
    } else if (roles.includes('tutor')) {
      return `../view-profiles/view-tutor.html?id=${userId}`;
    } else if (roles.includes('parent')) {
      return `../view-profiles/view-parent.html?id=${userId}`;
    } else if (roles.includes('admin')) {
      return `../view-profiles/view-admin.html?id=${userId}`;
    } else {
      // Default fallback
      return `../view-profiles/view-student.html?id=${userId}`;
    }
  }

  // Navigate to the appropriate profile page (legacy method using all roles)
  navigateToProfile(userId, roles) {
    const profileUrl = this.getViewProfileUrl(userId, roles);
    console.log(`🔗 Navigating to profile: ${profileUrl}`);

    // Navigate to the profile page
    window.location.href = profileUrl;
  }

  // Navigate to profile based on the specific profileType they connected as
  // Use profileId (tutor_profile.id, student_profile.id, etc.) not user_id
  /**
   * Navigate to user profile based on profile ID and profile type
   * @param {number} profileId - Profile ID (tutor_profiles.id, student_profiles.id, etc.)
   * @param {string} profileType - Profile type ('student', 'tutor', 'parent', 'admin')
   */
  navigateToProfileByType(profileId, profileType) {
    console.log(`🔍 navigateToProfileByType called - profileId: ${profileId}, profileType: ${profileType}`);

    let profileUrl;

    // Use profileId directly - no conversion needed!
    if (profileType === 'student') {
      profileUrl = `../view-profiles/view-student.html?id=${profileId}`;
    } else if (profileType === 'tutor') {
      profileUrl = `../view-profiles/view-tutor.html?id=${profileId}`;
    } else if (profileType === 'parent') {
      profileUrl = `../view-profiles/view-parent.html?id=${profileId}`;
    } else if (profileType === 'admin') {
      profileUrl = `../view-profiles/view-admin.html?id=${profileId}`;
    } else {
      // Fallback to default
      profileUrl = `../view-profiles/view-student.html?id=${profileId}`;
    }

    console.log(`➡️ Navigating to ${profileType} profile: ${profileUrl}`);
    window.location.href = profileUrl;
  }
}
