/**
 * SIDEBAR MANAGER
 * Handles sidebar toggle functionality for student profile on all devices
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Initializing Sidebar Manager...');

    // Get DOM elements
    const sidebar = document.querySelector('.sidebar-container');
    const overlay = document.getElementById('sidebar-overlay');
    const hamburger = document.getElementById('hamburger');

    // Check if elements exist
    if (!sidebar) {
        console.warn('⚠️ Sidebar not found');
        return;
    }

    console.log('✅ Sidebar elements found:', {
        sidebar: !!sidebar,
        overlay: !!overlay,
        hamburger: !!hamburger
    });

    // Open sidebar
    function openSidebar() {
        console.log('📂 Opening sidebar...');
        sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
        if (hamburger) hamburger.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Close sidebar
    function closeSidebar() {
        console.log('📁 Closing sidebar...');
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Toggle sidebar
    function toggleSidebar() {
        if (sidebar.classList.contains('active')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    // Attach event listeners
    if (hamburger) {
        hamburger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🍔 Hamburger clicked!');
            toggleSidebar();
        });
        console.log('✅ Hamburger click listener attached');
    } else {
        console.warn('⚠️ Hamburger button not found');
    }

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar();
        });
        console.log('✅ Overlay click listener attached');
    }

    // Handle ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });

    console.log('✅ Sidebar Manager initialized successfully');
});
