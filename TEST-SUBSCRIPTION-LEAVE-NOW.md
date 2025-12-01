# Quick Test Guide - Subscription & Leave Flows

## 🚀 How to Test Right Now

### Setup:
1. Open `profile-pages/tutor-profile.html` in browser
2. Navigate to **Settings Panel**

---

## Test 1: Subscribe → Unsubscribe Flow

### Step-by-Step:
1. **Open Subscription Modal**
   - Click "Subscription & Storage" card
   - See 5 subscription plans

2. **Subscribe to a Plan**
   - Click "Subscribe" on any plan (e.g., Professional)
   - Fill out subscription details
   - Confirm subscription
   - **Notice**: Button changes to "Switch Plan" and "Unsubscribe"

3. **Click "Unsubscribe"**
   - **Modal 1**: "Why did you come to this decision? 😢"
   - Select reasons (can select multiple)
   - Click "Other" to see text input appear
   - Click "Submit"

4. **Modal 2**: "Confirm Unsubscription"
   - See message: "This decision will deactivate your [plan] subscription"
   - Click "Yes"

5. **Modal 3**: "Confirm Cancellation Fee"
   - Warning: "5% cancellation fee"
   - Click "Yes"

6. **Modal 4**: "Enter Password"
   - Enter any password (frontend simulation)
   - Click "Submit"

7. **Modal 5**: "See you soon! 👋"
   - Final farewell message
   - Click "Close"
   - **Notice**: Buttons reset to "Subscribe" only

---

## Test 2: Switch Subscription Plan

### Step-by-Step:
1. **Subscribe to a Plan First**
   - Click "Subscribe" on Starter plan
   - Complete subscription

2. **Click "Switch Plan"**
   - Modal opens with all 5 plans
   - Current plan is greyed out/disabled

3. **Select a Different Plan**
   - Click "Switch to This" on Professional plan
   - Alert: "✅ Successfully switched to Professional plan!"
   - **Notice**: Switch/Unsubscribe buttons still visible

---

## Test 3: Leave Astegni (Delete Account) - WITHOUT Subscription

### Step-by-Step:
1. **Ensure No Active Subscription**
   - If subscribed, unsubscribe first

2. **Click "Leave Astegni" Card**
   - **Modal 1**: "Why did you come to this decision? 😔"
   - Select reasons
   - Click "Other" to test text input
   - Click "Submit"

3. **Modal 2**: "90-Day Deletion Period Warning"
   - See Instagram-like policy explanation
   - "Account deactivated immediately, data kept for 90 days"
   - "Login within 90 days = automatic restoration"
   - Click "Yes, Continue"

4. **Modal 3**: SKIPPED (no subscription)
   - Goes directly to file choice

5. **Modal 4**: "What would you like to do with your files?"
   - **Option 1**: "Download my files first"
   - **Option 2**: "Delete everything immediately"
   - Select one and click "Continue"
   - If download selected: Alert about email notification

6. **Modal 5**: "Enter Password"
   - Enter password
   - Click "Confirm Deletion"

7. **Modal 6**: "Farewell 👋"
   - "Your account has been scheduled for deletion. You have 90 days to change your mind."
   - "Simply log in within 90 days to restore"
   - Auto-redirects to homepage after 2 seconds

---

## Test 4: Leave Astegni - WITH Active Subscription

### Step-by-Step:
1. **Subscribe to Any Plan First**
   - Complete subscription

2. **Click "Leave Astegni" Card**
   - Complete Step 1 (reasons)

3. **Modal 2**: 90-day warning
   - Click "Yes, Continue"

4. **Modal 3**: "⚠️ Active Subscriptions Detected" (BLOCKER)
   - Message: "Please cancel all active subscriptions first"
   - "Go to Settings → Subscription to manage"
   - Click "Close"
   - **Test passed**: Cannot delete with active subscription!

5. **Unsubscribe First**
   - Go back to Subscription modal
   - Click "Unsubscribe"
   - Complete unsubscribe flow

6. **Try Delete Again**
   - Now proceeds to file choice (Step 4)

---

## Visual Checks

### Subscription Cards:
- [ ] "Subscribe" button visible by default
- [ ] After subscribing: "Subscribe" hidden, "Switch Plan" and "Unsubscribe" visible
- [ ] After unsubscribing: Back to "Subscribe" only

### Modal Transitions:
- [ ] Smooth opening/closing animations
- [ ] Background overlay visible
- [ ] ESC key closes modals
- [ ] Click outside closes modals

### Form Validation:
- [ ] Cannot submit without selecting reason
- [ ] "Other" checkbox shows text input
- [ ] Password required for final confirmation
- [ ] File choice required before proceeding

---

## Expected Console Logs

When testing, check console for:
```
🔵 Opening Leave Astegni Modal...
✅ Leave Astegni Modal opened
📝 Leave reasons: ["tooExpensive", "other"] Custom reason text
📂 Files choice: download
🗑️ Account scheduled for deletion in 90 days
✅ Subscription & Leave Astegni: JavaScript loaded
```

---

## What to Look For

### ✅ Good Signs:
- Buttons change states correctly
- All modals open/close smoothly
- "Other" text input appears/disappears
- Subscription blocker prevents deletion
- 90-day message is clear and prominent
- File download option works
- Password fields reset on open

### ❌ Issues to Report:
- Buttons don't change after subscribe/unsubscribe
- Modals don't close
- "Other" text input doesn't appear
- Can delete account with active subscription
- Missing console logs
- ESC key doesn't work

---

## Quick Test Checklist

### Subscription Flow:
- [ ] Can open subscription modal
- [ ] Can subscribe to a plan
- [ ] Buttons change to Switch/Unsubscribe
- [ ] Can click "Unsubscribe"
- [ ] All 5 unsubscribe modals appear in order
- [ ] Can complete unsubscribe
- [ ] Buttons reset to "Subscribe"

### Switch Plan:
- [ ] "Switch Plan" button visible when subscribed
- [ ] Switch modal shows all plans
- [ ] Current plan is disabled
- [ ] Can switch to different plan
- [ ] Success message appears

### Delete Account (No Subscription):
- [ ] All 6 delete modals appear in order
- [ ] 90-day warning is clear
- [ ] File choice modal appears
- [ ] Download option shows alert
- [ ] Final modal auto-redirects

### Delete Account (With Subscription):
- [ ] Blocker modal appears at step 3
- [ ] Cannot proceed without unsubscribing
- [ ] After unsubscribe, can delete

---

## File Locations

**Main File**: `profile-pages/tutor-profile.html`
**Documentation**: `SUBSCRIPTION-LEAVE-ENHANCEMENT-COMPLETE.md`

---

## 🎉 Expected Results

After testing all flows, you should see:
1. ✅ Smooth 5-step unsubscribe process
2. ✅ Seamless plan switching
3. ✅ Instagram-like 90-day deletion policy
4. ✅ File download option before deletion
5. ✅ Subscription blocker working
6. ✅ All modals opening/closing correctly
7. ✅ Dynamic button states
8. ✅ Password confirmations
9. ✅ Reason collection working
10. ✅ Auto-redirect after deletion

---

**Ready to test!** Open the file and start clicking! 🚀
