// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const loading = document.getElementById('loading');
const rememberMe = document.getElementById('rememberMe');

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const user = checkAuth();
    if (user && document.referrer) {
        redirectToHome();
        return;
    }

    // Check for remembered email
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        emailInput.value = rememberedEmail;
        rememberMe.checked = true;
    }
    
    // Update UI on load
    updateAuthUI();
});

// Form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
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
        
        // Check against registered users
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
            
            // Update navigation UI
            updateAuthUI();

            // Redirect to previous page or home
            const redirect = new URLSearchParams(window.location.search).get('redirect');
            window.location.href = redirect || '../index.html';
        } else {
            alert('Invalid email or password');
        }

    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login');
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

// User login verification
async function loginUser(credentials) {
    // Get registered users from localStorage
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    
    // Find matching user
    const matchedUser = registeredUsers.find(user => 
        user.email === credentials.email && 
        user.password === credentials.password
    );

    if (matchedUser) {
        // Remove password from session data
        const { password, ...user } = matchedUser;
        return user;
    }

    return null;
}

// Loading state
function showLoading() {
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add('loading-active');
    loading.classList.remove('hidden');
    loginForm.querySelector('button[type="submit"]').disabled = true;
}

function hideLoading() {
    loading.classList.add('hidden');
    document.body.classList.remove('loading-active');
    const scrollY = document.body.style.top;
    document.body.style.top = '';
    window.scrollTo(0, parseInt(scrollY || '0') * -1);
    loginForm.querySelector('button[type="submit"]').disabled = false;
}

// Navigation
function redirectToHome() {
    window.location.href = '../index.html';
}