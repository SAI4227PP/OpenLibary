// DOM Elements
const bookContent = document.getElementById('bookContent');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const favoriteBtn = document.getElementById('favoriteBtn');
const fullTextSection = document.getElementById('fullTextSection');
const textSearchInput = document.getElementById('textSearchInput');
const textSearchButton = document.getElementById('textSearchButton');
const textSearchResults = document.getElementById('textSearchResults');

// Book state
let currentBook = null;
let currentBookKey = null;

// Initialize book details page
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const bookKey = params.get('key');
    
    if (!bookKey) {
        showError();
        return;
    }

    currentBookKey = bookKey;
    await loadBookDetails(bookKey);
});

// Load book details
async function loadBookDetails(bookKey) {
    try {
        showLoading();
        
        // Fetch book details
        const bookData = await window.libraryUtils.getBookDetails(bookKey);
        currentBook = bookData;
        
        // Update UI with book details
        updateBookUI(bookData);
        
        // Check if full text is available
        if (bookData.has_fulltext) {
            fullTextSection.classList.remove('hidden');
        }
        
        // Load editions
        loadBookEditions(bookKey);
        
        // Update favorite button
        updateFavoriteButton();
        
        hideLoading();
        bookContent.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading book details:', error);
        showError();
    }
}

// Update UI with book details
function updateBookUI(book) {
    // Update title
    document.getElementById('bookTitle').textContent = book.title;
    document.title = `${book.title} - Open Library`;
    
    // Update cover image
    const coverId = book.covers?.[0];
    const coverUrl = coverId ? 
        `${COVERS_BASE_URL}/id/${coverId}-L.jpg` : 
        '../images/default-cover.png';
    const coverImg = document.getElementById('bookCover');
    coverImg.src = coverUrl;
    coverImg.onerror = () => {
        coverImg.src = '../images/default-cover.png';
    };
    
    // Update authors
    if (book.authors) {
        const authors = book.authors.map(author => {
            const authorName = author.name || 'Unknown Author';
            return `<a href="author.html?key=${encodeURIComponent(author.key)}">${authorName}</a>`;
        });
        document.getElementById('bookAuthors').innerHTML = authors.join(', ');
    }
    
    // Update publish info
    const publishInfo = [];
    if (book.first_publish_date) {
        publishInfo.push(`First published: ${book.first_publish_date}`);
    }
    if (book.number_of_pages) {
        publishInfo.push(`${book.number_of_pages} pages`);
    }
    document.getElementById('bookPublished').textContent = publishInfo.join(' • ');
    
    // Update description
    const description = document.getElementById('bookDescription');
    if (book.description) {
        const descText = typeof book.description === 'object' ? 
            book.description.value : book.description;
        description.innerHTML = `<p>${descText}</p>`;
    } else {
        description.innerHTML = '<p>No description available.</p>';
    }
    
    // Update subjects
    const subjectsContainer = document.getElementById('bookSubjects');
    if (book.subjects && book.subjects.length > 0) {
        const subjectLinks = book.subjects.map(subject => 
            `<a href="subjects.html?subject=${encodeURIComponent(subject)}" class="tag">${subject}</a>`
        );
        subjectsContainer.innerHTML = subjectLinks.join('');
    } else {
        subjectsContainer.innerHTML = '<p>No subjects available.</p>';
    }
    
    // Update publishers
    const publishersContainer = document.getElementById('bookPublishers');
    if (book.publishers && book.publishers.length > 0) {
        publishersContainer.innerHTML = book.publishers.join(', ');
    } else {
        publishersContainer.innerHTML = '<p>No publisher information available.</p>';
    }
    
    // Update ISBNs
    const isbnsContainer = document.getElementById('bookISBNs');
    if (book.isbn_13 || book.isbn_10) {
        const isbns = [];
        if (book.isbn_13) isbns.push(...book.isbn_13);
        if (book.isbn_10) isbns.push(...book.isbn_10);
        isbnsContainer.innerHTML = isbns.join(', ');
    } else {
        isbnsContainer.innerHTML = '<p>No ISBN information available.</p>';
    }
}

