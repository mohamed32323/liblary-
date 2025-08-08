// Google Apps Script endpoints
const SCRIPT_ID = 'AKfycbwtcabDAlUuOPA1LHkl7gHRYVA4q86piqJdYl1WwWpsNBdUGTQ2zIYGfBHvsHrp3pJFEA';
const SCRIPT_BASE_URL = `https://script.google.com/macros/s/${SCRIPT_ID}/exec`;
const API_ENDPOINTS = {
    books: `${SCRIPT_BASE_URL}?action=books`,
    categories: `${SCRIPT_BASE_URL}?action=categories`,
    password: `${SCRIPT_BASE_URL}?action=getPassword`
};

// DOM Elements
const booksContainer = document.getElementById('booksContainer');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const booksList = document.getElementById('booksList');

// Data storage
let books = [];
let categories = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication for admin pages
    if (window.location.pathname.includes('admin.html')) {
        if (!localStorage.getItem('libraryAuthToken')) {
            window.location.href = 'login.html';
            return;
        }
        
        // Initialize admin forms
        initAdminForms();
    }

    fetchBooks();
    fetchCategories();
});

// Fetch books from Google Sheets
async function fetchBooks() {
    try {
        showLoading(true);
        const response = await fetch(API_ENDPOINTS.books);
        
        if (!response.ok) throw new Error('Failed to fetch books');
        
        const data = await response.json();
        books = data.data || [];
        
        if (booksContainer) displayBooks(books);
        if (booksList) displayBooksForAdmin(books);
    } catch (error) {
        console.error('Error fetching books:', error);
        showAlert('فشل تحميل الكتب. يرجى المحاولة لاحقاً.', 'error');
    } finally {
        showLoading(false);
    }
}

// Fetch categories from Google Sheets
async function fetchCategories() {
    try {
        showLoading(true);
        const response = await fetch(API_ENDPOINTS.categories);
        
        if (!response.ok) throw new Error('Failed to fetch categories');
        
        const data = await response.json();
        categories = data.data || [];
        updateCategoryDropdowns();
    } catch (error) {
        console.error('Error fetching categories:', error);
        showAlert('فشل تحميل التصنيفات. يرجى المحاولة لاحقاً.', 'error');
    } finally {
        showLoading(false);
    }
}

// Display books in the main page
function displayBooks(booksToShow) {
    if (!booksContainer) return;
    
    booksContainer.innerHTML = '';
    
    if (booksToShow.length === 0) {
        booksContainer.innerHTML = '<p class="no-books">لا توجد كتب متاحة</p>';
        return;
    }
    
    booksToShow.forEach(book => {
        const bookCard = createBookCard(book);
        booksContainer.appendChild(bookCard);
    });
}

// Display books in admin page
function displayBooksForAdmin(booksToShow) {
    if (!booksList) return;
    
    booksList.innerHTML = '';
    
    if (booksToShow.length === 0) {
        booksList.innerHTML = '<p class="no-books">لا توجد كتب متاحة</p>';
        return;
    }
    
    booksToShow.forEach(book => {
        const bookCard = createAdminBookCard(book);
        booksList.appendChild(bookCard);
    });
}

// Create book card for main page
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    card.innerHTML = `
        <img src="${book.image || 'https://via.placeholder.com/200x300?text=No+Image'}" 
             alt="${book.name}" 
             class="book-image"
             onerror="this.src='https://via.placeholder.com/200x300?text=No+Image'">
        <div class="book-info">
            <h3 class="book-title">${book.name}</h3>
            <p class="book-price">السعر: ${book.price} ج.م</p>
            <p class="book-quantity">الكمية: ${book.quantity}</p>
            ${book.category ? `<p class="book-category">التصنيف: ${book.category}</p>` : ''}
        </div>
    `;
    return card;
}

// Create book card for admin page
function createAdminBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card admin-book-card';
    
    card.innerHTML = `
        <img src="${book.image || 'https://via.placeholder.com/200x300?text=No+Image'}" 
             alt="${book.name}" 
             class="book-image"
             onerror="this.src='https://via.placeholder.com/200x300?text=No+Image'">
        <div class="book-info">
            <h3 class="book-title">${book.name}</h3>
            <p class="book-price">السعر: ${book.price} ج.م</p>
            <p class="book-quantity">الكمية: ${book.quantity}</p>
            ${book.category ? `<p class="book-category">التصنيف: ${book.category}</p>` : ''}
            <div class="book-actions">
                <button onclick="editBook('${book.id}')" class="edit-button">تعديل</button>
                <button onclick="deleteBook('${book.id}')" class="delete-button">حذف</button>
            </div>
        </div>
    `;
    return card;
}

// Update category dropdowns
function updateCategoryDropdowns() {
    const dropdowns = [];
    if (categoryFilter) dropdowns.push(categoryFilter);
    
    const bookCategoryDropdown = document.getElementById('bookCategory');
    if (bookCategoryDropdown) dropdowns.push(bookCategoryDropdown);
    
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
if (searchInput) searchInput.addEventListener('input', filterBooks);
if (categoryFilter) categoryFilter.addEventListener('change', filterBooks);

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

// Initialize admin forms
function initAdminForms() {
    // Add book form
    const addBookForm = document.getElementById('addBookForm');
    if (addBookForm) {
        addBookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleAddBook();
        });
    }
    
    // Add category form
    const addCategoryForm = document.getElementById('addCategoryForm');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleAddCategory();
        });
    }
    
    // Change password form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleChangePassword();
        });
    }
}

