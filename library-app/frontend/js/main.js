const API_URL = 'http://localhost:3000/api';

// ========== УПРАВЛЕНИЕ РЕЖИМАМИ ==========

// Показать форму входа администратора
function showAdminLogin() {
    document.getElementById('admin-login-form').style.display = 'block';
}

// Скрыть форму входа администратора
function hideAdminLogin() {
    document.getElementById('admin-login-form').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-error').textContent = '';
}

// Вход как пользователь (гость, без авторизации)
function loginAsUser() {
    showUserApp();
    loadUserBooks();
}

// Проверка авторизации администратора при загрузке
async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/check-auth`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated) {
                showAdminApp();
                loadAdminBooks();
                loadAdminReaders();
            } else {
                showMainLogin();
            }
        } else {
            showMainLogin();
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        showMainLogin();
    }
}

// Показать главную форму выбора режима
function showMainLogin() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('admin-app').style.display = 'none';
    document.getElementById('user-app').style.display = 'none';
}

// Показать приложение администратора
function showAdminApp() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('admin-app').style.display = 'block';
    document.getElementById('user-app').style.display = 'none';
}

// Показать приложение пользователя (гостя)
function showUserApp() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('admin-app').style.display = 'none';
    document.getElementById('user-app').style.display = 'block';
}

// Выход из режима администратора
async function logout() {
    try {
        await fetch(`${API_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        showMainLogin();
    } catch (error) {
        console.error('Ошибка выхода:', error);
        showMainLogin();
    }
}

// Выход из режима пользователя на главную
function logoutToMain() {
    showMainLogin();
}

// Функция входа администратора
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    if (!username || !password) {
        errorDiv.textContent = 'Введите логин и пароль';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            errorDiv.textContent = '';
            showAdminApp();
            loadAdminBooks();
            loadAdminReaders();
        } else {
            errorDiv.textContent = data.error || 'Ошибка авторизации';
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        errorDiv.textContent = 'Ошибка подключения к серверу';
    }
}

// ========== ФУНКЦИИ ДЛЯ АДМИНИСТРАТОРА ==========

