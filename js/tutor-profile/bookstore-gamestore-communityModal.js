        // ============================================
        //   BOOKSTORE WIDGET - FADE IN/OUT ANIMATION
        // ============================================
        (function () {
            const bookstoreTitles = [
                { icon: '📖', text: 'Educational Books', emoji: '📚' },
                { icon: '📚', text: 'Fiction & Novels', emoji: '📖' },
                { icon: '🔬', text: 'Science Textbooks', emoji: '🧪' },
                { icon: '📐', text: 'Mathematics Books', emoji: '➗' },
                { icon: '🔥', text: 'Trending Books', emoji: '🔥' },
                { icon: '💰', text: 'Special Discounts', emoji: '🏷️' },
                { icon: '🎁', text: 'Bundle Deals', emoji: '📦' },
                { icon: '✨', text: 'Coming Soon!', emoji: '🎉' }
            ];

            let currentBookIndex = 0;
            const bookstoreTitleContainer = document.querySelector('.bookstore-title-animated');
            const bookstoreIcon = document.querySelector('.bookstore-icon');

            if (bookstoreTitleContainer && bookstoreIcon) {
                const titleElement = bookstoreTitleContainer.querySelector('.bookstore-title');

                function animateBookstoreTitle() {
                    // Fade out
                    titleElement.style.opacity = '0';
                    titleElement.style.transform = 'translateY(-10px)';

                    setTimeout(() => {
                        // Update content
                        currentBookIndex = (currentBookIndex + 1) % bookstoreTitles.length;
                        const currentTitle = bookstoreTitles[currentBookIndex];
                        titleElement.textContent = currentTitle.text;
                        bookstoreIcon.textContent = currentTitle.icon;

                        // Fade in
                        titleElement.style.transform = 'translateY(10px)';
                        setTimeout(() => {
                            titleElement.style.opacity = '1';
                            titleElement.style.transform = 'translateY(0)';
                        }, 50);
                    }, 600);
                }

                // Start animation every 3 seconds
                setInterval(animateBookstoreTitle, 3000);
            }
        })();

        // ============================================
        //   GAMESTORE WIDGET - FADE IN/OUT ANIMATION
        // ============================================
        (function () {
            const gamestoreTitles = [
                { icon: '🎮', text: 'Educational Games', emoji: '🎮' },
                { icon: '🧮', text: 'Puzzle Games', emoji: '🧩' },
                { icon: '🎯', text: 'Strategy Games', emoji: '♟️' },
                { icon: '🏆', text: 'Top Rated Games', emoji: '⭐' },
                { icon: '🔥', text: 'Trending Games', emoji: '🔥' },
                { icon: '💰', text: 'Special Discounts', emoji: '🏷️' },
                { icon: '🎁', text: 'Bundle Deals', emoji: '📦' },
                { icon: '✨', text: 'Coming Soon!', emoji: '🎉' }
            ];

            let currentGameIndex = 0;
            const gamestoreTitleContainer = document.querySelector('.gamestore-title-animated');
            const gamestoreIcon = document.querySelector('.gamestore-icon');

            if (gamestoreTitleContainer && gamestoreIcon) {
                const titleElement = gamestoreTitleContainer.querySelector('.gamestore-title');

                function animateGamestoreTitle() {
                    // Fade out
                    titleElement.style.opacity = '0';
                    titleElement.style.transform = 'translateY(-10px)';

                    setTimeout(() => {
                        // Update content
                        currentGameIndex = (currentGameIndex + 1) % gamestoreTitles.length;
                        const currentTitle = gamestoreTitles[currentGameIndex];
                        titleElement.textContent = currentTitle.text;
                        gamestoreIcon.textContent = currentTitle.icon;

                        // Fade in
                        titleElement.style.transform = 'translateY(10px)';
                        setTimeout(() => {
                            titleElement.style.opacity = '1';
                            titleElement.style.transform = 'translateY(0)';
                        }, 50);
                    }, 600);
                }

                // Start animation every 3 seconds
                setInterval(animateGamestoreTitle, 3000);
            }
        })();

        // ============================================
        // COMMUNITY MODAL: INITIALIZATION & FUNCTIONS
        // ============================================

        // Initialize CommunityManager instance
        let communityManager;

        document.addEventListener('DOMContentLoaded', function () {
            communityManager = new CommunityManager();
            console.log('✅ CommunityManager initialized for tutor profile');
        });

        // ============================================
        // COMMUNITY MODAL: OPEN/CLOSE FUNCTIONS
        // ============================================

        function openCommunityModal() {
            const modal = document.getElementById('communityModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';

                // Load connections by default
                if (communityManager) {
                    communityManager.loadSectionGrid('connections', 'all');
                }
            }
        }

        function closeCommunityModal() {
            const modal = document.getElementById('communityModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        }

        // Close modal on ESC key
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                const communityModal = document.getElementById('communityModal');
                if (communityModal && !communityModal.classList.contains('hidden')) {
                    closeCommunityModal();
                }
            }
        });

        // ============================================
        // COMMUNITY MODAL: MAIN SECTION SWITCHING
        // ============================================

        function switchCommunityMainSection(sectionName) {
            console.log('Switching to section:', sectionName);

            // Update sidebar menu active state
            const menuItems = document.querySelectorAll('.community-menu .menu-item');
            menuItems.forEach(item => {
                if (item.getAttribute('data-section') === sectionName) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            // Update modal title
            const titleElement = document.getElementById('communityModalTitle');
            if (titleElement) {
                const titles = {
                    'connections': 'Connections',
                    'requests': 'Requests',
                    'events': 'Events',
                    'clubs': 'Clubs'
                };
                titleElement.textContent = titles[sectionName] || 'Community';
            }

            // Update sections visibility
            const sections = document.querySelectorAll('.community-section');
            sections.forEach(section => {
                if (section.id === sectionName + '-section') {
                    section.classList.remove('hidden');
                    section.classList.add('active');
                } else {
                    section.classList.add('hidden');
                    section.classList.remove('active');
                }
            });

            // Load data for the section
            if (communityManager) {
                if (sectionName === 'connections') {
                    communityManager.loadSectionGrid('connections', 'all');
                } else if (sectionName === 'requests') {
                    communityManager.loadSectionGrid('requests');
                } else if (sectionName === 'events') {
                    communityManager.loadSectionGrid('events');
                } else if (sectionName === 'clubs') {
                    communityManager.loadSectionGrid('clubs');
                }
            }
        }

        // ============================================
        // CONNECTIONS: TAB FILTERING
        // ============================================

        function filterConnectionsBy(category) {
            console.log('Filtering connections by:', category);

            // Update filter buttons active state
            const filterBtns = document.querySelectorAll('#connections-section .filter-btn');
            filterBtns.forEach(btn => {
                if (btn.getAttribute('data-filter') === category) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Load connections with category filter
            if (communityManager) {
                communityManager.loadSectionGrid('connections', category);
            }
        }

        function searchConnections(query) {
            console.log('Searching connections:', query);
            if (communityManager) {
                communityManager.searchConnections(query, 'connections');
            }
        }

        // ============================================
        // EVENTS: TAB FILTERING
        // ============================================

        function filterEventsBy(filterType) {
            console.log('Filtering events by:', filterType);

            // Update filter buttons active state
            const filterBtns = document.querySelectorAll('#events-section .filter-btn');
            filterBtns.forEach(btn => {
                if (btn.getAttribute('data-filter') === filterType) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // TODO: Implement event filtering by type (past/upcoming/joined)
            // For now just reload all events
            if (communityManager) {
                communityManager.loadSectionGrid('events');
            }
        }

        function searchEvents(query) {
            console.log('Searching events:', query);
            // TODO: Implement event search
        }

        // ============================================
        // CLUBS: TAB FILTERING
        // ============================================

        function filterClubsBy(filterType) {
            console.log('Filtering clubs by:', filterType);

            // Update filter buttons active state
            const filterBtns = document.querySelectorAll('#clubs-section .filter-btn');
            filterBtns.forEach(btn => {
                if (btn.getAttribute('data-filter') === filterType) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // TODO: Implement club filtering by type (discover/joined)
            // For now just reload all clubs
            if (communityManager) {
                communityManager.loadSectionGrid('clubs');
            }
        }

        function searchClubs(query) {
            console.log('Searching clubs:', query);
            // TODO: Implement club search
        }

        // ============================================
        // PLACEHOLDER FUNCTIONS
        // ============================================

        function openAddConnectionModal() {
            alert('Add Connection feature coming soon!');
            // TODO: Implement add connection modal
        }

        function viewEvent(eventId) {
            console.log('View event:', eventId);
            alert('Event details coming soon!');
        }

        function joinEvent(eventId) {
            console.log('Join event:', eventId);
            alert('Join event feature coming soon!');
        }

        function viewClub(clubId) {
            console.log('View club:', clubId);
            alert('Club details coming soon!');
        }

        function joinClub(clubId) {
            console.log('Join club:', clubId);
            alert('Join club feature coming soon!');
        }

        // ============================================
        // COMMUNITY PANEL CARD CLICK FUNCTIONS
        // ============================================

        // Switch main community tabs (Connections, Events, Clubs, Requests)
        function switchCommunityMainTab(section) {
            console.log('Switching to main section:', section);

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
        }

        // Toggle connections sub-sections (All, Students, Parents, Tutors)
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
            const requestCards = document.querySelectorAll('.requests-subsection').length > 0
                ? document.querySelectorAll('#requests-main-tab-content > div:first-child > div')
                : [];

            requestCards.forEach((card, index) => {
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
        }

        // Search functions for connections subsections
        function searchAllConnections(query) {
            console.log('Searching all connections:', query);
            // TODO: Implement search functionality
        }

        function searchStudentConnections(query) {
            console.log('Searching student connections:', query);
            // TODO: Implement search functionality
        }

        function searchParentConnections(query) {
            console.log('Searching parent connections:', query);
            // TODO: Implement search functionality
        }

        function searchTutorConnections(query) {
            console.log('Searching tutor connections:', query);
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

        console.log('✅ Community Modal: Fully initialized with sidebar navigation, database integration, and dynamic loading');
        console.log('✅ Community Panel: Card click functions loaded');
   