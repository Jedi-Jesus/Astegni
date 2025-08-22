// Yeneta Exchange - Professional Trading Interface JavaScript

// Ethiopian Stock Exchange Data
const esxStocks = {
    banking: [
        { symbol: 'CBE', name: 'Commercial Bank of Ethiopia', price: 1234.50, change: 2.3, sector: 'Banking' },
        { symbol: 'COOP', name: 'Cooperative Bank of Oromia', price: 856.75, change: 1.8, sector: 'Banking' },
        { symbol: 'OIB', name: 'Oromia International Bank', price: 923.40, change: -0.5, sector: 'Banking' },
        { symbol: 'DB', name: 'Dashen Bank', price: 1567.80, change: 3.2, sector: 'Banking' },
        { symbol: 'AIB', name: 'Awash International Bank', price: 2134.60, change: 1.9, sector: 'Banking' },
        { symbol: 'NIB', name: 'Nib International Bank', price: 1789.30, change: -1.2, sector: 'Banking' },
        { symbol: 'BOA', name: 'Bank of Abyssinia', price: 1456.90, change: 2.7, sector: 'Banking' },
        { symbol: 'BB', name: 'Birhan Bank', price: 678.45, change: 4.1, sector: 'Banking' },
        { symbol: 'WB', name: 'Wegagen Bank', price: 1123.70, change: 0.8, sector: 'Banking' },
        { symbol: 'TB', name: 'Tsedey Bank', price: 534.20, change: -2.3, sector: 'Banking' },
        { symbol: 'DGB', name: 'Debub Global Bank', price: 867.50, change: 1.5, sector: 'Banking' }
    ],
    telecom: [
        { symbol: 'ETHTEL', name: 'Ethio Telecom', price: 3456.70, change: 5.2, sector: 'Telecom' },
        { symbol: 'SAFETH', name: 'Safaricom Ethiopia', price: 2890.45, change: 3.8, sector: 'Telecom' }
    ],
    agriculture: [
        { symbol: 'ECOFF', name: 'Ethiopian Coffee Export', price: 456.30, change: 2.1, sector: 'Agriculture' },
        { symbol: 'ESES', name: 'Ethiopian Sesame Trading', price: 234.50, change: -1.3, sector: 'Agriculture' },
        { symbol: 'ETEFF', name: 'Teff Export Corporation', price: 189.40, change: 0.9, sector: 'Agriculture' },
        { symbol: 'EFLOW', name: 'Ethiopian Flowers PLC', price: 567.80, change: 3.4, sector: 'Agriculture' }
    ],
    energy: [
        { symbol: 'EEP', name: 'Ethiopian Electric Power', price: 4567.80, change: 1.7, sector: 'Energy' },
        { symbol: 'EWS', name: 'Ethiopian Water & Sewerage', price: 1234.60, change: 0.5, sector: 'Energy' },
        { symbol: 'EPET', name: 'Ethiopian Petroleum Supply', price: 2345.70, change: -0.8, sector: 'Energy' }
    ],
    realestate: [
        { symbol: 'FLINT', name: 'FlintStone Homes', price: 5678.90, change: 4.3, sector: 'Real Estate' },
        { symbol: 'METRO', name: 'Metropolitan Real Estate', price: 3456.70, change: 2.8, sector: 'Real Estate' },
        { symbol: 'SUNSH', name: 'Sunshine Construction', price: 2890.30, change: 1.9, sector: 'Real Estate' },
        { symbol: 'NOAH', name: 'Noah Real Estate', price: 1567.40, change: -1.5, sector: 'Real Estate' }
    ],
    manufacturing: [
        { symbol: 'BEDR', name: 'Bedele Brewery', price: 890.45, change: 2.3, sector: 'Manufacturing' },
        { symbol: 'HBREW', name: 'Habesha Breweries', price: 1234.60, change: 1.8, sector: 'Manufacturing' },
        { symbol: 'DERBA', name: 'Derba Cement', price: 2345.70, change: -0.9, sector: 'Manufacturing' },
        { symbol: 'MOJO', name: 'Mojo Dry Port', price: 678.90, change: 3.2, sector: 'Manufacturing' }
    ],
    gold: [
        { symbol: 'MIDROC', name: 'MIDROC Gold', price: 8901.20, change: 5.6, sector: 'Gold' },
        { symbol: 'NATGOLD', name: 'National Mining Corporation', price: 5678.40, change: 3.2, sector: 'Gold' },
        { symbol: 'EZANA', name: 'Ezana Mining', price: 3456.80, change: 2.1, sector: 'Gold' }
    ]
};

// Ethiopian Futures Data
const ethiopianFutures = [
    { symbol: 'COFFEE-F', name: 'Ethiopian Coffee Futures', price: 234.50, change: 2.3, volume: '89K', high: 236.78, low: 232.34, type: 'local' },
    { symbol: 'SESAME-F', name: 'Sesame Futures', price: 156.30, change: 1.8, volume: '45K', high: 158.20, low: 154.10, type: 'local' },
    { symbol: 'TEFF-F', name: 'Teff Grain Futures', price: 89.45, change: -0.9, volume: '23K', high: 90.34, low: 88.67, type: 'local' },
    { symbol: 'GOLD-ETH', name: 'Ethiopian Gold Futures', price: 3456.80, change: 3.2, volume: '67K', high: 3489.90, low: 3423.45, type: 'local' },
    { symbol: 'WHEAT-F', name: 'Wheat Futures (ETH)', price: 78.90, change: 1.5, volume: '34K', high: 79.56, low: 78.23, type: 'local' },
    { symbol: 'MAIZE-F', name: 'Maize Futures', price: 67.45, change: -1.2, volume: '28K', high: 68.12, low: 66.89, type: 'local' },
    { symbol: 'BARLEY-F', name: 'Barley Futures', price: 72.30, change: 0.8, volume: '19K', high: 72.89, low: 71.67, type: 'local' },
    { symbol: 'FLOWER-F', name: 'Flower Export Futures', price: 234.60, change: 2.7, volume: '12K', high: 236.90, low: 232.10, type: 'local' }
];

// International Futures Data
const internationalFutures = [
    { symbol: 'ES', name: 'S&P 500 Futures', price: 5234.50, change: 0.34, volume: '1.23M', high: 5245.75, low: 5220.25, type: 'international' },
    { symbol: 'NQ', name: 'NASDAQ Futures', price: 18234.75, change: 0.67, volume: '456K', high: 18290.50, low: 18180.25, type: 'international' },
    { symbol: 'CL', name: 'Crude Oil Futures', price: 78.45, change: -1.23, volume: '789K', high: 79.67, low: 77.89, type: 'international' },
    { symbol: 'GC', name: 'Gold Futures', price: 2034.50, change: 0.45, volume: '234K', high: 2039.80, low: 2028.30, type: 'international' },
    { symbol: 'SI', name: 'Silver Futures', price: 23.45, change: 1.2, volume: '123K', high: 23.78, low: 23.12, type: 'international' },
    { symbol: 'HG', name: 'Copper Futures', price: 4.32, change: -0.8, volume: '98K', high: 4.36, low: 4.28, type: 'international' },
    { symbol: 'NG', name: 'Natural Gas Futures', price: 2.89, change: 2.1, volume: '234K', high: 2.94, low: 2.84, type: 'international' },
    { symbol: 'ZC', name: 'Corn Futures', price: 456.75, change: 0.5, volume: '156K', high: 458.90, low: 454.30, type: 'international' }
];

