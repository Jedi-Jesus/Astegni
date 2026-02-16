        // ============================================
        // AD PACKAGE MANAGER - DYNAMIC PACKAGE SYSTEM
        // ============================================
        const AdPackageManager = {
            // Package configuration
            packages: [
                {
                    id: 'three-days',
                    title: 'Up to Three days',
                    pricePerDay: 2000,
                    currency: CurrencyManager.getCurrency(),
                    duration: 3,
                    featured: false,
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Full analytics suite'
                    ]
                },
                {
                    id: 'seven-days',
                    title: 'Up to Seven days',
                    pricePerDay: 1800,
                    currency: CurrencyManager.getCurrency(),
                    duration: 7,
                    featured: true,
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Full analytics suite',
                    ]
                },
                {
                    id: 'fifteen-days',
                    title: 'Up to fifteen days',
                    pricePerDay: 1500,
                    currency: CurrencyManager.getCurrency(),
                    duration: 15,
                    featured: true,
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Full analytics suite',
                    ]
                },
                {
                    id: 'one-month',
                    title: 'Up to one month',
                    pricePerDay: 1200,
                    currency: CurrencyManager.getCurrency(),
                    duration: 30,
                    featured: true,
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Full analytics suite'
                    ]
                },
                {
                    id: 'three-months',
                    title: 'Up to three months',
                    pricePerDay: 1000,
                    currency: CurrencyManager.getCurrency(),
                    duration: 90,
                    featured: true,
                    badge: 'Most Popular',
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Priority placement',
                        'Full analytics suite'
                    ]
                },
                {
                    id: 'six-months',
                    title: 'Up to six months',
                    pricePerDay: 800,
                    currency: CurrencyManager.getCurrency(),
                    duration: 180,
                    featured: true,
                    badge: 'Most Popular',
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Priority placement',
                        'Full analytics suite',
                    ]
                },
                {
                    id: 'nine-months',
                    title: 'Up to nine months',
                    pricePerDay: 600,
                    currency: CurrencyManager.getCurrency(),
                    duration: 270,
                    featured: true,
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Priority placement',
                        'Full analytics suite',
                    ]
                },
                {
                    id: 'yearly',
                    title: 'Up to a year',
                    pricePerDay: 500,
                    currency: CurrencyManager.getCurrency(),
                    duration: 365,
                    featured: true,
                    badge: 'Most Popular',
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Priority placement',
                        'Full analytics suite',
                    ]
                },
                // ... rest of the packages array from my previous response ...
            ],

            renderPackages() {
                const packagesSection = document.querySelector('#promoAnalyticsModal .ad-packages');
                if (!packagesSection) return;

                packagesSection.innerHTML = `
            <h3>Advertising Packages</h3>
            <div class="packages-grid">
                ${this.packages.map(pkg => this.createPackageCard(pkg)).join('')}
            </div>
        `;
            },

            createPackageCard(pkg) {
                const totalPrice = pkg.pricePerDay * pkg.duration;
                const savings = this.calculateSavings(pkg);

                return `
            <div class="package-card ${pkg.featured ? 'featured' : ''}" data-package-id="${pkg.id}">
                ${pkg.badge ? `<div class="featured-badge">${pkg.badge}</div>` : ''}
                <h4>${pkg.title}</h4>
                <div class="package-price">${pkg.pricePerDay.toLocaleString()} ${pkg.currency}/day</div>
                <div class="package-total">Total: ${totalPrice.toLocaleString()} ${pkg.currency}</div>
                ${savings > 0 ? `<div class="package-savings">Save ${savings.toLocaleString()} ${pkg.currency}</div>` : ''}
                <ul>
                    ${pkg.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
                <button class="btn-primary" onclick="selectPackage('${pkg.id}')">
                    Select Package
                </button>
            </div>
        `;
            },

            calculateSavings(pkg) {
                const basePrice = 2000;
                const actualTotal = pkg.pricePerDay * pkg.duration;
                const expectedTotal = basePrice * pkg.duration;
                return Math.max(0, expectedTotal - actualTotal);
            }
        };

        // Global function for package selection
        window.selectPackage = function (packageId) {
            const pkg = AdPackageManager.packages.find(p => p.id === packageId);
            if (!pkg) return;

            Utils.showToast(`✅ Selected: ${pkg.title} - ${pkg.pricePerDay} ${pkg.currency}/day`, "success");

            // You can add checkout redirection here
            setTimeout(() => {
                // window.location.href = `/checkout?package=${packageId}`;
                console.log('Proceed to checkout with:', pkg);
            }, 1500);
        };
