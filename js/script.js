// API Configuration
const API_BASE_URL = 'https://openlibrary.org';
const COVERS_BASE_URL = 'https://covers.openlibrary.org/b';

// Library Utilities
window.libraryUtils = {
    // Book fetching and details
    async getBookDetails(key) {
        const response = await fetch(`${API_BASE_URL}${key}.json`);
        return response.json();
    },

    // Author fetching and details
    async getAuthorDetails(key) {
        const response = await fetch(`${API_BASE_URL}/authors/${key}.json`);
        return response.json();
    },

    // Subject fetching
    async getSubjects(subject) {
        const response = await fetch(`${API_BASE_URL}/subjects/${subject}.json`);
        return response.json();
    },

    // Search functionality
    async searchBooks(query, page = 1) {
        const response = await fetch(
            `${API_BASE_URL}/search.json?q=${encodeURIComponent(query)}&page=${page}`
        );
        return response.json();
    },

    // Create book card element
    createBookCard(book) {
        const card = document.createElement('div');
        card.className = 'book-card';
        
        // Get cover image URL
        const coverId = book.cover_i || book.covers?.[0];
        const coverUrl = coverId ? 
            `${COVERS_BASE_URL}/b/id/${coverId}-M.jpg` : 
            'images/default-cover.png';

        card.innerHTML = `
            <div class="book-cover">
                <img src="${coverUrl}" alt="${book.title}" 
                    onerror="this.src='images/default-cover.png'">
            </div>
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">${book.author_name?.[0] || 'Unknown Author'}</p>
                ${book.first_publish_year ? 
                    `<p class="book-year">${book.first_publish_year}</p>` : ''}
            </div>
            <div class="book-actions">
                <button onclick="window.location.href='book.html?key=${book.key}'">
                    View Details
                </button>
            </div>
        `;

        return card;
    },

    // Format date for display
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Handle API errors
    handleError(error) {
        console.error('API Error:', error);
        return {
            error: true,
            message: 'An error occurred. Please try again later.'
        };
    }
};

// Authentication functions
function checkAuth() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function updateAuthUI() {
    const user = checkAuth();
    const userOnlyElements = document.querySelectorAll('.user-only');
    const guestOnlyElements = document.querySelectorAll('.guest-only');

    userOnlyElements.forEach(element => {
        element.classList.toggle('hidden', !user);
    });

    guestOnlyElements.forEach(element => {
        element.classList.toggle('hidden', !!user);
    });
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('readingLog');
    localStorage.removeItem('userLists');
    window.location.href = 'index.html';
}

// Dark mode handling
function initializeDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', darkMode);
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
}

// Homepage functions
async function loadFeaturedBooks() {
    try {
        const response = await fetch(`${API_BASE_URL}/trending/daily.json`);
        const data = await response.json();
        const container = document.querySelector('.carousel-container');
        
        if (!container) return;
        
        container.innerHTML = '';
        data.works.forEach(book => {
            container.appendChild(window.libraryUtils.createBookCard(book));
        });
        
        // Initialize carousel
        updateCarousel();
        
    } catch (error) {
        console.error('Error loading featured books:', error);
    }
}

async function loadTrendingSubjects() {
    try {
        const container = document.getElementById('trendingSubjects');
        if (!container) return;

        const subjects = [
            { name: 'fiction', emoji: '📚' },
            { name: 'science', emoji: '🔬' },
            { name: 'history', emoji: '📜' },
            { name: 'fantasy', emoji: '🐉' },
            { name: 'biography', emoji: '👤' },
            { name: 'poetry', emoji: '📝' }
        ];

        const subjectsHTML = subjects.map(subject => `
            <div class="subject-card" onclick="window.location.href='pages/subjects.html?subject=${subject.name}'">
                <div class="subject-icon">${subject.emoji}</div>
                <h3>${subject.name.charAt(0).toUpperCase() + subject.name.slice(1)}</h3>
                <span class="book-count">Loading...</span>
            </div>
        `).join('');

        container.innerHTML = subjectsHTML;

        // Load book counts
        subjects.forEach(async (subject, index) => {
            try {
                const data = await window.libraryUtils.getSubjects(subject.name);
                const count = data.work_count || 0;
                container.children[index].querySelector('.book-count').textContent = 
                    `${count.toLocaleString()} books`;
            } catch (error) {
                container.children[index].querySelector('.book-count').textContent = 
                    'Error loading count';
            }
        });

    } catch (error) {
        console.error('Error loading trending subjects:', error);
    }
}

async function loadPopularLists() {
    const container = document.getElementById('popularLists');
    if (!container) return;

    const popularLists = [
        {
            name: 'Best Classics',
            description: 'Essential classics everyone should read',
            bookCount: 25
        },
        {
            name: 'Science Picks',
            description: 'Top science books for curious minds',
            bookCount: 18
        },
        {
            name: 'Must-Read Fantasy',
            description: 'Epic fantasy adventures',
            bookCount: 20
        }
    ];

    container.innerHTML = popularLists.map(list => `
        <div class="list-card" onclick="window.location.href='pages/lists.html'">
            <h3>${list.name}</h3>
            <p>${list.description}</p>
            <span class="book-count">${list.bookCount} books</span>
        </div>
    `).join('');
}

async function loadRecentActivity() {
    try {
        const response = await fetch(`${API_BASE_URL}/recentchanges.json`);
        const data = await response.json();
        const container = document.getElementById('recentActivity');
        
        if (!container) return;

        const activitiesHTML = data.changes.slice(0, 5).map(change => `
            <div class="activity-item">
                <div class="activity-icon">${getActivityIcon(change.type)}</div>
                <div class="activity-details">
                    <div class="activity-title">
                        ${change.title || 'Untitled'}
                    </div>
                    <div class="activity-meta">
                        ${change.author ? `by ${change.author}` : ''}
                        <span class="activity-time">
                            ${window.libraryUtils.formatDate(change.timestamp)}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = activitiesHTML;

    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

function getActivityIcon(type) {
    switch (type) {
        case 'add-book': return '📚';
        case 'edit-book': return '✏️';
        case 'add-author': return '👤';
        case 'edit-author': return '✍️';
        default: return '🔄';
    }
}

async function loadLibraryStats() {
    try {
        // In a real app, these would be API calls
        document.getElementById('totalBooks').textContent = '30M+';
        document.getElementById('totalAuthors').textContent = '8M+';
        document.getElementById('totalSubjects').textContent = '200K+';
    } catch (error) {
        console.error('Error loading library stats:', error);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeDarkMode();
    updateAuthUI();
});

const darkModeToggle = document.getElementById('darkModeToggle');
if (darkModeToggle) {
    darkModeToggle.addEventListener('click', toggleDarkMode);
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}