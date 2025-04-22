// DOM Elements
const authRequired = document.getElementById('authRequired');
const mybooksContent = document.getElementById('mybooksContent');
const addBookModal = document.getElementById('addBookModal');
const addBookForm = document.getElementById('addBookForm');
const closeModalBtn = document.querySelector('.close-modal');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const yearFilter = document.getElementById('yearFilter');
const ratingFilter = document.getElementById('ratingFilter');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');

// Reading log state
let currentBook = null;
let readingLog = null;

// State for sorting
const sortStates = {
    favorites: 'title',
    currently: 'title',
    wantto: 'title',
    completed: 'dateCompleted'
};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for libraryUtils to be available
    await new Promise((resolve) => {
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
    });

    const user = checkAuth();
    
    if (!user) {
        showAuthRequired();
        return;
    }

    loadReadingLog();
    initializeFilters();
    updateStats();
});

// Load reading log
function loadReadingLog() {
    showLoading();
    
    try {
        readingLog = getReadingLog();
        // Only display the active tab's books
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            displayBooks(activeTab.getAttribute('data-tab'));
        } else {
            displayBooks('favorites'); // Default tab
        }
        
        hideLoading();
        mybooksContent.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading reading log:', error);
        showError();
    }
}

// Display books for a specific section
function displayBooks(section) {
    const container = document.getElementById(`${section}Grid`);
    const tabPane = document.getElementById(section);
    if (!container || !tabPane) return;

    container.innerHTML = ''; // Clear container
    
    let books = [];
    
    switch (section) {
        case 'favorites':
            books = getFavorites();
            break;
        case 'currently':
            books = readingLog?.books?.filter(book => book.status === 'currently') || [];
            break;
        case 'wantto':
            books = readingLog?.books?.filter(book => book.status === 'wantto') || [];
            break;
        case 'completed':
            books = filterCompletedBooks(readingLog?.books?.filter(book => book.status === 'completed') || []);
            break;
    }

    // Apply sorting
    books = sortBooks(books, sortStates[section]);

    if (!books || books.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <p>${getEmptyMessage(section)}</p>
            </div>
        `;
        return;
    }

    books.forEach(book => {
        const bookCard = createBookCard(book);
        container.appendChild(bookCard);
    });
}

// Add this new helper function for empty state messages
function getEmptyMessage(section) {
    const messages = {
        favorites: 'No favorite books yet. Click the heart icon on any book to add it to your favorites.',
        currently: 'You\'re not reading any books at the moment. Add a book to get started!',
        wantto: 'Your reading wishlist is empty. Add books you want to read in the future!',
        completed: 'You haven\'t marked any books as completed yet. Keep reading!'
    };
    
    return messages[section] || 'No books found in this section.';
}

// Create book card with reading status
function createBookCard(book) {
    const card = window.libraryUtils.createBookCard(book);
    
    // Add reading status elements
    const statusDiv = document.createElement('div');
    statusDiv.className = 'book-status';
    
    // Add status indicator based on section
    switch (book.status) {
        case 'currently':
            statusDiv.innerHTML += `
                <div class="reading-status">
                    <span class="status-icon">📖</span> Currently Reading
                    ${book.progress ? `<div class="progress-bar"><div class="progress-fill" style="width: ${book.progress}%"></div></div>` : ''}
                </div>
            `;
            break;
        case 'wantto':
            statusDiv.innerHTML += `
                <div class="reading-status">
                    <span class="status-icon">📚</span> Want to Read
                </div>
            `;
            break;
        case 'completed':
            statusDiv.innerHTML += `
                <div class="reading-status">
                    <span class="status-icon">✓</span> Completed
                </div>
            `;
            break;
    }

    // Add favorite indicator if book is favorited
    if (window.libraryUtils.isBookFavorite(book.key)) {
        statusDiv.innerHTML += `
            <div class="favorite-status">
                <span class="heart-icon">♥</span> Favorited
            </div>
        `;
    }

    if (book.rating) {
        const stars = '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
        statusDiv.innerHTML += `<div class="book-rating">${stars}</div>`;
    }

    if (book.dateCompleted) {
        statusDiv.innerHTML += `
            <div class="completion-date">
                Completed: ${new Date(book.dateCompleted).toLocaleDateString()}
            </div>
        `;
    }

    if (book.notes) {
        statusDiv.innerHTML += `
            <div class="book-notes" title="${book.notes}">
                📝 Notes available
            </div>
        `;
    }

    // Add action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'book-actions';
    
    // Add appropriate action buttons based on status
    const buttons = [];
    
    if (window.libraryUtils.isBookFavorite(book.key)) {
        buttons.push(`
            <button onclick="toggleFavorite('${book.key}')" class="btn-danger">
                Remove from Favorites
            </button>
        `);
    }
    
    buttons.push(`
        <button onclick="editBookStatus('${book.key}')" class="btn-secondary">
            ${book.status === 'completed' ? 'Edit Review' : 'Update Status'}
        </button>
    `);
    
    if (book.status === 'currently') {
        buttons.push(`
            <button onclick="updateProgress('${book.key}')" class="btn-secondary">
                Update Progress
            </button>
        `);
    }

    buttons.push(`
        <button onclick="removeBook('${book.key}')" class="btn-danger">
            Remove
        </button>
    `);

    actionsDiv.innerHTML = buttons.join('');
    card.appendChild(statusDiv);
    card.appendChild(actionsDiv);
    
    return card;
}

// Toggle favorite status
function toggleFavorite(bookKey) {
    const book = window.libraryUtils.getFavorites().find(b => b.key === bookKey);
    if (book) {
        window.libraryUtils.toggleFavorite(book);
        // Refresh the favorites display
        displayBooks('favorites');
        updateStats();
    }
}

// Sort books based on selected criteria
function sortBooks(books, sortBy) {
    return [...books].sort((a, b) => {
        switch (sortBy) {
            case 'title':
                return a.title.localeCompare(b.title);
            case 'author':
                const authorA = a.author_name?.[0] || 'Unknown';
                const authorB = b.author_name?.[0] || 'Unknown';
                return authorA.localeCompare(authorB);
            case 'dateAdded':
                return (b.dateAdded || 0) - (a.dateAdded || 0);
            case 'dateCompleted':
                return new Date(b.dateCompleted || 0) - new Date(a.dateCompleted || 0);
            case 'rating':
                return (b.rating || 0) - (a.rating || 0);
            case 'progress':
                return (b.progress || 0) - (a.progress || 0);
            default:
                return 0;
        }
    });
}

// Get books by reading status
function getBooksByStatus(status) {
    return readingLog?.books?.filter(book => book.status === status) || [];
}

// Get favorite books
function getFavorites() {
    return window.libraryUtils.getFavorites() || [];
}

// Filter completed books by year and rating
function filterCompletedBooks(books) {
    const selectedYear = yearFilter.value;
    const selectedRating = parseInt(ratingFilter.value);

    return books.filter(book => {
        if (!book.dateCompleted) return false;
        
        const bookYear = new Date(book.dateCompleted).getFullYear().toString();
        const meetsYearFilter = selectedYear === 'all' || bookYear === selectedYear;
        const meetsRatingFilter = selectedRating === 'all' || (book.rating && book.rating >= selectedRating);
        
        return meetsYearFilter && meetsRatingFilter;
    });
}

// Initialize filters and sort controls
function initializeFilters() {
    // Initialize year filter for completed books
    const years = new Set();
    const completedBooks = readingLog?.books?.filter(book => book.status === 'completed') || [];
    
    completedBooks.forEach(book => {
        if (book.dateCompleted) {
            years.add(new Date(book.dateCompleted).getFullYear());
        }
    });

    const yearOptions = Array.from(years)
        .sort((a, b) => b - a)
        .map(year => `<option value="${year}">${year}</option>`);
    
    yearFilter.innerHTML = `
        <option value="all">All Years</option>
        ${yearOptions.join('')}
    `;

    // Add event listeners for sorting
    const sortSelectors = {
        favorites: document.getElementById('favoritesSort'),
        currently: document.getElementById('currentlySort'),
        wantto: document.getElementById('wanttoSort'),
        completed: document.getElementById('completedSort')
    };

    Object.entries(sortSelectors).forEach(([section, selector]) => {
        if (selector) {
            selector.value = sortStates[section]; // Set initial sort state
            selector.addEventListener('change', (e) => {
                sortStates[section] = e.target.value;
                displayBooks(section);
            });
        }
    });

    // Year and rating filter listeners for completed books
    [yearFilter, ratingFilter].forEach(filter => {
        filter.addEventListener('change', () => displayBooks('completed'));
    });
}

// Update reading statistics
function updateStats() {
    const stats = calculateStats();
    
    document.getElementById('totalBooks').textContent = stats.total;
    document.getElementById('currentlyReading').textContent = stats.current;
    document.getElementById('booksThisYear').textContent = stats.thisYear;
}

// Calculate reading statistics
function calculateStats() {
    const currentYear = new Date().getFullYear();
    
    // Get unique books from reading log and favorites
    const readingLogBooks = readingLog?.books?.length || 0;
    const favoriteBooks = window.libraryUtils.getFavorites()?.length || 0;
    
    return {
        total: readingLogBooks + favoriteBooks,
        current: getBooksByStatus('currently').length,
        thisYear: getBooksByStatus('completed')
            .filter(book => new Date(book.dateCompleted).getFullYear() === currentYear)
            .length
    };
}

// Edit book status
function editBookStatus(bookKey) {
    const book = readingLog.books.find(b => b.key === bookKey);
    if (!book) return;

    currentBook = book;
    populateEditForm(book);
    addBookModal.classList.remove('hidden');
}

// Remove book from reading log
function removeBook(bookKey) {
    if (!confirm('Are you sure you want to remove this book from your reading log?')) {
        return;
    }

    readingLog.books = readingLog.books.filter(book => book.key !== bookKey);
    saveReadingLog();
    loadReadingLog();
    updateStats();
}

// Populate edit form with book data
function populateEditForm(book) {
    document.getElementById('readingStatus').value = book.status;
    document.getElementById('dateCompleted').value = book.dateCompleted || '';
    if (book.rating) {
        document.querySelector(`input[name="rating"][value="${book.rating}"]`).checked = true;
    }
    document.getElementById('notes').value = book.notes || '';
}

// Save book status changes
function saveBookStatus(formData) {
    if (!currentBook) return;

    const bookIndex = readingLog.books.findIndex(b => b.key === currentBook.key);
    if (bookIndex === -1) {
        readingLog.books.push({
            ...currentBook,
            ...formData
        });
    } else {
        readingLog.books[bookIndex] = {
            ...currentBook,
            ...formData
        };
    }

    saveReadingLog();
    loadReadingLog();
    updateStats();
}

// Update reading progress
function updateProgress(bookKey) {
    const book = readingLog.books.find(b => b.key === bookKey);
    if (!book) return;

    const progress = prompt('Enter reading progress (0-100):', book.progress || '0');
    if (progress === null) return;

    const progressNum = parseInt(progress);
    if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
        alert('Please enter a valid number between 0 and 100');
        return;
    }

    const bookIndex = readingLog.books.findIndex(b => b.key === bookKey);
    if (bookIndex !== -1) {
        readingLog.books[bookIndex] = {
            ...book,
            progress: progressNum
        };
        
        // If book is completed (100%), ask if user wants to move it to completed section
        if (progressNum === 100) {
            if (confirm('Book completed! Would you like to move it to your completed books?')) {
                readingLog.books[bookIndex] = {
                    ...book,
                    status: 'completed',
                    dateCompleted: new Date().toISOString().split('T')[0]
                };
            }
        }

        saveReadingLog();
        loadReadingLog();
        updateStats();
    }
}

// Get reading log from localStorage
function getReadingLog() {
    const log = localStorage.getItem('readingLog');
    return log ? JSON.parse(log) : { books: [] };
}

// Save reading log to localStorage
function saveReadingLog() {
    localStorage.setItem('readingLog', JSON.stringify(readingLog));
}

// Event listeners
addBookForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = {
        status: document.getElementById('readingStatus').value,
        dateCompleted: document.getElementById('dateCompleted').value || null,
        rating: parseInt(document.querySelector('input[name="rating"]:checked')?.value) || null,
        notes: document.getElementById('notes').value
    };

    saveBookStatus(formData);
    addBookModal.classList.add('hidden');
    addBookForm.reset();
});

// Tab handling
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        
        // Update active states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.add('hidden'));
        
        // Activate selected tab
        button.classList.add('active');
        const selectedPane = document.getElementById(tabName);
        selectedPane.classList.remove('hidden');
        
        // Display books
        displayBooks(tabName);
    });
});

// Modal handling
closeModalBtn.addEventListener('click', () => {
    addBookModal.classList.add('hidden');
    addBookForm.reset();
});

window.addEventListener('click', (e) => {
    if (e.target === addBookModal) {
        addBookModal.classList.add('hidden');
        addBookForm.reset();
    }
});

// Show/hide readingStatus-dependent form fields
document.getElementById('readingStatus').addEventListener('change', (e) => {
    const showCompletedFields = e.target.value === 'completed';
    document.getElementById('dateCompletedGroup').classList.toggle('hidden', !showCompletedFields);
    document.getElementById('ratingGroup').classList.toggle('hidden', !showCompletedFields);
});

// UI state functions
function showAuthRequired() {
    authRequired.classList.remove('hidden');
    mybooksContent.classList.add('hidden');
    loading.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

function showLoading() {
    loading.classList.remove('hidden');
    // Don't hide mybooksContent to prevent white flash
    errorMessage.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
    mybooksContent.classList.remove('hidden');
}

function showError() {
    loading.classList.add('hidden');
    mybooksContent.classList.add('hidden');
    errorMessage.classList.remove('hidden');
}