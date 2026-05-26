// ============================================
//   ADVERTISE SUBDOMAIN — GLOBAL CONFIGURATION
// ============================================
//
// Mirrors js/config.js at the repo root, but with subdomain-aware detection.
// Both surfaces (astegni.com and advertise.astegni.com) call the same backend
// at api.astegni.com in production.

(function () {
    'use strict';

    const hostname = window.location.hostname;

    // Production hostnames that should hit the production API
    const productionHostnames = [
        'astegni.com',
        'www.astegni.com',
        'advertise.astegni.com',
        'admin.astegni.com'
    ];
    const isProduction = productionHostnames.includes(hostname);

    const API_BASE_URL = isProduction
        ? 'https://api.astegni.com'
        : 'http://localhost:8000';

    // Surface identifier — passed to /api/register and /api/login so the
    // backend can enforce advertiser-only signup/login on this subdomain.
    const SURFACE = 'advertise';

    window.API_BASE_URL = API_BASE_URL;
    window.ASTEGNI_CONFIG = {
        API_BASE_URL: API_BASE_URL,
        isProduction: isProduction,
        environment: isProduction ? 'production' : 'development',
        surface: SURFACE,
        version: '2.1.0'
    };

    window.CONFIG = window.CONFIG || {};
    window.CONFIG.API_BASE_URL = API_BASE_URL;
    window.CONFIG.SURFACE = SURFACE;

    console.log(`[Astegni / advertise] Environment: ${isProduction ? 'Production' : 'Development'}`);
    console.log(`[Astegni / advertise] API URL: ${API_BASE_URL}`);
    console.log(`[Astegni / advertise] Surface: ${SURFACE}`);
})();