// Market Data
const markets = {
    crypto: [
        { symbol: 'BTC/USDT', name: 'Bitcoin', price: 67845.32, change: 2.45, volume: '2.34B', high: 68234.12, low: 65432.89 },
        { symbol: 'ETH/USDT', name: 'Ethereum', price: 3456.78, change: 3.12, volume: '1.23B', high: 3512.34, low: 3398.45 },
        { symbol: 'BNB/USDT', name: 'Binance Coin', price: 456.23, change: -1.34, volume: '456M', high: 467.89, low: 451.23 },
        { symbol: 'SOL/USDT', name: 'Solana', price: 145.67, change: 5.67, volume: '234M', high: 148.90, low: 138.45 },
        { symbol: 'ADA/USDT', name: 'Cardano', price: 0.654, change: -2.13, volume: '123M', high: 0.678, low: 0.641 },
        { symbol: 'XRP/USDT', name: 'Ripple', price: 0.523, change: 1.89, volume: '89M', high: 0.534, low: 0.512 },
        { symbol: 'DOT/USDT', name: 'Polkadot', price: 8.76, change: 4.23, volume: '78M', high: 8.95, low: 8.34 },
        { symbol: 'DOGE/USDT', name: 'Dogecoin', price: 0.123, change: 7.89, volume: '234M', high: 0.128, low: 0.114 }
    ],
    forex: [
        { symbol: 'EUR/USD', name: 'Euro/US Dollar', price: 1.0856, change: 0.12, volume: '5.67B', high: 1.0878, low: 1.0834, category: 'major' },
        { symbol: 'GBP/USD', name: 'British Pound/US Dollar', price: 1.2734, change: -0.23, volume: '3.45B', high: 1.2756, low: 1.2712, category: 'major' },
        { symbol: 'USD/JPY', name: 'US Dollar/Japanese Yen', price: 149.23, change: 0.45, volume: '4.23B', high: 149.67, low: 148.89, category: 'major' },
        { symbol: 'USD/ETB', name: 'US Dollar/Ethiopian Birr', price: 56.45, change: 0.12, volume: '234M', high: 56.67, low: 56.23, category: 'etb' },
        { symbol: 'EUR/ETB', name: 'Euro/Ethiopian Birr', price: 61.23, change: 0.34, volume: '123M', high: 61.45, low: 61.01, category: 'etb' },
        { symbol: 'GBP/ETB', name: 'British Pound/Ethiopian Birr', price: 71.85, change: 0.28, volume: '89M', high: 72.10, low: 71.60, category: 'etb' },
        { symbol: 'SAR/ETB', name: 'Saudi Riyal/Ethiopian Birr', price: 15.05, change: 0.15, volume: '67M', high: 15.12, low: 14.98, category: 'etb' },
        { symbol: 'AED/ETB', name: 'UAE Dirham/Ethiopian Birr', price: 15.37, change: 0.22, volume: '78M', high: 15.45, low: 15.29, category: 'etb' },
        { symbol: 'KWD/ETB', name: 'Kuwaiti Dinar/Ethiopian Birr', price: 183.45, change: 0.45, volume: '34M', high: 184.20, low: 182.80, category: 'etb' },
        { symbol: 'CNY/ETB', name: 'Chinese Yuan/Ethiopian Birr', price: 7.82, change: 0.18, volume: '156M', high: 7.89, low: 7.75, category: 'etb' },
        { symbol: 'USD/CNY', name: 'US Dollar/Chinese Yuan', price: 7.21, change: 0.08, volume: '3.45B', high: 7.23, low: 7.19, category: 'major' }
    ],
    stocks: [],
    futures: [...ethiopianFutures, ...internationalFutures],
    p2p: []
};

// News Data
const newsData = [
    {
        id: 1,
        category: 'Crypto',
        title: 'Bitcoin Surges Past $68,000 on ETF Optimism',
        description: 'Bitcoin rallied to new monthly highs as institutional investors increase exposure through spot ETFs.',
        image: 'https://via.placeholder.com/400x200',
        author: { name: 'Sarah Johnson', avatar: 'https://via.placeholder.com/32' },
        views: 12453,
        posted: '2 hours ago',
        content: 'Bitcoin has broken through the psychological barrier of $68,000, marking its highest level in three months. The surge comes amid growing institutional interest and the successful launch of several spot Bitcoin ETFs. Market analysts predict further gains as traditional finance continues to embrace cryptocurrency.'
    },
    {
        id: 2,
        category: 'ESX',
        title: 'CBE Stock Hits Record High After Q4 Earnings',
        description: 'Commercial Bank of Ethiopia reports exceptional quarterly results, driving stock to new heights.',
        image: 'https://via.placeholder.com/400x200',
        author: { name: 'Abebe Tadesse', avatar: 'https://via.placeholder.com/32' },
        views: 8234,
        posted: '4 hours ago',
        content: 'Commercial Bank of Ethiopia has posted record-breaking Q4 earnings, exceeding analyst expectations by 15%. The bank reported a net profit of 8.2 billion birr, driven by strong loan growth and digital banking adoption.'
    },
    {
        id: 3,
        category: 'Analysis',
        title: 'Technical Analysis: ETH Forms Bullish Pattern',
        description: 'Ethereum shows strong technical indicators suggesting potential breakout above $3,500.',
        image: 'https://via.placeholder.com/400x200',
        author: { name: 'Michael Chen', avatar: 'https://via.placeholder.com/32' },
        views: 5678,
        posted: '6 hours ago',
        content: 'Ethereum is forming a classic cup and handle pattern on the daily chart, suggesting a potential move towards $4,000. Key support levels remain strong at $3,200.'
    }
];

// P2P Offers Data
const p2pOffers = [
    {
        merchant: { name: 'TradeMaster', avatar: 'https://via.placeholder.com/48', trades: 1234, completion: 98.5 },
        price: 67850.00,
        limits: { min: 100, max: 10000 },
        available: 2.5,
        methods: ['Bank Transfer', 'CBE Birr'],
        type: 'buy'
    },
    {
        merchant: { name: 'CryptoKing', avatar: 'https://via.placeholder.com/48', trades: 892, completion: 99.2 },
        price: 67845.00,
        limits: { min: 50, max: 5000 },
        available: 1.8,
        methods: ['Telebirr', 'M-PESA'],
        type: 'buy'
    },
    {
        merchant: { name: 'FastTrade', avatar: 'https://via.placeholder.com/48', trades: 2456, completion: 97.8 },
        price: 67860.00,
        limits: { min: 200, max: 20000 },
        available: 5.0,
        methods: ['Bank Transfer'],
        type: 'sell'
    }
];

// Popular Authors Data
const popularAuthors = [
    { name: 'Sarah Johnson', avatar: 'https://via.placeholder.com/48', articles: 234, followers: 12453 },
    { name: 'Abebe Tadesse', avatar: 'https://via.placeholder.com/48', articles: 189, followers: 8901 },
    { name: 'Michael Chen', avatar: 'https://via.placeholder.com/48', articles: 156, followers: 6789 },
    { name: 'Hanna Bekele', avatar: 'https://via.placeholder.com/48', articles: 98, followers: 4567 }
];

