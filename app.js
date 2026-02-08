const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const AUTH_PATH = process.env.AUTH_PATH || path.join(__dirname, 'auth.json');
const PORT = process.env.PORT || 3000;

// 存储活跃的数据库连接池 (Map: path -> db instance)
const dbConnections = new Map();

function getDbConnection(dbPath) {
    if (!dbPath) return null;
    if (dbConnections.has(dbPath)) {
        return dbConnections.get(dbPath);
    }
    try {
        const db = new Database(dbPath, { readonly: true, fileMustExist: true });
        dbConnections.set(dbPath, db);
        return db;
    } catch (err) {
        throw new Error(`Failed to connect to ${dbPath}: ${err.message}`);
    }
}

// Middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'sqlite-viewer-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 }
}));

// 身份验证检查
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
};

// 路由: 登录页
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// 路由: 登录处理
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const authPath = AUTH_PATH;
    
    if (!fs.existsSync(authPath)) {
        return res.render('login', { error: 'Auth configuration missing. Please run init-auth.js' });
    }

    const authData = JSON.parse(fs.readFileSync(authPath));
    const user = authData.users.find(u => u.username === username);

    if (user && bcrypt.compareSync(password, user.passwordHash)) {
        req.session.user = { username: user.username };
        res.redirect('/');
    } else {
        res.render('login', { error: 'Invalid username or password' });
    }
});

// 路由: 更新数据库路径
app.post('/set-db', isAuthenticated, (req, res) => {
    const { dbPath } = req.body;
    if (dbPath && fs.existsSync(dbPath)) {
        req.session.dbPath = dbPath;
        res.redirect('/');
    } else {
        req.session.dbError = "Invalid file path or file does not exist.";
        res.redirect('/');
    }
});

// 路由: 首页 (展示 users 表)
app.get('/', isAuthenticated, (req, res) => {
    const dbPath = req.session.dbPath;
    const dbError = req.session.dbError;
    req.session.dbError = null; // 清除错误提示

    let rows = [];
    let columns = [];

    if (dbPath) {
        try {
            const db = getDbConnection(dbPath);
            rows = db.prepare('SELECT * FROM users').all();
            columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        } catch (err) {
            return res.render('index', { 
                user: req.session.user, 
                columns: [], 
                rows: [], 
                dbPath: dbPath,
                error: err.message 
            });
        }
    }

    res.render('index', { 
        user: req.session.user, 
        columns, 
        rows,
        dbPath: dbPath || '',
        error: dbError
    });
});

// 路由: 登出
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
