import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Scrub smoothing value - higher = smoother but more lag
// 0.5-1 provides good balance between smoothness and responsiveness
const SCRUB_SMOOTHING = 0.8;

/**
 * Initialize parallax effects on elements with data-speed attribute
 * Speed values:
 * - < 1: Element moves slower than scroll (background effect)
 * - = 1: Element moves with scroll (no parallax)
 * - > 1: Element moves faster than scroll (foreground effect)
 */
export function initParallax(options = {}) {
  const { intensity = 1 } = options;
  const layers = document.querySelectorAll('[data-speed]');

  layers.forEach(layer => {
    const speed = parseFloat(layer.dataset.speed);
    // Calculate movement: slower speeds move less, faster speeds move more
    const movement = (1 - speed) * 100 * intensity;

    gsap.to(layer, {
      yPercent: movement,
      ease: 'none',
      scrollTrigger: {
        trigger: layer.closest('.section'),
        start: 'top bottom',
        end: 'bottom top',
        scrub: SCRUB_SMOOTHING,
        // markers: true, // Uncomment for debugging
      }
    });
  });
}

/**
 * Initialize delta-based parallax for elements with data-prllx-item
 * Uses data-delta-start and data-delta-end for range-based movement
 */
export function initDeltaParallax(options = {}) {
  const { intensity = 1 } = options;
  const items = document.querySelectorAll('[data-prllx-item]');

  items.forEach(item => {
    const deltaStart = parseFloat(item.dataset.deltaStart) || 0;
    const deltaEnd = parseFloat(item.dataset.deltaEnd) || 0;

    gsap.fromTo(item,
      { yPercent: deltaStart * intensity },
      {
        yPercent: deltaEnd * intensity,
        ease: 'none',
        scrollTrigger: {
          trigger: item.closest('.section'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: SCRUB_SMOOTHING,
        }
      }
    );
  });
}

/**
 * Initialize horizontal parallax for specific elements
 */
export function initHorizontalParallax() {
  const horizontalItems = document.querySelectorAll('[data-parallax-x]');

  horizontalItems.forEach(item => {
    const movement = parseFloat(item.dataset.parallaxX) || 50;

    gsap.fromTo(item,
      { xPercent: -movement },
      {
        xPercent: movement,
        ease: 'none',
        scrollTrigger: {
          trigger: item.closest('.section'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: SCRUB_SMOOTHING,
        }
      }
    );
  });
}

/**
 * Initialize scale-based parallax (zoom effect on scroll)
 */
export function initScaleParallax() {
  const scaleItems = document.querySelectorAll('[data-parallax-scale]');

  scaleItems.forEach(item => {
    const scaleAmount = parseFloat(item.dataset.parallaxScale) || 0.2;

    gsap.fromTo(item,
      { scale: 1 - scaleAmount },
      {
        scale: 1 + scaleAmount,
        ease: 'none',
        scrollTrigger: {
          trigger: item.closest('.section'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: SCRUB_SMOOTHING,
        }
      }
    );
  });
}

/**
 * Initialize opacity-based parallax (fade on scroll)
 */
export function initOpacityParallax() {
  const opacityItems = document.querySelectorAll('[data-parallax-opacity]');

  opacityItems.forEach(item => {
    gsap.fromTo(item,
      { opacity: 0.3 },
      {
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: item.closest('.section'),
          start: 'top center',
          end: 'center center',
          scrub: SCRUB_SMOOTHING,
        }
      }
    );
  });
}

/**
 * Initialize all parallax systems with responsive handling
 */
export function initAllParallax() {
  // Use ScrollTrigger.matchMedia for responsive parallax
  ScrollTrigger.matchMedia({
    // Desktop - full intensity
    '(min-width: 769px)': function() {
      initParallax({ intensity: 1 });
      initDeltaParallax({ intensity: 1 });
      initHorizontalParallax();
      initScaleParallax();
      initOpacityParallax();
    },
    // Mobile - reduced intensity for better performance
    '(max-width: 768px)': function() {
      initParallax({ intensity: 0.5 });
      initDeltaParallax({ intensity: 0.5 });
      // Skip horizontal and scale on mobile for performance
    }
  });
}

/**
 * Refresh all ScrollTrigger instances (call after dynamic content changes)
 */
export function refreshParallax() {
  ScrollTrigger.refresh();
}

/**
 * Kill all parallax ScrollTrigger instances
 */
export function killParallax() {
  ScrollTrigger.getAll().forEach(trigger => trigger.kill());
}
