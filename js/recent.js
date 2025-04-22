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
    initializeTimeline();
});

// Load recent changes
async function loadRecentChanges() {
    showLoading();
    
    try {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        let changesUrl;
        switch (currentTimeRange) {
            case 'day':
                changesUrl = `${API_BASE_URL}/recentchanges/${year}/${month}/${day}.json`;
                break;
            case 'month':
                changesUrl = `${API_BASE_URL}/recentchanges/${year}/${month}.json`;
                break;
            default:
                changesUrl = `${API_BASE_URL}/recentchanges/${year}.json`;
                break;
        }
        
        const response = await fetch(changesUrl);
        const data = await response.json();
        
        changes = filterChangesByType(data || []);
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
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        let newBooksUrl;
        switch (currentTimeRange) {
            case 'day':
                newBooksUrl = `${API_BASE_URL}/recentchanges/${year}/${month}/${day}.json?type=/type/edition`;
                break;
            case 'month':
                newBooksUrl = `${API_BASE_URL}/recentchanges/${year}/${month}.json?type=/type/edition`;
                break;
            default:
                newBooksUrl = `${API_BASE_URL}/recentchanges/${year}.json?type=/type/edition`;
                break;
        }
        
        const response = await fetch(newBooksUrl);
        const data = await response.json();
        
        // Filter only new editions
        const newEditions = (data || []).filter(change => 
            change.type === '/type/edition' && !change.revision
        );
        
        displayNewBooks(newEditions);
        
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
        
        // Get a meaningful title based on the change type and content
        let title = change.title || 
                   (change.changes && change.changes.title) || 
                   (change.data && change.data.title);
                   
        if (!title) {
            // Generate descriptive titles for common actions
            if (change.comment) {
                if (change.comment.includes('import new book')) {
                    title = 'New Book Import';
                } else if (change.comment.includes('import existing book')) {
                    title = 'Book Update';
                } else if (change.comment.includes('Created new account')) {
                    title = 'New User Registration';
                } else if (change.comment.includes('updating user preferences')) {
                    title = 'User Settings Update';
                } else {
                    title = change.comment;
                }
            } else {
                title = 'System Update';
            }
        }
        
        // Format author display
        let authorText = '';
        if (change.author) {
            const authorName = typeof change.author === 'object' ? 
                             (change.author.name || change.author.key) : 
                             change.author;
            // Remove /people/ prefix from author keys
            authorText = `by ${authorName.replace('/people/', '')}`;
        }
        
        return `
            <div class="change-item">
                <div class="change-icon">${changeTypeIcon}</div>
                <div class="change-details">
                    <div class="change-title">
                        <a href="${getChangeLink(change)}">${title}</a>
                    </div>
                    <div class="change-meta">
                        ${authorText}
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
        case 'import new book':
            return '📚';
        case 'edit-book':
        case 'import existing book':
            return '✏️';
        case 'add-author':
            return '👤';
        case 'edit-author':
            return '✍️';
        case 'user-settings':
            return '⚙️';
        case 'new-account':
            return '👋';
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

// Format timestamp to relative time
function formatTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    
    return date.toLocaleDateString('en-US', { 
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Generate activity item HTML
function createActivityItem(activity) {
    return `
        <div class="activity-item">
            <div class="activity-card">
                <div class="activity-header">
                    <span class="activity-type">${activity.type}</span>
                    <span class="activity-time">${formatTimeAgo(activity.timestamp)}</span>
                </div>
                <div class="activity-details">
                    <span class="activity-user">${activity.user}</span>
                    <p class="activity-description">${activity.description}</p>
                </div>
            </div>
        </div>
    `;
}

// Group activities by time period
function groupActivitiesByPeriod(activities) {
    const now = new Date();
    const last24Hours = [];
    const lastWeek = [];
    const older = [];

    activities.forEach(activity => {
        const activityDate = new Date(activity.timestamp);
        const hoursDiff = (now - activityDate) / (1000 * 60 * 60);

        if (hoursDiff <= 24) {
            last24Hours.push(activity);
        } else if (hoursDiff <= 168) { // 7 days
            lastWeek.push(activity);
        } else {
            older.push(activity);
        }
    });

    return { last24Hours, lastWeek, older };
}

// Initialize the activity timeline
function initializeTimeline() {
    const timelineContainer = document.querySelector('.activity-timeline');
    if (!timelineContainer) return;

    // Add timeline line
    const timelineLine = document.createElement('div');
    timelineLine.className = 'timeline-line';
    timelineContainer.appendChild(timelineLine);

    // Fetch and display activities
    fetchActivities().then(activities => {
        const grouped = groupActivitiesByPeriod(activities);
        
        if (grouped.last24Hours.length > 0) {
            timelineContainer.innerHTML += `
                <h2 class="time-period-header">Last 24 Hours</h2>
                ${grouped.last24Hours.map(createActivityItem).join('')}
            `;
        } else {
            timelineContainer.innerHTML += `
                <div class="no-activities">No new activities in the last 24 hours</div>
            `;
        }

        if (grouped.lastWeek.length > 0) {
            timelineContainer.innerHTML += `
                <h2 class="time-period-header">Last Week</h2>
                ${grouped.lastWeek.map(createActivityItem).join('')}
            `;
        }

        if (grouped.older.length > 0) {
            timelineContainer.innerHTML += `
                <h2 class="time-period-header">Older</h2>
                ${grouped.older.map(createActivityItem).join('')}
            `;
        }
    });
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