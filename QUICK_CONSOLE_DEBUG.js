/**
 * QUICK CONSOLE DEBUG SCRIPT
 *
 * Copy-paste this entire script into your browser console while on the tutor profile page
 * It will tell you exactly why you're seeing 150 ETB
 */

console.clear();
console.log('%c========================================', 'color: #3b82f6; font-weight: bold;');
console.log('%c🔍 DEBUGGING 150 ETB ISSUE', 'color: #3b82f6; font-weight: bold; font-size: 16px;');
console.log('%c========================================', 'color: #3b82f6; font-weight: bold;');
console.log('');

// Step 1: Check JavaScript version
console.log('%c1️⃣ CHECKING JAVASCRIPT VERSION', 'color: #f59e0b; font-weight: bold;');
console.log('-----------------------------------');

if (typeof tutorDataByTime !== 'undefined') {
    console.log('%c❌ OLD VERSION DETECTED!', 'color: #dc2626; font-weight: bold;');
    console.log('%cYour browser has cached the OLD JavaScript with fallback data!', 'color: #dc2626;');
    console.log('%cSOLUTION: Press Ctrl+Shift+R to hard refresh', 'color: #16a34a; font-weight: bold;');
    console.log('');
    console.log('Fallback data present:', tutorDataByTime);
    console.log('');
    console.log('%c⚠️ STOP HERE - Fix cache issue first!', 'color: #ea580c; font-weight: bold; font-size: 14px;');
} else {
    console.log('%c✅ NEW VERSION DETECTED!', 'color: #16a34a; font-weight: bold;');
    console.log('No fallback data found (good!)');
}
console.log('');

// Step 2: Check for version marker
console.log('%c2️⃣ CHECKING VERSION MARKER', 'color: #f59e0b; font-weight: bold;');
console.log('-----------------------------------');
console.log('Look above in console for: "📊 Market Trend Functions v2.3.1 loaded"');
console.log('');

// Step 3: Check token
console.log('%c3️⃣ CHECKING AUTHENTICATION', 'color: #f59e0b; font-weight: bold;');
console.log('-----------------------------------');

const token = localStorage.getItem('access_token') || localStorage.getItem('token');
if (token) {
    console.log('%c✅ Token found', 'color: #16a34a; font-weight: bold;');
    console.log('Token source:', localStorage.getItem('access_token') ? 'access_token' : 'token');
} else {
    console.log('%c❌ No token found!', 'color: #dc2626; font-weight: bold;');
    console.log('%cYou need to log in first', 'color: #dc2626;');
}
console.log('');

// Step 4: Test API directly
console.log('%c4️⃣ TESTING API DIRECTLY', 'color: #f59e0b; font-weight: bold;');
console.log('-----------------------------------');

