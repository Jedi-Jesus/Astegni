console.log('=== SHARE MODAL DEBUG ===');
const modal = document.getElementById('shareProfileModal');
if (modal) {
    console.log('Modal found');
    console.log('Display:', modal.style.display);
    console.log('Position:', window.getComputedStyle(modal).position);
    console.log('Width:', window.getComputedStyle(modal).width);
    console.log('Height:', window.getComputedStyle(modal).height);
    console.log('Top:', window.getComputedStyle(modal).top);
    console.log('Left:', window.getComputedStyle(modal).left);
    console.log('ZIndex:', window.getComputedStyle(modal).zIndex);
    console.log('Visibility:', window.getComputedStyle(modal).visibility);
    console.log('Opacity:', window.getComputedStyle(modal).opacity);
    
    const overlay = modal.querySelector('.modal-overlay');
    const container = modal.querySelector('.modal-container');
    console.log('Has overlay:', !!overlay);
    console.log('Has container:', !!container);
    
    if (overlay) {
        console.log('Overlay display:', window.getComputedStyle(overlay).display);
    }
    if (container) {
        console.log('Container display:', window.getComputedStyle(container).display);
        console.log('Container background:', window.getComputedStyle(container).backgroundColor);
    }
} else {
    console.log('Modal NOT found');
}
