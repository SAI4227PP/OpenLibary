// DOM Elements
const subjectSearch = document.getElementById('subjectSearch');
const popularSubjects = document.getElementById('popularSubjects');
const subjectContent = document.getElementById('subjectContent');
const currentSubjectTitle = document.getElementById('currentSubject');
const subjectStats = document.getElementById('subjectStats');
const subjectBooks = document.getElementById('subjectBooks');
const sortBooksSelect = document.getElementById('sortBooks');
const subjectPagination = document.getElementById('subjectPagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');

// Subject state
let currentSubject = '';
let currentPage = 1;
let currentSort = 'new';
let subjectData = null;
let subjectBooks = [];

// Popular subjects with emojis
const popularSubjectsList = [
    { name: 'fiction', emoji: '📚' },
    { name: 'science', emoji: '🔬' },
    { name: 'history', emoji: '📜' },
    { name: 'fantasy', emoji: '🐉' },
    { name: 'biography', emoji: '👤' },
    { name: 'poetry', emoji: '📝' }
];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    
    if (subject) {
        loadSubjectBooks(subject);
    } else {
        initializePopularSubjects();
    }
});

// Initialize popular subjects
async function initializePopularSubjects() {
    const subjectCards = document.querySelectorAll('.subject-card');
    
    subjectCards.forEach(async (card) => {
        const subject = card.dataset.subject;
        try {
            const data = await window.libraryUtils.getSubjects(subject);
            const count = data.work_count || 0;
            card.querySelector('.book-count').textContent = `${count.toLocaleString()} books`;
            
            // Add emoji to subject title
            const subjectInfo = popularSubjectsList.find(s => s.name === subject);
            if (subjectInfo) {
                card.querySelector('h3').textContent = `${subjectInfo.emoji} ${subject.charAt(0).toUpperCase() + subject.slice(1)}`;
            }
        } catch (error) {
            card.querySelector('.book-count').textContent = 'Error loading count';
        }
    });
}

// Load books for a specific subject
async function loadSubjectBooks(subject) {
    currentSubject = subject;
    showLoading();
    
    try {
        // Fetch subject data
        subjectData = await window.libraryUtils.getSubjects(subject);
        subjectBooks = subjectData.works || [];
        
        // Update UI
        updateSubjectUI();
        sortBooks();
        displayBooks();
        
        hideLoading();
        subjectContent.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading subject books:', error);
        showError();
    }
}

// Update subject UI
function updateSubjectUI() {
    // Update title
    const subjectInfo = popularSubjectsList.find(s => s.name === currentSubject);
    const emoji = subjectInfo ? subjectInfo.emoji : '📚';
    currentSubjectTitle.textContent = `${emoji} ${currentSubject.charAt(0).toUpperCase() + currentSubject.slice(1)}`;
    
    // Update stats
    const stats = [];
    if (subjectData.work_count) {
        stats.push(`${subjectData.work_count.toLocaleString()} books`);
    }
    subjectStats.textContent = stats.join(' • ');
}

// Sort books
function sortBooks() {
    switch (currentSort) {
        case 'title':
            subjectBooks.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'rating':
            subjectBooks.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
            break;
        case 'old':
            subjectBooks.sort((a, b) => {
                const dateA = a.first_publish_date ? new Date(a.first_publish_date) : new Date(0);
                const dateB = b.first_publish_date ? new Date(b.first_publish_date) : new Date(0);
                return dateA - dateB;
            });
            break;
        case 'new':
        default:
            subjectBooks.sort((a, b) => {
                const dateA = a.first_publish_date ? new Date(a.first_publish_date) : new Date(0);
                const dateB = b.first_publish_date ? new Date(b.first_publish_date) : new Date(0);
                return dateB - dateA;
            });
            break;
    }
}

// Display books with pagination
function displayBooks() {
    subjectBooks.innerHTML = '';
    
    const itemsPerPage = 12;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageBooks = subjectBooks.slice(start, end);
    
    if (pageBooks.length === 0) {
        subjectBooks.innerHTML = '<p>No books found for this subject.</p>';
        subjectPagination.classList.add('hidden');
        return;
    }

    pageBooks.forEach(book => {
        subjectBooks.appendChild(window.libraryUtils.createBookCard(book));
    });

    // Update pagination
    const totalPages = Math.ceil(subjectBooks.length / itemsPerPage);
    subjectPagination.classList.toggle('hidden', totalPages <= 1);
    currentPageSpan.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
}

// Event listeners
popularSubjects.addEventListener('click', (e) => {
    const card = e.target.closest('.subject-card');
    if (card) {
        const subject = card.dataset.subject;
        window.location.href = `subjects.html?subject=${encodeURIComponent(subject)}`;
    }
});

subjectSearch.addEventListener('input', debounce(async (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (query.length < 2) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/${encodeURIComponent(query)}.json`);
        const data = await response.json();
        
        if (data.works && data.works.length > 0) {
            window.location.href = `subjects.html?subject=${encodeURIComponent(query)}`;
        }
    } catch (error) {
        console.error('Error searching subjects:', error);
    }
}, 300));

sortBooksSelect.addEventListener('change', () => {
    currentSort = sortBooksSelect.value;
    currentPage = 1;
    sortBooks();
    displayBooks();
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayBooks();
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(subjectBooks.length / 12);
    if (currentPage < totalPages) {
        currentPage++;
        displayBooks();
    }
});

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading() {
    loading.classList.remove('hidden');
    subjectContent.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError() {
    loading.classList.add('hidden');
    subjectContent.classList.add('hidden');
    errorMessage.classList.remove('hidden');
}