// API Configuration for Admin Pages
// This file detects which backend to use based on frontend port
// MUST be loaded FIRST before any other scripts

(function() {
    // Detect if running on admin-specific port (8082) or standard port
    const frontendPort = window.location.port;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // If frontend is on 8082, use backend on 8001 (admin servers)
    // If frontend is on 8081 or 8080, use backend on 8000 (user servers)
    const isAdminServer = frontendPort === '8082';

    const BACKEND_PORT = isAdminServer ? '8001' : '8000';
    const isProduction = ['astegni.com', 'www.astegni.com', 'admin.astegni.com'].includes(window.location.hostname);

    const API_BASE_URL = isProduction
        ? 'https://api.astegni.com'
        : isLocalhost
            ? `http://localhost:${BACKEND_PORT}`
            : 'https://api.astegni.com';

    // Export globally for all scripts to use
    window.ADMIN_API_CONFIG = {
        API_BASE_URL: API_BASE_URL,
        BACKEND_PORT: BACKEND_PORT,
        isAdminServer: isAdminServer,
        isLocalhost: isLocalhost
    };

    // Set global API_BASE_URL that other scripts can reference
    window.API_BASE_URL = API_BASE_URL;

    console.log(`[Admin API Config] Frontend port: ${frontendPort}, Backend: ${API_BASE_URL}`);
})();
