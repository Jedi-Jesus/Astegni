// ============================================
//   GLOBAL CONFIGURATION
// ============================================

(function() {
    'use strict';

    // Detect environment based on hostname
    const hostname = window.location.hostname;

    // Production domains
    const productionDomains = ['astegni.com', 'www.astegni.com'];
    const isProduction = productionDomains.includes(hostname);

    // Set API base URL based on environment
    const API_BASE_URL = isProduction
        ? 'https://api.astegni.com'
        : 'http://localhost:8000';

    // Expose globally
    window.API_BASE_URL = API_BASE_URL;
    window.ASTEGNI_CONFIG = {
        API_BASE_URL: API_BASE_URL,
        isProduction: isProduction,
        environment: isProduction ? 'production' : 'development',
        version: '2.1.0'
    };

    // Also set CONFIG for backwards compatibility
    window.CONFIG = window.CONFIG || {};
    window.CONFIG.API_BASE_URL = API_BASE_URL;
    window.CONFIG.COUNTER_DURATION = 2000;

    console.log(`[Astegni] Environment: ${isProduction ? 'Production' : 'Development'}`);
    console.log(`[Astegni] API URL: ${API_BASE_URL}`);
})();
