// DOM Elements
const featuredBooksGrid = document.getElementById('featuredBooksGrid');
const loadingState = document.querySelector('.loading-state');
const pagination = document.getElementById('pagination');

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Wait for libraryUtils to be initialized
    if (window.libraryUtils) {
        loadFeaturedBooks();
    } else {
        // Listen for the libraryUtils initialization event
        document.addEventListener('libraryUtilsReady', loadFeaturedBooks);
        document.addEventListener('libraryUtilsError', () => {
            loadingState.innerHTML = '<p>Error: Library utilities failed to initialize. Please refresh the page.</p>';
        });
    }
});

// Load featured books
async function loadFeaturedBooks() {
    try {
        showLoading();
        
        // Load books from a variety of subjects to ensure diversity
        const subjects = ['fiction', 'science', 'philosophy', 'history', 'fantasy'];
        const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
        const response = await window.libraryUtils.searchBooks(`subject:${randomSubject}`, 1);
        const books = response.docs.slice(0, 28); // Get 28 books to fill 4 rows of 7
        
        if (!books || books.length === 0) {
            throw new Error('No books found');
        }
        
        const bookCards = books.map(book => {
            const card = window.libraryUtils.createBookCard(book);
            if (book.first_publish_date) {
                const dateElem = document.createElement('span');
                dateElem.className = 'book-date';
                dateElem.textContent = `Published: ${book.first_publish_date}`;
                card.querySelector('.book-info').appendChild(dateElem);
            }
            return card.outerHTML;
        }).join('');
        
        featuredBooksGrid.innerHTML = bookCards;
        hideLoading();
        
    } catch (error) {
        console.error('Error loading featured books:', error);
        loadingState.innerHTML = '<p>Error loading books. Please try again later.</p>';
    }
}

// UI state functions
function showLoading() {
    loadingState.style.display = 'flex';
    featuredBooksGrid.style.display = 'none';
}

function hideLoading() {
    loadingState.style.display = 'none';
    featuredBooksGrid.style.display = 'grid';
}