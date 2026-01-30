/**
 * Authentication Service
 * Handles user registration, login, logout, and auth state management
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

// Auth state change listeners
const authListeners = [];

/**
 * Sign up a new user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password (min 6 characters)
 * @param {string} username - Unique username for profile
 * @returns {Promise<{user: Object|null, error: string|null}>}
 */
export async function signUp(email, password, username) {
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Supabase is not configured. Please set up environment variables.' };
  }

  // Validate inputs
  if (!email || !password || !username) {
    return { user: null, error: 'Email, password, and username are required.' };
  }

  if (password.length < 6) {
    return { user: null, error: 'Password must be at least 6 characters.' };
  }

  if (username.length < 3) {
    return { user: null, error: 'Username must be at least 3 characters.' };
  }

  // Check if username is already taken
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username.toLowerCase())
    .single();

  if (existingUser) {
    return { user: null, error: 'Username is already taken.' };
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username.toLowerCase()
      }
    }
  });

  if (authError) {
    return { user: null, error: authError.message };
  }

  // Create profile (this may also be handled by a database trigger)
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username: username.toLowerCase(),
        display_name: username,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Error creating profile:', profileError.message);
      // Don't fail the signup, profile can be created later
    }
  }

  return { user: authData.user, error: null };
}

/**
 * Sign in an existing user
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<{user: Object|null, session: Object|null, error: string|null}>}
 */
export async function signIn(email, password) {
  if (!isSupabaseConfigured()) {
    return { user: null, session: null, error: 'Supabase is not configured.' };
  }

  if (!email || !password) {
    return { user: null, session: null, error: 'Email and password are required.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { user: null, session: null, error: error.message };
  }

  return { user: data.user, session: data.session, error: null };
}

/**
 * Sign out the current user
 * @returns {Promise<{error: string|null}>}
 */
export async function signOut() {
  if (!isSupabaseConfigured()) {
    return { error: null };
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Get the current authenticated user
 * @returns {Promise<Object|null>}
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the current session
 * @returns {Promise<Object|null>}
 */
export async function getSession() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Get the current user's profile
 * @returns {Promise<Object|null>}
 */
export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

/**
 * Update the current user's profile
 * @param {Object} updates - Profile fields to update
 * @returns {Promise<{profile: Object|null, error: string|null}>}
 */
export async function updateProfile(updates) {
  const user = await getCurrentUser();
  if (!user) {
    return { profile: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: data, error: null };
}

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Called with (event, session) on auth state change
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured()) {
    // Return a no-op unsubscribe function
    return () => {};
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => {
    subscription?.unsubscribe();
  };
}

/**
 * Send password reset email
 * @param {string} email - User's email address
 * @returns {Promise<{error: string|null}>}
 */
export async function resetPassword(email) {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase is not configured.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Check if user is currently authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const session = await getSession();
  return session !== null;
}

export default {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getSession,
  getCurrentProfile,
  updateProfile,
  onAuthStateChange,
  resetPassword,
  isAuthenticated
};