// Handle add book
async function handleAddBook() {
    const form = document.getElementById('addBookForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
        submitButton.textContent = 'جاري الإضافة...';
        submitButton.disabled = true;
        
        const bookData = {
            name: document.getElementById('bookName').value,
            price: document.getElementById('bookPrice').value,
            quantity: document.getElementById('bookQuantity').value,
            category: document.getElementById('bookCategory').value,
            image: await uploadImage(document.getElementById('bookImage').files[0])
        };
        
        const response = await fetch(`${SCRIPT_BASE_URL}?action=addBook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book: bookData })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showAlert('تم إضافة الكتاب بنجاح', 'success');
            form.reset();
            await fetchBooks();
        } else {
            throw new Error(result.message || 'Failed to add book');
        }
    } catch (error) {
        console.error('Error adding book:', error);
        showAlert(`حدث خطأ أثناء إضافة الكتاب: ${error.message}`, 'error');
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

// Handle add category
async function handleAddCategory() {
    const form = document.getElementById('addCategoryForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
        submitButton.textContent = 'جاري الإضافة...';
        submitButton.disabled = true;
        
        const categoryName = document.getElementById('categoryName').value;
        
        const response = await fetch(`${SCRIPT_BASE_URL}?action=addCategory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: { name: categoryName } })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showAlert('تم إضافة التصنيف بنجاح', 'success');
            form.reset();
            await fetchCategories();
        } else {
            throw new Error(result.message || 'Failed to add category');
        }
    } catch (error) {
        console.error('Error adding category:', error);
        showAlert(`حدث خطأ أثناء إضافة التصنيف: ${error.message}`, 'error');
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

// Handle change password
async function handleChangePassword() {
    const form = document.getElementById('changePasswordForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    const successMessage = document.getElementById('passwordSuccessMessage');
    const errorMessage = document.getElementById('passwordErrorMessage');
    
    try {
        submitButton.textContent = 'جاري التحديث...';
        submitButton.disabled = true;
        successMessage.style.display = 'none';
        errorMessage.style.display = 'none';
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        
        const response = await fetch(`${SCRIPT_BASE_URL}?action=updatePassword`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current: currentPassword, new: newPassword })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            successMessage.style.display = 'block';
            form.reset();
        } else {
            errorMessage.textContent = result.message || 'كلمة المرور الحالية غير صحيحة';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Error changing password:', error);
        errorMessage.textContent = 'حدث خطأ أثناء تغيير كلمة المرور';
        errorMessage.style.display = 'block';
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

// Upload image
async function uploadImage(file) {
    if (!file) return '';
    
    try {
        showLoading(true);
        const formData = new FormData();
        formData.append('action', 'uploadImage');
        formData.append('image', file);
        
        const response = await fetch(SCRIPT_BASE_URL, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            return result.data.url;
        } else {
            throw new Error(result.message || 'Failed to upload image');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        showAlert('حدث خطأ أثناء رفع صورة الكتاب', 'error');
        return '';
    } finally {
        showLoading(false);
    }
}

// Delete book
window.deleteBook = async function(bookId) {
    if (!confirm('هل أنت متأكد من حذف هذا الكتاب؟')) return;
    
    try {
        showLoading(true);
        const response = await fetch(`${SCRIPT_BASE_URL}?action=deleteBook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: bookId })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showAlert('تم حذف الكتاب بنجاح', 'success');
            await fetchBooks();
        } else {
            throw new Error(result.message || 'Failed to delete book');
        }
    } catch (error) {
        console.error('Error deleting book:', error);
        showAlert('حدث خطأ أثناء حذف الكتاب', 'error');
    } finally {
        showLoading(false);
    }
}

// Edit book (placeholder - you'll need to implement this)
window.editBook = function(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    
    // You'll need to implement a modal or form to edit the book
    alert(`ستقوم بتعديل الكتاب: ${book.name}\nهذه الوظيفة تحتاج إلى تنفيذ.`);
}

// UI Helper functions
function showLoading(show) {
    const loader = document.getElementById('loader') || createLoader();
    loader.style.display = show ? 'flex' : 'none';
}

function createLoader() {
    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    loader.innerHTML = `
        <div class="spinner" style="
            width: 50px;
            height: 50px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        "></div>
    `;
    document.body.appendChild(loader);
    return loader;
}

function showAlert(message, type) {
    const alertContainer = document.getElementById('alert-container') || createAlertContainer();
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    alertContainer.appendChild(alertDiv);
    
    setTimeout(() => alertDiv.remove(), 5000);
}

function createAlertContainer() {
    const container = document.createElement('div');
    container.id = 'alert-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        max-width: 400px;
    `;
    document.body.appendChild(container);
    return container;
}