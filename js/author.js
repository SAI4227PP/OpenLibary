// DOM Elements
const authorContent = document.getElementById('authorContent');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const sortWorksSelect = document.getElementById('sortWorks');
const worksPagination = document.getElementById('worksPagination');
const prevWorksBtn = document.getElementById('prevWorks');
const nextWorksBtn = document.getElementById('nextWorks');
const worksPageSpan = document.getElementById('worksPage');

// Author state
let currentAuthor = null;
let currentAuthorKey = null;
let currentPage = 1;
let currentSort = 'published';
let authorWorks = [];

// Initialize author page
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const authorKey = params.get('key');
    
    if (!authorKey) {
        showError();
        return;
    }

    currentAuthorKey = authorKey;
    await loadAuthorDetails(authorKey);
});

// Load author details
async function loadAuthorDetails(authorKey) {
    try {
        showLoading();
        
        // Fetch author details
        const authorData = await window.libraryUtils.getAuthorDetails(authorKey);
        currentAuthor = authorData;
        
        // Update UI with author details
        updateAuthorUI(authorData);
        
        // Load author's works
        await loadAuthorWorks(authorKey);
        
        hideLoading();
        authorContent.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading author details:', error);
        showError();
    }
}

// Update UI with author details
function updateAuthorUI(author) {
    // Update title and name
    document.getElementById('authorName').textContent = author.name;
    document.title = `${author.name} - Open Library`;
    
    // Update photo
    const photoId = author.photos?.[0];
    const photoUrl = photoId ? 
        `${API_BASE_URL}/photo/${photoId}-L.jpg` : 
        '../images/default-author.png';
    const photoImg = document.getElementById('authorPhoto');
    photoImg.src = photoUrl;
    photoImg.onerror = () => {
        photoImg.src = '../images/default-author.png';
    };
    
    // Update dates
    const dates = [];
    if (author.birth_date) dates.push(`Born: ${author.birth_date}`);
    if (author.death_date) dates.push(`Died: ${author.death_date}`);
    document.getElementById('authorDates').textContent = dates.join(' • ');
    
    // Update stats
    const stats = [];
    if (author.work_count) stats.push(`${author.work_count} works`);
    document.getElementById('authorStats').textContent = stats.join(' • ');
    
    // Update biography
    const bioContainer = document.getElementById('authorBio');
    if (author.bio) {
        const bioText = typeof author.bio === 'object' ? 
            author.bio.value : author.bio;
        bioContainer.innerHTML = `<p>${bioText}</p>`;
    } else {
        bioContainer.innerHTML = '<p>No biography available.</p>';
    }
    
    // Update external links
    const linksContainer = document.getElementById('authorLinks');
    const links = [];
    
    if (author.wikipedia) {
        links.push(`<a href="${author.wikipedia}" target="_blank" rel="noopener">Wikipedia</a>`);
    }
    if (author.personal_site) {
        links.push(`<a href="${author.personal_site}" target="_blank" rel="noopener">Personal Website</a>`);
    }
    
    linksContainer.innerHTML = links.length > 0 ? 
        links.join(' • ') : 
        '<p>No external links available.</p>';
}

// Load author's works
async function loadAuthorWorks(authorKey) {
    try {
        const worksUrl = `${API_BASE_URL}/authors/${authorKey}/works.json`;
        const response = await fetch(worksUrl);
        const data = await response.json();
        
        authorWorks = data.entries || [];
        sortWorks();
        displayWorks();
        
    } catch (error) {
        console.error('Error loading author works:', error);
        document.getElementById('authorWorks').innerHTML = 
            '<p class="error">Error loading author works. Please try again later.</p>';
    }
}

// Sort works
function sortWorks() {
    switch (currentSort) {
        case 'title':
            authorWorks.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'rating':
            authorWorks.sort((a, b) => (b.ratings_average || 0) - (a.ratings_average || 0));
            break;
        case 'published':
        default:
            authorWorks.sort((a, b) => {
                const dateA = a.first_publish_date ? new Date(a.first_publish_date) : new Date(0);
                const dateB = b.first_publish_date ? new Date(b.first_publish_date) : new Date(0);
                return dateB - dateA;
            });
            break;
    }
}

// Display works with pagination
function displayWorks() {
    const worksContainer = document.getElementById('authorWorks');
    worksContainer.innerHTML = '';
    
    const itemsPerPage = 12;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageWorks = authorWorks.slice(start, end);
    
    if (pageWorks.length === 0) {
        worksContainer.innerHTML = '<p>No works found for this author.</p>';
        worksPagination.classList.add('hidden');
        return;
    }

    pageWorks.forEach(work => {
        worksContainer.appendChild(window.libraryUtils.createBookCard(work));
    });

    // Update pagination
    const totalPages = Math.ceil(authorWorks.length / itemsPerPage);
    worksPagination.classList.toggle('hidden', totalPages <= 1);
    worksPageSpan.textContent = `Page ${currentPage} of ${totalPages}`;
    prevWorksBtn.disabled = currentPage === 1;
    nextWorksBtn.disabled = currentPage === totalPages;
}

// Event listeners for pagination and sorting
prevWorksBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayWorks();
    }
});

nextWorksBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(authorWorks.length / 12);
    if (currentPage < totalPages) {
        currentPage++;
        displayWorks();
    }
});

sortWorksSelect.addEventListener('change', () => {
    currentSort = sortWorksSelect.value;
    currentPage = 1;
    sortWorks();
    displayWorks();
});

// UI state functions
function showLoading() {
    loading.classList.remove('hidden');
    authorContent.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError() {
    loading.classList.add('hidden');
    authorContent.classList.add('hidden');
    errorMessage.classList.remove('hidden');
}