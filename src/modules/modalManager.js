/**
 * Modal Manager Module
 * Handles modal open/close with GSAP animations
 */

import gsap from 'gsap';

const openModals = new Set();
const escHandlers = new Map(); // Track ESC handlers for cleanup

/**
 * Open a modal with animation
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  // Show modal
  modal.classList.add('active');
  openModals.add(modalId);

  // Animate
  const container = modal.querySelector('.modal__container');

  gsap.fromTo(modal.querySelector('.modal__backdrop'),
    { opacity: 0 },
    { opacity: 1, duration: 0.3, ease: 'power2.out' }
  );

  gsap.fromTo(container,
    { opacity: 0, y: 30, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
  );

  // Setup close handlers
  const backdrop = modal.querySelector('.modal__backdrop');
  const closeBtn = modal.querySelector('.modal__close');

  const closeHandler = () => closeModal(modalId);

  backdrop?.addEventListener('click', closeHandler, { once: true });
  closeBtn?.addEventListener('click', closeHandler, { once: true });

  // ESC key to close - store reference for cleanup
  const escHandler = (e) => {
    if (e.key === 'Escape' && openModals.has(modalId)) {
      closeModal(modalId);
    }
  };
  escHandlers.set(modalId, escHandler);
  document.addEventListener('keydown', escHandler);
}

/**
 * Close a modal with animation
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal || !openModals.has(modalId)) return;

  // Remove ESC handler
  const escHandler = escHandlers.get(modalId);
  if (escHandler) {
    document.removeEventListener('keydown', escHandler);
    escHandlers.delete(modalId);
  }

  const container = modal.querySelector('.modal__container');

  // Animate out
  gsap.to(modal.querySelector('.modal__backdrop'), {
    opacity: 0,
    duration: 0.25,
    ease: 'power2.in'
  });

  gsap.to(container, {
    opacity: 0,
    y: 20,
    scale: 0.95,
    duration: 0.25,
    ease: 'power2.in',
    onComplete: () => {
      modal.classList.remove('active');
      openModals.delete(modalId);

      // Restore body scroll if no modals open
      if (openModals.size === 0) {
        document.body.style.overflow = '';
      }
    }
  });
}

/**
 * Close all open modals
 */
export function closeAllModals() {
  openModals.forEach(modalId => closeModal(modalId));
}

/**
 * Check if a modal is open
 */
export function isModalOpen(modalId) {
  return openModals.has(modalId);
}

/**
 * Initialize modal close buttons
 */
export function initModals() {
  // Find all modals and setup backdrop click
  document.querySelectorAll('.modal').forEach(modal => {
    const modalId = modal.id;
    const backdrop = modal.querySelector('.modal__backdrop');
    const closeBtn = modal.querySelector('.modal__close');

    if (backdrop) {
      backdrop.addEventListener('click', () => closeModal(modalId));
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeModal(modalId));
    }
  });
}

export default {
  openModal,
  closeModal,
  closeAllModals,
  isModalOpen,
  initModals
};
