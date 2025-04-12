// DOM Elements
const bookContent = document.getElementById('bookContent');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const favoriteBtn = document.getElementById('favoriteBtn');
const fullTextSection = document.getElementById('fullTextSection');
const textSearchInput = document.getElementById('textSearchInput');
const textSearchButton = document.getElementById('textSearchButton');
const textSearchResults = document.getElementById('textSearchResults');

// Initialize all DOM elements with error handling
const domElements = {
    bookTitle: document.getElementById('bookTitle'),
    bookCover: document.getElementById('bookCover'),
    bookAuthors: document.getElementById('bookAuthors'),
    bookDescription: document.getElementById('bookDescription'),
    bookMetadata: document.getElementById('bookMetadata'),
    bookSubjects: document.getElementById('bookSubjects'),
    bookPublishers: document.getElementById('bookPublishers'),
    bookISBNs: document.getElementById('bookISBNs'),
    bookLinks: document.getElementById('bookLinks'),
    bookEditions: document.getElementById('bookEditions')
    // Removed debug-related elements
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

        // Merge all data
        currentBook = {
            ...workData,
            ratings: ratingsData,
            bookshelves: viewsData,
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

        // Create detailed metadata section
        if (domElements.bookMetadata) {
            const metadataHTML = `
                <div class="book-metadata">
                    ${book.first_publish_date ? `<div class="metadata-item">
                        <span class="label">First Published:</span> ${book.first_publish_date}
                    </div>` : ''}
                    
                    ${book.latest_revision ? `<div class="metadata-item">
                        <span class="label">Latest Revision:</span> ${book.latest_revision}
                    </div>` : ''}
                    
                    ${book.revision ? `<div class="metadata-item">
                        <span class="label">Revision:</span> ${book.revision}
                    </div>` : ''}
                    
                    ${book.created ? `<div class="metadata-item">
                        <span class="label">Created:</span> ${new Date(book.created.value).toLocaleDateString()}
                    </div>` : ''}
                    
                    ${book.last_modified ? `<div class="metadata-item">
                        <span class="label">Last Modified:</span> ${new Date(book.last_modified.value).toLocaleDateString()}
                    </div>` : ''}

                    ${book.genres ? `<div class="metadata-item">
                        <span class="label">Genres:</span> ${book.genres.join(', ')}
                    </div>` : ''}

                    ${book.original_languages ? `<div class="metadata-item">
                        <span class="label">Original Languages:</span> 
                        ${book.original_languages.map(lang => lang.key.split('/').pop()).join(', ')}
                    </div>` : ''}

                    ${book.series ? `<div class="metadata-item">
                        <span class="label">Series:</span> ${book.series.join(', ')}
                    </div>` : ''}

                    ${book.dewey_decimal_class ? `<div class="metadata-item">
                        <span class="label">Dewey Decimal:</span> ${book.dewey_decimal_class.join(', ')}
                    </div>` : ''}

                    ${book.lc_classifications ? `<div class="metadata-item">
                        <span class="label">LC Classification:</span> ${book.lc_classifications.join(', ')}
                    </div>` : ''}

                    ${book.contributions ? `<div class="metadata-item">
                        <span class="label">Contributors:</span> ${book.contributions.join(', ')}
                    </div>` : ''}
                </div>
            `;
            domElements.bookMetadata.innerHTML = metadataHTML;
        }

        // Update description with safe markdown parsing and full text
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

        // Update subjects with categories and full lists
        if (domElements.bookSubjects) {
            const subjectsContainer = domElements.bookSubjects;
            if (book.subjects && book.subjects.length > 0) {
                const subjectsByType = {
                    Subjects: book.subjects || [],
                    Places: book.subject_places || [],
                    People: book.subject_people || [],
                    Times: book.subject_times || [],
                    'Original Languages': book.original_languages?.map(lang => lang.key.split('/').pop()) || [],
                    'Work Titles': book.work_titles || []
                };

                const subjectHTML = Object.entries(subjectsByType)
                    .filter(([_, items]) => items.length > 0)
                    .map(([type, items]) => `
                        <div class="subject-section">
                            <h4>${type}</h4>
                            <div class="tags">
                                ${items.map(item => `
                                    <a href="subjects.html?subject=${encodeURIComponent(item)}" 
                                       class="tag" title="Browse books about ${item}">
                                        ${item}
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    `).join('');
                
                subjectsContainer.innerHTML = subjectHTML;
            } else {
                subjectsContainer.innerHTML = '<p>No subjects available.</p>';
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

        // Update ratings and stats
        if (book.ratings || book.averageRating > 0) {
            const ratingHTML = `
                <div class="rating-info">
                    <div class="average-rating">
                        <span class="stars">${'★'.repeat(Math.round(book.averageRating))}</span>
                        <span class="rating-number">${book.averageRating.toFixed(1)}</span>
                    </div>
                    <div class="rating-details">
                        <div class="rating-count">${book.ratingsCount} ratings</div>
                        <div class="reading-stats">
                            <div>${book.currentlyReading} currently reading</div>
                            <div>${book.readingCount} want to read</div>
                        </div>
                    </div>
                </div>
            `;
            document.querySelector('.book-info').insertAdjacentHTML('beforeend', ratingHTML);
        }

        // Update favorite button
        updateFavoriteButton();
    } catch (error) {
        console.error('Error updating book UI:', error);
        showError();
    }
}

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

            // Show only first 6 editions initially
            const editionsHTML = data.entries.slice(0, 7).map(edition => {
                const coverId = edition.covers?.[0];
                const coverContent = coverId 
                    ? `<img src="${COVERS_BASE_URL}/id/${coverId}-M.jpg" alt="${edition.title}" 
                        loading="lazy"
                        onerror="this.replaceWith(document.createElement('div').appendChild(
                            document.createTextNode('No Cover')).parentElement.className='no-cover-placeholder')">`
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

            // Show View All link only if there are more than 6 editions
            const viewAllLink = document.querySelector('.book-editions .view-all');
            viewAllLink.style.display = data.entries.length > 7 ? 'block' : 'none';
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