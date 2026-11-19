const express = require("express");

const app = express();

const PORT = 3000;

app.use(express.static("."));

app.listen(PORT, () => {
    console.log(`Campus Canteen server running at http://localhost:${PORT}`);
});

const express = require("express");

const app = express();
const PORT = 3000;

// Form data read karne ke liye
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// HTML, CSS, JS files serve karne ke liye
app.use(express.static("."));

// Temporary users storage
let users = [];

// REGISTER
app.post("/register", (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.send("Please fill all fields.");
    }

    const existingUser = users.find(user => user.email === email);

    if (existingUser) {
        return res.send("Email already registered.");
    }

    users.push({
        name: name,
        email: email,
        password: password
    });

    res.send(`
        <h2>Registration Successful! ✅</h2>
        <p>Welcome, ${name}</p>
        <a href="/login.html">Go to Login</a>
    `);
});
