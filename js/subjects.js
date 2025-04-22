// DOM Elements
const subjectSearch = document.getElementById('searchInput');
const popularSubjects = document.getElementById('popularSubjects');
const subjectContent = document.getElementById('subjectContent');
const currentSubjectTitle = document.getElementById('currentSubject');
const subjectStats = document.getElementById('subjectStats');
const subjectBooksContainer = document.getElementById('subjectBooks');
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
let subjectBooksList = [];

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
    // Wait for library utilities to load
    if (!window.libraryUtils) {
        console.error('Library utilities not loaded');
        showError();
        return;
    }

    initializePopularSubjects();
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
    subjectContent.classList.add('hidden');
    
    try {
        // Fetch subject data
        subjectData = await window.libraryUtils.getSubjects(subject);
        subjectBooksList = subjectData.works || [];
        
        // Enhance book data with additional fields
        subjectBooksList = subjectBooksList.map(book => ({
            ...book,
            key: book.key.startsWith('/works/') ? book.key : `/works/${book.key}`,
            cover_i: book.cover_id, // Map cover_id to cover_i for consistency
            author_name: book.authors?.map(a => a.name) || ['Unknown Author']
        }));
        
        // Reset to first page when loading new subject
        currentPage = 1;
        
        // Update UI
        updateSubjectUI();
        sortBooks();
        
        // Small delay to ensure loading bar is visible even for fast loads
        await new Promise(resolve => setTimeout(resolve, 300));
        
        displayBooks();
        hideLoading();
        
        // Show content and pagination
        subjectContent.classList.remove('hidden');
        if (subjectBooksList.length > 12) { // Only show pagination if there's more than one page
            subjectPagination.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Error loading subject books:', error);
        showError();
        hideLoading();
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

// Sort books with animation
function sortBooks() {
    // First fade out the current books
    subjectBooksContainer.style.opacity = '0';
    subjectBooksContainer.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        switch (currentSort) {
            case 'title':
                subjectBooksList.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'rating':
                subjectBooksList.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
                break;
            case 'old':
                subjectBooksList.sort((a, b) => {
                    const dateA = a.first_publish_date ? new Date(a.first_publish_date) : new Date(0);
                    const dateB = b.first_publish_date ? new Date(b.first_publish_date) : new Date(0);
                    return dateA - dateB;
                });
                break;
            case 'new':
            default:
                subjectBooksList.sort((a, b) => {
                    const dateA = a.first_publish_date ? new Date(a.first_publish_date) : new Date(0);
                    const dateB = b.first_publish_date ? new Date(b.first_publish_date) : new Date(0);
                    return dateB - dateA;
                });
                break;
        }
        
        displayBooks();
        
        // Fade in the sorted books
        requestAnimationFrame(() => {
            subjectBooksContainer.style.opacity = '1';
            subjectBooksContainer.style.transform = 'translateY(0)';
        });
    }, 300); // Wait for fade out to complete
}

// Display books with pagination
function displayBooks() {
    // First fade out current books
    subjectBooksContainer.style.opacity = '0';
    subjectBooksContainer.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        subjectBooksContainer.innerHTML = '';
        
        const itemsPerPage = 12;
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageBooks = subjectBooksList.slice(start, end);
        const totalPages = Math.ceil(subjectBooksList.length / itemsPerPage);
        
        if (pageBooks.length === 0) {
            subjectBooksContainer.innerHTML = '<p>No books found for this subject.</p>';
            subjectPagination.classList.add('hidden');
            return;
        }

        pageBooks.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            
            const coverUrl = book.cover_i ? 
                `${window.libraryUtils.COVERS_BASE_URL}/id/${book.cover_i}-M.jpg` :
                '../images/default-cover.jpg';

            card.innerHTML = `
                <div class="book-cover">
                    <img src="${coverUrl}" 
                         alt="${book.title}" 
                         onerror="this.parentNode.innerHTML='<div class=\\'no-cover-placeholder\\'>No Cover</div>'"
                         loading="lazy">
                </div>
                <div class="book-info">
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">${book.author_name[0] || 'Unknown Author'}</p>
                    ${book.first_publish_year ? `<span class="book-year">${book.first_publish_year}</span>` : ''}
                </div>
            `;

            card.addEventListener('click', () => {
                window.location.href = `book.html?key=${encodeURIComponent(book.key)}`;
            });

            subjectBooksContainer.appendChild(card);
        });

        // Update pagination visibility and state
        if (totalPages > 1) {
            subjectPagination.classList.remove('hidden');
            currentPageSpan.textContent = `Page ${currentPage} of ${totalPages}`;
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage === totalPages;
        } else {
            subjectPagination.classList.add('hidden');
        }
        
        // Fade in new books
        requestAnimationFrame(() => {
            subjectBooksContainer.style.opacity = '1';
            subjectBooksContainer.style.transform = 'translateY(0)';
        });
    }, 300); // Wait for fade out to complete
}

// Search functionality
function handleSubjectSearch(query) {
    query = query.trim().toLowerCase();
    if (query.length < 2) return;
    
    showLoading();
    fetch(`${API_BASE_URL}/subjects/${encodeURIComponent(query)}.json`)
        .then(response => {
            if (!response.ok) throw new Error('Subject not found');
            return response.json();
        })
        .then(data => {
            if (data.works && data.works.length > 0) {
                loadSubjectBooks(query);
            } else {
                showError();
                errorMessage.textContent = 'No books found for this subject';
            }
        })
        .catch(error => {
            console.error('Error searching subjects:', error);
            showError();
        });
}

// Event listeners
popularSubjects.addEventListener('click', (e) => {
    const card = e.target.closest('.subject-card');
    if (card) {
        const subject = card.dataset.subject;
        loadSubjectBooks(subject);
    }
});

subjectSearch.addEventListener('input', debounce((e) => {
    handleSubjectSearch(e.target.value);
}, 300));

document.getElementById('searchButton').addEventListener('click', () => {
    handleSubjectSearch(subjectSearch.value);
});

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
    const totalPages = Math.ceil(subjectBooksList.length / 12);
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