        let selectedPlanData = {};

        /**
         * Open Subscription Modal
         */
        function openSubscriptionModal() {
            console.log('🔵 Opening Subscription Modal...');
            const modal = document.getElementById('subscription-modal');
            if (!modal) {
                console.error('❌ Subscription Modal not found!');
                return;
            }
            modal.classList.remove('hidden');
            modal.classList.add('active');
            modal.style.display = 'flex';
            console.log('✅ Subscription Modal opened');
        }

        /**
         * Close Subscription Modal
         */
        function closeSubscriptionModal() {
            const modal = document.getElementById('subscription-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('active');
            modal.style.display = 'none';
        }

        /**
         * Select a plan
         */
        function selectPlan(planName, monthlyPrice, storageGB) {
            selectedPlanData = {
                name: planName,
                monthlyPrice: monthlyPrice,
                storage: storageGB
            };

            // Update plan details modal
            document.getElementById('selectedPlanName').textContent = planName.charAt(0).toUpperCase() + planName.slice(1) + ' Plan';
            document.getElementById('selectedStorage').textContent = storageGB + ' GB';
            document.getElementById('selectedMonthlyPrice').textContent = monthlyPrice.toLocaleString() + ' ETB';

            // Reset duration and calculate
            document.getElementById('subscriptionDuration').value = '1';
            calculateDiscount();

            // Close subscription modal and open plan details modal
            closeSubscriptionModal();
            openPlanDetailsModal();
        }

        /**
         * Open Plan Details Modal
         */
        function openPlanDetailsModal() {
            const modal = document.getElementById('plan-details-modal');
            if (!modal) return;
            modal.classList.remove('hidden');
            modal.classList.add('active');
            modal.style.display = 'flex';
        }

        /**
         * Close Plan Details Modal
         */
        function closePlanDetailsModal() {
            const modal = document.getElementById('plan-details-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('active');
            modal.style.display = 'none';
        }

        /**
         * Calculate discount based on duration
         */
        function calculateDiscount() {
            const duration = parseInt(document.getElementById('subscriptionDuration').value);
            const monthlyPrice = selectedPlanData.monthlyPrice;

            let discountPercent = 0;
            if (duration === 3) discountPercent = 10;
            else if (duration === 6) discountPercent = 15;
            else if (duration === 12) discountPercent = 20;

            const subtotal = monthlyPrice * duration;
            const discountAmount = Math.round((subtotal * discountPercent) / 100);
            const totalPrice = subtotal - discountAmount;

            document.getElementById('discountAmount').textContent = discountAmount.toLocaleString() + ' ETB (' + discountPercent + '%)';
            document.getElementById('totalPrice').textContent = totalPrice.toLocaleString() + ' ETB';
        }

        /**
         * Confirm Subscription
         */
        async function confirmSubscription() {
            const duration = parseInt(document.getElementById('subscriptionDuration').value);

            const subscriptionData = {
                plan: selectedPlanData.name,
                storage: selectedPlanData.storage,
                monthlyPrice: selectedPlanData.monthlyPrice,
                duration: duration,
                totalPrice: document.getElementById('totalPrice').textContent
            };

            console.log('✅ Subscription confirmed:', subscriptionData);
            // TODO: Send to backend API and process payment

            // Set current subscription (for demonstration)
            currentSubscription = subscriptionData.plan;

            // Update button visibility - hide Subscribe button, show Switch Plan and Unsubscribe buttons
            document.querySelectorAll('.subscribe-btn').forEach(btn => {
                const btnPlan = btn.getAttribute('data-plan');
                if (btnPlan === subscriptionData.plan) {
                    btn.classList.add('hidden');
                    btn.style.display = 'none';

                    // Show switch plan and unsubscribe buttons for this plan
                    const parentDiv = btn.parentElement;
                    const switchBtn = parentDiv.querySelector('.switch-plan-btn');
                    const unsubscribeBtn = parentDiv.querySelector('.unsubscribe-btn');

                    if (switchBtn) {
                        switchBtn.classList.remove('hidden');
                        switchBtn.style.display = 'block';
                    }
                    if (unsubscribeBtn) {
                        unsubscribeBtn.classList.remove('hidden');
                        unsubscribeBtn.style.display = 'block';
                    }
                } else {
                    // Keep other plan subscribe buttons visible but maybe show them differently
                    btn.classList.remove('hidden');
                    btn.style.display = 'block';
                }
            });

            alert('✅ Subscription confirmed!\n\nPlan: ' + subscriptionData.plan + '\nTotal: ' + subscriptionData.totalPrice);
            closePlanDetailsModal();
        }

        // Make functions globally available
        window.openSubscriptionModal = openSubscriptionModal;
        window.closeSubscriptionModal = closeSubscriptionModal;
        window.selectPlan = selectPlan;
        window.openPlanDetailsModal = openPlanDetailsModal;
        window.closePlanDetailsModal = closePlanDetailsModal;
        window.calculateDiscount = calculateDiscount;
        window.confirmSubscription = confirmSubscription;

        console.log('✅ Subscription Modal: JavaScript loaded');