// Wait for script.js to load before initializing navigation
function waitForLibraryUtils() {
    return new Promise((resolve) => {
        if (window.libraryUtils) {
            resolve();
            return;
        }
        
        const checkInterval = setInterval(() => {
            if (window.libraryUtils) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 50);

        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            console.error('Timeout waiting for library utilities to load');
            resolve();
        }, 5000);
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    await waitForLibraryUtils();
    
    fetch('../components/nav.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('main-nav-placeholder').innerHTML = data;
            
            // Update authentication UI after navigation is loaded
            if (typeof updateAuthUI === 'function') {
                setTimeout(() => {
                    updateAuthUI();
                }, 0);
            }
            
            // Dispatch custom event to notify that navigation is loaded
            document.dispatchEvent(new CustomEvent('navigationLoaded'));
        })
        .catch(error => console.error('Error loading navigation:', error));
});
