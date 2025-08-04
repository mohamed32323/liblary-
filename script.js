// Replace with your actual SheetDB API endpoint
const SHEET_API_URL = 'YOUR_SHEETDB_API_URL';

// DOM Elements
const booksContainer = document.getElementById('booksContainer');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');

// Admin page elements
const addBookForm = document.getElementById('addBookForm');
const addCategoryForm = document.getElementById('addCategoryForm');
const categoriesList = document.getElementById('categoriesList');
const booksList = document.getElementById('booksList');

// Data storage
let books = [];
let categories = [];

// Fetch books from Google Sheets
async function fetchBooks() {
    try {
        const response = await fetch(SHEET_API_URL);
        const data = await response.json();
        books = data;
        displayBooks(books);
    } catch (error) {
        console.error('Error fetching books:', error);
    }
}

// Fetch categories from Google Sheets
async function fetchCategories() {
    try {
        const response = await fetch(`${SHEET_API_URL}/categories`);
        const data = await response.json();
        categories = data;
        updateCategoryDropdowns();
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

// Display books in the grid
function displayBooks(booksToShow) {
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
    card.innerHTML = `
        <img src="${book.image}" alt="${book.name}" class="book-image">
        <div class="book-info">
            <h3 class="book-title">${book.name}</h3>
            <p class="book-price">السعر: ${book.price}</p>
            <p class="book-quantity">الكمية: ${book.quantity}</p>
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
    addBookForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addBookForm);
        const bookData = {
            name: formData.get('bookName'),
            price: formData.get('bookPrice'),
            quantity: formData.get('bookQuantity'),
            category: formData.get('bookCategory'),
            image: await uploadImage(formData.get('bookImage'))
        };

        try {
            const response = await fetch(SHEET_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookData)
            });
            if (response.ok) {
                alert('تم إضافة الكتاب بنجاح');
                addBookForm.reset();
                fetchBooks();
            }
        } catch (error) {
            console.error('Error adding book:', error);
            alert('حدث خطأ أثناء إضافة الكتاب');
        }
    });

    // Add new category
    addCategoryForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryName = document.getElementById('categoryName').value;

        try {
            const response = await fetch(`${SHEET_API_URL}/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: categoryName })
            });
            if (response.ok) {
                alert('تم إضافة التصنيف بنجاح');
                addCategoryForm.reset();
                fetchCategories();
            }
        } catch (error) {
            console.error('Error adding category:', error);
            alert('حدث خطأ أثناء إضافة التصنيف');
        }
    });

    // Delete book
    async function deleteBook(bookId) {
        try {
            const response = await fetch(`${SHEET_API_URL}/${bookId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                alert('تم حذف الكتاب بنجاح');
                fetchBooks();
            }
        } catch (error) {
            console.error('Error deleting book:', error);
            alert('حدث خطأ أثناء حذف الكتاب');
        }
    }

    // Delete category
    async function deleteCategory(categoryId) {
        try {
            const response = await fetch(`${SHEET_API_URL}/categories/${categoryId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                alert('تم حذف التصنيف بنجاح');
                fetchCategories();
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('حدث خطأ أثناء حذف التصنيف');
        }
    }

    // Helper function to upload images (you'll need to implement this based on your chosen storage solution)
    async function uploadImage(file) {
        // Implement image upload to your preferred storage service
        // Return the URL of the uploaded image
        return 'placeholder-image-url';
    }
}

// Event listeners
searchInput?.addEventListener('input', filterBooks);
categoryFilter?.addEventListener('change', filterBooks);

// Password management functions

const PASSWORD_API_URL = 'https://script.google.com/macros/s/AKfycbzkt3glLvLeT4b9PxZEmOBQdR9ZJLZZWPHJZVXCAQm5NBMvIxWjJuF07b3cl0eVPLgYhw/exec';

// Get password from Google Apps Script (GET)
async function getStoredPassword() {
    try {
        const response = await fetch(PASSWORD_API_URL);
        const data = await response.json();
        // Expecting { password: "..." }
        return data.password || '123456';
    } catch (error) {
        console.error('Error fetching password:', error);
        return '123456';
    }
}

// Update password via Google Apps Script (POST)
async function updatePassword(currentPassword, newPassword) {
    try {
        const response = await fetch(PASSWORD_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current: currentPassword, new: newPassword })
        });
        const result = await response.text();
        return result === 'success';
    } catch (error) {
        console.error('Error updating password:', error);
        return false;
    }
}

// Password change form handler
if (document.getElementById('changePasswordForm')) {
    const changePasswordForm = document.getElementById('changePasswordForm');
    const successMessage = document.getElementById('passwordSuccessMessage');
    const errorMessage = document.getElementById('passwordErrorMessage');

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;

        // Hide any previous messages
        successMessage.style.display = 'none';
        errorMessage.style.display = 'none';

        // Update password via API
        const updated = await updatePassword(currentPassword, newPassword);
        if (updated) {
            successMessage.style.display = 'block';
            changePasswordForm.reset();
        } else {
            errorMessage.textContent = 'كلمة المرور الحالية غير صحيحة أو حدث خطأ أثناء تحديث كلمة المرور';
            errorMessage.style.display = 'block';
        }
    });
}

// Initial load
fetchBooks();
fetchCategories();