if (!token) {
    console.log('%c⚠️ Skipping API test (no token)', 'color: #ea580c;');
} else {
    console.log('Fetching market data...');

    fetch('http://localhost:8000/api/market-pricing/market-tutors', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            time_period_months: 3,
            session_format: 'Online'
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('%c✅ API RESPONSE RECEIVED', 'color: #16a34a; font-weight: bold;');
        console.log('');
        console.log('Full response:', data);
        console.log('');

        if (data.tutors && data.tutors.length > 0) {
            console.log('%c📊 PRICES IN API RESPONSE:', 'color: #3b82f6; font-weight: bold;');
            data.tutors.forEach((t, i) => {
                const price = t.price_per_hour;
                const color = price === 150 ? '#dc2626' : '#16a34a';
                const symbol = price === 150 ? '⚠️' : '✅';
                console.log(`%c${symbol} Tutor ${t.id}: ${price} ETB (similarity: ${t.similarity_score})`, `color: ${color};`);
            });
            console.log('');

            // Check if 150 exists
            const has150 = data.tutors.some(t => t.price_per_hour === 150 || t.price_per_hour === '150');
            if (has150) {
                console.log('%c❌ FOUND 150 ETB IN API RESPONSE!', 'color: #dc2626; font-weight: bold; font-size: 14px;');
                console.log('%cThis is a DATABASE issue (very unlikely based on our verification)', 'color: #dc2626;');
                console.log('%cRun: cd astegni-backend && python debug_market_data_150.py', 'color: #16a34a;');
            } else {
                console.log('%c✅ NO 150 ETB IN API RESPONSE', 'color: #16a34a; font-weight: bold;');
                console.log('%cAPI is returning correct data from database', 'color: #16a34a;');
                console.log('');

                // Test aggregation
                if (typeof aggregateDataByRating !== 'undefined') {
                    console.log('%c5️⃣ TESTING AGGREGATION FUNCTION', 'color: #f59e0b; font-weight: bold;');
                    console.log('-----------------------------------');

                    const aggregated = aggregateDataByRating(data.tutors);
                    console.log('Aggregated data:', aggregated);
                    console.log('');

                    let found150 = false;
                    aggregated.forEach(group => {
                        const price = parseFloat(group.avgPrice);
                        const color = price === 150 ? '#dc2626' : '#16a34a';
                        const symbol = price === 150 ? '⚠️' : '✅';
                        console.log(`%c${symbol} Rating ${group.rating}⭐: ${group.avgPrice} ETB (${group.count} tutors)`, `color: ${color};`);

                        if (price === 150) found150 = true;
                    });
                    console.log('');

                    if (found150) {
                        console.log('%c❌ FOUND 150 ETB IN AGGREGATED DATA!', 'color: #dc2626; font-weight: bold; font-size: 14px;');
                        console.log('%cThis should NOT happen if API returned correct data', 'color: #dc2626;');
                        console.log('%cThere might be a bug in aggregateDataByRating function', 'color: #dc2626;');
                    } else {
                        console.log('%c✅ NO 150 ETB IN AGGREGATED DATA', 'color: #16a34a; font-weight: bold;');
                        console.log('%cAggregation is working correctly', 'color: #16a34a;');
                    }
                } else {
                    console.log('%c⚠️ aggregateDataByRating function not found', 'color: #ea580c;');
                    console.log('%cThis means OLD JavaScript is still cached!', 'color: #dc2626;');
                }
            }
        } else {
            console.log('%c⚠️ API returned no tutors', 'color: #ea580c;');
            console.log('This could be normal if:');
            console.log('- No other tutors in database');
            console.log('- No similar tutors found (>65% similarity)');
            console.log('- Filters exclude all tutors');
        }

        console.log('');
        console.log('%c========================================', 'color: #3b82f6; font-weight: bold;');
        console.log('%c📋 DIAGNOSIS SUMMARY', 'color: #3b82f6; font-weight: bold; font-size: 16px;');
        console.log('%c========================================', 'color: #3b82f6; font-weight: bold;');

        if (typeof tutorDataByTime !== 'undefined') {
            console.log('%c❌ PROBLEM: Old JavaScript cached', 'color: #dc2626; font-weight: bold;');
            console.log('%c✅ SOLUTION: Press Ctrl+Shift+R to hard refresh', 'color: #16a34a; font-weight: bold; font-size: 14px;');
        } else if (data.tutors && data.tutors.length > 0) {
            const apiPrices = data.tutors.map(t => t.price_per_hour);
            if (apiPrices.includes(150)) {
                console.log('%c❌ PROBLEM: Database contains 150 ETB', 'color: #dc2626; font-weight: bold;');
                console.log('%c✅ SOLUTION: Check database with debug_market_data_150.py', 'color: #16a34a; font-weight: bold;');
            } else {
                console.log('%c✅ Everything looks correct!', 'color: #16a34a; font-weight: bold;');
                console.log('%cIf you still see 150 ETB in the UI:', 'color: #3b82f6;');
                console.log('%c1. Clear browser cache completely', 'color: #3b82f6;');
                console.log('%c2. Try incognito/private window', 'color: #3b82f6;');
                console.log('%c3. Check if multiple market-trend-functions.js files are loaded', 'color: #3b82f6;');
            }
        }

    })
    .catch(error => {
        console.log('%c❌ API ERROR', 'color: #dc2626; font-weight: bold;');
        console.log('Error:', error);
        console.log('');
        console.log('Possible causes:');
        console.log('- Backend server not running (run: cd astegni-backend && python app.py)');
        console.log('- Wrong API URL (should be http://localhost:8000)');
        console.log('- Token expired (try logging out and back in)');
    });
}

console.log('');
console.log('%c========================================', 'color: #3b82f6; font-weight: bold;');
console.log('%c🎯 NEXT STEPS', 'color: #3b82f6; font-weight: bold; font-size: 16px;');
console.log('%c========================================', 'color: #3b82f6; font-weight: bold;');
console.log('');
console.log('%c1. Wait for API test to complete above', 'color: #f59e0b;');
console.log('%c2. Follow the diagnosis summary', 'color: #f59e0b;');
console.log('%c3. If problem persists, check DEBUG_150_ETB_ISSUE.md', 'color: #f59e0b;');
console.log('');
