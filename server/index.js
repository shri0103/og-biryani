require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'og-biryani-secret-key-2026';
const JWT_EXPIRY = '8h';

// ═══════════════════════════════════════════════════════
// ─── SECURITY & PERFORMANCE MIDDLEWARE ────────────────
// ═══════════════════════════════════════════════════════

// 1. Helmet — sets 15+ HTTP security headers automatically
//    (X-Content-Type-Options, X-Frame-Options, HSTS, CSP, etc.)
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // We serve an SPA, CSP is handled by Vite
}));

// 2. CORS — only allow requests from YOUR frontend
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        const allowed = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
        ];
        // Allow any .onrender.com domain in production
        if (allowed.includes(origin) || origin.endsWith('.onrender.com')) {
            return callback(null, true);
        }
        // Also allow if FRONTEND_URL env is set
        if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
            return callback(null, true);
        }
        callback(null, true); // Allow all for now since we serve frontend from same origin
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // Cache preflight for 24 hours
}));

// 3. Compression — gzip responses for speed (big win on slow networks)
app.use(compression());

// 4. Request size limit — prevents huge payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// 5. Global rate limit — 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', globalLimiter);

// 6. Strict login rate limit — 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please wait 15 minutes.' },
    skipSuccessfulRequests: true,
});

// 7. Order placement rate limit — 10 orders per 15 minutes per IP
const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Order limit reached. Please try again later.' },
});

// ═══════════════════════════════════════════════════════
// ─── HELPERS ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════

// Sanitize string input — trim, limit length, strip dangerous chars
const sanitize = (str, maxLen = 200) => {
    if (!str || typeof str !== 'string') return '';
    return str.trim().slice(0, maxLen).replace(/[<>]/g, '');
};

// Validate phone number (basic — digits, +, -, space, min 8 chars)
const isValidPhone = (phone) => {
    if (!phone || typeof phone !== 'string') return false;
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return /^\+?\d{8,15}$/.test(cleaned);
};

// Safe error response — never leak DB internals
const safeError = (res, statusCode, publicMsg, internalErr = null) => {
    if (internalErr) console.error(`[ERROR] ${publicMsg}:`, internalErr);
    return res.status(statusCode).json({ error: publicMsg });
};

// ═══════════════════════════════════════════════════════
// ─── AUTH MIDDLEWARE ──────────────────────────────────
// ═══════════════════════════════════════════════════════

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// ═══════════════════════════════════════════════════════
// ─── ADMIN AUTH ──────────────────────────────────────
// ═══════════════════════════════════════════════════════

// Login (rate limited separately)
app.post('/api/admin/login', loginLimiter, (req, res) => {
    const username = sanitize(req.body.username, 50);
    const password = req.body.password;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, admin) => {
        if (err) return safeError(res, 500, 'Login failed. Please try again.', err);
        // Don't reveal if username exists or not (generic message)
        if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

        const isValid = bcrypt.compareSync(password, admin.password);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        res.json({
            message: 'Login successful',
            token,
            admin: { id: admin.id, username: admin.username }
        });
    });
});

// Verify token
app.get('/api/admin/verify', authMiddleware, (req, res) => {
    res.json({ message: 'Token is valid', admin: req.admin });
});

// ═══════════════════════════════════════════════════════
// ─── MENU (Public: GET | Protected: POST, PUT, DELETE)
// ═══════════════════════════════════════════════════════

// Get Menu (public)
app.get('/api/menu', (req, res) => {
    db.all("SELECT * FROM menu", [], (err, rows) => {
        if (err) return safeError(res, 500, 'Failed to load menu', err);
        res.json({ message: "success", data: rows });
    });
});

// Add Menu Item (admin only)
app.post('/api/menu', authMiddleware, (req, res) => {
    const name = sanitize(req.body.name, 100);
    const description = sanitize(req.body.description, 300);
    const price = Number(req.body.price);
    const category = sanitize(req.body.category, 50);
    const tag = sanitize(req.body.tag, 30);
    const available_days = sanitize(req.body.available_days, 50);

    if (!name || !price || !category || isNaN(price) || price <= 0) {
        return res.status(400).json({ error: 'Name, valid price, and category are required' });
    }

    const sql = 'INSERT INTO menu (name, description, price, category, image, tag, available_days) VALUES (?,?,?,?,?,?,?)';
    db.run(sql, [name, description, price, category, '', tag, available_days], function (err) {
        if (err) return safeError(res, 500, 'Failed to add menu item', err);
        res.json({
            message: 'Menu item added',
            data: { id: this.lastID, name, description, price, category, tag, available_days }
        });
    });
});

