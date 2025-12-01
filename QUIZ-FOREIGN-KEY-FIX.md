# Quiz Foreign Key Error - FIXED

## Problem
Quiz creation was failing with error:
```
Error creating quiz: insert or update on table "quizzes" violates foreign key constraint "quizzes_student_id_fkey"
DETAIL:  Key (student_id)=(2) is not present in table "users".
```

## Root Cause
The `js/tutor-profile/quiz-manager.js` file had hardcoded student IDs (1-4) that don't exist in the database:

```javascript
// OLD - Non-existent IDs
this.students = [
    { id: 1, name: "Abebe Kebede", ... },
    { id: 2, name: "Almaz Tadesse", ... },
    { id: 3, name: "Dawit Haile", ... },
    { id: 4, name: "Eden Mekonnen", ... }
];
```

When creating a quiz, the frontend sends `student_id: 2` (or 1, 3, 4) to the backend, which violates the foreign key constraint since these user IDs don't exist in the `users` table.

## Actual Students in Database
```
ID: 112 - admin_test@astegni.com (student)
ID: 98  - student@example.com (multi-role)
ID: 93  - tigist@example.com (student)
ID: 94  - dawit@example.com (student)
ID: 95  - helen@example.com (student)
ID: 96  - michael@example.com (student)
ID: 97  - ruth@example.com (student)
```

## Solution Applied
Updated `js/tutor-profile/quiz-manager.js` line 18-25 to use real student IDs:

```javascript
// FIXED - Real student IDs from database
this.students = [
    { id: 112, name: "Abebe Kebede", profilePic: "../uploads/system_images/system_profile_pictures/student-college-boy.jpg" },
    { id: 93, name: "Tigist Mekonnen", profilePic: "../uploads/system_images/system_profile_pictures/student-college-girl.jpg" },
    { id: 94, name: "Dawit Alemayehu", profilePic: "../uploads/system_images/system_profile_pictures/student-teenage-boy.jpg" },
    { id: 95, name: "Helen Bekele", profilePic: "../uploads/system_images/system_profile_pictures/student-teenage-girl.jpg" },
    { id: 98, name: "J (Multi-role)", profilePic: "../uploads/system_images/system_profile_pictures/student-kid-boy.jpg" }
];
```

## Testing
1. **Refresh the tutor profile page** in your browser (Ctrl+F5 for hard refresh)
2. Click on the **"Quiz"** card to open the quiz modal
3. Select a student from the dropdown (they now have real IDs)
4. Create a quiz with questions
5. Click "Save" or "Post" - should work without foreign key errors!

## Future Improvement
Instead of hardcoded student IDs, load students dynamically from an API endpoint:

```javascript
// Recommended approach (for future implementation)
async loadStudents() {
    try {
        const response = await this.apiRequest('/api/students/my-students');
        this.students = response.students;
        this.renderStudentDropdown();
    } catch (error) {
        console.error('Error loading students:', error);
        // Fall back to current hardcoded list
    }
}
```

This would require a new backend endpoint that returns the tutor's enrolled students.

## Files Changed
- [js/tutor-profile/quiz-manager.js:18-25](js/tutor-profile/quiz-manager.js#L18-L25) - Updated student IDs

## Related Files
- `astegni-backend/quiz_endpoints.py` - Backend quiz API
- `astegni-backend/migrate_create_quiz_tables.py` - Database schema
- `QUIZ-QUICK-START.md` - Quiz system documentation
