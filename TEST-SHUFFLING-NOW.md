# Test Shuffling & Basic Tutors - Quick Guide

## Changes Made

### 1. Database Updates ✅
- **22 basic tutors** now marked (up from 16)
- Criteria: Rating ≥ 4.5 AND verified, OR new tutors with rating ≥ 4.0

### 2. Backend Logging Added ✅
Added detailed console output showing:
- Top 5 tutors with scores
- Shuffle probability roll
- Tier breakdown
- Whether shuffle occurred or not

---

## How to Test

### Step 1: Restart Backend
```bash
cd astegni-backend
python app.py
```

### Step 2: Open Find-Tutors Page
```
http://localhost:8080/branch/find-tutors.html
```

### Step 3: Watch Backend Console

You'll now see output like this:

```
📊 Smart Ranking Results (Total: 40 tutors)
   Top 5 tutors:
   1. [BASIC] NEW  Score: 197 - Oliyad Gebremedhin (★5.0)
   2. [BASIC]      Score: 187 - Abebe Tadesse (★4.9)
   3. [BASIC]      Score: 187 - Solomon Girma (★4.9)
   4. [BASIC]      Score: 186 - Kalkidan Mulugeta (★4.8)
   5. [BASIC]      Score: 175 - Daniel Abebe (★4.7)

🔀 SHUFFLING (roll: 0.63 < 0.80)
   Tier 1: 8 tutors (top 20%)
   Tier 2: 12 tutors (next 30%)
   Tier 3: 20 tutors (bottom 50%)
   ✓ Shuffled within tiers
```

**OR if no shuffle**:
```
⏭️  NO SHUFFLE (roll: 0.85 >= 0.80)
```

---

## What You Should See

### On Each Page Reload

**~80% of the time** (shuffle happens):
- Console shows: `🔀 SHUFFLING (roll: 0.XX < 0.80)`
- Tutors in same tier swap positions
- Top tutors still stay near top (tier 1)
- Quality maintained

**~20% of the time** (no shuffle):
- Console shows: `⏭️ NO SHUFFLE (roll: 0.XX >= 0.80)`
- Exact same order as previous load
- Strict score ordering

---

## Understanding the Labels

### Console Output Labels

**[BASIC]** = is_basic = true (22 tutors)
- Gets +100 points
- Priority placement

**NEW** = Created within 30 days
- Gets +30 points
- Very new (≤7 days): +50 points total

**HIST** = In search history
- Gets +50 points
- Shows after you search & click tutors

**REG** = Regular tutor (not basic)
- No special bonuses
- Ranked by rating + experience

---

## Test Scenarios

### Scenario 1: See Shuffling in Action

1. Load page 10 times
2. Check console each time
3. **Expected**: ~8 shuffles, ~2 no-shuffles
4. Notice: Order changes but quality maintained

### Scenario 2: See Basic Tutors Priority

1. Load page
2. Check top 5 results
3. **Expected**: All or most are `[BASIC]`
4. Scores: 175-200+ points

### Scenario 3: Test Search History

1. Search "mathematics"
2. Click on 3 tutors
3. Clear search, reload page
4. Check console for `HIST` label
5. **Expected**: Those tutors appear higher with +50 points

---

## Score Breakdown Examples

### Example 1: Triple Combo Tutor
```
[BASIC] NEW HIST Score: 397
- Rating 4.8: +48 points
- Basic: +100 points
- New: +30 points
- Search History: +50 points
- Triple Combo: +150 points
- Experience 8 years: +16 points
- Verified: +25 points
= 419 points (approx)
```

### Example 2: Basic Only
```
[BASIC] Score: 187
- Rating 4.9: +49 points
- Basic: +100 points
- Experience 12 years: +20 points (capped)
- Verified: +25 points
= 194 points (approx)
```

### Example 3: Regular Tutor
```
[REG] Score: 87
- Rating 4.5: +45 points
- Experience 5 years: +10 points
- Students 100: +10 points
- Verified: +25 points
= 90 points (approx)
```

---

## Troubleshooting

### Issue: "Not seeing much shuffling"

**Check Console**:
- If you see `⏭️ NO SHUFFLE` → You hit the 20% window, reload again
- If you see `🔀 SHUFFLING` → Shuffling is working, but within tiers

**Explanation**:
Shuffling happens **within tiers**, so:
- Tier 1 (top 20%) stays at top, but shuffles internally
- Tier 2 (next 30%) stays in middle, shuffles internally
- Tier 3 (bottom 50%) stays at bottom, shuffles internally

This is intentional to maintain quality while adding variety!

### Issue: "Same tutors always at #1"

This means they have the highest scores (correct behavior!).

**To see more variety in #1 spot**:
1. Mark more tutors as basic (they'll have similar scores)
2. Create search history (click tutors)
3. Wait for tier 1 to have 5+ tutors (more shuffle options)

### Issue: "Console shows errors"

Make sure:
1. Backend restarted: `python app.py`
2. Database migration ran successfully
3. No firewall blocking

---

## Increase Shuffle Visibility (Optional)

If you want to see MORE shuffling:

**Option A: Always Shuffle (100%)**
File: `routes.py` line 568
```python
# Change from:
should_shuffle = page == 1 and shuffle_roll < 0.8

# To:
should_shuffle = page == 1 and shuffle_roll < 1.0  # Always shuffle
```

**Option B: Increase Tier Sizes**
File: `routes.py` lines 578-579
```python
# Change from:
tier1_end = max(1, int(len(tutors_with_scores) * 0.2))  # 20%
tier2_end = max(tier1_end + 1, int(len(tutors_with_scores) * 0.5))  # 50%

# To (larger tier 1 = more top tutors shuffle):
tier1_end = max(1, int(len(tutors_with_scores) * 0.4))  # 40%
tier2_end = max(tier1_end + 1, int(len(tutors_with_scores) * 0.7))  # 70%
```

---

## Verify Basic Tutors

Check which tutors are marked as basic:

```bash
cd astegni-backend
python -c "
import os
from dotenv import load_dotenv
import psycopg

load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor()

cursor.execute('''
    SELECT tp.id, u.first_name, u.father_name, tp.rating, tp.is_basic
    FROM tutor_profiles tp
    JOIN users u ON tp.user_id = u.id
    WHERE tp.is_active = true AND tp.is_basic = true
    ORDER BY tp.rating DESC
''')

print('Basic Tutors:')
for row in cursor.fetchall():
    print(f'  ID:{row[0]} {row[1]} {row[2]} - ★{row[3]:.1f}')

cursor.close()
conn.close()
"
```

---

## Current Status

✅ **22 basic tutors** marked (55% of 40 total)
✅ **Logging enabled** in backend console
✅ **80% shuffle probability** active
✅ **Tier-based shuffling** preserves quality

**Recommendation**:
Reload the find-tutors page **10 times** and watch the backend console. You should see:
- ~8 shuffles
- ~2 no-shuffles
- Top tutors changing order (within tier 1)
- Basic tutors always in top results

---

**Ready to test! Restart your backend and watch the magic happen! ✨**
