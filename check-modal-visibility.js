// Check modal visibility - paste this in console
const modal = document.getElementById('shareProfileModal');
const overlay = modal.querySelector('.modal-overlay');
const container = overlay ? overlay.querySelector('.modal-container') : null;

console.log('=== MODAL HIERARCHY CHECK ===');
console.log('Modal found:', !!modal);
console.log('Overlay found:', !!overlay);
console.log('Container found:', !!container);

if (overlay) {
    const overlayRect = overlay.getBoundingClientRect();
    const overlayStyles = window.getComputedStyle(overlay);
    console.log('\n=== OVERLAY ===');
    console.log('Position:', overlayRect);
    console.log('Display:', overlayStyles.display);
    console.log('Opacity:', overlayStyles.opacity);
    console.log('Visibility:', overlayStyles.visibility);
    console.log('Width x Height:', overlayRect.width, 'x', overlayRect.height);
}

if (container) {
    const containerRect = container.getBoundingClientRect();
    const containerStyles = window.getComputedStyle(container);
    console.log('\n=== CONTAINER ===');
    console.log('Position:', containerRect);
    console.log('Display:', containerStyles.display);
    console.log('Opacity:', containerStyles.opacity);
    console.log('Visibility:', containerStyles.visibility);
    console.log('Width x Height:', containerRect.width, 'x', containerRect.height);
    console.log('Background:', containerStyles.backgroundColor);
}

// Check if container is actually at center
if (container) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const elementAtCenter = document.elementFromPoint(centerX, centerY);
    console.log('\n=== CENTER POINT CHECK ===');
    console.log('Element at center:', elementAtCenter);
    console.log('Is it container?', elementAtCenter === container);
    console.log('Is it inside container?', container.contains(elementAtCenter));
}
