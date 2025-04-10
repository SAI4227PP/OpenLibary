// DOM Elements
const changeTypeSelect = document.getElementById('changeType');
const timeRangeSelect = document.getElementById('timeRange');
const newBooksContainer = document.getElementById('newBooks');
const recentChangesContainer = document.getElementById('recentChanges');
const pagination = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');

// State
let currentPage = 1;
let currentChangeType = 'all';
let currentTimeRange = 'day';
let changes = [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadRecentChanges();
});

// Load recent changes
async function loadRecentChanges() {
    showLoading();
    
    try {
        const timestamp = getTimestampForRange(currentTimeRange);
        const changesUrl = `${API_BASE_URL}/recentchanges.json?since=${timestamp}`;
        
        const response = await fetch(changesUrl);
        const data = await response.json();
        
        changes = filterChangesByType(data.changes || []);
        displayChanges();
        
        if (currentChangeType === 'all' || currentChangeType === 'new') {
            await loadNewBooks();
        }
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading recent changes:', error);
        showError();
    }
}

// Load new books
async function loadNewBooks() {
    try {
        const timestamp = getTimestampForRange(currentTimeRange);
        const newBooksUrl = `${API_BASE_URL}/new.json?since=${timestamp}`;
        
        const response = await fetch(newBooksUrl);
        const data = await response.json();
        
        displayNewBooks(data.new || []);
        
    } catch (error) {
        console.error('Error loading new books:', error);
        newBooksContainer.innerHTML = '<p class="error">Error loading new books</p>';
    }
}

// Filter changes by type
function filterChangesByType(allChanges) {
    if (currentChangeType === 'all') return allChanges;
    
    return allChanges.filter(change => {
        switch (currentChangeType) {
            case 'new':
                return change.type === 'add-book';
            case 'edit':
                return change.type === 'edit-book';
            case 'author':
                return change.type === 'edit-author' || change.type === 'add-author';
            default:
                return true;
        }
    });
}

// Display changes with pagination
function displayChanges() {
    recentChangesContainer.innerHTML = '';
    
    const itemsPerPage = 20;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageChanges = changes.slice(start, end);
    
    if (pageChanges.length === 0) {
        recentChangesContainer.innerHTML = '<p>No changes found for the selected criteria.</p>';
        pagination.classList.add('hidden');
        return;
    }

    const changesHTML = pageChanges.map(change => {
        const timestamp = new Date(change.timestamp).toLocaleString();
        const changeTypeIcon = getChangeTypeIcon(change.type);
        
        return `
            <div class="change-item">
                <div class="change-icon">${changeTypeIcon}</div>
                <div class="change-details">
                    <div class="change-title">
                        <a href="${getChangeLink(change)}">${change.title || 'Untitled'}</a>
                    </div>
                    <div class="change-meta">
                        ${change.author ? `by ${change.author}` : ''}
                        <span class="change-time">${timestamp}</span>
                    </div>
                    ${change.comment ? `<div class="change-comment">${change.comment}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    recentChangesContainer.innerHTML = changesHTML;
    
    // Update pagination
    const totalPages = Math.ceil(changes.length / itemsPerPage);
    pagination.classList.toggle('hidden', totalPages <= 1);
    currentPageSpan.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
}

// Display new books
function displayNewBooks(books) {
    newBooksContainer.innerHTML = '';
    
    if (books.length === 0) {
        newBooksContainer.innerHTML = '<p>No new books found.</p>';
        return;
    }

    books.slice(0, 6).forEach(book => {
        newBooksContainer.appendChild(window.libraryUtils.createBookCard(book));
    });
}

// Utility functions
function getTimestampForRange(range) {
    const now = new Date();
    switch (range) {
        case 'day':
            return new Date(now - 24 * 60 * 60 * 1000).toISOString();
        case 'week':
            return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
        case 'month':
            return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
        default:
            return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    }
}

function getChangeTypeIcon(type) {
    switch (type) {
        case 'add-book':
            return '📚';
        case 'edit-book':
            return '✏️';
        case 'add-author':
            return '👤';
        case 'edit-author':
            return '✍️';
        default:
            return '🔄';
    }
}

function getChangeLink(change) {
    switch (change.type) {
        case 'add-book':
        case 'edit-book':
            return `book.html?key=${encodeURIComponent(change.key)}`;
        case 'add-author':
        case 'edit-author':
            return `author.html?key=${encodeURIComponent(change.key)}`;
        default:
            return '#';
    }
}

// Event listeners
changeTypeSelect.addEventListener('change', () => {
    currentChangeType = changeTypeSelect.value;
    currentPage = 1;
    loadRecentChanges();
});

timeRangeSelect.addEventListener('change', () => {
    currentTimeRange = timeRangeSelect.value;
    currentPage = 1;
    loadRecentChanges();
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayChanges();
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(changes.length / 20);
    if (currentPage < totalPages) {
        currentPage++;
        displayChanges();
    }
});

// UI state functions
function showLoading() {
    loading.classList.remove('hidden');
    errorMessage.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError() {
    loading.classList.add('hidden');
    errorMessage.classList.remove('hidden');
}