// DOM Elements
const bookContent = document.getElementById('bookContent');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const favoriteBtn = document.getElementById('favoriteBtn');
const fullTextSection = document.getElementById('fullTextSection');
const textSearchInput = document.getElementById('textSearchInput');
const textSearchButton = document.getElementById('textSearchButton');
const textSearchResults = document.getElementById('textSearchResults');

// Add new DOM elements
const readBtn = document.getElementById('readBtn');
const previewOverlay = document.getElementById('previewOverlay');
const previewFrame = document.getElementById('previewFrame');
const previewTitle = document.getElementById('previewTitle');
const previewClose = document.getElementById('previewClose');

// Add Read API constants
const READ_API_BASE_URL = 'http://openlibrary.org/api/volumes/brief';

// Initialize all DOM elements with error handling
const domElements = {
    bookTitle: document.getElementById('bookTitle'),
    bookCover: document.getElementById('bookCover'),
    bookAuthors: document.getElementById('bookAuthors'),
    bookDescription: document.getElementById('bookDescription'),
    bookSubjects: document.getElementById('bookSubjects'),
    bookPublishers: document.getElementById('bookPublishers'),
    bookISBNs: document.getElementById('bookISBNs'),
    bookLinks: document.getElementById('bookLinks'),
    bookEditions: document.getElementById('bookEditions'),
    firstPublished: document.getElementById('firstPublished'),
    latestRevision: document.getElementById('latestRevision'),
    revision: document.getElementById('revision'),
    created: document.getElementById('created'),
    lastModified: document.getElementById('lastModified')
};

// Validate required DOM elements
function validateDOMElements() {
    const missingElements = Object.entries(domElements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Missing DOM elements:', missingElements);
        throw new Error(`Required DOM elements not found: ${missingElements.join(', ')}`);
    }
}

// Book state
let currentBook = null;
let currentBookKey = null;
let readApiData = null;

// Initialize book details page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        validateDOMElements();
        
        const params = new URLSearchParams(window.location.search);
        const bookKey = params.get('key');
        
        if (!bookKey) {
            showError();
            return;
        }

        currentBookKey = bookKey;
        await loadBookDetails(bookKey);
    } catch (error) {
        console.error('Initialization error:', error);
        showError();
    }
});

// Load book details
async function loadBookDetails(bookKey) {
    try {
        showLoading();
        
        // Ensure the key is in the correct format
        const workKey = bookKey.startsWith('/works/') ? bookKey : `/works/${bookKey}`;
        
        // Fetch book details and handle response status
        const workResponse = await fetch(`${API_BASE_URL}${workKey}.json`);
        if (!workResponse.ok) {
            throw new Error(`Book not found: ${workResponse.status}`);
        }
        
        // Fetch book details from multiple endpoints in parallel
        const [workData, ratingsData, viewsData] = await Promise.all([
            workResponse.json(),
            fetch(`${API_BASE_URL}${workKey}/ratings.json`).then(res => res.json()).catch(() => null),
            fetch(`${API_BASE_URL}${workKey}/bookshelves.json`).then(res => res.json()).catch(() => null)
        ]);

        // Add Read API check using ISBN if available
        let readApiResponse = null;
        if (workData.identifiers?.isbn_13?.[0]) {
            readApiResponse = await fetch(`${READ_API_BASE_URL}/isbn/${workData.identifiers.isbn_13[0]}.json`)
                .then(res => res.json())
                .catch(() => null);
        } else if (workData.identifiers?.isbn_10?.[0]) {
            readApiResponse = await fetch(`${READ_API_BASE_URL}/isbn/${workData.identifiers.isbn_10[0]}.json`)
                .then(res => res.json())
                .catch(() => null);
        }

        // Store Read API data
        readApiData = readApiResponse;

        // Merge all data
        currentBook = {
            ...workData,
            ratings: ratingsData,
            bookshelves: viewsData,
            readingInfo: readApiResponse?.items?.[0] || null,
            averageRating: ratingsData?.summary?.average || 0,
            ratingsCount: ratingsData?.summary?.count || 0,
            readingCount: viewsData?.counts?.want_to_read || 0,
            currentlyReading: viewsData?.counts?.currently_reading || 0
        };
        
        // Update UI with enhanced book details
        updateBookUI(currentBook);
        
        // Check if full text is available and load preview data 
        if (currentBook.has_fulltext) {
            fullTextSection.classList.remove('hidden');
            try {
                const previewData = await fetch(`${API_BASE_URL}${workKey}/preview.json`).then(res => res.json());
                if (previewData.preview_url) {
                    const previewButton = document.createElement('a');
                    previewButton.href = previewData.preview_url;
                    previewButton.target = '_blank';
                    previewButton.className = 'preview-btn';
                    previewButton.textContent = 'Read Preview';
                    document.querySelector('.book-info').appendChild(previewButton);
                }
            } catch (previewError) {
                console.warn('Preview data not available:', previewError);
            }
        }
        
        // Load editions with pagination
        await loadBookEditions(workKey);
        
        // Load related books
        await loadRelatedBooks(workKey);
        
        // Initialize reading features with the book data
        await initializeReadingFeatures(currentBook);
        
        hideLoading();
        bookContent.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading book details:', error);
        showError();
    }
}