// Load book editions
async function loadBookEditions(bookKey) {
    try {
        const editionsUrl = `${API_BASE_URL}${bookKey}/editions.json`;
        const response = await fetch(editionsUrl);
        const data = await response.json();
        
        const editionsContainer = document.getElementById('bookEditions');
        if (data.entries && data.entries.length > 0) {
            const editionsHTML = data.entries.slice(0, 5).map(edition => {
                const coverId = edition.covers?.[0];
                const coverUrl = coverId ? 
                    `${COVERS_BASE_URL}/id/${coverId}-M.jpg` : 
                    '../images/default-cover.png';
                
                return `
                    <div class="edition-card">
                        <img src="${coverUrl}" alt="${edition.title}" 
                            onerror="this.src='../images/default-cover.png'">
                        <div class="edition-info">
                            <h3>${edition.title}</h3>
                            <p>${edition.publish_date || 'Publication date unknown'}</p>
                            <p>${edition.publishers?.[0] || 'Publisher unknown'}</p>
                        </div>
                    </div>
                `;
            }).join('');
            
            editionsContainer.innerHTML = editionsHTML;
        } else {
            editionsContainer.innerHTML = '<p>No other editions available.</p>';
        }
    } catch (error) {
        console.error('Error loading editions:', error);
        document.getElementById('bookEditions').innerHTML = 
            '<p>Error loading editions. Please try again later.</p>';
    }
}

// Favorite functionality
function updateFavoriteButton() {
    const isFavorite = window.libraryUtils.isBookFavorite(currentBookKey);
    favoriteBtn.innerHTML = `
        <span class="heart-icon">${isFavorite ? '♥' : '♡'}</span>
        ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
    `;
    favoriteBtn.classList.toggle('favorited', isFavorite);
}

favoriteBtn.addEventListener('click', () => {
    if (currentBook) {
        const isNowFavorite = window.libraryUtils.toggleFavorite({
            key: currentBookKey,
            title: currentBook.title,
            cover_i: currentBook.covers?.[0],
            author_name: currentBook.authors?.map(a => a.name)
        });
        updateFavoriteButton();
    }
});

// Full text search functionality
textSearchButton.addEventListener('click', performFullTextSearch);
textSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performFullTextSearch();
    }
});

async function performFullTextSearch() {
    const searchQuery = textSearchInput.value.trim();
    if (!searchQuery) return;

    try {
        textSearchResults.innerHTML = '';
        const loadingIndicator = window.libraryUtils.showLoading();
        textSearchResults.appendChild(loadingIndicator);

        const searchUrl = `${API_BASE_URL}${currentBookKey}/search.json?q=${encodeURIComponent(searchQuery)}`;
        const response = await fetch(searchUrl);
        const data = await response.json();

        displayTextSearchResults(data);
    } catch (error) {
        console.error('Error in full text search:', error);
        textSearchResults.innerHTML = '<p class="error">Error performing text search. Please try again.</p>';
    }
}

function displayTextSearchResults(data) {
    textSearchResults.innerHTML = '';
    
    if (!data.hits || data.hits.length === 0) {
        textSearchResults.innerHTML = '<p>No matches found in the text.</p>';
        return;
    }

    const resultsHTML = data.hits.map(hit => `
        <div class="text-search-result">
            <p class="page-number">Page ${hit.page_number}</p>
            <p class="snippet">${hit.snippet}</p>
        </div>
    `).join('');

    textSearchResults.innerHTML = `
        <div class="results-count">Found ${data.hits.length} matches</div>
        ${resultsHTML}
    `;
}

// UI state functions
function showLoading() {
    loading.classList.remove('hidden');
    bookContent.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError() {
    loading.classList.add('hidden');
    bookContent.classList.add('hidden');
    errorMessage.classList.remove('hidden');
}