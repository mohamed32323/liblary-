// Google Apps Script endpoints
const SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbzkt3glLvLeT4b9PxZEmOBQdR9ZJLZZWPHJZVXCAQm5NBMvIxWjJuF07b3cl0eVPLgYhw/exec';
const API_ENDPOINTS = {
    books: `${SCRIPT_BASE_URL}?action=books`,
    categories: `${SCRIPT_BASE_URL}?action=categories`,
    password: SCRIPT_BASE_URL
};

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
        const response = await fetch(API_ENDPOINTS.books);
        const data = await response.json();
        if (Array.isArray(data)) {
            books = data;
            displayBooks(books);
        } else {
            console.error('Invalid books data format');
        }
    } catch (error) {
        console.error('Error fetching books:', error);
    }
}

// Fetch categories from Google Sheets
async function fetchCategories() {
    try {
        const response = await fetch(API_ENDPOINTS.categories);
        const data = await response.json();
        if (Array.isArray(data)) {
            categories = data;
            updateCategoryDropdowns();
        } else {
            console.error('Invalid categories data format');
        }
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
        
        // Show loading state
        const submitButton = addBookForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'جاري الإضافة...';
        submitButton.disabled = true;

        try {
            const formData = new FormData(addBookForm);
            const imageFile = formData.get('bookImage');
            const imageUrl = await uploadImage(imageFile);

            const bookData = {
                action: 'addBook',
                book: {
                    name: formData.get('bookName'),
                    price: formData.get('bookPrice'),
                    quantity: formData.get('bookQuantity'),
                    category: formData.get('bookCategory'),
                    image: imageUrl
                }
            };

            const response = await fetch(API_ENDPOINTS.books, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookData)
            });

            const result = await response.text();
            if (result === 'success') {
                alert('تم إضافة الكتاب بنجاح');
                addBookForm.reset();
                await fetchBooks();
            } else {
                throw new Error(result);
            }
        } catch (error) {
            console.error('Error adding book:', error);
            alert('حدث خطأ أثناء إضافة الكتاب');
        } finally {
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        }
    });

    // Add new category
    addCategoryForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading state
        const submitButton = addCategoryForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'جاري الإضافة...';
        submitButton.disabled = true;

        try {
            const categoryName = document.getElementById('categoryName').value;
            const response = await fetch(API_ENDPOINTS.categories, {
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
                addCategoryForm.reset();
                await fetchCategories();
            } else {
                throw new Error(result);
            }
        } catch (error) {
            console.error('Error adding category:', error);
            alert('حدث خطأ أثناء إضافة التصنيف');
        } finally {
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        }
    });

    // Delete book
    async function deleteBook(bookId) {
        if (!confirm('هل أنت متأكد من حذف هذا الكتاب؟')) {
            return;
        }

        try {
            const response = await fetch(API_ENDPOINTS.books, {
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
    }

    // Delete category
    async function deleteCategory(categoryId) {
        if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟')) {
            return;
        }

        try {
            const response = await fetch(API_ENDPOINTS.categories, {
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
    }

    // Helper function to upload images
    async function uploadImage(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        const formData = new FormData();
        formData.append('action', 'uploadImage');
        formData.append('image', file);

        try {
            const response = await fetch(API_ENDPOINTS.books, {
                method: 'POST',
                body: formData
            });

            const result = await response.text();
            if (result.startsWith('http')) {
                return result; // Return the image URL
            } else {
                throw new Error(result);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
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
