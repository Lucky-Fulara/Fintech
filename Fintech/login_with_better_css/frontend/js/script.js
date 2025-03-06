const BASE_URL = "http://localhost:5000"; // Adjust if needed

// ✅ Toggle Login & Register Forms
function toggleForms() {
    document.getElementById("registerForm").style.display =
        document.getElementById("registerForm").style.display === "none" ? "block" : "none";
    document.getElementById("loginForm").style.display =
        document.getElementById("loginForm").style.display === "none" ? "block" : "none";
}

// ✅ Show Toast Message
function showMessage(type, message) {
    const container = document.getElementById('messageContainer');
    if (!container) return;

    const msgElement = document.createElement('div');
    msgElement.className = `toast-message ${type.toLowerCase()}`;
    msgElement.innerText = `${type.toUpperCase()}: ${message}`;

    container.appendChild(msgElement);

    setTimeout(() => msgElement.remove(), 4000);
}

// ✅ Show/Hide Button Loading
function toggleLoading(button, isLoading, text = "Processing...") {
    if (isLoading) {
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<span class="loader"></span> ${text}`;
        button.disabled = true;
    } else {
        button.innerHTML = button.dataset.originalText;
        button.disabled = false;
    }
}

// ✅ Register User (with OTP Trigger)
async function registerUser(event) {
    event.preventDefault();

    const button = event.target.querySelector("button[type='submit']");
    toggleLoading(button, true, "Registering...");

    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!emailPattern.test(email)) {
        showMessage("error", "Invalid email format.");
        toggleLoading(button, false);
        return;
    }

    if (!passwordPattern.test(password)) {
        showMessage("warning", "Password must be 8+ characters, with uppercase, lowercase, number, and special character.");
        toggleLoading(button, false);
        return;
    }

    if (password !== confirmPassword) {
        showMessage("error", "Passwords do not match!");
        toggleLoading(button, false);
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        showMessage(response.ok ? "success" : "error", data.message);

        if (response.ok) {
            document.getElementById("registerForm").style.display = "none";
            document.getElementById("otpForm").style.display = "block";
            document.getElementById("otpEmail").value = email;

            clearInterval(window.otpTimer);
            startOTPTimer(60);
        }
    } catch (error) {
        showMessage("error", "Error during registration. Please try again.");
    } finally {
        toggleLoading(button, false);
    }
}

// ✅ Login User (No OTP required for login anymore)
async function loginUser(event) {
    event.preventDefault();

    const button = event.target.querySelector("button[type='submit']");
    toggleLoading(button, true, "Logging in...");

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        showMessage("error", "Invalid email format.");
        toggleLoading(button, false);
        return;
    }

    if (!password) {
        showMessage("warning", "Please enter your password.");
        toggleLoading(button, false);
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        showMessage(response.ok ? "success" : "error", data.message);

        if (response.ok) {
            window.location.href = "http://127.0.0.1:5050"; // No OTP step here
        }
    } catch (error) {
        showMessage("error", "Login failed. Please try again.");
    } finally {
        toggleLoading(button, false);
    }
}

// ✅ Verify OTP after registration
async function verifyOTP(event) {
    event.preventDefault();

    const button = event.target.querySelector("button[type='submit']");
    toggleLoading(button, true, "Verifying...");

    const email = document.getElementById("otpEmail").value;
    const otp = [...document.querySelectorAll(".otp-input")].map(input => input.value.trim()).join("");

    if (otp.length !== 5) {
        showMessage("warning", "Please enter the full 5-digit OTP.");
        toggleLoading(button, false);
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp }),
        });

        const data = await response.json();
        if (response.ok) {
            showMessage("success", "OTP verified successfully! Redirecting...");
            window.location.href = "http://127.0.0.1:5050";
        } else {
            showMessage("error", data.error || "Invalid OTP.");
        }
    } catch (error) {
        showMessage("error", "Error verifying OTP. Try again.");
    } finally {
        toggleLoading(button, false);
    }
}

// ✅ Resend OTP
async function resendOTP() {
    const button = document.getElementById("resendOTPBtn");
    toggleLoading(button, true, "Resending...");

    const email = document.getElementById("otpEmail").value;

    try {
        const response = await fetch(`${BASE_URL}/auth/resend-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        if (response.ok) {
            showMessage("success", "New OTP sent!");
            clearInterval(window.otpTimer);
            startOTPTimer(300);
        } else {
            showMessage("error", "Failed to resend OTP.");
        }
    } catch (error) {
        showMessage("error", "Error resending OTP. Please try again.");
    } finally {
        toggleLoading(button, false);
    }
}

// ✅ OTP Input Navigation
function moveToNext(input, nextId, prevId) {
    if (input.value.length === 1 && nextId) {
        document.getElementById(nextId).focus();
    } else if (input.value.length === 0 && prevId) {
        document.getElementById(prevId).focus();
    }
}

// ✅ OTP Countdown Timer (set to 5 minutes = 300 seconds)
function startOTPTimer(duration = 300) {  // Default to 5 minutes if no duration passed
    const timerDisplay = document.getElementById("otpTimer");
    const resendBtn = document.getElementById("resendOTPBtn");

    clearInterval(window.otpTimer);  // Clear any existing timer
    resendBtn.disabled = true;  // Disable resend button initially

    let timeLeft = duration;  // Start countdown at 5 minutes

    window.otpTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        timerDisplay.textContent = `Resend OTP in ${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

        if (timeLeft <= 0) {
            clearInterval(window.otpTimer);
            timerDisplay.textContent = "";
            resendBtn.disabled = false;  // Enable resend button after 5 minutes
        }
        timeLeft--;
    }, 1000);
}