// Переключение вкладок (админ)
function showTab(tabName) {
    document.querySelectorAll('#admin-app .tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('#admin-app .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'books') loadAdminBooks();
    if (tabName === 'readers') loadAdminReaders();
    if (tabName === 'loans') {
        loadAdminLoans();
        loadBooksForSelect();
        loadReadersForSelect();
        setDueDate(14);
    }
}

// Загрузка книг для администратора
async function loadAdminBooks() {
    try {
        const response = await fetch(`${API_URL}/books`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showMainLogin();
                return;
            }
            throw new Error('Ошибка загрузки');
        }
        
        const books = await response.json();
        const booksList = document.getElementById('admin-books-list');
        
        if (books.length === 0) {
            booksList.innerHTML = '<p>Книг пока нет</p>';
            return;
        }
        
        let html = `
            <table class="data-table">
                <thead>
                    <tr><th>ID</th><th>Название</th><th>Автор</th><th>Год</th><th>ISBN</th><th>Всего</th><th>Доступно</th></tr>
                </thead>
                <tbody>
        `;
        
        books.forEach(book => {
            html += `<tr>
                <td>${book.id}</td>
                <td>${escapeHtml(book.title)}</td>
                <td>${escapeHtml(book.author)}</td>
                <td>${book.year || '-'}</td>
                <td>${book.isbn || '-'}</td>
                <td>${book.quantity}</td>
                <td>${book.available}</td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        booksList.innerHTML = html;
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
    }
}

// Добавление книги
async function addBook() {
    const title = document.getElementById('book-title').value;
    const author = document.getElementById('book-author').value;
    const year = document.getElementById('book-year').value;
    const isbn = document.getElementById('book-isbn').value;
    const quantity = document.getElementById('book-quantity').value;
    
    if (!title || !author) {
        alert('Заполните название и автора книги');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, author, year, isbn, quantity: parseInt(quantity) }),
            credentials: 'include'
        });
        
        if (response.ok) {
            alert('Книга добавлена');
            document.getElementById('book-title').value = '';
            document.getElementById('book-author').value = '';
            document.getElementById('book-year').value = '';
            document.getElementById('book-isbn').value = '';
            document.getElementById('book-quantity').value = '1';
            loadAdminBooks();
        } else if (response.status === 401) {
            showMainLogin();
        } else {
            const error = await response.json();
            alert('Ошибка: ' + error.error);
        }
    } catch (error) {
        console.error('Ошибка добавления книги:', error);
        alert('Ошибка при добавлении книги');
    }
}

// Загрузка читателей для администратора
async function loadAdminReaders() {
    try {
        const response = await fetch(`${API_URL}/readers`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showMainLogin();
                return;
            }
            throw new Error('Ошибка загрузки');
        }
        
        const readers = await response.json();
        const readersList = document.getElementById('admin-readers-list');
        
        if (readers.length === 0) {
            readersList.innerHTML = '<p>Читателей пока нет</p>';
            return;
        }
        
        let html = `
            <table class="data-table">
                <thead>
                    <tr><th>ID</th><th>ФИО</th><th>Email</th><th>Телефон</th><th>Дата регистрации</th></tr>
                </thead>
                <tbody>
        `;
        
        readers.forEach(reader => {
            html += `<tr>
                <td>${reader.id}</td>
                <td>${escapeHtml(reader.name)}</td>
                <td>${reader.email || '-'}</td>
                <td>${reader.phone || '-'}</td>
                <td>${new Date(reader.registered_at).toLocaleDateString()}</td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        readersList.innerHTML = html;
    } catch (error) {
        console.error('Ошибка загрузки читателей:', error);
    }
}

// Добавление читателя
async function addReader() {
    const name = document.getElementById('reader-name').value;
    const email = document.getElementById('reader-email').value;
    const phone = document.getElementById('reader-phone').value;
    
    if (!name) {
        alert('Введите ФИО читателя');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/readers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone }),
            credentials: 'include'
        });
        
        if (response.ok) {
            alert('Читатель добавлен');
            document.getElementById('reader-name').value = '';
            document.getElementById('reader-email').value = '';
            document.getElementById('reader-phone').value = '';
            loadAdminReaders();
        } else if (response.status === 401) {
            showMainLogin();
        } else {
            const error = await response.json();
            alert('Ошибка: ' + error.error);
        }
    } catch (error) {
        console.error('Ошибка добавления читателя:', error);
        alert('Ошибка при добавлении читателя');
    }
}

