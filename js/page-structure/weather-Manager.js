// ============================================
// WEATHER MANAGER - COMPLETE
// ============================================
class WeatherManager {
    constructor() {
        this.currentTheme = localStorage.getItem("weatherTheme") || "royal-blue";
        this.widget = null;
        this.weatherData = {
            temperature: 72,
            condition: "Sunny",
            high: 78,
            low: 65,
            humidity: 45,
            wind: 8,
            location: "Los Angeles, CA",
        };
        this.init();
    }

    init() {
        this.widget = document.querySelector(".weather-widget");
        if (this.widget) {
            this.applyTheme(this.currentTheme);
            this.startWeatherUpdates();
        }
    }

    showForecast() {
        Utils.showToast("🌤️ Opening extended forecast...", "info");

        let modal = document.getElementById("forecastModal");
        if (!modal) {
            modal = this.createForecastModal();
            document.body.appendChild(modal);
        }
        
        window.modalsManager.open("forecastModal");
    }

    createForecastModal() {
        const modal = document.createElement("div");
        modal.id = "forecastModal";
        modal.className = "modal";
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🌤️ 7-Day Weather Forecast</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="forecast-grid">
                        ${this.generateForecast()}
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    generateForecast() {
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const conditions = ["☀️", "⛅", "☁️", "🌧️", "⛈️"];

        return days
            .map((day) => {
                const condition = conditions[Math.floor(Math.random() * conditions.length)];
                const high = Math.floor(Math.random() * 10 + 70);
                const low = high - Math.floor(Math.random() * 10 + 5);

                return `
                <div class="forecast-card">
                    <h3>${day}</h3>
                    <div class="forecast-icon">${condition}</div>
                    <div class="forecast-temps">
                        <span class="temp-high">${high}°</span>
                        <span class="temp-low">${low}°</span>
                    </div>
                </div>
            `;
            })
            .join("");
    }

    toggleSettings() {
        const selector = document.getElementById("weatherThemeSelector");
        if (selector) {
            selector.classList.toggle("active");
        }
    }

    closeSettings() {
        const selector = document.getElementById("weatherThemeSelector");
        if (selector) {
            selector.classList.remove("active");
        }
    }

    changeTheme(themeName) {
        this.currentTheme = themeName;
        this.applyTheme(themeName);
        localStorage.setItem("weatherTheme", themeName);
        Utils.showToast(`🎨 Weather theme changed to ${themeName}`, "success");
    }

    applyTheme(themeName) {
        if (!this.widget) return;

        const themes = {
            "sky-blue": "linear-gradient(135deg, #87CEEB 0%, #2E7BC4 100%)",
            "royal-blue": "linear-gradient(135deg, #0d47a1 0%, #1e88e5 100%)",
            midnight: "linear-gradient(135deg, #0f2027 0%, #2c5364 100%)",
            sunset: "linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)",
            aurora: "linear-gradient(135deg, #667eea 0%, #f093fb 100%)",
            storm: "linear-gradient(135deg, #373B44 0%, #4286f4 100%)",
            forest: "linear-gradient(135deg, #134E5E 0%, #71B280 100%)",
            ocean: "linear-gradient(135deg, #1a237e 0%, #3f51b5 100%)",
            "purple-haze": "linear-gradient(135deg, #360033 0%, #0b8793 100%)",
            coral: "linear-gradient(135deg, #FF9A8B 0%, #FF99AC 100%)",
        };

        if (themes[themeName]) {
            this.widget.style.background = themes[themeName];
            this.widget.setAttribute("data-weather-theme", themeName);
        }
    }

    openCustomPicker() {
        const picker = document.getElementById("customColorPicker");
        if (picker) {
            picker.style.display = picker.style.display === "none" ? "block" : "none";
        }
    }

    applyCustomColors() {
        const startColor = document.getElementById("startColor")?.value;
        const endColor = document.getElementById("endColor")?.value;

        if (startColor && endColor) {
            const customGradient = `linear-gradient(135deg, ${startColor} 0%, ${endColor} 100%)`;

            if (this.widget) {
                this.widget.style.background = customGradient;
            }

            localStorage.setItem("customWeatherColors", JSON.stringify({
                start: startColor,
                end: endColor,
            }));

            document.getElementById("customColorPicker").style.display = "none";
            Utils.showToast("🎨 Custom weather theme applied!", "success");
        }
    }

    startWeatherUpdates() {
        // Update weather data every 10 minutes
        this.updateWeatherData();
        setInterval(() => this.updateWeatherData(), 600000);
    }

    updateWeatherData() {
        // Simulate weather data update
        const conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Clear"];
        const temps = [68, 72, 75, 70, 65];

        const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
        const randomTemp = temps[Math.floor(Math.random() * temps.length)];

        const tempElement = this.widget?.querySelector(".weather-temp");
        const conditionElement = this.widget?.querySelector(".weather-condition");

        if (tempElement) {
            tempElement.textContent = `${randomTemp}°F`;
        }
        if (conditionElement) {
            conditionElement.textContent = randomCondition;
        }
    }
}