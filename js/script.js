// API Configuration
const API_BASE_URL = 'https://openlibrary.org';
const COVERS_BASE_URL = 'https://covers.openlibrary.org/b';

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

// Carousel Navigation
function scrollCarousel(direction) {
    const container = document.querySelector('.carousel-container');
    const cardWidth = 200; // Width of each book card
    const scrollAmount = cardWidth + 16; // Card width + gap
    
    if (container) {
        const newScrollPosition = container.scrollLeft + (direction * scrollAmount);
        container.scrollTo({
            left: newScrollPosition,
            behavior: 'smooth'
        });
        
        // Update button states after scrolling
        updateCarouselButtons();
    }
}

function updateCarouselButtons() {
    const container = document.querySelector('.carousel-container');
    const prevButton = document.querySelector('.carousel-btn.prev');
    const nextButton = document.querySelector('.carousel-btn.next');
    
    if (container && prevButton && nextButton) {
        // Check if we can scroll backwards
        prevButton.disabled = container.scrollLeft <= 0;
        
        // Check if we can scroll forwards
        const maxScroll = container.scrollWidth - container.clientWidth - 1; // -1 for rounding
        nextButton.disabled = container.scrollLeft >= maxScroll;
    }
}

// Homepage functions
async function loadFeaturedBooks() {
    try {
        const container = document.querySelector('.carousel-container');
        const loadingState = document.querySelector('.loading-state');
        
        if (!container) return;
        
        loadingState.style.display = 'flex';
        container.style.display = 'none';
        
        const subjects = ['fiction', 'science', 'philosophy', 'history', 'fantasy'];
        const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
        const response = await window.libraryUtils.searchBooks(`subject:${randomSubject}`, 1);
        const books = response.docs.slice(0, 12);
        
        const bookCards = books.map(book => {
            const card = window.libraryUtils.createBookCard(book);
            return card.outerHTML;
        }).join('');
        
        container.innerHTML = bookCards;
        
        loadingState.style.display = 'none';
        container.style.display = 'flex'; // Ensure flex display
        
        // Initialize button states
        updateCarouselButtons();
        
    } catch (error) {
        console.error('Error loading featured books:', error);
        loadingState.innerHTML = '<p>Error loading books. Please try again later.</p>';
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
        const container = document.getElementById('recentActivity');
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
            </div>`;

        // Using trending works API instead
        const response = await fetch(`${API_BASE_URL}/trending/now.json`);
        const data = await response.json();
        
        // Check if data exists and has works array
        if (!data || !data.works || !Array.isArray(data.works)) {
            throw new Error('Invalid data format received from API');
        }

        const recentActivities = data.works
            .slice(0, 5)
            .map(work => ({
                title: work.title,
                type: 'add-book',
                author: work.author_names?.[0] || 'Unknown Author',
                timestamp: new Date().toISOString() // Current time as these are trending now
            }))
            .map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">📚</div>
                    <div class="activity-details">
                        <div class="activity-title">
                            ${activity.title}
                        </div>
                        <div class="activity-meta">
                            by ${activity.author}
                            <span class="activity-time">
                                ${window.libraryUtils.formatDate(activity.timestamp)}
                            </span>
                        </div>
                    </div>
                </div>
            `).join('');

        if (recentActivities) {
            container.innerHTML = recentActivities;
        } else {
            container.innerHTML = '<p>No recent activity to display</p>';
        }

    } catch (error) {
        console.error('Error loading recent activity:', error);
        const container = document.getElementById('recentActivity');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <p>Unable to load recent activity. Please try again later.</p>
                </div>`;
        }
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
    
    // Handle dynamic navigation elements
    const setupNavigationHandlers = () => {
        const darkModeToggle = document.getElementById('darkModeToggle');
        const logoutBtn = document.getElementById('logoutBtn');
        const hamburger = document.querySelector('.hamburger-menu');
        const navLinks = document.querySelector('.nav-links');
        const nav = document.querySelector('.nav-container');
        
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', toggleDarkMode);
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
        
        if (hamburger && navLinks && nav) {
            function toggleMenu(show) {
                navLinks.classList.toggle('active', show);
                hamburger.classList.toggle('active', show);
            }
            
            // Toggle menu when hamburger is clicked
            hamburger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isActive = navLinks.classList.contains('active');
                toggleMenu(!isActive);
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!nav.contains(e.target)) {
                    toggleMenu(false);
                }
            });

            // Close menu when a link is clicked
            navLinks.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') {
                    toggleMenu(false);
                }
            });
        }
    };

    // Initial setup
    setupNavigationHandlers();

    // Setup handlers again when navigation is loaded dynamically
    document.addEventListener('navigationLoaded', setupNavigationHandlers);

    // Handle window resize
    window.addEventListener('resize', () => {
        const navLinks = document.querySelector('.nav-links');
        if (window.innerWidth > 768 && navLinks) {
            navLinks.classList.remove('active');
            const hamburger = document.querySelector('.hamburger-menu');
            if (hamburger) hamburger.classList.remove('active');
        }
    });

    // Add scroll event listener to update button states
    const container = document.querySelector('.carousel-container');
    if (container) {
        container.addEventListener('scroll', updateCarouselButtons);
        // Initial button state
        updateCarouselButtons();
    }
});