/**
 * Payment Method Modal Manager
 * Handles CRUD operations for payment methods (Bank, Mobile Money)
 * Mobile Money includes: TeleBirr, CBE Birr, M-Pesa, M-Birr, HelloCash, Amole
 * Features: Sliding panel animation like 2FA modal
 */

(function() {
    'use strict';

    // API Base URL
    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

    // State
    let paymentMethods = [];
    let editingPaymentMethodId = null;

    // Bank names mapping
    const BANK_NAMES = {
        'cbe': 'Commercial Bank of Ethiopia',
        'dashen': 'Dashen Bank',
        'awash': 'Awash Bank',
        'boa': 'Bank of Abyssinia',
        'wegagen': 'Wegagen Bank',
        'united': 'United Bank',
        'nib': 'Nib International Bank',
        'coop': 'Cooperative Bank of Oromia',
        'lion': 'Lion International Bank',
        'bunna': 'Bunna International Bank',
        'abay': 'Abay Bank',
        'berhan': 'Berhan International Bank',
        'oromia': 'Oromia Bank',
        'zemen': 'Zemen Bank',
        'enat': 'Enat Bank',
        'addis': 'Addis International Bank',
        'debub': 'Debub Global Bank',
        'other': 'Other Bank'
    };

    const PROVIDER_NAMES = {
        'telebirr': 'TeleBirr',
        'm-pesa': 'M-Pesa',
        'm-birr': 'M-Birr',
        'hello-cash': 'HelloCash'
    };

    /**
     * Get auth token from localStorage
     */
    function getAuthToken() {
        return localStorage.getItem('token') || localStorage.getItem('authToken');
    }

    /**
     * PaymentMethodManager - Main class for managing payment methods
     */
    const PaymentMethodManager = {
        /**
         * Open the add/edit panel
         * @param {string} mode - 'add' or 'edit'
         * @param {number} methodId - Payment method ID (for edit mode)
         */
        openMethodPanel: function(mode, methodId = null) {
            const panel = document.getElementById('payment-panel-add');
            if (!panel) {
                console.error('Payment panel not found');
                return;
            }

            // Reset to step 1
            this.showStep('step1');

            // Update title
            const titleEl = document.getElementById('payment-panel-title');
            if (titleEl) {
                titleEl.textContent = mode === 'edit' ? 'Edit Payment Method' : 'Add Payment Method';
            }

            // If editing, load the data
            if (mode === 'edit' && methodId) {
                editingPaymentMethodId = methodId;
                this.loadMethodForEdit(methodId);
            } else {
                editingPaymentMethodId = null;
                this.clearForms();
            }

            // Show panel with animation
            panel.classList.add('active');
        },

        /**
         * Close the sliding panel
         */
        closeMethodPanel: function() {
            const panel = document.getElementById('payment-panel-add');
            if (panel) {
                panel.classList.remove('active');
            }

            // Reset state
            editingPaymentMethodId = null;
            this.clearForms();

            // Reload payment methods
            loadPaymentMethods();
        },

        /**
         * Select method type and go to step 2
         * @param {string} type - 'bank' or 'mobile_money'
         */
        selectMethodType: function(type) {
            if (type === 'bank') {
                this.showStep('step2-bank');
            } else if (type === 'mobile_money') {
                this.showStep('step2-mobile');
            }
        },

        /**
         * Go back to step 1
         */
        backToStep1: function() {
            this.showStep('step1');
        },

        /**
         * Show a specific step
         * @param {string} step - 'step1', 'step2-bank', 'step2-mobile', 'step3-success'
         */
        showStep: function(step) {
            // Hide all steps
            document.getElementById('payment-step1')?.classList.add('hidden');
            document.getElementById('payment-step2-bank')?.classList.add('hidden');
            document.getElementById('payment-step2-mobile')?.classList.add('hidden');
            document.getElementById('payment-step3-success')?.classList.add('hidden');

            // Show selected step
            const stepEl = document.getElementById('payment-' + step);
            if (stepEl) {
                stepEl.classList.remove('hidden');
            }
        },

        /**
         * Clear all form fields
         */
        clearForms: function() {
            // Bank fields
            const bankName = document.getElementById('bankName');
            const accountNumber = document.getElementById('accountNumber');
            const accountHolderName = document.getElementById('accountHolderName');
            const bankNickname = document.getElementById('bankNickname');
            const bankIsPrimary = document.getElementById('bankIsPrimary');

            if (bankName) bankName.value = '';
            if (accountNumber) accountNumber.value = '';
            if (accountHolderName) accountHolderName.value = '';
            if (bankNickname) bankNickname.value = '';
            if (bankIsPrimary) bankIsPrimary.checked = false;

            // Mobile money fields
            const mobileProvider = document.getElementById('mobileProvider');
            const mobileNumber = document.getElementById('mobileNumber');
            const mobileRegisteredName = document.getElementById('mobileRegisteredName');
            const mobileNickname = document.getElementById('mobileNickname');
            const mobileIsPrimary = document.getElementById('mobileIsPrimary');

            if (mobileProvider) mobileProvider.value = '';
            if (mobileNumber) mobileNumber.value = '';
            if (mobileRegisteredName) mobileRegisteredName.value = '';
            if (mobileNickname) mobileNickname.value = '';
            if (mobileIsPrimary) mobileIsPrimary.checked = false;
        },

        /**
         * Load method data for editing
         * @param {number} methodId - Payment method ID
         */
        loadMethodForEdit: function(methodId) {
            const method = paymentMethods.find(m => m.id === methodId);
            if (!method) {
                console.error('Payment method not found:', methodId);
                return;
            }

            if (method.method_type === 'bank') {
                // Show bank step
                this.showStep('step2-bank');

                // Fill bank fields
                const bankName = document.getElementById('bankName');
                const accountNumber = document.getElementById('accountNumber');
                const accountHolderName = document.getElementById('accountHolderName');
                const bankNickname = document.getElementById('bankNickname');
                const bankIsPrimary = document.getElementById('bankIsPrimary');

                if (bankName) bankName.value = method.bank_code || '';
                if (accountNumber) accountNumber.value = method.account_number || '';
                if (accountHolderName) accountHolderName.value = method.account_holder_name || '';
                if (bankNickname) bankNickname.value = method.nickname || '';
                if (bankIsPrimary) bankIsPrimary.checked = method.is_primary || false;
            } else if (method.method_type === 'mobile_money') {
                // Show mobile money step
                this.showStep('step2-mobile');

                // Fill mobile money fields
                const mobileProvider = document.getElementById('mobileProvider');
                const mobileNumber = document.getElementById('mobileNumber');
                const mobileRegisteredName = document.getElementById('mobileRegisteredName');
                const mobileNickname = document.getElementById('mobileNickname');
                const mobileIsPrimary = document.getElementById('mobileIsPrimary');

                if (mobileProvider) mobileProvider.value = method.provider || '';
                if (mobileNumber) mobileNumber.value = method.phone_number || '';
                if (mobileRegisteredName) mobileRegisteredName.value = method.registered_name || '';
                if (mobileNickname) mobileNickname.value = method.nickname || '';
                if (mobileIsPrimary) mobileIsPrimary.checked = method.is_primary || false;
            }
        },

        /**
         * Save bank payment method
         */
        saveBankMethod: async function() {
            const bankCode = document.getElementById('bankName')?.value;
            const accountNumber = document.getElementById('accountNumber')?.value;
            const accountHolderName = document.getElementById('accountHolderName')?.value;
            const nickname = document.getElementById('bankNickname')?.value;
            const isPrimary = document.getElementById('bankIsPrimary')?.checked || false;

            // Validation
            if (!bankCode) {
                alert('Please select a bank');
                return;
            }
            if (!accountNumber) {
                alert('Please enter your account number');
                return;
            }
            if (!accountHolderName) {
                alert('Please enter the account holder name');
                return;
            }

            const payload = {
                method_type: 'bank',
                bank_code: bankCode,
                bank_name: BANK_NAMES[bankCode] || bankCode,
                account_number: accountNumber,
                account_holder_name: accountHolderName,
                nickname: nickname || null,
                is_primary: isPrimary
            };

            await this.savePaymentMethod(payload, 'save-bank-btn', 'save-bank-btn-text');
        },

        /**
         * Save mobile money payment method
         */
        saveMobileMethod: async function() {
            const provider = document.getElementById('mobileProvider')?.value;
            const phoneNumber = document.getElementById('mobileNumber')?.value;
            const registeredName = document.getElementById('mobileRegisteredName')?.value;
            const nickname = document.getElementById('mobileNickname')?.value;
            const isPrimary = document.getElementById('mobileIsPrimary')?.checked || false;

            // Validation
            if (!provider) {
                alert('Please select a mobile money provider');
                return;
            }
            if (!phoneNumber) {
                alert('Please enter your phone number');
                return;
            }
            if (!registeredName) {
                alert('Please enter your registered name');
                return;
            }

            const payload = {
                method_type: 'mobile_money',
                provider: provider,
                phone_number: phoneNumber,
                registered_name: registeredName,
                nickname: nickname || null,
                is_primary: isPrimary
            };

            await this.savePaymentMethod(payload, 'save-mobile-btn', 'save-mobile-btn-text');
        },

        /**
         * Save payment method to API
         * @param {Object} payload - Payment method data
         * @param {string} btnId - Button ID
         * @param {string} btnTextId - Button text element ID
         */
        savePaymentMethod: async function(payload, btnId, btnTextId) {
            const token = getAuthToken();
            if (!token) {
                alert('Please log in to save payment methods');
                return;
            }

            const btn = document.getElementById(btnId);
            const btnText = document.getElementById(btnTextId);

            if (btn) btn.disabled = true;
            if (btnText) btnText.textContent = 'Saving...';

            try {
                let url = `${API_BASE_URL}/api/payment-methods`;
                let method = 'POST';

                if (editingPaymentMethodId) {
                    url = `${API_BASE_URL}/api/payment-methods/${editingPaymentMethodId}`;
                    method = 'PUT';
                }

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to save payment method');
                }

                const result = await response.json();
                console.log('Payment method saved:', result);

                // Show success step
                this.showStep('step3-success');

                // Update success message
                const successTitle = document.querySelector('#payment-step3-success h4');
                if (successTitle) {
                    successTitle.textContent = editingPaymentMethodId ? 'Payment Method Updated!' : 'Payment Method Added!';
                }

                // Reload payment methods in background
                loadPaymentMethods();

            } catch (error) {
                console.error('Error saving payment method:', error);
                alert(error.message || 'Failed to save payment method. Please try again.');
            } finally {
                if (btn) btn.disabled = false;
                if (btnText) btnText.textContent = 'Save';
            }
        }
    };

    /**
     * Open Payment Method Modal
     */
    async function openPaymentMethodModal() {
        console.log('Opening Payment Method Modal...');

        const modal = document.getElementById('payment-method-modal');
        if (!modal) {
            console.error('Payment Method Modal not found!');
            return;
        }

        modal.classList.remove('hidden');
        modal.classList.add('active');
        modal.style.display = 'flex';

        // Load existing payment methods
        await loadPaymentMethods();

        console.log('Payment Method Modal opened');
    }

    /**
     * Close Payment Method Modal
     */
    function closePaymentMethodModal() {
        const modal = document.getElementById('payment-method-modal');
        if (!modal) return;

        modal.classList.add('hidden');
        modal.classList.remove('active');
        modal.style.display = 'none';

        // Close any open panels
        const panel = document.getElementById('payment-panel-add');
        if (panel) {
            panel.classList.remove('active');
        }

        // Reset state
        editingPaymentMethodId = null;
        PaymentMethodManager.clearForms();
    }

    /**
     * Load existing payment methods from API
     */
    async function loadPaymentMethods() {
        const token = getAuthToken();
        if (!token) {
            console.warn('No auth token found');
            showEmptyState();
            return;
        }

        showLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/payment-methods`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load payment methods');
            }

            paymentMethods = await response.json();
            console.log('Loaded payment methods:', paymentMethods);

            showLoading(false);

            if (paymentMethods.length > 0) {
                showPaymentMethodsList();
            } else {
                showEmptyState();
            }
        } catch (error) {
            console.error('Error loading payment methods:', error);
            showLoading(false);
            showEmptyState();
        }
    }

    /**
     * Show loading state
     */
    function showLoading(show) {
        const loading = document.getElementById('payment-loading');
        const listSection = document.getElementById('payment-methods-list-section');
        const emptyState = document.getElementById('payment-empty-state');

        if (show) {
            loading?.classList.remove('hidden');
            listSection?.classList.add('hidden');
            emptyState?.classList.add('hidden');
        } else {
            loading?.classList.add('hidden');
        }
    }

    /**
     * Show the list of existing payment methods
     */
    function showPaymentMethodsList() {
        document.getElementById('payment-loading')?.classList.add('hidden');
        document.getElementById('payment-empty-state')?.classList.add('hidden');
        document.getElementById('payment-methods-list-section')?.classList.remove('hidden');

        const listContainer = document.getElementById('paymentMethodsList');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        paymentMethods.forEach(method => {
            const card = createPaymentMethodCard(method);
            listContainer.appendChild(card);
        });
    }

    /**
     * Show empty state
     */
    function showEmptyState() {
        document.getElementById('payment-loading')?.classList.add('hidden');
        document.getElementById('payment-methods-list-section')?.classList.add('hidden');
        document.getElementById('payment-empty-state')?.classList.remove('hidden');
    }

    /**
     * Create a payment method card element
     */
    function createPaymentMethodCard(method) {
        const div = document.createElement('div');
        div.className = 'p-4 border border-gray-200 rounded-xl hover:border-green-500 transition-all';

        let icon, color, title, details;

        if (method.method_type === 'bank') {
            icon = `<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>`;
            color = 'blue';
            title = BANK_NAMES[method.bank_code] || method.bank_name || 'Bank Account';
            details = `****${method.account_number?.slice(-4) || '****'}`;
        } else if (method.method_type === 'mobile_money') {
            // Color based on provider
            const providerColors = {
                'telebirr': 'orange',
                'cbe-birr': 'indigo',
                'm-pesa': 'green',
                'm-birr': 'purple',
                'hello-cash': 'pink',
                'amole': 'cyan'
            };
            color = providerColors[method.provider] || 'purple';
            icon = `<svg class="w-5 h-5 text-${color}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>`;
            title = PROVIDER_NAMES[method.provider] || 'Mobile Money';
            details = method.phone_number || '';
        } else {
            icon = `<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>`;
            color = 'gray';
            title = 'Payment Method';
            details = '';
        }

        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-${color}-100 rounded-full flex items-center justify-center">
                    ${icon}
                </div>
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        <h5 class="font-semibold text-gray-800 text-sm">${method.nickname || title}</h5>
                        ${method.is_primary ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Primary</span>' : ''}
                        ${method.is_verified ? '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Verified</span>' : ''}
                    </div>
                    <p class="text-xs text-gray-500">${details}</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="PaymentMethodManager.openMethodPanel('edit', ${method.id})" class="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button onclick="deletePaymentMethod(${method.id})" class="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                    ${!method.is_primary ? `
                        <button onclick="setPrimaryPaymentMethod(${method.id})" class="p-2 text-gray-400 hover:text-green-600 transition-colors" title="Set as Primary">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        return div;
    }

    /**
     * Delete a payment method
     */
    async function deletePaymentMethod(id) {
        if (!confirm('Are you sure you want to delete this payment method?')) {
            return;
        }

        const token = getAuthToken();
        if (!token) {
            alert('Please log in to delete payment methods');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/payment-methods/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete payment method');
            }

            // Remove from local array
            paymentMethods = paymentMethods.filter(m => m.id !== id);

            // Refresh the list
            if (paymentMethods.length > 0) {
                showPaymentMethodsList();
            } else {
                showEmptyState();
            }

            console.log('Payment method deleted successfully');

            if (typeof showToast === 'function') {
                showToast('Payment method deleted', 'success');
            }
        } catch (error) {
            console.error('Error deleting payment method:', error);
            alert('Failed to delete payment method. Please try again.');
        }
    }

    /**
     * Set a payment method as primary
     */
    async function setPrimaryPaymentMethod(id) {
        const token = getAuthToken();
        if (!token) {
            alert('Please log in to update payment methods');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/payment-methods/${id}/set-primary`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to set primary payment method');
            }

            // Reload payment methods
            await loadPaymentMethods();

            console.log('Primary payment method updated');

            if (typeof showToast === 'function') {
                showToast('Primary payment method updated', 'success');
            }
        } catch (error) {
            console.error('Error setting primary payment method:', error);
            alert('Failed to update primary payment method. Please try again.');
        }
    }

    // Make functions globally available
    window.PaymentMethodManager = PaymentMethodManager;
    window.openPaymentMethodModal = openPaymentMethodModal;
    window.closePaymentMethodModal = closePaymentMethodModal;
    window.deletePaymentMethod = deletePaymentMethod;
    window.setPrimaryPaymentMethod = setPrimaryPaymentMethod;

    console.log('Payment Method Modal: JavaScript loaded');
})();
