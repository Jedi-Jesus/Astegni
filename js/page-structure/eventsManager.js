
// ============================================
// EVENTS MANAGER - FIXED
// ============================================
class EventsManager {
    constructor() {
        this.events = [];
        this.loadEvents();
        this.init();
    }

    init() {
        this.attachEventHandlers();
        this.updateWidget();
    }

    attachEventHandlers() {
        // Join Event button handlers
        document.addEventListener("click", (e) => {
            if (
                e.target.classList.contains("btn-join-inline") ||
                e.target.closest(".btn-join-inline")
            ) {
                this.joinEvent();
            }
        });
    }

joinEvent(event) {  // Add event parameter
    Utils.showToast("🎬 Joining the event...", "info");

    setTimeout(() => {
        Utils.showToast("✅ Successfully joined the event!", "success");

        // Update button - fix the event reference
        const btn = event && event.target ? event.target : document.querySelector('.btn-join-inline');
        if (btn) {
            btn.textContent = "Joined";
            btn.disabled = true;
            btn.style.background = "#10b981";
        }
    }, 1000);
}

    createEvent(eventData) {
        const event = {
            id: Date.now(),
            title: eventData.title || "New Event",
            type: eventData.type || "event",
            date: eventData.date || new Date(),
            time: eventData.time || "10:00 AM",
            location: eventData.location || "Online",
            description: eventData.description || "",
            attendees: eventData.attendees || 0,
            status: "upcoming",
            color: this.getEventTypeColor(eventData.type),
            icon: this.getEventTypeIcon(eventData.type),
            createdAt: new Date(),
        };

        this.events.push(event);
        this.saveEvents();
        this.updateWidget();
        this.updateNextSession();
        Utils.showToast("✅ Event created successfully!", "success");
        return event;
    }

    updateNextSession() {
        const nextEvent = this.getNextEvent();
        if (nextEvent) {
            const sessionElement = document.getElementById("nextSessionText");
            if (sessionElement) {
                const timeUntil = this.getTimeUntilEvent(nextEvent);
                sessionElement.innerHTML = `<strong class="gradient-text">Next Event:</strong> ${nextEvent.title} - ${this.formatEventDate(nextEvent)} (${timeUntil}) - ${nextEvent.attendees || 0} attending`;
            }
        }
    }

    getNextEvent() {
        const now = new Date();
        const upcomingEvents = this.events
            .filter(event => new Date(event.date) >= now)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        return upcomingEvents[0];
    }

    getTimeUntilEvent(event) {
        const now = new Date();
        const eventDate = new Date(event.date);
        const diff = eventDate - now;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours < 24) {
            return `Live in ${hours}h ${minutes}m`;
        } else {
            const days = Math.floor(hours / 24);
            return `In ${days} day${days > 1 ? 's' : ''}`;
        }
    }

    formatEventDate(event) {
        const date = new Date(event.date);
        const today = new Date();
        
        if (date.toDateString() === today.toDateString()) {
            return `Today at ${event.time}`;
        }
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === tomorrow.toDateString()) {
            return `Tomorrow at ${event.time}`;
        }
        
        return `${date.toLocaleDateString()} at ${event.time}`;
    }

    updateWidget() {
        const eventsList = document.querySelector(".events-list");
        if (!eventsList) return;

        const upcomingEvents = this.events
            .filter((event) => new Date(event.date) >= new Date())
            .slice(0, 3);

        if (upcomingEvents.length === 0) {
            eventsList.innerHTML = `
                <div class="no-events-placeholder">
                    <span class="placeholder-icon">📅</span>
                    <p>No upcoming events</p>
                    <button class="btn-create-event-small" onclick="window.eventsManager.showCreateEventModal()">
                        Create Event
                    </button>
                </div>
            `;
            return;
        }

        eventsList.innerHTML = upcomingEvents
            .map((event, index) => {
                const eventDate = new Date(event.date);
                const isToday = this.isToday(eventDate);
                const isLive = this.isEventLive(event);

                return `
                <div class="event-item animated-entry" style="animation: slideInLeft ${0.2 * (index + 1)}s ease-out;">
                    <div class="event-date ${isToday ? "today" : ""} ${isLive ? "live" : ""}">
                        <span class="date-day">${eventDate.getDate()}</span>
                        <span class="date-month">${eventDate
                        .toLocaleString("default", { month: "short" })
                        .toUpperCase()}</span>
                        ${isLive ? '<span class="live-indicator">LIVE</span>' : ""}
                    </div>
                    <div class="event-details">
                        <h4>${event.title}</h4>
                        <p>${event.description || event.type}</p>
                        <div class="event-meta">
                            <span class="event-time">🕐 ${event.time}</span>
                            ${event.location ? `<span class="event-location">📍 ${event.location}</span>` : ""}
                            ${event.attendees > 0 ? `<span class="event-attendees">👥 ${event.attendees} attending</span>` : ""}
                        </div>
                    </div>
                </div>
            `;
            })
            .join("");
        
        // Also update the next session display
        this.updateNextSession();
    }

    saveEvents() {
        localStorage.setItem("zenithEvents", JSON.stringify(this.events));
    }

    loadEvents() {
        const saved = localStorage.getItem("zenithEvents");
        if (saved) {
            this.events = JSON.parse(saved);
        } else {
            this.events = this.getDefaultEvents();
        }
    }

    getDefaultEvents() {
        const today = new Date();
        return [
            {
                id: "default1",
                title: "Film Production Masterclass",
                type: "class",
                date: new Date(today.getTime() + 86400000 * 2),
                time: "2:00 PM",
                location: "Online - Zoom",
                description: "Advanced techniques in film production",
                attendees: 156,
                icon: "🎬",
            },
            {
                id: "default2",
                title: "Industry Networking Event",
                type: "networking",
                date: new Date(today.getTime() + 86400000 * 5),
                time: "6:00 PM",
                location: "Conference Hall",
                description: "Meet industry professionals",
                attendees: 89,
                icon: "🤝",
            },
        ];
    }

    getEventTypeColor(type) {
        const colors = {
            class: "#10b981",
            workshop: "#f59e0b",
            webinar: "#3b82f6",
            meeting: "#8b5cf6",
            conference: "#ef4444",
            screening: "#ec4899",
            networking: "#14b8a6",
        };
        return colors[type] || "#6b7280";
    }

    getEventTypeIcon(type) {
        const icons = {
            class: "📚",
            workshop: "🔧",
            webinar: "💻",
            meeting: "👥",
            conference: "🎤",
            screening: "🎬",
            networking: "🤝",
        };
        return icons[type] || "📅";
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    isEventLive(event) {
        const now = new Date();
        const eventStart = new Date(event.date + " " + event.time);
        const eventEnd = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);
        return now >= eventStart && now <= eventEnd;
    }
}
