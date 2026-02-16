/**
 * Global Currency Utility
 *
 * Provides currency detection and symbol mapping across all pages.
 * Auto-detects user's currency from their GPS location and displays
 * prices in their local currency symbol.
 *
 * Usage:
 *   await CurrencyManager.initialize();
 *   const symbol = CurrencyManager.getSymbol(); // Returns '$' for USD, 'Br' for ETB, etc.
 *   const currency = CurrencyManager.getCurrency(); // Returns 'USD', 'ETB', etc.
 *
 * @author Claude Code
 * @version 2.1.0
 * @date 2026-01-22
 */

const CurrencyManager = {
    userCurrency: null,
    userCurrencySymbol: null,
    initialized: false,

    /**
     * Initialize currency detection
     * Call this once when page loads
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            await this.fetchUserCurrency();
            this.initialized = true;
            console.log(`[CurrencyManager] Initialized with ${this.userCurrency} (${this.userCurrencySymbol})`);

            // Update widget currency symbols on page
            this.updateWidgetCurrencySymbols();
        } catch (error) {
            console.error('[CurrencyManager] Failed to initialize:', error);
            this.setDefaultCurrency();
        }
    },

    /**
     * Fetch user's currency from backend
     */
    async fetchUserCurrency() {
        const token = localStorage.getItem('access_token');

        if (!token) {
            console.log('[CurrencyManager] User not logged in, using default ETB');
            this.setDefaultCurrency();
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/api/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const userData = await response.json();
            this.userCurrency = userData.currency || 'ETB';
            this.userCurrencySymbol = this.getCurrencySymbol(this.userCurrency);

            console.log(`[CurrencyManager] User currency set to: ${this.userCurrency} (${this.userCurrencySymbol})`);
        } catch (error) {
            console.error('[CurrencyManager] Failed to fetch user data:', error);
            this.setDefaultCurrency();
        }
    },

    /**
     * Set default currency (ETB for Ethiopian market)
     */
    setDefaultCurrency() {
        this.userCurrency = 'ETB';
        this.userCurrencySymbol = 'Br';
    },

    /**
     * Get user's currency code
     * @returns {string} Currency code (e.g., 'USD', 'ETB', 'EUR')
     */
    getCurrency() {
        return this.userCurrency || 'ETB';
    },

    /**
     * Get user's currency symbol
     * @returns {string} Currency symbol (e.g., '$', 'Br', '€')
     */
    getSymbol() {
        return this.userCurrencySymbol || 'Br';
    },

    /**
     * Format price with currency symbol
     * @param {number} price - Price amount
     * @returns {string} Formatted price (e.g., '$100', 'Br500')
     */
    formatPrice(price) {
        const symbol = this.getSymbol();
        return `${symbol}${price}`;
    },

    /**
     * Map currency code to symbol
     * Supports 120+ currencies worldwide
     */
    getCurrencySymbol(currencyCode) {
        const symbols = {
            // Major currencies (10)
            'ETB': 'Br',      // Ethiopian Birr
            'USD': '$',       // US Dollar
            'EUR': '€',       // Euro
            'GBP': '£',       // British Pound
            'JPY': '¥',       // Japanese Yen
            'CNY': '¥',       // Chinese Yuan
            'INR': '₹',       // Indian Rupee
            'CAD': 'C$',      // Canadian Dollar
            'AUD': 'A$',      // Australian Dollar
            'CHF': 'CHF',     // Swiss Franc

            // African currencies (25)
            'NGN': '₦',       // Nigerian Naira
            'ZAR': 'R',       // South African Rand
            'KES': 'KSh',     // Kenyan Shilling
            'GHS': 'GH₵',     // Ghanaian Cedi
            'EGP': 'E£',      // Egyptian Pound
            'TZS': 'TSh',     // Tanzanian Shilling
            'UGX': 'USh',     // Ugandan Shilling
            'MAD': 'DH',      // Moroccan Dirham
            'DZD': 'DA',      // Algerian Dinar
            'TND': 'DT',      // Tunisian Dinar
            'AOA': 'Kz',      // Angolan Kwanza
            'BWP': 'P',       // Botswana Pula
            'MUR': '₨',       // Mauritian Rupee
            'ZMW': 'ZK',      // Zambian Kwacha
            'ZWL': 'Z$',      // Zimbabwean Dollar
            'MWK': 'MK',      // Malawian Kwacha
            'MZN': 'MT',      // Mozambican Metical
            'NAD': 'N$',      // Namibian Dollar
            'RWF': 'FRw',     // Rwandan Franc
            'SLL': 'Le',      // Sierra Leonean Leone
            'SOS': 'Sh',      // Somali Shilling
            'XAF': 'FCFA',    // Central African CFA Franc
            'XOF': 'CFA',     // West African CFA Franc
            'SCR': '₨',       // Seychellois Rupee
            'GMD': 'D',       // Gambian Dalasi

            // Americas (22)
            'BRL': 'R$',      // Brazilian Real
            'MXN': '$',       // Mexican Peso
            'ARS': '$',       // Argentine Peso
            'COP': '$',       // Colombian Peso
            'CLP': '$',       // Chilean Peso
            'PEN': 'S/',      // Peruvian Sol
            'VES': 'Bs',      // Venezuelan Bolívar
            'BOB': 'Bs',      // Bolivian Boliviano
            'PYG': '₲',       // Paraguayan Guaraní
            'UYU': '$U',      // Uruguayan Peso
            'CRC': '₡',       // Costa Rican Colón
            'PAB': 'B/.',     // Panamanian Balboa
            'GTQ': 'Q',       // Guatemalan Quetzal
            'HNL': 'L',       // Honduran Lempira
            'NIO': 'C$',      // Nicaraguan Córdoba
            'DOP': 'RD$',     // Dominican Peso
            'JMD': 'J$',      // Jamaican Dollar
            'TTD': 'TT$',     // Trinidad and Tobago Dollar
            'BBD': 'Bds$',    // Barbadian Dollar
            'BSD': 'B$',      // Bahamian Dollar
            'BZD': 'BZ$',     // Belize Dollar
            'XCD': 'EC$',     // East Caribbean Dollar

            // European currencies (18)
            'SEK': 'kr',      // Swedish Krona
            'NOK': 'kr',      // Norwegian Krone
            'DKK': 'kr',      // Danish Krone
            'PLN': 'zł',      // Polish Złoty
            'CZK': 'Kč',      // Czech Koruna
            'HUF': 'Ft',      // Hungarian Forint
            'RON': 'lei',     // Romanian Leu
            'BGN': 'лв',      // Bulgarian Lev
            'RSD': 'дин',     // Serbian Dinar
            'ISK': 'kr',      // Icelandic Króna
            'HRK': 'kn',      // Croatian Kuna
            'UAH': '₴',       // Ukrainian Hryvnia
            'BAM': 'KM',      // Bosnia-Herzegovina Convertible Mark
            'MKD': 'ден',     // Macedonian Denar
            'ALL': 'L',       // Albanian Lek
            'GEL': '₾',       // Georgian Lari
            'MDL': 'L',       // Moldovan Leu
            'BYN': 'Br',      // Belarusian Ruble

            // Asian currencies (25)
            'KRW': '₩',       // South Korean Won
            'SGD': 'S$',      // Singapore Dollar
            'MYR': 'RM',      // Malaysian Ringgit
            'THB': '฿',       // Thai Baht
            'VND': '₫',       // Vietnamese Dong
            'PHP': '₱',       // Philippine Peso
            'IDR': 'Rp',      // Indonesian Rupiah
            'PKR': '₨',       // Pakistani Rupee
            'BDT': '৳',       // Bangladeshi Taka
            'LKR': 'Rs',      // Sri Lankan Rupee
            'MMK': 'K',       // Myanmar Kyat
            'KHR': '៛',       // Cambodian Riel
            'LAK': '₭',       // Lao Kip
            'NPR': '₨',       // Nepalese Rupee
            'BTN': 'Nu.',     // Bhutanese Ngultrum
            'MVR': 'Rf',      // Maldivian Rufiyaa
            'AFN': '؋',       // Afghan Afghani
            'KZT': '₸',       // Kazakhstani Tenge
            'UZS': 'soʻm',    // Uzbekistani Som
            'TJS': 'ЅМ',      // Tajikistani Somoni
            'KGS': 'с',       // Kyrgyzstani Som
            'TMT': 'T',       // Turkmenistani Manat
            'MNT': '₮',       // Mongolian Tögrög
            'BND': 'B$',      // Brunei Dollar
            'TWD': 'NT$',     // New Taiwan Dollar

            // Middle East (13)
            'SAR': 'SR',      // Saudi Riyal
            'AED': 'DH',      // UAE Dirham
            'ILS': '₪',       // Israeli New Shekel
            'IQD': 'ID',      // Iraqi Dinar
            'IRR': '﷼',       // Iranian Rial
            'JOD': 'JD',      // Jordanian Dinar
            'KWD': 'KD',      // Kuwaiti Dinar
            'LBP': 'LL',      // Lebanese Pound
            'OMR': 'OMR',     // Omani Rial
            'QAR': 'QR',      // Qatari Riyal
            'SYP': '£S',      // Syrian Pound
            'YER': 'YR',      // Yemeni Rial
            'BHD': 'BD',      // Bahraini Dinar

            // Oceania (7)
            'NZD': 'NZ$',     // New Zealand Dollar
            'PGK': 'K',       // Papua New Guinean Kina
            'FJD': 'FJ$',     // Fijian Dollar
            'SBD': 'SI$',     // Solomon Islands Dollar
            'VUV': 'VT',      // Vanuatu Vatu
            'WST': 'WS$',     // Samoan Tālā
            'TOP': 'T$'       // Tongan Paʻanga
        };

        return symbols[currencyCode] || currencyCode;
    },

    /**
     * Update widget currency symbols on the page
     * Updates all elements with class 'earnings-currency-symbol'
     */
    updateWidgetCurrencySymbols() {
        const currencyCode = this.getCurrency();
        const currencySymbol = this.getSymbol();

        // Update earnings widget currency symbols (by ID)
        const earningsSymbol = document.getElementById('earnings-currency-symbol');
        if (earningsSymbol) {
            earningsSymbol.textContent = currencySymbol;
        }

        // Update user profile earnings widget (has different ID)
        const earningsSymbolUser = document.getElementById('earnings-currency-symbol-user');
        if (earningsSymbolUser) {
            earningsSymbolUser.textContent = currencySymbol;
        }

        // Update all elements with class 'earnings-currency' (new pattern)
        const earningsCurrencyElements = document.querySelectorAll('.earnings-currency');
        earningsCurrencyElements.forEach(el => {
            el.textContent = currencySymbol;
        });

        // Update all elements with class 'stat-currency'
        const statCurrencyElements = document.querySelectorAll('.stat-currency');
        statCurrencyElements.forEach(el => {
            el.textContent = currencySymbol;
        });

        console.log(`[CurrencyManager] Updated ${earningsCurrencyElements.length + statCurrencyElements.length + 2} currency symbols to ${currencyCode} (${currencySymbol})`);
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CurrencyManager.initialize();
    });
} else {
    CurrencyManager.initialize();
}
