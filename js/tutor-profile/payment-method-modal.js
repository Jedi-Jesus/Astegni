        /**
         * Open Payment Method Modal
         */
        function openPaymentMethodModal() {
            console.log('🔵 Opening Payment Method Modal...');
            const modal = document.getElementById('payment-method-modal');
            if (!modal) {
                console.error('❌ Payment Method Modal not found!');
                return;
            }
            modal.classList.remove('hidden');
            modal.classList.add('active');
            modal.style.display = 'flex';
            console.log('✅ Payment Method Modal opened');
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
        }

        /**
         * Toggle payment fields based on selected method
         */
        function togglePaymentFields() {
            const paymentMethod = document.getElementById('paymentMethod').value;

            // Hide all fields first
            document.getElementById('bankFields').classList.add('hidden');
            document.getElementById('mobileFields').classList.add('hidden');
            document.getElementById('telebirrFields').classList.add('hidden');
            document.getElementById('cbebirrFields').classList.add('hidden');

            // Show relevant fields
            if (paymentMethod === 'bank') {
                document.getElementById('bankFields').classList.remove('hidden');
            } else if (paymentMethod === 'mobile') {
                document.getElementById('mobileFields').classList.remove('hidden');
            } else if (paymentMethod === 'telebirr') {
                document.getElementById('telebirrFields').classList.remove('hidden');
            } else if (paymentMethod === 'cbebirr') {
                document.getElementById('cbebirrFields').classList.remove('hidden');
            }
        }

        /**
         * Save Payment Method
         */
        async function savePaymentMethod() {
            const paymentMethod = document.getElementById('paymentMethod').value;

            if (!paymentMethod) {
                alert('⚠️ Please select a payment method');
                return;
            }

            const paymentData = {
                method: paymentMethod
            };

            // Collect data based on payment method
            if (paymentMethod === 'bank') {
                paymentData.bankName = document.getElementById('bankName').value;
                paymentData.accountNumber = document.getElementById('accountNumber').value;
                paymentData.accountHolderName = document.getElementById('accountHolderName').value;

                if (!paymentData.bankName || !paymentData.accountNumber || !paymentData.accountHolderName) {
                    alert('⚠️ Please fill all bank details');
                    return;
                }
            } else if (paymentMethod === 'mobile') {
                paymentData.provider = document.getElementById('mobileProvider').value;
                paymentData.mobileNumber = document.getElementById('mobileNumber').value;
                paymentData.accountName = document.getElementById('mobileAccountName').value;

                if (!paymentData.provider || !paymentData.mobileNumber || !paymentData.accountName) {
                    alert('⚠️ Please fill all mobile money details');
                    return;
                }
            } else if (paymentMethod === 'telebirr') {
                paymentData.phoneNumber = document.getElementById('telebirrNumber').value;
                paymentData.accountName = document.getElementById('telebirrName').value;

                if (!paymentData.phoneNumber || !paymentData.accountName) {
                    alert('⚠️ Please fill all TeleBirr details');
                    return;
                }
            } else if (paymentMethod === 'cbebirr') {
                paymentData.phoneNumber = document.getElementById('cbebirrNumber').value;
                paymentData.accountName = document.getElementById('cbebirrName').value;

                if (!paymentData.phoneNumber || !paymentData.accountName) {
                    alert('⚠️ Please fill all CBE Birr details');
                    return;
                }
            }

            console.log('💾 Saving payment method:', paymentData);
            // TODO: Send to backend API
            alert('✅ Payment method saved successfully!');
            closePaymentMethodModal();
        }

        // Make functions globally available
        window.openPaymentMethodModal = openPaymentMethodModal;
        window.closePaymentMethodModal = closePaymentMethodModal;
        window.togglePaymentFields = togglePaymentFields;
        window.savePaymentMethod = savePaymentMethod;

        console.log('✅ Payment Method Modal: JavaScript loaded');
