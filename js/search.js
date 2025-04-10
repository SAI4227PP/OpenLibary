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
    searchResults.appendChild(window.libraryUtils.showLoading());
    
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
            key: `/works/${data.key}`
        };
        searchResults.appendChild(window.libraryUtils.createBookCard(book));
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
            searchResults.appendChild(window.libraryUtils.createBookCard(book));
        });
    }

    totalResultsSpan.textContent = totalResults;
    pagination.classList.toggle('hidden', totalResults <= 10);
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