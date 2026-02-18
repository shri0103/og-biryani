const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DBSOURCE = path.join(__dirname, "db.sqlite");

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log('Connected to the SQLite database.');

        // Enable WAL mode for better concurrent read/write performance
        db.run('PRAGMA journal_mode=WAL');
        db.run('PRAGMA busy_timeout=5000'); // Wait 5s instead of failing on lock

        // Create Menu Table
        db.run(`CREATE TABLE IF NOT EXISTS menu (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            price INTEGER,
            category TEXT,
            image TEXT,
            tag TEXT DEFAULT '',
            is_today_special INTEGER DEFAULT 0,
            available_days TEXT DEFAULT ''
        )`, (err) => {
            if (err) {
                console.error("Error creating menu table:", err);
            } else {
                // Add columns if missing (for existing databases)
                db.run(`ALTER TABLE menu ADD COLUMN tag TEXT DEFAULT ''`, () => { });
                db.run(`ALTER TABLE menu ADD COLUMN is_today_special INTEGER DEFAULT 0`, () => { });
                db.run(`ALTER TABLE menu ADD COLUMN available_days TEXT DEFAULT ''`, () => { });

                db.get("SELECT count(*) as count FROM menu", [], (err, row) => {
                    if (err) return;
                    if (row.count === 0) {
                        const insert = 'INSERT INTO menu (name, description, price, category, image, tag) VALUES (?,?,?,?,?,?)';
                        db.run(insert, ["Chicken Biryani", "Flavorful chicken biryani cooked to perfection.", 80, "Main Course", "", ""]);
                        db.run(insert, ["Egg Biryani", "Delicious egg biryani with rich masala.", 65, "Main Course", "", ""]);
                        db.run(insert, ["MT Biryani", "Classic mutton biryani with aromatic spices.", 50, "Main Course", "", ""]);
                        db.run(insert, ["Chicken 65 (100g)", "Spicy, deep-fried chicken appetizer.", 60, "Appetizer", "", "New"]);
                        db.run(insert, ["Special Combo", "MT Biryani + Omelette + 7UP", 85, "Combo", "", "Special"]);
                        console.log("Menu seeded.");
                    }
                });
            }
        });

        // Create Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            items TEXT,
            total_amount INTEGER,
            customer_name TEXT,
            customer_phone TEXT,
            status TEXT DEFAULT 'Received',
            order_token TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error("Error creating orders table:", err);
            } else {
                // Add columns if they don't exist (for existing databases)
                db.run(`ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'Received'`, () => { });
                db.run(`ALTER TABLE orders ADD COLUMN order_token TEXT`, () => { });
                db.run(`ALTER TABLE orders ADD COLUMN rating INTEGER DEFAULT 0`, () => { });
                db.run(`ALTER TABLE orders ADD COLUMN feedback TEXT DEFAULT ''`, () => { });
            }
        });

        // Create Coupons Table
        db.run(`CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            discount_percent INTEGER DEFAULT 10,
            max_uses INTEGER DEFAULT 100,
            used_count INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error("Error creating coupons table:", err);
            } else {
                // Seed a default coupon
                db.get("SELECT count(*) as count FROM coupons", [], (err, row) => {
                    if (err) return;
                    if (row.count === 0) {
                        db.run('INSERT INTO coupons (code, discount_percent, max_uses) VALUES (?, ?, ?)', ['WELCOME10', 10, 100]);
                        db.run('INSERT INTO coupons (code, discount_percent, max_uses) VALUES (?, ?, ?)', ['OG20', 20, 50]);
                        console.log("Default coupons seeded.");
                    }
                });
            }
        });

        // Create Admin Users Table
        db.run(`CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error("Error creating admin_users table:", err);
            } else {
                // Seed default admin if none exists
                db.get("SELECT count(*) as count FROM admin_users", [], (err, row) => {
                    if (err) return;
                    if (row.count === 0) {
                        const hashedPassword = bcrypt.hashSync('og2026', 10);
                        db.run(
                            'INSERT INTO admin_users (username, password) VALUES (?, ?)',
                            ['admin', hashedPassword],
                            (err) => {
                                if (err) {
                                    console.error("Error seeding admin:", err);
                                } else {
                                    console.log("Default admin created (admin / og2026)");
                                }
                            }
                        );
                    }
                });
            }
        });
    }
});

// Helper: generate unique order token
db.generateOrderToken = () => {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
};

module.exports = db;
