const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-secret-key-library-app-2024';

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../frontend')));

// Подключение к базе данных SQLite
const db = new sqlite3.Database(path.join(__dirname, 'database/library.db'), (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err);
    } else {
        console.log('Подключено к SQLite базе данных');
        createTables();
        createAdminUser();
    }
});

// Создание таблиц
function createTables() {
    // Таблица пользователей
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Таблица книг
    db.run(`
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            year INTEGER,
            isbn TEXT,
            quantity INTEGER DEFAULT 1,
            available INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Таблица читателей
    db.run(`
        CREATE TABLE IF NOT EXISTS readers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT,
            registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Таблица выдач книг
    db.run(`
        CREATE TABLE IF NOT EXISTS loans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER,
            reader_id INTEGER,
            loan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            due_date DATETIME NOT NULL,
            return_date DATETIME,
            status TEXT DEFAULT 'active',
            FOREIGN KEY (book_id) REFERENCES books(id),
            FOREIGN KEY (reader_id) REFERENCES readers(id)
        )
    `);

    console.log('Таблицы созданы/проверены');
}

// Создание администратора по умолчанию
async function createAdminUser() {
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, user) => {
        if (err) {
            console.error('Ошибка проверки администратора:', err);
            return;
        }
        
        if (!user) {
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
                ['admin', hashedPassword], 
                (err) => {
                    if (err) {
                        console.error('Ошибка создания администратора:', err);
                    } else {
                        console.log('Администратор создан (логин: admin, пароль: 123456)');
                    }
                }
            );
        }
    });
}

// Middleware для проверки авторизации
function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    
    if (!token) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
}

// ==================== API МАРШРУТЫ ====================

// Авторизация
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Введите логин и пароль' });
    }
    
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
        
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'strict'
        });
        
        res.json({ message: 'Авторизация успешна', username: user.username });
    });
});

// Проверка авторизации
app.get('/api/check-auth', authenticateToken, (req, res) => {
    res.json({ authenticated: true, username: req.user.username });
});

// Выход
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Выход выполнен' });
});

// Публичный маршрут для просмотра книг (без авторизации)
app.get('/api/books/public', (req, res) => {
    db.all('SELECT id, title, author, year, isbn, available FROM books ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Получить все книги (требуется авторизация)
app.get('/api/books', authenticateToken, (req, res) => {
    db.all('SELECT * FROM books ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Добавить книгу
app.post('/api/books', authenticateToken, (req, res) => {
    const { title, author, year, isbn, quantity } = req.body;
    db.run(
        'INSERT INTO books (title, author, year, isbn, quantity, available) VALUES (?, ?, ?, ?, ?, ?)',
        [title, author, year, isbn, quantity, quantity],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Книга добавлена' });
        }
    );
});

// Получить всех читателей (требуется авторизация)
app.get('/api/readers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM readers ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Добавить читателя
app.post('/api/readers', authenticateToken, (req, res) => {
    const { name, email, phone } = req.body;
    db.run(
        'INSERT INTO readers (name, email, phone) VALUES (?, ?, ?)',
        [name, email, phone],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Читатель добавлен' });
        }
    );
});

// Выдать книгу (с указанием срока)
app.post('/api/loans', authenticateToken, (req, res) => {
    const { book_id, reader_id, due_date } = req.body;
    
    if (!due_date) {
        return res.status(400).json({ error: 'Укажите срок возврата' });
    }
    
    db.get('SELECT available FROM books WHERE id = ?', [book_id], (err, book) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!book || book.available < 1) {
            res.status(400).json({ error: 'Книга недоступна' });
            return;
        }
        
        db.run(
            'INSERT INTO loans (book_id, reader_id, due_date) VALUES (?, ?, ?)',
            [book_id, reader_id, due_date],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                db.run('UPDATE books SET available = available - 1 WHERE id = ?', [book_id]);
                res.json({ id: this.lastID, message: 'Книга выдана' });
            }
        );
    });
});

// Вернуть книгу
app.put('/api/loans/:id/return', authenticateToken, (req, res) => {
    const loanId = req.params.id;
    
    db.get('SELECT book_id FROM loans WHERE id = ? AND status = "active"', [loanId], (err, loan) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!loan) {
            res.status(404).json({ error: 'Активная выдача не найдена' });
            return;
        }
        
        db.run(
            'UPDATE loans SET return_date = CURRENT_TIMESTAMP, status = "returned" WHERE id = ?',
            [loanId],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                db.run('UPDATE books SET available = available + 1 WHERE id = ?', [loan.book_id]);
                res.json({ message: 'Книга возвращена' });
            }
        );
    });
});

// Получить активные выдачи
app.get('/api/loans/active', authenticateToken, (req, res) => {
    db.all(`
        SELECT loans.*, books.title as book_title, readers.name as reader_name 
        FROM loans 
        JOIN books ON loans.book_id = books.id 
        JOIN readers ON loans.reader_id = readers.id 
        WHERE loans.status = 'active'
        ORDER BY loans.loan_date DESC
    `, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});