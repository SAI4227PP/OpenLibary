// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const togglePasswordBtn = document.getElementById('togglePassword');
const rememberMeCheckbox = document.getElementById('rememberMe');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const user = checkAuth();
    if (user) {
        redirectToHome();
        return;
    }

    // Restore saved email if remember me was checked
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMeCheckbox.checked = true;
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
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // Simulate authentication
        const user = await authenticateUser(email, password);
        
        if (user) {
            // Handle remember me
            if (rememberMeCheckbox.checked) {
                localStorage.setItem('savedEmail', email);
            } else {
                localStorage.removeItem('savedEmail');
            }

            // Save user session
            localStorage.setItem('user', JSON.stringify(user));

            // Redirect to homepage or previous page
            const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
            window.location.href = redirectUrl || '../index.html';
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
    } else if (password.length < 6) {
        showInputError(passwordError, 'Password must be at least 6 characters');
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
    emailError.textContent = '';
    passwordError.textContent = '';
    errorMessage.classList.add('hidden');
    emailError.parentElement.classList.remove('has-error');
    passwordError.parentElement.classList.remove('has-error');
}

// Show/hide password
togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePasswordBtn.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
});

// Authentication simulation
async function authenticateUser(email, password) {
    // In a real app, this would be an API call
    const mockUsers = [
        {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User'
        }
    ];

    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (user) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
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

// Social authentication handlers
document.querySelector('.social-btn.google').addEventListener('click', () => {
    // In a real app, this would initiate Google OAuth flow
    alert('Google authentication would be implemented here');
});

document.querySelector('.social-btn.github').addEventListener('click', () => {
    // In a real app, this would initiate GitHub OAuth flow
    alert('GitHub authentication would be implemented here');
});

// Navigation
function redirectToHome() {
    window.location.href = '../index.html';
}

// Handle forgot password
document.querySelector('.forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    // In a real app, this would open a forgot password flow
    alert('Forgot password functionality would be implemented here');
});