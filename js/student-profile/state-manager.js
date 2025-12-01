// ============================================
// STUDENT PROFILE STATE MANAGER
// Centralized state management for student profile
// ============================================

const StudentProfileState = {
    studentProfile: null,

    // Set student profile
    setStudentProfile(profile) {
        this.studentProfile = profile;
        console.log('✅ Student profile set in state:', profile);
    },

    // Get student profile
    getStudentProfile() {
        return this.studentProfile;
    },

    // Update specific field
    updateField(field, value) {
        if (this.studentProfile) {
            this.studentProfile[field] = value;
        }
    },

    // Clear profile
    clearProfile() {
        this.studentProfile = null;
    }
};
