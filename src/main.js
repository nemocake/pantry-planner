import './styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

// Import modules
import { initAllParallax, refreshParallax } from './modules/parallax.js';
import { initNavigation, initHeaderScroll } from './modules/navigation.js';
import { initLottieScroll, createScrollIndicatorFallback } from './modules/lottieScroll.js';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/**
 * Initialize section entry animations
 */
function initSectionAnimations() {
  const sections = document.querySelectorAll('.section');

  sections.forEach(section => {
    const content = section.querySelector('.section__content');
    const title = section.querySelector('.section__title');
    const text = section.querySelectorAll('.section__subtitle, .section__text');

    // Create timeline for each section
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        end: 'top 20%',
        toggleActions: 'play none none reverse'
      }
    });

    // Animate title
    if (title) {
      tl.from(title, {
        y: 100,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
      });
    }

    // Animate text elements
    if (text.length > 0) {
      tl.from(text, {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power2.out'
      }, '-=0.5');
    }
  });
}

/**
 * Initialize product card animations
 */
function initProductCardAnimations() {
  const cards = document.querySelectorAll('.product-card');

  cards.forEach((card, index) => {
    gsap.from(card, {
      y: 100,
      opacity: 0,
      duration: 0.6,
      delay: index * 0.1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  });
}

/**
 * Initialize stats counter animation
 */
function initStatsAnimation() {
  const stats = document.querySelectorAll('.stat');

  stats.forEach((stat, index) => {
    const number = stat.querySelector('.stat__number');

    gsap.from(stat, {
      y: 50,
      opacity: 0,
      duration: 0.6,
      delay: index * 0.15,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: stat,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  });
}

/**
 * Initialize intro animation on page load
 */
function initIntroAnimation() {
  const tl = gsap.timeline();

  // Hide everything initially
  gsap.set('.header', { y: -100, opacity: 0 });
  gsap.set('.section--home .section__content', { y: 100, opacity: 0 });
  gsap.set('.section--home .layer', { scale: 1.1, opacity: 0 });

  // Animate in
  tl.to('.section--home .layer--back', {
    scale: 1,
    opacity: 1,
    duration: 1.5,
    ease: 'power2.out'
  })
  .to('.section--home .layer--mid', {
    scale: 1,
    opacity: 0.7,
    duration: 1.2,
    ease: 'power2.out'
  }, '-=1')
  .to('.section--home .layer--front', {
    scale: 1,
    opacity: 0.9,
    duration: 1,
    ease: 'power2.out'
  }, '-=0.8')
  .to('.header', {
    y: 0,
    opacity: 1,
    duration: 0.8,
    ease: 'power2.out'
  }, '-=0.5')
  .to('.section--home .section__content', {
    y: 0,
    opacity: 1,
    duration: 1,
    ease: 'power3.out'
  }, '-=0.5');

  return tl;
}

/**
 * Add scroll indicator fallback styles
 */
function addFallbackStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .scroll-indicator--fallback {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .scroll-indicator__mouse {
      width: 25px;
      height: 40px;
      border: 2px solid rgba(255, 255, 255, 0.7);
      border-radius: 15px;
      position: relative;
    }
    .scroll-indicator__wheel {
      width: 4px;
      height: 8px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 2px;
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      animation: scrollWheel 1.5s ease-in-out infinite;
    }
    @keyframes scrollWheel {
      0%, 100% { opacity: 1; transform: translateX(-50%) translateY(0); }
      50% { opacity: 0.3; transform: translateX(-50%) translateY(10px); }
    }
    .scroll-indicator__arrow {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .scroll-indicator__arrow span {
      display: block;
      width: 10px;
      height: 10px;
      border-right: 2px solid rgba(255, 255, 255, 0.5);
      border-bottom: 2px solid rgba(255, 255, 255, 0.5);
      transform: rotate(45deg);
      margin: -5px;
      animation: scrollArrow 1.5s ease-in-out infinite;
    }
    .scroll-indicator__arrow span:nth-child(2) {
      animation-delay: 0.15s;
    }
    @keyframes scrollArrow {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Main initialization
 */
function init() {
  // Add fallback styles for scroll indicator
  addFallbackStyles();

  // Create scroll indicator fallback (since we don't have a Lottie file)
  createScrollIndicatorFallback();

  // Initialize intro animation first
  const introTl = initIntroAnimation();

  // After intro, initialize other animations
  introTl.eventCallback('onComplete', () => {
    // Initialize parallax system
    initAllParallax();

    // Initialize navigation
    initNavigation();
    initHeaderScroll();

    // Initialize section animations
    initSectionAnimations();
    initProductCardAnimations();
    initStatsAnimation();

    // Initialize Lottie (will gracefully handle missing files)
    initLottieScroll();

    // Refresh ScrollTrigger after all content is ready
    refreshParallax();
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Handle resize events
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    ScrollTrigger.refresh();
  }, 250);
});

// Log GSAP info for debugging
console.log('GSAP version:', gsap.version);
console.log('Delassus Clone initialized');
