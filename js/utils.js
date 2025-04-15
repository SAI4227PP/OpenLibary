// Library utility functions
window.libraryUtils = {
    API_BASE_URL: 'https://openlibrary.org',
    COVERS_BASE_URL: 'https://covers.openlibrary.org/b',

    init() {
        return new Promise((resolve) => {
            // Check if the API is accessible
            fetch(this.API_BASE_URL + '/works/OL45804W.json')
                .then(response => response.json())
                .then(() => {
                    console.log('Library utilities initialized successfully');
                    resolve(true);
                })
                .catch(error => {
                    console.error('Error initializing library utilities:', error);
                    resolve(false);
                });
        });
    },

    showLoading() {
        const loader = document.createElement('div');
        loader.className = 'loading-spinner';
        return loader;
    },

    createBookCard(book) {
        const card = document.createElement('div');
        card.className = 'book-card';
        
        const coverUrl = book.cover_i 
            ? `${this.COVERS_BASE_URL}/id/${book.cover_i}-M.jpg`
            : '../images/default-cover.jpg';

        card.innerHTML = `
            <div class="book-cover">
                <img src="${coverUrl}" alt="${this.escapeHtml(book.title)}" 
                    onerror="this.src='../images/default-cover.jpg'">
            </div>
            <div class="book-info">
                <h3 class="book-title">${this.escapeHtml(book.title)}</h3>
                <p class="book-author">${this.escapeHtml(book.author_name?.[0] || 'Unknown Author')}</p>
                ${book.first_publish_year ? `<span class="book-year">${book.first_publish_year}</span>` : ''}
            </div>
        `;

        card.addEventListener('click', () => {
            const workKey = book.key.startsWith('/works/') ? book.key : `/works/${book.key}`;
            window.location.href = `/pages/book.html?key=${encodeURIComponent(workKey)}`;
        });

        return card;
    },

    handleApiError(error) {
        console.error('API Error:', error);
        return {
            error: error.message || 'An error occurred while searching. Please try again.'
        };
    },

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    // Favorites functionality
    isBookFavorite(bookKey) {
        const favorites = this.getFavorites();
        return favorites.some(book => book.key === bookKey);
    },

    toggleFavorite(book) {
        const favorites = this.getFavorites();
        const existingIndex = favorites.findIndex(b => b.key === book.key);
        
        if (existingIndex >= 0) {
            favorites.splice(existingIndex, 1);
        } else {
            favorites.push(book);
        }
        
        localStorage.setItem('favorites', JSON.stringify(favorites));
        return existingIndex < 0; // Returns true if added, false if removed
    },

    getFavorites() {
        try {
            return JSON.parse(localStorage.getItem('favorites') || '[]');
        } catch (e) {
            console.error('Error parsing favorites:', e);
            return [];
        }
    },

    // API related utilities
    async getBookDetails(key) {
        try {
            const workKey = key.startsWith('/works/') ? key : `/works/${key}`;
            const response = await fetch(`${this.API_BASE_URL}${workKey}.json`);
            if (!response.ok) {
                throw new Error(`Book not found: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            return this.handleApiError(error);
        }
    },

    async getAuthorDetails(key) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/authors/${key}.json`);
            if (!response.ok) {
                throw new Error(`Author not found: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            return this.handleApiError(error);
        }
    },

    async getSubjects(subject) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/subjects/${encodeURIComponent(subject)}.json`);
            if (!response.ok) {
                throw new Error(`Subject not found: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            return this.handleApiError(error);
        }
    },

    async searchBooks(query, page = 1) {
        try {
            const response = await fetch(
                `${this.API_BASE_URL}/search.json?q=${encodeURIComponent(query)}&page=${page}`
            );
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            return this.handleApiError(error);
        }
    },

    // Date formatting
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};

// Initialize library utilities when script loads
window.libraryUtils.init().then(success => {
    if (!success) {
        console.error('Failed to initialize library utilities');
        document.dispatchEvent(new CustomEvent('libraryUtilsError'));
    } else {
        document.dispatchEvent(new CustomEvent('libraryUtilsReady'));
    }
});