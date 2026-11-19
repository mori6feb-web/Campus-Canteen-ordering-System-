// ================= CART =================

let cart = [];

function addToCart(name, price) {
    const existingItem = cart.find(item => item.name === name);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            name: name,
            price: Number(price),
            quantity: 1
        });
    }

    displayCart();
    alert(name + " added to cart!");
}

function displayCart() {
    const cartItems = document.getElementById("cartItems");
    const cartTotal = document.getElementById("cartTotal");

    if (!cartItems) return;

    cartItems.innerHTML = "";

    let total = 0;

    if (cart.length === 0) {
        cartItems.innerHTML = "<p>Your cart is empty.</p>";

        if (cartTotal) {
            cartTotal.innerText = "0";
        }

        return;
    }

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        cartItems.innerHTML += `
            <div class="cart-item">
                <div>
                    <h3>${item.name}</h3>
                    <p>₹${item.price} × ${item.quantity}</p>
                </div>

                <div>
                    <button onclick="decreaseQuantity(${index})">−</button>
                    <span>${item.quantity}</span>
                    <button onclick="increaseQuantity(${index})">+</button>
                    <button onclick="removeItem(${index})">Remove</button>
                </div>
            </div>
        `;
    });

    if (cartTotal) {
        cartTotal.innerText = total;
    }
}

function increaseQuantity(index) {
    if (cart[index]) {
        cart[index].quantity++;
        displayCart();
    }
}

function decreaseQuantity(index) {
    if (cart[index]) {
        if (cart[index].quantity > 1) {
            cart[index].quantity--;
        } else {
            cart.splice(index, 1);
        }

        displayCart();
    }
}

function removeItem(index) {
    cart.splice(index, 1);
    displayCart();
}

function showCart() {
    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    alert(
        "Items in Cart: " + cart.length +
        "\nTotal Amount: ₹" + total
    );
}

// ================= CHECKOUT / PLACE ORDER =================

async function checkout() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login before placing an order.");
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch("/api/orders", {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },

            body: JSON.stringify({
                items: cart
            })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.message || "Order failed.");
            return;
        }

        alert(
            "Order placed successfully!" +
            "\nOrder ID: " + result.orderId +
            "\nTotal Amount: ₹" + result.total
        );

        cart = [];
        displayCart();

    } catch (error) {
        console.error("Checkout error:", error);
        alert("Unable to connect to server. Please try again.");
    }
}

// ================= REGISTER =================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();

        const email = document.getElementById("registerEmail").value.trim();

        const password =
            document.getElementById("registerPassword").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            alert("Password and Confirm Password do not match.");
            return;
        }

        try {
            const response = await fetch("/api/register", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || "Registration failed.");
                return;
            }

            alert(result.message || "Registration successful!");

            registerForm.reset();

            window.location.href = "login.html";

        } catch (error) {
            console.error("Register error:", error);
            alert("Unable to connect to server.");
        }
    });
}

// ================= LOGIN =================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const emailInput =
            document.getElementById("loginEmail") ||
            document.getElementById("email");

        const passwordInput =
            document.getElementById("loginPassword") ||
            document.getElementById("password");

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        try {
            const response = await fetch("/api/login", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || "Login failed.");
                return;
            }

            localStorage.setItem("token", result.token);

            localStorage.setItem(
                "user",
                JSON.stringify(result.user)
            );

            alert("Login successful!");

            window.location.href = "index.html";

        } catch (error) {
            console.error("Login error:", error);
            alert("Unable to connect to server.");
        }
    });
}

// ================= MY ORDERS =================

async function loadMyOrders() {
    const ordersList = document.getElementById("ordersList");

    if (!ordersList) return;

    const token = localStorage.getItem("token");

    if (!token) {
        ordersList.innerHTML = `
            <p>Please login to view your orders.</p>
            <a href="login.html">Login Here</a>
        `;
        return;
    }

    ordersList.innerHTML = "<p>Loading your orders...</p>";

    try {
        const response = await fetch("/api/my-orders", {
            method: "GET",

            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const orders = await response.json();

        if (!response.ok) {
            ordersList.innerHTML = `
                <p>${orders.message || "Unable to load orders."}</p>
            `;
            return;
        }

        if (!Array.isArray(orders) || orders.length === 0) {
            ordersList.innerHTML = "<p>No orders found.</p>";
            return;
        }

        ordersList.innerHTML = orders.map(order => `
            <div class="food-card order-card">

                <h3>Order #${order.id}</h3>

                <p>
                    <strong>Date:</strong>
                    ${order.created_at}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${order.status}
                </p>

                <h4>Ordered Items:</h4>

                ${order.items.map(item => `
                    <p>
                        ${item.name || "Food"} -
                        ${item.quantity} × ₹${item.price}
                    </p>
                `).join("")}

                <h3>Total: ₹${order.total_amount}</h3>

            </div>
        `).join("");

    } catch (error) {
        console.error("My Orders error:", error);

        ordersList.innerHTML = `
            <p>Unable to connect to server.</p>
        `;
    }
}

// ================= INITIALIZE =================

displayCart();

if (document.getElementById("ordersList")) {
    loadMyOrders();
}
