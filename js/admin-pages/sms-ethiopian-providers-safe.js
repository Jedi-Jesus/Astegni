/**
 * Ethiopian SMS Providers Extension - SAFE VERSION
 * Adds support for Ethiopian SMS Gateway and Ethio Telecom providers
 *
 * SAFE APPROACH: No function wrapping, just extends existing system
 */

(function() {
    'use strict';

    // Wait for everything to be ready
    function initEthiopianProviders() {
        console.log('🇪🇹 Initializing Ethiopian SMS Providers...');

        // Safety check - ensure original functions exist
        if (typeof window.selectSMSProvider !== 'function') {
            console.error('selectSMSProvider not found! Extension cannot load.');
            return;
        }

        // Store original functions safely
        const _originalSelectSMSProvider = window.selectSMSProvider;
        const _originalCloseSMSConfigModal = window.closeSMSConfigModal;
        const _originalGetProviderName = window.getProviderName;
        const _originalCreateSMSProviderCard = window.createSMSProviderCard;
        const _originalEditSMSProvider = window.editSMSProvider;

        // Extend selectSMSProvider
        window.selectSMSProvider = function(providerType) {
            console.log('selectSMSProvider called with:', providerType);

            if (providerType === 'ethiopian_gateway' || providerType === 'ethio_telecom') {
                // Handle Ethiopian providers
                handleEthiopianProviderSelection(providerType);
            } else {
                // Call original for other providers
                if (typeof _originalSelectSMSProvider === 'function') {
                    _originalSelectSMSProvider(providerType);
                }
            }
        };

        // Extend closeSMSConfigModal
        window.closeSMSConfigModal = function() {
            // Call original
            if (typeof _originalCloseSMSConfigModal === 'function') {
                _originalCloseSMSConfigModal();
            }

            // Close Ethiopian modals
            closeEthiopianModals();
        };

        // Extend getProviderName
        window.getProviderName = function(providerType) {
            if (providerType === 'ethiopian_gateway') return 'Ethiopian SMS Gateway';
            if (providerType === 'ethio_telecom') return 'Ethio Telecom';

            // Call original
            if (typeof _originalGetProviderName === 'function') {
                return _originalGetProviderName(providerType);
            }
            return providerType;
        };

        // Extend createSMSProviderCard
        window.createSMSProviderCard = function(provider) {
            if (provider.provider_type === 'ethiopian_gateway' || provider.provider_type === 'ethio_telecom') {
                return createEthiopianProviderCard(provider);
            }

            // Call original
            if (typeof _originalCreateSMSProviderCard === 'function') {
                return _originalCreateSMSProviderCard(provider);
            }
            return '';
        };

        // Extend editSMSProvider
        window.editSMSProvider = async function(providerId, providerType) {
            if (providerType === 'ethiopian_gateway' || providerType === 'ethio_telecom') {
                await editEthiopianProvider(providerId, providerType);
            } else {
                // Call original
                if (typeof _originalEditSMSProvider === 'function') {
                    await _originalEditSMSProvider(providerId, providerType);
                }
            }
        };

        console.log('✅ Ethiopian SMS Providers Extension loaded successfully');
    }

    // Helper: Handle Ethiopian provider selection
    function handleEthiopianProviderSelection(providerType) {
        try {
            // Close add provider modal
            const addModal = document.getElementById('add-sms-provider-modal');
            if (addModal) {
                addModal.classList.add('hidden');
            }

            // Open specific Ethiopian modal
            const modalId = providerType === 'ethiopian_gateway'
                ? 'configure-ethiopian-gateway-modal'
                : 'configure-ethio-telecom-modal';

            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('hidden');
            } else {
                console.error('Ethiopian modal not found:', modalId);
            }
        } catch (error) {
            console.error('Error handling Ethiopian provider selection:', error);
        }
    }

    // Helper: Close Ethiopian modals
    function closeEthiopianModals() {
        try {
            const modalIds = [
                'configure-ethiopian-gateway-modal',
                'configure-ethio-telecom-modal'
            ];

            modalIds.forEach(function(modalId) {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        } catch (error) {
            console.error('Error closing Ethiopian modals:', error);
        }
    }

    // Helper: Create Ethiopian provider card
    function createEthiopianProviderCard(provider) {
        try {
            const config = {
                'ethiopian_gateway': {
                    icon: 'fa-flag',
                    color: 'yellow',
                    name: 'Ethiopian SMS Gateway'
                },
                'ethio_telecom': {
                    icon: 'fa-mobile-alt',
                    color: 'teal',
                    name: 'Ethio Telecom'
                }
            };

            const providerConfig = config[provider.provider_type];
            if (!providerConfig) return '';

            const providerName = window.getProviderName ? window.getProviderName(provider.provider_type) : providerConfig.name;
            const displayInfo = provider.provider_name || provider.account_id || 'Provider';
            const color = providerConfig.color;
            const icon = providerConfig.icon;

            return `
                <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center">
                                    <i class="fas ${icon} text-xl text-${color}-600"></i>
                                </div>
                                <div>
                                    <h3 class="font-semibold text-lg">${providerName}</h3>
                                    <p class="text-sm text-gray-500">${displayInfo}</p>
                                </div>
                                <span class="ml-2 px-3 py-1 rounded-full text-xs font-medium ${provider.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                                    <i class="fas fa-circle text-xs mr-1"></i>${provider.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                                ${provider.provider_type === 'ethiopian_gateway' ? `
                                    <div><span class="text-gray-500">Provider:</span> <span class="ml-2 font-medium">${provider.provider_name || 'N/A'}</span></div>
                                    <div><span class="text-gray-500">Sender ID:</span> <span class="ml-2 font-medium">${provider.sender_id || 'N/A'}</span></div>
                                ` : ''}
                                ${provider.provider_type === 'ethio_telecom' ? `
                                    <div><span class="text-gray-500">Account ID:</span> <span class="ml-2 font-medium">${provider.account_id || 'N/A'}</span></div>
                                    <div><span class="text-gray-500">Short Code:</span> <span class="ml-2 font-medium">${provider.short_code || 'N/A'}</span></div>
                                ` : ''}
                                <div><span class="text-gray-500">Messages Sent:</span> <span class="ml-2 font-medium">${provider.messages_sent || 0}</span></div>
                                <div><span class="text-gray-500">Last Used:</span> <span class="ml-2 font-medium">${provider.last_used ? new Date(provider.last_used).toLocaleDateString() : 'Never'}</span></div>
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
        } catch (error) {
            console.error('Error creating Ethiopian provider card:', error);
            return '';
        }
    }

    // Helper: Edit Ethiopian provider
    async function editEthiopianProvider(providerId, providerType) {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const API_BASE_URL = window.API_BASE_URL || 'https://api.astegni.com';
            const response = await fetch(`${API_BASE_URL}/api/admin/system/sms-provider/${providerId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch provider');

            const provider = await response.json();
            const modalId = providerType === 'ethiopian_gateway'
                ? 'configure-ethiopian-gateway-modal'
                : 'configure-ethio-telecom-modal';

            const modal = document.getElementById(modalId);
            if (!modal) {
                console.error('Modal not found:', modalId);
                return;
            }

            // Populate form fields
            const setField = function(name, value) {
                const field = modal.querySelector(`[name="${name}"]`);
                if (field) field.value = value || '';
            };

            if (providerType === 'ethiopian_gateway') {
                setField('eth_provider_name', provider.provider_name);
                setField('eth_api_url', provider.api_url);
                setField('eth_api_key', ''); // Security
                setField('eth_username', provider.username);
                setField('eth_sender_id', provider.sender_id);
                setField('eth_http_method', provider.http_method || 'POST');
            } else if (providerType === 'ethio_telecom') {
                setField('et_account_id', provider.account_id);
                setField('et_api_key', ''); // Security
                setField('et_api_secret', ''); // Security
                setField('et_short_code', provider.short_code);
                setField('et_api_endpoint', provider.api_endpoint);
            }

            modal.classList.remove('hidden');
        } catch (error) {
            console.error('Error editing Ethiopian provider:', error);
            alert('Failed to load provider details: ' + error.message);
        }
    }

    // Initialize when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEthiopianProviders);
    } else {
        // DOM already loaded, init now
        initEthiopianProviders();
    }

})();
