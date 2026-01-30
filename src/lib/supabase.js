/**
 * Supabase Client Configuration
 * Initializes and exports the Supabase client for use throughout the app
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables (set in .env.local)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Running in local-only mode.',
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local to enable cloud features.'
  );
}

// Create Supabase client (or null if not configured)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseConfigured() {
  return supabase !== null;
}

/**
 * Get the current authenticated user
 * @returns {Promise<Object|null>} The user object or null if not authenticated
 */
export async function getCurrentUser() {
  if (!supabase) return null;

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error.message);
    return null;
  }
  return user;
}

/**
 * Get the current session
 * @returns {Promise<Object|null>} The session object or null
 */
export async function getSession() {
  if (!supabase) return null;

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error.message);
    return null;
  }
  return session;
}

/**
 * Get user profile from profiles table
 * @param {string} userId - The user's UUID
 * @returns {Promise<Object|null>} The profile object or null
 */
export async function getProfile(userId) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error.message);
    return null;
  }
  return data;
}

/**
 * Get profile by username
 * @param {string} username - The username to look up
 * @returns {Promise<Object|null>} The profile object or null
 */
export async function getProfileByUsername(username) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    console.error('Error fetching profile by username:', error.message);
    return null;
  }
  return data;
}

export default supabase;
