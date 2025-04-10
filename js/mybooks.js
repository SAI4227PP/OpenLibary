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

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
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
        displayBooks('favorites');
        displayBooks('currently');
        displayBooks('wantto');
        displayBooks('completed');
        
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
    if (!container) return;

    let books = [];
    
    switch (section) {
        case 'favorites':
            books = getFavorites();
            break;
        case 'currently':
            books = getBooksByStatus('currently');
            break;
        case 'wantto':
            books = getBooksByStatus('wantto');
            break;
        case 'completed':
            books = filterCompletedBooks(getBooksByStatus('completed'));
            break;
    }

    if (books.length === 0) {
        container.innerHTML = `<p class="empty-message">No books in this section yet.</p>`;
        return;
    }

    container.innerHTML = '';
    books.forEach(book => {
        const bookCard = createBookCard(book);
        container.appendChild(bookCard);
    });
}

// Create book card with reading status
function createBookCard(book) {
    const card = window.libraryUtils.createBookCard(book);
    
    // Add reading status elements
    const statusDiv = document.createElement('div');
    statusDiv.className = 'book-status';
    
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
    actionsDiv.innerHTML = `
        <button onclick="editBookStatus('${book.key}')" class="btn-secondary">
            Edit Status
        </button>
        <button onclick="removeBook('${book.key}')" class="btn-danger">
            Remove
        </button>
    `;

    card.appendChild(statusDiv);
    card.appendChild(actionsDiv);
    
    return card;
}

// Get books by reading status
function getBooksByStatus(status) {
    return readingLog?.books?.filter(book => book.status === status) || [];
}

// Filter completed books by year and rating
function filterCompletedBooks(books) {
    const selectedYear = yearFilter.value;
    const selectedRating = parseInt(ratingFilter.value);

    return books.filter(book => {
        const bookYear = new Date(book.dateCompleted).getFullYear().toString();
        const meetsYearFilter = selectedYear === 'all' || bookYear === selectedYear;
        const meetsRatingFilter = selectedRating === 'all' || book.rating >= selectedRating;
        
        return meetsYearFilter && meetsRatingFilter;
    });
}

// Initialize year and rating filters
function initializeFilters() {
    // Add years to filter
    const years = new Set();
    getBooksByStatus('completed').forEach(book => {
        if (book.dateCompleted) {
            years.add(new Date(book.dateCompleted).getFullYear());
        }
    });

    const yearOptions = Array.from(years)
        .sort((a, b) => b - a)
        .map(year => `<option value="${year}">${year}</option>`);
    yearFilter.innerHTML += yearOptions.join('');

    // Add filter event listeners
    yearFilter.addEventListener('change', () => displayBooks('completed'));
    ratingFilter.addEventListener('change', () => displayBooks('completed'));
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
    
    return {
        total: readingLog?.books?.length || 0,
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
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(tabName).classList.add('active');
        
        // Refresh displayed books
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
    mybooksContent.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError() {
    loading.classList.add('hidden');
    mybooksContent.classList.add('hidden');
    errorMessage.classList.remove('hidden');
}