// Update book UI with safe element access
function updateBookUI(book) {
    try {
        if (!book) throw new Error('No book data provided');

        // Update title and metadata with safe access
        domElements.bookTitle.textContent = book.title || 'Unknown Title';
        document.title = `${book.title || 'Unknown Title'} - Open Library`;

        // Update cover image
        const coverId = book.covers?.[0];
        if (coverId && domElements.bookCover) {
            const coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
            domElements.bookCover.src = coverUrl;
            domElements.bookCover.onerror = () => {
                domElements.bookCover.replaceWith(createNoCoverPlaceholder());
            };
        } else if (domElements.bookCover) {
            domElements.bookCover.replaceWith(createNoCoverPlaceholder());
        }

        // Update authors with links, roles and additional info
        if (book.authors && domElements.bookAuthors) {
            const authors = book.authors.map(author => {
                const authorName = author.name || 'Unknown Author';
                const role = author.role ? ` (${author.role})` : '';
                const authorType = author.type?.key ? ` - ${author.type.key.split('/').pop()}` : '';
                return `<a href="author.html?key=${encodeURIComponent(author.author.key)}">${authorName}</a>${role}${authorType}`;
            });
            domElements.bookAuthors.innerHTML = authors.join(', ');
        }

        // Update metadata details
        if (book.first_publish_date) {
            domElements.firstPublished.textContent = book.first_publish_date;
        }
        if (book.latest_revision) {
            domElements.latestRevision.textContent = book.latest_revision;
        }
        if (book.revision) {
            domElements.revision.textContent = book.revision;
        }
        if (book.created) {
            domElements.created.textContent = new Date(book.created.value).toLocaleDateString();
        }
        if (book.last_modified) {
            domElements.lastModified.textContent = new Date(book.last_modified.value).toLocaleDateString();
        }

        // Update subjects
        if (domElements.bookSubjects) {
            if (book.subjects && book.subjects.length > 0) {
                const subjectsHTML = book.subjects.map(subject => 
                    `<a href="subjects.html?subject=${encodeURIComponent(subject)}" class="tag">${subject}</a>`
                ).join('');
                domElements.bookSubjects.innerHTML = subjectsHTML;
            } else {
                domElements.bookSubjects.innerHTML = 'No subjects available';
            }
        }

        // Update publishers
        if (domElements.bookPublishers) {
            if (book.publishers && book.publishers.length > 0) {
                domElements.bookPublishers.innerHTML = book.publishers.join(', ');
            } else {
                domElements.bookPublishers.innerHTML = 'Publisher unknown';
            }
        }

        // Update ISBNs
        if (domElements.bookISBNs) {
            if (book.isbn_13 || book.isbn_10) {
                const isbns = [];
                if (book.isbn_13) isbns.push(...book.isbn_13.map(isbn => `ISBN-13: ${isbn}`));
                if (book.isbn_10) isbns.push(...book.isbn_10.map(isbn => `ISBN-10: ${isbn}`));
                domElements.bookISBNs.innerHTML = isbns.join('<br>');
            } else {
                domElements.bookISBNs.innerHTML = 'No ISBN available';
            }
        }

        // Update description with safe markdown parsing
        if (domElements.bookDescription) {
            const description = domElements.bookDescription;
            if (book.description) {
                const descText = typeof book.description === 'object' ? 
                    book.description.value : book.description;
                
                try {
                    if (typeof marked === 'function') {
                        description.innerHTML = marked(descText);
                    } else {
                        description.innerHTML = `<p>${descText}</p>`;
                    }
                } catch (e) {
                    description.innerHTML = `<p>${descText}</p>`;
                }
            } else {
                description.innerHTML = '<p>No description available.</p>';
            }
        }

        // Update ratings and stats
        if (book.ratings || book.averageRating > 0) {
            const rating = book.averageRating;
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 >= 0.5;
            
            const starsHTML = '★'.repeat(fullStars) + 
                             (hasHalfStar ? '½' : '') +
                             '☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0));

            const ratingDisplay = document.querySelector('.rating-display');
            if (ratingDisplay) {
                ratingDisplay.querySelector('.stars').innerHTML = starsHTML;
                ratingDisplay.querySelector('.rating-number').textContent = rating.toFixed(1);
            }

            const stats = document.querySelector('.stats');
            if (stats) {
                stats.querySelector('.rating-count').textContent = `${book.ratingsCount.toLocaleString()} ratings`;
                stats.querySelector('.currently-reading').textContent = 
                    `${book.currentlyReading.toLocaleString()} currently reading`;
                stats.querySelector('.want-to-read').textContent = 
                    `${book.readingCount.toLocaleString()} want to read`;
            }
        }

        // Update links section
        if (domElements.bookLinks) {
            const linksContainer = domElements.bookLinks;
            const links = [];
            if (book.links && book.links.length > 0) {
                links.push(...book.links.map(link => ({
                    url: link.url,
                    title: link.title || 'External Link'
                })));
            }
            if (book.ebooks && book.ebooks.length > 0) {
                links.push(...book.ebooks.map(ebook => ({
                    url: ebook.preview_url,
                    title: 'Read Online'
                })));
            }

            if (links.length > 0) {
                linksContainer.innerHTML = `
                    <h3>External Links</h3>
                    <ul class="external-links">
                        ${links.map(link => `
                            <li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.title}</a></li>
                        `).join('')}
                    </ul>
                `;
            }
        }

        // Update favorite button
        updateFavoriteButton();
    } catch (error) {
        console.error('Error updating book UI:', error);
        showError();
    }
}

