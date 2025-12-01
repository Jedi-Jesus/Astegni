        /**
         * Open Leave Astegni Modal
         */
        // ===== SUBSCRIPTION MANAGEMENT FUNCTIONS =====

        let currentSubscription = null; // Track current subscription
        let currentUnsubscribePlan = null; // Track plan being unsubscribed

        /**
         * Open Switch Subscription Modal
         */
        function openSwitchSubscriptionModal() {
            const modal = document.getElementById('switchSubscriptionModal');
            const optionsContainer = document.getElementById('switchSubscriptionOptions');

            if (!modal || !optionsContainer) {
                console.error('❌ Switch Subscription Modal or container not found!');
                return;
            }

            // Populate with all available plans
            const plans = [
                { name: 'Starter', price: 500, storage: 64 },
                { name: 'Basic', price: 750, storage: 100 },
                { name: 'Professional', price: 1875, storage: 250 },
                { name: 'Advanced', price: 3750, storage: 500 },
                { name: 'Enterprise', price: 7500, storage: 1000 }
            ];

            optionsContainer.innerHTML = plans.map(plan => `
                <div class="subscription-card ${currentSubscription === plan.name.toLowerCase() ? 'opacity-50' : ''}">
                    <h3 class="subscription-title">${plan.name}</h3>
                    <div class="subscription-price">
                        <div class="price">${plan.price.toLocaleString()} ETB/month</div>
                    </div>
                    <ul class="subscription-features">
                        <li><i class="fas fa-check"></i> ${plan.storage} GB Storage</li>
                        <li><i class="fas fa-check"></i> Boosted Visibility</li>
                    </ul>
                    <div class="subscription-actions">
                        <button class="subscribe-btn ${currentSubscription === plan.name.toLowerCase() ? 'opacity-50 cursor-not-allowed' : ''}"
                                onclick="switchToPlan('${plan.name.toLowerCase()}', ${plan.price}, ${plan.storage})"
                                ${currentSubscription === plan.name.toLowerCase() ? 'disabled' : ''}>
                            ${currentSubscription === plan.name.toLowerCase() ? 'Current Plan' : 'Switch to This'}
                        </button>
                    </div>
                </div>
            `).join('');

            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }

        function closeSwitchSubscriptionModal() {
            const modal = document.getElementById('switchSubscriptionModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }

        function switchToPlan(plan, price, storage) {
            currentSubscription = plan;

            // Update button states
            document.querySelectorAll('.subscribe-btn').forEach(btn => {
                const btnPlan = btn.getAttribute('data-plan');
                if (btnPlan === plan) {
                    btn.style.display = 'none';
                    btn.classList.add('hidden');

                    const switchBtn = btn.parentElement.querySelector('.switch-plan-btn');
                    const unsubBtn = btn.parentElement.querySelector('.unsubscribe-btn');

                    if (switchBtn) {
                        switchBtn.classList.remove('hidden');
                        switchBtn.style.display = 'block';
                    }
                    if (unsubBtn) {
                        unsubBtn.classList.remove('hidden');
                        unsubBtn.style.display = 'block';
                    }
                } else {
                    btn.style.display = 'block';
                    btn.classList.remove('hidden');

                    const switchBtn = btn.parentElement.querySelector('.switch-plan-btn');
                    const unsubBtn = btn.parentElement.querySelector('.unsubscribe-btn');

                    if (switchBtn) {
                        switchBtn.classList.add('hidden');
                        switchBtn.style.display = 'none';
                    }
                    if (unsubBtn) {
                        unsubBtn.classList.add('hidden');
                        unsubBtn.style.display = 'none';
                    }
                }
            });

            // Update the current subscription card
            updateCurrentSubscriptionCard();

            closeSwitchSubscriptionModal();
            alert(`✅ Successfully switched to ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan!`);
        }

        /**
         * Start Unsubscribe Flow
         */
        function startUnsubscribeFlow(plan) {
            currentUnsubscribePlan = plan;
            const modal = document.getElementById('unsubscribeModal1');
            if (modal) {
                // Clear previous selections
                document.querySelectorAll('input[name="unsubscribeReason"]').forEach(cb => cb.checked = false);
                document.getElementById('otherTextUnsubscribe').value = '';
                document.getElementById('otherTextUnsubscribe').style.display = 'none';

                modal.classList.remove('hidden');
                modal.style.display = 'flex';
            }
        }

        // Handle "Other" checkbox for unsubscribe
        document.addEventListener('DOMContentLoaded', function () {
            const otherCheckbox = document.getElementById('unsubscribeOtherCheckbox');
            if (otherCheckbox) {
                otherCheckbox.addEventListener('change', function () {
                    document.getElementById('otherTextUnsubscribe').style.display =
                        this.checked ? 'block' : 'none';
                });
            }

            const deleteOtherCheckbox = document.getElementById('deleteOtherCheckbox');
            if (deleteOtherCheckbox) {
                deleteOtherCheckbox.addEventListener('change', function () {
                    document.getElementById('otherTextDelete').style.display =
                        this.checked ? 'block' : 'none';
                });
            }
        });

        function closeUnsubscribeModal1() {
            const modal = document.getElementById('unsubscribeModal1');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }

        function submitUnsubscribeReasons() {
            const reasons = Array.from(document.querySelectorAll('input[name="unsubscribeReason"]:checked'))
                .map(cb => cb.value);
            const otherText = document.getElementById('otherTextUnsubscribe').value;

            if (reasons.length === 0) {
                alert('⚠️ Please select at least one reason.');
                return;
            }

            if (reasons.includes('other') && !otherText) {
                alert('⚠️ Please specify the reason for "Other".');
                return;
            }

            console.log('📝 Unsubscribe reasons:', reasons, otherText);
            closeUnsubscribeModal1();

            const modal = document.getElementById('unsubscribeConfirm1');
            if (modal) {
                document.getElementById('unsubscribeFirstConfirmText').textContent =
                    `This decision will deactivate your ${currentUnsubscribePlan} subscription.`;
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
            }
        }

        function closeUnsubscribeConfirm1() {
            const modal = document.getElementById('unsubscribeConfirm1');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }

        function proceedToUnsubscribeFeeWarning() {
            closeUnsubscribeConfirm1();
            const modal = document.getElementById('unsubscribeConfirm2');
            if (modal) {
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
            }
        }

        function closeUnsubscribeConfirm2() {
            const modal = document.getElementById('unsubscribeConfirm2');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }

        function proceedToUnsubscribePassword() {
            closeUnsubscribeConfirm2();
            const modal = document.getElementById('unsubscribePasswordModal');
            if (modal) {
                document.getElementById('unsubscribePassword').value = '';
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
            }
        }

        function closeUnsubscribePasswordModal() {
            const modal = document.getElementById('unsubscribePasswordModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }

        function finalConfirmUnsubscribe() {
            const password = document.getElementById('unsubscribePassword').value;

            if (!password) {
                alert('⚠️ Please enter your password.');
                return;
            }

            // TODO: Verify password with backend
            // For now, simulate success

            closeUnsubscribePasswordModal();

            // Update UI to show unsubscribed state
            document.querySelectorAll('.subscribe-btn').forEach(btn => {
                const btnPlan = btn.getAttribute('data-plan');
                if (btnPlan === currentUnsubscribePlan) {
                    btn.style.display = 'block';
                    btn.classList.remove('hidden');

                    const switchBtn = btn.parentElement.querySelector('.switch-plan-btn');
                    const unsubBtn = btn.parentElement.querySelector('.unsubscribe-btn');

                    if (switchBtn) {
                        switchBtn.classList.add('hidden');
                        switchBtn.style.display = 'none';
                    }
                    if (unsubBtn) {
                        unsubBtn.classList.add('hidden');
                        unsubBtn.style.display = 'none';
                    }
                }
            });

            currentSubscription = null;

            // Hide the current subscription card
            updateCurrentSubscriptionCard();

            const modal = document.getElementById('unsubscribeFinalModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
            }
        }

        function closeUnsubscribeFinalModal() {
            const modal = document.getElementById('unsubscribeFinalModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }

        // ===== LEAVE ASTEGNI / DELETE ACCOUNT FUNCTIONS =====

        /**
         * Step 1: Open initial warning modal (RED DANGER styling with TYPE "DELETE")
         */
        function openLeaveAstegniModal() {
            console.log('🔵 Opening Leave Astegni Modal...');
            const modal = document.getElementById('leave-astegni-modal');
            if (!modal) {
                console.error('❌ Leave Astegni Modal not found!');
                return;
            }

            // Clear previous input
            document.getElementById('deleteConfirmation').value = '';
            document.getElementById('leaveReason').value = '';

            modal.classList.remove('hidden');
            modal.classList.add('active');
            modal.style.display = 'flex';
            console.log('✅ Leave Astegni Modal opened');
        }

        function closeLeaveAstegniModal() {
            const modal = document.getElementById('leave-astegni-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        }

        /**
         * Step 1 → Step 2: Validate "DELETE" text and proceed to reasons
         */
        function confirmDeleteAccount() {
            const confirmation = document.getElementById('deleteConfirmation').value;
            const reason = document.getElementById('leaveReason').value;

            if (confirmation !== 'DELETE') {
                alert('⚠️ Please type "DELETE" to confirm account deletion');
                return;
            }

            console.log('📝 Initial confirmation:', reason || 'No reason provided');

            // Close first modal, open reasons modal
            closeLeaveAstegniModal();

            const modal = document.getElementById('deleteModal1');
            if (modal) {
                // Clear previous selections
                document.querySelectorAll('input[name="deleteReason"]').forEach(cb => cb.checked = false);
                document.getElementById('otherTextDelete').value = '';
                document.getElementById('otherTextDelete').style.display = 'none';

                modal.classList.remove('hidden');
                modal.style.display = 'flex';
            }
        }

        /**
         * Step 2: Close reasons modal
         */
        function closeDeleteModal1() {
            const modal = document.getElementById('deleteModal1');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }

        /**
         * Step 2 → Step 3: Submit reasons and proceed to 90-day warning
         */
        function submitDeleteReasons() {
            const reasons = Array.from(document.querySelectorAll('input[name="deleteReason"]:checked'))
                .map(cb => cb.value);
            const otherText = document.getElementById('otherTextDelete').value;

            if (reasons.length === 0) {
                alert('⚠️ Please select at least one reason.');
                return;
            }

            if (reasons.includes('other') && !otherText) {
                alert('⚠️ Please specify the reason for "Other".');
                return;
            }

            console.log('📝 Delete reasons:', reasons, otherText);
            closeDeleteModal1();

            const modal = document.getElementById('deleteVerifyModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
            }
        }

        /**
         * Step 3: Close 90-day warning modal
         */
        function closeDeleteVerifyModal() {
            const modal = document.getElementById('deleteVerifyModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }

        /**
         * Step 3 → Step 4: Check subscriptions
         */
        function proceedToSubscriptionCheck() {
            closeDeleteVerifyModal();

            // Check if user has active subscriptions
            if (currentSubscription) {
                const modal = document.getElementById('deleteSubscriptionCheckModal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.style.display = 'flex';
                }
            } else {
                // No active subscriptions, proceed directly to password
                const modal = document.getElementById('deletePasswordModal');
                if (modal) {
                    document.getElementById('deletePassword').value = '';
                    modal.classList.remove('hidden');
                    modal.style.display = 'flex';
                }
            }
        }

        /**
         * Step 4: Close subscription check modal
         */
        function closeDeleteSubscriptionCheckModal() {
            const modal = document.getElementById('deleteSubscriptionCheckModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }

        /**
         * Step 5: Close password modal
         */
        function closeDeletePasswordModal() {
            const modal = document.getElementById('deletePasswordModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        }

        /**
         * Step 5 → Step 6: Final confirmation with password
         */
        function finalConfirmDeleteAccount() {
            const password = document.getElementById('deletePassword').value;

            if (!password) {
                alert('⚠️ Please enter your password.');
                return;
            }

            // TODO: Verify password with backend
            console.log('🗑️ Account scheduled for deletion in 90 days');

            closeDeletePasswordModal();

            const modal = document.getElementById('deleteFinalModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
            }
        }

        /**
         * Step 6: Close final message and redirect
         */
        function closeDeleteFinalModal() {
            const modal = document.getElementById('deleteFinalModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';

                // Redirect to home after a delay
                setTimeout(() => {
                    localStorage.clear();
                    window.location.href = '../index.html';
                }, 2000);
            }
        }

        // Handle "Other" checkbox visibility
        document.addEventListener('DOMContentLoaded', function () {
            const deleteOtherCheckbox = document.getElementById('deleteOtherCheckbox');
            if (deleteOtherCheckbox) {
                deleteOtherCheckbox.addEventListener('change', function () {
                    document.getElementById('otherTextDelete').style.display =
                        this.checked ? 'block' : 'none';
                });
            }
        });

        /**
         * Update Current Subscription Card visibility and details
         */
        function updateCurrentSubscriptionCard() {
            const card = document.getElementById('current-subscription-card');
            if (!card) return;

            if (currentSubscription) {
                // Show the card
                card.classList.remove('hidden');

                // Update details
                const planData = {
                    'starter': { name: 'Starter Plan', price: '500 ETB/month', storage: '64 GB Storage' },
                    'basic': { name: 'Basic Plan', price: '750 ETB/month', storage: '100 GB Storage' },
                    'professional': { name: 'Professional Plan', price: '1,875 ETB/month', storage: '250 GB Storage' },
                    'advanced': { name: 'Advanced Plan', price: '3,750 ETB/month', storage: '500 GB Storage' },
                    'enterprise': { name: 'Enterprise Plan', price: '7,500 ETB/month', storage: '1 TB Storage' }
                };

                const plan = planData[currentSubscription];
                if (plan) {
                    document.getElementById('current-plan-name').textContent = plan.name;
                    document.getElementById('current-plan-price').textContent = plan.price;
                    document.getElementById('current-plan-storage').textContent = plan.storage;
                }
            } else {
                // Hide the card
                card.classList.add('hidden');
            }
        }

        // Make functions globally available
        window.openSwitchSubscriptionModal = openSwitchSubscriptionModal;
        window.closeSwitchSubscriptionModal = closeSwitchSubscriptionModal;
        window.switchToPlan = switchToPlan;
        window.updateCurrentSubscriptionCard = updateCurrentSubscriptionCard;
        window.startUnsubscribeFlow = startUnsubscribeFlow;
        window.closeUnsubscribeModal1 = closeUnsubscribeModal1;
        window.submitUnsubscribeReasons = submitUnsubscribeReasons;
        window.closeUnsubscribeConfirm1 = closeUnsubscribeConfirm1;
        window.proceedToUnsubscribeFeeWarning = proceedToUnsubscribeFeeWarning;
        window.closeUnsubscribeConfirm2 = closeUnsubscribeConfirm2;
        window.proceedToUnsubscribePassword = proceedToUnsubscribePassword;
        window.closeUnsubscribePasswordModal = closeUnsubscribePasswordModal;
        window.finalConfirmUnsubscribe = finalConfirmUnsubscribe;
        window.closeUnsubscribeFinalModal = closeUnsubscribeFinalModal;
        window.openLeaveAstegniModal = openLeaveAstegniModal;
        window.closeLeaveAstegniModal = closeLeaveAstegniModal;
        window.confirmDeleteAccount = confirmDeleteAccount;
        window.closeDeleteModal1 = closeDeleteModal1;
        window.submitDeleteReasons = submitDeleteReasons;
        window.closeDeleteVerifyModal = closeDeleteVerifyModal;
        window.proceedToSubscriptionCheck = proceedToSubscriptionCheck;
        window.closeDeleteSubscriptionCheckModal = closeDeleteSubscriptionCheckModal;
        window.closeDeletePasswordModal = closeDeletePasswordModal;
        window.finalConfirmDeleteAccount = finalConfirmDeleteAccount;
        window.closeDeleteFinalModal = closeDeleteFinalModal;

        console.log('✅ Subscription & Leave Astegni: JavaScript loaded');