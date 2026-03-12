/**
 * RENTMS AUTHENTICATION LOGIC  v2
 * Handles: Login (landlord/tenant + admin), Registration,
 *          Forgot/Reset Password, Password Visibility,
 *          Session-expired banner, Password strength validation
 *
 * Requires: api.js loaded before this script
 * Dark mode locked — no theme logic
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ─────────────────────────────────────────────
     ELEMENT REFS
  ───────────────────────────────────────────── */
  const loginForm           = document.getElementById('login-form');
  const adminLoginForm      = document.getElementById('admin-login-form');
  const registerForm        = document.getElementById('register-form');
  const forgotForm          = document.getElementById('forgot-form');
  const resetForm           = document.getElementById('reset-form');

  const passwordInput       = document.getElementById('password');
  const newPasswordInput    = document.getElementById('new_password');
  const confirmPasswordInput= document.getElementById('confirm_password');
  const submitBtn           = document.getElementById('submit-btn');
  const errorContainer      = document.getElementById('error-container');
  const errorMessage        = document.getElementById('error-message');
  const successContainer    = document.getElementById('success-container');
  const successMessage      = document.getElementById('success-message');

  const loader  = submitBtn?.querySelector('.loader');
  const btnText = submitBtn?.querySelector('span');

  /* ─────────────────────────────────────────────
     UI HELPERS
  ───────────────────────────────────────────── */
  function showError(msg) {
    if (successContainer) successContainer.setAttribute('hidden', '');
    if (errorContainer && errorMessage) {
      errorMessage.textContent = msg;
      errorContainer.removeAttribute('hidden');
      errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      alert(msg);
    }
  }

  function showSuccess(msg) {
    if (errorContainer) errorContainer.setAttribute('hidden', '');
    if (successContainer && successMessage) {
      successMessage.textContent = msg;
      successContainer.removeAttribute('hidden');
    }
  }

  function hideMessages() {
    if (errorContainer)   errorContainer.setAttribute('hidden', '');
    if (successContainer) successContainer.setAttribute('hidden', '');
  }

  function setLoading(isLoading, text = 'Processing…') {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    submitBtn.style.opacity = isLoading ? '0.75' : '1';
    if (loader)   isLoading ? loader.removeAttribute('hidden')  : loader.setAttribute('hidden', '');
    if (btnText) {
      if (isLoading) {
        btnText.textContent = text;
      } else if (adminLoginForm) {
        btnText.textContent = 'Login to Admin';
      } else if (loginForm) {
        btnText.textContent = 'Login to Dashboard';
      } else if (registerForm) {
        btnText.textContent = 'Create Account';
      } else if (forgotForm) {
        btnText.textContent = 'Send Reset Link';
      } else if (resetForm) {
        btnText.textContent = 'Set New Password';
      }
    }
  }

  /* ─────────────────────────────────────────────
     PASSWORD VISIBILITY TOGGLE  (supports multiple fields)
  ───────────────────────────────────────────── */
  const eyeOpen = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const eyeOff  = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

  document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    const targetId = btn.dataset.togglePassword || 'password';
    const input    = document.getElementById(targetId);
    if (!input) return;
    btn.innerHTML  = eyeOpen;
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? eyeOff : eyeOpen;
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  // Legacy single toggle support (original toggle-password id)
  const legacyToggle = document.getElementById('toggle-password');
  if (legacyToggle && passwordInput && !legacyToggle.dataset.togglePassword) {
    legacyToggle.addEventListener('click', () => {
      const show = passwordInput.type === 'password';
      passwordInput.type = show ? 'text' : 'password';
      legacyToggle.innerHTML = show ? eyeOff : eyeOpen;
      legacyToggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  }

  /* ─────────────────────────────────────────────
     PASSWORD STRENGTH  (register + reset forms)
     Checks: min 8 chars, 1 uppercase, 1 number
  ───────────────────────────────────────────── */
  function validatePassword(pw) {
    const errors = [];
    if (pw.length < 8)          errors.push('at least 8 characters');
    if (!/[A-Z]/.test(pw))      errors.push('one uppercase letter');
    if (!/[0-9]/.test(pw))      errors.push('one number');
    return errors;
  }

  /* Live strength indicator if the element exists */
  const strengthBar  = document.getElementById('password-strength');
  const activePassInput = newPasswordInput || passwordInput;

  if (strengthBar && activePassInput && (registerForm || resetForm)) {
    activePassInput.addEventListener('input', () => {
      const pw     = activePassInput.value;
      const errors = validatePassword(pw);
      const score  = 3 - errors.length; // 0–3
      const levels = ['', 'weak', 'fair', 'strong'];
      const colors = ['', '#ef4444', '#f59e0b', '#10b981'];
      strengthBar.style.width  = pw.length ? (score / 3 * 100) + '%' : '0%';
      strengthBar.style.background = colors[score] || '#ef4444';
      strengthBar.title = pw.length ? (score === 3 ? 'Strong password' : 'Missing: ' + errors.join(', ')) : '';
    });
  }

  /* ─────────────────────────────────────────────
     SESSION-EXPIRED / REGISTERED BANNERS
  ───────────────────────────────────────────── */
  function showToast(text, color = '#6ee7b7', border = 'rgba(16,185,129,0.4)', bg = 'rgba(16,185,129,0.15)') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed; top:20px; right:20px; z-index:9999;
      background:${bg}; border:1px solid ${border};
      color:${color}; padding:12px 18px; border-radius:10px;
      font-size:0.875rem; font-weight:600; font-family:inherit;
      animation:fadeInOut 4s ease forwards;
    `;
    toast.textContent = text;
    document.body.appendChild(toast);
    if (!document.getElementById('_toastKeyframes')) {
      const style = document.createElement('style');
      style.id = '_toastKeyframes';
      style.textContent = `@keyframes fadeInOut {
        0%   { opacity:0; transform:translateY(-10px); }
        15%  { opacity:1; transform:translateY(0); }
        75%  { opacity:1; }
        100% { opacity:0; }
      }`;
      document.head.appendChild(style);
    }
    setTimeout(() => toast.remove(), 4000);
  }

  const params = new URLSearchParams(location.search);

  if (params.get('session')) {
    const reasons = {
      expired  : '⚠ Your session expired. Please log in again.',
      invalid  : '⚠ Invalid session. Please log in again.',
      logout   : '✓ You have been logged out.',
    };
    const msg = reasons[params.get('session')] || '⚠ Please log in to continue.';
    const isLogout = params.get('session') === 'logout';
    showToast(
      msg,
      isLogout ? '#6ee7b7' : '#fbbf24',
      isLogout ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)',
      isLogout ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'
    );
  }

  if (params.get('registered')) {
    showToast('✓ Account created! Please log in.');
  }

  if (params.get('reset')) {
    showToast('✓ Password updated! Please log in.');
  }

  /* ─────────────────────────────────────────────
     LOGIN  (landlord / tenant)
  ───────────────────────────────────────────── */
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideMessages();
      setLoading(true, 'Verifying…');

      const { email, password } = Object.fromEntries(new FormData(loginForm));

      const res = await API.Auth.login(email, password);

      if (res.ok) {
        API.saveSession(res.token, res.user);
        const role = res.user?.role;
        window.location.href = role === 'tenant'
          ? '../tenant/dashboard.html'
          : '../landlord/dashboard.html';
      } else {
        showError(res.message || 'Invalid email or password.');
        setLoading(false);
      }
    });
  }

  /* ─────────────────────────────────────────────
     ADMIN LOGIN
  ───────────────────────────────────────────── */
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideMessages();
      setLoading(true, 'Verifying…');

      const { email, password } = Object.fromEntries(new FormData(adminLoginForm));

      const res = await API.Auth.adminLogin(email, password);

      if (res.ok) {
        const role = res.user?.role;
        if (!['admin', 'super_admin'].includes(role)) {
          showError('Access denied. Admin accounts only.');
          setLoading(false);
          return;
        }
        // Store under admin_token / admin_user to match api.js KEYS.admin
        localStorage.setItem('admin_token', res.token);
        localStorage.setItem('admin_user',  JSON.stringify(res.user));
        window.location.href = '../admin/dashboard.html';
      } else {
        showError(res.message || 'Invalid credentials.');
        setLoading(false);
      }
    });
  }

  /* ─────────────────────────────────────────────
     REGISTER
  ───────────────────────────────────────────── */
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideMessages();

      const data = Object.fromEntries(new FormData(registerForm));

      /* Client-side validation */
      if (confirmPasswordInput && data.password !== data.confirm_password) {
        showError('Passwords do not match.');
        return;
      }
      const pwErrors = validatePassword(data.password || '');
      if (pwErrors.length) {
        showError(`Password must contain ${pwErrors.join(', ')}.`);
        return;
      }

      // Don't send confirm_password to the server
      delete data.confirm_password;

      setLoading(true, 'Creating Account…');

      const res = await API.Auth.register(data);

      if (res.ok) {
        window.location.href = 'login.html?registered=1';
      } else {
        showError(res.message || 'Registration failed. Please try again.');
        setLoading(false);
      }
    });
  }

  /* ─────────────────────────────────────────────
     FORGOT PASSWORD
  ───────────────────────────────────────────── */
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideMessages();
      setLoading(true, 'Sending…');

      const { email } = Object.fromEntries(new FormData(forgotForm));
      const res = await API.Auth.forgotPassword(email);

      // Always show success to avoid email enumeration
      showSuccess('If that email is registered, a reset link has been sent.');
      setLoading(false);

      if (!res.ok) {
        console.warn('[auth] forgot-password:', res.message);
      }
    });
  }

  /* ─────────────────────────────────────────────
     RESET PASSWORD
     Expects ?token=... in the URL
  ───────────────────────────────────────────── */
  if (resetForm) {
    const resetToken = params.get('token');

    // Validate the token on page load
    if (!resetToken) {
      showError('Invalid or missing reset link. Please request a new one.');
      if (submitBtn) submitBtn.disabled = true;
    } else {
      API.Auth.verifyResetToken(resetToken).then(res => {
        if (!res.ok) {
          showError('This reset link has expired or is invalid. Please request a new one.');
          if (submitBtn) submitBtn.disabled = true;
        }
      });
    }

    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideMessages();

      const data = Object.fromEntries(new FormData(resetForm));
      const newPw  = data.new_password  || data.password;
      const confPw = data.confirm_password;

      if (confPw && newPw !== confPw) {
        showError('Passwords do not match.');
        return;
      }
      const pwErrors = validatePassword(newPw || '');
      if (pwErrors.length) {
        showError(`Password must contain ${pwErrors.join(', ')}.`);
        return;
      }

      setLoading(true, 'Saving…');
      const res = await API.Auth.resetPassword(resetToken, newPw);

      if (res.ok) {
        window.location.href = 'login.html?reset=1';
      } else {
        showError(res.message || 'Failed to reset password. Please try again.');
        setLoading(false);
      }
    });
  }

});