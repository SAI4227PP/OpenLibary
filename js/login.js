// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const loading = document.getElementById('loading');
const rememberMe = document.getElementById('rememberMe');

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in and came from another page
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
        }

    } catch (error) {
        console.error('Login error:', error);
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

// User login simulation
async function loginUser(credentials) {
    const mockUser = {
        email: 'test@example.com',
        password: 'Test123!',
        name: 'Test User'
    };

    if (credentials.email === mockUser.email && credentials.password === mockUser.password) {
        const { password, ...user } = mockUser;
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