// Initialize reading functionality
async function initializeReadingFeatures(book) {
    if (!book) return;

    const readBtn = document.getElementById('readBtn');
    
    if (book.readingInfo) {
        const { status, itemURL } = book.readingInfo;
        readBtn.classList.remove('disabled');
        
        switch (status) {
            case 'full access':
                readBtn.textContent = 'Read Online';
                readBtn.addEventListener('click', () => openReader(book, itemURL));
                break;
            case 'lendable':
                readBtn.textContent = 'Borrow Book';
                readBtn.addEventListener('click', () => window.location.href = itemURL);
                break;
            case 'checked out':
                disableReading('Book is currently checked out');
                readBtn.textContent = 'Checked Out';
                break;
            case 'restricted':
                disableReading('Access restricted');
                readBtn.textContent = 'Not Available';
                break;
            default:
                disableReading('Preview not available');
        }
    } else {
        disableReading('Not available for online reading');
        readBtn.textContent = 'Not Available';
    }
}

function openReader(book, readUrl) {
    if (!readUrl) {
        console.error('No reading URL available');
        return;
    }

    previewTitle.textContent = book.title;
    previewFrame.src = readUrl;
    previewOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeReader() {
    previewOverlay.classList.remove('active');
    previewFrame.src = '';
    document.body.style.overflow = '';
}

function disableReading(message) {
    const readBtn = document.getElementById('readBtn');
    readBtn.classList.add('disabled');
    readBtn.title = message;
}

// Close preview when clicking the close button or outside the preview
previewClose.addEventListener('click', closeReader);
previewOverlay.addEventListener('click', (e) => {
    if (e.target === previewOverlay) {
        closeReader();
    }
});

// Handle escape key to close preview
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && previewOverlay.classList.contains('active')) {
        closeReader();
    }
});

