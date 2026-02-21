const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════
// ─── AIVEN MYSQL CONNECTION POOL ─────────────────────
// ═══════════════════════════════════════════════════════

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: {
        // Aiven uses its own CA — still encrypted, just accept their cert
        rejectUnauthorized: false,
    },
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 30000,          // 30s timeout (Aiven can be slow after pause)
    enableKeepAlive: true,          // TCP keep-alive — prevents ECONNRESET
    keepAliveInitialDelay: 30000,   // first keep-alive probe after 30s idle
});

let keepAliveTimer = null;

// Test the connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ MySQL connection failed:', err.message);
        console.error('   Check your MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE in .env');
        return;
    }
    console.log('✅ Connected to Aiven MySQL database.');
    connection.release();

    // Initialize tables and seed data
    initializeDatabase();

    // ─── Keep-Alive Ping (prevents Aiven free-tier auto-pause) ───
    const PING_INTERVAL = 4 * 60 * 60 * 1000; // every 4 hours
    keepAliveTimer = setInterval(() => {
        pool.query('SELECT 1', (err) => {
            if (err) {
                console.error('⚠️  Keep-alive ping failed:', err.message);
            } else {
                console.log('💚 Keep-alive ping OK —', new Date().toLocaleString());
            }
        });
    }, PING_INTERVAL);
    console.log('🔄 Keep-alive ping scheduled (every 4 hours)');
});

// ═══════════════════════════════════════════════════════
// ─── CALLBACK-STYLE WRAPPER (matches old SQLite API) ─
// ═══════════════════════════════════════════════════════

const db = {
    // Run a query (INSERT, UPDATE, DELETE) — callback gets (err, result)
    // result.insertId = last inserted ID
    // result.affectedRows = number of rows changed
    run(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        pool.query(sql, params || [], (err, result) => {
            if (callback) {
                callback.call(
                    { lastID: result ? result.insertId : null, changes: result ? result.affectedRows : 0 },
                    err,
                    result
                );
            }
        });
    },

    // Get a single row — callback gets (err, row)
    get(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        pool.query(sql, params || [], (err, rows) => {
            if (callback) callback(err, rows ? rows[0] : undefined);
        });
    },

    // Get all rows — callback gets (err, rows)
    all(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        pool.query(sql, params || [], (err, rows) => {
            if (callback) callback(err, rows || []);
        });
    },

    // Generate unique order token
    generateOrderToken() {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    },

    // Close the pool
    close(callback) {
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        pool.end((err) => {
            if (callback) callback(err);
        });
    },
};

// ═══════════════════════════════════════════════════════
// ─── TABLE CREATION & SEEDING ────────────────────────
// ═══════════════════════════════════════════════════════

