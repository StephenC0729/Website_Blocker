class AuthManager {
    constructor() {
        this.init();
    }

    async init() {
        await this.checkAuthState();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
        logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            this.showAlert('Please enter both email and password', 'error');
            return;
        }

        try {
            const user = await this.authenticateUser(email, password);
            if (user) {
                await this.setAuthState(user);
                this.showLoggedInState(user);
                this.showAlert('Successfully logged in!', 'success');
            } else {
                this.showAlert('Invalid email or password', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('Login failed. Please try again.', 'error');
        }
    }

    async handleGoogleLogin() {
        try {
            this.showAlert('Google login would be implemented here', 'success');
        } catch (error) {
            console.error('Google login error:', error);
            this.showAlert('Google login failed. Please try again.', 'error');
        }
    }

    async handleLogout() {
        try {
            await this.removeAuthState();
            this.showLoginState();
            this.showAlert('Successfully logged out!', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            this.showAlert('Logout failed. Please try again.', 'error');
        }
    }

    async authenticateUser(email, password) {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (email === 'demo@example.com' && password === 'demo123') {
            return {
                id: '1',
                email: email,
                name: 'Demo User',
                avatar: 'https://via.placeholder.com/80x80/667eea/ffffff?text=D',
                loginType: 'email',
                loginTime: new Date().toISOString()
            };
        }
        
        if (email === 'admin@appblocker.com' && password === 'admin123') {
            return {
                id: '2',
                email: email,
                name: 'Admin User',
                avatar: 'https://via.placeholder.com/80x80/28a745/ffffff?text=A',
                loginType: 'email',
                loginTime: new Date().toISOString()
            };
        }
        
        return null;
    }

    async setAuthState(user) {
        localStorage.setItem('authUser', JSON.stringify(user));
        console.log('User logged in:', user.email);
    }

    async removeAuthState() {
        localStorage.removeItem('authUser');
        console.log('User logged out');
    }

    async checkAuthState() {
        try {
            const userStr = localStorage.getItem('authUser');
            if (userStr) {
                const user = JSON.parse(userStr);
                this.showLoggedInState(user);
            } else {
                this.showLoginState();
            }
        } catch (error) {
            console.error('Error checking auth state:', error);
            this.showLoginState();
        }
    }

    showLoginState() {
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('loggedInSection').classList.add('hidden');
        
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
    }

    showLoggedInState(user) {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('loggedInSection').classList.remove('hidden');
        
        document.getElementById('userName').textContent = user.name || 'Welcome!';
        document.getElementById('userEmail').textContent = user.email || '';
        
        const avatar = document.getElementById('userAvatar');
        if (user.avatar) {
            avatar.src = user.avatar;
            avatar.style.display = 'block';
        } else {
            avatar.style.display = 'none';
        }
    }

    showAlert(message, type) {
        const alertContainer = document.getElementById('alertContainer');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});