# Earnings & Investments - Quick Start Guide

## 🚀 Get It Running in 3 Steps

### Step 1: Setup Database (30 seconds)
```bash
cd astegni-backend
python migrate_create_earnings_investments.py
python seed_earnings_investments.py
```

**Expected Output:**
```
Creating direct_affiliate_earnings table...
Creating indirect_affiliate_earnings table...
Creating tutoring_earnings table...
Creating tutor_investments table...
Creating monthly_earnings_summary table...
Creating indexes...
SUCCESS: Successfully created all earnings and investments tables!

Seeding data for tutor_profile_id: 65
Seeding direct affiliate earnings...
Seeding indirect affiliate earnings...
Seeding tutoring earnings...
Seeding tutor investments...
Seeding monthly earnings summary...

SUCCESS: Earnings and investments data seeded!
Total Direct Affiliate: 2101.18 ETB
Total Indirect Affiliate: 643.36 ETB
Total Tutoring: 6668.33 ETB
Total Investments: 43000.00 ETB
```

### Step 2: Restart Backend (10 seconds)
```bash
# Kill existing backend if running
# Then restart:
python app.py
```

**Look for:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 3: View in Browser (5 seconds)
1. Open `http://localhost:8080/profile-pages/tutor-profile.html`
2. Login as tutor (if not already)
3. Look for **ℰ Earnings & Investments** in sidebar
4. Click it!

## 🎯 What You'll See Immediately

### Earnings Tab (Default View)
```
┌─────────────────────────────────────────────────────┐
│ Earnings & Investments                              │
│ Track your income streams and investment portfolio  │
├─────────────────────────────────────────────────────┤
│ [Earnings]  [Investments]  ← Two tabs               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 💰 Total: 9,412.87 ETB                              │
│ 👥 Direct: 2,101.18 ETB                             │
│ 🔗 Indirect: 643.36 ETB                             │
│ 📚 Tutoring: 6,668.33 ETB                           │
│                                                     │
│ ┌──────────────────────────────────────────────┐   │
│ │ 👥 Direct Affiliate Earnings                 │   │
│ │ [Beautiful Blue Line Graph]                  │   │
│ │ List of 12 referrals with amounts...         │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ ┌──────────────────────────────────────────────┐   │
│ │ 🔗 Indirect Affiliate Earnings               │   │
│ │ [Beautiful Purple Line Graph]                │   │
│ │ List of 8 referrals with amounts...          │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ ┌──────────────────────────────────────────────┐   │
│ │ 📚 Tutoring Session Earnings                 │   │
│ │ [Beautiful Orange Line Graph]                │   │
│ │ List of 25 sessions with amounts...          │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Click Investments Tab
```
┌─────────────────────────────────────────────────────┐
│ 💼 Invested: 43,000.00 ETB                          │
│ 📈 Value: 46,330.00 ETB                             │
│ 💎 ROI: +7.74%                                      │
│ 🎯 Active: 6                                        │
│                                                     │
│ ┌──────────────────────────────────────────────┐   │
│ │ Coursera Inc. (Educational Platform Stock)   │   │
│ │ Invested: 5,000 → Current: 5,750 (+15%)      │   │
│ │ [Medium Risk] [active]                       │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ ┌──────────────────────────────────────────────┐   │
│ │ Bitcoin (BTC) (Cryptocurrency)               │   │
│ │ Invested: 3,000 → Current: 3,600 (+20%)      │   │
│ │ [High Risk] [active]                         │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ ... 4 more investments                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 🔍 Testing Checklist

### Visual Tests (No Code)
- [ ] Sidebar shows "ℰ Earnings & Investments" link
- [ ] ℰ symbol looks fancy (serif script style)
- [ ] Click link → panel opens
- [ ] See 4 colorful cards at top (green, blue, purple, orange)
- [ ] Cards show real numbers (not zeros)
- [ ] Scroll down → see 3 sections with graphs
- [ ] Graphs have curved lines (not straight)
- [ ] Lists show names and profile pictures
- [ ] Badges are color-coded (green/yellow)
- [ ] Click "Investments" tab → switches view
- [ ] Investment cards show 43,000 ETB total
- [ ] See 6 different investments
- [ ] ROI percentages show (+15%, +20%, etc.)

### Widget Test
- [ ] Right sidebar has "Monthly Earnings" widget
- [ ] Widget shows line graph
- [ ] "View Details →" button at bottom
- [ ] Click button → opens Earnings panel

