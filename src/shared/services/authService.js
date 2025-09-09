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
    const signupForm = document.getElementById('signupForm');

    if (loginForm)
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    if (googleLoginBtn)
      googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
    if (logoutBtn)
      logoutBtn.addEventListener('click', () => this.handleLogout());
    if (signupForm)
      signupForm.addEventListener('submit', (e) => this.handleSignup(e));
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
        this.redirectToDashboard('Successfully logged in!');
      }
    } catch (error) {
      console.error('Login error:', error);
      const message =
        error && error.message
          ? error.message
          : 'Login failed. Please try again.';
      this.showAlert(message, 'error');
    }
  }

  async handleGoogleLogin() {
    try {
      if (!window.chrome || !chrome.identity) {
        this.showAlert('Google Sign-In not supported in this context', 'error');
        return;
      }
      const redirectUrl = chrome.identity.getRedirectURL('oauth2');
      const clientId =
        (chrome.runtime &&
          chrome.runtime.getManifest &&
          chrome.runtime.getManifest().oauth2 &&
          chrome.runtime.getManifest().oauth2.client_id) ||
        '';
      const scope =
        'email profile https://www.googleapis.com/auth/userinfo.email';
      const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${encodeURIComponent(
        clientId
      )}&response_type=token&redirect_uri=${encodeURIComponent(
        redirectUrl
      )}&scope=${encodeURIComponent(scope)}&prompt=consent`;

      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        async (responseUrl) => {
          if (chrome.runtime.lastError || !responseUrl) {
            console.error('WebAuthFlow error:', chrome.runtime.lastError);
            this.showAlert('Google Sign-In failed. Please try again.', 'error');
            return;
          }
          const params = new URL(responseUrl).hash.substring(1);
          const accessToken = new URLSearchParams(params).get('access_token');
          if (!accessToken) {
            this.showAlert('No access token received', 'error');
            return;
          }

          // Exchange Google access token for Firebase credential
          try {
            const credential = firebase.auth.GoogleAuthProvider.credential(
              null,
              accessToken
            );
            const result = await window.firebaseAuth.signInWithCredential(
              credential
            );
            const fUser = result.user;
            // Enforce email verification semantics: Google accounts are trusted as verified
            const user = {
              id: fUser.uid,
              email: fUser.email || '',
              name: fUser.displayName || 'User',
              avatar: fUser.photoURL || '',
              loginType: 'google',
              loginTime: new Date().toISOString(),
            };
            await this.setAuthState(user);
            // Start sync if available
            try {
              const settingsRaw = await chrome.storage.local.get(['settings']);
              const settings = (settingsRaw && settingsRaw.settings) || {};
              const syncOn = settings.syncEnabled !== false; // default on
              if (
                syncOn &&
                window.SyncService &&
                typeof window.SyncService.startSync === 'function'
              ) {
                window.SyncService.startSync(fUser.uid);
              }
            } catch {}
            this.redirectToDashboard('Signed in with Google!');
          } catch (e) {
            console.error('Firebase signInWithCredential error:', e);
            this.showAlert('Google Sign-In failed at Firebase step.', 'error');
          }
        }
      );
    } catch (error) {
      console.error('Google login error:', error);
      this.showAlert('Google login failed. Please try again.', 'error');
    }
  }

  async handleLogout() {
    try {
      if (window.firebaseAuth) {
        await window.firebaseAuth.signOut();
      }
      // stop sync if available
      try {
        if (
          window.SyncService &&
          typeof window.SyncService.stopSync === 'function'
        ) {
          await window.SyncService.stopSync();
        }
      } catch {}
      await this.removeAuthState();
      this.showLoginState();
      this.showAlert('Successfully logged out!', 'success');
      // Close any open extension auth pages (login/verify) after logout
      try {
        if (
          window.chrome &&
          chrome.tabs &&
          chrome.runtime &&
          chrome.runtime.getURL
        ) {
          const urlPrefix = chrome.runtime.getURL('src/pages/');
          chrome.tabs.query({ url: urlPrefix + '*' }, (tabs) => {
            const ids = (tabs || []).map((t) => t.id).filter(Boolean);
            if (ids.length) {
              chrome.tabs.remove(ids);
            } else {
              window.close();
            }
          });
        } else {
          window.close();
        }
      } catch {}
    } catch (error) {
      console.error('Logout error:', error);
      this.showAlert('Logout failed. Please try again.', 'error');
    }
  }

  async handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName')
      ? document.getElementById('signupName').value
      : '';
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const password2 = document.getElementById('signupPassword2').value;

    if (!name || !email || !password || !password2) {
      this.showAlert('Please fill in all fields', 'error');
      return;
    }
    if (password !== password2) {
      this.showAlert('Passwords do not match', 'error');
      return;
    }
    if (!window.firebaseAuth) {
      this.showAlert('Auth not initialized', 'error');
      return;
    }
    try {
      const cred = await window.firebaseAuth.createUserWithEmailAndPassword(
        email,
        password
      );
      const fUser = cred.user;
      try {
        if (name && fUser.updateProfile) {
          await fUser.updateProfile({ displayName: name });
        }
      } catch {}
      await fUser.sendEmailVerification();
      this.showAlert(
        'Verification email sent. Please check your inbox.',
        'success'
      );
      // Redirect to verify page
      try {
        const url =
          (window.chrome &&
            window.chrome.runtime &&
            window.chrome.runtime.getURL &&
            window.chrome.runtime.getURL('src/pages/verify-email.html')) ||
          '../pages/verify-email.html';
        window.location.href = url;
      } catch {
        window.location.href = '../pages/verify-email.html';
      }
    } catch (error) {
      console.error('Signup error:', error);
      const message =
        error && error.message
          ? error.message
          : 'Sign up failed. Please try again.';
      this.showAlert(message, 'error');
    }
  }

  toggleAuthMode(mode) {
    const loginSection = document.getElementById('loginSection');
    const signupSection = document.getElementById('signupSection');
    if (!loginSection || !signupSection) return;
    if (mode === 'signup') {
      loginSection.classList.add('hidden');
      signupSection.classList.remove('hidden');
    } else {
      signupSection.classList.add('hidden');
      loginSection.classList.remove('hidden');
    }
  }

  async authenticateUser(email, password) {
    if (!window.firebaseAuth) {
      throw new Error('Auth not initialized');
    }
    const credential = await window.firebaseAuth.signInWithEmailAndPassword(
      email,
      password
    );
    const fUser = credential.user;
    if (!fUser.emailVerified) {
      // Redirect to verify page and throw to skip UI update
      try {
        const url =
          (window.chrome &&
            window.chrome.runtime &&
            window.chrome.runtime.getURL &&
            window.chrome.runtime.getURL('src/pages/verify-email.html')) ||
          '../pages/verify-email.html';
        window.location.href = url;
      } catch {
        window.location.href = '../pages/verify-email.html';
      }
      throw new Error('Email not verified. Please verify your email.');
    }
    // start sync when verified
    try {
      const settingsRaw = await chrome.storage.local.get(['settings']);
      const settings = (settingsRaw && settingsRaw.settings) || {};
      const syncOn = settings.syncEnabled !== false; // default on
      if (
        syncOn &&
        window.SyncService &&
        typeof window.SyncService.startSync === 'function'
      ) {
        await window.SyncService.startSync(fUser.uid);
      }
    } catch {}
    return {
      id: fUser.uid,
      email: fUser.email || email,
      name: fUser.displayName || 'User',
      avatar: fUser.photoURL || '',
      loginType: 'email',
      loginTime: new Date().toISOString(),
    };
  }

  async setAuthState(user) {
    localStorage.setItem('authUser', JSON.stringify(user));
    console.log('User logged in:', user.email);
    // Dispatch event to notify UI components of auth state change
    window.dispatchEvent(new CustomEvent('authUserUpdated', { detail: user }));
  }

  async removeAuthState() {
    localStorage.removeItem('authUser');
    console.log('User logged out');
    // Dispatch event to notify UI components of auth state change
    window.dispatchEvent(new CustomEvent('authUserUpdated', { detail: null }));
  }

  async checkAuthState() {
    try {
      if (window.firebaseAuth) {
        window.firebaseAuth.onAuthStateChanged((fUser) => {
          if (fUser) {
            if (!fUser.emailVerified) {
              // If already on verify page, do nothing; otherwise redirect
              const onVerifyPage =
                /verify-email\.html$/.test(window.location.pathname) ||
                /verify-email\.html$/.test(window.location.href);
              if (!onVerifyPage) {
                try {
                  const url =
                    (window.chrome &&
                      window.chrome.runtime &&
                      window.chrome.runtime.getURL &&
                      window.chrome.runtime.getURL(
                        'src/pages/verify-email.html'
                      )) ||
                    '../pages/verify-email.html';
                  window.location.href = url;
                } catch {
                  window.location.href = '../pages/verify-email.html';
                }
              }
              return;
            }
            // ensure sync is running
            try {
              chrome.storage.local.get(['settings']).then((s) => {
                const settings = (s && s.settings) || {};
                const syncOn = settings.syncEnabled !== false; // default on
                if (
                  syncOn &&
                  window.SyncService &&
                  typeof window.SyncService.startSync === 'function'
                ) {
                  window.SyncService.startSync(fUser.uid);
                }
              });
            } catch {}
            const user = {
              id: fUser.uid,
              email: fUser.email || '',
              name: fUser.displayName || 'User',
              avatar: fUser.photoURL || '',
              loginType: 'email',
              loginTime: new Date().toISOString(),
            };
            this.setAuthState(user);
            // If already on login page and user is verified, redirect out
            this.redirectToDashboard();
          } else {
            this.removeAuthState();
            this.showLoginState();
          }
        });
      } else {
        // Fallback to local state if auth not loaded yet
        const userStr = localStorage.getItem('authUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          this.showLoggedInState(user);
        } else {
          this.showLoginState();
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      this.showLoginState();
    }
  }

  showLoginState() {
    document.getElementById('loginSection').classList.remove('hidden');

    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
  }

  showLoggedInState(user) {
    // Deprecated in favor of redirectToDashboard
    this.redirectToDashboard();
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

// Navigation helper
AuthManager.prototype.redirectToDashboard = function (message) {
  try {
    const url =
      (window.chrome &&
        window.chrome.runtime &&
        window.chrome.runtime.getURL &&
        window.chrome.runtime.getURL('src/dashboard/index.html')) ||
      '../dashboard/index.html';
    if (message) {
      try {
        alert(message);
      } catch {}
    }
    window.location.href = url;
  } catch {
    window.location.href = '../dashboard/index.html';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  new AuthManager();
});
