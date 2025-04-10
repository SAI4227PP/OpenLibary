// DOM Elements
const signupForm = document.getElementById('signupForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const termsCheckbox = document.getElementById('terms');
const nameError = document.getElementById('nameError');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');
const termsError = document.getElementById('termsError');
const togglePasswordBtn = document.getElementById('togglePassword');
const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');

// Password requirement elements
const lengthReq = document.getElementById('lengthReq');
const upperReq = document.getElementById('upperReq');
const lowerReq = document.getElementById('lowerReq');
const numberReq = document.getElementById('numberReq');

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const user = checkAuth();
    if (user) {
        redirectToHome();
        return;
    }

    // Initial password requirement check
    updatePasswordRequirements(passwordInput.value);
});

// Form submission
signupForm.addEventListener('submit', async (e) => {
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
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value
        };
        
        // Simulate user registration
        const user = await registerUser(formData);
        
        if (user) {
            // Save user session
            localStorage.setItem('user', JSON.stringify(user));

            // Show success message and redirect
            alert('Account created successfully! Welcome to Open Library.');
            window.location.href = '../index.html';
        } else {
            showError('Registration failed. Please try again.');
        }

    } catch (error) {
        console.error('Registration error:', error);
        showError('An error occurred. Please try again.');
    } finally {
        hideLoading();
    }
});

// Form validation
function validateForm() {
    let isValid = true;

    // Validate name
    const name = nameInput.value.trim();
    if (!name) {
        showInputError(nameError, 'Name is required');
        isValid = false;
    } else if (name.length < 2) {
        showInputError(nameError, 'Name must be at least 2 characters');
        isValid = false;
    }

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
    } else if (!isValidPassword(password)) {
        showInputError(passwordError, 'Password does not meet requirements');
        isValid = false;
    }

    // Validate confirm password
    const confirmPassword = confirmPasswordInput.value;
    if (!confirmPassword) {
        showInputError(confirmPasswordError, 'Please confirm your password');
        isValid = false;
    } else if (password !== confirmPassword) {
        showInputError(confirmPasswordError, 'Passwords do not match');
        isValid = false;
    }

    // Validate terms acceptance
    if (!termsCheckbox.checked) {
        showInputError(termsError, 'You must accept the Terms of Service and Privacy Policy');
        isValid = false;
    }

    return isValid;
}

// Password validation
function isValidPassword(password) {
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasLength && hasUpper && hasLower && hasNumber;
}

// Update password requirement indicators
passwordInput.addEventListener('input', (e) => {
    updatePasswordRequirements(e.target.value);
});

function updatePasswordRequirements(password) {
    // Length requirement
    if (password.length >= 8) {
        lengthReq.classList.add('met');
    } else {
        lengthReq.classList.remove('met');
    }

    // Uppercase requirement
    if (/[A-Z]/.test(password)) {
        upperReq.classList.add('met');
    } else {
        upperReq.classList.remove('met');
    }

    // Lowercase requirement
    if (/[a-z]/.test(password)) {
        lowerReq.classList.add('met');
    } else {
        lowerReq.classList.remove('met');
    }

    // Number requirement
    if (/[0-9]/.test(password)) {
        numberReq.classList.add('met');
    } else {
        numberReq.classList.remove('met');
    }
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
    [nameError, emailError, passwordError, confirmPasswordError, termsError].forEach(error => {
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

toggleConfirmPasswordBtn.addEventListener('click', () => {
    const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
    confirmPasswordInput.type = type;
    toggleConfirmPasswordBtn.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
});

// User registration simulation
async function registerUser(userData) {
    // In a real app, this would be an API call
    // For demo purposes, just check if email is already taken
    const mockUsers = [
        { email: 'test@example.com' }
    ];

    if (mockUsers.some(user => user.email === userData.email)) {
        throw new Error('Email already registered');
    }

    // Return user object without password
    const { password, ...user } = userData;
    return user;
}

// Loading state
function showLoading() {
    loading.classList.remove('hidden');
    signupForm.querySelector('button[type="submit"]').disabled = true;
}

function hideLoading() {
    loading.classList.add('hidden');
    signupForm.querySelector('button[type="submit"]').disabled = false;
}

// Error handling
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Social registration handlers
document.querySelector('.social-btn.google').addEventListener('click', () => {
    // In a real app, this would initiate Google OAuth flow
    alert('Google registration would be implemented here');
});

document.querySelector('.social-btn.github').addEventListener('click', () => {
    // In a real app, this would initiate GitHub OAuth flow
    alert('GitHub registration would be implemented here');
});

// Navigation
function redirectToHome() {
    window.location.href = '../index.html';
}