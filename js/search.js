// Search state
let currentPage = 1;
let currentQuery = '';
let currentSearchType = 'all';
let isFullTextSearch = false;
let totalResults = 0;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const searchType = document.getElementById('searchType');
const fullTextSearch = document.getElementById('fullTextSearch');
const resultsCount = document.getElementById('resultsCount');
const searchResults = document.getElementById('searchResults');
const pagination = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const totalResultsSpan = document.getElementById('totalResults');

// Initialize from URL parameters
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get('q');
    if (queryParam) {
        searchInput.value = queryParam;
        performSearch();
    }
});

// Event listeners
searchButton.addEventListener('click', () => {
    currentPage = 1;
    performSearch();
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        currentPage = 1;
        performSearch();
    }
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        performSearch();
    }
});

nextPageBtn.addEventListener('click', () => {
    currentPage++;
    performSearch();
});

searchType.addEventListener('change', () => {
    currentPage = 1;
    currentSearchType = searchType.value;
    performSearch();
});

fullTextSearch.addEventListener('change', () => {
    currentPage = 1;
    isFullTextSearch = fullTextSearch.checked;
    performSearch();
});

// Search functionality
async function performSearch() {
    if (!searchInput.value.trim()) return;

    currentQuery = searchInput.value.trim();
    searchResults.innerHTML = '';
    pagination.classList.add('hidden');
    
    // Create a wrapper div for positioning
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.minHeight = '400px';  // Give some height for the spinner
    wrapper.appendChild(window.libraryUtils.showLoading());
    searchResults.appendChild(wrapper);
    
    resultsCount.classList.add('hidden');
    
    try {
        let searchUrl = '';
        const query = encodeURIComponent(currentQuery);
        
        // Construct search URL based on search type
        switch (currentSearchType) {
            case 'title':
                searchUrl = `/search.json?title=${query}`;
                break;
            case 'author':
                searchUrl = `/search/authors.json?q=${query}`;
                break;
            case 'isbn':
                searchUrl = `/isbn/${query}.json`;
                break;
            case 'subject':
                searchUrl = `/subjects/${query}.json`;
                break;
            default:
                searchUrl = `/search.json?q=${query}`;
        }

        // Add pagination parameters
        if (!searchUrl.includes('isbn')) {
            searchUrl += `&page=${currentPage}`;
        }

        // Add full text search parameter if enabled
        if (isFullTextSearch) {
            searchUrl += '&has_fulltext=true';
        }

        const response = await fetch(`${API_BASE_URL}${searchUrl}`);
        const data = await response.json();

        // Process results
        displayResults(data);
        updatePagination(data);
        
    } catch (error) {
        const errorData = window.libraryUtils.handleApiError(error);
        displayError(errorData.error);
    }
}

// Display functions
function displayResults(data) {
    searchResults.innerHTML = '';
    resultsCount.classList.remove('hidden');
    
    if (currentSearchType === 'isbn') {
        // Handle single book result for ISBN search
        if (data.error) {
            displayError('Book not found');
            return;
        }
        const book = {
            title: data.title,
            author_name: [data.authors?.[0]?.name || 'Unknown Author'],
            first_publish_year: data.publish_date,
            cover_i: data.covers?.[0],
            key: data.works?.[0]?.key || `/works/${data.key}`,
            edition_count: data.edition_count || 0,
            has_fulltext: data.has_fulltext || false,
            preview: data.preview || "noview"
        };
        searchResults.appendChild(createEnhancedBookCard(book));
        totalResults = 1;
        
    } else {
        // Handle multiple results
        const results = data.docs || data.works || [];
        totalResults = data.numFound || results.length;
        
        if (results.length === 0) {
            displayError('No results found');
            return;
        }

        results.forEach(book => {
            // Ensure book has the correct works key format
            if (!book.key.startsWith('/works/')) {
                book.key = `/works/${book.key}`;
            }
            searchResults.appendChild(createEnhancedBookCard(book));
        });
    }

    totalResultsSpan.textContent = totalResults;
    pagination.classList.toggle('hidden', totalResults <= 10);
}

// Create an enhanced book card with editions and availability info
function createEnhancedBookCard(book) {
    const card = document.createElement('div');
    card.className = 'result-card';
    
    const coverUrl = book.cover_i 
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : '../images/default-cover.jpg';

    // Determine availability status
    const readStatus = book.has_fulltext ? 
        '<span class="status available">Available to Read</span>' : 
        '<span class="status unavailable">Not Available to Read</span>';

    // Determine preview status
    let previewStatus = '';
    switch(book.preview) {
        case 'full':
            previewStatus = '<span class="status preview-full">Full Preview</span>';
            break;
        case 'partial':
            previewStatus = '<span class="status preview-partial">Partial Preview</span>';
            break;
        default:
            previewStatus = '<span class="status preview-none">No Preview</span>';
    }

    card.innerHTML = `
        <img src="${coverUrl}" alt="${book.title}" class="result-image">
        <div class="result-info">
            <h3 class="result-title">${book.title}</h3>
            <p class="result-author">${book.author_name ? book.author_name[0] : 'Unknown Author'}</p>
            <p class="result-year">${book.first_publish_year ? `First published: ${book.first_publish_year}` : ''}</p>
            <div class="editions-info">
                <span class="editions-count">${book.edition_count || 0} editions</span>
            </div>
            <div class="availability-info">
                ${readStatus}
                ${previewStatus}
            </div>
        </div>
    `;

    // Make card clickable with correct works URL format
    card.addEventListener('click', () => {
        const workKey = book.key.startsWith('/works/') ? book.key : `/works/${book.key}`;
        window.location.href = `../pages/book.html?key=${workKey}`;
    });

    return card;
}

function updatePagination(data) {
    currentPageSpan.textContent = `Page ${currentPage}`;
    prevPageBtn.disabled = currentPage === 1;
    
    // Assuming 10 results per page
    const maxPages = Math.ceil(totalResults / 10);
    nextPageBtn.disabled = currentPage >= maxPages;
}

function displayError(message) {
    searchResults.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
        </div>
    `;
    resultsCount.classList.add('hidden');
    pagination.classList.add('hidden');
}