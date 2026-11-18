PRAGMA foreign_keys = ON;

-- 1. FOOD ITEMS TABLE
CREATE TABLE IF NOT EXISTS food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image TEXT,
    category TEXT,
    available INTEGER DEFAULT 1
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    food_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (food_item_id) REFERENCES food_items(id)
);

-- CHECK TABLES
SELECT name
FROM sqlite_master
WHERE type = 'table'
AND name NOT LIKE 'sqlite_%';

-- CHECK FOOD ITEMS
SELECT * FROM food_items;

-- CHECK USERS
SELECT * FROM users;

-- CHECK ORDERS
SELECT * FROM orders;

-- CHECK ORDER ITEMS
SELECT * FROM order_items;