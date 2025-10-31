import { supabase } from './supabase';

/**
 * Sign up a new user
 */
export const signUpUser = async (email, password, name) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }, // store name in metadata
    },
  });
  if (error) throw error;
  return data;
};

/**
 * Log in existing user
 */
export const loginUser = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

/**
 * Log out user
 */
export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
