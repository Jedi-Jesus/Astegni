// ============================================
// WIDGETS MANAGER
// ============================================
class WidgetsManager {
    constructor() {
        this.initNews();
        this.initMarket();
    }

    initNews() {
        setInterval(() => {
            this.changeNews(1);
        }, 5000);
    }

    initMarket() {
        setInterval(() => {
            document.querySelectorAll(".rate[data-value]").forEach((el) => {
                const value = parseFloat(
                    el.dataset.value || el.textContent.replace(/[^0-9.-]/g, "")
                );
                const variation = (Math.random() - 0.5) * value * 0.002;
                const newValue = value + variation;

                if (el.textContent.includes("$")) {
                    el.textContent = `${newValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}`;
                } else {
                    el.textContent = newValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    });
                }

                const changeEl = el.nextElementSibling;
                if (changeEl && changeEl.classList.contains("change")) {
                    const changeValue = (Math.random() - 0.5) * 2;
                    changeEl.textContent = `${changeValue > 0 ? "↑" : "↓"} ${Math.abs(
                        changeValue
                    ).toFixed(2)}%`;
                    changeEl.className = `change ${changeValue > 0 ? "up" : "down"}`;
                }
            });
        }, CONFIG.realtime.updateInterval);
    }

    changeNews(direction) {
        const cards = document.querySelectorAll(".news-card");
        if (cards.length === 0) return;

        let activeIndex = Array.from(cards).findIndex((card) =>
            card.classList.contains("active")
        );
        if (activeIndex === -1) activeIndex = 0;

        cards[activeIndex].classList.remove("active");
        activeIndex = (activeIndex + direction + cards.length) % cards.length;
        cards[activeIndex].classList.add("active");

        document.querySelectorAll(".news-dot").forEach((dot, i) => {
            dot.classList.toggle("active", i === activeIndex);
        });
    }
}