function initializeDatabase() {
    // Create Menu Table
    pool.query(`CREATE TABLE IF NOT EXISTS menu (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200),
        description VARCHAR(500),
        price INT,
        category VARCHAR(100),
        image TEXT,
        tag VARCHAR(50) DEFAULT '',
        is_today_special INT DEFAULT 0,
        available_days VARCHAR(100) DEFAULT '',
        is_active INT DEFAULT 1
    )`, (err) => {
        if (err) {
            console.error('Error creating menu table:', err.message);
        } else {
            // Seed menu items if empty
            pool.query('SELECT COUNT(*) AS count FROM menu', (err, rows) => {
                if (err) return;
                if (rows[0].count === 0) {
                    const insert = 'INSERT INTO menu (name, description, price, category, image, tag) VALUES (?,?,?,?,?,?)';
                    pool.query(insert, ["Chicken Biryani", "Flavorful chicken biryani cooked to perfection.", 80, "Main Course", "", ""]);
                    pool.query(insert, ["Egg Biryani", "Delicious egg biryani with rich masala.", 65, "Main Course", "", ""]);
                    pool.query(insert, ["MT Biryani", "Classic mutton biryani with aromatic spices.", 50, "Main Course", "", ""]);
                    pool.query(insert, ["Chicken 65 (100g)", "Spicy, deep-fried chicken appetizer.", 60, "Appetizer", "", "New"]);
                    pool.query(insert, ["Special Combo", "MT Biryani + Omelette + 7UP", 85, "Combo", "", "Special"]);
                    console.log('Menu seeded.');
                }
            });
        }
    });

    // Create Orders Table
    pool.query(`CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        items TEXT,
        total_amount INT,
        customer_name VARCHAR(200),
        customer_phone VARCHAR(30),
        status VARCHAR(30) DEFAULT 'Received',
        order_token VARCHAR(50) UNIQUE,
        rating INT DEFAULT 0,
        feedback TEXT DEFAULT NULL,
        scheduled_date DATE DEFAULT NULL,
        scheduled_time VARCHAR(20) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating orders table:', err.message);
        } else {
            // Seed sample orders with reviews so star ratings display on menu
            pool.query('SELECT COUNT(*) AS count FROM orders WHERE rating >= 1', (err, rows) => {
                if (err) return;
                if (rows[0].count === 0) {
                    const insertOrder = `INSERT INTO orders (items, total_amount, customer_name, customer_phone, status, order_token, rating, feedback) VALUES (?,?,?,?,?,?,?,?)`;
                    pool.query(insertOrder, [
                        JSON.stringify([{ name: 'Chicken Biryani', price: 80, quantity: 2 }]),
                        160, 'Ravi Kumar', '9876543210', 'Delivered', 'REVIEW01', 5,
                        'Best biryani in town! The chicken was so tender and flavorful. Will definitely order again!'
                    ]);
                    pool.query(insertOrder, [
                        JSON.stringify([{ name: 'Egg Biryani', price: 65, quantity: 1 }, { name: 'Chicken 65 (100g)', price: 60, quantity: 1 }]),
                        125, 'Priya Lakshmi', '9876543211', 'Delivered', 'REVIEW02', 4,
                        'Egg biryani was perfectly spiced. Chicken 65 was crispy and delicious!'
                    ]);
                    pool.query(insertOrder, [
                        JSON.stringify([{ name: 'MT Biryani', price: 50, quantity: 3 }]),
                        150, 'Karthik S', '9876543212', 'Delivered', 'REVIEW03', 5,
                        'Amazing mutton biryani! Authentic taste, generous portions. Highly recommended!'
                    ]);
                    pool.query(insertOrder, [
                        JSON.stringify([{ name: 'Special Combo', price: 85, quantity: 1 }, { name: 'Chicken Biryani', price: 80, quantity: 1 }]),
                        165, 'Deepa M', '9876543213', 'Delivered', 'REVIEW04', 4,
                        'Love the special combo! Great value for money. The biryani never disappoints.'
                    ]);
                    console.log('Sample reviews seeded.');
                }
            });
        }
    });

    // Create Coupons Table
    pool.query(`CREATE TABLE IF NOT EXISTS coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE,
        discount_percent INT DEFAULT 10,
        max_uses INT DEFAULT 100,
        used_count INT DEFAULT 0,
        is_active INT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating coupons table:', err.message);
        } else {
            pool.query('SELECT COUNT(*) AS count FROM coupons', (err, rows) => {
                if (err) return;
                if (rows[0].count === 0) {
                    pool.query('INSERT INTO coupons (code, discount_percent, max_uses) VALUES (?, ?, ?)', ['WELCOME10', 10, 100]);
                    pool.query('INSERT INTO coupons (code, discount_percent, max_uses) VALUES (?, ?, ?)', ['OG20', 20, 50]);
                    console.log('Default coupons seeded.');
                }
            });
        }
    });

    // Create Admin Users Table
    pool.query(`CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE,
        password VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating admin_users table:', err.message);
        } else {
            pool.query('SELECT COUNT(*) AS count FROM admin_users', (err, rows) => {
                if (err) return;
                if (rows[0].count === 0) {
                    const hashedPassword = bcrypt.hashSync('OG@Biriyani#2026!Secure', 12);
                    pool.query(
                        'INSERT INTO admin_users (username, password) VALUES (?, ?)',
                        ['admin', hashedPassword],
                        (err) => {
                            if (err) {
                                console.error('Error seeding admin:', err.message);
                            } else {
                                console.log("Default admin created (admin / OG@Biriyani#2026!Secure)");
                            }
                        }
                    );
                }
            });
        }
    });

    // Create Push Subscriptions Table
    pool.query(`CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        endpoint VARCHAR(500) UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth VARCHAR(255) NOT NULL,
        order_token VARCHAR(50) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating push_subscriptions table:', err.message);
    });

    // ─── MIGRATIONS: add columns to existing tables safely ───
    pool.query('ALTER TABLE menu ADD COLUMN is_active INT DEFAULT 1', (err) => {
        if (err && !err.message.includes('Duplicate column')) {
            console.error('Migration error (is_active):', err.message);
        }
    });
    pool.query('ALTER TABLE orders ADD COLUMN scheduled_date DATE DEFAULT NULL', (err) => {
        if (err && !err.message.includes('Duplicate column')) {
            console.error('Migration error (scheduled_date):', err.message);
        }
    });
    pool.query('ALTER TABLE orders ADD COLUMN scheduled_time VARCHAR(20) DEFAULT NULL', (err) => {
        if (err && !err.message.includes('Duplicate column')) {
            console.error('Migration error (scheduled_time):', err.message);
        }
    });
}

module.exports = db;
