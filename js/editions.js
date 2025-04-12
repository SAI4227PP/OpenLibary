// DOM Elements
const editionsContent = document.getElementById('editionsContent');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const editionsGrid = document.getElementById('editionsGrid');
const bookTitle = document.getElementById('bookTitle');
const backToBook = document.getElementById('backToBook');


// State
let currentWorkKey = null;
let editions = [];
let filters = {
    language: '',
    year: '',
    format: ''
};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const params = new URLSearchParams(window.location.search);
        const workKey = params.get('key');
        
        if (!workKey) {
            showError();
            return;
        }

        currentWorkKey = workKey;
        backToBook.href = `book.html?key=${encodeURIComponent(workKey)}`;
        
        await loadAllEditions(workKey);
    } catch (error) {
        console.error('Initialization error:', error);
        showError();
    }
});

// Load all editions
async function loadAllEditions(workKey) {
    try {
        showLoading();
        
        // Ensure the key is in the correct format and properly encoded
        const formattedKey = workKey.startsWith('/works/') ? workKey : `/works/${workKey}`;
        
        const editionsUrl = `${API_BASE_URL}${formattedKey}/editions.json`;
        console.log('Fetching editions from:', editionsUrl); // Debug line
        
        const response = await fetch(editionsUrl);
        if (!response.ok) throw new Error(`Failed to fetch editions: ${response.status}`);
        
        const data = await response.json();
        editions = data.entries || [];
        
        // Get book title
        const workResponse = await fetch(`${API_BASE_URL}${formattedKey}.json`);
        if (!workResponse.ok) throw new Error(`Failed to fetch work data: ${workResponse.status}`);
        
        const workData = await workResponse.json();
        bookTitle.textContent = workData.title || 'Unknown Title';
        
        // Initialize filters
        initializeFilters(editions);
        
        // Display editions
        displayEditions(editions);
        
        hideLoading();
        editionsContent.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading editions:', error);
        showError();
    }
}

// Initialize filter options
function initializeFilters(editions) {
    const languages = new Set();
    const years = new Set();
    const formats = new Set();
    
    editions.forEach(edition => {
        if (edition.languages?.[0]?.key) {
            languages.add(edition.languages[0].key.split('/').pop());
        }
        if (edition.publish_date) {
            const year = edition.publish_date.match(/\d{4}/)?.[0];
            if (year) years.add(year);
        }
        if (edition.physical_format) {
            formats.add(edition.physical_format);
        }
    });
    
    populateFilter('languageFilter', Array.from(languages).sort());
    populateFilter('yearFilter', Array.from(years).sort().reverse());
    populateFilter('formatFilter', Array.from(formats).sort());
}

// Display editions with current filters
function displayEditions(editions) {
    const filteredEditions = editions.filter(edition => {
        const matchesLanguage = !filters.language || 
            edition.languages?.[0]?.key.endsWith(filters.language);
        const matchesYear = !filters.year || 
            edition.publish_date?.includes(filters.year);
        const matchesFormat = !filters.format || 
            edition.physical_format === filters.format;
        return matchesLanguage && matchesYear && matchesFormat;
    });
    
    const editionsHTML = filteredEditions.map(edition => createEditionCard(edition)).join('');
    editionsGrid.innerHTML = editionsHTML || '<p>No editions match the selected filters.</p>';
}

// Helper function to create edition card
function createEditionCard(edition) {
    const coverId = edition.covers?.[0];
    const coverUrl = coverId ? 
        `${COVERS_BASE_URL}/b/id/${coverId}-M.jpg` : 
        '../images/no-cover.png';

    return `
        <div class="edition-card">
            <img src="${coverUrl}" 
                 alt="${edition.title || 'Book cover'}" 
                 loading="lazy"
                 onerror="this.src='../images/no-cover.png'"
                 class="edition-cover">
            <div class="edition-info">
                <h3>${edition.title || 'Unknown Title'}</h3>
                <p class="publish-date">${edition.publish_date || 'Publication date unknown'}</p>
                <p class="publisher">${edition.publishers?.[0] || 'Publisher unknown'}</p>
                ${edition.number_of_pages ? 
                    `<p class="pages">${edition.number_of_pages} pages</p>` : ''}
                ${edition.languages?.[0]?.key ? 
                    `<p class="language">Language: ${edition.languages[0].key.split('/').pop()}</p>` : ''}
            </div>
        </div>
    `;
}

// Helper functions
function showLoading() {
    loading.classList.remove('hidden');
    editionsContent.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError() {
    loading.classList.add('hidden');
    editionsContent.classList.add('hidden');
    errorMessage.classList.remove('hidden');
}

// Add event listeners for filters
['languageFilter', 'yearFilter', 'formatFilter'].forEach(filterId => {
    document.getElementById(filterId).addEventListener('change', (e) => {
        filters[e.target.id.replace('Filter', '')] = e.target.value;
        displayEditions(editions);
    });
});