### Interactive Tests
- [ ] Change period selector (6 months → 12 months)
- [ ] Graph updates with new timeframe
- [ ] Tab switching is instant (no lag)
- [ ] Hover over list items → see shadow effect
- [ ] Scroll lists → smooth scrolling

## 📊 Sample Data Overview

You'll see these real Ethiopian names and data:

### Direct Affiliate (12 people)
- Abebe Bekele, Almaz Tadesse, Biniam Haile, etc.
- Amounts: 50-300 ETB each
- Total: ~2,101 ETB

### Indirect Affiliate (8 chains)
- "Biniam → Chaltu", "Dawit → Eyerusalem", etc.
- Amounts: 25-150 ETB each
- Total: ~643 ETB

### Tutoring Sessions (25 sessions)
- Students: Dawit Tesfaye, Eyerusalem Kebede, etc.
- Subjects: Math, Physics, Chemistry, Biology, etc.
- Sessions: One-on-One, Group, Hybrid
- Amounts: 100-500 ETB per session
- Total: ~6,668 ETB

### Investments (6 items)
1. **Coursera Inc.** - +15% ROI (Medium risk)
2. **Bitcoin** - +20% ROI (High risk)
3. **Addis Apartment** - +12% ROI (Low risk)
4. **Treasury Bond** - +6% ROI (Very Low risk)
5. **Udemy Courses** - +40% ROI (Medium risk)
6. **EdTech Venture** - -3.33% ROI (High risk) ← Only losing investment

## 🎨 Color Guide

**Quick Recognition:**
- 💚 Green = Total earnings, completed, profit
- 💙 Blue = Direct affiliate
- 💜 Purple = Indirect affiliate
- 🧡 Orange = Tutoring
- 🟡 Yellow = Pending, medium risk
- 🔴 Red = Loss, high risk

## 🐛 Troubleshooting

### "Panel is empty"
```bash
# Backend not running or not updated
cd astegni-backend
python app.py
```

### "Graphs not showing"
- Check browser console (F12)
- Chart.js might be blocked
- Try refreshing page

### "All amounts are 0"
```bash
# Data not seeded
cd astegni-backend
python seed_earnings_investments.py
```

### "Can't see sidebar link"
- Hard refresh: Ctrl + F5
- Clear browser cache
- Check tutor-profile.html was updated

### "API errors in console"
- Verify backend running on port 8000
- Check authentication token valid
- Try logging out and back in

## 🎯 Quick Navigation

### From Dashboard
1. Dashboard → Sidebar → ℰ Earnings & Investments

### From Earnings Widget
1. Right sidebar → Monthly Earnings widget
2. Click "View Details →" button
3. Instantly opens Earnings & Investments panel

### Between Tabs
1. Click "Earnings" or "Investments" at top
2. Instant switch (no page reload)

## 📈 What the Numbers Mean

### Summary Cards

**Total Earnings (Green):**
- Sum of ALL completed earnings
- Excludes pending transactions

**Direct Affiliate (Blue):**
- 10% commission on direct referrals
- 12 people referred = ~2,101 ETB

**Indirect Affiliate (Purple):**
- 5% commission on 2nd level referrals
- 8 referral chains = ~643 ETB

**Tutoring (Orange):**
- Direct session payments
- 25 sessions = ~6,668 ETB

### Investment Metrics

**Total Invested:**
- Sum of all initial investments
- 43,000 ETB across 6 investments

**Current Value:**
- Current market value of portfolio
- 46,330 ETB (includes gains/losses)

**ROI:**
- Overall return on investment
- +7.74% (3,330 ETB profit)

**Active Investments:**
- Number of currently active investments
- 6 out of 6 are active

## 🎉 Success!

If you see:
- ✅ Fancy ℰ symbol in sidebar
- ✅ Colorful gradient cards
- ✅ Smooth line graphs
- ✅ Ethiopian names in lists
- ✅ Amounts in ETB
- ✅ Profile pictures
- ✅ Color-coded badges

**You're all set! Enjoy exploring your earnings!** 🚀

---

**Total Setup Time:** ~45 seconds
**Seeded Records:** 45 earnings + 6 investments + 6 months data
**Visual Appeal:** 🌟🌟🌟🌟🌟
**Feature Status:** ✅ COMPLETE
