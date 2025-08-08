// استبدال تعريفات API
const supabaseUrl = 'https://khygsezacpinsynzbsac.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoeWdzZXphY3BpbnN5bnpic2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2Njg3MzIsImV4cCI6MjA3MDI0NDczMn0.viQX97883Apajn7ZZOLiZgqyFTpE44RzazjlFRSeBJc';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM Elements (يبقى كما هو)
const booksContainer = document.getElementById('booksContainer');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');

// Data storage (يبقى كما هو)
let books = [];
let categories = [];

// UI Elements (يبقى كما هو)
const loader = document.createElement('div');
// ... باقي الكود الخاص بالواجهة يبقى كما هو

// جلب الكتب من Supabase
async function fetchBooks() {
    try {
        showLoading(true);
        const { data, error } = await supabase
            .from('books')
            .select('*');
        
        if (error) throw error;
        
        books = data || [];
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

// جلب التصنيفات من Supabase
async function fetchCategories() {
    try {
        showLoading(true);
        const { data, error } = await supabase
            .from('categories')
            .select('*');
        
        if (error) throw error;
        
        categories = data || [];
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

// إضافة كتاب جديد
async function addBook(bookData) {
    try {
        const { data, error } = await supabase
            .from('books')
            .insert([bookData])
            .select();
        
        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error adding book:', error);
        throw error;
    }
}

// حذف كتاب
async function deleteBook(bookId) {
    try {
        const { error } = await supabase
            .from('books')
            .delete()
            .eq('id', bookId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting book:', error);
        throw error;
    }
}

// إضافة تصنيف جديد
async function addCategory(categoryName) {
    try {
        const { data, error } = await supabase
            .from('categories')
            .insert([{ name: categoryName }])
            .select();
        
        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error adding category:', error);
        throw error;
    }
}

// حذف تصنيف
async function deleteCategory(categoryId) {
    try {
        // حذف الكتب المرتبطة بهذا التصنيف أولاً
        await supabase
            .from('books')
            .delete()
            .eq('category_id', categoryId);
        
        // ثم حذف التصنيف نفسه
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', categoryId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting category:', error);
        throw error;
    }
}

// إدارة كلمة المرور
async function getStoredPassword() {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('password')
            .eq('id', 1)
            .single();
        
        if (error) throw error;
        return data?.password || '123456';
    } catch (error) {
        console.error('Error fetching password:', error);
        return '123456';
    }
}

async function updatePassword(currentPassword, newPassword) {
    try {
        // التحقق من كلمة المرور الحالية أولاً
        const storedPassword = await getStoredPassword();
        if (storedPassword !== currentPassword) {
            return false;
        }
        
        // تحديث كلمة المرور
        const { error } = await supabase
            .from('settings')
            .update({ password: newPassword })
            .eq('id', 1);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating password:', error);
        return false;
    }
}

// رفع الصور إلى Supabase Storage
async function uploadImage(file) {
    try {
        showLoading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `book_images/${fileName}`;
        
        const { data, error } = await supabase.storage
            .from('book-images')
            .upload(filePath, file);
        
        if (error) throw error;
        
        // الحصول على رابط عام للصورة
        const { data: { publicUrl } } = supabase.storage
            .from('book-images')
            .getPublicUrl(data.path);
        
        return publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        showAlert('حدث خطأ أثناء رفع الصورة: ' + error.message, 'error');
        return null;
    } finally {
        showLoading(false);
    }
}

// تعديل معالجات النماذج في لوحة التحكم
if (window.location.pathname.includes('admin.html')) {
    // إضافة كتاب جديد
    document.getElementById('addBookForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'جاري الإضافة...';
        submitButton.disabled = true;
        
        try {
            const bookData = {
                name: form.bookName.value,
                price: form.bookPrice.value,
                quantity: form.bookQuantity.value,
                category: form.bookCategory.value,
                image: ''
            };

            // رفع الصورة إذا تم اختيارها
            const imageFile = form.bookImage.files[0];
            if (imageFile) {
                bookData.image = await uploadImage(imageFile);
            }

            await addBook(bookData);
            showAlert('تم إضافة الكتاب بنجاح', 'success');
            form.reset();
            await fetchBooks();
        } catch (error) {
            console.error('Error adding book:', error);
            showAlert('حدث خطأ أثناء إضافة الكتاب: ' + error.message, 'error');
        } finally {
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        }
    });

    // باقي معالجات النماذج (إضافة تصنيف، حذف كتاب، إلخ) يتم تعديلها بنفس الطريقة
    // باستبدال استدعاءات Google Apps Script بوظائف Supabase الجديدة
}

// باقي الكود يبقى كما هو مع استبدال استدعاءات API القديمة بالجديدة