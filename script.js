let foods = [];
let cart = [];

const foodMenu = document.getElementById("foodMenu");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const message = document.getElementById("message");

const currentUser = JSON.parse(localStorage.getItem("user"));

if (currentUser) {
    document.getElementById("userName").textContent =
        "Hi, " + currentUser.name;

    document.getElementById("loginLink").style.display = "none";
    document.getElementById("registerLink").style.display = "none";
    document.getElementById("logoutBtn").style.display = "inline-block";
}

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.reload();
});

async function loadFoods() {
    try {
        const response = await fetch("/api/foods");
        foods = await response.json();
        displayFoods();
    } catch (error) {
        foodMenu.textContent = "Unable to load food menu.";
    }
}

function displayFoods() {
    foodMenu.innerHTML = "";

    foods.forEach(food => {
        const card = document.createElement("div");
        card.className = "food-card";

        const name = document.createElement("h3");
        name.textContent = food.name;

        const category = document.createElement("p");
        category.textContent = food.category;

        const price = document.createElement("p");
        price.textContent = "₹" + food.price;

        const button = document.createElement("button");
        button.textContent = "Add to Cart";
        button.addEventListener("click", () => addToCart(food.food_id));

        card.append(name, category, price, button);
        foodMenu.appendChild(card);
    });
}

function addToCart(foodId) {
    const existing = cart.find(item => item.food_id === foodId);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ food_id: foodId, quantity: 1 });
    }

    displayCart();
}

function displayCart() {
    cartItems.innerHTML = "";

    if (cart.length === 0) {
        cartItems.textContent = "Your cart is empty.";
    }

    let total = 0;

    cart.forEach(item => {
        const food = foods.find(f => f.food_id === item.food_id);
        if (!food) return;

        total += food.price * item.quantity;

        const row = document.createElement("div");
        row.className = "cart-row";

        const details = document.createElement("span");
        details.textContent =
            `${food.name} × ${item.quantity} = ₹${food.price * item.quantity}`;

        const remove = document.createElement("button");
        remove.textContent = "Remove";
        remove.addEventListener("click", () => {
            cart = cart.filter(i => i.food_id !== item.food_id);
            displayCart();
        });

        row.append(details, remove);
        cartItems.appendChild(row);
    });

    cartTotal.textContent = "Total: ₹" + total;
}

document.getElementById("checkoutBtn").addEventListener("click", placeOrder);

async function placeOrder() {
    message.textContent = "";

    if (!currentUser) {
        message.textContent = "Please login before placing an order.";
        return;
    }

    if (cart.length === 0) {
        message.textContent = "Please add food items to your cart.";
        return;
    }

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: currentUser.user_id,
                items: cart
            })
        });

        const result = await response.json();

        if (!response.ok) {
            message.textContent = result.message;
            return;
        }

        message.textContent =
            `Order placed successfully! Order ID: ${result.order_id}`;

        cart = [];
        displayCart();
    } catch (error) {
        message.textContent = "Something went wrong. Please try again.";
    }
}

loadFoods();