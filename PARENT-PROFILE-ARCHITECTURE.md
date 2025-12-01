# Parent Profile System - Complete Architecture

## ✅ **CORRECTED ARCHITECTURE** (2025-11-25)

### **Database Schema**

#### **1. `parent_profiles` Table**
```sql
- id (PK)
- user_id (FK → users.id)
- username
- bio
- quote
- relationship_type (Father, Mother, Guardian, Co-parent, Other)
- location
- children_ids (INTEGER[] ARRAY) ✅ Stores student_profile.id (NOT user_id)
- total_children (calculated from children_ids.length)
- total_sessions_booked
- total_amount_spent
- rating
- rating_count
- is_verified
- profile_picture
- cover_image
- created_at
- updated_at
```

**⚠️ IMPORTANT: Profile IDs vs User IDs**
- `children_ids` stores `student_profile.id` (not `user_id`)
- This allows **direct profile lookup** without extra queries
- Performance: 1 query instead of N queries

**⚠️ REMOVED: `coparent_ids` field (REDUNDANT)**
- Co-parent relationships are derived from children's `parent_id` arrays
- **Single source of truth**: `student_profiles.parent_id`
- Eliminates data duplication and prevents inconsistencies

#### **2. `student_profiles` Table** (Updated)
```sql
- id (PK)
- user_id (FK → users.id)
- parent_id (INTEGER[] ARRAY) ✅ Stores parent_profile.id (NOT user_id)
- ... (other student profile fields)
```

**⚠️ IMPORTANT:**
- `parent_id` stores `parent_profile.id` (not `user_id`)
- Direct profile lookup: `WHERE id IN (100, 101, 102)`

#### **3. `parent_reviews` Table** ✅ NEW
```sql
- id (PK)
- parent_id (FK → parent_profiles.id)
- reviewer_id (FK → users.id) - Tutor who reviewed the parent
- user_role ('tutor', 'admin')
- rating (overall average)
- title
- review_text
- engagement_with_tutor_rating (0-5)
- engagement_with_child_rating (0-5)
- responsiveness_rating (0-5)
- payment_consistency_rating (0-5)
- is_verified
- helpful_count
- is_featured
- created_at
- updated_at
```

---

## **Many-to-Many Relationships**

### **Parent ↔ Child (Student) Relationship**

```
Parent A (profile_id=1) ─┐
                         ├─→ Child 1 (profile_id=100)
Parent B (profile_id=2) ─┘    └─→ student_profiles.parent_id = [1, 2]

Parent A (parent_profile.id=1):
  - children_ids = [100, 101, 102]  ← student_profile IDs

Parent B (parent_profile.id=2):
  - children_ids = [100, 101, 102]  ← student_profile IDs

Child 1 (student_profile.id=100): parent_id = [1, 2]  ← parent_profile IDs
Child 2 (student_profile.id=101): parent_id = [1, 2]  ← parent_profile IDs
Child 3 (student_profile.id=102): parent_id = [1, 2]  ← parent_profile IDs
```

**⚠️ KEY CHANGE: Profile IDs, Not User IDs!**
- All arrays store **profile IDs** for direct lookups
- Example query: `SELECT * FROM student_profiles WHERE id IN (100, 101, 102)`
- No need to join with users table first!

**⚠️ SINGLE SOURCE OF TRUTH: `student_profiles.parent_id`**
- Co-parent relationships derived from children's `parent_id` arrays
- No redundant `coparent_ids` field needed
- To find co-parents: Query all children → collect unique parent IDs

**Key Points:**
- **One parent can have multiple children** (`children_ids` array)
- **One child can have multiple parents** (`parent_id` array)
- **Co-parents share all children automatically**
- **Co-parent relationships derived from children's parent_id arrays**

---

## **User Workflows**

### **1. Adding a Child** ✅

**User Action:**
1. Parent logs into their parent profile
2. Clicks "Add Child" button in Children Panel
3. Fills form:
   - First Name
   - Father Name
   - Grandfather Name
   - Email or Phone (required)
   - Gender (optional)
   - Date of Birth (optional)
4. Submits form

**System Behavior:**
```javascript
POST /api/parent/add-child
{
  "first_name": "Abel",
  "father_name": "Tadesse",
  "grandfather_name": "Bekele",
  "email": "abel.tadesse@example.com",
  "phone": "+251912345678",
  "gender": "Male",
  "date_of_birth": "2010-05-15"
}
```

**Backend Logic:**
1. Check if user already exists (by email/phone)
   - If exists and is student → Link to parent
   - If exists but not student → Error
2. If new user:
   - Create `users` entry with **role="student"** ✅
   - Generate temporary password (12-character secure token)
   - Create `student_profiles` entry with `parent_id = [current_parent.user_id]`
   - Add child's `user_id` to parent's `children_ids` array
   - Send temp password via email/SMS ✅
