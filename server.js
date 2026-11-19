const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET =
    process.env.JWT_SECRET || "campus_canteen_secret_change_this";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= DATABASE =================

const dbPath =
    process.env.DB_PATH || path.join(__dirname, "campus_canteen.db");

const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image TEXT,
    category TEXT,
    available INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    food_item_id INTEGER,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (food_item_id) REFERENCES food_items(id)
);
`);

// ================= SAMPLE FOOD =================

const foodCount = db.prepare(
    "SELECT COUNT(*) AS count FROM food_items"
).get();

if (foodCount.count === 0) {
    const insertFood = db.prepare(`
        INSERT INTO food_items
        (name, description, price, category, available)
        VALUES (?, ?, ?, ?, 1)
    `);

    insertFood.run("Pizza", "Cheese pizza", 80, "Meals");
    insertFood.run("Burger", "Vegetable burger", 60, "Snacks");
    insertFood.run("Sandwich", "Vegetable sandwich", 50, "Breakfast");
    insertFood.run("French Fries", "Crispy fries", 40, "Snacks");
    insertFood.run("Thali", "Vegetarian meal", 100, "Meals");
    insertFood.run("Cold Drink", "Refreshing drink", 30, "Drinks");
    insertFood.run("Hakka Noodles", "Vegetable noodles", 70, "Meals");
    insertFood.run("Pasta", "White sauce pasta", 80, "Meals");
    insertFood.run("Maggi", "Masala Maggi", 40, "Snacks");
}

// ================= AUTHENTICATION =================

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Please login first."
        });
    }

    try {
        const token = authHeader.split(" ")[1];
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
}

// ================= REGISTER =================

function registerUser(req, res) {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters."
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        const existingUser = db.prepare(
            "SELECT id FROM users WHERE email = ?"
        ).get(cleanEmail);

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered. Please login."
            });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);

        const result = db.prepare(`
            INSERT INTO users (name, email, password)
            VALUES (?, ?, ?)
        `).run(cleanName, cleanEmail, hashedPassword);

        res.status(201).json({
            success: true,
            message: "Registration successful! Please login.",
            user: {
                id: result.lastInsertRowid,
                name: cleanName,
                email: cleanEmail
            }
        });

    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            success: false,
            message: "Registration failed. Please try again."
        });
    }
}

app.post("/api/register", registerUser);
app.post("/api/auth/signup", registerUser);

// ================= LOGIN =================

function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter email and password."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const user = db.prepare(
            "SELECT * FROM users WHERE email = ?"
        ).get(cleanEmail);

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const token = createToken(user);

        res.json({
            success: true,
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });
    }
}

app.post("/api/login", loginUser);
app.post("/api/auth/login", loginUser);

// ================= CURRENT USER =================

app.get("/api/auth/me", authMiddleware, (req, res) => {
    try {
        const user = db.prepare(`
            SELECT id, name, email
            FROM users
            WHERE id = ?
        `).get(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.json({ user });

    } catch (error) {
        console.error("Current user error:", error);
        res.status(500).json({
            message: "Unable to get user details."
        });
    }
});

// ================= FOOD ITEMS =================

app.get("/api/food-items", (req, res) => {
    try {
        const foods = db.prepare(`
            SELECT *
            FROM food_items
            WHERE available = 1
            ORDER BY id
        `).all();

        res.json(foods);

    } catch (error) {
        console.error("Food error:", error);
        res.status(500).json({
            message: "Unable to load food items."
        });
    }
});

// ================= CREATE ORDER =================

app.post("/api/orders", authMiddleware, (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Your cart is empty."
            });
        }

        let total = 0;

        for (const item of items) {
            const quantity = Number(item.quantity);
            const price = Number(item.price);

            if (
                !item.name ||
                !Number.isInteger(quantity) ||
                quantity < 1 ||
                !Number.isFinite(price) ||
                price <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid food item in cart."
                });
            }

            total += price * quantity;
        }

        const createOrder = db.transaction(() => {

            const orderResult = db.prepare(`
                INSERT INTO orders (user_id, total_amount)
                VALUES (?, ?)
            `).run(req.user.id, total);

            const findFood = db.prepare(`
                SELECT id
                FROM food_items
                WHERE name = ?
            `);

            const insertFood = db.prepare(`
                INSERT INTO food_items
                (name, description, price, category, available)
                VALUES (?, ?, ?, ?, 1)
            `);

            const insertOrderItem = db.prepare(`
                INSERT INTO order_items
                (order_id, food_item_id, quantity, price)
                VALUES (?, ?, ?, ?)
            `);

            for (const item of items) {
                let food = findFood.get(item.name);

                if (!food) {
                    const newFood = insertFood.run(
                        item.name,
                        item.name,
                        Number(item.price),
                        "Other"
                    );

                    food = {
                        id: newFood.lastInsertRowid
                    };
                }

                insertOrderItem.run(
                    orderResult.lastInsertRowid,
                    food.id,
                    Number(item.quantity),
                    Number(item.price)
                );
            }

            return orderResult.lastInsertRowid;
        });

        const orderId = createOrder();

        res.status(201).json({
            success: true,
            message: "Order placed successfully!",
            orderId,
            total
        });

    } catch (error) {
        console.error("Order error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to place order."
        });
    }
});

// ================= MY ORDERS =================

app.get("/api/my-orders", authMiddleware, (req, res) => {
    try {
        const orders = db.prepare(`
            SELECT *
            FROM orders
            WHERE user_id = ?
            ORDER BY id DESC
        `).all(req.user.id);

        const getOrderItems = db.prepare(`
            SELECT
                food_items.name AS name,
                order_items.quantity AS quantity,
                order_items.price AS price
            FROM order_items
            LEFT JOIN food_items
            ON order_items.food_item_id = food_items.id
            WHERE order_items.order_id = ?
        `);

        const result = orders.map(order => ({
            ...order,
            items: getOrderItems.all(order.id)
        }));

        res.json(result);

    } catch (error) {
        console.error("My Orders error:", error);

        res.status(500).json({
            message: "Unable to load your orders."
        });
    }
});

// ================= DATABASE TABLES =================

app.get("/api/database-tables", (req, res) => {
    try {
        const tables = db.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            ORDER BY name
        `).all();

        res.json(tables);

    } catch (error) {
        res.status(500).json({
            message: "Unable to get database tables."
        });
    }
});

// ================= HEALTH CHECK =================

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Campus Canteen server is running."
    });
});

// ================= FRONTEND =================

app.use(express.static(__dirname));

app.get("/", (req, res) => {
    const indexPath = path.join(__dirname, "index.html");

    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }

    res.send("Campus Canteen Server is Running");
});

// ================= START SERVER =================

app.listen(PORT, "0.0.0.0", () => {
    console.log("Campus Canteen Server Started");
    console.log("Port:", PORT);
    console.log("Database:", dbPath);
});
