
// ================= CAMPUS CANTEEN JAVASCRIPT =================

// ================= CART =================

let cart = [];

function addToCart(name, price) {
    let existingItem = cart.find(item => item.name === name);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            name: name,
            price: price,
            quantity: 1
        });
    }

    displayCart();
}

function displayCart() {
    const cartItems = document.getElementById("cartItems");
    const cartTotal = document.getElementById("cartTotal");

    if (!cartItems) return;

    cartItems.innerHTML = "";
    let total = 0;

    if (cart.length === 0) {
        cartItems.innerHTML = "<p>Your cart is empty.</p>";
        if (cartTotal) cartTotal.innerText = "0";
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

    if (cartTotal) cartTotal.innerText = total;
}

function increaseQuantity(index) {
    cart[index].quantity++;
    displayCart();
}

function decreaseQuantity(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity--;
    }
    displayCart();
}

function removeItem(index) {
    cart.splice(index, 1);
    displayCart();
}

function checkout() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    alert("Order placed successfully!");
}

function showCart() {
    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;
    });

    alert(
        "Items in Cart: " + cart.length +
        "\nTotal Amount: ₹" + total
    );
}


// ================= REGISTER FORM =================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const message = document.getElementById("message");

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name, email, password })
            });

            const result = await response.json();

            if (!response.ok) {
                if (message) {
                    message.textContent = result.message || "Registration failed";
                } else {
                    alert(result.message || "Registration failed");
                }
                return;
            }

            if (message) {
                message.textContent = "Registration successful! Please login.";
            } else {
                alert("Registration successful! Please login.");
            }

            registerForm.reset();

        } catch (error) {
            alert("Unable to connect to server. Please try again.");
        }
    });
}


// ================= LOGIN FORM =================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const emailInput =
            document.getElementById("email") ||
            document.getElementById("loginEmail");

        const passwordInput =
            document.getElementById("password") ||
            document.getElementById("loginPassword");

        const email = emailInput ? emailInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";

        if (!email || !password) {
            alert("Please enter Email and Password");
            return;
        }

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || "Login failed");
                return;
            }

            if (result.token) {
                localStorage.setItem("token", result.token);
            }

            if (result.user) {
                localStorage.setItem("user", JSON.stringify(result.user));
            }

            alert("Login successful!");
            window.location.href = "index.html";

        } catch (error) {
            alert("Unable to connect to server. Please try again.");
        }
    });
}
