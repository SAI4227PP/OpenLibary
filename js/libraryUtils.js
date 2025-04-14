const libraryUtils = {
    API_BASE_URL: 'https://openlibrary.org',

    async getSubjects(subject) {
        const response = await fetch(`${this.API_BASE_URL}/subjects/${encodeURIComponent(subject)}.json`);
        if (!response.ok) throw new Error('Failed to fetch subject data');
        return response.json();
    },

    createBookCard(book) {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
            <img src="https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg" alt="${book.title}" onerror="this.src='../images/default-cover.jpg'">
            <h3>${book.title}</h3>
            <p>${book.authors?.[0]?.name || 'Unknown author'}</p>
        `;
        return card;
    }
};

window.libraryUtils = libraryUtils;
