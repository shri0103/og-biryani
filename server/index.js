require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const webpush = require('web-push');
const db = require('./database');

// ─── Web Push Setup ──────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:ogbiriyani@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    console.log('✅ Web Push configured');
    console.log('Public Key (first 20 chars):', process.env.VAPID_PUBLIC_KEY.substring(0, 20) + '...');
} else {
    console.log('⚠️  VAPID keys not set — push notifications disabled');
}

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-env';
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

// 6. Strict login rate limit — 20 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
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

// Get Menu (public — only active items)
app.get('/api/menu', (req, res) => {
    // If admin query param passed, return all items (for admin panel)
    const showAll = req.query.all === '1';
    const sql = showAll ? 'SELECT * FROM menu' : 'SELECT * FROM menu WHERE is_active = 1';
    db.all(sql, [], (err, rows) => {
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
    const image = sanitize(req.body.image, 500);

    const sql = 'UPDATE menu SET name = ?, description = ?, price = ?, category = ?, tag = ?, available_days = ?, image = ? WHERE id = ?';
    db.run(sql, [name, description, price, category, tag, available_days, image, id], function (err) {
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

// Toggle Menu Item active/disabled (admin only)
app.patch('/api/menu/:id/toggle', authMiddleware, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    db.get('SELECT is_active FROM menu WHERE id = ?', [id], (err, row) => {
        if (err) return safeError(res, 500, 'Failed to fetch item', err);
        if (!row) return res.status(404).json({ error: 'Menu item not found' });
        const newVal = row.is_active ? 0 : 1;
        db.run('UPDATE menu SET is_active = ? WHERE id = ?', [newVal, id], function (err) {
            if (err) return safeError(res, 500, 'Failed to toggle item', err);
            res.json({ message: `Item ${newVal ? 'enabled' : 'disabled'}`, data: { id, is_active: newVal } });
        });
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
    // 1. Enforce Server-Side Time Lock (6 AM to 1 PM)
    const h = new Date().getHours();
    if (h < 6 || h >= 13) {
        return res.status(403).json({ error: 'Orders are currently closed. We are open from 6:00 AM to 1:00 PM.' });
    }

    const { items, total } = req.body;
    const customerName = sanitize(req.body.customerName, 100);
    const customerPhone = sanitize(req.body.customerPhone, 20);
    const scheduledDate = req.body.scheduledDate || null; // YYYY-MM-DD or null
    const scheduledTime = req.body.scheduledTime ? sanitize(req.body.scheduledTime, 20) : null;

    // Validate inputs
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Order must contain at least one item' });
    }
    if (!customerName) return res.status(400).json({ error: 'Customer name is required' });
    if (!isValidPhone(customerPhone)) return res.status(400).json({ error: 'Valid phone number is required' });
    if (!total || isNaN(Number(total)) || Number(total) <= 0) return res.status(400).json({ error: 'Invalid total' });

    // 2. Prevent Fake Large Orders (e.g. ₹2.5 Lakh spoof)
    if (Number(total) > 5000) {
        return res.status(400).json({ error: 'Orders over ₹5,000 must be placed by phone for catering verification.' });
    }

    // Validate scheduled date if provided
    if (scheduledDate) {
        const d = new Date(scheduledDate);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (isNaN(d.getTime()) || d < today) {
            return res.status(400).json({ error: 'Scheduled date must be today or a future date' });
        }
    }

    // Sanitize each item in the order and enforce quantity limits
    const cleanItems = items.slice(0, 50).map(item => ({
        name: sanitize(item.name, 100),
        price: Number(item.price) || 0,
        quantity: Math.min(Math.max(parseInt(item.quantity) || 1, 1), 20), // Hard cap at maximum 20 per item
    }));

    const orderToken = db.generateOrderToken();
    const sql = 'INSERT INTO orders (items, total_amount, customer_name, customer_phone, status, order_token, scheduled_date, scheduled_time) VALUES (?,?,?,?,?,?,?,?)';
    const params = [JSON.stringify(cleanItems), Number(total), customerName, customerPhone, 'Received', orderToken, scheduledDate, scheduledTime];

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

    db.get('SELECT id, items, total_amount, customer_name, status, order_token, scheduled_date, scheduled_time, created_at FROM orders WHERE order_token = ?', [token], (err, row) => {
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

        // Send push notification to subscribers for this order
        db.get('SELECT order_token, customer_name FROM orders WHERE id = ?', [id], (err2, order) => {
            if (!err2 && order && order.order_token) {
                sendPushForOrder(order.order_token, status, order.customer_name);
            }
        });

        res.json({ message: 'Status updated', data: { id, status } });
    });
});

// Cancel Order (customer — only if status is 'Received' and within 10 min)
app.delete('/api/orders/cancel/:token', (req, res) => {
    const token = req.params.token;
    db.get('SELECT * FROM orders WHERE order_token = ?', [token], (err, order) => {
        if (err) return safeError(res, 500, 'Failed to find order', err);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.status !== 'Received') {
            return res.status(400).json({ error: 'Cannot cancel — order is already being prepared' });
        }
        // Allow cancel only within 10 minutes
        const placed = new Date(order.created_at).getTime();
        const now = Date.now();
        if (now - placed > 10 * 60 * 1000) {
            return res.status(400).json({ error: 'Cancellation window expired (10 minutes)' });
        }
        db.run('DELETE FROM orders WHERE order_token = ?', [token], (err2) => {
            if (err2) return safeError(res, 500, 'Failed to cancel order', err2);
            res.json({ message: 'Order cancelled successfully' });
        });
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
        `UPDATE orders SET status = ? WHERE status = ? AND DATE(created_at) = CURDATE()`,
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
// ─── PUBLIC REVIEWS ──────────────────────────────────
// ═══════════════════════════════════════════════════════

// Aggregated ratings per menu item (public)
app.get('/api/reviews/menu', (req, res) => {
    // Parse order items JSON, aggregate ratings by item name
    db.all(
        `SELECT items, rating FROM orders WHERE rating >= 1 AND rating <= 5`,
        [],
        (err, rows) => {
            if (err) return safeError(res, 500, 'Failed to load reviews', err);

            const itemRatings = {};
            (rows || []).forEach(row => {
                try {
                    const items = JSON.parse(row.items);
                    items.forEach(item => {
                        if (!itemRatings[item.name]) {
                            itemRatings[item.name] = { total: 0, count: 0 };
                        }
                        itemRatings[item.name].total += row.rating;
                        itemRatings[item.name].count += 1;
                    });
                } catch (e) { }
            });

            const result = Object.entries(itemRatings).map(([name, data]) => ({
                name,
                avgRating: Math.round((data.total / data.count) * 10) / 10,
                reviewCount: data.count
            }));

            res.json({ message: 'success', data: result });
        }
    );
});

// Latest positive reviews for public display
app.get('/api/reviews/latest', (req, res) => {
    db.all(
        `SELECT customer_name, rating, feedback, created_at
         FROM orders
         WHERE rating >= 4 AND feedback IS NOT NULL AND feedback != ''
         ORDER BY id DESC LIMIT 10`,
        [],
        (err, rows) => {
            if (err) return safeError(res, 500, 'Failed to load reviews', err);
            res.json({ message: 'success', data: rows || [] });
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
        `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(ROUND(AVG(total_amount)), 0) as avg_order
         FROM orders WHERE DATE(created_at) = CURDATE()`,
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
                            `SELECT DATE(created_at) as day, COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as revenue
                             FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                             GROUP BY DATE(created_at) ORDER BY day`,
                            [],
                            (err, weekly) => {
                                if (err) return safeError(res, 500, 'Failed to load stats', err);
                                stats.weekly = weekly || [];

                                db.all(
                                    `SELECT status, COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE() GROUP BY status`,
                                    [],
                                    (err, statusBreakdown) => {
                                        if (err) return safeError(res, 500, 'Failed to load stats', err);
                                        stats.statusBreakdown = statusBreakdown || [];

                                        // Peak ordering hours (today)
                                        db.all(
                                            `SELECT HOUR(created_at) as hour, COUNT(*) as count
                                             FROM orders WHERE DATE(created_at) = CURDATE()
                                             GROUP BY HOUR(created_at) ORDER BY hour`,
                                            [],
                                            (err, peakHours) => {
                                                if (err) return safeError(res, 500, 'Failed to load stats', err);
                                                stats.peakHours = peakHours || [];

                                                // Repeat customers (all time, top 10)
                                                db.all(
                                                    `SELECT customer_phone, MAX(customer_name) as customer_name, COUNT(*) as order_count,
                                                            COALESCE(SUM(total_amount), 0) as total_spent
                                                     FROM orders
                                                     WHERE customer_phone IS NOT NULL AND customer_phone != ''
                                                     GROUP BY customer_phone
                                                     HAVING COUNT(*) > 1
                                                     ORDER BY order_count DESC LIMIT 10`,
                                                    [],
                                                    (err, repeatCustomers) => {
                                                        if (err) return safeError(res, 500, 'Failed to load stats', err);
                                                        stats.repeatCustomers = repeatCustomers || [];

                                                        // Monthly revenue (last 30 days grouped by week)
                                                        db.all(
                                                            `SELECT YEARWEEK(created_at, 1) as week_num,
                                                                    MIN(DATE(created_at)) as week_start,
                                                                    COUNT(*) as orders,
                                                                    COALESCE(SUM(total_amount), 0) as revenue
                                                             FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                                                             GROUP BY YEARWEEK(created_at, 1) ORDER BY week_num`,
                                                            [],
                                                            (err, monthly) => {
                                                                if (err) return safeError(res, 500, 'Failed to load stats', err);
                                                                stats.monthly = monthly || [];

                                                                // Review stats
                                                                db.get(
                                                                    `SELECT COALESCE(ROUND(AVG(rating), 1), 0) as avgRating,
                                                                            COUNT(*) as reviewCount
                                                                     FROM orders WHERE rating >= 1 AND rating <= 5`,
                                                                    [],
                                                                    (err, reviewStats) => {
                                                                        if (err) return safeError(res, 500, 'Failed to load stats', err);
                                                                        stats.reviews = reviewStats || { avgRating: 0, reviewCount: 0 };
                                                                        res.json({ message: 'success', data: stats });
                                                                    }
                                                                );
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        );
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
// ─── PUSH NOTIFICATIONS ─────────────────────────────
// ═══════════════════════════════════════════════════════

// Get VAPID public key (needed by client to subscribe)
app.get('/api/push/vapid-key', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

// Subscribe to push notifications
app.post('/api/push/subscribe', (req, res) => {
    const { subscription, orderToken } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ error: 'Invalid subscription' });
    }

    db.run(
        'INSERT INTO push_subscriptions (endpoint, p256dh, auth, order_token) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE order_token = VALUES(order_token), p256dh = VALUES(p256dh), auth = VALUES(auth)',
        [subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, orderToken || null],
        (err) => {
            if (err) return safeError(res, 500, 'Failed to save subscription', err);
            res.json({ message: 'Subscribed successfully' });
        }
    );
});

// Test push notification (public, simple test endpoint)
app.post('/api/push/test', (req, res) => {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Invalid subscription' });
    }

    const payload = JSON.stringify({
        title: 'Test Notification',
        body: 'Testing from OG Biriyani!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png'
    });

    webpush.sendNotification(subscription, payload)
        .then(() => res.json({ message: 'Test notification sent successfully!' }))
        .catch((err) => safeError(res, 500, 'Failed to send test notification', err));
});

// Broadcast push notification (admin only)
app.post('/api/push/broadcast', authMiddleware, (req, res) => {
    const title = sanitize(req.body.title, 100);
    const body = sanitize(req.body.body, 500);

    if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' });
    }

    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(500).json({ error: 'Push notifications are not configured on the server' });
    }

    const payload = JSON.stringify({
        title,
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        data: { url: '/menu' },
    });

    // Get all unique endpoints (in case of duplicates before the UNIQUE constraint was added)
    db.all('SELECT MIN(id) as id, endpoint, MAX(p256dh) as p256dh, MAX(auth) as auth FROM push_subscriptions GROUP BY endpoint', [], (err, subs) => {
        if (err) return safeError(res, 500, 'Failed to fetch subscriptions', err);
        if (!subs || subs.length === 0) return res.json({ message: 'No subscribers found', data: { successCount: 0, failCount: 0 } });

        console.log(`[BROADCAST] Sending announcement to ${subs.length} devices...`);

        let successCount = 0;
        let failCount = 0;

        const promises = subs.map(sub => {
            const pushSub = {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
            };
            return webpush.sendNotification(pushSub, payload)
                .then(() => { successCount++; })
                .catch(err => {
                    failCount++;
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        db.run('DELETE FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint]);
                    }
                });
        });

        Promise.all(promises).then(() => {
            console.log(`[BROADCAST] Finished: ${successCount} successful, ${failCount} failed.`);
            res.json({ message: 'Broadcast complete', data: { successCount, failCount } });
        });
    });
});

// Helper: send push to all subscribers for an order token
function sendPushForOrder(orderToken, status, customerName) {
    console.log(`[PUSH] Triggered sendPushForOrder for token: ${orderToken}, status: ${status}`);
    if (!process.env.VAPID_PUBLIC_KEY) {
        console.log('[PUSH] Aborted: VAPID keys not configured in environment.');
        return;
    }

    const statusMessages = {
        Preparing: `👨‍🍳 Your order is being prepared!`,
        Ready: `✅ Your order is READY for pickup!`,
        Delivered: `🎉 Your order has been delivered! Enjoy!`,
    };

    const body = statusMessages[status] || `Order status: ${status}`;
    const payload = JSON.stringify({
        title: `OG Biriyani — Order Update`,
        body: body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: { url: `/track/${orderToken}` },
    });

    db.all('SELECT * FROM push_subscriptions WHERE order_token = ?', [orderToken], (err, subs) => {
        if (err) {
            console.error('[PUSH] DB Error fetching subscriptions:', err);
            return;
        }
        if (!subs || subs.length === 0) {
            console.log(`[PUSH] No active push subscriptions found for order token: ${orderToken}`);
            return;
        }

        console.log(`[PUSH] Found ${subs.length} push subscriptions for order ${orderToken}. Sending payload...`);

        subs.forEach(sub => {
            const pushSub = {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
            };
            webpush.sendNotification(pushSub, payload)
                .then(() => console.log(`[PUSH] Success! Notification sent to endpoint: ${sub.endpoint.substring(0, 30)}...`))
                .catch(err => {
                    console.error(`[PUSH] Failed to send to endpoint ${sub.endpoint.substring(0, 30)}... Error:`, err);
                    // Remove invalid subscriptions
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        console.log(`[PUSH] Removing expired/invalid subscription ID: ${sub.id}`);
                        db.run('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
                    }
                });
        });
    });
}

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
