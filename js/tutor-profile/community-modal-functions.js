
    // Community Modal Functions         
    // Generic Modal Functions (for coming-soon and other modals)
        function openModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
        }

        function closeModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
            }
        }

        // Open Community Modal with optional section parameter
        function openCommunityModal(section = 'all') {
            const modal = document.getElementById('communityModal');
            if (modal) {
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';

                // Switch to the specified section
                if (section) {
                    switchCommunitySection(section);
                }
            }
        }

        // Close Community Modal
        function closeCommunityModal() {
            const modal = document.getElementById('communityModal');
            if (modal) {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
            }
        }

        // Switch Community Section (All, Requests, Connections, Events, Clubs)
        function switchCommunitySection(section) {
            const modal = document.getElementById('communityModal');

            // Remove active class from all menu items
            const menuItems = document.querySelectorAll('.community-menu .menu-item');
            menuItems.forEach(item => item.classList.remove('active'));

            // Hide ALL sections first - ensure they're really hidden
            const sections = document.querySelectorAll('.community-section');
            sections.forEach(s => {
                s.classList.add('hidden');
                s.classList.remove('active');
                s.style.display = 'none'; // Force hide with inline style
            });

            // Remove all section-specific classes from modal
            modal.classList.remove('events-active', 'clubs-active');

            // Add section-specific class for Events/Clubs
            if (section === 'events') {
                modal.classList.add('events-active');
            } else if (section === 'clubs') {
                modal.classList.add('clubs-active');
            }

            // Activate the selected menu item and section
            const activeMenuItem = document.querySelector(`.menu-item[onclick*="${section}"]`);
            if (activeMenuItem) {
                activeMenuItem.classList.add('active');
            }

            // Show ONLY the active section
            const activeSection = document.getElementById(`${section}-section`);
            if (activeSection) {
                activeSection.classList.remove('hidden');
                activeSection.classList.add('active');
                activeSection.style.display = 'flex'; // Force show with inline style
            }

            // Load data only for sections that need it (not events/clubs)
            if (section === 'all' || section === 'connections') {
                loadCommunityData(section);
            } else if (section === 'requests') {
                // For requests section, load the default "received" tab
                if (window.communityManager) {
                    window.communityManager.loadRequestTab('received', 'all');
                }
            }
        }

        // Switch Request Tab (received/sent)
        function switchRequestTab(tab) {
            // Update tab buttons
            const tabBtns = document.querySelectorAll('.request-tab-btn');
            tabBtns.forEach(btn => {
                const isActive = btn.dataset.tab === tab;
                if (isActive) {
                    btn.style.background = 'var(--button-bg)';
                    btn.style.color = 'white';
                    btn.style.border = 'none';
                } else {
                    btn.style.background = 'transparent';
                    btn.style.color = 'var(--text)';
                    btn.style.border = '1px solid rgba(var(--border-rgb), 0.3)';
                }
                btn.classList.toggle('active', isActive);
            });

            // Hide all request content sections
            document.getElementById('received-content').classList.add('hidden');
            document.getElementById('sent-content').classList.add('hidden');

            // Show the selected content
            const contentId = tab === 'received' ? 'received-content' : 'sent-content';
            document.getElementById(contentId).classList.remove('hidden');

            // Load data for the selected tab using communityManager
            if (window.communityManager) {
                window.communityManager.loadRequestTab(tab, 'all');
            }
        }

        // Filter Community by category (section, category)
        function filterCommunity(section, category) {
            // Handle request tabs separately
            if (section === 'received' || section === 'sent') {
                // Update active filter button within the content element
                const contentElement = document.getElementById(`${section}-content`);
                if (contentElement) {
                    const filterBtns = contentElement.querySelectorAll('.filter-btn:not(.add-filter-btn)');
                    filterBtns.forEach(btn => btn.classList.remove('active'));

                    const activeBtn = Array.from(filterBtns).find(btn =>
                        btn.onclick && btn.onclick.toString().includes(`'${category}'`)
                    );
                    if (activeBtn) {
                        activeBtn.classList.add('active');
                    }
                }

                // Load filtered request data
                if (window.communityManager) {
                    window.communityManager.loadRequestTab(section, category);
                }
                return;
            }

            // Update active filter button for other sections
            const sectionElement = document.getElementById(`${section}-section`);
            if (sectionElement) {
                const filterBtns = sectionElement.querySelectorAll('.filter-btn:not(.add-filter-btn)');
                filterBtns.forEach(btn => btn.classList.remove('active'));

                const activeBtn = Array.from(filterBtns).find(btn =>
                    btn.onclick && btn.onclick.toString().includes(`'${category}'`)
                );
                if (activeBtn) {
                    activeBtn.classList.add('active');
                }
            }

            // Load filtered data for other sections
            loadCommunityData(section, category);
        }

        // Load Community Data (with optional category filter)
        function loadCommunityData(section, category = 'all') {
            const gridId = section === 'all' ? 'allGrid' :
                section === 'requests' ? 'requestsGrid' :
                    'connectionsGrid';

            const grid = document.getElementById(gridId);
            if (!grid) return;

            // Show loading state
            grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading...</div>';

            // Simulate API call with sample data
            setTimeout(() => {
                const sampleData = generateSampleConnections(section, category);
                displayConnections(grid, sampleData);
            }, 300);
        }

        // Generate sample connections data
        function generateSampleConnections(section, category) {
            const connections = [];

            // Normalize category (handle both singular and plural forms)
            const normalizedCategory = category.replace(/s$/, ''); // Remove trailing 's'
            const count = category === 'all' ? 20 : 5;

            const names = ['Abebe Bekele', 'Tigist Haile', 'Yonas Tesfaye', 'Marta Girma', 'Daniel Kebede',
                'Rahel Tadesse', 'Dawit Solomon', 'Sara Mekonnen', 'Michael Getachew', 'Helen Alemu'];

            const roles = category === 'all' ?
                ['student', 'parent', 'colleague', 'fan'] :
                [normalizedCategory];

            const icons = {
                student: '👨‍🎓',
                parent: '👪',
                colleague: '👔',
                fan: '⭐'
            };

            for (let i = 0; i < count; i++) {
                const role = roles[i % roles.length];
                connections.push({
                    name: names[i % names.length],
                    role: role,
                    icon: icons[role],
                    avatar: `../uploads/system_images/system_profile_pictures/${role === 'student' ? 'student-college-boy' : role === 'parent' ? 'Mom-profile' : role === 'colleague' ? 'tutor-woman' : 'man-user'}.jpg`,
                    status: section === 'requests' ? 'pending' : 'connected'
                });
            }

            return connections;
        }

        // Display connections in grid
        function displayConnections(grid, connections) {
            if (connections.length === 0) {
                grid.innerHTML = `
                    <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                        <p>No connections found</p>
                    </div>
                `;
                return;
            }

            grid.innerHTML = connections.map(conn => `
                <div class="connection-card" style="background: var(--card-bg); border-radius: 12px; padding: 1rem; border: 1px solid rgba(var(--border-rgb), 0.1); transition: all 0.2s ease;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
                        <img src="${conn.avatar}" alt="${conn.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: var(--heading); font-size: 0.95rem;">${conn.name}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">${conn.icon} ${conn.role.charAt(0).toUpperCase() + conn.role.slice(1)}</div>
                        </div>
                    </div>
                    ${conn.status === 'pending' ? `
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                            <button onclick="acceptConnection()" style="flex: 1; padding: 0.4rem; background: var(--button-bg); color: white; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer;">Accept</button>
                            <button onclick="rejectConnection()" style="flex: 1; padding: 0.4rem; background: transparent; color: var(--text-muted); border: 1px solid rgba(var(--border-rgb), 0.2); border-radius: 6px; font-size: 0.8rem; cursor: pointer;">Decline</button>
                        </div>
                    ` : `
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                            <button onclick="messageConnection()" style="flex: 1; padding: 0.4rem; background: var(--button-bg); color: white; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer;">Message</button>
                            <button onclick="viewProfile()" style="flex: 1; padding: 0.4rem; background: transparent; color: var(--button-bg); border: 1px solid var(--button-bg); border-radius: 6px; font-size: 0.8rem; cursor: pointer;">View</button>
                        </div>
                    `}
                </div>
            `).join('');

            // Add grid styling
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
            grid.style.gap = '1rem';
        }

        // Open Custom Filter Modal
        function openCustomFilterModal() {
            const modal = document.getElementById('customFilterModal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        }

        // Close Custom Filter Modal
        function closeCustomFilterModal() {
            const modal = document.getElementById('customFilterModal');
            if (modal) {
                modal.classList.add('hidden');
                document.getElementById('customFilterForm').reset();
            }
        }

        // Handle custom filter form submission
        document.addEventListener('DOMContentLoaded', function () {
            const form = document.getElementById('customFilterForm');
            if (form) {
                form.addEventListener('submit', function (e) {
                    e.preventDefault();

                    const filterName = document.getElementById('filterName').value;
                    const selectedCriteria = Array.from(document.querySelectorAll('input[name="criteria"]:checked'))
                        .map(cb => cb.value);
                    const description = document.getElementById('filterDescription').value;

                    console.log('Creating custom filter:', { filterName, selectedCriteria, description });

                    // TODO: Save filter to backend/localStorage
                    alert(`Filter "${filterName}" created successfully!`);

                    closeCustomFilterModal();
                });
            }
        });

        // Placeholder functions for connection actions
        function acceptConnection() {
            alert('Connection request accepted!');
            // TODO: Implement API call
        }

        function rejectConnection() {
            alert('Connection request declined!');
            // TODO: Implement API call
        }

        function messageConnection() {
            alert('Opening message...');
            // TODO: Open chat modal
        }

        function viewProfile() {
            alert('Opening profile...');
            // TODO: Navigate to profile
        }

        // Close modal on ESC key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeCommunityModal();
                closeCustomFilterModal();
            }
        });