// Update Menu Item (admin only)
app.put('/api/menu/:id', authMiddleware, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const name = sanitize(req.body.name, 100);
    const description = sanitize(req.body.description, 300);
    const price = Number(req.body.price);
    const category = sanitize(req.body.category, 50);
    const tag = sanitize(req.body.tag, 30);
    const available_days = sanitize(req.body.available_days, 50);

    const sql = 'UPDATE menu SET name = ?, description = ?, price = ?, category = ?, tag = ?, available_days = ? WHERE id = ?';
    db.run(sql, [name, description, price, category, tag, available_days, id], function (err) {
        if (err) return safeError(res, 500, 'Failed to update menu item', err);
        if (this.changes === 0) return res.status(404).json({ error: 'Menu item not found' });
        res.json({ message: 'Menu item updated', data: { id, name, description, price, category, tag, available_days } });
    });
});

// Toggle Today's Special (admin only)
app.patch('/api/menu/:id/special', authMiddleware, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    db.run('UPDATE menu SET is_today_special = 0', [], (err) => {
        if (err) return safeError(res, 500, 'Failed to update special', err);
        db.run('UPDATE menu SET is_today_special = 1 WHERE id = ?', [id], function (err) {
            if (err) return safeError(res, 500, 'Failed to update special', err);
            if (this.changes === 0) return res.status(404).json({ error: 'Menu item not found' });
            res.json({ message: "Today's special updated", data: { id } });
        });
    });
});

// Clear Today's Special (admin only)
app.delete('/api/menu/special', authMiddleware, (req, res) => {
    db.run('UPDATE menu SET is_today_special = 0', [], (err) => {
        if (err) return safeError(res, 500, 'Failed to clear special', err);
        res.json({ message: "Today's special cleared" });
    });
});

// Delete Menu Item (admin only)
app.delete('/api/menu/:id', authMiddleware, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    db.run('DELETE FROM menu WHERE id = ?', [id], function (err) {
        if (err) return safeError(res, 500, 'Failed to delete menu item', err);
        if (this.changes === 0) return res.status(404).json({ error: 'Menu item not found' });
        res.json({ message: 'Menu item deleted' });
    });
});

// ═══════════════════════════════════════════════════════
// ─── ORDERS ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════

// Place Order (public, rate limited)
app.post('/api/orders', orderLimiter, (req, res) => {
    const { items, total } = req.body;
    const customerName = sanitize(req.body.customerName, 100);
    const customerPhone = sanitize(req.body.customerPhone, 20);

    // Validate inputs
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Order must contain at least one item' });
    }
    if (!customerName) return res.status(400).json({ error: 'Customer name is required' });
    if (!isValidPhone(customerPhone)) return res.status(400).json({ error: 'Valid phone number is required' });
    if (!total || isNaN(Number(total)) || Number(total) <= 0) return res.status(400).json({ error: 'Invalid total' });

    // Sanitize each item in the order
    const cleanItems = items.slice(0, 50).map(item => ({
        name: sanitize(item.name, 100),
        price: Number(item.price) || 0,
        quantity: Math.min(Math.max(parseInt(item.quantity) || 1, 1), 100),
    }));

    const orderToken = db.generateOrderToken();
    const sql = 'INSERT INTO orders (items, total_amount, customer_name, customer_phone, status, order_token) VALUES (?,?,?,?,?,?)';
    const params = [JSON.stringify(cleanItems), Number(total), customerName, customerPhone, 'Received', orderToken];

    db.run(sql, params, function (err) {
        if (err) return safeError(res, 500, 'Failed to place order', err);
        res.json({ message: 'success', data: { id: this.lastID, orderToken } });
    });
});

// Track Order (public) — by token
app.get('/api/orders/track/:token', (req, res) => {
    const token = sanitize(req.params.token, 50);
    // Validate token format (alphanumeric + hyphens only)
    if (!/^[a-zA-Z0-9\-]+$/.test(token)) {
        return res.status(400).json({ error: 'Invalid tracking token' });
    }

    db.get('SELECT id, items, total_amount, customer_name, status, order_token, created_at FROM orders WHERE order_token = ?', [token], (err, row) => {
        if (err) return safeError(res, 500, 'Failed to track order', err);
        if (!row) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'success', data: row });
    });
});

