/**
 * Profile Section Component
 * Handles rendering and interactions for the profile page
 */

import gsap from 'gsap';
import { openModal, closeModal } from '../modules/modalManager.js';
import { getCurrentUser, getCurrentProfile, updateProfile } from '../services/authService.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { calculateLocalStats, mergeStats, getCuisineInfo } from '../modules/statsCalculator.js';
import {
  syncPantryToCloud,
  syncMealPlansToCloud,
  updateProfileStats
} from '../services/profileSyncService.js';
import { getPantryItems } from '../modules/pantryManager.js';
import { getAllMeals } from '../modules/mealPlanManager.js';
import { switchView } from '../modules/navigation.js';

let currentViewingProfile = null;
let isOwner = false;

/**
 * Initialize the profile section
 */
export function initProfileSection() {
  // Edit profile button
  document.getElementById('editProfileBtn')?.addEventListener('click', openEditProfileModal);

  // Sync buttons
  document.getElementById('syncDataBtn')?.addEventListener('click', syncAllData);
  document.getElementById('syncPantryBtn')?.addEventListener('click', syncPantry);
  document.getElementById('syncMealPlansBtn')?.addEventListener('click', syncMealPlans);

  // Edit profile form
  const form = document.getElementById('editProfileForm');
  form?.addEventListener('submit', handleProfileSave);

  document.getElementById('cancelEditProfile')?.addEventListener('click', () => {
    closeModal('editProfileModal');
  });

  // Bio character count
  document.getElementById('editBio')?.addEventListener('input', updateBioCount);

  // Load last sync time from localStorage
  const lastSync = localStorage.getItem('lastSyncTime');
  if (lastSync) {
    const timeEl = document.getElementById('lastSyncTime');
    if (timeEl) {
      timeEl.textContent = new Date(lastSync).toLocaleString();
    }
  }
}

/**
 * Navigate to profile page
 * @param {string} username - Optional username for public profile, null for own profile
 */
