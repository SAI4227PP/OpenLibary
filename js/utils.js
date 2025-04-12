// Library utility functions
window.libraryUtils = {
    showLoading() {
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        return spinner;
    },

    createBookCard(book) {
        const card = document.createElement('div');
        card.className = 'result-card';
        
        const coverContent = book.cover_i 
            ? `<img class="result-image" src="https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg" 
                alt="${this.escapeHtml(book.title)}" 
                onerror="this.replaceWith(document.createElement('div').appendChild(
                    document.createTextNode('No Cover')).parentElement.className='no-cover-placeholder')">`
            : `<div class="no-cover-placeholder">No Cover</div>`;

        card.innerHTML = `
            ${coverContent}
            <div class="result-info">
                <h3 class="result-title">${this.escapeHtml(book.title)}</h3>
                <p class="result-author">${this.escapeHtml(book.author_name?.[0] || 'Unknown Author')}</p>
                ${book.first_publish_year ? `<p class="result-year">${book.first_publish_year}</p>` : ''}
            </div>
        `;

        // Make the card clickable with proper works path
        card.addEventListener('click', () => {
            const workKey = book.key.startsWith('/works/') ? book.key : `/works/${book.key}`;
            window.location.href = `/pages/book.html?key=${encodeURIComponent(workKey)}`;
        });

        return card;
    },

    handleApiError(error) {
        console.error('API Error:', error);
        return {
            error: 'An error occurred while searching. Please try again.'
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
        const workKey = key.startsWith('/works/') ? key : `/works/${key}`;
        const response = await fetch(`${API_BASE_URL}${workKey}.json`);
        if (!response.ok) {
            throw new Error(`Book not found: ${response.status}`);
        }
        return response.json();
    },

    async getAuthorDetails(key) {
        const response = await fetch(`${API_BASE_URL}/authors/${key}.json`);
        return response.json();
    },

    async getSubjects(subject) {
        const response = await fetch(`${API_BASE_URL}/subjects/${subject}.json`);
        return response.json();
    },

    async searchBooks(query, page = 1) {
        const response = await fetch(
            `${API_BASE_URL}/search.json?q=${encodeURIComponent(query)}&page=${page}`
        );
        return response.json();
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