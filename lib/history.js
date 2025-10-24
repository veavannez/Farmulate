import { supabase } from './supabase';

/**
 * Add a history log
 */
export const insertHistory = async (userId, action, details = '') => {
  const { data, error } = await supabase
    .from('user_history')
    .insert([{ user_id: userId, action, details }])
    .select();

  if (error) throw error;
  return data;
};

/**
 * Fetch all history logs for the user
 */
export const fetchUserHistory = async (userId) => {
  const { data, error } = await supabase
    .from('user_history')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data;
};
