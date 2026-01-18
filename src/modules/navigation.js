import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

/**
 * Initialize navigation functionality
 */
export function initNavigation() {
  const menuToggle = document.getElementById('menuToggle');
  const menuClose = document.getElementById('menuClose');
  const menuOverlay = document.getElementById('menuOverlay');
  const navMenu = document.getElementById('navMenu');
  const menuItems = document.querySelectorAll('[data-nav-target]');

  // Toggle menu on hamburger click
  menuToggle?.addEventListener('click', () => {
    toggleMenu(true);
  });

  // Close menu on close button click
  menuClose?.addEventListener('click', () => {
    toggleMenu(false);
  });

  // Close menu on overlay click
  menuOverlay?.addEventListener('click', () => {
    toggleMenu(false);
  });

  // Handle menu item clicks
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = item.dataset.navTarget;
      transitionToSection(targetSection);
      toggleMenu(false);
    });
  });

  // Close menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu?.classList.contains('active')) {
      toggleMenu(false);
    }
  });
}

/**
 * Toggle the navigation menu open/closed
 * @param {boolean} isOpen - Whether to open or close the menu
 */
function toggleMenu(isOpen) {
  const menuToggle = document.getElementById('menuToggle');
  const menuOverlay = document.getElementById('menuOverlay');
  const navMenu = document.getElementById('navMenu');

  if (isOpen) {
    menuToggle?.classList.add('active');
    menuOverlay?.classList.add('active');
    navMenu?.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Animate menu items in
    gsap.fromTo('.nav-menu__list li',
      { opacity: 0, x: 50 },
      {
        opacity: 1,
        x: 0,
        duration: 0.4,
        stagger: 0.1,
        delay: 0.2,
        ease: 'power2.out'
      }
    );
  } else {
    menuToggle?.classList.remove('active');
    menuOverlay?.classList.remove('active');
    navMenu?.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Transition to a specific section with animated scroll
 * @param {string} sectionId - The data-section value to scroll to
 */
function transitionToSection(sectionId) {
  const targetSection = document.querySelector(`[data-section="${sectionId}"]`);

  if (!targetSection) return;

  // Get all back layers for the transition effect
  const backLayers = document.querySelectorAll('.layer--back');

  // Create a timeline for the transition
  const tl = gsap.timeline();

  // Animate background layers during transition (scale up slightly)
  tl.to(backLayers, {
    scale: 1.1,
    opacity: 0.7,
    duration: 0.4,
    ease: 'power2.in'
  });

  // Scroll to section
  tl.to(window, {
    scrollTo: {
      y: targetSection,
      offsetY: 0
    },
    duration: 1,
    ease: 'power2.inOut'
  }, '-=0.2');

  // Reset background layers
  tl.to(backLayers, {
    scale: 1,
    opacity: 1,
    duration: 0.4,
    ease: 'power2.out'
  }, '-=0.3');
}

/**
 * Initialize header scroll behavior (add background on scroll)
 */
export function initHeaderScroll() {
  const header = document.querySelector('.header');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  });
}

/**
 * Smooth scroll to element (utility function)
 * @param {string|Element} target - CSS selector or element to scroll to
 * @param {number} duration - Animation duration in seconds
 */
export function scrollToElement(target, duration = 1) {
  gsap.to(window, {
    scrollTo: {
      y: target,
      offsetY: 0
    },
    duration,
    ease: 'power2.inOut'
  });
}
