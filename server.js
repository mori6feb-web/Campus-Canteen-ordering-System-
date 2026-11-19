const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "campus_canteen_secret_change_this";

// ---------------- MIDDLEWARE ----------------

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// React build available hoy to te serve karse
const clientBuildPath = path.join(__dirname, "client", "dist");

if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
} else {
    app.use(express.static(__dirname));
}

// ---------------- DATABASE CONNECTION ----------------

const dbPath = path.join(__dirname, "campus_canteen.db");
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

console.log("SQLite Database Connected Successfully!");

// ---------------- CREATE DATABASE TABLES ----------------

db.exec(`
    CREATE TABLE IF NOT EXISTS food_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image TEXT,
        category TEXT,
        available INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        food_item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (food_item_id) REFERENCES food_items(id)
    );
`);

// Existing orders table ma created_at missing hoy to add karse
const orderColumns = db.prepare(
    "PRAGMA table_info(orders)"
).all().map(column => column.name);

if (!orderColumns.includes("created_at")) {
    db.exec(`
        ALTER TABLE orders ADD COLUMN created_at DATETIME
    `);

    db.exec(`
        UPDATE orders
        SET created_at = CURRENT_TIMESTAMP
        WHERE created_at IS NULL
    `);
}

console.log("All 4 Database Tables Checked Successfully!");

// ---------------- JWT AUTHENTICATION ----------------

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Please login first."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
}

// ---------------- REGISTER API ----------------

app.post("/api/auth/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill all fields."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters."
            });
        }

        const existingUser = db.prepare(
            "SELECT id FROM users WHERE email = ?"
        ).get(email.trim().toLowerCase());

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = db.prepare(`
            INSERT INTO users (name, email, password)
            VALUES (?, ?, ?)
        `).run(
            name.trim(),
            email.trim().toLowerCase(),
            hashedPassword
        );

        res.status(201).json({
            success: true,
            message: "Registration successful!",
            userId: result.lastInsertRowid
        });

    } catch (error) {
        console.error("Signup Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Registration failed."
        });
    }
});

// ---------------- LOGIN API ----------------

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const user = db.prepare(`
            SELECT * FROM users WHERE email = ?
        `).get(email.trim().toLowerCase());

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            success: true,
            message: "Login successful!",
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Login failed."
        });
    }
});

// ---------------- CHECK LOGIN USER ----------------

app.get("/api/auth/me", authenticateToken, (req, res) => {
    const user = db.prepare(`
        SELECT id, name, email
        FROM users
        WHERE id = ?
    `).get(req.user.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found."
        });
    }

    res.json({
        success: true,
        user: user
    });
});

// ---------------- GET FOOD ITEMS ----------------

app.get("/api/food-items", (req, res) => {
    try {
        const foods = db.prepare(`
            SELECT *
            FROM food_items
            WHERE available = 1
            ORDER BY id DESC
        `).all();

        res.json({
            success: true,
            count: foods.length,
            foodItems: foods
        });

    } catch (error) {
        console.error("Food Items Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to get food items."
        });
    }
});

// ---------------- PLACE ORDER ----------------

app.post("/api/orders", authenticateToken, (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Your cart is empty."
            });
        }

        const getFood = db.prepare(`
            SELECT id, name, price
            FROM food_items
            WHERE id = ? AND available = 1
        `);

        const preparedItems = [];
        let totalAmount = 0;

        for (const item of items) {
            const foodId = Number(item.food_item_id || item.id);
            const quantity = Number(item.quantity);

            if (
                !Number.isInteger(foodId) ||
                !Number.isInteger(quantity) ||
                quantity < 1
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid food item or quantity."
                });
            }

            const food = getFood.get(foodId);

            if (!food) {
                return res.status(400).json({
                    success: false,
                    message: "Food item not available."
                });
            }

            preparedItems.push({
                foodId: food.id,
                quantity: quantity,
                price: food.price
            });

            totalAmount += food.price * quantity;
        }

        const placeOrder = db.transaction(() => {
            const orderResult = db.prepare(`
                INSERT INTO orders (user_id, total_amount, status)
                VALUES (?, ?, 'Pending')
            `).run(req.user.id, totalAmount);

            const orderId = orderResult.lastInsertRowid;

            const insertItem = db.prepare(`
                INSERT INTO order_items
                (order_id, food_item_id, quantity, price)
                VALUES (?, ?, ?, ?)
            `);

            for (const item of preparedItems) {
                insertItem.run(
                    orderId,
                    item.foodId,
                    item.quantity,
                    item.price
                );
            }

            return orderId;
        });

        const orderId = placeOrder();

        res.status(201).json({
            success: true,
            message: "Order placed successfully!",
            orderId: orderId,
            totalAmount: totalAmount
        });

    } catch (error) {
        console.error("Order Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to place order."
        });
    }
});

// ---------------- MY ORDERS ----------------

app.get("/api/my-orders", authenticateToken, (req, res) => {
    try {
        const orders = db.prepare(`
            SELECT
                o.id AS order_id,
                o.total_amount,
                o.status,
                o.created_at,
                oi.food_item_id,
                oi.quantity,
                oi.price,
                f.name AS food_name
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN food_items f ON oi.food_item_id = f.id
            WHERE o.user_id = ?
            ORDER BY o.id DESC
        `).all(req.user.id);

        res.json({
            success: true,
            orders: orders
        });

    } catch (error) {
        console.error("My Orders Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to get order history."
        });
    }
});

// ---------------- DATABASE TABLES CHECK ----------------

app.get("/api/database-tables", (req, res) => {
    try {
        const tables = db.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            AND name NOT LIKE 'sqlite_%'
        `).all();

        res.json({
            success: true,
            tables: tables
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ---------------- HOME PAGE ----------------

app.get("/", (req, res) => {
    if (fs.existsSync(path.join(clientBuildPath, "index.html"))) {
        return res.sendFile(
            path.join(clientBuildPath, "index.html")
        );
    }

    res.send("Campus Canteen Backend is Running Successfully!");
});

// ---------------- SERVER START ----------------

app.listen(PORT, () => {
    console.log("------------------------------------");
    console.log("Campus Canteen Server Started!");
    console.log(`Server URL: http://localhost:${PORT}`);
    console.log(`Database: ${dbPath}`);
    console.log("------------------------------------");
});