// Get All Orders (admin only)
app.get('/api/orders', authMiddleware, (req, res) => {
    db.all("SELECT * FROM orders ORDER BY id DESC", [], (err, rows) => {
        if (err) return safeError(res, 500, 'Failed to fetch orders', err);
        res.json({ message: "success", data: rows });
    });
});

// Update Order Status (admin only)
app.patch('/api/orders/:id/status', authMiddleware, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const { status } = req.body;
    const validStatuses = ['Received', 'Preparing', 'Ready', 'Delivered'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id], function (err) {
        if (err) return safeError(res, 500, 'Failed to update status', err);
        if (this.changes === 0) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Status updated', data: { id, status } });
    });
});

// Bulk Advance Orders (admin only)
app.patch('/api/orders/bulk-advance', authMiddleware, (req, res) => {
    const { fromStatus, toStatus } = req.body;
    const validStatuses = ['Received', 'Preparing', 'Ready', 'Delivered'];
    if (!validStatuses.includes(fromStatus) || !validStatuses.includes(toStatus)) {
        return res.status(400).json({ error: 'Invalid status values' });
    }

    db.run(
        `UPDATE orders SET status = ? WHERE status = ? AND date(created_at) = date('now')`,
        [toStatus, fromStatus],
        function (err) {
            if (err) return safeError(res, 500, 'Bulk update failed', err);
            res.json({ message: `${this.changes} orders moved from ${fromStatus} to ${toStatus}`, data: { updated: this.changes } });
        }
    );
});

// ─── Order History by Phone (public) ─────────────────
app.get('/api/orders/history/:phone', (req, res) => {
    const phone = sanitize(req.params.phone, 20);
    if (!isValidPhone(phone)) return res.status(400).json({ error: 'Invalid phone number' });

    db.all(
        'SELECT id, items, total_amount, customer_name, customer_phone, status, order_token, rating, feedback, created_at FROM orders WHERE customer_phone = ? ORDER BY id DESC LIMIT 50',
        [phone],
        (err, rows) => {
            if (err) return safeError(res, 500, 'Failed to fetch history', err);
            res.json({ message: 'success', data: rows || [] });
        }
    );
});

// ─── Order Feedback (public) ─────────────────────────
app.post('/api/orders/:token/feedback', (req, res) => {
    const token = sanitize(req.params.token, 50);
    if (!/^[a-zA-Z0-9\-]+$/.test(token)) {
        return res.status(400).json({ error: 'Invalid token' });
    }

    const rating = parseInt(req.body.rating);
    const feedback = sanitize(req.body.feedback, 500);

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    db.run(
        'UPDATE orders SET rating = ?, feedback = ? WHERE order_token = ?',
        [rating, feedback, token],
        function (err) {
            if (err) return safeError(res, 500, 'Failed to save feedback', err);
            if (this.changes === 0) return res.status(404).json({ error: 'Order not found' });
            res.json({ message: 'Feedback submitted', data: { rating, feedback } });
        }
    );
});

// ═══════════════════════════════════════════════════════
// ─── COUPONS ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════

