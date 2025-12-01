// Script to update the remaining admin pages with navigation and sidebar changes

const fs = require('fs');
const path = require('path');

// Files to update
const files = [
    'manage-tutors.html',
    'manage-advertisers.html',
    'manage-system-settings.html'
];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Update navigation - move logo next to hamburger and add notification icon
    content = content.replace(
        /<div class="nav-left">\s*<span class="hamburger"[\s\S]*?<\/div>\s*<a href="\.\.\/index\.html" class="logo-container">[\s\S]*?<\/a>/,
        `<div class="flex items-center gap-4">
                <span class="hamburger" id="hamburger">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
                <a href="../index.html" class="logo-container">
                    <div class="logo-text">
                        <span class="logo-main">Astegni</span>
                        <span class="logo-sub">Admin Panel</span>
                    </div>
                    <span class="logo-badge">Beta</span>
                </a>
            </div>`
    );

    // 2. Add notification icon in navbar
    content = content.replace(
        /<div class="hidden md:flex space-x-6 items-center">[\s\S]*?<button id="theme-toggle-btn"[\s\S]*?<\/button>\s*<\/div>/,
        `<div class="flex items-center space-x-6">
                <div class="hidden md:flex space-x-6 items-center">
                    <a href="../profile-pages/admin-profile.html" class="hover:text-[var(--nav-link-hover)]">Dashboard</a>
                    <a href="../branch/find-tutors.html" class="hover:text-[var(--nav-link-hover)]">Find Tutors</a>
                    <a href="../branch/reels.html" class="hover:text-[var(--nav-link-hover)]">Reels</a>
                </div>

                <!-- Notification Icon -->
                <button class="relative focus:outline-none" aria-label="Notifications">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                    </svg>
                    <span class="absolute top-0 right-0 -mt-1 -mr-1 px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">3</span>
                </button>

                <!-- Theme Toggle -->
                <button id="theme-toggle-btn" class="focus:outline-none" aria-label="Toggle theme">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 818 0z">
                        </path>
                    </svg>
                </button>
            </div>`
    );

    // 3. Add CSS for sidebar
    if (!content.includes('.sidebar-nav {')) {
        content = content.replace(
            '.sidebar-link.active {',
            `.sidebar-nav {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        .sidebar-link.active {`
        );
    }

    // 4. Add logout button to sidebar (before closing </div> of sidebar-nav)
    // Find the last sidebar link before closing divs
    const sidebarPattern = /<\/a>\s*<\/div>\s*<\/div>\s*<\/aside>/;
    if (!content.includes('Logout')) {
        content = content.replace(sidebarPattern, `</a>
                <a href="manage-system-settings.html" class="sidebar-link">
                    <span class="sidebar-icon">⚙️</span>
                    <span>System Settings</span>
                </a>

                <!-- Logout Button at Bottom -->
                <div class="mt-auto pt-4 border-t border-gray-300">
                    <a href="#" onclick="logout(); return false;" class="sidebar-link text-red-500 hover:bg-red-50">
                        <span class="sidebar-icon">🚪</span>
                        <span>Logout</span>
                    </a>
                </div>
            </div>
        </div>
    </aside>`);
    }

    // 5. Add logout function if not present
    if (!content.includes('function logout()')) {
        // Find a good place to add the logout function - before closing </script> tag
        content = content.replace(
            '</script>',
            `
        // Logout function
        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '../index.html';
            }
        }
    </script>`
        );
    }

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
});

console.log('All files updated successfully!');