(function () {
  const showAlert = (message, type) => {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.innerHTML = '';
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
  };

  const updateUserEmail = (user) => {
    const el = document.getElementById('verifyEmail');
    if (el) el.textContent = (user && (user.email || '')) || '';
  };

  const redirectToDashboard = () => {
    try {
      const url =
        (window.chrome &&
          window.chrome.runtime &&
          window.chrome.runtime.getURL &&
          window.chrome.runtime.getURL('src/dashboard/index.html')) ||
        '../dashboard/index.html';
      window.location.href = url;
    } catch {
      window.location.href = '../dashboard/index.html';
    }
  };

  const redirectToLogin = () => {
    try {
      const url =
        (window.chrome &&
          window.chrome.runtime &&
          window.chrome.runtime.getURL &&
          window.chrome.runtime.getURL('src/pages/login.html')) ||
        '../pages/login.html';
      window.location.href = url;
    } catch {
      window.location.href = '../pages/login.html';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.firebaseAuth) return;
    window.firebaseAuth.onAuthStateChanged(async (user) => {
      if (!user) {
        redirectToLogin();
        return;
      }
      updateUserEmail(user);
      if (user.emailVerified) {
        redirectToDashboard();
      }
    });

    const resendBtn = document.getElementById('resendBtn');
    const checkBtn = document.getElementById('checkBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (resendBtn)
      resendBtn.addEventListener('click', async () => {
        try {
          const user = window.firebaseAuth.currentUser;
          if (!user) return redirectToLogin();
          await user.sendEmailVerification();
          showAlert(
            'Verification email sent. Please check your inbox.',
            'success'
          );
          resendBtn.disabled = true;
          setTimeout(() => (resendBtn.disabled = false), 30000);
        } catch (e) {
          console.error(e);
          showAlert('Failed to send email. Please try again.', 'error');
        }
      });

    if (checkBtn)
      checkBtn.addEventListener('click', async () => {
        try {
          const user = window.firebaseAuth.currentUser;
          if (!user) return redirectToLogin();
          await user.reload();
          if (user.emailVerified) {
            showAlert('Email verified! Redirecting…', 'success');
            setTimeout(redirectToDashboard, 800);
          } else {
            showAlert(
              'Still not verified. Please click the link in your email.',
              'error'
            );
          }
        } catch (e) {
          console.error(e);
          showAlert('Unable to check verification status.', 'error');
        }
      });

    if (logoutBtn)
      logoutBtn.addEventListener('click', async () => {
        try {
          await window.firebaseAuth.signOut();
          redirectToLogin();
        } catch (e) {
          console.error(e);
          showAlert('Logout failed. Please try again.', 'error');
        }
      });
  });
})();
