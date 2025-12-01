// ============================================
// NOTIFICATIONS MANAGER - FIXED
// ============================================
class NotificationsManager {
  constructor() {
    this.btn = document.querySelector(".notification-btn");
    this.modal = null;
    this.notifications = this.generateNotifications();
    this.init();
  }

  init() {
    if (this.btn) {
      this.btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.open();
      });
    }
    this.createModal();
    this.updateBadge();
  }

  generateNotifications() {
    return [
      {
        id: 1,
        type: "event",
        icon: "🎬",
        title: "Live Event Starting Soon",
        message:
          "Film Production Masterclass starts in 2 hours. 156 students attending.",
        time: "2 hours ago",
        unread: true,
        action: "Join Event",
      },
      {
        id: 2,
        type: "mention",
        icon: "💬",
        title: "New Comment on Your Course",
        message:
          'John Smith: "This course is amazing! The content quality is exceptional."',
        time: "3 hours ago",
        unread: true,
        action: "View Comment",
      },
      {
        id: 3,
        type: "courses",
        icon: "📚",
        title: "Course Update Available",
        message:
          "New materials added to Advanced Cinematography - Chapter 5: Lighting Techniques",
        time: "5 hours ago",
        unread: true,
        action: "View Course",
      },
      {
        id: 4,
        type: "system",
        icon: "🔔",
        title: "New Feature Available",
        message: "Check out the new analytics dashboard for better insights",
        time: "1 day ago",
        unread: false,
        action: "Learn More",
      },
      {
        id: 5,
        type: "social",
        icon: "👥",
        title: "New Followers",
        message: "You have 25 new followers this week",
        time: "2 days ago",
        unread: false,
        action: "View Followers",
      },
    ];
  }

  createModal() {
    if (!document.getElementById("notificationsModal")) {
      const modal = document.createElement("div");
      modal.id = "notificationsModal";
      modal.className = "modal";
      modal.innerHTML = this.getModalHTML();
      document.body.appendChild(modal);
      this.modal = modal;
      this.attachModalEvents();
    }
  }

  getModalHTML() {
    return `
            <div class="modal-overlay" onclick="window.notificationsManager.close()"></div>
            <div class="modal-content notifications-modal">
                <div class="modal-header">
                    <h2>
                        <span style="font-size: 1.5rem;">🔔</span>
                        Notifications
                        <span class="notification-count">${
                          this.notifications.filter((n) => n.unread).length
                        } new</span>
                    </h2>
                    <button class="modal-close" onclick="window.notificationsManager.close()">×</button>
                </div>
                <div class="modal-body">
                    <div class="notifications-tabs">
                        <button class="notification-tab active" data-filter="all">All</button>
                        <button class="notification-tab" data-filter="unread">Unread</button>
                        <button class="notification-tab" data-filter="mentions">Mentions</button>
                        <button class="notification-tab" data-filter="events">Events</button>
                    </div>
                    <div class="notifications-list">
                        ${this.renderNotifications()}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="window.notificationsManager.markAllRead()">Mark All as Read</button>
                    <button class="btn-primary" onclick="window.notificationsManager.openSettings()">
                        <span>⚙️</span> Settings
                    </button>
                </div>
            </div>
        `;
  }

  renderNotifications() {
    return this.notifications
      .map(
        (notif, index) => `
            <div class="notification-item ${
              notif.unread ? "unread" : ""
            }" data-type="${notif.type}" data-id="${notif.id}">
                <div class="notification-icon">${notif.icon}</div>
                <div class="notification-content">
                    <h4>${notif.title}</h4>
                    <p>${notif.message}</p>
                    <div class="notification-footer">
                        <span class="notification-time">⏰ ${notif.time}</span>
                        ${
                          notif.action
                            ? `<button class="notification-action-link" onclick="window.notificationsManager.handleAction(${notif.id}, '${notif.action}')">${notif.action}</button>`
                            : ""
                        }
                    </div>
                </div>
                <div class="notification-actions">
                    ${notif.unread ? '<span class="unread-dot"></span>' : ""}
                    <button class="notification-action-btn" onclick="window.notificationsManager.dismiss(${
                      notif.id
                    })">×</button>
                </div>
            </div>
        `
      )
      .join("");
  }

  attachModalEvents() {
    if (!this.modal) return;

    this.modal.querySelectorAll(".notification-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        this.filterNotifications(e.target.dataset.filter);
        this.modal
          .querySelectorAll(".notification-tab")
          .forEach((t) => t.classList.remove("active"));
        e.target.classList.add("active");
      });
    });
  }

  filterNotifications(filter) {
    const items = this.modal.querySelectorAll(".notification-item");
    items.forEach((item) => {
      if (filter === "all") {
        item.style.display = "flex";
      } else if (filter === "unread") {
        item.style.display = item.classList.contains("unread")
          ? "flex"
          : "none";
      } else {
        item.style.display = item.dataset.type === filter ? "flex" : "none";
      }
    });
  }

  handleAction(notifId, action) {
    const notification = this.notifications.find((n) => n.id === notifId);

    switch (action) {
      case "Join Event":
        this.close();
        Utils.showToast("🎬 Joining the live event...", "success");
        setTimeout(() => {
          window.location.href = "#live-event";
        }, 1000);
        break;
      case "View Comment":
        this.close();
        window.commentsManager.open();
        break;
      case "View Course":
        this.close();
        Utils.showToast("📚 Opening course materials...", "info");
        break;
      case "Learn More":
        this.close();
        window.analyticsManager.openModal();
        break;
      case "View Followers":
        this.close();
        window.followersManager.open("followers");
        break;
    }

    // Mark as read
    this.markAsRead(notifId);
  }

  markAsRead(notifId) {
    const notification = this.notifications.find((n) => n.id === notifId);
    if (notification) {
      notification.unread = false;
      this.updateNotificationItem(notifId);
      this.updateBadge();
    }
  }

  updateNotificationItem(notifId) {
    const item = this.modal?.querySelector(
      `.notification-item[data-id="${notifId}"]`
    );
    if (item) {
      item.classList.remove("unread");
      const dot = item.querySelector(".unread-dot");
      if (dot) dot.remove();
    }
  }

  updateBadge() {
    const badge = document.querySelector(".notification-badge");
    const unreadCount = this.notifications.filter((n) => n.unread).length;

    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    }

    // Update modal count
    const modalCount = this.modal?.querySelector(".notification-count");
    if (modalCount) {
      modalCount.textContent = `${unreadCount} new`;
    }
  }

  dismiss(notifId) {
    const index = this.notifications.findIndex((n) => n.id === notifId);
    if (index !== -1) {
      this.notifications.splice(index, 1);

      const item = this.modal?.querySelector(
        `.notification-item[data-id="${notifId}"]`
      );
      if (item) {
        item.style.animation = "slideOutRight 0.3s ease";
        setTimeout(() => item.remove(), 300);
      }

      this.updateBadge();
      Utils.showToast("Notification dismissed", "info");
    }
  }

  markAllRead() {
    this.notifications.forEach((n) => (n.unread = false));
    this.modal.querySelectorAll(".notification-item.unread").forEach((item) => {
      item.classList.remove("unread");
      const dot = item.querySelector(".unread-dot");
      if (dot) dot.remove();
    });
    this.updateBadge();
    Utils.showToast("✅ All notifications marked as read", "success");
  }

  openSettings() {
    this.close();
    Utils.showToast("⚙️ Opening notification settings...", "info");
  }

  open() {
    if (this.modal) {
      this.modal.classList.add("show");
      this.modal.style.display = "flex";
      // Remove pulse from badge
      const badge = document.querySelector(".notification-badge");
      if (badge) badge.classList.remove("pulse");
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove("show");
      setTimeout(() => {
        this.modal.style.display = "none";
      }, 300);
    }
  }
}
