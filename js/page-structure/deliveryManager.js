// ============================================
// DELIVERY MANAGER
// For delivery tracking functionality
// Used in delivery/courier profiles
// ============================================

function checkActiveDelivery() {
    // Mock a booked delivery for testing
    const hasActiveDelivery = true; // Set to true for mock scenario

    const noDeliveryDiv = document.querySelector('.no-active-delivery');
    const activeDeliveryDiv = document.querySelector('.active-delivery-content');

    if (hasActiveDelivery) {
        if (noDeliveryDiv) noDeliveryDiv.style.display = 'none';
        if (activeDeliveryDiv) activeDeliveryDiv.style.display = 'block';
        // Load mock delivery data
        loadMockDeliveryData();
    } else {
        if (noDeliveryDiv) noDeliveryDiv.style.display = 'block';
        if (activeDeliveryDiv) activeDeliveryDiv.style.display = 'none';
    }
}

function loadMockDeliveryData() {
    // Update order details with mock data
    const orderElements = {
        '#YOUR-ORDER-ID': '#DLV-2024-ET-1234',
        'Your items': 'Books (3 items)',
        '15 minutes': '25 minutes',
        'Your Address': 'Bole, Near Edna Mall'
    };

    Object.keys(orderElements).forEach(oldText => {
        const elements = document.querySelectorAll('.info-value');
        elements.forEach(el => {
            if (el.textContent === oldText) {
                el.textContent = orderElements[oldText];
            }
        });
    });
}

// Export globally
window.checkActiveDelivery = checkActiveDelivery;
window.loadMockDeliveryData = loadMockDeliveryData;

console.log("✅ Delivery Manager loaded!");