// State Management
let currentMarket = 'forex'; // Changed default to forex
let currentStockRegion = 'national';
let currentSector = 'all';
let currentForexFilter = 'etb'; // Changed default to ETB pairs
let currentFuturesFilter = 'local'; // New state for futures filter
let selectedPair = markets.forex.find(p => p.category === 'etb'); // Default to first ETB pair
let orderBook = { bids: [], asks: [] };
let tradeHistory = [];
let openOrders = [];
let portfolio = [
    { symbol: 'BTC', amount: 0.5234, value: 35489.23 },
    { symbol: 'ETH', amount: 5.678, value: 19623.45 },
    { symbol: 'USDT', amount: 50000, value: 50000 }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeMarketList();
    initializeEventListeners();
    initializeChart();
    initializeTheme();
    initializeMobileMenu();
    startPriceUpdates();
    generateOrderBook();
    generateTradeHistory();
    updatePortfolio();
    initializeTicker();
    initializeNews();
    initializeP2P();
    initializeConvert();
});

// Initialize Mobile Menu
function initializeMobileMenu() {
    const hamburger = document.getElementById('hamburgerBtn');
    const mobileNav = document.getElementById('mobileNav');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mobileNav.classList.toggle('active');
        });
    }
    
    // Mobile nav buttons
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        if (btn.id !== 'convertBtnMobile') {
            btn.addEventListener('click', () => {
                const market = btn.dataset.market;
                
                // Close mobile menu
                document.getElementById('hamburgerBtn').classList.remove('active');
                document.getElementById('mobileNav').classList.remove('active');
                
                // Hide filters when not needed
                document.getElementById('stockFilters').style.display = 'none';
                document.getElementById('forexFilters').style.display = 'none';
                document.getElementById('futuresFilters').style.display = 'none';
                
                // Handle different market views
                if (market === 'news') {
                    showNewsSection();
                } else if (market === 'p2p') {
                    showP2PSection();
                } else {
                    showTradingSection();
                    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentMarket = market;
                    initializeMarketList();
                    if (markets[currentMarket] && markets[currentMarket].length > 0) {
                        selectedPair = markets[currentMarket][0];
                        updateTradingHeader();
                    }
                }
            });
        }
    });
    
    // Convert button mobile
    const convertBtnMobile = document.getElementById('convertBtnMobile');
    if (convertBtnMobile) {
        convertBtnMobile.addEventListener('click', () => {
            document.getElementById('convertModal').classList.add('active');
            document.getElementById('hamburgerBtn').classList.remove('active');
            document.getElementById('mobileNav').classList.remove('active');
        });
    }
}

// Initialize Convert Modal
function initializeConvert() {
    updateConvertRate();
    
    // Initialize deposit options with click handlers
    document.querySelectorAll('.deposit-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.deposit-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            option.style.borderColor = 'var(--primary)';
            option.style.background = 'var(--primary-light)';
        });
    });
}

// Initialize Theme
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

// Theme Toggle
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    icon.textContent = theme === 'dark' ? '🌙' : '☀️';
}

// Initialize Market List
function initializeMarketList() {
    // Hide all filters first
    document.getElementById('stockFilters').style.display = 'none';
    document.getElementById('forexFilters').style.display = 'none';
    document.getElementById('futuresFilters').style.display = 'none';
    
    if (currentMarket === 'stocks') {
        loadStockMarkets();
    } else if (currentMarket === 'forex') {
        document.getElementById('forexFilters').style.display = 'block';
        loadForexMarkets();
    } else if (currentMarket === 'futures') {
        document.getElementById('futuresFilters').style.display = 'block';
        loadFuturesMarkets();
    } else {
        renderMarketList(markets[currentMarket]);
    }
}

// Load Futures Markets with filter
function loadFuturesMarkets() {
    let futuresData = [];
    
    if (currentFuturesFilter === 'local') {
        futuresData = ethiopianFutures;
    } else {
        futuresData = internationalFutures;
    }
    
    renderMarketList(futuresData);
}

// Load Forex Markets with filter
function loadForexMarkets() {
    const forexFilters = document.getElementById('forexFilters');
    if (forexFilters) {
        forexFilters.style.display = 'block';
    }
    
    let forexData = markets.forex;
    
    if (currentForexFilter === 'major') {
        forexData = markets.forex.filter(pair => pair.category === 'major');
    } else if (currentForexFilter === 'etb') {
        forexData = markets.forex.filter(pair => pair.category === 'etb');
    }
    
    renderMarketList(forexData);
}

// Load Stock Markets based on region
function loadStockMarkets() {
    const stockFilters = document.getElementById('stockFilters');
    const stockSectors = document.getElementById('stockSectors');
    
    stockFilters.style.display = 'block';
    
    if (currentStockRegion === 'national') {
        stockSectors.style.display = 'flex';
        loadESXStocks();
    } else {
        stockSectors.style.display = 'none';
        // Load international stocks
        markets.stocks = [
            { symbol: 'AAPL', name: 'Apple Inc.', price: 178.45, change: 1.23, volume: '45.6M' },
            { symbol: 'MSFT', name: 'Microsoft', price: 423.67, change: 0.89, volume: '23.4M' },
            { symbol: 'GOOGL', name: 'Alphabet', price: 156.78, change: -0.45, volume: '18.9M' },
            { symbol: 'AMZN', name: 'Amazon', price: 178.23, change: 2.34, volume: '34.5M' }
        ];
        renderMarketList(markets.stocks);
    }
}

// Load ESX Stocks
function loadESXStocks() {
    let stocks = [];
    
    if (currentSector === 'all') {
        Object.values(esxStocks).forEach(sectorStocks => {
            stocks = stocks.concat(sectorStocks);
        });
    } else {
        stocks = esxStocks[currentSector] || [];
    }
    
    renderMarketList(stocks);
}

// Render Market List
function renderMarketList(marketData) {
    const marketList = document.getElementById('marketList');
    marketList.innerHTML = '';
    
    marketData.forEach((item, index) => {
        const marketItem = document.createElement('div');
        marketItem.className = `market-item ${index === 0 ? 'active' : ''}`;
        marketItem.innerHTML = `
            <div class="market-pair">
                <span class="pair-symbol">${item.symbol}</span>
                <span class="pair-name">${item.name}</span>
                ${item.sector ? `<span class="pair-name" style="font-size: 0.625rem; color: var(--primary);">${item.sector}</span>` : ''}
            </div>
            <div class="market-price">
                <div class="price">${formatPrice(item.price)}</div>
                <div class="change ${item.change >= 0 ? 'positive' : 'negative'}">
                    ${item.change >= 0 ? '+' : ''}${item.change}%
                </div>
            </div>
        `;
        marketItem.addEventListener('click', () => selectMarket(item, marketItem));
        marketList.appendChild(marketItem);
    });
    
    if (marketData.length > 0) {
        selectedPair = marketData[0];
        updateTradingHeader();
    }
}

