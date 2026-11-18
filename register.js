document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        const result = await response.json();

        if (!response.ok) {
            message.textContent = result.message;
            return;
        }

        message.textContent = "Registration successful! Please login.";
        document.getElementById("registerForm").reset();

    } catch (error) {
        message.textContent = "Unable to connect to server.";
    }
});