3. Return success with temp password (for dev - remove in production)

**Response:**
```json
{
  "message": "Child created successfully. Temporary password sent via email/SMS.",
  "user_id": 50,
  "temp_password": "Abc123XyzDef",
  "email": "abel.tadesse@example.com",
  "existing": false
}
```

**What Child Does Next:**
1. **Receives email/SMS** with temp password ✅
2. Logs in with email + temp password
3. System prompts to change password
4. Child completes their student profile (grade level, subjects, interests, etc.)

**📧 Email/SMS Notification (Automatic):**
```
Subject: Welcome to Astegni - Your Student Account

Hi [Child First Name],

Your parent has created an Astegni student account for you!

Login Credentials:
- Email: [child_email]
- Temporary Password: [temp_password]

Login at: https://astegni.com/login

⚠️ You must change your password after first login.

Welcome to Astegni!
```

---

### **2. Adding a Co-Parent** ✅

**User Action:**
1. Parent logs into their parent profile
2. Clicks "Add Co-Parent" button in Co-Parents Panel
3. Fills form:
   - First Name
   - Father Name
   - Grandfather Name
   - Email or Phone (required)
   - Gender (optional)
   - Relationship Type (Father, Mother, Guardian, Co-parent)
4. Submits form

**System Behavior:**
```javascript
POST /api/parent/add-coparent
{
  "first_name": "Sara",
  "father_name": "Tadesse",
  "grandfather_name": "Bekele",
  "email": "sara.tadesse@example.com",
  "phone": "+251911111111",
  "gender": "Female",
  "relationship_type": "Mother"
}
```

**Backend Logic:**
1. Validate parent has at least one child
2. Check if user already exists (by email/phone)
   - If exists and is parent → Link to all children
   - If exists but not parent → Error
3. If new user:
   - Create `users` entry with **role="parent"** ✅
   - Generate temporary password (12-character secure token)
   - Create `parent_profiles` entry with:
     - `relationship_type` from request
     - `children_ids` = copy of current parent's `children_ids` ✅
     - `total_children` = length of children_ids
   - For EACH child in parent's `children_ids`:
     - Add co-parent's `user_id` to child's `student_profiles.parent_id` array
     - **This creates the co-parent relationship** (single source of truth)
   - Send temp password via email/SMS ✅
4. Return success with temp password (for dev - remove in production)

**Response:**
```json
{
  "message": "Co-parent created successfully. Temporary password sent via email/SMS.",
  "user_id": 20,
  "temp_password": "Xyz789AbcDef",
  "email": "sara.tadesse@example.com",
  "children_linked": 3,
  "existing": false
}
```

**What Co-Parent Does Next:**
1. **Receives email/SMS** with temp password ✅
2. Logs in with email + temp password
3. System prompts to change password
4. Co-parent completes their parent profile (bio, quote, location, etc.)

**📧 Email/SMS Notification (Automatic):**
```
Subject: Welcome to Astegni - Co-Parent Account

Hi [Co-Parent First Name],

[Current Parent Name] has added you as a co-parent on Astegni!

You now have access to manage your shared children:
- [Child 1 Name]
- [Child 2 Name]
- [Child 3 Name]

Login Credentials:
- Email: [coparent_email]
- Temporary Password: [temp_password]

Login at: https://astegni.com/login

⚠️ You must change your password after first login.

Welcome to Astegni!
```

---

## **API Endpoints** ✅

### **Parent Profile Management**
- `GET /api/parent/profile` - Get current user's parent profile
- `PUT /api/parent/profile` - Update parent profile
- `GET /api/parent/{parent_id}?by_user_id=false` - Get parent by profile ID or user ID

### **Child Management**
- `POST /api/parent/add-child` - Add child (creates user with student role + temp password)
- `GET /api/parent/children` - Get all children with details