// Initialize News
function initializeNews() {
    const newsGrid = document.getElementById('newsGrid');
    const authorsList = document.getElementById('authorsList');
    
    // Enhanced news data with more variety
    const enhancedNewsData = [
        {
            id: 1,
            category: 'ESX',
            title: 'Commercial Bank of Ethiopia Reports Record Q4 Earnings',
            description: 'CBE stock surges 15% following exceptional quarterly results, driven by digital banking expansion and strong loan portfolio growth.',
            image: 'https://via.placeholder.com/600x400',
            author: { name: 'Abebe Tadesse', avatar: 'https://via.placeholder.com/40' },
            views: 15234,
            posted: '2 hours ago',
            size: 'large'
        },
        {
            id: 2,
            category: 'Forex',
            title: 'USD/ETB Hits New Monthly High at 56.45',
            description: 'Ethiopian Birr faces pressure as dollar strengthens globally. Central bank announces intervention measures.',
            image: 'https://via.placeholder.com/400x300',
            author: { name: 'Sarah Johnson', avatar: 'https://via.placeholder.com/40' },
            views: 8901,
            posted: '3 hours ago',
            size: 'normal'
        },
        {
            id: 3,
            category: 'ESX',
            title: 'Ethio Telecom IPO: What Investors Need to Know',
            description: 'The telecommunications giant prepares for its historic public offering on the Ethiopian Securities Exchange.',
            image: 'https://via.placeholder.com/400x300',
            author: { name: 'Hanna Bekele', avatar: 'https://via.placeholder.com/40' },
            views: 12456,
            posted: '4 hours ago',
            size: 'normal'
        },
        {
            id: 4,
            category: 'Analysis',
            title: 'Gold Mining Sector Rally: MIDROC Leads Gains',
            description: 'Ethiopian gold mining stocks see unprecedented growth as global gold prices reach new heights.',
            image: 'https://via.placeholder.com/400x500',
            author: { name: 'Michael Chen', avatar: 'https://via.placeholder.com/40' },
            views: 6789,
            posted: '5 hours ago',
            size: 'vertical'
        },
        {
            id: 5,
            category: 'Agriculture',
            title: 'Coffee Export Prices Surge 23% on Global Demand',
            description: 'Ethiopian coffee exporters benefit from supply chain disruptions in Brazil and increased demand from Asia.',
            image: 'https://via.placeholder.com/400x300',
            author: { name: 'Tigist Alemu', avatar: 'https://via.placeholder.com/40' },
            views: 5432,
            posted: '6 hours ago',
            size: 'normal'
        }
    ];
    
    // Render enhanced news cards
    if (newsGrid) {
        newsGrid.innerHTML = '';
        enhancedNewsData.forEach(news => {
            const newsCard = document.createElement('div');
            newsCard.className = `news-card ${news.size || 'normal'}`;
            
            if (news.size === 'large') {
                newsCard.innerHTML = `
                    <div class="news-image-container">
                        <img src="${news.image}" alt="${news.title}" class="news-image">
                    </div>
                    <div class="news-content">
                        <span class="news-category">${news.category}</span>
                        <h3 class="news-title">${news.title}</h3>
                        <p class="news-description">${news.description}</p>
                        <div class="news-meta">
                            <div class="news-author">
                                <img src="${news.author.avatar}" alt="${news.author.name}" class="author-avatar">
                                <span class="author-name">${news.author.name}</span>
                            </div>
                            <div class="news-stats">
                                <span>👁️ ${news.views.toLocaleString()}</span>
                                <span>${news.posted}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                newsCard.innerHTML = `
                    <div class="news-image-container">
                        <img src="${news.image}" alt="${news.title}" class="news-image">
                    </div>
                    <div class="news-content">
                        <span class="news-category">${news.category}</span>
                        <h3 class="news-title">${news.title}</h3>
                        <p class="news-description">${news.description}</p>
                        <div class="news-meta">
                            <div class="news-author">
                                <img src="${news.author.avatar}" alt="${news.author.name}" class="author-avatar">
                                <span class="author-name">${news.author.name}</span>
                            </div>
                            <div class="news-stats">
                                <span>👁️ ${news.views.toLocaleString()}</span>
                                <span>${news.posted}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            newsCard.addEventListener('click', () => openNewsModal(news));
            newsGrid.appendChild(newsCard);
        });
    }
    
    // Render popular authors
    if (authorsList) {
        popularAuthors.forEach(author => {
            const authorCard = document.createElement('div');
            authorCard.className = 'author-card';
            authorCard.innerHTML = `
                <img src="${author.avatar}" alt="${author.name}" class="author-avatar">
                <div class="author-info">
                    <div class="author-name">${author.name}</div>
                    <div class="author-stats">
                        <span>📝 ${author.articles}</span>
                        <span>👥 ${author.followers.toLocaleString()}</span>
                    </div>
                </div>
                <button class="btn-follow">Follow</button>
            `;
            authorsList.appendChild(authorCard);
        });
    }
}

// Open News Modal
function openNewsModal(news) {
    const modal = document.getElementById('newsModal');
    const modalTitle = document.getElementById('newsModalTitle');
    const detailContent = document.getElementById('newsDetailContent');
    
    modalTitle.textContent = news.title;
    detailContent.innerHTML = `
        <img src="${news.image}" alt="${news.title}" class="news-detail-image">
        <div class="news-detail-text">
            <p>${news.content}</p>
            <div class="news-meta" style="margin-top: 2rem;">
                <div class="news-author">
                    <img src="${news.author.avatar}" alt="${news.author.name}" class="author-avatar">
                    <span class="author-name">${news.author.name}</span>
                </div>
                <div class="news-stats">
                    <span>${news.posted}</span>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

// Initialize P2P
function initializeP2P() {
    renderP2POffers();
}

// Render P2P Offers
function renderP2POffers() {
    const offersContainer = document.getElementById('p2pOffers');
    if (!offersContainer) return;
    
    offersContainer.innerHTML = '';
    
    p2pOffers.forEach(offer => {
        const offerDiv = document.createElement('div');
        offerDiv.className = 'p2p-offer';
        offerDiv.innerHTML = `
            <div class="p2p-merchant">
                <img src="${offer.merchant.avatar}" alt="${offer.merchant.name}" class="merchant-avatar">
                <div class="merchant-info">
                    <div class="merchant-name">${offer.merchant.name}</div>
                    <div class="merchant-stats">
                        <span>${offer.merchant.trades} trades</span>
                        <span>${offer.merchant.completion}% completion</span>
                    </div>
                </div>
            </div>
            <div class="p2p-details">
                <div class="p2p-price">
                    <span class="price-label">Price</span>
                    <span class="price-amount">$${offer.price.toLocaleString()}</span>
                </div>
                <div class="p2p-limits">
                    <span class="price-label">Limits</span>
                    <span>$${offer.limits.min} - $${offer.limits.max}</span>
                </div>
                <div class="p2p-limits">
                    <span class="price-label">Available</span>
                    <span>${offer.available} BTC</span>
                </div>
            </div>
            <div class="p2p-methods">
                ${offer.methods.map(method => `<span class="payment-badge">${method}</span>`).join('')}
            </div>
            <button class="btn-trade ${offer.type}">${offer.type === 'buy' ? 'Buy' : 'Sell'}</button>
        `;
        offersContainer.appendChild(offerDiv);
    });
}

// Select Market
function selectMarket(market, element) {
    // Remove active class from all items
    document.querySelectorAll('.market-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected item
    if (element) {
        element.classList.add('active');
    }
    
    // Update selected pair
    selectedPair = market;
    updateTradingHeader();
    generateOrderBook();
    generateTradeHistory();
    updateChart();
}

// Update Trading Header
function updateTradingHeader() {
    document.querySelector('.asset-pair').textContent = selectedPair.symbol;
    document.querySelector('.asset-name').textContent = selectedPair.name;
    document.querySelector('.price-value').textContent = `${selectedPair.symbol.includes('ETB') ? '' : '$'}${formatPrice(selectedPair.price)}`;
    document.querySelector('.price-change').textContent = `${selectedPair.change >= 0 ? '+' : ''}${selectedPair.change}%`;
    document.querySelector('.price-change').className = `price-change ${selectedPair.change >= 0 ? 'positive' : 'negative'}`;
    
    // Update stats
    const statValues = document.querySelectorAll('.price-stats .stat-value');
    if (statValues.length >= 3) {
        statValues[0].textContent = `${selectedPair.symbol.includes('ETB') ? '' : '$'}${formatPrice(selectedPair.high || selectedPair.price * 1.01)}`;
        statValues[1].textContent = `${selectedPair.symbol.includes('ETB') ? '' : '$'}${formatPrice(selectedPair.low || selectedPair.price * 0.99)}`;
        statValues[2].textContent = `${selectedPair.symbol.includes('ETB') ? '' : '$'}${selectedPair.volume || '100M'}`;
    }
}

// Format Price
function formatPrice(price) {
    if (price > 1000) {
        return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price > 1) {
        return price.toFixed(2);
    } else {
        return price.toFixed(4);
    }
}

// Generate Order Book
function generateOrderBook() {
    const basePrice = selectedPair.price;
    orderBook.bids = [];
    orderBook.asks = [];
    
    // Generate bids and asks
    for (let i = 0; i < 15; i++) {
        const bidPrice = basePrice * (1 - (i + 1) * 0.0001);
        const askPrice = basePrice * (1 + (i + 1) * 0.0001);
        
        orderBook.bids.push({
            price: bidPrice,
            amount: Math.random() * 10,
            total: bidPrice * Math.random() * 10
        });
        
        orderBook.asks.push({
            price: askPrice,
            amount: Math.random() * 10,
            total: askPrice * Math.random() * 10
        });
    }
    
    renderOrderBook();
}

// Render Order Book
function renderOrderBook() {
    const asksContainer = document.getElementById('orderBookAsks');
    const bidsContainer = document.getElementById('orderBookBids');
    
    if (!asksContainer || !bidsContainer) return;
    
    asksContainer.innerHTML = '';
    bidsContainer.innerHTML = '';
    
    // Render asks
    orderBook.asks.forEach((order, index) => {
        const row = document.createElement('div');
        row.className = 'order-row ask';
        row.style.setProperty('--depth', `${(order.total / 1000) * 100}%`);
        row.innerHTML = `
            <span>${formatPrice(order.price)}</span>
            <span>${order.amount.toFixed(4)}</span>
            <span>${order.total.toFixed(2)}</span>
        `;
        asksContainer.appendChild(row);
    });
    
    // Render bids
    orderBook.bids.forEach((order, index) => {
        const row = document.createElement('div');
        row.className = 'order-row bid';
        row.style.setProperty('--depth', `${(order.total / 1000) * 100}%`);
        row.innerHTML = `
            <span>${formatPrice(order.price)}</span>
            <span>${order.amount.toFixed(4)}</span>
            <span>${order.total.toFixed(2)}</span>
        `;
        bidsContainer.appendChild(row);
    });
    
    // Update spread
    const spreadValue = document.querySelector('.spread-value');
    if (spreadValue) {
        spreadValue.textContent = formatPrice(selectedPair.price);
    }
}

// Generate Trade History
function generateTradeHistory() {
    tradeHistory = [];
    const basePrice = selectedPair.price;
    
    for (let i = 0; i < 20; i++) {
        const variation = (Math.random() - 0.5) * 0.001;
        const isBuy = Math.random() > 0.5;
        
        tradeHistory.push({
            price: basePrice * (1 + variation),
            amount: Math.random() * 5,
            time: new Date(Date.now() - i * 60000),
            type: isBuy ? 'buy' : 'sell'
        });
    }
    
    renderTradeHistory();
}

// Render Trade History
function renderTradeHistory() {
    const container = document.getElementById('tradeHistory');
    if (!container) return;
    
    container.innerHTML = '';
    
    tradeHistory.forEach(trade => {
        const row = document.createElement('div');
        row.className = 'trade-row';
        row.innerHTML = `
            <span class="trade-price ${trade.type}">${formatPrice(trade.price)}</span>
            <span>${trade.amount.toFixed(4)}</span>
            <span class="trade-time">${formatTime(trade.time)}</span>
        `;
        container.appendChild(row);
    });
}

// Format Time
function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Convert button (opens modal)
    document.getElementById('convertBtn').addEventListener('click', () => {
        document.getElementById('convertModal').classList.add('active');
    });
    
    // Market tabs
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.id !== 'convertBtn') {
            btn.addEventListener('click', () => {
                const market = btn.dataset.market;
                
                // Hide filters when not needed
                document.getElementById('stockFilters').style.display = 'none';
                document.getElementById('forexFilters').style.display = 'none';
                document.getElementById('futuresFilters').style.display = 'none';
                
                // Handle different market views
                if (market === 'news') {
                    showNewsSection();
                } else if (market === 'p2p') {
                    showP2PSection();
                } else {
                    showTradingSection();
                    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentMarket = market;
                    initializeMarketList();
                    if (markets[currentMarket] && markets[currentMarket].length > 0) {
                        selectedPair = markets[currentMarket][0];
                        updateTradingHeader();
                    }
                }
            });
        }
    });
    
    // Forex filter buttons
    document.querySelectorAll('.forex-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.forex-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentForexFilter = btn.dataset.filter;
            loadForexMarkets();
        });
    });
    
    // Futures filter buttons
    document.querySelectorAll('.futures-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.futures-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFuturesFilter = btn.dataset.filter;
            loadFuturesMarkets();
        });
    });
    
    // Stock region filter
    const stockRegionFilter = document.getElementById('stockRegionFilter');
    if (stockRegionFilter) {
        stockRegionFilter.addEventListener('change', (e) => {
            currentStockRegion = e.target.value;
            loadStockMarkets();
        });
    }
    
    // Stock sector filters
    document.querySelectorAll('.sector-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sector-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSector = btn.dataset.sector;
            loadESXStocks();
        });
    });
    
    // Market search
    document.querySelector('.search-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        let searchData = [];
        
        if (currentMarket === 'stocks' && currentStockRegion === 'national') {
            if (currentSector === 'all') {
                Object.values(esxStocks).forEach(sectorStocks => {
                    searchData = searchData.concat(sectorStocks);
                });
            } else {
                searchData = esxStocks[currentSector] || [];
            }
        } else if (currentMarket === 'forex') {
            if (currentForexFilter === 'all') {
                searchData = markets.forex;
            } else if (currentForexFilter === 'major') {
                searchData = markets.forex.filter(pair => pair.category === 'major');
            } else if (currentForexFilter === 'etb') {
                searchData = markets.forex.filter(pair => pair.category === 'etb');
            }
        } else if (currentMarket === 'futures') {
            if (currentFuturesFilter === 'local') {
                searchData = ethiopianFutures;
            } else {
                searchData = internationalFutures;
            }
        } else {
            searchData = markets[currentMarket] || [];
        }
        
        const filtered = searchData.filter(item => 
            item.symbol.toLowerCase().includes(searchTerm) || 
            item.name.toLowerCase().includes(searchTerm)
        );
        renderMarketList(filtered);
    });
    
    // P2P tabs
    document.querySelectorAll('.p2p-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.p2p-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // News filters
    document.querySelectorAll('.news-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.news-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Filter news based on category
            const filter = btn.dataset.filter;
            const newsCards = document.querySelectorAll('.news-card');
            newsCards.forEach(card => {
                if (filter === 'all') {
                    card.style.display = 'flex';
                } else {
                    const category = card.querySelector('.news-category');
                    if (category && category.textContent.toLowerCase() === filter) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                }
            });
        });
    });
    
    // Comment button
    const commentBtn = document.getElementById('commentBtn');
    if (commentBtn) {
        commentBtn.addEventListener('click', () => {
            const sidebar = document.getElementById('commentsSidebar');
            sidebar.classList.toggle('active');
        });
    }
    
    // Close comments
    const closeComments = document.querySelector('.close-comments');
    if (closeComments) {
        closeComments.addEventListener('click', () => {
            document.getElementById('commentsSidebar').classList.remove('active');
        });
    }
    
    // News action buttons
    document.querySelectorAll('.news-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (btn.dataset.action !== 'comment') {
                btn.classList.toggle('active');
            }
        });
    });
    
    // Convert swap button
    const swapBtn = document.querySelector('.btn-swap-currencies');
    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            // Swap the from and to currencies
            const fromSelect = document.querySelectorAll('.convert-currency-select')[0];
            const toSelect = document.querySelectorAll('.convert-currency-select')[1];
            if (fromSelect && toSelect) {
                const temp = fromSelect.value;
                fromSelect.value = toSelect.value;
                toSelect.value = temp;
            }
        });
    }
    
    // Convert currency change handlers
    document.querySelectorAll('.convert-currency-select').forEach(select => {
        select.addEventListener('change', updateConvertRate);
    });
    
    // Convert amount input
    const convertAmountInput = document.querySelector('.convert-amount-input');
    if (convertAmountInput) {
        convertAmountInput.addEventListener('input', calculateConversion);
    }
    
    // Order type buttons
    document.querySelectorAll('.order-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const isBuy = btn.classList.contains('buy');
            const placeOrderBtn = document.querySelector('.btn-place-order');
            placeOrderBtn.className = `btn-place-order ${isBuy ? 'buy' : 'sell'}`;
            placeOrderBtn.textContent = `Place ${isBuy ? 'Buy' : 'Sell'} Order`;
        });
    });
    
    // Amount slider
    const slider = document.querySelector('.slider');
    const amountInput = document.querySelectorAll('.form-input')[1];
    const totalInput = document.querySelectorAll('.form-input')[2];
    const priceInput = document.querySelectorAll('.form-input')[0];
    
    if (slider) {
        slider.addEventListener('input', (e) => {
            const percentage = e.target.value;
            const availableBalance = 10000; // USDT
            const price = parseFloat(priceInput.value) || selectedPair.price;
            const amount = (availableBalance * percentage / 100) / price;
            
            amountInput.value = amount.toFixed(6);
            totalInput.value = (amount * price).toFixed(2);
        });
    }
    
    // Calculate total on amount change
    if (amountInput) {
        amountInput.addEventListener('input', () => {
            const amount = parseFloat(amountInput.value) || 0;
            const price = parseFloat(priceInput.value) || selectedPair.price;
            totalInput.value = (amount * price).toFixed(2);
        });
    }
    
    // Place order button
    const placeOrderBtn = document.querySelector('.btn-place-order');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', () => {
            const amount = parseFloat(amountInput.value) || 0;
            const price = parseFloat(priceInput.value) || selectedPair.price;
            const type = document.querySelector('.order-type-btn.active').classList.contains('buy') ? 'Buy' : 'Sell';
            
            if (amount > 0) {
                addOpenOrder(type, selectedPair.symbol, price, amount);
                // Reset form
                amountInput.value = '';
                totalInput.value = '';
                slider.value = 0;
                
                showNotification(`${type} order placed successfully!`, 'success');
            }
        });
    }
    
    // Deposit button
    document.querySelector('.btn-deposit').addEventListener('click', () => {
        document.getElementById('depositModal').classList.add('active');
    });
    
    // Withdraw button
    document.querySelector('.btn-withdraw').addEventListener('click', () => {
        document.getElementById('withdrawModal').classList.add('active');
    });
    
    // Transfer button
    document.querySelector('.btn-transfer').addEventListener('click', () => {
        document.getElementById('transferModal').classList.add('active');
    });
    
    // Withdrawal tabs
    document.querySelectorAll('.withdrawal-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.withdrawal-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Network options
    document.querySelectorAll('.network-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.network-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
        });
    });
    
    // Transfer type selector
    document.querySelectorAll('.transfer-type').forEach(type => {
        type.addEventListener('click', () => {
            document.querySelectorAll('.transfer-type').forEach(t => t.classList.remove('active'));
            type.classList.add('active');
        });
    });
    
    // Max buttons
    document.querySelectorAll('.btn-max').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            if (input) {
                input.value = '10000'; // Example max value
            }
        });
    });
    
    // Use max button in convert modal
    const useMaxBtn = document.querySelector('.btn-use-max');
    if (useMaxBtn) {
        useMaxBtn.addEventListener('click', () => {
            const input = document.querySelector('.convert-amount-input');
            if (input) {
                input.value = '50000';
            }
        });
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });
    
    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Timeframe buttons
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateChart();
        });
    });
    
    // Panel tabs
    document.querySelectorAll('.panel-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Market filter tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.textContent.toLowerCase();
            let filtered = markets[currentMarket] || [];
            
            if (currentMarket === 'stocks' && currentStockRegion === 'national') {
                if (currentSector === 'all') {
                    Object.values(esxStocks).forEach(sectorStocks => {
                        filtered = filtered.concat(sectorStocks);
                    });
                } else {
                    filtered = esxStocks[currentSector] || [];
                }
            } else if (currentMarket === 'futures') {
                filtered = currentFuturesFilter === 'local' ? ethiopianFutures : internationalFutures;
            }
            
            if (filter === 'favorites') {
                filtered = filtered.slice(0, 3);
            } else if (filter === 'gainers') {
                filtered = filtered.filter(m => m.change > 0);
            } else if (filter === 'losers') {
                filtered = filtered.filter(m => m.change < 0);
            }
            
            renderMarketList(filtered);
        });
    });
    
    // Slider marks click
    document.querySelectorAll('.slider-marks span').forEach((mark, index) => {
        mark.addEventListener('click', () => {
            const values = [25, 50, 75, 100];
            slider.value = values[index];
            slider.dispatchEvent(new Event('input'));
        });
    });
}

// Show different sections
function showTradingSection() {
    document.getElementById('tradingMain').style.display = 'flex';
    document.getElementById('newsMain').style.display = 'none';
    document.getElementById('p2pMain').style.display = 'none';
    document.getElementById('tradingSidebar').style.display = 'flex';
    document.getElementById('newsSidebar').style.display = 'none';
    document.querySelector('.market-sidebar').style.display = 'flex';
}

function showNewsSection() {
    document.getElementById('tradingMain').style.display = 'none';
    document.getElementById('newsMain').style.display = 'flex';
    document.getElementById('p2pMain').style.display = 'none';
    document.getElementById('tradingSidebar').style.display = 'none';
    document.getElementById('newsSidebar').style.display = 'flex';
    document.querySelector('.market-sidebar').style.display = 'none';
    document.getElementById('stockFilters').style.display = 'none';
    document.getElementById('forexFilters').style.display = 'none';
    document.getElementById('futuresFilters').style.display = 'none';
}

function showP2PSection() {
    document.getElementById('tradingMain').style.display = 'none';
    document.getElementById('newsMain').style.display = 'none';
    document.getElementById('p2pMain').style.display = 'flex';
    document.getElementById('tradingSidebar').style.display = 'none';
    document.getElementById('newsSidebar').style.display = 'none';
    document.querySelector('.market-sidebar').style.display = 'none';
    document.getElementById('stockFilters').style.display = 'none';
    document.getElementById('forexFilters').style.display = 'none';
    document.getElementById('futuresFilters').style.display = 'none';
}

// Convert/Swap Helper Functions
function updateConvertRate() {
    const fromSelect = document.querySelectorAll('.convert-currency-select')[0];
    const toSelect = document.querySelectorAll('.convert-currency-select')[1];
    const rateElement = document.querySelector('.swap-rate');
    
    if (fromSelect && toSelect && rateElement) {
        // Sample conversion rates (in production, these would come from an API)
        const rates = {
            'ETB': { 'USD': 0.0177, 'EUR': 0.0163, 'GBP': 0.0139, 'BTC': 0.00000026, 'ETH': 0.0000051, 'USDT': 0.0177, 'CNY': 0.127 },
            'USD': { 'ETB': 56.45, 'EUR': 0.92, 'GBP': 0.79, 'BTC': 0.000015, 'ETH': 0.00029, 'USDT': 1, 'CNY': 7.21 },
            'EUR': { 'ETB': 61.23, 'USD': 1.09, 'GBP': 0.86, 'BTC': 0.000016, 'ETH': 0.00031, 'USDT': 1.09, 'CNY': 7.86 },
            'GBP': { 'ETB': 71.85, 'USD': 1.27, 'EUR': 1.16, 'BTC': 0.000019, 'ETH': 0.00036, 'USDT': 1.27, 'CNY': 9.16 },
            'BTC': { 'ETB': 3832456, 'USD': 67845, 'EUR': 62456, 'GBP': 53234, 'ETH': 19.5, 'USDT': 67845, 'CNY': 489267 },
            'ETH': { 'ETB': 195234, 'USD': 3456, 'EUR': 3178, 'GBP': 2712, 'BTC': 0.051, 'USDT': 3456, 'CNY': 24918 },
            'USDT': { 'ETB': 56.45, 'USD': 1, 'EUR': 0.92, 'GBP': 0.79, 'BTC': 0.000015, 'ETH': 0.00029, 'CNY': 7.21 },
            'CNY': { 'ETB': 7.82, 'USD': 0.139, 'EUR': 0.127, 'GBP': 0.109, 'BTC': 0.0000021, 'ETH': 0.00004, 'USDT': 0.139 }
        };
        
        const fromCurrency = fromSelect.value.replace(' (Birr)', '').replace(' (Yuan)', '').toUpperCase();
        const toCurrency = toSelect.value.replace(' (Birr)', '').replace(' (Yuan)', '').toUpperCase();
        
        if (rates[fromCurrency] && rates[fromCurrency][toCurrency]) {
            const rate = rates[fromCurrency][toCurrency];
            rateElement.textContent = `1 ${fromCurrency} = ${rate < 0.01 ? rate.toFixed(8) : rate.toFixed(4)} ${toCurrency}`;
        }
    }
    
    calculateConversion();
}

function calculateConversion() {
    const fromInput = document.querySelectorAll('.convert-amount-input')[0];
    const toInput = document.querySelectorAll('.convert-amount-input')[1];
    const fromSelect = document.querySelectorAll('.convert-currency-select')[0];
    const toSelect = document.querySelectorAll('.convert-currency-select')[1];
    
    if (fromInput && toInput && fromSelect && toSelect) {
        const amount = parseFloat(fromInput.value) || 0;
        const fromCurrency = fromSelect.value.replace(' (Birr)', '').replace(' (Yuan)', '').toUpperCase();
        const toCurrency = toSelect.value.replace(' (Birr)', '').replace(' (Yuan)', '').toUpperCase();
        
        // Sample conversion calculation
        const rates = {
            'ETB': { 'USD': 0.0177, 'EUR': 0.0163, 'GBP': 0.0139, 'BTC': 0.00000026, 'ETH': 0.0000051, 'USDT': 0.0177, 'CNY': 0.127 },
            'USD': { 'ETB': 56.45, 'EUR': 0.92, 'GBP': 0.79, 'BTC': 0.000015, 'ETH': 0.00029, 'USDT': 1, 'CNY': 7.21 },
            'EUR': { 'ETB': 61.23, 'USD': 1.09, 'GBP': 0.86, 'BTC': 0.000016, 'ETH': 0.00031, 'USDT': 1.09, 'CNY': 7.86 },
            'GBP': { 'ETB': 71.85, 'USD': 1.27, 'EUR': 1.16, 'BTC': 0.000019, 'ETH': 0.00036, 'USDT': 1.27, 'CNY': 9.16 },
            'BTC': { 'ETB': 3832456, 'USD': 67845, 'EUR': 62456, 'GBP': 53234, 'ETH': 19.5, 'USDT': 67845, 'CNY': 489267 },
            'ETH': { 'ETB': 195234, 'USD': 3456, 'EUR': 3178, 'GBP': 2712, 'BTC': 0.051, 'USDT': 3456, 'CNY': 24918 },
            'USDT': { 'ETB': 56.45, 'USD': 1, 'EUR': 0.92, 'GBP': 0.79, 'BTC': 0.000015, 'ETH': 0.00029, 'CNY': 7.21 },
            'CNY': { 'ETB': 7.82, 'USD': 0.139, 'EUR': 0.127, 'GBP': 0.109, 'BTC': 0.0000021, 'ETH': 0.00004, 'USDT': 0.139 }
        };
        
        if (rates[fromCurrency] && rates[fromCurrency][toCurrency]) {
            const convertedAmount = amount * rates[fromCurrency][toCurrency];
            toInput.value = convertedAmount.toFixed(convertedAmount < 1 ? 8 : 2);
            
            // Update estimated value
            const estimateElement = document.querySelector('.convert-estimate');
            if (estimateElement) {
                const usdValue = fromCurrency === 'USD' ? amount : 
                                 (rates[fromCurrency] && rates[fromCurrency]['USD'] ? amount * rates[fromCurrency]['USD'] : 0);
                estimateElement.textContent = `Estimated value: $${usdValue.toFixed(2)}`;
            }
        }
    }
}

// Add Open Order
function addOpenOrder(type, pair, price, amount) {
    const order = {
        id: Date.now(),
        type,
        pair,
        price,
        amount,
        total: price * amount,
        time: new Date()
    };
    
    openOrders.push(order);
    renderOpenOrders();
}

// Render Open Orders
function renderOpenOrders() {
    const container = document.getElementById('openOrders');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (openOrders.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">No open orders</div>';
        return;
    }
    
    openOrders.forEach(order => {
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';
        orderItem.innerHTML = `
            <div class="order-details">
                <div class="order-pair">${order.pair} - ${order.type}</div>
                <div class="order-info">
                    ${order.amount.toFixed(4)} @ ${formatPrice(order.price)}
                </div>
            </div>
            <button class="order-cancel" onclick="cancelOrder(${order.id})">Cancel</button>
        `;
        container.appendChild(orderItem);
    });
}

// Cancel Order
function cancelOrder(orderId) {
    openOrders = openOrders.filter(order => order.id !== orderId);
    renderOpenOrders();
    showNotification('Order cancelled', 'info');
}

// Update Portfolio
function updatePortfolio() {
    const container = document.getElementById('holdings');
    if (!container) return;
    
    container.innerHTML = '';
    
    portfolio.forEach(holding => {
        const item = document.createElement('div');
        item.className = 'holding-item';
        item.innerHTML = `
            <div class="holding-asset">
                <div class="asset-icon">${holding.symbol[0]}</div>
                <span>${holding.symbol}</span>
            </div>
            <div class="holding-value">
                <div class="holding-amount">${holding.amount.toFixed(4)}</div>
                <div class="holding-usd">$${holding.value.toLocaleString()}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

// Initialize Chart
let chart;
function initializeChart() {
    const canvas = document.getElementById('priceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const resizeCanvas = () => {
        const container = canvas.parentElement;
        canvas.width = container.offsetWidth - 32;
        canvas.height = container.offsetHeight - 48;
        drawChart(ctx);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

// Draw Chart
function drawChart(ctx) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Generate price data
    const points = 100;
    const priceData = [];
    const basePrice = selectedPair.price;
    
    for (let i = 0; i < points; i++) {
        const variation = Math.sin(i / 10) * 0.02 + (Math.random() - 0.5) * 0.005;
        priceData.push(basePrice * (1 + variation));
    }
    
    // Find min and max
    const minPrice = Math.min(...priceData);
    const maxPrice = Math.max(...priceData);
    const priceRange = maxPrice - minPrice;
    
    // Draw grid
    ctx.strokeStyle = 'rgba(139, 146, 185, 0.1)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw price line
    ctx.strokeStyle = selectedPair.change >= 0 ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    priceData.forEach((price, i) => {
        const x = (width / points) * i;
        const y = height - ((price - minPrice) / priceRange) * height;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, selectedPair.change >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fill();
}

// Update Chart
function updateChart() {
    const canvas = document.getElementById('priceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    drawChart(ctx);
}

// Start Price Updates
function startPriceUpdates() {
    setInterval(() => {
        // Update all market prices
        Object.keys(markets).forEach(market => {
            if (Array.isArray(markets[market])) {
                markets[market].forEach(item => {
                    const variation = (Math.random() - 0.5) * 0.002;
                    item.price *= (1 + variation);
                    item.change += variation * 100;
                });
            }
        });
        
        // Update ESX stocks
        Object.values(esxStocks).forEach(sectorStocks => {
            sectorStocks.forEach(stock => {
                const variation = (Math.random() - 0.5) * 0.002;
                stock.price *= (1 + variation);
                stock.change += variation * 100;
            });
        });
        
        // Update Ethiopian futures
        ethiopianFutures.forEach(future => {
            const variation = (Math.random() - 0.5) * 0.002;
            future.price *= (1 + variation);
            future.change += variation * 100;
        });
        
        // Update international futures
        internationalFutures.forEach(future => {
            const variation = (Math.random() - 0.5) * 0.002;
            future.price *= (1 + variation);
            future.change += variation * 100;
        });
        
        // Update selected pair price
        const variation = (Math.random() - 0.5) * 0.001;
        selectedPair.price *= (1 + variation);
        selectedPair.change += variation * 100;
        
        // Update UI
        updateTradingHeader();
        generateOrderBook();
        
        // Update market list prices
        document.querySelectorAll('.market-item').forEach((item, index) => {
            const priceElement = item.querySelector('.price');
            const changeElement = item.querySelector('.change');
            
            if (priceElement && changeElement) {
                let marketData = [];
                
                if (currentMarket === 'stocks' && currentStockRegion === 'national') {
                    marketData = currentSector === 'all' 
                        ? Object.values(esxStocks).flat() 
                        : esxStocks[currentSector] || [];
                } else if (currentMarket === 'futures') {
                    marketData = currentFuturesFilter === 'local' ? ethiopianFutures : internationalFutures;
                } else if (currentMarket === 'forex') {
                    if (currentForexFilter === 'all') {
                        marketData = markets.forex;
                    } else if (currentForexFilter === 'major') {
                        marketData = markets.forex.filter(pair => pair.category === 'major');
                    } else if (currentForexFilter === 'etb') {
                        marketData = markets.forex.filter(pair => pair.category === 'etb');
                    }
                } else {
                    marketData = markets[currentMarket] || [];
                }
                
                if (marketData[index]) {
                    const market = marketData[index];
                    priceElement.textContent = formatPrice(market.price);
                    changeElement.textContent = `${market.change >= 0 ? '+' : ''}${market.change.toFixed(2)}%`;
                    changeElement.className = `change ${market.change >= 0 ? 'positive' : 'negative'}`;
                }
            }
        });
        
        // Update chart
        updateChart();
    }, 3000);
}

// Initialize Ticker - Focus on Ethiopian Markets
function initializeTicker() {
    const tickerContent = document.getElementById('tickerContent');
    if (!tickerContent) return;
    
    // Create ticker items focusing on Ethiopian markets
    const ethiopianMarkets = [
        // ETB Forex pairs
        ...markets.forex.filter(pair => pair.symbol.includes('ETB')),
        // Top ESX stocks from different sectors
        esxStocks.banking[0],
        esxStocks.banking[1],
        esxStocks.telecom[0],
        esxStocks.agriculture[0],
        esxStocks.energy[0],
        esxStocks.gold[0],
        esxStocks.realestate[0],
        esxStocks.manufacturing[0],
        // Ethiopian futures
        ethiopianFutures[0],
        ethiopianFutures[1],
        ethiopianFutures[2],
        // Add some major cryptos for diversity
        markets.crypto[0],
        markets.crypto[1]
    ];
    
    // Duplicate for seamless loop
    for (let i = 0; i < 3; i++) {
        ethiopianMarkets.forEach(market => {
            const item = document.createElement('div');
            item.className = 'ticker-item';
            
            // Add special styling for ESX stocks
            if (market && market.sector) {
                item.innerHTML = `
                    <span class="ticker-symbol" style="color: var(--primary);">
                        <strong>ESX:</strong> ${market.symbol}
                    </span>
                    <span class="ticker-price">ETB ${formatPrice(market.price)}</span>
                    <span class="ticker-change ${market.change >= 0 ? 'positive' : 'negative'}">
                        ${market.change >= 0 ? '+' : ''}${market.change.toFixed(2)}%
                    </span>
                `;
            } else if (market) {
                item.innerHTML = `
                    <span class="ticker-symbol">${market.symbol}</span>
                    <span class="ticker-price">${market.symbol.includes('ETB') ? '' : '$'}${formatPrice(market.price)}</span>
                    <span class="ticker-change ${market.change >= 0 ? 'positive' : 'negative'}">
                        ${market.change >= 0 ? '+' : ''}${market.change.toFixed(2)}%
                    </span>
                `;
            }
            
            tickerContent.appendChild(item);
        });
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#F59E0B'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Make cancelOrder function global
window.cancelOrder = cancelOrder;