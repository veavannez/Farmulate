import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pceushoyceovcqzjmhqp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZXVzaG95Y2VvdmNxemptaHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3ODIxMzUsImV4cCI6MjA3NjM1ODEzNX0.L9F0C0sPyBh_PhBO8uHUuZhP_gu1aM-Pn-vT8fJfgAE';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,       // Persist sessions
    autoRefreshToken: true,      // Refresh tokens automatically
    persistSession: true,        // Keep session across app restarts
    detectSessionInUrl: false,   // Not needed in React Native
  },
});