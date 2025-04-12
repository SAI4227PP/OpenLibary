// DOM Elements
const createListBtn = document.getElementById('createListBtn');
const createListModal = document.getElementById('createListModal');
const createListForm = document.getElementById('createListForm');
const closeModalBtn = document.querySelector('.close-modal');
const featuredListsContainer = document.getElementById('featuredLists');
const userListsContainer = document.getElementById('userLists');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');

// Featured lists data
const featuredLists = {
    'best-classics': {
        name: 'Best Classics',
        description: 'Essential classics everyone should read',
        books: [
            '/works/OL1234W', // Pride and Prejudice
            '/works/OL5678W', // Great Expectations
            '/works/OL9012W'  // The Great Gatsby
        ]
    },
    'science-picks': {
        name: 'Science Picks',
        description: 'Top science books for curious minds',
        books: [
            '/works/OL3456W', // A Brief History of Time
            '/works/OL7890W', // The Origin of Species
            '/works/OL1234W'  // Cosmos
        ]
    },
    'must-read-fantasy': {
        name: 'Must-Read Fantasy',
        description: 'Epic fantasy adventures',
        books: [
            '/works/OL5678W', // The Lord of the Rings
            '/works/OL9012W', // The Name of the Wind
            '/works/OL3456W'  // A Game of Thrones
        ]
    }
};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedLists();
    loadUserLists();
});

// Load featured lists
async function loadFeaturedLists() {
    const listCards = document.querySelectorAll('.list-card');
    
    for (const card of listCards) {
        const listTitle = card.querySelector('h3').textContent;
        const list = Object.values(featuredLists).find(l => l.name === listTitle);
        
        if (list) {
            try {
                let bookCount = 0;
                for (const bookKey of list.books) {
                    const bookData = await window.libraryUtils.getBookDetails(bookKey);
                    if (bookData) bookCount++;
                }
                card.querySelector('.book-count').textContent = `${bookCount} books`;
            } catch (error) {
                console.error('Error loading list:', error);
                card.querySelector('.book-count').textContent = 'Error loading count';
            }
        }
    }
}

// Load user lists
function loadUserLists() {
    const user = checkAuth();
    if (!user) return;

    // Get user lists from localStorage
    const lists = getUserLists();
    
    if (lists.length === 0) {
        userListsContainer.innerHTML = '<p>You haven\'t created any lists yet.</p>';
        return;
    }

    const listsHTML = lists.map(list => `
        <div class="list-card">
            <div class="list-content">
                <h3 class="list-title">${list.name}</h3>
                <p class="list-description">${list.description}</p>
                <div class="list-meta">
                    <div class="book-count">${list.books.length} books</div>
                    <div class="created-by">Created by ${user.email}</div>
                    <div class="last-updated">Updated ${new Date(list.created).toLocaleDateString()}</div>
                    ${list.private ? '<div class="private-badge">Private</div>' : ''}
                    <div class="list-actions">
                        <button onclick="viewList('${list.id}')" class="btn-secondary">View</button>
                        <button onclick="deleteList('${list.id}')" class="btn-danger">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    userListsContainer.innerHTML = listsHTML;
}

// Create new list
function createList(name, description, isPrivate) {
    const user = checkAuth();
    if (!user) return null;

    const lists = getUserLists();
    
    const newList = {
        id: Date.now().toString(),
        name,
        description,
        private: isPrivate,
        books: [],
        created: new Date().toISOString(),
        userId: user.email
    };

    lists.push(newList);
    localStorage.setItem('userLists', JSON.stringify(lists));
    
    return newList;
}

// Delete list
function deleteList(listId) {
    const user = checkAuth();
    if (!user) return;

    const lists = getUserLists();
    const updatedLists = lists.filter(list => list.id !== listId);
    
    localStorage.setItem('userLists', JSON.stringify(updatedLists));
    loadUserLists();
}

// View list
function viewList(listId) {
    const lists = getUserLists();
    const list = lists.find(l => l.id === listId);
    
    if (!list) return;

    // In a real app, this would navigate to a list detail page
    // For now, we'll just log the list details
    console.log('List details:', list);
}

// Get user lists from localStorage
function getUserLists() {
    const lists = localStorage.getItem('userLists');
    return lists ? JSON.parse(lists) : [];
}

// Modal handling
createListBtn.addEventListener('click', () => {
    createListModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    createListModal.classList.add('hidden');
});

createListForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('listName').value;
    const description = document.getElementById('listDescription').value;
    const isPrivate = document.getElementById('listPrivate').checked;

    const newList = createList(name, description, isPrivate);
    
    if (newList) {
        createListModal.classList.add('hidden');
        createListForm.reset();
        loadUserLists();
    }
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === createListModal) {
        createListModal.classList.add('hidden');
    }
});

// Featured list click handling
featuredListsContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.list-card');
    if (!card) return;

    const listTitle = card.querySelector('h3').textContent;
    const list = Object.values(featuredLists).find(l => l.name === listTitle);
    
    if (list) {
        // In a real app, this would navigate to a list detail page
        console.log('Featured list details:', list);
    }
});