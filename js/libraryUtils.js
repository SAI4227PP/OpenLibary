// Library utility functions
const libraryUtils = {
    API_BASE_URL: 'https://openlibrary.org',
    COVERS_BASE_URL: 'https://covers.openlibrary.org/b',

    async getSubjects(subject) {
        const response = await fetch(`${this.API_BASE_URL}/subjects/${encodeURIComponent(subject)}.json`);
        if (!response.ok) throw new Error('Failed to fetch subject data');
        return response.json();
    },

    createBookCard(book) {
        const card = document.createElement('div');
        card.className = 'book-card';
        
        const coverContent = book.cover_i 
            ? `<img src="${this.COVERS_BASE_URL}/id/${book.cover_i}-M.jpg" 
                   alt="${this.escapeHtml(book.title)}" 
                   onerror="this.parentNode.innerHTML='<div class=\'no-cover-placeholder\'>No Cover</div>'">`
            : '<div class="no-cover-placeholder">No Cover</div>';

        card.innerHTML = `
            <div class="book-cover">
                ${coverContent}
            </div>
            <div class="book-info">
                <h3 class="book-title">${this.escapeHtml(book.title)}</h3>
                <p class="book-author">${this.escapeHtml(book.author_name?.[0] || 'Unknown Author')}</p>
                ${book.first_publish_year ? `<span class="book-year">${book.first_publish_year}</span>` : ''}
            </div>
        `;

        card.addEventListener('click', () => {
            const workKey = book.key.startsWith('/works/') ? book.key : `/works/${book.key}`;
            const path = window.location.pathname.includes('/pages/') ? 'book.html' : 'pages/book.html';
            window.location.href = `${path}?key=${encodeURIComponent(workKey)}`;
        });

        return card;
    },

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

window.libraryUtils = libraryUtils;
