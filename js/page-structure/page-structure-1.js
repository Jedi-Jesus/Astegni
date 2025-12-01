// ============================================
// TRAINING CENTER PROFILE - PART 1
// REFACTORED: Now imports from modular managers
// ============================================

// This file is kept for backwards compatibility with journalist/institute profiles
// For new implementations, import specific managers directly:
// - stateManager.js - Global CONFIG and STATE
// - deliveryManager.js - Delivery tracking
// - aiInsightsManager.js - AI Insights for journalists

// Import global state and config (already loaded via stateManager.js)
// Import delivery functions (already loaded via deliveryManager.js)
// Import AI Insights (already loaded via aiInsightsManager.js)

console.log("✅ Page Structure 1 loaded (uses modular managers)!");
console.log("   → Using: stateManager.js, deliveryManager.js, aiInsightsManager.js");
