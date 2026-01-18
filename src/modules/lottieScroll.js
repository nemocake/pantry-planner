import lottie from 'lottie-web';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Store animation instances for cleanup
const animations = [];

/**
 * Initialize scroll-driven Lottie animations
 * Elements with data-lottie-scroll attribute will have their
 * Lottie animation frame tied to scroll position
 */
export function initLottieScroll() {
  const containers = document.querySelectorAll('[data-lottie-scroll]');

  containers.forEach(container => {
    const animationPath = container.dataset.lottieScroll;

    // Load the Lottie animation
    const animation = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: animationPath
    });

    animations.push(animation);

    // Once loaded, bind to scroll
    animation.addEventListener('DOMLoaded', () => {
      const totalFrames = animation.totalFrames;
      const section = container.closest('.section');

      // Create ScrollTrigger for this animation
      ScrollTrigger.create({
        trigger: section,
        start: 'top center',
        end: 'bottom center',
        scrub: 0.5,
        onUpdate: (self) => {
          // Calculate which frame to show based on scroll progress
          const frame = Math.floor(self.progress * (totalFrames - 1));
          animation.goToAndStop(frame, true);
        }
      });
    });

    // Handle loading errors
    animation.addEventListener('data_failed', () => {
      console.warn(`Failed to load Lottie animation: ${animationPath}`);
      // Hide container if animation fails to load
      container.style.display = 'none';
    });
  });
}

/**
 * Initialize autoplay Lottie animations (not scroll-driven)
 */
export function initLottieAutoplay() {
  const containers = document.querySelectorAll('[data-lottie-autoplay]');

  containers.forEach(container => {
    const animationPath = container.dataset.lottieAutoplay;

    const animation = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: animationPath
    });

    animations.push(animation);
  });
}

/**
 * Create a simple scroll indicator Lottie animation fallback
 * This creates a CSS-based scroll indicator when no Lottie file is available
 */
export function createScrollIndicatorFallback() {
  const scrollIndicators = document.querySelectorAll('.scroll-indicator');

  scrollIndicators.forEach(indicator => {
    // Check if Lottie animation path exists
    if (!indicator.dataset.lottieScroll || indicator.dataset.lottieScroll === '') {
      // Create CSS fallback
      indicator.innerHTML = `
        <div class="scroll-indicator__mouse">
          <div class="scroll-indicator__wheel"></div>
        </div>
        <div class="scroll-indicator__arrow">
          <span></span>
          <span></span>
        </div>
      `;
      indicator.classList.add('scroll-indicator--fallback');
    }
  });
}

/**
 * Pause all Lottie animations
 */
export function pauseAllAnimations() {
  animations.forEach(anim => anim.pause());
}

/**
 * Resume all Lottie animations
 */
export function resumeAllAnimations() {
  animations.forEach(anim => anim.play());
}

/**
 * Destroy all Lottie animations (cleanup)
 */
export function destroyAllAnimations() {
  animations.forEach(anim => anim.destroy());
  animations.length = 0;
}