// Загрузка книг для выпадающего списка
async function loadBooksForSelect() {
    try {
        const response = await fetch(`${API_URL}/books`, {
            credentials: 'include'
        });
        if (!response.ok) return;
        
        const books = await response.json();
        const select = document.getElementById('loan-book');
        select.innerHTML = '<option value="">Выберите книгу</option>';
        books.forEach(book => {
            if (book.available > 0) {
                select.innerHTML += `<option value="${book.id}">${escapeHtml(book.title)} (${escapeHtml(book.author)}) - доступно: ${book.available}</option>`;
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
    }
}

// Загрузка читателей для выпадающего списка
async function loadReadersForSelect() {
    try {
        const response = await fetch(`${API_URL}/readers`, {
            credentials: 'include'
        });
        if (!response.ok) return;
        
        const readers = await response.json();
        const select = document.getElementById('loan-reader');
        select.innerHTML = '<option value="">Выберите читателя</option>';
        readers.forEach(reader => {
            select.innerHTML += `<option value="${reader.id}">${escapeHtml(reader.name)}</option>`;
        });
    } catch (error) {
        console.error('Ошибка загрузки читателей:', error);
    }
}

// Установка даты возврата
function setDueDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    document.getElementById('loan-due-date').value = `${year}-${month}-${day}`;
}

// Выдача книги
async function createLoan() {
    const bookId = document.getElementById('loan-book').value;
    const readerId = document.getElementById('loan-reader').value;
    const dueDate = document.getElementById('loan-due-date').value;
    
    if (!bookId || !readerId) {
        alert('Выберите книгу и читателя');
        return;
    }
    if (!dueDate) {
        alert('Укажите срок возврата книги');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/loans`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book_id: parseInt(bookId), reader_id: parseInt(readerId), due_date: dueDate }),
            credentials: 'include'
        });
        
        if (response.ok) {
            alert('Книга выдана');
            loadAdminLoans();
            loadBooksForSelect();
            loadAdminBooks();
            setDueDate(14);
        } else if (response.status === 401) {
            showMainLogin();
        } else {
            const error = await response.json();
            alert('Ошибка: ' + error.error);
        }
    } catch (error) {
        console.error('Ошибка выдачи книги:', error);
        alert('Ошибка при выдаче книги');
    }
}

// Загрузка активных выдач для администратора
async function loadAdminLoans() {
    try {
        const response = await fetch(`${API_URL}/loans/active`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showMainLogin();
                return;
            }
            throw new Error('Ошибка загрузки');
        }
        
        const loans = await response.json();
        const loansList = document.getElementById('admin-loans-list');
        
        if (loans.length === 0) {
            loansList.innerHTML = '<p>Активных выдач нет</p>';
            return;
        }
        
        let html = `
            <table class="data-table">
                <thead>
                    <tr><th>Книга</th><th>Читатель</th><th>Дата выдачи</th><th>Срок возврата</th><th>Статус</th><th>Действие</th></tr>
                </thead>
                <tbody>
        `;
        
        loans.forEach(loan => {
            const overdue = isOverdue(loan.due_date);
            const statusClass = overdue ? 'overdue' : '';
            const statusText = overdue ? 'ПРОСРОЧЕНА!' : 'В норме';
            
            html += `<tr>
                <td>${escapeHtml(loan.book_title)}</td>
                <td>${escapeHtml(loan.reader_name)}</td>
                <td>${formatDate(loan.loan_date)}</td>
                <td class="${statusClass}">${formatDate(loan.due_date)}</td>
                <td class="${statusClass}">${statusText}</td>
                <td><button onclick="returnBook(${loan.id})">Вернуть</button></td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        loansList.innerHTML = html;
    } catch (error) {
        console.error('Ошибка загрузки выдач:', error);
    }
}

// Возврат книги
async function returnBook(loanId) {
    if (!confirm('Подтвердите возврат книги')) return;
    
    try {
        const response = await fetch(`${API_URL}/loans/${loanId}/return`, {
            method: 'PUT',
            credentials: 'include'
        });
        
        if (response.ok) {
            alert('Книга возвращена');
            loadAdminLoans();
            loadBooksForSelect();
            loadAdminBooks();
        } else if (response.status === 401) {
            showMainLogin();
        } else {
            const error = await response.json();
            alert('Ошибка: ' + error.error);
        }
    } catch (error) {
        console.error('Ошибка возврата книги:', error);
        alert('Ошибка при возврате книги');
    }
}

// ========== ФУНКЦИИ ДЛЯ ПОЛЬЗОВАТЕЛЯ (ГОСТЯ) ==========

// Загрузка книг для пользователя (только просмотр)
async function loadUserBooks() {
    try {
        const response = await fetch(`${API_URL}/books/public`);
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки');
        }
        
        const books = await response.json();
        const booksList = document.getElementById('user-books-list');
        
        if (books.length === 0) {
            booksList.innerHTML = '<p>Книг пока нет</p>';
            return;
        }
        
        let html = `
            <table class="data-table">
                <thead>
                    <tr><th>ID</th><th>Название</th><th>Автор</th><th>Год</th><th>ISBN</th><th>Доступно</th></tr>
                </thead>
                <tbody>
        `;
        
        books.forEach(book => {
            html += `<tr>
                <td>${book.id}</td>
                <td>${escapeHtml(book.title)}</td>
                <td>${escapeHtml(book.author)}</td>
                <td>${book.year || '-'}</td>
                <td>${book.isbn || '-'}</td>
                <td>${book.available}</td>
            </tr>`;
        });
        
        html += `</tbody></table>`;
        booksList.innerHTML = html;
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
        document.getElementById('user-books-list').innerHTML = '<p>Ошибка загрузки книг</p>';
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function isOverdue(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
    }
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
    }
});