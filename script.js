// Google Apps Script endpoints
const SCRIPT_ID = 'AKfycbzkt3glLvLeT4b9PxZEmOBQdR9ZJLZZWPHJZVXCAQm5NBMvIxWjJuF07b3cl0eVPLgYhw';
const BASE_URL = `https://script.google.com/macros/s/${SCRIPT_ID}/exec`;

const API_ENDPOINTS = {
    getBooks: `${BASE_URL}?action=getBooks`,
    getCategories: `${BASE_URL}?action=getCategories`,
    getPassword: `${BASE_URL}?action=getPassword`,
    postAction: BASE_URL
};

// DOM Elements
const booksContainer = document.getElementById('booksContainer');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');

// Data storage
let books = [];
let categories = [];

// Fetch books from Google Sheets
async function fetchBooks() {
    try {
        const response = await fetch(API_ENDPOINTS.getBooks);
        const data = await response.json();
        books = Array.isArray(data) ? data : [];
        displayBooks(books);
    } catch (error) {
        console.error('Error fetching books:', error);
    }
}

// Fetch categories from Google Sheets
async function fetchCategories() {
    try {
        const response = await fetch(API_ENDPOINTS.getCategories);
        const data = await response.json();
        categories = Array.isArray(data) ? data : [];
        updateCategoryDropdowns();
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

// Display books in the grid
function displayBooks(booksToShow) {
    if (!booksContainer) return;
    
    booksContainer.innerHTML = '';
    booksToShow.forEach(book => {
        const bookCard = createBookCard(book);
        booksContainer.appendChild(bookCard);
    });
}

// Create a book card element
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    const isAdminPage = window.location.pathname.includes('admin.html');
    
    card.innerHTML = `
        <img src="${book.image || 'placeholder-image.jpg'}" alt="${book.name}" class="book-image"
             onerror="this.src='https://via.placeholder.com/200x300?text=No+Image'">
        <div class="book-info">
            <h3 class="book-title">${book.name}</h3>
            <p class="book-price">السعر: ${book.price}</p>
            <p class="book-quantity">الكمية: ${book.quantity}</p>
            ${book.category ? `<p class="book-category">التصنيف: ${book.category}</p>` : ''}
            ${isAdminPage ? `
                <div class="book-actions">
                    <button onclick="deleteBook('${book.id}')" class="delete-button">حذف</button>
                </div>
            ` : ''}
        </div>
    `;
    return card;
}

// Update category dropdowns
function updateCategoryDropdowns() {
    const dropdowns = [categoryFilter];
    if (document.getElementById('bookCategory')) {
        dropdowns.push(document.getElementById('bookCategory'));
    }

    dropdowns.forEach(dropdown => {
        if (!dropdown) return;
        
        dropdown.innerHTML = '<option value="">اختر التصنيف</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            dropdown.appendChild(option);
        });
    });
}

// Search and filter functionality
function filterBooks() {
    if (!searchInput || !categoryFilter) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;

    const filteredBooks = books.filter(book => {
        const matchesSearch = book.name.toLowerCase().includes(searchTerm);
        const matchesCategory = !selectedCategory || book.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    displayBooks(filteredBooks);
}

// Admin functionality
if (window.location.pathname.includes('admin.html')) {
    // Add new book
    document.getElementById('addBookForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const bookData = {
            name: formData.get('bookName'),
            price: formData.get('bookPrice'),
            quantity: formData.get('bookQuantity'),
            category: formData.get('bookCategory'),
            image: formData.get('bookImage') ? await uploadImage(formData.get('bookImage')) : ''
        };

        try {
            const response = await fetch(API_ENDPOINTS.postAction, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addBook',
                    book: bookData
                })
            });
            
            const result = await response.text();
            if (result === 'success') {
                alert('تم إضافة الكتاب بنجاح');
                e.target.reset();
                await fetchBooks();
            } else {
                throw new Error(result);
            }
        } catch (error) {
            console.error('Error adding book:', error);
            alert('حدث خطأ أثناء إضافة الكتاب');
        }
    });

    // Add new category
    document.getElementById('addCategoryForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const categoryName = document.getElementById('categoryName').value;
        
        try {
            const response = await fetch(API_ENDPOINTS.postAction, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addCategory',
                    category: { name: categoryName }
                })
            });
            
            const result = await response.text();
            if (result === 'success') {
                alert('تم إضافة التصنيف بنجاح');
                e.target.reset();
                await fetchCategories();
            } else {
                throw new Error(result);
            }
        } catch (error) {
            console.error('Error adding category:', error);
            alert('حدث خطأ أثناء إضافة التصنيف');
        }
    });

    // Delete book
    window.deleteBook = async function(bookId) {
        if (!confirm('هل أنت متأكد من حذف هذا الكتاب؟')) return;
        
        try {
            const response = await fetch(API_ENDPOINTS.postAction, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteBook',
                    bookId: bookId
                })
            });
            
            const result = await response.text();
            if (result === 'success') {
                alert('تم حذف الكتاب بنجاح');
                await fetchBooks();
            } else {
                throw new Error(result);
            }
        } catch (error) {
            console.error('Error deleting book:', error);
            alert('حدث خطأ أثناء حذف الكتاب');
        }
    };

    // Delete category
    window.deleteCategory = async function(categoryId) {
        if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;
        
        try {
            const response = await fetch(API_ENDPOINTS.postAction, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteCategory',
                    categoryId: categoryId
                })
            });
            
            const result = await response.text();
            if (result === 'success') {
                alert('تم حذف التصنيف بنجاح');
                await fetchCategories();
            } else {
                throw new Error(result);
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('حدث خطأ أثناء حذف التصنيف');
        }
    };

    // Change password
    document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        
        try {
            const response = await fetch(API_ENDPOINTS.postAction, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updatePassword',
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
            });
            
            const result = await response.text();
            if (result === 'success') {
                document.getElementById('passwordSuccessMessage').style.display = 'block';
                document.getElementById('passwordErrorMessage').style.display = 'none';
                e.target.reset();
            } else {
                document.getElementById('passwordErrorMessage').style.display = 'block';
                document.getElementById('passwordSuccessMessage').style.display = 'none';
            }
        } catch (error) {
            console.error('Error changing password:', error);
            document.getElementById('passwordErrorMessage').style.display = 'block';
            document.getElementById('passwordSuccessMessage').style.display = 'none';
        }
    });
}

// Initial load
if (booksContainer) {
    fetchBooks();
    fetchCategories();
}

if (searchInput && categoryFilter) {
    searchInput.addEventListener('input', filterBooks);
    categoryFilter.addEventListener('change', filterBooks);
}