export async function navigateToProfile(username = null) {
  // Switch to profile view
  switchView('profile');

  // Show loading state
  showLoadingState();

  try {
    if (username) {
      // Viewing someone else's profile (future feature)
      await loadPublicProfile(username);
    } else {
      // Viewing own profile
      await loadOwnProfile();
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    showProfileError('Failed to load profile');
  }
}

/**
 * Load own profile
 */
async function loadOwnProfile() {
  const user = await getCurrentUser();
  if (!user) {
    showProfileError('Please sign in to view your profile');
    return;
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    showProfileError('Profile not found');
    return;
  }

  isOwner = true;
  currentViewingProfile = profile;

  renderProfile(profile, true);
  renderStats(true);
  showOwnerControls();
  hideProfileMessage();
}

/**
 * Load public profile by username (future feature)
 */
async function loadPublicProfile(username) {
  // This would use getProfileByUsername from supabase.js
  // For now, show not implemented
  showProfileError('Public profiles coming soon');
}

/**
 * Render profile data
 */
function renderProfile(profile, showPrivateData = false) {
  // Avatar letter
  const displayName = profile.display_name || profile.username || 'User';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const avatarEl = document.querySelector('#profileLargeAvatar .profile-header__avatar-letter');
  if (avatarEl) avatarEl.textContent = avatarLetter;

  // Basic info
  document.getElementById('profileDisplayName').textContent = displayName;
  document.getElementById('profileUsername').textContent = `@${profile.username || 'user'}`;
  document.getElementById('profileBio').textContent = profile.bio || 'No bio yet';

  // Member since
  const memberSince = new Date(profile.created_at);
  const options = { year: 'numeric', month: 'long' };
  document.getElementById('profileMemberSince').textContent =
    `Member since ${memberSince.toLocaleDateString('en-US', options)}`;

  // Animation
  gsap.fromTo('.profile-header',
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
  );
}

/**
 * Render stats dashboard
 */
function renderStats(includeLocalStats = true) {
  let stats;

  if (includeLocalStats) {
    const allMeals = getAllMeals();
    const localStats = calculateLocalStats(allMeals);
    stats = mergeStats(localStats, currentViewingProfile);
  } else {
    // Public view - only show cloud stats
    stats = {
      totalMealsPlanned: currentViewingProfile?.total_meals_planned || 0,
      totalRecipesTried: currentViewingProfile?.total_recipes_tried || 0,
      currentStreak: currentViewingProfile?.current_streak || 0,
      longestStreak: currentViewingProfile?.longest_streak || 0,
      favoriteCuisines: []
    };
  }

  // Update stat numbers
  document.getElementById('statMealsPlannedProfile').textContent = stats.totalMealsPlanned;
  document.getElementById('statRecipesTried').textContent = stats.totalRecipesTried;
  document.getElementById('statCurrentStreak').textContent = stats.currentStreak;
  document.getElementById('statLongestStreak').textContent = stats.longestStreak;

  // Render favorite cuisines
  renderFavoriteCuisines(stats.favoriteCuisines);

  // Animate stats
  gsap.fromTo('.profile-stat-card',
    { opacity: 0, y: 20, scale: 0.9 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.4,
      stagger: 0.1,
      ease: 'back.out(1.5)'
    }
  );
}

/**
 * Render favorite cuisines
 */
function renderFavoriteCuisines(cuisines) {
  const grid = document.getElementById('cuisinesGrid');
  if (!grid) return;

  if (!cuisines || cuisines.length === 0) {
    grid.innerHTML = '<p class="profile-cuisines__empty">No favorite cuisines yet. Start planning meals!</p>';
    return;
  }

  grid.innerHTML = cuisines.map(item => {
    const cuisine = typeof item === 'string' ? item : item.cuisine;
    const count = typeof item === 'object' ? item.count : null;
    const info = getCuisineInfo(cuisine);

    return `
      <div class="cuisine-tag">
        <span class="cuisine-tag__icon">${info.icon}</span>
        <span class="cuisine-tag__name">${info.name}</span>
        ${count ? `<span class="cuisine-tag__count">${count}</span>` : ''}
      </div>
    `;
  }).join('');

  // Animate cuisines
  gsap.fromTo('.cuisine-tag',
    { opacity: 0, scale: 0.8 },
    { opacity: 1, scale: 1, duration: 0.3, stagger: 0.05, ease: 'back.out(1.5)' }
  );
}

/**
 * Show owner-only controls
 */
function showOwnerControls() {
  document.getElementById('profileOwnerActions')?.classList.remove('hidden');
  document.getElementById('profileSyncStatus')?.classList.remove('hidden');
}

/**
 * Hide owner-only controls
 */
function hideOwnerControls() {
  document.getElementById('profileOwnerActions')?.classList.add('hidden');
  document.getElementById('profileSyncStatus')?.classList.add('hidden');
}

/**
 * Open edit profile modal
 */
function openEditProfileModal() {
  if (!currentViewingProfile) return;

  // Populate form
  document.getElementById('editDisplayName').value = currentViewingProfile.display_name || '';
  document.getElementById('editBio').value = currentViewingProfile.bio || '';
  document.getElementById('editLocation').value = currentViewingProfile.location || '';
  document.getElementById('editIsPublic').checked = currentViewingProfile.is_public || false;

  updateBioCount();
  openModal('editProfileModal');
}

/**
 * Handle profile save
 */
async function handleProfileSave(e) {
  e.preventDefault();

  const saveBtn = document.getElementById('saveProfile');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  const updates = {
    display_name: document.getElementById('editDisplayName').value.trim(),
    bio: document.getElementById('editBio').value.trim(),
    location: document.getElementById('editLocation').value.trim(),
    is_public: document.getElementById('editIsPublic').checked
  };

  const result = await updateProfile(updates);

  if (result.error) {
    alert('Failed to save: ' + result.error);
  } else {
    currentViewingProfile = { ...currentViewingProfile, ...updates };
    renderProfile(currentViewingProfile, true);
    closeModal('editProfileModal');
  }

  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Changes';
}

/**
 * Update bio character count
 */
function updateBioCount() {
  const bio = document.getElementById('editBio');
  const count = document.getElementById('bioCharCount');
  if (bio && count) {
    count.textContent = bio.value.length;
  }
}

/**
 * Sync all data to cloud
 */
async function syncAllData() {
  const btn = document.getElementById('syncDataBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn__icon">⏳</span> Syncing...';

  await Promise.all([syncPantry(), syncMealPlans()]);

  // Update profile stats
  const allMeals = getAllMeals();
  const stats = calculateLocalStats(allMeals);
  await updateProfileStats(stats);

  btn.disabled = false;
  btn.innerHTML = '<span class="btn__icon">☁️</span> Sync Data';

  updateLastSyncTime();
}

/**
 * Sync pantry data
 */
async function syncPantry() {
  const statusEl = document.getElementById('pantrySyncStatus');
  const btn = document.getElementById('syncPantryBtn');

  statusEl.textContent = 'Syncing...';
  statusEl.className = 'sync-status-item__status';
  btn.disabled = true;

  const localItems = getPantryItems();
  const result = await syncPantryToCloud(localItems);

  if (result.success) {
    statusEl.textContent = `Synced (${result.synced} items)`;
    statusEl.classList.add('sync-status-item__status--success');
  } else {
    statusEl.textContent = result.error || 'Sync failed';
    statusEl.classList.add('sync-status-item__status--error');
  }

  btn.disabled = false;
}

/**
 * Sync meal plans
 */
async function syncMealPlans() {
  const statusEl = document.getElementById('mealPlanSyncStatus');
  const btn = document.getElementById('syncMealPlansBtn');

  statusEl.textContent = 'Syncing...';
  statusEl.className = 'sync-status-item__status';
  btn.disabled = true;

  const allMeals = getAllMeals();

  // Group meals by date for sync
  const mealsObj = {};
  allMeals.forEach(meal => {
    if (!mealsObj[meal.date]) mealsObj[meal.date] = [];
    mealsObj[meal.date].push(meal);
  });

  const result = await syncMealPlansToCloud(mealsObj);

  if (result.success) {
    statusEl.textContent = `Synced (${result.synced} meals)`;
    statusEl.classList.add('sync-status-item__status--success');
  } else {
    statusEl.textContent = result.error || 'Sync failed';
    statusEl.classList.add('sync-status-item__status--error');
  }

  btn.disabled = false;
}

/**
 * Update last sync time display
 */
function updateLastSyncTime() {
  const timeEl = document.getElementById('lastSyncTime');
  const now = new Date();
  if (timeEl) {
    timeEl.textContent = now.toLocaleString();
  }
  localStorage.setItem('lastSyncTime', now.toISOString());
}

/**
 * Show loading state
 */
function showLoadingState() {
  document.getElementById('profileDisplayName').textContent = 'Loading...';
  document.getElementById('profileUsername').textContent = '';
  document.getElementById('profileBio').textContent = '';
  document.getElementById('profileMemberSince').textContent = '';
}

/**
 * Show error message
 */
function showProfileError(message) {
  const msgContainer = document.getElementById('profileMessage');
  const msgText = document.getElementById('profileMessageText');

  if (msgContainer && msgText) {
    msgText.textContent = message;
    msgContainer.classList.remove('hidden');
  }

  // Hide other content
  document.getElementById('profileHeader')?.classList.add('hidden');
  document.getElementById('profileStatsDashboard')?.classList.add('hidden');
  document.getElementById('profileCuisines')?.classList.add('hidden');
  hideOwnerControls();
}

/**
 * Hide profile message
 */
function hideProfileMessage() {
  document.getElementById('profileMessage')?.classList.add('hidden');
  document.getElementById('profileHeader')?.classList.remove('hidden');
  document.getElementById('profileStatsDashboard')?.classList.remove('hidden');
  document.getElementById('profileCuisines')?.classList.remove('hidden');
}

/**
 * Refresh profile stats (can be called after meal plan changes)
 */
export function refreshProfileStats() {
  if (currentViewingProfile && isOwner) {
    renderStats(true);
  }
}

export default {
  initProfileSection,
  navigateToProfile,
  refreshProfileStats
};
