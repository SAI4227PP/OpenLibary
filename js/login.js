// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const togglePasswordBtn = document.getElementById('togglePassword');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const rememberMe = document.getElementById('rememberMe');

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const user = checkAuth();
    if (user) {
        redirectToHome();
        return;
    }

    // Check for remembered email
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        emailInput.value = rememberedEmail;
        rememberMe.checked = true;
    }
});

// Form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset errors
    resetErrors();
    
    // Validate form
    if (!validateForm()) {
        return;
    }

    // Show loading state
    showLoading();

    try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get form data
        const formData = {
            email: emailInput.value.trim(),
            password: passwordInput.value
        };
        
        // Simulate login
        const user = await loginUser(formData);
        
        if (user) {
            // Handle remember me
            if (rememberMe.checked) {
                localStorage.setItem('rememberedEmail', user.email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            // Save user session
            localStorage.setItem('user', JSON.stringify(user));

            // Redirect to previous page or home
            const redirect = new URLSearchParams(window.location.search).get('redirect');
            window.location.href = redirect || '../index.html';
        } else {
            showError('Invalid email or password');
        }

    } catch (error) {
        console.error('Login error:', error);
        showError('An error occurred. Please try again.');
    } finally {
        hideLoading();
    }
});

// Form validation
function validateForm() {
    let isValid = true;

    // Validate email
    const email = emailInput.value.trim();
    if (!email) {
        showInputError(emailError, 'Email is required');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showInputError(emailError, 'Please enter a valid email address');
        isValid = false;
    }

    // Validate password
    const password = passwordInput.value;
    if (!password) {
        showInputError(passwordError, 'Password is required');
        isValid = false;
    }

    return isValid;
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show input error
function showInputError(element, message) {
    element.textContent = message;
    element.parentElement.classList.add('has-error');
}

// Reset form errors
function resetErrors() {
    [emailError, passwordError].forEach(error => {
        error.textContent = '';
        error.parentElement.classList.remove('has-error');
    });
    errorMessage.classList.add('hidden');
}

// Show/hide password
togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePasswordBtn.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
});

// User login simulation
async function loginUser(credentials) {
    // In a real app, this would be an API call
    // For demo purposes, just check against mock user
    const mockUser = {
        email: 'test@example.com',
        password: 'Test123!', // In real app, this would be hashed
        name: 'Test User'
    };

    if (credentials.email === mockUser.email && credentials.password === mockUser.password) {
        // Return user object without password
        const { password, ...user } = mockUser;
        return user;
    }

    return null;
}

// Loading state
function showLoading() {
    loading.classList.remove('hidden');
    loginForm.querySelector('button[type="submit"]').disabled = true;
}

function hideLoading() {
    loading.classList.add('hidden');
    loginForm.querySelector('button[type="submit"]').disabled = false;
}

// Error handling
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Social login handlers
document.querySelector('.social-btn.google').addEventListener('click', () => {
    // In a real app, this would initiate Google OAuth flow
    alert('Google login would be implemented here');
});

document.querySelector('.social-btn.github').addEventListener('click', () => {
    // In a real app, this would initiate GitHub OAuth flow
    alert('GitHub login would be implemented here');
});

// Forgot password handler
document.querySelector('.forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    // In a real app, this would open a forgot password flow
    alert('Password reset functionality would be implemented here');
});

// Navigation
function redirectToHome() {
    window.location.href = '../index.html';
}