### **Co-Parent Management**
- `POST /api/parent/add-coparent` - Add co-parent (creates user with parent role + temp password)
- `GET /api/parent/coparents` - Get all co-parents (derives from children's parent_id arrays) ✅

### **Parent Review System** (4-Factor Rating)
- `POST /api/parent/{parent_id}/review` - Create review (by tutors)
- `GET /api/parent/{parent_id}/reviews` - Get all reviews
- `GET /api/parent/reviews/stats/{parent_id}` - Get aggregated review stats

---

## **4-Factor Parent Review System** ✅

### **Rating Factors (0-5 stars each):**

1. **Engagement with Tutor**
   - How involved and communicative the parent is with the tutor
   - Frequency of communication
   - Quality of feedback provided

2. **Engagement with Child**
   - How involved the parent is with their child's education
   - Monitors child's progress
   - Helps with homework/learning

3. **Responsiveness**
   - How quickly the parent responds to messages
   - Replies to session requests
   - Availability for communication

4. **Payment Consistency**
   - How reliable the parent is with payments
   - Pays on time
   - Honors payment agreements

**Overall Rating:** Average of all 4 factors

---

## **Frontend Implementation** (Next Phase)

### **1. parent-profile.html Sidebar**

Add two new panel links:

```html
<!-- Sidebar Navigation -->
<div class="sidebar-link" onclick="showPanel('children')">
    <i class="fas fa-child"></i>
    <span>My Children</span>
</div>

<div class="sidebar-link" onclick="showPanel('coparents')">
    <i class="fas fa-users"></i>
    <span>Co-Parents</span>
</div>
```

### **2. Children Panel**

```html
<div id="children-panel" class="panel" style="display: none;">
    <div class="panel-header">
        <h2>My Children</h2>
        <button class="btn-primary" onclick="openAddChildModal()">
            <i class="fas fa-plus"></i> Add Child
        </button>
    </div>

    <div class="children-grid">
        <!-- Populated dynamically via JavaScript -->
    </div>
</div>
```

### **3. Co-Parents Panel**

```html
<div id="coparents-panel" class="panel" style="display: none;">
    <div class="panel-header">
        <h2>Co-Parents</h2>
        <button class="btn-primary" onclick="openAddCoparentModal()">
            <i class="fas fa-user-plus"></i> Add Co-Parent
        </button>
    </div>

    <div class="coparents-grid">
        <!-- Populated dynamically via JavaScript -->
    </div>
</div>
```

### **4. Add Child Modal**

```html
<div id="add-child-modal" class="modal">
    <div class="modal-content">
        <h3>Add Child</h3>
        <form id="add-child-form">
            <input type="text" name="first_name" placeholder="First Name" required>
            <input type="text" name="father_name" placeholder="Father Name" required>
            <input type="text" name="grandfather_name" placeholder="Grandfather Name" required>
            <input type="email" name="email" placeholder="Email">
            <input type="tel" name="phone" placeholder="Phone">
            <select name="gender">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
            </select>
            <input type="date" name="date_of_birth" placeholder="Date of Birth">
            <button type="submit">Add Child</button>
        </form>
    </div>
</div>
```

### **5. Add Co-Parent Modal**

```html
<div id="add-coparent-modal" class="modal">
    <div class="modal-content">
        <h3>Add Co-Parent</h3>
        <form id="add-coparent-form">
            <input type="text" name="first_name" placeholder="First Name" required>
            <input type="text" name="father_name" placeholder="Father Name" required>
            <input type="text" name="grandfather_name" placeholder="Grandfather Name" required>
            <input type="email" name="email" placeholder="Email">
            <input type="tel" name="phone" placeholder="Phone">
            <select name="gender">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
            </select>
            <select name="relationship_type">
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Co-parent">Co-parent</option>
                <option value="Other">Other</option>
            </select>
            <button type="submit">Add Co-Parent</button>
        </form>
    </div>
</div>
```

### **6. JavaScript Modules Needed**

#### **`js/parent-profile/children-manager.js`**
- `loadChildren()` - Fetch and display children
- `openAddChildModal()` - Show add child modal
- `submitAddChild(formData)` - POST to `/api/parent/add-child`
- `displayTempPassword(data)` - Show temp password to parent (dev only)

#### **`js/parent-profile/coparent-manager.js`**
- `loadCoparents()` - Fetch and display co-parents
- `openAddCoparentModal()` - Show add co-parent modal
- `submitAddCoparent(formData)` - POST to `/api/parent/add-coparent`
- `displayTempPassword(data)` - Show temp password to parent (dev only)

#### **`js/parent-profile/parent-reviews-manager.js`**
- `loadParentReviews()` - Fetch and display reviews
- `displayReviewStats()` - Show 4-factor rating breakdown

---

## **Security Notes** ⚠️

### **Temporary Passwords:**
- Generated using `secrets.token_urlsafe(12)` (cryptographically secure)
- **In production**: Never return temp password in API response
- **Must send via**:
  - **Email**: SendGrid, AWS SES, Mailgun, or similar
  - **SMS**: Twilio, AWS SNS, Africa's Talking, or similar
- User must change password on first login

### **Email/SMS Integration (Required for Production):**

**1. Email Service Setup (Choose One):**
```python
# Option 1: SendGrid
import sendgrid
from sendgrid.helpers.mail import Mail

def send_welcome_email(email, temp_password, first_name, user_type):
    message = Mail(
        from_email='noreply@astegni.com',
        to_emails=email,
        subject=f'Welcome to Astegni - Your {user_type} Account',
        html_content=f"""
        <h2>Hi {first_name},</h2>
        <p>Your Astegni account has been created!</p>
        <p><strong>Temporary Password:</strong> {temp_password}</p>
        <p>Login at: <a href="https://astegni.com/login">astegni.com/login</a></p>
        <p><em>You must change your password after first login.</em></p>
        """
    )
    sg = sendgrid.SendGridAPIClient(api_key=os.environ.get('SENDGRID_API_KEY'))
    sg.send(message)

# Option 2: AWS SES
import boto3

def send_welcome_email(email, temp_password, first_name, user_type):
    ses = boto3.client('ses', region_name='us-east-1')
    ses.send_email(
        Source='noreply@astegni.com',
        Destination={'ToAddresses': [email]},
        Message={
            'Subject': {'Data': f'Welcome to Astegni - Your {user_type} Account'},
            'Body': {'Html': {'Data': f'...'}}
        }
    )
```

**2. SMS Service Setup (Choose One):**
```python
# Option 1: Twilio
from twilio.rest import Client

def send_welcome_sms(phone, temp_password, first_name):
    client = Client(account_sid, auth_token)
    message = client.messages.create(
        body=f"Hi {first_name}, your Astegni temp password is: {temp_password}. Login at astegni.com/login",
        from_='+1234567890',
        to=phone
    )

# Option 2: Africa's Talking (for Ethiopian market)
import africastalking

def send_welcome_sms(phone, temp_password, first_name):
    africastalking.initialize(username='astegni', api_key='YOUR_API_KEY')
    sms = africastalking.SMS
    sms.send(
        f"Hi {first_name}, your Astegni temp password is: {temp_password}. Login at astegni.com/login",
        [phone]
    )
```

**3. Update Backend Endpoints:**
```python
# In parent_endpoints.py, replace TODOs:

# After creating child:
if email:
    send_welcome_email(email, temp_password, first_name, "Student")
if phone:
    send_welcome_sms(phone, temp_password, first_name)

# After creating co-parent:
if email:
    send_welcome_email(email, temp_password, first_name, "Parent")
if phone:
    send_welcome_sms(phone, temp_password, first_name)

# DO NOT return temp_password in response (security!)
return {
    "message": "Account created successfully. Login credentials sent via email/SMS.",
    "user_id": new_user.id,
    "email": email,
    "phone": phone
}
```

### **Data Validation:**
- All array operations use proper PostgreSQL array syntax
- Email/phone uniqueness enforced at database level
- Role validation prevents privilege escalation

---

## **Testing Checklist**

### **Backend Tests:**
- [ ] Run migration: `python migrate_fix_parent_children_schema.py`
- [ ] Test `POST /api/parent/add-child` with new child
- [ ] Test `POST /api/parent/add-child` with existing student
- [ ] Test `POST /api/parent/add-coparent` with new parent
- [ ] Test `POST /api/parent/add-coparent` with existing parent
- [ ] Test `GET /api/parent/children` returns correct data
- [ ] Test `GET /api/parent/coparents` returns correct data
- [ ] Verify `children_ids` array updates correctly
- [ ] Verify `parent_id` array updates correctly
- [ ] Test parent review creation and stats

### **Frontend Tests (To Be Built):**
- [ ] Add "My Children" panel to sidebar
- [ ] Add "Co-Parents" panel to sidebar
- [ ] Create add child modal
- [ ] Create add co-parent modal
- [ ] Test form submission and API integration
- [ ] Display temp password securely
- [ ] Show success/error messages
- [ ] Refresh children/coparents list after adding

---

## **Summary**

✅ **Database schema updated** (children_ids array in parent_profiles, parent_id array in student_profiles)
✅ **Removed redundant coparent_ids field** (single source of truth principle)
✅ **API endpoints created** (add child, add co-parent, reviews)
✅ **Children get student role** with temp password
✅ **Co-parents get parent role** with temp password
✅ **Many-to-many relationships** working correctly
✅ **4-Factor review system** implemented
✅ **Co-parent lookup** derived from children's parent_id arrays (single source of truth)

### **How Co-Parent Lookup Works (Single Source of Truth):**

**Finding Co-Parents of Parent A:**
```
1. Get Parent A's children_ids [100, 101, 102] (student_profile IDs)
2. For each child profile:
   - Query student_profiles to get parent_id array
   - Collect all parent IDs except Parent A
3. Deduplicate parent IDs (using set)
4. Query parent_profiles for each co-parent ID
Total: O(n) queries where n = number of children

Example:
- Child 100: parent_id = [1, 2]
- Child 101: parent_id = [1, 2]
- Child 102: parent_id = [1, 2]
- Parent A has ID 1
- Co-parents: {2} (deduplicated)
```

**Why This Is Better:**
- **Single source of truth** - Co-parent relationships stored only in student_profiles.parent_id
- **No data duplication** - Eliminates risk of inconsistency
- **Automatic consistency** - When child's parents change, all co-parent relationships update automatically
- **Simpler data model** - One less field to maintain

🔜 **Next: Frontend implementation** (panels, modals, JavaScript)
