// ============================================
// UTILITIES MANAGER
// ============================================
class Utils {
    static showToast(message, type = "info") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;

        const backgrounds = {
            success: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            error: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            info: "var(--primary-gradient, linear-gradient(135deg, #F59E0B 0%, #D97706 100%))",
        };

        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${backgrounds[type] || backgrounds.info};
            color: white;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInUp 0.3s ease, slideOutDown 0.3s ease 2.7s;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 500;
        `;

        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }

    static formatDate(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return "Today";
        if (days === 1) return "Yesterday";
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        return `${Math.floor(days / 30)} months ago`;
    }
}

// Export globally
window.Utils = Utils;

console.log("✅ Utils Manager loaded!");
