/**
 * Authentication Modal Component
 * Handles login and registration UI
 */

import gsap from 'gsap';
import { openModal, closeModal } from '../modules/modalManager.js';
import { signUp, signIn, resetPassword } from '../services/authService.js';
import { isSupabaseConfigured } from '../lib/supabase.js';

const MODAL_ID = 'authModal';

// Current mode: 'login', 'register', or 'reset'
let currentMode = 'login';

// Callback for successful authentication
let onAuthSuccessCallback = null;

/**
 * Initialize the auth modal
 * @param {Function} onAuthSuccess - Called after successful login/register
 */
export function initAuthModal(onAuthSuccess) {
  onAuthSuccessCallback = onAuthSuccess;

  // Form submission
  const form = document.getElementById('authForm');
  form?.addEventListener('submit', handleFormSubmit);

  // Mode toggle links
  document.getElementById('showRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    setMode('register');
  });

  document.getElementById('showLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    setMode('login');
  });

  document.getElementById('showReset')?.addEventListener('click', (e) => {
    e.preventDefault();
    setMode('reset');
  });

  document.getElementById('backToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    setMode('login');
  });

  // Close button and backdrop
  const modal = document.getElementById(MODAL_ID);
  modal?.querySelector('.modal__close')?.addEventListener('click', closeAuthModal);
  modal?.querySelector('.modal__backdrop')?.addEventListener('click', closeAuthModal);
}

/**
 * Open the auth modal
 * @param {string} mode - 'login', 'register', or 'reset'
 */
export function openAuthModal(mode = 'login') {
  if (!isSupabaseConfigured()) {
    showNotConfiguredMessage();
    return;
  }

  setMode(mode);
  clearForm();
  clearError();
  openModal(MODAL_ID);

  // Focus first input after animation
  setTimeout(() => {
    const firstInput = document.querySelector(`#authForm input:not([type="hidden"])`);
    firstInput?.focus();
  }, 300);
}

/**
 * Close the auth modal
 */
export function closeAuthModal() {
  closeModal(MODAL_ID);
  clearForm();
  clearError();
}

/**
 * Set the current mode (login, register, reset)
 */
function setMode(mode) {
  currentMode = mode;

  const title = document.getElementById('authModalTitle');
  const usernameGroup = document.getElementById('usernameGroup');
  const passwordGroup = document.getElementById('passwordGroup');
  const submitBtn = document.getElementById('authSubmitBtn');
  const loginLinks = document.getElementById('loginLinks');
  const registerLinks = document.getElementById('registerLinks');
  const resetLinks = document.getElementById('resetLinks');

  // Hide all link sections first
  loginLinks?.classList.add('hidden');
  registerLinks?.classList.add('hidden');
  resetLinks?.classList.add('hidden');

  switch (mode) {
    case 'login':
      if (title) title.textContent = 'Welcome Back';
      usernameGroup?.classList.add('hidden');
      passwordGroup?.classList.remove('hidden');
      if (submitBtn) submitBtn.textContent = 'Sign In';
      loginLinks?.classList.remove('hidden');
      break;

    case 'register':
      if (title) title.textContent = 'Create Account';
      usernameGroup?.classList.remove('hidden');
      passwordGroup?.classList.remove('hidden');
      if (submitBtn) submitBtn.textContent = 'Create Account';
      registerLinks?.classList.remove('hidden');
      break;

    case 'reset':
      if (title) title.textContent = 'Reset Password';
      usernameGroup?.classList.add('hidden');
      passwordGroup?.classList.add('hidden');
      if (submitBtn) submitBtn.textContent = 'Send Reset Link';
      resetLinks?.classList.remove('hidden');
      break;
  }

  clearError();
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const email = document.getElementById('authEmail')?.value.trim();
  const password = document.getElementById('authPassword')?.value;
  const username = document.getElementById('authUsername')?.value.trim();
  const submitBtn = document.getElementById('authSubmitBtn');
  const originalText = submitBtn.textContent;

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Please wait...';
  clearError();

  try {
    let result;

    switch (currentMode) {
      case 'login':
        result = await signIn(email, password);
        if (result.error) {
          showError(result.error);
        } else {
          showSuccess('Welcome back!');
          setTimeout(() => {
            closeAuthModal();
            onAuthSuccessCallback?.(result.user, result.session);
          }, 1000);
        }
        break;

      case 'register':
        result = await signUp(email, password, username);
        if (result.error) {
          showError(result.error);
        } else {
          showSuccess('Account created! Check your email to verify.');
          setTimeout(() => {
            closeAuthModal();
            onAuthSuccessCallback?.(result.user, null);
          }, 2000);
        }
        break;

      case 'reset':
        result = await resetPassword(email);
        if (result.error) {
          showError(result.error);
        } else {
          showSuccess('Password reset email sent! Check your inbox.');
          setTimeout(() => setMode('login'), 3000);
        }
        break;
    }
  } catch (err) {
    showError('An unexpected error occurred. Please try again.');
    console.error('Auth error:', err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

/**
 * Clear the form inputs
 */
function clearForm() {
  const emailEl = document.getElementById('authEmail');
  const passwordEl = document.getElementById('authPassword');
  const usernameEl = document.getElementById('authUsername');

  if (emailEl) emailEl.value = '';
  if (passwordEl) passwordEl.value = '';
  if (usernameEl) usernameEl.value = '';
}

/**
 * Show error message
 */
function showError(message) {
  const errorEl = document.getElementById('authError');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    errorEl.classList.add('auth-message--error');
    errorEl.classList.remove('auth-message--success');

    gsap.fromTo(errorEl,
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.3 }
    );
  }
}

/**
 * Show success message
 */
function showSuccess(message) {
  const errorEl = document.getElementById('authError');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    errorEl.classList.remove('auth-message--error');
    errorEl.classList.add('auth-message--success');

    gsap.fromTo(errorEl,
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.3 }
    );
  }
}

/**
 * Clear error/success message
 */
function clearError() {
  const errorEl = document.getElementById('authError');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }
}

/**
 * Show message when Supabase is not configured
 */
function showNotConfiguredMessage() {
  alert(
    'Account features are not yet configured.\n\n' +
    'To enable accounts, you need to:\n' +
    '1. Create a Supabase project at supabase.com\n' +
    '2. Set up the database tables (see plan)\n' +
    '3. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local'
  );
}

export default {
  initAuthModal,
  openAuthModal,
  closeAuthModal
};
