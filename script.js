// Google Apps Script endpoints
const SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbxfzSEupngDJW3RuTpcr_Wqm_w5DTjVrhjM5Uwyqa9a7MCNtVTYHUU_zLpTMfEuecYm9A/exec';
const API_ENDPOINTS = {
    books: `${SCRIPT_BASE_URL}?action=books`,
    categories: `${SCRIPT_BASE_URL}?action=categories`,
    password: `${SCRIPT_BASE_URL}?action=getPassword`
};

// DOM Elements
const booksContainer = document.getElementById('booksContainer');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');

// Data storage
let books = [];
let categories = [];

// UI Elements
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

// Fetch books from Google Sheets
async function fetchBooks() {
    try {
        showLoading(true);
        const response = await fetch(API_ENDPOINTS.books, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        books = Array.isArray(data.data) ? data.data : [];
        displayBooks(books);
    } catch (error) {
        console.error('Fetch books error:', error);
        books = [];
        displayBooks(books);
        showAlert('فشل تحميل البيانات. يرجى التحقق من اتصال الإنترنت والمحاولة لاحقاً.', 'error');
    } finally {
        showLoading(false);
    }
}

// Fetch categories from Google Sheets
async function fetchCategories() {
    try {
        showLoading(true);
        const response = await fetch(API_ENDPOINTS.categories, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        categories = Array.isArray(data.data) ? data.data : [];
        updateCategoryDropdowns();
    } catch (error) {
        console.error('Fetch categories error:', error);
        categories = [];
        updateCategoryDropdowns();
        showAlert('فشل تحميل التصنيفات. يرجى المحاولة لاحقاً.', 'error');
    } finally {
        showLoading(false);
    }
}

// Display books in the grid
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

// Create a book card element
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    const isAdminPage = window.location.pathname.includes('admin.html');
    
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
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter ? categoryFilter.value : '';

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
        
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'جاري الإضافة...';
        submitButton.disabled = true;
        
        try {
            const formData = new FormData(form);
            const imageFile = form.querySelector('#bookImage').files[0];
            let imageUrl = '';

            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
                if (!imageUrl) {
                    throw new Error('فشل رفع الصورة');
                }
            }

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

            const response = await fetch(SCRIPT_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookData)
            });

            const result = await response.json();
            if (result.status === 'success') {
                showAlert('تم إضافة الكتاب بنجاح', 'success');
                form.reset();
                await fetchBooks();
            } else {
                throw new Error(result.error || 'Failed to add book');
            }
        } catch (error) {
            console.error('Error adding book:', error);
            showAlert('حدث خطأ أثناء إضافة الكتاب: ' + error.message, 'error');
        } finally {
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        }
    });

    // Add new category
    document.getElementById('addCategoryForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'جاري الإضافة...';
        submitButton.disabled = true;

        try {
            const categoryName = document.getElementById('categoryName').value.trim();
            if (!categoryName) {
                throw new Error('اسم التصنيف مطلوب');
            }

            const response = await fetch(SCRIPT_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addCategory',
                    category: { name: categoryName }
                })
            });

            const result = await response.json();
            if (result.status === 'success') {
                showAlert('تم إضافة التصنيف بنجاح', 'success');
                form.reset();
                await fetchCategories();
            } else {
                throw new Error(result.error || 'Failed to add category');
            }
        } catch (error) {
            console.error('Error adding category:', error);
            showAlert('حدث خطأ أثناء إضافة التصنيف: ' + error.message, 'error');
        } finally {
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        }
    });

    // Delete book
    window.deleteBook = async function(bookId) {
        if (!confirm('هل أنت متأكد من حذف هذا الكتاب؟')) {
            return;
        }

        try {
            showLoading(true);
            const response = await fetch(SCRIPT_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteBook',
                    bookId: bookId
                })
            });

            const result = await response.json();
            if (result.status === 'success') {
                showAlert('تم حذف الكتاب بنجاح', 'success');
                await fetchBooks();
            } else {
                throw new Error(result.error || 'Failed to delete book');
            }
        } catch (error) {
            console.error('Error deleting book:', error);
            showAlert('حدث خطأ أثناء حذف الكتاب: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Delete category
    window.deleteCategory = async function(categoryId) {
        if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟ سيتم حذف جميع الكتب المرتبطة به.')) {
            return;
        }

        try {
            showLoading(true);
            const response = await fetch(SCRIPT_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteCategory',
                    categoryId: categoryId
                })
            });

            const result = await response.json();
            if (result.status === 'success') {
                showAlert('تم حذف التصنيف بنجاح', 'success');
                await fetchCategories();
                await fetchBooks();
            } else {
                throw new Error(result.error || 'Failed to delete category');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            showAlert('حدث خطأ أثناء حذف التصنيف: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Helper function to upload images
    async function uploadImage(file) {
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
            if (result.url) {
                return result.url;
            } else {
                throw new Error(result.error || 'Failed to upload image');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            showAlert('حدث خطأ أثناء رفع الصورة: ' + error.message, 'error');
            return null;
        } finally {
            showLoading(false);
        }
    }
}

// Password management functions
async function getStoredPassword() {
    try {
        const response = await fetch(API_ENDPOINTS.password, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        return data.password || '123456';
    } catch (error) {
        console.error('Error fetching password:', error);
        return '123456';
    }
}

async function updatePassword(currentPassword, newPassword) {
    try {
        showLoading(true);
        const response = await fetch(SCRIPT_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'updatePassword',
                current: currentPassword,
                new: newPassword
            })
        });
        
        const result = await response.json();
        return result.status === 'success';
    } catch (error) {
        console.error('Error updating password:', error);
        return false;
    } finally {
        showLoading(false);
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

// UI Helper functions
function showLoading(show) {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
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

// Event listeners
if (searchInput) searchInput.addEventListener('input', filterBooks);
if (categoryFilter) categoryFilter.addEventListener('change', filterBooks);

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication for admin pages
    if (window.location.pathname.includes('admin.html')) {
        if (!localStorage.getItem('libraryAuthToken')) {
            window.location.href = 'login.html';
            return;
        }
    }

    fetchBooks();
    fetchCategories();
});

// Global functions for HTML event handlers
window.deleteBook = window.deleteBook || function() {};
window.deleteCategory = window.deleteCategory || function() {};