// Load book editions
async function loadBookEditions(bookKey) {
    try {
        const editionsUrl = `${API_BASE_URL}${bookKey}/editions.json`;
        const response = await fetch(editionsUrl);
        const data = await response.json();
        
        const editionsContainer = domElements.bookEditions;
        if (data.entries && data.entries.length > 0) {
            // Update the heading to include the count
            document.querySelector('.book-editions .section-header h2').textContent = 
                `Available Editions (${data.entries.length})`;

            // Show only first 8 editions initially (same as related section)
            const editionsHTML = data.entries.slice(0, 7).map(edition => {
                const coverId = edition.covers?.[0];
                const coverUrl = coverId 
                    ? `${COVERS_BASE_URL}/id/${coverId}-M.jpg`
                    : '../images/no-cover.png';
                
                return `
                    <div class="edition-card" onclick="window.location.href='editions.html?key=${encodeURIComponent(bookKey)}'">
                        <img src="${coverUrl}" 
                             alt="${edition.title}" 
                             loading="lazy"
                             onerror="this.src='../images/no-cover.png'"
                             class="edition-cover">
                        <div class="edition-info">
                            <h3>${edition.title}</h3>
                            <p class="publish-date">${edition.publish_date || 'Publication date unknown'}</p>
                            <p class="publisher">${edition.publishers?.[0] || 'Publisher unknown'}</p>
                            ${edition.number_of_pages ? `<p class="pages">${edition.number_of_pages} pages</p>` : ''}
                            ${edition.languages?.[0]?.key ? 
                                `<p class="language">Language: ${edition.languages[0].key.split('/').pop()}</p>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            editionsContainer.innerHTML = editionsHTML;

            // Show View All link only if there are more than 8 editions
            const viewAllLink = document.querySelector('.book-editions .view-all');
            viewAllLink.style.display = data.entries.length > 8 ? 'block' : 'none';
        } else {
            document.querySelector('.book-editions .section-header h2').textContent = 'Available Editions (0)';
            editionsContainer.innerHTML = '<p>No other editions available.</p>';
            // Hide View All link if there are no editions
            document.querySelector('.book-editions .view-all').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading editions:', error);
        domElements.bookEditions.innerHTML = 
            '<p>Error loading editions. Please try again later.</p>';
    }
}

// Add event listener for View All editions
document.querySelector('.book-editions .view-all').addEventListener('click', async (e) => {
    e.preventDefault();
    const viewAllLink = e.target;
    const editionsContainer = domElements.bookEditions;

    if (viewAllLink.textContent === 'View All') {
        try {
            const editionsUrl = `${API_BASE_URL}${currentBookKey}/editions.json`;
            const response = await fetch(editionsUrl);
            const data = await response.json();
            
            if (data.entries && data.entries.length > 0) {
                const editionsHTML = data.entries.map(edition => {
                    const coverId = edition.covers?.[0];
                    const coverContent = coverId 
                        ? `<img src="${COVERS_BASE_URL}/id/${coverId}-M.jpg" alt="${edition.title}" loading="lazy">`
                        : `<div class="no-cover-placeholder">No Cover</div>`;
                    
                    return `
                        <div class="edition-card">
                            ${coverContent}
                            <div class="edition-info">
                                <h3>${edition.title}</h3>
                                <p class="publish-date">${edition.publish_date || 'Publication date unknown'}</p>
                                <p class="publisher">${edition.publishers?.[0] || 'Publisher unknown'}</p>
                                ${edition.number_of_pages ? `<p class="pages">${edition.number_of_pages} pages</p>` : ''}
                                ${edition.languages?.[0]?.key ? 
                                    `<p class="language">Language: ${edition.languages[0].key.split('/').pop()}</p>` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
                
                editionsContainer.innerHTML = editionsHTML;
                viewAllLink.textContent = 'View Less';
            }
        } catch (error) {
            console.error('Error loading all editions:', error);
        }
    } else {
        // Show only first 6 editions when "View Less" is clicked
        const editionsUrl = `${API_BASE_URL}${currentBookKey}/editions.json`;
        const response = await fetch(editionsUrl);
        const data = await response.json();
        
        if (data.entries && data.entries.length > 0) {
            const editionsHTML = data.entries.slice(0, 7).map(edition => {
                const coverId = edition.covers?.[0];
                const coverContent = coverId 
                    ? `<img src="${COVERS_BASE_URL}/id/${coverId}-M.jpg" alt="${edition.title}" loading="lazy">`
                    : `<div class="no-cover-placeholder">No Cover</div>`;
                
                return `
                    <div class="edition-card">
                        ${coverContent}
                        <div class="edition-info">
                            <h3>${edition.title}</h3>
                            <p class="publish-date">${edition.publish_date || 'Publication date unknown'}</p>
                            <p class="publisher">${edition.publishers?.[0] || 'Publisher unknown'}</p>
                            ${edition.number_of_pages ? `<p class="pages">${edition.number_of_pages} pages</p>` : ''}
                            ${edition.languages?.[0]?.key ? 
                                `<p class="language">Language: ${edition.languages[0].key.split('/').pop()}</p>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            editionsContainer.innerHTML = editionsHTML;
            viewAllLink.textContent = 'View All';
        }
    }
});

// Load related books based on subjects and authors
async function loadRelatedBooks(bookKey) {
    try {
        if (!currentBook.subjects || currentBook.subjects.length === 0) return;

        // Find the first valid subject that can be used for the API call
        const validSubject = currentBook.subjects.find(subject => 
            subject.replace(/[^\w\s-]/g, '')
                  .toLowerCase()
                  .replace(/\s+/g, '_')
        );

        if (!validSubject) return;

        // Properly encode the subject for the URL
        const subjectParam = validSubject
            .replace(/[^\w\s-]/g, '')
            .toLowerCase()
            .replace(/\s+/g, '_');

        const searchUrl = `${API_BASE_URL}/search.json?q=subject:${subjectParam}`;
        const response = await fetch(searchUrl);

        if (!response.ok) {
            throw new Error(`Failed to load related books: ${response.status}`);
        }

        const data = await response.json();

        if (data.docs && data.docs.length > 0) {
            const relatedSection = document.createElement('section');
            relatedSection.className = 'related-books';
            relatedSection.innerHTML = `
                <div class="section-header">
                    <h2>Related Books</h2>
                    <a href="#" class="view-all">View All</a>
                </div>
                <div class="related-grid">
                    ${data.docs.slice(0, 8).map(book => {
                        const coverUrl = book.cover_i ? 
                            `${COVERS_BASE_URL}/id/${book.cover_i}-M.jpg` : 
                            '../images/no-cover.png';
                        const bookKey = book.key.startsWith('/works/') ? book.key : `/works/${book.key}`;
                        return `
                            <div class="related-book" onclick="window.location.href='book.html?key=${encodeURIComponent(bookKey)}'">
                                <img src="${coverUrl}" alt="${book.title}" loading="lazy"
                                     onerror="this.src='../images/no-cover.png'">
                                <h3>${book.title}</h3>
                                <p class="author">${book.author_name?.[0] || 'Unknown Author'}</p>
                                <p class="publish-year">Year: ${book.first_publish_year || 'Unknown'}</p>
                                <p class="language">Language: ${book.language?.[0] || 'Unknown'}</p>
                                ${book.subject ? `<p class="subjects">Subjects: ${book.subject.slice(0, 3).join(', ')}</p>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Show View All link only if there are more than 6 books
            const viewAllLink = relatedSection.querySelector('.view-all');
            viewAllLink.style.display = data.docs.length > 8 ? 'block' : 'none';

            // Add click handler for View All
            viewAllLink.addEventListener('click', (e) => {
                e.preventDefault();
                const relatedGrid = relatedSection.querySelector('.related-grid');

                if (e.target.textContent === 'View All') {
                    relatedGrid.innerHTML = data.docs.map(book => {
                        const coverUrl = book.cover_i ? 
                            `${COVERS_BASE_URL}/id/${book.cover_i}-M.jpg` : 
                            '../images/no-cover.png';
                        const bookKey = book.key.startsWith('/works/') ? book.key : `/works/${book.key}`;
                        return `
                            <div class="related-book" onclick="window.location.href='book.html?key=${encodeURIComponent(bookKey)}'">
                                <img src="${coverUrl}" alt="${book.title}" loading="lazy"
                                     onerror="this.src='../images/no-cover.png'">
                                <h3>${book.title}</h3>
                                <p class="author">${book.author_name?.[0] || 'Unknown Author'}</p>
                                <p class="publish-year">Year: ${book.first_publish_year || 'Unknown'}</p>
                                <p class="language">Language: ${book.language?.[0] || 'Unknown'}</p>
                                ${book.subject ? `<p class="subjects">Subjects: ${book.subject.slice(0, 3).join(', ')}</p>` : ''}
                            </div>
                        `;
                    }).join('');
                    e.target.textContent = 'View Less';
                } else {
                    relatedGrid.innerHTML = data.docs.slice(0, 8).map(book => {
                        const coverUrl = book.cover_i ? 
                            `${COVERS_BASE_URL}/id/${book.cover_i}-M.jpg` : 
                            '../images/no-cover.png';
                        const bookKey = book.key.startsWith('/works/') ? book.key : `/works/${book.key}`;
                        return `
                            <div class="related-book" onclick="window.location.href='book.html?key=${encodeURIComponent(bookKey)}'">
                                <img src="${coverUrl}" alt="${book.title}" loading="lazy"
                                     onerror="this.src='../images/no-cover.png'">
                                <h3>${book.title}</h3>
                                <p class="author">${book.author_name?.[0] || 'Unknown Author'}</p>
                                <p class="publish-year">Year: ${book.first_publish_year || 'Unknown'}</p>
                                <p class="language">Language: ${book.language?.[0] || 'Unknown'}</p>
                                ${book.subject ? `<p class="subjects">Subjects: ${book.subject.slice(0, 3).join(', ')}</p>` : ''}
                            </div>
                        `;
                    }).join('');
                    e.target.textContent = 'View All';
                }
            });

            document.querySelector('.book-details').appendChild(relatedSection);
        }
    } catch (error) {
        console.warn('Error loading related books:', error);
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

// Add this function at the end of the file
function toggleSubjects(type) {
    const group = document.querySelector(`.subject-group[data-type="${type}"]`);
    const btn = group.querySelector('.show-more-btn');
    const hiddenTags = group.querySelectorAll('.tag.hidden');
    
    if (hiddenTags[0]?.classList.contains('hidden')) {
        hiddenTags.forEach(tag => tag.classList.remove('hidden'));
        btn.textContent = 'Show Less';
    } else {
        hiddenTags.forEach(tag => tag.classList.add('hidden'));
        btn.textContent = 'Show More';
    }
}