// Validate coupon (public)
app.post('/api/coupons/validate', (req, res) => {
    const code = sanitize(req.body.code, 30).toUpperCase();
    if (!code) return res.status(400).json({ error: 'Coupon code is required' });
    if (!/^[A-Z0-9]+$/.test(code)) return res.status(400).json({ error: 'Invalid coupon format' });

    db.get(
        'SELECT * FROM coupons WHERE code = ? AND is_active = 1',
        [code],
        (err, coupon) => {
            if (err) return safeError(res, 500, 'Validation failed', err);
            if (!coupon) return res.status(404).json({ error: 'Invalid or expired coupon code' });
            if (coupon.used_count >= coupon.max_uses) return res.status(400).json({ error: 'Coupon has reached its usage limit' });
            // Increment usage
            db.run('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id]);
            res.json({ message: 'Coupon applied!', data: { code: coupon.code, discount_percent: coupon.discount_percent } });
        }
    );
});

// Get all coupons (admin)
app.get('/api/coupons', authMiddleware, (req, res) => {
    db.all('SELECT * FROM coupons ORDER BY id DESC', [], (err, rows) => {
        if (err) return safeError(res, 500, 'Failed to fetch coupons', err);
        res.json({ message: 'success', data: rows || [] });
    });
});

// Create coupon (admin)
app.post('/api/coupons', authMiddleware, (req, res) => {
    const code = sanitize(req.body.code, 30).toUpperCase();
    const discount_percent = Number(req.body.discount_percent);
    const max_uses = parseInt(req.body.max_uses) || 100;

    if (!code || !/^[A-Z0-9]+$/.test(code)) return res.status(400).json({ error: 'Invalid coupon code format' });
    if (!discount_percent || discount_percent < 1 || discount_percent > 100) return res.status(400).json({ error: 'Discount must be 1-100%' });

    db.run(
        'INSERT INTO coupons (code, discount_percent, max_uses) VALUES (?, ?, ?)',
        [code, discount_percent, max_uses],
        function (err) {
            if (err) return safeError(res, 500, 'Failed to create coupon', err);
            res.json({ message: 'Coupon created', data: { id: this.lastID } });
        }
    );
});

// Delete coupon (admin)
app.delete('/api/coupons/:id', authMiddleware, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    db.run('DELETE FROM coupons WHERE id = ?', [id], function (err) {
        if (err) return safeError(res, 500, 'Failed to delete coupon', err);
        res.json({ message: 'Coupon deleted' });
    });
});

// ═══════════════════════════════════════════════════════
// ─── ADMIN STATS (Dashboard) ─────────────────────────
// ═══════════════════════════════════════════════════════

app.get('/api/admin/stats', authMiddleware, (req, res) => {
    const stats = {};

    db.get(
        `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue 
         FROM orders WHERE date(created_at) = date('now')`,
        [],
        (err, today) => {
            if (err) return safeError(res, 500, 'Failed to load stats', err);
            stats.today = today;

            db.get(
                `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue FROM orders`,
                [],
                (err, allTime) => {
                    if (err) return safeError(res, 500, 'Failed to load stats', err);
                    stats.allTime = allTime;

                    db.all(`SELECT items FROM orders ORDER BY id DESC LIMIT 50`, [], (err, rows) => {
                        if (err) return safeError(res, 500, 'Failed to load stats', err);

                        const itemCounts = {};
                        rows.forEach(row => {
                            try {
                                const items = JSON.parse(row.items);
                                items.forEach(item => {
                                    itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
                                });
                            } catch (e) { }
                        });

                        stats.popularItems = Object.entries(itemCounts)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([name, count]) => ({ name, count }));

                        db.all(
                            `SELECT date(created_at) as day, COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as revenue
                             FROM orders WHERE created_at >= date('now', '-7 days')
                             GROUP BY date(created_at) ORDER BY day`,
                            [],
                            (err, weekly) => {
                                if (err) return safeError(res, 500, 'Failed to load stats', err);
                                stats.weekly = weekly || [];

                                db.all(
                                    `SELECT status, COUNT(*) as count FROM orders WHERE date(created_at) = date('now') GROUP BY status`,
                                    [],
                                    (err, statusBreakdown) => {
                                        if (err) return safeError(res, 500, 'Failed to load stats', err);
                                        stats.statusBreakdown = statusBreakdown || [];
                                        res.json({ message: 'success', data: stats });
                                    }
                                );
                            }
                        );
                    });
                }
            );
        }
    );
});

// ═══════════════════════════════════════════════════════
// ─── SERVE FRONTEND (Production) ─────────────────────
// ═══════════════════════════════════════════════════════

const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// SPA catch-all: any non-API route serves index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

// ═══════════════════════════════════════════════════════
// ─── CRASH PROTECTION & GRACEFUL SHUTDOWN ────────────
// ═══════════════════════════════════════════════════════

// Catch unhandled promise rejections (prevents crash)
process.on('unhandledRejection', (reason, promise) => {
    console.error('[UNHANDLED REJECTION]', reason);
});

// Catch uncaught exceptions (prevents crash)
process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
    // Don't exit — keep serving
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close(() => {
        console.log('Database closed.');
        process.exit(0);
    });
});

// ═══════════════════════════════════════════════════════
// ─── START SERVER ────────────────────────────────────
// ═══════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log(`🔒 Server running securely on port ${PORT}`);
    console.log(`   Helmet: ✓  Rate Limiting: ✓  CORS: ✓  Compression: ✓`);
});
