document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (!response.ok) {
            message.textContent = result.message;
            return;
        }

        localStorage.setItem("user", JSON.stringify(result.user));
        message.textContent = "Login successful!";

        window.location.href = "index.html";
    } catch (error) {
        message.textContent = "Unable to connect to server.";
    }
});