/**
 * Navigation Module - View-based switching for sidebar layout
 */

// Current active view
let currentView = 'dashboard';

// Callbacks for view changes
const viewChangeCallbacks = [];

/**
 * Initialize navigation functionality
 */
export function initNavigation() {
  // Handle main navigation clicks
  const navItems = document.querySelectorAll('[data-nav-target]');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.dataset.navTarget;
      switchView(targetView);
    });
  });

  // Handle category filter clicks in sidebar
  const categoryFilters = document.querySelectorAll('[data-category-filter]');
  categoryFilters.forEach(filter => {
    filter.addEventListener('click', (e) => {
      e.preventDefault();
      const category = filter.dataset.categoryFilter;
      // Switch to dashboard view and filter by category
      switchView('dashboard');
      filterByCategory(category);
    });
  });

  // Handle profile dropdown toggle
  initProfileDropdown();

  // Set initial view from URL hash if present
  const hash = window.location.hash.slice(1);
  if (hash && document.getElementById(`view-${hash}`)) {
    switchView(hash);
  }
}

/**
 * Switch to a specific view
 * @param {string} viewId - The view identifier (dashboard, pantry, recipes, mealplanner, shoppinglist, profile)
 */
export function switchView(viewId) {
  // Don't switch if already on this view
  if (viewId === currentView) return;

  // Get all views and nav items
  const views = document.querySelectorAll('.view');
  const navItems = document.querySelectorAll('[data-nav-target]');

  // Hide all views
  views.forEach(view => {
    view.classList.remove('active');
  });

  // Remove active state from all nav items
  navItems.forEach(item => {
    item.classList.remove('active');
  });

  // Show target view
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Set active state on corresponding nav item(s)
  navItems.forEach(item => {
    if (item.dataset.navTarget === viewId) {
      item.classList.add('active');
    }
  });

  // Update current view
  const previousView = currentView;
  currentView = viewId;

  // Update URL hash
  history.replaceState(null, '', `#${viewId}`);

  // Scroll main content to top
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.scrollTop = 0;
  }

  // Trigger view change callbacks
  viewChangeCallbacks.forEach(callback => {
    callback(viewId, previousView);
  });

  // Dispatch custom event for other modules to listen to
  window.dispatchEvent(new CustomEvent('viewchange', {
    detail: { view: viewId, previousView }
  }));
}

/**
 * Get the current active view
 * @returns {string} The current view ID
 */
export function getCurrentView() {
  return currentView;
}

/**
 * Register a callback for view changes
 * @param {Function} callback - Function to call on view change (receives viewId, previousView)
 */
export function onViewChange(callback) {
  viewChangeCallbacks.push(callback);
}

/**
 * Filter dashboard by category
 * @param {string} category - Category to filter by
 */
function filterByCategory(category) {
  // Update filter tabs
  const filterTabs = document.querySelectorAll('.filter-tab, .category-btn');
  filterTabs.forEach(tab => {
    tab.classList.remove('active', 'category-btn--active', 'filter-tab--active');
    if (tab.dataset.category === category) {
      tab.classList.add('active', 'category-btn--active');
    }
  });

  // Dispatch filter event
  window.dispatchEvent(new CustomEvent('categoryfilter', {
    detail: { category }
  }));
}

/**
 * Initialize profile dropdown functionality
 */
function initProfileDropdown() {
  const dropdown = document.getElementById('profileDropdown');
  const toggle = document.getElementById('profileToggle');
  const menu = document.getElementById('profileMenu');

  if (!toggle || !dropdown) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('profile-dropdown--open');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('profile-dropdown--open');
    }
  });

  // Handle profile link clicks
  const myProfileLink = document.getElementById('myProfileLink');
  if (myProfileLink) {
    myProfileLink.addEventListener('click', (e) => {
      e.preventDefault();
      dropdown.classList.remove('profile-dropdown--open');
      switchView('profile');
    });
  }

  const myRecipesLink = document.getElementById('myRecipesLink');
  if (myRecipesLink) {
    myRecipesLink.addEventListener('click', (e) => {
      e.preventDefault();
      dropdown.classList.remove('profile-dropdown--open');
      switchView('recipes');
      // Could filter to user's recipes here
    });
  }
}

/**
 * Navigate to profile view
 */
export function navigateToProfile() {
  switchView('profile');
}

/**
 * Navigate to a section (legacy support - redirects to view switching)
 * @param {string} sectionId - The section/view to navigate to
 */
export function transitionToSection(sectionId) {
  // Map old section names to new view names
  const viewMap = {
    'home': 'dashboard',
    'pantry': 'pantry',
    'recipes': 'recipes',
    'mealplanner': 'mealplanner',
    'about': 'dashboard',
    'profile': 'profile'
  };

  const viewId = viewMap[sectionId] || sectionId;
  switchView(viewId);
}

/**
 * Initialize header scroll behavior (no-op in new design, kept for compatibility)
 */
export function initHeaderScroll() {
  // No-op - sidebar-based layout doesn't need header scroll behavior
}

/**
 * Smooth scroll to element (utility function - simplified for views)
 * @param {string|Element} target - CSS selector or element to scroll to
 */
export function scrollToElement(target) {
  const mainContent = document.querySelector('.main-content');
  const element = typeof target === 'string' ? document.querySelector(target) : target;

  if (mainContent && element) {
    mainContent.scrollTo({
      top: element.offsetTop,
      behavior: 'smooth'
    });
  }
}
