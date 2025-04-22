// DOM Elements
const signupForm = document.getElementById('signupForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const termsCheckbox = document.getElementById('terms');
const togglePasswordBtn = document.getElementById('togglePassword');
const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
const loading = document.getElementById('loading');

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const user = checkAuth();
    if (user) {
        redirectToHome();
        return;
    }
    
    updateAuthUI();
});

// Form submission
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
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
        
        // Store user data in localStorage
        localStorage.setItem('registeredUsers', JSON.stringify([
            ...JSON.parse(localStorage.getItem('registeredUsers') || '[]'),
            formData
        ]));

        // Remove password from session data
        const { password, ...user } = formData;
        
        // Save user session
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update navigation UI
        updateAuthUI();
            
        // Show success message and redirect
        alert('Account created successfully! Welcome to Open Library.');
        window.location.href = '../index.html';

    } catch (error) {
        console.error('Registration error:', error);
    } finally {
        hideLoading();
    }
});

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

// Loading state
function showLoading() {
    loading.classList.remove('hidden');
    signupForm.querySelector('button[type="submit"]').disabled = true;
}

function hideLoading() {
    loading.classList.add('hidden');
    signupForm.querySelector('button[type="submit"]').disabled = false;
}

// Navigation
function redirectToHome() {
    window.location.href = '../index.html';
}