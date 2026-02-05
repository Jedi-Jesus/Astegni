// Debug script for brands panel issue
// Run this in browser console

console.log('=== BRANDS PANEL DEBUG ===');

// Check if brandsGrid exists
const brandsGrid = document.getElementById('brandsGrid');
console.log('1. brandsGrid element:', brandsGrid);
console.log('2. brandsGrid innerHTML:', brandsGrid?.innerHTML);
console.log('3. brandsGrid visible?', brandsGrid ? window.getComputedStyle(brandsGrid).display : 'N/A');

// Check if BrandsManager exists
console.log('4. BrandsManager object:', typeof BrandsManager);
console.log('5. BrandsManager.brands:', BrandsManager?.brands);

// Check parent panel
const brandsPanel = document.getElementById('brands-panel');
console.log('6. brands-panel element:', brandsPanel);
console.log('7. brands-panel visible?', brandsPanel ? window.getComputedStyle(brandsPanel).display : 'N/A');

// Try to manually render
if (typeof BrandsManager !== 'undefined') {
    console.log('8. Attempting manual render...');
    BrandsManager.renderBrands();

    setTimeout(() => {
        console.log('9. After render - brandsGrid innerHTML:', brandsGrid?.innerHTML);
        const brandCards = document.querySelectorAll('.brand-card');
        console.log('10. Total brand cards found:', brandCards.length);
        const newBrandCard = document.querySelector('.brand-card.new-brand');
        console.log('11. New brand card (+ card) found:', newBrandCard);

        if (newBrandCard) {
            console.log('12. New brand card styles:', {
                display: window.getComputedStyle(newBrandCard).display,
                visibility: window.getComputedStyle(newBrandCard).visibility,
                opacity: window.getComputedStyle(newBrandCard).opacity
            });
        }
    }, 500);
} else {
    console.error('8. BrandsManager not defined!');
}
