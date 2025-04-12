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
        
        const coverUrl = book.cover_i 
            ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
            : '../images/no-cover.png';

        card.innerHTML = `
            <img class="result-image" src="${coverUrl}" alt="${this.escapeHtml(book.title)}" 
                onerror="this.src='../images/no-cover.png'">
            <div class="result-info">
                <h3 class="result-title">${this.escapeHtml(book.title)}</h3>
                <p class="result-author">${this.escapeHtml(book.author_name?.[0] || 'Unknown Author')}</p>
                ${book.first_publish_year ? `<p class="result-year">${book.first_publish_year}</p>` : ''}
            </div>
        `;

        // Make the card clickable
        card.addEventListener('click', () => {
            const workId = book.key.split('/').pop();
            window.location.href = `/pages/book.html?id=${workId}`;
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
    }
};