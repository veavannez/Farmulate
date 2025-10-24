import { supabase } from './supabase';

/**
 * Insert new soil report
 */
export const insertSoilReport = async (report) => {
  const { data, error } = await supabase
    .from('soil_reports')
    .insert([report])
    .select();

  if (error) throw error;
  return data;
};

/**
 * Fetch all reports for the logged-in user
 */
export const fetchUserReports = async (userId) => {
  const { data, error } = await supabase
    .from('soil_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Update a specific soil report
 */
export const updateSoilReport = async (reportId, updates) => {
  const { data, error } = await supabase
    .from('soil_reports')
    .update(updates)
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
