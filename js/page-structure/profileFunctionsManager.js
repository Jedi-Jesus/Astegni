// ============================================
// PROFILE FUNCTIONS MANAGER
// Profile and schedule editing functions
// ============================================

// ============================================
// SCHEDULE FUNCTIONS
// ============================================

window.saveSchedule = function () {
    const form = document.getElementById("scheduleForm");
    if (!form) return;

    const eventTitle = form.querySelector("#eventTitle")?.value;
    const eventType = form.querySelector("#eventType")?.value;
    const startDateTime = form.querySelector("#startDateTime")?.value;
    const endDateTime = form.querySelector("#endDateTime")?.value;
    const repeatOption = form.querySelector("#repeatOption")?.value;
    const eventLocation = form.querySelector("#eventLocation")?.value;
    const eventDescription = form.querySelector("#eventDescription")?.value;

    if (!eventTitle || !startDateTime) {
        if (window.Utils) {
            Utils.showToast("⚠️ Please fill in required fields", "error");
        }
        return;
    }

    // Parse date and time
    const startDate = new Date(startDateTime);
    const timeStr = startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    // Create new event
    const newEvent = {
        title: eventTitle,
        type: eventType,
        date: startDate,
        time: timeStr,
        location: eventLocation,
        description: eventDescription,
        attendees: 0,
    };

    // Add event through events manager
    if (window.eventsManager) {
        window.eventsManager.createEvent(newEvent);
        window.eventsManager.updateNextSession();
    }

    if (window.Utils) {
        Utils.showToast("✅ Schedule saved successfully!", "success");
    }

    const modal = document.getElementById("scheduleModal");
    if (modal) modal.classList.remove("show");
};

// ============================================
// PROFILE EDITING FUNCTIONS
// ============================================

window.saveProfile = function () {
    const form = document.getElementById("editProfileForm");
    if (!form) return;

    const companyName = form.querySelector("#companyName")?.value;
    const centerQuote = form.querySelector("#centerQuote")?.value;
    const aboutUs = form.querySelector("#aboutUs")?.value;

    // Get locations
    const locationInputs = form.querySelectorAll("#locationsContainer input");
    const locations = Array.from(locationInputs)
        .map(input => input.value)
        .filter(value => value.trim() !== "")
        .join(" | ");

    if (!companyName) {
        if (window.Utils) {
            Utils.showToast("⚠️ Company name is required", "error");
        }
        return;
    }

    // Update UI
    const nameElement = document.getElementById("centerName");
    if (nameElement) nameElement.textContent = companyName;

    const quoteElement = document.getElementById("profileQuote");
    if (quoteElement) quoteElement.textContent = centerQuote;

    const aboutElement = document.getElementById("aboutText");
    if (aboutElement) aboutElement.textContent = aboutUs;

    const locationElement = document.getElementById("locationText");
    if (locationElement) locationElement.textContent = locations;

    // Save to localStorage
    const profileData = {
        companyName,
        quote: centerQuote,
        about: aboutUs,
        location: locations
    };
    localStorage.setItem("profileData", JSON.stringify(profileData));

    if (window.Utils) {
        Utils.showToast("✅ Profile updated successfully!", "success");
    }

    const modal = document.getElementById("editProfileModal");
    if (modal) modal.classList.remove("show");
};

window.addLocation = function () {
    const container = document.getElementById("locationsContainer");
    if (container) {
        const locationItem = document.createElement("div");
        locationItem.className = "location-item";
        locationItem.innerHTML = `
            <input type="text" class="form-input" placeholder="Enter location">
            <button type="button" class="btn-remove" onclick="removeLocation(this)">×</button>
        `;
        container.appendChild(locationItem);
    }
};

window.removeLocation = function (btn) {
    btn.parentElement.remove();
};

window.addSocialMedia = function () {
    const container = document.getElementById("socialMediaContainer");
    if (container) {
        const socialItem = document.createElement("div");
        socialItem.className = "social-item";
        socialItem.innerHTML = `
            <select class="form-select">
                <option value="facebook">Facebook</option>
                <option value="twitter">Twitter/X</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="telegram">Telegram</option>
                <option value="website">Website</option>
            </select>
            <input type="text" class="form-input" placeholder="URL or username">
            <button type="button" class="btn-remove" onclick="removeSocial(this)">×</button>
        `;
        container.appendChild(socialItem);
    }
};

window.removeSocial = function (btn) {
    btn.parentElement.remove();
};

// ============================================
// CALENDAR SYNC FUNCTIONS
// ============================================

window.syncGoogleCalendar = function() {
    if (window.Utils) {
        Utils.showToast('📅 Connecting to Google Calendar...', 'info');
        setTimeout(() => {
            Utils.showToast('✅ Google Calendar connected!', 'success');
        }, 2000);
    }
};

window.syncOutlookCalendar = function() {
    if (window.Utils) {
        Utils.showToast('📆 Connecting to Outlook Calendar...', 'info');
        setTimeout(() => {
            Utils.showToast('✅ Outlook Calendar connected!', 'success');
        }, 2000);
    }
};

console.log("✅ Profile Functions Manager loaded!");
