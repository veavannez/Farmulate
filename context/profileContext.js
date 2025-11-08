import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Load profile from Supabase session on mount
  useEffect(() => {
    const fetchProfileFromSession = async () => {
      setLoadingProfile(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profileData, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .single();

          if (error) throw error;
          setProfile(profileData || { user_id: session.user.id });
        }
      } catch (err) {
        console.error("Failed to fetch profile from session:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfileFromSession();

    // Optional: listen to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setProfile((prev) => ({ ...prev, user_id: session.user.id }));
      } else {
        setProfile(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, loadingProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
