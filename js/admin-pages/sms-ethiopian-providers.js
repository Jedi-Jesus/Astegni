/**
 * Ethiopian SMS Providers Extension
 * Adds support for Ethiopian SMS Gateway and Ethio Telecom providers
 *
 * This file extends the existing SMS provider management system
 * Include this file after manage-system-settings.js
 */

// Extend the selectSMSProvider function to support Ethiopian providers
(function() {
    const originalSelectSMSProvider = window.selectSMSProvider;

    window.selectSMSProvider = function(providerType) {
        // Check if it's an Ethiopian provider
        if (providerType === 'ethiopian_gateway' || providerType === 'ethio_telecom') {
            // Close provider selection modal
            if (typeof closeAddSMSProviderModal === 'function') {
                closeAddSMSProviderModal();
            }

            // Open specific Ethiopian provider modal
            const modalMap = {
                'ethiopian_gateway': 'configure-ethiopian-gateway-modal',
                'ethio_telecom': 'configure-ethio-telecom-modal'
            };

            const modalId = modalMap[providerType];
            if (modalId) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.remove('hidden');
                }
            }
        } else {
            // Call original function for other providers
            originalSelectSMSProvider(providerType);
        }
    };
})();

// Extend closeSMSConfigModal to include Ethiopian modals
(function() {
    const originalCloseSMSConfigModal = window.closeSMSConfigModal;

    window.closeSMSConfigModal = function() {
        // Call original function
        originalCloseSMSConfigModal();

        // Also close Ethiopian modals
        const ethiopianModalIds = [
            'configure-ethiopian-gateway-modal',
            'configure-ethio-telecom-modal'
        ];

        ethiopianModalIds.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    };
})();

// Extend getProviderName to include Ethiopian providers
(function() {
    const originalGetProviderName = window.getProviderName;

    window.getProviderName = function(providerType) {
        const ethiopianNames = {
            'ethiopian_gateway': 'Ethiopian SMS Gateway',
            'ethio_telecom': 'Ethio Telecom'
        };

        return ethiopianNames[providerType] || originalGetProviderName(providerType);
    };
})();

// Extend createSMSProviderCard to include Ethiopian providers
(function() {
    const originalCreateSMSProviderCard = window.createSMSProviderCard;

    window.createSMSProviderCard = function(provider) {
        // Check if it's an Ethiopian provider
        if (provider.provider_type === 'ethiopian_gateway' || provider.provider_type === 'ethio_telecom') {
            const iconMap = {
                'ethiopian_gateway': 'fa-flag text-yellow-600',
                'ethio_telecom': 'fa-mobile-alt text-teal-600'
            };

            const colorMap = {
                'ethiopian_gateway': 'yellow',
                'ethio_telecom': 'teal'
            };

            const icon = iconMap[provider.provider_type];
            const color = colorMap[provider.provider_type];

            // Create custom card for Ethiopian providers
            return `
                <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center">
                                    <i class="fas ${icon} text-xl"></i>
                                </div>
                                <div>
                                    <h3 class="font-semibold text-lg">${getProviderName(provider.provider_type)}</h3>
                                    <p class="text-sm text-gray-500">${provider.provider_name || provider.account_id || 'Provider'}</p>
                                </div>
                                <span class="ml-2 px-3 py-1 rounded-full text-xs font-medium ${provider.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                                    <i class="fas fa-circle text-xs mr-1"></i>${provider.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                                ${provider.provider_type === 'ethiopian_gateway' ? `
                                    <div>
                                        <span class="text-gray-500">Provider:</span>
                                        <span class="ml-2 font-medium">${provider.provider_name || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span class="text-gray-500">Sender ID:</span>
                                        <span class="ml-2 font-medium">${provider.sender_id || 'N/A'}</span>
                                    </div>
                                ` : ''}
                                ${provider.provider_type === 'ethio_telecom' ? `
                                    <div>
                                        <span class="text-gray-500">Account ID:</span>
                                        <span class="ml-2 font-medium">${provider.account_id || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span class="text-gray-500">Short Code:</span>
                                        <span class="ml-2 font-medium">${provider.short_code || 'N/A'}</span>
                                    </div>
                                ` : ''}
                                <div>
                                    <span class="text-gray-500">Messages Sent:</span>
                                    <span class="ml-2 font-medium">${provider.messages_sent || 0}</span>
                                </div>
                                <div>
                                    <span class="text-gray-500">Last Used:</span>
                                    <span class="ml-2 font-medium">${provider.last_used ? new Date(provider.last_used).toLocaleDateString() : 'Never'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-2 ml-4">
                            <button onclick="editSMSProvider(${provider.id}, '${provider.provider_type}')" class="px-4 py-2 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 transition-colors">
                                <i class="fas fa-edit mr-2"></i>Edit
                            </button>
                            <button onclick="toggleSMSProvider(${provider.id})" class="px-4 py-2 ${provider.is_active ? 'bg-gray-600' : 'bg-green-600'} text-white rounded-lg hover:opacity-90 transition-opacity">
                                <i class="fas fa-${provider.is_active ? 'pause' : 'play'} mr-2"></i>${provider.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button onclick="deleteSMSProvider(${provider.id})" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                <i class="fas fa-trash mr-2"></i>Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        // Call original function for other providers
        return originalCreateSMSProviderCard(provider);
    };
})();

// Extend editSMSProvider to support Ethiopian providers
(function() {
    const originalEditSMSProvider = window.editSMSProvider;

    window.editSMSProvider = async function(providerId, providerType) {
        // Check if it's an Ethiopian provider
        if (providerType === 'ethiopian_gateway' || providerType === 'ethio_telecom') {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await fetch(`${window.API_BASE_URL}/api/admin/system/sms-provider/${providerId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const provider = await response.json();

                    const modalMap = {
                        'ethiopian_gateway': 'configure-ethiopian-gateway-modal',
                        'ethio_telecom': 'configure-ethio-telecom-modal'
                    };

                    const modalId = modalMap[providerType];
                    const modal = document.getElementById(modalId);

                    if (modal) {
                        if (providerType === 'ethiopian_gateway') {
                            modal.querySelector('[name="eth_provider_name"]').value = provider.provider_name || '';
                            modal.querySelector('[name="eth_api_url"]').value = provider.api_url || '';
                            modal.querySelector('[name="eth_api_key"]').value = ''; // Don't show for security
                            modal.querySelector('[name="eth_username"]').value = provider.username || '';
                            modal.querySelector('[name="eth_sender_id"]').value = provider.sender_id || '';
                            modal.querySelector('[name="eth_http_method"]').value = provider.http_method || 'POST';
                        } else if (providerType === 'ethio_telecom') {
                            modal.querySelector('[name="et_account_id"]').value = provider.account_id || '';
                            modal.querySelector('[name="et_api_key"]').value = ''; // Don't show for security
                            modal.querySelector('[name="et_api_secret"]').value = ''; // Don't show for security
                            modal.querySelector('[name="et_short_code"]').value = provider.short_code || '';
                            modal.querySelector('[name="et_api_endpoint"]').value = provider.api_endpoint || '';
                        }

                        modal.classList.remove('hidden');
                    }
                }
            } catch (error) {
                console.error('Error loading provider details:', error);
                alert('Failed to load provider details: ' + error.message);
            }
        } else {
            // Call original function for other providers
            await originalEditSMSProvider(providerId, providerType);
        }
    };
})();

console.log('✅ Ethiopian SMS Providers Extension loaded successfully');
